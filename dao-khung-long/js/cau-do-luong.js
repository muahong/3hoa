/* ============================================================
   cau-do-luong.js – Câu hỏi đo lường (vùng 3 Xưởng Đo Lường, dùng được ở mọi game của đảo)
   Năm loại câu cắm vào NganHang.dangKyLoai (trường kieu là kiểu câu con, muc.cach chọn kiểu):
   - 'nang_nhe' (B2.9, Bài 15, 17, 18, 35): so_sanh (đọc cân đĩa lệch hay thăng bằng), thu_tu (hai cân, con nào
     nặng nhất), doi_qua (quả cam nặng bằng mấy quả chanh), cong_qua (bưởi = cam + táo), bac_cau (chó = 2 thỏ, thỏ = 2 gà).
   - 'can_kg' (B2.9, Bài 15, 35, 73): can (kéo quả cân 1, 2, 5 kg cho cân thăng bằng), tru (đĩa có đồ vật còn có quả cân),
     so_sanh (ba hộp, hộp nào nặng nhất), tinh (5 kg + 4 kg).
   - 'rot_lit' (B2.10, Bài 16, 17, 35): rot (rót ca 1 l cho đầy), vach (rót tới vạch), doc (đọc vạch lít),
     so_sanh (bình nào nhiều nước hơn, nhiều hơn mấy cốc), tong (ca 1 l, 2 l, 5 l), tinh (8 l + 6 l), don_vi (l hay kg).
   - 'don_vi_dai' (B2.6, Bài 55, 58, 73): chon_don_vi (cm, dm, m, km), doi (4 dm = ? cm), so_sanh (1 m ? 90 cm), tinh.
   - 'do_dai' (B2.7, Bài 25, 34, 57): do (đặt thước từ vạch 0), lech (đồ vật không bắt đầu ở vạch 0), noi_tiep (thước 2 dm).
   Lỗi mới (03a mục 3.3, công thức trên đáp án của bé): ben-thap-nhe, can-thang-bang, chi-mot-can, dem-qua-can,
   thieu-qua-can, quen-can-cung-dia, dem-so-ca, doc-sai-vach, dem-vach, cao-hon-nhieu-hon, nham-don-vi, doi-don-vi,
   quen-doi-don-vi, do-tu-1, dem-so-lan; dùng lại dem-lech, nham-dau, quen-nho, quen-muon, chieu-dau, khac.
   Hình minh họa là SVG tự vẽ (cân đĩa, quả cân, bình có vạch lít, ca 1 l, thước xăng-ti-mét), đồ vật là emoji.
   API: window.CauDoLuong (dữ liệu và hàm vẽ dùng chung với game xuong-do-luong.js)
   ============================================================ */
(function () {
  'use strict';

  const NH = window.NganHang;
  const nn = NH.nn, chon = NH.chon, tron = NH.tron;
  const FONT = 'Baloo 2, Arial Rounded MT Bold, sans-serif';
  const FONT_EMOJI = 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif';
  const TRU = '−';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function hoa(s) { s = String(s); return s.charAt(0).toUpperCase() + s.slice(1); }
  function dau(a, b) { return a < b ? '<' : a > b ? '>' : '='; }
  function tong(ds) { return ds.reduce(function (t, x) { return t + x; }, 0); }
  function giam(a, b) { return b - a; }
  function r1(x) { return Math.round(x * 10) / 10; }
  /** Số theo SGK: 1 000 có khoảng trắng ngăn hàng nghìn. */
  function hienSo(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function soNguyen(v) {
    if (typeof v === 'number') return v;
    const t = String(v == null ? '' : v).replace(/\s+/g, '');
    return /^-?\d+$/.test(t) ? Number(t) : NaN;
  }
  function chonMuc(rng, muc, macDinh) {
    const ds = muc && muc.cach && muc.cach.length ? muc.cach : macDinh;
    return NH.chonTheoTrongSo(rng, ds.map(function (c) { return { c: c, w: 1 }; })).c;
  }
  function laChonDapAn(muc) { return !!(muc && (muc.dang === 'chon_dap_an' || muc.dang === 'doc_va_chon')); }

  /* ============================================================
     1. Dữ liệu
     ============================================================ */

  /** Đồ vật trên cân: tên theo SGK (có loại từ), emoji, cỡ emoji so với chuẩn, lp: loại từ khi hỏi "… nào nặng nhất". */
  const VAT = {
    gau: { ten: 'con gấu', e: '🐻', co: 1.2, lp: 'con' },
    cho: { ten: 'con chó', e: '🐕', co: 1.1, lp: 'con' },
    meo: { ten: 'con mèo', e: '🐈', co: 1, lp: 'con' },
    tho: { ten: 'con thỏ', e: '🐇', co: 1, lp: 'con' },
    ga: { ten: 'con gà', e: '🐓', co: 1, lp: 'con' },
    vit: { ten: 'con vịt', e: '🦆', co: 1, lp: 'con' },
    soc: { ten: 'con sóc', e: '🐿️', co: 0.95, lp: 'con' },
    lon: { ten: 'con lợn', e: '🐖', co: 1.15, lp: 'con' },
    de: { ten: 'con dê', e: '🐐', co: 1.15, lp: 'con' },
    dua_hau: { ten: 'quả dưa hấu', e: '🍉', co: 1.15, lp: 'quả' },
    buoi: { ten: 'quả bưởi', e: '🍈', co: 1, lp: 'quả' },
    cam: { ten: 'quả cam', e: '🍊', co: 0.9, lp: 'quả' },
    chanh: { ten: 'quả chanh', e: '🍋', co: 0.78, lp: 'quả' },
    tao: { ten: 'quả táo', e: '🍎', co: 0.9, lp: 'quả' },
    dua: { ten: 'quả dứa', e: '🍍', co: 1, lp: 'quả' },
    dua_xiem: { ten: 'quả dừa', e: '🥥', co: 1, lp: 'quả' },
    chuoi: { ten: 'nải chuối', e: '🍌', co: 1, lp: 'vật' },
    rau: { ten: 'bó rau', e: '🥬', co: 1, lp: 'vật' },
    bong_da: { ten: 'quả bóng đá', e: '⚽', co: 0.95, lp: 'vật' },
    bong_bay: { ten: 'quả bóng bay', e: '🎈', co: 0.9, lp: 'vật' },
    vo: { ten: 'quyển vở', e: '📒', co: 0.95, lp: 'vật' },
    sach: { ten: 'quyển sách', e: '📕', co: 1, lp: 'vật' },
    but: { ten: 'cái bút chì', e: '✏️', co: 0.9, lp: 'vật' },
    gau_bong: { ten: 'gấu bông', e: '🧸', co: 1.1, lp: 'đồ chơi' },
    tho_bong: { ten: 'thỏ bông', e: '🐰', co: 1, lp: 'đồ chơi' },
    soc_bong: { ten: 'sóc bông', e: '🐿️', co: 0.9, lp: 'đồ chơi' },
    hop_qua: { ten: 'hộp quà', e: '🎁', co: 1, lp: 'vật' },
    hop_sua: { ten: 'hộp sữa', e: '🥛', co: 0.95, lp: 'vật' },
    qc1: { ten: 'quả cân 1 kg', qc: 1, lp: 'vật' }
  };
  function tenSo(id, n) { return (n > 1 ? n + ' ' : '') + VAT[id].ten; }

  /** Cặp đồ vật trên cân đĩa theo SGK (Bài 15, 17, 18, 35): nang là bên nặng hơn ('a', 'b') hoặc 'bang'. */
  const CAP_CAN = [
    { a: ['dua_hau', 1], b: ['rau', 1], nang: 'a' },
    { a: ['dua_hau', 1], b: ['buoi', 2], nang: 'bang' },
    { a: ['gau', 1], b: ['cho', 3], nang: 'a' },
    { a: ['meo', 1], b: ['tho', 1], nang: 'a' },
    { a: ['cho', 1], b: ['meo', 1], nang: 'a' },
    { a: ['soc', 1], b: ['buoi', 1], nang: 'bang' },
    { a: ['qc1', 1], b: ['bong_da', 1], nang: 'a' },
    { a: ['chuoi', 1], b: ['qc1', 1], nang: 'a' },
    { a: ['buoi', 1], b: ['qc1', 1], nang: 'bang' },
    { a: ['gau_bong', 1], b: ['tho_bong', 1], nang: 'a' },
    { a: ['tho_bong', 1], b: ['soc_bong', 1], nang: 'a' },
    { a: ['vo', 1], b: ['but', 1], nang: 'a' },
    { a: ['bong_da', 1], b: ['bong_bay', 1], nang: 'a' },
    { a: ['buoi', 1], b: ['cam', 1], nang: 'a' },
    { a: ['tho', 1], b: ['ga', 2], nang: 'bang' },
    { a: ['cho', 1], b: ['tho', 2], nang: 'bang' },
    { a: ['cam', 1], b: ['chanh', 4], nang: 'bang' },
    { a: ['tao', 1], b: ['chanh', 3], nang: 'bang' },
    { a: ['tao', 1], b: ['bong_bay', 3], nang: 'a' },
    { a: ['dua_hau', 1], b: ['cam', 3], nang: 'a' },
    { a: ['dua_xiem', 1], b: ['tao', 2], nang: 'a' }
  ];
  /** Ba vật xếp từ nặng đến nhẹ (Bài 15 Hoạt động 2, Bài 35). */
  const BO_BA = [['cho', 'meo', 'tho'], ['gau_bong', 'tho_bong', 'soc_bong'], ['dua_hau', 'buoi', 'tao'], ['sach', 'vo', 'but'], ['dua_hau', 'dua_xiem', 'cam'], ['lon', 'de', 'ga']];
  /** Một vật nặng bằng mấy vật nhỏ (Bài 15 Hoạt động 3): [vật, đơn vị, ít nhất, nhiều nhất]. */
  const DOI_QUA = [['cam', 'chanh', 3, 5], ['tao', 'chanh', 2, 4], ['buoi', 'cam', 2, 4], ['dua_hau', 'buoi', 2, 3], ['tho', 'ga', 2, 3], ['cho', 'tho', 2, 3], ['dua_hau', 'cam', 4, 6], ['dua', 'cam', 2, 4]];
  /** Đồ vật đem cân bằng quả cân: [vật, kg ít nhất, kg nhiều nhất] (Bài 15, 17, 35: ngỗng 7 kg, gà 3 kg, vịt 2 kg, thỏ 3 kg). */
  const VAT_KG = [['dua_hau', 3, 6], ['dua_xiem', 1, 3], ['hop_qua', 2, 8], ['vit', 2, 3], ['ga', 2, 3], ['tho', 2, 3], ['meo', 3, 5], ['cho', 5, 10], ['lon', 8, 10], ['dua', 1, 2], ['hop_sua', 1, 1]];
  const VAT_KG_TRU = [['dua_hau', 3, 6], ['dua_xiem', 1, 3], ['hop_qua', 1, 6], ['dua', 1, 2]];

  /** Đồ đựng nước (Bài 16, 17). */
  const BINH = {
    binh: { ten: 'bình', rong: 150, cao: 230 },
    can: { ten: 'can', rong: 170, cao: 240 },
    xo: { ten: 'xô', rong: 210, cao: 210 },
    am: { ten: 'ấm', rong: 170, cao: 190 }
  };
  /** Đồ vật đo bằng lít hay ki-lô-gam (Bài 15 Hoạt động 2, Bài 16 Hoạt động 2): [mã, tên, động từ, số, đơn vị, emoji hoặc đồ đựng]. */
  const DON_VI_KL = {
    can_nuoc: { ten: 'can nước', dong: 'đựng', so: 10, dv: 'l', binh: 'can' },
    xo_nuoc: { ten: 'xô nước', dong: 'đựng', so: 5, dv: 'l', binh: 'xo' },
    binh_nuoc: { ten: 'bình nước', dong: 'đựng', so: 3, dv: 'l', binh: 'binh' },
    can_mam: { ten: 'can nước mắm', dong: 'đựng', so: 15, dv: 'l', binh: 'can', mau: '#e8a13a' },
    am_nuoc: { ten: 'ấm nước', dong: 'đựng', so: 2, dv: 'l', binh: 'am' },
    dua_hau: { ten: 'quả dưa hấu', dong: 'cân nặng', so: 3, dv: 'kg', e: '🍉' },
    ga: { ten: 'con gà', dong: 'cân nặng', so: 3, dv: 'kg', e: '🐓' },
    dua_xiem: { ten: 'quả dừa', dong: 'cân nặng', so: 2, dv: 'kg', e: '🥥' },
    vit: { ten: 'con vịt', dong: 'cân nặng', so: 2, dv: 'kg', e: '🦆' },
    hop_qua: { ten: 'hộp quà', dong: 'cân nặng', so: 5, dv: 'kg', e: '🎁' }
  };

  /** Đơn vị độ dài (Bài 55). */
  const DV = ['cm', 'dm', 'm', 'km'];
  const DV_TEN = { cm: 'xăng-ti-mét', dm: 'đề-xi-mét', m: 'mét', km: 'ki-lô-mét' };
  const DV_CM = { cm: 1, dm: 10, m: 100, km: 100000 };
  const DV_VI_DU = { cm: '1 cm cỡ bề ngang ngón tay út', dm: '1 dm cỡ một gang tay', m: '1 m cỡ một sải tay', km: '1 km là quãng đường đi bộ khá xa' };
  /** Chọn đơn vị hợp lí (Bài 55 Hoạt động 2, Bài 57, Bài 73 tiết 2 bài 1). */
  const VAT_DAI = {
    but_chi: { ten: 'cái bút chì', dong: 'dài khoảng', e: '✏️', so: [10, 15], dv: 'cm' },
    thia: { ten: 'cái thìa', dong: 'dài khoảng', e: '🥄', so: [15], dv: 'cm' },
    la: { ten: 'chiếc lá', dong: 'dài khoảng', e: '🍃', so: [8], dv: 'cm' },
    gang_tay: { ten: 'gang tay của em', dong: 'dài khoảng', e: '✋', so: [1], dv: 'dm' },
    ban_hoc: { ten: 'bàn học của Mai', dong: 'dài khoảng', e: '🪑', so: [10], dv: 'dm' },
    ban_chan: { ten: 'bàn chân của em', dong: 'dài khoảng', e: '🦶', so: [2], dv: 'dm' },
    quyen_sach: { ten: 'quyển sách Toán', dong: 'dài khoảng', e: '📘', so: [2], dv: 'dm' },
    sai_tay: { ten: 'sải tay của Việt', dong: 'dài khoảng', e: '🙆', so: [1], dv: 'm' },
    phong_hoc: { ten: 'phòng học lớp Mai', dong: 'dài khoảng', e: '🏫', so: [10], dv: 'm' },
    cot_co: { ten: 'cột cờ trường em', dong: 'cao khoảng', e: '🚩', so: [5, 8], dv: 'm' },
    xe_buyt: { ten: 'chiếc xe buýt', dong: 'dài khoảng', e: '🚌', so: [10], dv: 'm' },
    huou: { ten: 'con hươu cao cổ', dong: 'cao khoảng', e: '🦒', so: [5], dv: 'm' },
    duong_truong: { ten: 'quãng đường từ nhà Mai đến trường', dong: 'dài khoảng', e: '🎒', so: [2, 5], dv: 'km' },
    duong_tinh: { ten: 'đường từ Hà Nội đến Ninh Bình', dong: 'dài khoảng', e: '🚗', so: [54], dv: 'km' }
  };
  /** Đồ vật đo bằng thước cm (Bài 25, 27, 34, 57): tên, độ dài ít nhất và nhiều nhất (thước 0 đến 15 cm). */
  const VAT_DO = {
    but_chi: { ten: 'bút chì', dai: [5, 14] },
    tay: { ten: 'cục tẩy', dai: [2, 5] },
    que: { ten: 'que tính', dai: [6, 12] },
    but_sap: { ten: 'bút sáp', dai: [4, 9] },
    bang_giay: { ten: 'băng giấy', dai: [3, 13] },
    doan: { ten: 'đoạn thẳng AB', dai: [3, 12] }
  };
  /** Đo bằng thước kẻ 2 dm đặt nối tiếp (Bài 57 tiết 2). */
  const VAT_NOI = {
    cua_so: { ten: 'cửa sổ', dong: 'rộng', lan: [4, 6] },
    tu_sach: { ten: 'tủ sách', dong: 'rộng', lan: [5, 6] },
    ban: { ten: 'cái bàn', dong: 'dài', lan: [3, 5] }
  };

  /* ============================================================
     2. Hình vẽ SVG (đồ vật là emoji, dụng cụ vẽ tay kiểu đất nặn: màu phẳng, viền đậm, vệt sáng, bóng mềm)
     ============================================================ */

  let soId = 0;
  function maId(t) { soId = (soId + 1) % 1000000; return 'xd' + t + soId; }
  function bocSvg(vb, noiDung, nhan, lop) {
    return '<svg class="' + (lop || 'xd-hinh') + '" viewBox="' + vb.join(' ') + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + esc(nhan) + '" font-family="' + FONT + '">' + noiDung + '</svg>';
  }
  function chuSvg(x, y, t, co, mau, them) {
    return '<text x="' + r1(x) + '" y="' + r1(y) + '" text-anchor="middle" font-size="' + co + '" font-weight="800" fill="' + (mau || '#221a3b') + '"' + (them || '') + '>' + esc(t) + '</text>';
  }
  function emojiSvg(x, yDay, e, co) {
    return '<text x="' + r1(x) + '" y="' + r1(yDay - co * 0.13) + '" text-anchor="middle" font-size="' + Math.round(co) + '" font-family="' + FONT_EMOJI + '">' + e + '</text>';
  }
  function bong(cx, cy, rx, ry) { return '<ellipse cx="' + r1(cx) + '" cy="' + r1(cy) + '" rx="' + r1(rx) + '" ry="' + r1(ry) + '" fill="#1b1030" opacity=".16"/>'; }
  /** Nhãn viên thuốc (pill) có chữ ở giữa. */
  function nhanTron(x, y, t, nen, mau, co) {
    co = co || 22;
    const w = Math.max(54, String(t).length * co * 0.56 + 26), h = co + 16;
    return '<rect x="' + r1(x - w / 2) + '" y="' + r1(y - h / 2) + '" width="' + r1(w) + '" height="' + h + '" rx="' + (h / 2) + '" fill="' + nen + '"/>' + chuSvg(x, y + co * 0.36, t, co, mau);
  }
  function sao(cx, cy, r, mau) {
    let d = '';
    for (let i = 0; i < 10; i++) {
      const g = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      d += (i ? 'L' : 'M') + r1(cx + rr * Math.cos(g)) + ' ' + r1(cy + rr * Math.sin(g));
    }
    return '<path d="' + d + 'Z" fill="' + mau + '"/>';
  }

  /* ---------- Quả cân (đáy giữa ở gốc tọa độ) ---------- */

  const QC = { 1: { w: 60, h: 52, co: 23 }, 2: { w: 68, h: 58, co: 25 }, 3: { w: 72, h: 62, co: 26 }, 5: { w: 82, h: 68, co: 28 }, 10: { w: 94, h: 76, co: 28 } };
  function veQuaCan(kg, x, y, them) {
    const k = QC[kg] || QC[2];
    const bw = k.w / 2, tw = k.w * 0.3, hb = Math.round(k.h * 0.74), nw = Math.round(k.w * 0.34);
    let s = bong(0, 1, bw + 3, 5);
    s += '<rect x="' + r1(-nw / 2) + '" y="' + (-k.h) + '" width="' + nw + '" height="' + (k.h - hb + 6) + '" rx="6" fill="#5b6475" stroke="#2f3744" stroke-width="2.5"/>';
    s += '<path d="M' + r1(-bw) + ' 0 L' + r1(-tw) + ' ' + (-hb) + ' L' + r1(tw) + ' ' + (-hb) + ' L' + r1(bw) + ' 0 Z" fill="#4b5563" stroke="#2f3744" stroke-width="2.5" stroke-linejoin="round"/>';
    s += '<path d="M' + r1(-bw + 7) + ' -5 L' + r1(-tw + 4) + ' ' + (-hb + 5) + ' L' + r1(-tw + 12) + ' ' + (-hb + 5) + ' L' + r1(-bw + 16) + ' -5 Z" fill="#fff" opacity=".2"/>';
    s += chuSvg(0, -hb * 0.26, kg + ' kg', k.co, '#fff');
    return '<g transform="translate(' + r1(x) + ' ' + r1(y) + ')"' + (them || '') + '>' + s + '</g>';
  }
  /** Quả cân đứng riêng trong một SVG nhỏ (kệ quả cân, bài học). */
  function svgQuaCan(kg) {
    const k = QC[kg] || QC[2];
    return bocSvg([-k.w / 2 - 6, -k.h - 4, k.w + 12, k.h + 12], veQuaCan(kg, 0, 0), 'Quả cân ' + kg + ' ki-lô-gam', 'xd-hinh-qc');
  }

  const MAU_HOP = { a: ['#ffd166', '#b7811a'], b: ['#7bdc5a', '#3f8f2b'], c: ['#ef476f', '#a8203f'] };
  function veHop(chuCai, x, y) {
    const m = MAU_HOP[chuCai] || MAU_HOP.a;
    return '<g transform="translate(' + r1(x) + ' ' + r1(y) + ')">' + bong(0, 1, 40, 5) +
      '<rect x="-36" y="-62" width="72" height="62" rx="9" fill="' + m[0] + '" stroke="' + m[1] + '" stroke-width="3"/>' +
      '<rect x="-30" y="-56" width="12" height="44" rx="6" fill="#fff" opacity=".35"/>' +
      chuSvg(0, -18, chuCai.toUpperCase(), 34, '#fff', ' stroke="' + m[1] + '" stroke-width="5" paint-order="stroke"') + '</g>';
  }

  /* ---------- Đồ trên đĩa cân: hàng dưới cùng ở y = 0, xếp thêm hàng lên trên ---------- */

  function kichMon(m) {
    if (m.kg) return { w: QC[m.kg].w, h: QC[m.kg].h };
    if (m.hop) return { w: 78, h: 66 };
    const v = VAT[m.vat];
    if (v.qc) return { w: QC[v.qc].w, h: QC[v.qc].h };
    const n = m.soCung || 1;
    const co = Math.round((n <= 1 ? 72 : n <= 2 ? 60 : n <= 4 ? 48 : 40) * (v.co || 1));
    return { w: Math.round(co * 1.02), h: Math.round(co * 0.96), co: co };
  }
  /** mon: [{ vat, n } | { kg, i } | { hop }]; i: số thứ tự của quả cân trên kệ (game dùng để nhấc ra). */
  function veDo(mon, rong) {
    rong = rong || 204;
    const ds = [];
    (mon || []).forEach(function (it) {
      if (it.kg || it.hop) ds.push(Object.assign({}, it));
      else for (let k = 0; k < (it.n || 1); k++) ds.push({ vat: it.vat, soCung: it.n || 1 });
    });
    ds.forEach(function (m) { m.k = kichMon(m); });
    // cả đĩa vừa một hàng nếu thu nhỏ (tối đa 30%, hoặc 45% khi chỉ có vài món): thu nhỏ cả hàng thay vì chồng lên đòn cân
    const tongW = ds.reduce(function (t, m) { return t + m.k.w + 2; }, -2);
    if (tongW > rong && (tongW * 0.7 <= rong || (ds.length <= 4 && tongW * 0.55 <= rong))) {
      const k = r1(rong / tongW * 100) / 100;
      return '<g transform="scale(' + k + ')">' + veDo(mon, tongW + 1) + '</g>';
    }
    const hang = [];
    let h = [], w = 0;
    ds.forEach(function (m) {
      if (h.length && w + m.k.w > rong) { hang.push(h); h = []; w = 0; }
      h.push(m);
      w += m.k.w + 2;
    });
    if (h.length) hang.push(h);
    let s = '', y = 0;
    hang.forEach(function (hh) {
      const tongW = hh.reduce(function (t, m) { return t + m.k.w; }, 0) + (hh.length - 1) * 2;
      let x = -tongW / 2, cao = 0;
      hh.forEach(function (m) {
        const cx = x + m.k.w / 2;
        const v = m.vat ? VAT[m.vat] : null;
        if (m.kg || (v && v.qc)) s += veQuaCan(m.kg || v.qc, cx, y, m.i != null ? ' class="xd-qc-dia" data-i="' + m.i + '"' : '');
        else if (m.hop) s += veHop(m.hop, cx, y);
        else s += emojiSvg(cx, y, v.e, m.k.co);
        x += m.k.w + 2;
        cao = Math.max(cao, m.k.h);
      });
      y -= cao - 4;
    });
    return s;
  }

  /* ---------- Cân đĩa: gốc tọa độ ở trục quay, đế ở y ≈ 230 ---------- */

  const DON = 185, DAY = 116;
  /** Kích thước cân: to (một cân) và hẹp (hình có hai, ba cân). */
  const CO_CAN = { to: { don: DON, day: DAY, ban: 104, rong: 204 }, hep: { don: 128, day: 100, ban: 80, rong: 156 } };
  function gocTheoLech(lech) { return lech === 'trai' ? -10 : lech === 'phai' ? 10 : 0; }
  /** Góc nghiêng của đòn cân theo chênh lệch (phải trừ trái): lệch nhiều thì nghiêng nhiều, tối đa 13 độ. */
  function gocTheoChenh(d) { return d === 0 ? 0 : (d > 0 ? 1 : -1) * Math.min(13, 5 + 2.5 * Math.abs(d)); }
  function diemTreo(goc, ben, don) {
    const r = goc * Math.PI / 180, d = ben === 'trai' ? -1 : 1;
    return { x: r1(d * (don || DON) * Math.cos(r)), y: r1(d * (don || DON) * Math.sin(r)) };
  }
  function veChanCan() {
    let s = bong(0, 236, 150, 12);
    s += '<path d="M-120 232 Q-122 200 -88 196 L88 196 Q122 200 120 232 Z" fill="#6d4fc6" stroke="#4a3494" stroke-width="3" stroke-linejoin="round"/>';
    s += '<path d="M-98 214 Q-94 205 -76 204 L30 204" stroke="#fff" stroke-width="6" opacity=".25" fill="none" stroke-linecap="round"/>';
    s += '<circle cx="0" cy="216" r="15" fill="#ffd166" stroke="#b7791f" stroke-width="2.5"/>' + sao(0, 216, 9, '#d99a1e');
    s += '<rect x="-14" y="0" width="28" height="200" rx="12" fill="#7b5cd6" stroke="#4a3494" stroke-width="3"/>';
    s += '<rect x="-8" y="14" width="7" height="174" rx="3.5" fill="#fff" opacity=".22"/>';
    s += '<rect x="-18" y="66" width="36" height="12" rx="6" fill="#f6c343" stroke="#b7791f" stroke-width="2.5"/>';
    s += '<rect x="-18" y="148" width="36" height="12" rx="6" fill="#f6c343" stroke="#b7791f" stroke-width="2.5"/>';
    // mặt chỉ thăng bằng: kim trùng vạch xanh là cân nằm ngang
    s += '<path d="M-36 -32 A48 48 0 0 1 36 -32" stroke="#4a3494" stroke-width="14" fill="none" stroke-linecap="round" opacity=".25"/>';
    s += '<path d="M-36 -32 A48 48 0 0 1 36 -32" stroke="#fff" stroke-width="9" fill="none" stroke-linecap="round"/>';
    s += '<line x1="0" y1="-42" x2="0" y2="-54" stroke="#06b389" stroke-width="5" stroke-linecap="round"/>';
    return s;
  }
  function veDonCan(don) {
    return '<line x1="0" y1="-4" x2="0" y2="-46" stroke="#ef476f" stroke-width="5" stroke-linecap="round"/>' +
      '<rect x="' + (-don - 12) + '" y="-10" width="' + (2 * don + 24) + '" height="20" rx="10" fill="#f6c343" stroke="#b7791f" stroke-width="3"/>' +
      '<rect x="' + (-don) + '" y="-6" width="' + (2 * don) + '" height="5" rx="2.5" fill="#fff" opacity=".5"/>' +
      '<circle cx="' + (-don) + '" cy="0" r="8" fill="#e8a92c" stroke="#b7791f" stroke-width="2.5"/>' +
      '<circle cx="' + don + '" cy="0" r="8" fill="#e8a92c" stroke="#b7791f" stroke-width="2.5"/>';
  }
  function veDiaCan(ben, mon, id, nhan, G) {
    G = G || CO_CAN.to;
    const day = G.day, b = G.ban;
    let s = '<path d="M0 0 L' + (-b + 20) + ' ' + day + ' M0 0 L' + (b - 20) + ' ' + day + '" stroke="#b7791f" stroke-width="3" fill="none" stroke-linecap="round"/>';
    s += '<path d="M' + (-b) + ' ' + day + ' Q0 ' + (day + 46) + ' ' + b + ' ' + day + ' Z" fill="#f6c343" stroke="#b7791f" stroke-width="3" stroke-linejoin="round"/>';
    s += '<path d="M' + (-b + 30) + ' ' + (day + 9) + ' Q0 ' + (day + 28) + ' ' + (b - 30) + ' ' + (day + 9) + '" stroke="#fff5cc" stroke-width="5" fill="none" opacity=".7" stroke-linecap="round"/>';
    s += '<rect x="' + (-b - 4) + '" y="' + (day - 5) + '" width="' + (2 * b + 8) + '" height="10" rx="5" fill="#e8a92c" stroke="#b7791f" stroke-width="2.5"/>';
    s += '<circle r="6" fill="#e8a92c" stroke="#b7791f" stroke-width="2.5"/>';
    s += '<g' + (id ? ' id="' + id + '-do-' + ben + '"' : '') + ' transform="translate(0 ' + (day - 3) + ')">' + veDo(mon, G.rong) + '</g>';
    if (nhan) s += nhanTron(0, day + 60, nhan.chu, nhan.nen || '#fff', nhan.mau || '#221a3b', nhan.co || 24);
    return s;
  }
  /**
   * Một cân đĩa (chưa bọc svg). o: { trai, phai (đồ trên đĩa), goc (độ, dương là đĩa phải lệch xuống), id (game dùng để
   * xoay đòn và dịch đĩa), nhanTrai, nhanPhai: { chu, nen, mau } nhãn dưới đĩa }.
   */
  function veCan(o) {
    const goc = o.goc || 0, id = o.id || '';
    const G = o.hep ? CO_CAN.hep : CO_CAN.to;
    const t = diemTreo(goc, 'trai', G.don), p = diemTreo(goc, 'phai', G.don);
    let s = veChanCan();
    s += '<g' + (id ? ' id="' + id + '-dia-trai"' : '') + ' transform="translate(' + t.x + ' ' + t.y + ')">' + veDiaCan('trai', o.trai, id, o.nhanTrai, G) + '</g>';
    s += '<g' + (id ? ' id="' + id + '-dia-phai"' : '') + ' transform="translate(' + p.x + ' ' + p.y + ')">' + veDiaCan('phai', o.phai, id, o.nhanPhai, G) + '</g>';
    s += '<g' + (id ? ' id="' + id + '-don"' : '') + ' transform="rotate(' + goc + ')">' + veDonCan(G.don) + '</g>';
    s += '<circle r="17" fill="#7b5cd6" stroke="#4a3494" stroke-width="3"/><circle r="7" fill="#ffd166"/>';
    return s;
  }
  const VB_CAN = [-300, -84, 600, 334];
  /** Cân hẹp thu nhỏ đặt tại (x, y), kèm tên dưới đế (ví dụ "Cân 1"). */
  function canNho(o, x, y, k, ten) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + k + ')">' + veCan(Object.assign({ hep: true }, o)) + '</g>' +
      (ten ? chuSvg(x, y + 266 * k, ten, 26, '#4a3494') : '');
  }

  /* ---------- Cân đồng hồ (Bài 17, 35): mặt số 0 đến 7 kg, kim đỏ ---------- */

  const DH_MAX = 7, DH_GOC = 140;
  function gocKim(kg) { return -DH_GOC + (kg / DH_MAX) * 2 * DH_GOC; }
  /** o: { vat, qt (quả cân cùng đặt trên cân), kim (số kg kim chỉ), id, nhan }; gốc ở tâm mặt số, đế ở y ≈ 150. */
  function veCanDongHo(o) {
    let s = bong(0, 158, 150, 12);
    // đồ trên bàn cân
    s += '<rect x="-12" y="-150" width="24" height="44" fill="#9aa3b5"/>';
    s += '<g transform="translate(0 -154)">' + veDo([{ vat: o.vat, n: 1 }].concat((o.qt || []).map(function (w) { return { kg: w }; })), 230) + '</g>';
    s += '<path d="M-130 -154 L130 -154 L118 -140 L-118 -140 Z" fill="#c9ced6" stroke="#6b7a99" stroke-width="3" stroke-linejoin="round"/>';
    // thân cân
    s += '<rect x="-128" y="-112" width="256" height="262" rx="46" fill="#ef476f" stroke="#a8203f" stroke-width="4"/>';
    s += '<rect x="-110" y="-100" width="30" height="210" rx="15" fill="#fff" opacity=".22"/>';
    s += '<circle r="96" fill="#fff" stroke="#a8203f" stroke-width="5"/>';
    let so = '';
    for (let i = 0; i <= DH_MAX * 2; i++) {
      const g = (gocKim(i / 2) - 90) * Math.PI / 180, lon = i % 2 === 0;
      const r1_ = lon ? 70 : 78, r2 = 90;
      s += '<line x1="' + r1(Math.cos(g) * r1_) + '" y1="' + r1(Math.sin(g) * r1_) + '" x2="' + r1(Math.cos(g) * r2) + '" y2="' + r1(Math.sin(g) * r2) + '" stroke="#221a3b" stroke-width="' + (lon ? 4 : 2.5) + '" stroke-linecap="round"/>';
      if (lon) so += chuSvg(Math.cos(g) * 52, Math.sin(g) * 52 + 9, i / 2, 26, '#221a3b', ' stroke="#fff" stroke-width="5" paint-order="stroke"');
    }
    s += chuSvg(0, 44, 'kg', 22, '#8a84a3');
    s += '<g' + (o.id ? ' id="' + o.id + '-kim"' : '') + ' class="xd-kim-dh" style="transform: rotate(' + r1(gocKim(o.kim)) + 'deg)"><path d="M-3.5 8 L0 -88 L3.5 8 Z" fill="#ef476f" stroke="#a8203f" stroke-width="1.5" stroke-linejoin="round"/></g>';
    s += so + '<circle r="10" fill="#221a3b"/><circle r="4" fill="#fff"/>';
    if (o.nhan) s += nhanTron(0, 128, o.nhan, '#fff4ec', '#d84f1d', 24);
    return s;
  }

  /* ---------- Đồ đựng nước (đáy giữa ở gốc tọa độ) ---------- */

  function thanBinh(loai, w, h) {
    const x0 = -w / 2;
    if (loai === 'xo') {
      const b = w * 0.39;
      return 'M' + r1(x0) + ' ' + (-h) + ' L' + r1(-x0) + ' ' + (-h) + ' L' + r1(b) + ' -14 Q' + r1(b) + ' 0 ' + r1(b - 14) + ' 0 L' + r1(-b + 14) + ' 0 Q' + r1(-b) + ' 0 ' + r1(-b) + ' -14 Z';
    }
    if (loai === 'am') {
      return 'M' + r1(x0 + 22) + ' ' + (-h) + ' L' + r1(-x0 - 22) + ' ' + (-h) + ' Q' + r1(-x0) + ' ' + r1(-h * 0.7) + ' ' + r1(-x0) + ' -30 Q' + r1(-x0) + ' 0 ' + r1(-x0 - 30) + ' 0 L' + r1(x0 + 30) + ' 0 Q' + r1(x0) + ' 0 ' + r1(x0) + ' -30 Q' + r1(x0) + ' ' + r1(-h * 0.7) + ' ' + r1(x0 + 22) + ' ' + (-h) + ' Z';
    }
    const rt = loai === 'can' ? 26 : 12, rb = 24;
    return 'M' + r1(x0) + ' ' + (-h + rt) + ' Q' + r1(x0) + ' ' + (-h) + ' ' + r1(x0 + rt) + ' ' + (-h) + ' L' + r1(-x0 - rt) + ' ' + (-h) + ' Q' + r1(-x0) + ' ' + (-h) + ' ' + r1(-x0) + ' ' + (-h + rt) +
      ' L' + r1(-x0) + ' ' + (-rb) + ' Q' + r1(-x0) + ' 0 ' + r1(-x0 - rb) + ' 0 L' + r1(x0 + rb) + ' 0 Q' + r1(x0) + ' 0 ' + r1(x0) + ' ' + (-rb) + ' Z';
  }
  /** Độ cao mặt nước (y âm) khi có l lít trong đồ đựng max lít. */
  function mucNuoc(l, max, cao) { return r1(-10 - (Math.max(0, Math.min(l, max)) / max) * (cao - 36)); }
  /**
   * o: { loai, max, nuoc, vach (lít giữa hai vạch, 0 là không vạch), ghi (ghi số mỗi mấy lít), rong, cao, id, chu (chữ to trên thân),
   *      danhDau (vạch cần rót tới: có ngôi sao), day (vẽ vạch "đầy"), mau (màu nước) }
   */
  function veBinh(o) {
    const loai = o.loai || 'binh';
    const w = o.rong || BINH[loai].rong, h = o.cao || BINH[loai].cao;
    const cid = maId('c');
    const than = thanBinh(loai, w, h);
    const mau = o.mau || '#4fb3f6';
    const x0 = -w / 2;
    let s = bong(0, 4, w * 0.55, 9);
    // phụ kiện phía sau: quai, nắp, vòi
    if (loai === 'binh') s += '<path d="M' + r1(-x0 - 4) + ' ' + r1(-h + 36) + ' Q' + r1(-x0 + 46) + ' ' + r1(-h + 40) + ' ' + r1(-x0 + 40) + ' ' + r1(-h * 0.45) + ' Q' + r1(-x0 + 34) + ' ' + r1(-h * 0.25) + ' ' + r1(-x0 - 4) + ' ' + r1(-h * 0.25) + '" stroke="#9cc3dd" stroke-width="12" fill="none" stroke-linecap="round"/>' +
      '<path d="M' + r1(x0 + 4) + ' ' + (-h + 2) + ' L' + r1(x0 - 22) + ' ' + (-h - 12) + ' L' + r1(x0 + 6) + ' ' + (-h + 22) + ' Z" fill="#e3f3fd" stroke="#7fa9c6" stroke-width="3" stroke-linejoin="round"/>';
    if (loai === 'can') s += '<rect x="' + r1(-x0 - 58) + '" y="' + (-h - 16) + '" width="34" height="20" rx="6" fill="#ef476f" stroke="#a8203f" stroke-width="3"/>' +
      '<path d="M' + r1(x0 + 16) + ' ' + (-h + 2) + ' Q' + r1(x0 + 20) + ' ' + (-h - 34) + ' ' + r1(x0 + 62) + ' ' + (-h - 30) + ' L' + r1(x0 + 70) + ' ' + (-h + 2) + '" stroke="#7fa9c6" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
    if (loai === 'xo') s += '<path d="M' + r1(x0 + 6) + ' ' + (-h + 4) + ' Q0 ' + r1(-h - 70) + ' ' + r1(-x0 - 6) + ' ' + (-h + 4) + '" stroke="#8a93a6" stroke-width="6" fill="none"/>';
    if (loai === 'am') s += '<path d="M' + r1(x0 + 8) + ' ' + r1(-h * 0.55) + ' L' + r1(x0 - 34) + ' ' + r1(-h * 0.9) + '" stroke="#9cc3dd" stroke-width="16" stroke-linecap="round"/>' +
      '<path d="M' + r1(-x0 - 10) + ' ' + r1(-h * 0.8) + ' Q' + r1(-x0 + 40) + ' ' + r1(-h * 0.6) + ' ' + r1(-x0 - 6) + ' ' + r1(-h * 0.25) + '" stroke="#9cc3dd" stroke-width="12" fill="none" stroke-linecap="round"/>' +
      '<rect x="-26" y="' + (-h - 12) + '" width="52" height="14" rx="7" fill="#9cc3dd"/>';
    s += '<defs><clipPath id="' + cid + '"><path d="' + than + '"/></clipPath></defs>';
    s += '<path d="' + than + '" fill="#eef8ff" opacity=".9"/>';
    const y = mucNuoc(o.nuoc || 0, o.max || 1, h);
    const yCao = mucNuoc(0, o.max || 1, h);
    s += '<g clip-path="url(#' + cid + ')"><g' + (o.id ? ' id="' + o.id + '-nuoc"' : '') + ' class="xd-nuoc" style="transform: translateY(' + r1(y - yCao) + 'px)">' +
      '<rect x="' + r1(x0 - 4) + '" y="' + yCao + '" width="' + (w + 8) + '" height="' + (h + 20) + '" fill="' + mau + '"/>' +
      '<rect x="' + r1(x0 - 4) + '" y="' + yCao + '" width="' + (w + 8) + '" height="7" fill="#fff" opacity=".45"/></g></g>';
    // vạch chia
    if (o.vach) {
      for (let l = o.vach; l < (o.max || 0) + 0.01; l += o.vach) {
        const yy = mucNuoc(l, o.max, h);
        const ghi = !o.ghi || Math.round(l) % o.ghi === 0;
        s += '<line x1="' + r1(x0 + 3) + '" y1="' + yy + '" x2="' + r1(x0 + (ghi ? 34 : 22)) + '" y2="' + yy + '" stroke="#24507a" stroke-width="' + (ghi ? 4 : 3) + '" stroke-linecap="round"/>';
        if (ghi) s += '<text x="' + r1(x0 - 8) + '" y="' + r1(yy + 8) + '" text-anchor="end" font-size="23" font-weight="800" fill="#24507a">' + l + ' l</text>';
        if (o.danhDau === l) s += '<g class="xd-sao-vach">' + sao(x0 + 50, yy, 13, '#ff8a1f') + '</g>';
      }
    }
    if (o.day) {
      const yd = mucNuoc(o.max, o.max, h);
      s += '<line x1="' + r1(x0 + 6) + '" y1="' + yd + '" x2="' + r1(-x0 - 6) + '" y2="' + yd + '" stroke="#24507a" stroke-width="3" stroke-dasharray="8 7" opacity=".55"/>';
    }
    s += '<path d="' + than + '" fill="none" stroke="#6f9fc2" stroke-width="4.5" stroke-linejoin="round"/>';
    s += '<path d="M' + r1(-x0 - 18) + ' ' + r1(-h + 30) + ' L' + r1(-x0 - 18) + ' ' + r1(-h * 0.3) + '" stroke="#fff" stroke-width="8" opacity=".6" stroke-linecap="round"/>';
    if (o.chu) s += chuSvg(0, -h * 0.52, o.chu, 48, '#fff', ' stroke="#24507a" stroke-width="7" paint-order="stroke"');
    if (o.nhan) s += nhanTron(0, 32, o.nhan, '#fff', '#24507a', 22);
    return s;
  }

  /** Ca có vạch (ca 1 l, ca 2 l…): đáy giữa ở gốc, cao khoảng 80. nhan: chữ trên ca; day: 0..1 lượng nước. */
  function veCa(nhan, day, k, id) {
    k = k || 1;
    const cid = maId('ca');
    const than = 'M-27 -72 L27 -72 L32 -10 Q32 0 22 0 L-22 0 Q-32 0 -32 -10 Z';
    let s = bong(0, 2, 34, 5);
    s += '<path d="M28 -62 Q58 -60 55 -38 Q52 -18 31 -17" stroke="#9cc3dd" stroke-width="8" fill="none" stroke-linecap="round"/>';
    s += '<path d="M-26 -71 L-42 -80 L-28 -56 Z" fill="#e3f3fd" stroke="#7fa9c6" stroke-width="2.5" stroke-linejoin="round"/>';
    s += '<defs><clipPath id="' + cid + '"><path d="' + than + '"/></clipPath></defs>';
    s += '<path d="' + than + '" fill="#eef8ff" opacity=".9"/>';
    if (day > 0) s += '<rect clip-path="url(#' + cid + ')"' + (id ? ' id="' + id + '"' : '') + ' x="-34" y="' + r1(-6 - 60 * day) + '" width="68" height="' + r1(8 + 60 * day) + '" fill="#4fb3f6"/>';
    s += '<path d="' + than + '" fill="none" stroke="#6f9fc2" stroke-width="3.5" stroke-linejoin="round"/>';
    s += '<ellipse cx="0" cy="-36" rx="22" ry="14" fill="#fff" stroke="#6f9fc2" stroke-width="2"/>' + chuSvg(0, -28, nhan, 20, '#1d5f95');
    return k === 1 ? s : '<g transform="scale(' + k + ')">' + s + '</g>';
  }
  function veCoc(x, y) {
    return '<g transform="translate(' + r1(x) + ' ' + r1(y) + ')">' + bong(0, 1, 16, 3) +
      '<path d="M-14 -38 L14 -38 L11 -2 Q11 0 8 0 L-8 0 Q-11 0 -11 -2 Z" fill="#eef8ff" stroke="#6f9fc2" stroke-width="2.5"/>' +
      '<path d="M-13 -28 L13 -28 L11 -2 Q11 0 8 0 L-8 0 Q-11 0 -11 -2 Z" fill="#4fb3f6"/>' +
      '<path d="M-14 -38 L14 -38 L11 -2 Q11 0 8 0 L-8 0 Q-11 0 -11 -2 Z" fill="none" stroke="#6f9fc2" stroke-width="2.5"/></g>';
  }

  /* ---------- Thước và đồ vật đo (thước: vạch 0 ở gốc, mép trên ở y = 0) ---------- */

  const PX_CM = 40;
  function veThuoc(o) {
    o = o || {};
    const px = o.px || PX_CM, n = o.den || 15;
    const trai = -0.7 * px, phai = (n + 0.7) * px;
    let s = bong((trai + phai) / 2, 66, (phai - trai) / 2, 6);
    s += '<rect x="' + r1(trai) + '" y="0" width="' + r1(phai - trai) + '" height="62" rx="8" fill="#ffb8c9" stroke="#d9678a" stroke-width="3"/>';
    s += '<rect x="' + r1(trai + 6) + '" y="46" width="' + r1(phai - trai - 12) + '" height="10" rx="5" fill="#fff" opacity=".3"/>';
    for (let hm = 0; hm <= n * 2; hm++) {
      const x = hm * px / 2, cm = hm % 2 === 0;
      s += '<line x1="' + r1(x) + '" y1="0" x2="' + r1(x) + '" y2="' + (cm ? 22 : 13) + '" stroke="#6b1f3a" stroke-width="' + (cm ? 2.6 : 1.6) + '"/>';
      if (cm) s += '<text x="' + r1(x) + '" y="42" text-anchor="middle" font-size="19" font-weight="800" fill="#6b1f3a">' + (hm / 2) + '</text>';
    }
    s += '<text x="' + r1(phai - 12) + '" y="56" text-anchor="end" font-size="14" font-weight="800" fill="#6b1f3a" opacity=".8">cm</text>';
    return s;
  }
  const MAU_BANG = ['#ffd166', '#ef476f', '#06d6a0', '#58b0ff'];
  /** Đồ vật nằm ngang, đầu trái ở x = 0, tâm dọc ở y = 0, dài L cm. */
  function veVatDo(vat, L, px, mauSo) {
    px = px || PX_CM;
    const w = L * px;
    let s = '';
    if (vat === 'but_chi') {
      const than = Math.max(10, w - 34 - 34);
      s += bong(w / 2, 17, w / 2, 4);
      s += '<rect x="0" y="-13" width="24" height="26" rx="7" fill="#ff8fab" stroke="#c9577a" stroke-width="2.5"/>';
      s += '<rect x="20" y="-14" width="14" height="28" rx="2" fill="#c9ced6" stroke="#8a93a6" stroke-width="2.5"/>';
      s += '<rect x="34" y="-13" width="' + r1(than) + '" height="26" fill="#ffc93d" stroke="#c98a12" stroke-width="2.5"/>';
      s += '<rect x="34" y="-4" width="' + r1(than) + '" height="6" fill="#f0a500" opacity=".6"/>';
      s += '<path d="M' + r1(w - 34) + ' -13 L' + r1(w - 9) + ' -3.5 L' + r1(w - 9) + ' 3.5 L' + r1(w - 34) + ' 13 Z" fill="#f3d2a2" stroke="#b98a55" stroke-width="2.5" stroke-linejoin="round"/>';
      s += '<path d="M' + r1(w - 10) + ' -4 L' + r1(w) + ' 0 L' + r1(w - 10) + ' 4 Z" fill="#3b3b3b"/>';
    } else if (vat === 'tay') {
      s += bong(w / 2, 20, w / 2, 4);
      s += '<rect x="0" y="-18" width="' + r1(w) + '" height="36" rx="9" fill="#fff" stroke="#b9b2d0" stroke-width="2.5"/>';
      s += '<rect x="' + r1(w * 0.42) + '" y="-18" width="' + r1(w * 0.58) + '" height="36" rx="4" fill="#4f8ff7" stroke="#2f63b3" stroke-width="2.5"/>';
      s += '<rect x="4" y="-13" width="' + r1(w * 0.3) + '" height="7" rx="3.5" fill="#fff" opacity=".8"/>';
    } else if (vat === 'que') {
      s += bong(w / 2, 10, w / 2, 3);
      s += '<rect x="0" y="-6" width="' + r1(w) + '" height="12" rx="6" fill="#f4b860" stroke="#c07a26" stroke-width="2"/>';
      s += '<rect x="6" y="-4" width="' + r1(w - 12) + '" height="3" rx="1.5" fill="#fff" opacity=".45"/>';
    } else if (vat === 'but_sap') {
      s += bong(w / 2, 16, w / 2, 4);
      s += '<rect x="0" y="-12" width="' + r1(w - 22) + '" height="24" rx="5" fill="#ef476f" stroke="#a8203f" stroke-width="2.5"/>';
      s += '<rect x="' + r1(w * 0.2) + '" y="-12" width="' + r1(w * 0.45) + '" height="24" fill="#fff" opacity=".85"/>';
      s += '<path d="M' + r1(w - 22) + ' -10 L' + r1(w) + ' -2 L' + r1(w) + ' 2 L' + r1(w - 22) + ' 10 Z" fill="#ef476f" stroke="#a8203f" stroke-width="2.5" stroke-linejoin="round"/>';
    } else if (vat === 'bang_giay') {
      const m = MAU_BANG[(mauSo || 0) % MAU_BANG.length];
      s += bong(w / 2, 18, w / 2, 4);
      s += '<rect x="0" y="-15" width="' + r1(w) + '" height="30" rx="3" fill="' + m + '" stroke="#5b5575" stroke-width="2"/>';
      s += '<rect x="4" y="-11" width="' + r1(w - 8) + '" height="5" rx="2.5" fill="#fff" opacity=".45"/>';
    } else {
      s += '<line x1="0" y1="0" x2="' + r1(w) + '" y2="0" stroke="#221a3b" stroke-width="5" stroke-linecap="round"/>';
      s += '<circle cx="0" cy="0" r="7" fill="#221a3b"/><circle cx="' + r1(w) + '" cy="0" r="7" fill="#221a3b"/>';
      s += chuSvg(0, -16, 'A', 24) + chuSvg(w, -16, 'B', 24);
    }
    return s;
  }
  function tenVatDo(vat) { return VAT_DO[vat] ? VAT_DO[vat].ten : vat; }
  /** Tâm dọc của đồ vật so với mép trên thước (đồ vật nằm sát trên thước). */
  function caoVatDo(vat) { return { but_chi: 16, tay: 20, que: 8, but_sap: 14, bang_giay: 17, doan: 12 }[vat] || 16; }
  /**
   * Đồ vật đặt trên thước. o: { vat, dai, dau (vạch dưới đầu trái của đồ vật), mau, danhSo (đếm từng khoảng 1 cm),
   * muiTen (mũi tên chỉ vạch cuối) }. Đầu trái đồ vật ở x = X0.
   */
  const X0_THUOC = 70;
  function veThuocVaVat(o) {
    const px = PX_CM, dauX = X0_THUOC, y0 = 120;
    const vachDau = o.dau || 0;
    let s = '<g transform="translate(' + r1(dauX - vachDau * px) + ' ' + y0 + ')">' + veThuoc({ px: px }) + '</g>';
    s += '<g transform="translate(' + dauX + ' ' + (y0 - caoVatDo(o.vat)) + ')">' + veVatDo(o.vat, o.dai, px, o.mau) + '</g>';
    if (o.danhSo) {
      for (let i = 1; i <= o.dai; i++) s += chuSvg(dauX + (i - 0.5) * px, y0 - caoVatDo(o.vat) - 30, i, 20, '#d84f1d');
    }
    if (o.muiTen) {
      [vachDau, vachDau + o.dai].forEach(function (v, i) {
        const x = dauX + (v - vachDau) * px;
        s += '<path d="M' + x + ' ' + (y0 + 96) + ' l-11 16 h22 Z" fill="' + (i ? '#06b389' : '#ff8a1f') + '"/>' + chuSvg(x, y0 + 134, 'vạch ' + v, 20, i ? '#0f6b62' : '#d84f1d');
      });
    }
    return s;
  }
  const VB_THUOC = [0, 52, 760, 146];

  /* ---------- Ghép thành hình minh họa cho từng loại câu ---------- */

  function monCua(x) { return x[0] === 'qc1' ? [{ kg: 1 }] : [{ vat: x[0], n: x[1] }]; }

  /* ============================================================
     3. Loại 'nang_nhe': nặng hơn, nhẹ hơn (B2.9)
     ============================================================ */

  function benKhac(b) { return b === 'trai' ? 'phai' : 'trai'; }
  function tenBen(ct, b) { const x = ct[b]; return tenSo(x[0], x[1]); }
  function loaiTu(ds) {
    const lp = VAT[ds[0]].lp;
    return ds.every(function (v) { return VAT[v].lp === lp; }) ? lp : 'vật';
  }
  function chuoiLap(so, lan) { const ds = []; for (let i = 0; i < lan; i++) ds.push(so); return ds.join(' + '); }

  function tinhNN(ct) {
    if (ct.kieu === 'so_sanh') {
      if (ct.hoi === 'quan_he') return ct.lech === 'bang' ? 'nang_bang' : ct.lech === ct.chu ? 'nang_hon' : 'nhe_hon';
      if (ct.lech === 'bang') return 'bang';
      return ct.hoi === 'nang' ? ct.lech : benKhac(ct.lech);
    }
    if (ct.kieu === 'thu_tu') return ct.hoi === 'nang_nhat' ? ct.ds[0] : ct.ds[2];
    if (ct.kieu === 'doi_qua') return ct.n;
    if (ct.kieu === 'cong_qua') return ct.na + ct.nb;
    return ct.k1 * ct.k2;
  }
  function deNN(ct) {
    if (ct.kieu === 'so_sanh') {
      if (ct.hoi === 'quan_he') return hoa(tenBen(ct, ct.chu)) + ' nặng hơn, nhẹ hơn hay nặng bằng ' + tenBen(ct, benKhac(ct.chu)) + '?';
      return hoa(tenBen(ct, 'trai')) + ' và ' + tenBen(ct, 'phai') + ': bên nào ' + (ct.hoi === 'nang' ? 'nặng' : 'nhẹ') + ' hơn?';
    }
    if (ct.kieu === 'thu_tu') return hoa(loaiTu(ct.ds)) + ' nào ' + (ct.hoi === 'nang_nhat' ? 'nặng nhất' : 'nhẹ nhất') + '?';
    return hoa(VAT[ct.x].ten) + ' nặng bằng mấy ' + VAT[ct.u].ten + '?';
  }
  function deDocNN(ct) {
    if (ct.kieu === 'thu_tu') return 'Nhìn hai cân. ' + hoa(ct.ds.map(function (v) { return VAT[v].ten; }).join(', ')) + '. ' + deNN(ct);
    if (ct.kieu === 'so_sanh') return 'Nhìn cân đĩa. ' + deNN(ct);
    return 'Các cân đều nằm thăng bằng. ' + deNN(ct);
  }
  function maNN(ct) {
    if (ct.kieu === 'so_sanh') return 'ss:' + ct.hoi + (ct.hoi === 'quan_he' ? '-' + ct.chu.charAt(0) : '') + ':' + ct.trai[0] + ct.trai[1] + ',' + ct.phai[0] + ct.phai[1];
    if (ct.kieu === 'thu_tu') return 'tt:' + ct.hoi + ':' + ct.ds.join(',') + ':' + ct.can.map(function (c) { return c.join(''); }).join(',');
    if (ct.kieu === 'doi_qua') return 'dq:' + ct.x + ',' + ct.n + ct.u;
    if (ct.kieu === 'cong_qua') return 'cq:' + ct.x + ',' + ct.a + ct.na + '+' + ct.b + ct.nb + ',' + ct.u;
    return 'bc:' + ct.x + ',' + ct.k1 + ct.y + ',' + ct.k2 + ct.u;
  }
  const GT_SO_SANH = { nang: ['trai', 'phai', 'bang'], nhe: ['trai', 'phai', 'bang'], quan_he: ['nang_hon', 'nhe_hon', 'nang_bang'] };

  function nhanBietLoiNN(ct, v) {
    const d = tinhNN(ct);
    if (ct.kieu === 'so_sanh') {
      const x = String(v == null ? '' : v);
      if (x === d) return [];
      if (GT_SO_SANH[ct.hoi].indexOf(x) < 0) return ['khac'];
      if (ct.lech === 'bang' || x === 'bang' || x === 'nang_bang') return ['can-thang-bang'];
      return ['ben-thap-nhe'];
    }
    if (ct.kieu === 'thu_tu') {
      const x = String(v == null ? '' : v);
      if (x === d) return [];
      if (x === ct.ds[1]) return ['chi-mot-can'];
      if (x === (ct.hoi === 'nang_nhat' ? ct.ds[2] : ct.ds[0])) return ['ben-thap-nhe'];
      return ['khac'];
    }
    const n = soNguyen(v);
    if (n === d) return [];
    const ma = [];
    if (ct.kieu === 'cong_qua' && (n === ct.na || n === ct.nb)) ma.push('chi-mot-can');
    if (ct.kieu === 'bac_cau' && (n === ct.k1 || n === ct.k2) && n !== d) ma.push('chi-mot-can');
    if (!ma.length && Math.abs(n - d) === 1) ma.push('dem-lech');
    if (!ma.length) ma.push('khac');
    return ma;
  }
  function loiNoiNN(ct, v, maLoi) {
    const m = (maLoi && maLoi[0]) || 'khac';
    if (m === 'ben-thap-nhe') return 'Đĩa cân thấp hơn là bên nặng hơn đấy';
    if (m === 'can-thang-bang') return ct.lech === 'bang' ? 'Cân nằm ngang thì hai bên nặng bằng nhau' : 'Cân đang lệch, hai bên không nặng bằng nhau';
    if (m === 'chi-mot-can') {
      if (ct.kieu === 'thu_tu') return hoa(VAT[ct.ds[1]].ten) + ' nặng hơn một con nhưng nhẹ hơn con kia, con nhìn cả hai cân nhé';
      if (ct.kieu === 'cong_qua') return hoa(VAT[ct.x].ten) + ' nặng bằng cả ' + VAT[ct.a].ten + ' và ' + VAT[ct.b].ten + ' đấy';
      return 'Mỗi ' + VAT[ct.y].ten + ' nặng bằng ' + ct.k2 + ' ' + VAT[ct.u].ten + ', con dùng cả hai cân nhé';
    }
    if (m === 'dem-lech') return 'Con đếm lại số ' + VAT[ct.u].ten + ' nhé';
    return 'Chưa đúng rồi';
  }
  function hienNN(v, ct) {
    if (!ct) return String(v);
    if (ct.kieu === 'so_sanh') {
      const x = String(v);
      if (x === 'trai' || x === 'phai') return hoa(tenBen(ct, x));
      return { bang: 'Nặng bằng nhau', nang_hon: 'Nặng hơn', nhe_hon: 'Nhẹ hơn', nang_bang: 'Nặng bằng' }[x] || x;
    }
    if (ct.kieu === 'thu_tu') return VAT[v] ? hoa(VAT[v].ten) : String(v);
    const n = soNguyen(v);
    return Number.isFinite(n) ? n + ' ' + VAT[ct.u].ten : String(v);
  }
  function danhSachNN(ct) {
    if (ct.kieu === 'so_sanh') return GT_SO_SANH[ct.hoi].slice();
    if (ct.kieu === 'thu_tu') return ct.ds.slice();
    return null;
  }
  function taoNhieuNN(kyNang, ct, rng) {
    const d = tinhNN(ct);
    const ds = danhSachNN(ct);
    if (ds) return tron(rng, ds.filter(function (x) { return x !== d; })).map(function (v) { return { gia_tri: v, loi: nhanBietLoiNN(ct, v) }; });
    const ung = [];
    if (ct.kieu === 'cong_qua') ung.push({ v: ct.na, w: 2 }, { v: ct.nb, w: 2 });
    if (ct.kieu === 'bac_cau') ung.push({ v: ct.k2, w: 2 }, { v: ct.k1, w: 1 });
    return nhieuSo(ct, d, ung, nhanBietLoiNN, 1, 20, rng, 2);
  }
  function goiYNN(ct) {
    if (ct.kieu === 'so_sanh') {
      const a = tenBen(ct, 'trai'), b = tenBen(ct, 'phai');
      return [
        'Đĩa cân nào thấp hơn thì bên đó nặng hơn. Cân nằm ngang thì hai bên nặng bằng nhau.',
        ct.lech === 'bang' ? 'Hai đĩa cân đang ngang nhau.' : 'Đĩa bên ' + (ct.lech === 'trai' ? 'trái' : 'phải') + ' đang thấp hơn.',
        ct.lech === 'bang' ? hoa(a) + ' nặng bằng ' + b + '.' : 'Đĩa thấp hơn có ' + tenBen(ct, ct.lech) + '.'
      ];
    }
    if (ct.kieu === 'thu_tu') {
      const cau = ct.can.map(function (c, i) {
        const nang = Math.min(c[0], c[1]), nhe = Math.max(c[0], c[1]);
        return 'Cân ' + (i + 1) + ': ' + VAT[ct.ds[nang]].ten + ' nặng hơn ' + VAT[ct.ds[nhe]].ten + '.';
      });
      const lp = loaiTu(ct.ds);
      return [
        'Mỗi cân cho biết bên nào nặng hơn: đĩa thấp hơn là bên nặng hơn.',
        cau.join(' '),
        ct.hoi === 'nang_nhat' ? hoa(lp) + ' nặng nhất phải nặng hơn cả hai ' + lp + ' kia.' : hoa(lp) + ' nhẹ nhất phải nhẹ hơn cả hai ' + lp + ' kia.'
      ];
    }
    const x = VAT[ct.x].ten, u = VAT[ct.u].ten;
    if (ct.kieu === 'doi_qua') return ['Cân nằm ngang thì hai bên nặng bằng nhau.', 'Đếm số ' + u + ' ở đĩa bên kia.', hoa(x) + ' nặng bằng tất cả ' + u + ' trên đĩa kia: đếm 1, 2, 3…'];
    if (ct.kieu === 'cong_qua') return [hoa(x) + ' nặng bằng ' + VAT[ct.a].ten + ' và ' + VAT[ct.b].ten + ' cộng lại.', hoa(VAT[ct.a].ten) + ' nặng bằng ' + ct.na + ' ' + u + ', ' + VAT[ct.b].ten + ' nặng bằng ' + ct.nb + ' ' + u + '.', ct.na + ' + ' + ct.nb + ' = ?'];
    return [hoa(x) + ' nặng bằng ' + ct.k1 + ' ' + VAT[ct.y].ten + '.', 'Mỗi ' + VAT[ct.y].ten + ' nặng bằng ' + ct.k2 + ' ' + u + '.', chuoiLap(ct.k2, ct.k1) + ' = ?'];
  }
  function hinhNN(ct, giai) {
    if (ct.kieu === 'so_sanh') {
      const o = { trai: monCua(ct.trai), phai: monCua(ct.phai), goc: gocTheoLech(ct.lech) };
      if (giai) {
        if (ct.lech === 'bang') { o.nhanTrai = { chu: 'nặng bằng', nen: '#e6faf4', mau: '#0f6b62' }; o.nhanPhai = o.nhanTrai; }
        else { o['nhan' + (ct.lech === 'trai' ? 'Trai' : 'Phai')] = { chu: 'nặng hơn', nen: '#fff4ec', mau: '#d84f1d' }; o['nhan' + (ct.lech === 'trai' ? 'Phai' : 'Trai')] = { chu: 'nhẹ hơn', nen: '#f1ecff', mau: '#4a3494' }; }
      }
      return bocSvg(giai ? [-300, -84, 600, 380] : VB_CAN, veCan(o), 'Cân đĩa: ' + tenBen(ct, 'trai') + ' và ' + tenBen(ct, 'phai'));
    }
    if (ct.kieu === 'thu_tu') {
      const s = ct.can.map(function (c, i) {
        const o = { trai: [{ vat: ct.ds[c[0]], n: 1 }], phai: [{ vat: ct.ds[c[1]], n: 1 }], goc: c[0] < c[1] ? -10 : 10 };
        return canNho(o, i ? 235 : -235, 0, 1, 'Cân ' + (i + 1));
      }).join('');
      return bocSvg([-460, -76, 920, 356], s, 'Hai cân đĩa');
    }
    if (ct.kieu === 'doi_qua') {
      const o = { trai: [{ vat: ct.x, n: 1 }], phai: [{ vat: ct.u, n: ct.n }], goc: 0 };
      if (giai) o.nhanPhai = { chu: ct.n + ' ' + VAT[ct.u].ten, nen: '#fff4ec', mau: '#d84f1d' };
      return bocSvg(giai ? [-300, -84, 600, 380] : VB_CAN, veCan(o), 'Cân thăng bằng: ' + VAT[ct.x].ten + ' và ' + ct.n + ' ' + VAT[ct.u].ten);
    }
    if (ct.kieu === 'cong_qua') {
      const ds = [
        { trai: [{ vat: ct.a, n: 1 }], phai: [{ vat: ct.u, n: ct.na }] },
        { trai: [{ vat: ct.b, n: 1 }], phai: [{ vat: ct.u, n: ct.nb }] },
        { trai: [{ vat: ct.x, n: 1 }], phai: [{ vat: ct.a, n: 1 }, { vat: ct.b, n: 1 }] }
      ];
      const s = ds.map(function (o, i) { return canNho(Object.assign({ goc: 0 }, o), i === 2 ? 0 : i ? 235 : -235, i === 2 ? 350 : 0, 1, 'Cân ' + (i + 1)); }).join('');
      return bocSvg([-460, -76, 920, 706], s, 'Ba cân thăng bằng');
    }
    const ds2 = [
      { trai: [{ vat: ct.y, n: 1 }], phai: [{ vat: ct.u, n: ct.k2 }] },
      { trai: [{ vat: ct.x, n: 1 }], phai: [{ vat: ct.y, n: ct.k1 }] }
    ];
    const s2 = ds2.map(function (o, i) { return canNho(Object.assign({ goc: 0 }, o), i ? 235 : -235, 0, 1, 'Cân ' + (i + 1)); }).join('');
    return bocSvg([-460, -76, 920, 356], s2, 'Hai cân thăng bằng');
  }
  function loiGiaiNN(ct) {
    const d = tinhNN(ct);
    if (ct.kieu === 'so_sanh') {
      const a = tenBen(ct, 'trai'), b = tenBen(ct, 'phai');
      const nang = ct.lech === 'bang' ? null : tenBen(ct, ct.lech), nhe = ct.lech === 'bang' ? null : tenBen(ct, benKhac(ct.lech));
      return {
        ma: 'doc-can-dia',
        buoc: ct.lech === 'bang' ? ['Cân nằm ngang', hoa(a) + ' nặng bằng ' + b] : ['Đĩa có ' + nang + ' thấp hơn: bên đó nặng hơn', hoa(nang) + ' nặng hơn ' + nhe, hoa(nhe) + ' nhẹ hơn ' + nang],
        html: hinhNN(ct, true), kq: d
      };
    }
    if (ct.kieu === 'thu_tu') {
      const buoc = goiYNN(ct)[1].split('. ').map(function (x) { return x.replace(/\.$/, ''); });
      buoc.push('Từ nặng đến nhẹ: ' + ct.ds.map(function (v) { return VAT[v].ten; }).join(', '));
      return { ma: 'so-sanh-hai-can', buoc: buoc, html: hinhNN(ct), kq: d };
    }
    const u = VAT[ct.u].ten;
    if (ct.kieu === 'doi_qua') return { ma: 'doi-qua', buoc: ['Cân nằm ngang: hai bên nặng bằng nhau', 'Đĩa bên kia có ' + ct.n + ' ' + u], html: hinhNN(ct, true), kq: d };
    if (ct.kieu === 'cong_qua') return { ma: 'doi-qua', buoc: [hoa(VAT[ct.a].ten) + ' nặng bằng ' + ct.na + ' ' + u, hoa(VAT[ct.b].ten) + ' nặng bằng ' + ct.nb + ' ' + u, hoa(VAT[ct.x].ten) + ' nặng bằng ' + ct.na + ' + ' + ct.nb + ' = ' + d + ' ' + u], html: hinhNN(ct), kq: d };
    return { ma: 'doi-qua', buoc: [hoa(VAT[ct.x].ten) + ' nặng bằng ' + ct.k1 + ' ' + VAT[ct.y].ten, 'Mỗi ' + VAT[ct.y].ten + ' nặng bằng ' + ct.k2 + ' ' + u, chuoiLap(ct.k2, ct.k1) + ' = ' + d + ' ' + u], html: hinhNN(ct), kq: d };
  }
  function ketLuanNN(ct) {
    if (ct.kieu === 'so_sanh') {
      if (ct.lech === 'bang') return 'Vậy ' + tenBen(ct, 'trai') + ' nặng bằng ' + tenBen(ct, 'phai') + '.';
      return 'Vậy ' + tenBen(ct, ct.lech) + ' nặng hơn ' + tenBen(ct, benKhac(ct.lech)) + '.';
    }
    if (ct.kieu === 'thu_tu') return 'Vậy ' + VAT[ct.ds[0]].ten + ' nặng nhất, ' + VAT[ct.ds[2]].ten + ' nhẹ nhất.';
    return 'Vậy ' + VAT[ct.x].ten + ' nặng bằng ' + tinhNN(ct) + ' ' + VAT[ct.u].ten + '.';
  }
  /** Cảnh chơi của từng kiểu câu trong Xưởng Đo Lường: canh (cân, rót, thước, phân loại, tranh), nhap (cách bé trả lời). */
  function canhNN(ct) {
    if (ct.kieu === 'so_sanh') return { canh: 'can', nhap: 'chon', tuong_tac: false };
    if (ct.kieu === 'doi_qua') return { canh: 'can', nhap: 'chon', tuong_tac: true, don_vi: ct.u };
    return { canh: 'tranh', nhap: 'chon' };
  }
  function goiYGameNN(ct) {
    if (ct.kieu !== 'doi_qua') return null;
    const u = VAT[ct.u].ten;
    return ['Kéo ' + u + ' lên đĩa bên phải cho tới khi cân nằm ngang.', 'Đĩa nào thấp hơn là đĩa nặng hơn: bên ' + u + ' còn nhẹ thì thêm, nặng quá thì bớt.', 'Cân thăng bằng rồi thì đếm số ' + u + ' trên đĩa.'];
  }

  function sinhNangNhe(rng, muc) {
    const kieu = chonMuc(rng, muc, ['so_sanh', 'so_sanh', 'so_sanh', 'thu_tu', 'thu_tu', 'doi_qua', 'doi_qua', 'cong_qua', 'bac_cau']);
    if (kieu === 'so_sanh') {
      const c = chon(rng, CAP_CAN);
      const doi = rng() < 0.5;
      const trai = doi ? c.b : c.a, phai = doi ? c.a : c.b;
      const lech = c.nang === 'bang' ? 'bang' : (c.nang === 'a') !== doi ? 'trai' : 'phai';
      const hoi = chon(rng, c.nang === 'bang' ? ['quan_he', 'quan_he', 'nang'] : ['nang', 'nhe', 'quan_he']);
      const ct = { loai: 'nang_nhe', kieu: 'so_sanh', trai: trai.slice(), phai: phai.slice(), lech: lech, hoi: hoi };
      if (hoi === 'quan_he') ct.chu = rng() < 0.5 ? 'trai' : 'phai';
      return ct;
    }
    if (kieu === 'thu_tu') {
      const ds = chon(rng, BO_BA).slice();
      const c1 = rng() < 0.5 ? [0, 1] : [1, 0], c2 = rng() < 0.5 ? [1, 2] : [2, 1];
      return { loai: 'nang_nhe', kieu: 'thu_tu', ds: ds, can: rng() < 0.5 ? [c1, c2] : [c2, c1], hoi: rng() < 0.55 ? 'nang_nhat' : 'nhe_nhat' };
    }
    if (kieu === 'doi_qua') {
      const m = chon(rng, DOI_QUA);
      return { loai: 'nang_nhe', kieu: 'doi_qua', x: m[0], u: m[1], n: nn(rng, m[2], m[3]) };
    }
    if (kieu === 'cong_qua') {
      const na = nn(rng, 2, 5);
      let nb = nn(rng, 2, 5);
      if (nb === na) nb = na === 5 ? 3 : na + 1;
      return { loai: 'nang_nhe', kieu: 'cong_qua', x: 'buoi', a: 'cam', na: na, b: 'tao', nb: nb, u: 'chanh' };
    }
    return rng() < 0.6
      ? { loai: 'nang_nhe', kieu: 'bac_cau', x: 'cho', y: 'tho', k1: 2, u: 'ga', k2: nn(rng, 2, 3) }
      : { loai: 'nang_nhe', kieu: 'bac_cau', x: 'dua_hau', y: 'buoi', k1: 2, u: 'cam', k2: nn(rng, 2, 3) };
  }

  /* ============================================================
     4. Phần dùng chung: đáp án nhiễu dạng số, phép tính có đơn vị
     ============================================================ */

  /** ung: ứng viên có tên lỗi [{ v, w }]; thêm lệch nhỏ; chọn soNhieu đáp án nhiễu, ưu tiên một lỗi có tên. */
  function nhieuSo(ct, d, ung, nhanBiet, toiThieu, toiDa, rng, soNhieu) {
    const daCo = {};
    daCo[d] = 1;
    const coTen = [], le = [];
    ung.forEach(function (x) {
      const v = x.v;
      if (!Number.isInteger(v) || v < toiThieu || v > toiDa || daCo[v]) return;
      const loi = nhanBiet(ct, v);
      if (!loi.length) return;
      daCo[v] = 1;
      if (loi.every(function (m) { return m === 'khac' || m === 'dem-lech'; })) le.push({ v: v, w: x.w * 0.5 });
      else coTen.push({ v: v, w: x.w });
    });
    [1, -1, 2, -2, 3, -3].forEach(function (k) {
      const v = d + k;
      if (v >= toiThieu && v <= toiDa && !daCo[v]) { daCo[v] = 1; le.push({ v: v, w: Math.abs(k) === 1 ? 1 : Math.abs(k) === 2 ? 0.5 : 0.2 }); }
    });
    const ra = [];
    const lay = function (ds) { const x = NH.chonTheoTrongSo(rng, ds); ds.splice(ds.indexOf(x), 1); ra.push(x.v); };
    if (coTen.length) lay(coTen);
    if (coTen.length && ra.length < soNhieu && rng() < 0.5) lay(coTen);
    while (ra.length < soNhieu && le.length) lay(le);
    while (ra.length < soNhieu && coTen.length) lay(coTen);
    return ra.map(function (v) { return { gia_tri: v, loi: nhanBiet(ct, v) }; });
  }

  function tinhPhep(ct) { return ct.p === '+' ? ct.a + ct.b : ct.a - ct.b; }
  function dePhep(ct) { return ct.a + ' ' + ct.dv + ' ' + (ct.p === '+' ? '+' : TRU) + ' ' + ct.b + ' ' + ct.dv + ' = ? ' + ct.dv; }
  function deDocPhep(ct) { const t = ct.dv === 'l' ? 'lít' : ct.dv === 'kg' ? 'ki-lô-gam' : DV_TEN[ct.dv]; return ct.a + ' ' + t + (ct.p === '+' ? ' cộng ' : ' trừ ') + ct.b + ' ' + t + ' bằng bao nhiêu ' + t + '?'; }
  function maPhep(ct) { return 'tinh:' + ct.a + (ct.p === '+' ? '+' : '-') + ct.b + (ct.dv === 'kg' || ct.dv === 'l' ? '' : ct.dv); }
  function coNho(ct) { return ct.p === '+' ? (ct.a % 10) + (ct.b % 10) >= 10 : (ct.a % 10) < (ct.b % 10); }
  function loiPhep(ct, n) {
    const d = tinhPhep(ct), ma = [];
    const nguoc = ct.p === '+' ? ct.a - ct.b : ct.a + ct.b;
    if (n === nguoc && nguoc >= 0) ma.push('nham-dau');
    if (ct.p === '+' && coNho(ct) && n === d - 10) ma.push('quen-nho');
    if (ct.p === '-' && coNho(ct) && n === d + 10) ma.push('quen-muon');
    if (!ma.length && (Math.abs(n - d) === 1 || Math.abs(n - d) === 10)) ma.push('dem-lech');
    if (!ma.length) ma.push('khac');
    return ma;
  }
  function ungVienPhep(ct) {
    const d = tinhPhep(ct), ds = [{ v: ct.p === '+' ? ct.a - ct.b : ct.a + ct.b, w: 1.5 }];
    if (coNho(ct)) ds.push({ v: ct.p === '+' ? d - 10 : d + 10, w: 3 });
    ds.push({ v: d + 10, w: 0.6 }, { v: d - 10, w: 0.6 });
    return ds;
  }
  function goiYPhep(ct) {
    const bt = ct.a + ' ' + (ct.p === '+' ? '+' : TRU) + ' ' + ct.b;
    const dau1 = 'Tính ' + bt + ' như với các số rồi viết thêm ' + ct.dv + '.';
    if (ct.a < 20 && ct.b < 10 && coNho(ct)) {
      if (ct.p === '+') { const bu = 10 - ct.a; return [dau1, 'Tách ' + ct.b + ' để ' + ct.a + ' được tròn 10: ' + ct.a + ' + ' + bu + ' = 10.', '10 + ' + (ct.b - bu) + ' = ?']; }
      const bot = ct.a - 10; return [dau1, 'Tách ' + ct.b + ' để ' + ct.a + ' về 10: ' + ct.a + ' ' + TRU + ' ' + bot + ' = 10.', '10 ' + TRU + ' ' + (ct.b - bot) + ' = ?'];
    }
    const dvA = ct.a % 10, dvB = ct.b % 10;
    return [dau1,
      (ct.p === '+' ? 'Cộng' : 'Trừ') + ' hàng đơn vị trước: ' + dvA + ' ' + (ct.p === '+' ? '+' : TRU) + ' ' + dvB + (coNho(ct) ? (ct.p === '+' ? ', nhớ 1 sang hàng chục.' : ': mượn 1 chục.') : '.'),
      'Rồi tới hàng chục: ' + Math.floor(ct.a / 10) + ' ' + (ct.p === '+' ? '+' : TRU) + ' ' + Math.floor(ct.b / 10) + (coNho(ct) ? (ct.p === '+' ? ', thêm 1 nhớ.' : ', bớt 1 đã mượn.') : '.')];
  }
  function loiGiaiPhep(ct) {
    const d = tinhPhep(ct);
    const lg = { ma: ct.p === '+' ? 'cong-don-vi-do' : 'tru-don-vi-do', buoc: ['Tính ' + ct.a + ' ' + (ct.p === '+' ? '+' : TRU) + ' ' + ct.b + ' = ' + d, 'Viết thêm đơn vị: ' + d + ' ' + ct.dv], kq: d };
    if (ct.a >= 10 && ct.b >= 10) lg.cot = { tren: ct.a, duoi: ct.b, phep: ct.p === '+' ? '+' : '-', kq: d, nho: coNho(ct), vi_tri_nho: 0 };
    return lg;
  }
  /** Phép tính có đơn vị. coNho100: được có nhớ với số có hai chữ số (sau Bài 19 đến 24). */
  function sinhPhep(rng, dv, coNho100) {
    const kieu = chon(rng, ['qua10', 'chuc', 'hai_so', 'hai_so']);
    for (let thu = 0; thu < 200; thu++) {
      const p = rng() < 0.55 ? '+' : '-';
      let a, b;
      if (kieu === 'qua10') {
        if (p === '+') { a = nn(rng, 2, 9); b = nn(rng, Math.max(2, 11 - a), 9); }
        else { a = nn(rng, 11, 18); b = nn(rng, Math.max(a % 10 + 1, a - 9), 9); }
      } else if (kieu === 'chuc') {
        a = nn(rng, 1, 9) * 10; b = nn(rng, 1, 9) * 10;
        if (p === '+' && a + b > 100) continue;
        if (p === '-' && b >= a) continue;
      } else {
        a = nn(rng, 10, 89); b = nn(rng, 10, 89);
        if (p === '+' && a + b > 99) continue;
        if (p === '-' && b >= a) continue;
        const ct0 = { a: a, p: p, b: b };
        if (!coNho100 && coNho(ct0)) continue;
      }
      return { kieu: 'tinh', a: a, p: p, b: b, dv: dv };
    }
    return { kieu: 'tinh', a: 5, p: '+', b: 4, dv: dv };
  }

  /* ============================================================
     5. Loại 'can_kg': ki-lô-gam (B2.9)
     ============================================================ */

  /** Phân tích số kg thành quả cân 5, 2, 1 kg như SGK (3 kg = 2 kg + 1 kg, 7 kg = 5 kg + 2 kg). */
  function phanTich(kg) {
    const ra = [];
    [5, 2, 1].forEach(function (q) { while (kg >= q) { ra.push(q); kg -= q; } });
    return ra;
  }
  /** Các cách chọn quả cân trên kệ để được đúng dich kg (mỗi cách là dãy số kg giảm dần). */
  function cacCach(ke, dich) {
    const ky = {};
    const n = ke.length;
    for (let m = 1; m < (1 << n); m++) {
      let s = 0;
      const ds = [];
      for (let i = 0; i < n; i++) if (m & (1 << i)) { s += ke[i]; ds.push(ke[i]); }
      if (s === dich) ky[ds.sort(giam).join('+')] = 1;
    }
    return Object.keys(ky);
  }
  /** Quả cân để thêm trên kệ (làm nhiễu) sao cho chỉ có một cách chọn đúng. */
  function keThem(rng, qp, dich) {
    const ung = tron(rng, [[5], [2], [1], [5, 2], [5, 1], [2, 1], [2, 2]]);
    for (let i = 0; i < ung.length; i++) {
      const ke = qp.concat(ung[i]);
      if (ke.length > 5) continue;
      if (cacCach(ke, dich).length === 1) return ung[i].slice().sort(giam);
    }
    return [];
  }
  function tongHop(ct) { return ct.hop.map(tong); }

  function tinhKG(ct) {
    if (ct.kieu === 'can') return tong(ct.qp);
    if (ct.kieu === 'tru') return tong(ct.qp) - tong(ct.qt);
    if (ct.kieu === 'dong_ho') return ct.kg;
    if (ct.kieu === 'so_sanh') {
      const m = tongHop(ct);
      const x = ct.hoi === 'nang_nhat' ? Math.max.apply(null, m) : Math.min.apply(null, m);
      return 'abc'.charAt(m.indexOf(x));
    }
    return tinhPhep(ct);
  }
  function deKG(ct) {
    if (ct.kieu === 'can' || ct.kieu === 'tru' || ct.kieu === 'dong_ho') return hoa(VAT[ct.vat].ten) + ' cân nặng mấy ki-lô-gam?';
    if (ct.kieu === 'so_sanh') return 'Hộp nào ' + (ct.hoi === 'nang_nhat' ? 'nặng nhất' : 'nhẹ nhất') + '?';
    return dePhep(ct);
  }
  function kimDH(ct) { return ct.kg + (ct.qt ? tong(ct.qt) : 0); }
  function deDocKG(ct) {
    if (ct.kieu === 'so_sanh') return 'Ba cân đều nằm thăng bằng. ' + deKG(ct);
    if (ct.kieu === 'dong_ho') return 'Nhìn kim của cân đồng hồ. ' + (ct.qt ? 'Trên cân có ' + VAT[ct.vat].ten + ' và quả cân ' + tong(ct.qt) + ' ki-lô-gam. ' : '') + deKG(ct);
    if (ct.kieu === 'tinh') return deDocPhep(ct);
    return deKG(ct);
  }
  function maKG(ct) {
    if (ct.kieu === 'can') return 'can:' + ct.vat + ':' + ct.qp.join('+');
    if (ct.kieu === 'tru') return 'tru:' + ct.vat + '+' + ct.qt.join('+') + ':' + ct.qp.join('+');
    if (ct.kieu === 'dong_ho') return 'dh:' + ct.vat + (ct.qt ? '+' + ct.qt.join('+') : '') + ':' + kimDH(ct);
    if (ct.kieu === 'so_sanh') return 'ss:' + ct.hoi + ':' + ct.hop.map(function (h) { return h.join('+'); }).join(',');
    return maPhep(ct);
  }
  function nhanBietLoiKG(ct, v) {
    const d = tinhKG(ct);
    if (ct.kieu === 'so_sanh') {
      const x = String(v == null ? '' : v).toLowerCase();
      if (x === d) return [];
      const i = 'abc'.indexOf(x), j = 'abc'.indexOf(d);
      if (x.length !== 1 || i < 0) return ['khac'];
      const m = tongHop(ct), so = ct.hop.map(function (h) { return h.length; });
      const ma = [];
      const nang = ct.hoi === 'nang_nhat';
      if (nang ? so[i] === Math.max.apply(null, so) && so[i] > so[j] : so[i] === Math.min.apply(null, so) && so[i] < so[j]) ma.push('dem-qua-can');
      if (m[i] === (nang ? Math.min.apply(null, m) : Math.max.apply(null, m))) ma.push('chieu-dau');
      if (!ma.length) ma.push('khac');
      return ma;
    }
    const n = soNguyen(v);
    if (n === d) return [];
    if (!Number.isFinite(n)) return ['khac'];
    if (ct.kieu === 'tinh') return loiPhep(ct, n);
    const ma = [];
    if (ct.kieu === 'can') {
      if (n === ct.qp.length) ma.push('dem-qua-can');
      if (ct.qp.length >= 2 && ct.qp.some(function (w) { return n === d - w; })) ma.push('thieu-qua-can');
    } else if (ct.kieu === 'dong_ho') {
      const kim = kimDH(ct);
      if (ct.qt && n === kim) ma.push('quen-can-cung-dia');
      if (ct.qt && n === kim + tong(ct.qt)) ma.push('nham-dau');
      if (!ma.length && Math.abs(n - d) === 1) ma.push('doc-sai-vach');
    } else {
      const R = tong(ct.qp), T = tong(ct.qt);
      if (n === R) ma.push('quen-can-cung-dia');
      if (n === R + T) ma.push('nham-dau');
    }
    if (!ma.length && Math.abs(n - d) === 1) ma.push('dem-lech');
    if (!ma.length) ma.push('khac');
    return ma;
  }
  function loiNoiKG(ct, v, maLoi) {
    const m = (maLoi && maLoi[0]) || 'khac';
    if (m === 'dem-qua-can') return ct.kieu === 'so_sanh' ? 'Nhiều quả cân chưa chắc đã nặng hơn, con cộng số ki-lô-gam nhé' : 'Con đếm số quả cân rồi, phải cộng số ki-lô-gam ghi trên quả cân';
    if (m === 'thieu-qua-can') return 'Con quên cộng một quả cân rồi';
    if (m === 'quen-can-cung-dia') return (ct.kieu === 'dong_ho' ? 'Trên cân' : 'Đĩa') + ' có ' + VAT[ct.vat].ten + ' còn có quả cân ' + tong(ct.qt) + ' kg, con bớt quả cân đó ra nhé';
    if (m === 'doc-sai-vach') return 'Con đọc nhầm sang vạch bên cạnh rồi, nhìn kỹ đầu kim đỏ nhé';
    if (m === 'nham-dau') return ct.kieu === 'tru' ? 'Phải bớt quả cân cùng đĩa chứ không cộng thêm' : ct.p === '+' ? 'Đây là phép cộng nhé' : 'Đây là phép trừ nhé';
    if (m === 'chieu-dau') return 'Đề hỏi hộp ' + (ct.hoi === 'nang_nhat' ? 'nặng nhất' : 'nhẹ nhất') + ' nhé';
    if (m === 'quen-nho') return 'Con quên nhớ 1 rồi';
    if (m === 'quen-muon') return 'Con quên mượn 1 rồi';
    if (m === 'dem-lech') return 'Con tính lệch một chút rồi';
    return 'Chưa đúng rồi';
  }
  function hienKG(v, ct) {
    if (ct && ct.kieu === 'so_sanh') return 'Hộp ' + String(v).toUpperCase();
    const n = soNguyen(v);
    return Number.isFinite(n) ? n + ' kg' : String(v);
  }
  function taoNhieuKG(kyNang, ct, rng) {
    const d = tinhKG(ct);
    if (ct.kieu === 'so_sanh') return tron(rng, ['a', 'b', 'c'].filter(function (x) { return x !== d; })).map(function (v) { return { gia_tri: v, loi: nhanBietLoiKG(ct, v) }; });
    const ung = [];
    if (ct.kieu === 'can') {
      ung.push({ v: ct.qp.length, w: 3 });
      if (ct.qp.length >= 2) ct.qp.forEach(function (w) { ung.push({ v: d - w, w: 1.5 }); });
    } else if (ct.kieu === 'tru') {
      ung.push({ v: tong(ct.qp), w: 3 }, { v: tong(ct.qp) + tong(ct.qt), w: 1.5 });
    } else if (ct.kieu === 'dong_ho') {
      if (ct.qt) ung.push({ v: kimDH(ct), w: 3 }, { v: kimDH(ct) + tong(ct.qt), w: 1 });
      ung.push({ v: d + 1, w: 2 }, { v: d - 1, w: 2 });
    } else return nhieuSo(ct, d, ungVienPhep(ct), nhanBietLoiKG, 0, 100, rng, 2);
    return nhieuSo(ct, d, ung, nhanBietLoiKG, 1, 20, rng, 2);
  }
  function chuoiKg(ds) { return ds.map(function (w) { return w + ' kg'; }).join(' + '); }
  function goiYKG(ct) {
    if (ct.kieu === 'can') {
      const x = VAT[ct.vat].ten;
      return ['Cân nằm ngang thì ' + x + ' nặng bằng các quả cân bên kia.', 'Cộng số ki-lô-gam ghi trên từng quả cân, không đếm số quả cân.', ct.qp.length > 1 ? chuoiKg(ct.qp) + ' = ? kg' : 'Quả cân ghi ' + ct.qp[0] + ' kg.'];
    }
    if (ct.kieu === 'tru') {
      const R = tong(ct.qp), T = tong(ct.qt);
      return ['Cân nằm ngang: hai bên nặng bằng nhau.', 'Bên kia nặng ' + R + ' kg. Bên này có ' + VAT[ct.vat].ten + ' và quả cân ' + T + ' kg.', R + ' kg ' + TRU + ' ' + T + ' kg = ? kg'];
    }
    if (ct.kieu === 'dong_ho') {
      const kim = kimDH(ct), T = ct.qt ? tong(ct.qt) : 0;
      return ['Kim đỏ chỉ vào số nào thì đồ trên cân nặng bấy nhiêu ki-lô-gam.', T ? 'Trên cân còn có quả cân ' + T + ' kg cùng với ' + VAT[ct.vat].ten + '.' : 'Mỗi vạch có số cách nhau 1 kg, vạch nhỏ ở giữa là nửa ki-lô-gam.', T ? 'Kim chỉ ' + kim + ' kg. ' + kim + ' kg ' + TRU + ' ' + T + ' kg = ? kg' : 'Nhìn kỹ đầu kim đỏ: nó chỉ đúng vào một số.'];
    }
    if (ct.kieu === 'so_sanh') {
      const m = tongHop(ct);
      return ['Mỗi hộp nặng bằng các quả cân cùng cân với nó.', 'Cộng số ki-lô-gam của từng hộp, đừng đếm số quả cân.', 'Hộp A ' + m[0] + ' kg, hộp B ' + m[1] + ' kg, hộp C ' + m[2] + ' kg.'];
    }
    return goiYPhep(ct);
  }
  function hinhKG(ct, giai) {
    if (ct.kieu === 'can' || ct.kieu === 'tru') {
      const trai = [{ vat: ct.vat, n: 1 }].concat(ct.kieu === 'tru' ? ct.qt.map(function (w) { return { kg: w }; }) : []);
      const o = { trai: trai, phai: ct.qp.map(function (w) { return { kg: w }; }), goc: 0 };
      if (giai) {
        const d = tinhKG(ct);
        o.nhanPhai = { chu: ct.qp.length > 1 ? chuoiKg(ct.qp).replace(/ kg/g, '') + ' = ' + tong(ct.qp) + ' kg' : tong(ct.qp) + ' kg', nen: '#fff4ec', mau: '#d84f1d' };
        o.nhanTrai = { chu: VAT[ct.vat].ten + ': ' + d + ' kg', nen: '#e6faf4', mau: '#0f6b62' };
      }
      return bocSvg(giai ? [-300, -84, 600, 380] : VB_CAN, veCan(o), 'Cân thăng bằng: ' + VAT[ct.vat].ten + ' và các quả cân ' + chuoiKg(ct.qp));
    }
    if (ct.kieu === 'dong_ho') {
      const kim = kimDH(ct);
      return bocSvg([-180, -270, 360, 440], veCanDongHo({ vat: ct.vat, qt: ct.qt, kim: kim, nhan: giai ? 'Kim chỉ ' + kim + ' kg' : null }), 'Cân đồng hồ có ' + VAT[ct.vat].ten + (ct.qt ? ' và quả cân ' + tong(ct.qt) + ' kg' : ''));
    }
    if (ct.kieu === 'so_sanh') {
      const m = tongHop(ct);
      const s = ct.hop.map(function (h, i) {
        const o = { trai: [{ hop: 'abc'.charAt(i) }], phai: h.map(function (w) { return { kg: w }; }), goc: 0 };
        if (giai) o.nhanPhai = { chu: m[i] + ' kg', nen: '#fff4ec', mau: '#d84f1d', co: 30 };
        return canNho(o, i === 2 ? 0 : i ? 235 : -235, i === 2 ? 350 : 0, 1, 'Hộp ' + 'ABC'.charAt(i));
      }).join('');
      return bocSvg([-460, -76, 920, 706], s, 'Ba cân thăng bằng: hộp A, hộp B, hộp C');
    }
    return '';
  }
  function loiGiaiKG(ct) {
    const d = tinhKG(ct);
    if (ct.kieu === 'can') return { ma: 'can-qua-can', buoc: ['Cân nằm ngang: ' + VAT[ct.vat].ten + ' nặng bằng các quả cân', (ct.qp.length > 1 ? chuoiKg(ct.qp) + ' = ' : '') + d + ' kg'], html: hinhKG(ct, true), kq: d };
    if (ct.kieu === 'tru') {
      const R = tong(ct.qp), T = tong(ct.qt);
      return { ma: 'can-bot-qua-can', buoc: ['Bên phải nặng ' + (ct.qp.length > 1 ? chuoiKg(ct.qp) + ' = ' : '') + R + ' kg', hoa(VAT[ct.vat].ten) + ' và quả cân ' + T + ' kg nặng bằng ' + R + ' kg', R + ' kg ' + TRU + ' ' + T + ' kg = ' + d + ' kg'], html: hinhKG(ct, true), kq: d };
    }
    if (ct.kieu === 'dong_ho') {
      const kim = kimDH(ct), T = ct.qt ? tong(ct.qt) : 0;
      return { ma: 'doc-can-dong-ho', buoc: ['Kim đỏ chỉ số ' + kim + ': trên cân có ' + kim + ' kg'].concat(T ? [kim + ' kg ' + TRU + ' ' + T + ' kg = ' + d + ' kg'] : []).concat([hoa(VAT[ct.vat].ten) + ' cân nặng ' + d + ' kg']), html: hinhKG(ct, true), kq: d };
    }
    if (ct.kieu === 'so_sanh') {
      const m = tongHop(ct);
      return { ma: 'so-sanh-kg', buoc: ct.hop.map(function (h, i) { return 'Hộp ' + 'ABC'.charAt(i) + ': ' + (h.length > 1 ? chuoiKg(h) + ' = ' : '') + m[i] + ' kg'; }), html: hinhKG(ct, true), kq: d };
    }
    return loiGiaiPhep(ct);
  }
  function ketLuanKG(ct) {
    const d = tinhKG(ct);
    if (ct.kieu === 'can' || ct.kieu === 'tru' || ct.kieu === 'dong_ho') return 'Vậy ' + VAT[ct.vat].ten + ' cân nặng ' + d + ' kg.';
    if (ct.kieu === 'so_sanh') return 'Vậy hộp ' + d.toUpperCase() + ' ' + (ct.hoi === 'nang_nhat' ? 'nặng nhất' : 'nhẹ nhất') + '.';
    return 'Vậy ' + dePhep(ct).replace('? ' + ct.dv, d + ' ' + ct.dv) + '.';
  }
  function canhKG(ct) {
    if (ct.kieu === 'can' || ct.kieu === 'tru') return { canh: 'can', nhap: 'chon', tuong_tac: !ct.dat };
    if (ct.kieu === 'so_sanh') return { canh: 'tranh', nhap: 'chon' };
    return { canh: 'tranh', nhap: 'so', don_vi: 'kg' };
  }
  function goiYGameKG(ct) {
    if ((ct.kieu !== 'can' && ct.kieu !== 'tru') || ct.dat) return null;
    return ['Kéo quả cân lên đĩa bên phải. Đĩa nào thấp hơn là đĩa nặng hơn.', 'Bên quả cân còn nhẹ thì thêm quả cân, nặng quá thì bỏ bớt.', ct.kieu === 'tru' ? 'Cân thăng bằng rồi thì lấy số ki-lô-gam bên phải bớt đi quả cân ' + tong(ct.qt) + ' kg.' : 'Cân thăng bằng rồi thì cộng số ki-lô-gam trên các quả cân.'];
  }

  function sinhCanKg(rng, muc) {
    const kieu = chonMuc(rng, muc, ['can', 'can', 'can', 'can', 'tru', 'dong_ho', 'so_sanh', 'tinh', 'tinh']);
    const mc = laChonDapAn(muc);
    if (kieu === 'can') {
      const v = chon(rng, VAT_KG);
      const kg = nn(rng, v[1], v[2]);
      const ct = { loai: 'can_kg', kieu: 'can', vat: v[0], qp: phanTich(kg) };
      if (mc || rng() < 0.3) ct.dat = 1; else ct.ke = keThem(rng, ct.qp, kg);
      return ct;
    }
    if (kieu === 'tru') {
      const v = chon(rng, VAT_KG_TRU);
      const x = nn(rng, v[1], v[2]), T = chon(rng, [1, 2]);
      const ct = { loai: 'can_kg', kieu: 'tru', vat: v[0], qt: [T], qp: phanTich(x + T) };
      if (mc || rng() < 0.4) ct.dat = 1; else ct.ke = keThem(rng, ct.qp, x + T);
      return ct;
    }
    if (kieu === 'dong_ho') {
      // cân đồng hồ mặt số 0 đến 7 kg; đôi khi có thêm quả cân 1 kg trên bàn cân (Bài 35)
      const v = chon(rng, VAT_KG.filter(function (x) { return x[1] <= 6; }));
      const coQua = rng() < 0.35;
      const kg = nn(rng, v[1], Math.min(v[2], coQua ? 6 : 7));
      const ct = { loai: 'can_kg', kieu: 'dong_ho', vat: v[0], kg: kg };
      if (coQua) ct.qt = [1];
      return ct;
    }
    if (kieu === 'so_sanh') {
      for (let thu = 0; thu < 80; thu++) {
        const hop = [0, 1, 2].map(function () {
          const k = nn(rng, 1, 3), ds = [];
          for (let i = 0; i < k; i++) ds.push(chon(rng, [1, 2, 2, 5]));
          return ds.sort(giam);
        });
        const m = hop.map(tong);
        if (new Set(m).size < 3 || Math.max.apply(null, m) > 12) continue;
        const ct = { loai: 'can_kg', kieu: 'so_sanh', hop: hop, hoi: rng() < 0.6 ? 'nang_nhat' : 'nhe_nhat' };
        const d = tinhKG(ct);
        const coBay = ['a', 'b', 'c'].some(function (x) { return x !== d && nhanBietLoiKG(ct, x).indexOf('dem-qua-can') >= 0; });
        if (!coBay && thu < 60) continue;
        return ct;
      }
      return { loai: 'can_kg', kieu: 'so_sanh', hop: [[2, 1], [2, 2], [5]], hoi: 'nang_nhat' };
    }
    return Object.assign({ loai: 'can_kg' }, sinhPhep(rng, 'kg', !!(muc && muc.co_nho)));
  }

  /* ============================================================
     6. Loại 'rot_lit': lít (B2.10)
     ============================================================ */

  function tenBinh(ct) { return BINH[ct.vat] ? BINH[ct.vat].ten : 'bình'; }
  function tinhRL(ct) {
    if (ct.kieu === 'rot' || ct.kieu === 'vach' || ct.kieu === 'doc') return ct.l;
    if (ct.kieu === 'so_sanh') {
      if (ct.hoi === 'hon') return Math.abs(ct.a - ct.b);
      return (ct.hoi === 'nhieu') === (ct.a > ct.b) ? 'a' : 'b';
    }
    if (ct.kieu === 'tong') return tong(ct.ds);
    if (ct.kieu === 'don_vi') return DON_VI_KL[ct.vat].dv;
    return tinhPhep(ct);
  }
  function deRL(ct) {
    if (ct.kieu === 'rot') return hoa(tenBinh(ct)) + ' đựng được mấy lít nước?';
    if (ct.kieu === 'vach') return 'Rót nước vào bình tới vạch ' + ct.l + ' l.';
    if (ct.kieu === 'doc') return 'Trong bình có mấy lít nước?';
    if (ct.kieu === 'so_sanh') {
      if (ct.hoi === 'hon') { const lon = ct.a > ct.b ? 'A' : 'B', be = ct.a > ct.b ? 'B' : 'A'; return 'Bình ' + lon + ' đựng nhiều hơn bình ' + be + ' mấy cốc nước?'; }
      return 'Bình nào đựng ' + (ct.hoi === 'nhieu' ? 'nhiều' : 'ít') + ' nước hơn?';
    }
    if (ct.kieu === 'tong') return 'Đổ các ca vào ' + tenBinh(ct) + ' thì vừa đầy. ' + hoa(tenBinh(ct)) + ' đựng mấy lít?';
    if (ct.kieu === 'don_vi') { const x = DON_VI_KL[ct.vat]; return hoa(x.ten) + ' ' + x.dong + ' ' + x.so + ' ?'; }
    return dePhep(ct);
  }
  function deDocRL(ct) {
    if (ct.kieu === 'so_sanh') return 'Rót hết nước ở mỗi bình ra các cốc như hình. ' + deRL(ct);
    if (ct.kieu === 'rot') return 'Rót nước bằng ca 1 lít cho đến khi đầy ' + tenBinh(ct) + '. ' + deRL(ct);
    if (ct.kieu === 'don_vi') { const x = DON_VI_KL[ct.vat]; return hoa(x.ten) + ' ' + x.dong + ' ' + x.so + ' gì? Lít, ki-lô-gam hay xăng-ti-mét?'; }
    if (ct.kieu === 'tinh') return deDocPhep(ct);
    return deRL(ct).replace(/ l\./, ' lít.');
  }
  function maRL(ct) {
    if (ct.kieu === 'rot') return 'rot:' + ct.vat + ',' + ct.l;
    if (ct.kieu === 'vach') return 'vach:' + ct.l + ',' + ct.max;
    if (ct.kieu === 'doc') return 'doc:' + ct.l + ',' + ct.max + ',' + ct.buoc;
    if (ct.kieu === 'so_sanh') return 'ss:' + ct.hoi + ':' + ct.a + ',' + ct.b;
    if (ct.kieu === 'tong') return 'tong:' + ct.vat + ':' + ct.ds.join('+');
    if (ct.kieu === 'don_vi') return 'dv:' + ct.vat + ',' + DON_VI_KL[ct.vat].so;
    return maPhep(ct);
  }
  function nhanBietLoiRL(ct, v) {
    const d = tinhRL(ct);
    if (ct.kieu === 'don_vi') {
      const x = String(v == null ? '' : v).trim();
      if (x === d) return [];
      return ['l', 'kg', 'cm', 'dm', 'm', 'km'].indexOf(x) >= 0 ? ['nham-don-vi'] : ['khac'];
    }
    if (ct.kieu === 'so_sanh' && ct.hoi !== 'hon') {
      const x = String(v == null ? '' : v).toLowerCase();
      if (x === d) return [];
      if (x === 'a' || x === 'b') return ['cao-hon-nhieu-hon'];
      return ['khac'];
    }
    const n = soNguyen(v);
    if (n === d) return [];
    if (!Number.isFinite(n)) return ['khac'];
    if (ct.kieu === 'tinh') return loiPhep(ct, n);
    const ma = [];
    if (ct.kieu === 'vach' && Math.abs(n - d) === 1) ma.push('doc-sai-vach');
    if (ct.kieu === 'doc') {
      if (ct.buoc === 2 && n * 2 === d) ma.push('dem-vach');
      if (Math.abs(n - d) === ct.buoc) ma.push('doc-sai-vach');
    }
    if (ct.kieu === 'so_sanh' && n === ct.a + ct.b) ma.push('nham-dau');
    if (ct.kieu === 'tong' && n === ct.ds.length) ma.push('dem-so-ca');
    if (!ma.length && Math.abs(n - d) === 1) ma.push('dem-lech');
    if (!ma.length) ma.push('khac');
    return ma;
  }
  function loiNoiRL(ct, v, maLoi) {
    const m = (maLoi && maLoi[0]) || 'khac';
    if (m === 'nham-don-vi') return DON_VI_KL[ct.vat].dv === 'l' ? 'Nước đong bằng lít (l) con nhé' : 'Muốn biết nặng bao nhiêu thì cân bằng ki-lô-gam (kg) con nhé';
    if (m === 'cao-hon-nhieu-hon') return 'Bình cao hơn chưa chắc đựng nhiều hơn, con đếm số cốc nhé';
    if (m === 'doc-sai-vach') return ct.kieu === 'vach' ? 'Con rót tới vạch bên cạnh rồi, mỗi ca 1 l là một vạch' : 'Con đọc nhầm sang vạch bên cạnh rồi';
    if (m === 'dem-vach') return 'Mỗi vạch là 2 l, con đọc số ghi ở vạch nhé';
    if (m === 'dem-so-ca') return 'Con đếm số ca rồi, phải cộng số lít ghi trên các ca';
    if (m === 'nham-dau') return ct.kieu === 'so_sanh' ? 'Nhiều hơn mấy cốc thì lấy số cốc nhiều trừ số cốc ít' : ct.p === '+' ? 'Đây là phép cộng nhé' : 'Đây là phép trừ nhé';
    if (m === 'quen-nho') return 'Con quên nhớ 1 rồi';
    if (m === 'quen-muon') return 'Con quên mượn 1 rồi';
    if (m === 'dem-lech') return ct.kieu === 'rot' ? 'Con đếm lại số ca 1 l nhé' : ct.kieu === 'so_sanh' ? 'Con đếm lại số cốc nhé' : 'Con tính lệch một chút rồi';
    return 'Chưa đúng rồi';
  }
  function hienRL(v, ct) {
    if (ct && ct.kieu === 'don_vi') return DON_VI_KL[ct.vat].so + ' ' + v;
    if (ct && ct.kieu === 'so_sanh' && ct.hoi !== 'hon') return v === 'bang' ? 'Bằng nhau' : 'Bình ' + String(v).toUpperCase();
    const n = soNguyen(v);
    if (!Number.isFinite(n)) return String(v);
    return n + (ct && ct.kieu === 'so_sanh' ? ' cốc' : ' l');
  }
  function taoNhieuRL(kyNang, ct, rng) {
    const d = tinhRL(ct);
    if (ct.kieu === 'don_vi') return tron(rng, ['l', 'kg', 'cm'].filter(function (x) { return x !== d; })).map(function (v) { return { gia_tri: v, loi: nhanBietLoiRL(ct, v) }; });
    if (ct.kieu === 'so_sanh' && ct.hoi !== 'hon') return tron(rng, ['a', 'b', 'bang'].filter(function (x) { return x !== d; })).map(function (v) { return { gia_tri: v, loi: nhanBietLoiRL(ct, v) }; });
    if (ct.kieu === 'tinh') return nhieuSo(ct, d, ungVienPhep(ct), nhanBietLoiRL, 0, 100, rng, 2);
    const ung = [];
    if (ct.kieu === 'vach') ung.push({ v: d - 1, w: 2 }, { v: d + 1, w: 2 });
    if (ct.kieu === 'doc') { if (ct.buoc === 2) ung.push({ v: d / 2, w: 3 }); ung.push({ v: d - ct.buoc, w: 2 }, { v: d + ct.buoc, w: 2 }); }
    if (ct.kieu === 'so_sanh') ung.push({ v: ct.a + ct.b, w: 2 });
    if (ct.kieu === 'tong') ung.push({ v: ct.ds.length, w: 3 });
    return nhieuSo(ct, d, ung, nhanBietLoiRL, 1, 30, rng, 2);
  }
  function goiYRL(ct) {
    const ten = tenBinh(ct);
    if (ct.kieu === 'rot') return ['Mỗi ca đựng 1 l nước.', 'Đếm số ca 1 l rót vừa đầy ' + ten + '.', 'Rót được bao nhiêu ca 1 l thì ' + ten + ' đựng bấy nhiêu lít.'];
    if (ct.kieu === 'vach') return ['Mỗi lần rót một ca 1 l, mặt nước lên thêm một vạch.', ct.l % 2 ? 'Vạch ' + ct.l + ' l không ghi số: nó nằm ngay trên vạch ' + (ct.l - 1) + ' l.' : 'Vạch ' + ct.l + ' l có ghi số ' + ct.l + '.', 'Rót đủ ' + ct.l + ' ca 1 l thì tới vạch ' + ct.l + ' l.'];
    if (ct.kieu === 'doc') return ['Nhìn xem mặt nước ngang với vạch nào.', ct.buoc === 2 ? 'Mỗi vạch cách nhau 2 l. Đọc số ghi ở vạch, không đếm số vạch.' : 'Mỗi vạch là 1 l. Vạch không ghi số nằm giữa hai vạch có số.', ct.buoc === 2 ? 'Số ghi ở vạch ngang mặt nước là số lít.' : ct.l % 2 ? 'Mặt nước ở ngay trên vạch ' + (ct.l - 1) + ' l.' : 'Mặt nước ngang một vạch có ghi số.'];
    if (ct.kieu === 'so_sanh') return ['Bình nào rót ra được nhiều cốc hơn thì đựng nhiều nước hơn.', 'Bình A rót được ' + ct.a + ' cốc, bình B rót được ' + ct.b + ' cốc.', ct.hoi === 'hon' ? Math.max(ct.a, ct.b) + ' ' + TRU + ' ' + Math.min(ct.a, ct.b) + ' = ?' : 'So sánh ' + ct.a + ' cốc và ' + ct.b + ' cốc.'];
    if (ct.kieu === 'tong') return ['Cộng số lít ghi trên các ca, không đếm số ca.', ct.ds.map(function (x) { return x + ' l'; }).join(' + '), ct.ds.join(' + ') + ' = ?'];
    if (ct.kieu === 'don_vi') return ['Nước, dầu, sữa đong bằng lít, viết tắt là l.', 'Muốn biết một vật nặng bao nhiêu thì cân, đơn vị là ki-lô-gam, viết tắt là kg.', 'Xăng-ti-mét (cm) dùng để đo độ dài.'];
    return goiYPhep(ct);
  }
  function hangCoc(n, x0, y0, moiHang) {
    let s = '';
    for (let i = 0; i < n; i++) s += veCoc(x0 + (i % moiHang) * 38, y0 + Math.floor(i / moiHang) * 50);
    return s;
  }
  function hinhRL(ct, giai) {
    if (ct.kieu === 'rot') {
      let s = '<g transform="translate(130 300)">' + veBinh({ loai: ct.vat, max: ct.l, nuoc: ct.l, day: true }) + '</g>';
      const moi = ct.l > 5 ? 5 : ct.l;
      for (let i = 0; i < ct.l; i++) s += '<g transform="translate(' + (300 + (i % moi) * 80) + ' ' + (170 + Math.floor(i / moi) * 110) + ') scale(.9)">' + veCa('1 l', 1) + '</g>';
      if (giai) s += nhanTron(130, 350, ct.l + ' ca 1 l = ' + ct.l + ' l', '#fff4ec', '#d84f1d', 24);
      return bocSvg([0, 20, 720, giai ? 360 : 330], s, 'Rót nước từ ' + tenBinh(ct) + ' ra được ' + ct.l + ' ca 1 lít');
    }
    if (ct.kieu === 'vach' || ct.kieu === 'doc') {
      const buoc = ct.kieu === 'doc' ? ct.buoc : 1;
      const nuoc = ct.kieu === 'doc' || giai ? ct.l : 0;
      let s = '<g transform="translate(220 320)">' + veBinh({ loai: 'binh', max: ct.max, nuoc: nuoc, vach: buoc, ghi: buoc === 2 ? 2 : 2, rong: 170, cao: 280, danhDau: ct.kieu === 'vach' ? ct.l : null }) + '</g>';
      if (giai) {
        const y = 320 + mucNuoc(ct.l, ct.max, 280);
        s += '<path d="M330 ' + y + ' l24 -14 v28 Z" fill="#06b389"/>' + nhanTron(420, y, ct.l + ' l', '#e6faf4', '#0f6b62', 26);
      }
      return bocSvg([40, 0, 440, 345], s, 'Bình có vạch chia lít');
    }
    if (ct.kieu === 'so_sanh') {
      const itA = ct.a < ct.b;
      const bA = itA ? { rong: 84, cao: 210 } : { rong: 140, cao: 130 };
      const bB = itA ? { rong: 140, cao: 130 } : { rong: 84, cao: 210 };
      let s = '<g transform="translate(90 290)">' + veBinh({ loai: 'binh', max: 1, nuoc: 0.85, rong: bA.rong, cao: bA.cao, chu: 'A' }) + '</g>';
      s += hangCoc(ct.a, 90 + bA.rong / 2 + 62, 200, 4);
      s += '<g transform="translate(470 290)">' + veBinh({ loai: 'binh', max: 1, nuoc: 0.85, rong: bB.rong, cao: bB.cao, chu: 'B' }) + '</g>';
      s += hangCoc(ct.b, 470 + bB.rong / 2 + 62, 200, 4);
      if (giai) s += nhanTron(90, 330, ct.a + ' cốc', '#fff4ec', '#d84f1d', 24) + nhanTron(470, 330, ct.b + ' cốc', '#fff4ec', '#d84f1d', 24);
      return bocSvg([0, 50, 800, giai ? 305 : 280], s, 'Bình A rót được ' + ct.a + ' cốc, bình B rót được ' + ct.b + ' cốc');
    }
    if (ct.kieu === 'tong') {
      let s = '<g transform="translate(130 300)">' + veBinh({ loai: ct.vat, max: 1, nuoc: giai ? 1 : 0, day: true }) + '</g>';
      ct.ds.forEach(function (x, i) { s += '<g transform="translate(' + (320 + i * 120) + ' 290) scale(' + (0.9 + x * 0.06) + ')">' + veCa(x + ' l', 1) + '</g>'; });
      if (giai) s += nhanTron(130, 340, ct.ds.join(' + ') + ' = ' + tong(ct.ds) + ' l', '#fff4ec', '#d84f1d', 24);
      return bocSvg([0, 40, 320 + ct.ds.length * 120, giai ? 330 : 300], s, hoa(tenBinh(ct)) + ' và các ca ' + ct.ds.join(' l, ') + ' l');
    }
    if (ct.kieu === 'don_vi') {
      const x = DON_VI_KL[ct.vat];
      const s = x.binh ? '<g transform="translate(160 290)">' + veBinh({ loai: x.binh, max: 1, nuoc: 0.8, mau: x.mau, rong: BINH[x.binh].rong * 0.9, cao: BINH[x.binh].cao * 0.9 }) + '</g>'
        : emojiSvg(160, 260, x.e, 140);
      return bocSvg([0, 40, 320, 280], s, hoa(x.ten));
    }
    return '';
  }
  function loiGiaiRL(ct) {
    const d = tinhRL(ct);
    if (ct.kieu === 'rot') return { ma: 'rot-ca-1l', buoc: ['Mỗi ca đựng 1 l', 'Rót được ' + ct.l + ' ca 1 l thì đầy ' + tenBinh(ct), hoa(tenBinh(ct)) + ' đựng ' + ct.l + ' l nước'], html: hinhRL(ct, true), kq: d };
    if (ct.kieu === 'vach') return { ma: 'rot-toi-vach', buoc: ['Mỗi ca 1 l làm mặt nước lên một vạch', 'Rót ' + ct.l + ' ca 1 l thì mặt nước tới vạch ' + ct.l + ' l'], html: hinhRL(ct, true), kq: d };
    if (ct.kieu === 'doc') return { ma: 'doc-vach-lit', buoc: [ct.buoc === 2 ? 'Mỗi vạch cách nhau 2 l' : 'Mỗi vạch là 1 l', 'Mặt nước ngang vạch ' + ct.l + ' l'], html: hinhRL(ct, true), kq: d };
    if (ct.kieu === 'so_sanh') {
      const lon = ct.a > ct.b ? 'A' : 'B', be = ct.a > ct.b ? 'B' : 'A';
      return { ma: 'so-sanh-luong-nuoc', buoc: ['Bình A: ' + ct.a + ' cốc, bình B: ' + ct.b + ' cốc', 'Bình ' + lon + ' đựng nhiều nước hơn bình ' + be].concat(ct.hoi === 'hon' ? [Math.max(ct.a, ct.b) + ' ' + TRU + ' ' + Math.min(ct.a, ct.b) + ' = ' + d + ' cốc'] : []), html: hinhRL(ct, true), kq: d };
    }
    if (ct.kieu === 'tong') return { ma: 'cong-lit', buoc: ['Cộng số lít của các ca', ct.ds.map(function (x) { return x + ' l'; }).join(' + ') + ' = ' + d + ' l'], html: hinhRL(ct, true), kq: d };
    if (ct.kieu === 'don_vi') { const x = DON_VI_KL[ct.vat]; return { ma: 'don-vi-kg-lit', buoc: [x.dv === 'l' ? 'Nước đựng trong ' + x.ten + ' đong bằng lít' : 'Muốn biết ' + x.ten + ' nặng bao nhiêu thì cân, đơn vị là ki-lô-gam', hoa(x.ten) + ' ' + x.dong + ' ' + x.so + ' ' + x.dv], html: hinhRL(ct), kq: d }; }
    return loiGiaiPhep(ct);
  }
  function ketLuanRL(ct) {
    const d = tinhRL(ct);
    if (ct.kieu === 'rot') return 'Vậy ' + tenBinh(ct) + ' đựng được ' + d + ' l nước.';
    if (ct.kieu === 'vach') return 'Vậy rót ' + d + ' ca 1 l thì tới vạch ' + d + ' l.';
    if (ct.kieu === 'doc') return 'Vậy trong bình có ' + d + ' l nước.';
    if (ct.kieu === 'so_sanh') {
      const lon = ct.a > ct.b ? 'A' : 'B', be = ct.a > ct.b ? 'B' : 'A';
      if (ct.hoi === 'hon') return 'Vậy bình ' + lon + ' đựng nhiều hơn bình ' + be + ' ' + d + ' cốc nước.';
      return 'Vậy bình ' + d.toUpperCase() + ' đựng ' + (ct.hoi === 'nhieu' ? 'nhiều' : 'ít') + ' nước hơn.';
    }
    if (ct.kieu === 'tong') return 'Vậy ' + tenBinh(ct) + ' đựng ' + d + ' l nước.';
    if (ct.kieu === 'don_vi') { const x = DON_VI_KL[ct.vat]; return 'Vậy ' + x.ten + ' ' + x.dong + ' ' + x.so + ' ' + x.dv + '.'; }
    return 'Vậy ' + dePhep(ct).replace('? ' + ct.dv, d + ' ' + ct.dv) + '.';
  }
  function canhRL(ct) {
    if (ct.kieu === 'rot') return { canh: 'rot', nhap: 'chon', tuong_tac: true };
    if (ct.kieu === 'vach') return { canh: 'rot', nhap: 'xong', tuong_tac: true };
    if (ct.kieu === 'tinh') return { canh: 'tranh', nhap: 'so', don_vi: 'l' };
    return { canh: 'tranh', nhap: 'chon' };
  }
  function goiYGameRL(ct) {
    if (ct.kieu === 'rot') return ['Chạm nút Rót để đổ từng ca 1 l vào ' + tenBinh(ct) + ' cho đến khi đầy.', 'Mỗi ca là 1 l. Đếm số ca con đã rót ở hàng dưới.', 'Rót được bao nhiêu ca 1 l thì ' + tenBinh(ct) + ' đựng bấy nhiêu lít.'];
    if (ct.kieu === 'vach') return ['Mỗi lần rót một ca 1 l, mặt nước lên thêm một vạch.', ct.l % 2 ? 'Vạch ' + ct.l + ' l không ghi số: nó nằm ngay trên vạch ' + (ct.l - 1) + ' l.' : 'Vạch ' + ct.l + ' l có ghi số ' + ct.l + '.', 'Vạch cần rót tới có ngôi sao. Rót quá thì bấm Bớt 1 l.'];
    return null;
  }

  function sinhRotLit(rng, muc) {
    let kieu = chonMuc(rng, muc, ['rot', 'rot', 'rot', 'vach', 'vach', 'doc', 'so_sanh', 'tong', 'tinh', 'don_vi']);
    if (kieu === 'vach' && laChonDapAn(muc)) kieu = 'doc';
    if (kieu === 'rot') {
      const l = nn(rng, 2, 10);
      return { loai: 'rot_lit', kieu: 'rot', vat: l <= 4 ? chon(rng, ['binh', 'am']) : l <= 7 ? 'can' : 'xo', l: l };
    }
    if (kieu === 'vach') {
      const max = chon(rng, [6, 8, 10]);
      let l = nn(rng, 2, max - 1);
      if (l % 2 === 0 && rng() < 0.5) l = l + 1 < max ? l + 1 : l - 1;
      return { loai: 'rot_lit', kieu: 'vach', l: l, max: max };
    }
    if (kieu === 'doc') {
      if (rng() < 0.35) return { loai: 'rot_lit', kieu: 'doc', l: chon(rng, [2, 4, 6, 8]), max: 10, buoc: 2 };
      const max = chon(rng, [6, 8, 10]);
      let l = nn(rng, 1, max - 1);
      if (l % 2 === 0 && rng() < 0.5) l = l + 1 < max ? l + 1 : l - 1;
      return { loai: 'rot_lit', kieu: 'doc', l: l, max: max, buoc: 1 };
    }
    if (kieu === 'so_sanh') {
      const a = nn(rng, 2, 10);
      let b = nn(rng, 2, 10);
      if (b === a) b = a === 10 ? 7 : a + 1;
      return { loai: 'rot_lit', kieu: 'so_sanh', a: a, b: b, hoi: chon(rng, ['nhieu', 'it', 'hon']) };
    }
    if (kieu === 'tong') {
      for (;;) {
        const k = nn(rng, 2, 3), ds = [];
        for (let i = 0; i < k; i++) ds.push(chon(rng, [1, 2, 2, 3, 5]));
        if (tong(ds) === k || tong(ds) > 12) continue;
        return { loai: 'rot_lit', kieu: 'tong', vat: chon(rng, ['xo', 'can', 'binh']), ds: ds.sort(giam) };
      }
    }
    if (kieu === 'don_vi') return { loai: 'rot_lit', kieu: 'don_vi', vat: chon(rng, Object.keys(DON_VI_KL)) };
    return Object.assign({ loai: 'rot_lit' }, sinhPhep(rng, 'l', !!(muc && muc.co_nho)));
  }

  /* ============================================================
     7. Loại 'don_vi_dai': đề-xi-mét, mét, ki-lô-mét (B2.6)
     ============================================================ */

  /** Số lần đơn vị lớn gấp đơn vị nhỏ (1 m = 100 cm). */
  function heSo(tu, den) { return DV_CM[tu] / DV_CM[den]; }
  function tinhDV(ct) {
    if (ct.kieu === 'chon_don_vi') return VAT_DAI[ct.vat].dv;
    if (ct.kieu === 'doi') return Math.round(ct.so * heSo(ct.tu, ct.den));
    if (ct.kieu === 'so_sanh') return dau(ct.a[0] * DV_CM[ct.a[1]], ct.b[0] * DV_CM[ct.b[1]]);
    return tinhPhep(ct);
  }
  function deDV(ct) {
    if (ct.kieu === 'chon_don_vi') { const x = VAT_DAI[ct.vat]; return hoa(x.ten) + ' ' + x.dong + ' ' + ct.so + ' ?'; }
    if (ct.kieu === 'doi') return hienSo(ct.so) + ' ' + ct.tu + ' = ? ' + ct.den;
    if (ct.kieu === 'so_sanh') return ct.a[0] + ' ' + ct.a[1] + ' ? ' + ct.b[0] + ' ' + ct.b[1];
    return dePhep(ct);
  }
  function deDocDV(ct) {
    if (ct.kieu === 'chon_don_vi') { const x = VAT_DAI[ct.vat]; return hoa(x.ten) + ' ' + x.dong + ' ' + ct.so + ' gì? Xăng-ti-mét, đề-xi-mét, mét hay ki-lô-mét?'; }
    if (ct.kieu === 'doi') return ct.so + ' ' + DV_TEN[ct.tu] + ' bằng bao nhiêu ' + DV_TEN[ct.den] + '?';
    if (ct.kieu === 'so_sanh') return 'So sánh ' + ct.a[0] + ' ' + DV_TEN[ct.a[1]] + ' và ' + ct.b[0] + ' ' + DV_TEN[ct.b[1]] + '.';
    return deDocPhep(ct);
  }
  function maDV(ct) {
    if (ct.kieu === 'chon_don_vi') return 'dv:' + ct.vat + ',' + ct.so;
    if (ct.kieu === 'doi') return 'doi:' + ct.so + ct.tu + ',' + ct.den;
    if (ct.kieu === 'so_sanh') return 'ss:' + ct.a[0] + ct.a[1] + ',' + ct.b[0] + ct.b[1];
    return maPhep(ct);
  }
  /** Các kết quả khi bé đổi sai (nhầm 10 với 100, quên đổi): dùng cho lỗi doi-don-vi. */
  function doiSai(ct) {
    const d = tinhDV(ct), ra = [];
    const len = DV_CM[ct.tu] > DV_CM[ct.den];
    [1, 10, 100, 1000].forEach(function (f) {
      const v = len ? ct.so * f : ct.so / f;
      if (Number.isInteger(v) && v !== d) ra.push(v);
    });
    return ra;
  }
  function soSanhSai(ct) {
    // đổi đơn vị lớn sang nhỏ bằng hệ số sai (1 m = 10 cm, 1 dm = 100 cm)
    const lonA = DV_CM[ct.a[1]] > DV_CM[ct.b[1]];
    const lon = lonA ? ct.a : ct.b, nho = lonA ? ct.b : ct.a;
    const dung = heSo(lon[1], nho[1]);
    const ra = [];
    [10, 100, 1000].forEach(function (f) {
      if (f === dung) return;
      const x = lon[0] * f;
      ra.push(lonA ? dau(x, nho[0]) : dau(nho[0], x));
    });
    return ra;
  }
  function nhanBietLoiDV(ct, v) {
    const d = tinhDV(ct);
    if (ct.kieu === 'chon_don_vi') {
      const x = String(v == null ? '' : v).trim();
      if (x === d) return [];
      return DV.indexOf(x) >= 0 ? ['nham-don-vi'] : ['khac'];
    }
    if (ct.kieu === 'so_sanh') {
      const x = String(v == null ? '' : v).trim().replace('&lt;', '<').replace('&gt;', '>');
      if (x === d) return [];
      if (['<', '>', '='].indexOf(x) < 0) return ['khac'];
      if (x === dau(ct.a[0], ct.b[0])) return ['quen-doi-don-vi'];
      if (soSanhSai(ct).indexOf(x) >= 0) return ['doi-don-vi'];
      return ['khac'];
    }
    const n = soNguyen(v);
    if (n === d) return [];
    if (!Number.isFinite(n)) return ['khac'];
    if (ct.kieu === 'doi') return doiSai(ct).indexOf(n) >= 0 ? ['doi-don-vi'] : ['khac'];
    return loiPhep(ct, n);
  }
  function loiNoiDV(ct, v, maLoi) {
    const m = (maLoi && maLoi[0]) || 'khac';
    if (m === 'nham-don-vi') return 'Con nghĩ xem ' + ct.so + ' ' + v + ' dài cỡ nào: ' + DV_VI_DU[v];
    if (m === 'doi-don-vi') {
      if (ct.kieu === 'so_sanh') return 'Nhớ: 1 m = 10 dm = 100 cm, 1 dm = 10 cm';
      const lon = DV_CM[ct.tu] > DV_CM[ct.den] ? ct.tu : ct.den, nho = lon === ct.tu ? ct.den : ct.tu;
      return 'Nhớ: 1 ' + lon + ' = ' + hienSo(heSo(lon, nho)) + ' ' + nho;
    }
    if (m === 'quen-doi-don-vi') return 'Hai số đo khác đơn vị, con đổi về cùng đơn vị rồi mới so sánh nhé';
    if (m === 'nham-dau') return ct.p === '+' ? 'Đây là phép cộng nhé' : 'Đây là phép trừ nhé';
    if (m === 'quen-nho') return 'Con quên nhớ 1 rồi';
    if (m === 'quen-muon') return 'Con quên mượn 1 rồi';
    if (m === 'dem-lech') return 'Con tính lệch một chút rồi';
    return 'Chưa đúng rồi';
  }
  function hienDV(v, ct) {
    if (ct && ct.kieu === 'chon_don_vi') return ct.so + ' ' + v;
    if (ct && ct.kieu === 'so_sanh') return String(v);
    const n = soNguyen(v);
    if (!Number.isFinite(n)) return String(v);
    return hienSo(n) + ' ' + (ct ? (ct.kieu === 'doi' ? ct.den : ct.dv) : '');
  }
  function taoNhieuDV(kyNang, ct, rng) {
    const d = tinhDV(ct);
    if (ct.kieu === 'chon_don_vi') return tron(rng, DV.filter(function (x) { return x !== d; })).map(function (v) { return { gia_tri: v, loi: nhanBietLoiDV(ct, v) }; });
    if (ct.kieu === 'so_sanh') return tron(rng, ['<', '>', '='].filter(function (x) { return x !== d; })).map(function (v) { return { gia_tri: v, loi: nhanBietLoiDV(ct, v) }; });
    if (ct.kieu === 'doi') {
      const ds = tron(rng, doiSai(ct));
      const ra = ds.slice(0, 2);
      if (ra.length < 2) { const lech = d >= 10 ? d + 10 : d + 1; if (ra.indexOf(lech) < 0) ra.push(lech); }
      return ra.map(function (v) { return { gia_tri: v, loi: nhanBietLoiDV(ct, v) }; });
    }
    return nhieuSo(ct, d, ungVienPhep(ct), nhanBietLoiDV, 0, 100, rng, 2);
  }
  function goiYDV(ct) {
    if (ct.kieu === 'chon_don_vi') return ['Nhớ: 1 dm cỡ một gang tay, 1 m cỡ một sải tay, đường đi xa đo bằng km.', 'Thử tưởng tượng ' + VAT_DAI[ct.vat].ten + ' dài bằng mấy gang tay, mấy sải tay.', 'Đọc thử cả câu với từng đơn vị, câu nào nghe hợp lí nhất?'];
    if (ct.kieu === 'doi') {
      const len = DV_CM[ct.tu] > DV_CM[ct.den];
      const lon = len ? ct.tu : ct.den, nho = len ? ct.den : ct.tu, f = heSo(lon, nho);
      return ['Nhớ: 1 dm = 10 cm, 1 m = 10 dm, 1 m = 100 cm, 1 km = 1 000 m.', '1 ' + lon + ' = ' + hienSo(f) + ' ' + nho + '.',
        len ? hienSo(ct.so) + ' ' + ct.tu + ' là ' + ct.so + ' lần ' + hienSo(f) + ' ' + nho + '.' : hienSo(ct.so) + ' ' + ct.tu + ' có mấy lần ' + hienSo(f) + ' ' + nho + '?'];
    }
    if (ct.kieu === 'so_sanh') {
      const lonA = DV_CM[ct.a[1]] > DV_CM[ct.b[1]];
      const lon = lonA ? ct.a : ct.b, nho = lonA ? ct.b : ct.a, f = heSo(lon[1], nho[1]);
      return ['Đổi về cùng một đơn vị rồi mới so sánh.', '1 ' + lon[1] + ' = ' + hienSo(f) + ' ' + nho[1] + ', vậy ' + lon[0] + ' ' + lon[1] + ' = ' + hienSo(lon[0] * f) + ' ' + nho[1] + '.',
        'So sánh ' + hienSo(lonA ? lon[0] * f : nho[0]) + ' ' + nho[1] + ' và ' + hienSo(lonA ? nho[0] : lon[0] * f) + ' ' + nho[1] + '.'];
    }
    return goiYPhep(ct);
  }
  /** Hình các thanh đơn vị lớn chia thành đơn vị nhỏ (lời giải câu đổi đơn vị). */
  function hinhDoi(ct) {
    const len = DV_CM[ct.tu] > DV_CM[ct.den];
    const lon = len ? ct.tu : ct.den, nho = len ? ct.den : ct.tu, f = heSo(lon, nho);
    const soThanh = len ? ct.so : tinhDV(ct);
    if (soThanh > 9) return '';
    const w = Math.min(120, 680 / soThanh);
    let s = '';
    for (let i = 0; i < soThanh; i++) {
      const x = 20 + i * w;
      s += '<rect x="' + r1(x) + '" y="40" width="' + r1(w - 4) + '" height="44" rx="8" fill="' + (i % 2 ? '#ffd166' : '#ffb8c9') + '" stroke="#6b1f3a" stroke-width="2.5"/>';
      const vach = Math.min(10, f);
      for (let k = 1; k < vach; k++) s += '<line x1="' + r1(x + k * (w - 4) / vach) + '" y1="40" x2="' + r1(x + k * (w - 4) / vach) + '" y2="56" stroke="#6b1f3a" stroke-width="1.5"/>';
      s += chuSvg(x + (w - 4) / 2, 76, '1 ' + lon, 20, '#6b1f3a');
      s += chuSvg(x + (w - 4) / 2, 116, hienSo(f) + ' ' + nho, 20, '#d84f1d');
    }
    return bocSvg([0, 20, 40 + soThanh * w, 110], s, soThanh + ' ' + lon);
  }
  /** Hai thanh cùng tỉ lệ (sau khi đổi về cùng đơn vị) cho câu so sánh hai số đo độ dài. */
  function hinhSoSanhDai(ct, qa, qb, dv) {
    const max = Math.max(qa, qb), W = 460;
    const chuNeo = function (x, y, t, co, mau, neo) { return '<text x="' + r1(x) + '" y="' + r1(y) + '" text-anchor="' + neo + '" font-size="' + co + '" font-weight="800" fill="' + mau + '">' + esc(t) + '</text>'; };
    const thanh = function (y, q, nhan, mau) {
      const w = Math.max(24, W * q / max);
      return chuNeo(95, y + 30, nhan, 26, '#221a3b', 'end') + '<rect x="110" y="' + y + '" width="' + r1(w) + '" height="42" rx="10" fill="' + mau + '" stroke="#5b5575" stroke-width="2.5"/>' + chuNeo(110 + w + 12, y + 30, hienSo(q) + ' ' + dv, 24, '#d84f1d', 'start');
    };
    const s = thanh(20, qa, ct.a[0] + ' ' + ct.a[1], '#ffd166') + thanh(84, qb, ct.b[0] + ' ' + ct.b[1], '#58b0ff');
    return bocSvg([0, 0, 720, 146], s, 'So sánh ' + ct.a[0] + ' ' + ct.a[1] + ' và ' + ct.b[0] + ' ' + ct.b[1]);
  }
  function loiGiaiDV(ct) {
    const d = tinhDV(ct);
    if (ct.kieu === 'chon_don_vi') {
      const x = VAT_DAI[ct.vat];
      return { ma: 'chon-don-vi-do-dai', buoc: [DV_VI_DU[x.dv], hoa(x.ten) + ' ' + x.dong + ' ' + ct.so + ' ' + x.dv], html: bocSvg([0, 0, 200, 170], emojiSvg(100, 150, x.e, 130), hoa(x.ten)), kq: d };
    }
    if (ct.kieu === 'doi') {
      const len = DV_CM[ct.tu] > DV_CM[ct.den];
      const lon = len ? ct.tu : ct.den, nho = len ? ct.den : ct.tu, f = heSo(lon, nho);
      return { ma: 'doi-don-vi-do-dai', buoc: ['1 ' + lon + ' = ' + hienSo(f) + ' ' + nho, len ? ct.so + ' ' + ct.tu + ' là ' + ct.so + ' lần ' + hienSo(f) + ' ' + nho + ': ' + hienSo(d) + ' ' + nho : hienSo(ct.so) + ' ' + nho + ' có ' + d + ' lần ' + hienSo(f) + ' ' + nho + ': ' + d + ' ' + lon], html: hinhDoi(ct), kq: d };
    }
    if (ct.kieu === 'so_sanh') {
      const lonA = DV_CM[ct.a[1]] > DV_CM[ct.b[1]];
      const lon = lonA ? ct.a : ct.b, nho = lonA ? ct.b : ct.a, f = heSo(lon[1], nho[1]);
      const qa = lonA ? lon[0] * f : nho[0], qb = lonA ? nho[0] : lon[0] * f;
      return { ma: 'so-sanh-do-dai', buoc: ['Đổi: ' + lon[0] + ' ' + lon[1] + ' = ' + hienSo(lon[0] * f) + ' ' + nho[1], hienSo(qa) + ' ' + nho[1] + ' ' + d + ' ' + hienSo(qb) + ' ' + nho[1]], html: hinhSoSanhDai(ct, qa, qb, nho[1]), kq: d };
    }
    return loiGiaiPhep(ct);
  }
  function ketLuanDV(ct) {
    const d = tinhDV(ct);
    if (ct.kieu === 'chon_don_vi') { const x = VAT_DAI[ct.vat]; return 'Vậy ' + x.ten + ' ' + x.dong + ' ' + ct.so + ' ' + d + '.'; }
    if (ct.kieu === 'doi') return 'Vậy ' + hienSo(ct.so) + ' ' + ct.tu + ' = ' + hienSo(d) + ' ' + ct.den + '.';
    if (ct.kieu === 'so_sanh') return 'Vậy ' + ct.a[0] + ' ' + ct.a[1] + ' ' + d + ' ' + ct.b[0] + ' ' + ct.b[1] + '.';
    return 'Vậy ' + dePhep(ct).replace('? ' + ct.dv, d + ' ' + ct.dv) + '.';
  }
  function hinhDV(ct) {
    if (ct.kieu !== 'chon_don_vi') return '';
    const x = VAT_DAI[ct.vat];
    return bocSvg([0, 0, 240, 190], '<circle cx="120" cy="95" r="88" fill="#fff4d6" stroke="#f2dca0" stroke-width="4"/>' + emojiSvg(120, 160, x.e, 120), hoa(x.ten));
  }
  function canhDV(ct) {
    if (ct.kieu === 'chon_don_vi') return { canh: 'phan_loai', nhap: 'keo' };
    if (ct.kieu === 'so_sanh') return { canh: 'tranh', nhap: 'chon' };
    return { canh: 'tranh', nhap: 'so', don_vi: ct.kieu === 'doi' ? ct.den : ct.dv };
  }

  function sinhDonViDai(rng, muc) {
    const kieu = chonMuc(rng, muc, ['chon_don_vi', 'chon_don_vi', 'doi', 'doi', 'doi', 'so_sanh', 'tinh']);
    if (kieu === 'chon_don_vi') {
      const vat = chon(rng, Object.keys(VAT_DAI));
      return { loai: 'don_vi_dai', kieu: 'chon_don_vi', vat: vat, so: chon(rng, VAT_DAI[vat].so) };
    }
    if (kieu === 'doi') {
      const cap = NH.chonTheoTrongSo(rng, [
        { c: ['dm', 'cm'], w: 3 }, { c: ['m', 'dm'], w: 2 }, { c: ['m', 'cm'], w: 2 }, { c: ['km', 'm'], w: 0.7 },
        { c: ['cm', 'dm'], w: 2 }, { c: ['dm', 'm'], w: 1.5 }, { c: ['cm', 'm'], w: 1.5 }, { c: ['m', 'km'], w: 0.5 }
      ]).c;
      const len = DV_CM[cap[0]] > DV_CM[cap[1]];
      let so;
      if (cap[0] === 'km') so = 1;
      else if (cap[1] === 'km') so = 1000;
      else if (len) so = nn(rng, 1, 9);
      else so = nn(rng, 1, 9) * heSo(cap[1], cap[0]);
      return { loai: 'don_vi_dai', kieu: 'doi', so: so, tu: cap[0], den: cap[1] };
    }
    if (kieu === 'so_sanh') {
      const cap = NH.chonTheoTrongSo(rng, [{ c: ['m', 'cm'], w: 2 }, { c: ['dm', 'cm'], w: 2 }, { c: ['m', 'dm'], w: 1.5 }, { c: ['km', 'm'], w: 0.6 }]).c;
      const f = heSo(cap[0], cap[1]);
      let a, b;
      const kq = chon(rng, ['>', '>', '=', '<']);
      if (cap[0] === 'km') { a = 1; b = kq === '>' ? chon(rng, [500, 800, 900]) : 1000; }
      else {
        a = nn(rng, 1, cap[0] === 'm' && cap[1] === 'cm' ? 5 : 9);
        const buoc = f === 100 ? 10 : 1;
        const lech = nn(rng, 1, f === 100 ? 5 : 4) * buoc;
        b = kq === '=' ? a * f : kq === '>' ? a * f - lech : a * f + lech;
      }
      const ct = rng() < 0.6 ? { loai: 'don_vi_dai', kieu: 'so_sanh', a: [a, cap[0]], b: [b, cap[1]] } : { loai: 'don_vi_dai', kieu: 'so_sanh', a: [b, cap[1]], b: [a, cap[0]] };
      return ct;
    }
    return Object.assign({ loai: 'don_vi_dai' }, sinhPhep(rng, chon(rng, ['dm', 'm', 'km', 'cm']), true));
  }

  /* ============================================================
     8. Loại 'do_dai': đo độ dài bằng thước (B2.7)
     ============================================================ */

  function tinhDD(ct) { return ct.kieu === 'noi_tiep' ? ct.lan * ct.thuoc : ct.dai; }
  function deDD(ct) {
    if (ct.kieu === 'noi_tiep') { const x = VAT_NOI[ct.vat]; return 'Đặt thước ' + ct.thuoc + ' dm nối tiếp được ' + ct.lan + ' lần. ' + hoa(x.ten) + ' ' + x.dong + ' mấy đề-xi-mét?'; }
    return hoa(tenVatDo(ct.vat)) + ' dài mấy xăng-ti-mét?';
  }
  function deDocDD(ct) {
    if (ct.kieu === 'noi_tiep') return 'Các bạn đo bằng thước kẻ dài ' + ct.thuoc + ' đề-xi-mét, đặt nối tiếp được ' + ct.lan + ' lần. ' + hoa(VAT_NOI[ct.vat].ten) + ' ' + VAT_NOI[ct.vat].dong + ' mấy đề-xi-mét?';
    return deDD(ct);
  }
  function maDD(ct) {
    if (ct.kieu === 'noi_tiep') return 'nt:' + ct.vat + ':' + ct.lan + 'x' + ct.thuoc;
    if (ct.kieu === 'lech') return 'lech:' + ct.vat + ':' + ct.dau + ',' + ct.dai;
    return 'do:' + ct.vat + ':' + ct.dai;
  }
  function nhanBietLoiDD(ct, v) {
    const d = tinhDD(ct);
    const n = soNguyen(v);
    if (n === d) return [];
    if (!Number.isFinite(n)) return ['khac'];
    const ma = [];
    if (ct.kieu === 'noi_tiep') {
      if (n === ct.lan) ma.push('dem-so-lan');
      if (Math.abs(n - d) === ct.thuoc) ma.push('dem-lech');
    } else {
      if ((ct.kieu === 'lech' && n === ct.dau + ct.dai) || n === ct.dai + 1) ma.push('do-tu-1');
      if (!ma.length && n === ct.dai - 1) ma.push('dem-lech');
    }
    if (!ma.length) ma.push('khac');
    return ma;
  }
  function loiNoiDD(ct, v, maLoi) {
    const m = (maLoi && maLoi[0]) || 'khac';
    if (m === 'do-tu-1') return ct.kieu === 'lech' && soNguyen(v) === ct.dau + ct.dai ? 'Đồ vật không bắt đầu ở vạch 0, con đếm số khoảng 1 cm nhé' : 'Đo từ vạch 0 và đếm khoảng 1 cm, không đếm vạch nhé';
    if (m === 'dem-so-lan') return 'Mỗi lần đặt thước là ' + ct.thuoc + ' dm, con đếm thêm ' + ct.thuoc + ' nhé';
    if (m === 'dem-lech') return ct.kieu === 'noi_tiep' ? 'Con đếm lại số lần đặt thước nhé' : 'Con đếm lại số khoảng 1 cm nhé';
    return 'Chưa đúng rồi';
  }
  function hienDD(v, ct) { const n = soNguyen(v); return Number.isFinite(n) ? n + (ct && ct.kieu === 'noi_tiep' ? ' dm' : ' cm') : String(v); }
  function taoNhieuDD(kyNang, ct, rng) {
    const d = tinhDD(ct);
    const ung = [];
    if (ct.kieu === 'noi_tiep') ung.push({ v: ct.lan, w: 3 }, { v: d + ct.thuoc, w: 1 }, { v: d - ct.thuoc, w: 1 });
    else { ung.push({ v: ct.dai + 1, w: 2 }); if (ct.kieu === 'lech') ung.push({ v: ct.dau + ct.dai, w: 3 }); }
    return nhieuSo(ct, d, ung, nhanBietLoiDD, 1, 30, rng, 2);
  }
  function goiYDD(ct) {
    const ten = tenVatDo(ct.vat);
    if (ct.kieu === 'noi_tiep') return ['Mỗi lần đặt thước là ' + ct.thuoc + ' dm.', 'Đếm thêm ' + ct.thuoc + ' cho mỗi lần đặt thước: 2, 4, 6…', ct.lan + ' lần ' + ct.thuoc + ' dm: ' + chuoiLap(ct.thuoc, ct.lan) + ' = ?'];
    if (ct.kieu === 'lech') return [hoa(ten) + ' không bắt đầu ở vạch 0.', 'Đầu trái ở vạch ' + ct.dau + ', đầu phải ở vạch ' + (ct.dau + ct.dai) + '. Đếm số khoảng 1 cm ở giữa.', (ct.dau + ct.dai) + ' ' + TRU + ' ' + ct.dau + ' = ?'];
    return ['Vạch 0 của thước trùng với đầu trái của ' + ten + '.', 'Đầu phải của ' + ten + ' ở vạch nào thì ' + ten + ' dài bấy nhiêu xăng-ti-mét.', 'Đếm từng khoảng 1 cm từ vạch 0 tới đầu phải.'];
  }
  function veNoiTiep(ct, giai) {
    const x = VAT_NOI[ct.vat];
    const pxdm = Math.min(58, 660 / (ct.lan * ct.thuoc));
    const w = ct.lan * ct.thuoc * pxdm, x0 = 40;
    let s = '';
    // đồ vật
    if (ct.vat === 'cua_so') {
      s += '<rect x="' + x0 + '" y="40" width="' + r1(w) + '" height="150" rx="8" fill="#bfe6ff" stroke="#8a5a2b" stroke-width="10"/>';
      s += '<line x1="' + r1(x0 + w / 2) + '" y1="40" x2="' + r1(x0 + w / 2) + '" y2="190" stroke="#8a5a2b" stroke-width="7"/><line x1="' + x0 + '" y1="115" x2="' + r1(x0 + w) + '" y2="115" stroke="#8a5a2b" stroke-width="7"/>';
      s += '<path d="M' + (x0 + 20) + ' 70 l40 -16" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity=".8"/>';
    } else if (ct.vat === 'tu_sach') {
      s += '<rect x="' + x0 + '" y="40" width="' + r1(w) + '" height="150" rx="6" fill="#c8864a" stroke="#7a4a1f" stroke-width="5"/>';
      [70, 115, 160].forEach(function (y) {
        s += '<rect x="' + (x0 + 8) + '" y="' + (y - 26) + '" width="' + r1(w - 16) + '" height="30" fill="#8a5a2b"/>';
        for (let i = 0; i * 18 < w - 30; i++) s += '<rect x="' + (x0 + 12 + i * 18) + '" y="' + (y - 24 + (i % 3) * 3) + '" width="13" height="' + (26 - (i % 3) * 3) + '" rx="2" fill="' + ['#ef476f', '#ffd166', '#06d6a0', '#58b0ff'][i % 4] + '"/>';
      });
    } else {
      s += '<rect x="' + x0 + '" y="92" width="' + r1(w) + '" height="26" rx="8" fill="#c8864a" stroke="#7a4a1f" stroke-width="5"/>';
      s += '<rect x="' + (x0 + 14) + '" y="118" width="18" height="72" fill="#a86a36"/><rect x="' + r1(x0 + w - 32) + '" y="118" width="18" height="72" fill="#a86a36"/>';
    }
    // mũi tên độ dài
    s += '<path d="M' + x0 + ' 22 H' + r1(x0 + w) + '" stroke="#221a3b" stroke-width="3"/><path d="M' + x0 + ' 22 l12 -7 v14 Z M' + r1(x0 + w) + ' 22 l-12 -7 v14 Z" fill="#221a3b"/>';
    s += nhanTron(x0 + w / 2, 22, giai ? tinhDD(ct) + ' dm' : '? dm', '#fff', '#d84f1d', 22);
    // các thước 2 dm nối tiếp
    for (let i = 0; i < ct.lan; i++) {
      const xx = x0 + i * ct.thuoc * pxdm;
      s += '<g class="xd-thuoc-2dm" data-i="' + i + '"><rect x="' + r1(xx + 1) + '" y="200" width="' + r1(ct.thuoc * pxdm - 2) + '" height="40" rx="6" fill="' + (i % 2 ? '#ffd166' : '#ffb8c9') + '" stroke="#6b1f3a" stroke-width="2.5"/>';
      for (let k = 1; k < ct.thuoc * 10; k++) s += '<line x1="' + r1(xx + k * pxdm / 10) + '" y1="200" x2="' + r1(xx + k * pxdm / 10) + '" y2="' + (k % 10 === 0 ? 216 : k % 5 === 0 ? 211 : 206) + '" stroke="#6b1f3a" stroke-width="1.2"/>';
      s += chuSvg(xx + ct.thuoc * pxdm / 2, 233, ct.thuoc + ' dm', 18, '#6b1f3a');
      if (giai) s += chuSvg(xx + ct.thuoc * pxdm, 268, (i + 1) * ct.thuoc, 20, '#d84f1d');
      s += '</g>';
    }
    return bocSvg([0, 0, x0 * 2 + w, giai ? 280 : 256], s, hoa(x.ten) + ' và ' + ct.lan + ' thước ' + ct.thuoc + ' dm');
  }
  function hinhDD(ct, giai) {
    if (ct.kieu === 'noi_tiep') return veNoiTiep(ct, giai);
    const o = { vat: ct.vat, dai: ct.dai, dau: ct.kieu === 'lech' ? ct.dau : 0, mau: ct.dai, muiTen: !!giai, danhSo: !!giai };
    return bocSvg(giai ? [0, 52, 760, 210] : VB_THUOC, veThuocVaVat(o), hoa(tenVatDo(ct.vat)) + ' đặt trên thước xăng-ti-mét');
  }
  function loiGiaiDD(ct) {
    const d = tinhDD(ct), ten = tenVatDo(ct.vat);
    if (ct.kieu === 'noi_tiep') return { ma: 'do-noi-tiep', buoc: ['Mỗi lần đặt thước là ' + ct.thuoc + ' dm', 'Đếm thêm ' + ct.thuoc + ': ' + Array.from({ length: ct.lan }, function (_, i) { return (i + 1) * ct.thuoc; }).join(', '), hoa(VAT_NOI[ct.vat].ten) + ' ' + VAT_NOI[ct.vat].dong + ' ' + d + ' dm'], html: hinhDD(ct, true), kq: d };
    if (ct.kieu === 'lech') return { ma: 'do-khong-tu-0', buoc: ['Đầu trái ở vạch ' + ct.dau + ', đầu phải ở vạch ' + (ct.dau + ct.dai), (ct.dau + ct.dai) + ' ' + TRU + ' ' + ct.dau + ' = ' + d + ' (đếm được ' + d + ' khoảng 1 cm)', hoa(ten) + ' dài ' + d + ' cm'], html: hinhDD(ct, true), kq: d };
    return { ma: 'do-tu-vach-0', buoc: ['Đặt vạch 0 trùng đầu trái của ' + ten, 'Đầu phải ở vạch ' + d, hoa(ten) + ' dài ' + d + ' cm'], html: hinhDD(ct, true), kq: d };
  }
  function ketLuanDD(ct) {
    if (ct.kieu === 'noi_tiep') return 'Vậy ' + VAT_NOI[ct.vat].ten + ' ' + VAT_NOI[ct.vat].dong + ' ' + tinhDD(ct) + ' dm.';
    return 'Vậy ' + tenVatDo(ct.vat) + ' dài ' + ct.dai + ' cm.';
  }
  function canhDD(ct) {
    if (ct.kieu === 'noi_tiep') return { canh: 'tranh', nhap: 'so', don_vi: 'dm', dem_thuoc: true };
    return { canh: 'thuoc', nhap: 'so', don_vi: 'cm' };
  }
  function goiYGameDD(ct) {
    const ten = tenVatDo(ct.vat);
    if (ct.kieu === 'do') return ['Kéo thước để vạch 0 trùng với đầu trái của ' + ten + '.', 'Đầu phải của ' + ten + ' ở vạch nào thì ' + ten + ' dài bấy nhiêu xăng-ti-mét.', 'Thước đã đặt đúng rồi đấy, con đọc số ở đầu phải nhé.'];
    if (ct.kieu === 'noi_tiep') return ['Mỗi lần đặt thước là ' + ct.thuoc + ' dm. Chạm từng thước để đếm thêm ' + ct.thuoc + '.', 'Đếm thêm ' + ct.thuoc + ': 2, 4, 6…', ct.lan + ' lần ' + ct.thuoc + ' dm: ' + chuoiLap(ct.thuoc, ct.lan) + ' = ?'];
    return [hoa(ten) + ' không bắt đầu ở vạch 0. Con có thể kéo thước cho vạch 0 trùng đầu trái.', 'Hoặc đếm số khoảng 1 cm từ vạch ' + ct.dau + ' tới vạch ' + (ct.dau + ct.dai) + '.', 'Mình đã đánh số từng khoảng 1 cm, con đếm nhé.'];
  }

  function sinhDoDai(rng, muc) {
    const kieu = chonMuc(rng, muc, ['do', 'do', 'lech', 'lech', 'noi_tiep']);
    if (kieu === 'noi_tiep') {
      const vat = chon(rng, Object.keys(VAT_NOI));
      return { loai: 'do_dai', kieu: 'noi_tiep', vat: vat, lan: nn(rng, VAT_NOI[vat].lan[0], VAT_NOI[vat].lan[1]), thuoc: 2 };
    }
    const vat = chon(rng, Object.keys(VAT_DO));
    const lo = VAT_DO[vat].dai[0], hi = VAT_DO[vat].dai[1];
    if (kieu === 'do') return { loai: 'do_dai', kieu: 'do', vat: vat, dai: nn(rng, lo, hi) };
    const dai = nn(rng, lo, Math.min(hi, 12));
    return { loai: 'do_dai', kieu: 'lech', vat: vat, dau: nn(rng, 1, Math.min(5, 15 - dai)), dai: dai };
  }

  /* ============================================================
     9. Đăng ký loại câu, lỗi, kỹ năng
     ============================================================ */

  function dangTheoNhap(nhap) { return nhap === 'so' ? 'nhap_so' : nhap === 'keo' ? 'keo_tha' : 'thao_tac_hinh'; }

  /** Tạo impl cho một loại: thêm dạng câu mặc định và moRong (dữ liệu cảnh chơi, lựa chọn cho dạng thao tác). */
  function dangKy(loai, im) {
    im.dang = function (ct) { return dangTheoNhap(im.canh(ct).nhap); };
    im.veLuaChon = function (ct, v) {
      const o = { nhan: im.hienGiaTri(v, ct) };
      if (ct.kieu === 'thu_tu' && VAT[v]) o.hinh = VAT[v].e;
      return o;
    };
    im.moRong = function (q, ct, rng) {
      const c = Object.assign({}, im.canh(ct));
      const mc = q.dang === 'chon_dap_an' || q.dang === 'doc_va_chon';
      if (mc) { c.nhap = 'chon'; c.tuong_tac = false; }
      q.xd = c;
      if (mc) return;
      if (c.nhap === 'chon' && !q.lua_chon) q.lua_chon = tron(rng, [{ gia_tri: q.dap_an, loi: [] }].concat(im.taoNhieu(q.ky_nang, ct, rng)));
      else if (c.nhap === 'keo' && !q.lua_chon) q.lua_chon = DV.map(function (u) { return { gia_tri: u, loi: im.nhanBietLoi(ct, u), vi_tri: 'hop_' + u }; });
      const gy = im.goiYGame ? im.goiYGame(ct) : null;
      if (gy) q.goi_y = gy;
    };
    NH.dangKyLoai(loai, im);
  }

  dangKy('nang_nhe', { tinh: tinhNN, de: deNN, deDoc: deDocNN, deChuanHoa: maNN, nhanBietLoi: nhanBietLoiNN, loiNoi: loiNoiNN, goiY: goiYNN, loiGiai: loiGiaiNN, ketLuan: ketLuanNN, taoNhieu: taoNhieuNN, hienGiaTri: hienNN, veHinh: function (ct) { return hinhNN(ct); }, canh: canhNN, goiYGame: goiYGameNN });
  dangKy('can_kg', { tinh: tinhKG, de: deKG, deDoc: deDocKG, deChuanHoa: maKG, nhanBietLoi: nhanBietLoiKG, loiNoi: loiNoiKG, goiY: goiYKG, loiGiai: loiGiaiKG, ketLuan: ketLuanKG, taoNhieu: taoNhieuKG, hienGiaTri: hienKG, veHinh: function (ct) { return hinhKG(ct); }, canh: canhKG, goiYGame: goiYGameKG });
  dangKy('rot_lit', { tinh: tinhRL, de: deRL, deDoc: deDocRL, deChuanHoa: maRL, nhanBietLoi: nhanBietLoiRL, loiNoi: loiNoiRL, goiY: goiYRL, loiGiai: loiGiaiRL, ketLuan: ketLuanRL, taoNhieu: taoNhieuRL, hienGiaTri: hienRL, veHinh: function (ct) { return hinhRL(ct); }, canh: canhRL, goiYGame: goiYGameRL });
  dangKy('don_vi_dai', { tinh: tinhDV, de: deDV, deDoc: deDocDV, deChuanHoa: maDV, nhanBietLoi: nhanBietLoiDV, loiNoi: loiNoiDV, goiY: goiYDV, loiGiai: loiGiaiDV, ketLuan: ketLuanDV, taoNhieu: taoNhieuDV, hienGiaTri: hienDV, veHinh: hinhDV, canh: canhDV });
  dangKy('do_dai', { tinh: tinhDD, de: deDD, deDoc: deDocDD, deChuanHoa: maDD, nhanBietLoi: nhanBietLoiDD, loiNoi: loiNoiDD, goiY: goiYDD, loiGiai: loiGiaiDD, ketLuan: ketLuanDD, taoNhieu: taoNhieuDD, hienGiaTri: hienDD, veHinh: function (ct) { return hinhDD(ct); }, canh: canhDD, goiYGame: goiYGameDD });

  NH.themLoi('ben-thap-nhe', { be: 'Đĩa cân thấp hơn là bên nặng hơn đấy', mo_ta: 'Đọc ngược cân đĩa: nghĩ đĩa lệch xuống thấp là bên nhẹ hơn', ngan: 'Con hay nghĩ bên thấp là bên nhẹ' });
  NH.themLoi('can-thang-bang', { be: 'Cân nằm ngang thì hai bên nặng bằng nhau', mo_ta: 'Đọc sai cân thăng bằng: cân nằm ngang mà nói một bên nặng hơn, hoặc cân lệch mà nói nặng bằng nhau', ngan: 'Con hay đọc sai cân thăng bằng' });
  NH.themLoi('chi-mot-can', { be: 'Con nhìn cả các cân nhé', mo_ta: 'Chỉ dựa vào một cân khi phải kết hợp hai hay ba cân (chọn vật ở giữa, hoặc chỉ đổi một phần)', ngan: 'Con hay chỉ nhìn một cân' });
  NH.themLoi('dem-qua-can', { be: 'Con đếm số quả cân rồi, phải cộng số ki-lô-gam', mo_ta: 'Đếm số quả cân thay vì cộng số ki-lô-gam ghi trên quả cân (quả cân 2 kg và 1 kg nói là 2 kg; nhiều quả cân hơn thì nghĩ là nặng hơn)', ngan: 'Con hay đếm số quả cân' });
  NH.themLoi('thieu-qua-can', { be: 'Con quên cộng một quả cân rồi', mo_ta: 'Cộng sót một quả cân trên đĩa (chỉ đọc quả cân to nhất hoặc bỏ quên một quả)', ngan: 'Con hay cộng sót quả cân' });
  NH.themLoi('quen-can-cung-dia', { be: 'Đĩa có đồ vật còn có quả cân, con bớt quả cân đó ra nhé', mo_ta: 'Đĩa có đồ vật còn có thêm quả cân: bé lấy luôn số ki-lô-gam bên kia mà không trừ quả cân cùng đĩa', ngan: 'Con hay quên bớt quả cân cùng đĩa' });
  NH.themLoi('dem-so-ca', { be: 'Con đếm số ca rồi, phải cộng số lít', mo_ta: 'Đếm số đồ đựng thay vì cộng số lít ghi trên đồ đựng (ca 1 l, 2 l, 5 l nói là 3 l)', ngan: 'Con hay đếm số ca thay vì cộng lít' });
  NH.themLoi('doc-sai-vach', { be: 'Con đọc nhầm sang vạch bên cạnh rồi', mo_ta: 'Đọc (hoặc rót tới) vạch bên cạnh vạch đúng trên bình có vạch chia lít', ngan: 'Con hay đọc nhầm vạch' });
  NH.themLoi('dem-vach', { be: 'Con đếm số vạch rồi, hãy đọc số lít ghi ở vạch', mo_ta: 'Đếm số vạch thay vì đọc số lít khi hai vạch cách nhau hơn 1 l', ngan: 'Con hay đếm vạch thay vì đọc số' });
  NH.themLoi('cao-hon-nhieu-hon', { be: 'Bình cao hơn chưa chắc đựng nhiều hơn, con đếm số cốc nhé', mo_ta: 'Nghĩ đồ đựng cao hơn thì đựng nhiều nước hơn, không dựa vào số cốc rót ra được', ngan: 'Con hay nghĩ bình cao là đựng nhiều' });
  NH.themLoi('nham-don-vi', { be: 'Con xem lại đơn vị nhé', mo_ta: 'Chọn đơn vị không hợp với vật: cm, dm, m, km cho độ dài, hoặc nhầm lít với ki-lô-gam', ngan: 'Con hay chọn nhầm đơn vị' });
  NH.themLoi('doi-don-vi', { be: 'Con đổi đơn vị chưa đúng rồi', mo_ta: 'Đổi đơn vị đo độ dài sai: nhầm 10 với 100 (1 m = 10 cm), hoặc giữ nguyên số không đổi', ngan: 'Con hay đổi đơn vị sai' });
  NH.themLoi('quen-doi-don-vi', { be: 'Đổi về cùng đơn vị rồi mới so sánh nhé', mo_ta: 'So sánh hai số đo khác đơn vị bằng cách so hai số, không đổi về cùng đơn vị (nói 1 m < 90 cm)', ngan: 'Con hay quên đổi đơn vị khi so sánh' });
  NH.themLoi('do-tu-1', { be: 'Đo từ vạch 0 và đếm khoảng 1 cm nhé', mo_ta: 'Đọc số ở đầu cuối khi đồ vật không bắt đầu ở vạch 0, hoặc đếm vạch (bắt đầu từ 1) thay vì đếm khoảng 1 cm', ngan: 'Con hay quên đo từ vạch 0' });
  NH.themLoi('dem-so-lan', { be: 'Mỗi lần đặt thước là 2 dm, con đếm thêm 2 nhé', mo_ta: 'Đếm số lần đặt thước mà quên nhân với độ dài của thước (đặt thước 2 dm 5 lần nói là 5 dm)', ngan: 'Con hay đếm số lần đặt thước' });

  NH.themKyNang('nang-nhe', { noi_dung: 'B2.9', ten: 'Nặng hơn, nhẹ hơn: đọc cân đĩa', kieu: 'K3', giay: 12, gioi_han: 20, loai: 'nang_nhe', sinh: sinhNangNhe });
  NH.themKyNang('can-kg', { noi_dung: 'B2.9', ten: 'Ki-lô-gam: cân đồ vật, tính với kg', kieu: 'K3', giay: 20, gioi_han: 100, loai: 'can_kg', sinh: sinhCanKg });
  NH.themKyNang('rot-lit', { noi_dung: 'B2.10', ten: 'Lít: rót nước, đọc vạch, tính với l', kieu: 'K3', giay: 20, gioi_han: 100, loai: 'rot_lit', sinh: sinhRotLit });
  NH.themKyNang('don-vi-do-dai', { noi_dung: 'B2.6', ten: 'Đơn vị đo độ dài cm, dm, m, km', kieu: 'K3', giay: 12, gioi_han: 1000, loai: 'don_vi_dai', sinh: sinhDonViDai });
  NH.themKyNang('do-do-dai', { noi_dung: 'B2.7', ten: 'Đo độ dài bằng thước', kieu: 'K3', giay: 20, gioi_han: 100, loai: 'do_dai', sinh: sinhDoDai });

  /** Mã bài học 30 giây của từng kỹ năng: game gắn vào kỹ năng khi đã đăng ký bài học (xem xuong-do-luong.js). */
  const BAI_HOC = { 'nang-nhe': 'ki-lo-gam', 'can-kg': 'ki-lo-gam', 'rot-lit': 'lit', 'don-vi-do-dai': 'do-dai', 'do-do-dai': 'do-dai' };

  /** Cảnh chơi của một câu (khi câu không đi qua moRong, ví dụ câu dựng tay trong kiểm thử). */
  function canhCua(ct) {
    const f = { nang_nhe: canhNN, can_kg: canhKG, rot_lit: canhRL, don_vi_dai: canhDV, do_dai: canhDD }[ct && ct.loai];
    return f ? f(ct) : { canh: 'tranh', nhap: 'chon' };
  }

  window.CauDoLuong = {
    VAT: VAT, BINH: BINH, DV: DV, DV_TEN: DV_TEN, VAT_DAI: VAT_DAI, VAT_DO: VAT_DO, VAT_NOI: VAT_NOI, DON_VI_KL: DON_VI_KL, BAI_HOC: BAI_HOC,
    QC: QC, DON: DON, DAY: DAY, PX_CM: PX_CM, X0_THUOC: X0_THUOC, VB_CAN: VB_CAN, VB_THUOC: VB_THUOC,
    esc: esc, hoa: hoa, tenSo: tenSo, tenVatDo: tenVatDo, caoVatDo: caoVatDo, hienSo: hienSo,
    bocSvg: bocSvg, chuSvg: chuSvg, emojiSvg: emojiSvg, nhanTron: nhanTron, sao: sao,
    veQuaCan: veQuaCan, svgQuaCan: svgQuaCan, veDo: veDo, veCan: veCan, canNho: canNho, veCanDongHo: veCanDongHo, diemTreo: diemTreo, gocTheoLech: gocTheoLech, gocTheoChenh: gocTheoChenh,
    veBinh: veBinh, mucNuoc: mucNuoc, veCa: veCa, veCoc: veCoc, veThuoc: veThuoc, veVatDo: veVatDo, veThuocVaVat: veThuocVaVat,
    phanTich: phanTich, cacCach: cacCach, canhCua: canhCua,
    loiGiaiHinh: { nang_nhe: hinhNN, can_kg: hinhKG, rot_lit: hinhRL, do_dai: hinhDD }
  };
})();
