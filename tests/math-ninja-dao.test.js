'use strict';
/* Kiểm thử chế độ Đảo Khủng Long của Ninja Toán Học (math-ninja/js/dao.js + các chỗ "[Đảo]" trong js/game.js):
   - Chỉ bật khi có ?dao=1, trang nằm trong khung cha và khung cha có DaoCauNoi; thiếu một điều kiện thì game y như cũ.
   - Gọi đúng hợp đồng của cầu nối (dao-khung-long/js/cau-noi.js): sanSang, batDau, vòng cauTiep, thaoTac 'vuot',
     traLoi, goiY 3 cấp (cấp 3 loai_bo), phanHoi khi can_phan_hoi, tamDung/tiepTuc, ketThuc khi hết câu, veDao từ bảng tạm dừng.
   Cầu nối là một bản giả có kịch bản; game chạy trong window giả (tests/lib/load.js), khung hình được đẩy bằng tay. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { makeWindow, makeStorage, ROOT } = require('./lib/load.js');

const FILES = ['js/audio.js', 'js/math.js', 'js/fruits.js', 'js/profile.js', 'js/dao.js', 'js/game.js'];
const KIEU_THAO_TAC = ['cham', 'vuot', 'keo', 'tha', 'go_so', 'xoa', 'doi_lan', 'doi_cot', 'chon', 'bo_chon', 'nghe_lai', 'lat', 'xoay_nong', 'ban', 'rot',
  'keo_thuoc', 'cau', 'dem', 've', 'noi', 'xoay', 'boc', 'lat_trang', 'dat', 'bo_ra', 'di_chuyen', 'nhay', 'ngam', 'tro'];
const cho = (ms) => new Promise((r) => setTimeout(r, ms));
const json = (x) => JSON.parse(JSON.stringify(x));
/* deepEqual không dùng được với giá trị lấy từ vm context (prototype khác nhau) */
const same = (a, b, msg) => assert.equal(JSON.stringify(a), JSON.stringify(b), msg);

/* ---------------- Câu mẫu đúng dạng goiCau() của cầu nối ---------------- */
function cauSoSanh() {
  return {
    stt: 0, tong: 3, ma_cau: '2.2|so-sanh-100|dau:45,54', ky_nang: 'so-sanh-100', noi_dung: '2.2', loai: 'so_sanh', dang: 'chon_dap_an',
    de: '45 ? 54', de_doc: 'So sánh 45 và 54. 45 lớn hơn, bé hơn hay bằng 54?', hinh: '', dap_an: '<', dap_an_nhan: '<',
    lua_chon: [{ gia_tri: '>', nhan: '>', dung: false }, { gia_tri: '<', nhan: '<', dung: true }, { gia_tri: '=', nhan: '=', dung: false }],
    giay: 7, lan_thu_toi_da: 1, cau_truc: { loai: 'so_sanh', kieu: 'dau', a: 45, b: 54 }
  };
}
function cauCong() {
  return {
    stt: 0, tong: 3, ma_cau: '2.8|cong-qua-10|8+7', ky_nang: 'cong-qua-10', noi_dung: '2.8', loai: 'phep_tinh', dang: 'chon_dap_an',
    de: '8 + 7 = ?', de_doc: '8 cộng 7 bằng mấy?', hinh: '', dap_an: 15, dap_an_nhan: '15',
    lua_chon: [{ gia_tri: 5, nhan: '5', dung: false }, { gia_tri: 16, nhan: '16', dung: false }, { gia_tri: 15, nhan: '15', dung: true }, { gia_tri: 14, nhan: '14', dung: false }],
    giay: 7, lan_thu_toi_da: 1, cau_truc: { phep: '+', so: [8, 7], an: 'ket_qua' }
  };
}
function cauLonNhat() {
  return {
    stt: 0, tong: 3, ma_cau: '2.2|so-sanh-100|lon:68,40,39', ky_nang: 'so-sanh-100', noi_dung: '2.2', loai: 'so_sanh', dang: 'chon_dap_an',
    de: 'Số nào lớn nhất: 68, 40, 39?', de_doc: 'Trong các số 68, 40, 39, số nào lớn nhất?', hinh: '', dap_an: 68, dap_an_nhan: '68',
    lua_chon: [{ gia_tri: 40, nhan: '40', dung: false }, { gia_tri: 68, nhan: '68', dung: true }, { gia_tri: 39, nhan: '39', dung: false }],
    giay: 7, lan_thu_toi_da: 1, cau_truc: { loai: 'so_sanh', kieu: 'lon_nhat', ds: [68, 40, 39] }
  };
}

/** Cầu nối giả: ghi lại mọi lời gọi, trả câu theo kịch bản, chấm theo dap_an. */
function taoCauNoi(dsCau, amThanh) {
  const log = [];
  let i = 0;
  let cur = null;
  let cap = 0;
  const cn = {
    phien_ban: 1,
    log: log,
    dongPhanHoi: null,
    hienTai: () => cur,
    thongTin: () => ({
      phien_ban: 1, game: 'chem-trai-cay', ten_game: 'Chém Trái Cây',
      man: { id: 'v1-m5', ten: 'So sánh số', ten_day_du: 'Bờ Biển Số 100 · Màn 5 · So sánh số', so_cau: dsCau.length, che_do: null, dang: null, bai: 'Bài 1', vung: 1 },
      be: { ten: 'An', ten_khung_long: 'Rex', phong_cach: 'dung_manh', hinh: 'http://127.0.0.1/dao-khung-long/assets/img/rex-kid.webp',
        hinh_co_vu: 'http://127.0.0.1/dao-khung-long/assets/img/rex-cheer.webp', hinh_goi_y: 'http://127.0.0.1/dao-khung-long/assets/img/rex-think.webp' },
      am_thanh: amThanh || { tieng: true, giong: true }
    }),
    sanSang: () => { log.push(['sanSang']); return cn.thongTin(); },
    batDau: (dk) => { log.push(['batDau', json(dk)]); return 'va_test'; },
    loiLanToi: 0,
    cauTiep: (tc) => {
      log.push(['cauTiep', json(tc)]);
      if (cn.loiLanToi > 0) { cn.loiLanToi--; throw new Error('Cầu nối: lỗi giả'); }
      if (cur && !cur.xong) throw new Error('Câu trước chưa kết thúc');
      if (i >= dsCau.length) return null;
      cur = dsCau[i++];
      cur.stt = i;
      cur.lua_chon = cur.lua_chon.map((x, k) => Object.assign({}, x, { vi_tri: tc.vi_tri[k] || 'lua_chon_' + (k + 1) }));
      cap = 0;
      return json(cur);
    },
    thaoTac: (kieu, du) => { log.push(['thaoTac', kieu, json(du)]); return true; },
    goiY: (them) => { log.push(['goiY', json(them)]); if (cap >= 3) return null; cap++; return { cap: cap, loi: 'Gợi ý cấp ' + cap }; },
    traLoi: (v, them) => {
      log.push(['traLoi', v, json(them)]);
      const dung = String(v) === String(cur.dap_an);
      if (dung) { cur.xong = true; return { dung: true, loi: [], loi_noi: null, thu_lai: false, can_phan_hoi: false, ket_qua: cap ? 'dung_sau_goi_y' : 'dung_ngay', qua_mong: cap ? 1 : 3, dap_an: cur.dap_an }; }
      cur.lan = cur.lan || 1;
      if (cur.lan < (cur.lan_thu_toi_da || 1)) { cur.lan++; return { dung: false, loi: ['khac'], loi_noi: 'Con thử lại nhé', thu_lai: true, can_phan_hoi: false, ket_qua: null, qua_mong: 0, dap_an: cur.dap_an }; }
      return { dung: false, loi: ['chieu-dau'], loi_noi: 'Dấu mở miệng về phía số lớn hơn', thu_lai: false, can_phan_hoi: true, ket_qua: null, qua_mong: 0, dap_an: cur.dap_an };
    },
    hetGio: () => { log.push(['hetGio']); if (cur) cur.xong = true; return { ket_qua: 'het_gio' }; },
    phanHoi: (v, kq) => { log.push(['phanHoi', v, json(kq).can_phan_hoi]); return new Promise((res) => { cn.dongPhanHoi = () => { cur.xong = true; cn.dongPhanHoi = null; res(true); }; }); },
    tamDung: (n) => { log.push(['tamDung', n]); return true; },
    tiepTuc: (n) => { log.push(['tiepTuc', n]); return true; },
    ketThuc: (them) => { log.push(['ketThuc', json(them)]); return Promise.resolve(true); },
    veDao: (them) => { log.push(['veDao', json(them)]); return Promise.resolve(true); },
    doc: (chu) => { log.push(['doc', chu]); return true; }
  };
  return cn;
}

/** Nạp game vào một window giả. o: { search, parent (undefined: chính nó), storage } */
function nap(o) {
  o = o || {};
  const st = o.storage || makeStorage();
  const win = makeWindow({ localStorage: st });
  win.location.search = o.search != null ? o.search : '';
  if (o.parent !== undefined) win.parent = o.parent;
  const ctx = vm.createContext(win);
  for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(ROOT, 'math-ninja', f), 'utf8'), ctx, { filename: 'math-ninja/' + f });
  return { win, st, X: win.__NinjaToan, D: win.NinjaDao };
}

function napDao(dsCau, amThanh) {
  const cn = taoCauNoi(dsCau, amThanh);
  const r = nap({ search: '?dao=1&man=v1-m5', parent: { DaoCauNoi: cn } });
  r.cn = cn;
  r.D.CAU_HINH.choPhanHoiMs = 0;
  r.D.CAU_HINH.ketThucMs = 0;
  return r;
}

/** Bỏ qua đếm ngược 3-2-1 (setTimeout thật) và đẩy khung hình cho tới khi điều kiện đúng. */
function vaoChoi(X) {
  clearTimeout(X.G.cdTimer);
  X.G.state = 'playing';
  X.G.nextQuestionAt = X.G.time;
}
function day(X, giay, dk) {
  for (let t = 0; t < giay; t += 0.05) {
    X.update(0.05);
    if (dk && dk()) return true;
  }
  return !dk;
}
const quaBay = (X) => X.G.fruits.filter((f) => f.lc && f.launched && !f.dead && f.popping <= 0);
const choQua = (X) => assert.ok(day(X, 3, () => quaBay(X).length > 0 && X.G.fruits.filter((f) => f.lc && !f.dead).every((f) => f.launched)), 'quả phải bay lên');
/** Vuốt một đoạn ngắn đi qua tâm quả (như bé vuốt qua quả đó). */
function chem(X, f) { X.sliceSegment(f.x - 2, f.y, f.x + 2, f.y); }
const goiTen = (cn, ten) => cn.log.filter((x) => x[0] === ten);

/* ---------------- 1. Chơi riêng: không có gì thay đổi ---------------- */
test('không có ?dao=1: NinjaDao = null, game mở menu và vẫn ghi tiến trình như cũ', () => {
  const { win, st, X } = nap({});
  assert.equal(win.NinjaDao, null);
  assert.equal(X.Dao, null);
  assert.equal(X.G.state, 'menu');
  X.Store.save();
  assert.ok(st.getItem('ninja-toan-v1'), 'chơi riêng vẫn ghi localStorage');
  // Chém đáp án như cũ: sinh câu, phóng quả kèm đáp án nhiễu, không gắn lựa chọn của đảo
  X.startGame(win.MathGen.levelById('a3'));
  vaoChoi(X);
  day(X, 0.3);
  assert.ok(X.G.question && X.G.question.text, 'có câu hỏi của game');
  assert.ok(X.G.fruits.length >= 3);
  assert.ok(X.G.fruits.every((f) => !f.lc), 'không có quả của đảo');
});

test('?dao=1 nhưng không nằm trong khung đảo (không khung cha, khung cha thiếu DaoCauNoi hoặc khác tên miền): chơi riêng', () => {
  const a = nap({ search: '?dao=1&man=v1-m5' });                     // window.parent === window
  assert.equal(a.win.NinjaDao, null);
  assert.equal(a.X.G.state, 'menu');
  const b = nap({ search: '?dao=1', parent: {} });
  assert.equal(b.win.NinjaDao, null);
  const khacTenMien = {};
  Object.defineProperty(khacTenMien, 'DaoCauNoi', { get() { throw new Error('SecurityError: cross-origin'); } });
  const c = nap({ search: '?dao=1', parent: khacTenMien });
  assert.equal(c.win.NinjaDao, null);
  const d = nap({ search: '?dao=10', parent: { DaoCauNoi: taoCauNoi([cauCong()]) } });
  assert.equal(d.win.NinjaDao, null, '?dao=10 không phải chế độ đảo');
});

/* ---------------- 2. Khởi động trên đảo ---------------- */
test('trên đảo: sanSang lúc tải xong, thẻ "Bắt đầu" thay menu, âm thanh theo đảo, không ghi localStorage', () => {
  const { win, st, X, D, cn } = napDao([cauCong()], { tieng: false, giong: false });
  assert.ok(D, 'NinjaDao phải bật');
  assert.equal(X.Dao, D);
  assert.deepEqual(cn.log.map((x) => x[0]), ['sanSang'], 'chỉ gọi sanSang, chưa bắt đầu ván');
  assert.ok(D.manHinhMo(), 'thẻ Bắt đầu đang mở');
  assert.equal(X.G.state, 'menu', 'chưa chơi: quả trang trí bay quanh thẻ');
  assert.equal(win.Sfx.enabled, false);
  assert.equal(win.Music.enabled, false);
  assert.equal(win.Voice.enabled, false);
  X.Store.save();
  X.Store.noteMissed('a:1+1', { a: 1, b: 1, op: '+', max: 12, level: 'a1' });
  assert.equal(st.getItem('ninja-toan-v1'), null, 'đảo là nơi ghi chép duy nhất');
  assert.equal(D.tenBe(), 'An');
});

/* ---------------- 3. Một ván trọn vẹn ---------------- */
test('ván trên đảo: cauTiep → vuot → traLoi; gợi ý 3 cấp; quả rơi thì ném lại; sai thì chờ phanHoi; hết câu thì ketThuc', async () => {
  const { X, D, cn } = napDao([cauSoSanh(), cauCong(), cauLonNhat()]);
  D.batDauChoi();
  const bd = goiTen(cn, 'batDau');
  assert.equal(bd.length, 1);
  assert.equal(bd[0][1].so_lua_chon, 4);
  assert.equal(bd[0][1].bom, 0);
  assert.equal(X.G.state, 'countdown');
  D.batDauChoi();
  assert.equal(goiTen(cn, 'batDau').length, 1, 'bấm Bắt đầu hai lần vẫn chỉ một ván');
  vaoChoi(X);
  day(X, 0.1);

  // Câu 1: 45 ? 54, ba quả mang ba dấu, xếp đúng cột theo vi_tri
  const ct = goiTen(cn, 'cauTiep');
  assert.equal(ct.length, 1);
  assert.deepEqual(ct[0][1], { so_lua_chon: 4, vi_tri: ['cot_1', 'cot_2', 'cot_3', 'cot_4'] });
  choQua(X);
  let qs = X.G.fruits.filter((f) => f.lc);
  assert.equal(qs.length, 3, 'đúng 3 quả cho 3 lựa chọn');
  assert.ok(X.G.fruits.every((f) => f.kind === 'fruit'), 'không bom, không tim');
  same(qs.map((f) => f.lc.gia_tri).sort(), ['<', '=', '>']);
  const theoCot = qs.slice().sort((a, b) => a.lc.chiSo - b.lc.chiSo);
  for (let k = 1; k < theoCot.length; k++) assert.ok(theoCot[k].x > theoCot[k - 1].x, 'cột ' + k + ' nằm bên phải cột trước');
  assert.ok(D.coGoiY(), 'nút gợi ý bật');
  assert.ok(X.G.question && X.G.question.dao);
  // Chém đúng dấu <
  const dung1 = quaBay(X).find((f) => f.lc.gia_tri === '<');
  chem(X, dung1);
  let tt = cn.log.filter((x) => x[0] === 'thaoTac' || x[0] === 'traLoi');
  assert.equal(tt.length, 2, 'một vuot rồi một traLoi');
  assert.equal(tt[0][1], 'vuot');
  assert.ok(KIEU_THAO_TAC.includes(tt[0][1]));
  assert.equal(tt[0][2].gia_tri, '<');
  assert.equal(tt[0][2].vi_tri, 'cot_2');
  assert.equal(tt[0][2].lan_nem, 1);
  assert.ok(tt[0][2].x >= 0 && tt[0][2].x <= 1 && tt[0][2].y >= 0 && tt[0][2].y <= 1, 'x, y chuẩn hóa 0..1');
  assert.equal(tt[1][1], '<');
  assert.deepEqual(tt[1][2], { vi_tri: 'cot_2', lan_nem: 1 });
  assert.ok(X.G.score > 0, 'đúng thì được điểm');
  assert.equal(X.G.correct, 1);
  assert.ok(X.G.nextQuestionAt >= 0);
  assert.equal(X.G.hearts, 3, 'không có tim để mất');

  // Câu 2: 8 + 7, bốn quả; xin gợi ý 3 lần (cấp 3 bỏ một quả sai)
  assert.ok(day(X, 3, () => goiTen(cn, 'cauTiep').length === 2), 'sang câu 2');
  choQua(X);
  assert.equal(X.G.fruits.filter((f) => f.lc && !f.dead).length, 4);
  D.goiY(); D.goiY();
  assert.equal(quaBay(X).length, 4, 'cấp 1, 2 chưa bỏ quả nào');
  D.goiY();
  const gy = goiTen(cn, 'goiY');
  assert.equal(gy.length, 3);
  assert.equal(gy[0][1], null);
  assert.equal(gy[1][1], null);
  assert.ok(gy[2][1] && gy[2][1].loai_bo != null, 'cấp 3 ghi loai_bo');
  const boDi = gy[2][1].loai_bo;
  assert.notEqual(boDi, 15, 'không bao giờ bỏ đáp án đúng');
  assert.ok(!quaBay(X).some((f) => f.lc.gia_tri === boDi), 'quả bị bỏ đã biến mất');
  assert.equal(D.coGoiY(), false, 'hết 3 cấp thì nút gợi ý tắt');
  D.goiY();
  assert.equal(goiTen(cn, 'goiY').length, 3, 'không gọi quá 3 cấp');
  // Để quả rơi hết: ném lại (không traLoi, không hetGio), chậm hơn, không có quả đã bị bỏ
  const g0 = X.G.gravity;
  assert.ok(day(X, 12, () => D._trangThai().soNem === 2), 'quả rơi hết thì ném lại');
  assert.equal(goiTen(cn, 'traLoi').length, 1);
  assert.equal(goiTen(cn, 'hetGio').length, 0, 'không phạt hết giờ');
  assert.ok(X.G.gravity < g0, 'đợt ném lại bay chậm hơn');
  choQua(X);
  assert.equal(X.G.fruits.filter((f) => f.lc && !f.dead).length, 3, 'ném lại 3 quả còn lại');
  assert.ok(!X.G.fruits.some((f) => f.lc && !f.dead && f.lc.gia_tri === boDi));
  // Chém sai: dừng, chờ phanHoi của đảo, chưa hỏi câu mới
  const sai = quaBay(X).find((f) => !f.lc.dung);
  chem(X, sai);
  const tl = goiTen(cn, 'traLoi');
  assert.equal(tl.length, 2);
  assert.equal(tl[1][1], sai.lc.gia_tri);
  assert.equal(tl[1][2].lan_nem, 2, 'ghi đợt ném thứ mấy');
  assert.equal(X.G.state, 'cho_dao');
  assert.equal(X.G.hearts, 3, 'chém sai không mất tim');
  assert.equal(D.coGoiY(), false);
  await cho(20);
  const ph = goiTen(cn, 'phanHoi');
  assert.equal(ph.length, 1);
  assert.equal(ph[0][1], sai.lc.gia_tri);
  assert.equal(ph[0][2], true);
  day(X, 2);
  assert.equal(goiTen(cn, 'cauTiep').length, 2, 'chờ bé đóng thẻ "Gần đúng rồi" rồi mới sang câu');
  X.sliceSegment(0, 0, 2000, 2000);
  assert.equal(goiTen(cn, 'traLoi').length, 2, 'đang chờ phản hồi thì không chém được');
  cn.dongPhanHoi();
  await cho(5);
  assert.equal(X.G.state, 'playing');

  // Câu 3: tạm dừng (tamDung/tiepTuc), rồi chém đúng; hết câu thì ketThuc
  assert.ok(day(X, 3, () => goiTen(cn, 'cauTiep').length === 3), 'sang câu 3');
  choQua(X);
  X.pauseGame('nut');
  assert.equal(X.G.state, 'paused');
  X.resumeGame();
  assert.deepEqual(cn.log.filter((x) => x[0] === 'tamDung' || x[0] === 'tiepTuc'), [['tamDung', 'nut'], ['tiepTuc', 'nut']]);
  chem(X, quaBay(X).find((f) => f.lc.gia_tri === 68));
  assert.equal(goiTen(cn, 'traLoi')[2][1], 68);
  assert.ok(day(X, 3, () => goiTen(cn, 'cauTiep').length === 4), 'hỏi câu kế và nhận null');
  assert.equal(D._trangThai().xong, true);
  await cho(20);
  const kt = goiTen(cn, 'ketThuc');
  assert.equal(kt.length, 1);
  assert.equal(kt[0][1].diem, X.G.score);
  assert.ok(kt[0][1].diem > 0);
  assert.match(kt[0][1].dong_phu, /^Chém đúng 2 quả · /);
  assert.ok(!('sai' in kt[0][1]) && !('so_cau' in kt[0][1]), 'không ghi đè bộ đếm của nhật ký');
  assert.equal(goiTen(cn, 'veDao').length, 0);
  // Trình tự tổng: sanSang, batDau rồi các câu; ketThuc sau cùng
  const ten = cn.log.map((x) => x[0]);
  assert.equal(ten[0], 'sanSang');
  assert.equal(ten[1], 'batDau');
  assert.equal(ten[ten.length - 1], 'ketThuc');
  // Mỗi traLoi đi ngay sau một vuot của cùng giá trị
  cn.log.forEach((x, k) => {
    if (x[0] !== 'traLoi') return;
    const truoc = cn.log[k - 1];
    assert.equal(truoc[0], 'thaoTac');
    assert.equal(truoc[1], 'vuot');
    assert.equal(String(truoc[2].gia_tri), String(x[1]));
  });
  // Sau khi xong: không hỏi thêm, không chém thêm
  day(X, 2);
  assert.equal(goiTen(cn, 'cauTiep').length, 4);
});

test('về đảo từ bảng tạm dừng: tiepTuc("thoat") rồi veDao({ diem }), không ketThuc', async () => {
  const { X, D, cn } = napDao([cauCong(), cauSoSanh()]);
  D.batDauChoi();
  vaoChoi(X);
  day(X, 0.1);
  choQua(X);
  chem(X, quaBay(X).find((f) => f.lc.dung));
  const diem = X.G.score;
  assert.ok(diem > 0);
  X.pauseGame('phim');
  D.veDao();
  D.veDao();
  await cho(5);
  const cuoi = cn.log.slice(-3);
  assert.deepEqual(cuoi[0], ['tamDung', 'phim']);
  assert.deepEqual(cuoi[1], ['tiepTuc', 'thoat']);
  assert.deepEqual(cuoi[2], ['veDao', { diem: diem }]);
  assert.equal(goiTen(cn, 'veDao').length, 1, 'bấm hai lần chỉ về đảo một lần');
  assert.equal(goiTen(cn, 'ketThuc').length, 0);
});

test('về đảo ngay ở thẻ "Bắt đầu": không mở ván, không tamDung', async () => {
  const { D, cn } = napDao([cauCong()]);
  D.veDao();
  await cho(5);
  assert.deepEqual(cn.log.map((x) => x[0]), ['sanSang', 'veDao']);
  assert.deepEqual(goiTen(cn, 'veDao')[0][1], { diem: 0 });
});

test('không có giọng Việt trên máy: đề được đọc bằng giọng của đảo (doc)', () => {
  const { X, D, cn } = napDao([cauSoSanh()]);
  D.batDauChoi();
  vaoChoi(X);
  day(X, 0.1);
  const doc = goiTen(cn, 'doc');
  assert.ok(doc.some((x) => /So sánh 45 và 54/.test(x[1])), 'đọc de_doc của câu');
});

test('câu được thử 2 lần (thu_lai): không hiện phản hồi, quả đã chém không bay lại, lần sai thứ hai mới chờ phanHoi', async () => {
  const hai = Object.assign(cauCong(), { lan_thu_toi_da: 2 });
  const { X, D, cn } = napDao([hai, cauSoSanh()]);
  D.batDauChoi();
  vaoChoi(X);
  day(X, 0.1);
  choQua(X);
  const sai1 = quaBay(X).find((f) => !f.lc.dung);
  chem(X, sai1);
  assert.equal(X.G.state, 'playing', 'thử lại: vẫn chơi tiếp');
  assert.equal(goiTen(cn, 'phanHoi').length, 0);
  assert.equal(D._trangThai().daThu[String(sai1.lc.gia_tri)], 1);
  // Cả đợt rơi hết: ném lại 3 quả, không có quả vừa chém sai
  assert.ok(day(X, 12, () => D._trangThai().soNem === 2));
  choQua(X);
  assert.equal(X.G.fruits.filter((f) => f.lc && !f.dead).length, 3);
  assert.ok(!X.G.fruits.some((f) => f.lc && !f.dead && f.lc.gia_tri === sai1.lc.gia_tri));
  chem(X, quaBay(X).find((f) => !f.lc.dung));
  assert.equal(X.G.state, 'cho_dao');
  await cho(10);
  assert.equal(goiTen(cn, 'phanHoi').length, 1);
  cn.dongPhanHoi();
  await cho(5);
  assert.ok(day(X, 2, () => goiTen(cn, 'cauTiep').length === 2), 'sang câu kế');
});

test('câu không có lựa chọn thì báo hetGio và hỏi câu khác; cầu nối lỗi thì thử lại, không kết thúc ván', () => {
  const nhap = Object.assign(cauCong(), { dang: 'nhap_so', lua_chon: [] });
  const { X, D, cn } = napDao([nhap, cauSoSanh()]);
  D.batDauChoi();
  vaoChoi(X);
  day(X, 0.1);
  assert.equal(goiTen(cn, 'hetGio').length, 1);
  assert.ok(day(X, 1, () => goiTen(cn, 'cauTiep').length === 2), 'hỏi câu kế ngay');
  choQua(X);
  chem(X, quaBay(X).find((f) => f.lc.dung));
  cn.loiLanToi = 1;
  assert.ok(day(X, 2, () => goiTen(cn, 'cauTiep').length === 3));
  assert.equal(D._trangThai().xong, false, 'một lần lỗi chưa kết thúc ván');
  assert.ok(day(X, 2, () => goiTen(cn, 'cauTiep').length === 4), 'thử lại sau một giây');
  assert.equal(D._trangThai().xong, true, 'hết câu thật thì xong');
  assert.ok(D._trangThai().loi.some((m) => /lỗi giả/.test(m)), 'lỗi được ghi lại cho kiểm thử');
});

/* ---------------- 4. Vẽ đề và nhãn trên quả ---------------- */
test('thẻ câu hỏi: dấu so sánh có ô trống, số lớn nhất, phép tính; hiện đáp án khi đúng', () => {
  const { D } = napDao([cauCong()]);
  let h = D._htmlDe(cauSoSanh(), false);
  assert.match(h.html, /Chọn dấu &gt;, &lt; hay =/);
  assert.match(h.html, /<span class="dao-so">45<\/span><span class="dao-o">\?<\/span><span class="dao-so">54<\/span>/);
  h = D._htmlDe(cauSoSanh(), true);
  assert.match(h.html, /<span class="dao-o dung">&lt;<\/span>/);
  h = D._htmlDe(cauLonNhat(), false);
  assert.match(h.html, /Số nào <b>lớn nhất<\/b>\?/);
  assert.equal((h.html.match(/class="dao-so"/g) || []).length, 3);
  h = D._htmlDe(cauLonNhat(), true);
  assert.match(h.html, /<span class="dao-so dung">68<\/span>/);
  h = D._htmlDe(cauCong(), false);
  assert.match(h.html, /8 \+ 7 = <span class="q">\?<\/span>/);
  h = D._htmlDe(cauCong(), true);
  assert.match(h.html, /8 \+ 7 = <span class="q dao-lo">15<\/span>/);
  const coHinh = Object.assign(cauCong(), { de: 'Số nào ở chỗ dấu ? trên tia số?', hinh: '<svg viewBox="0 0 10 10"></svg>', cau_truc: { loai: 'tia_so' } });
  h = D._htmlDe(coHinh, false);
  assert.match(h.html, /<span class="dao-hinh"><svg/);
  assert.match(h.lop, /dao-de-dai/);
  assert.doesNotMatch(D._htmlDe(Object.assign(cauCong(), { de: '<b>x</b> = ?' }), false).html, /<b>x/, 'đề được thoát HTML');
});

test('nhãn trên quả: dấu thật to, số 3 chữ số vừa quả, nhãn dài thu nhỏ hoặc xuống 2 dòng', () => {
  const { D } = napDao([cauCong()]);
  // Bút đo giả: mỗi chữ rộng 0,55 cỡ chữ
  const c = { font: '', measureText(s) { const px = Number((/(\d+)px/.exec(this.font) || [0, 20])[1]); return { width: s.length * px * 0.55 }; } };
  const r = 60;
  const dau = D._boCuc(c, '<', r);
  assert.equal(dau.dau, true);
  assert.ok(dau.co >= r * 1.4, 'dấu so sánh to hơn số');
  const hai = D._boCuc(c, '54', r);
  assert.equal(hai.co, r);
  const ba = D._boCuc(c, '100', r);
  assert.equal(ba.dong.length, 1);
  assert.ok(ba.co < hai.co && ba.co * 3 * 0.55 <= r * 1.75, '3 chữ số nằm gọn trong quả');
  const dai = D._boCuc(c, '8 giờ 15 phút', r);
  assert.equal(dai.dong.length, 2, 'nhãn dài xuống 2 dòng');
  dai.dong.forEach((d) => assert.ok(d.length * dai.co * 0.55 <= r * 1.6, 'mỗi dòng vừa quả: ' + d));
  const lienTuc = D._boCuc(c, '26,60,62,66', r);
  same(lienTuc.dong, ['26,60,', '62,66'], 'dãy số dài xuống dòng sau dấu phẩy');
  lienTuc.dong.forEach((d) => assert.ok(d.length * lienTuc.co * 0.55 <= r * 1.6, 'mỗi dòng vừa quả: ' + d));
  const mot = D._boCuc(c, '999+1', r);
  assert.equal(mot.dong.length, 1, 'không có chỗ ngắt thì thu nhỏ trên một dòng');
  assert.ok(mot.co >= r * 0.3);
});

test('vẽ lựa chọn trên quả: đồng hồ, hình SVG (chưa tải thì hiện chữ), chữ dài không làm lỗi', () => {
  const { D } = napDao([cauCong()]);
  const goi = [];
  const c = new Proxy({ font: '', measureText(s) { return { width: String(s).length * 10 }; } }, {
    get(t, p) { if (p in t) return t[p]; return function () { goi.push(p); }; },
    set(t, p, v) { t[p] = v; return true; }
  });
  const qua = (lc) => ({ kind: 'fruit', launched: true, dead: false, scale: 1, r: 60, x: 300, y: 300, lc: lc });
  D.veNhan(c, qua({ gia_tri: '8:15', nhan: '8 giờ 15 phút', dong_ho: { h: 8, m: 15 } }));
  assert.ok(goi.includes('arc') && goi.includes('stroke'), 'vẽ mặt đồng hồ');
  goi.length = 0;
  D.veNhan(c, qua({ gia_tri: 3, nhan: 'Hình tam giác', hinh: '<svg viewBox="0 0 10 10"><path d="M0 0L10 10"/></svg>' }));
  assert.ok(goi.includes('fillText'), 'ảnh chưa tải xong thì hiện nhãn chữ');
  goi.length = 0;
  D.veNhan(c, qua({ gia_tri: '500,200', nhan: '500 đồng và 200 đồng' }));
  assert.equal(goi.filter((x) => x === 'fillText').length, 2, 'nhãn dài xuống 2 dòng');
  goi.length = 0;
  D.veNhan(c, Object.assign(qua({ gia_tri: 5, nhan: '5' }), { launched: false }));
  assert.equal(goi.length, 0, 'quả chưa bay lên thì chưa vẽ');
});
