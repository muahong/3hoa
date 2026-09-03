'use strict';
/* Kiểm thử đầu-cuối Mê Cung Đồng Hồ (Playwright). Chạy:
     NODE_PATH=/opt/node22/lib/node_modules node tests/e2e/me-cung-dong-ho.e2e.js
   Bốn lượt: (1) iPad ngang – luồng đầy đủ menu → màn → chơi → hỏi đáp → kết quả, hồ sơ, báo cáo, cổng phụ huynh, lỗi toàn cục;
             (2) di trú dữ liệu cũ + dữ liệu hỏng; (3) điện thoại dọc 390×844; (4) tải lại trang khi máy chủ đã tắt (service worker, A12). */
const assert = require('node:assert/strict');
const { withGame, assertClean } = require('./lib/browser.js');

const LEGACY = { sound: true, music: false, voice: true, unlocked: 3, records: { l1: { best: 1200, stars: 3, passed: true, plays: 2 }, l2: { best: 'abc', stars: 99 } } };

function helpers(page) {
  const H = {};
  H.state = () => page.evaluate(() => window.__MeCung.G.state);
  H.waitState = (s, ms) => page.waitForFunction((s) => window.__MeCung.G.state === s, s, { timeout: ms || 8000 });
  H.visible = (sel) => page.evaluate((sel) => { const el = document.querySelector(sel); if (!el) return false; const r = el.getBoundingClientRect(); return !!(r.width && r.height) && getComputedStyle(el).visibility !== 'hidden' && !el.closest('.screen.hidden'); }, sel);
  H.rect = (sel) => page.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return { x: r.left, y: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; }, sel);
  H.godMode = () => page.evaluate(() => { window.__MeCung.G.invuln = 1e9; });   // kiểm thử: ma không bắt được Cú Tí
  H.startLevel = async (idx) => {
    await page.evaluate((i) => window.__MeCung.showLesson(window.Clock.LEVELS[i]), idx);
    await page.waitForSelector('#lesson:not(.hidden)');
    await page.click('#btn-lesson-play');
    await H.waitState('countdown', 3000);
    await H.godMode();
    await H.waitState('playing', 8000);
    await H.godMode();
  };
  H.geom = () => page.evaluate(() => { const G = window.__MeCung.G; return { cell: G.cell, ox: G.ox, oy: G.oy, fy: G.field.y, fh: G.field.h, hud: document.querySelector('#hud .hud-top').getBoundingClientRect().height }; });
  H.finishLevel = () => page.evaluate(() => new Promise((resolve) => {
    const X = window.__MeCung; let guard = 0;
    (function step() {
      const G = X.G;
      if (G.state === 'quiz' || G.state === 'result' || guard++ > 600) return resolve(G.state);
      G.invuln = 1e9;
      if (G.state === 'playing' && G.nextRoundAt < 0) { const it = G.items.find((i) => i.correct && !i.taken); if (it) X.teleport(it.r, it.c); }
      for (let k = 0; k < 5; k++) X.update(0.1);
      setTimeout(step, 5);
    })();
  }));
  H.finishQuiz = () => page.evaluate(() => new Promise((resolve) => {
    const X = window.__MeCung; let guard = 0;
    (function step() {
      const G = X.G;
      if (G.state === 'result' || guard++ > 60) return resolve(G.state);
      if (G.quiz && G.quiz.answered) X.quizNext(); else if (G.quiz && G.quiz.current) X.quizAnswer(G.quiz.current.answer);
      setTimeout(step, 20);
    })();
  }));
  return H;
}

async function run1() {
  const log = await withGame('me-cung-dong-ho', async ({ page, hook, shot, log }) => {
    const H = helpers(page);
    // 1. Khởi động
    assert.equal(await H.state(), 'menu');
    assert.ok(await H.visible('#menu'), 'menu hiện');
    const chip = await page.textContent('#btn-player');
    assert.ok(chip.includes('Bé') && chip.includes('🐯'), 'chip người chơi: ' + chip);
    assert.equal(await page.getAttribute('#toast', 'role'), 'status');
    assert.ok((await page.getAttribute('.toggle[data-set="fx"]', 'aria-pressed')) !== null, 'toggle có aria-pressed');
    await shot('menu');
    await page.click('#btn-play');
    await H.waitState('levels');
    assert.equal(await page.locator('.level-card').count(), 8);
    assert.ok(await page.locator('.level-card').first().evaluate((el) => el.classList.contains('current')));
    assert.equal(await page.locator('.level-card:not(.locked)').count(), 1);
    assert.ok(await H.visible('#btn-report-levels'));
    await shot('levels');

    // 2. Màn 1: bố cục đóng băng (A3), chọn nhầm không biến mất ngay (A1), chạm hai lần không chơi lại (A16)
    await page.evaluate(() => window.__MeCung.showLesson(window.Clock.LEVELS[0]));
    await page.waitForSelector('#lesson:not(.hidden)');
    assert.equal(await page.textContent('#btn-lesson-play'), '▶ Vào mê cung');
    await page.click('#btn-lesson-play');
    await H.waitState('countdown', 3000);
    await H.godMode();
    const wobble0 = await page.evaluate(() => window.__MeCung.G.items[0].wobble);
    await page.evaluate(() => document.getElementById('btn-lesson-play').click());   // chạm hai lần trong lúc đếm ngược: không bắt đầu lại
    await page.waitForTimeout(100);
    assert.equal(await H.state(), 'countdown');
    assert.equal(await page.evaluate(() => window.__MeCung.G.items[0].wobble), wobble0, 'không bắt đầu lại màn');
    await H.waitState('playing', 8000);
    await H.godMode();
    const g0 = await H.geom();
    assert.ok(g0.cell >= 30, 'ô ≥ 30 px trên iPad ngang, có ' + g0.cell);
    const wrong = await page.evaluate(() => { const G = window.__MeCung.G; const it = G.items.find((i) => !i.correct); return { r: it.r, c: it.c }; });
    await hook('X.teleport(' + wrong.r + ', ' + wrong.c + ') || true');
    await H.godMode();
    let st = await page.evaluate(() => { const G = window.__MeCung.G; const it = G.items.find((i) => i.wrongAt); return { lives: G.lives, wrong: G.wrong, mistakes: G.mistakes.length, taken: it ? it.taken : null, hint: document.getElementById('hud-hint').hidden, missed: Object.keys(window.__MeCung.Store.p().missed) }; });
    assert.equal(st.lives, 2); assert.equal(st.wrong, 1); assert.equal(st.mistakes, 1);
    assert.equal(st.taken, false, 'đồng hồ chọn nhầm còn hiện (không biến mất ngay)');
    assert.equal(st.hint, false, 'gợi ý hiện');
    assert.equal(st.missed.length, 1, 'noteMissed');
    assert.match(st.missed[0], /^analog\|\d+:\d+$/);
    await page.waitForTimeout(1200);
    const g1 = await H.geom();
    assert.deepEqual([g1.cell, g1.ox, g1.oy, g1.hud], [g0.cell, g0.ox, g0.oy, g0.hud], 'bố cục không đổi khi có gợi ý: ' + JSON.stringify([g0, g1]));
    await shot('play-hint');
    // đồng hồ đúng rồi đồng hồ thừa
    const ok = await page.evaluate(() => { const it = window.__MeCung.G.items.find((i) => i.correct); return { r: it.r, c: it.c }; });
    await hook('X.teleport(' + ok.r + ', ' + ok.c + ') || true');
    st = await page.evaluate(() => { const G = window.__MeCung.G; return { round: G.round, lives: G.lives, next: G.nextRoundAt, left: G.items.filter((i) => !i.taken).length }; });
    assert.equal(st.round, 1); assert.ok(st.next > 0); assert.equal(st.left, 0, 'các đồng hồ còn lại không còn "ăn" được');
    const leftover = await page.evaluate(() => { const it = window.__MeCung.G.items.find((i) => !i.correct && !i.wrongAt); return { r: it.r, c: it.c }; });
    await hook('X.teleport(' + leftover.r + ', ' + leftover.c + ') || true');
    st = await page.evaluate(() => { const G = window.__MeCung.G; return { lives: G.lives, wrong: G.wrong, mistakes: G.mistakes.length }; });
    assert.deepEqual(st, { lives: 2, wrong: 1, mistakes: 1 }, 'đồng hồ thừa sau khi ăn đúng không gây mất tim (A1)');

    // 3. Sao sức mạnh: ma thả ra trong lúc buồn ngủ cũng buồn ngủ (A6); HUD trong màn hình
    await page.evaluate(() => { for (let k = 0; k < 20; k++) window.__MeCung.update(0.1); });   // sang lượt mới
    assert.equal(await page.evaluate(() => window.__MeCung.G.round), 1);
    const pw = await page.evaluate(() => { const p = window.__MeCung.G.powers.find((x) => !x.taken); return { r: p.r, c: p.c }; });
    await hook('X.teleport(' + pw.r + ', ' + pw.c + ') || true');
    await H.godMode();
    assert.ok((await page.evaluate(() => window.__MeCung.G.fright)) > 0, 'ma buồn ngủ');
    const ghosts = await page.evaluate(() => { const X = window.__MeCung; X.G.invuln = 1e9; for (let k = 0; k < 60; k++) { X.update(0.05); X.G.invuln = 1e9; } return X.G.ghosts.map((g) => g.state); });
    assert.ok(ghosts.some((s) => s !== 'home'), 'có ma đã ra: ' + ghosts);
    assert.ok(ghosts.filter((s) => s !== 'home').every((s) => s === 'fright'), 'ma ra trong lúc buồn ngủ phải buồn ngủ: ' + ghosts);
    assert.ok(await H.visible('#hud-power'), 'thẻ sao hiện');
    const g2 = await H.geom();
    assert.deepEqual([g2.cell, g2.ox, g2.oy, g2.hud], [g0.cell, g0.ox, g0.oy, g0.hud], 'bố cục không đổi khi có thẻ sao');
    for (const sel of ['#btn-pause', '#hud-lives', '#btn-hud-speak']) {
      const r = await H.rect(sel);
      assert.ok(r.x >= 0 && r.r <= 1180 && r.y >= 0, sel + ' trong màn hình: ' + JSON.stringify(r));
    }
    await shot('play');
    assert.ok((await H.rect('#btn-hud-speak')).w >= 44, 'nút nghe ≥ 44 px');

    // 4. Chơi hết màn -> hỏi đáp -> kết quả
    assert.equal(await H.finishLevel(), 'quiz');
    assert.ok(await H.visible('#quiz'));
    assert.ok(await H.visible('#btn-quiz-quit'), 'có nút thoát hỏi đáp');
    const total = await page.evaluate(() => window.__MeCung.G.quiz.total);
    assert.equal(total, 4, 'có lỗi trong mê cung -> 4 câu');
    assert.ok(await page.evaluate(() => { const q = window.__MeCung.G.quiz.current; return q.reviewKey && q.clock; }), 'câu đầu là câu rút kinh nghiệm');
    await shot('quiz');
    // trả lời sai một lần
    await page.evaluate(() => { const X = window.__MeCung, q = X.G.quiz.current; X.quizAnswer((q.answer + 1) % q.options.length); });
    assert.equal(await page.locator('.opt.wrong').count(), 1);
    assert.equal(await page.locator('.opt.right').count(), 1);
    assert.ok((await page.getAttribute('.opt.right', 'aria-label')).startsWith('Đúng'));
    assert.ok(await H.visible('#quiz-feedback'));
    assert.equal(await page.evaluate(() => window.__MeCung.G.quiz.queue.length), 4, 'câu sai được hỏi lại');
    await page.click('#btn-quiz-next');
    // phím số trả lời
    const ans = await page.evaluate(() => window.__MeCung.G.quiz.current.answer);
    await page.keyboard.press(String(ans + 1));
    assert.equal(await page.evaluate(() => window.__MeCung.G.quiz.answered), true, 'phím số 1–4 trả lời');
    assert.equal(await page.evaluate(() => window.__MeCung.G.quiz.firstTry), 1);
    await page.keyboard.press('Enter');
    assert.equal(await H.finishQuiz(), 'result');
    assert.ok(await H.visible('#result'));
    assert.ok(await H.visible('#btn-next-level'));
    assert.ok(await H.visible('#result-unlock'));
    const store = await hook('X.Store.p()');
    assert.equal(store.records.l1.passed, true); assert.equal(store.records.l1.plays, 1);
    assert.equal(store.unlocked, 2);
    assert.equal(store.stats.plays, 1);
    // 4 lượt đúng + 1 lần chọn nhầm + 4 câu hỏi đáp (3 đúng ngay, 1 sai) = 9 mục; đúng = 4 + 3
    assert.equal(store.stats.byTopic.l1.c + store.stats.byTopic.l1.w, 9);
    assert.equal(store.stats.correct, 7); assert.equal(store.stats.wrong, 2);
    assert.ok(store.stats.seconds >= 0);
    assert.ok(Object.keys(store.missed).length >= 1, 'pool ôn lại có mục');
    assert.ok(await page.evaluate(() => JSON.parse(localStorage.getItem('me-cung-dong-ho-v1')).players.p1.records.l1.passed), 'đã lưu localStorage');
    await shot('result');

    // 5. Xoay màn hình giữa ván (màn 2)
    await page.click('#btn-next-level');
    await page.waitForSelector('#lesson:not(.hidden)');
    assert.equal(await page.evaluate(() => window.__MeCung.G.lesson.level.id), 'l2');
    await page.click('#btn-lesson-play');
    await H.waitState('countdown', 3000); await H.godMode(); await H.waitState('playing', 8000); await H.godMode();
    assert.equal(await page.evaluate(() => window.__MeCung.G.maze.transposed), false);
    // ôn lại thông minh: mục "10 giờ" bị nhầm ở màn 1 (phút 0 thuộc tập của màn 2) được xếp vào 1 lượt (không phải lượt đầu)
    const rr = await page.evaluate(() => { const G = window.__MeCung.G; return { slots: Object.keys(G.reviewRounds), first: !!G.reviewRounds[0], review0: G.roundInfo.review }; });
    assert.ok(rr.slots.length >= 1, 'có lượt ôn lại: ' + JSON.stringify(rr));
    assert.ok(!rr.first && !rr.review0, 'lượt đầu không phải lượt ôn lại');
    // thẻ sao hiện trên HUD hẹp cũng không làm HUD đè lên mê cung (đã đo sẵn)
    const hudB = await page.evaluate(() => { const X = window.__MeCung; X.G.fright = 5; X.update(0.016); const r = document.querySelector('#hud .hud-top').getBoundingClientRect(); return { bottom: r.bottom, oy: X.G.oy }; });
    assert.ok(hudB.bottom <= hudB.oy, 'HUD (có thẻ sao) nằm trên mê cung: ' + JSON.stringify(hudB));
    await page.setViewportSize({ width: 820, height: 1180 });
    await page.waitForTimeout(900);
    let mz = await page.evaluate(() => { const G = window.__MeCung.G, m = G.maze; const inb = (p) => p.r >= 0 && p.r < m.rows && p.c >= 0 && p.c < m.cols; return { tr: m.transposed, corners: G.ghosts.every((g) => inb(g.corner)), ghosts: G.ghosts.every((g) => inb(g.from)), items: G.items.every(inb), player: inb(G.player.from), state: G.state }; });
    assert.equal(mz.tr, true, 'mê cung xoay dọc');
    assert.ok(mz.corners && mz.ghosts && mz.items && mz.player, 'mọi thứ trong mê cung sau khi xoay: ' + JSON.stringify(mz));
    assert.equal(mz.state, 'playing');
    await shot('portrait-play');
    await page.setViewportSize({ width: 1180, height: 820 });
    await page.waitForTimeout(900);
    mz = await page.evaluate(() => { const G = window.__MeCung.G; return { tr: G.maze.transposed, corners: G.ghosts.every((g) => g.corner.r < G.maze.rows && g.corner.c < G.maze.cols) }; });
    assert.equal(mz.tr, false); assert.ok(mz.corners);
    // 5b. Tạm dừng -> xem lại bài học -> chơi tiếp (A30) ; Esc mở tạm dừng
    await page.keyboard.press('Escape');
    await H.waitState('paused', 2000);
    assert.ok(await H.visible('#pause'));
    const timeBefore = await page.evaluate(() => window.__MeCung.G.time);
    await page.click('#btn-lesson-again');
    await page.waitForSelector('#lesson:not(.hidden)');
    assert.equal(await page.textContent('#btn-lesson-play'), '▶ Chơi tiếp');
    await page.click('#btn-lesson-play');
    await H.waitState('playing', 3000);
    assert.ok((await page.evaluate(() => window.__MeCung.G.time)) >= timeBefore, 'chơi tiếp, không chơi lại từ đầu');
    await H.godMode();
    await page.keyboard.press('Escape');
    await H.waitState('paused', 2000);
    await page.click('#btn-quit');
    await H.waitState('menu', 2000);

    // 6. Báo cáo + cổng phụ huynh
    await page.click('#btn-play');
    await H.waitState('levels');
    assert.equal(await page.locator('.level-card:not(.locked)').count(), 2);
    await page.click('#btn-report-levels');
    await page.waitForSelector('#report:not(.hidden)');
    assert.ok((await page.textContent('#report-title')).includes('Bé'));
    assert.ok((await page.locator('#report-levels .report-row').count()) >= 8);
    assert.ok((await page.locator('#report-review .report-row').count()) >= 1);
    assert.ok((await page.textContent('#report-stats')).includes('1'));
    await shot('report');
    await page.click('#btn-report-back');
    assert.ok(!(await H.visible('#report')) && (await H.visible('#levels')), 'quay lại chọn màn');
    await page.click('#btn-unlock-all');
    await page.waitForSelector('#parent-gate:not(.hidden)');
    await shot('gate');
    const q = await page.textContent('#parent-gate-q');
    const m = /(\d+) × (\d+)/.exec(q);
    assert.ok(m, 'câu hỏi cổng: ' + q);
    await page.fill('#parent-gate-input', String(Number(m[1]) * Number(m[2]) + 1));
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    assert.ok(await H.visible('#parent-gate'), 'sai thì cổng vẫn mở');
    assert.ok((await page.textContent('#toast')).includes('Chưa đúng'));
    assert.equal(await hook('X.Store.p().unlocked'), 2);
    await page.fill('#parent-gate-input', String(Number(m[1]) * Number(m[2])));
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    assert.ok(!(await H.visible('#parent-gate')));
    assert.equal(await hook('X.Store.p().unlocked'), 8, 'mở khóa tất cả cho bé đang chơi');
    assert.equal(await page.locator('.level-card:not(.locked)').count(), 8);
    // Escape đóng cổng
    await page.click('#btn-reset-progress');
    await page.waitForSelector('#parent-gate:not(.hidden)');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    assert.ok(!(await H.visible('#parent-gate')));
    assert.equal(await hook('X.Store.p().unlocked'), 8, 'hủy cổng: không xóa');
    await page.click('#btn-levels-back');
    await H.waitState('menu');

    // 7. Đổi người chơi: tiến trình tách biệt
    await page.click('#btn-player');
    await page.waitForSelector('#players:not(.hidden)');
    assert.equal(await page.locator('.player-item').count(), 1);
    assert.ok(await page.locator('#btn-player-remove').isDisabled());
    await page.click('#btn-player-add');
    await page.waitForSelector('#player-form:not([hidden])');
    await page.fill('#player-name', 'Mai');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    assert.ok((await page.textContent('#btn-player')).includes('Mai'), 'chip đổi tên');
    assert.equal(await page.locator('.player-item').count(), 2);
    assert.ok(await page.locator('.player-item.active').evaluate((el) => el.textContent.includes('Mai')));
    await shot('players');
    let two = await hook('({ me: X.Store.p(), p1: X.Store.data.players.p1 })');
    assert.equal(two.me.unlocked, 1); assert.deepEqual(two.me.records, {});
    assert.equal(two.p1.records.l1.passed, true); assert.equal(two.p1.unlocked, 8);
    // báo cáo của Mai + xóa tiến trình của Mai (không đụng Bé)
    await page.click('#btn-report');
    await page.waitForSelector('#report:not(.hidden)');
    assert.ok((await page.textContent('#report-title')).includes('Mai'));
    await page.click('#btn-report-reset');
    await page.waitForSelector('#parent-gate:not(.hidden)');
    const q2 = /(\d+) × (\d+)/.exec(await page.textContent('#parent-gate-q'));
    await page.fill('#parent-gate-input', String(Number(q2[1]) * Number(q2[2])));
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    two = await hook('({ me: X.Store.p(), p1: X.Store.data.players.p1 })');
    assert.equal(two.me.unlocked, 1); assert.equal(two.p1.unlocked, 8, 'xóa tiến trình chỉ của bé đang chơi');
    await page.click('#btn-report-back');
    await page.waitForSelector('#players:not(.hidden)');
    await page.click('.player-item[data-id="p1"]');
    await page.waitForTimeout(100);
    assert.ok((await page.textContent('#btn-player')).includes('Bé'));
    assert.equal(await hook('X.Store.p().unlocked'), 8);
    await page.click('#btn-players-back');
    assert.ok(!(await H.visible('#players')) && (await H.visible('#menu')));
    await page.click('#btn-play');
    await H.waitState('levels');
    assert.equal(await page.locator('.level-card:not(.locked)').count(), 8, 'lưới màn theo bé đang chơi');
    await page.click('#btn-levels-back');
    await H.waitState('menu');

    // 8. Nút hiệu ứng (✨) và lớp lite-fx
    const fxBtn = page.locator('#menu .toggle[data-set="fx"]');
    assert.equal(await fxBtn.getAttribute('aria-pressed'), 'true');
    await fxBtn.click();
    assert.equal(await hook('X.Store.data.fx'), 'lite');
    assert.equal(await page.locator('#menu .toggle[data-set="fx"]').getAttribute('aria-pressed'), 'false');
    assert.ok(await page.evaluate(() => document.documentElement.classList.contains('lite-fx')));
    await page.locator('#menu .toggle[data-set="fx"]').click();
    assert.equal(await hook('X.Store.data.fx'), 'full');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('me-cung-dong-ho-v1')).fx), 'full');
    await page.locator('#menu .toggle[data-set="music"]').click();
    assert.equal(await hook('X.Store.data.music'), false);

    // 9. Lỗi toàn cục -> toast, không treo
    await page.evaluate(() => setTimeout(() => { throw new Error('e2e-test-fatal'); }, 0));
    await page.waitForTimeout(300);
    assert.ok((await page.textContent('#toast')).includes('Có lỗi nhỏ'), 'toast lỗi');
    assert.equal(await H.state(), 'menu');
    log.pageErrors = log.pageErrors.filter((e) => !/e2e-test-fatal/.test(e));
    log.errors = log.errors.filter((e) => !/e2e-test-fatal/.test(e));

    console.log('perf =', JSON.stringify(await hook('X.G.perf')));
  }, { viewport: { width: 1180, height: 820 }, reducedMotion: 'reduce' });
  return assertClean(log, 'me-cung run 1 (iPad ngang)');
}

async function run2() {
  const log = await withGame('me-cung-dong-ho', async ({ page, hook }) => {
    const H = helpers(page);
    const d = await hook('X.Store.data');
    assert.equal(d.unlocked, undefined); assert.equal(d.records, undefined);
    assert.equal(d.music, false); assert.equal(d.sound, true);
    assert.equal(d.players.p1.unlocked, 3);
    assert.equal(d.players.p1.records.l1.best, 1200);
    assert.equal(d.players.p1.records.l2.stars, 3); assert.equal(d.players.p1.records.l2.best, 0);
    const raw = await page.evaluate(() => JSON.parse(localStorage.getItem('me-cung-dong-ho-v1')));
    assert.equal(raw.unlocked, undefined); assert.equal(raw.players.p1.unlocked, 3, 'đã lưu hình dạng mới');
    await page.click('#btn-play');
    await H.waitState('levels');
    assert.equal(await page.locator('.level-card:not(.locked)').count(), 3);
    assert.ok((await page.textContent('.level-card[data-id="l1"]')).includes('1.200'));
  }, { initScript: "localStorage.setItem('me-cung-dong-ho-v1', " + JSON.stringify(JSON.stringify(LEGACY)) + ");", reducedMotion: 'reduce' });
  let ok = assertClean(log, 'me-cung run 2 (di trú dữ liệu cũ)');
  const log2 = await withGame('me-cung-dong-ho', async ({ page, hook }) => {
    const H = helpers(page);
    assert.equal(await H.state(), 'menu');
    assert.equal(await hook('X.Store.p().unlocked'), 1);
    await H.startLevel(0);
    assert.equal(await H.finishLevel(), 'quiz');
    assert.equal(await H.finishQuiz(), 'result');
    assert.ok(await H.visible('#result'), 'dữ liệu hỏng vẫn tới màn kết quả (A2)');
    assert.equal(await hook('X.Store.p().records.l1.passed'), true);
  }, { initScript: "localStorage.setItem('me-cung-dong-ho-v1', '{\"records\":\"abc\",\"unlocked\":\"1e400\"}');", reducedMotion: 'reduce' });
  ok = assertClean(log2, 'me-cung run 2b (dữ liệu hỏng)') && ok;
  return ok;
}

async function run3() {
  const log = await withGame('me-cung-dong-ho', async ({ page, hook, shot }) => {
    const H = helpers(page);
    await shot('phone-menu');
    await page.evaluate(() => window.__MeCung.showLesson(window.Clock.LEVELS[5]));
    await page.waitForSelector('#lesson:not(.hidden)');
    await shot('phone-lesson-l6');
    await H.startLevel(4);   // màn 5: mê cung B -> trên điện thoại chuyển sang mê cung nhỏ hơn / xoay
    const g = await H.geom();
    assert.ok(g.cell >= 28, 'ô ≥ 28 px trên điện thoại, có ' + g.cell);
    assert.equal(await page.evaluate(() => window.__MeCung.G.maze.transposed), true);
    await page.evaluate(() => { const X = window.__MeCung; X.G.fright = 5; X.G.invuln = 1e9; X.update(0.016); });
    assert.ok(await H.visible('#hud-power'));
    const hudP = await page.evaluate(() => { const r = document.querySelector('#hud .hud-top').getBoundingClientRect(); return { bottom: r.bottom, oy: window.__MeCung.G.oy }; });
    assert.ok(hudP.bottom <= hudP.oy, 'HUD điện thoại (có thẻ sao) không đè lên mê cung: ' + JSON.stringify(hudP));
    for (const sel of ['#btn-pause', '#hud-lives', '#btn-hud-speak', '#hud-target']) {
      const r = await H.rect(sel);
      assert.ok(r.x >= 0 && r.r <= 390 && r.y >= 0 && r.w > 0, sel + ' trong màn hình 390 px: ' + JSON.stringify(r));
    }
    assert.ok((await H.rect('#btn-pause')).w >= 44);
    // kính lúp: đứng cạnh một đồng hồ -> phóng to
    const near = await page.evaluate(() => {
      const X = window.__MeCung, G = X.G, M = window.Mazes;
      for (const it of G.items) {
        for (const d of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const r = it.r + d[0], c = it.c + d[1]; if (M.isOpen(G.maze, r, c) && !G.items.some((o) => o.r === r && o.c === c)) return { r: r, c: c }; }
      }
      return null;
    });
    assert.ok(near, 'có ô cạnh đồng hồ');
    await page.evaluate((p) => { const X = window.__MeCung; X.G.player.from = { r: p.r, c: p.c }; X.G.player.to = { r: p.r, c: p.c }; X.G.player.t = 1; X.G.player.moving = false; X.G.player.x = p.c + 0.5; X.G.player.y = p.r + 0.5; X.render(); }, near);
    assert.ok(await page.evaluate(() => window.__MeCung.G.magnified), 'kính lúp phóng to đồng hồ gần nhất');
    await shot('phone-play');
    assert.equal(await H.finishLevel(), 'quiz');
    await shot('phone-quiz');
    assert.equal(await H.finishQuiz(), 'result');
    await shot('phone-result');
    assert.ok(await H.visible('#btn-retry'));
    await page.click('#btn-home');
    await H.waitState('menu');
    await page.click('#btn-player');
    await page.waitForSelector('#players:not(.hidden)');
    await shot('phone-players');
    console.log('perf (phone) =', JSON.stringify(await hook('X.G.perf')));
  }, { viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  return assertClean(log, 'me-cung run 3 (điện thoại 390×844)');
}


/* Lượt 4 (A12): nạp trang để service worker cài xong và đệm CORE, rồi TẮT máy chủ và tải lại trang:
   game phải khởi động được hoàn toàn từ bộ nhớ đệm (chơi ngoại tuyến). */
async function run4() {
  const { serve } = require('./lib/browser.js');
  const { chromium } = require('playwright');
  const isFontNoise = (s) => /fonts\.g(oogleapis|static)\.com|ERR_CONNECTION_RESET|net::ERR_|Failed to load resource/.test(String(s));
  const { server, port } = await serve();
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 1, hasTouch: true, locale: 'vi-VN', reducedMotion: 'reduce' });
  const page = await context.newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push('pageerror: ' + String((e && e.stack) || e)));
  page.on('console', (m) => { if (m.type() === 'error' && !isFontNoise(m.text())) problems.push('console.error: ' + m.text()); });
  let serverOpen = true;
  try {
    await page.goto('http://127.0.0.1:' + port + '/me-cung-dong-ho/', { waitUntil: 'load', timeout: 30000 });
    const sw = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return { supported: false };
      const reg = await navigator.serviceWorker.ready;
      // install dùng allSettled nên bộ nhớ đệm có thể đầy sau khi ready một chút
      for (let i = 0; i < 100; i++) {
        const keys = await caches.keys();
        const a = await caches.match('./index.html'), b = await caches.match('./js/game.js'), c = await caches.match('./js/profile.js'), d = await caches.match('./');
        if (a && b && c && d) return { supported: true, active: !!reg.active, keys: keys };
        await new Promise((r) => setTimeout(r, 100));
      }
      return { supported: true, active: !!reg.active, keys: await caches.keys(), timeout: true };
    });
    assert.equal(sw.supported, true, 'trình duyệt có service worker');
    assert.ok(sw.active && !sw.timeout, 'service worker đã cài và đệm CORE: ' + JSON.stringify(sw));
    assert.ok(sw.keys.indexOf('me-cung-dong-ho-v2') >= 0, 'tên bộ nhớ đệm v2: ' + sw.keys.join(','));
    // Tắt hẳn máy chủ rồi tải lại: mọi tệp phải đến từ bộ nhớ đệm
    if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
    await new Promise((r) => server.close(r));
    serverOpen = false;
    await page.reload({ waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(500);
    const off = await page.evaluate(() => ({
      controlled: !!(navigator.serviceWorker && navigator.serviceWorker.controller),
      hook: !!(window.__MeCung && window.__MeCung.G),
      state: window.__MeCung && window.__MeCung.G.state,
      menu: !!document.querySelector('#menu:not(.hidden) .panel'),
      chip: (document.getElementById('btn-player') || {}).textContent || '',
      clock: !!window.Clock, players: !!window.Players
    }));
    assert.ok(off.controlled, 'trang do service worker điều khiển');
    assert.ok(off.hook && off.clock && off.players, 'mọi script nạp từ bộ nhớ đệm: ' + JSON.stringify(off));
    assert.equal(off.state, 'menu');
    assert.ok(off.menu && off.chip.indexOf('Bé') >= 0, 'menu hiện khi ngoại tuyến: ' + JSON.stringify(off));
    await page.click('#btn-play');
    await page.waitForFunction(() => window.__MeCung.G.state === 'levels', null, { timeout: 5000 });
    assert.equal(await page.locator('.level-card').count(), 8);
  } finally {
    await browser.close();
    if (serverOpen) server.close();
  }
  if (problems.length) { console.error('me-cung run 4 (ngoại tuyến) — lỗi:\n  ' + problems.join('\n  ')); process.exitCode = 1; return false; }
  console.log('me-cung run 4 (ngoại tuyến qua service worker) — sạch (không lỗi trang/console).');
  return true;
}

(async () => {
  const ok1 = await run1();
  const ok2 = await run2();
  const ok3 = await run3();
  const ok4 = await run4();
  const all = ok1 && ok2 && ok3 && ok4;
  if (!all) process.exitCode = 1;
  console.log(all ? 'me-cung e2e: PASS' : 'me-cung e2e: FAIL');
})().catch((e) => { console.error(e); process.exit(1); });
