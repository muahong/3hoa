/* ============================================================
   dao.js – Chế độ Đảo Khủng Long của Vệ Binh Cửu Chương (Bắn Thiên Thạch)
   - Chỉ bật khi trang chạy trong iframe của Đảo Khủng Long: có ?dao=1, window.parent khác window và
     window.parent.DaoCauNoi tồn tại (hợp đồng ở dao-khung-long/js/cau-noi.js). Không có đảo thì tệp này
     chỉ đặt window.CuuDao = { bat: false } và game chạy y như cũ.
   - Đảo giữ ngân hàng câu, ván chơi và nhật ký; game vẽ, điều khiển và báo mọi thao tác của bé:
       nhap_so      một thiên thạch mang phép tính (52 − 7), bé gõ kết quả rồi bắn, được thử 2 lần
       chon_dap_an  mỗi thiên thạch mang một số (số lớn nhất, bé nhất), bé gõ số mình chọn rồi bắn
       sap_xep      4 thiên thạch mang 4 số, bé gõ và bắn lần lượt theo thứ tự đề hỏi; bắn đủ mới chấm cả dãy,
                    trước lúc chấm không lộ số nào đúng chỗ; thử lại thì các thiên thạch quay về
   - Mỗi lúc chỉ một câu. Thiên thạch rơi chậm tới giữa trời rồi lơ lửng chờ bé: không khiên, không đồng hồ,
     không thua. Không menu, không bảng vàng, không báo cáo, không ghi localStorage của game (đảo là nơi ghi).
   - Thao tác ghi vào nhật ký: go_so (mỗi chữ số), xoa, ban (số đã bắn, vị trí), cham (chạm thiên thạch).
   Móc trong js/game.js: các dòng "Móc đảo"; game.js gọi CuuDao.khoiDong(noiBo) lúc khởi động.
   API: window.CuuDao = { bat, khoiDong, vaoChoi, capNhat, goSo, xoa, ban, goiY, cham, tamDung, tiepTuc,
                          theTraLoi, loi, loiDs, _trangThai }
   ============================================================ */
(function () {
  'use strict';

  /** Cầu nối của đảo, hoặc null khi game chạy riêng. */
  function timCauNoi() {
    try {
      if (!/(?:^|[?&])dao=1(?:&|$)/.test(String(window.location.search || ''))) return null;
      if (!window.parent || window.parent === window) return null;
      const cn = window.parent.DaoCauNoi;
      return cn && typeof cn.cauTiep === 'function' && typeof cn.traLoi === 'function' ? cn : null;
    } catch (e) { return null; }                 // khung cha khác tên miền: không phải đảo
  }

  /* ---------------- Hàm thuần (dùng được cả khi không có đảo, để kiểm thử) ---------------- */

  function laSo(v) {
    if (typeof v === 'number') return Number.isInteger(v) && v >= 0 && v <= 9999;
    return /^\d{1,4}$/.test(String(v == null ? '' : v));
  }

  /** Cách chơi một câu: nhap (gõ kết quả), chon (gõ số trên thiên thạch), xep (bắn theo thứ tự),
      cham (lựa chọn không phải số: chạm thiên thạch để bắn). */
  function kieuCau(q) {
    const ct = q.cau_truc || {};
    if (q.dang === 'sap_xep' && Array.isArray(ct.ds) && ct.ds.length >= 2 && ct.ds.every(laSo)) return 'xep';
    if (q.lua_chon && q.lua_chon.length) return q.lua_chon.every(function (x) { return laSo(x.gia_tri); }) ? 'chon' : 'cham';
    return 'nhap';
  }

  /** Nhãn trên thiên thạch của câu gõ số: phần phép tính của đề ("52 − 7 = ?" thành "52 − 7"). */
  function nhanPhepTinh(q) {
    const de = String(q.de || '');
    const m = de.match(/^(.+?) = \?$/);
    if (m && m[1].length <= 14) return m[1];
    return de.length <= 12 ? de : '?';
  }

  const CN = timCauNoi();
  const CuuDao = window.CuuDao = { bat: !!CN, loiDs: [], kieuCau: kieuCau, nhanPhepTinh: nhanPhepTinh };
  if (!CN) return;
  try { document.documentElement.classList.add('dao'); } catch (e) { /* bỏ qua */ }

  const TAU = Math.PI * 2;
  /** Vị trí ba lựa chọn (tên gửi cho đảo) và cột ngang tương ứng trên sân. */
  const VI_TRI_3 = ['trai', 'giua', 'phai'];
  const COT_3 = { trai: 1 / 6, giua: 0.5, phai: 5 / 6 };
  const VI_TRI_4 = ['trai', 'giua_trai', 'giua_phai', 'phai'];
  const GIAY_ROI = 5.5;          // giây rơi từ dưới HUD tới chỗ chờ
  const TRE_DUNG = 1300;         // ms ăn mừng trước khi sang câu mới
  const TRE_SAI = 750;           // ms cho bé thấy phát bắn trượt trước khi đảo hiện lời giải
  const TRE_QUAY_LAI = 1100;     // ms trước khi các thiên thạch xếp thứ tự quay về
  const MAX_CHU_SO = 4;
  const HINH_QUA_MONG = '../dao-khung-long/assets/img/berry.webp';

  let N = null;                  // phần bên trong game.js (noiBo)
  let info = {};                 // thongTin() của đảo
  const s = {
    giaiDoan: 'cho',             // cho (thẻ bắt đầu) | dem_nguoc | choi | cho_phan_hoi | xong
    q: null, kieu: '', daBan: [], capGoiY: 0, loiGoiY: '', khoa: false, batDauCau: 0,
    quaMong: 0, soDung: 0, soCauXong: 0, dangDung: false
  };

  function $(id) { return document.getElementById(id); }
  function Sfx() { return window.Sfx; }
  function Voice() { return window.Voice; }
  function Music() { return window.Music; }
  function am(ten) { try { Sfx().play(ten); } catch (e) { /* bỏ qua */ } }
  function noi(chu, tuyChon) { try { if (chu) Voice().say(chu, tuyChon); } catch (e) { /* bỏ qua */ } }

  function baoLoi(e) {
    const msg = e && e.message ? e.message : String(e);
    if (CuuDao.loiDs.length < 50) CuuDao.loiDs.push(msg);
    try { console.error('[cuu-chuong/dao]', msg); } catch (x) { /* bỏ qua */ }
  }
  CuuDao.loi = baoLoi;

  function hen(fn, ms) {
    return setTimeout(function () { try { fn(); } catch (e) { baoLoi(e); } }, ms);
  }

  /** Ghi một thao tác của bé vào nhật ký của đảo (chỉ có tác dụng khi đang có câu mở). */
  function ghi(kieu, duLieu) {
    try { CN.thaoTac(kieu, duLieu); } catch (e) { baoLoi(e); }
  }

  /* ---------------- Khởi động: thẻ bắt đầu ---------------- */

  CuuDao.khoiDong = function (noiBo) {
    N = noiBo;
    N.G.welcomed = true;                         // đảo đã chào bé rồi
    try { info = CN.sanSang() || {}; } catch (e) { baoLoi(e); info = {}; }
    apAmThanh();
    dungGiaoDien();
    N.showScreen(null);
    const the = $('dao-start');
    if (the) the.classList.remove('hidden');
    hen(function () { const b = $('btn-dao-bat-dau'); if (b && b.focus) b.focus(); }, 80);
  };

  /** Âm thanh, nhạc, giọng đọc theo cài đặt của đảo (chỉ trong phiên này, không lưu). */
  function apAmThanh() {
    const at = info.am_thanh || {};
    const d = N.Store.data;
    d.sound = at.tieng !== false;
    d.music = at.tieng !== false;
    d.voice = at.giong !== false;
    try { N.applyAudioSettings(); N.renderAudioToggles(); } catch (e) { baoLoi(e); }
  }

  function datChu(id, chu) { const el = $(id); if (el) el.textContent = chu; }

  function dungGiaoDien() {
    const m = info.man || {};
    datChu('dao-start-ten', m.ten || 'Bắn thiên thạch');
    datChu('dao-start-mo-ta', (m.dang === 'nhap_so'
      ? 'Mỗi thiên thạch mang một phép tính. Con gõ kết quả rồi bấm 🚀 BẮN.'
      : 'Mỗi thiên thạch mang một số. Con đọc kĩ đề, gõ số mình chọn rồi bấm 🚀 BẮN.') +
      ' Thiên thạch bay chậm và chờ con, cứ bình tĩnh nhé!');
    datChu('dao-start-so-cau', '☄️ ' + (m.so_cau || '') + ' câu');
    // Hình của game: biểu tượng hành tinh Ba Hoa ở menu (đổi mã màu chuyển sắc để không trùng id)
    const logo = document.querySelector ? document.querySelector('#menu .logo-row svg') : null;
    const cho = $('dao-start-logo');
    if (cho && logo && logo.outerHTML && !cho.firstElementChild) cho.innerHTML = logo.outerHTML.replace(/lg-/g, 'dao-lg-');
    const be = info.be || {};
    const img = $('dao-start-be');
    if (img) {
      if (be.hinh_co_vu) { img.src = be.hinh_co_vu; img.alt = be.ten_khung_long || ''; img.hidden = false; } else img.hidden = true;
    }
    const qm = $('dao-qua-mong-hinh');
    if (qm) qm.src = HINH_QUA_MONG;
    // Dải đồng hồ của game thành dải tiến độ câu
    const icon = N.ui.timer && N.ui.timer.firstElementChild;
    if (icon) icon.textContent = '☄️';
    const nut = $('btn-dao-bat-dau');
    if (nut && nut.addEventListener) nut.addEventListener('click', batDauVan);
    const ve = $('btn-dao-ve');
    if (ve && ve.addEventListener) ve.addEventListener('click', function () { am('click'); veDao(); });
    // Bảng tạm dừng: "🔊 Âm thanh" (thiết lập sound / music của game, như apAmThanh) + "🏝️ Về đảo"
    hangTamDung(ve, function () { return N.Store.data.sound !== false; }, function (bat) {
      N.Store.data.sound = bat;
      N.Store.data.music = bat;
      N.applyAudioSettings();
      N.renderAudioToggles();
    });
    capNhatTienDo();
  }

  /** Bé bấm "Bắt đầu" (cũng là lần chạm mở khóa âm thanh trên iPad). */
  function batDauVan() {
    if (s.giaiDoan !== 'cho') return;
    try { Sfx().unlock(); } catch (e) { /* bỏ qua */ }
    try { Voice().unlock(); } catch (e) { /* bỏ qua */ }
    am('click');
    const the = $('dao-start');
    if (the) the.classList.add('hidden');
    s.giaiDoan = 'dem_nguoc';
    try { CN.batDau({ roi: 'cham_cho_be', thien_thach_toi_da: 4, go_toi_da: MAX_CHU_SO }); } catch (e) { baoLoi(e); }
    const m = info.man || {};
    N.startGame({ id: 'dao', title: m.ten || '', icon: '🏝️', table: 0, speed: 1, fall: 1, maxDigits: MAX_CHU_SO,
      tables: [], kinds: [], gen: function () { return null; } });
  }
  CuuDao._batDau = batDauVan;

  /** Hết đếm ngược "3, 2, 1, BẮN!" (game.js gọi). */
  CuuDao.vaoChoi = function () {
    if (s.giaiDoan !== 'dem_nguoc') return;
    s.giaiDoan = 'choi';
    cauMoi();
  };

  /* ---------------- Câu hỏi ---------------- */

  function cauMoi() {
    if (s.giaiDoan !== 'choi') return;
    xoaThienThach();
    let q = null;
    try { q = CN.cauTiep({ so_lua_chon: 3, vi_tri: VI_TRI_3 }); } catch (e) { baoLoi(e); q = null; }
    if (!q) { ketThucVan(); return; }
    const G = N.G;
    s.q = q;
    s.kieu = kieuCau(q);
    s.daBan = [];
    s.capGoiY = 0;
    s.loiGoiY = '';
    s.khoa = false;
    s.batDauCau = G.time;
    G.typed = '';
    G.targetId = 0;
    N.hideHint();
    hienHinhCau(q);
    thaThienThach();
    capNhatTienDo();
    N.renderAnswerCard(true);
    noi(q.de_doc || q.de, { queue: true });
  }

  /** Hình minh họa của đề (nếu có): hiện dưới thẻ đề, thiên thạch xuất hiện bên dưới nó. */
  function hienHinhCau(q) {
    const el = $('dao-hinh');
    if (!el) return;
    if (q.hinh) { el.innerHTML = q.hinh; el.hidden = false; } else { el.innerHTML = ''; el.hidden = true; }
    N.updateSpawnY();
  }

  function viTriXep(i, n) {
    if (n === 4) return VI_TRI_4[i];
    if (n === 3) return VI_TRI_3[i];
    return 'cot_' + (i + 1);
  }

  /** Thả các thiên thạch của câu hiện tại (cũng dùng khi thiên thạch xếp thứ tự quay về). */
  function thaThienThach() {
    const q = s.q;
    let ds;
    if (s.kieu === 'nhap') {
      ds = [{ nhan: nhanPhepTinh(q), gia_tri: null, vi_tri: 'thien_thach', cot: 0.5 }];
    } else if (s.kieu === 'xep') {
      const a = q.cau_truc.ds;
      ds = a.map(function (v, i) { return { nhan: String(v), gia_tri: Number(v), vi_tri: viTriXep(i, a.length), cot: (i + 0.5) / a.length }; });
    } else {
      const a = q.lua_chon;
      ds = a.map(function (x, i) {
        const cot = COT_3[x.vi_tri] != null ? COT_3[x.vi_tri] : (i + 0.5) / a.length;
        return { nhan: String(x.nhan != null ? x.nhan : x.gia_tri), gia_tri: x.gia_tri, vi_tri: x.vi_tri || 'lua_chon_' + (i + 1), cot: cot, dung: !!x.dung };
      });
    }
    const G = N.G;
    ds.forEach(function (d, i) {
      const r = N.radiusFor(d.nhan);
      const m = new N.Meteor({
        kind: 'rock', q: { label: d.nhan, text: '', full: '', answer: null, speech: '' },
        r: r, x: 0, y: 0, vx: 0, vy: 0, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 0.7
      });
      m.dao = true;
      m.cot = d.cot;
      m.lech = ds.length > 1 ? (i % 2 ? 0.12 : -0.12) : 0;
      m.giaTri = d.gia_tri;
      m.viTri = d.vi_tri;
      m.dung = d.dung;
      datCho(m);
      m.x = m.goc;
      m.y = G.spawnY + r * 1.1;
      m.vy = Math.max(12, (m.dungY - m.y) / GIAY_ROI);
      G.meteors.push(m);
      N.spawnTwinkle(m.x, m.y, r);
    });
    am('spawn');
    if (s.kieu === 'nhap') { const m = motThienThach(); G.targetId = m ? m.id : 0; }
  }

  /** Chỗ chờ của thiên thạch theo bố cục hiện tại (xoay máy, ô nhắc cao lên đều tính lại). */
  function datCho(m) {
    const G = N.G, f = G.field;
    const pad = N.edgePad(m.r);
    m.goc = Math.min(Math.max(f.x + f.w * m.cot, f.x + pad), f.x + f.w - pad);
    const dinhKhien = G.planet.cy - G.shieldR;
    const tren = G.spawnY + m.r * 1.25, duoi = dinhKhien - m.r * 1.6;
    m.dungY = duoi > tren ? tren + (duoi - tren) * (0.5 + m.lech) : tren;
  }

  function xoaThienThach() {
    N.G.meteors.forEach(function (m) { if (m.popping <= 0) m.dead = true; });
    N.G.targetId = 0;
  }

  /** Thiên thạch tan đi nhẹ nhàng (không tiếng nổ, không điểm). */
  function tan(m) {
    if (!m || m.dead || m.popping > 0) return;
    m.popping = N.POP_T;
    N.spawnTwinkle(m.x, m.y, m.r);
  }

  function songCuaDao() { return N.liveMeteors().filter(function (m) { return m.dao; }); }
  function motThienThach() { return songCuaDao()[0] || null; }
  function timTheoSo(v) {
    const ds = songCuaDao();
    for (let i = 0; i < ds.length; i++) if (ds[i].giaTri != null && Number(ds[i].giaTri) === v) return ds[i];
    return null;
  }
  function thienThachTai(pos) {
    let best = null, bd = Infinity;
    songCuaDao().forEach(function (m) {
      const d = Math.hypot(m.x - pos.x, m.y - pos.y);
      if (d < m.r * 1.5 && d < bd) { best = m; bd = d; }
    });
    return best;
  }

  /* ---------------- Mỗi khung hình (game.js gọi thay cho updatePlaying) ---------------- */

  CuuDao.capNhat = function (dt) {
    if (!N || s.giaiDoan === 'cho_phan_hoi') return;   // đứng yên trong lúc đảo hiện lời giải
    const G = N.G;
    G.time += dt;
    N.updateMeteors(dt);
    const live = songCuaDao();
    for (let i = 0; i < live.length; i++) {
      const m = live[i];
      datCho(m);
      m.x = m.goc + Math.sin(G.anim * 0.8 + m.id * 1.7) * Math.min(14, m.r * 0.22);
      if (!m.den && m.y >= m.dungY) { m.den = true; m.vy = 0.001; }
      if (m.den) {                                // lơ lửng chờ bé, nhấp nhô nhẹ
        const dich = m.dungY + Math.sin(G.anim * 1.5 + m.id) * 5;
        m.y += (dich - m.y) * Math.min(1, dt * 5);
      }
    }
    // Pháo quay về thiên thạch đang ngắm (hoặc chĩa lên trời khi chưa ngắm)
    let t = null;
    for (let i = 0; i < live.length; i++) if (live[i].id === G.targetId) t = live[i];
    const want = t ? Math.atan2(t.y - G.cannon.y, t.x - G.cannon.x) : -Math.PI / 2;
    let d = want - G.cannon.angle;
    while (d > Math.PI) d -= TAU;
    while (d < -Math.PI) d += TAU;
    G.cannon.angle += d * Math.min(1, dt * 8);
  };

  /* ---------------- Gõ số, xóa, bắn ---------------- */

  function moPhim() { return !!(N && s.giaiDoan === 'choi' && s.q && !s.khoa); }

  /** Ngắm thiên thạch mang đúng số bé vừa gõ (chưa phải chấm: chỉ hiện vòng ngắm, pháo xoay theo). */
  function ngamTheoSo() {
    const G = N.G;
    if (s.kieu === 'nhap') { const m0 = motThienThach(); G.targetId = m0 ? m0.id : 0; return; }
    const m = G.typed ? timTheoSo(Number(G.typed)) : null;
    G.targetId = m && String(m.giaTri) === G.typed ? m.id : 0;
  }

  CuuDao.goSo = function (d) {
    if (!moPhim()) return;
    const G = N.G;
    if (s.kieu === 'cham') { nhacCham(); return; }
    if (G.typed.length >= MAX_CHU_SO) {
      am('del');
      N.cardFx('shake');
      N.showHint('Số dài quá rồi, con xóa bớt nhé', 'info', 1500);
      return;
    }
    if (G.typed === '0') G.typed = '';
    G.typed += d;
    am('key');
    ghi('go_so', { gia_tri: Number(d), nhap: G.typed });
    ngamTheoSo();
    N.renderAnswerCard(false);
  };

  CuuDao.xoa = function () {
    if (!moPhim()) return;
    const G = N.G;
    if (!G.typed) return;
    const bo = G.typed.slice(-1);
    G.typed = G.typed.slice(0, -1);
    am('del');
    ghi('xoa', { gia_tri: Number(bo), nhap: G.typed });
    ngamTheoSo();
    N.renderAnswerCard(false);
  };

  function nhacCham() {
    N.cardFx('shake');
    N.showHint('Con chạm vào thiên thạch mình chọn nhé!', 'info', 2000);
  }

  CuuDao.ban = function () {
    if (!moPhim()) return;
    const G = N.G;
    if (s.kieu === 'cham') { nhacCham(); return; }
    if (!G.typed) {
      N.cardFx('shake');
      N.showHint('Gõ số trước rồi mới bắn nhé!', 'info', 1500);
      am('del');
      return;
    }
    const chu = G.typed, v = Number(chu);
    G.typed = '';
    if (s.kieu === 'nhap') {
      const m = motThienThach();
      ghi('ban', { gia_tri: v, doi_tuong: 'thien_thach', vi_tri: 'thien_thach' });
      chot(v, m, { vi_tri: 'thien_thach', nhap: chu });
    } else {
      const m = timTheoSo(v);
      if (!m) {
        // Số không có trên thiên thạch nào: nhắc nhẹ, không chấm
        ghi('ban', { gia_tri: v, doi_tuong: 'khoang_trong', trung: false });
        G.targetId = 0;
        N.cardFx('shake');
        am('del');
        N.showHint('Không có thiên thạch mang số ' + v + '. Con gõ số ghi trên thiên thạch nhé!', 'info', 2800);
      } else if (s.kieu === 'xep') {
        banXep(m, v);
      } else {
        ghi('ban', { gia_tri: v, doi_tuong: 'thien_thach', vi_tri: m.viTri });
        chot(m.giaTri, m, { vi_tri: m.viTri });
      }
    }
    N.renderAnswerCard(false);
  };

  /** Xếp thứ tự: mỗi phát trúng làm thiên thạch nổ (trung tính, không khen chê); đủ số mới chấm cả dãy. */
  function banXep(m, v) {
    const G = N.G;
    s.daBan.push(Number(m.giaTri));
    ghi('ban', { gia_tri: v, doi_tuong: 'thien_thach', vi_tri: m.viTri, thu_tu: s.daBan.length });
    N.fireLaser(m);
    N.destroyMeteor(m, false);
    N.addText(String(s.daBan.length), m.x, m.y - m.r * 1.2, { color: '#9af0ff', size: G.baseR * 0.7, life: 0.9, vy: -30 });
    G.targetId = 0;
    const n = s.q.cau_truc.ds.length;
    if (s.daBan.length >= n) {
      s.khoa = true;
      hen(function () { s.khoa = false; chot(s.daBan.join(','), null, { thu_tu: s.daBan.slice() }); }, 450);
    }
  }

  /* ---------------- Chấm (đảo) và phản hồi ---------------- */

  function chot(giaTri, m, them) {
    let kq = null;
    try { kq = CN.traLoi(giaTri, them); } catch (e) { baoLoi(e); }
    if (!kq) return;
    if (kq.dung) { trungDich(m, kq); return; }
    N.G.streak = 0;
    if (kq.thu_lai) thuLai(m, giaTri, kq);
    else if (kq.can_phan_hoi) canPhanHoi(m, giaTri, kq);
  }

  /** Câu khen ngắn sau khi đúng: phép tính đã điền kết quả, số đã chọn hoặc dãy đã xếp. */
  function loiKhen(kq) {
    const q = s.q, ct = q.cau_truc || {};
    if (s.kieu === 'nhap' && /\?/.test(q.de || '')) return String(q.de).replace('?', kq.dap_an_nhan != null ? kq.dap_an_nhan : kq.dap_an) + ' ✓';
    if (s.kieu === 'xep') return s.daBan.join(ct.chieu === 'giam' ? ' > ' : ' < ') + ' ✓';
    if (ct.loai === 'so_sanh' && (ct.kieu === 'lon_nhat' || ct.kieu === 'be_nhat')) return 'Số ' + (ct.kieu === 'lon_nhat' ? 'lớn' : 'bé') + ' nhất là ' + kq.dap_an_nhan + ' ✓';
    return (kq.dap_an_nhan != null ? kq.dap_an_nhan : '') + ' ✓';
  }

  function trungDich(m, kq) {
    const G = N.G;
    s.khoa = true;
    s.soDung++;
    s.soCauXong++;
    G.targetId = 0;
    const x = m ? m.x : G.field.x + G.field.w / 2;
    const y = m ? m.y : G.spawnY + (G.planet.cy - G.shieldR - G.spawnY) * 0.45;
    const r = m ? m.r : G.baseR;
    if (m && !m.dead && m.popping <= 0) { N.fireLaser(m); N.destroyMeteor(m, true); }
    songCuaDao().forEach(tan);                   // các lựa chọn còn lại tan đi
    G.streak++;
    if (G.streak > G.bestStreak) G.bestStreak = G.streak;
    const mult = N.multiplier();
    const giay = G.time - s.batDauCau;
    const nhanh = kq.ket_qua === 'dung_ngay' ? (giay < 9 ? 50 : giay < 15 ? 25 : 0) : 0;
    const pts = kq.ket_qua === 'dung_ngay' ? 100 * mult + nhanh : kq.ket_qua === 'dung_sau_goi_y' ? 50 * mult : 50;
    G.score += pts;
    G.cheer = 1;
    const combo = G.streak % 3 === 0 && mult > 1;
    const khen = combo ? 'Combo x' + mult + '!' : N.pick(N.PRAISE);
    const py = y < G.spawnY + r * 2.5 ? y + r * 1.3 : y - r * 1.3;
    N.addText(khen, x, py, { color: combo ? '#ff9f1c' : '#7bf1a8', size: G.baseR * 1.0, life: 1.2, vy: py > y ? 20 : -25 });
    N.addText('+' + pts, x, y - r * 0.3, { color: '#ffe066', size: G.baseR * 0.95, life: 1.0 });
    if (nhanh) N.addText('⚡ nhanh +' + nhanh, x, y + r * 0.9, { color: '#9af0ff', size: G.baseR * 0.6, life: 1.1, vy: 18 });
    if (kq.qua_mong > 0) themQuaMong(kq.qua_mong);
    N.showHint(loiKhen(kq), 'ok', 1800);
    N.cardFx('ok');
    if (!N.Motion.lite) G.flash = { c: '120,255,180', a: 0.16 };
    am(combo ? 'combo' : 'correct');
    noi(combo ? 'Combo nhân ' + mult + '!' : khen);
    capNhatTienDo();
    hen(function () { s.khoa = false; cauMoi(); }, TRE_DUNG);
  }

  /** Lời nhắc khi sai: gọi đúng tên lỗi thật nhẹ nhàng (như màn "Gần đúng rồi" của đảo). */
  function loiNhac(kq) {
    const ln = String(kq.loi_noi || '').replace(/[.!\s]+$/, '');
    const coTen = kq.loi && kq.loi.length && kq.loi[0] !== 'khac' && ln && !/^Chưa đúng/.test(ln);
    return coTen ? 'Gần đúng rồi! ' + ln + '.' : 'Chưa đúng rồi.';
  }

  function saiHieuUng() {
    const G = N.G;
    N.cardFx('shake');
    if (!N.Motion.lite) G.flash = { c: '255,60,90', a: 0.22 };
    am('wrong');
  }

  /** Còn lượt thử: thiên thạch gõ số vẫn chờ; câu xếp thứ tự thì các thiên thạch quay về. */
  function thuLai(m, giaTri, kq) {
    const G = N.G;
    saiHieuUng();
    const nhac = loiNhac(kq);
    // Chữ ✗ dưới thiên thạch: phía trên là ô nhắc (có thể cao hai dòng)
    if (m && s.kieu !== 'xep') N.addText('✗ ' + giaTri, m.x, m.y + m.r * 1.4, { color: '#ff5c7a', size: G.baseR * 0.95, life: 1.3, vy: 20 });
    if (s.kieu === 'xep') {
      s.khoa = true;
      N.showHint(nhac + ' Các thiên thạch quay lại, con bắn lại theo thứ tự nhé!', 'bad', 6000);
      noi(nhac + ' Con bắn lại nhé.');
      hen(function () {
        if (s.giaiDoan !== 'choi') return;
        s.daBan = [];
        s.khoa = false;
        thaThienThach();
        N.renderAnswerCard(true);
      }, TRE_QUAY_LAI);
    } else {
      N.showHint(nhac + ' Con thử lại nhé!', 'bad', 6000);
      noi(nhac + ' Con thử lại nhé.');
    }
    N.renderAnswerCard(false);
  }

  /** Hết lượt: đảo hiện màn "Gần đúng rồi" đè lên game; đóng màn thì sang câu mới (câu sai quay lại sau 2 câu). */
  function canPhanHoi(m, giaTri, kq) {
    const G = N.G;
    s.khoa = true;
    saiHieuUng();
    if (m && !m.dead) {
      N.fireLaser(m);
      N.spawnTwinkle(m.x, m.y, m.r);
      N.addText('✗ ' + giaTri, m.x, m.y + m.r * 1.4, { color: '#ff5c7a', size: G.baseR * 0.95, life: 1.3, vy: 20 });
    }
    G.targetId = 0;
    hen(function () {
      if (s.giaiDoan !== 'choi') return;
      s.giaiDoan = 'cho_phan_hoi';
      try { Voice().stop(); } catch (e) { /* bỏ qua */ }
      try { Music().setDuck('dao', 0.25); } catch (e) { /* bỏ qua */ }
      let p = null;
      try { p = CN.phanHoi(giaTri, kq); } catch (e) { baoLoi(e); }
      Promise.resolve(p).then(function () {
        if (s.giaiDoan !== 'cho_phan_hoi') return;
        s.giaiDoan = 'choi';
        s.soCauXong++;
        try { Music().setDuck('dao', null); } catch (e) { /* bỏ qua */ }
        songCuaDao().forEach(tan);
        N.hideHint();
        hen(function () { s.khoa = false; cauMoi(); }, 450);
      }, baoLoi);
    }, TRE_SAI);
  }

  /* ---------------- Gợi ý, chạm thiên thạch ---------------- */

  CuuDao.goiY = function () {
    if (!moPhim()) return;
    const G = N.G;
    if (s.capGoiY >= 3) {                        // đã hết ba cấp: đọc lại gợi ý cuối
      if (s.loiGoiY) { N.showHint('💡 ' + s.loiGoiY, 'info', 6000); noi(s.loiGoiY); }
      return;
    }
    let them = null, bo = null;
    if (s.capGoiY === 2 && (s.kieu === 'chon' || s.kieu === 'cham')) {
      // Cấp 3: bỏ bớt một thiên thạch sai (còn ít nhất hai để bé tự chọn)
      const sai = songCuaDao().filter(function (m) { return m.dung === false; });
      if (sai.length && songCuaDao().length > 2) {
        bo = sai[Math.floor(Math.random() * sai.length)];
        them = { loai_bo: bo.giaTri };
      }
    }
    let r = null;
    try { r = CN.goiY(them); } catch (e) { baoLoi(e); }
    if (!r) return;
    s.capGoiY = r.cap || s.capGoiY + 1;
    s.loiGoiY = r.loi || '';
    am('hint');
    N.showHint('💡 ' + s.loiGoiY, 'info', 6500);
    noi(s.loiGoiY);
    const t = songCuaDao().filter(function (m) { return m.id === G.targetId; })[0] || (s.kieu === 'nhap' ? motThienThach() : null);
    if (t) N.addText('💡', t.x, t.y - t.r * 1.15, { color: '#ffe066', size: G.baseR * 0.8, life: 1.0, vy: -20 });
    if (bo) {
      if (G.targetId === bo.id) G.targetId = 0;
      tan(bo);
    }
    N.renderAnswerCard(false);
  };

  CuuDao.cham = function (pos) {
    if (!moPhim()) return;
    const m = thienThachTai(pos);
    if (!m) return;
    if (s.kieu === 'cham') {                     // lựa chọn không gõ được: chạm là bắn
      ghi('ban', { gia_tri: m.giaTri, doi_tuong: 'thien_thach', vi_tri: m.viTri, cach: 'cham' });
      chot(m.giaTri, m, { vi_tri: m.viTri });
      return;
    }
    ghi('cham', { doi_tuong: 'thien_thach', gia_tri: m.giaTri != null ? m.giaTri : m.q.label, vi_tri: m.viTri });
    am('target');
    if (s.kieu === 'nhap') N.showHint('Con gõ kết quả trên bàn phím số rồi bấm 🚀 BẮN nhé!', 'info', 2400);
    else N.showHint('Muốn bắn thiên thạch này, con gõ số ' + m.q.label + ' rồi bấm 🚀 BẮN nhé!', 'info', 2600);
  };

  /* ---------------- Thẻ đề (thẻ trả lời trên HUD) ---------------- */

  function oGo(typed) {
    return '<span class="typed' + (typed ? '' : ' empty') + '">' + N.esc(typed || '?') + '</span><span class="caret"></span>';
  }

  CuuDao.theTraLoi = function () {
    const G = N.G, q = s.q, the = N.ui.answer;
    const hai = s.kieu === 'xep' || s.kieu === 'chon';
    let dai = false;
    let h;
    if (!q || s.giaiDoan === 'cho' || s.giaiDoan === 'dem_nguoc') h = G.state === 'playing' ? 'Sẵn sàng…' : '…';
    else if (s.giaiDoan === 'xong') h = '🎉 Hoàn thành!';
    else {
      const ct = q.cau_truc || {};
      const typed = G.typed;
      const onLai = q.on_lai ? '<span class="review-tag">📝 Ôn lại</span>' : '';
      if (s.kieu === 'xep') {
        const n = ct.ds.length;
        let o = '';
        for (let i = 0; i < n; i++) {
          if (i) o += '<span class="dao-mui">→</span>';
          if (i < s.daBan.length) o += '<span class="dao-o da">' + N.esc(s.daBan[i]) + '</span>';
          else if (i === s.daBan.length && !s.khoa) o += '<span class="dao-o cur">' + oGo(typed) + '</span>';
          else o += '<span class="dao-o"></span>';
        }
        h = '<span class="dao-yc">' + onLai + 'Bắn từ ' + (ct.chieu === 'giam' ? 'lớn đến bé' : 'bé đến lớn') + '</span><span class="dao-day">' + o + '</span>';
      } else if (s.kieu === 'chon') {
        const yc = ct.loai === 'so_sanh' && ct.kieu === 'lon_nhat' ? 'Bắn số lớn nhất'
          : ct.loai === 'so_sanh' && ct.kieu === 'be_nhat' ? 'Bắn số bé nhất' : String(q.de || '');
        dai = yc.length > 34;
        h = '<span class="dao-yc">' + onLai + N.esc(yc) + '</span>' + oGo(typed);
      } else if (s.kieu === 'cham') {
        dai = String(q.de || '').length > 16;
        h = onLai + N.esc(q.de || '') + ' <span class="dao-yc">Chạm vào thiên thạch con chọn</span>';
      } else {
        const de = String(q.de || '');
        dai = de.length > 18;
        const doi = N.esc(de).replace(/ ([×:+−-]) /g, ' <span class="op">$1</span> ');
        h = onLai + (doi.indexOf('?') >= 0 ? doi.replace('?', oGo(typed)) : doi + ' ' + oGo(typed));
      }
    }
    if (the && the.classList) {
      the.classList.toggle('dao-hai-dong', !!(q && hai && s.giaiDoan !== 'xong'));
      the.classList.toggle('dao-dai', dai);
    }
    return h;
  };

  /* ---------------- HUD: tiến độ câu, quả mọng ---------------- */

  function capNhatTienDo(xong) {
    if (!N) return;
    const ui = N.ui, q = s.q;
    const tong = (q && q.tong) || (info.man && info.man.so_cau) || 0;
    const stt = q ? Math.min(q.stt, tong || q.stt) : 0;
    const daXong = xong ? tong : Math.min(tong, s.soCauXong);
    if (ui.time) ui.time.textContent = tong ? stt + '/' + tong : '';
    if (ui.timerFill && ui.timerFill.style) ui.timerFill.style.width = (tong ? daXong / tong * 100 : 0).toFixed(1) + '%';
    if (ui.timer && ui.timer.setAttribute) ui.timer.setAttribute('aria-label', 'Câu ' + stt + ' trên ' + tong);
    datChu('dao-qua-mong-so', String(s.quaMong));
  }

  function themQuaMong(n) {
    s.quaMong += n;
    datChu('dao-qua-mong-so', String(s.quaMong));
    const chip = $('dao-qua-mong');
    if (chip && chip.classList) {
      chip.classList.remove('bump');
      void chip.offsetWidth;
      chip.classList.add('bump');
    }
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

  CuuDao.tamDung = function (nguon) {
    // Đảo đã đóng ván (kết thúc, về đảo): iframe đang được gỡ, không còn gì để ghi
    if (s.giaiDoan === 'xong' || s.giaiDoan === 'cho') return;
    s.dangDung = true;
    try { CN.tamDung(nguon || 'nut'); } catch (e) { baoLoi(e); }
    const q = s.q;
    const tong = (q && q.tong) || (info.man && info.man.so_cau) || 0;
    datChu('pause-info', (q ? 'Câu ' + Math.min(q.stt, tong || q.stt) + '/' + tong + ' · ' : '') + 'Điểm: ' + N.fmt(N.G.score) + '. Nghỉ một chút rồi chơi tiếp nhé!');
  };

  CuuDao.tiepTuc = function (nguon) {
    if (!s.dangDung || s.giaiDoan === 'xong') return;
    s.dangDung = false;
    try { CN.tiepTuc(nguon || 'nut'); } catch (e) { baoLoi(e); }
    if (s.q && s.giaiDoan === 'choi') noi(s.q.de_doc || s.q.de, { queue: true });
  };

  function dungAmThanh() {
    try { Voice().stop(); } catch (e) { /* bỏ qua */ }
    try { Music().stop(); } catch (e) { /* bỏ qua */ }
  }

  /** Bé chọn "Về đảo" ở bảng tạm dừng: đảo ghi ván bỏ dở (quả mọng đã có vẫn giữ). */
  function veDao() {
    if (s.giaiDoan === 'xong') return;
    s.giaiDoan = 'xong';
    dungAmThanh();
    let p = null;
    try { p = CN.veDao({ diem: N.G.score }); } catch (e) { baoLoi(e); }
    Promise.resolve(p).catch(baoLoi);
  }
  CuuDao._veDao = veDao;

  /** Hết câu: ăn mừng một chút rồi trao cho đảo màn kết thúc. */
  function ketThucVan() {
    if (s.giaiDoan === 'xong') return;
    s.giaiDoan = 'xong';
    const G = N.G;
    G.typed = '';
    G.targetId = 0;
    if (N.ui.numpad && N.ui.numpad.classList) N.ui.numpad.classList.add('off');
    capNhatTienDo(true);
    N.renderAnswerCard(true);
    N.showHint('Hành tinh Ba Hoa an toàn rồi! Giỏi quá!', 'ok', 1e9);
    N.spawnConfetti(110);
    am('applause');
    noi('Giỏi quá! Con đã bảo vệ hành tinh Ba Hoa!');
    hen(function () {
      dungAmThanh();
      const phu = 'Đúng ' + s.soDung + ' câu · ' + N.fmt(G.score) + ' điểm';
      let p = null;
      try { p = CN.ketThuc({ diem: G.score, dong_phu: phu, combo_cao_nhat: G.bestStreak }); } catch (e) { baoLoi(e); }
      Promise.resolve(p).catch(baoLoi);
    }, 2300);
  }

  /** Trạng thái để kiểm thử và gỡ lỗi (chỉ đọc). */
  CuuDao._trangThai = function () {
    const G = N ? N.G : null;
    return {
      giaiDoan: s.giaiDoan, kieu: s.kieu, khoa: s.khoa, daBan: s.daBan.slice(), capGoiY: s.capGoiY,
      quaMong: s.quaMong, soDung: s.soDung, diem: G ? G.score : 0, typed: G ? G.typed : '', state: G ? G.state : null,
      q: s.q ? { stt: s.q.stt, tong: s.q.tong, ma_cau: s.q.ma_cau, dang: s.q.dang, de: s.q.de, dap_an: s.q.dap_an } : null,
      thienThach: G ? songCuaDao().map(function (m) {
        return { id: m.id, nhan: m.q.label, gia_tri: m.giaTri, vi_tri: m.viTri, x: Math.round(m.x), y: Math.round(m.y), r: Math.round(m.r), den: !!m.den, ngam: m.id === G.targetId };
      }) : [],
      loi: CuuDao.loiDs.slice()
    };
  };
})();
