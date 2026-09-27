'use strict';
/* Kiểm thử chế độ Đảo Khủng Long của Vệ Binh Cửu Chương (cuu-chuong/js/dao.js + các móc trong game.js):
   nạp game trong một window giả có window.parent.DaoCauNoi là bản giả theo kịch bản, rồi kiểm tra game gọi
   đúng hợp đồng (sanSang, batDau, vòng cauTiep, thaoTac go_so/xoa/ban/cham, goiY, traLoi, phanHoi khi can_phan_hoi,
   tamDung/tiepTuc, ketThuc khi hết câu, veDao từ bảng tạm dừng) và không có ?dao=1 thì game y như cũ. */
const test = require('node:test');
const { mock } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { makeWindow, makeStorage, ROOT } = require('./lib/load.js');

const FILES = ['js/audio.js', 'js/tables.js', 'js/profile.js', 'js/dao.js', 'js/game.js'];

/** Nạp game vào một window giả. o: { search, parent, localStorage } */
function napGame(o) {
  o = o || {};
  const st = o.localStorage || makeStorage();
  const win = makeWindow({ localStorage: st });
  win.location.search = o.search || '';
  if (o.parent) win.parent = o.parent;
  const ctx = vm.createContext(win);
  FILES.forEach(function (f) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'cuu-chuong', f), 'utf8'), ctx, { filename: 'cuu-chuong/' + f });
  });
  return { win: win, D: win.CuuDao, X: win.__CuuChuong, st: st };
}

/* ---------------- Cầu nối giả của đảo ---------------- */

const CAU = {
  tru: { ma_cau: '2.11|tru-nho-2cs-1cs|52-7', ky_nang: 'tru-nho-2cs-1cs', noi_dung: '2.11', loai: 'phep_tinh', dang: 'nhap_so', de: '52 − 7 = ?',
    de_doc: '52 trừ 7 bằng mấy?', hinh: '', dap_an: 45, dap_an_nhan: '45', lua_chon: [], lan_thu_toi_da: 2, cau_truc: { phep: '-', so: [52, 7], an: 'ket_qua' } },
  cong: { ma_cau: '2.11|cong-nho-2cs-2cs|36+27', ky_nang: 'cong-nho-2cs-2cs', noi_dung: '2.11', loai: 'phep_tinh', dang: 'nhap_so', de: '36 + 27 = ?',
    de_doc: '36 cộng 27 bằng mấy?', hinh: '', dap_an: 63, dap_an_nhan: '63', lua_chon: [], lan_thu_toi_da: 2, cau_truc: { phep: '+', so: [36, 27], an: 'ket_qua' } },
  xep: { ma_cau: '2.2|so-sanh-100|xep-tang:60,26,66,62', ky_nang: 'so-sanh-100', noi_dung: '2.2', loai: 'so_sanh', dang: 'sap_xep',
    de: 'Xếp 60, 26, 66, 62 theo thứ tự từ bé đến lớn', de_doc: 'Xếp 60, 26, 66, 62 theo thứ tự từ bé đến lớn', hinh: '', dap_an: '26,60,62,66',
    dap_an_nhan: '26, 60, 62, 66', lua_chon: [], lan_thu_toi_da: 2, cau_truc: { loai: 'so_sanh', kieu: 'xep', ds: [60, 26, 66, 62], chieu: 'tang' } },
  lon: { ma_cau: '2.6|so-sanh-1000|lon:305,350,298', ky_nang: 'so-sanh-1000', noi_dung: '2.6', loai: 'so_sanh', dang: 'chon_dap_an',
    de: 'Số nào lớn nhất: 305, 350, 298?', de_doc: 'Trong các số 305, 350, 298, số nào lớn nhất?', hinh: '', dap_an: 350, dap_an_nhan: '350',
    lua_chon: [{ gia_tri: 305, nhan: '305', hinh: '', dong_ho: null, dung: false, vi_tri: 'trai' }, { gia_tri: 350, nhan: '350', hinh: '', dong_ho: null, dung: true, vi_tri: 'giua' },
      { gia_tri: 298, nhan: '298', hinh: '', dong_ho: null, dung: false, vi_tri: 'phai' }],
    lan_thu_toi_da: 1, cau_truc: { loai: 'so_sanh', kieu: 'lon_nhat', ds: [305, 350, 298] } }
};

/** Bản giả của window.parent.DaoCauNoi: chấm theo dap_an, đếm lượt thử và cấp gợi ý như VanChoi. */
function taoCauNoi(dsCau, man) {
  const goi = [];
  let i = 0, mo = null, lanThu = 0, cap = 0;
  const thongTin = function () {
    return { phien_ban: 1, game: 'ban-thien-thach', ten_game: 'Bắn Thiên Thạch',
      man: Object.assign({ id: 'v4-m8', ten: 'Bắn thiên thạch: cộng, trừ có nhớ', so_cau: dsCau.length, dang: 'nhap_so' }, man || {}),
      be: { ten: 'An', ten_khung_long: 'Rex', hinh_co_vu: 'https://localhost/dao-khung-long/assets/img/rex-cheer.webp' },
      am_thanh: { tieng: false, giong: false } };
  };
  const cn = {
    phien_ban: 1,
    sanSang: function () { goi.push(['sanSang']); return thongTin(); },
    thongTin: thongTin,
    batDau: function (dk) { goi.push(['batDau', dk]); return 'van-1'; },
    cauTiep: function (tc) {
      goi.push(['cauTiep', tc]);
      if (mo) throw new Error('Câu trước chưa kết thúc');
      const q = dsCau[i] ? Object.assign(JSON.parse(JSON.stringify(dsCau[i])), { stt: i + 1, tong: dsCau.length }) : null;
      i++;
      if (q) { mo = q; lanThu = 1; cap = 0; }
      return q;
    },
    thaoTac: function (k, d) { goi.push(['thaoTac', k, d]); return true; },
    goiY: function (them) {
      goi.push(['goiY', them]);
      if (!mo || cap >= 3) return null;
      cap++;
      return { cap: cap, loi: 'Gợi ý cấp ' + cap };
    },
    traLoi: function (v, them) {
      goi.push(['traLoi', v, them]);
      if (!mo) return null;
      const q = mo;
      if (String(v) === String(q.dap_an)) {
        mo = null;
        return { dung: true, loi: [], loi_noi: null, thu_lai: false, can_phan_hoi: false,
          ket_qua: lanThu > 1 ? 'dung_lan_2' : cap ? 'dung_sau_goi_y' : 'dung_ngay', qua_mong: 3, dap_an: q.dap_an, dap_an_nhan: q.dap_an_nhan };
      }
      if (lanThu < q.lan_thu_toi_da) {
        lanThu++;
        return { dung: false, loi: ['chieu-dau'], loi_noi: 'Con xếp ngược chiều rồi', thu_lai: true, can_phan_hoi: false, ket_qua: null, qua_mong: 0, dap_an: q.dap_an };
      }
      return { dung: false, loi: ['quen-nho'], loi_noi: 'Con quên nhớ 1 rồi', thu_lai: false, can_phan_hoi: true, ket_qua: null, qua_mong: 0, dap_an: q.dap_an };
    },
    hetGio: function () { goi.push(['hetGio']); mo = null; return { ket_qua: 'het_gio' }; },
    phanHoi: function (v, kq) { goi.push(['phanHoi', v, kq && kq.can_phan_hoi]); mo = null; return Promise.resolve(true); },
    tamDung: function (n) { goi.push(['tamDung', n]); return true; },
    tiepTuc: function (n) { goi.push(['tiepTuc', n]); return true; },
    ketThuc: function (t) { goi.push(['ketThuc', t]); return Promise.resolve(true); },
    veDao: function (t) { goi.push(['veDao', t]); return Promise.resolve(true); },
    doc: function () { return true; }
  };
  return { cn: cn, goi: goi, conMo: function () { return !!mo; } };
}

/** So sánh sâu qua JSON (đối tượng tạo trong vm có prototype của realm khác). */
function deq(a, b, m) { assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)), m); }
const cho = function () { return new Promise(function (r) { setImmediate(r); }); };
/** Cho thời gian trôi từng bước nhỏ (tick nhảy đồng hồ trước, nên hẹn giờ nối tiếp nhau phải đi từng bước). */
async function troi(ms) {
  for (let t = 0; t < ms; t += 50) { mock.timers.tick(Math.min(50, ms - t)); await cho(); }
  await cho();
}
function go(X, so) { String(so).split('').forEach(function (c) { X.typeDigit(c); }); }
function ten(goi) { return goi.map(function (g) { return g[0] === 'thaoTac' ? 'thaoTac:' + g[1] : g[0]; }); }

/** Mở game ở chế độ đảo, bấm Bắt đầu và chờ hết đếm ngược. */
async function vaoDao(dsCau, man) {
  const gia = taoCauNoi(dsCau, man);
  const g = napGame({ search: '?dao=1&man=' + ((man && man.id) || 'v4-m8'), parent: { DaoCauNoi: gia.cn } });
  return Object.assign(g, gia);
}

test.beforeEach(function () { mock.timers.enable({ apis: ['setTimeout'] }); });
test.afterEach(function () { mock.timers.reset(); });

test('không có ?dao=1 (hoặc không có đảo cha): game chạy riêng như cũ', function () {
  const a = napGame({});
  assert.equal(a.D.bat, false);
  assert.equal(a.X.G.state, 'menu');
  a.X.Store.data.sound = false;
  a.X.Store.save();
  assert.ok(a.st.getItem('cuu-chuong-v1'), 'game riêng vẫn ghi localStorage');
  // ?dao=1 nhưng không nằm trong iframe, hoặc cha không có DaoCauNoi: vẫn là game riêng
  assert.equal(napGame({ search: '?dao=1' }).D.bat, false);
  assert.equal(napGame({ search: '?dao=1', parent: {} }).D.bat, false);
  assert.equal(napGame({ search: '?dao=12', parent: { DaoCauNoi: taoCauNoi([]).cn } }).D.bat, false);
  // game riêng: tạm dừng không gọi gì của đảo, gõ số vẫn theo luật cũ
  const b = napGame({});
  b.X.startGame(b.win.Tables.levelById('t2'));
  assert.equal(b.X.G.state, 'countdown');
});

test('chế độ đảo: sanSang ngay khi tải, thẻ bắt đầu, batDau khi bé bấm, không ghi localStorage', async function () {
  const g = await vaoDao([CAU.tru]);
  assert.equal(g.D.bat, true);
  deq(ten(g.goi), ['sanSang'], 'chỉ sanSang trước khi bé bấm Bắt đầu');
  assert.equal(g.X.G.state, 'menu', 'chưa vào ván');
  assert.equal(g.X.Store.data.sound, false, 'theo am_thanh.tieng của đảo');
  assert.equal(g.X.Store.data.voice, false, 'theo am_thanh.giong của đảo');
  g.D._batDau();
  g.D._batDau();                                   // bấm hai lần không bắt đầu hai ván
  deq(ten(g.goi), ['sanSang', 'batDau']);
  assert.equal(g.X.G.state, 'countdown');
  await troi(4000);                                // 3, 2, 1, BẮN!
  assert.equal(g.X.G.state, 'playing');
  deq(g.goi[2], ['cauTiep', { so_lua_chon: 3, vi_tri: ['trai', 'giua', 'phai'] }]);
  const s = g.D._trangThai();
  assert.equal(s.kieu, 'nhap');
  assert.equal(s.thienThach.length, 1, 'một câu, một thiên thạch');
  assert.equal(s.thienThach[0].nhan, '52 − 7');
  assert.match(g.D.theTraLoi(), /52 <span class="op">−<\/span> 7 = <span class="typed empty">\?<\/span>/);
  go(g.X, 45);
  g.X.fire();
  await troi(1400);
  assert.equal(g.st.getItem('cuu-chuong-v1'), null, 'chế độ đảo không ghi tiến trình của game');
});

test('câu gõ số: go_so từng chữ số, xoa, ban, thử lại khi thu_lai, phanHoi khi can_phan_hoi, ketThuc khi hết câu', async function () {
  const g = await vaoDao([CAU.tru, CAU.cong]);
  g.D._batDau();
  await troi(4000);
  // Câu 1: gõ 49, xóa 9, gõ 5, bắn 45 → đúng ngay
  go(g.X, 49);
  g.X.delDigit();
  go(g.X, 5);
  assert.match(g.D.theTraLoi(), /<span class="typed">45<\/span>/);
  g.X.fire();
  let tt = g.goi.filter(function (x) { return x[0] === 'thaoTac'; }).map(function (x) { return [x[1], x[2]]; });
  deq(tt, [
    ['go_so', { gia_tri: 4, nhap: '4' }], ['go_so', { gia_tri: 9, nhap: '49' }], ['xoa', { gia_tri: 9, nhap: '4' }],
    ['go_so', { gia_tri: 5, nhap: '45' }], ['ban', { gia_tri: 45, doi_tuong: 'thien_thach', vi_tri: 'thien_thach' }]
  ]);
  deq(g.goi[g.goi.length - 1], ['traLoi', 45, { vi_tri: 'thien_thach', nhap: '45' }]);
  const d1 = g.D._trangThai();
  assert.ok(d1.diem >= 100, 'có điểm');
  assert.equal(d1.quaMong, 3, 'cộng quả mọng của đảo');
  assert.equal(d1.khoa, true, 'khóa phím trong lúc ăn mừng');
  go(g.X, 7);                                      // gõ trong lúc ăn mừng: bỏ qua, không ghi
  assert.equal(g.goi.filter(function (x) { return x[0] === 'thaoTac'; }).length, 5);
  await troi(1400);
  // Câu 2: bắn nhầm 53 (thu_lai), vẫn là câu 2; bắn nhầm 73 (can_phan_hoi) → màn phản hồi của đảo
  assert.equal(g.D._trangThai().q.stt, 2);
  go(g.X, 53); g.X.fire();
  assert.equal(g.D._trangThai().q.stt, 2, 'thử lại cùng câu');
  assert.equal(g.D._trangThai().thienThach.length, 1, 'thiên thạch vẫn chờ');
  go(g.X, 73); g.X.fire();
  assert.ok(!ten(g.goi).includes('phanHoi'), 'đợi một chút cho bé thấy phát bắn trượt');
  await troi(800);
  deq(g.goi.filter(function (x) { return x[0] === 'phanHoi'; }), [['phanHoi', 73, true]]);
  assert.equal(g.D._trangThai().giaiDoan, 'choi');
  await troi(500);
  // Hết câu: ăn mừng rồi ketThuc với điểm và một dòng tóm tắt
  assert.equal(g.D._trangThai().giaiDoan, 'xong');
  assert.ok(!ten(g.goi).includes('ketThuc'));
  await troi(2400);
  const kt = g.goi.filter(function (x) { return x[0] === 'ketThuc'; });
  assert.equal(kt.length, 1);
  assert.equal(kt[0][1].diem, g.X.G.score);
  assert.match(kt[0][1].dong_phu, /^Đúng 1 câu · [\d.]+ điểm$/);
  deq(ten(g.goi).filter(function (x) { return x === 'cauTiep'; }).length, 3, 'cauTiep tới khi nhận null');
  deq(g.D._trangThai().loi, []);
});

test('câu xếp thứ tự: 4 thiên thạch, ban từng số (không lộ đúng sai), chấm một lần cả dãy, thử lại thì thiên thạch quay về', async function () {
  const g = await vaoDao([CAU.xep], { id: 'v1-m6', ten: 'Xếp thứ tự từ bé đến lớn', dang: null });
  g.D._batDau();
  await troi(4000);
  let s = g.D._trangThai();
  assert.equal(s.kieu, 'xep');
  deq(s.thienThach.map(function (m) { return m.gia_tri; }), [60, 26, 66, 62]);
  deq(s.thienThach.map(function (m) { return m.vi_tri; }), ['trai', 'giua_trai', 'giua_phai', 'phai']);
  assert.match(g.D.theTraLoi(), /Bắn từ bé đến lớn/);
  // số không có trên thiên thạch nào: ghi ban trung=false, không chấm
  go(g.X, 7); g.X.fire();
  const truot = g.goi[g.goi.length - 1];
  deq(truot, ['thaoTac', 'ban', { gia_tri: 7, doi_tuong: 'khoang_trong', trung: false }]);
  // gõ đúng một số: vòng ngắm vào thiên thạch đó
  go(g.X, 26);
  assert.equal(g.D._trangThai().thienThach.filter(function (m) { return m.ngam; })[0].gia_tri, 26);
  g.X.delDigit(); g.X.delDigit();
  // bắn ngược chiều: 66, 62, 60, 26
  [66, 62, 60, 26].forEach(function (v, k) {
    go(g.X, v); g.X.fire();
    assert.equal(g.D._trangThai().daBan.length, k + 1);
    assert.ok(!ten(g.goi).includes('traLoi'), 'chưa chấm khi chưa bắn đủ');
  });
  const banTt = g.goi.filter(function (x) { return x[0] === 'thaoTac' && x[1] === 'ban' && x[2].doi_tuong === 'thien_thach'; }).map(function (x) { return x[2]; });
  deq(banTt.map(function (x) { return [x.gia_tri, x.thu_tu, x.vi_tri]; }), [[66, 1, 'giua_phai'], [62, 2, 'phai'], [60, 3, 'trai'], [26, 4, 'giua_trai']]);
  assert.match(g.D.theTraLoi(), /dao-o da">66<\/span>/);
  assert.doesNotMatch(g.D.theTraLoi(), /good|bad|✓|✗/, 'không lộ số nào đúng chỗ trước khi chấm');
  await troi(500);
  deq(g.goi[g.goi.length - 1], ['traLoi', '66,62,60,26', { thu_tu: [66, 62, 60, 26] }]);
  // thu_lai: thiên thạch quay về đủ 4 số, dãy xóa trắng
  await troi(1200);
  s = g.D._trangThai();
  assert.equal(s.thienThach.length, 4);
  deq(s.daBan, []);
  [26, 60, 62, 66].forEach(function (v) { go(g.X, v); g.X.fire(); });
  await troi(500);
  deq(g.goi.filter(function (x) { return x[0] === 'traLoi'; }).map(function (x) { return x[1]; }), ['66,62,60,26', '26,60,62,66']);
  await troi(1400);
  await troi(2400);
  assert.equal(ten(g.goi).filter(function (x) { return x === 'ketThuc'; }).length, 1);
});

test('câu chọn số (số lớn nhất): gõ số trên thiên thạch; gợi ý 3 cấp, cấp 3 bỏ một thiên thạch sai (loai_bo); chạm ghi cham', async function () {
  const g = await vaoDao([CAU.lon, CAU.lon], { id: 'v8-m5', ten: 'So sánh số có ba chữ số', dang: null });
  g.D._batDau();
  await troi(4000);
  let s = g.D._trangThai();
  assert.equal(s.kieu, 'chon');
  deq(s.thienThach.map(function (m) { return m.vi_tri + ':' + m.nhan; }), ['trai:305', 'giua:350', 'phai:298']);
  assert.match(g.D.theTraLoi(), /Bắn số lớn nhất/);
  // chạm thiên thạch: ghi cham, không bắn
  const m0 = s.thienThach[0];
  g.D.cham({ x: m0.x, y: m0.y });
  deq(g.goi[g.goi.length - 1], ['thaoTac', 'cham', { doi_tuong: 'thien_thach', gia_tri: 305, vi_tri: 'trai' }]);
  // gợi ý
  g.X.askHint(); g.X.askHint();
  deq(g.goi.filter(function (x) { return x[0] === 'goiY'; }).map(function (x) { return x[1]; }), [null, null]);
  g.X.askHint();
  const cap3 = g.goi.filter(function (x) { return x[0] === 'goiY'; })[2][1];
  assert.ok(cap3 && (cap3.loai_bo === 305 || cap3.loai_bo === 298), 'cấp 3 bỏ một số sai: ' + JSON.stringify(cap3));
  await troi(400);
  s = g.D._trangThai();
  assert.equal(s.thienThach.length, 2);
  assert.ok(s.thienThach.some(function (m) { return m.gia_tri === 350; }), 'không bao giờ bỏ thiên thạch đúng');
  g.X.askHint();                                   // hết cấp: đọc lại, không gọi thêm
  assert.equal(g.goi.filter(function (x) { return x[0] === 'goiY'; }).length, 3);
  go(g.X, 350); g.X.fire();
  deq(g.goi[g.goi.length - 1], ['traLoi', 350, { vi_tri: 'giua' }]);
  await troi(1400);
  // Câu 2: chọn sai (một lần thử) → đảo hiện lời giải
  go(g.X, 305); g.X.fire();
  await troi(800);
  deq(g.goi.filter(function (x) { return x[0] === 'phanHoi'; }), [['phanHoi', 305, true]]);
  await troi(500);
  await troi(2400);
  assert.equal(ten(g.goi).filter(function (x) { return x === 'ketThuc'; }).length, 1);
});

test('tạm dừng ghi tamDung/tiepTuc theo nguồn; "Về đảo" gọi veDao với điểm; sau khi đóng ván không gọi đảo nữa', async function () {
  const g = await vaoDao([CAU.tru, CAU.cong]);
  g.D._batDau();
  await troi(4000);
  g.X.pauseGame('nut');
  assert.equal(g.X.G.state, 'paused');
  g.X.typeDigit('4');                              // đang tạm dừng: không gõ được
  g.X.resumeGame();
  g.X.pauseGame('an_tab');
  g.X.resumeGame('phim');
  deq(g.goi.filter(function (x) { return x[0] === 'tamDung' || x[0] === 'tiepTuc'; }),
    [['tamDung', 'nut'], ['tiepTuc', 'nut'], ['tamDung', 'an_tab'], ['tiepTuc', 'phim']]);
  assert.ok(!ten(g.goi).includes('thaoTac:go_so'));
  go(g.X, 45); g.X.fire();
  await troi(1400);
  g.X.pauseGame('nut');
  g.D._veDao();
  const ve = g.goi.filter(function (x) { return x[0] === 'veDao'; });
  assert.equal(ve.length, 1);
  assert.equal(ve[0][1].diem, g.X.G.score);
  assert.equal(g.D._trangThai().giaiDoan, 'xong');
  // iframe bị gỡ: trang ẩn đi, game tự tạm dừng nhưng không gọi đảo (đảo đã đóng ván)
  const n = g.goi.length;
  g.X.resumeGame();
  g.X.pauseGame('an_tab');
  g.D._veDao();
  assert.equal(g.goi.length, n);
});

test('ngân hàng thật của đảo: mọi câu của bốn màn Bắn Thiên Thạch chơi được bằng cách gõ số', function () {
  const { loadGame } = require('./lib/load.js');
  const w = loadGame('dao-khung-long', ['js/ngan-hang.js', 'js/cau-so-sanh.js', 'js/dao.js']);
  const NH = w.NganHang, DAO = w.Dao;
  const D = napGame({}).D;                         // hàm thuần của adapter (kieuCau, nhanPhepTinh)
  const MONG = { 'v4-m8': ['nhap'], 'v7-m6': ['nhap'], 'v1-m6': ['xep'], 'v8-m5': ['chon', 'xep'] };
  Object.keys(MONG).forEach(function (id) {
    const m = DAO.man(id);
    assert.equal(m.game, 'ban-thien-thach', id);
    const gap = {};
    let soCau = 0;
    for (let van = 0; van < 60; van++) {
      const rng = NH.taoRng(4200 + van);
      NH.lapDanhSach(m, rng).forEach(function (muc) {
        const q = NH.taoCau(muc.ky_nang, muc.cau_truc, rng, { dang: muc.dang });
        const kieu = D.kieuCau(q);
        gap[kieu] = 1;
        soCau++;
        assert.ok(MONG[id].indexOf(kieu) >= 0, id + ': kiểu ' + kieu + ' cho ' + q.de);
        if (kieu === 'nhap') {
          assert.ok(Number.isInteger(q.dap_an) && q.dap_an >= 0 && String(q.dap_an).length <= 4, id + ': đáp án gõ được ' + q.dap_an);
          const nhan = D.nhanPhepTinh(q);
          assert.ok(nhan !== '?' && nhan.length <= 14 && q.de.indexOf(nhan) === 0, id + ': nhãn thiên thạch ' + nhan);
        } else if (kieu === 'chon') {
          // cầu nối xin 3 lựa chọn: câu có đúng 3 lựa chọn thì không bị cắt bớt
          assert.equal(q.lua_chon.length, 3, id + ': ' + q.de);
          const vs = q.lua_chon.map(function (x) { return x.gia_tri; });
          assert.equal(new Set(vs).size, 3);
          assert.ok(vs.indexOf(q.dap_an) >= 0);
          vs.forEach(function (v) { assert.ok(Number.isInteger(v) && String(v).length <= 4); });
        } else {
          const ds = q.cau_truc.ds;
          assert.equal(ds.length, 4);
          assert.equal(new Set(ds).size, 4);
          assert.equal(q.dap_an.split(',').length, 4);
          deq(q.dap_an.split(',').map(Number).slice().sort(function (a, b) { return a - b; }), ds.slice().sort(function (a, b) { return a - b; }));
          assert.equal(q.dang, 'sap_xep');
        }
      });
    }
    deq(Object.keys(gap).sort(), MONG[id].slice().sort(), id + ' phải có đủ các kiểu');
    assert.ok(soCau >= 300, id + ': ' + soCau + ' câu');
  });
});
