'use strict';
/* Kiểm thử đầu-cuối Tháp Đồng Hồ (Playwright/Chromium):
   1. iPad ngang: menu → chọn màn → chơi (vật lý cột, hết giờ, ôn lại, tốc độ rơi) → tổng kết → hỏi đáp → mở khóa,
      xoay dọc, báo cáo, đổi người chơi (tách tiến trình), cổng phụ huynh, bắt lỗi toàn cục, đo hiệu năng.
   2. Di trú dữ liệu cũ (unlocked/levels ở cấp cao nhất) và dữ liệu rác.
   3. Điện thoại dọc 390×844: menu, bài học, chơi, tổng kết.
   Chạy: NODE_PATH=/opt/node22/lib/node_modules node tests/e2e/thap-dong-ho.e2e.js */
const assert = require('node:assert/strict');
const { withGame, assertClean } = require('./lib/browser.js');

const LAND = { width: 1180, height: 820 }, PORT = { width: 820, height: 1180 }, PHONE = { width: 390, height: 844 };
const vis = (page, sel) => page.isVisible(sel);

/** Chờ đếm ngược xong rồi bước update() cho tới khi có đồng hồ rơi. */
async function waitPlaying(page) {
  await page.waitForTimeout(3400);
  return page.evaluate(() => {
    const X = window.__ThapDongHo;
    for (let i = 0; i < 120 && (X.G.state !== 'playing' || !X.G.piece); i++) X.update(0.05);
    return X.G.state === 'playing' && !!X.G.piece;
  });
}
/** Thả sai cố ý rồi bước cho tới khi đồng hồ biến mất. */
const playWrong = (page) => page.evaluate(() => {
  const X = window.__ThapDongHo, p = X.G.piece;
  const read = X.K.read(p.t);
  X.moveTo((p.target + 1) % 4); X.hardDrop();
  for (let i = 0; i < 60 && X.G.piece; i++) X.update(0.05);
  return read;
});
/** Chơi đúng tới hết màn qua móc gỡ lỗi. */
const playCorrect = (page) => page.evaluate(() => {
  const X = window.__ThapDongHo;
  let n = 0;
  while (X.G.state === 'playing' && n++ < 4000) {
    const p = X.G.piece;
    if (p && p.mode === 'fall') { X.moveTo(p.target); X.hardDrop(); }
    X.update(0.1);
  }
  return { state: X.G.state, n: n };
});
const stepUntilPiece = (page) => page.evaluate(() => { const X = window.__ThapDongHo; for (let i = 0; i < 120 && !X.G.piece; i++) X.update(0.05); return !!X.G.piece; });
const stone = 'function (K, id) { return { t: K.genFor(1), id: id, cracks: [[0.1, 0, 0.3, 0.4, 0.5, 0.9]], popAt: null, dead: false, born: 0 }; }';
/** Chip gợi ý (lời giải thích khi thả sai) phải nằm gọn trong màn hình và không đè lên tiêu đề đồng hồ lớn. */
async function assertHintFits(page, where) {
  const g = await page.evaluate(() => {
    const X = window.__ThapDongHo, el = document.getElementById('hud-hint'), r = el.getBoundingClientRect();
    return { hidden: el.hidden, left: Math.round(r.left), right: Math.round(r.right), bottom: Math.round(r.bottom), W: X.G.W,
      titleTop: Math.round(X.G.big.y - X.G.big.cardH / 2 - X.G.big.titleH), text: el.textContent };
  });
  assert.ok(!g.hidden, where + ': chip gợi ý đang hiện');
  assert.ok(g.left >= 0 && g.right <= g.W, where + ': chip gợi ý tràn mép màn hình ' + JSON.stringify(g));
  assert.ok(g.bottom <= g.titleTop + 1, where + ': chip gợi ý đè lên tiêu đề đồng hồ lớn ' + JSON.stringify(g));
  return g;
}

async function run1() {
  let missedRead = '';
  const log = await withGame('thap-dong-ho', async ({ page, hook, shot }) => {
    /* ---- 1. Khởi động, menu, chọn màn ---- */
    assert.ok(await vis(page, '#menu'), 'menu hiện');
    assert.equal(await hook('X.G.state'), 'menu');
    const chip = await page.$eval('#btn-player', (e) => e.textContent);
    assert.ok(chip.indexOf('Bé') >= 0 && chip.indexOf('🐯') >= 0, 'chip người chơi mặc định: ' + chip);
    const toggles = await page.$$eval('#menu [data-audio-toggles] .toggle', (b) => b.map((x) => x.getAttribute('aria-pressed')));
    assert.equal(toggles.length, 4, '4 nút bật/tắt (âm thanh, nhạc, giọng, hiệu ứng)');
    toggles.forEach((v) => assert.ok(v === 'true' || v === 'false', 'aria-pressed'));
    assert.ok(!(await page.$eval('#menu', (e) => e.querySelector('[onclick]'))), 'không có onclick inline');
    // Tương phản chữ trên nút cam chính (chữ trắng trên #ff6b35 chỉ 2,8:1) và vùng chạm của liên kết chân trang
    const cta = await page.evaluate(() => {
      const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
      const ink = getComputedStyle(document.getElementById('btn-play')).color.match(/\d+/g).map(Number);
      const l1 = lum(ink), l2 = lum([255, 107, 53]);          // var(--orange): điểm tối nhất của nền chuyển sắc
      const a = document.querySelector('.footer-note a').getBoundingClientRect();
      return { ratio: (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05), color: getComputedStyle(document.getElementById('btn-play')).color, linkH: a.height };
    });
    assert.ok(cta.ratio >= 4.5, 'chữ trên nút cam ≥ 4,5:1 – đo được ' + cta.ratio.toFixed(2) + ' với ' + cta.color);
    assert.ok(cta.linkH >= 44, 'liên kết chân trang cao ≥ 44 px: ' + cta.linkH);
    await shot('landscape-menu');
    // Máy đang bật "giảm chuyển động": nút ✨ phải báo đúng mức Ít và bị khóa (cài đặt máy thắng)
    assert.ok(await page.$eval('html', (e) => e.classList.contains('lite-fx')), 'lite-fx trên <html>');
    assert.equal(await hook('X.Motion.lite'), true);
    const fxBtn = await page.$eval('#menu .toggle[data-set="fx"]', (b) => ({ text: b.textContent, pressed: b.getAttribute('aria-pressed'), disabled: b.disabled }));
    assert.equal(fxBtn.text, '✨ Hiệu ứng: Ít (theo cài đặt máy)', 'nút ✨ báo đúng mức đang dùng: ' + fxBtn.text);
    assert.equal(fxBtn.pressed, 'false', 'aria-pressed của nút ✨ khớp trạng thái thật');
    assert.equal(fxBtn.disabled, true, 'nút ✨ bị khóa khi máy ép giảm chuyển động');
    // Máy chưa có giọng Việt: nút 🗣️ nói rõ và bị khóa, không được báo "Bật"
    const voiceBtn = await page.$eval('#menu .toggle[data-set="voice"]', (b) => ({ text: b.textContent, pressed: b.getAttribute('aria-pressed'), disabled: b.disabled }));
    if (!(await page.evaluate(() => !!(window.Voice && window.Voice.available)))) {
      assert.equal(voiceBtn.text, '🗣️ Giọng đọc: chưa có giọng Việt', 'nút 🗣️ khi máy chưa có giọng Việt: ' + voiceBtn.text);
      assert.equal(voiceBtn.pressed, 'false', 'aria-pressed của nút 🗣️ khớp trạng thái thật');
      assert.equal(voiceBtn.disabled, true, 'nút 🗣️ bị khóa khi máy chưa có giọng Việt');
    }
    // Nút đầu tiên là "Âm thanh" – chữ "Hiệu ứng" chỉ dành cho nút ✨
    const soundBtn = await page.$eval('#menu .toggle[data-set="sound"]', (b) => b.textContent);
    assert.ok(soundBtn.indexOf('Âm thanh') >= 0 && soundBtn.indexOf('Hiệu ứng') < 0, 'nút âm thanh: ' + soundBtn);
    await page.click('#btn-play');
    await page.waitForTimeout(300);
    assert.ok(await vis(page, '#levels'), 'màn hình chọn màn');
    assert.ok((await page.$eval('#toast', (e) => e.textContent)).indexOf('Chào Bé') >= 0, 'chào bé theo tên');
    const cards = await page.$$eval('.level-card', (c) => c.map((x) => ({ tab: x.getAttribute('tabindex'), locked: x.classList.contains('locked'), aria: x.getAttribute('aria-label') })));
    assert.equal(cards.length, 8);
    assert.equal(cards[0].tab, '0'); assert.ok(!cards[0].locked && /Màn 1/.test(cards[0].aria));
    assert.equal(cards[1].tab, '-1'); assert.ok(cards[1].locked);
    assert.equal(await page.$eval('.level-card[data-id="L1"] .best', (e) => e.textContent), 'Chưa chơi', 'màn chưa chơi ghi "Chưa chơi" thay cho 🏆 0 (C8)');
    assert.ok(await page.$('#btn-report-levels'));
    assert.ok(await page.$eval('#btn-unlock-all', (e) => e.classList.contains('btn')));
    // Bàn phím: Enter trên thẻ màn mở bài học
    await page.focus('.level-card[data-id="L1"]');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    assert.ok(await vis(page, '#lesson'), 'Enter mở bài học');
    assert.equal(await hook('X.G.state'), 'lesson');
    const cap0 = await page.$eval('#lesson-caption', (e) => e.textContent);
    await page.waitForTimeout(3600);
    assert.equal(await page.$eval('#lesson-caption', (e) => e.textContent), cap0, 'minh họa đứng yên ở ví dụ đầu ≥ 3,5 s (không giọng đọc: 6 s)');
    // C12: chú thích màu kim dưới đồng hồ và tên kim trong bài học mang đúng màu của kim
    const legend = await page.evaluate(() => {
      const cs = (sel) => { const e = document.querySelector(sel); return e ? getComputedStyle(e) : null; };
      const lg = document.querySelector('#lesson .hand-legend');
      const kh = cs('#lesson-text b.kh'), km = cs('#lesson-text b.km');
      const plainEl = document.querySelector('#lesson-text b:not(.kh):not(.km)');
      return {
        text: lg ? lg.textContent.replace(/\s+/g, ' ').trim() : null,
        visible: !!(lg && lg.getBoundingClientRect().height > 0),
        khColor: kh && kh.color, kmColor: km && km.color,
        khUnder: kh && kh.textDecorationColor, kmUnder: km && km.textDecorationColor,
        lines: (kh && kh.textDecorationLine) + '/' + (km && km.textDecorationLine),
        plainWord: plainEl && plainEl.textContent,
        plainColor: plainEl ? getComputedStyle(plainEl).color : null,
        legendKh: cs('#lesson .hand-legend .lg.kh').color, legendKm: cs('#lesson .hand-legend .lg.km').color,
        swatch: Array.prototype.map.call(document.querySelectorAll('#lesson .hand-legend i'), (i) => getComputedStyle(i).backgroundColor)
      };
    });
    assert.ok(legend.visible && /kim ngắn = giờ/.test(legend.text) && /kim dài = phút/.test(legend.text), 'chú thích hai kim: ' + JSON.stringify(legend));
    assert.deepEqual(legend.swatch, ['rgb(17, 138, 178)', 'rgb(255, 107, 53)'], 'ô màu đúng màu kim giờ / kim phút');
    assert.ok(legend.plainWord, 'bài học có chữ in đậm thường để đối chiếu: ' + JSON.stringify(legend));
    // Lỗi cũ: "kim dài" tô đúng màu cam như mọi chữ đậm khác → chẳng ghép được với kim phút cam trên hình
    assert.notEqual(legend.kmColor, legend.plainColor, 'tên "kim dài" phải khác màu chữ đậm thường: ' + JSON.stringify(legend));
    assert.notEqual(legend.khColor, legend.plainColor, 'tên "kim ngắn" phải khác màu chữ đậm thường: ' + JSON.stringify(legend));
    assert.notEqual(legend.khColor, legend.kmColor, 'tên hai kim khác màu nhau: ' + JSON.stringify(legend));
    assert.equal(legend.lines, 'underline/underline', 'tên hai kim được gạch chân: ' + JSON.stringify(legend));
    assert.equal(legend.khUnder, legend.swatch[0], 'gạch chân "kim ngắn" đúng màu kim giờ: ' + JSON.stringify(legend));
    assert.equal(legend.kmUnder, legend.swatch[1], 'gạch chân "kim dài" đúng màu kim phút: ' + JSON.stringify(legend));
    assert.equal(legend.legendKh, legend.khColor, 'chữ chú thích kim giờ cùng màu với tên kim trong bài');
    assert.equal(legend.legendKm, legend.kmColor, 'chữ chú thích kim phút cùng màu với tên kim trong bài');
    await shot('landscape-lesson-L1');
    // A17 (hồi quy): "kém 15" lúc 9 giờ từng bị hộp nhìn của SVG cắt mất chữ đầu
    await hook('X.openLesson(X.K.LEVELS[4], false)');
    await page.waitForTimeout(250);
    const ring = await page.evaluate(() => {
      const svg = document.querySelector('#lesson-clock svg.clock-svg');
      if (!svg) return null;
      const vb = svg.getAttribute('viewBox').split(' ').map(Number);
      const bad = [];
      const all = svg.querySelectorAll('text');
      for (let i = 0; i < all.length; i++) {
        const b = all[i].getBBox();
        if (b.x < vb[0] || b.x + b.width > vb[0] + vb[2] || b.y < vb[1] || b.y + b.height > vb[1] + vb[3]) {
          bad.push({ t: all[i].textContent, x: +b.x.toFixed(1), w: +b.width.toFixed(1) });
        }
      }
      return { n: all.length, kem: svg.textContent.indexOf('kém 15') >= 0, bad: bad };
    });
    assert.ok(ring && ring.n >= 24 && ring.kem, 'bài học màn 5 có vòng "kém": ' + JSON.stringify(ring));
    assert.deepEqual(ring.bad, [], 'nhãn vòng "kém" bị cắt: ' + JSON.stringify(ring.bad));
    // Hộp nhìn rộng hơn không được làm mặt đồng hồ và chữ "kém" nhỏ đi (trước bản nâng cấp: mặt 177 px, chữ 9,7 px)
    const measureRing = (sel) => page.evaluate((s) => {
      const svg = document.querySelector(s);
      if (!svg) return null;
      const vb = svg.getAttribute('viewBox').split(' ').map(Number);
      const w = svg.getBoundingClientRect().width;
      let label = 1e9;
      const all = svg.querySelectorAll('text');
      for (let i = 0; i < all.length; i++) {
        if (all[i].textContent.indexOf('kém') !== 0) continue;
        label = Math.min(label, Number(all[i].getAttribute('font-size')) * w / vb[2]);
      }
      return { w: w, label: label, dial: 208 * w / vb[2] };
    }, sel);
    const lessonRing = await measureRing('#lesson-clock svg.clock-svg.has-ring');
    assert.ok(lessonRing && lessonRing.label >= 11, 'bài học màn 5: chữ "kém" ' + JSON.stringify(lessonRing) + ' (cần ≥ 11 px)');
    assert.ok(lessonRing.dial >= 177, 'bài học màn 5: mặt đồng hồ ' + lessonRing.dial.toFixed(0) + ' px (cần ≥ 177)');
    await shot('landscape-lesson-L5-ring');
    // Khung hỏi đáp của màn 5 cũng vẽ vòng "kém"
    await page.evaluate(() => { const X = window.__ThapDongHo; X.G.review = []; X.startQuiz(); });
    await page.waitForTimeout(250);
    const quizRing = await measureRing('#quiz-clock svg.clock-svg.has-ring');
    assert.ok(quizRing && quizRing.label >= 11, 'hỏi đáp màn 5: chữ "kém" ' + JSON.stringify(quizRing) + ' (cần ≥ 11 px)');
    await shot('landscape-quiz-L5-ring');
    await hook('X.quizExit()');
    await page.waitForTimeout(200);
    assert.ok(await vis(page, '#levels'), 'thoát hỏi đáp về chọn màn');
    await hook('X.goLevels()');
    await page.waitForTimeout(200);

    /* ---- 2. Chơi màn 1: vật lý cột, hết giờ, ôn lại ---- */
    await hook('X.startLevel(X.K.LEVELS[0])');
    assert.ok(await waitPlaying(page), 'đang chơi và có đồng hồ rơi');
    assert.ok(await page.$eval('#btn-pause', (e) => !e.hidden), 'nút tạm dừng hiện khi chơi');
    // A2: đồng hồ không bao giờ xuất hiện ngay ở cột đúng
    const spawnBad = await page.evaluate(() => { const X = window.__ThapDongHo; let bad = 0; for (let i = 0; i < 200; i++) { X.spawnPiece(); if (X.G.piece.col === X.G.piece.target) bad++; } return bad; });
    assert.equal(spawnBad, 0, 'spawn col ≠ target (200 lần)');
    // A1: nhảy sang cột có tháp cao hơn vị trí hiện tại
    const hop = await page.evaluate((stoneSrc) => {
      const X = window.__ThapDongHo, K = X.K, mkStone = eval('(' + stoneSrc + ')');
      X.G.cols[2].stack = [mkStone(K, 901), mkStone(K, 902), mkStone(K, 903)];
      X.spawnPiece();
      const p = X.G.piece; p.col = 1; p.target = 2; p.row = 2.5; p.touched = false;
      const ok = X.moveTo(2);
      const r = { ok: ok, col: p.col, row: p.row, touched: p.touched };
      X.G.cols[2].stack = [];
      return r;
    }, stone);
    assert.ok(hop.ok && hop.col === 2 && hop.row <= 2 && hop.touched, 'moveTo nhảy lên chỗ đáp: ' + JSON.stringify(hop));
    // ◀ ▶ (và phím mũi tên) cũng đi qua được cột cao hơn vị trí hiện tại (không còn "kẹt" trước cột đúng)
    const step = await page.evaluate((stoneSrc) => {
      const X = window.__ThapDongHo, K = X.K, mkStone = eval('(' + stoneSrc + ')');
      X.G.cols[1].stack = [mkStone(K, 911), mkStone(K, 912), mkStone(K, 913), mkStone(K, 914)];
      const p = X.G.piece; p.col = 0; p.row = 4.2;
      const r1 = X.moveRight();
      const a = { col: p.col, row: p.row };
      const r2 = X.moveRight();
      const b = { col: p.col, row: p.row };
      const r3 = X.moveLeft(); const r4 = X.moveLeft(); const r5 = X.moveLeft();
      const c = { col: p.col };
      X.G.cols[1].stack = [];
      return { r1: r1, a: a, r2: r2, b: b, r3: r3, r4: r4, r5: r5, c: c };
    }, stone);
    assert.ok(step.r1 && step.a.col === 1 && step.a.row <= 1 && step.r2 && step.b.col === 2 && step.b.row <= 1 && step.r3 && step.r4 && !step.r5 && step.c.col === 0, 'bước ◀ ▶ qua cột cao: ' + JSON.stringify(step));
    // A19: chip gợi ý không làm đổi bố cục bảng
    const lay = await page.evaluate(() => {
      const X = window.__ThapDongHo, h = document.getElementById('hud-hint');
      h.hidden = true; X.layout(); const a = { y: X.G.board.y, cell: X.G.board.cell };
      X.showHint('Kiểm thử bố cục', 'info', 5000); X.layout(); const b = { y: X.G.board.y, cell: X.G.board.cell };
      const hr = h.getBoundingClientRect();
      return { a: a, b: b, hintBottom: hr.bottom, titleTop: X.G.big.y - X.G.big.cardH / 2 - X.G.big.titleH, frameTop: X.G.board.top - 8 };
    });
    assert.deepEqual(lay.a, lay.b, 'bố cục không đổi khi chip gợi ý hiện');
    assert.ok(lay.hintBottom <= lay.titleTop + 1 && lay.hintBottom <= lay.frameTop + 1, 'chip gợi ý không đè lên tiêu đề/khung: ' + JSON.stringify(lay));
    // A3: thời gian rơi không đổi theo chiều cao tháp
    const fall = await page.evaluate((stoneSrc) => {
      const X = window.__ThapDongHo, K = X.K, mkStone = eval('(' + stoneSrc + ')');
      const measure = function (nStones) {
        X.G.piece = null;
        for (let c = 0; c < 4; c++) X.G.cols[c].stack = [];
        for (let i = 0; i < nStones; i++) X.G.cols[3].stack.push(mkStone(K, 950 + i));
        X.G.nextPieceAt = X.G.time; X.update(0.01);
        const p = X.G.piece; p.col = 3; p.target = 3; p.touched = true; p.x = X.G.board.x + 3 * X.G.board.cell;
        let n = 0;
        while (X.G.piece && X.G.piece.mode === 'fall' && n < 5000) { X.update(0.05); n++; }
        for (let i = 0; i < 20; i++) X.update(0.05);
        return n;
      };
      const a = measure(0), b = measure(4);
      for (let c = 0; c < 4; c++) X.G.cols[c].stack = [];
      return { empty: a, tall: b, fallTime: X.fallTime(), correct: X.G.correct };
    }, stone);
    assert.ok(Math.abs(fall.empty - fall.tall) <= 2 && fall.empty > 100, 'số khung hình rơi bằng nhau: ' + JSON.stringify(fall));
    // Thả sai: dừng 3 s, giải thích, ghi kho ôn lại, hỏi lại ngay
    await page.evaluate(() => { const X = window.__ThapDongHo; X.G.piece = null; X.G.nextPieceAt = X.G.time; X.update(0.01); });
    const wrongBefore = await hook('X.G.wrong');
    missedRead = await playWrong(page);
    const w = await hook('JSON.stringify({ wrong: X.G.wrong, gap: X.G.nextPieceAt - X.G.time, hint: document.getElementById("hud-hint").textContent, hidden: document.getElementById("hud-hint").hidden, missed: Object.keys(X.Store.p().missed), retry: !!X.G.retryT })');
    const wj = JSON.parse(w);
    assert.equal(wj.wrong, wrongBefore + 1);
    assert.ok(wj.gap >= 2.9, 'dừng ≥ 2,9 s sau khi sai: ' + wj.gap);
    assert.ok(!wj.hidden && wj.hint.indexOf(missedRead) >= 0 && wj.hint.indexOf('Kim dài') >= 0, 'giải thích ngắn trên HUD: ' + wj.hint);
    assert.equal(wj.missed.length, 1);
    assert.ok(/^\d+:\d+\|plain$/.test(wj.missed[0]), 'khóa ôn lại ' + wj.missed[0]);
    assert.ok(wj.retry, 'sẽ hỏi lại ngay');
    await assertHintFits(page, 'iPad ngang');
    await shot('landscape-play-wrong');
    assert.ok(await stepUntilPiece(page));
    const nx = JSON.parse(await hook('JSON.stringify({ review: X.G.piece.review, read: X.K.read(X.G.piece.t), tag: document.getElementById("hud-review").hidden })'));
    assert.ok(nx.review && nx.read === missedRead && nx.tag === false, 'đồng hồ kế tiếp là câu ôn lại: ' + JSON.stringify(nx));
    // A2: rơi hết giờ (không chạm) = sai, không cộng điểm
    const to = JSON.parse(await hook('(function () { const p = X.G.piece, s = X.G.score; p.row = p.land; X.landPiece(p); return JSON.stringify({ timeouts: X.G.timeouts, wrong: X.G.wrong, score: X.G.score - s, piece: !!X.G.piece }); })()'));
    assert.equal(to.timeouts, 1); assert.equal(to.wrong, wrongBefore + 2); assert.equal(to.score, 0); assert.ok(!to.piece);
    // C2: nút 💡 gợi ý theo yêu cầu (chạm và phím H), thả đúng sau gợi ý được 50 điểm, không tính chuỗi
    assert.ok(await page.$('#controls button[data-act="hint"]'), 'có nút 💡 trong cụm điều khiển');
    const keys = await page.$$eval('#controls .k', (ks) => ks.map((k) => { const b = k.getBoundingClientRect(); return { act: k.getAttribute('data-act'), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; }));
    assert.equal(keys.length, 4, 'bốn phím điều khiển');
    keys.forEach((k) => {
      assert.ok(k.w >= 44 && k.h >= 44, 'vùng chạm ≥ 44 px: ' + JSON.stringify(k));
      assert.equal(k.y, keys[0].y, 'các phím nằm cùng một hàng: ' + JSON.stringify(keys));
    });
    // đồng hồ mới, chưa có gợi ý tự động (sau 2 lần sai) để đo đúng nhánh "xin gợi ý"
    await page.evaluate(() => { const X = window.__ThapDongHo; X.G.wrongRun = 0; X.G.piece = null; X.G.nextPieceAt = X.G.time; X.update(0.01); });
    assert.ok(await stepUntilPiece(page));
    assert.equal(await hook('X.G.piece.hint'), false, 'chưa có gợi ý tự động');
    await page.keyboard.press('h');
    const lit = JSON.parse(await hook('JSON.stringify({ hint: X.G.piece.hint, asked: X.G.piece.asked, cols: X.G.cols.map(function (c) { return c.hint; }), target: X.G.piece.target })'));
    assert.ok(lit.hint && lit.asked && lit.cols[lit.target] && lit.cols.filter(Boolean).length === 1, 'phím H làm cột đúng nhấp nháy: ' + JSON.stringify(lit));
    const hintScore = await page.evaluate(() => {
      const X = window.__ThapDongHo, p = X.G.piece, before = X.G.score;
      X.G.streak = 2;
      X.moveTo(p.target); X.hardDrop();
      for (let i = 0; i < 80 && X.G.piece; i++) X.update(0.05);
      return { gain: X.G.score - before, streak: X.G.streak };
    });
    assert.equal(hintScore.gain, 20, 'thả đúng sau khi XIN gợi ý: 20 điểm');
    assert.equal(hintScore.streak, 0, 'gợi ý theo yêu cầu không tính chuỗi combo');
    // Gợi ý TỰ ĐỘNG (bé đang sai liên tiếp) không được ít điểm hơn khi bé chủ động xin
    const autoHint = await page.evaluate(() => {
      const X = window.__ThapDongHo;
      X.G.wrongRun = 2; X.G.piece = null; X.G.nextPieceAt = X.G.time; X.update(0.01);
      for (let i = 0; i < 120 && !X.G.piece; i++) X.update(0.05);
      const p = X.G.piece, before = X.G.score;
      const flags = { hint: p.hint, asked: p.asked };
      X.moveTo(p.target); X.hardDrop();
      for (let i = 0; i < 80 && X.G.piece; i++) X.update(0.05);
      return { flags: flags, gain: X.G.score - before };
    });
    assert.ok(autoHint.flags.hint && !autoHint.flags.asked, 'sau 2 lần sai: gợi ý tự động');
    assert.equal(autoHint.gain, 50, 'gợi ý tự động: 50 điểm (không ít hơn khi tự xin)');
    // C6: chip combo đếm tiến trình 1/3 → 2/3 → ×2, và thưởng ⚡ nhanh hiện thành chữ bay riêng
    const combo = await page.evaluate(() => {
      const X = window.__ThapDongHo;
      X.G.wrongRun = 0; X.G.streak = 0; X.G.correct = 0; X.G.texts.length = 0;
      X.G.piece = null; X.G.nextPieceAt = X.G.time; X.update(0.01);
      for (let i = 0; i < 120 && !X.G.piece; i++) X.update(0.05);
      const chips = [], speed = [];
      for (let k = 0; k < 3; k++) {
        const p = X.G.piece;
        p.hint = false; p.asked = false; p.born = X.G.time;      // thả nhanh → có thưởng ⚡
        X.G.texts.length = 0;
        X.moveTo(p.target); X.hardDrop();
        for (let i = 0; i < 200 && X.G.piece && X.G.piece.mode !== 'pop'; i++) X.update(0.02);   // 'hard' → rơi tới nơi → 'pop'
        const fast = X.G.texts.filter((t) => t.text.indexOf('⚡ nhanh') >= 0);
        speed.push({ n: fast.length, text: fast[0] ? fast[0].text : null, wait: fast[0] ? fast[0].wait > 0 : null });
        for (let i = 0; i < 80 && X.G.piece; i++) X.update(0.05);
        const el = document.getElementById('hud-combo');
        chips.push({ text: el.textContent, hidden: el.hidden, warm: el.classList.contains('warm') });
        for (let i = 0; i < 120 && !X.G.piece; i++) X.update(0.05);
      }
      return { chips: chips, speed: speed };
    });
    assert.deepEqual(combo.chips.map((c) => c.text), ['Combo 1/3 🔥', 'Combo 2/3 🔥', 'Combo x2 🔥'], 'chip combo đếm tiến trình: ' + JSON.stringify(combo.chips));
    combo.chips.forEach((c) => assert.equal(c.hidden, false, 'chip combo hiện ngay từ lần đúng đầu tiên'));
    assert.deepEqual(combo.chips.map((c) => c.warm), [true, true, false], 'chip nhạt khi đang gom, cháy khi đạt ×2');
    combo.speed.forEach((s) => {
      assert.equal(s.n, 1, 'mỗi lần thả nhanh sinh đúng một chữ thưởng: ' + JSON.stringify(combo.speed));
      assert.equal(s.text, '+50 ⚡ nhanh!', 'nội dung chữ thưởng nhanh: ' + JSON.stringify(combo.speed));
      assert.equal(s.wait, true, 'chữ thưởng nhanh chờ 0,4 s để không đè lên lời khen');
    });
    // C13: pháo giấy DOM nằm trên lớp phủ mờ (tắt hẳn khi bé chọn "Hiệu ứng: Ít" / hệ thống giảm chuyển động)
    const fx = await page.evaluate(() => {
      const X = window.__ThapDongHo, layer = document.getElementById('fx');
      X.domConfetti(40);
      const lite = layer.children.length;
      const was = X.Motion.lite;
      X.Motion.lite = false;
      X.domConfetti(40);
      const full = layer.children.length;
      const z = Number(getComputedStyle(layer).zIndex), dz = Number(getComputedStyle(document.getElementById('summary')).zIndex);
      X.Motion.lite = was;
      layer.innerHTML = '';
      return { lite: lite, full: full, z: z, dz: dz };
    });
    assert.equal(fx.lite, 0, 'Hiệu ứng: Ít → không có pháo giấy DOM');
    assert.equal(fx.full, 40, 'pháo giấy DOM: 40 mảnh');
    assert.ok(fx.z > fx.dz, 'lớp pháo giấy nằm trên lớp phủ mờ (' + fx.z + ' > ' + fx.dz + ')');

    /* ---- 3. Chơi đúng tới hết màn → tổng kết → hỏi đáp ---- */
    const done = await playCorrect(page);
    assert.equal(done.state, 'clear', 'hoàn thành màn: ' + JSON.stringify(done));
    await page.evaluate(() => { const X = window.__ThapDongHo; for (let i = 0; i < 30; i++) X.update(0.1); });
    await page.waitForTimeout(300);
    assert.ok(await vis(page, '#summary'), 'màn hình tổng kết');
    assert.equal(await hook('X.G.piece'), null, 'không còn đồng hồ đứng hình');
    assert.equal(await page.$eval('#st-correct', (e) => e.textContent), '8');
    assert.ok(await page.$('#btn-sum-replay'));
    // C5: ngưỡng 2 sao theo độ dài màn, có ghi rõ trên màn hình tổng kết
    const note = await page.$eval('#sum-note', (e) => e.textContent);
    assert.ok(note.indexOf('sai không quá 2 lần') >= 0, 'ghi ngưỡng 2 sao của màn 1 (8 câu): ' + note);
    assert.deepEqual(await hook('JSON.stringify([X.starsFor(0, 8), X.starsFor(2, 8), X.starsFor(3, 8), X.starsFor(3, 15)])'), '[3,2,1,2]', 'màn dài được sai nhiều hơn (C5)');
    const st = JSON.parse(await hook('JSON.stringify({ lv: X.Store.p().levels.L1, st: X.Store.p().stats })'));
    assert.equal(st.lv.done, 1); assert.ok(st.lv.best > 0);
    assert.equal(st.st.plays, 1); assert.equal(st.st.byTopic.L1.c, 8); assert.ok(st.st.byTopic.L1.w >= 2); assert.equal(st.st.byTopic.L1.t, 1); assert.ok(st.st.seconds > 0);
    await shot('landscape-summary');
    // C11: thẻ ôn lại – đồng hồ to hơn, chạm để nghe VÀ mở lời giải thích ngắn
    assert.ok((await page.$eval('#review h3', (e) => e.textContent)).indexOf('Cần ôn lại') >= 0, 'mục "Cần ôn lại" trên màn hình tổng kết');
    const rvBefore = await page.evaluate(() => {
      const it = document.querySelector('#review-list .review-item');
      if (!it) return null;
      const svg = it.querySelector('svg.clock-svg'), why = it.querySelector('.rv-why');
      return { w: Math.round(svg.getBoundingClientRect().width), whyHidden: why.hidden, why: why.textContent, exp: it.getAttribute('aria-expanded'), text: it.querySelector('.rv-text').textContent };
    });
    assert.ok(rvBefore, 'có ít nhất một thẻ ôn lại');
    assert.ok(rvBefore.w >= 100, 'đồng hồ trên thẻ ôn lại ' + rvBefore.w + ' px (trước là 84)');
    assert.ok(rvBefore.whyHidden && /Kim dài/.test(rvBefore.why), 'lời giải thích ẩn sẵn: ' + JSON.stringify(rvBefore));
    await page.click('#review-list .review-item');
    await page.waitForTimeout(150);
    const rvAfter = await page.evaluate(() => {
      const it = document.querySelector('#review-list .review-item');
      return { whyHidden: it.querySelector('.rv-why').hidden, exp: it.getAttribute('aria-expanded'), spk: it.classList.contains('speaking') };
    });
    assert.ok(!rvAfter.whyHidden && rvAfter.exp === 'true' && rvAfter.spk, 'chạm vào thẻ mở lời giải thích: ' + JSON.stringify(rvAfter));
    await shot('landscape-summary-review');
    await page.click('#btn-quiz');
    await page.waitForTimeout(300);
    assert.ok(await vis(page, '#quiz'), 'hỏi đáp');
    // C12: chú thích hai kim cũng có ở khung hỏi đáp, chỉ hiện khi câu hỏi có đồng hồ
    const qLeg = await page.evaluate(() => {
      const X = window.__ThapDongHo, lg = document.getElementById('quiz-legend');
      const withClock = { hidden: lg.hidden, clock: !!X.G.quiz.qs[X.G.quiz.i].clock };
      const save = X.G.quiz.qs[X.G.quiz.i];
      X.G.quiz.qs[X.G.quiz.i] = { q: 'Kim ngắn là kim gì?', choices: ['Kim giờ', 'Kim phút', 'Kim giây'], explain: 'Kim ngắn là kim giờ.' };
      X.quizRetry();
      const noClock = { hidden: document.getElementById('quiz-legend').hidden };
      X.G.quiz.qs[X.G.quiz.i] = save;
      X.quizRetry();
      return { withClock: withClock, noClock: noClock };
    });
    assert.ok(qLeg.withClock.clock && !qLeg.withClock.hidden, 'câu đọc đồng hồ có chú thích kim: ' + JSON.stringify(qLeg));
    assert.ok(qLeg.noClock.hidden, 'câu kiến thức (không có đồng hồ) thì ẩn chú thích kim');
    assert.ok(await page.$('#btn-quiz-exit'));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    assert.ok(await vis(page, '#levels'), 'Escape thoát hỏi đáp về chọn màn');
    assert.equal(await hook('X.Store.p().unlocked'), 1, 'chưa mở khóa');
    await page.evaluate(() => { const X = window.__ThapDongHo; X.G.level = X.K.LEVELS[0]; X.startQuiz(); });
    await page.waitForTimeout(200);
    assert.ok(await vis(page, '#quiz'));
    const qOrder = await page.$$eval('#quiz-choices .choice', (b) => b.map((x) => x.getAttribute('data-text')));
    assert.deepEqual(await hook('X.G.quiz.order.map(function (o) { return o.text; })'), qOrder, 'thứ tự đọc = thứ tự hiển thị');
    const key0 = await hook('X.K.key(X.G.quiz.qs[0].clock, "24")');
    await hook('X.quizAnswer("zzz")');
    assert.ok(await page.$('.choice.reveal'), 'sai → đáp án đúng được đánh dấu');
    assert.ok(await page.$('#btn-quiz-retry:not([hidden])'));
    let changed = false;
    for (let i = 0; i < 5 && !changed; i++) { await hook('X.quizRetry()'); changed = (await hook('X.K.key(X.G.quiz.qs[0].clock, "24")')) !== key0; }
    assert.ok(changed, 'thử lại → đồng hồ mới');
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => { const X = window.__ThapDongHo, Qz = X.G.quiz; X.quizAnswer(Qz.qs[Qz.i].choices[0]); });
      assert.ok(await page.$('.choice.ok'));
      await hook('X.quizNext()');
    }
    await page.waitForTimeout(200);
    assert.ok(await vis(page, '#quiz-done'), 'hoàn thành hỏi đáp');
    assert.equal(await hook('X.Store.p().unlocked'), 2, 'mở khóa màn 2');
    await shot('landscape-quiz-done');
    // Thoát hỏi đáp rồi lỡ gọi tiếp: không được ném lỗi, luôn có đường về chọn màn
    await page.evaluate(() => { const X = window.__ThapDongHo; X.quizExit(); X.quizNext(); X.quizDone(); X.startQuiz(); X.quizNext(); });
    await page.waitForTimeout(200);
    assert.ok(await vis(page, '#levels'), 'hỏi đáp cũ không còn treo lại');
    assert.equal(await hook('X.G.quiz'), null, 'ván hỏi đáp được dọn khi rời màn chơi');
    // C3: đổ tháp ≥ 2 lần → nút 🐢 "Chơi chậm hơn" (rơi lâu hơn 40 %, gợi ý ngay sau một lần sai)
    await page.evaluate(() => {
      const X = window.__ThapDongHo;
      X.Store.setRec('L1', { fails: 1 });
      X.G.level = X.K.LEVELS[0]; X.G.slow = false; X.G.resultSaved = false;
      X.showFail();
    });
    await page.waitForTimeout(300);
    assert.ok(await vis(page, '#btn-fail-slow'), 'nút 🐢 hiện trên màn hình tháp đổ');
    await shot('landscape-fail-slow');
    const slow = await page.evaluate(() => {
      const X = window.__ThapDongHo, L1 = X.K.LEVELS[0];
      const shown = !document.getElementById('btn-fail-slow').hidden;
      X.startLevel(L1);
      const normal = X.fallTime(), flagOff = X.G.slow;
      X.startLevel(L1, { slow: true });
      X.G.wrongRun = 1; X.spawnPiece();
      return { shown: shown, normal: normal, slow: X.fallTime(), flagOff: flagOff, flagOn: X.G.slow, hint: X.G.piece.hint, chip: document.getElementById('hud-level').textContent };
    });
    assert.ok(slow.shown, 'nút 🐢 hiện sau 2 lần đổ tháp');
    assert.ok(!slow.flagOff && slow.flagOn, 'cờ chậm chỉ bật khi được yêu cầu');
    assert.ok(Math.abs(slow.slow / slow.normal - 1.4) < 0.01, 'chế độ chậm: thời gian rơi ×1,4 (' + slow.normal.toFixed(2) + ' → ' + slow.slow.toFixed(2) + ')');
    assert.ok(slow.hint, 'chế độ chậm: gợi ý ngay sau một lần sai');
    assert.ok(slow.chip.indexOf('🐢') >= 0, 'HUD báo đang ở chế độ chậm: ' + slow.chip);
    await page.waitForTimeout(200);
    await shot('landscape-play-slow');
    // Ngõ cụt: thua TRONG chế độ chậm thì nút 🐢 vẫn còn và "🔄 Thử lại" không âm thầm quay về tốc độ thường
    await page.evaluate(() => { const X = window.__ThapDongHo; X.G.resultSaved = false; X.showFail(); });
    await page.waitForTimeout(300);
    assert.ok(await vis(page, '#btn-fail-slow'), 'đang chơi chậm mà tháp vẫn đổ: nút 🐢 không được biến mất');
    assert.equal(await page.$eval('#btn-fail-slow', (e) => e.textContent), '🐢 Vẫn chơi chậm');
    await page.click('#btn-fail-retry');
    await page.waitForTimeout(300);
    assert.equal(await hook('X.G.slow'), true, '"Thử lại" giữ nguyên chế độ chậm');
    assert.ok((await page.$eval('#hud-level', (e) => e.textContent)).indexOf('🐢') >= 0, 'HUD vẫn báo 🐢 sau khi thử lại');
    // Xem lại bài học rồi chơi tiếp cũng giữ chế độ chậm; chọn màn khác thì trở lại tốc độ thường
    const keep = await page.evaluate(() => {
      const X = window.__ThapDongHo;
      X.openLesson(X.K.LEVELS[0], false);
      X.startLevel(X.G.level);                      // ▶ Bắt đầu chơi từ bài học
      const afterLesson = X.G.slow;
      X.startLevel(X.K.LEVELS[1]);
      return { afterLesson: afterLesson, other: X.G.slow };
    });
    assert.ok(keep.afterLesson && !keep.other, 'chế độ chậm bám theo màn đang tập: ' + JSON.stringify(keep));

    /* ---- 4. Xoay màn hình, màn 5 và màn 7 (nhãn buổi dưới mặt đồng hồ) ---- */
    await hook('X.startLevel(X.K.LEVELS[4])');
    await page.setViewportSize(PORT);
    await page.waitForTimeout(700);
    assert.equal(await hook('X.G.landscape'), false);
    assert.ok(await hook('X.G.board.x + X.G.board.w <= 820 && X.G.board.x >= 0'));
    assert.ok(await waitPlaying(page));
    const bgSame = await hook('(function () { const bg = X.G.bg; X.resize(); X.resize(); return X.G.bg === bg; })()');
    assert.ok(bgSame, 'resize() cùng kích thước không dựng lại nền');
    // C14: máy tính bảng dựng đứng – hàng HUD chỉ một dòng khi hiện ĐỦ 5 chip
    // (điểm, màn, ⏩ tốc độ, 📝 ôn lại, combo) – trạng thái thật khi một đồng hồ ôn lại rơi giữa chuỗi đúng.
    const hudRow = await page.evaluate(() => {
      const X = window.__ThapDongHo;
      X.G.streak = 6; X.G.correct = 5; X.G.piece.review = true; X.syncHud();
      const chips = Array.prototype.filter.call(document.querySelectorAll('#hud .hud-left > *'), (e) => !e.hidden);
      const left = document.querySelector('#hud .hud-left').getBoundingClientRect();
      const box = document.querySelector('#hud .score-box').getBoundingClientRect();
      const prog = document.querySelector('#hud .progress').getBoundingClientRect();
      return {
        chips: chips.map((e) => e.textContent.replace(/\s+/g, ' ').trim()),
        wrap: getComputedStyle(document.querySelector('#hud .hud-left')).flexWrap,
        // mép phải của chip xa nhất, KHÔNG phải của khung (khung có thể bị ép hẹp còn chip thì tràn ra)
        chipRight: Math.round(Math.max.apply(null, chips.map((e) => e.getBoundingClientRect().right))),
        leftRight: Math.round(left.right), progLeft: Math.round(prog.left),
        h: Math.round(left.height), box: Math.round(box.height)
      };
    });
    assert.equal(hudRow.chips.length, 5, 'hiện đủ 5 chip HUD: ' + JSON.stringify(hudRow));
    assert.equal(hudRow.wrap, 'nowrap', 'hàng chip HUD không được xuống dòng trên máy tính bảng');
    assert.ok(hudRow.h <= hudRow.box * 1.35, 'HUD trái nằm gọn một dòng: cao ' + hudRow.h + ' px so với ô điểm ' + hudRow.box + ' px ' + JSON.stringify(hudRow));
    assert.ok(hudRow.chipRight <= hudRow.progLeft, 'chip bên trái không chồng lên thanh tiến độ: ' + JSON.stringify(hudRow));
    await shot('portrait-hud-5-chips');
    await playWrong(page);
    await page.waitForTimeout(150);
    // Trường hợp xấu nhất: lời giải thích dài + đủ 5 chip → chip gợi ý vẫn không đè lên tiêu đề đồng hồ lớn
    const worst = await page.evaluate(() => {
      const X = window.__ThapDongHo;
      X.G.streak = 6; X.G.correct = 5; X.syncHud();
      document.getElementById('hud-review').hidden = false;      // chip 📝 của đồng hồ ôn lại
      return { h: Math.round(document.querySelector('#hud .hud-left').getBoundingClientRect().height), box: Math.round(document.querySelector('#hud .score-box').getBoundingClientRect().height) };
    });
    assert.ok(worst.h <= worst.box * 1.35, 'sau khi thả sai, hàng chip vẫn một dòng: ' + JSON.stringify(worst));
    await assertHintFits(page, 'máy tính bảng dựng đứng, đủ 5 chip');
    await shot('portrait-L5');
    await page.evaluate(() => { document.getElementById('hud-review').hidden = true; });
    // Tổng kết và menu ở máy tính bảng dựng đứng (không ghi lại kết quả để không ảnh hưởng các phép thử sau)
    await page.evaluate(() => { const X = window.__ThapDongHo; X.G.resultSaved = true; X.showSummary(); });
    await page.waitForTimeout(400);
    assert.ok(await vis(page, '#summary'), 'tổng kết ở máy tính bảng dựng đứng');
    await shot('portrait-summary');
    await hook('X.goMenu()');
    await page.waitForTimeout(400);
    assert.ok(await vis(page, '#menu'));
    await shot('portrait-menu');
    await page.setViewportSize(LAND);
    await page.waitForTimeout(700);
    assert.equal(await hook('X.G.landscape'), true);
    await hook('X.startLevel(X.K.LEVELS[6])');
    assert.ok(await waitPlaying(page));
    await page.evaluate(() => { const X = window.__ThapDongHo; X.G.piece.t = X.K.mk24(18, 0, 7); X.G.piece.row = 1.5; X.render(); });
    await page.waitForTimeout(100);
    await shot('landscape-L7-18h');

    /* ---- 5. Báo cáo ---- */
    await hook('X.goLevels()');
    await page.evaluate(() => { const X = window.__ThapDongHo; X.Store.noteMissed('7:45|kem', { h: 7, m: 45, style: 'kem', h24: null, lv: 5 }); });
    await page.click('#btn-report-levels');
    await page.waitForTimeout(300);
    assert.ok(await vis(page, '#report'), 'báo cáo');
    assert.ok((await page.$eval('#report-title', (e) => e.textContent)).indexOf('Bé') >= 0);
    assert.ok((await page.$$eval('#report-levels .report-row', (r) => r.length)) >= 8);
    const rv = await page.$eval('#report-review', (e) => e.textContent);
    assert.ok(rv.indexOf('8 giờ kém 15 phút') >= 0 && rv.indexOf('7 giờ 45 phút') >= 0, 'kho ôn lại hiện cách đọc: ' + rv);
    assert.ok(await page.$('#report-review svg.clock-svg'));
    assert.ok((await page.$eval('#report-stats', (e) => e.textContent)).indexOf('ván đã chơi') >= 0);
    // Bốn ô thống kê giống hệt năm game kia: ván đã chơi · trả lời đúng · phút luyện tập · sao dạng n/24
    const stats = await page.$$eval('#report-stats .report-stat', (ds) => ds.map((d) => ({ v: d.querySelector('.v').textContent, k: d.querySelector('.k').textContent })));
    assert.deepEqual(stats.map((x) => x.k), ['ván đã chơi', 'trả lời đúng', 'phút luyện tập', 'sao'], 'nhãn 4 ô thống kê: ' + JSON.stringify(stats));
    assert.ok(/^\d+$/.test(stats[2].v), 'thời gian luyện tập ghi theo phút tròn: ' + stats[2].v);
    assert.ok(/^\d+\/24$/.test(stats[3].v), 'ô sao ghi dạng n/24: ' + stats[3].v);
    // Dòng tóm tắt và huy hiệu từng dòng luôn đi cùng nhau (cùng một quy tắc)
    const weak0 = await page.evaluate(() => ({ hidden: document.getElementById('report-weak').hidden, badges: document.querySelectorAll('#report-levels .weak').length }));
    assert.equal(weak0.hidden, weak0.badges === 0, 'dòng "Cần luyện thêm" ẩn/hiện đúng theo số màn yếu: ' + JSON.stringify(weak0));
    // ⚠️ "Cần luyện thêm" chỉ dành cho màn thật sự yếu (đúng < 70 % trên ≥ 5 câu), không phải màn đúng 89 %
    await page.evaluate(() => {
      const X = window.__ThapDongHo, s = X.Store.p().stats;
      s.byTopic.L2 = { c: 16, w: 2, t: 0, plays: 2, cleared: 2 };
      s.byTopic.L3 = { c: 10, w: 8, t: 0, plays: 2, cleared: 0 };
      X.Store.save(); X.renderReport();
    });
    const rows = await page.$$eval('#report-levels .report-row', (r) => r.map((x) => x.textContent.replace(/\s+/g, ' ')));
    assert.ok(!/Cần luyện thêm/.test(rows[1]), 'đúng 89 % không phải "cần luyện thêm": ' + rows[1]);
    assert.ok(/⚠️ Cần luyện thêm/.test(rows[2]), 'đúng 56 % thì phải nhắc phụ huynh: ' + rows[2]);
    const weakLine = await page.$eval('#report-weak', (e) => ({ text: e.textContent, hidden: e.hidden }));
    assert.equal(weakLine.hidden, false, 'có màn yếu thì hiện dòng "Cần luyện thêm"');
    assert.ok(/^Cần luyện thêm: /.test(weakLine.text) && weakLine.text.indexOf('Màn 3') >= 0 && weakLine.text.indexOf('Màn 2') < 0,
      'dòng tóm tắt chỉ nêu màn yếu: ' + weakLine.text);
    // Tiêu đề mục ôn lại và nút xóa tiến trình dùng đúng một cách nói ở cả sáu game
    assert.equal(await page.$eval('#report-review-h', (e) => e.textContent), '📝 Cần ôn lại');
    assert.equal(await page.$eval('#btn-report-reset', (e) => e.textContent), '🗑 Xóa tiến trình của Bé');
    await shot('landscape-report');
    await page.click('#btn-report-back');
    await page.waitForTimeout(300);
    assert.ok(await vis(page, '#levels'));

    /* ---- 6. Đổi người chơi: tiến trình tách riêng ---- */
    await hook('X.goMenu()');
    await page.click('#btn-player');
    await page.waitForTimeout(300);
    assert.ok(await vis(page, '#players'), 'màn hình người chơi');
    assert.ok(await page.$eval('#btn-player-remove', (e) => e.disabled), 'không xóa được người chơi duy nhất');
    // Nút vô hiệu hóa phải nhìn thấy rõ là không bấm được (trước đây giống hệt nút bình thường)
    const rm = await page.evaluate(() => {
      const b = document.getElementById('btn-player-remove'), o = document.getElementById('btn-player-rename');
      return { aria: b.getAttribute('aria-disabled'), op: Number(getComputedStyle(b).opacity), otherOp: Number(getComputedStyle(o).opacity), shadow: getComputedStyle(b).boxShadow };
    });
    assert.equal(rm.aria, 'true', 'aria-disabled trên nút xóa');
    assert.ok(rm.op <= 0.5 && rm.otherOp >= 0.9, 'nút xóa mờ hơn nút bên cạnh: ' + JSON.stringify(rm));
    assert.equal(rm.shadow, 'none', 'nút xóa bỏ bóng nổi');
    await shot('landscape-players-one');
    await page.click('#btn-player-add');
    assert.ok(await vis(page, '#player-form'));
    await page.fill('#player-name', 'Mai');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    assert.ok((await page.$eval('#btn-player .pl-name', (e) => e.textContent)) === 'Mai', 'chip đổi sang Mai');
    assert.equal(await hook('X.Store.p().unlocked'), 1);
    assert.deepEqual(await hook('Object.keys(X.Store.p().levels)'), []);
    assert.equal(await hook('X.Store.data.players.p1.levels.L1.done'), 1, 'tiến trình của Bé còn nguyên');
    assert.equal((await page.$$eval('.player-item', (b) => b.length)), 2);
    assert.equal(await page.$eval('#btn-player-remove', (e) => e.getAttribute('aria-disabled')), 'false', 'có 2 bạn thì xóa được');
    assert.ok(await page.$eval('#btn-player-remove', (e) => Number(getComputedStyle(e).opacity) >= 0.9));
    await shot('landscape-players');
    await page.click('.player-item[data-id="p1"]');
    await page.waitForTimeout(200);
    assert.equal(await hook('X.Players.active().id'), 'p1');
    assert.equal(await hook('X.Store.p().unlocked'), 2);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    assert.ok(await vis(page, '#menu'), 'Escape đóng màn hình người chơi');
    await page.click('#btn-play');
    await page.waitForTimeout(300);
    assert.equal(await page.$$eval('.level-card:not(.locked)', (c) => c.length), 2, 'Bé có 2 màn đã mở');

    /* ---- 7. Cổng phụ huynh ---- */
    await page.click('#btn-unlock-all');
    await page.waitForTimeout(200);
    assert.ok(await vis(page, '#parent-gate'), 'cổng phụ huynh trong trang');
    const q = await page.$eval('#parent-gate-q', (e) => e.textContent);
    const m = /(\d+) × (\d+)/.exec(q);
    assert.ok(m, 'câu hỏi nhân: ' + q);
    await page.fill('#parent-gate-input', '1');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    assert.ok(await vis(page, '#parent-gate'), 'sai → vẫn ở cổng');
    assert.equal(await hook('X.Store.p().unlocked'), 2);
    await page.fill('#parent-gate-input', String(Number(m[1]) * Number(m[2])));
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    assert.ok(!(await vis(page, '#parent-gate')));
    assert.equal(await hook('X.Store.p().unlocked'), 8, 'mở khóa tất cả');
    assert.equal(await page.$$eval('.level-card:not(.locked)', (c) => c.length), 8);
    // Escape đóng cổng
    await page.click('#btn-unlock-all');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    assert.ok(!(await vis(page, '#parent-gate')));

    /* ---- 7b. Danh hiệu 👑 Vua Xem Giờ và huy hiệu ✅ Đã thuộc ---- */
    await page.evaluate(() => {
      const X = window.__ThapDongHo;
      X.Store.p().badge = false;
      X.Store.p().stats.byTopic.L1 = { c: 19, w: 1, t: 0, plays: 3, cleared: 3 };   // 95 % trên 20 câu → Đã thuộc
      X.Store.p().stats.byTopic.L4 = { c: 3, w: 6, t: 0, plays: 1, cleared: 0 };   // yếu nhất: chỉ đúng 33 %
      X.Store.save();
      X.G.level = X.K.LEVELS[7];
      X.G.quiz = { qs: [{}, {}, {}], i: 2, firstTry: 3, wrongOnThis: false, done: false };
      X.quizDone();
    });
    await page.waitForTimeout(200);
    assert.equal(await hook('X.Store.p().badge'), true, 'hoàn thành hỏi đáp màn 8 → danh hiệu được lưu');
    assert.equal(await hook('X.G.celebrateBadge'), true, 'sẽ chúc mừng ở màn hình chọn màn');
    await hook('X.goLevels()');
    await page.waitForTimeout(300);
    const crown = await page.evaluate(() => ({
      toast: document.getElementById('toast').textContent,
      crown: !!document.querySelector('.level-card[data-id="L8"] .crown'),
      mastered: !!document.querySelector('.level-card[data-id="L1"] .mastered'),
      notMastered: !!document.querySelector('.level-card[data-id="L4"] .mastered'),
      again: window.__ThapDongHo.G.celebrateBadge
    }));
    assert.ok(crown.toast.indexOf('Vua Xem Giờ') >= 0, 'chúc mừng danh hiệu: ' + crown.toast);
    assert.ok(crown.crown, '👑 trên thẻ Siêu Tháp');
    assert.ok(crown.mastered && !crown.notMastered, 'huy hiệu "Đã thuộc" chỉ cho màn đúng ≥ 90 % trên ≥ 20 câu: ' + JSON.stringify(crown));
    assert.equal(crown.again, false, 'chỉ chúc mừng một lần');
    assert.equal(await hook('X.mastered("L1") && !X.mastered("L4")'), true);
    await shot('landscape-levels-crown');
    // Bài tổng kết (Siêu Tháp) lấy câu kiến thức của phần khó, ưu tiên màn bé còn yếu nhất (C10)
    assert.equal(await hook('X.weakestLevelN()'), 4, 'màn 4 đang yếu nhất (đúng 56 %)');

    /* ---- 8. Bắt lỗi toàn cục ---- */
    await hook('X.startLevel(X.K.LEVELS[0])');
    await page.waitForTimeout(300);
    await page.evaluate(() => setTimeout(() => { throw new Error('e2e-test'); }, 0));
    await page.waitForTimeout(400);
    assert.ok((await page.$eval('#toast', (e) => e.textContent)).indexOf('Có lỗi nhỏ') >= 0, 'toast lỗi thân thiện');
    assert.equal(await hook('X.G.state'), 'menu', 'ván đang chơi được kết thúc an toàn về menu');

    /* ---- 9. Hiệu năng với 12 viên đá (màn 8) ---- */
    await hook('X.startLevel(X.K.LEVELS[7])');
    assert.ok(await waitPlaying(page));
    await page.evaluate((stoneSrc) => {
      const X = window.__ThapDongHo, K = X.K, mkStone = eval('(' + stoneSrc + ')');
      let id = 1000;
      for (let c = 0; c < 4; c++) for (let j = 0; j < 3; j++) X.G.cols[c].stack.push(mkStone(K, ++id));
      X.G.piece.touched = true; X.G.piece.row = 0.5;
    }, stone);
    await page.waitForTimeout(4000);
    const perf = await hook('X.G.perf');
    console.log('PERF (12 viên đá, màn 8, 1180×820):', JSON.stringify({ avgUpdate: +perf.avgUpdate.toFixed(3), avgRender: +perf.avgRender.toFixed(3), avgFrame: +perf.avgFrame.toFixed(3) }));
    assert.ok(perf.avgFrame > 0 && perf.avgFrame < 8, 'khung hình < 8 ms');
    await shot('landscape-L8-stones');
  }, { viewport: LAND, reducedMotion: 'reduce' });
  // Lỗi cố ý ném ra để thử bộ bắt lỗi
  log.pageErrors = log.pageErrors.filter((e) => e.indexOf('e2e-test') < 0);
  log.errors = log.errors.filter((e) => e.indexOf('e2e-test') < 0);
  return assertClean(log, 'run 1 – iPad ngang');
}

async function run2() {
  const legacy = { sound: true, music: false, voice: true, unlocked: 3, levels: { L1: { best: 1200, stars: 3, done: 2 }, L2: { best: '1e309', stars: 99, done: 'x' } } };
  const log = await withGame('thap-dong-ho', async ({ page, hook, shot }) => {
    const d = JSON.parse(await hook('JSON.stringify(X.Store.data)'));
    assert.equal(d.music, false);
    assert.equal(d.unlocked, undefined); assert.equal(d.levels, undefined);
    assert.equal(d.players.p1.unlocked, 3);
    assert.equal(d.players.p1.levels.L1.best, 1200);
    assert.deepEqual(d.players.p1.levels.L2, { best: 0, stars: 3, done: 0, fails: 0 });
    assert.deepEqual(d.players.p1.missed, {});
    assert.equal(d.players.p1.stats.plays, 0);
    const saved = JSON.parse(await page.evaluate(() => localStorage.getItem('thap-dong-ho-v1')));
    assert.equal(saved.players.p1.unlocked, 3, 'đã lưu hình dạng mới');
    assert.equal(saved.unlocked, undefined);
    assert.equal(await page.$eval('#menu .toggle[data-set="music"]', (e) => e.getAttribute('aria-pressed')), 'false');
    await page.click('#btn-play');
    await page.waitForTimeout(300);
    assert.equal(await page.$$eval('.level-card:not(.locked)', (c) => c.length), 3, '3 màn đã mở');
    assert.ok((await page.$eval('.level-card[data-id="L1"] .best', (e) => e.textContent)).indexOf('1.200') >= 0 || (await page.$eval('.level-card[data-id="L1"] .best', (e) => e.textContent)).indexOf('1200') >= 0);
    // Báo cáo: màn có kỷ lục (dữ liệu cũ, chưa có thống kê theo màn) không được ghi "chưa chơi"
    await page.click('#btn-report-levels');
    await page.waitForTimeout(300);
    const rows = await page.$$eval('#report-levels .report-row', (r) => r.map((x) => x.textContent.replace(/\s+/g, ' ')));
    assert.ok(/1\.?200/.test(rows[0]) && /đã chơi 2 lần/.test(rows[0]) && !/chưa chơi/.test(rows[0]), 'màn 1 (dữ liệu cũ): ' + rows[0]);
    assert.ok(/chưa chơi/.test(rows[2]), 'màn chưa từng chơi vẫn ghi "chưa chơi": ' + rows[2]);
    assert.ok(!/Cần luyện thêm/.test(rows.join(' ')), 'chưa đủ câu thì chưa gắn nhãn cần luyện thêm');
    assert.equal(await page.$eval('#report-weak', (e) => e.hidden), true, 'hồ sơ chưa có dữ liệu thì ẩn hẳn dòng "Cần luyện thêm"');
    await shot('legacy-report');
  }, { initScript: "localStorage.setItem('thap-dong-ho-v1', " + JSON.stringify(JSON.stringify(legacy)) + ");", reducedMotion: 'reduce' });
  const ok1 = assertClean(log, 'run 2a – di trú dữ liệu cũ');
  const hostile = '{"levels":[1,2],"unlocked":"9","__proto__":{"polluted":1},"players":{"__proto__":{"x":1},"bad id":{"unlocked":8}}}';
  const log2 = await withGame('thap-dong-ho', async ({ page, hook }) => {
    assert.equal(await hook('X.G.state'), 'menu');
    assert.deepEqual(await hook('X.Store.p().levels'), {}, 'levels là mảng → bỏ');
    // players chỉ chứa id sai → coi như chưa có hồ sơ nào: tiến trình cũ ở cấp cao nhất vẫn được di trú và kẹp về khoảng hợp lệ
    assert.equal(await hook('X.Store.p().unlocked'), 8, '"9" → kẹp về 8');
    assert.equal(await page.evaluate(() => ({}).polluted), undefined);
    assert.equal(await hook('Object.keys(X.Store.data.players).length'), 1);
  }, { initScript: "localStorage.setItem('thap-dong-ho-v1', " + JSON.stringify(hostile) + ");", reducedMotion: 'reduce' });
  return assertClean(log2, 'run 2b – dữ liệu rác') && ok1;
}

async function run3() {
  const log = await withGame('thap-dong-ho', async ({ page, hook, shot }) => {
    assert.ok(await vis(page, '#menu'));
    await shot('phone-menu');
    await page.click('#btn-play');
    await page.waitForTimeout(300);
    await shot('phone-levels');
    await hook('X.openLesson(X.K.LEVELS[4], false)');
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => { const b = document.getElementById('btn-lesson-read').getBoundingClientRect(), p = document.querySelector('#lesson .panel').getBoundingClientRect(); return { right: b.right, panelRight: p.right }; });
    assert.ok(r.right <= r.panelRight + 0.5, 'nút Đọc nằm trong bảng: ' + JSON.stringify(r));
    await shot('phone-lesson-L5');
    await hook('X.startLevel(X.K.LEVELS[4])');
    assert.ok(await waitPlaying(page));
    assert.ok(await hook('X.G.landscape === false'));
    // C9: điện thoại dựng đứng – bỏ ◀ ⬇ ▶ (chạm thẳng vào cột), chỉ giữ 💡 bên lề → ô bảng to hơn hẳn
    const ph = await page.evaluate(() => {
      const X = window.__ThapDongHo, K = X.K, B = X.G.board;
      // Nhãn trên đĩa là ngẫu nhiên nên cỡ chữ đo được cũng đổi theo ván. Đo thêm ở TRƯỜNG HỢP DÀI NHẤT
      // của màn 5 ("10 giờ kém 25 phút") rồi trả lại nhãn cũ, để phép thử không phụ thuộc may rủi.
      const saved = X.G.cols.map((c) => c.t);
      const longest = [K.mk(9, 35, 'kem', null, 5), K.mk(10, 35, 'kem', null, 5), K.mk(11, 35, 'kem', null, 5), K.mk(8, 35, 'kem', null, 5)];
      for (let i = 0; i < X.G.cols.length; i++) X.G.cols[i].t = longest[i];
      X.layout();
      const worstFont = Math.round(X.G.plateFont), worstCell = Math.round(B.cell);
      for (let i = 0; i < X.G.cols.length; i++) X.G.cols[i].t = saved[i];
      X.layout();
      const keys = [];
      const ks = document.querySelectorAll('#controls .k');
      for (let i = 0; i < ks.length; i++) {
        const r = ks[i].getBoundingClientRect();
        if (r.width > 0 && r.height > 0) keys.push({ act: ks[i].getAttribute('data-act'), w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right), bottom: Math.round(r.bottom) });
      }
      return { narrow: X.G.narrow, cell: Math.round(B.cell), font: Math.round(X.G.plateFont), bx: Math.round(B.x),
        worstFont: worstFont, worstCell: worstCell,
        plateBottom: Math.round(B.y + B.h + B.plateH), H: X.G.H, keys: keys };
    });
    assert.equal(ph.narrow, true, 'chế độ điện thoại dựng đứng');
    assert.ok(ph.cell >= 52, 'ô bảng ' + ph.cell + ' px (trước bản nâng cấp: 42 px ở màn 5)');
    assert.ok(ph.worstCell >= 52, 'ô bảng ở nhãn dài nhất ' + ph.worstCell + ' px');
    assert.ok(ph.worstFont >= 12, 'chữ trên đĩa đáp án ở nhãn DÀI NHẤT ' + ph.worstFont + ' px (trước bản nâng cấp: 11 px)');
    assert.ok(ph.font >= ph.worstFont, 'nhãn ngẫu nhiên (' + ph.font + ' px) không nhỏ hơn trường hợp dài nhất (' + ph.worstFont + ' px)');
    assert.equal(ph.keys.length, 1, 'chỉ còn phím 💡: ' + JSON.stringify(ph.keys));
    assert.equal(ph.keys[0].act, 'hint');
    assert.ok(ph.keys[0].w >= 44 && ph.keys[0].h >= 44, 'vùng chạm 💡 ≥ 44 px: ' + JSON.stringify(ph.keys[0]));
    assert.ok(ph.keys[0].right <= ph.bx, '💡 nằm bên lề trái, không đè lên bảng (' + ph.keys[0].right + ' ≤ ' + ph.bx + ')');
    assert.ok(ph.plateBottom <= ph.H, 'hàng đĩa đáp án nằm trong màn hình');
    // Bấm 💡 bằng ngón tay vẫn bật được gợi ý
    await page.click('#controls .k[data-act="hint"]');
    assert.equal(await hook('X.G.piece.hint && X.G.cols[X.G.piece.target].hint'), true, 'chạm 💡 làm cột đúng nhấp nháy');
    await playWrong(page);
    await assertHintFits(page, 'điện thoại dựng đứng');
    await page.waitForTimeout(100);
    await shot('phone-play');
    const done = await playCorrect(page);
    assert.equal(done.state, 'clear');
    await page.evaluate(() => { const X = window.__ThapDongHo; for (let i = 0; i < 30; i++) X.update(0.1); });
    await page.waitForTimeout(300);
    assert.ok(await vis(page, '#summary'));
    await shot('phone-summary');
    await page.click('#btn-quiz');
    await page.waitForTimeout(300);
    await shot('phone-quiz');
    // C15: nhãn nút "chơi màn tiếp theo" trên điện thoại chỉ ghi số màn (tên màn đã nằm ngay bên trên)
    const cta = await page.evaluate(() => {
      const X = window.__ThapDongHo, Qz = X.G.quiz;
      for (let k = 0; k < Qz.qs.length; k++) { X.quizAnswer(Qz.qs[Qz.i].choices[0]); X.quizNext(); }
      const b = document.getElementById('btn-quiz-next-level'), r = b.getBoundingClientRect();
      return { label: b.textContent, h: Math.round(r.height), text: document.getElementById('quiz-done-text').textContent, panel: Math.round(document.querySelector('#quiz .panel').getBoundingClientRect().width), w: Math.round(r.width) };
    });
    assert.equal(cta.label, '▶ Chơi màn 6', 'nhãn ngắn trên điện thoại: ' + cta.label);
    assert.ok(/Từng phút/.test(cta.text), 'tên màn tiếp theo nằm trong lời chúc: ' + cta.text);
    assert.ok(cta.h <= 90 && cta.w <= cta.panel, 'nút không cao 3 dòng / không tràn bảng: ' + JSON.stringify(cta));
    await shot('phone-quiz-done');
  }, { viewport: PHONE, reducedMotion: 'reduce' });
  return assertClean(log, 'run 3 – điện thoại dọc');
}

/* Chạy 4: iPad/laptop ngang cỡ nhỏ – tiêu đề đồng hồ lớn ("📝 Ôn lại…" dài nhất) không tràn mép màn hình. */
async function run4() {
  const log = await withGame('thap-dong-ho', async ({ page, hook, shot }) => {
    for (const vp of [{ width: 1024, height: 768 }, { width: 900, height: 600 }]) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(500);
      await hook('X.startLevel(X.K.LEVELS[0])');
      assert.ok(await waitPlaying(page), 'đang chơi ở ' + vp.width + '×' + vp.height);
      const t = await page.evaluate(() => {
        const X = window.__ThapDongHo, G = X.G;
        const WANT = ['📝 Ôn lại: đồng hồ chỉ mấy giờ?', 'Đồng hồ chỉ mấy giờ?', 'Mấy giờ (24 giờ)?', 'Sẵn sàng…', '✗ 8 giờ kém 15 phút'];
        const found = {};
        const proto = CanvasRenderingContext2D.prototype, orig = proto.fillText;
        proto.fillText = function (txt, x) {
          if (WANT.indexOf(txt) >= 0 && this.textAlign === 'center') {
            const w = this.measureText(txt).width;
            found[txt] = { left: x - w / 2, right: x + w / 2 };
          }
          return orig.apply(this, arguments);
        };
        try {
          if (!G.piece) X.spawnPiece();
          const p = G.piece;
          p.mode = 'fall';
          p.review = true; p.t = X.K.mk(3, 15, 'plain', null, 1); X.render();
          p.review = false; X.render();
          p.t = X.K.mk24(18, 45, 7); X.render();
          G.piece = null; G.lastPiece = { t: X.K.mk(7, 45, 'kem', null, 5), ok: false }; X.render();
          G.lastPiece = null; X.render();
        } finally { proto.fillText = orig; }
        return { W: G.W, found: found };
      });
      const names = Object.keys(t.found);
      assert.ok(names.length >= 4, vp.width + ': đã vẽ các kiểu tiêu đề (' + names.join(' | ') + ')');
      names.forEach((n) => {
        const b = t.found[n];
        assert.ok(b.left >= 0 && b.right <= t.W, vp.width + '×' + vp.height + ': tiêu đề "' + n + '" tràn mép (' + b.left.toFixed(0) + '…' + b.right.toFixed(0) + ' / ' + t.W + ')');
      });
      await page.evaluate(() => { const X = window.__ThapDongHo; if (X.G.piece) X.G.piece.review = true; X.render(); });
      await shot('title-' + vp.width);
    }
  }, { viewport: { width: 1024, height: 768 }, reducedMotion: 'reduce' });
  return assertClean(log, 'run 4 – tiêu đề đồng hồ lớn ở màn hình hẹp');
}

/* Chạy 5: điện thoại nằm ngang – phím điều khiển ≥ 44 px và hàng đĩa đáp án không bị đẩy xuống dưới mép màn hình. */
async function run5() {
  const log = await withGame('thap-dong-ho', async ({ page, hook, shot }) => {
    for (const vp of [{ width: 844, height: 390 }, { width: 736, height: 414 }, { width: 667, height: 375 }]) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(500);
      await hook('X.startLevel(X.K.LEVELS[0])');
      assert.ok(await waitPlaying(page), 'đang chơi ở ' + vp.width + '×' + vp.height);
      const geo = await page.evaluate(() => {
        const X = window.__ThapDongHo, B = X.G.board;
        const ks = document.querySelectorAll('#controls .k');
        const keys = [];
        for (let i = 0; i < ks.length; i++) {
          const r = ks[i].getBoundingClientRect();
          keys.push({ act: ks[i].getAttribute('data-act'), w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right), bottom: Math.round(r.bottom) });
        }
        return { keys: keys, plateBottom: Math.round(B.y + B.h + B.plateH), boardRight: Math.round(B.x + B.w), W: X.G.W, H: X.G.H, cell: Math.round(B.cell) };
      });
      const at = vp.width + '×' + vp.height + ': ';
      assert.equal(geo.keys.length, 4, at + 'bốn phím điều khiển');
      geo.keys.forEach((k) => {
        assert.ok(k.w >= 44 && k.h >= 44, at + 'phím ' + k.act + ' chỉ ' + k.w + '×' + k.h + ' px (cần ≥ 44)');
        assert.ok(k.right <= geo.W + 1 && k.bottom <= geo.H + 1, at + 'phím ' + k.act + ' tràn khỏi màn hình: ' + JSON.stringify(k));
      });
      assert.ok(geo.plateBottom <= geo.H, at + 'hàng đĩa đáp án ở dưới mép màn hình (' + geo.plateBottom + ' > ' + geo.H + ')');
      assert.ok(geo.boardRight < geo.keys[0].right - geo.keys[0].w, at + 'bảng chơi không chồng lên cụm nút');
      await shot('landscape-phone-' + vp.width + 'x' + vp.height);
    }
  }, { viewport: { width: 844, height: 390 }, reducedMotion: 'reduce' });
  return assertClean(log, 'run 5 – điện thoại nằm ngang');
}

(async () => {
  const ok = [await run1(), await run2(), await run3(), await run4(), await run5()];
  if (ok.every(Boolean)) console.log('thap-dong-ho e2e: tất cả sạch.');
  else { console.error('thap-dong-ho e2e: có lỗi.'); process.exit(1); }
})().catch((e) => { console.error(e); process.exit(1); });
