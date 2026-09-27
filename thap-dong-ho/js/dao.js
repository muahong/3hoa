/* ============================================================
   dao.js – Chế độ Đảo Khủng Long của Tháp Đồng Hồ (thể loại "Tháp Xếp Hình" trong đảo, giai đoạn 5)
   - Chỉ bật khi trang chạy trong iframe của đảo: ?dao=1, window.parent khác window và window.parent.DaoCauNoi tồn tại
     (hợp đồng ở dao-khung-long/js/cau-noi.js). Ngoài đảo: window.ThapDao = { bat: false } và game chạy y như cũ.
   - Mỗi khối rơi là MỘT câu hỏi của ngân hàng đảo: khối mang hình của đề (mặt đồng hồ, tranh, tia số), chữ ngắn
     của đề, hoặc dấu hỏi; mỗi cột mang một lựa chọn (chữ, hình nhỏ, hoặc mặt đồng hồ vẽ bằng canvas của game).
     Thẻ bên phải ghi đủ đề và hình to. Bé đưa khối sang cột (ghi doi_cot) rồi thả (ghi tha): khối chạm đáy cột nào
     thì trả lời bằng giá trị của cột đó (traLoi, kèm vi_tri 'cot_1'…).
   - Không hết giờ: khối dừng lơ lửng một hàng trên chỗ đáp, chờ bé. Không thua: cột đá cao gần tới đỉnh thì tự dọn.
   - Sai hẳn: khối hóa đá rơi xuống cột đó, cột đúng sáng lên ("Đây!"), rồi đảo hiện màn "Gần đúng rồi" (phanHoi);
     bé bấm "Chơi tiếp" thì sang câu sau (câu sai do đảo xếp quay lại sau 2 câu).
   - Gợi ý 💡: ba cấp của ngân hàng (goiY); cấp 3 gạch bớt một cột sai (ghi loai_bo).
   - Không menu, bài học, hỏi đáp, bảng kết quả, không ghi localStorage: đảo là nơi ghi duy nhất.
   Nạp TRƯỚC js/game.js; game.js gọi ThapDao.ganMay(may) lúc khởi động và các móc ghi chú [Đảo].
   ============================================================ */
(function () {
  'use strict';

  /** Cầu nối của đảo, hoặc null khi game chạy một mình. */
  function timCauNoi() {
    try {
      if (!/(?:^|[?&])dao=1(?:&|$)/.test(String(window.location.search || ''))) return null;
      if (!window.parent || window.parent === window) return null;
      const api = window.parent.DaoCauNoi;
      return api && typeof api.cauTiep === 'function' ? api : null;
    } catch (e) { return null; }           // khác tên miền: không phải đảo
  }

  const API = timCauNoi();
  if (!API) { window.ThapDao = { bat: false }; return; }

  const SO_HANG = 5;            // bảng thấp một hàng so với 6 hàng khi chơi một mình: ô to hơn cho hình và chữ
  const HE_SO_DIA = 1.15;       // đĩa đáp án cao 1,15 ô (hình nhỏ, mặt đồng hồ)
  const CAO_LO_LUNG = 1;        // khối dừng lơ lửng 1 hàng trên chỗ đáp
  const GIAY_ROI = 6;           // giây rơi từ trên xuống (nhịp chơi thong thả, không có hết giờ)
  const SO_LUA_CHON = 4;        // xin 4 lựa chọn; ít hơn thì bảng có ít cột hơn
  const GOM_MS = 700;           // các bước đổi cột liền nhau (◀ ▶, kéo ngang) gộp thành một lần doi_cot
  const CHO_PHAN_HOI_MS = 1300; // xem khối hóa đá và cột đúng sáng lên rồi mới hiện màn "Gần đúng rồi"
  const DIEM_GOI_Y = 50;        // đúng nhờ gợi ý: ít điểm hơn, không tính chuỗi
  const PRAISE = ['Chính xác!', 'Tuyệt vời!', 'Giỏi quá!', 'Đúng rồi!', 'Xuất sắc!', 'Hay lắm!'];

  let M = null, G = null;       // bộ máy game (game.js đưa vào qua ganMay)
  let seq = 0;
  const st = {
    info: null, tieng: true, giong: true, daBatDau: false, daKetThuc: false, het: false,
    q: null, qThe: null, lc: [], dung: -1, ndKhoi: null, cotDau: 0, goiYCap: 0, goiYCuoi: '', lanThu: 1,
    cho: false, cachTha: '', ketQua: null, docCuoi: '',
    tong: 10, xong: 0, quayLai: 0, saiTheoMa: {},
    gom: null, gomHen: 0, anhBe: {}, dom: null, the: null
  };
  const loiGhi = window.__thapDaoLoi = [];

  /* ---------------- Gọi cầu nối an toàn ---------------- */

  function ghiLoi(noi, e) {
    const m = noi + ': ' + (e && e.message ? e.message : String(e));
    if (loiGhi.length < 50) loiGhi.push(m);
    try { console.warn('[thap-dong-ho/dao]', m); } catch (e2) { /* bỏ qua */ }
  }
  /** Gọi một hàm của cầu nối; lỗi thì ghi lại và trả về undefined (không làm đứng game). */
  function goi(ten) {
    const args = Array.prototype.slice.call(arguments, 1);
    try { return API[ten].apply(API, args); } catch (e) { ghiLoi(ten, e); return undefined; }
  }
  /** Như goi nhưng luôn trả về Promise (phanHoi, ketThuc, veDao). */
  function goiHua(ten) {
    const args = Array.prototype.slice.call(arguments, 1);
    try { return Promise.resolve(API[ten].apply(API, args)).catch(function (e) { ghiLoi(ten, e); return null; }); } catch (e) { ghiLoi(ten, e); return Promise.resolve(null); }
  }

  function tenCot(i) { return 'cot_' + (i + 1); }
  function dsTenCot(n) { const ds = []; for (let i = 0; i < n; i++) ds.push(tenCot(i)); return ds; }
  function $(id) { return document.getElementById(id); }

  /* ---------------- Âm thanh, giọng đọc ---------------- */

  function apDungAmThanh(tt) {
    const a = (tt && tt.am_thanh) || {};
    st.tieng = a.tieng !== false;
    st.giong = a.giong !== false;
    try { window.Sfx.setEnabled(st.tieng); window.Music.setEnabled(st.tieng); window.Voice.setEnabled(st.giong); } catch (e) { /* bỏ qua */ }
  }
  /** Đọc một câu: giọng Việt của game (có hạ nhạc nền), máy không có thì mượn giọng của đảo. */
  function noi(chu) {
    if (!chu || !st.giong) return;
    const V = window.Voice;
    if (V && V.available && V.enabled) V.say(String(chu));
    else goi('doc', String(chu));
  }

  /* ---------------- Hình SVG của ngân hàng → ảnh vẽ lên canvas ---------------- */

  /** Lấy chuỗi <svg>…</svg> trong hình của câu ('' nếu không có). */
  function layHinh(s) {
    if (!s) return '';
    s = String(s);
    const n = (s.match(/<svg\b/gi) || []).length;
    if (!n) return '';
    const m = (n === 1 ? /<svg\b[\s\S]*<\/svg>/i : /<svg\b[\s\S]*?<\/svg>/i).exec(s);
    return m ? m[0] : '';
  }

  /** Ảnh từ SVG: kích thước theo viewBox, vẽ nét ở cỡ to (SVG không ghi width/height bị coi như 300 × 150). */
  function taoAnh(svg) {
    const vb = /viewBox\s*=\s*["']\s*(-?[\d.]+)[\s,]+(-?[\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(svg);
    let w = vb ? Number(vb[3]) : 0, h = vb ? Number(vb[4]) : 0;
    if (!(w > 0 && h > 0)) {
      const mw = /<svg\b[^>]*\swidth\s*=\s*["']?([\d.]+)/i.exec(svg), mh = /<svg\b[^>]*\sheight\s*=\s*["']?([\d.]+)/i.exec(svg);
      w = mw ? Number(mw[1]) : 300; h = mh ? Number(mh[1]) : 150;
    }
    const k = 640 / Math.max(w, h);
    // Ảnh SVG không thừa hưởng phông của trang, và font-family="Baloo 2, …" không đặt trong nháy là CSS sai (bị bỏ qua)
    // nên chữ trong ảnh rơi về phông có chân. Đặt phông tròn cho gốc <svg>: chữ nào không có phông hợp lệ sẽ thừa hưởng.
    const PHONG = "font-family:'Baloo 2','Arial Rounded MT Bold','Segoe UI',Arial,sans-serif";
    let s = svg.replace(/<svg\b([^>]*)>/i, function (m0, attrs) {
      attrs = attrs.replace(/\s(width|height)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
      const kieu = /\sstyle\s*=\s*"([^"]*)"/i.exec(attrs);
      if (kieu) attrs = attrs.replace(kieu[0], ' style="' + kieu[1].replace(/;?\s*$/, ';') + PHONG + '"');
      else if (!/\sstyle\s*=/i.test(attrs)) attrs += ' style="' + PHONG + '"';
      return '<svg' + attrs + ' width="' + Math.round(w * k) + '" height="' + Math.round(h * k) + '">';
    });
    if (!/<svg\b[^>]*\sxmlns\s*=/i.test(s)) s = s.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
    const nd = { rong: w, cao: h, san: false, loi: false, anh: null };
    const img = new Image();
    nd.anh = img;
    try {
      img.addEventListener('load', function () { nd.san = true; });   // khóa ảnh gạch có cờ san: tải xong thì vẽ lại
      img.addEventListener('error', function () { nd.loi = true; });
    } catch (e) { /* bỏ qua */ }
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
    return nd;
  }

  /** Chờ các ảnh của câu tải xong (tối đa 2 giây). */
  function choAnh(ds) {
    return Promise.all(ds.filter(function (nd) { return nd && nd.anh && !nd.san && !nd.loi; }).map(function (nd) {
      return new Promise(function (xong) {
        const img = nd.anh;
        let da = false;
        const het = function () { if (da) return; da = true; clearTimeout(t); if (img.naturalWidth) nd.san = true; xong(); };
        const t = setTimeout(het, 2000);
        try { img.addEventListener('load', het); img.addEventListener('error', het); } catch (e) { /* bỏ qua */ }
        if (img.complete && img.naturalWidth) het();
      });
    }));
  }

  /** Ảnh đã vẽ sẵn vừa khung w × h (giữ tỉ lệ) để mỗi khung hình chỉ tốn một drawImage. */
  const raster = new Map();
  function anhVua(nd, w, h) {
    const dpr = (G && G.dpr) || 1;
    const k = nd.id + '|' + Math.round(w) + 'x' + Math.round(h) + '|' + dpr;
    let cv = raster.get(k);
    if (cv) return cv;
    if (raster.size > 60) raster.clear();
    cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(w * dpr));
    cv.height = Math.max(1, Math.round(h * dpr));
    const c = cv.getContext('2d');
    const s = Math.min(w / nd.rong, h / nd.cao);
    const dw = nd.rong * s, dh = nd.cao * s;
    try { c.scale(dpr, dpr); c.drawImage(nd.anh, (w - dw) / 2, (h - dh) / 2, dw, dh); } catch (e) { /* bỏ qua */ }
    raster.set(k, cv);
    return cv;
  }

  /* ---------------- Nội dung khối và cột ---------------- */

  /**
   * Chữ ngắn ghi trên khối rơi: chữ trên thẻ của câu (q.the, hoặc NganHang.theChu của đảo, ví dụ "1 giờ 15 phút" cho câu
   * "Đồng hồ nào chỉ 1 giờ 15 phút?"), không thì chính đề nếu đủ ngắn ("45 ? 54"); '' khi không có chữ ngắn.
   */
  function chuNgan(q) {
    const vua = function (s) { s = s == null ? '' : String(s).trim(); return s && s.length <= 16 ? s : ''; };
    let the = vua(q.the);
    if (!the) { try { the = vua(window.parent.NganHang.theChu(q.cau_truc)); } catch (e) { the = ''; } }
    return the || vua(q.de);
  }

  /** Nội dung khối rơi: hình của đề, chữ ngắn của đề ("45 ? 54"), hoặc dấu hỏi (đề dài nằm trên thẻ bên phải). */
  function ndKhoi(q) {
    const nd = { dao: true, id: 'k' + (++seq), loai: 'hoi', san: true };
    const ngan = chuNgan(q);
    if (ngan) nd.chu = ngan;
    const svg = layHinh(q.hinh);
    if (svg) {
      Object.assign(nd, taoAnh(svg));
      nd.loai = 'hinh';
      // Hình gần vuông (mặt đồng hồ) mới vẽ lên khối; hình dài (tia số, nhiều hình đánh số) chỉ đọc được trên thẻ to
      const tl = nd.rong / nd.cao;
      nd.veTrenKhoi = tl >= 0.75 && tl <= 1.34;
    } else if (nd.chu) nd.loai = 'chu';
    return nd;
  }

  /**
   * Cách hiện các lựa chọn trên cột (ngân hàng thường gửi kèm cả chữ, hình nhỏ và đồng hồ cho mỗi lựa chọn):
   * - lựa chọn tự báo cách hiện (hien: 'chu' | 'dong_ho' | 'dien_tu' | 'hinh') thì theo đó;
   * - đề có hình (mặt đồng hồ, tranh các hình): lựa chọn là chữ/số, nếu không bé chỉ việc so hình với hình;
   * - đề chỉ có chữ ("Đồng hồ nào chỉ 8 giờ?", "Hình nào là hình tứ giác?"): vẽ mặt đồng hồ bằng canvas của game,
   *   hoặc hình nhỏ của lựa chọn, không ghi chữ để khỏi lộ đáp án.
   */
  function cheDoNhan(q) {
    const lc = q.lua_chon || [];
    if (!lc.length) return 'chu';
    const hien = lc[0].hien;
    if (hien && lc.every(function (x) { return x.hien === hien; })) {
      if (hien === 'chu') return 'chu';
      if (hien === 'dong_ho' && lc.every(function (x) { return x.dong_ho && x.dong_ho.h != null; })) return 'dong_ho';
      if (lc.every(function (x) { return layHinh(x.hinh); })) return 'hinh';
    }
    if (layHinh(q.hinh)) return 'chu';
    if (lc.every(function (x) { return x.dong_ho && x.dong_ho.h != null; })) return 'dong_ho';
    if (lc.every(function (x) { return layHinh(x.hinh); })) return 'hinh';
    return 'chu';
  }

  function ndLuaChon(x, cheDo) {
    const nd = { dao: true, id: 'l' + (++seq), loai: 'chu', chu: String(x.nhan != null && x.nhan !== '' ? x.nhan : x.gia_tri), san: true };
    if (cheDo === 'hinh') {
      const svg = layHinh(x.hinh);
      if (svg) { Object.assign(nd, taoAnh(svg)); nd.loai = 'hinh'; }
    } else if (cheDo === 'dong_ho' && x.dong_ho) {
      nd.loai = 'dong_ho';
      nd.t = M.K.mk(Number(x.dong_ho.h) || 12, Number(x.dong_ho.m) || 0);
    }
    return nd;
  }

  /** Nhãn chữ (kể cả hình chưa tải được: hiện chữ thay). */
  function laChu(nd) { return nd.loai === 'chu' || (nd.loai === 'hinh' && !nd.san); }

  /* ---------------- Chữ trên canvas ---------------- */

  let doC = null;
  function ctxDo() {
    if (!doC) { try { doC = document.createElement('canvas').getContext('2d'); } catch (e) { doC = null; } }
    return doC;
  }
  function font(size) { return '800 ' + Math.round(size) + 'px ' + M.FONT; }
  /** Ngắt chữ theo từ cho vừa bề rộng w ở cỡ size (từ quá dài đứng riêng một dòng). */
  function ngatDong(c, chu, w, size) {
    c.font = font(size);
    const ds = [];
    let dong = '';
    // Số đi liền với chữ đứng sau nó ("3 phút", "8 giờ"): không ngắt dòng giữa hai chữ này
    const tu = String(chu).split(/\s+/).filter(Boolean);
    const cum = [];
    for (let i = 0; i < tu.length; i++) {
      if (/^\d+$/.test(tu[i]) && i + 1 < tu.length && /^[^\d\s,.;:]/.test(tu[i + 1])) { cum.push(tu[i] + ' ' + tu[i + 1]); i++; }
      else cum.push(tu[i]);
    }
    cum.forEach(function (t) {
      const thu = dong ? dong + ' ' + t : t;
      if (!dong || c.measureText(thu).width <= w) dong = thu;
      else { ds.push(dong); dong = t; }
    });
    if (dong) ds.push(dong);
    return ds.length ? ds : [''];
  }
  /** Cỡ chữ lớn nhất trong [nho, lon] để chữ xuống tối đa soDong dòng và vừa khung w × h. */
  function coVua(c, chu, w, h, lon, nho, soDong) {
    for (let s = Math.floor(lon); s > nho; s--) {
      const ds = ngatDong(c, chu, w, s);
      if (ds.length <= soDong && ds.length * s * 1.14 <= h && ds.every(function (d) { return c.measureText(d).width <= w; })) return s;
    }
    return nho;
  }
  function veChu(c, ds, cx, cy, size, mau, vien) {
    c.font = font(size);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const lh = size * 1.14;
    for (let k = 0; k < ds.length; k++) {
      const y = cy + (k - (ds.length - 1) / 2) * lh + size * 0.04;
      if (vien) { c.lineJoin = 'round'; c.lineWidth = Math.max(3, size * 0.2); c.strokeStyle = vien; c.strokeText(ds[k], cx, y); }
      c.fillStyle = mau;
      c.fillText(ds[k], cx, y);
    }
  }

  /** Dấu hỏi trên khối khi đề chỉ có chữ dài (đề đầy đủ nằm trên thẻ bên phải). */
  function veDauHoi(c, cx, cy, s, xam) {
    const r = s * 0.3;
    const g = c.createLinearGradient(cx, cy - r, cx, cy + r);
    g.addColorStop(0, xam ? '#b7bbcb' : '#ffb36b');
    g.addColorStop(1, xam ? '#8e93a8' : '#ff6b35');
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2);
    c.fillStyle = g; c.fill();
    c.lineWidth = Math.max(2, s * 0.03); c.strokeStyle = xam ? '#6b6f85' : '#d84f1d'; c.stroke();
    veChu(c, ['?'], cx, cy + s * 0.01, s * 0.42, '#ffffff');
  }

  /* ---------------- Vẽ (game.js gọi) ---------------- */

  /** Nội dung một khối (rơi, bóng, hay đá khi sai): vẽ trong ô vuông s tại (x, y). */
  function veKhoi(c, x, y, s, nd, xam) {
    const p = s * 0.1, w = s - 2 * p;
    if (xam) c.globalAlpha = 0.5;
    if (nd.loai === 'hinh' && nd.san && nd.veTrenKhoi !== false) c.drawImage(anhVua(nd, w, w), x + p, y + p, w, w);
    else if (nd.loai === 'dong_ho') M.drawClockFace(c, x + s / 2, y + s / 2, s * 0.38, nd.t, { gray: xam, mini: xam || s < 70 });
    else if (nd.chu) {
      const size = coVua(c, nd.chu, w, w, s * 0.34, 9, 2);
      veChu(c, ngatDong(c, nd.chu, w, size), x + s / 2, y + s / 2, size, xam ? '#4a4e66' : '#2b2d42');
    } else veDauHoi(c, x + s / 2, y + s / 2, s, xam);
    c.globalAlpha = 1;
  }

  /** Nhãn một cột (trong đĩa đáp án đã tô nền): chữ, hình nhỏ hoặc mặt đồng hồ; cột bị gạch ở gợi ý cấp 3. */
  function veNhan(c, col, i, x, y, w, h, cu) {
    const nd = cu ? col.prevNd : col.nd;
    const cs = M.COL_STYLE[i] || M.COL_STYLE[0];
    const cx = x + w / 2, cy = y + h / 2;
    if (!nd) { veChu(c, ['?'], cx, cy, h * 0.42, 'rgba(43,45,66,0.28)'); return; }
    if (nd.loai === 'hinh' && nd.san) {
      const p = Math.max(5, w * 0.06);
      c.drawImage(anhVua(nd, w - 2 * p, h - 2 * p), x + p, y + p, w - 2 * p, h - 2 * p);
    } else if (nd.loai === 'dong_ho') {
      M.drawClockFace(c, cx, cy, Math.min(w, h) * 0.42, nd.t, {});
    } else {
      veChu(c, nd.dong || [nd.chu], cx, cy, G.plateFont || 18, cs.ink);
    }
    if (!cu && col.loaiBo) {
      M.roundRect(c, x, y, w, h, Math.min(16, w * 0.18));
      c.fillStyle = 'rgba(240,242,248,0.72)';
      c.fill();
      veChu(c, ['✗'], cx, cy, Math.min(w, h) * 0.55, '#ef476f', 'rgba(255,255,255,0.9)');
    }
  }

  /** Cỡ chữ chung và ngắt dòng cho nhãn chữ của mọi cột (gọi khi đổi câu hoặc đổi bố cục). */
  function doNhan() {
    if (!M || !G || !G.cols) return;
    const c = ctxDo();
    if (!c) return;
    const B = G.board;
    const w = Math.max(20, B.cell - 16), h = Math.max(16, B.plateH - 14);
    const lon = Math.min(h * 0.46, 40);
    let s2 = lon, s3 = lon;
    const chu = [];
    G.cols.forEach(function (col) { [col.nd, col.prevNd].forEach(function (nd) { if (nd && laChu(nd)) chu.push(nd); }); });
    chu.forEach(function (nd) { s2 = Math.min(s2, coVua(c, nd.chu, w, h, s2, 11, 2)); s3 = Math.min(s3, coVua(c, nd.chu, w, h, s3, 11, 3)); });
    // Ưu tiên hai dòng ("2 giờ" / "30 phút") nếu chữ không nhỏ đi quá nhiều so với ba dòng ("2 giờ" / "30" / "phút")
    G.plateFont = Math.max(11, s2 >= Math.max(15, s3 * 0.78) ? s2 : s3);
    chu.forEach(function (nd) { nd.dong = ngatDong(c, nd.chu, w, G.plateFont); });
  }

  /** Bố cục chữ và hình trên thẻ câu hỏi (tính một lần cho mỗi câu và mỗi cỡ thẻ). */
  function boCucThe(c, q, w, h) {
    const k = q.stt + '|' + q.ma_cau + '|' + Math.round(w) + 'x' + Math.round(h);
    if (st.the && st.the.k === k) return st.the;
    const coHinh = !!(st.ndKhoi && st.ndKhoi.loai === 'hinh' && st.qThe === q);
    const de = String(q.de || '');
    let size, ds, hChu;
    if (coHinh) {
      size = coVua(c, de, w, h * 0.34, M.clamp(w * 0.085, 18, 30), 14, 3);
      ds = ngatDong(c, de, w, size);
      hChu = ds.length * size * 1.14;
    } else {
      size = coVua(c, de, w, h, M.clamp(w * 0.11, 20, 40), 14, 5);
      ds = ngatDong(c, de, w, size);
      hChu = ds.length * size * 1.14;
    }
    st.the = { k: k, size: size, ds: ds, hChu: hChu, coHinh: coHinh };
    return st.the;
  }

  /** Thẻ câu hỏi bên phải (thay đồng hồ lớn): đề đầy đủ, hình to, dấu ✓ đáp án sau khi bé thả đúng. */
  function veThe(c) {
    const Big = G.big;
    const w = Big.cardW, h = Big.cardH, x0 = Big.x - w / 2, y0 = Big.y - h / 2;
    const pad = M.clamp(w * 0.05, 10, 18);
    const q = st.qThe;
    if (!q) {
      veChu(c, ['Sẵn sàng…'], Big.x, Big.y, M.clamp(w * 0.09, 18, 30), '#5b5f7a');
      return;
    }
    const L = boCucThe(c, q, w - 2 * pad, h - 2 * pad);
    const fs = M.clamp(w * 0.07, 16, 26);          // cỡ chữ của dấu ✓ đáp án ở đáy thẻ
    if (L.coHinh) {
      // Đề và hình đứng thành một khối ở giữa thẻ; chừa đáy cho dấu ✓ để không đè lên hình
      const nd = st.ndKhoi;
      const hw = w - 2 * pad;
      const ha = Math.max(20, h - 2 * pad - L.hChu - 8 - fs * 1.6 - 6);
      const hh = Math.min(ha, hw * nd.cao / nd.rong);
      const tong = L.hChu + 8 + hh;
      let y = Math.max(y0 + pad, y0 + (h - fs * 1.6 - 6 - tong) / 2);
      veChu(c, L.ds, Big.x, y + L.hChu / 2, L.size, '#2b2d42');
      y += L.hChu + 8;
      if (nd.san) c.drawImage(anhVua(nd, hw, hh), x0 + pad, y, hw, hh);
    } else {
      veChu(c, L.ds, Big.x, Big.y, L.size, '#2b2d42');
    }
    // Dấu đáp án đúng sau khi bé thả đúng (giữ tới câu sau)
    const kq = st.ketQua;
    if (kq && kq.q === q && kq.dung) {
      c.font = font(fs);
      const txt = '✓ ' + kq.nhan;
      const tw = Math.min(w - 2 * pad, c.measureText(txt).width + fs * 1.4);
      const by = y0 + h - pad - fs * 1.6;
      M.roundRect(c, Big.x - tw / 2, by, tw, fs * 1.6, fs * 0.8);
      c.fillStyle = '#06d6a0';
      c.fill();
      c.save();
      c.beginPath(); c.rect(Big.x - tw / 2, by, tw, fs * 1.6); c.clip();
      veChu(c, [txt], Big.x, by + fs * 0.8, fs, '#063b2c');
      c.restore();
    }
  }

  /** Khủng long của bé đứng cạnh tháp thay bạn cú (ảnh của đảo). Trả về false để game vẽ bạn cú khi ảnh chưa có. */
  function veBan(c, o, state, bob) {
    const img = st.anhBe[state === 'cheer' ? 'co_vu' : state === 'worry' ? 'goi_y' : 'thuong'] || st.anhBe.thuong;
    if (!img || !img.complete || !img.naturalWidth) return false;
    const bw = o.s * 1.1, bh = o.s * 1.15;
    const k = Math.min(bw / img.naturalWidth, bh / img.naturalHeight);
    const dw = img.naturalWidth * k, dh = img.naturalHeight * k;
    const key = 'be|' + state + '|' + Math.round(dw);
    let spr = st.anhBe[key];
    if (!spr) {
      const dpr = G.dpr || 1;
      spr = document.createElement('canvas');
      spr.width = Math.max(1, Math.round(dw * dpr)); spr.height = Math.max(1, Math.round(dh * dpr));
      try {
        const sc = spr.getContext('2d');
        sc.imageSmoothingQuality = 'high';
        sc.drawImage(img, 0, 0, spr.width, spr.height);
      } catch (e) { return false; }
      st.anhBe[key] = spr;
    }
    c.drawImage(spr, o.x + (o.s - dw) / 2, o.y + bh - dh - bob, dw, dh);
    return true;
  }

  /* ---------------- Cột ---------------- */

  function taoCot(n) {
    G.cols = [];
    for (let i = 0; i < n; i++) {
      G.cols.push({ t: null, nd: null, prevNd: null, flip: 0, glow: 0, hint: false, review: false, stack: [], loaiBo: false, lines: null, prevLines: null });
    }
  }

  /** Câu có số lựa chọn khác số cột: dọn đá (lấp lánh) rồi dựng lại bảng. */
  function doiSoCot(n) {
    const R = M.ROWS;
    G.cols.forEach(function (col, i) {
      col.stack.forEach(function (r, j) {
        if (r.dead) return;
        const pos = M.tileCenter(i, R - 1 - j);
        M.spawnSparkle(pos.x, pos.y, G.board.cell * 0.4, false);
      });
    });
    M.datSoCot(n);
    taoCot(M.soCot());
    M.layout();
  }

  /** Cột đá cao tới gần đỉnh: dọn nhẹ nhàng (không thua trong đảo). */
  function donThapNeuCao() {
    const R = M.ROWS;
    let co = false, d = 0.15;
    G.cols.forEach(function (col, i) {
      if (M.stackH(i) < R - 1) return;
      col.stack.forEach(function (r, j) { if (!r.dead && r.popAt == null) { M.popRubble(i, j, d); d += 0.08; co = true; } });
    });
    if (co) {
      const B = G.board;
      M.addText('🧹 Dọn tháp cho gọn nào!', B.x + B.w / 2, B.y + B.h * 0.3, { color: '#9af0ff', size: B.cell * 0.32, life: 1.6, vy: -20 });
      window.Sfx.play('sweep');
    }
  }

  /* ---------------- Vòng đời một câu ---------------- */

  /** game.js gọi khi tới lượt khối mới: lấy câu kế tiếp của đảo, đổi nhãn cột, chờ ảnh rồi thả khối. */
  function khoiMoi() {
    if (st.cho || st.het || st.daKetThuc || G.piece) return;
    G.nextPieceAt = Infinity;                  // không gọi lại trong lúc chờ câu và ảnh
    xaDoiCot();
    const q = goi('cauTiep', { so_lua_chon: SO_LUA_CHON, vi_tri: dsTenCot(SO_LUA_CHON) });
    if (!q) { hetCau(); return; }
    let lc = (q.lua_chon || []).slice(0, M.COL_STYLE.length);
    if (lc.length < 2) {
      lc = luaChonDuPhong(q);
      if (lc.length < 2) { boQuaCau(q); return; }
    }
    const cheDo = cheDoNhan({ hinh: q.hinh, lua_chon: lc });
    const ten = dsTenCot(lc.length);
    const ds = lc.map(function (x, i) {
      return { gia_tri: x.gia_tri, nhan: String(x.nhan != null ? x.nhan : x.gia_tri), vi_tri: x.vi_tri || ten[i], dung: !!x.dung, nd: ndLuaChon(x, cheDo) };
    });
    let dung = ds.findIndex(function (x) { return x.dung; });
    if (dung < 0) dung = ds.findIndex(function (x) { return String(x.gia_tri) === String(q.dap_an); });
    const nd = ndKhoi(q);
    st.q = q; st.lc = ds; st.dung = dung; st.goiYCap = 0; st.goiYCuoi = ''; st.lanThu = 1; st.cachTha = '';
    choAnh([nd].concat(ds.map(function (x) { return x.nd; }))).then(function () {
      if (st.q !== q || st.daKetThuc) return;
      hienCau(q, nd);
    });
  }

  /** Nhãn mới lật lên, thẻ câu hỏi đổi, khối xuất hiện ở một cột ngẫu nhiên phía trên bảng. */
  function hienCau(q, nd) {
    const n = st.lc.length;
    if (n !== M.soCot()) doiSoCot(n);
    G.cols.forEach(function (col, i) {
      col.prevNd = col.nd; col.nd = st.lc[i].nd; col.flip = col.prevNd ? 1 : 0.5;
      col.glow = 0; col.hint = false; col.loaiBo = false;
    });
    doNhan();
    anGoiY();
    st.ndKhoi = nd; st.qThe = q; st.the = null; st.ketQua = null;
    const col = Math.floor(Math.random() * n);   // có thể là cột đúng: không hết giờ nên đứng yên không được điểm
    const B = G.board;
    G.piece = {
      t: nd, col: col, x: B.x + col * B.cell, row: -1, land: M.ROWS - 1 - M.stackH(col), target: st.dung,
      born: G.time, mode: 'fall', pop: 0, hint: false, asked: false, touched: false, review: !!q.on_lai, id: ++G.idSeq, selected: false
    };
    st.cotDau = col;
    window.Sfx.play('tock');
    const doc = q.de_doc || q.de;
    if (doc && (doc !== st.docCuoi || q.on_lai)) noi(doc);   // đề giống câu trước ("Đồng hồ chỉ mấy giờ?") thì không đọc lại
    st.docCuoi = doc;
    // Trình đọc màn hình: bảng vẽ bằng canvas nên ghi đề và các cột vào nhãn của canvas
    try {
      const cv = document.getElementById('game');
      cv.setAttribute('role', 'img');
      cv.setAttribute('aria-label', q.de + ' Các cột: ' + st.lc.map(function (x, i) { return 'cột ' + (i + 1) + ' ' + x.nhan; }).join(', ') + '.');
    } catch (e) { /* bỏ qua */ }
    // Hai câu đầu: bé đứng yên lâu thì nhắc nhẹ cách chơi (một lần mỗi câu)
    if (q.stt <= 2) {
      const id = G.piece.id;
      setTimeout(function () {
        const p = G.piece;
        if (p && p.id === id && !p.touched && !p.selected && st.goiYCap === 0 && p.mode === 'fall' && G.state === 'playing' && st.q === q) {
          M.showHint('👆 Chạm vào cột có đáp án đúng, chạm lần nữa để thả', 'info', 4000);
        }
      }, 12000);
    }
  }

  /** Tắt chip gợi ý của câu trước (gợi ý chỉ đúng cho câu đang hỏi). */
  function anGoiY() { try { M.ui.hint.hidden = true; } catch (e) { /* bỏ qua */ } }

  /**
   * Câu không có lựa chọn (màn để dạng mặc định của kỹ năng, ví dụ "quay kim" hay nhập số): xin đáp án nhiễu từ chính
   * ngân hàng của đảo (cùng công thức lỗi), không có thì lấy các số gần đáp án. Ghi lại các lựa chọn đã hiện (thao tác tro)
   * vì cau_hien của câu này không có lua_chon.
   */
  function luaChonDuPhong(q) {
    let ds = [];
    try {
      const NH = window.parent.NganHang;
      const ct = q.cau_truc;
      const co = {};
      co[String(q.dap_an)] = 1;
      ds.push(q.dap_an);
      for (let lan = 0; ds.length < SO_LUA_CHON && lan < 12; lan++) {
        (NH.taoNhieu(q.ky_nang, ct, Math.random) || []).forEach(function (x) {
          if (ds.length < SO_LUA_CHON && !co[String(x.gia_tri)]) { co[String(x.gia_tri)] = 1; ds.push(x.gia_tri); }
        });
      }
      for (let i = ds.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = ds[i]; ds[i] = ds[j]; ds[j] = t; }
      ds = ds.map(function (v) {
        const ve = NH.veLuaChon(ct, v) || {};
        return { gia_tri: v, nhan: ve.nhan != null ? String(ve.nhan) : NH.hienGiaTriCau(ct, v), hinh: ve.hinh || '', dong_ho: ve.dong_ho || null, hien: ve.hien || null, dung: String(v) === String(q.dap_an) };
      });
    } catch (e) { ds = []; }
    if (ds.length < 2) {
      const d = Number(q.dap_an);
      if (!isFinite(d) || String(q.dap_an).trim() === '') return [];
      const so = [d];
      [1, -1, 10, -10, 2, -2].forEach(function (k) { const v = d + k; if (so.length < SO_LUA_CHON && v >= 0 && so.indexOf(v) < 0) so.push(v); });
      so.sort(function (a, b) { return a - b; });
      ds = so.map(function (v) { return { gia_tri: v, nhan: String(v), dung: v === d }; });
    }
    goi('thaoTac', 'tro', {
      doi_tuong: 'lua_chon_du_phong', ly_do: 'cau_khong_co_lua_chon', dang: q.dang || null,
      gia_tri: ds.map(function (x) { return x.gia_tri; }), vi_tri: dsTenCot(ds.length)
    });
    return ds;
  }

  /** Câu không chơi được bằng cột (ví dụ xếp thứ tự): ghi lại, đóng câu (đảo cho quay lại sau) và sang câu khác. */
  function boQuaCau(q) {
    goi('thaoTac', 'tro', { doi_tuong: 'cau', ly_do: 'khong_choi_duoc_bang_cot', dang: q.dang || null });
    goi('hetGio');
    st.q = null;
    G.nextPieceAt = G.time + 0.2;
  }

  /** Gom các bước đổi cột liền nhau thành một lần doi_cot { tu, den, buoc }. */
  function doiCot(tu, den, cach) {
    if (!st.q || st.daKetThuc) return;
    const now = Date.now();
    if (st.gom && now - st.gom.luc < GOM_MS) { st.gom.den = den; st.gom.buoc++; st.gom.luc = now; }
    else { xaDoiCot(); st.gom = { tu: tu, den: den, buoc: 1, luc: now, cach: cach || '' }; }
    clearTimeout(st.gomHen);
    st.gomHen = setTimeout(xaDoiCot, GOM_MS);
  }
  function xaDoiCot() {
    clearTimeout(st.gomHen);
    const g = st.gom;
    st.gom = null;
    if (!g || !st.q || g.tu === g.den) return;     // đi rồi quay về đúng cột cũ: không đổi cột
    const x = st.lc[g.den];
    const du = { doi_tuong: 'khoi', tu: tenCot(g.tu), den: tenCot(g.den), vi_tri: tenCot(g.den), gia_tri: x ? x.gia_tri : null, buoc: g.buoc };
    if (g.cach) du.cach = g.cach;
    goi('thaoTac', 'doi_cot', du);
  }

  function tha(cach) {
    const p = G.piece;
    if (!st.q || !p) return;
    xaDoiCot();
    const x = st.lc[p.col];
    st.cachTha = cach || '';
    const du = { doi_tuong: 'khoi', vi_tri: tenCot(p.col), gia_tri: x ? x.gia_tri : null };
    if (cach) du.cach = cach;
    goi('thaoTac', 'tha', du);
  }

  /** Khối chạm đáy cột: trả lời bằng giá trị của cột. */
  function khoiCham(p) {
    const q = st.q;
    const x = st.lc[p.col];
    if (!q || !x) { G.piece = null; G.nextPieceAt = G.time + 0.5; return; }
    xaDoiCot();
    const them = { vi_tri: x.vi_tri, so_cot: st.lc.length, cot_dau: tenCot(st.cotDau) };
    if (st.cachTha) them.cach = st.cachTha;
    const kq = goi('traLoi', x.gia_tri, them);
    if (!kq) { G.piece = null; st.q = null; G.nextPieceAt = G.time + 0.5; return; }
    if (kq.dung) dungRoi(p, kq, x);
    else if (kq.thu_lai) thuLai(p, kq);
    else saiRoi(p, kq, x);
  }

  function dungRoi(p, kq, x) {
    const B = G.board, Sfx = window.Sfx;
    const row = M.ROWS - 1 - M.stackH(p.col);
    p.row = row;
    p.mode = 'pop';
    p.pop = M.POP_T;
    const cpos = M.tileCenter(p.col, row);
    M.spawnSparkle(cpos.x, cpos.y, B.cell * 0.5, false);
    G.correct++;
    let pts;
    if (st.goiYCap > 0) {
      pts = DIEM_GOI_Y;
      G.streak = 0;
      M.addText('Nhớ nhé: ' + (kq.dap_an_nhan || x.nhan), cpos.x, cpos.y - B.cell * 0.7, { color: '#ffe066', size: B.cell * 0.3, life: 1.5 });
    } else {
      G.streak++;
      if (G.streak > G.bestStreak) G.bestStreak = G.streak;
      const age = G.time - p.born;
      const mult = M.multiplier();
      const nhanh = age < 7 ? 50 : age < 12 ? 25 : 0;
      pts = 100 * mult + nhanh;
      const combo = G.streak % 3 === 0 && mult > 1;
      const khen = combo ? 'Combo x' + mult + '!' : PRAISE[Math.floor(Math.random() * PRAISE.length)];
      M.addText(khen, cpos.x, cpos.y - B.cell * 0.75, { color: combo ? '#ff9f1c' : '#7bf1a8', size: B.cell * 0.44, life: 1.2 });
      if (nhanh) M.addText('+' + nhanh + ' ⚡ nhanh!', cpos.x, cpos.y + B.cell * 0.1, { color: '#9af0ff', size: B.cell * 0.3, life: 1.0, vy: -40, wait: 0.4 });
      if (combo) { Sfx.play('combo'); noi('Combo nhân ' + mult + '!'); } else if (Math.random() < 0.5) noi(khen);
    }
    G.score += pts;
    M.addText('+' + pts, cpos.x, cpos.y - B.cell * 0.25, { color: '#ffe066', size: B.cell * 0.4, life: 1.0 });
    if (kq.qua_mong) M.addText('+' + kq.qua_mong + ' quả mọng', cpos.x, cpos.y + B.cell * 0.45, { color: '#ffb3f0', size: B.cell * 0.26, life: 1.3, vy: -30, wait: 0.6 });
    anGoiY();
    Sfx.play('pop');
    M.owlSay('cheer', 1.4);
    if (!M.Motion.lite) G.flash = { c: '120,255,180', a: 0.14 };
    // Dọn một viên đá của cột này; đúng 5 lần liên tiếp thì dọn sạch tháp (như khi chơi một mình)
    const col = G.cols[p.col];
    const live = col.stack.filter(function (r) { return !r.dead && r.popAt == null; });
    if (live.length) {
      M.popRubble(p.col, col.stack.indexOf(live[live.length - 1]), 0.15);
      M.addText('Dọn 1 viên đá! 🧹', cpos.x, cpos.y + B.cell * 0.9, { color: '#9af0ff', size: B.cell * 0.28, life: 1.2 });
      Sfx.play('sweep');
    }
    if (G.streak > 0 && G.streak % 5 === 0 && M.anyRubble()) {
      let d = 0.2;
      G.cols.forEach(function (c, i) { c.stack.forEach(function (r, j) { if (!r.dead && r.popAt == null) { M.popRubble(i, j, d); d += 0.07; } }); });
      M.addText('🧹 Dọn sạch tháp!', B.x + B.w / 2, B.y + B.h * 0.4, { color: '#ffd166', size: B.cell * 0.5, life: 1.6, vy: -25 });
      Sfx.play('stage');
    }
    st.ketQua = { q: st.q, dung: true, nhan: kq.dap_an_nhan || x.nhan };
    st.xong++;
    st.q = null;
    G.nextPieceAt = G.time + 0.9;
  }

  /** Dạng câu được thử lại (nhập số có 2 lần): khối bật lên, cột vừa chọn bị gạch. */
  function thuLai(p, kq) {
    p.mode = 'fall';
    p.row = -1;
    p.selected = false;
    G.cols[p.col].loaiBo = true;
    st.lanThu++;
    M.showHint(kq.loi_noi || 'Chưa đúng rồi, con thử lại nhé!', 'bad', 3200);
    window.Sfx.play('wrong');
    M.owlSay('worry', 1.6);
  }

  /** Sai hẳn: khối hóa đá, cột đúng sáng lên, rồi màn "Gần đúng rồi" của đảo. */
  function saiRoi(p, kq, x) {
    const B = G.board, Sfx = window.Sfx, q = st.q;
    const col = G.cols[p.col];
    const row = M.ROWS - 1 - M.stackH(p.col);
    col.stack.push({ t: p.t, id: ++G.idSeq, cracks: M.makeCracks(), popAt: null, dead: false, born: G.anim });
    G.piece = null;
    G.wrong++;
    G.streak = 0;
    const cpos = M.tileCenter(p.col, row);
    M.spawnDust(cpos.x, cpos.y + B.cell * 0.3, B.cell * 0.5);
    if (!M.Motion.lite) { G.shake = Math.max(G.shake, 0.4); G.flash = { c: '255,60,90', a: 0.18 }; }
    anGoiY();
    Sfx.play('land');
    Sfx.play('wrong');
    M.owlSay('worry', 2.4);
    M.addText('✗', cpos.x, cpos.y - B.cell * 0.6, { color: '#ff5c7a', size: B.cell * 0.6, life: 1.0 });
    if (st.dung >= 0 && G.cols[st.dung]) G.cols[st.dung].glow = 1;   // mũi tên "Đây!" trên cột đúng
    st.ketQua = { q: q, dung: false, nhan: kq.dap_an_nhan || '' };
    if (q) {
      st.saiTheoMa[q.ma_cau] = (st.saiTheoMa[q.ma_cau] || 0) + 1;
      if (st.saiTheoMa[q.ma_cau] <= 2) st.quayLai++;   // đảo cho câu sai quay lại tối đa 2 lần trong ván
    }
    st.cho = true;
    G.nextPieceAt = Infinity;
    setTimeout(function () {
      if (st.daKetThuc) return;
      goiHua('phanHoi', x.gia_tri, kq).then(function () {
        st.cho = false;
        st.q = null;
        st.xong++;
        if (st.daKetThuc) return;
        donThapNeuCao();
        G.nextPieceAt = G.time + 0.5;
      });
    }, CHO_PHAN_HOI_MS);
  }

  /** 💡 Gợi ý: tăng một cấp (tối đa 3). Cấp 3 gạch bớt một cột sai và ghi loai_bo. */
  function goiY() {
    const p = G.piece;
    if (!st.q || !p) return false;
    xaDoiCot();
    if (st.goiYCap >= 3) { M.showHint('💡 ' + (st.goiYCuoi || 'Con nhìn thật kỹ nhé!'), 'info', 5000); return true; }
    const them = { vi_tri_khoi: tenCot(p.col) };
    let bo = -1;
    if (st.goiYCap === 2) {
      const sai = [];
      st.lc.forEach(function (x, i) { if (i !== st.dung && !G.cols[i].loaiBo) sai.push(i); });
      if (sai.length > 1 || (sai.length === 1 && st.lc.length > 2)) {
        bo = sai[Math.floor(Math.random() * sai.length)];
        them.loai_bo = st.lc[bo].gia_tri;
        them.vi_tri_loai_bo = tenCot(bo);
      }
    }
    const r = goi('goiY', them);
    if (!r) return false;
    st.goiYCap = r.cap || st.goiYCap + 1;
    st.goiYCuoi = r.loi || '';
    if (bo >= 0) { G.cols[bo].loaiBo = true; window.Sfx.play('sweep'); }
    window.Sfx.play('hint');
    M.owlSay('worry', 3);
    M.showHint('💡 ' + (r.loi || ''), 'info', 6500);
    noi(r.loi);
    return true;
  }

  /* ---------------- Mở đầu, tạm dừng, kết thúc ---------------- */

  function an(el, b) { if (el) el.hidden = !!b; }

  function khoiDom() {
    const d = st.dom = {
      moDau: $('dao-mo-dau'), hinh: $('dao-hinh'), game: $('dao-game'), ten: $('dao-ten-man'),
      batDau: $('btn-dao-bat-dau'), veDau: $('btn-dao-ve-dau'), ve: $('btn-dao-ve'), nghe: $('btn-dao-nghe')
    };
    const nut = function (el, fn) {
      if (!el) return;
      el.addEventListener('click', function (e) { try { window.Sfx.unlock(); window.Sfx.play('click'); } catch (e2) { /* bỏ qua */ } fn(e); });
    };
    nut(d.batDau, batDauChoi);
    nut(d.veDau, function () { veDao(); });
    nut(d.ve, function () { veDao(); });
    nut(d.nghe, ngheLai);
    an(d.ve, false);
    return d;
  }

  function hienMoDau(tt) {
    const d = st.dom;
    const man = (tt && tt.man) || {};
    const be = (tt && tt.be) || {};
    if (d.ten) d.ten.textContent = man.ten || 'Tháp Xếp Hình';
    if (d.game) d.game.textContent = [(tt && tt.ten_game) || 'Tháp Xếp Hình', man.bai].filter(Boolean).join(' · ');
    if (d.hinh) {
      d.hinh.innerHTML = '';
      const logo = document.querySelector('#menu .logo-bob svg');
      if (logo && logo.cloneNode) { const l = logo.cloneNode(true); l.setAttribute('class', 'dao-logo'); d.hinh.appendChild(l); }
      if (be.hinh_co_vu || be.hinh) {
        const img = document.createElement('img');
        img.className = 'dao-be';
        img.alt = be.ten_khung_long ? 'Khủng long ' + be.ten_khung_long : '';
        img.src = be.hinh_co_vu || be.hinh;
        d.hinh.appendChild(img);
      }
    }
    if (d.moDau) d.moDau.classList.remove('hidden');
    setTimeout(function () { try { d.batDau.focus(); } catch (e) { /* bỏ qua */ } }, 60);
  }

  function taiAnhBe(be) {
    const nap = function (k, u) { if (!u) return; const img = new Image(); img.src = u; st.anhBe[k] = img; };
    nap('thuong', be.hinh);
    nap('co_vu', be.hinh_co_vu);
    nap('goi_y', be.hinh_goi_y);
  }

  function batDauChoi() {
    if (st.daBatDau || st.daKetThuc) return;
    st.daBatDau = true;
    const tt = st.info || {};
    const man = tt.man || {};
    st.tong = Math.max(1, Number(man.so_cau) || 10);
    if (st.dom && st.dom.moDau) st.dom.moDau.classList.add('hidden');
    an(st.dom && st.dom.nghe, false);
    goi('batDau', { so_cot: SO_LUA_CHON, so_hang: SO_HANG, giay_roi: GIAY_ROI, khong_het_gio: true, khong_thua: true });
    const ten = man.ten || 'Tháp Xếp Hình';
    const ngan = ten.length <= 16 ? ten : '🧱 ' + (ten.indexOf(':') > 0 ? ten.slice(ten.indexOf(':') + 1).trim() : ten.slice(0, 14) + '…');
    M.startLevel({
      n: 0, id: 'dao', dao: true, title: ten, ngan: ngan, icon: '🦕', grade: 2, goal: st.tong, fall: GIAY_ROI,
      style: 'dao', ring: null, keyMode: 'x', gen: null, lesson: null
    });
  }

  function ngheLai() {
    const q = st.qThe;
    if (!q || st.daKetThuc) return;
    if (st.q === q) goi('thaoTac', 'nghe_lai', { doi_tuong: 'de' });
    noi(q.de_doc || q.de);
  }

  function hetCau() {
    if (st.het) return;
    st.het = true;
    st.q = null;
    M.levelClear();
  }

  /** game.js gọi khi hiệu ứng "HOÀN THÀNH!" xong: báo đảo kết thúc ván (đảo hiện màn kết thúc riêng). */
  function hetVan() {
    if (st.daKetThuc) return;
    st.daKetThuc = true;
    xaDoiCot();
    try { window.Music.stop(); } catch (e) { /* bỏ qua */ }
    M.releaseWake();
    const dong = 'Được ' + M.fmt(G.score) + ' điểm, xếp đúng ' + G.correct + ' khối';
    goiHua('ketThuc', { diem: G.score, dong_phu: dong, so_khoi_dung: G.correct, so_khoi_sai: G.wrong, chuoi_dung_dai_nhat: G.bestStreak });
  }

  function veDao() {
    if (st.daKetThuc) return;
    st.daKetThuc = true;
    xaDoiCot();
    try { window.Music.stop(); window.Voice.stop(); } catch (e) { /* bỏ qua */ }
    M.releaseWake();
    goiHua('veDao', { diem: G ? G.score : 0 });
  }

  function tienDo() {
    return { xong: st.xong, tong: Math.max(st.tong + st.quayLai, st.xong + (st.q ? 1 : 0)) };
  }

  function dongTamDung() {
    const td = tienDo();
    return ((G.level && G.level.title) || 'Tháp Xếp Hình') + ' · Điểm: ' + M.fmt(G.score) + ' · Đã xong ' + td.xong + '/' + td.tong + ' câu';
  }

  /* ---------------- API cho game.js ---------------- */

  window.ThapDao = {
    bat: true,
    SO_HANG: SO_HANG,
    HE_SO_DIA: HE_SO_DIA,
    CAO_LO_LUNG: CAO_LO_LUNG,
    /** Khởi động (game.js gọi trong boot): nhận bộ máy, báo đảo sẵn sàng, hiện thẻ mở đầu. */
    ganMay: function (may) {
      M = may; G = may.G;
      try { document.documentElement.classList.add('dao'); } catch (e) { /* bỏ qua */ }
      khoiDom();
      const tt = goi('sanSang');
      st.info = tt || null;
      apDungAmThanh(tt);
      taiAnhBe((tt && tt.be) || {});
      hienMoDau(tt);
    },
    khoiCot: function () { taoCot(M.soCot()); doNhan(); },
    khoiMoi: khoiMoi,
    doiCot: doiCot,
    tha: tha,
    khoiCham: khoiCham,
    goiY: goiY,
    tamDung: function (nguon) { xaDoiCot(); if (!st.daKetThuc) goi('tamDung', nguon || 'nut'); },
    tiepTuc: function (nguon) { if (!st.daKetThuc) goi('tiepTuc', nguon || 'nut'); },
    dongTamDung: dongTamDung,
    hetVan: hetVan,
    tienDo: tienDo,
    veKhoi: veKhoi,
    veNhan: veNhan,
    doNhan: doNhan,
    veThe: veThe,
    veBan: veBan,
    noi: noi,
    loi: function (msg) { ghiLoi('game', msg); try { M.toast('Có lỗi nhỏ, con chơi tiếp nhé! 🙏', 2200); } catch (e) { /* bỏ qua */ } },
    batDauChoi: batDauChoi,
    veDao: veDao,
    _trangThai: function () { return st; }
  };
})();
