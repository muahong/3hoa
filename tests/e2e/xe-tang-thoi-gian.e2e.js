'use strict';
/* Kiểm thử đầu-cuối Xe Tăng Thời Gian (Playwright, Chromium):
   1. Di trú dữ liệu cũ → luồng menu → chọn màn (bàn phím) → bài học → bắn robot → kết quả → hỏi đáp; đường sai/vỡ tuyến (giải thích + nút 💡 + 20 điểm); hồ sơ người chơi; bảng kết quả; tương phản màu
   2. Xoay màn hình giữa câu (iPad ngang ↔ dọc), thẻ câu hỏi màn dọc
   3. Điện thoại 390×844: HUD không tràn, robot dưới thẻ câu hỏi, câu 2 đồng hồ ≤ 3 dòng, xoay ngang, thẻ màn không chồng chữ
   4. Ít chuyển động (prefers-reduced-motion) + nút Hiệu ứng
   5. Dữ liệu hỏng: progress[id] không phải object vẫn kết thúc ván được
   6. Ôn lại thông minh: kho "cần ôn" được chèn vào ván, bảng kết quả mô tả được
   7. Đo hiệu năng (dpr 2, màn 6 – 4 bảng đồng hồ)
   8. Điện thoại: chữ nổi ngắn & ≥ 14px, chip giải thích đủ tương phản/không che robot/ở lại đủ lâu, giọng đọc không phát "18:09", nút 💡 và Enter/Space trên nút HUD
   9. Dạy học: huy hiệu "Đã thuộc", thưởng tim sau 5 câu đúng liền, bài học 24 giờ, nhãn dạy sự tương đương
  10. Bảng đồng hồ trên điện thoại luôn ≥ 100 px (xếp 2 cột thay vì thu nhỏ)
   Chạy: NODE_PATH=/opt/node22/lib/node_modules node tests/e2e/xe-tang-thoi-gian.e2e.js */
const assert = require('node:assert/strict');
const { withGame, assertClean } = require('./lib/browser.js');

const DIR = 'xe-tang-thoi-gian';
const KEY = 'xe-tang-thoi-gian-v1';
const seed = (obj) => "localStorage.setItem('" + KEY + "', " + JSON.stringify(JSON.stringify(obj)) + ");";
const sleep = (page, ms) => page.waitForTimeout(ms);
const shown = (page, sel) => page.$eval(sel, (el) => !el.classList.contains('hidden') && !el.hidden);
const FIRE_OK = "(function(){var r=X.liveRobots().find(function(r){return r.opt.ok&&r.state!=='wrong'}); if(r) X.fireAt(r); return !!r})()";
const FIRE_WRONG = "(function(){var r=X.liveRobots().find(function(r){return !r.opt.ok&&r.state!=='wrong'}); if(r) X.fireAt(r); return !!r})()";

async function waitFor(page, fn, ms, label) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await fn()) return true; await sleep(page, 100); }
  throw new Error('hết thời gian chờ: ' + label);
}
const waitState = (page, hook, st) => waitFor(page, async () => (await hook('X.G.state')) === st, 8000, 'state ' + st);
const waitAsk = (page, hook) => waitFor(page, () => hook('X.G.state==="playing" && X.G.phase==="ask" && X.liveRobots().length>0'), 8000, 'robot xuất hiện');

/** Bắn đúng cho đến khi hết ván; trả về các quan sát trong ván */
async function playRound(page, hook, obs) {
  obs = obs || {};
  for (let i = 0; i < 60; i++) {
    const st = await hook('X.G.state');
    if (st !== 'playing') break;
    if (await hook('X.G.phase==="ask"')) {
      const pr = await page.$eval('#hud-progress', (e) => e.textContent);
      if (pr.indexOf('Ôn lại') >= 0) obs.reviewSeen = true;
      if (await hook('X.G.q && X.G.q.review')) obs.reviewQ = true;
      await hook(FIRE_OK);
    }
    await sleep(page, 700);
  }
  await waitState(page, hook, 'over');
  await waitFor(page, () => shown(page, '#gameover'), 6000, 'bảng kết quả');
  return obs;
}

/** Vị trí robot: trong bề rộng màn hình, trên tuyến phòng thủ, không chồng nhau, đầu (cả cánh quạt) dưới thẻ câu hỏi */
async function checkRobots(hook, label) {
  const r = await hook('(function(){var G=X.G; var b=document.getElementById("hud-prompt").getBoundingClientRect().bottom; return X.liveRobots().map(function(r){return {x0:r.x0,w:r.w,y:r.y,h:r.h,idx:r.idx}}).concat([{W:G.W,H:G.H,lineY:G.lineY,hearts:G.hearts,promptBottom:b}])})()');
  const meta = r.pop();
  assert.ok(r.length >= 3, label + ': còn ≥ 3 robot (' + r.length + ')');
  r.forEach((rb) => {
    const hr = Math.min(rb.w, rb.h) * 0.26;
    assert.ok(rb.x0 - rb.w / 2 >= 0 && rb.x0 + rb.w / 2 <= meta.W, label + ': robot ngoài màn hình ' + JSON.stringify(rb) + ' W=' + meta.W);
    assert.ok(rb.y + rb.h / 2 < meta.lineY, label + ': robot vượt tuyến ' + JSON.stringify(rb) + ' lineY=' + meta.lineY);
    assert.ok(rb.y - rb.h / 2 - hr * 2.4 >= meta.promptBottom - 1, label + ': đầu robot chui dưới thẻ câu hỏi ' + JSON.stringify(rb) + ' promptBottom=' + meta.promptBottom);
  });
  for (let i = 0; i < r.length; i++) {
    for (let j = i + 1; j < r.length; j++) {
      const a = r[i], b = r[j];
      const apart = Math.abs(a.x0 - b.x0) >= (a.w + b.w) / 2 - 1 || Math.abs(a.y - b.y) >= (a.h + b.h) / 2 - 1;
      assert.ok(apart, label + ': hai bảng chồng nhau ' + JSON.stringify(a) + ' / ' + JSON.stringify(b));
    }
  }
  assert.equal(meta.hearts, 3, label + ': không mất tim khi xoay');
  return meta;
}

/** Bắt đầu màn 6 cho đến khi được câu có 4 bảng chữ (xếp 2 hàng ở màn hẹp – trường hợp khó nhất khi xoay) */
async function startTextRound(page, hook) {
  for (let k = 0; k < 8; k++) {
    await hook('X.startGame(Levels.LEVELS[5])');
    await waitState(page, hook, 'playing');
    await waitAsk(page, hook);
    if (await hook('X.G.q.options.length === 4 && X.G.q.options.every(function(o){return !o.clock})')) return;
  }
  throw new Error('không gặp câu 4 bảng chữ');
}

/** Tỉ lệ tương phản nhỏ nhất giữa màu chữ và các điểm dừng màu nền (kể cả dải màu) của một phần tử */
async function contrastOf(page, sel) {
  return page.$eval(sel, (el) => {
    const cs = getComputedStyle(el);
    const parse = (s) => { const m = /rgba?\(([^)]+)\)/.exec(s || ''); if (!m) return null; const p = m[1].split(',').map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
    const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
    const fg = parse(cs.color);
    const stops = [];
    const re = /rgba?\([^)]+\)/g;
    let m;
    while ((m = re.exec(cs.backgroundImage || ''))) stops.push(parse(m[0]));
    const bc = parse(cs.backgroundColor);
    if (bc && bc[3] > 0) stops.push(bc);
    // Nền trong suốt: lấy nền thật của phần tử cha gần nhất
    for (let p = el.parentElement; p && !stops.length; p = p.parentElement) {
      const pc = getComputedStyle(p);
      const pre = /rgba?\([^)]+\)/g;
      let pm;
      while ((pm = pre.exec(pc.backgroundImage || ''))) stops.push(parse(pm[0]));
      const pb = parse(pc.backgroundColor);
      if (pb && pb[3] > 0) stops.push(pb);
    }
    if (!fg || !stops.length) return { min: 0, n: 0, color: cs.color };
    const rs = stops.map((st) => { const a = lum(fg), b = lum(st); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); });
    return { min: Math.min.apply(null, rs), n: rs.length, color: cs.color };
  });
}

/** Số màn (.num) và nhãn lớp (.grade) không được chồng lên nhau trên bất kỳ thẻ màn nào */
async function checkLevelHead(page, label) {
  const bad = await page.$$eval('.level-card', (cards) => cards.map((c) => {
    const n = c.querySelector('.num'), g = c.querySelector('.grade');
    if (!n || !g) return null;
    const a = n.getBoundingClientRect(), b = g.getBoundingClientRect();
    const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return (ox > 0 && oy > 0) ? { id: c.getAttribute('data-id'), num: n.textContent, overlapPx: Math.round(ox) } : null;
  }).filter(Boolean));
  assert.deepEqual(bad, [], label + ': số màn bị nhãn lớp che ' + JSON.stringify(bad));
}

async function promptLines(page) {
  return page.$eval('#prompt-text', (e) => {
    const lh = parseFloat(getComputedStyle(e).lineHeight) || parseFloat(getComputedStyle(e).fontSize) * 1.2;
    return { lines: e.clientHeight / lh, text: e.textContent };
  });
}

const LEGACY = { sound: true, music: false, voice: true, progress: { l1: { best: 1500, stars: 3, passed: true, plays: 2, quizBest: 4 }, l2: { best: 'abc', stars: 9 } }, unlockAll: false };

(async () => {
  /* ---------------- 1. Luồng chính (iPad ngang) ---------------- */
  const log1 = await withGame(DIR, async ({ page, hook, shot }) => {
    // Di trú
    const st = await hook('X.Store.data');
    assert.equal(st.players.p1.progress.l1.best, 1500, 'best l1 di trú');
    assert.equal(st.players.p1.progress.l1.passed, true);
    assert.equal(st.players.p1.progress.l2.best, 0, 'best "abc" → 0');
    assert.equal(st.players.p1.progress.l2.stars, 3, 'stars 9 → 3');
    assert.equal(st.progress, undefined, 'không còn progress cấp cao nhất');
    assert.equal(st.music, false);
    assert.equal(await page.$eval('meta[http-equiv="Content-Security-Policy"]', (m) => m.content.indexOf("script-src 'self'") >= 0), true, 'CSP meta');
    assert.ok(await shown(page, '#btn-player'), 'chip người chơi hiện');
    assert.ok((await page.$eval('#btn-player', (b) => b.textContent)).indexOf('Bé') >= 0);
    assert.equal(await page.$eval('#toast', (t) => t.getAttribute('aria-live')), 'polite');
    // Tương phản chữ/nền các nút chính và chip (WCAG AA: chữ lớn ≥ 3:1, chữ nhỏ ≥ 4.5:1)
    const CTA = [['#btn-play', 3], ['#btn-howto', 4.5], ['#btn-lesson-play', 3], ['#btn-lesson-read', 3],
      ['#btn-quiz', 3], ['#btn-again', 3], ['#btn-quiz-next', 3], ['#btn-quiz-next-level', 3],
      ['#btn-player-add', 3], ['#btn-reset-yes', 3], ['#hud-combo', 4.5], ['#result-record', 4.5], ['#hud-progress', 4.5],
      ['.footer-note', 4.5], ['.footer-note a', 4.5]];
    for (const [sel, min] of CTA) {
      const c = await contrastOf(page, sel);
      assert.ok(c.n > 0, sel + ': không đo được nền');
      assert.ok(c.min >= min, sel + ': tương phản chỉ ' + c.min.toFixed(2) + ':1 (cần ≥ ' + min + ':1), chữ ' + c.color);
    }
    await shot('menu-landscape');

    // Menu → chọn màn
    await page.click('#btn-play');
    await sleep(page, 300);
    assert.equal(await hook('X.G.state'), 'levels');
    assert.equal(await page.$eval('.level-card[data-id="l2"]', (c) => c.classList.contains('locked')), false, 'l2 mở (l1 đã qua)');
    assert.equal(await page.$eval('.level-card[data-id="l3"]', (c) => c.getAttribute('aria-disabled')), 'true', 'l3 khóa');
    assert.equal(await page.$eval('.level-card[data-id="l2"]', (c) => c.getAttribute('tabindex')), '0');
    assert.ok((await page.$eval('.level-card[data-id="l1"] .num', (e) => e.textContent)).indexOf('✅') >= 0, 'l1 đánh dấu đã qua');
    assert.equal(await page.$eval('.level-card[data-id="l1"] .quiz-best', (e) => e.textContent), '🧠 4/4', 'thẻ màn hiện điểm hỏi đáp');
    assert.equal(await page.$eval('.level-card[data-id="l2"] .best', (e) => e.textContent), '🏆 —', 'chưa chơi thì hiện dấu —');
    await checkLevelHead(page, 'ngang 1180×820');
    await shot('levels-landscape');
    // Bàn phím: Enter trên thẻ màn
    await page.focus('.level-card[data-id="l2"]');
    await page.keyboard.press('Enter');
    await sleep(page, 300);
    assert.equal(await hook('X.G.state'), 'lesson', 'Enter mở bài học');
    assert.equal(await hook('X.G.level.id'), 'l2');
    await shot('lesson-landscape');
    await page.click('#btn-lesson-play');
    await sleep(page, 200);
    assert.equal(await hook('X.G.state'), 'countdown');
    await waitState(page, hook, 'playing');
    await waitAsk(page, hook);
    await shot('play-landscape');

    // Chơi hết ván bằng đáp án đúng
    await playRound(page, hook);
    await sleep(page, 400);
    assert.equal(await page.$$eval('#result-stars .on', (s) => s.length), 3, '3 sao khi không sai');
    assert.ok(await shown(page, '#btn-quiz'), 'nút hỏi đáp');
    assert.equal(await page.$eval('#btn-result-lesson', (e) => e.hidden), true, 'hoàn thành màn thì không mời xem lại bài học');
    assert.equal(await page.$eval('#review', (e) => e.hidden), true, 'không có mục cần ôn');
    // Ăn mừng khi hoàn thành màn + hiệu ứng bảng hiện ra (tôn trọng "ít chuyển động", xem phiên 4)
    assert.ok(await hook('X.G.parts.filter(function(p){return p.kind==="confetti"}).length') > 0, 'hoàn thành màn có pháo giấy');
    assert.equal(await page.$eval('#gameover .panel', (e) => getComputedStyle(e).animationName), 'panel-in', 'bảng kết quả có hiệu ứng hiện ra');
    const stats = await hook('X.Store.p().stats');
    assert.equal(stats.plays, 1);
    assert.equal(stats.byTopic.l2.c, 8);
    assert.equal(stats.wrong, 0);
    assert.ok(stats.seconds > 3);
    const bestL2 = await hook('X.Store.prog("l2").best');
    assert.ok(bestL2 > 0);
    await shot('results-landscape');

    // Đường sai: bắn sai 2 lần → vòng vàng + gợi ý; chip ✓ biến mất sau khi sang câu; vỡ tuyến → thử lại
    await hook('X.startGame(Levels.LEVELS[0])');
    await waitState(page, hook, 'playing');
    await waitAsk(page, hook);
    assert.equal(await hook('X.G.reviewSlots'), null, 'kho ôn trống → không chèn');
    await hook(FIRE_WRONG);
    await sleep(page, 600);
    assert.equal(await hook('X.G.qWrongs'), 1);
    assert.equal(await hook('X.G.hearts'), 3);
    await hook(FIRE_WRONG);
    await sleep(page, 600);
    assert.equal(await hook('X.G.qWrongs'), 2);
    assert.ok(await hook('X.liveRobots().some(function(r){return r.hint && r.opt.ok})'), 'đáp án đúng được đánh dấu sau 2 lần sai');
    const hint = await page.$eval('#hud-hint', (e) => ({ text: e.textContent, hidden: e.hidden }));
    assert.ok(!hint.hidden && hint.text.indexOf(await hook('X.G.q.answer.label')) >= 0, 'gợi ý nêu đáp án: ' + hint.text);
    assert.ok(hint.text.indexOf(await hook('X.G.q.explain')) >= 0, 'gợi ý giải thích vì sao: ' + hint.text);
    assert.ok(await hook('X.G.slowT') > 0, 'robot đi chậm lại trong lúc bé đọc lời giải thích');
    assert.equal(await page.$eval('#btn-hint', (b) => b.disabled), true, 'đã đánh dấu đáp án → tắt nút 💡');
    await shot('play-hint-landscape');
    assert.equal(await hook('X.G.review.length'), 1, 'ghi nhận cần ôn');
    assert.ok(await hook('Object.keys(X.Store.p().missed).length >= 1'), 'kho ôn lại có mục');
    const scoreBefore = await hook('X.G.score');
    await hook(FIRE_OK);
    await sleep(page, 600);
    assert.equal(await hook('X.G.score') - scoreBefore, 20, 'bắn bảng đã đánh dấu được 20 điểm');
    await sleep(page, 1500);
    await waitAsk(page, hook);
    assert.equal(await page.$eval('#hud-hint', (e) => e.hidden), true, 'chip ✓ không lơ lửng sang câu sau');
    // Vỡ tuyến
    const keyBefore = await hook('X.G.q.key');
    await hook('(X.G.robots.forEach(function(r){ if(!r.dead) r.y = X.G.lineY; }), 0)');
    await sleep(page, 300);
    assert.equal(await hook('X.G.hearts'), 2, 'mất 1 tim');
    assert.equal(await hook('X.G.phase'), 'wait');
    await sleep(page, 2300);
    await waitAsk(page, hook);
    assert.equal(await hook('X.G.retry'), true, 'hỏi lại câu vừa vỡ tuyến');
    assert.equal(await hook('X.G.q.key'), keyBefore);
    assert.equal(await hook('X.G.hint'), true, 'câu hỏi lại đã được đánh dấu sẵn đáp án');
    assert.ok(await hook('X.liveRobots().some(function(r){return r.hint && r.opt.ok})'), 'vòng vàng trên đáp án đúng khi hỏi lại');
    const beforeRetry = await hook('X.G.score');
    await hook(FIRE_OK);
    await sleep(page, 700);
    assert.equal(await hook('X.G.score') - beforeRetry, 20, 'câu hỏi lại sau khi vỡ tuyến chỉ được 20 điểm (không được điểm đầy)');
    // Nút 💡 Gợi ý theo yêu cầu: đánh dấu đáp án + đọc lời giải thích, câu đó chỉ được 20 điểm
    await sleep(page, 1600);
    await waitAsk(page, hook);
    assert.equal(await page.$eval('#btn-hint', (b) => b.disabled), false, 'câu mới bật lại nút 💡');
    assert.equal(await hook('X.G.hint'), false);
    await page.click('#btn-hint');
    await sleep(page, 300);
    const explain = await hook('X.G.q.explain');
    assert.equal(await page.$eval('#hud-hint', (e) => e.textContent), explain, 'chip gợi ý hiện lời giải thích');
    assert.ok(await hook('X.liveRobots().some(function(r){return r.hint && r.opt.ok})'), '💡 đánh dấu đáp án đúng');
    assert.ok(await hook('X.G.slowT') > 0, '💡 làm robot đi chậm lại');
    assert.equal(await page.$eval('#btn-hint', (b) => b.disabled), true, 'mỗi câu chỉ gợi ý một lần');
    const beforeHint = await hook('X.G.score');
    await hook(FIRE_OK);
    await sleep(page, 700);
    assert.equal(await hook('X.G.score') - beforeHint, 20, 'câu đã xem gợi ý chỉ được 20 điểm');
    await hook('X.endGame("nolife")');
    await waitFor(page, () => shown(page, '#gameover'), 6000, 'kết quả khi hết máu');
    assert.ok((await page.$eval('#result-title', (e) => e.textContent)).indexOf('hết máu') >= 0);
    assert.equal(await hook('X.G.texts.length'), 0, 'không còn chữ canvas đè bảng kết quả');
    assert.equal(await page.$eval('#review', (e) => e.hidden), false, 'có mục cần ôn lại');
    assert.ok(await page.$('#review-chips .review-chip'), 'chip ôn lại là nút bấm');
    // Chip ôn lại nêu cả lời giải thích (vì sao), không chỉ đáp án
    const why0 = await hook('X.G.review[0].q.explain');
    assert.equal(await page.$eval('#review-chips .review-chip .rc-why', (e) => e.textContent), why0, 'chip ôn lại có dòng "vì sao"');
    // Đáp án là đồng hồ/điện tử thì chip vẽ đúng hình đó
    const chipShape = await page.$eval('#review-chips .review-chip', (e) => ({ canvas: !!e.querySelector('canvas.chip-clock'), digital: !!e.querySelector('.digital'), text: !!e.querySelector('b') }));
    assert.ok(chipShape.canvas || chipShape.digital || chipShape.text, 'chip ôn lại hiện đáp án (đồng hồ / điện tử / chữ)');
    // Hết máu: mời bé xem lại bài học rồi chơi tiếp (không rơi vào vòng thua liên tục)
    assert.equal(await page.$eval('#btn-result-lesson', (e) => e.hidden), false, 'hết máu → hiện nút 📖 Xem lại bài học');
    await shot('results-nolife-landscape');
    await page.click('#btn-result-lesson');
    await sleep(page, 400);
    assert.equal(await hook('X.G.state'), 'lesson', 'nút 📖 mở lại bài học của màn đang chơi');
    assert.equal(await hook('X.G.level.id'), 'l1');

    // Hỏi đáp
    await hook('X.startQuiz(Levels.LEVELS[0])');
    await sleep(page, 300);
    assert.equal(await hook('X.G.state'), 'quiz');
    assert.ok(await page.$('#btn-quiz-exit'), 'có nút thoát hỏi đáp');
    let wrongDone = false;
    for (let i = 0; i < 4; i++) {
      const okIdx = await hook('X.G.quiz.cur.options.findIndex(function(o){return o.ok})');
      const n = await hook('X.G.quiz.cur.options.length');
      const pickIdx = !wrongDone ? (okIdx + 1) % n : okIdx;
      await hook('X.answerQuiz(' + pickIdx + ')');
      await sleep(page, 150);
      const chosen = await page.$eval('.quiz-opt[data-i="' + pickIdx + '"]', (b) => ({ pressed: b.getAttribute('aria-pressed'), ok: b.classList.contains('ok'), bad: b.classList.contains('bad'), label: b.getAttribute('aria-label') }));
      assert.equal(chosen.pressed, 'true');
      if (!wrongDone) {
        assert.ok(chosen.bad && /sai$/.test(chosen.label), 'câu sai được đánh dấu ✗: ' + chosen.label);
        assert.ok((await page.$eval('#quiz-explain', (e) => e.textContent)).indexOf('Đáp án là') >= 0);
        wrongDone = true;
      } else {
        assert.ok(chosen.ok && /đúng$/.test(chosen.label));
      }
      await hook('X.nextQuiz()');
      await sleep(page, 150);
    }
    assert.equal(await page.$eval('#quiz-done', (e) => e.hidden), false, 'màn kết thúc hỏi đáp');
    assert.equal(await hook('X.G.quiz.i'), 4);
    assert.equal(await hook('X.G.quiz.correct'), 3);
    await page.keyboard.press('Enter');
    await page.keyboard.press(' ');
    await sleep(page, 200);
    assert.equal(await hook('X.G.quiz.i'), 4, 'Enter/Space không chạy lại finishQuiz');
    assert.equal(await hook('X.G.quiz.done'), true);
    const st2 = await hook('X.Store.p().stats');
    assert.deepEqual(st2.byTopic['quiz:l1'], { c: 3, w: 1 });
    assert.equal(st2.plays, 2, 'hỏi đáp không tính là ván (2 ván: màn 2 xong + màn 1 hết máu)');
    assert.equal(await hook('X.Store.prog("l1").passed'), true);
    await shot('quiz-done-landscape');
    // Thoát hỏi đáp giữa chừng bằng nút
    await hook('X.startQuiz(Levels.LEVELS[0])');
    await sleep(page, 200);
    await page.click('#btn-quiz-exit');
    await sleep(page, 200);
    assert.equal(await hook('X.G.state'), 'levels', 'thoát hỏi đáp về chọn màn');

    // Hồ sơ người chơi: thêm Mai → tiến trình tách riêng → quay lại Bé
    await page.click('#btn-levels-back');
    await sleep(page, 200);
    await page.click('#btn-player');
    await sleep(page, 200);
    assert.ok(await shown(page, '#players'));
    assert.equal(await page.$$eval('.player-item', (l) => l.length), 1);
    await page.click('#btn-player-add');
    await page.fill('#player-name', 'Mai');
    await page.keyboard.press('Enter');
    await sleep(page, 300);
    assert.ok((await page.$eval('#btn-player', (b) => b.textContent)).indexOf('Mai') >= 0, 'chip đổi sang Mai');
    assert.equal(await page.$$eval('.player-item', (l) => l.length), 2);
    assert.equal(await page.$eval('.player-item.active .pl-name', (e) => e.textContent.indexOf('Mai') >= 0), true);
    assert.equal(await hook('X.Store.prog("l1").best'), 0, 'Mai bắt đầu từ 0');
    assert.equal(await hook('X.Store.p().stats.plays'), 0);
    await shot('players-landscape');
    await page.click('#btn-players-back');
    await page.click('#btn-play');
    await sleep(page, 300);
    assert.equal(await page.$eval('.level-card[data-id="l2"]', (c) => c.classList.contains('locked')), true, 'l2 khóa với Mai');
    // Bảng kết quả của Mai (trống) + xóa tiến trình sau cổng phụ huynh
    await page.click('#btn-report-levels');
    await sleep(page, 200);
    assert.ok(await shown(page, '#report'));
    assert.ok((await page.$eval('#report-title', (e) => e.textContent)).indexOf('Mai') >= 0);
    assert.equal(await page.$$eval('#report-levels .report-row', (r) => r.length), 9);
    await page.click('#btn-report-reset');
    await sleep(page, 200);
    assert.ok(await shown(page, '#parent-gate'), 'cổng phụ huynh trong trang');
    const gq = /(\d+) × (\d+)/.exec(await page.$eval('#parent-gate-q', (e) => e.textContent));
    await page.fill('#parent-gate-input', '1');
    await page.keyboard.press('Enter');
    await sleep(page, 200);
    assert.ok(await shown(page, '#parent-gate'), 'sai → vẫn ở cổng');
    await page.fill('#parent-gate-input', String(Number(gq[1]) * Number(gq[2])));
    await page.keyboard.press('Enter');
    await sleep(page, 300);
    assert.equal(await shown(page, '#parent-gate'), false, 'đúng → qua cổng');
    await page.keyboard.press('Escape');
    await sleep(page, 200);
    assert.equal(await shown(page, '#report'), false, 'Escape đóng bảng kết quả');
    // Quay lại Bé: tiến trình còn nguyên
    await page.click('#btn-levels-back');
    await page.click('#btn-player');
    await sleep(page, 200);
    await page.click('.player-item[data-id="p1"]');
    await sleep(page, 300);
    assert.ok((await page.$eval('#btn-player', (b) => b.textContent)).indexOf('Bé') >= 0);
    assert.equal(await hook('X.Store.prog("l2").best'), bestL2, 'tiến trình của Bé còn nguyên');
    assert.equal(await hook('X.Store.prog("l1").best'), 1500);
    await page.click('#btn-players-back');
    await page.click('#btn-play');
    await sleep(page, 300);
    assert.equal(await page.$eval('.level-card[data-id="l2"]', (c) => c.classList.contains('locked')), false);
    await page.click('#btn-report-levels');
    await sleep(page, 300);
    const rep = await page.$eval('#report', (e) => e.textContent);
    assert.ok(rep.indexOf('Kết quả của Bé') >= 0 && rep.indexOf('Cần ôn lại') >= 0);
    assert.ok(await page.$$eval('#report-review .report-row', (r) => r.length) >= 1, 'kho ôn lại của Bé có mục');
    // Chữ nhỏ trong bảng kết quả và thẻ màn cũng phải đạt 4.5:1
    for (const [sel, min] of [['.report-row .muted', 4.5], ['.report-stat .k', 4.5]]) {
      const c = await contrastOf(page, sel);
      assert.ok(c.n > 0, sel + ': không đo được nền');
      assert.ok(c.min >= min, sel + ': tương phản chỉ ' + c.min.toFixed(2) + ':1 (cần ≥ ' + min + ':1), chữ ' + c.color);
    }
    await shot('report-landscape');
    await page.click('#btn-report-back');
    await sleep(page, 200);
    for (const [sel, min] of [['.level-card .best', 4.5], ['.level-card .desc', 4.5], ['.level-card .lock', 4.5]]) {
      const c = await contrastOf(page, sel);
      assert.ok(c.n > 0, sel + ': không đo được nền');
      assert.ok(c.min >= min, sel + ': tương phản chỉ ' + c.min.toFixed(2) + ':1 (cần ≥ ' + min + ':1), chữ ' + c.color);
    }
    // Bảng phụ huynh: mở khóa tất cả cho người chơi đang hoạt động, xác nhận xóa trong trang
    await page.click('#btn-parent');
    await sleep(page, 150);
    const pq = /(\d+) × (\d+)/.exec(await page.$eval('#parent-q', (e) => e.textContent));
    await page.fill('#parent-input', String(Number(pq[1]) * Number(pq[2])));
    await page.click('#btn-parent-check');
    await sleep(page, 150);
    await page.click('#btn-unlock-all');
    await sleep(page, 150);
    assert.equal(await hook('X.Store.p().unlockAll'), true);
    assert.equal(await page.$eval('.level-card[data-id="l9"]', (c) => c.classList.contains('locked')), false);
    await page.click('#btn-lock-all');
    await sleep(page, 150);
    assert.equal(await page.$eval('.level-card[data-id="l9"]', (c) => c.classList.contains('locked')), true);
    await page.click('#btn-reset-progress');
    assert.equal(await page.$eval('#reset-confirm', (e) => e.hidden), false, 'hộp xác nhận trong trang');
    await page.click('#btn-reset-no');
    assert.equal(await page.$eval('#reset-confirm', (e) => e.hidden), true);
    await page.click('#btn-parent-close');
    assert.equal(await shown(page, '#parent'), false);
    assert.equal(await hook('X.Store.prog("l1").best'), 1500, 'Hủy không xóa');
    // Nút Hiệu ứng + aria-pressed trên các nút bật/tắt
    await page.click('#btn-levels-back');
    await sleep(page, 150);
    assert.equal(await page.$eval('#menu .toggle[data-set="fx"]', (b) => b.getAttribute('aria-pressed')), 'true');
    await page.click('#menu .toggle[data-set="fx"]');
    await sleep(page, 150);
    assert.equal(await hook('X.Store.data.fx'), 'lite');
    assert.equal(await hook('X.Motion.lite'), true);
    assert.equal(await page.$eval('html', (h) => h.classList.contains('lite-fx')), true);
    assert.equal(await page.$eval('#menu .toggle[data-set="fx"]', (b) => b.getAttribute('aria-pressed')), 'false');
    assert.ok(await page.$$eval('.toggle', (ts) => ts.every((t) => t.hasAttribute('aria-pressed'))));
    const saved = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
    assert.equal(saved.fx, 'lite');
    assert.ok(saved.players.p1 && saved.players[Object.keys(saved.players).find((k) => k !== 'p1')], 'hai bucket đã lưu');
    console.log('perf (dpr1, cuối phiên 1) =', JSON.stringify(await hook('X.G.perf')));
  }, { viewport: { width: 1180, height: 820 }, initScript: seed(LEGACY) });
  assertClean(log1, 'xe-tang 1 · luồng chính');

  /* ---------------- 2. Xoay màn hình giữa câu hỏi (iPad) ---------------- */
  const log2 = await withGame(DIR, async ({ page, hook, shot }) => {
    await startTextRound(page, hook);
    await checkRobots(hook, 'ngang 1180×820');
    await page.setViewportSize({ width: 820, height: 1180 });
    await sleep(page, 900);
    const m1 = await checkRobots(hook, 'dọc 820×1180');
    assert.equal(m1.W, 820);
    await shot('play-portrait');
    await page.setViewportSize({ width: 1180, height: 820 });
    await sleep(page, 900);
    const m2 = await checkRobots(hook, 'ngang lại');
    assert.equal(m2.W, 1180);
    // Thẻ câu hỏi màn dọc với câu "thời gian trôi qua" (2 đồng hồ / câu dài) ≤ 3 dòng
    await page.setViewportSize({ width: 820, height: 1180 });
    await sleep(page, 400);
    for (let k = 0; k < 3; k++) {
      await hook('X.startGame(Levels.LEVELS[7])');
      await waitState(page, hook, 'playing');
      await waitAsk(page, hook);
      const pl = await promptLines(page);
      assert.ok(pl.lines <= 3.2, 'câu hỏi màn dọc ≤ 3 dòng (' + pl.lines.toFixed(1) + '): ' + pl.text);
    }
    await shot('play-portrait-l8');
    // Bảng kết quả ở màn dọc (ảnh chụp đối chiếu bố cục)
    await hook('X.endGame("nolife")');
    await waitFor(page, () => shown(page, '#gameover'), 6000, 'bảng kết quả màn dọc');
    await sleep(page, 700);
    assert.equal(await page.$eval('#gameover .panel', (e) => getComputedStyle(e).animationName), 'panel-in');
    await shot('results-portrait');
    await hook('X.goMenu()');
    await sleep(page, 300);
    await shot('menu-portrait');
    await page.click('#btn-play');
    await sleep(page, 300);
    await checkLevelHead(page, 'dọc 820×1180');
    await shot('levels-portrait');
  }, { viewport: { width: 1180, height: 820 } });
  assertClean(log2, 'xe-tang 2 · xoay màn hình');

  /* ---------------- 3. Điện thoại 390×844 ---------------- */
  const log3 = await withGame(DIR, async ({ page, hook, shot }) => {
    await shot('menu-phone');
    await hook('X.startGame(Levels.LEVELS[5])');
    await waitState(page, hook, 'playing');
    await waitAsk(page, hook);
    await hook('(X.G.streak = 6, X.G.score = 12345, 0)');
    await sleep(page, 300);
    const pauseRight = await page.$eval('#btn-pause', (b) => b.getBoundingClientRect().right);
    assert.ok(pauseRight <= 390, 'nút tạm dừng trong màn hình (' + pauseRight + ')');
    assert.ok(await page.$eval('#hud-score', (e) => e.scrollWidth <= e.parentElement.clientWidth + 1), 'điểm không tràn');
    assert.equal(await page.$eval('#hud-combo', (e) => e.hidden), false);
    const combo = await contrastOf(page, '#hud-combo');
    assert.ok(combo.min >= 4.5, 'chip combo tương phản ' + combo.min.toFixed(2) + ':1 (cần ≥ 4.5:1)');
    assert.ok(await hook('(function(){var b=document.getElementById("hud-prompt").getBoundingClientRect().bottom; return X.liveRobots().every(function(r){var hr=Math.min(r.w,r.h)*0.26; return r.y - r.h/2 - hr*2.4 >= b - 1})})()'), 'robot (cả cánh quạt) nằm dưới thẻ câu hỏi');
    await shot('play-phone-l6');
    for (let k = 0; k < 3; k++) {
      await hook('X.startGame(Levels.LEVELS[7])');
      await waitState(page, hook, 'playing');
      await waitAsk(page, hook);
      const pl = await promptLines(page);
      assert.ok(pl.lines <= 3.2, 'câu hỏi điện thoại ≤ 3 dòng (' + pl.lines.toFixed(1) + '): ' + pl.text);
    }
    await shot('play-phone-l8');
    // Xoay ngang điện thoại giữa câu (2 hàng bảng chữ → 1 hàng và ngược lại)
    await startTextRound(page, hook);
    await checkRobots(hook, 'điện thoại dọc 390×844');
    await page.setViewportSize({ width: 844, height: 390 });
    await sleep(page, 900);
    const m = await checkRobots(hook, 'điện thoại ngang 844×390');
    assert.equal(m.H, 390);
    await shot('play-phone-landscape');
    await page.setViewportSize({ width: 390, height: 844 });
    await sleep(page, 900);
    await checkRobots(hook, 'điện thoại dọc lại');
    await hook('X.endGame("nolife")');
    await waitFor(page, () => shown(page, '#gameover'), 6000, 'kết quả');
    await sleep(page, 500);
    await shot('results-phone');
    await hook('X.goLevels()');
    await sleep(page, 300);
    // Thẻ màn ở điện thoại: dấu "✅ đã qua" và số màn không bị nhãn lớp che
    assert.ok((await page.$eval('.level-card[data-id="l1"] .num', (e) => e.textContent)).indexOf('✅') >= 0, 'màn đã qua có dấu ✅');
    await checkLevelHead(page, 'điện thoại 390×844');
    await shot('levels-phone');
    await page.click('#btn-report-levels');
    await sleep(page, 300);
    await shot('report-phone');
  }, { viewport: { width: 390, height: 844 }, initScript: seed(LEGACY) });
  assertClean(log3, 'xe-tang 3 · điện thoại');

  /* ---------------- 4. Ít chuyển động ---------------- */
  const log4 = await withGame(DIR, async ({ page, hook }) => {
    assert.equal(await page.$eval('html', (h) => h.classList.contains('lite-fx')), true, 'prefers-reduced-motion → lite-fx');
    assert.equal(await hook('X.Motion.lite'), true);
    // Máy đã bật "giảm chuyển động": công tắc phải nói đúng sự thật (Ít) và bị khóa, không hứa suông
    assert.equal(await page.$eval('#menu .toggle[data-set="fx"]', (b) => b.getAttribute('aria-pressed')), 'false', 'công tắc Hiệu ứng báo đúng trạng thái thật');
    assert.equal(await page.$eval('#menu .toggle[data-set="fx"]', (b) => b.disabled), true, 'công tắc bị khóa vì máy đang giảm chuyển động');
    assert.equal(await page.$eval('#menu .toggle[data-set="fx"]', (b) => b.textContent), '✨ Hiệu ứng: Ít (theo cài đặt máy)', 'nhãn nói rõ lý do');
    assert.equal(await page.$eval('#menu .panel', (e) => getComputedStyle(e).animationName), 'none', 'ít chuyển động: bảng không chạy hiệu ứng hiện ra');
    await hook('X.startGame(Levels.LEVELS[5])');
    await waitState(page, hook, 'playing');
    await waitAsk(page, hook);
    await hook(FIRE_OK);
    await sleep(page, 700);
    assert.ok(await hook('X.G.parts.length') < 60, 'ít hạt khi ít chuyển động');
    await sleep(page, 2500);
    console.log('perf (dpr1, ít chuyển động, màn 6) =', JSON.stringify(await hook('X.G.perf')));
  }, { viewport: { width: 1180, height: 820 }, reducedMotion: 'reduce' });
  assertClean(log4, 'xe-tang 4 · ít chuyển động');

  /* ---------------- 5. Dữ liệu hỏng ---------------- */
  const log5 = await withGame(DIR, async ({ page, hook }) => {
    assert.equal(await hook('X.Store.data.players.p1.progress.l1.best'), 0);
    assert.equal(await hook('X.Store.data.players.p1.progress.l1.passed'), false);
    await hook('X.startGame(Levels.LEVELS[0])');
    await waitState(page, hook, 'playing');
    await waitAsk(page, hook);
    await hook('X.endGame("nolife")');
    await waitFor(page, () => shown(page, '#gameover'), 6000, 'kết quả với dữ liệu hỏng');
    assert.equal(await hook('X.Store.prog("l1").plays'), 1);
    await hook('X.startQuiz(Levels.LEVELS[0])');
    await sleep(page, 200);
    for (let i = 0; i < 4; i++) {
      await hook('X.answerQuiz(X.G.quiz.cur.options.findIndex(function(o){return o.ok}))');
      await sleep(page, 100);
      await hook('X.nextQuiz()');
      await sleep(page, 100);
    }
    assert.equal(await page.$eval('#quiz-done', (e) => e.hidden), false);
    assert.equal(await hook('X.Store.prog("l1").passed'), true);
  }, { viewport: { width: 1180, height: 820 }, initScript: seed({ progress: { l1: 'x', l2: 42 }, unlockAll: 'yes' }) });
  assertClean(log5, 'xe-tang 5 · dữ liệu hỏng');

  /* ---------------- 6. Ôn lại thông minh ---------------- */
  const MODERN = {
    sound: true, players: {
      p1: {
        progress: { l1: { best: 100, stars: 1, passed: true, plays: 1, quizBest: 3 } }, unlockAll: false,
        missed: {
          'match|Bắn đồng hồ chỉ 3 giờ!|3 giờ': { n: 2, ok: 0, last: 1, info: { kind: 'match', level: 1, h: 3, m: 0, style: 'plain', ms: [0] } },
          'read|Đồng hồ chỉ mấy giờ?|5 giờ': { n: 1, ok: 0, last: 2, info: { kind: 'read', level: 1, h: 5, m: 0, style: 'plain', ms: [0] } },
          'kem|7 giờ 50 phút còn gọi là?|8 giờ kém 10 phút': { n: 3, ok: 0, last: 3, info: { kind: 'kem', level: 6, variant: 0, h: 7, m: 50 } }
        },
        stats: { plays: 2, correct: 10, wrong: 4, seconds: 90, byTopic: { l1: { c: 10, w: 4 } }, last: 0 }
      }
    }
  };
  const log6 = await withGame(DIR, async ({ page, hook, shot }) => {
    assert.equal(await hook('Object.keys(X.Store.p().missed).length'), 3);
    await hook('X.startGame(Levels.LEVELS[0])');
    assert.equal(await hook('X.G.reviewSlots ? X.G.reviewSlots.size : 0'), 2, '25% của 8 câu = 2 câu ôn (kho có 2 mục hợp màn 1)');
    await waitState(page, hook, 'playing');
    const obs = await playRound(page, hook);
    assert.ok(obs.reviewQ && obs.reviewSeen, 'có câu ôn lại được chèn và HUD hiện "📝 Ôn lại"');
    const missed = await hook('X.Store.p().missed');
    // Trả lời đúng câu ôn → ok = 1; nếu bộ sinh màn 1 tình cờ hỏi lại đúng câu đó lần nữa (đúng 2 lần) thì mục đã ra khỏi kho
    ['match|Bắn đồng hồ chỉ 3 giờ!|3 giờ', 'read|Đồng hồ chỉ mấy giờ?|5 giờ'].forEach(function (k) {
      assert.ok(!missed[k] || missed[k].ok >= 1, 'câu ôn "' + k + '" phải được ghi nhận đúng: ' + JSON.stringify(missed[k]));
    });
    assert.equal(missed['kem|7 giờ 50 phút còn gọi là?|8 giờ kém 10 phút'].n, 3, 'mục màn 6 không bị đụng ở màn 1');
    assert.equal(await hook('X.Store.p().stats.plays'), 3);
    await hook('X.goLevels()');
    await sleep(page, 200);
    await page.click('#btn-report-levels');
    await sleep(page, 300);
    const rev = await page.$eval('#report-review', (e) => e.textContent);
    assert.ok(rev.indexOf('7 giờ 50 phút → 8 giờ kém 10 phút') >= 0 && rev.indexOf('✖ 3') >= 0, 'kho ôn lại đọc được: ' + rev);
    assert.ok(rev.indexOf('Màn 6') >= 0);
    const statsTxt = await page.$eval('#report-stats', (e) => e.textContent);
    assert.ok(statsTxt.indexOf('3') >= 0 && statsTxt.indexOf('phút luyện tập') >= 0);
    await shot('report-review-landscape');
  }, { viewport: { width: 1180, height: 820 }, initScript: seed(MODERN) });
  assertClean(log6, 'xe-tang 6 · ôn lại thông minh');

  /* ---------------- 7. Hiệu năng (dpr 2, màn 6: 4 bảng đồng hồ) ---------------- */
  const log7 = await withGame(DIR, async ({ page, hook }) => {
    await hook('X.startGame(Levels.LEVELS[5])');
    await waitState(page, hook, 'playing');
    await waitAsk(page, hook);
    await sleep(page, 4000);
    const perf = await hook('X.G.perf');
    console.log('perf (dpr2, màn 6, 4 s) = update ' + perf.avgUpdate.toFixed(3) + ' ms · render ' + perf.avgRender.toFixed(3) + ' ms');
    assert.ok(perf.avgRender < 8, 'render < 8 ms/khung (' + perf.avgRender + ')');
  }, { viewport: { width: 1180, height: 820 }, contextOptions: { deviceScaleFactor: 2 } });
  assertClean(log7, 'xe-tang 7 · hiệu năng');

  /* ---------------- 8. Chữ nổi / chip giải thích / nút 💡 / bàn phím (điện thoại 390×844) ---------------- */
  const log8 = await withGame(DIR, async ({ page, hook, shot }) => {
    // Ghi lại mọi lần vẽ chữ nổi lên canvas và mọi câu được đọc thành lời
    await page.evaluate(() => {
      window.__ft = [];
      const proto = CanvasRenderingContext2D.prototype, st = proto.strokeText;
      proto.strokeText = function (t) {
        const m = /(\d+(?:\.\d+)?)px/.exec(this.font || '');
        window.__ft.push({ t: String(t), px: m ? Number(m[1]) : 0 });
        return st.apply(this, arguments);
      };
      window.__said = [];
      const say = window.Voice.say;
      window.Voice.say = function (t, o) { window.__said.push(String(t)); return say.call(window.Voice, t, o); };
    });

    // Màn 4 (lời giải thích dài nhất) — nút 💡 chỉ sáng đúng lúc đang hỏi
    await hook('X.startGame(Levels.LEVELS[3])');
    assert.equal(await hook('X.G.state'), 'countdown');
    await sleep(page, 200);
    assert.equal(await page.$eval('#btn-hint', (b) => b.disabled), true, 'đang đếm ngược: nút 💡 phải mờ');
    await waitState(page, hook, 'playing');
    await waitAsk(page, hook);
    assert.equal(await page.$eval('#btn-hint', (b) => b.disabled), false, 'đang hỏi: nút 💡 sáng');
    const explain4 = await hook('X.G.q.explain');
    const label4 = await hook('X.G.q.answer.label');
    await page.click('#btn-hint');
    await sleep(page, 250);
    // Chip giải thích: đủ tương phản (WCAG AA cho chữ 17px) và không che đầu robot
    const cInfo = await contrastOf(page, '#hud-hint');
    assert.ok(cInfo.min >= 4.5, 'chip .hint.info tương phản ' + cInfo.min.toFixed(2) + ':1 (cần ≥ 4.5:1)');
    const geo = await hook(`(function(){var h=document.getElementById('hud-hint').getBoundingClientRect();
      var rs=X.liveRobots();
      var top=Math.min.apply(null, rs.map(function(r){return r.y-r.h/2-Math.min(r.w,r.h)*0.26*2.4}));
      return {chipBottom:Math.round(h.bottom), chipH:Math.round(h.height), headTop:Math.round(top), reserve:Math.round(X.G.hintReserve), n:rs.length};})()`);
    assert.ok(geo.n >= 3 && geo.chipBottom <= geo.headTop + 1,
      'chip giải thích (cao ' + geo.chipH + 'px) che đầu robot: chipBottom ' + geo.chipBottom + ' > headTop ' + geo.headTop);
    await shot('play-phone-hint-chip');

    // Bắn trúng câu đã gợi ý: chữ bay lên phải ngắn và ≥ 14px, lời giải thích đầy đủ nằm ở chip
    await page.evaluate(() => { window.__ft.length = 0; });
    await hook(FIRE_OK);
    await sleep(page, 900);
    const ft = await page.evaluate(() => window.__ft.slice());
    const floats = ft.filter((e) => e.t.indexOf('Nhớ nhé:') === 0);
    assert.ok(floats.length, 'có chữ nổi "Nhớ nhé: …" sau khi bắn trúng câu đã gợi ý');
    // px lớn nhất = cỡ chữ khi hiệu ứng bung ra đã ổn định (các khung đầu cố tình nhỏ hơn)
    const maxPx = Math.max.apply(null, floats.map((e) => e.px));
    assert.ok(maxPx >= 14, 'chữ nổi chỉ ' + maxPx + 'px (cần ≥ 14px): ' + floats[0].t);
    assert.ok(floats[0].t.length <= 40, 'chữ nổi quá dài (' + floats[0].t.length + ' ký tự): ' + floats[0].t);
    assert.ok(floats[0].t.indexOf(label4) >= 0, 'chữ nổi nhắc lại đáp án');
    assert.ok(!ft.some((e) => e.t === explain4), 'lời giải thích dài không được vẽ lên canvas');
    const chip4 = await page.$eval('#hud-hint', (e) => ({ t: e.textContent, hidden: e.hidden }));
    assert.ok(!chip4.hidden && chip4.t.indexOf(explain4) >= 0, 'chip vẫn giữ lời giải thích đầy đủ: ' + chip4.t);
    assert.equal(await page.$eval('#btn-hint', (b) => b.disabled), true, 'pha chờ sau khi bắn: nút 💡 mờ');

    // Sàn cỡ chữ: chữ nổi rộng hơn màn hình vẫn không nhỏ hơn 14px
    await page.evaluate(() => {
      window.__ft.length = 0;
      const G = window.__XeTang.G;
      G.texts.push({ text: 'Đ'.repeat(140), x: G.W / 2, y: 300, vy: 0, life: 1, max: 1, size: 22, color: '#fff', stroke: '#000', t: 0.5 });
    });
    await sleep(page, 200);
    const wide = (await page.evaluate(() => window.__ft.slice())).filter((e) => e.t.indexOf('ĐĐ') === 0);
    assert.ok(wide.length && wide.every((e) => e.px >= 14), 'chữ quá rộng bị co dưới 14px: ' + JSON.stringify(wide[0]));

    // Màn 7: giọng đọc không phát chuỗi đồng hồ điện tử thô "18:09", chip vẫn hiện đúng chữ đó
    await hook('X.startGame(Levels.LEVELS[6])');
    await waitState(page, hook, 'playing');
    await waitAsk(page, hook);
    await hook('(X.G.q = Clock.fromInfo({ kind: "digital", variant: 2, h24: 18, m: 9 }, { n: 4 }), X.G.hint = false, 0)');
    const exD = await hook('X.G.q.explain');
    assert.match(exD, /18:09/, 'câu thử phải có đồng hồ điện tử trong lời giải thích');
    await page.evaluate(() => { window.__said.length = 0; });
    await page.click('#btn-hint');
    await sleep(page, 300);
    const said = await page.evaluate(() => window.__said.slice());
    assert.ok(said.length, 'có câu được đọc thành lời');
    said.forEach((s) => assert.doesNotMatch(s, /\d{1,2}:\d{2}/, 'giọng đọc còn chuỗi đồng hồ điện tử thô: ' + s));
    assert.ok(said.some((s) => s.indexOf('18 giờ 9 phút') >= 0), 'đọc thành "18 giờ 9 phút": ' + JSON.stringify(said));
    assert.ok((await page.$eval('#hud-hint', (e) => e.textContent)).indexOf('18:09') >= 0, 'chip vẫn hiện "18:09" cho bé nhìn');

    // Vỡ tuyến: chip giải thích phải ở lại đủ lâu để bé đọc (không còn 1,6 s)
    await hook('X.startGame(Levels.LEVELS[6])');
    await waitState(page, hook, 'playing');
    await waitAsk(page, hook);
    await hook('(X.G.q = Clock.fromInfo({ kind: "digital", variant: 2, h24: 14, m: 21 }, { n: 4 }), 0)');
    const exB = await hook('X.G.q.explain');
    await page.evaluate(() => { window.__said.length = 0; });
    const t0 = Date.now();
    await hook('(X.G.robots.forEach(function(r){ if(!r.dead) r.y = X.G.lineY; }), 0)');
    await waitFor(page, () => hook('X.G.hearts === 2'), 4000, 'vỡ tuyến');
    const chipB = await page.$eval('#hud-hint', (e) => ({ t: e.textContent, hidden: e.hidden, cls: e.className }));
    assert.ok(!chipB.hidden && chipB.t.indexOf(exB) >= 0, 'chip vỡ tuyến nêu lời giải thích: ' + chipB.t);
    assert.match(chipB.cls, /\bbad\b/);
    const cBad = await contrastOf(page, '#hud-hint');
    assert.ok(cBad.min >= 4.5, 'chip .hint.bad tương phản ' + cBad.min.toFixed(2) + ':1 (cần ≥ 4.5:1)');
    assert.ok(await hook('X.G.phaseT') >= 2.8, 'chờ đủ lâu theo độ dài lời giải thích (phaseT ' + (await hook('X.G.phaseT')) + ')');
    await waitFor(page, () => page.$eval('#hud-hint', (e) => e.hidden), 6000, 'chip vỡ tuyến biến mất');
    const shownMs = Date.now() - t0;
    console.log('chip vỡ tuyến hiện ' + (shownMs / 1000).toFixed(2) + ' s · lời giải thích ' + exB.length + ' ký tự');
    assert.ok(shownMs >= 2800, 'chip vỡ tuyến chỉ hiện ' + shownMs + ' ms (cần ≥ 2800 ms cho ' + exB.length + ' ký tự)');
    (await page.evaluate(() => window.__said.slice())).forEach((s) => assert.doesNotMatch(s, /\d{1,2}:\d{2}/, 'vỡ tuyến đọc chuỗi thô: ' + s));

    // Bàn phím: Enter/Space khi tiêu điểm ở nút HUD phải bấm nút đó, không bắn xe tăng
    await hook('X.startGame(Levels.LEVELS[0])');
    await waitState(page, hook, 'playing');
    await waitAsk(page, hook);
    const before = await hook('({correct: X.G.correct, wrong: X.G.wrong, n: X.liveRobots().length})');
    await page.focus('#btn-hint');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'btn-hint', 'nút 💡 nhận được tiêu điểm');
    await page.keyboard.press('Enter');
    await sleep(page, 400);
    assert.equal(await hook('X.G.hint'), true, 'Enter trên nút 💡 bật gợi ý');
    const after = await hook('({correct: X.G.correct, wrong: X.G.wrong, n: X.liveRobots().length})');
    assert.deepEqual(after, before, 'không được bắn robot khi tiêu điểm ở nút HUD');
    await page.evaluate(() => { window.__said.length = 0; });
    await page.focus('#btn-say');
    await page.keyboard.press(' ');
    await sleep(page, 300);
    assert.ok((await page.evaluate(() => window.__said.slice())).length >= 1, 'Space trên nút 🔊 đọc lại câu hỏi');
    assert.deepEqual(await hook('({correct: X.G.correct, wrong: X.G.wrong, n: X.liveRobots().length})'), before, 'Space cũng không bắn');
    // Phím bắn vẫn chạy khi tiêu điểm không ở nút HUD
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.keyboard.press('1');
    await sleep(page, 500);
    assert.ok(await hook('X.G.correct + X.G.wrong') > before.correct + before.wrong, 'phím số vẫn bắn khi tiêu điểm ở nền');

    // Bảng kết quả: nút 💡 mờ (không còn thông báo sai ngữ cảnh)
    await hook('X.endGame("nolife")');
    await waitFor(page, () => shown(page, '#gameover'), 6000, 'bảng kết quả');
    await sleep(page, 300);
    assert.equal(await page.$eval('#btn-hint', (b) => b.disabled), true, 'trên bảng kết quả nút 💡 phải mờ');
    assert.equal(await page.$eval('#toast', (e) => e.classList.contains('show')), false, 'không có thông báo sai ngữ cảnh');
    await hook('X.goMenu()');
    await sleep(page, 300);
    assert.equal(await page.$eval('#btn-hint', (b) => b.disabled), true, 'ở menu nút 💡 vẫn mờ');
  }, { viewport: { width: 390, height: 844 } });
  assertClean(log8, 'xe-tang 8 · chữ nổi, chip giải thích, nút 💡, bàn phím');

  /* ---------------- 9. Dạy học: "Đã thuộc", thưởng tim, bài học 24 giờ, bảng đồng hồ trên điện thoại ---------------- */
  const MASTER = {
    sound: true, players: {
      p1: {
        progress: { l1: { best: 900, stars: 3, passed: true, plays: 6, quizBest: 4 }, l2: { best: 400, stars: 2, passed: true, plays: 3, quizBest: 3 } },
        unlockAll: true, missed: {},
        stats: { plays: 9, correct: 30, wrong: 3, seconds: 600, byTopic: { l1: { c: 27, w: 3 }, l2: { c: 3, w: 0 } }, last: 0 }
      }
    }
  };
  const log9 = await withGame(DIR, async ({ page, hook, shot }) => {
    // "Đã thuộc": đúng ≥ 90% trên ≥ 20 câu của màn đó
    await page.click('#btn-play');
    await sleep(page, 300);
    assert.ok(await page.$('.level-card[data-id="l1"] .mastered'), 'màn 1 (27/30 = 90%) có huy hiệu Đã thuộc');
    assert.equal(await page.$eval('.level-card[data-id="l1"] .mastered', (e) => e.textContent), '✅ Đã thuộc');
    assert.equal(await page.$('.level-card[data-id="l2"] .mastered'), null, 'màn 2 mới 3 câu → chưa "Đã thuộc"');
    assert.ok((await page.$eval('.level-card[data-id="l1"]', (e) => e.getAttribute('aria-label'))).indexOf('đã thuộc') >= 0, 'aria-label nêu "đã thuộc"');
    await page.click('#btn-report-levels');
    await sleep(page, 300);
    assert.ok((await page.$eval('#report-levels', (e) => e.textContent)).indexOf('Đã thuộc') >= 0, 'bảng kết quả cũng nêu "Đã thuộc"');
    await page.click('#btn-report-back');
    await sleep(page, 200);

    // Bài học màn 4: đồng hồ điện tử + buổi hiện dưới mặt đồng hồ; nhãn nút ngắn, nhãn đầy đủ ở dưới
    await hook('X.showLesson(Levels.LEVELS[3], "play")');
    await sleep(page, 400);
    assert.equal(await page.$eval('#lesson-extra', (e) => e.hidden), false, 'bài học 24 giờ có phần minh họa thêm');
    const extra = await page.$eval('#lesson-extra', (e) => e.textContent);
    assert.ok(extra.indexOf('15:00') >= 0 && extra.indexOf('15 giờ') >= 0 && extra.indexOf('chiều') >= 0, 'hiện 15:00 = 15 giờ · buổi chiều: ' + extra);
    await shot('lesson-l4-extra');
    // Bài học màn 6: nhãn dạy sự tương đương "7 giờ 50 phút = 8 giờ kém 10 phút"
    await hook('X.showLesson(Levels.LEVELS[5], "play")');
    await sleep(page, 400);
    assert.equal(await page.$eval('#lesson-extra', (e) => e.hidden), true, 'màn 6 không có phần 24 giờ');
    assert.equal(await page.$eval('#lesson-clock-label', (e) => e.textContent), '7 giờ 50 phút = 8 giờ kém 10 phút');
    assert.equal(await page.$eval('.lesson-examples button', (e) => e.textContent), '8 giờ kém 10 phút', 'nút ví dụ giữ nhãn ngắn');
    await shot('lesson-l6-labels');

    // Thưởng tim: 5 câu đúng ngay liên tiếp khi đang thiếu tim
    await hook('X.startGame(Levels.LEVELS[0])');
    await waitState(page, hook, 'playing');
    await waitAsk(page, hook);
    await hook('(X.G.hearts = 1, X.G.perfect = 0, 0)');
    for (let i = 0; i < 5; i++) {
      await waitAsk(page, hook);
      await hook(FIRE_OK);
      await sleep(page, 900);
    }
    assert.equal(await hook('X.G.hearts'), 2, 'đúng ngay 5 câu liền → được thưởng lại 1 tim');
    assert.equal(await hook('X.G.perfect'), 5);
    // Bắn sai làm chuỗi "đúng ngay" bắt đầu lại
    await waitAsk(page, hook);
    await hook(FIRE_WRONG);
    await sleep(page, 600);
    assert.equal(await hook('X.G.perfect'), 0, 'bắn sai → chuỗi đúng ngay về 0');
    await hook('X.endGame("nolife")');
    await waitFor(page, () => shown(page, '#gameover'), 6000, 'kết quả');

    // Sao tính theo số câu sai: bắn trượt 3 lần trong CÙNG một câu vẫn chỉ là 1 câu sai
    assert.equal(await hook('X.G.review.length'), 1, 'bắn trượt trong một câu chỉ ghi 1 câu cần ôn');
    assert.ok(await hook('X.G.wrong') >= 1);
    await hook('(X.G.hearts = 1, 0)');
    assert.equal(await hook('X.starsFor()'), 1, 'chỉ còn 1 tim → 1 sao');
    await hook('(X.G.hearts = 3, 0)');
    assert.equal(await hook('X.starsFor()'), 2, 'sai 1 câu nhưng còn đủ tim → 2 sao');
    await hook('(X.G.review = [], 0)');
    assert.equal(await hook('X.starsFor()'), 3, 'không câu nào sai + đủ tim → 3 sao');
  }, { viewport: { width: 1180, height: 820 }, initScript: seed(MASTER) });
  assertClean(log9, 'xe-tang 9 · đã thuộc, thưởng tim, bài học');

  /* ---------------- 10. Bảng đồng hồ đọc được trên điện thoại ---------------- */
  const log10 = await withGame(DIR, async ({ page, hook, shot }) => {
    // Màn 5 (xem đến 5 phút) và màn 1 (giờ đúng) đều có câu "bắn đồng hồ" – bảng phải ≥ 100 px
    for (const lv of [0, 4, 6]) {
      for (let k = 0; k < 10; k++) {
        await hook('X.startGame(Levels.LEVELS[' + lv + '])');
        await waitState(page, hook, 'playing');
        await waitAsk(page, hook);
        const clocks = await hook('X.liveRobots().filter(function(r){return r.clock}).map(function(r){return {w:Math.round(r.w),x0:Math.round(r.x0)}})');
        if (!clocks.length) continue;
        clocks.forEach((c) => assert.ok(c.w >= 100, 'màn ' + (lv + 1) + ': bảng đồng hồ chỉ ' + c.w + ' px (cần ≥ 100)'));
        break;
      }
    }
    // Câu 4 đồng hồ phải xếp 2 cột (2 hàng) chứ không thu nhỏ dưới 100 px
    const bs = await hook('X.boardSize({ options: [{clock:{h:1,m:0}},{clock:{h:2,m:0}},{clock:{h:3,m:0}},{clock:{h:4,m:0}}] })');
    assert.equal(bs.cols, 2, 'điện thoại: 4 bảng đồng hồ xếp 2 cột');
    assert.ok(bs.w >= 100, 'bảng đồng hồ ≥ 100 px (' + bs.w + ')');
    // Gặp thật một câu 4 đồng hồ (màn 7) và kiểm tra bố cục: trong màn hình, trên tuyến, không chồng nhau
    let found = false;
    for (let k = 0; k < 25 && !found; k++) {
      await hook('X.startGame(Levels.LEVELS[6])');
      await waitState(page, hook, 'playing');
      await waitAsk(page, hook);
      found = await hook('X.liveRobots().filter(function(r){return r.clock}).length === 4');
    }
    if (found) {
      const meta = await checkRobots(hook, 'điện thoại 390×844, 4 bảng đồng hồ');
      const ws = await hook('X.liveRobots().map(function(r){return Math.round(r.w)})');
      ws.forEach((w) => assert.ok(w >= 100, '4 bảng đồng hồ: chỉ ' + w + ' px'));
      assert.ok(meta.lineY > 0);
      await shot('play-phone-4clocks');
    } else {
      console.log('(không gặp câu 4 đồng hồ trong 25 ván – bỏ qua phần bố cục)');
    }
    await shot('play-phone-clocks');
  }, { viewport: { width: 390, height: 844 } });
  assertClean(log10, 'xe-tang 10 · bảng đồng hồ trên điện thoại');

  /* ---------------- 11. Bảng kết quả không đẩy nút ra ngoài, đồng hồ thẻ câu hỏi, vùng chạm, aria-live, thưởng nhanh ---------------- */
  const log11 = await withGame(DIR, async ({ page, hook, shot }) => {
    /* (a) Vùng chạm: không còn nút / liên kết nào dưới 44 px ở menu (liên kết 3hoa.com từng cao 38 px) */
    const smalls = await page.$$eval('#menu button, #menu a', (els) => els
      .map((e) => ({ tag: e.tagName, t: e.textContent.trim().slice(0, 20), r: e.getBoundingClientRect() }))
      .filter((o) => o.r.width > 0 && (o.r.width < 44 || o.r.height < 44))
      .map((o) => o.tag + '[' + o.t + '] ' + Math.round(o.r.width) + '×' + Math.round(o.r.height)));
    assert.deepEqual(smalls, [], 'menu còn nút/liên kết nhỏ hơn 44 px: ' + JSON.stringify(smalls));
    assert.ok(await page.$eval('.footer-note a', (a) => a.getBoundingClientRect().height) >= 44, 'liên kết 3hoa.com ≥ 44 px');

    /* (b) Đo chiều cao chip gợi ý KHÔNG được mở vùng aria-live chứa đáp án */
    await page.evaluate(() => {
      window.__hintMut = [];
      const el = document.getElementById('hud-hint');
      new MutationObserver(() => window.__hintMut.push({ hidden: el.hidden, t: el.textContent }))
        .observe(el, { attributes: true, childList: true, characterData: true, subtree: true });
    });
    await hook('X.startGame(Levels.LEVELS[6])');
    await waitState(page, hook, 'playing');
    await waitAsk(page, hook);
    await hook('(X.layout(), 0)');            // đo lại khi xoay màn hình cũng không được đụng vùng aria-live
    const label11 = await hook('X.G.q.answer.label');
    const muts = await page.evaluate(() => window.__hintMut.slice());
    assert.deepEqual(muts.filter((m) => !m.hidden), [], 'chip gợi ý bị mở ra khi bé chưa trả lời: ' + JSON.stringify(muts));
    assert.ok(!muts.some((m) => m.t && m.t.indexOf(label11) >= 0), 'vùng aria-live đã chứa đáp án trước khi bé trả lời: ' + JSON.stringify(muts));
    assert.equal(await page.$$eval('.hint', (h) => h.length), 1, 'không để lại bản sao dùng để đo trong DOM');
    // Bản sao rời vẫn đo được thật: lời giải thích rất dài → chừa nhiều chỗ hơn 44 px
    const reserve = await hook('(function(){ X.G.q.explain = "Đ".repeat(400); X.G.hintReserve = 0; X.layout(); return X.G.hintReserve; })()');
    assert.ok(reserve > 60, 'đo trên bản sao phải ra chiều cao thật (chỉ được ' + reserve + ' px)');
    assert.equal(await page.$$eval('.hint', (h) => h.length), 1, 'bản sao đã được gỡ khỏi DOM');

    /* (c) C12: mặt đồng hồ của thẻ câu hỏi ≥ 120 px trên màn ≥ 700 px */
    let hasClock = null;
    for (let k = 0; k < 12 && !hasClock; k++) {
      await hook('X.startGame(Levels.LEVELS[0])');
      await waitState(page, hook, 'playing');
      await waitAsk(page, hook);
      hasClock = await page.$('#prompt-visual canvas');
    }
    assert.ok(hasClock, 'gặp câu có mặt đồng hồ ở thẻ câu hỏi');
    await sleep(page, 500);      // chờ hiệu ứng "pop" của thẻ câu hỏi xong (transform làm sai số đo hình học)
    const w120 = await page.$eval('#prompt-visual canvas', (e) => ({ css: e.clientWidth, rect: Math.round(e.getBoundingClientRect().width) }));
    assert.ok(w120.css >= 120, 'màn 1180 px: mặt đồng hồ câu hỏi chỉ ' + w120.css + ' px (cần ≥ 120)');
    assert.ok(w120.rect >= 120, 'màn 1180 px: mặt đồng hồ vẽ ra chỉ ' + w120.rect + ' px');

    /* (d) Thưởng nhanh tính theo thời gian rơi của CHÍNH câu vừa trả lời (không phải của câu sau) */
    const origFall = await hook('X.G.level.fall');
    const ft11 = await hook(`(function(){ var G = X.G;
      G.level.fall = 400;                          // nới thời gian rơi: cửa sổ giữa hai ngưỡng rộng ~3,5 s
      G.streak = 0; G.qIndex = 0; G.hint = false; G.retry = false; G.qWrongs = 0;
      var ft = X.fallTime(G.q);                    // ft của câu đang hỏi (qIndex = 0)
      G.qBorn = G.time - (ft * 0.246 - 0.34);      // tuổi câu lúc đạn tới ≈ 0,246·ft (giữa 0,2412·ft và 0,25·ft)
      return ft; })()`);
    assert.ok(ft11 > 200, 'thời gian rơi thử nghiệm đủ dài (' + ft11 + ' s)');
    const scoreA = await hook('X.G.score');
    await hook(FIRE_OK);
    await sleep(page, 800);
    const gained = await hook('X.G.score') - scoreA;
    await hook('(X.G.level.fall = ' + origFall + ', 0)');
    assert.equal(gained, 150, 'phải được 100 điểm + 50 thưởng nhanh (ngưỡng của câu vừa trả lời), nhận ' + gained);

    /* (e) C10: 8 câu cần ôn vẫn để lộ đủ nút thoát ở cả ba khổ màn hình */
    async function resultsFit(tag) {
      await hook('X.startGame(Levels.LEVELS[7])');
      await waitState(page, hook, 'playing');
      await waitAsk(page, hook);
      await hook(`(function(){ var G = X.G; G.review = [];
        for (var i = 0; i < 8; i++) { var q = Levels.LEVELS[7].gen(); G.review.push({ key: q.key + '#' + i, q: q, text: q.answer.label, speech: q.answer.speech, prompt: q.prompt.text }); }
        G.wrong = 8; G.correct = 3; return G.review.length; })()`);
      await hook('X.endGame("nolife")');
      await waitFor(page, () => shown(page, '#gameover'), 8000, 'bảng kết quả ' + tag);
      await sleep(page, 700);
      const box = await page.evaluate(() => {
        const R = (id) => { const r = document.getElementById(id).getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom) }; };
        return {
          vh: window.innerHeight,
          chips: document.querySelectorAll('#review-chips .review-chip').length,
          more: document.getElementById('review-more').textContent,
          moreHidden: document.getElementById('review-more').hidden,
          again: R('btn-again'), lesson: R('btn-result-lesson'), other: R('btn-other-level'), home: R('btn-home')
        };
      });
      assert.equal(box.chips, 4, tag + ': chỉ hiện 4 chip ôn lại (đang ' + box.chips + ')');
      assert.equal(box.moreHidden, false, tag + ': phải báo còn câu nữa');
      assert.match(box.more, /4 câu nữa/, tag + ': lời nhắn "còn 4 câu nữa" — ' + box.more);
      ['again', 'lesson', 'other', 'home'].forEach((k) => {
        assert.ok(box[k].top >= 0 && box[k].bottom <= box.vh,
          tag + ': nút "' + k + '" nằm ngoài màn hình ' + JSON.stringify(box[k]) + ' (cao màn hình ' + box.vh + ')');
      });
      console.log('bảng kết quả 8 câu ôn · ' + tag + ' =', JSON.stringify(box));
      return box;
    }
    await resultsFit('ngang 1180×820');
    await shot('fix-results-8-landscape');
    await page.setViewportSize({ width: 820, height: 1180 });
    await sleep(page, 500);
    await resultsFit('dọc 820×1180');
    await shot('fix-results-8-portrait');
    await page.setViewportSize({ width: 390, height: 844 });
    await sleep(page, 500);
    await resultsFit('điện thoại 390×844');
    await shot('fix-results-8-phone');
    // Điện thoại: mặt đồng hồ thẻ câu hỏi vẫn nhỏ (không áp quy tắc 120 px của màn rộng)
    let hasClockP = null;
    for (let k = 0; k < 12 && !hasClockP; k++) {
      await hook('X.startGame(Levels.LEVELS[0])');
      await waitState(page, hook, 'playing');
      await waitAsk(page, hook);
      hasClockP = await page.$('#prompt-visual canvas');
    }
    assert.ok(hasClockP, 'điện thoại: gặp câu có mặt đồng hồ ở thẻ câu hỏi');
    await sleep(page, 500);
    const w84 = await page.$eval('#prompt-visual canvas', (e) => e.clientWidth);
    assert.ok(w84 <= 90, 'điện thoại: mặt đồng hồ câu hỏi phải giữ 84 px (đang ' + w84 + ')');

    /* (f) Đồng hồ điện tử trong bài học có kiểu "màn LED" như mọi nơi khác */
    await page.setViewportSize({ width: 1180, height: 820 });
    await sleep(page, 400);
    await hook('X.showLesson(Levels.LEVELS[3], "play")');
    await sleep(page, 500);
    const dig = await page.$eval('#lesson-extra .digital', (d) => {
      const cs = getComputedStyle(d);
      return { bg: cs.backgroundColor, color: cs.color, radius: cs.borderRadius, text: d.textContent };
    });
    assert.equal(dig.bg, 'rgb(22, 33, 62)', 'nền tối của màn LED: ' + JSON.stringify(dig));
    assert.equal(dig.color, 'rgb(123, 241, 168)', 'chữ xanh của màn LED: ' + JSON.stringify(dig));
    assert.ok(parseFloat(dig.radius) > 0, 'bo góc như các huy hiệu điện tử khác');
    await shot('fix-lesson-l4-digital');
  }, { viewport: { width: 1180, height: 820 } });
  assertClean(log11, 'xe-tang 11 · bảng kết quả, đồng hồ câu hỏi, vùng chạm, aria-live, thưởng nhanh');

  if (process.exitCode) { console.error('CÓ LỖI'); process.exit(1); }
  console.log('Xe Tăng Thời Gian e2e: 11 phiên hoàn tất, ảnh chụp trong tests/e2e/out/' + DIR + '/');
})().catch((e) => { console.error(e); process.exit(1); });
