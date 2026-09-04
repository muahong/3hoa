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
    // Công tắc Hiệu ứng phải nói đúng trạng thái THẬT của Motion (máy này không bật giảm chuyển động)
    eq(await hook('X.Motion.lite'), false, 'máy không giảm chuyển động → Motion.lite = false');
    eq(await page.evaluate(() => document.querySelector('#menu .toggle[data-set="fx"]').getAttribute('aria-pressed')), 'true', 'công tắc Hiệu ứng: Nhiều');
    ok(!(await page.evaluate(() => document.querySelector('#menu .toggle[data-set="fx"]').disabled)), 'công tắc Hiệu ứng bấm được');
    await page.click('#menu .toggle[data-set="fx"]');
    await page.waitForTimeout(120);
    eq(await hook('X.Store.data.fx'), 'lite', 'công tắc lưu fx = lite');
    eq(await hook('X.Motion.lite'), true, 'Motion đi theo công tắc');
    eq(await page.evaluate(() => document.querySelector('#menu .toggle[data-set="fx"]').getAttribute('aria-pressed')), 'false', 'aria-pressed cập nhật');
    eq(await page.evaluate(() => JSON.parse(localStorage.getItem('cuoi-ho-v1')).fx), 'lite', 'fx lưu ở cấp thiết bị');
    await page.click('#menu .toggle[data-set="fx"]');
    await page.waitForTimeout(120);
    eq(await hook('X.Store.data.fx'), 'full', 'bật lại hiệu ứng đầy đủ');
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
    eq(await hook('X.G.hearts'), 4, 'màn 1 có 4 tim');
    eq(await count(page, '#hud-hearts span'), 4, 'HUD vẽ đủ 4 tim');
    ok(await vis(page, '#btn-hint'), 'nút 💡 Gợi ý hiện khi chơi');
    // Thẻ câu hỏi là một nút thật: phím Z, hoặc Enter khi thẻ đang được chọn bằng Tab, phóng to đồng hồ (không chọn nhầm vòng lửa)
    eq(await page.evaluate(() => document.getElementById('hud-question').getAttribute('role')), 'button', 'thẻ câu hỏi có role=button');
    eq(await page.evaluate(() => document.getElementById('hud-question').getAttribute('tabindex')), '0', 'thẻ câu hỏi bấm được bằng bàn phím');
    ok((await page.evaluate(() => document.getElementById('hud-question').getAttribute('aria-label') || '')).length > 4, 'thẻ câu hỏi có aria-label');
    eq(await page.evaluate(() => document.getElementById('hud-question').getAttribute('aria-pressed')), 'false', 'aria-pressed ban đầu = false');
    await page.keyboard.press('z');
    await page.waitForTimeout(200);
    ok(await page.evaluate(() => document.getElementById('hud-question').classList.contains('zoomed')), 'phím Z phóng to thẻ câu hỏi');
    eq(await page.evaluate(() => document.getElementById('hud-question').getAttribute('aria-pressed')), 'true', 'aria-pressed = true khi đang phóng to');
    ok(await hook('X.G.laneY[0] - X.G.r > X.G.hudBottom'), 'phóng to xong vòng trên vẫn không đè HUD');
    await page.keyboard.press('z');
    await page.waitForTimeout(200);
    ok(!(await page.evaluate(() => document.getElementById('hud-question').classList.contains('zoomed'))), 'ấn Z lần nữa thu lại');
    const gi0 = await hook('X.G.gateIdx');
    await page.focus('#hud-question');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    ok(await page.evaluate(() => document.getElementById('hud-question').classList.contains('zoomed')), 'Enter khi thẻ đang được chọn → phóng to');
    eq(await hook('X.G.phase'), 'choose', 'Enter trên thẻ KHÔNG làm hổ nhảy');
    eq(await hook('X.G.gateIdx'), gi0, 'vẫn ở cụm vòng cũ');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    ok(!(await page.evaluate(() => document.getElementById('hud-question').classList.contains('zoomed'))), 'Enter lần nữa thu lại');
    eq(await page.evaluate(() => document.getElementById('hud-question').getAttribute('aria-pressed')), 'false', 'aria-pressed về false');
    await page.evaluate(() => document.getElementById('hud-question').blur());
    await playRound(page, hook, {});
    await waitOver(page);
    await shot('ipad-land-results');
    ok(await hook('X.G.fxDirty'), 'pháo giấy vẽ trên lớp #fx (không bị lớp mờ che)');
    ok(await page.evaluate(() => { const f = document.getElementById('fx'), g = document.getElementById('game'); const cs = getComputedStyle(f); return !!f && f.width >= innerWidth && f.width <= g.width && Math.round(parseFloat(cs.width)) === innerWidth && cs.pointerEvents === 'none'; }), 'lớp #fx phủ kín màn hình, độ nét ≤ lớp game, không chặn chạm');
    ok(await page.evaluate(() => getComputedStyle(document.querySelector('#gameover .panel')).animationName === 'panel-in'), 'bảng hiện ra có hoạt ảnh panel-in');
    ok(await page.evaluate(() => document.getElementById('btn-practice').hidden), 'về đích → không mời tập luyện');
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
    // 💡 Gợi ý: tắt một vòng sai, câu đó chỉ được nửa điểm và không có thưởng chọn nhanh
    const s0 = await hook('X.G.score');
    await page.click('#btn-hint');
    await page.waitForTimeout(200);
    eq(await hook('X.curGate().hinted'), true, 'gợi ý đánh dấu cụm vòng');
    eq(await hook('X.curGate().rings.filter(function (r) { return r.burst >= 0; }).length'), 1, 'một vòng lửa sai bị tắt');
    eq(await hook('X.curGate().rings[X.curGate().q.answer].burst'), -1, 'không bao giờ tắt vòng đúng');
    ok(await page.evaluate(() => document.getElementById('btn-hint').disabled), 'mỗi cụm chỉ được một gợi ý');
    ok((await text(page, '#hud-hint')).indexOf('💡') === 0, 'gợi ý nhắc lại mẹo của màn');
    const offLane = await hook('X.curGate().rings.findIndex(function (r) { return r.burst >= 0; })');
    await hook('X.choose(' + offLane + ')');
    await page.waitForTimeout(150);
    eq(await hook('X.G.phase'), 'choose', 'chạm vào vòng đã tắt không tính');
    await hook('X.choose(X.curGate().q.answer)');
    await page.waitForTimeout(900);
    eq((await hook('X.G.score')) - s0, 50, 'câu có gợi ý chỉ được nửa điểm (không thưởng nhanh)');
    eq(await hook('X.G.hints'), 1, 'đếm số gợi ý đã dùng');
    await waitChoose(page);
    ok(!(await page.evaluate(() => document.getElementById('btn-hint').disabled)), 'cụm mới lại xin gợi ý được');
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
    eq(await hook('X.G.hearts'), 3, 'mất 1 tim (màn 2 có 4 tim)');
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
    eq(await hook('X.G.hearts'), 2, 'còn 2 tim sau hai lần sai');
    await playRound(page, hook, {});
    await waitOver(page);
    eq(await count(page, '#result-stars .on'), 1, 'sai 2 câu → 1 sao');
    ok((await text(page, '#result-msg')).indexOf('gợi ý') >= 0, 'kết quả ghi số gợi ý đã dùng');
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
    // Số câu ôn lại phải TẤT ĐỊNH: nếu câu ôn trùng câu vừa rút ngẫu nhiên thì gắn nhãn chứ không bỏ qua
    const rev = await hook('({n: X.G.gates.filter(function (g) { return g.q.review; }).length, keys: X.G.gates.filter(function (g) { return g.q.review; }).map(function (g) { return g.q.key; }).sort(), missed: Object.keys(X.Store.p().missed).sort()})');
    eq(rev.n, 2, '2/8 cụm là câu ôn lại');
    eq(rev.keys.join('||'), rev.missed.join('||'), 'đúng các câu bé từng sai được đưa vào ôn lại');
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
    ok(await page.evaluate(() => document.getElementById('btn-pause').disabled), 'đang tạm dừng → ⏸ không còn là nút chết');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(120);
    eq(await hook('X.G.state'), 'playing', 'Escape chơi tiếp');
    ok(!(await page.evaluate(() => document.getElementById('btn-pause').disabled)), 'chơi tiếp → ⏸ dùng lại được');
    await page.keyboard.press(String((await hook('X.curGate().q.answer')) + 1));
    await page.waitForTimeout(120);
    eq(await hook('X.G.phase'), 'jump', 'phím số chọn vòng');
    await hook('X.goMenu()');
  }, { viewport: LAND, initScript: NO_CONFIRM });
  assertClean(log, '[2] sai/hết giờ/ôn lại');
  }

  /* ===== 3. Hết tim; tập luyện không mất tim; hỏi đáp thử lại không mò được ===== */
  if (want(3)) {
  console.log('\n[3] Hết tim, tập luyện, hỏi đáp thử lại');
  log = await withGame('cuoi-ho', async ({ page, hook, shot }) => {
    await page.click('#btn-play');
    await hook('X.startGame(window.Lessons.LEVELS[0])');
    await playRound(page, hook, { wrongAt: [0, 1, 2, 3] });   // màn 1 có 4 tim
    await waitOver(page);
    ok(await page.evaluate(() => document.getElementById('result-title').classList.contains('nolife')), 'hết tim → Hổ mệt rồi');
    // Bảng kết quả che ván chơi: ⏸ và 💡 phải tắt hẳn và mờ đi, không để bé bấm vào nút chết
    const hudOver = await page.evaluate(() => ({
      locked: document.getElementById('hud').classList.contains('locked'),
      pause: document.getElementById('btn-pause').disabled,
      hint: document.getElementById('btn-hint').disabled,
      op: Number(getComputedStyle(document.querySelector('#hud .hud-top')).opacity)
    }));
    ok(hudOver.locked && hudOver.pause && hudOver.hint, 'bảng kết quả → ⏸ và 💡 bị khóa: ' + JSON.stringify(hudOver));
    ok(hudOver.op < 0.6, 'HUD mờ đi khi bị bảng kết quả che (opacity ' + hudOver.op + ')');
    ok(!(await vis(page, '#btn-quiz')), 'không có hỏi đáp khi chưa về đích');
    eq(await count(page, '#result-stars .on'), 0, '0 sao');
    eq(await hook('X.Store.p().levels.l1.plays'), 1, 'vẫn đếm lượt chơi');
    await shot('ipad-land-nolife');
    // Không rơi vào vòng lặp trừng phạt: mời bé tập luyện, chơi không mất tim
    ok(await vis(page, '#btn-practice'), 'hết tim → mời 🐯 Tập luyện');
    await page.click('#btn-practice');
    await waitChoose(page);
    eq(await hook('X.G.practice'), true, 'vào chế độ tập luyện');
    ok(!(await page.evaluate(() => document.getElementById('btn-pause').disabled)), 'vào ván mới → ⏸ dùng lại được');
    for (let i = 0; i < 4; i++) { await waitChoose(page); await hook('X.choose((X.curGate().q.answer + 1) % 3)'); await page.waitForTimeout(1500); }
    eq(await hook('X.G.state'), 'playing', 'sai 4 câu vẫn chơi tiếp (không mất tim)');
    eq(await hook('X.G.hearts'), 4, 'tập luyện: KHÔNG mất tim nào (đúng như nhãn của nút)');
    eq(await count(page, '#hud-hearts span.lost'), 0, 'HUD không có quả tim nào bị mờ đi');
    const recBefore = await hook('X.Store.p().levels.l1.plays');
    await playRound(page, hook, {});
    await waitOver(page);
    ok((await text(page, '#result-title')).indexOf('Tập luyện xong') >= 0, 'kết quả ghi rõ là ván tập luyện');
    eq(await count(page, '#result-stars .on'), 0, 'tập luyện không tính sao');
    eq(await hook('X.Store.p().levels.l1.plays'), recBefore, 'tập luyện không tính vào kỷ lục/lượt chơi');
    ok((await hook('X.Store.p().stats.plays')) >= 2, 'nhưng vẫn đếm vào thống kê luyện tập');
    await shot('ipad-land-practice');
    await hook('X.startGame(window.Lessons.LEVELS[0])');
    eq(await hook('X.G.practice'), false, 'chơi lại bình thường thoát chế độ tập luyện');
    await playRound(page, hook, {});
    await waitOver(page);
    await page.click('#btn-quiz');
    await page.waitForTimeout(250);
    ok(await page.evaluate(() => document.getElementById('btn-pause').disabled && document.getElementById('btn-hint').disabled), 'bảng hỏi đáp che ván chơi → ⏸ và 💡 cũng bị khóa');
    const kinds = await hook('X.Quiz.list.map(function (q) { return q.review ? "R" : q.extra ? "E" : "-"; }).join("")');
    ok(/^-{4}R$/.test(kinds), 'câu cuối lấy từ kho ôn lại (đã sai 4 câu ở ván trước): ' + kinds);
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
    // Cổng là lớp phủ thật: chạm ra ngoài bảng KHÔNG được mở màn bên dưới (iPad không có phím Escape)
    const cardBox = await page.evaluate(() => { const r = document.querySelector('.level-card[data-id="l1"]').getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; });
    await page.mouse.click(cardBox.x, cardBox.y);
    await page.waitForTimeout(400);
    ok(!(await vis(page, '#lesson')), 'chạm nền tối phía sau cổng không mở màn bên dưới');
    ok(!(await vis(page, '#parent-gate')), 'chạm nền tối đóng cổng (không để cổng treo lơ lửng)');
    await page.click('#btn-unlock-all');
    await page.waitForTimeout(200);
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
    // Bảng kết quả ở chiều dọc (ảnh chụp để soi bố cục)
    await hook('X.startGame(window.Lessons.LEVELS[0])');
    await playRound(page, hook, { wrongAt: [2] });
    await waitOver(page);
    await shot('ipad-port-results');
    ok(await page.evaluate(() => document.querySelector('#gameover .panel').getBoundingClientRect().width <= innerWidth), 'bảng kết quả vừa màn hình dọc');
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
    // Chip Combo xuất hiện không được đẩy tim/💡/⏸ ra ngoài mép phải
    for (let i = 0; i < 3; i++) { await waitChoose(page); await hook('X.choose(X.curGate().q.answer)'); await page.waitForTimeout(450); }
    await waitChoose(page);
    await page.waitForTimeout(250);
    const hud = await page.evaluate(() => {
      const r = (id) => document.getElementById(id).getBoundingClientRect();
      return { combo: !document.getElementById('hud-combo').hidden, pauseR: Math.round(r('btn-pause').right), hintR: Math.round(r('btn-hint').right), heartsR: Math.round(r('hud-hearts').right), W: innerWidth };
    });
    ok(hud.combo, 'đã có chip Combo x2');
    ok(hud.pauseR <= hud.W && hud.hintR <= hud.W && hud.heartsR <= hud.W, 'tim, 💡 và ⏸ vẫn trong màn hình khi có Combo: ' + JSON.stringify(hud));
    const g2 = await hook('({top: X.G.laneY[0] - X.G.r, hb: X.G.hudBottom})');
    ok(g2.top > g2.hb - 1, 'vòng trên vẫn không đè HUD sau khi HUD cao thêm');
    await shot('phone-port-play');
    await hook('X.choose((X.curGate().q.answer + 1) % 3)');
    await page.waitForFunction(() => window.__CuoiHo.G.phase === 'learn', null, { timeout: 8000 });
    await page.waitForTimeout(250);
    await shot('phone-port-learn');
    await playRound(page, hook, {});
    await waitOver(page);
    await shot('phone-results');
    ok(await page.evaluate(() => { const p = document.querySelector('#gameover .panel'); return p.getBoundingClientRect().width <= innerWidth && p.scrollHeight >= p.clientHeight; }), 'bảng kết quả vừa màn hình điện thoại');
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
    eq(await page.evaluate(() => getComputedStyle(document.querySelector('#menu .panel')).animationName), 'none', 'bảng không có hoạt ảnh vào');
    // Máy đã bật "giảm chuyển động": công tắc phải nói đúng sự thật (Ít) và bị khóa, không hứa suông
    eq(await page.evaluate(() => document.querySelector('#menu .toggle[data-set="fx"]').getAttribute('aria-pressed')), 'false', 'công tắc Hiệu ứng báo đúng trạng thái thật');
    ok(await page.evaluate(() => document.querySelector('#menu .toggle[data-set="fx"]').disabled), 'công tắc bị khóa vì máy đang giảm chuyển động');
    ok((await text(page, '#menu .toggle[data-set="fx"]')).indexOf('theo cài đặt máy') >= 0, 'nhãn nói rõ lý do');
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
    await hook('X.goMenu()');
    // Ghi nhớ: "🔊 Đọc" đọc cả trang, tô sáng dòng đang đọc, bấm lần nữa thì DỪNG (không đọc lại từ đầu)
    await page.click('#btn-notes');
    await page.waitForTimeout(300);
    const before = await page.evaluate(() => window.fakeTts.speak.length);
    await page.click('#btn-notes-read');
    await page.waitForTimeout(400);
    eq(await hook('X.G.reading'), true, 'đang đọc cả trang → G.reading = true');
    eq(await count(page, '.note-line.speaking'), 1, 'dòng đang đọc được tô sáng');
    const during = await page.evaluate(() => window.fakeTts.speak.length);
    ok(during - before > 5, 'xếp hàng đọc tất cả các dòng (' + (during - before) + ' dòng)');
    await page.click('#btn-notes-read');
    await page.waitForTimeout(400);
    eq(await hook('X.G.reading'), false, 'bấm lần 2 → dừng đọc');
    eq(await count(page, '.note-line.speaking'), 0, 'bỏ tô sáng khi dừng');
    eq(await page.evaluate(() => window.fakeTts.speak.length), during, 'bấm lần 2 KHÔNG đọc lại từ đầu');
    await page.click('#btn-notes-back');
    await page.waitForTimeout(200);
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

  /* ===== 12. Đồng hồ nhỏ trong vòng lửa, dấu ✓/✕, con trỏ bàn phím sau gợi ý, lớp #fx, chạm thẻ câu hỏi ===== */
  if (want(12)) {
  console.log('\n[12] Đồng hồ nhỏ, dấu ✓/✕, gợi ý + bàn phím, lớp #fx');
  log = await withGame('cuoi-ho', async ({ page, hook, shot }) => {
    await page.click('#btn-play');
    // Tìm ván màn 6 có ít nhất một cụm dùng lựa chọn đồng hồ (nhánh "Đồng hồ nào chỉ …")
    let ci = -1;
    for (let a = 0; a < 6 && ci < 0; a++) {
      await hook('X.startGame(window.Lessons.LEVELS[5])');
      await waitChoose(page);
      ci = await hook('X.G.gates.findIndex(function (g) { return g.q.options.some(function (o) { return o.clock; }); })');
    }
    ok(ci >= 0, 'tìm được cụm vòng dùng đồng hồ nhỏ ở màn 6');
    while ((await hook('X.G.gateIdx')) < ci) { await waitChoose(page); await hook('X.choose(X.curGate().q.answer)'); await page.waitForTimeout(450); }
    await waitChoose(page);
    await page.waitForTimeout(300);
    // C1: mặt đồng hồ trong vòng lửa to hơn (r × 0,7) và chữ số ≥ 10 px ngay trên điện thoại
    const mc = await hook('({r: X.G.r, keys: Object.keys(X.G.clockCache), dpr: X.G.dpr})');
    const want07 = Math.round(mc.r * 0.7);
    ok(mc.keys.some((k) => k.split(':')[2] === String(want07)), 'đồng hồ nhỏ vẽ với bán kính r×0,7 = ' + want07 + ' (cache: ' + mc.keys.join(', ') + ')');
    const fs = Math.max(9, mc.r * 0.7 * 0.3);
    ok(fs >= 10, 'cỡ chữ số trên mặt đồng hồ nhỏ = ' + fs.toFixed(1) + ' px (≥ 10)');
    await shot('phone-miniclock');
    // C5: vòng đúng có dấu ✓ trắng, vòng chọn sai có dấu ✕ trắng trên nền đỏ (không chỉ phân biệt bằng màu)
    const probe = `(function () {
      var X = window.__CuoiHo, G = X.G, g = X.curGate();
      var cv = document.getElementById('game'), c2 = cv.getContext('2d');
      var gx = g.wx - G.scroll;
      function box(lane) {
        if (!(lane >= 0)) return 0;
        var bx = (gx + G.r * 0.8) * G.dpr, by = (G.laneY[lane] - G.r * 0.8) * G.dpr;
        var s = Math.max(3, Math.round(G.r * 0.2 * G.dpr));
        var d = c2.getImageData(Math.round(bx - s), Math.round(by - s), s * 2, s * 2).data, w = 0;
        for (var i = 0; i < d.length; i += 4) if (d[i] > 235 && d[i + 1] > 235 && d[i + 2] > 225) w++;
        return w;
      }
      return { chosen: g.chosen, answer: g.q.answer, wrongBadge: box(g.chosen), okBadge: box(g.q.answer) };
    })()`;
    const before = await page.evaluate(probe);
    ok(before.wrongBadge === 0 || before.chosen < 0, 'chưa chọn thì chưa có dấu nào');
    const lanes = await hook('[0, 1, 2].filter(function (i) { return i !== X.curGate().q.answer; })');
    await hook('X.choose(' + lanes[0] + ')');
    await page.waitForFunction(() => window.__CuoiHo.G.phase === 'learn', null, { timeout: 8000 });
    await page.waitForTimeout(400);
    const after = await page.evaluate(probe);
    eq(after.chosen, lanes[0], 'vòng bé chọn được ghi nhận');
    ok(after.wrongBadge > 6, 'vòng sai có dấu ✕ trắng (' + after.wrongBadge + ' điểm ảnh trắng)');
    ok(after.okBadge > 6, 'vòng đúng có dấu ✓ trắng (' + after.okBadge + ' điểm ảnh trắng)');
    await shot('phone-ring-badges');
    // Dấu ✕ ở lại suốt lúc xem đáp án, không tắt cùng ngọn lửa đỏ
    await page.waitForTimeout(1400);
    const late = await page.evaluate(probe);
    ok((await hook('X.curGate().rings[X.curGate().chosen].flare')) === 0, 'ngọn lửa đỏ đã tắt');
    ok(late.wrongBadge > 6, 'dấu ✕ vẫn còn sau khi lửa đỏ tắt (' + late.wrongBadge + ')');
    // Gợi ý + bàn phím: con trỏ không được đứng lại trên vòng vừa bị tắt
    await page.waitForFunction(() => window.__CuoiHo.G.phase === 'choose', null, { timeout: 12000 });
    const wl = await hook('[0, 1, 2].filter(function (i) { return i !== X.curGate().q.answer; })');
    await hook('(X.G.cursor = ' + wl[0] + ', X.G.kbd = true, 0)');
    await page.evaluate(() => { window.__rnd0 = Math.random; Math.random = () => 0; });   // ép gợi ý tắt đúng làn con trỏ đang đứng
    await page.click('#btn-hint');
    await page.waitForTimeout(250);
    await page.evaluate(() => { Math.random = window.__rnd0; });
    const cur = await hook('({cursor: X.G.cursor, off: X.curGate().rings.findIndex(function (r) { return r.burst >= 0; }), burst: X.curGate().rings[X.G.cursor].burst})');
    eq(cur.off, wl[0], 'gợi ý tắt đúng làn con trỏ đang đứng');
    ok(cur.cursor !== wl[0] && cur.burst < 0, 'con trỏ tự dời sang vòng còn cháy (không kẹt): ' + JSON.stringify(cur));
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    ok((await hook('X.G.phase')) !== 'choose', 'ấn Enter sau gợi ý có tác dụng ngay');
    // Lớp #fx: không giữ bộ đệm cả màn hình khi đang chơi
    eq(await page.evaluate(() => document.getElementById('fx').width), 0, 'lớp #fx không chiếm bộ nhớ khi đang chơi');
    await playRound(page, hook, {});
    await waitOver(page);
    ok(await page.evaluate(() => document.getElementById('fx').width > 0), 'lớp #fx được cấp khi có pháo giấy ở bảng kết quả');
    ok(await page.evaluate(() => document.getElementById('fx').width <= Math.ceil(innerWidth * 1.5)), 'lớp #fx dùng độ nét vừa đủ (≤ 1,5×)');
    // Chạm vào thẻ câu hỏi sau khi có bảng kết quả: không phóng to, không dựng lại nền
    const bk = await hook('X.G.builtKey');
    const pt = await page.evaluate(() => { const r = document.getElementById('hud-question').getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; });
    await page.mouse.click(pt.x, pt.y);
    await page.waitForTimeout(250);
    ok(!(await page.evaluate(() => document.getElementById('hud-question').classList.contains('zoomed'))), 'thẻ câu hỏi không phóng to khi bảng kết quả đang che');
    eq(await hook('X.G.builtKey'), bk, 'không dựng lại các lớp nền vì một cú chạm bị che');
    await page.waitForFunction(() => document.getElementById('fx').width === 0, null, { timeout: 12000 });
    ok(true, 'hết pháo giấy thì trả lại bộ đệm lớp #fx');
  }, { viewport: PHONE, initScript: "localStorage.setItem('cuoi-ho-v1', JSON.stringify({ players: { p1: { unlocked: 9 } } }));" });
  assertClean(log, '[12] đồng hồ nhỏ, dấu ✓/✕, gợi ý');
  }

  /* ===== 13. HUD về đích, thêm giờ cho câu lời văn, luyện câu sai, Ghi nhớ ưu tiên, huy hiệu Đã thuộc, hình bài học mới ===== */
  if (want(13)) {
  console.log('\n[13] Về đích, thêm giờ, luyện câu sai, Ghi nhớ ưu tiên, Đã thuộc');
  log = await withGame('cuoi-ho', async ({ page, hook, shot }) => {
    await page.click('#btn-play');
    /* --- C11: về đích thì thẻ câu hỏi báo kết quả và đồng hồ đếm giờ tắt (không còn gì để bấm) --- */
    await hook('X.startGame(window.Lessons.LEVELS[0])');
    await playRound(page, hook, { wrongAt: [1, 4] });
    eq(await hook('X.G.state'), 'over', 'ván kết thúc');
    const fin = await page.evaluate(() => ({
      prompt: document.getElementById('hud-prompt').textContent,
      silent: document.getElementById('hud-timer').classList.contains('silent'),
      timerVisible: getComputedStyle(document.getElementById('hud-timer')).visibility,
      w: Math.round(document.getElementById('hud-timer').getBoundingClientRect().width)
    }));
    ok(fin.prompt.indexOf('Về đích') >= 0 && fin.prompt.indexOf('⭐') >= 0, 'thẻ câu hỏi báo "🏁 Về đích! ⭐ x/8": ' + fin.prompt);
    ok(fin.silent && fin.timerVisible === 'hidden', 'đồng hồ đếm giờ tắt khi về đích');
    ok(fin.w > 0, 'nhưng vẫn giữ chỗ (HUD không nhảy, không phải đo lại bố cục)');
    // Ăn mừng: pháo giấy khi về đích
    ok((await hook('X.G.parts.filter(function (p) { return p.kind === "confetti"; }).length')) > 0, 'có pháo giấy khi về đích');
    await waitOver(page);
    eq(await count(page, '#result-stars .on'), 1, 'sai 2 câu → 1 sao');

    /* --- C17: 🔁 Luyện lại các câu sai --- */
    ok(await vis(page, '#review'), 'có mục 📝 Cần ôn lại');
    eq(await count(page, '#review-chips > span'), 2, '2 chip cần ôn');
    ok(await vis(page, '#btn-drill'), 'có nút 🔁 Luyện lại các câu này');
    const wrongKeys = await hook('X.G.review.map(function (r) { return r.key; }).sort()');
    const playsBefore = await hook('X.Store.p().levels.l1.plays');
    await page.click('#btn-drill');
    await waitChoose(page);
    const d = await hook('({drill: !!X.G.drill, practice: X.G.practice, n: X.G.gates.length, allReview: X.G.gates.every(function (g) { return g.q.review === true; }), keys: X.G.gates.map(function (g) { return g.q.key; }).sort()})');
    ok(d.drill && d.practice, 'ván luyện là một dạng tập luyện (không mất tim, không tính kỷ lục)');
    eq(d.n, 2, 'ván luyện chỉ gồm 2 câu vừa sai');
    ok(d.allReview, 'mọi câu trong ván luyện đều mang nhãn 📝 Ôn lại');
    eq(d.keys.join('||'), wrongKeys.join('||'), 'đúng những câu bé vừa sai');
    ok((await text(page, '#hud-prompt')).indexOf('Ôn lại') >= 0, 'HUD hiện nhãn 📝 Ôn lại');
    await hook('X.choose((X.curGate().q.answer + 1) % 3)');   // sai một câu: không được kết thúc ván sớm
    await page.waitForTimeout(1500);
    ok((await hook('X.G.hearts')) >= 1, 'ván luyện luôn còn ít nhất 1 tim');
    await playRound(page, hook, {});
    await waitOver(page);
    ok((await text(page, '#result-title')).indexOf('Luyện xong') >= 0, 'kết quả ghi rõ là ván luyện câu sai');
    ok((await text(page, '#result-msg')).indexOf('luyện lại 2 câu') >= 0, 'lời nhắn nói rõ số câu đã luyện');
    eq(await hook('X.Store.p().levels.l1.plays'), playsBefore, 'ván luyện không tính vào lượt chơi/kỷ lục');
    await shot('ipad-land-drill');

    /* --- C15: câu có lời văn (màn 8) được cộng thêm giây để đọc đề --- */
    await hook('X.startGame(window.Lessons.LEVELS[7])');
    let sawExtra = false, sawPlain = false;
    for (let i = 0; i < 10 && !(sawExtra && sawPlain); i++) {
      await waitChoose(page);
      await page.waitForTimeout(180);
      const info = await hook('({e: X.curGate().q.extraTime, lim: X.gateLimit(X.curGate()), t: X.G.level.timer})');
      const shown = Number(await text(page, '#hud-time'));
      if (info.e > 0) {
        eq(info.lim, info.t + 4, 'câu lời văn được cộng 4 giây');
        if (!sawExtra) ok(shown > info.t, 'đồng hồ HUD hiện ' + shown + ' giây (> ' + info.t + ')');
        sawExtra = true;
      } else {
        eq(info.lim, info.t, 'câu ngắn giữ nguyên ' + info.t + ' giây');
        if (!sawPlain) ok(shown <= info.t, 'đồng hồ HUD hiện ' + shown + ' giây (≤ ' + info.t + ')');
        sawPlain = true;
      }
      await hook('X.choose(X.curGate().q.answer)');
      await page.waitForTimeout(300);
    }
    ok(sawExtra, 'màn 8 có câu lời văn được thêm giờ');
    ok(sawPlain, 'màn 8 vẫn có câu ngắn giữ nguyên giờ');
    await hook('X.endGame("nolife")');
    await waitOver(page);

    /* --- C14: Ghi nhớ đưa phần bé đang sai lên đầu, gắn 📝 --- */
    await hook('X.startGame(window.Lessons.LEVELS[4])');    // màn 5 – giờ kém
    await playRound(page, hook, { wrongAt: [0, 2] });
    await waitOver(page);
    await hook('X.goMenu()');
    await page.waitForTimeout(250);
    await page.click('#btn-notes');
    await page.waitForTimeout(300);
    ok(await vis(page, '#notes'), 'mở Ghi nhớ');
    const nt = await page.evaluate(() => {
      const gs = Array.from(document.querySelectorAll('.note-group'));
      return {
        hint: !!document.querySelector('.notes-hint'),
        titles: gs.map((g) => g.querySelector('h3').textContent),
        need: gs.map((g) => g.classList.contains('need')),
        n: gs.length,
        lines: document.querySelectorAll('.note-line').length
      };
    });
    ok(nt.hint, 'có dòng giải thích dấu 📝');
    // (những câu sai ở màn 1 có thể đã được xóa khỏi kho ôn khi bé trả lời đúng lại 2 lần — chỉ màn 5 là chắc chắn còn)
    const needIdx = nt.need.reduce((a, v, i) => (v ? a.concat(i) : a), []);
    const at = (s) => nt.titles.findIndex((t) => t.indexOf(s) >= 0);
    ok(needIdx.length >= 1, 'có phần cần ôn sau khi bé sai ở màn 5');
    // Mọi nhóm cần ôn phải nằm liền nhau ở đầu danh sách, và đều được gắn 📝
    eq(needIdx.join(','), needIdx.map((_, i) => i).join(','), 'các phần cần ôn được xếp lên đầu: ' + JSON.stringify(nt.titles));
    ok(needIdx.every((i) => nt.titles[i].indexOf('📝') === 0), 'mỗi phần cần ôn được gắn 📝');
    ok(nt.need[at('Màn 5')], 'phần bé vừa sai (màn 5) được gắn 📝');
    ok(at('Màn 5') < at('Màn 2') && at('Màn 5') < at('Màn 4'), 'màn 5 được đẩy lên trước các màn bé chưa sai (thứ tự: ' + JSON.stringify(nt.titles) + ')');
    ok(!nt.titles.slice(needIdx.length).some((t) => t.indexOf('📝') >= 0), 'phần chưa sai lần nào thì không gắn 📝');
    eq(nt.n, 8, 'vẫn đủ 8 nhóm ghi nhớ');
    eq(nt.lines, 17, 'vẫn đủ 17 dòng ghi nhớ');
    await shot('ipad-land-notes-need');

    /* --- Huy hiệu "Đã thuộc" (≥ 90% trên ≥ 20 câu) trên thẻ màn và trong báo cáo --- */
    await hook('(X.Store.p().stats.byTopic.l5 = { c: 30, w: 1 }, X.Store.save(), 0)');
    await page.click('#btn-notes-back');
    await page.waitForTimeout(250);
    await page.click('#btn-play');
    await page.waitForTimeout(300);
    eq(await count(page, '.level-card[data-id="l5"] .mastered'), 1, 'thẻ màn 5 có huy hiệu ✅ Đã thuộc');
    eq(await count(page, '.level-card[data-id="l1"] .mastered'), 0, 'màn chưa đủ số câu thì không có huy hiệu');
    ok((await page.evaluate(() => document.querySelector('.level-card[data-id="l5"]').getAttribute('aria-label'))).indexOf('đã thuộc') > 0, 'aria-label nói rõ "đã thuộc"');
    await page.click('#btn-report-levels');
    await page.waitForTimeout(300);
    eq(await count(page, '#report-levels .mastered'), 1, 'báo cáo cho phụ huynh cũng ghi ✅ Đã thuộc');
    ok((await text(page, '#report-review')).indexOf('Màn 5') >= 0, 'mục Cần ôn lại của báo cáo có câu màn 5');
    await page.click('#btn-report-back');
    await page.waitForTimeout(250);

    /* --- C13/C14: hình minh họa mới của bài học màn 7 (băng 24 giờ, phép tính viết to) --- */
    await hook('X.showLesson(window.Lessons.LEVELS[6], "levels")');
    await page.waitForTimeout(250);
    let strip = null, math = null;
    for (let i = 0; i < 8; i++) {
      const v = await page.evaluate(() => ({
        strip: document.querySelectorAll('#slide-visual .h24-strip .row span').length,
        rows: document.querySelectorAll('#slide-visual .h24-strip .row').length,
        math: (document.querySelector('#slide-visual .math-art') || {}).textContent || ''
      }));
      if (v.strip && !strip) { strip = v; await shot('ipad-land-lesson-24h-strip'); }
      if (v.math && !math) { math = v.math; await shot('ipad-land-lesson-24h-math'); }
      if (strip && math) break;
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(200);
    }
    ok(!!strip, 'bài học màn 7 có băng 24 giờ');
    if (strip) { eq(strip.strip, 24, 'băng 24 giờ có đủ 24 ô'); eq(strip.rows, 2, 'xếp thành 2 hàng thẳng cột'); }
    ok(!!math && /\d/.test(math), 'bài học màn 7 có phép tính viết to: ' + math);

    /* --- C18: điện thoại nằm ngang (844×390) vẫn chơi được: vòng lửa xếp sát nhau, không đè HUD --- */
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(400);
    await hook('X.startGame(window.Lessons.LEVELS[0])');
    await waitChoose(page);
    await page.waitForTimeout(300);
    const lc = await hook('({r: X.G.r, top: X.G.laneY[0] - X.G.r, hb: X.G.hudBottom, low: X.G.laneY[2] + X.G.r, gr: X.G.ground, tiger: X.G.tigerX + 1.14 * X.G.r < X.G.stopX - X.G.r})');
    ok(lc.r >= 26, 'vòng lửa vẫn đủ to để đọc (r = ' + lc.r.toFixed(1) + ')');
    ok(lc.top > lc.hb - 1, 'vòng trên không đè HUD khi máy nằm ngang (top=' + lc.top.toFixed(0) + ' > hud=' + lc.hb.toFixed(0) + ')');
    ok(lc.low <= lc.gr + 1, 'vòng dưới không lún xuống đất');
    ok(lc.tiger, 'đầu hổ không che vòng dưới cùng');
    // Mẹo "👆 Chạm để chạy tiếp" phải còn nhìn thấy khi máy nằm ngang (trước đây bị ẩn hẳn)
    await hook('X.choose((X.curGate().q.answer + 1) % 3)');
    await page.waitForFunction(() => window.__CuoiHo.G.phase === 'learn', null, { timeout: 8000 });
    await page.waitForTimeout(250);
    const tip = await page.evaluate(() => {
      const el = document.getElementById('tap-tip'), cs = getComputedStyle(el), r = el.getBoundingClientRect();
      return { hidden: el.hidden, display: cs.display, text: el.textContent, h: Math.round(r.height), bottom: Math.round(r.bottom) };
    });
    ok(!tip.hidden && tip.display !== 'none' && tip.h > 10, 'mẹo chạm để chạy tiếp vẫn hiện khi nằm ngang: ' + JSON.stringify(tip));
    ok(tip.text.indexOf('Chạm') >= 0, 'mẹo nói đúng việc cần làm');
    ok(tip.bottom <= 390, 'mẹo nằm gọn trong màn hình');
    await shot('phone-landscape-play');
    await hook('X.goMenu()');
  }, { viewport: LAND, initScript: NO_CONFIRM + " localStorage.setItem('cuoi-ho-v1', JSON.stringify({ seenTip: true, players: { p1: { unlocked: 9 } } }));" });
  assertClean(log, '[13] về đích/luyện câu sai/ghi nhớ');
  }

  /* ===== 14. Tín hiệu đúng/sai trên vòng lửa: câu trả lời ĐÚNG không bao giờ bị đóng dấu ✕ đỏ ===== */
  if (want(14)) {
  console.log('\n[14] Dấu ✓ xanh / ✕ đỏ đúng tín hiệu');
  // Đếm điểm ảnh đúng màu huy hiệu trong ô nhỏ ở góc trên-phải của một vòng lửa (cài vào trang, CSP không cho eval)
  const INSTALL_COUNT = () => {
    window.badgeCount = function (c2, G, gx, lane) {
      var bx = (gx + G.r * 0.8) * G.dpr, by = (G.laneY[lane] - G.r * 0.8) * G.dpr;
      var s = Math.max(4, Math.round(G.r * 0.26 * G.dpr));
      var d = c2.getImageData(Math.round(bx - s), Math.round(by - s), s * 2, s * 2).data;
      var red = 0, green = 0;
      for (var i = 0; i < d.length; i += 4) {
        var R = d[i], Gc = d[i + 1], B = d[i + 2];
        if (Math.abs(R - 239) < 25 && Math.abs(Gc - 71) < 25 && Math.abs(B - 111) < 25) red++;      // #ef476f = dấu ✕
        if (Math.abs(R - 6) < 45 && Math.abs(Gc - 214) < 45 && Math.abs(B - 160) < 45) green++;     // #06d6a0 = dấu ✓
      }
      return { red: red, green: green };
    };
  };
  log = await withGame('cuoi-ho', async ({ page, hook, shot }) => {
    await page.click('#btn-play');
    await hook('X.startGame(window.Lessons.LEVELS[0])');
    await waitChoose(page);
    await page.waitForTimeout(300);
    await page.evaluate(INSTALL_COUNT);
    // Trả lời ĐÚNG: theo dõi từng khung hình trong lúc vòng lửa tắt dần (burst 0 → 1)
    const good = await page.evaluate(() => new Promise((resolve) => {
      const count = window.badgeCount;
      const X = window.__CuoiHo, G = X.G, g = X.curGate(), lane = g.q.answer;
      const c2 = document.getElementById('game').getContext('2d');
      const samples = [];
      X.choose(lane);
      const t0 = Date.now();
      (function step() {
        const rg = g.rings[lane];
        if (g.evaluated && rg.burst >= 0 && rg.burst < 0.95) samples.push(Object.assign({ burst: Math.round(rg.burst * 100) / 100 }, count(c2, G, g.wx - G.scroll, lane)));
        G.parts.length = 0; G.texts.length = 0;   // dọn tia lửa/chữ bay để phép đo bớt nhiễu (chỉ trong lúc kiểm thử)
        if (rg.burst >= 0.95 || Date.now() - t0 > 5000) {
          return resolve({
            result: g.result, n: samples.length,
            redMax: samples.reduce((a, x) => Math.max(a, x.red), 0),
            greenMax: samples.reduce((a, x) => Math.max(a, x.green), 0)
          });
        }
        requestAnimationFrame(step);
      })();
    }));
    eq(good.result, 'ok', 'chọn đúng thì kết quả là ok');
    ok(good.n > 3, 'đo được nhiều khung hình lúc vòng lửa tắt (' + good.n + ')');
    ok(good.greenMax > 6, 'vòng bé chọn ĐÚNG mang dấu ✓ XANH (' + good.greenMax + ' điểm ảnh #06d6a0)');
    ok(good.redMax < 100, 'không có huy hiệu ✕ ĐỎ nào nở ra trên vòng trả lời đúng (đỏ nhiều nhất ' + good.redMax + ' điểm ảnh; một huy hiệu thật ~800)');
    await shot('ipad-land-ok-badge');
    // Phép đo tất định trên một cụm vòng chưa trả lời: dựng đúng trạng thái vẽ rồi vẽ một khung hình,
    // hổ được dời ra ngoài khung để trong ô đo chỉ còn huy hiệu (không lẫn màu áo của bé hay tia lửa).
    await waitChoose(page);
    await page.waitForTimeout(250);
    const stamp = await page.evaluate(() => {
      const X = window.__CuoiHo, G = X.G, g = X.curGate();
      const c2 = document.getElementById('game').getContext('2d');
      const lane = g.q.answer, wrong = (lane + 1) % 3;
      const tigerX = G.tigerX;
      G.tigerX = -9999;
      function measure(setup) {
        g.chosen = -1; g.result = null; g.evaluated = false;
        g.rings.forEach(function (r) { r.burst = -1; r.flare = 0; r.reveal = false; });
        G.parts.length = 0; G.texts.length = 0;
        setup();
        X.render();
        const gx = g.wx - G.scroll;
        return { onAnswer: window.badgeCount(c2, G, gx, lane), onWrong: window.badgeCount(c2, G, gx, wrong) };
      }
      const out = {
        correct: measure(function () { g.chosen = lane; g.result = 'ok'; g.evaluated = true; g.rings[lane].burst = 0.05; }),
        wrong: measure(function () { g.chosen = wrong; g.result = 'bad'; g.evaluated = true; g.rings[wrong].flare = 1; g.rings[lane].reveal = true; })
      };
      measure(function () {});                     // trả cụm vòng về đúng nguyên trạng (chưa trả lời)
      G.tigerX = tigerX;
      X.render();
      return out;
    });
    ok(stamp.correct.onAnswer.green > 20, 'vẽ lại: vòng trả lời đúng có dấu ✓ xanh (' + stamp.correct.onAnswer.green + ' điểm ảnh)');
    eq(stamp.correct.onAnswer.red, 0, 'vẽ lại: KHÔNG một điểm ảnh ✕ đỏ nào trên vòng trả lời đúng');
    eq(stamp.correct.onWrong.red, 0, 'vẽ lại: vòng không được chọn cũng không mang dấu ✕');
    ok(stamp.wrong.onWrong.red > 20, 'vẽ lại: chọn sai thì đúng vòng đó mang dấu ✕ đỏ (' + stamp.wrong.onWrong.red + ' điểm ảnh)');
    eq(stamp.wrong.onWrong.green, 0, 'vẽ lại: vòng chọn sai không mang dấu ✓');
    ok(stamp.wrong.onAnswer.green > 20, 'vẽ lại: vòng đúng được hé lộ với dấu ✓ xanh (' + stamp.wrong.onAnswer.green + ' điểm ảnh)');
    eq(stamp.wrong.onAnswer.red, 0, 'vẽ lại: vòng đúng không mang dấu ✕');
    // Ván vẫn chạy bình thường sau phép đo
    await hook('X.choose(X.curGate().q.answer)');
    await page.waitForTimeout(900);
    eq(await hook('X.G.state'), 'playing', 'ván vẫn chơi tiếp bình thường sau phép đo');
    ok((await hook('X.G.correct')) >= 2, 'hai câu trả lời đúng đều được tính');
    await hook('X.goMenu()');
  }, { viewport: LAND, initScript: NO_CONFIRM + " localStorage.setItem('cuoi-ho-v1', JSON.stringify({ seenTip: true, players: { p1: { unlocked: 9 } } }));" });
  assertClean(log, '[14] dấu ✓/✕');
  }

  if (failures) { console.error('\ncuoi-ho e2e: ' + failures + ' kiểm tra thất bại'); process.exitCode = 1; }
  else console.log('\ncuoi-ho e2e: tất cả kiểm tra đạt');
})().catch((e) => { console.error(e); process.exit(1); });
