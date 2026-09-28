'use strict';
/* Đảo Khủng Long: kiểm thử nội dung sửa theo nhóm C, D của lần rà soát 2026-09-28 (không cần trình duyệt).
   - D1: tên thành phần (2.14 Bài 3; 2.23 Bài 38, 42) và quan hệ nhân, chia (2.24), màn mới ở vùng 1, vùng 7; 2.25 ngoài SGK.
   - D2: bài toán có lời văn trong phạm vi 1000 (Truyện Tranh vùng 8), số thật theo từng đề.
   - D3: bước 1 Truyện Tranh có thẻ lấy số bé trừ số lớn; đề nói số bé trước, "kém", "ngắn hơn", "thấp hơn", tuổi.
   - D4: nhiễu cộng, trừ qua 10 theo cách tách 10 của SGK; màn Bài 5 ở vùng 1; màn có nhớ vùng 4 trộn câu không nhớ.
   - D5: độ khó theo mức thành thạo (cùng hạt giống thì cùng câu); so sánh biểu thức với một số; ba bài học 30 giây.
   - D6: đảo thứ tự thừa số cho chọn lại ở mọi game; gợi ý tìm số còn thiếu kiểu lớp 2; số thật ở bài kg, lít; câu chữ. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./lib/load.js');

const FILES = ['js/nhat-ky.js', 'js/ngan-hang.js', 'js/cau-so-sanh.js', 'js/cau-do-luong.js', 'js/cau-tien.js', 'js/cau-thong-ke.js', 'js/cau-hinh-hoc.js',
  'js/cau-thoi-gian.js', 'js/hoc-tap.js', 'js/dao.js', 'js/ho-so.js', 'js/van-choi.js'];
const J = (x) => (x === undefined ? x : JSON.parse(JSON.stringify(x)));
const MA_CAU = /^[0-9BC.]+\|[a-z0-9-]+\|[a-z0-9_:,.+=?-]+$/;

function moi(them) {
  const w = loadGame('dao-khung-long', FILES.concat(them || []));
  return { w, NH: w.NganHang, DAO: w.Dao };
}

function nkGia() {
  let n = 0;
  return {
    batDauVan: () => 'v', cauHien: () => 'c' + (++n), thaoTac: () => null, goiY: () => null, traLoi: () => null,
    msTrongCau: () => 3000, cauKetThuc: () => null, phanHoiXem: () => null, ketThucVan: () => Promise.resolve([])
  };
}

/** Mọi chữ của một câu (để kiểm không có dấu gạch dài, không còn chỗ trống, không undefined). */
function chuCua(q) {
  return [q.de, q.de_doc, q.the, q.ket_luan].concat(q.goi_y, (q.loi_giai && q.loi_giai.buoc) || [], q.khung || []).join(' | ');
}

/** Kiểm một câu chọn đáp án: đúng một lựa chọn đúng, không trùng, mỗi lựa chọn có nhãn, chữ sạch. */
function kiemChonDapAn(NH, q, ten) {
  const gt = q.lua_chon.map((x) => String(x.gia_tri));
  assert.ok(gt.length >= 2 && gt.length <= 4, ten + ': ' + gt);
  assert.equal(new Set(gt).size, gt.length, ten + ' trùng lựa chọn ' + gt);
  assert.equal(q.lua_chon.filter((x) => NH.nhanBietLoi(q.cau_truc, x.gia_tri).length === 0).length, 1, ten + ': đúng một đáp án đúng');
  assert.ok(q.lua_chon.some((x) => String(x.gia_tri) === String(q.dap_an)), ten);
  for (const x of q.lua_chon) {
    const ve = NH.veLuaChon(q.cau_truc, x.gia_tri);
    assert.ok(ve && String(ve.nhan || '').length, ten + ': lựa chọn có nhãn');
    J(x.loi).forEach((m) => assert.ok(NH.LOI[m], ten + ': mã lỗi lạ ' + m));
  }
  assert.equal(q.goi_y.length, 3, ten);
  assert.ok(q.loi_giai && q.loi_giai.buoc.length >= 2, ten);
  assert.match(q.ma_cau, MA_CAU, ten);
  const chu = chuCua(q);
  assert.ok(!/\u2014|undefined|NaN|[{}]/.test(chu), ten + ': ' + chu);
}

/* ---------------- D1: tên thành phần, quan hệ nhân chia ---------------- */

test('D1: kỹ năng tên thành phần và quan hệ nhân chia: mã nội dung, câu chọn đáp án đúng một đáp án, đủ các kiểu', () => {
  const { NH } = moi();
  assert.equal(NH.KY_NANG['ten-thanh-phan-cong-tru'].noi_dung, '2.14');
  assert.equal(NH.KY_NANG['ten-thanh-phan-nhan-chia'].noi_dung, '2.23');
  assert.equal(NH.KY_NANG['nhan-chia-lien-he'].noi_dung, '2.24');
  const rng = NH.taoRng(314);
  for (const kn of ['ten-thanh-phan-cong-tru', 'ten-thanh-phan-nhan-chia', 'nhan-chia-lien-he']) {
    const kieu = new Set(), phep = new Set();
    for (let i = 0; i < 400; i++) {
      const q = NH.taoCau(kn, null, rng, { dang: 'chon_dap_an' });
      kiemChonDapAn(NH, q, kn + ' ' + q.ma_cau);
      const ct = q.cau_truc;
      kieu.add(ct.kieu || ct.an);
      phep.add(ct.phep || 'x:');
      const so = ct.so.concat([NH.tinh(Object.assign({}, ct, { kieu: 'tinh' }))]);
      if (ct.loai === 'thanh_phan') {
        assert.equal(new Set(so).size, 3, kn + ': ba số khác nhau ' + so);
        so.forEach((n) => assert.ok(Number.isInteger(n) && n > 0 && n <= 100, kn + ' ' + so));
        if (ct.phep === '+' || ct.phep === '-') {
          const a = ct.so[0], b = ct.so[1];
          assert.ok(ct.phep === '+' ? a + b <= 10 || (a % 10) + (b % 10) <= 9 : (b % 10) <= (a % 10) || a < 10, 'Bài 3 không nhớ: ' + q.de);
        }
        if (ct.kieu === 'ten') {
          assert.ok(q.lua_chon.every((x) => typeof x.gia_tri === 'string'), q.de);
          assert.match(q.hinh || '', /^<svg/, 'đề gọi tên có sơ đồ');
        }
        if (ct.kieu === 'so' && (ct.phep === '+' || ct.phep === '×')) assert.equal(ct.vi_tri, 2, 'chỉ hỏi tổng, tích (số hạng, thừa số có hai số)');
      } else {
        const c = ct.so[0] * ct.so[1];
        assert.ok(ct.so.includes(2) || ct.so.includes(5), 'bảng nhân 2, 5: ' + q.de);
        assert.notEqual(ct.so[0], ct.so[1]);
        assert.ok(c <= 50);
      }
    }
    if (kn !== 'nhan-chia-lien-he') { assert.deepEqual([...kieu].sort(), ['so', 'ten', 'tinh'], kn); assert.equal(phep.size, 2, kn); }
    else assert.deepEqual([...kieu].sort(), ['so_bi_chia', 'so_chia', 'thuong']);
  }
});

test('D1: gọi tên lỗi: nhầm tổng với số hạng, tổng với hiệu, tích với thương, viết phép chia nhầm vai', () => {
  const { NH } = moi();
  const ten = { loai: 'thanh_phan', kieu: 'ten', phep: '+', so: [6, 3], vi_tri: 2 };
  assert.equal(NH.tinh(ten), 'tong');
  assert.equal(NH.deHien(ten), 'Trong 6 + 3 = 9, số 9 gọi là gì?');
  assert.deepEqual(J(NH.nhanBietLoi(ten, 'so_hang')), ['ten-thanh-phan']);
  assert.deepEqual(J(NH.nhanBietLoi(ten, 'hieu')), ['ten-thanh-phan']);
  assert.match(NH.loiNoiVoiBe(ten, 'hieu', ['ten-thanh-phan']), /^Hiệu là kết quả của phép trừ\. Số 9 là kết quả của phép cộng, gọi là tổng$/);
  assert.equal(NH.hienGiaTriCau(ten, 'so_bi_chia'), 'Số bị chia');
  assert.equal(NH.maCau('ten-thanh-phan-cong-tru', ten), '2.14|ten-thanh-phan-cong-tru|ten:6+3=9:2');
  const so = { loai: 'thanh_phan', kieu: 'so', phep: '-', so: [12, 2], vi_tri: 1 };
  assert.equal(NH.deHien(so), 'Trong 12 − 2 = 10, số trừ là số nào?');
  assert.equal(NH.tinh(so), 2);
  assert.deepEqual(J(NH.nhanBietLoi(so, 12)), ['ten-thanh-phan']);
  assert.deepEqual(J(NH.nhanBietLoi(so, 7)), ['khac']);
  const tinh = { loai: 'thanh_phan', kieu: 'tinh', phep: '+', so: [42, 35] };
  assert.equal(NH.deHien(tinh), 'Tìm tổng, biết hai số hạng là 42 và 35.');
  assert.ok(NH.nhanBietLoi(tinh, 7).includes('ten-thanh-phan'), 'tính hiệu thay vì tổng');
  const tich = { loai: 'thanh_phan', kieu: 'tinh', phep: '×', so: [2, 4] };
  assert.deepEqual(J(NH.nhanBietLoi(tich, 6)).slice(0, 2), ['ten-thanh-phan', 'cong-thay-nhan']);
  const thuong = { loai: 'thanh_phan', kieu: 'ten', phep: ':', so: [10, 2], vi_tri: 2 };
  assert.deepEqual(J(NH.nhanBietLoi(thuong, 'tich')), ['ten-thanh-phan']);
  const lh = { loai: 'lien_he_nhan_chia', so: [2, 7], chia_cho: 1, an: 'thuong' };
  assert.equal(NH.deHien(lh), 'Từ 2 × 7 = 14, ta có 14 : 7 = ?');
  assert.equal(NH.tinh(lh), 2);
  assert.ok(NH.nhanBietLoi(lh, 7).includes('lien-he-nhan-chia'));
  assert.ok(NH.nhanBietLoi(lh, 14).includes('lien-he-nhan-chia'));
  deqLoiGiai(NH.loiGiai(lh).buoc, ['2 × 7 = 14', '14 : 2 = 7', '14 : 7 = 2']);
  const sbc = { loai: 'lien_he_nhan_chia', so: [5, 4], chia_cho: 0, an: 'so_bi_chia' };
  assert.equal(NH.deHien(sbc), 'Từ 5 × 4 = 20, ta có ? : 5 = 4');
  assert.deepEqual(J(NH.nhanBietLoi(sbc, 9)), ['cong-thay-nhan']);
  assert.ok(NH.LOI['lien-he-nhan-chia'].be && NH.LOI['lien-he-nhan-chia'].mo_ta);
});
function deqLoiGiai(a, b) { assert.deepEqual(J(a), b); }

test('D1: màn mới ở vùng 1 (Bài 3) và vùng 7 (Bài 38, 42) hỏi được chữ; 2.25 ngoài SGK, không kỹ năng nào dùng', () => {
  const { NH, DAO } = moi();
  const m8 = DAO.man('v1-m8');
  assert.equal(m8.bai_dau, 3);
  assert.equal(m8.ky_nang_chinh, 'ten-thanh-phan-cong-tru');
  assert.equal(m8.game, 'chem-trai-cay');
  assert.equal(DAO.man('v7-m8').bai_dau, 38);
  assert.equal(DAO.man('v7-m8').ky_nang_chinh, 'ten-thanh-phan-nhan-chia');
  assert.equal(DAO.man('v7-m9').bai_dau, 42);
  assert.equal(DAO.man('v7-m9').ky_nang_chinh, 'nhan-chia-lien-he');
  assert.equal(DAO.vungCuaNoiDung('2.14'), 1);
  assert.equal(DAO.vungCuaNoiDung('2.23'), 7);
  assert.equal(DAO.vungCuaNoiDung('2.24'), 7);
  assert.ok(DAO.kyNangCuaVung(DAO.vung(1)).includes('ten-thanh-phan-cong-tru'));
  // Màn Thừa số, tích chỉ hỏi phép nhân; màn Bài 42 hỏi tên thành phần phép chia
  const rng = NH.taoRng(38);
  NH.lapDanhSach(DAO.man('v7-m8'), rng, {}).forEach((x) => assert.equal(x.cau_truc.phep, '×'));
  const ds42 = NH.lapDanhSach(DAO.man('v7-m9'), rng, {});
  ds42.filter((x) => x.ky_nang === 'ten-thanh-phan-nhan-chia').forEach((x) => assert.equal(x.cau_truc.phep, ':'));
  assert.ok(ds42.some((x) => x.ky_nang === 'nhan-chia-lien-he'));
  // Số màn cũ giữ nguyên, màn mới đứng sau (bước tiếp theo và bé không lẫn)
  assert.equal(DAO.man('v1-m7').so, 7);
  assert.equal(DAO.man('v1-cup').so, 10);
  for (const v of DAO.VUNG) assert.equal(new Set(v.man.map((m) => m.so)).size, v.man.length, v.ten + ': số màn không trùng');
  assert.ok(NH.NOI_DUNG['2.25']);
  assert.ok(!NH.THU_TU_KY_NANG.some((k) => NH.KY_NANG[k].noi_dung === '2.25'));
});

/* ---------------- D2: bài toán có lời văn trong phạm vi 1000 ---------------- */

test('D2: toan-loi-van-1000: số thật theo đề, trong 1000, nhớ không quá một lượt, đủ đơn vị và các dạng', () => {
  const { NH, DAO } = moi();
  const m = DAO.man('v8-m8');
  assert.equal(m.game, 'truyen-tranh');
  assert.equal(m.ky_nang_chinh, 'toan-loi-van-1000');
  assert.ok(m.bai_dau >= 59 && m.bai_dau <= 63);
  const rng = NH.taoRng(1000);
  const dv = new Set(), dang = new Set(), mau = new Set();
  const nho = { 0: 0, 1: 0, 2: 0 };
  for (let i = 0; i < 400; i++) {
    const q = NH.taoCau('toan-loi-van-1000', null, rng, { dang: 'hai_buoc' });
    const ct = q.cau_truc;
    const [x, y] = ct.so;
    const d = q.dap_an;
    const M = NH.MAU_LOI_VAN.find((t) => t.id === ct.mau);
    dv.add(M.dv); dang.add(ct.dang); mau.add(M.id);
    assert.ok(Number.isInteger(d) && d > 0 && d <= 999, q.de + ' → ' + d);
    assert.ok(x > 100 || y > 100, 'có số có ba chữ số: ' + q.de);
    if (ct.phep === '-') assert.ok(x > y && x - y >= 10, q.de);
    if (M.khoang_1000) {
      assert.ok(x >= M.khoang_1000[0][0] && x <= M.khoang_1000[0][1], M.id + ' x = ' + x);
      assert.ok(y >= M.khoang_1000[1][0] && y <= M.khoang_1000[1][1], M.id + ' y = ' + y);
    }
    const u = (n) => n % 10, c = (n) => Math.floor(n / 10) % 10;
    const nhoDv = ct.phep === '+' ? u(x) + u(y) >= 10 : u(x) < u(y);
    const nhoC = ct.phep === '+' ? c(x) + c(y) + (nhoDv ? 1 : 0) >= 10 : c(x) - (nhoDv ? 1 : 0) < c(y);
    assert.ok(!(nhoDv && nhoC), 'nhớ không quá một lượt: ' + q.de);
    nho[nhoDv ? 1 : nhoC ? 2 : 0]++;
    assert.ok(!/[{}]/.test(q.de) && !/\u2014/.test(q.de));
    assert.ok(q.buoc1.lua_chon.filter((o) => o.loi.length === 0).length === 1, q.de);
  }
  for (const k of ['kg', 'm', 'km', 'cây', 'quyển']) assert.ok(dv.has(k), 'thiếu đơn vị ' + k);
  for (const k of ['them', 'gop', 'con_lai', 'nhieu_hon', 'it_hon', 'hon_kem', 'luc_dau']) assert.ok(dang.has(k), 'thiếu dạng ' + k);
  assert.ok(mau.has('su-tu-ho') && mau.has('vuon-uom'), 'đề theo SGK Bài 60, 62');
  assert.ok(nho[0] > 40 && nho[1] > 40 && nho[2] > 40, 'ba nhóm nhớ: ' + JSON.stringify(nho));
});

/* ---------------- D3: bước chọn phép tính ---------------- */

test('D3: bước 1: phép trừ có 3 thẻ (thêm số bé trừ số lớn), phép cộng không có thẻ đổi chỗ số hạng; đề mới xuất hiện', () => {
  const { NH } = moi();
  const rng = NH.taoRng(4);
  const mauThay = new Set();
  let soBeTruoc = 0;
  for (const kn of ['toan-hon-kem', 'toan-loi-van-100', 'toan-them-bot', 'toan-nhieu-it', 'toan-kg-lit', 'toan-loi-van-1000']) {
    for (let i = 0; i < 300; i++) {
      const q = NH.taoCau(kn, null, rng, { dang: 'hai_buoc' });
      const ct = q.cau_truc;
      const b1 = q.buoc1.lua_chon;
      mauThay.add(ct.mau);
      assert.equal(b1.filter((o) => o.loi.length === 0).length, 1, 'một thẻ đúng: ' + q.de + ' ' + JSON.stringify(b1));
      assert.equal(new Set(b1.map((o) => o.gia_tri)).size, b1.length);
      if (ct.phep === '-') {
        assert.equal(b1.length, 3, q.de);
        const be = b1.find((o) => o.gia_tri === ct.so[1] + '-' + ct.so[0]);
        assert.ok(be && be.loi[0] === 'be-tru-lon', q.de);
        assert.match(NH.loiNoiVoiBe(ct, be.gia_tri, be.loi, 1), /^Phép trừ lấy số lớn trừ số bé: /);
      }
      if (ct.phep === '+') assert.ok(!b1.some((o) => o.gia_tri === ct.so[1] + '+' + ct.so[0] && ct.so[0] !== ct.so[1]), 'không có thẻ đổi chỗ số hạng');
      const M = NH.MAU_LOI_VAN.find((t) => t.id === ct.mau);
      if (M.so_be_truoc) {
        soBeTruoc++;
        assert.ok(q.khung[0].includes(String(ct.so[1])) && q.khung[1].includes(String(ct.so[0])), 'số bé nói trước: ' + q.khung.join(' '));
        assert.ok(ct.so[1] < ct.so[0]);
      }
      if (M.khoang && kn !== 'toan-loi-van-1000') {
        assert.ok(ct.so[0] >= M.khoang.x[0] && ct.so[0] <= M.khoang.x[1] && ct.so[1] >= M.khoang.y[0] && ct.so[1] <= M.khoang.y[1], M.id + ' ' + ct.so);
      }
    }
  }
  assert.ok(soBeTruoc > 30, 'đề nói số bé trước xuất hiện: ' + soBeTruoc);
  for (const id of ['be-ca', 'hoa-chua-to', 'thuyen-kem', 'tuoi-bo', 'bang-giay', 'but-sap', 'robot-cao', 'cay-thap']) assert.ok(mauThay.has(id), 'thiếu đề ' + id);
  const chu = NH.MAU_LOI_VAN.map((m) => m.khung.join(' ')).join(' ');
  for (const tu of ['kém', 'ngắn hơn', 'thấp hơn', 'tuổi']) assert.ok(chu.includes(tu), 'thiếu đề có chữ ' + tu);
  // Bài 4: "Mai 7 tuổi, bố 38 tuổi": bé luôn nhỏ tuổi hơn bố nhiều
  const tuoi = { loai: 'loi_van', mau: 'tuoi-bo', dang: 'hon_kem', phep: '-', so: [38, 7], nv: ['Mây', 'Rex'] };
  assert.deepEqual(J(NH.nhanBietLoi(tuoi, '7-38', 1)), ['be-tru-lon']);
  assert.deepEqual(J(NH.nhanBietLoi(tuoi, '38+7', 1)), ['sai-phep']);
});

/* ---------------- D4: nhiễu qua 10, câu không nhớ ---------------- */

test('D4a: cộng qua 10 không còn nhiễu một chữ số đ − 10; lỗi tách 10 theo SGK Bài 7, 11', () => {
  const { NH } = moi();
  const rng = NH.taoRng(710);
  let coTach = 0, motCs = 0, tong = 0;
  for (let i = 0; i < 400; i++) {
    const q = NH.taoCau('cong-qua-10', null, rng, { dang: 'chon_dap_an' });
    kiemChonDapAn(NH, q, q.de);
    const d = q.dap_an;
    q.lua_chon.forEach((x) => { if (x.gia_tri !== d) { tong++; if (x.gia_tri < 10) motCs++; if (x.loi.includes('tach-10-sai')) coTach++; } });
    assert.ok(!q.lua_chon.some((x) => x.gia_tri === d - 10), 'không có đ − 10: ' + q.de + ' ' + q.lua_chon.map((x) => x.gia_tri));
  }
  assert.ok(motCs / tong < 0.05, 'nhiễu một chữ số hiếm: ' + motCs + '/' + tong);
  assert.ok(coTach / tong > 0.25, 'nhiễu tách 10: ' + coTach + '/' + tong);
  // Trừ qua 10: hiệu có một chữ số, nên nhiễu lớn hơn cả số bị trừ (13 − 5 hiện 18) là lộ đáp án: hiếm
  let lo = 0, tongTru = 0;
  for (let i = 0; i < 400; i++) {
    const q = NH.taoCau('tru-qua-10', null, rng, { dang: 'chon_dap_an' });
    kiemChonDapAn(NH, q, q.de);
    q.lua_chon.forEach((x) => { if (x.gia_tri !== q.dap_an) { tongTru++; if (x.gia_tri > q.cau_truc.so[0]) lo++; } });
  }
  assert.ok(lo / tongTru < 0.08, 'nhiễu lớn hơn số bị trừ: ' + lo + '/' + tongTru);
  const c = (phep, so) => ({ phep, so, an: 'ket_qua' });
  assert.ok(NH.nhanBietLoi(c('+', [8, 5]), 12).includes('tach-10-sai'));
  assert.ok(NH.nhanBietLoi(c('+', [8, 5]), 15).includes('tach-10-sai'));
  assert.equal(NH.nhanBietLoi(c('+', [8, 5]), 3)[0], 'tach-10-sai');
  assert.equal(NH.nhanBietLoi(c('-', [13, 5]), 5)[0], 'tach-10-sai');
  assert.equal(NH.nhanBietLoi(c('-', [13, 5]), 2)[0], 'tach-10-sai');
  assert.match(NH.loiNoiVoiBe(c('+', [8, 5]), 12, ['tach-10-sai']), /Tách 5 = 2 \+ 3, 8 \+ 2 = 10/);
  // Gợi ý, lời giải trừ qua 10 theo SGK Bài 11: tách số bị trừ 13 = 10 + 3
  deqLoiGiai(NH.loiGiai(c('-', [13, 5])).buoc, ['Tách 13 = 10 + 3', '10 − 5 = 5', '5 + 3 = 8']);
  assert.equal(NH.goiY(c('-', [13, 5]))[0], 'Tách 13 = 10 + 3 nhé.');
  // Phép trừ, phép cộng không qua 10 (Bài 9) không bị gợi ý tách 10 sai số
  assert.ok(!/−\d|- \d|còn -/.test(NH.goiY(c('-', [14, 3])).join(' ')));
  assert.ok(!NH.goiY(c('+', [8, 2])).join(' ').includes('còn 0'));
});

test('D4b: màn Bài 5 ở vùng 1; màn có nhớ vùng 4 trộn khoảng 25% câu không nhớ cùng phép, kỹ năng chính giữ nguyên', () => {
  const { NH, DAO } = moi();
  const m9 = DAO.man('v1-m9');
  assert.equal(m9.bai_dau, 5);
  assert.equal(m9.ky_nang_chinh, 'cong-tru-khong-nho-100');
  const chinh = { 'v4-m1': ['cong-nho-2cs-1cs', '+', 1], 'v4-m2': ['cong-nho-2cs-2cs', '+', 2], 'v4-m4': ['tru-nho-2cs-1cs', '-', 1], 'v4-m5': ['tru-nho-2cs-2cs', '-', 2] };
  for (const id of Object.keys(chinh)) {
    const m = DAO.man(id);
    const [kn, phep, soCs] = chinh[id];
    assert.equal(m.ky_nang_chinh, kn, id);
    let khongNho = 0, tong = 0;
    for (let hg = 1; hg <= 40; hg++) {
      NH.lapDanhSach(m, NH.taoRng(hg), {}).forEach((x) => {
        tong++;
        assert.equal(x.cau_truc.phep, phep, id + ' cùng phép');
        if (x.ky_nang === 'cong-tru-khong-nho-100') {
          khongNho++;
          const [a, b] = x.cau_truc.so;
          assert.ok(phep === '+' ? (a % 10) + (b % 10) <= 9 : b % 10 <= a % 10, id + ' không nhớ ' + a + phep + b);
          assert.equal(String(b).length, soCs, id + ' số thứ hai có ' + soCs + ' chữ số: ' + b);
        }
      });
    }
    assert.ok(khongNho / tong > 0.15 && khongNho / tong < 0.35, id + ': ' + khongNho + '/' + tong);
  }
  // Nhẩm tròn chục (v4-m3) không có nhớ nên không trộn
  assert.deepEqual(J(DAO.man('v4-m3').cau.map((x) => x.ky_nang)), ['nham-tron-chuc']);
});

/* ---------------- D5: độ khó theo mức, so sánh biểu thức, bài học ---------------- */

test('D5a: độ khó theo mức thành thạo: mới học dễ hơn, đã thuộc khó hơn; cùng hạt giống cùng câu; không rõ mức thì như cũ', () => {
  const { w, NH } = moi();
  const de = {
    'cong-qua-10': (a, b) => Math.max(a, b) === 9 || a + b <= 12,
    'tru-qua-10': (a, b) => b === 9 || a <= 12,
    'cong-nho-2cs-1cs': (a, b) => (a % 10) + b <= 12 && a < 50,
    'cong-nho-2cs-2cs': (a, b) => (a % 10) + (b % 10) <= 12 && a + b <= 70,
    'tru-nho-2cs-1cs': (a, b) => b - (a % 10) <= 3 && a <= 50,
    'tru-nho-2cs-2cs': (a, b) => a !== 100 && (b % 10) - (a % 10) <= 3 && a <= 60,
    'cong-tru-1000': (a, b, p) => (p === '+' ? (a % 10) + (b % 10) < 10 && (Math.floor(a / 10) % 10) + (Math.floor(b / 10) % 10) < 10 : (a % 10) >= (b % 10) && (Math.floor(a / 10) % 10) >= (Math.floor(b / 10) % 10))
  };
  const gioi = { 'cong-qua-10': 20, 'tru-qua-10': 20, 'cong-tru-1000': 1000 };
  for (const kn of Object.keys(de)) {
    const m = { cau: [{ ky_nang: kn }], so_cau: 12 };
    const tiLe = (muc) => {
      let n = 0, t = 0;
      for (let hg = 1; hg <= 40; hg++) {
        NH.lapDanhSach(m, NH.taoRng(hg), muc ? { mucKy: { [kn]: muc } } : {}).forEach((x) => {
          const [a, b] = x.cau_truc.so;
          const d = NH.tinh(x.cau_truc);
          assert.ok(d >= 0 && d <= (gioi[kn] || 100), kn + ' ' + a + x.cau_truc.phep + b);
          t++; if (de[kn](a, b, x.cau_truc.phep)) n++;
        });
      }
      return n / t;
    };
    const chuaHoc = tiLe('chua_hoc'), thuong = tiLe(null), daThuoc = tiLe('da_thuoc');
    assert.ok(chuaHoc > thuong + 0.1 && thuong > daThuoc + 0.1, kn + ': dễ ' + chuaHoc.toFixed(2) + ' > thường ' + thuong.toFixed(2) + ' > khó ' + daThuoc.toFixed(2));
    // Cùng hạt giống, cùng mức: cùng danh sách; mức đang luyện như không có mức
    const a1 = NH.lapDanhSach(m, NH.taoRng(9), { mucKy: { [kn]: 'lam_quen' } });
    const a2 = NH.lapDanhSach(m, NH.taoRng(9), { mucKy: { [kn]: 'lam_quen' } });
    assert.deepEqual(J(a1), J(a2));
    assert.deepEqual(J(NH.lapDanhSach(m, NH.taoRng(9), { mucKy: { [kn]: 'dang_luyen' } })), J(NH.lapDanhSach(m, NH.taoRng(9), {})));
  }
  // VanChoi chuyển mucKy của app xuống ngân hàng câu
  const m = { id: 'thu', cau: [{ ky_nang: 'cong-qua-10' }], so_cau: 12 };
  const v1 = new w.VanChoi({ nk: nkGia(), man: m, hatGiong: 5, mucKy: { 'cong-qua-10': 'vung_chac' } });
  const v2 = new w.VanChoi({ nk: nkGia(), man: m, hatGiong: 5, mucKy: { 'cong-qua-10': 'vung_chac' } });
  assert.deepEqual(J(v1.ds), J(v2.ds));
  assert.deepEqual(J(v1.ds), J(NH.lapDanhSach(m, NH.taoRng(5), { mucKy: { 'cong-qua-10': 'vung_chac' } })));
});

test('D5b: so sánh biểu thức với một số (9 + 5 ? 13) trong màn luyện tập vùng 2: đúng một dấu, lỗi chưa tính', () => {
  const { NH, DAO } = moi();
  const ct = { loai: 'so_sanh', kieu: 'dau_bt', phep: '+', so: [9, 5], b: 13 };
  assert.equal(NH.tinh(ct), '>');
  assert.equal(NH.deHien(ct), '9 + 5 ? 13');
  assert.ok(NH.nhanBietLoi(ct, '<').includes('chua-tinh'));
  assert.ok(NH.nhanBietLoi(ct, '=').includes('dem-lech'));
  assert.match(NH.loiNoiVoiBe(ct, '<', ['chua-tinh']), /^Tính 9 \+ 5 = 14 trước/);
  assert.equal(NH.maCau('cong-qua-10', ct), '2.8|cong-qua-10|dau_bt:9+5,13');
  const dau = new Set();
  let so = 0;
  for (const id of ['v2-m7', 'v2-cup']) {
    for (let hg = 1; hg <= 30; hg++) {
      const ds = NH.lapDanhSach(DAO.man(id), NH.taoRng(hg), {});
      ds.filter((x) => x.cau_truc.loai === 'so_sanh').forEach((x) => {
        so++;
        assert.equal(x.dang, 'chon_dap_an');
        const q = NH.taoCau(x.ky_nang, x.cau_truc, NH.taoRng(hg), { dang: x.dang });
        kiemChonDapAn(NH, q, id + ' ' + q.de);
        dau.add(q.dap_an);
        assert.ok(q.cau_truc.b >= 0 && q.cau_truc.b <= 20);
      });
    }
  }
  assert.ok(so > 20, 'có câu so sánh: ' + so);
  assert.deepEqual([...dau].sort(), ['<', '=', '>']);
});

test('D5c: ba bài học 30 giây mới (tách 10, đặt tính có nhớ, cộng trừ trong 1000) gắn với kỹ năng, dựng được hình', () => {
  const { NH, w } = moi(['js/am-thanh.js', 'js/phan-hoi.js', 'js/bai-hoc.js']);
  const BH = w.BaiHoc;
  const can = { 'cong-qua-10': 'tach-10', 'tru-qua-10': 'tach-10', 'cong-nho-2cs-1cs': 'dat-tinh-co-nho', 'cong-nho-2cs-2cs': 'dat-tinh-co-nho',
    'tru-nho-2cs-1cs': 'dat-tinh-co-nho', 'tru-nho-2cs-2cs': 'dat-tinh-co-nho', 'cong-tru-1000': 'cong-tru-1000', 'toan-loi-van-1000': 'giai-toan' };
  for (const kn of Object.keys(can)) assert.equal(NH.KY_NANG[kn].bai_hoc, can[kn], kn);
  for (const ma of ['tach-10', 'dat-tinh-co-nho', 'cong-tru-1000']) {
    const bai = BH.BAI[ma];
    assert.ok(bai && bai.ten && bai.buoc.length >= 4 && bai.buoc.length <= 5, ma);
    for (const b of bai.buoc) {
      assert.ok(!/\u2014/.test(b.chu), ma);
      const h = b.ve();
      assert.ok(typeof h === 'string' && h.length > 20 && !/undefined|NaN/.test(h), ma + ': ' + h.slice(0, 80));
    }
    const cuoi = bai.buoc[bai.buoc.length - 1];
    assert.ok(cuoi.thu && cuoi.thu.lua_chon.includes(cuoi.thu.dung), ma);
  }
  assert.match(BH.BAI['dat-tinh-co-nho'].buoc[1].ve(), /class="cot-doc"/, 'đặt tính bằng hình cột dọc của màn Gần đúng rồi');
  assert.match(BH.BAI['tach-10'].buoc[3].chu, /Tách 13 = 10 \+ 3/, 'trừ qua 10 theo SGK Bài 11');
});

/* ---------------- D6: sửa nhỏ ---------------- */

test('D6a: đảo thứ tự thừa số: nhiễu hiếm, và ở mọi game được chọn lại một lần không mất lượt, đúng sau đó là dung_lan_2', () => {
  const { w, NH } = moi();
  const rng = NH.taoRng(19);
  let coDao = 0;
  for (let i = 0; i < 400; i++) {
    const q = NH.taoCau('nhan-y-nghia', null, rng, { dang: 'chon_dap_an' });
    kiemChonDapAn(NH, q, q.de);
    if (q.lua_chon.some((x) => x.loi[0] === 'dao-thu-tu')) coDao++;
  }
  assert.ok(coDao < 400 * 0.3, 'thẻ đảo thứ tự ít xuất hiện: ' + coDao + '/400');
  const ct = { loai: 'nhan_tong', chieu: 'nhan_tong', a: 5, b: 3 };
  for (const dang of ['chon_dap_an', 'ghep_doi']) {
    const m = { id: 'thu', cau: [{ ky_nang: 'nhan-y-nghia' }], so_cau: 1 };
    const van = new w.VanChoi({ nk: nkGia(), game: 'lat-the', vung: 7, man: m, hatGiong: 3 });
    van.batDau({});
    const q = van.hienCau(van._taoQ({ ky_nang: 'nhan-y-nghia', cau_truc: ct, dang: dang }));
    const k = van.traLoi('3+3+3+3+3');
    assert.ok(k.thuLai && !k.canPhanHoi, dang);
    assert.match(k.loiNoi, /5 được lấy 3 lần/);
    if (dang === 'chon_dap_an') {
      const k2 = van.traLoi('5+5+5+5');
      assert.ok(k2.canPhanHoi, 'chọn đáp án: sau lần nhắc còn đúng một lượt như mọi câu');
    } else {
      assert.ok(van.traLoi('5+5+5+5').thuLai, 'ghép đôi: vẫn còn lượt thử lại như mọi câu');
      assert.equal(van.traLoi(q.dap_an).ketQua, 'dung_lan_2');
    }
  }
  const van = new w.VanChoi({ nk: nkGia(), man: { id: 'thu', cau: [{ ky_nang: 'nhan-y-nghia' }], so_cau: 1 }, hatGiong: 3 });
  van.batDau({});
  van.hienCau(van._taoQ({ ky_nang: 'nhan-y-nghia', cau_truc: ct, dang: 'chon_dap_an' }));
  van.traLoi('3+3+3+3+3');
  assert.equal(van.traLoi('5+5+5').ketQua, 'dung_lan_2');
});

test('D6b: gợi ý tìm số còn thiếu theo lớp 2 (mấy cộng mấy, đếm thêm), không dùng quy tắc của lớp 3', () => {
  const { NH } = moi();
  const rng = NH.taoRng(14);
  for (let i = 0; i < 200; i++) {
    const q = NH.taoCau('tim-so-thieu-20', null, rng, { dang: 'chon_dap_an' });
    const chu = q.goi_y.concat(q.loi_giai.buoc).join(' ') + ' ' + q.lua_chon.map((x) => NH.loiNoiVoiBe(q.cau_truc, x.gia_tri, x.loi)).join(' ');
    assert.ok(!/Muốn tìm|lấy tổng|lấy hiệu|lấy số bị trừ/.test(chu), chu);
  }
  const g = NH.goiY({ phep: '+', so: [5, 7], kq: 12, an: 'so_hang_2' });
  assert.match(g[0], /^5 cộng mấy bằng 12\? Đếm thêm từ 5/);
  deqLoiGiai(NH.loiGiai({ phep: '+', so: [5, 7], kq: 12, an: 'so_hang_2' }).buoc, ['5 + 7 = 12', 'Vậy số còn thiếu là 7']);
});

test('D6c: số thật theo từng đề: can, xô, túi gạo không quá mức của đề; đĩa bánh chỉ dùng số trong 20', () => {
  const { NH } = moi();
  const rng = NH.taoRng(1718);
  const dem = {};
  for (const kn of ['toan-kg-lit', 'toan-hon-kem', 'toan-loi-van-100', 'toan-them-bot']) {
    for (let i = 0; i < 500; i++) {
      const ct = NH.sinh(kn, rng);
      const M = NH.MAU_LOI_VAN.find((t) => t.id === ct.mau);
      const lon = Math.max(ct.so[0], ct.so[1], NH.tinh(ct));
      if (M.toi_da) assert.ok(lon <= M.toi_da, kn + ' ' + M.id + ' ' + ct.so + ' vượt ' + M.toi_da);
      if (kn !== 'toan-them-bot') assert.notEqual(M.id, 'banh-dia', 'đĩa bánh không dùng số có hai chữ số lớn');
      dem[M.id] = (dem[M.id] || 0) + 1;
    }
  }
  for (const id of ['xo-nuoc', 'nuoc-can', 'gao-hai-tui', 'dau-can', 'banh-dia']) assert.ok(dem[id] > 0, 'đề ' + id + ' vẫn được dùng');
  assert.equal(NH.MAU_LOI_VAN.find((t) => t.id === 'xo-nuoc').toi_da, 20);
});

test('D6d: câu chữ: không lặp "trưa", trả tiền "vừa đủ", đề phép nhân theo nhóm có danh từ', () => {
  const { NH } = moi();
  const rng = NH.taoRng(29);
  for (let i = 0; i < 400; i++) {
    const q = NH.taoCau('ngay-gio', null, rng, { dang: 'chon_dap_an' });
    const chu = chuCua(q) + ' ' + (q.lua_chon || []).map((x) => NH.hienGiaTriCau(q.cau_truc, x.gia_tri)).join(' ');
    assert.ok(!/trưa lúc [^|.]*trưa/.test(chu), chu);
  }
  const tra = NH.taoCau('tra-tien', null, rng, {});
  assert.match(tra.de, /Con trả vừa đủ bằng những tờ nào\?$/);
  const nt = { loai: 'nhan_tong', chieu: 'tranh_nhan', a: 4, b: 3, vat: '🍊' };
  assert.equal(NH.deDoc(nt), 'Có 3 nhóm, mỗi nhóm 4 quả cam. Phép nhân nào?');
  assert.match(NH.deHien(nt), /^3 nhóm, mỗi nhóm 4 quả cam/);
});

test('Bài 9 (thêm, bớt): phép trừ không qua 10 kể cả khi có thẻ số bé trừ số lớn', () => {
  const { NH } = moi();
  const rng = NH.taoRng(9);
  for (let i = 0; i < 300; i++) {
    const q = NH.taoCau('toan-them-bot', null, rng, { dang: 'hai_buoc' });
    const [x, y] = q.cau_truc.so;
    if (q.cau_truc.phep === '-') assert.ok(x === 10 || y <= x % 10, 'Bài 9 không trừ qua 10: ' + x + ' − ' + y);
    assert.ok(q.dap_an <= 20);
  }
});
