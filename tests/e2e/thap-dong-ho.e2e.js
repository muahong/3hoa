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
    await shot('landscape-menu');
    // Hiệu ứng: Ít ↔ Nhiều
    await page.click('#menu .toggle[data-set="fx"]');
    assert.equal(await hook('X.Store.data.fx'), 'lite');
    assert.ok(await page.$eval('html', (e) => e.classList.contains('lite-fx')), 'lite-fx trên <html>');
    assert.equal(await hook('X.Motion.lite'), true);
    await page.click('#menu .toggle[data-set="fx"]');
    assert.equal(await hook('X.Store.data.fx'), 'full');
    await page.click('#btn-play');
    await page.waitForTimeout(300);
    assert.ok(await vis(page, '#levels'), 'màn hình chọn màn');
    assert.ok((await page.$eval('#toast', (e) => e.textContent)).indexOf('Chào Bé') >= 0, 'chào bé theo tên');
    const cards = await page.$$eval('.level-card', (c) => c.map((x) => ({ tab: x.getAttribute('tabindex'), locked: x.classList.contains('locked'), aria: x.getAttribute('aria-label') })));
    assert.equal(cards.length, 8);
    assert.equal(cards[0].tab, '0'); assert.ok(!cards[0].locked && /Màn 1/.test(cards[0].aria));
    assert.equal(cards[1].tab, '-1'); assert.ok(cards[1].locked);
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
    await shot('landscape-lesson-L1');

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
    await shot('landscape-play-wrong');
    assert.ok(await stepUntilPiece(page));
    const nx = JSON.parse(await hook('JSON.stringify({ review: X.G.piece.review, read: X.K.read(X.G.piece.t), tag: document.getElementById("hud-review").hidden })'));
    assert.ok(nx.review && nx.read === missedRead && nx.tag === false, 'đồng hồ kế tiếp là câu ôn lại: ' + JSON.stringify(nx));
    // A2: rơi hết giờ (không chạm) = sai, không cộng điểm
    const to = JSON.parse(await hook('(function () { const p = X.G.piece, s = X.G.score; p.row = p.land; X.landPiece(p); return JSON.stringify({ timeouts: X.G.timeouts, wrong: X.G.wrong, score: X.G.score - s, piece: !!X.G.piece }); })()'));
    assert.equal(to.timeouts, 1); assert.equal(to.wrong, wrongBefore + 2); assert.equal(to.score, 0); assert.ok(!to.piece);

    /* ---- 3. Chơi đúng tới hết màn → tổng kết → hỏi đáp ---- */
    const done = await playCorrect(page);
    assert.equal(done.state, 'clear', 'hoàn thành màn: ' + JSON.stringify(done));
    await page.evaluate(() => { const X = window.__ThapDongHo; for (let i = 0; i < 30; i++) X.update(0.1); });
    await page.waitForTimeout(300);
    assert.ok(await vis(page, '#summary'), 'màn hình tổng kết');
    assert.equal(await hook('X.G.piece'), null, 'không còn đồng hồ đứng hình');
    assert.equal(await page.$eval('#st-correct', (e) => e.textContent), '8');
    assert.ok(await page.$('#btn-sum-replay'));
    const st = JSON.parse(await hook('JSON.stringify({ lv: X.Store.p().levels.L1, st: X.Store.p().stats })'));
    assert.equal(st.lv.done, 1); assert.ok(st.lv.best > 0);
    assert.equal(st.st.plays, 1); assert.equal(st.st.byTopic.L1.c, 8); assert.ok(st.st.byTopic.L1.w >= 2); assert.equal(st.st.byTopic.L1.t, 1); assert.ok(st.st.seconds > 0);
    await shot('landscape-summary');
    await page.click('#btn-quiz');
    await page.waitForTimeout(300);
    assert.ok(await vis(page, '#quiz'), 'hỏi đáp');
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

    /* ---- 4. Xoay màn hình, màn 5 và màn 7 (nhãn buổi dưới mặt đồng hồ) ---- */
    await hook('X.startLevel(X.K.LEVELS[4])');
    await page.setViewportSize(PORT);
    await page.waitForTimeout(700);
    assert.equal(await hook('X.G.landscape'), false);
    assert.ok(await hook('X.G.board.x + X.G.board.w <= 820 && X.G.board.x >= 0'));
    assert.ok(await waitPlaying(page));
    const bgSame = await hook('(function () { const bg = X.G.bg; X.resize(); X.resize(); return X.G.bg === bg; })()');
    assert.ok(bgSame, 'resize() cùng kích thước không dựng lại nền');
    await playWrong(page);
    await page.waitForTimeout(150);
    await shot('portrait-L5');
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
  const log = await withGame('thap-dong-ho', async ({ page, hook }) => {
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
  }, { initScript: "localStorage.setItem('thap-dong-ho-v1', " + JSON.stringify(JSON.stringify(legacy)) + ");", reducedMotion: 'reduce' });
  const ok1 = assertClean(log, 'run 2a – di trú dữ liệu cũ');
  const hostile = '{"levels":[1,2],"unlocked":"9","__proto__":{"polluted":1},"players":{"__proto__":{"x":1},"bad id":{"unlocked":8}}}';
  const log2 = await withGame('thap-dong-ho', async ({ page, hook }) => {
    assert.equal(await hook('X.G.state'), 'menu');
    assert.deepEqual(await hook('X.Store.p().levels'), {});
    assert.equal(await hook('X.Store.p().unlocked'), 1);
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
    assert.ok(await hook('X.G.board.cell >= 40'), 'ô ≥ 40 px');
    assert.ok(await hook('X.G.landscape === false'));
    await playWrong(page);
    const geo = await page.evaluate(() => { const X = window.__ThapDongHo, h = document.getElementById('hud-hint').getBoundingClientRect(); return { hintBottom: h.bottom, titleTop: X.G.big.y - X.G.big.cardH / 2 - X.G.big.titleH, hidden: document.getElementById('hud-hint').hidden }; });
    assert.ok(!geo.hidden && geo.hintBottom <= geo.titleTop + 1, 'chip gợi ý không đè tiêu đề đồng hồ lớn: ' + JSON.stringify(geo));
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
  }, { viewport: PHONE, reducedMotion: 'reduce' });
  return assertClean(log, 'run 3 – điện thoại dọc');
}

(async () => {
  const ok = [await run1(), await run2(), await run3()];
  if (ok.every(Boolean)) console.log('thap-dong-ho e2e: tất cả sạch.');
  else { console.error('thap-dong-ho e2e: có lỗi.'); process.exit(1); }
})().catch((e) => { console.error(e); process.exit(1); });
