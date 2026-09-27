'use strict';
/* Đảo Khủng Long, giai đoạn 3 đến 5: kiểm thử tích hợp cả đảo (không cần trình duyệt).
   - Đủ 12 thể loại và Đấu Trường; cả 10 vùng và 2 đấu trường chơi được; mỗi vùng có ít nhất 2 thể loại.
   - Mọi màn dựng được đủ câu cho dạng của nó; màn của game cũ luôn hỏi được dạng chọn đáp án có đúng một lựa chọn đúng.
   - Mọi kỹ năng có mã nội dung trong 43 mã lớp 2; mọi mã nội dung thuộc đúng một vùng; mã lỗi nào cũng có lời giải nghĩa.
   - Nhiệm vụ hôm nay theo kế hoạch tuần của phụ huynh; màn học kì 2 khóa với bé lớp 2 chưa tới Bài 37. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./lib/load.js');

const FILES = ['js/nhat-ky.js', 'js/ngan-hang.js', 'js/cau-so-sanh.js', 'js/cau-do-luong.js', 'js/cau-tien.js', 'js/cau-thong-ke.js', 'js/cau-hinh-hoc.js',
  'js/cau-thoi-gian.js', 'js/hoc-tap.js', 'js/dao.js', 'js/ho-so.js', 'js/van-choi.js'];
const J = (x) => (x === undefined ? x : JSON.parse(JSON.stringify(x)));

function moi() {
  const w = loadGame('dao-khung-long', FILES);
  return { w, NH: w.NganHang, DAO: w.Dao, HT: w.HocTap };
}

const MUOI_HAI = ['chem-trai-cay', 'ban-thien-thach', 'me-cung', 'thap-xep-hinh', 'xe-tang', 'cuoi-ho', 'dua-xe', 'truyen-tranh', 'xuong-do-luong', 'cho-khung-long', 'cau-ca', 'lat-the'];

test('đảo: đủ 12 thể loại trong các màn, thêm Đấu Trường, Xếp Hình Số, Rừng Hình Khối, Lật Lịch', () => {
  const { DAO } = moi();
  const theLoai = new Set();
  DAO.VUNG.forEach((v) => v.man.forEach((m) => theLoai.add(m.game)));
  for (const g of MUOI_HAI.concat(['dau-truong', 'xep-hinh-so', 'rung-hinh-khoi', 'lat-lich'])) assert.ok(theLoai.has(g), 'thiếu thể loại ' + g);
  for (const g of theLoai) { assert.ok(DAO.GAME_CO[g], g); assert.ok(DAO.TEN_GAME[g], g); }
});

test('đảo: cả 10 vùng và 2 đấu trường chơi được; mỗi vùng có ít nhất 2 thể loại và có kỹ năng để trứng nở', () => {
  const { DAO } = moi();
  const lop3 = { lop: 3, bai_dang_hoc: 75 };
  assert.equal(DAO.VUNG.length, 12);
  for (const v of DAO.VUNG) {
    const tt = DAO.trangThaiVung(v, lop3);
    assert.ok(tt.mo && !tt.sap_co, v.ten);
    const choi = v.man.filter(DAO.choiDuoc);
    assert.ok(choi.length >= 1, v.ten);
    if (v.dau_truong) continue;
    assert.ok(new Set(choi.map((m) => m.game)).size >= 2, v.ten + ' cần ít nhất 2 thể loại');
    assert.ok(DAO.kyNangCuaVung(v).length >= 3, v.ten);
    assert.ok(v.loai && v.ten_loai && v.phu_kien, v.ten);
  }
});

test('ngân hàng: 43 mã nội dung, mỗi mã thuộc đúng một vùng; mọi kỹ năng và mọi mã lỗi có giải nghĩa', () => {
  const { NH, DAO } = moi();
  const ma = Object.keys(NH.NOI_DUNG);
  assert.equal(ma.length, 43);
  const vung = {};
  DAO.VUNG.forEach((v) => v.noi_dung.forEach((x) => { assert.ok(!vung[x], x + ' ở hai vùng'); vung[x] = v.so; }));
  for (const x of ma) assert.ok(vung[x], x + ' chưa thuộc vùng nào');
  for (const kn of NH.THU_TU_KY_NANG) {
    const k = NH.KY_NANG[kn];
    assert.ok(NH.NOI_DUNG[k.noi_dung], kn);
    assert.ok(k.ten && k.giay > 0, kn);
  }
  for (const m of Object.keys(NH.LOI)) assert.ok(NH.LOI[m].be && NH.LOI[m].mo_ta && NH.LOI[m].ngan, m);
});

test('màn: mọi màn dựng được đủ câu, mọi câu đúng với đáp án của nó; câu chọn đáp án có đúng một lựa chọn đúng', () => {
  const { NH, DAO } = moi();
  const rng = NH.taoRng(2027);
  for (const v of DAO.VUNG) {
    for (const m of v.man) {
      if (m.dau_truong) continue;
      for (let lan = 0; lan < 3; lan++) {
        const ds = NH.lapDanhSach(m, rng, {});
        assert.equal(ds.length, m.so_cau, m.id);
        for (const x of ds) {
          const q = NH.taoCau(x.ky_nang, x.cau_truc, rng, { dang: x.dang });
          assert.deepEqual(J(NH.nhanBietLoi(q.cau_truc, q.dap_an, q.dang === 'hai_buoc' ? 2 : undefined)), [], m.id + ' ' + q.ma_cau);
          assert.match(q.ma_cau, /^[0-9BC.]+\|[a-z0-9-]+\|[a-z0-9_:,.+=?-]+$/, m.id + ' ' + q.ma_cau);
          assert.equal(q.goi_y.length, 3, m.id);
          if (q.dang === 'chon_dap_an') {
            const gt = q.lua_chon.map((c) => String(c.gia_tri));
            assert.ok(gt.length >= 2, m.id + ' ' + q.de);
            assert.equal(new Set(gt).size, gt.length, m.id + ' trùng lựa chọn ' + q.de);
            assert.equal(q.lua_chon.filter((c) => !c.loi || !c.loi.length).length, 1, m.id + ' ' + q.de);
          }
        }
      }
    }
  }
});

test('game cũ: màn của sáu game cũ hỏi dạng chọn đáp án (hoặc nhập số, xếp thứ tự đã khai), lựa chọn có chữ hoặc hình để vẽ', () => {
  const { NH, DAO } = moi();
  const rng = NH.taoRng(7);
  const cu = Object.keys(DAO.THU_MUC_GAME_CU);
  let dem = 0;
  for (const v of DAO.VUNG) for (const m of v.man.filter((x) => cu.indexOf(x.game) >= 0)) {
    const ds = NH.lapDanhSach(m, rng, {});
    for (const x of ds) {
      assert.ok(['chon_dap_an', 'nhap_so', 'sap_xep'].indexOf(x.dang) >= 0, m.id + ' dạng ' + x.dang);
      const q = NH.taoCau(x.ky_nang, x.cau_truc, rng, { dang: x.dang });
      if (x.dang === 'chon_dap_an') {
        for (const c of q.lua_chon) {
          const ve = NH.veLuaChon(q.cau_truc, c.gia_tri);
          assert.ok(ve && (String(ve.nhan || '').length || ve.hinh || ve.dong_ho), m.id + ' không vẽ được lựa chọn ' + c.gia_tri);
        }
      }
      if (x.dang === 'sap_xep') assert.ok(Array.isArray(q.cau_truc.ds) && q.cau_truc.ds.length >= 3, m.id);
      dem++;
    }
  }
  assert.ok(dem > 100);
});

test('đấu trường: câu trộn từ kỹ năng các vùng, bỏ bài hai bước, ưu tiên kỹ năng yếu', () => {
  const { NH, DAO } = moi();
  const hocTap = { ky_nang: [
    { ky_nang: 'tru-nho-2cs-2cs', muc: 'dang_luyen', so_cau: 40, can_giup: true, cau_no: 2, tu_lam_dung_14_ngay: 0.5 },
    { ky_nang: 'cong-qua-10', muc: 'da_thuoc', so_cau: 60, tu_lam_dung_14_ngay: 0.95, on_lai_ke_tiep: '2026-10-01' }
  ] };
  for (const id of ['dt1', 'dt2']) {
    const m = DAO.man(id);
    const ds = DAO.cauDauTruong(m, hocTap, '2026-10-12', (kn) => !!NH.KY_NANG[kn] && NH.loaiKyNang(kn) !== 'loi_van');
    assert.ok(ds.length >= 5, id);
    assert.equal(ds[0].ky_nang, 'tru-nho-2cs-2cs');
    assert.ok(ds.every((x) => NH.loaiKyNang(x.ky_nang) !== 'loi_van'), id);
  }
});

test('nhiệm vụ: đi theo kế hoạch tuần của phụ huynh trong những ngày của kế hoạch; ngoài kế hoạch lập như cũ', () => {
  const { DAO } = moi();
  const hoSo = { lop: 2, bai_dang_hoc: 30, ke_hoach_tuan: { tu: '2026-10-12', den: '2026-10-18', muc: [
    { loai: 'luyen_lai', man: 'v4-m8', ky_nang: null, ly_do: 'Sửa lỗi quên mượn' },
    { loai: 'on_nen', man: 'v2-m7', ky_nang: null, ly_do: 'Ôn bảng trừ' },
    { loai: 'hoc_moi', man: 'v6-m3', ky_nang: 'xem-lich', ly_do: 'Bài 30' }
  ] } };
  const nv = J(DAO.lapNhiemVu(hoSo, null, '2026-10-13', {}));
  assert.equal(nv.length, 3);
  assert.deepEqual(nv.map((x) => x.man).sort(), ['v2-m7', 'v4-m8', 'v6-m3']);
  assert.equal(nv.find((x) => x.man === 'v4-m8').ly_do, 'Sửa lỗi quên mượn');
  const ngoai = J(DAO.lapNhiemVu(hoSo, null, '2026-10-25', {}));
  assert.ok(!ngoai.some((x) => x.ly_do === 'Sửa lỗi quên mượn'));
});

test('mở vùng: màn học kì 2 trong vùng học kì 1 khóa với bé lớp 2 chưa tới Bài 37; phụ huynh mở khóa được', () => {
  const { DAO } = moi();
  const m = DAO.man('v3-m5');
  assert.equal(DAO.manMo(m, { lop: 2, bai_dang_hoc: 20 }), false);
  assert.equal(DAO.manMo(m, { lop: 2, bai_dang_hoc: 40 }), true);
  assert.equal(DAO.manMo(m, { lop: 2, bai_dang_hoc: 20, mo_khoa_vung: true }), true);
  assert.equal(DAO.trangThaiVung(DAO.vung(9), { lop: 2, bai_dang_hoc: 20 }).mo, false);
  assert.equal(DAO.trangThaiVung(DAO.vung(9), { lop: 2, bai_dang_hoc: 20, mo_khoa_vung: true }).mo, true);
  assert.equal(DAO.trangThaiVung(DAO.vung(11), { lop: 2, bai_dang_hoc: 10 }).mo, false);
  assert.equal(DAO.trangThaiVung(DAO.vung(11), { lop: 2, bai_dang_hoc: 31 }).mo, true);
  const nv = J(DAO.lapNhiemVu({ lop: 2, bai_dang_hoc: 20 }, null, '2026-10-12', {}));
  assert.ok(nv.every((x) => DAO.man(x.man).bai_dau < 37), 'không giao màn học kì 2');
});

test('bài toán tiền: số từ 1 000 viết cách nhóm ba chữ số như SGK, mã câu giữ số liền', () => {
  const { NH } = moi();
  const q = NH.taoCau('toan-tien', { loai: 'loi_van', mau: 'mua-keo', dang: 'con_lai', phep: '-', so: [1000, 400], nv: ['An', 'Bin'] }, NH.taoRng(1));
  assert.ok(q.de.indexOf('1 000 đồng') >= 0, q.de);
  assert.ok(q.loi_giai.buoc[1].indexOf('1 000 − 400 = 600 (đồng)') === 0, q.loi_giai.buoc[1]);
  assert.equal(q.ma_cau, 'B2.14|toan-tien|mua-keo:1000-400');
});
