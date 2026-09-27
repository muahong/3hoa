/* ============================================================
   rung-hinh-khoi.js – Game Rừng Hình Khối (vùng 5): bé thám hiểm từng khoảng rừng, mỗi khoảng là một bàn hình vẽ lớn
   - Câu hỏi lấy từ cau-hinh-hoc.js (6 kỹ năng B2.1 đến B2.5, B2.8). Ở game này mọi câu chơi bằng bàn tương tác
     (dạng thao_tac_hinh, keo_tha, nhap_so), ở game khác vẫn là câu chọn đáp án có hình.
   - Thao tác theo chế độ bàn (CauHinhHoc.cheDo): chạm chọn một (chon1) hay nhiều hình, điểm (chon_n); kéo từ điểm này
     tới điểm kia để nối đoạn thẳng (noi, bắt dính vào điểm) hay căng sợi dây kiểm tra ba điểm thẳng hàng; chạm đếm đoạn
     thẳng (dem_doan); chạm từng đoạn để cộng độ dài lên băng tính rồi tự viết kết quả (cong_doan); chạm lần lượt các điểm
     để đọc tên đường gấp khúc (theo_thu_tu); kéo đồ vật vào rổ khối trụ, khối cầu (keo_ro, keo_dem); kéo hai mảnh vào
     khuôn (ghep2); xếp hình A vào hình B (lap_manh); cắt theo nét đứt (cat). Mọi thao tác kéo đều có cách chạm thay thế.
   - Sai được thử lại một lần (VanChoi), sai lần nữa thì xem lời giải có hình (KhungChoi.phanHoiCau), câu quay lại sau 2 câu.
   - Ghi: cham, chon, bo_chon, noi (hai đầu), dem, keo, tha, dat, bo_ra, go_so, xoa, vuot; tra_loi kèm những gì bé đã làm.
   - Bài học 30 giây: diem-doan-thang, duong-gap-khuc, hinh-tu-giac, khoi-tru-cau (BaiHoc.dangKy).
   API: window.RungHinhKhoi = { batDau(o), _trangThai() }
   ============================================================ */
(function () {
  'use strict';

  const CO_GIAM_DONG = (function () { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();
  const BAN_KINH_DIEM = 34; // bán kính bắt dính điểm (đơn vị SVG, khoảng 30 đến 36 px)
  const NGUONG_KEO = 9; // px

  let s = null;
  let dom = null;

  function $(id) { return document.getElementById(id); }
  function K() { return window.KhungChoi; }
  function NH() { return window.NganHang; }
  function CH() { return window.CauHinhHoc; }
  function AT() { return window.AmThanh; }
  function esc(t) { return window.PhanHoi.esc(t); }

  const HUONG_DAN = {
    chon1: 'Chạm để chọn, rồi bấm Xong.',
    chon_n: 'Chạm để chọn, chạm lần nữa để bỏ chọn, rồi bấm Xong.',
    chon_n_diem: 'Chạm vào 3 điểm. Kéo từ điểm này tới điểm kia để căng sợi dây kiểm tra.',
    chon1_diem: 'Chạm vào một điểm. Kéo từ điểm này tới điểm kia để căng sợi dây kiểm tra.',
    noi: 'Đặt ngón tay vào một điểm rồi kéo tới điểm kia (hoặc chạm lần lượt hai điểm).',
    dem_doan: 'Chạm vào từng đoạn thẳng để đếm. Đoạn nằm chồng lên đoạn khác thì kéo từ đầu này tới đầu kia.',
    cong_doan: 'Chạm từng đoạn thẳng để cộng độ dài, rồi viết kết quả.',
    theo_thu_tu: 'Chạm lần lượt từng điểm, đi dọc theo đường gấp khúc.',
    danh_dau: 'Chạm vào từng hình tứ giác để đánh dấu khi đếm, rồi viết số.',
    danh_dau_ghep: 'Chạm các mảnh để tô một hình (một mảnh hay ghép nhiều mảnh), rồi viết số hình tứ giác.',
    keo_ro: 'Kéo vào đúng rổ, hoặc chạm vật rồi chạm rổ.',
    keo_dem: 'Kéo từng vật vào rổ cho dễ đếm, rồi viết số.',
    ghep2: 'Kéo hai mảnh vào khuôn (hoặc chạm mảnh), rồi bấm Xong.',
    lap_manh: 'Chạm vào hình B (hoặc kéo hình A vào) để xếp từng hình A, rồi viết số.',
    cat: 'Chạm vào từng nét đứt để cắt, rồi chọn câu trả lời.'
  };

  /* ---------------- Dựng giao diện ---------------- */

  function khoiDom() {
    if (dom) return dom;
    let san = $('rh-san');
    if (!san) {
      san = document.createElement('div');
      san.className = 'kc-game rh-san';
      san.id = 'rh-san';
      san.innerHTML =
        '<div class="rh-rung" id="rh-rung"><div class="rh-nang" aria-hidden="true"></div><i class="rh-la rh-la-1" aria-hidden="true"></i><i class="rh-la rh-la-2" aria-hidden="true"></i><i class="rh-la rh-la-3" aria-hidden="true"></i>' +
        '<div class="rh-ban" id="rh-ban"></div>' +
        '<div class="rh-dung hidden" id="rh-dung" role="status"><b id="rh-dung-chu"></b><span id="rh-dung-phu"></span></div></div>' +
        '<aside class="rh-ben" id="rh-ben">' +
        '<div class="rh-bien"><p id="rh-huong"></p></div>' +
        '<div class="rh-tt" id="rh-tt" aria-live="polite"></div>' +
        '<div class="rh-dap" id="rh-dap"></div>' +
        '<div class="rh-nut-hang"><button type="button" class="nut nut-trang rh-lam-lai hidden" id="rh-lam-lai">Làm lại</button>' +
        '<button type="button" class="nut nut-cam nut-to rh-xong" id="rh-xong" disabled>Xong</button></div>' +
        '<div class="rh-duoi"><ol class="rh-dau-chan" id="rh-dau-chan" aria-hidden="true"></ol><img class="rh-kiem" id="rh-kiem" alt=""></div>' +
        '</aside>';
      K().san().appendChild(san);
    }
    dom = { san: san, rung: $('rh-rung'), ban: $('rh-ban'), huong: $('rh-huong'), tt: $('rh-tt'), dap: $('rh-dap'), xong: $('rh-xong'), lamLai: $('rh-lam-lai'), dauChan: $('rh-dau-chan'), kiem: $('rh-kiem'), dung: $('rh-dung'), dungChu: $('rh-dung-chu'), dungPhu: $('rh-dung-phu') };
    dom.ban.addEventListener('pointerdown', xuong);
    dom.ban.addEventListener('pointermove', di);
    dom.ban.addEventListener('pointerup', len);
    dom.ban.addEventListener('pointercancel', huyKeo);
    dom.ban.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    dom.xong.addEventListener('click', function () { nop(); });
    dom.lamLai.addEventListener('click', function () { lamLai(); });
    dom.dap.addEventListener('click', function (e) {
      const b = e.target.closest('button');
      if (!b || !s || s.khoa || K().dangKhoa()) return;
      if (b.hasAttribute('data-k')) phimSo(b.getAttribute('data-k'));
      else if (b.hasAttribute('data-the')) chonThe(+b.getAttribute('data-the'));
    });
    return dom;
  }

  /**
   * o: { van, man, nen, phu, hinhGoiY, hinhCoVu, anh(ten), xemBaiHoc, onXong(kq), onThoat(kq) } (xem vaoMan trong app.js)
   */
  function batDau(o) {
    khoiDom();
    dom.san.classList.remove('hidden');
    s = { o: o, van: o.van, q: null, ct: null, cd: null, khoa: false, chuoi: 0, soDung: 0, soTha: 0 };
    // Ở Rừng Hình Khối mọi câu chơi bằng bàn tương tác: đổi dạng câu trong hàng đợi của ván (trước khi dựng câu)
    (s.van.hang || []).forEach(function (x) { x.dang = CH().dangTuongTac(x.cau_truc); });
    dom.kiem.src = o.anh ? o.anh('sp-kiem-long') : '';
    K().mo({
      van: o.van, game: 'rung-hinh-khoi', tenGame: 'Rừng Hình Khối', nen: o.nen, phu: o.phu, hinhGoiY: o.hinhGoiY,
      onGoiY: goiY, onThoat: thoat, xemBaiHoc: o.xemBaiHoc, onPhim: phim
    });
    s.van.batDau({ ban_tuong_tac: true, so_cau: s.van.soCauDuKien() });
    veDauChan();
    cauMoi(true);
  }

  function cauMoi(dau) {
    if (!s || s.het) return;
    dom.dung.classList.add('hidden');
    if (!s.van.conCau()) { ketThuc(); return; }
    const q = s.van.cauTiep();
    s.q = q;
    s.ct = q.cau_truc;
    s.cd = q.che_do || CH().cheDo(q.cau_truc);
    s.khoa = false;
    datLaiTrangThai();
    const di = function () {
      veBan();
      vePanel();
      K().anGoiY();
      K().de(q.de, q.de_doc, { nay: true, docNgay: true });
      K().tienDo();
      veDauChan();
    };
    if (dau || CO_GIAM_DONG) { di(); return; }
    // Bé "đi" sang khoảng rừng mới
    dom.rung.classList.remove('rh-den');
    dom.rung.classList.add('rh-di');
    setTimeout(function () {
      if (!s) return;
      dom.rung.classList.remove('rh-di');
      di();
      void dom.rung.offsetWidth;
      dom.rung.classList.add('rh-den');
    }, 260);
  }

  function datLaiTrangThai() {
    s.chon = [];          // id đang chọn (điểm, hình, đồ vật, mảnh)
    s.gach = [];          // lựa chọn bị gạch khi gợi ý cấp 3
    s.sang = null;        // điểm, hình được tô sáng khi gợi ý
    s.cho = null;         // điểm đầu đang chờ (chạm hai điểm để nối) hoặc vật đang cầm (chạm vật rồi chạm rổ)
    s.noi = null;         // đoạn bé vừa nối [tên a, tên b]
    s.day = null;         // sợi dây kiểm tra [tên a, tên b]
    s.dem = [];           // đoạn đã đánh dấu (đếm, cộng độ dài)
    s.thuTu = [];         // điểm theo thứ tự (đọc tên)
    s.so = '';            // số bé viết
    s.danh = [];          // hình đã đánh dấu (đếm tứ giác)
    s.ro = {};            // vật đã bỏ vào rổ: chỉ số -> 'tru' | 'cau'
    s.khe = [];           // khe hình B đã xếp hình A (theo thứ tự xếp)
    s.cat = [];           // nét đã cắt
    s.the = null;         // thẻ đáp án đang chọn
    s.keo = null;         // cử chỉ đang diễn ra
    s.tha = null;         // đồ vật đã thả vào rổ (phân loại): { i, k }
    s.gachRo = [];        // rổ bị gạch khi gợi ý cấp 3
    s.ro_thu = {};
  }

  /* ---------------- Vẽ bàn ---------------- */

  function veBan() {
    dom.ban.innerHTML = CH().veBan(s.ct, { tt: true, nen: false }); // hình do ngân hàng câu dựng (không chứa dữ liệu người dùng)
    s.svg = dom.ban.querySelector('svg');
    s.lop = s.svg.querySelector('.rh-lop');
    s.lopDuoi = s.svg.querySelector('.rh-lop-duoi');
    s.diem = CH().cacDiem(s.ct);
    s.doan = CH().cacDoan(s.ct);
    dom.ban.setAttribute('data-che-do', s.cd);
    capNhatBan();
  }

  function el(sel) { return s.svg ? s.svg.querySelector(sel) : null; }
  function tatCa(sel) { return s.svg ? Array.prototype.slice.call(s.svg.querySelectorAll(sel)) : []; }
  function diemTheoTen(t) { return s.diem.find(function (d) { return d.ten === t; }) || null; }
  function lop(elm, ten, co) { if (elm) elm.classList.toggle(ten, !!co); }

  const MAU_DEM = ['#ff7a1a', '#0f9f76', '#3b8fd0', '#d9679f', '#8a63d8', '#d9a21b'];

  /** Vẽ lại các lớp phủ và trạng thái chọn theo s. */
  function capNhatBan() {
    if (!s || !s.svg) return;
    const c = s.cd;
    const k = s.ct.loai + '.' + s.ct.kieu;
    tatCa('[data-diem]').forEach(function (e) { const t = e.getAttribute('data-diem'); lop(e, 'rh-chon', s.chon.indexOf(t) >= 0 || s.thuTu.indexOf(t) >= 0 || s.cho === t); lop(e, 'rh-sang', s.sang === t); lop(e, 'rh-gach', s.gach.indexOf(t) >= 0); });
    tatCa('[data-doi]').forEach(function (e) { const t = e.getAttribute('data-doi'); lop(e, 'rh-chon', s.chon.indexOf(t) >= 0); lop(e, 'rh-gach', s.gach.indexOf(t) >= 0); });
    tatCa('[data-hinh]').forEach(function (e) {
      const t = e.getAttribute('data-hinh');
      lop(e, 'rh-chon', s.chon.indexOf(t) >= 0 || s.danh.indexOf(t) >= 0);
      lop(e, 'rh-gach', s.gach.indexOf(t) >= 0);
      lop(e, 'rh-sang', s.sang === t);
    });
    tatCa('[data-doan]').forEach(function (e) { const t = e.getAttribute('data-doan'); lop(e, 'rh-chon', s.dem.indexOf(t) >= 0); });
    tatCa('[data-khe]').forEach(function (e) { lop(e, 'rh-day', s.khe.indexOf(+e.getAttribute('data-khe')) >= 0); });
    tatCa('[data-net]').forEach(function (e) { lop(e, 'rh-da-cat', s.cat.indexOf(+e.getAttribute('data-net')) >= 0); });
    tatCa('[data-ro]').forEach(function (e) { lop(e, 'rh-gach', s.gachRo.indexOf(e.getAttribute('data-ro')) >= 0); });
    // Đồ vật trong rổ, mảnh trong khuôn
    tatCa('[data-keo]').forEach(function (e) {
      const i = e.getAttribute('data-keo');
      if (i === 'A') return;
      let tf = '';
      if (c === 'keo_dem' && s.ro[i]) tf = viTriTrongRo(i);
      if (c === 'ghep2' && s.chon.indexOf(i) >= 0) tf = viTriTrongKhuon(i);
      if (c === 'keo_ro' && s.tha && s.tha.i === i) tf = viTriThaRo(i, s.tha.k);
      e.setAttribute('transform', tf);
      lop(e, 'rh-cam', s.cho === i);
      lop(e, 'rh-trong-ro', !!tf);
    });
    // Lớp dưới điểm: đoạn vừa nối, sợi dây, đoạn đã đếm
    let duoi = '';
    if (s.day) duoi += veDay(s.day[0], s.day[1]);
    if (s.noi) duoi += veDoanNoi(s.noi[0], s.noi[1], '#ff7a1a', 9);
    if (c === 'dem_doan') s.dem.forEach(function (t, i) { duoi += veDoanDem(t, MAU_DEM[i % MAU_DEM.length], i + 1); });
    if (c === 'theo_thu_tu') for (let i = 0; i + 1 < s.thuTu.length; i++) duoi += veDoanNoi(s.thuTu[i], s.thuTu[i + 1], '#ff7a1a', 11, true);
    if (s.lopDuoi) s.lopDuoi.innerHTML = duoi;
    // Lớp trên: số thứ tự, hình A đã xếp, dây đang kéo
    let tren = '';
    if (c === 'theo_thu_tu') s.thuTu.forEach(function (t, i) { const d = diemTheoTen(t); if (d) tren += soNho(d.x + 20, d.y + 22, i + 1, '#ff7a1a'); });
    if (c === 'lap_manh') {
      const b = CH().boCucXep(s.ct.m);
      s.khe.forEach(function (i, n) {
        const t = b.khe[i];
        const cx = b.bx + (t[0][0] + t[1][0] + t[2][0]) / 3 * b.g, cy = b.by + (t[0][1] + t[1][1] + t[2][1]) / 3 * b.g;
        tren += '<text x="' + cx.toFixed(1) + '" y="' + (cy + 8).toFixed(1) + '" text-anchor="middle" font-size="22" fill="#7a3d00">' + (n + 1) + '</text>';
      });
    }
    if (s.keo && s.keo.day) tren += s.keo.day;
    if (s.keo && s.keo.bong) tren += s.keo.bong;
    if (s.lop) s.lop.innerHTML = tren;
    if (c === 'cat') catManh();
    lop(s.svg, 'rh-co-manh', c === 'ghep2' && s.chon.length > 0);
    capNhatPanel();
  }

  function veDoanNoi(a, b, mau, day, mui) {
    const p = diemTheoTen(a), q = diemTheoTen(b);
    if (!p || !q) return '';
    return '<line x1="' + p.x + '" y1="' + p.y + '" x2="' + q.x + '" y2="' + q.y + '" stroke="' + mau + '" stroke-width="' + day + '" stroke-linecap="round"' + (mui ? ' opacity=".75"' : '') + '/>';
  }
  function veDay(a, b) {
    const p = diemTheoTen(a), q = diemTheoTen(b);
    if (!p || !q) return '';
    const dx = q.x - p.x, dy = q.y - p.y, l = Math.hypot(dx, dy) || 1, e = 900;
    return '<line class="rh-soi-day" x1="' + (p.x - dx / l * e).toFixed(1) + '" y1="' + (p.y - dy / l * e).toFixed(1) + '" x2="' + (q.x + dx / l * e).toFixed(1) + '" y2="' + (q.y + dy / l * e).toFixed(1) + '" stroke="#8a63d8" stroke-width="3.5" stroke-dasharray="12 8" stroke-linecap="round"/>';
  }
  /** Đoạn đã đếm: tô màu; đoạn dài nằm chồng (ba điểm thẳng hàng) vẽ lệch lên cho thấy. */
  function veDoanDem(t, mau, so) {
    const d = s.doan.find(function (x) { return x.ten === t; });
    if (!d) return '';
    const p = s.diem[d.a], q = s.diem[d.b];
    let lech = 0;
    const giua = s.diem.some(function (r, i) { return i !== d.a && i !== d.b && Math.abs((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)) < 1 && (r.x - p.x) * (r.x - q.x) + (r.y - p.y) * (r.y - q.y) < 0; });
    if (giua) lech = 16;
    const dx = q.x - p.x, dy = q.y - p.y, l = Math.hypot(dx, dy) || 1;
    let nx = dy / l, ny = -dx / l;
    if (ny > 0) { nx = -nx; ny = -ny; }
    const x1 = p.x + nx * lech, y1 = p.y + ny * lech, x2 = q.x + nx * lech, y2 = q.y + ny * lech;
    return '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="' + mau + '" stroke-width="' + (giua ? 7 : 13) + '" stroke-linecap="round" opacity=".85"/>' +
      soNho((x1 + x2) / 2 + nx * 24, (y1 + y2) / 2 + ny * 24, so, mau);
  }
  function soNho(x, y, so, mau) {
    return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="15" fill="' + mau + '" stroke="#fff" stroke-width="3"/><text x="' + x.toFixed(1) + '" y="' + (y + 7).toFixed(1) + '" text-anchor="middle" font-size="19" fill="#fff">' + so + '</text>';
  }
  /** Điểm trên đoạn t (lech: khoảng cách lệch khỏi đoạn, đơn vị SVG). */
  function trungDiemDoan(t, lech) {
    const d = s.doan.find(function (x) { return x.ten === t; });
    if (!d) return null;
    const p = s.diem[d.a], q = s.diem[d.b];
    const dx = q.x - p.x, dy = q.y - p.y, l = Math.hypot(dx, dy) || 1;
    let nx = dy / l, ny = -dx / l;
    if (ny < 0) { nx = -nx; ny = -ny; }
    const k = lech == null ? 26 : lech;
    return { x: (p.x + q.x) / 2 + nx * k, y: (p.y + q.y) / 2 + ny * k };
  }

  /** Vị trí một đồ vật trong rổ (Đếm): xếp thành hàng trên miệng rổ, thu nhỏ. */
  function viTriTrongRo(i) {
    const e = el('[data-keo="' + i + '"]');
    const k = s.ro[i];
    const trong = Object.keys(s.ro).filter(function (j) { return s.ro[j] === k; }).sort(function (a, b) { return s.ro_thu[a] - s.ro_thu[b]; });
    const n = trong.indexOf(String(i));
    const cxRo = k === 'tru' ? 190 : 450;
    const cx = +e.getAttribute('data-cx'), cy = +e.getAttribute('data-cy');
    const tx = cxRo - 72 + (n % 5) * 36, ty = 280 - Math.floor(n / 5) * 26;
    return 'translate(' + tx + ',' + ty + ') scale(.42) translate(' + (-cx) + ',' + (-cy) + ')';
  }
  function viTriThaRo(i, k) {
    const e = el('[data-keo="' + i + '"]');
    const ro = el('[data-ro="' + k + '"]');
    if (!e || !ro || !ro.getBBox) return '';
    const b = ro.getBBox();
    const cx = +e.getAttribute('data-cx'), cy = +e.getAttribute('data-cy');
    return 'translate(' + (b.x + b.width / 2).toFixed(1) + ',' + (b.y + 8).toFixed(1) + ') scale(.46) translate(' + (-cx) + ',' + (-cy) + ')';
  }
  function viTriTrongKhuon(i) {
    const e = el('[data-keo="' + i + '"]');
    const n = s.chon.indexOf(i);
    const cx = +e.getAttribute('data-cx'), cy = +e.getAttribute('data-cy');
    const k = Math.min(0.6, 84 / Math.max(1, +e.getAttribute('data-w') || 100), 58 / Math.max(1, +e.getAttribute('data-h') || 100));
    const tx = n === 0 ? 462 : 562, ty = 340;
    return 'translate(' + tx + ',' + ty + ') scale(' + k.toFixed(3) + ') translate(' + (-cx) + ',' + (-cy) + ')';
  }

  /** Cắt xong hết nét thì các mảnh giấy tách ra. */
  function catManh() {
    const b = CH().boCucCat(s.ct.m);
    const xong = s.cat.length === b.mau.net.length;
    tatCa('[data-manh]').forEach(function (e) {
      const i = +e.getAttribute('data-manh');
      if (!xong) { e.removeAttribute('transform'); return; }
      const p = b.mau.manh[i];
      const cx = p.reduce(function (a, q) { return a + q[0]; }, 0) / p.length, cy = p.reduce(function (a, q) { return a + q[1]; }, 0) / p.length;
      const dx = (cx - b.mau.w / 2) * 0.22 * b.g, dy = (cy - b.mau.h / 2) * 0.22 * b.g;
      e.setAttribute('transform', 'translate(' + dx.toFixed(1) + ',' + dy.toFixed(1) + ')');
    });
    lop(el('.rh-giay'), 'rh-da-tach', xong);
  }

  /* ---------------- Bảng bên: hướng dẫn, băng tính, bàn phím, thẻ ---------------- */

  function vePanel() {
    const c = s.cd;
    const k = s.ct.loai + '.' + s.ct.kieu;
    let hd = HUONG_DAN[c] || '';
    if (c === 'chon_n' && s.ct.loai === 'thang_hang') hd = HUONG_DAN.chon_n_diem;
    if (c === 'chon1' && s.ct.loai === 'thang_hang') hd = HUONG_DAN.chon1_diem;
    if (c === 'danh_dau' && s.ct.kieu === 'dem_ghep') hd = HUONG_DAN.danh_dau_ghep;
    if (k === 'khoi.tim_vat') hd = 'Kéo vật có dạng ' + CH().TEN_KHOI[s.ct.hoi] + ' vào rổ, hoặc chạm vật rồi chạm rổ.';
    dom.huong.textContent = hd;
    const phim = CH().canBanPhim(s.ct);
    dom.san.classList.toggle('rh-co-phim', phim);
    dom.san.classList.toggle('rh-co-the', c === 'cat');
    let h = '';
    if (phim) {
      h = '<div class="rh-phim" role="group" aria-label="Bàn phím số">' + [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) { return '<button type="button" data-k="' + n + '">' + n + '</button>'; }).join('') +
        '<button type="button" data-k="xoa" class="rh-phim-xoa" aria-label="Xóa">⌫</button><button type="button" data-k="0">0</button></div>';
    } else if (c === 'cat') {
      h = '<div class="rh-cac-the">' + s.q.lua_chon.map(function (x, i) { return '<button type="button" class="rh-the" data-the="' + i + '">' + esc(NH().hienGiaTriCau(s.ct, x.gia_tri)) + '</button>'; }).join('') + '</div>';
    }
    dom.dap.innerHTML = h;
    dom.lamLai.classList.toggle('hidden', ['chon1', 'keo_ro'].indexOf(c) >= 0);
    capNhatPanel();
  }

  function capNhatPanel() {
    if (!s || !s.q) return;
    const c = s.cd;
    let t = '';
    const chip = function (x, lopThem) { return '<span class="rh-chip' + (lopThem ? ' ' + lopThem : '') + '">' + esc(x) + '</span>'; };
    if (c === 'chon1' || c === 'chon_n') {
      if (s.chon.length) t = '<span class="rh-nhan">Con chọn</span>' + s.chon.map(function (x) { return chip(tenChon(x)); }).join('');
      else t = '<span class="rh-nhan mo">Chưa chọn</span>';
    } else if (c === 'noi') {
      t = s.noi ? '<span class="rh-nhan">Con nối</span>' + chip('Đoạn thẳng ' + s.noi.join('')) : s.cho ? '<span class="rh-nhan">Từ điểm ' + esc(s.cho) + '…</span>' : '<span class="rh-nhan mo">Chưa nối</span>';
    } else if (c === 'dem_doan') {
      t = '<span class="rh-dem-so"><b>' + s.dem.length + '</b> đoạn thẳng</span>' + (s.dem.length ? '<span class="rh-chip-hang">' + s.dem.map(function (x) { return chip(x); }).join('') + '</span>' : '');
    } else if (c === 'cong_doan') {
      const l = s.dem.map(function (x) { const d = s.doan.find(function (y) { return y.ten === x; }); return d ? d.l : 0; });
      t = '<div class="rh-bang-tinh">' + (l.length ? l.map(function (x) { return '<span>' + x + ' cm</span>'; }).join('<i>+</i>') + '<i>=</i>' : '<span class="mo">Chạm vào từng đoạn thẳng</span>') + oSo('cm') + '</div>';
    } else if (c === 'theo_thu_tu') {
      t = '<span class="rh-nhan">Đường gấp khúc</span><span class="rh-ten-duong">' + (s.thuTu.length ? esc(s.thuTu.join('')) : '…') + '</span>';
    } else if (c === 'danh_dau' || c === 'lap_manh' || c === 'keo_dem') {
      const nhan = c === 'lap_manh' ? 'Cần' : 'Có';
      const donVi = c === 'lap_manh' ? 'hình A' : c === 'keo_dem' ? 'vật dạng ' + CH().TEN_KHOI[s.ct.hoi] : s.ct.kieu === 'dem_ghep' ? 'hình tứ giác' : 'hình tứ giác';
      t = '<div class="rh-bang-tinh rh-cau-so"><span class="rh-nhan">' + nhan + '</span>' + oSo(donVi) + '</div>';
    } else if (c === 'ghep2') {
      t = s.chon.length ? '<span class="rh-nhan">Mảnh</span>' + s.chon.map(function (x) { return chip(x); }).join('<i class="rh-va">và</i>') : '<span class="rh-nhan mo">Chưa có mảnh nào trong khuôn</span>';
    } else if (c === 'cat') {
      const n = CH().MAU_CAT[s.ct.m].net.length;
      t = '<span class="rh-nhan">Đã cắt ' + s.cat.length + '/' + n + ' nét</span>';
    } else if (c === 'keo_ro') {
      t = s.cho != null ? '<span class="rh-nhan">Con đang cầm</span>' + chip(tenVat(s.cho)) : '';
    }
    dom.tt.innerHTML = t;
    if (c === 'cat') tatCaThe().forEach(function (b, i) { b.classList.toggle('chon', s.the === i); });
    dom.xong.disabled = !coTheNop();
    dom.xong.classList.toggle('hidden', c === 'keo_ro');
  }
  function oSo(donVi) { return '<span class="rh-o-so' + (s.so ? '' : ' trong') + '"><b>' + (s.so || '?') + '</b><small>' + esc(donVi) + '</small></span>'; }
  function tatCaThe() { return Array.prototype.slice.call(dom.dap.querySelectorAll('.rh-the')); }
  function tenVat(i) { const v = s.ct.vat ? s.ct.vat[+i] : s.ct.v; return CH().VAT[v] ? CH().VAT[v].ten : String(i); }
  function tenChon(x) {
    const k = s.ct.loai;
    if (k === 'tu_giac') return 'Hình ' + x;
    if (k === 'khoi') return tenVat(+x - 1);
    return x;
  }

  function coTheNop() {
    if (!s || s.khoa) return false;
    const c = s.cd;
    if (c === 'chon1') return s.chon.length === 1;
    if (c === 'chon_n') return s.ct.loai === 'thang_hang' ? s.chon.length === 3 : s.chon.length >= 1;
    if (c === 'noi') return !!s.noi;
    if (c === 'dem_doan') return s.dem.length >= 1;
    if (c === 'theo_thu_tu') return s.thuTu.length >= 2;
    if (c === 'ghep2') return s.chon.length === 2;
    if (c === 'cat') return s.the != null;
    if (CH().canBanPhim(s.ct)) return s.so.length > 0;
    return false;
  }

  /* ---------------- Tọa độ, bắt dính ---------------- */

  function toaDo(e) {
    const m = s.svg && s.svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const pt = s.svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const r = pt.matrixTransform(m.inverse());
    return { x: r.x, y: r.y };
  }
  function tiLe() { const m = s.svg && s.svg.getScreenCTM(); return m ? m.a : 1; }
  function diemGan(p, boQua) {
    let tot = null, kcTot = BAN_KINH_DIEM / Math.min(1, tiLe());
    s.diem.forEach(function (d) {
      if (boQua && boQua.indexOf(d.ten) >= 0) return;
      const k = Math.hypot(d.x - p.x, d.y - p.y);
      if (k < kcTot) { kcTot = k; tot = d; }
    });
    return tot;
  }
  function viTriChuan(p) { return { x: Math.round(Math.max(0, Math.min(1, p.x / CH().W)) * 100) / 100, y: Math.round(Math.max(0, Math.min(1, p.y / CH().H)) * 100) / 100 }; }
  function diemCoDinh() { return s.ct.loai === 'thang_hang' && s.ct.kieu === 'diem_thu_ba' ? [s.ct.ten[0], s.ct.ten[1]] : []; }

  /* ---------------- Cử chỉ: chạm, kéo ---------------- */

  function dangChoi() { return s && !s.het && s.q && !s.q.xong && !s.khoa && !K().dangKhoa(); }

  function xuong(e) {
    if (!dangChoi() || s.keo) return;
    if (e.button != null && e.button > 0) return;
    const p = toaDo(e);
    const cd = s.cd;
    const g = { id: e.pointerId, x0: e.clientX, y0: e.clientY, p0: p, p: p, dich: false, dich0: false, dau: null, vat: null, nguonA: false, net: null, dayQua: [] };
    const dungDiem = ['noi', 'dem_doan', 'chon_n', 'chon1', 'theo_thu_tu'].indexOf(cd) >= 0 && s.diem.length;
    if (dungDiem) { const d = diemGan(p); if (d) g.dau = d.ten; }
    const keo = e.target.closest ? e.target.closest('[data-keo]') : null;
    if (keo && ['keo_ro', 'keo_dem', 'ghep2', 'lap_manh'].indexOf(cd) >= 0) {
      if (keo.getAttribute('data-keo') === 'A') g.nguonA = true;
      else if (!(cd === 'keo_ro' && s.gach.indexOf(String(+keo.getAttribute('data-keo') + 1)) >= 0)) g.vat = keo;
    }
    const net = e.target.closest ? e.target.closest('[data-net]') : null;
    if (net && cd === 'cat') g.net = +net.getAttribute('data-net');
    g.dich0 = e.target;
    s.keo = g;
    try { dom.ban.setPointerCapture(e.pointerId); } catch (err) { /* bỏ qua */ }
    e.preventDefault();
  }

  function di(e) {
    const g = s && s.keo;
    if (!g || g.id !== e.pointerId) return;
    const p = toaDo(e);
    g.p = p;
    if (!g.dich && Math.hypot(e.clientX - g.x0, e.clientY - g.y0) > NGUONG_KEO) {
      g.dich = true;
      if (g.vat) {
        g.vat.classList.add('rh-dang-keo');
        if (g.vat.parentNode) g.vat.parentNode.insertBefore(g.vat, s.lop || null);
        s.van.thaoTac('keo', { doi_tuong: doiTuongKeo(g.vat), gia_tri: giaTriKeo(g.vat), vi_tri: 'ban' });
        AT().bat('cham');
      }
      if (g.nguonA) s.van.thaoTac('keo', { doi_tuong: 'hinh_a', vi_tri: 'khay' });
      if (s.cd === 'theo_thu_tu' && g.dau && s.thuTu.indexOf(g.dau) < 0) themThuTu(g.dau);
    }
    if (!g.dich) return;
    if (g.dau) {
      const d = diemGan(p, [g.dau]);
      const a = diemTheoTen(g.dau);
      const x2 = d ? d.x : p.x, y2 = d ? d.y : p.y;
      g.day = '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="' + (s.cd === 'chon_n' || s.cd === 'chon1' ? '#8a63d8' : '#ff7a1a') + '" stroke-width="7" stroke-linecap="round" stroke-dasharray="' + (d ? '' : '10 8') + '" opacity=".85"/>' +
        (d ? '<circle cx="' + d.x + '" cy="' + d.y + '" r="22" fill="none" stroke="#ff7a1a" stroke-width="4"/>' : '');
      // Đọc tên đường gấp khúc: kéo qua các điểm cũng được
      if (s.cd === 'theo_thu_tu' && d && g.dayQua.indexOf(d.ten) < 0) {
        themThuTu(d.ten);
        g.dayQua.push(d.ten);
        g.dau = d.ten;
      }
      capNhatBan();
    } else if (g.vat) {
      const dx = p.x - g.p0.x, dy = p.y - g.p0.y;
      const goc = g.vat.getAttribute('data-goc-tf') != null ? g.vat.getAttribute('data-goc-tf') : (g.vat.getAttribute('transform') || '');
      g.vat.setAttribute('data-goc-tf', goc);
      g.vat.setAttribute('transform', 'translate(' + dx.toFixed(1) + ',' + dy.toFixed(1) + ') ' + goc);
      danhDauRo(e);
    } else if (g.nguonA) {
      const b = CH().boCucXep(s.ct.m);
      const t = [[0, 0], [0, 1], [1, 1]];
      g.bong = '<polygon points="' + t.map(function (q) { return (p.x - b.g / 2 + q[0] * b.g).toFixed(1) + ',' + (p.y - b.g / 2 + q[1] * b.g).toFixed(1); }).join(' ') + '" fill="#ffb347" stroke="#c46a00" stroke-width="3" opacity=".85"/>';
      capNhatBan();
    }
  }

  function len(e) {
    const g = s && s.keo;
    if (!g || g.id !== e.pointerId) return;
    s.keo = null;
    try { dom.ban.releasePointerCapture(e.pointerId); } catch (err) { /* bỏ qua */ }
    if (!dangChoi()) { traVat(g); capNhatBan(); return; }
    if (!g.dich) { cham(g); capNhatBan(); return; }
    // Kết thúc một lần kéo
    if (g.dau) {
      const d = diemGan(g.p, [g.dau]);
      if (d && s.cd !== 'theo_thu_tu') noiHaiDiem(g.dau, d.ten, 'keo');
      capNhatBan();
      return;
    }
    if (g.vat) { thaVat(g, e); return; }
    if (g.nguonA) { const k = kheTai(g.p); if (k != null) datKhe(k, 'keo'); capNhatBan(); return; }
    if (g.net != null) { catNet(g.net, 'vuot'); return; }
    capNhatBan();
  }

  function huyKeo(e) {
    const g = s && s.keo;
    if (!g || g.id !== e.pointerId) return;
    s.keo = null;
    traVat(g);
    capNhatBan();
  }

  function traVat(g) {
    if (!g || !g.vat) return;
    g.vat.classList.remove('rh-dang-keo');
    const goc = g.vat.getAttribute('data-goc-tf');
    g.vat.removeAttribute('data-goc-tf');
    if (goc != null) g.vat.setAttribute('transform', goc);
  }

  function doiTuongKeo(e) {
    if (s.ct.loai === 'khoi') return 'do_vat';
    return 'manh_ghep';
  }
  function giaTriKeo(e) {
    const i = e.getAttribute('data-keo');
    if (s.ct.loai === 'khoi') return s.ct.vat ? s.ct.vat[+i] : s.ct.v;
    return 'manh_' + i;
  }

  /** Rổ (hoặc khuôn) nằm dưới ngón tay. */
  function roTai(e) {
    let tot = null;
    tatCa('[data-ro]').forEach(function (r) {
      const b = r.getBoundingClientRect();
      if (e.clientX >= b.left && e.clientX <= b.right && e.clientY >= b.top && e.clientY <= b.bottom) tot = r;
    });
    return tot;
  }
  function danhDauRo(e) { const r = roTai(e); tatCa('[data-ro]').forEach(function (x) { lop(x, 'rh-sap-tha', x === r); }); }
  function boDanhDauRo() { tatCa('[data-ro]').forEach(function (x) { lop(x, 'rh-sap-tha', false); }); }

  function thaVat(g, e) {
    const r = roTai(e);
    boDanhDauRo();
    g.vat.classList.remove('rh-dang-keo');
    const goc = g.vat.getAttribute('data-goc-tf');
    g.vat.removeAttribute('data-goc-tf');
    g.vat.setAttribute('transform', goc || '');
    const i = g.vat.getAttribute('data-keo');
    const k = r ? r.getAttribute('data-ro') : null;
    if (s.cd === 'keo_ro') {
      if (k) { boVaoRo(i, k, 'keo'); return; }
      s.van.thaoTac('tha', { doi_tuong: 'do_vat', gia_tri: giaTriKeo(g.vat), den: 'ngoai_ro' });
      capNhatBan();
      return;
    }
    if (s.cd === 'keo_dem') {
      if (k) datVaoRoDem(i, k, 'keo');
      else if (s.ro[i]) layRaRo(i);
      capNhatBan();
      return;
    }
    if (s.cd === 'ghep2') {
      if (k === 'khuon') themVaoKhuon(i, 'keo');
      else if (s.chon.indexOf(i) >= 0) boKhoiKhuon(i);
      capNhatBan();
    }
  }

  /** Một lần chạm (không kéo): tùy chế độ. */
  function cham(g) {
    const cd = s.cd;
    const t = g.dich0;
    const p = g.p0;
    if (cd === 'chon1' || cd === 'chon_n') {
      let id = null;
      if (s.ct.loai === 'thang_hang') { const d = diemGan(p, diemCoDinh()); if (d) id = d.ten; }
      else { const e = t.closest && t.closest('[data-doi], [data-hinh]'); if (e) id = e.getAttribute('data-doi') || e.getAttribute('data-hinh'); }
      if (id != null) chonMuc(id, p);
      return;
    }
    if (cd === 'noi' || cd === 'dem_doan') {
      const d = diemGan(p);
      const doanEl = cd === 'dem_doan' && t.closest ? t.closest('[data-doan]') : null;
      if (d) {
        if (!s.cho) { s.cho = d.ten; AT().bat('cham'); s.van.thaoTac('cham', { doi_tuong: 'diem', gia_tri: d.ten }); return; }
        if (s.cho === d.ten) { s.cho = null; return; }
        const a = s.cho;
        s.cho = null;
        noiHaiDiem(a, d.ten, 'cham');
        return;
      }
      if (doanEl) { s.cho = null; demDoan(doanEl.getAttribute('data-doan')); }
      return;
    }
    if (cd === 'cong_doan') {
      const e = t.closest && t.closest('[data-doan]');
      if (e) congDoan(e.getAttribute('data-doan'));
      return;
    }
    if (cd === 'theo_thu_tu') {
      const d = diemGan(p);
      if (!d) return;
      if (s.thuTu[s.thuTu.length - 1] === d.ten) {
        s.thuTu.pop();
        s.van.thaoTac('xoa', { doi_tuong: 'diem', gia_tri: d.ten, ten: s.thuTu.join('') });
        AT().bat('cham');
      } else if (s.thuTu.indexOf(d.ten) < 0) themThuTu(d.ten);
      return;
    }
    if (cd === 'danh_dau') {
      const e = t.closest && t.closest('[data-hinh]');
      if (!e) return;
      const id = e.getAttribute('data-hinh');
      const i = s.danh.indexOf(id);
      if (i >= 0) { s.danh.splice(i, 1); s.van.thaoTac('bo_chon', { doi_tuong: s.ct.kieu === 'dem_ghep' ? 'manh' : 'hinh', gia_tri: +id, da_danh_dau: s.danh.map(Number) }); }
      else { s.danh.push(id); s.van.thaoTac('dem', { doi_tuong: s.ct.kieu === 'dem_ghep' ? 'manh' : 'hinh', gia_tri: +id, da_danh_dau: s.danh.map(Number) }); }
      AT().bat('cham');
      return;
    }
    if (cd === 'keo_ro' || cd === 'keo_dem') {
      const vat = t.closest && t.closest('[data-keo]');
      const ro = t.closest && t.closest('[data-ro]');
      if (vat) {
        const i = vat.getAttribute('data-keo');
        if (s.gach.indexOf(String(+i + 1)) >= 0) { K().bao('Gợi ý đã gạch vật này rồi con nhé'); return; }
        if (cd === 'keo_dem' && s.ro[i]) { layRaRo(i); return; }
        s.cho = s.cho === i ? null : i;
        if (s.cho != null) { s.van.thaoTac('cham', { doi_tuong: 'do_vat', gia_tri: giaTriKeo(vat) }); AT().bat('cham'); }
        return;
      }
      if (ro) {
        const k = ro.getAttribute('data-ro');
        let i = s.cho;
        if (i == null && cd === 'keo_ro' && s.ct.kieu === 'phan_loai') i = '0';
        if (i == null) { K().bao(cd === 'keo_ro' ? 'Con chạm vào một vật trước, rồi chạm rổ nhé' : 'Con chạm vào một vật trước nhé'); return; }
        s.cho = null;
        if (cd === 'keo_ro') boVaoRo(i, k, 'cham');
        else datVaoRoDem(i, k, 'cham');
      }
      return;
    }
    if (cd === 'ghep2') {
      const e = t.closest && t.closest('[data-keo]');
      if (!e) return;
      const i = e.getAttribute('data-keo');
      if (s.chon.indexOf(i) >= 0) boKhoiKhuon(i); else themVaoKhuon(i, 'cham');
      return;
    }
    if (cd === 'lap_manh') {
      const e = t.closest && t.closest('[data-khe]');
      if (e) { const k = +e.getAttribute('data-khe'); if (s.khe.indexOf(k) >= 0) layKhe(k); else datKhe(k, 'cham'); return; }
      const k2 = kheTai(p);
      if (k2 != null) { if (s.khe.indexOf(k2) >= 0) layKhe(k2); else datKhe(k2, 'cham'); }
      return;
    }
    if (cd === 'cat') {
      const e = t.closest && t.closest('[data-net]');
      if (e) catNet(+e.getAttribute('data-net'), 'cham');
    }
  }

  /* ---------------- Hành động theo chế độ ---------------- */

  function chonMuc(id, p) {
    if (s.gach.indexOf(id) >= 0) { K().bao('Gợi ý đã gạch cái này rồi con nhé'); return; }
    const i = s.chon.indexOf(id);
    const doiTuong = s.ct.loai === 'thang_hang' ? 'diem' : s.ct.loai === 'duong' ? 'duong' : 'hinh';
    const gt = s.ct.loai === 'tu_giac' ? +id : id;
    if (i >= 0) {
      s.chon.splice(i, 1);
      s.van.thaoTac('bo_chon', { doi_tuong: doiTuong, gia_tri: gt, dang_chon: s.chon.slice() });
      AT().bat('cham');
      return;
    }
    if (s.cd === 'chon1' && s.chon.length) {
      const cu = s.chon[0];
      s.chon = [];
      s.van.thaoTac('bo_chon', { doi_tuong: doiTuong, gia_tri: s.ct.loai === 'tu_giac' ? +cu : cu, dang_chon: [] });
    }
    if (s.cd === 'chon_n' && s.ct.loai === 'thang_hang' && s.chon.length >= 3) { K().bao('Con chọn đủ 3 điểm rồi. Chạm lại một điểm để bỏ chọn nhé'); return; }
    s.chon.push(id);
    const du = { doi_tuong: doiTuong, gia_tri: gt, dang_chon: s.chon.slice() };
    if (p) { const v = viTriChuan(p); du.x = v.x; du.y = v.y; }
    s.van.thaoTac('chon', du);
    AT().bat('doi_lan');
  }

  /** Nối hai điểm: nối đoạn thẳng, đếm đoạn nằm chồng, hoặc căng sợi dây kiểm tra thẳng hàng. */
  function noiHaiDiem(a, b, cach) {
    const cd = s.cd;
    if (cd === 'noi') {
      if (s.noi) s.van.thaoTac('xoa', { doi_tuong: 'doan_thang', gia_tri: s.noi.join('') });
      s.noi = [a, b];
      s.van.thaoTac('noi', { doi_tuong: 'doan_thang', tu: a, den: b, gia_tri: a + b, cach: cach });
      AT().bat('doi_lan');
      return;
    }
    if (cd === 'dem_doan') {
      const t = s.doan.find(function (x) { const ab = s.diem[x.a].ten + s.diem[x.b].ten; return ab === a + b || ab === b + a; });
      s.van.thaoTac('noi', { doi_tuong: 'doan_thang', tu: a, den: b, gia_tri: a + b, co_trong_hinh: !!t });
      if (!t) { K().bao('Trong hình không có đoạn thẳng ' + a + b + ' con nhé'); AT().bat('sai'); return; }
      demDoan(t.ten, true);
      return;
    }
    if (cd === 'chon_n' || cd === 'chon1') {
      s.day = [a, b];
      s.van.thaoTac('noi', { doi_tuong: 'soi_day', tu: a, den: b, gia_tri: a + b });
      AT().bat('cham');
    }
  }

  function demDoan(t, daGhi) {
    const i = s.dem.indexOf(t);
    if (i >= 0) {
      s.dem.splice(i, 1);
      s.van.thaoTac('bo_chon', { doi_tuong: 'doan_thang', gia_tri: t, so_da_dem: s.dem.length });
      AT().bat('cham');
      return;
    }
    s.dem.push(t);
    s.van.thaoTac('dem', { doi_tuong: 'doan_thang', gia_tri: t, so_da_dem: s.dem.length, cach: daGhi ? 'keo' : 'cham' });
    AT().bat('doi_lan');
  }

  function congDoan(t) {
    const d = s.doan.find(function (x) { return x.ten === t; });
    const i = s.dem.indexOf(t);
    const tong = function () { return s.dem.map(function (x) { return s.doan.find(function (y) { return y.ten === x; }).l; }); };
    if (i >= 0) {
      s.dem.splice(i, 1);
      s.van.thaoTac('bo_chon', { doi_tuong: 'doan_thang', gia_tri: d.l, doan: t, bieu_thuc: tong().join('+') });
    } else {
      s.dem.push(t);
      s.van.thaoTac('cham', { doi_tuong: 'doan_thang', gia_tri: d.l, doan: t, bieu_thuc: tong().join('+') });
    }
    AT().bat('doi_lan');
  }

  function themThuTu(t) {
    if (s.thuTu.indexOf(t) >= 0) return;
    s.thuTu.push(t);
    s.van.thaoTac('cham', { doi_tuong: 'diem', gia_tri: t, ten: s.thuTu.join('') });
    AT().bat('doi_lan');
  }

  /** Phân loại: thả vật vào rổ là trả lời. */
  function boVaoRo(i, k, cach) {
    if (s.gachRo.indexOf(k) >= 0) { K().bao('Gợi ý đã gạch rổ này rồi con nhé'); capNhatBan(); return; }
    const vat = s.ct.kieu === 'phan_loai' ? s.ct.v : s.ct.vat[+i];
    s.van.thaoTac('tha', { doi_tuong: 'do_vat', gia_tri: vat, den: 'ro_' + k, cach: cach });
    s.cho = null;
    s.tha = { i: String(i), k: k };
    s.khoa = true;
    capNhatBan();
    AT().bat('doi_lan');
    const giaTri = s.ct.kieu === 'phan_loai' ? k : vat;
    setTimeout(function () { if (s && s.q && !s.q.xong) { s.khoa = false; nop(giaTri, s.ct.kieu === 'phan_loai' ? { ro: k } : { vat: vat, vi_tri: String.fromCharCode(65 + +i) }); } }, 420);
  }

  function datVaoRoDem(i, k, cach) {
    s.ro[i] = k;
    s.ro_thu[i] = ++s.soTha;
    s.van.thaoTac('tha', { doi_tuong: 'do_vat', gia_tri: s.ct.vat[+i], den: 'ro_' + k, cach: cach, trong_ro: demRo() });
    AT().bat('doi_lan');
  }
  function layRaRo(i) {
    const k = s.ro[i];
    delete s.ro[i];
    s.van.thaoTac('bo_ra', { doi_tuong: 'do_vat', gia_tri: s.ct.vat[+i], tu: 'ro_' + k, trong_ro: demRo() });
    AT().bat('cham');
  }
  function demRo() {
    const r = { tru: 0, cau: 0 };
    Object.keys(s.ro).forEach(function (j) { r[s.ro[j]]++; });
    return r;
  }

  function themVaoKhuon(i, cach) {
    if (s.chon.indexOf(i) >= 0) return;
    if (s.chon.length >= 2) { K().bao('Khuôn chỉ cần hai mảnh. Chạm một mảnh trong khuôn để lấy ra nhé'); return; }
    s.chon.push(i);
    s.van.thaoTac(cach === 'keo' ? 'tha' : 'chon', { doi_tuong: 'manh_ghep', gia_tri: +i, den: 'khuon', trong_khuon: s.chon.map(Number) });
    AT().bat('doi_lan');
  }
  function boKhoiKhuon(i) {
    s.chon.splice(s.chon.indexOf(i), 1);
    s.van.thaoTac('bo_chon', { doi_tuong: 'manh_ghep', gia_tri: +i, tu: 'khuon', trong_khuon: s.chon.map(Number) });
    AT().bat('cham');
  }

  function kheTai(p) {
    const b = CH().boCucXep(s.ct.m);
    const x = (p.x - b.bx) / b.g, y = (p.y - b.by) / b.g;
    for (let i = 0; i < b.khe.length; i++) if (trongTamGiac([x, y], b.khe[i])) return i;
    return null;
  }
  function trongTamGiac(p, t) {
    const d = function (a, b, c) { return (a[0] - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (a[1] - c[1]); };
    const d1 = d(p, t[0], t[1]), d2 = d(p, t[1], t[2]), d3 = d(p, t[2], t[0]);
    return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
  }
  function datKhe(k, cach) {
    if (s.khe.indexOf(k) >= 0) return;
    s.khe.push(k);
    s.van.thaoTac('dat', { doi_tuong: 'hinh_a', vi_tri: 'khe_' + (k + 1), gia_tri: s.khe.length, cach: cach });
    AT().bat('go_phim');
  }
  function layKhe(k) {
    s.khe.splice(s.khe.indexOf(k), 1);
    s.van.thaoTac('bo_ra', { doi_tuong: 'hinh_a', vi_tri: 'khe_' + (k + 1), gia_tri: s.khe.length });
    AT().bat('cham');
  }

  function catNet(i, cach) {
    if (s.cat.indexOf(i) >= 0) return;
    s.cat.push(i);
    s.van.thaoTac(cach === 'vuot' ? 'vuot' : 'cham', { doi_tuong: 'net_cat', vi_tri: 'net_' + (i + 1), gia_tri: s.cat.length });
    AT().bat(s.cat.length === CH().MAU_CAT[s.ct.m].net.length ? 'qua_mong' : 'doi_lan');
    capNhatBan();
  }

  function chonThe(i) {
    const x = s.q.lua_chon[i];
    if (!x) return;
    if (s.the === i) {
      s.the = null;
      s.van.thaoTac('bo_chon', { doi_tuong: 'the_dap_an', gia_tri: x.gia_tri, vi_tri: 'the_' + (i + 1) });
    } else {
      s.the = i;
      s.van.thaoTac('chon', { doi_tuong: 'the_dap_an', gia_tri: x.gia_tri, vi_tri: 'the_' + (i + 1) });
    }
    AT().bat('doi_lan');
    capNhatPanel();
  }

  function phimSo(k) {
    if (!dangChoi()) return;
    if (k === 'xoa') {
      if (!s.so) return;
      s.so = s.so.slice(0, -1);
      s.van.thaoTac('xoa', { doi_tuong: 'so', gia_tri: s.so });
      AT().bat('cham');
    } else {
      if (s.so.length >= 3) return;
      s.so = (s.so === '0' ? '' : s.so) + k;
      s.van.thaoTac('go_so', { gia_tri: +k, hien_tai: s.so });
      AT().bat('go_phim');
    }
    capNhatPanel();
  }

  function phim(e) {
    if (!dangChoi()) return;
    if (/^[0-9]$/.test(e.key) && CH().canBanPhim(s.ct)) { phimSo(e.key); e.preventDefault(); }
    else if (e.key === 'Backspace' && CH().canBanPhim(s.ct)) { phimSo('xoa'); e.preventDefault(); }
    else if (e.key === 'Enter') { nop(); e.preventDefault(); }
  }

  function lamLai() {
    if (!dangChoi()) return;
    s.van.thaoTac('xoa', { doi_tuong: 'tat_ca', che_do: s.cd });
    const giuGach = s.gach, giuSang = s.sang, giuRo = s.gachRo;
    datLaiTrangThai();
    s.gach = giuGach; s.sang = giuSang; s.gachRo = giuRo;
    AT().bat('cham');
    veBan();
    vePanel();
  }

  /* ---------------- Trả lời ---------------- */

  /** Giá trị bé chốt và phần ghi thêm cho tra_loi. */
  function giaTriHienTai() {
    const c = s.cd;
    const ct = s.ct;
    if (c === 'chon1') return { v: ct.loai === 'tu_giac' ? +s.chon[0] : s.chon[0], them: {} };
    if (c === 'chon_n') {
      if (ct.loai === 'thang_hang') return { v: s.chon.slice().sort(function (a, b) { return ct.ten.indexOf(a) - ct.ten.indexOf(b); }).join(','), them: { thu_tu_cham: s.chon.join('') } };
      return { v: s.chon.map(Number).sort(function (a, b) { return a - b; }).join(','), them: {} };
    }
    if (c === 'noi') return { v: s.noi.join(''), them: { tu: s.noi[0], den: s.noi[1] } };
    if (c === 'dem_doan') return { v: s.dem.length, them: { doan: s.dem.slice() } };
    if (c === 'theo_thu_tu') return { v: s.thuTu.join(''), them: {} };
    if (c === 'ghep2') return { v: s.chon.map(Number).sort(function (a, b) { return a - b; }).join(','), them: {} };
    if (c === 'cat') return { v: s.q.lua_chon[s.the].gia_tri, them: { da_cat: s.cat.length, vi_tri: 'the_' + (s.the + 1) } };
    const them = { nhap: s.so };
    if (c === 'cong_doan') { them.cac_doan = s.dem.slice(); them.bieu_thuc = s.dem.map(function (x) { return s.doan.find(function (y) { return y.ten === x; }).l; }).join('+'); }
    if (c === 'danh_dau') them.da_danh_dau = s.danh.map(Number);
    if (c === 'keo_dem') them.trong_ro = demRo();
    if (c === 'lap_manh') them.da_xep = s.khe.length;
    return { v: +s.so, them: them };
  }

  function moDau() {
    const c = s.cd;
    if (c === 'noi') return 'Con nối';
    if (c === 'dem_doan') return 'Con đếm được';
    if (c === 'theo_thu_tu') return 'Con đọc';
    if (c === 'keo_ro') return s.ct.kieu === 'phan_loai' ? 'Con bỏ vào rổ' : 'Con chọn';
    if (CH().canBanPhim(s.ct)) return 'Con viết';
    return 'Con chọn';
  }
  function chonHien(v) {
    if (s.cd === 'keo_ro' && s.ct.kieu === 'phan_loai') return v === 'khac' ? 'Khối khác' : 'Khối ' + (v === 'tru' ? 'trụ' : 'cầu');
    if (s.cd === 'dem_doan') return v + ' đoạn thẳng';
    return NH().hienGiaTriCau(s.ct, v);
  }

  function nop(giaTri, themNgoai) {
    if (!dangChoi()) return;
    let v, them;
    if (giaTri !== undefined) { v = giaTri; them = themNgoai || {}; }
    else {
      if (!coTheNop()) return;
      const x = giaTriHienTai();
      v = x.v; them = x.them;
    }
    const kq = s.van.traLoi(v, them);
    if (!kq) return;
    if (kq.dung) { dungRoi(kq); return; }
    AT().bat('sai');
    s.chuoi = 0;
    if (kq.thuLai) {
      rung(dom.rung);
      K().bao(kq.loiNoi + '. Thử lại nào!', 'sai', 3.2);
      AT().doc(kq.loiNoi);
      thuLaiSach();
      return;
    }
    s.khoa = true;
    capNhatPanel();
    const q = s.q;
    setTimeout(function () {
      if (!s) return;
      K().phanHoiCau(q, v, Object.assign({}, kq, { moDau: moDau(), chonHien: chonHien(v) }), function () { veDauChan(); cauMoi(); });
    }, 500);
  }

  /** Sai lần đầu: bỏ phần trả lời để bé làm lại, giữ những gì bé đã đánh dấu để đếm. */
  function thuLaiSach() {
    const c = s.cd;
    if (c === 'chon1' || c === 'ghep2') s.chon = [];
    if (c === 'noi') { s.noi = null; s.cho = null; }
    if (c === 'theo_thu_tu') s.thuTu = [];
    if (c === 'cat') s.the = null;
    if (CH().canBanPhim(s.ct)) s.so = '';
    if (c === 'keo_ro') { s.tha = null; s.cho = null; }
    capNhatBan();
  }

  function rung(e) { if (!e) return; e.classList.remove('rung'); void e.offsetWidth; e.classList.add('rung'); }

  function dungRoi(kq) {
    s.khoa = true;
    s.chuoi = kq.ketQua === 'dung_ngay' ? s.chuoi + 1 : 0;
    s.soDung++;
    const p = K().tamCua(dom.rung);
    const diem = kq.ketQua === 'dung_ngay' ? 100 + (s.chuoi >= 3 ? 50 : 0) : 40;
    K().congDiem(diem, p.x, p.y - 60, kq.quaMong ? '+' + kq.quaMong + ' quả mọng' : null);
    K().phao(p.x, p.y - 20, 20);
    AT().bat('dung');
    K().anGoiY();
    // Bàn hiện lời giải (tô xanh chỗ đúng) và câu chốt
    dom.ban.innerHTML = CH().veBan(s.ct, { giai: true, nen: false });
    s.svg = null;
    dom.dungChu.textContent = s.chuoi >= 3 ? s.chuoi + ' câu đúng liền!' : kq.ketQua === 'dung_lan_2' ? 'Con sửa đúng rồi!' : 'Đúng rồi!';
    dom.dungPhu.textContent = s.q.ket_luan || '';
    dom.dung.classList.remove('hidden');
    dom.kiem.classList.remove('rh-vui');
    void dom.kiem.offsetWidth;
    dom.kiem.classList.add('rh-vui');
    AT().doc('Đúng rồi! ' + (s.q.ket_luan || ''));
    capNhatPanel();
    veDauChan();
    setTimeout(function () { if (s) cauMoi(); }, CO_GIAM_DONG ? 1400 : 2300);
  }

  /** Dấu chân trên đường rừng: mỗi câu mới một bước. */
  function veDauChan() {
    if (!s) return;
    const n = Math.max(1, s.van.soCauDuKien());
    const xong = s.van.dem.moi;
    let h = '';
    for (let i = 0; i < n; i++) h += '<li class="' + (i < xong ? 'xong' : i === xong ? 'dang' : '') + '"></li>';
    dom.dauChan.innerHTML = h;
  }

  /* ---------------- Gợi ý ---------------- */

  function goiY() {
    if (!dangChoi()) return;
    const q = s.van.q;
    if (!q || q.xong) return;
    let them = null;
    if (q.goiYCap + 1 === 3) them = goiYHinh();
    K().goiY(them);
    capNhatBan();
  }

  /** Gợi ý cấp 3 trên bàn: gạch một lựa chọn sai, hoặc tô sáng một phần của đáp án. */
  function goiYHinh() {
    const ct = s.ct;
    const d = s.q.dap_an;
    const c = s.cd;
    if (c === 'chon1') {
      let ung = [];
      if (ct.loai === 'duong') ung = ct.ds.map(function (o) { return o.t; }).filter(function (t) { return t !== d; });
      else if (ct.loai === 'thang_hang') ung = ct.ten.slice(2).split('').filter(function (t) { return t !== d; });
      else if (ct.loai === 'tu_giac') ung = ct.h.map(function (m, i) { return String(i + 1); }).filter(function (t) { return t !== String(d); });
      ung = ung.filter(function (t) { return s.chon.indexOf(t) < 0; });
      if (!ung.length) return null;
      const bo = ung[ung.length - 1];
      s.gach.push(bo);
      return { loai_bo: ct.loai === 'tu_giac' ? +bo : bo };
    }
    if (c === 'keo_ro' && ct.kieu === 'phan_loai') {
      const bo = ['tru', 'cau', 'khac'].filter(function (k) { return k !== d && s.gachRo.indexOf(k) < 0; })[0];
      if (!bo) return null;
      s.gachRo.push(bo);
      return { loai_bo: bo };
    }
    if (c === 'keo_ro' && ct.kieu === 'tim_vat') {
      const i = ct.vat.findIndex(function (v, j) { return v !== d && s.gach.indexOf(String(j + 1)) < 0; });
      if (i < 0) return null;
      s.gach.push(String(i + 1));
      return { loai_bo: ct.vat[i] };
    }
    if (c === 'chon_n' && ct.loai === 'thang_hang') { s.sang = String(d).split(',')[0]; return { to_sang: s.sang }; }
    if (c === 'noi') { s.sang = String(d)[0]; return { to_sang: s.sang }; }
    if (c === 'theo_thu_tu') { s.sang = ct.ten[0]; return { to_sang: s.sang }; }
    if (c === 'ghep2') { s.sang = String(d).split(',')[0]; return { to_sang: +s.sang }; }
    if (c === 'cong_doan') { tatCa('[data-doan]').forEach(function (e) { e.classList.add('rh-nhac'); }); return { nhac: 'cac_doan' }; }
    return null;
  }

  /* ---------------- Kết thúc ---------------- */

  function ketThuc() {
    if (s.het) return;
    s.het = true;
    const o = s.o;
    const diem = K().diem();
    const so = s.soDung;
    K().dong();
    s.van.ketThuc(false, { diem: diem, so_cau_dung: so }).then(function (kq) {
      kq.diem = diem;
      kq.dongPhu = 'Đi qua ' + so + ' khoảng rừng · ' + diem.toLocaleString('vi-VN') + ' điểm';
      s = null;
      if (o.onXong) o.onXong(kq);
    });
  }

  function thoat() {
    if (!s || s.het) return;
    s.het = true;
    const o = s.o;
    const diem = K().diem();
    K().dong();
    s.van.ketThuc(true, { ly_do: 've_dao', diem: diem }).then(function (kq) {
      s = null;
      if (o.onThoat) o.onThoat(kq);
    });
  }

  window.RungHinhKhoi = { batDau: batDau, _trangThai: function () { return s; } };
  (window.DaoTroChoi = window.DaoTroChoi || {})['rung-hinh-khoi'] = { ten: 'Rừng Hình Khối', khung: true, san: 'rh-san', batDau: batDau, _trangThai: window.RungHinhKhoi._trangThai };

  /* ================================================================
     Bài học 30 giây (theo SGK Bài 25, 26, 46)
     ================================================================ */

  function svgBH(nhan, noiDung, w, h) {
    return CH().moSvg(nhan, 'rh-bh', w || 640, h || 300) + noiDung + '</svg>';
  }
  function diemBH(x, y, ten, mau, hx, hy) {
    return '<circle cx="' + x + '" cy="' + y + '" r="10" fill="' + (mau || '#3b2f63') + '" stroke="#fff" stroke-width="3"/>' + CH().chu(x + (hx || 0) * 30, y + (hy == null ? -1 : hy) * 30 + 11, ten, 34, mau || '#3b2f63');
  }
  function doanBH(x1, y1, x2, y2, mau, day, them) { return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + (mau || '#3b2f63') + '" stroke-width="' + (day || 7) + '" stroke-linecap="round"' + (them || '') + '/>'; }
  function thuoc(x, y, w) {
    let s1 = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="40" rx="8" fill="#ffc7d9" stroke="#e58aaa" stroke-width="2"/>';
    for (let i = 0; i <= w / 20; i++) s1 += '<line x1="' + (x + 10 + i * 20) + '" y1="' + y + '" x2="' + (x + 10 + i * 20) + '" y2="' + (y + (i % 5 === 0 ? 16 : 9)) + '" stroke="#b3476d" stroke-width="2"/>';
    return s1;
  }

  function dangKyBaiHoc() {
    if (!window.BaiHoc || !window.CauHinhHoc) return;
    const BH = window.BaiHoc;
    const C = window.CauHinhHoc;
    BH.dangKy('diem-doan-thang', {
      ten: 'Điểm, đoạn thẳng, đường thẳng',
      buoc: [
        { chu: 'Đầu mỗi chiếc đinh là một điểm. Ta gọi tên điểm bằng chữ in hoa: điểm A, điểm B, điểm C.', ve: function () {
          return svgBH('Ba điểm A, B, C', '<rect x="20" y="20" width="600" height="260" rx="24" fill="#2f5d4a"/>' + diemBH(150, 170, 'A', '#fff') + diemBH(330, 110, 'B', '#fff') + diemBH(500, 200, 'C', '#fff'));
        } },
        { chu: 'Nối điểm B với điểm C, ta có đoạn thẳng BC. Đoạn thẳng dừng lại ở hai điểm B và C.', ve: function () {
          return svgBH('Đoạn thẳng BC', '<rect x="20" y="20" width="600" height="260" rx="24" fill="#2f5d4a"/>' + doanBH(160, 150, 480, 150, '#ffd166', 8) + diemBH(160, 150, 'B', '#fff') + diemBH(480, 150, 'C', '#fff') + thuoc(140, 170, 360) + CH().chu(320, 262, 'Đoạn thẳng BC', 28, '#ffd166', ' stroke="none"'));
        } },
        { chu: 'Đường thẳng AB đi qua hai điểm A, B và kéo dài về hai phía. Cầu vồng có dạng đường cong.', ve: function () {
          return svgBH('Đường thẳng AB và đường cong', doanBH(30, 90, 610, 90) + diemBH(200, 90, 'A') + diemBH(440, 90, 'B') + CH().chu(320, 150, 'Đường thẳng AB', 26, '#5b5575') +
            '<path d="M150 280 Q320 150 490 280" fill="none" stroke="#ef476f" stroke-width="9" stroke-linecap="round"/><path d="M165 282 Q320 170 475 282" fill="none" stroke="#ffd166" stroke-width="8" stroke-linecap="round"/><path d="M180 284 Q320 190 460 284" fill="none" stroke="#06d6a0" stroke-width="8" stroke-linecap="round"/>' + CH().chu(560, 270, 'Đường cong', 26, '#5b5575'));
        } },
        { chu: 'Ba điểm M, P, N cùng nằm trên một đường thẳng. Ta nói ba điểm M, P, N thẳng hàng.', ve: function () {
          return svgBH('Ba điểm M, P, N thẳng hàng', doanBH(40, 220, 600, 80, '#8a63d8', 4, ' stroke-dasharray="12 9"') + diemBH(120, 200, 'M') + diemBH(320, 150, 'P') + diemBH(520, 100, 'N'));
        } },
        { chu: 'Con thử nhé: ba điểm nào thẳng hàng?', ve: function () {
          return svgBH('Bốn điểm A, B, C, D', diemBH(110, 230, 'A') + diemBH(290, 170, 'B') + diemBH(470, 110, 'C') + diemBH(360, 250, 'D', null, 0, 1));
        }, thu: { lua_chon: ['A, B, C', 'A, B, D', 'B, C, D'], dung: 'A, B, C', dung_noi: 'Đúng rồi! A, B, C cùng nằm trên một đường thẳng.', sai_noi: 'Điểm D nằm lệch ra ngoài. Ba điểm A, B, C mới thẳng hàng nhé.' } }
      ]
    });
    BH.dangKy('duong-gap-khuc', {
      ten: 'Đường gấp khúc',
      buoc: [
        { chu: 'Cầu thang lên thác có dạng đường gấp khúc. Đây là đường gấp khúc MNPQ.', ve: function () {
          return svgBH('Đường gấp khúc MNPQ', doanBH(90, 230, 230, 90) + doanBH(230, 90, 400, 230) + doanBH(400, 230, 560, 110) + diemBH(90, 230, 'M', null, -0.6, 0.6) + diemBH(230, 90, 'N') + diemBH(400, 230, 'P', null, 0, 1) + diemBH(560, 110, 'Q'));
        } },
        { chu: 'Đường gấp khúc MNPQ gồm ba đoạn thẳng: MN, NP và PQ.', ve: function () {
          return svgBH('Ba đoạn MN, NP, PQ', doanBH(90, 230, 230, 90, '#ff7a1a', 9) + doanBH(230, 90, 400, 230, '#0f9f76', 9) + doanBH(400, 230, 560, 110, '#3b8fd0', 9) + diemBH(90, 230, 'M', null, -0.6, 0.6) + diemBH(230, 90, 'N') + diemBH(400, 230, 'P', null, 0, 1) + diemBH(560, 110, 'Q') +
            CH().chu(130, 150, 'MN', 26, '#ff7a1a') + CH().chu(350, 140, 'NP', 26, '#0f9f76') + CH().chu(520, 200, 'PQ', 26, '#3b8fd0'));
        } },
        { chu: 'Độ dài đường gấp khúc MNPQ là tổng độ dài các đoạn thẳng MN, NP và PQ: 2 cm + 5 cm + 3 cm = 10 cm.', ve: function () {
          return svgBH('Độ dài đường gấp khúc MNPQ', doanBH(90, 190, 180, 90, '#ff7a1a', 9) + doanBH(180, 90, 420, 190, '#0f9f76', 9) + doanBH(420, 190, 560, 110, '#3b8fd0', 9) + diemBH(90, 190, 'M', null, -0.6, 0.6) + diemBH(180, 90, 'N') + diemBH(420, 190, 'P', null, 0, 1) + diemBH(560, 110, 'Q') +
            CH().chu(110, 125, '2 cm', 26, '#b4400f') + CH().chu(330, 120, '5 cm', 26, '#b4400f') + CH().chu(520, 185, '3 cm', 26, '#b4400f') + CH().chu(320, 280, '2 cm + 5 cm + 3 cm = 10 cm', 34, '#3b2f63'));
        } },
        { chu: 'Con thử nhé: đường gấp khúc ABC có AB dài 3 cm, BC dài 6 cm. Đường gấp khúc ABC dài bao nhiêu xăng-ti-mét?', ve: function () {
          return svgBH('Đường gấp khúc ABC', doanBH(160, 60, 160, 210) + doanBH(160, 210, 480, 210) + diemBH(160, 60, 'A') + diemBH(160, 210, 'B', null, -0.7, 0.7) + diemBH(480, 210, 'C') + CH().chu(115, 145, '3 cm', 26, '#b4400f') + CH().chu(320, 255, '6 cm', 26, '#b4400f'));
        }, thu: { lua_chon: ['9 cm', '6 cm', '2 cm'], dung: '9 cm', dung_noi: 'Đúng rồi! 3 cm + 6 cm = 9 cm.', sai_noi: 'Cộng độ dài hai đoạn: 3 cm + 6 cm = 9 cm nhé.' } }
      ]
    });
    BH.dangKy('hinh-tu-giac', {
      ten: 'Hình tứ giác',
      buoc: [
        { chu: 'Đây là hình tứ giác. Hình tứ giác có 4 cạnh (tứ là bốn).', ve: function () {
          const p = [[190, 70], [470, 40], [520, 250], [140, 230]];
          let h = '<polygon points="' + p.map(function (q) { return q.join(','); }).join(' ') + '" fill="#ffb4a2" stroke="#e0795f" stroke-width="6" stroke-linejoin="round"/>';
          p.forEach(function (q, i) { const r = p[(i + 1) % 4]; h += C.soHieu((q[0] + r[0]) / 2, (q[1] + r[1]) / 2, i + 1, '#d9600b'); });
          return svgBH('Hình tứ giác có 4 cạnh', h);
        } },
        { chu: 'Hình vuông, hình chữ nhật, hình thang cũng là hình tứ giác, dù đặt nghiêng hay méo.', ve: function () {
          return svgBH('Các hình tứ giác', C.veMotHinh('vuong.1', 90, 150, 150, C.MAU_HINH[1]) + C.veMotHinh('chu_nhat.0', 250, 150, 150, C.MAU_HINH[2]) + C.veMotHinh('thang.2', 410, 150, 150, C.MAU_HINH[3]) + C.veMotHinh('tu_giac.3', 560, 150, 140, C.MAU_HINH[4]));
        } },
        { chu: 'Hình tam giác có 3 cạnh, hình tròn không có cạnh nào: đó không phải hình tứ giác.', ve: function () {
          return svgBH('Không phải hình tứ giác', C.veMotHinh('tam_giac.0', 200, 150, 170, ['#e9e6f2', '#9a93b5']) + C.veMotHinh('tron.0', 440, 150, 170, ['#e9e6f2', '#9a93b5']) +
            CH().chu(200, 280, '3 cạnh', 28, '#5b5575') + CH().chu(440, 280, 'không có cạnh', 28, '#5b5575'));
        } },
        { chu: 'Con thử nhé: hình nào là hình tứ giác?', ve: function () {
          return svgBH('Ba hình đánh số', C.veMotHinh('tam_giac_nhon.0', 110, 150, 160, C.MAU_HINH[0]) + C.soHieu(40, 60, 1) + C.veMotHinh('binh_hanh.0', 320, 150, 170, C.MAU_HINH[3]) + C.soHieu(250, 60, 2) + C.veMotHinh('tron.0', 530, 150, 160, C.MAU_HINH[1]) + C.soHieu(460, 60, 3));
        }, thu: { lua_chon: ['Hình 1', 'Hình 2', 'Hình 3'], dung: 'Hình 2', dung_noi: 'Đúng rồi! Hình 2 có 4 cạnh nên là hình tứ giác.', sai_noi: 'Đếm số cạnh nhé: hình 2 có 4 cạnh, đó là hình tứ giác.' } }
      ]
    });
    BH.dangKy('khoi-tru-cau', {
      ten: 'Khối trụ, khối cầu',
      buoc: [
        { chu: 'Hộp sữa, khúc gỗ có dạng khối trụ: thân dài, hai đầu là hai mặt tròn.', ve: function () {
          return svgBH('Vật có dạng khối trụ', C.veVat('lon_sua', 130, 140, 190) + C.veVat('khuc_go', 330, 140, 190) + C.bieuTuongKhoi('tru', 520, 140, 150) + CH().chu(520, 270, 'Khối trụ', 30, '#0f9f76'));
        } },
        { chu: 'Quả bóng, quả cam có dạng khối cầu: tròn đều về mọi phía.', ve: function () {
          return svgBH('Vật có dạng khối cầu', C.veVat('bong_da', 130, 140, 180) + C.veVat('qua_cam', 330, 140, 180) + C.bieuTuongKhoi('cau', 520, 140, 150) + CH().chu(520, 270, 'Khối cầu', 30, '#0f9f76'));
        } },
        { chu: 'Mũ sinh nhật (hình nón), quả trứng không phải khối trụ, cũng không phải khối cầu.', ve: function () {
          return svgBH('Không phải khối trụ, khối cầu', C.veVat('non', 210, 140, 190) + C.veVat('trung', 430, 140, 190));
        } },
        { chu: 'Con thử nhé: quả địa cầu có dạng khối gì?', ve: function () {
          return svgBH('Quả địa cầu', C.veVat('dia_cau', 320, 145, 220));
        }, thu: { lua_chon: ['Khối trụ', 'Khối cầu'], dung: 'Khối cầu', dung_noi: 'Đúng rồi! Quả địa cầu tròn đều như quả bóng: khối cầu.', sai_noi: 'Quả địa cầu tròn đều về mọi phía nên có dạng khối cầu nhé.' } }
      ]
    });
  }
  dangKyBaiHoc();
})();
