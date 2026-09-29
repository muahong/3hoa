/* ============================================================
   dao.js – Chế độ Đảo Khủng Long của Mê Cung Đồng Hồ (giai đoạn 5)
   - Chỉ bật khi trang mở trong iframe của đảo: có ?dao=1, window.parent !== window và window.parent.DaoCauNoi.
     Mọi trường hợp khác: window.MeCungDao = { bat: false } và game chạy y như cũ.
   - Đảo giữ ngân hàng câu, ván chơi và nhật ký (hợp đồng ở dao-khung-long/js/cau-noi.js). Game chỉ vẽ và điều khiển:
     mỗi câu là một lượt mê cung, 3 ô đích mang 3 lựa chọn (cauTiep({ so_lua_chon: 3, vi_tri })),
     Cú Tí đi tới ô nào là chọn đáp án đó (traLoi). Sai hẳn: đảo hiện màn "Gần đúng rồi" (phanHoi) rồi sang câu mới.
   - Ma không bao giờ kết thúc ván: ma chạm vào thì Cú Tí về chỗ xuất phát (không tính là trả lời).
   - Ghi thao tác gọn: di_chuyen theo từng đoạn thẳng (không theo khung hình), chon khi bé chạm một ô đích mới,
     cham khi chạm ô đường đi, chạm lại đích cũ hay chạm Cú Tí để dừng, nghe_lai, cham của ma.
   - Không có menu, chọn màn, tim, bài học, hỏi đáp, bảng kết quả; không ghi localStorage của game (đảo là nơi ghi).
   Móc trong js/game.js: tìm "[ĐẢO]". Nạp sau clock.js, mazes.js và trước game.js.
   ============================================================ */
(function () {
  'use strict';

  const SO_LUA_CHON = 3;
  const TOI_DA_DOAN = 40;          // số sự kiện di_chuyen tối đa mỗi câu (quá thì chỉ đếm)
  const CHO_PHAN_HOI_MS = 900;     // để bé thấy dấu ✗ và Cú Tí tiu nghỉu trước khi đảo hiện lời giải
  const FONT = '"Baloo 2", "Arial Rounded MT Bold", "Segoe UI", Arial, sans-serif';
  const TAU = Math.PI * 2;
  const KHEN = ['Chính xác!', 'Tuyệt vời!', 'Giỏi quá!', 'Đúng rồi!', 'Xuất sắc!', 'Hay lắm!', 'Cú Tí giỏi ghê!'];
  const HUONG = { '0,-1': 'len', '0,1': 'xuong', '-1,0': 'trai', '1,0': 'phai' };

  function timCauNoi() {
    try {
      if (!/[?&]dao=1(&|$)/.test(String(window.location.search || ''))) return null;
      if (!window.parent || window.parent === window) return null;
      const cn = window.parent.DaoCauNoi;
      return cn && typeof cn.cauTiep === 'function' && typeof cn.traLoi === 'function' ? cn : null;
    } catch (e) { return null; }            // khác tên miền: không phải đảo
  }

  const CN = timCauNoi();
  if (!CN) { window.MeCungDao = { bat: false }; return; }

  let game = null;                        // API nội bộ của game.js, truyền vào qua khoiDong
  let dom = null;
  const s = {
    pha: 'cho_bat_dau',                   // cho_bat_dau | dang_choi | xong
    tt: null,                             // thongTin() của đảo
    daBatDauVan: false,
    q: null,                              // câu đang hiện (JSON từ cauTiep)
    cauMo: false,                         // câu chưa có kết quả cuối: còn ghi thao tác
    soCau: 0, dung: 0, biMaTong: 0,
    // trong một câu
    goiYCap: 0, goiYCuoi: '', doan: null, soDoan: 0, soO: 0, biMa: 0, ghe: {}, chonCuoi: null, oTruoc: null,
    cach: 'cham',                         // cách điều khiển gần nhất: cham | vuot | phim | nut
    hudDay: 0,
    loi: []
  };

  function G() { return game.G; }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function oCua(p) { return p.r + ',' + p.c; }
  function cungGiaTri(a, b) { return String(a) === String(b); }
  function fmt(n) { try { return Number(n).toLocaleString('vi-VN'); } catch (e) { return String(n); } }

  /** Ghi lỗi để kiểm thử đọc được (window.__meCungDaoLoi); daGhi: game đã in ra console rồi. */
  function baoLoi(e, daGhi) {
    const msg = e && e.message ? e.message : String(e);
    s.loi.push(msg);
    window.__meCungDaoLoi = s.loi;
    if (!daGhi) { try { console.error('[me-cung/dao]', msg); } catch (x) { /* bỏ qua */ } }
  }
  /** Gọi hợp đồng của đảo; lỗi không được làm treo game. */
  function goi(ten) {
    const args = Array.prototype.slice.call(arguments, 1);
    try { return CN[ten].apply(CN, args); } catch (e) { baoLoi(e); return null; }
  }
  function ghi(kieu, du) { if (s.cauMo) goi('thaoTac', kieu, du); }

  /** Đọc bằng giọng của game; máy không có giọng Việt thì nhờ giọng của đảo. */
  function noi(chu) {
    if (!chu || !s.tt || !s.tt.am_thanh.giong) return;
    if (game.Voice.available) game.Voice.say(chu);
    else goi('doc', chu);
  }

  function apAmThanh() {
    const a = (s.tt && s.tt.am_thanh) || { tieng: true, giong: true };
    game.Sfx.setEnabled(!!a.tieng);
    game.Music.setEnabled(!!a.tieng);
    game.Voice.setEnabled(!!a.giong);
  }

  /* ---------------- Khởi động: thẻ bắt đầu, nút "Về đảo" ---------------- */

  function tao(tag, cls, chu) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (chu != null) el.textContent = chu;
    return el;
  }

  function dungDom() {
    const app = document.getElementById('app');
    const man = (s.tt && s.tt.man) || {};
    const the = tao('div', 'screen dim dao-bat-dau');
    the.id = 'dao-bat-dau';
    const panel = tao('div', 'panel dao-the');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', man.ten || 'Mê Cung');
    const hinh = tao('div', 'dao-hinh-game');
    // Hình Cú Tí trên đồng hồ của menu (menu không bao giờ hiện trong đảo nên chuyển hẳn sang đây, giữ gradient)
    const logo = document.querySelector('#menu .logo-row > svg');
    if (logo && logo.parentNode) hinh.appendChild(logo);
    const vung = tao('p', 'dao-vung', tenVung(man));
    const ten = tao('h2', 'dao-ten-man', man.ten || 'Mê Cung');
    const luat = tao('ul', 'dao-luat');
    luat.innerHTML =
      '<li><span aria-hidden="true">🔍</span><span>Đọc câu hỏi ở phía trên.</span></li>' +
      '<li><span aria-hidden="true">🦉</span><span>Đưa Cú Tí tới ô có <b>đáp án đúng</b>.</span></li>' +
      '<li><span aria-hidden="true">👻</span><span>Ma chạm vào thì Cú Tí về chỗ xuất phát thôi.</span></li>';
    const nut = tao('button', 'btn big green dao-nut-bat-dau', '▶ Bắt đầu');
    nut.type = 'button';
    nut.id = 'dao-nut-bat-dau';
    nut.addEventListener('click', batDauChoi);
    panel.appendChild(hinh); panel.appendChild(vung); panel.appendChild(ten); panel.appendChild(luat); panel.appendChild(nut);
    the.appendChild(panel);
    if (app) app.appendChild(the);

    // Bảng tạm dừng: "🔊 Âm thanh" + "🏝️ Về đảo" (các nút chơi lại, bài học, menu, trang chủ được ẩn bằng dao.css)
    const ve = tao('button', 'btn teal dao-nut-ve', '🏝️ Về đảo');
    ve.type = 'button';
    ve.id = 'dao-ve-dao';
    ve.addEventListener('click', veDao);
    hangTamDung(ve, function () { return !s.tt || !s.tt.am_thanh || !!s.tt.am_thanh.tieng; }, function (bat) {
      if (s.tt) s.tt.am_thanh = Object.assign({ tieng: true, giong: true }, s.tt.am_thanh, { tieng: bat });   // apAmThanh đọc lại đúng giá trị này
      game.Sfx.setEnabled(bat);
      game.Music.setEnabled(bat);
    });
    dom = { the: the, nut: nut, ve: ve };
  }

  function tenVung(man) {
    const du = String(man.ten_day_du || '');
    const ten = String(man.ten || '');
    const vung = ten && du.slice(-(ten.length + 3)) === ' · ' + ten ? du.slice(0, -(ten.length + 3)) : du;
    return (vung ? vung + ' · ' : '') + (man.so_cau ? man.so_cau + ' câu' : '');
  }

  function khoiDong(api) {
    game = api;
    document.documentElement.classList.add('dao-mode');
    s.tt = goi('sanSang');
    if (!s.tt) s.tt = { man: {}, am_thanh: { tieng: true, giong: true } };
    apAmThanh();
    dungDom();
    game.G.state = 'dao';
    game.showScreen(null);
    game.showHud(false);
    setTimeout(function () { try { dom.nut.focus({ preventScroll: true }); } catch (e) { /* bỏ qua */ } }, 80);
  }

  /**
   * Màn chơi dựng từ màn của đảo: 3 đích, 2 ma chậm (như màn 1 của game, hợp lớp 2),
   * mê cung gọn 9 × 13 (ô to: nhãn, đồng hồ và hình của đề đều đọc rõ, đường đi ngắn để tập trung vào bài toán).
   */
  function manChoi() {
    const m = (s.tt && s.tt.man) || {};
    const tong = Math.max(1, m.so_cau || 8);
    return { id: 'dao', n: 1, grade: 2, icon: '🦉', title: m.ten || 'Mê Cung', desc: '', kind: 'dao', mins: [0], focus: [0],
      maze: 'A', rounds: tong, clocks: SO_LUA_CHON, ghosts: 3, speed: 2.3, takeaway: '', gon: true };
  }

  function batDauChoi() {
    if (s.pha !== 'cho_bat_dau') return;
    s.pha = 'dang_choi';
    game.Sfx.unlock();                    // chạm này mở âm thanh trên iPad
    game.Sfx.play('click');
    if (dom && dom.the) dom.the.classList.add('hidden');
    game.startLevel(manChoi());
  }

  /* ---------------- Một câu = một lượt mê cung ---------------- */

  /** Lượt tạm (chưa có câu) để game đo bố cục lần đầu. */
  function luotTam() {
    return { dao: true, q: null, html: '', speech: '', target: null, items: [], style: 'dao', hudClock: null, extra: null, review: false };
  }

  /** Tên vị trí trên màn hình của một ô: tren_trai, giua, duoi_phai… (thêm _2 nếu trùng trong lượt). */
  function tenViTri(spots) {
    const m = G().maze;
    const dung = {};
    return spots.map(function (p) {
      const hang = p.r < m.rows / 3 ? 'tren' : p.r >= m.rows * 2 / 3 ? 'duoi' : 'giua';
      const cot = p.c < m.cols / 3 ? 'trai' : p.c >= m.cols * 2 / 3 ? 'phai' : 'giua';
      let ten = hang === 'giua' && cot === 'giua' ? 'giua' : cot === 'giua' ? hang : hang + '_' + cot;
      dung[ten] = (dung[ten] || 0) + 1;
      if (dung[ten] > 1) ten += '_' + dung[ten];
      return ten;
    });
  }

  function hudDay() {
    try { const r = game.ui.hudTop.getBoundingClientRect(); return Math.round(r.bottom) + 'x' + Math.round(r.right); } catch (e) { return ''; }
  }

  function batDauLuot(silent) {
    const g = G();
    if (s.pha !== 'dang_choi') return;
    xaDoan();
    if (!s.daBatDauVan) {
      s.daBatDauVan = true;
      goi('batDau', { so_lua_chon: SO_LUA_CHON, me_cung: g.mazeId, gon: !!g.compact, so_ma: g.ghosts.length, toc_do_ma: g.level.speed });
    }
    // Đích không đặt sát nhà ma hay chỗ xuất phát (bị ma chạm thì Cú Tí về đó): bé đọc và đi cho thong thả
    const m = g.maze;
    const xa = function (p, ds, k) { return ds.every(function (h) { return Math.abs(h.r - p.r) + Math.abs(h.c - p.c) >= k; }); };
    const gon = Object.assign({}, m, { spots: m.spots.filter(function (p) { return xa(p, m.ghosts, 3) && xa(p, [m.player], 2); }) });
    let spots = game.M.fairSpots(gon, g.player.from, SO_LUA_CHON) || game.M.fairSpots(m, g.player.from, SO_LUA_CHON);
    if (!spots) spots = game.M.fairSpots(m, g.player.from, 2);
    if (!spots) { baoLoi(new Error('Không đủ chỗ đặt đích')); return; }
    const viTri = tenViTri(spots);
    const q = goi('cauTiep', { so_lua_chon: spots.length, vi_tri: viTri });
    if (!q) { hoanThanh(); return; }
    s.q = q; s.cauMo = true; s.soCau++;
    s.goiYCap = 0; s.goiYCuoi = ''; s.doan = null; s.soDoan = 0; s.soO = 0; s.biMa = 0; s.ghe = {}; s.chonCuoi = null;
    s.oTruoc = { r: g.player.from.r, c: g.player.from.c };
    const lc = q.lua_chon || [];
    g.items = lc.map(function (x, i) {
      const sp = spots[i] || spots[0];
      return { r: sp.r, c: sp.c, dao: x, correct: !!x.dung, style: 'dao', taken: false, born: g.anim, wobble: Math.random() * TAU };
    });
    // html: chữ thuần của đề (game chỉ dùng cho textContent sau khi bỏ thẻ: tạm dừng, "Cẩn thận nhé!")
    g.roundInfo = { dao: true, q: q, html: String(q.de || ''), speech: q.de_doc || q.de, target: null, items: [], style: 'dao', hudClock: null, extra: null, review: !!q.on_lai };
    g.roundWrong = 0;
    g.roundStart = g.time;
    g.nextRoundAt = -1;
    game.stopInput();
    g.reading = true;                       // ma đứng chờ khi bé đọc đề, tới lúc bé di chuyển
    g.powers.forEach(function (p) { p.taken = false; });
    const truoc = hudDay();
    veThe(true);
    if (hudDay() !== truoc) game.layout();  // thẻ câu hỏi cao hơn (có hình): tính lại ô mê cung
    if (!lc.length) { khongCoLuaChon(q); return; }
    if (!silent) { game.Sfx.play('target'); noi(q.de_doc || q.de); }
  }

  /** Câu không có lựa chọn (màn đặt dạng khác): mê cung không trả lời được, bỏ qua kiểu hết giờ để câu quay lại sau. */
  function khongCoLuaChon(q) {
    baoLoi(new Error('Câu dạng ' + q.dang + ' không có lựa chọn cho mê cung'));
    s.cauMo = false;
    goi('hetGio');
    G().nextRoundAt = G().time + 0.5;
  }

  /** Đề: chữ thường; dấu ? đứng riêng (chỗ cần điền, như "15, 20, ?, 30") tô cam, dấu hỏi cuối câu giữ nguyên. */
  function deHtml(de) {
    return esc(de)
      .replace(/[^\s,]+-[^\s,]+/g, '<span class="dao-lien">$&</span>')   // "xăng-ti-mét" không gãy ở dấu gạch nối
      .replace(/(^|[\s,(=+−×:-])\?(?=$|[\s,)=+−×:.-])/g, '$1<b class="dao-hoi">?</b>');
  }

  /** Vẽ thẻ câu hỏi (thay renderTarget của game). */
  function veThe(pop) {
    const ui = game.ui;
    const ri = G().roundInfo;
    const q = ri && ri.q;
    const label = ui.target.querySelector('.target-label');
    const rail = G().W > G().H && G().H <= 500;   // HUD dạng cột hẹp (điện thoại xoay ngang)
    if (label) label.textContent = q && q.on_lai && rail ? '📝 LÀM LẠI' : 'CÂU HỎI';
    if (!q) {
      ui.target.classList.remove('dao-co-hinh');
      ui.targetText.innerHTML = 'Sẵn sàng…';
      ui.targetClock.hidden = true;
      ui.targetClock.innerHTML = '';
      return;
    }
    const ngan = String(q.de || '').length <= 26;
    ui.targetText.innerHTML = (q.on_lai && !rail ? '<span class="review-tag">📝 Làm lại</span> ' : '') +
      '<span class="dao-de' + (ngan ? ' dao-de-ngan' : '') + '">' + deHtml(q.de) + '</span>';
    ui.target.classList.toggle('dao-co-hinh', !!q.hinh);
    if (q.hinh) {
      ui.targetClock.hidden = false;
      ui.targetClock.classList.add('dao-hinh');
      ui.targetClock.innerHTML = q.hinh;
      coHinh(ui.targetClock.querySelector('svg'));
    } else {
      ui.targetClock.hidden = true;
      ui.targetClock.innerHTML = '';
    }
    if (pop) game.cardFx('pop');
  }

  /**
   * Hình của đề vừa khung, đủ to để đọc số đo: cắt bớt lề trống quanh nét vẽ (viewBox theo getBBox, bỏ qua tấm nền),
   * rồi phóng vừa khung (ngang: bên phải đề; dọc: dưới đề, rộng gần hết thẻ). Giữ tỉ lệ.
   */
  function coHinh(svg) {
    if (!svg || !svg.getAttribute) return;
    let vb = String(svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
    if (vb.length !== 4 || !(vb[2] > 0 && vb[3] > 0)) vb = null;
    const cat = vb ? catVien(svg, vb) : null;
    if (cat) { vb = cat; svg.setAttribute('viewBox', cat.join(' ')); }
    const g = G();
    const doc = g.H > g.W;
    const rail = g.W > g.H && g.H <= 500;
    const rong = rail ? 180 : doc ? Math.min(g.W * 0.8, 560) : Math.max(200, Math.min(g.W * 0.36, 460));
    const cao = rail ? 90 : doc ? Math.max(120, Math.min(g.H * 0.2, 230)) : Math.max(100, Math.min(g.H * 0.25, 240));
    let w = rong, h = cao;
    if (vb) {
      const tl = vb[2] / vb[3];
      if (tl > rong / cao) { w = rong; h = rong / tl; } else { h = cao; w = cao * tl; }
    }
    svg.style.width = Math.round(w) + 'px';
    svg.style.height = Math.round(h) + 'px';
    svg.removeAttribute('width');
    svg.removeAttribute('height');
  }

  /** Khung vừa nét vẽ (đơn vị viewBox) hoặc null nếu hình đã gần kín khung hay trình duyệt không đo được. */
  function catVien(svg, vb) {
    try {
      if (typeof svg.getBBox !== 'function') return null;
      const nen = [];
      Array.prototype.forEach.call(svg.children || [], function (el) {
        if (String(el.tagName).toLowerCase() !== 'rect') return;
        const w = Number(el.getAttribute('width')) || 0, h = Number(el.getAttribute('height')) || 0;
        if (w * h >= vb[2] * vb[3] * 0.6) { nen.push([el, el.style.display]); el.style.display = 'none'; }
      });
      const b = svg.getBBox();
      nen.forEach(function (x) { x[0].style.display = x[1]; });
      if (!b || !(b.width > 0) || !(b.height > 0)) return null;
      const dem = Math.max(vb[2], vb[3]) * 0.04 + 12;
      const x0 = Math.max(vb[0], b.x - dem), y0 = Math.max(vb[1], b.y - dem);
      const x1 = Math.min(vb[0] + vb[2], b.x + b.width + dem), y1 = Math.min(vb[1] + vb[3], b.y + b.height + dem);
      if ((x1 - x0) * (y1 - y0) > vb[2] * vb[3] * 0.85) return null;
      return [x0, y0, x1 - x0, y1 - y0].map(function (v) { return Math.round(v * 10) / 10; });
    } catch (e) { return null; }
  }

  function chuTienDo() {
    const q = s.q;
    const tong = (q && q.tong) || (s.tt && s.tt.man && s.tt.man.so_cau) || 0;
    const stt = q ? Math.min(q.stt, tong || q.stt) : 0;
    return '🦉 Câu ' + stt + '/' + tong;
  }

  /* ---------------- Cú Tí tới một ô đích ---------------- */

  function denDich(it) {
    const g = G();
    if (!s.cauMo || it.taken || it.wrongAt || !it.dao) return;
    xaDoan();
    game.stopInput();
    const x = it.dao;
    const them = { vi_tri: x.vi_tri || null, o: oCua(it), so_doan: s.soDoan, so_o: s.soO, bi_ma_cham: s.biMa };
    const ghe = Object.keys(s.ghe).filter(function (v) { return !cungGiaTri(v, x.gia_tri); });
    if (ghe.length) them.ghe_qua = ghe.slice(0, 6);
    const kq = goi('traLoi', x.gia_tri, them);
    if (!kq) return;
    if (kq.dung) dungRoi(it, kq);
    else if (kq.thu_lai) thuLai(it, kq);
    else saiRoi(it, kq);
    return kq;
  }

  function dungRoi(it, kq) {
    const g = G(), p = g.player, P = game.POINTS;
    s.cauMo = false;
    s.dung++;
    it.taken = true;
    g.reading = true;                       // ma đứng chờ suốt lúc khen, tới khi bé đi tiếp
    const nhanh = !s.goiYCap && (g.time - g.roundStart) < 12;
    g.streak = (g.streak || 0) + 1;
    const thuong = g.streak >= 2 ? P.streak * g.streak : 0;
    const diem = P.clock + (nhanh ? P.fast : 0) + thuong;
    game.addScore(diem);
    g.found++;
    const x = game.px(p.x), y = game.py(p.y);
    game.Sfx.play('clock');
    game.cardFx('ok');
    game.spawnBurst(x, y, g.cell * 0.6, ['#06d6a0', '#ffd166', '#fff', '#2ec4b6'], 36);
    game.addText('+' + diem + (nhanh ? ' Nhanh!' : ''), x, y - g.cell * 0.8, { color: '#06d6a0' });
    if (kq.qua_mong) game.addText('+' + kq.qua_mong + ' quả mọng', x, y - g.cell * 1.7, { color: '#ff9ecf' });
    if (thuong) game.addText('🔥 ' + g.streak + ' liên tiếp!', x, y - g.cell * 2.6, { color: '#ffd166' });
    game.setMood('happy', 1.6);
    const khen = KHEN[Math.floor(Math.random() * KHEN.length)];
    game.showHint('✅ ' + khen + ' ' + (kq.dap_an_nhan || it.dao.nhan || ''), 'ok', 2200);
    noi(khen);
    g.round++;
    g.items.forEach(function (o) { if (!o.taken) { o.taken = true; o.fade = g.time; } });
    g.nextRoundAt = g.time + 1.4;
  }

  function danhDauSai(it) {
    const g = G(), p = g.player;
    it.wrongAt = g.time;
    g.roundWrong = (g.roundWrong || 0) + 1;
    g.streak = 0;
    g.wrong++;
    const x = game.px(p.x), y = game.py(p.y);
    game.setMood('sad', 2.4);
    game.Sfx.play('wrong');
    game.cardFx('shake');
    game.spawnBurst(x, y, g.cell * 0.5, ['#ef476f', '#ff8fab'], 16);
    game.addText('✗ ' + (it.dao.nhan || ''), x, y - g.cell * 0.8, { color: '#ef476f' });
  }

  /** Còn lượt thử (dạng gõ số, hai lần): nhắc nhẹ rồi cho đi tìm đích khác. */
  function thuLai(it, kq) {
    const g = G();
    danhDauSai(it);
    const loi = kq.loi_noi || 'Chưa đúng rồi, con tìm đích khác nhé';
    game.showHint('❌ ' + loi, 'bad', 3200);
    noi(loi);
    g.state = 'ready'; g.stateT = 1.8; g.invuln = 2.5; g.reading = true;
  }

  /** Sai hẳn: game đứng yên, đảo hiện màn "Gần đúng rồi", đóng câu rồi game sang câu mới. */
  function saiRoi(it, kq) {
    const g = G();
    s.cauMo = false;
    danhDauSai(it);
    g.state = 'cho';                        // đứng yên (ma, Cú Tí, thời gian) cho tới khi đảo đóng màn lời giải
    g.reading = true;
    setTimeout(function () {
      if (s.pha !== 'dang_choi') return;
      game.Voice.stop();
      game.Music.setDuck('pause', 0.3);
      let hua = null;
      try { hua = CN.phanHoi(it.dao.gia_tri, kq); } catch (e) { baoLoi(e); }
      Promise.resolve(hua).then(sauPhanHoi, function (e) { baoLoi(e); sauPhanHoi(); });
    }, CHO_PHAN_HOI_MS);
  }

  function sauPhanHoi() {
    const g = G();
    game.Music.setDuck('pause', null);
    if (s.pha !== 'dang_choi') return;
    g.items.forEach(function (o) { if (!o.taken) { o.taken = true; o.fade = g.time; } });
    g.round++;
    g.state = 'playing';
    game.startRound(false);
  }

  /** Hết câu: pháo giấy rồi (qua startQuiz của game) báo đảo kết thúc ván. */
  function hoanThanh() {
    const g = G(), p = g.player;
    s.cauMo = false;
    s.q = null;
    g.items = [];
    g.state = 'clear';
    g.stateT = 2.2;
    game.Sfx.play('levelclear');
    game.spawnConfetti(80);
    if (p) game.addText('🎉 Hoàn thành!', game.px(p.x), game.py(p.y) - g.cell * 1.8, { color: '#ffd166', size: g.cell * 0.9 });
    noi('Tuyệt vời! Cú Tí đã đi hết các câu rồi!');
  }

  function dongPhu() {
    const g = G();
    return 'Cú Tí tìm đúng ' + s.dung + ' đích, được ' + fmt(g.score) + ' điểm';
  }

  function hetVan() {
    if (s.pha === 'xong') return;
    s.pha = 'xong';
    const g = G();
    g.state = 'dao_xong';
    game.Voice.stop();
    goi('ketThuc', { diem: g.score, dong_phu: dongPhu(), bi_ma_cham: s.biMaTong, an_ma: g.ghostsEaten });
  }

  function veDao() {
    if (s.pha === 'xong') return;
    xaDoan();
    s.pha = 'xong';
    s.cauMo = false;
    const g = G();
    g.state = 'dao_xong';
    game.Voice.stop();
    game.Music.stop();
    goi('veDao', { diem: g.score });
  }

  /* ---------------- Ma chạm Cú Tí: về chỗ xuất phát, không mất gì ---------------- */

  function biMaCham(ma) {
    const g = G(), p = g.player;
    xaDoan();
    s.biMa++; s.biMaTong++;
    ghi('cham', { doi_tuong: 'ma', gia_tri: ma.kind, o: oCua(p.from) });
    game.setMood('scared', 1.6);
    game.Sfx.play('hurt');
    if (!game.Motion.lite) g.flash = { color: 'rgba(160,200,255,0.28)', t: 0.4 };
    game.spawnBurst(game.px(p.x), game.py(p.y), g.cell * 0.5, ['#fff3c4', '#9cffe1', '#ffd166'], 22);
    game.showHint('👻 ' + ma.name + ' chạm vào Cú Tí! Mình về chỗ xuất phát nhé.', 'info', 2200);
    noi('Ối, ' + ma.name + ' chạm vào Cú Tí rồi. Mình về chỗ xuất phát nhé!');
    // Hoạt hình "vèo" về chỗ xuất phát của game (không trừ tim: đảo không có tim)
    g.state = 'dying';
    g.stateT = 1.3;
    p.dying = 0.0001;
    s.oTruoc = null;
  }

  /* ---------------- Ghi di chuyển theo đoạn thẳng ---------------- */

  /** Gọi mỗi khi Cú Tí tới một ô mới. */
  function buoc(p) {
    if (!s.cauMo || !p.dir) return;
    const g = G();
    const den = { r: p.from.r, c: p.from.c };
    const huong = HUONG[p.dir.dx + ',' + p.dir.dy] || 'khac';
    const tu = s.oTruoc || { r: den.r - p.dir.dy, c: den.c - p.dir.dx };
    if (s.doan && s.doan.huong === huong && s.doan.cach === s.cach) { s.doan.den = den; s.doan.so_o++; }
    else { xaDoan(); s.doan = { tu: tu, den: den, huong: huong, so_o: 1, cach: s.cach, gan: {} }; }
    s.soO++;
    s.oTruoc = den;
    // Đích ngay cạnh (cách 1 ô) mà Cú Tí đi ngang: "đã ghé qua"
    g.items.forEach(function (it) {
      if (it.taken || it.wrongAt || !it.dao) return;
      if (Math.abs(it.r - den.r) + Math.abs(it.c - den.c) === 1) { const v = String(it.dao.gia_tri); s.doan.gan[v] = 1; s.ghe[v] = 1; }
    });
  }

  /** Ghi đoạn di chuyển đang gom (một sự kiện di_chuyen). */
  function xaDoan() {
    const d = s.doan;
    s.doan = null;
    if (!d || !s.cauMo) return;
    s.soDoan++;
    if (s.soDoan > TOI_DA_DOAN) return;
    const du = { doi_tuong: 'cu_ti', tu: oCua(d.tu), den: oCua(d.den), huong: d.huong, so_o: d.so_o, cach: d.cach };
    const gan = Object.keys(d.gan);
    if (gan.length) du.gan = gan;
    goi('thaoTac', 'di_chuyen', du);
  }

  /**
   * Lệnh điều khiển của bé. cach: 'vuot' | 'phim' | 'nut' (hướng đi: chỉ nhớ cách, đoạn đi sẽ ghi),
   * 'cham' ({ r, c, ok }: chạm một ô), 'dung' (chạm Cú Tí để dừng).
   */
  function lenh(cach, du) {
    if (s.pha !== 'dang_choi') return;
    const g = G();
    if (cach === 'dung') { xaDoan(); ghi('cham', { doi_tuong: 'cu_ti', o: g.player ? oCua(g.player.from) : '' }); return; }
    if (cach !== 'cham') { s.cach = cach; return; }
    s.cach = 'cham';
    if (!du || !g.maze || du.r < 0 || du.c < 0 || du.r >= g.maze.rows || du.c >= g.maze.cols) return;   // chạm ngoài mê cung
    const it = g.items.find(function (o) { return !o.taken && !o.wrongAt && o.dao && o.r === du.r && o.c === du.c; });
    if (!it) { ghi('cham', { doi_tuong: 'o', o: oCua(du), di_duoc: !!du.ok }); return; }
    const v = it.dao.gia_tri;
    const b = { doi_tuong: 'dich', gia_tri: v, vi_tri: it.dao.vi_tri || null, o: oCua(it) };
    if (s.chonCuoi !== null && cungGiaTri(s.chonCuoi, v)) { ghi('cham', b); return; }
    s.chonCuoi = v;                         // chọn đích mới (lần thứ hai trở đi là đổi ý)
    ghi('chon', b);
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

  /* ---------------- Gợi ý, nghe lại, tạm dừng ---------------- */

  function goiY() {
    const g = G();
    if (!s.cauMo || (g.state !== 'playing' && g.state !== 'ready')) return;
    let boIt = null, them = null;
    if (s.goiYCap + 1 === 3) {
      boIt = g.items.find(function (o) { return !o.taken && !o.wrongAt && o.dao && !o.correct; }) || null;
      if (boIt) them = { loai_bo: boIt.dao.gia_tri, vi_tri: boIt.dao.vi_tri || null };
    }
    const r = goi('goiY', them);
    game.Sfx.play('hint');
    if (!r) {
      if (s.goiYCuoi) { game.showHint('💡 ' + s.goiYCuoi, 'info', 5200); noi(s.goiYCuoi); }
      return;
    }
    s.goiYCap = r.cap;
    s.goiYCuoi = r.loi || '';
    g.roundInfo.hinted = true;
    if (r.cap === 3 && boIt) {
      // Gợi ý cấp 3: một đích sai tan thành khói
      boIt.taken = true;
      boIt.fade = g.time;
      game.spawnBurst(game.px(boIt.c + 0.5), game.py(boIt.r + 0.5), g.cell * 0.5, ['#d9dcef', '#ffffff', '#b8bfe0'], 20);
    }
    game.showHint('💡 ' + s.goiYCuoi, 'info', 5200);
    noi(s.goiYCuoi);
  }

  function ngheLai() {
    const q = s.q;
    if (!q) return;
    ghi('nghe_lai', { doi_tuong: 'de' });
    noi(q.de_doc || q.de);
  }

  function tamDung(nguon) { if (s.pha === 'dang_choi') { xaDoan(); goi('tamDung', nguon || 'nut'); } }
  function tiepTuc(nguon) { if (s.pha === 'dang_choi') goi('tiepTuc', nguon || 'nut'); }

  /* ---------------- Hình của đích (canvas) ---------------- */

  const anh = {};
  function bamChuoi(t) { let h = 0; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
  function anhSvg(svg) {
    const k = bamChuoi(svg);
    if (anh[k]) return anh[k];
    const a = { k: k, ok: false, img: null };
    anh[k] = a;
    try {
      const img = new Image();
      img.onload = function () { a.ok = true; };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      a.img = img;
    } catch (e) { /* bỏ qua */ }
    return a;
  }

  function khung(cx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    cx.beginPath();
    cx.moveTo(x + r, y);
    cx.arcTo(x + w, y, x + w, y + h, r);
    cx.arcTo(x + w, y + h, x, y + h, r);
    cx.arcTo(x, y + h, x, y, r);
    cx.arcTo(x, y, x + w, y, r);
    cx.closePath();
  }

  /** Chia nhãn dài thành hai dòng ở khoảng trắng gần giữa nhất. */
  function haiDong(t) {
    const giua = t.length / 2;
    let best = -1;
    for (let i = 0; i < t.length; i++) if (t[i] === ' ' && (best < 0 || Math.abs(i - giua) < Math.abs(best - giua))) best = i;
    return best < 0 ? [t] : [t.slice(0, best), t.slice(best + 1)];
  }

  /** Biển tên phát sáng mang nhãn của đích (số, độ dài, giờ…): tự thu chữ, dài quá thì xuống dòng. */
  function veBien(cx, size, s0, nhan) {
    const h = size / 2;
    const maxW = s0 * 2.35, pad = s0 * 0.2;
    let fs = s0 * 0.62;
    let dong = [nhan];
    const rongNhat = function () { cx.font = '800 ' + fs.toFixed(1) + 'px ' + FONT; return Math.max.apply(null, dong.map(function (d) { return cx.measureText(d).width; })); };
    let w = rongNhat();
    while (w + pad * 2 > maxW && fs > s0 * 0.44) { fs *= 0.93; w = rongNhat(); }
    if (w + pad * 2 > maxW && nhan.indexOf(' ') > 0) {
      dong = haiDong(nhan);
      fs = s0 * 0.5;
      w = rongNhat();
      while (w + pad * 2 > maxW && fs > s0 * 0.3) { fs *= 0.93; w = rongNhat(); }
    }
    while (w + pad * 2 > maxW && fs > s0 * 0.25) { fs *= 0.93; w = rongNhat(); }
    const bw = Math.max(s0 * 1.25, w + pad * 2);
    const bh = dong.length === 1 ? Math.max(s0 * 0.95, fs * 1.35) : fs * 2.5 + pad;
    const x0 = h - bw / 2, y0 = h - bh / 2;
    cx.save();
    cx.shadowColor = 'rgba(255,228,140,0.85)';
    cx.shadowBlur = s0 * 0.35;
    const gr = cx.createLinearGradient(0, y0, 0, y0 + bh);
    gr.addColorStop(0, '#fffdf2');
    gr.addColorStop(1, '#ffe39a');
    cx.fillStyle = gr;
    khung(cx, x0, y0, bw, bh, bh * 0.32);
    cx.fill();
    cx.restore();
    cx.lineWidth = Math.max(2, s0 * 0.07);
    cx.strokeStyle = '#d89a00';
    khung(cx, x0, y0, bw, bh, bh * 0.32);
    cx.stroke();
    // vệt sáng trên đỉnh cho khối "đất sét" có chiều sâu
    cx.fillStyle = 'rgba(255,255,255,0.55)';
    khung(cx, x0 + bw * 0.12, y0 + bh * 0.1, bw * 0.76, bh * 0.18, bh * 0.09);
    cx.fill();
    cx.fillStyle = '#2b2d42';
    cx.font = '800 ' + fs.toFixed(1) + 'px ' + FONT;
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    if (dong.length === 1) cx.fillText(dong[0], h, h + fs * 0.06);
    else { cx.fillText(dong[0], h, h - fs * 0.58); cx.fillText(dong[1], h, h + fs * 0.66); }
  }

  /**
   * Cách hiện một lựa chọn: 'dong_ho' | 'hinh' | 'chu'. Theo x.hien nếu đảo gửi; không thì suy ra:
   * đề đã có hình (ví dụ đồng hồ "Đồng hồ chỉ mấy giờ?") thì lựa chọn là chữ, không vẽ lại đồng hồ trùng đề.
   */
  function cachHien(x) {
    if (x.hien === 'chu' || x.hien === 'dong_ho' || x.hien === 'hinh') return x.hien === 'dong_ho' && !x.dong_ho ? 'chu' : x.hien;
    const coHinhDe = !!(s.q && s.q.hinh);
    if (x.dong_ho) return coHinhDe ? 'chu' : 'dong_ho';
    if (x.hinh) return 'hinh';
    return 'chu';
  }

  /** Sprite của một đích trong đảo: đồng hồ (dong_ho) vẽ bằng bộ vẽ đồng hồ của game, hình SVG nhỏ, hoặc biển tên. */
  function sprite(it, s0) {
    const g = G();
    s0 = s0 || g.cell;
    const x = it.dao;
    const C = game.C;
    const hien = cachHien(x);
    if (hien === 'dong_ho') {
      const t = C.T(Number(x.dong_ho.h) || 0, Number(x.dong_ho.m) || 0);
      return game.sprite('dh|' + C.key(t) + '|' + s0 + '|' + g.dpr, Math.ceil(s0 * 2), function (cx, size) {
        const h = size / 2;
        cx.save();
        cx.shadowColor = 'rgba(255,255,255,0.7)'; cx.shadowBlur = s0 * 0.3;
        cx.fillStyle = 'rgba(255,255,255,0.9)';
        cx.beginPath(); cx.arc(h, h, s0 * 0.78, 0, TAU); cx.fill();
        cx.restore();
        C.drawClock(cx, h, h, s0 * 0.78, t);
      });
    }
    if (hien === 'hinh' && x.hinh) {
      const a = anhSvg(x.hinh);
      return game.sprite('ha|' + a.k + '|' + a.ok + '|' + s0 + '|' + g.dpr, Math.ceil(s0 * 2.1), function (cx, size) {
        const h = size / 2, w = s0 * 1.8;
        cx.save();
        cx.shadowColor = 'rgba(255,255,255,0.75)'; cx.shadowBlur = s0 * 0.3;
        cx.fillStyle = '#ffffff';
        khung(cx, h - w / 2, h - w / 2, w, w, s0 * 0.3); cx.fill();
        cx.restore();
        cx.lineWidth = Math.max(2, s0 * 0.06); cx.strokeStyle = '#8f97c8';
        khung(cx, h - w / 2, h - w / 2, w, w, s0 * 0.3); cx.stroke();
        if (a.ok && a.img) {
          const iw = a.img.naturalWidth || a.img.width || 1, ih = a.img.naturalHeight || a.img.height || 1;
          const k = Math.min((w - s0 * 0.24) / iw, (w - s0 * 0.24) / ih);
          try { cx.drawImage(a.img, h - iw * k / 2, h - ih * k / 2, iw * k, ih * k); } catch (e) { /* bỏ qua */ }
        }
      });
    }
    const nhan = String(x.nhan != null ? x.nhan : x.gia_tri);
    return game.sprite('bn|' + nhan + '|' + s0 + '|' + g.dpr, Math.ceil(s0 * 2.6), function (cx, size) { veBien(cx, size, s0, nhan); });
  }

  /* ---------------- Lỗi, gỡ lỗi ---------------- */

  function trangThai() {
    const g = game ? G() : null;
    return {
      pha: s.pha, soCau: s.soCau, dung: s.dung, cauMo: s.cauMo, goiYCap: s.goiYCap, soDoan: s.soDoan, soO: s.soO, biMa: s.biMaTong,
      q: s.q ? { stt: s.q.stt, tong: s.q.tong, de: s.q.de, dap_an: s.q.dap_an, ky_nang: s.q.ky_nang } : null,
      state: g ? g.state : null, loi: s.loi.slice(),
      dich: g ? g.items.filter(function (it) { return it.dao && !it.taken && !it.wrongAt; }).map(function (it) {
        return { r: it.r, c: it.c, gia_tri: it.dao.gia_tri, nhan: it.dao.nhan, vi_tri: it.dao.vi_tri, dung: !!it.dao.dung,
          x: game.px(it.c + 0.5), y: game.py(it.r + 0.5) };
      }) : []
    };
  }

  window.MeCungDao = {
    bat: true,
    khoiDong: khoiDong,
    luotTam: luotTam,
    batDauLuot: batDauLuot,
    veThe: veThe,
    chuTienDo: chuTienDo,
    denDich: denDich,
    biMaCham: biMaCham,
    buoc: buoc,
    lenh: lenh,
    goiY: goiY,
    ngheLai: ngheLai,
    tamDung: tamDung,
    tiepTuc: tiepTuc,
    hetVan: hetVan,
    veDao: veDao,
    sprite: sprite,
    baoLoi: baoLoi,
    _batDauChoi: batDauChoi,
    _trangThai: trangThai
  };
})();
