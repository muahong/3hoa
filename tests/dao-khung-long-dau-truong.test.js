'use strict';
/* Đảo Khủng Long, Đấu Trường (js/dau-truong.js): kiểm thử logic không cần trình duyệt.
   - Luật trận (DauTruong.Tran): đòn, tuyệt chiêu sau 3 câu tự làm đúng liền, nửa đòn khi nhờ gợi ý, trượt không mất gì.
   - Danh sách câu Dao.cauDauTruong lập từ một hồ sơ học tập giả: ưu tiên kỹ năng yếu, bỏ bài toán có lời văn.
   - Mọi kỹ năng của vùng 1 đến 10 đang có trong ngân hàng dựng được câu chọn đáp án vẽ được trên sân đấu.
   - Phát lại một ván qua VanChoi + NhatKy: thắng (bỏ qua câu còn lại, kq.thang), thua (hết câu, trùm còn máu).
   - Cân bằng: số câu đề xuất để bé đúng khoảng 70% thường thắng sau 1 đến 2 lần. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadGame, ROOT } = require('./lib/load.js');
const { validate } = require('./lib/schema-lite.js');

const FILES = ['js/nhat-ky.js', 'js/ngan-hang.js', 'js/cau-so-sanh.js', 'js/cau-do-luong.js', 'js/cau-tien.js', 'js/cau-thong-ke.js', 'js/cau-hinh-hoc.js', 'js/cau-thoi-gian.js', 'js/hoc-tap.js', 'js/dao.js', 'js/ho-so.js', 'js/van-choi.js', 'js/dau-truong.js'];
const J = (x) => (x === undefined ? x : JSON.parse(JSON.stringify(x)));
const deq = (a, b, m) => assert.deepEqual(J(a), J(b), m);
const SCHEMA = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/du-an-toan-2-3/spec/06-su-kien-v1.schema.json'), 'utf8'));

function moi(opts) {
  const w = loadGame('dao-khung-long', FILES, opts);
  const dh = { t: Date.UTC(2026, 9, 12, 12, 4, 0), p: 1000 };
  w.NhatKy.caiDongHo({ now: () => dh.t, perf: () => dh.p });
  dh.toi = (ms) => { dh.t += ms; dh.p += ms; };
  // dau-truong.js tạo sổ đăng ký window.DaoTroChoi; như trong trình duyệt khi mọi mô-đun đã nạp, các thể loại khác cũng có mặt
  Object.keys(w.Dao.GAME_CO).forEach((g) => { if (!w.DaoTroChoi[g]) w.DaoTroChoi[g] = { ten: g, batDau() {} }; });
  return { w, dh, NK: w.NhatKy, NH: w.NganHang, HT: w.HocTap, DAO: w.Dao, DT: w.DauTruong };
}

function kiemLuocDo(evs) {
  const loi = [];
  evs.forEach((e, i) => { validate(SCHEMA, e).forEach((m) => loi.push('#' + i + ' ' + e.loai + ' ' + m)); });
  return loi;
}

/** Lọc kỹ năng như app.js (manDauTruong): có trong ngân hàng và không phải bài toán hai bước. */
const locKyNang = (NH) => (kn) => !!NH.KY_NANG[kn] && NH.loaiKyNang(kn) !== 'loi_van';
/** Màn đấu trường như app.js dựng (manDauTruong): mọi câu ở dạng chọn đáp án. */
function manDauTruong(DAO, NH, id, hocTap, homNay) {
  const m = DAO.man(id);
  const cau = DAO.cauDauTruong(m, hocTap, homNay, locKyNang(NH));
  return Object.assign({}, m, { cau: cau.map((x) => ({ ky_nang: x.ky_nang, ty_le: x.ty_le, dang: 'chon_dap_an' })) });
}

/** Hồ sơ học tập giả: cộng qua 10 đang Cần giúp, trừ có nhớ còn câu nợ, so sánh đã thuộc tới hạn ôn, liền trước liền sau vững. */
const HOC_TAP = {
  be: 'be_DAUTRUONG', ngay: '2026-10-12',
  ky_nang: [
    { ky_nang: 'cong-qua-10', muc: 'dang_luyen', so_cau: 34, can_giup: true, cau_no: 2, tu_lam_dung_14_ngay: 0.42, on_lai_ke_tiep: '2026-10-10' },
    { ky_nang: 'tru-nho-2cs-2cs', muc: 'dang_luyen', so_cau: 22, can_giup: false, cau_no: 1, tu_lam_dung_14_ngay: 0.7, on_lai_ke_tiep: '2026-10-13' },
    { ky_nang: 'so-sanh-100', muc: 'da_thuoc', so_cau: 40, can_giup: false, cau_no: 0, tu_lam_dung_14_ngay: 0.92, on_lai_ke_tiep: '2026-10-11' },
    { ky_nang: 'lien-truoc-sau-100', muc: 'da_thuoc', so_cau: 30, can_giup: false, cau_no: 0, tu_lam_dung_14_ngay: 0.95, on_lai_ke_tiep: '2026-10-25' },
    // Bài toán có lời văn đang yếu nhưng là dạng hai bước: không được vào đấu trường
    { ky_nang: 'toan-them-bot', muc: 'dang_luyen', so_cau: 16, can_giup: true, cau_no: 3, tu_lam_dung_14_ngay: 0.3, on_lai_ke_tiep: '2026-10-09' }
  ],
  cau_no: []
};

/* ---------------- Đăng ký ---------------- */

test('đấu trường: đăng ký thể loại dau-truong trong khung chung, sân dt-san, window.DauTruong', () => {
  const { w, DT } = moi();
  const g = w.DaoTroChoi['dau-truong'];
  assert.ok(g && g.khung === true && g.san === 'dt-san' && typeof g.batDau === 'function' && typeof g._trangThai === 'function');
  assert.equal(typeof DT.batDau, 'function');
  assert.equal(DT._trangThai(), null);
  assert.equal(w.Dao.man('dt1').game, 'dau-truong');
  assert.equal(w.Dao.man('dt2').game, 'dau-truong');
  for (const f of ['dao-khung-long/js/dau-truong.js', 'dao-khung-long/css/dau-truong.css', 'tests/dao-khung-long-dau-truong.test.js']) {
    assert.ok(!fs.readFileSync(path.join(ROOT, f), 'utf8').includes(String.fromCharCode(0x2014)), f + ' không dùng dấu gạch dài');
  }
  // CSS: mọi lớp của Đấu Trường có tiền tố dt-
  const css = fs.readFileSync(path.join(ROOT, 'dao-khung-long/css/dau-truong.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const lop = (css.match(/\.[a-z][a-z0-9-]*/g) || []).filter((x) => !/^\.\d/.test(x));
  const la = lop.filter((x) => !/^\.dt-/.test(x) && !['.hidden', '.co-hinh', '.co-the', '.thang', '.hien', '.it', '.no', '.no-to', '.bay', '.sang', '.dung', '.sai', '.gach', '.xong', '.dai', '.rat-dai', '.to', '.thua', '.tuyet-chieu', '.nut'].includes(x));
  deq([...new Set(la)], [], 'lớp lạ trong dau-truong.css');
});

/* ---------------- Luật trận ---------------- */

test('trận: mỗi câu tự làm đúng một đòn, 3 câu liền là tuyệt chiêu 2 đòn, nhờ gợi ý nửa đòn, trượt không ai mất gì', () => {
  const { DT } = moi();
  const T = DT.Tran;
  const t = T.tao(12);
  assert.equal(T.LUA_DAY, 3);
  let r = T.danh(t, 'dung_ngay');
  deq([r.satThuong, r.tuyetChieu, t.mau, t.lua], [1, false, 11, 1]);
  r = T.danh(t, 'dung_sau_goi_y');
  deq([r.satThuong, r.nuaDon, t.mau, t.lua], [0.5, true, 10.5, 1], 'nửa đòn giữ nguyên sao');
  T.danh(t, 'dung_ngay');
  r = T.danh(t, 'dung_ngay');
  deq([r.satThuong, r.tuyetChieu, t.mau, t.lua, t.soTuyetChieu], [2, true, 7.5, 0, 1], 'sao thứ 3 là tuyệt chiêu rồi tắt sao');
  T.danh(t, 'dung_ngay');
  T.danh(t, 'dung_ngay');
  r = T.danh(t, 'sai');
  deq([r.trung, r.satThuong, t.mau, t.lua, t.soHut], [false, 0, 5.5, 0, 1], 'trượt: tắt sao, trùm không mất máu');
  assert.equal(T.mauHien(t), 6, 'nửa máu làm tròn lên');
  T.danh(t, 'het_gio');
  assert.equal(t.mau, 5.5);
  for (let i = 0; i < 4; i++) T.danh(t, 'dung_ngay');
  assert.equal(t.mau, 0.5);
  r = T.danh(t, 'dung_ngay');
  deq([r.thang, t.mau, r.satThuong], [true, 0, 1], 'máu không âm');
  assert.equal(t.satThuong, 12);
  const kq = T.ketQuaVan(t, 1300);
  deq(kq, { diem: 1300, thang: true, mau_con_lai: 0, mau_boss: 12, so_don_trung: t.soDon, so_tuyet_chieu: t.soTuyetChieu, so_nua_don: 1 });
  assert.equal(T.tieuDe(t), 'Chiến thắng!');
  assert.equal(T.loiKet(t, 'Tam Giác Vương', 'Rex'), 'Rex đã hạ Tam Giác Vương!');
  assert.match(T.dongPhu(t, 'Tam Giác Vương', 1300), /^Hạ Tam Giác Vương: \d+ đòn trúng, \d tuyệt chiêu · 1.300 điểm$/);
  // Thua: còn ít máu là "Suýt thắng!", còn nhiều thì động viên
  const g = T.tao(12);
  for (let i = 0; i < 7; i++) T.danh(g, i % 2 ? 'sai' : 'dung_ngay');
  assert.equal(T.mauHien(g), 8);
  assert.equal(T.tieuDe(g), 'Cố lên nhé!');
  assert.equal(T.loiKet(g, 'Tam Giác Vương'), 'Trùm còn 8 máu, lần sau mình hạ trùm nhé!');
  for (let i = 0; i < 4; i++) T.danh(g, 'dung_ngay');
  assert.equal(T.mauHien(g), 3, 'sao 2, tuyệt chiêu, sao 1, sao 2: 8 - 1 - 2 - 1 - 1');
  assert.ok(T.suytThang(g), '3 máu trên 12 là suýt thắng');
  assert.equal(T.tieuDe(g), 'Suýt thắng!');
  assert.equal(T.loiKet(g, 'Tam Giác Vương'), 'Trùm còn 3 máu, con thử lại nhé!');
  assert.equal(T.dongPhu(g, 'Tam Giác Vương', 900), 'Suýt thắng! Trùm còn 3 máu, con thử lại nhé · 900 điểm');
  assert.equal(T.ketQuaVan(g, 900).thang, false);
  assert.equal(T.tao(16).mauToiDa, 16);
  assert.equal(T.tao(undefined).mauToiDa, 12, 'thiếu máu trùm thì mặc định 12');
});

/* ---------------- Danh sách câu ---------------- */

test('đấu trường: danh sách câu ưu tiên kỹ năng yếu và tới hạn ôn, bỏ bài toán có lời văn, mọi câu chọn đáp án', () => {
  const { w, DAO, NH } = moi();
  const m = DAO.man('dt1');
  const ds = DAO.cauDauTruong(m, HOC_TAP, '2026-10-12', locKyNang(NH));
  const w8 = {};
  ds.forEach((x) => { w8[x.ky_nang] = x.ty_le; });
  assert.ok(ds.length >= 4 && ds.length <= 10, 'tối đa 10 kỹ năng');
  assert.equal(ds[0].ky_nang, 'cong-qua-10', 'kỹ năng Cần giúp đứng đầu');
  assert.equal(w8['cong-qua-10'], 6, '1 + cần giúp 2 + câu nợ 1 + tự làm dưới 80% 1 + tới hạn ôn 1');
  assert.equal(ds[1].ky_nang, 'tru-nho-2cs-2cs');
  assert.equal(w8['tru-nho-2cs-2cs'], 3);
  assert.equal(w8['so-sanh-100'], 2, 'đã thuộc, tới hạn ôn');
  assert.equal(w8['lien-truoc-sau-100'], 1, 'đã thuộc, chưa tới hạn ôn');
  assert.ok(!ds.some((x) => NH.loaiKyNang(x.ky_nang) === 'loi_van'), 'không có bài toán hai bước');
  assert.ok(!('toan-them-bot' in w8));
  ds.filter((x) => !HOC_TAP.ky_nang.some((k) => k.ky_nang === x.ky_nang)).forEach((x) => assert.equal(x.ty_le, 0.3, x.ky_nang + ' chưa học: trọng số nhỏ'));
  for (let i = 1; i < ds.length; i++) assert.ok(ds[i - 1].ty_le >= ds[i].ty_le, 'xếp theo trọng số giảm dần');
  // Chỉ kỹ năng vùng 1 đến 6 cho đấu trường học kì 1
  const vung16 = DAO.VUNG.filter((v) => v.so >= 1 && v.so <= 6).flatMap((v) => DAO.kyNangCuaVung(v));
  ds.forEach((x) => assert.ok(vung16.includes(x.ky_nang), x.ky_nang));
  // Dựng ván như app.js: câu của kỹ năng yếu nhiều hơn hẳn câu của một kỹ năng chưa học
  const man = manDauTruong(DAO, NH, 'dt1', HOC_TAP, '2026-10-12');
  const dem = {};
  let tong = 0;
  for (let hg = 1; hg <= 60; hg++) {
    const van = new w.VanChoi({ nk: w.NhatKy, game: 'dau-truong', vung: 11, man: man, hatGiong: hg, soCau: 10 });
    assert.equal(van.ds.length, 10);
    van.ds.forEach((x) => {
      assert.equal(x.dang, 'chon_dap_an');
      assert.notEqual(NH.loaiKyNang(x.ky_nang), 'loi_van');
      dem[x.ky_nang] = (dem[x.ky_nang] || 0) + 1;
      tong++;
    });
  }
  const chuaHoc = ds.filter((x) => x.ty_le === 0.3).map((x) => dem[x.ky_nang] || 0);
  const tbChuaHoc = chuaHoc.length ? chuaHoc.reduce((a, b) => a + b, 0) / chuaHoc.length : 0;
  assert.ok(dem['cong-qua-10'] / tong > 0.25, 'cộng qua 10 (Cần giúp) chiếm hơn một phần tư số câu: ' + dem['cong-qua-10'] + '/' + tong);
  assert.ok(dem['cong-qua-10'] > 4 * tbChuaHoc, 'kỹ năng yếu nhiều câu hơn hẳn kỹ năng chưa học');
  assert.ok(dem['tru-nho-2cs-2cs'] > dem['lien-truoc-sau-100']);
  // Bé chưa có hồ sơ học tập: vẫn có câu (mọi kỹ năng trọng số bằng nhau)
  const moiBe = DAO.cauDauTruong(DAO.man('dt2'), null, '2026-10-12', locKyNang(NH));
  assert.ok(moiBe.length > 0 && moiBe.every((x) => x.ty_le === 0.3));
  const vung110 = DAO.VUNG.filter((v) => !v.dau_truong).flatMap((v) => DAO.kyNangCuaVung(v));
  moiBe.forEach((x) => assert.ok(vung110.includes(x.ky_nang)));
});

/* ---------------- Vẽ mọi loại câu ---------------- */

test('đấu trường: mọi kỹ năng vùng 1 đến 10 đang có dựng được câu chọn đáp án vẽ được (đề, hình, 2 đến 4 lựa chọn)', () => {
  const { DAO, NH, DT } = moi();
  const kn = [...new Set(DAO.VUNG.filter((v) => !v.dau_truong).flatMap((v) => DAO.kyNangCuaVung(v)))].filter(locKyNang(NH));
  assert.ok(kn.length >= 12, 'có ít nhất các kỹ năng số và phép tính: ' + kn.length);
  const rng = NH.taoRng(2027);
  const thongKe = {};
  for (const k of kn) {
    for (let i = 0; i < 60; i++) {
      const q = NH.taoCau(k, null, rng, { dang: 'chon_dap_an' });
      const ten = k + ' ' + q.ma_cau;
      assert.ok(typeof q.de === 'string' && q.de.length > 0, ten + ': có đề');
      assert.equal(q.goi_y.length, 3, ten + ': 3 cấp gợi ý');
      assert.ok(Array.isArray(q.lua_chon) && q.lua_chon.length >= 2 && q.lua_chon.length <= 4, ten + ': 2 đến 4 lựa chọn, có ' + (q.lua_chon || []).length);
      const gt = q.lua_chon.map((x) => String(x.gia_tri));
      assert.equal(new Set(gt).size, gt.length, ten + ': lựa chọn khác nhau ' + gt.join(' '));
      const dung = q.lua_chon.filter((x) => NH.nhanBietLoi(q.cau_truc, x.gia_tri).length === 0);
      assert.equal(dung.length, 1, ten + ': đúng một đáp án đúng');
      if (q.hinh != null) assert.match(q.hinh, /^\s*</, ten + ': hình là SVG/HTML');
      for (const x of q.lua_chon) {
        const r = DT._veLuaChon(q.cau_truc, x.gia_tri);
        assert.ok(r.nhan && String(r.nhan).length > 0, ten + ': lựa chọn có nhãn');
        assert.match(r.html, /^<span class="dt-lc-(chu|hinh)/, ten);
        assert.ok(!/undefined|NaN|\[object/.test(r.html), ten + ': ' + r.html.slice(0, 80));
        if (!r.hinh) assert.ok(r.html.includes(String(r.nhan).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')), ten + ': chữ đã thoát ký tự');
      }
      thongKe[k] = thongKe[k] || { hinh: 0, luaChonHinh: 0 };
      if (q.hinh) thongKe[k].hinh++;
    }
  }
  // Dấu so sánh hiện đúng chữ và được thoát ký tự
  const ss = DT._veLuaChon({ loai: 'so_sanh', kieu: 'dau', a: 45, b: 54 }, '<');
  deq([ss.nhan, ss.html], ['<', '<span class="dt-lc-chu">&lt;</span>']);
  assert.match(DT._veLuaChon({ loai: 'so_sanh', kieu: 'xep', ds: [26, 60, 62, 66], chieu: 'tang' }, '26,60,62,66').html, /dt-lc-chu dai">26, 60, 62, 66</);
  assert.match(DT._veLuaChon({ loai: 'so_sanh', kieu: 'dau', a: 4, b: 5 }, '<').html, /"dt-lc-chu">/, 'chữ ngắn: cỡ to nhất');
});

test('đấu trường: lựa chọn là hình hoặc đồng hồ (loại câu cắm thêm) vẽ đúng; không có DongHo thì tự vẽ đồng hồ', () => {
  const { w, NH, DT } = moi();
  NH.dangKyLoai('thu_dh', {
    tinh: (ct) => ct.h + ':' + String(ct.m).padStart(2, '0'), de: () => 'Đồng hồ nào chỉ 8 giờ 15 phút?', deChuanHoa: (ct) => 'dh:' + ct.h,
    nhanBietLoi: (ct, v) => (v === '8:15' ? [] : ['khac']), goiY: () => ['a', 'b', 'c'], loiGiai: () => ({ ma: 'x', buoc: [], kq: '8:15' }),
    veLuaChon: (ct, v) => ({ nhan: v, dong_ho: { h: +String(v).split(':')[0], m: +String(v).split(':')[1] } })
  });
  NH.dangKyLoai('thu_hinh', {
    tinh: () => 'tu_giac', de: () => 'Hình nào là hình tứ giác?', deChuanHoa: () => 'h', nhanBietLoi: (ct, v) => (v === 'tu_giac' ? [] : ['khac']),
    goiY: () => ['a', 'b', 'c'], loiGiai: () => ({ ma: 'x', buoc: [], kq: 'tu_giac' }),
    veLuaChon: (ct, v) => ({ nhan: 'Hình ' + v, hinh: '<svg viewBox="0 0 10 10"><rect width="10" height="10"/></svg>' })
  });
  const h = DT._veLuaChon({ loai: 'thu_hinh' }, 'tu_giac');
  assert.ok(h.hinh && h.html.includes('<svg viewBox="0 0 10 10">') && h.nhan === 'Hình tu_giac');
  assert.ok(!h.html.includes('dt-lc-phu'), 'có hình thì mặc định không hiện nhãn (nhãn lộ đáp án)');
  NH.dangKyLoai('thu_buoi', {
    tinh: () => 'sang', de: () => 'Lúc 8 giờ sáng là buổi nào?', deChuanHoa: () => 'b', nhanBietLoi: (ct, v) => (v === 'sang' ? [] : ['khac']),
    goiY: () => ['a', 'b', 'c'], loiGiai: () => ({ ma: 'x', buoc: [], kq: 'sang' }),
    veLuaChon: (ct, v) => ({ nhan: v === 'sang' ? 'Buổi sáng' : 'Buổi <tối>', hinh: '<svg viewBox="0 0 10 10"></svg>', hien_nhan: true })
  });
  assert.ok(DT._veLuaChon({ loai: 'thu_buoi' }, 'sang').html.endsWith('<span class="dt-lc-phu">Buổi sáng</span>'), 'hien_nhan: nhãn dưới hình');
  assert.ok(DT._veLuaChon({ loai: 'thu_buoi' }, 'toi').html.includes('Buổi &lt;tối&gt;'), 'nhãn được thoát ký tự');
  const coDongHo = !!w.DongHo;
  const d1 = DT._veLuaChon({ loai: 'thu_dh', h: 8, m: 15 }, '8:15');
  assert.ok(d1.hinh && /<svg[^>]*viewBox/.test(d1.html), 'đồng hồ là SVG có viewBox' + (coDongHo ? ' (DongHo.svg)' : ''));
  const luu = w.DongHo;
  w.DongHo = undefined;
  const d2 = DT._veLuaChon({ loai: 'thu_dh', h: 8, m: 15 }, '8:15');
  w.DongHo = luu;
  assert.match(d2.html, /<svg viewBox="0 0 120 120"/);
  assert.equal((d2.html.match(/<text /g) || []).length, 12, 'đủ 12 số trên mặt đồng hồ');
  // Kim phút chỉ số 3 (15 phút): đầu kim ở bên phải tâm, ngang tâm
  const kim = [...d2.html.matchAll(/<line x1="60" y1="60" x2="([\d.]+)" y2="([\d.]+)"/g)].map((m) => [+m[1], +m[2]]);
  assert.equal(kim.length, 2);
  assert.ok(kim[1][0] > 95 && Math.abs(kim[1][1] - 60) < 1, 'kim phút chỉ số 3: ' + kim[1]);
  assert.ok(kim[0][0] < 45 && kim[0][1] > 60 && kim[0][1] < 75, 'kim giờ quá số 8 một chút (bên trái, hơi thấp hơn tâm): ' + kim[0]);
});

/* ---------------- Phát lại một ván ---------------- */

/** Chơi một ván đấu trường y như game: mỗi câu ghi chon rồi traLoi; sai thì xem phản hồi; nhờ gợi ý cấp 3 thì gạch một lựa chọn. */
async function choiVan(ctx, o) {
  const { w, NK, NH, DT, dh } = ctx;
  await NK.khoiDong({ khongDungIndexedDB: true });
  NK.datBe(o.be);
  const man = manDauTruong(ctx.DAO, NH, o.man, HOC_TAP, '2026-10-12');
  const van = new w.VanChoi({ nk: NK, game: 'dau-truong', vung: man.vung, man: man, nguon: 'tu_chon', hatGiong: o.hatGiong, soCau: o.soCau });
  const tran = DT.Tran.tao(man.dau_truong.mau_boss);
  van.batDau({ mau_boss: tran.mauToiDa, tuyet_chieu_sau: DT.Tran.LUA_DAY, boss: man.dau_truong.boss });
  let diem = 0;
  let lan = 0;
  const nhatKy = [];
  while (van.conCau() && tran.mau > 0) {
    const q = van.cauTiep();
    const cach = o.kichBan(lan++, q);
    dh.toi(2500);
    let conLai = q.lua_chon.slice();
    if (cach === 'goi_y') {
      for (let cap = 1; cap <= 3; cap++) {
        let them = null;
        if (cap === 3) {
          const sai = conLai.filter((x) => NH.nhanBietLoi(q.cau_truc, x.gia_tri).length);
          if (conLai.length >= 3 && sai.length) { them = { loai_bo: sai[0].gia_tri }; conLai = conLai.filter((x) => x !== sai[0]); }
        }
        assert.equal(van.goiY(them).cap, cap);
        dh.toi(1200);
      }
    }
    const i = conLai.findIndex((x) => (NH.nhanBietLoi(q.cau_truc, x.gia_tri).length === 0) === (cach !== 'sai'));
    const v = conLai[i].gia_tri;
    const viTri = 'lua_chon_' + (q.lua_chon.indexOf(conLai[i]) + 1);
    van.thaoTac('chon', { doi_tuong: 'lua_chon', vi_tri: viTri, gia_tri: v });
    const kq = van.traLoi(v, { vi_tri: viTri, so_lua_chon: q.lua_chon.length });
    if (kq.dung) {
      const r = DT.Tran.danh(tran, kq.ketQua);
      diem += kq.ketQua === 'dung_ngay' ? (r.tuyetChieu ? 200 : 100) : 40;
      nhatKy.push(kq.ketQua + (r.tuyetChieu ? '*' : ''));
    } else {
      assert.ok(kq.canPhanHoi && !kq.thuLai, 'chọn đáp án: sai là xem lời giải ngay');
      DT.Tran.danh(tran, 'sai');
      dh.toi(4000);
      van.phanHoiXem(4, 'choi_tiep');
      van.ketThucCauSai();
      nhatKy.push('sai');
    }
  }
  const them = DT.Tran.ketQuaVan(tran, diem);
  const kq = await van.ketThuc(false, them);
  kq.thang = them.thang;
  kq.dongPhu = DT.Tran.dongPhu(tran, man.dau_truong.ten_boss, diem);
  const evs = await NK.docCuaBe(o.be);
  return { kq, evs, tran, van, nhatKy, man };
}

test('phát lại: ván Đấu Trường Học Kì 1 thắng, bỏ qua câu còn lại, kq.thang, sự kiện đủ và hợp lệ lược đồ', async () => {
  const ctx = moi();
  const kichBan = (i) => (i === 0 ? 'sai' : i === 1 ? 'goi_y' : 'dung');
  const { kq, evs, tran, van, nhatKy } = await choiVan(ctx, { be: 'be_DTTHANG01', man: 'dt1', hatGiong: 4242, soCau: 15, kichBan: kichBan });
  deq(kiemLuocDo(evs), []);
  assert.equal(kq.thang, true);
  assert.equal(tran.mau, 0);
  const vanEv = evs.filter((e) => e.van);
  assert.equal(vanEv[0].loai, 'van_bat_dau');
  deq(J(vanEv[0].du_lieu.do_kho), { mau_boss: 12, tuyet_chieu_sau: 3, boss: 'boss-hk1' });
  assert.equal(vanEv[0].du_lieu.so_cau_du_kien, 15);
  const kt = vanEv.find((e) => e.loai === 'van_ket_thuc').du_lieu;
  deq([kt.thang, kt.mau_con_lai, kt.mau_boss, kt.bo_do], [true, 0, 12, false]);
  assert.equal(kt.so_don_trung, tran.soDon);
  assert.equal(kt.so_tuyet_chieu, tran.soTuyetChieu);
  assert.ok(kt.so_tuyet_chieu >= 2, 'đúng liền nhiều câu thì có tuyệt chiêu');
  assert.equal(kt.so_nua_don, 1);
  assert.ok(van.dem.moi < 15, 'thắng sớm: bỏ qua các câu còn lại (' + van.dem.moi + ' câu mới)');
  assert.ok(van.conCau(), 'vẫn còn câu chưa hỏi');
  assert.equal(kt.sai, 1);
  assert.equal(kt.dung_sau_goi_y, 1);
  // Từng câu: cau_hien (chọn đáp án, 2 đến 4 lựa chọn có đáp án) → chon → tra_loi (cùng giá trị) → cau_ket_thuc
  const hien = vanEv.filter((e) => e.loai === 'cau_hien');
  for (const h of hien) {
    assert.equal(h.du_lieu.dang, 'chon_dap_an');
    assert.ok(h.du_lieu.lua_chon.length >= 2 && h.du_lieu.lua_chon.length <= 4);
    assert.ok(h.du_lieu.lua_chon.some((x) => String(x.gia_tri) === String(h.du_lieu.dap_an)));
    const cua = vanEv.filter((e) => e.cau === h.cau);
    const l = cua.map((e) => (e.loai === 'thao_tac' ? 'tt:' + e.du_lieu.kieu : e.loai));
    assert.equal(l[0], 'cau_hien');
    assert.equal(l[l.length - 1], 'cau_ket_thuc');
    const chon = cua.find((e) => e.loai === 'thao_tac' && e.du_lieu.kieu === 'chon');
    const tl = cua.find((e) => e.loai === 'tra_loi');
    assert.ok(l.indexOf('tt:chon') < l.indexOf('tra_loi'), 'chon ghi trước tra_loi');
    deq([chon.du_lieu.gia_tri, chon.du_lieu.vi_tri], [tl.du_lieu.gia_tri, tl.du_lieu.vi_tri]);
    assert.match(chon.du_lieu.vi_tri, /^lua_chon_[1-4]$/);
    assert.equal(tl.du_lieu.so_lua_chon, h.du_lieu.lua_chon.length);
  }
  // Câu sai: xem lời giải, quay lại sau 2 câu và được sửa
  const cauSai = hien[0];
  assert.ok(vanEv.some((e) => e.cau === cauSai.cau && e.loai === 'phan_hoi_xem'));
  const lai = hien.find((e) => e.du_lieu.on_lai_cua === cauSai.cau);
  assert.ok(lai, 'câu sai quay lại');
  assert.equal(hien.indexOf(lai), 3, 'quay lại sau 2 câu');
  assert.equal(vanEv.find((e) => e.cau === lai.cau && e.loai === 'cau_ket_thuc').du_lieu.sua_duoc_cau, cauSai.cau);
  // Gợi ý: 3 cấp, cấp 3 gạch một lựa chọn sai; câu tính là đúng sau gợi ý (nửa đòn)
  const gy = vanEv.filter((e) => e.loai === 'goi_y');
  deq(gy.map((e) => e.du_lieu.cap), [1, 2, 3]);
  const cauGoiY = hien[1];
  if (cauGoiY.du_lieu.lua_chon.length >= 3) {
    assert.ok('loai_bo' in gy[2].du_lieu, 'cấp 3 gạch bớt một lựa chọn');
    assert.ok(NH_loi(ctx, cauGoiY, gy[2].du_lieu.loai_bo).length > 0, 'lựa chọn bị gạch là lựa chọn sai');
  }
  assert.equal(vanEv.find((e) => e.cau === cauGoiY.cau && e.loai === 'cau_ket_thuc').du_lieu.ket_qua, 'dung_sau_goi_y');
  assert.equal(nhatKy[1], 'dung_sau_goi_y');
  // Tuyệt chiêu rơi đúng vào câu tự làm đúng thứ 3 liên tiếp
  assert.equal(nhatKy[4], 'dung_ngay*', nhatKy.join(' '));
  // Tóm tắt ván, câu tính được từ nhật ký
  const vt = ctx.HT.tomTatVan(kq.suKien, 'Đấu Trường Học Kì 1');
  assert.ok(vt && vt.game === 'dau-truong');
  assert.equal(ctx.HT.tomTatCacCau(kq.suKien).length, hien.length);
  assert.match(kq.dongPhu, /^Hạ Tam Giác Vương: \d+ đòn trúng/);
});

function NH_loi(ctx, hien, v) { return ctx.NH.nhanBietLoi(hien.du_lieu.cau_truc, v); }

test('phát lại: ván Đấu Trường Cuối Năm hết câu mà trùm còn máu là thua (Suýt thắng), thang false', async () => {
  const ctx = moi();
  // Chỉ đúng câu thứ 3, 6, 9…: không đủ 16 máu
  const kichBan = (i) => (i % 3 === 2 ? 'dung' : 'sai');
  const { kq, evs, tran, van } = await choiVan(ctx, { be: 'be_DTTHUA001', man: 'dt2', hatGiong: 77, soCau: 6, kichBan: kichBan });
  deq(kiemLuocDo(evs), []);
  assert.equal(kq.thang, false);
  assert.ok(tran.mau > 0);
  assert.ok(!van.conCau(), 'đã hết câu');
  const kt = evs.find((e) => e.loai === 'van_ket_thuc').du_lieu;
  deq([kt.thang, kt.mau_boss, kt.bo_do], [false, 16, false]);
  assert.equal(kt.mau_con_lai, tran.mau);
  assert.equal(kt.so_tuyet_chieu, 0, 'không đúng liền 3 câu thì không có tuyệt chiêu');
  assert.ok(kt.sai >= 6);
  assert.match(kq.dongPhu, /^(Suýt thắng! Trùm còn \d+ máu, con thử lại nhé|Trùm còn \d+ máu, lần sau mình hạ trùm nhé) · \d+ điểm$/);
  // Mọi câu sai đều có phản hồi và quay lại tối đa 2 lần
  const hien = evs.filter((e) => e.loai === 'cau_hien');
  const theoMa = {};
  hien.forEach((e) => { theoMa[e.du_lieu.ma_cau] = (theoMa[e.du_lieu.ma_cau] || 0) + 1; });
  assert.ok(Object.values(theoMa).every((n) => n <= 3));
  const vungDt2 = ctx.DAO.man('dt2').dau_truong.vung;
  deq(vungDt2, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test('phát lại: bé thoát giữa trận ghi bo_do, không tính thắng', async () => {
  const ctx = moi();
  const { w, NK, NH, DT } = ctx;
  await NK.khoiDong({ khongDungIndexedDB: true });
  NK.datBe('be_DTTHOAT01');
  const man = manDauTruong(ctx.DAO, NH, 'dt1', null, '2026-10-12');
  const van = new w.VanChoi({ nk: NK, game: 'dau-truong', vung: 11, man: man, hatGiong: 5, soCau: 10 });
  const tran = DT.Tran.tao(12);
  van.batDau({ mau_boss: 12 });
  const q = van.cauTiep();
  van.thaoTac('chon', { doi_tuong: 'lua_chon', vi_tri: 'lua_chon_1', gia_tri: q.dap_an });
  DT.Tran.danh(tran, van.traLoi(q.dap_an).ketQua);
  van.cauTiep();
  const kq = await van.ketThuc(true, Object.assign(DT.Tran.ketQuaVan(tran, 100), { ly_do: 've_dao', thang: false }));
  const kt = kq.suKien.find((e) => e.loai === 'van_ket_thuc').du_lieu;
  deq([kt.bo_do, kt.thang, kt.ly_do, kt.mau_con_lai], [true, false, 've_dao', 11]);
  deq(kiemLuocDo(await NK.docCuaBe('be_DTTHOAT01')), []);
});

/* ---------------- Cân bằng ---------------- */

/** Nhật ký giả rất nhẹ cho mô phỏng hàng trăm ván. */
function nkGia() {
  let n = 0;
  return {
    batDauVan: () => 'v', cauHien: () => 'c' + (++n), thaoTac: () => null, goiY: () => null, traLoi: () => null,
    msTrongCau: () => 3000, cauKetThuc: () => null, phanHoiXem: () => null, ketThucVan: () => Promise.resolve([])
  };
}

/** Tỉ lệ thắng một lần của bé đúng p mỗi lượt (câu sai quay lại sau 2 câu, tối đa 2 lần, như VanChoi). */
function tiLeThang(ctx, id, soCau, p, soVan) {
  const { w, NH, DT } = ctx;
  const man = manDauTruong(ctx.DAO, NH, id, null, '2026-10-12');
  let thang = 0;
  for (let hg = 1; hg <= soVan; hg++) {
    const be = NH.taoRng(90000 + hg);
    const van = new w.VanChoi({ nk: nkGia(), game: 'dau-truong', vung: man.vung, man: man, hatGiong: hg, soCau: soCau });
    const tran = DT.Tran.tao(man.dau_truong.mau_boss);
    van.batDau({});
    while (van.conCau() && tran.mau > 0) {
      const q = van.cauTiep();
      const dung = be() < p;
      const v = dung ? q.dap_an : q.lua_chon.find((x) => NH.nhanBietLoi(q.cau_truc, x.gia_tri).length).gia_tri;
      const kq = van.traLoi(v);
      if (kq.dung) DT.Tran.danh(tran, kq.ketQua);
      else { DT.Tran.danh(tran, 'sai'); van.ketThucCauSai(); }
    }
    if (tran.mau <= 0) thang++;
  }
  return thang / soVan;
}

test('cân bằng: bé đúng 70% thắng Đấu Trường sau 1 đến 2 lần với số câu đề xuất (10 câu học kì 1, 14 câu cuối năm)', (t) => {
  const ctx = moi();
  const N = 400;
  const hk1 = tiLeThang(ctx, 'dt1', 10, 0.7, N);
  const cn = tiLeThang(ctx, 'dt2', 14, 0.7, N);
  const hai = (x) => 1 - (1 - x) * (1 - x);
  t.diagnostic('Học kì 1 (12 máu, 10 câu): thắng ' + Math.round(hk1 * 100) + '% mỗi lần, ' + Math.round(hai(hk1) * 100) + '% trong hai lần');
  t.diagnostic('Cuối năm (16 máu, 14 câu): thắng ' + Math.round(cn * 100) + '% mỗi lần, ' + Math.round(hai(cn) * 100) + '% trong hai lần');
  assert.ok(hk1 >= 0.55 && hk1 <= 0.9, 'học kì 1: ' + hk1);
  assert.ok(hai(hk1) >= 0.85);
  assert.ok(cn >= 0.6 && cn <= 0.95, 'cuối năm: ' + cn);
  assert.ok(hai(cn) >= 0.85);
  // Bé đúng 90% gần như luôn thắng ngay; bé đúng 40% thường chưa thắng (trận vẫn là trận)
  assert.ok(tiLeThang(ctx, 'dt1', 10, 0.9, 200) >= 0.95);
  assert.ok(tiLeThang(ctx, 'dt1', 10, 0.4, 200) <= 0.3);
  // Số câu hiện ghi trong dao.js (15 và 20): gần như luôn thắng, không còn là trận đấu (đề xuất đổi, xem báo cáo)
  const cu1 = tiLeThang(ctx, 'dt1', ctx.DAO.man('dt1').so_cau, 0.7, 200);
  const cu2 = tiLeThang(ctx, 'dt2', ctx.DAO.man('dt2').so_cau, 0.7, 200);
  t.diagnostic('Số câu trong dao.js (' + ctx.DAO.man('dt1').so_cau + ', ' + ctx.DAO.man('dt2').so_cau + '): thắng ' + Math.round(cu1 * 100) + '% và ' + Math.round(cu2 * 100) + '% mỗi lần');
});
