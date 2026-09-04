'use strict';
/* Kiểm thử đầu-cuối Ninja Toán Học (Playwright/Chromium):
   luồng đầy đủ menu → chọn màn → chơi (chém đúng) → kết quả → bảng vàng; đường sai, bom, hết tim + "Cần ôn lại";
   ôn lại thông minh; một nhát vuốt qua nhiều quả; ghép đôi (bạn rơi mất, gợi ý không bị đảo ngược);
   ẩn tab khi đang đếm ngược; hồ sơ người chơi (tách tiến trình), báo cáo, cổng phụ huynh; di trú và dữ liệu độc hại;
   xoay màn hình + điện thoại; chuyển động giảm; bàn phím; bộ xử lý lỗi toàn cục; hiệu năng.
   Chạy: NODE_PATH=/opt/node22/lib/node_modules node tests/e2e/math-ninja.e2e.js */
const { withGame, assertClean } = require('./lib/browser.js');

let failures = 0;
const want = (n) => !process.env.ONLY || process.env.ONLY.split(',').indexOf(String(n)) >= 0;   // ONLY=2,5 chỉ chạy vài khối
function ok(cond, msg) { if (!cond) { failures++; console.error('  ✗ ' + msg); } else console.log('  ✓ ' + msg); }
const eq = (a, b, msg) => ok(a === b, msg + ' (được: ' + JSON.stringify(a) + ', mong: ' + JSON.stringify(b) + ')');
const vis = (page, sel) => page.evaluate((s) => { const el = document.querySelector(s); return !!el && !el.classList.contains('hidden') && !el.hidden; }, sel);
const text = (page, sel) => page.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent : null; }, sel);
const count = (page, sel) => page.evaluate((s) => document.querySelectorAll(s).length, sel);
const LAND = { width: 1180, height: 820 }, PORT = { width: 820, height: 1180 };
const PHONE = { width: 390, height: 844 }, PHONE_LAND = { width: 844, height: 390 };
const NO_DIALOG = "window.confirm = function () { throw new Error('window.confirm được gọi'); }; window.prompt = window.confirm;";
/** Tỉ lệ tương phản WCAG giữa hai màu 'rgb(...)' */
function contrast(fg, bg) {
  const lum = (c) => {
    const v = String(c).match(/[\d.]+/g).slice(0, 3).map((x) => {
      const u = Number(x) / 255;
      return u <= 0.03928 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  };
  const a = lum(fg), b = lum(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
/** Màu chữ + màu nền thật (leo lên cha khi nền trong suốt) của phần tử đầu tiên khớp bộ chọn */
const colorsOf = (page, sel) => page.evaluate((q) => {
  const el = document.querySelector(q);
  if (!el) return null;
  let bg = 'rgba(0, 0, 0, 0)', n = el;
  while (n && (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent')) { bg = getComputedStyle(n).backgroundColor; n = n.parentElement; }
  const st = getComputedStyle(el);
  return { fg: st.color, bg: bg, size: st.fontSize, weight: st.fontWeight };
}, sel);
const seed = (obj) => NO_DIALOG + "localStorage.setItem('ninja-toan-v1', " + JSON.stringify(JSON.stringify(obj)) + ');';

async function startLevel(page, hook, id) {
  await hook("X.startGame(window.MathGen.levelById('" + id + "'))");
  await page.waitForFunction(() => window.__NinjaToan.G.state === 'playing', null, { timeout: 20000 });
  await page.waitForFunction(() => !!window.__NinjaToan.G.question, null, { timeout: 8000 });
}
async function waitOver(page) {
  await page.waitForSelector('#gameover:not(.hidden)', { timeout: 20000 });
  await page.waitForTimeout(400);
}
/** Chém quả mang giá trị v (đợi quả bay lên). Trả về false nếu hết giờ chờ. */
async function sliceValue(page, v, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < (ms || 6000)) {
    const done = await page.evaluate((val) => {
      const X = window.__NinjaToan;
      const f = X.G.fruits.find((o) => o.launched && !o.dead && o.popping <= 0 && o.value === val);
      if (!f) return false;
      X.sliceSegment(f.x - f.r * 1.6, f.y, f.x + f.r * 1.6, f.y);
      return true;
    }, v);
    if (done) return true;
    await page.waitForTimeout(80);
  }
  return false;
}
/** Chém đúng đáp án n lần liên tiếp. */
async function answerRound(page, hook, n) {
  for (let i = 0; i < n; i++) {
    const st = await hook('X.G.state');
    if (st !== 'playing') return i;
    const a = await hook('X.G.question ? X.G.question.answer : null');
    if (a == null) { await page.waitForTimeout(120); i--; continue; }
    if (!(await sliceValue(page, a))) return i;
    await page.waitForTimeout(950);   // 0,75 s tới câu sau + độ trễ phóng quả
  }
  return n;
}
/** Đặt các quả của đợt hiện tại lên một hàng ngang (gap nhỏ = một nhát vuốt trúng nhiều quả). */
async function lineUpFruits(page, y, gap) {
  return page.evaluate((o) => {
    const X = window.__NinjaToan;
    const list = X.G.fruits.filter((f) => !f.dead);
    list.forEach(function (f, i) { f.launched = true; f.delay = 0; f.popping = 0; f.x = 120 + i * o.gap; f.y = o.y; f.vy = -60; f.vx = 0; });
    return list.map(function (f) { return { v: f.value, k: f.kind, x: f.x }; });
  }, { y: y || 300, gap: gap || 110 });
}
/** Đợi (tối đa ms) một quả mang giá trị KHÁC đáp án đã bay lên; trả giá trị hoặc null. */
async function findWrongValue(page, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < (ms || 8000)) {
    const v = await page.evaluate(() => {
      const X = window.__NinjaToan;
      if (!X.G.question || !X.G.wave || X.G.wave.resolved) return null;
      const f = X.G.fruits.find((o) => o.kind === 'fruit' && o.launched && !o.dead && o.popping <= 0 && o.value !== X.G.question.answer);
      return f ? f.value : null;
    });
    if (v != null) return v;
    await page.waitForTimeout(100);
  }
  return null;
}
async function answerGate(page, hook) {
  const v = await hook('X.Gate.answer');
  await page.fill('#parent-gate-input', String(v));
  await page.click('#parent-gate-form button[type="submit"]');
  await page.waitForTimeout(200);
}

(async () => {
  let log;

  /* ===== 1. Khởi động trên iPad ngang: bảo mật, hồ sơ, lưới màn ===== */
  if (want(1)) {
  log = await withGame('math-ninja', async ({ page, hook, shot }) => {
    console.log('[1] khởi động 1180×820');
    eq(await hook('X.G.state'), 'menu', 'bắt đầu ở menu');
    ok(await page.evaluate(() => !!document.querySelector('meta[http-equiv="Content-Security-Policy"]')), 'có thẻ meta CSP');
    ok(await page.evaluate(() => !!document.querySelector('meta[name="referrer"][content="no-referrer"]')), 'có thẻ meta referrer');
    eq(await count(page, '[onclick], [onload], [onerror]'), 0, 'không còn thuộc tính xử lý sự kiện inline');
    eq((await text(page, '#btn-player')).replace(/\s/g, ''), '🐯Bé▾', 'chip người chơi hiện tên mặc định');
    eq(await count(page, '.toggle[data-set]'), 8, '4 nút bật/tắt × 2 nơi (menu + tạm dừng)');
    ok(await page.evaluate(() => !!document.querySelector('.toggle[data-set="fx"]')), 'có nút ✨ Hiệu ứng');
    ok(await page.evaluate(() => Array.from(document.querySelectorAll('.toggle[data-set]')).every((b) => b.hasAttribute('aria-pressed'))), 'mọi nút bật/tắt có aria-pressed');
    await shot('menu');
    await page.click('#btn-play');
    await page.waitForTimeout(300);
    eq(await hook('X.G.state'), 'levels', 'vào màn chọn màn chơi');
    eq(await count(page, '.level-card'), 10, '10 màn Chém đáp án');
    ok(await page.evaluate(() => Array.from(document.querySelectorAll('.level-card')).every((c) => c.getAttribute('tabindex') === '0' && c.getAttribute('aria-label'))), 'thẻ màn chơi có tabindex và aria-label');
    // A13: lưới màn không được tràn khỏi bảng ở iPad ngang
    const sc = await page.evaluate(() => { const p = document.querySelector('#levels .panel'); return { s: p.scrollHeight, c: p.clientHeight }; });
    ok(sc.s <= sc.c + 2, 'lưới 10 màn vừa khít bảng (' + sc.s + ' ≤ ' + sc.c + ')');
    await shot('levels');
    await page.click('.tab[data-mode="pair"]');
    await page.waitForTimeout(150);
    eq(await count(page, '.level-card'), 6, '6 màn Ghép đôi');
    eq(await page.getAttribute('.tab[data-mode="pair"]', 'aria-selected'), 'true', 'tab Ghép đôi có aria-selected=true');
  }, { viewport: LAND, initScript: NO_DIALOG });
  assertClean(log, '[1] khởi động');
  }

  /* ===== 2. Di trú dữ liệu bản cũ (records/names ở cấp cao nhất) ===== */
  if (want(2)) {
  log = await withGame('math-ninja', async ({ page, hook }) => {
    console.log('[2] di trú dữ liệu cũ');
    const d = await hook('X.Store.data');
    eq(d.players.p1.records['answer:a1:90'].best, 1200, 'kỷ lục cũ nằm trong players.p1');
    eq(d.players.p1.records['answer:a1:90'].stars, 3, 'số sao được giữ');
    eq(d.players.p1.names[0], 'Tí', 'tên bảng vàng cũ được giữ');
    eq(d.players.p1.records['answer:a2:90'], undefined, 'mục hỏng bị bỏ');
    eq(d.players.p1.records['bogus:zz:90'], undefined, 'khóa sai bị bỏ');
    eq(d.records, undefined, 'không còn records ở cấp cao nhất');
    eq(d.music, false, 'thiết lập thiết bị được giữ');
    eq(await hook('X.G.duration'), 60, 'thời lượng ván được giữ');
    eq(await page.getAttribute('#duration-group button[data-sec="60"]', 'aria-pressed'), 'true', 'chip thời lượng 1 phút được chọn');
    await page.click('#duration-group button[data-sec="90"]');   // kỷ lục cũ thuộc ván 1,5 phút
    await page.waitForTimeout(150);
    await page.click('#btn-play');
    await page.waitForTimeout(300);
    const card = await text(page, '.level-card[data-id="a1"] .best');
    ok(card.indexOf('1.200') >= 0, 'thẻ màn a1 hiện kỷ lục 1.200 (được: ' + card + ')');
    eq(await count(page, '.level-card[data-id="a1"] .stars .on'), 3, 'thẻ màn a1 hiện 3 sao');
  }, {
    viewport: LAND,
    initScript: seed({
      music: false, duration: 60, names: ['Tí'],
      records: {
        'answer:a1:90': { best: 1200, stars: 3, top: [{ name: 'Tí', score: 1200, date: 1 }] },
        'answer:a2:90': 'nope',
        'bogus:zz:90': { stars: 3 }
      }
    })
  });
  assertClean(log, '[2] di trú');
  }

  /* ===== 3. Dữ liệu lưu trữ hỏng/độc hại: không kẹt ở màn kết quả (A1) ===== */
  if (want(3)) {
  const hostile = [
    { records: { 'answer:a1:90': { top: 'abc' } } },
    { records: 5 },
    { records: { 'answer:a1:90': { top: [null], best: 'abc' } } },
    JSON.parse('{"__proto__":{"pwned":1},"records":{},"names":"x"}')
  ];
  for (let i = 0; i < hostile.length; i++) {
    log = await withGame('math-ninja', async ({ page, hook }) => {
      console.log('[3.' + (i + 1) + '] dữ liệu hỏng #' + (i + 1));
      await startLevel(page, hook, 'a1');
      await hook('X.endGame("timeup")');
      await waitOver(page);
      ok(await vis(page, '#gameover'), 'vẫn tới được màn kết quả');
      eq(await page.evaluate(() => Object.getPrototypeOf(window.__NinjaToan.Store.data).pwned), undefined, 'prototype không bị bẩn');
      await page.click('#btn-other-level');
      await page.waitForTimeout(250);
      eq(await hook('X.G.state'), 'levels', 'thoát được về danh sách màn');
      ok(!(await text(page, '#level-grid')).includes('NaN'), 'lưới màn không có NaN');
    }, { viewport: LAND, initScript: seed(hostile[i]) });
    assertClean(log, '[3.' + (i + 1) + '] dữ liệu hỏng');
  }
  }

  /* ===== 4. Một ván trọn vẹn: chém đúng → kết quả → bảng vàng → thống kê ===== */
  if (want(4)) {
  log = await withGame('math-ninja', async ({ page, hook, shot }) => {
    console.log('[4] ván chơi đúng hết');
    await page.click('#btn-play');
    await page.waitForTimeout(200);
    await page.click('.level-card[data-id="a1"]');
    await page.waitForFunction(() => window.__NinjaToan.G.state === 'playing', null, { timeout: 20000 });
    await page.waitForFunction(() => !!window.__NinjaToan.G.question, null, { timeout: 8000 });
    ok(await vis(page, '#hud'), 'HUD hiện khi chơi');
    await shot('playing');
    const n = await answerRound(page, hook, 6);
    eq(n, 6, 'trả lời đúng 6 câu');
    eq(await hook('X.G.correct'), 6, 'đếm đúng 6 câu đúng');
    eq(await hook('X.G.wrong'), 0, 'không câu nào sai');
    eq(await hook('X.G.hearts'), 3, 'còn đủ 3 tim');
    ok((await hook('X.G.score')) > 0, 'có điểm');
    ok(await vis(page, '#hud-combo'), 'chip Combo hiện khi đúng liên tiếp');
    eq(await hook('X.G.stage'), 2, 'lên màn 2 sau 5 câu đúng');
    const perf = await hook('X.G.perf');
    console.log('  perf: avgUpdate=' + perf.avgUpdate.toFixed(3) + ' ms, avgRender=' + perf.avgRender.toFixed(3) + ' ms');
    ok(perf.avgRender < 6, 'render trung bình < 6 ms');
    await hook('X.endGame("timeup")');
    await waitOver(page);
    ok(!(await vis(page, '#hud')), 'HUD được ẩn dưới bảng kết quả (A25)');
    eq(await text(page, '#st-correct'), '6', '#st-correct = 6');
    eq(await text(page, '#st-bomb'), '0', '#st-bomb = 0');
    ok(!(await vis(page, '#result-review')), 'không có mục "Cần ôn lại" khi trả lời đúng hết');
    const st = await hook('X.Store.p().stats');
    eq(st.plays, 1, 'ghi 1 ván vào thống kê');
    eq(st.byTopic.a1.c, 6, 'thống kê theo màn: 6 câu đúng');
    const rec = await hook("X.Store.p().records['answer:a1:90']");
    eq(rec.top[0].name, 'Bé', 'bảng vàng ghi tên bé đang chơi');
    eq(rec.top[0].avatar, '🐯', 'bảng vàng ghi cả hình đại diện');
    ok((await text(page, '#leader')).indexOf('Bé') >= 0, 'bảng vàng hiện tên Bé');
    await shot('results');
  }, { viewport: LAND, initScript: NO_DIALOG });
  assertClean(log, '[4] ván chơi đúng');
  }

  /* ===== 5. Đường sai: mất tim, gợi ý, kho ôn lại, bom, hết tim ===== */
  if (want(5)) {
  log = await withGame('math-ninja', async ({ page, hook, shot }) => {
    console.log('[5] đường sai + bom + hết tim');
    await startLevel(page, hook, 'a1');
    // chém một đáp án nhiễu
    const wrongV = await page.evaluate(() => {
      const X = window.__NinjaToan;
      const f = X.G.fruits.find((o) => o.kind === 'fruit' && o.value !== X.G.question.answer);
      return f ? f.value : null;
    });
    ok(wrongV != null, 'tìm được quả sai để chém');
    const qText = await hook('X.G.question.text + " = " + X.G.question.answer');
    await sliceValue(page, wrongV);
    await page.waitForTimeout(200);
    eq(await hook('X.G.hearts'), 2, 'chém sai mất 1 tim');
    eq(await hook('X.G.wrong'), 1, 'đếm 1 câu sai');
    ok(await vis(page, '#hud-hint'), 'dải gợi ý hiện');
    ok((await text(page, '#hud-hint')).indexOf(' = ') > 0, 'gợi ý cho biết đáp án đúng');
    const missed = await hook('Object.keys(X.Store.p().missed)');
    eq(missed.length, 1, 'câu sai được ghi vào kho ôn lại');
    ok(/^a:\d+[-+*]\d+$/.test(missed[0]), 'khóa ôn lại đúng dạng (' + missed[0] + ')');
    ok((await hook('X.G.missedList')).indexOf(qText) >= 0, 'câu sai vào danh sách "Cần ôn lại" của ván');

    // A6: chém bom không tính là sai toán và không tính là "lỡ"
    await page.evaluate(() => {
      const X = window.__NinjaToan;
      X.G.wrong = 0; X.G.bombs = 0; X.G.misses = 0; X.G.hearts = 3;
      X.G.fruits.length = 0;
      X.launchWave([], { bomb: true, track: true });
    });
    await lineUpFruits(page, 300);
    await page.evaluate(() => window.__NinjaToan.sliceSegment(60, 300, 900, 300));
    await page.waitForTimeout(1200);
    eq(await hook('X.G.bombs'), 1, 'bom được đếm riêng');
    eq(await hook('X.G.wrong'), 0, 'bom không tính là câu sai (A6)');
    eq(await hook('X.G.misses'), 0, 'bom không tính là lỡ quả (A6)');
    eq(await hook('X.G.hearts'), 2, 'bom vẫn mất 1 tim');

    // hết tim → kết quả có "Cần ôn lại"
    await page.evaluate(() => { window.__NinjaToan.G.hearts = 1; });
    let guard = 0;
    while ((await hook('X.G.state')) === 'playing' && guard++ < 30) {
      const v = await page.evaluate(() => {
        const X = window.__NinjaToan;
        const f = X.G.fruits.find((o) => o.kind === 'fruit' && o.launched && !o.dead && o.value !== X.G.question.answer);
        return f ? f.value : null;
      });
      if (v == null) { await page.waitForTimeout(150); continue; }
      await sliceValue(page, v);
      await page.waitForTimeout(200);
    }
    eq(await hook('X.G.endReason'), 'nolife', 'hết tim thì kết thúc ván');
    await waitOver(page);
    ok(await vis(page, '#result-review'), 'màn kết quả hiện mục "Cần ôn lại" (A7)');
    ok((await text(page, '#result-review')).indexOf(' = ') > 0, 'mục "Cần ôn lại" liệt kê phép tính');
    ok(Number(await text(page, '#st-bomb')) >= 1, '#st-bomb đếm số bom');
    await shot('results-nolife');
  }, { viewport: LAND, initScript: NO_DIALOG });
  assertClean(log, '[5] đường sai');
  }

  /* ===== 6. Ôn lại thông minh: câu từng sai quay lại với nhãn 📝 ===== */
  if (want(6)) {
  log = await withGame('math-ninja', async ({ page, hook }) => {
    console.log('[6] ôn lại thông minh');
    const pool = await hook('Object.keys(X.Store.p().missed)');
    eq(pool.length, 3, 'kho ôn lại có 3 câu từ dữ liệu gieo sẵn');
    await startLevel(page, hook, 'a1');
    let sawReview = false, sawTag = false, reviewKey = null;
    for (let i = 0; i < 14 && (await hook('X.G.state')) === 'playing'; i++) {
      const q = await hook('X.G.question ? { review: !!X.G.question.review, key: X.G.question.key, answer: X.G.question.answer } : null');
      if (q && q.review) {
        sawReview = true;
        reviewKey = q.key;
        if (await vis(page, '#hud-review')) sawTag = true;
      }
      if (!q) { await page.waitForTimeout(150); continue; }
      await sliceValue(page, q.answer);
      await page.waitForTimeout(950);
      if (sawReview) break;
    }
    ok(sawReview, 'có ít nhất một câu ôn lại trong ván');
    ok(sawTag, 'nhãn 📝 Ôn lại hiện trên HUD');
    // trả lời đúng lần thứ hai → câu rời khỏi kho ôn
    if (reviewKey) {
      await page.evaluate((k) => { window.__NinjaToan.Store.noteOk(k); }, reviewKey);
      const left = await page.evaluate((k) => Object.keys(window.__NinjaToan.Store.p().missed).indexOf(k) < 0, reviewKey);
      ok(left, 'đúng 2 lần thì câu rời khỏi kho ôn lại');
    }
  }, {
    viewport: LAND,
    initScript: seed({
      players: {
        p1: {
          missed: {
            'a:7+5': { n: 3, ok: 0, last: 3, info: { a: 7, b: 5, op: '+', max: 12, level: 'a1' } },
            'a:9-4': { n: 2, ok: 0, last: 2, info: { a: 9, b: 4, op: '-', max: 12, level: 'a1' } },
            'a:6+3': { n: 1, ok: 0, last: 1, info: { a: 6, b: 3, op: '+', max: 12, level: 'a1' } }
          }
        }
      }
    })
  });
  assertClean(log, '[6] ôn lại thông minh');
  }

  /* ===== 7. Cơ chế chém: nhiều quả một nhát (A2), ghép đôi (A3, A4), ẩn tab lúc đếm ngược (A9) ===== */
  if (want(7)) {
  log = await withGame('math-ninja', async ({ page, hook }) => {
    console.log('[7] cơ chế chém');
    // A2: một nhát vuốt qua 1 quả sai + 1 quả đúng chỉ tính là đúng, không mất tim
    await startLevel(page, hook, 'a1');
    await page.evaluate(() => {
      const X = window.__NinjaToan;
      X.G.hearts = 3; X.G.correct = 0; X.G.wrong = 0;
      X.G.question = window.MathGen.make(1, 1, '+', 12);
      X.G.fruits.length = 0;
      X.launchWave([4, 2], { track: true });
    });
    await lineUpFruits(page, 300);
    await page.evaluate(() => window.__NinjaToan.sliceSegment(60, 300, 900, 300));
    await page.waitForTimeout(250);
    eq(await hook('X.G.hearts'), 3, 'một nhát qua quả sai + quả đúng: không mất tim (A2)');
    eq(await hook('X.G.correct'), 1, 'vẫn được tính là trả lời đúng (A2)');

    // A2: một nhát qua toàn quả sai chỉ mất đúng 1 tim
    await page.waitForTimeout(900);
    await page.evaluate(() => {
      const X = window.__NinjaToan;
      X.G.hearts = 3; X.G.wrong = 0;
      X.G.question = window.MathGen.make(1, 1, '+', 12);
      X.G.fruits.length = 0;
      X.launchWave([4, 5, 6], { track: true });
    });
    await lineUpFruits(page, 300);
    await page.evaluate(() => window.__NinjaToan.sliceSegment(60, 300, 900, 300));
    await page.waitForTimeout(250);
    eq(await hook('X.G.hearts'), 2, 'ba quả sai trong một nhát chỉ mất 1 tim (A2)');
    eq(await hook('X.G.wrong'), 1, 'chỉ tính 1 câu sai (A2)');
    await hook('X.goMenu()');

    // A4: bạn của quả đúng đã rơi mất → không phạt tim
    await startLevel(page, hook, 'p1');
    await page.evaluate(() => {
      const X = window.__NinjaToan;
      X.G.hearts = 3; X.G.wrong = 0; X.G.held = null;
      X.G.question = { target: 10, op: '+', pair: [3, 7], lo: 1, hi: 9 };
      X.G.fruits.length = 0;
      X.launchWave([3, 7, 5], { track: true });
    });
    await lineUpFruits(page, 300, 320);
    await page.evaluate(() => { window.__NinjaToan.G.fruits.find((f) => f.value === 7).dead = true; });
    await sliceValue(page, 3);
    await page.waitForTimeout(250);
    eq(await hook('X.G.hearts'), 3, 'bạn ghép đã rơi mất thì không mất tim (A4)');
    eq(await hook('X.G.wrong'), 0, 'không tính là câu sai (A4)');

    // A8: không có bạn ghép nào trong đợt → dạy cặp đúng
    await page.waitForTimeout(600);
    await page.evaluate(() => {
      const X = window.__NinjaToan;
      X.G.hearts = 3; X.G.wrong = 0; X.G.held = null; X.G.relaunchAt = -1;
      X.G.question = { target: 10, op: '+', pair: [3, 7], lo: 1, hi: 9 };
      X.G.fruits.length = 0;
      X.launchWave([4], { track: true });
    });
    await lineUpFruits(page, 300, 320);
    await sliceValue(page, 4);
    await page.waitForTimeout(250);
    const hint8 = await text(page, '#hud-hint');
    ok(hint8.indexOf('Cặp đúng: 3 + 7 = 10') >= 0, 'gợi ý dạy cặp đúng (A8): ' + hint8);
    ok(hint8.indexOf('−') < 0 || hint8.indexOf('4 cần 6') >= 0, 'gợi ý nói rõ số còn thiếu');
    await hook('X.goMenu()');

    // A3: ghép đôi phép trừ, chém số bé trước → gợi ý không được đảo ngược
    await startLevel(page, hook, 'p3');
    await page.evaluate(() => {
      const X = window.__NinjaToan;
      X.G.hearts = 3; X.G.held = null; X.G.relaunchAt = -1;
      X.G.question = { target: 1, op: '-', pair: [3, 2], lo: 1, hi: 20 };
      X.G.fruits.length = 0;
      X.launchWave([3, 2], { track: true });
    });
    await lineUpFruits(page, 300, 320);
    await sliceValue(page, 2);
    await page.waitForTimeout(150);
    eq(await hook('X.G.held'), 2, 'giữ quả số 2 (chém số bé trước)');
    await sliceValue(page, 3);
    await page.waitForTimeout(250);
    eq((await text(page, '#hud-hint')).trim(), '3 − 2 = 1 ✓', 'gợi ý viết số lớn trước (A3)');
    await hook('X.goMenu()');

    // A9: ẩn tab khi đang đếm ngược thì ván phải dừng lại
    await hook("X.startGame(window.MathGen.levelById('a1'))");
    await page.waitForFunction(() => window.__NinjaToan.G.state === 'countdown', null, { timeout: 5000 });
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(200);
    eq(await hook('X.G.state'), 'paused', 'ẩn tab lúc đếm ngược → tạm dừng (A9)');
    ok(await vis(page, '#pause'), 'màn tạm dừng hiện');
    const dur = await hook('X.G.duration');
    await page.waitForTimeout(2500);
    eq(await hook('X.G.timeLeft'), dur, 'đồng hồ chưa chạy khi còn tạm dừng (A9)');
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.click('#btn-resume');
    await page.waitForFunction(() => window.__NinjaToan.G.state === 'playing', null, { timeout: 15000 });
    ok(true, 'đếm ngược chạy lại và vào ván bình thường (A9)');
    await hook('X.endGame("timeup")');
    await waitOver(page);
  }, { viewport: LAND, initScript: NO_DIALOG });
  assertClean(log, '[7] cơ chế chém');
  }

  /* ===== 8. Hồ sơ người chơi: thêm bé, tách tiến trình, xóa qua cổng phụ huynh ===== */
  if (want(8)) {
  log = await withGame('math-ninja', async ({ page, hook, shot }) => {
    console.log('[8] hồ sơ người chơi');
    // ghi một kỷ lục cho bé mặc định
    await startLevel(page, hook, 'a1');
    await answerRound(page, hook, 2);
    await hook('X.endGame("timeup")');
    await waitOver(page);
    const bestBe = await hook("X.Store.getRecord('answer','a1',90).best");
    ok(bestBe > 0, 'bé "Bé" có kỷ lục ' + bestBe);
    await page.click('#btn-home');
    await page.waitForTimeout(250);
    await page.click('#btn-player');
    await page.waitForTimeout(250);
    ok(await vis(page, '#players'), 'màn hình người chơi mở ra');
    eq(await count(page, '.player-item'), 1, 'mới có 1 bé');
    ok(await page.evaluate(() => document.getElementById('btn-player-remove').disabled), 'nút Xóa bị vô hiệu khi chỉ có 1 bé');
    await page.click('#btn-player-add');
    await page.waitForTimeout(200);
    ok(await vis(page, '#player-form'), 'biểu mẫu thêm bé hiện ra');
    await page.fill('#player-name', 'Na');
    await page.click('.avatar[data-avatar="🦊"]');
    await page.click('#btn-player-save');
    await page.waitForTimeout(300);
    eq(await hook('X.Players.active().name'), 'Na', 'bé mới thành người đang chơi');
    eq(await hook('X.Players.active().avatar'), '🦊', 'hình đại diện được lưu');
    eq((await text(page, '#btn-player')).replace(/\s/g, ''), '🦊Na▾', 'chip đổi sang bé mới');
    eq(await count(page, '.player-item'), 2, 'danh sách có 2 bé');
    await shot('players');
    eq(await hook("Object.keys(X.Store.p().records).length"), 0, 'bé mới chưa có kỷ lục nào (tách tiến trình)');
    await page.click('#btn-players-back');
    await page.waitForTimeout(200);
    await page.click('#btn-play');
    await page.waitForTimeout(250);
    eq(await count(page, '.level-card[data-id="a1"] .best'), 0, 'lưới màn của bé mới không có kỷ lục');
    ok(((await text(page, '.level-card[data-id="a1"] .new')) || '').indexOf('Chưa chơi') > 0, 'màn a1 của bé mới hiện "✨ Chưa chơi"');
    await page.click('#btn-levels-back');
    await page.waitForTimeout(200);
    // đổi lại về "Bé" → kỷ lục quay lại
    await page.click('#btn-player');
    await page.waitForTimeout(200);
    await page.click('.player-item[data-id="p1"]');
    await page.waitForTimeout(300);
    eq(await hook('X.Players.active().name'), 'Bé', 'đổi lại bé cũ');
    eq(await hook("X.Store.getRecord('answer','a1',90).best"), bestBe, 'kỷ lục của bé cũ còn nguyên');
    // xóa bé phải qua cổng phụ huynh
    await page.click('.player-item[data-id="p1"]');
    await page.waitForTimeout(150);
    await page.click('#btn-player-remove');
    await page.waitForTimeout(250);
    ok(await vis(page, '#parent-gate'), 'cổng phụ huynh mở ra (không dùng window.confirm)');
    await page.fill('#parent-gate-input', '1');
    await page.click('#parent-gate-form button[type="submit"]');
    await page.waitForTimeout(200);
    ok(await vis(page, '#parent-gate'), 'trả lời sai thì cổng vẫn đóng kín');
    await answerGate(page, hook);
    ok(!(await vis(page, '#parent-gate')), 'trả lời đúng thì cổng đóng lại');
    eq(await count(page, '.player-item'), 1, 'đã xóa còn 1 bé');
    eq(await hook('X.Players.active().name'), 'Na', 'bé còn lại thành người đang chơi');
    eq(await hook("X.Store.data.players.p1"), undefined, 'tiến trình của bé bị xóa cũng được dọn');
  }, { viewport: LAND, initScript: NO_DIALOG });
  assertClean(log, '[8] hồ sơ người chơi');
  }

  /* ===== 9. Báo cáo "Kết quả của bé" + xóa tiến trình qua cổng phụ huynh ===== */
  if (want(9)) {
  log = await withGame('math-ninja', async ({ page, hook, shot }) => {
    console.log('[9] báo cáo cho phụ huynh');
    await startLevel(page, hook, 'a1');
    await answerRound(page, hook, 3);
    await hook('X.endGame("timeup")');
    await waitOver(page);
    await page.click('#btn-home');
    await page.waitForTimeout(250);
    await page.click('#btn-report');
    await page.waitForTimeout(250);
    ok(await vis(page, '#report'), 'màn báo cáo mở ra');
    ok((await text(page, '#report-title')).indexOf('Bé') > 0, 'tiêu đề có tên bé');
    eq(await count(page, '#report-stats .report-stat'), 4, '4 ô thống kê tổng');
    eq(await count(page, '#report-levels .report-row'), 16, 'đủ 16 dòng (10 màn đáp án + 6 màn ghép đôi)');
    ok((await text(page, '#report-levels')).indexOf('1.000') >= 0 || (await text(page, '#report-levels')).indexOf('🏆') >= 0, 'có cột kỷ lục');
    const rev = await text(page, '#report-review');
    ok(rev.indexOf(' = ') > 0 && /\d/.test(rev), 'kho ôn lại được diễn giải thành phép tính đọc được (' + rev.slice(0, 60) + ')');
    await shot('report');
    await page.click('#btn-report-reset');
    await page.waitForTimeout(250);
    ok(await vis(page, '#parent-gate'), 'xóa tiến trình phải qua cổng phụ huynh');
    await answerGate(page, hook);
    eq(await hook('X.Store.p().stats.plays'), 0, 'thống kê được xóa');
    eq(await hook("Object.keys(X.Store.p().records).length"), 0, 'kỷ lục được xóa');
    eq(await hook('Object.keys(X.Store.p().missed).length'), 0, 'kho ôn lại được xóa');
    await page.click('#btn-report-back');
    await page.waitForTimeout(200);
    ok(await vis(page, '#menu'), 'quay lại menu');
  }, {
    viewport: LAND,
    // Gieo 3 câu cần ôn: ván 3 câu ở dưới có thể rút tối đa 2 câu ôn (mỗi câu một mục khác nhau),
    // nên chắc chắn còn mục hiện trong báo cáo (mục chỉ biến mất sau 2 lần trả lời đúng).
    initScript: seed({
      players: {
        p1: {
          missed: {
            'a:7+5': { n: 3, ok: 0, last: 5, info: { a: 7, b: 5, op: '+', max: 12, level: 'a1' } },
            'a:9-4': { n: 2, ok: 0, last: 4, info: { a: 9, b: 4, op: '-', max: 12, level: 'a1' } },
            'a:6+3': { n: 1, ok: 0, last: 3, info: { a: 6, b: 3, op: '+', max: 12, level: 'a1' } }
          }
        }
      }
    })
  });
  assertClean(log, '[9] báo cáo');
  }

  /* ===== 10. Hai hướng màn hình + điện thoại + chuyển động giảm ===== */
  if (want(10)) {
  log = await withGame('math-ninja', async ({ page, hook, shot }) => {
    console.log('[10a] iPad dọc 820×1180');
    await page.click('#btn-play');
    await page.waitForTimeout(250);
    await shot('portrait-levels');
    await startLevel(page, hook, 'a1');
    await answerRound(page, hook, 1);
    await shot('portrait');
    await hook('X.endGame("timeup")');
    await waitOver(page);
    const p = await page.evaluate(() => { const el = document.querySelector('#gameover .panel'); return { s: el.scrollHeight, c: el.clientHeight }; });
    ok(p.s <= p.c + 4, 'bảng kết quả vừa màn hình dọc (' + p.s + '/' + p.c + ')');
  }, { viewport: PORT, initScript: NO_DIALOG });
  assertClean(log, '[10a] dọc');

  log = await withGame('math-ninja', async ({ page, hook, shot }) => {
    console.log('[10b] điện thoại dọc 390×844 (A5)');
    await startLevel(page, hook, 'a1');
    await page.evaluate(() => { const X = window.__NinjaToan; X.G.score = 12345; X.G.streak = 9; });
    await page.waitForTimeout(300);
    const box = await page.evaluate(() => {
      const b = document.getElementById('btn-pause').getBoundingClientRect();
      const s = document.getElementById('hud-stage').getBoundingClientRect();
      return { right: b.right, stageH: s.height, w: window.innerWidth };
    });
    ok(box.right <= box.w + 0.5, 'nút tạm dừng không bị đẩy khỏi màn hình (' + box.right.toFixed(0) + ' ≤ ' + box.w + ')');
    ok(box.stageH < 32, 'chip "Màn" không xuống hai dòng (' + box.stageH.toFixed(0) + ' px)');
    ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'trang không tràn ngang');
    await shot('phone');
    await hook('X.endGame("timeup")');
    await waitOver(page);
    await shot('phone-results');
  }, { viewport: PHONE, initScript: NO_DIALOG });
  assertClean(log, '[10b] điện thoại dọc');

  log = await withGame('math-ninja', async ({ page, hook, shot }) => {
    console.log('[10c] điện thoại ngang 844×390 (A10)');
    await startLevel(page, hook, 'a1');
    const hudBottom = await hook('X.G.hudBottom');
    ok(hudBottom > 0, 'đo được đáy HUD (' + hudBottom.toFixed(0) + ' px)');
    let minTop = 1e9;
    for (let i = 0; i < 40; i++) {
      const m = await page.evaluate(() => {
        const X = window.__NinjaToan;
        let t = 1e9;
        X.G.fruits.forEach(function (f) { if (f.launched && !f.dead) t = Math.min(t, f.y - f.r); });
        return t;
      });
      if (m < minTop) minTop = m;
      await page.waitForTimeout(120);
    }
    const limit = await page.evaluate(() => Math.min(window.__NinjaToan.G.hudBottom, window.__NinjaToan.G.H * 0.6 - window.__NinjaToan.G.R));
    ok(minTop + 2 >= limit, 'quả không bay khuất sau HUD (đỉnh cao nhất ' + minTop.toFixed(0) + ' ≥ ' + limit.toFixed(0) + ')');
    await shot('phone-land');
    await hook('X.endGame("timeup")');
    await waitOver(page);
    const p = await page.evaluate(() => { const el = document.querySelector('#gameover .panel'); return { s: el.scrollHeight, c: el.clientHeight, oy: getComputedStyle(el).overflowY }; });
    ok(p.s <= p.c + 4 || p.oy === 'auto' || p.oy === 'scroll', 'bảng kết quả vừa màn hình ngang hoặc cuộn được');
    await shot('phone-land-results');
  }, { viewport: PHONE_LAND, initScript: NO_DIALOG });
  assertClean(log, '[10c] điện thoại ngang');

  log = await withGame('math-ninja', async ({ page, hook }) => {
    console.log('[10d] chuyển động giảm');
    ok(await page.evaluate(() => document.documentElement.classList.contains('lite-fx')), 'thân trang có lớp lite-fx');
    eq(await hook('X.Motion.lite'), true, 'Motion.lite bật theo prefers-reduced-motion');
    // Công tắc ✨ phải báo đúng mức đang dùng và bị khóa (cài đặt máy thắng)
    const fxBtn = await page.evaluate(() => {
      const b = document.querySelector('.toggle[data-set="fx"]');
      return b ? { text: b.textContent, pressed: b.getAttribute('aria-pressed'), disabled: b.disabled } : null;
    });
    ok(fxBtn && fxBtn.text.indexOf('Ít') >= 0, 'nút ✨ báo mức Ít khi máy giảm chuyển động (' + (fxBtn && fxBtn.text) + ')');
    eq(fxBtn && fxBtn.pressed, 'false', 'aria-pressed của nút ✨ khớp trạng thái thật');
    eq(fxBtn && fxBtn.disabled, true, 'nút ✨ bị khóa khi máy ép giảm chuyển động');
    ok(await page.evaluate(() => Array.from(document.querySelectorAll('.toggle[data-set="sound"]'))
      .every((b) => b.textContent.indexOf('Hiệu ứng') < 0 && b.textContent.indexOf('Âm thanh') >= 0)),
      'nút âm thanh không còn trùng chữ "Hiệu ứng" với nút ✨');
    await startLevel(page, hook, 'a1');
    const wrongV = await page.evaluate(() => {
      const X = window.__NinjaToan;
      const f = X.G.fruits.find((o) => o.kind === 'fruit' && o.value !== X.G.question.answer);
      return f ? f.value : null;
    });
    await sliceValue(page, wrongV);
    await page.waitForTimeout(150);
    eq(await hook('X.G.shake'), 0, 'không rung màn hình khi giảm chuyển động');
    eq(await hook('X.G.flash'), null, 'không chớp toàn màn hình khi giảm chuyển động');
    ok((await hook('X.G.parts.length')) <= 120, 'số hạt bị giới hạn ở mức thấp');
  }, { viewport: LAND, reducedMotion: 'reduce', initScript: NO_DIALOG });
  assertClean(log, '[10d] chuyển động giảm');
  }

  /* ===== 11. Bàn phím ===== */
  if (want(11)) {
  log = await withGame('math-ninja', async ({ page, hook }) => {
    console.log('[11] bàn phím');
    await page.click('#btn-play');
    await page.waitForTimeout(250);
    await page.focus('.level-card[data-id="a1"]');
    ok(await page.evaluate(() => document.activeElement && document.activeElement.classList.contains('level-card')), 'thẻ màn chơi nhận được tiêu điểm');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
    ok(['countdown', 'playing'].indexOf(await hook('X.G.state')) >= 0, 'Enter trên thẻ màn bắt đầu ván');
    await page.waitForFunction(() => window.__NinjaToan.G.state === 'playing', null, { timeout: 15000 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    eq(await hook('X.G.state'), 'paused', 'Escape tạm dừng');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    eq(await hook('X.G.state'), 'playing', 'Enter chơi tiếp');
    await hook('X.endGame("timeup")');
    await waitOver(page);
    // Escape đóng màn báo cáo
    await page.click('#btn-home');
    await page.waitForTimeout(200);
    await page.click('#btn-report');
    await page.waitForTimeout(200);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    ok(!(await vis(page, '#report')), 'Escape đóng màn báo cáo');
    // gõ tên trong ô nhập không kích hoạt phím tắt
    await page.click('#btn-player');
    await page.waitForTimeout(200);
    await page.click('#btn-player-add');
    await page.waitForTimeout(200);
    await page.fill('#player-name', 'Pp');
    await page.keyboard.press('p');
    await page.waitForTimeout(150);
    ok(await vis(page, '#players'), 'gõ chữ "p" trong ô tên không làm gì khác');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    ok(!(await vis(page, '#player-form')), 'Escape đóng biểu mẫu tên');
  }, { viewport: LAND, initScript: NO_DIALOG });
  assertClean(log, '[11] bàn phím');
  }

  /* ===== 12. Bộ xử lý lỗi toàn cục: một khung hình lỗi không làm treo game ===== */
  if (want(12)) {
  log = await withGame('math-ninja', async ({ page, hook }) => {
    console.log('[12] lỗi toàn cục');
    await startLevel(page, hook, 'a1');
    await page.evaluate(() => { window.__NinjaToan.G.fruits = null; });
    await page.waitForTimeout(900);
    ok(await page.evaluate(() => { const t = document.getElementById('toast'); return t.classList.contains('show') && t.textContent.indexOf('Có lỗi nhỏ') >= 0; }), 'hiện thông báo "Có lỗi nhỏ"');
    eq(await hook('X.G.state'), 'menu', 'ván lỗi kết thúc an toàn về menu');
    ok(await vis(page, '#menu'), 'menu hiện lại');
    // vẫn chơi lại được sau lỗi
    await startLevel(page, hook, 'a1');
    eq(await hook('X.G.state'), 'playing', 'chơi lại được sau lỗi');
    const perf = await hook('X.G.perf');
    console.log('  perf sau lỗi: avgUpdate=' + perf.avgUpdate.toFixed(3) + ' ms, avgRender=' + perf.avgRender.toFixed(3) + ' ms');
    await hook('X.goMenu()');
  }, { viewport: LAND, initScript: NO_DIALOG });
  const induced = log.errors.filter((e) => e.indexOf('[ninja-toan]') === 0);
  ok(induced.length >= 1, 'lỗi cố ý được ghi log');
  log.errors = log.errors.filter((e) => e.indexOf('[ninja-toan]') !== 0);
  assertClean(log, '[12] lỗi toàn cục');
  }

  /* ===== 13. Nửa quả nướng sẵn (A16): đúng hình, trả ô về kho, sống sót khi xoay màn ===== */
  if (want(13)) {
  log = await withGame('math-ninja', async ({ page, hook, shot }) => {
    console.log('[13] nửa quả nướng sẵn (A16)');
    await startLevel(page, hook, 'a1');
    // Xếp cả đợt lên một hàng rồi vuốt một nhát: mỗi quả sinh 2 nửa
    await page.evaluate(() => {
      const X = window.__NinjaToan;
      X.G.question = window.MathGen.make(1, 1, '+', 12);
      X.G.fruits.length = 0;
      X.launchWave([2, 3, 4, 5], { track: true });
    });
    await lineUpFruits(page, 320, 150);
    await page.evaluate(() => window.__NinjaToan.sliceSegment(40, 320, 1140, 320));
    await page.waitForTimeout(120);
    let st = await page.evaluate(() => {
      const X = window.__NinjaToan, SP = window.Sprites;
      return {
        halves: X.G.halves.length,
        baked: X.G.halves.filter((h) => h.sprite && h.sprite.canvas).length,
        shared: new Set(X.G.halves.map((h) => h.sprite).filter(Boolean)).size,
        pool: SP.halfPool.length,
        used: SP.halfPool.filter((s) => !s.free).length,
        gen: SP.halfGen
      };
    });
    ok(st.halves >= 6, 'một nhát vuốt tạo ra nhiều nửa quả (' + st.halves + ')');
    eq(st.baked, st.halves, 'mọi nửa quả đều có sprite nướng sẵn');
    eq(st.shared, st.halves, 'không có hai nửa quả dùng chung một ô');
    eq(st.used, st.halves, 'số ô đang dùng khớp số nửa quả');
    ok(st.pool <= 16, 'kho không vượt quá 16 ô (' + st.pool + ')');
    await shot('halves');

    // Dựng lại sprite giữa lúc nửa quả đang bay (đổi hướng làm quả to/nhỏ đi):
    // kho bị dọn, sprite đang giữ thành đời cũ, khung hình kế tiếp phải tự nướng lại
    const after = await page.evaluate(() => {
      const X = window.__NinjaToan, SP = window.Sprites;
      const before = SP.halfGen;
      SP.build(SP.r + 6, SP.dpr);
      const cleared = SP.halfPool.length;
      X.render();
      const out = {
        before: before, gen: SP.halfGen, cleared: cleared, halves: X.G.halves.length,
        stale: X.G.halves.filter((h) => h.sprite && h.sprite.gen !== SP.halfGen).length,
        baked: X.G.halves.filter((h) => h.sprite && h.sprite.canvas).length
      };
      SP.build(X.G.R, SP.dpr);   // trả lại kích thước thật của ván đang chơi
      X.render();
      return out;
    });
    ok(after.gen > after.before, 'dựng lại sprite tăng số đời (' + after.before + ' → ' + after.gen + ')');
    eq(after.cleared, 0, 'dựng lại dọn sạch kho ô cũ');
    eq(after.stale, 0, 'render() nướng lại nửa quả giữ sprite đời cũ');
    eq(after.baked, after.halves, 'sau khi dựng lại vẫn đủ sprite cho mọi nửa quả');

    // Nửa quả rơi hết -> mọi ô phải được trả về kho
    await page.evaluate(() => { window.__NinjaToan.G.halves.forEach((h) => { h.y = 99999; h.vy = 400; }); });
    await page.waitForTimeout(400);
    st = await page.evaluate(() => {
      const X = window.__NinjaToan, SP = window.Sprites;
      return { halves: X.G.halves.length, used: SP.halfPool.filter((s) => !s.free).length };
    });
    eq(st.halves, 0, 'nửa quả rơi khỏi màn đã bị dọn');
    eq(st.used, 0, 'mọi ô nướng sẵn đã được trả về kho');

    // Về menu rồi chơi lại: kho vẫn sạch (clearWorld trả ô)
    await hook('X.endGame("timeup")');
    await waitOver(page);
    await hook('X.goMenu()');
    await page.waitForTimeout(200);
    eq(await page.evaluate(() => window.Sprites.halfPool.filter((s) => !s.free).length), 0, 'kết thúc ván không giữ lại ô nào');
  }, { viewport: LAND, initScript: NO_DIALOG });
  assertClean(log, '[13] nửa quả nướng sẵn');
  }

  /* ===== 14. Bố cục điện thoại nhỏ (C11), tương phản báo cáo và nút bị khóa ===== */
  if (want(14)) {
  const MASTERY = seed({
    players: {
      p1: {
        records: { 'answer:a1:90': { best: 1200, stars: 3, top: [{ name: 'Bé', score: 1200, date: 1 }] } },
        stats: { plays: 4, correct: 30, wrong: 1, seconds: 360, byTopic: { a1: { c: 30, w: 1 } }, last: 1 }
      }
    }
  });

  log = await withGame('math-ninja', async ({ page, hook, shot }) => {
    console.log('[14a] điện thoại 390×844: menu, thanh tiêu đề, vùng chạm');
    // Menu: cả nhóm "⏱ Thời gian mỗi ván" và dòng chân trang phải nằm trong một trang
    const menu = await page.evaluate(() => {
      const p = document.querySelector('#menu .panel');
      const dur = document.getElementById('duration-group').getBoundingClientRect();
      const foot = document.querySelector('#menu .footer-note').getBoundingClientRect();
      const link = document.querySelector('#menu .footer-note a').getBoundingClientRect();
      const togs = Array.from(document.querySelectorAll('#menu .toggle'));
      const rows = new Set(togs.map((b) => Math.round(b.getBoundingClientRect().top)));
      return {
        s: p.scrollHeight, c: p.clientHeight, sw: p.scrollWidth, cw: p.clientWidth,
        durBottom: dur.bottom, footBottom: foot.bottom, vh: window.innerHeight,
        linkH: link.height, linkW: link.width,
        togRows: rows.size, togLabels: togs.map((b) => b.textContent)
      };
    });
    ok(menu.s <= menu.c + 4, 'bảng menu vừa một trang trên điện thoại (' + menu.s + ' ≤ ' + menu.c + ' + 4)');
    ok(menu.sw <= menu.cw + 1, 'bảng menu không tràn ngang (' + menu.sw + '/' + menu.cw + ')');
    ok(menu.durBottom <= menu.vh, 'nhóm chọn thời gian nằm trong màn hình (đáy ' + Math.round(menu.durBottom) + ' ≤ ' + menu.vh + ')');
    ok(menu.footBottom <= menu.vh, 'dòng chân trang nằm trong màn hình (đáy ' + Math.round(menu.footBottom) + ')');
    eq(menu.togRows, 2, '4 công tắc xếp vừa hai hàng nhờ nhãn ngắn');
    ok(menu.togLabels.every((t) => t.indexOf(': Bật') < 0 && t.indexOf(': Tắt') < 0), 'nhãn công tắc rút gọn trên điện thoại (' + menu.togLabels.join(' · ') + ')');
    ok(menu.linkH >= 44 && menu.linkW >= 44, 'liên kết chân trang đủ 44×44 (' + Math.round(menu.linkW) + '×' + Math.round(menu.linkH) + ')');
    await shot('phone-menu');

    // Thanh tiêu đề màn chọn màn: không nút nào bị cắt khỏi bảng
    await page.click('#btn-play');
    await page.waitForTimeout(350);
    const head = await page.evaluate(() => {
      const p = document.querySelector('#levels .panel');
      const pr = p.getBoundingClientRect();
      const btns = Array.from(p.querySelectorAll('.screen-head button')).map((b) => {
        const r = b.getBoundingClientRect();
        return { id: b.id, w: r.width, h: r.height, right: r.right, left: r.left };
      });
      return { sw: p.scrollWidth, cw: p.clientWidth, left: pr.left, right: pr.right, btns: btns };
    });
    ok(head.sw <= head.cw + 1, 'bảng chọn màn không tràn ngang (' + head.sw + ' ≤ ' + head.cw + ' + 1)');
    eq(head.btns.length, 3, '3 nút trên thanh tiêu đề (quay lại, kết quả, cách chơi)');
    for (const b of head.btns) {
      ok(b.right <= head.right + 1 && b.left >= head.left - 1, 'nút ' + b.id + ' nằm trọn trong bảng (phải ' + Math.round(b.right) + ' ≤ ' + Math.round(head.right) + ')');
      ok(b.w >= 44 && b.h >= 44, 'nút ' + b.id + ' đủ vùng chạm 44×44 (' + Math.round(b.w) + '×' + Math.round(b.h) + ')');
    }
    await shot('phone-levels');
  }, { viewport: PHONE, initScript: NO_DIALOG });
  assertClean(log, '[14a] bố cục điện thoại');

  for (const vp of [LAND, PHONE]) {
    log = await withGame('math-ninja', async ({ page, hook, shot }) => {
      console.log('[14b] tương phản báo cáo + nút bị khóa @' + vp.width + '×' + vp.height);
      await page.click('#btn-report');
      await page.waitForTimeout(350);
      ok(await vis(page, '#report'), 'màn báo cáo mở ra');
      ok(await page.evaluate(() => !!document.querySelector('#report-levels .mastered')), 'có huy hiệu "Đã thuộc" để đo');
      for (const sel of ['.report-stat .v', '#report-levels .report-row .mastered', '.report-weak', '.linkish']) {
        const c = await colorsOf(page, sel);
        const r = c ? contrast(c.fg, c.bg) : 0;
        ok(r >= 4.5, 'tương phản ' + sel + ' ≥ 4.5:1 (' + r.toFixed(2) + ':1, ' + (c && c.fg) + ' trên ' + (c && c.bg) + ')');
      }
      if (vp === PHONE) await shot('phone-report');
      // Nút "🗑 Xóa" bị khóa khi chỉ còn một bé: phải nhìn thấy rõ là đang tắt
      await page.click('#btn-report-back');
      await page.waitForTimeout(250);
      await page.click('#btn-player');
      await page.waitForTimeout(300);
      const rm = await page.evaluate(() => {
        const b = document.getElementById('btn-player-remove');
        const st = getComputedStyle(b);
        return { disabled: b.disabled, opacity: Number(st.opacity), cursor: st.cursor };
      });
      eq(rm.disabled, true, 'chỉ còn một bé thì nút Xóa bị khóa');
      ok(rm.opacity <= 0.6, 'nút bị khóa mờ đi để bé thấy là bấm không được (opacity ' + rm.opacity + ')');
      eq(rm.cursor, 'default', 'nút bị khóa không đổi con trỏ thành bàn tay');
      if (vp === PHONE) await shot('phone-players');
    }, { viewport: vp, initScript: MASTERY });
    assertClean(log, '[14b] tương phản @' + vp.width);
  }
  }


  /* ===== 15. Nâng cấp lối chơi & trình bày (mục C): nút 💡, lộ đáp án, giải thích,
       thưởng nhanh, bước tiếp theo, lưới màn gộp kỷ lục, mưa giấy màu, tương phản ===== */
  if (want(15)) {
  log = await withGame('math-ninja', async ({ page, hook, shot }) => {
    console.log('[15a] nút 💡 Gợi ý, lộ đáp án và lời giải thích');
    await startLevel(page, hook, 'a3');
    ok(!(await page.evaluate(() => document.getElementById('btn-hint').disabled)), 'nút 💡 bật khi đang có đợt quả');
    await page.click('#btn-hint');
    await page.waitForTimeout(250);
    eq(await hook('!!X.G.wave.hint'), true, 'bấm 💡 bật vòng gợi ý cho đợt quả');
    eq(await hook('X.G.wave.fruits.some(function (f) { return f.hint; })'), true, 'quả đúng được đánh dấu vòng vàng');
    ok(await vis(page, '#hud-hint'), 'dải gợi ý hiện đáp án');
    ok((await text(page, '#hud-hint')).indexOf('💡') === 0, 'dải gợi ý bắt đầu bằng 💡');
    ok(await page.evaluate(() => document.getElementById('btn-hint').disabled), 'dùng gợi ý rồi thì nút 💡 khoá lại');
    eq((await hook('X.G.missedList')).length, 1, 'câu phải nhờ gợi ý được ghi vào "Cần ôn lại"');
    const ansHint = await hook('X.G.question.answer');
    await sliceValue(page, ansHint);
    await page.waitForTimeout(250);
    eq(await hook('X.G.score'), 50, 'câu dùng gợi ý chỉ được 50 điểm (C2)');
    eq(await hook('X.G.streak'), 0, 'câu dùng gợi ý không tăng chuỗi combo');
    eq(await hook('X.G.correct'), 1, 'vẫn tính là trả lời đúng');

    // Chém sai: đáp án lộ ngay trong thẻ phép tính + lời giải thích cách nhẩm
    const wrongV = await findWrongValue(page);
    ok(wrongV != null, 'tìm được quả sai để chém');
    const q = await hook('({ a: X.G.question.a, b: X.G.question.b, op: X.G.question.op, answer: X.G.question.answer })');
    const tHint = Date.now();
    await sliceValue(page, wrongV);
    await page.waitForTimeout(200);
    const cardTxt = await text(page, '#hud-question');
    ok(cardTxt.indexOf('= ' + q.answer) >= 0, 'thẻ phép tính lộ đáp án đúng (C1): "' + cardTxt + '"');
    eq(await count(page, '#hud-question .reveal'), 1, 'số lộ ra có lớp .reveal để tô đỏ');
    const hintTxt = await text(page, '#hud-hint');
    const expl = await page.evaluate((qq) => window.MathGen.explain(window.MathGen.make(qq.a, qq.b, qq.op, 24)), q);
    if (expl) ok(hintTxt.indexOf(expl) > 0, 'gợi ý kèm cách nhẩm "' + expl + '"');
    else console.log('  (phép tính này không cần giải thích: ' + q.a + q.op + q.b + ')');
    // Dải gợi ý sai phải ở lại ít nhất 3 giây để bé đọc kịp
    await page.waitForTimeout(2600);
    ok(await vis(page, '#hud-hint'), 'dải gợi ý sai còn hiện sau 2,6 s');
    await page.waitForFunction(() => document.getElementById('hud-hint').hidden, null, { timeout: 8000 });
    ok(Date.now() - tHint >= 3000, 'dải gợi ý sai hiện ≥ 3 s (' + (Date.now() - tHint) + ' ms)');
    // Dải gợi ý dài phải xuống dòng và không làm HUD tràn ngang
    await hook('X.showHint("Đây là một dòng gợi ý rất dài để kiểm tra việc xuống dòng của dải gợi ý trong HUD", "bad")');
    await page.waitForTimeout(450);                       // đợi hoạt hình chip-pop xong mới đo
    const hb = await page.evaluate(() => {
      const el = document.getElementById('hud-hint');
      const pause = document.getElementById('btn-pause').getBoundingClientRect();
      return { w: el.offsetWidth, h: el.offsetHeight, wrap: getComputedStyle(el).whiteSpace, right: pause.right, W: innerWidth };
    });
    eq(hb.wrap, 'normal', 'dải gợi ý được phép xuống dòng');
    ok(hb.w <= Math.min(hb.W * 0.92, 560) + 1, 'dải gợi ý không rộng quá 560 px (' + Math.round(hb.w) + ')');
    ok(hb.h > 40, 'dòng dài xuống thành nhiều dòng (cao ' + Math.round(hb.h) + ' px)');
    ok(hb.right <= hb.W, 'dải gợi ý dài không đẩy nút ⏸ ra khỏi màn hình');
  }, { viewport: LAND, initScript: NO_DIALOG });
  assertClean(log, '[15a] gợi ý và giải thích');

  log = await withGame('math-ninja', async ({ page, hook }) => {
    console.log('[15b] thưởng nhanh ⚡ tính từ lúc quả hiện ra');
    await startLevel(page, hook, 'a1');
    await page.waitForFunction(() => {
      const w = window.__NinjaToan.G.wave;
      return w && w.visibleAt >= 0;
    }, null, { timeout: 8000 });
    ok(true, 'đợt quả ghi lại thời điểm quả hiện ra (visibleAt)');
    await hook('X.G.wave.visibleAt = X.G.time');            // giả lập "vừa nhìn thấy quả"
    const a = await hook('X.G.question.answer');
    await sliceValue(page, a);
    await page.waitForTimeout(250);
    eq(await hook('X.G.score'), 150, 'trả lời trong 2 giây được 100 + 50 điểm thưởng nhanh (C8)');
  }, { viewport: LAND, initScript: NO_DIALOG });
  assertClean(log, '[15b] thưởng nhanh');

  log = await withGame('math-ninja', async ({ page, hook, shot }) => {
    console.log('[15c] bước tiếp theo trên bảng kết quả + mưa giấy màu');
    await startLevel(page, hook, 'a1');
    await hook('X.G.score = 99999');
    await hook('X.endGame("timeup")');
    await waitOver(page);
    eq(await count(page, '#result-stars .on'), 3, 'được 3 sao');
    ok(await vis(page, '#btn-next'), 'đủ 3 sao thì mời chơi màn tiếp theo (C5)');
    ok(!(await vis(page, '#btn-easier')), 'không mời chơi màn dễ hơn khi đang thắng');
    ok((await text(page, '#btn-next')).indexOf('Phạm vi 20') > 0, 'nút chỉ đúng màn kế tiếp');
    ok(await vis(page, '#result-fx'), 'có mưa giấy màu chúc mừng (C12)');
    eq(await count(page, '#result-fx i'), 24, 'mưa giấy màu có 24 mảnh');
    await shot('results-3sao');
    await page.click('#btn-next');
    await page.waitForFunction(() => window.__NinjaToan.G.level && window.__NinjaToan.G.level.id === 'a2', null, { timeout: 20000 });
    eq(await hook('X.G.level.id'), 'a2', 'bấm nút mở đúng màn tiếp theo');
    ok(!(await vis(page, '#result-fx')), 'mưa giấy màu tắt khi vào ván mới');

    // Hết tim ở màn 2 → mời chơi màn dễ hơn
    await page.waitForFunction(() => window.__NinjaToan.G.state === 'playing', null, { timeout: 20000 });
    await hook('X.endGame("nolife")');
    await waitOver(page);
    ok(await vis(page, '#btn-easier'), 'hết tim thì mời chơi màn dễ hơn (C5)');
    ok(!(await vis(page, '#btn-next')), 'không mời màn khó hơn khi vừa thua');
    await page.click('#btn-easier');
    await page.waitForFunction(() => window.__NinjaToan.G.level && window.__NinjaToan.G.level.id === 'a1', null, { timeout: 20000 });
    eq(await hook('X.G.level.id'), 'a1', 'nút "màn dễ hơn" quay về màn trước');
    // Màn đầu tiên thì không có màn nào dễ hơn nữa
    await page.waitForFunction(() => window.__NinjaToan.G.state === 'playing', null, { timeout: 20000 });
    await hook('X.endGame("nolife")');
    await waitOver(page);
    ok(!(await vis(page, '#btn-easier')), 'màn đầu tiên không mời "màn dễ hơn"');
  }, { viewport: LAND, initScript: NO_DIALOG });
  assertClean(log, '[15c] bước tiếp theo');

  const AGG = seed({
    duration: 90,
    players: { p1: { records: { 'answer:a1:60': { best: 3000, stars: 3, top: [{ name: 'Bé', score: 3000, date: 1 }] } } } }
  });
  log = await withGame('math-ninja', async ({ page, hook, shot }) => {
    console.log('[15d] lưới màn gộp kỷ lục cả ba mức thời gian');
    await page.click('#btn-play');
    await page.waitForTimeout(300);
    eq(await hook('X.G.duration'), 90, 'đang ở mức 1,5 phút');
    const a1 = await text(page, '.level-card[data-id="a1"]');
    ok(a1.indexOf('3.000') > 0, 'thẻ a1 hiện kỷ lục của ván 1 phút (C9): "' + a1.replace(/\s+/g, ' ') + '"');
    ok(a1.indexOf('1:00') > 0, 'thẻ a1 ghi rõ kỷ lục đó thuộc mức thời gian nào');
    eq(await count(page, '.level-card[data-id="a1"].done'), 1, 'màn 3 sao được viền vàng');
    const a2 = await text(page, '.level-card[data-id="a2"]');
    ok(a2.indexOf('Chưa chơi') > 0, 'màn chưa chơi hiện "✨ Chưa chơi" thay vì 🏆 0');
    eq(await count(page, '.level-card.next'), 1, 'chỉ một thẻ được gợi ý "chơi tiếp"');
    eq(await page.getAttribute('.level-card.next', 'data-id'), 'a2', 'gợi ý chơi tiếp đúng màn a2');
    ok((await text(page, '.level-card.next .next-badge')).indexOf('Chơi tiếp') > 0, 'thẻ gợi ý có nhãn 👉 Chơi tiếp');
    await shot('levels-next');
    // Tương phản của nhãn lớp và các chữ phụ (C4, C10)
    for (const sel of ['.level-card .grade.g1', '.level-card .grade.g2', '.level-card .grade.gx']) {
      const c = await colorsOf(page, sel);
      const r = c ? contrast(c.fg, c.bg) : 0;
      ok(r >= 4.5, 'tương phản ' + sel + ' ≥ 4.5:1 (' + r.toFixed(2) + ':1)');
    }
    await page.click('#btn-levels-back');
    await page.waitForTimeout(300);
    for (const sel of ['.footer-note', '.title small', '.chip-label']) {
      const c = await colorsOf(page, sel);
      const r = c ? contrast(c.fg, c.bg) : 0;
      ok(r >= 4.5, 'tương phản ' + sel + ' ≥ 4.5:1 (' + r.toFixed(2) + ':1, ' + (c && c.fg) + ')');
    }
    // Chữ trên nền chuyển sắc (nút, huy hiệu, chip combo): đo với cả hai đầu của gradient
    const grad = await page.evaluate(() => {
      const out = {};
      const read = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const st = getComputedStyle(el);
        const stops = (st.backgroundImage.match(/rgba?\([^)]+\)/g) || []);
        return { fg: st.color, stops: stops };
      };
      out.btn = read('#btn-play');
      out.teal = read('#btn-howto');
      return out;
    });
    for (const k of Object.keys(grad)) {
      const g = grad[k];
      if (!g || !g.stops.length) { ok(false, 'không đọc được nền chuyển sắc của ' + k); continue; }
      const rs = g.stops.map((c) => contrast(g.fg, c));
      const best = Math.max.apply(null, rs), worst = Math.min.apply(null, rs);
      // Chữ nút là chữ to và đậm (≥ 19 px, weight 800): ngưỡng WCAG là 3:1 ở phần nền đậm
      ok(best >= 3, 'chữ trắng trên nút ' + k + ' đạt 3:1 ở nửa đậm (' + best.toFixed(2) + ':1)');
      ok(worst >= 2.4, 'nửa sáng của nút ' + k + ' vẫn đủ nổi (' + worst.toFixed(2) + ':1)');
    }
  }, { viewport: LAND, initScript: AGG });
  assertClean(log, '[15d] lưới màn + tương phản');

  log = await withGame('math-ninja', async ({ page, hook }) => {
    console.log('[15e] giảm chuyển động: không mưa giấy màu, thông báo không bị bảng che');
    ok(await page.evaluate(() => document.documentElement.classList.contains('lite-fx')), 'bật chế độ hiệu ứng ít');
    await startLevel(page, hook, 'a1');
    await hook('X.G.score = 99999');
    await hook('X.endGame("timeup")');
    await waitOver(page);
    ok(!(await vis(page, '#result-fx')), 'giảm chuyển động thì không có mưa giấy màu');
    eq(await count(page, '#result-fx i'), 0, 'không dựng phần tử mưa giấy màu nào');
    await hook('X.goMenu()');
    await page.waitForTimeout(200);
    eq(await hook('X.G.state'), 'menu', 'quay về menu bình thường');
  }, { viewport: LAND, initScript: NO_DIALOG, reducedMotion: 'reduce' });
  assertClean(log, '[15e] giảm chuyển động');

  log = await withGame('math-ninja', async ({ page, hook }) => {
    console.log('[15f] thông báo nhảy lên trên khi có bảng phủ mờ');
    await startLevel(page, hook, 'a1');
    await hook('X.G.score = 12345');
    await hook('X.endGame("timeup")');
    await waitOver(page);
    await page.click('#btn-save-name');
    await page.waitForTimeout(250);
    const t = await page.evaluate(() => {
      const el = document.getElementById('toast');
      const r = el.getBoundingClientRect();
      return { top: el.classList.contains('top'), show: el.classList.contains('show'), y: r.top, H: innerHeight };
    });
    ok(t.show, 'có thông báo hiện ra');
    ok(t.top, 'thông báo nhảy lên trên khi bảng kết quả đang mở (C15)');
    ok(t.y < t.H * 0.25, 'thông báo nằm ở nửa trên màn hình (' + Math.round(t.y) + ' px)');
  }, { viewport: LAND, initScript: NO_DIALOG });
  assertClean(log, '[15f] vị trí thông báo');

  log = await withGame('math-ninja', async ({ page, hook, shot }) => {
    console.log('[15g] điện thoại 390×844: HUD vẫn đủ chỗ cho nút 💡');
    await startLevel(page, hook, 'a1');
    await page.evaluate(() => { window.__NinjaToan.G.score = 123456; window.__NinjaToan.G.streak = 9; });
    await page.waitForTimeout(400);
    const box = await page.evaluate(() => {
      const r = (id) => document.getElementById(id).getBoundingClientRect();
      return {
        pause: r('btn-pause').right, hint: r('btn-hint').right,
        hintW: r('btn-hint').width, stageH: r('hud-stage').height, W: innerWidth
      };
    });
    ok(box.pause <= box.W, 'nút ⏸ vẫn trong màn hình (' + Math.round(box.pause) + ' ≤ ' + box.W + ')');
    ok(box.hint <= box.W, 'nút 💡 vẫn trong màn hình');
    ok(box.hintW >= 44, 'nút 💡 đủ lớn để chạm (' + Math.round(box.hintW) + ' px)');
    ok(box.stageH < 34, 'chip "Màn N" không xuống hai dòng');
    await shot('phone-hud-hint');
  }, { viewport: PHONE, initScript: NO_DIALOG });
  assertClean(log, '[15g] HUD điện thoại');
  }

  if (failures) { console.error('\nmath-ninja e2e: ' + failures + ' kiểm tra thất bại'); process.exitCode = 1; }
  else console.log('\nmath-ninja e2e: tất cả kiểm tra đạt');
})().catch((e) => { console.error(e); process.exit(1); });
