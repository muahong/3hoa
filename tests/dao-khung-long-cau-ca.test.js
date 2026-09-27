'use strict';
/* Đảo Khủng Long: kiểm thử Câu Cá Thống Kê (js/cau-thong-ke.js, js/cau-ca.js), không cần trình duyệt.
   - Ngân hàng câu kiem-dem (C2.1), bieu-do-tranh (C2.2), kha-nang (C2.3), uoc-luong-chuc (2.7): đáp án đúng, đúng phạm vi
     SGK, mã câu ổn định, nhiễu mang đúng mã lỗi theo công thức, gợi ý 3 cấp, hình SVG tự chứa.
   - Công thức mã lỗi viết tay: dem-sot, doc-nham-hang, nham-hon-kem, sot-loai, nham-nhieu-it, nham-kha-nang, dem-nhom.
   - Ghép nhiều câu vào một lượt chơi (một hồ cá, một hộp bóng), câu quay lại mở lượt mới.
   - Phát lại một ván qua VanChoi + NhatKy: chuỗi sự kiện, lược đồ v1, tóm tắt câu.
   - Mô-đun game và bài học 30 giây nạp được, không có dấu gạch dài. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadGame, ROOT } = require('./lib/load.js');
const { validate } = require('./lib/schema-lite.js');

const FILES = ['js/nhat-ky.js', 'js/ngan-hang.js', 'js/cau-so-sanh.js', 'js/cau-do-luong.js', 'js/cau-tien.js', 'js/cau-thong-ke.js', 'js/cau-hinh-hoc.js', 'js/cau-thoi-gian.js', 'js/hoc-tap.js', 'js/dao.js', 'js/ho-so.js', 'js/van-choi.js'];
const J = (x) => (x === undefined ? x : JSON.parse(JSON.stringify(x)));
const deq = (a, b, m) => assert.deepEqual(J(a), J(b), m);
const SCHEMA = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/du-an-toan-2-3/spec/06-su-kien-v1.schema.json'), 'utf8'));
const KY = ['kiem-dem', 'bieu-do-tranh', 'kha-nang', 'uoc-luong-chuc'];
const MA_CAU = /^([BC]?2\.\d+)\|[a-z0-9-]+\|[a-z0-9_:,.+-]+$/;
const GACH_DAI = String.fromCharCode(0x2014);
const coGach = (t) => String(t).indexOf(GACH_DAI) >= 0;

function moi(opts) {
  const w = loadGame('dao-khung-long', FILES, opts);
  const dh = { t: Date.UTC(2026, 9, 12, 12, 4, 0), p: 1000 };
  w.NhatKy.caiDongHo({ now: () => dh.t, perf: () => dh.p });
  dh.toi = (ms) => { dh.t += ms; dh.p += ms; };
  return { w, dh, NK: w.NhatKy, NH: w.NganHang, HT: w.HocTap, DAO: w.Dao, CTK: w.CauThongKe };
}

function kiemLuocDo(evs) {
  const loi = [];
  evs.forEach((e, i) => { validate(SCHEMA, e).forEach((m) => loi.push('#' + i + ' ' + e.loai + ' ' + m)); });
  return loi;
}

/** SVG tự chứa: có viewBox, không script, không tham chiếu ngoài, không id (tránh trùng khi nhiều hình trên trang). */
function kiemSvg(s, ten) {
  assert.equal(typeof s, 'string', ten);
  assert.match(s, /^<svg [^>]*viewBox="0 0 \d+(\.\d+)? \d+(\.\d+)?"/, ten + ': thiếu viewBox');
  assert.match(s, /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/, ten);
  assert.ok(s.endsWith('</svg>'), ten);
  assert.ok(!/<script|href=|url\(|\son[a-z]+=|\sid="/i.test(s), ten + ': có script, tham chiếu ngoài hoặc id');
  assert.ok(!coGach(s), ten + ': có dấu gạch dài');
  assert.equal((s.match(/<svg/g) || []).length, (s.match(/<\/svg>/g) || []).length, ten + ': thẻ svg không cân');
}

/* ---------------- Đăng ký ---------------- */

test('câu cá: đăng ký 4 kỹ năng, 4 loại câu và 6 mã lỗi mới', () => {
  const { NH } = moi();
  deq(KY.map((k) => NH.KY_NANG[k] && NH.KY_NANG[k].noi_dung), ['C2.1', 'C2.2', 'C2.3', '2.7']);
  deq(KY.map((k) => NH.loaiKyNang(k)), ['kiem_dem', 'bieu_do', 'kha_nang', 'uoc_luong']);
  KY.forEach((k) => { assert.equal(NH.KY_NANG[k].kieu, 'K3'); assert.ok(NH.KY_NANG[k].giay > 0); });
  ['kiem_dem', 'bieu_do', 'kha_nang', 'uoc_luong'].forEach((l) => assert.ok(NH.coLoai(l), l));
  for (const m of ['dem-sot', 'doc-nham-hang', 'nham-hon-kem', 'sot-loai', 'nham-nhieu-it', 'nham-kha-nang', 'dem-nhom']) {
    const l = NH.LOI[m];
    assert.ok(l && l.be && l.mo_ta && l.ngan, m);
    assert.ok(!coGach(l.be + l.mo_ta + l.ngan), m);
  }
});

/* ---------------- 250 câu mỗi kỹ năng ---------------- */

function kiemSoLieu(ct) {
  const tong = ct.so.reduce((a, b) => a + b, 0);
  assert.equal(new Set(ct.ten).size, ct.ten.length);
  ct.ten.forEach((k) => assert.ok(['vang', 'xanh', 'do', 'cua'].includes(k), k));
  assert.ok(ct.ten.length === 3 || ct.ten.length === 4);
  assert.ok(new Set(ct.so).size >= ct.ten.length - 1, 'nhiều nhất một cặp loại bằng nhau ' + JSON.stringify(ct.so));
  if (ct.loai === 'kiem_dem') { assert.ok(tong <= 18, 'hồ kiểm đếm tối đa 18 con'); ct.so.forEach((x) => assert.ok(x >= 2 && x <= 8)); }
  else { assert.ok(tong <= 26, 'biểu đồ tối đa 26 hình'); ct.so.forEach((x) => assert.ok(x >= 2 && x <= 10)); }
  if (ct.hoi === 'nhieu') assert.equal(ct.so.filter((x) => x === Math.max(...ct.so)).length, 1);
  if (ct.hoi === 'it') assert.equal(ct.so.filter((x) => x === Math.min(...ct.so)).length, 1);
  if (ct.hoi === 'hon') assert.ok(ct.so[ct.a] > ct.so[ct.b]);
  if (ct.hoi === 'kem') assert.ok(ct.so[ct.a] < ct.so[ct.b]);
  if (ct.hoi === 'bang') { assert.equal(ct.ten.length, 4); assert.equal(ct.so.filter((x) => x === ct.so[ct.a]).length, 2); assert.equal(new Set(ct.so).size, 3); }
  if (ct.hoi === 'dem' || ct.hoi === 'bang') assert.ok(ct.a >= 0 && ct.a < ct.ten.length);
  assert.ok(Number.isInteger(ct.hg) && ct.hg >= 1);
}

for (const kn of KY) {
  test('câu cá: ' + kn + ' sinh 250 câu đúng đáp án, đúng phạm vi, nhiễu mang mã lỗi, gợi ý 3 cấp, hình SVG', () => {
    const { NH } = moi();
    const rng = NH.taoRng(4000 + KY.indexOf(kn));
    const dem = { dap_an: {}, hoi: {}, viTri: {} };
    for (let i = 0; i < 250; i++) {
      const ct = NH.sinh(kn, rng);
      const q = NH.taoCau(kn, ct, rng, { dang: 'chon_dap_an' });
      const d = q.dap_an;
      deq(NH.nhanBietLoi(ct, d), [], q.ma_cau);
      assert.match(q.ma_cau, MA_CAU, q.ma_cau);
      assert.equal(q.ma_cau, NH.maCau(kn, J(ct)), 'mã câu ổn định');
      assert.ok(q.de && !coGach(JSON.stringify(q)), q.ma_cau);
      assert.equal(q.goi_y.length, 3);
      q.goi_y.forEach((g) => assert.ok(typeof g === 'string' && g.length > 5));
      assert.ok(q.loi_giai.buoc.length >= 2 && q.ket_luan);
      kiemSvg(q.hinh, q.ma_cau);
      kiemSvg(q.loi_giai.html, q.ma_cau + ' lời giải');
      // Lựa chọn: 3 hoặc 4, khác nhau, đúng một đáp án, nhiễu mang đúng mã lỗi, ít nhất một lỗi có tên
      const lc = q.lua_chon;
      assert.ok(lc.length === 3 || lc.length === 4, q.ma_cau + ' ' + lc.length);
      assert.equal(new Set(lc.map((x) => String(x.gia_tri))).size, lc.length, 'lựa chọn trùng ' + q.ma_cau);
      assert.equal(lc.filter((x) => x.gia_tri === d).length, 1);
      const nhieu = lc.filter((x) => x.gia_tri !== d);
      nhieu.forEach((x) => {
        deq(x.loi, NH.nhanBietLoi(ct, x.gia_tri), q.ma_cau + ' ' + x.gia_tri);
        assert.ok(x.loi.length > 0);
        assert.ok(NH.veLuaChon(ct, x.gia_tri).nhan);
      });
      assert.ok(nhieu.some((x) => x.loi.some((m) => m !== 'khac')), 'cần ít nhất một nhiễu có tên lỗi: ' + q.ma_cau + ' ' + JSON.stringify(lc));
      // Dạng gõ số (game) không có lựa chọn
      const qs = NH.taoCau(kn, ct, NH.taoRng(1), { dang: 'nhap_so' });
      assert.equal(qs.lua_chon, undefined);
      // Phạm vi theo SGK
      if (ct.loai === 'kiem_dem' || ct.loai === 'bieu_do') {
        kiemSoLieu(ct);
        dem.hoi[ct.hoi] = (dem.hoi[ct.hoi] || 0) + 1;
        if (typeof d === 'number') { assert.ok(Number.isInteger(d) && d >= 1 && d <= 26, q.ma_cau); nhieu.forEach((x) => assert.ok(x.gia_tri >= 1 && x.gia_tri <= 40)); }
        else assert.ok(ct.ten.includes(d));
      } else if (ct.loai === 'kha_nang') {
        const T = ct.so.reduce((a, b) => a + b, 0);
        assert.ok(T >= 1 && T <= 6, 'tối đa 6 quả');
        if (ct.lay === 2) assert.ok(T >= 3);
        assert.ok(['chac_chan', 'co_the', 'khong_the'].includes(d));
        assert.ok(['bong', 'ca'].includes(ct.vat));
        deq(ct.mau.slice().sort((a, b) => ['xanh', 'do', 'vang'].indexOf(a) - ['xanh', 'do', 'vang'].indexOf(b)), ct.mau, 'màu theo thứ tự cố định để mã câu ổn định');
        dem.dap_an[d] = (dem.dap_an[d] || 0) + 1;
      } else {
        assert.ok(ct.n >= 20 && ct.n <= 60, 'đàn 20 đến 60');
        assert.ok(Math.abs(ct.n - d) <= 3 && d % 10 === 0, '03a: chỉ số cách số tròn chục không quá 3');
        nhieu.forEach((x) => assert.ok(x.gia_tri >= 10 && x.gia_tri <= 70 && x.gia_tri % 10 === 0));
        const sx = lc.map((x) => x.gia_tri).sort((a, b) => a - b);
        const vt = sx.indexOf(d);
        dem.viTri[vt] = (dem.viTri[vt] || 0) + 1;
        assert.ok(sx.every((v, j) => j === 0 || v - sx[j - 1] === 10), 'ba mức liền nhau ' + sx);
      }
    }
    if (kn === 'kha-nang') ['chac_chan', 'co_the', 'khong_the'].forEach((k) => assert.ok(dem.dap_an[k] > 50, 'ba khả năng đều nhau ' + JSON.stringify(dem.dap_an)));
    if (kn === 'uoc-luong-chuc') [0, 1, 2].forEach((k) => assert.ok(dem.viTri[k] > 30, 'đáp án đúng không luôn ở giữa ' + JSON.stringify(dem.viTri)));
    if (kn === 'kiem-dem') ['dem', 'nhieu', 'it', 'tong'].forEach((h) => assert.ok(dem.hoi[h] > 10, h));
    if (kn === 'bieu-do-tranh') ['dem', 'nhieu', 'it', 'hon', 'kem', 'tong', 'bang'].forEach((h) => assert.ok(dem.hoi[h] > 8, h + ' ' + JSON.stringify(dem.hoi)));
  });
}

test('câu cá: cùng hạt giống thì cùng danh sách câu; màn giữ cach của mục câu', () => {
  const { NH, DAO } = moi();
  const m = DAO.man('v10-m2');
  const a = NH.lapDanhSach(m, NH.taoRng(77), {}), b = NH.lapDanhSach(m, NH.taoRng(77), {});
  deq(a, b);
  assert.equal(a.length, m.so_cau);
  const muc = { ky_nang: 'bieu-do-tranh', cach: ['hon', 'kem'] };
  const rng = NH.taoRng(3);
  for (let i = 0; i < 40; i++) assert.ok(['hon', 'kem'].includes(NH.sinh('bieu-do-tranh', rng, muc).hoi));
  for (let i = 0; i < 20; i++) assert.equal(NH.sinh('kha-nang', rng, { cach: ['lay2'] }).lay, 2);
});

/* ---------------- Công thức lỗi viết tay ---------------- */

test('câu cá: mã lỗi kiểm đếm, biểu đồ tranh theo công thức trên đáp án của bé', () => {
  const { NH } = moi();
  const L = (ct, v) => J(NH.nhanBietLoi(ct, v));
  const kd = (hoi, a, so, ten) => ({ loai: 'kiem_dem', hoi: hoi, a: a, ten: ten || ['vang', 'xanh', 'do'], so: so || [7, 5, 8], hg: 3 });
  // Có mấy con cá vàng? (7)
  const dem = kd('dem', 0);
  deq(L(dem, 7), []);
  deq(L(dem, '7'), [], 'chuỗi số từ bàn phím');
  deq(L(dem, 8), ['doc-nham-hang', 'dem-sot'], 'bằng số cá đỏ, lại lệch 1');
  deq(L(dem, 5), ['doc-nham-hang', 'dem-sot']);
  deq(L(dem, 6), ['dem-sot']);
  deq(L(dem, 9), ['dem-sot']);
  deq(L(dem, 12), ['khac']);
  deq(L(dem, 'abc'), ['khac']);
  // Có tất cả bao nhiêu con? (20): quên một loại, đếm sót
  const tong = kd('tong');
  deq(L(tong, 20), []);
  deq(L(tong, 13), ['sot-loai']);
  deq(L(tong, 15), ['sot-loai']);
  deq(L(tong, 12), ['sot-loai']);
  deq(L(tong, 19), ['dem-sot']);
  deq(L(tong, 22), ['dem-sot']);
  deq(L(tong, 30), ['khac']);
  // Loại nào nhiều nhất (cá đỏ 8), ít nhất (cá xanh 5)
  const nhieu = kd('nhieu');
  assert.equal(NH.tinh(nhieu), 'do');
  deq(L(nhieu, 'vang'), ['dem-sot']);
  deq(L(nhieu, 'xanh'), ['nham-nhieu-it']);
  deq(L(nhieu, 'cua'), ['khac']);
  const it = kd('it');
  assert.equal(NH.tinh(it), 'xanh');
  deq(L(it, 'do'), ['nham-nhieu-it']);
  deq(L(it, 'vang'), ['dem-sot']);
  // Hơn, kém mấy con (biểu đồ): 9 cá vàng, 2 cá xanh, 5 cá đỏ; số cá vàng nhiều hơn số cá xanh 7 con
  const hon = { loai: 'bieu_do', hoi: 'hon', a: 0, b: 1, ten: ['vang', 'xanh', 'do'], so: [9, 2, 5], hg: 1 };
  deq(L(hon, 7), []);
  deq(L(hon, 9), ['nham-hon-kem', 'dem-sot'], 'trả lời số cá vàng (cũng lệch 2 so với đáp án: ghi cả hai mã như 03a mục 3.3)');
  deq(L(hon, 2), ['nham-hon-kem'], 'trả lời số cá xanh');
  deq(L(hon, 11), ['nham-hon-kem'], 'cộng thay vì trừ');
  deq(L(hon, 4), ['doc-nham-hang'], 'so nhầm hàng cá vàng với hàng cá đỏ');
  deq(L(hon, 3), ['doc-nham-hang'], 'so nhầm hàng cá xanh với hàng cá đỏ');
  deq(L(hon, 8), ['dem-sot']);
  deq(L(hon, 15), ['khac']);
  const kem = Object.assign({}, hon, { hoi: 'kem', a: 1, b: 0 });
  deq(L(kem, 7), []);
  deq(L(kem, 11), ['nham-hon-kem']);
  // Số cá vàng bằng số con của loại nào? (cá đỏ)
  const bang = { loai: 'bieu_do', hoi: 'bang', a: 0, ten: ['vang', 'xanh', 'do', 'cua'], so: [6, 4, 6, 3], hg: 1 };
  assert.equal(NH.tinh(bang), 'do');
  deq(L(bang, 'xanh'), ['dem-sot']);
  deq(L(bang, 'cua'), ['khac']);
  deq(L(bang, 'vang'), ['khac']);
  // Lời game nói với bé gọi đúng loại
  assert.equal(NH.loiNoiVoiBe(dem, 8, ['doc-nham-hang', 'dem-sot']), 'Đó là số cá đỏ rồi');
  assert.equal(NH.loiNoiVoiBe(Object.assign({}, dem, { loai: 'bieu_do' }), 8, ['doc-nham-hang']), 'Đó là số con ở hàng cá đỏ rồi');
  assert.equal(NH.loiNoiVoiBe(tong, 13, ['sot-loai']), 'Con quên cộng số cá vàng rồi');
  assert.match(NH.loiNoiVoiBe(hon, 11, ['nham-hon-kem']), /lấy số lớn trừ số bé/);
});

test('câu cá: đề, kết luận theo cách nói SGK Bài 64, 65', () => {
  const { NH } = moi();
  const ct = { loai: 'bieu_do', hoi: 'hon', a: 0, b: 2, ten: ['vang', 'xanh', 'do'], so: [8, 5, 6], hg: 2 };
  assert.equal(NH.deHien(ct), 'Số cá vàng nhiều hơn số cá đỏ mấy con?');
  assert.equal(NH.ketLuan(ct), 'Vậy số cá vàng nhiều hơn số cá đỏ 2 con.');
  assert.equal(NH.deHien(Object.assign({}, ct, { hoi: 'kem', a: 1, b: 0 })), 'Số cá xanh ít hơn số cá vàng mấy con?');
  assert.equal(NH.deHien(Object.assign({}, ct, { hoi: 'nhieu' })), 'Loại cá nào nhiều nhất?');
  assert.equal(NH.deHien({ loai: 'kiem_dem', hoi: 'it', ten: ['vang', 'cua', 'do'], so: [3, 2, 6], hg: 1 }), 'Con vật nào ít nhất?');
  assert.equal(NH.deHien({ loai: 'kiem_dem', hoi: 'dem', a: 1, ten: ['vang', 'cua', 'do'], so: [3, 2, 6], hg: 1 }), 'Có mấy con cua?');
  assert.equal(NH.deHien({ loai: 'kiem_dem', hoi: 'tong', ten: ['vang', 'xanh', 'do'], so: [3, 2, 6], hg: 1 }), 'Có tất cả bao nhiêu con cá?');
  assert.equal(NH.maCau('bieu-do-tranh', ct), 'C2.2|bieu-do-tranh|hon-vang-do:vang8,xanh5,do6');
  assert.match(NH.veHinh(ct), /Mỗi hình là 1 con/);
  assert.match(NH.loiGiai(ct).buoc.join(' '), /8 − 6 = 2/);
  assert.equal(NH.hienGiaTriCau(ct, 'vang'), 'cá vàng');
  deq(J(NH.veLuaChon(ct, 'cua')).nhan, 'Cua');
});

test('câu cá: chắc chắn, có thể, không thể đúng các ví dụ SGK Bài 66, 74', () => {
  const { NH, CTK } = moi();
  const kn = (vat, lay, su, m, mau, so) => ({ loai: 'kha_nang', vat: vat, lay: lay, su: su, m: m, mau: mau, so: so });
  // Bài 66 Khám phá: Mai 4 bóng xanh, Việt 3 đỏ 1 xanh, Nam 2 vàng 2 đỏ; lấy 1 quả, được bóng xanh
  assert.equal(NH.tinh(kn('bong', 1, 'la', 'xanh', ['xanh'], [4])), 'chac_chan');
  assert.equal(NH.tinh(kn('bong', 1, 'la', 'xanh', ['xanh', 'do'], [1, 3])), 'co_the');
  assert.equal(NH.tinh(kn('bong', 1, 'la', 'xanh', ['do', 'vang'], [2, 2])), 'khong_the');
  // Bài 74 bài 3: 2 bóng xanh, 1 bóng đỏ, lấy 2 quả
  const hop = ['xanh', 'do'], so = [2, 1];
  assert.equal(NH.tinh(kn('bong', 2, 'ca_hai', 'xanh', hop, so)), 'co_the');
  assert.equal(NH.tinh(kn('bong', 2, 'ca_hai', 'do', hop, so)), 'khong_the');
  assert.equal(NH.tinh(kn('bong', 2, 'it_nhat', 'xanh', hop, so)), 'chac_chan');
  assert.equal(NH.tinh(kn('bong', 2, 'it_nhat', 'vang', hop, so)), 'khong_the');
  const ct = kn('bong', 1, 'la', 'xanh', ['xanh', 'do'], [1, 3]);
  deq(NH.nhanBietLoi(ct, 'co_the'), []);
  deq(NH.nhanBietLoi(ct, 'chac_chan'), ['nham-kha-nang']);
  deq(NH.nhanBietLoi(ct, 'khong_the'), ['nham-kha-nang']);
  deq(NH.nhanBietLoi(ct, 'hay_la'), ['khac']);
  assert.equal(NH.deHien(ct), 'Lấy ra 1 quả, được bóng xanh. Chắc chắn, có thể hay không thể?');
  assert.equal(NH.ketLuan(ct), 'Vậy Gai Long có thể lấy được bóng xanh.');
  assert.equal(NH.maCau('kha-nang', ct), 'C2.3|kha-nang|bong-lay1-la-xanh:xanh1,do3');
  assert.equal(NH.loiNoiVoiBe(ct, 'chac_chan', ['nham-kha-nang']), 'Có lúc xảy ra, có lúc không thì là có thể');
  assert.match(CTK.lyDoKN(kn('bong', 2, 'it_nhat', 'xanh', hop, so)), /chỉ có 1 quả màu khác/);
  deq(CTK.cauSGK(ct, 'Gai Long'), { truoc: 'Gai Long ', sau: ' lấy được bóng xanh.' });
  assert.equal(CTK.cauSGK(kn('bong', 2, 'ca_hai', 'xanh', hop, so)).sau, 'Cả 2 quả lấy ra đều là bóng xanh.');
  assert.equal(NH.deHien(kn('ca', 1, 'la', 'do', ['xanh', 'do'], [1, 3])), 'Bắt ra 1 con, được cá đỏ. Chắc chắn, có thể hay không thể?');
  // Lấy thử: chắc chắn thì lần nào cũng xảy ra, không thể thì không lần nào, có thể thì có cả hai
  for (let h = 1; h < 40; h++) {
    const a = CTK.bocThu(kn('bong', 1, 'la', 'xanh', ['xanh'], [3]), 3, h);
    assert.ok(a.every((x) => x.xay_ra && x.mau.length === 1));
    const b = CTK.bocThu(kn('bong', 2, 'ca_hai', 'do', hop, so), 3, h);
    assert.ok(b.every((x) => !x.xay_ra && x.mau.length === 2));
    const c = CTK.bocThu(kn('bong', 1, 'la', 'xanh', ['xanh', 'do'], [1, 3]), 3, h);
    assert.ok(c.some((x) => x.xay_ra) && c.some((x) => !x.xay_ra), 'có thể: thấy cả hai kết quả');
  }
});

test('câu cá: ước lượng theo nhóm chục (03a mục 2.7), dem-nhom khi lệch đúng 1 chục', () => {
  const { NH, CTK } = moi();
  const ct = { loai: 'uoc_luong', vat: 'ca', n: 42, hg: 5 };
  assert.equal(NH.tinh(ct), 40);
  deq(NH.nhanBietLoi(ct, 40), []);
  deq(NH.nhanBietLoi(ct, 30), ['dem-nhom']);
  deq(NH.nhanBietLoi(ct, 50), ['dem-nhom']);
  deq(NH.nhanBietLoi(ct, 20), ['khac']);
  deq(NH.nhanBietLoi(ct, 60), ['khac']);
  assert.equal(NH.tinh(Object.assign({}, ct, { n: 38 })), 40);
  assert.equal(NH.tinh(Object.assign({}, ct, { n: 27 })), 30);
  deq(CTK.nhomDan(42), { nhom: [10, 10, 10, 10], le: 2 });
  deq(CTK.nhomDan(38), { nhom: [10, 10, 10, 8], le: 0 });
  assert.equal(NH.hienGiaTriCau(ct, 40), 'khoảng 40');
  assert.equal(NH.maCau('uoc-luong-chuc', ct), '2.7|uoc-luong-chuc|ca:42');
  assert.match(NH.veHinh(ct), /<animate attributeName="opacity"/, 'Đấu Trường, game cũ: đàn cá tự mờ sau 3 giây');
  assert.ok(!/<animate/.test(NH.loiGiai(ct).html), 'lời giải: hình đứng yên, có số 10, 20, 30…');
  assert.match(NH.loiGiai(ct).html, />40</);
  assert.match(NH.loiGiai(ct).buoc.join(' '), /10, 20, 30, 40/);
});

/* ---------------- Ghép câu vào một lượt chơi ---------------- */

test('câu cá: một hồ cá (một hộp bóng) dùng cho nhiều câu, không lặp câu, câu quay lại mở lượt mới', () => {
  const { NH, CTK } = moi();
  const rng = NH.taoRng(9);
  const goc = { loai: 'bieu_do', hoi: 'dem', a: 0, ten: ['vang', 'xanh', 'do'], so: [6, 4, 7], hg: 12 };
  const moiCt = { loai: 'bieu_do', hoi: 'dem', a: 2, ten: ['do', 'cua', 'xanh'], so: [3, 9, 5], hg: 99 };
  for (let i = 0; i < 50; i++) {
    const c = CTK.ghepDuLieu(moiCt, goc, [goc], rng);
    deq([c.ten, c.so, c.hg], [goc.ten, goc.so, goc.hg], 'giữ số liệu của lượt');
    assert.notEqual(NH.deChuanHoa(c), NH.deChuanHoa(goc));
    assert.notEqual(c.hoi, 'dem', 'lượt đã hỏi "mấy con" thì đổi kiểu hỏi');
    deq(NH.nhanBietLoi(c, NH.tinh(c)), []);
  }
  // Không lặp câu đã hỏi ở lượt trước trên cùng số liệu
  const daVan = CTK.cacCauDL('bieu_do', goc.ten, goc.so, goc.hg).filter((c) => c.hoi !== 'tong');
  const c2 = CTK.ghepDuLieu(moiCt, goc, [goc], rng, null, daVan);
  assert.equal(c2.hoi, 'tong');
  assert.equal(CTK.ghepDuLieu(moiCt, goc, [goc], rng, null, CTK.cacCauDL('bieu_do', goc.ten, goc.so, goc.hg)), null);
  // Hỏi "cá vàng nhiều hơn cá xanh mấy con" rồi thì không hỏi lại "cá xanh ít hơn cá vàng mấy con"
  const hon = { loai: 'bieu_do', hoi: 'hon', a: 0, b: 1, ten: goc.ten, so: goc.so, hg: goc.hg };
  for (let i = 0; i < 40; i++) {
    const c = CTK.ghepDuLieu(Object.assign({}, hon, { hoi: 'kem', a: 1, b: 0 }), goc, [hon], rng);
    assert.ok(!((c.hoi === 'hon' || c.hoi === 'kem') && [c.a, c.b].sort().join() === '0,1'), JSON.stringify(c));
  }
  // Hộp bóng: cùng hộp, ưu tiên khả năng chưa gặp trong lượt
  const hop = { loai: 'kha_nang', vat: 'bong', lay: 1, su: 'la', m: 'xanh', mau: ['xanh', 'do'], so: [1, 3] };
  for (let i = 0; i < 30; i++) {
    const c = CTK.ghepDuLieu(Object.assign({}, hop, { mau: ['vang'], so: [4] }), hop, [hop], rng);
    deq([c.mau, c.so, c.lay], [hop.mau, hop.so, hop.lay]);
    assert.notEqual(NH.tinh(c), 'co_the');
  }
  assert.equal(CTK.ghepDuLieu({ loai: 'uoc_luong', vat: 'ca', n: 30, hg: 1 }, { loai: 'uoc_luong', vat: 'ca', n: 40, hg: 2 }, [], rng), null);
  assert.equal(CTK.ghepDuLieu(moiCt, hop, [hop], rng), null, 'khác loại câu thì không ghép');
});

/* ---------------- Phát lại một ván ---------------- */

test('phát lại câu cá: kiểm đếm ghi cau, tha, dem, go_so; lượt 3 câu cùng hồ; câu sai quay lại mở lượt mới; lược đồ v1', async () => {
  const { w, NK, NH, CTK, HT, dh } = moi();
  await NK.khoiDong({ khongDungIndexedDB: true });
  NK.datBe('be_CAUCA001');
  const m = w.Dao.man('v10-m1');
  const van = new w.VanChoi({ nk: NK, game: 'cau-ca', vung: 10, man: m, nguon: 'tu_chon', hatGiong: 2026, soCau: 4 });
  van.batDau({ che_do: 'kiem_dem' });
  const dangCua = (ct) => (CTK.laSo(ct) ? 'nhap_so' : 'chon_dap_an');
  const toiDa = 3;
  let vong = null;
  const daHoi = [];
  const lay = () => {
    const kq = CTK.cauKeTiep(van, vong, toiDa, { dangCua: dangCua, daHoi: daHoi });
    if (!kq) return null;
    const q = kq.q;
    daHoi.push(q.cau_truc);
    if (kq.vongMoi || !vong) vong = { ky_nang: q.ky_nang, ct: q.cau_truc, da: [q.cau_truc], so: 1, loai: q.cau_truc.loai };
    else { vong.da.push(q.cau_truc); vong.so++; }
    q.vongMoi = kq.vongMoi;
    return q;
  };
  const cauCa = (q) => {
    const ct = q.cau_truc;
    const gio = {};
    ct.ten.forEach((k, i) => {
      for (let j = 0; j < ct.so[i]; j++) {
        van.thaoTac('cau', { doi_tuong: 'ca', loai: k, vi_tri: 'ca_' + (j + 1) });
        dh.toi(700);
        if (i === 0 && j === 0) { van.thaoTac('tha', { doi_tuong: 'ca', loai: k, den: 'gio_' + ct.ten[1], dung: false, trong_gio: 0 }); dh.toi(500); }
        gio[k] = (gio[k] || 0) + 1;
        van.thaoTac('tha', { doi_tuong: 'ca', loai: k, den: 'gio_' + k, dung: true, trong_gio: gio[k] });
        dh.toi(600);
      }
    });
  };
  const traLoiDung = (q, extra) => {
    if (q.dang === 'nhap_so') for (const ch of String(q.dap_an)) van.thaoTac('go_so', { gia_tri: +ch, hien_tai: ch });
    else van.thaoTac('chon', { doi_tuong: 'lua_chon', gia_tri: q.dap_an, vi_tri: 'nut_1' });
    return van.traLoi(q.dap_an, extra);
  };
  // Lượt 1: câu 1 hiện ngay khi bắt đầu câu cá
  const q1 = lay();
  assert.ok(q1.vongMoi && q1.cau_truc.loai === 'kiem_dem');
  van.hienCau(q1, q1.lua_chon ? q1.lua_chon.map((x, i) => ({ gia_tri: x.gia_tri, loi: x.loi, vi_tri: 'nut_' + (i + 1) })) : undefined);
  cauCa(q1);
  const giayCauCa = Math.round(NK.msTrongCau() / 100) / 10;
  // Bé chạm đếm vài con rồi trả lời sai lần đầu (nhập số được thử 2 lần), lần sau đúng
  van.thaoTac('dem', { doi_tuong: 'ca', loai: q1.cau_truc.ten[0], gia_tri: 1 });
  let kq1;
  if (q1.dang === 'nhap_so') {
    const sai = q1.dap_an + 1;
    const k = van.traLoi(sai, { nhap: String(sai), giay_cau_ca: giayCauCa });
    assert.ok(k.thuLai && k.loi.includes('dem-sot'), JSON.stringify(k.loi));
    kq1 = traLoiDung(q1, { nhap: String(q1.dap_an) });
    assert.equal(kq1.ketQua, 'dung_lan_2');
  } else {
    kq1 = traLoiDung(q1, { giay_cau_ca: giayCauCa });
    assert.equal(kq1.ketQua, 'dung_ngay');
  }
  // Câu 2, 3: cùng hồ cá, không câu lại
  const q2 = lay();
  assert.ok(!q2.vongMoi);
  deq([q2.cau_truc.ten, q2.cau_truc.so], [q1.cau_truc.ten, q1.cau_truc.so]);
  van.hienCau(q2);
  dh.toi(4000);
  // Sai hẳn: xem màn "Gần đúng rồi" rồi câu quay lại sau 2 câu
  const sai2 = q2.dang === 'nhap_so' ? [q2.dap_an + 2, q2.dap_an + 3] : [q2.lua_chon.find((x) => x.gia_tri !== q2.dap_an).gia_tri];
  let k2;
  sai2.forEach((v) => { k2 = van.traLoi(v, q2.dang === 'nhap_so' ? { nhap: String(v) } : { vi_tri: 'nut_2' }); });
  assert.ok(k2.canPhanHoi && k2.loiGiai && /<svg/.test(k2.loiGiai.html));
  van.phanHoiXem(6, 'choi_tiep');
  van.ketThucCauSai();
  const q3 = lay();
  assert.ok(!q3.vongMoi && vong.so === 3);
  assert.notEqual(q3.ma_cau, q1.ma_cau);
  assert.notEqual(q3.ma_cau, q2.ma_cau);
  van.hienCau(q3);
  dh.toi(3000);
  traLoiDung(q3, {});
  // Câu 4 mở lượt mới (lượt trước đủ 3 câu)
  const q4 = lay();
  assert.ok(q4.vongMoi);
  van.hienCau(q4);
  cauCa(q4);
  traLoiDung(q4, { giay_cau_ca: 20 });
  // Câu 2 quay lại: mở lượt mới với đúng số liệu cũ, bé câu lại
  const q5 = lay();
  assert.ok(q5.vongMoi && q5.on_lai && q5.ma_cau === q2.ma_cau, 'câu sai quay lại với số liệu của chính nó');
  van.hienCau(q5);
  cauCa(q5);
  assert.ok(traLoiDung(q5, {}).dung);
  assert.equal(lay(), null);
  const kq = await van.ketThuc(false, { diem: 500, so_ca: 30 });
  const evs = await NK.docCuaBe('be_CAUCA001');
  deq(kiemLuocDo(evs), []);
  const loai = evs.map((e) => e.loai + (e.du_lieu.kieu ? ':' + e.du_lieu.kieu : ''));
  assert.equal(loai[0], 'phien_bat_dau');
  assert.equal(loai[1], 'van_bat_dau');
  assert.equal(loai[2], 'cau_hien');
  assert.equal(loai[3], 'thao_tac:cau');
  assert.equal(loai[4], 'thao_tac:tha');
  assert.equal(evs[4].du_lieu.dung, false, 'thả nhầm giỏ được ghi');
  assert.ok(evs.every((e) => !e.game || e.game === 'cau-ca'));
  const hien = evs.filter((e) => e.loai === 'cau_hien');
  assert.equal(hien.length, 5);
  hien.forEach((e) => { assert.match(e.du_lieu.ma_cau, MA_CAU); assert.ok(e.du_lieu.cau_truc.ten && e.du_lieu.cau_truc.so, 'số liệu nằm trong cấu trúc câu'); });
  assert.ok(evs.some((e) => e.loai === 'thao_tac' && e.du_lieu.kieu === 'dem'));
  const tl = evs.filter((e) => e.loai === 'tra_loi');
  assert.ok(tl.some((e) => e.du_lieu.giay_cau_ca != null));
  const cau = HT.tomTatCacCau(kq.suKien);
  assert.equal(cau.length, 5);
  assert.equal(cau[1].ket_qua, 'sai');
  assert.ok(cau[4].sua_duoc_cau === cau[1].cau, 'câu quay lại làm đúng thì sửa được');
  assert.equal(kq.dem.suaDuoc, 1);
  void NH;
});

test('phát lại câu cá: hộp bóng ghi chon, boc rồi tra_loi có loai_nham; ước lượng ghi cờ đếm từng con', async () => {
  const { w, NK, NH, CTK, dh } = moi();
  await NK.khoiDong({ khongDungIndexedDB: true });
  NK.datBe('be_CAUCA002');
  const m = { id: 'v10-m3', vung: 10, cau: [{ ky_nang: 'kha-nang' }], so_cau: 2 };
  const van = new w.VanChoi({ nk: NK, game: 'cau-ca', vung: 10, man: m, hatGiong: 31 });
  van.batDau({ che_do: 'hop_bong' });
  const q = van._taoQ({ ky_nang: 'kha-nang', cau_truc: { loai: 'kha_nang', vat: 'bong', lay: 2, su: 'it_nhat', m: 'xanh', mau: ['xanh', 'do'], so: [2, 1] }, dang: 'chon_dap_an' });
  const thuTu = ['chac_chan', 'co_the', 'khong_the'].map((v, i) => ({ gia_tri: v, vi_tri: 'nut_' + (i + 1) }));
  van.hienCau(q, thuTu);
  dh.toi(5200);
  van.thaoTac('chon', { doi_tuong: 'the_kha_nang', gia_tri: 'co_the', vi_tri: 'nut_2' });
  CTK.bocThu(q.cau_truc, 3, 5).forEach((b, i) => { dh.toi(720); van.thaoTac('boc', { doi_tuong: 'hop_bong', gia_tri: b.mau.join('+'), lan: i + 1, xay_ra: b.xay_ra }); });
  const k = van.traLoi('co_the', { vi_tri: 'nut_2', giay_chon: 5.2, loai_nham: 'chac_chan_thanh_co_the' });
  assert.ok(k.canPhanHoi);
  deq(k.loi, ['nham-kha-nang']);
  van.phanHoiXem(5, 'choi_tiep');
  van.ketThucCauSai();
  await van.ketThuc(true, { ly_do: 've_dao' });
  // Ước lượng: 3 giây xem rồi chọn sau 12 giây là cờ đếm, không phải lỗi
  const m2 = w.Dao.man('v8-m7');
  const van2 = new w.VanChoi({ nk: NK, game: 'cau-ca', vung: 8, man: m2, hatGiong: 8 });
  van2.batDau({ che_do: 'uoc_luong' });
  const q2 = van2.cauTiep();
  assert.equal(q2.cau_truc.loai, 'uoc_luong');
  dh.toi(12000);
  van2.thaoTac('chon', { doi_tuong: 'lua_chon', gia_tri: q2.dap_an });
  const k2 = van2.traLoi(q2.dap_an, { giay_chon: 12, dem_tung_con: true });
  assert.ok(k2.dung && k2.ketQua === 'dung_ngay', 'chọn chậm vẫn là đúng');
  await van2.ketThuc(true, { ly_do: 've_dao' });
  const evs = await NK.docCuaBe('be_CAUCA002');
  deq(kiemLuocDo(evs), []);
  const hien = evs.find((e) => e.loai === 'cau_hien');
  deq(hien.du_lieu.lua_chon.map((x) => x.vi_tri), ['nut_1', 'nut_2', 'nut_3']);
  deq(hien.du_lieu.lua_chon.map((x) => x.loi), [[], ['nham-kha-nang'], ['nham-kha-nang']]);
  assert.equal(evs.filter((e) => e.loai === 'thao_tac' && e.du_lieu.kieu === 'boc').length, 3);
  const tl = evs.filter((e) => e.loai === 'tra_loi');
  assert.equal(tl[0].du_lieu.loai_nham, 'chac_chan_thanh_co_the');
  assert.equal(tl[1].du_lieu.dem_tung_con, true);
  assert.equal(tl[1].du_lieu.dung, true);
  void NH;
});

/* ---------------- Màn, mô-đun game, bài học ---------------- */

test('câu cá: màn vùng 10 và v8-m7 dùng đúng kỹ năng, chế độ, đủ câu', () => {
  const { DAO, NH } = moi();
  const che = { 'v10-m1': 'kiem_dem', 'v10-m2': 'bieu_do', 'v10-m3': 'hop_bong', 'v10-cup': 'tron', 'v8-m7': 'uoc_luong' };
  Object.keys(che).forEach((id) => {
    const m = DAO.man(id);
    assert.equal(m.game, 'cau-ca');
    assert.equal(m.che_do, che[id]);
    m.cau.forEach((x) => assert.ok(NH.KY_NANG[x.ky_nang], x.ky_nang));
    for (let h = 1; h <= 5; h++) assert.equal(NH.lapDanhSach(m, NH.taoRng(h), {}).length, m.so_cau, id);
  });
});

test('câu cá: mô-đun game đăng ký cau-ca (khung chung, sân cc-san); 4 bài học 30 giây theo SGK, gắn vào kỹ năng', () => {
  const w = loadGame('dao-khung-long', FILES.concat(['js/phan-hoi.js', 'js/bai-hoc.js', 'js/khung-choi.js', 'js/cau-ca.js']));
  const g = w.DaoTroChoi['cau-ca'];
  assert.ok(g && g.khung === true && g.san === 'cc-san' && typeof g.batDau === 'function' && typeof g._trangThai === 'function');
  assert.equal(typeof w.CauCa.batDau, 'function');
  assert.equal(w.CauCa._trangThai(), null);
  const BH = w.BaiHoc, NH = w.NganHang;
  deq(['kiem-dem', 'bieu-do-tranh', 'kha-nang', 'uoc-luong-chuc'].map((k) => NH.KY_NANG[k].bai_hoc), ['kiem-dem', 'bieu-do-tranh', 'kha-nang', 'uoc-luong']);
  for (const ma of ['kiem-dem', 'bieu-do-tranh', 'kha-nang', 'uoc-luong']) {
    assert.ok(BH.coBai(ma), ma);
    const bai = BH.BAI[ma];
    assert.ok(bai.ten && bai.buoc.length >= 3, ma);
    bai.buoc.forEach((b, i) => {
      assert.ok(b.chu && !coGach(b.chu), ma + ' bước ' + i);
      const h = b.ve();
      assert.match(h, /<svg/, ma + ' bước ' + i + ' có hình');
      assert.ok(!coGach(h));
    });
    const cuoi = bai.buoc[bai.buoc.length - 1];
    assert.ok(cuoi.thu && cuoi.thu.lua_chon.includes(cuoi.thu.dung) && cuoi.thu.dung_noi && cuoi.thu.sai_noi, ma);
  }
  assert.match(BH.BAI['kha-nang'].buoc[0].chu, /Mai chắc chắn lấy được bóng xanh/);
  assert.match(BH.BAI['bieu-do-tranh'].buoc[0].chu, /biểu đồ tranh/);
});

test('câu cá: tệp của nhóm không có dấu gạch dài, không script nội tuyến, CSS chỉ dùng tiền tố cc-', () => {
  const tep = ['dao-khung-long/js/cau-thong-ke.js', 'dao-khung-long/js/cau-ca.js', 'dao-khung-long/css/cau-ca.css', 'tests/dao-khung-long-cau-ca.test.js'];
  tep.forEach((f) => {
    const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.ok(!coGach(s), f + ' có dấu gạch dài');
    assert.ok(!/Math\.random\(\)/.test(s) || f.endsWith('cau-ca.js'), f + ': ngân hàng câu không dùng Math.random');
  });
  const css = fs.readFileSync(path.join(ROOT, 'dao-khung-long/css/cau-ca.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const boChon = css.replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '').replace(/@media[^{]*\{/g, '').match(/[^{}@;]+(?=\{)/g) || [];
  boChon.map((x) => x.trim()).filter((x) => x && !/^(from|to|\d+%)/.test(x) && !/^@/.test(x) && !/^\(/.test(x)).forEach((sel) => {
    sel.split(',').forEach((mot) => assert.match(mot.trim(), /^(\.cc-|\.dang-hoi \.cc-)/, 'bộ chọn không có tiền tố cc-: ' + mot.trim()));
  });
  const ca = fs.readFileSync(path.join(ROOT, 'dao-khung-long/js/cau-ca.js'), 'utf8');
  assert.ok(!/on[a-z]+="/.test(ca), 'không dùng thuộc tính on*=');
  // Math.random chỉ dùng cho hiệu ứng (góc xoay cá trong xô), không cho câu hỏi
  assert.ok((ca.match(/Math\.random\(\)/g) || []).length <= 2);
});
