'use strict';
/* Đảo Khủng Long: kiểm thử các lỗi đã sửa sau lần rà soát 2026-09-28 (không cần trình duyệt).
   - VanChoi: câu sai quay lại có giới hạn mỗi ván, tiến độ tính cả câu quay lại, Đấu Trường không bị giới hạn.
   - Dao.cauDauTruong: bé lớp 2 chỉ gặp kỹ năng của bài đã học tới hoặc đã luyện, mỗi vùng có mặt, bằng trọng số thì trộn theo ngày.
   - Ngân hàng câu: Bài 9 (thêm, bớt) chỉ trừ không qua 10; màn bài toán có lời văn vùng 4 mở từ Bài 23.
   - NhatKy.donNhatKyCu: xóa theo khoảng mã ULID, giữ đúng các ngày còn lại. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./lib/load.js');

const FILES = ['js/nhat-ky.js', 'js/ngan-hang.js', 'js/cau-so-sanh.js', 'js/cau-do-luong.js', 'js/cau-tien.js', 'js/cau-thong-ke.js', 'js/cau-hinh-hoc.js', 'js/cau-thoi-gian.js', 'js/hoc-tap.js', 'js/dao.js', 'js/ho-so.js', 'js/van-choi.js'];

function moi() {
  const w = loadGame('dao-khung-long', FILES);
  const dh = { t: Date.UTC(2026, 9, 12, 12, 4, 0), p: 1000 };
  w.NhatKy.caiDongHo({ now: () => dh.t, perf: () => dh.p });
  return { w, dh, NK: w.NhatKy, NH: w.NganHang, DAO: w.Dao };
}

/** Nhật ký giả rất nhẹ (như kiểm thử cân bằng Đấu Trường). */
function nkGia() {
  let n = 0;
  return {
    batDauVan: () => 'v', cauHien: () => 'c' + (++n), thaoTac: () => null, goiY: () => null, traLoi: () => null,
    msTrongCau: () => 3000, cauKetThuc: () => null, phanHoiXem: () => null, ketThucVan: () => Promise.resolve([])
  };
}

/** Chơi hết một ván, trả lời sai mọi câu. Trả về số câu đã hiện và các tiến độ đã thấy. */
function choiSaiHet(w, NH, man, soCau) {
  const van = new w.VanChoi({ nk: nkGia(), game: man.game, vung: man.vung, man: man, hatGiong: 7, soCau: soCau });
  van.batDau({});
  const tienDo = [];
  let soHien = 0;
  while (van.conCau() && soHien < 200) {
    const q = van.cauTiep();
    soHien++;
    tienDo.push(van.tienDo());
    const sai = q.lua_chon.find((x) => NH.nhanBietLoi(q.cau_truc, x.gia_tri).length).gia_tri;
    van.traLoi(sai);
    van.ketThucCauSai();
  }
  return { van, soHien, tienDo };
}

test('ván chơi: bé sai hết thì câu quay lại có giới hạn (12 câu thành tối đa 16), tiến độ không đầy trước khi hết câu', () => {
  const { w, NH, DAO } = moi();
  const man = Object.assign({}, DAO.man('v2-m1'), { dang: 'chon_dap_an' });
  const { van, soHien, tienDo } = choiSaiHet(w, NH, man, 12);
  assert.equal(van.ds.length, 12);
  assert.equal(soHien, 16, 'thêm tối đa một phần ba số câu (ít nhất 3)');
  tienDo.forEach((t, i) => {
    assert.ok(t.xong < t.tong, 'câu ' + (i + 1) + ': thanh chưa đầy khi còn câu đang làm');
    assert.equal(t.xong, i, 'đã xong đúng số câu trước đó');
  });
  assert.equal(tienDo[tienDo.length - 1].tong, 16, 'tổng cuối cùng bằng số câu thật sự đã hiện');
  assert.ok(tienDo.some((t) => t.onLai), 'có câu được đánh dấu làm lại');
  assert.equal(van.tienDo().xong, 16);
  // Màn 8 câu thêm tối đa 3 câu
  const m8 = Object.assign({}, DAO.man('v2-m1'), { dang: 'chon_dap_an', so_cau: 8 });
  assert.equal(choiSaiHet(w, NH, m8, 8).soHien, 11);
});

test('ván chơi: seOnLai() nói đúng câu sai có quay lại không; bé làm đúng hết thì không có câu thêm', () => {
  const { w, NH, DAO } = moi();
  const man = Object.assign({}, DAO.man('v2-m1'), { dang: 'chon_dap_an' });
  const van = new w.VanChoi({ nk: nkGia(), game: man.game, vung: man.vung, man: man, hatGiong: 3, soCau: 12 });
  van.batDau({});
  let q = van.cauTiep();
  assert.equal(van.seOnLai(), true, 'câu đầu sai thì còn quay lại');
  assert.equal(van.tienDo().tong, 12);
  van.traLoi(q.lua_chon.find((x) => NH.nhanBietLoi(q.cau_truc, x.gia_tri).length).gia_tri);
  van.ketThucCauSai();
  assert.equal(van.tienDo().tong, 13, 'câu sai quay lại được tính vào tổng');
  let n = 1;
  while (van.conCau()) { q = van.cauTiep(); van.traLoi(q.dap_an); n++; }
  assert.equal(n, 13);
  assert.equal(van.tienDo().xong, van.tienDo().tong);
});

test('ván chơi: Đấu Trường không giới hạn câu quay lại (số câu đã cân theo luật cũ)', () => {
  const { w, NH, DAO } = moi();
  const m = DAO.man('dt1');
  const cau = DAO.cauDauTruong(m, null, '2026-10-12', (kn) => !!NH.KY_NANG[kn] && NH.loaiKyNang(kn) !== 'loi_van');
  const man = Object.assign({}, m, { cau: cau.map((x) => ({ ky_nang: x.ky_nang, ty_le: x.ty_le, dang: 'chon_dap_an' })) });
  assert.equal(choiSaiHet(w, NH, man, 10).soHien, 30, 'mỗi câu quay lại 2 lần như trước');
});

test('Lật Thẻ: câu dựng sẵn trên bàn vẫn được tính vào tổng tiến độ', () => {
  const { w, DAO } = moi();
  const man = DAO.man('v1-m2');
  const van = new w.VanChoi({ nk: nkGia(), game: man.game, vung: man.vung, man: man, hatGiong: 11, soCau: 12 });
  van.batDau({});
  const ban = van.lapBan(6);
  assert.equal(van.tienDo().tong, 12, 'câu trên bàn chưa hiện vẫn là câu còn lại');
  van.hienCau(ban[0]);
  assert.equal(van.tienDo().tong, 12);
  assert.equal(van.tienDo().dang, 1);
});

const locKyNang = (NH) => (kn) => !!NH.KY_NANG[kn] && NH.loaiKyNang(kn) !== 'loi_van';

test('đấu trường: bé lớp 2 ở Bài 30 không gặp kỹ năng học kì 2 chưa luyện; mỗi vùng có mặt; bằng trọng số thì trộn theo ngày', () => {
  const { NH, DAO } = moi();
  const m = DAO.man('dt1');
  const hoSo = { lop: 2, bai_dang_hoc: 30 };
  const baiDau = (kn) => DAO.VUNG.flatMap((v) => v.man).find((x) => x.ky_nang_chinh === kn).bai_dau;
  const ds = DAO.cauDauTruong(m, null, '2026-10-12', locKyNang(NH), hoSo);
  assert.equal(ds.length, 10);
  ds.forEach((x) => assert.ok(baiDau(x.ky_nang) <= 30, x.ky_nang + ' (Bài ' + baiDau(x.ky_nang) + ')'));
  const vungCo = new Set(ds.map((x) => DAO.VUNG.find((v) => DAO.kyNangCuaVung(v).includes(x.ky_nang)).so));
  [1, 2, 3, 4, 5, 6].forEach((so) => assert.ok(vungCo.has(so), 'có kỹ năng của vùng ' + so));
  // Đã luyện một kỹ năng học kì 2 (phụ huynh mở sớm) thì vẫn được gặp
  const hocTap = { ky_nang: [{ ky_nang: 'do-do-dai', muc: 'dang_luyen', so_cau: 12, can_giup: true, cau_no: 1, tu_lam_dung_14_ngay: 0.5 }] };
  assert.equal(DAO.cauDauTruong(m, hocTap, '2026-10-12', locKyNang(NH), hoSo)[0].ky_nang, 'do-do-dai');
  // Bằng trọng số: không còn cố định theo bảng chữ cái, đổi theo ngày
  const tapTheoNgay = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16']
    .map((n) => DAO.cauDauTruong(m, null, n, locKyNang(NH), hoSo).map((x) => x.ky_nang).join(','));
  assert.ok(new Set(tapTheoNgay).size > 1, 'thứ tự đổi theo ngày');
  assert.equal(DAO.cauDauTruong(m, null, '2026-10-12', locKyNang(NH), hoSo).map((x) => x.ky_nang).join(','), tapTheoNgay[0], 'cố định trong một ngày');
  // Bé mới ở Bài 7 (đấu trường mở nhờ phụ huynh): vẫn đủ ít nhất 4 kỹ năng, lấy các bài gần nhất
  const it = DAO.cauDauTruong(m, null, '2026-10-12', locKyNang(NH), { lop: 2, bai_dang_hoc: 7 });
  assert.ok(it.length >= 4, 'ít nhất 4 kỹ năng: ' + it.length);
  // Lớp 3 hoặc phụ huynh mở khóa: không lọc theo bài
  const lop3 = DAO.cauDauTruong(DAO.man('dt2'), null, '2026-10-12', locKyNang(NH), { lop: 3, bai_dang_hoc: 1 });
  assert.equal(lop3.length, 10);
});

test('ngân hàng câu: bài toán thêm, bớt (Bài 9) chỉ trừ không qua 10; nhiều hơn, ít hơn (Bài 13) vẫn có trừ qua 10', () => {
  const { NH, DAO } = moi();
  const rng = NH.taoRng(909);
  let tru = 0;
  for (let i = 0; i < 2000; i++) {
    const q = NH.taoCau('toan-them-bot', null, rng, {});
    const c = q.cau_truc;
    if (c.phep !== '-') continue;
    tru++;
    const [a, b] = c.so;
    assert.ok(a === 10 || b % 10 <= a % 10, 'trừ qua 10 ở Bài 9: ' + a + ' - ' + b);
  }
  assert.ok(tru > 400, 'vẫn có nhiều phép trừ: ' + tru);
  let quaMuoi = 0;
  for (let i = 0; i < 400; i++) {
    const c = NH.taoCau('toan-nhieu-it', null, rng, {}).cau_truc;
    if (c.phep === '-' && c.so[0] !== 10 && c.so[1] % 10 > c.so[0] % 10) quaMuoi++;
  }
  assert.ok(quaMuoi > 0, 'Bài 13 vẫn luyện trừ qua 10');
  assert.equal(DAO.man('v4-m6').bai_dau, 23, 'bài toán có lời văn vùng 4 có trừ có nhớ: mở từ Bài 23');
});

test('nhật ký: dọn nhật ký gốc cũ xóa theo khoảng mã, giữ các sự kiện từ 0 giờ của ngày giữ lại xa nhất', async () => {
  const { NK, dh } = moi();
  const ngay = 86400000;
  const goc = dh.t;
  // Đồng hồ đi tới dần (mã ULID tăng theo thời gian): sự kiện ở 150, 121, 120 và 10 ngày trước (giờ máy của kiểm thử là UTC)
  dh.t = goc - 150 * ngay;
  await NK.khoiDong({ khongDungIndexedDB: true });
  NK.datBe('be_DONDEP01');
  [150, 121, 120, 10].forEach((d) => {
    dh.t = goc - d * ngay;
    NK.ghi('thao_tac', { kieu: 'cham', ngay_truoc: d });
  });
  dh.t = goc;
  await NK.xa();
  const dem = (ds, d) => ds.filter((e) => e.du_lieu && e.du_lieu.ngay_truoc === d).length;
  const truoc = await NK.docCuaBe('be_DONDEP01');
  assert.deepEqual([dem(truoc, 150), dem(truoc, 121), dem(truoc, 120), dem(truoc, 10)], [1, 1, 1, 1]);
  const n = await NK.donNhatKyCu();
  const sau = await NK.docCuaBe('be_DONDEP01');
  assert.ok(n >= 2, 'đã xóa các sự kiện cũ hơn 120 ngày: ' + n);
  assert.deepEqual([dem(sau, 150), dem(sau, 121), dem(sau, 120), dem(sau, 10)], [0, 0, 1, 1]);
  assert.ok(sau.every((e) => e.luc.slice(0, 10) >= NK.ngayDiaPhuong(goc - 120 * ngay)), 'không còn sự kiện nào cũ hơn mốc');
});
