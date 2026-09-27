/* ============================================================
   cau-ca.js – Game Câu Cá Thống Kê (vùng 10 Hồ Thống Kê, màn ước lượng ở vùng 8)
   Một lượt chơi (một hồ cá, một hộp bóng) dùng cho 1 đến 3 câu hỏi liền nhau, mỗi câu là một câu của VanChoi;
   số liệu nằm trong cấu trúc câu nên câu quay lại dựng lại đúng cảnh cũ (xem CauThongKe.cauKeTiep).
   - kiem_dem (SGK Bài 64): chạm con cá để câu (ghi 'cau'), kéo hoặc chạm giỏ để thả vào đúng giỏ (ghi 'tha').
     Câu hết thì hỏi: có mấy con cá vàng (gõ số), loại nào nhiều nhất (chọn), có tất cả bao nhiêu con; bảng kiểm đếm
     điền dần số con mỗi loại như SGK. Bé chạm từng con trong giỏ để đánh số khi đếm (ghi 'dem').
   - bieu_do (Bài 65): chạm cá để câu vào xô, câu hết thì Gai Long xếp cá cùng loại vào từng hàng thành biểu đồ tranh
     (mỗi hình là 1 con), rồi 2, 3 câu đọc biểu đồ: mỗi loại mấy con, nhiều nhất, ít nhất, hơn kém mấy con, tất cả.
   - hop_bong (Bài 66, 74): hộp bóng trong suốt; bé chọn chắc chắn, có thể, không thể (ghi 'chon'), Gai Long lấy thử
     3 lần cho bé xem (ghi 'boc'), rồi mới chấm; một hộp dùng cho 2 câu.
   - uoc_luong (Bài 1, 49): đàn cá bơi thành nhóm 10 hiện 3 giây rồi lặn xuống; bé chọn khoảng 30, 40, 50…
     Chọn quá 10 giây ghi cờ dem_tung_con (03a mục 2.7), không tính là sai.
   - tron (cúp): trộn ba kỹ năng của vùng 10, mỗi lượt tối đa 2 câu.
   Gợi ý cấp 1, 2 tô sáng hàng, giỏ, màu bóng cần xem (ước lượng: cho xem lại đàn cá 3 giây); cấp 3 gạch bớt một lựa chọn sai.
   Bài học 30 giây: kiem-dem, bieu-do-tranh, kha-nang, uoc-luong (đăng ký ở cuối tệp).
   API: window.CauCa = { batDau(o), _trangThai() }
   ============================================================ */
(function () {
  'use strict';

  const TOI_DA_VONG = { kiem_dem: 3, bieu_do: 3, kha_nang: 2, uoc_luong: 1 };
  const MS_XEM_DAN = 3000;
  const SO_LAN_BOC = 3;
  const THU_TU_KN = ['chac_chan', 'co_the', 'khong_the'];

  let s = null;
  let dom = null;
  let soPhien = 0;

  function $(id) { return document.getElementById(id); }
  function K() { return window.KhungChoi; }
  function NH() { return window.NganHang; }
  function CTK() { return window.CauThongKe; }
  function AT() { return window.AmThanh; }
  function esc(t) { return window.PhanHoi.esc(t); }
  function lam1(x) { return Math.round(x * 10) / 10; }
  function giayTrongCau() { return lam1(window.NhatKy.msTrongCau() / 1000); }

  /** Hẹn giờ gắn với ván đang chơi: tự bỏ khi ván đổi, hoãn khi đang tạm dừng. */
  function hen(fn, ms) {
    if (!s) return null;
    const id = s.id;
    const t = setTimeout(function () {
      if (!s || s.id !== id) return;
      if (s.tamDung) { s.hoan.push(fn); return; }
      fn();
    }, ms);
    s.hen.push(t);
    return t;
  }
  function huyHen() { if (s) { s.hen.forEach(clearTimeout); s.hen = []; s.hoan = []; } }

  function khoiDom() {
    if (dom) return dom;
    let san = $('cc-san');
    if (!san) {
      san = document.createElement('div');
      san.className = 'kc-game cc-san';
      san.id = 'cc-san';
      K().san().appendChild(san);
    }
    dom = { san: san };
    san.addEventListener('pointerdown', xuongTay);
    window.addEventListener('pointermove', diTay);
    window.addEventListener('pointerup', nhacTay);
    window.addEventListener('pointercancel', nhacTay);
    san.addEventListener('click', bamSan);
    return dom;
  }
  function lay(id) { return dom.san.querySelector('#' + id); }

  /**
   * o: { van, man, che_do, nen, phu, hinhGoiY, anh(ten), xemBaiHoc, onXong(kq), onThoat(kq) } (xem vaoMan trong app.js)
   */
  function batDau(o) {
    khoiDom();
    dom.san.classList.remove('hidden');
    huyHen();
    s = {
      id: ++soPhien, o: o, van: o.van, man: o.man, cheDo: o.che_do || o.man.che_do || 'kiem_dem',
      hen: [], hoan: [], tamDung: false, vong: null, q: null, pha: 'nghi', khoa: false,
      ca: [], gio: {}, cam: null, keo: null, xo: [], nhap: '', dem: {}, bang: {}, luaChon: [], daHoi: [],
      soCa: 0, soDung: 0, giayCauCa: null, xemLai: false
    };
    K().mo({
      van: o.van, game: 'cau-ca', tenGame: 'Câu Cá Thống Kê', nen: o.nen, phu: o.phu, hinhGoiY: o.hinhGoiY,
      onGoiY: goiY, onThoat: thoat, xemBaiHoc: o.xemBaiHoc, onPhim: phim, onTamDung: tamDung, onTiepTuc: tiepTuc
    });
    s.van.batDau({ che_do: s.cheDo });
    if (s.cheDo === 'tron') gomCap(s.van.hang);
    cauMoi();
  }

  /**
   * Cúp trộn kỹ năng: đưa các câu cùng kỹ năng đứng thành cặp để một lần câu cá (một hộp bóng) dùng cho 2 câu.
   * Chỉ đổi thứ tự hàng câu của ván (danh sách lập từ hạt giống nên vẫn phát lại được).
   */
  function gomCap(hang) {
    if (!hang || hang.length < 3) return;
    for (let i = 0; i < hang.length - 1; i += 2) {
      if (hang[i].ky_nang === hang[i + 1].ky_nang) continue;
      for (let j = i + 2; j < hang.length; j++) {
        if (hang[j].ky_nang === hang[i].ky_nang && !hang[j].on_lai_cua) { hang.splice(i + 1, 0, hang.splice(j, 1)[0]); break; }
      }
    }
  }

  function anhGai() { return s.o.anh ? s.o.anh('sp-gai-long') : 'assets/img/sp-gai-long.webp'; }

  /* ---------------- Câu kế tiếp, lượt chơi ---------------- */

  function toiDaVong() {
    const l = s.vong ? s.vong.loai : null;
    return Math.min(TOI_DA_VONG[l] || 1, s.cheDo === 'tron' ? 2 : 9);
  }
  /** Dạng câu trong game: đáp án là số thì bé tự gõ (chống đoán), còn lại chọn. Màn có dang riêng thì theo màn. */
  function dangCua(ct) {
    if (s.man.dang) return s.man.dang;
    return CTK().laSo(ct) ? 'nhap_so' : 'chon_dap_an';
  }
  function cachCua(kn) {
    const m = (s.man.cau || []).find(function (x) { return x.ky_nang === kn; });
    return m && m.cach ? m.cach : null;
  }

  function cauMoi() {
    if (!s) return;
    huyHen();
    boKeo();
    if (!s.van.conCau()) { ketThuc(); return; }
    const kq = CTK().cauKeTiep(s.van, s.vong, toiDaVong(), { dangCua: dangCua, cach: cachCua, daHoi: s.daHoi });
    if (!kq) { ketThuc(); return; }
    const q = kq.q;
    s.daHoi.push(q.cau_truc);
    if (kq.vongMoi || !s.vong) s.vong = { ky_nang: q.ky_nang, ct: q.cau_truc, da: [q.cau_truc], so: 1, loai: q.cau_truc.loai };
    else { s.vong.da.push(q.cau_truc); s.vong.so++; }
    s.q = q;
    s.nhap = '';
    s.dem = {};
    s.khoa = false;
    s.giayCauCa = null;
    K().anGoiY();
    const l = q.cau_truc.loai;
    if (kq.vongMoi) {
      if (l === 'kiem_dem') moKiemDem(q);
      else if (l === 'bieu_do') moBieuDo(q);
      else if (l === 'kha_nang') moHopBong(q);
      else moUocLuong(q);
    } else if (l === 'kha_nang') hoiKhaNang(q);
    else hoiSoLieu(q);
  }

  /** Hiện câu (ghi cau_hien) với các lựa chọn theo đúng thứ tự trên màn hình. */
  function hienCau(q) {
    let lc = null;
    if (q.dang === 'chon_dap_an' && q.lua_chon) lc = sapLuaChon(q).map(function (x, i) { return { gia_tri: x.gia_tri, loi: x.loi, vi_tri: 'nut_' + (i + 1) }; });
    s.luaChon = lc || [];
    s.van.hienCau(q, lc || undefined);
    K().tienDo();
  }
  /** Loại cá theo thứ tự hàng, khả năng theo thứ tự SGK, số theo thứ tự tăng. */
  function sapLuaChon(q) {
    const ct = q.cau_truc;
    const ds = q.lua_chon.slice();
    if (ct.loai === 'kha_nang') return THU_TU_KN.map(function (v) { return ds.find(function (x) { return x.gia_tri === v; }) || { gia_tri: v, loi: NH().nhanBietLoi(ct, v) }; });
    if (ct.ten && typeof q.dap_an === 'string') return ds.sort(function (a, b) { return ct.ten.indexOf(a.gia_tri) - ct.ten.indexOf(b.gia_tri); });
    return ds.sort(function (a, b) { return Number(a.gia_tri) - Number(b.gia_tri); });
  }

  /* ---------------- Hồ cá (kiểm đếm, biểu đồ) ---------------- */

  function veHo(ct, cot, hang) {
    const vt = CTK().viTriRai(ct, cot, hang);
    const rng = NH().taoRng((ct.hg || 1) * 17 + 3);
    s.ca = vt.map(function (p, i) { return { k: p.k, i: i, bat: false }; });
    lay('cc-nuoc').innerHTML = vt.map(function (p, i) {
      const dx = Math.round((rng() < 0.5 ? -1 : 1) * (14 + rng() * 22));
      const t = lam1(5 + rng() * 4);
      return '<button type="button" class="cc-ca" data-i="' + i + '" aria-label="' + esc(CTK().nhanCa(p.k)) + '" style="left:' + lam1(7 + p.x * 86) + '%;top:' + lam1(9 + p.y * 82) + '%;--dx:' + dx + 'px;--t:' + t + 's;--tre:-' + lam1(rng() * t) + 's;--h:' + (dx > 0 ? 1 : -1) + '">' +
        '<span class="cc-ca-boi">' + CTK().caNho(p.k) + '</span></button>';
    }).join('');
  }
  function conLai() { return s.ca.filter(function (c) { return !c.bat; }).length + (s.cam ? 1 : 0); }
  function caEl(i) { return dom.san.querySelector('.cc-ca[data-i="' + i + '"]'); }

  function moKiemDem(q) {
    const ct = q.cau_truc;
    s.pha = 'cau';
    s.gio = {};
    s.bang = {};
    s.cam = null;
    ct.ten.forEach(function (k) { s.gio[k] = 0; });
    dom.san.className = 'kc-game cc-san cc-kd';
    dom.san.innerHTML =
      '<div class="cc-tren">' +
        '<div class="cc-ho" id="cc-ho"><img class="cc-gai" src="' + esc(anhGai()) + '" alt="">' +
          '<div class="cc-nuoc" id="cc-nuoc"></div>' +
          '<div class="cc-tay" id="cc-tay" aria-live="polite"><span class="cc-tay-ca" id="cc-tay-ca"></span><small>Câu được</small></div></div>' +
        '<div class="cc-hoi hidden" id="cc-hoi"></div>' +
      '</div>' +
      '<div class="cc-gio-hang" id="cc-gio-hang">' + ct.ten.map(function (k) {
        return '<button type="button" class="cc-gio" data-gio="' + k + '" aria-label="Giỏ ' + esc(CTK().tenCa(k)) + '">' +
          '<span class="cc-gio-trong" data-loai="' + k + '"></span><span class="cc-gio-than"></span>' +
          '<span class="cc-gio-nhan">' + CTK().caNho(k) + '<b>' + esc(CTK().nhanCa(k)) + '</b></span></button>';
      }).join('') + '</div>';
    hienCau(q);
    if (q.on_lai) {
      s.ca = [];
      // Câu quay lại: bé đã câu, phân loại hồ này rồi; cá nằm sẵn trong giỏ để bé đếm lại
      ct.ten.forEach(function (k, i) {
        s.gio[k] = ct.so[i];
        let h = '';
        for (let j = 0; j < ct.so[i]; j++) h += '<i class="cc-con moi" data-loai="' + k + '" data-j="' + j + '" style="animation-delay:' + lam1(j * 0.05) + 's">' + CTK().caNho(k) + '</i>';
        dom.san.querySelector('.cc-gio[data-gio="' + k + '"] .cc-gio-trong').innerHTML = h;
      });
      s.pha = 'xep';
      K().de('Cá đã ở trong giỏ, mình cùng đếm lại nhé', null, { nay: true, docNgay: true });
      hen(hoiDau, 1200);
      return;
    }
    veHo(ct, 6, 4);
    K().de('Câu cá rồi thả vào đúng giỏ', 'Con chạm vào từng con cá để câu, rồi thả vào đúng giỏ nhé', { nay: true, docNgay: true });
  }

  function moBieuDo(q) {
    const ct = q.cau_truc;
    s.pha = 'cau';
    s.xo = [];
    dom.san.className = 'kc-game cc-san cc-bdc';
    dom.san.innerHTML =
      '<div class="cc-trai">' +
        '<div class="cc-ho cc-ho-bd" id="cc-ho"><div class="cc-nuoc" id="cc-nuoc"></div>' +
          '<div class="cc-xo" id="cc-xo" aria-label="Xô cá"><span class="cc-xo-ca" id="cc-xo-ca"></span><span class="cc-xo-than"></span></div>' +
          '<img class="cc-gai cc-gai-bd" src="' + esc(anhGai()) + '" alt=""></div>' +
        '<div class="cc-hoi hidden" id="cc-hoi"></div>' +
      '</div>' +
      '<div class="cc-bd" id="cc-bd">' + bieuDoHtml(ct) + '</div>';
    hienCau(q);
    if (q.on_lai) {
      s.ca = [];
      // Câu quay lại: không câu lại, Gai Long dựng lại biểu đồ tranh của hồ cũ
      xepBieuDo();
      return;
    }
    veHo(ct, 5, 7);
    K().de('Chạm vào cá để câu hết cá trong hồ', 'Con chạm vào từng con cá để câu nhé. Câu hết cá thì mình xếp thành biểu đồ tranh', { nay: true, docNgay: true });
  }

  function bieuDoHtml(ct) {
    const cot = Math.max(6, Math.max.apply(null, ct.so));
    return '<p class="cc-bd-ten">' + esc(CTK().tieuDeBieuDo(ct)) + '</p><div class="cc-bd-luoi" style="--cot:' + cot + '">' +
      ct.ten.map(function (k, r) {
        let o = '';
        for (let j = 0; j < cot; j++) o += '<i class="cc-bd-o" data-loai="' + k + '" data-j="' + j + '"></i>';
        return '<div class="cc-bd-hang" data-hang="' + r + '"><span class="cc-bd-nhan">' + CTK().caNho(k) + '<b>' + esc(CTK().nhanCa(k)) + '</b></span><span class="cc-bd-cac">' + o + '</span></div>';
      }).join('') + '</div><p class="cc-bd-chu">Mỗi hình là 1 con</p>';
  }

  /* ---------------- Chạm, kéo, thả ---------------- */

  function xuongTay(e) {
    if (!s || s.khoa || K().dangKhoa() || (e.button != null && e.button > 0)) return;
    const ca = e.target.closest('.cc-ca');
    if (ca && s.pha === 'cau') {
      e.preventDefault();
      batCa(+ca.getAttribute('data-i'), e);
      return;
    }
    const tay = e.target.closest('#cc-tay');
    if (tay && s.cam && s.pha === 'cau') { e.preventDefault(); batDauKeo(e); }
  }

  function batCa(i, e) {
    const c = s.ca[i];
    if (!c || c.bat) return;
    const loai = s.vong.loai;
    if (loai === 'kiem_dem' && s.cam) {
      K().bao('Con thả con cá đang cầm vào giỏ trước nhé');
      rung(lay('cc-tay'));
      return;
    }
    c.bat = true;
    const el = caEl(i);
    const r = el ? el.getBoundingClientRect() : null;
    if (el) el.classList.add('da-bat');
    s.soCa++;
    AT().bat('cham');
    if (loai === 'bieu_do') {
      s.xo.push(c.k);
      s.van.thaoTac('cau', { doi_tuong: 'ca', loai: c.k, vi_tri: 'ca_' + (i + 1), trong_xo: s.xo.length, con_lai: conLai() });
      bayVaoXo(c.k, r);
      K().congDiem(10);
      if (!conLai()) hen(xepBieuDo, 650);
      return;
    }
    s.cam = { k: c.k, i: i, luc: Date.now() };
    s.van.thaoTac('cau', { doi_tuong: 'ca', loai: c.k, vi_tri: 'ca_' + (i + 1), con_lai: conLai() - 1 });
    if (e && e.pointerId != null) batDauKeo(e);
    else veTay();
  }

  function batDauKeo(e) {
    boKeo();
    const el = document.createElement('div');
    el.className = 'cc-keo';
    el.innerHTML = CTK().caNho(s.cam.k);
    el.style.left = e.clientX + 'px';
    el.style.top = e.clientY + 'px';
    dom.san.appendChild(el);
    s.keo = { id: e.pointerId, x0: e.clientX, y0: e.clientY, di: 0, el: el };
    veTay(true);
  }
  function diTay(e) {
    if (!s || !s.keo || e.pointerId !== s.keo.id) return;
    e.preventDefault();
    const k = s.keo;
    k.el.style.left = e.clientX + 'px';
    k.el.style.top = e.clientY + 'px';
    k.di = Math.max(k.di, Math.abs(e.clientX - k.x0) + Math.abs(e.clientY - k.y0));
    const g = gioDuoi(e.clientX, e.clientY);
    dom.san.querySelectorAll('.cc-gio').forEach(function (b) { b.classList.toggle('tren', b.getAttribute('data-gio') === g); });
  }
  function nhacTay(e) {
    if (!s || !s.keo || (e.pointerId != null && e.pointerId !== s.keo.id)) return;
    const g = e.type === 'pointerup' ? gioDuoi(e.clientX, e.clientY) : null;
    boKeo();
    if (g && s.cam) thaVao(g, 'keo');
    else veTay();
  }
  function boKeo() {
    if (s && s.keo) { s.keo.el.remove(); s.keo = null; }
    if (dom) dom.san.querySelectorAll('.cc-gio.tren').forEach(function (b) { b.classList.remove('tren'); });
  }
  function gioDuoi(x, y) {
    let ra = null;
    dom.san.querySelectorAll('.cc-gio').forEach(function (b) {
      const r = b.getBoundingClientRect();
      if (x >= r.left - 8 && x <= r.right + 8 && y >= r.top - 30 && y <= r.bottom + 8) ra = b.getAttribute('data-gio');
    });
    return ra;
  }
  /** Con cá đang cầm hiện ở ô "Câu được" (bé chạm giỏ để thả, hoặc kéo từ đó). an: đang kéo thì để trống. */
  function veTay(an) {
    const tay = lay('cc-tay');
    if (!tay) return;
    const co = !!(s.cam && !an);
    tay.classList.toggle('co', co);
    lay('cc-tay-ca').innerHTML = co ? CTK().caNho(s.cam.k) : '';
    dom.san.querySelectorAll('.cc-gio').forEach(function (b) { b.classList.toggle('cho', !!s.cam); });
  }

  function thaVao(gio, cach) {
    if (!s || !s.cam || s.pha !== 'cau') return;
    const k = s.cam.k;
    const b = dom.san.querySelector('.cc-gio[data-gio="' + gio + '"]');
    if (gio === k) {
      s.gio[k]++;
      s.cam = null;
      s.van.thaoTac('tha', { doi_tuong: 'ca', loai: k, den: 'gio_' + gio, dung: true, trong_gio: s.gio[k], con_lai: conLai(), cach: cach || 'cham' });
      const trong = b.querySelector('.cc-gio-trong');
      trong.insertAdjacentHTML('beforeend', '<i class="cc-con moi" data-loai="' + k + '" data-j="' + (s.gio[k] - 1) + '">' + CTK().caNho(k) + '</i>');
      AT().bat('go_phim');
      const p = K().tamCua(b);
      K().congDiem(10, p.x, p.y - 70);
      veTay();
      if (!conLai()) hen(hoiDau, 600);
      return;
    }
    s.van.thaoTac('tha', { doi_tuong: 'ca', loai: k, den: 'gio_' + gio, dung: false, trong_gio: s.gio[gio] || 0, cach: cach || 'cham' });
    AT().bat('sai');
    rung(b);
    K().bao('Đây là ' + CTK().tenCa(k) + '. Con thả vào giỏ ' + CTK().tenCa(k) + ' nhé', 'sai', 2.6);
    veTay();
  }

  /** Cá bay vào xô (biểu đồ): bay từ chỗ câu tới xô rồi nằm trong xô. */
  function bayVaoXo(k, r) {
    const xo = lay('cc-xo');
    const nho = lay('cc-xo-ca');
    const them = function () { nho.insertAdjacentHTML('beforeend', '<i data-loai="' + k + '" style="--xoay:' + (Math.round(Math.random() * 60) - 30) + 'deg">' + CTK().caNho(k, Math.random() < 0.5) + '</i>'); };
    if (!r || !xo) { them(); return; }
    const d = xo.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'cc-keo cc-bay-xo';
    el.innerHTML = CTK().caNho(k);
    el.style.left = (r.left + r.width / 2) + 'px';
    el.style.top = (r.top + r.height / 2) + 'px';
    dom.san.appendChild(el);
    void el.offsetWidth;
    el.style.left = (d.left + d.width / 2) + 'px';
    el.style.top = (d.top + d.height * 0.35) + 'px';
    el.classList.add('di');
    setTimeout(function () { el.remove(); them(); }, 420);
  }

  /** Câu hết cá: Gai Long xếp cá cùng loại vào từng hàng, hàng này xong mới tới hàng sau. */
  function xepBieuDo() {
    const ct = s.q.cau_truc;
    s.pha = 'xep';
    K().de('Xếp cá cùng loại vào một hàng: đó là biểu đồ tranh', 'Mình xếp các con cá cùng loại vào một hàng. Hình này gọi là biểu đồ tranh', { nay: true, docNgay: true });
    let t = 350;
    ct.ten.forEach(function (k, r) {
      hen(function () { const h = dom.san.querySelector('.cc-bd-hang[data-hang="' + r + '"]'); if (h) h.classList.add('dang-xep'); }, t);
      for (let j = 0; j < ct.so[r]; j++) {
        hen(function () {
          const o = dom.san.querySelector('.cc-bd-hang[data-hang="' + r + '"] .cc-bd-o[data-j="' + j + '"]');
          if (o) { o.innerHTML = CTK().caNho(k); o.classList.add('co'); }
          const trongXo = lay('cc-xo-ca').querySelector('i[data-loai="' + k + '"]');
          if (trongXo) trongXo.remove();
          AT().bat('go_phim');
        }, t);
        t += 95;
      }
      t += 180;
      hen(function () { const h = dom.san.querySelector('.cc-bd-hang[data-hang="' + r + '"]'); if (h) h.classList.remove('dang-xep'); }, t);
      t += 120;
    });
    hen(hoiDau, t + 500);
  }

  /* ---------------- Hỏi trên số liệu (kiểm đếm, biểu đồ) ---------------- */

  /** Câu đầu của lượt: bé vừa câu xong (câu này đã hiện từ lúc bắt đầu câu cá). */
  function hoiDau() {
    if (!s) return;
    s.giayCauCa = s.q.on_lai ? null : giayTrongCau();
    const ho = lay('cc-ho');
    if (ho) ho.classList.add('hidden');
    lay('cc-hoi').classList.remove('hidden');
    dom.san.classList.add('dang-hoi');
    veHoi(s.q);
  }
  /** Câu thứ hai, ba của lượt: cùng số liệu, cảnh giữ nguyên. */
  function hoiSoLieu(q) {
    hienCau(q);
    veHoi(q);
  }

  function veHoi(q) {
    const ct = q.cau_truc;
    s.pha = 'hoi';
    s.khoa = false;
    s.nhap = '';
    s.dem = {};
    dom.san.querySelectorAll('.da-dem').forEach(function (el) { el.classList.remove('da-dem'); el.removeAttribute('data-n'); });
    dom.san.querySelectorAll('.sang, .moi').forEach(function (el) { el.classList.remove('sang', 'moi'); });
    let h = '';
    if (ct.loai === 'kiem_dem') {
      h += '<div class="cc-bang-khung"><p class="cc-nho">Số con mỗi loại</p><table class="cc-bang"><tr>' +
        ct.ten.map(function (k) { return '<th>' + CTK().caNho(k) + '<span>' + esc(CTK().nhanCa(k)) + '</span></th>'; }).join('') + '</tr><tr>' +
        ct.ten.map(function (k) { return '<td data-loai="' + k + '"' + (s.bang[k] != null ? ' class="co"' : '') + '>' + (s.bang[k] != null ? s.bang[k] : '?') + '</td>'; }).join('') + '</tr></table>' +
        '<p class="cc-nho cc-meo">Chạm từng con trong giỏ để đếm</p></div>';
    } else h += '<p class="cc-nho cc-meo">Chạm từng hình trên biểu đồ để đếm</p>';
    h += '<div class="cc-tra-loi">';
    if (q.dang === 'nhap_so') {
      h += '<div class="cc-o" id="cc-o" aria-live="polite"></div>' +
        '<div class="ban-phim ban-phim-ngang cc-phim" id="cc-phim">' +
        [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) { return '<button type="button" data-k="' + n + '">' + n + '</button>'; }).join('') +
        '<button type="button" data-k="xoa" class="phim-xoa" aria-label="Xóa">⌫</button><button type="button" data-k="0">0</button><button type="button" data-k="xong" class="phim-xong">Xong</button></div>';
    } else {
      h += '<div class="cc-chon-hang" id="cc-chon-hang">' + s.luaChon.map(function (x, i) {
        const v = NH().veLuaChon(ct, x.gia_tri);
        return '<button type="button" class="cc-chon" data-i="' + i + '">' + (v.hinh || '') + '<b>' + esc(v.nhan) + '</b></button>';
      }).join('') + '</div>';
    }
    h += '</div>';
    lay('cc-hoi').innerHTML = h;
    K().de(q.de, q.de_doc, { nay: true, docNgay: true });
  }

  function demCon(el) {
    if (!s || s.pha !== 'hoi' || s.khoa || el.classList.contains('da-dem')) return;
    const k = el.getAttribute('data-loai');
    s.dem[k] = (s.dem[k] || 0) + 1;
    el.classList.add('da-dem');
    el.setAttribute('data-n', s.dem[k]);
    s.van.thaoTac('dem', { doi_tuong: 'ca', loai: k, gia_tri: s.dem[k] });
    AT().bat('go_phim');
  }

  function go(k) {
    if (!s || s.pha !== 'hoi' || s.khoa || K().dangKhoa() || !s.q || s.q.dang !== 'nhap_so' || s.nhap.length >= 2) return;
    s.nhap += k;
    const o = lay('cc-o');
    o.textContent = s.nhap;
    o.classList.remove('sai');
    AT().bat('go_phim');
    s.van.thaoTac('go_so', { gia_tri: Number(k), hien_tai: s.nhap });
  }
  function xoa() {
    if (!s || s.pha !== 'hoi' || s.khoa || !s.nhap) return;
    s.nhap = s.nhap.slice(0, -1);
    lay('cc-o').textContent = s.nhap;
    s.van.thaoTac('xoa', { hien_tai: s.nhap });
  }
  function chotSo() {
    if (!s || s.pha !== 'hoi' || s.khoa || K().dangKhoa() || !s.nhap) return;
    const v = Number(s.nhap);
    const extra = { nhap: s.nhap };
    if (s.giayCauCa != null && s.q.lan_thu === 1) extra.giay_cau_ca = s.giayCauCa;
    if (Object.keys(s.dem).length) extra.da_dem = Object.assign({}, s.dem);
    chamSoLieu(v, extra, lay('cc-o'));
  }
  function chonDapAn(i) {
    if (!s || s.pha !== 'hoi' || s.khoa || K().dangKhoa()) return;
    const x = s.luaChon[i];
    const b = dom.san.querySelector('.cc-chon[data-i="' + i + '"]');
    if (!x || !b || b.disabled) return;
    s.van.thaoTac('chon', { doi_tuong: 'lua_chon', gia_tri: x.gia_tri, vi_tri: x.vi_tri });
    const extra = { vi_tri: x.vi_tri };
    if (s.giayCauCa != null) extra.giay_cau_ca = s.giayCauCa;
    if (Object.keys(s.dem).length) extra.da_dem = Object.assign({}, s.dem);
    chamSoLieu(x.gia_tri, extra, b);
  }

  function chamSoLieu(v, extra, el) {
    const q = s.q;
    const kq = s.van.traLoi(v, extra);
    if (!kq) return;
    const ct = q.cau_truc;
    if (kq.dung) {
      s.khoa = true;
      s.soDung++;
      if (el) el.classList.add('dung');
      if (ct.loai === 'kiem_dem' && ct.hoi === 'dem') {
        const k = ct.ten[ct.a];
        s.bang[k] = v;
        const td = dom.san.querySelector('.cc-bang td[data-loai="' + k + '"]');
        if (td) { td.textContent = v; td.classList.add('co', 'moi'); }
      }
      thuong(kq, el);
      K().bao('Đúng rồi! ' + q.ket_luan, 'dung', 1.8);
      hen(cauMoi, 1900);
      return;
    }
    AT().bat('sai');
    if (kq.thuLai) {
      if (el) { el.classList.add('sai'); rung(el); }
      K().bao(kq.loiNoi + '. Con thử lại nhé', 'sai', 3.2);
      AT().doc(kq.loiNoi);
      s.nhap = '';
      hen(function () { const o = lay('cc-o'); if (o) { o.textContent = ''; o.classList.remove('sai'); } if (el) el.classList.remove('sai'); }, 700);
      return;
    }
    s.khoa = true;
    if (el) el.classList.add('sai');
    danhDauDung();
    hen(function () {
      K().phanHoiCau(q, v, Object.assign({}, kq, { moDau: q.dang === 'nhap_so' ? 'Con trả lời' : 'Con chọn' }), function () { cauMoi(); });
    }, 700);
  }

  function danhDauDung() {
    const q = s.q;
    const i = s.luaChon.findIndex(function (x) { return String(x.gia_tri) === String(q.dap_an); });
    const b = dom.san.querySelector('.cc-chon[data-i="' + i + '"], .cc-kn-nut[data-i="' + i + '"], .cc-ul-nut[data-i="' + i + '"]');
    if (b) b.classList.add('dung');
  }

  function thuong(kq, el) {
    const p = el ? K().tamCua(el) : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    K().congDiem(kq.ketQua === 'dung_ngay' ? 100 : 40, p.x, p.y - 40, kq.quaMong ? '+' + kq.quaMong + ' quả mọng' : null);
    K().phao(p.x, p.y, 16);
    AT().bat('dung');
  }

  /* ---------------- Hộp bóng: chắc chắn, có thể, không thể ---------------- */

  function moHopBong(q) {
    const ct = q.cau_truc;
    dom.san.className = 'kc-game cc-san cc-hb';
    dom.san.innerHTML =
      '<div class="cc-hop-khung">' +
        '<div class="cc-hop" id="cc-hop">' + CTK().veHop(ct, { khongChu: true }) + '</div>' +
        '<img class="cc-gai cc-gai-hop" src="' + esc(anhGai()) + '" alt="">' +
        '<p class="cc-hop-chu">' + esc(ct.vat === 'ca' ? 'Không nhìn vào xô, Gai Long bắt ra ' + ct.lay + ' con cá' : 'Không nhìn vào hộp, Gai Long lấy ra ' + ct.lay + ' quả bóng') + '</p>' +
      '</div>' +
      '<div class="cc-kn" id="cc-kn"></div>';
    hoiKhaNang(q);
  }

  const DAU_KN = {
    chac_chan: '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="#06d6a0"/><path d="M11 21 l6 6 l12 -13" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    co_the: '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="#ffb020"/><path d="M20 2 A18 18 0 0 1 20 38 Z" fill="#fff" opacity=".45"/><text x="20" y="28" text-anchor="middle" font-size="24" font-weight="800" fill="#fff" font-family="Baloo 2, Arial Rounded MT Bold, sans-serif">?</text></svg>',
    khong_the: '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="#ef476f"/><path d="M13 13 L27 27 M27 13 L13 27" stroke="#fff" stroke-width="5" stroke-linecap="round"/></svg>'
  };

  function hoiKhaNang(q) {
    const ct = q.cau_truc;
    s.pha = 'hoi';
    s.khoa = false;
    const hop = lay('cc-hop');
    if (hop) hop.innerHTML = CTK().veHop(ct, { khongChu: true });
    hienCau(q);
    const c = CTK().cauSGK(ct, 'Gai Long');
    const trong = '<span class="cc-kn-trong" id="cc-kn-trong">?</span>';
    lay('cc-kn').innerHTML =
      '<div class="cc-kn-the"><p class="cc-nho">' + (ct.lay === 1 ? 'Chọn từ thích hợp' : 'Chọn khả năng xảy ra') + '</p>' +
        '<p class="cc-kn-cau">' + esc(c.truoc) + (ct.lay === 1 ? trong : '') + esc(c.sau) + (ct.lay === 2 ? '<br>' + trong : '') + '</p></div>' +
      '<div class="cc-kn-hang">' + s.luaChon.map(function (x, i) {
        return '<button type="button" class="cc-kn-nut" data-i="' + i + '" data-v="' + x.gia_tri + '">' + DAU_KN[x.gia_tri] + '<b>' + esc(CTK().KHA_NANG_NHAN[x.gia_tri]) + '</b></button>';
      }).join('') + '</div>' +
      '<div class="cc-boc hidden" id="cc-boc"><p class="cc-nho">' + esc(ct.vat === 'ca' ? 'Gai Long bắt thử ' + SO_LAN_BOC + ' lần (bắt xong thả lại vào xô)' : 'Gai Long lấy thử ' + SO_LAN_BOC + ' lần (lấy xong bỏ lại vào hộp)') + '</p><div class="cc-boc-hang" id="cc-boc-hang"></div></div>';
    K().de(q.de, q.de_doc, { nay: true, docNgay: true });
  }

  function maSo(t) { let h = 7; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0; return h; }

  function chonKhaNang(i) {
    if (!s || s.pha !== 'hoi' || s.khoa || K().dangKhoa()) return;
    const x = s.luaChon[i];
    if (!x) return;
    const q = s.q, ct = q.cau_truc;
    s.khoa = true;
    s.pha = 'boc';
    const giayChon = giayTrongCau();
    s.van.thaoTac('chon', { doi_tuong: 'the_kha_nang', gia_tri: x.gia_tri, vi_tri: x.vi_tri });
    AT().bat('cham');
    const nut = dom.san.querySelector('.cc-kn-nut[data-i="' + i + '"]');
    dom.san.querySelectorAll('.cc-kn-nut').forEach(function (b) { b.disabled = true; });
    if (nut) nut.classList.add('chon');
    const tr = lay('cc-kn-trong');
    if (tr) { tr.textContent = CTK().KHA_NANG[x.gia_tri]; tr.classList.add('co'); }
    const ds = CTK().bocThu(ct, SO_LAN_BOC, maSo(q.ma_cau) + q.stt);
    const boc = lay('cc-boc'), hang = lay('cc-boc-hang');
    boc.classList.remove('hidden');
    hang.innerHTML = ds.map(function (b, j) {
      return '<span class="cc-boc-o" data-j="' + j + '"><small>Lần ' + (j + 1) + '</small><span class="cc-boc-vat">' +
        b.mau.map(function (m) { return ct.vat === 'ca' ? CTK().caNho(m) : CTK().bongNho(m); }).join('') + '</span>' +
        '<b class="cc-boc-dau ' + (b.xay_ra ? 'co' : 'khong') + '">' + (b.xay_ra ? '✓' : '✕') + '</b></span>';
    }).join('');
    ds.forEach(function (b, j) {
      hen(function () {
        const o = hang.querySelector('.cc-boc-o[data-j="' + j + '"]');
        if (o) o.classList.add('hien');
        const hopEl = lay('cc-hop');
        if (hopEl) { hopEl.classList.remove('lac'); void hopEl.offsetWidth; hopEl.classList.add('lac'); }
        s.van.thaoTac('boc', { doi_tuong: ct.vat === 'ca' ? 'xo_ca' : 'hop_bong', gia_tri: b.mau.length === 1 ? b.mau[0] : b.mau.join('+'), lan: j + 1, xay_ra: b.xay_ra });
        AT().bat(b.xay_ra ? 'qua_mong' : 'doi_lan');
      }, 450 + j * 720);
    });
    hen(function () { chamKhaNang(x, nut, ds, giayChon); }, 450 + SO_LAN_BOC * 720 + 250);
  }

  function chamKhaNang(x, nut, ds, giayChon) {
    const q = s.q;
    const extra = { vi_tri: x.vi_tri, giay_chon: giayChon, boc: ds.map(function (b) { return b.mau.join('+'); }) };
    if (x.gia_tri !== q.dap_an) extra.loai_nham = q.dap_an + '_thanh_' + x.gia_tri;
    const kq = s.van.traLoi(x.gia_tri, extra);
    if (!kq) return;
    const lyDo = CTK().lyDoKN(q.cau_truc);
    if (kq.dung) {
      s.soDung++;
      if (nut) nut.classList.add('dung');
      thuong(kq, nut);
      K().bao('Đúng rồi! ' + lyDo + '.', 'dung', 2.9);
      AT().doc(q.ket_luan);
      hen(cauMoi, 3000);
      return;
    }
    AT().bat('sai');
    if (nut) nut.classList.add('sai');
    danhDauDung();
    const hop = lay('cc-hop');
    if (hop) hop.innerHTML = CTK().veHop(q.cau_truc, { khongChu: true, sang: q.cau_truc.m });
    hen(function () { K().phanHoiCau(q, x.gia_tri, kq, function () { cauMoi(); }); }, 1100);
  }

  /* ---------------- Ước lượng theo nhóm chục ---------------- */

  function moUocLuong(q) {
    const ct = q.cau_truc;
    dom.san.className = 'kc-game cc-san cc-ul';
    dom.san.innerHTML =
      '<div class="cc-ul-ho"><div class="cc-dan" id="cc-dan">' + CTK().veDan(ct) + '</div>' +
        '<div class="cc-dong-ho" id="cc-dong-ho" aria-hidden="true"><i></i></div>' +
        '<p class="cc-ul-lan hidden" id="cc-ul-lan">' + esc(ct.vat === 'qua' ? 'Quả mọng đã được che lại! Con ước lượng nhé' : 'Đàn cá lặn xuống rồi! Con ước lượng nhé') + '</p></div>' +
      '<div class="cc-ul-duoi"><img class="cc-gai cc-gai-ul" src="' + esc(anhGai()) + '" alt=""><div class="cc-ul-chon" id="cc-ul-chon"></div></div>';
    hienCau(q);
    lay('cc-ul-chon').innerHTML = s.luaChon.map(function (x, i) {
      return '<button type="button" class="cc-ul-nut" data-i="' + i + '" disabled><b>Khoảng ' + x.gia_tri + '</b><small>' + (x.gia_tri / 10) + ' chục</small></button>';
    }).join('');
    K().de(q.de, q.de_doc, { nay: true, docNgay: true });
    xemDan();
  }

  /** Đàn hiện 3 giây (thanh thời gian chạy lùi) rồi lặn xuống; lúc đó mới chọn được. */
  function xemDan() {
    s.pha = 'xem';
    const dan = lay('cc-dan'), dh = lay('cc-dong-ho');
    dan.classList.remove('mo');
    lay('cc-ul-lan').classList.add('hidden');
    dom.san.querySelectorAll('.cc-ul-nut').forEach(function (b) { b.disabled = true; });
    dh.classList.remove('chay', 'het');
    void dh.offsetWidth;
    dh.classList.add('chay');
    hen(function () {
      s.pha = 'hoi';
      dan.classList.add('mo');
      dh.classList.remove('chay');
      dh.classList.add('het');
      lay('cc-ul-lan').classList.remove('hidden');
      dom.san.querySelectorAll('.cc-ul-nut').forEach(function (b) { if (!b.classList.contains('gach')) b.disabled = false; });
    }, MS_XEM_DAN);
  }

  function chonUocLuong(i) {
    if (!s || s.pha !== 'hoi' || s.khoa || K().dangKhoa()) return;
    const x = s.luaChon[i];
    if (!x) return;
    const q = s.q, ct = q.cau_truc;
    s.khoa = true;
    const giay = giayTrongCau();
    s.van.thaoTac('chon', { doi_tuong: 'lua_chon', gia_tri: x.gia_tri, vi_tri: x.vi_tri });
    // 03a mục 2.7: chọn quá 10 giây là cờ "đếm từng cái" (không phải lỗi); lần xem lại nhờ gợi ý không tính
    const kq = s.van.traLoi(x.gia_tri, { vi_tri: x.vi_tri, giay_chon: giay, dem_tung_con: giay > 10 && !q.goiYCap });
    if (!kq) return;
    const nut = dom.san.querySelector('.cc-ul-nut[data-i="' + i + '"]');
    const dan = lay('cc-dan');
    dan.innerHTML = CTK().veDan(ct, { nhan: true });
    dan.classList.remove('mo');
    lay('cc-ul-lan').classList.add('hidden');
    if (kq.dung) {
      s.soDung++;
      if (nut) nut.classList.add('dung');
      thuong(kq, nut);
      K().bao('Đúng rồi! Có ' + ct.n + ' ' + (ct.vat === 'qua' ? 'quả' : 'con') + ', khoảng ' + q.dap_an + '.', 'dung', 2.6);
      hen(cauMoi, 2700);
      return;
    }
    AT().bat('sai');
    if (nut) nut.classList.add('sai');
    danhDauDung();
    hen(function () { K().phanHoiCau(q, x.gia_tri, kq, function () { cauMoi(); }); }, 1000);
  }

  /* ---------------- Gợi ý ---------------- */

  function goiY() {
    if (!s || !s.q || s.q.xong || K().dangKhoa()) return;
    if (s.pha === 'cau' || s.pha === 'xep') { K().bao(s.vong.loai === 'bieu_do' ? 'Con câu hết cá đã nhé, rồi mình cùng đọc biểu đồ' : 'Con câu hết cá, thả vào giỏ đã nhé'); return; }
    if (s.khoa || (s.pha !== 'hoi' && s.pha !== 'xem')) return;
    const q = s.van.q;
    const ct = q.cau_truc;
    const cap = q.goiYCap + 1;
    if (cap > 3) return;
    let them = null;
    if (cap === 3 && q.dang === 'chon_dap_an' && s.luaChon.length > 2) {
      const sai = s.luaChon.map(function (x, i) { return { x: x, i: i }; }).filter(function (y) { return String(y.x.gia_tri) !== String(q.dap_an); });
      // gạch lựa chọn sai không mang lỗi có tên trước, giữ lại lựa chọn "gần đúng" (đếm sót) để bé tự so
      const hang = function (y) { return y.x.loi.every(function (m) { return m === 'khac'; }) ? 0 : y.x.loi.indexOf('dem-sot') >= 0 ? 2 : 1; };
      sai.sort(function (a, b) { return hang(a) - hang(b); });
      const g = sai[0];
      if (g) {
        them = { loai_bo: g.x.gia_tri };
        const b = dom.san.querySelector('[data-i="' + g.i + '"].cc-chon, [data-i="' + g.i + '"].cc-kn-nut, [data-i="' + g.i + '"].cc-ul-nut');
        if (b) { b.classList.add('gach'); b.disabled = true; }
      }
    }
    if (ct.loai === 'uoc_luong' && cap <= 2 && s.pha === 'hoi') { them = Object.assign({ xem_lai: true }, them || {}); xemDan(); }
    K().goiY(them);
    toSang(ct, cap);
    // Bóng gợi ý che góc dưới bên trái (giỏ, biểu đồ): tự ẩn sau vài giây, phần tô sáng vẫn giữ
    hen(function () { K().anGoiY(); }, 7500);
  }

  /** Tô sáng số liệu cần nhìn (hàng biểu đồ, giỏ, màu bóng). */
  function toSang(ct, cap) {
    let ds = [];
    if (ct.loai === 'kha_nang') {
      const hop = lay('cc-hop');
      if (hop && cap >= 2) hop.innerHTML = CTK().veHop(ct, { khongChu: true, sang: ct.m });
      return;
    }
    if (!ct.ten) return;
    if (ct.hoi === 'dem') ds = [ct.a];
    else if (ct.hoi === 'hon' || ct.hoi === 'kem') ds = [ct.a, ct.b];
    else if (ct.hoi === 'bang') ds = [ct.a];
    else ds = ct.ten.map(function (k, i) { return i; });
    ds.forEach(function (i) {
      const k = ct.ten[i];
      const el = dom.san.querySelector('.cc-gio[data-gio="' + k + '"], .cc-bd-hang[data-hang="' + i + '"]');
      if (el) el.classList.add('sang');
    });
  }

  /* ---------------- Chạm (click), phím ---------------- */

  function bamSan(e) {
    if (!s) return;
    const t = e.target;
    let b = t.closest('.cc-phim button');
    if (b) { const k = b.getAttribute('data-k'); if (k === 'xoa') xoa(); else if (k === 'xong') chotSo(); else go(k); return; }
    b = t.closest('.cc-chon');
    if (b) { chonDapAn(+b.getAttribute('data-i')); return; }
    b = t.closest('.cc-kn-nut');
    if (b) { chonKhaNang(+b.getAttribute('data-i')); return; }
    b = t.closest('.cc-ul-nut');
    if (b) { chonUocLuong(+b.getAttribute('data-i')); return; }
    if (s.pha === 'hoi') {
      const c = t.closest('.cc-con, .cc-bd-o.co');
      if (c) { demCon(c); return; }
    }
    if (s.pha !== 'cau' || s.khoa || K().dangKhoa()) return;
    // Bàn phím, trình đọc màn hình (click không có pointerdown): câu cá bằng Enter
    const ca = t.closest('.cc-ca');
    if (ca && e.detail === 0) { batCa(+ca.getAttribute('data-i'), null); return; }
    const gio = t.closest('.cc-gio');
    if (gio && s.cam && !s.keo && Date.now() - s.cam.luc > 250) thaVao(gio.getAttribute('data-gio'), 'cham');
  }

  function phim(e) {
    if (!s || !s.q) return;
    const k = e.key;
    if (s.pha !== 'hoi') return;
    if (s.q.dang === 'nhap_so' && s.q.cau_truc.ten) {
      if (/^[0-9]$/.test(k)) { go(k); e.preventDefault(); }
      else if (k === 'Backspace') { xoa(); e.preventDefault(); }
      else if (k === 'Enter') { chotSo(); e.preventDefault(); }
      return;
    }
    if (/^[1-4]$/.test(k)) {
      const i = +k - 1;
      const l = s.q.cau_truc.loai;
      if (l === 'kha_nang') chonKhaNang(i);
      else if (l === 'uoc_luong') chonUocLuong(i);
      else chonDapAn(i);
    }
  }

  function rung(el) { if (!el) return; el.classList.remove('rung'); void el.offsetWidth; el.classList.add('rung'); }

  /* ---------------- Tạm dừng, kết thúc ---------------- */

  function tamDung() {
    if (!s) return;
    s.tamDung = true;
    boKeo();
    veTay();
    dom.san.classList.add('cc-dung');
    // Đang xem đàn cá mà tạm dừng: tiếp tục thì cho xem lại từ đầu
    if (s.pha === 'xem') { huyHen(); s.xemLai = true; }
  }
  function tiepTuc() {
    if (!s) return;
    s.tamDung = false;
    dom.san.classList.remove('cc-dung');
    if (s.xemLai) { s.xemLai = false; xemDan(); }
    const hoan = s.hoan.splice(0);
    hoan.forEach(function (fn) { fn(); });
  }

  function dongPhu(diem) {
    const d = diem.toLocaleString('vi-VN') + ' điểm';
    if (s.cheDo === 'hop_bong') return 'Chọn đúng ' + s.soDung + ' khả năng · ' + d;
    if (s.cheDo === 'uoc_luong') return 'Ước lượng đúng ' + s.soDung + ' lần · ' + d;
    return 'Câu được ' + s.soCa + ' con · trả lời đúng ' + s.soDung + ' câu · ' + d;
  }

  function donDep() {
    huyHen();
    boKeo();
    if (dom) { dom.san.classList.remove('cc-dung'); dom.san.innerHTML = ''; }
  }

  function ketThuc() {
    const o = s.o;
    const diem = K().diem();
    const phu = dongPhu(diem);
    const them = { diem: diem, so_ca: s.soCa, so_dung: s.soDung };
    const van = s.van;
    K().dong();
    donDep();
    s = null;
    van.ketThuc(false, them).then(function (kq) {
      kq.diem = diem;
      kq.dongPhu = phu;
      if (o.onXong) o.onXong(kq);
    });
  }

  function thoat() {
    if (!s) return;
    const o = s.o;
    const diem = K().diem();
    const van = s.van;
    K().dong();
    donDep();
    s = null;
    van.ketThuc(true, { ly_do: 've_dao', diem: diem }).then(function (kq) {
      if (o.onThoat) o.onThoat(kq);
    });
  }

  window.CauCa = { batDau: batDau, _trangThai: function () { return s; } };
  (window.DaoTroChoi = window.DaoTroChoi || {})['cau-ca'] = { ten: 'Câu Cá Thống Kê', khung: true, san: 'cc-san', batDau: batDau, _trangThai: window.CauCa._trangThai };

  /* ============================================================
     Bài học 30 giây (dạy đúng trình tự SGK Bài 64, 65, 66 và Bài 1, 49)
     ============================================================ */

  function hinh(noi) { return '<div class="cc-bh-hinh bh-hien">' + noi + '</div>'; }
  function pt(t, tre) { return '<p class="bh-pt bh-hien" style="--tre:' + (tre || 0) + 's">' + t + '</p>'; }
  function hopBai(mau, so) { return window.CauThongKe.veHop({ loai: 'kha_nang', vat: 'bong', lay: 1, su: 'la', m: 'xanh', mau: mau, so: so }, { khongChu: true }); }

  const BAI = {
    'kiem-dem': {
      ten: 'Thu thập, phân loại, kiểm đếm',
      buoc: [
        { chu: 'Trong hồ có nhiều loại cá. Muốn biết mỗi loại có bao nhiêu con, ta phân loại: con cùng loại cho vào cùng một giỏ.', ve: function () {
          return hinh(window.CauThongKe.veHo({ loai: 'kiem_dem', hoi: 'tong', ten: ['vang', 'xanh', 'do'], so: [5, 3, 4], hg: 21 }));
        } },
        { chu: 'Đếm số con trong mỗi giỏ rồi ghi lại: cá vàng 5 con, cá xanh 3 con, cá đỏ 4 con.', ve: function () {
          return hinh(window.CauThongKe.veGio({ loai: 'kiem_dem', ten: ['vang', 'xanh', 'do'], so: [5, 3, 4] }, { so: true }));
        } },
        { chu: 'So sánh: 3 < 4 < 5. Cá vàng nhiều nhất, cá xanh ít nhất. Có tất cả 5 + 3 + 4 = 12 con cá.', ve: function () {
          return hinh(window.CauThongKe.veGio({ loai: 'kiem_dem', ten: ['vang', 'xanh', 'do'], so: [5, 3, 4] }, { so: true, sang: [0] })) + pt('5 + 3 + 4 = 12', 0.5);
        } },
        { chu: 'Con thử nhé: giỏ nào có nhiều cá nhất?', ve: function () {
          return hinh(window.CauThongKe.veGio({ loai: 'kiem_dem', ten: ['vang', 'xanh', 'do'], so: [4, 7, 6] }));
        }, thu: { lua_chon: ['Cá vàng', 'Cá xanh', 'Cá đỏ'], dung: 'Cá xanh', dung_noi: 'Đúng rồi! Cá xanh có 7 con, nhiều nhất.', sai_noi: 'Mình đếm lại nhé: cá vàng 4, cá xanh 7, cá đỏ 6. Cá xanh nhiều nhất.' } }
      ]
    },
    'bieu-do-tranh': {
      ten: 'Biểu đồ tranh',
      buoc: [
        { chu: 'Xếp các con cá cùng loại vào một hàng. Hình này gọi là biểu đồ tranh.', ve: function () {
          return hinh(window.CauThongKe.veBieuDo({ loai: 'bieu_do', ten: ['vang', 'xanh', 'do'], so: [6, 4, 7] }));
        } },
        { chu: 'Mỗi hình là 1 con cá. Đếm số hình trong mỗi hàng: cá vàng 6 con, cá xanh 4 con, cá đỏ 7 con.', ve: function () {
          return hinh(window.CauThongKe.veBieuDo({ loai: 'bieu_do', ten: ['vang', 'xanh', 'do'], so: [6, 4, 7] }, { so: true }));
        } },
        { chu: 'Hàng dài nhất là loại nhiều nhất: cá đỏ nhiều nhất. Hàng ngắn nhất là loại ít nhất: cá xanh ít nhất.', ve: function () {
          return hinh(window.CauThongKe.veBieuDo({ loai: 'bieu_do', ten: ['vang', 'xanh', 'do'], so: [6, 4, 7] }, { so: true, sang: [1, 2] }));
        } },
        { chu: 'Số cá vàng nhiều hơn số cá xanh mấy con? 6 − 4 = 2. Số cá vàng nhiều hơn số cá xanh 2 con.', ve: function () {
          return hinh(window.CauThongKe.veBieuDo({ loai: 'bieu_do', ten: ['vang', 'xanh', 'do'], so: [6, 4, 7] }, { so: true, sang: [0, 1] })) + pt('6 − 4 = 2', 0.5);
        } },
        { chu: 'Con thử nhé: số cá đỏ nhiều hơn số cá xanh mấy con?', ve: function () {
          return hinh(window.CauThongKe.veBieuDo({ loai: 'bieu_do', ten: ['vang', 'xanh', 'do'], so: [6, 4, 7] }));
        }, thu: { lua_chon: ['3', '7', '11'], dung: '3', dung_noi: 'Đúng rồi! 7 − 4 = 3, số cá đỏ nhiều hơn số cá xanh 3 con.', sai_noi: 'Cá đỏ 7 con, cá xanh 4 con: lấy 7 − 4 = 3 con nhé.' } }
      ]
    },
    'kha-nang': {
      ten: 'Chắc chắn, có thể, không thể',
      buoc: [
        { chu: 'Hộp của Mai có 4 quả bóng xanh. Mai lấy 1 quả: Mai chắc chắn lấy được bóng xanh.', ve: function () { return hinh(hopBai(['xanh'], [4])); } },
        { chu: 'Hộp của Việt có 3 quả bóng đỏ và 1 quả bóng xanh. Việt có thể lấy được bóng xanh, cũng có thể lấy được bóng đỏ.', ve: function () { return hinh(hopBai(['xanh', 'do'], [1, 3])); } },
        { chu: 'Hộp của Nam có 2 quả bóng đỏ và 2 quả bóng vàng. Nam không thể lấy được bóng xanh.', ve: function () { return hinh(hopBai(['do', 'vang'], [2, 2])); } },
        { chu: 'Chắc chắn là sẽ xảy ra. Có thể là có thể xảy ra hoặc không. Không thể là sẽ không xảy ra. Con thử nhé: hộp có 3 quả bóng đỏ, lấy 1 quả, được bóng đỏ là:', ve: function () {
          return hinh(hopBai(['do'], [3]));
        }, thu: { lua_chon: ['Chắc chắn', 'Có thể', 'Không thể'], dung: 'Chắc chắn', dung_noi: 'Đúng rồi! Hộp chỉ có bóng đỏ, lấy quả nào cũng là bóng đỏ.', sai_noi: 'Hộp chỉ có bóng đỏ, lấy quả nào cũng là bóng đỏ: chắc chắn nhé.' } }
      ]
    },
    'uoc-luong': {
      ten: 'Ước lượng theo nhóm chục',
      buoc: [
        { chu: 'Cá bơi thành từng nhóm. Mỗi vòng có 10 con cá.', ve: function () { return hinh(window.CauThongKe.veDan({ loai: 'uoc_luong', vat: 'ca', n: 32, hg: 5 })); } },
        { chu: 'Có 3 vòng, đếm theo chục: 10, 20, 30. Em ước lượng: khoảng 3 chục, tức là khoảng 30 con. Em đếm được 32 con.', ve: function () {
          return hinh(window.CauThongKe.veDan({ loai: 'uoc_luong', vat: 'ca', n: 32, hg: 5 }, { nhan: true }));
        } },
        { chu: 'Con thử nhé: đàn cá này có khoảng bao nhiêu con?', ve: function () { return hinh(window.CauThongKe.veDan({ loai: 'uoc_luong', vat: 'ca', n: 41, hg: 9 })); },
          thu: { lua_chon: ['Khoảng 30', 'Khoảng 40', 'Khoảng 50'], dung: 'Khoảng 40', dung_noi: 'Đúng rồi! 4 vòng là 4 chục, khoảng 40 con.', sai_noi: 'Có 4 vòng, mỗi vòng 10 con: khoảng 40 con nhé.' } }
      ]
    }
  };
  const BAI_CUA_KY_NANG = { 'kiem-dem': 'kiem-dem', 'bieu-do-tranh': 'bieu-do-tranh', 'kha-nang': 'kha-nang', 'uoc-luong-chuc': 'uoc-luong' };

  if (window.BaiHoc && window.BaiHoc.dangKy) {
    Object.keys(BAI).forEach(function (ma) { window.BaiHoc.dangKy(ma, BAI[ma]); });
    // Gắn bài học vào kỹ năng khi bài học đã có (kỹ năng khai ở cau-thong-ke.js, nạp trước bai-hoc.js)
    Object.keys(BAI_CUA_KY_NANG).forEach(function (kn) {
      const k = window.NganHang && window.NganHang.KY_NANG[kn];
      if (k) k.bai_hoc = BAI_CUA_KY_NANG[kn];
    });
  }
})();
