/* ============================================================
   khung-choi.js – Bộ khung chung của các màn chơi mới (Truyện Tranh, Lật Thẻ, Xếp Hình Số):
   câu hỏi ở trên, điểm bên trái, gợi ý và tạm dừng bên phải, thanh tiến độ, bóng gợi ý của khủng long,
   màn "Gần đúng rồi" (ghi phan_hoi_xem rồi đóng câu sai), tạm dừng (ghi tam_dung, tiep_tuc), pháo giấy.
   Mỗi game chỉ vẽ phần chơi ở giữa (#kc-san) và gọi các hàm dưới đây.
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

  function khoiDom() {
    if (dom) return dom;
    dom = {};
    ['man-choi', 'kc-nen', 'kc-diem', 'kc-cau-so', 'kc-phu', 'kc-cau', 'kc-de', 'kc-nghe', 'kc-goi-y', 'kc-tam-dung', 'kc-tien-do',
      'kc-san', 'kc-goi-y-bong', 'kc-goi-y-hinh', 'kc-goi-y-chu', 'kc-bay', 'kc-bao', 'kc-phan-hoi', 'kc-ph-hinh', 'kc-ph-noi-dung',
      'kc-ph-que', 'kc-ph-note', 'kc-ph-que-nut', 'kc-ph-tiep', 'kc-tam', 'kc-tiep', 'kc-bai-hoc', 'kc-am', 'kc-giong', 'kc-ve-dao'].forEach(function (id) {
      dom[id.replace(/^kc-/, '').replace(/-([a-z])/g, function (m, c) { return c.toUpperCase(); })] = $(id);
    });
    dom.man = dom.manChoi;
    dom.goiYBtn = dom.goiY;
    dom.nghe.addEventListener('click', function () { ngheLai(); });
    dom.goiYBtn.addEventListener('click', function () { if (s && s.o.onGoiY && !dangKhoa()) s.o.onGoiY(); });
    dom.tamDung.addEventListener('click', function () { tamDung('nut'); });
    dom.tiep.addEventListener('click', function () { tiepTuc('nut'); });
    dom.veDao.addEventListener('click', function () { thoat(); });
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

  function capNhatNutAm() {
    chu(dom.am, 'Âm thanh: ' + (AT().co.tieng ? 'Bật' : 'Tắt'));
    chu(dom.giong, 'Giọng đọc: ' + (AT().co.giong ? 'Bật' : 'Tắt'));
    dom.giong.disabled = !AT().coGiong();
  }

  /**
   * Mở khung cho một ván.
   * o: { van, game, tenGame, nen (url ảnh nền), phu (màu phủ), hinhGoiY (url), onGoiY(), onNgheLai(), onPhim(e),
   *      onThoat() (bé bấm Về đảo), xemBaiHoc(xong) hoặc null }
   */
  function mo(o) {
    khoiDom();
    s = { o: o, van: o.van, diem: 0, tamDung: false, phMo: false, dangMo: true, doc: null };
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
   * Mở màn phản hồi với nội dung tùy ý. p: { html, que (html bảng que tính hoặc null), note, doc }
   * onDong(giayXem, nut) được gọi khi bé đóng màn.
   */
  function hienPhanHoi(p, onDong) {
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
    if (p.doc) AT().doc(p.doc);
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
      doc: (kq.loi && kq.loi[0] !== 'khac' ? 'Gần đúng rồi. ' : '') + (kq.loiNoi || '')
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
    if (s.o.onTiepTuc) s.o.onTiepTuc();
  }
  function thoat() {
    if (!s) return;
    an(dom.tam, true);
    const o = s.o;
    s.tamDung = false;
    s.dangMo = false;
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
    san: function () { khoiDom(); return dom.san; },
    _trangThai: function () { return s; }
  };
})();
