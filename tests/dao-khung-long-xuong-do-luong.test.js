'use strict';
/* Đảo Khủng Long, Xưởng Đo Lường (vùng 3): kiểm thử ngân hàng câu đo lường và nhật ký của game (không cần trình duyệt).
   - Năm kỹ năng nang-nhe, can-kg, rot-lit (B2.9, B2.10), don-vi-do-dai (B2.6), do-do-dai (B2.7): đáp án đúng, đúng phạm vi SGK,
     mã câu ổn định, nhiễu mang mã lỗi theo công thức, gợi ý 3 cấp, hình SVG an toàn, dạng chọn đáp án cho Đấu Trường.
   - Công thức từng lỗi viết tay (ben-thap-nhe, dem-qua-can, doc-sai-vach, doi-don-vi, do-tu-1…).
   - Phát lại ván theo kịch bản qua VanChoi + NhatKy: chuỗi sự kiện đúng thứ tự, hợp lệ lược đồ v1.
   - Bài học 30 giây ki-lo-gam, lit, do-dai đăng ký trong game và gắn vào kỹ năng. */
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

function moi(opts, them) {
  const w = loadGame('dao-khung-long', FILES.concat(them || []), opts);
  const dh = { t: Date.UTC(2026, 9, 12, 12, 4, 0), p: 1000 };
  w.NhatKy.caiDongHo({ now: () => dh.t, perf: () => dh.p });
  dh.toi = (ms) => { dh.t += ms; dh.p += ms; };
  return { w, dh, NK: w.NhatKy, NH: w.NganHang, HT: w.HocTap, DAO: w.Dao, CDL: w.CauDoLuong };
}
function kiemLuocDo(evs) {
  const loi = [];
  evs.forEach((e, i) => { validate(SCHEMA, e).forEach((m) => loi.push('#' + i + ' ' + e.loai + ' ' + m)); });
  return loi;
}

const KY = {
  'nang-nhe': { nd: 'B2.9', loai: 'nang_nhe', cach: ['so_sanh', 'thu_tu', 'doi_qua', 'cong_qua', 'bac_cau'] },
  'can-kg': { nd: 'B2.9', loai: 'can_kg', cach: ['can', 'tru', 'dong_ho', 'so_sanh', 'tinh'] },
  'rot-lit': { nd: 'B2.10', loai: 'rot_lit', cach: ['rot', 'vach', 'doc', 'so_sanh', 'tong', 'tinh', 'don_vi'] },
  'don-vi-do-dai': { nd: 'B2.6', loai: 'don_vi_dai', cach: ['chon_don_vi', 'doi', 'so_sanh', 'tinh'] },
  'do-do-dai': { nd: 'B2.7', loai: 'do_dai', cach: ['do', 'lech', 'noi_tiep'] }
};
const LOI_MOI = ['ben-thap-nhe', 'can-thang-bang', 'chi-mot-can', 'dem-qua-can', 'thieu-qua-can', 'quen-can-cung-dia', 'dem-so-ca', 'doc-sai-vach', 'dem-vach', 'cao-hon-nhieu-hon', 'nham-don-vi', 'doi-don-vi', 'quen-doi-don-vi', 'do-tu-1', 'dem-so-lan'];
const KHONG_TEN = new Set(['khac', 'dem-lech']);
const coTen = (loi) => loi.some((m) => !KHONG_TEN.has(m));

/** Kiểm một SVG do ngân hàng câu dựng: có viewBox, không script, không sự kiện on*, không tham chiếu ngoài. */
function kiemSvg(h, nhan) {
  assert.equal(typeof h, 'string', nhan);
  if (!h) return;
  assert.match(h, /^<svg [^>]*viewBox="[-\d. ]+"/, nhan + ': thiếu viewBox');
  assert.ok(!/<script/i.test(h), nhan + ': có script');
  assert.ok(!/\son[a-z]+\s*=/i.test(h), nhan + ': có thuộc tính on*');
  assert.ok(!/href|url\((?!#)/i.test(h), nhan + ': có tham chiếu ngoài');
  assert.ok(!/undefined|NaN/.test(h), nhan + ': có undefined/NaN');
  assert.ok(/Baloo 2/.test(h), nhan + ': thiếu phông');
  assert.equal((h.match(/<svg/g) || []).length, (h.match(/<\/svg>/g) || []).length, nhan + ': thẻ svg không cân');
}
function kiemChu(t, nhan) {
  assert.equal(typeof t, 'string', nhan);
  assert.ok(t.length > 0, nhan + ' rỗng');
  assert.ok(!/\u2014/.test(t), nhan + ': có gạch dài');
  assert.ok(!/undefined|NaN|\[object/.test(t), nhan + ': ' + t);
}

/** Phạm vi số theo SGK của từng kiểu câu. */
function kiemPhamVi(kn, ct, d) {
  const n = typeof d === 'number' ? d : null;
  if (ct.kieu === 'tinh') {
    assert.ok(ct.a <= 100 && ct.b <= 100 && ct.a >= 0 && ct.b >= 0, JSON.stringify(ct));
    assert.ok(n >= 0 && n <= 100, 'tổng, hiệu trong phạm vi 100: ' + JSON.stringify(ct));
    return;
  }
  if (kn === 'nang-nhe') { if (n != null) assert.ok(n >= 2 && n <= 12, JSON.stringify(ct)); return; }
  if (kn === 'can-kg') {
    if (ct.kieu === 'can' || ct.kieu === 'tru') {
      assert.ok(n >= 1 && n <= 10, JSON.stringify(ct));
      ct.qp.concat(ct.qt || [], ct.ke || []).forEach((q) => assert.ok([1, 2, 5].includes(q), 'quả cân 1, 2, 5 kg'));
      assert.ok(ct.qp.reduce((a, b) => a + b, 0) <= 10);
    }
    if (ct.kieu === 'so_sanh') ct.hop.forEach((h) => assert.ok(h.reduce((a, b) => a + b, 0) <= 12));
    if (ct.kieu === 'dong_ho') assert.ok(n >= 1 && ct.kg + (ct.qt ? ct.qt[0] : 0) <= 7, 'mặt cân đồng hồ 0 đến 7 kg: ' + JSON.stringify(ct));
    return;
  }
  if (kn === 'rot-lit') {
    if (ct.kieu === 'rot') assert.ok(n >= 2 && n <= 10);
    if (ct.kieu === 'vach' || ct.kieu === 'doc') assert.ok(n >= 1 && n < ct.max && ct.max <= 10);
    if (ct.kieu === 'tong') assert.ok(n <= 12);
    if (ct.kieu === 'so_sanh') assert.ok(ct.a <= 10 && ct.b <= 10 && ct.a !== ct.b);
    return;
  }
  if (kn === 'don-vi-do-dai') {
    if (ct.kieu === 'doi') assert.ok(n >= 1 && n <= 1000 && ct.so <= 1000, JSON.stringify(ct));
    if (ct.kieu === 'so_sanh') assert.ok(ct.a[0] <= 1000 && ct.b[0] <= 1000 && ct.a[1] !== ct.b[1], JSON.stringify(ct));
    return;
  }
  if (kn === 'do-do-dai') {
    if (ct.kieu === 'noi_tiep') assert.ok(n >= 6 && n <= 12);
    else assert.ok(n >= 2 && n <= 15 && (ct.dau || 0) + ct.dai <= 15, JSON.stringify(ct));
  }
}

/* ---------------- Đăng ký ---------------- */

test('xưởng đo lường: đăng ký 5 kỹ năng, 5 loại câu và 15 mã lỗi mới có đủ lời cho bé, phụ huynh', () => {
  const { NH } = moi();
  for (const [kn, x] of Object.entries(KY)) {
    const k = NH.KY_NANG[kn];
    assert.ok(k, kn);
    assert.equal(k.noi_dung, x.nd);
    assert.equal(k.loai, x.loai);
    assert.equal(NH.loaiKyNang(kn), x.loai);
    assert.ok(NH.coLoai(x.loai));
    assert.equal(k.kieu, 'K3');
    assert.ok(NH.THU_TU_KY_NANG.includes(kn));
  }
  for (const m of LOI_MOI) {
    const l = NH.LOI[m];
    assert.ok(l && l.be && l.mo_ta && l.ngan, m);
    assert.ok(/^Con /.test(l.ngan), m + ': nhãn ngắn bắt đầu bằng "Con"');
    [l.be, l.mo_ta, l.ngan].forEach((t) => assert.ok(!/\u2014/.test(t)));
  }
});

/* ---------------- Sinh câu hàng loạt ---------------- */

test('mỗi kỹ năng, mỗi kiểu câu con: 300+ câu đúng đáp án, đúng phạm vi SGK, mã câu ổn định, gợi ý 3 cấp, hình SVG an toàn', () => {
  const { NH } = moi();
  const MA = /^B2\.(6|7|9|10)\|[a-z-]+\|[a-z0-9_:,.+-]+$/;
  for (const [kn, x] of Object.entries(KY)) {
    const rng = NH.taoRng(1234);
    const kieuGap = new Set();
    let dem = 0;
    const lanChay = [null].concat(x.cach.map((c) => [c]));
    for (const cach of lanChay) {
      for (let i = 0; i < (cach ? 70 : 150); i++) {
        const muc = cach ? { ky_nang: kn, cach: cach } : { ky_nang: kn };
        const q = NH.taoCau(kn, null, rng, { muc });
        const ct = q.cau_truc;
        dem++;
        kieuGap.add(ct.kieu);
        if (cach) assert.equal(ct.kieu, cach[0]);
        const nhan = kn + ' ' + JSON.stringify(ct);
        deq(NH.nhanBietLoi(ct, q.dap_an), [], nhan);
        deq(NH.nhanBietLoi(J(ct), J(q.dap_an)), [], nhan + ' (sau JSON)');
        assert.match(q.ma_cau, MA, nhan);
        assert.equal(q.ma_cau, NH.maCau(kn, J(ct)), 'mã câu ổn định');
        assert.equal(q.noi_dung, x.nd);
        kiemPhamVi(kn, ct, q.dap_an);
        assert.equal(q.goi_y.length, 3, nhan);
        q.goi_y.forEach((g, k) => kiemChu(g, nhan + ' gợi ý ' + (k + 1)));
        kiemChu(q.de, nhan + ' đề');
        kiemChu(q.de_doc, nhan + ' đề đọc');
        kiemChu(q.ket_luan, nhan + ' kết luận');
        kiemChu(NH.hienGiaTriCau(ct, q.dap_an), nhan + ' hiện đáp án');
        assert.ok(q.loi_giai && q.loi_giai.ma && Array.isArray(q.loi_giai.buoc) && q.loi_giai.buoc.length >= 1, nhan);
        q.loi_giai.buoc.forEach((b) => kiemChu(b, nhan + ' lời giải'));
        if (q.loi_giai.html) kiemSvg(q.loi_giai.html, nhan + ' hình lời giải');
        kiemSvg(NH.veHinh(ct), nhan + ' hình đề');
        assert.ok(['thao_tac_hinh', 'nhap_so', 'keo_tha'].includes(q.dang), nhan + ' ' + q.dang);
        assert.ok(q.xd && q.xd.canh && q.xd.nhap, nhan + ' thiếu cảnh chơi');
      }
    }
    assert.ok(dem >= 300, kn + ': ' + dem);
    deq([...kieuGap].sort(), x.cach.slice().sort(), kn + ': gặp đủ kiểu câu con');
  }
});

test('dạng chọn đáp án (Đấu Trường, sáu game cũ): 3 hoặc 4 lựa chọn khác nhau, nhiễu mang đúng mã lỗi, đa số có lỗi có tên', () => {
  const { NH } = moi();
  for (const kn of Object.keys(KY)) {
    const rng = NH.taoRng(99);
    let coTenLoi = 0;
    let dem = 0;
    for (let i = 0; i < 240; i++) {
      const q = NH.taoCau(kn, null, rng, { dang: 'chon_dap_an', muc: { ky_nang: kn, dang: 'chon_dap_an' } });
      const ct = q.cau_truc;
      const nhan = kn + ' ' + JSON.stringify(ct);
      assert.notEqual(ct.kieu, 'vach', 'câu rót tới vạch chỉ có trong game');
      if (ct.kieu === 'can' || ct.kieu === 'tru') assert.equal(ct.dat, 1, 'dạng chọn đáp án: quả cân đặt sẵn');
      assert.equal(q.dang, 'chon_dap_an');
      assert.ok(q.lua_chon.length === 3 || q.lua_chon.length === 4, nhan);
      const gt = q.lua_chon.map((x) => String(x.gia_tri));
      assert.equal(new Set(gt).size, gt.length, nhan + ': lựa chọn trùng ' + gt);
      assert.equal(q.lua_chon.filter((x) => x.loi.length === 0).length, 1, nhan);
      assert.ok(q.lua_chon.some((x) => String(x.gia_tri) === String(q.dap_an) && x.loi.length === 0), nhan);
      for (const x of q.lua_chon) {
        if (String(x.gia_tri) === String(q.dap_an)) continue;
        assert.ok(x.loi.length > 0, nhan + ' nhiễu không có mã lỗi');
        deq(x.loi, NH.nhanBietLoi(ct, x.gia_tri), nhan + ' mã lỗi của nhiễu ' + x.gia_tri);
        if (typeof x.gia_tri === 'number') assert.ok(x.gia_tri >= 0, nhan);
        const v = NH.veLuaChon(ct, x.gia_tri);
        kiemChu(v.nhan, nhan + ' nhãn lựa chọn');
        kiemChu(NH.loiNoiVoiBe(ct, x.gia_tri, x.loi), nhan + ' lời nói');
      }
      if (ct.kieu !== 'rot') { dem++; if (q.lua_chon.some((x) => coTen(x.loi))) coTenLoi++; }
    }
    assert.ok(coTenLoi / dem >= 0.6, kn + ': chỉ ' + coTenLoi + '/' + dem + ' câu có nhiễu mang lỗi có tên');
  }
});

test('dạng của game: thao tác trên hình có lựa chọn, kéo thả có 4 hộp đơn vị, nhập số không có lựa chọn; gợi ý riêng cho thao tác', () => {
  const { NH } = moi();
  const rng = NH.taoRng(5);
  const ds = [
    ['can-kg', { loai: 'can_kg', kieu: 'can', vat: 'dua_hau', qp: [2, 1], ke: [5] }],
    ['can-kg', { loai: 'can_kg', kieu: 'can', vat: 'dua_hau', qp: [2, 1], dat: 1 }],
    ['can-kg', { loai: 'can_kg', kieu: 'tinh', a: 5, p: '+', b: 4, dv: 'kg' }],
    ['nang-nhe', { loai: 'nang_nhe', kieu: 'doi_qua', x: 'cam', u: 'chanh', n: 4 }],
    ['rot-lit', { loai: 'rot_lit', kieu: 'rot', vat: 'can', l: 5 }],
    ['rot-lit', { loai: 'rot_lit', kieu: 'vach', l: 5, max: 8 }],
    ['don-vi-do-dai', { loai: 'don_vi_dai', kieu: 'chon_don_vi', vat: 'but_chi', so: 10 }],
    ['do-do-dai', { loai: 'do_dai', kieu: 'lech', vat: 'but_chi', dau: 2, dai: 6 }]
  ];
  const kq = ds.map(([kn, ct]) => NH.taoCau(kn, ct, rng, {}));
  deq(kq.map((q) => [q.dang, q.xd.canh, q.xd.nhap, !!q.xd.tuong_tac]), [
    ['thao_tac_hinh', 'can', 'chon', true], ['thao_tac_hinh', 'can', 'chon', false], ['nhap_so', 'tranh', 'so', false],
    ['thao_tac_hinh', 'can', 'chon', true], ['thao_tac_hinh', 'rot', 'chon', true], ['thao_tac_hinh', 'rot', 'xong', true],
    ['keo_tha', 'phan_loai', 'keo', false], ['nhap_so', 'thuoc', 'so', false]
  ]);
  assert.equal(kq[0].lua_chon.length, 3);
  assert.ok(kq[0].lua_chon.some((x) => x.loi.includes('dem-qua-can') || x.loi.includes('thieu-qua-can')), 'nhiễu đếm số quả cân hoặc cộng sót quả cân');
  assert.match(kq[0].goi_y[0], /Kéo quả cân/);
  assert.match(kq[1].goi_y[0], /Cân nằm ngang/);
  assert.ok(!kq[2].lua_chon, 'nhập số không có lựa chọn');
  deq(kq[6].lua_chon.map((x) => [x.gia_tri, x.vi_tri, x.loi]), [['cm', 'hop_cm', []], ['dm', 'hop_dm', ['nham-don-vi']], ['m', 'hop_m', ['nham-don-vi']], ['km', 'hop_km', ['nham-don-vi']]]);
  assert.ok(!kq[5].lua_chon, 'rót tới vạch: đáp án là lượng nước đã rót');
  assert.equal(kq[4].dap_an, 5);
  assert.match(kq[7].de, /Bút chì dài mấy xăng-ti-mét/);
});

/* ---------------- Công thức lỗi ---------------- */

test('công thức lỗi viết tay (03a mục 3.3): cân đĩa, quả cân, lít, đơn vị độ dài, thước', () => {
  const { NH } = moi();
  const L = (ct, v) => J(NH.nhanBietLoi(ct, v));
  // Nặng hơn, nhẹ hơn: con gấu (đĩa trái lệch xuống) và 3 con chó (Bài 15 Hoạt động 1)
  const gau = { loai: 'nang_nhe', kieu: 'so_sanh', trai: ['gau', 1], phai: ['cho', 3], lech: 'trai', hoi: 'nang' };
  deq(L(gau, 'trai'), []);
  deq(L(gau, 'phai'), ['ben-thap-nhe']);
  deq(L(gau, 'bang'), ['can-thang-bang']);
  deq(L(Object.assign({}, gau, { hoi: 'nhe' }), 'trai'), ['ben-thap-nhe']);
  const qh = Object.assign({}, gau, { hoi: 'quan_he', chu: 'trai' });
  assert.equal(NH.tinh(qh), 'nang_hon');
  deq(L(qh, 'nhe_hon'), ['ben-thap-nhe']);
  deq(L(qh, 'nang_bang'), ['can-thang-bang']);
  assert.equal(NH.deHien(qh), 'Con gấu nặng hơn, nhẹ hơn hay nặng bằng 3 con chó?');
  const bang = { loai: 'nang_nhe', kieu: 'so_sanh', trai: ['dua_hau', 1], phai: ['buoi', 2], lech: 'bang', hoi: 'nang' };
  deq(L(bang, 'bang'), []);
  deq(L(bang, 'trai'), ['can-thang-bang']);
  // Hai cân: chó > mèo > thỏ (Bài 15 Hoạt động 2)
  const tt = { loai: 'nang_nhe', kieu: 'thu_tu', ds: ['cho', 'meo', 'tho'], can: [[1, 2], [1, 0]], hoi: 'nang_nhat' };
  deq(L(tt, 'cho'), []);
  deq(L(tt, 'meo'), ['chi-mot-can']);
  deq(L(tt, 'tho'), ['ben-thap-nhe']);
  assert.equal(NH.tinh(Object.assign({}, tt, { hoi: 'nhe_nhat' })), 'tho');
  // Bưởi = cam + táo; cam = 4 chanh, táo = 3 chanh (Bài 15 Hoạt động 3)
  const cq = { loai: 'nang_nhe', kieu: 'cong_qua', x: 'buoi', a: 'cam', na: 4, b: 'tao', nb: 3, u: 'chanh' };
  assert.equal(NH.tinh(cq), 7);
  deq(L(cq, 4), ['chi-mot-can']);
  deq(L(cq, 6), ['dem-lech']);
  const bc = { loai: 'nang_nhe', kieu: 'bac_cau', x: 'cho', y: 'tho', k1: 2, u: 'ga', k2: 2 };
  assert.equal(NH.tinh(bc), 4);
  deq(L(bc, 2), ['chi-mot-can']);
  // Ki-lô-gam: quả dưa cân bằng quả cân 2 kg và 1 kg
  const can = { loai: 'can_kg', kieu: 'can', vat: 'dua_hau', qp: [2, 1] };
  assert.equal(NH.tinh(can), 3);
  deq(L(can, 2), ['dem-qua-can', 'thieu-qua-can']);
  deq(L(can, 1), ['thieu-qua-can']);
  deq(L(can, 4), ['dem-lech']);
  deq(L({ loai: 'can_kg', kieu: 'can', vat: 'cho', qp: [5, 2] }, 2), ['dem-qua-can', 'thieu-qua-can']);
  deq(L({ loai: 'can_kg', kieu: 'can', vat: 'cho', qp: [5, 2] }, 5), ['thieu-qua-can']);
  // Đĩa có quả dưa và quả cân 1 kg, đĩa kia 3 kg (Bài 73)
  const tru = { loai: 'can_kg', kieu: 'tru', vat: 'dua_hau', qt: [1], qp: [2, 1] };
  assert.equal(NH.tinh(tru), 2);
  deq(L(tru, 3), ['quen-can-cung-dia']);
  deq(L(tru, 4), ['nham-dau']);
  // Ba hộp (Bài 15 Hoạt động 3): A = 1 + 2, B = 2 + 2, C = 5
  const hop = { loai: 'can_kg', kieu: 'so_sanh', hop: [[2, 1], [2, 2], [5]], hoi: 'nang_nhat' };
  assert.equal(NH.tinh(hop), 'c');
  deq(L(hop, 'a'), ['dem-qua-can', 'chieu-dau']);
  deq(L(hop, 'b'), ['dem-qua-can']);
  const hop2 = { loai: 'can_kg', kieu: 'so_sanh', hop: [[2, 2, 1], [2, 2, 2], [5, 2]], hoi: 'nang_nhat' };
  deq(L(hop2, 'b'), ['dem-qua-can']);
  deq(L(Object.assign({}, hop, { hoi: 'nhe_nhat' }), 'c'), ['dem-qua-can', 'chieu-dau']);
  // Cân đồng hồ (Bài 17, 35): hộp quà và quả cân 1 kg, kim chỉ 5
  const dh = { loai: 'can_kg', kieu: 'dong_ho', vat: 'hop_qua', kg: 4, qt: [1] };
  assert.equal(NH.tinh(dh), 4);
  deq(L(dh, 5), ['quen-can-cung-dia']);
  deq(L(dh, 6), ['nham-dau']);
  deq(L(dh, 3), ['doc-sai-vach']);
  deq(L({ loai: 'can_kg', kieu: 'dong_ho', vat: 'vit', kg: 2 }, 3), ['doc-sai-vach']);
  assert.equal(NH.maCau('can-kg', dh), 'B2.9|can-kg|dh:hop_qua+1:5');
  // Phép tính có đơn vị (Bài 15 Luyện tập)
  const kg = { loai: 'can_kg', kieu: 'tinh', a: 9, p: '+', b: 7, dv: 'kg' };
  assert.equal(NH.deHien(kg), '9 kg + 7 kg = ? kg');
  deq(L(kg, 6), ['quen-nho']);
  deq(L(kg, 2), ['nham-dau']);
  deq(L(kg, 15), ['dem-lech']);
  deq(L({ loai: 'can_kg', kieu: 'tinh', a: 13, p: '-', b: 9, dv: 'kg' }, 14), ['quen-muon']);
  // Lít
  deq(L({ loai: 'rot_lit', kieu: 'vach', l: 5, max: 8 }, 6), ['doc-sai-vach']);
  deq(L({ loai: 'rot_lit', kieu: 'doc', l: 6, max: 10, buoc: 2 }, 3), ['dem-vach']);
  deq(L({ loai: 'rot_lit', kieu: 'doc', l: 6, max: 10, buoc: 2 }, 8), ['doc-sai-vach']);
  deq(L({ loai: 'rot_lit', kieu: 'doc', l: 5, max: 8, buoc: 1 }, 4), ['doc-sai-vach']);
  const ss = { loai: 'rot_lit', kieu: 'so_sanh', a: 4, b: 6, hoi: 'nhieu' };
  assert.equal(NH.tinh(ss), 'b');
  deq(L(ss, 'a'), ['cao-hon-nhieu-hon']);
  deq(L(Object.assign({}, ss, { hoi: 'it' }), 'b'), ['cao-hon-nhieu-hon']);
  deq(L(Object.assign({}, ss, { hoi: 'hon' }), 10), ['nham-dau']);
  assert.equal(NH.tinh(Object.assign({}, ss, { hoi: 'hon' })), 2);
  deq(L({ loai: 'rot_lit', kieu: 'tong', vat: 'xo', ds: [5, 2, 1] }, 3), ['dem-so-ca']);
  deq(L({ loai: 'rot_lit', kieu: 'don_vi', vat: 'can_nuoc' }, 'kg'), ['nham-don-vi']);
  assert.equal(NH.tinh({ loai: 'rot_lit', kieu: 'don_vi', vat: 'ga' }), 'kg');
  // Đơn vị độ dài (Bài 55, 58)
  const doi = { loai: 'don_vi_dai', kieu: 'doi', so: 4, tu: 'dm', den: 'cm' };
  assert.equal(NH.tinh(doi), 40);
  deq(L(doi, 400), ['doi-don-vi']);
  deq(L(doi, 4), ['doi-don-vi']);
  deq(L(doi, 41), ['khac']);
  assert.equal(NH.tinh({ loai: 'don_vi_dai', kieu: 'doi', so: 3, tu: 'm', den: 'cm' }), 300);
  deq(L({ loai: 'don_vi_dai', kieu: 'doi', so: 3, tu: 'm', den: 'cm' }, 30), ['doi-don-vi']);
  assert.equal(NH.tinh({ loai: 'don_vi_dai', kieu: 'doi', so: 200, tu: 'cm', den: 'm' }), 2);
  deq(L({ loai: 'don_vi_dai', kieu: 'doi', so: 200, tu: 'cm', den: 'm' }, 20), ['doi-don-vi']);
  assert.equal(NH.tinh({ loai: 'don_vi_dai', kieu: 'doi', so: 1, tu: 'km', den: 'm' }), 1000);
  assert.equal(NH.hienGiaTriCau({ loai: 'don_vi_dai', kieu: 'doi', so: 1, tu: 'km', den: 'm' }, 1000), '1 000 m');
  const sd = { loai: 'don_vi_dai', kieu: 'so_sanh', a: [1, 'm'], b: [90, 'cm'] };
  assert.equal(NH.tinh(sd), '>');
  deq(L(sd, '<'), ['quen-doi-don-vi']);
  deq(L({ loai: 'don_vi_dai', kieu: 'so_sanh', a: [1, 'm'], b: [100, 'cm'] }, '<'), ['quen-doi-don-vi']);
  deq(L({ loai: 'don_vi_dai', kieu: 'so_sanh', a: [3, 'm'], b: [50, 'cm'] }, '<'), ['quen-doi-don-vi']);
  deq(L({ loai: 'don_vi_dai', kieu: 'so_sanh', a: [4, 'm'], b: [50, 'dm'] }, '<'), []);
  deq(L({ loai: 'don_vi_dai', kieu: 'so_sanh', a: [4, 'm'], b: [50, 'dm'] }, '>'), ['doi-don-vi']);
  const dv = { loai: 'don_vi_dai', kieu: 'chon_don_vi', vat: 'ban_hoc', so: 10 };
  assert.equal(NH.tinh(dv), 'dm');
  deq(L(dv, 'cm'), ['nham-don-vi']);
  deq(L(dv, 'kg'), ['khac']);
  assert.equal(NH.deHien(dv), 'Bàn học của Mai dài khoảng 10 ?');
  deq(L({ loai: 'don_vi_dai', kieu: 'tinh', a: 26, p: '+', b: 45, dv: 'dm' }, 61), ['quen-nho']);
  // Thước: bút chì từ vạch 2 tới vạch 8 (thước không đặt ở vạch 0)
  const lech = { loai: 'do_dai', kieu: 'lech', vat: 'but_chi', dau: 2, dai: 6 };
  deq(L(lech, 6), []);
  deq(L(lech, 8), ['do-tu-1']);
  deq(L(lech, 7), ['do-tu-1']);
  deq(L(lech, 5), ['dem-lech']);
  deq(L({ loai: 'do_dai', kieu: 'do', vat: 'que', dai: 9 }, 10), ['do-tu-1']);
  const nt = { loai: 'do_dai', kieu: 'noi_tiep', vat: 'cua_so', lan: 5, thuoc: 2 };
  assert.equal(NH.tinh(nt), 10);
  deq(L(nt, 5), ['dem-so-lan']);
  deq(L(nt, 12), ['dem-lech']);
  // Giá trị lạ không làm hỏng công thức
  deq(L(can, 'abc'), ['khac']);
  deq(L(gau, 42), ['khac']);
});

test('kệ quả cân: chỉ có một cách chọn quả cân cho cân thăng bằng (lỗi đếm số quả cân đo được đúng)', () => {
  const { NH, CDL } = moi();
  const rng = NH.taoRng(42);
  let coKe = 0;
  for (let i = 0; i < 400; i++) {
    const ct = NH.sinh('can-kg', rng, { ky_nang: 'can-kg', cach: [i % 2 ? 'can' : 'tru'] });
    if (!ct.ke) { assert.equal(ct.dat, 1); continue; }
    coKe++;
    const ke = ct.qp.concat(ct.ke);
    assert.ok(ke.length <= 5);
    const dich = ct.qp.reduce((a, b) => a + b, 0);
    deq(CDL.cacCach(ke, dich), [ct.qp.slice().sort((a, b) => b - a).join('+')], JSON.stringify(ct));
  }
  assert.ok(coKe > 150);
  deq(CDL.phanTich(8), [5, 2, 1]);
  deq(CDL.phanTich(4), [2, 2]);
});

test('màn vùng 3: đủ số câu, dạng câu theo cảnh chơi, câu rót tới vạch và cân kéo quả cân có trong màn, cúp trộn ba kỹ năng', () => {
  const { NH, DAO } = moi();
  for (const id of ['v3-m1', 'v3-m2', 'v3-m3', 'v3-m5', 'v3-m6', 'v3-cup']) {
    const m = DAO.man(id);
    assert.equal(m.game, 'xuong-do-luong');
    const ds = NH.lapDanhSach(m, NH.taoRng(7), {});
    assert.equal(ds.length, m.so_cau, id);
    ds.forEach((x) => assert.equal(x.dang, NH.dangMacDinh(x.cau_truc), id));
    if (id === 'v3-cup') assert.ok(new Set(ds.map((x) => x.ky_nang)).size >= 2);
  }
  // qua nhiều hạt giống, màn 2 và 3 có đủ cảnh thao tác
  const kieu = { 'v3-m2': new Set(), 'v3-m3': new Set(), 'v3-m6': new Set() };
  for (let h = 1; h < 40; h++) for (const id of Object.keys(kieu)) NH.lapDanhSach(DAO.man(id), NH.taoRng(h), {}).forEach((x) => kieu[id].add(x.cau_truc.kieu));
  assert.ok(kieu['v3-m2'].has('can') && kieu['v3-m2'].has('tinh'));
  assert.ok(kieu['v3-m3'].has('rot') && kieu['v3-m3'].has('vach'));
  assert.ok(kieu['v3-m6'].has('do') && kieu['v3-m6'].has('lech'));
});

/* ---------------- Phát lại ván theo kịch bản ---------------- */

test('phát lại: ván cân ki-lô-gam ghi kéo, đặt, bỏ quả cân; chọn sai (đếm số quả cân) rồi đúng; gợi ý; xem lời giải; câu sai quay lại', async () => {
  const { w, NK, dh, HT } = moi();
  await NK.khoiDong({ khongDungIndexedDB: true });
  NK.datBe('be_XUONG001');
  const m = { id: 'v3-m2', vung: 3, cau: [{ ky_nang: 'can-kg' }], so_cau: 3 };
  const van = new w.VanChoi({ nk: NK, game: 'xuong-do-luong', vung: 3, man: m, hatGiong: 11 });
  van.batDau({ che_do: 'can' });
  van.hang = []; // câu dựng tay theo kịch bản thay cho danh sách ngẫu nhiên
  const tao = (ct) => van.hienCau(van._taoQ({ ky_nang: 'can-kg', cau_truc: ct, dang: w.NganHang.dangMacDinh(ct) }));
  const dat = (kg, trai, phai) => { van.thaoTac('keo', { doi_tuong: 'qua_can_' + kg + 'kg', tu: 'ke', gia_tri: kg }); dh.toi(600); van.thaoTac('dat', { doi_tuong: 'qua_can_' + kg + 'kg', den: 'dia_phai', gia_tri: kg, trai: trai, phai: phai, thang_bang: trai === phai, cach: 'keo' }); dh.toi(400); };
  // Câu 1: quả dưa 3 kg; bé đặt 5 kg (lệch), bỏ ra, đặt 2 kg rồi 1 kg; chọn 2 (đếm 2 quả cân), rồi chọn 3
  const q1 = tao({ loai: 'can_kg', kieu: 'can', vat: 'dua_hau', qp: [2, 1], ke: [5] });
  assert.equal(q1.dang, 'thao_tac_hinh');
  assert.equal(q1.toiDaLanThu, 2);
  dat(5, 3, 5);
  van.thaoTac('bo_ra', { doi_tuong: 'qua_can_5kg', tu: 'dia_phai', gia_tri: 5, trai: 3, phai: 0, thang_bang: false });
  dat(2, 3, 2);
  dat(1, 3, 3);
  van.thaoTac('chon', { doi_tuong: 'lua_chon', gia_tri: 2, vi_tri: 'lua_chon_1' });
  const k1 = van.traLoi(2, { qua_can: [2, 1], trai: 3, phai: 3, thang_bang: true, so_thao_tac: 4 });
  assert.ok(k1.thuLai);
  deq(k1.loi, ['dem-qua-can', 'thieu-qua-can']);
  assert.match(k1.loiNoi, /đếm số quả cân/);
  van.thaoTac('chon', { doi_tuong: 'lua_chon', gia_tri: 3, vi_tri: 'lua_chon_2' });
  assert.equal(van.traLoi(3, { qua_can: [2, 1], trai: 3, phai: 3, thang_bang: true }).ketQua, 'dung_lan_2');
  // Câu 2: 5 kg + 4 kg, gợi ý hai cấp rồi gõ 9
  const q2 = tao({ loai: 'can_kg', kieu: 'tinh', a: 5, p: '+', b: 4, dv: 'kg' });
  assert.equal(q2.dang, 'nhap_so');
  assert.equal(van.goiY().cap, 1);
  assert.equal(van.goiY().cap, 2);
  van.thaoTac('go_so', { gia_tri: 9, hien_tai: '9' });
  assert.equal(van.traLoi(9, { nhap: '9' }).ketQua, 'dung_sau_goi_y');
  // Câu 3: quả dưa và quả cân 1 kg, bên kia 3 kg; bé nói 3 hai lần: xem lời giải, câu sẽ quay lại
  const q3 = tao({ loai: 'can_kg', kieu: 'tru', vat: 'dua_hau', qt: [1], qp: [2, 1], dat: 1 });
  dh.toi(3000);
  assert.ok(van.traLoi(3).thuLai);
  const k3 = van.traLoi(3);
  assert.ok(k3.canPhanHoi && k3.loiGiai && k3.loiGiai.html);
  deq(k3.loi, ['quen-can-cung-dia']);
  van.phanHoiXem(6.4, 'choi_tiep');
  van.ketThucCauSai();
  assert.ok(van.conCau());
  // câu sai quay lại (chỉ còn nó trong hàng đợi)
  const lai = van.cauTiep();
  assert.equal(lai.ma_cau, q3.ma_cau);
  assert.ok(lai.on_lai);
  assert.equal(van.traLoi(2).ketQua, 'dung_ngay');
  const kq = await van.ketThuc(false, { diem: 240, che_do: 'can' });
  const evs = await NK.docCuaBe('be_XUONG001');
  deq(kiemLuocDo(evs), []);
  const cau1 = evs.filter((e) => e.cau === q1.cau).map((e) => e.loai + (e.loai === 'thao_tac' ? ':' + e.du_lieu.kieu : ''));
  deq(cau1, ['cau_hien', 'thao_tac:keo', 'thao_tac:dat', 'thao_tac:bo_ra', 'thao_tac:keo', 'thao_tac:dat', 'thao_tac:keo', 'thao_tac:dat', 'thao_tac:chon', 'tra_loi', 'thao_tac:chon', 'tra_loi', 'cau_ket_thuc']);
  const hien1 = evs.find((e) => e.loai === 'cau_hien' && e.cau === q1.cau);
  assert.equal(hien1.game, 'xuong-do-luong');
  assert.equal(hien1.du_lieu.dang, 'thao_tac_hinh');
  assert.equal(hien1.du_lieu.ma_cau, 'B2.9|can-kg|can:dua_hau:2+1');
  assert.equal(hien1.du_lieu.lua_chon.length, 3);
  const tl = evs.filter((e) => e.loai === 'tra_loi');
  deq(tl.map((e) => [e.du_lieu.gia_tri, e.du_lieu.dung, e.du_lieu.lan_thu]), [[2, false, 1], [3, true, 2], [9, true, 1], [3, false, 1], [3, false, 2], [2, true, 1]]);
  deq(tl[0].du_lieu.qua_can, [2, 1]);
  const dat1 = evs.find((e) => e.loai === 'thao_tac' && e.du_lieu.kieu === 'dat');
  assert.equal(dat1.du_lieu.phai, 5);
  const cau = HT.tomTatCacCau(kq.suKien);
  deq(cau.map((c) => c.ket_qua), ['dung_lan_2', 'dung_sau_goi_y', 'sai', 'dung_ngay']);
  assert.ok(cau[0].so_lan_doi_y >= 1, 'chọn lần hai là đổi ý');
  assert.ok(cau[0].loi.includes('dem-qua-can'));
  assert.equal(cau[1].goi_y_cap, 2);
  assert.ok(cau[3].sua_duoc_cau);
  assert.equal(kq.dem.suaDuoc, 1);
  const ph = evs.find((e) => e.loai === 'phan_hoi_xem');
  assert.equal(ph.du_lieu.ma_loi_giai, 'can-bot-qua-can');
});

test('phát lại: rót nước (rot, bo_ra), đo bằng thước (keo_thuoc, go_so, xoa), phân loại đơn vị (keo, tha) hợp lệ lược đồ', async () => {
  const { w, NK, dh, HT } = moi();
  await NK.khoiDong({ khongDungIndexedDB: true });
  NK.datBe('be_XUONG002');
  const m = { id: 'v3-m3', vung: 3, cau: [{ ky_nang: 'rot-lit' }], so_cau: 4 };
  const van = new w.VanChoi({ nk: NK, game: 'xuong-do-luong', vung: 3, man: m, hatGiong: 3 });
  van.batDau({ che_do: 'rot' });
  const tao = (kn, ct) => van.hienCau(van._taoQ({ ky_nang: kn, cau_truc: ct, dang: w.NganHang.dangMacDinh(ct) }));
  // Rót đầy can 5 l bằng ca 1 l rồi chọn 5
  tao('rot-lit', { loai: 'rot_lit', kieu: 'rot', vat: 'can', l: 5 });
  for (let l = 1; l <= 5; l++) { van.thaoTac('rot', { doi_tuong: 'ca_1l', den: 'can', gia_tri: l }); dh.toi(800); }
  van.thaoTac('rot', { doi_tuong: 'ca_1l', den: 'can', gia_tri: 5, tran: true });
  van.thaoTac('chon', { doi_tuong: 'lua_chon', gia_tri: 5, vi_tri: 'lua_chon_2' });
  assert.equal(van.traLoi(5, { so_ca: 5 }).ketQua, 'dung_ngay');
  // Rót tới vạch 5 l: rót 6 ca (vạch bên cạnh), bớt 1 l, xong
  tao('rot-lit', { loai: 'rot_lit', kieu: 'vach', l: 5, max: 8 });
  for (let l = 1; l <= 6; l++) van.thaoTac('rot', { doi_tuong: 'ca_1l', den: 'binh', gia_tri: l });
  const kv = van.traLoi(6, { so_ca: 6 });
  assert.ok(kv.thuLai);
  deq(kv.loi, ['doc-sai-vach']);
  van.thaoTac('bo_ra', { doi_tuong: 'nuoc', tu: 'binh', gia_tri: 5 });
  assert.equal(van.traLoi(5, { so_ca: 6, bot: 1 }).ketQua, 'dung_lan_2');
  // Thước đặt ở vạch 2: bé đọc 8 (số ở đầu cuối), kéo thước về vạch 0, xóa, gõ 6
  tao('do-do-dai', { loai: 'do_dai', kieu: 'lech', vat: 'but_chi', dau: 2, dai: 6 });
  van.thaoTac('go_so', { gia_tri: 8, hien_tai: '8' });
  const kt = van.traLoi(8, { nhap: '8', vach_dau: 2 });
  deq(kt.loi, ['do-tu-1']);
  van.thaoTac('keo_thuoc', { doi_tuong: 'thuoc', gia_tri: 0, vach_cuoi: 6, vach_truoc: 2, cach: 'keo' });
  van.thaoTac('xoa', { hien_tai: '' });
  van.thaoTac('go_so', { gia_tri: 6, hien_tai: '6' });
  assert.equal(van.traLoi(6, { nhap: '6', vach_dau: 0 }).ketQua, 'dung_lan_2');
  // Phân loại: thẻ "bàn học dài khoảng 10 ?" thả vào hộp cm rồi hộp dm
  const qd = tao('don-vi-do-dai', { loai: 'don_vi_dai', kieu: 'chon_don_vi', vat: 'ban_hoc', so: 10 });
  assert.equal(qd.dang, 'keo_tha');
  van.thaoTac('keo', { doi_tuong: 'the_vat', gia_tri: 'ban_hoc' });
  van.thaoTac('tha', { doi_tuong: 'the_vat', den: 'hop_cm', gia_tri: 'cm', cach: 'keo' });
  deq(van.traLoi('cm', { hop: 'cm' }).loi, ['nham-don-vi']);
  van.thaoTac('tha', { doi_tuong: 'the_vat', den: 'hop_dm', gia_tri: 'dm', cach: 'cham' });
  assert.equal(van.traLoi('dm', { hop: 'dm' }).ketQua, 'dung_lan_2');
  const kq = await van.ketThuc(false, { diem: 300 });
  const evs = await NK.docCuaBe('be_XUONG002');
  deq(kiemLuocDo(evs), []);
  const kieu = new Set(evs.filter((e) => e.loai === 'thao_tac').map((e) => e.du_lieu.kieu));
  for (const k of ['rot', 'bo_ra', 'go_so', 'xoa', 'keo_thuoc', 'keo', 'tha', 'chon']) assert.ok(kieu.has(k), k);
  const hienDv = evs.find((e) => e.loai === 'cau_hien' && e.du_lieu.dang === 'keo_tha');
  deq(hienDv.du_lieu.lua_chon.map((x) => x.vi_tri), ['hop_cm', 'hop_dm', 'hop_m', 'hop_km']);
  const cau = HT.tomTatCacCau(kq.suKien);
  deq(cau.map((c) => c.ket_qua), ['dung_ngay', 'dung_lan_2', 'dung_lan_2', 'dung_lan_2']);
  assert.ok(cau[2].loi.includes('do-tu-1'));
  assert.equal(cau[2].so_lan_doi_y, 1, 'xóa số là đổi ý');
});

/* ---------------- Bài học và tệp ---------------- */

test('bài học 30 giây ki-lo-gam, lit, do-dai: đăng ký trong game, gắn vào kỹ năng, bước cuối có câu thử, không gạch dài', () => {
  const { w, NH } = moi(null, ['js/phan-hoi.js', 'js/bai-hoc.js', 'js/khung-choi.js', 'js/xuong-do-luong.js']);
  const BH = w.BaiHoc;
  for (const [kn, ma] of Object.entries(w.CauDoLuong.BAI_HOC)) {
    assert.equal(NH.KY_NANG[kn].bai_hoc, ma, kn);
    assert.ok(BH.coBai(ma), ma);
  }
  for (const ma of ['ki-lo-gam', 'lit', 'do-dai']) {
    const bai = BH.BAI[ma];
    assert.ok(bai.ten && bai.buoc.length >= 3, ma);
    bai.buoc.forEach((b, i) => {
      kiemChu(b.chu, ma + ' bước ' + i);
      const h = b.ve();
      assert.ok(typeof h === 'string' && h.length > 20, ma + ' bước ' + i + ' có hình');
      assert.ok(!/undefined|NaN|<script|\son[a-z]+=/.test(h), ma + ' bước ' + i);
    });
    const cuoi = bai.buoc[bai.buoc.length - 1];
    assert.ok(cuoi.thu && cuoi.thu.lua_chon.includes(cuoi.thu.dung), ma);
    [cuoi.thu.dung_noi, cuoi.thu.sai_noi].forEach((t) => kiemChu(t, ma + ' câu thử'));
  }
  assert.match(BH.BAI['ki-lo-gam'].buoc.map((b) => b.chu).join(' '), /Ki-lô-gam viết tắt là kg/);
  assert.match(BH.BAI.lit.buoc.map((b) => b.chu).join(' '), /Lít viết tắt là l/);
  assert.match(BH.BAI['do-dai'].buoc.map((b) => b.chu).join(' '), /1 dm = 10 cm/);
  const g = w.DaoTroChoi['xuong-do-luong'];
  assert.ok(g && g.khung === true && g.san === 'xd-san' && typeof g.batDau === 'function');
  assert.ok(w.XuongDoLuong && typeof w.XuongDoLuong._trangThai === 'function');
});

test('tệp của Xưởng Đo Lường: không có gạch dài, CSS chỉ dùng tiền tố xd-, game nạp sau bai-hoc.js', () => {
  for (const f of ['js/cau-do-luong.js', 'js/xuong-do-luong.js', 'css/xuong-do-luong.css']) {
    const s = fs.readFileSync(path.join(ROOT, 'dao-khung-long', f), 'utf8');
    assert.ok(!s.includes('\u2014'), f + ' có gạch dài');
    assert.ok(!/Math\.random/.test(f === 'js/cau-do-luong.js' ? s : ''), 'ngân hàng câu không dùng Math.random');
  }
  const css = fs.readFileSync(path.join(ROOT, 'dao-khung-long/css/xuong-do-luong.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const boChon = css.replace(/@media[^{]*\{/g, '').replace(/@keyframes\s+[\w-]+\s*\{(?:[^{}]*\{[^}]*\})*[^}]*\}/g, '').split('}').map((x) => x.split('{')[0].trim()).filter(Boolean);
  for (const sel of boChon) sel.split(',').forEach((p) => assert.match(p.trim(), /(^|[\s>+~(])\.xd-|^#xd-/, 'bộ chọn không có tiền tố xd-: ' + p));
  const html = fs.readFileSync(path.join(ROOT, 'dao-khung-long/index.html'), 'utf8');
  assert.ok(html.indexOf('js/bai-hoc.js') < html.indexOf('js/xuong-do-luong.js'));
  assert.ok(html.indexOf('js/cau-do-luong.js') < html.indexOf('js/xuong-do-luong.js'));
});
