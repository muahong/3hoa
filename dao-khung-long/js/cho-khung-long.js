/* ============================================================
   cho-khung-long.js – Game Chợ Khủng Long (vùng 9, SGK Toán 2 Bài 56 "Giới thiệu tiền Việt Nam")
   - Quầy hàng: người bán Mỏ Vịt Long có bóng lời thoại, món hàng có thẻ giá, khay tiền trên quầy, ví của bé ở dưới.
   - Bé kéo tờ tiền từ ví vào khay (và kéo ra lại), hoặc chạm một tờ để chuyển; khay hiện "Đã trả: 700 đồng";
     bấm "Trả tiền" để chấm (chấm theo tổng tiền, được sửa một lần).
   - Chế độ của màn (man.che_do): nhan_biet (đưa đúng tờ, đọc tờ, tờ lớn nhất, đếm tờ trong đống tiền, được mấy tờ 100),
     tra_tien, doi_tien (được mấy tờ, xếp các tờ lẻ cho đủ), nguoi_ban (bé là người bán: khách đưa tiền, bé lấy tiền thừa
     trong ngăn kéo trả lại), tron (cúp). Bàn chơi chọn theo kiểu của từng câu nên cúp trộn được mọi kiểu.
   - Ghi: keo (kéo tờ vào khay), dat (chạm tờ vào khay), bo_ra (lấy tờ ra khỏi khay), mỗi lần kèm mệnh giá, tổng trong
     khay và số tờ; chon (tờ hoặc nút đáp án); dem, bo_chon (đánh dấu, bỏ đánh dấu tờ trong đống tiền);
     tra_loi kèm { to_tien, tong, can, chenh } (chenh = tong − can, âm là trả thiếu).
   - Gợi ý cấp 3: gạch một lựa chọn sai (ghi loai_bo) hoặc làm sáng các tờ nên dùng (ghi to_goi_y).
   - Tờ tiền là hình SVG đơn giản của cau-tien.js (số, chữ ĐỒNG, màu gần tờ thật), không chép tờ tiền thật.
   - Bài học 30 giây: tien-viet-nam (Bài 56) và tien-thua (mở rộng: đếm thêm để trả lại tiền thừa).
   API: window.ChoKhungLong = { batDau(o), _trangThai() }
   ============================================================ */
(function () {
  'use strict';

  const NGAN = [100, 200, 500, 1000]; // thứ tự các ngăn trong ví, từ trái sang phải
  const KHAY_TOI_DA = 12;
  const NGUONG_KEO = 8; // px: di chuyển quá mức này thì là kéo, không phải chạm
  const TRANG_TRI = ['🍬', '🥖', '🍦', '✏️', '📒', '🎈', '🍎', '🍌', '🥛', '🍭', '🍪', '🌽', '🍊'];

  let s = null;
  let dom = null;
  let keo = null; // thao tác kéo đang dở

  function K() { return window.KhungChoi; }
  function NH() { return window.NganHang; }
  function AT() { return window.AmThanh; }
  function CT() { return window.CauTien; }
  function esc(t) { return window.PhanHoi.esc(t); }
  function demLoai(ds, x) { let n = 0; ds.forEach(function (y) { if (y === x) n++; }); return n; }
  function pct(x) { return Math.round(x * 1000) / 10 + '%'; }
  function trong(el, x, y) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }
  function rung(el) { if (!el) return; el.classList.remove('rung'); void el.offsetWidth; el.classList.add('rung'); }
  /** Hẹn giờ gắn với ván đang chơi: bé thoát rồi vào ván khác thì hẹn giờ cũ không chạy. */
  function hen(fn, ms) {
    const phien = s;
    return setTimeout(function () { if (s && s === phien) fn(); }, ms);
  }

  const HTML =
    '<div class="ck-quay" id="ck-quay">' +
      '<div class="ck-ke" id="ck-ke"></div>' +
      '<div class="ck-nguoi" id="ck-nguoi"><p class="ck-bong" id="ck-bong" role="status"></p><img class="ck-nguoi-hinh" id="ck-nguoi-hinh" alt="" draggable="false"></div>' +
      '<div class="ck-ban" id="ck-ban">' +
        '<div class="ck-khay trong" id="ck-khay"><div class="ck-khay-to" id="ck-khay-to"></div><span class="ck-khay-goi" id="ck-khay-goi"></span></div>' +
        '<div class="ck-tong" id="ck-tong" aria-live="polite"></div>' +
      '</div>' +
      '<div class="ck-dung hidden" id="ck-dung" role="status"><b id="ck-dung-to"></b><span id="ck-dung-nho"></span></div>' +
    '</div>' +
    '<div class="ck-duoi" id="ck-duoi">' +
      '<div class="ck-vi" id="ck-vi"><span class="ck-vi-nhan" id="ck-vi-nhan">VÍ CỦA CON</span><div class="ck-ngan" id="ck-ngan"></div>' +
        '<button type="button" class="nut nut-cam ck-nut-tra" id="ck-tra" disabled>Trả tiền</button></div>' +
      '<div class="ck-chon hidden" id="ck-chon"></div>' +
    '</div>';

  function khoiDom() {
    if (dom) return dom;
    let san = document.getElementById('ck-san');
    if (!san) {
      san = document.createElement('div');
      san.className = 'kc-game ck-san hidden';
      san.id = 'ck-san';
      san.innerHTML = HTML;
      K().san().appendChild(san);
    }
    const $ = function (id) { return document.getElementById(id); };
    dom = {
      san: san, quay: $('ck-quay'), ke: $('ck-ke'), nguoi: $('ck-nguoi'), bong: $('ck-bong'), hinh: $('ck-nguoi-hinh'),
      ban: $('ck-ban'), khay: $('ck-khay'), khayTo: $('ck-khay-to'), khayGoi: $('ck-khay-goi'), tong: $('ck-tong'),
      dung: $('ck-dung'), dungTo: $('ck-dung-to'), dungNho: $('ck-dung-nho'),
      duoi: $('ck-duoi'), vi: $('ck-vi'), viNhan: $('ck-vi-nhan'), ngan: $('ck-ngan'), tra: $('ck-tra'), chon: $('ck-chon')
    };
    san.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', function (e) { if (keo && e.pointerId === keo.id) huyKeo(); });
    san.addEventListener('click', onClick);
    san.addEventListener('dragstart', function (e) { e.preventDefault(); });
    return dom;
  }

  /**
   * o: { van, man, che_do, nen, phu, hinhGoiY, hinhBe, anh(ten), xemBaiHoc, onXong(kq), onThoat(kq) } (xem vaoMan trong app.js)
   */
  function batDau(o) {
    khoiDom();
    huyKeo();
    dom.san.classList.remove('hidden');
    s = { o: o, van: o.van, q: null, ct: null, ban: null, khay: [], kho: null, khoa: false, dung: 0, chuoi: 0, danhDau: [], loaiBo: {}, goiYTo: null, hengio: null };
    K().mo({
      van: o.van, game: 'cho-khung-long', tenGame: 'Chợ Khủng Long', nen: o.nen, phu: o.phu, hinhGoiY: o.hinhGoiY,
      onGoiY: goiY, onThoat: thoat, xemBaiHoc: o.xemBaiHoc, onPhim: phim, onTamDung: huyKeo
    });
    s.van.batDau({ che_do: o.che_do || (o.man && o.man.che_do) || null });
    cauMoi();
  }

  /** Bàn chơi của câu: tra, doi, thua (kéo tiền vào khay), dua_to (đưa một tờ), nut (nút đáp án). */
  function loaiBan(q) {
    const k = q.cau_truc.kieu;
    if (q.dang === 'keo_tha' && (k === 'tra' || k === 'doi' || k === 'thua')) return k;
    if (q.dang === 'chon_dap_an' && (k === 'chon_to' || k === 'lon_nhat' || k === 'be_nhat')) return 'dua_to';
    return 'nut';
  }

  /** Số tờ mỗi loại trong ví (trả tiền), hộp tiền lẻ (đổi tiền), ngăn kéo (bé là người bán). */
  function taoKho(q) {
    const ct = q.cau_truc;
    if (s.ban === 'tra') return CT().soLuongVi(ct.vi);
    if (s.ban === 'doi') return ct.tu === 1000 ? { 500: 2, 200: 6, 100: 10 } : ct.tu === 500 ? { 200: 3, 100: 6 } : { 100: 3 };
    if (s.ban === 'thua') return ct.dua === 1000 ? { 500: 1, 200: 4, 100: 9 } : { 200: 2, 100: 5 };
    return null;
  }
  function conLai(g) { return s.kho ? (s.kho[g] || 0) - demLoai(s.khay, g) : s.khay.indexOf(g) >= 0 ? 0 : 1; }
  function tenKho() { return s.ban === 'doi' ? 'hop_tien_le' : s.ban === 'thua' ? 'ngan_keo' : 'vi'; }

  function cauMoi() {
    if (!s) return;
    clearTimeout(s.hengio);
    huyKeo();
    dom.dung.classList.add('hidden');
    if (!s.van.conCau()) { ketThuc(); return; }
    const q = s.van.cauTiep();
    s.q = q;
    s.ct = q.cau_truc;
    s.ban = loaiBan(q);
    s.khay = [];
    s.danhDau = [];
    s.loaiBo = {};
    s.goiYTo = null;
    s.khoa = false;
    s.kho = taoKho(q);
    dom.khay.classList.remove('dung', 'sai');
    K().anGoiY();
    K().de(q.de, q.de_doc, { nay: true, docNgay: true });
    K().tienDo();
    veCanh(true);
  }

  /* ---------------- Vẽ ---------------- */

  function loiMoi(ct) {
    const C = CT(), k = ct.kieu;
    if (k === 'chon_to') return 'Con đưa cô tờ ' + (ct.goi === 'so' ? C.dong(ct.gia) : C.docTien(ct.gia)) + ' nhé!';
    if (k === 'doc_to') return 'Tờ tiền cô đang cầm là bao nhiêu đồng nhỉ?';
    if (k === 'lon_nhat' || k === 'be_nhat') return 'Con đưa cô tờ tiền có giá trị ' + (k === 'lon_nhat' ? 'lớn' : 'bé') + ' nhất nhé!';
    if (k === 'dem_loai') return 'Cô đếm mãi chưa xong. Có mấy tờ ' + C.dong(ct.gia) + ' hả con?';
    if (k === 'may_to') return 'Tờ ' + C.dong(ct.tu) + ' đổi được mấy tờ ' + C.dong(ct.sang) + ' nhỉ?';
    if (k === 'tra') return C.hoa(C.monCua(ct.mon).ten) + ' giá ' + C.dong(ct.gia) + ' nhé! Con trả bằng những tờ nào?';
    if (k === 'doi') return 'Cô cần tiền lẻ. Con đổi giúp cô tờ ' + C.dong(ct.tu) + (ct.sang ? ' thành các tờ ' + C.dong(ct.sang) : ' thành các tờ nhỏ hơn') + ' nhé!';
    if (k === 'thua') return 'Cho mình ' + C.monCua(ct.mon).ten + '. Mình gửi tờ ' + C.dong(ct.dua) + ' nhé!';
    return '';
  }
  function loiBong(t, loai) {
    dom.bong.textContent = t;
    dom.bong.classList.toggle('sai', loai === 'sai');
    dom.bong.classList.toggle('dung', loai === 'dung');
    dom.bong.classList.remove('nay');
    void dom.bong.offsetWidth;
    dom.bong.classList.add('nay');
  }

  function veCanh(moi) {
    const ct = s.ct;
    dom.san.setAttribute('data-ban', s.ban);
    dom.san.setAttribute('data-kieu', ct.kieu);
    const khach = ct.kieu === 'thua';
    const hinh = s.o.anh ? s.o.anh(khach ? (ct.khach || 'sp-toc-long') : 'sp-mo-vit-long') : '';
    if (dom.hinh.getAttribute('src') !== hinh) dom.hinh.setAttribute('src', hinh);
    dom.hinh.alt = khach ? 'Khách mua hàng' : 'Mỏ Vịt Long bán hàng';
    dom.nguoi.classList.toggle('khach', khach);
    loiBong(loiMoi(ct));
    dom.ke.innerHTML = veKe(ct);
    if (moi) { dom.ke.classList.remove('moi'); void dom.ke.offsetWidth; dom.ke.classList.add('moi'); }
    veKhay();
    veDuoi();
  }

  function theMon(ct) {
    const C = CT(), m = C.monCua(ct.mon);
    return '<div class="ck-mon"><span class="ck-mon-hinh" aria-hidden="true">' + m.hinh + '</span><span class="ck-mon-ten">' + esc(C.hoa(m.ten)) + '</span>' +
      '<span class="ck-the-gia"><i aria-hidden="true"></i>' + esc(C.dong(ct.gia)) + '</span></div>';
  }

  function keTrangTri() {
    const i = (s.q && s.q.stt) || 0;
    const ds = [];
    for (let j = 0; j < 8; j++) ds.push(TRANG_TRI[(i * 3 + j * 5) % TRANG_TRI.length]);
    return '<div class="ck-ke-go" aria-hidden="true"><div class="ck-ke-tang">' + ds.slice(0, 4).map(function (x) { return '<span>' + x + '</span>'; }).join('') +
      '</div><div class="ck-ke-tang">' + ds.slice(4).map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div></div>';
  }

  function veDong(ct) {
    const C = CT();
    return '<div class="ck-dong">' + C.viTriDong(ct.dong).map(function (p, i) {
      const so = s.danhDau.indexOf(i);
      return '<button type="button" class="ck-dong-to' + (so >= 0 ? ' danh-dau' : '') + '" data-dem="' + i + '" style="left:' + pct(p.x) + ';top:' + pct(p.y) + ';--xoay:' + p.xoay + 'deg"' +
        ' aria-label="Tờ ' + esc(C.dong(p.gia)) + (so >= 0 ? ', đã đếm ' + (so + 1) : '') + '">' + C.veTo(p.gia) +
        (so >= 0 ? '<b class="ck-dem-so">' + (so + 1) + '</b>' : '') + '</button>';
    }).join('') + '</div>';
  }

  function veKe(ct) {
    const C = CT(), k = ct.kieu;
    if (k === 'tra') return theMon(ct);
    if (k === 'thua') return theMon(ct) + '<div class="ck-khach-dua"><b>Khách đưa</b>' + C.veTo(ct.dua, 'ck-to-lon') + '</div>';
    if (k === 'doi' || k === 'may_to') {
      const phai = ct.sang ? C.veTo(ct.sang, 'ck-to-vua') : '<span class="ck-doi-nho">' + C.toNho(ct.tu).map(function (g) { return C.veTo(g, 'ck-to-nho'); }).join('') + '</span>';
      return '<div class="ck-doi"><div class="ck-doi-o">' + C.veTo(ct.tu, 'ck-to-lon') + '<b>' + (k === 'doi' ? 'Tờ cần đổi' : '1 tờ') + '</b></div>' +
        '<span class="ck-dau" aria-hidden="true">' + (k === 'may_to' ? '=' : '→') + '</span>' +
        '<div class="ck-doi-o">' + phai + '<b>' + (k === 'may_to' ? '? tờ' : ct.sang ? 'các tờ ' + esc(C.dong(ct.sang)) : 'các tờ nhỏ hơn') + '</b></div></div>';
    }
    if (k === 'doc_to') return '<div class="ck-cam-to">' + C.veTo(ct.gia, 'ck-to-to') + '<span class="ck-hoi" aria-hidden="true">?</span></div>';
    if (k === 'dem_loai') return veDong(ct);
    return keTrangTri();
  }

  function goiKhay() {
    if (s.ban === 'dua_to') return 'Đưa một tờ vào khay';
    if (s.ban === 'doi') return 'Xếp tiền lẻ vào khay';
    if (s.ban === 'thua') return 'Kéo tiền thừa vào khay';
    return 'Kéo tiền vào khay';
  }
  function nhanTong() { return s.ban === 'doi' ? 'Đã đổi: ' : s.ban === 'thua' ? 'Trả lại: ' : 'Đã trả: '; }

  function veKhay() {
    const C = CT();
    const n = s.khay.length;
    dom.khayTo.className = 'ck-khay-to' + (n > 7 ? ' rat-dong' : n > 4 ? ' dong' : '');
    dom.khayTo.innerHTML = s.khay.map(function (g, i) {
      return '<button type="button" class="ck-to ck-to-khay' + (i === s.moi ? ' vua-dat' : '') + '" data-to="' + g + '" data-nguon="khay" data-i="' + i + '"' +
        ' aria-label="Tờ ' + esc(C.dong(g)) + ' trong khay, chạm để lấy ra">' + C.veTo(g) + '</button>';
    }).join('');
    s.moi = null;
    dom.khay.classList.toggle('trong', !n);
    dom.khayGoi.textContent = n ? '' : goiKhay();
    dom.tong.textContent = nhanTong() + C.dong(C.tong(s.khay));
    dom.tong.classList.toggle('hidden', s.ban === 'nut' || s.ban === 'dua_to');
    dom.tra.disabled = !n || s.khoa;
  }

  function veDuoi() {
    const C = CT();
    const nut = s.ban === 'nut';
    dom.vi.classList.toggle('hidden', nut);
    dom.chon.classList.toggle('hidden', !nut);
    if (nut) { veChon(); return; }
    dom.viNhan.textContent = s.ban === 'doi' ? 'HỘP TIỀN LẺ' : s.ban === 'thua' ? 'NGĂN KÉO TIỀN CỦA CON' : 'VÍ CỦA CON';
    dom.tra.textContent = s.ban === 'doi' ? 'Đổi xong' : s.ban === 'thua' ? 'Trả lại khách' : 'Trả tiền';
    dom.tra.classList.toggle('hidden', s.ban === 'dua_to');
    let ngan;
    if (s.ban === 'dua_to') ngan = (s.q.lua_chon || []).map(function (x) { const g = Number(x.gia_tri); return { g: g, con: conLai(g), bo: !!s.loaiBo[String(g)] }; });
    else ngan = NGAN.filter(function (g) { return s.kho[g] != null && (s.ban === 'tra' || s.kho[g] > 0); }).map(function (g) { return { g: g, con: conLai(g), bo: false }; });
    dom.ngan.setAttribute('data-so', ngan.length);
    dom.ngan.innerHTML = ngan.map(function (x, i) {
      const co = x.con > 0 && !x.bo;
      const lop = ['ck-ngan-o'];
      if (!co) lop.push('het');
      if (x.bo) lop.push('ck-bo');
      if (s.goiYTo && s.goiYTo.indexOf(x.g) >= 0 && co) lop.push('goi');
      let h = '<div class="' + lop.join(' ') + '" data-o="' + (i + 1) + '">';
      if (x.con > 2) h += '<span class="ck-chong c2" aria-hidden="true">' + C.veTo(x.g) + '</span>';
      if (x.con > 1) h += '<span class="ck-chong c1" aria-hidden="true">' + C.veTo(x.g) + '</span>';
      h += co ? '<button type="button" class="ck-to ck-to-vi" data-to="' + x.g + '" data-nguon="vi" aria-label="Tờ ' + esc(C.dong(x.g)) + (s.ban !== 'dua_to' ? ', còn ' + x.con + ' tờ' : '') + '">' + C.veTo(x.g) + '</button>'
        : '<span class="ck-to-rong" aria-label="Hết tờ ' + esc(C.dong(x.g)) + '">' + C.veTo(x.g) + '</span>';
      if (s.ban !== 'dua_to') h += '<b class="ck-dem" aria-hidden="true">×' + Math.max(0, x.con) + '</b>';
      return h + '</div>';
    }).join('');
  }

  function veChon() {
    const q = s.q, ct = s.ct;
    dom.chon.innerHTML = (q.lua_chon || []).map(function (x, i) {
      const v = x.gia_tri;
      const r = NH().veLuaChon(ct, v) || {};
      const bo = !!s.loaiBo[String(v)];
      const coHinh = r.hinh && (ct.kieu === 'tra' || ct.kieu === 'doi');
      const lop = 'ck-nut-chon' + (bo ? ' gach' : '') + (coHinh ? ' co-hinh' : '') + (x.dung ? ' dung' : '') + (x.sai ? ' sai' : '');
      return '<button type="button" class="' + lop + '" data-chon="' + i + '"' + (bo ? ' disabled' : '') + ' aria-label="' + esc(NH().hienGiaTriCau(ct, v)) + '">' +
        (coHinh ? '<span class="ck-chon-hinh">' + r.hinh + '</span>' : '') + '<b>' + esc(r.nhan || NH().hienGiaTriCau(ct, v)) + '</b></button>';
    }).join('');
  }

  /* ---------------- Kéo thả (Pointer Events, chạm được bằng ngón tay) ---------------- */

  function onDown(e) {
    if (!s || !s.q || (e.button != null && e.button > 0)) return;
    const el = e.target.closest('.ck-to[data-to]');
    if (!el || s.khoa || K().dangKhoa()) return;
    e.preventDefault();
    huyKeo();
    keo = {
      el: el, id: e.pointerId, x0: e.clientX, y0: e.clientY, bay: null,
      gia: Number(el.getAttribute('data-to')), nguon: el.getAttribute('data-nguon'), i: Number(el.getAttribute('data-i'))
    };
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* bỏ qua */ }
  }

  function batDauBay(e) {
    const r = keo.el.getBoundingClientRect();
    const bay = document.createElement('div');
    bay.className = 'ck-to-bay';
    bay.setAttribute('aria-hidden', 'true');
    bay.innerHTML = CT().veTo(keo.gia);
    bay.style.width = Math.round(r.width) + 'px';
    keo.ox = keo.x0 - r.left;
    keo.oy = keo.y0 - r.top;
    dom.san.appendChild(bay);
    keo.bay = bay;
    keo.el.classList.add('dang-keo');
    AT().bat('cham');
  }

  function onMove(e) {
    if (!keo || e.pointerId !== keo.id) return;
    if (!s || K().dangKhoa()) { huyKeo(); return; }
    if (!keo.bay) {
      if (Math.hypot(e.clientX - keo.x0, e.clientY - keo.y0) < NGUONG_KEO) return;
      batDauBay(e);
    }
    e.preventDefault();
    keo.bay.style.transform = 'translate(' + Math.round(e.clientX - keo.ox) + 'px,' + Math.round(e.clientY - keo.oy) + 'px) rotate(-4deg) scale(1.06)';
    const vung = vungTha(e.clientX, e.clientY);
    dom.ban.classList.toggle('ck-nhan', vung === 'khay' && keo.nguon === 'vi');
    dom.vi.classList.toggle('ck-nhan', vung === 'vi' && keo.nguon === 'khay');
  }

  function onUp(e) {
    if (!keo || e.pointerId !== keo.id) return;
    const k = keo;
    keo = null;
    try { k.el.releasePointerCapture(k.id); } catch (err) { /* bỏ qua */ }
    dom.ban.classList.remove('ck-nhan');
    dom.vi.classList.remove('ck-nhan');
    if (k.bay) {
      k.bay.remove();
      k.el.classList.remove('dang-keo');
      const vung = vungTha(e.clientX, e.clientY);
      if (k.nguon === 'vi' && vung === 'khay') vaoKhay(k.gia, 'keo');
      else if (k.nguon === 'khay' && vung === 'vi') raKhay(k.i, 'keo');
      return; // thả chỗ khác: tờ tiền về chỗ cũ
    }
    if (k.nguon === 'vi') vaoKhay(k.gia, 'cham');
    else raKhay(k.i, 'cham');
  }

  function huyKeo() {
    if (!keo) return;
    if (keo.bay) keo.bay.remove();
    keo.el.classList.remove('dang-keo');
    if (dom) { dom.ban.classList.remove('ck-nhan'); dom.vi.classList.remove('ck-nhan'); }
    keo = null;
  }

  /** Thả vào quầy (cả khung trên) là vào khay; thả vào ví (khung dưới) là cất lại. */
  function vungTha(x, y) {
    if (trong(dom.quay, x, y)) return 'khay';
    if (trong(dom.duoi, x, y)) return 'vi';
    return null;
  }

  function onClick(e) {
    if (!s || !s.q) return;
    const to = e.target.closest('.ck-to[data-to]');
    if (to) {
      // chạm bằng tay đã xử lý ở pointerup; chỉ nhận Enter, Space từ bàn phím (detail = 0)
      if (e.detail === 0) {
        if (to.getAttribute('data-nguon') === 'vi') vaoKhay(Number(to.getAttribute('data-to')), 'cham');
        else raKhay(Number(to.getAttribute('data-i')), 'cham');
      }
      return;
    }
    const c = e.target.closest('[data-chon]');
    if (c) { chonNut(Number(c.getAttribute('data-chon'))); return; }
    const d = e.target.closest('[data-dem]');
    if (d) { danhDau(Number(d.getAttribute('data-dem'))); return; }
    if (e.target.closest('#ck-tra')) nop();
  }

  /* ---------------- Thao tác ---------------- */

  function vaoKhay(gia, cach) {
    if (!s || !s.q || s.khoa || K().dangKhoa()) return;
    if (s.ban === 'dua_to') { duaTo(gia, cach); return; }
    if (s.ban === 'nut' || conLai(gia) <= 0) return;
    if (s.khay.length >= KHAY_TOI_DA) { K().bao('Khay đầy rồi, con lấy bớt tiền ra nhé'); return; }
    s.khay.push(gia);
    s.moi = s.khay.length - 1;
    AT().bat('go_phim');
    s.van.thaoTac(cach === 'keo' ? 'keo' : 'dat', { doi_tuong: 'to_tien', gia_tri: gia, tu: tenKho(), den: 'khay', tong: CT().tong(s.khay), so_to: s.khay.length });
    dom.khay.classList.remove('sai');
    veKhay();
    veDuoi();
  }

  function raKhay(i, cach) {
    if (!s || !s.q || s.khoa || K().dangKhoa() || s.ban === 'dua_to') return;
    if (!(i >= 0 && i < s.khay.length)) return;
    const gia = s.khay.splice(i, 1)[0];
    AT().bat('cham');
    s.van.thaoTac('bo_ra', { doi_tuong: 'to_tien', gia_tri: gia, tu: 'khay', den: tenKho(), tong: CT().tong(s.khay), so_to: s.khay.length, cach: cach });
    dom.khay.classList.remove('sai');
    veKhay();
    veDuoi();
  }

  /** Đưa một tờ (chọn tờ đúng, tờ lớn nhất…): tờ vào khay là chốt đáp án. */
  function duaTo(gia, cach) {
    if (s.loaiBo[String(gia)] || conLai(gia) <= 0) return;
    const i = (s.q.lua_chon || []).findIndex(function (x) { return Number(x.gia_tri) === gia; });
    const viTri = 'ngan_' + (i + 1);
    s.khoa = true;
    s.khay = [gia];
    s.moi = 0;
    AT().bat('go_phim');
    veKhay();
    veDuoi();
    s.van.thaoTac('chon', { doi_tuong: 'to_tien', gia_tri: gia, vi_tri: viTri, cach: cach });
    xuLy(s.van.traLoi(gia, { vi_tri: viTri, to_tien: [gia], tong: gia }), gia);
  }

  function chonNut(i) {
    if (!s || !s.q || s.khoa || K().dangKhoa() || s.ban !== 'nut') return;
    const x = (s.q.lua_chon || [])[i];
    if (!x || s.loaiBo[String(x.gia_tri)]) return;
    s.khoa = true;
    const v = x.gia_tri;
    const viTri = 'nut_' + (i + 1);
    s.van.thaoTac('chon', { doi_tuong: 'nut_dap_an', gia_tri: v, vi_tri: viTri });
    const extra = { vi_tri: viTri };
    if (s.ct.kieu === 'dem_loai') extra.so_to_da_danh_dau = s.danhDau.length;
    const kq = s.van.traLoi(v, extra);
    if (kq) { if (kq.dung) x.dung = true; else x.sai = true; veChon(); }
    xuLy(kq, v);
  }

  function danhDau(i) {
    if (!s || !s.q || s.khoa || K().dangKhoa() || s.ct.kieu !== 'dem_loai') return;
    const gia = s.ct.dong[i];
    if (gia == null) return;
    const j = s.danhDau.indexOf(i);
    if (j >= 0) {
      s.danhDau.splice(j, 1);
      AT().bat('cham');
      s.van.thaoTac('bo_chon', { doi_tuong: 'to_tien', gia_tri: gia, vi_tri: 'to_' + (i + 1), so_da_dem: s.danhDau.length });
    } else {
      s.danhDau.push(i);
      AT().bat('go_phim');
      s.van.thaoTac('dem', { doi_tuong: 'to_tien', gia_tri: gia, vi_tri: 'to_' + (i + 1), so_da_dem: s.danhDau.length });
    }
    dom.ke.innerHTML = veDong(s.ct);
  }

  /** Bấm Trả tiền, Đổi xong, Trả lại khách: chấm theo tổng tiền trong khay. */
  function nop() {
    if (!s || !s.q || s.khoa || K().dangKhoa() || !s.khay.length || s.ban === 'dua_to' || s.ban === 'nut') return;
    const C = CT();
    const ds = C.docTo(s.khay);
    const t = C.tong(ds), can = C.canCua(s.ct);
    const v = ds.join(',');
    xuLy(s.van.traLoi(v, { to_tien: ds, tong: t, can: can, chenh: t - can, so_to: ds.length }), v);
  }

  function xuLy(kq, v) {
    if (!kq) return;
    if (kq.dung) { ghiDung(kq, v); return; }
    AT().bat('sai');
    if (kq.thuLai) {
      s.khoa = false;
      dom.khay.classList.add('sai');
      rung(dom.khay);
      // lời nhắn nằm trong bóng thoại của người bán (khách) để không che thẻ giá bé đang cần nhìn
      loiBong(kq.loiNoi + (s.ct.kieu === 'thua' ? '. Bạn sửa lại giúp mình nhé!' : '. Con sửa lại nhé!'), 'sai');
      AT().doc(kq.loiNoi);
      veKhay();
      return;
    }
    s.khoa = true;
    dom.khay.classList.add('sai');
    if (s.ban !== 'nut') rung(dom.khay);
    veKhay();
    const moDau = s.ban === 'tra' ? 'Con trả' : s.ban === 'doi' ? 'Con đổi được' : s.ban === 'thua' ? 'Con trả lại' : s.ban === 'dua_to' ? 'Con đưa' : 'Con chọn';
    const chonHien = (s.ban === 'dua_to' ? 'tờ ' : '') + NH().hienGiaTriCau(s.ct, v);
    const q = s.q;
    hen(function () {
      K().phanHoiCau(q, v, Object.assign({}, kq, { moDau: moDau, chonHien: chonHien }), function () { cauMoi(); });
    }, 650);
  }

  /** Câu chúc mừng khi đúng: dòng to và dòng nhỏ, câu để đọc (số đọc bằng chữ). */
  function noiDungDung(v) {
    const C = CT(), ct = s.ct, k = ct.kieu;
    if (k === 'tra' || k === 'doi' || k === 'thua') {
      const ds = C.docTo(v), t = C.tong(ds);
      if (k === 'tra') return { to: (ds.length > 1 ? C.nhanBoTo(ds) + ' = ' : '') + C.dong(t), nho: 'Vừa đủ tiền rồi!', doc: 'Vừa đủ ' + C.docTien(t) };
      if (k === 'doi') return { to: C.dong(ct.tu) + ' = ' + C.nhanBoTo(ds), nho: 'Đổi đúng rồi!', doc: 'Đổi đúng rồi' };
      return { to: C.soTien(ct.dua) + ' − ' + C.soTien(ct.gia) + ' = ' + C.dong(t), nho: 'Trả lại đúng tiền thừa!', doc: 'Trả lại ' + C.docTien(t) };
    }
    const d = NH().tinh(ct);
    if (k === 'chon_to' || k === 'doc_to') return { to: C.dong(ct.gia), nho: C.hoa(C.docTien(ct.gia)), doc: C.docTien(ct.gia) };
    if (k === 'lon_nhat' || k === 'be_nhat') return { to: 'Tờ ' + C.dong(d), nho: 'có giá trị ' + (k === 'lon_nhat' ? 'lớn' : 'bé') + ' nhất', doc: 'Tờ ' + C.docTien(d) + ' có giá trị ' + (k === 'lon_nhat' ? 'lớn' : 'bé') + ' nhất' };
    if (k === 'dem_loai') return { to: d + ' tờ ' + C.dong(ct.gia), nho: 'Đếm đúng rồi!', doc: d + ' tờ ' + C.docTien(ct.gia) };
    if (k === 'may_to') return { to: C.dong(ct.tu) + ' = ' + d + ' tờ ' + C.soTien(ct.sang), nho: 'Đổi đúng rồi!', doc: C.docTien(ct.tu) + ' đổi được ' + d + ' tờ ' + C.docTien(ct.sang) };
    return { to: 'Đúng rồi!', nho: '', doc: 'Đúng rồi' };
  }

  function ghiDung(kq, v) {
    s.khoa = true;
    s.dung++;
    const nguon = s.ban === 'nut' ? (dom.chon.querySelector('.ck-nut-chon.dung') || dom.ke) : dom.khay;
    const p = K().tamCua(nguon);
    s.chuoi = kq.ketQua === 'dung_ngay' ? s.chuoi + 1 : 0;
    const diem = kq.ketQua === 'dung_ngay' ? 100 + (s.chuoi >= 3 ? 50 : 0) : 40;
    K().congDiem(diem, p.x, p.y - 40, kq.quaMong ? '+' + kq.quaMong + ' quả mọng' : null);
    K().phao(p.x, p.y, 18);
    AT().bat('dung');
    if (s.chuoi >= 3) K().bao(s.chuoi + ' lượt đúng liền!', 'dung', 1.6);
    dom.khay.classList.remove('sai');
    dom.khay.classList.add('dung');
    loiBong(s.ct.kieu === 'thua' ? 'Cảm ơn bạn nhé!' : 'Cảm ơn con!', 'dung');
    const nd = noiDungDung(v);
    dom.dungTo.textContent = nd.to;
    dom.dungNho.textContent = nd.nho;
    dom.dung.classList.remove('hidden');
    AT().doc(nd.doc);
    veKhay();
    s.hengio = hen(cauMoi, 1900);
  }

  /** Gợi ý ba cấp; cấp 3 gạch một lựa chọn sai (giữ lựa chọn mang lỗi có tên) hoặc làm sáng các tờ nên dùng. */
  function goiY() {
    if (!s || !s.q || s.khoa || K().dangKhoa()) return;
    const q = s.van.q;
    if (!q || q.xong) return;
    let them = null;
    if (q.goiYCap + 1 === 3) {
      if (s.ban === 'nut' || s.ban === 'dua_to') {
        const sai = (q.lua_chon || []).filter(function (x) { return String(x.gia_tri) !== String(q.dap_an) && !s.loaiBo[String(x.gia_tri)]; });
        const coTen = function (x) { const l = x.loi || NH().nhanBietLoi(q.cau_truc, x.gia_tri); return l.some(function (m) { return m !== 'khac' && m !== 'dem-lech'; }) ? 1 : 0; };
        sai.sort(function (a, b) { return coTen(a) - coTen(b); });
        if (sai[0]) { s.loaiBo[String(sai[0].gia_tri)] = 1; them = { loai_bo: sai[0].gia_tri }; }
      } else {
        const C = CT();
        const goi = s.ban === 'thua' ? (C.toHop(C.canCua(s.ct), s.kho) || []) : C.docTo(q.dap_an);
        s.goiYTo = goi;
        them = { to_goi_y: goi };
      }
    }
    K().goiY(them);
    if (s.ban === 'nut') veChon(); else veDuoi();
  }

  function phim(e) {
    if (!s || !s.q || s.khoa) return;
    const k = e.key;
    const trenNut = document.activeElement && document.activeElement.tagName === 'BUTTON';
    if (/^[1-9]$/.test(k)) {
      const i = Number(k) - 1;
      if (s.ban === 'nut') chonNut(i);
      else {
        const o = dom.ngan.querySelector('.ck-ngan-o[data-o="' + (i + 1) + '"] .ck-to');
        if (o) vaoKhay(Number(o.getAttribute('data-to')), 'cham');
      }
      e.preventDefault();
      return;
    }
    if ((k === 'Backspace' || k === 'Delete') && s.khay.length && s.ban !== 'dua_to') { raKhay(s.khay.length - 1, 'phim'); e.preventDefault(); return; }
    if (k === 'Enter' && !trenNut && s.khay.length && s.ban !== 'dua_to' && s.ban !== 'nut') { nop(); e.preventDefault(); }
  }

  /* ---------------- Kết thúc ---------------- */

  function ketThuc() {
    const o = s.o;
    const diem = K().diem();
    const dung = s.dung;
    huyKeo();
    K().dong();
    s.van.ketThuc(false, { diem: diem, so_luot_dung: dung }).then(function (kq) {
      kq.diem = diem;
      kq.dongPhu = 'Làm đúng ' + dung + ' lượt ở chợ · ' + diem.toLocaleString('vi-VN') + ' điểm';
      s = null;
      if (o.onXong) o.onXong(kq);
    });
  }

  function thoat() {
    if (!s) return;
    const o = s.o;
    const diem = K().diem();
    clearTimeout(s.hengio);
    huyKeo();
    K().dong();
    s.van.ketThuc(true, { ly_do: 've_dao', diem: diem }).then(function (kq) {
      s = null;
      if (o.onThoat) o.onThoat(kq);
    });
  }

  window.ChoKhungLong = { batDau: batDau, _trangThai: function () { return s; } };
  (window.DaoTroChoi = window.DaoTroChoi || {})['cho-khung-long'] = { ten: 'Chợ Khủng Long', khung: true, san: 'ck-san', batDau: batDau, _trangThai: window.ChoKhungLong._trangThai };

  /* ---------------- Bài học 30 giây (dạy theo SGK Bài 56) ---------------- */

  function bhTo(g, tre, lop) { return '<span class="ck-bh-to bh-hien' + (lop ? ' ' + lop : '') + '" style="--tre:' + (tre || 0) + 's">' + CT().veTo(g) + '</span>'; }
  function bhMon(mon, gia, tre) {
    const C = CT(), m = C.monCua(mon);
    return '<span class="ck-mon ck-bh-mon bh-hien" style="--tre:' + (tre || 0) + 's"><span class="ck-mon-hinh" aria-hidden="true">' + m.hinh + '</span><span class="ck-mon-ten">' + esc(C.hoa(m.ten)) + '</span>' +
      '<span class="ck-the-gia"><i aria-hidden="true"></i>' + esc(C.dong(gia)) + '</span></span>';
  }
  function bhDau(t, tre) { return '<b class="ck-bh-dau bh-hien" style="--tre:' + (tre || 0) + 's">' + t + '</b>'; }

  const BAI_HOC = {
    'tien-viet-nam': {
      ten: 'Tiền Việt Nam',
      buoc: [
        { chu: 'Đây là các tờ tiền Việt Nam: một trăm đồng, hai trăm đồng, năm trăm đồng và một nghìn đồng.', ve: function () {
          const C = CT();
          return '<div class="ck-bh-bon">' + [100, 200, 500, 1000].map(function (g, i) {
            return '<span class="ck-bh-cot bh-hien" style="--tre:' + (i * 0.3) + 's">' + C.veTo(g) + '<b>' + esc(C.dong(g)) + '</b><small>' + esc(C.docTien(g)) + '</small></span>';
          }).join('') + '</div>';
        } },
        { chu: 'Nhìn số in trên tờ tiền để biết tờ tiền là bao nhiêu đồng. Tờ này có số 500, đọc là năm trăm đồng.', ve: function () {
          return '<div class="ck-bh-hang">' + bhTo(500, 0, 'to') + '<span class="ck-bh-nhan bh-hien" style="--tre:.6s">500 đồng<small>năm trăm đồng</small></span></div>';
        } },
        { chu: 'Mai mua kẹo hết một nghìn đồng. Mai đưa người bán một tờ một nghìn đồng.', ve: function () {
          return '<div class="ck-bh-hang">' + bhMon('keo', 1000, 0) + bhDau('→', 0.5) + bhTo(1000, 0.8) + '</div>';
        } },
        { chu: 'Có thể trả bằng nhiều tờ. Bánh mì giá bảy trăm đồng: tờ 500 đồng và tờ 200 đồng là 700 đồng. Nhớ cộng số trên các tờ, không đếm số tờ.', ve: function () {
          return '<div class="ck-bh-hang">' + bhMon('banh-mi', 700, 0) + bhDau('=', 0.4) + bhTo(500, 0.6, 'nho') + bhDau('+', 0.9) + bhTo(200, 1.1, 'nho') + '</div>' +
            '<p class="bh-pt bh-hien" style="--tre:1.4s">500 + 200 = 700</p>';
        }, thu: {
          hoi: 'Con thử nhé: bút chì giá 300 đồng. Trả bằng các tờ nào?', lua_chon: ['200 + 100', '200 + 200 + 200'], dung: '200 + 100',
          dung_noi: 'Đúng rồi! 200 đồng và 100 đồng là 300 đồng.', sai_noi: 'Ba tờ 200 đồng là 600 đồng, nhiều quá. 200 đồng và 100 đồng mới là 300 đồng.'
        } }
      ]
    },
    'tien-thua': {
      ten: 'Trả lại tiền thừa',
      buoc: [
        { chu: 'Con làm người bán nhé. Khách mua que kem giá 700 đồng và đưa con tờ một nghìn đồng.', ve: function () {
          return '<div class="ck-bh-hang">' + bhMon('kem', 700, 0) + '<span class="ck-bh-khach bh-hien" style="--tre:.5s"><b>Khách đưa</b>' + CT().veTo(1000) + '</span></div>';
        } },
        { chu: 'Khách đưa nhiều hơn giá kem nên con trả lại tiền thừa. Đếm thêm từ 700: 800, 900, một nghìn.', ve: function () {
          const C = CT();
          let h = '<div class="ck-bh-dem"><span class="ck-bh-moc bh-hien">700</span>';
          [800, 900, 1000].forEach(function (x, i) {
            h += '<span class="ck-bh-buoc bh-hien" style="--tre:' + (0.5 + i * 0.6) + 's">' + C.veTo(100) + '<small>+ 100</small></span><span class="ck-bh-moc bh-hien" style="--tre:' + (0.8 + i * 0.6) + 's">' + esc(C.soTien(x)) + '</span>';
          });
          return h + '</div>';
        } },
        { chu: 'Đếm thêm được 3 tờ 100 đồng, là 300 đồng. Một nghìn trừ bảy trăm bằng ba trăm. Con trả lại khách 300 đồng.', ve: function () {
          const C = CT();
          return '<p class="bh-pt bh-hien">' + esc(C.soTien(1000)) + ' − 700 = 300</p><div class="ck-bh-hang">' + bhTo(100, 0.4, 'nho') + bhTo(100, 0.6, 'nho') + bhTo(100, 0.8, 'nho') + '</div>';
        }, thu: {
          hoi: 'Con thử nhé: bánh mì giá 800 đồng, khách đưa một nghìn đồng. Trả lại bao nhiêu?', lua_chon: ['200 đồng', '800 đồng', '300 đồng'], dung: '200 đồng',
          dung_noi: 'Đúng rồi! Đếm thêm 900, một nghìn: trả lại 200 đồng.', sai_noi: 'Đếm thêm từ 800: 900, một nghìn là hai lần 100 đồng. Trả lại 200 đồng nhé.'
        } }
      ]
    }
  };
  if (window.BaiHoc && window.BaiHoc.dangKy) Object.keys(BAI_HOC).forEach(function (ma) { window.BaiHoc.dangKy(ma, BAI_HOC[ma]); });
})();
