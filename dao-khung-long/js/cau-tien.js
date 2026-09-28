/* ============================================================
   cau-tien.js – Câu hỏi tiền Việt Nam (B2.14, SGK Toán 2 Bài 56 "Giới thiệu tiền Việt Nam"):
   nhận biết tờ tiền, trả tiền mua hàng, đổi tiền, trả lại tiền thừa. Chỉ dùng các tờ 100, 200, 500 và 1 000 đồng,
   mọi số tiền không quá 1 000 đồng. Cắm vào NganHang bằng dangKyLoai('tien', …); dùng cho Chợ Khủng Long,
   Đấu Trường và các game cũ (mọi kiểu câu đều hỏi được ở dạng chọn đáp án).
   Loại 'tien', các kieu:
   - chon_to  { gia, goi: 'chu'|'so' }   "Chọn tờ năm trăm đồng" (đáp án: 500)
   - doc_to   { gia }                    "Tờ tiền này là bao nhiêu đồng?" (hình một tờ)
   - lon_nhat, be_nhat { ds }            Ba tờ khác nhau: tờ nào có giá trị lớn nhất, bé nhất
   - dem_loai { gia, dong }              Đống tiền lẫn lộn: có mấy tờ 500 đồng? (SGK Bài 56, hoạt động 1)
   - may_to   { tu, sang }               "Tờ 1 000 đồng đổi được mấy tờ 200 đồng?" (đáp án: số tờ)
   - tra      { mon, gia, vi }           Trả vừa đủ giá món hàng bằng các tờ trong ví (vi: số tờ 1 000, 500, 200, 100)
   - doi      { tu, sang }               Đổi một tờ thành các tờ sang (sang 0: thành các tờ nhỏ hơn bất kì)
   - thua     { mon, gia, dua, khach }   Bé làm người bán: khách đưa một tờ, bé trả lại tiền thừa.
                                         Mở rộng nhẹ: SGK lớp 2 không có bài tiền thừa; chỉ dùng số tròn trăm, không quá 1 000.
   Giá trị bé trả lời: số (giá trị một tờ, số tiền, số tờ) hoặc bộ tờ chuẩn hóa '500,200' (xếp từ lớn đến bé).
   Trả tiền, đổi tiền, tiền thừa chấm theo tổng tiền, không theo từng tờ (nhiều cách trả đều đúng).
   Mã lỗi mới: dem-so-to, tra-thieu, tra-thua, nham-to-tien, nham-tien-thua;
   dùng lại thieu-0, thua-0 (tờ 100 với tờ 1 000), so-chu-so (1 000 và 500 so chữ số đầu), chieu-dau, dem-lech.
   API: window.CauTien (vẽ tờ tiền SVG, tiện ích bộ tờ, món hàng) cho game Chợ Khủng Long và bài học.
   ============================================================ */
(function () {
  'use strict';

  const NH = window.NganHang;
  const nn = NH.nn, chon = NH.chon, tron = NH.tron;

  /** Bốn tờ tiền của lớp 2, từ lớn đến bé. */
  const TO = [1000, 500, 200, 100];
  /** Màu gần với màu chủ đạo của tờ thật; tờ được vẽ đơn giản (số, chữ ĐỒNG, hoa văn tròn), không chép tờ thật. */
  const MAU = {
    100: { nen: '#b3a45c', dam: '#756828', nhat: '#f3ecc8', chu: '#43370f', ten: 'màu vàng rêu' },
    200: { nen: '#e19f55', dam: '#9f6522', nhat: '#fde7c8', chu: '#57340b', ten: 'màu nâu cam' },
    500: { nen: '#ec7b8e', dam: '#ad3f55', nhat: '#ffe2e7', chu: '#681a2a', ten: 'màu hồng' },
    1000: { nen: '#a489e0', dam: '#664aad', nhat: '#eee7ff', chu: '#33206b', ten: 'màu tím' }
  };
  const FONT = "'Baloo 2', 'Arial Rounded MT Bold', sans-serif";
  const FONT_EMOJI = "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";
  const TRU = '−';
  /** Khoảng trắng không ngắt dòng để nhóm ba chữ số như SGK: 1 000 (không tách "1" và "000" khi xuống dòng). */
  const CACH = String.fromCharCode(160);

  /** Món hàng ở chợ: gia là khoảng giá hợp lí (đơn vị trăm đồng). */
  const MON = [
    { id: 'keo', ten: 'gói kẹo', hinh: '🍬', gia: [1, 10] },
    { id: 'banh-mi', ten: 'bánh mì', hinh: '🥖', gia: [4, 10] },
    { id: 'kem', ten: 'que kem', hinh: '🍦', gia: [2, 9] },
    { id: 'but-chi', ten: 'bút chì', hinh: '✏️', gia: [2, 8] },
    { id: 'vo', ten: 'quyển vở', hinh: '📒', gia: [4, 10] },
    { id: 'bong-bay', ten: 'quả bóng bay', hinh: '🎈', gia: [2, 8] },
    { id: 'tao', ten: 'quả táo', hinh: '🍎', gia: [2, 7] },
    { id: 'chuoi', ten: 'quả chuối', hinh: '🍌', gia: [1, 5] },
    { id: 'banh-bao', ten: 'bánh bao', hinh: '🥟', gia: [4, 9] },
    { id: 'sua', ten: 'cốc sữa', hinh: '🥛', gia: [3, 9] },
    { id: 'thuoc-ke', ten: 'thước kẻ', hinh: '📏', gia: [2, 7] },
    { id: 'keo-mut', ten: 'kẹo mút', hinh: '🍭', gia: [1, 6] },
    { id: 'banh-quy', ten: 'bánh quy', hinh: '🍪', gia: [3, 8] },
    { id: 'ngo', ten: 'bắp ngô', hinh: '🌽', gia: [3, 8] },
    { id: 'cam', ten: 'quả cam', hinh: '🍊', gia: [2, 7] }
  ];
  /** Khách mua hàng khi bé làm người bán (loài khủng long của đảo, trừ Mỏ Vịt Long là người bán). */
  const KHACH = ['sp-toc-long', 'sp-giap-long', 'sp-rong-bien', 'sp-khung-long-lua', 'sp-kiem-long', 'sp-duc-long', 'sp-tam-giac-long', 'sp-long-co-dai', 'sp-gai-long'];
  /** Các cặp đổi tiền (số tờ là số tự nhiên, không quá 10 tờ). */
  const CAP_DOI = [{ tu: 1000, sang: 500, w: 2 }, { tu: 1000, sang: 200, w: 2 }, { tu: 1000, sang: 100, w: 0.8 }, { tu: 500, sang: 100, w: 2 }, { tu: 200, sang: 100, w: 1 }];

  /* ---------------- Tiện ích ---------------- */

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function r1(x) { return Math.round(x * 10) / 10; }
  /** 1000 → "1 000" (nhóm ba chữ số như SGK). */
  function soTien(n) { return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, CACH); }
  function dong(n) { return soTien(n) + ' đồng'; }
  /** Đọc bằng chữ để giọng đọc không đọc nhầm "1 000": "một nghìn đồng". */
  function docTien(n) { return NH.docSo(n) + ' đồng'; }
  function hoa(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  function laTo(x) { return TO.indexOf(x) >= 0; }
  function monCua(id) { for (let i = 0; i < MON.length; i++) if (MON[i].id === id) return MON[i]; return MON[0]; }
  function lap(x, n) { const a = []; for (let i = 0; i < n; i++) a.push(x); return a; }
  function tong(ds) { let t = 0; ds.forEach(function (x) { t += x; }); return t; }
  function dem(ds, x) { let n = 0; ds.forEach(function (y) { if (y === x) n++; }); return n; }

  /** Đọc một giá trị thành danh sách tờ (từ lớn đến bé): '500,200', [500, 200] hoặc một số tiền. */
  function docTo(v) {
    let ds;
    if (Array.isArray(v)) ds = v.map(Number);
    else if (typeof v === 'number') ds = [v];
    else ds = String(v == null ? '' : v).split(/[,+\s]+/).filter(Boolean).map(Number);
    return ds.filter(function (x) { return isFinite(x) && x > 0; }).sort(function (a, b) { return b - a; });
  }
  function chuoiTo(ds) { return docTo(ds).join(','); }
  /** [[500, 1], [200, 2]]: số tờ của từng loại, từ lớn đến bé. */
  function theoLoai(ds) {
    const ra = [];
    docTo(ds).forEach(function (x) { const c = ra[ra.length - 1]; if (c && c[0] === x) c[1]++; else ra.push([x, 1]); });
    return ra;
  }
  /** "500 đồng và 2 tờ 200 đồng" */
  function tenBoTo(ds) {
    const p = theoLoai(ds).map(function (c) { return (c[1] > 1 ? c[1] + ' tờ ' : '') + dong(c[0]); });
    if (!p.length) return '0 đồng';
    if (p.length === 1) return p[0];
    return p.slice(0, -1).join(', ') + ' và ' + p[p.length - 1];
  }
  /** Nhãn ngắn của một bộ tờ: "500 + 200", nhiều tờ thì "5 tờ 200". */
  function nhanBoTo(ds) {
    ds = docTo(ds);
    if (ds.length <= 4) return ds.map(soTien).join(' + ');
    return theoLoai(ds).map(function (c) { return c[1] > 1 ? c[1] + ' tờ ' + soTien(c[0]) : soTien(c[0]); }).join(' + ');
  }
  /** Ví trong cấu trúc câu [n1000, n500, n200, n100] thành { 1000: n, … }. */
  function soLuongVi(vi) { const o = {}; TO.forEach(function (g, i) { o[g] = (vi && vi[i]) || 0; }); return o; }

  /** Cách trả ít tờ nhất cho số tiền (soLuong: số tờ có sẵn mỗi loại, null là không giới hạn; chiDung: các loại được dùng). */
  function toHop(tien, soLuong, chiDung) {
    const ds = (chiDung || TO).slice().sort(function (a, b) { return b - a; });
    let tot = null;
    const dang = [];
    (function thu(i, con) {
      if (con === 0) { if (!tot || dang.length < tot.length) tot = dang.slice(); return; }
      if (i >= ds.length || (tot && dang.length >= tot.length)) return;
      const g = ds[i];
      const toiDa = Math.min(Math.floor(con / g), soLuong ? (soLuong[g] || 0) : 20);
      for (let k = toiDa; k >= 0; k--) {
        for (let j = 0; j < k; j++) dang.push(g);
        thu(i + 1, con - k * g);
        dang.length -= k;
      }
    })(0, tien);
    return tot;
  }

  /** Số tiền bé cần đưa ở câu trả tiền, đổi tiền, tiền thừa. */
  function canCua(ct) { return ct.kieu === 'tra' ? ct.gia : ct.kieu === 'doi' ? ct.tu : ct.kieu === 'thua' ? ct.dua - ct.gia : 0; }
  /** Các tờ bé được dùng khi đổi tiền: nhỏ hơn tờ cần đổi. */
  function toNho(tu) { return TO.filter(function (x) { return x < tu; }); }
  /** So như bé chỉ nhìn chữ số đầu (1 000 "bé hơn" 500): âm nếu a "bé hơn" b. */
  function soBay(a, b) {
    const fa = Number(String(a)[0]), fb = Number(String(b)[0]);
    return fa !== fb ? fa - fb : String(a).length - String(b).length;
  }
  function laLon(ct) { return ct.kieu === 'lon_nhat'; }

  /* ---------------- Vẽ tờ tiền (SVG) ---------------- */

  /** Nội dung một tờ trong hệ tọa độ 220 × 104 (thân tờ 2..214 × 2..98, bóng đổ lệch xuống). */
  function matTo(gia) {
    const m = MAU[gia] || MAU[100];
    const so = soTien(gia);
    const dai = so.length > 3;
    let s = '<rect x="6" y="7" width="212" height="96" rx="11" fill="#1e1433" opacity=".16"/>';
    s += '<rect x="2" y="2" width="212" height="96" rx="11" fill="' + m.nen + '" stroke="' + m.dam + '" stroke-width="2.5"/>';
    s += '<path d="M2 46 V13 a11 11 0 0 1 11 -11 H203 a11 11 0 0 1 11 11 V46 Z" fill="#fff" opacity=".17"/>';
    s += '<rect x="8.5" y="8.5" width="199" height="83" rx="7" fill="none" stroke="' + m.nhat + '" stroke-width="2" opacity=".9"/>';
    s += '<path d="M86 92 q9 -7 18 0 t18 0 t18 0 t18 0 t18 0 t18 0 t10 0" fill="none" stroke="' + m.nhat + '" stroke-width="1.6" opacity=".55"/>';
    s += '<path d="M14 16 q9 6 18 0 t18 0 t18 0 t18 0 t18 0 t18 0 t18 0 t18 0" fill="none" stroke="' + m.nhat + '" stroke-width="1.6" opacity=".45"/>';
    // Hoa văn tròn (không phải quốc huy, không chân dung)
    s += '<circle cx="50" cy="52" r="29" fill="' + m.nhat + '"/>';
    s += '<circle cx="50" cy="52" r="29" fill="none" stroke="' + m.dam + '" stroke-width="1.5" stroke-dasharray="3 3" opacity=".6"/>';
    for (let k = 0; k < 8; k++) s += '<ellipse cx="50" cy="38" rx="6" ry="12" fill="' + m.nen + '" opacity=".8" transform="rotate(' + (k * 45) + ' 50 52)"/>';
    s += '<circle cx="50" cy="52" r="7" fill="' + m.dam + '"/>';
    s += '<text x="144" y="' + (dai ? 58 : 60) + '" text-anchor="middle" font-family="' + FONT + '" font-size="' + (dai ? 40 : 48) + '" font-weight="800" fill="#fff" stroke="' + m.dam + '" stroke-width="6" stroke-linejoin="round" paint-order="stroke">' + so + '</text>';
    s += '<text x="144" y="83" text-anchor="middle" font-family="' + FONT + '" font-size="17" font-weight="800" letter-spacing="3" fill="' + m.chu + '">ĐỒNG</text>';
    s += '<text x="203" y="24" text-anchor="end" font-family="' + FONT + '" font-size="14" font-weight="800" fill="' + m.chu + '">' + so + '</text>';
    return s;
  }

  /** Một tờ đặt trong SVG khác: tâm (cx, cy), rộng rong, xoay (độ). */
  function gTo(gia, cx, cy, rong, xoay, them) {
    const k = rong / 220;
    return '<g' + (them || '') + ' transform="translate(' + r1(cx) + ' ' + r1(cy) + ') rotate(' + (xoay || 0) + ') scale(' + (Math.round(k * 1000) / 1000) + ') translate(-108 -50)">' + matTo(gia) + '</g>';
  }

  /** Một tờ tiền thành SVG riêng (dùng trong DOM của game, bài học, lựa chọn). */
  function veTo(gia, lop, kieuCss) {
    return '<svg class="ck-to-svg' + (lop ? ' ' + lop : '') + '" viewBox="0 0 220 104" role="img" aria-label="Tờ ' + esc(dong(gia)) + '"' +
      (kieuCss ? ' style="' + kieuCss + '"' : '') + ' xmlns="http://www.w3.org/2000/svg">' + matTo(gia) + '</svg>';
  }

  /** Một hàng tờ: xếp chồng lệch cho gọn (lựa chọn là bộ tờ), hoặc tách rời từng tờ (ro: lời giải, tối đa 5 tờ). */
  function hangTo(ds, rongTo, ro) {
    ds = docTo(ds);
    rongTo = rongTo || 110;
    const cao = rongTo * 104 / 220;
    const tach = ro && ds.length <= 5;
    const buoc = tach ? rongTo + 8 : ds.length > 5 ? rongTo * 0.34 : rongTo * 0.56;
    const w = rongTo + buoc * Math.max(0, ds.length - 1) + 4;
    let s = '<svg class="ck-hang-to" viewBox="0 0 ' + r1(w) + ' ' + r1(cao + 6) + '" role="img" aria-label="' + esc(tenBoTo(ds)) + '"' +
      ' style="width:100%;max-width:' + Math.round(Math.min(w, tach ? 560 : 260)) + 'px;height:auto" xmlns="http://www.w3.org/2000/svg">';
    ds.forEach(function (g, i) { s += gTo(g, rongTo / 2 + 2 + i * buoc, cao / 2 + 3, rongTo, 0); });
    return s + '</svg>';
  }

  /** Vị trí các tờ trong đống tiền lẫn lộn (tỉ lệ 0..1 của khung), xoay lệch; cố định theo đề để phát lại được. */
  function viTriDong(dongTo) {
    const n = dongTo.length;
    const cot = n <= 3 ? n : n <= 6 ? 3 : 4;
    const hang = Math.ceil(n / cot);
    const hat = Math.round(tong(dongTo) / 100) + n * 7;
    return dongTo.map(function (g, i) {
      const r = Math.floor(i / cot), c = i % cot;
      const soCuoi = r === hang - 1 ? n - r * cot : cot;
      const lech = (cot - soCuoi) / 2;
      const j1 = ((i * 17 + hat * 5) % 9) - 4, j2 = ((i * 11 + hat * 3) % 7) - 3;
      return {
        gia: g,
        x: (c + lech + 0.5) / cot + j1 * 0.008,
        y: (r + 0.5) / hang + j2 * 0.012,
        xoay: ((i * 37 + hat * 13) % 25) - 12
      };
    });
  }

  function svgMo(w, h, nhan) {
    return '<svg class="ck-hinh-de" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + esc(nhan) + '" xmlns="http://www.w3.org/2000/svg">';
  }
  function chuSvg(x, y, t, co, mau, them) {
    return '<text x="' + x + '" y="' + y + '" text-anchor="middle" font-family="' + FONT + '" font-size="' + co + '" font-weight="800" fill="' + (mau || '#221a3b') + '"' + (them || '') + '>' + esc(t) + '</text>';
  }
  /** Món hàng có thẻ giá (hình của đề trả tiền, tiền thừa). */
  function gMon(mon, gia, x, y) {
    const m = monCua(mon);
    let s = '<circle cx="' + x + '" cy="' + (y - 6) + '" r="78" fill="#fff4dc"/>';
    s += '<text x="' + x + '" y="' + (y + 30) + '" text-anchor="middle" font-family="' + FONT_EMOJI + '" font-size="104">' + m.hinh + '</text>';
    s += chuSvg(x, y + 104, hoa(m.ten), 30, '#5b4a2a');
    // thẻ giá màu cam có lỗ xỏ dây
    s += '<g transform="translate(' + (x + 70) + ' ' + (y - 84) + ') rotate(8)"><path d="M0 22 L22 0 H150 a10 10 0 0 1 10 10 V52 a10 10 0 0 1 -10 10 H22 Z" fill="#ff6b35" stroke="#fff" stroke-width="4"/>' +
      '<circle cx="20" cy="31" r="6" fill="#fff"/>' + chuSvg(92, 42, dong(gia), 27, '#fff') + '</g>';
    return s;
  }

  /** Hình minh họa đề cho Đấu Trường và game cũ ('' nếu các lựa chọn đã là hình). */
  function veHinhTien(ct) {
    const k = ct.kieu;
    if (k === 'doc_to') return svgMo(480, 230, 'Một tờ tiền') + gTo(ct.gia, 240, 112, 420, -3) + '</svg>';
    if (k === 'dem_loai') {
      let s = svgMo(520, 300, 'Đống tiền có ' + ct.dong.length + ' tờ');
      viTriDong(ct.dong).forEach(function (p) { s += gTo(p.gia, 16 + p.x * 488, 12 + p.y * 276, 118, p.xoay); });
      return s + '</svg>';
    }
    if (k === 'may_to') {
      let s = svgMo(560, 190, dong(ct.tu) + ' đổi được mấy tờ ' + dong(ct.sang));
      s += gTo(ct.tu, 120, 72, 210, -2) + chuSvg(120, 170, '1 tờ', 32);
      s += chuSvg(268, 90, '=', 60, '#6a4bc4');
      s += gTo(ct.sang, 430, 72, 190, 2) + chuSvg(430, 170, '? tờ', 32, '#d84f1d');
      return s + '</svg>';
    }
    if (k === 'doi') {
      let s = svgMo(560, 190, 'Đổi tờ ' + dong(ct.tu));
      s += gTo(ct.tu, 120, 72, 210, -2) + chuSvg(120, 170, 'Đổi tờ này', 28);
      s += chuSvg(268, 92, '→', 58, '#6a4bc4');
      if (ct.sang) s += gTo(ct.sang, 400, 58, 150, 3) + gTo(ct.sang, 430, 78, 150, -2) + chuSvg(420, 170, 'các tờ ' + dong(ct.sang), 26, '#d84f1d');
      else {
        toNho(ct.tu).forEach(function (g, i) { s += gTo(g, 380 + i * 34, 52 + i * 22, 130, (i - 1) * 4); });
        s += chuSvg(420, 176, 'các tờ nhỏ hơn', 26, '#d84f1d');
      }
      return s + '</svg>';
    }
    if (k === 'tra') {
      return svgMo(460, 270, hoa(monCua(ct.mon).ten) + ' giá ' + dong(ct.gia)) + gMon(ct.mon, ct.gia, 150, 140) + '</svg>';
    }
    if (k === 'thua') {
      let s = svgMo(600, 270, hoa(monCua(ct.mon).ten) + ' giá ' + dong(ct.gia) + ', khách đưa ' + dong(ct.dua));
      s += gMon(ct.mon, ct.gia, 130, 140);
      s += chuSvg(470, 96, 'Khách đưa', 28, '#5b5575');
      s += gTo(ct.dua, 470, 160, 220, -3);
      return s + '</svg>';
    }
    return '';
  }

  /* ---------------- Loại câu 'tien' ---------------- */

  function tinhTien(ct) {
    const k = ct.kieu;
    if (k === 'chon_to' || k === 'doc_to') return ct.gia;
    if (k === 'lon_nhat') return Math.max.apply(null, ct.ds);
    if (k === 'be_nhat') return Math.min.apply(null, ct.ds);
    if (k === 'dem_loai') return dem(ct.dong, ct.gia);
    if (k === 'may_to') return ct.tu / ct.sang;
    if (k === 'tra') return chuoiTo(toHop(ct.gia, soLuongVi(ct.vi)) || toHop(ct.gia) || [ct.gia]);
    if (k === 'doi') return ct.sang ? chuoiTo(lap(ct.sang, ct.tu / ct.sang)) : chuoiTo(toHop(ct.tu, null, toNho(ct.tu)));
    if (k === 'thua') return ct.dua - ct.gia;
    throw new Error('Kiểu câu tiền lạ: ' + k);
  }

  function deTien(ct) {
    const k = ct.kieu;
    if (k === 'chon_to') return 'Chọn tờ ' + (ct.goi === 'so' ? dong(ct.gia) : docTien(ct.gia));
    if (k === 'doc_to') return 'Tờ tiền này là bao nhiêu đồng?';
    if (k === 'lon_nhat') return 'Tờ tiền nào có giá trị lớn nhất?';
    if (k === 'be_nhat') return 'Tờ tiền nào có giá trị bé nhất?';
    if (k === 'dem_loai') return 'Có mấy tờ ' + dong(ct.gia) + '?';
    if (k === 'may_to') return 'Tờ ' + dong(ct.tu) + ' đổi được mấy tờ ' + dong(ct.sang) + '?';
    if (k === 'tra') return hoa(monCua(ct.mon).ten) + ' giá ' + dong(ct.gia) + '. Con trả vừa đủ bằng những tờ nào?';
    if (k === 'doi') return 'Đổi tờ ' + dong(ct.tu) + ' thành ' + (ct.sang ? 'các tờ ' + dong(ct.sang) : 'các tờ tiền nhỏ hơn');
    if (k === 'thua') return hoa(monCua(ct.mon).ten) + ' giá ' + dong(ct.gia) + ', khách đưa ' + dong(ct.dua) + '. Trả lại khách bao nhiêu tiền?';
    return '';
  }

  function deDocTien(ct) {
    const k = ct.kieu;
    if (k === 'chon_to') return 'Chọn tờ ' + docTien(ct.gia) + '.';
    if (k === 'dem_loai') return 'Có mấy tờ ' + docTien(ct.gia) + '?';
    if (k === 'may_to') return 'Tờ ' + docTien(ct.tu) + ' đổi được mấy tờ ' + docTien(ct.sang) + '?';
    if (k === 'tra') return hoa(monCua(ct.mon).ten) + ' giá ' + docTien(ct.gia) + '. Con trả vừa đủ bằng những tờ nào?';
    if (k === 'doi') return 'Đổi tờ ' + docTien(ct.tu) + ' thành ' + (ct.sang ? 'các tờ ' + docTien(ct.sang) : 'các tờ tiền nhỏ hơn') + '.';
    if (k === 'thua') return hoa(monCua(ct.mon).ten) + ' giá ' + docTien(ct.gia) + ', khách đưa ' + docTien(ct.dua) + '. Trả lại khách bao nhiêu tiền?';
    return deTien(ct);
  }

  function maTien(ct) {
    const k = ct.kieu;
    if (k === 'chon_to') return 'chon:' + ct.gia + ':' + (ct.goi === 'so' ? 'so' : 'chu');
    if (k === 'doc_to') return 'doc:' + ct.gia;
    if (k === 'lon_nhat' || k === 'be_nhat') return (k === 'lon_nhat' ? 'lon:' : 'be:') + ct.ds.join(',');
    if (k === 'dem_loai') return 'dem:' + ct.gia + ':' + TO.map(function (g) { return dem(ct.dong, g); }).join('-');
    if (k === 'may_to') return 'may-to:' + ct.tu + ':' + ct.sang;
    if (k === 'tra') return 'tra:' + ct.gia + ':' + (ct.vi || []).join('-');
    if (k === 'doi') return 'doi:' + ct.tu + ':' + (ct.sang || 'nho');
    if (k === 'thua') return 'thua:' + ct.dua + '-' + ct.gia;
    return k;
  }

  /** Lỗi khi đưa một bộ tờ cho số tiền can: đếm số tờ thay vì cộng, nhầm tờ 100 với tờ 1 000, thiếu hoặc thừa. */
  function loiDuaTien(ds, t, can) {
    if (!ds.length) return ['khac'];
    if (t === can) return [];
    const ma = [];
    // "3 tờ là 300 đồng": số tờ nhân 100 bằng số tiền cần đưa mà không phải toàn tờ 100
    if (ds.length >= 2 && ds.length * 100 === can && ds.some(function (x) { return x !== 100; })) ma.push('dem-so-to');
    // tờ 1 000 coi là tờ 100 (hoặc ngược lại): đổi một tờ thì vừa đủ
    if ((ds.indexOf(1000) >= 0 && t - 900 === can) || (ds.indexOf(100) >= 0 && t + 900 === can)) ma.push('nham-to-tien');
    ma.push(t < can ? 'tra-thieu' : 'tra-thua');
    return ma;
  }

  function loiMotTo(dung, v) {
    if (v === dung) return [];
    if (v * 10 === dung) return ['thieu-0'];
    if (v === dung * 10) return ['thua-0'];
    if (laTo(v)) return ['nham-to-tien'];
    return ['khac'];
  }

  function nhanBietLoiTien(ct, v) {
    const k = ct.kieu;
    if (k === 'chon_to' || k === 'doc_to') return loiMotTo(ct.gia, Number(v));
    if (k === 'lon_nhat' || k === 'be_nhat') {
      const n = Number(v), d = tinhTien(ct);
      if (n === d) return [];
      if (ct.ds.indexOf(n) < 0) return ['khac'];
      const lon = laLon(ct);
      const bay = ct.ds.slice().sort(function (a, b) { return lon ? soBay(b, a) : soBay(a, b); })[0];
      if (bay !== d && n === bay) return ['so-chu-so'];
      const nguoc = lon ? Math.min.apply(null, ct.ds) : Math.max.apply(null, ct.ds);
      if (n === nguoc) return ['chieu-dau'];
      return ['khac'];
    }
    if (k === 'dem_loai') {
      const n = Number(v), d = tinhTien(ct);
      if (n === d) return [];
      const ma = [];
      const khacLoai = TO.filter(function (g) { return g !== ct.gia; }).map(function (g) { return dem(ct.dong, g); }).filter(function (c) { return c > 0; });
      if (khacLoai.indexOf(n) >= 0) ma.push('nham-to-tien');
      if (Math.abs(n - d) === 1) ma.push('dem-lech');
      return ma.length ? ma : ['khac'];
    }
    if (k === 'may_to') {
      const n = Number(v), d = ct.tu / ct.sang;
      if (n === d) return [];
      const ma = [];
      if (ct.sang !== 100 && n === ct.tu / 100) ma.push('dem-so-to');
      [500, 200].forEach(function (o) {
        if (o !== ct.sang && o < ct.tu && ct.tu % o === 0 && n === ct.tu / o && ma.indexOf('nham-to-tien') < 0) ma.push('nham-to-tien');
      });
      if (n === d * 10) ma.push('thua-0');
      if (n * 10 === d) ma.push('thieu-0');
      if (Math.abs(n - d) === 1) ma.push('dem-lech');
      return ma.length ? ma : ['khac'];
    }
    const ds = docTo(v);
    const t = tong(ds);
    if (k === 'tra') return loiDuaTien(ds, t, ct.gia);
    if (k === 'doi') {
      if (!ds.length) return ['khac'];
      const dungLoai = ct.sang ? ds.every(function (x) { return x === ct.sang; }) : ds.length >= 2 && ds.every(function (x) { return x < ct.tu; });
      if (t === ct.tu) return dungLoai ? [] : ct.sang ? ['nham-to-tien'] : ['khac'];
      return loiDuaTien(ds, t, ct.tu);
    }
    if (k === 'thua') {
      const d = ct.dua - ct.gia;
      if (!ds.length) return ['khac'];
      if (t === d) return [];
      const ma = [];
      if (t === ct.gia && ct.gia !== d) ma.push('nham-tien-thua');
      if (ds.length >= 2 && ds.length * 100 === d && ds.some(function (x) { return x !== 100; })) ma.push('dem-so-to');
      ma.push(t < d ? 'tra-thieu' : 'tra-thua');
      return ma;
    }
    return ['khac'];
  }

  function loiNoiTien(ct, v, maLoi) {
    const m = (maLoi && maLoi[0]) || 'khac';
    const k = ct.kieu;
    if (k === 'tra' || k === 'doi' || k === 'thua') {
      const ds = docTo(v), t = tong(ds), can = canCua(ct);
      const phan = t < can ? 'còn thiếu ' + dong(can - t) : 'thừa ' + dong(t - can) + ' rồi';
      if (m === 'dem-so-to') return 'Con đưa ' + ds.length + ' tờ nhưng cộng lại là ' + dong(t) + ': phải cộng số trên các tờ, không đếm số tờ';
      if (m === 'nham-tien-thua') return 'Đó là giá ' + monCua(ct.mon).ten + '. Tiền thừa là ' + soTien(ct.dua) + ' ' + TRU + ' ' + soTien(ct.gia);
      if (m === 'nham-to-tien') return k === 'doi' && t === can ? 'Đủ ' + dong(can) + ' rồi, nhưng cô cần các tờ ' + dong(ct.sang) : 'Tờ 1' + CACH + '000 đồng khác tờ 100 đồng đấy: cộng lại là ' + dong(t) + ', ' + phan;
      if (m === 'tra-thieu' || m === 'tra-thua') return 'Cộng lại là ' + dong(t) + ', ' + phan;
      return 'Chưa đúng rồi';
    }
    const n = Number(v);
    if (k === 'chon_to' || k === 'doc_to') {
      if (m === 'thieu-0' || m === 'thua-0') return 'Tờ 100 đồng có hai chữ số 0, tờ 1' + CACH + '000 đồng có ba chữ số 0';
      if (m === 'nham-to-tien') return k === 'doc_to' ? 'Số in trên tờ tiền là ' + soTien(ct.gia) + ', không phải ' + soTien(n) : 'Tờ ' + docTien(ct.gia) + ' có số ' + soTien(ct.gia) + ', không phải ' + soTien(n);
      return 'Chưa đúng rồi';
    }
    if (k === 'lon_nhat' || k === 'be_nhat') {
      if (m === 'so-chu-so') return laLon(ct) ? '1' + CACH + '000 có bốn chữ số, nhiều chữ số hơn nên lớn hơn ' + soTien(n) : '1' + CACH + '000 có bốn chữ số nên lớn hơn ' + soTien(tinhTien(ct)) + ', không phải bé nhất';
      if (m === 'chieu-dau') return 'Con chọn tờ ' + (laLon(ct) ? 'bé' : 'lớn') + ' nhất rồi, đề hỏi tờ ' + (laLon(ct) ? 'lớn' : 'bé') + ' nhất';
      return 'Còn tờ có giá trị ' + (laLon(ct) ? 'lớn' : 'bé') + ' hơn tờ ' + dong(n);
    }
    if (k === 'dem_loai') {
      if (m === 'nham-to-tien') return 'Con đếm nhầm sang tờ loại khác rồi: chỉ đếm các tờ có số ' + soTien(ct.gia);
      if (m === 'dem-lech') return 'Con đếm lệch một tờ rồi';
      return 'Chưa đúng rồi';
    }
    if (k === 'may_to') {
      if (m === 'dem-so-to') return 'Mỗi tờ là ' + dong(ct.sang) + ', không phải 100 đồng: đếm thêm ' + soTien(ct.sang) + ' nhé';
      if (m === 'nham-to-tien') return n + ' tờ là số tờ ' + dong(ct.tu / n) + ' rồi. Đếm thêm ' + soTien(ct.sang) + ' nhé';
      if (m === 'thua-0') return 'Con thừa một chữ số 0 rồi';
      if (m === 'thieu-0') return 'Con thiếu một chữ số 0 rồi';
      if (m === 'dem-lech') return 'Con đếm lệch một lần rồi';
      return 'Chưa đúng rồi';
    }
    return 'Chưa đúng rồi';
  }

  /** Dãy đếm thêm: 200, 400, 600 … (tối đa n số). */
  function demThem(tu, buoc, den, n) {
    const ds = [];
    for (let x = tu + buoc; x <= den && ds.length < (n || 20); x += buoc) ds.push(soTien(x));
    return ds;
  }

  function goiYTien(ct) {
    const k = ct.kieu;
    if (k === 'chon_to') return ['Nhìn số in to ở giữa tờ tiền.', hoa(docTien(ct.gia)) + ' viết là ' + dong(ct.gia) + '.', 'Tờ ' + dong(ct.gia) + ' là tờ ' + MAU[ct.gia].ten + ', có số ' + soTien(ct.gia) + '.'];
    if (k === 'doc_to') return ['Nhìn số in to ở giữa tờ tiền.', 'Số đó có ' + String(ct.gia).length + ' chữ số.', 'Đọc số in trên tờ tiền rồi thêm chữ "đồng".'];
    if (k === 'lon_nhat' || k === 'be_nhat') {
      const lon = laLon(ct);
      return ['So số in trên các tờ tiền.', 'Số nào có nhiều chữ số hơn thì lớn hơn: 1' + CACH + '000 có bốn chữ số.', 'Cùng ba chữ số thì so hàng trăm. Tìm tờ ' + (lon ? 'lớn' : 'bé') + ' nhất nhé.'];
    }
    if (k === 'dem_loai') return ['Tìm các tờ có số ' + soTien(ct.gia) + '.', 'Chạm vào từng tờ ' + dong(ct.gia) + ', vừa chạm vừa đếm.', 'Chỉ đếm tờ ' + MAU[ct.gia].ten + ' có số ' + soTien(ct.gia) + ', không đếm tờ khác.'];
    if (k === 'may_to') {
      const ds = demThem(0, ct.sang, ct.tu, 3);
      return ['Mỗi tờ là ' + dong(ct.sang) + '. Đếm thêm ' + soTien(ct.sang) + ' cho tới ' + soTien(ct.tu) + '.', 'Đếm: ' + ds.join(', ') + (ct.sang * 3 < ct.tu ? ', …' : '.'), 'Mỗi lần đếm là một tờ. Con đếm được mấy lần thì là mấy tờ.'];
    }
    if (k === 'tra') {
      const d = docTo(tinhTien(ct));
      if (d.length === 1) return ['Tìm một tờ có số bằng giá ' + monCua(ct.mon).ten + '.', 'Giá là ' + dong(ct.gia) + ': tờ nào có số ' + soTien(ct.gia) + '?', 'Trả một tờ ' + dong(ct.gia) + ' là vừa đủ.'];
      return ['Cộng số trên các tờ tiền, không đếm số tờ.', 'Lấy tờ lớn nhất mà không quá ' + dong(ct.gia) + ' trước, rồi thêm tờ nhỏ.', dong(ct.gia) + ' = ' + d.map(dong).join(' + ') + '.'];
    }
    if (k === 'doi') {
      if (ct.sang) return ['Các tờ đổi được phải cộng lại bằng ' + dong(ct.tu) + '.', 'Đếm thêm ' + soTien(ct.sang) + ': ' + demThem(0, ct.sang, ct.tu, 3).join(', ') + (ct.sang * 3 < ct.tu ? ', …' : '.'), dong(ct.tu) + ' = ' + lap(soTien(ct.sang), ct.tu / ct.sang).join(' + ') + '.'];
      const d = docTo(tinhTien(ct));
      return ['Các tờ đổi được phải cộng lại bằng ' + dong(ct.tu) + '.', 'Chỉ dùng các tờ nhỏ hơn tờ ' + dong(ct.tu) + '.', dong(ct.tu) + ' = ' + d.map(dong).join(' + ') + '.'];
    }
    if (k === 'thua') {
      const d = ct.dua - ct.gia;
      return ['Tiền thừa là tiền khách đưa bớt đi giá món hàng.', 'Đếm thêm từ ' + soTien(ct.gia) + ' cho tới ' + soTien(ct.dua) + ': ' + demThem(ct.gia, 100, ct.dua, 10).join(', ') + '.', soTien(ct.dua) + ' ' + TRU + ' ' + soTien(ct.gia) + ' = ' + soTien(d) + '. Con trả lại ' + dong(d) + '.'];
    }
    return ['Nhìn kĩ các tờ tiền.', 'Cộng số trên các tờ tiền.', 'Con thử lại nhé.'];
  }

  /** Hình lời giải: một hàng tờ tiền kèm phép cộng. */
  function hangGiai(ds, ketQua) {
    ds = docTo(ds);
    const loai = theoLoai(ds);
    const pt = ds.length === 1 ? dong(ketQua) : ds.length > 4 && loai.length === 1 ? ds.length + ' tờ ' + dong(ds[0]) + ' = ' + dong(ketQua) : ds.map(soTien).join(' + ') + ' = ' + dong(ketQua);
    return '<div class="ck-giai">' + hangTo(ds, 120, true) + '<p class="ck-giai-pt">' + esc(pt) + '</p></div>';
  }

  function loiGiaiTien(ct) {
    const k = ct.kieu, d = tinhTien(ct);
    if (k === 'chon_to' || k === 'doc_to') {
      return { ma: 'nhan-biet-to-tien', buoc: ['Tờ tiền có số ' + soTien(ct.gia) + ' ở giữa và chữ ĐỒNG', 'Đọc là: ' + docTien(ct.gia)], html: '<div class="ck-giai">' + veTo(ct.gia, 'ck-giai-to') + '</div>', kq: d };
    }
    if (k === 'lon_nhat' || k === 'be_nhat') {
      const xep = ct.ds.slice().sort(function (a, b) { return a - b; });
      return {
        ma: 'so-sanh-to-tien',
        buoc: ['So các số ' + xep.map(soTien).join(', '), ct.ds.indexOf(1000) >= 0 ? '1' + CACH + '000 có bốn chữ số nên lớn nhất; các số có ba chữ số thì so hàng trăm' : 'Các số cùng có ba chữ số: so hàng trăm', xep.map(soTien).join(' < ')],
        html: '<div class="ck-giai">' + hangTo(xep, 110, true) + '</div>', kq: d
      };
    }
    if (k === 'dem_loai') {
      const ds = [];
      for (let i = 1; i <= d; i++) ds.push(i);
      return { ma: 'dem-to-tien', buoc: ['Tìm các tờ có số ' + soTien(ct.gia), 'Đếm: ' + ds.join(', '), 'Có ' + d + ' tờ ' + dong(ct.gia)], html: '<div class="ck-giai">' + hangTo(lap(ct.gia, d), 110, true) + '</div>', kq: d };
    }
    if (k === 'may_to') {
      return {
        ma: 'doi-tien-dem-them',
        buoc: ['Đếm thêm ' + soTien(ct.sang) + ': ' + demThem(0, ct.sang, ct.tu, 10).join(', '), 'Đếm được ' + d + ' lần ' + soTien(ct.sang), dong(ct.tu) + ' đổi được ' + d + ' tờ ' + dong(ct.sang)],
        html: hangGiai(lap(ct.sang, d), ct.tu), kq: d
      };
    }
    if (k === 'tra') {
      const ds = docTo(d);
      const buoc = ['Cần trả ' + dong(ct.gia)];
      if (ds.length > 1) {
        buoc.push('Lấy tờ ' + dong(ds[0]) + ', còn thiếu ' + dong(ct.gia - ds[0]));
        buoc.push(ds.map(soTien).join(' + ') + ' = ' + soTien(ct.gia) + ': vừa đủ');
      } else buoc.push('Tờ ' + dong(ct.gia) + ' là vừa đủ');
      return { ma: 'tra-tien-vua-du', buoc: buoc, html: hangGiai(ds, ct.gia), kq: d };
    }
    if (k === 'doi') {
      const ds = docTo(d);
      return {
        ma: 'doi-tien',
        buoc: [ct.sang ? 'Đếm thêm ' + soTien(ct.sang) + ' cho tới ' + soTien(ct.tu) + ': ' + demThem(0, ct.sang, ct.tu, 10).join(', ') : 'Chọn các tờ nhỏ hơn tờ ' + dong(ct.tu), ds.length > 4 ? tenBoTo(ds) + ' là ' + dong(ct.tu) : ds.map(soTien).join(' + ') + ' = ' + soTien(ct.tu), 'Tờ ' + dong(ct.tu) + ' đổi được ' + tenBoTo(ds)],
        html: hangGiai(ds, ct.tu), kq: d
      };
    }
    if (k === 'thua') {
      const ds = toHop(d) || [d];
      return {
        ma: 'tra-lai-tien-thua',
        buoc: ['Khách đưa ' + dong(ct.dua) + ', ' + monCua(ct.mon).ten + ' giá ' + dong(ct.gia), 'Đếm thêm từ ' + soTien(ct.gia) + ': ' + demThem(ct.gia, 100, ct.dua, 10).join(', ') + ' (' + (d / 100) + ' lần 100 đồng)', 'Tiền thừa: ' + soTien(ct.dua) + ' ' + TRU + ' ' + soTien(ct.gia) + ' = ' + dong(d)],
        html: hangGiai(ds, d), kq: d
      };
    }
    return { ma: 'tien', buoc: [], kq: d };
  }

  function ketLuanTien(ct) {
    const k = ct.kieu, d = tinhTien(ct);
    if (k === 'chon_to' || k === 'doc_to') return 'Đây là tờ ' + dong(ct.gia) + ' (' + docTien(ct.gia) + ')';
    if (k === 'lon_nhat' || k === 'be_nhat') return 'Vậy tờ ' + dong(d) + ' có giá trị ' + (laLon(ct) ? 'lớn' : 'bé') + ' nhất';
    if (k === 'dem_loai') return 'Vậy có ' + d + ' tờ ' + dong(ct.gia);
    if (k === 'may_to') return 'Vậy tờ ' + dong(ct.tu) + ' đổi được ' + d + ' tờ ' + dong(ct.sang);
    if (k === 'tra') return docTo(d).length === 1 ? 'Vậy trả một tờ ' + dong(ct.gia) : 'Vậy trả ' + docTo(d).map(dong).join(' + ') + ' = ' + dong(ct.gia);
    if (k === 'doi') return docTo(d).length > 3 && theoLoai(d).length === 1 ? 'Vậy tờ ' + dong(ct.tu) + ' đổi được ' + tenBoTo(d) : 'Vậy ' + dong(ct.tu) + ' = ' + docTo(d).map(dong).join(' + ');
    if (k === 'thua') return 'Vậy trả lại khách ' + soTien(ct.dua) + ' ' + TRU + ' ' + soTien(ct.gia) + ' = ' + dong(d);
    return '';
  }

  function hienTien(v, ct) {
    const k = ct && ct.kieu;
    if (k === 'dem_loai' || k === 'may_to') return Number(v) + ' tờ';
    if (k === 'tra' || k === 'doi' || (k === 'thua' && /,/.test(String(v)))) return tenBoTo(docTo(v));
    return dong(Number(v));
  }

  function theChuTien(ct) {
    const k = ct.kieu;
    if (k === 'chon_to' || k === 'doc_to') return hoa(docTien(ct.gia));
    if (k === 'lon_nhat' || k === 'be_nhat') return 'Tờ ' + (laLon(ct) ? 'lớn' : 'bé') + ' nhất: ' + ct.ds.map(soTien).join(', ');
    if (k === 'dem_loai') return 'Số tờ ' + dong(ct.gia);
    if (k === 'may_to') return dong(ct.tu) + ' = ? tờ ' + soTien(ct.sang);
    if (k === 'tra') return 'Trả ' + dong(ct.gia);
    if (k === 'doi') return 'Đổi ' + dong(ct.tu);
    if (k === 'thua') return soTien(ct.dua) + ' ' + TRU + ' ' + soTien(ct.gia);
    return deTien(ct);
  }

  function veLuaChonTien(ct, v) {
    const k = ct.kieu;
    const nhan = hienTien(v, ct);
    if (k === 'chon_to' || k === 'lon_nhat' || k === 'be_nhat') return { nhan: nhan, hinh: veTo(Number(v), 'ck-lc-to', 'width:100%;max-width:200px;height:auto') };
    if (k === 'tra' || k === 'doi') return { nhan: nhanBoTo(v), hinh: hangTo(v, 96) };
    return { nhan: nhan };
  }

  /* ---------------- Đáp án nhiễu ---------------- */

  function coTenLoi(loi) { return loi.length && !loi.every(function (m) { return m === 'khac'; }); }
  /** Lỗi chỉ nói "thiếu, thừa, lệch" chứ không chỉ ra cách hiểu sai. */
  const LOI_CHUNG = { 'tra-thieu': 1, 'tra-thua': 1, 'dem-lech': 1, khac: 1 };

  /**
   * Chọn n đáp án nhiễu từ các ứng viên { v, w }: bỏ ứng viên đúng, trùng, ngoài phạm vi;
   * ưu tiên lỗi có tên khác dem-lech (trọng số), rồi mới tới lệch nhỏ và không tên.
   */
  function chonNhieu(ct, rng, ung, n) {
    const d = String(tinhTien(ct));
    const daCo = {};
    const tot = [], con = [];
    ung.forEach(function (x) {
      const key = String(x.v);
      if (!key || key === d || daCo[key]) return;
      const loi = nhanBietLoiTien(ct, x.v);
      if (!loi.length) return;
      daCo[key] = 1;
      const manh = coTenLoi(loi) && !(loi.length === 1 && loi[0] === 'dem-lech');
      (manh ? tot : con).push({ v: x.v, w: x.w || 1, loi: loi });
    });
    const ra = [];
    const lay = function (ds) {
      while (ra.length < n && ds.length) {
        const x = NH.chonTheoTrongSo(rng, ds);
        ra.push(x);
        ds.splice(ds.indexOf(x), 1);
      }
    };
    // ít nhất một lỗi có tên (nếu có), ưu tiên lỗi hiểu sai (đếm số tờ, nhầm tờ, nhầm tiền thừa) hơn thiếu, thừa đơn thuần
    const rieng = tot.filter(function (x) { return x.loi.some(function (m) { return !LOI_CHUNG[m]; }); });
    const dau = rieng.length ? rieng : tot;
    if (dau.length && n > 0) { const x = NH.chonTheoTrongSo(rng, dau); ra.push(x); tot.splice(tot.indexOf(x), 1); }
    lay(tot);
    lay(con);
    return tron(rng, ra).map(function (x) { return { gia_tri: x.v, loi: x.loi }; });
  }

  function ungVienSo(d, them) {
    const ds = them.slice();
    [d + 1, d - 1, d + 2, d - 2].forEach(function (v) { if (v >= 1) ds.push({ v: v, w: Math.abs(v - d) === 1 ? 1 : 0.4 }); });
    return ds;
  }

  function taoNhieuTien(kyNang, ct, rng) {
    const k = ct.kieu;
    const d = tinhTien(ct);
    if (k === 'chon_to' || k === 'doc_to') return chonNhieu(ct, rng, TO.filter(function (g) { return g !== ct.gia; }).map(function (g) { return { v: g, w: 1 }; }), 3);
    if (k === 'lon_nhat' || k === 'be_nhat') return chonNhieu(ct, rng, ct.ds.filter(function (g) { return g !== d; }).map(function (g) { return { v: g, w: 1 }; }), 2);
    if (k === 'dem_loai') {
      const ung = [];
      TO.forEach(function (g) { const c = dem(ct.dong, g); if (g !== ct.gia && c > 0) ung.push({ v: c, w: 3 }); });
      ung.push({ v: ct.dong.length, w: 0.6 });
      return chonNhieu(ct, rng, ungVienSo(d, ung), 2);
    }
    if (k === 'may_to') {
      const ung = [];
      if (ct.sang !== 100) ung.push({ v: ct.tu / 100, w: 3 });
      [500, 200].forEach(function (o) { if (o !== ct.sang && o < ct.tu && ct.tu % o === 0) ung.push({ v: ct.tu / o, w: 2.5 }); });
      if (d * 10 <= 100) ung.push({ v: d * 10, w: 1.5 });
      if (d % 10 === 0) ung.push({ v: d / 10, w: 1.5 });
      return chonNhieu(ct, rng, ungVienSo(d, ung), 2);
    }
    if (k === 'tra') {
      const g = ct.gia;
      const ung = [];
      const soTo = g / 100;
      if (soTo >= 2 && soTo <= 6) {
        if (200 * soTo <= 1000) ung.push({ v: chuoiTo(lap(200, soTo)), w: 2 });
        if (500 + 100 * (soTo - 1) <= 1000) ung.push({ v: chuoiTo([500].concat(lap(100, soTo - 1))), w: 2 });
      }
      [100, 200].forEach(function (x) { if (g - x >= 100) ung.push({ v: chuoiTo(toHop(g - x)), w: 1.5 }); });
      [100, 200, 300].forEach(function (x) { if (g + x <= 1000) ung.push({ v: chuoiTo(toHop(g + x)), w: x === 300 ? 0.6 : 1 }); });
      const ds = docTo(d);
      if (ds.indexOf(1000) >= 0) ung.push({ v: chuoiTo(ds.slice(1).concat([100])), w: 2 });
      if (g === 100) ung.push({ v: '1000', w: 2 });
      else if (g < 1000) ung.push({ v: '1000', w: 0.8 });
      return chonNhieu(ct, rng, ung, 2);
    }
    if (k === 'doi') {
      const ung = [];
      if (ct.sang) {
        const n = ct.tu / ct.sang;
        if (n - 1 >= 1) ung.push({ v: chuoiTo(lap(ct.sang, n - 1)), w: 2 });
        if (n - 2 >= 1) ung.push({ v: chuoiTo(lap(ct.sang, n - 2)), w: 0.8 });
        if ((n + 1) * ct.sang <= 1000) ung.push({ v: chuoiTo(lap(ct.sang, n + 1)), w: 1 });
        toNho(ct.tu).forEach(function (o) { if (o !== ct.sang && ct.tu % o === 0 && ct.tu / o <= 10) ung.push({ v: chuoiTo(lap(o, ct.tu / o)), w: 2.5 }); });
      } else {
        const nho = toNho(ct.tu);
        [100, 200].forEach(function (x) { const h = ct.tu - x >= 100 ? toHop(ct.tu - x, null, nho) : null; if (h && h.length) ung.push({ v: chuoiTo(h), w: 1.5 }); });
        if (ct.tu + 100 <= 1000) { const h = toHop(ct.tu + 100, null, nho); if (h) ung.push({ v: chuoiTo(h), w: 1 }); }
        const soTo = ct.tu / 100;
        if (soTo >= 2 && 200 * soTo <= 1000) ung.push({ v: chuoiTo(lap(200, soTo)), w: 2.5 });
      }
      return chonNhieu(ct, rng, ung, 2);
    }
    if (k === 'thua') {
      const ung = [{ v: ct.gia, w: 3 }];
      if (d + 100 <= 1000) ung.push({ v: d + 100, w: 1.5 });
      if (d - 100 >= 100) ung.push({ v: d - 100, w: 1.5 });
      ung.push({ v: ct.dua, w: 0.7 });
      if (d + 200 <= 1000) ung.push({ v: d + 200, w: 0.5 });
      return chonNhieu(ct, rng, ung, 2);
    }
    return [];
  }

  NH.dangKyLoai('tien', {
    tinh: tinhTien, de: deTien, deDoc: deDocTien, deChuanHoa: maTien, nhanBietLoi: nhanBietLoiTien, loiNoi: loiNoiTien,
    goiY: goiYTien, loiGiai: loiGiaiTien, ketLuan: ketLuanTien, taoNhieu: taoNhieuTien, hienGiaTri: hienTien,
    theChu: theChuTien, veHinh: veHinhTien, veLuaChon: veLuaChonTien,
    dang: function (ct) { return ct.kieu === 'tra' || ct.kieu === 'doi' || ct.kieu === 'thua' ? 'keo_tha' : 'chon_dap_an'; }
  });

  NH.themLoi('dem-so-to', {
    be: 'Mỗi tờ tiền có giá trị khác nhau, con cộng số trên các tờ nhé',
    mo_ta: 'Đếm số tờ tiền thay vì cộng giá trị các tờ (đưa 3 tờ bất kì cho 300 đồng, nghĩ tờ 1 000 đồng đổi được 10 tờ 200 đồng)',
    ngan: 'Con hay đếm số tờ thay vì cộng tiền'
  });
  NH.themLoi('tra-thieu', {
    be: 'Con đưa thiếu tiền rồi',
    mo_ta: 'Số tiền đưa ra (trả tiền, đổi tiền hoặc trả lại tiền thừa) ít hơn số cần đưa',
    ngan: 'Con hay đưa thiếu tiền'
  });
  NH.themLoi('tra-thua', {
    be: 'Con đưa thừa tiền rồi',
    mo_ta: 'Số tiền đưa ra (trả tiền, đổi tiền hoặc trả lại tiền thừa) nhiều hơn số cần đưa',
    ngan: 'Con hay đưa thừa tiền'
  });
  NH.themLoi('nham-to-tien', {
    be: 'Con xem kĩ số in trên tờ tiền nhé',
    mo_ta: 'Nhầm mệnh giá các tờ tiền: chọn hoặc đếm nhầm tờ khác loại, coi tờ 1 000 đồng là tờ 100 đồng, đổi tiền bằng tờ khác loại được hỏi',
    ngan: 'Con hay nhầm các tờ tiền'
  });
  NH.themLoi('nham-tien-thua', {
    be: 'Tiền trả lại là phần tiền thừa, không phải giá món hàng',
    mo_ta: 'Trả lại khách đúng bằng giá món hàng thay vì phần tiền thừa (khách đưa 1 000 đồng mua món 700 đồng, trả lại 700 đồng thay vì 300 đồng)',
    ngan: 'Con hay nhầm tiền thừa với giá tiền'
  });

  /* ---------------- Sinh câu ---------------- */

  function cachCua(rng, muc, macDinh) {
    const ds = muc && muc.cach && muc.cach.length ? muc.cach : macDinh;
    return chon(rng, ds);
  }
  function monHop(rng, gia) {
    const t = gia / 100;
    const hop = MON.filter(function (m) { return t >= m.gia[0] && t <= m.gia[1]; });
    return chon(rng, hop.length ? hop : MON);
  }
  /** Ba tờ khác nhau; 70% có tờ 1 000 cùng tờ 200 hoặc 500 (bẫy so chữ số đầu). */
  function baTo(rng) {
    let ds;
    if (rng() < 0.7) {
      ds = [1000, chon(rng, [200, 500])];
      ds.push(chon(rng, TO.filter(function (x) { return ds.indexOf(x) < 0; })));
    } else ds = tron(rng, TO).slice(0, 3);
    return tron(rng, ds);
  }
  /** Đống tiền lẫn lộn 5 đến 8 tờ, có 1 đến 4 tờ loại được hỏi (SGK Bài 56, hoạt động 1). */
  function sinhDong(rng) {
    for (let thu = 0; thu < 100; thu++) {
      const gia = chon(rng, TO);
      let dongTo = lap(gia, nn(rng, 1, 4));
      TO.forEach(function (g) { if (g !== gia) dongTo = dongTo.concat(lap(g, nn(rng, 0, 3))); });
      if (dongTo.length < 5 || dongTo.length > 8) continue;
      return { loai: 'tien', kieu: 'dem_loai', gia: gia, dong: tron(rng, dongTo) };
    }
    return { loai: 'tien', kieu: 'dem_loai', gia: 500, dong: [500, 200, 100, 500, 1000, 200] };
  }

  function sinhNhanBiet(rng, muc) {
    const cach = cachCua(rng, muc, ['chon_to', 'chon_to', 'doc_to', 'lon_nhat', 'be_nhat', 'dem_loai', 'dem_loai', 'may_to']);
    if (cach === 'chon_to') return { loai: 'tien', kieu: 'chon_to', gia: chon(rng, TO), goi: rng() < 0.6 ? 'chu' : 'so' };
    if (cach === 'doc_to') return { loai: 'tien', kieu: 'doc_to', gia: chon(rng, TO) };
    if (cach === 'lon_nhat' || cach === 'be_nhat') return { loai: 'tien', kieu: cach, ds: baTo(rng) };
    if (cach === 'dem_loai') return sinhDong(rng);
    return { loai: 'tien', kieu: 'may_to', tu: chon(rng, [200, 500, 500, 1000]), sang: 100 };
  }

  /** Tách số tiền thành các tờ một cách ngẫu nhiên (mỗi loại tối đa 4 tờ). */
  function tachNgauNhien(rng, tien) {
    for (let thu = 0; thu < 50; thu++) {
      const so = { 1000: 0, 500: 0, 200: 0, 100: 0 };
      let con = tien;
      while (con > 0) {
        const dc = TO.filter(function (g) { return g <= con && so[g] < 4; });
        if (!dc.length) break;
        const g = NH.chonTheoTrongSo(rng, dc.map(function (x) { return { g: x, w: x >= 500 ? 2.2 : x === 200 ? 1.6 : 1 }; })).g;
        so[g]++;
        con -= g;
      }
      if (con === 0) return so;
    }
    const so = { 1000: 0, 500: 0, 200: 0, 100: 0 };
    toHop(tien).forEach(function (g) { so[g]++; });
    return so;
  }

  function sinhTra(rng, muc) {
    void muc;
    const tram = NH.chonTheoTrongSo(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (t) { return { t: t, w: t === 1 || t === 2 || t === 5 ? 1 : t === 10 ? 1.5 : 3 }; })).t;
    const gia = tram * 100;
    const mon = monHop(rng, gia);
    let vi;
    if (laTo(gia) && rng() < 0.55) vi = [1, 1, 1, 1]; // như SGK: chọn một tờ vừa đúng giá
    else {
      const so = tachNgauNhien(rng, gia);
      // thêm 1 đến 3 tờ để ví có nhiều cách trả và có tờ lớn dễ trả thừa
      const them = nn(rng, 1, 3);
      for (let i = 0; i < them; i++) {
        const dc = TO.filter(function (g) { return so[g] < 4; });
        const g = NH.chonTheoTrongSo(rng, dc.map(function (x) { return { g: x, w: x === 1000 ? 1.4 : 1 }; })).g;
        so[g]++;
      }
      vi = TO.map(function (g) { return so[g]; });
    }
    return { loai: 'tien', kieu: 'tra', mon: mon.id, gia: gia, vi: vi };
  }

  function sinhDoi(rng, muc) {
    const cach = cachCua(rng, muc, ['may_to', 'may_to', 'doi', 'doi', 'doi_nho']);
    if (cach === 'doi_nho') return { loai: 'tien', kieu: 'doi', tu: chon(rng, [1000, 1000, 500, 200]), sang: 0 };
    const p = NH.chonTheoTrongSo(rng, CAP_DOI);
    return { loai: 'tien', kieu: cach === 'doi' ? 'doi' : 'may_to', tu: p.tu, sang: p.sang };
  }

  /** Tiền thừa: khách đưa tờ 1 000 hoặc 500 đồng, giá tròn trăm; ưu tiên tiền thừa nhỏ (dễ đếm thêm). */
  function sinhThua(rng, muc) {
    void muc;
    const dua = rng() < 0.75 ? 1000 : 500;
    const ds = [];
    for (let t = 1; t < dua / 100; t++) ds.push({ t: t, w: t <= 3 ? 3 : t <= 5 ? 2 : 1 });
    const gia = dua - NH.chonTheoTrongSo(rng, ds).t * 100;
    return { loai: 'tien', kieu: 'thua', mon: monHop(rng, gia).id, gia: gia, dua: dua, khach: chon(rng, KHACH) };
  }

  const TEN_1000 = '1' + CACH + '000';
  NH.themKyNang('nhan-biet-tien', { noi_dung: 'B2.14', ten: 'Nhận biết các tờ tiền 100, 200, 500, ' + TEN_1000 + ' đồng', kieu: 'K3', giay: 8, gioi_han: 1000, nhieu_toi_da: 1000, loai: 'tien', bai_hoc: 'tien-viet-nam', sinh: sinhNhanBiet });
  NH.themKyNang('tra-tien', { noi_dung: 'B2.14', ten: 'Trả tiền vừa đủ bằng các tờ tiền', kieu: 'K3', giay: 15, gioi_han: 1000, nhieu_toi_da: 1000, loai: 'tien', bai_hoc: 'tien-viet-nam', sinh: sinhTra });
  NH.themKyNang('doi-tien', { noi_dung: 'B2.14', ten: 'Đổi tiền: một tờ đổi được mấy tờ nhỏ hơn', kieu: 'K3', giay: 12, gioi_han: 1000, nhieu_toi_da: 1000, loai: 'tien', bai_hoc: 'tien-viet-nam', sinh: sinhDoi });
  NH.themKyNang('tien-thua', { noi_dung: 'B2.14', ten: 'Làm người bán: trả lại tiền thừa', kieu: 'K2', giay: 20, gioi_han: 1000, nhieu_toi_da: 1000, loai: 'tien', bai_hoc: 'tien-thua', sinh: sinhThua });

  window.CauTien = {
    TO: TO, MAU: MAU, MON: MON, KHACH: KHACH,
    soTien: soTien, dong: dong, docTien: docTien, hoa: hoa, monCua: monCua,
    docTo: docTo, chuoiTo: chuoiTo, tong: tong, tenBoTo: tenBoTo, nhanBoTo: nhanBoTo, toHop: toHop, canCua: canCua, toNho: toNho,
    soLuongVi: soLuongVi, matTo: matTo, gTo: gTo, veTo: veTo, hangTo: hangTo, viTriDong: viTriDong
  };
})();
