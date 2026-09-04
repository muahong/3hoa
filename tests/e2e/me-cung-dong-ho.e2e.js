'use strict';
/* Kiểm thử đầu-cuối Mê Cung Đồng Hồ (Playwright). Chạy:
     NODE_PATH=/opt/node22/lib/node_modules node tests/e2e/me-cung-dong-ho.e2e.js
   Năm lượt: (1) iPad ngang – luồng đầy đủ menu → màn → chơi → hỏi đáp → kết quả, hồ sơ, báo cáo, cổng phụ huynh, lỗi toàn cục;
             (2) di trú dữ liệu cũ + dữ liệu hỏng; (3) điện thoại dọc 390×844; (4) tải lại trang khi máy chủ đã tắt (service worker, A12);
             (5) gợi ý 💡 + đánh dấu sau 2 lần sai, nhịp nghỉ, màn kết quả khi thua, đồng hồ tham chiếu màn 7, ôn lại màn 8;
             (6) ván hoàn hảo: các dòng chữ thưởng không đè lên nhau (C15);
             (7) huy hiệu "Đã thuộc", nhãn "📝 Ôn lại", ăn mừng khi qua màn / lập kỷ lục, "Buổi & 24 giờ" ở màn Học xem giờ,
                 đồng hồ mốc bắt đầu của màn 8, bài 4 hiện cả kim lẫn số, nét mặt Cú Tí và tương phản chữ trên nút;
             (8) iPad dọc 820×1180: menu, HUD giữa ván, bảng kết quả. */
const assert = require('node:assert/strict');
const { withGame, assertClean } = require('./lib/browser.js');

/** Tỉ lệ tương phản WCAG giữa hai màu "rgb(r, g, b)". */
function contrast(fg, bg) {
  const parse = (s) => s.match(/\d+/g).slice(0, 3).map(Number);
  const lum = (c) => {
    const v = c.map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  };
  const l1 = lum(parse(fg)), l2 = lum(parse(bg));
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

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
  // Chơi đúng liên tiếp tới khi qua màn, trả về các dòng chữ nổi đang hiện lúc đó
  H.playPerfect = () => page.evaluate(() => new Promise((resolve) => {
    const X = window.__MeCung; let guard = 0;
    (function step() {
      const G = X.G;
      if (G.state === 'clear' || G.state === 'quiz' || guard++ > 800) {
        return resolve({ state: G.state, streak: G.streak, wrong: G.wrong, cell: G.cell, texts: G.texts.map((t) => ({ text: t.text, x: Math.round(t.x), y: Math.round(t.y), size: t.size })) });
      }
      G.invuln = 1e9;
      if (G.state === 'playing' && G.nextRoundAt < 0) { const it = G.items.find((i) => i.correct && !i.taken); if (it) X.teleport(it.r, it.c); }
      for (let k = 0; k < 5; k++) X.update(0.1);
      setTimeout(step, 4);
    })();
  }));
  H.perf = async (label, ms) => {
    await page.evaluate(() => { const p = window.__MeCung.G.perf; p.n = 0; p.update = 0; p.render = 0; p.frame = 0; });
    await page.waitForTimeout(ms || 1600);
    const p = await page.evaluate(() => { const q = window.__MeCung.G.perf; return { u: q.avgUpdate, r: q.avgRender, f: q.avgFrame }; });
    console.log('perf ' + label + ': update ' + p.u.toFixed(3) + ' ms · render ' + p.r.toFixed(3) + ' ms · frame ' + p.f.toFixed(3) + ' ms');
    return p;
  };
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
    // C9: đúng/sai không chỉ khác màu mà còn có dấu ✓ / ✗
    const glyph = await page.evaluate(() => ({
      r: getComputedStyle(document.querySelector('.opt.right'), '::after').content,
      w: getComputedStyle(document.querySelector('.opt.wrong'), '::after').content
    }));
    assert.ok(glyph.r.indexOf('✓') >= 0, 'đáp án đúng có dấu ✓: ' + glyph.r);
    assert.ok(glyph.w.indexOf('✗') >= 0, 'đáp án sai có dấu ✗: ' + glyph.w);
    await shot('quiz-answered');
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
    // C11: pháo giấy vẽ ở lớp #fx (nằm trên lớp phủ mờ) nên bé nhìn thấy
    const fx = await page.evaluate(() => {
      const X = window.__MeCung, f = document.getElementById('fx');
      X.G.parts.forEach((p, i) => { p.x = 100 + (i * 13) % 600; p.y = 300; });
      X.render();
      const d = f.getContext('2d').getImageData(0, 260, f.width, 90).data;
      let n = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
      return { parts: X.G.parts.length, painted: n, w: f.width, gw: document.getElementById('game').width, z: Number(getComputedStyle(f).zIndex) };
    });
    assert.equal(fx.w, fx.gw, 'canvas hiệu ứng cùng cỡ canvas chính');
    assert.ok(fx.z >= 6, 'lớp #fx nằm trên lớp phủ kết quả, z = ' + fx.z);
    assert.ok(fx.parts > 0 && fx.painted > 0, 'pháo giấy được vẽ trên lớp #fx: ' + JSON.stringify(fx));
    assert.ok(await H.visible('#result-review'), 'màn kết quả có danh sách "Cần ôn lại" (C6)');
    const revWin = await page.textContent('#result-review');
    assert.ok(revWin.indexOf('Cần ôn lại') >= 0 && revWin.indexOf('📝') >= 0, 'danh sách ôn lại có nội dung: ' + revWin);
    assert.ok(!(await H.visible('#btn-result-lesson')), 'thắng thì không cần nút xem lại bài học');
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
    // Ô thời gian luôn là số phút tròn (dùng chung cho cả sáu game), không bao giờ là giây hay số lẻ
    const mins = await page.evaluate(() => {
      const box = Array.from(document.querySelectorAll('#report-stats .report-stat')).find((el) => el.textContent.indexOf('phút luyện tập') >= 0);
      const star = Array.from(document.querySelectorAll('#report-stats .report-stat')).find((el) => el.textContent.indexOf('sao') >= 0);
      return { v: box.querySelector('.v').textContent, sec: window.__MeCung.Store.p().stats.seconds, star: star.querySelector('.v').textContent };
    });
    assert.ok(mins.sec > 0 && Number(mins.v) === Math.round(mins.sec / 60), 'phút luyện tập làm tròn theo phút: ' + JSON.stringify(mins));
    assert.match(mins.star, /^\d+\/24$/, 'ô sao ở dạng n/24: ' + mins.star);
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
    assert.equal(await page.locator('.level-card.passed').count(), 1, 'màn đã qua có dấu ✅');
    await shot('levels-progress');
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

    // 8. Máy đang bật "giảm chuyển động": nút ✨ Hiệu ứng phải báo đúng mức Ít và bị khóa (không nói dối "Nhiều")
    const fxBtn = page.locator('#menu .toggle[data-set="fx"]');
    assert.equal(await fxBtn.getAttribute('aria-pressed'), 'false');
    assert.equal(await fxBtn.isDisabled(), true, 'giảm chuyển động thì nút hiệu ứng bị khóa');
    const fxLabel = await fxBtn.textContent();
    assert.ok(fxLabel.includes('Ít (theo cài đặt máy)'), 'nhãn nút hiệu ứng: ' + fxLabel);
    assert.ok(await page.evaluate(() => document.documentElement.classList.contains('lite-fx')));
    assert.equal(await hook('X.Store.data.fx'), 'full', 'nút bị khóa nên không đổi thiết lập của máy');
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
    await H.perf('điện thoại 390×844, màn 5 đang chơi');

    // Thanh gợi ý dài không được che chính chiếc đồng hồ vừa đánh dấu (hạ xuống dưới mê cung)
    const hb = await page.evaluate(() => {
      const X = window.__MeCung, G = X.G, M = window.Mazes;
      const it = G.items.find((o) => o.correct);
      let moved = null;
      for (let r = 0; r < G.maze.rows && !moved; r++) {
        for (let c = 0; c < G.maze.cols && !moved; c++) {
          if (M.isOpen(G.maze, r, c) && !G.items.some((o) => o !== it && o.r === r && o.c === c)) { it.r = r; it.c = c; moved = { r: r, c: c }; }
        }
      }
      X.askHint();
      const el = document.getElementById('hud-hint'), b = el.getBoundingClientRect(), cs = getComputedStyle(el);
      const cls = el.className, fs = parseFloat(cs.fontSize), bg = cs.backgroundColor, fg = cs.color;
      const cy = G.oy + (it.r + 0.5) * G.cell, cx = G.ox + (it.c + 0.5) * G.cell, s = G.cell * 1.05;
      const hides = (r) => r.top < cy + s && r.bottom > cy - s && r.left < cx + s && r.right > cx - s;
      const covers = hides(b);
      const inView = b.top >= 0 && b.bottom <= window.innerHeight;
      el.className = cls.replace(' low', '');         // vị trí mặc định có che đồng hồ này không?
      const defCovers = hides(el.getBoundingClientRect());
      el.className = cls;
      el.className = 'hint bad';                      // đo tương phản kiểu "bad"...
      const badCs = getComputedStyle(el), badBg = badCs.backgroundColor, badFg = badCs.color;
      el.className = cls;                             // ...rồi trả lại đúng trạng thái đang hiện
      return { moved: moved, len: el.textContent.length, cls: cls, fs: fs, bg: bg, fg: fg, badBg: badBg, badFg: badFg,
        covers: covers, defCovers: defCovers, inView: inView, top: Math.round(b.top), bottom: Math.round(b.bottom), row: it.r };
    });
    assert.ok(hb.moved, 'đưa được đồng hồ đúng lên hàng trên cùng');
    assert.equal(hb.covers, false, 'thanh gợi ý không che đồng hồ vừa đánh dấu: ' + JSON.stringify(hb));
    if (hb.defCovers) assert.ok(hb.cls.indexOf('low') > 0, 'gợi ý dài che đồng hồ đã đánh dấu -> thanh phải tụt xuống dưới mê cung (.hint.low): ' + hb.cls);
    assert.equal(hb.inView, true, 'thanh gợi ý vẫn nằm trong màn hình: ' + JSON.stringify(hb));
    assert.ok(hb.fs >= 17, 'chữ thanh gợi ý trên điện thoại ≥ 17 px, có ' + hb.fs);
    assert.ok(contrast(hb.fg, hb.bg) >= 4.5, 'tương phản chữ/nền gợi ý (info) = ' + contrast(hb.fg, hb.bg).toFixed(2));
    assert.ok(contrast(hb.badFg, hb.badBg) >= 4.5, 'tương phản chữ/nền gợi ý (bad) = ' + contrast(hb.badFg, hb.badBg).toFixed(2));
    console.log('gợi ý điện thoại: tương phản info =', contrast(hb.fg, hb.bg).toFixed(2), '| bad =', contrast(hb.badFg, hb.badBg).toFixed(2),
      '| cỡ chữ', hb.fs, '| che ở vị trí mặc định:', hb.defCovers, '-> lớp:', hb.cls);
    await page.evaluate(() => window.__MeCung.render());
    await shot('phone-hint-low');

    // Chọn nhầm một lần để bảng kết quả có cả khối "Cần ôn lại" (bảng dài nhất có thể)
    await H.godMode();
    const wp = await page.evaluate(() => { const it = window.__MeCung.G.items.find((i) => !i.correct && !i.taken); return { r: it.r, c: it.c }; });
    await hook('X.teleport(' + wp.r + ', ' + wp.c + ') || true');
    assert.equal(await H.finishLevel(), 'quiz');
    await shot('phone-quiz');
    assert.equal(await H.finishQuiz(), 'result');
    await shot('phone-result');
    assert.ok(await H.visible('#result-review'), 'bảng kết quả điện thoại có khối "Cần ôn lại"');
    // C10: nhãn điểm bị ẩn, hàng nút chính dính đáy, cuộn hết bảng thì thấy trọn nút 🏠
    const rp = await page.evaluate(() => {
      const panel = document.querySelector('#result .panel'), row = document.querySelector('#result .btn-row.row-main');
      const before = document.getElementById('btn-retry').getBoundingClientRect();
      panel.scrollTop = panel.scrollHeight;
      const home = document.getElementById('btn-home').getBoundingClientRect();
      return {
        label: getComputedStyle(document.querySelector('.result-score-label')).display,
        sticky: getComputedStyle(row).position,
        retryVisible: before.bottom <= window.innerHeight && before.top >= 0,
        home: { top: Math.round(home.top), bottom: Math.round(home.bottom) }, vh: window.innerHeight,
        scrollable: panel.scrollHeight > panel.clientHeight
      };
    });
    assert.equal(rp.label, 'none', 'điện thoại: ẩn nhãn "ĐIỂM CỦA CON" cho gọn bảng');
    assert.equal(rp.sticky, 'sticky', 'điện thoại: hàng nút chính của bảng kết quả dính đáy');
    assert.equal(rp.retryVisible, true, 'nút "Chơi lại" luôn thấy được: ' + JSON.stringify(rp));
    assert.ok(rp.home.bottom <= rp.vh && rp.home.top >= 0, 'cuộn hết bảng thì thấy trọn nút 🏠 Trang chính: ' + JSON.stringify(rp));
    await shot('phone-result-bottom');
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
    assert.ok(sw.keys.indexOf('me-cung-dong-ho-v4') >= 0, 'tên bộ nhớ đệm v4: ' + sw.keys.join(','));
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


/* Lượt 5: hệ thống gợi ý (C2), nhịp nghỉ sau khi chọn nhầm (C3), màn kết quả khi thua
   ("Cần ôn lại" + nút xem lại bài học – C6) và đồng hồ tham chiếu to hơn ở màn 7 (C8). */
async function run5() {
  const log = await withGame('me-cung-dong-ho', async ({ page, hook, shot }) => {
    const H = helpers(page);
    await H.startLevel(0);
    assert.ok(await H.visible('#btn-hud-hint'), 'có nút 💡 gợi ý theo yêu cầu (#btn-hud-hint)');
    const rb = await H.rect('#btn-hud-hint');
    assert.ok(rb.w >= 44 && rb.h >= 44, 'nút gợi ý ≥ 44 px: ' + JSON.stringify(rb));
    assert.ok(rb.r <= 1180 && rb.x >= 0, 'nút gợi ý trong màn hình');

    // Sai lần 1: dừng lại một nhịp cho bé đọc (C3), chưa chỉ đáp án
    const wrongs = await page.evaluate(() => window.__MeCung.G.items.filter((i) => !i.correct).map((i) => ({ r: i.r, c: i.c })));
    assert.ok(wrongs.length >= 2, 'màn 1 có ít nhất 2 đồng hồ nhiễu');
    await hook('X.teleport(' + wrongs[0].r + ', ' + wrongs[0].c + ') || true');
    let st = await page.evaluate(() => { const G = window.__MeCung.G; return { state: G.state, stateT: G.stateT, lives: G.lives, roundWrong: G.roundWrong, marked: G.items.some((i) => i.hint), hint: document.getElementById('hud-hint').textContent }; });
    assert.equal(st.state, 'ready', 'sai một lần: game dừng cho bé đọc lời giải thích (C3)');
    assert.ok(st.stateT > 1, 'nhịp nghỉ đủ dài: ' + st.stateT);
    assert.equal(st.lives, 2);
    assert.equal(st.roundWrong, 1);
    assert.equal(st.marked, false, 'mới sai 1 lần thì chưa đánh dấu đồng hồ đúng');
    assert.equal(st.hint.indexOf('❌'), 0, 'hiện lời nhắc đồng hồ vừa chọn: ' + st.hint);

    // Sai lần 2: đánh dấu đồng hồ đúng + giải thích cách xem giờ (C2)
    await H.godMode();
    await hook('X.teleport(' + wrongs[1].r + ', ' + wrongs[1].c + ') || true');
    st = await page.evaluate(() => { const G = window.__MeCung.G; return { lives: G.lives, roundWrong: G.roundWrong, marked: G.items.filter((i) => i.correct)[0].hint === true, hint: document.getElementById('hud-hint').textContent, shown: !document.getElementById('hud-hint').hidden }; });
    assert.equal(st.roundWrong, 2);
    assert.equal(st.lives, 1);
    assert.equal(st.marked, true, 'sau 2 lần sai đồng hồ đúng được đánh dấu (C2)');
    assert.ok(st.shown && st.hint.indexOf('💡') === 0, 'hiện lời giải thích cách xem: ' + st.hint);
    await page.evaluate(() => window.__MeCung.render());
    await shot('hint-marked');

    // Lượt sau: bấm 💡 -> mất thưởng "Nhanh!", đánh dấu đồng hồ đúng, đọc cách xem
    const ok = await page.evaluate(() => { const it = window.__MeCung.G.items.find((i) => i.correct); return { r: it.r, c: it.c }; });
    await hook('X.teleport(' + ok.r + ', ' + ok.c + ') || true');
    await page.evaluate(() => { const X = window.__MeCung; for (let k = 0; k < 40; k++) { X.G.invuln = 1e9; X.update(0.1); } });
    assert.equal(await page.evaluate(() => window.__MeCung.G.round), 1, 'đã sang lượt 2');
    assert.equal(await page.evaluate(() => window.__MeCung.G.roundWrong), 0, 'lượt mới đếm lại số lần sai');
    await H.godMode();
    await page.click('#btn-hud-hint');
    const h2 = await page.evaluate(() => { const G = window.__MeCung.G; return { hinted: !!G.roundInfo.hinted, marked: G.items.some((i) => i.hint), text: document.getElementById('hud-hint').textContent, shown: !document.getElementById('hud-hint').hidden }; });
    assert.equal(h2.hinted, true, 'bấm 💡 -> roundInfo.hinted (bỏ thưởng "Nhanh!")');
    assert.equal(h2.marked, true, 'bấm 💡 -> đồng hồ đúng được đánh dấu');
    assert.ok(h2.shown && h2.text.indexOf('💡') === 0, 'bấm 💡 -> hiện lời gợi ý: ' + h2.text);
    await page.evaluate(() => window.__MeCung.render());
    await shot('hint-button');

    // Hết tim -> màn kết quả: "Cần ôn lại" + nút xem lại bài học (C6)
    const w2 = await page.evaluate(() => { const it = window.__MeCung.G.items.find((i) => !i.correct && !i.taken && !i.wrongAt); return { r: it.r, c: it.c }; });
    await page.evaluate(() => { window.__MeCung.G.lives = 1; window.__MeCung.G.invuln = 1e9; });
    await hook('X.teleport(' + w2.r + ', ' + w2.c + ') || true');
    await H.waitState('result', 8000);
    assert.ok(await H.visible('#result'), 'thua 3 tim -> màn kết quả');
    assert.ok(await H.visible('#result-review'), 'có danh sách "Cần ôn lại" trên màn kết quả (#result-review)');
    const rev = await page.textContent('#result-review');
    assert.ok(rev.indexOf('Cần ôn lại') >= 0 && rev.indexOf('📝') >= 0, 'danh sách ôn lại có nội dung: ' + rev);
    assert.ok(await H.visible('#btn-result-lesson'), 'thua -> có nút "📘 Xem lại bài học" (#btn-result-lesson)');
    await shot('result-lose');
    await page.click('#btn-result-lesson');
    await page.waitForSelector('#lesson:not(.hidden)');
    assert.equal(await page.evaluate(() => window.__MeCung.G.lesson.level.id), 'l1', 'nút bài học mở đúng bài của màn vừa chơi');

    // Màn 7: đồng hồ kim tham chiếu trên HUD to hơn (C8) mà HUD vẫn không đè lên mê cung
    await H.startLevel(6);
    const cw = await page.evaluate(() => { const svg = document.querySelector('#hud-target-clock svg'); return svg ? svg.getBoundingClientRect().width : 0; });
    assert.ok(cw >= 110, 'đồng hồ tham chiếu màn 7 ≥ 110 px, có ' + cw);
    const hud7 = await page.evaluate(() => { const X = window.__MeCung; X.G.fright = 5; X.G.invuln = 1e9; X.update(0.016); const r = document.querySelector('#hud .hud-top').getBoundingClientRect(); return { bottom: r.bottom, oy: X.G.oy, cell: X.G.cell }; });
    assert.ok(hud7.bottom <= hud7.oy, 'HUD màn 7 vẫn nằm trên mê cung: ' + JSON.stringify(hud7));
    assert.ok(hud7.cell >= 30, 'ô mê cung màn 7 ≥ 30 px: ' + hud7.cell);
    await shot('l7-hud');

    // Màn 8 "Thời gian trôi": dòng "Cần ôn lại" phải nhắc cả đề bài (giờ + phút = giờ), không chỉ kết quả
    await page.evaluate(() => { const X = window.__MeCung; X.Store.p().unlocked = 8; X.Store.save(); });
    await H.startLevel(7);
    const w8 = await page.evaluate(() => { const it = window.__MeCung.G.items.find((i) => !i.correct); return { r: it.r, c: it.c }; });
    await hook('X.teleport(' + w8.r + ', ' + w8.c + ') || true');
    await page.evaluate(() => { const X = window.__MeCung; for (let k = 0; k < 30; k++) { X.G.invuln = 1e9; X.update(0.1); } });
    const st8 = await H.finishLevel();
    if (st8 === 'quiz') assert.equal(await H.finishQuiz(), 'result');
    assert.ok(await H.visible('#result-review'), 'màn 8: có khối "Cần ôn lại"');
    const rev8 = (await page.textContent('#result-review')).replace(/\s+/g, ' ');
    assert.ok(/\d+ giờ.* \+ .* = .*(giờ|phút)/.test(rev8), 'màn 8: dòng ôn lại có cả phép cộng: ' + rev8);
    assert.ok(rev8.indexOf('con chọn') > 0, 'màn 8: dòng ôn lại vẫn cho biết bé đã chọn gì: ' + rev8);
    console.log('màn 8 – cần ôn lại:', rev8.slice(0, 140));
    await shot('l8-result-review');
  }, { viewport: { width: 1180, height: 820 }, reducedMotion: 'reduce' });
  return assertClean(log, 'me-cung run 5 (gợi ý, nhịp nghỉ, kết quả khi thua, ôn lại màn 8)');
}

/* Lượt 6 (C15): ván chơi hoàn hảo – "+điểm", "🔥 liên tiếp", "⭐ Không nhầm lần nào!" và "🎉 Qua màn!"
   phải nằm ở bốn dòng khác nhau, không chồng lên nhau. */
async function run6() {
  const log = await withGame('me-cung-dong-ho', async ({ page, shot }) => {
    const H = helpers(page);
    await H.startLevel(0);
    const r = await H.playPerfect();
    assert.equal(r.state, 'clear', 'chơi hết màn 1 không sai lần nào');
    assert.equal(r.wrong, 0);
    assert.ok(r.streak >= 2, 'chuỗi đúng liên tiếp: ' + r.streak);
    const txt = r.texts.map((t) => t.text).join(' | ');
    assert.ok(r.texts.some((t) => t.text.indexOf('🔥') === 0), 'có lời khen chuỗi đúng: ' + txt);
    assert.ok(r.texts.some((t) => t.text.indexOf('⭐') === 0), 'có lời khen "không nhầm lần nào": ' + txt);
    assert.ok(r.texts.some((t) => t.text.indexOf('🎉') === 0), 'có chữ "Qua màn!": ' + txt);
    for (let i = 0; i < r.texts.length; i++) {
      for (let j = i + 1; j < r.texts.length; j++) {
        const a = r.texts[i], b = r.texts[j];
        const need = Math.max(a.size, b.size) * 0.9;
        assert.ok(Math.abs(a.x - b.x) >= 200 || Math.abs(a.y - b.y) >= need,
          'hai dòng chữ thưởng đè lên nhau: ' + JSON.stringify([a, b]));
      }
    }
    console.log('chữ thưởng lượt cuối:', r.texts.map((t) => t.text + ' @y' + t.y).join(' | '));
    await page.evaluate(() => window.__MeCung.render());
    await shot('perfect-texts');
  }, { viewport: { width: 1180, height: 820 }, reducedMotion: 'reduce' });
  return assertClean(log, 'me-cung run 6 (chữ thưởng không đè lên nhau)');
}

/* Lượt 7: các điểm nâng cao về học tập và mĩ thuật (C5, C7, C13, C17, C19, C20 và SPEC §4). */
async function run7() {
  const log = await withGame('me-cung-dong-ho', async ({ page, hook, shot }) => {
    const H = helpers(page);

    // ---- C7: chữ trên nút và trên các nhãn nhỏ phải đủ tương phản ----
    const colors = await page.evaluate(() => {
      const of = (sel) => { const el = document.querySelector(sel); if (!el) return null; const c = getComputedStyle(el); return { fg: c.color, bg: c.backgroundColor, img: c.backgroundImage, size: parseFloat(c.fontSize), weight: c.fontWeight }; };
      // nền của nút là gradient -> lấy màu đáy (chỗ tối/sáng nhất) từ chuỗi background-image
      return {
        orange: of('#btn-play'), teal: of('#btn-learn'), green: of('#btn-lesson-play'),
        best: of('.level-card .best'), foot: of('.footer-note'), grade: of('.level-card .grade')
      };
    });
    const stops = (img) => (img || '').match(/rgba?\([^)]+\)/g) || [];
    const worst = (c) => {
      // nền là gradient -> xét mọi chặng màu; nếu trong suốt thì nền là bảng trắng phía sau
      const bgs = stops(c.img);
      if (c.bg && c.bg !== 'rgba(0, 0, 0, 0)' && c.bg !== 'transparent') bgs.push(c.bg);
      if (!bgs.length) bgs.push('rgb(255, 255, 255)');
      return bgs.reduce((m, b) => Math.min(m, contrast(c.fg, b)), Infinity);
    };
    const big = (c) => c.size >= 24 || (c.size >= 18.66 && Number(c.weight) >= 700);
    ['orange', 'teal', 'green'].forEach((k) => {
      const c = colors[k], need = big(c) ? 3 : 4.5;
      assert.ok(worst(c) >= need, 'nút ' + k + ' tương phản ' + worst(c).toFixed(2) + ' < ' + need + ' ' + JSON.stringify(c));
    });
    console.log('tương phản nút: cam=' + worst(colors.orange).toFixed(2) + ' ngọc=' + worst(colors.teal).toFixed(2) + ' lá=' + worst(colors.green).toFixed(2));
    assert.ok(contrast(colors.foot.fg, 'rgb(255, 255, 255)') >= 4.5, 'dòng chân trang: ' + contrast(colors.foot.fg, 'rgb(255, 255, 255)').toFixed(2));

    // ---- C13: màn "Học xem giờ" có nút Buổi & 24 giờ ----
    await page.click('#btn-learn');
    await H.waitState('learn', 3000);
    assert.ok(!(await H.visible('#learn-period')), 'mặc định chưa hiện dòng buổi');
    await page.click('#btn-learn-24h');
    await page.waitForTimeout(120);
    assert.equal(await page.getAttribute('#btn-learn-24h', 'aria-pressed'), 'true');
    assert.ok(await H.visible('#learn-period'), 'bật -> hiện dòng buổi trong ngày');
    // đi tới buổi chiều rồi kiểm tra cách đọc "3 giờ chiều · 15 giờ"
    await page.evaluate(() => { window.__MeCung.G.learn.t = window.Clock.T(15, 30); });
    await page.click('.learn-steps button[data-step="60"]');
    await page.waitForTimeout(120);
    const lp = await page.evaluate(() => ({ t: window.__MeCung.G.learn.t, period: document.getElementById('learn-period').textContent, dig: document.querySelector('#learn-digital svg').getAttribute('aria-label') }));
    assert.equal(lp.t.h, 16, 'cộng 1 giờ trong miền 24 giờ: ' + JSON.stringify(lp));
    assert.ok(lp.period.indexOf('chiều') > 0 && lp.period.indexOf('16 giờ') > 0, 'dòng buổi: ' + lp.period);
    assert.equal(lp.dig, '16:30', 'đồng hồ điện tử theo 24 giờ: ' + lp.dig);
    await shot('learn-24h');
    await page.click('#btn-learn-24h');
    await page.waitForTimeout(120);
    assert.ok(!(await H.visible('#learn-period')), 'tắt -> ẩn dòng buổi');
    assert.ok((await page.evaluate(() => window.__MeCung.G.learn.t.h)) <= 12, 'tắt -> quay về miền 1–12 giờ');
    await page.click('#btn-learn-back');
    await H.waitState('menu', 3000);

    // ---- C20: bài 4 hiện CẢ đồng hồ kim lẫn đồng hồ điện tử, có phép "+ 12" ----
    await page.evaluate(() => { const X = window.__MeCung; X.Store.p().unlocked = 8; X.Store.save(); });
    await page.evaluate(() => window.__MeCung.showLesson(window.Clock.LEVELS[3]));
    await page.waitForSelector('#lesson:not(.hidden)');
    await page.evaluate(() => { const b = document.querySelector('#lesson-demos button'); if (b) b.click(); });
    await page.waitForTimeout(200);
    const l4 = await page.evaluate(() => ({
      kim: !!document.querySelector('#lesson-clock svg.clock-svg'),
      so: !!document.querySelector('#lesson-clock svg.digital-svg'),
      read: document.querySelector('#lesson-clock .read').textContent
    }));
    assert.ok(l4.kim && l4.so, 'bài 4 có cả đồng hồ kim và đồng hồ điện tử: ' + JSON.stringify(l4));
    assert.ok(/\+ 12 =/.test(l4.read), 'bài 4 nêu phép cộng 12: ' + l4.read);
    await shot('lesson-l4-both');

    // ---- C17: màn 8 hiện đồng hồ kim của mốc bắt đầu trên HUD ----
    await H.startLevel(7);
    const l8 = await page.evaluate(() => {
      const G = window.__MeCung.G, svg = document.querySelector('#hud-target-clock svg');
      return { hud: G.roundInfo.hudClock, start: G.roundInfo.extra.start, shown: !document.getElementById('hud-target-clock').hidden, w: svg ? Math.round(svg.getBoundingClientRect().width) : 0, oy: G.oy, hb: document.querySelector('#hud .hud-top').getBoundingClientRect().bottom, cell: G.cell };
    });
    assert.ok(l8.shown && l8.w >= 100, 'màn 8: HUD hiện đồng hồ mốc bắt đầu (' + l8.w + ' px)');
    assert.deepEqual([l8.hud.h, l8.hud.m], [l8.start.h, l8.start.m], 'đúng là mốc bắt đầu');
    assert.ok(l8.hb <= l8.oy, 'HUD màn 8 vẫn nằm trên mê cung: ' + JSON.stringify(l8));
    assert.ok(l8.cell >= 30, 'ô mê cung màn 8 ≥ 30 px: ' + l8.cell);
    await shot('l8-hud');
    const pf = await H.perf('iPad ngang, màn 8 đang chơi');
    assert.ok(pf.f < 8, 'một khung hình < 8 ms (còn dư nhiều cho 60 fps): ' + pf.f);

    // ---- C19: nét mặt Cú Tí đổi khi chọn nhầm / ăn đúng ----
    const w8 = await page.evaluate(() => { const it = window.__MeCung.G.items.find((i) => !i.correct); return { r: it.r, c: it.c }; });
    await hook('X.teleport(' + w8.r + ', ' + w8.c + ') || true');
    let mood = await page.evaluate(() => { const p = window.__MeCung.G.player; window.__MeCung.render(); return { mood: p.mood, t: p.moodT }; });
    assert.equal(mood.mood, 'sad', 'chọn nhầm -> Cú Tí tiu nghỉu');
    assert.ok(mood.t > 0);
    await page.evaluate(() => { const X = window.__MeCung; for (let k = 0; k < 40; k++) { X.G.invuln = 1e9; X.update(0.1); } });
    const okIt = await page.evaluate(() => { const it = window.__MeCung.G.items.find((i) => i.correct && !i.taken); return it ? { r: it.r, c: it.c } : null; });
    if (okIt) {
      await hook('X.teleport(' + okIt.r + ', ' + okIt.c + ') || true');
      mood = await page.evaluate(() => { const p = window.__MeCung.G.player; window.__MeCung.render(); return { mood: p.mood }; });
      assert.equal(mood.mood, 'happy', 'ăn đúng -> Cú Tí vui');
    }
    // hết thời gian thì trở lại bình thường
    await page.evaluate(() => { const X = window.__MeCung; for (let k = 0; k < 40; k++) { X.G.invuln = 1e9; X.update(0.1); } X.render(); });
    assert.equal(await page.evaluate(() => window.__MeCung.G.player.mood), '', 'nét mặt trở lại bình thường');

    // ---- Nhãn "📝 Ôn lại" trên HUD và trong hỏi đáp; câu hỏi luôn có hình (C5) ----
    await page.evaluate(() => window.__MeCung.goLevels());
    await page.evaluate(() => {
      const X = window.__MeCung, b = X.Store.p();
      b.missed = { 'analog|10:0': { n: 3, ok: 0, last: Date.now(), info: { kind: 'analog', h: 10, m: 0, style: 'analog' } } };
      X.Store.save();
    });
    await H.startLevel(0);
    await page.evaluate(() => { const X = window.__MeCung; X.startRound(true, window.Clock.makeRound(X.G.level, { h: 10, m: 0 })); });
    await page.waitForTimeout(120);
    const tag = await page.evaluate(() => { const el = document.querySelector('#hud-target-text .review-tag'); return { has: !!el, text: el ? el.textContent : '', review: window.__MeCung.G.roundInfo.review }; });
    assert.ok(tag.has && tag.review && tag.text.indexOf('Ôn lại') > 0, 'HUD có nhãn 📝 Ôn lại: ' + JSON.stringify(tag));
    await page.evaluate(() => window.__MeCung.render());
    await shot('review-tag');
    await page.evaluate(() => { const X = window.__MeCung; X.G.mistakes = []; X.startQuiz(); });
    await page.waitForSelector('#quiz:not(.hidden)');
    const qz = await page.evaluate(() => {
      const Q = window.__MeCung.G.quiz;
      const pic = (q) => !!(q.clock || q.options.some((op) => !!op.clock));
      return { review: !!Q.current.review, tag: !!document.querySelector('#quiz-q .review-tag'), pics: Q.list.filter(pic).length, total: Q.total };
    });
    assert.ok(qz.review && qz.tag, 'câu ôn lại có nhãn 📝 trong hỏi đáp: ' + JSON.stringify(qz));
    assert.ok(qz.pics >= 1, 'bộ câu hỏi luôn có ít nhất một câu kèm hình đồng hồ (C5): ' + JSON.stringify(qz));
    await page.waitForTimeout(450);        // chờ bảng hỏi đáp hiện hẳn rồi mới chụp
    await shot('quiz-review-tag');

    // ---- Ăn mừng khi qua màn + kỷ lục mới, sao hiện ra có hoạt hình ----
    assert.equal(await H.finishQuiz(), 'result');
    const cel = await page.evaluate(() => {
      const X = window.__MeCung;
      const stars = document.querySelectorAll('#result-stars .on');
      return {
        parts: X.G.parts.length,
        record: !document.getElementById('result-record').hidden,
        stars: stars.length,
        anim: stars.length ? getComputedStyle(stars[0]).animationName : '',
        aria: document.getElementById('result-stars').getAttribute('aria-label')
      };
    });
    assert.ok(cel.parts > 0, 'qua màn -> có pháo giấy ăn mừng');
    assert.ok(cel.record, 'điểm cao nhất đầu tiên -> huy hiệu KỶ LỤC MỚI');
    assert.ok(cel.stars >= 1 && cel.anim === 'star-in', 'sao hiện ra có hoạt hình: ' + JSON.stringify(cel));
    assert.ok(/trên 3 sao/.test(cel.aria), 'sao có nhãn cho trình đọc màn hình: ' + cel.aria);
    // ít hiệu ứng -> tắt hoạt hình sao và bớt pháo giấy
    await page.evaluate(() => { document.documentElement.classList.add('lite-fx'); });
    const lite = await page.evaluate(() => getComputedStyle(document.querySelector('#result-stars .on')).animationName);
    assert.equal(lite, 'none', 'chế độ ít hiệu ứng: sao không chạy hoạt hình');
    await page.evaluate(() => { document.documentElement.classList.remove('lite-fx'); });
    await page.waitForTimeout(450);
    await shot('celebrate');

    // ---- Huy hiệu "Đã thuộc" trên thẻ màn và trong báo cáo (≥ 20 câu, ≥ 90% đúng) ----
    await page.evaluate(() => {
      const X = window.__MeCung, s = X.Store.p().stats;
      s.byTopic.l1 = { c: 27, w: 1 };
      s.byTopic.l2 = { c: 10, w: 10 };
      X.Store.save();
      X.goLevels();
    });
    await H.waitState('levels', 3000);
    // C7: nhãn nhỏ trên thẻ màn (kỷ lục, "Lớp n") cũng phải đủ tương phản 4,5:1
    const small = await page.evaluate(() => {
      const of = (sel) => { const el = document.querySelector(sel); const c = getComputedStyle(el); const p = getComputedStyle(el.closest('.level-card')); return { fg: c.color, bg: c.backgroundColor === 'rgba(0, 0, 0, 0)' ? p.backgroundColor : c.backgroundColor, size: parseFloat(c.fontSize) }; };
      return { best: of('.level-card .best'), grade: of('.level-card .grade'), mastery: of('.level-card .mastered') };
    });
    Object.keys(small).forEach((k) => {
      const c = small[k], bg = c.bg === 'rgba(0, 0, 0, 0)' ? 'rgb(255, 255, 255)' : c.bg;
      assert.ok(contrast(c.fg, bg) >= 4.5, 'nhãn ' + k + ' trên thẻ màn: ' + contrast(c.fg, bg).toFixed(2) + ' ' + JSON.stringify(c));
    });
    console.log('tương phản nhãn thẻ màn: kỷ lục=' + contrast(small.best.fg, 'rgb(255, 255, 255)').toFixed(2) + ' lớp=' + contrast(small.grade.fg, small.grade.bg).toFixed(2));

    const mast = await page.evaluate(() => ({
      l1: (document.querySelector('.level-card[data-id="l1"] .mastered') || {}).textContent || '',
      l2: !!document.querySelector('.level-card[data-id="l2"] .mastered')
    }));
    assert.ok(mast.l1.indexOf('Đã thuộc') >= 0, 'màn 1 có huy hiệu "Đã thuộc": ' + mast.l1);
    assert.equal(mast.l2, false, 'màn chưa đạt 90% thì không có huy hiệu');
    await page.waitForTimeout(500);        // chờ bảng kết quả mờ đi rồi mới chụp lưới màn
    await shot('mastery');
    await page.click('#btn-report-levels');
    await page.waitForSelector('#report:not(.hidden)');
    const rep = await page.evaluate(() => ({
      mastered: document.querySelectorAll('#report-levels .mastered').length,
      weak: document.getElementById('report-weak').textContent,
      weakHidden: document.getElementById('report-weak').hidden,
      weakBadges: Array.from(document.querySelectorAll('#report-levels .weak')).map((el) => el.textContent),
      review: document.getElementById('report-review').textContent
    }));
    assert.equal(rep.mastered, 1, 'báo cáo có đúng một màn "Đã thuộc"');
    assert.equal(rep.weakHidden, false, 'có màn yếu thì dòng "Cần luyện thêm" phải hiện');
    assert.ok(rep.weak.startsWith('Cần luyện thêm: '), 'dòng cần luyện thêm: ' + rep.weak);
    assert.ok(rep.weak.indexOf('Màn 2') > 0, 'báo cáo nêu màn cần luyện thêm: ' + rep.weak);
    assert.deepEqual(rep.weakBadges, ['⚠️ Cần luyện thêm'], 'đúng một dòng có huy hiệu cần luyện thêm');
    assert.ok(rep.review.length > 5, 'báo cáo có danh sách cần ôn lại');
    await page.waitForTimeout(450);
    await shot('report-mastery');

    // Máy KHÔNG bật "giảm chuyển động": nút ✨ Hiệu ứng bấm được, đổi qua lại Nhiều ⇄ Ít
    await page.click('#btn-report-back');
    await page.waitForTimeout(200);
    assert.ok(!(await H.visible('#report')), 'đóng bảng kết quả về màn chọn màn');
    await page.click('#btn-levels-back');
    await H.waitState('menu');
    const fxBtn = page.locator('#menu .toggle[data-set="fx"]');
    assert.equal(await fxBtn.getAttribute('aria-pressed'), 'true');
    assert.equal(await fxBtn.isDisabled(), false);
    await fxBtn.click();
    assert.equal(await hook('X.Store.data.fx'), 'lite');
    assert.equal(await page.locator('#menu .toggle[data-set="fx"]').getAttribute('aria-pressed'), 'false');
    assert.ok(await page.evaluate(() => document.documentElement.classList.contains('lite-fx')));
    await page.locator('#menu .toggle[data-set="fx"]').click();
    assert.equal(await hook('X.Store.data.fx'), 'full');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('me-cung-dong-ho-v1')).fx), 'full');
    console.log('perf (lượt 7) =', JSON.stringify(await hook('X.G.perf')));
  }, { viewport: { width: 1180, height: 820 } });
  return assertClean(log, 'me-cung run 7 (đã thuộc, ôn lại, ăn mừng, buổi & 24 giờ, nét mặt)');
}

/* Lượt 8 (iPad dọc 820×1180): ảnh chụp menu, HUD giữa ván và bảng kết quả; HUD phải nằm gọn trong màn hình. */
async function run8() {
  const log = await withGame('me-cung-dong-ho', async ({ page, hook, shot }) => {
    const H = helpers(page);
    assert.equal(await H.state(), 'menu');
    await shot('portrait-menu');
    await page.evaluate(() => { const X = window.__MeCung; X.Store.p().unlocked = 8; X.Store.save(); });
    await H.startLevel(6);                                    // màn 7: HUD có đồng hồ kim tham chiếu
    await page.evaluate(() => { const X = window.__MeCung; X.G.fright = 5; X.G.invuln = 1e9; X.update(0.016); X.render(); });
    for (const sel of ['#btn-pause', '#hud-lives', '#btn-hud-speak', '#btn-hud-hint', '#hud-target']) {
      const r = await H.rect(sel);
      assert.ok(r.x >= 0 && r.r <= 820 && r.y >= 0 && r.b <= 1180, sel + ' nằm trong màn hình dọc: ' + JSON.stringify(r));
    }
    const g = await page.evaluate(() => {
      const X = window.__MeCung, G = X.G, m = G.maze;
      return { cell: G.cell, tr: m.transposed, ox: G.ox, oy: G.oy, w: G.cell * m.cols, h: G.cell * m.rows, f: G.field, hb: document.querySelector('#hud .hud-top').getBoundingClientRect().bottom };
    });
    assert.ok(g.cell >= 30, 'ô mê cung dọc ≥ 30 px: ' + g.cell);
    assert.ok(g.hb <= g.oy, 'HUD nằm trên mê cung: ' + JSON.stringify(g));
    // mê cung (xoay hay không tùy vùng trống còn lại) phải nằm gọn trong vùng chơi
    assert.ok(g.ox >= g.f.x - 1 && g.ox + g.w <= g.f.x + g.f.w + 1, 'mê cung vừa bề ngang: ' + JSON.stringify(g));
    assert.ok(g.oy >= g.f.y - 1 && g.oy + g.h <= g.f.y + g.f.h + 1, 'mê cung vừa bề dọc: ' + JSON.stringify(g));
    assert.ok(g.oy + g.h <= 1180, 'mê cung không tràn xuống dưới màn hình');
    console.log('iPad dọc: ô = ' + g.cell + ' px, mê cung ' + (g.tr ? 'xoay dọc' : 'ngang') + ', vùng chơi ' + Math.round(g.f.w) + '×' + Math.round(g.f.h));
    await shot('portrait-hud');
    const pf = await H.perf('iPad dọc, màn 7 đang chơi');
    assert.ok(pf.f < 8, 'một khung hình < 8 ms: ' + pf.f);
    assert.equal(await H.finishLevel(), 'quiz');
    assert.equal(await H.finishQuiz(), 'result');
    assert.ok(await H.visible('#result'));
    await shot('portrait-result');
    console.log('perf (iPad dọc) =', JSON.stringify(await hook('X.G.perf')));
  }, { viewport: { width: 820, height: 1180 }, reducedMotion: 'reduce' });
  return assertClean(log, 'me-cung run 8 (iPad dọc 820×1180)');
}

(async () => {
  // Chạy tất cả; hoặc chọn vài lượt để thử nhanh:  node tests/e2e/me-cung-dong-ho.e2e.js 7 8
  const runs = { 1: run1, 2: run2, 3: run3, 4: run4, 5: run5, 6: run6, 7: run7, 8: run8 };
  const want = process.argv.slice(2).filter((a) => runs[a]);
  const ids = want.length ? want : Object.keys(runs);
  let all = true;
  for (const id of ids) all = (await runs[id]()) && all;
  if (!all) process.exitCode = 1;
  console.log(all ? 'me-cung e2e: PASS' : 'me-cung e2e: FAIL');
})().catch((e) => { console.error(e); process.exit(1); });
