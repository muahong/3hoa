/* ============================================================
   dao.js – Chế độ Đảo Khủng Long của Ninja Toán Học (thể loại "Chém Trái Cây" trên đảo)
   - Chỉ bật khi trang được đảo mở trong iframe cùng tên miền: ?dao=1, window.parent !== window và
     window.parent.DaoCauNoi có (hợp đồng ở dao-khung-long/js/cau-noi.js, phiên bản 1). Thiếu một điều kiện:
     window.NinjaDao = null và game chạy y như cũ.
   - Nạp TRƯỚC js/game.js. game.js đọc window.NinjaDao lúc nạp; các chỗ rẽ nhánh trong game.js đánh dấu "[Đảo]".
   - Đảo giữ ngân hàng câu, ván chơi (VanChoi) và nhật ký (NhatKy); game này chỉ vẽ và điều khiển:
       sanSang() lúc tải xong → thẻ "Bắt đầu" (chạm này cũng mở khóa âm thanh trên iPad) → batDau(độ khó)
       mỗi câu: cauTiep({ so_lua_chon: 4, vi_tri: ['cot_1'…] }) → ném các quả mang lựa chọn (không bom, không tim)
       chém một quả: thaoTac('vuot', { gia_tri, vi_tri, x, y, lan_nem }) rồi traLoi(giá trị, { vi_tri, lan_nem })
       đúng: hiệu ứng, điểm, quả mọng, khủng long cổ vũ; sai và can_phan_hoi: dừng, chờ phanHoi() của đảo rồi sang câu
       quả rơi hết mà chưa chém: ném lại chậm hơn (không phạt, không hết giờ); nút 💡: goiY() 3 cấp, cấp 3 bỏ một quả sai
       tạm dừng: tamDung/tiepTuc, nút "Về đảo": veDao({ diem }); hết câu (cauTiep trả null): ketThuc({ diem, dong_phu })
   - Không menu, không chọn màn, không tim, không đồng hồ ván, không bảng kết quả, không ghi localStorage của game.
   API: window.NinjaDao (null khi chơi riêng)
   ============================================================ */
(function () {
  'use strict';

  /** Tìm cầu nối của đảo; null nếu không phải chế độ đảo (hoặc khung cha khác tên miền). */
  function timCauNoi() {
    try {
      if (!/[?&]dao=1(?:[&#]|$)/.test(String(window.location && window.location.search || ''))) return null;
      const cha = window.parent;
      if (!cha || cha === window) return null;
      const cn = cha.DaoCauNoi;
      return cn && typeof cn.cauTiep === 'function' && typeof cn.traLoi === 'function' ? cn : null;
    } catch (e) {
      return null;
    }
  }

  const CN = timCauNoi();
  if (!CN) { window.NinjaDao = null; return; }
  try { document.documentElement.classList.add('dao-mode'); } catch (e) { /* bỏ qua */ }

  const TAU = Math.PI * 2;
  /** Tên vị trí các quả: cột tính từ trái sang (luôn đúng dù câu có 3 hay 4 lựa chọn). */
  const VI_TRI = ['cot_1', 'cot_2', 'cot_3', 'cot_4'];
  const SO_LUA_CHON = 4;
  const TOC_DO = 0.7;          // chậm hơn mọi màn chơi riêng (0,82 đến 1,2): bé lớp 2 kịp đọc đề và số trên quả
  const TOC_DO_THAP = 0.55;    // mỗi lần quả rơi hết mà bé chưa chém, đợt sau bay chậm hơn một chút
  const CAU_HINH = { choPhanHoiMs: 650, ketThucMs: 1700, docDeTruocS: 1.2 };
  /** Màn chơi "ảo" đưa cho startGame: không bom, quả to hơn khi màn hình rộng. */
  const MAN = { id: 'dao', title: 'Đảo Khủng Long', desc: '', icon: '🦖', grade: 2, speed: TOC_DO, fruits: SO_LUA_CHON, bomb: 0, gen: null };
  /** Quả to (bán kính × 1,25) khi đủ chỗ cho 4 cột quả; màn hình hẹp (iPad dọc) giữ cỡ thường. Tính lại mỗi lần đổi cỡ. */
  Object.defineProperty(MAN, 'big', { enumerable: true, get: function () { return !!nb && (nb.G.W || 0) >= 900 && (nb.G.H || 0) >= 600; } });

  let nb = null;   // phần bên trong game.js (xem noiBo() trong game.js)
  const dom = {};
  const s = {
    tt: null, daBatDau: false, xong: false, dangDung: false, choPH: false,
    cau: null, lc: [], loaiBo: {}, daThu: {}, goiYCap: 0, soNem: 0,
    daGap: {}, daXong: {}, tong: 0, dem: { dung: 0, sai: 0, goi_y: 0 }, nhacGoiY: false,
    anh: {}, loi: []
  };
  window.__NinjaDaoLoi = s.loi;

  /* ---------------- Tiện ích ---------------- */

  function baoLoi(e) {
    const m = e && e.message ? e.message : String(e);
    s.loi.push(m);
    if (s.loi.length > 20) s.loi.shift();
    try { console.error('[ninja-dao]', m); } catch (e2) { /* bỏ qua */ }
  }
  /** Gọi một hàm của cầu nối; lỗi không được làm treo ván chơi. */
  function goi(ten) {
    const thamSo = Array.prototype.slice.call(arguments, 1);
    try { return CN[ten].apply(CN, thamSo); } catch (e) { baoLoi(e); return null; }
  }
  function khoa(v) { return String(v); }
  function tron2(v) { return Math.round(Math.max(0, Math.min(1, v)) * 100) / 100; }
  function $(id) { return document.getElementById(id); }
  function amThanh() { return (s.tt && s.tt.am_thanh) || { tieng: true, giong: true }; }
  function tenBe() { return (s.tt && s.tt.be && s.tt.be.ten) || ''; }

  function noi(chu, tuyChon) {
    if (!chu || !amThanh().giong) return;
    if (nb.Voice.available) nb.Voice.say(chu, tuyChon);
    else goi('doc', chu);
  }

  function apDungAmThanh() {
    const a = amThanh();
    // Chỉ trong bộ nhớ (Store.save không ghi gì trên đảo): mọi chỗ game đọc thiết lập âm thanh đều theo đảo
    nb.Store.data.sound = !!a.tieng;
    nb.Store.data.music = !!a.tieng;
    nb.Store.data.voice = !!a.giong;
    nb.Sfx.setEnabled(!!a.tieng);
    nb.Music.setEnabled(!!a.tieng);
    nb.Voice.setEnabled(!!a.giong);
  }

  /* ---------------- Khởi động: thẻ "Bắt đầu" ---------------- */

  function khoiDong(noiBo) {
    nb = noiBo;
    s.tt = goi('sanSang') || goi('thongTin') || null;
    apDungAmThanh();
    dungGiaoDien();
    moThe();
  }

  /** Hình ninja quả táo của menu, đổi id gradient để không trùng với bản gốc đang ẩn. */
  function hinhNinja() {
    try {
      const svg = document.querySelector('#menu .logo-row svg');
      const h = svg && svg.outerHTML;
      if (h && h.indexOf('<svg') === 0) return h.replace(/lg-apple/g, 'dao-lg-apple').replace(/lg-blade/g, 'dao-lg-blade').replace('<svg', '<svg class="dao-mo-ninja"');
    } catch (e) { /* bỏ qua */ }
    return '';
  }

  function dungGiaoDien() {
    const app = $('app');
    const tt = s.tt || {};
    const man = tt.man || {};
    const be = tt.be || {};
    const E = nb.esc;
    const ten = man.ten || 'Chém Trái Cây';
    let phu = man.ten_day_du || '';
    phu = phu.replace(' · ' + ten, '');
    if (phu === ten) phu = '';

    // Thẻ "Bắt đầu"
    const the = document.createElement('div');
    the.id = 'dao-bat-dau';
    the.className = 'screen dao-bat-dau';
    the.innerHTML =
      '<div class="panel dao-mo" role="dialog" aria-label="' + E(ten) + '">' +
        '<div class="dao-mo-hinh">' + hinhNinja() +
          (be.hinh_co_vu || be.hinh ? '<img class="dao-mo-kl" alt="" src="' + E(be.hinh_co_vu || be.hinh) + '">' : '') + '</div>' +
        '<p class="dao-mo-game">' + E(tt.ten_game || 'Chém Trái Cây') + '</p>' +
        '<h2 class="dao-mo-man">' + E(ten) + '</h2>' +
        (phu ? '<p class="dao-mo-vung">' + E(phu) + '</p>' : '') +
        '<p class="dao-mo-cach">Đọc đề ở trên, rồi <b>vuốt ngón tay</b> chém quả mang <b>đáp án đúng</b>. Quả rơi mất thì sẽ bay lại, ' +
          (be.ten ? E(be.ten) : 'con') + ' cứ bình tĩnh nhé!</p>' +
        '<div class="btn-row"><button type="button" class="btn big green dao-nut-to" id="dao-nut-bat-dau">▶ Bắt đầu</button></div>' +
        '<div class="btn-row"><button type="button" class="btn ghost small" id="dao-nut-ve">Về đảo</button></div>' +
      '</div>';
    if (app && app.appendChild) app.appendChild(the);
    dom.the = the;

    // HUD: tiến độ câu (thay đồng hồ ván) và khủng long cổ vũ (thay tim)
    const giua = document.querySelector('#hud .hud-center');
    const tien = document.createElement('div');
    tien.className = 'dao-tien-do';
    tien.id = 'dao-tien-do';
    tien.innerHTML = '<span class="dao-tien-do-chu" id="dao-tien-do-chu">Câu 1</span><span class="dao-thanh"><i id="dao-thanh"></i></span>';
    if (giua && giua.insertBefore) {
      const hint = $('hud-hint');
      if (hint && hint.parentNode === giua) giua.insertBefore(tien, hint); else giua.appendChild(tien);
    }
    const phai = document.querySelector('#hud .hud-right');
    const kl = document.createElement('div');
    kl.className = 'dao-kl';
    kl.innerHTML = (be.hinh ? '<img id="dao-kl-hinh" alt="" src="' + E(be.hinh) + '">' : '') + '<span class="dao-qm hidden" id="dao-qm" aria-hidden="true"></span>';
    if (phai && phai.insertBefore) phai.insertBefore(kl, phai.firstChild);
    dom.klHop = kl;

    // Bảng tạm dừng: nút "Về đảo"
    const pausePanel = document.querySelector('#pause .panel');
    const hang = document.createElement('div');
    hang.className = 'btn-row dao-hang-ve';
    hang.innerHTML = '<button type="button" class="btn ghost" id="dao-nut-ve-dao">Về đảo</button>';
    if (pausePanel && pausePanel.appendChild) pausePanel.appendChild(hang);
    const nutChoiLai = $('btn-restart');
    if (nutChoiLai && nutChoiLai.parentNode && nutChoiLai.parentNode.classList) nutChoiLai.parentNode.hidden = true;   // hàng "Chơi lại", "Menu"

    dom.batDau = $('dao-nut-bat-dau');
    dom.ve = $('dao-nut-ve');
    dom.veDao = $('dao-nut-ve-dao');
    dom.tienChu = $('dao-tien-do-chu');
    dom.thanh = $('dao-thanh');
    dom.klHinh = $('dao-kl-hinh');
    dom.qm = $('dao-qm');
    nhan(dom.batDau, batDauChoi);
    nhan(dom.ve, function () { veDao(); });
    nhan(dom.veDao, function () { veDao(); });
  }

  function nhan(el, fn) {
    if (!el || !el.addEventListener) return;
    el.addEventListener('click', function (e) {
      try { nb.Sfx.unlock(); nb.Sfx.play('click'); fn(e); } catch (err) { baoLoi(err); }
    });
  }

  function moThe() {
    if (!dom.the) return;
    dom.the.classList.remove('hidden');
    setTimeout(function () { try { dom.batDau.focus(); } catch (e) { /* bỏ qua */ } }, 60);
  }

  /** Thẻ đang mở (quả trang trí bay hai bên thẻ, không chui sau thẻ). */
  function manHinhMo() { return dom.the && !dom.the.classList.contains('hidden') ? dom.the : null; }

  function batDauChoi() {
    if (s.daBatDau || s.xong) return;
    s.daBatDau = true;
    try { nb.Voice.unlock(); } catch (e) { /* bỏ qua */ }
    goi('batDau', { che_do: 'chem_dap_an', toc_do: TOC_DO, so_lua_chon: SO_LUA_CHON, bom: 0 });
    if (dom.the) dom.the.classList.add('hidden');
    nb.startGame(MAN);
  }

  /* ---------------- Câu hỏi ---------------- */

  function cauMoi() {
    if (s.xong || !nb) return;
    const G = nb.G;
    let q = null;
    try {
      q = CN.cauTiep({ so_lua_chon: SO_LUA_CHON, vi_tri: VI_TRI.slice() });
    } catch (e) {
      // Lỗi của cầu nối (không phải hết câu): thử lại sau một giây; lỗi mãi thì kết thúc để bé không kẹt
      baoLoi(e);
      s.loiCau = (s.loiCau || 0) + 1;
      if (s.loiCau < 3) G.nextQuestionAt = G.time + 1; else hoanThanh();
      return;
    }
    s.loiCau = 0;
    if (!q) { hoanThanh(); return; }
    if (!q.lua_chon || q.lua_chon.length < 2) {
      // Câu không có lựa chọn (dạng nhập số) thì không chém được: báo hết giờ để đảo xếp câu khác, không phạt bé
      baoLoi(new Error('Câu không có lựa chọn: ' + q.ma_cau));
      goi('hetGio');
      G.nextQuestionAt = G.time + 0.1;
      return;
    }
    s.cau = q;
    s.tong = q.tong || s.tong;
    s.lc = q.lua_chon.map(function (x, i) { return Object.assign({}, x, { chiSo: i }); });
    s.loaiBo = {};
    s.daThu = {};
    s.goiYCap = 0;
    s.soNem = 0;
    s.daGap[q.ma_cau] = 1;
    MAN.speed = TOC_DO;
    nb.updateGravity();
    G.question = { text: q.de, answer: q.dap_an, dao: true, review: !!q.on_lai };
    G.misses = 0;
    G.held = null;
    G.wave = null;
    const hint = nb.ui.hint;
    hint.hidden = true;
    hint.classList.remove('reading');
    veThe(false, true);
    capNhatTienDo();
    nb.measureHud();
    nb.Sfx.play('question');
    noi(q.de_doc || q.de, { queue: true });
    nem(CAU_HINH.docDeTruocS);
  }

  /** Hoành độ các cột quả (một cột cho mỗi lựa chọn, giữ nguyên khi ném lại để vi_tri luôn đúng). */
  function cacCot(n) {
    const G = nb.G;
    const le = G.R * 1.15 + G.W * 0.05;
    const o = Math.max(G.R * 2.1, (G.W - 2 * le) / n);
    const tong = o * n;
    const x0 = (G.W - tong) / 2;
    const ra = [];
    for (let i = 0; i < n; i++) ra.push(x0 + o * (i + 0.5) + (Math.random() - 0.5) * Math.min(o * 0.2, G.R * 0.4));
    return ra;
  }

  function conLai() {
    return s.lc.filter(function (x) { return !s.loaiBo[khoa(x.gia_tri)] && !s.daThu[khoa(x.gia_tri)]; });
  }

  function nem(lead) {
    const G = nb.G;
    const ds = conLai();
    if (!ds.length) return;
    const cot = cacCot(s.lc.length);
    s.soNem++;
    const wave = nb.launchWave(ds.map(function (x) { return x.gia_tri; }), {
      lead: lead || 0, track: true, calm: true, apexPad: Math.min(70, G.H * 0.08),
      xs: ds.map(function (x) { return cot[x.chiSo]; }), lc: ds
    });
    if (wave) {
      wave.hint = s.goiYCap > 0;   // câu đã xem gợi ý: đúng được 50 điểm, không tăng combo (luật cũ của game)
      wave.dao = true;
    }
    G.relaunchAt = -1;
    nb.syncHintBtn(true);
  }

  /** Cả đợt quả rơi hết mà bé chưa chém: ném lại, chậm hơn, không phạt. */
  function nemLai(lead) {
    if (!s.cau || s.choPH || s.xong) return;
    const G = nb.G;
    MAN.speed = Math.max(TOC_DO_THAP, TOC_DO - 0.05 * G.misses);
    nb.updateGravity();
    if (G.misses === 1) {
      nb.addText('Không sao, quả bay lại nè!', G.W / 2, G.H * 0.62, { color: '#ffffff', stroke: 'rgba(43,45,66,0.9)', size: G.R * 0.62, life: 1.8, vy: -18 });
    }
    if (G.misses >= 2 && s.goiYCap < 3) nhacGoiY();
    nem(Math.max(0.3, lead || 0));
  }

  function nhacGoiY() {
    const b = nb.ui.btnHint;
    if (b) {
      b.classList.remove('dao-nhac');
      void b.offsetWidth;
      b.classList.add('dao-nhac');
      clearTimeout(nhacGoiY._t);
      nhacGoiY._t = setTimeout(function () { b.classList.remove('dao-nhac'); }, 3200);
    }
    if (!s.nhacGoiY) {
      s.nhacGoiY = true;
      nb.showHint('Bí quá thì bấm 💡 để xem gợi ý nhé', 'dao-goi-y', 3200);
    }
  }

  /* ---------------- Chém ---------------- */

  /** Bé chém một quả mang lựa chọn: ghi thao tác, chấm qua đảo. Trả về true nếu đúng. */
  function chem(f) {
    if (!s.cau || !f || !f.lc || s.choPH || s.xong) return false;
    const G = nb.G;
    const lc = f.lc;
    goi('thaoTac', 'vuot', { doi_tuong: 'qua', gia_tri: lc.gia_tri, vi_tri: lc.vi_tri || VI_TRI[lc.chiSo], x: tron2(f.x / G.W), y: tron2(f.y / G.H), lan_nem: s.soNem });
    const kq = goi('traLoi', lc.gia_tri, { vi_tri: lc.vi_tri || VI_TRI[lc.chiSo], lan_nem: s.soNem });
    if (!kq) return false;
    if (kq.dung) { khiDung(f, kq); return true; }
    khiSai(f, lc, kq);
    return false;
  }

  function khiDung(f, kq) {
    s.dem.dung++;
    s.daXong[s.cau.ma_cau] = 1;
    veThe(true, false);
    nb.onCorrect(f);                 // điểm, combo, lời khen, âm thanh, chớp xanh
    nb.G.nextQuestionAt = nb.G.time + 1.1;   // để bé kịp nhìn đáp án đúng hiện trong thẻ câu hỏi
    capNhatTienDo();
    khungLongVui(kq.qua_mong || 0);
  }

  function khiSai(f, lc, kq) {
    const G = nb.G;
    s.dem.sai++;
    G.wrong++;
    G.streak = 0;
    // Không chê: một dòng nhẹ nhàng, không trừ tim, không rung màn hình. Lời giải là việc của thẻ "Gần đúng rồi".
    nb.addText('Chưa đúng', f.x, f.y - f.r * 1.2, { color: '#ffe3ea', stroke: 'rgba(90,20,50,0.85)', size: G.R * 0.8, life: 1.1 });
    nb.Sfx.play('miss');
    nb.cardFx('shake');
    if (kq.thu_lai) {
      s.daThu[khoa(lc.gia_tri)] = 1;
      G.blades.forEach(function (b) { b.daoKhoa = true; });
      if (kq.loi_noi) { nb.showHint(kq.loi_noi, 'bad'); noi(kq.loi_noi); }
      nb.syncHintBtn(true);
      return;
    }
    // Sai hẳn: dừng quả, chờ màn "Gần đúng rồi" của đảo (đảo ghi phan_hoi_xem, đóng câu, cho câu quay lại sau 2 câu)
    s.choPH = true;
    G.state = 'cho_dao';
    G.blades.clear();
    if (G.wave) G.wave.resolved = true;
    G.fruits.forEach(function (o) { if (o !== f && !o.dead) nb.popFruit(o); });
    nb.ui.hint.hidden = true;
    nb.syncHintBtn(true);
    const q = s.cau;
    const giaTri = lc.gia_tri;
    setTimeout(function () {
      if (s.xong) return;
      nb.Voice.stop();
      let p = null;
      try { p = CN.phanHoi(giaTri, kq); } catch (e) { baoLoi(e); }
      Promise.resolve(p).then(function () { sauPhanHoi(q); }, function (e) { baoLoi(e); sauPhanHoi(q); });
    }, CAU_HINH.choPhanHoiMs);
  }

  function sauPhanHoi(q) {
    if (s.xong || !s.choPH) return;
    const G = nb.G;
    s.choPH = false;
    s.daXong[q.ma_cau] = 1;
    G.fruits.forEach(function (o) { if (!o.dead) nb.popFruit(o); });
    G.wave = null;
    G.state = 'playing';
    G.relaunchAt = -1;
    G.nextQuestionAt = G.time + 0.35;
    capNhatTienDo();
  }

  /* ---------------- Gợi ý ---------------- */

  function coGoiY() {
    if (!nb || !s.cau || s.choPH || s.xong || s.goiYCap >= 3) return false;
    const G = nb.G;
    return G.state === 'playing' && G.nextQuestionAt < 0 && !!G.wave && !G.wave.resolved;
  }

  function goiY() {
    if (!coGoiY()) return;
    const G = nb.G;
    let bo = null;
    if (s.goiYCap + 1 >= 3) {
      // Cấp 3: bỏ một quả sai (còn ít nhất 2 quả để bé tự chọn)
      const con = conLai();
      const sai = con.filter(function (x) { return !x.dung; });
      if (con.length >= 3 && sai.length) bo = sai[Math.floor(Math.random() * sai.length)];
    }
    const r = goi('goiY', bo ? { loai_bo: bo.gia_tri } : null);
    if (!r) { s.goiYCap = 3; nb.syncHintBtn(true); return; }
    s.goiYCap = r.cap || s.goiYCap + 1;
    s.dem.goi_y++;
    if (G.wave) G.wave.hint = true;
    nb.showHint('💡 ' + r.loi, 'dao-goi-y');
    noi(r.loi);
    khungLongNghi();
    if (bo) {
      s.loaiBo[khoa(bo.gia_tri)] = 1;
      G.fruits.forEach(function (o) {
        if (o.dead || !o.lc || khoa(o.lc.gia_tri) !== khoa(bo.gia_tri)) return;
        if (o.launched) nb.addText('Không phải ' + bo.nhan, Math.max(G.R * 2.2, Math.min(G.W - G.R * 2.2, o.x)), Math.max(o.y, G.hudBottom + G.R * 1.6), { color: '#ffffff', stroke: 'rgba(43,45,66,0.9)', size: G.R * 0.62, life: 1.3 });
        nb.popFruit(o);
      });
    }
    nb.syncHintBtn(true);
  }

  /* ---------------- Thẻ câu hỏi, tiến độ, khủng long ---------------- */

  function htmlDe(q, hien) {
    const E = nb.esc;
    const ct = q.cau_truc || {};
    const nhanDung = E(q.dap_an_nhan != null ? q.dap_an_nhan : q.dap_an);
    if (ct.loai === 'so_sanh' && ct.kieu === 'dau') {
      return { lop: 'dao-hai-dong', html: '<span class="dao-dong-nho">Chọn dấu &gt;, &lt; hay =</span>' +
        '<span class="dao-dong"><span class="dao-so">' + E(ct.a) + '</span>' +
        '<span class="dao-o' + (hien ? ' dung' : '') + '">' + (hien ? nhanDung : '?') + '</span>' +
        '<span class="dao-so">' + E(ct.b) + '</span></span>' };
    }
    if (ct.loai === 'so_sanh' && (ct.kieu === 'lon_nhat' || ct.kieu === 'be_nhat') && Array.isArray(ct.ds)) {
      return { lop: 'dao-hai-dong', html: '<span class="dao-dong-nho">Số nào <b>' + (ct.kieu === 'lon_nhat' ? 'lớn nhất' : 'bé nhất') + '</b>?</span>' +
        '<span class="dao-dong dao-ds">' + ct.ds.map(function (x) {
          return '<span class="dao-so' + (hien && String(x) === String(q.dap_an) ? ' dung' : '') + '">' + E(x) + '</span>';
        }).join('<span class="dao-phay">,</span>') + '</span>' };
    }
    const de = String(q.de || '');
    const hinh = q.hinh ? '<span class="dao-hinh">' + q.hinh + '</span>' : '';   // SVG do ngân hàng của đảo sinh
    const o = hien ? '<span class="q dao-lo">' + nhanDung + '</span>' : '<span class="q">?</span>';
    const i = de.indexOf('?');
    const chu = i >= 0 ? E(de.slice(0, i)) + o + E(de.slice(i + 1)) : E(de);
    return { lop: (de.length > 18 ? 'dao-de-dai' : '') + (hinh ? ' dao-co-hinh' : ''), html: '<span class="dao-dong">' + chu + '</span>' + hinh };
  }

  function veThe(hien, pop) {
    const q = s.cau;
    const el = nb.ui.question;
    if (!q || !el) return;
    const h = htmlDe(q, hien);
    el.innerHTML = h.html;
    el.className = 'question-card dao-the-cau ' + h.lop + (hien ? ' ok' : '');
    if (nb.ui.review) nb.ui.review.hidden = !q.on_lai;
    if (pop) { void el.offsetWidth; el.classList.add('pop'); }
  }

  function capNhatTienDo() {
    if (!dom.tienChu) return;
    const tong = Math.max(1, s.tong || 1);
    const gap = Object.keys(s.daGap).length;
    const xong = Object.keys(s.daXong).length;
    dom.tienChu.textContent = 'Câu ' + Math.max(1, Math.min(tong, gap)) + '/' + tong;
    if (dom.thanh && dom.thanh.style) dom.thanh.style.width = (100 * Math.min(1, xong / tong)).toFixed(1) + '%';
  }

  function doiHinhKL(url, ms) {
    const be = (s.tt && s.tt.be) || {};
    if (!dom.klHinh || !url) return;
    dom.klHinh.src = url;
    clearTimeout(doiHinhKL._t);
    doiHinhKL._t = setTimeout(function () { if (dom.klHinh && be.hinh) dom.klHinh.src = be.hinh; }, ms);
  }

  function khungLongVui(quaMong) {
    const be = (s.tt && s.tt.be) || {};
    doiHinhKL(be.hinh_co_vu, 1400);
    if (dom.klHop) {
      dom.klHop.classList.remove('vui');
      void dom.klHop.offsetWidth;
      dom.klHop.classList.add('vui');
    }
    if (dom.qm && quaMong > 0) {
      const anhQM = be.hinh ? String(be.hinh).replace(/[^/]*$/, 'berry.webp') : '';
      dom.qm.innerHTML = '+' + quaMong + (anhQM ? ' <img alt="" src="' + nb.esc(anhQM) + '">' : ' quả mọng');
      dom.qm.classList.remove('hidden', 'bay');
      void dom.qm.offsetWidth;
      dom.qm.classList.add('bay');
      clearTimeout(khungLongVui._t);
      khungLongVui._t = setTimeout(function () { dom.qm.classList.add('hidden'); dom.qm.classList.remove('bay'); }, 1300);
    }
  }

  function khungLongNghi() {
    const be = (s.tt && s.tt.be) || {};
    doiHinhKL(be.hinh_goi_y, 2600);
  }

  /* ---------------- Vẽ nhãn trên quả ---------------- */

  /** Bố cục chữ trên quả (đo một lần): dấu so sánh thật to, số 1 đến 4 chữ số, nhãn dài thu nhỏ hoặc xuống 2 dòng. */
  function boCuc(c, chu, r) {
    const R = Math.round(r);
    if (/^[<>=]$/.test(chu)) return { r: R, co: Math.round(r * 1.5), dong: [chu], dau: true };
    const doDai = chu.length;
    const rong = r * 1.72;
    let co = r * (doDai <= 2 ? 1.0 : doDai === 3 ? 0.86 : 0.74);
    c.font = nb.numFont(Math.round(co));
    const w = c.measureText(chu).width || 1;
    if (w > rong) co = co * rong / w;
    // Chỗ được xuống dòng: dấu cách, hoặc ngay sau dấu phẩy (dãy số '26,60,62,66')
    const cat = [];
    for (let i = 1; i < chu.length; i++) if (chu[i] === ' ' || chu[i - 1] === ',') cat.push(i);
    if (co >= r * 0.46 || !cat.length) return { r: R, co: Math.round(Math.max(co, r * 0.3)), dong: [chu] };
    // Hai dòng dài gần bằng nhau
    let chon = cat[0], lech = Infinity;
    cat.forEach(function (i) {
      const d = Math.abs(chu.slice(0, i).trim().length - chu.slice(i).trim().length);
      if (d < lech) { lech = d; chon = i; }
    });
    const dong = [chu.slice(0, chon).trim(), chu.slice(chon).trim()];
    let co2 = r * 0.62;
    dong.forEach(function (d) {
      c.font = nb.numFont(Math.round(co2));
      const w2 = c.measureText(d).width || 1;
      if (w2 > r * 1.55) co2 = co2 * r * 1.55 / w2;
    });
    return { r: R, co: Math.round(Math.max(co2, r * 0.28)), dong: dong };
  }

  function anhCua(lc) {
    const k = lc.hinh;
    let im = s.anh[k];
    if (!im) {
      try {
        im = new Image();
        im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(k);
        s.anh[k] = im;
      } catch (e) { return null; }
    }
    return im && im.complete && im.naturalWidth ? im : null;
  }

  function veDia(c, x, y, r) {
    c.fillStyle = 'rgba(255,255,255,0.94)';
    c.strokeStyle = 'rgba(25,20,40,0.75)';
    c.lineWidth = Math.max(2, r * 0.08);
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.stroke();
  }

  function veDongHo(c, x, y, r, dh) {
    veDia(c, x, y, r);
    c.strokeStyle = '#2b2d42';
    c.lineCap = 'round';
    for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12;
      c.lineWidth = i % 3 === 0 ? Math.max(2, r * 0.07) : Math.max(1, r * 0.035);
      c.beginPath();
      c.moveTo(x + Math.cos(a) * r * (i % 3 === 0 ? 0.72 : 0.8), y + Math.sin(a) * r * (i % 3 === 0 ? 0.72 : 0.8));
      c.lineTo(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9);
      c.stroke();
    }
    const h = Number(dh.h) || 0, m = Number(dh.m) || 0;
    const aH = ((h % 12) + m / 60) / 12 * TAU - Math.PI / 2;
    const aM = m / 60 * TAU - Math.PI / 2;
    c.strokeStyle = '#2b2d42';
    c.lineWidth = Math.max(3, r * 0.11);
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(aH) * r * 0.48, y + Math.sin(aH) * r * 0.48); c.stroke();
    c.strokeStyle = '#d84f1d';
    c.lineWidth = Math.max(2, r * 0.07);
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(aM) * r * 0.74, y + Math.sin(aM) * r * 0.74); c.stroke();
    c.fillStyle = '#2b2d42';
    c.beginPath(); c.arc(x, y, Math.max(2.5, r * 0.08), 0, TAU); c.fill();
  }

  function veNhan(c, f) {
    if (!f.launched || f.kind !== 'fruit' || f.scale <= 0.5) return;
    const lc = f.lc;
    const r = f.r * f.scale;
    if (lc.dong_ho) { veDongHo(c, f.x, f.y, r * 0.8, lc.dong_ho); return; }
    if (lc.hinh) {
      const im = anhCua(lc);
      if (im) { veDia(c, f.x, f.y, r * 0.84); c.drawImage(im, f.x - r * 0.62, f.y - r * 0.62, r * 1.24, r * 1.24); return; }
    }
    let bc = f.daoBoCuc;
    if (!bc || bc.r !== Math.round(r)) bc = f.daoBoCuc = boCuc(c, String(lc.nhan != null ? lc.nhan : lc.gia_tri), r);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineJoin = 'round';
    c.font = nb.numFont(bc.co);
    c.lineWidth = Math.max(3, bc.co * (bc.dau ? 0.17 : 0.13));
    c.strokeStyle = 'rgba(25,20,40,0.92)';
    c.fillStyle = bc.dau ? '#fff6c2' : '#ffffff';
    const cao = bc.co * 1.02;
    const y0 = f.y + r * 0.05 - (bc.dong.length - 1) * cao / 2 + (bc.dau ? -bc.co * 0.06 : 0);
    for (let i = 0; i < bc.dong.length; i++) {
      c.strokeText(bc.dong[i], f.x, y0 + i * cao);
      c.fillText(bc.dong[i], f.x, y0 + i * cao);
    }
  }

  /* ---------------- Tạm dừng, về đảo, kết thúc ---------------- */

  function khiTamDung(nguon) {
    const info = $('pause-info');
    if (info) info.textContent = (dom.tienChu ? dom.tienChu.textContent + ' · ' : '') + 'Điểm: ' + nb.fmt(nb.G.score);
    if (!s.daBatDau || s.xong || s.dangDung) return;
    s.dangDung = true;
    goi('tamDung', nguon || 'nut');
    setTimeout(function () { try { $('btn-resume').focus(); } catch (e) { /* bỏ qua */ } }, 60);
  }

  function khiTiepTuc() {
    if (!s.dangDung) return;
    s.dangDung = false;
    goi('tiepTuc', 'nut');
  }

  function veDao() {
    if (s.xong) return;
    s.xong = true;
    try { nb.Voice.stop(); nb.Music.stop(); } catch (e) { /* bỏ qua */ }
    if (s.dangDung) { s.dangDung = false; goi('tiepTuc', 'thoat'); }
    const p = goi('veDao', { diem: nb.G.score || 0 });
    Promise.resolve(p).catch(baoLoi);
  }

  function hoanThanh() {
    if (s.xong) return;
    s.xong = true;
    const G = nb.G;
    G.state = 'cho_dao';
    G.blades.clear();
    G.nextQuestionAt = -1;
    G.relaunchAt = -1;
    nb.ui.hint.hidden = true;
    nb.syncHintBtn(true);
    capNhatTienDo();
    const el = nb.ui.question;
    if (el) { el.className = 'question-card dao-the-cau ok'; el.innerHTML = '<span class="dao-dong">Xong rồi! 🎉</span>'; }
    if (nb.ui.review) nb.ui.review.hidden = true;
    nb.addText('Giỏi quá!', G.W / 2, G.H * 0.45, { color: '#ffd166', stroke: 'rgba(43,45,66,0.95)', size: G.R * 1.6, life: 2, vy: -20 });
    nb.spawnConfetti(90);
    nb.Sfx.play('record');
    nb.Sfx.play('applause');
    nb.Music.stop();
    noi('Giỏi quá! ' + (tenBe() ? tenBe() + ' ' : '') + 'chém xong cả màn rồi!');
    khungLongVui(0);
    const diem = G.score || 0;
    const them = {
      diem: diem,
      dong_phu: 'Chém đúng ' + s.dem.dung + ' quả · ' + nb.fmt(diem) + ' điểm',
      combo_cao_nhat: G.bestStreak || 0
    };
    setTimeout(function () {
      const p = goi('ketThuc', them);
      Promise.resolve(p).catch(baoLoi);
    }, CAU_HINH.ketThucMs);
  }

  /** Một khung hình lỗi (game.js đã dọn các thực thể): ném lại câu đang chơi thay vì về menu. */
  function khiLoi(msg) {
    baoLoi(msg);
    if (!nb || s.xong) return;
    const G = nb.G;
    if (G.state === 'playing' && s.cau && !s.choPH && G.nextQuestionAt < 0) { G.wave = null; nem(0.3); }
  }

  window.NinjaDao = {
    PHIEN_BAN: 1,
    VI_TRI: VI_TRI,
    CAU_HINH: CAU_HINH,
    khoiDong: khoiDong, cauMoi: cauMoi, nemLai: nemLai, chem: chem, goiY: goiY, coGoiY: coGoiY,
    veNhan: veNhan, khiTamDung: khiTamDung, khiTiepTuc: khiTiepTuc, khiLoi: khiLoi,
    tenBe: tenBe, manHinhMo: manHinhMo, batDauChoi: batDauChoi, veDao: veDao,
    _boCuc: function (c, chu, r) { return boCuc(c, chu, r); },
    _htmlDe: function (q, hien) { return htmlDe(q, hien); },
    _trangThai: function () { return s; }
  };
})();
