/* ============================================================
   ngan-hang.js – Ngân hàng câu hỏi theo mã nội dung và mã kỹ năng
   - Mã nội dung, mã lỗi, công thức nhận biết lỗi lấy từ docs/du-an-toan-2-3/spec/03a-chuong-trinh-lop-2.md (mục 3.3).
   - Mỗi câu có mã câu ổn định "<mã nội dung>|<mã kỹ năng>|<đề chuẩn hóa>" dùng chung cho mọi game.
   - Mỗi đáp án nhiễu mang mã lỗi sinh ra nó (một số có thể khớp nhiều công thức: ghi đủ các mã).
   - Sinh đề theo hạt giống (mulberry32) để phát lại được một ván.
   API: window.NganHang
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- Ngẫu nhiên có hạt giống ---------------- */

  function taoRng(hatGiong) {
    let a = (hatGiong >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function nn(rng, a, b) { return a + Math.floor(rng() * (b - a + 1)); }
  function chon(rng, ds) { return ds[Math.floor(rng() * ds.length)]; }
  function tron(rng, ds) {
    const a = ds.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function chonTheoTrongSo(rng, ds) {
    let tong = 0;
    ds.forEach(function (x) { tong += x.w; });
    let r = rng() * tong;
    for (let i = 0; i < ds.length; i++) { r -= ds[i].w; if (r < 0) return ds[i]; }
    return ds[ds.length - 1];
  }

  /* ---------------- Từ điển mã ---------------- */

  const NOI_DUNG = {
    '2.8': 'Bảng cộng qua 10 (có nhớ) trong phạm vi 20',
    '2.9': 'Bảng trừ qua 10 (có nhớ) trong phạm vi 20',
    '2.10': 'Cộng, trừ không nhớ trong phạm vi 100',
    '2.11': 'Cộng, trừ có nhớ trong phạm vi 100',
    '2.13': 'Tính nhẩm với số tròn chục, tròn trăm',
    '2.15': 'Tìm thành phần chưa biết của phép cộng, phép trừ',
    '2.16': 'Tính giá trị biểu thức có hai dấu cộng, trừ'
  };

  const TIEN_QUYET = {
    '2.8': ['L1.2', 'L1.4'],
    '2.9': ['2.8', 'L1.2'],
    '2.10': ['L1.5', '2.1'],
    '2.11': ['2.8', '2.9', '2.10'],
    '2.13': ['L1.2', '2.3'],
    '2.15': ['2.14', '2.8', '2.9'],
    '2.16': ['2.10', '2.11']
  };

  /** be: lời game nói với bé; mo_ta: giải nghĩa cho phụ huynh và LLM. */
  const LOI = {
    'quen-nho': { be: 'Con quên nhớ 1 rồi', mo_ta: 'Quên nhớ 1 sang hàng chục khi cộng có nhớ', ngan: 'Con hay quên nhớ 1' },
    'quen-muon': { be: 'Con quên mượn 1 rồi', mo_ta: 'Mượn 1 chục rồi quên bớt 1 ở hàng chục (quên trả) khi trừ có nhớ', ngan: 'Con hay quên mượn 1' },
    'tru-nguoc': { be: 'Con lấy số bé trừ số lớn ở hàng đơn vị rồi', mo_ta: 'Trừ ngược ở hàng đơn vị: lấy chữ số bé trừ chữ số lớn thay vì mượn 1 chục', ngan: 'Con hay trừ ngược' },
    'nham-dau': { be: 'Con nhầm dấu rồi', mo_ta: 'Làm phép tính ngược dấu: cộng thay trừ hoặc trừ thay cộng', ngan: 'Con hay nhầm dấu' },
    'dem-lech': { be: 'Con đếm lệch một chút rồi', mo_ta: 'Tính lệch 1 (hoặc lệch 1 chục) so với đáp án đúng', ngan: 'Con hay đếm lệch 1' },
    'bu-sai-chieu': { be: 'Trừ 10 là trừ thừa, phải thêm lại chứ không bớt tiếp', mo_ta: 'Trừ tròn 10 rồi bớt tiếp phần thừa thay vì thêm lại', ngan: 'Con hay bớt sai chiều' },
    'sai-hang': { be: 'Con đặt tính lệch hàng rồi', mo_ta: 'Đặt tính lệch hàng: chữ số đơn vị bị cộng hoặc trừ vào hàng chục', ngan: 'Con hay đặt lệch hàng' },
    'viet-ca-so-nho': { be: 'Con viết cả số xuống, không nhớ 1 sang hàng chục', mo_ta: 'Viết cả tổng hàng đơn vị (ví dụ 13) xuống thay vì viết 3 nhớ 1', ngan: 'Con hay quên nhớ 1' },
    'thieu-0': { be: 'Thiếu một chữ số 0 rồi', mo_ta: 'Kết quả thiếu một chữ số 0: nhầm chục thành đơn vị', ngan: 'Con hay thiếu số 0' },
    'thua-0': { be: 'Thừa một chữ số 0 rồi', mo_ta: 'Kết quả thừa một chữ số 0', ngan: 'Con hay thừa số 0' },
    'nguoc-thanh-phan': { be: 'Tìm số còn thiếu thì làm phép ngược lại nhé', mo_ta: 'Tìm thành phần chưa biết bằng phép tính sai chiều (13 − 6 thành 13 + 6)', ngan: 'Con hay làm ngược phép' },
    'bo-buoc': { be: 'Bài này có hai bước, con mới làm bước một', mo_ta: 'Dừng sau phép tính thứ nhất của biểu thức hai dấu', ngan: 'Con hay quên bước hai' },
    'trai-sang-phai': { be: 'Có hai dấu thì tính lần lượt từ trái sang phải', mo_ta: 'Tính phép sau trước, không theo thứ tự từ trái sang phải', ngan: 'Nhớ tính từ trái sang phải' },
    'khac': { be: 'Chưa đúng rồi', mo_ta: 'Không khớp lỗi nào đã biết', ngan: 'Luyện thêm cho chắc' }
  };

  /** giay: thời gian gợi ý cho một câu ở dạng chọn đáp án (chỉnh theo từng bé trong ván). */
  const KY_NANG = {
    'cong-qua-10': { noi_dung: '2.8', ten: 'Cộng qua 10 trong phạm vi 20', kieu: 'K1', giay: 7, gioi_han: 20 },
    'tru-qua-10': { noi_dung: '2.9', ten: 'Trừ qua 10 trong phạm vi 20', kieu: 'K1', giay: 8, gioi_han: 20 },
    'tim-so-thieu-20': { noi_dung: '2.15', ten: 'Tìm số còn thiếu trong phạm vi 20', kieu: 'K2', giay: 10, gioi_han: 20 },
    'cong-tru-khong-nho-100': { noi_dung: '2.10', ten: 'Cộng, trừ không nhớ trong phạm vi 100', kieu: 'K2', giay: 9, gioi_han: 100 },
    'cong-nho-2cs-1cs': { noi_dung: '2.11', ten: 'Cộng có nhớ: số có hai chữ số với số có một chữ số', kieu: 'K2', giay: 10, gioi_han: 100 },
    'cong-nho-2cs-2cs': { noi_dung: '2.11', ten: 'Cộng có nhớ: số có hai chữ số với số có hai chữ số', kieu: 'K2', giay: 13, gioi_han: 100 },
    'tru-nho-2cs-1cs': { noi_dung: '2.11', ten: 'Trừ có nhớ: số có hai chữ số cho số có một chữ số', kieu: 'K2', giay: 11, gioi_han: 100 },
    'tru-nho-2cs-2cs': { noi_dung: '2.11', ten: 'Trừ có nhớ: số có hai chữ số cho số có hai chữ số', kieu: 'K2', giay: 14, gioi_han: 100 },
    'nham-tron-chuc': { noi_dung: '2.13', ten: 'Nhẩm với số tròn chục', kieu: 'K1', giay: 7, gioi_han: 100 },
    'bieu-thuc-2-dau': { noi_dung: '2.16', ten: 'Biểu thức có hai dấu cộng, trừ', kieu: 'K2', giay: 18, gioi_han: 100 }
  };
  const THU_TU_KY_NANG = Object.keys(KY_NANG);

  /* ---------------- Tiện ích số ---------------- */

  const dv = function (n) { return n % 10; };
  const chuc = function (n) { return Math.floor(n / 10) % 10; };
  const TRU = '−';

  function tinhPhep(a, p, b) { return p === '+' ? a + b : a - b; }

  /** Đáp án đúng của một cấu trúc câu. */
  function tinh(ct) {
    if (Array.isArray(ct.phep)) return tinhPhep(tinhPhep(ct.so[0], ct.phep[0], ct.so[1]), ct.phep[1], ct.so[2]);
    if (ct.an === 'ket_qua') return tinhPhep(ct.so[0], ct.phep, ct.so[1]);
    const a = ct.so[0], b = ct.so[1], c = ct.kq;
    if (ct.phep === '+') return ct.an === 'so_hang_1' ? c - b : c - a;
    return ct.an === 'so_bi_tru' ? c + b : a - c;
  }

  function kyHieu(p, chuanHoa) { return p === '+' ? '+' : (chuanHoa ? '-' : TRU); }

  /** Đề hiển thị: "36 + 27 = ?", "? + 6 = 13", "20 − 8 + 6 = ?" */
  function deHien(ct) {
    if (Array.isArray(ct.phep)) return ct.so[0] + ' ' + kyHieu(ct.phep[0]) + ' ' + ct.so[1] + ' ' + kyHieu(ct.phep[1]) + ' ' + ct.so[2] + ' = ?';
    if (ct.an === 'ket_qua') return ct.so[0] + ' ' + kyHieu(ct.phep) + ' ' + ct.so[1] + ' = ?';
    const x = ct.an === 'so_hang_1' || ct.an === 'so_bi_tru' ? ['?', ct.so[1]] : [ct.so[0], '?'];
    return x[0] + ' ' + kyHieu(ct.phep) + ' ' + x[1] + ' = ' + ct.kq;
  }

  /** Đề chuẩn hóa cho mã câu: bỏ khoảng trắng, dấu trừ ASCII. */
  function deChuanHoa(ct) {
    if (Array.isArray(ct.phep)) return ct.so[0] + kyHieu(ct.phep[0], true) + ct.so[1] + kyHieu(ct.phep[1], true) + ct.so[2];
    if (ct.an === 'ket_qua') return ct.so[0] + kyHieu(ct.phep, true) + ct.so[1];
    const x = ct.an === 'so_hang_1' || ct.an === 'so_bi_tru' ? ['?', ct.so[1]] : [ct.so[0], '?'];
    return x[0] + kyHieu(ct.phep, true) + x[1] + '=' + ct.kq;
  }

  /** Đề để đọc bằng giọng nói. */
  function deDoc(ct) {
    const tu = function (p) { return p === '+' ? 'cộng' : 'trừ'; };
    if (Array.isArray(ct.phep)) return ct.so[0] + ' ' + tu(ct.phep[0]) + ' ' + ct.so[1] + ' ' + tu(ct.phep[1]) + ' ' + ct.so[2] + ' bằng mấy?';
    if (ct.an === 'ket_qua') return ct.so[0] + ' ' + tu(ct.phep) + ' ' + ct.so[1] + ' bằng mấy?';
    if (ct.an === 'so_hang_1' || ct.an === 'so_bi_tru') return 'Số nào ' + tu(ct.phep) + ' ' + ct.so[1] + ' bằng ' + ct.kq + '?';
    return ct.so[0] + ' ' + tu(ct.phep) + ' mấy bằng ' + ct.kq + '?';
  }

  function maCau(kyNang, ct) { return KY_NANG[kyNang].noi_dung + '|' + kyNang + '|' + deChuanHoa(ct); }

  /* ---------------- Nhận biết lỗi (03a mục 3.3) ---------------- */

  /** Trả về danh sách mã lỗi khớp với đáp án sai v (rỗng nếu v đúng, ['khac'] nếu không khớp công thức nào). */
  function nhanBietLoi(ct, v) {
    v = Number(v);
    const d = tinh(ct);
    if (v === d) return [];
    const ma = [];
    const them = function (m) { if (ma.indexOf(m) < 0) ma.push(m); };
    if (Array.isArray(ct.phep)) {
      const a = ct.so[0], b = ct.so[1], c = ct.so[2];
      const r1 = tinhPhep(a, ct.phep[0], b);
      const phai = tinhPhep(a, ct.phep[0], tinhPhep(b, ct.phep[1], c));
      if (v === r1) them('bo-buoc');
      if (phai !== d && v === phai) them('trai-sang-phai');
      const coNho = function (x, p, y) { return p === '+' ? dv(x) + dv(y) >= 10 : dv(x) < dv(y); };
      if ((coNho(a, ct.phep[0], b) && ct.phep[0] === '+') || (coNho(r1, ct.phep[1], c) && ct.phep[1] === '+')) { if (v === d - 10) them('quen-nho'); }
      if ((coNho(a, ct.phep[0], b) && ct.phep[0] === '-') || (coNho(r1, ct.phep[1], c) && ct.phep[1] === '-')) { if (v === d + 10) them('quen-muon'); }
      if (v === d + 1 || v === d - 1) them('dem-lech');
    } else if (ct.an !== 'ket_qua') {
      const a = ct.so[0], b = ct.so[1], c = ct.kq;
      let nguoc = null;
      if (ct.phep === '+') nguoc = c + (ct.an === 'so_hang_1' ? b : a);
      else nguoc = ct.an === 'so_bi_tru' ? c - b : a + c;
      if (v === nguoc) them('nguoc-thanh-phan');
      if (v === d + 1 || v === d - 1) them('dem-lech');
    } else {
      const a = ct.so[0], b = ct.so[1];
      const ua = dv(a), ub = dv(b), ta = chuc(a), tb = chuc(b);
      const haiChuSo = a >= 10 || b >= 10;
      const tronChuc = a % 10 === 0 && b % 10 === 0;
      if (tronChuc && d > 0) {
        if (v * 10 === d) them('thieu-0');
        if (v === d * 10) them('thua-0');
      }
      if (ct.phep === '+') {
        const nho = ua + ub >= 10;
        if (nho && v === d - 10) them('quen-nho');
        if (nho && haiChuSo && v === Number(String(ta + tb) + String(ua + ub))) them('viet-ca-so-nho');
        if (v === Math.abs(a - b)) them('nham-dau');
        if (a >= 10 && b < 10 && v === a + 10 * b) them('sai-hang');
        if (b >= 10 && a < 10 && v === b + 10 * a) them('sai-hang');
        if (a >= 10 && b >= 10 && b % 10 === 0 && a % 10 !== 0 && v === a + b / 10) them('sai-hang');
        if (a >= 10 && b >= 10 && a % 10 === 0 && b % 10 !== 0 && v === b + a / 10) them('sai-hang');
        if (a >= 10 && b >= 10 && !nho && ua !== tb && v === (ta + ub) * 10 + (ua + tb)) them('sai-hang');
        if (v === d + 1 || v === d - 1) them('dem-lech');
        if (!haiChuSo && (v === 2 * a || v === 2 * b)) them('dem-lech');
        if (haiChuSo && (v === d + 10 || (v === d - 10 && !nho))) them('dem-lech');
      } else {
        const muon = ua < ub;
        if (muon && v === d + 10) them('quen-muon');
        if (muon && a < 20 && b < 10 && v === 10 - b) them('quen-muon');
        if (muon && v === (ta - tb) * 10 + (ub - ua)) them('tru-nguoc');
        if (muon && a >= 10 && b < 10 && v === d - 2 * (10 - b)) them('bu-sai-chieu');
        if (v === a + b) them('nham-dau');
        if (a >= 10 && b < 10 && a - 10 * b >= 0 && v === a - 10 * b) them('sai-hang');
        if (a >= 10 && b >= 10 && b % 10 === 0 && a % 10 !== 0 && v === a - b / 10) them('sai-hang');
        if (v === d + 1 || v === d - 1) them('dem-lech');
        if (haiChuSo && (v === d - 10 || (v === d + 10 && !muon))) them('dem-lech');
      }
    }
    if (!ma.length) ma.push('khac');
    return ma;
  }

  /** Câu game nói với bé khi bé chọn v (dùng tên lỗi đầu tiên). */
  function loiNoiVoiBe(ct, v, maLoi) {
    const m = (maLoi && maLoi[0]) || 'khac';
    const d = tinh(ct);
    if (m === 'nham-dau') return ct.phep === '+' ? 'Đây là phép cộng nhé' : 'Đây là phép trừ nhé';
    if (m === 'dem-lech') return Number(v) < d ? 'Con đếm thiếu một chút rồi' : 'Con đếm thừa một chút rồi';
    if (m === 'viet-ca-so-nho' && ct.an === 'ket_qua') return 'Con viết cả ' + (dv(ct.so[0]) + dv(ct.so[1])) + ' xuống, quên nhớ 1 sang hàng chục';
    if (m === 'nguoc-thanh-phan') {
      if (ct.an === 'so_hang_1' || ct.an === 'so_hang_2') return 'Muốn tìm số hạng, con lấy tổng trừ số hạng kia';
      if (ct.an === 'so_bi_tru') return 'Muốn tìm số bị trừ, con lấy hiệu cộng số trừ';
      return 'Muốn tìm số trừ, con lấy số bị trừ trừ đi hiệu';
    }
    return (LOI[m] || LOI.khac).be;
  }

  /* ---------------- Sinh cấu trúc câu theo kỹ năng ---------------- */

  const CAP_CONG_QUA_10 = [];
  for (let a = 2; a <= 9; a++) for (let b = 2; b <= 9; b++) if (a + b >= 11) CAP_CONG_QUA_10.push([a, b]);
  const CAP_TRU_QUA_10 = [];
  for (let a = 11; a <= 18; a++) for (let b = 2; b <= 9; b++) if (a - b <= 9) CAP_TRU_QUA_10.push([a, b]);

  const SINH = {
    'cong-qua-10': function (rng) { const p = chon(rng, CAP_CONG_QUA_10); return { phep: '+', so: [p[0], p[1]], an: 'ket_qua' }; },
    'tru-qua-10': function (rng) { const p = chon(rng, CAP_TRU_QUA_10); return { phep: '-', so: [p[0], p[1]], an: 'ket_qua' }; },
    'tim-so-thieu-20': function (rng) {
      if (rng() < 0.5) {
        const p = chon(rng, CAP_CONG_QUA_10);
        return { phep: '+', so: [p[0], p[1]], kq: p[0] + p[1], an: rng() < 0.5 ? 'so_hang_1' : 'so_hang_2' };
      }
      const q = chon(rng, CAP_TRU_QUA_10);
      return { phep: '-', so: [q[0], q[1]], kq: q[0] - q[1], an: rng() < 0.5 ? 'so_bi_tru' : 'so_tru' };
    },
    'cong-tru-khong-nho-100': function (rng) {
      const mot = rng() < 0.4;
      if (rng() < 0.5) {
        for (;;) {
          const a = nn(rng, 10, 88), b = mot ? nn(rng, 1, 9) : nn(rng, 10, 89);
          if (a + b <= 99 && dv(a) + dv(b) <= 9) return { phep: '+', so: [a, b], an: 'ket_qua' };
        }
      }
      for (;;) {
        const a2 = nn(rng, 21, 99), b2 = mot ? nn(rng, 1, 9) : nn(rng, 10, a2 - 1);
        if (b2 < a2 && dv(b2) <= dv(a2)) return { phep: '-', so: [a2, b2], an: 'ket_qua' };
      }
    },
    'cong-nho-2cs-1cs': function (rng) {
      const u = nn(rng, 2, 9);
      const a = nn(rng, 1, 8) * 10 + u;
      const b = nn(rng, 10 - u, 9);
      return { phep: '+', so: [a, b], an: 'ket_qua' };
    },
    'cong-nho-2cs-2cs': function (rng) {
      for (;;) {
        const ua = nn(rng, 1, 9), ub = nn(rng, 10 - ua, 9);
        const ta = nn(rng, 1, 8), tb = nn(rng, 1, 9 - ta);
        const a = ta * 10 + ua, b = tb * 10 + ub;
        if (a + b <= 100) return { phep: '+', so: rng() < 0.5 ? [a, b] : [b, a], an: 'ket_qua' };
      }
    },
    'tru-nho-2cs-1cs': function (rng) {
      const ua = nn(rng, 0, 8);
      const a = nn(rng, 2, 9) * 10 + ua;
      const b = nn(rng, ua + 1, 9);
      return { phep: '-', so: [a, b], an: 'ket_qua' };
    },
    'tru-nho-2cs-2cs': function (rng) {
      if (rng() < 0.15) {
        const b0 = nn(rng, 1, 9) * 10 + nn(rng, 1, 9);
        return { phep: '-', so: [100, b0], an: 'ket_qua' };
      }
      const ua = nn(rng, 0, 8), ub = nn(rng, ua + 1, 9);
      const ta = nn(rng, 2, 9), tb = nn(rng, 1, ta - 1);
      return { phep: '-', so: [ta * 10 + ua, tb * 10 + ub], an: 'ket_qua' };
    },
    'nham-tron-chuc': function (rng) {
      const dang = nn(rng, 1, 4);
      if (dang === 1) { const a = nn(rng, 1, 8), b = nn(rng, 1, 10 - a); return { phep: '+', so: [a * 10, b * 10], an: 'ket_qua' }; }
      if (dang === 2) { const a2 = nn(rng, 3, 10), b2 = nn(rng, 1, a2 - 1); return { phep: '-', so: [a2 * 10, b2 * 10], an: 'ket_qua' }; }
      if (dang === 3) { const a3 = nn(rng, 1, 7) * 10 + nn(rng, 1, 9); const b3 = nn(rng, 1, 9 - chuc(a3)) * 10; return { phep: '+', so: [a3, b3], an: 'ket_qua' }; }
      const a4 = nn(rng, 3, 9) * 10 + nn(rng, 1, 9); const b4 = nn(rng, 1, chuc(a4) - 1) * 10;
      return { phep: '-', so: [a4, b4], an: 'ket_qua' };
    },
    'bieu-thuc-2-dau': function (rng) {
      for (;;) {
        const p1 = rng() < 0.5 ? '+' : '-', p2 = rng() < 0.5 ? '+' : '-';
        const a = nn(rng, 10, 60), b = nn(rng, 2, rng() < 0.6 ? 9 : 30), c = nn(rng, 2, rng() < 0.6 ? 9 : 30);
        const r1 = tinhPhep(a, p1, b), r2 = tinhPhep(r1, p2, c);
        if (r1 >= 0 && r1 <= 100 && r2 >= 0 && r2 <= 100) return { phep: [p1, p2], so: [a, b, c], an: 'ket_qua' };
      }
    }
  };

  /* ---------------- Đáp án nhiễu ---------------- */

  /** Ứng viên nhiễu có tên lỗi (w: trọng số), theo công thức ở 03a. */
  function ungVienNhieu(kyNang, ct) {
    const d = tinh(ct);
    const ds = [];
    const them = function (v, w) { ds.push({ v: v, w: w }); };
    if (Array.isArray(ct.phep)) {
      const a = ct.so[0], b = ct.so[1], c = ct.so[2];
      them(tinhPhep(a, ct.phep[0], b), 3);
      them(tinhPhep(a, ct.phep[0], tinhPhep(b, ct.phep[1], c)), 3);
      them(d - 10, 1); them(d + 10, 1);
    } else if (ct.an !== 'ket_qua') {
      const a = ct.so[0], b = ct.so[1], c = ct.kq;
      if (ct.phep === '+') them(c + (ct.an === 'so_hang_1' ? b : a), 3);
      else them(ct.an === 'so_bi_tru' ? c - b : a + c, 3);
    } else {
      const a = ct.so[0], b = ct.so[1];
      const ua = dv(a), ub = dv(b), ta = chuc(a), tb = chuc(b);
      if (ct.phep === '+') {
        them(d - 10, kyNang === 'nham-tron-chuc' ? 0.5 : 4);
        them(Math.abs(a - b), 1);
        if (a >= 10 && b < 10) them(a + 10 * b, 2);
        if (b >= 10 && b % 10 === 0 && a % 10 !== 0) them(a + b / 10, 3);
        if (a % 10 === 0 && b % 10 === 0) { them(d / 10, 3); them(d * 10, 1); }
        if (a < 10 && b < 10) { them(2 * a, 0.5); them(2 * b, 0.5); }
      } else {
        them(d + 10, 3);
        if (ua < ub) them((ta - tb) * 10 + (ub - ua), 3);
        if (a < 20 && b < 10) them(10 - b, 1.5);
        if (a >= 10 && b < 10 && ua < ub) them(d - 2 * (10 - b), 1.5);
        them(a + b, 1);
        if (a >= 10 && b < 10) them(a - 10 * b, 1);
        if (b >= 10 && b % 10 === 0 && a % 10 !== 0) them(a - b / 10, 3);
        if (a % 10 === 0 && b % 10 === 0) { them(d / 10, 3); them(d * 10, 1); }
      }
    }
    return ds;
  }

  function hopLe(v, d, gioiHan) { return Number.isInteger(v) && v >= 0 && v <= gioiHan && v !== d; }

  /** Hai đáp án nhiễu: ít nhất một lỗi có tên (nếu có), cái còn lại lỗi có tên khác hoặc lệch nhỏ. */
  function taoNhieu(kyNang, ct, rng) {
    const d = tinh(ct);
    const gioiHan = KY_NANG[kyNang].gioi_han;
    const daCo = {};
    const coTen = [];
    ungVienNhieu(kyNang, ct).forEach(function (x) {
      if (!hopLe(x.v, d, gioiHan) || daCo[x.v]) return;
      const loi = nhanBietLoi(ct, x.v);
      if (loi.length === 1 && (loi[0] === 'khac' || loi[0] === 'dem-lech')) return;
      daCo[x.v] = 1;
      coTen.push(x);
    });
    const le = [];
    const leNho = d >= 20 ? [1, -1, 10, -10, 2, -2] : [1, -1, 2, -2, 3];
    leNho.forEach(function (k) { const v = d + k; if (hopLe(v, d, gioiHan) && !daCo[v]) le.push({ v: v, w: Math.abs(k) === 2 ? 0.5 : 1 }); });
    const ra = [];
    if (coTen.length) {
      const x = chonTheoTrongSo(rng, coTen);
      ra.push(x.v);
      const conLai = coTen.filter(function (y) { return y.v !== x.v; });
      if (conLai.length && rng() < 0.5) ra.push(chonTheoTrongSo(rng, conLai).v);
    }
    const leCon = le.filter(function (y) { return ra.indexOf(y.v) < 0; });
    while (ra.length < 2 && leCon.length) {
      const y = chonTheoTrongSo(rng, leCon);
      ra.push(y.v);
      leCon.splice(leCon.indexOf(y), 1);
    }
    for (let k = 3; ra.length < 2 && k < 30; k++) {
      [d + k, d - k].forEach(function (v) { if (ra.length < 2 && hopLe(v, d, gioiHan) && ra.indexOf(v) < 0) ra.push(v); });
    }
    return ra.map(function (v) { return { gia_tri: v, loi: nhanBietLoi(ct, v) }; });
  }

  /* ---------------- Gợi ý ba cấp và lời giải ---------------- */

  function goiY(ct) {
    const d = tinh(ct);
    if (Array.isArray(ct.phep)) {
      const r1 = tinhPhep(ct.so[0], ct.phep[0], ct.so[1]);
      return [
        'Có hai dấu thì tính lần lượt từ trái sang phải nhé.',
        'Bước một: ' + ct.so[0] + ' ' + kyHieu(ct.phep[0]) + ' ' + ct.so[1] + ' = ' + r1 + '.',
        'Bước hai: ' + r1 + ' ' + kyHieu(ct.phep[1]) + ' ' + ct.so[2] + ' = ?'
      ];
    }
    if (ct.an !== 'ket_qua') {
      const a = ct.so[0], b = ct.so[1], c = ct.kq;
      if (ct.phep === '+') {
        const biet = ct.an === 'so_hang_1' ? b : a;
        return ['Muốn tìm số hạng, lấy tổng trừ đi số hạng kia.', 'Con tính ' + c + ' ' + TRU + ' ' + biet + '.', c + ' ' + TRU + ' ' + biet + ' = ?'];
      }
      if (ct.an === 'so_bi_tru') return ['Muốn tìm số bị trừ, lấy hiệu cộng với số trừ.', 'Con tính ' + c + ' + ' + b + '.', c + ' + ' + b + ' = ?'];
      return ['Muốn tìm số trừ, lấy số bị trừ trừ đi hiệu.', 'Con tính ' + a + ' ' + TRU + ' ' + c + '.', a + ' ' + TRU + ' ' + c + ' = ?'];
    }
    const a = ct.so[0], b = ct.so[1];
    const ua = dv(a), ub = dv(b), ta = chuc(a), tb = chuc(b);
    if (a % 10 === 0 && b % 10 === 0) {
      return ['Đếm theo chục: ' + a + ' là ' + a / 10 + ' chục.', a / 10 + ' chục ' + (ct.phep === '+' ? 'cộng' : 'trừ') + ' ' + b / 10 + ' chục = ' + d / 10 + ' chục.', d / 10 + ' chục là mấy?'];
    }
    if (a < 10 && b < 10 && ct.phep === '+') {
      const lon = Math.max(a, b), be = Math.min(a, b), can = 10 - lon;
      return ['Tách ' + be + ' để ' + lon + ' thành 10 nhé.', lon + ' + ' + can + ' = 10, còn ' + (be - can) + '.', '10 + ' + (be - can) + ' = ?'];
    }
    if (a < 20 && b < 10 && ct.phep === '-') {
      return ['Tách ' + b + ' để trừ về 10 trước nhé.', a + ' ' + TRU + ' ' + ua + ' = 10, còn phải bớt ' + (b - ua) + '.', '10 ' + TRU + ' ' + (b - ua) + ' = ?'];
    }
    if (ct.phep === '+') {
      if (ua + ub >= 10) {
        return ['Cộng hàng đơn vị trước: ' + ua + ' + ' + ub + ' = ?', ua + ' + ' + ub + ' = ' + (ua + ub) + ', viết ' + dv(ua + ub) + ' nhớ 1.',
          'Hàng chục: ' + ta + ' + ' + tb + ' thêm 1 là ' + (ta + tb + 1) + '.'];
      }
      if (b % 10 === 0) return ['Cộng chục với chục, giữ nguyên hàng đơn vị.', ta + ' chục + ' + tb + ' chục = ' + (ta + tb) + ' chục.', 'Viết ' + (ta + tb) + ' rồi viết ' + ua + '.'];
      return ['Cộng hàng đơn vị trước: ' + ua + ' + ' + ub + ' = ' + (ua + ub) + '.', 'Rồi cộng hàng chục: ' + ta + ' + ' + tb + ' = ' + (ta + tb) + '.', 'Ghép lại: hàng chục ' + (ta + tb) + ', hàng đơn vị ' + (ua + ub) + '.'];
    }
    if (ua < ub) {
      return [ua + ' không trừ được ' + ub + ', mượn 1 chục: ' + (10 + ua) + ' ' + TRU + ' ' + ub + ' = ?',
        (10 + ua) + ' ' + TRU + ' ' + ub + ' = ' + (10 + ua - ub) + ', viết ' + (10 + ua - ub) + ' nhớ 1.',
        'Hàng chục: ' + tb + ' thêm 1 là ' + (tb + 1) + ', ' + (a >= 100 ? 10 : ta) + ' ' + TRU + ' ' + (tb + 1) + ' = ?'];
    }
    if (b % 10 === 0) return ['Trừ chục với chục, giữ nguyên hàng đơn vị.', ta + ' chục ' + TRU + ' ' + tb + ' chục = ' + (ta - tb) + ' chục.', 'Viết ' + (ta - tb) + ' rồi viết ' + ua + '.'];
    return ['Trừ hàng đơn vị trước: ' + ua + ' ' + TRU + ' ' + ub + ' = ' + (ua - ub) + '.', 'Rồi trừ hàng chục: ' + ta + ' ' + TRU + ' ' + tb + ' = ' + (ta - tb) + '.', 'Ghép lại hai hàng.'];
  }

  /** Lời giải cho màn "Gần đúng rồi": mã lời giải, các bước, và dữ liệu đặt tính cột dọc nếu có. */
  function loiGiai(ct) {
    const d = tinh(ct);
    if (Array.isArray(ct.phep)) {
      const r1 = tinhPhep(ct.so[0], ct.phep[0], ct.so[1]);
      return { ma: 'tu-trai-sang-phai', buoc: [ct.so[0] + ' ' + kyHieu(ct.phep[0]) + ' ' + ct.so[1] + ' = ' + r1, r1 + ' ' + kyHieu(ct.phep[1]) + ' ' + ct.so[2] + ' = ' + d], kq: d };
    }
    if (ct.an !== 'ket_qua') {
      const g = goiY(ct);
      return { ma: 'tim-thanh-phan', buoc: [g[0], g[2].replace('?', String(d))], kq: d };
    }
    const a = ct.so[0], b = ct.so[1];
    const ua = dv(a), ub = dv(b), ta = chuc(a), tb = chuc(b);
    if (a % 10 === 0 && b % 10 === 0) {
      return { ma: 'dem-chuc', buoc: [a / 10 + ' chục ' + (ct.phep === '+' ? '+' : TRU) + ' ' + b / 10 + ' chục = ' + d / 10 + ' chục', 'Vậy ' + deHien(ct).replace('?', String(d))], kq: d };
    }
    if (a < 10 && b < 10 && ct.phep === '+') {
      const lon = Math.max(a, b), be = Math.min(a, b), can = 10 - lon;
      return { ma: 'tach-10-cong', buoc: ['Tách ' + be + ' = ' + can + ' + ' + (be - can), lon + ' + ' + can + ' = 10', '10 + ' + (be - can) + ' = ' + d], kq: d };
    }
    if (a < 20 && b < 10 && ct.phep === '-') {
      return { ma: 'tach-10-tru', buoc: ['Tách ' + b + ' = ' + ua + ' + ' + (b - ua), a + ' ' + TRU + ' ' + ua + ' = 10', '10 ' + TRU + ' ' + (b - ua) + ' = ' + d], kq: d };
    }
    const cot = { tren: a, duoi: b, phep: ct.phep, kq: d, nho: false };
    if (ct.phep === '+') {
      cot.nho = ua + ub >= 10;
      const buoc = cot.nho
        ? [ua + ' + ' + ub + ' = ' + (ua + ub) + ', viết ' + dv(ua + ub) + ', nhớ 1', ta + ' + ' + tb + ' = ' + (ta + tb) + ', thêm 1 bằng ' + (ta + tb + 1) + ', viết ' + (ta + tb + 1)]
        : [ua + ' + ' + ub + ' = ' + (ua + ub) + ', viết ' + (ua + ub), ta + ' + ' + tb + ' = ' + (ta + tb) + ', viết ' + (ta + tb)];
      return { ma: cot.nho ? 'dat-tinh-cong-nho' : 'dat-tinh-cong', cot: cot, buoc: buoc, kq: d };
    }
    cot.nho = ua < ub;
    const taCo = a >= 100 ? 10 : ta;
    const buocTru = cot.nho
      ? [ua + ' không trừ được ' + ub + ', lấy ' + (10 + ua) + ' trừ ' + ub + ' bằng ' + (10 + ua - ub) + ', viết ' + (10 + ua - ub) + ', nhớ 1',
        tb + ' thêm 1 bằng ' + (tb + 1) + ', ' + taCo + ' trừ ' + (tb + 1) + ' bằng ' + (taCo - tb - 1) + (taCo - tb - 1 > 0 ? ', viết ' + (taCo - tb - 1) : '')]
      : [ua + ' trừ ' + ub + ' bằng ' + (ua - ub) + ', viết ' + (ua - ub), ta + ' trừ ' + tb + ' bằng ' + (ta - tb) + (ta - tb > 0 ? ', viết ' + (ta - tb) : '')];
    return { ma: cot.nho ? 'dat-tinh-tru-nho' : 'dat-tinh-tru', cot: cot, buoc: buocTru, kq: d };
  }

  /* ---------------- Dựng câu hoàn chỉnh ---------------- */

  /**
   * Dựng một câu từ kỹ năng và cấu trúc (hoặc sinh mới nếu không có cấu trúc).
   * opts: { dang: 'chon_dap_an' | 'nhap_so' }
   */
  function taoCau(kyNang, ct, rng, opts) {
    opts = opts || {};
    const kn = KY_NANG[kyNang];
    if (!kn) throw new Error('Không có kỹ năng ' + kyNang);
    ct = ct || SINH[kyNang](rng);
    const d = tinh(ct);
    const q = {
      ky_nang: kyNang,
      noi_dung: kn.noi_dung,
      dang: opts.dang || 'chon_dap_an',
      ma_cau: maCau(kyNang, ct),
      de: deHien(ct),
      de_doc: deDoc(ct),
      cau_truc: JSON.parse(JSON.stringify(ct)),
      dap_an: d,
      goi_y: goiY(ct),
      loi_giai: loiGiai(ct)
    };
    if (q.dang === 'chon_dap_an') {
      const nhieu = taoNhieu(kyNang, ct, rng);
      q.lua_chon = tron(rng, [{ gia_tri: d, loi: [] }].concat(nhieu));
    }
    return q;
  }

  /**
   * Lập danh sách câu cho một ván.
   * man: { cau: [{ ky_nang, ty_le }], so_cau, tram_dung }
   * opts: { cauNo: [{ cau, ky_nang, cau_truc }] (câu từng sai chưa sửa, đưa vào đầu), soCau }
   * Trả về [{ ky_nang, cau_truc, dang, on_lai_cua? }]
   */
  function lapDanhSach(man, rng, opts) {
    opts = opts || {};
    const n = opts.soCau || man.so_cau || 12;
    const ds = [];
    const daDung = {};
    (opts.cauNo || []).slice(0, Math.min(4, Math.floor(n / 3))).forEach(function (c) {
      if (!KY_NANG[c.ky_nang] || !c.cau_truc) return;
      const m = maCau(c.ky_nang, c.cau_truc);
      if (daDung[m]) return;
      daDung[m] = 1;
      ds.push({ ky_nang: c.ky_nang, cau_truc: c.cau_truc, on_lai_cua: c.cau });
    });
    const tron2 = man.cau.map(function (x) { return { ky_nang: x.ky_nang, w: x.ty_le || 1 }; });
    let thu = 0;
    while (ds.length < n && thu < n * 40) {
      thu++;
      const kn = chonTheoTrongSo(rng, tron2).ky_nang;
      const ct = SINH[kn](rng);
      const m = maCau(kn, ct);
      if (daDung[m]) continue;
      const truoc = ds[ds.length - 1];
      if (truoc && tinh(truoc.cau_truc) === tinh(ct) && thu < n * 30) continue;
      daDung[m] = 1;
      ds.push({ ky_nang: kn, cau_truc: ct });
    }
    // Câu nợ đứng đầu thì xen lẫn vào nửa đầu ván cho tự nhiên
    const soNo = ds.filter(function (x) { return x.on_lai_cua; }).length;
    if (soNo) {
      const no = ds.splice(0, soNo);
      no.forEach(function (x, i) { ds.splice(Math.min(ds.length, 1 + i * 2 + Math.floor(rng() * 2)), 0, x); });
    }
    ds.forEach(function (x, i) {
      x.dang = man.tram_dung && (i + 1) % 4 === 0 ? 'nhap_so' : 'chon_dap_an';
    });
    return ds;
  }

  window.NganHang = {
    NOI_DUNG: NOI_DUNG,
    TIEN_QUYET: TIEN_QUYET,
    LOI: LOI,
    KY_NANG: KY_NANG,
    THU_TU_KY_NANG: THU_TU_KY_NANG,
    TRU: TRU,
    taoRng: taoRng,
    tron: tron,
    tinh: tinh,
    deHien: deHien,
    deChuanHoa: deChuanHoa,
    deDoc: deDoc,
    maCau: maCau,
    nhanBietLoi: nhanBietLoi,
    loiNoiVoiBe: loiNoiVoiBe,
    sinh: function (kyNang, rng) { return SINH[kyNang](rng); },
    taoNhieu: taoNhieu,
    goiY: goiY,
    loiGiai: loiGiai,
    taoCau: taoCau,
    lapDanhSach: lapDanhSach
  };
})();
