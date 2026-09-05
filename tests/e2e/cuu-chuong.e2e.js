'use strict';
/* Kiểm thử đầu-cuối Vệ Binh Cửu Chương bằng Playwright.
   Chạy: NODE_PATH=/opt/node22/lib/node_modules node tests/e2e/cuu-chuong.e2e.js
   Kiểm tra: luồng chơi thật, gợi ý sau 2 lần sai, ôn lại thông minh, hồ sơ nhiều bé,
   báo cáo phụ huynh, di trú và dữ liệu rác trong localStorage, ổn định, cả hai hướng màn hình. */
const assert = require('node:assert/strict');
const { withGame, assertClean } = require('./lib/browser.js');

const LAND = { width: 1180, height: 820 };
const PORT = { width: 820, height: 1180 };
const PHONE = { width: 390, height: 844 };
const PHONE_LAND = { width: 844, height: 390 };

/* Giả lập giọng đọc để kiểm tra thứ tự đọc (sandbox không có giọng tiếng Việt). */
const SPEECH_STUB = `
  window.SPEECH_LOG = [];
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
    speaking: false, pending: false,
    speak: function (u) { window.SPEECH_LOG.push('speak:' + u.text); if (u.onstart) u.onstart(); if (u.onend) setTimeout(function () { u.onend(); }, 1); },
    cancel: function () { window.SPEECH_LOG.push('cancel'); },
    getVoices: function () { return [{ lang: 'vi-VN', name: 'Linh', localService: true }]; },
    addEventListener: function () {}, removeEventListener: function () {}
  } });
`;

/* Phép đo hiệu năng cố định: dựng cảnh nặng rồi vẽ 300 khung hình, trả về ms trung bình mỗi khung. */
const BENCH = '(function(){' +
  'X.G.meteors.length = 0; X.G.parts.length = 0;' +
  'for (var i = 0; i < 6; i++) X.spawnForQuestion();' +
  'for (var j = 0; j < 200; j++) X.G.parts.push({kind: "spark", x: Math.random() * X.G.W, y: Math.random() * X.G.H,' +
  ' vx: 0, vy: 0, size: 4, color: "#ffd166", life: 99, max: 99});' +
  'X.render(); X.render();' +
  'var t0 = performance.now();' +
  'for (var k = 0; k < 300; k++) { X.G.anim += 0.016; X.render(); }' +
  'return (performance.now() - t0) / 300;})()';

const HIT = '(function(){var t=X.getTarget(); if(!t||!t.q) return false; String(t.q.answer).split("").forEach(X.typeDigit); X.fire(); return true;})()';
const SPAWN = '(function(){X.spawnForQuestion(); return X.liveMeteors().length;})()';
/* Gõ một số chắc chắn SAI (không trùng đáp án của bất kỳ thiên thạch nào đang bay) rồi bắn. */
const WRONG = '(function(){var live = X.liveMeteors(); var v = 1;' +
  ' while (live.some(function (m) { return m.q && m.q.answer === v; })) v++;' +
  ' String(v).split("").forEach(X.typeDigit); X.fire(); return v;})()';

function ok(cond, msg) { assert.ok(cond, msg); }

async function playUntil(page, hook, want, max) {
  for (let i = 0; i < (max || 40); i++) {
    if ((await hook('X.G.solved')) >= want) return true;
    if (!(await hook('X.liveMeteors().length'))) await hook(SPAWN);
    await hook(HIT);
    await page.waitForTimeout(60);
  }
  return (await hook('X.G.solved')) >= want;
}

async function waitPlaying(page) {
  await page.waitForFunction(() => window.__CuuChuong && window.__CuuChuong.G.state === 'playing', null, { timeout: 15000 });
}

/* ---------------- 1. Luồng chính trên iPad ngang ---------------- */
async function mainFlow() {
  return withGame('cuu-chuong', async ({ page, hook, shot }) => {
    const html = await page.content();
    ok(/Content-Security-Policy/.test(html), 'thiếu CSP meta');
    ok(!/ on[a-z]+="/.test(html), 'còn thuộc tính on*= inline');
    assert.equal(await page.locator('script:not([src])').count(), 0, 'còn <script> inline');
    assert.equal(await page.locator('#toast[role="status"]').count(), 1, '#toast thiếu role=status');
    ok((await page.textContent('#btn-player')).indexOf('Bé') >= 0, 'thẻ tên phải hiện tên bé');
    assert.equal(await page.locator('.toggle[data-set="fx"]').count(), 2, 'thiếu nút ✨ Hiệu ứng ở menu/tạm dừng');
    ok((await page.locator('.toggle[aria-pressed]').count()) >= 8, 'nút bật/tắt thiếu aria-pressed');

    await page.click('#btn-play');
    await page.waitForSelector('#levels:not(.hidden)');
    assert.equal(await page.locator('.level-card[tabindex="0"]').count(), 8, 'phải có 8 thẻ bảng bấm được bằng bàn phím');
    ok(await page.getAttribute('#btn-levels-howto', 'aria-label'), '#btn-levels-howto thiếu aria-label');
    await page.click('.level-card[data-id="t7"]');
    await waitPlaying(page);
    await page.waitForTimeout(400);
    await shot('ipad-land-play');

    ok(await playUntil(page, hook, 6), 'không trả lời đúng được 6 câu');
    assert.equal(await hook('X.G.stage'), 2, 'đúng 5 câu phải sang đợt 2');
    ok(await page.isVisible('#hud-combo'), 'chip combo phải hiện khi đúng liên tiếp');

    // Băng-rôn "Đợt N!" là phần tử DOM (không vẽ lên canvas): hiện ngay, nằm gọn trong sân chơi rồi tự ẩn
    await hook('(function(){X.G.solved = 9; X.G.stage = 2; X.spawnForQuestion(); return 1;})()');
    await hook(HIT);
    await page.waitForTimeout(120);
    assert.equal(await hook('X.G.stage'), 3, 'phải sang đợt 3 để thử băng-rôn');
    ok(await page.isVisible('#hud-stage-banner'), 'băng-rôn Đợt N phải hiện');
    ok((await page.textContent('#hud-stage-banner')).indexOf('Đợt 3') >= 0, 'băng-rôn phải ghi số đợt');
    const bn = await page.locator('#hud-stage-banner').boundingBox();
    const fld = await hook('(function(){return {x: X.G.field.x, w: X.G.field.w};})()');
    ok(bn.x >= fld.x - 1 && bn.x + bn.width <= fld.x + fld.w + 1, 'băng-rôn phải nằm trong sân chơi: ' + JSON.stringify(bn) + ' / ' + JSON.stringify(fld));
    await page.waitForTimeout(1800);
    ok(await page.isHidden('#hud-stage-banner'), 'băng-rôn phải tự ẩn sau ~1,7 giây');
    const solved = await hook('X.G.solved');

    await hook('X.endGame("timeup")');
    await page.waitForSelector('#gameover:not(.hidden)', { timeout: 10000 });
    assert.equal(await page.textContent('#st-correct'), String(solved));
    ok(await page.isVisible('#review-perfect'), 'không sai câu nào thì phải khen');
    assert.equal(await page.locator('#name-entry').count(), 0, 'ô nhập tên cũ phải được bỏ');
    ok((await hook('X.Store.p().records["t7:mix:90"].best')) > 0, 'phải lưu kỷ lục theo bé');
    assert.equal(await hook('X.Store.p().stats.plays'), 1);
    ok((await hook('X.Store.p().stats.byTopic.t7.c')) >= 6, 'thống kê theo bảng phải cộng dồn');
    ok((await page.textContent('#leader')).indexOf('Bé') >= 0, 'bảng vàng phải ghi tên bé đang chơi');
    ok(await page.isHidden('#hud'), 'HUD phải ẩn sau khi hiện kết quả');
    // Ăn mừng: kỷ lục mới thì bắn pháo giấy trên lớp riêng #fx (không bị bảng kết quả che)
    ok(await page.isVisible('#result-record'), 'ván đầu tiên phải là kỷ lục mới');
    ok((await hook('X.G.parts.filter(function(p){return p.kind === "confetti";}).length')) > 0, 'kỷ lục mới phải có pháo giấy ăn mừng');
    const fx = await page.evaluate(() => {
      const c = document.getElementById('fx'), g = document.getElementById('game');
      return { w: c.width, h: c.height, z: Number(getComputedStyle(c).zIndex), gz: Number(getComputedStyle(g).zIndex) || 0 };
    });
    ok(fx.w > 0 && fx.h > 0 && fx.z > fx.gz, 'lớp pháo giấy phải nằm trên canvas trò chơi: ' + JSON.stringify(fx));
    ok((await page.locator('#result-stars span').count()) === 3, 'bảng kết quả phải có 3 ngôi sao');
    await shot('land-results');

    await page.click('#btn-home');
    await page.waitForTimeout(300);
    assert.equal(await hook('X.G.field.w'), await hook('X.G.W'), 'về menu phải trả lại toàn bộ chiều rộng sân chơi');
  }, { viewport: LAND });
}

/* ---------------- 2. Sai, gợi ý, vỡ khiên ---------------- */
async function wrongAndHint() {
  return withGame('cuu-chuong', async ({ page, hook, shot }) => {
    await hook('(function(){X.startGame(window.Tables.levelById("t8")); return 1;})()');
    await waitPlaying(page);
    await hook(SPAWN);
    const text = await hook('X.getTarget().q.text');
    await hook(WRONG);
    await page.waitForTimeout(60);
    ok((await page.textContent('#hud-hint')).indexOf('Chưa đúng') === 0, 'sai lần đầu phải mách cách nghĩ: ' + (await page.textContent('#hud-hint')));
    await hook(WRONG);
    await page.waitForTimeout(100);
    ok(await hook('X.getTarget().hint'), 'sai 2 lần phải hiện đáp án trên thiên thạch');
    ok(await page.isVisible('#hud-hint'), 'ô nhắc đáp án phải hiện');
    assert.equal(await hook('X.G.missed'), 1, '2 lần thử sai trên cùng một câu chỉ tính 1 câu sai');
    assert.equal(await hook('X.G.attemptsWrong'), 2, 'phải đếm riêng số lần thử sai');
    assert.equal(await hook('X.Store.p().missed[' + JSON.stringify(text) + '].n'), 1, 'câu sai phải vào danh sách ôn');
    await page.waitForTimeout(4000);
    ok(await page.isVisible('#hud-hint'), 'ô nhắc đáp án phải còn sau 4 giây');
    ok((await page.textContent('#hud-hint')).indexOf('Đáp án') >= 0);

    // Đổi bố cục (xoay máy) không được thu nhỏ thiên thạch đang hiện đáp án
    const rHint = await hook('X.getTarget().r');
    ok(rHint > (await hook('X.G.baseR')) * 1.1, 'thiên thạch hiện đáp án phải to hơn bình thường: ' + rHint);
    await hook('(function(){X.layout(); return 1;})()');
    ok(Math.abs((await hook('X.getTarget().r')) - rHint) < 0.5, 'bố cục tính lại làm nhỏ đáp án đã hiện: ' + rHint + ' → ' + (await hook('X.getTarget().r')));

    await hook(HIT);
    await page.waitForTimeout(50);
    assert.equal(await hook('X.G.hinted'), 1, 'bắn khi đã nhìn đáp án phải tính riêng');
    assert.equal(await hook('X.G.solved'), 0, 'nhìn đáp án không tính là tự làm được');
    assert.equal(await hook('X.G.stage'), 1, 'nhìn đáp án không được đẩy nhanh độ khó');

    // Bắn khi chưa có thiên thạch nào: không tính là sai
    await hook('(function(){X.G.meteors.length = 0; X.G.targetId = 0; return 1;})()');
    const before = await hook('X.G.attemptsWrong');
    await hook('(function(){X.typeDigit("4"); X.fire(); return 1;})()');
    assert.equal(await hook('X.G.attemptsWrong'), before, 'bắn lúc trống trời không được tính sai');
    assert.equal(await hook('X.G.typed'), '4', 'phải giữ nguyên số đã gõ');

    // Thiên thạch chạm khiên: mất 1 khiên, có khoảng lặng để nghe giải thích
    await hook('(function(){X.G.typed=""; X.spawnForQuestion(); return 1;})()');
    const shields = await hook('(function(){var m=X.getTarget(); m.x = X.G.planet.cx; m.y = X.G.planet.cy - X.G.shieldR; X.update(0.02); return X.G.shields;})()');
    assert.equal(shields, 2, 'chạm khiên phải mất đúng 1 khiên');
    ok((await hook('X.G.holdUntil')) > (await hook('X.G.time')), 'phải có khoảng lặng sau khi vỡ khiên');
    await page.waitForTimeout(2500);                    // đủ để câu hỏi kế tiếp được đọc
    const sp = await page.evaluate(() => window.SPEECH_LOG || []);
    const i = sp.map((s, k) => (s.indexOf('speak:Ối!') === 0 ? k : -1)).filter((k) => k >= 0).pop();
    ok(i >= 0, 'phải đọc lời giải thích khi vỡ khiên: ' + sp.join('|'));
    assert.equal(sp.slice(i + 1).indexOf('cancel'), -1, 'câu hỏi kế tiếp không được cắt lời giải thích: ' + sp.slice(i).join('|'));
    ok(sp.slice(i + 1).some((x) => x.indexOf('speak:') === 0), 'sau khi giải thích vẫn phải đọc câu hỏi mới');
    await shot('land-hint');

    // Hết khiên: mời bé xem lại bảng rồi luyện tiếp ngay bảng đó (không phải quay về menu)
    await hook('X.endGame("nolife")');
    await page.waitForSelector('#gameover:not(.hidden)', { timeout: 10000 });
    ok(await page.isVisible('#btn-result-tables'), 'vỡ khiên phải mời bé xem lại bảng cửu chương');
    ok((await page.textContent('#btn-result-tables')).indexOf('8') >= 0, 'nút phải ghi rõ bảng nào: ' + (await page.textContent('#btn-result-tables')));
    await page.click('#btn-result-tables');
    await page.waitForSelector('#tables:not(.hidden)');
    assert.equal(await hook('X.G.tableN'), 8, 'phải mở đúng bảng của màn vừa chơi');
    ok((await page.textContent('#btn-tables-play')).indexOf('8') >= 0, 'nút luyện tiếp phải ghi rõ bảng 8');
    await page.click('#btn-tables-play');
    await waitPlaying(page);
    assert.equal(await hook('X.G.level.id'), 't8', 'bấm "Luyện bảng này" phải vào đúng màn bảng 8');
  }, { viewport: LAND, initScript: SPEECH_STUB });
}

/* ---------------- 2c. Nút 💡 Gợi ý theo yêu cầu, số mờ trên thẻ trả lời, chip combo ---------------- */
async function hintButton() {
  return withGame('cuu-chuong', async ({ page, hook, shot }) => {
    await hook('(function(){X.startGame(window.Tables.levelById("t7")); return 1;})()');
    await waitPlaying(page);
    await hook(SPAWN);
    ok(await page.isVisible('#btn-hint'), 'nút 💡 Gợi ý phải hiện khi đang chơi');
    const box = await page.locator('#btn-hint').boundingBox();
    ok(box.width >= 44 && box.height >= 44, 'nút 💡 phải đủ to để chạm: ' + JSON.stringify(box));

    /* Lần bấm 1: mách cách nghĩ, chưa lộ đáp án */
    await page.evaluate(() => { window.SPEECH_LOG.length = 0; });
    await page.click('#btn-hint');
    await page.waitForTimeout(150);
    ok(await hook('X.getTarget().asked'), 'bấm 💡 phải đánh dấu câu này đã dùng gợi ý');
    assert.equal(await hook('X.G.asked'), 1, 'phải đếm số lần dùng gợi ý');
    assert.equal(await hook('X.getTarget().hint'), false, 'lần bấm đầu chưa được lộ đáp án');
    const answer = String(await hook('X.getTarget().q.answer'));
    const tip = await page.textContent('#hud-hint');
    ok(tip.indexOf('💡') === 0 && tip.length > 14, 'phải mách cách nghĩ: ' + tip);
    ok(tip.indexOf('= ' + answer) < 0, 'gợi ý lần đầu không được nói thẳng đáp án: ' + tip);
    const sp = (await page.evaluate(() => window.SPEECH_LOG || [])).filter((x) => x.indexOf('speak:') === 0);
    ok(sp.length >= 1, 'gợi ý phải được đọc lên');
    ok(sp[sp.length - 1].indexOf('×') < 0 && sp[sp.length - 1].indexOf(':') === 5, 'lời đọc gợi ý phải bỏ ký hiệu toán: ' + sp.join('|'));

    /* Trả lời đúng sau khi xin gợi ý: vẫn tính là tự làm được nhưng chỉ được nửa điểm, không thưởng nhanh */
    const before = await hook('X.G.score');
    await hook(HIT);
    await page.waitForTimeout(80);
    assert.equal(await hook('X.G.solved'), 1, 'xin gợi ý cách nghĩ vẫn tính là làm được');
    assert.equal((await hook('X.G.score')) - before, 50, 'câu có gợi ý chỉ được nửa điểm và không có thưởng nhanh');
    ok(await page.isVisible('#hud-combo'), 'chip combo phải hiện ngay từ câu đúng đầu tiên');
    const combo = await page.textContent('#hud-combo');
    ok(/[●○]{2}/.test(combo), 'chip combo phải có chấm đếm tới mốc nhân điểm: ' + combo);

    /* Lần bấm 2 trên câu mới: hiện đáp án + số mờ trên thẻ trả lời (C2) */
    await hook('(function(){X.G.meteors.length = 0; X.G.targetId = 0; X.spawnForQuestion(); return 1;})()');
    await page.waitForTimeout(60);
    await page.click('#btn-hint');
    await page.waitForTimeout(80);
    await page.click('#btn-hint');
    await page.waitForTimeout(150);
    ok(await hook('X.getTarget().hint'), 'bấm 💡 lần hai phải hiện đáp án');
    const ans2 = String(await hook('X.getTarget().q.answer'));
    assert.equal((await page.textContent('#hud-answer .typed.ghost')).trim(), ans2, 'thẻ trả lời phải hiện số mờ để bé gõ theo');
    ok((await page.textContent('#hud-hint')).indexOf('Đáp án') >= 0, 'ô nhắc phải ghi đáp án');
    await shot('land-hint-button');

    /* Gõ đúng chữ số đầu thì tô xanh, gõ sai thì tô đỏ */
    await hook('(function(){X.typeDigit(' + JSON.stringify(ans2.charAt(0)) + '); return 1;})()');
    await page.waitForTimeout(60);
    assert.equal(await page.locator('#hud-answer .typed i.good').count(), 1, 'chữ số gõ đúng phải được tô riêng');
    await hook('(function(){X.delDigit(); X.typeDigit(' + JSON.stringify(String((Number(ans2.charAt(0)) + 1) % 10)) + '); return 1;})()');
    await page.waitForTimeout(60);
    assert.equal(await page.locator('#hud-answer .typed i.bad').count(), 1, 'chữ số gõ sai phải được tô riêng');

    /* Gõ quá số chữ số cho phép thì nhắc, không im lặng (C11) */
    await hook('(function(){X.G.typed=""; X.typeDigit("1"); X.typeDigit("2"); X.typeDigit("3"); return 1;})()');
    await page.waitForTimeout(60);
    ok((await page.textContent('#hud-hint')).indexOf('chữ số') >= 0, 'gõ quá dài phải nhắc: ' + (await page.textContent('#hud-hint')));
    assert.equal(await hook('X.G.typed'), '12', 'không được nhận quá 2 chữ số ở màn bảng nhân');
  }, { viewport: LAND, initScript: SPEECH_STUB });
}

/* ---------------- 2b. Câu khó rơi chậm hơn, vòng sáng không bị cắt ở mép ---------------- */
async function fallAndEdges() {
  const dur = (hook, id) => hook('(function(){X.startGame(window.Tables.levelById("' + id + '")); X.G.stage = 1;' +
    ' X.spawnForQuestion(); var m = X.liveMeteors()[0];' +
    ' return (X.G.planet.cy - X.G.shieldR - m.y) / m.vy;})()');
  // Màn câu 3 chữ số: nhiều nhất 3 thiên thạch cùng lúc (dù đã lên đợt cao)
  const CAP = '(function(){X.G.stage = 9; X.G.holdUntil = 0; X.G.meteors.length = 0;' +
    ' for (var i = 0; i < 3; i++) X.spawnForQuestion();' +
    ' X.liveMeteors().forEach(function (m) { m.vy = 0; m.vx = 0; });' +
    ' X.G.lastSpawn = -999; X.update(0.05); X.update(0.05);' +
    ' return X.liveMeteors().length;})()';
  const phone = await withGame('cuu-chuong', async ({ page, hook }) => {
    const t7 = await dur(hook, 't7');
    const c6 = await dur(hook, 'c6');
    const c7 = await dur(hook, 'c7');
    ok(c6 > t7 * 1.4, 'câu nhân chia số lớn phải rơi chậm hơn hẳn: c6 ' + c6.toFixed(1) + 's vs t7 ' + t7.toFixed(1) + 's');
    ok(c7 > t7, 'màn Siêu Vệ Binh cũng phải được thêm thời gian đọc câu 3 chữ số: ' + c7.toFixed(1));

    await hook('(function(){X.startGame(window.Tables.levelById("c6")); return 1;})()');
    await waitPlaying(page);
    assert.equal(await hook(CAP), 3, 'màn nhân chia số lớn không được thả quá 3 thiên thạch cùng lúc');
    // C7: màn hẹp (điện thoại) thì thiên thạch to hơn nên cũng chỉ thả tối đa 3 viên
    await hook('(function(){X.startGame(window.Tables.levelById("t7")); return 1;})()');
    await waitPlaying(page);
    assert.equal(await hook(CAP), 3, 'điện thoại: không được thả quá 3 thiên thạch cùng lúc');
    ok(await hook('X.G.baseR') >= 44, 'điện thoại: thiên thạch phải to hơn để đọc được nhãn');

    // Vòng sáng mục tiêu (bán kính r × 1.28) không được bị mép sân cắt mất
    await hook('(function(){X.startGame(window.Tables.levelById("c6")); return 1;})()');
    await waitPlaying(page);
    const margins = await hook('(function(){' +
      'X.G.meteors.length = 0;' +
      'for (var i = 0; i < 4; i++) X.spawnForQuestion();' +
      'var f = X.G.field, live = X.liveMeteors(), out = [];' +
      'live.forEach(function (m, i) { m.x = i % 2 ? f.x - 400 : f.x + f.w + 400; m.vx = i % 2 ? -300 : 300; });' +
      'X.update(0.02);' +
      'live.forEach(function (m) { out.push([m.x - m.r * 1.28 - f.x, f.x + f.w - (m.x + m.r * 1.28)]); });' +
      'return out;})()');
    ok(margins.length >= 4, 'phải có thiên thạch để kiểm tra');
    margins.forEach((mg) => {
      ok(mg[0] >= -0.5, 'vòng sáng bị cắt ở mép trái: ' + mg[0]);
      ok(mg[1] >= -0.5, 'vòng sáng bị cắt ở mép phải: ' + mg[1]);
    });
  }, { viewport: PHONE });
  assertClean(phone, 'câu khó rơi chậm (điện thoại)');

  // Màn hình rộng: màn câu ngắn vẫn được thả tới 4 thiên thạch ở đợt cao
  return withGame('cuu-chuong', async ({ page, hook }) => {
    await hook('(function(){X.startGame(window.Tables.levelById("t7")); return 1;})()');
    await waitPlaying(page);
    assert.equal(await hook(CAP), 4, 'iPad ngang: màn câu ngắn vẫn được thả tới 4 thiên thạch');
    await hook('(function(){X.startGame(window.Tables.levelById("c6")); return 1;})()');
    await waitPlaying(page);
    assert.equal(await hook(CAP), 3, 'iPad ngang: màn nhân chia số lớn tối đa 3 thiên thạch');
  }, { viewport: LAND });
}

/* ---------------- 3. Ôn lại thông minh ---------------- */
async function reviewInjection() {
  const seed = JSON.stringify({
    players: { p1: { missed: {
      '7 × 8 = ?': { n: 3, ok: 0, last: 1, info: { kind: 'mul', label: '7 × 8', text: '7 × 8 = ?', answer: 56, table: 7 } },
      '? × 6 = 42': { n: 2, ok: 0, last: 2, info: { kind: 'find', label: '? × 6 = 42', text: '? × 6 = 42', answer: 7, table: 6 } }
    } } }
  });
  return withGame('cuu-chuong', async ({ page, hook }) => {
    await hook('(function(){X.startGame(window.Tables.levelById("t7")); return 1;})()');
    await waitPlaying(page);
    assert.equal(await hook('X.G.reviewQueue.length'), 1, 'chỉ lấy câu hợp với màn đang chơi');
    assert.equal(await hook('X.G.reviewQueue[0].key'), '7 × 8 = ?');
    await hook('(function(){X.spawnForQuestion(); X.spawnForQuestion(); return 1;})()');
    ok(await hook('X.liveMeteors().some(function(m){return m.q && m.q.review;})'), 'phải có thiên thạch ôn lại');
    await hook('(function(){X.G.meteors = X.G.meteors.filter(function(m){return m.q && m.q.review;}); X.G.targetId = 0; X.getTarget(); return 1;})()');
    await page.waitForTimeout(60);
    ok(await page.isVisible('#hud-answer .review-tag'), 'thẻ trả lời phải có nhãn 📝 Ôn lại');
    await hook(HIT);
    await page.waitForTimeout(60);
    assert.equal(await hook('X.Store.p().missed["7 × 8 = ?"].ok'), 1, 'trả lời đúng phải ghi nhận tiến bộ');

    await hook('(function(){X.startGame(window.Tables.levelById("c5")); return 1;})()');
    await waitPlaying(page);
    assert.equal(await hook('X.G.reviewQueue[0].key'), '? × 6 = 42', 'màn tìm thừa số phải lấy câu tìm thừa số');
  }, { viewport: LAND, initScript: "localStorage.setItem('cuu-chuong-v1', " + JSON.stringify(seed) + ");" });
}

/* ---------------- 4. Hồ sơ nhiều bé, báo cáo, cổng phụ huynh ---------------- */
async function profiles() {
  return withGame('cuu-chuong', async ({ page, hook, shot }) => {
    // tạo kỷ lục cho bé mặc định
    await hook('(function(){X.Store.setRecord(window.Tables.levelById("t7"), "mix", 90, {best: 3200, stars: 2, top: []}); X.Store.addStats({correct: 20, wrong: 1, seconds: 120}, {t7: {c: 20, w: 1}}); return 1;})()');
    await page.click('#btn-player');
    await page.waitForSelector('#players:not(.hidden)');
    await page.waitForTimeout(500);
    await shot('players');
    ok(await page.isDisabled('#btn-player-remove'), 'chỉ có 1 bé thì không cho xóa');
    await page.click('#btn-player-add');
    await page.fill('#player-name', 'Lan');
    await page.click('.avatar[data-avatar="🦊"]');
    await page.click('#btn-player-save');
    await page.waitForTimeout(200);
    ok((await page.textContent('#btn-player')).indexOf('Lan') >= 0, 'thẻ tên phải đổi sang bé mới');
    assert.equal(await page.locator('.player-item').count(), 2);

    await page.keyboard.press('Escape');
    await page.click('#btn-play');
    await page.waitForSelector('#levels:not(.hidden)');
    const bests = await page.locator('.level-card .best').allTextContents();
    ok(bests.every((t) => t.indexOf('🏆 0') === 0), 'bé mới phải bắt đầu từ 0: ' + bests.join('|'));
    ok((await hook('X.Store.data.players.p1.records["t7:mix:90"].best')) === 3200, 'kỷ lục của bé cũ phải còn nguyên');

    await page.click('#btn-levels-back');
    await page.waitForSelector('#menu:not(.hidden)');
    await page.click('#btn-player');
    await page.click('.player-item[data-id="p1"]');
    await page.waitForTimeout(200);
    await page.keyboard.press('Escape');
    await page.click('#btn-play');
    await page.waitForSelector('#levels:not(.hidden)');
    ok((await page.textContent('.level-card[data-id="t7"] .best')).indexOf('3.200') >= 0, 'quay lại bé cũ phải thấy kỷ lục');
    assert.equal(await page.locator('.level-card[data-id="t7"] .mastered').count(), 1, 'thẻ bảng 7 phải có nhãn ✅ Đã thuộc trên lưới chọn màn');
    ok((await page.textContent('.level-card[data-id="t7"] .mastered')).indexOf('Đã thuộc') >= 0);
    // Lối vào 📊 Kết quả ngay ở màn chọn màn chơi: mở được và ← quay lại đúng màn đó
    await page.click('#btn-report-levels');
    await page.waitForSelector('#report:not(.hidden)');
    await page.click('#btn-report-back');
    await page.waitForTimeout(200);
    ok(await page.isHidden('#report') && await page.isVisible('#levels'), 'mở báo cáo từ màn chọn màn thì ← phải quay lại đó');
    await page.click('#btn-levels-back');
    await page.waitForSelector('#menu:not(.hidden)');

    await page.click('#btn-player');
    await page.click('#btn-report');
    await page.waitForSelector('#report:not(.hidden)');
    await page.waitForTimeout(500);
    ok((await page.textContent('#report-title')).indexOf('Bé') >= 0, 'tiêu đề báo cáo phải có tên bé');
    assert.equal(await page.locator('#report-levels .report-row').count(), 15, 'báo cáo phải liệt kê 15 màn');
    ok((await page.textContent('#report-levels')).indexOf('Đã thuộc') >= 0, 'đúng ≥ 90% trên ≥ 20 câu phải có nhãn Đã thuộc');
    await shot('report');

    // Mở báo cáo từ màn "Ai đang chơi?" thì nút ← quay lại đúng màn đó (không rơi về menu)
    await page.click('#btn-report-back');
    await page.waitForTimeout(200);
    ok(await page.isHidden('#report'), '← phải đóng bảng kết quả');
    ok(await page.isVisible('#players'), 'mở báo cáo từ màn Ai đang chơi thì ← phải quay lại đó');
    await page.click('#btn-players-back');
    await page.waitForSelector('#menu:not(.hidden)');
    // Mở từ menu thì ← đóng hẳn về menu
    await page.click('#btn-report-menu');
    await page.waitForSelector('#report:not(.hidden)');
    await page.click('#btn-report-back');
    await page.waitForTimeout(200);
    ok(await page.isHidden('#report') && await page.isHidden('#players'), 'mở báo cáo từ menu thì ← phải về menu');
    await page.click('#btn-player');
    await page.click('#btn-report');
    await page.waitForSelector('#report:not(.hidden)');

    // Cổng phụ huynh: Escape và nút Hủy chỉ đóng cổng, bảng kết quả vẫn mở
    await page.click('#btn-report-reset');
    await page.waitForSelector('#parent-gate:not(.hidden)');
    await page.waitForTimeout(150);                       // chờ con trỏ vào ô nhập
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    ok(await page.isHidden('#parent-gate'), 'Escape phải đóng cổng phụ huynh');
    ok(await page.isVisible('#report'), 'Escape ở cổng phụ huynh không được đóng luôn bảng kết quả');
    await page.click('#btn-report-reset');
    await page.waitForSelector('#parent-gate:not(.hidden)');
    await page.evaluate(() => document.getElementById('parent-gate-input').blur());
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    ok(await page.isHidden('#parent-gate') && await page.isVisible('#report'), 'Escape ngoài ô nhập cũng chỉ đóng cổng phụ huynh');
    await page.click('#btn-report-reset');
    await page.waitForSelector('#parent-gate:not(.hidden)');
    await page.click('#btn-parent-gate-cancel');
    await page.waitForTimeout(150);
    ok(await page.isVisible('#report'), 'nút Hủy chỉ đóng cổng phụ huynh');
    assert.equal(await hook('X.Gate.cb'), null, 'đóng cổng phải quên việc đang chờ');

    await page.click('#btn-report-reset');
    await page.waitForSelector('#parent-gate:not(.hidden)');
    await page.fill('#parent-gate-input', '1');
    await page.click('#parent-gate-form button[type=submit]');
    ok(await page.isVisible('#parent-gate'), 'trả lời sai thì cổng phụ huynh vẫn đóng');
    const answer = await hook('X.Gate.answer');
    await page.fill('#parent-gate-input', String(answer));
    await page.click('#parent-gate-form button[type=submit]');
    await page.waitForTimeout(200);
    ok(await page.isHidden('#parent-gate'));
    assert.equal(await hook('X.Store.p().stats.plays'), 0, 'phải xóa tiến trình của bé đang chọn');
    assert.equal(await hook('X.Store.data.players.p1.records["t7:mix:90"]'), undefined);
    await page.keyboard.press('Escape');
    ok(await page.isHidden('#report'), 'Escape phải đóng bảng kết quả');
  }, { viewport: LAND });
}

/* ---------------- 4b. Báo cáo chỉ nói về những màn bé đã chơi ----------------
   Bé mới chỉ luyện Bảng 7: các màn thử thách phải ghi "chưa chơi", không mượn tỉ lệ đúng của bảng. */
async function reportScope() {
  const seed = JSON.stringify({
    players: { p1: { stats: { plays: 2, correct: 18, wrong: 2, seconds: 200, byTopic: { t7: { c: 18, w: 2 } }, last: 1 } } }
  });
  const rowsOf = (page) => page.locator('#report-levels .report-row').allTextContents();
  const rowOf = (rows, head) => rows.find((r) => r.indexOf(head) === 0) || '';
  return withGame('cuu-chuong', async ({ page, hook, shot }) => {
    await page.click('#btn-report-menu');
    await page.waitForSelector('#report:not(.hidden)');
    await page.waitForTimeout(400);
    const rows = await rowsOf(page);
    assert.equal(rows.length, 15);
    ok(rowOf(rows, '🌈 Bảng 7').indexOf('90% (20 câu)') >= 0, 'dòng Bảng 7: ' + rowOf(rows, '🌈 Bảng 7'));
    ['🌌 Bảng 7, 8, 9', '🪐 Cả bảng cửu chương', '🔍 Tìm thừa số', '🦸 Siêu Vệ Binh', '🚀 Bảng 2 và 5'].forEach((h) => {
      const r = rowOf(rows, h);
      ok(r.indexOf('chưa chơi') >= 0, h + ': màn chưa chơi không được mượn số liệu của bảng: ' + r);
    });
    ok((await page.textContent('#report-review')).indexOf('Bảng 7') < 0, 'bảng đã thuộc không được gợi ý luyện thêm');
    await shot('report-scope');

    // Chơi thật một ván "Tìm thừa số": chỉ dòng đó mới có số liệu
    await page.keyboard.press('Escape');
    await hook('(function(){X.startGame(window.Tables.levelById("c5")); return 1;})()');
    await waitPlaying(page);
    ok(await playUntil(page, hook, 3, 20), 'không trả lời đúng được 3 câu tìm thừa số');
    await hook('X.endGame("timeup")');
    await page.waitForSelector('#gameover:not(.hidden)', { timeout: 10000 });
    ok((await hook('X.Store.p().stats.byTopic.c5.c')) >= 3, 'phải ghi thống kê riêng cho màn Tìm thừa số');
    await page.click('#btn-home');
    await page.waitForSelector('#menu:not(.hidden)');
    await page.click('#btn-report-menu');
    await page.waitForSelector('#report:not(.hidden)');
    await page.waitForTimeout(300);
    const rows2 = await rowsOf(page);
    ok(rowOf(rows2, '🔍 Tìm thừa số').indexOf('câu)') >= 0, 'màn đã chơi phải hiện số liệu: ' + rowOf(rows2, '🔍 Tìm thừa số'));
    ok(rowOf(rows2, '🪐 Cả bảng cửu chương').indexOf('chưa chơi') >= 0, 'màn chưa chơi vẫn phải là "chưa chơi"');
  }, { viewport: LAND, initScript: "localStorage.setItem('cuu-chuong-v1', " + JSON.stringify(seed) + ");" });
}

/* ---------------- 5. Di trú và dữ liệu rác ---------------- */
async function migration() {
  const legacy = JSON.stringify({
    sound: true, music: false, duration: 120, op: 'div', names: ['Mai'],
    records: { 't7:mix:90': { best: 2500, stars: 2, top: [{ name: 'Mai', score: 2500, date: 1 }] } }
  });
  await withGame('cuu-chuong', async ({ hook }) => {
    assert.equal(await hook('X.Store.data.players.p1.records["t7:mix:90"].best'), 2500, 'phải di trú kỷ lục cũ sang bé p1');
    assert.equal(await hook('X.Store.data.records'), undefined);
    assert.equal(await hook('X.Store.data.music'), false, 'thiết lập của máy phải giữ nguyên');
    assert.equal(await hook('X.Store.data.duration'), 120);
    assert.equal(await hook('X.G.duration'), 120);
  }, { viewport: LAND, initScript: "localStorage.setItem('cuu-chuong-v1', " + JSON.stringify(legacy) + ");" });

  const hostile = [
    '{"records":"oops"}',
    '{"records":{"t2:mix:90":{"top":[null],"best":"<b>9</b>"}}}',
    '{"__proto__":{"pwned":1}}',
    '{"names":["<img src=x onerror=window.__xss=1>"],"records":{"t7:mix:90":{"best":9,"top":[{"name":"<img src=x onerror=window.__xss=1>","score":9,"date":1}]}}}'
  ];
  for (const seed of hostile) {
    const log = await withGame('cuu-chuong', async ({ page, hook }) => {
      await hook('(function(){X.startGame(window.Tables.levelById("t7")); return 1;})()');
      await waitPlaying(page);
      await playUntil(page, hook, 2, 12);
      await hook('X.endGame("timeup")');
      await page.waitForSelector('#gameover:not(.hidden)', { timeout: 10000 });
      assert.equal(await page.evaluate(() => window.__xss), undefined, seed + ': XSS lọt qua');
      assert.equal(await page.evaluate(() => ({}).pwned), undefined, seed + ': prototype bị nhiễm');
      await page.click('#btn-other-level');
      await page.waitForSelector('#levels:not(.hidden)');
      ok((await page.textContent('#level-grid')).indexOf('NaN') < 0, seed + ': lưới màn chơi có NaN');
    }, { viewport: LAND, initScript: "localStorage.setItem('cuu-chuong-v1', " + JSON.stringify(seed) + ");" });
    assertClean(log, 'dữ liệu rác ' + seed.slice(0, 28));
  }
}

/* ---------------- 6. Ổn định ---------------- */
async function stability() {
  return withGame('cuu-chuong', async ({ page, hook, log }) => {
    // lỗi giữa ván: về menu an toàn, không kẹt
    await hook('(function(){X.startGame(window.Tables.levelById("t7")); return 1;})()');
    await waitPlaying(page);
    await hook('(function(){X.G.meteors.push(null); return 1;})()');
    await page.waitForFunction(() => window.__CuuChuong.G.state === 'menu', null, { timeout: 5000 });
    ok(await page.isVisible('#menu'), 'sau lỗi phải quay về menu');
    ok(await page.evaluate(() => document.getElementById('toast').classList.contains('show')), 'phải báo cho bé biết có lỗi nhỏ');
    await page.waitForTimeout(300);
    // lỗi cố ý ở trên được onFatal ghi lại: bỏ khỏi danh sách lỗi của phiên kiểm thử
    log.errors = log.errors.filter((e) => e.indexOf('[cuu-chuong]') < 0);

    // ẩn tab giữa lúc đếm ngược: không được bắt đầu ván ở nền
    await hook('(function(){X.startGame(window.Tables.levelById("t7")); return 1;})()');
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { get: () => true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(200);
    assert.equal(await hook('X.G.state'), 'paused', 'ẩn tab lúc đếm ngược phải tạm dừng');
    ok(await page.isVisible('#pause'));
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { get: () => false, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.click('#btn-resume');
    await waitPlaying(page);

    // tạm dừng: HUD mờ đi, bộ đếm nhạc dừng
    await hook('(function(){X.G.score = 1234; return 1;})()');
    await page.click('#btn-pause');
    await page.waitForTimeout(150);
    ok(await page.evaluate(() => document.getElementById('hud').classList.contains('paused')), 'tạm dừng phải ẩn chip HUD');
    assert.equal(await page.evaluate(() => window.Music.timer), null, 'tạm dừng phải dừng bộ đếm nhạc');
    await page.click('#btn-resume');
    await waitPlaying(page);

    // Tạm dừng rồi bấm "🔄 Chơi lại": HUD phải hiện lại đầy đủ (không còn lớp .paused)
    await page.click('#btn-pause');
    await page.waitForSelector('#pause:not(.hidden)');
    await page.click('#btn-restart');
    await waitPlaying(page);
    await page.waitForTimeout(150);
    const hud = await page.evaluate(() => ({
      paused: document.getElementById('hud').classList.contains('paused'),
      answer: getComputedStyle(document.getElementById('hud-answer')).visibility,
      timer: getComputedStyle(document.getElementById('hud-timer')).visibility,
      pause: getComputedStyle(document.getElementById('btn-pause')).visibility
    }));
    assert.equal(hud.paused, false, 'chơi lại từ màn Tạm dừng vẫn còn lớp .paused: ' + JSON.stringify(hud));
    assert.equal(hud.answer, 'visible', 'thẻ trả lời bị ẩn sau khi chơi lại');
    assert.equal(hud.timer, 'visible', 'đồng hồ bị ẩn sau khi chơi lại');
    assert.equal(hud.pause, 'visible', 'nút tạm dừng bị ẩn sau khi chơi lại');
    await page.click('#btn-pause');
    await page.waitForTimeout(150);
    assert.equal(await hook('X.G.state'), 'paused', 'nút tạm dừng phải bấm được sau khi chơi lại');
    await page.click('#btn-resume');
    await waitPlaying(page);

    // điểm không bị phóng to vĩnh viễn
    await hook(SPAWN);
    await hook(HIT);
    await page.waitForTimeout(500);
    assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById('hud-score')).transform), 'none', 'điểm phải trở lại kích thước thường');
  }, { viewport: LAND });
}

/* ---------------- 6b. Xoay máy giữa ván ---------------- */
async function rotation() {
  return withGame('cuu-chuong', async ({ page, hook }) => {
    await hook('(function(){X.startGame(window.Tables.levelById("t7")); return 1;})()');
    await waitPlaying(page);
    await hook('(function(){X.spawnForQuestion(); var m=X.liveMeteors()[0]; m.y = X.G.planet.cy - X.G.shieldR - 80; return m.y;})()');
    await page.setViewportSize(LAND);
    await page.waitForTimeout(600);
    assert.equal(await hook('X.G.shields'), 3, 'xoay máy không được làm mất khiên');
    ok((await hook('X.liveMeteors().length')) >= 1, 'thiên thạch phải còn trên trời');
    assert.equal(await hook('X.G.state'), 'paused', 'xoay máy giữa ván phải tạm dừng để bé sẵn sàng');
  }, { viewport: PORT });
}

/* ---------------- 7. Giảm chuyển động ---------------- */
async function reducedMotion() {
  await withGame('cuu-chuong', async ({ page, hook }) => {
    assert.equal(await hook('X.Motion.lite'), true, 'phải tôn trọng prefers-reduced-motion');
    await hook('(function(){X.startGame(window.Tables.levelById("t7")); return 1;})()');
    await waitPlaying(page);
    const left = await hook('(function(){X.spawnForQuestion(); var m=X.getTarget(); m.x = X.G.planet.cx; m.y = X.G.planet.cy - X.G.shieldR; X.update(0.02); return X.G.shields;})()');
    assert.equal(left, 2, 'phải thật sự có va chạm khiên để kiểm tra hiệu ứng');
    assert.equal(await hook('X.G.shake'), 0, 'giảm chuyển động: không rung màn hình');
    assert.equal(await hook('X.G.flash'), null, 'giảm chuyển động: không chớp màn hình');
  }, { viewport: LAND, reducedMotion: 'reduce' });

  return withGame('cuu-chuong', async ({ page, hook }) => {
    assert.equal(await hook('X.Store.data.fx'), 'full');
    await page.click('#menu .toggle[data-set="fx"]');
    await page.waitForTimeout(150);
    assert.equal(await hook('X.Store.data.fx'), 'lite');
    assert.equal(await hook('X.Motion.lite'), true);
    ok(await page.evaluate(() => document.documentElement.classList.contains('lite-fx')));
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(400);
    assert.equal(await page.evaluate(() => window.__CuuChuong.Store.data.fx), 'lite', 'thiết lập hiệu ứng phải được nhớ');
    assert.equal(await page.getAttribute('#menu .toggle[data-set="fx"]', 'aria-pressed'), 'false');
  }, { viewport: LAND });
}

/* ---------------- 8. Hướng màn hình và điện thoại ---------------- */
async function screens() {
  await withGame('cuu-chuong', async ({ page, hook, shot }) => {
    await hook('(function(){X.startGame(window.Tables.levelById("t7")); return 1;})()');
    await waitPlaying(page);
    await hook(SPAWN);
    await page.waitForTimeout(400);
    await shot('ipad-port-play');
    const box = await page.locator('#numpad').boundingBox();
    ok(box.y + box.height <= PORT.height + 1, 'bàn phím số phải nằm trong màn hình');
  }, { viewport: PORT });

  return withGame('cuu-chuong', async ({ page, hook, shot }) => {
    // menu trên điện thoại phải vừa một màn hình (bé thấy được cả nút chơi lẫn ô chọn thời gian)
    await page.waitForTimeout(400);
    const mp = await page.evaluate(() => { const p = document.querySelector('#menu .panel'); return { s: p.scrollHeight, c: p.clientHeight }; });
    ok(mp.s <= mp.c + 20, 'menu trên điện thoại phải hiện đủ trong một màn: ' + JSON.stringify(mp));

    // bảng cửu chương không tràn ngang
    await page.click('#btn-tables');
    await page.waitForSelector('#tables:not(.hidden)');
    await page.waitForTimeout(400);
    const t = await page.evaluate(() => { const p = document.querySelector('#tables .panel'); return { s: p.scrollWidth, c: p.clientWidth }; });
    ok(t.s <= t.c + 1, 'bảng cửu chương tràn ngang: ' + JSON.stringify(t));
    await shot('phone-tables');
    await page.click('#btn-tables-back');

    await hook('(function(){X.startGame(window.Tables.levelById("t7")); return 1;})()');
    await waitPlaying(page);
    const hintEmpty = await page.evaluate(() => document.getElementById('hud-hint').getBoundingClientRect().height);
    ok(hintEmpty >= 30, 'ô nhắc phải giữ sẵn chỗ một dòng chữ (đang ' + hintEmpty + 'px)');
    await hook('(function(){X.G.streak = 6; X.G.score = 12345; X.update(0.016); return 1;})()');
    await page.waitForTimeout(200);
    const pause = await page.locator('#btn-pause').boundingBox();
    ok(pause.x + pause.width <= PHONE.width + 1, 'nút tạm dừng bị đẩy ra ngoài màn hình: ' + JSON.stringify(pause));
    const stage = await page.locator('#hud-stage').boundingBox();
    ok(stage.height < 32, 'chip đợt bị xuống dòng: ' + JSON.stringify(stage));
    await hook(SPAWN);
    await page.waitForTimeout(300);
    await shot('phone-play');

    // sai 2 lần: đáp án phải to, rõ trên màn hình nhỏ
    await hook(WRONG);
    await hook(WRONG);
    await page.waitForTimeout(600);
    ok(await page.isVisible('#hud-hint'), 'ô nhắc phải hiện trên điện thoại');
    ok((await hook('X.G.lastLabelPx')) >= 20, 'chữ trên thiên thạch quá nhỏ: ' + (await hook('X.G.lastLabelPx')));
    await shot('phone-hint');

    // Thiên thạch mới không được rơi vào sau ô nhắc đang mở
    const geo = await page.evaluate(() => {
      const X = window.__CuuChuong;
      const h = document.getElementById('hud-hint').getBoundingClientRect();
      X.spawnForQuestion();
      const live = X.liveMeteors(), m = live[live.length - 1];
      return { hintBottom: h.bottom, hintH: h.height, top: m.y - m.r, spawnY: X.G.spawnY };
    });
    ok(geo.top >= geo.hintBottom - 1, 'ô nhắc che mất thiên thạch mới rơi: ' + JSON.stringify(geo));

    await hook('X.endGame("timeup")');
    await page.waitForSelector('#gameover:not(.hidden)', { timeout: 10000 });
    await page.waitForTimeout(400);
    await shot('phone-results');
    const g = await page.evaluate(() => { const p = document.querySelector('#gameover .panel'); return { s: p.scrollHeight, c: p.clientHeight }; });
    ok(g.s <= g.c + 40, 'bảng kết quả trên điện thoại quá dài: ' + JSON.stringify(g));

    await page.setViewportSize(PHONE_LAND);
    await page.waitForTimeout(400);
    await page.click('#btn-again');
    await waitPlaying(page);
    await page.waitForTimeout(500);
    await shot('phone-land-play');
  }, { viewport: PHONE });
}

/* ---------------- 9. Bảng cửu chương ---------------- */
async function tablesScreen() {
  return withGame('cuu-chuong', async ({ page, hook }) => {
    await page.click('#btn-tables');
    await page.waitForSelector('#tables:not(.hidden)');
    assert.equal(await page.locator('.table-row[tabindex="0"]').count(), 20, 'phải có 20 dòng bảng bấm được bằng bàn phím');
    ok(await page.evaluate(() => window.Voice.available), 'giọng đọc giả lập phải sẵn sàng');
    await page.evaluate(() => { window.SPEECH_LOG.length = 0; });
    await page.locator('.table-row[data-kind="mul"][data-i="2"]').press('Enter');
    await page.waitForTimeout(300);
    let sp = await page.evaluate(() => window.SPEECH_LOG || []);
    ok(sp.some((s) => s.indexOf('nhân') >= 0), 'Enter trên một dòng phải đọc phép tính: ' + sp.join('|'));
    await page.evaluate(() => { window.SPEECH_LOG.length = 0; });
    await page.click('#btn-tables-read');
    await page.waitForTimeout(800);
    sp = await page.evaluate(() => window.SPEECH_LOG || []);
    ok(sp.filter((s) => s.indexOf('speak:') === 0).length >= 22, 'phải đọc cả bảng nhân và bảng chia: ' + sp.length);
    ok(sp.some((s) => s.indexOf('speak:Bảng chia') === 0), 'phải đọc cả bảng chia: ' + sp.join('|'));
    assert.equal(await page.evaluate(() => window.__CuuChuong.G.reading), false, 'đọc xong phải bỏ cờ reading (không kẹt nút Đọc cả bảng)');
  }, { viewport: LAND, initScript: SPEECH_STUB });
}

/* ---------------- 11. Hồ sơ dùng chung giữa các game + dòng "cần ôn lại" ----------------
   Bé được tạo ở game khác nên chưa có tiến trình ở đây: phải hiện 0 sao, không mượn sao của bé đang chơi.
   Dòng ôn lại phải in đậm đúng phần bé cần trả lời (câu "tìm thừa số" cho sẵn số ở cuối). */
async function sharedProfilesAndReview() {
  const seed = [
    "localStorage.setItem('3hoa-players-v1', JSON.stringify({v: 1, active: 'p1', players: [",
    "{id: 'p1', name: 'Bé', avatar: '🐯', created: 1, updated: 1},",
    "{id: 'p2', name: 'Lan', avatar: '🦊', created: 2, updated: 2}]}));",
    "localStorage.setItem('cuu-chuong-v1', JSON.stringify({players: {p1: {",
    "records: {'t7:mix:90': {best: 5000, stars: 3, top: []}, 't2:mix:90': {best: 4000, stars: 3, top: []}},",
    "missed: {'? × 6 = 42': {n: 4, ok: 0, last: 9, info: {kind: 'find', label: '? × 6 = 42', text: '? × 6 = 42', answer: 7, table: 6}},",
    "'7 × 8 = ?': {n: 2, ok: 0, last: 8, info: {kind: 'mul', label: '7 × 8', text: '7 × 8 = ?', answer: 56, table: 7}}}",
    '}}}));'
  ].join('');
  return withGame('cuu-chuong', async ({ page, hook, shot }) => {
    await page.click('#btn-player');
    await page.waitForSelector('#players:not(.hidden)');
    await page.waitForTimeout(500);                       // chờ hiệu ứng mở bảng chạy xong rồi mới chụp
    assert.equal(await hook('X.Store.sumStars("p1")'), 6, 'bé p1 phải có 6 sao');
    assert.equal(await hook('X.Store.sumStars("p2")'), 0, 'bé chưa từng chơi game này phải là 0 sao');
    const subs = await page.locator('.player-item .pl-sub').allTextContents();
    assert.equal(subs.length, 2);
    ok(subs[0].indexOf('6 sao') >= 0, 'dòng của bé đang chơi: ' + subs[0]);
    ok(subs[1].indexOf('0 sao') >= 0, 'bé mới không được mượn sao của bé khác: ' + subs[1]);
    await shot('players-shared');

    await page.click('#btn-report');
    await page.waitForSelector('#report:not(.hidden)');
    await page.waitForTimeout(500);
    await page.evaluate(() => { const p = document.querySelector('#report .panel'); p.scrollTop = p.scrollHeight; });
    const review = await page.innerHTML('#report-review');
    ok(review.indexOf('<b>7</b> × 6 = 42') >= 0, 'câu tìm thừa số phải in đậm đáp án 7: ' + review);
    ok(review.indexOf('7 × 8 = <b>56</b>') >= 0, 'câu nhân phải in đậm đáp án 56: ' + review);
    ok(review.indexOf('<b>42</b>') < 0, 'không được in đậm số đề bài cho sẵn');
    await shot('report-review');
  }, { viewport: LAND, initScript: seed });
}

/* ---------------- Ảnh chụp: menu · HUD giữa ván · kết quả ở cả ba khổ màn hình ---------------- */
async function gallery() {
  for (const [name, vp] of [['land', LAND], ['port', PORT], ['phone', PHONE]]) {
    const log = await withGame('cuu-chuong', async ({ page, hook, shot }) => {
      await page.waitForTimeout(600);
      await shot(name + '-1-menu');
      await hook('(function(){X.startGame(window.Tables.levelById("t7")); return 1;})()');
      await waitPlaying(page);
      await hook('(function(){X.G.streak = 4; X.G.score = 2350; X.G.stage = 2;' +
        ' X.spawnForQuestion(); X.spawnForQuestion(); X.typeDigit("5"); X.update(0.016); return 1;})()');
      await page.waitForTimeout(800);
      await shot(name + '-2-hud');
      await playUntil(page, hook, 4, 25);
      await hook('X.endGame("timeup")');
      await page.waitForSelector('#gameover:not(.hidden)', { timeout: 10000 });
      await page.waitForTimeout(1000);
      await shot(name + '-3-results');
    }, { viewport: vp });
    assertClean(log, 'ảnh chụp ' + name);
  }
  return null;
}

/* ---------------- perf ---------------- */
async function perf() {
  return withGame('cuu-chuong', async ({ page, hook }) => {
    await hook('(function(){X.startGame(window.Tables.levelById("c7")); return 1;})()');
    await waitPlaying(page);
    await hook('(function(){X.spawnForQuestion(); X.spawnForQuestion(); X.spawnForQuestion(); return 1;})()');
    await page.waitForTimeout(3000);
    console.log('  perf (c7, 3 giây chơi):', JSON.stringify(await hook('X.perf()')));
    // Phép đo cố định để so sánh giữa các bản: 6 thiên thạch + 200 hạt, vẽ 300 khung hình
    const ms = await hook(BENCH);
    console.log('  render 6 thiên thạch + 200 hạt: ' + ms.toFixed(3) + ' ms/khung hình');
  }, { viewport: LAND });
}

(async () => {
  const blocks = [
    ['luồng chính (iPad ngang)', mainFlow],
    ['sai · gợi ý · vỡ khiên', wrongAndHint],
    ['nút 💡 gợi ý và số mờ', hintButton],
    ['câu khó rơi chậm · vòng sáng ở mép', fallAndEdges],
    ['ôn lại thông minh', reviewInjection],
    ['hồ sơ · báo cáo · cổng phụ huynh', profiles],
    ['báo cáo theo màn đã chơi', reportScope],
    ['di trú và dữ liệu rác', migration],
    ['ổn định', stability],
    ['xoay máy giữa ván', rotation],
    ['giảm chuyển động', reducedMotion],
    ['hướng màn hình và điện thoại', screens],
    ['bảng cửu chương', tablesScreen],
    ['hồ sơ dùng chung và dòng ôn lại', sharedProfilesAndReview],
    ['ảnh chụp ba khổ màn hình', gallery],
    ['hiệu năng', perf]
  ];
  for (const [name, fn] of blocks) {
    try {
      const log = await fn();
      if (log) assertClean(log, name);
      else console.log(name + ' — xong.');
    } catch (e) {
      console.error('✗ ' + name + ': ' + (e && e.message));
      console.error(e && e.stack);
      process.exitCode = 1;
    }
  }
  if (!process.exitCode) console.log('\ncuu-chuong e2e: tất cả các khối đều đạt ✅');
})();
