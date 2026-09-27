/* ============================================================
   lat-lich.js – Game Lật Lịch (vùng 6 Phố Đồng Hồ): quảng trường có tháp đồng hồ, tờ lịch lớn và dải giờ trong ngày
   - che_do 'dong_ho' (xem-gio): đồng hồ lớn trên tháp. Đọc giờ rồi chọn thẻ, hoặc kéo kim cho đồng hồ chỉ giờ cho trước:
     kim phút bắt vào từng số (5 phút), kim giờ đi theo như đồng hồ thật; chạm "Kim giờ"/"Kim phút" rồi chạm một số là cách
     thay cho kéo. Bấm Xong để chấm. Ghi xoay (kim nào, giờ trước, giờ sau, số kim chỉ).
   - che_do 'lich' (xem-lich): mỗi câu lật sang tờ lịch mới (lat_trang); cột Thứ Hai … Chủ nhật như SGK. Chạm đầu cột để trả lời
     thứ, chạm ô ngày để trả lời ngày (chon), chạm từng ngày cùng thứ để đếm (dem, bo_chon), chọn số.
   - che_do 'buoi' (ngay-gio): dải 24 giờ chia 5 buổi có mặt trời, mặt trăng. Kéo thẻ giờ vào đúng buổi (keo, tha), xếp ba việc
     vào ba ô theo thứ tự (keo, dat, doi_cot khi chuyển ô, bo_chon khi lấy ra), hoặc chọn đồng hồ điện tử, cách gọi giờ.
   - che_do 'tron' (cúp): mỗi câu tự chọn cảnh theo kỹ năng.
   - Mọi câu được thử 2 lần, rồi màn "Gần đúng rồi" có hình (đồng hồ đúng, tờ lịch tô ô đúng, dải giờ). Gợi ý cấp 3 gạch bớt
     một lựa chọn sai hoặc tô chỗ cần nhìn (ghi trong goi_y).
   - Bài học 30 giây: xem-dong-ho (Bài 29, 31), ngay-gio (Bài 29), xem-lich (Bài 30).
   API: window.LatLich = { batDau(o), _trangThai() }
   ============================================================ */
(function () {
  'use strict';

  let s = null;
  let dom = null;

  function K() { return window.KhungChoi; }
  function NH() { return window.NganHang; }
  function AT() { return window.AmThanh; }
  function T() { return window.CauThoiGian; }
  function DH() { return window.DongHo; }
  function esc(t) { return window.PhanHoi.esc(t); }
  function giamDong() { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
  function rung(el) { if (!el) return; el.classList.remove('ll2-rung'); void el.offsetWidth; el.classList.add('ll2-rung'); }
  function tre(ms, f) { return setTimeout(function () { if (s) f(); }, ms); }

  /* ---------------- Dựng vùng chơi ---------------- */

  function khoiDom() {
    const cha = K().san();
    let san = document.getElementById('ll2-san');
    if (!san) {
      san = document.createElement('div');
      san.className = 'kc-game ll2-san';
      san.id = 'll2-san';
      cha.appendChild(san);
    }
    if (dom && dom.san === san) return dom;
    san.innerHTML = '<div class="ll2-canh" id="ll2-canh"></div>' +
      '<img class="ll2-duc" id="ll2-duc" alt="">' +
      '<div class="ll2-keo-bong hidden" id="ll2-keo-bong" aria-hidden="true"></div>';
    dom = { san: san, canh: san.querySelector('#ll2-canh'), duc: san.querySelector('#ll2-duc'), bong: san.querySelector('#ll2-keo-bong') };
    san.addEventListener('click', onClick);
    san.addEventListener('pointerdown', onPointerDown);
    san.addEventListener('pointermove', onPointerMove);
    san.addEventListener('pointerup', onPointerUp);
    san.addEventListener('pointercancel', onPointerCancel);
    return dom;
  }

  /**
   * o: { van, man, che_do, nen, phu, hinhGoiY, anh(ten), xemBaiHoc, onXong(kq), onThoat(kq) } (xem vaoMan trong app.js)
   */
  function batDau(o) {
    khoiDom();
    s = {
      o: o, van: o.van, q: null, canh: null, canhDaVe: null, cach: null, khoa: false, chuoi: 0, soDung: 0, loaiBo: [],
      gio: { T: 0, kimChon: 'phut', soXoay: 0 }, lich: { trang: null, choLat: false, dem: [], xem: null }, buoi: { chonThe: null, o: [null, null, null] },
      keo: null, hen: []
    };
    dom.san.classList.remove('hidden');
    dom.duc.src = o.anh ? o.anh('sp-duc-long') : '';
    dom.canh.innerHTML = '';
    K().mo({
      van: o.van, game: 'lat-lich', tenGame: 'Lật Lịch', nen: o.nen, phu: o.phu, hinhGoiY: o.hinhGoiY,
      onGoiY: goiY, onThoat: thoat, xemBaiHoc: o.xemBaiHoc, onPhim: phim, onTamDung: huyKeo
    });
    s.van.batDau({ che_do: o.che_do || (o.man && o.man.che_do) || null, thu_lan: 2 });
    cauMoi();
  }

  /* ---------------- Câu hỏi ---------------- */

  function canhCua(ct) { return ct.loai === 'xem_gio' ? 'dong_ho' : ct.loai === 'xem_lich' ? 'lich' : 'buoi'; }

  /** Cách chơi câu này trong Lật Lịch (theo kiểu con và dạng câu của màn). */
  function cachChoi(q) {
    const ct = q.cau_truc, d = q.dang;
    if (ct.loai === 'xem_gio') return ct.kieu === 'quay' && d !== 'chon_dap_an' ? 'quay' : 'chon';
    if (ct.loai === 'ngay_gio') {
      if (ct.kieu === 'buoi' && d !== 'chon_dap_an') return 'keo_buoi';
      if (ct.kieu === 'thu_tu' && d !== 'chon_dap_an') return 'xep';
      return 'chon';
    }
    if (ct.kieu === 'thu') return 'thu';
    if (ct.kieu === 'tuan' && d !== 'chon_dap_an') return 'o_ngay';
    if (ct.kieu === 'dem_thu') return 'dem';
    return 'chon';
  }

  /** Các lựa chọn bé nhìn thấy (ghi vào cau_hien): thẻ, cột thứ trên tờ lịch, các buổi trên dải giờ. */
  function luaChonHien(q, cach) {
    if (cach === 'thu') return T().THU.map(function (c, i) { return { gia_tri: c, vi_tri: 'cot_' + (i + 1) }; });
    if (cach === 'keo_buoi') return T().BUOI.map(function (b) { return { gia_tri: b, vi_tri: 'buoi_' + b }; });
    if (cach === 'chon' || cach === 'dem') {
      let ds = (q.lua_chon || []).slice();
      if (ds.length && typeof ds[0].gia_tri === 'number') ds.sort(function (a, b) { return a.gia_tri - b.gia_tri; });
      return ds.map(function (x, i) { return { gia_tri: x.gia_tri, loi: x.loi, vi_tri: 'the_' + (i + 1) }; });
    }
    return null;
  }

  function cauMoi() {
    if (!s) return;
    huyHen();
    if (!s.van.conCau()) { ketThuc(); return; }
    const q = s.van.lapBan(1)[0];
    if (!q) { ketThuc(); return; }
    const ct = q.cau_truc;
    const cach = cachChoi(q);
    if (cach === 'quay') { q.de = 'Quay kim để đồng hồ chỉ ' + T().chuGio(ct.h, ct.m); q.de_doc = q.de; }
    s.van.hienCau(q, luaChonHien(q, cach));
    q.toiDaLanThu = 2; // Lật Lịch cho thử lại một lần ở mọi dạng câu, rồi mới xem lời giải
    s.q = q;
    s.cach = cach;
    s.canh = canhCua(ct);
    s.khoa = false;
    s.loaiBo = [];
    K().anGoiY();
    K().de(q.de, q.de_doc, { nay: true, docNgay: true });
    K().tienDo();
    ve();
  }

  function ve() {
    dom.san.setAttribute('data-canh', s.canh);
    dom.duc.classList.remove('mung');
    if (s.canh === 'dong_ho') veDongHo();
    else if (s.canh === 'lich') veLich();
    else veBuoi();
  }

  /** Các thẻ lựa chọn (chữ, hình đồng hồ, đồng hồ điện tử) theo q.lua_chon. */
  function theChonHtml(q, lop) {
    return '<div class="ll2-the-hang ' + (lop || '') + '" role="group" aria-label="Các lựa chọn">' + q.lua_chon.map(function (x, i) {
      const v = NH().veLuaChon(q.cau_truc, x.gia_tri);
      const coHinh = v.hinh && (v.hien === 'dong_ho' || v.hien === 'dien_tu');
      return '<button type="button" class="ll2-the' + (coHinh ? ' co-hinh' : '') + '" data-chon="' + i + '" aria-label="' + esc(v.nhan) + '">' +
        '<i class="ll2-the-so" aria-hidden="true">' + (i + 1) + '</i>' + (coHinh ? '<span class="ll2-the-hinh">' + v.hinh + '</span>' : '') +
        (coHinh ? '' : '<b>' + esc(v.nhan) + '</b>') + '</button>';
    }).join('') + '</div>';
  }
  function theEl(i) { return dom.san.querySelector('[data-chon="' + i + '"]'); }

  /* ============================================================
     Cảnh 1: tháp đồng hồ
     ============================================================ */

  function veDongHo() {
    const q = s.q, ct = q.cau_truc;
    if (s.canhDaVe !== 'dong_ho') {
      dom.canh.innerHTML = '<div class="ll2-dh-canh">' +
        '<div class="ll2-thap"><div class="ll2-thap-mai"><i class="ll2-chuong"></i></div>' +
        '<div class="ll2-thap-than"><div class="ll2-dh" id="ll2-dh">' + DH().svg(12, 0, { size: 400, tuongTac: true, cls: 'll2-dh-svg', aria: 'Đồng hồ trên tháp' }) + '</div></div>' +
        '<div class="ll2-thap-chan"></div></div>' +
        '<div class="ll2-ben" id="ll2-ben"></div></div>';
      s.canhDaVe = 'dong_ho';
      dom.dh = dom.canh.querySelector('#ll2-dh');
      dom.dhSvg = dom.dh.querySelector('svg');
      dom.kimGio = dom.dhSvg.querySelector('.dh-kim-gio');
      dom.kimPhut = dom.dhSvg.querySelector('.dh-kim-phut');
      dom.ben = dom.canh.querySelector('#ll2-ben');
      dom.trang = dom.trangCu = dom.lat = dom.tren = null;
      s.gio.T = 0;
      veKim();
    }
    xoaMucTieu();
    dom.dh.classList.remove('mo', 'dung', 'quay');
    if (s.cach === 'quay') {
      s.gio.T = ct.h === 12 ? 6 * 60 : 0; // bắt đầu từ 12 giờ (hoặc 6 giờ nếu đề là 12 giờ …)
      s.gio.kimChon = 'phut';
      s.gio.soXoay = 0;
      veKim();
      dom.dh.classList.add('quay');
      dom.ben.innerHTML = '<div class="ll2-muc-tieu"><small>Quay kim để đồng hồ chỉ</small><b>' + esc(T().chuGio(ct.h, ct.m)) + '</b></div>' +
        '<div class="ll2-chon-kim" role="group" aria-label="Chọn kim để quay">' +
        '<button type="button" class="ll2-kim-nut" data-kim="gio"><i class="ll2-kim-mau gio" aria-hidden="true"></i>Kim giờ<small>kim ngắn</small></button>' +
        '<button type="button" class="ll2-kim-nut" data-kim="phut"><i class="ll2-kim-mau phut" aria-hidden="true"></i>Kim phút<small>kim dài</small></button></div>' +
        '<p class="ll2-nhac-nho">Kéo kim trên đồng hồ, hoặc chọn kim rồi chạm vào một số.</p>' +
        '<button type="button" class="nut nut-cam nut-to ll2-xong" data-xong="1">Xong</button>';
      capNhatChonKim();
    } else {
      if (ct.kieu === 'doc') quayToi(ct.h % 12 * 60 + ct.m, 650);
      else dom.dh.classList.add('mo');
      dom.ben.innerHTML = '<p class="ll2-hoi">' + (ct.kieu === 'doc' ? 'Đồng hồ trên tháp chỉ mấy giờ?' : 'Chọn đồng hồ chỉ đúng ' + esc(T().chuGio(ct.h, ct.m)) + '.') + '</p>' +
        theChonHtml(q, ct.kieu === 'doc' ? 'doc' : 'ngang');
    }
  }

  function h12Cua(Tp) { const H = Math.floor(((Tp % 720) + 720) % 720 / 60); return H === 0 ? 12 : H; }
  function gioHien() { return T().giaTriGio(h12Cua(s.gio.T), s.gio.T % 60); }
  function veKim() {
    if (!dom.kimGio) return;
    const Tp = ((s.gio.T % 720) + 720) % 720;
    dom.kimGio.setAttribute('transform', 'rotate(' + (Tp * 0.5).toFixed(1) + ')');
    dom.kimPhut.setAttribute('transform', 'rotate(' + ((Tp % 60) * 6) + ')');
    if (dom.dhSvg) dom.dhSvg.setAttribute('aria-label', 'Đồng hồ trên tháp chỉ ' + T().chuGio(h12Cua(Tp), Tp % 60));
  }
  /** Quay hai kim tới mốc Tp (phút trong 12 giờ), luôn theo chiều kim đồng hồ. */
  function quayToi(Tp, ms) {
    const dau = s.gio.T;
    let cuoi = Tp;
    while (cuoi < dau) cuoi += 720;
    if (cuoi - dau > 720) cuoi -= 720;
    if (giamDong() || !ms || cuoi === dau) { s.gio.T = Tp % 720; veKim(); return; }
    const t0 = performance.now();
    const buoc = function (t) {
      if (!s || !dom.kimGio) return;
      const k = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      s.gio.T = dau + (cuoi - dau) * e;
      veKim();
      if (k < 1) requestAnimationFrame(buoc); else { s.gio.T = Tp % 720; veKim(); }
    };
    requestAnimationFrame(buoc);
  }
  function capNhatChonKim() {
    dom.san.querySelectorAll('.ll2-kim-nut').forEach(function (b) { b.classList.toggle('chon', b.getAttribute('data-kim') === s.gio.kimChon); b.setAttribute('aria-pressed', b.getAttribute('data-kim') === s.gio.kimChon ? 'true' : 'false'); });
    if (dom.dhSvg) { dom.dhSvg.classList.toggle('chon-gio', s.cach === 'quay' && s.gio.kimChon === 'gio'); dom.dhSvg.classList.toggle('chon-phut', s.cach === 'quay' && s.gio.kimChon === 'phut'); }
  }

  function gocLech(a, b) { const d = Math.abs(((a - b) % 360 + 360) % 360); return Math.min(d, 360 - d); }
  function viTriTrenDongHo(e) {
    const r = dom.dhSvg.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.width / 2; // hộp nhìn vuông, tâm ở giữa
    const dx = e.clientX - cx, dy = e.clientY - cy;
    let g = Math.atan2(dx, -dy) * 180 / Math.PI;
    if (g < 0) g += 360;
    return { goc: g, xa: Math.sqrt(dx * dx + dy * dy) / (r.width / 2) * 130 };
  }
  /** Đặt kim theo góc: kim phút bắt vào số gần nhất (5 phút), kim giờ đi theo; kim giờ bắt vào giờ, giữ nguyên phút. */
  function datGoc(kim, goc) {
    const truoc = s.gio.T;
    if (kim === 'phut') {
      const moi = (Math.round(goc / 30) % 12) * 5;
      const cu = ((s.gio.T % 60) + 60) % 60;
      let d = ((moi - cu) % 60 + 60) % 60;
      if (d > 30) d -= 60;
      s.gio.T = ((s.gio.T + d) % 720 + 720) % 720;
    } else {
      const M = ((s.gio.T % 60) + 60) % 60;
      const H = ((Math.round((goc - M * 0.5) / 30) % 12) + 12) % 12;
      s.gio.T = H * 60 + M;
    }
    if (s.gio.T !== truoc) { veKim(); AT().bat('go_phim'); }
  }
  function ghiXoay(kim, truocT) {
    if (s.gio.T === truocT) return;
    s.gio.soXoay++;
    const M = s.gio.T % 60;
    s.van.thaoTac('xoay', {
      doi_tuong: kim === 'phut' ? 'kim_phut' : 'kim_gio', tu: T().giaTriGio(h12Cua(truocT), truocT % 60), den: gioHien(), gia_tri: gioHien(),
      so_chi: kim === 'phut' ? T().soKimPhut(M) : h12Cua(s.gio.T)
    });
  }
  function xoaMucTieu() { if (dom.dhSvg) dom.dhSvg.querySelectorAll('.ll2-muc').forEach(function (x) { x.remove(); }); }
  /** Gợi ý cấp 3: khoanh số mà kim phút cần chỉ. */
  function khoanhSo(k) {
    const NS = 'http://www.w3.org/2000/svg';
    const c = document.createElementNS(NS, 'circle');
    const a = k * 30 * Math.PI / 180;
    c.setAttribute('cx', (Math.sin(a) * 76).toFixed(1));
    c.setAttribute('cy', (-Math.cos(a) * 76).toFixed(1));
    c.setAttribute('r', '19');
    c.setAttribute('class', 'll2-muc');
    dom.dhSvg.insertBefore(c, dom.kimGio);
  }

  function xongQuay() {
    if (!s || s.khoa || K().dangKhoa() || s.cach !== 'quay') return;
    const v = gioHien();
    const kq = s.van.traLoi(v, { kim_gio: h12Cua(s.gio.T), kim_phut: T().soKimPhut(s.gio.T % 60), so_lan_xoay: s.gio.soXoay });
    if (!kq) return;
    if (kq.dung) { dung(kq, dom.dh); return; }
    AT().bat('sai');
    rung(dom.dh);
    const noi = 'Đồng hồ của con chỉ ' + T().chuGio(h12Cua(s.gio.T), s.gio.T % 60) + '. ';
    if (kq.thuLai) { K().bao(noi + kq.loiNoi + '. Con thử lại nhé', 'sai', 3.4); AT().doc(kq.loiNoi); return; }
    saiHan(v, kq, { moDau: 'Con quay kim tới', chonHien: T().chuGio(h12Cua(s.gio.T), s.gio.T % 60) });
  }

  /* ============================================================
     Cảnh 2: tờ lịch lớn
     ============================================================ */

  function trangHtml(p, cu) {
    const C = T();
    const sn = C.soNgay(p.thang);
    let h = '<div class="ll2-trang-td"><b>THÁNG ' + p.thang + '</b><small>Tháng ' + C.TEN_THANG[p.thang - 1] + '</small></div>';
    h += '<div class="ll2-luoi" role="grid" aria-label="Tờ lịch tháng ' + p.thang + '">';
    for (let c = 0; c < 7; c++) {
      const ten = C.TEN_THU[c];
      h += '<button type="button" class="ll2-thu' + (c === 6 ? ' cn' : '') + '" data-thu="' + c + '"' + (cu ? ' tabindex="-1"' : '') + ' aria-label="' + ten + '"><small>' + (c === 6 ? 'Chủ' : 'Thứ') + '</small><b>' + (c === 6 ? 'nhật' : ten.slice(4)) + '</b></button>';
    }
    for (let n = 1; n <= sn; n++) {
      const v = C.viTriO(p, n);
      const lop = ['ll2-ngay'];
      if (v.cot === 6) lop.push('cn');
      if (C.leCua(p.thang, n)) lop.push('le');
      h += '<button type="button" class="' + lop.join(' ') + '" data-n="' + n + '" style="grid-column:' + (v.cot + 1) + ';grid-row:' + (v.hang + 2) + '"' + (cu ? ' tabindex="-1"' : '') + ' aria-label="Ngày ' + n + '"><span>' + n + '</span></button>';
    }
    return h + '</div>';
  }
  function biaHtml() {
    return '<div class="ll2-bia"><img src="' + (s.o.anh ? s.o.anh('sp-duc-long') : '') + '" alt=""><b>Lịch Phố Đồng Hồ</b><small>Chạm để lật lịch</small></div>';
  }
  function oNgay(n) { return dom.trang ? dom.trang.querySelector('.ll2-ngay[data-n="' + n + '"]') : null; }
  function dauCot(c) { return dom.trang ? dom.trang.querySelector('.ll2-thu[data-thu="' + c + '"]') : null; }
  function toCot(c, co) {
    if (!dom.trang) return;
    dom.trang.querySelectorAll('.ll2-ngay, .ll2-thu').forEach(function (el) {
      const cot = el.classList.contains('ll2-thu') ? +el.getAttribute('data-thu') : T().viTriO(s.lich.trang, +el.getAttribute('data-n')).cot;
      el.classList.toggle('cot-sang', co && cot === c);
    });
  }

  function veLich() {
    const q = s.q, ct = q.cau_truc;
    if (s.canhDaVe !== 'lich') {
      dom.canh.innerHTML = '<div class="ll2-lich-canh">' +
        '<div class="ll2-lich"><div class="ll2-lich-vong" aria-hidden="true"><i></i><i></i><i></i></div>' +
        '<div class="ll2-trang" id="ll2-trang"></div>' +
        '<div class="ll2-trang ll2-trang-cu hidden" id="ll2-trang-cu" role="button" tabindex="0" aria-label="Lật lịch"></div>' +
        '<button type="button" class="ll2-lat hidden" id="ll2-lat" data-lat="1">Lật lịch</button></div>' +
        '<div class="ll2-ben" id="ll2-ben"></div></div>';
      s.canhDaVe = 'lich';
      dom.trang = dom.canh.querySelector('#ll2-trang');
      dom.trangCu = dom.canh.querySelector('#ll2-trang-cu');
      dom.lat = dom.canh.querySelector('#ll2-lat');
      dom.ben = dom.canh.querySelector('#ll2-ben');
      dom.dh = dom.dhSvg = dom.kimGio = dom.kimPhut = dom.tren = null;
    }
    const p = { thang: ct.thang, t1: ct.t1 };
    const cu = s.lich.trang;
    const canLat = !cu || cu.thang !== p.thang || cu.t1 !== p.t1;
    dom.trang.innerHTML = trangHtml(p, false);
    s.lich.trang = p;
    s.lich.dem = [];
    s.lich.xem = null;
    if (canLat) {
      dom.trangCu.innerHTML = cu ? trangHtml(cu, true) : biaHtml();
      dom.trangCu.classList.remove('hidden', 'lat-di');
      dom.lat.classList.remove('hidden');
      s.lich.choLat = true;
      s.lich.tu = cu ? 'thang_' + cu.thang : 'bia';
    } else {
      dom.trangCu.classList.add('hidden');
      dom.lat.classList.add('hidden');
      s.lich.choLat = false;
    }
    // đánh dấu theo đề
    if (ct.kieu === 'tuan') { const o = oNgay(ct.ngay); if (o) { o.classList.add('goc'); o.insertAdjacentHTML('beforeend', '<em>Hôm nay</em>'); } }
    if (ct.kieu === 'o_trong') { const o = oNgay(ct.ngay); if (o) { o.classList.add('hoi'); o.querySelector('span').textContent = '?'; o.setAttribute('aria-label', 'Ô có dấu hỏi'); } }
    // bảng bên
    let h = '';
    const C = T();
    if (s.cach === 'thu') h = '<p class="ll2-hoi">Tìm ngày ' + ct.ngay + ' trên tờ lịch, rồi chạm vào tên thứ ở đầu cột của ngày đó.</p>';
    else if (s.cach === 'o_ngay') h = '<div class="ll2-hom-nay"><small>Hôm nay</small><b>' + esc(C.thuTrongCau(C.thuCua(ct, ct.ngay))) + ', ngày ' + ct.ngay + '</b></div>' +
      '<p class="ll2-hoi">Chạm vào ngày ' + esc(C.thuTrongCau(C.thuCua(ct, ct.ngay))) + ' tuần ' + (ct.huong > 0 ? 'sau' : 'trước') + ' trên tờ lịch.</p>';
    else if (s.cach === 'dem') h = '<p class="ll2-hoi">Chạm vào từng ngày ' + esc(C.thuTrongCau(ct.thu)) + ' để đếm, rồi chọn số.</p>' +
      '<div class="ll2-dem" aria-live="polite">Con đã đếm <b id="ll2-so-dem">0</b> ngày</div>' + theChonHtml(q, 'so');
    else h = '<p class="ll2-hoi">' + (ct.kieu === 'so_ngay' ? 'Xem tờ lịch tháng ' + ct.thang + ' rồi chọn số ngày.' : ct.kieu === 'o_trong' ? 'Ô có dấu ? là ngày mấy?' : 'Chọn ngày đúng.') + '</p>' + theChonHtml(q, 'so');
    dom.ben.innerHTML = h;
    khoaTrang(s.lich.choLat);
  }
  function khoaTrang(b) { dom.ben.classList.toggle('cho-lat', !!b); }

  function latTrang(cach) {
    if (!s || !s.lich.choLat || K().dangKhoa()) return;
    s.lich.choLat = false;
    s.van.thaoTac('lat_trang', { doi_tuong: 'to_lich', tu: s.lich.tu, den: 'thang_' + s.lich.trang.thang, cach: cach || 'cham' });
    AT().bat('doi_lan');
    dom.lat.classList.add('hidden');
    khoaTrang(false);
    if (giamDong()) { dom.trangCu.classList.add('hidden'); return; }
    dom.trangCu.classList.add('lat-di');
    tre(620, function () { if (!s.lich.choLat) dom.trangCu.classList.add('hidden'); });
  }

  function chamNgay(n, el) {
    if (!s || s.khoa || K().dangKhoa() || s.lich.choLat) return;
    const v = T().viTriO(s.lich.trang, n);
    const viTri = 'hang_' + (v.hang + 1) + '_cot_' + (v.cot + 1);
    if (s.cach === 'o_ngay') {
      s.van.thaoTac('chon', { doi_tuong: 'o_ngay', gia_tri: n, vi_tri: viTri });
      const kq = s.van.traLoi(n, { vi_tri: viTri });
      traLoiXong(kq, n, el, { moDau: 'Con chạm', chonHien: 'ngày ' + n });
      return;
    }
    if (s.cach === 'dem') {
      const i = s.lich.dem.indexOf(n);
      if (i >= 0) s.lich.dem.splice(i, 1); else s.lich.dem.push(n);
      el.classList.toggle('dem', i < 0);
      AT().bat(i < 0 ? 'go_phim' : 'cham');
      s.van.thaoTac(i < 0 ? 'dem' : 'bo_chon', { doi_tuong: 'o_ngay', gia_tri: n, vi_tri: viTri, thu: T().THU[v.cot], so_da_dem: s.lich.dem.length });
      const b = dom.san.querySelector('#ll2-so-dem');
      if (b) b.textContent = s.lich.dem.length;
      return;
    }
    // Các dạng khác: chạm ô chỉ để nhìn cho rõ (tô ô và cột)
    if (s.lich.xem) { const o = oNgay(s.lich.xem); if (o) o.classList.remove('xem'); }
    s.lich.xem = n;
    el.classList.add('xem');
    if (s.cach === 'thu') toCot(v.cot, true);
    AT().bat('cham');
    s.van.thaoTac('cham', { doi_tuong: 'o_ngay', gia_tri: n, vi_tri: viTri });
  }

  function chamThu(c, el) {
    if (!s || s.khoa || K().dangKhoa() || s.lich.choLat) return;
    const code = T().THU[c];
    if (s.cach !== 'thu') {
      toCot(c, true);
      AT().bat('cham');
      s.van.thaoTac('cham', { doi_tuong: 'cot_thu', gia_tri: code, vi_tri: 'cot_' + (c + 1) });
      return;
    }
    if (el.classList.contains('gach')) return;
    s.van.thaoTac('chon', { doi_tuong: 'cot_thu', gia_tri: code, vi_tri: 'cot_' + (c + 1) });
    const kq = s.van.traLoi(code, { vi_tri: 'cot_' + (c + 1), ngay_da_cham: s.lich.xem });
    traLoiXong(kq, code, el, {});
  }

  /* ============================================================
     Cảnh 3: dải giờ trong ngày
     ============================================================ */

  function viTriGio(h, m) { const x = (h === 0 ? 24 : h) + (m || 0) / 60; return ((x - 0.5) / 24 * 100).toFixed(2) + '%'; }
  function daiHtml() {
    const C = T();
    let h = '<div class="ll2-dai" id="ll2-dai"><div class="ll2-dai-bang">';
    C.BUOI.forEach(function (b) {
      const k = C.GIO_BUOI[b];
      h += '<button type="button" class="ll2-vung ll2-vung-' + b + '" data-buoi="' + b + '" data-tha="buoi" style="flex-grow:' + (k[1] - k[0] + 1) + '" aria-label="Buổi ' + C.TEN_BUOI[b] + ', từ ' + k[0] + ' giờ đến ' + k[1] + ' giờ">' +
        '<svg viewBox="-16 -16 32 32" aria-hidden="true">' + DH().bieuBuoi(b, 0, 0, 26) + '</svg><b>' + C.TEN_BUOI[b].charAt(0).toUpperCase() + C.TEN_BUOI[b].slice(1) + '</b></button>';
    });
    h += '</div><div class="ll2-ghim-lop" id="ll2-ghim"></div><div class="ll2-dai-so" aria-hidden="true">';
    for (let i = 1; i <= 24; i++) h += '<i>' + i + '</i>';
    return h + '</div></div>';
  }
  function vung(b) { return dom.san.querySelector('.ll2-vung[data-buoi="' + b + '"]'); }
  function ghim(h, m, nhan, lop) {
    const g = dom.san.querySelector('#ll2-ghim');
    if (!g) return;
    g.insertAdjacentHTML('beforeend', '<i class="ll2-ghim ' + (lop || '') + '" style="left:' + viTriGio(h, m) + '"><b>' + esc(nhan) + '</b></i>');
  }

  function theViecHtml(ma, i) {
    const x = T().VIEC[ma];
    return '<button type="button" class="ll2-viec" data-viec="' + ma + '" data-keo="viec" aria-label="' + esc(T().viecLuc(ma)) + '">' +
      '<span class="ll2-viec-bieu" aria-hidden="true">' + x.bieu + '</span><b>' + esc(x.ten) + '</b><small>' + esc(T().chuGio12(x.h, x.m)) + '</small></button>';
  }

  function veBuoi() {
    const q = s.q, ct = q.cau_truc;
    const C = T();
    if (s.canhDaVe !== 'buoi') {
      dom.canh.innerHTML = '<div class="ll2-buoi-canh"><div class="ll2-tren" id="ll2-tren"></div>' + daiHtml() + '</div>';
      s.canhDaVe = 'buoi';
      dom.tren = dom.canh.querySelector('#ll2-tren');
      dom.dh = dom.dhSvg = dom.kimGio = dom.kimPhut = dom.trang = dom.trangCu = dom.lat = dom.ben = null;
    }
    dom.san.querySelector('#ll2-ghim').innerHTML = '';
    dom.san.querySelectorAll('.ll2-vung').forEach(function (v) { v.classList.remove('dung', 'sai', 'gach', 'nhan'); v.disabled = false; });
    s.buoi = { chonThe: null, o: [null, null, null] };
    let h = '';
    if (s.cach === 'keo_buoi') {
      h = '<div class="ll2-keo-hang"><button type="button" class="ll2-the-gio" id="ll2-the-gio" data-keo="gio" aria-label="Thẻ ' + ct.h + ' giờ">' +
        DH().dienTu(ct.h % 24, 0, { size: 170 }) + '<b>' + ct.h + ' giờ</b></button>' +
        '<p class="ll2-hoi">Kéo thẻ vào đúng buổi trên dải giờ<br><small>(hoặc chạm vào buổi đó)</small><i class="ll2-mui-xuong" aria-hidden="true"></i></p></div>';
    } else if (s.cach === 'xep') {
      h = '<div class="ll2-xep"><div class="ll2-khay" id="ll2-khay">' + ct.viec.map(theViecHtml).join('') + '</div>' +
        '<div class="ll2-o-hang">' + [0, 1, 2].map(function (i) {
          return (i ? '<i class="ll2-mui" aria-hidden="true">→</i>' : '') + '<div class="ll2-o" data-o="' + i + '" data-tha="o" role="button" tabindex="0" aria-label="Ô thứ ' + (i + 1) + '"><em>' + (i + 1) + (i === 0 ? ' · sớm nhất' : i === 2 ? ' · muộn nhất' : '') + '</em></div>';
        }).join('') + '</div><button type="button" class="nut nut-cam ll2-xong" data-xong="1" disabled>Xong</button></div>';
    } else {
      let cho = '';
      if (ct.kieu === 'doi_24') cho = '<div class="ll2-cho-the"><svg viewBox="-16 -16 32 32" aria-hidden="true">' + DH().bieuBuoi(C.buoiCua(ct.h), 0, 0, 26) + '</svg><b>' + esc(C.chuGio12(ct.h, ct.m)) + '</b><small>còn gọi là mấy giờ?</small></div>';
      else if (ct.kieu === 'doi_12') cho = '<div class="ll2-cho-the">' + DH().dienTu(ct.h, ct.m, { size: 200 }) + '<small>Đó là mấy giờ?</small></div>';
      else if (ct.kieu === 'dong_ho_buoi') cho = '<div class="ll2-cho-the dh">' + DH().svg(ct.h, ct.m, { size: 200, buoi: C.buoiCua(ct.h) }) + '</div>';
      else if (ct.kieu === 'buoi') cho = '<div class="ll2-cho-the">' + DH().dienTu(ct.h % 24, 0, { size: 200 }) + '</div>';
      else cho = '<div class="ll2-cho-the viec">' + NH().veHinh(ct) + '</div>';
      h = '<div class="ll2-chon-hang">' + cho + theChonHtml(q, ct.kieu === 'dong_ho_buoi' ? 'ngang dt' : ct.kieu === 'thu_tu' ? 'doc dai' : 'doc') + '</div>';
    }
    dom.tren.innerHTML = h;
    capNhatXep();
  }

  function thaBuoi(b, cach) {
    if (!s || s.khoa || K().dangKhoa() || s.cach !== 'keo_buoi') return;
    const el = vung(b);
    if (!el || el.classList.contains('gach')) return;
    s.van.thaoTac('tha', { doi_tuong: 'the_gio', den: 'buoi_' + b, gia_tri: b, cach: cach });
    const kq = s.van.traLoi(b, { vi_tri: 'buoi_' + b, cach: cach });
    const the = dom.san.querySelector('#ll2-the-gio');
    if (the) the.classList.remove('chon');
    s.buoi.chonThe = null;
    traLoiXong(kq, b, el, {});
  }

  /* ---------------- Xếp việc vào ô ---------------- */

  function capNhatXep() {
    if (s.cach !== 'xep') return;
    const khay = dom.san.querySelector('#ll2-khay');
    if (!khay) return;
    s.q.cau_truc.viec.forEach(function (ma) {
      const the = dom.san.querySelector('.ll2-viec[data-viec="' + ma + '"]');
      const i = s.buoi.o.indexOf(ma);
      const dich = i >= 0 ? dom.san.querySelector('.ll2-o[data-o="' + i + '"]') : khay;
      if (the && the.parentNode !== dich) dich.appendChild(the);
      if (the) the.classList.toggle('chon', s.buoi.chonThe === ma);
    });
    dom.san.querySelectorAll('.ll2-o').forEach(function (o, i) { o.classList.toggle('co', !!s.buoi.o[i]); });
    const nut = dom.san.querySelector('[data-xong]');
    if (nut) nut.disabled = s.buoi.o.some(function (x) { return !x; }) || s.khoa;
  }
  function datVaoO(ma, i, cach) {
    if (!s || s.khoa || K().dangKhoa()) return;
    const cu = s.buoi.o.indexOf(ma);
    const dang = s.buoi.o[i];
    if (cu === i) return;
    if (cu >= 0) s.buoi.o[cu] = dang || null; // đổi chỗ hai thẻ
    else if (dang) s.buoi.o[s.buoi.o.indexOf(dang)] = null;
    s.buoi.o[i] = ma;
    s.buoi.chonThe = null;
    AT().bat('go_phim');
    // Đặt từ khay là "dat"; chuyển thẻ từ ô này sang ô khác là đổi ý ("doi_cot")
    const du = { doi_tuong: 'the_viec', gia_tri: ma, den: 'o_' + (i + 1), cach: cach, thu_tu: s.buoi.o.map(function (x) { return x || ''; }).join(',') };
    if (cu >= 0) du.tu = 'o_' + (cu + 1);
    s.van.thaoTac(cu >= 0 ? 'doi_cot' : 'dat', du);
    capNhatXep();
  }
  function boRa(ma) {
    if (!s || s.khoa || K().dangKhoa()) return;
    const i = s.buoi.o.indexOf(ma);
    if (i < 0) return;
    s.buoi.o[i] = null;
    AT().bat('cham');
    s.van.thaoTac('bo_chon', { doi_tuong: 'the_viec', gia_tri: ma, tu: 'o_' + (i + 1), thu_tu: s.buoi.o.map(function (x) { return x || ''; }).join(',') });
    capNhatXep();
  }
  function xongXep() {
    if (!s || s.khoa || K().dangKhoa() || s.cach !== 'xep' || s.buoi.o.some(function (x) { return !x; })) return;
    const v = s.buoi.o.join(',');
    const kq = s.van.traLoi(v, { thu_tu: s.buoi.o.slice() });
    if (!kq) return;
    const o = dom.san.querySelector('.ll2-o-hang');
    if (kq.dung) { dung(kq, o); return; }
    AT().bat('sai');
    rung(o);
    if (kq.thuLai) { K().bao(kq.loiNoi + '. Con đổi chỗ các thẻ rồi bấm Xong nhé', 'sai', 3.4); AT().doc(kq.loiNoi); return; }
    saiHan(v, kq, { moDau: 'Con xếp' });
  }

  /* ============================================================
     Chọn, đúng, sai, gợi ý
     ============================================================ */

  function chonThe(i) {
    if (!s || s.khoa || K().dangKhoa()) return;
    const x = s.q.lua_chon && s.q.lua_chon[i];
    const el = theEl(i);
    if (!x || !el || el.disabled || s.cach === 'thu' || s.cach === 'keo_buoi') return;
    if (s.canh === 'lich' && s.lich.choLat) { K().bao('Con lật lịch sang tháng ' + s.lich.trang.thang + ' trước nhé'); rung(dom.lat); return; }
    s.van.thaoTac('chon', { doi_tuong: 'the', gia_tri: x.gia_tri, vi_tri: x.vi_tri });
    const kq = s.van.traLoi(x.gia_tri, s.cach === 'dem' ? { vi_tri: x.vi_tri, so_da_dem: s.lich.dem.length, ngay_da_dem: s.lich.dem.slice().sort(function (a, b) { return a - b; }) } : { vi_tri: x.vi_tri });
    traLoiXong(kq, x.gia_tri, el, {});
  }

  /** Sau khi bé chốt một đáp án bằng một phần tử (thẻ, ô ngày, cột thứ, buổi). */
  function traLoiXong(kq, v, el, them) {
    if (!kq) return;
    if (kq.dung) { if (el) el.classList.add('dung'); dung(kq, el); return; }
    AT().bat('sai');
    if (el) { el.classList.add('sai'); rung(el); }
    if (kq.thuLai) {
      if (el) tre(700, function () { el.classList.remove('sai'); if (el.matches('.ll2-the, .ll2-thu, .ll2-vung')) { el.classList.add('gach'); el.disabled = true; } });
      K().bao(kq.loiNoi + '. Con thử lại nhé', 'sai', 3);
      AT().doc(kq.loiNoi);
      if (s.cach === 'keo_buoi') veTheVe();
      return;
    }
    saiHan(v, kq, them);
  }

  function saiHan(v, kq, them) {
    s.khoa = true;
    capNhatXep();
    const q = s.q;
    tre(450, function () {
      K().phanHoiCau(q, v, Object.assign({}, kq, them || {}), function () {
        hienDapAn();
        s.hen.push(setTimeout(function () { if (s) cauMoi(); }, 1300));
      });
    });
  }

  /** Sau màn lời giải: cho thấy đáp án đúng ngay trên cảnh chơi. */
  function hienDapAn() {
    const q = s.q, ct = q.cau_truc;
    if (s.cach === 'quay') { quayToi(ct.h % 12 * 60 + ct.m, 700); dom.dh.classList.add('dung'); return; }
    if (s.cach === 'thu') { const w = T().THU.indexOf(q.dap_an); toCot(w, true); const d = dauCot(w); if (d) d.classList.add('dung'); const o = oNgay(ct.ngay); if (o) o.classList.add('dung'); return; }
    if (s.cach === 'o_ngay') { const o = oNgay(q.dap_an); if (o) o.classList.add('dung'); return; }
    if (s.cach === 'dem') {
      for (let n = 1; n <= T().soNgay(ct.thang); n++) if (T().thuCua(ct, n) === ct.thu) { const o = oNgay(n); if (o) o.classList.add('dung'); }
    }
    if (s.cach === 'keo_buoi') { const z = vung(q.dap_an); if (z) z.classList.add('dung'); ghim(ct.h % 24, 0, ct.h + ' giờ'); return; }
    if (s.cach === 'xep') {
      s.buoi.o = String(q.dap_an).split(',');
      capNhatXep();
      s.buoi.o.forEach(function (ma, i) { const x = T().VIEC[ma]; ghim(x.h, x.m, String(i + 1)); });
      return;
    }
    (q.lua_chon || []).forEach(function (x, i) { if (String(x.gia_tri) === String(q.dap_an)) { const el = theEl(i); if (el) { el.classList.remove('gach'); el.classList.add('dung'); } } });
    if (s.canh === 'buoi' && ct.kieu !== 'thu_tu' && ct.h != null) ghim(ct.h % 24, ct.m || 0, T().dienTu(ct.h, ct.m || 0));
  }

  function dung(kq, el) {
    s.khoa = true;
    capNhatXep();
    const q = s.q, ct = q.cau_truc;
    const p = el ? K().tamCua(el) : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    s.chuoi = kq.ketQua === 'dung_ngay' ? s.chuoi + 1 : 0;
    s.soDung++;
    const diem = kq.ketQua === 'dung_ngay' ? 100 + (s.chuoi >= 3 ? 50 : 0) : 40;
    K().congDiem(diem, p.x, p.y - 40, kq.quaMong ? '+' + kq.quaMong + ' quả mọng' : null);
    K().phao(p.x, p.y, 18);
    AT().bat('dung');
    K().bao(q.ket_luan + (s.chuoi >= 3 ? ' · ' + s.chuoi + ' câu đúng liền!' : ''), 'dung', 1.9);
    dom.duc.classList.remove('mung'); void dom.duc.offsetWidth; dom.duc.classList.add('mung');
    if (s.canh === 'dong_ho' && dom.dh) {
      dom.dh.classList.add('dung');
      const chuong = dom.san.querySelector('.ll2-chuong');
      if (chuong) { chuong.classList.remove('rung-chuong'); void chuong.offsetWidth; chuong.classList.add('rung-chuong'); }
    }
    if (s.cach === 'keo_buoi') ghim(ct.h % 24, 0, ct.h + ' giờ', 'dung');
    if (s.cach === 'xep') s.buoi.o.forEach(function (ma, i) { const x = T().VIEC[ma]; ghim(x.h, x.m, String(i + 1), 'dung'); });
    if (s.canh === 'buoi' && s.cach === 'chon' && ct.kieu !== 'thu_tu' && ct.h != null) ghim(ct.h % 24, ct.m || 0, T().dienTu(ct.h, ct.m || 0), 'dung');
    if (s.cach === 'thu') { const w = T().THU.indexOf(q.dap_an); toCot(w, true); const o = oNgay(ct.ngay); if (o) o.classList.add('dung'); }
    if (s.cach === 'dem') for (let n = 1; n <= T().soNgay(ct.thang); n++) if (T().thuCua(ct, n) === ct.thu) { const o = oNgay(n); if (o) o.classList.add('dung'); }
    s.hen.push(setTimeout(function () { if (s) cauMoi(); }, 1700));
  }

  function goiY() {
    if (!s || !s.q || s.q.xong || s.khoa || K().dangKhoa()) return;
    const q = s.q, ct = q.cau_truc;
    if (q.goiYCap >= 3) { K().goiY(); return; }
    let them = null;
    if (q.goiYCap + 1 === 3) {
      const coTen = function (v) { return NH().nhanBietLoi(ct, v).some(function (m) { return m !== 'khac'; }); };
      if (s.cach === 'quay') { khoanhSo(T().soKimPhut(ct.m)); them = { khoanh_so: T().soKimPhut(ct.m) }; }
      else if (s.cach === 'thu' || s.cach === 'o_ngay') {
        const w = T().thuCua(ct, ct.ngay);
        toCot(w, true);
        if (s.cach === 'thu') { const o = oNgay(ct.ngay); if (o) o.classList.add('xem'); }
        them = { to_cot: T().THU[w] };
      } else if (s.cach === 'keo_buoi') {
        const sai = T().BUOI.filter(function (b) { const z = vung(b); return b !== q.dap_an && z && !z.classList.contains('gach'); });
        sai.sort(function (a, b) { return (coTen(a) ? 1 : 0) - (coTen(b) ? 1 : 0); });
        if (sai[0]) { const z = vung(sai[0]); z.classList.add('gach'); z.disabled = true; them = { loai_bo: sai[0] }; }
      } else if (s.cach === 'xep') {
        const dau = String(q.dap_an).split(',')[0];
        datVaoO(dau, 0, 'goi_y');
        them = { dat_san: dau };
      } else if (s.cach === 'dem') {
        toCot(ct.thu, true);
        them = { to_cot: T().THU[ct.thu] };
      } else {
        const sai = (q.lua_chon || []).map(function (x, i) { return { x: x, i: i }; }).filter(function (y) { const el = theEl(y.i); return String(y.x.gia_tri) !== String(q.dap_an) && el && !el.disabled; });
        sai.sort(function (a, b) { return (coTen(a.x.gia_tri) ? 1 : 0) - (coTen(b.x.gia_tri) ? 1 : 0); });
        if (sai[0]) { const el = theEl(sai[0].i); el.classList.add('gach'); el.disabled = true; them = { loai_bo: sai[0].x.gia_tri }; }
      }
    }
    K().goiY(them);
  }

  /* ============================================================
     Chạm, kéo (Pointer Events), phím
     ============================================================ */

  function onClick(e) {
    if (!s || !s.q) return;
    const t = e.target;
    if (t.closest('[data-lat]') || t.closest('#ll2-trang-cu')) { latTrang('cham'); return; }
    // Thẻ kéo được: chạm bằng tay đã xử lý ở pointerup; chỉ nhận "click" từ bàn phím (detail 0)
    const keo = t.closest('[data-keo]');
    if (keo) { if (e.detail === 0) chamTheKeo({ loai: keo.getAttribute('data-keo'), ma: keo.getAttribute('data-viec') }); return; }
    const dich = t.closest('[data-tha]');
    if (dich) {
      if (s.cach === 'keo_buoi' && dich.getAttribute('data-tha') === 'buoi') { thaBuoi(dich.getAttribute('data-buoi'), 'cham'); return; }
      if (s.cach === 'xep' && dich.getAttribute('data-tha') === 'o') { if (s.buoi.chonThe && s.buoi.chonThe !== 'gio') datVaoO(s.buoi.chonThe, +dich.getAttribute('data-o'), 'cham'); return; }
    }
    const kn = t.closest('[data-kim]');
    if (kn) { if (!K().dangKhoa()) { s.gio.kimChon = kn.getAttribute('data-kim'); capNhatChonKim(); AT().bat('cham'); } return; }
    const xong = t.closest('[data-xong]');
    if (xong) { if (s.cach === 'quay') xongQuay(); else xongXep(); return; }
    const c = t.closest('[data-chon]');
    if (c) { chonThe(+c.getAttribute('data-chon')); return; }
    const th = t.closest('.ll2-thu');
    if (th && dom.trang && dom.trang.contains(th)) { chamThu(+th.getAttribute('data-thu'), th); return; }
    const ng = t.closest('.ll2-ngay');
    if (ng && dom.trang && dom.trang.contains(ng)) { chamNgay(+ng.getAttribute('data-n'), ng); return; }
  }

  /** Bắt đầu một lần chạm có thể thành kéo: đồng hồ (quay kim), thẻ giờ, thẻ việc. */
  function onPointerDown(e) {
    if (!s || !s.q || s.khoa || K().dangKhoa() || (e.button != null && e.button > 0)) return;
    const t = e.target;
    if (s.cach === 'quay' && dom.dhSvg && t.closest('#ll2-dh')) {
      e.preventDefault();
      const p = viTriTrenDongHo(e);
      if (p.xa > 128) return;
      const Tp = s.gio.T;
      const dP = gocLech(p.goc, (Tp % 60) * 6), dG = gocLech(p.goc, (Tp % 720) * 0.5);
      // Vòng ngoài chỉ có kim phút; vòng trong có cả hai kim: ưu tiên kim giờ khi hai kim chồng nhau hoặc kim giờ gần hơn
      let kim = null;
      if (p.xa > 60) { if (dP < 25) kim = 'phut'; }
      else if (p.xa >= 26) {
        if (dG < 24 && (dG <= dP || gocLech((Tp % 720) * 0.5, (Tp % 60) * 6) < 20)) kim = 'gio';
        else if (dP < 22) kim = 'phut';
      }
      if (kim) { s.gio.kimChon = kim; capNhatChonKim(); }
      s.keo = { loai: 'kim', kim: s.gio.kimChon, id: e.pointerId, truoc: Tp, dau: { x: e.clientX, y: e.clientY }, nam: !!kim };
      try { dom.dhSvg.setPointerCapture(e.pointerId); } catch (x) { /* bỏ qua */ }
      if (!kim && p.xa >= 26) datGoc(s.gio.kimChon, p.goc); // chạm vào chỗ trống: kim đang chọn quay tới đó
      return;
    }
    if (s.canh === 'lich' && s.lich.choLat && t.closest('#ll2-trang-cu')) {
      s.keo = { loai: 'trang', id: e.pointerId, dau: { x: e.clientX, y: e.clientY } };
      return;
    }
    const keo = t.closest('[data-keo]');
    if (keo && (s.cach === 'keo_buoi' || s.cach === 'xep')) {
      e.preventDefault();
      s.keo = { loai: keo.getAttribute('data-keo'), el: keo, ma: keo.getAttribute('data-viec'), id: e.pointerId, dau: { x: e.clientX, y: e.clientY }, dangKeo: false };
      try { keo.setPointerCapture(e.pointerId); } catch (x) { /* bỏ qua */ }
    }
  }

  function onPointerMove(e) {
    const k = s && s.keo;
    if (!k || e.pointerId !== k.id) return;
    e.preventDefault();
    if (k.loai === 'kim') {
      const p = viTriTrenDongHo(e);
      if (p.xa < 14) return;
      datGoc(k.kim, p.goc);
      return;
    }
    if (k.loai === 'trang') return;
    const dx = e.clientX - k.dau.x, dy = e.clientY - k.dau.y;
    if (!k.dangKeo && dx * dx + dy * dy < 64) return;
    if (!k.dangKeo) {
      k.dangKeo = true;
      const r = k.el.getBoundingClientRect();
      k.lech = { x: k.dau.x - r.left, y: k.dau.y - r.top };
      const ban = k.el.cloneNode(true);
      ban.removeAttribute('id');
      dom.bong.innerHTML = '';
      dom.bong.appendChild(ban);
      dom.bong.style.width = r.width + 'px';
      dom.bong.classList.remove('hidden');
      k.el.classList.add('dang-keo');
      AT().bat('cham');
      s.van.thaoTac('keo', k.loai === 'gio' ? { doi_tuong: 'the_gio', gia_tri: s.q.cau_truc.h + ' giờ' } : { doi_tuong: 'the_viec', gia_tri: k.ma, tu: s.buoi.o.indexOf(k.ma) >= 0 ? 'o_' + (s.buoi.o.indexOf(k.ma) + 1) : 'khay' });
    }
    dom.bong.style.transform = 'translate(' + Math.round(e.clientX - k.lech.x) + 'px,' + Math.round(e.clientY - k.lech.y) + 'px)';
    const dich = dichDuoi(e.clientX, e.clientY);
    dom.san.querySelectorAll('.nhan').forEach(function (x) { if (x !== dich) x.classList.remove('nhan'); });
    if (dich) dich.classList.add('nhan');
  }

  function dichDuoi(x, y) {
    const el = document.elementFromPoint(x, y);
    const d = el && el.closest ? el.closest('[data-tha]') : null;
    if (!d || !dom.san.contains(d)) return null;
    if (s.cach === 'keo_buoi' && d.getAttribute('data-tha') !== 'buoi') return null;
    if (s.cach === 'xep' && d.getAttribute('data-tha') !== 'o') return null;
    if (d.disabled || d.classList.contains('gach')) return null;
    return d;
  }

  function onPointerUp(e) {
    const k = s && s.keo;
    if (!k || e.pointerId !== k.id) return;
    s.keo = null;
    if (k.loai === 'kim') { ghiXoay(k.kim, k.truoc); return; }
    if (k.loai === 'trang') { if (e.clientY - k.dau.y < -30) latTrang('vuot'); return; }
    k.el.classList.remove('dang-keo');
    dom.san.querySelectorAll('.nhan').forEach(function (x) { x.classList.remove('nhan'); });
    if (!k.dangKeo) { chamTheKeo(k); return; }
    dom.bong.classList.add('hidden');
    const dich = dichDuoi(e.clientX, e.clientY);
    if (!dich) { if (k.loai === 'viec' && s.buoi.o.indexOf(k.ma) >= 0 && !chamTrong(e, dom.san.querySelector('.ll2-o-hang'))) boRa(k.ma); return; }
    if (k.loai === 'gio') thaBuoi(dich.getAttribute('data-buoi'), 'keo');
    else datVaoO(k.ma, +dich.getAttribute('data-o'), 'keo');
  }
  function chamTrong(e, el) { if (!el) return false; const r = el.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; }

  function onPointerCancel(e) {
    const k = s && s.keo;
    if (!k || e.pointerId !== k.id) return;
    huyKeo();
  }
  function huyKeo() {
    if (!s || !s.keo) return;
    const k = s.keo;
    s.keo = null;
    if (k.loai === 'kim') { ghiXoay(k.kim, k.truoc); return; }
    if (k.loai === 'trang') return;
    if (k.el) k.el.classList.remove('dang-keo');
    if (dom) dom.bong.classList.add('hidden');
  }

  /** Chạm (không kéo) vào thẻ giờ hoặc thẻ việc: chọn thẻ, rồi chạm buổi hay ô để đặt. */
  function chamTheKeo(k) {
    if (s.khoa || K().dangKhoa()) return;
    if (k.loai === 'gio') {
      const the = dom.san.querySelector('#ll2-the-gio');
      s.buoi.chonThe = s.buoi.chonThe ? null : 'gio';
      if (the) the.classList.toggle('chon', !!s.buoi.chonThe);
      if (s.buoi.chonThe) { AT().bat('cham'); s.van.thaoTac('chon', { doi_tuong: 'the_gio', gia_tri: s.q.cau_truc.h + ' giờ' }); }
      return;
    }
    if (s.buoi.o.indexOf(k.ma) >= 0 && s.buoi.chonThe !== k.ma) { boRa(k.ma); return; }
    s.buoi.chonThe = s.buoi.chonThe === k.ma ? null : k.ma;
    AT().bat('cham');
    capNhatXep();
  }
  function veTheVe() {
    const the = dom.san.querySelector('#ll2-the-gio');
    if (the) { the.classList.remove('ve'); void the.offsetWidth; the.classList.add('ve'); }
  }


  function phim(e) {
    if (!s || !s.q || s.khoa) return;
    const k = e.key;
    if (s.lich.choLat && s.canh === 'lich' && (k === 'Enter' || k === ' ' || k === 'ArrowUp')) { latTrang('phim'); e.preventDefault(); return; }
    if (s.cach === 'quay') {
      if (k === 'Enter') { xongQuay(); e.preventDefault(); return; }
      if (k === 'ArrowRight' || k === 'ArrowLeft') {
        const truoc = s.gio.T;
        const buoc = (s.gio.kimChon === 'phut' ? 5 : 60) * (k === 'ArrowRight' ? 1 : -1);
        s.gio.T = ((s.gio.T + buoc) % 720 + 720) % 720;
        veKim();
        ghiXoay(s.gio.kimChon, truoc);
        e.preventDefault();
        return;
      }
      if (k === 'g' || k === 'p') { s.gio.kimChon = k === 'g' ? 'gio' : 'phut'; capNhatChonKim(); }
      return;
    }
    if (s.cach === 'xep' && k === 'Enter') { xongXep(); e.preventDefault(); return; }
    if (s.cach === 'xep' && /^[1-3]$/.test(k) && s.buoi.chonThe) { datVaoO(s.buoi.chonThe, +k - 1, 'phim'); e.preventDefault(); return; }
    if (s.cach === 'thu' && /^[1-7]$/.test(k)) { const d = dauCot(+k - 1); if (d) chamThu(+k - 1, d); e.preventDefault(); return; }
    if (/^[1-9]$/.test(k) && s.q.lua_chon && (s.cach === 'chon' || s.cach === 'dem')) { chonThe(+k - 1); e.preventDefault(); }
  }

  /* ---------------- Kết thúc ---------------- */

  function huyHen() { if (s) { s.hen.forEach(clearTimeout); s.hen = []; } }

  function ketThuc() {
    const o = s.o;
    const diem = K().diem();
    const soDung = s.soDung;
    huyHen();
    huyKeo();
    K().dong();
    s.van.ketThuc(false, { diem: diem, so_dung: soDung }).then(function (kq) {
      kq.diem = diem;
      kq.dongPhu = 'Phố Đồng Hồ: đúng ' + soDung + ' câu · ' + diem.toLocaleString('vi-VN') + ' điểm';
      s = null;
      if (o.onXong) o.onXong(kq);
    });
  }

  function thoat() {
    if (!s) return;
    const o = s.o;
    const diem = K().diem();
    huyHen();
    huyKeo();
    K().dong();
    s.van.ketThuc(true, { ly_do: 've_dao', diem: diem }).then(function (kq) {
      s = null;
      if (o.onThoat) o.onThoat(kq);
    });
  }

  /* ============================================================
     Bài học 30 giây (dạy theo SGK Bài 29, 30, 31)
     ============================================================ */

  function dhBh(h, m, o) { return '<div class="ll2-bh">' + DH().svg(h, m, Object.assign({ size: 270 }, o || {})) + '</div>'; }
  function dangKyBaiHoc() {
    if (!window.BaiHoc || !window.DongHo) return;
    const BH = window.BaiHoc;
    BH.dangKy('xem-dong-ho', {
      ten: 'Xem đồng hồ',
      buoc: [
        { chu: 'Đồng hồ có kim giờ và kim phút. Kim giờ ngắn, kim phút dài.', ve: function () { return dhBh(3, 0, { chuThich: true }); } },
        { chu: 'Kim phút chỉ số 12, kim giờ chỉ số 8. Đồng hồ chỉ 8 giờ.', ve: function () { return dhBh(8, 0, { giai: true }); } },
        { chu: 'Kim phút chỉ số 3 là 15 phút. Kim giờ vừa đi qua số 8. Đồng hồ chỉ 8 giờ 15 phút.', ve: function () { return dhBh(8, 15, { giai: true }); } },
        { chu: 'Kim phút chỉ số 6 là 30 phút. Kim giờ nằm giữa số 8 và số 9, ta đọc số 8. Đồng hồ chỉ 8 giờ 30 phút.', ve: function () { return dhBh(8, 30, { giai: true }); } },
        { chu: 'Con thử nhé: đồng hồ chỉ mấy giờ?', ve: function () { return dhBh(2, 30); },
          thu: { lua_chon: ['2 giờ 30 phút', '3 giờ 30 phút', '2 giờ 6 phút'], dung: '2 giờ 30 phút', dung_noi: 'Đúng rồi! Kim phút chỉ số 6, kim giờ nằm giữa số 2 và số 3: 2 giờ 30 phút.', sai_noi: 'Kim giờ nằm giữa số 2 và số 3 nên đọc là 2 giờ. Kim phút chỉ số 6 là 30 phút: 2 giờ 30 phút.' } }
      ]
    });
    BH.dangKy('ngay-gio', {
      ten: 'Ngày và giờ',
      buoc: [
        { chu: 'Một ngày có 24 giờ, tính từ 12 giờ đêm hôm trước đến 12 giờ đêm hôm sau.', ve: function () { return '<div class="ll2-bh dai">' + DH().dai({ size: 660 }) + '</div>'; } },
        { chu: 'Buổi sáng từ 1 giờ đến 10 giờ. Buổi trưa là 11 giờ và 12 giờ.', ve: function () { return '<div class="ll2-bh dai">' + DH().dai({ size: 660, buoi: 'sang' }) + '</div>'; } },
        { chu: 'Buổi chiều: 1 giờ chiều là 13 giờ, 2 giờ chiều là 14 giờ, … 6 giờ chiều là 18 giờ.', ve: function () { return '<div class="ll2-bh dai">' + DH().dai({ size: 660, buoi: 'chieu', nhan12: true }) + '</div>'; } },
        { chu: 'Buổi tối: 7 giờ tối là 19 giờ, 8 giờ tối là 20 giờ. Buổi đêm: 10 giờ đêm là 22 giờ.', ve: function () { return '<div class="ll2-bh dai">' + DH().dai({ size: 660, buoi: 'toi', nhan12: true, danhDau: [{ h: 20, nhan: '8 giờ tối = 20 giờ' }] }) + '</div>'; } },
        { chu: 'Con thử nhé: 8 giờ tối còn gọi là mấy giờ?', ve: function () { return dhBh(8, 0, { buoi: 'toi' }); },
          thu: { lua_chon: ['20 giờ', '8 giờ', '18 giờ'], dung: '20 giờ', dung_noi: 'Đúng rồi! Buổi tối thì cộng thêm 12: 8 + 12 = 20.', sai_noi: 'Buổi tối thì cộng thêm 12: 8 + 12 = 20. Vậy 8 giờ tối là 20 giờ.' } }
      ]
    });
    const t11 = { thang: 11, t1: 0 };
    BH.dangKy('xem-lich', {
      ten: 'Xem lịch',
      buoc: [
        { chu: 'Đây là tờ lịch tháng 11. Hàng trên cùng ghi các thứ: Thứ Hai, Thứ Ba, … đến Chủ nhật.', ve: function () { return '<div class="ll2-bh">' + DH().lich(t11, { size: 340 }) + '</div>'; } },
        { chu: 'Ngày 1 tháng 11 là thứ Hai. Tìm ngày 20, nhìn lên đầu cột: ngày 20 tháng 11 là thứ Bảy.', ve: function () { return '<div class="ll2-bh">' + DH().lich(t11, { size: 340, khoanh: [1, 20], cot: 5 }) + '</div>'; } },
        { chu: 'Một tuần có 7 ngày. Thứ Hai tuần này là ngày 8 thì thứ Hai tuần sau là ngày 8 + 7 = 15.', ve: function () { return '<div class="ll2-bh">' + DH().lich(t11, { size: 340, khoanh: [8], dung: [15], muiTen: [8, 15] }) + '</div>'; } },
        { chu: 'Tháng 1, 3, 5, 7, 8, 10, 12 có 31 ngày. Tháng 4, 6, 9, 11 có 30 ngày. Tháng 2 có 28 hoặc 29 ngày.', ve: function () {
          return '<div class="ll2-bh ll2-bh-thang">' + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(function (t) {
            const n = window.CauThoiGian.soNgay(t);
            return '<span class="ll2-bh-o n' + n + '"><b>Tháng ' + t + '</b><small>' + (n === 28 ? '28 hoặc 29' : n) + ' ngày</small></span>';
          }).join('') + '</div>';
        } },
        { chu: 'Con thử nhé: ngày 17 tháng 11 là thứ mấy?', ve: function () { return '<div class="ll2-bh">' + DH().lich(t11, { size: 340 }) + '</div>'; },
          thu: { lua_chon: ['Thứ Tư', 'Thứ Ba', 'Thứ Năm'], dung: 'Thứ Tư', dung_noi: 'Đúng rồi! Ngày 17 nằm ở cột Thứ Tư.', sai_noi: 'Tìm ngày 17 rồi nhìn lên đầu cột: đó là Thứ Tư.' } }
      ]
    });
  }
  dangKyBaiHoc();

  window.LatLich = { batDau: batDau, _trangThai: function () { return s; } };
  (window.DaoTroChoi = window.DaoTroChoi || {})['lat-lich'] = { ten: 'Lật Lịch', khung: true, san: 'll2-san', batDau: batDau, _trangThai: window.LatLich._trangThai };
})();
