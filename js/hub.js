/* ============================================================
   hub.js – Trang chủ 3hoa.com
   - Chip người chơi + hộp thoại "👋 Ai đang chơi?" dùng window.Players (js/profile.js, nạp trước tệp này)
   - Đọc localStorage của 6 game (cùng tên miền) để hiện sao / màn / kỷ lục của bé đang chơi,
     và bản tóm tắt nhỏ của Đảo Khủng Long (dkl-tom-tat-v1) để hiện tiến trình trên thẻ đảo
   - CHỈ ĐỌC khi vẽ: không ghi vào khóa của game; hồ sơ chỉ ghi qua Players (khóa riêng 3hoa-players-v1).
     Ngoại lệ duy nhất: phụ huynh xóa một bạn (sau cổng phụ huynh) thì xóa players[<id>] trong khóa của 6 game
   - Đăng ký service worker của trang chủ (sw-home.js, phạm vi '/'; bỏ qua mọi đường dẫn của game)
   - Mọi văn bản động đi qua textContent hoặc Players.esc trước khi vào innerHTML
   - Móc gỡ lỗi chỉ đọc: window.__Hub (dùng cho kiểm thử tự động)
   ============================================================ */
(function () {
  'use strict';

  const $ = function (id) { return document.getElementById(id); };
  const P = window.Players || null;
  const esc = P ? P.esc : function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  function activePlayer() { return P ? P.active() : { id: 'p1', name: 'bé', avatar: '🐯' }; }

  /* ---------- Bảng game: khóa lưu trữ + hình dạng tiến trình (đối chiếu với game.js / levels của từng game) ---------- */
  const GAMES = [
    { id: 'math-ninja', key: 'ninja-toan-v1', name: 'Ninja Toán Học', kind: 'records', unit: 'màn',
      // records['answer:a1:90'] → gộp theo 'answer:a1' (mọi thời lượng), lấy sao cao nhất
      parse: function (k) { const p = String(k).split(':'); return (p[0] === 'answer' || p[0] === 'pair') && p[1] ? p[0] + ':' + p[1] : null; },
      units: ['answer:a1', 'answer:a2', 'answer:a3', 'answer:a4', 'answer:m1', 'answer:d1', 'answer:a5', 'answer:m2', 'answer:d2', 'answer:m3', 'answer:d3', 'answer:m4', 'answer:d4', 'answer:a6',
        'pair:p1', 'pair:p2', 'pair:p3', 'pair:p4', 'pair:p5', 'pair:p6', 'pair:p7'] },
    { id: 'cuu-chuong', key: 'cuu-chuong-v1', name: 'Vệ Binh Cửu Chương', kind: 'records', unit: 'màn',
      // records['t2:mul:90'] / ['c1:x:90'] → gộp theo bảng / thử thách
      parse: function (k) { return String(k).split(':')[0] || null; },
      units: ['t2', 't3', 't4', 't5', 't6', 't7', 't8', 't9', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'] },
    { id: 'me-cung-dong-ho', key: 'me-cung-dong-ho-v1', name: 'Mê Cung Đồng Hồ', kind: 'levels', field: 'records', doneField: 'passed', unit: 'màn',
      units: ['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8'] },
    { id: 'thap-dong-ho', key: 'thap-dong-ho-v1', name: 'Tháp Đồng Hồ', kind: 'levels', field: 'levels', doneField: 'done', unit: 'màn',
      units: ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8'] },
    { id: 'xe-tang-thoi-gian', key: 'xe-tang-thoi-gian-v1', name: 'Xe Tăng Thời Gian', kind: 'levels', field: 'progress', doneField: 'passed', unit: 'màn',
      units: ['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8', 'l9'] },
    { id: 'cuoi-ho', key: 'cuoi-ho-v1', name: 'Cưỡi Hổ Vượt Lửa', kind: 'levels', field: 'levels', doneField: 'quiz', legacyRoot: 'progress', unit: 'màn',
      units: ['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8', 'l9'] }
  ];
  GAMES.forEach(function (g) { Object.freeze(g.units); Object.freeze(g); });
  Object.freeze(GAMES);

  /* Đảo Khủng Long giữ hồ sơ bé riêng trong IndexedDB; đảo ghi thêm một bản tóm tắt nhỏ vào localStorage để trang chủ đọc:
     dkl-tom-tat-v1 = { v: 1, luc: ISO, be: [{ ten, qua_mong, man_xong, sao }] }. Trang chủ chỉ đọc khóa này. */
  const ISLAND = Object.freeze({ id: 'dao-khung-long', key: 'dkl-tom-tat-v1', name: 'Đảo Khủng Long' });
  /* Mọi trò mở được từ "Chơi tiếp" / "Chơi ngẫu nhiên" (6 game + đảo) */
  const PLAYABLE = Object.freeze(GAMES.map(function (g) { return g.id; }).concat([ISLAND.id]));

  /* ---------- Đọc tiến trình (an toàn, chỉ đọc) ---------- */
  function reviver(k, v) { return (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v; }
  function isObj(o) { return !!o && typeof o === 'object' && !Array.isArray(o); }
  function num(v, lo, hi) { v = Number(v); if (!Number.isFinite(v)) return lo; return Math.min(hi, Math.max(lo, Math.round(v))); }
  function fmt(n) { return String(num(n, 0, 1e9)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  const MAX_DATE = 4102444800000;   // 2100-01-01
  function gameById(id) { for (let i = 0; i < GAMES.length; i++) if (GAMES[i].id === id || GAMES[i].key === id) return GAMES[i]; return null; }

  /** Đọc thô khóa của một game. Dữ liệu hỏng / không phải object → null ("chưa chơi"). */
  /* Bộ nhớ tạm trong MỘT lượt vẽ: renderPlayers() gọi summarizeAll() cho từng bé,
     nếu không có nó thì 8 bé × 6 game = 48 lần JSON.parse mỗi lần mở hộp thoại. */
  let readCache = null;
  function beginRead() { readCache = {}; }
  function endRead() { readCache = null; }

  function readGame(g) {
    if (typeof g === 'string') g = gameById(g);
    if (!g) return null;
    if (readCache && Object.prototype.hasOwnProperty.call(readCache, g.key)) return readCache[g.key];
    let d = null;
    try {
      const raw = window.localStorage.getItem(g.key);
      if (raw && raw.length < 500000) d = JSON.parse(raw, reviver);
    } catch (e) { d = null; }
    const out = isObj(d) ? d : null;
    if (readCache) readCache[g.key] = out;
    return out;
  }

  /** Bucket tiến trình của người chơi pid: dạng mới players[pid]; dữ liệu cũ (chưa di trú) chỉ thuộc về bé mặc định p1. */
  function bucketFor(g, d, pid) {
    if (!d) return null;
    if (isObj(d.players)) {
      // chỉ nhận thuộc tính riêng: id lạ như '__proto__' / 'constructor' không được đọc từ prototype
      if (!Object.prototype.hasOwnProperty.call(d.players, pid)) return null;
      return isObj(d.players[pid]) ? d.players[pid] : null;
    }
    if (pid !== 'p1') return null;
    return g.legacyRoot ? (isObj(d[g.legacyRoot]) ? d[g.legacyRoot] : null) : d;
  }

  /** Tóm tắt một game cho một người chơi: { stars, max, done, total, best, played, last, seconds, badge, unit }. */
  function summarize(g, pid) {
    if (typeof g === 'string') g = gameById(g);
    if (!g) return null;
    pid = pid || activePlayer().id;
    const out = { id: g.id, name: g.name, unit: g.unit, stars: 0, max: g.units.length * 3, done: 0, total: g.units.length, best: 0, played: false, last: 0, seconds: 0, badge: false };
    const b = bucketFor(g, readGame(g), pid);
    if (!b) return out;
    if (g.kind === 'levels') {
      const recs = isObj(b[g.field]) ? b[g.field] : {};
      g.units.forEach(function (id) {
        const r = recs[id];
        if (!isObj(r)) return;
        out.played = true;
        out.stars += num(r.stars, 0, 3);
        out.best = Math.max(out.best, num(r.best, 0, 1e7));
        const dn = r[g.doneField];
        if (dn === true || (typeof dn === 'number' && dn > 0)) out.done++;   // quiz/passed: boolean; thap 'done': số lần qua màn
      });
      if (g.id === 'cuoi-ho') out.badge = b.badge === true;
    } else {
      const recs = isObj(b.records) ? b.records : {}, per = {};
      Object.keys(recs).forEach(function (k) {
        const u = g.parse(k), r = recs[k];
        if (!u || g.units.indexOf(u) < 0 || !isObj(r)) return;
        per[u] = Math.max(per[u] || 0, num(r.stars, 0, 3));
        out.best = Math.max(out.best, num(r.best, 0, 1e7));
        out.played = true;
      });
      Object.keys(per).forEach(function (u) { out.stars += per[u]; if (per[u] > 0) out.done++; });
    }
    if (isObj(b.stats)) { out.last = num(b.stats.last, 0, MAX_DATE); out.seconds = num(b.stats.seconds, 0, 1e8); }
    return out;
  }
  function summarizeAll(pid) { pid = pid || activePlayer().id; return GAMES.map(function (g) { return summarize(g, pid); }); }
  function aggregate(list) {
    return list.reduce(function (a, s) {
      a.stars += s.stars; a.max += s.max; a.seconds += s.seconds;
      if (s.badge) a.badges.push('🏅 Hổ Vàng');
      if (s.total && s.done === s.total) a.badges.push('🏆 ' + s.name);
      return a;
    }, { stars: 0, max: 0, seconds: 0, badges: [] });
  }

  /* ---------- Đảo Khủng Long: bản tóm tắt (an toàn, chỉ đọc) ---------- */
  /** So tên không phân biệt hoa thường, dấu, khoảng trắng thừa ("  Tí " = "ti", "Đan" = "dan"). */
  function nameKey(s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd')
      .replace(/\s+/g, ' ').trim().toLowerCase();
  }
  function cleanName(s) {
    if (typeof s !== 'string') return '';
    return s.replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);
  }
  function isoTime(v) {
    if (typeof v !== 'string' || v.length > 40) return 0;
    const t = Date.parse(v);
    return Number.isFinite(t) && t > 0 && t < MAX_DATE ? t : 0;
  }
  /** Đọc dkl-tom-tat-v1 → { luc, be: [{ ten, qua_mong, man_xong, sao, last }] }, hoặc null nếu không có / hỏng. */
  function readIsland() {
    if (readCache && Object.prototype.hasOwnProperty.call(readCache, ISLAND.key)) return readCache[ISLAND.key];
    let d = null;
    try {
      const raw = window.localStorage.getItem(ISLAND.key);
      if (raw && raw.length < 100000) d = JSON.parse(raw, reviver);
    } catch (e) { d = null; }
    let out = null;
    if (isObj(d) && d.v === 1 && Array.isArray(d.be)) {
      const luc = isoTime(d.luc);
      const be = [];
      d.be.slice(0, 50).forEach(function (k) {
        if (!isObj(k)) return;
        const ten = cleanName(k.ten);
        if (!ten) return;
        be.push({ ten: ten, qua_mong: num(k.qua_mong, 0, 1e6), man_xong: num(k.man_xong, 0, 1e4), sao: num(k.sao, 0, 1e5), last: isoTime(k.luc) || luc });
      });
      out = { luc: luc, be: be };
    }
    if (readCache) readCache[ISLAND.key] = out;
    return out;
  }
  /** Bé trên đảo có tên trùng với name (tên bé đang chơi ở trang chủ), hoặc null. */
  function islandFor(name) {
    const d = readIsland();
    if (!d) return null;
    const k = nameKey(name);
    if (!k) return null;
    for (let i = 0; i < d.be.length; i++) if (nameKey(d.be[i].ten) === k) return d.be[i];
    return null;
  }

  /* ---------- Thông báo nhỏ ---------- */
  let toastTimer = 0;
  function toast(msg, ms) {
    const t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, ms || 2200);
  }

  /* ---------- Vẽ: chip, thẻ game, lời chào ---------- */
  function renderChip() {
    const b = $('btn-player');
    if (!b || !P) return;
    const a = P.active();
    b.innerHTML = P.chipHtml(a) + '<span class="pl-hint" aria-hidden="true">▾</span>';
    b.setAttribute('aria-label', 'Người chơi: ' + a.name + '. Đổi người chơi');
    const n = $('hero-name');
    if (n) n.textContent = a.name;
  }

  function renderCard(s) {
    const card = document.querySelector('article[data-game="' + s.id + '"]');
    if (!card) return;
    const p = card.querySelector('[data-progress]'), bar = card.querySelector('[data-bar]'), best = card.querySelector('[data-best]');
    if (!p) return;
    if (!s.played) {
      p.textContent = 'Chưa chơi';
      p.classList.add('empty');
      if (bar) bar.style.width = '0%';
      if (best) best.hidden = true;
      card.classList.remove('played');
      return;
    }
    p.textContent = '⭐ ' + s.stars + '/' + s.max + ' sao · ' + s.done + '/' + s.total + ' ' + s.unit + (s.badge ? ' · 🏅' : '');
    p.classList.remove('empty');
    if (bar) bar.style.width = Math.round(100 * s.stars / s.max) + '%';
    if (best) { best.hidden = !s.best; best.textContent = '🏆 Kỷ lục: ' + fmt(s.best); }
    card.classList.add('played');
  }

  /** Thẻ đảo: tiến trình của bé trùng tên; nếu không có thì số bé đang nuôi khủng long; nếu không nữa thì câu giới thiệu. */
  const ISLAND_NOTE = 'Bố mẹ xem được con vướng ở đâu, tới từng thao tác';
  function renderIsland() {
    const card = document.querySelector('article[data-island="' + ISLAND.id + '"]');
    if (!card) return;
    const p = card.querySelector('[data-island-progress]');
    if (!p) return;
    const d = readIsland(), me = islandFor(activePlayer().name);
    let text = ISLAND_NOTE, played = false;
    if (me) {
      const parts = ['⭐ ' + fmt(me.sao) + ' sao', fmt(me.man_xong) + ' màn xong'];
      if (me.qua_mong > 0) parts.push('🫐 ' + fmt(me.qua_mong) + ' quả mọng');
      text = parts.join(' · ');
      played = me.sao > 0 || me.man_xong > 0 || me.qua_mong > 0;
    } else if (d && d.be.length) {
      text = '🦖 ' + d.be.length + ' bé đang nuôi khủng long';
    }
    p.textContent = text;
    if (played) card.classList.add('played'); else card.classList.remove('played');
  }
  /** Mục "Chơi tiếp" của đảo cho bé đang chơi (cùng dạng với summarize), hoặc null. */
  function islandContinue() {
    const me = islandFor(activePlayer().name);
    if (!me || !(me.man_xong > 0 || me.qua_mong > 0 || me.sao > 0)) return null;
    return { id: ISLAND.id, name: ISLAND.name, played: true, last: me.last, stars: me.sao };
  }

  function renderHero(list) {
    const act = activePlayer();
    const nameEl = $('hero-name');
    if (nameEl) nameEl.textContent = act.name;
    const agg = aggregate(list);
    const isl = islandContinue();
    const cont = list.concat(isl ? [isl] : []).filter(function (s) { return s.played; }).sort(function (a, b) { return b.last - a.last || b.stars - a.stars; })[0];
    const play = $('hero-play'), sub = $('hero-sub');
    if (play) {
      if (cont) {
        play.hidden = false;
        play.setAttribute('href', cont.id + '/');
        play.textContent = '▶ Chơi tiếp ' + cont.name;
        play.setAttribute('aria-label', 'Chơi tiếp ' + cont.name);
      } else play.hidden = true;
    }
    if (sub) sub.textContent = cont ? 'Lần trước con chơi ' + cont.name + '. Chơi tiếp nhé?' : 'Con chọn một trò để bắt đầu nhé!';
    const achv = $('achv');
    if (achv) {
      if (agg.stars > 0 || agg.seconds > 0) {
        let h = '<li>⭐ ' + agg.stars + '/' + agg.max + ' sao</li>';
        const mins = Math.round(agg.seconds / 60);
        if (mins > 0) h += '<li>⏱ ' + mins + ' phút luyện tập</li>';
        agg.badges.forEach(function (b) { h += '<li class="badge">' + esc(b) + '</li>'; });
        achv.innerHTML = h;
      } else achv.innerHTML = '<li class="empty">🌱 Chưa có sao nào, chơi để nhận sao nhé!</li>';
    }
  }

  function renderAll() {
    beginRead();
    try {
      const list = summarizeAll(activePlayer().id);
      list.forEach(renderCard);
      renderIsland();
      renderHero(list);
    } catch (e) { onFatal(e && e.message); } finally { endRead(); }
  }

  /** Đọc lại hồ sơ từ localStorage (Players.load không tự phát onChange) rồi vẽ lại mọi thứ phụ thuộc vào bé đang chơi. */
  function refresh() {
    try {
      if (P) P.load();
      renderChip();
      renderPlayers();
    } catch (e) { onFatal(e && e.message); }
    renderAll();
  }

  /* ---------- Hộp thoại người chơi ---------- */
  const PlayersUI = { mode: null, avatar: null, open: false, lastFocus: null };
  function focusLater(id) { setTimeout(function () { try { const el = $(id); if (el) el.focus(); } catch (e) { /* bỏ qua */ } }, 40); }
  function totalStars(pid) { return aggregate(summarizeAll(pid)).stars; }

  function renderPlayers() {
    const list = $('player-list');
    if (!list || !P) return;
    beginRead();
    const act = P.active();
    list.innerHTML = P.list().map(function (p) {
      const on = p.id === act.id;
      return '<button type="button" class="player-item' + (on ? ' active' : '') + '" data-id="' + esc(p.id) + '" aria-pressed="' + on + '">' +
        '<span class="pl-avatar" aria-hidden="true">' + esc(p.avatar) + '</span>' +
        '<span class="pl-name">' + esc(p.name) + '<span class="pl-sub">⭐ ' + totalStars(p.id) + ' sao</span></span></button>';
    }).join('');
    const rm = $('btn-player-remove');
    if (rm) rm.disabled = P.list().length <= 1;
    const form = $('player-form');
    if (form) form.hidden = !PlayersUI.mode;
    endRead();
  }

  function openPlayerForm(mode) {
    if (!P) return;
    PlayersUI.mode = mode;                                   // 'add' | 'rename' | 'avatar'
    const act = P.active();
    PlayersUI.avatar = mode === 'add' ? P.AVATARS[P.list().length % P.AVATARS.length] : act.avatar;
    const name = $('player-name'), grid = $('player-avatars');
    if (name) { name.value = mode === 'add' ? '' : act.name; name.hidden = mode === 'avatar'; }
    if (grid) {
      grid.hidden = mode === 'rename';
      grid.innerHTML = P.AVATARS.map(function (a) {
        return '<button type="button" class="avatar" data-avatar="' + esc(a) + '" aria-pressed="' + (a === PlayersUI.avatar) + '" aria-label="Hình ' + esc(a) + '">' + esc(a) + '</button>';
      }).join('');
    }
    renderPlayers();
    if (mode !== 'avatar') focusLater('player-name');
  }

  function submitPlayerForm() {
    if (!P) return;
    const name = $('player-name') ? $('player-name').value : '';
    let ok = false;
    if (PlayersUI.mode === 'add') ok = !!P.add(name, PlayersUI.avatar);
    else if (PlayersUI.mode === 'rename') ok = P.rename(P.active().id, name);
    else if (PlayersUI.mode === 'avatar') ok = P.setAvatar(P.active().id, PlayersUI.avatar);
    if (!ok) {
      toast(PlayersUI.mode === 'add' && P.list().length >= P.MAX_PLAYERS ? 'Chỉ được tối đa ' + P.MAX_PLAYERS + ' bạn thôi' : 'Con nhập tên nhé (1–' + P.NAME_MAX + ' chữ)');
      return;
    }
    PlayersUI.mode = null;
    renderPlayers();
    toast('Chào ' + P.active().name + '! 👋');
    focusLater('btn-players-back');
  }

  function openPlayers() {
    const dlg = $('players');
    if (!dlg) return;
    PlayersUI.mode = null;
    renderPlayers();
    PlayersUI.lastFocus = document.activeElement;
    dlg.hidden = false;
    PlayersUI.open = true;
    const chip = $('btn-player');
    if (chip) chip.setAttribute('aria-expanded', 'true');
    document.body.classList.add('modal-open');
    focusLater('btn-players-back');
  }

  function closePlayers() {
    const dlg = $('players');
    if (!dlg || !PlayersUI.open) return;
    closeGate();
    dlg.hidden = true;
    PlayersUI.open = false;
    PlayersUI.mode = null;
    const chip = $('btn-player');
    if (chip) chip.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('modal-open');
    try { (chip || PlayersUI.lastFocus).focus(); } catch (e) { /* bỏ qua */ }
  }

  /* ---------- Cổng phụ huynh (Players.gateQuestion / gateCheck dùng chung với 6 game: phép nhân cỡ người lớn
     hoặc mã bố mẹ, sai 3 lần liền thì tạm khóa; thay cho window.confirm) ---------- */
  const Gate = { cb: null, open: false };
  function askGate() {
    const q = $('parent-gate-q'), inp = $('parent-gate-input');
    if (q) q.textContent = P.gateQuestion().text;
    if (inp) inp.value = '';
  }
  function adultGate(cb, what) {
    const g = $('parent-gate');
    if (!g || !P) { if (window.confirm((what ? what + '\n\n' : '') + 'Dành cho phụ huynh: tiếp tục?')) cb(); return; }   // dự phòng nếu không có hộp thoại
    if (P.gateLockedSeconds() > 0) { toast(P.gateLockText(), 3200); return; }
    Gate.cb = cb; Gate.open = true;
    const w = $('parent-gate-what');
    if (w) { w.textContent = what || ''; w.hidden = !what; }
    askGate();
    g.hidden = false;
    focusLater('parent-gate-input');
  }
  function submitGate() {
    const inp = $('parent-gate-input');
    if (!Gate.open) return;
    const r = P.gateCheck(inp ? inp.value : '');
    if (r === 'ok') { const cb = Gate.cb; closeGate(); if (cb) cb(); }
    else if (r === 'locked') { closeGate(); toast(P.gateLockText(), 3200); focusLater('btn-player-remove'); }
    else { toast('Chưa đúng, thử lại nhé'); askGate(); focusLater('parent-gate-input'); }
  }
  function closeGate() {
    const g = $('parent-gate');
    if (!g || !Gate.open) return;
    g.hidden = true;
    Gate.cb = null; Gate.open = false;
  }

  /* ---------- Xóa tiến trình của một bạn trong 6 game (chỉ gọi sau cổng phụ huynh) ----------
     Đọc, sửa, ghi lại từng khóa: chỉ bỏ players[<id>], giữ nguyên các bé khác và thiết lập thiết bị ở gốc.
     Khóa hỏng / không có players / không có bé này thì để nguyên. Trả về số game đã xóa. */
  function purgeProgress(pid) {
    let n = 0;
    if (typeof pid !== 'string' || !pid || pid === '__proto__' || pid === 'constructor' || pid === 'prototype') return 0;
    GAMES.forEach(function (g) {
      try {
        const raw = window.localStorage.getItem(g.key);
        if (!raw) return;
        const d = JSON.parse(raw, reviver);
        if (!isObj(d) || !isObj(d.players) || !Object.prototype.hasOwnProperty.call(d.players, pid)) return;
        delete d.players[pid];
        window.localStorage.setItem(g.key, JSON.stringify(d));
        n++;
      } catch (e) { /* bỏ qua game này (hết chỗ, dữ liệu hỏng...), vẫn xóa ở các game khác */ }
    });
    return n;
  }

  /* Giữ phím Tab trong hộp thoại đang mở */
  function trapTab(e) {
    const root = Gate.open ? $('parent-gate') : (PlayersUI.open ? $('players') : null);
    if (!root || !root.querySelectorAll) return;
    const items = Array.prototype.filter.call(root.querySelectorAll('button, input, a[href]'), function (el) { return !el.disabled && el.offsetParent !== null; });
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1], cur = document.activeElement;
    if (e.shiftKey && cur === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && cur === last) { e.preventDefault(); first.focus(); }
    else if (!root.contains(cur)) { e.preventDefault(); first.focus(); }
  }

  /* ---------- Lỗi toàn cục: báo nhẹ nhàng, không làm trang chết ---------- */
  let errShown = 0;
  function onFatal(msg) {
    if (errShown++ > 2) return;
    try { console.error('[hub]', msg); } catch (e) { /* bỏ qua */ }
    toast('Có lỗi nhỏ, con thử lại nhé! 🙏', 2600);
  }

  /* ---------- Gợi ý lần đầu ---------- */
  function firstVisitHint() {
    if (!P) return;
    try {
      if (P.list().length === 1 && P.active().name === 'Bé' && !window.sessionStorage.getItem('3hoa-hub-hint')) {
        window.sessionStorage.setItem('3hoa-hub-hint', '1');
        setTimeout(function () { toast('Bấm vào 🐯 Bé ở góc trên để thêm tên của con'); }, 900);
      }
    } catch (e) { /* bỏ qua (chế độ riêng tư…) */ }
  }

  /* ---------- Gắn sự kiện ---------- */
  function on(id, ev, fn) { const el = $(id); if (el) el.addEventListener(ev, fn); }
  function bind() {
    on('btn-player', 'click', openPlayers);
    on('btn-players-back', 'click', closePlayers);
    on('players', 'click', function (e) { if (e.target === $('players')) closePlayers(); });
    on('player-list', 'click', function (e) {
      const b = e.target && e.target.closest ? e.target.closest('.player-item') : null;
      if (!b || !P) return;
      P.setActive(b.getAttribute('data-id'));
      // renderPlayers() dựng lại danh sách nên nút vừa bấm biến mất: đưa tiêu điểm về mục đang chọn
      setTimeout(function () {
        try { const a = document.querySelector('#player-list .player-item.active'); if (a) a.focus(); } catch (e) { /* bỏ qua */ }
      }, 40);
    });
    on('btn-player-add', 'click', function () { openPlayerForm('add'); });
    on('btn-player-rename', 'click', function () { openPlayerForm('rename'); });
    on('btn-player-avatar', 'click', function () { openPlayerForm('avatar'); });
    on('btn-player-cancel', 'click', function () { PlayersUI.mode = null; renderPlayers(); focusLater('btn-player-add'); });
    on('player-form', 'submit', function (e) { e.preventDefault(); submitPlayerForm(); });
    on('player-avatars', 'click', function (e) {
      const b = e.target && e.target.closest ? e.target.closest('.avatar') : null;
      if (!b) return;
      PlayersUI.avatar = b.getAttribute('data-avatar');
      const all = $('player-avatars').children;
      for (let i = 0; i < all.length; i++) all[i].setAttribute('aria-pressed', String(all[i] === b));
    });
    on('btn-player-remove', 'click', function () {
      if (!P) return;
      const p = P.active();
      adultGate(function () {
        // Bỏ tên khỏi danh sách rồi xóa tiến trình của bạn đó trong 6 game; hồ sơ trên Đảo Khủng Long là riêng, xóa trong đảo
        if (P.remove(p.id)) {
          purgeProgress(p.id);
          renderAll();
          toast('Đã xóa ' + p.name + ' và tiến trình trong 6 trò chơi', 3000);
          focusLater('btn-players-back');
        }
      }, 'Xóa ' + p.name + ': xóa tên và tiến trình của bạn này trong 6 trò chơi trên máy này, không lấy lại được. Hồ sơ trên Đảo Khủng Long vẫn giữ (xóa trong Góc phụ huynh của đảo).');
    });
    on('parent-gate-form', 'submit', function (e) { e.preventDefault(); submitGate(); });
    on('btn-parent-gate-cancel', 'click', function () { closeGate(); focusLater('btn-player-remove'); });
    on('parent-gate', 'click', function (e) { if (e.target === $('parent-gate')) { closeGate(); focusLater('btn-player-remove'); } });
    on('btn-random', 'click', function () { this.setAttribute('href', PLAYABLE[Math.floor(Math.random() * PLAYABLE.length)] + '/'); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (Gate.open) { e.preventDefault(); closeGate(); focusLater('btn-player-remove'); return; }
        if (PlayersUI.open && PlayersUI.mode) { e.preventDefault(); PlayersUI.mode = null; renderPlayers(); focusLater('btn-player-add'); return; }
        if (PlayersUI.open) { e.preventDefault(); closePlayers(); }
      } else if (e.key === 'Tab') trapTab(e);
    });
    if (P) P.onChange(function () { renderChip(); renderPlayers(); renderAll(); });
    // Tab khác vừa lưu: tiến trình game → vẽ lại thẻ; hồ sơ (đổi tên / hình mà không đổi bé đang chơi → profile.js
    // đã đọc lại nhưng không gọi onChange) → vẽ lại chip và danh sách
    window.addEventListener('storage', function (e) {
      if (!e) return;
      if (e.key === ISLAND.key || GAMES.some(function (g) { return g.key === e.key; })) renderAll();
      else if (P && e.key === P.KEY) { renderChip(); renderPlayers(); }
    });
    // Quay lại từ một game (Back / page cache trên iPad Safari): bé có thể đã đổi ngay trong game, cùng tab nên
    // KHÔNG có sự kiện storage → phải đọc lại hồ sơ từ localStorage rồi vẽ lại chip, danh sách và thẻ
    window.addEventListener('pageshow', function (e) { if (e && e.persisted) refresh(); else renderAll(); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) refresh(); });
    window.addEventListener('error', function (e) { onFatal(e && e.message); });
    window.addEventListener('unhandledrejection', function (e) { onFatal(e && e.reason && e.reason.message); });
  }

  /* ---------- Service worker của trang chủ: mở được trang chủ khi ngoại tuyến (iPad, thêm vào màn hình chính).
     sw-home.js chỉ trả lời tệp của trang chủ; mọi đường dẫn của game đi thẳng ra mạng, và service worker riêng của
     từng game (phạm vi dài hơn, ví dụ /math-ninja/) vẫn làm chủ thư mục của nó. ---------- */
  function registerSw() {
    try {
      const sw = window.navigator && window.navigator.serviceWorker;
      if (!sw || typeof sw.register !== 'function') return;
      const loc = window.location;
      if (loc.protocol !== 'https:' && loc.hostname !== 'localhost' && loc.hostname !== '127.0.0.1') return;
      sw.register('sw-home.js', { scope: './' }).catch(function () { /* bỏ qua */ });
    } catch (e) { /* bỏ qua */ }
  }

  function boot() {
    renderChip();
    renderPlayers();
    renderAll();
    bind();
    firstVisitHint();
    registerSw();
  }
  if (document.readyState !== 'loading') boot();
  else document.addEventListener('DOMContentLoaded', boot);

  // Móc gỡ lỗi chỉ đọc (kiểm thử): không cho phép ghi
  window.__Hub = Object.freeze({ GAMES: GAMES, ISLAND: ISLAND, PLAYABLE: PLAYABLE, readGame: readGame, readIsland: readIsland, islandFor: islandFor, nameKey: nameKey,
    summarize: summarize, summarizeAll: summarizeAll, aggregate: aggregate, render: renderAll, version: 2 });
})();
