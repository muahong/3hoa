/* ============================================================
   dua-xe.js – Game Đua Xe: ba làn, ba cổng đáp án
   - Vào cổng đúng thì tăng tốc, sai thì xe chậm lại (không đâm), hiện lời giải, câu quay lại sau 2 câu.
   - Đua với bóng kỷ lục của chính mình, không xếp hạng với bạn khác.
   - Màn khó có trạm dừng bắt tự gõ đáp án (chống đoán).
   - Mọi thao tác ghi qua VanChoi/NhatKy: doi_lan (kèm giá trị trước mũi xe), cham nút Lao tới, nghe_lai, go_so, xoa, gợi ý.
   Đường vẽ giả 3D trên canvas; bầu trời, đồi cây lấy từ ảnh bg-race-track.
   API: window.DuaXe = { batDau(o), dung() }
   ============================================================ */
(function () {
  'use strict';

  const LAN = ['lan_trai', 'lan_giua', 'lan_phai'];
  const MAU_BANG = ['#3d7be0', '#f07f1b', '#12a192'];
  const MAU_VIEN = ['#23509e', '#b85a0c', '#0b6f64'];
  const V_CO_BAN = 10, V_TANG = 14, V_LAO = 36, V_CHAM = 3.5, V_GOI_Y = 5;
  const SEG = 2, Z_XA = 150, Z_GAN = 0.7, NUA_DUONG = 1.5;
  const CO_GIAM_DONG = (function () { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();

  let s = null;
  let dom = null;
  let hh = null; // hình học màn hình

  function $(id) { return document.getElementById(id); }
  function gioi(x, a, b) { return x < a ? a : x > b ? b : x; }
  function dongHo(giay) { giay = Math.max(0, giay); const m = Math.floor(giay / 60); const g = Math.floor(giay % 60); return m + ':' + (g < 10 ? '0' : '') + g; }
  function an(el, b) { if (el) el.classList.toggle('hidden', !!b); }
  function chu(el, t) { if (el && el.textContent !== String(t)) el.textContent = String(t); }
  function K() { return window.KhungChoi; }
  /** Đọc đề khi câu hiện (mặc định có, như các thể loại khác; o.docDe === false để tắt). */
  function docDe() { return window.AmThanh.co.giong && !(s && s.o && s.o.docDe === false); }

  /* ---------------- DOM và sự kiện ---------------- */

  function khoiDom() {
    if (dom) return dom;
    const ids = ['man-dua-xe', 'dx-canvas', 'dx-diem', 'dx-vong', 'dx-gio', 'dx-ky-luc', 'dx-cau', 'dx-de', 'dx-nghe', 'dx-goi-y', 'dx-tam-dung',
      'dx-tien-do-thanh', 'dx-tang-toc', 'dx-lao', 'dx-huong-dan', 'dx-goi-y-bong', 'dx-goi-y-hinh', 'dx-goi-y-chu', 'dx-dem-nguoc', 'dx-dem-so',
      'dx-tram', 'dx-tram-de', 'dx-tram-o', 'dx-tram-bao', 'dx-ban-phim', 'dx-phan-hoi', 'dx-ph-hinh', 'dx-ph-noi-dung', 'dx-ph-que', 'dx-ph-note',
      'dx-ph-que-nut', 'dx-ph-tiep', 'dx-tram-goi-y', 'dx-tam', 'dx-tiep', 'dx-am', 'dx-giong', 'dx-ve-dao', 'dx-ve-dich', 'dx-bong-nhan'];
    dom = {};
    ids.forEach(function (id) { dom[id.replace(/^dx-/, '').replace(/-([a-z])/g, function (m, c) { return c.toUpperCase(); })] = $(id); });
    dom.man = $('man-dua-xe');
    dom.gyBong = dom.goiYBong; dom.gyHinh = dom.goiYHinh; dom.gyChu = dom.goiYChu;
    dom.ph = dom.phanHoi; dom.tienDo = dom.tienDoThanh;
    dom.ctx = dom.canvas.getContext('2d');
    // Menu Tạm dừng giống khung chơi chung: nút có hình, thêm "Xem lại bài học" khi màn có bài học
    dom.baiHoc = document.createElement('button');
    dom.baiHoc.type = 'button';
    dom.baiHoc.className = 'nut nut-trang hidden';
    dom.baiHoc.id = 'dx-bai-hoc';
    const cachChoi = $('dx-cach-choi');
    if (cachChoi && cachChoi.parentNode) cachChoi.parentNode.insertBefore(dom.baiHoc, cachChoi.nextSibling);
    K().trangTriTamDung({ tiep: dom.tiep, cachChoi: cachChoi, baiHoc: dom.baiHoc, am: dom.am, giong: dom.giong, veDao: dom.veDao });
    K().ganLoaLoiGiai(dom.ph, function () { return s && s.giaiDoan === 'phan_hoi' ? s.phDoc : null; }, function () {
      if (s && s.van.q && !s.van.q.xong) s.van.thaoTac('nghe_lai', { doi_tuong: 'loi_giai' });
    });

    dom.canvas.addEventListener('pointerdown', function (e) {
      if (!s || !s.chay) return;
      e.preventDefault();
      // Chạm sát nút Lao tới (trượt tay) thì không đổi làn
      if (ganNutLao(e.clientX, e.clientY)) return;
      const r = dom.canvas.getBoundingClientRect();
      doiLan(e.clientX - r.left < r.width / 2 ? -1 : 1);
    });
    dom.baiHoc.addEventListener('click', function () {
      if (!s || !s.o.xemBaiHoc || s.giaiDoan !== 'tam_dung') return;
      an(dom.tam, true);
      s.o.xemBaiHoc(function () { an(dom.tam, false); s.veLai = true; });
    });
    dom.lao.addEventListener('click', function () { laoToi(); });
    dom.nghe.addEventListener('click', function () { ngheLai(); });
    dom.goiY.addEventListener('click', function () { xinGoiY(); });
    dom.tramGoiY.addEventListener('click', function () { xinGoiY(); });
    dom.tamDung.addEventListener('click', function () { tamDung('nut'); });
    dom.tiep.addEventListener('click', function () { tiepTuc('nut'); });
    dom.veDao.addEventListener('click', function () {
      if (!s) return;
      // Ván đã có câu trả lời: hỏi lại cho chắc (bé hay chạm nhầm); chưa làm gì thì về luôn
      if (s.van.coTienTrinh && s.van.coTienTrinh()) {
        an(dom.tam, true);
        K().hoiVeDao(dom.man, { hinh: s.o.hinhGoiY, onChoiTiep: function () { tiepTuc('nut'); }, onVeDao: thoat });
      } else thoat();
    });
    dom.am.addEventListener('click', function () { window.AmThanh.datTieng(!window.AmThanh.co.tieng); capNhatNutAm(); });
    dom.giong.addEventListener('click', function () { window.AmThanh.datGiong(!window.AmThanh.co.giong); capNhatNutAm(); });
    dom.phTiep.addEventListener('click', function () { dongPhanHoi('choi_tiep'); });
    dom.phQueNut.addEventListener('click', function () { moQueTinh(); });
    dom.banPhim.addEventListener('click', function (e) {
      const b = e.target.closest('button');
      if (!b) return;
      const k = b.getAttribute('data-k');
      if (k === 'xoa') tramXoa(); else if (k === 'xong') tramXong(); else tramGo(k);
    });
    document.addEventListener('keydown', function (e) {
      if (!s || !s.dangChay) return;
      const k = e.key;
      if (s.giaiDoan === 'tram') {
        if (/^[0-9]$/.test(k)) { tramGo(k); e.preventDefault(); }
        else if (k === 'Backspace') { tramXoa(); e.preventDefault(); }
        else if (k === 'Enter') { tramXong(); e.preventDefault(); }
        return;
      }
      if (s.giaiDoan === 'phan_hoi') { if (k === 'Enter' || k === ' ') { dongPhanHoi('choi_tiep'); e.preventDefault(); } return; }
      if (s.giaiDoan === 'tam_dung') { if (k === 'Escape' || k === 'p') { tiepTuc('phim'); e.preventDefault(); } return; }
      if (k === 'ArrowLeft' || k === 'a') { doiLan(-1); e.preventDefault(); }
      else if (k === 'ArrowRight' || k === 'd') { doiLan(1); e.preventDefault(); }
      else if (k === 'ArrowUp' || k === ' ' || k === 'w') { laoToi(); e.preventDefault(); }
      else if (k === 'h') xinGoiY();
      else if (k === 'Escape' || k === 'p') tamDung('phim');
    });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden' && s && s.dangChay && (s.giaiDoan === 'chay' || s.giaiDoan === 'dem_nguoc')) tamDung('an_tab');
    });
    window.addEventListener('resize', function () { if (s && s.dangChay) { doKichThuoc(); s.veLai = true; } });
    return dom;
  }

  function capNhatNutAm() { K().nutAm(dom.am, dom.giong); }

  /** Điểm (x, y) trên màn hình nằm trên hoặc sát nút Lao tới (cách mép 14 px). */
  function ganNutLao(x, y) {
    if (!dom.lao || dom.lao.classList.contains('hidden')) return false;
    const r = dom.lao.getBoundingClientRect();
    return r.width > 0 && x >= r.left - 14 && x <= r.right + 14 && y >= r.top - 14 && y <= r.bottom + 14;
  }

  /* ---------------- Hình học và nền ---------------- */

  function doKichThuoc() {
    const r = dom.man.getBoundingClientRect();
    const W = Math.max(320, r.width), H = Math.max(320, r.height);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    dom.canvas.width = Math.round(W * dpr);
    dom.canvas.height = Math.round(H * dpr);
    const yh = H * (W > H ? 0.36 : 0.4);
    const F = H - yh;
    const yXe = H * 0.8;
    const zXe = F / (yXe - yh);
    const laneW = Math.min(W * 0.3, H * 0.42);
    hh = { W: W, H: H, dpr: dpr, yh: yh, F: F, yXe: yXe, zXe: zXe, laneW: laneW, Fx: laneW * zXe, xeW: Math.min(W * 0.24, H * 0.34) };
    veNenSan();
  }
  function py(z) { return hh.yh + hh.F / z; }
  function px(xw, z) { return hh.W / 2 + xw * hh.Fx / z; }

  function veNenSan() {
    const c = document.createElement('canvas');
    c.width = Math.round(hh.W * hh.dpr); c.height = Math.round(hh.yh * hh.dpr + 2);
    const g = c.getContext('2d');
    g.setTransform(hh.dpr, 0, 0, hh.dpr, 0, 0);
    const img = s && s.nen;
    if (img && img.naturalWidth) {
      // ảnh gốc 1280×853, đường chân trời của ảnh ở y≈318
      const k = Math.max(hh.W / img.naturalWidth, hh.yh / (img.naturalHeight * 0.373));
      const w = img.naturalWidth * k, h = img.naturalHeight * k;
      g.drawImage(img, (hh.W - w) / 2, hh.yh - h * 0.373, w, h);
    } else {
      const gr = g.createLinearGradient(0, 0, 0, hh.yh);
      gr.addColorStop(0, '#5ec2f5'); gr.addColorStop(1, '#bfe9ff');
      g.fillStyle = gr; g.fillRect(0, 0, hh.W, hh.yh);
    }
    hh.nen = c;
  }

  /* ---------------- Bắt đầu, vòng lặp ---------------- */

  /**
   * o: { van (VanChoi), man, hinhXe, nen, hinhGoiY (url), tenBe, kyLuc: { giay, moc }, heSoDau, onXong(kq), onThoat(kq) }
   */
  function batDau(o) {
    khoiDom();
    dung();
    s = {
      o: o, van: o.van, nen: o.nen, hinhXe: o.hinhXe,
      dangChay: true, chay: false, giaiDoan: 'dem_nguoc', demNguoc: 3.2,
      t: 0, d: 0, v: 0, vMucTieu: V_CO_BAN, lan: 1, xeX: 0, lac: 0,
      cong: null, tram: null, dich: null, cho: 0.2,
      diem: 0, chuoi: 0, tangToc: 0, heSo: o.heSoDau || 1,
      hat: [], chuBay: [], moc: [], veDichLuc: 0,
      lanDauHuongDan: true, raf: 0, tCuoi: 0
    };
    doKichThuoc();
    capNhatNutAm();
    an(dom.baiHoc, !o.xemBaiHoc);
    K().dongHoiVeDao(dom.man);
    dom.gyHinh.src = o.hinhGoiY || '';
    dom.phHinh.src = o.hinhGoiY || '';
    chu(dom.bongNhan, 'Bóng kỷ lục của ' + (o.tenBe || 'con'));
    ['tram', 'ph', 'tam', 'tangToc', 'lao', 'gyBong', 'veDich'].forEach(function (k) { an(dom[k], true); });
    an(dom.demNguoc, false);
    chu(dom.demSo, 3);
    an(dom.huongDan, false);
    an(dom.cau, true);
    chu(dom.kyLuc, o.kyLuc && o.kyLuc.giay ? 'Kỷ lục ' + dongHo(o.kyLuc.giay) : 'Chưa có kỷ lục');
    s.van.batDau({ he_so_thoi_gian: s.heSo, tram_dung: !!(o.man && o.man.tram_dung), so_lan: 3 });
    capNhatHud(true);
    s.tCuoi = performance.now();
    s.raf = requestAnimationFrame(khung);
  }

  function dung() {
    if (s && s.raf) cancelAnimationFrame(s.raf);
    if (s) s.dangChay = false;
  }

  function khung(tNow) {
    if (!s || !s.dangChay) return;
    const dt = Math.min(0.05, Math.max(0, (tNow - s.tCuoi) / 1000));
    s.tCuoi = tNow;
    capNhat(dt);
    // Tạm dừng, xem lời giải, trạm dừng: cảnh đứng yên dưới lớp phủ, chỉ vẽ một lần khi đổi trạng thái (đỡ tốn pin iPad)
    const dung = s.giaiDoan === 'tam_dung' || s.giaiDoan === 'phan_hoi' || s.giaiDoan === 'tram';
    if (!dung || s.daVeDung !== s.giaiDoan || s.veLai) { ve(); s.veLai = false; }
    s.daVeDung = dung ? s.giaiDoan : null;
    s.raf = requestAnimationFrame(khung);
  }

  /* ---------------- Cập nhật trạng thái ---------------- */

  function capNhat(dt) {
    const gd = s.giaiDoan;
    if (gd === 'tam_dung' || gd === 'phan_hoi') return;

    if (gd === 'dem_nguoc') {
      const truoc = Math.ceil(s.demNguoc - 0.2);
      s.demNguoc -= dt;
      const sau = Math.ceil(s.demNguoc - 0.2);
      if (sau !== truoc) {
        if (sau > 0) { chu(dom.demSo, sau); window.AmThanh.bat('dem_nguoc'); }
        else { chu(dom.demSo, 'Xuất phát!'); window.AmThanh.bat('xuat_phat'); }
      }
      if (s.demNguoc <= 0) { an(dom.demNguoc, true); s.giaiDoan = 'chay'; s.chay = true; }
      s.v += (V_CO_BAN * 0.2 - s.v) * Math.min(1, dt * 2);
      s.d += s.v * dt;
      return;
    }

    // Tốc độ
    let vMuc = V_CO_BAN;
    if (s.tangToc > 0) { s.tangToc -= dt; vMuc = V_TANG; if (s.tangToc <= 0) an(dom.tangToc, true); }
    if (s.cong && s.cong.goiY) vMuc = Math.min(vMuc, V_GOI_Y);
    if (s.cong && s.cong.lao) vMuc = V_LAO;
    if (s.cham > 0) { s.cham -= dt; vMuc = V_CHAM; }
    if (s.tram && !s.tram.xong && s.tram.z <= hh.zXe + 3) vMuc = 0;
    if (gd === 'tram') vMuc = 0;
    if (s.veDichLuc) vMuc = V_CO_BAN * 0.6;
    s.v += (vMuc - s.v) * Math.min(1, dt * (vMuc > s.v ? 2.2 : 3.2));
    s.d += s.v * dt;
    if (!s.veDichLuc && gd !== 'tram') s.t += dt;

    // Xe trượt sang làn
    const xMuc = s.lan - 1;
    s.xeX += (xMuc - s.xeX) * Math.min(1, dt * 11);
    if (s.lac > 0) s.lac = Math.max(0, s.lac - dt);

    // Cổng câu hỏi
    if (s.cong) {
      s.cong.z -= s.v * dt;
      if (!s.cong.daQua && s.cong.z <= hh.zXe) quaCong();
      if (s.cong && s.cong.daQua && s.cong.z < Z_GAN) { s.cho = s.cong.cho || 0.45; s.cong = null; }
    }
    // Trạm dừng
    if (s.tram) {
      s.tram.z -= s.v * dt;
      if (!s.tram.xong && !s.tram.mo && s.tram.z <= hh.zXe + 3.2 && s.v < 0.4) moTram();
      if (s.tram && s.tram.xong && s.tram.z < Z_GAN) { s.tram = null; s.cho = 0.3; }
    }
    // Vạch đích
    if (s.dich) {
      s.dich.z -= s.v * dt;
      if (!s.veDichLuc && s.dich.z <= hh.zXe) veDich();
    }
    if (s.veDichLuc && performance.now() - s.veDichLuc > 1600 && !s.daBaoXong) { s.daBaoXong = true; ketThuc(false); }

    // Câu kế tiếp
    if (!s.cong && !s.tram && !s.dich && !s.doiPhanHoi && gd === 'chay') {
      s.cho -= dt;
      if (s.cho <= 0) sinhCauMoi();
    }

    // Hạt, chữ bay
    s.hat = s.hat.filter(function (p) { p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g || 0) * dt; return p.t > 0; });
    s.chuBay = s.chuBay.filter(function (p) { p.t -= dt; p.y -= 40 * dt; return p.t > 0; });
    capNhatHud(false);
  }

  function sinhCauMoi() {
    const dang = s.van.dangKeTiep();
    if (!dang) { s.dich = { z: 44 }; an(dom.cau, true); an(dom.lao, true); return; }
    if (dang === 'nhap_so') { s.tram = { z: 38 }; an(dom.cau, true); an(dom.lao, true); return; }
    const q = s.van.cauTiep();
    const kn = window.NganHang.KY_NANG[q.ky_nang];
    const T = gioi(kn.giay * s.heSo, 5, 26);
    const z0 = hh.zXe + T * V_CO_BAN;
    s.cong = { q: q, z: z0, z0: z0, T: T, daQua: false, lao: false, goiY: false, chuDong: false, loaiBo: null, tQuyet: null };
    chu(dom.de, q.de);
    an(dom.cau, false);
    an(dom.lao, false);
    an(dom.gyBong, true);
    dom.cau.classList.remove('nay');
    void dom.cau.offsetWidth;
    dom.cau.classList.add('nay');
    if (docDe()) window.AmThanh.doc(q.de_doc);
  }

  /* ---------------- Thao tác của bé ---------------- */

  function doiLan(huong) {
    if (!s || s.giaiDoan !== 'chay' || s.veDichLuc) return;
    const cu = s.lan;
    const moi = gioi(cu + huong, 0, 2);
    if (moi === cu) return;
    s.lan = moi;
    window.AmThanh.bat('doi_lan');
    if (s.lanDauHuongDan) { s.lanDauHuongDan = false; an(dom.huongDan, true); }
    const c = s.cong;
    if (c && !c.daQua) {
      c.chuDong = true;
      c.tQuyet = window.NhatKy.msTrongCau();
      s.van.thaoTac('doi_lan', { tu: LAN[cu], den: LAN[moi], gia_tri_duoi_xe: c.q.lua_chon[moi].gia_tri });
    }
  }

  function laoToi() {
    const c = s && s.cong;
    if (!c || c.daQua || c.lao || s.giaiDoan !== 'chay') return;
    c.lao = true;
    c.chuDong = true;
    c.tQuyet = window.NhatKy.msTrongCau();
    s.van.thaoTac('cham', { doi_tuong: 'nut_lao_toi', gia_tri: c.q.lua_chon[s.lan].gia_tri, lan: LAN[s.lan] });
    window.AmThanh.bat('tang_toc');
    an(dom.lao, true);
  }

  function ngheLai() {
    const q = s && ((s.cong && !s.cong.daQua && s.cong.q) || (s.giaiDoan === 'tram' && s.tram && s.tram.q));
    if (!q) return;
    s.van.thaoTac('nghe_lai', { doi_tuong: 'de' });
    window.AmThanh.doc(q.de_doc);
  }

  function xinGoiY() {
    if (!s) return;
    const q = s.van.q;
    if (!q || q.xong || !(s.giaiDoan === 'chay' || s.giaiDoan === 'tram')) return;
    if (s.giaiDoan === 'chay' && (!s.cong || s.cong.daQua)) return;
    const capToi = q.goiYCap + 1;
    let them = null;
    if (capToi === 3 && s.cong && q.lua_chon) {
      // Cấp 3: gạch bớt một cổng sai (ưu tiên cổng lệch nhỏ, giữ lại cổng mang lỗi có tên)
      const sai = q.lua_chon.map(function (x, i) { return { x: x, i: i }; }).filter(function (o) { return o.x.gia_tri !== q.dap_an; });
      sai.sort(function (a, b) { return (a.x.loi[0] === 'khac' || a.x.loi[0] === 'dem-lech' ? 0 : 1) - (b.x.loi[0] === 'khac' || b.x.loi[0] === 'dem-lech' ? 0 : 1); });
      if (sai.length) { s.cong.loaiBo = sai[0].i; them = { loai_bo: sai[0].x.gia_tri }; }
    }
    const g = s.van.goiY(them);
    if (!g) return;
    if (g.cap >= 3) dom.tramGoiY.disabled = true;
    if (s.cong) s.cong.goiY = true;
    chu(dom.gyChu, g.loi);
    an(dom.gyBong, false);
    if (s.giaiDoan === 'tram') chu(dom.tramBao, g.loi);
    window.AmThanh.bat('cham');
    window.AmThanh.doc(g.loi);
  }

  /* ---------------- Qua cổng ---------------- */

  function quaCong() {
    const c = s.cong;
    c.daQua = true;
    an(dom.lao, true);
    if (c.q.stt >= 2) { s.lanDauHuongDan = false; an(dom.huongDan, true); }
    const chon = c.q.lua_chon[s.lan];
    // Bé không đổi làn, không lao tới mà xe tự vào cổng sai: bé chưa chọn, không gán lỗi cho bé
    if (!c.chuDong && window.NganHang.nhanBietLoi(c.q.cau_truc, chon.gia_tri).length) { tuVaoCong(c, chon); return; }
    const kq = s.van.traLoi(chon.gia_tri, { lan: LAN[s.lan], chu_dong: c.chuDong });
    const xX = hh.W / 2 + s.xeX * hh.laneW;
    if (kq.dung) {
      c.dung = true;
      window.AmThanh.bat('dung');
      const cong = kq.ketQua === 'dung_ngay' ? 100 + (s.van.chuoiDung >= 3 ? 50 : 0) : 30;
      s.diem += cong;
      s.chuBay.push({ x: xX, y: hh.yXe - hh.xeW * 0.6, t: 1.1, chu: '+' + cong, mau: '#fff' });
      if (kq.quaMong) s.chuBay.push({ x: xX + 70, y: hh.yXe - hh.xeW * 0.4, t: 1.2, chu: '+' + kq.quaMong + ' quả mọng', mau: '#ffe27a', nho: true });
      phao(xX, hh.yXe - hh.xeW * 0.3, 26);
      if (s.van.chuoiDung >= 3) {
        s.tangToc = 4;
        an(dom.tangToc, false);
        chu(dom.tangToc.querySelector('small'), s.van.chuoiDung + ' câu đúng liền');
        window.AmThanh.bat('tang_toc');
      }
      // Chỉnh thời gian cho câu sau: quyết nhanh thì bớt chút thời gian
      if (c.tQuyet != null && c.tQuyet < c.T * 500) s.heSo = Math.max(0.7, s.heSo * 0.95);
      an(dom.gyBong, true);
      ghiMoc();
    } else {
      c.dung = false;
      s.doiPhanHoi = true;
      s.cham = 1.1;
      s.lac = 0.7;
      s.tangToc = 0;
      an(dom.tangToc, true);
      window.AmThanh.bat('sai');
      khoi(xX, hh.yXe - hh.xeW * 0.1);
      s.heSo = Math.min(1.6, s.heSo * 1.15);
      const s0 = s;
      setTimeout(function () {
        if (s !== s0 || !s.dangChay) return;
        // Bé tạm dừng (hoặc app ra nền) trong lúc chờ: mở lời giải khi bé bấm Chơi tiếp
        if (s.giaiDoan === 'tam_dung') s.phCho = { q: c.q, giaTri: chon.gia_tri, kq: kq };
        else moPhanHoi(c.q, chon.gia_tri, kq);
      }, 650);
    }
  }

  /** Xe tự vào cổng sai khi bé chưa chọn: câu tính là hết giờ (không có lỗi của bé), quay lại sau như câu sai. */
  function tuVaoCong(c, chon) {
    c.dung = false;
    c.cho = 2.4; // chờ lâu hơn trước câu sau để bé kịp nghe lời nhắc
    const lai = s.van.seOnLai();
    s.van.thaoTac('tu_vao_cong', { gia_tri_duoi_xe: chon.gia_tri, lan: LAN[s.lan] });
    s.van.hetGio();
    ghiMoc();
    s.cham = 0.8;
    s.tangToc = 0;
    an(dom.tangToc, true);
    s.heSo = Math.min(1.6, s.heSo * 1.15);
    window.AmThanh.bat('cham');
    const loi = 'Xe tự chạy vào cổng rồi. Con chạm bên trái, bên phải để chọn cổng nhé!' + (lai ? ' Câu này sẽ quay lại.' : '');
    chu(dom.gyChu, loi);
    an(dom.gyBong, false);
    window.AmThanh.doc(loi);
  }

  /** Mốc thời gian hoàn thành từng câu mới của ván (để dựng bóng kỷ lục lần sau). */
  function ghiMoc() {
    const q = s.van.q;
    if (q && q.xong && q.goc && s.van.dem.moi) s.moc[s.van.dem.moi - 1] = Math.round(s.t * 10) / 10;
  }

  /* ---------------- Màn phản hồi khi sai ---------------- */

  function moPhanHoi(q, giaTri, kq) {
    s.giaiDoan = 'phan_hoi';
    s.phMoLuc = performance.now();
    s.phNut = 'choi_tiep';
    dom.phNoiDung.innerHTML = window.PhanHoi.noiDung(q, giaTri, kq);
    const qt = window.PhanHoi.queTinh(q.cau_truc);
    dom.phQue.innerHTML = qt || '';
    an(dom.phQue, true);
    an(dom.phQueNut, !qt);
    chu(dom.phQueNut, 'Xem bằng que tính');
    chu(dom.phNote, s.van.seOnLai() ? 'Câu này sẽ quay lại sau 2 câu nữa để con tự làm' : 'Lần sau gặp lại, con làm được mà!');
    an(dom.ph, false);
    an(dom.gyBong, true);
    // Đọc cả tên lỗi, từng bước và câu "Vậy...": bé chưa đọc được chữ vẫn nghe đủ lời giải (nút loa trên thẻ đọc lại)
    s.phDoc = window.PhanHoi.loiDoc(q, giaTri, kq);
    window.AmThanh.docChuoi(s.phDoc);
    setTimeout(function () { try { dom.phTiep.focus(); } catch (e) { /* bỏ qua */ } }, 50);
  }

  /** Chuyển qua lại giữa lời giải đặt tính và bảng que tính (thay chỗ nhau để thẻ không tràn màn hình). */
  function moQueTinh() {
    if (!s || s.giaiDoan !== 'phan_hoi') return;
    const dangQue = dom.phQue.classList.contains('hidden');
    if (dangQue) {
      s.phNut = 'que_tinh';
      s.van.thaoTac('cham', { doi_tuong: 'nut_que_tinh' });
    }
    an(dom.phQue, !dangQue);
    const giai = dom.phNoiDung.querySelector('.ph-giai');
    if (giai) an(giai, dangQue);
    chu(dom.phQueNut, dangQue ? 'Xem đặt tính' : 'Xem bằng que tính');
  }

  function dongPhanHoi(nut) {
    if (!s || s.giaiDoan !== 'phan_hoi') return;
    const giay = (performance.now() - s.phMoLuc) / 1000;
    s.van.phanHoiXem(giay, s.phNut === 'que_tinh' ? 'que_tinh' : nut);
    s.van.ketThucCauSai();
    ghiMoc();
    s.doiPhanHoi = false;
    an(dom.ph, true);
    window.AmThanh.dungDoc();
    if (s.tram && s.tram.q) { s.tram.xong = true; s.tram.q = null; }
    if (s.cong) { s.cong.z = Math.min(s.cong.z, hh.zXe * 0.9); }
    s.giaiDoan = 'chay';
  }

  /* ---------------- Trạm dừng: tự gõ đáp án ---------------- */

  function moTram() {
    const q = s.van.cauTiep();
    s.tram.mo = true;
    s.tram.q = q;
    s.tram.nhap = '';
    s.giaiDoan = 'tram';
    chu(dom.tramDe, q.de);
    chu(dom.tramO, '');
    chu(dom.tramBao, 'Con tự gõ đáp án nhé');
    dom.tramBao.classList.remove('sai');
    dom.tramGoiY.disabled = false;
    chu(dom.de, q.de);
    an(dom.cau, false);
    an(dom.tram, false);
    if (docDe()) window.AmThanh.doc(q.de_doc);
  }

  function tramGo(k) {
    if (!s || s.giaiDoan !== 'tram' || s.tram.nhap.length >= 3) return;
    s.tram.nhap += k;
    window.AmThanh.bat('go_phim');
    chu(dom.tramO, s.tram.nhap);
    s.van.thaoTac('go_so', { gia_tri: Number(k), hien_tai: s.tram.nhap });
  }
  function tramXoa() {
    if (!s || s.giaiDoan !== 'tram' || !s.tram.nhap) return;
    s.tram.nhap = s.tram.nhap.slice(0, -1);
    chu(dom.tramO, s.tram.nhap);
    s.van.thaoTac('xoa', { hien_tai: s.tram.nhap });
  }
  function tramXong() {
    if (!s || s.giaiDoan !== 'tram' || !s.tram.nhap) return;
    const v = Number(s.tram.nhap);
    const kq = s.van.traLoi(v, { nhap: s.tram.nhap });
    if (kq.dung) {
      window.AmThanh.bat('dung');
      const cong = kq.ketQua === 'dung_ngay' ? 150 : 40;
      s.diem += cong;
      s.chuBay.push({ x: hh.W / 2, y: hh.yXe - hh.xeW * 0.6, t: 1.1, chu: '+' + cong, mau: '#fff' });
      phao(hh.W / 2, hh.H * 0.45, 30);
      an(dom.tram, true);
      an(dom.gyBong, true);
      s.tram.xong = true;
      s.tram.q = null;
      ghiMoc();
      s.giaiDoan = 'chay';
      return;
    }
    if (kq.thuLai) {
      window.AmThanh.bat('sai');
      chu(dom.tramBao, 'Chưa đúng, con thử lại nhé');
      dom.tramBao.classList.add('sai');
      s.tram.nhap = '';
      chu(dom.tramO, '');
      return;
    }
    window.AmThanh.bat('sai');
    an(dom.tram, true);
    moPhanHoi(s.tram.q, v, kq);
  }

  /* ---------------- Tạm dừng, thoát, về đích ---------------- */

  function tamDung(nguon) {
    if (!s || !(s.giaiDoan === 'chay' || s.giaiDoan === 'dem_nguoc')) return;
    s.giaiTruoc = s.giaiDoan;
    s.giaiDoan = 'tam_dung';
    window.NhatKy.tamDung(nguon);
    an(dom.tam, false);
    capNhatNutAm();
  }
  function tiepTuc(nguon) {
    if (!s || s.giaiDoan !== 'tam_dung') return;
    window.NhatKy.tiepTuc(nguon);
    s.giaiDoan = s.giaiTruoc || 'chay';
    an(dom.tam, true);
    K().dongHoiVeDao(dom.man);
    s.tCuoi = performance.now();
    const cho = s.phCho;
    s.phCho = null;
    if (cho) moPhanHoi(cho.q, cho.giaTri, cho.kq);
  }
  function thoat() {
    if (!s) return;
    const o = s.o;
    an(dom.tam, true);
    K().dongHoiVeDao(dom.man);
    const giay = s.t;
    s.dangChay = false;
    cancelAnimationFrame(s.raf);
    window.NhatKy.tiepTuc('thoat');
    s.van.ketThuc(true, { ly_do: 've_dao', giay_dua: Math.round(giay * 10) / 10, diem: s.diem }).then(function (kq) {
      if (o.onThoat) o.onThoat(kq);
    });
  }

  function veDich() {
    s.veDichLuc = performance.now();
    an(dom.veDich, false);
    an(dom.cau, true);
    an(dom.tangToc, true);
    window.AmThanh.bat('hoan_thanh');
    for (let i = 0; i < 4; i++) phao(hh.W * (0.2 + 0.2 * i), hh.H * 0.4, 22);
  }

  function ketThuc(boDo) {
    const o = s.o;
    const giay = Math.round(s.t * 10) / 10;
    const kl = o.kyLuc;
    const duCau = s.van.dem.moi >= s.van.soCauDuKien();
    const kyLucMoi = !boDo && duCau && (!kl || !kl.giay || giay < kl.giay);
    s.dangChay = false;
    cancelAnimationFrame(s.raf);
    an(dom.veDich, true);
    s.van.ketThuc(!!boDo, { giay_dua: giay, diem: s.diem, ky_luc_moi: kyLucMoi }).then(function (kq) {
      kq.giayDua = giay;
      kq.diem = s.diem;
      kq.kyLucMoi = kyLucMoi;
      kq.moc = s.moc.slice();
      if (o.onXong) o.onXong(kq);
    });
  }

  /* ---------------- Hiệu ứng ---------------- */

  function phao(x, y, n) {
    if (CO_GIAM_DONG) n = Math.round(n / 3);
    const mau = ['#ffd166', '#ef476f', '#06d6a0', '#118ab2', '#ff8a1f', '#b388ff'];
    for (let i = 0; i < n; i++) {
      const g = Math.random() * Math.PI * 2, v = 120 + Math.random() * 260;
      s.hat.push({ x: x, y: y, vx: Math.cos(g) * v, vy: Math.sin(g) * v - 160, g: 520, t: 0.9 + Math.random() * 0.5, r: 4 + Math.random() * 4, mau: mau[i % mau.length], loai: 'phao' });
    }
  }
  function khoi(x, y) {
    for (let i = 0; i < 10; i++) {
      s.hat.push({ x: x + (Math.random() - 0.5) * 60, y: y, vx: (Math.random() - 0.5) * 50, vy: -40 - Math.random() * 50, g: 0, t: 0.8 + Math.random() * 0.4, r: 14 + Math.random() * 14, mau: 'rgba(160,160,170,0.55)', loai: 'khoi' });
    }
  }

  /* ---------------- HUD ---------------- */

  function capNhatHud(tatCa) {
    // Tính cả câu sai quay lại, để cờ đích và vòng 3/3 không tới trước khi hết câu
    const td = s.van.tienDo();
    const tong = td.tong;
    const vong = Math.min(3, 1 + Math.floor(td.xong * 3 / tong));
    chu(dom.diem, s.diem.toLocaleString('vi-VN'));
    chu(dom.vong, 'Vòng ' + vong + '/3');
    chu(dom.gio, dongHo(s.t));
    let p = td.xong / tong;
    if (s.cong && !s.cong.daQua) p += (1 - (s.cong.z - hh.zXe) / (s.cong.z0 - hh.zXe)) / tong;
    const w = Math.round(gioi(p, 0, 1) * 1000) / 10 + '%';
    if (dom.tienDo.style.width !== w) dom.tienDo.style.width = w;
    if (tatCa) chu(dom.gio, '0:00');
  }

  /* ---------------- Vẽ ---------------- */

  function ve() {
    const g = dom.ctx;
    const W = hh.W, H = hh.H;
    g.setTransform(hh.dpr, 0, 0, hh.dpr, 0, 0);
    g.drawImage(hh.nen, 0, 0, W, hh.yh + 2 / hh.dpr);
    // dải cỏ xa ở chân trời
    g.fillStyle = '#9fd76a';
    g.fillRect(0, hh.yh, W, py(Z_XA) - hh.yh + 1);
    veDuong(g);
    veCotCo(g);
    if (s.dich) veVachDich(g, s.dich.z);
    if (s.tram) veTram(g, s.tram.z);
    veBong(g);
    if (s.cong && s.cong.z >= hh.zXe) veCong(g, s.cong);
    veXe(g);
    if (s.cong && s.cong.z < hh.zXe) veCong(g, s.cong);
    veHat(g);
  }

  function tu(g, xa, ya, xb, yb, xc, yc, xd, yd) {
    g.beginPath(); g.moveTo(xa, ya); g.lineTo(xb, yb); g.lineTo(xc, yc); g.lineTo(xd, yd); g.closePath(); g.fill();
  }

  function veDuong(g) {
    const W = hh.W;
    const nMin = Math.floor((s.d + Z_GAN) / SEG);
    const nMax = Math.floor((s.d + Z_XA) / SEG);
    for (let n = nMax; n >= nMin; n--) {
      const zN = Math.max(Z_GAN, n * SEG - s.d);
      const zF = n * SEG - s.d + SEG;
      if (zF <= Z_GAN) continue;
      const yN = py(zN), yF = py(zF);
      const le = n % 2 === 0;
      g.fillStyle = le ? '#8fd14f' : '#80c445';
      g.fillRect(0, yF, W, yN - yF + 1);
      const r = NUA_DUONG + 0.16;
      g.fillStyle = le ? '#ef476f' : '#ffffff';
      tu(g, px(-r, zF), yF, px(r, zF), yF, px(r, zN), yN + 1, px(-r, zN), yN + 1);
      g.fillStyle = le ? '#6d7486' : '#686f81';
      tu(g, px(-NUA_DUONG, zF), yF, px(NUA_DUONG, zF), yF, px(NUA_DUONG, zN), yN + 1, px(-NUA_DUONG, zN), yN + 1);
      if (le) {
        g.fillStyle = 'rgba(255,255,255,0.92)';
        [-0.5, 0.5].forEach(function (x) {
          tu(g, px(x - 0.035, zF), yF, px(x + 0.035, zF), yF, px(x + 0.035, zN), yN + 1, px(x - 0.035, zN), yN + 1);
        });
      }
    }
  }

  const MAU_CO = ['#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#ff8a1f', '#b388ff'];
  function veCotCo(g) {
    const buoc = 8;
    const mMin = Math.floor((s.d + Z_GAN) / buoc) + 1;
    const mMax = Math.floor((s.d + 60) / buoc);
    for (let m = mMax; m >= mMin; m--) {
      const z = m * buoc - s.d;
      const z2 = z + buoc;
      [-1, 1].forEach(function (ben) {
        const xw = ben * (NUA_DUONG + 0.55);
        const x = px(xw, z), y = py(z), cao = 0.55 * hh.F / z, rong = Math.max(1.5, 0.05 * hh.Fx / z);
        // dây cờ tới cột kế tiếp (xa hơn)
        if (z2 < 60) {
          const x2 = px(xw, z2), y2 = py(z2) - 0.55 * hh.F / z2;
          const yTop = y - cao;
          g.strokeStyle = 'rgba(90,60,40,0.7)'; g.lineWidth = Math.max(1, rong * 0.4);
          g.beginPath(); g.moveTo(x, yTop); g.quadraticCurveTo((x + x2) / 2, (yTop + y2) / 2 + cao * 0.12, x2, y2); g.stroke();
          const soCo = 4;
          for (let i = 1; i <= soCo; i++) {
            const t = i / (soCo + 1);
            const cx = x + (x2 - x) * t, cy = yTop + (y2 - yTop) * t + cao * 0.12 * 4 * t * (1 - t);
            const k = cao * 0.16 * (1 - t * 0.5);
            g.fillStyle = MAU_CO[(m * 3 + i + (ben > 0 ? 2 : 0)) % MAU_CO.length];
            g.beginPath(); g.moveTo(cx - k * 0.6, cy); g.lineTo(cx + k * 0.6, cy); g.lineTo(cx, cy + k * 1.3); g.closePath(); g.fill();
          }
        }
        g.fillStyle = '#8a5a35';
        g.fillRect(x - rong / 2, y - cao, rong, cao);
      });
    }
  }

  function tron(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  function veCong(g, c) {
    const z = Math.max(c.z, 0.35);
    const q = c.q;
    const W = hh.W;
    const tiLe = 1 - gioi((c.z - hh.zXe) / (c.z0 - hh.zXe), 0, 1);
    const rongPhoiCanh = 0.84 * hh.Fx / z;
    const rongToiThieu = Math.min(W * 0.2, hh.H * 0.26) * (0.86 + 0.28 * tiLe);
    const rong = Math.max(rongPhoiCanh, rongToiThieu);
    const khoang = Math.max(hh.Fx / z, rong * 1.1);
    const cao = rong * 0.56;
    const yDat = py(z);
    const caoCot = Math.max(0.62 * hh.F / z, cao * 0.25);
    const yDay = Math.min(yDat - caoCot, yDat - 4);
    const mo = c.z < hh.zXe ? gioi((c.z - Z_GAN) / (hh.zXe - Z_GAN), 0, 1) : 1;
    g.save();
    g.globalAlpha = mo;
    for (let i = 0; i < 3; i++) {
      const x = W / 2 + (i - 1) * khoang;
      const trai = x - rong / 2;
      const yTren = yDay - cao;
      // cột
      if (rongPhoiCanh > rongToiThieu * 0.6) {
        g.fillStyle = '#e9edf3';
        const cr = Math.max(2, rong * 0.05);
        g.fillRect(trai + rong * 0.12, yDay, cr, yDat - yDay);
        g.fillRect(trai + rong * 0.88 - cr, yDay, cr, yDat - yDay);
      }
      const bi = c.loaiBo === i;
      const daChon = c.daQua && i === s.lan;
      g.fillStyle = 'rgba(0,0,0,0.18)';
      tron(g, trai + 3, yTren + 5, rong, cao, cao * 0.28); g.fill();
      g.fillStyle = bi ? '#b8bdc8' : daChon ? (c.dung ? '#06d6a0' : '#ef476f') : MAU_BANG[i];
      tron(g, trai, yTren, rong, cao, cao * 0.28); g.fill();
      g.lineWidth = Math.max(2, cao * 0.07);
      g.strokeStyle = bi ? '#8c92a0' : daChon ? '#ffffff' : MAU_VIEN[i];
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.22)';
      tron(g, trai + rong * 0.06, yTren + cao * 0.08, rong * 0.88, cao * 0.3, cao * 0.14); g.fill();
      const so = String(q.lua_chon[i].gia_tri);
      const co = Math.min(cao * 0.72, rong * 0.9 / Math.max(1.6, so.length * 0.62));
      g.font = '800 ' + co + 'px "Baloo 2", "Arial Rounded MT Bold", system-ui, sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineJoin = 'round';
      g.lineWidth = co * 0.16; g.strokeStyle = 'rgba(20,20,50,0.45)';
      g.strokeText(so, x, yTren + cao * 0.56);
      g.fillStyle = '#ffffff';
      g.fillText(so, x, yTren + cao * 0.56);
      if (bi) {
        g.strokeStyle = '#ef476f'; g.lineWidth = Math.max(4, cao * 0.1); g.lineCap = 'round';
        g.beginPath(); g.moveTo(trai + rong * 0.2, yTren + cao * 0.2); g.lineTo(trai + rong * 0.8, yTren + cao * 0.85);
        g.moveTo(trai + rong * 0.8, yTren + cao * 0.2); g.lineTo(trai + rong * 0.2, yTren + cao * 0.85); g.stroke();
      }
    }
    g.restore();
  }

  function veTram(g, z0) {
    const z = Math.max(z0, 0.5);
    const x = px(NUA_DUONG + 0.35, z), y = py(z);
    const rong = Math.max(0.9 * hh.Fx / z, 90), cao = rong * 0.42;
    const yDay = y - Math.max(0.5 * hh.F / z, 12);
    g.fillStyle = '#e9edf3';
    g.fillRect(x - 3, yDay, 6, y - yDay);
    g.fillStyle = '#ffd166';
    tron(g, x - rong / 2, yDay - cao, rong, cao, cao * 0.25); g.fill();
    g.strokeStyle = '#b8860b'; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#5a3b00';
    g.font = '800 ' + cao * 0.42 + 'px "Baloo 2", system-ui, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('TRẠM DỪNG', x, yDay - cao * 0.5);
    // vạch dừng trên đường
    if (z < 40) {
      const yv = py(z), yv2 = py(z + 0.35);
      for (let i = 0; i < 8; i++) {
        g.fillStyle = i % 2 ? '#ffffff' : '#ffd166';
        const xa = -NUA_DUONG + i * (2 * NUA_DUONG / 8), xb = xa + 2 * NUA_DUONG / 8;
        tu(g, px(xa, z + 0.35), yv2, px(xb, z + 0.35), yv2, px(xb, z), yv, px(xa, z), yv);
      }
    }
  }

  function veVachDich(g, z0) {
    const z = Math.max(z0, 0.4);
    const yv = py(z), yv2 = py(z + 0.5);
    const o = 12;
    for (let i = 0; i < o; i++) for (let j = 0; j < 2; j++) {
      g.fillStyle = (i + j) % 2 ? '#222' : '#fff';
      const xa = -NUA_DUONG + i * (2 * NUA_DUONG / o), xb = xa + 2 * NUA_DUONG / o;
      const za = z + j * 0.25, zb = za + 0.25;
      tu(g, px(xa, zb), py(zb), px(xb, zb), py(zb), px(xb, za), py(za), px(xa, za), py(za));
    }
    // cổng đích
    const cao = 1.6 * hh.F / z;
    const xT = px(-NUA_DUONG - 0.2, z), xP = px(NUA_DUONG + 0.2, z);
    const cr = Math.max(3, 0.1 * hh.Fx / z);
    g.fillStyle = '#e9edf3';
    g.fillRect(xT - cr / 2, yv - cao, cr, cao);
    g.fillRect(xP - cr / 2, yv - cao, cr, cao);
    const bh = Math.max(18, 0.36 * hh.F / z);
    g.fillStyle = '#ef476f';
    g.fillRect(xT, yv - cao, xP - xT, bh);
    g.fillStyle = '#fff';
    g.font = '800 ' + bh * 0.72 + 'px "Baloo 2", system-ui, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('VỀ ĐÍCH', (xT + xP) / 2, yv - cao + bh * 0.54);
    void yv2;
  }

  function veXe(g) {
    const img = s.hinhXe;
    const w = hh.xeW;
    const h = img && img.naturalWidth ? w * img.naturalHeight / img.naturalWidth : w;
    const x = hh.W / 2 + s.xeX * hh.laneW;
    const nhun = CO_GIAM_DONG ? 0 : Math.sin(performance.now() / 55) * Math.min(2, s.v * 0.2);
    const yDay = hh.H * 0.985 + nhun;
    let goc = (s.lan - 1 - s.xeX) * 0.18;
    if (s.lac > 0 && !CO_GIAM_DONG) goc += Math.sin(s.lac * 28) * 0.08 * s.lac;
    // bóng dưới xe
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.beginPath(); g.ellipse(x, yDay - h * 0.03, w * 0.46, h * 0.06, 0, 0, Math.PI * 2); g.fill();
    // lửa tăng tốc
    if ((s.tangToc > 0 || (s.cong && s.cong.lao && !s.cong.daQua)) && !CO_GIAM_DONG) {
      const t = performance.now() / 60;
      [-0.16, 0.16].forEach(function (k) {
        const fx = x + k * w, fy = yDay - h * 0.2;
        const dai = h * (0.18 + 0.06 * Math.sin(t + k * 9));
        const gr = g.createLinearGradient(fx, fy, fx, fy + dai);
        gr.addColorStop(0, 'rgba(255,240,120,0.95)'); gr.addColorStop(1, 'rgba(255,90,30,0)');
        g.fillStyle = gr;
        g.beginPath(); g.moveTo(fx - w * 0.05, fy); g.lineTo(fx + w * 0.05, fy); g.lineTo(fx, fy + dai); g.closePath(); g.fill();
      });
    }
    g.save();
    g.translate(x, yDay);
    g.rotate(goc);
    if (img && img.naturalWidth) g.drawImage(img, -w / 2, -h, w, h);
    else { g.fillStyle = '#ef476f'; g.fillRect(-w / 2, -h * 0.6, w, h * 0.6); }
    g.restore();
  }

  function veBong(g) {
    const kl = s.o.kyLuc;
    if (!kl || !kl.moc || !kl.moc.length || !(s.giaiDoan === 'chay' || s.giaiDoan === 'tram') || s.veDichLuc) { an(dom.bongNhan, true); return; }
    let pg = 0;
    const m = kl.moc;
    for (let i = 0; i < m.length; i++) {
      if (s.t >= m[i]) pg = i + 1;
      else { const truoc = i ? m[i - 1] : 0; pg = i + gioi((s.t - truoc) / Math.max(0.1, m[i] - truoc), 0, 1); break; }
    }
    let pm = s.van.dem.moi;
    if (s.cong && !s.cong.daQua) pm += 1 - gioi((s.cong.z - hh.zXe) / (s.cong.z0 - hh.zXe), 0, 1);
    const lech = pg - pm;
    if (!(lech > 0.08 && lech < 4)) { an(dom.bongNhan, true); return; }
    const z = hh.zXe + lech * 16;
    const img = s.hinhXe;
    const w = hh.xeW * hh.zXe / z;
    const h = img && img.naturalWidth ? w * img.naturalHeight / img.naturalWidth : w;
    const lanBong = s.lan === 2 ? 0 : 2;
    const x = px(lanBong - 1, z), y = py(z);
    g.save();
    g.globalAlpha = 0.38;
    if (img && img.naturalWidth) g.drawImage(img, x - w / 2, y - h, w, h);
    g.restore();
    an(dom.bongNhan, false);
    const st = dom.bongNhan.style;
    const l = Math.round(x) + 'px', t = Math.round(y - h - 26) + 'px';
    if (st.left !== l) st.left = l;
    if (st.top !== t) st.top = t;
  }

  function veHat(g) {
    s.hat.forEach(function (p) {
      g.globalAlpha = Math.min(1, p.t * 2);
      g.fillStyle = p.mau;
      if (p.loai === 'khoi') { g.beginPath(); g.arc(p.x, p.y, p.r * (1.6 - p.t), 0, Math.PI * 2); g.fill(); }
      else g.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r * 0.6);
    });
    g.globalAlpha = 1;
    s.chuBay.forEach(function (p) {
      g.globalAlpha = Math.min(1, p.t * 1.6);
      g.font = '800 ' + (p.nho ? 22 : 34) + 'px "Baloo 2", system-ui, sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 6; g.strokeStyle = 'rgba(30,20,60,0.6)'; g.lineJoin = 'round';
      g.strokeText(p.chu, p.x, p.y);
      g.fillStyle = p.mau;
      g.fillText(p.chu, p.x, p.y);
    });
    g.globalAlpha = 1;
  }

  window.DuaXe = {
    batDau: batDau,
    dung: dung,
    /** Dùng cho kiểm thử tự động: trạng thái hiện tại. */
    _trangThai: function () { return s; }
  };
  (window.DaoTroChoi = window.DaoTroChoi || {})['dua-xe'] = { ten: 'Đua Xe', khung: false, man: 'man-dua-xe', batDau: window.DuaXe.batDau };
})();
