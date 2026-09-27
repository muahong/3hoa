/* ============================================================
   cau-thoi-gian.js – Câu hỏi thời gian: xem đồng hồ, ngày giờ và các buổi, xem lịch (B2.11 đến B2.13)
   Theo SGK Toán 2 Kết nối tri thức Bài 29 đến 32 (ôn tập Bài 35, 36, 73). Cắm vào NganHang bằng dangKyLoai;
   dùng cho Lật Lịch (vùng 6), bốn game đồng hồ cũ (Mê Cung, Tháp, Xe Tăng, Cưỡi Hổ) và Đấu Trường.
   - Loại 'xem_gio' (kỹ năng xem-gio): kieu 'doc' (đồng hồ chỉ mấy giờ?), 'quay' (quay kim tới giờ cho trước; ở dạng chọn
     đáp án là "Đồng hồ nào chỉ …?"). Chỉ giờ đúng, giờ 15 phút, giờ 30 phút như SGK lớp 2 (sách lớp 2 chưa dạy "giờ kém",
     chưa đọc từng 5 phút). Giá trị '8:15' (giờ 1 đến 12).
   - Loại 'ngay_gio' (ngay-gio): kieu 'buoi' (20 giờ là buổi nào), 'doi_24' (7 giờ tối là 19 giờ), 'doi_12' (đồng hồ điện tử
     15:00 là 3 giờ chiều), 'dong_ho_buoi' (đồng hồ kim buổi chiều cùng giờ với đồng hồ điện tử nào), 'thu_tu' (xếp việc trong
     ngày theo thời gian). Giá trị: giờ '20:00' (0 đến 23), buổi 'sang' 'trua' 'chieu' 'toi' 'dem', thứ tự 'an_sang,dap_xe,doc_sach'.
   - Loại 'xem_lich' (xem-lich): kieu 'thu' (ngày 20 là thứ mấy), 'tuan' (thứ Hai tuần sau là ngày mấy), 'dem_thu' (tháng có
     bao nhiêu ngày Chủ nhật), 'so_ngay' (tháng có bao nhiêu ngày), 'o_trong' (ngày còn thiếu trên tờ lịch).
     Giá trị: thứ 'thu_hai' … 'chu_nhat', ngày và số đếm là số. Cột lịch theo SGK: Thứ Hai … Chủ nhật.
   Mã lỗi (công thức trên đáp án của bé): nham-kim, lech-gio, doc-so-phut, nham-buoi, nham-thu, dem-ngay-lech, nham-thang,
   và dem-lech (đếm số ngày cùng thứ lệch 1).
   Mục câu của màn có thể thu hẹp: cach (kiểu con), phut (ví dụ [0] chỉ giờ đúng) cho xem-gio.
   Vẽ: window.DongHo = { svg(h, m, opts), dienTu(h, m, opts), lich(p, opts), dai(opts) }: SVG tự chứa, không tham chiếu ngoài.
   ============================================================ */
(function () {
  'use strict';

  const NH = window.NganHang;
  const nn = NH.nn, tron = NH.tron;
  const FONT = "'Baloo 2', 'Arial Rounded MT Bold', sans-serif"; // tên phông có số phải đặt trong nháy (dùng trong thuộc tính font-family="…")

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function chonTrongSo(rng, ds) { return NH.chonTheoTrongSo(rng, ds.map(function (x) { return { v: x[0], w: x[1] }; })).v; }
  /** Kiểu con theo mục câu của màn (muc.cach) nếu có, không thì theo trọng số mặc định. */
  function chonCach(rng, muc, macDinh) {
    const biet = macDinh.map(function (x) { return x[0]; });
    const cach = muc && Array.isArray(muc.cach) ? muc.cach.filter(function (c) { return biet.indexOf(c) >= 0; }) : [];
    if (cach.length) return cach[Math.floor(rng() * cach.length)];
    return chonTrongSo(rng, macDinh);
  }

  /**
   * Chọn 2 đáp án nhiễu từ các ứng viên { v, w }: cái đầu lấy trong nhóm lỗi chính (w từ 2.5) nếu có, cái sau theo trọng số.
   */
  function chonHaiNhieu(rng, ung) {
    const ra = [];
    const chinh = ung.filter(function (u) { return u.w >= 2.5; });
    if (chinh.length) { const x = NH.chonTheoTrongSo(rng, chinh); ra.push(x.v); ung = ung.filter(function (u) { return u !== x; }); }
    while (ra.length < 2 && ung.length) {
      const x = NH.chonTheoTrongSo(rng, ung);
      ra.push(x.v);
      ung = ung.filter(function (u) { return u !== x; });
    }
    return ra;
  }

  /* ============================================================
     Tiện ích thời gian
     ============================================================ */

  const BUOI = ['sang', 'trua', 'chieu', 'toi', 'dem'];
  const TEN_BUOI = { sang: 'sáng', trua: 'trưa', chieu: 'chiều', toi: 'tối', dem: 'đêm' };
  /** Khoảng giờ đúng của mỗi buổi theo bảng SGK Bài 29 (12 giờ đêm là 24 giờ). */
  const GIO_BUOI = { sang: [1, 10], trua: [11, 12], chieu: [13, 18], toi: [19, 21], dem: [22, 24] };
  function buoiCua(h) {
    h = ((h % 24) + 24) % 24;
    if (h >= 1 && h <= 10) return 'sang';
    if (h === 11 || h === 12) return 'trua';
    if (h >= 13 && h <= 18) return 'chieu';
    if (h >= 19 && h <= 21) return 'toi';
    return 'dem';
  }
  /** "vào buổi chiều", "vào ban đêm" (SGK nói "10 giờ đêm", còn khi kể thì nói "ban đêm"). */
  function vaoBuoi(b) { return b === 'dem' ? 'ban đêm' : 'buổi ' + TEN_BUOI[b]; }
  function h12(h) { const x = ((h % 12) + 12) % 12; return x === 0 ? 12 : x; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function giaTriGio(h, m) { return h + ':' + pad(m); }
  /** Đọc giá trị giờ: '8:15', '08:15', '20:00', { h, m } → { h, m } hoặc null. */
  function docGio(v) {
    if (v && typeof v === 'object' && v.h != null) return { h: +v.h, m: +v.m || 0 };
    const t = /^\s*(\d{1,2})\s*[:h]\s*(\d{1,2})\s*$/.exec(String(v == null ? '' : v));
    if (!t) return null;
    const h = +t[1], m = +t[2];
    if (h > 24 || m > 59) return null;
    return { h: h, m: m };
  }
  /** "8 giờ 15 phút", "8 giờ". */
  function chuGio(h, m) { return h + ' giờ' + (m ? ' ' + m + ' phút' : ''); }
  /** Cách gọi theo buổi: "3 giờ 30 phút chiều", "12 giờ trưa", "12 giờ đêm". */
  function chuGio12(h24, m) { return chuGio(h12(h24), m) + ' ' + TEN_BUOI[buoiCua(h24)]; }
  /** Cách gọi 24 giờ: "15 giờ 30 phút" (0 giờ gọi là 24 giờ như SGK). */
  function chuGio24(h24, m) { return chuGio(h24 % 24 === 0 ? 24 : h24 % 24, m); }
  /** Đồng hồ điện tử: "07:00", "14:30". */
  function dienTu(h, m) { return pad(h % 24) + ':' + pad(m); }
  function soKimPhut(m) { const k = Math.round(m / 5) % 12; return k === 0 ? 12 : k; }
  /** Khoảng cách giữa hai giờ trên vòng 24 giờ. */
  function lechGio(a, b) { const d = Math.abs(((a % 24) + 24) % 24 - ((b % 24) + 24) % 24); return Math.min(d, 24 - d); }

  /* ============================================================
     Hình SVG: đồng hồ kim, đồng hồ điện tử, tờ lịch, dải giờ trong ngày
     Mỗi hình có mã riêng cho gradient (nhiều hình trên cùng trang không giẫm lên nhau).
     ============================================================ */

  let soHinh = 0;
  function maHinh(t) { soHinh = (soHinh + 1) % 1000000; return 'tg' + t + soHinh; }
  function f1(x) { return Math.round(x * 10) / 10; }
  function diem(r, goc) { const a = goc * Math.PI / 180; return { x: f1(Math.sin(a) * r), y: f1(-Math.cos(a) * r) }; }
  function hinhQuat(r, goc1, goc2) {
    const a = diem(r, goc1), b = diem(r, goc2);
    const lon = ((goc2 - goc1) % 360 + 360) % 360 > 180 ? 1 : 0;
    return 'M0 0 L' + a.x + ' ' + a.y + ' A' + r + ' ' + r + ' 0 ' + lon + ' 1 ' + b.x + ' ' + b.y + ' Z';
  }

  /** Biểu tượng buổi (mặt trời mọc, mặt trời, mặt trời lặn, trăng, trăng và sao) vẽ quanh (x, y), cỡ s. */
  function bieuBuoi(b, x, y, s) {
    const k = s / 24;
    const g = function (noi) { return '<g transform="translate(' + x + ' ' + y + ') scale(' + f1(k) + ')">' + noi + '</g>'; };
    const tia = function (r1, r2, mau) {
      let t = '';
      for (let i = 0; i < 8; i++) { const a = diem(r1, i * 45), c = diem(r2, i * 45); t += '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + c.x + '" y2="' + c.y + '" stroke="' + mau + '" stroke-width="3" stroke-linecap="round"/>'; }
      return t;
    };
    if (b === 'sang') return g('<path d="M-12 4 A12 12 0 0 1 12 4 Z" fill="#ffb703"/>' + '<line x1="-16" y1="5" x2="16" y2="5" stroke="#e76f51" stroke-width="3" stroke-linecap="round"/>' +
      '<line x1="0" y1="-14" x2="0" y2="-10" stroke="#ffb703" stroke-width="3" stroke-linecap="round"/><line x1="-11" y1="-9" x2="-8" y2="-6" stroke="#ffb703" stroke-width="3" stroke-linecap="round"/><line x1="11" y1="-9" x2="8" y2="-6" stroke="#ffb703" stroke-width="3" stroke-linecap="round"/>');
    if (b === 'trua') return g(tia(12, 16, '#ffb703') + '<circle r="9" fill="#ffd166" stroke="#ffb703" stroke-width="2"/>');
    if (b === 'chieu') {
      let t = '';
      [270, 315, 0, 45, 90].forEach(function (goc) { const a = diem(13, goc), c = diem(17, goc); t += '<line x1="' + a.x + '" y1="' + f1(a.y - 1) + '" x2="' + c.x + '" y2="' + f1(c.y - 1) + '" stroke="#ff8c42" stroke-width="3" stroke-linecap="round"/>'; });
      return g('<circle cy="-1" r="9" fill="#ff8c42"/>' + t + '<line x1="-16" y1="13" x2="16" y2="13" stroke="#c8553d" stroke-width="3" stroke-linecap="round"/>');
    }
    if (b === 'toi') return g('<path d="M4 -12 A12 12 0 1 0 12 6 A9 9 0 1 1 4 -12 Z" fill="#ffe08a"/>');
    return g('<path d="M2 -12 A12 12 0 1 0 10 6 A9 9 0 1 1 2 -12 Z" fill="#ffe08a"/><path d="M11 -12 l1.6 3.4 3.6 .5 -2.6 2.5 .6 3.6 -3.2 -1.7 -3.2 1.7 .6 -3.6 -2.6 -2.5 3.6 -.5z" fill="#fff"/>');
  }

  /**
   * Đồng hồ kim như SGK: mặt kem, 12 số, vạch phút, kim giờ ngắn và mập (xanh đậm), kim phút dài và mảnh (đỏ).
   * opts: size (px, mặc định 220), buoi ('sang' … nhãn buổi dưới đồng hồ), giai (tô cung kim phút đã đi, khoanh số kim phút
   * chỉ, tô khoảng giữa hai số của kim giờ), chuThich (chú thích kim giờ, kim phút), cls, aria, tuongTac (thêm lớp cho kim để game quay).
   */
  function svgDongHo(h, m, o) {
    o = o || {};
    const id = maHinh('d');
    const size = o.size || 220;
    const duoi = (o.buoi ? 50 : 0) + (o.chuThich ? 46 : 0);
    const vbH = 260 + duoi;
    const aGio = ((h % 12) + m / 60) * 30, aPhut = (m % 60) * 6;
    let s = '<svg class="dh-svg' + (o.cls ? ' ' + o.cls : '') + '" viewBox="-130 -130 260 ' + vbH + '" width="' + size + '" height="' + Math.round(size * vbH / 260) + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + esc(o.aria || ('Đồng hồ chỉ ' + chuGio(h12(h), m))) + '">';
    s += '<defs><radialGradient id="' + id + 'm" cx="42%" cy="36%" r="72%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#f4ead3"/></radialGradient>' +
      '<linearGradient id="' + id + 'v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6aa8ff"/><stop offset=".55" stop-color="#3d7be0"/><stop offset="1" stop-color="#2451b3"/></linearGradient></defs>';
    s += '<circle cy="7" r="121" fill="#16225a" opacity=".22"/>';
    s += '<circle r="121" fill="url(#' + id + 'v)"/>';
    s += '<path d="M-96 -62 A114 114 0 0 1 58 -104" stroke="#ffffff" stroke-opacity=".5" stroke-width="6" fill="none" stroke-linecap="round"/>';
    s += '<circle r="104" fill="url(#' + id + 'm)" stroke="#1d3f8f" stroke-width="3"/>';
    if (o.giai) {
      if (m > 0) s += '<path d="' + hinhQuat(98, 0, aPhut) + '" fill="#e63946" opacity=".13"/>';
      s += '<path d="' + hinhQuat(64, (h % 12) * 30, (h % 12) * 30 + 30) + '" fill="#3d7be0" opacity=".28"/>';
      const p = diem(78, soKimPhut(m) * 30);
      s += '<circle cx="' + p.x + '" cy="' + p.y + '" r="17" fill="#ffe08a" stroke="#e0a800" stroke-width="3"/>';
    }
    for (let i = 0; i < 60; i++) {
      const lon = i % 5 === 0;
      const a = diem(lon ? 88 : 93, i * 6), b = diem(99, i * 6);
      s += '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '" stroke="' + (lon ? '#1d3f8f' : '#a8b3d6') + '" stroke-width="' + (lon ? 3.5 : 1.6) + '" stroke-linecap="round"/>';
    }
    for (let n = 1; n <= 12; n++) {
      const p = diem(76, n * 30);
      s += '<text x="' + p.x + '" y="' + f1(p.y + 1) + '" text-anchor="middle" dominant-baseline="central" font-family="' + FONT + '" font-size="25" font-weight="800" fill="#22264a">' + n + '</text>';
    }
    const lopG = o.tuongTac ? ' class="dh-kim dh-kim-gio"' : '';
    const lopP = o.tuongTac ? ' class="dh-kim dh-kim-phut"' : '';
    s += '<g' + lopG + ' transform="rotate(' + f1(aGio) + ')"><path d="M-7 13 L-5 -47 Q0 -60 5 -47 L7 13 Q0 19 -7 13 Z" fill="#22326e"/><path d="M-1.6 6 L-1.2 -44" stroke="#6f86d6" stroke-width="2" stroke-linecap="round" opacity=".7"/></g>';
    s += '<g' + lopP + ' transform="rotate(' + f1(aPhut) + ')"><path d="M-4.4 16 L-2.8 -84 Q0 -93 2.8 -84 L4.4 16 Q0 21 -4.4 16 Z" fill="#e63946"/></g>';
    s += '<circle r="9.5" fill="#ffb703" stroke="#8a5a00" stroke-width="2.5"/><circle r="3" fill="#8a5a00"/>';
    let y = 132;
    if (o.buoi) {
      s += '<rect x="-84" y="' + y + '" width="168" height="40" rx="20" fill="#fff4d6" stroke="#e0a800" stroke-width="2.5"/>';
      s += bieuBuoi(o.buoi, -58, y + 20, 26);
      s += '<text x="-38" y="' + (y + 21) + '" dominant-baseline="central" font-family="' + FONT + '" font-size="21" font-weight="800" fill="#7a4d00">' + esc(vaoBuoi(o.buoi)) + '</text>';
      y += 50;
    }
    if (o.chuThich) {
      s += '<rect x="-122" y="' + (y + 4) + '" width="244" height="36" rx="18" fill="#ffffff" stroke="#d9d2ee" stroke-width="2"/>';
      s += '<rect x="-108" y="' + (y + 17) + '" width="30" height="10" rx="5" fill="#22326e"/><text x="-72" y="' + (y + 23) + '" dominant-baseline="central" font-family="' + FONT + '" font-size="17" font-weight="800" fill="#22326e">kim giờ</text>';
      s += '<rect x="4" y="' + (y + 18) + '" width="44" height="7" rx="3.5" fill="#e63946"/><text x="54" y="' + (y + 23) + '" dominant-baseline="central" font-family="' + FONT + '" font-size="17" font-weight="800" fill="#b3264b">kim phút</text>';
    }
    return s + '</svg>';
  }

  /** Đồng hồ điện tử như tranh SGK ("14:30"). opts: size (px rộng, mặc định 160), cls. */
  function svgDienTu(h, m, o) {
    o = o || {};
    const id = maHinh('e');
    const w = o.size || 160;
    const chu = dienTu(h, m);
    let s = '<svg class="dt-svg' + (o.cls ? ' ' + o.cls : '') + '" viewBox="0 0 200 118" width="' + w + '" height="' + Math.round(w * 118 / 200) + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + esc('Đồng hồ điện tử ' + chu) + '">';
    s += '<defs><linearGradient id="' + id + 'v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a6bc4"/><stop offset="1" stop-color="#2e3a86"/></linearGradient>' +
      '<linearGradient id="' + id + 'm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3fff0"/><stop offset="1" stop-color="#bdf3d6"/></linearGradient></defs>';
    s += '<rect x="22" y="100" width="22" height="14" rx="6" fill="#26306a"/><rect x="156" y="100" width="22" height="14" rx="6" fill="#26306a"/>';
    s += '<rect x="6" y="10" width="188" height="96" rx="24" fill="#1d255c" opacity=".25"/>';
    s += '<rect x="4" y="4" width="192" height="98" rx="24" fill="url(#' + id + 'v)"/>';
    s += '<rect x="16" y="16" width="168" height="74" rx="14" fill="url(#' + id + 'm)" stroke="#1d255c" stroke-width="2"/>';
    s += '<text x="100" y="55" text-anchor="middle" dominant-baseline="central" font-family="' + FONT + '" font-size="54" font-weight="800" fill="#12324a" letter-spacing="2">' + chu + '</text>';
    return s + '</svg>';
  }

  /* ---------------- Tờ lịch ---------------- */

  const THU = ['thu_hai', 'thu_ba', 'thu_tu', 'thu_nam', 'thu_sau', 'thu_bay', 'chu_nhat'];
  const TEN_THU = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ nhật'];
  const SO_NGAY = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const TEN_THANG = ['Một', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy', 'Tám', 'Chín', 'Mười', 'Mười Một', 'Mười Hai'];
  /** Ngày lễ trong SGK Bài 30, 31 (tô đỏ trên tờ lịch). */
  const LE = [
    { thang: 1, ngay: 1, ten: 'Tết Dương lịch' }, { thang: 2, ngay: 27, ten: 'Ngày Thầy thuốc Việt Nam' },
    { thang: 3, ngay: 8, ten: 'Ngày Quốc tế Phụ nữ' }, { thang: 4, ngay: 30, ten: 'Ngày Giải phóng miền Nam' },
    { thang: 5, ngay: 19, ten: 'Sinh nhật Bác Hồ' }, { thang: 6, ngay: 1, ten: 'Ngày Quốc tế Thiếu nhi' },
    { thang: 9, ngay: 2, ten: 'Ngày Quốc khánh' }, { thang: 11, ngay: 20, ten: 'Ngày Nhà giáo Việt Nam' }
  ];
  function leCua(thang, ngay) { return LE.find(function (x) { return x.thang === thang && x.ngay === ngay; }) || null; }
  function soNgay(thang) { return SO_NGAY[(thang - 1) % 12]; }
  /** Thứ (0: Thứ Hai … 6: Chủ nhật) của ngày n; t1 là thứ của ngày 1. */
  function thuCua(p, n) { return (p.t1 + n - 1) % 7; }
  /** Trong câu: "thứ Hai", "Chủ nhật". */
  function thuTrongCau(i) { return i === 6 ? 'Chủ nhật' : 'thứ ' + TEN_THU[i].slice(4); }
  function vietHoa(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
  function viTriO(p, n) { const i = p.t1 + n - 1; return { hang: Math.floor(i / 7), cot: i % 7 }; }

  /**
   * Tờ lịch tháng như SGK: cột Thứ Hai … Chủ nhật, Chủ nhật và ngày lễ màu đỏ.
   * p: { thang, t1 }; opts: khoanh [ngày], cot (tô một cột thứ), hoi (ô có dấu ?), dung [ngày tô xanh], muiTen [từ, đến],
   * an [ngày để trống], size (px rộng, mặc định 300), cls.
   */
  function svgLich(p, o) {
    o = o || {};
    const id = maHinh('l');
    const sn = soNgay(p.thang);
    const soHang = Math.ceil((p.t1 + sn) / 7);
    const W = 364, cot = 50, x0 = 7, yTd = 16, hTd = 50, hDau = 42, hHang = 40;
    const yDau = yTd + hTd + 4, yNgay = yDau + hDau;
    const H = yNgay + soHang * hHang + 12;
    const w = o.size || 300;
    const khoanh = o.khoanh || [], dung = o.dung || [], an = o.an || [];
    const tam = function (n) { const v = viTriO(p, n); return { x: x0 + v.cot * cot + cot / 2, y: yNgay + v.hang * hHang + hHang / 2 }; };
    let s = '<svg class="lich-svg' + (o.cls ? ' ' + o.cls : '') + '" viewBox="0 0 ' + W + ' ' + H + '" width="' + w + '" height="' + Math.round(w * H / W) + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + esc('Tờ lịch tháng ' + p.thang) + '">';
    s += '<defs><linearGradient id="' + id + 'd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff6b5e"/><stop offset="1" stop-color="#d83a32"/></linearGradient></defs>';
    s += '<rect x="6" y="' + (yTd + 6) + '" width="' + (W - 8) + '" height="' + (H - yTd - 6) + '" rx="18" fill="#7a2a1c" opacity=".18"/>';
    s += '<rect x="3" y="' + yTd + '" width="' + (W - 6) + '" height="' + (H - yTd - 4) + '" rx="18" fill="#fffaf0" stroke="#ead9b4" stroke-width="2"/>';
    s += '<path d="M3 ' + (yTd + 18) + ' Q3 ' + yTd + ' 21 ' + yTd + ' L' + (W - 21) + ' ' + yTd + ' Q' + (W - 3) + ' ' + yTd + ' ' + (W - 3) + ' ' + (yTd + 18) + ' L' + (W - 3) + ' ' + (yTd + hTd) + ' L3 ' + (yTd + hTd) + ' Z" fill="url(#' + id + 'd)"/>';
    [W * 0.3, W * 0.7].forEach(function (x) { s += '<rect x="' + f1(x - 7) + '" y="4" width="14" height="26" rx="7" fill="#fffaf0" stroke="#9c2a22" stroke-width="3"/>'; });
    s += '<text x="' + (W / 2) + '" y="' + (yTd + hTd / 2 + 2) + '" text-anchor="middle" dominant-baseline="central" font-family="' + FONT + '" font-size="27" font-weight="800" fill="#ffffff" letter-spacing="1">THÁNG ' + p.thang + '</text>';
    if (o.cot != null) s += '<rect x="' + (x0 + o.cot * cot + 3) + '" y="' + (yDau + 1) + '" width="' + (cot - 6) + '" height="' + (hDau + soHang * hHang + 2) + '" rx="12" fill="#3d7be0" opacity=".16"/>';
    for (let c = 0; c < 7; c++) {
      const x = x0 + c * cot + cot / 2;
      const mau = c === 6 ? '#d83a32' : '#3b2f63';
      const hai = c === 6 ? ['Chủ', 'nhật'] : ['Thứ', TEN_THU[c].slice(4)];
      s += '<text x="' + x + '" y="' + (yDau + 13) + '" text-anchor="middle" dominant-baseline="central" font-family="' + FONT + '" font-size="13" font-weight="700" fill="' + mau + '">' + hai[0] + '</text>';
      s += '<text x="' + x + '" y="' + (yDau + 30) + '" text-anchor="middle" dominant-baseline="central" font-family="' + FONT + '" font-size="17" font-weight="800" fill="' + mau + '">' + hai[1] + '</text>';
    }
    s += '<line x1="12" y1="' + (yNgay - 2) + '" x2="' + (W - 12) + '" y2="' + (yNgay - 2) + '" stroke="#ead9b4" stroke-width="2"/>';
    for (let n = 1; n <= sn; n++) {
      const t = tam(n);
      const c = viTriO(p, n).cot;
      if (dung.indexOf(n) >= 0) s += '<circle cx="' + t.x + '" cy="' + t.y + '" r="17" fill="#06d6a0"/>';
      if (khoanh.indexOf(n) >= 0) s += '<circle cx="' + t.x + '" cy="' + t.y + '" r="17" fill="#ffe08a" stroke="#ff8a1f" stroke-width="3"/>';
      if (o.hoi === n) {
        s += '<rect x="' + (t.x - 18) + '" y="' + (t.y - 16) + '" width="36" height="32" rx="9" fill="#ff8a1f"/>';
        s += '<text x="' + t.x + '" y="' + (t.y + 1) + '" text-anchor="middle" dominant-baseline="central" font-family="' + FONT + '" font-size="22" font-weight="800" fill="#ffffff">?</text>';
        continue;
      }
      if (an.indexOf(n) >= 0) continue;
      const mau = dung.indexOf(n) >= 0 ? '#053d33' : (c === 6 || leCua(p.thang, n)) ? '#d83a32' : '#221a3b';
      s += '<text x="' + t.x + '" y="' + (t.y + 1) + '" text-anchor="middle" dominant-baseline="central" font-family="' + FONT + '" font-size="21" font-weight="800" fill="' + mau + '">' + n + '</text>';
    }
    if (o.muiTen) {
      // Mũi tên cong bên phải cột (không đè chữ của cột bên cạnh); nhãn +7 nằm ở khe giữa hai hàng số
      const a = tam(o.muiTen[0]), b = tam(o.muiTen[1]);
      const lui = b.y < a.y;
      const x = Math.max(a.x, b.x) + 30;
      const dau = lui ? -1 : 1;
      const d = 'M' + (a.x + 12) + ' ' + (a.y + 12 * dau) + ' C' + x + ' ' + (a.y + 10 * dau) + ' ' + x + ' ' + (b.y - 10 * dau) + ' ' + (b.x + 14) + ' ' + (b.y - 11 * dau);
      s += '<path d="' + d + '" fill="none" stroke="#ff6b35" stroke-width="3.5" stroke-linecap="round"/>';
      s += '<path d="M' + (b.x + 12) + ' ' + (b.y - 9 * dau) + ' l9 ' + (-2 * dau) + ' l-4 ' + (-8 * dau) + ' z" fill="#ff6b35"/>';
      const my = f1((a.y + b.y) / 2);
      s += '<rect x="' + (x - 14) + '" y="' + (my - 9) + '" width="34" height="18" rx="9" fill="#ff6b35"/>';
      s += '<text x="' + (x + 3) + '" y="' + (my + 1) + '" text-anchor="middle" dominant-baseline="central" font-family="' + FONT + '" font-size="14" font-weight="800" fill="#ffffff">' + (lui ? '−7' : '+7') + '</text>';
    }
    return s + '</svg>';
  }

  /* ---------------- Dải giờ trong ngày ---------------- */

  const MAU_BUOI = {
    sang: ['#a9dcff', '#ffe7a3'], trua: ['#ffe066', '#ffd23f'], chieu: ['#ffc07a', '#ff8e6e'], toi: ['#7a6ae0', '#4b43a8'], dem: ['#2a3470', '#1a2150']
  };
  /**
   * Dải 24 giờ chia 5 buổi như bảng SGK (vạch 1 đến 24). opts: danhDau [{ h, m, nhan, mau }], buoi (tô sáng một buổi),
   * nhan12 (ghi thêm cách gọi theo buổi dưới 13 đến 24), size (px rộng, mặc định 640), cls.
   */
  function svgDai(o) {
    o = o || {};
    const id = maHinh('g');
    const W = 720, x0 = 10, u = 700 / 24, yT = 40, hT = 66;
    const X = function (hh) { return f1(x0 + (hh - 0.5) * u); };
    const H = o.nhan12 ? 150 : 132;
    const w = o.size || 640;
    let s = '<svg class="dai-svg' + (o.cls ? ' ' + o.cls : '') + '" viewBox="0 0 ' + W + ' ' + H + '" width="' + w + '" height="' + Math.round(w * H / W) + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Dải giờ trong một ngày">';
    s += '<defs>' + BUOI.map(function (b) { return '<linearGradient id="' + id + b + '" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="' + MAU_BUOI[b][0] + '"/><stop offset="1" stop-color="' + MAU_BUOI[b][1] + '"/></linearGradient>'; }).join('') +
      '<clipPath id="' + id + 'c"><rect x="' + x0 + '" y="' + yT + '" width="700" height="' + hT + '" rx="20"/></clipPath></defs>';
    s += '<rect x="' + (x0 + 2) + '" y="' + (yT + 5) + '" width="700" height="' + hT + '" rx="20" fill="#16225a" opacity=".2"/>';
    s += '<g clip-path="url(#' + id + 'c)">';
    BUOI.forEach(function (b) {
      const k = GIO_BUOI[b];
      const xa = x0 + (k[0] - 1) * u, xb = x0 + k[1] * u;
      const mo = o.buoi && o.buoi !== b;
      s += '<rect x="' + f1(xa) + '" y="' + yT + '" width="' + f1(xb - xa) + '" height="' + hT + '" fill="url(#' + id + b + ')"' + (mo ? ' opacity=".35"' : '') + '/>';
      const giua = (xa + xb) / 2;
      const hep = b === 'trua';
      const vua = xb - xa < 100;
      s += bieuBuoi(b, f1(hep ? giua : giua - (vua ? 26 : 34)), yT + (hep ? 20 : 33), hep ? 20 : vua ? 22 : 26);
      s += '<text x="' + f1(hep ? giua : giua + (vua ? 14 : 10)) + '" y="' + (yT + (hep ? 48 : 34)) + '" text-anchor="middle" dominant-baseline="central" font-family="' + FONT + '" font-size="' + (hep ? 16 : vua ? 19 : 22) + '" font-weight="800" fill="' + (b === 'toi' || b === 'dem' ? '#ffffff' : '#3b2400') + '"' + (mo ? ' opacity=".5"' : '') + '>' + vietHoa(TEN_BUOI[b]) + '</text>';
    });
    s += '</g>';
    if (o.buoi) {
      const k = GIO_BUOI[o.buoi];
      s += '<rect x="' + f1(X(k[0]) - u / 2) + '" y="' + (yT - 3) + '" width="' + f1((k[1] - k[0] + 1) * u) + '" height="' + (hT + 6) + '" rx="16" fill="none" stroke="#ffd166" stroke-width="5"/>';
    }
    for (let hh = 1; hh <= 24; hh++) {
      const x = X(hh);
      s += '<line x1="' + x + '" y1="' + (yT + hT + 2) + '" x2="' + x + '" y2="' + (yT + hT + 9) + '" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>';
      s += '<text x="' + x + '" y="' + (yT + hT + 22) + '" text-anchor="middle" dominant-baseline="central" font-family="' + FONT + '" font-size="18" font-weight="800" fill="#ffffff" stroke="#221a3b" stroke-width="3.5" paint-order="stroke">' + hh + '</text>';
      if (o.nhan12 && hh >= 13) s += '<text x="' + x + '" y="' + (yT + hT + 40) + '" text-anchor="middle" dominant-baseline="central" font-family="' + FONT + '" font-size="13" font-weight="800" fill="#ffe08a" stroke="#221a3b" stroke-width="3" paint-order="stroke">' + (hh - 12) + '</text>';
    }
    (o.danhDau || []).forEach(function (d) {
      const x = X(d.h === 0 ? 24 : d.h + (d.m || 0) / 60);
      const mau = d.mau || '#ff6b35';
      s += '<line x1="' + x + '" y1="' + (yT - 8) + '" x2="' + x + '" y2="' + (yT + hT) + '" stroke="' + mau + '" stroke-width="4" stroke-linecap="round"/>';
      s += '<circle cx="' + x + '" cy="' + (yT + hT - 4) + '" r="6" fill="' + mau + '" stroke="#ffffff" stroke-width="2"/>';
      if (d.nhan != null) {
        const rong = Math.max(30, String(d.nhan).length * 10 + 16);
        s += '<rect x="' + f1(Math.min(W - rong - 2, Math.max(2, x - rong / 2))) + '" y="4" width="' + rong + '" height="28" rx="14" fill="' + mau + '"/>';
        s += '<text x="' + f1(Math.min(W - rong / 2 - 2, Math.max(2 + rong / 2, x))) + '" y="19" text-anchor="middle" dominant-baseline="central" font-family="' + FONT + '" font-size="17" font-weight="800" fill="#ffffff">' + esc(d.nhan) + '</text>';
      }
    });
    return s + '</svg>';
  }

  window.DongHo = { svg: svgDongHo, dienTu: svgDienTu, lich: svgLich, dai: svgDai, bieuBuoi: bieuBuoi };

  /* ============================================================
     Loại 'xem_gio': đọc đồng hồ, quay kim (B2.11)
     ============================================================ */

  const PHUT = [0, 15, 30];

  function tinhXG(ct) { return giaTriGio(ct.h, ct.m); }
  function gioXG(v) { const x = docGio(v); return x ? { h: h12(x.h), m: x.m } : null; }
  function deXG(ct) { return ct.kieu === 'quay' ? 'Đồng hồ nào chỉ ' + chuGio(ct.h, ct.m) + '?' : 'Đồng hồ chỉ mấy giờ?'; }
  function maXG(ct) { return ct.kieu + ':' + ct.h + ':' + pad(ct.m); }

  /** Đọc (hay quay) đổi vai hai kim: số kim phút chỉ thành giờ, số kim giờ chỉ (hoặc số kế tiếp khi kim giờ ở giữa) thành phút. */
  function doiKim(h, m) {
    const g = h % 12;
    const ra = [giaTriGio(soKimPhut(m), (g * 5) % 60)];
    if (m >= 30) ra.push(giaTriGio(soKimPhut(m), ((g + 1) * 5) % 60));
    return ra;
  }

  function nhanBietLoiXG(ct, v) {
    const x = gioXG(v);
    if (!x) return ['khac'];
    if (x.h === ct.h && x.m === ct.m) return [];
    const ma = [];
    if (doiKim(ct.h, ct.m).indexOf(giaTriGio(x.h, x.m)) >= 0) ma.push('nham-kim');
    if (x.m === ct.m && (x.h === h12(ct.h + 1) || x.h === h12(ct.h - 1))) ma.push('lech-gio');
    if (x.h === ct.h && ((ct.m > 0 && x.m === ct.m / 5) || (ct.m === 0 && x.m === 12))) ma.push('doc-so-phut');
    return ma.length ? ma : ['khac'];
  }

  function loiNoiXG(ct, v, maLoi) {
    const m0 = (maLoi && maLoi[0]) || 'khac';
    if (m0 === 'nham-kim') return 'Kim ngắn là kim giờ, kim dài là kim phút. Con nhầm hai kim rồi';
    if (m0 === 'lech-gio') {
      if (ct.m === 30) return 'Kim giờ nằm giữa hai số thì ta đọc theo số bé hơn';
      if (ct.m === 15) return 'Kim giờ vừa đi qua số nào thì ta đọc số đó';
      return 'Con nhìn kỹ kim giờ (kim ngắn) chỉ số mấy nhé';
    }
    if (m0 === 'doc-so-phut') return ct.m === 0 ? 'Kim phút chỉ số 12 là giờ đúng, không phải 12 phút' : 'Kim phút chỉ số ' + (ct.m / 5) + ' là ' + ct.m + ' phút, không phải ' + (ct.m / 5) + ' phút';
    return ct.kieu === 'quay' ? 'Đồng hồ chưa chỉ đúng giờ đó' : 'Chưa đúng rồi';
  }

  function goiYXG(ct) {
    const k = soKimPhut(ct.m);
    const phut = ct.m === 0 ? 'Kim phút (kim dài) chỉ số 12 là giờ đúng.' : 'Kim phút (kim dài) chỉ số ' + k + ' là ' + ct.m + ' phút.';
    const gio = ct.m === 0 ? 'Kim giờ chỉ đúng số ' + ct.h + '.' : ct.m === 30 ? 'Kim giờ nằm giữa số ' + ct.h + ' và số ' + h12(ct.h + 1) + ', ta đọc số ' + ct.h + '.' : 'Kim giờ vừa đi qua số ' + ct.h + ' một chút.';
    // Dùng được cho cả hai dạng: bé tự quay kim (Lật Lịch) và bé chọn đồng hồ đúng (Đấu Trường, game cũ)
    if (ct.kieu === 'quay') return ['Kim ngắn là kim giờ, kim dài là kim phút. Xét từng kim một.', phut, gio];
    return ['Kim ngắn là kim giờ, kim dài là kim phút. Xem kim phút trước.', phut, gio];
  }

  function loiGiaiXG(ct) {
    const k = soKimPhut(ct.m);
    const buoc = [
      ct.m === 0 ? 'Kim phút (kim dài) chỉ số 12 là giờ đúng' : 'Kim phút (kim dài) chỉ số ' + k + ' là ' + ct.m + ' phút',
      ct.m === 0 ? 'Kim giờ (kim ngắn) chỉ số ' + ct.h + ' là ' + ct.h + ' giờ'
        : ct.m === 30 ? 'Kim giờ (kim ngắn) nằm giữa số ' + ct.h + ' và số ' + h12(ct.h + 1) + ', đọc là ' + ct.h + ' giờ'
          : 'Kim giờ (kim ngắn) vừa qua số ' + ct.h + ' là ' + ct.h + ' giờ'
    ];
    return { ma: ct.kieu === 'quay' ? 'quay-kim' : 'doc-dong-ho', buoc: buoc, html: svgDongHo(ct.h, ct.m, { size: 200, giai: true, chuThich: true }), kq: tinhXG(ct) };
  }

  function taoNhieuXG(kyNang, ct, rng) {
    const d = tinhXG(ct);
    const ung = [];
    const them = function (h, m, w) { const v = giaTriGio(h, m); if (v !== d && !ung.some(function (u) { return u.v === v; })) ung.push({ v: v, w: w }); };
    // Đổi vai hai kim: khi chọn trong các đồng hồ thì hình đổi kim rất dễ nhầm; khi chọn chữ thì chỉ lấy số phút trong phạm vi lớp 2
    doiKim(ct.h, ct.m).forEach(function (v) { const x = docGio(v); if (ct.kieu === 'quay' || PHUT.indexOf(x.m) >= 0) them(x.h, x.m, 2.5); });
    // Lệch giờ: giờ 30 phút hay đọc theo số lớn hơn
    them(h12(ct.h + 1), ct.m, ct.m === 30 ? 3 : 1.2);
    them(h12(ct.h - 1), ct.m, ct.m === 15 ? 1.2 : 0.8);
    // Đọc số kim phút chỉ thành số phút (chỉ khi lựa chọn là chữ; trên hình đồng hồ gần như không phân biệt được)
    if (ct.kieu !== 'quay') them(ct.h, ct.m === 0 ? 12 : ct.m / 5, 1.8);
    const ra = chonHaiNhieu(rng, ung);
    return ra.map(function (v) { return { gia_tri: v, loi: nhanBietLoiXG(ct, v) }; });
  }

  function sinhXG(rng, muc) {
    const kieu = chonCach(rng, muc, [['doc', 0.55], ['quay', 0.45]]);
    const phut = muc && Array.isArray(muc.phut) ? muc.phut.filter(function (p) { return PHUT.indexOf(p) >= 0; }) : [];
    const m = phut.length ? phut[Math.floor(rng() * phut.length)] : chonTrongSo(rng, [[0, 0.3], [15, 0.35], [30, 0.35]]);
    return { loai: 'xem_gio', kieu: kieu, h: nn(rng, 1, 12), m: m };
  }

  NH.dangKyLoai('xem_gio', {
    tinh: tinhXG, de: deXG, deDoc: deXG, deChuanHoa: maXG, nhanBietLoi: nhanBietLoiXG, loiNoi: loiNoiXG,
    goiY: goiYXG, loiGiai: loiGiaiXG, taoNhieu: taoNhieuXG,
    ketLuan: function (ct) { return 'Vậy đồng hồ chỉ ' + chuGio(ct.h, ct.m); },
    hienGiaTri: function (v) { const x = gioXG(v); return x ? chuGio(x.h, x.m) : String(v); },
    theChu: function (ct) { return ct.kieu === 'quay' ? chuGio(ct.h, ct.m) : 'Đồng hồ chỉ mấy giờ?'; },
    veHinh: function (ct) { return ct.kieu === 'quay' ? '' : svgDongHo(ct.h, ct.m, { size: 240 }); },
    veLuaChon: function (ct, v) {
      const x = gioXG(v);
      if (!x) return { nhan: String(v) };
      return { nhan: chuGio(x.h, x.m), dong_ho: { h: x.h, m: x.m }, hinh: svgDongHo(x.h, x.m, { size: 120 }), hien: ct.kieu === 'quay' ? 'dong_ho' : 'chu' };
    },
    dang: function (ct) { return ct.kieu === 'quay' ? 'thao_tac_hinh' : 'chon_dap_an'; }
  });

  /* ============================================================
     Loại 'ngay_gio': các buổi, một ngày 24 giờ, thứ tự việc trong ngày (B2.12)
     ============================================================ */

  /** Việc trong ngày của bạn Nam, giờ lấy theo tranh SGK Bài 29, 31, 36 (buổi của việc khớp bảng buổi). */
  const VIEC = {
    tap_the_duc: { ten: 'Tập thể dục', bieu: '🤸', h: 6, m: 0 },
    an_sang: { ten: 'Ăn sáng', bieu: '🥣', h: 6, m: 30 },
    di_hoc: { ten: 'Đi học', bieu: '🎒', h: 7, m: 0 },
    hoc_bai: { ten: 'Học bài', bieu: '📚', h: 9, m: 30 },
    xep_hinh: { ten: 'Xếp hình', bieu: '🧩', h: 10, m: 30 },
    an_trua: { ten: 'Ăn cơm trưa', bieu: '🍚', h: 11, m: 30 },
    ve_tranh: { ten: 'Vẽ tranh', bieu: '🎨', h: 14, m: 0 },
    dap_xe: { ten: 'Đạp xe', bieu: '🚲', h: 15, m: 30 },
    cau_ca: { ten: 'Câu cá', bieu: '🎣', h: 16, m: 0 },
    da_bong: { ten: 'Đá bóng', bieu: '⚽', h: 16, m: 30 },
    nhat_rau: { ten: 'Nhặt rau', bieu: '🥬', h: 17, m: 30 },
    rua_bat: { ten: 'Rửa bát', bieu: '🍽️', h: 19, m: 15 },
    doc_sach: { ten: 'Đọc sách', bieu: '📖', h: 19, m: 30 },
    xem_phim: { ten: 'Xem hoạt hình', bieu: '📺', h: 20, m: 0 },
    di_ngu: { ten: 'Đi ngủ', bieu: '🛏️', h: 21, m: 30 }
  };
  const MA_VIEC = Object.keys(VIEC);
  function phutCua(ma) { return VIEC[ma].h * 60 + VIEC[ma].m; }
  /** Thứ tự đúng theo thời gian trong ngày. */
  function thuTuDung(ds) { return ds.slice().sort(function (a, b) { return phutCua(a) - phutCua(b); }); }
  /** Thứ tự khi bé chỉ nhìn số giờ mà quên buổi (3 giờ chiều xếp trước 10 giờ sáng). */
  function thuTuQuenBuoi(ds) { return ds.slice().sort(function (a, b) { return (h12(VIEC[a].h) % 12) * 60 + VIEC[a].m - ((h12(VIEC[b].h) % 12) * 60 + VIEC[b].m) || phutCua(a) - phutCua(b); }); }
  function docDsViec(v) { return (Array.isArray(v) ? v : String(v == null ? '' : v).split(/[,\s]+/)).filter(Boolean); }
  function chuViec(ma) { return VIEC[ma] ? VIEC[ma].ten : ma; }
  function chuThuTu(v) { return docDsViec(v).map(chuViec).join(' → '); }
  /** "Ăn sáng lúc 6 giờ 30 phút sáng". */
  function viecLuc(ma) { const x = VIEC[ma]; return x.ten + ' lúc ' + chuGio12(x.h, x.m); }

  function laGio(ct) { return ct.kieu === 'doi_24' || ct.kieu === 'doi_12' || ct.kieu === 'dong_ho_buoi'; }

  function tinhNG(ct) {
    if (ct.kieu === 'buoi') return buoiCua(ct.h);
    if (ct.kieu === 'thu_tu') return thuTuDung(ct.viec).join(',');
    return giaTriGio(ct.h % 24, ct.m || 0);
  }

  function deNG(ct) {
    if (ct.kieu === 'buoi') return 'Lúc ' + ct.h + ' giờ là buổi nào?';
    if (ct.kieu === 'doi_24') return chuGio12(ct.h, ct.m) + ' còn gọi là mấy giờ?';
    if (ct.kieu === 'doi_12') return 'Đồng hồ điện tử chỉ ' + dienTu(ct.h, ct.m) + '. Đó là mấy giờ?';
    if (ct.kieu === 'dong_ho_buoi') return 'Vào ' + vaoBuoi(buoiCua(ct.h)) + ', đồng hồ điện tử nào chỉ cùng giờ với đồng hồ này?';
    return 'Nam làm các việc này theo thứ tự nào trong ngày?';
  }
  function deDocNG(ct) {
    if (ct.kieu === 'doi_12') return 'Đồng hồ điện tử chỉ ' + chuGio24(ct.h, ct.m) + '. Đó là mấy giờ, buổi nào?';
    if (ct.kieu === 'thu_tu') return deNG(ct) + ' ' + ct.viec.map(viecLuc).join('. ') + '.';
    return deNG(ct);
  }
  function maNG(ct) {
    if (ct.kieu === 'buoi') return 'buoi:' + ct.h;
    if (ct.kieu === 'thu_tu') return 'thu_tu:' + ct.viec.join(',');
    return ct.kieu + ':' + ct.h + ':' + pad(ct.m || 0);
  }

  function nhanBietLoiNG(ct, v) {
    if (ct.kieu === 'buoi') {
      const d = buoiCua(ct.h);
      if (v === d) return [];
      if (BUOI.indexOf(v) < 0) return ['khac'];
      // quên đổi buổi (20 giờ tưởng 8 giờ sáng), hoặc giờ giáp ranh giữa hai buổi (18 giờ tưởng buổi tối)
      if (v === buoiCua(ct.h + 12) || v === buoiCua(ct.h - 1) || v === buoiCua(ct.h + 1)) return ['nham-buoi'];
      return ['khac'];
    }
    if (ct.kieu === 'thu_tu') {
      const ds = docDsViec(v);
      const dung = thuTuDung(ct.viec);
      if (ds.join(',') === dung.join(',')) return [];
      if (ds.length !== dung.length || ds.slice().sort().join(',') !== dung.slice().sort().join(',')) return ['khac'];
      if (ds.join(',') === thuTuQuenBuoi(ct.viec).join(',')) return ['nham-buoi'];
      return ['khac'];
    }
    const x = docGio(v);
    if (!x) return ['khac'];
    const H = x.h % 24, D = ct.h % 24;
    if (H === D && x.m === (ct.m || 0)) return [];
    if (x.m !== (ct.m || 0)) return ['khac'];
    const l = lechGio(H, D);
    if (l === 12) return ['nham-buoi'];
    if (l <= 2) return ['lech-gio'];
    if (l >= 10) return ['nham-buoi', 'lech-gio'];
    return ['khac'];
  }

  function loiNoiNG(ct, v, maLoi) {
    const m0 = (maLoi && maLoi[0]) || 'khac';
    const b = buoiCua(ct.h || 0);
    if (ct.kieu === 'buoi') {
      if (m0 === 'nham-buoi') return ct.h > 12 ? ct.h + ' giờ lớn hơn 12 giờ, con xem lại buổi nhé' : 'Con xem lại bảng các buổi trong ngày nhé';
      return 'Chưa đúng buổi rồi';
    }
    if (ct.kieu === 'thu_tu') {
      if (m0 === 'nham-buoi') return 'Buổi sáng đến trước buổi chiều, dù số giờ buổi sáng lớn hơn';
      return 'Chưa đúng thứ tự rồi';
    }
    if (m0 === 'nham-buoi') {
      if (ct.kieu === 'doi_12') return 'Số giờ lớn hơn 12 là buổi chiều, tối hoặc đêm';
      return b === 'sang' ? 'Buổi sáng thì số giờ giữ nguyên' : 'Vào ' + vaoBuoi(b) + ' thì số giờ lớn hơn 12';
    }
    if (m0 === 'lech-gio') {
      if (ct.kieu === 'dong_ho_buoi' && ct.m === 30) return 'Kim giờ nằm giữa hai số thì đọc theo số bé hơn';
      if (ct.kieu === 'doi_12') return 'Con trừ đi 12 cho đúng nhé';
      return b === 'sang' || b === 'trua' ? 'Con xem lại số giờ nhé' : 'Con cộng thêm 12 cho đúng nhé';
    }
    return 'Chưa đúng rồi';
  }

  function goiYNG(ct) {
    const b = buoiCua(ct.h || 0);
    const k = GIO_BUOI[b];
    if (ct.kieu === 'buoi') {
      return [
        'Một ngày có 24 giờ, chia thành buổi sáng, trưa, chiều, tối và đêm.',
        ct.h > 12 ? ct.h + ' giờ là ' + chuGio(ct.h - 12, 0) + ' của buổi nào? ' + ct.h + ' − 12 = ' + (ct.h - 12) + '.' : 'Buổi sáng từ 1 giờ đến 10 giờ, buổi trưa là 11 giờ và 12 giờ.',
        'Buổi ' + TEN_BUOI[b] + ' gồm các giờ từ ' + k[0] + ' giờ đến ' + k[1] + ' giờ. Con tìm xem ' + ct.h + ' giờ ở đâu.'
      ];
    }
    if (ct.kieu === 'doi_24') {
      if (ct.h <= 12) return ['Buổi sáng và buổi trưa thì số giờ giữ nguyên.', 'Chỉ buổi chiều, tối, đêm mới cộng thêm 12.', 'Vậy ' + chuGio12(ct.h, ct.m) + ' vẫn là ' + ct.h + ' giờ.'];
      return ['Vào ' + vaoBuoi(b) + ', số giờ lớn hơn 12.', 'Lấy số giờ cộng thêm 12.', h12(ct.h) + ' + 12 = ?'];
    }
    if (ct.kieu === 'doi_12') {
      if (ct.h <= 12) return ['Số giờ không lớn hơn 12 là buổi sáng hoặc buổi trưa.', 'Buổi sáng từ 1 giờ đến 10 giờ, buổi trưa là 11 giờ và 12 giờ.', 'Vậy ' + ct.h + ' giờ là buổi ' + TEN_BUOI[b] + '.'];
      return ['Số giờ lớn hơn 12 là buổi chiều, tối hoặc đêm.', 'Lấy số giờ trừ đi 12.', ct.h + ' − 12 = ?'];
    }
    if (ct.kieu === 'dong_ho_buoi') {
      const doc = ct.m === 30 ? 'Kim giờ nằm giữa số ' + h12(ct.h) + ' và số ' + h12(ct.h + 1) + ', kim phút chỉ số 6.' : ct.m === 15 ? 'Kim giờ vừa qua số ' + h12(ct.h) + ', kim phút chỉ số 3.' : 'Kim giờ chỉ số ' + h12(ct.h) + ', kim phút chỉ số 12.';
      if (ct.h <= 12) return ['Đọc đồng hồ kim trước: kim ngắn chỉ giờ, kim dài chỉ phút.', doc, 'Vào ' + vaoBuoi(b) + ' thì số giờ giữ nguyên.'];
      return ['Đọc đồng hồ kim trước: kim ngắn chỉ giờ, kim dài chỉ phút.', doc, 'Vào ' + vaoBuoi(b) + ' thì cộng thêm 12, ' + h12(ct.h) + ' + 12 = ?'];
    }
    const dung = thuTuDung(ct.viec);
    return ['Buổi sáng đến trước, rồi trưa, chiều, tối.', 'Đổi giờ buổi chiều, buổi tối ra số lớn hơn 12 rồi mới so sánh.', 'Việc làm sớm nhất là ' + chuViec(dung[0]).toLowerCase() + '.'];
  }

  function loiGiaiNG(ct) {
    const b = buoiCua(ct.h || 0);
    if (ct.kieu === 'buoi') {
      const buoc = ['Một ngày có 24 giờ'];
      if (ct.h > 12) buoc.push(ct.h + ' giờ là ' + chuGio12(ct.h, 0));
      buoc.push('Buổi ' + TEN_BUOI[b] + ' gồm các giờ từ ' + GIO_BUOI[b][0] + ' giờ đến ' + GIO_BUOI[b][1] + ' giờ');
      return { ma: 'cac-buoi', buoc: buoc, html: svgDai({ size: 520, buoi: b, danhDau: [{ h: ct.h, nhan: ct.h + ' giờ' }] }), kq: b };
    }
    if (ct.kieu === 'thu_tu') {
      const dung = thuTuDung(ct.viec);
      return {
        ma: 'thu-tu-trong-ngay',
        buoc: dung.map(viecLuc).concat(['Buổi sáng trước, rồi trưa, chiều, tối']),
        html: svgDai({ size: 520, danhDau: dung.map(function (x, i) { return { h: VIEC[x].h, m: VIEC[x].m, nhan: String(i + 1) }; }) }),
        kq: dung.join(',')
      };
    }
    const buoc = [];
    if (ct.kieu === 'dong_ho_buoi') buoc.push('Đồng hồ kim chỉ ' + chuGio(h12(ct.h), ct.m));
    if (ct.kieu === 'doi_12') buoc.push(ct.h > 12 ? 'Số giờ lớn hơn 12 nên trừ đi 12, ' + ct.h + ' − 12 = ' + (ct.h - 12) : 'Số giờ không lớn hơn 12 nên giữ nguyên');
    else buoc.push(ct.h > 12 ? 'Vào ' + vaoBuoi(b) + ' nên cộng thêm 12, ' + h12(ct.h) + ' + 12 = ' + ct.h : 'Vào ' + vaoBuoi(b) + ' nên số giờ giữ nguyên');
    buoc.push(chuGio12(ct.h, ct.m) + ' là ' + chuGio24(ct.h, ct.m));
    let html = svgDai({ size: 520, buoi: b, danhDau: [{ h: ct.h, m: ct.m, nhan: dienTu(ct.h, ct.m) }] });
    if (ct.kieu === 'dong_ho_buoi') html = '<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">' + svgDongHo(ct.h, ct.m, { size: 150, buoi: b }) + svgDienTu(ct.h, ct.m, { size: 150 }) + '</div>' + html;
    return { ma: 'doi-24-gio', buoc: buoc, html: html, kq: tinhNG(ct) };
  }

  function ketLuanNG(ct) {
    if (ct.kieu === 'buoi') return 'Vậy ' + ct.h + ' giờ là buổi ' + TEN_BUOI[buoiCua(ct.h)];
    if (ct.kieu === 'thu_tu') return 'Thứ tự đúng: ' + chuThuTu(thuTuDung(ct.viec));
    if (ct.kieu === 'dong_ho_buoi') return 'Vậy đồng hồ chỉ ' + chuGio12(ct.h, ct.m) + ', đồng hồ điện tử ghi ' + dienTu(ct.h, ct.m);
    return 'Vậy ' + chuGio12(ct.h, ct.m) + ' là ' + chuGio24(ct.h, ct.m);
  }

  function hienNG(v, ct) {
    if (ct && ct.kieu === 'buoi') return BUOI.indexOf(v) >= 0 ? 'buổi ' + TEN_BUOI[v] : String(v);
    if (ct && ct.kieu === 'thu_tu') return chuThuTu(v);
    const x = docGio(v);
    if (!x) return String(v);
    if (ct && ct.kieu === 'doi_24') return chuGio24(x.h, x.m);
    if (ct && ct.kieu === 'dong_ho_buoi') return dienTu(x.h, x.m);
    return chuGio12(x.h, x.m);
  }

  function taoNhieuNG(kyNang, ct, rng) {
    const d = tinhNG(ct);
    const ung = [];
    const them = function (v, w) { if (v !== d && !ung.some(function (u) { return u.v === v; })) ung.push({ v: v, w: w }); };
    if (ct.kieu === 'buoi') {
      them(buoiCua(ct.h + 12), 3);
      them(buoiCua(ct.h - 1), 2);
      them(buoiCua(ct.h + 1), 2);
    } else if (ct.kieu === 'thu_tu') {
      them(thuTuQuenBuoi(ct.viec).join(','), 3);
      const dung = thuTuDung(ct.viec);
      them([dung[1], dung[0]].concat(dung.slice(2)).join(','), 1);
      them(dung.slice(0, dung.length - 2).concat([dung[dung.length - 1], dung[dung.length - 2]]).join(','), 1);
    } else {
      const m = ct.m || 0;
      const g = function (h) { return giaTriGio(((h % 24) + 24) % 24, m); };
      them(g(ct.h + 12), 3);
      if (ct.kieu === 'dong_ho_buoi') {
        them(g(ct.h + 1), m === 30 ? 3 : 1);
        them(g(ct.h - 1), 1);
        if (m === 30) them(g(ct.h - 11), 0.6);
      } else {
        // đổi giờ buổi chiều, tối bằng 10 thay vì 12 (7 giờ tối thành 17 giờ; 15 giờ thành 5 giờ chiều)
        them(g(ct.kieu === 'doi_24' ? ct.h - 2 : ct.h + 2), ct.h > 12 ? 2 : 0.8);
        them(g(ct.h + 1), 1);
        them(g(ct.h - 1), 1);
      }
    }
    const ra = chonHaiNhieu(rng, ung);
    // Còn thiếu (ít gặp): thêm buổi khác
    BUOI.forEach(function (b) { if (ra.length < 2 && ct.kieu === 'buoi' && b !== d && ra.indexOf(b) < 0) ra.push(b); });
    return ra.map(function (v) { return { gia_tri: v, loi: nhanBietLoiNG(ct, v) }; });
  }

  /** Hình cho dạng chọn đáp án: đồng hồ điện tử, đồng hồ kim có nhãn buổi, hoặc ba thẻ việc. */
  function veHinhNG(ct) {
    if (ct.kieu === 'buoi' || ct.kieu === 'doi_12') return svgDienTu(ct.h, ct.m || 0, { size: 200 });
    if (ct.kieu === 'doi_24') return svgDongHo(ct.h, ct.m, { size: 200, buoi: buoiCua(ct.h) });
    if (ct.kieu === 'dong_ho_buoi') return svgDongHo(ct.h, ct.m, { size: 220, buoi: buoiCua(ct.h) });
    const n = ct.viec.length;
    const W = n * 150 + 10;
    let s = '<svg class="viec-svg" viewBox="0 0 ' + W + ' 176" width="' + Math.min(520, W) + '" height="' + Math.round(Math.min(520, W) * 176 / W) + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Các việc trong ngày">';
    ct.viec.forEach(function (ma, i) {
      const x = VIEC[ma];
      const X = 10 + i * 150;
      s += '<rect x="' + (X + 3) + '" y="8" width="136" height="164" rx="18" fill="#16225a" opacity=".16"/>';
      s += '<rect x="' + X + '" y="4" width="136" height="164" rx="18" fill="#ffffff" stroke="#d9d2ee" stroke-width="2"/>';
      s += '<text x="' + (X + 68) + '" y="36" text-anchor="middle" dominant-baseline="central" font-size="34">' + x.bieu + '</text>';
      s += '<text x="' + (X + 68) + '" y="76" text-anchor="middle" dominant-baseline="central" font-family="' + FONT + '" font-size="19" font-weight="800" fill="#221a3b">' + esc(x.ten) + '</text>';
      s += '<text x="' + (X + 68) + '" y="108" text-anchor="middle" dominant-baseline="central" font-family="' + FONT + '" font-size="17" font-weight="700" fill="#5b5575">' + esc(chuGio(h12(x.h), x.m)) + '</text>';
      s += '<rect x="' + (X + 28) + '" y="126" width="80" height="30" rx="15" fill="#fff4d6" stroke="#e0a800" stroke-width="2"/>';
      s += '<text x="' + (X + 68) + '" y="142" text-anchor="middle" dominant-baseline="central" font-family="' + FONT + '" font-size="17" font-weight="800" fill="#7a4d00">' + TEN_BUOI[buoiCua(x.h)] + '</text>';
    });
    return s + '</svg>';
  }

  function sinhNG(rng, muc) {
    const kieu = chonCach(rng, muc, [['buoi', 0.24], ['doi_24', 0.2], ['doi_12', 0.18], ['dong_ho_buoi', 0.2], ['thu_tu', 0.18]]);
    if (kieu === 'buoi') {
      const b = chonTrongSo(rng, [['sang', 0.15], ['trua', 0.14], ['chieu', 0.27], ['toi', 0.26], ['dem', 0.18]]);
      const k = GIO_BUOI[b];
      // giờ giáp ranh hay nhầm (18, 19, 21, 22, 10, 11, 13) được chọn nhiều hơn một chút
      // 24 giờ (12 giờ đêm) chỉ có trong bảng, đồng hồ điện tử lại ghi 00:00 nên không hỏi
      const cuoi = Math.min(k[1], 23);
      let h = nn(rng, k[0], cuoi);
      if (rng() < 0.4) h = rng() < 0.5 ? k[0] : cuoi;
      return { loai: 'ngay_gio', kieu: 'buoi', h: h };
    }
    if (kieu === 'thu_tu') {
      for (let thu = 0; thu < 80; thu++) {
        const ds = tron(rng, MA_VIEC).slice(0, 3);
        const dung = thuTuDung(ds);
        // khác nhau ít nhất 1 giờ; có việc buổi chiều, tối để thấy rõ lỗi quên buổi; thứ tự hiện khác thứ tự đúng
        let ok = true;
        for (let i = 1; i < 3; i++) if (phutCua(dung[i]) - phutCua(dung[i - 1]) < 60) ok = false;
        if (!ok || thuTuQuenBuoi(ds).join(',') === dung.join(',') || ds.join(',') === dung.join(',')) continue;
        return { loai: 'ngay_gio', kieu: 'thu_tu', viec: ds };
      }
      return { loai: 'ngay_gio', kieu: 'thu_tu', viec: ['dap_xe', 'an_sang', 'doc_sach'] };
    }
    const m = chonTrongSo(rng, [[0, 0.45], [15, 0.25], [30, 0.3]]);
    let h;
    if (kieu === 'doi_24') h = rng() < 0.8 ? nn(rng, 13, 23) : nn(rng, 6, 10);
    else if (kieu === 'doi_12') h = rng() < 0.85 ? nn(rng, 13, 23) : nn(rng, 7, 11);
    else h = rng() < 0.8 ? nn(rng, 13, 22) : nn(rng, 6, 10);
    return { loai: 'ngay_gio', kieu: kieu, h: h, m: m };
  }

  NH.dangKyLoai('ngay_gio', {
    tinh: tinhNG, de: deNG, deDoc: deDocNG, deChuanHoa: maNG, nhanBietLoi: nhanBietLoiNG, loiNoi: loiNoiNG,
    goiY: goiYNG, loiGiai: loiGiaiNG, ketLuan: ketLuanNG, taoNhieu: taoNhieuNG, hienGiaTri: hienNG, veHinh: veHinhNG,
    theChu: function (ct) { return ct.kieu === 'buoi' ? ct.h + ' giờ' : ct.kieu === 'doi_24' ? chuGio12(ct.h, ct.m) : ct.kieu === 'thu_tu' ? 'Thứ tự các việc' : dienTu(ct.h, ct.m); },
    veLuaChon: function (ct, v) {
      if (ct.kieu === 'buoi') return { nhan: vietHoa(hienNG(v, ct)), hinh: BUOI.indexOf(v) >= 0 ? '<svg viewBox="-16 -16 32 32" width="40" height="40" xmlns="http://www.w3.org/2000/svg">' + bieuBuoi(v, 0, 0, 26) + '</svg>' : '', hien: 'chu' };
      if (ct.kieu === 'thu_tu') return { nhan: chuThuTu(v), hien: 'chu' };
      const x = docGio(v);
      if (!x) return { nhan: String(v) };
      const dt = ct.kieu === 'dong_ho_buoi';
      return { nhan: hienNG(v, ct), dong_ho: { h: x.h % 24, m: x.m }, hinh: dt ? svgDienTu(x.h, x.m, { size: 130 }) : '', hien: dt ? 'dien_tu' : 'chu' };
    },
    dang: function (ct) { return ct.kieu === 'buoi' ? 'keo_tha' : ct.kieu === 'thu_tu' ? 'sap_xep' : 'chon_dap_an'; }
  });

  /* ============================================================
     Loại 'xem_lich': xem tờ lịch tháng (B2.13)
     ============================================================ */

  function thuSo(v) {
    if (typeof v === 'number') return v >= 0 && v <= 6 ? v : -1;
    return THU.indexOf(String(v == null ? '' : v).trim());
  }

  function tinhXL(ct) {
    if (ct.kieu === 'thu') return THU[thuCua(ct, ct.ngay)];
    if (ct.kieu === 'tuan') return ct.ngay + 7 * ct.huong;
    if (ct.kieu === 'dem_thu') { let d = 0; for (let n = 1; n <= soNgay(ct.thang); n++) if (thuCua(ct, n) === ct.thu) d++; return d; }
    if (ct.kieu === 'so_ngay') return soNgay(ct.thang);
    return ct.ngay;
  }
  function cacNgayThu(ct, thu) { const ds = []; for (let n = 1; n <= soNgay(ct.thang); n++) if (thuCua(ct, n) === thu) ds.push(n); return ds; }

  function deXL(ct) {
    const t = ct.thang;
    if (ct.kieu === 'thu') {
      const le = leCua(t, ct.ngay);
      if (le) return le.ten + ' ' + ct.ngay + ' tháng ' + t + ' là thứ mấy?';
      if (ct.goi === 'dau') return 'Ngày đầu tiên của tháng ' + t + ' là thứ mấy?';
      if (ct.goi === 'cuoi') return 'Ngày cuối cùng của tháng ' + t + ' là thứ mấy?';
      return 'Ngày ' + ct.ngay + ' tháng ' + t + ' là thứ mấy?';
    }
    if (ct.kieu === 'tuan') {
      const w = thuTrongCau(thuCua(ct, ct.ngay));
      return 'Hôm nay là ' + w + ' ngày ' + ct.ngay + ' tháng ' + t + '. ' + vietHoa(w) + ' tuần ' + (ct.huong > 0 ? 'sau' : 'trước') + ' là ngày mấy?';
    }
    if (ct.kieu === 'dem_thu') return 'Tháng ' + t + ' có bao nhiêu ngày ' + thuTrongCau(ct.thu) + '?';
    if (ct.kieu === 'so_ngay') return 'Tháng ' + t + ' có bao nhiêu ngày?';
    return 'Ô có dấu ? trên tờ lịch tháng ' + t + ' là ngày mấy?';
  }
  function deDocXL(ct) { return ct.kieu === 'o_trong' ? 'Ô có dấu hỏi trên tờ lịch tháng ' + ct.thang + ' là ngày mấy?' : deXL(ct); }
  function maXL(ct) {
    const dau = ct.kieu + ':' + ct.thang + '.' + ct.t1;
    if (ct.kieu === 'tuan') return dau + ':' + ct.ngay + (ct.huong > 0 ? '+7' : '-7');
    if (ct.kieu === 'dem_thu') return dau + ':' + THU[ct.thu];
    if (ct.kieu === 'so_ngay') return dau;
    return dau + ':' + ct.ngay;
  }

  function nhanBietLoiXL(ct, v) {
    const d = tinhXL(ct);
    if (ct.kieu === 'thu') {
      const i = thuSo(v), j = THU.indexOf(d);
      if (i === j) return [];
      if (i < 0) return ['khac'];
      return (i - j + 7) % 7 === 1 || (j - i + 7) % 7 === 1 ? ['nham-thu'] : ['khac'];
    }
    const n = Number(v);
    if (!Number.isFinite(n)) return ['khac'];
    if (n === d) return [];
    if (ct.kieu === 'tuan' || ct.kieu === 'o_trong') return Math.abs(n - d) === 1 ? ['dem-ngay-lech'] : ['khac'];
    if (ct.kieu === 'dem_thu') return Math.abs(n - d) === 1 ? ['dem-lech'] : ['khac'];
    return [28, 29, 30, 31].indexOf(n) >= 0 ? ['nham-thang'] : ['khac'];
  }

  function loiNoiXL(ct, v, maLoi) {
    const m0 = (maLoi && maLoi[0]) || 'khac';
    if (m0 === 'nham-thu') return 'Con nhìn nhầm sang cột bên cạnh rồi';
    if (m0 === 'dem-ngay-lech') return ct.kieu === 'tuan' ? 'Một tuần có đúng 7 ngày, con đếm lại nhé' : 'Hai ô cạnh nhau hơn kém nhau 1 ngày';
    if (m0 === 'dem-lech') return 'Con đếm lại các ngày ' + thuTrongCau(ct.thu) + ' trong cột nhé, nhớ cả hàng cuối';
    if (m0 === 'nham-thang') return 'Mỗi tháng có số ngày khác nhau, con xem ngày cuối cùng của tháng nhé';
    return 'Chưa đúng rồi';
  }

  function goiYXL(ct) {
    const t1 = thuTrongCau(ct.t1);
    if (ct.kieu === 'thu') {
      const w = thuCua(ct, ct.ngay);
      const cung = cacNgayThu(ct, w).filter(function (x) { return x !== ct.ngay; });
      return ['Tìm ngày ' + ct.ngay + ' trên tờ lịch.', 'Nhìn thẳng lên hàng trên cùng của cột có ngày ' + ct.ngay + '.', 'Ngày ' + ct.ngay + ' cùng cột với ngày ' + cung.slice(0, 2).join(' và ') + '. Ngày 1 là ' + t1 + '.'];
    }
    if (ct.kieu === 'tuan') {
      return ['Một tuần có 7 ngày.', ct.huong > 0 ? 'Tuần sau: lấy ngày ' + ct.ngay + ' cộng thêm 7.' : 'Tuần trước: lấy ngày ' + ct.ngay + ' trừ đi 7.', ct.ngay + (ct.huong > 0 ? ' + 7' : ' − 7') + ' = ? Ngày đó nằm ngay ' + (ct.huong > 0 ? 'dưới' : 'trên') + ' ngày ' + ct.ngay + ' trên tờ lịch.'];
    }
    if (ct.kieu === 'dem_thu') {
      const ds = cacNgayThu(ct, ct.thu);
      return ['Tìm cột ' + thuTrongCau(ct.thu) + ' trên tờ lịch.', 'Đếm các ngày trong cột đó, từ hàng trên xuống hàng cuối.', 'Bắt đầu từ ngày ' + ds[0] + ', cứ thêm 7 ngày: ' + ds.slice(0, 3).join(', ') + ', …'];
    }
    if (ct.kieu === 'so_ngay') {
      return ['Xem ngày cuối cùng trên tờ lịch.', 'Tháng 4, 6, 9, 11 có 30 ngày. Tháng 2 có 28 hoặc 29 ngày.', 'Các tháng 1, 3, 5, 7, 8, 10, 12 có 31 ngày.'];
    }
    const v = viTriO(ct, ct.ngay);
    const benTrai = v.cot > 0 ? ct.ngay - 1 : null;
    return ['Trên tờ lịch, hai ô cạnh nhau hơn kém nhau 1 ngày.', benTrai ? 'Nhìn ô bên trái: ngày ' + benTrai + '.' : 'Nhìn ô bên phải: ngày ' + (ct.ngay + 1) + '.', benTrai ? benTrai + ' + 1 = ?' : (ct.ngay + 1) + ' − 1 = ?'];
  }

  function loiGiaiXL(ct) {
    const d = tinhXL(ct);
    const p = { thang: ct.thang, t1: ct.t1 };
    if (ct.kieu === 'thu') {
      const w = thuCua(ct, ct.ngay);
      return { ma: 'xem-thu', buoc: ['Tìm ngày ' + ct.ngay + ' trên tờ lịch', 'Nhìn lên đầu cột: ' + TEN_THU[w]], html: svgLich(p, { size: 300, khoanh: [ct.ngay], cot: w }), kq: d };
    }
    if (ct.kieu === 'tuan') {
      return { ma: 'tuan-sau', buoc: ['Một tuần có 7 ngày', ct.ngay + (ct.huong > 0 ? ' + 7 = ' : ' − 7 = ') + d, 'Ngày ' + d + ' cùng cột ' + TEN_THU[thuCua(ct, ct.ngay)] + ' với ngày ' + ct.ngay], html: svgLich(p, { size: 300, khoanh: [ct.ngay], dung: [d], muiTen: [ct.ngay, d] }), kq: d };
    }
    if (ct.kieu === 'dem_thu') {
      const ds = cacNgayThu(ct, ct.thu);
      return { ma: 'dem-ngay-cung-thu', buoc: ['Các ngày ' + thuTrongCau(ct.thu) + ' là: ' + ds.join(', '), 'Đếm được ' + ds.length + ' ngày'], html: svgLich(p, { size: 300, cot: ct.thu, dung: ds }), kq: d };
    }
    if (ct.kieu === 'so_ngay') {
      const nhom = d === 31 ? 'Tháng 1, 3, 5, 7, 8, 10, 12 có 31 ngày' : d === 30 ? 'Tháng 4, 6, 9, 11 có 30 ngày' : 'Tháng 2 có 28 hoặc 29 ngày';
      return { ma: 'so-ngay-trong-thang', buoc: ['Ngày cuối cùng của tháng ' + ct.thang + ' là ngày ' + d, nhom], html: svgLich(p, { size: 300, dung: [d] }), kq: d };
    }
    const v = viTriO(ct, ct.ngay);
    const buoc = v.cot > 0 ? ['Ô bên trái là ngày ' + (ct.ngay - 1), (ct.ngay - 1) + ' + 1 = ' + ct.ngay] : ['Ô bên phải là ngày ' + (ct.ngay + 1), (ct.ngay + 1) + ' − 1 = ' + ct.ngay];
    return { ma: 'ngay-con-thieu', buoc: buoc, html: svgLich(p, { size: 300, dung: [ct.ngay] }), kq: d };
  }

  function ketLuanXL(ct) {
    const d = tinhXL(ct);
    if (ct.kieu === 'thu') return 'Vậy ngày ' + ct.ngay + ' tháng ' + ct.thang + ' là ' + thuTrongCau(THU.indexOf(d));
    if (ct.kieu === 'tuan') return 'Vậy ' + thuTrongCau(thuCua(ct, ct.ngay)) + ' tuần ' + (ct.huong > 0 ? 'sau' : 'trước') + ' là ngày ' + d;
    if (ct.kieu === 'dem_thu') return 'Vậy tháng ' + ct.thang + ' có ' + d + ' ngày ' + thuTrongCau(ct.thu);
    if (ct.kieu === 'so_ngay') return 'Vậy tháng ' + ct.thang + ' có ' + d + ' ngày';
    return 'Vậy ô có dấu ? là ngày ' + d;
  }

  function hienXL(v, ct) {
    if (ct && ct.kieu === 'thu') { const i = thuSo(v); return i >= 0 ? thuTrongCau(i) : String(v); }
    if (ct && (ct.kieu === 'dem_thu' || ct.kieu === 'so_ngay')) return v + ' ngày';
    return 'ngày ' + v;
  }

  function taoNhieuXL(kyNang, ct, rng) {
    const d = tinhXL(ct);
    const sn = soNgay(ct.thang);
    let ds = [];
    if (ct.kieu === 'thu') { const j = THU.indexOf(d); ds = tron(rng, [THU[(j + 1) % 7], THU[(j + 6) % 7]]); }
    else if (ct.kieu === 'so_ngay') ds = tron(rng, d === 31 ? [30, 28] : d === 30 ? [31, 28] : [30, 31]);
    else {
      const hop = function (n) { return n >= 1 && n <= (ct.kieu === 'dem_thu' ? 6 : sn) && n !== d && ds.indexOf(n) < 0; };
      [d + 1, d - 1].forEach(function (n) { if (hop(n)) ds.push(n); });
      if (ct.kieu === 'tuan') [ct.ngay + 1, d + 2, d - 2].forEach(function (n) { if (ds.length < 2 && hop(n)) ds.push(n); });
      [d + 7, d - 7, d + 2, d - 2, d + 3].forEach(function (n) { if (ds.length < 2 && hop(n)) ds.push(n); });
      ds = tron(rng, ds.slice(0, 2));
    }
    return ds.map(function (v) { return { gia_tri: v, loi: nhanBietLoiXL(ct, v) }; });
  }

  function veHinhXL(ct) {
    const p = { thang: ct.thang, t1: ct.t1 };
    if (ct.kieu === 'tuan') return svgLich(p, { khoanh: [ct.ngay] });
    if (ct.kieu === 'o_trong') return svgLich(p, { hoi: ct.ngay });
    return svgLich(p, {});
  }

  function sinhXL(rng, muc) {
    const kieu = chonCach(rng, muc, [['thu', 0.3], ['tuan', 0.25], ['dem_thu', 0.15], ['so_ngay', 0.13], ['o_trong', 0.17]]);
    let thang = nn(rng, 1, 12);
    const t1 = nn(rng, 0, 6);
    if (kieu === 'thu') {
      const r = rng();
      if (r < 0.25) { const le = LE[Math.floor(rng() * LE.length)]; return { loai: 'xem_lich', kieu: 'thu', thang: le.thang, t1: t1, ngay: le.ngay }; }
      if (r < 0.37) return { loai: 'xem_lich', kieu: 'thu', thang: thang, t1: t1, ngay: 1, goi: 'dau' };
      if (r < 0.49) return { loai: 'xem_lich', kieu: 'thu', thang: thang, t1: t1, ngay: soNgay(thang), goi: 'cuoi' };
      return { loai: 'xem_lich', kieu: 'thu', thang: thang, t1: t1, ngay: nn(rng, 2, soNgay(thang) - 1) };
    }
    if (kieu === 'tuan') {
      const huong = rng() < 0.7 ? 1 : -1;
      const n = huong > 0 ? nn(rng, 1, soNgay(thang) - 7) : nn(rng, 8, soNgay(thang));
      return { loai: 'xem_lich', kieu: 'tuan', thang: thang, t1: t1, ngay: n, huong: huong };
    }
    if (kieu === 'dem_thu') {
      // một nửa số câu hỏi đúng thứ có 5 ngày (đếm sót hàng cuối là lỗi hay gặp)
      const ct = { loai: 'xem_lich', kieu: 'dem_thu', thang: thang, t1: t1, thu: nn(rng, 0, 6) };
      if (rng() < 0.5) { const nam = [0, 1, 2, 3, 4, 5, 6].filter(function (w) { return cacNgayThu(ct, w).length === 5; }); if (nam.length) ct.thu = nam[Math.floor(rng() * nam.length)]; }
      return ct;
    }
    if (kieu === 'so_ngay') {
      if (rng() < 0.15) thang = 2;
      return { loai: 'xem_lich', kieu: 'so_ngay', thang: thang, t1: t1 };
    }
    return { loai: 'xem_lich', kieu: 'o_trong', thang: thang, t1: t1, ngay: nn(rng, 2, soNgay(thang) - 1) };
  }

  NH.dangKyLoai('xem_lich', {
    tinh: tinhXL, de: deXL, deDoc: deDocXL, deChuanHoa: maXL, nhanBietLoi: nhanBietLoiXL, loiNoi: loiNoiXL,
    goiY: goiYXL, loiGiai: loiGiaiXL, ketLuan: ketLuanXL, taoNhieu: taoNhieuXL, hienGiaTri: hienXL, veHinh: veHinhXL,
    theChu: function (ct) { return deXL(ct).replace(/\?$/, ''); },
    veLuaChon: function (ct, v) {
      if (ct.kieu === 'thu') { const i = thuSo(v); return { nhan: i >= 0 ? TEN_THU[i] : String(v), hien: 'chu' }; }
      return { nhan: ct.kieu === 'dem_thu' || ct.kieu === 'so_ngay' ? v + ' ngày' : String(v), hien: 'chu' };
    },
    dang: function (ct) { return ct.kieu === 'tuan' ? 'thao_tac_hinh' : 'chon_dap_an'; }
  });

  /* ============================================================
     Mã lỗi, kỹ năng
     ============================================================ */

  NH.themLoi('nham-kim', { be: 'Kim ngắn chỉ giờ, kim dài chỉ phút', mo_ta: 'Đọc hoặc quay đổi vai hai kim: lấy số kim phút chỉ làm giờ, số kim giờ chỉ làm phút (8 giờ 15 phút thành 3 giờ 40 phút, 3 giờ thành 12 giờ 15 phút)', ngan: 'Con hay nhầm kim giờ với kim phút' });
  NH.themLoi('lech-gio', { be: 'Con xem kỹ kim giờ nhé', mo_ta: 'Lệch 1 giờ khi đọc đồng hồ (hay gặp ở giờ 30 phút: kim giờ nằm giữa hai số, bé đọc theo số lớn hơn, 7 giờ 30 phút thành 8 giờ 30 phút), hoặc đổi giờ lệch 1, 2 giờ (7 giờ tối thành 17 giờ vì cộng 10 thay vì 12)', ngan: 'Con hay đọc lệch giờ' });
  NH.themLoi('doc-so-phut', { be: 'Kim phút chỉ số 3 là 15 phút, không phải 3 phút', mo_ta: 'Đọc số mà kim phút chỉ thành số phút (kim phút chỉ số 3 đọc là 3 phút thay vì 15 phút; chỉ số 12 đọc là 12 phút thay vì giờ đúng)', ngan: 'Con hay đọc số của kim phút thành số phút' });
  NH.themLoi('nham-buoi', { be: 'Con nhầm buổi rồi', mo_ta: 'Nhầm buổi trong ngày: 8 giờ sáng với 20 giờ (8 giờ tối), 15 giờ đọc thành 3 giờ sáng; xếp việc theo số giờ mà quên buổi; chọn buổi giáp ranh (18 giờ là buổi chiều, không phải buổi tối)', ngan: 'Con hay nhầm buổi trong ngày' });
  NH.themLoi('nham-thu', { be: 'Con nhìn nhầm sang cột bên cạnh rồi', mo_ta: 'Nhầm thứ lệch một ngày trên tờ lịch (nhìn nhầm sang cột bên cạnh hoặc đếm thứ lệch 1)', ngan: 'Con hay nhầm thứ trên lịch' });
  NH.themLoi('dem-ngay-lech', { be: 'Con đếm ngày lệch 1 rồi', mo_ta: 'Tìm ngày lệch 1 trên tờ lịch: thứ Hai tuần sau của ngày 5 nói 11 hay 13 (cộng 6 hoặc 8 thay vì 7), điền ngày còn thiếu lệch 1', ngan: 'Con hay đếm ngày lệch 1' });
  NH.themLoi('nham-thang', { be: 'Mỗi tháng có số ngày khác nhau', mo_ta: 'Nhầm số ngày trong tháng (tháng 30 ngày nói 31, tháng 31 ngày nói 30, tháng 2 nói 30)', ngan: 'Con hay nhầm số ngày trong tháng' });

  NH.themKyNang('xem-gio', { noi_dung: 'B2.11', ten: 'Xem đồng hồ: giờ đúng, giờ 15 phút, giờ 30 phút', kieu: 'K3', giay: 10, gioi_han: 12, loai: 'xem_gio', bai_hoc: 'xem-dong-ho', sinh: sinhXG });
  NH.themKyNang('ngay-gio', { noi_dung: 'B2.12', ten: 'Ngày và giờ: các buổi, một ngày 24 giờ', kieu: 'K3', giay: 12, gioi_han: 24, loai: 'ngay_gio', bai_hoc: 'ngay-gio', sinh: sinhNG });
  NH.themKyNang('xem-lich', { noi_dung: 'B2.13', ten: 'Xem lịch tháng: thứ, ngày, tuần sau, số ngày trong tháng', kieu: 'K3', giay: 15, gioi_han: 31, loai: 'xem_lich', bai_hoc: 'xem-lich', sinh: sinhXL });

  window.CauThoiGian = {
    BUOI: BUOI, TEN_BUOI: TEN_BUOI, GIO_BUOI: GIO_BUOI, THU: THU, TEN_THU: TEN_THU, TEN_THANG: TEN_THANG, SO_NGAY: SO_NGAY, LE: LE, VIEC: VIEC,
    buoiCua: buoiCua, vaoBuoi: vaoBuoi, h12: h12, pad: pad, giaTriGio: giaTriGio, docGio: docGio, chuGio: chuGio, chuGio12: chuGio12, chuGio24: chuGio24,
    dienTu: dienTu, soKimPhut: soKimPhut, soNgay: soNgay, thuCua: thuCua, thuTrongCau: thuTrongCau, leCua: leCua, viTriO: viTriO,
    thuTuDung: thuTuDung, thuTuQuenBuoi: thuTuQuenBuoi, viecLuc: viecLuc, chuThuTu: chuThuTu
  };
})();
