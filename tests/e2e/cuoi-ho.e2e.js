'use strict';
/* Kiểm thử đầu-cuối Cưỡi Hổ Vượt Lửa (Playwright/Chromium):
   luồng đầy đủ menu → hành trình → bài học → vượt vòng lửa → kết quả → hỏi đáp → mở khóa; sai/hết giờ + ôn lại thông minh;
   hỏi đáp thử lại; hồ sơ người chơi (tách tiến trình), báo cáo, cổng phụ huynh; di trú dữ liệu cũ; xoay màn hình; điện thoại;
   tạm dừng/ẩn tab; chuyển động giảm; giọng đọc không bị cắt; bộ xử lý lỗi toàn cục; hiệu năng.
   Chạy: NODE_PATH=/opt/node22/lib/node_modules node tests/e2e/cuoi-ho.e2e.js */
const { withGame, assertClean } = require('./lib/browser.js');

let failures = 0;
const want = (n) => !process.env.ONLY || process.env.ONLY.split(',').indexOf(String(n)) >= 0;   // ONLY=2,5 chỉ chạy vài khối
function ok(cond, msg) { if (!cond) { failures++; console.error('  ✗ ' + msg); } else console.log('  ✓ ' + msg); }
const eq = (a, b, msg) => ok(a === b, msg + ' (được: ' + JSON.stringify(a) + ', mong: ' + JSON.stringify(b) + ')');
const vis = (page, sel) => page.evaluate((s) => { const el = document.querySelector(s); return !!el && !el.classList.contains('hidden') && !el.hidden; }, sel);
const count = (page, sel) => page.evaluate((s) => document.querySelectorAll(s).length, sel);
const text = (page, sel) => page.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent : null; }, sel);
const LAND = { width: 1180, height: 820 }, PORT = { width: 820, height: 1180 }, PHONE = { width: 390, height: 844 };
const NO_CONFIRM = "window.confirm = function () { throw new Error('window.confirm được gọi'); }; window.prompt = window.confirm;";

async function waitChoose(page) {
  await page.waitForFunction(() => { const X = window.__CuoiHo; return X.G.state === 'playing' && X.G.phase === 'choose'; }, null, { timeout: 25000 });
}
async function waitOver(page) {
  await page.waitForFunction(() => !document.getElementById('gameover').classList.contains('hidden'), null, { timeout: 20000 });
  await page.waitForTimeout(450);   // hết hiệu ứng mờ dần của màn hình
}
/** Chơi hết ván qua móc gỡ lỗi: wrongAt = các chỉ số cụm trả lời sai; untilReview = dừng khi gặp câu ôn lại. */
async function playRound(page, hook, opts) {
  opts = opts || {};
  for (let guard = 0; guard < 900; guard++) {
    const st = await hook('({s: X.G.state, p: X.G.phase, i: X.G.gateIdx})');
    if (st.s !== 'playing' && st.s !== 'countdown') return st;
    if (st.s === 'playing' && st.p === 'choose') {
      if (opts.untilReview && (await hook('!!(X.curGate() && X.curGate().q.review)'))) return st;
      const wrong = opts.wrongAt && opts.wrongAt.indexOf(st.i) >= 0;
      await hook('X.choose(' + (wrong ? '(X.curGate().q.answer + 1) % 3' : 'X.curGate().q.answer') + ')');
    }
    await page.waitForTimeout(100);
  }
  throw new Error('playRound: ván chơi quá lâu');
}
async function passQuiz(page, hook) {
  for (let g = 0; g < 14; g++) {
    if (await vis(page, '#quiz-done')) return;
    await hook('X.onQuizAnswer(X.Quiz.list[X.Quiz.i].answer)');
    await page.waitForTimeout(60);
    await hook('X.quizNext()');
    await page.waitForTimeout(60);
  }
}
async function answerGate(page, hook, expr) {
  const v = await hook(expr);
  await page.fill('#parent-gate-input', String(v));
  await page.click('#parent-gate-form button[type="submit"]');
  await page.waitForTimeout(150);
}

(async () => {
  let log;
  /* ===== 1. Luồng chính trên iPad ngang: menu → hành trình → bài học → chơi (đúng hết) → kết quả → hỏi đáp → mở khóa ===== */
  if (want(1)) {
  console.log('\n[1] Luồng chính 1180×820');
  log = await withGame('cuoi-ho', async ({ page, hook, shot }) => {
    ok(await page.evaluate(() => !!document.querySelector('meta[http-equiv="Content-Security-Policy"]')), 'có CSP meta');
    ok(await page.evaluate(() => !document.querySelector('script:not([src])') && !document.querySelector('[onclick]')), 'không có script/onclick nội tuyến');
    ok((await text(page, '#btn-player')).indexOf('Bé') >= 0, 'chip người chơi hiện "Bé"');
    eq(await count(page, '.toggle[data-set="fx"]'), 2, 'có công tắc Hiệu ứng ở menu và tạm dừng');
    ok(await page.evaluate(() => document.querySelectorAll('.toggle[aria-pressed]').length >= 8), 'toggle có aria-pressed');
    await shot('ipad-land-menu');
    await page.click('#btn-play');
    await page.waitForTimeout(350);
    ok(await vis(page, '#levels'), 'mở Hành trình');
    eq(await count(page, '.level-card'), 9, '9 thẻ màn');
    eq(await count(page, '.level-card:not(.locked)'), 1, 'chỉ màn 1 mở');
    eq(await count(page, '.level-card[tabindex="0"]'), 1, 'thẻ mở có tabindex=0');
    eq(await count(page, '.level-card.current'), 1, 'một thẻ hiện tại');
    await shot('ipad-land-levels');
    await page.click('.level-card[data-id="l1"]');
    await page.waitForTimeout(350);
    ok(await vis(page, '#lesson'), 'mở bài học');
    for (let i = 0; i < 6; i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(80); }
    ok(await vis(page, '#btn-lesson-start'), 'nút Lên hổ thôi hiện ở trang cuối');
    await shot('ipad-land-lesson');
    await page.click('#btn-lesson-start');
    await waitChoose(page);
    await page.waitForTimeout(300);
    await shot('ipad-land-play');
    ok(await page.evaluate(() => document.getElementById('hud-timer').getAttribute('aria-label').indexOf('giây') > 0), 'HUD timer có aria-label');
    await playRound(page, hook, {});
    await waitOver(page);
    await shot('ipad-land-results');
    eq(await count(page, '#result-stars .on'), 3, 'đúng hết → 3 sao');
    ok(await vis(page, '#result-record'), 'kỷ lục mới');
    ok(await vis(page, '#btn-quiz'), 'nút Hỏi đáp hiện');
    const b = await hook('X.Store.p()');
    eq(b.levels.l1.stars, 3, 'Store: 3 sao màn 1');
    eq(b.stats.plays, 1, 'Store: 1 ván');
    eq(b.stats.byTopic.l1.c, 8, 'Store: 8 câu đúng chủ đề l1');
    await page.click('#btn-quiz');
    await page.waitForTimeout(300);
    ok(await vis(page, '#quiz'), 'mở hỏi đáp');
    ok(await page.evaluate(() => getComputedStyle(document.getElementById('quiz-feedback')).visibility === 'hidden'), 'ô giải thích giữ chỗ (is-empty)');
    const kinds = await hook('X.Quiz.list.map(function (q) { return q.review ? "R" : q.extra ? "E" : "-"; }).join("")');
    eq(kinds, '----E', 'không sai câu nào → 4 câu + 1 câu thêm');
    await passQuiz(page, hook);
    await page.waitForTimeout(450);
    ok(await vis(page, '#quiz-done'), 'hoàn thành hỏi đáp');
    eq(await hook('X.Store.p().unlocked'), 2, 'mở khóa màn 2');
    await shot('ipad-land-quiz-done');
    await page.click('#btn-quiz-levels');
    await page.waitForTimeout(300);
    eq(await count(page, '.level-card:not(.locked)'), 2, '2 màn mở trong Hành trình');
    ok((await text(page, '.level-card[data-id="l1"] .quiz-ok')).indexOf('Đã hỏi') >= 0, 'thẻ màn 1 có nhãn đã hỏi đáp');
  }, { viewport: LAND, initScript: NO_CONFIRM });
  assertClean(log, '[1] luồng chính');
  }

  /* ===== 2. Sai / hết giờ, giải thích bằng chữ, ôn lại thông minh, tạm dừng ===== */
  if (want(2)) {
  console.log('\n[2] Sai, hết giờ, ôn lại, tạm dừng');
  log = await withGame('cuoi-ho', async ({ page, hook, shot }) => {
    await page.click('#btn-play');
    await hook('X.startGame(window.Lessons.LEVELS[1])');
    await waitChoose(page);
    // tạm dừng: thời gian chọn đứng yên
    await page.click('#btn-pause');
    await page.waitForTimeout(150);
    eq(await hook('X.G.state'), 'paused', 'tạm dừng');
    const t1 = await hook('X.G.gateTime');
    await page.waitForTimeout(600);
    eq(await hook('X.G.gateTime'), t1, 'gateTime đứng yên khi tạm dừng');
    await page.click('#btn-resume');
    await page.waitForTimeout(150);
    eq(await hook('X.G.state'), 'playing', 'chơi tiếp');
    const q0 = await hook('({explain: X.curGate().q.explain, answer: X.curGate().q.answer, key: X.curGate().q.key})');
    await hook('X.choose((X.curGate().q.answer + 1) % 3)');
    await page.waitForFunction(() => window.__CuoiHo.curGate().evaluated, null, { timeout: 8000 });
    eq(await hook('X.G.shake > 0 || X.G.flash !== null'), true, 'có rung/chớp khi hiệu ứng đầy đủ');
    await page.waitForFunction(() => window.__CuoiHo.G.phase === 'learn', null, { timeout: 8000 });
    await page.waitForTimeout(250);
    const hint = await text(page, '#hud-hint');
    ok(hint.indexOf(q0.explain) >= 0, 'gợi ý hiện lời giải thích bằng chữ');
    ok(await vis(page, '#hud-hint'), 'gợi ý đang hiện');
    eq(await hook('X.curGate().rings[' + q0.answer + '].reveal'), true, 'vòng đúng được hé lộ');
    eq(await hook('X.G.hearts'), 2, 'mất 1 tim');
    ok((await text(page, '#tap-tip')).indexOf('Chạm để chạy tiếp') >= 0 && (await vis(page, '#tap-tip')), 'mẹo "Chạm để chạy tiếp"');
    ok(await hook('X.G.tigerX + 1.14 * X.G.r < X.G.stopX - X.G.r'), 'đầu hổ không che vòng (ngang)');
    await shot('ipad-land-learn');
    eq(await hook('!!X.Store.p().missed[' + JSON.stringify(q0.key) + ']'), true, 'câu sai được ghi vào kho ôn lại');
    // hết giờ ở cụm tiếp theo
    await page.waitForFunction(() => window.__CuoiHo.G.phase === 'run', null, { timeout: 12000 });
    ok(await page.evaluate(() => document.getElementById('tap-tip').hidden), 'mẹo ẩn khi chạy tiếp');
    await waitChoose(page);
    await hook('X.G.gateTime = 99');
    await page.waitForFunction(() => window.__CuoiHo.G.phase === 'learn', null, { timeout: 8000 });
    await page.waitForTimeout(200);
    ok((await text(page, '#hud-hint')).indexOf('Hết giờ') >= 0, 'hết giờ → gợi ý "Hết giờ! Đáp án"');
    eq(await hook('X.G.hearts'), 1, 'còn 1 tim');
    await playRound(page, hook, {});
    await waitOver(page);
    eq(await count(page, '#result-stars .on'), 1, 'sai 2 câu → 1 sao');
    ok(await vis(page, '#review'), 'có mục Cần ôn lại');
    eq(await count(page, '#review-chips > span'), 2, '2 chip cần ôn');
    eq(await count(page, '#review-chips > span[role="button"][tabindex="0"]'), 2, 'chip ôn lại dùng được bằng bàn phím');
    eq(await hook('Object.keys(X.Store.p().missed).length'), 2, 'kho ôn lại có 2 câu');
    ok((await text(page, '#result-msg')).indexOf('3 sao') >= 0, 'nhắc cách đạt 3 sao');
    // quay lại kết quả từ bài học không mất trạng thái
    await page.click('#btn-result-lesson');
    await page.waitForTimeout(300);
    ok(await vis(page, '#lesson'), 'mở bài học từ kết quả');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    ok(await vis(page, '#gameover'), 'Escape trong bài học quay về kết quả');
    eq(await hook('X.G.state'), 'over', 'trạng thái vẫn là over');
    eq(await count(page, '#result-stars .on'), 1, 'kết quả vẽ lại đúng');
    // chơi lại: ~25% câu là câu ôn lại
    await page.click('#btn-again');
    await waitChoose(page);
    const nRev = await hook('X.G.gates.filter(function (g) { return g.q.review; }).length');
    eq(nRev, 2, '2/8 cụm là câu ôn lại');
    const st = await playRound(page, hook, { untilReview: true });
    eq(st.p, 'choose', 'dừng ở câu ôn lại');
    ok((await text(page, '#hud-prompt')).indexOf('Ôn lại') >= 0, 'HUD có nhãn 📝 Ôn lại');
    const rk = await hook('X.curGate().q.key');
    await shot('ipad-land-review');
    await hook('X.choose(X.curGate().q.answer)');
    await page.waitForTimeout(700);
    eq(await hook('X.Store.p().missed[' + JSON.stringify(rk) + '].ok'), 1, 'trả lời đúng câu ôn lại → ok = 1');
    // phím tắt: Escape tạm dừng, chữ số chọn vòng
    await waitChoose(page);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(120);
    eq(await hook('X.G.state'), 'paused', 'Escape tạm dừng');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(120);
    eq(await hook('X.G.state'), 'playing', 'Escape chơi tiếp');
    await page.keyboard.press(String((await hook('X.curGate().q.answer')) + 1));
    await page.waitForTimeout(120);
    eq(await hook('X.G.phase'), 'jump', 'phím số chọn vòng');
    await hook('X.goMenu()');
  }, { viewport: LAND, initScript: NO_CONFIRM });
  assertClean(log, '[2] sai/hết giờ/ôn lại');
  }

  /* ===== 3. Hết tim; hỏi đáp thử lại không mò được ===== */
  if (want(3)) {
  console.log('\n[3] Hết tim, hỏi đáp thử lại');
  log = await withGame('cuoi-ho', async ({ page, hook, shot }) => {
    await page.click('#btn-play');
    await hook('X.startGame(window.Lessons.LEVELS[0])');
    await playRound(page, hook, { wrongAt: [0, 1, 2] });
    await waitOver(page);
    ok(await page.evaluate(() => document.getElementById('result-title').classList.contains('nolife')), 'hết tim → Hổ mệt rồi');
    ok(!(await vis(page, '#btn-quiz')), 'không có hỏi đáp khi chưa về đích');
    eq(await count(page, '#result-stars .on'), 0, '0 sao');
    eq(await hook('X.Store.p().levels.l1.plays'), 1, 'vẫn đếm lượt chơi');
    await shot('ipad-land-nolife');
    await page.click('#btn-again');
    await playRound(page, hook, {});
    await waitOver(page);
    await page.click('#btn-quiz');
    await page.waitForTimeout(250);
    const kinds = await hook('X.Quiz.list.map(function (q) { return q.review ? "R" : q.extra ? "E" : "-"; }).join("")');
    ok(/^-{4}R$/.test(kinds), 'câu cuối lấy từ kho ôn lại (đã sai 3 câu ở ván trước): ' + kinds);
    await hook('X.onQuizAnswer((X.Quiz.list[0].answer + 1) % 3)');
    await page.waitForTimeout(100);
    eq(await count(page, '.quiz-answers button.ok'), 0, 'sai lần 1: chưa lộ đáp án');
    eq(await count(page, '.quiz-answers button.bad'), 1, 'nút sai được đánh dấu');
    ok(await vis(page, '#btn-quiz-retry'), 'nút Thử lại hiện');
    await page.click('#btn-quiz-read');
    await hook('X.quizRetry()');
    await page.waitForTimeout(100);
    eq(await count(page, '.quiz-answers button.ok'), 0, 'sau thử lại chưa lộ');
    await hook('X.onQuizAnswer((X.Quiz.list[0].answer + 1) % 3)');
    await page.waitForTimeout(100);
    eq(await count(page, '.quiz-answers button.ok'), 1, 'sai lần 2: đánh dấu đáp án đúng');
    ok((await text(page, '#quiz-feedback')).indexOf('Đáp án đúng là') >= 0, 'lời giải nêu đáp án ở lần 2');
    await shot('ipad-land-quiz-retry');
    // câu ôn lại trong hỏi đáp: thử lại sinh lại cùng câu với đáp án nhiễu mới
    await hook('(X.Quiz.i = 4, X.quizRetry())');
    await page.waitForTimeout(80);
    const k1 = await hook('({key: X.Quiz.list[4].key, keys: X.Quiz.list[4].options.map(window.Lessons.optKey).sort().join("|")})');
    await hook('X.onQuizAnswer((X.Quiz.list[4].answer + 1) % 3)');
    await hook('X.quizRetry()');
    const k2 = await hook('({key: X.Quiz.list[4].key, tries: X.Quiz.list[4].tries})');
    eq(k2.key, k1.key, 'thử lại câu ôn lại giữ nguyên câu hỏi');
    eq(k2.tries, 1, 'đếm số lần thử');
    await page.click('#btn-quiz-back');
    await page.waitForTimeout(300);
    ok(await vis(page, '#gameover'), 'thoát hỏi đáp về kết quả');
    ok(await vis(page, '#result-record'), 'kết quả vẽ lại vẫn còn kỷ lục');
  }, { viewport: LAND, initScript: NO_CONFIRM });
  assertClean(log, '[3] hết tim/hỏi đáp');
  }

  /* ===== 4. Hồ sơ người chơi, báo cáo, cổng phụ huynh ===== */
  if (want(4)) {
  console.log('\n[4] Người chơi, báo cáo, cổng phụ huynh');
  log = await withGame('cuoi-ho', async ({ page, hook, shot }) => {
    await page.click('#btn-play');
    await hook('X.startGame(window.Lessons.LEVELS[0])');
    await playRound(page, hook, { wrongAt: [1] });
    await waitOver(page);
    await page.click('#btn-quiz');
    await page.waitForTimeout(200);
    await passQuiz(page, hook);
    await page.waitForTimeout(300);
    eq(await hook('X.Store.data.players.p1.unlocked'), 2, 'Bé mở khóa màn 2');
    await page.click('#btn-quiz-home');
    await page.waitForTimeout(300);
    await page.click('#btn-player');
    await page.waitForTimeout(300);
    ok(await vis(page, '#players'), 'mở màn người chơi');
    eq(await count(page, '.player-item.active'), 1, 'một người chơi đang hoạt động');
    ok(await page.evaluate(() => document.getElementById('btn-player-remove').disabled), 'không xóa được người chơi cuối cùng');
    await page.click('#btn-player-add');
    await page.waitForTimeout(150);
    ok(await vis(page, '#player-form'), 'hiện biểu mẫu thêm');
    await page.click('.avatar[data-avatar="🦊"]');
    await page.fill('#player-name', 'Minh <b>');
    await page.keyboard.press('Enter');   // Enter trong ô tên gửi biểu mẫu
    await page.waitForTimeout(250);
    const chip = await text(page, '#btn-player');
    ok(chip.indexOf('Minh b') >= 0 && chip.indexOf('🦊') >= 0 && chip.indexOf('<') < 0, 'chip hiện Minh với hình 🦊 (tên đã lọc): ' + chip);
    eq(await hook('X.Store.p().unlocked'), 1, 'Minh bắt đầu từ màn 1');
    eq(await hook('X.Store.data.players.p1.unlocked'), 2, 'tiến trình của Bé giữ nguyên');
    await shot('ipad-land-players');
    await page.click('#btn-players-back');
    await page.waitForTimeout(200);
    await page.click('#btn-play');
    await page.waitForTimeout(200);
    eq(await count(page, '.level-card:not(.locked)'), 1, 'Hành trình của Minh: 1 màn mở');
    await hook('X.startGame(window.Lessons.LEVELS[0])');
    await playRound(page, hook, {});
    await waitOver(page);
    const minhId = await hook('window.Players.active().id');
    eq(await hook('X.Store.data.players[' + JSON.stringify(minhId) + '].stats.plays'), 1, 'Minh có 1 ván');
    eq(await hook('X.Store.data.players.p1.stats.plays'), 1, 'Bé vẫn 1 ván (không lẫn)');
    await page.click('#btn-home');
    await page.waitForTimeout(200);
    await page.click('#btn-player');
    await page.waitForTimeout(200);
    await page.click('.player-item[data-id="p1"]');
    await page.waitForTimeout(200);
    ok((await text(page, '#btn-player')).indexOf('Bé') >= 0, 'chuyển lại Bé');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    ok(await vis(page, '#menu'), 'Escape đóng màn người chơi');
    await page.click('#btn-play');
    await page.waitForTimeout(200);
    eq(await count(page, '.level-card:not(.locked)'), 2, 'Hành trình của Bé: 2 màn mở');
    // báo cáo
    await page.click('#btn-report-levels');
    await page.waitForTimeout(300);
    ok(await vis(page, '#report'), 'mở báo cáo');
    ok((await text(page, '#report-title')).indexOf('Bé') >= 0, 'tiêu đề báo cáo có tên');
    eq(await count(page, '#report-levels .report-row'), 9, '9 dòng màn');
    ok((await text(page, '#report-review')).indexOf('→') >= 0, 'mục cần ôn có câu (Bé sai 1 câu)');
    ok((await text(page, '#report-stats')).indexOf('ván') >= 0, 'thống kê hiện');
    await shot('ipad-land-report');
    // cổng phụ huynh: xóa tiến trình
    await page.click('#btn-report-reset');
    await page.waitForTimeout(200);
    ok(await vis(page, '#parent-gate'), 'hiện cổng phụ huynh (không dùng window.confirm)');
    await page.fill('#parent-gate-input', '1');
    await page.click('#parent-gate-form button[type="submit"]');
    await page.waitForTimeout(150);
    ok(await vis(page, '#parent-gate'), 'sai → cổng vẫn mở');
    ok((await text(page, '#toast')).indexOf('Chưa đúng') >= 0, 'báo chưa đúng');
    await shot('ipad-land-gate');
    await answerGate(page, hook, 'X.Gate.answer');
    ok(!(await vis(page, '#parent-gate')), 'đúng → đóng cổng');
    eq(await hook('X.Store.p().unlocked'), 1, 'đã xóa tiến trình của Bé');
    eq(await hook('X.Store.p().stats.plays'), 0, 'thống kê về 0');
    ok((await text(page, '#report-review')).indexOf('Chưa có gì') >= 0, 'báo cáo vẽ lại');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    ok(await vis(page, '#levels'), 'Escape đóng báo cáo về Hành trình');
    // mở khóa tất cả qua cổng
    await page.click('#btn-unlock-all');
    await page.waitForTimeout(200);
    ok(await vis(page, '#parent-gate'), 'mở khóa tất cả cũng qua cổng');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    ok(!(await vis(page, '#parent-gate')), 'Escape đóng cổng');
    eq(await count(page, '.level-card:not(.locked)'), 1, 'hủy → chưa mở khóa');
    await page.click('#btn-unlock-all');
    await page.waitForTimeout(150);
    await answerGate(page, hook, 'X.Gate.answer');
    eq(await count(page, '.level-card:not(.locked)'), 9, 'mở khóa tất cả 9 màn');
    eq(await page.evaluate(() => document.querySelector('.level-card.current').getAttribute('data-id')), 'l1', 'thẻ hiện tại vẫn là màn 1');
    // xóa người chơi qua cổng
    await page.click('#btn-levels-back');
    await page.click('#btn-player');
    await page.waitForTimeout(200);
    await page.click('.player-item[data-id="' + minhId + '"]');
    await page.waitForTimeout(100);
    await page.click('#btn-player-remove');
    await page.waitForTimeout(150);
    await answerGate(page, hook, 'X.Gate.answer');
    eq(await count(page, '.player-item'), 1, 'xóa Minh còn 1 người');
    eq(await hook('X.Store.data.players[' + JSON.stringify(minhId) + ']'), undefined, 'bucket của Minh bị xóa');
    ok((await text(page, '#btn-player')).indexOf('Bé') >= 0, 'Bé trở lại hoạt động');
  }, { viewport: LAND, initScript: NO_CONFIRM });
  assertClean(log, '[4] người chơi/báo cáo/cổng');
  }

  /* ===== 5. Di trú dữ liệu cũ + dữ liệu hỏng ===== */
  if (want(5)) {
  console.log('\n[5] Di trú dữ liệu cũ');
  const legacy = { sound: true, music: false, voice: true, seenTip: true, progress: { unlocked: 3, levels: { l1: { best: 1200, stars: 3, quiz: true, done: true, plays: 2 }, l2: { best: '<img src=x onerror="window.__xss=1">', stars: 'abc' } }, badge: false } };
  const legacyStr = JSON.stringify(legacy).replace(/^\{/, '{"__proto__":{"polluted":1},');
  log = await withGame('cuoi-ho', async ({ page, hook }) => {
    const st = await hook('X.Store.data');
    eq(st.players.p1.unlocked, 3, 'progress cũ → players.p1.unlocked = 3');
    eq(st.players.p1.levels.l1.best, 1200, 'giữ kỷ lục cũ');
    eq(st.players.p1.levels.l2.best, 0, 'best chuỗi độc hại → 0');
    eq(st.players.p1.levels.l2.stars, 0, 'stars "abc" → 0');
    eq(st.music, false, 'thiết lập nhạc giữ nguyên');
    eq(st.seenTip, true, 'seenTip giữ nguyên');
    eq(st.progress, undefined, 'không còn progress cấp cao nhất');
    eq(await page.evaluate(() => window.__xss), undefined, 'không thực thi mã trong dữ liệu lưu');
    eq(await hook('Object.getPrototypeOf(X.Store.data).polluted'), undefined, 'không nhiễm prototype');
    eq(await page.evaluate(() => JSON.parse(localStorage.getItem('cuoi-ho-v1')).progress), undefined, 'đã lưu dạng mới');
    await page.click('#btn-play');
    await page.waitForTimeout(250);
    ok((await text(page, '#journey-stats')).indexOf('⭐ 3/27') >= 0, 'Hành trình hiện ⭐ 3/27');
    eq(await count(page, '.level-card:not(.locked)'), 3, '3 màn mở');
  }, { viewport: LAND, initScript: NO_CONFIRM + "localStorage.setItem('cuoi-ho-v1', " + JSON.stringify(legacyStr) + ");" });
  assertClean(log, '[5a] di trú');
  log = await withGame('cuoi-ho', async ({ page, hook }) => {
    eq(await hook('X.Store.p().unlocked'), 2, 'levels:"abc" → vẫn đọc được unlocked');
    await page.click('#btn-play');
    await hook('X.startGame(window.Lessons.LEVELS[1])');
    await waitChoose(page);
    await hook('X.endGame("nolife")');
    await waitOver(page);
    ok(await vis(page, '#gameover'), 'màn kết quả vẫn hiện với dữ liệu hỏng');
    eq(await hook('X.Store.p().levels.l2.plays'), 1, 'ghi được lượt chơi');
  }, { viewport: LAND, initScript: NO_CONFIRM + "localStorage.setItem('cuoi-ho-v1', '{\"progress\":{\"unlocked\":2,\"levels\":\"abc\"}}');" });
  assertClean(log, '[5b] dữ liệu hỏng');
  }

  /* ===== 6. Xoay màn hình giữa ván (iPad dọc) ===== */
  if (want(6)) {
  console.log('\n[6] Xoay màn hình');
  log = await withGame('cuoi-ho', async ({ page, hook, shot }) => {
    await page.click('#btn-play');
    await hook('X.startGame(window.Lessons.LEVELS[3])');
    await waitChoose(page);
    await page.setViewportSize(PORT);
    await page.waitForTimeout(900);
    const g1 = await hook('({W: X.G.W, H: X.G.H, dx: Math.abs(X.curGate().wx - X.G.scroll - X.G.stopX), top: X.G.laneY[0] - X.G.r, hb: X.G.hudBottom, r: X.G.r})');
    eq(g1.W, 820, 'canvas theo chiều dọc');
    ok(g1.dx < 0.5, 'cụm vòng vẫn ở stopX sau khi xoay (dx=' + g1.dx.toFixed(2) + ')');
    ok(g1.top > g1.hb, 'vòng trên không đè HUD (dọc)');
    ok(g1.r <= 100, 'bán kính ≤ 100');
    await shot('ipad-port-play');
    await page.setViewportSize(LAND);
    await page.waitForTimeout(900);
    const g2 = await hook('({W: X.G.W, dx: Math.abs(X.curGate().wx - X.G.scroll - X.G.stopX), top: X.G.laneY[0] - X.G.r, hb: X.G.hudBottom, r: X.G.r})');
    eq(g2.W, 1180, 'canvas theo chiều ngang');
    ok(g2.dx < 0.5, 'cụm vòng vẫn ở stopX sau khi xoay lại');
    ok(g2.top > g2.hb && g2.r <= 84, 'bố cục ngang hợp lệ');
    await hook('X.goMenu()');
    await page.setViewportSize(PORT);
    await page.waitForTimeout(500);
    await shot('ipad-port-menu');
    await page.click('#btn-play');
    await page.waitForTimeout(300);
    await shot('ipad-port-levels');
  }, { viewport: LAND });
  assertClean(log, '[6] xoay màn hình');
  }

  /* ===== 7. Điện thoại dọc 390×844 ===== */
  if (want(7)) {
  console.log('\n[7] Điện thoại 390×844');
  log = await withGame('cuoi-ho', async ({ page, hook, shot }) => {
    await shot('phone-menu');
    await page.click('#btn-play');
    await page.waitForTimeout(300);
    await shot('phone-levels');
    ok(await page.evaluate(() => { const c = document.querySelector('.level-card[data-id="l1"] .quiz-ok').getBoundingClientRect(), g = document.querySelector('.level-card[data-id="l1"] .grade').getBoundingClientRect(); return c.bottom <= g.top || c.top >= g.bottom || c.right <= g.left || c.left >= g.right; }), 'nhãn "Đã hỏi" không đè nhãn Lớp trên thẻ hẹp');
    await hook('X.startGame(window.Lessons.LEVELS[3])');
    await waitChoose(page);
    await page.waitForTimeout(200);
    const g = await hook('({ok: X.G.tigerX + 1.14 * X.G.r < X.G.stopX - X.G.r, r: X.G.r, top: X.G.laneY[0] - X.G.r, hb: X.G.hudBottom})');
    ok(g.ok, 'đầu hổ không che vòng dưới cùng (điện thoại)');
    ok(g.top > g.hb - 1, 'vòng trên không đè HUD (điện thoại)');
    ok(await page.evaluate(() => document.getElementById('btn-pause').getBoundingClientRect().right <= 390), 'nút tạm dừng nằm trong màn hình');
    await shot('phone-port-play');
    await hook('X.choose((X.curGate().q.answer + 1) % 3)');
    await page.waitForFunction(() => window.__CuoiHo.G.phase === 'learn', null, { timeout: 8000 });
    await page.waitForTimeout(250);
    await shot('phone-port-learn');
    await hook('X.goMenu()');
  }, { viewport: PHONE, initScript: "localStorage.setItem('cuoi-ho-v1', JSON.stringify({ players: { p1: { unlocked: 2, levels: { l1: { best: 900, stars: 2, quiz: true, done: true, plays: 1 } } } } }));" });
  assertClean(log, '[7] điện thoại');
  }

  /* ===== 8. Ẩn tab khi đếm ngược / đang chơi ===== */
  if (want(8)) {
  console.log('\n[8] Ẩn tab');
  log = await withGame('cuoi-ho', async ({ page, hook }) => {
    await page.click('#btn-play');
    await hook('X.startGame(window.Lessons.LEVELS[0])');
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { get: () => true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForTimeout(3500);
    ok((await hook('X.G.state')) !== 'playing', 'ẩn tab lúc đếm ngược → không chạy ván (' + (await hook('X.G.state')) + ')');
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { get: () => false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForFunction(() => window.__CuoiHo.G.state === 'playing', null, { timeout: 8000 });
    ok(true, 'hiện lại → đếm ngược tiếp và chơi');
    await waitChoose(page);
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { get: () => true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForTimeout(100);
    eq(await hook('X.G.state'), 'paused', 'ẩn tab khi chơi → tạm dừng');
    await hook('X.goMenu()');
  }, { viewport: LAND });
  assertClean(log, '[8] ẩn tab');
  }

  /* ===== 9. Chuyển động giảm + công tắc Hiệu ứng ===== */
  if (want(9)) {
  console.log('\n[9] Chuyển động giảm');
  log = await withGame('cuoi-ho', async ({ page, hook }) => {
    eq(await hook('X.Motion.lite'), true, 'prefers-reduced-motion → Motion.lite');
    eq(await page.evaluate(() => getComputedStyle(document.querySelector('.logo-img')).animationName), 'none', 'logo không nhún');
    await page.click('#btn-play');
    await hook('X.startGame(window.Lessons.LEVELS[0])');
    await waitChoose(page);
    const before = await hook('X.G.parts.length');
    await hook('X.choose((X.curGate().q.answer + 1) % 3)');
    await page.waitForFunction(() => window.__CuoiHo.G.phase === 'learn', null, { timeout: 8000 });
    eq(await hook('X.G.shake'), 0, 'không rung màn hình');
    eq(await hook('X.G.flash'), null, 'không chớp màn hình');
    ok((await hook('X.G.parts.length')) - before < 30, 'ít hạt hơn');
    await hook('X.goMenu()');
    await page.click('#menu .toggle[data-set="fx"]');
    await page.waitForTimeout(100);
    eq(await hook('X.Store.data.fx'), 'lite', 'công tắc Hiệu ứng: Ít được lưu');
    eq(await page.evaluate(() => document.querySelector('#menu .toggle[data-set="fx"]').getAttribute('aria-pressed')), 'false', 'aria-pressed cập nhật');
    eq(await page.evaluate(() => JSON.parse(localStorage.getItem('cuoi-ho-v1')).fx), 'lite', 'fx lưu ở cấp thiết bị');
  }, { viewport: LAND, reducedMotion: 'reduce' });
  assertClean(log, '[9] chuyển động giảm');
  }

  /* ===== 10. Giọng đọc: lời giải thích không bị cắt; chạm để chạy tiếp ===== */
  if (want(10)) {
  console.log('\n[10] Giọng đọc');
  const FAKE_TTS = `(function () {
    const calls = { speak: [], cancel: [] }; const queue = []; let cur = null;
    const voice = { lang: 'vi-VN', name: 'Fake Vi', localService: true, default: true, voiceURI: 'fake' };
    const ss = { speaking: false, pending: false, onvoiceschanged: null, getVoices: function () { return [voice]; },
      speak: function (u) { calls.speak.push({ t: Date.now(), text: u.text }); u._dur = u.text.trim() ? 8000 : 10; queue.push(u); ss.pending = true; next(); },
      cancel: function () { calls.cancel.push(Date.now()); queue.length = 0; ss.pending = false; if (cur) { clearTimeout(cur._t); const u = cur; cur = null; ss.speaking = false; setTimeout(function () { if (u.onend) u.onend({}); }, 0); } } };
    function next() { if (cur || !queue.length) return; const u = queue.shift(); cur = u; ss.speaking = true; ss.pending = queue.length > 0;
      setTimeout(function () { if (u.onstart) u.onstart({}); }, 5);
      u._t = setTimeout(function () { cur = null; ss.speaking = false; if (u.onend) u.onend({}); next(); }, u._dur); }
    // speechSynthesis là thuộc tính chỉ đọc của window → phải defineProperty; tên biến ghi nhận không bắt đầu bằng "__" để harness vẫn tìm thấy móc __CuoiHo
    Object.defineProperty(window, 'speechSynthesis', { value: ss, configurable: true, writable: true });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: function (text) { this.text = String(text); this.voice = null; this.lang = ''; this.rate = 1; this.pitch = 1; this.volume = 1; this.onstart = null; this.onend = null; this.onerror = null; }, configurable: true, writable: true });
    window.fakeTts = calls;
  })();`;
  log = await withGame('cuoi-ho', async ({ page, hook }) => {
    await page.waitForTimeout(1000);
    eq(await page.evaluate(() => window.Voice.available), true, 'giọng Việt giả được nhận');
    await page.click('#btn-play');
    ok(await page.evaluate(() => window.fakeTts.speak.some((s) => s.text.indexOf('Chào Bé') === 0)), 'lời chào theo tên sau thao tác đầu tiên');
    await hook('X.startGame(window.Lessons.LEVELS[1])');
    await waitChoose(page);
    await hook('X.choose((X.curGate().q.answer + 1) % 3)');
    await page.waitForFunction(() => window.__CuoiHo.G.phase === 'learn', null, { timeout: 8000 });
    const n0 = await page.evaluate(() => window.fakeTts.cancel.length);
    await page.waitForTimeout(5000);
    eq(await hook('X.G.phase'), 'learn', 'vẫn dừng nghe giải thích sau 5 giây (chưa đọc xong)');
    eq(await page.evaluate(() => window.fakeTts.cancel.length), n0, 'không cắt lời giải thích');
    // chạm để chạy tiếp
    await page.mouse.click(600, 700);
    await page.waitForTimeout(150);
    eq(await hook('X.G.phase'), 'run', 'chạm → chạy tiếp ngay');
    eq(await page.evaluate(() => window.fakeTts.cancel.length), n0 + 1, 'chạm dừng giọng đọc');
    await waitChoose(page);
    eq(await page.evaluate(() => window.fakeTts.cancel.length), n0 + 1, 'câu hỏi kế tiếp xếp hàng, không cắt (queue)');
    // hết tim ở màn học: giọng nói xong mới kết thúc ván nhưng không quá 6 giây thêm
    await hook('X.goMenu()');
  }, { viewport: LAND, initScript: FAKE_TTS });
  assertClean(log, '[10] giọng đọc');
  }

  /* ===== 11. Bộ xử lý lỗi toàn cục + hiệu năng ===== */
  if (want(11)) {
  console.log('\n[11] Lỗi toàn cục, hiệu năng');
  log = await withGame('cuoi-ho', async ({ page, hook }) => {
    await page.click('#btn-play');
    await hook('X.startGame(window.Lessons.LEVELS[3])');
    await waitChoose(page);
    const t0 = Date.now();
    let k = 0;
    while (Date.now() - t0 < 3000) {
      const st = await hook('({s: X.G.state, p: X.G.phase})');
      if (st.s === 'playing' && st.p === 'choose') await hook('X.choose(' + (k++ % 3 === 0 ? '(X.curGate().q.answer + 1) % 3' : 'X.curGate().q.answer') + ')');
      await page.waitForTimeout(120);
    }
    const perf = await hook('X.G.perf');
    console.log('  perf avgUpdate=' + perf.avgUpdate.toFixed(3) + 'ms avgRender=' + perf.avgRender.toFixed(3) + 'ms');
    ok(perf.avgRender < 4, 'render trung bình < 4 ms');
    await page.evaluate(() => { window.__CuoiHo.G.gates = null; });
    await page.waitForTimeout(1200);
    ok(await page.evaluate(() => document.getElementById('toast').classList.contains('show') && document.getElementById('toast').textContent.indexOf('Có lỗi nhỏ') >= 0), 'toast "Có lỗi nhỏ"');
    eq(await hook('X.G.state'), 'menu', 'ván lỗi được kết thúc an toàn về menu');
    ok(await vis(page, '#menu'), 'menu hiện');
    // vẫn chơi được sau lỗi
    await page.click('#btn-play');
    await hook('X.startGame(window.Lessons.LEVELS[0])');
    await waitChoose(page);
    ok(true, 'chơi lại được sau lỗi');
    await hook('X.goMenu()');
  }, { viewport: LAND });
  const induced = log.errors.filter((e) => e.indexOf('[cuoi-ho]') === 0);
  eq(induced.length, 1, 'đúng một lỗi được ghi (lỗi cố ý)');
  log.errors = log.errors.filter((e) => e.indexOf('[cuoi-ho]') !== 0);
  assertClean(log, '[11] lỗi toàn cục');
  }

  if (failures) { console.error('\ncuoi-ho e2e: ' + failures + ' kiểm tra thất bại'); process.exitCode = 1; }
  else console.log('\ncuoi-ho e2e: tất cả kiểm tra đạt');
})().catch((e) => { console.error(e); process.exit(1); });
