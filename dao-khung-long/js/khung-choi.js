/* ============================================================
   khung-choi.js – Bộ khung chung của các màn chơi mới (Truyện Tranh, Lật Thẻ, Xếp Hình Số):
   câu hỏi ở trên, điểm bên trái, gợi ý và tạm dừng bên phải, thanh tiến độ, bóng gợi ý của khủng long,
   màn "Gần đúng rồi" (ghi phan_hoi_xem rồi đóng câu sai), tạm dừng (ghi tam_dung, tiep_tuc), pháo giấy.
   Mỗi game chỉ vẽ phần chơi ở giữa (#kc-san) và gọi các hàm dưới đây.
   Thêm: loa nhỏ trên lựa chọn bằng chữ (chạm để nghe), loa trên thẻ lời giải (đọc tên lỗi, các bước, "Vậy..."),
   menu Tạm dừng có hình, hỏi lại trước khi về đảo khi ván đã có câu trả lời, hẹn giờ biết tạm dừng (KhungChoi.hen).
   API: window.KhungChoi
   ============================================================ */
(function () {
  'use strict';

  const CO_GIAM_DONG = (function () { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();

  let dom = null;
  let s = null; // { o, van, diem, tamDung, phMo, phNut, onPh }

  function $(id) { return document.getElementById(id); }
  function an(el, b) { if (el) el.classList.toggle('hidden', !!b); }
  function chu(el, t) { if (el && el.textContent !== String(t)) el.textContent = String(t); }
  function AT() { return window.AmThanh; }

  /* ---------------- Dùng chung với Đua Xe: nút có hình, loa trên thẻ lời giải, hỏi lại trước khi về đảo ---------------- */

  const LOA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
  const ICON = {
    tiep: '<svg viewBox="0 0 24 24"><path d="M8 5.2v13.6L19 12z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    cach_choi: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.6" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M9.3 9.4a2.8 2.8 0 1 1 4 2.5c-.8.4-1.3 1-1.3 1.9v.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="17.4" r="1.5" fill="currentColor"/></svg>',
    bai_hoc: '<svg viewBox="0 0 24 24"><path d="M12 6.2C9.3 4.6 6.3 4.3 3 5.3v13.3c3.3-1 6.3-.7 9 .9 2.7-1.6 5.7-1.9 9-.9V5.3c-3.3-1-6.3-.7-9 .9zM12 6.2v13.3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>',
    am: '<svg viewBox="0 0 24 24"><path d="M3.5 9h4l5-4v14l-5-4h-4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.6 6a8.6 8.6 0 0 1 0 12" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>',
    am_tat: '<svg viewBox="0 0 24 24"><path d="M3.5 9h4l5-4v14l-5-4h-4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    giong: '<svg viewBox="0 0 24 24"><path d="M4 4.5h16v11H10.5L5.5 19.5v-4H4z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M8 8.5h8M8 11.5h5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    giong_tat: '<svg viewBox="0 0 24 24"><path d="M4 4.5h16v11H10.5L5.5 19.5v-4H4z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M3 21L21 3" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    ve_dao: '<svg viewBox="0 0 24 24"><path d="M3 11.5L12 4l9 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 10v9.5h13V10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M10 19.5v-5h4v5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>'
  };

  /** Gắn hình cho một nút chữ (menu Tạm dừng): <span hình><span chữ>. */
  function nutCoHinh(btn, hinh, t) {
    if (!btn) return;
    if (!btn.querySelector('.nut-chu')) btn.innerHTML = '<span class="nut-icon" aria-hidden="true"></span><span class="nut-chu"></span>';
    btn.classList.add('co-icon');
    datNut(btn, hinh, t);
  }
  function datNut(btn, hinh, t) {
    if (!btn) return;
    const c = btn.querySelector('.nut-chu');
    if (!c) { chu(btn, t); return; }
    chu(c, t);
    const i = btn.querySelector('.nut-icon');
    if (i && i.getAttribute('data-hinh') !== hinh) { i.innerHTML = ICON[hinh] || ''; i.setAttribute('data-hinh', hinh); }
  }
  /** Menu Tạm dừng giống nhau ở mọi thể loại của đảo: mỗi nút có hình. n: { tiep, cachChoi, baiHoc, am, giong, veDao } */
  function trangTriTamDung(n) {
    nutCoHinh(n.tiep, 'tiep', 'Chơi tiếp');
    nutCoHinh(n.cachChoi, 'cach_choi', 'Cách chơi');
    nutCoHinh(n.baiHoc, 'bai_hoc', 'Xem lại bài học');
    nutCoHinh(n.am, 'am', 'Âm thanh: Bật');
    nutCoHinh(n.giong, 'giong', 'Giọng đọc: Bật');
    nutCoHinh(n.veDao, 've_dao', 'Về đảo');
  }
  /** Chữ và hình của hai nút Âm thanh, Giọng đọc theo cài đặt hiện tại. */
  function nutAm(am, giong) {
    const A = AT();
    datNut(am, A.co.tieng ? 'am' : 'am_tat', 'Âm thanh: ' + (A.co.tieng ? 'Bật' : 'Tắt'));
    datNut(giong, A.co.giong && A.coGiong() ? 'giong' : 'giong_tat', A.nhanGiong());
    if (giong) {
      giong.disabled = !A.coGiong();
      giong.title = 'Bố mẹ có thể thêm giọng Tiếng Việt trong cài đặt giọng nói của thiết bị.';
      if (!giong._giongTheoDoi) { giong._giongTheoDoi = true; A.theoDoiGiong(function () { nutAm(am, giong); }); }
    }
  }

  /** Nút loa trên thẻ lời giải (thẻ .ph-the trong lớp phủ lopPhu): chạm để nghe lại cả lời giải. layDoc() trả về các câu. */
  function ganLoaLoiGiai(lopPhu, layDoc, ghi) {
    const the = lopPhu && lopPhu.querySelector('.ph-the');
    if (!the || the.querySelector('.ph-loa')) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'dx-loa ph-loa';
    b.setAttribute('aria-label', 'Nghe lời giải');
    b.innerHTML = LOA;
    b.addEventListener('click', function () {
      const ds = layDoc();
      if (!ds || !ds.length) return;
      if (ghi) ghi();
      AT().docChuoi(ds);
    });
    the.insertBefore(b, the.firstChild);
    AT().ganNutDoc(b);
  }

  /**
   * Hỏi lại trước khi rời ván đang dở (bấm Về đảo trong menu Tạm dừng): thẻ lớn hai nút, "Chơi tiếp" là nút chính.
   * man: màn chứa lớp phủ; o: { hinh (url khủng long), onChoiTiep(), onVeDao() }
   */
  function hoiVeDao(man, o) {
    if (!man) { if (o.onVeDao) o.onVeDao(); return; }
    let h = man._hoiVeDao;
    if (!h) {
      const el = document.createElement('div');
      el.className = 'lop-phu hidden hoi-ve-dao';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-label', 'Về đảo?');
      el.innerHTML = '<div class="the tam-the hoi-ve-the"><img class="hoi-ve-hinh" alt="">' +
        '<h2>Con muốn về đảo?</h2><p class="hoi-ve-phu">Ván này chưa xong đâu.</p>' +
        '<button class="nut nut-cam nut-to" type="button" data-hoi="tiep"></button>' +
        '<button class="nut nut-trang" type="button" data-hoi="ve"></button></div>';
      man.appendChild(el);
      h = man._hoiVeDao = { el: el, o: null };
      nutCoHinh(el.querySelector('[data-hoi="tiep"]'), 'tiep', 'Chơi tiếp');
      nutCoHinh(el.querySelector('[data-hoi="ve"]'), 've_dao', 'Về đảo');
      el.addEventListener('click', function (e) {
        const b = e.target.closest('[data-hoi]');
        if (!b) return;
        const oo = h.o;
        dongHoiVeDao(man);
        AT().bat('cham');
        if (!oo) return;
        if (b.getAttribute('data-hoi') === 'tiep') { if (oo.onChoiTiep) oo.onChoiTiep(); } else if (oo.onVeDao) oo.onVeDao();
      });
    }
    h.o = o;
    const img = h.el.querySelector('.hoi-ve-hinh');
    if (img) { img.src = o.hinh || ''; an(img, !o.hinh); }
    an(h.el, false);
    AT().bat('cham');
    AT().doc('Con muốn về đảo? Ván này chưa xong đâu.');
    setTimeout(function () { try { h.el.querySelector('[data-hoi="tiep"]').focus(); } catch (e) { /* bỏ qua */ } }, 50);
  }
  function dongHoiVeDao(man) {
    const h = man && man._hoiVeDao;
    if (!h) return false;
    const mo = !h.el.classList.contains('hidden');
    an(h.el, true);
    h.o = null;
    return mo;
  }

  /*
   * Loa nhỏ trên các lựa chọn bằng chữ ("Chắc chắn", "hai trăm linh năm", "5 kg"…) của mọi thể loại dùng khung chung:
   * bé chưa đọc được chữ chạm loa để nghe (không tính là chọn), chạm phần còn lại của thẻ để chọn như cũ.
   * Chỉ gắn cho thẻ có chữ cái (thẻ chỉ có số, phép tính thì bé đọc được), thẻ tranh, đồng hồ thì không.
   */
  const LUA_CHON_CHU = '.lt-the-kq, .lt-the-phep.lat, .tt-the, .cc-chon, .cc-kn-nut, .cc-ul-nut, .dt-lc, .ck-nut-chon, .ll2-the, .xd-lc-nut, .rh-the';
  const CO_CHU_CAI = /[A-Za-zÀ-ɏḀ-ỿ][^]*[A-Za-zÀ-ɏḀ-ỿ]/;
  /** Chữ bé nhìn thấy trên một thẻ (bỏ hình, số thứ tự, loa). */
  function chuThe(b) {
    const c = b.cloneNode(true);
    c.querySelectorAll('.kc-loa-lc, [aria-hidden="true"], img, svg, .hidden, .ll2-the-so, .lt-sau').forEach(function (x) { x.remove(); });
    return String(c.textContent || '').replace(/\s+/g, ' ').trim();
  }
  function ganLoaLuaChon(goc) {
    if (!goc || !goc.querySelectorAll) return;
    goc.querySelectorAll(LUA_CHON_CHU).forEach(function (b) {
      const co = b.querySelector('.kc-loa-lc');
      const can = !b.disabled && AT().coGiong() && AT().co.giong && CO_CHU_CAI.test(chuThe(b));
      if (can && !co) {
        const l = document.createElement('span');
        l.className = 'kc-loa-lc';
        l.setAttribute('aria-hidden', 'true');
        l.innerHTML = LOA;
        try { if (window.getComputedStyle(b).position === 'static') b.classList.add('kc-co-loa'); } catch (e) { /* bỏ qua */ }
        b.appendChild(l);
      } else if (!can && co) co.remove();
    });
  }
  /** Chạm loa: đọc chữ của thẻ, chặn không cho sự kiện tới game (không tính là chọn). */
  function chanLoa(e) {
    const l = e.target && e.target.closest && e.target.closest('.kc-loa-lc');
    if (!l) return;
    e.stopPropagation();
    // Không chặn mặc định của touchstart, pointerdown: iPad sẽ không phát click nữa
    if (e.type !== 'click') return;
    e.preventDefault();
    const b = l.parentNode;
    const t = b ? chuThe(b) : '';
    if (!t || !s || dangKhoa()) return;
    if (s.van && s.van.q && !s.van.q.xong) s.van.thaoTac('nghe_lai', { doi_tuong: 'lua_chon', gia_tri: t });
    AT().doc(t);
  }
  function theoDoiLuaChon() {
    const san = dom.san;
    if (!san || san._loaLuaChon) return;
    san._loaLuaChon = true;
    AT().theoDoiGiong(function () { ganLoaLuaChon(san); });
    ['pointerdown', 'mousedown', 'touchstart', 'click'].forEach(function (k) { san.addEventListener(k, chanLoa, true); });
    if (typeof window.MutationObserver === 'function') {
      let cho = false;
      new window.MutationObserver(function () {
        if (cho) return;
        cho = true;
        Promise.resolve().then(function () { cho = false; ganLoaLuaChon(san); });
      }).observe(san, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'disabled'] });
    }
  }

  function khoiDom() {
    if (dom) return dom;
    dom = {};
    ['man-choi', 'kc-nen', 'kc-diem', 'kc-cau-so', 'kc-phu', 'kc-cau', 'kc-de', 'kc-nghe', 'kc-goi-y', 'kc-tam-dung', 'kc-tien-do',
      'kc-san', 'kc-goi-y-bong', 'kc-goi-y-hinh', 'kc-goi-y-chu', 'kc-bay', 'kc-bao', 'kc-phan-hoi', 'kc-ph-hinh', 'kc-ph-noi-dung',
      'kc-ph-que', 'kc-ph-note', 'kc-ph-que-nut', 'kc-ph-tiep', 'kc-tam', 'kc-tiep', 'kc-cach-choi', 'kc-bai-hoc', 'kc-am', 'kc-giong', 'kc-ve-dao'].forEach(function (id) {
      dom[id.replace(/^kc-/, '').replace(/-([a-z])/g, function (m, c) { return c.toUpperCase(); })] = $(id);
    });
    dom.man = dom.manChoi;
    dom.goiYBtn = dom.goiY;
    trangTriTamDung({ tiep: dom.tiep, cachChoi: dom.cachChoi, baiHoc: dom.baiHoc, am: dom.am, giong: dom.giong, veDao: dom.veDao });
    ganLoaLoiGiai(dom.phanHoi, function () { return s && s.phMo ? s.phDoc : null; }, function () {
      if (s && s.van && s.van.q && !s.van.q.xong) s.van.thaoTac('nghe_lai', { doi_tuong: 'loi_giai' });
    });
    theoDoiLuaChon();
    AT().ganNutDoc(dom.nghe);
    dom.nghe.addEventListener('click', function () { ngheLai(); });
    dom.goiYBtn.addEventListener('click', function () { if (s && s.o.onGoiY && !dangKhoa()) s.o.onGoiY(); });
    dom.tamDung.addEventListener('click', function () { tamDung('nut'); });
    dom.tiep.addEventListener('click', function () { tiepTuc('nut'); });
    dom.veDao.addEventListener('click', function () {
      if (!s) return;
      // Ván đã có câu trả lời: hỏi lại cho chắc (bé hay chạm nhầm); chưa làm gì thì về luôn
      if (s.van && s.van.coTienTrinh && s.van.coTienTrinh()) {
        an(dom.tam, true);
        hoiVeDao(dom.man, { hinh: s.o.hinhGoiY, onChoiTiep: function () { tiepTuc('nut'); }, onVeDao: thoat });
      } else thoat();
    });
    dom.baiHoc.addEventListener('click', function () {
      if (!s || !s.o.xemBaiHoc) return;
      an(dom.tam, true);
      s.o.xemBaiHoc(function () { an(dom.tam, false); });
    });
    dom.am.addEventListener('click', function () { AT().datTieng(!AT().co.tieng); capNhatNutAm(); });
    dom.giong.addEventListener('click', function () { AT().datGiong(!AT().co.giong); capNhatNutAm(); });
    dom.phTiep.addEventListener('click', function () { dongPhanHoi('choi_tiep'); });
    dom.phQueNut.addEventListener('click', function () { doiQueTinh(); });
    document.addEventListener('keydown', function (e) {
      if (!s || !s.dangMo) return;
      if ((e.key === 'Enter' || e.key === ' ') && e.target.closest && e.target.closest('button')) return;
      if (s.phMo) { if (e.key === 'Enter' || e.key === ' ') { dongPhanHoi('choi_tiep'); e.preventDefault(); } return; }
      if (s.tamDung) { if (e.key === 'Escape' || e.key === 'p') { tiepTuc('phim'); e.preventDefault(); } return; }
      if (e.key === 'Escape' || e.key === 'p') { tamDung('phim'); e.preventDefault(); return; }
      if (e.key === 'h' && s.o.onGoiY) { s.o.onGoiY(); return; }
      if (s.o.onPhim) s.o.onPhim(e);
    });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden' && s && s.dangMo && !s.tamDung && !s.phMo) tamDung('an_tab');
    });
    return dom;
  }

  function capNhatNutAm() { nutAm(dom.am, dom.giong); }

  /**
   * Mở khung cho một ván.
   * o: { van, game, tenGame, nen (url ảnh nền), phu (màu phủ), hinhGoiY (url), onGoiY(), onNgheLai(), onPhim(e),
   *      onThoat() (bé bấm Về đảo), xemBaiHoc(xong) hoặc null }
   */
  function mo(o) {
    khoiDom();
    s = { o: o, van: o.van, diem: 0, tamDung: false, phMo: false, dangMo: true, doc: null, hoan: [] };
    dongHoiVeDao(dom.man);
    dom.man.setAttribute('data-game', o.game);
    dom.nen.style.backgroundImage = o.nen ? 'url(' + o.nen + ')' : '';
    dom.nen.style.setProperty('--phu', o.phu || 'rgba(40,20,90,.45)');
    dom.goiYHinh.src = o.hinhGoiY || '';
    dom.phHinh.src = o.hinhGoiY || '';
    chu(dom.phu, o.tenGame || '');
    chu(dom.diem, '0');
    an(dom.baiHoc, !o.xemBaiHoc);
    ['goiYBong', 'bao', 'phanHoi', 'tam'].forEach(function (k) { an(dom[k], true); });
    dom.bay.innerHTML = '';
    de('', null);
    tienDo();
    capNhatNutAm();
  }

  function dong() {
    if (s) s.dangMo = false;
    AT().dungDoc();
  }

  function dangKhoa() { return !s || !s.dangMo || s.tamDung || s.phMo; }

  /**
   * Hẹn giờ của ván đang chơi (thay cho setTimeout trần trong các game): ván đổi hay đã đóng thì bỏ,
   * bé đang tạm dừng thì chờ bé bấm Chơi tiếp mới chạy (không mở lời giải, không sang câu mới dưới menu Tạm dừng).
   */
  function hen(fn, ms) {
    const phien = s;
    return setTimeout(function () { if (s && s === phien && s.dangMo) khiChoi(fn); }, ms);
  }
  /** Chạy fn ngay, hoặc chờ tới khi bé chơi tiếp nếu đang tạm dừng (dùng trong hẹn giờ riêng của từng game). */
  function khiChoi(fn) {
    if (s && s.dangMo && s.tamDung) { s.hoan.push(fn); return; }
    fn();
  }

  /** Đặt đề trên thanh câu hỏi. doc: câu để đọc (mặc định đọc đúng chữ trên thanh). */
  function de(chuDe, doc, tuyChon) {
    if (!dom) return;
    chu(dom.de, chuDe || '');
    an(dom.cau, !chuDe);
    s && (s.doc = doc || chuDe || null);
    if (tuyChon && tuyChon.nay) {
      dom.cau.classList.remove('nay');
      void dom.cau.offsetWidth;
      dom.cau.classList.add('nay');
    }
    if (tuyChon && tuyChon.docNgay && s && s.doc && AT().co.giong) AT().doc(s.doc);
  }

  function ngheLai() {
    if (!s || dangKhoa()) return;
    if (s.o.onNgheLai) { s.o.onNgheLai(); return; }
    if (s.van.q && !s.van.q.xong) s.van.thaoTac('nghe_lai', { doi_tuong: 'de' });
    if (s.doc) AT().doc(s.doc);
  }

  function tienDo() {
    if (!s) return;
    // Tính cả câu sai quay lại: thanh không đầy trước khi hết câu, câu quay lại có nhãn riêng
    const td = s.van.tienDo();
    dom.tienDo.style.width = Math.round(td.xong / td.tong * 1000) / 10 + '%';
    chu(dom.cauSo, (td.onLai ? 'Làm lại · ' : '') + 'Câu ' + Math.min(td.tong, td.xong + td.dang || 1) + '/' + td.tong);
  }

  /** Cộng điểm; x, y (tùy chọn) là tọa độ trên màn hình để hiện chữ bay. */
  function congDiem(n, x, y, phu) {
    if (!s) return;
    s.diem += n;
    chu(dom.diem, s.diem.toLocaleString('vi-VN'));
    if (x != null) chuBay('+' + n, x, y);
    if (phu && x != null) chuBay(phu, x + 60, y + 34, 'nho');
  }
  function diem() { return s ? s.diem : 0; }

  function chuBay(t, x, y, lop) {
    const el = document.createElement('span');
    el.className = 'kc-chu-bay' + (lop ? ' ' + lop : '');
    el.textContent = t;
    el.style.left = Math.round(x) + 'px';
    el.style.top = Math.round(y) + 'px';
    dom.bay.appendChild(el);
    setTimeout(function () { el.remove(); }, 1300);
  }

  /** Pháo giấy tại (x, y) trên màn hình. */
  function phao(x, y, n) {
    if (!dom) return;
    n = CO_GIAM_DONG ? 6 : (n || 18);
    const mau = ['#ffd166', '#ef476f', '#06d6a0', '#118ab2', '#ff8a1f', '#b388ff'];
    for (let i = 0; i < n; i++) {
      const el = document.createElement('i');
      el.className = 'kc-phao';
      const g = Math.random() * Math.PI * 2, r = 60 + Math.random() * 120;
      el.style.left = Math.round(x) + 'px';
      el.style.top = Math.round(y) + 'px';
      el.style.background = mau[i % mau.length];
      el.style.setProperty('--dx', Math.round(Math.cos(g) * r) + 'px');
      el.style.setProperty('--dy', Math.round(Math.sin(g) * r - 60) + 'px');
      dom.bay.appendChild(el);
      setTimeout(function () { el.remove(); }, 1000);
    }
  }
  function tamCua(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  let hengioBao = null;
  /** Lời nhắn ngắn giữa màn (loai: 'sai' | 'dung' | ''). */
  function bao(t, loai, giay) {
    if (!dom) return;
    chu(dom.bao, t);
    dom.bao.className = 'kc-bao' + (loai ? ' ' + loai : '');
    clearTimeout(hengioBao);
    hengioBao = setTimeout(function () { an(dom.bao, true); }, (giay || 2.4) * 1000);
  }

  let hengioGoiY = null;
  /** Hiện bóng gợi ý (chữ) và đọc to; tự ẩn sau vài giây để không che vùng chơi (bấm gợi ý lần nữa là hiện lại). */
  function hienGoiY(t) {
    chu(dom.goiYChu, t);
    an(dom.goiYBong, false);
    AT().bat('cham');
    AT().doc(t);
    clearTimeout(hengioGoiY);
    hengioGoiY = setTimeout(anGoiY, Math.max(8000, String(t || '').length * 110));
  }
  function anGoiY() { clearTimeout(hengioGoiY); if (dom) an(dom.goiYBong, true); }
  /** Gợi ý mặc định: tăng một cấp qua VanChoi rồi hiện. them: trường riêng của game. */
  function goiY(them) {
    if (!s || dangKhoa()) return null;
    const g = s.van.goiY(them);
    if (g) hienGoiY(g.loi);
    return g;
  }

  /* ---------------- Màn phản hồi ---------------- */

  /**
   * Mở màn phản hồi với nội dung tùy ý. p: { html, que (html bảng que tính hoặc null), note, doc (một câu hoặc mảng câu đọc nối tiếp) }
   * onDong(giayXem, nut) được gọi khi bé đóng màn. Nút loa trên thẻ đọc lại cả doc.
   */
  function hienPhanHoi(p, onDong) {
    s.phDoc = p.doc ? (Array.isArray(p.doc) ? p.doc : [p.doc]) : [];
    s.phMo = true;
    s.phLuc = performance.now();
    s.phNut = 'choi_tiep';
    s.onPh = onDong;
    dom.phNoiDung.innerHTML = p.html;
    dom.phQue.innerHTML = p.que || '';
    an(dom.phQue, true);
    an(dom.phQueNut, !p.que);
    chu(dom.phQueNut, 'Xem bằng que tính');
    chu(dom.phNote, p.note || '');
    an(dom.phanHoi, false);
    anGoiY();
    if (s.phDoc.length) AT().docChuoi(s.phDoc);
    setTimeout(function () { try { dom.phTiep.focus(); } catch (e) { /* bỏ qua */ } }, 50);
  }

  function doiQueTinh() {
    if (!s || !s.phMo) return;
    const dangQue = dom.phQue.classList.contains('hidden');
    if (dangQue) { s.phNut = 'que_tinh'; s.van.thaoTac('cham', { doi_tuong: 'nut_que_tinh' }); }
    an(dom.phQue, !dangQue);
    const giai = dom.phNoiDung.querySelector('.ph-giai');
    if (giai) an(giai, dangQue);
    chu(dom.phQueNut, dangQue ? 'Xem lời giải' : 'Xem bằng que tính');
  }

  function dongPhanHoi(nut) {
    if (!s || !s.phMo) return;
    const giay = (performance.now() - s.phLuc) / 1000;
    s.phMo = false;
    an(dom.phanHoi, true);
    AT().dungDoc();
    const cb = s.onPh;
    s.onPh = null;
    if (cb) cb(giay, s.phNut === 'que_tinh' ? 'que_tinh' : nut);
  }

  /**
   * Màn "Gần đúng rồi" cho câu vừa sai hẳn: ghi phan_hoi_xem, đóng câu sai rồi gọi xong().
   * qHien: câu để dựng lời giải (bài hai bước dùng câu của bước tính); kq: kết quả traLoi; them: trường riêng cho phan_hoi_xem.
   */
  function phanHoiCau(qHien, giaTri, kq, xong, them) {
    const q = s.van.q;
    const html = window.PhanHoi.noiDung(qHien, giaTri, kq);
    const que = window.PhanHoi.queTinh(qHien.cau_truc && !qHien.cau_truc.loai ? qHien.cau_truc : null);
    hienPhanHoi({
      html: html, que: que,
      note: q && s.van.seOnLai() ? 'Câu này sẽ quay lại sau 2 câu nữa để con tự làm' : 'Lần sau gặp lại, con làm được mà!',
      // Đọc cả tên lỗi, từng bước và câu "Vậy..." để bé chưa đọc được chữ vẫn nghe đủ lời giải
      doc: window.PhanHoi.loiDoc(qHien, giaTri, kq)
    }, function (giay, nut) {
      s.van.phanHoiXem(giay, nut, them);
      s.van.ketThucCauSai();
      tienDo();
      if (xong) xong();
    });
  }

  /* ---------------- Tạm dừng, thoát ---------------- */

  function tamDung(nguon) {
    if (!s || !s.dangMo || s.tamDung || s.phMo) return;
    s.tamDung = true;
    window.NhatKy.tamDung(nguon);
    AT().dungDoc();
    an(dom.tam, false);
    capNhatNutAm();
    if (s.o.onTamDung) s.o.onTamDung();
  }
  function tiepTuc(nguon) {
    if (!s || !s.tamDung) return;
    s.tamDung = false;
    window.NhatKy.tiepTuc(nguon);
    an(dom.tam, true);
    dongHoiVeDao(dom.man);
    if (s.o.onTiepTuc) s.o.onTiepTuc();
    // Các hẹn giờ tới lúc bé đang tạm dừng: chạy bây giờ
    const hoan = s.hoan.splice(0);
    hoan.forEach(function (fn) { if (s && s.dangMo && !s.tamDung) fn(); else if (s) s.hoan.push(fn); });
  }
  function thoat() {
    if (!s) return;
    an(dom.tam, true);
    dongHoiVeDao(dom.man);
    const o = s.o;
    s.tamDung = false;
    s.dangMo = false;
    s.hoan = [];
    window.NhatKy.tiepTuc('thoat');
    AT().dungDoc();
    if (o.onThoat) o.onThoat();
  }

  window.KhungChoi = {
    mo: mo,
    dong: dong,
    de: de,
    tienDo: tienDo,
    congDiem: congDiem,
    diem: diem,
    chuBay: chuBay,
    phao: phao,
    tamCua: tamCua,
    bao: bao,
    goiY: goiY,
    hienGoiY: hienGoiY,
    anGoiY: anGoiY,
    hienPhanHoi: hienPhanHoi,
    phanHoiCau: phanHoiCau,
    tamDung: tamDung,
    dangKhoa: dangKhoa,
    hen: hen,
    khiChoi: khiChoi,
    // Dùng chung với Đua Xe (màn riêng): menu Tạm dừng có hình, loa trên thẻ lời giải, hỏi lại trước khi về đảo
    trangTriTamDung: trangTriTamDung,
    nutAm: nutAm,
    ganLoaLoiGiai: ganLoaLoiGiai,
    hoiVeDao: hoiVeDao,
    dongHoiVeDao: dongHoiVeDao,
    ganLoaLuaChon: ganLoaLuaChon,
    san: function () { khoiDom(); return dom.san; },
    _trangThai: function () { return s; }
  };
})();
