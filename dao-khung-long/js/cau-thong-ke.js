/* ============================================================
   cau-thong-ke.js – Câu hỏi thống kê, xác suất (C2.1, C2.2, C2.3) và ước lượng theo nhóm chục (2.7)
   Cắm vào NganHang bằng dangKyLoai; dùng cho Câu Cá Thống Kê, Đấu Trường và các game cũ (dạng chọn đáp án có hình).
   - 'kiem_dem' (SGK Bài 64): tranh hồ có 3, 4 loại (cá vàng, cá xanh, cá đỏ, cua). Hỏi 'dem' (có mấy con cá vàng?),
     'nhieu', 'it' (loại nào nhiều nhất, ít nhất?), 'tong' (có tất cả bao nhiêu con?).
   - 'bieu_do' (Bài 65): biểu đồ tranh hàng ngang, mỗi hình là 1 con. Hỏi thêm 'hon', 'kem' (số cá vàng nhiều hơn,
     ít hơn số cá đỏ mấy con?) và 'bang' (số cá vàng bằng số con của loại nào?).
   - 'kha_nang' (Bài 66, 74): hộp bóng trong suốt (hoặc xô cá); lấy ra 1 hay 2 quả; đáp án 'chac_chan', 'co_the', 'khong_the'.
   - 'uoc_luong' (Bài 1, 49; 03a mục 2.7): đàn 20 đến 60 con cá (hoặc quả mọng) xếp thành nhóm 10, số thật cách số tròn
     chục không quá 3; đáp án là số tròn chục (40 nghĩa là "khoảng 40").
   Cấu trúc câu chứa đủ số liệu (loại, số con, hộp bóng) và hạt giống vị trí hg: cảnh chơi dựng lại được từ ct.
   Mã lỗi (công thức trên đáp án v của bé, đ là đáp án đúng):
     dem-sot        |v − đ| là 1 hoặc 2 (sót, lặp); hỏi loại nhiều nhất (ít nhất) mà chọn loại có số con lệch không quá 2
     doc-nham-hang  v là số con của một loại khác (hàng khác của biểu đồ), hoặc hiệu của một cặp hàng khác
     nham-hon-kem   hỏi hơn, kém mấy con mà v là một trong hai số hoặc tổng hai số
     sot-loai       hỏi tất cả mà v = tổng − số con của một loại
     nham-nhieu-it  hỏi nhiều nhất mà chọn loại ít nhất, hoặc ngược lại
     nham-kha-nang  chọn sai khả năng (game ghi loai_nham trong tra_loi, ví dụ 'co_the_thanh_chac_chan')
     dem-nhom       ước lượng lệch đúng 1 chục (v = đ ± 10); lệch từ 2 chục là 'khac' (không ước lượng theo nhóm)
   API: window.CauThongKe (hình vẽ SVG dùng chung với game, ghép nhiều câu vào cùng một lượt chơi)
   ============================================================ */
(function () {
  'use strict';

  const NH = window.NganHang;
  const nn = NH.nn, chon = NH.chon, tron = NH.tron;
  const FONT = 'Baloo 2, Arial Rounded MT Bold, sans-serif';

  /** Bốn loại con vật ở hồ: màu thân, màu viền, màu vây. */
  const LOAI_CA = {
    vang: { ten: 'cá vàng', nhan: 'Cá vàng', than: '#ffc233', dam: '#c77a06', vay: '#ff9f1c' },
    xanh: { ten: 'cá xanh', nhan: 'Cá xanh', than: '#56b8f7', dam: '#1b6fbf', vay: '#2f92e0' },
    do: { ten: 'cá đỏ', nhan: 'Cá đỏ', than: '#ff6868', dam: '#b8283a', vay: '#e5484d' },
    cua: { ten: 'cua', nhan: 'Cua', than: '#ff8a3d', dam: '#b9500f', vay: '#ff8a3d' }
  };
  const THU_TU_CA = ['vang', 'xanh', 'do', 'cua'];
  const MAU_BONG = {
    xanh: { ten: 'xanh', mau: '#3a9df0', dam: '#1b67b8' },
    do: { ten: 'đỏ', mau: '#f04e5e', dam: '#b0263a' },
    vang: { ten: 'vàng', mau: '#ffc933', dam: '#cf8f00' }
  };
  const THU_TU_MAU = ['xanh', 'do', 'vang'];
  const KHA_NANG = { chac_chan: 'chắc chắn', co_the: 'có thể', khong_the: 'không thể' };
  const KHA_NANG_NHAN = { chac_chan: 'Chắc chắn', co_the: 'Có thể', khong_the: 'Không thể' };
  /** Ý nghĩa theo sách giáo viên Bài 66, dùng để gọi tên chỗ nhầm một cách nhẹ nhàng. */
  const Y_NGHIA_KN = {
    chac_chan: 'Lần nào cũng xảy ra thì là chắc chắn',
    co_the: 'Có lúc xảy ra, có lúc không thì là có thể',
    khong_the: 'Không bao giờ xảy ra thì là không thể'
  };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function f(n) { return Math.round(n * 10) / 10; }
  function tong(ds) { return ds.reduce(function (a, b) { return a + b; }, 0); }
  function hoa(t) { return t ? t.charAt(0).toUpperCase() + t.slice(1) : t; }
  function tenCa(k) { return (LOAI_CA[k] || LOAI_CA.vang).ten; }
  function nhanCa(k) { return (LOAI_CA[k] || LOAI_CA.vang).nhan; }
  function coCua(ct) { return ct.ten.indexOf('cua') >= 0; }
  /** "con cá vàng", "con cua" */
  function conCa(k) { return 'con ' + tenCa(k); }
  function soCua(ct, k) { return ct.so[ct.ten.indexOf(k)]; }

  /* ============================================================
     Hình vẽ SVG (không tham chiếu ngoài, không id, màu viết thẳng)
     ============================================================ */

  function svg(w, h, noi, nhan, lop) {
    return '<svg class="cc-hinh' + (lop ? ' ' + lop : '') + '" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" role="img" aria-label="' + esc(nhan) +
      '" xmlns="http://www.w3.org/2000/svg" font-family="' + FONT + '">' + noi + '</svg>';
  }

  /** Thân một con cá (đầu quay sang phải) trong hộp 100 đơn vị quanh gốc tọa độ. */
  function thanCa(k, c) {
    const rx = k === 'xanh' ? 36 : k === 'vang' ? 30 : 32;
    const ry = k === 'xanh' ? 18 : k === 'vang' ? 25 : 22;
    const ex = f(4 + rx * 0.56);
    let g = '<path d="M' + f(4 - rx + 8) + ' 0 L' + f(4 - rx - 16) + ' ' + f(-ry * 0.8) + ' Q' + f(4 - rx - 9) + ' 0 ' + f(4 - rx - 16) + ' ' + f(ry * 0.8) + ' Z" fill="' + c.vay + '" stroke="' + c.dam + '" stroke-width="2.5" stroke-linejoin="round"/>';
    g += '<path d="M-10 ' + f(-ry + 3) + ' Q2 ' + f(-ry - 13) + ' 18 ' + f(-ry + 1) + ' Z" fill="' + c.vay + '" stroke="' + c.dam + '" stroke-width="2.5" stroke-linejoin="round"/>';
    g += '<path d="M0 ' + f(ry - 4) + ' Q7 ' + f(ry + 8) + ' 14 ' + f(ry - 5) + ' Z" fill="' + c.vay + '" stroke="' + c.dam + '" stroke-width="2" stroke-linejoin="round"/>';
    g += '<ellipse cx="4" cy="0" rx="' + rx + '" ry="' + ry + '" fill="' + c.than + '" stroke="' + c.dam + '" stroke-width="2.5"/>';
    if (k === 'do') {
      g += '<path d="M-7 ' + f(-ry + 3) + ' Q-13 0 -7 ' + f(ry - 3) + '" stroke="#fff" stroke-opacity=".75" stroke-width="5" fill="none" stroke-linecap="round"/>';
      g += '<path d="M7 ' + f(-ry + 2) + ' Q2 0 7 ' + f(ry - 2) + '" stroke="#fff" stroke-opacity=".75" stroke-width="5" fill="none" stroke-linecap="round"/>';
    }
    if (k === 'vang') g += '<path d="M-10 -6 q4 4 0 8 M-2 -10 q4 4 0 8 M-2 2 q4 4 0 8" stroke="' + c.dam + '" stroke-opacity=".35" stroke-width="2" fill="none"/>';
    g += '<ellipse cx="6" cy="' + f(ry * 0.45) + '" rx="' + f(rx * 0.55) + '" ry="' + f(ry * 0.28) + '" fill="#fff" opacity=".3"/>';
    g += '<ellipse cx="-2" cy="' + f(-ry * 0.5) + '" rx="' + f(rx * 0.4) + '" ry="' + f(ry * 0.18) + '" fill="#fff" opacity=".55"/>';
    g += '<path d="M-3 3 Q-12 11 -5 16 Q2 12 -3 3 Z" fill="' + c.vay + '" stroke="' + c.dam + '" stroke-width="1.6" opacity=".95"/>';
    g += '<circle cx="' + ex + '" cy="-5" r="7.5" fill="#fff" stroke="' + c.dam + '" stroke-width="1.5"/>';
    g += '<circle cx="' + f(+ex + 1.6) + '" cy="-4.6" r="4.3" fill="#221a3b"/><circle cx="' + f(+ex) + '" cy="-6.8" r="1.7" fill="#fff"/>';
    g += '<circle cx="' + f(+ex + 3) + '" cy="7" r="3.4" fill="#ff8fa3" opacity=".6"/>';
    g += '<path d="M' + f(+ex + 5) + ' 8 Q' + f(+ex + 8.5) + ' 11 ' + f(+ex + 11.5) + ' 6.5" stroke="' + c.dam + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>';
    return g;
  }

  function thanCua(c) {
    let g = '';
    [-1, 1].forEach(function (b) {
      for (let i = 0; i < 3; i++) g += '<path d="M' + b * 18 + ' ' + (8 + i * 6) + ' Q' + b * 34 + ' ' + (6 + i * 7) + ' ' + b * 42 + ' ' + (15 + i * 9) + '" stroke="' + c.dam + '" stroke-width="4" fill="none" stroke-linecap="round"/>';
      g += '<path d="M' + b * 16 + ' -4 Q' + b * 30 + ' -8 ' + b * 32 + ' -16" stroke="' + c.dam + '" stroke-width="5" fill="none" stroke-linecap="round"/>';
      g += '<circle cx="' + b * 34 + '" cy="-25" r="11.5" fill="' + c.than + '" stroke="' + c.dam + '" stroke-width="2.5"/>';
      g += '<path d="M' + b * 29 + ' -33 L' + b * 35 + ' -25 L' + b * 43 + ' -31" stroke="' + c.dam + '" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
    });
    g += '<ellipse cx="0" cy="6" rx="29" ry="19" fill="' + c.than + '" stroke="' + c.dam + '" stroke-width="2.5"/>';
    g += '<ellipse cx="-6" cy="-3" rx="13" ry="5" fill="#fff" opacity=".5"/>';
    [-1, 1].forEach(function (b) {
      g += '<path d="M' + b * 7 + ' -9 L' + b * 9 + ' -20" stroke="' + c.dam + '" stroke-width="3" stroke-linecap="round"/>';
      g += '<circle cx="' + b * 9 + '" cy="-24" r="6.2" fill="#fff" stroke="' + c.dam + '" stroke-width="1.5"/><circle cx="' + (b * 9 + 0.8) + '" cy="-23.4" r="3.4" fill="#221a3b"/>';
      g += '<circle cx="' + b * 15 + '" cy="11" r="3.6" fill="#ff8fa3" opacity=".6"/>';
    });
    g += '<path d="M-7 12 Q0 17 7 12" stroke="' + c.dam + '" stroke-width="2.3" fill="none" stroke-linecap="round"/>';
    return g;
  }

  /** Một con cá (hoặc cua) dài khoảng `dai` đơn vị, tâm ở (x, y); trai: quay đầu sang trái. */
  function hinhCa(k, x, y, dai, trai) {
    const c = LOAI_CA[k] || LOAI_CA.vang;
    const s = Math.round(dai * 10) / 1000;
    return '<g transform="translate(' + f(x) + ' ' + f(y) + ') scale(' + (trai ? -s : s) + ' ' + s + ')">' +
      (k === 'cua' ? thanCua(c) : thanCa(k, c)) + '</g>';
  }

  /** Một con cá đứng riêng (dùng trong nút, ô biểu đồ của game): SVG vuông nhỏ. */
  function caNho(k, trai) {
    return '<svg class="cc-ca-svg" viewBox="-52 -42 104 84" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">' + hinhCa(k, 0, 0, 100, trai) + '</svg>';
  }

  function hinhBong(m, x, y, r) {
    const c = MAU_BONG[m] || MAU_BONG.xanh;
    return '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r) + '" fill="' + c.mau + '" stroke="' + c.dam + '" stroke-width="' + f(r * 0.09) + '"/>' +
      '<path d="M' + f(x - r * 0.66) + ' ' + f(y + r * 0.22) + ' A' + f(r * 0.7) + ' ' + f(r * 0.7) + ' 0 0 0 ' + f(x + r * 0.6) + ' ' + f(y + r * 0.42) + '" fill="none" stroke="#000" stroke-opacity=".13" stroke-width="' + f(r * 0.18) + '" stroke-linecap="round"/>' +
      '<ellipse cx="' + f(x - r * 0.3) + '" cy="' + f(y - r * 0.36) + '" rx="' + f(r * 0.34) + '" ry="' + f(r * 0.21) + '" fill="#fff" opacity=".62"/>';
  }
  function bongNho(m) {
    return '<svg class="cc-bong-svg" viewBox="-26 -26 52 52" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">' + hinhBong(m, 0, 0, 23) + '</svg>';
  }

  /** Quả mọng tím như hình berry của đảo. */
  function hinhQua(x, y, r) {
    return '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r) + '" fill="#8b4fe0" stroke="#5a2aa6" stroke-width="' + f(r * 0.1) + '"/>' +
      '<ellipse cx="' + f(x - r * 0.32) + '" cy="' + f(y - r * 0.38) + '" rx="' + f(r * 0.3) + '" ry="' + f(r * 0.18) + '" fill="#fff" opacity=".5"/>' +
      '<path d="M' + f(x + r * 0.05) + ' ' + f(y - r * 0.05) + ' l' + f(r * 0.28) + ' ' + f(-r * 0.12) + ' l' + f(-r * 0.12) + ' ' + f(r * 0.28) + ' l' + f(-r * 0.28) + ' ' + f(r * 0.12) + ' z" fill="#4a1f8f"/>';
  }

  /** Nền hồ (khung cỏ, mặt nước, gợn sóng). */
  function nenHo(w, h) {
    const cx = w / 2, cy = h / 2 + 4;
    return '<rect x="0" y="0" width="' + w + '" height="' + h + '" rx="26" fill="#bde8a0"/>' +
      '<ellipse cx="' + f(cx) + '" cy="' + f(cy) + '" rx="' + f(w / 2 - 12) + '" ry="' + f(h / 2 - 14) + '" fill="#79cdf1" stroke="#46a9da" stroke-width="5"/>' +
      '<ellipse cx="' + f(cx) + '" cy="' + f(cy + 8) + '" rx="' + f(w / 2 - 44) + '" ry="' + f(h / 2 - 40) + '" fill="#92d9f6" opacity=".75"/>' +
      '<path d="M' + f(cx - 150) + ' ' + f(cy - 60) + ' q14 -8 28 0 M' + f(cx + 110) + ' ' + f(cy + 70) + ' q14 -8 28 0 M' + f(cx - 40) + ' ' + f(cy + 84) + ' q12 -7 24 0" stroke="#fff" stroke-opacity=".7" stroke-width="3" fill="none" stroke-linecap="round"/>';
  }

  /** Danh sách con vật theo số liệu, trộn theo hạt giống: [{ k }] */
  function danhSachCon(ct) {
    const ds = [];
    ct.ten.forEach(function (k, i) { for (let j = 0; j < ct.so[i]; j++) ds.push(k); });
    return ds;
  }

  /**
   * Vị trí rải con vật trong một khung elip (tỉ lệ 0..1), theo hạt giống ct.hg: lưới có xê dịch nhẹ, không chồng nhau.
   * Trả về [{ k, x, y, trai }] (x, y tỉ lệ 0..1). cot, hang: lưới tối đa.
   */
  function viTriRai(ct, cot, hang) {
    const rng = NH.taoRng((ct.hg || 1) * 7919 + 13);
    const ds = tron(rng, danhSachCon(ct));
    const o = [];
    for (let r = 0; r < hang; r++) for (let c = 0; c < cot; c++) {
      const x = (c + 0.5) / cot, y = (r + 0.5) / hang;
      const trong = Math.pow((x - 0.5) / 0.5, 2) + Math.pow((y - 0.5) / 0.52, 2) <= 1.02;
      o.push({ x: x, y: y, trong: trong });
    }
    let ung = o.filter(function (p) { return p.trong; });
    if (ung.length < ds.length) ung = o.slice();
    ung = tron(rng, ung);
    return ds.map(function (k, i) {
      const p = ung[i % ung.length];
      return { k: k, x: p.x + (rng() - 0.5) * 0.35 / cot, y: p.y + (rng() - 0.5) * 0.3 / hang, trai: rng() < 0.5 };
    });
  }

  /** Tranh hồ cá của câu kiểm đếm (Bài 64: "Quan sát tranh rồi tìm số"). */
  function veHo(ct) {
    const W = 440, H = 260;
    let s = nenHo(W, H);
    const soCon = tong(ct.so);
    const cot = soCon > 16 ? 6 : 5, hang = soCon > 15 ? 4 : 3;
    viTriRai(ct, cot, hang).forEach(function (p) {
      s += hinhCa(p.k, 34 + p.x * (W - 68), 30 + p.y * (H - 60), 46, p.trai);
    });
    return svg(W, H, s, 'Tranh hồ có ' + ct.ten.map(tenCa).join(', '));
  }

  /** Các giỏ đã phân loại (lời giải kiểm đếm, bài học). o: { so: hiện số con, sang: [chỉ số giỏ tô sáng] } */
  function veGio(ct, o) {
    o = o || {};
    const n = ct.ten.length;
    const W = n * 160 + 16, H = 206;
    let s = '';
    ct.ten.forEach(function (k, i) {
      const x0 = 16 + i * 160;
      const sang = (o.sang || []).indexOf(i) >= 0;
      if (sang) s += '<rect x="' + (x0 - 8) + '" y="4" width="160" height="198" rx="20" fill="#fff4d6" stroke="#ffb020" stroke-width="4"/>';
      s += '<path d="M' + (x0 + 4) + ' 58 L' + (x0 + 140) + ' 58 L' + (x0 + 128) + ' 152 Q' + (x0 + 72) + ' 166 ' + (x0 + 16) + ' 152 Z" fill="#e9b37a" stroke="#9a5b2a" stroke-width="4" stroke-linejoin="round"/>';
      for (let r = 0; r < 3; r++) s += '<path d="M' + (x0 + 10 + r * 2) + ' ' + (84 + r * 24) + ' L' + (x0 + 134 - r * 2) + ' ' + (84 + r * 24) + '" stroke="#b9773d" stroke-width="3" opacity=".7"/>';
      s += '<rect x="' + x0 + '" y="50" width="144" height="14" rx="7" fill="#c98446" stroke="#9a5b2a" stroke-width="3"/>';
      for (let j = 0; j < ct.so[i]; j++) {
        const hang = Math.floor(j / 5), cot = j % 5;
        s += hinhCa(k, x0 + 18 + cot * 27, 96 + hang * 32, 25, false);
      }
      s += hinhCa(k, x0 + 22, 186, 30, false);
      s += '<text x="' + (x0 + 42) + '" y="193" font-size="20" font-weight="800" fill="#3b2f63">' + esc(nhanCa(k)) + '</text>';
      if (o.so) {
        s += '<circle cx="' + (x0 + 128) + '" cy="34" r="22" fill="#6a4bc4" stroke="#fff" stroke-width="3"/>';
        s += '<text x="' + (x0 + 128) + '" y="43" text-anchor="middle" font-size="26" font-weight="800" fill="#fff">' + ct.so[i] + '</text>';
      }
    });
    return svg(W, H, s, 'Các giỏ cá đã phân loại');
  }

  /**
   * Biểu đồ tranh hàng ngang như SGK Bài 65 (mỗi hình là 1 con), các hình thẳng cột để so độ dài hàng.
   * o: { sang: [chỉ số hàng tô sáng], so: hiện số con cuối hàng, tieuDe }
   */
  function veBieuDo(ct, o) {
    o = o || {};
    const n = ct.ten.length;
    const lab = 146, o1 = 31, x0 = lab + 12, cot = Math.max(8, Math.max.apply(null, ct.so));
    const W = x0 + cot * o1 + (o.so ? 50 : 14), top = 40, hh = 46;
    const H = top + n * hh + 38;
    let s = '<rect x="0" y="0" width="' + W + '" height="' + H + '" rx="18" fill="#fff"/>';
    s += '<text x="' + f(W / 2) + '" y="27" text-anchor="middle" font-size="18" font-weight="800" fill="#3b2f63" letter-spacing="1">' + esc(o.tieuDe || tieuDeBieuDo(ct)) + '</text>';
    ct.ten.forEach(function (k, i) {
      const y = top + i * hh;
      const sang = (o.sang || []).indexOf(i) >= 0;
      s += '<rect x="8" y="' + (y + 2) + '" width="' + (W - 16) + '" height="' + (hh - 4) + '" rx="12" fill="' + (sang ? '#fff4d6' : i % 2 ? '#f7fbff' : '#eef7ff') + '"' + (sang ? ' stroke="#ffb020" stroke-width="3.5"' : '') + '/>';
      s += hinhCa(k, 28, y + hh / 2, 32, false);
      s += '<text x="49" y="' + (y + hh / 2 + 6) + '" font-size="18" font-weight="800" fill="#3b2f63">' + esc(nhanCa(k)) + '</text>';
      for (let j = 0; j < ct.so[i]; j++) s += hinhCa(k, x0 + j * o1 + o1 / 2, y + hh / 2, 28, false);
      if (o.so) {
        s += '<circle cx="' + (W - 26) + '" cy="' + (y + hh / 2) + '" r="16" fill="#6a4bc4"/>';
        s += '<text x="' + (W - 26) + '" y="' + (y + hh / 2 + 7) + '" text-anchor="middle" font-size="20" font-weight="800" fill="#fff">' + ct.so[i] + '</text>';
      }
    });
    s += '<line x1="' + lab + '" y1="' + top + '" x2="' + lab + '" y2="' + (top + n * hh) + '" stroke="#b9c6dd" stroke-width="2"/>';
    s += '<text x="' + f(W / 2) + '" y="' + (H - 12) + '" text-anchor="middle" font-size="16" font-weight="700" fill="#5b5575">Mỗi hình là 1 con</text>';
    return svg(W, H, s, 'Biểu đồ tranh ' + tieuDeBieuDo(ct).toLowerCase());
  }
  function tieuDeBieuDo(ct) { return coCua(ct) ? 'SỐ CÁ VÀ CUA CÂU ĐƯỢC' : 'SỐ CÁ CÂU ĐƯỢC'; }

  /** Vị trí các quả bóng trong hộp (xếp từ đáy lên, 3 quả một hàng), theo thứ tự đã trộn ổn định. */
  function bongTrongHop(ct) {
    const ds = [];
    ct.mau.forEach(function (m, i) { for (let j = 0; j < ct.so[i]; j++) ds.push(m); });
    const rng = NH.taoRng(ds.length * 31 + ct.so.reduce(function (a, b, i) { return a + b * (i + 3) * 17; }, 5));
    return tron(rng, ds);
  }

  /** Hộp bóng trong suốt (hoặc xô cá) của câu khả năng. o: { sang: màu tô vòng, khongChu: bỏ dòng chữ trên } */
  function veHop(ct, o) {
    o = o || {};
    const W = 320, H = 252;
    let s = '';
    const ds = bongTrongHop(ct);
    const cb = ct.vat === 'ca';
    if (!o.khongChu) s += '<text x="160" y="26" text-anchor="middle" font-size="19" font-weight="800" fill="#3b2f63">' + esc(cb ? 'Bắt ra ' + ct.lay + ' con cá' : 'Lấy ra ' + ct.lay + ' quả bóng') + '</text>';
    if (cb) {
      s += '<path d="M44 70 L276 70 L254 232 Q160 246 66 232 Z" fill="#dff3fb" stroke="#5a8fb0" stroke-width="5" stroke-linejoin="round"/>';
      s += '<path d="M52 104 L268 104 L254 226 Q160 240 66 226 Z" fill="#8fd8f5" opacity=".85"/>';
      s += '<path d="M60 70 Q160 12 260 70" stroke="#5a8fb0" stroke-width="5" fill="none"/>';
    } else {
      s += '<rect x="46" y="54" width="228" height="184" rx="22" fill="#e3f4ff" stroke="#7fbfe8" stroke-width="5"/>';
      s += '<rect x="38" y="44" width="244" height="18" rx="9" fill="#9fd3f3" stroke="#7fbfe8" stroke-width="3"/>';
    }
    ds.forEach(function (m, i) {
      const hang = Math.floor(i / 3), cot = i % 3;
      const x = 100 + cot * 60 + (hang % 2 ? 14 : 0), y = 200 - hang * 50;
      if (o.sang && o.sang === m) s += '<circle cx="' + x + '" cy="' + y + '" r="' + (cb ? 30 : 29) + '" fill="#fff4d6" stroke="#ffb020" stroke-width="4"/>';
      s += cb ? hinhCa(m, x, y, 50, cot % 2 === 1) : hinhBong(m, x, y, 23);
    });
    if (!cb) s += '<path d="M62 70 L96 70 L70 222 L56 222 Z" fill="#fff" opacity=".35"/>';
    return svg(W, H, s, (cb ? 'Xô có ' : 'Hộp có ') + moTaHop(ct));
  }

  /** Các nhóm của đàn: [số con mỗi nhóm], số con lẻ. 42: [10, 10, 10, 10], 2; 38: [10, 10, 10, 8], 0 */
  function nhomDan(n) {
    const chuc = Math.round(n / 10);
    const du = n - chuc * 10;
    const nhom = [];
    for (let i = 0; i < chuc; i++) nhom.push(10);
    if (du < 0) nhom[chuc - 1] += du;
    return { nhom: nhom, le: Math.max(0, du) };
  }

  /**
   * Đàn cá (quả mọng) xếp theo nhóm 10 khoanh nét đứt như SGK Bài 1, phần lẻ để rời.
   * o: { mo: sau 3 giây mờ đi (SVG tự chạy, dùng ở Đấu Trường, game cũ), nhan: ghi 10, 20, 30… trên từng nhóm }
   */
  function veDan(ct, o) {
    o = o || {};
    const d = nhomDan(ct.n);
    const k = d.nhom.length;
    // Lưới gọn: 2 nhóm một hàng, 3 nhóm một hàng, 4 nhóm thành 2 × 2, 5, 6 nhóm thành 3 cột; phần lẻ ở cột bên phải
    const cot = k === 4 ? 2 : Math.min(3, k), hang = Math.ceil(k / cot);
    const gw = 166, gh = 92, benLe = d.le ? 96 : 0;
    const W = cot * gw + 16 + benLe, H = hang * gh + 22;
    const rng = NH.taoRng((ct.hg || 1) * 131 + ct.n);
    let s = '<rect x="0" y="0" width="' + W + '" height="' + H + '" rx="24" fill="' + (ct.vat === 'qua' ? '#dff5c9' : '#86d3f3') + '"/>';
    let ben = '';
    const con = function (x, y, trai) { return ct.vat === 'qua' ? hinhQua(x, y, 11.5) : hinhCa('vang', x, y, 26, trai); };
    d.nhom.forEach(function (sl, g) {
      const gx = 12 + (g % cot) * gw, gy = 12 + Math.floor(g / cot) * gh;
      ben += '<rect x="' + gx + '" y="' + gy + '" width="' + (gw - 10) + '" height="' + (gh - 12) + '" rx="32" fill="#fff" fill-opacity=".22" stroke="#fff" stroke-width="3" stroke-dasharray="9 7"/>';
      for (let j = 0; j < sl; j++) {
        const x = gx + 22 + (j % 5) * 28 + (rng() - 0.5) * 4, y = gy + 24 + Math.floor(j / 5) * 32 + (rng() - 0.5) * 4;
        ben += con(x, y, rng() < 0.3);
      }
      if (o.nhan) {
        ben += '<circle cx="' + (gx + gw - 22) + '" cy="' + (gy + 8) + '" r="17" fill="#6a4bc4" stroke="#fff" stroke-width="3"/>';
        ben += '<text x="' + (gx + gw - 22) + '" y="' + (gy + 15) + '" text-anchor="middle" font-size="17" font-weight="800" fill="#fff">' + (g + 1) * 10 + '</text>';
      }
    });
    const xl = cot * gw + 16;
    for (let j = 0; j < d.le; j++) {
      const x = xl + 22 + (j % 2) * 36 + (rng() - 0.5) * 6, y = 30 + Math.floor(j / 2) * 36 + (rng() - 0.5) * 6;
      ben += con(x, y, rng() < 0.5);
    }
    if (o.nhan && d.le) ben += '<text x="' + (xl + 40) + '" y="' + (30 + Math.ceil(d.le / 2) * 36 + 10) + '" text-anchor="middle" font-size="22" font-weight="800" fill="#3b2f63">+' + d.le + '</text>';
    if (o.mo) s += '<g opacity="1"><animate attributeName="opacity" values="1;1;0.08" keyTimes="0;0.8;1" dur="3.8s" fill="freeze"/>' + ben + '</g>';
    else s += ben;
    return svg(W, H, s, ct.vat === 'qua' ? 'Các nhóm quả mọng' : 'Đàn cá bơi theo nhóm');
  }

  /* ============================================================
     Loại 'kiem_dem' và 'bieu_do': số liệu { ten: [loại], so: [số con] }
     ============================================================ */

  const HOI_SO = { dem: 1, tong: 1, hon: 1, kem: 1 };
  /** Câu có đáp án là số (game cho bé tự gõ bằng bàn phím số). */
  function laSo(ct) { return (ct.loai === 'kiem_dem' || ct.loai === 'bieu_do') && !!HOI_SO[ct.hoi]; }

  function chiSoMax(so) { const m = Math.max.apply(null, so); return so.indexOf(m); }
  function chiSoMin(so) { const m = Math.min.apply(null, so); return so.indexOf(m); }
  function duyNhat(so, v) { return so.filter(function (x) { return x === v; }).length === 1; }

  function tinhDL(ct) {
    const so = ct.so;
    if (ct.hoi === 'dem') return so[ct.a];
    if (ct.hoi === 'tong') return tong(so);
    if (ct.hoi === 'nhieu') return ct.ten[chiSoMax(so)];
    if (ct.hoi === 'it') return ct.ten[chiSoMin(so)];
    if (ct.hoi === 'hon' || ct.hoi === 'kem') return Math.abs(so[ct.a] - so[ct.b]);
    if (ct.hoi === 'bang') { for (let i = 0; i < so.length; i++) if (i !== ct.a && so[i] === so[ct.a]) return ct.ten[i]; }
    return null;
  }

  function deDL(ct) {
    const A = ct.a != null ? ct.ten[ct.a] : null, B = ct.b != null ? ct.ten[ct.b] : null;
    if (ct.hoi === 'dem') return 'Có mấy ' + conCa(A) + '?';
    if (ct.hoi === 'tong') return coCua(ct) ? 'Có tất cả bao nhiêu con?' : 'Có tất cả bao nhiêu con cá?';
    if (ct.hoi === 'nhieu') return coCua(ct) ? 'Con vật nào nhiều nhất?' : 'Loại cá nào nhiều nhất?';
    if (ct.hoi === 'it') return coCua(ct) ? 'Con vật nào ít nhất?' : 'Loại cá nào ít nhất?';
    if (ct.hoi === 'hon') return 'Số ' + tenCa(A) + ' nhiều hơn số ' + tenCa(B) + ' mấy con?';
    if (ct.hoi === 'kem') return 'Số ' + tenCa(A) + ' ít hơn số ' + tenCa(B) + ' mấy con?';
    if (ct.hoi === 'bang') return 'Số ' + tenCa(A) + ' bằng số con của loại nào?';
    return '';
  }
  function deDocDL(ct) { return (ct.loai === 'bieu_do' ? 'Quan sát biểu đồ tranh. ' : 'Quan sát tranh. ') + deDL(ct); }

  function maDL(ct) {
    let m = ct.hoi;
    if (ct.a != null) m += '-' + ct.ten[ct.a];
    if (ct.b != null) m += '-' + ct.ten[ct.b];
    return m + ':' + ct.ten.map(function (k, i) { return k + ct.so[i]; }).join(',');
  }

  /** Hiệu của mọi cặp hàng khác cặp (a, b). */
  function hieuCapKhac(ct) {
    const ra = [];
    for (let i = 0; i < ct.so.length; i++) for (let j = i + 1; j < ct.so.length; j++) {
      if ((i === ct.a && j === ct.b) || (i === ct.b && j === ct.a)) continue;
      const h = Math.abs(ct.so[i] - ct.so[j]);
      if (h > 0 && ra.indexOf(h) < 0) ra.push(h);
    }
    return ra;
  }

  function nhanBietLoiDL(ct, v) {
    const d = tinhDL(ct);
    const so = ct.so;
    if (!HOI_SO[ct.hoi]) {
      const k = String(v == null ? '' : v);
      if (k === d) return [];
      const i = ct.ten.indexOf(k), j = ct.ten.indexOf(d);
      if (i < 0) return ['khac'];
      const ma = [];
      if (ct.hoi === 'nhieu') {
        if (so[i] === Math.min.apply(null, so)) ma.push('nham-nhieu-it');
        if (so[j] - so[i] <= 2) ma.push('dem-sot');
      } else if (ct.hoi === 'it') {
        if (so[i] === Math.max.apply(null, so)) ma.push('nham-nhieu-it');
        if (so[i] - so[j] <= 2) ma.push('dem-sot');
      } else if (ct.hoi === 'bang' && i !== ct.a && Math.abs(so[i] - so[ct.a]) <= 2) ma.push('dem-sot');
      return ma.length ? ma : ['khac'];
    }
    const x = typeof v === 'number' ? v : Number(String(v == null ? '' : v).trim());
    if (!Number.isInteger(x) || x < 0 || String(v).trim() === '') return ['khac'];
    if (x === d) return [];
    const ma = [];
    if (ct.hoi === 'dem') {
      if (so.some(function (y, i) { return i !== ct.a && y === x; })) ma.push('doc-nham-hang');
    } else if (ct.hoi === 'tong') {
      if (so.some(function (y) { return d - y === x; })) ma.push('sot-loai');
    } else {
      const p = so[ct.a], q = so[ct.b];
      if (x === p || x === q || x === p + q) ma.push('nham-hon-kem');
      else if (hieuCapKhac(ct).indexOf(x) >= 0) ma.push('doc-nham-hang');
    }
    if (Math.abs(x - d) <= 2) ma.push('dem-sot');
    return ma.length ? ma : ['khac'];
  }

  function loiNoiDL(ct, v, maLoi) {
    const m = (maLoi && maLoi[0]) || 'khac';
    const bd = ct.loai === 'bieu_do';
    const A = ct.a != null ? ct.ten[ct.a] : null;
    if (m === 'doc-nham-hang') {
      if (ct.hoi === 'dem') {
        const i = ct.so.findIndex(function (y, j) { return j !== ct.a && y === Number(v); });
        return bd ? 'Đó là số con ở hàng ' + tenCa(ct.ten[i]) + ' rồi' : 'Đó là số ' + tenCa(ct.ten[i]) + ' rồi';
      }
      return 'Con so nhầm sang hàng khác rồi. Tìm đúng hàng ' + tenCa(A) + ' và hàng ' + tenCa(ct.ten[ct.b]) + ' nhé';
    }
    if (m === 'dem-sot') {
      if (ct.hoi === 'dem') return 'Con đếm sót hoặc đếm lặp rồi. Đếm lại từng ' + conCa(A) + ' nhé';
      if (ct.hoi === 'nhieu' || ct.hoi === 'it' || ct.hoi === 'bang') return 'Hai loại này gần bằng nhau, con đếm lại cho kĩ nhé';
      if (ct.hoi === 'tong') return 'Con đếm sót hoặc đếm lặp vài con rồi';
      return 'Con đếm lại số con ở hai hàng nhé';
    }
    if (m === 'nham-hon-kem') return 'Đề hỏi ' + (ct.hoi === 'hon' ? 'nhiều hơn' : 'ít hơn') + ' mấy con: lấy số lớn trừ số bé nhé';
    if (m === 'sot-loai') {
      const d = tinhDL(ct);
      const i = ct.so.findIndex(function (y) { return d - y === Number(v); });
      return 'Con quên cộng số ' + tenCa(ct.ten[i]) + ' rồi';
    }
    if (m === 'nham-nhieu-it') return ct.hoi === 'nhieu' ? 'Đề hỏi loại nhiều nhất, con chọn loại ít nhất rồi' : 'Đề hỏi loại ít nhất, con chọn loại nhiều nhất rồi';
    if (ct.hoi === 'nhieu') return 'Loại nhiều nhất là loại có số con lớn nhất';
    if (ct.hoi === 'it') return 'Loại ít nhất là loại có số con bé nhất';
    if (ct.hoi === 'bang') return 'Con tìm loại có số con bằng số ' + tenCa(A) + ' nhé';
    if (ct.hoi === 'dem') return 'Con đếm lại từng ' + conCa(A) + ' nhé';
    if (ct.hoi === 'tong') return 'Con đếm số con của từng loại rồi cộng lại nhé';
    return 'Hơn, kém nhau mấy con thì lấy số lớn trừ số bé nhé';
  }

  function goiYDL(ct) {
    const bd = ct.loai === 'bieu_do';
    const A = ct.a != null ? ct.ten[ct.a] : null, B = ct.b != null ? ct.ten[ct.b] : null;
    const d = tinhDL(ct);
    if (ct.hoi === 'dem') return [
      bd ? 'Tìm hàng ' + tenCa(A) + ' trên biểu đồ.' : 'Chỉ đếm các ' + conCa(A) + ' thôi.',
      bd ? 'Mỗi hình là 1 con. Đếm từng hình trong hàng đó.' : 'Đếm lần lượt từng con, con nào đếm rồi thì không đếm lại.',
      'Số ' + tenCa(A) + ' lớn hơn ' + Math.max(0, d - 2) + ' và bé hơn ' + (d + 2) + '.'
    ];
    if (ct.hoi === 'tong') return [
      'Đếm số con của từng loại trước.',
      'Có tất cả thì cộng số con của các loại lại.',
      'Tính: ' + ct.so.join(' + ') + ' = ?'
    ];
    if (ct.hoi === 'nhieu' || ct.hoi === 'it') {
      const nhieu = ct.hoi === 'nhieu';
      return [
        bd ? 'Hàng nào dài nhất thì loại đó nhiều nhất, hàng ngắn nhất thì ít nhất.' : 'Đếm số con của từng loại.',
        'So sánh các số: số nào ' + (nhieu ? 'lớn' : 'bé') + ' nhất?',
        hoa(ct.ten.slice(0, 2).map(function (k) { return tenCa(k) + ' có ' + soCua(ct, k) + ' con'; }).join(', ')) + '. Còn ' + ct.ten.slice(2).map(tenCa).join(', ') + ' thì sao?'
      ];
    }
    if (ct.hoi === 'hon' || ct.hoi === 'kem') return [
      'Đếm số ' + tenCa(A) + ' và số ' + tenCa(B) + '.',
      'Hơn, kém nhau mấy con: lấy số lớn trừ số bé.',
      'Tính: ' + Math.max(ct.so[ct.a], ct.so[ct.b]) + ' − ' + Math.min(ct.so[ct.a], ct.so[ct.b]) + ' = ?'
    ];
    return [
      'Đếm số ' + tenCa(A) + ': có mấy con?',
      'Tìm hàng khác dài bằng hàng ' + tenCa(A) + '.',
      hoa(tenCa(A)) + ' có ' + ct.so[ct.a] + ' con. Loại nào cũng có ' + ct.so[ct.a] + ' con?'
    ];
  }

  function loiGiaiDL(ct) {
    const d = tinhDL(ct);
    const bd = ct.loai === 'bieu_do';
    const A = ct.a != null ? ct.ten[ct.a] : null, B = ct.b != null ? ct.ten[ct.b] : null;
    const moTa = ct.ten.map(function (k, i) { return tenCa(k) + ' ' + ct.so[i] + ' con'; }).join(', ');
    let buoc, sang;
    if (ct.hoi === 'dem') {
      sang = [ct.a];
      buoc = bd ? ['Hàng ' + tenCa(A) + ' có ' + d + ' hình', 'Mỗi hình là 1 con nên có ' + d + ' ' + conCa(A)]
        : ['Đếm từng ' + conCa(A) + ': 1, 2, … ' + d, 'Có ' + d + ' ' + conCa(A)];
    }
    else if (ct.hoi === 'tong') { sang = ct.ten.map(function (x, i) { return i; }); buoc = [hoa(moTa), ct.so.join(' + ') + ' = ' + d, 'Có tất cả ' + d + ' con']; }
    else if (ct.hoi === 'nhieu' || ct.hoi === 'it') {
      const xep = ct.so.slice().sort(function (x, y) { return x - y; });
      sang = [ct.ten.indexOf(d)];
      buoc = [hoa(moTa), xep.join(' < ').replace(/(\d+) < \1/g, '$1 = $1'), hoa(tenCa(d)) + (ct.hoi === 'nhieu' ? ' nhiều nhất' : ' ít nhất')];
    } else if (ct.hoi === 'hon' || ct.hoi === 'kem') {
      const lon = Math.max(ct.so[ct.a], ct.so[ct.b]), be = Math.min(ct.so[ct.a], ct.so[ct.b]);
      sang = [ct.a, ct.b];
      buoc = [hoa(tenCa(A)) + ' có ' + ct.so[ct.a] + ' con, ' + tenCa(B) + ' có ' + ct.so[ct.b] + ' con', lon + ' − ' + be + ' = ' + d, 'Số ' + tenCa(A) + (ct.hoi === 'hon' ? ' nhiều hơn' : ' ít hơn') + ' số ' + tenCa(B) + ' ' + d + ' con'];
    } else {
      sang = [ct.a, ct.ten.indexOf(d)];
      buoc = [hoa(tenCa(A)) + ' có ' + ct.so[ct.a] + ' con', hoa(tenCa(d)) + ' cũng có ' + ct.so[ct.a] + ' con', 'Hai hàng dài bằng nhau'];
    }
    return { ma: bd ? 'doc-bieu-do' : 'kiem-dem', buoc: buoc, html: bd ? veBieuDo(ct, { sang: sang, so: true }) : veGio(ct, { sang: sang, so: true }), kq: d };
  }

  function ketLuanDL(ct) {
    const d = tinhDL(ct);
    const A = ct.a != null ? ct.ten[ct.a] : null, B = ct.b != null ? ct.ten[ct.b] : null;
    if (ct.hoi === 'dem') return 'Vậy có ' + d + ' ' + conCa(A) + '.';
    if (ct.hoi === 'tong') return 'Vậy có tất cả ' + d + ' con.';
    if (ct.hoi === 'nhieu') return 'Vậy ' + tenCa(d) + ' nhiều nhất.';
    if (ct.hoi === 'it') return 'Vậy ' + tenCa(d) + ' ít nhất.';
    if (ct.hoi === 'hon') return 'Vậy số ' + tenCa(A) + ' nhiều hơn số ' + tenCa(B) + ' ' + d + ' con.';
    if (ct.hoi === 'kem') return 'Vậy số ' + tenCa(A) + ' ít hơn số ' + tenCa(B) + ' ' + d + ' con.';
    return 'Vậy số ' + tenCa(A) + ' bằng số ' + tenCa(d) + '.';
  }

  /** Ứng viên đáp án nhiễu dạng số: [{ v, w }], mọi ứng viên đều khớp một công thức lỗi có tên. */
  function ungVienSo(ct) {
    const d = tinhDL(ct), so = ct.so;
    const ds = [];
    const them = function (v, w) { if (Number.isInteger(v) && v >= 0 && v !== d && !ds.some(function (x) { return x.v === v; })) ds.push({ v: v, w: w }); };
    if (ct.hoi === 'dem') so.forEach(function (y, i) { if (i !== ct.a) them(y, 3); });
    else if (ct.hoi === 'tong') so.forEach(function (y) { them(d - y, 3); });
    else {
      them(so[ct.a], 3); them(so[ct.b], 3); them(so[ct.a] + so[ct.b], 2.5);
      hieuCapKhac(ct).forEach(function (h) { them(h, 1.2); });
    }
    them(d + 1, 2); them(d - 1, 2); them(d + 2, 1); them(d - 2, 1);
    return ds.filter(function (x) { return x.v > 0 || ct.hoi === 'hon' || ct.hoi === 'kem'; });
  }

  function taoNhieuDL(kyNang, ct, rng) {
    const d = tinhDL(ct);
    if (!HOI_SO[ct.hoi]) {
      const ds = ct.ten.filter(function (k, i) { return k !== d && !(ct.hoi === 'bang' && i === ct.a); });
      return tron(rng, ds).map(function (v) { return { gia_tri: v, loi: nhanBietLoiDL(ct, v) }; });
    }
    const ung = ungVienSo(ct).filter(function (x) { return x.v > 0; });
    const ra = [];
    if (ung.length) {
      const x = NH.chonTheoTrongSo(rng, ung);
      ra.push(x.v);
      const ma1 = nhanBietLoiDL(ct, x.v)[0];
      let con = ung.filter(function (y) { return y.v !== x.v; });
      const khacMa = con.filter(function (y) { return nhanBietLoiDL(ct, y.v)[0] !== ma1; });
      if (khacMa.length && rng() < 0.7) con = khacMa;
      if (con.length) ra.push(NH.chonTheoTrongSo(rng, con).v);
    }
    for (let k = 3; ra.length < 2 && k < 20; k++) [d + k, d - k].forEach(function (v) { if (ra.length < 2 && v > 0 && ra.indexOf(v) < 0) ra.push(v); });
    return ra.map(function (v) { return { gia_tri: v, loi: nhanBietLoiDL(ct, v) }; });
  }

  function hienDL(v, ct) {
    if (typeof v === 'string' && LOAI_CA[v]) return tenCa(v);
    return String(v);
  }
  function veLuaChonDL(ct, v) {
    if (typeof v === 'string' && LOAI_CA[v]) return { nhan: nhanCa(v), hinh: caNho(v) };
    return { nhan: String(v) };
  }

  const IMPL_DL = {
    tinh: tinhDL, de: deDL, deDoc: deDocDL, deChuanHoa: maDL, nhanBietLoi: nhanBietLoiDL, loiNoi: loiNoiDL,
    goiY: goiYDL, loiGiai: loiGiaiDL, ketLuan: ketLuanDL, taoNhieu: taoNhieuDL, hienGiaTri: hienDL, veLuaChon: veLuaChonDL,
    theChu: function (ct) { return deDL(ct); },
    dang: 'chon_dap_an'
  };
  NH.dangKyLoai('kiem_dem', Object.assign({}, IMPL_DL, { veHinh: function (ct) { return veHo(ct); } }));
  NH.dangKyLoai('bieu_do', Object.assign({}, IMPL_DL, { veHinh: function (ct) { return veBieuDo(ct); } }));

  /* ---------------- Sinh số liệu ---------------- */

  function chonKieu(rng, muc, macDinh) {
    const ds = muc && muc.cach && muc.cach.length ? muc.cach : macDinh;
    return chon(rng, ds);
  }

  /** Các câu hỏi được trên một bộ số liệu (dùng để sinh và để ghép nhiều câu vào một lượt chơi). */
  function cacCauDL(loai, ten, so, hg) {
    const ra = [];
    const mk = function (hoi, a, b) {
      const ct = { loai: loai, hoi: hoi };
      if (a != null) ct.a = a;
      if (b != null) ct.b = b;
      ct.ten = ten.slice(); ct.so = so.slice(); ct.hg = hg;
      ra.push(ct);
    };
    ten.forEach(function (k, i) { mk('dem', i); });
    if (duyNhat(so, Math.max.apply(null, so))) mk('nhieu');
    if (duyNhat(so, Math.min.apply(null, so))) mk('it');
    mk('tong');
    if (loai === 'bieu_do') {
      for (let i = 0; i < so.length; i++) for (let j = 0; j < so.length; j++) {
        if (i === j || so[i] === so[j]) continue;
        mk(so[i] > so[j] ? 'hon' : 'kem', i, j);
      }
      // "Số búp bê bằng số thú bông loại nào?": 4 hàng, đúng một cặp hàng dài bằng nhau
      if (so.length === 4 && new Set(so).size === 3) so.forEach(function (x, i) {
        if (so.filter(function (y) { return y === x; }).length === 2) mk('bang', i);
      });
    }
    return ra;
  }

  /** Số liệu n loại, mỗi loại 2 đến `lon` con; nhiều nhất một cặp loại bằng nhau (thường thì khác nhau hết). */
  function sinhSoLieu(rng, n, lon, tongToiDa) {
    const khacHet = rng() < 0.65;
    for (let thu = 0; thu < 400; thu++) {
      const ten = tron(rng, THU_TU_CA).slice(0, n);
      const so = ten.map(function () { return nn(rng, 2, lon); });
      const soKhac = new Set(so).size;
      if (tong(so) > tongToiDa || soKhac < n - 1 || (khacHet && thu < 200 && soKhac < n)) continue;
      return { ten: ten, so: so };
    }
    return { ten: ['vang', 'xanh', 'do'].slice(0, n), so: [5, 3, 7, 4].slice(0, n) };
  }

  /** Kiểm đếm (Bài 64): 3 loại, mỗi loại 2 đến 8 con (4 loại thì 2 đến 6), cả hồ không quá 18 con để bé câu hết. */
  function sinhKiemDem(rng, muc) {
    const hoi = chonKieu(rng, muc, ['dem', 'dem', 'dem', 'nhieu', 'it', 'tong', 'tong']);
    for (let thu = 0; thu < 300; thu++) {
      const n = rng() < 0.25 ? 4 : 3;
      const d = sinhSoLieu(rng, n, n === 4 ? 6 : 8, 18);
      const hg = nn(rng, 1, 9999);
      const ds = cacCauDL('kiem_dem', d.ten, d.so, hg).filter(function (c) { return c.hoi === hoi; });
      if (ds.length) return chon(rng, ds);
    }
    return { loai: 'kiem_dem', hoi: 'tong', ten: ['vang', 'xanh', 'do'], so: [5, 3, 7], hg: 1 };
  }

  /** Biểu đồ tranh (Bài 65): 3 hoặc 4 hàng, mỗi hàng 2 đến 10 hình (4 hàng thì tới 8), cả biểu đồ không quá 26 hình. */
  function sinhBieuDo(rng, muc) {
    const hoi = chonKieu(rng, muc, ['dem', 'dem', 'nhieu', 'it', 'hon', 'hon', 'kem', 'tong', 'bang']);
    for (let thu = 0; thu < 400; thu++) {
      const n = hoi === 'bang' ? 4 : rng() < 0.3 ? 4 : 3;
      let d;
      if (hoi === 'bang') {
        // đúng một cặp hàng dài bằng nhau như SGK (số búp bê bằng số sóc bông); một hàng khác chỉ lệch 1, 2 hình
        // để lựa chọn nhiễu mang lỗi dem-sot
        const ten = tron(rng, THU_TU_CA);
        const x = nn(rng, 3, 7);
        const gan = chon(rng, [x - 2, x - 1, x + 1, x + 2].filter(function (v) { return v >= 2 && v <= 8; }));
        const xa = chon(rng, [2, 3, 4, 5, 6, 7, 8].filter(function (v) { return v !== x && v !== gan; }));
        d = { ten: ten, so: tron(rng, [x, x, gan, xa]) };
        if (tong(d.so) > 26) continue;
      } else d = sinhSoLieu(rng, n, n === 4 ? 8 : 10, 26);
      const hg = nn(rng, 1, 9999);
      let ds = cacCauDL('bieu_do', d.ten, d.so, hg).filter(function (c) { return c.hoi === hoi; });
      // Hơn, kém: tránh hiệu trùng một trong hai số để lỗi nham-hon-kem nhận ra được
      if (hoi === 'hon' || hoi === 'kem') {
        const tot = ds.filter(function (c) { const h = Math.abs(c.so[c.a] - c.so[c.b]); return h !== c.so[c.a] && h !== c.so[c.b]; });
        if (tot.length) ds = tot;
      }
      if (ds.length) return chon(rng, ds);
    }
    return { loai: 'bieu_do', hoi: 'tong', ten: ['vang', 'xanh', 'do'], so: [6, 4, 7], hg: 1 };
  }

  NH.themLoi('dem-sot', { be: 'Con đếm sót hoặc đếm lặp rồi', mo_ta: 'Đếm lệch 1 hoặc 2 so với số thật (bỏ sót vài con hoặc đếm một con hai lần); hoặc chọn loại có số con lệch không quá 2 so với loại đúng', ngan: 'Con hay đếm sót' });
  NH.themLoi('doc-nham-hang', { be: 'Con đọc nhầm sang hàng khác rồi', mo_ta: 'Trả lời bằng số con của một loại khác (một hàng khác của biểu đồ tranh), hoặc so nhầm hai hàng khác', ngan: 'Con hay đọc nhầm hàng' });
  NH.themLoi('nham-hon-kem', { be: 'Hỏi nhiều hơn mấy con thì lấy số lớn trừ số bé', mo_ta: 'Hỏi hai loại hơn, kém nhau bao nhiêu nhưng trả lời một trong hai số hoặc tổng hai số thay vì hiệu', ngan: 'Con hay nhầm câu hỏi hơn kém' });
  NH.themLoi('sot-loai', { be: 'Con quên cộng một loại rồi', mo_ta: 'Tính tất cả bao nhiêu con mà bỏ quên số con của một loại', ngan: 'Con hay quên một loại khi cộng' });
  NH.themLoi('nham-nhieu-it', { be: 'Đề hỏi nhiều nhất hay ít nhất, con đọc lại nhé', mo_ta: 'Hỏi loại nhiều nhất mà chọn loại ít nhất, hoặc ngược lại', ngan: 'Con hay nhầm nhiều nhất, ít nhất' });
  NH.themLoi('nham-kha-nang', { be: 'Con nhìn lại trong hộp có những gì nhé', mo_ta: 'Nhầm giữa chắc chắn, có thể và không thể (trường loai_nham của tra_loi ghi khả năng đúng và khả năng bé chọn)', ngan: 'Con hay nhầm chắc chắn, có thể, không thể' });

  NH.themKyNang('kiem-dem', { noi_dung: 'C2.1', ten: 'Thu thập, phân loại, kiểm đếm', kieu: 'K3', giay: 12, gioi_han: 30, loai: 'kiem_dem', sinh: sinhKiemDem });
  NH.themKyNang('bieu-do-tranh', { noi_dung: 'C2.2', ten: 'Đọc biểu đồ tranh', kieu: 'K3', giay: 12, gioi_han: 40, loai: 'bieu_do', sinh: sinhBieuDo });

  /* ============================================================
     Loại 'kha_nang': { vat: 'bong'|'ca', lay: 1|2, su: 'la'|'ca_hai'|'it_nhat', m: màu của sự kiện, mau: [...], so: [...] }
     ============================================================ */

  function demMau(ct, m) { const i = ct.mau.indexOf(m); return i < 0 ? 0 : ct.so[i]; }
  function tinhKN(ct) {
    const c = demMau(ct, ct.m), T = tong(ct.so);
    if (ct.su === 'ca_hai') return c === T ? 'chac_chan' : c < 2 ? 'khong_the' : 'co_the';
    if (ct.su === 'it_nhat') return c === 0 ? 'khong_the' : T - c <= 1 ? 'chac_chan' : 'co_the';
    return c === T ? 'chac_chan' : c === 0 ? 'khong_the' : 'co_the';
  }
  function tenVat(ct, m) { return (ct.vat === 'ca' ? 'cá ' : 'bóng ') + MAU_BONG[m].ten; }
  function donVi(ct) { return ct.vat === 'ca' ? 'con' : 'quả'; }
  function moTaHop(ct) {
    return ct.mau.map(function (m, i) { return ct.so[i] + ' ' + (ct.vat === 'ca' ? 'con ' : 'quả ') + tenVat(ct, m); }).join(', ');
  }
  /** Câu sự kiện: "được bóng xanh", "cả 2 quả đều là bóng xanh", "có ít nhất 1 quả bóng xanh". */
  function suKien(ct) {
    const v = tenVat(ct, ct.m);
    if (ct.su === 'ca_hai') return 'cả 2 ' + donVi(ct) + ' đều là ' + v;
    if (ct.su === 'it_nhat') return 'có ít nhất 1 ' + donVi(ct) + ' ' + v;
    return 'được ' + v;
  }
  function deKN(ct) {
    const lay = (ct.vat === 'ca' ? 'Bắt ra ' : 'Lấy ra ') + ct.lay + ' ' + donVi(ct);
    return lay + ', ' + suKien(ct) + '. Chắc chắn, có thể hay không thể?';
  }
  function deDocKN(ct) {
    return (ct.vat === 'ca' ? 'Trong xô có ' : 'Trong hộp có ') + moTaHop(ct) + '. Không nhìn vào ' + (ct.vat === 'ca' ? 'xô' : 'hộp') + ', ' +
      (ct.vat === 'ca' ? 'bắt ra ' : 'lấy ra ') + ct.lay + ' ' + donVi(ct) + '. Khả năng ' + suKien(ct) + ' là chắc chắn, có thể hay không thể?';
  }
  /** Câu như SGK Bài 66 để game điền từ: "Gai Long … lấy được bóng xanh." (lấy 1) hoặc câu sự kiện (lấy 2, Bài 74). */
  function cauSGK(ct, ai) {
    if (ct.lay === 1) return { truoc: (ai || 'Gai Long') + ' ', sau: ' ' + (ct.vat === 'ca' ? 'bắt được ' : 'lấy được ') + tenVat(ct, ct.m) + '.' };
    const ra = ct.vat === 'ca' ? ' bắt ra' : ' lấy ra';
    if (ct.su === 'ca_hai') return { truoc: '', sau: 'Cả 2 ' + donVi(ct) + ra + ' đều là ' + tenVat(ct, ct.m) + '.' };
    return { truoc: '', sau: 'Trong 2 ' + donVi(ct) + ra + ' có ít nhất 1 ' + donVi(ct) + ' ' + tenVat(ct, ct.m) + '.' };
  }
  function maKN(ct) {
    return ct.vat + '-lay' + ct.lay + '-' + ct.su + '-' + ct.m + ':' + ct.mau.map(function (m, i) { return m + ct.so[i]; }).join(',');
  }
  /** Vì sao đúng là khả năng đó (lời giải thích dùng cho bé và phụ huynh). */
  function lyDoKN(ct) {
    const d = tinhKN(ct), c = demMau(ct, ct.m), T = tong(ct.so);
    const v = tenVat(ct, ct.m), dv = donVi(ct), trong = ct.vat === 'ca' ? 'Trong xô' : 'Trong hộp';
    const khac = T - c;
    if (d === 'khong_the' && c === 0) return trong + ' không có ' + v + ' nào';
    if (ct.su === 'la') {
      if (d === 'chac_chan') return trong + ' chỉ có ' + v + ', lấy ' + dv + ' nào cũng là ' + v;
      return trong + ' có ' + c + ' ' + dv + ' ' + v + ' và ' + khac + ' ' + dv + ' màu khác: có lúc được ' + v + ', có lúc không';
    }
    if (ct.su === 'ca_hai') {
      if (d === 'chac_chan') return trong + ' chỉ có ' + v + ', 2 ' + dv + ' lấy ra đều là ' + v;
      if (d === 'khong_the') return trong + ' chỉ có 1 ' + dv + ' ' + v + ', không đủ 2 ' + dv;
      return trong + ' có ' + c + ' ' + dv + ' ' + v + ' nên có thể lấy được 2 ' + dv + ' ' + v + ', nhưng cũng có thể lấy phải ' + dv + ' màu khác';
    }
    if (d === 'chac_chan') return khac ? trong + ' chỉ có ' + khac + ' ' + dv + ' màu khác, nên trong 2 ' + dv + ' lấy ra luôn có ' + v : trong + ' chỉ có ' + v;
    return trong + ' có ' + khac + ' ' + dv + ' màu khác, có thể cả 2 ' + dv + ' lấy ra đều không phải ' + v;
  }
  function nhanBietLoiKN(ct, v) {
    const x = String(v == null ? '' : v);
    if (!KHA_NANG[x]) return ['khac'];
    return x === tinhKN(ct) ? [] : ['nham-kha-nang'];
  }
  function goiYKN(ct) {
    const trong = ct.vat === 'ca' ? 'xô' : 'hộp';
    const v = tenVat(ct, ct.m);
    return [
      'Chắc chắn: lần nào cũng xảy ra. Có thể: có lúc xảy ra, có lúc không. Không thể: không bao giờ xảy ra.',
      ct.su === 'la' ? 'Trong ' + trong + ' có ' + v + ' không? Có màu nào khác nữa không?' :
        ct.su === 'ca_hai' ? 'Trong ' + trong + ' có đủ 2 ' + donVi(ct) + ' ' + v + ' không? Có màu khác không?' :
          'Nếu lấy phải 2 ' + donVi(ct) + ' màu khác thì sao? Có đủ 2 ' + donVi(ct) + ' màu khác không?',
      'Nhìn kĩ: trong ' + trong + ' có ' + moTaHop(ct) + (demMau(ct, ct.m) ? '' : ', không có ' + v + ' nào') + '.'
    ];
  }
  function loiGiaiKN(ct) {
    const d = tinhKN(ct);
    return { ma: 'kha-nang', buoc: [(ct.vat === 'ca' ? 'Xô có ' : 'Hộp có ') + moTaHop(ct), lyDoKN(ct)], html: veHop(ct, { sang: ct.m }), kq: d };
  }
  function ketLuanKN(ct) {
    const d = tinhKN(ct);
    if (ct.lay === 1) return 'Vậy Gai Long ' + KHA_NANG[d] + ' ' + (ct.vat === 'ca' ? 'bắt được ' : 'lấy được ') + tenVat(ct, ct.m) + '.';
    return 'Vậy khả năng ' + suKien(ct) + ' là ' + KHA_NANG[d] + '.';
  }
  function taoNhieuKN(kyNang, ct, rng) {
    const d = tinhKN(ct);
    return tron(rng, Object.keys(KHA_NANG).filter(function (x) { return x !== d; })).map(function (v) { return { gia_tri: v, loi: nhanBietLoiKN(ct, v) }; });
  }

  NH.dangKyLoai('kha_nang', {
    tinh: tinhKN, de: deKN, deDoc: deDocKN, deChuanHoa: maKN, nhanBietLoi: nhanBietLoiKN,
    loiNoi: function (ct, v, maLoi) { return maLoi && maLoi[0] === 'nham-kha-nang' ? Y_NGHIA_KN[tinhKN(ct)] : 'Chưa đúng rồi'; },
    goiY: goiYKN, loiGiai: loiGiaiKN, ketLuan: ketLuanKN, taoNhieu: taoNhieuKN,
    hienGiaTri: function (v) { return KHA_NANG[v] || String(v); },
    veLuaChon: function (ct, v) { return { nhan: KHA_NANG_NHAN[v] || String(v) }; },
    theChu: function (ct) { return hoa(suKien(ct)); },
    veHinh: function (ct) { return veHop(ct); },
    dang: 'chon_dap_an'
  });

  /** Hộp bóng: chọn khả năng đích trước (ba khả năng đều nhau) rồi dựng hộp và sự kiện cho khớp; tối đa 6 quả. */
  function sinhKhaNang(rng, muc) {
    const cach = muc && muc.cach && muc.cach.length ? muc.cach : null;
    for (let thu = 0; thu < 400; thu++) {
      const lay = cach ? (chon(rng, cach) === 'lay2' ? 2 : 1) : rng() < 0.62 ? 1 : 2;
      const dich = chon(rng, ['chac_chan', 'co_the', 'khong_the']);
      const vat = rng() < 0.72 ? 'bong' : 'ca';
      const mau = tron(rng, THU_TU_MAU);
      const m = mau[0], o1 = mau[1], o2 = mau[2];
      let hop, su = 'la';
      if (lay === 1) {
        if (dich === 'chac_chan') hop = [[m, nn(rng, 2, 5)]];
        else if (dich === 'co_the') { hop = [[m, nn(rng, 1, 3)], [o1, nn(rng, 1, 3)]]; if (rng() < 0.3) hop.push([o2, nn(rng, 1, 2)]); }
        else hop = rng() < 0.5 ? [[o1, nn(rng, 2, 5)]] : [[o1, nn(rng, 1, 3)], [o2, nn(rng, 1, 3)]];
      } else {
        su = rng() < 0.5 ? 'ca_hai' : 'it_nhat';
        if (su === 'ca_hai') {
          if (dich === 'chac_chan') hop = [[m, nn(rng, 3, 5)]];
          else if (dich === 'co_the') hop = [[m, nn(rng, 2, 3)], [o1, nn(rng, 1, 3)]];
          else hop = rng() < 0.65 ? [[m, 1], [o1, nn(rng, 2, 3)]] : [[o1, nn(rng, 2, 3)], [o2, nn(rng, 1, 2)]];
        } else {
          if (dich === 'chac_chan') hop = rng() < 0.75 ? [[m, nn(rng, 2, 3)], [o1, 1]] : [[m, nn(rng, 3, 4)]];
          else if (dich === 'co_the') hop = [[m, nn(rng, 1, 2)], [o1, nn(rng, 2, 3)]];
          else hop = [[o1, nn(rng, 2, 3)], [o2, nn(rng, 1, 2)]];
        }
      }
      hop.sort(function (x, y) { return THU_TU_MAU.indexOf(x[0]) - THU_TU_MAU.indexOf(y[0]); });
      const T = tong(hop.map(function (x) { return x[1]; }));
      if (T > 6 || (lay === 2 && T < 3)) continue;
      const ct = { loai: 'kha_nang', vat: vat, lay: lay, su: su, m: m, mau: hop.map(function (x) { return x[0]; }), so: hop.map(function (x) { return x[1]; }) };
      if (tinhKN(ct) === dich) return ct;
    }
    return { loai: 'kha_nang', vat: 'bong', lay: 1, su: 'la', m: 'xanh', mau: ['xanh', 'do'], so: [1, 3] };
  }
  NH.themKyNang('kha-nang', { noi_dung: 'C2.3', ten: 'Chắc chắn, có thể, không thể', kieu: 'K3', giay: 10, gioi_han: 10, loai: 'kha_nang', sinh: sinhKhaNang });

  /** Các câu hỏi được trên cùng một hộp (cùng số quả lấy ra), để một hộp dùng cho vài câu như SGK Bài 74. */
  function cacCauKN(ct) {
    const ra = [];
    const dsSu = ct.lay === 1 ? ['la'] : ['ca_hai', 'it_nhat'];
    dsSu.forEach(function (su) {
      THU_TU_MAU.forEach(function (m) {
        const c = { loai: 'kha_nang', vat: ct.vat, lay: ct.lay, su: su, m: m, mau: ct.mau.slice(), so: ct.so.slice() };
        ra.push(c);
      });
    });
    return ra;
  }

  /* ============================================================
     Loại 'uoc_luong': { vat: 'ca'|'qua', n, hg } (03a mục 2.7), đáp án là số tròn chục gần nhất
     ============================================================ */

  function tinhUL(ct) { return Math.round(ct.n / 10) * 10; }
  function tenUL(ct) { return ct.vat === 'qua' ? 'quả mọng' : 'con cá'; }
  function nhanBietLoiUL(ct, v) {
    const x = Number(v);
    const d = tinhUL(ct);
    if (!Number.isFinite(x)) return ['khac'];
    if (x === d) return [];
    if (Math.abs(x - d) === 10) return ['dem-nhom'];
    return ['khac'];
  }
  function taoNhieuUL(kyNang, ct, rng) {
    const d = tinhUL(ct);
    const hop = function (v) { return v >= 10 && v <= 70; };
    const c10 = [d - 10, d + 10].filter(hop), c20 = [d - 20, d + 20].filter(hop);
    // Ba mức liền nhau, đáp án đúng khi ở giữa, khi ở đầu, khi ở cuối (bé không đoán được theo vị trí);
    // luôn có mức lệch đúng 1 chục (dem-nhom)
    const kieu = [[d - 10, d + 10], [d + 10, d + 20], [d - 20, d - 10]].filter(function (p) { return p.every(hop); });
    const ra = kieu.length ? chon(rng, kieu).slice() : c10.concat(c20).slice(0, 2);
    return tron(rng, ra).map(function (v) { return { gia_tri: v, loi: nhanBietLoiUL(ct, v) }; });
  }
  function goiYUL(ct) {
    const d = nhomDan(ct.n);
    return [
      'Mỗi vòng có khoảng 10 ' + tenUL(ct) + '.',
      'Đếm số vòng: mỗi vòng là 1 chục.',
      'Có ' + d.nhom.length + ' vòng, tức là khoảng ' + d.nhom.length + ' chục.'
    ];
  }
  function loiGiaiUL(ct) {
    const d = nhomDan(ct.n), k = d.nhom.length, dd = tinhUL(ct);
    const dem = [];
    for (let i = 1; i <= k; i++) dem.push(i * 10);
    const buoc = ['Có ' + k + ' vòng, đếm theo chục: ' + dem.join(', ')];
    if (d.le) buoc.push('Thêm ' + d.le + ' ' + tenUL(ct) + ' lẻ: tất cả ' + ct.n + ' ' + tenUL(ct));
    else if (ct.n !== dd) buoc.push('Vòng cuối thiếu ' + (dd - ct.n) + ' ' + (ct.vat === 'qua' ? 'quả' : 'con') + ': tất cả ' + ct.n + ' ' + tenUL(ct));
    buoc.push(ct.n === dd ? 'Tất cả ' + ct.n + ' ' + tenUL(ct) + ': vừa đúng ' + k + ' chục' : ct.n + ' gần ' + dd + ' nhất: khoảng ' + k + ' chục, tức là khoảng ' + dd);
    return { ma: 'uoc-luong-chuc', buoc: buoc, html: veDan(ct, { nhan: true }), kq: dd };
  }

  NH.dangKyLoai('uoc_luong', {
    tinh: tinhUL,
    de: function (ct) { return ct.vat === 'qua' ? 'Có khoảng bao nhiêu quả mọng?' : 'Đàn cá có khoảng bao nhiêu con?'; },
    deDoc: function (ct) { return 'Nhìn nhanh rồi ước lượng. ' + (ct.vat === 'qua' ? 'Có khoảng bao nhiêu quả mọng?' : 'Đàn cá có khoảng bao nhiêu con?'); },
    deChuanHoa: function (ct) { return ct.vat + ':' + ct.n; },
    nhanBietLoi: nhanBietLoiUL,
    loiNoi: function (ct, v, maLoi) {
      const m = (maLoi && maLoi[0]) || 'khac';
      if (m === 'dem-nhom') return 'Mỗi vòng có 10 ' + (ct.vat === 'qua' ? 'quả' : 'con') + '. Con đếm lại số vòng nhé';
      return 'Con ước lượng theo nhóm 10 nhé: mỗi vòng là 1 chục';
    },
    goiY: goiYUL, loiGiai: loiGiaiUL,
    ketLuan: function (ct) { return 'Vậy có khoảng ' + tinhUL(ct) + ' ' + tenUL(ct) + '.'; },
    taoNhieu: taoNhieuUL,
    hienGiaTri: function (v) { return 'khoảng ' + v; },
    veLuaChon: function (ct, v) { return { nhan: 'Khoảng ' + v }; },
    theChu: function (ct) { return 'Khoảng mấy chục ' + tenUL(ct) + '?'; },
    veHinh: function (ct) { return veDan(ct, { mo: true }); },
    dang: 'chon_dap_an'
  });

  /** 20 đến 60 đồ vật, chỉ lấy số cách số tròn chục không quá 3 (03a mục 2.7) để đáp án không gây tranh cãi. */
  function sinhUocLuong(rng) {
    const chuc = nn(rng, 2, 6);
    let lech = 0;
    for (let thu = 0; thu < 50; thu++) { lech = nn(rng, -3, 3); const n = chuc * 10 + lech; if (n >= 20 && n <= 60) break; }
    const n = Math.max(20, Math.min(60, chuc * 10 + lech));
    return { loai: 'uoc_luong', vat: rng() < 0.7 ? 'ca' : 'qua', n: n, hg: nn(rng, 1, 9999) };
  }
  NH.themKyNang('uoc-luong-chuc', { noi_dung: '2.7', ten: 'Ước lượng số đồ vật theo nhóm chục', kieu: 'K3', giay: 6, gioi_han: 70, loai: 'uoc_luong', sinh: sinhUocLuong });

  /* ============================================================
     Ghép câu vào một lượt chơi: một lần câu cá (một hộp bóng) dùng cho 2, 3 câu hỏi liền nhau
     ============================================================ */

  /**
   * Câu mới trên số liệu của ctGoc (cùng hồ cá, cùng hộp bóng) cho câu kế tiếp của lượt.
   * Giữ kiểu hỏi của ctMoi nếu lượt chưa hỏi kiểu đó, không thì chọn một kiểu hỏi lượt chưa có (đủ loại câu như SGK:
   * mỗi loại mấy con, nhiều nhất, hơn kém…). daLuot: các ct đã hỏi trong lượt; daVan: đã hỏi trong cả ván (không lặp).
   */
  function ghepDuLieu(ctMoi, ctGoc, daLuot, rng, cach, daVan) {
    if (!ctMoi || !ctGoc || ctMoi.loai !== ctGoc.loai || ctMoi.loai === 'uoc_luong') return null;
    const impl = ctGoc.loai;
    daLuot = daLuot || [];
    // "Cá vàng nhiều hơn cá xanh mấy con" và "cá xanh ít hơn cá vàng mấy con" là cùng một phép so: coi như đã hỏi
    const khoa = function (c) { return (c.hoi === 'hon' || c.hoi === 'kem') ? 'hk-' + Math.min(c.a, c.b) + '-' + Math.max(c.a, c.b) + ':' + c.ten.join(',') + ':' + c.so.join(',') : NH.deChuanHoa(c); };
    const daMa = daLuot.concat(daVan || []).map(khoa);
    let ung = impl === 'kha_nang' ? cacCauKN(ctGoc) : cacCauDL(ctGoc.loai, ctGoc.ten, ctGoc.so, ctGoc.hg);
    ung = ung.filter(function (c) { return daMa.indexOf(khoa(c)) < 0; });
    if (cach && cach.length && impl !== 'kha_nang') ung = ung.filter(function (c) { return cach.indexOf(c.hoi) >= 0; });
    if (!ung.length) return null;
    if (impl === 'kha_nang') {
      // Một hộp, nhiều khả năng khác nhau: ưu tiên đáp án chưa gặp trong lượt, rồi cùng kiểu sự kiện
      const daCo = daLuot.map(tinhKN);
      const moi = ung.filter(function (c) { return daCo.indexOf(tinhKN(c)) < 0; });
      if (moi.length) ung = moi;
      const cung = ung.filter(function (c) { return c.su === ctMoi.su; });
      return chon(rng, cung.length ? cung : ung);
    }
    const daHoi = daLuot.map(function (c) { return c.hoi; });
    const kieu = [];
    ung.forEach(function (c) { if (kieu.indexOf(c.hoi) < 0) kieu.push(c.hoi); });
    let h = ctMoi.hoi;
    if (kieu.indexOf(h) < 0 || daHoi.indexOf(h) >= 0) {
      const chua = kieu.filter(function (x) { return daHoi.indexOf(x) < 0; });
      h = chon(rng, chua.length ? chua : kieu);
    }
    return chon(rng, ung.filter(function (c) { return c.hoi === h; }));
  }

  /**
   * Lấy câu kế tiếp của ván cho một lượt chơi (chưa hiện, chưa ghi cau_hien).
   * vong: { ky_nang, ct, da: [ct đã hỏi], so } hoặc null; toiDa: số câu tối đa của một lượt.
   * o: { dangCua(ct, dangMuc) → dạng câu trong game, cach(kyNang) → kiểu hỏi được phép,
   *      daHoi: [ct đã hỏi trong cả ván] (không ghép lại câu đã hỏi ở lượt trước trên cùng số liệu) }.
   * Câu quay lại (sai trong ván, nợ hôm trước) luôn mở lượt mới với số liệu của chính nó.
   * Trả về { q, vongMoi } hoặc null khi hết câu.
   */
  function cauKeTiep(van, vong, toiDa, o) {
    o = o || {};
    const muc = van._layMuc();
    if (!muc) return null;
    let moi = true;
    if (vong && !muc.on_lai_cua && muc.ky_nang === vong.ky_nang && vong.so < toiDa) {
      const ct = ghepDuLieu(muc.cau_truc, vong.ct, vong.da, van.rng, o.cach ? o.cach(muc.ky_nang) : null, o.daHoi);
      if (ct) { muc.cau_truc = ct; moi = false; }
    }
    if (o.dangCua) muc.dang = o.dangCua(muc.cau_truc, muc.dang);
    return { q: van._taoQ(muc), vongMoi: moi };
  }

  /** Lấy thử khả năng (bốc thăm cho vui, không dùng rng của ván): mỗi lần là 1 hoặc 2 màu, có xảy ra không. */
  function bocThu(ct, soLan, hatGiong) {
    const rng = NH.taoRng(hatGiong || 7);
    const tui = bongTrongHop(ct);
    const coXayRa = function (ra) {
      const c = ra.filter(function (m) { return m === ct.m; }).length;
      if (ct.su === 'ca_hai') return c === 2;
      if (ct.su === 'it_nhat') return c >= 1;
      return c === 1;
    };
    const mot = function () {
      const idx = tron(rng, tui.map(function (x, i) { return i; })).slice(0, ct.lay);
      const ra = idx.map(function (i) { return tui[i]; });
      return { mau: ra, xay_ra: coXayRa(ra) };
    };
    let ds = [];
    for (let thu = 0; thu < 60; thu++) {
      ds = [];
      for (let i = 0; i < soLan; i++) ds.push(mot());
      // "Có thể": cho bé thấy cả lần xảy ra lẫn lần không xảy ra
      if (tinhKN(ct) !== 'co_the' || (ds.some(function (x) { return x.xay_ra; }) && ds.some(function (x) { return !x.xay_ra; }))) break;
    }
    return ds;
  }

  window.CauThongKe = {
    LOAI_CA: LOAI_CA,
    MAU_BONG: MAU_BONG,
    KHA_NANG: KHA_NANG,
    KHA_NANG_NHAN: KHA_NANG_NHAN,
    tenCa: tenCa,
    nhanCa: nhanCa,
    laSo: laSo,
    hinhCa: hinhCa,
    caNho: caNho,
    hinhBong: hinhBong,
    bongNho: bongNho,
    hinhQua: hinhQua,
    veHo: veHo,
    veGio: veGio,
    veBieuDo: veBieuDo,
    tieuDeBieuDo: tieuDeBieuDo,
    veHop: veHop,
    veDan: veDan,
    nhomDan: nhomDan,
    viTriRai: viTriRai,
    bongTrongHop: bongTrongHop,
    cauSGK: cauSGK,
    suKien: suKien,
    lyDoKN: lyDoKN,
    tinhKN: tinhKN,
    moTaHop: moTaHop,
    cacCauDL: cacCauDL,
    cacCauKN: cacCauKN,
    ghepDuLieu: ghepDuLieu,
    cauKeTiep: cauKeTiep,
    bocThu: bocThu
  };
})();
