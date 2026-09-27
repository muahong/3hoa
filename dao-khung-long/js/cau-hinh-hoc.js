/* ============================================================
   cau-hinh-hoc.js – Câu hỏi hình học lớp 2 (SGK Kết nối tri thức Bài 25 đến 28, 34, 46, 47, 72)
   Cắm vào NganHang bằng dangKyLoai; dùng cho Rừng Hình Khối, Tháp, Mê Cung, Xe Tăng và Đấu Trường.
   Mỗi loại câu ứng với một kỹ năng:
   - 'duong' (nhan-dang-duong, B2.1): kieu 'tim_loai' (đâu là đoạn thẳng, đường thẳng, đường cong, đường gấp khúc),
     'ten_doan' (gọi tên đoạn thẳng bằng hai điểm ở hai đầu), 'dem_doan' (trong hình có mấy đoạn thẳng).
   - 'thang_hang' (ba-diem-thang-hang, B2.2): 'tim_bo' (ba điểm nào thẳng hàng), 'diem_thu_ba' (điểm nào thẳng hàng với A, B).
   - 'gap_khuc' (duong-gap-khuc, B2.8): 'do_dai' (tổng độ dài các đoạn, cm), 'so_doan' (gồm mấy đoạn), 'ten' (đọc tên).
   - 'tu_giac' (hinh-tu-giac, B2.3): 'chon' (những hình nào là tứ giác), 'khong_phai', 'dem', 'dem_ghep' (tứ giác ghép từ mảnh).
   - 'ghep_hinh' (ghep-hinh, B2.5): 'hai_manh' (hai mảnh nào ghép được hình mẫu), 'dem_manh' (cần bao nhiêu hình A), 'gap_cat'.
   - 'khoi' (khoi-tru-cau, B2.4): 'phan_loai' (vật có dạng khối gì), 'tim_vat' (vật nào có dạng khối trụ, khối cầu), 'dem'.
   Điểm nằm trên lưới số nguyên 0..10 × 0..6 nên ba điểm thẳng hàng là đúng tuyệt đối (tích chéo bằng 0).
   Mã lỗi là công thức trên đáp án v của bé (đ là đáp án đúng):
     nham-doan-duong, nham-thang-cong, nham-gap-khuc: loại của đường bé chọn so với loại đề hỏi (bảng TRAN_LOI);
     nham-ten-doan: hai chữ là hai điểm có trong hình nhưng không phải hai đầu của đoạn;
     dem-thieu-doan: đếm đoạn v < đ; độ dài v = đ − (độ dài một đoạn); dem-diem: v = số điểm;
     dem-so-doan: độ dài v = số đoạn; quen-nho: độ dài v = đ − 10 khi tổng hàng đơn vị từ 10; dem-lech: v = đ ± 1;
     nham-thang-hang: ba điểm có tích chéo khác 0; ten-sai-thu-tu, ten-thieu-diem: tên đường gấp khúc;
     nham-tu-giac: v > đ hoặc tập chọn có hình không 4 cạnh; sot-tu-giac: v < đ hoặc tập chọn thiếu tứ giác;
     ghep-sai-kich-thuoc: tổng diện tích hai mảnh khác hình mẫu; ghep-sai-hinh: đủ diện tích mà không khớp;
     dem-o-vuong: v = số ô vuông (hoặc số phần) thay vì số hình A; dem-net-cat: v = số nét cắt; nham-ten-hinh; nham-khoi.
   Hình: veHinh(ct) cho dạng chọn đáp án (tự đủ nghĩa cùng đề); CauHinhHoc.veBan(ct, { tt: true }) cho bàn chơi có data-*.
   API thêm: window.CauHinhHoc
   ============================================================ */
(function () {
  'use strict';

  const NH = window.NganHang;
  const nn = NH.nn, chon = NH.chon, tron = NH.tron;

  const FONT = "'Baloo 2', 'Arial Rounded MT Bold', sans-serif";
  const MUC = '#3b2f63', MUC_NHAT = '#9a93b5', CAM = '#ff7a1a', CAM_DAM = '#d9600b', XANH = '#0f9f76', DO_NHAT = '#e5484d';
  /** Lưới điểm 0..10 × 0..6, mỗi ô U đơn vị SVG; khung W × H. */
  const U = 52, OX = 60, OY = 58, W = 640, H = 428;
  const MAU_HINH = [['#ffb4a2', '#e0795f'], ['#ffd166', '#d9a21b'], ['#8fd694', '#4fa65a'], ['#7cc6fe', '#3b8fd0'], ['#c3a6ff', '#8a63d8'], ['#ffadd6', '#d9679f']];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function r1(n) { return Math.round(n * 10) / 10; }
  function X(x) { return r1(OX + x * U); }
  function Y(y) { return r1(OY + y * U); }
  function P(p) { return X(p[0]) + ' ' + Y(p[1]); }
  let soId = 0;
  function idMoi() { soId = (soId + 1) % 1000000; return 'rh' + soId.toString(36); }

  function moSvg(nhan, lop, w, h) {
    return '<svg class="rh-svg' + (lop ? ' ' + lop : '') + '" viewBox="0 0 ' + (w || W) + ' ' + (h || H) + '" role="img" aria-label="' + esc(nhan) +
      '" xmlns="http://www.w3.org/2000/svg" font-family="' + FONT + '" font-weight="800">';
  }
  function nenSvg(w, h) { return '<rect x="3" y="3" width="' + ((w || W) - 6) + '" height="' + ((h || H) - 6) + '" rx="26" fill="#fbfff3" stroke="#cfe6b8" stroke-width="3"/>'; }
  /** Chữ có viền (viền trắng để đọc được trên nét vẽ; chữ trắng thì viền tối; them có ' stroke="none"' thì không viền). */
  function chu(x, y, t, co, mau, them) {
    them = them || '';
    const khongVien = /stroke="none"/.test(them);
    const trang = /^#f{3,6}$/i.test(mau || '');
    const vien = khongVien ? '' : ' stroke="' + (trang ? 'rgba(20,40,30,.55)' : '#fff') + '" stroke-width="' + Math.round((co || 30) / (trang ? 7 : 4.5)) + '" paint-order="stroke" stroke-linejoin="round"';
    return '<text x="' + r1(x) + '" y="' + r1(y) + '" text-anchor="middle" font-size="' + (co || 30) + '" fill="' + (mau || MUC) + '"' + vien + them.replace(/ stroke="none"/, '') + '>' + esc(t) + '</text>';
  }

  /* ---------------- Hình học trên lưới ---------------- */

  function tich(a, b, c) { return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); }
  function thangHang(a, b, c) { return tich(a, b, c) === 0; }
  function kc(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
  function kcDoan(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const l2 = dx * dx + dy * dy;
    let t = l2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2 : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  }
  function kcDuong(p, a, b) { return Math.abs(tich(a, b, p)) / kc(a, b); }
  function trongLuoi(p) { return p[0] >= 0 && p[0] <= 10 && p[1] >= 0 && p[1] <= 6; }
  /** Mã ngắn của các điểm cho mã câu: x thành chữ a..k, y giữ số (c4 là điểm x = 2, y = 4). */
  function maDiem(d) { return d.map(function (p) { return String.fromCharCode(97 + p[0]) + p[1]; }).join(''); }
  function dienTich2(poly) {
    let s = 0;
    for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; s += a[0] * b[1] - b[0] * a[1]; }
    return Math.abs(s);
  }
  function coBaThangHang(d) {
    for (let i = 0; i < d.length; i++) for (let j = i + 1; j < d.length; j++) for (let k = j + 1; k < d.length; k++) if (thangHang(d[i], d[j], d[k])) return true;
    return false;
  }
  function chuCai(v) { return String(v == null ? '' : v).toUpperCase().replace(/[^A-Z]/g, ''); }
  function soNguyen(v) { const n = Number(v); return Number.isInteger(n) ? n : null; }
  function dsSo(v) {
    if (Array.isArray(v)) return v.map(Number);
    return String(v == null ? '' : v).split(/[^0-9]+/).filter(Boolean).map(Number);
  }
  function chuoiTap(ds) { return ds.slice().sort(function (a, b) { return a - b; }).join(','); }

  /** Chọn cách hỏi theo muc.cach của màn (nếu có và hợp lệ), mặc định theo danh sách có trọng số lặp. */
  function chonCach(rng, muc, macDinh, hopLe) {
    const ds = muc && Array.isArray(muc.cach) ? muc.cach.filter(function (c) { return hopLe.indexOf(c) >= 0; }) : [];
    return chon(rng, ds.length ? ds : macDinh);
  }

  /** Chọn đáp án nhiễu: bỏ trùng, bỏ đáp án đúng, ít nhất một nhiễu mang lỗi có tên. ds: [{ v, w }]. */
  function chonNhieu(rng, ct, ds, nhanBiet, soLuong) {
    const daCo = {};
    const coTen = [], khac = [];
    ds.forEach(function (x) {
      const k = String(x.v);
      if (daCo[k]) return;
      const loi = nhanBiet(ct, x.v);
      if (!loi.length) return;
      daCo[k] = 1;
      const m = { v: x.v, w: x.w || 1, loi: loi };
      (loi.some(function (c) { return c !== 'khac' && c !== 'dem-lech'; }) ? coTen : khac).push(m);
    });
    const ra = [];
    const n = soLuong || 2;
    while (ra.length < n && (coTen.length || khac.length)) {
      const nguon = !ra.length && coTen.length ? coTen : !khac.length ? coTen : !coTen.length ? khac : rng() < 0.6 ? coTen : khac;
      const x = NH.chonTheoTrongSo(rng, nguon);
      nguon.splice(nguon.indexOf(x), 1);
      ra.push({ gia_tri: x.v, loi: x.loi });
    }
    return ra;
  }

  /* ---------------- Vẽ điểm, nhãn ---------------- */

  /** Hướng đặt nhãn của một điểm: ngược với các điểm nó nối tới (không nối thì lên trên, hơi trái). */
  function huongNhan(p, lang) {
    let vx = 0, vy = 0;
    (lang || []).forEach(function (q) {
      const dx = q[0] - p[0], dy = q[1] - p[1];
      const l = Math.hypot(dx, dy) || 1;
      vx -= dx / l; vy -= dy / l;
    });
    const l = Math.hypot(vx, vy);
    if (l < 0.35) return [-0.5, -0.87];
    return [vx / l, vy / l];
  }
  /** Pháp tuyến hướng lên của đường qua a, b (đặt nhãn điểm trên đường thẳng). */
  function phapTuyenLen(a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    let n = [dy / l, -dx / l];
    if (n[1] > 0 || (n[1] === 0 && n[0] > 0)) n = [-n[0], -n[1]];
    return [n[0] * 0.8 - 0.15, n[1]];
  }

  /**
   * Một điểm có tên. o: { tt (thêm vùng chạm và data-diem), mau, vong (màu quầng sáng), huong: [hx, hy], lop }
   */
  function veDiem(p, ten, o) {
    o = o || {};
    const x = X(p[0]), y = Y(p[1]);
    const h = o.huong || [-0.5, -0.87];
    let s = '<g class="rh-d' + (o.lop ? ' ' + o.lop : '') + '"' + (o.tt ? ' data-diem="' + esc(ten) + '"' : '') + '>';
    if (o.vong) s += '<circle cx="' + x + '" cy="' + y + '" r="19" fill="' + o.vong + '" opacity=".32"/>';
    if (o.tt) s += '<circle class="rh-quang" cx="' + x + '" cy="' + y + '" r="22"/>';
    s += '<circle class="rh-cham" cx="' + x + '" cy="' + y + '" r="9" fill="' + (o.mau || MUC) + '" stroke="#fff" stroke-width="3"/>';
    s += chu(x + h[0] * 29, y + h[1] * 29 + 11, ten, 32, o.mauChu || o.mau || MUC);
    return s + '</g>';
  }

  function duongGap(ds) { return 'M' + ds.map(P).join(' L'); }
  function net(d, mau, day, them) {
    return '<path d="' + d + '" fill="none" stroke="' + mau + '" stroke-width="' + (day || 7) + '" stroke-linecap="round" stroke-linejoin="round"' + (them || '') + '/>';
  }
  function vungCham(d) { return '<path class="rh-hit" d="' + d + '" fill="none" stroke="#fff" stroke-opacity="0" stroke-width="46" stroke-linecap="round" stroke-linejoin="round"/>'; }

  /* ================================================================
     1. Loại 'duong' (nhan-dang-duong, B2.1)
     ================================================================ */

  const TEN_LOAI = { doan: 'đoạn thẳng', thang: 'đường thẳng', cong: 'đường cong', gap: 'đường gấp khúc' };
  /** Mẫu vẽ trong ô 4 × 2 (tim_loai): điểm mút đoạn thẳng, hai điểm của đường thẳng, 4 điểm Bézier của đường cong, đỉnh đường gấp khúc. */
  const MAU_DT = {
    doan: [[[0, 2], [4, 0]], [[0, 1], [4, 1]], [[0, 0], [4, 2]], [[0, 2], [3, 0]]],
    thang: [[[1, 1], [3, 1]], [[1, 2], [3, 1]], [[1, 1], [3, 2]]],
    cong: [[[0, 2], [0.7, -0.7], [3.3, -0.7], [4, 2]], [[0, 1], [1.5, -1.3], [2.5, 3.3], [4, 1]], [[0, 0.2], [0.6, 2.9], [3.4, 2.9], [4, 0.2]]],
    gap: [[[0, 2], [1, 0], [3, 2], [4, 0]], [[0, 2], [2, 0], [4, 2]], [[0, 0], [1, 2], [3, 0], [4, 2]], [[0, 2], [1, 0], [2, 2], [4, 0]]]
  };
  /** Lỗi khi đề hỏi loại hàng, bé chọn loại cột. */
  const TRAN_LOI = {
    doan: { thang: 'nham-doan-duong', cong: 'nham-thang-cong', gap: 'nham-gap-khuc' },
    thang: { doan: 'nham-doan-duong', cong: 'nham-thang-cong', gap: 'nham-gap-khuc' },
    cong: { doan: 'nham-thang-cong', thang: 'nham-thang-cong', gap: 'nham-gap-khuc' },
    gap: { doan: 'nham-gap-khuc', thang: 'nham-gap-khuc', cong: 'nham-gap-khuc' }
  };

  function diemDoi(o) { return MAU_DT[o.k][o.v].map(function (p) { return [p[0] + o.o[0], p[1] + o.o[1]]; }); }
  function duongDoi(o) {
    const p = diemDoi(o);
    if (o.k === 'cong') return 'M' + P(p[0]) + ' C' + P(p[1]) + ' ' + P(p[2]) + ' ' + P(p[3]);
    if (o.k === 'thang') {
      const dx = p[1][0] - p[0][0], dy = p[1][1] - p[0][1], l = Math.hypot(dx, dy), e = 1.2;
      return 'M' + P([p[0][0] - dx / l * e, p[0][1] - dy / l * e]) + ' L' + P([p[1][0] + dx / l * e, p[1][1] + dy / l * e]);
    }
    return duongGap(p);
  }
  /** Tìm đối tượng theo tên bé chọn (không phân biệt chiều đọc: AB hay BA, MNPQ hay QPNM). */
  function timDoi(ct, v) {
    const s = String(v == null ? '' : v).trim();
    return ct.ds.find(function (o) {
      if (o.k === 'cong') return o.t === s || o.t === s.toLowerCase();
      const c = chuCai(s);
      return c === o.t || c === o.t.split('').reverse().join('');
    }) || null;
  }

  function veDoi(o, t) {
    t = t || {};
    const p = diemDoi(o);
    const d = duongDoi(o);
    const mau = t.mau || MUC;
    let s = '<g class="rh-doi"' + (t.tt ? ' data-doi="' + esc(o.t) + '"' : '') + '>';
    if (t.tt) s += vungCham(d);
    if (t.sang) s += net(d, t.sang, 20, ' opacity=".28"');
    s += net(d, mau, 7, ' class="rh-net"');
    if (o.k === 'cong') {
      const e = p[3];
      s += chu(X(e[0]) + 26, Y(e[1]) + 10, o.t, 32, mau, ' font-style="italic"');
    } else {
      const dinh = o.k === 'gap' ? p : p.slice(0, 2);
      dinh.forEach(function (q, i) {
        let h;
        if (o.k === 'thang') h = phapTuyenLen(p[0], p[1]);
        else if (o.k === 'doan') {
          const khac = p[1 - i];
          const hx = q[0] - khac[0], hy = q[1] - khac[1], l = Math.hypot(hx, hy);
          const vx = hx / l, vy = hy / l - 0.9, l2 = Math.hypot(vx, vy);
          h = [vx / l2, vy / l2];
        } else h = huongNhan(q, [p[i - 1], p[i + 1]].filter(Boolean));
        s += veDiem(q, o.t[i], { huong: h, mau: mau });
      });
    }
    if (t.nhanLoai) {
      const b = [o.o[0] + 2, o.o[1] + 2.72];
      s += chu(X(b[0]), Y(b[1]), TEN_LOAI[o.k], 22, t.mau || '#5b5575');
    }
    return s + '</g>';
  }

  function sinhTimLoai(rng) {
    const hoi = chon(rng, ['thang', 'doan', 'cong', 'gap', 'thang', 'doan']);
    let loai = ['doan', 'thang', 'cong', 'gap'];
    if (rng() < 0.3) {
      const bo = chon(rng, ['cong', 'gap'].filter(function (k) { return k !== hoi; }));
      loai = loai.filter(function (k) { return k !== bo; });
    }
    loai = tron(rng, loai);
    const o = tron(rng, [[0, 0], [6, 0], [0, 4], [6, 4]]);
    const cap = tron(rng, ['AB', 'CD']);
    let iCap = 0;
    const ds = loai.map(function (k, i) {
      const v = nn(rng, 0, MAU_DT[k].length - 1);
      let t;
      if (k === 'cong') t = chon(rng, ['x', 'y', 'a']);
      else if (k === 'gap') t = 'MNPQ'.slice(0, MAU_DT.gap[v].length);
      else t = cap[iCap++];
      return { k: k, t: t, o: o[i], v: v };
    });
    return { loai: 'duong', kieu: 'tim_loai', hoi: hoi, ds: ds };
  }

  /** Đoạn thẳng có tên: 5 điểm, không có ba điểm thẳng hàng; đoạn cần tìm dài, không đi sát điểm khác. */
  function sinhTenDoan(rng) {
    for (let thu = 0; thu < 500; thu++) {
      const d = [];
      for (let k = 0; k < 80 && d.length < 5; k++) {
        const p = [nn(rng, 0, 10), nn(rng, 0, 6)];
        if (d.every(function (q) { return kc(p, q) >= 2.2; })) d.push(p);
      }
      if (d.length < 5 || coBaThangHang(d)) continue;
      const sach = function (i, j) {
        return d.every(function (p, k) { return k === i || k === j || kcDoan(p, d[i], d[j]) >= 1; });
      };
      const cap = [];
      for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) if (kc(d[i], d[j]) >= 3.5 && sach(i, j)) cap.push([i, j]);
      if (!cap.length) continue;
      const doan = chon(rng, cap);
      const keUng = [];
      doan.forEach(function (e) {
        for (let k = 0; k < 5; k++) if (doan.indexOf(k) < 0 && sach(e, k)) keUng.push(e < k ? [e, k] : [k, e]);
      });
      const ke = tron(rng, keUng).slice(0, nn(rng, 1, 2));
      return { loai: 'duong', kieu: 'ten_doan', ten: chon(rng, ['ABCDE', 'ABCDE', 'MNPQR']), d: d, doan: doan, ke: ke };
    }
    return { loai: 'duong', kieu: 'ten_doan', ten: 'ABCDE', d: [[1, 1], [8, 0], [9, 5], [4, 6], [5, 3]], doan: [0, 2], ke: [[0, 1]] };
  }
  function tenCap(ct, c) { const i = Math.min(c[0], c[1]), j = Math.max(c[0], c[1]); return ct.ten[i] + ct.ten[j]; }

  /** Hình đếm đoạn thẳng (Bài 28, 34, 72). */
  const HINH_DEM = {
    tam_giac: [[[5, 0], [9, 6], [1, 6]], [[2, 1], [9, 2], [4, 6]], [[1, 5], [9, 5], [3, 0]]],
    tu_giac: [[[1, 1], [8, 0], [9, 5], [2, 6]], [[2, 0], [8, 1], [9, 6], [1, 5]], [[1, 1], [9, 1], [9, 5], [1, 5]]],
    thang_hang: [[[1, 3], [4, 3], [9, 3]], [[1, 5], [5, 3], [9, 1]], [[1, 1], [4, 3], [7, 5]]],
    bon_diem: [[[1, 1], [9, 0], [8, 6], [2, 5]], [[2, 0], [9, 1], [8, 6], [1, 5]]]
  };
  const SO_AN = { gap: 0, tam_giac: 0, tu_giac: 0, tu_giac_cheo: 1, thang_hang: 1, bon_diem: 2 };

  function canhDem(ct) {
    const n = ct.d.length;
    const c = [];
    if (ct.hinh === 'gap') { for (let i = 0; i + 1 < n; i++) c.push([i, i + 1]); return c; }
    if (ct.hinh === 'thang_hang') return [[0, 1], [1, 2], [0, 2]];
    if (ct.hinh === 'bon_diem') { for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) c.push([i, j]); return c; }
    for (let i = 0; i < n; i++) c.push([i, (i + 1) % n]);
    if (ct.hinh === 'tu_giac_cheo') c.push([0, 2]);
    return c;
  }

  function sinhDemDoan(rng) {
    const hinh = NH.chonTheoTrongSo(rng, [{ h: 'gap', w: 3 }, { h: 'tam_giac', w: 1.5 }, { h: 'tu_giac', w: 1.5 }, { h: 'tu_giac_cheo', w: 2 }, { h: 'thang_hang', w: 2.5 }, { h: 'bon_diem', w: 1.5 }]).h;
    if (hinh === 'gap') {
      const g = hinhGapKhuc(rng, nn(rng, 2, 4));
      return { loai: 'duong', kieu: 'dem_doan', hinh: 'gap', ten: chon(rng, TEN_GK[g.length]), d: g };
    }
    const mau = hinh === 'tu_giac_cheo' ? HINH_DEM.tu_giac : HINH_DEM[hinh];
    let d = chon(rng, mau).map(function (p) { return p.slice(); });
    if (rng() < 0.5) d = d.map(function (p) { return [10 - p[0], p[1]]; });
    const ten = hinh === 'thang_hang' ? 'MNP' : hinh === 'tam_giac' ? chon(rng, ['ABC', 'MNP']) : chon(rng, ['ABCD', 'MNPQ']);
    if (hinh === 'thang_hang' && d[0][0] > d[2][0]) d.reverse();
    return { loai: 'duong', kieu: 'dem_doan', hinh: hinh, ten: ten, d: d };
  }

  function sinhDuong(rng, muc) {
    const cach = chonCach(rng, muc, ['tim_loai', 'tim_loai', 'ten_doan', 'dem_doan', 'dem_doan'], ['tim_loai', 'ten_doan', 'dem_doan']);
    if (cach === 'tim_loai') return sinhTimLoai(rng);
    if (cach === 'ten_doan') return sinhTenDoan(rng);
    return sinhDemDoan(rng);
  }

  function tinhDuong(ct) {
    if (ct.kieu === 'tim_loai') return ct.ds.find(function (o) { return o.k === ct.hoi; }).t;
    if (ct.kieu === 'ten_doan') return tenCap(ct, ct.doan);
    return canhDem(ct).length;
  }

  function deDuong(ct) {
    if (ct.kieu === 'tim_loai') return 'Trong hình vẽ, đâu là ' + TEN_LOAI[ct.hoi] + '?';
    if (ct.kieu === 'ten_doan') return 'Đoạn thẳng màu cam là đoạn thẳng nào?';
    if (ct.hinh === 'thang_hang') return 'Ba điểm ' + ct.ten.split('').join(', ') + ' thẳng hàng. Trong hình vẽ có mấy đoạn thẳng?';
    return 'Trong hình vẽ có mấy đoạn thẳng?';
  }
  function deDocDuong(ct) {
    if (ct.kieu === 'ten_doan') return 'Đoạn thẳng màu cam là đoạn thẳng nào? Đọc tên hai điểm ở hai đầu.';
    return deDuong(ct);
  }

  function maDuong(ct) {
    if (ct.kieu === 'tim_loai') return 'loai-' + ct.hoi + ':' + ct.ds.map(function (o) { return o.t.toLowerCase() + '.' + o.k; }).join(',');
    if (ct.kieu === 'ten_doan') return 'ten-doan:' + tenCap(ct, ct.doan).toLowerCase() + '.' + ct.ten.toLowerCase() + '.' + maDiem(ct.d);
    return 'dem-doan:' + ct.hinh + '.' + ct.ten.toLowerCase() + '.' + maDiem(ct.d);
  }

  function loiDemSo(d, soDiem, n) {
    if (n === d) return [];
    const ma = [];
    if (n < d && n >= 0) ma.push('dem-thieu-doan');
    if (n === soDiem) ma.push('dem-diem');
    if (!ma.length && n === d + 1) ma.push('dem-lech');
    return ma.length ? ma : ['khac'];
  }

  function nhanBietLoiDuong(ct, v) {
    if (ct.kieu === 'tim_loai') {
      const o = timDoi(ct, v);
      if (!o) return ['khac'];
      if (o.k === ct.hoi) return [];
      return [TRAN_LOI[ct.hoi][o.k]];
    }
    if (ct.kieu === 'ten_doan') {
      const c = chuCai(v);
      if (c.length !== 2 || c[0] === c[1]) return ['khac'];
      const d = tinhDuong(ct);
      if (c === d || c === d[1] + d[0]) return [];
      if (ct.ten.indexOf(c[0]) >= 0 && ct.ten.indexOf(c[1]) >= 0) return ['nham-ten-doan'];
      return ['khac'];
    }
    const n = soNguyen(v);
    if (n == null) return ['khac'];
    return loiDemSo(canhDem(ct).length, ct.d.length, n);
  }

  function loiNoiDuong(ct, v, maLoi) {
    const m = (maLoi && maLoi[0]) || 'khac';
    if (ct.kieu === 'tim_loai') {
      const o = timDoi(ct, v);
      if (!o) return 'Chưa đúng rồi';
      if (o.k === 'doan') return o.t + ' là đoạn thẳng: nó dừng lại ở hai điểm ' + o.t[0] + ' và ' + o.t[1];
      if (o.k === 'thang') return o.t + ' là đường thẳng: nó đi qua hai điểm ' + o.t[0] + ', ' + o.t[1] + ' rồi kéo dài tiếp';
      if (o.k === 'cong') return 'Đường ' + o.t + ' là đường cong: nó uốn lượn, không thẳng';
      return o.t + ' là đường gấp khúc: gồm ' + (o.t.length - 1) + ' đoạn thẳng nối liền nhau';
    }
    if (ct.kieu === 'ten_doan') {
      const d = tinhDuong(ct);
      if (m === 'nham-ten-doan') return 'Đoạn thẳng cần tìm có hai đầu là điểm ' + d[0] + ' và điểm ' + d[1];
      return 'Tên đoạn thẳng là tên hai điểm ở hai đầu';
    }
    if (m === 'dem-diem') return 'Con đếm số điểm rồi, mình đếm số đoạn thẳng nhé';
    if (m === 'dem-thieu-doan') return ct.hinh === 'thang_hang' ? 'Con còn sót đoạn thẳng ' + ct.ten[0] + ct.ten[2] + ' đi từ đầu này tới đầu kia' : SO_AN[ct.hinh] ? 'Con còn sót đoạn thẳng nằm ở giữa hình' : 'Con còn sót một đoạn thẳng';
    if (m === 'dem-lech') return 'Con đếm thừa một đoạn rồi';
    return 'Mình cùng đếm lại nhé';
  }

  function goiYDuong(ct) {
    if (ct.kieu === 'tim_loai') {
      return {
        thang: ['Đường thẳng thẳng tắp và kéo dài về hai phía.', 'Đoạn thẳng dừng lại ở hai điểm, còn đường thẳng đi qua hai điểm rồi kéo dài tiếp.', 'Tìm nét thẳng có hai điểm nằm bên trong, hai đầu còn kéo dài ra.'],
        doan: ['Đoạn thẳng thẳng tắp, có hai đầu là hai điểm.', 'Đường thẳng thì kéo dài qua hai điểm, còn đoạn thẳng dừng lại ở hai điểm.', 'Tìm nét thẳng có đúng hai điểm ở hai đầu.'],
        cong: ['Đường cong uốn lượn, không thẳng.', 'Đường cong giống cầu vồng hay sợi dây nhảy.', 'Đường cong được gọi tên bằng một chữ thường, như x, y, a.'],
        gap: ['Đường gấp khúc gồm nhiều đoạn thẳng nối liền nhau.', 'Đường gấp khúc có chỗ gấp như bậc cầu thang.', 'Tìm đường đi qua ba, bốn điểm và gấp ở mỗi điểm.']
      }[ct.hoi];
    }
    if (ct.kieu === 'ten_doan') {
      const d = tinhDuong(ct);
      return ['Tên đoạn thẳng là tên hai điểm ở hai đầu của nó.', 'Nhìn đoạn thẳng màu cam: mỗi đầu có một điểm.', 'Một đầu của đoạn thẳng là điểm ' + d[0] + '.'];
    }
    const c = canhDem(ct).map(function (x) { return tenCap(ct, x); });
    const g2 = ct.hinh === 'thang_hang' ? 'Ngoài hai đoạn ngắn, còn đoạn thẳng nối hai điểm ở hai đầu.' :
      ct.hinh === 'tu_giac_cheo' ? 'Đừng quên đoạn thẳng nằm chéo ở giữa hình.' :
        ct.hinh === 'bon_diem' ? 'Mỗi điểm được nối với ba điểm còn lại.' : 'Đếm từng đoạn một, đếm xong đánh dấu để không đếm lại.';
    return ['Mỗi đoạn thẳng nối hai điểm. Kể tên từng đoạn thẳng.', g2, 'Kể tên: ' + c.slice(0, Math.max(1, c.length - 1)).join(', ') + ', …'];
  }

  function veDuong(ct, o) {
    o = o || {};
    const nhan = ct.kieu === 'tim_loai' ? 'Hình có đoạn thẳng, đường thẳng, đường cong, đường gấp khúc' : 'Hình vẽ các điểm và đoạn thẳng';
    let s = moSvg(nhan, o.lop) + (o.nen === false ? '' : nenSvg());
    if (ct.kieu === 'tim_loai') {
      const d = tinhDuong(ct);
      ct.ds.forEach(function (x) {
        const la = o.giai && x.t === d;
        s += veDoi(x, { tt: o.tt, mau: o.giai ? (la ? XANH : MUC_NHAT) : MUC, sang: la ? XANH : null, nhanLoai: o.giai });
      });
      return s + (o.tt ? '<g class="rh-lop"></g>' : '') + '</svg>';
    }
    if (ct.kieu === 'ten_doan') {
      const lang = ct.d.map(function () { return []; });
      const cacDoan = o.tt ? [] : (o.boKe ? [] : ct.ke).concat([ct.doan]);
      cacDoan.forEach(function (c) { lang[c[0]].push(ct.d[c[1]]); lang[c[1]].push(ct.d[c[0]]); });
      if (!o.tt) {
        if (!o.boKe) ct.ke.forEach(function (c) { s += net(duongGap([ct.d[c[0]], ct.d[c[1]]]), '#b7b0cf', 6); });
        s += net(duongGap([ct.d[ct.doan[0]], ct.d[ct.doan[1]]]), o.giai ? XANH : CAM, 8);
      }
      if (o.tt) s += '<g class="rh-lop-duoi"></g>';
      ct.d.forEach(function (p, i) {
        const dau = !o.tt && ct.doan.indexOf(i) >= 0;
        s += veDiem(p, ct.ten[i], { tt: o.tt, huong: huongNhan(p, lang[i]), mau: dau ? (o.giai ? XANH : CAM_DAM) : MUC, vong: dau && o.giai ? XANH : null });
      });
      return s + (o.tt ? '<g class="rh-lop"></g>' : '') + '</svg>';
    }
    return s + veHinhDem(ct, o) + '</svg>';
  }

  /** Hình đếm đoạn: các đoạn có data-doan để chạm đếm; bản lời giải tô mỗi đoạn một màu và ghi tên. */
  function veHinhDem(ct, o) {
    const c = canhDem(ct);
    const lang = ct.d.map(function () { return []; });
    c.forEach(function (x) { lang[x[0]].push(ct.d[x[1]]); lang[x[1]].push(ct.d[x[0]]); });
    let s = '';
    const dai = ct.hinh === 'thang_hang' ? [0, 2] : null;
    c.forEach(function (x, i) {
      const a = ct.d[x[0]], b = ct.d[x[1]];
      const dd = duongGap([a, b]);
      const laDai = dai && x[0] === dai[0] && x[1] === dai[1];
      if (o.giai) {
        const m = MAU_HINH[i % MAU_HINH.length][1];
        if (laDai) {
          // đoạn dài vẽ lệch lên một chút để thấy nó phủ cả hai đoạn ngắn
          const n = phapTuyenLen(a, b);
          const dd2 = duongGap([[a[0] + n[0] * 0.35, a[1] + n[1] * 0.35], [b[0] + n[0] * 0.35, b[1] + n[1] * 0.35]]);
          s += net(dd2, m, 6, ' stroke-dasharray="2 12"');
          const g = [a[0] + (b[0] - a[0]) * 0.25 + n[0] * 0.9, a[1] + (b[1] - a[1]) * 0.25 + n[1] * 0.9];
          s += chu(X(g[0]), Y(g[1]) + 8, tenCap(ct, x), 24, m);
        } else {
          s += net(dd, m, 8);
          const n = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
          const h = phapTuyenLen(a, b);
          const kx = ct.hinh === 'thang_hang' ? -h[0] : h[0] * 0.2, ky = ct.hinh === 'thang_hang' ? -h[1] : 0.1;
          s += chu(X(n[0] + kx * 0.7), Y(n[1] + ky * 0.7) + 8, tenCap(ct, x), 24, m);
        }
      } else {
        if (o.tt && !laDai) s += '<g class="rh-doan" data-doan="' + tenCap(ct, x) + '">' + vungCham(dd) + net(dd, MUC, 7, ' class="rh-net"') + '</g>';
        else if (!laDai || !o.tt) s += net(dd, MUC, 7);
      }
    });
    if (o.tt) s += '<g class="rh-lop-duoi"></g>';
    ct.d.forEach(function (p, i) {
      let h = huongNhan(p, lang[i]);
      if (ct.hinh === 'thang_hang') h = phapTuyenLen(ct.d[0], ct.d[2]);
      s += veDiem(p, ct.ten[i], { tt: o.tt, huong: h });
    });
    return s + (o.tt ? '<g class="rh-lop"></g>' : '');
  }

  function loiGiaiDuong(ct) {
    const d = tinhDuong(ct);
    if (ct.kieu === 'tim_loai') {
      const buoc = ct.ds.map(function (o) {
        if (o.k === 'doan') return 'Đoạn thẳng ' + o.t + ' dừng lại ở hai điểm ' + o.t[0] + ' và ' + o.t[1] + '.';
        if (o.k === 'thang') return 'Đường thẳng ' + o.t + ' đi qua hai điểm ' + o.t[0] + ', ' + o.t[1] + ' và kéo dài về hai phía.';
        if (o.k === 'cong') return 'Đường ' + o.t + ' uốn lượn: đó là đường cong ' + o.t + '.';
        return o.t + ' gồm ' + (o.t.length - 1) + ' đoạn thẳng nối liền nhau: đó là đường gấp khúc ' + o.t + '.';
      });
      return { ma: 'nhan-dang-duong', buoc: buoc, html: veDuong(ct, { giai: true, lop: 'rh-svg-giai' }), kq: d };
    }
    if (ct.kieu === 'ten_doan') {
      return { ma: 'ten-doan-thang', buoc: ['Đoạn thẳng màu cam có một đầu là điểm ' + d[0] + ', đầu kia là điểm ' + d[1] + '.', 'Ta gọi đó là đoạn thẳng ' + d + ' (cũng đọc là ' + d[1] + d[0] + ').'], html: veDuong(ct, { giai: true, lop: 'rh-svg-giai' }), kq: d };
    }
    const c = canhDem(ct).map(function (x) { return tenCap(ct, x); });
    return { ma: 'dem-doan-thang', buoc: ['Kể tên từng đoạn thẳng: ' + c.join(', ') + '.', 'Đếm được ' + d + ' đoạn thẳng.'], html: veDuong(ct, { giai: true, lop: 'rh-svg-giai' }), kq: d };
  }

  function ketLuanDuong(ct) {
    const d = tinhDuong(ct);
    if (ct.kieu === 'tim_loai') return 'Vậy ' + (ct.hoi === 'cong' ? 'đường ' + d : d) + ' là ' + TEN_LOAI[ct.hoi] + '.';
    if (ct.kieu === 'ten_doan') return 'Vậy đoạn thẳng màu cam là đoạn thẳng ' + d + '.';
    return 'Vậy trong hình vẽ có ' + d + ' đoạn thẳng: ' + canhDem(ct).map(function (x) { return tenCap(ct, x); }).join(', ') + '.';
  }

  function taoNhieuDuong(kyNang, ct, rng) {
    const d = tinhDuong(ct);
    if (ct.kieu === 'tim_loai') {
      const uu = { thang: 'doan', doan: 'thang', cong: 'gap', gap: 'cong' }[ct.hoi];
      return chonNhieu(rng, ct, ct.ds.map(function (o) { return { v: o.t, w: o.k === uu ? 3 : 1 }; }), nhanBietLoiDuong);
    }
    if (ct.kieu === 'ten_doan') {
      const ung = [];
      ct.ke.forEach(function (c) { ung.push({ v: tenCap(ct, c), w: 3 }); });
      ct.doan.forEach(function (e, i) {
        const kia = ct.doan[1 - i];
        for (let k = 0; k < ct.d.length; k++) if (ct.doan.indexOf(k) < 0) ung.push({ v: tenCap(ct, [kia, k]), w: kc(ct.d[e], ct.d[k]) < 4 ? 2 : 1 });
      });
      return chonNhieu(rng, ct, ung, nhanBietLoiDuong);
    }
    const an = SO_AN[ct.hinh] || 1;
    return chonNhieu(rng, ct, [{ v: d - an, w: 3 }, { v: d - 1, w: 2 }, { v: ct.d.length, w: 3 }, { v: d + 1, w: 1 }].filter(function (x) { return x.v >= 1; }), nhanBietLoiDuong);
  }

  /* ================================================================
     2. Loại 'thang_hang' (ba-diem-thang-hang, B2.2)
     ================================================================ */

  const HUONG = [[1, 0], [0, 1], [1, 1], [1, -1], [2, 1], [2, -1], [1, 2], [1, -2], [3, 1], [3, -1]];

  function boThangHang(d) {
    const ra = [];
    for (let i = 0; i < d.length; i++) for (let j = i + 1; j < d.length; j++) for (let k = j + 1; k < d.length; k++) if (thangHang(d[i], d[j], d[k])) ra.push([i, j, k]);
    return ra;
  }

  /** Ba điểm thẳng hàng (bước nhảy không đều), một điểm "suýt thẳng hàng", một điểm tự do; không có bộ ba thẳng hàng nào khác. */
  function sinhThangHang(rng, muc) {
    const kieu = chonCach(rng, muc, ['tim_bo', 'tim_bo', 'diem_thu_ba'], ['tim_bo', 'diem_thu_ba']);
    for (let thu = 0; thu < 600; thu++) {
      const h = chon(rng, HUONG);
      const k1 = nn(rng, 1, 3), k2 = nn(rng, 1, 3);
      const x0 = nn(rng, 0, 10), y0 = nn(rng, 0, 6);
      const ba = [[x0, y0], [x0 + h[0] * k1, y0 + h[1] * k1], [x0 + h[0] * (k1 + k2), y0 + h[1] * (k1 + k2)]];
      if (!ba.every(trongLuoi) || kc(ba[0], ba[1]) < 2 || kc(ba[1], ba[2]) < 2) continue;
      const d = ba.slice();
      const xa = function (p) { return d.every(function (q) { return kc(p, q) >= 2; }); };
      // điểm suýt thẳng hàng: cách đường thẳng không quá 1 ô
      const gan = [];
      for (let x = 0; x <= 10; x++) for (let y = 0; y <= 6; y++) {
        const p = [x, y];
        const k = kcDuong(p, ba[0], ba[2]);
        if (k > 0 && k <= 1.05 && xa(p)) gan.push(p);
      }
      if (!gan.length) continue;
      d.push(chon(rng, gan));
      let ok = true;
      for (let t = 0; t < 60 && d.length < 5; t++) {
        const p = [nn(rng, 0, 10), nn(rng, 0, 6)];
        if (xa(p) && boThangHang(d.concat([p])).length === 1) d.push(p);
      }
      if (d.length < 5) ok = false;
      if (!ok || boThangHang(d).length !== 1) continue;
      if (kieu === 'tim_bo') {
        const thuTu = tron(rng, [0, 1, 2, 3, 4]);
        const ten = chon(rng, ['ABCDE', 'ABCDE', 'MNPQR']);
        const dd = [];
        thuTu.forEach(function (goc, i) { dd[i] = d[goc]; });
        return { loai: 'thang_hang', kieu: 'tim_bo', ten: ten, d: dd };
      }
      // diem_thu_ba: A, B là hai điểm của bộ ba; điểm còn lại trộn với hai điểm không thẳng hàng
      const ab = tron(rng, [0, 1, 2]);
      const ung = tron(rng, [ab[2], 3, 4]);
      return { loai: 'thang_hang', kieu: 'diem_thu_ba', ten: 'ABCDE', d: [d[ab[0]], d[ab[1]], d[ung[0]], d[ung[1]], d[ung[2]]] };
    }
    return kieu === 'tim_bo'
      ? { loai: 'thang_hang', kieu: 'tim_bo', ten: 'ABCDE', d: [[1, 1], [4, 2], [7, 3], [6, 5], [9, 0]] }
      : { loai: 'thang_hang', kieu: 'diem_thu_ba', ten: 'ABCDE', d: [[1, 1], [7, 3], [4, 2], [6, 5], [9, 0]] };
  }

  function tinhTH(ct) {
    if (ct.kieu === 'tim_bo') return boThangHang(ct.d)[0].map(function (i) { return ct.ten[i]; }).join(',');
    for (let i = 2; i < ct.d.length; i++) if (thangHang(ct.d[0], ct.d[1], ct.d[i])) return ct.ten[i];
    return ct.ten[2];
  }
  function deTH(ct) {
    if (ct.kieu === 'tim_bo') return 'Ba điểm nào thẳng hàng?';
    return 'Điểm nào cùng với hai điểm ' + ct.ten[0] + ' và ' + ct.ten[1] + ' tạo thành ba điểm thẳng hàng?';
  }
  function maTH(ct) { return (ct.kieu === 'tim_bo' ? 'bo3:' : 'diem3:') + ct.ten.toLowerCase() + '.' + maDiem(ct.d); }

  function chiSo(ct, v) {
    const c = chuCai(v);
    const ds = [];
    for (let i = 0; i < c.length; i++) {
      const k = ct.ten.indexOf(c[i]);
      if (k < 0 || ds.indexOf(k) >= 0) return null;
      ds.push(k);
    }
    return ds;
  }
  function nhanBietLoiTH(ct, v) {
    const ds = chiSo(ct, v);
    if (!ds) return ['khac'];
    if (ct.kieu === 'tim_bo') {
      if (ds.length !== 3) return ['khac'];
      return thangHang(ct.d[ds[0]], ct.d[ds[1]], ct.d[ds[2]]) ? [] : ['nham-thang-hang'];
    }
    if (ds.length !== 1 || ds[0] < 2) return ['khac'];
    return thangHang(ct.d[0], ct.d[1], ct.d[ds[0]]) ? [] : ['nham-thang-hang'];
  }
  function hienTH(v, ct) {
    const ds = chiSo(ct, v);
    if (!ds) return String(v);
    return ds.sort(function (a, b) { return a - b; }).map(function (i) { return ct.ten[i]; }).join(', ');
  }
  function loiNoiTH(ct, v, maLoi) {
    const ds = chiSo(ct, v);
    if (!ds || (maLoi && maLoi[0] === 'khac')) return ct.kieu === 'tim_bo' ? 'Con chọn đủ ba điểm nhé' : 'Chọn một điểm khác hai điểm ' + ct.ten[0] + ', ' + ct.ten[1];
    if (ct.kieu === 'tim_bo') {
      const dung = boThangHang(ct.d)[0];
      const chung = ds.filter(function (i) { return dung.indexOf(i) >= 0; });
      if (chung.length === 2) {
        const le = ds.find(function (i) { return dung.indexOf(i) < 0; });
        return 'Điểm ' + ct.ten[le] + ' nằm lệch ra ngoài đường thẳng đi qua ' + ct.ten[chung[0]] + ' và ' + ct.ten[chung[1]];
      }
      return 'Ba điểm ' + hienTH(v, ct) + ' không cùng nằm trên một đường thẳng';
    }
    return 'Điểm ' + ct.ten[ds[0]] + ' nằm lệch ra ngoài đường thẳng đi qua ' + ct.ten[0] + ' và ' + ct.ten[1];
  }
  function goiYTH(ct) {
    const d = tinhTH(ct);
    if (ct.kieu === 'tim_bo') return ['Ba điểm thẳng hàng cùng nằm trên một đường thẳng.', 'Đặt thước qua hai điểm, xem điểm thứ ba có nằm đúng trên mép thước không.', 'Có điểm ' + d.split(',')[0] + ' trong ba điểm đó.'];
    return ['Ba điểm thẳng hàng cùng nằm trên một đường thẳng.', 'Tưởng tượng một sợi dây căng thẳng qua hai điểm ' + ct.ten[0] + ' và ' + ct.ten[1] + ', dài ra cả hai phía.', 'Điểm cần tìm nằm đúng trên sợi dây đó, không lệch chút nào.'];
  }

  function veTH(ct, o) {
    o = o || {};
    const d = tinhTH(ct);
    const bo = ct.kieu === 'tim_bo' ? d.split(',') : [ct.ten[0], ct.ten[1], d];
    let s = moSvg('Các điểm ' + ct.ten.split('').join(', '), o.lop) + (o.nen === false ? '' : nenSvg());
    if (o.giai) {
      const p = bo.map(function (t) { return ct.d[ct.ten.indexOf(t)]; }).sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
      const a = p[0], b = p[2], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
      s += net(duongGap([[a[0] - dx / l * 0.9, a[1] - dy / l * 0.9], [b[0] + dx / l * 0.9, b[1] + dy / l * 0.9]]), XANH, 5, ' stroke-dasharray="14 9" opacity=".9"');
    }
    if (o.tt) s += '<g class="rh-lop-duoi"></g>';
    ct.d.forEach(function (p, i) {
      const la = o.giai && bo.indexOf(ct.ten[i]) >= 0;
      const co = ct.kieu === 'diem_thu_ba' && i < 2;
      s += veDiem(p, ct.ten[i], { tt: o.tt && !co, mau: la ? XANH : co ? CAM_DAM : MUC, vong: la ? XANH : co ? CAM : null, lop: co ? 'rh-co-dinh' : '' });
    });
    return s + (o.tt ? '<g class="rh-lop"></g>' : '') + '</svg>';
  }

  function loiGiaiTH(ct) {
    const d = tinhTH(ct).split(',');
    const bo = ct.kieu === 'tim_bo' ? d : [ct.ten[0], ct.ten[1], d[0]];
    return {
      ma: 'ba-diem-thang-hang',
      buoc: ['Kẻ một đường thẳng đi qua hai điểm ' + bo[0] + ' và ' + bo[1] + '.', 'Điểm ' + bo[2] + ' cũng nằm trên đường thẳng đó.', 'Vậy ba điểm ' + bo.slice().sort().join(', ') + ' thẳng hàng.'],
      html: veTH(ct, { giai: true, lop: 'rh-svg-giai' }), kq: tinhTH(ct)
    };
  }
  function taoNhieuTH(kyNang, ct, rng) {
    const dung = boThangHang(ct.d)[0];
    const ung = [];
    if (ct.kieu === 'tim_bo') {
      for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) for (let k = j + 1; k < 5; k++) {
        const chung = [i, j, k].filter(function (x) { return dung.indexOf(x) >= 0; }).length;
        ung.push({ v: [i, j, k].map(function (x) { return ct.ten[x]; }).join(','), w: chung === 2 ? 3 + (kcDuong(ct.d[[i, j, k].find(function (x) { return dung.indexOf(x) < 0; })], ct.d[dung[0]], ct.d[dung[2]]) <= 1.05 ? 3 : 0) : 1 });
      }
    } else {
      for (let i = 2; i < 5; i++) ung.push({ v: ct.ten[i], w: kcDuong(ct.d[i], ct.d[0], ct.d[1]) <= 1.05 ? 3 : 1 });
    }
    return chonNhieu(rng, ct, ung, nhanBietLoiTH);
  }

  /* ================================================================
     3. Loại 'gap_khuc' (duong-gap-khuc, B2.8)
     ================================================================ */

  const TEN_GK = { 3: ['ABC', 'MNP', 'HIK'], 4: ['ABCD', 'MNPQ', 'DEGH', 'CDEG'], 5: ['ABCDE', 'MNPQR'] };

  /** Đỉnh của một đường gấp khúc n đoạn: răng cưa trái sang phải, bậc thang, hay chữ L; lật ngang ngẫu nhiên. */
  function hinhGapKhuc(rng, n) {
    for (let thu = 0; thu < 300; thu++) {
      const kieu = n === 2 ? chon(rng, ['rang', 'rang', 'chu_l']) : chon(rng, ['rang', 'rang', 'rang', 'bac']);
      let d = [];
      if (kieu === 'chu_l') {
        const a = nn(rng, 3, 5), b = nn(rng, 4, 8);
        const x0 = nn(rng, 1, 10 - b), y0 = nn(rng, 0, 6 - a);
        d = [[x0, y0], [x0, y0 + a], [x0 + b, y0 + a]];
      } else if (kieu === 'bac') {
        let x = nn(rng, 0, 2), y = 6;
        d.push([x, y]);
        for (let i = 0; i < n; i++) {
          if (i % 2 === 0) x += nn(rng, 3, 4); else y -= n >= 4 ? 3 : nn(rng, 3, 4);
          d.push([x, y]);
        }
      } else {
        let x = nn(rng, 0, 1);
        let y = nn(rng, 0, 6);
        let len = rng() < 0.5;
        d.push([x, y]);
        for (let i = 0; i < n; i++) {
          x += n >= 4 ? 2 : nn(rng, 2, 3) + (n === 2 ? nn(rng, 0, 1) : 0);
          const ung = [];
          for (let yy = 0; yy <= 6; yy++) if (Math.abs(yy - y) >= 2 && (len ? yy < y : yy > y)) ung.push(yy);
          if (!ung.length) break;
          y = chon(rng, ung);
          len = !len;
          d.push([x, y]);
        }
      }
      if (d.length !== n + 1 || !d.every(trongLuoi)) continue;
      let ok = true;
      for (let i = 0; i + 1 < d.length; i++) if (kc(d[i], d[i + 1]) < 2) ok = false;
      for (let i = 0; i + 2 < d.length; i++) if (thangHang(d[i], d[i + 1], d[i + 2])) ok = false;
      if (!ok) continue;
      if (rng() < 0.4) d = d.map(function (p) { return [10 - p[0], p[1]]; });
      const xs = d.map(function (p) { return p[0]; }), ys = d.map(function (p) { return p[1]; });
      const dx = Math.round((10 - Math.max.apply(null, xs) - Math.min.apply(null, xs)) / 2), dy = Math.round((6 - Math.max.apply(null, ys) - Math.min.apply(null, ys)) / 2);
      return d.map(function (p) { return [p[0] + dx, p[1] + dy]; });
    }
    return n === 2 ? [[1, 1], [1, 5], [8, 5]] : n === 3 ? [[1, 5], [3, 1], [6, 5], [9, 2]] : [[1, 5], [3, 1], [5, 5], [7, 1], [9, 5]];
  }

  /** Độ dài (cm) các đoạn: thường 2 đến 9 cm (Bài 26), đôi khi số tròn chục hoặc có hai chữ số (Bài 28, 72), tổng không quá 99. */
  function doDaiDoan(rng, n) {
    const r = rng();
    for (let thu = 0; thu < 50; thu++) {
      let l;
      if (r < 0.1) l = Array.from({ length: n }, function () { return nn(rng, 1, 3) * 10; });
      else if (r < 0.2) l = Array.from({ length: n }, function () { return nn(rng, 6, 29); });
      else l = Array.from({ length: n }, function () { return n >= 4 ? nn(rng, 1, 7) : nn(rng, 2, 9); });
      const t = l.reduce(function (a, b) { return a + b; }, 0);
      if (t <= 99 && t > n + 1) return l;
    }
    return Array.from({ length: n }, function (x, i) { return 2 + i; });
  }

  function sinhGapKhuc(rng, muc) {
    const kieu = chonCach(rng, muc, ['do_dai', 'do_dai', 'do_dai', 'so_doan', 'ten'], ['do_dai', 'so_doan', 'ten']);
    const n = kieu === 'do_dai' ? NH.chonTheoTrongSo(rng, [{ n: 2, w: 1 }, { n: 3, w: 2.4 }, { n: 4, w: 0.9 }]).n : nn(rng, 2, 4);
    const d = hinhGapKhuc(rng, n);
    const ct = { loai: 'gap_khuc', kieu: kieu, ten: chon(rng, TEN_GK[n + 1]), d: d };
    if (kieu === 'do_dai') ct.l = doDaiDoan(rng, n);
    return ct;
  }

  function tenDoanGK(ct, i) { return ct.ten[i] + ct.ten[i + 1]; }
  function tinhGK(ct) {
    if (ct.kieu === 'do_dai') return ct.l.reduce(function (a, b) { return a + b; }, 0);
    if (ct.kieu === 'so_doan') return ct.d.length - 1;
    return ct.ten;
  }
  function deGK(ct) {
    if (ct.kieu === 'do_dai') return 'Tính độ dài đường gấp khúc ' + ct.ten + '.';
    if (ct.kieu === 'so_doan') return 'Đường gấp khúc ' + ct.ten + ' gồm mấy đoạn thẳng?';
    return 'Đường gấp khúc trong hình vẽ tên là gì?';
  }
  function deDocGK(ct) {
    if (ct.kieu === 'do_dai') return deGK(ct) + ' ' + ct.l.map(function (x, i) { return 'Đoạn ' + tenDoanGK(ct, i).split('').join(' ') + ' dài ' + x + ' xăng-ti-mét.'; }).join(' ');
    return deGK(ct);
  }
  function maGK(ct) {
    if (ct.kieu === 'do_dai') return 'gk:' + ct.l.join('+') + '.' + ct.ten.toLowerCase() + '.' + maDiem(ct.d);
    return (ct.kieu === 'so_doan' ? 'gk-so-doan:' : 'gk-ten:') + ct.ten.toLowerCase() + '.' + maDiem(ct.d);
  }
  function nhoDonVi(l) { return Math.floor(l.reduce(function (a, b) { return a + (b % 10); }, 0) / 10); }

  function nhanBietLoiGK(ct, v) {
    if (ct.kieu === 'ten') {
      const c = chuCai(v);
      if (c === ct.ten || c === ct.ten.split('').reverse().join('')) return [];
      if (!c.length || c.split('').some(function (x) { return ct.ten.indexOf(x) < 0; })) return ['khac'];
      if (c.length === ct.ten.length && c.split('').sort().join('') === ct.ten.split('').sort().join('')) return ['ten-sai-thu-tu'];
      if (c.length < ct.ten.length && new Set(c.split('')).size === c.length) return ['ten-thieu-diem'];
      return ['khac'];
    }
    const n = soNguyen(v);
    if (n == null) return ['khac'];
    const d = tinhGK(ct);
    if (n === d) return [];
    if (ct.kieu === 'so_doan') return loiDemSo(d, ct.d.length, n);
    const ma = [];
    if (ct.l.length >= 2 && ct.l.some(function (x) { return n === d - x; })) ma.push('dem-thieu-doan');
    const nho = nhoDonVi(ct.l);
    if (nho >= 1 && (n === d - 10 || (nho >= 2 && n === d - 20))) ma.push('quen-nho');
    if (n === ct.l.length) ma.push('dem-so-doan');
    if (!ma.length && Math.abs(n - d) === 1) ma.push('dem-lech');
    return ma.length ? ma : ['khac'];
  }
  function hienGK(v, ct) {
    if (ct.kieu === 'do_dai') return String(v) + ' cm';
    if (ct.kieu === 'ten') return chuCai(v);
    return String(v);
  }
  function loiNoiGK(ct, v, maLoi) {
    const m = (maLoi && maLoi[0]) || 'khac';
    if (ct.kieu === 'ten') {
      if (m === 'ten-sai-thu-tu') return 'Đọc tên lần lượt từng điểm, đi dọc theo đường gấp khúc từ đầu này sang đầu kia';
      if (m === 'ten-thieu-diem') return 'Tên đường gấp khúc có đủ tất cả các điểm, không bỏ điểm nào';
      return 'Đọc lần lượt tên các điểm trên đường gấp khúc';
    }
    if (ct.kieu === 'so_doan') return loiNoiDuong({ kieu: 'dem_doan', hinh: 'gap', ten: ct.ten, d: ct.d }, v, maLoi);
    const n = soNguyen(v);
    if (m === 'dem-thieu-doan') {
      const i = ct.l.findIndex(function (x) { return n === tinhGK(ct) - x; });
      const cungDai = ct.l.filter(function (x) { return x === ct.l[i]; }).length;
      return cungDai > 1 ? 'Con còn thiếu một đoạn dài ' + ct.l[i] + ' cm' : 'Con còn thiếu đoạn ' + tenDoanGK(ct, i) + ' dài ' + ct.l[i] + ' cm';
    }
    if (m === 'quen-nho') return 'Con quên nhớ 1 sang hàng chục rồi';
    if (m === 'dem-so-doan') return 'Đề hỏi độ dài, con cộng độ dài các đoạn nhé';
    if (m === 'dem-lech') return 'Con cộng lệch một chút rồi';
    return 'Độ dài đường gấp khúc là tổng độ dài các đoạn thẳng';
  }
  function goiYGK(ct) {
    const doan = ct.d.slice(1).map(function (x, i) { return tenDoanGK(ct, i); });
    if (ct.kieu === 'do_dai') return ['Độ dài đường gấp khúc là tổng độ dài các đoạn thẳng của nó.', 'Đường gấp khúc ' + ct.ten + ' gồm ' + doan.length + ' đoạn: ' + doan.join(', ') + '.', ct.l.join(' + ') + ' = ?'];
    if (ct.kieu === 'so_doan') return ['Mỗi đoạn thẳng nối hai điểm liền nhau.', 'Đếm đoạn, không đếm điểm: ' + ct.d.length + ' điểm thì ít hơn 1 đoạn.', 'Kể tên: ' + doan.slice(0, -1).join(', ') + ', …'];
    return ['Đọc tên đường gấp khúc lần lượt theo các điểm trên đường.', 'Bắt đầu từ một đầu: điểm ' + ct.ten[0] + ' hoặc điểm ' + ct.ten[ct.ten.length - 1] + '.', 'Tên bắt đầu bằng ' + ct.ten.slice(0, 2) + '…'];
  }

  /** Vẽ đường gấp khúc; o.giai tô mỗi đoạn một màu; o.soThuTu ghi thứ tự đọc; o.tt thêm data-doan. */
  function veGK(ct, o) {
    o = o || {};
    let s = moSvg('Đường gấp khúc ' + ct.ten, o.lop) + (o.nen === false ? '' : nenSvg());
    const n = ct.d.length - 1;
    const nhan = [];
    for (let i = 0; i < n; i++) {
      const a = ct.d[i], b = ct.d[i + 1];
      const dd = duongGap([a, b]);
      const mau = o.giai && ct.kieu !== 'ten' ? MAU_HINH[(i + 2) % MAU_HINH.length][1] : o.giai ? XANH : MUC;
      if (o.tt) s += '<g class="rh-doan" data-doan="' + tenDoanGK(ct, i) + '"' + (ct.l ? ' data-l="' + ct.l[i] + '"' : '') + '>' + vungCham(dd) + net(dd, mau, 7, ' class="rh-net"') + '</g>';
      else s += net(dd, mau, o.giai ? 8 : 7);
      if (ct.l) nhan.push({ i: i, m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], mau: mau });
      if (o.giai && ct.kieu === 'so_doan') {
        const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        const h = phapTuyenLen(a, b);
        s += '<circle cx="' + X(m[0] - h[0] * 0.55) + '" cy="' + Y(m[1] - h[1] * 0.55) + '" r="17" fill="' + mau + '"/>' + chu(X(m[0] - h[0] * 0.55), Y(m[1] - h[1] * 0.55) + 8, String(i + 1), 22, '#fff', ' stroke="none"');
      }
    }
    nhan.forEach(function (x) {
      const t = ct.l[x.i] + ' cm';
      const w = t.length * 14 + 20, cx = X(x.m[0]), cy = Y(x.m[1]);
      s += '<g class="rh-nhan-l"' + (o.tt ? ' data-doan="' + tenDoanGK(ct, x.i) + '"' : '') + '><rect x="' + r1(cx - w / 2) + '" y="' + r1(cy - 18) + '" width="' + w + '" height="36" rx="18" fill="#fffaf2" stroke="' + (o.giai ? x.mau : '#e3b48f') + '" stroke-width="3"/>' +
        chu(cx, cy + 9, t, 25, o.giai ? x.mau : '#b4400f', ' stroke="none"') + '</g>';
    });
    if (o.tt) s += '<g class="rh-lop-duoi"></g>';
    ct.d.forEach(function (p, i) {
      const h = huongNhan(p, [ct.d[i - 1], ct.d[i + 1]].filter(Boolean));
      s += veDiem(p, ct.ten[i], { tt: o.tt && ct.kieu === 'ten', huong: h, mau: o.giai && ct.kieu === 'ten' ? XANH : MUC });
      if (o.giai && ct.kieu === 'ten') s += '<circle cx="' + X(p[0] - h[0] * 0.55) + '" cy="' + Y(p[1] - h[1] * 0.55) + '" r="14" fill="' + CAM + '"/>' + chu(X(p[0] - h[0] * 0.55), Y(p[1] - h[1] * 0.55) + 7, String(i + 1), 19, '#fff', ' stroke="none"');
    });
    return s + (o.tt ? '<g class="rh-lop"></g>' : '') + '</svg>';
  }

  function loiGiaiGK(ct) {
    const d = tinhGK(ct);
    const doan = ct.d.slice(1).map(function (x, i) { return tenDoanGK(ct, i); });
    if (ct.kieu === 'do_dai') {
      return { ma: 'do-dai-gap-khuc', buoc: ['Đường gấp khúc ' + ct.ten + ' gồm các đoạn thẳng ' + doan.join(', ') + '.', 'Độ dài đường gấp khúc ' + ct.ten + ' là:', ct.l.join(' + ') + ' = ' + d + ' (cm)', 'Đáp số: ' + d + ' cm.'], html: veGK(ct, { giai: true, lop: 'rh-svg-giai' }), kq: d };
    }
    if (ct.kieu === 'so_doan') return { ma: 'so-doan-gap-khuc', buoc: ['Đường gấp khúc ' + ct.ten + ' gồm các đoạn thẳng: ' + doan.join(', ') + '.', 'Có ' + ct.d.length + ' điểm nhưng chỉ có ' + d + ' đoạn thẳng.'], html: veGK(ct, { giai: true, lop: 'rh-svg-giai' }), kq: d };
    return { ma: 'ten-gap-khuc', buoc: ['Đi dọc đường gấp khúc từ điểm ' + ct.ten[0] + ', đọc lần lượt từng điểm.', 'Ta được đường gấp khúc ' + ct.ten + ' (đọc từ đầu kia là ' + ct.ten.split('').reverse().join('') + ').'], html: veGK(ct, { giai: true, lop: 'rh-svg-giai' }), kq: d };
  }
  function ketLuanGK(ct) {
    const d = tinhGK(ct);
    if (ct.kieu === 'do_dai') return 'Vậy đường gấp khúc ' + ct.ten + ' dài ' + ct.l.join(' + ') + ' = ' + d + ' (cm).';
    if (ct.kieu === 'so_doan') return 'Vậy đường gấp khúc ' + ct.ten + ' gồm ' + d + ' đoạn thẳng.';
    return 'Vậy đó là đường gấp khúc ' + ct.ten + '.';
  }
  function taoNhieuGK(kyNang, ct, rng) {
    const d = tinhGK(ct);
    if (ct.kieu === 'ten') {
      const t = ct.ten;
      const ung = [];
      for (let i = 1; i + 1 < t.length; i++) ung.push({ v: t.slice(0, i) + t[i + 1] + t[i] + t.slice(i + 2), w: 3 });
      ung.push({ v: t[1] + t[0] + t.slice(2), w: 1 });
      for (let i = 1; i + 1 < t.length; i++) ung.push({ v: t.slice(0, i) + t.slice(i + 1), w: 2 });
      return chonNhieu(rng, ct, ung, nhanBietLoiGK);
    }
    if (ct.kieu === 'so_doan') return chonNhieu(rng, ct, [{ v: d + 1, w: 3 }, { v: d - 1, w: 2 }].filter(function (x) { return x.v >= 1; }), nhanBietLoiGK);
    const ung = ct.l.map(function (x) { return { v: d - x, w: 3 }; });
    if (nhoDonVi(ct.l) >= 1) ung.push({ v: d - 10, w: 3 });
    ung.push({ v: d + 1, w: 1 }, { v: d - 1, w: 1 });
    if (d > ct.l.length + 2) ung.push({ v: ct.l.length, w: 0.6 });
    return chonNhieu(rng, ct, ung.filter(function (x) { return x.v >= 1; }), nhanBietLoiGK);
  }

  /* ================================================================
     4. Loại 'tu_giac' (hinh-tu-giac, B2.3)
     ================================================================ */

  /** Mẫu hình trong ô 100 × 100: c là số cạnh (0: hình tròn). */
  const HINH = {
    vuong: { c: 4, p: [[18, 18], [82, 18], [82, 82], [18, 82]] },
    chu_nhat: { c: 4, p: [[6, 28], [94, 28], [94, 72], [6, 72]] },
    thoi: { c: 4, p: [[50, 6], [86, 50], [50, 94], [14, 50]] },
    binh_hanh: { c: 4, p: [[30, 24], [96, 24], [70, 76], [4, 76]] },
    thang: { c: 4, p: [[30, 22], [70, 22], [94, 78], [6, 78]] },
    thang_vuong: { c: 4, p: [[12, 20], [58, 20], [90, 80], [12, 80]] },
    tu_giac: { c: 4, p: [[14, 34], [66, 10], [90, 66], [34, 88]] },
    dieu: { c: 4, p: [[50, 6], [82, 38], [50, 94], [18, 38]] },
    tam_giac: { c: 3, p: [[50, 8], [94, 86], [6, 86]] },
    tam_giac_vuong: { c: 3, p: [[14, 10], [14, 88], [88, 88]] },
    tam_giac_nhon: { c: 3, p: [[12, 20], [92, 40], [36, 90]] },
    ngu_giac: { c: 5, p: [[12, 12], [62, 12], [88, 38], [88, 88], [12, 88]] },
    tron: { c: 0, p: [] }
  };
  const TG = ['vuong', 'chu_nhat', 'thoi', 'binh_hanh', 'thang', 'thang_vuong', 'tu_giac', 'dieu'];
  const KHONG_TG = ['tam_giac', 'tam_giac_vuong', 'tam_giac_nhon', 'ngu_giac', 'tron'];
  const GOC = [0, 14, -12, 24];
  /** Tứ giác "khó nhận ra" (nghiêng, không đều): bé hay bỏ sót. */
  const KHO = { thang: 1, thang_vuong: 1, tu_giac: 1, dieu: 1, binh_hanh: 1 };

  function tenHinh(ma) { return ma.split('.')[0]; }
  function soCanh(ma) { return HINH[tenHinh(ma)].c; }
  function laTG(ma) { return soCanh(ma) === 4; }

  /** Đỉnh của hình đã xoay, đặt vào ô tâm (cx, cy), cạnh s. */
  function dinhHinh(ma, cx, cy, s) {
    const h = HINH[tenHinh(ma)];
    const g = GOC[Number(ma.split('.')[1]) || 0] * Math.PI / 180;
    const cos = Math.cos(g), sin = Math.sin(g);
    return h.p.map(function (p) {
      const x = (p[0] - 50) / 100 * s, y = (p[1] - 50) / 100 * s;
      return [r1(cx + x * cos - y * sin), r1(cy + x * sin + y * cos)];
    });
  }
  function oHinh(n) {
    if (n <= 4) return [[180, 118], [460, 118], [180, 322], [460, 322]].slice(0, n);
    if (n === 5) return [[112, 118], [320, 118], [528, 118], [216, 322], [424, 322]];
    return [[112, 118], [320, 118], [528, 118], [112, 322], [320, 322], [528, 322]];
  }
  function veMotHinh(ma, cx, cy, s, mau, them) {
    if (tenHinh(ma) === 'tron') return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r1(s * 0.42) + '" fill="' + mau[0] + '" stroke="' + mau[1] + '" stroke-width="5"' + (them || '') + '/>';
    return '<polygon points="' + dinhHinh(ma, cx, cy, s).map(function (p) { return p.join(','); }).join(' ') + '" fill="' + mau[0] + '" stroke="' + mau[1] + '" stroke-width="5" stroke-linejoin="round"' + (them || '') + '/>';
  }
  function soHieu(x, y, so, mau) {
    return '<circle cx="' + x + '" cy="' + y + '" r="19" fill="' + (mau || MUC) + '"/><text x="' + x + '" y="' + (y + 8) + '" text-anchor="middle" font-size="24" fill="#fff">' + so + '</text>';
  }

  /** Hình ghép nhiều mảnh (Bài 28, 72): mảnh là đa giác trên lưới, tg là các nhóm mảnh tạo thành tứ giác. */
  const GHEP_TG = {
    cn_cheo: { manh: [[[1, 1], [4, 1], [6, 5], [1, 5]], [[4, 1], [9, 1], [9, 5], [6, 5]]], tg: [[0], [1], [0, 1]] },
    ngu_giac: { manh: [[[1, 5], [8, 5], [9, 2]], [[1, 5], [9, 2], [5, 0]], [[1, 5], [5, 0], [1, 2]]], tg: [[0, 1], [1, 2]] },
    ba_phan: { manh: [[[1, 5], [3, 1], [3, 5]], [[3, 1], [7, 1], [7, 5], [3, 5]], [[7, 1], [9, 3], [7, 5]]], tg: [[1], [0, 1]] },
    ba_phan_b: { manh: [[[1, 5], [3, 1], [3, 5]], [[3, 1], [7, 1], [7, 5], [3, 5]], [[7, 1], [9, 5], [7, 5]]], tg: [[1], [0, 1], [1, 2], [0, 1, 2]] },
    ba_dai: { manh: [[[1, 1], [4, 1], [4, 5], [1, 5]], [[4, 1], [6, 1], [6, 5], [4, 5]], [[6, 1], [9, 1], [9, 5], [6, 5]]], tg: [[0], [1], [2], [0, 1], [1, 2], [0, 1, 2]] },
    tam_giac_cat: { manh: [[[5, 0], [7, 3], [3, 3]], [[3, 3], [7, 3], [9, 6], [1, 6]]], tg: [[1]] },
    vuong_cheo: { manh: [[[2, 0], [8, 0], [8, 6]], [[2, 0], [8, 6], [2, 6]]], tg: [[0, 1]] }
  };

  function sinhTuGiac(rng, muc) {
    const kieu = chonCach(rng, muc, ['chon', 'chon', 'khong_phai', 'dem', 'dem_ghep', 'dem_ghep'], ['chon', 'khong_phai', 'dem', 'dem_ghep']);
    if (kieu === 'dem_ghep') {
      const m = NH.chonTheoTrongSo(rng, [{ m: 'cn_cheo', w: 2 }, { m: 'ngu_giac', w: 2 }, { m: 'ba_phan', w: 1.5 }, { m: 'ba_phan_b', w: 1 }, { m: 'ba_dai', w: 0.7 }, { m: 'tam_giac_cat', w: 1.2 }, { m: 'vuong_cheo', w: 1.2 }]).m;
      return { loai: 'tu_giac', kieu: 'dem_ghep', m: m, lat: rng() < 0.4 ? 1 : 0 };
    }
    const n = kieu === 'khong_phai' ? 4 : nn(rng, 5, 6);
    const soTG = kieu === 'khong_phai' ? 3 : nn(rng, 2, n === 6 ? 4 : 3);
    const tg = tron(rng, TG).slice(0, soTG);
    const khong = [chon(rng, ['tam_giac', 'tam_giac_vuong', 'tam_giac_nhon', 'ngu_giac'])];
    const conLai = tron(rng, KHONG_TG.filter(function (k) { return k !== khong[0] && (k !== 'tron' || rng() < 0.4); }));
    while (tg.length + khong.length < n) khong.push(conLai.shift());
    const h = tron(rng, tg.concat(khong)).map(function (k) { return k + '.' + (k === 'tron' ? 0 : nn(rng, 0, 3)); });
    return { loai: 'tu_giac', kieu: kieu, h: h };
  }

  function soTuGiacGhep(ct) { return GHEP_TG[ct.m].tg.length; }
  function tinhTG(ct) {
    if (ct.kieu === 'dem_ghep') return soTuGiacGhep(ct);
    const ds = [];
    ct.h.forEach(function (m, i) { if (laTG(m) === (ct.kieu !== 'khong_phai')) ds.push(i + 1); });
    if (ct.kieu === 'chon') return ds.join(',');
    if (ct.kieu === 'khong_phai') return ds[0];
    return ds.length;
  }
  function deTG(ct) {
    if (ct.kieu === 'chon') return 'Những hình nào là hình tứ giác?';
    if (ct.kieu === 'khong_phai') return 'Hình nào không phải là hình tứ giác?';
    if (ct.kieu === 'dem') return 'Có mấy hình tứ giác?';
    return 'Trong hình vẽ có mấy hình tứ giác?';
  }
  function maTG(ct) {
    if (ct.kieu === 'dem_ghep') return 'tg-ghep:' + ct.m + (ct.lat ? '.lat' : '');
    return 'tg-' + (ct.kieu === 'khong_phai' ? 'khong' : ct.kieu) + ':' + ct.h.map(function (m) { return m.replace('.', '-'); }).join(',');
  }
  function nhanBietLoiTG(ct, v) {
    if (ct.kieu === 'chon') {
      const ds = dsSo(v).filter(function (x, i, a) { return a.indexOf(x) === i; });
      if (!ds.length) return ['sot-tu-giac'];
      if (ds.some(function (x) { return x < 1 || x > ct.h.length; })) return ['khac'];
      const ma = [];
      if (ct.h.some(function (m, i) { return laTG(m) && ds.indexOf(i + 1) < 0; })) ma.push('sot-tu-giac');
      if (ds.some(function (x) { return !laTG(ct.h[x - 1]); })) ma.push('nham-tu-giac');
      return ma;
    }
    const n = soNguyen(v);
    if (n == null) return ['khac'];
    if (ct.kieu === 'khong_phai') {
      if (n < 1 || n > ct.h.length) return ['khac'];
      return laTG(ct.h[n - 1]) ? ['sot-tu-giac'] : [];
    }
    const d = tinhTG(ct);
    if (n === d) return [];
    return n < d ? ['sot-tu-giac'] : ['nham-tu-giac'];
  }
  function hienTG(v, ct) {
    if (ct.kieu === 'chon') { const ds = dsSo(v); return ds.length ? 'Hình ' + ds.sort(function (a, b) { return a - b; }).join(', ') : 'chưa chọn hình nào'; }
    if (ct.kieu === 'khong_phai') return 'Hình ' + v;
    return String(v);
  }
  function tenCanh(c) { return c === 0 ? 'không có cạnh nào' : c + ' cạnh'; }
  function loiNoiTG(ct, v, maLoi) {
    const m = (maLoi && maLoi[0]) || 'khac';
    if (ct.kieu === 'chon') {
      const ds = dsSo(v);
      const nham = ds.find(function (x) { return ct.h[x - 1] && !laTG(ct.h[x - 1]); });
      if (nham) return 'Hình ' + nham + ' có ' + tenCanh(soCanh(ct.h[nham - 1])) + ' nên không phải hình tứ giác';
      const sot = ct.h.findIndex(function (h, i) { return laTG(h) && ds.indexOf(i + 1) < 0; });
      if (sot >= 0) return 'Hình ' + (sot + 1) + ' có 4 cạnh, cũng là hình tứ giác';
      return 'Hình tứ giác có đúng 4 cạnh';
    }
    if (ct.kieu === 'khong_phai') {
      const n = soNguyen(v);
      if (n && ct.h[n - 1] && laTG(ct.h[n - 1])) return 'Hình ' + n + ' có 4 cạnh nên là hình tứ giác';
      return 'Tìm hình không có đúng 4 cạnh';
    }
    if (ct.kieu === 'dem_ghep') return m === 'sot-tu-giac' ? 'Con còn sót hình tứ giác ghép từ hai, ba mảnh' : m === 'nham-tu-giac' ? 'Có hình con đếm chưa phải tứ giác: xem lại số cạnh' : 'Mình cùng đếm lại nhé';
    return m === 'sot-tu-giac' ? 'Con còn sót hình tứ giác nằm nghiêng hay không đều' : m === 'nham-tu-giac' ? 'Hình tam giác, hình có 5 cạnh không phải tứ giác' : 'Mình cùng đếm lại nhé';
  }
  function goiYTG(ct) {
    if (ct.kieu === 'dem_ghep') {
      const g = GHEP_TG[ct.m];
      const don = g.tg.filter(function (x) { return x.length === 1; }).length;
      return ['Hình tứ giác có 4 cạnh. Đếm cả hình ghép từ hai, ba mảnh.', 'Đếm hình một mảnh trước, rồi đến hình ghép từ hai mảnh, rồi cả hình.', 'Có ' + don + ' hình tứ giác một mảnh, con tìm tiếp hình ghép nhé.'];
    }
    const g1 = 'Hình tứ giác có 4 cạnh. Đếm số cạnh của từng hình.';
    const g2 = 'Hình vuông, hình chữ nhật, hình nằm nghiêng hay méo mà có 4 cạnh đều là tứ giác.';
    if (ct.kieu === 'khong_phai') return [g1, g2, 'Tìm hình có 3 cạnh, 5 cạnh hoặc hình tròn.'];
    const k = ct.h.filter(function (m) { return !laTG(m); }).length;
    return [g1, g2, 'Có ' + k + ' hình không phải tứ giác.'];
  }

  function veGhepTG(ct, o, nhom) {
    const g = GHEP_TG[ct.m];
    const lat = function (p) { return ct.lat ? [10 - p[0], p[1]] : p; };
    let s = '';
    g.manh.forEach(function (m, i) {
      const pts = m.map(lat);
      const sang = nhom && nhom.indexOf(i) >= 0;
      const mau = o.thu ? (sang ? ['#ffb870', CAM_DAM] : ['#ffffff', '#b8b1cf']) : MAU_HINH[(i + 3) % MAU_HINH.length];
      s += '<g class="rh-manh"' + (o.tt ? ' data-hinh="' + (i + 1) + '"' : '') + '><polygon class="rh-mat" points="' + pts.map(function (p) { return X(p[0]) + ',' + Y(p[1]); }).join(' ') +
        '" fill="' + mau[0] + '" stroke="' + (o.thu ? mau[1] : MUC) + '" stroke-width="' + (o.thu ? 6 : 5) + '" stroke-linejoin="round"/>';
      if (!o.thu) {
        const c = [pts.reduce(function (a, p) { return a + p[0]; }, 0) / pts.length, pts.reduce(function (a, p) { return a + p[1]; }, 0) / pts.length];
        s += '<circle cx="' + X(c[0]) + '" cy="' + Y(c[1]) + '" r="21" fill="#fff" stroke="' + MUC + '" stroke-width="3"/>' + chu(X(c[0]), Y(c[1]) + 9, String(i + 1), 26, MUC, ' stroke="none"');
      }
      s += '</g>';
    });
    return s;
  }

  function veTG(ct, o) {
    o = o || {};
    let s = moSvg(ct.kieu === 'dem_ghep' ? 'Hình ghép từ nhiều mảnh' : 'Các hình được đánh số', o.lop) + (o.nen === false ? '' : nenSvg());
    if (ct.kieu === 'dem_ghep') return s + veGhepTG(ct, o) + (o.tt ? '<g class="rh-lop"></g>' : '') + '</svg>';
    const oo = oHinh(ct.h.length);
    const kich = ct.h.length <= 4 ? 170 : 150;
    ct.h.forEach(function (m, i) {
      const c = oo[i];
      const tg = laTG(m);
      let mau = MAU_HINH[i % MAU_HINH.length];
      if (o.giai) mau = tg ? ['#bff0d9', XANH] : ['#f1eff6', '#b8b1cf'];
      s += '<g class="rh-hinh-k"' + (o.tt ? ' data-hinh="' + (i + 1) + '"' : '') + '>';
      if (o.tt) s += '<rect class="rh-hit" x="' + (c[0] - 100) + '" y="' + (c[1] - 98) + '" width="200" height="196" rx="24" fill="#fff" fill-opacity="0"/>';
      s += '<rect class="rh-o-nen" x="' + (c[0] - 96) + '" y="' + (c[1] - 94) + '" width="192" height="188" rx="22" fill="#ffffff" fill-opacity=".001"/>';
      s += veMotHinh(m, c[0], c[1] + 6, kich, mau, ' class="rh-mat"');
      if (o.giai) {
        if (tg) dinhHinh(m, c[0], c[1] + 6, kich).forEach(function (p) { s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="7" fill="' + XANH + '"/>'; });
        s += chu(c[0], c[1] + 94, tenCanh(soCanh(m)), 22, tg ? XANH : '#8a84a3');
      }
      s += soHieu(c[0] - 82, c[1] - 76, i + 1, o.giai ? (tg ? XANH : '#b8b1cf') : MUC) + '</g>';
    });
    return s + (o.tt ? '<g class="rh-lop"></g>' : '') + '</svg>';
  }

  /** Lời giải hình ghép: mỗi tứ giác tìm được vẽ thành một hình nhỏ. */
  function veGiaiGhepTG(ct) {
    const g = GHEP_TG[ct.m];
    const n = g.tg.length;
    const cot = Math.min(3, n), hang = Math.ceil(n / cot);
    const w = 640, ch = 150, h = hang * ch + 8;
    let s = moSvg('Các hình tứ giác tìm được', 'rh-svg-giai', w, h) + nenSvg(w, h);
    g.tg.forEach(function (nhom, i) {
      const c = i % cot, r = Math.floor(i / cot);
      const ox = (w - cot * 200) / 2 + c * 200 + 12, oy = r * ch + 12;
      s += '<g transform="translate(' + ox + ',' + oy + ') scale(.3)">' + veGhepTG(ct, { thu: true }, nhom) + '</g>';
      s += chu(ox + 88, oy + 128, nhom.map(function (x) { return x + 1; }).join(' và '), 22, XANH);
    });
    return s + '</svg>';
  }

  function loiGiaiTG(ct) {
    const d = tinhTG(ct);
    if (ct.kieu === 'dem_ghep') {
      const g = GHEP_TG[ct.m];
      const ds = g.tg.map(function (nhom) { return nhom.length === 1 ? 'hình ' + (nhom[0] + 1) : 'hình ghép ' + nhom.map(function (x) { return x + 1; }).join(' và '); });
      return { ma: 'dem-tu-giac-ghep', buoc: ['Các hình tứ giác: ' + ds.join('; ') + '.', 'Có tất cả ' + d + ' hình tứ giác.'], html: veGiaiGhepTG(ct), kq: d };
    }
    const tg = [], khong = [];
    ct.h.forEach(function (m, i) { (laTG(m) ? tg : khong).push(i + 1); });
    const buoc = ['Hình ' + tg.join(', ') + ' có 4 cạnh: đó là hình tứ giác.'];
    khong.forEach(function (i) { buoc.push('Hình ' + i + ' có ' + tenCanh(soCanh(ct.h[i - 1])) + ': không phải hình tứ giác.'); });
    return { ma: 'nhan-dang-tu-giac', buoc: buoc, html: veTG(ct, { giai: true, lop: 'rh-svg-giai' }), kq: d };
  }
  function ketLuanTG(ct) {
    const d = tinhTG(ct);
    if (ct.kieu === 'chon') return 'Vậy hình ' + String(d).split(',').join(', ') + ' là hình tứ giác.';
    if (ct.kieu === 'khong_phai') return 'Vậy hình ' + d + ' không phải là hình tứ giác.';
    return 'Vậy có ' + d + ' hình tứ giác.';
  }
  function taoNhieuTG(kyNang, ct, rng) {
    const d = tinhTG(ct);
    if (ct.kieu === 'chon') {
      const dung = String(d).split(',').map(Number);
      const khong = ct.h.map(function (m, i) { return i + 1; }).filter(function (i) { return dung.indexOf(i) < 0; });
      const ung = [];
      dung.forEach(function (i) { if (dung.length > 1) ung.push({ v: chuoiTap(dung.filter(function (x) { return x !== i; })), w: KHO[tenHinh(ct.h[i - 1])] ? 3 : 1 }); });
      khong.forEach(function (i) { ung.push({ v: chuoiTap(dung.concat([i])), w: tenHinh(ct.h[i - 1]) === 'ngu_giac' ? 3 : 1.5 }); });
      return chonNhieu(rng, ct, ung, nhanBietLoiTG);
    }
    if (ct.kieu === 'khong_phai') return chonNhieu(rng, ct, ct.h.map(function (m, i) { return { v: i + 1, w: KHO[tenHinh(m)] ? 3 : 1 }; }), nhanBietLoiTG);
    if (ct.kieu === 'dem') {
      const nguGiac = ct.h.filter(function (m) { return tenHinh(m) === 'ngu_giac'; }).length;
      return chonNhieu(rng, ct, [{ v: d - 1, w: 3 }, { v: d + Math.max(1, nguGiac), w: 3 }, { v: ct.h.length, w: 1 }, { v: d + 1, w: 1 }].filter(function (x) { return x.v >= 1; }), nhanBietLoiTG);
    }
    const g = GHEP_TG[ct.m];
    const don = g.tg.filter(function (x) { return x.length === 1; }).length;
    return chonNhieu(rng, ct, [{ v: don, w: 3 }, { v: d - 1, w: 2 }, { v: g.manh.length, w: 2 }, { v: d + 1, w: 2 }, { v: d + 2, w: 0.3 }].filter(function (x) { return x.v >= 1; }), nhanBietLoiTG);
  }

  /* ================================================================
     5. Loại 'ghep_hinh' (ghep-hinh, B2.5, Bài 27, 34)
     ================================================================ */

  /** Hai mảnh ghép hình mẫu: khuon là hình mẫu, manh[i].p là mảnh ở khay, manh[i].c là chỗ của mảnh trong khuôn (nếu đúng). */
  const MAU_GHEP = {
    g1: { khuon: [[0, 6], [6, 6], [3, 0]], manh: [{ p: [[0, 2], [2, 2], [1, 0]], c: [[2, 2], [4, 2], [3, 0]] }, { p: [[0, 3], [2, 3], [1, 0]] }, { p: [[2, 0], [4, 0], [6, 4], [0, 4]], c: [[2, 2], [4, 2], [6, 6], [0, 6]] }] },
    g2: { khuon: [[0, 0], [6, 0], [6, 6], [0, 6]], manh: [{ p: [[0, 0], [3, 0], [6, 6], [0, 6]], c: [[0, 0], [3, 0], [6, 6], [0, 6]] }, { p: [[0, 0], [0, 6], [2, 6]] }, { p: [[0, 0], [6, 0], [6, 3]], c: [[3, 0], [6, 0], [6, 6]] }] },
    g3: { khuon: [[0, 0], [3, 0], [3, 2], [0, 2]], manh: [{ p: [[0, 0], [2, 0], [2, 2], [0, 2]], c: [[0, 0], [2, 0], [2, 2], [0, 2]] }, { p: [[0, 0], [2, 0], [2, 1], [0, 1]], c: [[2, 0], [3, 0], [3, 2], [2, 2]] }, { p: [[0, 0], [2, 2], [0, 2]] }] },
    g4: { khuon: [[0, 0], [2, 0], [2, 2], [0, 2]], manh: [{ p: [[0, 0], [2, 0], [0, 2]], c: [[0, 0], [2, 0], [0, 2]] }, { p: [[0, 0], [2, 0], [2, 1], [0, 1]] }, { p: [[0, 2], [2, 0], [2, 2]], c: [[0, 2], [2, 0], [2, 2]] }] },
    g5: { khuon: [[0, 0], [0, 4], [4, 4]], manh: [{ p: [[0, 0], [2, 0], [4, 2], [0, 2]], c: [[0, 2], [2, 2], [4, 4], [0, 4]] }, { p: [[0, 0], [0, 2], [2, 2]], c: [[0, 0], [0, 2], [2, 2]] }, { p: [[0, 0], [2, 0], [2, 2], [0, 2]] }] },
    g6: { khuon: [[0, 1], [1, 0], [2, 1], [2, 3], [0, 3]], manh: [{ p: [[0, 0], [2, 0], [2, 2], [0, 2]], c: [[0, 1], [2, 1], [2, 3], [0, 3]] }, { p: [[0, 1], [1, 0], [2, 1]], c: [[0, 1], [1, 0], [2, 1]] }, { p: [[0, 2], [1, 0], [2, 2]] }] }
  };
  /** Hình B ghép từ hình A (nửa ô vuông, Bài 34): mỗi ô 'F' (cả ô) hay nửa ô có góc vuông ở 'NW', 'NE', 'SW', 'SE'. */
  const MAU_XEP = {
    b1: [[0, 0, 'SE'], [1, 0, 'F'], [2, 0, 'SW'], [1, 1, 'F']],
    b2: [[0, 0, 'F'], [1, 0, 'F'], [0, 1, 'F'], [1, 1, 'F']],
    b3: [[0, 0, 'SW'], [0, 1, 'F'], [1, 1, 'SW']],
    b4: [[0, 0, 'SE'], [1, 0, 'SW'], [0, 1, 'F'], [1, 1, 'F']],
    b5: [[0, 0, 'NE'], [0, 1, 'SE'], [1, 0, 'F'], [1, 1, 'F'], [2, 0, 'SW'], [2, 1, 'NW']],
    b6: [[0, 0, 'SE'], [1, 0, 'F'], [2, 0, 'F'], [3, 0, 'SW']],
    b7: [[0, 0, 'SE'], [1, 0, 'F'], [2, 0, 'NW']]
  };
  /** Gấp, cắt tờ giấy (Bài 27): nét cắt (đứt), kết quả n hình gì, các mảnh sau khi cắt. */
  const MAU_CAT = {
    vuong_1cheo: { w: 4, h: 4, net: [[0, 0, 4, 4]], ra: { n: 2, h: 'tam_giac' }, manh: [[[0, 0], [4, 0], [4, 4]], [[0, 0], [4, 4], [0, 4]]] },
    vuong_2cheo: { w: 4, h: 4, net: [[0, 0, 4, 4], [4, 0, 0, 4]], ra: { n: 4, h: 'tam_giac' }, manh: [[[0, 0], [4, 0], [2, 2]], [[4, 0], [4, 4], [2, 2]], [[4, 4], [0, 4], [2, 2]], [[0, 4], [0, 0], [2, 2]]] },
    vuong_chu_thap: { w: 4, h: 4, net: [[2, 0, 2, 4], [0, 2, 4, 2]], ra: { n: 4, h: 'vuong' }, manh: [[[0, 0], [2, 0], [2, 2], [0, 2]], [[2, 0], [4, 0], [4, 2], [2, 2]], [[2, 2], [4, 2], [4, 4], [2, 4]], [[0, 2], [2, 2], [2, 4], [0, 4]]] },
    vuong_doc: { w: 4, h: 4, net: [[2, 0, 2, 4]], ra: { n: 2, h: 'chu_nhat' }, manh: [[[0, 0], [2, 0], [2, 4], [0, 4]], [[2, 0], [4, 0], [4, 4], [2, 4]]] },
    cn_doc: { w: 6, h: 3, net: [[3, 0, 3, 3]], ra: { n: 2, h: 'vuong' }, manh: [[[0, 0], [3, 0], [3, 3], [0, 3]], [[3, 0], [6, 0], [6, 3], [3, 3]]] },
    cn_ba: { w: 6, h: 2, net: [[2, 0, 2, 2], [4, 0, 4, 2]], ra: { n: 3, h: 'vuong' }, manh: [[[0, 0], [2, 0], [2, 2], [0, 2]], [[2, 0], [4, 0], [4, 2], [2, 2]], [[4, 0], [6, 0], [6, 2], [4, 2]]] },
    vuong_ngang: { w: 6, h: 6, net: [[0, 2, 6, 2], [0, 4, 6, 4]], ra: { n: 3, h: 'chu_nhat' }, manh: [[[0, 0], [6, 0], [6, 2], [0, 2]], [[0, 2], [6, 2], [6, 4], [0, 4]], [[0, 4], [6, 4], [6, 6], [0, 6]]] }
  };
  const TEN_HINH_CAT = { tam_giac: 'hình tam giác', vuong: 'hình vuông', chu_nhat: 'hình chữ nhật' };
  const HINH_KHAC = { tam_giac: ['vuong', 'chu_nhat'], vuong: ['tam_giac', 'chu_nhat'], chu_nhat: ['vuong', 'tam_giac'] };

  function sinhGhep(rng, muc) {
    const kieu = chonCach(rng, muc, ['hai_manh', 'hai_manh', 'dem_manh', 'gap_cat'], ['hai_manh', 'dem_manh', 'gap_cat']);
    if (kieu === 'hai_manh') return { loai: 'ghep_hinh', kieu: kieu, m: chon(rng, Object.keys(MAU_GHEP)), th: tron(rng, [0, 1, 2]) };
    if (kieu === 'dem_manh') return { loai: 'ghep_hinh', kieu: kieu, m: chon(rng, Object.keys(MAU_XEP)) };
    return { loai: 'ghep_hinh', kieu: kieu, m: chon(rng, Object.keys(MAU_CAT)) };
  }

  function dungGhep(ct) {
    const g = MAU_GHEP[ct.m];
    const ds = [];
    ct.th.forEach(function (goc, i) { if (g.manh[goc].c) ds.push(i + 1); });
    return ds;
  }
  function soManhXep(m) { return MAU_XEP[m].reduce(function (a, o) { return a + (o[2] === 'F' ? 2 : 1); }, 0); }
  function tinhGhep(ct) {
    if (ct.kieu === 'hai_manh') return dungGhep(ct).join(',');
    if (ct.kieu === 'dem_manh') return soManhXep(ct.m);
    const r = MAU_CAT[ct.m].ra;
    return r.n + ':' + r.h;
  }
  function deGhep(ct) {
    if (ct.kieu === 'hai_manh') return 'Hai mảnh nào ghép lại được hình mẫu?';
    if (ct.kieu === 'dem_manh') return 'Cần bao nhiêu hình A để xếp thành hình B?';
    return 'Cắt tờ giấy theo các nét đứt thì được những hình gì?';
  }
  function maGhep(ct) {
    if (ct.kieu === 'hai_manh') return 'ghep2:' + ct.m + '.' + ct.th.join('');
    if (ct.kieu === 'dem_manh') return 'xep-a:' + ct.m;
    return 'cat:' + ct.m;
  }
  function docCat(v) {
    const m = String(v == null ? '' : v).match(/^(\d+):([a-z_]+)$/);
    return m ? { n: Number(m[1]), h: m[2] } : null;
  }
  function nhanBietLoiGhep(ct, v) {
    if (ct.kieu === 'hai_manh') {
      const ds = dsSo(v).filter(function (x, i, a) { return a.indexOf(x) === i; });
      if (ds.length !== 2 || ds.some(function (x) { return x < 1 || x > 3; })) return ['khac'];
      if (chuoiTap(ds) === tinhGhep(ct)) return [];
      const g = MAU_GHEP[ct.m];
      const dt = ds.reduce(function (a, x) { return a + dienTich2(g.manh[ct.th[x - 1]].p); }, 0);
      return dt !== dienTich2(g.khuon) ? ['ghep-sai-kich-thuoc'] : ['ghep-sai-hinh'];
    }
    if (ct.kieu === 'dem_manh') {
      const n = soNguyen(v);
      if (n == null) return ['khac'];
      const d = soManhXep(ct.m);
      if (n === d) return [];
      const o = MAU_XEP[ct.m];
      const dienTich = o.reduce(function (a, x) { return a + (x[2] === 'F' ? 1 : 0.5); }, 0);
      if (n === dienTich || n === o.length) return ['dem-o-vuong'];
      if (Math.abs(n - d) === 1) return ['dem-lech'];
      return ['khac'];
    }
    const x = docCat(v);
    if (!x) return ['khac'];
    const r = MAU_CAT[ct.m].ra;
    if (x.n === r.n && x.h === r.h) return [];
    const ma = [];
    if (x.h !== r.h) ma.push('nham-ten-hinh');
    if (x.n !== r.n) {
      if (x.n === MAU_CAT[ct.m].net.length) ma.push('dem-net-cat');
      else if (Math.abs(x.n - r.n) === 1) ma.push('dem-lech');
      else ma.push('khac');
    }
    return ma;
  }
  function hienGhep(v, ct) {
    if (ct.kieu === 'hai_manh') { const ds = dsSo(v).sort(function (a, b) { return a - b; }); return ds.length ? 'Mảnh ' + ds.join(' và ') : 'chưa chọn mảnh nào'; }
    if (ct.kieu === 'dem_manh') return v + ' hình A';
    const x = docCat(v);
    return x ? x.n + ' ' + (TEN_HINH_CAT[x.h] || x.h) : String(v);
  }
  function loiNoiGhep(ct, v, maLoi) {
    const m = (maLoi && maLoi[0]) || 'khac';
    if (ct.kieu === 'hai_manh') {
      if (m === 'ghep-sai-kich-thuoc') return 'Hai mảnh này ghép lại to hơn hoặc nhỏ hơn hình mẫu';
      if (m === 'ghep-sai-hinh') return 'Hai mảnh này đủ lớn nhưng không ghép khít được hình mẫu';
      return 'Chọn đúng hai mảnh nhé';
    }
    if (ct.kieu === 'dem_manh') {
      if (m === 'dem-o-vuong') return 'Mỗi ô vuông cần 2 hình A, mỗi nửa ô cần 1 hình A';
      if (m === 'dem-lech') return 'Con đếm lệch một chút rồi';
      return 'Mình cùng đếm lại';
    }
    const r = MAU_CAT[ct.m].ra;
    if (m === 'dem-net-cat') return 'Con đếm số nét cắt rồi, mình đếm số mảnh giấy nhé';
    if (m === 'nham-ten-hinh') return 'Mỗi mảnh cắt ra là ' + TEN_HINH_CAT[r.h];
    return 'Đếm lại số mảnh giấy cắt ra nhé';
  }
  function goiYGhep(ct) {
    if (ct.kieu === 'hai_manh') return ['Tưởng tượng đặt từng mảnh vào hình mẫu, có thể xoay mảnh.', 'Hai mảnh phải lấp kín hình mẫu, không thừa, không thiếu.', 'Mảnh ' + dungGhep(ct)[0] + ' là một trong hai mảnh cần chọn.'];
    if (ct.kieu === 'dem_manh') return ['Hình A là nửa ô vuông.', 'Mỗi ô vuông đầy của hình B cần 2 hình A.', 'Đếm số ô vuông đầy, nhân đôi, rồi thêm số nửa ô.'];
    return ['Mỗi nét đứt là một đường cắt.', 'Tưởng tượng cắt hết các nét, đếm số mảnh giấy rời ra.', 'Xem mỗi mảnh có mấy cạnh, cạnh có bằng nhau không.'];
  }

  function khungGhep(poly) {
    const xs = poly.map(function (p) { return p[0]; }), ys = poly.map(function (p) { return p[1]; });
    return { x0: Math.min.apply(null, xs), y0: Math.min.apply(null, ys), x1: Math.max.apply(null, xs), y1: Math.max.apply(null, ys) };
  }
  function diemPoly(poly, ox, oy, g) { return poly.map(function (p) { return r1(ox + p[0] * g) + ',' + r1(oy + p[1] * g); }).join(' '); }
  function luoi(ox, oy, w, h, g, mau) {
    let s = '<g stroke="' + (mau || '#d9e8c8') + '" stroke-width="1.5">';
    for (let i = 0; i <= w; i++) s += '<line x1="' + r1(ox + i * g) + '" y1="' + oy + '" x2="' + r1(ox + i * g) + '" y2="' + r1(oy + h * g) + '"/>';
    for (let j = 0; j <= h; j++) s += '<line x1="' + ox + '" y1="' + r1(oy + j * g) + '" x2="' + r1(ox + w * g) + '" y2="' + r1(oy + j * g) + '"/>';
    return s + '</g>';
  }
  /** Bố cục bàn hai mảnh: khay bên trái (3 mảnh), khuôn bên phải; trả về tọa độ từng mảnh. */
  function boCucGhep(ct) {
    const g0 = MAU_GHEP[ct.m];
    const ks = ct.th.map(function (goc) { return khungGhep(g0.manh[goc].p); });
    const rongKhay = ks.reduce(function (a, k) { return a + (k.x1 - k.x0); }, 0) + 1.3;
    const kk = khungGhep(g0.khuon);
    const cao = Math.max(kk.y1 - kk.y0, Math.max.apply(null, ks.map(function (k) { return k.y1 - k.y0; })));
    const g = Math.min(64, 350 / rongKhay, 190 / (kk.x1 - kk.x0), 200 / cao);
    let x = 30;
    const manh = ct.th.map(function (goc, i) {
      const k = ks[i];
      const ox = x - k.x0 * g, oy = 214 - (k.y1 + k.y0) / 2 * g;
      x += (k.x1 - k.x0) * g + g * 0.65;
      return { goc: goc, so: i + 1, ox: r1(ox), oy: r1(oy), cx: r1(ox + (k.x0 + k.x1) / 2 * g), cy: r1(oy + (k.y0 + k.y1) / 2 * g), k: k };
    });
    const kx = 512 - (kk.x0 + kk.x1) / 2 * g, ky = 186 - (kk.y0 + kk.y1) / 2 * g;
    return { g: g, manh: manh, kx: r1(kx), ky: r1(ky), kk: kk };
  }

  function veGhep(ct, o) {
    o = o || {};
    if (ct.kieu === 'hai_manh') {
      const g0 = MAU_GHEP[ct.m];
      const b = boCucGhep(ct);
      const g = b.g, kk = b.kk;
      let s = moSvg('Ba mảnh ghép và hình mẫu', o.lop) + (o.nen === false ? '' : nenSvg());
      s += '<rect' + (o.tt ? ' class="rh-khuon-vung" data-ro="khuon"' : '') + ' x="396" y="34" width="232" height="360" rx="22" fill="#eef7e4" stroke="#b9d99a" stroke-width="3" stroke-dasharray="10 8"/>';
      s += chu(512, 68, 'Hình mẫu', 26, '#3f7a2a');
      if (o.tt) s += '<rect x="412" y="304" width="200" height="78" rx="16" fill="#ffffff" fill-opacity=".6" stroke="#b9d99a" stroke-width="2.5" stroke-dasharray="8 7"/>' + '<g class="rh-goi-khuon">' + chu(512, 352, 'Kéo mảnh vào đây', 20, '#6b8f55') + '</g>';
      s += '<g class="rh-khuon">' + luoi(b.kx + kk.x0 * g, b.ky + kk.y0 * g, kk.x1 - kk.x0, kk.y1 - kk.y0, g) +
        '<polygon points="' + diemPoly(g0.khuon, b.kx, b.ky, g) + '" fill="' + (o.giai ? '#ffffff' : '#bfe3a4') + '" stroke="#4f8f36" stroke-width="5" stroke-linejoin="round"/>';
      if (o.giai) {
        ct.th.forEach(function (goc, i) {
          const m = g0.manh[goc];
          if (m.c) s += '<polygon points="' + diemPoly(m.c, b.kx, b.ky, g) + '" fill="' + MAU_HINH[i % MAU_HINH.length][0] + '" stroke="' + MUC + '" stroke-width="4" stroke-linejoin="round"/>';
        });
        ct.th.forEach(function (goc, i) {
          const m = g0.manh[goc];
          if (!m.c) return;
          const cx = m.c.reduce(function (a, p) { return a + p[0]; }, 0) / m.c.length, cy = m.c.reduce(function (a, p) { return a + p[1]; }, 0) / m.c.length;
          s += chu(b.kx + cx * g, b.ky + cy * g + 9, String(i + 1), 26, MUC);
        });
      }
      s += '</g>';
      if (o.tt) s += '<g class="rh-lop-duoi"></g>';
      b.manh.forEach(function (m, i) {
        const p = g0.manh[m.goc].p;
        const mo = o.giai && !g0.manh[m.goc].c;
        s += '<g class="rh-manh-g"' + (o.tt ? ' data-keo="' + (i + 1) + '" data-hinh="' + (i + 1) + '"' : '') + ' data-cx="' + m.cx + '" data-cy="' + m.cy + '" data-w="' + r1((m.k.x1 - m.k.x0) * g) + '" data-h="' + r1((m.k.y1 - m.k.y0) * g) + '"><g class="rh-dich">';
        if (o.tt) s += '<rect class="rh-hit" x="' + r1(m.ox + m.k.x0 * g - 16) + '" y="' + r1(m.oy + m.k.y0 * g - 16) + '" width="' + r1((m.k.x1 - m.k.x0) * g + 32) + '" height="' + r1((m.k.y1 - m.k.y0) * g + 32) + '" rx="16" fill="#fff" fill-opacity="0"/>';
        s += '<polygon class="rh-mat" points="' + diemPoly(p, m.ox, m.oy, g) + '" fill="' + MAU_HINH[i % MAU_HINH.length][0] + '" stroke="' + MUC + '" stroke-width="4" stroke-linejoin="round"' + (mo ? ' opacity=".35"' : '') + '/>';
        s += soHieu(r1(m.cx), r1(m.oy + m.k.y1 * g + 30), m.so, mo ? '#b8b1cf' : MUC) + '</g></g>';
      });
      return s + (o.tt ? '<g class="rh-lop"></g>' : '') + '</svg>';
    }
    if (ct.kieu === 'dem_manh') return veXep(ct, o);
    return veCat(ct, o);
  }

  function tamGiacO(x, y, loai) {
    const c = { NW: [[x, y], [x + 1, y], [x, y + 1]], NE: [[x, y], [x + 1, y], [x + 1, y + 1]], SW: [[x, y], [x, y + 1], [x + 1, y + 1]], SE: [[x + 1, y], [x + 1, y + 1], [x, y + 1]] };
    return c[loai];
  }
  /** Các chỗ đặt hình A của hình B: ô đầy tách thành hai nửa theo đường chéo /. */
  function kheXep(m) {
    const ds = [];
    MAU_XEP[m].forEach(function (o) {
      if (o[2] === 'F') { ds.push(tamGiacO(o[0], o[1], 'NW')); ds.push(tamGiacO(o[0], o[1], 'SE')); }
      else ds.push(tamGiacO(o[0], o[1], o[2]));
    });
    return ds;
  }
  function veXep(ct, o) {
    const cells = MAU_XEP[ct.m];
    const w = Math.max.apply(null, cells.map(function (c) { return c[0]; })) + 1;
    const h = Math.max.apply(null, cells.map(function (c) { return c[1]; })) + 1;
    const g = Math.min(96, 330 / w, 280 / h);
    const bx = r1(430 - w * g / 2), by = r1(222 - h * g / 2);
    let s = moSvg('Hình A và hình B trên lưới ô vuông', o.lop) + (o.nen === false ? '' : nenSvg());
    // Hình A
    const ga = g;
    s += '<rect x="30" y="112" width="170" height="210" rx="22" fill="#fff8e6" stroke="#f0cf86" stroke-width="3"/>';
    s += chu(115, 150, 'Hình A', 28, '#9a5b00');
    s += '<g' + (o.tt ? ' class="rh-nguon" data-keo="A"' : '') + '><polygon class="rh-mat" points="' + diemPoly(tamGiacO(0, 0, 'SW'), 115 - ga / 2, 234 - ga / 2, ga) + '" fill="#ffb347" stroke="#c46a00" stroke-width="4" stroke-linejoin="round"/></g>';
    // Hình B
    s += chu(430, by - 18, 'Hình B', 28, '#3f7a2a');
    s += '<rect x="' + r1(bx - 14) + '" y="' + r1(by - 14) + '" width="' + r1(w * g + 28) + '" height="' + r1(h * g + 28) + '" rx="16" fill="#f4faee" stroke="#d5e8c3" stroke-width="2"/>' + luoi(bx, by, w, h, g, '#e2eed6');
    cells.forEach(function (c) {
      const poly = c[2] === 'F' ? [[c[0], c[1]], [c[0] + 1, c[1]], [c[0] + 1, c[1] + 1], [c[0], c[1] + 1]] : tamGiacO(c[0], c[1], c[2]);
      s += '<polygon points="' + diemPoly(poly, bx, by, g) + '" fill="' + (o.tt ? '#e6f4d8' : '#9fd67f') + '" stroke="' + (o.tt ? '#e6f4d8' : '#9fd67f') + '" stroke-width="1.5"/>';
    });
    s += luoi(bx, by, w, h, g, o.tt ? 'rgba(79,143,54,.35)' : 'rgba(47,110,34,.35)');
    const khe = kheXep(ct.m);
    if (o.tt || o.giai) {
      khe.forEach(function (t, i) {
        s += '<g class="rh-khe"' + (o.tt ? ' data-khe="' + i + '"' : '') + '><polygon class="rh-mat" points="' + diemPoly(t, bx, by, g) + '" fill="' + (o.giai ? '#ffb347' : '#ffffff') + '" fill-opacity="' + (o.giai ? 1 : 0.001) +
          '" stroke="' + (o.giai ? '#c46a00' : 'rgba(79,143,54,.55)') + '" stroke-width="' + (o.giai ? 3 : 2) + '" stroke-dasharray="' + (o.giai ? '' : '6 6') + '" stroke-linejoin="round"/>';
        if (o.giai) {
          const c = [(t[0][0] + t[1][0] + t[2][0]) / 3, (t[0][1] + t[1][1] + t[2][1]) / 3];
          s += chu(bx + c[0] * g, by + c[1] * g + 8, String(i + 1), 22, '#7a3d00');
        }
        s += '</g>';
      });
    }
    // viền hình B: cạnh chỉ thuộc một ô là cạnh ngoài
    const dem = {};
    cells.forEach(function (c) {
      const poly = c[2] === 'F' ? [[c[0], c[1]], [c[0] + 1, c[1]], [c[0] + 1, c[1] + 1], [c[0], c[1] + 1]] : tamGiacO(c[0], c[1], c[2]);
      poly.forEach(function (a, i) {
        const b = poly[(i + 1) % poly.length];
        const k = [a.join(','), b.join(',')].sort().join(';');
        dem[k] = (dem[k] || 0) + 1;
      });
    });
    s += '<g stroke="#2f6e22" stroke-width="5" stroke-linecap="round">' + Object.keys(dem).filter(function (k) { return dem[k] === 1; }).map(function (k) {
      const ab = k.split(';').map(function (t) { return t.split(',').map(Number); });
      return '<line x1="' + r1(bx + ab[0][0] * g) + '" y1="' + r1(by + ab[0][1] * g) + '" x2="' + r1(bx + ab[1][0] * g) + '" y2="' + r1(by + ab[1][1] * g) + '"/>';
    }).join('') + '</g>';
    return s + (o.tt ? '<g class="rh-lop"></g>' : '') + '</svg>';
  }
  /** Tọa độ vẽ hình B (để game đặt hình A vào khe). */
  function boCucXep(m) {
    const cells = MAU_XEP[m];
    const w = Math.max.apply(null, cells.map(function (c) { return c[0]; })) + 1;
    const h = Math.max.apply(null, cells.map(function (c) { return c[1]; })) + 1;
    const g = Math.min(96, 330 / w, 280 / h);
    return { g: g, bx: r1(430 - w * g / 2), by: r1(222 - h * g / 2), khe: kheXep(m) };
  }

  function veCat(ct, o) {
    const m = MAU_CAT[ct.m];
    const g = Math.min(64, 420 / m.w, 300 / m.h);
    const ox = r1(320 - m.w * g / 2), oy = r1(214 - m.h * g / 2);
    let s = moSvg('Tờ giấy có nét cắt', o.lop) + (o.nen === false ? '' : nenSvg());
    if (o.giai) {
      const tam = [m.w / 2, m.h / 2];
      m.manh.forEach(function (p, i) {
        const c = [p.reduce(function (a, q) { return a + q[0]; }, 0) / p.length, p.reduce(function (a, q) { return a + q[1]; }, 0) / p.length];
        const dx = (c[0] - tam[0]) * 0.28 * g, dy = (c[1] - tam[1]) * 0.28 * g;
        s += '<polygon points="' + diemPoly(p, ox + dx, oy + dy, g) + '" fill="' + MAU_HINH[i % MAU_HINH.length][0] + '" stroke="' + MAU_HINH[i % MAU_HINH.length][1] + '" stroke-width="4" stroke-linejoin="round"/>';
        s += chu(ox + dx + c[0] * g, oy + dy + c[1] * g + 9, String(i + 1), 26, MUC);
      });
      return s + '</svg>';
    }
    s += '<g class="rh-giay">';
    m.manh.forEach(function (p, i) {
      s += '<polygon class="rh-manh-cat" data-manh="' + i + '" points="' + diemPoly(p, ox, oy, g) + '" fill="#fffdf4" stroke="#fffdf4" stroke-width="1"/>';
    });
    s += '<rect x="' + ox + '" y="' + oy + '" width="' + r1(m.w * g) + '" height="' + r1(m.h * g) + '" fill="none" stroke="#c9b27a" stroke-width="4" rx="3"/></g>';
    m.net.forEach(function (n, i) {
      const d = 'M' + r1(ox + n[0] * g) + ' ' + r1(oy + n[1] * g) + ' L' + r1(ox + n[2] * g) + ' ' + r1(oy + n[3] * g);
      s += '<g class="rh-net-cat"' + (o.tt ? ' data-net="' + i + '"' : '') + '>' + (o.tt ? '<path class="rh-hit" d="' + d + '" stroke="#fff" stroke-opacity="0" stroke-width="44" stroke-linecap="round"/>' : '') +
        '<path class="rh-net" d="' + d + '" stroke="#e5484d" stroke-width="5" stroke-dasharray="14 10" stroke-linecap="round"/></g>';
    });
    // cái kéo nhỏ ở góc
    s += '<g transform="translate(' + r1(ox + m.w * g + 18) + ',' + r1(oy - 30) + ') rotate(35)" fill="none" stroke="#6a4bc4" stroke-width="5" stroke-linecap="round"><circle cx="-10" cy="22" r="9"/><circle cx="10" cy="22" r="9"/><path d="M-4 14 L10 -22 M4 14 L-10 -22"/></g>';
    return s + (o.tt ? '<g class="rh-lop"></g>' : '') + '</svg>';
  }
  function boCucCat(m) {
    const t = MAU_CAT[m];
    const g = Math.min(64, 420 / t.w, 300 / t.h);
    return { g: g, ox: r1(320 - t.w * g / 2), oy: r1(214 - t.h * g / 2), mau: t };
  }

  function loiGiaiGhep(ct) {
    const d = tinhGhep(ct);
    if (ct.kieu === 'hai_manh') {
      const ds = dungGhep(ct);
      return { ma: 'ghep-hai-manh', buoc: ['Đặt mảnh ' + ds[0] + ' và mảnh ' + ds[1] + ' vào hình mẫu (có thể xoay mảnh).', 'Hai mảnh lấp kín hình mẫu, không thừa, không thiếu.', 'Mảnh còn lại không vừa khuôn.'], html: veGhep(ct, { giai: true, lop: 'rh-svg-giai' }), kq: d };
    }
    if (ct.kieu === 'dem_manh') {
      const o = MAU_XEP[ct.m];
      const day = o.filter(function (x) { return x[2] === 'F'; }).length, nua = o.length - day;
      const buoc = [];
      if (day) buoc.push('Hình B có ' + day + ' ô vuông đầy, mỗi ô cần 2 hình A: ' + day * 2 + ' hình A.');
      if (nua) buoc.push('Hình B có ' + nua + ' nửa ô, mỗi nửa ô cần 1 hình A: ' + nua + ' hình A.');
      buoc.push('Cần tất cả ' + d + ' hình A.');
      return { ma: 'xep-hinh-a', buoc: buoc, html: veXep(ct, { giai: true, lop: 'rh-svg-giai' }), kq: d };
    }
    const r = MAU_CAT[ct.m].ra;
    return { ma: 'gap-cat-hinh', buoc: ['Cắt theo ' + MAU_CAT[ct.m].net.length + ' nét đứt, tờ giấy rời thành ' + r.n + ' mảnh.', 'Mỗi mảnh là một ' + TEN_HINH_CAT[r.h] + '.'], html: veCat(ct, { giai: true, lop: 'rh-svg-giai' }), kq: d };
  }
  function ketLuanGhep(ct) {
    const d = tinhGhep(ct);
    if (ct.kieu === 'hai_manh') return 'Vậy mảnh ' + d.split(',').join(' và mảnh ') + ' ghép được hình mẫu.';
    if (ct.kieu === 'dem_manh') return 'Vậy cần ' + d + ' hình A để xếp thành hình B.';
    return 'Vậy cắt được ' + hienGhep(d, ct) + '.';
  }
  function taoNhieuGhep(kyNang, ct, rng) {
    const d = tinhGhep(ct);
    if (ct.kieu === 'hai_manh') return chonNhieu(rng, ct, [{ v: '1,2' }, { v: '1,3' }, { v: '2,3' }], nhanBietLoiGhep);
    if (ct.kieu === 'dem_manh') {
      const o = MAU_XEP[ct.m];
      const dienTich = o.reduce(function (a, x) { return a + (x[2] === 'F' ? 1 : 0.5); }, 0);
      const ung = [{ v: o.length, w: 3 }, { v: d + 1, w: 1 }, { v: d - 1, w: 1 }];
      if (Number.isInteger(dienTich)) ung.push({ v: dienTich, w: 3 });
      return chonNhieu(rng, ct, ung.filter(function (x) { return x.v >= 1; }), nhanBietLoiGhep);
    }
    const t = MAU_CAT[ct.m];
    const ung = [];
    if (t.net.length !== t.ra.n) ung.push({ v: t.net.length + ':' + t.ra.h, w: 3 });
    HINH_KHAC[t.ra.h].forEach(function (h, i) { ung.push({ v: t.ra.n + ':' + h, w: i ? 1 : 3 }); });
    ung.push({ v: (t.ra.n + 1) + ':' + t.ra.h, w: 1 });
    return chonNhieu(rng, ct, ung, nhanBietLoiGhep);
  }

  /* ================================================================
     6. Loại 'khoi' (khoi-tru-cau, B2.4, Bài 46, 47)
     ================================================================ */

  function gNgang(id, a, b, c) { return '<linearGradient id="' + id + '" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="' + a + '"/><stop offset=".38" stop-color="' + b + '"/><stop offset="1" stop-color="' + c + '"/></linearGradient>'; }
  function gDoc(id, a, b) { return '<linearGradient id="' + id + '" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></linearGradient>'; }
  function gCau(id, a, b, c) { return '<radialGradient id="' + id + '" cx=".36" cy=".32" r=".78"><stop offset="0" stop-color="' + a + '"/><stop offset=".55" stop-color="' + b + '"/><stop offset="1" stop-color="' + c + '"/></radialGradient>'; }
  const BONG_DAT = '<ellipse cx="50" cy="93" rx="31" ry="5" fill="#1d3b12" opacity=".16"/>';
  function truDung(id, x1, x2, yT, yD, ry, nap) {
    const rx = (x2 - x1) / 2, cx = (x1 + x2) / 2;
    return '<path d="M' + x1 + ' ' + yT + ' V' + yD + ' A' + rx + ' ' + ry + ' 0 0 0 ' + x2 + ' ' + yD + ' V' + yT + ' Z" fill="url(#' + id + ')"/>' +
      (nap ? '<ellipse cx="' + cx + '" cy="' + yT + '" rx="' + rx + '" ry="' + ry + '" fill="' + nap + '"/>' : '');
  }
  function truNam(id, x1, x2, cy, ry, rxDau, mauDau) {
    return '<path d="M' + x1 + ' ' + (cy - ry) + ' H' + x2 + ' V' + (cy + ry) + ' H' + x1 + ' A' + rxDau + ' ' + ry + ' 0 0 1 ' + x1 + ' ' + (cy - ry) + ' Z" fill="url(#' + id + ')"/>' +
      '<ellipse cx="' + x2 + '" cy="' + cy + '" rx="' + rxDau + '" ry="' + ry + '" fill="' + mauDau + '"/>';
  }
  function sang(cx, cy, rx, ry, op) { return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="#fff" opacity="' + (op || 0.55) + '"/>'; }
  function hop3d(x, y, w, h, dd, mT, mB, mTr) {
    const dx = dd * 0.8, dy = -dd * 0.5;
    const pt = function (a) { return a.map(function (p) { return r1(p[0]) + ',' + r1(p[1]); }).join(' '); };
    return '<g stroke-linejoin="round" stroke-width="2">' +
      '<polygon points="' + pt([[x, y], [x + dx, y + dy], [x + w + dx, y + dy], [x + w, y]]) + '" fill="' + mTr + '" stroke="' + mB + '"/>' +
      '<polygon points="' + pt([[x + w, y], [x + w + dx, y + dy], [x + w + dx, y + h + dy], [x + w, y + h]]) + '" fill="' + mB + '" stroke="' + mB + '"/>' +
      '<polygon points="' + pt([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]) + '" fill="' + mT + '" stroke="' + mB + '"/></g>';
  }
  function oVuong(goc, u, v, mau, k) {
    let s = '';
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      const a = function (s1, t1) { return [goc[0] + u[0] * s1 + v[0] * t1, goc[1] + u[1] * s1 + v[1] * t1]; };
      const p = [a((i + 0.1) / 3, (j + 0.1) / 3), a((i + 0.9) / 3, (j + 0.1) / 3), a((i + 0.9) / 3, (j + 0.9) / 3), a((i + 0.1) / 3, (j + 0.9) / 3)];
      s += '<polygon points="' + p.map(function (q) { return r1(q[0]) + ',' + r1(q[1]); }).join(' ') + '" fill="' + mau[(i + j * 2 + k) % mau.length] + '"/>';
    }
    return s;
  }

  /** Đồ vật (vẽ trong ô 100 × 100, kiểu đất sét 3D). k: 'tru' | 'cau' | 'khac'. */
  const VAT = {
    lon_sua: { ten: 'lon sữa', k: 'tru', ve: function (id) {
      return '<defs>' + gNgang(id + 'a', '#8e9bb0', '#f7f9fc', '#76839a') + gNgang(id + 'b', '#1c64c8', '#62adff', '#1753a6') + '</defs>' + BONG_DAT +
        truDung(id + 'a', 28, 72, 20, 84, 7, '#e3e9f1') + '<path d="M28 38 A22 7 0 0 0 72 38 V64 A22 7 0 0 1 28 64 Z" fill="url(#' + id + 'b)"/>' +
        '<text x="50" y="58" text-anchor="middle" font-size="15" fill="#fff">Sữa</text><ellipse cx="50" cy="20" rx="16" ry="4.2" fill="none" stroke="#9aa6b8" stroke-width="2"/>' +
        '<rect x="33" y="24" width="5" height="54" rx="2.5" fill="#fff" opacity=".45"/>';
    } },
    hop_but: { ten: 'hộp bút', k: 'tru', ve: function (id) {
      const but = function (x, y, mau) { return '<rect x="' + x + '" y="' + y + '" width="8" height="34" rx="2" fill="' + mau + '"/><path d="M' + x + ' ' + y + ' L' + (x + 4) + ' ' + (y - 10) + ' L' + (x + 8) + ' ' + y + ' Z" fill="#f3d2a2"/><path d="M' + (x + 2.6) + ' ' + (y - 5.5) + ' L' + (x + 4) + ' ' + (y - 10) + ' L' + (x + 5.4) + ' ' + (y - 5.5) + ' Z" fill="#3b2f63"/>'; };
      return '<defs>' + gNgang(id + 'a', '#d18a00', '#ffd966', '#c07800') + '</defs>' + BONG_DAT + '<ellipse cx="50" cy="34" rx="24" ry="8" fill="#7a4b00"/>' +
        but(34, 12, '#ef476f') + but(46, 6, '#06d6a0') + but(57, 14, '#118ab2') +
        '<path d="M26 34 V84 A24 8 0 0 0 74 84 V34 A24 8 0 0 1 26 34 Z" fill="url(#' + id + 'a)"/><path d="M26 34 A24 8 0 0 0 74 34" fill="none" stroke="#ffe9a8" stroke-width="2.5"/>' +
        '<rect x="32" y="42" width="5" height="36" rx="2.5" fill="#fff" opacity=".45"/>';
    } },
    khuc_go: { ten: 'khúc gỗ', k: 'tru', ve: function (id) {
      return '<defs>' + gDoc(id + 'a', '#c08a55', '#7a4c25') + '</defs>' + BONG_DAT + truNam(id + 'a', 16, 76, 60, 21, 10, '#f3c98f') +
        '<ellipse cx="76" cy="60" rx="6.5" ry="13.5" fill="none" stroke="#c99357" stroke-width="2.2"/><ellipse cx="76" cy="60" rx="2.8" ry="6" fill="none" stroke="#c99357" stroke-width="2"/>' +
        '<path d="M22 50 H60 M26 62 H66 M20 72 H52" stroke="#5e3a1b" stroke-width="2.4" stroke-linecap="round" opacity=".45"/><rect x="18" y="43" width="52" height="5" rx="2.5" fill="#fff" opacity=".25"/>';
    } },
    ong_tre: { ten: 'ống tre', k: 'tru', ve: function (id) {
      return '<defs>' + gNgang(id + 'a', '#2f8a3a', '#9ce07f', '#257030') + '</defs>' + BONG_DAT + truDung(id + 'a', 35, 65, 18, 86, 6, '#d6f0ae') +
        '<ellipse cx="50" cy="18" rx="10" ry="3.2" fill="#5d8f2b"/><path d="M35 46 A15 6 0 0 0 65 46 M35 68 A15 6 0 0 0 65 68" fill="none" stroke="#1f6a2a" stroke-width="3"/>' +
        '<path d="M62 22 C74 8 86 10 90 4 C86 18 76 22 62 24 Z" fill="#6cc04a"/><rect x="39" y="24" width="4.5" height="56" rx="2.2" fill="#fff" opacity=".4"/>';
    } },
    trong: { ten: 'cái trống', k: 'tru', ve: function (id) {
      return '<defs>' + gNgang(id + 'a', '#b3202b', '#ff6b6b', '#9c1a24') + '</defs>' + BONG_DAT + truDung(id + 'a', 16, 84, 38, 80, 12, '#fff3dc') +
        '<ellipse cx="50" cy="38" rx="34" ry="12" fill="none" stroke="#e8b04a" stroke-width="4"/><path d="M16 80 A34 12 0 0 0 84 80" fill="none" stroke="#e8b04a" stroke-width="4"/>' +
        '<path d="M20 52 L32 74 L44 55 L56 76 L68 55 L80 73" fill="none" stroke="#fff" stroke-width="2.6" stroke-linejoin="round"/><rect x="22" y="48" width="5" height="26" rx="2.5" fill="#fff" opacity=".35"/>';
    } },
    pin: { ten: 'cục pin', k: 'tru', ve: function (id) {
      return '<defs>' + gDoc(id + 'a', '#4a4e69', '#1f2133') + gDoc(id + 'b', '#ffcf5c', '#c98a00') + '</defs>' + BONG_DAT + truNam(id + 'a', 16, 70, 60, 16, 7, '#2b2d42') +
        '<path d="M56 44 H70 V76 H56 Z" fill="url(#' + id + 'b)"/><ellipse cx="70" cy="60" rx="7" ry="16" fill="#e0a526"/><rect x="74" y="53" width="8" height="14" rx="3" fill="#c9c9d6"/>' +
        '<text x="40" y="66" text-anchor="middle" font-size="16" fill="#ffcf5c">+</text><rect x="20" y="47" width="36" height="4" rx="2" fill="#fff" opacity=".3"/>';
    } },
    bong_da: { ten: 'quả bóng đá', k: 'cau', ve: function (id) {
      const ngu = function (cx, cy, r) { let p = ''; for (let i = 0; i < 5; i++) { const g = -Math.PI / 2 + i * 2 * Math.PI / 5; p += r1(cx + r * Math.cos(g)) + ',' + r1(cy + r * Math.sin(g)) + ' '; } return p; };
      return '<defs>' + gCau(id + 'a', '#ffffff', '#eef0f5', '#aeb6c4') + '<clipPath id="' + id + 'c"><circle cx="50" cy="52" r="36"/></clipPath></defs>' + BONG_DAT +
        '<circle cx="50" cy="52" r="36" fill="url(#' + id + 'a)"/><g clip-path="url(#' + id + 'c)" fill="#2b2d42"><polygon points="' + ngu(50, 52, 11) + '"/>' +
        '<polygon points="' + ngu(50, 16, 10) + '"/><polygon points="' + ngu(84, 42, 10) + '"/><polygon points="' + ngu(72, 84, 10) + '"/><polygon points="' + ngu(28, 84, 10) + '"/><polygon points="' + ngu(16, 42, 10) + '"/></g>' +
        '<g stroke="#2b2d42" stroke-width="2"><path d="M50 41 V26 M60.5 48.6 L75 43 M56.5 61 L66 74 M43.5 61 L34 74 M39.5 48.6 L25 43"/></g>' + sang(38, 36, 9, 6);
    } },
    dia_cau: { ten: 'quả địa cầu', k: 'cau', ve: function (id) {
      return '<defs>' + gCau(id + 'a', '#9fdcff', '#2f8de0', '#1a5aa0') + '</defs>' + BONG_DAT + '<circle cx="50" cy="52" r="36" fill="url(#' + id + 'a)"/>' +
        '<path d="M30 34 C38 26 50 30 48 40 C46 48 36 46 34 54 C32 60 24 54 24 46 Z M58 56 C64 50 76 52 78 60 C78 70 68 78 60 74 C54 70 54 62 58 56 Z M56 24 C62 20 70 24 70 30 C64 32 58 30 56 24 Z" fill="#5bc26f"/>' +
        '<ellipse cx="50" cy="52" rx="16" ry="36" fill="none" stroke="#fff" stroke-width="1.6" opacity=".4"/><path d="M14 52 H86" stroke="#fff" stroke-width="1.6" opacity=".4"/>' + sang(37, 35, 9, 6, 0.5);
    } },
    qua_cam: { ten: 'quả cam', k: 'cau', ve: function (id) {
      return '<defs>' + gCau(id + 'a', '#ffd79a', '#ff9a1f', '#d4600a') + '</defs>' + BONG_DAT + '<circle cx="50" cy="54" r="35" fill="url(#' + id + 'a)"/>' +
        '<g fill="#b8520a" opacity=".22"><circle cx="40" cy="62" r="1.6"/><circle cx="58" cy="44" r="1.6"/><circle cx="64" cy="66" r="1.6"/><circle cx="48" cy="74" r="1.6"/><circle cx="70" cy="54" r="1.6"/></g>' +
        '<path d="M50 20 V13" stroke="#6b3e12" stroke-width="3" stroke-linecap="round"/><path d="M51 16 C58 6 70 8 72 10 C66 18 58 20 51 16 Z" fill="#4caf50"/>' + sang(38, 38, 8, 5.5);
    } },
    bong_tennis: { ten: 'quả bóng tennis', k: 'cau', ve: function (id) {
      return '<defs>' + gCau(id + 'a', '#f6ffb0', '#d6ee38', '#98b21a') + '<clipPath id="' + id + 'c"><circle cx="50" cy="54" r="32"/></clipPath></defs>' + BONG_DAT +
        '<circle cx="50" cy="54" r="32" fill="url(#' + id + 'a)"/><g clip-path="url(#' + id + 'c)" fill="none" stroke="#fff" stroke-width="4"><path d="M16 36 C40 44 40 64 16 76"/><path d="M84 32 C60 42 60 66 84 76"/></g>' + sang(40, 40, 7, 5);
    } },
    vien_bi: { ten: 'viên bi', k: 'cau', ve: function (id) {
      return '<defs>' + gCau(id + 'a', '#e6f7ff', '#4fb3f0', '#16609f') + '</defs>' + BONG_DAT + '<circle cx="50" cy="56" r="30" fill="url(#' + id + 'a)"/>' +
        '<path d="M34 64 C42 50 56 70 66 50" fill="none" stroke="#ff8a3d" stroke-width="5" stroke-linecap="round" opacity=".85"/>' + sang(40, 44, 9, 6, 0.75);
    } },
    bong_chuyen: { ten: 'quả bóng chuyền', k: 'cau', ve: function (id) {
      return '<defs>' + gCau(id + 'a', '#fff6c2', '#ffd23f', '#d19b00') + '<clipPath id="' + id + 'c"><circle cx="50" cy="52" r="36"/></clipPath></defs>' + BONG_DAT +
        '<circle cx="50" cy="52" r="36" fill="url(#' + id + 'a)"/><g clip-path="url(#' + id + 'c)"><path d="M14 40 C34 30 56 34 70 52 C58 40 36 38 16 50 Z M46 16 C60 30 62 54 52 88 C70 64 68 36 54 16 Z" fill="#2f6fd6"/>' +
        '<path d="M20 70 C40 60 64 66 82 82" fill="none" stroke="#2f6fd6" stroke-width="7"/></g><circle cx="50" cy="52" r="36" fill="none" stroke="#c28f00" stroke-width="1.5"/>' + sang(38, 34, 8, 5);
    } },
    non: { ten: 'mũ sinh nhật', k: 'khac', ve: function (id) {
      return '<defs>' + gNgang(id + 'a', '#e0508f', '#ffb3d6', '#c73a78') + '<clipPath id="' + id + 'c"><path d="M22 82 L50 14 L78 82 A28 8 0 0 1 22 82 Z"/></clipPath></defs>' + BONG_DAT +
        '<path d="M22 82 L50 14 L78 82 A28 8 0 0 1 22 82 Z" fill="url(#' + id + 'a)"/><g clip-path="url(#' + id + 'c)" fill="#ffe066"><circle cx="44" cy="46" r="4"/><circle cx="58" cy="60" r="4"/><circle cx="40" cy="70" r="4"/><circle cx="62" cy="80" r="3.5"/><circle cx="52" cy="32" r="3"/></g>' +
        '<circle cx="50" cy="13" r="7" fill="#ffd166" stroke="#e0a800" stroke-width="2"/>';
    } },
    trung: { ten: 'quả trứng', k: 'khac', ve: function (id) {
      return '<defs>' + gCau(id + 'a', '#ffffff', '#fbe7d3', '#d9b08c') + '</defs>' + BONG_DAT + '<path d="M50 16 C70 16 80 48 80 62 C80 80 66 90 50 90 C34 90 20 80 20 62 C20 48 30 16 50 16 Z" fill="url(#' + id + 'a)"/>' + sang(40, 36, 6, 9, 0.7);
    } },
    hop_qua: { ten: 'hộp quà', k: 'khac', ve: function () {
      return BONG_DAT + hop3d(20, 44, 44, 42, 28, '#3fbf6f', '#23874a', '#86e2a6') +
        '<path d="M40 44 V86" stroke="#ff5d8f" stroke-width="7"/><path d="M40 44 L62 33 M64 60 L86 49" stroke="#ff5d8f" stroke-width="6" stroke-linecap="round"/>' +
        '<path d="M52 38 C40 22 28 30 42 38 Z M52 38 C62 22 76 28 62 38 Z" fill="#ff5d8f" stroke="#d83b6f" stroke-width="2" stroke-linejoin="round"/>';
    } },
    rubik: { ten: 'khối rubik', k: 'khac', ve: function () {
      const dx = 24, dy = -15;
      return BONG_DAT + hop3d(20, 42, 44, 44, 30, '#222', '#111', '#333') +
        oVuong([20, 42], [44, 0], [0, 44], ['#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#ff8a3d'], 0) +
        oVuong([20, 42], [44, 0], [dx, dy], ['#ffffff', '#ffd166', '#ef476f'], 1) +
        oVuong([64, 42], [dx, dy], [0, 44], ['#118ab2', '#06d6a0', '#ff8a3d'], 2);
    } },
    sach: { ten: 'quyển sách', k: 'khac', ve: function () {
      return BONG_DAT + hop3d(18, 56, 52, 26, 30, '#3d7be0', '#1f4f9e', '#fffaf0') +
        '<path d="M42 48 L62 36 M36 51 L58 38 M48 44 L66 34" stroke="#d8cfb8" stroke-width="1.6"/><rect x="24" y="62" width="40" height="8" rx="3" fill="#ffd166"/>';
    } }
  };
  const VAT_TRU = ['lon_sua', 'hop_but', 'khuc_go', 'ong_tre', 'trong', 'pin'];
  const VAT_CAU = ['bong_da', 'dia_cau', 'qua_cam', 'bong_tennis', 'vien_bi', 'bong_chuyen'];
  const VAT_KHAC = ['non', 'trung', 'hop_qua', 'rubik', 'sach'];
  const TEN_KHOI = { tru: 'khối trụ', cau: 'khối cầu', khac: 'khối khác' };
  /** Vật "trông giống" khối kia: bé dễ đếm nhầm (quả trứng tròn như khối cầu). */
  const GIONG = { cau: ['trung'], tru: ['non'] };

  /** Vẽ một đồ vật tại tâm (cx, cy) với cạnh s. */
  function veVat(ma, cx, cy, s) {
    const v = VAT[ma];
    if (!v) return '';
    return '<g transform="translate(' + r1(cx - s / 2) + ',' + r1(cy - s / 2) + ') scale(' + r1(s / 100 * 1000) / 1000 + ')">' + v.ve(idMoi()) + '</g>';
  }
  /** Biểu tượng nhỏ khối trụ, khối cầu, khối khác (trên nhãn rổ). */
  function bieuTuongKhoi(k, cx, cy, s) {
    const id = idMoi();
    let v;
    if (k === 'tru') v = '<defs>' + gNgang(id, '#e0a800', '#ffe38a', '#c68f00') + '</defs>' + truDung(id, 25, 75, 22, 80, 10, '#fff0b3');
    else if (k === 'cau') v = '<defs>' + gCau(id, '#ffe0ea', '#ff5d8f', '#c9335f') + '</defs><circle cx="50" cy="52" r="36" fill="url(#' + id + ')"/>' + sang(38, 38, 8, 5);
    else v = hop3d(18, 42, 44, 40, 30, '#8fd694', '#4fa65a', '#c7efc9');
    return '<g transform="translate(' + r1(cx - s / 2) + ',' + r1(cy - s / 2) + ') scale(' + r1(s / 100 * 1000) / 1000 + ')">' + v + '</g>';
  }
  /** Rổ đan có nhãn (bàn chơi): data-ro là mã khối. */
  function veRo(k, cx, y, w, tt) {
    const h = 104;
    let s = '<g class="rh-ro"' + (tt ? ' data-ro="' + k + '"' : '') + '>';
    s += '<ellipse cx="' + cx + '" cy="' + (y + 6) + '" rx="' + (w / 2) + '" ry="16" fill="#7a4a1c"/>';
    s += '<path d="M' + (cx - w / 2) + ' ' + (y + 6) + ' L' + (cx - w / 2 + 16) + ' ' + (y + h) + ' Q' + cx + ' ' + (y + h + 14) + ' ' + (cx + w / 2 - 16) + ' ' + (y + h) + ' L' + (cx + w / 2) + ' ' + (y + 6) + ' Q' + cx + ' ' + (y + 26) + ' ' + (cx - w / 2) + ' ' + (y + 6) + ' Z" fill="#c98b4a" stroke="#8a5423" stroke-width="3" stroke-linejoin="round"/>';
    for (let i = 1; i < 4; i++) s += '<path d="M' + (cx - w / 2 + 4 + i * 4) + ' ' + (y + 6 + i * 24) + ' Q' + cx + ' ' + (y + 24 + i * 24) + ' ' + (cx + w / 2 - 4 - i * 4) + ' ' + (y + 6 + i * 24) + '" fill="none" stroke="#a86b32" stroke-width="3"/>';
    s += '<ellipse cx="' + cx + '" cy="' + (y + 6) + '" rx="' + (w / 2) + '" ry="16" fill="none" stroke="#e8b27a" stroke-width="5"/>';
    s += '<rect x="' + (cx - w / 2 + 10) + '" y="' + (y + 44) + '" width="' + (w - 20) + '" height="40" rx="12" fill="#fff6e3" stroke="#b07a3e" stroke-width="2.5"/>';
    s += bieuTuongKhoi(k, cx - w / 2 + 34, y + 64, 34);
    s += '<text x="' + (cx + 14) + '" y="' + (y + 73) + '" text-anchor="middle" font-size="24" fill="#5a3410">' + esc(k === 'khac' ? 'Khối khác' : 'Khối ' + (k === 'tru' ? 'trụ' : 'cầu')) + '</text>';
    if (tt) s += '<rect class="rh-hit" x="' + (cx - w / 2 - 6) + '" y="' + (y - 30) + '" width="' + (w + 12) + '" height="' + (h + 46) + '" rx="20" fill="#fff" fill-opacity="0"/>';
    return s + '</g>';
  }

  function sinhKhoi(rng, muc) {
    const kieu = chonCach(rng, muc, ['phan_loai', 'phan_loai', 'tim_vat', 'tim_vat', 'dem'], ['phan_loai', 'tim_vat', 'dem']);
    if (kieu === 'phan_loai') {
      const k = NH.chonTheoTrongSo(rng, [{ k: 'tru', w: 2 }, { k: 'cau', w: 2 }, { k: 'khac', w: 1.2 }]).k;
      return { loai: 'khoi', kieu: kieu, v: chon(rng, k === 'tru' ? VAT_TRU : k === 'cau' ? VAT_CAU : VAT_KHAC) };
    }
    const hoi = rng() < 0.5 ? 'tru' : 'cau';
    if (kieu === 'tim_vat') {
      const n = nn(rng, 3, 4);
      const dung = chon(rng, hoi === 'tru' ? VAT_TRU : VAT_CAU);
      const khac = tron(rng, (hoi === 'tru' ? VAT_CAU : VAT_TRU).slice()).slice(0, 1).concat(tron(rng, GIONG[hoi].concat(VAT_KHAC)).filter(function (x, i, a) { return a.indexOf(x) === i; }).slice(0, n - 2));
      return { loai: 'khoi', kieu: kieu, hoi: hoi, vat: tron(rng, [dung].concat(khac)) };
    }
    const n = nn(rng, 6, 8);
    const soHoi = nn(rng, 2, 4), soKia = nn(rng, 1, Math.min(3, n - soHoi - 1));
    const vat = [];
    for (let i = 0; i < soHoi; i++) vat.push(chon(rng, hoi === 'tru' ? VAT_TRU : VAT_CAU));
    for (let i = 0; i < soKia; i++) vat.push(chon(rng, hoi === 'tru' ? VAT_CAU : VAT_TRU));
    const giong = GIONG[hoi][0];
    if (rng() < 0.7) vat.push(giong);
    while (vat.length < n) vat.push(chon(rng, VAT_KHAC));
    return { loai: 'khoi', kieu: 'dem', hoi: hoi, vat: tron(rng, vat) };
  }

  function tinhKhoi(ct) {
    if (ct.kieu === 'phan_loai') return VAT[ct.v].k;
    if (ct.kieu === 'tim_vat') return ct.vat.find(function (v) { return VAT[v].k === ct.hoi; });
    return ct.vat.filter(function (v) { return VAT[v].k === ct.hoi; }).length;
  }
  function deKhoi(ct) {
    if (ct.kieu === 'phan_loai') { const t = VAT[ct.v].ten; return t.charAt(0).toUpperCase() + t.slice(1) + ' có dạng khối gì?'; }
    if (ct.kieu === 'tim_vat') return 'Vật nào có dạng ' + TEN_KHOI[ct.hoi] + '?';
    return 'Có bao nhiêu vật có dạng ' + TEN_KHOI[ct.hoi] + '?';
  }
  function maKhoi(ct) {
    if (ct.kieu === 'phan_loai') return 'khoi-loai:' + ct.v;
    return 'khoi-' + (ct.kieu === 'tim_vat' ? 'tim' : 'dem') + '-' + ct.hoi + ':' + ct.vat.join(',');
  }
  function chuVat(ct, v) { const i = ct.vat.indexOf(v); return i >= 0 ? String.fromCharCode(65 + i) : '?'; }
  function nhanBietLoiKhoi(ct, v) {
    if (ct.kieu === 'phan_loai') {
      if (['tru', 'cau', 'khac'].indexOf(v) < 0) return ['khac'];
      return v === VAT[ct.v].k ? [] : ['nham-khoi'];
    }
    if (ct.kieu === 'tim_vat') {
      if (ct.vat.indexOf(v) < 0) return ['khac'];
      return VAT[v].k === ct.hoi ? [] : ['nham-khoi'];
    }
    const n = soNguyen(v);
    if (n == null) return ['khac'];
    const d = tinhKhoi(ct);
    if (n === d) return [];
    const kia = ct.vat.filter(function (x) { return VAT[x].k === (ct.hoi === 'tru' ? 'cau' : 'tru'); }).length;
    const giong = ct.vat.filter(function (x) { return GIONG[ct.hoi].indexOf(x) >= 0; }).length;
    if ((giong && n === d + giong) || n === d + kia) return ['nham-khoi'];
    if (Math.abs(n - d) === 1) return ['dem-lech'];
    return ['khac'];
  }
  function hienKhoi(v, ct) {
    if (ct.kieu === 'phan_loai') return v === 'khac' ? 'không phải khối trụ, khối cầu' : TEN_KHOI[v] || String(v);
    if (ct.kieu === 'tim_vat') return VAT[v] ? chuVat(ct, v) + ' (' + VAT[v].ten + ')' : String(v);
    return String(v);
  }
  function loiNoiKhoi(ct, v, maLoi) {
    const m = (maLoi && maLoi[0]) || 'khac';
    const moTa = function (ma) {
      const t = VAT[ma].ten.charAt(0).toUpperCase() + VAT[ma].ten.slice(1);
      const k = VAT[ma].k;
      return k === 'tru' ? t + ' có dạng khối trụ: thân dài, hai đầu là hai mặt tròn' : k === 'cau' ? t + ' có dạng khối cầu: tròn đều về mọi phía' : t + ' không phải khối trụ, cũng không phải khối cầu';
    };
    if (ct.kieu === 'phan_loai') return moTa(ct.v);
    if (ct.kieu === 'tim_vat') return VAT[v] ? moTa(v) : 'Chọn một vật trong hình nhé';
    if (m === 'nham-khoi') return ct.hoi === 'cau' ? 'Chỉ đếm vật tròn đều như quả bóng: quả trứng, khối trụ không tính' : 'Chỉ đếm vật có hai mặt tròn ở hai đầu như lon sữa';
    if (m === 'dem-lech') return 'Con đếm lệch một chút rồi';
    return 'Mình cùng đếm lại nhé';
  }
  function goiYKhoi(ct) {
    const g1 = 'Khối trụ có thân dài, hai đầu là hai mặt tròn, như lon sữa.';
    const g2 = 'Khối cầu tròn đều về mọi phía, như quả bóng.';
    if (ct.kieu === 'phan_loai') return [g1, g2, 'Hình nón, quả trứng, cái hộp không phải khối trụ, khối cầu.'];
    if (ct.kieu === 'tim_vat') {
      const coTrung = ct.vat.indexOf('trung') >= 0;
      return ct.hoi === 'tru' ? [g1, 'Khối trụ đặt đứng thì đứng vững, đặt nằm thì lăn được.', 'Quả bóng, quả cam là khối cầu; cái hộp, hình nón không phải khối trụ.'] :
        [g2, coTrung ? 'Quả trứng hơi dài nên không phải khối cầu.' : 'Lon sữa, khúc gỗ là khối trụ; cái hộp không phải khối cầu.', 'Tìm vật tròn như quả bóng.'];
    }
    return [ct.hoi === 'tru' ? g1 : g2, 'Đếm lần lượt từng vật, đừng đếm một vật hai lần.', ct.hoi === 'cau' ? 'Quả trứng không phải khối cầu.' : 'Quả bóng không phải khối trụ.'];
  }

  function veKhoi(ct, o) {
    o = o || {};
    const d = tinhKhoi(ct);
    let s = moSvg('Đồ vật: ' + (ct.kieu === 'phan_loai' ? VAT[ct.v].ten : ct.vat.map(function (v) { return VAT[v].ten; }).join(', ')), o.lop) + (o.nen === false ? '' : nenSvg());
    if (ct.kieu === 'phan_loai') {
      const vien = o.giai ? '<ellipse cx="240" cy="200" rx="150" ry="150" fill="' + (d === 'khac' ? '#f1eff6' : '#dff6ea') + '"/>' : '';
      if (o.tt) {
        s += '<g class="rh-vat" data-keo="0" data-cx="320" data-cy="130"><g class="rh-dich"><rect class="rh-hit" x="220" y="30" width="200" height="200" rx="30" fill="#fff" fill-opacity="0"/>' + veVat(ct.v, 320, 130, 190) + '</g></g>';
        ['tru', 'cau', 'khac'].forEach(function (k, i) { s += veRo(k, 112 + i * 208, 292, 186, true); });
        return s + '<g class="rh-lop"></g></svg>';
      }
      if (!o.giai) return s + veVat(ct.v, 320, 172, 240) + chu(320, 400, VAT[ct.v].ten, 32, MUC) + '</svg>';
      s += vien + veVat(ct.v, 240, 190, 230) + chu(240, 395, VAT[ct.v].ten, 32, MUC);
      if (d === 'khac') {
        // không giống khối trụ, không giống khối cầu
        ['tru', 'cau'].forEach(function (k, i) {
          const y = 120 + i * 170;
          s += '<text x="430" y="' + (y + 22) + '" text-anchor="middle" font-size="56" fill="' + DO_NHAT + '">≠</text>' + bieuTuongKhoi(k, 540, y, 100) + chu(540, y + 74, TEN_KHOI[k], 24, '#8a84a3');
        });
      } else {
        s += '<text x="455" y="208" text-anchor="middle" font-size="60" fill="' + XANH + '">=</text>';
        s += bieuTuongKhoi(d, 555, 180, 120) + chu(555, 290, TEN_KHOI[d], 30, XANH);
      }
      return s + '</svg>';
    }
    if (ct.kieu === 'tim_vat') {
      const n = ct.vat.length;
      const buoc = 600 / n;
      ct.vat.forEach(function (v, i) {
        const cx = r1(20 + buoc * (i + 0.5));
        const la = o.giai && v === d;
        const cy = o.tt ? 118 : 178;
        const kich = o.tt ? Math.min(150, buoc - 14) : Math.min(180, buoc - 10);
        if (la) s += '<ellipse cx="' + cx + '" cy="' + (cy + 4) + '" rx="' + (kich / 2 + 6) + '" ry="' + (kich / 2 + 10) + '" fill="#dff6ea" stroke="' + XANH + '" stroke-width="4"/>';
        s += '<g class="rh-vat"' + (o.tt ? ' data-keo="' + i + '" data-hinh="' + (i + 1) + '"' : '') + ' data-cx="' + cx + '" data-cy="' + cy + '"><g class="rh-dich">';
        if (o.tt) s += '<rect class="rh-hit" x="' + (cx - kich / 2) + '" y="' + (cy - kich / 2 - 6) + '" width="' + kich + '" height="' + (kich + 40) + '" rx="24" fill="#fff" fill-opacity="0"/>';
        s += veVat(v, cx, cy, kich) + '</g>';
        s += soHieu(cx - kich / 2 + 14, cy - kich / 2 + 8, String.fromCharCode(65 + i), la ? XANH : MUC);
        if (!o.tt) s += chu(cx, cy + kich / 2 + 34, VAT[v].ten, n === 4 ? 21 : 24, la ? XANH : '#5b5575');
        s += '</g>';
      });
      if (o.tt) s += veRo(ct.hoi, 320, 290, 230, true) + '<g class="rh-lop"></g>';
      return s + '</svg>';
    }
    // đếm: hai hàng đồ vật, rổ khối trụ và rổ khối cầu
    const vt = viTriDem(ct.vat.length, !!o.tt);
    ct.vat.forEach(function (v, i) {
      const p = vt[i];
      const la = o.giai && VAT[v].k === ct.hoi;
      if (la) s += '<circle cx="' + p[0] + '" cy="' + (p[1] + 2) + '" r="' + (p[2] / 2 + 4) + '" fill="#dff6ea" stroke="' + XANH + '" stroke-width="4"/>';
      s += '<g class="rh-vat"' + (o.tt ? ' data-keo="' + i + '" data-hinh="' + (i + 1) + '"' : '') + ' data-cx="' + p[0] + '" data-cy="' + p[1] + '"><g class="rh-dich">';
      if (o.tt) s += '<rect class="rh-hit" x="' + (p[0] - p[2] / 2) + '" y="' + (p[1] - p[2] / 2) + '" width="' + p[2] + '" height="' + p[2] + '" rx="20" fill="#fff" fill-opacity="0"/>';
      s += veVat(v, p[0], p[1], p[2]) + '</g></g>';
      if (o.giai && la) {
        const k = ct.vat.slice(0, i + 1).filter(function (x) { return VAT[x].k === ct.hoi; }).length;
        s += soHieu(p[0] + p[2] / 2 - 10, p[1] - p[2] / 2 + 10, k, XANH);
      }
    });
    if (o.tt) s += veRo('tru', 190, 296, 210, true) + veRo('cau', 450, 296, 210, true) + '<g class="rh-lop"></g>';
    return s + '</svg>';
  }
  function viTriDem(n, coRo) {
    const hang1 = Math.ceil(n / 2), hang2 = n - hang1;
    const s = coRo ? 116 : 150;
    const y1 = coRo ? 80 : 120, y2 = coRo ? 206 : 310;
    const ra = [];
    for (let i = 0; i < hang1; i++) ra.push([r1(320 + (i - (hang1 - 1) / 2) * 140), y1, s]);
    for (let i = 0; i < hang2; i++) ra.push([r1(320 + (i - (hang2 - 1) / 2) * 140 + 30), y2, s]);
    return ra;
  }

  function loiGiaiKhoi(ct) {
    const d = tinhKhoi(ct);
    const html = veKhoi(ct, { giai: true, lop: 'rh-svg-giai' });
    if (ct.kieu === 'phan_loai') {
      const t = VAT[ct.v].ten;
      const buoc = d === 'tru' ? [t.charAt(0).toUpperCase() + t.slice(1) + ' có thân dài, hai đầu là hai mặt tròn.', 'Vậy ' + t + ' có dạng khối trụ.'] :
        d === 'cau' ? [t.charAt(0).toUpperCase() + t.slice(1) + ' tròn đều về mọi phía, lăn được theo mọi hướng.', 'Vậy ' + t + ' có dạng khối cầu.'] :
          [t.charAt(0).toUpperCase() + t.slice(1) + ' không có hai mặt tròn như khối trụ, cũng không tròn đều như khối cầu.', 'Vậy ' + t + ' không phải khối trụ, khối cầu.'];
      return { ma: 'nhan-dang-khoi', buoc: buoc, html: html, kq: d };
    }
    if (ct.kieu === 'tim_vat') return { ma: 'tim-vat-khoi', buoc: ct.vat.map(function (v, i) { return String.fromCharCode(65 + i) + ': ' + VAT[v].ten + ' có dạng ' + (VAT[v].k === 'khac' ? 'khối khác' : TEN_KHOI[VAT[v].k]) + '.'; }), html: html, kq: d };
    const ds = ct.vat.filter(function (v) { return VAT[v].k === ct.hoi; }).map(function (v) { return VAT[v].ten; });
    return { ma: 'dem-khoi', buoc: ['Các vật có dạng ' + TEN_KHOI[ct.hoi] + ': ' + ds.join(', ') + '.', 'Đếm được ' + d + ' vật.'], html: html, kq: d };
  }
  function ketLuanKhoi(ct) {
    const d = tinhKhoi(ct);
    if (ct.kieu === 'phan_loai') return 'Vậy ' + VAT[ct.v].ten + (d === 'khac' ? ' không phải khối trụ, khối cầu.' : ' có dạng ' + TEN_KHOI[d] + '.');
    if (ct.kieu === 'tim_vat') return 'Vậy ' + VAT[d].ten + ' (' + chuVat(ct, d) + ') có dạng ' + TEN_KHOI[ct.hoi] + '.';
    return 'Vậy có ' + d + ' vật có dạng ' + TEN_KHOI[ct.hoi] + '.';
  }
  function taoNhieuKhoi(kyNang, ct, rng) {
    const d = tinhKhoi(ct);
    if (ct.kieu === 'phan_loai') return chonNhieu(rng, ct, [{ v: 'tru' }, { v: 'cau' }, { v: 'khac' }], nhanBietLoiKhoi);
    if (ct.kieu === 'tim_vat') return chonNhieu(rng, ct, ct.vat.map(function (v) { return { v: v, w: GIONG[ct.hoi].indexOf(v) >= 0 ? 3 : VAT[v].k !== 'khac' ? 2 : 1 }; }), nhanBietLoiKhoi);
    const kia = ct.vat.filter(function (x) { return VAT[x].k === (ct.hoi === 'tru' ? 'cau' : 'tru'); }).length;
    const giong = ct.vat.filter(function (x) { return GIONG[ct.hoi].indexOf(x) >= 0; }).length;
    const ung = [{ v: d + kia, w: 3 }, { v: d + 1, w: 1 }, { v: d - 1, w: 1 }];
    if (giong) ung.push({ v: d + giong, w: 3 });
    return chonNhieu(rng, ct, ung.filter(function (x) { return x.v >= 1; }), nhanBietLoiKhoi);
  }

  /* ================================================================
     Đăng ký loại câu, lỗi, kỹ năng
     ================================================================ */

  const LOI_MOI = {
    'nham-doan-duong': { be: 'Đoạn thẳng dừng ở hai điểm, còn đường thẳng kéo dài về hai phía', mo_ta: 'Nhầm đoạn thẳng với đường thẳng (đoạn thẳng dừng ở hai điểm, đường thẳng đi qua hai điểm và kéo dài)', ngan: 'Con hay nhầm đoạn thẳng và đường thẳng' },
    'nham-thang-cong': { be: 'Đường cong uốn lượn, còn đường thẳng thẳng tắp', mo_ta: 'Nhầm đường thẳng (hoặc đoạn thẳng) với đường cong', ngan: 'Con hay nhầm đường thẳng và đường cong' },
    'nham-gap-khuc': { be: 'Đường gấp khúc gồm nhiều đoạn thẳng nối liền nhau', mo_ta: 'Nhầm đường gấp khúc với đoạn thẳng, đường thẳng hoặc đường cong', ngan: 'Con hay nhầm đường gấp khúc' },
    'nham-ten-doan': { be: 'Tên đoạn thẳng là tên hai điểm ở hai đầu của nó', mo_ta: 'Gọi tên (hoặc nối) đoạn thẳng bằng một điểm không nằm ở đầu đoạn thẳng cần tìm', ngan: 'Con hay gọi nhầm tên đoạn thẳng' },
    'dem-thieu-doan': { be: 'Con còn sót một đoạn thẳng', mo_ta: 'Đếm hoặc cộng thiếu đoạn thẳng: bỏ sót một đoạn của đường gấp khúc, đoạn nằm chồng lên đoạn khác hay đường chéo', ngan: 'Con hay sót đoạn thẳng' },
    'dem-diem': { be: 'Con đếm số điểm rồi, mình đếm số đoạn thẳng nhé', mo_ta: 'Đếm số điểm thay vì số đoạn thẳng (đường gấp khúc qua 4 điểm chỉ có 3 đoạn)', ngan: 'Con hay đếm điểm thay vì đếm đoạn' },
    'dem-so-doan': { be: 'Đề hỏi độ dài, con cộng độ dài các đoạn nhé', mo_ta: 'Trả lời số đoạn thẳng thay vì độ dài đường gấp khúc', ngan: 'Con hay nhầm độ dài với số đoạn' },
    'nham-thang-hang': { be: 'Ba điểm thẳng hàng phải cùng nằm trên một đường thẳng', mo_ta: 'Chọn ba điểm không cùng nằm trên một đường thẳng (thường có một điểm lệch khỏi đường một chút)', ngan: 'Con hay chọn nhầm ba điểm thẳng hàng' },
    'ten-sai-thu-tu': { be: 'Đọc tên đường gấp khúc lần lượt theo các điểm trên đường', mo_ta: 'Đọc tên đường gấp khúc không theo thứ tự các điểm dọc theo đường', ngan: 'Con hay đọc sai thứ tự các điểm' },
    'ten-thieu-diem': { be: 'Tên đường gấp khúc có đủ các điểm, không bỏ điểm nào', mo_ta: 'Đọc tên đường gấp khúc thiếu một điểm', ngan: 'Con hay bỏ sót điểm khi đọc tên' },
    'nham-tu-giac': { be: 'Hình tứ giác có đúng 4 cạnh', mo_ta: 'Tính nhầm hình tam giác, hình có 5 cạnh, hình tròn (hoặc hình ghép không phải tứ giác) là hình tứ giác', ngan: 'Con hay nhầm hình khác là tứ giác' },
    'sot-tu-giac': { be: 'Con còn sót hình tứ giác', mo_ta: 'Bỏ sót hình tứ giác: hình đặt nghiêng, tứ giác không đều hoặc tứ giác ghép từ nhiều mảnh', ngan: 'Con hay sót hình tứ giác' },
    'ghep-sai-kich-thuoc': { be: 'Hai mảnh này ghép lại to hơn hoặc nhỏ hơn hình mẫu', mo_ta: 'Chọn hai mảnh có tổng diện tích khác hình mẫu (ghép thừa hoặc thiếu)', ngan: 'Con hay chọn mảnh sai kích thước' },
    'ghep-sai-hinh': { be: 'Hai mảnh đủ lớn nhưng không khớp hình mẫu', mo_ta: 'Chọn hai mảnh đủ diện tích nhưng không ghép khít được hình mẫu', ngan: 'Con hay chọn mảnh không khớp hình' },
    'dem-o-vuong': { be: 'Con đếm ô vuông rồi, mình đếm số hình A nhé', mo_ta: 'Đếm số ô vuông (hoặc số phần nhìn thấy) thay vì số hình A cần dùng', ngan: 'Con hay đếm ô thay vì đếm mảnh' },
    'dem-net-cat': { be: 'Con đếm nét cắt rồi, mình đếm số mảnh giấy nhé', mo_ta: 'Trả lời số nét cắt thay vì số hình cắt được', ngan: 'Con hay đếm nét cắt thay vì đếm mảnh' },
    'nham-ten-hinh': { be: 'Xem kĩ mảnh giấy cắt ra là hình gì', mo_ta: 'Gọi sai tên hình cắt được (tam giác, vuông, chữ nhật)', ngan: 'Con hay gọi sai tên hình' },
    'nham-khoi': { be: 'Khối trụ có hai mặt tròn ở hai đầu, khối cầu tròn đều mọi phía', mo_ta: 'Nhầm khối trụ, khối cầu với nhau hoặc với khối khác (hình nón, quả trứng, khối hộp)', ngan: 'Con hay nhầm khối trụ, khối cầu' }
  };
  Object.keys(LOI_MOI).forEach(function (k) { NH.themLoi(k, LOI_MOI[k]); });

  /** Nhãn ngắn cho một lựa chọn (game cũ ghi lên quả, thiên thạch, robot). */
  function veLuaChonChung(ct, v) {
    const l = ct.loai;
    if (l === 'tu_giac' && ct.kieu === 'chon') return { nhan: dsSo(v).sort(function (a, b) { return a - b; }).join(', ') };
    if (l === 'tu_giac' && ct.kieu === 'khong_phai') return { nhan: 'Hình ' + v };
    if (l === 'ghep_hinh' && ct.kieu === 'hai_manh') return { nhan: dsSo(v).sort(function (a, b) { return a - b; }).join(' và ') };
    if (l === 'khoi' && ct.kieu === 'phan_loai') return { nhan: v === 'khac' ? 'Khối khác' : v === 'tru' ? 'Khối trụ' : 'Khối cầu' };
    if (l === 'khoi' && ct.kieu === 'tim_vat') {
      const s = moSvg(VAT[v] ? VAT[v].ten : '', 'rh-svg-lc', 120, 120) + (VAT[v] ? veVat(v, 60, 56, 104) : '') + soHieu(20, 20, chuVat(ct, v), MUC) + '</svg>';
      return { nhan: chuVat(ct, v) + ' ' + (VAT[v] ? VAT[v].ten : ''), hinh: s };
    }
    return { nhan: NH.hienGiaTriCau(ct, v) };
  }

  /* ---------------- Dạng câu ở Rừng Hình Khối (bàn chơi tương tác) ---------------- */

  /** Chế độ bàn chơi của một câu (game Rừng Hình Khối dùng). */
  function cheDo(ct) {
    const k = ct.loai + '.' + ct.kieu;
    return {
      'duong.tim_loai': 'chon1', 'duong.ten_doan': 'noi', 'duong.dem_doan': 'dem_doan',
      'thang_hang.tim_bo': 'chon_n', 'thang_hang.diem_thu_ba': 'chon1',
      'gap_khuc.do_dai': 'cong_doan', 'gap_khuc.so_doan': 'dem_doan', 'gap_khuc.ten': 'theo_thu_tu',
      'tu_giac.chon': 'chon_n', 'tu_giac.khong_phai': 'chon1', 'tu_giac.dem': 'danh_dau', 'tu_giac.dem_ghep': 'danh_dau',
      'ghep_hinh.hai_manh': 'ghep2', 'ghep_hinh.dem_manh': 'lap_manh', 'ghep_hinh.gap_cat': 'cat',
      'khoi.phan_loai': 'keo_ro', 'khoi.tim_vat': 'keo_ro', 'khoi.dem': 'keo_dem'
    }[k] || 'chon1';
  }
  /** Dạng câu ghi vào nhật ký khi chơi bằng bàn tương tác. */
  function dangTuongTac(ct) {
    const c = cheDo(ct);
    if (c === 'cong_doan') return 'nhap_so';
    if (c === 'keo_ro' || c === 'ghep2') return 'keo_tha';
    return 'thao_tac_hinh';
  }
  /** Chế độ cần bàn phím số (bé tự viết số). */
  function canBanPhim(ct) { const c = cheDo(ct); return c === 'cong_doan' || c === 'danh_dau' || c === 'lap_manh' || c === 'keo_dem'; }

  /** Đề và gợi ý khi chơi bằng bàn tương tác (thay cho đề chọn đáp án). */
  function deTuongTac(ct) {
    const k = ct.loai + '.' + ct.kieu;
    if (k === 'duong.tim_loai') return 'Chạm vào ' + TEN_LOAI[ct.hoi] + ' trong hình vẽ.';
    if (k === 'duong.ten_doan') return 'Nối hai điểm để được đoạn thẳng ' + tinhDuong(ct) + '.';
    if (k === 'duong.dem_doan') return (ct.hinh === 'thang_hang' ? 'Ba điểm ' + ct.ten.split('').join(', ') + ' thẳng hàng. ' : '') + 'Tìm hết các đoạn thẳng trong hình vẽ.';
    if (k === 'thang_hang.tim_bo') return 'Chạm vào ba điểm thẳng hàng.';
    if (k === 'thang_hang.diem_thu_ba') return 'Chạm vào điểm thẳng hàng với hai điểm ' + ct.ten[0] + ' và ' + ct.ten[1] + '.';
    if (k === 'gap_khuc.so_doan') return 'Đường gấp khúc ' + ct.ten + ' gồm mấy đoạn thẳng? Chạm vào từng đoạn để đếm.';
    if (k === 'gap_khuc.ten') return 'Chạm lần lượt các điểm để đọc tên đường gấp khúc.';
    if (k === 'tu_giac.chon') return 'Chạm vào tất cả các hình tứ giác.';
    if (k === 'tu_giac.khong_phai') return 'Chạm vào hình không phải là hình tứ giác.';
    if (k === 'ghep_hinh.hai_manh') return 'Kéo hai mảnh vào khuôn để ghép được hình mẫu.';
    if (k === 'khoi.phan_loai') return deKhoi(ct).replace('có dạng khối gì?', 'có dạng khối gì? Kéo vào đúng rổ.');
    if (k === 'khoi.tim_vat') return 'Kéo vật có dạng ' + TEN_KHOI[ct.hoi] + ' vào rổ.';
    return NH.deHien(ct);
  }
  function goiYTuongTac(ct) {
    const k = ct.loai + '.' + ct.kieu;
    if (k === 'duong.ten_doan') {
      const d = tinhDuong(ct);
      return ['Tên đoạn thẳng là tên hai điểm ở hai đầu của nó.', 'Tìm điểm ' + d[0] + ' và điểm ' + d[1] + ' trong hình.', 'Đặt ngón tay ở điểm ' + d[0] + ' rồi kéo tới điểm ' + d[1] + '.'];
    }
    if (k === 'thang_hang.tim_bo' || k === 'thang_hang.diem_thu_ba') {
      const g = NH.goiY(ct);
      return [g[0], 'Kéo từ điểm này tới điểm kia để căng một sợi dây, xem điểm thứ ba có nằm trên dây không.', g[2]];
    }
    return null;
  }

  /** Thêm vào câu đã dựng: đề và gợi ý của bàn tương tác, lựa chọn cho bàn cần chọn thẻ. */
  function moRong(q, ct, rng) {
    if (q.dang === 'chon_dap_an' || q.dang === 'doc_va_chon' || q.dang === 'ghep_doi' || q.dang === 'hai_buoc') return;
    q.de = deTuongTac(ct);
    q.de_doc = q.de;
    const g = goiYTuongTac(ct);
    if (g) q.goi_y = g;
    q.che_do = cheDo(ct);
    if (ct.loai === 'duong' && ct.kieu === 'ten_doan') {
      // bàn nối điểm: không có đoạn màu cam, lời giải nói cách nối
      const d = tinhDuong(ct);
      q.loi_giai = { ma: 'noi-doan-thang', buoc: ['Tìm điểm ' + d[0] + ' và điểm ' + d[1] + ' trong hình.', 'Nối điểm ' + d[0] + ' với điểm ' + d[1] + ', ta được đoạn thẳng ' + d + '.', 'Đoạn thẳng ' + d + ' có hai đầu là điểm ' + d[0] + ' và điểm ' + d[1] + '.'], html: veDuong(ct, { giai: true, boKe: true, lop: 'rh-svg-giai' }), kq: d };
      q.ket_luan = 'Vậy nối điểm ' + d[0] + ' với điểm ' + d[1] + ' ta được đoạn thẳng ' + d + '.';
    }
    if (q.che_do === 'cat') q.lua_chon = tron(rng, [{ gia_tri: q.dap_an, loi: [] }].concat(NH.taoNhieu(q.ky_nang, ct, rng)));
  }

  function dangKy(loai, tinh, de, deDoc, ma, nhanBiet, loiNoi, goiY, loiGiai, ketLuan, taoNhieu, hien, veHinh) {
    NH.dangKyLoai(loai, {
      tinh: tinh, de: de, deDoc: deDoc, deChuanHoa: ma, nhanBietLoi: nhanBiet, loiNoi: loiNoi, goiY: goiY,
      loiGiai: loiGiai, ketLuan: ketLuan, taoNhieu: taoNhieu, hienGiaTri: hien,
      veHinh: function (ct) { return veHinh(ct, {}); },
      veLuaChon: veLuaChonChung,
      theChu: function (ct) { return de(ct); },
      dang: 'chon_dap_an',
      moRong: moRong
    });
  }
  const hienMacDinh = function (v) { return String(v); };
  dangKy('duong', tinhDuong, deDuong, deDocDuong, maDuong, nhanBietLoiDuong, loiNoiDuong, goiYDuong, loiGiaiDuong, ketLuanDuong, taoNhieuDuong, hienMacDinh, veDuong);
  dangKy('thang_hang', tinhTH, deTH, deTH, maTH, nhanBietLoiTH, loiNoiTH, goiYTH, loiGiaiTH, function (ct) { return 'Vậy ba điểm ' + hienTH(tinhTH(ct), ct) + ' thẳng hàng.'; }, taoNhieuTH, hienTH, veTH);
  dangKy('gap_khuc', tinhGK, deGK, deDocGK, maGK, nhanBietLoiGK, loiNoiGK, goiYGK, loiGiaiGK, ketLuanGK, taoNhieuGK, hienGK, veGK);
  dangKy('tu_giac', tinhTG, deTG, deTG, maTG, nhanBietLoiTG, loiNoiTG, goiYTG, loiGiaiTG, ketLuanTG, taoNhieuTG, hienTG, veTG);
  dangKy('ghep_hinh', tinhGhep, deGhep, deGhep, maGhep, nhanBietLoiGhep, loiNoiGhep, goiYGhep, loiGiaiGhep, ketLuanGhep, taoNhieuGhep, hienGhep, veGhep);
  dangKy('khoi', tinhKhoi, deKhoi, deKhoi, maKhoi, nhanBietLoiKhoi, loiNoiKhoi, goiYKhoi, loiGiaiKhoi, ketLuanKhoi, taoNhieuKhoi, hienKhoi, veKhoi);

  NH.themKyNang('nhan-dang-duong', { noi_dung: 'B2.1', ten: 'Điểm, đoạn thẳng, đường thẳng, đường cong, đường gấp khúc', kieu: 'K3', giay: 12, gioi_han: 20, loai: 'duong', bai_hoc: 'diem-doan-thang', sinh: sinhDuong });
  NH.themKyNang('ba-diem-thang-hang', { noi_dung: 'B2.2', ten: 'Ba điểm thẳng hàng', kieu: 'K3', giay: 12, gioi_han: 20, loai: 'thang_hang', bai_hoc: 'diem-doan-thang', sinh: sinhThangHang });
  NH.themKyNang('duong-gap-khuc', { noi_dung: 'B2.8', ten: 'Đường gấp khúc, độ dài đường gấp khúc', kieu: 'K2', giay: 16, gioi_han: 100, loai: 'gap_khuc', bai_hoc: 'duong-gap-khuc', sinh: sinhGapKhuc });
  NH.themKyNang('hinh-tu-giac', { noi_dung: 'B2.3', ten: 'Hình tứ giác', kieu: 'K3', giay: 12, gioi_han: 20, loai: 'tu_giac', bai_hoc: 'hinh-tu-giac', sinh: sinhTuGiac });
  NH.themKyNang('ghep-hinh', { noi_dung: 'B2.5', ten: 'Gấp, cắt, ghép, xếp hình', kieu: 'K3', giay: 16, gioi_han: 20, loai: 'ghep_hinh', sinh: sinhGhep });
  NH.themKyNang('khoi-tru-cau', { noi_dung: 'B2.4', ten: 'Khối trụ, khối cầu', kieu: 'K3', giay: 10, gioi_han: 20, loai: 'khoi', bai_hoc: 'khoi-tru-cau', sinh: sinhKhoi });

  /* ---------------- Dữ liệu cho bàn chơi Rừng Hình Khối ---------------- */

  /** Các điểm có tên trên bàn (tọa độ SVG), dùng để bắt dính khi kéo. */
  function cacDiem(ct) {
    if (ct.loai === 'duong' && ct.kieu !== 'tim_loai') return ct.d.map(function (p, i) { return { ten: ct.ten[i], x: X(p[0]), y: Y(p[1]) }; });
    if (ct.loai === 'thang_hang' || ct.loai === 'gap_khuc') return ct.d.map(function (p, i) { return { ten: ct.ten[i], x: X(p[0]), y: Y(p[1]) }; });
    return [];
  }
  /** Các đoạn thẳng thật của hình (đếm đoạn, cộng độ dài): { ten, a, b, l }. */
  function cacDoan(ct) {
    if (ct.loai === 'duong' && ct.kieu === 'dem_doan') return canhDem(ct).map(function (c) { return { ten: tenCap(ct, c), a: c[0], b: c[1] }; });
    if (ct.loai === 'gap_khuc') return ct.d.slice(1).map(function (x, i) { return { ten: tenDoanGK(ct, i), a: i, b: i + 1, l: ct.l ? ct.l[i] : null }; });
    return [];
  }

  window.CauHinhHoc = {
    U: U, OX: OX, OY: OY, W: W, H: H, X: X, Y: Y,
    VAT: VAT, VAT_TRU: VAT_TRU, VAT_CAU: VAT_CAU, VAT_KHAC: VAT_KHAC, TEN_KHOI: TEN_KHOI, MAU_GHEP: MAU_GHEP, MAU_XEP: MAU_XEP, MAU_CAT: MAU_CAT, GHEP_TG: GHEP_TG, HINH: HINH,
    veBan: function (ct, o) {
      const f = { duong: veDuong, thang_hang: veTH, gap_khuc: veGK, tu_giac: veTG, ghep_hinh: veGhep, khoi: veKhoi }[ct.loai];
      return f ? f(ct, o || {}) : '';
    },
    veVat: veVat, veRo: veRo, bieuTuongKhoi: bieuTuongKhoi, veMotHinh: veMotHinh, veDiem: veDiem, moSvg: moSvg, chu: chu, net: net, duongGap: duongGap, soHieu: soHieu,
    cheDo: cheDo, dangTuongTac: dangTuongTac, canBanPhim: canBanPhim,
    cacDiem: cacDiem, cacDoan: cacDoan, boCucGhep: boCucGhep, boCucXep: boCucXep, boCucCat: boCucCat, dienTich2: dienTich2,
    thangHang: thangHang, boThangHang: boThangHang, canhDem: canhDem,
    MAU_HINH: MAU_HINH, esc: esc
  };
})();
