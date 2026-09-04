'use strict';
/* Kiểm thử đầu-cuối Xe Tăng Thời Gian (Playwright, Chromium):
   1. Di trú dữ liệu cũ → luồng menu → chọn màn (bàn phím) → bài học → bắn robot → kết quả → hỏi đáp; đường sai/vỡ tuyến; hồ sơ người chơi; bảng kết quả
   2. Xoay màn hình giữa câu (iPad ngang ↔ dọc), thẻ câu hỏi màn dọc
   3. Điện thoại 390×844: HUD không tràn, robot dưới thẻ câu hỏi, câu 2 đồng hồ ≤ 3 dòng, xoay ngang
   4. Ít chuyển động (prefers-reduced-motion) + nút Hiệu ứng
   5. Dữ liệu hỏng: progress[id] không phải object vẫn kết thúc ván được
   6. Ôn lại thông minh: kho "cần ôn" được chèn vào ván, bảng kết quả mô tả được
   7. Đo hiệu năng (dpr 2, màn 6 – 4 bảng đồng hồ)
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
    await shot('menu-landscape');

    // Menu → chọn màn
    await page.click('#btn-play');
    await sleep(page, 300);
    assert.equal(await hook('X.G.state'), 'levels');
    assert.equal(await page.$eval('.level-card[data-id="l2"]', (c) => c.classList.contains('locked')), false, 'l2 mở (l1 đã qua)');
    assert.equal(await page.$eval('.level-card[data-id="l3"]', (c) => c.getAttribute('aria-disabled')), 'true', 'l3 khóa');
    assert.equal(await page.$eval('.level-card[data-id="l2"]', (c) => c.getAttribute('tabindex')), '0');
    assert.ok((await page.$eval('.level-card[data-id="l1"] .num', (e) => e.textContent)).indexOf('✅') >= 0, 'l1 đánh dấu đã qua');
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
    assert.equal(await page.$eval('#review', (e) => e.hidden), true, 'không có mục cần ôn');
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
    await hook('X.endGame("nolife")');
    await waitFor(page, () => shown(page, '#gameover'), 6000, 'kết quả khi hết máu');
    assert.ok((await page.$eval('#result-title', (e) => e.textContent)).indexOf('hết máu') >= 0);
    assert.equal(await hook('X.G.texts.length'), 0, 'không còn chữ canvas đè bảng kết quả');
    assert.equal(await page.$eval('#review', (e) => e.hidden), false, 'có mục cần ôn lại');
    assert.ok(await page.$('#review-chips .review-chip'), 'chip ôn lại là nút bấm');

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
    await page.click('#btn-report');
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
    await page.click('#btn-report');
    await sleep(page, 300);
    const rep = await page.$eval('#report', (e) => e.textContent);
    assert.ok(rep.indexOf('Kết quả của Bé') >= 0 && rep.indexOf('Cần ôn lại') >= 0);
    assert.ok(await page.$$eval('#report-review .report-row', (r) => r.length) >= 1, 'kho ôn lại của Bé có mục');
    await shot('report-landscape');
    await page.click('#btn-report-back');
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
    await hook('X.goMenu()');
    await sleep(page, 300);
    await shot('menu-portrait');
    await page.click('#btn-play');
    await sleep(page, 300);
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
    await shot('levels-phone');
    await page.click('#btn-report');
    await sleep(page, 300);
    await shot('report-phone');
  }, { viewport: { width: 390, height: 844 } });
  assertClean(log3, 'xe-tang 3 · điện thoại');

  /* ---------------- 4. Ít chuyển động ---------------- */
  const log4 = await withGame(DIR, async ({ page, hook }) => {
    assert.equal(await page.$eval('html', (h) => h.classList.contains('lite-fx')), true, 'prefers-reduced-motion → lite-fx');
    assert.equal(await hook('X.Motion.lite'), true);
    assert.equal(await page.$eval('#menu .toggle[data-set="fx"]', (b) => b.getAttribute('aria-pressed')), 'true', 'thiết lập fx vẫn là "Nhiều"');
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
    await page.click('#btn-report');
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

  if (process.exitCode) { console.error('CÓ LỖI'); process.exit(1); }
  console.log('Xe Tăng Thời Gian e2e: 7 phiên hoàn tất, ảnh chụp trong tests/e2e/out/' + DIR + '/');
})().catch((e) => { console.error(e); process.exit(1); });
