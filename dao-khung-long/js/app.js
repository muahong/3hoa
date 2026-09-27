/* ============================================================
   app.js – Điều phối các màn của Đảo Khủng Long
   Con là ai → tạo hồ sơ (tên, tuổi, lớp) → chọn trứng → bản đồ + nhiệm vụ hôm nay → trang vùng
   → (bài học 30 giây lần đầu gặp nội dung mới) → Đua Xe, Lật Thẻ Anh Em, Xếp Hình Số hoặc Truyện Tranh
   → kết thúc màn (sao, quả mọng, cảm xúc) → ăn mừng (trứng nở, lớn lên, trứng vùng nở).
   Sau mỗi ván: tóm tắt câu, tóm tắt ván, hồ sơ học tập (tính từ nhật ký), thưởng, nhiệm vụ, mức lớn.
   ============================================================ */
(function () {
  'use strict';

  const PHIEN_BAN = '2.0.0';
  const ANH = 'assets/img/';
  const LAN = ['lan_trai', 'lan_giua', 'lan_phai'];
  /** Khu vực chơi của từng thể loại trong khung chơi chung. */
  const SAN_GAME = { 'lat-the': 'lt-san', 'xep-hinh-so': 'xh-san', 'truyen-tranh': 'tt-san' };
  const NK = window.NhatKy, NH = window.NganHang, HT = window.HocTap, DAO = window.Dao, HS = window.HoSo, AT = window.AmThanh, PH = window.PhanHoi;

  const A = {
    dsBe: [], hoSo: null, hocTap: null, cauDs: [], vanDs: [],
    anh: {}, man: null, vungDangXem: null, tao: null, hangMung: [], ketThuc: null, manVuaChoi: null
  };

  /* ---------------- Tiện ích ---------------- */

  function $(id) { return document.getElementById(id); }
  function esc(s) { return PH.esc(s); }
  function soDep(n) { return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function homNay() { return NK.ngayDiaPhuong(Date.now()); }
  function hinh(ten) { return ANH + ten + '.webp'; }
  function taiAnh(ten) {
    if (A.anh[ten]) return A.anh[ten];
    const im = new Image();
    im.decoding = 'async';
    im.src = hinh(ten);
    A.anh[ten] = im;
    return im;
  }
  function choAnh(ten) {
    const im = taiAnh(ten);
    if (im.complete && im.naturalWidth) return Promise.resolve(im);
    return new Promise(function (ok) { im.onload = function () { ok(im); }; im.onerror = function () { ok(im); }; setTimeout(function () { ok(im); }, 4000); });
  }
  function hien(id) {
    document.querySelectorAll('.man').forEach(function (el) { el.classList.toggle('hidden', el.id !== id); });
    A.man = id;
    window.scrollTo(0, 0);
  }
  let hengioBao = null;
  function bao(chu, giay) {
    const el = $('thong-bao');
    el.textContent = chu;
    el.classList.remove('hidden');
    clearTimeout(hengioBao);
    hengioBao = setTimeout(function () { el.classList.add('hidden'); }, (giay || 2.6) * 1000);
  }
  function hinhKhungLong(p, loai) {
    const bo = DAO.HINH[(p && p.phong_cach) || 'dung_manh'];
    return bo[loai || (p && p.khung_long && p.khung_long.muc) || 'trung'];
  }
  function tenKhungLong(p) { return (p && p.khung_long && p.khung_long.ten) || DAO.HINH[(p && p.phong_cach) || 'dung_manh'].ten; }
  /** Biểu tượng của một màn: hình thể loại, riêng Đua Xe là xe của bé. */
  function hinhMan(m, p) { return DAO.HINH_GAME[m.game] ? hinh(DAO.HINH_GAME[m.game]) : hinh(hinhKhungLong(p, 'xe')); }
  function kho() { return NK.kho; }

  /* ---------------- Khởi động ---------------- */

  function khoiDong() {
    window.addEventListener('error', function (e) { console.error('Lỗi:', e && e.message); });
    window.addEventListener('unhandledrejection', function (e) { console.error('Lỗi hứa:', e && e.reason); });
    document.addEventListener('pointerdown', function () { NK.cham(); AT.mo(); }, { passive: true });
    ganSuKien();
    ['bg-race-track', 'bg-island-map', 'berry', 'the-lung', 'ic-truyen-tranh', 'ic-lat-the', 'ic-xep-hinh'].forEach(taiAnh);
    NK.khoiDong({ phienBanApp: PHIEN_BAN }).then(function () {
      return tomTatVanDo();
    }).then(function () {
      return HS.taiDanhSach();
    }).then(function (ds) {
      A.dsBe = ds;
      const dang = HS.beDangChoi();
      if (dang && !HS.canHoiLaiBe() && ds.some(function (p) { return p.id === dang.id; })) return chonBe(dang.id);
      moChonBe();
    }).catch(function (e) {
      console.error(e);
      moChonBe();
    });
    if ('serviceWorker' in navigator && /^https:|^http:\/\/(localhost|127\.)/.test(location.href)) {
      navigator.serviceWorker.register('sw.js').catch(function () { /* bỏ qua */ });
    }
  }

  function tenManNgan(m) { return m ? (m.cup ? m.ten : 'màn ' + m.so + ' (' + m.ten.toLowerCase() + ')') : null; }

  /** Ván bỏ dở vì app bị tắt ngang: tóm tắt từ nhật ký gốc, và bỏ hồ sơ học tập cũ để tính lại. */
  function tomTatVanDo() {
    const ds = NK.layVanDongDo();
    return ds.reduce(function (p, x) {
      return p.then(function () { return NK.docVan(x.van); }).then(function (evs) {
        const vanT = HT.tomTatVan(evs, tenManNgan(DAO.man(x.man)));
        return Promise.all([
          kho().datNhieu('tom_tat_cau', HT.tomTatCacCau(evs)),
          vanT ? kho().dat('tom_tat_van', vanT) : null,
          kho().xoa('ho_so_hoc_tap', x.be)
        ]);
      });
    }, Promise.resolve()).catch(function (e) { console.error(e); });
  }

  /* ---------------- 1. Con là ai ---------------- */

  function moChonBe() {
    NK.datBe(null);
    const luoi = $('cb-luoi');
    let h = '';
    A.dsBe.forEach(function (p) {
      const muc = p.khung_long && p.khung_long.muc;
      h += '<button class="the-be" type="button" data-id="' + esc(p.id) + '">' +
        '<span class="the-be-anh ' + (p.phong_cach === 'de_thuong' ? 'hong' : 'xanh') + '"><img src="' + hinh(hinhKhungLong(p)) + '" alt="" class="' + (muc === 'trung' || muc === 'lay_dong' ? 'lac' : '') + '"></span>' +
        '<b>' + esc(p.ten) + '</b><small>' + HS.tuoiHienTai(p) + ' tuổi · lớp ' + p.lop + '</small>' +
        '<span class="the-be-qua"><img src="' + hinh('berry') + '" alt="">' + soDep(p.khung_long && p.khung_long.qua_mong) + '</span></button>';
    });
    if (A.dsBe.length < HS.TOI_DA_BE) h += '<button class="the-be the-them" type="button" id="cb-them"><span class="the-be-anh them">+</span><b>Thêm bạn</b><small>Tạo hồ sơ mới</small></button>';
    luoi.innerHTML = h;
    $('cb-tieu-de').textContent = A.dsBe.length ? 'Con là ai?' : 'Chào mừng con đến Đảo Khủng Long!';
    $('cb-phu-de').textContent = A.dsBe.length ? 'Chạm vào tên của con để lên đảo' : 'Chạm “Thêm bạn” để có quả trứng khủng long đầu tiên';
    $('cb-bo-me').classList.toggle('hidden', !A.dsBe.length);
    hien('man-chon-be');
  }

  function chonBe(id) {
    return HS.lay(id).then(function (p) {
      if (!p) { moChonBe(); return; }
      A.hoSo = p;
      HS.datBeDangChoi(id);
      NK.datBe(id);
      return taiHocTap().then(function () {
        if (HS.canHoiLenLop(p)) moLenLop(); else vaoDao();
      });
    });
  }

  function taiHocTap() {
    const be = A.hoSo.id;
    return Promise.all([kho().theoBe('tom_tat_cau', be), kho().theoBe('tom_tat_van', be), kho().lay('ho_so_hoc_tap', be)]).then(function (r) {
      A.cauDs = r[0].sort(function (a, b) { return a.luc < b.luc ? -1 : 1; });
      A.vanDs = r[1].sort(function (a, b) { return a.luc < b.luc ? -1 : 1; });
      A.hocTap = r[2] || HT.hoSoHocTap(be, A.cauDs, A.vanDs, homNay());
    });
  }

  /* ---------------- 2. Tạo hồ sơ ---------------- */

  function moTaoHoSo() {
    A.tao = { buoc: 1, ten: '', tuoi: null, lop: null, lopGoiY: null, phong_cach: null };
    $('th-ten').value = '';
    const goiY = HS.tenGoiY().filter(function (t) { return !A.dsBe.some(function (p) { return p.ten === t; }); });
    $('th-goi-y-ten').innerHTML = goiY.map(function (t) { return '<button type="button" class="chip-ten">' + esc(t) + '</button>'; }).join('');
    let h = '';
    for (let t = 5; t <= 11; t++) h += '<button type="button" class="nut-tuoi" data-tuoi="' + t + '">' + t + '</button>';
    $('th-tuoi').innerHTML = h;
    hienBuocTao();
    hien('man-tao-ho-so');
    setTimeout(function () { try { $('th-ten').focus(); } catch (e) { /* bỏ qua */ } }, 80);
  }

  function hienBuocTao() {
    const t = A.tao;
    ['ten', 'tuoi', 'lop'].forEach(function (k, i) { $('th-phan-' + k).classList.toggle('hidden', t.buoc !== i + 1); });
    document.querySelectorAll('#th-buoc li').forEach(function (li) {
      const b = +li.getAttribute('data-b');
      li.className = b < t.buoc ? 'xong' : b === t.buoc ? 'dang' : '';
    });
    const loi = $('th-loi');
    if (t.buoc === 1) loi.textContent = 'Chào con! Con tên là gì nhỉ?';
    else if (t.buoc === 2) loi.textContent = 'Chào ' + t.ten + '! Con mấy tuổi rồi nhỉ?';
    else loi.textContent = 'Con học lớp mấy rồi?';
    if (t.buoc === 3) veChonLop();
    const nut = $('th-tiep');
    if (t.buoc === 1) { nut.textContent = 'Tiếp'; nut.disabled = !HS.sachTen($('th-ten').value); }
    else if (t.buoc === 2) { nut.textContent = 'Tiếp'; nut.disabled = !t.tuoi; }
    else { nut.textContent = 'Tiếp tục: chọn trứng'; nut.disabled = !t.lop; }
    document.querySelectorAll('#th-tuoi .nut-tuoi').forEach(function (b) { b.classList.toggle('chon', +b.getAttribute('data-tuoi') === t.tuoi); });
  }

  function veChonLop() {
    const t = A.tao;
    const g = HS.goiYLop(t.tuoi, new Date());
    t.lopGoiY = g.lop;
    if (!t.lop) t.lop = g.lop;
    $('th-hoi-lop').textContent = 'Con đang học lớp ' + g.lop + ' phải không?';
    $('th-lop-phu').textContent = 'Tính từ ' + t.tuoi + ' tuổi và năm học ' + g.nam_hoc_bat_dau + ' đến ' + (g.nam_hoc_bat_dau + 1);
    const ds = [];
    for (let l = Math.max(1, g.lop - 1); l <= Math.min(5, g.lop + 1); l++) ds.push(l);
    $('th-lop').innerHTML = ds.map(function (l) { return '<button type="button" class="nut-lop' + (l === t.lop ? ' chon' : '') + '" data-lop="' + l + '">Lớp ' + l + '</button>'; }).join('');
  }

  function tiepTao() {
    const t = A.tao;
    if (t.buoc === 1) {
      const ten = HS.sachTen($('th-ten').value);
      if (!ten) return;
      t.ten = ten;
      t.buoc = 2;
    } else if (t.buoc === 2) {
      if (!t.tuoi) return;
      t.buoc = 3;
      t.lop = null;
    } else {
      if (!t.lop) return;
      moChonTrung();
      return;
    }
    AT.bat('cham');
    hienBuocTao();
  }

  /* ---------------- 3. Chọn trứng ---------------- */

  function moChonTrung() {
    A.tao.phong_cach = null;
    $('ct-tieu-de').textContent = 'Chọn quả trứng của ' + A.tao.ten;
    document.querySelectorAll('.ct-trung').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); b.classList.remove('chon'); });
    $('ct-ap').disabled = true;
    hien('man-chon-trung');
  }

  function apTrung() {
    const t = A.tao;
    if (!t || !t.phong_cach) return;
    $('ct-ap').disabled = true;
    HS.taoMoi({ ten: t.ten, tuoi: t.tuoi, lop: t.lop, lop_nguon: t.lop === t.lopGoiY ? 'goi_y_tu_tuoi_da_xac_nhan' : 'tu_chon', phong_cach: t.phong_cach }).then(function (p) {
      A.dsBe.push(p);
      A.hoSo = p;
      A.cauDs = []; A.vanDs = [];
      A.hocTap = HT.hoSoHocTap(p.id, [], [], homNay());
      HS.datBeDangChoi(p.id);
      NK.datBe(p.id, 'tao_ho_so');
      NK.ghi('ho_so_doi', { truong: 'tao_ho_so', moi: { tuoi_khi_nhap: p.tuoi_khi_nhap, lop: p.lop, lop_nguon: p.lop_nguon, bai_dang_hoc: p.bai_dang_hoc, phong_cach: p.phong_cach } }, { game: 'trang-chu' });
      AT.bat('no_trung');
      vaoDao('Trứng của con sẽ nở khi con chơi xong ván đầu tiên!');
    }).catch(function (e) {
      bao(e && e.message ? e.message : 'Chưa tạo được hồ sơ');
      $('ct-ap').disabled = false;
    });
  }

  /* ---------------- 10. Lên lớp mỗi năm học ---------------- */

  function moLenLop() {
    const p = A.hoSo;
    const moi = Math.min(5, p.lop + 1);
    $('ll-hinh').src = hinh(hinhKhungLong(p));
    $('ll-hoi').textContent = 'Năm nay ' + p.ten + ' lên lớp ' + moi + ' rồi phải không?';
    const ds = [p.lop, moi].filter(function (x, i, a) { return a.indexOf(x) === i; });
    $('ll-lop').innerHTML = ds.map(function (l) { return '<button type="button" class="nut-lop' + (l === moi ? ' chon' : '') + '" data-lop="' + l + '">Lớp ' + l + '</button>'; }).join('');
    hien('man-len-lop');
  }

  function chotLenLop(lop) {
    const p = A.hoSo;
    const cu = p.lop;
    p.lop = lop;
    p.lop_nguon = 'hoi_dau_nam_hoc';
    p.nam_hoc_cua_lop = HS.namHocBatDau(new Date());
    p.bai_dang_hoc = DAO.uocLuongBai(new Date());
    p.bai_nguon = 'uoc_luong_theo_ngay';
    NK.ghi('ho_so_doi', { truong: 'lop', cu: cu, moi: lop, nguon: 'hoi_dau_nam_hoc' }, { game: 'trang-chu' });
    HS.luu(p).then(function () { vaoDao(); });
  }

  /* ---------------- 4. Bản đồ và nhiệm vụ ---------------- */

  function nhiemVuHomNay() {
    const p = A.hoSo;
    const nay = homNay();
    if (!p.nhiem_vu || p.nhiem_vu.ngay !== nay) {
      p.nhiem_vu = { ngay: nay, ds: DAO.lapNhiemVu(p, A.hocTap, nay, DAO.lichSuTheLoai(A.cauDs)), thuong: false };
      HS.luu(p);
    }
    return p.nhiem_vu;
  }

  function vaoDao(loiChao) {
    const p = A.hoSo;
    if (!p) { moChonBe(); return; }
    veBanDo(loiChao);
    hien('man-ban-do');
  }

  function veBanDo(loiChao) {
    const p = A.hoSo;
    // Chip bé
    $('bd-chip-hinh').src = hinh(hinhKhungLong(p));
    $('bd-chip-ten').textContent = p.ten;
    $('bd-chip-qua').textContent = soDep(p.khung_long.qua_mong);
    // Nhiệm vụ
    const nv = nhiemVuHomNay();
    const nvVung = {};
    nv.ds.forEach(function (x) { if (!x.xong) { const m = DAO.man(x.man); if (m) nvVung[m.vung] = true; } });
    // Điểm các vùng
    let h = '';
    DAO.VUNG.forEach(function (v) {
      const tt = DAO.trangThaiVung(v, p);
      const lop = ['bd-vung'];
      if (!tt.mo) lop.push('khoa');
      else if (tt.sap_co) lop.push('sap-co');
      if (nvVung[v.so]) lop.push('co-nv');
      if (v.vi_tri[0] > 0.55) lop.push('nhan-trai');
      const sao = saoVung(v);
      let trong = '';
      if (!tt.mo) trong = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 10V7.5a4.5 4.5 0 0 1 9 0V10" stroke="currentColor" stroke-width="2.6" fill="none"/><rect x="4.5" y="10" width="15" height="11" rx="3" fill="currentColor"/></svg>';
      else trong = v.dau_truong ? '★' : String(v.so);
      const saoHtml = tt.mo && !tt.sap_co ? '<span class="bd-sao">' + [0, 1, 2].map(function (i) { return '<i class="' + (i < sao ? 'co' : '') + '">★</i>'; }).join('') + '</span>' : '';
      const phu = !tt.mo ? (tt.ly_do === 'hoc_ky_2' ? 'Học kì 2' : 'Chưa mở') : tt.sap_co ? 'Sắp có' : '';
      h += '<button type="button" class="' + lop.join(' ') + '" data-vung="' + v.so + '" style="left:' + (v.vi_tri[0] * 100) + '%;top:' + (v.vi_tri[1] * 100) + '%;--mau:' + v.mau + '" aria-label="' + esc(v.ten + (phu ? ', ' + phu : '')) + '">' +
        saoHtml + '<span class="bd-tron">' + trong + '</span><span class="bd-nhan">' + esc(v.ten) + (phu ? '<small>' + esc(phu) + '</small>' : '') + '</span></button>';
    });
    $('bd-diem').innerHTML = h;
    // Khủng long của bé đứng cạnh vùng vừa chơi
    const vanCuoi = A.vanDs[A.vanDs.length - 1];
    const vgan = DAO.vung((vanCuoi && vanCuoi.vung) || (nv.ds[0] && DAO.man(nv.ds[0].man) ? DAO.man(nv.ds[0].man).vung : 2)) || DAO.vung(2);
    const ban = $('bd-ban');
    const nho = p.khung_long.muc === 'trung' || p.khung_long.muc === 'lay_dong' || p.khung_long.muc === 'so_sinh';
    ban.style.left = (vgan.vi_tri[0] * 100 + 3.2) + '%';
    ban.style.top = (vgan.vi_tri[1] * 100) + '%';
    ban.classList.toggle('duoi', vgan.vi_tri[1] < 0.3);
    ban.classList.toggle('nho', nho);
    $('bd-ban-hinh').src = hinh(hinhKhungLong(p));
    $('bd-ban-hinh').className = p.khung_long.muc === 'trung' || p.khung_long.muc === 'lay_dong' ? 'lac' : '';
    $('bd-ban-noi').textContent = loiChao || (p.khung_long.muc === 'trung' ? 'Ấp trứng nào!' : 'Đi nào!');
    ban.classList.toggle('dai', !!loiChao);
    veNhiemVu(nv);
    $('bd-am').textContent = 'Âm thanh: ' + (AT.co.tieng ? 'Bật' : 'Tắt');
    // Mẹo thêm vào màn hình chính (iPad, iPhone chưa cài)
    let tat = false;
    try { tat = window.localStorage.getItem('dkl-meo-mh-v1') === '1'; } catch (e) { tat = false; }
    const tb = NK.thietBi();
    $('bd-meo').classList.toggle('hidden', tat || tb.man_hinh_chinh || !(tb.loai === 'ipad' || tb.loai === 'iphone'));
  }

  function saoVung(v) {
    const kl = A.hoSo.ky_luc || {};
    const ds = v.man.filter(DAO.choiDuoc);
    if (!ds.length) return 0;
    let tong = 0;
    ds.forEach(function (m) { tong += (kl[m.id] && kl[m.id].sao) || 0; });
    return Math.round(tong / ds.length);
  }

  function veNhiemVu(nv) {
    const xong = nv.ds.filter(function (x) { return x.xong; }).length;
    $('nv-phu').textContent = nv.ds.length ? 'Xong ' + xong + '/' + nv.ds.length + ' · khoảng ' + Math.max(5, nv.ds.length * 5) + ' phút' : 'Hôm nay chưa có nhiệm vụ';
    $('nv-thanh').style.width = (nv.ds.length ? xong / nv.ds.length * 100 : 0) + '%';
    const LOAI = { on_cach_quang: 'on', luyen_lai: 'luyen', hoc_moi: 'moi' };
    $('nv-ds').innerHTML = nv.ds.map(function (x, i) {
      const m = DAO.man(x.man);
      const v = DAO.vung(m.vung);
      const uoc = x.so_cau * 3;
      return '<button type="button" class="nv-the ' + LOAI[x.loai] + (x.xong ? ' xong' : '') + '" data-i="' + i + '">' +
        '<small>' + esc(DAO.NHIEM_VU_TEN[x.loai]).toUpperCase() + '</small>' +
        '<b>' + esc(m.ten) + '</b>' +
        '<span class="nv-noi">' + esc(DAO.TEN_GAME[m.game]) + ' · Vùng ' + v.so + '</span>' +
        (x.ly_do ? '<span class="nv-ly-do">' + esc(x.ly_do) + '</span>' : '') +
        '<span class="nv-qua"><img src="' + hinh('berry') + '" alt="">' + (x.xong ? 'Đã xong' : 'khoảng +' + uoc) + '</span>' +
        (x.xong ? '<span class="nv-dau" aria-hidden="true">✓</span>' : '<img class="nv-xe" src="' + hinhMan(m, A.hoSo) + '" alt="">') +
        '</button>';
    }).join('');
    const ke = nv.ds.findIndex(function (x) { return !x.xong; });
    const nut = $('nv-choi');
    nut.classList.toggle('hidden', ke < 0);
    nut.textContent = 'Chơi nhiệm vụ ' + (ke + 1);
    nut.setAttribute('data-i', ke);
  }

  function choiNhiemVu(i) {
    const nv = nhiemVuHomNay();
    const x = nv.ds[i];
    if (!x) return;
    batDauMan(x.man, x.loai, { loai: x.loai, stt: i + 1 }, x.so_cau);
  }

  /* ---------------- 5. Trang vùng ---------------- */

  function moVung(so) {
    const v = DAO.vung(so);
    const p = A.hoSo;
    const tt = DAO.trangThaiVung(v, p);
    if (!tt.mo) { bao(tt.ly_do === 'hoc_ky_2' ? 'Vùng này mở ở học kì 2. Bố mẹ mở sớm được trong Góc phụ huynh.' : 'Vùng này dành cho lớp 2 nhé!'); return; }
    if (tt.sap_co) { bao(v.dau_truong ? v.ten + ' sẽ mở ở giai đoạn sau.' : v.ten + ': các trò chơi của vùng này đang được làm.'); return; }
    A.vungDangXem = so;
    $('vg-nen').style.backgroundImage = 'url(' + hinh(v.nen) + ')';
    $('vg-nen').style.setProperty('--phu', v.phu || 'rgba(40,20,90,.55)');
    $('vg-ten').textContent = 'Vùng ' + v.so + ' · ' + v.ten;
    $('vg-phu').textContent = 'SGK ' + v.chu_de + ' · Bài ' + v.bai[0] + ' đến ' + v.bai[1] + ' · Học kì ' + v.hoc_ky;
    const bang = HT.bangMuc(A.hocTap);
    const kyVung = DAO.kyNangCuaVung(v);
    const thuoc = kyVung.filter(function (k) { return bang[k] && (bang[k].muc === 'da_thuoc' || bang[k].muc === 'vung_chac'); }).length;
    const daNo = p.trung_vung && p.trung_vung[v.so] && p.trung_vung[v.so].no;
    $('vg-trung-ten').textContent = (daNo ? '' : 'Trứng ') + v.ten_loai + (daNo && p.trung_vung[v.so].ten ? ' · ' + p.trung_vung[v.so].ten : '');
    $('vg-trung-hinh').src = hinh(daNo ? v.loai : hinhKhungLong(p, 'trung'));
    $('vg-trung-hinh').className = 'vg-trung-hinh' + (daNo ? ' da-no' : '');
    $('vg-trung-hinh').style.filter = daNo ? '' : 'hue-rotate(' + ({ 1: 190, 2: 150, 4: 95, 7: 290, 8: 20 }[v.so] || 40) + 'deg) saturate(1.1)';
    $('vg-loai-hinh').src = hinh(v.loai);
    $('vg-loai-hinh').classList.toggle('hidden', !!daNo);
    const chuVi = 2 * Math.PI * 96;
    $('vg-vong-mau').style.strokeDasharray = (kyVung.length ? thuoc / kyVung.length : 0) * chuVi + ' ' + chuVi;
    $('vg-vong-mau').style.strokeOpacity = thuoc ? 1 : 0;
    $('vg-trung-so').textContent = thuoc + '/' + kyVung.length + ' kỹ năng đã thuộc';
    $('vg-trung-phu').textContent = daNo ? 'Trứng đã nở! Nhận được: ' + (v.phu_kien || 'bạn mới') : 'Thuộc cả ' + kyVung.length + ' thì trứng nở';
    $('vg-chu-giai').innerHTML = HT.MUC.map(function (m) { return '<span><i class="muc-' + m + '"></i>' + HT.TEN_MUC[m] + '</span>'; }).join('') + '<span><i class="muc-can-giup"></i>Cần giúp</span>';
    const kl = p.ky_luc || {};
    const cup = DAO.cupMo(v, p);
    $('vg-ds').innerHTML = v.man.map(function (m) {
      const choi = DAO.choiDuoc(m);
      const k = m.ky_nang_chinh ? bang[m.ky_nang_chinh] : null;
      const khoa = m.cup && !cup;
      let chip = '';
      if (!choi) chip = '<span class="chip-muc sap">Sắp có: ' + esc(DAO.TEN_GAME[m.game] || m.game) + '</span>';
      else if (khoa) chip = '<span class="chip-muc khoa">Mở khi xong các màn trên</span>';
      else if (m.cup) chip = kl[m.id] ? '<span class="chip-muc muc-da_thuoc">Đã chơi</span>' : '<span class="chip-muc muc-chua_hoc">Chưa chơi</span>';
      else if (m.luyen_tap) chip = kl[m.id] ? '<span class="chip-muc muc-da_thuoc">Đã chơi</span>' : '<span class="chip-muc muc-chua_hoc">Luyện tập</span>';
      else chip = '<span class="chip-muc muc-' + (k ? k.muc : 'chua_hoc') + '">' + HT.TEN_MUC[k ? k.muc : 'chua_hoc'] + '</span>';
      if (k && k.can_giup && k.loi_hay_gap && k.loi_hay_gap[0] && NH.LOI[k.loi_hay_gap[0].ma]) chip += '<span class="chip-muc can-giup">' + esc(NH.LOI[k.loi_hay_gap[0].ma].ngan.replace(/^Con /, '')) + '</span>';
      const sao = kl[m.id] ? kl[m.id].sao : 0;
      return '<button type="button" class="vg-man' + (!choi || khoa ? ' tat' : '') + (m.cup ? ' cup' : '') + '" data-man="' + m.id + '"' + (!choi || khoa ? ' aria-disabled="true"' : '') + '>' +
        '<span class="vg-man-icon">' + (m.cup ? '🏆' : '<img src="' + (choi ? hinhMan(m, p) : hinh('berry')) + '" alt="">') + '</span>' +
        '<span class="vg-man-chu"><b>' + (m.cup ? '' : 'Màn ' + m.so + ' · ') + esc(m.ten) + '</b><small>' + esc(m.bai) + ' · ' + esc(DAO.TEN_GAME[m.game] || m.game) + '</small></span>' +
        '<span class="vg-man-phai">' + chip + (choi && !khoa ? '<span class="vg-sao">' + [0, 1, 2].map(function (i) { return '<i class="' + (i < sao ? 'co' : '') + '">★</i>'; }).join('') + '</span>' : '') + '</span>' +
        '</button>';
    }).join('');
    hien('man-vung');
  }

  /* ---------------- 6. Chơi một màn ---------------- */

  /** Mã bài học 30 giây cần xem trước màn này (lần đầu gặp nội dung mới), hoặc null. */
  function baiHocCuaMan(m) {
    const kn = m.ky_nang_chinh || (m.cau[0] && m.cau[0].ky_nang);
    const ma = kn && NH.KY_NANG[kn] && NH.KY_NANG[kn].bai_hoc;
    return ma && window.BaiHoc && window.BaiHoc.coBai(ma) ? ma : null;
  }
  function canXemBaiHoc(m) {
    const ma = baiHocCuaMan(m);
    if (!ma || (A.hoSo.bai_hoc_da_xem || {})[ma]) return null;
    const kn = m.ky_nang_chinh || m.cau[0].ky_nang;
    const k = HT.bangMuc(A.hocTap)[kn];
    return k && k.so_cau >= 10 ? null : ma;
  }

  /** Mở bài học; xong(duLieu) được gọi khi bé bấm nút cuối hoặc Bỏ qua. */
  function moBaiHoc(ma, m, chuKetThuc, xong) {
    const p = A.hoSo;
    hien('man-bai-hoc');
    window.BaiHoc.mo(ma, {
      hinhGoiY: hinh(hinhKhungLong(p, 'goi_y')),
      nguCanh: { game: m.game, vung: m.vung, man: m.id },
      chuKetThuc: chuKetThuc,
      onXong: function (du) {
        p.bai_hoc_da_xem = p.bai_hoc_da_xem || {};
        if (!p.bai_hoc_da_xem[ma]) p.bai_hoc_da_xem[ma] = homNay();
        HS.luu(p);
        xong(du);
      }
    });
  }

  function batDauMan(manId, nguon, nhiemVu, soCau) {
    const m = DAO.man(manId);
    if (!m || !DAO.choiDuoc(m)) return;
    const ma = canXemBaiHoc(m);
    if (ma) { moBaiHoc(ma, m, 'Bắt đầu chơi', function () { vaoMan(m, nguon, nhiemVu, soCau); }); return; }
    vaoMan(m, nguon, nhiemVu, soCau);
  }

  function vaoMan(m, nguon, nhiemVu, soCau) {
    const p = A.hoSo;
    const manId = m.id;
    const bang = HT.bangMuc(A.hocTap);
    const mucKy = {};
    Object.keys(bang).forEach(function (k) { mucKy[k] = bang[k].muc; });
    const kyCuaMan = m.cau.map(function (x) { return x.ky_nang; });
    const cauNo = ((A.hocTap && A.hocTap.cau_no) || []).filter(function (c) { return kyCuaMan.indexOf(c.ky_nang) >= 0; });
    const lanGap = {};
    A.cauDs.forEach(function (c) { if (c.ma_cau) lanGap[c.ma_cau] = (lanGap[c.ma_cau] || 0) + 1; });
    const kc = m.ky_nang_chinh && bang[m.ky_nang_chinh];
    const heSo = !kc || kc.muc === 'chua_hoc' || kc.muc === 'lam_quen' ? 1.25 : 1;
    const van = new window.VanChoi({
      nk: NK, game: m.game, vung: m.vung, man: m, nguon: nguon || 'tu_chon', nhiemVu: nhiemVu || null,
      mucKy: mucKy, cauNo: nguon === 'luyen_lai' ? cauNo : cauNo.slice(0, 2), lanGap: lanGap, viTri: m.game === 'dua-xe' ? LAN : [], soCau: soCau || m.so_cau
    });
    A.manVuaChoi = { id: manId, nguon: nguon, nhiemVu: nhiemVu, soCau: soCau };
    const goiY = hinhKhungLong(p, 'goi_y');
    const onXong = function (kq) { sauVan(m, kq, false); };
    const onThoat = function (kq) { sauVan(m, kq, true); };

    if (m.game === 'dua-xe') {
      const xe = hinhKhungLong(p, 'xe');
      hien('man-dua-xe');
      Promise.all([choAnh(xe), choAnh('bg-race-track'), choAnh(goiY)]).then(function (anh) {
        window.DuaXe.batDau({
          van: van, man: m, hinhXe: anh[0], nen: anh[1], hinhGoiY: hinh(goiY), tenBe: p.ten,
          kyLuc: p.ky_luc && p.ky_luc[manId] ? { giay: p.ky_luc[manId].giay, moc: p.ky_luc[manId].moc } : null,
          heSoDau: heSo, onXong: onXong, onThoat: onThoat
        });
      });
      return;
    }

    const v = DAO.vung(m.vung);
    const ma = baiHocCuaMan(m);
    const muc = p.khung_long.muc;
    const chung = {
      van: van, man: m, nen: hinh(v.nen), phu: v.phu, hinhGoiY: hinh(goiY), tenBe: p.ten,
      hinhBe: hinh(hinhKhungLong(p, muc === 'trung' || muc === 'lay_dong' ? 'so_sinh' : muc)),
      hinhThe: hinh('the-lung'), anh: hinh,
      xemBaiHoc: ma ? function (xong) { moBaiHoc(ma, m, 'Chơi tiếp', function () { hien('man-choi'); xong(); }); } : null,
      onXong: onXong, onThoat: onThoat
    };
    document.querySelectorAll('#man-choi .kc-game').forEach(function (el) { el.classList.toggle('hidden', el.id !== SAN_GAME[m.game]); });
    hien('man-choi');
    const game = { 'lat-the': window.LatThe, 'xep-hinh-so': window.XepHinhSo, 'truyen-tranh': window.TruyenTranh }[m.game];
    Promise.all([choAnh(v.nen), choAnh(goiY), choAnh('the-lung')]).then(function () { game.batDau(chung); });
  }

  /* ---------------- Sau mỗi ván: tóm tắt, thưởng, lớn lên ---------------- */

  function sauVan(m, kq, boDo) {
    const p = A.hoSo;
    const be = p.id;
    const nay = homNay();
    const evs = kq.suKien || [];
    const tenMan = tenManNgan(m);
    const cauMoi = HT.tomTatCacCau(evs);
    const vanT = HT.tomTatVan(evs, tenMan);
    const theoMa = {};
    A.cauDs.forEach(function (c, i) { theoMa[c.cau] = i; });
    cauMoi.forEach(function (c) { if (theoMa[c.cau] != null) A.cauDs[theoMa[c.cau]] = c; else A.cauDs.push(c); });
    if (vanT) A.vanDs.push(vanT);

    const truoc = HT.bangMuc(A.hocTap);
    A.hocTap = HT.hoSoHocTap(be, A.cauDs, A.vanDs, nay);
    const sau = HT.bangMuc(A.hocTap);
    const thuong = [];
    Object.keys(sau).forEach(function (k) {
      const cu = truoc[k] ? truoc[k].muc : 'chua_hoc';
      const moi = sau[k].muc;
      if (cu !== moi || (truoc[k] && truoc[k].can_giup) !== sau[k].can_giup) {
        NK.ghiSauVan('thanh_thao_doi', {
          noi_dung: sau[k].ma, ky_nang: k, tu: cu, den: moi, can_giup: sau[k].can_giup,
          bang_chung: { so_cau: sau[k].so_cau, tu_lam_14_ngay: sau[k].tu_lam_14_ngay, tu_lam_dung_14_ngay: sau[k].tu_lam_dung_14_ngay }
        });
      }
      if ((moi === 'da_thuoc' || moi === 'vung_chac') && !(cu === 'da_thuoc' || cu === 'vung_chac')) {
        thuong.push({ qua_mong: 50, ly_do: 'ky_nang_da_thuoc', ky_nang: k, loi: 'Thuộc ' + NH.KY_NANG[k].ten.toLowerCase() });
      }
    });

    // Nhiệm vụ
    const nv = nhiemVuHomNay();
    if (!boDo) {
      const x = nv.ds.find(function (y) { return !y.xong && y.man === m.id; });
      if (x) x.xong = true;
      if (!nv.thuong && nv.ds.length >= 3 && nv.ds.every(function (y) { return y.xong; })) {
        nv.thuong = true;
        thuong.push({ qua_mong: 20, ly_do: 'xong_3_nhiem_vu', loi: 'Xong cả 3 nhiệm vụ hôm nay' });
      }
    }
    thuong.forEach(function (t) { NK.ghiSauVan('thuong', { qua_mong: t.qua_mong, ly_do: t.ly_do, ky_nang: t.ky_nang || null }); });

    // Hồ sơ bé: quả mọng, kỷ lục, mức lớn
    const quaVan = (kq.quaMong && kq.quaMong.tong) || 0;
    const quaThuong = thuong.reduce(function (s, t) { return s + t.qua_mong; }, 0);
    const quaTruoc = p.khung_long.qua_mong || 0;
    p.khung_long.qua_mong = quaTruoc + quaVan + quaThuong;
    if (!boDo) p.van_xong = (p.van_xong || 0) + 1;
    if (kq.dem && (kq.dem.dungNgay + kq.dem.nhoGoiY + kq.dem.lan2) > 0) p.co_cau_dung = true;
    p.ky_luc = p.ky_luc || {};
    if (!boDo) {
      const kl = p.ky_luc[m.id] || { lan_choi: 0, sao: 0 };
      kl.lan_choi = (kl.lan_choi || 0) + 1;
      kl.sao = Math.max(kl.sao || 0, kq.sao || 0);
      if (kq.kyLucMoi) { kl.giay = kq.giayDua; kl.moc = kq.moc; }
      p.ky_luc[m.id] = kl;
    }
    const soThuoc = (A.hocTap.ky_nang || []).filter(function (k) { return k.muc === 'da_thuoc' || k.muc === 'vung_chac'; }).length;
    const mucCu = p.khung_long.muc;
    const mucMoi = HT.mucLon({ qua_mong: p.khung_long.qua_mong, so_da_thuoc: soThuoc, so_dau_truong: 0, van_xong: p.van_xong, co_cau_dung: p.co_cau_dung }).ma;
    A.hangMung = [];
    if (mucMoi !== mucCu) {
      p.khung_long.muc = mucMoi;
      NK.ghiSauVan('ho_so_doi', { truong: 'khung_long.muc', cu: mucCu, moi: mucMoi, qua_mong: p.khung_long.qua_mong });
      if (mucMoi !== 'lay_dong') A.hangMung.push({ loai: mucCu === 'trung' || mucCu === 'lay_dong' ? 'no_trung' : 'lon_len', muc: mucMoi });
    }
    // Trứng của vùng nở khi mọi kỹ năng của vùng đã thuộc
    p.trung_vung = p.trung_vung || {};
    DAO.VUNG.forEach(function (v) {
      const ky = DAO.kyNangCuaVung(v);
      if (!ky.length || (p.trung_vung[v.so] && p.trung_vung[v.so].no)) return;
      if (ky.every(function (k) { return sau[k] && (sau[k].muc === 'da_thuoc' || sau[k].muc === 'vung_chac'); })) {
        p.trung_vung[v.so] = { no: true, luc: NK.isoDiaPhuong(Date.now()), ten: null };
        if (v.phu_kien && p.phu_kien.indexOf(v.phu_kien) < 0) p.phu_kien.push(v.phu_kien);
        NK.ghiSauVan('thuong', { qua_mong: 0, ly_do: 'trung_vung_no', vung: v.so, loai: v.loai, phu_kien: v.phu_kien || null });
        A.hangMung.push({ loai: 'trung_vung', vung: v.so });
      }
    });

    const luu = Promise.all([
      kho().datNhieu('tom_tat_cau', cauMoi),
      vanT ? kho().dat('tom_tat_van', vanT) : Promise.resolve(),
      kho().dat('ho_so_hoc_tap', A.hocTap),
      HS.luu(p),
      NK.xa()
    ]).catch(function (e) { console.error(e); });

    if (boDo) { luu.then(function () { vaoDao(); }); return; }
    A.ketThuc = { m: m, kq: kq, vanT: vanT, thuong: thuong, quaVan: quaVan, quaTruoc: quaTruoc, camXuc: null };
    moKetThuc();
  }

  /* ---------------- 7. Kết thúc màn ---------------- */

  function moKetThuc() {
    const k = A.ketThuc;
    const p = A.hoSo;
    const kq = k.kq;
    const d = kq.dem;
    $('kt-tieu-de').textContent = kq.kyLucMoi && p.ky_luc[k.m.id] && p.ky_luc[k.m.id].lan_choi > 1 ? 'Kỷ lục mới!' : 'Hoàn thành!';
    $('kt-man').textContent = DAO.tenManDayDu(k.m);
    $('kt-sao').innerHTML = [0, 1, 2].map(function (i) { return '<i class="' + (i < kq.sao ? 'co' : '') + '" style="--tre:' + (i * 0.25) + 's">★</i>'; }).join('');
    const tongCau = d.dungNgay + d.nhoGoiY + d.lan2 + d.sai;
    $('kt-dung').textContent = (d.dungNgay + d.nhoGoiY + d.lan2) + '/' + tongCau;
    $('kt-tu-lam').textContent = d.dungNgay;
    $('kt-sua').textContent = d.suaDuoc;
    const kl = $('kt-ky-luc');
    kl.classList.toggle('hidden', !kq.giayDua && !kq.dongPhu);
    const pKl = p.ky_luc[k.m.id];
    if (kq.giayDua) kl.textContent = 'Thời gian đua ' + phutGiay(kq.giayDua) + (pKl && pKl.giay && !kq.kyLucMoi ? ' · kỷ lục ' + phutGiay(pKl.giay) : kq.kyLucMoi ? ' · kỷ lục mới của con!' : '');
    else kl.textContent = kq.dongPhu || '';
    $('kt-an').src = hinh(hinhKhungLong(p, p.khung_long.muc === 'trung' || p.khung_long.muc === 'lay_dong' ? 'lay_dong' : 'an'));
    $('kt-an').className = 'kt-an' + (p.khung_long.muc === 'trung' || p.khung_long.muc === 'lay_dong' ? ' lac' : '');
    const tongQua = k.quaVan + k.thuong.reduce(function (s, t) { return s + t.qua_mong; }, 0);
    $('kt-qua').textContent = '+' + tongQua + ' quả mọng';
    const Q = kq.quaMong;
    const dong = [];
    if (Q.so_tu_lam) dong.push(Q.so_tu_lam + ' câu tự làm' + (Q.vung_chac ? '' : ' × 3') + ' = ' + (Q.tu_lam + Q.vung_chac));
    if (Q.so_nho_goi_y) dong.push(Q.so_nho_goi_y + ' câu nhờ gợi ý × 1 = ' + Q.nho_goi_y);
    if (Q.so_sua_duoc) dong.push('Sửa được ' + Q.so_sua_duoc + ' câu từng sai: +' + Q.sua_duoc);
    k.thuong.forEach(function (t) { if (t.qua_mong) dong.push(t.loi + ': +' + t.qua_mong); });
    if (!dong.length) dong.push('Lần sau con làm đúng là có quả mọng nhé!');
    $('kt-chi-tiet').innerHTML = dong.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
    veThanhLon();
    document.querySelectorAll('#kt-mat button').forEach(function (b) { b.classList.remove('chon'); b.disabled = false; });
    hien('man-ket-thuc');
    AT.bat('qua_mong');
  }

  function phutGiay(g) { g = Math.max(0, Math.round(g || 0)); return Math.floor(g / 60) + ':' + String(g % 60).padStart(2, '0'); }

  function veThanhLon() {
    const p = A.hoSo;
    const muc = HT.MUC_LON.find(function (x) { return x.ma === p.khung_long.muc; }) || HT.MUC_LON[0];
    const ke = HT.mucLonKeTiep(muc.ma);
    const ten = tenKhungLong(p);
    if (!ke) { $('kt-lon-ten').textContent = ten + ': ' + muc.ten; $('kt-lon-thanh').style.width = '100%'; $('kt-lon-phu').textContent = 'Mức cao nhất rồi!'; return; }
    $('kt-lon-ten').textContent = ten + ': ' + muc.ten + ' → ' + ke.ten;
    const q = p.khung_long.qua_mong;
    let phu;
    let tiLe;
    if (ke.can_van_xong || ke.can_cau_dung) { tiLe = 0.6; phu = 'Chơi xong một ván là trứng nở'; }
    else {
      tiLe = Math.min(1, q / ke.qua_mong);
      phu = soDep(q) + ' / ' + soDep(ke.qua_mong) + ' quả mọng';
      const soThuoc = (A.hocTap.ky_nang || []).filter(function (k) { return k.muc === 'da_thuoc' || k.muc === 'vung_chac'; }).length;
      if (ke.da_thuoc && soThuoc < ke.da_thuoc) phu += ' · cần thêm ' + (ke.da_thuoc - soThuoc) + ' nội dung đã thuộc';
      if (ke.dau_truong) phu += ' · cần thắng một đấu trường';
    }
    $('kt-lon-thanh').style.width = Math.round(tiLe * 100) + '%';
    $('kt-lon-phu').textContent = phu;
  }

  function chonCamXuc(muc) {
    const k = A.ketThuc;
    if (!k || k.camXuc === muc) return;
    k.camXuc = muc;
    document.querySelectorAll('#kt-mat button').forEach(function (b) { b.classList.toggle('chon', b.getAttribute('data-muc') === muc); });
    const ev = NK.ghiSauVan('cam_xuc', { muc: muc });
    AT.bat('cham');
    if (ev && k.kq.suKien) {
      k.kq.suKien.push(ev);
      const vanT = HT.tomTatVan(k.kq.suKien, tenManNgan(k.m));
      const i = A.vanDs.findIndex(function (v) { return v.van === vanT.van; });
      if (i >= 0) A.vanDs[i] = vanT;
      A.hocTap = HT.hoSoHocTap(A.hoSo.id, A.cauDs, A.vanDs, homNay());
      Promise.all([kho().dat('tom_tat_van', vanT), kho().dat('ho_so_hoc_tap', A.hocTap), NK.xa()]).catch(function () { /* bỏ qua */ });
    }
  }

  function tiepSauKetThuc() {
    if (A.hangMung.length) { moMung(A.hangMung.shift()); return; }
    vaoDao();
  }

  /* ---------------- 8. Ăn mừng ---------------- */

  function moMung(x) {
    const p = A.hoSo;
    const ten = tenKhungLong(p);
    $('mg-dat-ten').classList.add('hidden');
    $('mg-qua').classList.add('hidden');
    A.mungDangMo = x;
    if (x.loai === 'no_trung') {
      $('mg-tieu-de').textContent = 'Trứng đã nở!';
      $('mg-phu').textContent = 'Chào ' + ten + '! Bạn ấy nở ra vì con đã chơi xong ván đầu tiên.';
      $('mg-hinh').src = hinh(hinhKhungLong(p, x.muc));
      $('mg-tiep').textContent = 'Chào ' + ten + '!';
    } else if (x.loai === 'lon_len') {
      const muc = HT.MUC_LON.find(function (m) { return m.ma === x.muc; });
      $('mg-tieu-de').textContent = ten + ' lớn lên rồi!';
      $('mg-phu').textContent = 'Bây giờ ' + ten + ' là ' + (muc ? muc.ten.toLowerCase() : '') + '. Con giỏi quá!';
      $('mg-hinh').src = hinh(hinhKhungLong(p, x.muc));
      $('mg-tiep').textContent = 'Tuyệt quá!';
    } else {
      const v = DAO.vung(x.vung);
      $('mg-tieu-de').textContent = 'Trứng ' + v.ten_loai + ' đã nở!';
      $('mg-phu').textContent = 'Vì con đã thuộc cả ' + DAO.kyNangCuaVung(v).length + ' kỹ năng của ' + v.ten;
      $('mg-hinh').src = hinh(v.loai);
      if (v.phu_kien) { $('mg-qua').textContent = 'Quà thêm: ' + v.phu_kien + ' cho ' + ten; $('mg-qua').classList.remove('hidden'); }
      $('mg-dat-ten').classList.remove('hidden');
      $('mg-ten').value = v.ten_loai;
      $('mg-tiep').textContent = 'Đưa về Vườn';
    }
    hien('man-mung');
    AT.bat('no_trung');
  }

  function dongMung() {
    const x = A.mungDangMo;
    if (x && x.loai === 'trung_vung') {
      const ten = HS.sachTen($('mg-ten').value);
      if (ten && A.hoSo.trung_vung[x.vung]) { A.hoSo.trung_vung[x.vung].ten = ten; HS.luu(A.hoSo); }
    }
    A.mungDangMo = null;
    tiepSauKetThuc();
  }

  /* ---------------- 9. Góc phụ huynh (bản đầu) ---------------- */

  const CONG = { hoi: null, nhap: '', sai: 0, ve: null };
  function moPhuHuynh(ve) {
    const a = 6 + Math.floor(Math.random() * 4), b = 6 + Math.floor(Math.random() * 4);
    CONG.hoi = { a: a, b: b };
    CONG.nhap = '';
    CONG.ve = ve;
    $('ph-hoi').textContent = a + ' × ' + b + ' = ?';
    $('ph-o').textContent = '';
    $('ph-cong').classList.remove('hidden');
    $('ph-bang').classList.add('hidden');
    hien('man-phu-huynh');
  }
  function congGo(k) {
    if (k === 'xoa') CONG.nhap = CONG.nhap.slice(0, -1);
    else if (k === 'xong') {
      if (Number(CONG.nhap) === CONG.hoi.a * CONG.hoi.b) { veBangPhuHuynh(); return; }
      CONG.sai++;
      CONG.nhap = '';
      bao('Chưa đúng. Góc này dành cho bố mẹ nhé!');
      if (CONG.sai >= 3) { CONG.sai = 0; thoatPhuHuynh(); return; }
    } else if (CONG.nhap.length < 3) CONG.nhap += k;
    $('ph-o').textContent = CONG.nhap;
  }
  function thoatPhuHuynh() {
    if (CONG.ve === 'ban-do' && A.hoSo) vaoDao(); else moChonBe();
  }

  function veBangPhuHuynh() {
    $('ph-cong').classList.add('hidden');
    $('ph-bang').classList.remove('hidden');
    const p = A.hoSo;
    if (!p) {
      // Chưa chọn bé: chỉ hiện danh sách để chọn bé cần chỉnh
      $('ph-be').innerHTML = '<p>Chọn một bé ở màn “Con là ai?” rồi vào lại Góc phụ huynh từ bản đồ để chỉnh tuổi, lớp hoặc xuất nhật ký.</p>';
      document.querySelectorAll('#ph-bang .ph-nhom').forEach(function (el) { el.classList.add('hidden'); });
      return;
    }
    document.querySelectorAll('#ph-bang .ph-nhom').forEach(function (el) { el.classList.remove('hidden'); });
    NK.ghi('phu_huynh_mo', { man: 'cai_dat' }, { game: 'goc-phu-huynh' });
    $('ph-be').innerHTML = '<img src="' + hinh(hinhKhungLong(p)) + '" alt=""><div><b>' + esc(p.ten) + '</b><span>' + esc(tenKhungLong(p)) + ' · ' + soDep(p.khung_long.qua_mong) + ' quả mọng · ' + (p.van_xong || 0) + ' ván đã xong</span></div>';
    veChonPhuHuynh();
    capNhatThongKe();
  }

  function veChonPhuHuynh() {
    const p = A.hoSo;
    const tuoi = HS.tuoiHienTai(p);
    let h = '';
    for (let t = 5; t <= 11; t++) h += '<button type="button" data-tuoi="' + t + '" class="' + (t === tuoi ? 'chon' : '') + '">' + t + '</button>';
    $('ph-tuoi').innerHTML = h;
    h = '';
    for (let l = 1; l <= 5; l++) h += '<button type="button" data-lop="' + l + '" class="' + (l === p.lop ? 'chon' : '') + '">' + l + '</button>';
    $('ph-lop').innerHTML = h;
    $('ph-bai').textContent = p.bai_dang_hoc;
  }

  function doiCaiDat(truong, moi) {
    const p = A.hoSo;
    let cu;
    if (truong === 'tuoi') {
      cu = HS.tuoiHienTai(p);
      p.tuoi_khi_nhap = moi;
      p.ngay_nhap_tuoi = homNay();
      p.nam_sinh_uoc_tinh = new Date().getFullYear() - moi;
    } else if (truong === 'lop') {
      cu = p.lop; p.lop = moi; p.lop_nguon = 'phu_huynh'; p.nam_hoc_cua_lop = HS.namHocBatDau(new Date());
    } else if (truong === 'bai_dang_hoc') {
      cu = p.bai_dang_hoc; p.bai_dang_hoc = Math.max(1, Math.min(75, moi)); p.bai_nguon = 'phu_huynh'; moi = p.bai_dang_hoc;
    }
    if (cu === moi) return;
    p.nhiem_vu = null; // lập lại nhiệm vụ theo lớp, bài mới
    NK.ghi('phu_huynh_cai_dat', { truong: truong, cu: cu, moi: moi }, { game: 'goc-phu-huynh' });
    HS.luu(p);
    veChonPhuHuynh();
  }

  function capNhatThongKe() {
    const p = A.hoSo;
    NK.docCuaBe(p.id).then(function (ds) {
      A.soSuKien = ds.length;
      $('ph-thong-ke').textContent = ds.length + ' sự kiện trong nhật ký gốc · ' + A.vanDs.length + ' ván · ' + A.cauDs.length + ' câu. Dữ liệu chỉ nằm trên máy này, không gửi đi đâu.';
    });
  }

  function taiNhatKy() {
    const p = A.hoSo;
    NK.xuatJsonl(p.id).then(function (txt) {
      const blob = new Blob([txt], { type: 'application/x-ndjson' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'dao-khung-long-nhat-ky-' + homNay() + '.jsonl';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      NK.ghi('phu_huynh_cai_dat', { truong: 'tai_nhat_ky', so_su_kien: txt ? txt.split('\n').length - 1 : 0 }, { game: 'goc-phu-huynh' });
    });
  }

  /** Dựng lại cả ba lớp tóm tắt từ nhật ký gốc (YC-05). */
  function tinhLai() {
    const p = A.hoSo;
    NK.docCuaBe(p.id).then(function (ds) {
      const theoVan = {};
      ds.forEach(function (e) { if (e.van) (theoVan[e.van] = theoVan[e.van] || []).push(e); });
      const cauDs = [], vanDs = [];
      Object.keys(theoVan).forEach(function (v) {
        const evs = theoVan[v];
        const goc = evs[0];
        HT.tomTatCacCau(evs).forEach(function (c) { cauDs.push(c); });
        const t = HT.tomTatVan(evs, tenManNgan(DAO.man(goc.man)));
        if (t) vanDs.push(t);
      });
      cauDs.sort(function (a, b) { return a.luc < b.luc ? -1 : 1; });
      vanDs.sort(function (a, b) { return a.luc < b.luc ? -1 : 1; });
      const hocTap = HT.hoSoHocTap(p.id, cauDs, vanDs, homNay());
      const khop = JSON.stringify(hocTap) === JSON.stringify(HT.hoSoHocTap(p.id, A.cauDs, A.vanDs, homNay()));
      A.cauDs = cauDs; A.vanDs = vanDs; A.hocTap = hocTap;
      return Promise.all([kho().datNhieu('tom_tat_cau', cauDs), kho().datNhieu('tom_tat_van', vanDs), kho().dat('ho_so_hoc_tap', hocTap)]).then(function () {
        bao('Đã tính lại ' + vanDs.length + ' ván, ' + cauDs.length + ' câu từ ' + ds.length + ' sự kiện' + (khop ? '. Khớp với bản đang lưu.' : '. Đã cập nhật bản lưu.'), 4);
        capNhatThongKe();
      });
    });
  }

  function xoaDuLieuBe() {
    const p = A.hoSo;
    if (!window.confirm('Xóa toàn bộ dữ liệu của ' + p.ten + ' trên máy này? Việc này không hoàn tác được.')) return;
    NK.xoaBe(p.id).then(function () {
      A.dsBe = A.dsBe.filter(function (x) { return x.id !== p.id; });
      A.hoSo = null;
      HS.datBeDangChoi(null);
      bao('Đã xóa dữ liệu của ' + p.ten);
      moChonBe();
    });
  }

  /* ---------------- Gắn sự kiện ---------------- */

  function ganSuKien() {
    // Con là ai
    $('cb-luoi').addEventListener('click', function (e) {
      const b = e.target.closest('button');
      if (!b) return;
      AT.bat('cham');
      if (b.id === 'cb-them') moTaoHoSo(); else chonBe(b.getAttribute('data-id'));
    });
    $('cb-bo-me').addEventListener('click', function () { A.hoSo = null; moPhuHuynh('chon-be'); });

    // Tạo hồ sơ
    $('th-ten').addEventListener('input', function () { hienBuocTao(); });
    $('th-ten').addEventListener('keydown', function (e) { if (e.key === 'Enter') tiepTao(); });
    $('th-goi-y-ten').addEventListener('click', function (e) {
      const b = e.target.closest('.chip-ten');
      if (!b) return;
      $('th-ten').value = b.textContent;
      hienBuocTao();
    });
    $('th-tuoi').addEventListener('click', function (e) {
      const b = e.target.closest('.nut-tuoi');
      if (!b) return;
      A.tao.tuoi = +b.getAttribute('data-tuoi');
      AT.bat('cham');
      hienBuocTao();
      setTimeout(tiepTao, 250);
    });
    $('th-lop').addEventListener('click', function (e) {
      const b = e.target.closest('.nut-lop');
      if (!b) return;
      A.tao.lop = +b.getAttribute('data-lop');
      AT.bat('cham');
      hienBuocTao();
    });
    $('th-tiep').addEventListener('click', tiepTao);
    $('th-quay').addEventListener('click', function () {
      if (A.tao && A.tao.buoc > 1) { A.tao.buoc--; hienBuocTao(); } else moChonBe();
    });

    // Chọn trứng
    document.querySelectorAll('.ct-trung').forEach(function (b) {
      b.addEventListener('click', function () {
        A.tao.phong_cach = b.getAttribute('data-pc');
        document.querySelectorAll('.ct-trung').forEach(function (x) { const on = x === b; x.classList.toggle('chon', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
        $('ct-ap').disabled = false;
        AT.bat('cham');
      });
    });
    $('ct-ap').addEventListener('click', apTrung);
    $('ct-quay').addEventListener('click', function () { A.tao.buoc = 3; hienBuocTao(); hien('man-tao-ho-so'); });

    // Bản đồ
    $('bd-diem').addEventListener('click', function (e) {
      const b = e.target.closest('.bd-vung');
      if (b) { AT.bat('cham'); moVung(+b.getAttribute('data-vung')); }
    });
    $('nv-ds').addEventListener('click', function (e) {
      const b = e.target.closest('.nv-the');
      if (!b) return;
      const i = +b.getAttribute('data-i');
      const x = nhiemVuHomNay().ds[i];
      AT.bat('cham');
      if (x && x.xong) { const m = DAO.man(x.man); if (m) moVung(m.vung); } else choiNhiemVu(i);
    });
    $('nv-choi').addEventListener('click', function () { AT.bat('cham'); choiNhiemVu(+this.getAttribute('data-i')); });
    $('bd-chip').addEventListener('click', function () { AT.bat('cham'); moChonBe(); });
    $('bd-bo-me').addEventListener('click', function () { moPhuHuynh('ban-do'); });
    $('bd-am').addEventListener('click', function () { AT.datTieng(!AT.co.tieng); this.textContent = 'Âm thanh: ' + (AT.co.tieng ? 'Bật' : 'Tắt'); });
    $('bd-meo-dong').addEventListener('click', function () {
      $('bd-meo').classList.add('hidden');
      try { window.localStorage.setItem('dkl-meo-mh-v1', '1'); } catch (e) { /* bỏ qua */ }
    });

    // Vùng
    $('vg-quay').addEventListener('click', function () { vaoDao(); });
    $('vg-ds').addEventListener('click', function (e) {
      const b = e.target.closest('.vg-man');
      if (!b) return;
      if (b.classList.contains('tat')) { bao(b.querySelector('.chip-muc') ? b.querySelector('.chip-muc').textContent : 'Chưa chơi được'); return; }
      AT.bat('cham');
      const id = b.getAttribute('data-man');
      const nv = nhiemVuHomNay();
      const i = nv.ds.findIndex(function (x) { return !x.xong && x.man === id; });
      if (i >= 0) choiNhiemVu(i); else batDauMan(id, 'tu_chon', null);
    });

    // Kết thúc
    $('kt-mat').addEventListener('click', function (e) {
      const b = e.target.closest('button');
      if (b) chonCamXuc(b.getAttribute('data-muc'));
    });
    $('kt-lai').addEventListener('click', function () {
      const x = A.manVuaChoi;
      if (A.hangMung.length) { moMung(A.hangMung.shift()); return; }
      if (x) batDauMan(x.id, 'tu_chon', null);
    });
    $('kt-tiep').addEventListener('click', tiepSauKetThuc);

    // Ăn mừng
    $('mg-tiep').addEventListener('click', dongMung);

    // Lên lớp
    $('ll-lop').addEventListener('click', function (e) {
      const b = e.target.closest('.nut-lop');
      if (b) chotLenLop(+b.getAttribute('data-lop'));
    });

    // Phụ huynh
    $('ph-quay').addEventListener('click', thoatPhuHuynh);
    $('ph-ban-phim').addEventListener('click', function (e) {
      const b = e.target.closest('button');
      if (b) congGo(b.getAttribute('data-k'));
    });
    $('ph-tuoi').addEventListener('click', function (e) { const b = e.target.closest('button'); if (b) doiCaiDat('tuoi', +b.getAttribute('data-tuoi')); });
    $('ph-lop').addEventListener('click', function (e) { const b = e.target.closest('button'); if (b) doiCaiDat('lop', +b.getAttribute('data-lop')); });
    $('ph-bai-tru').addEventListener('click', function () { doiCaiDat('bai_dang_hoc', A.hoSo.bai_dang_hoc - 1); });
    $('ph-bai-cong').addEventListener('click', function () { doiCaiDat('bai_dang_hoc', A.hoSo.bai_dang_hoc + 1); });
    $('ph-tai').addEventListener('click', taiNhatKy);
    $('ph-tinh-lai').addEventListener('click', tinhLai);
    $('ph-xoa').addEventListener('click', xoaDuLieuBe);
  }

  /** Dùng cho kiểm thử tự động và gỡ lỗi. */
  window.__DKL = { A: A, batDauMan: batDauMan, vaoMan: vaoMan, moVung: moVung, vaoDao: vaoDao, chonBe: chonBe, tinhLai: tinhLai };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', khoiDong);
  else khoiDong();
})();
