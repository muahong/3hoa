'use strict';
// Chế độ Đảo Khủng Long của Tháp Đồng Hồ (thap-dong-ho/js/dao.js): nạp game vào window giả với window.parent.DaoCauNoi
// là một cầu nối giả có kịch bản, rồi kiểm tra game gọi đúng hợp đồng của dao-khung-long/js/cau-noi.js:
// sanSang → batDau → cauTiep… (thaoTac doi_cot / tha → traLoi, phanHoi khi can_phan_hoi, goiY, tamDung / tiepTuc) → ketThuc,
// veDao từ màn tạm dừng; và khi không có ?dao=1 thì game chạy y như cũ.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadGame, makeWindow, ROOT } = require('./lib/load.js');

const FILES = ['js/audio.js', 'js/clock.js', 'js/profile.js', 'js/dao.js', 'js/game.js'];
const J = (v) => JSON.parse(JSON.stringify(v));
const cho = (ms) => new Promise((r) => setTimeout(r, ms));

/** Câu giả theo đúng dạng cauTiep của cau-noi.js. */
function cau(stt, o) {
  const lc = o.lua_chon.map((x) => Object.assign({ hinh: '', dong_ho: null }, x, { dung: String(x.gia_tri) === String(o.dap_an) }));
  return Object.assign({
    stt: stt, tong: 5, ma_cau: 'B2.11|xem-gio|doc:' + stt, ky_nang: 'xem-gio', noi_dung: 'B2.11', loai: 'xem_gio', dang: 'chon_dap_an',
    de: 'Đồng hồ chỉ mấy giờ?', de_doc: 'Đồng hồ chỉ mấy giờ?', hinh: '', dap_an_nhan: String(o.dap_an),
    giay: 10, lan_thu_toi_da: 1, on_lai: false, goi_y_so_cap: 3, cau_truc: { loai: 'xem_gio', kieu: 'doc' }
  }, o, { lua_chon: lc });
}
const gio = (h, m) => h + ':' + (m < 10 ? '0' : '') + m;
const nhanGio = (h, m) => h + ' giờ' + (m ? ' ' + m + ' phút' : '');
const LC4 = (ds) => ds.map(([h, m]) => ({ gia_tri: gio(h, m), nhan: nhanGio(h, m), dong_ho: { h: h, m: m } }));

/** Cầu nối giả: ghi mọi lời gọi, trả câu theo kịch bản, chấm theo dap_an. */
function cauNoiGia(dsCau, o) {
  o = o || {};
  const goi = [];
  let i = 0, q = null, capGoiY = 0, lanThu = 1;
  const api = {
    phien_ban: 1,
    goi: goi,
    thongTin() {
      return { phien_ban: 1, game: 'thap-xep-hinh', ten_game: 'Tháp Xếp Hình',
        man: { id: 'v6-m5', ten: 'Tháp đồng hồ', ten_day_du: 'Tháp đồng hồ', so_cau: dsCau.length, che_do: null, dang: null, bai: 'Bài 29', vung: 6 },
        be: { ten: 'An', ten_khung_long: 'Rex', phong_cach: 'dung_manh', hinh: '', hinh_co_vu: '', hinh_goi_y: '' },
        am_thanh: { tieng: o.tieng !== false, giong: o.giong !== false } };
    },
    sanSang() { goi.push(['sanSang']); return api.thongTin(); },
    batDau(doKho) { goi.push(['batDau', J(doKho)]); return 'va_1'; },
    cauTiep(tuy) {
      goi.push(['cauTiep', J(tuy)]);
      if (q && !q.xong) throw new Error('Câu trước chưa kết thúc');
      if (i >= dsCau.length) return null;
      q = J(dsCau[i++]);
      q.xong = false; capGoiY = 0; lanThu = 1;
      if (q.lua_chon) q.lua_chon = q.lua_chon.slice(0, Math.max(2, tuy.so_lua_chon)).map((x, k) => Object.assign(x, { vi_tri: tuy.vi_tri[k] }));
      return J(q);
    },
    thaoTac(kieu, du) { goi.push(['thaoTac', kieu, J(du)]); return true; },
    goiY(them) {
      goi.push(['goiY', J(them || {})]);
      if (!q || q.xong || capGoiY >= 3) return null;
      capGoiY++;
      return { cap: capGoiY, loi: 'Gợi ý cấp ' + capGoiY };
    },
    traLoi(v, them) {
      goi.push(['traLoi', v, J(them || {})]);
      if (!q || q.xong) return null;
      const dung = String(v) === String(q.dap_an);
      if (dung) { q.xong = true; return { dung: true, loi: [], ket_qua: capGoiY ? 'dung_sau_goi_y' : 'dung_ngay', qua_mong: 2, dap_an: q.dap_an, dap_an_nhan: q.dap_an_nhan }; }
      if (lanThu < (q.lan_thu_toi_da || 1)) { lanThu++; return { dung: false, loi: ['khac'], loi_noi: 'Thử lại nhé', thu_lai: true, dap_an: q.dap_an }; }
      return { dung: false, loi: ['nham-kim'], loi_noi: 'Con nhầm hai kim rồi', can_phan_hoi: true, dap_an: q.dap_an, dap_an_nhan: q.dap_an_nhan };
    },
    hetGio() { goi.push(['hetGio']); if (q) q.xong = true; return { ket_qua: 'het_gio' }; },
    phanHoi(v, kq) { goi.push(['phanHoi', v, J(kq)]); return new Promise((r) => setTimeout(() => { q.xong = true; r(true); }, 5)); },
    tamDung(n) { goi.push(['tamDung', n]); return true; },
    tiepTuc(n) { goi.push(['tiepTuc', n]); return true; },
    ketThuc(them) { goi.push(['ketThuc', J(them)]); return Promise.resolve(true); },
    veDao(them) { goi.push(['veDao', J(them)]); return Promise.resolve(true); },
    doc(chu) { goi.push(['doc', chu]); return true; }
  };
  return api;
}

/** Nạp Tháp Đồng Hồ như trong iframe của đảo. */
function napDao(api, o) {
  o = o || {};
  const win = makeWindow();
  win.location = Object.assign({}, win.location, { search: o.search != null ? o.search : '?dao=1&man=v6-m5' });
  win.parent = o.parent || { DaoCauNoi: api, NganHang: o.NganHang };
  // Ảnh SVG giả: báo tải xong ngay (để câu có hình không phải chờ 2 giây)
  win.Image = function () {
    const nghe = {};
    const img = { complete: false, naturalWidth: 0, naturalHeight: 0, addEventListener(t, f) { (nghe[t] = nghe[t] || []).push(f); } };
    Object.defineProperty(img, 'src', { set(v) { img._src = v; setTimeout(() => { img.complete = true; img.naturalWidth = 640; img.naturalHeight = 640; (nghe.load || []).forEach((f) => f()); }, 1); }, get() { return img._src; } });
    return img;
  };
  const ctx = vm.createContext(win);
  FILES.forEach((f) => vm.runInContext(fs.readFileSync(path.join(ROOT, 'thap-dong-ho', f), 'utf8'), ctx, { filename: 'thap-dong-ho/' + f }));
  return { win: win, X: win.__ThapDongHo, D: win.ThapDao };
}

/** Chạy vòng lặp game dt = 50 ms trong `giay` giây (thời gian của game), vẽ vài khung để thử đường vẽ. */
function chay(X, giay) {
  const n = Math.round(giay / 0.05);
  for (let k = 0; k < n; k++) { X.update(0.05); if (k % 10 === 0) X.render(); }
}
/** Bắt đầu chơi, bỏ qua đếm ngược 3-2-1. */
function vaoChoi(X, D) {
  D.batDauChoi();
  assert.equal(X.G.state, 'countdown');
  X.G.state = 'playing';
  X.G.nextPieceAt = 0;
}
async function choKhoi(X) {
  for (let k = 0; k < 60 && !(X.G.piece && X.G.piece.mode === 'fall'); k++) { chay(X, 0.05); await cho(3); }
  assert.ok(X.G.piece && X.G.piece.mode === 'fall', 'khối mới đã xuất hiện');
  return X.G.piece;
}
/** Đưa khối sang cột col bằng nút rồi thả; chạy tới khi khối chạm đáy. */
function thaVaoCot(X, col) {
  X.G.cach = 'nut';
  X.moveTo(col);
  X.G.cach = 'nut';
  X.hardDrop();
  chay(X, 0.6);
}
const loaiGoi = (api, ten) => api.goi.filter((g) => g[0] === ten);
const thaoTac = (api, kieu) => api.goi.filter((g) => g[0] === 'thaoTac' && g[1] === kieu);

const DS = [
  cau(1, { dap_an: '8:15', lua_chon: LC4([[8, 15], [3, 40], [9, 15], [8, 3]]), hinh: '<svg viewBox="-130 -130 260 260" width="240" height="240" xmlns="http://www.w3.org/2000/svg"><circle r="100" fill="#fff"/></svg>' }),
  cau(2, { dap_an: '5:30', lua_chon: LC4([[6, 30], [5, 30], [6, 25], [4, 30]]) }),
  cau(3, { dap_an: '2:00', de: 'Đồng hồ nào chỉ 2 giờ?', de_doc: 'Đồng hồ nào chỉ 2 giờ?', lua_chon: LC4([[12, 10], [2, 0], [3, 0]]) }),
  cau(4, { dap_an: '11:30', lua_chon: LC4([[11, 30], [12, 30], [6, 55], [10, 30]]) })
];

test('dao: without ?dao=1 (or outside an island iframe) the game behaves exactly as before', () => {
  const w = loadGame('thap-dong-ho', FILES);
  assert.equal(w.ThapDao.bat, false);
  assert.equal(w.__ThapDongHo.Dao, null);
  assert.equal(w.__ThapDongHo.G.state, 'menu');
  assert.equal(w.__ThapDongHo.soCot(), 4);
  assert.equal(w.__ThapDongHo.ROWS, 6);
  // ?dao=1 mà không nằm trong iframe, hoặc trang cha không có cầu nối: vẫn là game thường
  assert.equal(napDao(cauNoiGia(DS)).D.bat, true, 'kiểm tra chứng: có cầu nối thì bật');
  const w2 = makeWindow();
  w2.location = Object.assign({}, w2.location, { search: '?dao=1' });
  const c2 = vm.createContext(w2);
  FILES.forEach((f) => vm.runInContext(fs.readFileSync(path.join(ROOT, 'thap-dong-ho', f), 'utf8'), c2));
  assert.equal(w2.ThapDao.bat, false, 'parent === window: không phải đảo');
  assert.equal(w2.__ThapDongHo.G.state, 'menu');
  const w3 = napDao(null, { parent: { DaoCauNoi: null } });
  assert.equal(w3.D.bat, false, 'trang cha không có DaoCauNoi');
  const w4 = napDao(cauNoiGia(DS), { search: '?man=v6-m5' });
  assert.equal(w4.D.bat, false, 'thiếu ?dao=1');
  assert.equal(w4.X.G.state, 'menu');
});

test('dao: boot calls sanSang, shows the start card, no localStorage; batDau only when the kid taps Bắt đầu', () => {
  const api = cauNoiGia(DS);
  const { win, X, D } = napDao(api);
  assert.equal(D.bat, true);
  assert.equal(X.Dao, D);
  assert.equal(X.ROWS, 5, 'bảng 5 hàng trong đảo');
  assert.equal(X.G.state, 'dao-cho');
  assert.deepEqual(api.goi.map((g) => g[0]), ['sanSang']);
  vaoChoi(X, D);
  const bd = loaiGoi(api, 'batDau');
  assert.equal(bd.length, 1);
  assert.equal(bd[0][1].so_cot, 4);
  assert.equal(bd[0][1].khong_het_gio, true);
  assert.equal(X.G.level.dao, true);
  assert.equal(X.G.level.title, 'Tháp đồng hồ');
  D.batDauChoi();
  assert.equal(loaiGoi(api, 'batDau').length, 1, 'bấm hai lần không bắt đầu hai ván');
  assert.equal(win.localStorage.length, 0, 'không ghi localStorage');
});

test('dao: one question per block; doi_cot / tha logged; landing answers with the column value; correct scores', async () => {
  const api = cauNoiGia(DS);
  const { win, X, D } = napDao(api);
  vaoChoi(X, D);
  const p = await choKhoi(X);
  const ct = loaiGoi(api, 'cauTiep');
  assert.equal(ct.length, 1);
  assert.deepEqual(ct[0][1], { so_lua_chon: 4, vi_tri: ['cot_1', 'cot_2', 'cot_3', 'cot_4'] });
  assert.equal(X.soCot(), 4);
  assert.ok(p.t.dao && p.t.loai === 'hinh', 'khối mang hình đồng hồ của đề');
  const svg = decodeURIComponent(p.t.anh.src.replace(/^data:image\/svg\+xml;charset=utf-8,/, ''));
  assert.match(svg, /^<svg[^>]* style="font-family:'Baloo 2'[^"]*"[^>]* width="640" height="640">/, 'ảnh SVG có phông tròn và kích thước điểm ảnh lớn');
  assert.equal((svg.match(/\swidth=/g) || []).length, 1, 'không lặp thuộc tính width');
  assert.equal(p.t.veTrenKhoi, true, 'hình gần vuông (mặt đồng hồ) vẽ lên khối');
  assert.deepEqual(J(X.G.cols.map((c) => c.nd.chu)), ['8 giờ 15 phút', '3 giờ 40 phút', '9 giờ 15 phút', '8 giờ 3 phút'], 'đề có hình → cột ghi chữ');
  // Không hết giờ: 30 giây không làm gì, khối vẫn lơ lửng một hàng trên chỗ đáp
  chay(X, 30);
  assert.equal(loaiGoi(api, 'traLoi').length, 0, 'không tự trả lời');
  assert.equal(X.G.piece.row, X.G.piece.land - 1);
  assert.equal(api.goi.filter((g) => g[0] === 'hetGio').length, 0);
  // Đi sang cột sai rồi sang cột đúng thật nhanh: gộp thành một doi_cot
  const dau = X.G.piece.col;
  const sai = dau === 1 ? 2 : 1;
  X.G.cach = 'phim';
  X.moveTo(sai);
  X.moveTo(0);
  X.G.cach = 'phim';
  X.hardDrop();
  chay(X, 0.6);
  const dc = thaoTac(api, 'doi_cot');
  if (dau !== 0) {
    assert.equal(dc.length, 1, 'hai bước liền nhau gộp một lần');
    assert.equal(dc[0][2].tu, 'cot_' + (dau + 1));
    assert.equal(dc[0][2].den, 'cot_1');
    assert.equal(dc[0][2].gia_tri, '8:15');
    assert.equal(dc[0][2].buoc, 2);
    assert.equal(dc[0][2].cach, 'phim');
  }
  const th = thaoTac(api, 'tha');
  assert.equal(th.length, 1);
  assert.deepEqual(th[0][2], { doi_tuong: 'khoi', vi_tri: 'cot_1', gia_tri: '8:15', cach: 'phim' });
  const tl = loaiGoi(api, 'traLoi');
  assert.equal(tl.length, 1);
  assert.equal(tl[0][1], '8:15');
  assert.equal(tl[0][2].vi_tri, 'cot_1');
  assert.equal(tl[0][2].so_cot, 4);
  assert.equal(tl[0][2].cot_dau, 'cot_' + (dau + 1));
  const iTha = api.goi.indexOf(th[0]), iTl = api.goi.indexOf(tl[0]);
  assert.ok(iTha < iTl && (!dc.length || api.goi.indexOf(dc[0]) < iTha), 'thứ tự: doi_cot → tha → traLoi');
  assert.equal(X.G.correct, 1);
  assert.ok(X.G.score >= 100);
  assert.deepEqual(J(D.tienDo()), { xong: 1, tong: 4 });
  // Câu 2 tới sau khi khối nổ xong
  await choKhoi(X);
  assert.equal(loaiGoi(api, 'cauTiep').length, 2);
  assert.ok(X.G.piece.t.loai === 'chu' || X.G.piece.t.loai === 'hoi');
  assert.equal(win.localStorage.length, 0);
});

test('dao: a wrong drop turns to stone, lights the right column, awaits the island feedback, then continues', async () => {
  const api = cauNoiGia(DS);
  const { X, D } = napDao(api);
  vaoChoi(X, D);
  await choKhoi(X);
  thaVaoCot(X, 1);                                     // 3:40 là sai (nhầm kim)
  assert.equal(loaiGoi(api, 'traLoi')[0][1], '3:40');
  assert.equal(X.G.wrong, 1);
  assert.equal(X.stackH(1), 1, 'khối hóa đá nằm ở cột vừa thả');
  assert.ok(X.G.cols[0].glow > 0.5, 'cột đúng sáng lên');
  assert.equal(X.G.piece, null);
  assert.equal(loaiGoi(api, 'phanHoi').length, 0, 'chờ bé nhìn đá rơi rồi mới hiện màn phản hồi');
  chay(X, 3);
  assert.equal(loaiGoi(api, 'cauTiep').length, 1, 'chưa lấy câu mới khi màn phản hồi chưa đóng');
  await cho(1400);
  const ph = loaiGoi(api, 'phanHoi');
  assert.equal(ph.length, 1);
  assert.equal(ph[0][1], '3:40');
  assert.equal(ph[0][2].can_phan_hoi, true);
  await cho(20);
  await choKhoi(X);
  assert.equal(loaiGoi(api, 'cauTiep').length, 2, 'màn phản hồi đóng thì sang câu sau');
  assert.deepEqual(J(D.tienDo()), { xong: 1, tong: 5 }, 'câu sai quay lại: tổng thêm 1');
});

test('dao: 💡 asks the bank for 3 hint levels; level 3 crosses out a wrong column (loai_bo); hint lowers the score', async () => {
  const api = cauNoiGia(DS);
  const { X, D } = napDao(api);
  vaoChoi(X, D);
  await choKhoi(X);
  assert.equal(X.useHint(), true);
  assert.equal(X.useHint(), true);
  assert.equal(X.G.cols.filter((c) => c.loaiBo).length, 0);
  assert.equal(X.useHint(), true);
  const gy = loaiGoi(api, 'goiY');
  assert.equal(gy.length, 3);
  assert.equal(gy[0][1].vi_tri_khoi.indexOf('cot_'), 0);
  const bo = gy[2][1];
  assert.ok(bo.loai_bo && bo.loai_bo !== '8:15', 'cấp 3 bỏ một đáp án sai: ' + JSON.stringify(bo));
  const i = X.G.cols.findIndex((c) => c.loaiBo);
  assert.equal('cot_' + (i + 1), bo.vi_tri_loai_bo);
  assert.equal(X.G.cols[i].nd.chu.replace(/ giờ| phút/g, '').replace(' ', ':').replace(/^(\d+)$/, '$1:00').replace(/:(\d)$/, ':0$1'), bo.loai_bo);
  X.useHint();
  assert.equal(loaiGoi(api, 'goiY').length, 3, 'hết 3 cấp thì không xin thêm');
  thaVaoCot(X, 0);
  assert.equal(X.G.score, 50, 'đúng nhờ gợi ý: 50 điểm, không tính chuỗi');
  assert.equal(X.G.streak, 0);
});

test('dao: pause logs tamDung/tiepTuc with the source; "Về đảo" from pause calls veDao once', async () => {
  const api = cauNoiGia(DS);
  const { X, D } = napDao(api);
  vaoChoi(X, D);
  await choKhoi(X);
  X.pauseGame();
  assert.equal(X.G.state, 'paused');
  X.resumeGame('phim');
  X.pauseGame('an_tab');
  assert.deepEqual(api.goi.filter((g) => g[0] === 'tamDung' || g[0] === 'tiepTuc'), [['tamDung', 'nut'], ['tiepTuc', 'phim'], ['tamDung', 'an_tab']]);
  D.veDao();
  D.veDao();
  const vd = loaiGoi(api, 'veDao');
  assert.equal(vd.length, 1);
  assert.equal(typeof vd[0][1].diem, 'number');
  assert.equal(loaiGoi(api, 'ketThuc').length, 0);
});

test('dao: when cauTiep returns null the tower celebrates, then ketThuc({ diem, dong_phu }) exactly once', async () => {
  const api = cauNoiGia(DS.slice(0, 2));
  const { X, D } = napDao(api);
  vaoChoi(X, D);
  for (const dung of [0, 1]) {
    await choKhoi(X);
    const k = X.G.cols.findIndex((c, i) => X.G.piece.target === i);
    assert.equal(k, dung, 'đích của khối là cột mang đáp án đúng');
    thaVaoCot(X, k);
  }
  chay(X, 1.5);
  assert.equal(loaiGoi(api, 'cauTiep').length, 3);
  assert.equal(X.G.state, 'clear');
  assert.equal(loaiGoi(api, 'ketThuc').length, 0, 'chờ hiệu ứng HOÀN THÀNH!');
  chay(X, 3);
  const kt = loaiGoi(api, 'ketThuc');
  assert.equal(kt.length, 1);
  assert.equal(kt[0][1].diem, X.G.score);
  assert.match(kt[0][1].dong_phu, /điểm, xếp đúng 2 khối/);
  assert.equal(kt[0][1].so_khoi_dung, 2);
  chay(X, 1);
  assert.equal(loaiGoi(api, 'ketThuc').length, 1);
});

test('dao: 3 choices → 3 columns (board rebuilt); rubble never ends the game (full column is swept)', async () => {
  const ds = [DS[2], DS[1], DS[3], DS[1], DS[3], DS[1], DS[3]].map((q, i) => Object.assign(J(q), { stt: i + 1, ma_cau: 'm' + i }));
  const api = cauNoiGia(ds);
  const { X, D } = napDao(api);
  vaoChoi(X, D);
  await choKhoi(X);
  assert.equal(X.soCot(), 3, 'câu có 3 lựa chọn → 3 cột');
  assert.equal(X.G.cols.length, 3);
  assert.deepEqual(J(X.G.cols.map((c) => c.nd.loai)), ['dong_ho', 'dong_ho', 'dong_ho'], 'đề chỉ có chữ → cột vẽ mặt đồng hồ');
  assert.equal(X.G.piece.t.loai, 'hoi', 'đề dài: khối mang dấu hỏi');
  // Sai liên tiếp vào cùng một cột: cột đầy thì được dọn, không bao giờ thua
  for (let k = 0; k < 6; k++) {
    const p = X.G.piece;
    const sai = [0, 1, 2, 3].find((c) => c !== p.target && c < X.soCot());
    thaVaoCot(X, sai);
    assert.notEqual(X.G.state, 'fail');
    assert.ok(X.stackH(sai) <= X.ROWS - 1, 'cột không vượt quá đỉnh');
    await cho(1400);
    chay(X, 1);
    if (k < 5) await choKhoi(X);
  }
  assert.equal(loaiGoi(api, 'phanHoi').length, 6);
  assert.notEqual(X.G.state, 'fail');
});

test('dao: a question without choices borrows distractors from the island bank (logged as tro); retry questions bounce back', async () => {
  const qQuay = cau(1, { dap_an: '7:30', de: 'Đồng hồ nào chỉ 7 giờ 30 phút?', dang: 'thao_tac_hinh', lan_thu_toi_da: 2, lua_chon: [] });
  qQuay.lua_chon = [];
  const NganHang = {
    taoNhieu() { return [{ gia_tri: '6:30', loi: ['nham-kim'] }, { gia_tri: '8:30', loi: ['lech-gio'] }, { gia_tri: '7:15', loi: ['khac'] }]; },
    veLuaChon(ct, v) { const [h, m] = v.split(':').map(Number); return { nhan: nhanGio(h, m), dong_ho: { h: h, m: m }, hien: 'dong_ho' }; },
    hienGiaTriCau(ct, v) { return String(v); }
  };
  const api = cauNoiGia([qQuay]);
  const { X, D } = napDao(api, { NganHang: NganHang });
  vaoChoi(X, D);
  await choKhoi(X);
  const tro = thaoTac(api, 'tro');
  assert.equal(tro.length, 1);
  assert.equal(tro[0][2].doi_tuong, 'lua_chon_du_phong');
  assert.equal(X.soCot(), 4);
  assert.deepEqual(J(X.G.cols.map((c) => c.nd.loai)), ['dong_ho', 'dong_ho', 'dong_ho', 'dong_ho']);
  const dung = X.G.piece.target;
  assert.equal(X.G.cols[dung].nd.t.h, 7);
  // Lần 1 sai (câu cho thử 2 lần): khối bật lên, cột đó bị gạch, không có màn phản hồi
  const sai = (dung + 1) % 4;
  thaVaoCot(X, sai);
  assert.equal(X.G.piece.mode, 'fall');
  assert.equal(X.G.piece.row < 0, true);
  assert.equal(X.G.cols[sai].loaiBo, true);
  assert.equal(loaiGoi(api, 'phanHoi').length, 0);
  thaVaoCot(X, dung);
  assert.equal(loaiGoi(api, 'traLoi').length, 2);
  assert.equal(X.G.correct, 1);
  // Không có ngân hàng, đáp án là số: lựa chọn là các số gần đáp án
  const api2 = cauNoiGia([cau(1, { dap_an: 45, de: '40 + 5 = ?', dang: 'nhap_so', lua_chon: [] })].map((q) => Object.assign(q, { lua_chon: [] })));
  const b = napDao(api2);
  vaoChoi(b.X, b.D);
  await choKhoi(b.X);
  assert.deepEqual(J(b.X.G.cols.map((c) => c.nd.chu)), ['44', '45', '46', '55']);
  assert.equal(b.X.G.piece.t.chu, '40 + 5 = ?', 'đề ngắn: khối ghi luôn đề');
});

test('dao: island sound settings are respected (tieng / giong off)', () => {
  const api = cauNoiGia(DS, { tieng: false, giong: false });
  const { win } = napDao(api);
  assert.equal(win.Sfx.enabled, false);
  assert.equal(win.Music.enabled, false);
  assert.equal(win.Voice.enabled, false);
  const api2 = cauNoiGia(DS);
  const b = napDao(api2);
  assert.equal(b.win.Sfx.enabled, true);
  assert.equal(b.win.Voice.enabled, true);
});

test('dao: files are wired (index.html loads dao.js before game.js, sw precaches it, no em dash)', () => {
  const html = fs.readFileSync(path.join(ROOT, 'thap-dong-ho/index.html'), 'utf8');
  const scripts = Array.from(html.matchAll(/<script[^>]+src="([^"]+)"/g)).map((m) => m[1]);
  assert.ok(scripts.indexOf('js/dao.js') >= 0 && scripts.indexOf('js/dao.js') < scripts.indexOf('js/game.js'));
  assert.match(html, /href="dao\.css"/);
  for (const id of ['dao-mo-dau', 'btn-dao-bat-dau', 'btn-dao-ve', 'btn-dao-ve-dau', 'btn-dao-nghe']) assert.match(html, new RegExp('id="' + id + '"'));
  const sw = fs.readFileSync(path.join(ROOT, 'thap-dong-ho/sw.js'), 'utf8');
  assert.match(sw, /'\.\/js\/dao\.js'/);
  assert.match(sw, /'\.\/dao\.css'/);
  const GACH_DAI = String.fromCharCode(0x2014);
  for (const f of ['js/dao.js', 'dao.css']) {
    assert.ok(fs.readFileSync(path.join(ROOT, 'thap-dong-ho', f), 'utf8').indexOf(GACH_DAI) < 0, f + ' không có dấu gạch dài');
  }
  // Các móc nối trong game.js không dùng dấu gạch dài
  const game = fs.readFileSync(path.join(ROOT, 'thap-dong-ho/js/game.js'), 'utf8');
  const moc = game.split(/\r?\n/).filter((l) => /\bDao\b/.test(l));
  assert.ok(moc.length >= 20, 'có các móc Dao trong game.js');
  moc.forEach((l) => assert.ok(l.indexOf(GACH_DAI) < 0, l));
});
