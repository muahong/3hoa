'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadGame } = require('./lib/load.js');
const FILES = ['js/nhat-ky.js', 'js/ngan-hang.js', 'js/cau-so-sanh.js', 'js/cau-do-luong.js', 'js/cau-tien.js', 'js/cau-thong-ke.js', 'js/cau-hinh-hoc.js', 'js/cau-thoi-gian.js', 'js/hoc-tap.js', 'js/dao.js', 'js/ho-so.js', 'js/van-choi.js', 'js/phu-kien.js'];
function nk() { let i = 0; return { batDauVan: () => 'test', cauHien: () => 'c' + ++i, thaoTac() {}, goiY() {}, traLoi() {}, msTrongCau: () => 3000, cauKetThuc() {}, phanHoiXem() {}, ketThucVan: () => Promise.resolve([]) }; }
function round(w, dang, count = 10) {
  const m = Object.assign({}, w.Dao.man('v2-m1'), { dang });
  const van = new w.VanChoi({ nk: nk(), game: m.game, man: m, vung: m.vung, soCau: count, hatGiong: 7 });
  van.batDau({}); return van;
}
test('G01/G03: occupied hands and shell-covered feet cannot acquire floating items', () => {
  const P = loadGame('dao-khung-long', FILES).PhuKien;
  for (const species of ['rex', 'may']) {
    assert.equal(P.viTri(species + '-hatchling', 'giay-dua', 400, 600, .9).length, 0);
    for (const item of ['thuoc-vang', 'tui-tien', 'can-cau-bac', 'khien-hinh-khoi']) assert.equal(P.viTri(species + '-eating', item, 400, 600, 1).length, 0);
  }
  assert.equal(P.viTri('rex-hatchling', 'vuong-mien', 400, 600, 1).length, 0);
  assert.equal(P.viTri('rex-kid', 'vuong-mien', 400, 600, 1).length, 1);
  assert.equal(P.viTri('may-kid', 'tui-tien', 400, 600, 1).length, 1, 'quadruped has a supported sling');
});
test('G01: grip origins and rotations differ for ruler, bag and rod', () => {
  const P = loadGame('dao-khung-long', FILES).PhuKien;
  const positions = ['thuoc-vang', 'tui-tien', 'can-cau-bac'].map(item => P.viTri('rex-kid', item, 400, 600, 1)[0]);
  assert.equal(new Set(positions.map(v => v.r)).size, 3);
  assert.equal(new Set(positions.map(v => ((v.cy - v.y) / v.h).toFixed(2))).size, 3);
  assert.ok(positions.every(v => v.cx > 350), 'contact stays at the raised palm, away from the neck');
});
test('G02: seated Rex uses individual front shoe angles; Mây shoes follow forefeet', () => {
  const P = loadGame('dao-khung-long', FILES).PhuKien;
  const shoes = P.viTri('rex-eating', 'giay-dua', 400, 600, .9);
  assert.equal(shoes.length, 2);
  assert.ok(shoes.every(v => v.asset.endsWith('-front.svg')));
  assert.notEqual(shoes[0].r, shoes[1].r);
  assert.notEqual(shoes[0].w, shoes[1].w);
  const may = P.viTri('may-kid', 'giay-dua', 400, 600, .9);
  assert.ok(may.every(v => v.cx > 200));
});
test('D01: wrong then hint then correction counts once without a retry berry bonus', async () => {
  const w = loadGame('dao-khung-long', FILES), v = round(w, 'xep_hinh');
  let i = 0;
  while (v.conCau()) {
    const q = v.cauTiep();
    if (i++ === 0) { const wrong = typeof q.dap_an === 'number' ? q.dap_an + 1 : 'wrong'; v.traLoi(wrong); v.goiY(); }
    const result = v.traLoi(q.dap_an); assert.ok(result.dung);
    const before = v.quaMong.tong;
    assert.equal(v.traLoi(q.dap_an), null);
    assert.equal(v._ketThucCau('dung_ngay'), 0);
    assert.equal(v.quaMong.tong, before);
  }
  const result = await v.ketThuc(false);
  assert.equal(result.dem.suaNgay, 1); assert.equal(result.dem.suaDuoc, 0);
  assert.equal(result.quaMong.tong, 28); assert.equal(result.quaMong.sua_duoc, 0);
});
test('D01: failed questions returning later remain distinct from same-turn corrections', async () => {
  const w = loadGame('dao-khung-long', FILES), v = round(w, 'chon_dap_an', 4);
  let first = true;
  while (v.conCau()) {
    const q = v.cauTiep();
    if (first) { first = false; v.traLoi(q.lua_chon.find(x => x.gia_tri !== q.dap_an).gia_tri); v.ketThucCauSai(); }
    else v.traLoi(q.dap_an);
  }
  const result = await v.ketThuc(false);
  assert.equal(result.dem.suaDuoc, 1); assert.equal(result.dem.suaNgay, 0);
  assert.equal(result.quaMong.tong, 14); // 3 × 3 original berries + 3 base and 2 retry berries
});
function speech(voices, settings) {
  let changed, said = 0;
  const synth = { getVoices: () => voices, addEventListener: (type, fn) => { changed = fn; }, speak: () => said++, cancel() {} };
  const w = loadGame('dao-khung-long', []);
  w.speechSynthesis = synth;
  w.SpeechSynthesisUtterance = function (text) { this.text = text; };
  if (settings) w.localStorage.setItem('dkl-am-thanh-v1', JSON.stringify(settings));
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../dao-khung-long/js/am-thanh.js'), 'utf8'), w);
  return { w, changed: () => changed(), said: () => said };
}
test('A01: English-only speech is unavailable, and delayed vi-VN updates subscribers', () => {
  const voices = [{ lang: 'en-US' }], s = speech(voices), A = s.w.AmThanh;
  assert.equal(A.coGiong(), false); assert.equal(A.nhanGiong(), 'Chưa có giọng Việt');
  assert.equal(A.doc('Xin chào'), false); assert.equal(s.said(), 0);
  let notices = 0; A.theoDoiGiong(() => notices++);
  voices.push({ lang: 'vi-VN', localService: true }); s.changed();
  assert.ok(A.coGiong()); assert.equal(A.nhanGiong(), 'Giọng đọc: Bật');
  assert.ok(notices >= 2); assert.equal(A.doc('Xin chào'), true);
  A.datGiong(false); assert.equal(A.doc('Xin chào'), false); assert.equal(A.nhanGiong(), 'Giọng đọc: Tắt');
  assert.equal(speech([{ lang: 'vi-VN' }], { tieng: true, giong: false }).w.AmThanh.co.giong, false, 'saved preference survives reload');
});
test('A01: empty voice list reports loading until a Vietnamese voice arrives', () => {
  const voices = [], s = speech(voices);
  assert.equal(s.w.AmThanh.trangThaiGiong(), 'dang_tai');
  voices.push({ lang: 'vi_VN' }); s.changed();
  assert.equal(s.w.AmThanh.trangThaiGiong(), 'co');
});
