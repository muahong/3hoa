'use strict';
/* Đảo Khủng Long, vùng 6 Phố Đồng Hồ: câu hỏi thời gian (cau-thoi-gian.js) và game Lật Lịch (lat-lich.js).
   - Ba kỹ năng xem-gio (B2.11), ngay-gio (B2.12), xem-lich (B2.13): đáp án đúng, đúng phạm vi SGK lớp 2, mã câu ổn định,
     nhiễu khác nhau mang mã lỗi đúng công thức, gợi ý 3 cấp, hình SVG hợp lệ, lựa chọn vẽ được cho game cũ.
   - Công thức lỗi viết tay: nham-kim, lech-gio, doc-so-phut, nham-buoi, nham-thu, dem-ngay-lech, nham-thang, dem-lech.
   - Số liệu SGK: bảng buổi Bài 29, tờ lịch tháng 11, 12, 5, 6 của Bài 30, 31.
   - Phát lại một ván Lật Lịch qua VanChoi + NhatKy (thử 2 lần rồi màn lời giải), mọi sự kiện hợp lệ lược đồ v1.
   - Bài học 30 giây xem-dong-ho, ngay-gio, xem-lich. */
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

function moi(opts) {
  const w = loadGame('dao-khung-long', FILES, opts);
  const dh = { t: Date.UTC(2026, 9, 12, 12, 4, 0), p: 1000 };
  w.NhatKy.caiDongHo({ now: () => dh.t, perf: () => dh.p });
  dh.toi = (ms) => { dh.t += ms; dh.p += ms; };
  return { w, dh, NK: w.NhatKy, NH: w.NganHang, HT: w.HocTap, DAO: w.Dao, CTG: w.CauThoiGian, DH: w.DongHo };
}
function kiemLuocDo(evs) {
  const loi = [];
  evs.forEach((e, i) => { validate(SCHEMA, e).forEach((m) => loi.push('#' + i + ' ' + e.loai + ' ' + m)); });
  return loi;
}
/** Chữ để giọng đọc: không có "số:số" (AmThanh đọc thành "chia") và không có gạch dài. */
function docDuoc(t) { return !/\d\s*:\s*\d/.test(t) && !/\u2014/.test(t); }
function svgHopLe(s) {
  assert.match(s, /^<svg [^>]*viewBox="[-\d. ]+"/);
  assert.match(s, /<\/svg>$/);
  assert.doesNotMatch(s, /<script|\son[a-z]+=|href=|url\((?!#)/i);
  assert.ok(!/\u2014/.test(s));
}

const KY = ['xem-gio', 'ngay-gio', 'xem-lich'];
const MA = /^B2\.1[123]\|(xem-gio|ngay-gio|xem-lich)\|[a-z0-9_:,.+-]+$/;

/* ---------------- Ngân hàng câu ---------------- */

test('ba kỹ năng thời gian có trong ngân hàng, đúng mã nội dung, có bài học, có mã lỗi', () => {
  const { NH } = moi();
  deq(KY.map((k) => NH.KY_NANG[k].noi_dung), ['B2.11', 'B2.12', 'B2.13']);
  deq(KY.map((k) => NH.KY_NANG[k].bai_hoc), ['xem-dong-ho', 'ngay-gio', 'xem-lich']);
  deq(KY.map((k) => NH.loaiKyNang(k)), ['xem_gio', 'ngay_gio', 'xem_lich']);
  for (const m of ['nham-kim', 'lech-gio', 'doc-so-phut', 'nham-buoi', 'nham-thu', 'dem-ngay-lech', 'nham-thang', 'dem-lech']) {
    const l = NH.LOI[m];
    assert.ok(l && l.be && l.mo_ta && l.ngan, m);
    assert.ok(!/\u2014/.test(l.be + l.mo_ta + l.ngan), m);
  }
});

test('mỗi kỹ năng 300 câu: đáp án đúng, đúng phạm vi SGK, mã câu ổn định, 3 lựa chọn khác nhau, nhiễu mang mã lỗi, gợi ý 3 cấp, hình hợp lệ', () => {
  const { NH, CTG } = moi();
  const demKieu = {};
  let coTen = 0, tong = 0;
  for (const kn of KY) {
    for (let seed = 1; seed <= 300; seed++) {
      const rng = NH.taoRng(seed * 7919 + kn.length);
      const q = NH.taoCau(kn, null, rng, { dang: 'chon_dap_an' });
      const ct = q.cau_truc;
      demKieu[kn + '/' + ct.kieu] = (demKieu[kn + '/' + ct.kieu] || 0) + 1;
      // đáp án đúng
      deq(NH.nhanBietLoi(ct, q.dap_an), [], q.ma_cau);
      // phạm vi
      if (kn === 'xem-gio') {
        assert.ok(ct.h >= 1 && ct.h <= 12 && [0, 15, 30].includes(ct.m), q.ma_cau);
        assert.match(q.dap_an, /^([1-9]|1[0-2]):(00|15|30)$/);
      } else if (kn === 'ngay-gio') {
        if (ct.kieu === 'buoi') assert.ok(CTG.BUOI.includes(q.dap_an) && ct.h >= 1 && ct.h <= 24);
        else if (ct.kieu === 'thu_tu') { assert.equal(q.dap_an.split(',').length, 3); assert.notEqual(q.dap_an, ct.viec.join(','), 'thứ tự hiện khác thứ tự đúng'); }
        else { assert.match(q.dap_an, /^([0-9]|1[0-9]|2[0-3]):(00|15|30)$/); }
      } else {
        const sn = CTG.soNgay(ct.thang);
        assert.ok(ct.thang >= 1 && ct.thang <= 12 && ct.t1 >= 0 && ct.t1 <= 6);
        if (ct.kieu === 'thu') assert.ok(CTG.THU.includes(q.dap_an));
        else if (ct.kieu === 'dem_thu') assert.ok(q.dap_an === 4 || q.dap_an === 5);
        else if (ct.kieu === 'so_ngay') assert.ok([28, 30, 31].includes(q.dap_an));
        else assert.ok(q.dap_an >= 1 && q.dap_an <= sn, q.ma_cau);
      }
      // mã câu
      assert.match(q.ma_cau, MA);
      assert.equal(NH.maCau(kn, J(ct)), q.ma_cau, 'mã câu ổn định sau khi ghi JSON');
      // lựa chọn
      assert.equal(q.lua_chon.length, 3, q.ma_cau);
      assert.equal(new Set(q.lua_chon.map((x) => String(x.gia_tri))).size, 3, 'lựa chọn khác nhau ' + q.ma_cau);
      const nhieu = q.lua_chon.filter((x) => String(x.gia_tri) !== String(q.dap_an));
      assert.equal(nhieu.length, 2);
      nhieu.forEach((x) => {
        assert.ok(x.loi.length > 0, 'nhiễu có mã lỗi');
        deq(x.loi, NH.nhanBietLoi(ct, x.gia_tri), 'mã lỗi của nhiễu khớp công thức ' + q.ma_cau);
      });
      tong++;
      if (nhieu.some((x) => x.loi.some((m) => m !== 'khac'))) coTen++;
      else assert.fail('câu không có nhiễu mang lỗi có tên: ' + q.ma_cau);
      // gợi ý, lời giải, lời nói
      assert.equal(q.goi_y.length, 3);
      q.goi_y.forEach((g) => { assert.ok(g && g.length > 5); assert.ok(docDuoc(g), 'gợi ý đọc được: ' + g); });
      assert.ok(docDuoc(q.de_doc), q.de_doc);
      assert.ok(!/\u2014/.test(q.de + q.ket_luan));
      assert.ok(q.loi_giai.ma && q.loi_giai.buoc.length >= 1 && q.loi_giai.html);
      const cac = q.loi_giai.html.match(/<svg[\s\S]*?<\/svg>/g) || [];
      assert.ok(cac.length >= 1, 'lời giải có hình ' + q.ma_cau);
      cac.forEach(svgHopLe);
      nhieu.forEach((x) => { const t = NH.loiNoiVoiBe(ct, x.gia_tri, x.loi); assert.ok(t && docDuoc(t), t); });
      // hình của đề
      if (q.hinh) svgHopLe(q.hinh);
      if (kn === 'xem-lich' || (kn === 'xem-gio' && ct.kieu === 'doc') || kn === 'ngay-gio') assert.ok(q.hinh, 'câu cần hình ' + q.ma_cau);
      // lựa chọn vẽ được
      q.lua_chon.forEach((x) => {
        const v = NH.veLuaChon(ct, x.gia_tri);
        assert.ok(v.nhan && v.nhan.length, 'nhãn ' + q.ma_cau);
        if (kn === 'xem-gio' || (kn === 'ngay-gio' && ['doi_24', 'doi_12', 'dong_ho_buoi'].includes(ct.kieu))) {
          assert.ok(v.dong_ho && Number.isInteger(v.dong_ho.h) && Number.isInteger(v.dong_ho.m), 'dong_ho ' + q.ma_cau);
        }
        if (v.hinh) svgHopLe(v.hinh);
      });
    }
  }
  // mọi kiểu con đều được sinh ra
  for (const k of ['xem-gio/doc', 'xem-gio/quay', 'ngay-gio/buoi', 'ngay-gio/doi_24', 'ngay-gio/doi_12', 'ngay-gio/dong_ho_buoi', 'ngay-gio/thu_tu',
    'xem-lich/thu', 'xem-lich/tuan', 'xem-lich/dem_thu', 'xem-lich/so_ngay', 'xem-lich/o_trong']) assert.ok(demKieu[k] >= 15, k + ': ' + demKieu[k]);
  assert.equal(coTen, tong);
});

test('dạng câu mặc định theo kiểu con; mục câu của màn thu hẹp kiểu con (cach) và số phút (phut)', () => {
  const { NH } = moi();
  const dang = (ct) => NH.dangMacDinh(ct);
  assert.equal(dang({ loai: 'xem_gio', kieu: 'doc', h: 8, m: 15 }), 'chon_dap_an');
  assert.equal(dang({ loai: 'xem_gio', kieu: 'quay', h: 8, m: 15 }), 'thao_tac_hinh');
  assert.equal(dang({ loai: 'ngay_gio', kieu: 'buoi', h: 20 }), 'keo_tha');
  assert.equal(dang({ loai: 'ngay_gio', kieu: 'thu_tu', viec: ['dap_xe', 'an_sang', 'doc_sach'] }), 'sap_xep');
  assert.equal(dang({ loai: 'ngay_gio', kieu: 'doi_24', h: 19, m: 0 }), 'chon_dap_an');
  assert.equal(dang({ loai: 'xem_lich', kieu: 'tuan', thang: 11, t1: 0, ngay: 5, huong: 1 }), 'thao_tac_hinh');
  assert.equal(dang({ loai: 'xem_lich', kieu: 'thu', thang: 11, t1: 0, ngay: 20 }), 'chon_dap_an');
  const rng = NH.taoRng(11);
  for (let i = 0; i < 60; i++) {
    const a = NH.sinh('xem-gio', rng, { ky_nang: 'xem-gio', cach: ['doc'], phut: [0] });
    assert.ok(a.kieu === 'doc' && a.m === 0);
    const b = NH.sinh('ngay-gio', rng, { ky_nang: 'ngay-gio', cach: ['buoi', 'doi_24'] });
    assert.ok(b.kieu === 'buoi' || b.kieu === 'doi_24');
    const c = NH.sinh('xem-lich', rng, { ky_nang: 'xem-lich', cach: ['so_ngay'] });
    assert.equal(c.kieu, 'so_ngay');
  }
});

test('công thức lỗi xem đồng hồ: nham-kim, lech-gio (giờ 30 phút), doc-so-phut', () => {
  const { NH } = moi();
  const L = (ct, v) => J(NH.nhanBietLoi(Object.assign({ loai: 'xem_gio', kieu: 'doc' }, ct), v));
  deq(L({ h: 8, m: 15 }, '8:15'), []);
  deq(L({ h: 8, m: 15 }, '08:15'), []);
  deq(L({ h: 8, m: 15 }, '20:15'), [], 'đồng hồ kim: 20 giờ 15 cùng chỗ với 8 giờ 15');
  deq(L({ h: 8, m: 15 }, { h: 8, m: 15 }), []);
  deq(L({ h: 8, m: 15 }, '3:40'), ['nham-kim'], 'kim phút chỉ 3 thành giờ, kim giờ chỉ 8 thành 40 phút');
  deq(L({ h: 3, m: 0 }, '12:15'), ['nham-kim']);
  deq(L({ h: 12, m: 15 }, '3:00'), ['nham-kim']);
  deq(L({ h: 8, m: 0 }, '12:40'), ['nham-kim']);
  deq(L({ h: 7, m: 30 }, '8:30'), ['lech-gio'], '7 giờ 30: kim giờ giữa 7 và 8, đọc 8 là lệch giờ');
  deq(L({ h: 7, m: 30 }, '6:30'), ['lech-gio']);
  deq(L({ h: 12, m: 30 }, '1:30'), ['lech-gio']);
  deq(L({ h: 1, m: 0 }, '12:00'), ['lech-gio']);
  deq(L({ h: 7, m: 30 }, '6:35'), ['nham-kim'], 'đổi vai hai kim khi kim giờ ở giữa hai số');
  deq(L({ h: 8, m: 15 }, '8:03'), ['doc-so-phut']);
  deq(L({ h: 7, m: 30 }, '7:06'), ['doc-so-phut']);
  deq(L({ h: 8, m: 0 }, '8:12'), ['doc-so-phut']);
  deq(L({ h: 8, m: 15 }, '8:30'), ['khac']);
  deq(L({ h: 8, m: 15 }, 'abc'), ['khac']);
  // đổi vai hai kim trùng lệch giờ: ghi cả hai mã
  deq(L({ h: 5, m: 30 }, '6:30'), ['nham-kim', 'lech-gio']);
});

test('công thức lỗi ngày giờ: nham-buoi (quên đổi buổi, giờ giáp ranh, xếp việc quên buổi), lech-gio (cộng 10 thay vì 12)', () => {
  const { NH } = moi();
  const L = (ct, v) => J(NH.nhanBietLoi(Object.assign({ loai: 'ngay_gio' }, ct), v));
  deq(L({ kieu: 'buoi', h: 20 }, 'toi'), []);
  deq(L({ kieu: 'buoi', h: 20 }, 'sang'), ['nham-buoi'], '20 giờ tưởng 8 giờ sáng');
  deq(L({ kieu: 'buoi', h: 20 }, 'chieu'), ['khac']);
  deq(L({ kieu: 'buoi', h: 18 }, 'toi'), ['nham-buoi'], '18 giờ là buổi chiều (SGK), giờ giáp ranh');
  deq(L({ kieu: 'buoi', h: 18 }, 'chieu'), []);
  deq(L({ kieu: 'buoi', h: 11 }, 'trua'), []);
  deq(L({ kieu: 'buoi', h: 11 }, 'sang'), ['nham-buoi']);
  deq(L({ kieu: 'buoi', h: 24 }, 'dem'), [], '12 giờ đêm là 24 giờ');
  deq(L({ kieu: 'doi_24', h: 19, m: 0 }, '19:00'), []);
  deq(L({ kieu: 'doi_24', h: 19, m: 0 }, '7:00'), ['nham-buoi']);
  deq(L({ kieu: 'doi_24', h: 19, m: 0 }, '17:00'), ['lech-gio'], '7 + 10 thay vì 7 + 12');
  deq(L({ kieu: 'doi_24', h: 19, m: 0 }, '20:00'), ['lech-gio']);
  deq(L({ kieu: 'doi_24', h: 19, m: 0 }, '15:00'), ['khac']);
  deq(L({ kieu: 'doi_24', h: 19, m: 0 }, '19:30'), ['khac']);
  deq(L({ kieu: 'doi_12', h: 15, m: 0 }, '3:00'), ['nham-buoi'], '15 giờ tưởng 3 giờ sáng');
  deq(L({ kieu: 'doi_12', h: 15, m: 0 }, '17:00'), ['lech-gio'], '15 − 10 = 5 giờ chiều');
  deq(L({ kieu: 'dong_ho_buoi', h: 14, m: 30 }, '14:30'), []);
  deq(L({ kieu: 'dong_ho_buoi', h: 14, m: 30 }, '15:30'), ['lech-gio'], 'kim giờ giữa 2 và 3 đọc thành 3');
  deq(L({ kieu: 'dong_ho_buoi', h: 14, m: 30 }, '2:30'), ['nham-buoi']);
  deq(L({ kieu: 'dong_ho_buoi', h: 14, m: 30 }, '3:30'), ['nham-buoi', 'lech-gio']);
  const tt = { kieu: 'thu_tu', viec: ['dap_xe', 'an_sang', 'doc_sach'] };
  assert.equal(NH.tinh(Object.assign({ loai: 'ngay_gio' }, tt)), 'an_sang,dap_xe,doc_sach');
  deq(L(tt, 'an_sang,dap_xe,doc_sach'), []);
  deq(L(tt, ['an_sang', 'dap_xe', 'doc_sach']), []);
  deq(L(tt, 'dap_xe,an_sang,doc_sach'), ['nham-buoi'], '3 giờ 30 chiều xếp trước 6 giờ 30 sáng vì 3 < 6');
  deq(L(tt, 'doc_sach,dap_xe,an_sang'), ['khac']);
  deq(L(tt, 'an_sang,dap_xe'), ['khac']);
});

test('công thức lỗi xem lịch trên tờ lịch SGK: nham-thu, dem-ngay-lech, dem-lech, nham-thang', () => {
  const { NH, CTG } = moi();
  const L = (ct, v) => J(NH.nhanBietLoi(Object.assign({ loai: 'xem_lich' }, ct), v));
  // Bài 30: tháng 11 ngày 1 là thứ Hai, ngày 20 là thứ Bảy, tháng 11 có 30 ngày
  const t11 = { thang: 11, t1: 0 };
  assert.equal(NH.tinh(Object.assign({ loai: 'xem_lich', kieu: 'thu', ngay: 20 }, t11)), 'thu_bay');
  assert.equal(NH.tinh(Object.assign({ loai: 'xem_lich', kieu: 'so_ngay' }, t11)), 30);
  deq(L(Object.assign({ kieu: 'thu', ngay: 20 }, t11), 'thu_bay'), []);
  deq(L(Object.assign({ kieu: 'thu', ngay: 20 }, t11), 'chu_nhat'), ['nham-thu']);
  deq(L(Object.assign({ kieu: 'thu', ngay: 20 }, t11), 'thu_sau'), ['nham-thu']);
  deq(L(Object.assign({ kieu: 'thu', ngay: 20 }, t11), 'thu_hai'), ['khac']);
  deq(L(Object.assign({ kieu: 'thu', ngay: 21 }, t11), 'thu_hai'), ['nham-thu'], 'Chủ nhật và thứ Hai cũng là hai cột cạnh nhau theo vòng tuần');
  // Bài 30 tháng 12 (ngày 1 thứ Tư): ô ? hàng 2 là ngày 10, ngày cuối là thứ Sáu
  const t12 = { thang: 12, t1: 2 };
  assert.equal(NH.tinh(Object.assign({ loai: 'xem_lich', kieu: 'thu', ngay: 31 }, t12)), 'thu_sau');
  deq(L(Object.assign({ kieu: 'o_trong', ngay: 10 }, t12), 10), []);
  deq(L(Object.assign({ kieu: 'o_trong', ngay: 10 }, t12), 11), ['dem-ngay-lech']);
  deq(L(Object.assign({ kieu: 'o_trong', ngay: 10 }, t12), 17), ['khac']);
  // thứ Hai ngày 5, thứ Hai tuần sau là ngày 12
  const t5 = { thang: 10, t1: 3 };
  assert.equal(CTG.thuCua(t5, 5), 0);
  const tuan = Object.assign({ kieu: 'tuan', ngay: 5, huong: 1 }, t5);
  assert.equal(NH.tinh(Object.assign({ loai: 'xem_lich' }, tuan)), 12);
  deq(L(tuan, 12), []);
  deq(L(tuan, '12'), []);
  deq(L(tuan, 11), ['dem-ngay-lech'], 'cộng 6');
  deq(L(tuan, 13), ['dem-ngay-lech'], 'cộng 8');
  deq(L(tuan, 6), ['khac']);
  // Bài 31: tháng 6 ngày 1 thứ Tư; thứ Năm 16, tuần trước 9, tuần sau 23
  const t6 = { thang: 6, t1: 2 };
  assert.equal(NH.tinh(Object.assign({ loai: 'xem_lich', kieu: 'tuan', ngay: 16, huong: -1 }, t6)), 9);
  assert.equal(NH.tinh(Object.assign({ loai: 'xem_lich', kieu: 'tuan', ngay: 16, huong: 1 }, t6)), 23);
  assert.equal(NH.tinh(Object.assign({ loai: 'xem_lich', kieu: 'thu', ngay: 1 }, t6)), 'thu_tu', 'Quốc tế Thiếu nhi 1 tháng 6 là thứ Tư');
  // Bài 31: tháng 5 (ngày 1 Chủ nhật) có 5 ngày thứ Ba: 3, 10, 17, 24, 31; 19 tháng 5 là thứ Năm
  const t5b = { thang: 5, t1: 6 };
  const dem = Object.assign({ kieu: 'dem_thu', thu: 1 }, t5b);
  assert.equal(NH.tinh(Object.assign({ loai: 'xem_lich' }, dem)), 5);
  deq(L(dem, 4), ['dem-lech']);
  deq(L(dem, 6), ['dem-lech']);
  deq(L(dem, 3), ['khac']);
  assert.equal(NH.tinh(Object.assign({ loai: 'xem_lich', kieu: 'thu', ngay: 19 }, t5b)), 'thu_nam');
  assert.equal(NH.deHien(Object.assign({ loai: 'xem_lich', kieu: 'thu', ngay: 19 }, t5b)), 'Sinh nhật Bác Hồ 19 tháng 5 là thứ mấy?');
  // số ngày trong tháng (Bài 30 ghi nhớ)
  const sn = (t) => NH.tinh({ loai: 'xem_lich', kieu: 'so_ngay', thang: t, t1: 0 });
  deq([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(sn), [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]);
  deq(L({ kieu: 'so_ngay', thang: 4, t1: 0 }, 31), ['nham-thang']);
  deq(L({ kieu: 'so_ngay', thang: 4, t1: 0 }, 28), ['nham-thang']);
  deq(L({ kieu: 'so_ngay', thang: 4, t1: 0 }, 20), ['khac']);
  deq(L({ kieu: 'so_ngay', thang: 2, t1: 0 }, 28), []);
});

test('SGK Bài 29: bảng các buổi, cách gọi 13 giờ là 1 giờ chiều, 20 giờ là 8 giờ tối; chỉ giờ đúng, 15 phút, 30 phút', () => {
  const { CTG, NH } = moi();
  const bang = {};
  for (let h = 1; h <= 24; h++) (bang[CTG.buoiCua(h)] = bang[CTG.buoiCua(h)] || []).push(h);
  deq(bang, { sang: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], trua: [11, 12], chieu: [13, 14, 15, 16, 17, 18], toi: [19, 20, 21], dem: [22, 23, 24] });
  assert.equal(CTG.chuGio12(13, 0), '1 giờ chiều');
  assert.equal(CTG.chuGio12(20, 0), '8 giờ tối');
  assert.equal(CTG.chuGio12(22, 0), '10 giờ đêm');
  assert.equal(CTG.chuGio12(0, 0), '12 giờ đêm');
  assert.equal(CTG.chuGio12(12, 0), '12 giờ trưa');
  assert.equal(CTG.chuGio12(17, 30), '5 giờ 30 phút chiều');
  assert.equal(CTG.chuGio24(0, 0), '24 giờ');
  assert.equal(CTG.dienTu(7, 0), '07:00');
  assert.equal(NH.deHien({ loai: 'ngay_gio', kieu: 'doi_24', h: 20, m: 0 }), '8 giờ tối còn gọi là mấy giờ?');
  assert.equal(NH.hienGiaTriCau({ loai: 'ngay_gio', kieu: 'doi_24', h: 20, m: 0 }, '20:00'), '20 giờ');
  assert.equal(NH.hienGiaTriCau({ loai: 'ngay_gio', kieu: 'doi_12', h: 15, m: 15 }, '15:15'), '3 giờ 15 phút chiều');
  assert.equal(NH.hienGiaTriCau({ loai: 'xem_gio', kieu: 'doc', h: 8, m: 15 }, '8:15'), '8 giờ 15 phút');
  assert.equal(NH.hienGiaTriCau({ loai: 'xem_lich', kieu: 'thu', thang: 11, t1: 0, ngay: 20 }, 'thu_bay'), 'thứ Bảy');
  // giá trị phút của mọi câu xem giờ sinh ra nằm trong phạm vi SGK lớp 2 (không có "kém", không có 5 phút lẻ)
  const rng = NH.taoRng(5);
  const phut = new Set();
  for (let i = 0; i < 400; i++) phut.add(NH.sinh('xem-gio', rng, null).m);
  deq([...phut].sort((a, b) => a - b), [0, 15, 30]);
});

test('lựa chọn cho game cũ: veLuaChon trả nhãn, dong_ho { h, m } và hình đồng hồ; veHinh vẽ đồng hồ cho "Đồng hồ chỉ mấy giờ?"', () => {
  const { NH, DH } = moi();
  const ct = { loai: 'xem_gio', kieu: 'doc', h: 8, m: 15 };
  const v = NH.veLuaChon(ct, '8:15');
  assert.equal(v.nhan, '8 giờ 15 phút');
  deq(v.dong_ho, { h: 8, m: 15 });
  svgHopLe(v.hinh);
  assert.match(v.hinh, /aria-label="Đồng hồ chỉ 8 giờ 15 phút"/);
  const h = NH.veHinh(ct);
  svgHopLe(h);
  for (let n = 1; n <= 12; n++) assert.ok(h.includes('>' + n + '</text>'), 'mặt đồng hồ có số ' + n);
  assert.match(h, /rotate\(247.5\)/, 'kim giờ 8 giờ 15 phút quay 247,5 độ (kim giờ đi theo kim phút)');
  assert.match(h, /rotate\(90\)/, 'kim phút chỉ số 3');
  const q = NH.veLuaChon({ loai: 'ngay_gio', kieu: 'dong_ho_buoi', h: 14, m: 30 }, '14:30');
  deq(q.dong_ho, { h: 14, m: 30 });
  assert.equal(q.nhan, '14:30');
  assert.equal(q.hien, 'dien_tu');
  assert.equal(NH.veLuaChon({ loai: 'ngay_gio', kieu: 'buoi', h: 20 }, 'toi').nhan, 'Buổi tối');
  // hình dùng mã gradient riêng: hai đồng hồ trên cùng trang không giẫm lên nhau
  const a = DH.svg(3, 0), b = DH.svg(3, 0);
  const id = (s) => /id="([^"]+)"/.exec(s)[1];
  assert.notEqual(id(a), id(b));
  svgHopLe(DH.dienTu(19, 30));
  svgHopLe(DH.lich({ thang: 11, t1: 0 }, { khoanh: [20], cot: 5, muiTen: [5, 12], hoi: 9 }));
  svgHopLe(DH.dai({ buoi: 'toi', danhDau: [{ h: 20, nhan: '20 giờ' }], nhan12: true }));
  svgHopLe(DH.svg(7, 30, { buoi: 'toi', giai: true, chuThich: true }));
});

test('màn vùng 6: mọi màn Lật Lịch lập đủ câu, dạng câu theo kiểu con; màn game cũ ép chọn đáp án vẫn có 3 lựa chọn', () => {
  const { DAO, NH } = moi();
  for (const id of ['v6-m1', 'v6-m2', 'v6-m3', 'v6-cup']) {
    const m = DAO.man(id);
    assert.equal(m.game, 'lat-lich');
    for (let seed = 1; seed <= 20; seed++) {
      const ds = NH.lapDanhSach(m, NH.taoRng(seed), {});
      assert.equal(ds.length, m.so_cau, id);
      ds.forEach((x) => {
        assert.ok(['chon_dap_an', 'thao_tac_hinh', 'keo_tha', 'sap_xep'].includes(x.dang), id + ' ' + x.dang);
        assert.equal(x.dang, NH.dangMacDinh(x.cau_truc));
      });
    }
  }
  for (const id of ['v6-m4', 'v6-m5', 'v6-m6', 'v6-m7']) {
    const m = Object.assign({}, DAO.man(id), { dang: 'chon_dap_an' });
    const rng = NH.taoRng(42);
    NH.lapDanhSach(m, rng, {}).forEach((x) => {
      assert.equal(x.dang, 'chon_dap_an');
      const q = NH.taoCau(x.ky_nang, x.cau_truc, rng, { dang: x.dang });
      assert.equal(q.lua_chon.length, 3, id + ' ' + q.ma_cau);
    });
  }
});

/* ---------------- Game Lật Lịch, bài học ---------------- */

test('game Lật Lịch đăng ký vào đảo (khung chung, vùng chơi ll2-san); ba bài học 30 giây theo SGK, bước cuối có câu thử', () => {
  const w = loadGame('dao-khung-long', FILES.concat(['js/phan-hoi.js', 'js/bai-hoc.js', 'js/lat-lich.js']));
  const g = w.DaoTroChoi['lat-lich'];
  assert.ok(g && g.khung === true && g.san === 'll2-san' && typeof g.batDau === 'function');
  assert.ok(w.LatLich && typeof w.LatLich._trangThai === 'function');
  const BH = w.BaiHoc;
  for (const ma of ['xem-dong-ho', 'ngay-gio', 'xem-lich']) {
    assert.ok(BH.coBai(ma), ma);
    const bai = BH.BAI[ma];
    assert.ok(bai.ten && bai.buoc.length >= 4, ma);
    bai.buoc.forEach((b, i) => {
      assert.ok(b.chu && typeof b.ve === 'function', ma + ' bước ' + i);
      assert.ok(docDuoc(b.chu), ma + ': ' + b.chu);
      const h = b.ve();
      assert.match(h, /<svg|ll2-bh-thang/, ma + ' bước ' + i + ' có hình');
      (h.match(/<svg[\s\S]*?<\/svg>/g) || []).forEach(svgHopLe);
    });
    const cuoi = bai.buoc[bai.buoc.length - 1];
    assert.ok(cuoi.thu && cuoi.thu.lua_chon.includes(cuoi.thu.dung) && cuoi.thu.dung_noi && cuoi.thu.sai_noi, ma);
  }
  // dạy đúng SGK: kim phút chỉ số 3 là 15 phút; 8 giờ tối là 20 giờ; ngày 20 tháng 11 là thứ Bảy
  assert.match(BH.BAI['xem-dong-ho'].buoc[2].chu, /Kim phút chỉ số 3 là 15 phút/);
  assert.match(BH.BAI['ngay-gio'].buoc[3].chu, /8 giờ tối là 20 giờ/);
  assert.match(BH.BAI['xem-lich'].buoc[1].chu, /ngày 20 tháng 11 là thứ Bảy/);
  assert.equal(BH.BAI['xem-lich'].buoc[4].thu.dung, 'Thứ Tư');
  assert.equal(w.NganHang.tinh({ loai: 'xem_lich', kieu: 'thu', thang: 11, t1: 0, ngay: 17 }), 'thu_tu', 'câu thử của bài học khớp tờ lịch');
  // phông chữ trong SVG đặt tên trong nháy (Baloo 2 có chữ số)
  assert.match(w.DongHo.svg(3, 0), /font-family="'Baloo 2', 'Arial Rounded MT Bold', sans-serif"/);
});

test('phát lại: một ván Lật Lịch qua VanChoi + NhatKy (xoay kim, kéo thả, lật trang, chạm ô, đếm, xếp); thử 2 lần rồi lời giải; câu sai quay lại; hợp lệ lược đồ', async () => {
  const ctx = moi();
  const { w, NK, dh, HT, CTG } = ctx;
  await NK.khoiDong({ khongDungIndexedDB: true });
  NK.datBe('be_LATLICH01');
  const m = w.Dao.man('v6-cup');
  const van = new w.VanChoi({ nk: NK, game: 'lat-lich', vung: 6, man: m, nguon: 'tu_chon', hatGiong: 606, soCau: 7 });
  van.batDau({ che_do: 'tron', thu_lan: 2 });
  /** Hiện một câu như Lật Lịch làm: dựng câu, lựa chọn bé nhìn thấy, cho thử 2 lần. */
  const hien = (kn, ct, dang, luaChon) => {
    const q = van._taoQ({ ky_nang: kn, cau_truc: ct, dang: dang });
    if (dang === 'thao_tac_hinh' && ct.kieu === 'quay') q.de = 'Quay kim để đồng hồ chỉ ' + CTG.chuGio(ct.h, ct.m);
    van.hienCau(q, luaChon);
    q.toiDaLanThu = 2;
    dh.toi(1200);
    return q;
  };
  // 1. Quay kim tới 7 giờ 30 phút: lần 1 kim giờ lệch sang 8 (lech-gio), lần 2 đúng
  let q = hien('xem-gio', { loai: 'xem_gio', kieu: 'quay', h: 7, m: 30 }, 'thao_tac_hinh');
  van.thaoTac('xoay', { doi_tuong: 'kim_phut', tu: '12:00', den: '12:30', gia_tri: '12:30', so_chi: 6 });
  van.thaoTac('xoay', { doi_tuong: 'kim_gio', tu: '12:30', den: '8:30', gia_tri: '8:30', so_chi: 8 });
  let k = van.traLoi('8:30', { kim_gio: 8, kim_phut: 6, so_lan_xoay: 2 });
  assert.ok(k.thuLai);
  deq(k.loi, ['lech-gio']);
  van.thaoTac('xoay', { doi_tuong: 'kim_gio', tu: '8:30', den: '7:30', gia_tri: '7:30', so_chi: 7 });
  assert.equal(van.traLoi('7:30', { kim_gio: 7, kim_phut: 6, so_lan_xoay: 3 }).ketQua, 'dung_lan_2');
  // 2. Kéo thẻ 20 giờ vào buổi: sáng (nham-buoi) rồi chiều, sai hẳn: xem lời giải, câu sẽ quay lại
  const buoi = CTG.BUOI.map((b) => ({ gia_tri: b, vi_tri: 'buoi_' + b }));
  q = hien('ngay-gio', { loai: 'ngay_gio', kieu: 'buoi', h: 20 }, 'keo_tha', buoi);
  const cauBuoi = q.cau;
  van.thaoTac('keo', { doi_tuong: 'the_gio', gia_tri: '20 giờ' });
  van.thaoTac('tha', { doi_tuong: 'the_gio', den: 'buoi_sang', gia_tri: 'sang', cach: 'keo' });
  k = van.traLoi('sang', { vi_tri: 'buoi_sang', cach: 'keo' });
  assert.ok(k.thuLai && k.loi[0] === 'nham-buoi');
  van.thaoTac('tha', { doi_tuong: 'the_gio', den: 'buoi_chieu', gia_tri: 'chieu', cach: 'cham' });
  k = van.traLoi('chieu', { vi_tri: 'buoi_chieu', cach: 'cham' });
  assert.ok(k.canPhanHoi && k.loiGiai && /<svg/.test(k.loiGiai.html));
  van.phanHoiXem(6.4, 'choi_tiep');
  van.ketThucCauSai();
  // 3. Lật trang, chạm ô ngày 20, xin 3 gợi ý (cấp 3 tô cột), chạm đầu cột Thứ Bảy
  const cot = CTG.THU.map((c, i) => ({ gia_tri: c, vi_tri: 'cot_' + (i + 1) }));
  q = hien('xem-lich', { loai: 'xem_lich', kieu: 'thu', thang: 11, t1: 0, ngay: 20 }, 'chon_dap_an', cot);
  van.thaoTac('lat_trang', { doi_tuong: 'to_lich', tu: 'bia', den: 'thang_11', cach: 'cham' });
  van.thaoTac('cham', { doi_tuong: 'o_ngay', gia_tri: 20, vi_tri: 'hang_3_cot_6' });
  van.goiY(); van.goiY(); van.goiY({ to_cot: 'thu_bay' });
  van.thaoTac('chon', { doi_tuong: 'cot_thu', gia_tri: 'thu_bay', vi_tri: 'cot_6' });
  assert.equal(van.traLoi('thu_bay', { vi_tri: 'cot_6', ngay_da_cham: 20 }).ketQua, 'dung_sau_goi_y');
  // 4. Xếp ba việc: lần 1 xếp theo số giờ quên buổi (nham-buoi), đổi chỗ rồi đúng
  q = hien('ngay-gio', { loai: 'ngay_gio', kieu: 'thu_tu', viec: ['dap_xe', 'an_sang', 'doc_sach'] }, 'sap_xep');
  ['dap_xe', 'an_sang', 'doc_sach'].forEach((ma, i) => { van.thaoTac('keo', { doi_tuong: 'the_viec', gia_tri: ma, tu: 'khay' }); van.thaoTac('dat', { doi_tuong: 'the_viec', gia_tri: ma, den: 'o_' + (i + 1), cach: 'keo' }); });
  k = van.traLoi('dap_xe,an_sang,doc_sach', { thu_tu: ['dap_xe', 'an_sang', 'doc_sach'] });
  assert.ok(k.thuLai && k.loi[0] === 'nham-buoi' && /Buổi sáng đến trước/.test(k.loiNoi));
  van.thaoTac('doi_cot', { doi_tuong: 'the_viec', gia_tri: 'an_sang', tu: 'o_2', den: 'o_1', cach: 'keo' });
  assert.equal(van.traLoi('an_sang,dap_xe,doc_sach', { thu_tu: ['an_sang', 'dap_xe', 'doc_sach'] }).ketQua, 'dung_lan_2');
  // 5. Thứ Hai ngày 5, thứ Hai tuần sau: chạm ô 12
  q = hien('xem-lich', { loai: 'xem_lich', kieu: 'tuan', thang: 10, t1: 3, ngay: 5, huong: 1 }, 'thao_tac_hinh');
  van.thaoTac('lat_trang', { doi_tuong: 'to_lich', tu: 'thang_11', den: 'thang_10', cach: 'vuot' });
  van.thaoTac('chon', { doi_tuong: 'o_ngay', gia_tri: 12, vi_tri: 'hang_3_cot_1' });
  assert.equal(van.traLoi(12, { vi_tri: 'hang_3_cot_1' }).ketQua, 'dung_ngay');
  // 6. Đọc đồng hồ (chọn thẻ): Lật Lịch cho thử 2 lần cả ở dạng chọn đáp án
  q = hien('xem-gio', { loai: 'xem_gio', kieu: 'doc', h: 3, m: 0 }, 'chon_dap_an');
  assert.equal(q.lua_chon.length, 3);
  van.thaoTac('chon', { doi_tuong: 'the', gia_tri: '12:15', vi_tri: 'the_1' });
  k = van.traLoi('12:15', { vi_tri: 'the_1' });
  assert.ok(k.thuLai, 'thử lại lần 2 dù là chọn đáp án');
  deq(k.loi, ['nham-kim']);
  van.thaoTac('chon', { doi_tuong: 'the', gia_tri: '3:00', vi_tri: 'the_2' });
  assert.equal(van.traLoi('3:00', { vi_tri: 'the_2' }).ketQua, 'dung_lan_2');
  // 7. Đếm Chủ nhật (tháng 5, ngày 1 là Chủ nhật): chạm đếm 5 ngày, chọn 5
  q = hien('xem-lich', { loai: 'xem_lich', kieu: 'dem_thu', thang: 5, t1: 6, thu: 6 }, 'chon_dap_an');
  [1, 8, 15, 22, 29].forEach((n, i) => van.thaoTac('dem', { doi_tuong: 'o_ngay', gia_tri: n, thu: 'chu_nhat', so_da_dem: i + 1 }));
  van.thaoTac('chon', { doi_tuong: 'the', gia_tri: 5, vi_tri: 'the_2' });
  assert.equal(van.traLoi(5, { vi_tri: 'the_2', so_da_dem: 5, ngay_da_dem: [1, 8, 15, 22, 29] }).ketQua, 'dung_ngay');
  // Câu buổi sai hẳn quay lại (sau 2 câu), bé làm đúng: sửa được
  assert.ok(van.conCau());
  let lai = null;
  for (let i = 0; i < 12 && van.conCau(); i++) {
    const x = van.lapBan(1)[0];
    if (!x) break;
    van.hienCau(x, x.dang === 'keo_tha' ? buoi : undefined);
    x.toiDaLanThu = 2;
    if (x.on_lai_cua === cauBuoi) lai = x;
    van.traLoi(x.dap_an);
  }
  assert.ok(lai && lai.ma_cau === 'B2.12|ngay-gio|buoi:20', 'câu 20 giờ quay lại');
  const kq = await van.ketThuc(false, { diem: 900, so_dung: 7 });
  const evs = await NK.docCuaBe('be_LATLICH01');
  deq(kiemLuocDo(evs), []);
  // chuỗi sự kiện của câu 1 (quay kim)
  const c1 = evs.filter((e) => e.cau === evs.find((x) => x.loai === 'cau_hien').cau).map((e) => e.loai + (e.loai === 'thao_tac' ? '/' + e.du_lieu.kieu : ''));
  deq(c1, ['cau_hien', 'thao_tac/xoay', 'thao_tac/xoay', 'tra_loi', 'thao_tac/xoay', 'tra_loi', 'cau_ket_thuc']);
  const hienDs = evs.filter((e) => e.loai === 'cau_hien');
  assert.equal(hienDs[0].du_lieu.de, 'Quay kim để đồng hồ chỉ 7 giờ 30 phút');
  assert.equal(hienDs[1].du_lieu.dang, 'keo_tha');
  assert.equal(hienDs[1].du_lieu.lua_chon.length, 5);
  deq(hienDs[1].du_lieu.lua_chon.find((x) => x.gia_tri === 'sang').loi, ['nham-buoi']);
  assert.equal(hienDs[2].du_lieu.lua_chon.length, 7, 'bảy cột thứ trên tờ lịch');
  const kieu = new Set(evs.filter((e) => e.loai === 'thao_tac').map((e) => e.du_lieu.kieu));
  for (const x of ['xoay', 'keo', 'tha', 'lat_trang', 'cham', 'chon', 'dat', 'doi_cot', 'dem']) assert.ok(kieu.has(x), 'có thao tác ' + x);
  const gy = evs.filter((e) => e.loai === 'goi_y');
  assert.equal(gy.length, 3);
  assert.equal(gy[2].du_lieu.to_cot, 'thu_bay');
  assert.ok(evs.some((e) => e.loai === 'phan_hoi_xem'));
  const cau = HT.tomTatCacCau(kq.suKien);
  const sua = cau.find((c) => c.on_lai_cua === cauBuoi);
  assert.ok(sua && sua.sua_duoc_cau === cauBuoi, 'câu quay lại làm đúng thì sửa được');
  const c4 = cau.find((c) => c.ma_cau === 'B2.12|ngay-gio|thu_tu:dap_xe,an_sang,doc_sach');
  assert.equal(c4.ket_qua, 'dung_lan_2');
  assert.equal(c4.so_lan_doi_y, 1, 'đổi chỗ thẻ tính là đổi ý');
  assert.ok(c4.loi.includes('nham-buoi'));
  assert.equal(kq.dem.sai, 1);
  assert.equal(kq.dem.suaDuoc, 1);
});
