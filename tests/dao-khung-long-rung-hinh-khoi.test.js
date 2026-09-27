'use strict';
/* Rừng Hình Khối (vùng 5): kiểm thử ngân hàng câu hình học (cau-hinh-hoc.js) và nhật ký một ván (rung-hinh-khoi.js).
   - Mỗi kỹ năng: 250+ câu sinh ra có đáp án đúng theo nhanBietLoi, mã câu ổn định đúng khuôn, 3 lựa chọn khác nhau,
     nhiễu mang đúng mã lỗi (ít nhất một lỗi có tên), 3 cấp gợi ý, hình SVG hợp lệ, lời giải có hình; đủ mọi cách hỏi.
   - Công thức từng mã lỗi (viết tay theo SGK Bài 25 đến 28, 34, 46, 47, 72).
   - Dạng bàn tương tác: đề, chế độ bàn, lựa chọn thẻ cho bàn cắt giấy.
   - Phát lại một ván qua VanChoi + NhatKy: chuỗi sự kiện và lược đồ v1. Bài học 30 giây đã đăng ký. */
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
  return { w, dh, NK: w.NhatKy, NH: w.NganHang, HT: w.HocTap, DAO: w.Dao, CH: w.CauHinhHoc };
}
function kiemLuocDo(evs) {
  const loi = [];
  evs.forEach((e, i) => { validate(SCHEMA, e).forEach((m) => loi.push('#' + i + ' ' + e.loai + ' ' + m)); });
  return loi;
}

/** Kiểm tra SVG "đúng khuôn": mở bằng <svg có viewBox, thẻ đóng mở cân bằng, không script, không tham chiếu ngoài. */
function svgHopLe(s, ten) {
  assert.match(s, /^<svg [^>]*viewBox="0 0 \d+ \d+"/, ten + ': thiếu viewBox');
  assert.ok(!/<script|on\w+=|href="http|xlink:href="(?!#)/i.test(s), ten + ': có script hoặc tham chiếu ngoài');
  const the = s.match(/<\/?[a-zA-Z][a-zA-Z0-9]*[^>]*?\/?>/g) || [];
  const ngan = [];
  for (const t of the) {
    if (/\/>$/.test(t)) continue;
    const m = t.match(/^<(\/?)([a-zA-Z][a-zA-Z0-9]*)/);
    if (m[1]) { const mo = ngan.pop(); assert.equal(mo, m[2], ten + ': thẻ đóng lệch ' + t); }
    else ngan.push(m[2]);
  }
  assert.equal(ngan.length, 0, ten + ': còn thẻ chưa đóng ' + ngan.join(','));
  // thuộc tính không lặp trong một thẻ
  for (const t of the) {
    const at = (t.match(/\s([a-zA-Z-:]+)=/g) || []).map((x) => x.trim());
    assert.equal(new Set(at).size, at.length, ten + ': thuộc tính lặp trong ' + t.slice(0, 80));
  }
}

const KY_NANG = {
  'nhan-dang-duong': { nd: 'B2.1', cach: ['tim_loai', 'ten_doan', 'dem_doan'] },
  'ba-diem-thang-hang': { nd: 'B2.2', cach: ['tim_bo', 'diem_thu_ba'] },
  'duong-gap-khuc': { nd: 'B2.8', cach: ['do_dai', 'so_doan', 'ten'] },
  'hinh-tu-giac': { nd: 'B2.3', cach: ['chon', 'khong_phai', 'dem', 'dem_ghep'] },
  'ghep-hinh': { nd: 'B2.5', cach: ['hai_manh', 'dem_manh', 'gap_cat'] },
  'khoi-tru-cau': { nd: 'B2.4', cach: ['phan_loai', 'tim_vat', 'dem'] }
};
const KHONG_TEN = new Set(['khac', 'dem-lech']);

/* ---------------- Ngân hàng: 250+ câu mỗi kỹ năng ---------------- */

test('hình học: mỗi kỹ năng sinh 250+ câu đúng đáp án, mã câu ổn định, nhiễu mang mã lỗi, gợi ý và hình hợp lệ', () => {
  const { NH } = moi();
  for (const [kn, info] of Object.entries(KY_NANG)) {
    assert.ok(NH.KY_NANG[kn], 'thiếu kỹ năng ' + kn);
    assert.equal(NH.KY_NANG[kn].noi_dung, info.nd);
    const daGap = new Set();
    const coTen = { co: 0, tong: 0 };
    for (let hg = 1; hg <= 270; hg++) {
      const rng = NH.taoRng(hg * 7919 + kn.length);
      const muc = hg % 3 === 0 ? null : { ky_nang: kn, cach: [info.cach[hg % info.cach.length]] };
      const ct = NH.sinh(kn, rng, muc);
      if (muc) assert.equal(ct.kieu, muc.cach[0], kn + ': muc.cach phải được tôn trọng');
      daGap.add(ct.kieu);
      const q = NH.taoCau(kn, ct, rng, { dang: 'chon_dap_an' });
      const ten = kn + ' ' + q.ma_cau;
      deq(NH.nhanBietLoi(ct, q.dap_an), [], ten + ': đáp án phải đúng');
      assert.match(q.ma_cau, new RegExp('^' + info.nd.replace('.', '\\.') + '\\|' + kn + '\\|[a-z0-9_:,.+-]+$'), ten);
      assert.equal(NH.maCau(kn, J(ct)), q.ma_cau, ten + ': mã câu ổn định sau khi chép JSON');
      assert.ok(JSON.stringify(ct).length < 400, ten + ': cấu trúc gọn');
      // lựa chọn
      assert.equal(q.lua_chon.length, 3, ten);
      const vs = q.lua_chon.map((x) => String(x.gia_tri));
      assert.equal(new Set(vs).size, 3, ten + ': lựa chọn trùng ' + vs);
      assert.equal(q.lua_chon.filter((x) => !x.loi.length).length, 1, ten + ': đúng một đáp án đúng');
      q.lua_chon.forEach((x) => deq(x.loi, NH.nhanBietLoi(ct, x.gia_tri), ten + ': mã lỗi của nhiễu'));
      const nhieu = q.lua_chon.filter((x) => x.loi.length);
      coTen.tong++;
      if (nhieu.some((x) => x.loi.some((m) => !KHONG_TEN.has(m)))) coTen.co++;
      nhieu.forEach((x) => x.loi.forEach((m) => assert.ok(NH.LOI[m], ten + ': mã lỗi chưa đăng ký ' + m)));
      // đáp án số trong phạm vi
      if (typeof q.dap_an === 'number') {
        assert.ok(Number.isInteger(q.dap_an) && q.dap_an >= 1 && q.dap_an <= NH.KY_NANG[kn].gioi_han, ten + ': ngoài phạm vi ' + q.dap_an);
        nhieu.forEach((x) => assert.ok(Number.isInteger(x.gia_tri) && x.gia_tri >= 1 && x.gia_tri <= NH.KY_NANG[kn].gioi_han, ten + ': nhiễu ngoài phạm vi ' + x.gia_tri));
      }
      // gợi ý, lời giải, hình
      assert.equal(q.goi_y.length, 3, ten);
      q.goi_y.forEach((g) => assert.ok(typeof g === 'string' && g.length > 5, ten));
      assert.ok(q.hinh, ten + ': câu hình học phải có hình');
      svgHopLe(q.hinh, ten + ' hinh');
      assert.ok(q.loi_giai && q.loi_giai.buoc.length >= 2 && q.loi_giai.html, ten + ': lời giải có bước và hình');
      svgHopLe(q.loi_giai.html, ten + ' loi_giai');
      assert.ok(q.ket_luan && /^Vậy /.test(q.ket_luan), ten);
      const chu = [q.de, q.ket_luan].concat(q.goi_y, q.loi_giai.buoc, q.lua_chon.map((x) => NH.loiNoiVoiBe(ct, x.gia_tri, x.loi))).join(' ');
      assert.ok(!/\u2014/.test(chu + q.hinh + q.loi_giai.html), ten + ': có gạch ngang dài');
      assert.ok(!/undefined|NaN|\[object/.test(chu + q.hinh), ten + ': chữ hỏng');
      // dạng chọn đáp án (game cũ, Đấu Trường): đề, gợi ý, lời giải không bảo bé chạm, kéo, nối, vẽ
      assert.ok(!/(^|[.!?:,] |^)(Chạm|Kéo|Nối|Vẽ|Đặt ngón tay)|kéo (từ|tới|vào)|chạm (vào|lần)/.test([q.de].concat(q.goi_y, q.loi_giai.buoc, [q.ket_luan]).join(' | ')), ten + ': câu chọn đáp án có lời dặn thao tác');
      assert.equal(q.dang, 'chon_dap_an');
      q.lua_chon.forEach((x) => { const lc = NH.veLuaChon(ct, x.gia_tri); assert.ok(lc && String(lc.nhan).length > 0 && String(lc.nhan).length <= 40, ten + ': nhãn lựa chọn'); if (lc.hinh) svgHopLe(lc.hinh, ten + ' lua_chon'); });
      assert.ok(NH.hienGiaTriCau(ct, q.dap_an).length > 0);
    }
    for (const c of info.cach) assert.ok(daGap.has(c), kn + ': chưa sinh cách hỏi ' + c);
    assert.ok(coTen.co === coTen.tong, kn + ': câu nào cũng có ít nhất một nhiễu mang lỗi có tên (' + coTen.co + '/' + coTen.tong + ')');
  }
});

test('hình học: cùng hạt giống thì cùng danh sách câu; mọi cấu trúc chỉ dùng số nguyên trên lưới', () => {
  const { NH } = moi();
  for (const kn of Object.keys(KY_NANG)) {
    const a = [], b = [];
    const r1 = NH.taoRng(42), r2 = NH.taoRng(42);
    for (let i = 0; i < 30; i++) { a.push(NH.sinh(kn, r1)); b.push(NH.sinh(kn, r2)); }
    deq(a, b, kn);
    a.forEach((ct) => {
      (ct.d || []).forEach((p) => assert.ok(Number.isInteger(p[0]) && Number.isInteger(p[1]) && p[0] >= 0 && p[0] <= 10 && p[1] >= 0 && p[1] <= 6, kn + ' điểm ngoài lưới'));
    });
  }
});

test('ba điểm thẳng hàng: đúng một bộ ba thẳng hàng (tích chéo bằng 0), điểm cách nhau ít nhất 2 ô', () => {
  const { NH, CH } = moi();
  for (let hg = 1; hg <= 300; hg++) {
    const ct = NH.sinh('ba-diem-thang-hang', NH.taoRng(hg));
    assert.equal(CH.boThangHang(ct.d).length, 1, JSON.stringify(ct));
    for (let i = 0; i < ct.d.length; i++) for (let j = i + 1; j < ct.d.length; j++) assert.ok(Math.hypot(ct.d[i][0] - ct.d[j][0], ct.d[i][1] - ct.d[j][1]) >= 2, 'điểm quá gần');
    if (ct.kieu === 'diem_thu_ba') {
      const tren = [2, 3, 4].filter((i) => CH.thangHang(ct.d[0], ct.d[1], ct.d[i]));
      assert.equal(tren.length, 1);
    }
  }
});

test('hình vẽ: mọi tọa độ nằm trong khung 640 × 428 (dạng chọn đáp án, bàn chơi, lời giải); nhãn lựa chọn của game cũ ngắn', () => {
  const { NH, CH } = moi();
  let so = 0;
  for (const kn of Object.keys(KY_NANG)) {
    for (let i = 0; i < 120; i++) {
      const ct = NH.sinh(kn, NH.taoRng(i * 13 + 5));
      for (const o of [{}, { tt: true, nen: false }, { giai: true }]) {
        const svg = CH.veBan(ct, o).replace(/<g transform="translate\([^)]*\) rotate\(35\)"[\s\S]*?<\/g>/, ''); // cái kéo vẽ trong nhóm xoay
        const re = / (x|x1|x2|cx)="(-?[\d.]+)"| (y|y1|y2|cy)="(-?[\d.]+)"/g;
        let m;
        while ((m = re.exec(svg))) { const v = +(m[2] || m[4]); assert.ok(v >= 0 && v <= (m[1] ? 640 : 428), kn + ' ' + ct.kieu + ': ' + m[0]); so++; }
      }
      if (['hinh-tu-giac', 'duong-gap-khuc', 'ba-diem-thang-hang'].includes(kn)) {
        const q = NH.taoCau(kn, ct, NH.taoRng(i), { dang: 'chon_dap_an' });
        q.lua_chon.forEach((x) => assert.ok(String(NH.veLuaChon(ct, x.gia_tri).nhan).length <= 14, kn + ': nhãn dài ' + NH.veLuaChon(ct, x.gia_tri).nhan));
      }
    }
  }
  assert.ok(so > 10000);
});

/* ---------------- Công thức mã lỗi ---------------- */

test('mã lỗi: đoạn thẳng, đường thẳng, đường cong, đường gấp khúc (Bài 25, 28)', () => {
  const { NH } = moi();
  const ct = { loai: 'duong', kieu: 'tim_loai', hoi: 'thang', ds: [{ k: 'doan', t: 'AB', o: [0, 0], v: 0 }, { k: 'thang', t: 'CD', o: [6, 0], v: 0 }, { k: 'cong', t: 'x', o: [0, 4], v: 0 }, { k: 'gap', t: 'MNPQ', o: [6, 4], v: 0 }] };
  deq(NH.nhanBietLoi(ct, 'CD'), []);
  deq(NH.nhanBietLoi(ct, 'DC'), [], 'đọc ngược vẫn đúng');
  deq(NH.nhanBietLoi(ct, 'AB'), ['nham-doan-duong']);
  deq(NH.nhanBietLoi(ct, 'x'), ['nham-thang-cong']);
  deq(NH.nhanBietLoi(ct, 'MNPQ'), ['nham-gap-khuc']);
  deq(NH.nhanBietLoi(ct, 'ZZ'), ['khac']);
  deq(NH.nhanBietLoi(Object.assign({}, ct, { hoi: 'doan' }), 'CD'), ['nham-doan-duong']);
  deq(NH.nhanBietLoi(Object.assign({}, ct, { hoi: 'cong' }), 'QPNM'), ['nham-gap-khuc']);
  deq(NH.nhanBietLoi(Object.assign({}, ct, { hoi: 'gap' }), 'x'), ['nham-gap-khuc']);
  assert.equal(NH.deHien(ct), 'Trong hình vẽ, đâu là đường thẳng?');
  // tên đoạn thẳng
  const td = { loai: 'duong', kieu: 'ten_doan', ten: 'ABCDE', d: [[1, 1], [8, 0], [9, 5], [4, 6], [5, 3]], doan: [1, 3], ke: [[1, 2]] };
  assert.equal(NH.tinh(td), 'BD');
  deq(NH.nhanBietLoi(td, 'DB'), []);
  deq(NH.nhanBietLoi(td, 'BC'), ['nham-ten-doan']);
  deq(NH.nhanBietLoi(td, 'BX'), ['khac']);
  // đếm đoạn: ba điểm M, N, P thẳng hàng có 3 đoạn MN, NP, MP (Bài 28)
  const th = { loai: 'duong', kieu: 'dem_doan', hinh: 'thang_hang', ten: 'MNP', d: [[1, 3], [4, 3], [9, 3]] };
  assert.equal(NH.tinh(th), 3);
  deq(NH.nhanBietLoi(th, 2), ['dem-thieu-doan']);
  // đường gấp khúc qua 4 điểm có 3 đoạn (Bài 34): đếm điểm là dem-diem
  const gk = { loai: 'duong', kieu: 'dem_doan', hinh: 'gap', ten: 'ABCD', d: [[1, 5], [3, 1], [6, 5], [9, 2]] };
  assert.equal(NH.tinh(gk), 3);
  deq(NH.nhanBietLoi(gk, 4), ['dem-diem']);
  deq(NH.nhanBietLoi(gk, 2), ['dem-thieu-doan']);
  // tứ giác có một đường chéo: 5 đoạn; 4 là sót đường chéo và cũng bằng số điểm
  const tgc = { loai: 'duong', kieu: 'dem_doan', hinh: 'tu_giac_cheo', ten: 'ABCD', d: [[1, 1], [8, 0], [9, 5], [2, 6]] };
  assert.equal(NH.tinh(tgc), 5);
  deq(NH.nhanBietLoi(tgc, 4), ['dem-thieu-doan', 'dem-diem']);
  deq(NH.nhanBietLoi(tgc, 6), ['dem-lech']);
  // 4 điểm nối nhau: 6 đoạn (Bài 72)
  assert.equal(NH.tinh({ loai: 'duong', kieu: 'dem_doan', hinh: 'bon_diem', ten: 'ABCD', d: [[1, 1], [9, 0], [8, 6], [2, 5]] }), 6);
});

test('mã lỗi: ba điểm thẳng hàng', () => {
  const { NH } = moi();
  const ct = { loai: 'thang_hang', kieu: 'tim_bo', ten: 'ABCDE', d: [[1, 1], [4, 2], [7, 3], [6, 5], [9, 0]] };
  assert.equal(NH.tinh(ct), 'A,B,C');
  deq(NH.nhanBietLoi(ct, 'C,A,B'), [], 'thứ tự không quan trọng');
  deq(NH.nhanBietLoi(ct, 'A,B,D'), ['nham-thang-hang']);
  deq(NH.nhanBietLoi(ct, 'A,B'), ['khac']);
  assert.equal(NH.hienGiaTriCau(ct, 'C,B,A'), 'A, B, C');
  const d3 = { loai: 'thang_hang', kieu: 'diem_thu_ba', ten: 'ABCDE', d: [[1, 1], [7, 3], [4, 2], [6, 5], [9, 0]] };
  assert.equal(NH.tinh(d3), 'C');
  deq(NH.nhanBietLoi(d3, 'D'), ['nham-thang-hang']);
  deq(NH.nhanBietLoi(d3, 'A'), ['khac']);
  assert.match(NH.loiNoiVoiBe(d3, 'D', ['nham-thang-hang']), /Điểm D nằm lệch ra ngoài đường thẳng đi qua A và B/);
});

test('mã lỗi: độ dài đường gấp khúc (Bài 26: 5 + 4 + 4 = 13; Bài 72: 18 + 9 + 14 = 41)', () => {
  const { NH } = moi();
  const ct = { loai: 'gap_khuc', kieu: 'do_dai', ten: 'ABCD', d: [[1, 5], [4, 5], [6, 2], [9, 5]], l: [5, 4, 4] };
  assert.equal(NH.tinh(ct), 13);
  assert.equal(NH.deHien(ct), 'Tính độ dài đường gấp khúc ABCD.');
  deq(NH.nhanBietLoi(ct, 9), ['dem-thieu-doan'], '13 − 4: sót đoạn BC hoặc CD');
  deq(NH.nhanBietLoi(ct, 8), ['dem-thieu-doan'], '13 − 5: sót đoạn AB');
  deq(NH.nhanBietLoi(ct, 3), ['quen-nho', 'dem-so-doan'], '13 − 10 là quên nhớ, cũng bằng số đoạn');
  deq(NH.nhanBietLoi(ct, 14), ['dem-lech']);
  deq(NH.nhanBietLoi(ct, 20), ['khac']);
  assert.equal(NH.hienGiaTriCau(ct, 13), '13 cm');
  assert.match(NH.loiNoiVoiBe(ct, 8, ['dem-thieu-doan']), /thiếu đoạn AB dài 5 cm/);
  deq(NH.loiGiai(ct).buoc.slice(1, 4), ['Độ dài đường gấp khúc ABCD là:', '5 + 4 + 4 = 13 (cm)', 'Đáp số: 13 cm.']);
  const lon = { loai: 'gap_khuc', kieu: 'do_dai', ten: 'ABCD', d: [[1, 5], [4, 5], [6, 2], [9, 5]], l: [18, 9, 14] };
  assert.equal(NH.tinh(lon), 41);
  deq(NH.nhanBietLoi(lon, 31), ['quen-nho']);
  deq(NH.nhanBietLoi(lon, 27), ['dem-thieu-doan']);
  // số đoạn, tên
  const sd = { loai: 'gap_khuc', kieu: 'so_doan', ten: 'MNPQ', d: [[1, 5], [4, 5], [6, 2], [9, 5]] };
  assert.equal(NH.tinh(sd), 3);
  deq(NH.nhanBietLoi(sd, 4), ['dem-diem']);
  const tn = { loai: 'gap_khuc', kieu: 'ten', ten: 'DEGH', d: [[1, 5], [4, 5], [6, 2], [9, 5]] };
  deq(NH.nhanBietLoi(tn, 'HGED'), [], 'đọc từ đầu kia vẫn đúng');
  deq(NH.nhanBietLoi(tn, 'DGEH'), ['ten-sai-thu-tu']);
  deq(NH.nhanBietLoi(tn, 'DEH'), ['ten-thieu-diem']);
  deq(NH.nhanBietLoi(tn, 'DEGX'), ['khac']);
});

test('mã lỗi: hình tứ giác (Bài 26, 28, 34, 72)', () => {
  const { NH } = moi();
  // Bài 26 hoạt động 2: tam giác, thoi, bình hành, thang vuông, tròn, thang: 4 hình tứ giác
  const ct = { loai: 'tu_giac', kieu: 'dem', h: ['tam_giac.0', 'thoi.0', 'binh_hanh.0', 'thang_vuong.0', 'tron.0', 'thang.0'] };
  assert.equal(NH.tinh(ct), 4);
  deq(NH.nhanBietLoi(ct, 3), ['sot-tu-giac']);
  deq(NH.nhanBietLoi(ct, 5), ['nham-tu-giac']);
  const chon = Object.assign({}, ct, { kieu: 'chon' });
  assert.equal(NH.tinh(chon), '2,3,4,6');
  deq(NH.nhanBietLoi(chon, '6,4,3,2'), []);
  deq(NH.nhanBietLoi(chon, '2,3,4'), ['sot-tu-giac']);
  deq(NH.nhanBietLoi(chon, '1,2,3,4,6'), ['nham-tu-giac']);
  deq(NH.nhanBietLoi(chon, '1,2,3'), ['sot-tu-giac', 'nham-tu-giac']);
  assert.match(NH.loiNoiVoiBe(chon, '1,2,3,4,6', ['nham-tu-giac']), /Hình 1 có 3 cạnh/);
  // Bài 34: hình vuông bị cắt một góc có 5 cạnh
  const kp = { loai: 'tu_giac', kieu: 'khong_phai', h: ['thang.0', 'ngu_giac.0', 'vuong.1', 'tu_giac.0'] };
  assert.equal(NH.tinh(kp), 2);
  deq(NH.nhanBietLoi(kp, 4), ['sot-tu-giac']);
  // Bài 28: hình chữ nhật chia bởi đoạn xiên có 3 tứ giác; ngũ giác chia 3 tam giác có 2 tứ giác
  const cn = { loai: 'tu_giac', kieu: 'dem_ghep', m: 'cn_cheo', lat: 0 };
  assert.equal(NH.tinh(cn), 3);
  deq(NH.nhanBietLoi(cn, 2), ['sot-tu-giac']);
  deq(NH.nhanBietLoi(cn, 4), ['nham-tu-giac']);
  assert.equal(NH.tinh({ loai: 'tu_giac', kieu: 'dem_ghep', m: 'ngu_giac', lat: 0 }), 2);
  assert.equal(NH.tinh({ loai: 'tu_giac', kieu: 'dem_ghep', m: 'ba_dai', lat: 1 }), 6);
});

test('mã lỗi: ghép, xếp, gấp cắt hình (Bài 27, 34)', () => {
  const { NH, CH } = moi();
  // Bài 27 bài 4a: tam giác nhỏ và hình thang ghép thành tam giác lớn; mảnh cao hơn làm thừa
  const g1 = { loai: 'ghep_hinh', kieu: 'hai_manh', m: 'g1', th: [0, 1, 2] };
  assert.equal(NH.tinh(g1), '1,3');
  deq(NH.nhanBietLoi(g1, '3,1'), []);
  deq(NH.nhanBietLoi(g1, '2,3'), ['ghep-sai-kich-thuoc']);
  // Hình chữ nhật 3 × 2: tam giác đủ diện tích nhưng không khớp
  const g3 = { loai: 'ghep_hinh', kieu: 'hai_manh', m: 'g3', th: [2, 0, 1] };
  assert.equal(NH.tinh(g3), '2,3');
  deq(NH.nhanBietLoi(g3, '1,2'), ['ghep-sai-hinh']);
  deq(NH.nhanBietLoi(g3, '1'), ['khac']);
  // Mỗi mẫu: diện tích hai mảnh đúng bằng hình mẫu
  for (const [m, g] of Object.entries(CH.MAU_GHEP)) {
    const dung = g.manh.filter((x) => x.c);
    assert.equal(dung.length, 2, m);
    assert.equal(dung.reduce((a, x) => a + CH.dienTich2(x.p), 0), CH.dienTich2(g.khuon), m + ': hai mảnh đúng lấp đủ khuôn');
    dung.forEach((x) => assert.equal(CH.dienTich2(x.c), CH.dienTich2(x.p), m + ': chỗ đặt cùng diện tích mảnh'));
  }
  // Bài 34: hình B gồm nửa ô + ô + nửa ô và một ô bên dưới: 6 hình A
  const b1 = { loai: 'ghep_hinh', kieu: 'dem_manh', m: 'b1' };
  assert.equal(NH.tinh(b1), 6);
  deq(NH.nhanBietLoi(b1, 3), ['dem-o-vuong'], 'đếm 3 ô vuông');
  deq(NH.nhanBietLoi(b1, 4), ['dem-o-vuong'], 'đếm 4 phần');
  deq(NH.nhanBietLoi(b1, 7), ['dem-lech']);
  // Bài 27: gấp hình vuông theo hai đường chéo, cắt được 4 hình tam giác
  const c = { loai: 'ghep_hinh', kieu: 'gap_cat', m: 'vuong_2cheo' };
  assert.equal(NH.tinh(c), '4:tam_giac');
  assert.equal(NH.hienGiaTriCau(c, '4:tam_giac'), '4 hình tam giác');
  deq(NH.nhanBietLoi(c, '2:tam_giac'), ['dem-net-cat']);
  deq(NH.nhanBietLoi(c, '4:vuong'), ['nham-ten-hinh']);
  deq(NH.nhanBietLoi(c, '3:tam_giac'), ['dem-lech']);
  deq(NH.nhanBietLoi(c, '2:vuong'), ['nham-ten-hinh', 'dem-net-cat']);
});

test('mã lỗi: khối trụ, khối cầu (Bài 46, 47)', () => {
  const { NH } = moi();
  deq(NH.nhanBietLoi({ loai: 'khoi', kieu: 'phan_loai', v: 'lon_sua' }, 'tru'), []);
  deq(NH.nhanBietLoi({ loai: 'khoi', kieu: 'phan_loai', v: 'lon_sua' }, 'cau'), ['nham-khoi']);
  deq(NH.nhanBietLoi({ loai: 'khoi', kieu: 'phan_loai', v: 'trung' }, 'khac'), [], 'quả trứng không phải khối cầu');
  deq(NH.nhanBietLoi({ loai: 'khoi', kieu: 'phan_loai', v: 'trung' }, 'cau'), ['nham-khoi']);
  assert.equal(NH.deHien({ loai: 'khoi', kieu: 'phan_loai', v: 'dia_cau' }), 'Quả địa cầu có dạng khối gì?');
  const tv = { loai: 'khoi', kieu: 'tim_vat', hoi: 'cau', vat: ['lon_sua', 'trung', 'bong_da'] };
  assert.equal(NH.tinh(tv), 'bong_da');
  deq(NH.nhanBietLoi(tv, 'trung'), ['nham-khoi']);
  assert.equal(NH.hienGiaTriCau(tv, 'bong_da'), 'C (quả bóng đá)');
  const lc = NH.veLuaChon(tv, 'bong_da');
  assert.ok(lc.hinh && /viewBox/.test(lc.hinh) && lc.nhan === 'C quả bóng đá');
  // đếm: 3 khối cầu, 2 khối trụ, 1 quả trứng
  const dm = { loai: 'khoi', kieu: 'dem', hoi: 'cau', vat: ['bong_da', 'lon_sua', 'qua_cam', 'trung', 'ong_tre', 'vien_bi'] };
  assert.equal(NH.tinh(dm), 3);
  deq(NH.nhanBietLoi(dm, 4), ['nham-khoi'], 'đếm cả quả trứng');
  deq(NH.nhanBietLoi(dm, 5), ['nham-khoi'], 'đếm cả khối trụ');
  deq(NH.nhanBietLoi(dm, 2), ['dem-lech']);
});

test('mã lỗi mới có đủ lời nói với bé, giải nghĩa cho phụ huynh và nhãn ngắn, không có gạch ngang dài', () => {
  const { NH } = moi();
  const ma = ['nham-doan-duong', 'nham-thang-cong', 'nham-gap-khuc', 'nham-ten-doan', 'dem-thieu-doan', 'dem-diem', 'dem-so-doan', 'nham-thang-hang', 'ten-sai-thu-tu', 'ten-thieu-diem',
    'nham-tu-giac', 'sot-tu-giac', 'ghep-sai-kich-thuoc', 'ghep-sai-hinh', 'dem-o-vuong', 'dem-net-cat', 'nham-ten-hinh', 'nham-khoi'];
  for (const m of ma) {
    const l = NH.LOI[m];
    assert.ok(l && l.be && l.mo_ta && /^Con /.test(l.ngan), m);
    assert.ok(!/\u2014/.test(l.be + l.mo_ta + l.ngan), m);
    assert.ok(!/\.$/.test(l.be), m + ': lời nói với bé không kết thúc bằng dấu chấm (khung chơi tự thêm)');
  }
});

/* ---------------- Dạng bàn tương tác ---------------- */

test('bàn tương tác: đề thao tác, chế độ bàn, dạng câu ghi nhật ký; bàn cắt giấy có thẻ đáp án', () => {
  const { NH, CH } = moi();
  const cheDo = new Set();
  for (const kn of Object.keys(KY_NANG)) {
    for (let hg = 1; hg <= 60; hg++) {
      const rng = NH.taoRng(hg * 31);
      const ct = NH.sinh(kn, rng, { ky_nang: kn, cach: [KY_NANG[kn].cach[hg % KY_NANG[kn].cach.length]] });
      const dang = CH.dangTuongTac(ct);
      assert.ok(['thao_tac_hinh', 'keo_tha', 'nhap_so'].includes(dang));
      const q = NH.taoCau(kn, ct, rng, { dang: dang });
      assert.equal(q.che_do, CH.cheDo(ct));
      cheDo.add(q.che_do);
      assert.equal(q.goi_y.length, 3);
      assert.ok(q.de && !/\u2014/.test(q.de));
      if (q.che_do === 'cat') { assert.equal(q.lua_chon.length, 3); assert.equal(q.lua_chon.filter((x) => !x.loi.length).length, 1); }
      const ban = CH.veBan(ct, { tt: true, nen: false });
      svgHopLe(ban, kn + ' bàn');
      assert.ok(/class="rh-lop"/.test(ban), 'bàn có lớp phủ');
      const giai = CH.veBan(ct, { giai: true, nen: false });
      svgHopLe(giai, kn + ' bàn lời giải');
      // câu vẫn đúng đáp án và mã câu giống dạng chọn đáp án
      assert.equal(q.ma_cau, NH.maCau(kn, ct));
    }
  }
  for (const c of ['chon1', 'chon_n', 'noi', 'dem_doan', 'cong_doan', 'theo_thu_tu', 'danh_dau', 'keo_ro', 'keo_dem', 'ghep2', 'lap_manh', 'cat']) assert.ok(cheDo.has(c), 'thiếu chế độ ' + c);
  const q = NH.taoCau('ba-diem-thang-hang', { loai: 'thang_hang', kieu: 'tim_bo', ten: 'ABCDE', d: [[1, 1], [4, 2], [7, 3], [6, 5], [9, 0]] }, NH.taoRng(1), { dang: 'thao_tac_hinh' });
  assert.equal(q.de, 'Chạm vào ba điểm thẳng hàng.');
  assert.match(q.goi_y[1], /sợi dây/);
  const qMC = NH.taoCau('ba-diem-thang-hang', q.cau_truc, NH.taoRng(1), { dang: 'chon_dap_an' });
  assert.equal(qMC.de, 'Ba điểm nào thẳng hàng?');
});

test('đảo: các màn vùng 5 dùng kỹ năng có trong ngân hàng, đủ câu cho mỗi ván; màn luyện tập của game cũ là chọn đáp án có hình', () => {
  const { NH, DAO } = moi();
  const v = DAO.vung(5);
  v.man.forEach((m) => {
    m.cau.forEach((x) => assert.ok(NH.KY_NANG[x.ky_nang], m.id + ': ' + x.ky_nang));
    const ds = NH.lapDanhSach(m, NH.taoRng(5), {});
    assert.equal(ds.length, m.so_cau, m.id);
    ds.forEach((x) => {
      const q = NH.taoCau(x.ky_nang, x.cau_truc, NH.taoRng(9), { dang: x.dang });
      if (m.game !== 'rung-hinh-khoi') { assert.equal(q.dang, 'chon_dap_an', m.id); assert.equal(q.lua_chon.length, 3); assert.ok(q.hinh); }
    });
  });
  const kn = DAO.kyNangCuaVung(v);
  for (const k of ['nhan-dang-duong', 'ba-diem-thang-hang', 'duong-gap-khuc', 'hinh-tu-giac', 'ghep-hinh', 'khoi-tru-cau']) assert.ok(kn.includes(k), k);
});

/* ---------------- Phát lại một ván ---------------- */

test('phát lại: ván Rừng Hình Khối ghi nối đoạn, chọn điểm, đếm, kéo vào rổ, gõ số; sai thử lại, sai hẳn xem lời giải (lược đồ v1)', async () => {
  const ctx = moi();
  const { w, NK, NH, CH, dh, HT } = ctx;
  await NK.khoiDong({ khongDungIndexedDB: true });
  NK.datBe('be_RUNG0001');
  const m = { id: 'v5-thu', vung: 5, cau: [{ ky_nang: 'nhan-dang-duong' }], so_cau: 1 };
  const van = new w.VanChoi({ nk: NK, game: 'rung-hinh-khoi', vung: 5, man: m, nguon: 'tu_chon', hatGiong: 55 });
  van.hang.forEach((x) => { x.dang = CH.dangTuongTac(x.cau_truc); });
  van.batDau({ ban_tuong_tac: true });
  const cau = (kn, ct) => van.hienCau(van._taoQ({ ky_nang: kn, cau_truc: ct, dang: CH.dangTuongTac(ct) }));

  // 1. Nối đoạn thẳng BD: nối nhầm BC, rồi nối lại BD (đúng lần 2)
  let q = cau('nhan-dang-duong', { loai: 'duong', kieu: 'ten_doan', ten: 'ABCDE', d: [[1, 1], [8, 0], [9, 5], [4, 6], [5, 3]], doan: [1, 3], ke: [[1, 2]] });
  assert.equal(q.dang, 'thao_tac_hinh');
  assert.equal(q.de, 'Nối hai điểm để được đoạn thẳng BD.');
  dh.toi(2000);
  van.thaoTac('noi', { doi_tuong: 'doan_thang', tu: 'B', den: 'C', gia_tri: 'BC', cach: 'keo' });
  let k = van.traLoi('BC', { tu: 'B', den: 'C' });
  assert.ok(k.thuLai);
  deq(k.loi, ['nham-ten-doan']);
  van.thaoTac('noi', { doi_tuong: 'doan_thang', tu: 'D', den: 'B', gia_tri: 'DB', cach: 'keo' });
  assert.equal(van.traLoi('DB', { tu: 'D', den: 'B' }).ketQua, 'dung_lan_2');

  // 2. Ba điểm thẳng hàng: căng sợi dây, chọn 3 điểm, đúng ngay
  q = cau('ba-diem-thang-hang', { loai: 'thang_hang', kieu: 'tim_bo', ten: 'ABCDE', d: [[1, 1], [4, 2], [7, 3], [6, 5], [9, 0]] });
  van.thaoTac('noi', { doi_tuong: 'soi_day', tu: 'A', den: 'C', gia_tri: 'AC' });
  ['A', 'B', 'C'].forEach((t, i) => van.thaoTac('chon', { doi_tuong: 'diem', gia_tri: t, dang_chon: ['A', 'B', 'C'].slice(0, i + 1), x: 0.2, y: 0.3 }));
  assert.equal(van.traLoi('A,B,C', { thu_tu_cham: 'ABC' }).ketQua, 'dung_ngay');

  // 3. Độ dài đường gấp khúc: chạm hai đoạn (sót một), gõ 9, rồi gõ 8: sai hẳn, xem lời giải
  q = cau('duong-gap-khuc', { loai: 'gap_khuc', kieu: 'do_dai', ten: 'ABCD', d: [[1, 5], [4, 5], [6, 2], [9, 5]], l: [5, 4, 4] });
  assert.equal(q.dang, 'nhap_so');
  van.thaoTac('cham', { doi_tuong: 'doan_thang', gia_tri: 5, doan: 'AB', bieu_thuc: '5' });
  van.thaoTac('cham', { doi_tuong: 'doan_thang', gia_tri: 4, doan: 'BC', bieu_thuc: '5+4' });
  van.thaoTac('go_so', { gia_tri: 9, hien_tai: '9' });
  k = van.traLoi(9, { nhap: '9', cac_doan: ['AB', 'BC'], bieu_thuc: '5+4' });
  deq(k.loi, ['dem-thieu-doan']);
  van.thaoTac('xoa', { doi_tuong: 'so', gia_tri: '' });
  assert.ok(van.goiY().cap === 1);
  van.thaoTac('go_so', { gia_tri: 8, hien_tai: '8' });
  k = van.traLoi(8, { nhap: '8' });
  assert.ok(k.canPhanHoi && k.loiGiai && /svg/.test(k.loiGiai.html));
  van.phanHoiXem(6.2, 'choi_tiep');
  van.ketThucCauSai();

  // 4. Phân loại: thả quả trứng vào rổ khối cầu (sai), rồi rổ khối khác
  q = cau('khoi-tru-cau', { loai: 'khoi', kieu: 'phan_loai', v: 'trung' });
  assert.equal(q.dang, 'keo_tha');
  van.thaoTac('keo', { doi_tuong: 'do_vat', gia_tri: 'trung', vi_tri: 'ban' });
  van.thaoTac('tha', { doi_tuong: 'do_vat', gia_tri: 'trung', den: 'ro_cau', cach: 'keo' });
  assert.ok(van.traLoi('cau', { ro: 'cau' }).thuLai);
  van.thaoTac('tha', { doi_tuong: 'do_vat', gia_tri: 'trung', den: 'ro_khac', cach: 'cham' });
  assert.equal(van.traLoi('khac', { ro: 'khac' }).ketQua, 'dung_lan_2');

  // 5. Đếm đoạn thẳng: đánh dấu MN, NP rồi kéo M tới P
  q = cau('nhan-dang-duong', { loai: 'duong', kieu: 'dem_doan', hinh: 'thang_hang', ten: 'MNP', d: [[1, 3], [4, 3], [9, 3]] });
  van.thaoTac('dem', { doi_tuong: 'doan_thang', gia_tri: 'MN', so_da_dem: 1, cach: 'cham' });
  van.thaoTac('dem', { doi_tuong: 'doan_thang', gia_tri: 'NP', so_da_dem: 2, cach: 'cham' });
  van.thaoTac('noi', { doi_tuong: 'doan_thang', tu: 'M', den: 'P', gia_tri: 'MP', co_trong_hinh: true });
  van.thaoTac('dem', { doi_tuong: 'doan_thang', gia_tri: 'MP', so_da_dem: 3, cach: 'keo' });
  assert.equal(van.traLoi(3, { doan: ['MN', 'NP', 'MP'] }).ketQua, 'dung_ngay');

  const kq = await van.ketThuc(false, { diem: 380, so_cau_dung: 4 });
  const evs = await NK.docCuaBe('be_RUNG0001');
  deq(kiemLuocDo(evs), []);
  const loai = evs.filter((e) => e.van).map((e) => e.loai + (e.loai === 'thao_tac' ? ':' + e.du_lieu.kieu : ''));
  deq(loai.slice(0, 7), ['van_bat_dau', 'cau_hien', 'thao_tac:noi', 'tra_loi', 'thao_tac:noi', 'tra_loi', 'cau_ket_thuc']);
  const hien = evs.filter((e) => e.loai === 'cau_hien');
  deq(hien.map((e) => e.du_lieu.dang), ['thao_tac_hinh', 'thao_tac_hinh', 'nhap_so', 'keo_tha', 'thao_tac_hinh']);
  assert.equal(hien[0].du_lieu.ma_cau, 'B2.1|nhan-dang-duong|ten-doan:bd.abcde.b1i0j5e6f3');
  assert.equal(hien[2].du_lieu.ma_cau, 'B2.8|duong-gap-khuc|gk:5+4+4.abcd.b5e5g2j5');
  assert.ok(evs.some((e) => e.loai === 'phan_hoi_xem' && e.du_lieu.ma_loi_giai === 'do-dai-gap-khuc'));
  assert.ok(evs.some((e) => e.loai === 'goi_y' && e.du_lieu.cap === 1));
  const cauT = HT.tomTatCacCau(kq.suKien);
  assert.equal(cauT.length, 5);
  deq(cauT.map((c) => c.ket_qua), ['dung_lan_2', 'dung_ngay', 'sai', 'dung_lan_2', 'dung_ngay']);
  deq(cauT[2].loi, ['dem-thieu-doan'], '9 và 8 đều là sót một đoạn');
  assert.equal(kq.dem.sai, 1);
  const vk = evs.find((e) => e.loai === 'van_ket_thuc');
  assert.equal(vk.game, 'rung-hinh-khoi');
  assert.equal(vk.vung, 5);
  void NH;
});

/* ---------------- Bài học 30 giây ---------------- */

test('bài học 30 giây: đủ 4 bài của vùng 5, bước cuối có câu thử, hình SVG hợp lệ, không gạch ngang dài', () => {
  const w = loadGame('dao-khung-long', FILES.concat(['js/phan-hoi.js', 'js/bai-hoc.js', 'js/khung-choi.js', 'js/rung-hinh-khoi.js']));
  const BH = w.BaiHoc, NH = w.NganHang;
  assert.ok(w.DaoTroChoi['rung-hinh-khoi'] && w.DaoTroChoi['rung-hinh-khoi'].khung && w.DaoTroChoi['rung-hinh-khoi'].san === 'rh-san');
  assert.ok(typeof w.RungHinhKhoi.batDau === 'function');
  for (const ma of ['diem-doan-thang', 'duong-gap-khuc', 'hinh-tu-giac', 'khoi-tru-cau']) {
    const bai = BH.BAI[ma];
    assert.ok(bai, 'thiếu bài học ' + ma);
    assert.ok(bai.buoc.length >= 3);
    bai.buoc.forEach((b, i) => { assert.ok(b.chu && !/\u2014/.test(b.chu), ma + ' ' + i); svgHopLe(b.ve(), ma + ' bước ' + i); });
    const cuoi = bai.buoc[bai.buoc.length - 1];
    assert.ok(cuoi.thu && cuoi.thu.lua_chon.includes(cuoi.thu.dung), ma);
  }
  const can = new Set(Object.values(NH.KY_NANG).map((k) => k.bai_hoc).filter(Boolean));
  for (const ma of ['diem-doan-thang', 'duong-gap-khuc', 'hinh-tu-giac', 'khoi-tru-cau']) assert.ok(can.has(ma), 'kỹ năng trỏ tới bài học ' + ma);
  assert.match(BH.BAI['duong-gap-khuc'].buoc[2].chu, /2 cm \+ 5 cm \+ 3 cm = 10 cm/);
});
