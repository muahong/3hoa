/* ============================================================
   goc-phu-huynh.js – Góc phụ huynh (mockup 17 đến 22): cổng phép tính của người lớn, rồi
   Tổng quan tuần · Nhật ký chi tiết · Xem lại một câu · Bản đồ kỹ năng · Kế hoạch tuần tới · Cài đặt · Xuất cho trợ lý AI.
   Mọi con số tính ở js/bao-cao.js (hàm thuần) từ ba lớp tóm tắt; chỉ màn Xem lại một câu đọc nhật ký gốc của một ván
   (NhatKy.docVan), gói xuất đọc nhật ký gốc của bé khi phụ huynh bấm tạo gói.
   Tự dựng giao diện trong <section id="man-phu-huynh"> (section tự cuộn dọc). Chỉ ghi phu_huynh_mo, phu_huynh_cai_dat (YC-09),
   và chỉ khi bé đang xem chính là bé đang chơi (nhật ký luôn gắn với một bé; không ghi mã của bé này vào nhật ký bé khác).
   API: window.GocPhuHuynh = { mo(ve, ctx, tab) } (tab: mục mở ngay sau cổng, ví dụ cai_dat)
   ctx (app.js, ctxPhuHuynh): A, hinh, hinhTen, hinhKhungLong, tenKhungLong, soDep, homNay, bao, hien, tenManNgan,
   taiDuLieuBe(id), tinhLai(id), thoat(), hoSoDoi(p), beBiXoa(id).
   ============================================================ */
(function () {
  'use strict';

  const NK = window.NhatKy, HS = window.HoSo, BC = window.BaoCao;
  function NH() { return window.NganHang; }
  function DAO() { return window.Dao; }

  let ctx = null;
  let dom = null;
  const CONG = { hoi: null, nhap: '', sai: 0 };
  const TAB = [
    { ma: 'tong_quan', ten: 'Tổng quan', ic: '<path d="M3 11 L12 3 L21 11 V21 H14 V15 H10 V21 H3 Z" fill="currentColor"/>' },
    { ma: 'nhat_ky', ten: 'Nhật ký', ic: '<path d="M4 6h16M4 12h16M4 18h10" stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none"/>' },
    { ma: 'ky_nang', ten: 'Kỹ năng', ic: '<rect x="3" y="3" width="8" height="8" rx="2" fill="currentColor"/><rect x="13" y="3" width="8" height="8" rx="2" fill="currentColor"/><rect x="3" y="13" width="8" height="8" rx="2" fill="currentColor"/><rect x="13" y="13" width="8" height="8" rx="2" fill="currentColor"/>' },
    { ma: 'ke_hoach', ten: 'Kế hoạch', ic: '<path d="M6 3h12v18l-6-4-6 4z" fill="currentColor"/>' }
  ];
  /** Các mức chọn nhanh cho thời gian chơi mỗi ngày (null: không giới hạn, mặc định); ngoài ra chỉnh từng 5 phút. */
  const GIOI_HAN = [null, 15, 30, 45, 60, 90, 120];
  /** Giờ cho thêm riêng hôm nay (cộng dồn), hoặc không giới hạn hôm nay. */
  const THEM_HOM_NAY = [15, 30];
  const THU_NGAN = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  /** Trạng thái màn hình (không lưu gì của báo cáo: đổi bé, đổi dữ liệu thì tính lại). */
  const S = {
    beId: null,
    be: null, // { hoSo, cauDs, vanDs, hocTap }
    tab: 'tong_quan',
    tabDau: 'tong_quan', // mục mở ngay sau cổng (mo(ve, ctx, tab))
    con: null, // màn con: { loai: 'xem_lai', cau, van, tuTab } | { loai: 'xuat_ai', tuTab }
    tuan: null, // thứ Hai của tuần đang xem
    nk: { ngay: null, caTuan: false, loc: { loai: 'tat_ca' } },
    kn: null, // mã nội dung đang xem ở bản đồ kỹ năng
    kh: { bo: {} }, // mục kế hoạch phụ huynh bỏ ra
    xuat: { kem: false, kq: null, dang: false },
    nhatKyGoc: {}, // van -> sự kiện (đã đọc cho màn Xem lại)
    cache: {},
    soSuKien: null
  };

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  /** Chữ an toàn, đoạn **đậm** thành <b>. */
  function dam(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); }
  function homNay() { return ctx.homNay(); }
  function soDep(n) { return ctx.soDep(n); }
  function svg(noiDung, lop) { return '<svg class="' + (lop || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + noiDung + '</svg>'; }
  const IC = {
    khoa: '<path d="M7.5 10V7.5a4.5 4.5 0 0 1 9 0V10" stroke="currentColor" stroke-width="2.6" fill="none"/><rect x="4.5" y="10" width="15" height="11" rx="3" fill="currentColor"/>',
    banh_rang: '<path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm8.4 5.1-1.7-.3a6.9 6.9 0 0 1-.6 1.5l1 1.4a.9.9 0 0 1-.1 1.2l-1.2 1.2a.9.9 0 0 1-1.2.1l-1.4-1a6.9 6.9 0 0 1-1.5.6l-.3 1.7a.9.9 0 0 1-.9.8h-1.7a.9.9 0 0 1-.9-.8l-.3-1.7a6.9 6.9 0 0 1-1.5-.6l-1.4 1a.9.9 0 0 1-1.2-.1l-1.2-1.2a.9.9 0 0 1-.1-1.2l1-1.4a6.9 6.9 0 0 1-.6-1.5l-1.7-.3a.9.9 0 0 1-.8-.9v-1.7c0-.4.3-.8.8-.9l1.7-.3c.1-.5.3-1 .6-1.5l-1-1.4a.9.9 0 0 1 .1-1.2l1.2-1.2a.9.9 0 0 1 1.2-.1l1.4 1c.5-.3 1-.5 1.5-.6l.3-1.7c.1-.5.5-.8.9-.8h1.7c.4 0 .8.3.9.8l.3 1.7c.5.1 1 .3 1.5.6l1.4-1a.9.9 0 0 1 1.2.1l1.2 1.2c.3.3.4.8.1 1.2l-1 1.4c.3.5.5 1 .6 1.5l1.7.3c.5.1.8.5.8.9v1.7c0 .4-.3.8-.8.9z" fill="currentColor"/>',
    trai: '<path d="M15 5 8 12l7 7" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    phai: '<path d="m9 5 7 7-7 7" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    sao_chep: '<rect x="8" y="8" width="12" height="13" rx="2.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M16 5.5V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h.5" fill="none" stroke="currentColor" stroke-width="2.4"/>',
    tai: '<path d="M12 3v12m0 0-5-5m5 5 5-5M4 19h16" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
  };

  /* ---------------- Ghi sự kiện (YC-09) ---------------- */

  /** Chỉ phu_huynh_mo và phu_huynh_cai_dat; chỉ khi bé đang xem là bé đang chơi (hồ sơ vẫn giữ nguồn thay đổi: lop_nguon, bai_nguon). */
  function ghi(loai, du) {
    if (loai !== 'phu_huynh_mo' && loai !== 'phu_huynh_cai_dat') return;
    const dangChoi = NK.be();
    if (!dangChoi || (S.beId && S.beId !== dangChoi)) return;
    NK.ghi(loai, du, { game: 'goc-phu-huynh' });
  }

  /* ---------------- Khung ---------------- */

  function khoiDom() {
    if (dom) return dom;
    const sec = $('man-phu-huynh');
    const phim = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (k) { return '<button type="button" data-k="' + k + '">' + k + '</button>'; }).join('') +
      '<button type="button" data-k="xoa" aria-label="Xóa một chữ số">⌫</button><button type="button" data-k="0">0</button><button type="button" data-k="xong" class="gp-phim-vao">Vào</button>';
    sec.innerHTML =
      '<div class="gp-cong" id="gp-cong">' +
        '<button class="gp-quay gp-quay-cong" type="button" data-hd="thoat" aria-label="Quay lại">' + svg(IC.trai) + '</button>' +
        '<div class="gp-khoa">' + svg(IC.khoa) + '</div>' +
        '<h1>Góc phụ huynh</h1>' +
        '<p class="gp-phu">Trả lời để vào. Bé lớp 2 chưa làm được phép tính này nên không vào nhầm.</p>' +
        '<p class="gp-hoi" id="gp-hoi" aria-live="polite"></p>' +
        '<div class="gp-o-nhap" id="gp-o" role="status" aria-label="Số đã nhập"></div>' +
        '<div class="gp-ban-phim" id="gp-ban-phim">' + phim + '</div>' +
        '<p class="gp-phu">Phép tính đổi mỗi lần mở</p>' +
      '</div>' +
      '<div class="gp-goc hidden" id="gp-goc">' +
        '<header class="gp-dau">' +
          '<div class="gp-dau-hang">' +
            '<button class="gp-quay" type="button" data-hd="quay" id="gp-quay" aria-label="Thoát góc phụ huynh">' + svg(IC.trai) + '</button>' +
            '<div class="gp-be" id="gp-be"></div>' +
            '<button class="gp-nut-cai" type="button" data-hd="tab" data-tab="cai_dat" id="gp-nut-cai" aria-label="Cài đặt">' + svg(IC.banh_rang) + '<span>Cài đặt</span></button>' +
          '</div>' +
          '<div class="gp-chon-be hidden" id="gp-chon-be" role="tablist" aria-label="Chọn bé"></div>' +
        '</header>' +
        '<main class="gp-than" id="gp-than" tabindex="-1"></main>' +
        '<nav class="gp-tab" id="gp-tab" aria-label="Các mục của góc phụ huynh">' +
          TAB.map(function (t) { return '<button type="button" data-hd="tab" data-tab="' + t.ma + '">' + svg(t.ic) + '<span>' + t.ten + '</span></button>'; }).join('') +
        '</nav>' +
      '</div>' +
      '<div class="gp-hop-thoai hidden" id="gp-hop" role="dialog" aria-modal="true" aria-labelledby="gp-hop-td"></div>';
    dom = sec;
    sec.addEventListener('click', bamVao);
    sec.addEventListener('change', doiO);
    document.addEventListener('keydown', phimBam);
    return dom;
  }

  /** tab (tùy chọn): mục mở ngay sau cổng, ví dụ 'cai_dat' khi bé hết giờ và nhờ bố mẹ cho chơi thêm. */
  function mo(ve, c, tab) {
    ctx = c;
    S.tabDau = tab === 'cai_dat' || TAB.some(function (t) { return t.ma === tab; }) ? tab : 'tong_quan';
    khoiDom();
    // Phép nhân của người lớn: số có hai chữ số nhân số có một chữ số (bé lớp 2 mới học bảng 2 và 5)
    let a, b;
    do { a = 12 + Math.floor(Math.random() * 38); } while (a % 10 === 0 || a % 10 === 1);
    b = 3 + Math.floor(Math.random() * 7);
    if (b === 5) b = 7;
    CONG.hoi = { a: a, b: b };
    CONG.nhap = '';
    CONG.sai = 0;
    $('gp-hoi').textContent = a + ' × ' + b + ' = ?';
    $('gp-o').textContent = '';
    $('gp-cong').classList.remove('hidden');
    $('gp-goc').classList.add('hidden');
    dongHopThoai();
    ctx.hien('man-phu-huynh');
    dom.scrollTop = 0;
  }

  function dangMo() { return ctx && ctx.A && dom && !dom.classList.contains('hidden'); }

  function congGo(k) {
    if (k === 'xoa') CONG.nhap = CONG.nhap.slice(0, -1);
    else if (k === 'xong') {
      if (CONG.nhap && Number(CONG.nhap) === CONG.hoi.a * CONG.hoi.b) { moBang(); return; }
      CONG.sai++;
      CONG.nhap = '';
      if (CONG.sai >= 3) { CONG.sai = 0; ctx.bao('Góc này dành cho bố mẹ nhé!'); ctx.thoat(); return; }
      ctx.bao('Chưa đúng. Góc này dành cho bố mẹ nhé!');
    } else if (CONG.nhap.length < 4) CONG.nhap += k;
    $('gp-o').textContent = CONG.nhap;
  }

  function phimBam(e) {
    if (!dangMo()) return;
    if (!$('gp-hop').classList.contains('hidden')) { if (e.key === 'Escape') dongHopThoai(); return; }
    if (!$('gp-cong').classList.contains('hidden')) {
      if (/^[0-9]$/.test(e.key)) congGo(e.key);
      else if (e.key === 'Backspace') congGo('xoa');
      else if (e.key === 'Enter') congGo('xong');
      else if (e.key === 'Escape') ctx.thoat();
      return;
    }
    if (e.key === 'Escape' && S.con) { dongCon(); }
  }

  function moBang() {
    $('gp-cong').classList.add('hidden');
    $('gp-goc').classList.remove('hidden');
    const ds = ctx.A.dsBe || [];
    const dau = ctx.A.hoSo ? ctx.A.hoSo.id : ds[0] && ds[0].id;
    S.tab = S.tabDau || 'tong_quan';
    S.con = null;
    S.tuan = BC.dauTuan(homNay());
    S.nk = { ngay: null, caTuan: false, loc: { loai: 'tat_ca' } };
    S.kn = null;
    S.kh = { bo: {} };
    S.xuat = { kem: false, kq: null, dang: false };
    if (!dau) {
      S.beId = null; S.be = null;
      $('gp-be').innerHTML = '<div><b>Góc phụ huynh</b><span>Chưa có hồ sơ bé nào trên máy này</span></div>';
      $('gp-chon-be').classList.add('hidden');
      $('gp-tab').classList.add('hidden');
      $('gp-nut-cai').classList.add('hidden');
      $('gp-than').innerHTML = '<div class="gp-the gp-trong"><h2>Chưa có hồ sơ bé nào</h2><p>Tạo hồ sơ cho con ở màn “Con là ai?”, chơi một ván, rồi quay lại đây để xem báo cáo.</p></div>';
      return;
    }
    $('gp-tab').classList.remove('hidden');
    $('gp-nut-cai').classList.remove('hidden');
    taiBe(dau).then(function () {
      ghi('phu_huynh_mo', { man: S.tab });
      // Mở từ hộp "hết giờ" của bé: đưa ngay tới mục thời gian chơi
      const tg = S.tab === 'cai_dat' && $('gp-thoi-gian');
      if (tg && tg.scrollIntoView) tg.scrollIntoView({ block: 'start' });
    });
  }

  /** Đọc dữ liệu một bé (không đổi bé đang chơi) rồi vẽ lại. */
  function taiBe(id) {
    return ctx.taiDuLieuBe(id).then(function (d) {
      if (!d || !d.hoSo) return;
      S.beId = id;
      S.be = { hoSo: d.hoSo, cauDs: d.cauDs || [], vanDs: d.vanDs || [], hocTap: d.hocTap || null };
      S.cache = {};
      S.nhatKyGoc = {};
      S.soSuKien = null;
      S.xuat.kq = null;
      veDau();
      ve(true);
    });
  }

  function veDau() {
    const p = S.be.hoSo;
    $('gp-be').innerHTML = '<img src="' + esc(ctx.hinh(ctx.hinhKhungLong(p))) + '" alt=""><div><b>' + esc(p.ten) + ' · ' + HS.tuoiHienTai(p) + ' tuổi · lớp ' + esc(p.lop) + '</b>' +
      '<span>Đang học Bài ' + esc(p.bai_dang_hoc) + ' · ' + soDep(p.khung_long && p.khung_long.qua_mong) + ' quả mọng</span></div>';
    const ds = ctx.A.dsBe || [];
    const cb = $('gp-chon-be');
    cb.classList.toggle('hidden', ds.length < 2);
    cb.innerHTML = ds.map(function (x) {
      const on = x.id === S.beId;
      return '<button type="button" role="tab" aria-selected="' + on + '" class="gp-chip' + (on ? ' gp-chon' : '') + '" data-hd="doi-be" data-id="' + esc(x.id) + '">' + esc(x.ten) + '</button>';
    }).join('');
  }

  /** Vẽ nội dung chính theo tab hoặc màn con. cuonLen: đưa về đầu trang. */
  function ve(cuonLen) {
    if (!S.be) return;
    const tabSang = S.con ? S.con.tuTab : S.tab;
    document.querySelectorAll('#gp-tab button').forEach(function (b) {
      const on = b.getAttribute('data-tab') === tabSang;
      b.classList.toggle('gp-dang', on);
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    $('gp-nut-cai').classList.toggle('gp-dang', tabSang === 'cai_dat');
    const quay = $('gp-quay');
    quay.setAttribute('aria-label', S.con ? 'Quay lại' : 'Thoát góc phụ huynh');
    let h;
    const t0 = window.performance ? window.performance.now() : 0;
    if (S.con && S.con.loai === 'xem_lai') h = veXemLai();
    else if (S.con && S.con.loai === 'xuat_ai') h = veXuatAi();
    else if (S.tab === 'nhat_ky') h = veNhatKy();
    else if (S.tab === 'ky_nang') h = veKyNang();
    else if (S.tab === 'ke_hoach') h = veKeHoach();
    else if (S.tab === 'cai_dat') h = veCaiDat();
    else h = veTongQuan();
    $('gp-than').innerHTML = h;
    S.msVe = window.performance ? Math.round(window.performance.now() - t0) : 0;
    if (cuonLen) dom.scrollTop = 0;
    if (S.tab === 'cai_dat' && !S.con) demSuKien();
  }

  /* ---------------- Tiện ích vẽ ---------------- */

  function tieuDe(h1, phu, phai) {
    return '<div class="gp-tieu"><div><h1>' + h1 + '</h1>' + (phu ? '<p>' + phu + '</p>' : '') + '</div>' + (phai || '') + '</div>';
  }
  function dieuHuongTuan() {
    const nay = BC.dauTuan(homNay());
    const dauTien = BC.dauTuan(S.be.vanDs.length ? S.be.vanDs[0].ngay : homNay());
    return '<div class="gp-tuan-nav" role="group" aria-label="Đổi tuần">' +
      '<button type="button" class="gp-tron" data-hd="tuan" data-buoc="-1" aria-label="Tuần trước"' + (S.tuan <= dauTien ? ' disabled' : '') + '>' + svg(IC.trai) + '</button>' +
      '<button type="button" class="gp-tron" data-hd="tuan" data-buoc="1" aria-label="Tuần sau"' + (S.tuan >= nay ? ' disabled' : '') + '>' + svg(IC.phai) + '</button>' +
    '</div>';
  }
  function hinhGame(g) {
    const D = DAO();
    if (D.HINH_GAME[g]) return ctx.hinhTen(D.HINH_GAME[g]);
    return ctx.hinh(ctx.hinhKhungLong(S.be.hoSo, 'xe'));
  }
  function the(lop, noiDung) { return '<div class="gp-the' + (lop ? ' ' + lop : '') + '">' + noiDung + '</div>'; }
  function nhan(chu) { return '<div class="gp-nhan">' + chu + '</div>'; }
  function hsNay() {
    const k = 'hs:' + homNay();
    if (!S.cache[k]) S.cache[k] = BC.hoSoTai(S.be, homNay());
    return S.cache[k];
  }

  /* ---------------- 18. Tổng quan tuần ---------------- */

  function veTongQuan() {
    const p = S.be.hoSo;
    const k = 'tq:' + S.tuan;
    const t = S.cache[k] || (S.cache[k] = BC.tongQuanTuan(S.be, S.tuan, homNay()));
    const phu = (t.la_tuan_nay ? 'Tuần này, ' : 'Tuần ') + BC.khoangTuan(t.tu) + ' · đang học Bài ' + esc(p.bai_dang_hoc);
    let h = tieuDe('Tổng quan tuần', phu, dieuHuongTuan());
    if (t.chua_choi) {
      return h + the('gp-trong', '<img src="' + esc(ctx.hinh(ctx.hinhKhungLong(p, 'goi_y'))) + '" alt=""><h2>Con chưa chơi ván nào</h2><p>Khi ' + esc(p.ten) + ' chơi xong ván đầu tiên, báo cáo tuần sẽ hiện ở đây: phút chơi, số câu, con giỏi gì, đang luyện gì và chỗ nào cần bố mẹ giúp.</p>');
    }
    const phut = t.giay && t.phut === 0 ? '<1' : String(t.phut);
    h += '<div class="gp-kpi">' +
      kpi(phut, 'phút chơi', 'Xem nhật ký cả tuần: ' + phut + ' phút chơi') +
      kpi(t.so_ngay_choi + '/7', 'ngày có chơi', 'Xem nhật ký cả tuần: ' + t.so_ngay_choi + ' trên 7 ngày có chơi') +
      kpi(soDep(t.so_cau), 'câu đã làm', 'Xem nhật ký cả tuần: ' + t.so_cau + ' câu đã làm') +
      kpi(t.ti_le == null ? '–' : BC.phanTram(t.ti_le), 'tự làm đúng', 'Xem các câu sai của tuần: tự làm đúng ' + (t.ti_le == null ? 'chưa có' : BC.phanTram(t.ti_le)), 'sai') +
      '</div>';
    if (t.trong) {
      h += the('gp-trong gp-trong-nho', '<p>' + (t.la_tuan_nay ? 'Tuần này con chưa chơi ván nào.' : 'Tuần này con không chơi.') + ' Bấm ‹ để xem các tuần trước.</p>');
    }
    // Cột trái: con đã giỏi, cần giúp; cột phải: đang luyện, thích nhất, xu hướng (trên điện thoại xếp một cột theo thứ tự này)
    let trai = '';
    const coSao = t.gioi.some(function (x) { return x.muc === 'vung_chac'; });
    trai += the('', nhan('Con đã giỏi') + (t.gioi.length
      ? '<div class="gp-chips">' + t.gioi.slice(0, 10).map(function (x) {
        return '<button type="button" class="gp-chip gp-ok" data-hd="kn" data-ma="' + esc(x.ma) + '" aria-label="' + esc(x.ten + ': ' + BC.TEN_MUC[x.muc] + '. Xem trên bản đồ kỹ năng') + '">' + esc(x.ten) + (x.muc === 'vung_chac' ? ' ★' : '') + '</button>';
      }).join('') + (t.gioi.length > 10 ? '<span class="gp-chip">+' + (t.gioi.length - 10) + '</span>' : '') + '</div>' +
        (coSao ? '<small class="gp-dinh-nghia">★ Vững chắc: vẫn đúng khi ôn lại sau 1, 3, 7, 14 ngày.</small>' : '')
      : '<p class="gp-mo">Chưa có kỹ năng Đã thuộc. Một kỹ năng thành Đã thuộc khi con tự làm đúng từ 90% trên 20 câu, qua 2 ngày khác nhau.</p>'));
    if (t.can_giup.length) {
      trai += t.can_giup.map(function (x) {
        const pt = x.ti_le_tuan != null ? x.ti_le_tuan : x.ti_le_14;
        return the('gp-canh', nhan('Cần giúp') +
          '<button type="button" class="gp-hang gp-hang-nut" data-hd="nk-ky" data-ma="' + esc(x.ky_nang) + '" aria-label="' + esc(x.ten + ', xem các câu của kỹ năng này') + '"><span>' + esc(x.ten) + '</span><b class="gp-do">' + (pt == null ? '–' : BC.phanTram(pt)) + '</b></button>' +
          '<small class="gp-mo">' + (x.ti_le_tuan != null ? 'Tự làm đúng tuần này, ' + x.tu_lam_tuan + ' câu tự làm' : 'Tự làm đúng 14 ngày') + (x.lan_loi_14 ? ' · lỗi chính gặp ' + x.lan_loi_14 + ' lần trong 14 ngày' : '') + '</small>' +
          (x.vi_du ? '<button type="button" class="gp-vi-du" data-hd="xem-lai" data-cau="' + esc(x.vi_du.cau) + '" data-van="' + esc(x.vi_du.van) + '" aria-label="' + esc(x.vi_du.chu + '. Xem lại từng thao tác') + '"><span>' + esc(x.vi_du.chu) + '</span><i aria-hidden="true">›</i></button>' : ''));
      }).join('');
    } else {
      trai += the('', nhan('Cần giúp') + '<p class="gp-mo">Không có kỹ năng nào cần giúp. Cờ Cần giúp bật khi con tự làm đúng dưới 50% (từ 10 câu) hoặc một lỗi lặp lại từ 3 lần trong 7 ngày.</p>');
    }
    let phai = '';
    phai += the('', nhan('Đang luyện') + (t.dang_luyen.length
      ? t.dang_luyen.map(function (x) {
        const pt = x.ti_le_tuan == null ? null : Math.round(x.ti_le_tuan * 100);
        return '<button type="button" class="gp-dong-luyen" data-hd="nk-ky" data-ma="' + esc(x.ky_nang) + '" aria-label="' + esc(x.ten + ': tự làm đúng ' + (pt == null ? 'chưa có' : pt + '%') + ', ' + x.so_cau_tuan + ' câu tuần này. Xem các câu') + '">' +
          '<span class="gp-hang"><span>' + esc(x.ten) + '</span><b>' + (pt == null ? '–' : pt + '%') + '</b></span>' +
          '<span class="gp-thanh"><i style="width:' + (pt || 0) + '%"></i></span>' +
          '<small>' + x.so_cau_tuan + ' câu tuần này · ' + esc(BC.TEN_MUC[x.muc]) + '</small></button>';
      }).join('')
      : '<p class="gp-mo">Tuần này không có kỹ năng nào đang luyện.</p>'));
    if (t.thich_nhat) {
      const x = t.thich_nhat;
      phai += the('', nhan('Con thích nhất') + '<div class="gp-thich"><img src="' + esc(hinhGame(x.game)) + '" alt=""><div class="gp-hang"><span>' + esc(x.ten) + ' · ' + x.so_van + ' ván' + (x.tu_chon ? ' (' + x.tu_chon + ' ván con tự chọn)' : '') + '</span><b>' + x.vui + ' lần Vui</b></div></div>');
    }
    phai += the('', nhan('Tự làm đúng, 4 tuần') + veXuHuong(t.xu_huong) +
      '<p class="gp-dinh-nghia">Tự làm đúng: câu con đúng ngay ở lần chọn đầu, không dùng gợi ý, chia cho số câu con tự làm (không gợi ý). Câu bỏ dở không tính.</p>');
    h += '<div class="gp-luoi"><div class="gp-cot">' + trai + '</div><div class="gp-cot">' + phai + '</div></div>';
    return h;
  }
  function kpi(so, chu, aria, loc) {
    return '<button type="button" class="gp-the gp-kpi-o" data-hd="nk-tuan"' + (loc ? ' data-loc="' + loc + '"' : '') + ' aria-label="' + esc(aria) + '"><b>' + esc(so) + '</b><span>' + esc(chu) + '</span></button>';
  }
  function veXuHuong(ds) {
    const chu = ds.map(function (w) { return 'tuần ' + BC.ngayNgan(w.tu) + ': ' + (w.ti_le == null ? 'chưa chơi' : BC.phanTram(w.ti_le)); }).join('; ');
    return '<div class="gp-xu-huong" role="group" aria-label="' + esc('Tự làm đúng 4 tuần: ' + chu) + '">' + ds.map(function (w) {
      const pt = w.ti_le == null ? null : Math.round(w.ti_le * 100);
      const on = w.tu === S.tuan;
      return '<button type="button" class="gp-cot-xh' + (on ? ' gp-chon' : '') + '" data-hd="den-tuan" data-tu="' + w.tu + '" aria-label="' + esc('Tuần ' + BC.khoangTuan(w.tu) + ': ' + (pt == null ? 'chưa chơi' : 'tự làm đúng ' + pt + '%, ' + w.so_cau + ' câu')) + '"' + (on ? ' aria-current="true"' : '') + '>' +
        '<b>' + (pt == null ? '–' : pt + '%') + '</b><span class="gp-cot-khung"><i style="height:' + (pt == null ? 0 : Math.max(4, pt)) + '%"></i></span><small>' + BC.ngayNgan(w.tu) + '</small></button>';
    }).join('') + '</div>';
  }

  /* ---------------- 19. Nhật ký chi tiết ---------------- */

  function khoangNhatKy() {
    const tu = S.tuan, den = window.HocTap.congNgay(S.tuan, 6);
    const coChoi = {};
    S.be.vanDs.forEach(function (v) { if (v.ngay >= tu && v.ngay <= den) coChoi[v.ngay] = 1; });
    let ngay = S.nk.ngay;
    if (!S.nk.caTuan && (!ngay || ngay < tu || ngay > den || !coChoi[ngay])) {
      const ds = Object.keys(coChoi).sort();
      ngay = ds.length ? ds[ds.length - 1] : null;
      S.nk.ngay = ngay;
    }
    const caTuan = S.nk.caTuan || !ngay;
    return { tu: caTuan ? tu : ngay, den: caTuan ? den : ngay, caTuan: caTuan, coChoi: coChoi, tuanTu: tu, tuanDen: den };
  }

  function veNhatKy() {
    const kh = khoangNhatKy();
    const loc = S.nk.loc;
    const nk = BC.nhatKy(S.be, { tu: kh.tu, den: kh.den, loc: loc });
    const tongVan = nk.so_van;
    const giay = S.be.vanDs.filter(function (v) { return v.ngay >= kh.tu && v.ngay <= kh.den; }).reduce(function (s, v) { return s + (v.giay || 0); }, 0);
    const phu = (kh.caTuan ? 'Tuần ' + BC.khoangTuan(kh.tuanTu) : BC.thuNgay(kh.tu)) + ' · ' + tongVan + ' ván · ' + BC.phutChu(giay);
    let h = tieuDe('Nhật ký chi tiết', phu, dieuHuongTuan());
    // Chọn ngày
    let chip = '<button type="button" class="gp-chip' + (kh.caTuan ? ' gp-chon' : '') + '" data-hd="nk-ngay" data-ngay="" aria-pressed="' + kh.caTuan + '">Cả tuần</button>';
    for (let i = 0; i < 7; i++) {
      const n = window.HocTap.congNgay(kh.tuanTu, i);
      const co = !!kh.coChoi[n];
      const on = !kh.caTuan && n === kh.tu;
      const thu = THU_NGAN[(i + 1) % 7];
      chip += '<button type="button" class="gp-chip gp-chip-ngay' + (on ? ' gp-chon' : '') + '" data-hd="nk-ngay" data-ngay="' + n + '" aria-pressed="' + on + '" aria-label="' + esc(BC.thuNgay(n) + (co ? '' : ', không chơi')) + '"' + (co ? '' : ' disabled') + '><b>' + thu + '</b> ' + BC.ngayNgan(n) + '</button>';
    }
    h += '<div class="gp-chips gp-cuon-ngang" role="group" aria-label="Chọn ngày">' + chip + '</div>';
    // Bộ lọc
    const lc = function (loai, ma, chu, so) {
      const on = loc.loai === loai && (loc.ma || null) === (ma || null);
      return '<button type="button" class="gp-chip' + (on ? ' gp-chon' : '') + '" data-hd="nk-loc" data-loai="' + loai + '" data-ma="' + esc(ma || '') + '" aria-pressed="' + on + '">' + esc(chu) + (so != null ? ' <small>' + so + '</small>' : '') + '</button>';
    };
    let loc1 = lc('tat_ca', null, 'Tất cả', nk.so_cau) + lc('sai', null, 'Chỉ câu sai', nk.so_sai);
    if (loc.loai === 'ky_nang') loc1 += lc('ky_nang', loc.ma, 'Kỹ năng: ' + BC.tenKyNang(loc.ma), null);
    nk.chip_noi_dung.forEach(function (x) { loc1 += '<span class="gp-chip-bao" title="' + esc(x.ten) + '">' + lc('noi_dung', x.ma, 'Mã ' + x.ma, x.so) + '</span>'; });
    nk.chip_loi.forEach(function (x) { loc1 += lc('loi', x.ma, x.ten, x.so); });
    if (loc.loai === 'loi' && !nk.chip_loi.some(function (x) { return x.ma === loc.ma; })) loc1 += lc('loi', loc.ma, BC.tenLoi(loc.ma), 0);
    if (loc.loai === 'noi_dung' && !nk.chip_noi_dung.some(function (x) { return x.ma === loc.ma; })) loc1 += lc('noi_dung', loc.ma, 'Mã ' + loc.ma, 0);
    h += '<div class="gp-chips gp-loc" role="group" aria-label="Lọc câu">' + loc1 + '</div>';
    if (loc.loai === 'noi_dung') h += '<p class="gp-mo gp-loc-giai">Mã ' + esc(loc.ma) + ': ' + esc(BC.tenNoiDung(loc.ma)) + '</p>';
    if (loc.loai === 'loi') h += '<p class="gp-mo gp-loc-giai">' + esc(BC.tenLoi(loc.ma)) + ': ' + esc(BC.moTaLoi(loc.ma)) + '</p>';
    if (!nk.ngay.length) {
      return h + the('gp-trong gp-trong-nho', '<p>' + (tongVan ? 'Không có câu nào khớp bộ lọc trong ' + (kh.caTuan ? 'tuần này' : 'ngày này') + '.' : 'Không có ván nào trong ' + (kh.caTuan ? 'tuần này' : 'ngày này') + '.') + '</p>');
    }
    nk.ngay.forEach(function (n) {
      if (kh.caTuan) h += '<h2 class="gp-ngay-td">' + esc(n.thu) + ' · ' + n.so_van + ' ván · ' + esc(n.phut_chu) + '</h2>';
      n.van.forEach(function (v) { h += veVan(v); });
    });
    return h;
  }

  function veVan(v) {
    const tom = [];
    if (v.dung_ngay) tom.push('<span class="gp-ok">' + v.dung_ngay + ' đúng ngay</span>');
    if (v.dung_sau_goi_y) tom.push('<span class="gp-vua">' + v.dung_sau_goi_y + ' nhờ gợi ý</span>');
    if (v.dung_lan_2) tom.push('<span class="gp-vua">' + v.dung_lan_2 + ' đúng lần 2</span>');
    if (v.sai) tom.push('<span class="gp-sai">' + v.sai + ' sai → ' + (v.sai_da_sua ? 'sửa được ' + (v.sai_da_sua === v.sai && v.sai > 1 ? 'cả ' : '') + v.sai_da_sua : 'chưa sửa') + '</span>');
    else if (v.so_cau && !v.dung_sau_goi_y && !v.dung_lan_2) tom.push('<span class="gp-ok">không sai câu nào</span>');
    if (v.bo_do) tom.push('<span class="gp-xam">dừng giữa chừng</span>');
    const dong2 = [v.so_cau + ' câu', v.phut_chu];
    if (v.ten_cam_xuc) dong2.push('chọn ' + v.ten_cam_xuc);
    if (v.nguon && v.nguon !== 'tu_chon') dong2.push({ hoc_moi: 'nhiệm vụ Học mới', luyen_lai: 'nhiệm vụ Luyện lại', on_cach_quang: 'nhiệm vụ Ôn nhanh' }[v.nguon] || '');
    let h = '<article class="gp-the gp-van">' +
      '<div class="gp-van-dau"><img src="' + esc(hinhGame(v.game)) + '" alt=""><div><b>' + esc(v.gio + ' · ' + v.ten_game + ' · ' + v.ten_man_ngan) + '</b>' +
      '<span>' + esc(dong2.filter(Boolean).join(' · ')) + (v.ten_man && v.ten_man_ngan.indexOf('vùng') === 0 ? '<em> · ' + esc(v.ten_man) + '</em>' : '') + '</span></div></div>' +
      '<div class="gp-tom">' + tom.join('') + '</div>';
    if (v.cau.length) {
      h += '<ul class="gp-cau-ds">' + v.cau.map(veDongCau).join('') + '</ul>';
    }
    return h + '</article>';
  }

  function veDongCau(r) {
    const ct = [];
    if (r.tra_loi.length) ct.push(esc(r.dong_tu) + ' ' + r.tra_loi.map(function (x) { return x.sai ? '<del>' + esc(x.chu) + '</del>' : '<ins>' + esc(x.chu) + '</ins>'; }).join(', '));
    else if (r.het_gio) ct.push('hết giờ');
    r.loi.filter(function (l) { return l.ma !== 'khac' || r.loi.length === 1; }).forEach(function (l) { ct.push('<span class="gp-loi">' + esc(l.ten) + '</span>'); });
    if (r.giay != null) ct.push(esc(BC.giayChu(r.giay)));
    if (r.doi_y >= 2) ct.push('đổi ý ' + r.doi_y + ' lần');
    if (r.goi_y) ct.push('gợi ý cấp ' + r.goi_y);
    const aria = r.de + ', ' + r.nhan_trang_thai + '. Xem lại từng thao tác';
    return '<li><button type="button" class="gp-cau gp-tt-' + r.trang_thai + '" data-hd="xem-lai" data-cau="' + esc(r.cau) + '" data-van="' + esc(r.van) + '" aria-label="' + esc(aria) + '">' +
      '<b class="gp-cau-de">' + esc(r.de) + '</b><span class="gp-cau-ct">' + ct.join(' · ') + '</span><em class="gp-cau-tt">' + esc(r.nhan_trang_thai) + '</em></button></li>';
  }

  /* ---------------- 20. Xem lại một câu ---------------- */

  function moXemLai(cau, van) {
    const tuTab = S.con && S.con.tuTab ? S.con.tuTab : S.tab;
    S.con = { loai: 'xem_lai', cau: cau, van: van, tuTab: tuTab === 'tong_quan' || tuTab === 'ky_nang' || tuTab === 'nhat_ky' ? tuTab : 'nhat_ky' };
    ghi('phu_huynh_mo', { man: 'xem_lai', cau: cau });
    if (S.nhatKyGoc[van]) { ve(true); return; }
    $('gp-than').innerHTML = tieuDe('Xem lại một câu', 'Đang đọc nhật ký…');
    dom.scrollTop = 0;
    NK.docVan(van).then(function (evs) {
      S.nhatKyGoc[van] = evs || [];
      if (S.con && S.con.cau === cau) ve(true);
    });
  }

  function veXemLai() {
    const c = S.con;
    const evs = S.nhatKyGoc[c.van] || [];
    const tl = BC.dongThoiGian(evs, c.cau, { cauDs: S.be.cauDs });
    const quay = '<button type="button" class="gp-lui" data-hd="quay">' + svg(IC.trai) + { tong_quan: 'Tổng quan', ky_nang: 'Kỹ năng', nhat_ky: 'Nhật ký' }[c.tuTab] + '</button>';
    if (!tl) {
      const tom = S.be.cauDs.find(function (x) { return x.cau === c.cau; });
      return '<div class="gp-tieu gp-tieu-con">' + quay + '</div>' + the('gp-trong gp-trong-nho', '<h2>' + esc(tom ? BC.deNgan(tom) : 'Câu này') + '</h2><p>Nhật ký gốc của câu này không còn (máy chỉ giữ từng thao tác trong 120 ngày). Tóm tắt câu vẫn còn trong Nhật ký.</p>');
    }
    const deDai = String(tl.de || '').length > 48;
    let h = '<div class="gp-tieu gp-tieu-con">' + quay + '<p>' + esc(tl.ten_game + ' · ' + tl.ten_man_ngan + ' · câu ' + tl.stt + '/' + tl.tong + ' · ' + BC.thuNgay(tl.ngay) + ', ' + tl.gio) + '</p>' +
      (deDai ? '<p class="gp-de-dai">' + esc(tl.de) + '</p>' : '<h1 class="gp-de">' + esc(tl.de) + '</h1>') + '</div>';
    // Cột trái: hình, lựa chọn, đường đi, nhận xét
    let trai = '';
    let hinh = '';
    try { hinh = NH().veHinh(tl.cau_truc) || ''; } catch (e) { hinh = ''; }
    let khung = '';
    if (hinh) khung += '<div class="gp-hinh-de">' + hinh + '</div>';
    if (tl.lua_chon.length) {
      khung += '<div class="gp-lua-chon" role="list" aria-label="Các lựa chọn">' + tl.lua_chon.map(function (x) {
        const lop = (x.dung ? ' gp-lc-dung' : '') + (x.be_chot && !x.dung ? ' gp-lc-sai' : '') + (x.be_chot && x.dung ? ' gp-lc-chot' : '');
        const ghiChu = [];
        if (x.dung) ghiChu.push('đáp án đúng');
        if (x.be_chot) ghiChu.push('con chốt');
        if (x.lan_ghe) ghiChu.push('ghé ' + x.lan_ghe + ' lần');
        return '<span role="listitem" class="gp-lc' + lop + '" aria-label="' + esc(x.nhan + (ghiChu.length ? ': ' + ghiChu.join(', ') : '')) + '"><b>' + esc(x.nhan) + '</b>' + (x.lan_ghe ? '<small>×' + x.lan_ghe + '</small>' : '') + '</span>';
      }).join('') + '</div>';
    } else if (tl.dang !== 'chon_dap_an') {
      khung += '<p class="gp-hang"><span>Đáp án đúng</span><b>' + esc(tl.nhan_dap_an) + '</b></p>';
    }
    khung += veLan(tl);
    if (tl.duong) khung += '<p class="gp-duong">' + esc(tl.duong.chu) + '</p>';
    if (khung) trai += the('gp-xl-de', khung);
    if (tl.la_lam_lai_cua) {
      trai += the('gp-ghi-nho', '<p>' + esc(tl.la_lam_lai_cua.chu) + '</p>' + (tl.la_lam_lai_cua.van ? '<button type="button" class="gp-lien-ket" data-hd="xem-lai" data-cau="' + esc(tl.la_lam_lai_cua.cau) + '" data-van="' + esc(tl.la_lam_lai_cua.van) + '">Xem câu lúc sai ›</button>' : ''));
    }
    trai += the('gp-nhan-xet', nhan('Nhận xét') + '<p>' + esc(tl.nhan_xet) + '</p>' +
      (tl.loi_chinh && tl.so_cung_loi_tuan > 1 ? '<button type="button" class="gp-nut-chinh" data-hd="cung-loi" data-ma="' + esc(tl.loi_chinh) + '" data-tu="' + esc(tl.tuan_tu) + '">Xem ' + tl.so_cung_loi_tuan + ' câu cùng lỗi</button>' : ''));
    // Cột phải: dòng thời gian
    let tg = '<ol class="gp-dong-tg">' + tl.muc.map(function (m) {
      return '<li class="gp-tg-' + m.kieu + '"><time>' + esc(m.moc) + '</time><span>' + dam(m.chu) + '</span></li>';
    }).join('');
    tl.lam_lai.forEach(function (x) {
      tg += '<li class="gp-tg-' + (x.dung ? 'dung' : 'sai') + ' gp-tg-lai"><time>' + esc(x.moc) + '</time><span>' + esc(x.chu) +
        (x.van ? ' <button type="button" class="gp-lien-ket" data-hd="xem-lai" data-cau="' + esc(x.cau) + '" data-van="' + esc(x.van) + '" aria-label="Xem lại lần làm lại">Xem ›</button>' : '') + '</span></li>';
    });
    if (!tl.lam_lai.length && (tl.ket_qua === 'sai' || tl.ket_qua === 'het_gio')) tg += '<li class="gp-tg-ket_thuc gp-tg-lai"><time>sau</time><span>Chưa làm lại câu này</span></li>';
    tg += '</ol>';
    const phai = the('', nhan('Từng thao tác, tính từ lúc câu hiện') + tg);
    h += '<div class="gp-luoi gp-luoi-xl"><div class="gp-cot">' + trai + '</div><div class="gp-cot">' + phai + '</div></div>';
    return h;
  }

  /** Hình ba làn đường và đường xe của bé (chỉ câu Đua Xe có vị trí làn). */
  function veLan(tl) {
    if (!tl.duong || tl.duong.loai !== 'lan') return '';
    const lc = tl.lua_chon;
    const X = { lan_trai: 44, lan_giua: 130, lan_phai: 216 };
    if (!lc.length || !lc.every(function (x) { return X[x.vi_tri] != null; })) return '';
    const buoc = tl.duong.buoc.filter(function (l) { return X[l] != null; });
    if (!buoc.length) return '';
    const y0 = 118, y1 = 44;
    const n = buoc.length;
    const diem = [];
    buoc.forEach(function (l, i) {
      const y = n === 1 ? y1 : y0 - (y0 - y1) * i / (n - 1);
      if (i === 0) diem.push([X[l], y0 + 8]);
      else diem.push([X[buoc[i - 1]], y + (y0 - y1) / Math.max(1, n - 1) * 0.35]);
      diem.push([X[l], y]);
    });
    diem.push([X[buoc[n - 1]], 30]);
    const chot = lc.find(function (x) { return x.be_chot; });
    const cuoiDung = chot && chot.dung;
    let s = '<svg class="gp-lan" viewBox="0 0 260 132" role="img" aria-label="' + esc(tl.duong.chu) + '">' +
      '<defs><linearGradient id="gp-duong-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5b6178"/><stop offset="1" stop-color="#3f4459"/></linearGradient></defs>' +
      '<rect x="1" y="1" width="258" height="130" rx="14" fill="url(#gp-duong-g)"/>' +
      '<path d="M87 8 V126 M173 8 V126" stroke="#fff" stroke-opacity=".8" stroke-width="2.5" stroke-dasharray="9 7"/>';
    lc.forEach(function (x) {
      const cx = X[x.vi_tri];
      const nen = x.dung ? '#7ee0d5' : x.be_chot ? '#ffb3cf' : '#fff1c2';
      s += '<rect x="' + (cx - 32) + '" y="6" width="64" height="26" rx="8" fill="' + nen + '"/>' +
        '<text x="' + cx + '" y="25" text-anchor="middle" font-family="Baloo 2, Arial Rounded MT Bold, sans-serif" font-weight="800" font-size="17" fill="#221a3b">' + esc(x.nhan.length > 6 ? x.nhan.slice(0, 6) : x.nhan) + '</text>';
    });
    s += '<polyline points="' + diem.map(function (p) { return p[0] + ',' + Math.round(p[1]); }).join(' ') + '" fill="none" stroke="#ff6b35" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<circle cx="' + X[buoc[0]] + '" cy="' + (y0 + 8) + '" r="6" fill="#fff"/>' +
      '<circle cx="' + X[buoc[n - 1]] + '" cy="34" r="7" fill="' + (cuoiDung ? '#06a77d' : '#ef476f') + '" stroke="#fff" stroke-width="2.5"/></svg>';
    return s;
  }

  /* ---------------- 21. Bản đồ kỹ năng ---------------- */

  function veKyNang() {
    const k = 'bd';
    const bd = S.cache[k] || (S.cache[k] = BC.banDoKyNang(hsNay()));
    let h = tieuDe('Bản đồ kỹ năng', bd.so_o + ' nội dung lớp 2 · chạm một ô để xem');
    let ban = '<div class="gp-ban-do">' + bd.vung.map(function (v) {
      return '<div class="gp-vung-hang"><span class="gp-vung-ten"><i style="background:' + esc(v.mau) + '">' + v.so + '</i>' + esc(v.ten) + '</span><div class="gp-o-ds">' +
        v.o.map(function (o) {
          const on = S.kn === o.ma;
          return '<button type="button" class="gp-o-kn gp-m-' + o.muc + (o.can_giup ? ' gp-can-giup' : '') + (on ? ' gp-chon' : '') + '" data-hd="kn" data-ma="' + esc(o.ma) + '" aria-pressed="' + on + '" aria-label="' + esc(o.ma + ' ' + o.ten + ': ' + o.ten_muc + (o.can_giup ? ', cần giúp' : '')) + '">' + esc(o.ma) + '</button>';
        }).join('') + '</div></div>';
    }).join('') + '</div>';
    ban += '<div class="gp-chu-giai">' + bd.chu_giai.map(function (m) { return '<span><i class="gp-m-' + m.muc + '"></i>' + esc(m.ten) + '</span>'; }).join('') + '<span><i class="gp-cham-do"></i>Cần giúp</span></div>';
    h += '<div class="gp-luoi gp-luoi-kn"><div class="gp-cot">' + the('', ban) + '</div><div class="gp-cot" id="gp-kn-ct">' + veChiTietNd() + '</div></div>';
    return h;
  }

  function veChiTietNd() {
    if (!S.kn) return the('gp-trong gp-trong-nho', '<p>Chạm một ô trên bản đồ để xem: mức thành thạo, tỉ lệ tự làm đúng 14 ngày, lỗi hay gặp, câu vừa sai và màn nào luyện nội dung đó.</p>');
    const k = 'ct:' + S.kn;
    const d = S.cache[k] || (S.cache[k] = BC.chiTietNoiDung(S.kn, S.be, homNay()));
    let h = '<div class="gp-nhan">Mã ' + esc(d.ma) + ' · <span class="gp-chip-muc gp-cm-' + d.muc + '">' + esc(d.ten_muc) + '</span>' + (d.can_giup ? ' <span class="gp-chip-muc gp-cm-can-giup">Cần giúp</span>' : '') + '</div>' +
      '<h2 class="gp-nd-ten">' + esc(d.ten) + '</h2>';
    h += '<div class="gp-so-lieu">' +
      '<p class="gp-hang"><span>Tự làm đúng (14 ngày)</span><b>' + (d.ti_le_14 == null ? '–' : BC.phanTram(d.ti_le_14)) + ' · ' + d.tu_lam_14 + ' câu tự làm</b></p>' +
      '<p class="gp-hang"><span>Số câu đã làm</span><b>' + soDep(d.so_cau) + ' câu' + (d.so_cau_14 !== d.so_cau ? ' (' + d.so_cau_14 + ' trong 14 ngày)' : '') + '</b></p>' +
      '<p class="gp-hang"><span>Thời gian mỗi câu đúng</span><b>' + (d.giay_trung_vi == null ? '–' : BC.giayChu(d.giay_trung_vi)) + '</b></p>' +
      '</div>';
    if (d.loi.length) {
      h += nhan('Lỗi hay gặp (14 ngày)') + '<div class="gp-chips">' + d.loi.slice(0, 6).map(function (l, i) {
        return '<button type="button" class="gp-chip ' + (i < 2 && l.ma !== 'khac' ? 'gp-sai' : 'gp-vua') + '" data-hd="cung-loi" data-ma="' + esc(l.ma) + '" data-tu="' + esc(BC.dauTuan(homNay())) + '" title="' + esc(BC.moTaLoi(l.ma)) + '">' + esc(l.ten) + ' ×' + l.lan + '</button>';
      }).join('') + '</div>';
    }
    if (d.cau_sai_gan_day.length) {
      h += nhan('Câu sai gần đây') + '<ul class="gp-sai-gan">' + d.cau_sai_gan_day.map(function (c) {
        return '<li><button type="button" data-hd="xem-lai" data-cau="' + esc(c.cau) + '" data-van="' + esc(c.van) + '" aria-label="' + esc(c.de + ', con chọn ' + (c.sai.join(', ') || 'hết giờ') + ', đáp án ' + c.dung + '. Xem lại') + '">' +
          '<b>' + esc(c.de) + '</b>' + (c.sai.length ? c.sai.map(function (v) { return '<del>' + esc(v) + '</del>'; }).join('') : '<del>hết giờ</del>') + '<ins>' + esc(c.dung) + '</ins><small>' + esc(BC.ngayNgan(c.ngay)) + (c.da_sua ? ' · đã sửa' : '') + '</small><i aria-hidden="true">›</i></button></li>';
      }).join('') + '</ul>';
    }
    if (d.ky_nang.length) {
      h += nhan('Các kỹ năng của nội dung này') + '<ul class="gp-ky-ds">' + d.ky_nang.map(function (x) {
        return '<li><button type="button" data-hd="nk-ky" data-ma="' + esc(x.ky_nang) + '"><span>' + esc(x.ten) + '</span><span class="gp-chip-muc gp-cm-' + x.muc + '">' + esc(x.ten_muc) + '</span>' + (x.can_giup ? '<span class="gp-chip-muc gp-cm-can-giup">Cần giúp</span>' : '') +
          '<small>' + x.so_cau + ' câu' + (x.ti_le_14 != null ? ' · tự làm đúng ' + BC.phanTram(x.ti_le_14) : '') + (x.on_lai_ke_tiep ? ' · ôn lại ' + BC.ngayNgan(x.on_lai_ke_tiep) : '') + '</small></button></li>';
      }).join('') + '</ul>';
    }
    const man = d.man.filter(function (m) { return m.choi_duoc; });
    h += nhan('Màn luyện nội dung này') + (man.length
      ? '<ul class="gp-man-ds">' + man.map(function (m) { return '<li><img src="' + esc(hinhGame(m.game)) + '" alt=""><span><b>' + esc(m.ten_game) + '</b>' + esc(m.ten) + ' <small>(' + esc(m.bai) + ')</small></span></li>'; }).join('') + '</ul>'
      : '<p class="gp-mo">Nội dung này sẽ có màn chơi ở bản sau.</p>');
    if (d.tien_quyet.length) h += nhan('Nền cần có') + '<div class="gp-chips">' + d.tien_quyet.map(function (p) {
      return /^L1\./.test(p.ma) ? '<span class="gp-chip" title="' + esc(p.ten) + '">' + esc(p.ten) + '</span>' : '<button type="button" class="gp-chip" data-hd="kn" data-ma="' + esc(p.ma) + '" title="' + esc(p.ten) + '">' + esc(p.ma) + ' · ' + esc(rutGon(p.ten, 34)) + '</button>';
    }).join('') + '</div>';
    if (BC.VIEC_CUNG_CON[d.ma]) h += '<div class="gp-lam-cung">' + nhan('Làm cùng con') + '<p>' + esc(BC.VIEC_CUNG_CON[d.ma]) + '</p></div>';
    return the('gp-chi-tiet', h);
  }
  function rutGon(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1).trim() + '…' : s; }

  /* ---------------- 22. Kế hoạch tuần tới ---------------- */

  function keHoach() {
    const k = 'kh';
    return S.cache[k] || (S.cache[k] = BC.keHoachTuan(S.be, homNay()));
  }

  function veKeHoach() {
    const p = S.be.hoSo;
    const kh = keHoach();
    let h = tieuDe('Kế hoạch tuần tới', esc(BC.khoangTuan(kh.tu)) + ' · gợi ý từ nhật ký, bạn chỉnh được');
    const dang = p.ke_hoach_tuan;
    if (dang && dang.den >= homNay()) {
      h += '<div class="gp-bang-tin"><span>Đang dùng kế hoạch ' + esc(BC.khoangTuan(dang.tu)) + ' (' + dang.muc.length + ' mục): nhiệm vụ hằng ngày của con ưu tiên các mục này.</span><button type="button" class="gp-lien-ket" data-hd="bo-ke-hoach">Bỏ kế hoạch</button></div>';
    }
    const TEN = { luyen_lai: 'Luyện lại', on_nen: 'Ôn nền', hoc_moi: 'Học mới' };
    if (kh.muc.length) {
      h += '<ol class="gp-kh">' + kh.muc.map(function (m) {
        const bo = !!S.kh.bo[m.man];
        return '<li class="gp-the gp-kh-muc' + (bo ? ' gp-bo' : '') + '"><div class="gp-kh-dau"><span class="gp-tag gp-tag-' + m.loai + '">' + TEN[m.loai] + '</span>' +
          '<label class="gp-cong-tac"><input type="checkbox" data-hd="kh-muc" data-man="' + esc(m.man) + '"' + (bo ? '' : ' checked') + '><span aria-hidden="true"></span><em>' + (bo ? 'Bỏ ra' : 'Có trong kế hoạch') + '</em></label></div>' +
          '<div class="gp-kh-than"><img src="' + esc(hinhGame(m.game)) + '" alt=""><div><b>' + esc(m.tieu_de) + '</b><span>' + esc(m.chi_tiet) + '</span>' +
          '<small class="gp-kh-choi">' + esc(m.choi) + '</small></div></div></li>';
      }).join('') + '</ol>';
    } else {
      h += the('gp-trong gp-trong-nho', '<p>Chưa đủ dữ liệu để gợi ý. Con cứ chơi theo nhiệm vụ hằng ngày, sau vài ván kế hoạch sẽ hiện ở đây.</p>');
    }
    if (kh.viec_cung_con.length) {
      h += the('gp-vang', nhan('Làm cùng con') + '<ul class="gp-viec">' + kh.viec_cung_con.map(function (v) { return '<li><b>' + esc(rutGon(v.ten, 60)) + '</b><span>' + esc(v.chu) + '</span></li>'; }).join('') + '</ul>');
    }
    h += the('gp-cai-nhanh', veBaiDangHoc() + veGioiHan() +
      '<div class="gp-dong-cai"><span>Xuất dữ liệu cho trợ lý AI<small>Gói JSON đã ẩn tên, để nhờ trợ lý AI nhận xét</small></span><button type="button" class="gp-nut-phu" data-hd="xuat-ai">Tạo tệp ›</button></div>');
    const chon = kh.muc.filter(function (m) { return !S.kh.bo[m.man]; });
    const dangDung = dang && dang.tu === kh.tu && JSON.stringify(dang.muc) === JSON.stringify(chon.map(function (m) { return { loai: m.loai, man: m.man, ky_nang: m.ky_nang, ly_do: m.ly_do }; }));
    h += '<button type="button" class="gp-nut-chinh gp-nut-to" data-hd="dung-ke-hoach"' + (chon.length && !dangDung ? '' : ' disabled') + '>' + (dangDung ? 'Đang dùng kế hoạch này' : 'Dùng kế hoạch này') + '</button>';
    return h;
  }

  function veBaiDangHoc() {
    const p = S.be.hoSo;
    const m = DAO().VUNG.reduce(function (r, v) { return r.concat(v.man); }, []).filter(function (x) { return x.bai_dau <= p.bai_dang_hoc && x.ky_nang_chinh && !x.luyen_tap; })
      .sort(function (a, b) { return a.bai_dau - b.bai_dau; }).pop();
    return '<div class="gp-dong-cai"><span>Con đang học đến<small>' + (m ? 'Màn gần nhất: ' + esc(m.ten) + ' (' + esc(m.bai) + ')' : 'Toán 2, 75 bài') + '</small></span>' +
      '<div class="gp-buoc-so"><button type="button" data-hd="cai" data-truong="bai_dang_hoc" data-gt="' + (p.bai_dang_hoc - 1) + '" aria-label="Bài trước"' + (p.bai_dang_hoc <= 1 ? ' disabled' : '') + '>−</button>' +
      '<b aria-live="polite">Bài ' + esc(p.bai_dang_hoc) + '</b><button type="button" data-hd="cai" data-truong="bai_dang_hoc" data-gt="' + (p.bai_dang_hoc + 1) + '" aria-label="Bài sau"' + (p.bai_dang_hoc >= 75 ? ' disabled' : '') + '>+</button></div></div>';
  }
  function phutHomNay() {
    const nay = homNay();
    return S.be.vanDs.reduce(function (s, v) { return s + (v.ngay === nay ? v.giay || 0 : 0); }, 0) / 60;
  }
  /**
   * Thời gian chơi: mặc định không giới hạn. Phụ huynh chọn nhanh hoặc chỉnh từng 5 phút; khi có giới hạn thì cho thêm
   * được giờ riêng hôm nay (cộng dồn) hoặc không giới hạn hôm nay, qua ngày tự về như cũ.
   */
  function veGioiHan() {
    const p = S.be.hoSo;
    const gh = HS.sachGioiHan(p.gioi_han_phut);
    const G = HS.GIOI_HAN;
    const daChoi = Math.round(phutHomNay());
    const chip = function (on, hd, attrs, chu) {
      return '<button type="button" class="gp-chip' + (on ? ' gp-chon' : '') + '" aria-pressed="' + on + '" data-hd="' + hd + '" ' + attrs + '>' + chu + '</button>';
    };
    let h = '<div class="gp-dong-cai gp-dong-cai-cot" id="gp-thoi-gian"><span>Thời gian chơi mỗi ngày<small>' +
      (gh == null ? 'Đang để không giới hạn (mặc định). Con chơi bao lâu tùy bố mẹ.' : 'Hết giờ, con được chơi nốt ván đang dở rồi nghỉ. Bố mẹ cho thêm giờ bất cứ lúc nào ở dưới.') +
      ' Hôm nay con đã chơi ' + daChoi + ' phút.</small></span>' +
      '<div class="gp-chips" role="group" aria-label="Thời gian chơi mỗi ngày">' + GIOI_HAN.map(function (g) {
        return chip(g === gh, 'cai', 'data-truong="gioi_han_phut" data-gt="' + (g == null ? '' : g) + '"', g == null ? 'Không giới hạn' : g + ' phút');
      }).join('') + '</div>' +
      '<div class="gp-buoc-so" role="group" aria-label="Chỉnh từng ' + G.buoc + ' phút">' +
        '<button type="button" data-hd="cai" data-truong="gioi_han_phut" data-gt="' + (gh == null ? 30 : Math.max(G.toi_thieu, gh - G.buoc)) + '" aria-label="Bớt ' + G.buoc + ' phút"' + (gh != null && gh <= G.toi_thieu ? ' disabled' : '') + '>−</button>' +
        '<b aria-live="polite">' + (gh == null ? 'Không giới hạn' : gh + ' phút') + '</b>' +
        '<button type="button" data-hd="cai" data-truong="gioi_han_phut" data-gt="' + (gh == null ? 30 : Math.min(G.toi_da, gh + G.buoc)) + '" aria-label="Thêm ' + G.buoc + ' phút"' + (gh != null && gh >= G.toi_da ? ' disabled' : '') + '>+</button>' +
      '</div></div>';
    if (gh == null) return h;
    // Riêng hôm nay
    const nay = homNay();
    const them = p.them_hom_nay && p.them_hom_nay.ngay === nay ? p.them_hom_nay : null;
    const hieuLuc = HS.gioiHanHomNay(p, nay);
    const trangThai = hieuLuc == null ? 'Hôm nay: không giới hạn.'
      : 'Hôm nay con được chơi ' + hieuLuc + ' phút' + (them && them.phut ? ' (' + gh + ' + ' + them.phut + ' phút cho thêm)' : '') + ', ' +
        (daChoi >= hieuLuc ? 'đã hết giờ.' : 'còn khoảng ' + (hieuLuc - daChoi) + ' phút.');
    h += '<div class="gp-dong-cai gp-dong-cai-cot"><span>Riêng hôm nay<small>' + trangThai + ' Ngày mai tự về ' + gh + ' phút.</small></span>' +
      '<div class="gp-chips" role="group" aria-label="Cho thêm giờ hôm nay">' +
        THEM_HOM_NAY.map(function (m) { return chip(false, 'them-hom-nay', 'data-gt="' + m + '"', 'Cho thêm ' + m + ' phút từ bây giờ'); }).join('') +
        chip(!!(them && them.khong_gioi_han), 'them-hom-nay', 'data-gt="vo_han"', 'Không giới hạn hôm nay') +
        (them ? chip(false, 'them-hom-nay', 'data-gt=""', 'Như mọi ngày') : '') +
      '</div></div>';
    return h;
  }

  /* ---------------- Cài đặt ---------------- */

  function veCaiDat() {
    const p = S.be.hoSo;
    const tuoi = HS.tuoiHienTai(p);
    let h = tieuDe('Cài đặt', 'Hồ sơ, thời gian chơi và dữ liệu của ' + esc(p.ten));
    let tuoiH = '', lopH = '';
    for (let t = 5; t <= 11; t++) tuoiH += '<button type="button" class="gp-o-so' + (t === tuoi ? ' gp-chon' : '') + '" aria-pressed="' + (t === tuoi) + '" data-hd="cai" data-truong="tuoi" data-gt="' + t + '">' + t + '</button>';
    for (let l = 1; l <= 5; l++) lopH += '<button type="button" class="gp-o-so' + (l === p.lop ? ' gp-chon' : '') + '" aria-pressed="' + (l === p.lop) + '" data-hd="cai" data-truong="lop" data-gt="' + l + '">' + l + '</button>';
    h += the('', nhan('Hồ sơ của con') +
      '<div class="gp-dong-cai"><span>Tuổi</span><div class="gp-o-so-ds" role="group" aria-label="Tuổi">' + tuoiH + '</div></div>' +
      '<div class="gp-dong-cai"><span>Lớp</span><div class="gp-o-so-ds" role="group" aria-label="Lớp">' + lopH + '</div></div>' +
      veBaiDangHoc());
    h += the('', nhan('Thời gian và vùng đất') + veGioiHan() +
      '<div class="gp-dong-cai"><span>Mở khóa mọi vùng<small>Mặc định vùng học kì 2 chờ tới khi con học Bài 37. Bật để con chơi mọi vùng ngay.</small></span>' +
      '<label class="gp-cong-tac gp-cong-tac-to"><input type="checkbox" data-hd="mo-khoa"' + (p.mo_khoa_vung ? ' checked' : '') + '><span aria-hidden="true"></span><em>' + (p.mo_khoa_vung ? 'Đang mở' : 'Tắt') + '</em></label></div>');
    h += the('', nhan('Dữ liệu trên máy này') +
      '<p class="gp-mo" id="gp-thong-ke">' + esc(thongKe()) + '</p>' +
      '<div class="gp-nut-ds">' +
        '<button type="button" class="gp-nut-phu" data-hd="xuat-ai">Xuất cho trợ lý AI</button>' +
        '<button type="button" class="gp-nut-phu" data-hd="tai-jsonl">' + svg(IC.tai) + 'Tải nhật ký (JSONL)</button>' +
        '<button type="button" class="gp-nut-phu" data-hd="tinh-lai">Tính lại tóm tắt từ nhật ký</button>' +
        '<button type="button" class="gp-nut-xoa" data-hd="xoa-be">Xóa dữ liệu của ' + esc(p.ten) + '</button>' +
      '</div>' +
      '<p class="gp-rieng">' + svg(IC.khoa) + 'Dữ liệu chỉ nằm trên máy này, không gửi đi đâu. Tên của con không có trong nhật ký (chỉ có mã bé).</p>');
    return h;
  }
  function thongKe() {
    return (S.soSuKien == null ? '…' : soDep(S.soSuKien)) + ' sự kiện trong nhật ký gốc · ' + S.be.vanDs.length + ' ván · ' + S.be.cauDs.length + ' câu.';
  }
  function demSuKien() {
    if (S.soSuKien != null) return;
    const id = S.beId;
    NK.docCuaBe(id).then(function (ds) {
      if (S.beId !== id) return;
      S.soSuKien = ds.length;
      const el = $('gp-thong-ke');
      if (el) el.textContent = thongKe();
    });
  }

  /* ---------------- Xuất cho trợ lý AI (spec 06 mục 5.9) ---------------- */

  function moXuatAi() {
    S.con = { loai: 'xuat_ai', tuTab: S.con && S.con.tuTab ? S.con.tuTab : S.tab };
    ghi('phu_huynh_mo', { man: 'xuat_ai' });
    taoGoi();
  }
  function taoGoi() {
    S.xuat.kq = null;
    S.xuat.dang = true;
    ve(true);
    const id = S.beId;
    NK.docCuaBe(id).then(function (evs) {
      if (S.beId !== id) return;
      S.xuat.kq = BC.goiXuat(S.be, evs, { homNay: homNay(), taoLuc: NK.isoDiaPhuong(Date.now()), tuoi: HS.tuoiHienTai(S.be.hoSo), kemNhatKy: S.xuat.kem, biDanh: 'be_1' });
      S.xuat.dang = false;
      if (S.con && S.con.loai === 'xuat_ai') ve(false);
    });
  }
  function veXuatAi() {
    const quay = '<button type="button" class="gp-lui" data-hd="quay">' + svg(IC.trai) + (S.con.tuTab === 'cai_dat' ? 'Cài đặt' : 'Kế hoạch') + '</button>';
    let h = '<div class="gp-tieu gp-tieu-con">' + quay + '<h1>Xuất dữ liệu cho trợ lý AI</h1><p>Gói JSON tóm tắt 4 tuần học của con, kèm từ điển mã, hướng dẫn và khuôn trả lời, để bạn dán vào một trợ lý AI và nhờ nhận xét, gợi ý bài luyện.</p></div>';
    const kq = S.xuat.kq;
    let noi = '<p class="gp-rieng">' + svg(IC.khoa) + 'Gói dùng bí danh be_1, không có tên, ngày sinh hay mã thiết bị. Không tự gửi đi đâu: bạn tự sao chép hoặc tải tệp.</p>' +
      '<label class="gp-hop-chon"><input type="checkbox" data-hd="kem-nk"' + (S.xuat.kem ? ' checked' : '') + '><span>Kèm nhật ký chi tiết 7 ngày gần nhất<small>Từng thao tác của con, cho phân tích sâu; gói lớn hơn nhiều</small></span></label>';
    if (!kq) {
      noi += '<p class="gp-co">Đang tạo gói…</p>';
    } else {
      const g = kq.goi;
      const vuot = kq.token > BC.TOI_DA_TOKEN;
      noi += '<p class="gp-co' + (vuot ? ' gp-co-lon' : '') + '"><b>Khoảng ' + soDep(kq.token) + ' token</b> · ' + soDep(Math.round(kq.so_byte / 1024)) + ' KB · ' +
        g.ho_so.ky_nang.length + ' kỹ năng, ' + g.van_gan_day.length + ' ván gần nhất, ' + g.cau_sai_tieu_bieu.length + ' câu sai tiêu biểu' +
        (g.nhat_ky_7_ngay ? ', ' + soDep(g.nhat_ky_7_ngay.length) + ' sự kiện 7 ngày' : '') + '</p>' +
        '<p class="gp-mo gp-nho">Ước lượng thận trọng: 1 token cho mỗi 3 byte của tệp.' + (vuot ? ' Gói vượt 30 000 token: một số trợ lý AI có thể không nhận hết, hãy bỏ tùy chọn nhật ký chi tiết.' : kq.da_rut_gon ? ' Đã bớt bớt câu sai để gói dưới 30 000 token.' : ' Gói mặc định luôn dưới 30 000 token.') + '</p>' +
        '<div class="gp-nut-ds"><button type="button" class="gp-nut-chinh" data-hd="sao-chep">' + svg(IC.sao_chep) + 'Sao chép</button>' +
        '<button type="button" class="gp-nut-phu" data-hd="tai-json">' + svg(IC.tai) + 'Tải tệp .json</button></div>' +
        '<details class="gp-xem-truoc"><summary>Xem trước nội dung gói</summary><pre>' + esc(kq.chuoi.length > 6000 ? kq.chuoi.slice(0, 6000) + '\n…' : kq.chuoi) + '</pre></details>' +
        '<p class="gp-mo gp-nho">Gợi ý: dán gói vào trợ lý AI rồi hỏi “Con tôi cần luyện gì tuần tới?”. Trợ lý sẽ trả JSON theo hop_dong_dau_ra.</p>';
    }
    return h + the('gp-xuat', noi);
  }

  function saoChep(txt) {
    const cu = function () {
      const ta = document.createElement('textarea');
      ta.value = txt;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove();
      return ok;
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(txt).then(function () { return true; }, function () { return cu(); });
    }
    return Promise.resolve(cu());
  }
  function taiTep(txt, ten, loai) {
    const blob = new Blob([txt], { type: loai });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = ten;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  /* ---------------- Đổi cài đặt ---------------- */

  function doiCaiDat(truong, moi) {
    const p = S.be.hoSo;
    let cu;
    if (truong === 'tuoi') {
      cu = HS.tuoiHienTai(p);
      if (cu === moi) return;
      p.tuoi_khi_nhap = moi;
      p.ngay_nhap_tuoi = homNay();
      p.nam_sinh_uoc_tinh = new Date().getFullYear() - moi;
    } else if (truong === 'lop') {
      cu = p.lop;
      if (cu === moi) return;
      p.lop = moi; p.lop_nguon = 'phu_huynh'; p.nam_hoc_cua_lop = HS.namHocBatDau(new Date());
    } else if (truong === 'bai_dang_hoc') {
      cu = p.bai_dang_hoc;
      moi = Math.max(1, Math.min(75, moi));
      if (cu === moi) return;
      p.bai_dang_hoc = moi; p.bai_nguon = 'phu_huynh';
    } else if (truong === 'gioi_han_phut') {
      cu = p.gioi_han_phut == null ? null : p.gioi_han_phut;
      moi = HS.sachGioiHan(moi);
      if (cu === moi) return;
      p.gioi_han_phut = moi;
      // Bỏ giới hạn thì giờ cho thêm hôm nay cũng không còn ý nghĩa
      if (moi == null) p.them_hom_nay = null;
      ghi('phu_huynh_cai_dat', { truong: truong, cu: cu, moi: moi });
      ctx.hoSoDoi(p, true);
      S.cache = {};
      ve(false);
      return;
    } else if (truong === 'them_hom_nay') {
      // moi: số phút cho thêm tính từ bây giờ (bé chơi quá giờ vì được chơi nốt ván dở thì vẫn đủ số phút đó),
      // 'vo_han' (không giới hạn hôm nay), hoặc null (như mọi ngày)
      const nay = homNay();
      const truoc = p.them_hom_nay && p.them_hom_nay.ngay === nay ? p.them_hom_nay : null;
      cu = truoc ? (truoc.khong_gioi_han ? 'vo_han' : truoc.phut) : null;
      const goc = HS.sachGioiHan(p.gioi_han_phut);
      if (moi === 'vo_han') p.them_hom_nay = { ngay: nay, khong_gioi_han: true };
      else if (moi > 0 && goc) {
        const hieuLuc = goc + (truoc && !truoc.khong_gioi_han ? truoc.phut || 0 : 0);
        p.them_hom_nay = { ngay: nay, phut: Math.min(24 * 60, Math.max(hieuLuc, Math.ceil(phutHomNay())) + moi - goc) };
      } else p.them_hom_nay = null;
      const sau = p.them_hom_nay ? (p.them_hom_nay.khong_gioi_han ? 'vo_han' : p.them_hom_nay.phut) : null;
      if (cu === sau) return;
      ghi('phu_huynh_cai_dat', { truong: truong, cu: cu, moi: sau, ngay: nay });
      ctx.hoSoDoi(p, true);
      S.cache = {};
      ve(false);
      if (ctx.bao) ctx.bao(sau === 'vo_han' ? 'Hôm nay con chơi không giới hạn' : sau ? 'Con được chơi thêm ' + moi + ' phút từ bây giờ' : 'Hôm nay như mọi ngày');
      return;
    } else if (truong === 'mo_khoa_vung') {
      cu = !!p.mo_khoa_vung;
      if (cu === moi) return;
      p.mo_khoa_vung = moi;
    } else if (truong === 'ke_hoach_tuan') {
      const tomKh = function (k) { return k ? { tu: k.tu, den: k.den, so_muc: k.muc.length, man: k.muc.map(function (x) { return x.man; }) } : null; };
      cu = tomKh(p.ke_hoach_tuan);
      p.ke_hoach_tuan = moi;
      ghi('phu_huynh_cai_dat', { truong: truong, cu: cu, moi: tomKh(moi) });
      ctx.hoSoDoi(p);
      S.cache = {};
      ve(false);
      return;
    } else return;
    ghi('phu_huynh_cai_dat', { truong: truong, cu: cu, moi: moi });
    ctx.hoSoDoi(p);
    S.cache = {};
    veDau();
    ve(false);
  }

  function dungKeHoach() {
    const kh = keHoach();
    const chon = kh.muc.filter(function (m) { return !S.kh.bo[m.man]; });
    if (!chon.length) return;
    doiCaiDat('ke_hoach_tuan', { tu: kh.tu, den: kh.den, muc: chon.map(function (m) { return { loai: m.loai, man: m.man, ky_nang: m.ky_nang, ly_do: m.ly_do }; }) });
    ctx.bao('Đã lưu kế hoạch ' + BC.khoangTuan(kh.tu), 2.6);
  }

  /* ---------------- Hộp thoại xác nhận ---------------- */

  function hoiXoa() {
    const p = S.be.hoSo;
    const hop = $('gp-hop');
    hop.innerHTML = '<div class="gp-hop-the"><h2 id="gp-hop-td">Xóa dữ liệu của ' + esc(p.ten) + '?</h2>' +
      '<p>Mọi ván, câu, nhật ký thao tác, quả mọng và hồ sơ của ' + esc(p.ten) + ' trên máy này sẽ bị xóa hẳn. Việc này không hoàn tác được.</p>' +
      '<div class="gp-nut-ds"><button type="button" class="gp-nut-phu" data-hd="dong-hop">Thôi, giữ lại</button><button type="button" class="gp-nut-xoa gp-nut-xoa-dac" data-hd="xoa-that">Xóa hẳn</button></div></div>';
    hop.classList.remove('hidden');
    setTimeout(function () { const b = hop.querySelector('[data-hd="dong-hop"]'); if (b) b.focus(); }, 30);
  }
  function dongHopThoai() { const h = $('gp-hop'); if (h) { h.classList.add('hidden'); h.innerHTML = ''; } }
  function xoaThat() {
    const p = S.be.hoSo;
    dongHopThoai();
    NK.xoaBe(p.id).then(function () {
      ctx.beBiXoa(p.id);
      ctx.bao('Đã xóa dữ liệu của ' + p.ten);
      S.be = null; S.beId = null;
      const con = ctx.A.dsBe || [];
      if (con.length) { S.con = null; S.tab = 'tong_quan'; taiBe(con[0].id); }
      else ctx.thoat();
    });
  }

  /* ---------------- Điều hướng ---------------- */

  function moTab(tab) {
    S.con = null;
    // Vào Nhật ký từ thanh tab: bỏ bộ lọc cũ, xem ngày có chơi gần nhất
    if (tab === 'nhat_ky' && S.tab !== 'nhat_ky') S.nk = { ngay: null, caTuan: false, loc: { loai: 'tat_ca' } };
    if (S.tab !== tab) ghi('phu_huynh_mo', { man: tab });
    S.tab = tab;
    ve(true);
  }
  function dongCon() {
    if (!S.con) return;
    S.tab = S.con.tuTab || S.tab;
    S.con = null;
    ve(true);
  }
  function moNhatKyTuan(loc) {
    S.con = null;
    S.nk.caTuan = true;
    S.nk.loc = loc || { loai: 'tat_ca' };
    if (S.tab !== 'nhat_ky') ghi('phu_huynh_mo', { man: 'nhat_ky' });
    S.tab = 'nhat_ky';
    ve(true);
  }

  function bamVao(e) {
    const b = e.target.closest('[data-hd], [data-k]');
    if (!b || !dom.contains(b) || b.disabled) return;
    if (b.hasAttribute('data-k') && b.closest('#gp-ban-phim')) { congGo(b.getAttribute('data-k')); return; }
    const hd = b.getAttribute('data-hd');
    const A = function (k) { return b.getAttribute('data-' + k); };
    if (b.tagName === 'INPUT') return; // ô chọn: xử lý ở change
    switch (hd) {
      case 'thoat': ctx.thoat(); break;
      case 'quay': if (S.con) dongCon(); else ctx.thoat(); break;
      case 'tab': moTab(A('tab')); break;
      case 'doi-be': if (A('id') !== S.beId) { S.con = null; S.kn = null; S.kh = { bo: {} }; taiBe(A('id')).then(function () { ghi('phu_huynh_mo', { man: S.tab }); }); } break;
      case 'tuan': {
        const moi = window.HocTap.congNgay(S.tuan, 7 * (+A('buoc')));
        S.tuan = moi;
        S.nk.ngay = null;
        ve(false);
        break;
      }
      case 'den-tuan': S.tuan = A('tu'); S.nk.ngay = null; ve(false); break;
      case 'nk-tuan': moNhatKyTuan(A('loc') === 'sai' ? { loai: 'sai' } : null); break;
      case 'nk-ky': moNhatKyTuan({ loai: 'ky_nang', ma: A('ma') }); break;
      case 'nk-ngay': if (A('ngay')) { S.nk.ngay = A('ngay'); S.nk.caTuan = false; } else S.nk.caTuan = true; ve(false); break;
      case 'nk-loc': S.nk.loc = A('loai') === 'tat_ca' || A('loai') === 'sai' ? { loai: A('loai') } : { loai: A('loai'), ma: A('ma') }; ve(false); break;
      case 'xem-lai': moXemLai(A('cau'), A('van')); break;
      case 'cung-loi': S.tuan = A('tu') || S.tuan; moNhatKyTuan({ loai: 'loi', ma: A('ma') }); break;
      case 'kn':
        S.kn = A('ma');
        if (S.con || S.tab !== 'ky_nang') { S.con = null; if (S.tab !== 'ky_nang') ghi('phu_huynh_mo', { man: 'ky_nang' }); S.tab = 'ky_nang'; ve(true); }
        else {
          document.querySelectorAll('.gp-o-kn').forEach(function (o) { const on = o.getAttribute('data-ma') === S.kn; o.classList.toggle('gp-chon', on); o.setAttribute('aria-pressed', on); });
          $('gp-kn-ct').innerHTML = veChiTietNd();
          if (window.innerWidth < 900) $('gp-kn-ct').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        break;
      case 'cai': {
        const t = A('truong'), v = A('gt');
        doiCaiDat(t, v === '' ? null : Number(v));
        break;
      }
      case 'them-hom-nay': {
        const v = A('gt');
        doiCaiDat('them_hom_nay', v === '' ? null : v === 'vo_han' ? 'vo_han' : Number(v));
        break;
      }
      case 'dung-ke-hoach': dungKeHoach(); break;
      case 'bo-ke-hoach': doiCaiDat('ke_hoach_tuan', null); ctx.bao('Đã bỏ kế hoạch tuần'); break;
      case 'xuat-ai': moXuatAi(); break;
      case 'sao-chep':
        if (!S.xuat.kq) return;
        saoChep(S.xuat.kq.chuoi).then(function (ok) {
          ctx.bao(ok ? 'Đã sao chép gói (' + soDep(S.xuat.kq.token) + ' token). Dán vào trợ lý AI nhé.' : 'Máy không cho sao chép tự động. Hãy dùng nút Tải tệp .json.', 4);
          if (ok) ghi('phu_huynh_cai_dat', { truong: 'xuat_ai', cu: null, moi: { cach: 'sao_chep', token: S.xuat.kq.token, kem_nhat_ky: S.xuat.kem } });
        });
        break;
      case 'tai-json':
        if (!S.xuat.kq) return;
        taiTep(S.xuat.kq.chuoi, 'dao-khung-long-xuat-v1.json', 'application/json');
        ghi('phu_huynh_cai_dat', { truong: 'xuat_ai', cu: null, moi: { cach: 'tai_tep', token: S.xuat.kq.token, kem_nhat_ky: S.xuat.kem } });
        break;
      case 'tai-jsonl': {
        const p = S.be.hoSo;
        NK.xuatJsonl(p.id).then(function (txt) {
          taiTep(txt, 'dao-khung-long-nhat-ky-' + homNay() + '.jsonl', 'application/x-ndjson');
          ghi('phu_huynh_cai_dat', { truong: 'tai_nhat_ky', cu: null, moi: txt ? txt.split('\n').length - 1 : 0 });
        });
        break;
      }
      case 'tinh-lai': {
        const id = S.beId;
        b.disabled = true;
        ctx.tinhLai(id).then(function (r) {
          if (!r) return;
          ghi('phu_huynh_cai_dat', { truong: 'tinh_lai', cu: null, moi: { so_van: r.so_van, so_cau: r.so_cau, khop: r.khop } });
          ctx.bao('Đã tính lại ' + r.so_van + ' ván, ' + r.so_cau + ' câu từ ' + r.so_su_kien + ' sự kiện' + (r.khop ? '. Khớp với bản đang lưu.' : '. Đã cập nhật bản lưu.'), 4);
          return taiBe(id);
        });
        break;
      }
      case 'xoa-be': hoiXoa(); break;
      case 'dong-hop': dongHopThoai(); break;
      case 'xoa-that': xoaThat(); break;
      default: break;
    }
  }

  function doiO(e) {
    const el = e.target;
    const hd = el.getAttribute && el.getAttribute('data-hd');
    if (hd === 'kh-muc') {
      const man = el.getAttribute('data-man');
      if (el.checked) delete S.kh.bo[man]; else S.kh.bo[man] = true;
      ve(false);
    } else if (hd === 'mo-khoa') {
      doiCaiDat('mo_khoa_vung', !!el.checked);
    } else if (hd === 'kem-nk') {
      S.xuat.kem = !!el.checked;
      taoGoi();
    }
  }

  window.GocPhuHuynh = {
    mo: mo,
    _trangThai: function () { return { S: S, cong: CONG }; },
    /** Dùng cho kiểm thử tự động: vào thẳng sau cổng, rồi điều khiển các màn như khi chạm. */
    _quaCong: function () { if (CONG.hoi) { CONG.nhap = String(CONG.hoi.a * CONG.hoi.b); congGo('xong'); } },
    _dieuKhien: {
      congGo: congGo,
      moTab: moTab,
      moXemLai: moXemLai,
      moXuatAi: moXuatAi,
      dongCon: dongCon,
      doiCaiDat: doiCaiDat,
      dungKeHoach: dungKeHoach,
      nhatKy: function (loc, ngay) { S.tab = 'nhat_ky'; S.con = null; S.nk.loc = loc || { loai: 'tat_ca' }; if (ngay) { S.nk.ngay = ngay; S.nk.caTuan = false; } else S.nk.caTuan = true; ve(true); },
      kyNang: function (ma) { S.tab = 'ky_nang'; S.con = null; S.kn = ma; ve(true); },
      tuan: function (tu) { S.tuan = BC.dauTuan(tu); S.nk.ngay = null; ve(false); }
    }
  };
})();
