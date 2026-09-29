/* ============================================================
   dao.js – Chế độ Đảo Khủng Long của Xe Tăng Thời Gian (giai đoạn 5)
   - Bật khi trang mở trong iframe của đảo: ?dao=1&man=<mã màn>, window.parent !== window và có window.parent.DaoCauNoi
     (hợp đồng ở dao-khung-long/js/cau-noi.js). Mở trực tiếp trên 3hoa.com thì game chạy y như cũ: XeTangDao.bat = false.
   - Đảo giữ ngân hàng câu, ván chơi và nhật ký; game là phần hình và tay cầm: mỗi câu hỏi đảo một lần (cauTiep),
     mỗi robot mang một lựa chọn (chữ, mặt đồng hồ dong_ho, hoặc hình SVG nhỏ), thẻ câu hỏi hiện de và hình SVG của đề.
     Đạn trúng robot nào thì gửi traLoi giá trị robot đó mang; đảo chấm.
   - Ở đảo: không menu, không chọn màn, không bài học, không hỏi đáp, không tim, không bảng kết quả, không ghi
     localStorage của game. Robot chỉ đi dạo chậm trong khoảng giữa thẻ câu hỏi và xe tăng, không bao giờ chạm xe tăng.
   - Sai hẳn (can_phan_hoi): robot bị gạch, game chờ màn "Gần đúng rồi" của đảo (phanHoi) rồi hỏi câu kế tiếp.
     Gợi ý 💡: ba cấp của đảo (goiY), cấp 3 cho một robot sai bay đi (them.loai_bo).
   - Nhật ký thao tác (lược đồ v1): xoay_nong khi bé chọn xong mục tiêu (chạm robot, hoặc dừng phím mũi tên 0,7 giây),
     ban khi đạn bay (giá trị, vị trí), cham robot đã gạch / phóng to hình, nghe_lai câu hỏi, di_chuyen xe tăng khi nhấc tay.
   Móc trong game.js đánh dấu [ĐẢO]; game.js gọi XeTangDao.gan(noiBo) cuối hàm boot.
   API: window.XeTangDao = { bat, gan, cauTiep, trungDan, ban, ngam, chonMucTieu, chamRobotSai, goiY, langThang,
                             tamDung, tiepTuc, veDao, ketThuc, nutBatDau, laiXe, ngheLai, phongTo, baoLoi, _trangThai }
   ============================================================ */
(function () {
  'use strict';

  /** Vị trí robot: cột tính từ trái (ở đảo robot luôn xếp một hàng, xem boardSize trong game.js). Đặt theo cột chứ không
      theo "trái/giữa/phải" vì đảo có thể gửi ít lựa chọn hơn số xin (câu chỉ có 3 số để so sánh). */
  const VI_TRI = ['cot_1', 'cot_2', 'cot_3', 'cot_4'];
  const CHO_TRUOC_PHAN_HOI = 700;   // ms: bé kịp thấy robot bị gạch trước khi màn "Gần đúng rồi" hiện
  const CHO_NGAM_PHIM = 700;        // ms: dừng phím mũi tên bấy lâu mới tính là đã chọn mục tiêu

  /** Tìm cầu nối của đảo; null nếu không phải chế độ đảo (hoặc khung cha khác tên miền). */
  function timCauNoi() {
    try {
      if (!/(?:^|[?&])dao=1(?:&|$)/.test(String(window.location.search || ''))) return null;
      if (!window.parent || window.parent === window) return null;
      const api = window.parent.DaoCauNoi;
      return api && typeof api.cauTiep === 'function' && typeof api.traLoi === 'function' ? api : null;
    } catch (e) { return null; }
  }

  const API = timCauNoi();
  if (!API) { window.XeTangDao = { bat: false }; return; }

  try { document.documentElement.classList.add('dao-mode'); } catch (e) { /* bỏ qua */ }

  let g = null;   // nội bộ game.js (gan)
  const s = {
    tt: {}, cau: null, n: 4, goiYCap: 0, lanBan: 0, ngamCuoi: -1, cachBan: 'cham', hengioNgam: 0,
    choPhanHoi: false, daBatDau: false, xong: false, quaMong: 0, xeX: 0.5, nguonDung: 'nut', loi: []
  };

  function $(id) { return document.getElementById(id); }
  function J(x) { return x == null ? x : JSON.parse(JSON.stringify(x)); }
  function tron2(v) { return Math.round(Math.max(0, Math.min(1, v)) * 100) / 100; }
  function h12(h) { h = Math.round(Number(h)) % 12; return h <= 0 ? h + 12 : h; }
  function Gs() { return g.G; }

  /** Ghi lỗi (không làm dừng game): XeTangDao._trangThai().loi để kiểm thử đọc. */
  function baoLoi(msg) {
    const m = String(msg && msg.message ? msg.message : msg);
    if (s.loi.length < 20) s.loi.push(m);
    try { console.warn('[xe-tang/dao]', m); } catch (e) { /* bỏ qua */ }
  }

  /** Gọi một hàm của cầu nối, trả về bản sao JSON (đối tượng của khung cha không bị giữ lại). */
  function goi(ten, a, b) {
    try { return J(API[ten](a, b)); } catch (e) { baoLoi(ten + ': ' + (e && e.message)); return null; }
  }
  function ghi(kieu, du) {
    try { API.thaoTac(kieu, du || {}); } catch (e) { baoLoi('thaoTac: ' + (e && e.message)); }
  }

  /* ---------------- Khởi động: thẻ bắt đầu ---------------- */

  function gan(noiBo) {
    g = noiBo;
    Gs().welcomed = true;                  // lời chào theo tên của hồ sơ 3hoa.com không dùng ở đảo
    s.tt = goi('sanSang') || {};
    apDungAmThanh();
    veTheBatDau();
  }

  /** Âm thanh và giọng đọc theo cài đặt của đảo (bé/bố mẹ bật tắt ở đảo). */
  function apDungAmThanh() {
    const am = s.tt.am_thanh || {};
    const tieng = am.tieng !== false;
    try {
      window.Sfx.setEnabled(tieng);
      window.Music.setEnabled(tieng);
      window.Voice.setEnabled(am.giong !== false);
    } catch (e) { baoLoi(e); }
  }

  function datChu(el, chu) { if (el) el.textContent = chu; }

  function veTheBatDau() {
    const m = s.tt.man || {};
    const be = s.tt.be || {};
    const tieuDe = document.querySelector('#menu .title');
    if (tieuDe) tieuDe.innerHTML = 'XE TĂNG<small>ĐẢO KHỦNG LONG</small>';
    datChu(document.querySelector('#menu .subtitle'), m.ten_day_du || m.ten || 'Bắn robot mang đáp án đúng');
    const loi = document.querySelector('#menu .game-benefits');
    if (loi) loi.innerHTML = '<span>Đọc câu hỏi ở trên</span><span>Chạm robot mang đáp án đúng</span><span>Cần giúp thì bấm 💡</span>';
    datChu($('btn-play'), '▶ Bắt đầu');
    datChu(document.querySelector('#menu .footer-note'), 'Robot chỉ đi dạo thôi, không làm hại xe tăng. Con cứ thong thả nhé!');
    const hinh = $('dao-be');
    if (hinh && (be.hinh_co_vu || be.hinh)) {
      hinh.src = be.hinh_co_vu || be.hinh;
      hinh.alt = be.ten_khung_long ? be.ten_khung_long + ' cổ vũ' : '';
      hinh.hidden = false;
    }
    const ve = $('btn-dao-ve');
    if (ve) ve.hidden = false;
    // Bảng tạm dừng: "🔊 Âm thanh" (am_thanh.tieng, như apDungAmThanh) + "🏝️ Về đảo"
    hangTamDung(ve, function () { return !s.tt.am_thanh || s.tt.am_thanh.tieng !== false; }, function (bat) {
      s.tt.am_thanh = Object.assign({}, s.tt.am_thanh, { tieng: bat });
      apDungAmThanh();
    });
    const qm = $('hud-berry');
    if (qm) {
      qm.hidden = false;
      const anh = $('hud-berry-img');
      try { if (anh) anh.src = new URL('assets/img/berry.webp', window.parent.location.href).href; } catch (e) { /* bỏ qua */ }
    }
    capNhatQuaMong(false);
  }

  /** Số lựa chọn theo bề rộng: iPad ngang 4 robot, cửa sổ hẹp (768 px) 3 robot, vẫn một hàng. */
  function soLuaChon() { return (Gs().W || 1024) >= 900 ? 4 : 3; }

  /** Màn giả cho bộ máy game: tên, số câu (đảo quyết định câu nào, khi nào hết). */
  function capMan() {
    const m = s.tt.man || {};
    const so = /-m(\d+)$/.exec(String(m.id || ''));
    return {
      id: 'dao', n: so ? Number(so[1]) : 0, title: m.ten || 'Đảo Khủng Long', icon: '🏝️', grade: 2, desc: '',
      questions: Math.max(1, Number(m.so_cau) || 8), fall: 24, speed: 1,
      gen: function () { return null; }, lesson: null, quiz: []
    };
  }

  /** Chạm "Bắt đầu" (thao tác này cũng mở khóa âm thanh trên iPad). */
  function nutBatDau() {
    if (s.daBatDau || s.xong) return;
    s.daBatDau = true;
    s.n = soLuaChon();
    goi('batDau', { so_lua_chon: s.n, robot: 'lang_thang', tim: false });
    g.startGame(capMan());
    s.xeX = 0.5;
  }

  /* ---------------- Câu hỏi ---------------- */

  /** Đọc thành lời một nhãn ngắn: dấu so sánh, giờ điện tử. */
  function docDuoc(nhan) {
    const t = String(nhan == null ? '' : nhan).trim();
    if (t === '<') return 'dấu bé hơn';
    if (t === '>') return 'dấu lớn hơn';
    if (t === '=') return 'dấu bằng';
    return g && g.speakable ? g.speakable(t) : t;
  }

  /** Ảnh cho lựa chọn là hình SVG nhỏ: thêm width/height theo viewBox để mọi trình duyệt biết kích thước. */
  function anhSvg(svg, opt) {
    const vb = /viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(svg);
    const w = vb ? Number(vb[1]) : 120, h = vb ? Number(vb[2]) : 80;
    opt.imgRatio = h > 0 ? w / h : 1.5;
    let src = String(svg);
    if (!/<svg[^>]*\swidth=/i.test(src)) src = src.replace(/<svg/i, '<svg width="' + w + '" height="' + h + '"');
    if (!/xmlns=/i.test(src)) src = src.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
    const im = new Image();
    im.onload = function () {
      if (!g) return;
      Gs().robots.forEach(function (r) { if (r.opt === opt) r.sprite = null; });   // vẽ lại bảng khi ảnh tải xong
    };
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src);
    return im;
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /**
   * Robot mang lựa chọn dưới dạng nào: 'dong_ho' (mặt đồng hồ kim vẽ bằng bộ vẽ của game), 'dien_tu' (bảng LED),
   * 'hinh' (hình SVG nhỏ) hoặc 'chu'. Dùng x.hien nếu đảo gửi; không thì đoán an toàn: có dong_ho mà đề KHÔNG có hình
   * ("Đồng hồ nào chỉ 3 giờ 15 phút?") thì vẽ mặt đồng hồ; đề đã có hình đồng hồ ("Đồng hồ chỉ mấy giờ?") thì lựa chọn là chữ,
   * nếu không bé chỉ việc so hai hình giống nhau. Nhãn dạng "15:30" vẽ thành đồng hồ điện tử.
   */
  function cachHien(x, nhan, coHinhDe) {
    const hien = x.hien;
    if (hien === 'dong_ho' && x.dong_ho) return 'dong_ho';
    if (hien === 'dien_tu') return 'dien_tu';
    if (hien === 'chu') return /^\d{1,2}:\d{2}$/.test(nhan) ? 'dien_tu' : 'chu';
    if (hien === 'hinh' && x.hinh) return 'hinh';
    if (x.dong_ho && !coHinhDe) return 'dong_ho';
    if (/^\d{1,2}:\d{2}$/.test(nhan)) return 'dien_tu';
    if (x.hinh && /<svg/i.test(x.hinh) && (x.nhan == null || x.nhan === '')) return 'hinh';
    return 'chu';
  }

  /** Đổi câu của đảo sang dạng câu của game (prompt, options, answer). */
  function chuyenCau(q0) {
    const coHinhDe = /<svg/i.test(q0.hinh || '');
    const options = (q0.lua_chon || []).map(function (x) {
      const nhan = String(x.nhan != null && x.nhan !== '' ? x.nhan : x.gia_tri);
      const o = { label: nhan, clock: null, digital: null, ok: !!x.dung, speech: docDuoc(nhan), gia_tri: x.gia_tri, vi_tri: x.vi_tri || null };
      const cach = cachHien(x, nhan, coHinhDe);
      const coGio = x.dong_ho && Number.isFinite(Number(x.dong_ho.h)) && Number.isFinite(Number(x.dong_ho.m));
      const phut = coGio ? Math.max(0, Math.min(59, Math.round(Number(x.dong_ho.m)))) : 0;
      if (cach === 'dong_ho' && coGio) {
        o.clock = { h: h12(x.dong_ho.h), m: phut };
        o.speech = 'Đồng hồ chỉ ' + docDuoc(nhan);
      } else if (cach === 'dien_tu') {
        o.digital = /^\d{1,2}:\d{2}$/.test(nhan) ? nhan : coGio ? pad2(Math.round(Number(x.dong_ho.h)) % 24) + ':' + pad2(phut) : null;
        if (!o.digital && x.hinh) o.img = anhSvg(x.hinh, o);
      } else if (cach === 'hinh') {
        o.img = anhSvg(x.hinh, o);
      }
      return o;
    });
    const nhanDung = q0.dap_an_nhan != null ? String(q0.dap_an_nhan) : String(q0.dap_an);
    return {
      kind: 'dao', dao: true, key: String(q0.ma_cau || ''), info: null, review: !!q0.on_lai,
      prompt: { text: String(q0.de || ''), speech: docDuoc(q0.de_doc || q0.de || ''), clocks: [], svg: /<svg/i.test(q0.hinh || '') ? q0.hinh : '' },
      options: options,
      answer: { label: nhanDung, speech: docDuoc(nhanDung) },
      explain: ''
    };
  }

  /** Câu kế tiếp từ đảo (null khi hết câu). Gọi từ nextQuestion của game.js. */
  function cauTiep() {
    if (s.xong) return null;
    const G = Gs();
    s.n = soLuaChon();
    let q0 = null;
    // Robot chỉ mang được lựa chọn: câu đảo gửi ở dạng không có lựa chọn (thao_tac_hinh, keo_tha, nhap_so…) là cấu hình màn
    // chưa đúng (màn của game cũ cần dang 'chon_dap_an'). Ghi lỗi, đóng câu bằng hetGio để ván không kẹt, hỏi câu sau.
    // Mỗi câu quay lại tối đa 2 lần nên vòng lặp luôn dừng.
    for (let lan = 0; lan < 200; lan++) {
      q0 = goi('cauTiep', { so_lua_chon: s.n, vi_tri: VI_TRI.slice(0, s.n) });
      if (!q0 || (q0.lua_chon && q0.lua_chon.length >= 2)) break;
      baoLoi('Câu ' + q0.ma_cau + ' (dạng ' + q0.dang + ') không có lựa chọn cho robot: bỏ qua');
      goi('hetGio');
      q0 = null;
    }
    if (!q0) return null;
    s.cau = q0;
    s.goiYCap = 0;
    s.lanBan = 0;
    s.ngamCuoi = -1;
    clearTimeout(s.hengioNgam);
    G.qTotal = Math.max(1, Number(q0.tong) || G.qTotal || 1);
    G.qIndex = Math.max(0, Math.min(Number(q0.stt) || 1, G.qTotal) - 1);
    return chuyenCau(q0);
  }

  /* ---------------- Robot đi dạo ---------------- */

  /** Robot đi lên xuống chậm (chu kì ~16 giây) trong khoảng dưới thẻ câu hỏi, lắc nhẹ sang hai bên; không bao giờ tới xe tăng. */
  function langThang(r, dt) {
    const G = Gs();
    if (r.ampY0 !== r.y0) {                 // vừa xuất hiện, hoặc vừa xếp lại khi xoay màn hình
      r.ampY0 = r.y0;
      r.amp = Math.max(0, Math.min(G.lineY - r.h * 0.5 - 14 - r.y0, G.tank.size * 2.4));
      if (r.wt == null) r.wt = 0;
    }
    r.wt += dt * (G.slowT > 0 ? 0.3 : 1);
    const w = 0.36 + (r.idx % 4) * 0.045;   // mỗi robot một nhịp: không đi đều như hàng lính
    r.y = r.y0 + r.amp * (0.5 - 0.5 * Math.cos(r.wt * w));
    r.x = r.x0 + Math.sin(r.ph * 1.3 + r.idx) * G.tank.size * 0.12;
  }

  /* ---------------- Thao tác của bé ---------------- */

  function viTriXY(r) {
    const G = Gs();
    return { x: tron2(r.x / Math.max(1, G.W)), y: tron2(r.y / Math.max(1, G.H)) };
  }

  /** Bé chọn xong mục tiêu: ghi xoay_nong một lần cho mỗi robot được chọn (không ghi từng khung hình nòng quay). */
  function ngam(r, via) {
    if (!r || !r.opt || s.xong) return;
    clearTimeout(s.hengioNgam);
    if (via) s.cachBan = via;
    if (s.ngamCuoi === r.id) return;
    s.ngamCuoi = r.id;
    const t = Gs().tank;
    const goc = Math.round((Math.atan2(r.y - (t.y - t.size * 0.25), r.x - t.x) + Math.PI / 2) * 180 / Math.PI);
    const p = viTriXY(r);
    ghi('xoay_nong', { doi_tuong: 'nong_sung', gia_tri: r.opt.gia_tri, vi_tri: r.opt.vi_tri, goc: goc, x: p.x, y: p.y, cach: s.cachBan });
  }

  /** Phím mũi tên: nòng quay theo robot đang chọn; chỉ ghi khi bé dừng lại trên một robot. */
  function chonMucTieu(r) {
    clearTimeout(s.hengioNgam);
    const cau = s.cau;
    s.hengioNgam = setTimeout(function () {
      const G = Gs();
      if (s.cau !== cau || G.state !== 'playing' || G.phase !== 'ask' || G.selected !== r.idx || r.dead || r.state === 'wrong') return;
      ngam(r, 'phim');
    }, CHO_NGAM_PHIM);
  }

  /** Đạn rời nòng: ghi ban kèm giá trị robot mang. */
  function ban(r) {
    if (!r || !r.opt || s.xong) return;
    s.lanBan++;
    const p = viTriXY(r);
    ghi('ban', { doi_tuong: 'robot', gia_tri: r.opt.gia_tri, vi_tri: r.opt.vi_tri, x: p.x, y: p.y, lan: s.lanBan });
  }

  function chamRobotSai(r) {
    if (!r || !r.opt) return;
    ghi('cham', { doi_tuong: 'robot_da_gach', gia_tri: r.opt.gia_tri, vi_tri: r.opt.vi_tri });
  }

  function ngheLai() { ghi('nghe_lai', { doi_tuong: 'cau_hoi' }); }
  function phongTo() { ghi('cham', { doi_tuong: 'phong_to_hinh' }); }

  /** Lái xe tăng: ghi vị trí đích khi bé nhấc tay / thả phím (bỏ qua xê dịch dưới 4% bề rộng). */
  function laiXe(x) {
    const G = Gs();
    if (G.state !== 'playing' || x == null || !G.W) return;
    const nx = tron2(x / G.W);
    if (Math.abs(nx - s.xeX) < 0.04) return;
    s.xeX = nx;
    ghi('di_chuyen', { doi_tuong: 'xe_tang', x: nx });
  }

  /* ---------------- Chấm: đạn trúng robot ---------------- */

  function trungDan(r) {
    const G = Gs();
    const o = r.opt || {};
    const kq = goi('traLoi', o.gia_tri, { vi_tri: o.vi_tri || null, cach: s.cachBan, so_phat_ban: s.lanBan });
    if (!kq) return;                                     // câu đã đóng: bỏ qua phát bắn muộn
    if (kq.dung) {
      G.hint = kq.ket_qua === 'dung_sau_goi_y' || s.goiYCap > 0;   // đã nhờ gợi ý: điểm gợi ý như bản gốc
      g.onHit(r);
      thuongQuaMong(r, kq.qua_mong);
      return;
    }
    sai(r, kq);
  }

  function sai(r, kq) {
    const G = Gs();
    G.wrong++; G.streak = 0; G.perfect = 0; G.qWrongs++;
    r.state = 'wrong'; r.t = 0;
    if (G.tank.aimRobot === r) G.tank.aimRobot = null;
    g.cardFx('shake');
    G.flash = { c: '255,60,90', a: 0.22 };
    window.Sfx.play('ricochet');
    g.spawnSparks(r.x, r.y + r.h * 0.4, r.w * 0.5);
    g.addText('✗', r.x, r.y - r.h * 0.9, { color: '#ff5c7a', size: G.tank.size * 0.9, life: 1.0 });
    const loiNoi = kq.loi_noi || ('Bảng “' + (r.opt && r.opt.label) + '” chưa đúng.');
    if (kq.thu_lai) {
      // Còn lượt: nói nhẹ lỗi của bé (lời của đảo), robot bị gạch, bé chọn robot khác
      const chu = loiNoi + ' Con thử lại nhé!';
      g.openClockZoom(chu);                              // bảng đọc (tạm dừng robot) đã có chữ: không hiện thêm chip
      window.Voice.say(g.speakable(chu));
      return;
    }
    // Sai hẳn: màn "Gần đúng rồi" của đảo đè lên game; câu kế tiếp chỉ hỏi khi bé đóng màn đó
    s.choPhanHoi = true;
    G.phase = 'wait';
    G.phaseT = Infinity;
    G.tank.aimRobot = null;
    window.Voice.stop();
    const giaTri = r.opt ? r.opt.gia_tri : null;
    setTimeout(function () {
      if (s.xong) return;
      try { window.Music.setDuck('pause', 0.25); } catch (e) { /* bỏ qua */ }
      let p = null;
      try { p = API.phanHoi(giaTri, kq); } catch (e) { baoLoi('phanHoi: ' + (e && e.message)); }
      Promise.resolve(p).then(xongPhanHoi, function (e) { baoLoi('phanHoi: ' + (e && e.message)); xongPhanHoi(); });
    }, CHO_TRUOC_PHAN_HOI);
  }

  function xongPhanHoi() {
    const G = Gs();
    s.choPhanHoi = false;
    try { window.Music.setDuck('pause', null); } catch (e) { /* bỏ qua */ }
    if (s.xong) return;
    g.fleeOthers(null);
    if (G.phase === 'wait') G.phaseT = 0.35;
  }

  /** Quả mọng của câu đúng: chữ bay trên robot + chip trên HUD. */
  function thuongQuaMong(r, qm) {
    qm = Number(qm) || 0;
    if (qm <= 0) return;
    const G = Gs();
    s.quaMong += qm;
    // Dưới robot (phía trên đã có lời khen, điểm; thẻ câu hỏi cao có thể che chữ bay lên quá cao)
    g.addText('+' + qm + ' 🫐', r.x, r.y + r.h * 0.9, { color: '#f3d6ff', stroke: 'rgba(60,20,90,0.9)', size: Math.min(G.tank.size * 0.6, 30), life: 1.4, vy: -30 });
    capNhatQuaMong(true);
  }

  function capNhatQuaMong(nhun) {
    const n = $('hud-berry-n');
    if (n) n.textContent = String(s.quaMong);
    const chip = $('hud-berry');
    if (chip) {
      chip.setAttribute('aria-label', s.quaMong + ' quả mọng');
      if (nhun) { chip.classList.remove('nhun'); void chip.offsetWidth; chip.classList.add('nhun'); }
    }
  }

  /* ---------------- Gợi ý ---------------- */

  /** Nút 💡: tăng một cấp gợi ý của đảo; cấp 3 cho một robot sai bay đi. Trả về true nếu đã gợi ý. */
  function goiY() {
    const G = Gs();
    if (G.state !== 'playing' || G.phase !== 'ask' || !G.q || G.clockZoom || s.goiYCap >= 3 || s.xong) return false;
    const them = {};
    let bo = null;
    if (s.goiYCap === 2) {
      const dsSai = g.liveRobots().filter(function (r) { return r.opt && !r.opt.ok && r.state !== 'wrong'; });
      if (dsSai.length >= 2) { bo = dsSai[Math.floor(Math.random() * dsSai.length)]; them.loai_bo = bo.opt.gia_tri; }
    }
    const kq = goi('goiY', them);
    if (!kq) { G.hint = true; return false; }
    s.goiYCap = kq.cap || s.goiYCap + 1;
    if (s.goiYCap >= 3) G.hint = true;                   // hết ba cấp: nút 💡 mờ đi (syncHud)
    if (bo) {
      bo.state = 'flee'; bo.t = 0;
      if (G.selected === bo.idx) G.selected = -1;
      if (G.tank.aimRobot === bo) G.tank.aimRobot = null;
    }
    const chu = String(kq.loi || '');
    G.slowT = 2.5;
    window.Sfx.play('hint');
    if (chu) {
      g.openClockZoom(chu);                              // bảng đọc: hình của đề + lời gợi ý, robot đứng yên tới khi bé bấm
      const tieuDe = $('clock-zoom-title');
      if (tieuDe) tieuDe.textContent = '💡 Gợi ý ' + s.goiYCap + '/3';
      window.Voice.say(g.speakable(chu));
    }
    return true;
  }

  /* ==== Bảng tạm dừng trên đảo: khối này giống hệt nhau ở 6 game (tests/games-nhom-g-dao.test.js) ==== */
  const AM_BAT = '🔊 Âm thanh: Bật', AM_TAT = '🔇 Âm thanh: Tắt';
  let daDungHangTamDung = false;
  /** Ngay dưới "▶ Chơi tiếp": một hàng "🔊 Âm thanh" + "🏝️ Về đảo" (nutVe). Nút âm thanh bật / tắt hiệu ứng và nhạc
      của game như thiết lập "tieng" của đảo, chỉ trong ván này (không lưu): tieng() cho biết đang bật, datTieng(bat) áp dụng. */
  function hangTamDung(nutVe, tieng, datTieng) {
    if (daDungHangTamDung) return null;
    daDungHangTamDung = true;
    const nut = document.createElement('button');
    nut.type = 'button';
    nut.id = 'dao-nut-am-thanh';
    const ve = function () {
      const bat = !!tieng();
      nut.textContent = bat ? AM_BAT : AM_TAT;
      nut.className = 'btn ghost dao-nut-am-thanh ' + (bat ? 'on' : 'off');
      nut.setAttribute('aria-pressed', String(bat));
    };
    nut.addEventListener('click', function () {
      const bat = !tieng();
      try { datTieng(bat); if (bat) { window.Sfx.unlock(); window.Sfx.play('click'); } } catch (e) { /* bỏ qua */ }
      ve();
    });
    ve();
    const hang = document.createElement('div');
    hang.className = 'btn-row dao-hang-tam-dung';
    hang.appendChild(nut);
    if (nutVe) {
      const cu = nutVe.parentNode;
      nutVe.textContent = '🏝️ Về đảo';
      nutVe.hidden = false;
      if (nutVe.classList) { nutVe.classList.remove('big', 'small', 'ghost'); nutVe.classList.add('teal'); }
      hang.appendChild(nutVe);
      // Hàng cũ của nút "Về đảo" chỉ còn các nút đã ẩn trên đảo: ẩn luôn cho khỏi hở một khoảng trống
      if (cu && cu.children) {
        const conHien = Array.prototype.some.call(cu.children, function (el) {
          return !el.hidden && window.getComputedStyle(el).display !== 'none';
        });
        if (!conHien) cu.hidden = true;
      }
    }
    const tiep = document.getElementById('btn-resume');
    const hangTiep = tiep && tiep.parentNode;
    const panel = document.querySelector('#pause .panel');
    if (panel && panel.insertBefore) panel.insertBefore(hang, hangTiep && hangTiep.parentNode === panel ? hangTiep.nextSibling : null);
    return { nut: nut, ve: ve };
  }
  /* ==== hết khối bảng tạm dừng ==== */

  /* ---------------- Tạm dừng, về đảo, kết thúc ---------------- */

  /** Gọi từ pauseGame trước khi đổi trạng thái; false: không tạm dừng (đảo đang hiện màn phản hồi). */
  function tamDung(nguon) {
    if (s.choPhanHoi || s.xong) return false;
    s.nguonDung = nguon || 'nut';
    goi('tamDung', s.nguonDung);
    return true;
  }

  function tiepTuc() { if (!s.xong) goi('tiepTuc', 'nut'); }

  function dongPhu() {
    const G = Gs();
    return 'Bắn trúng ' + G.correct + ' robot, được ' + g.fmt(G.score) + ' điểm';
  }

  /** Bé bấm "Về đảo" ở bảng tạm dừng. */
  function veDao() {
    if (s.xong) return;
    s.xong = true;
    clearTimeout(s.hengioNgam);
    try { window.Voice.stop(); window.Music.stop(); } catch (e) { /* bỏ qua */ }
    const G = Gs();
    try { Promise.resolve(API.veDao({ diem: G.score, trung: G.correct })).catch(baoLoi); } catch (e) { baoLoi('veDao: ' + (e && e.message)); }
  }

  /** Hết câu (cauTiep trả null) và màn "Hoàn thành!" đã diễn xong: đảo sang màn kết thúc của nó. */
  function ketThuc() {
    if (s.xong) return;
    s.xong = true;
    clearTimeout(s.hengioNgam);
    const G = Gs();
    try { window.Music.stop(); } catch (e) { /* bỏ qua */ }
    try {
      Promise.resolve(API.ketThuc({ diem: G.score, dong_phu: dongPhu(), trung: G.correct, chuoi_dung: G.bestStreak })).catch(baoLoi);
    } catch (e) { baoLoi('ketThuc: ' + (e && e.message)); }
  }

  window.XeTangDao = {
    bat: true,
    gan: gan, cauTiep: cauTiep, trungDan: trungDan, ban: ban, ngam: ngam, chonMucTieu: chonMucTieu, chamRobotSai: chamRobotSai,
    goiY: goiY, langThang: langThang, tamDung: tamDung, tiepTuc: tiepTuc, veDao: veDao, ketThuc: ketThuc, nutBatDau: nutBatDau,
    laiXe: laiXe, ngheLai: ngheLai, phongTo: phongTo, baoLoi: baoLoi,
    _trangThai: function () { return s; }
  };
})();
