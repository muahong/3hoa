/* ============================================================
   game.js – Bộ máy trò chơi Vệ Binh Cửu Chương
   - Canvas 2D, vòng lặp requestAnimationFrame theo thời gian thực (dt)
   - Thiên thạch mang phép nhân/chia rơi xuống hành tinh Ba Hoa
   - Gõ đáp án trên bàn phím số (hoặc bàn phím máy tính) rồi BẮN
   ============================================================ */
(function () {
  'use strict';

  const T = window.Tables, Sfx = window.Sfx, Music = window.Music, Voice = window.Voice;
  const rnd = T.rnd, chance = T.chance, pick = T.pick;
  const TAU = Math.PI * 2;
  const FONT = '"Baloo 2", "Arial Rounded MT Bold", "Segoe UI", Arial, sans-serif';
  const $ = function (id) { return document.getElementById(id); };
  const clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  const PRAISE = ['Chính xác!', 'Tuyệt vời!', 'Giỏi quá!', 'Đúng rồi!', 'Xuất sắc!', 'Siêu đỉnh!', 'Hay lắm!', 'Bắn trúng!'];
  const STAR_FACTOR = { t2: 1, t3: 0.95, t4: 0.9, t5: 1, t6: 0.85, t7: 0.8, t8: 0.8, t9: 0.8, c1: 0.95, c2: 0.85, c3: 0.75, c4: 0.7, c5: 0.6, c6: 0.45, c7: 0.55 };
  const MAX_SHIELDS = 3;
  const MAX_PARTS = 400;
  const POP_T = 0.3;
  const BASE_FALL = 14;        // giây để thiên thạch rơi tới khiên (đợt 1, tốc độ 1)
  const REVIEW_SLOTS = [2, 6, 10];   // vị trí thiên thạch mang câu ôn lại trong ván
  const HINT_POINTS = 20;      // điểm khi bắn thiên thạch đã hiện đáp án

  /* ================= LƯU TRỮ (localStorage) =================
     Thiết lập của máy nằm ở mức trên cùng; tiến trình, kỷ lục, "cần ôn lại" và thống kê
     nằm trong players[<id bé>] để nhiều bé dùng chung một máy vẫn có tiến trình riêng.
     Mọi dữ liệu đọc từ localStorage đều được kiểm tra kiểu và khoảng giá trị. */
  const NAME_MAX = 16;
  const REC_KEY = /^(t[2-9]|c[1-7]):(mul|div|mix|x):(60|90|120)$/;
  const Store = {
    key: 'cuu-chuong-v1',
    data: { sound: true, music: true, voice: true, fx: 'full', duration: 90, op: 'mix', players: {} },
    blank() {
      return { records: {}, names: [], missed: {}, stats: { plays: 0, correct: 0, wrong: 0, seconds: 0, byTopic: {}, last: 0 } };
    },
    reviver(k, v) { return (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v; },
    int(v, lo, hi, def) { v = Math.floor(Number(v)); return Number.isFinite(v) ? clamp(v, lo, hi) : def; },
    /** Cắt chuỗi theo ký tự (giữ nguyên emoji, dấu tiếng Việt). */
    str(v, max) { return Array.from(String(v == null ? '' : v)).slice(0, max).join(''); },
    mkey(k) { return this.str(k, 80); },
    load() {
      let d = null;
      try { const raw = localStorage.getItem(this.key); if (raw) d = JSON.parse(raw, this.reviver); } catch (e) { d = null; }
      if (!d || typeof d !== 'object' || Array.isArray(d)) d = {};
      this.data.sound = d.sound !== false;
      this.data.music = d.music !== false;
      this.data.voice = d.voice !== false;
      this.data.fx = d.fx === 'lite' ? 'lite' : 'full';
      this.data.duration = [60, 90, 120].indexOf(Number(d.duration)) >= 0 ? Number(d.duration) : 90;
      this.data.op = ['mul', 'div', 'mix'].indexOf(d.op) >= 0 ? d.op : 'mix';
      this.data.players = {};
      const src = d.players && typeof d.players === 'object' && !Array.isArray(d.players) ? d.players : null;
      // Chỉ coi là "đã có bé" khi thật sự có id hợp lệ: players rỗng mà còn kỷ lục cũ thì vẫn phải di trú
      const ids = src ? Object.keys(src).filter(function (id) { return /^[A-Za-z0-9_-]{1,24}$/.test(id); }) : [];
      if (ids.length) {
        ids.forEach(function (id) { Store.data.players[id] = Store.sanitize(src[id]); });
      } else if (d.records || d.names) {
        // Di trú dữ liệu cũ (chưa có players): kỷ lục cũ thuộc về bé mặc định p1
        this.data.players.p1 = this.sanitize({ records: d.records, names: d.names });
        this.save();
      }
    },
    /** Ép một bucket tiến trình về đúng kiểu/khoảng; dữ liệu lạ bị bỏ. */
    sanitize(b) {
      const out = this.blank();
      if (!b || typeof b !== 'object' || Array.isArray(b)) return out;
      const rs = b.records && typeof b.records === 'object' && !Array.isArray(b.records) ? b.records : {};
      Object.keys(rs).slice(0, 200).forEach(function (k) {
        if (!REC_KEY.test(k)) return;
        out.records[k] = Store.cleanRec(rs[k]);
      });
      if (Array.isArray(b.names)) {
        out.names = b.names.filter(function (n) { return typeof n === 'string'; }).slice(0, 5).map(function (n) { return Store.str(n, NAME_MAX); });
      }
      const ms = b.missed && typeof b.missed === 'object' && !Array.isArray(b.missed) ? b.missed : {};
      Object.keys(ms).slice(0, 120).forEach(function (k) {
        const e = ms[k], key = Store.mkey(k);
        if (!key || !e || typeof e !== 'object') return;
        const info = Store.cleanInfo(e.info);
        if (!info || info.text !== key) return;         // info phải dựng lại đúng câu đã lưu
        out.missed[key] = { n: Store.int(e.n, 1, 9999, 1), ok: Store.int(e.ok, 0, 9, 0), last: Store.int(e.last, 0, 9e15, 0), info: info };
      });
      this.capMissed(out.missed);
      const st = b.stats && typeof b.stats === 'object' && !Array.isArray(b.stats) ? b.stats : {};
      out.stats.plays = this.int(st.plays, 0, 9999999, 0);
      out.stats.correct = this.int(st.correct, 0, 99999999, 0);
      out.stats.wrong = this.int(st.wrong, 0, 99999999, 0);
      out.stats.seconds = this.int(st.seconds, 0, 999999999, 0);
      out.stats.last = this.int(st.last, 0, 9e15, 0);
      const bt = st.byTopic && typeof st.byTopic === 'object' && !Array.isArray(st.byTopic) ? st.byTopic : {};
      Object.keys(bt).slice(0, 40).forEach(function (k) {
        const t = bt[k];
        if (!/^(t[0-9]|c[1-7]|mul|div|find|big)$/.test(k) || !t || typeof t !== 'object') return;
        out.stats.byTopic[k] = { c: Store.int(t.c, 0, 99999999, 0), w: Store.int(t.w, 0, 99999999, 0) };
      });
      return out;
    },
    cleanRec(r) {
      r = r && typeof r === 'object' && !Array.isArray(r) ? r : {};
      const top = [];
      if (Array.isArray(r.top)) {
        for (let i = 0; i < r.top.length && top.length < 5; i++) {
          const e = r.top[i];
          if (!e || typeof e !== 'object') continue;
          top.push({ name: Store.str(e.name, NAME_MAX) || 'Bạn nhỏ', score: Store.int(e.score, 0, 999999, 0), date: Store.int(e.date, 0, 9e15, 0) });
        }
      }
      top.sort(function (a, b) { return b.score - a.score; });
      return { best: this.int(r.best, 0, 999999, 0), stars: this.int(r.stars, 0, 3, 0), top: top };
    },
    /** Dữ liệu tối thiểu để dựng lại một câu hỏi cần ôn. */
    cleanInfo(info) {
      const q = T.fromInfo(info);
      if (!q) return null;
      return { kind: q.kind, label: q.label, text: q.text, answer: q.answer, table: q.table };
    },
    capMissed(m) {
      const keys = Object.keys(m);
      if (keys.length <= 60) return;
      keys.sort(function (a, b) { return m[a].last - m[b].last; });
      for (let i = 0; i < keys.length - 60; i++) delete m[keys[i]];
    },
    save() {
      try {
        localStorage.setItem(this.key, JSON.stringify(this.data));
      } catch (e) {
        if (!this._warned) { this._warned = true; try { toast('Không lưu được điểm trên máy này'); } catch (e2) { /* bỏ qua */ } }
      }
    },
    activeId() {
      try { if (window.Players) return Players.active().id; } catch (e) { /* bỏ qua */ }
      return 'p1';
    },
    /** Bucket tiến trình của bé đang chơi (tạo mới nếu chưa có). */
    p() {
      const id = this.activeId();
      if (!this.data.players[id]) this.data.players[id] = this.blank();
      return this.data.players[id];
    },
    recKey(level, op, duration) { return level.id + ':' + (level.table ? op : 'x') + ':' + duration; },
    getRecord(level, op, duration) {
      return this.cleanRec(this.p().records[this.recKey(level, op, duration)]);
    },
    setRecord(level, op, duration, rec) {
      const k = this.recKey(level, op, duration);
      if (!REC_KEY.test(k)) return;
      this.p().records[k] = this.cleanRec(rec);
      this.save();
    },
    /** Kỷ lục tốt nhất của một màn ở mọi chế độ (nhân/chia/cả hai, mọi thời lượng). */
    bestFor(levelId) {
      const rs = this.p().records;
      let best = 0, stars = 0;
      Object.keys(rs).forEach(function (k) {
        if (k.indexOf(levelId + ':') !== 0) return;
        const r = rs[k];
        if (r.best > best) best = r.best;
        if (r.stars > stars) stars = r.stars;
      });
      return { best: best, stars: stars };
    },
    /** Tổng số sao của một bé trong game này (mặc định: bé đang chơi).
        Bé tạo ở game khác, chưa từng chơi game này thì chưa có bucket → 0 sao. */
    sumStars(id) {
      const rs = (this.data.players[id || this.activeId()] || this.blank()).records;
      const byLevel = {};
      Object.keys(rs || {}).forEach(function (k) {
        const id = k.split(':')[0], r = rs[k];
        if (!byLevel[id] || r.stars > byLevel[id]) byLevel[id] = Store.int(r.stars, 0, 3, 0);
      });
      let s = 0;
      Object.keys(byLevel).forEach(function (id) { s += byLevel[id]; });
      return s;
    },
    /* ---- Ôn lại thông minh ---- */
    noteMissed(key, info) {
      const m = this.p().missed;
      key = this.mkey(key);
      const clean = this.cleanInfo(info);
      if (!key || !clean || clean.text !== key) return;
      const e = m[key] || { n: 0, ok: 0, last: 0, info: null };
      e.n = Math.min(9999, e.n + 1); e.ok = 0; e.last = Date.now(); e.info = clean;
      m[key] = e;
      this.capMissed(m);
      this.save();
    },
    noteOk(key) {
      const m = this.p().missed, k = this.mkey(key), e = m[k];
      if (!e) return;
      e.ok++;
      if (e.ok >= 2) delete m[k];
      this.save();
    },
    /** Danh sách câu cần ôn (sai nhiều nhất trước); filterFn(info, key) để lọc theo màn. */
    reviewPool(filterFn) {
      const m = this.p().missed;
      return Object.keys(m)
        .filter(function (k) { return !filterFn || filterFn(m[k].info, k); })
        .sort(function (a, b) { return m[b].n - m[a].n || m[b].last - m[a].last; })
        .map(function (k) { return { key: k, info: m[k].info, n: m[k].n }; });
    },
    /* ---- Thống kê cho báo cáo phụ huynh ---- */
    addStats(round, byTopic) {
      const s = this.p().stats;
      s.plays++;
      s.correct += Math.max(0, round.correct || 0);
      s.wrong += Math.max(0, round.wrong || 0);
      s.seconds += Math.max(0, Math.round(round.seconds || 0));
      s.last = Date.now();
      const bump = function (topic, c, w) {
        if (!topic || !/^(t[0-9]|c[1-7]|mul|div|find|big)$/.test(topic)) return;
        const t = s.byTopic[topic] || { c: 0, w: 0 };
        t.c += c; t.w += w;
        s.byTopic[topic] = t;
      };
      if (byTopic) Object.keys(byTopic).slice(0, 40).forEach(function (k) { bump(k, byTopic[k].c || 0, byTopic[k].w || 0); });
      this.save();
    },
    resetActive() { this.data.players[this.activeId()] = this.blank(); this.save(); }
  };

  /* ================= CHUYỂN ĐỘNG GIẢM =================
     Tôn trọng prefers-reduced-motion và thiết lập "✨ Hiệu ứng: Ít": ít hạt, không rung/chớp màn hình. */
  const Motion = {
    lite: false,
    refresh() {
      let pref = false;
      try { pref = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { /* bỏ qua */ }
      this.lite = pref || Store.data.fx === 'lite';
      try { document.documentElement.classList.toggle('lite-fx', this.lite); } catch (e) { /* bỏ qua */ }
    },
    /** Hệ số số hạt hiệu ứng. */
    n(k) { return Math.max(1, Math.round(k * (this.lite ? 0.4 : 1))); }
  };

  /* ================= TRẠNG THÁI ================= */
  const G = {
    W: 0, H: 0, dpr: 1, baseR: 44,
    state: 'menu',          // menu | levels | tables | countdown | playing | paused | over
    mode: 'table',          // table | challenge
    level: null, op: 'mix', duration: 90,
    anim: 0,                // đồng hồ hoạt hình (luôn chạy)
    time: 0,                // đồng hồ ván chơi (chỉ chạy khi playing)
    field: { x: 0, y: 0, w: 0, h: 0 },
    planet: { cx: 0, cy: 0, r: 0, domeH: 0 },
    shieldR: 0,
    cannon: { x: 0, y: 0, angle: -Math.PI / 2, recoil: 0 },
    meteors: [], parts: [], texts: [], lasers: [], stars: [],
    bg: null, shake: 0, flash: null, shieldFlash: 0,
    score: 0, shields: MAX_SHIELDS, streak: 0, bestStreak: 0, correct: 0, wrong: 0, stage: 1, timeLeft: 90,
    solved: 0, hinted: 0, missed: 0, attemptsWrong: 0, asked: 0, byTopic: {}, reviewQueue: [], spawnN: 0, holdUntil: 0,
    typed: '', targetId: 0, lastSpawn: -99, nextSpawnAt: 0, idSeq: 0, attractT: 0.8, review: [],
    overAt: -1, lastWarnSec: -1, endReason: '', hurry: false, spawnY: 0,
    hud: { score: -1, shields: -1, stage: -1, mult: -1, streak: -1, time: '' },
    cardKey: '', cdTimer: 0, resultShown: false, lastEntry: null, wakeLock: null, tableN: 2, reading: false,
    bgCanvas: null, layoutKey: '', vignette: null, vignetteKey: '', resumeCountdown: false, flowers: [], cheer: 0,
    welcomed: false, suggestedOnce: false, lastLabelPx: 0, reportFrom: 'menu',
    perf: { n: 0, update: 0, render: 0, avgUpdate: 0, avgRender: 0 }
  };

  /* ================= DOM ================= */
  const app = $('app');
  const canvas = $('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  const fxCanvas = $('fx');
  const fxCtx = fxCanvas ? fxCanvas.getContext('2d') : null;
  const ui = {
    hud: $('hud'), menu: $('menu'), levels: $('levels'), tables: $('tables'), howto: $('howto'), countdown: $('countdown'),
    pause: $('pause'), gameover: $('gameover'), toast: $('toast'), numpad: $('numpad'),
    score: $('hud-score'), stage: $('hud-stage'), combo: $('hud-combo'), answer: $('hud-answer'),
    timer: $('hud-timer'), timerFill: $('hud-timer-fill'), time: $('hud-time'), shields: $('hud-shields'), hint: $('hud-hint'),
    stageBanner: $('hud-stage-banner'), resultTables: $('btn-result-tables'), hintBtn: $('btn-hint'),
    countNum: $('count-num'), levelGrid: $('level-grid'), modeDesc: $('mode-desc'), opRow: $('op-row'), opGroup: $('op-group'),
    tableTabs: $('table-tabs'), tableBody: $('table-body'),
    resultTitle: $('result-title'), resultLevel: $('result-level'), resultScore: $('result-score'),
    resultStars: $('result-stars'), resultRecord: $('result-record'),
    stCorrect: $('st-correct'), stWrong: $('st-wrong'), stCombo: $('st-combo'), stAcc: $('st-acc'),
    review: $('review'), reviewChips: $('review-chips'), reviewPerfect: $('review-perfect'),
    stCorrectSub: $('st-correct-sub'), stWrongSub: $('st-wrong-sub'), leader: $('leader'),
    durationGroup: $('duration-group'), ipadTip: $('ipad-tip'),
    players: $('players'), report: $('report'), parentGate: $('parent-gate'), fireBtn: ui_fire()
  };
  function ui_fire() { return document.querySelector('#numpad .fire'); }
  const SCREENS = ['menu', 'levels', 'tables', 'countdown', 'pause', 'gameover'];
  const OVERLAYS = ['howto', 'players', 'report', 'parentGate'];

  function showScreen(name) {
    SCREENS.forEach(function (k) { ui[k].classList.toggle('hidden', k !== name); });
  }
  /** Các lớp phủ (hướng dẫn, người chơi, kết quả, cổng phụ huynh) không đổi G.state. */
  function openOverlay(key) {
    OVERLAYS.forEach(function (k) { if (ui[k]) ui[k].classList.toggle('hidden', k !== key); });
  }
  function closeOverlays() {
    OVERLAYS.forEach(function (k) { if (ui[k]) ui[k].classList.add('hidden'); });
  }
  function anyOverlay() {
    for (let i = 0; i < OVERLAYS.length; i++) { const el = ui[OVERLAYS[i]]; if (el && !el.classList.contains('hidden')) return OVERLAYS[i]; }
    return null;
  }
  function showHud(on) {
    ui.hud.classList.toggle('hidden', !on);
    ui.numpad.classList.toggle('off', !on);
  }
  function toast(msg, ms) {
    ui.toast.textContent = msg;
    ui.toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { ui.toast.classList.remove('show'); }, ms || 1800);
  }
  function fmt(n) { try { return Number(n).toLocaleString('vi-VN'); } catch (e) { return String(n); } }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function inGame() { return G.state === 'countdown' || G.state === 'playing' || G.state === 'paused' || G.state === 'over'; }

  /* ================= KÍCH THƯỚC & BỐ CỤC ================= */
  function resize() {
    const w = app.clientWidth || window.innerWidth;
    const h = app.clientHeight || window.innerHeight;
    if (!w || !h) return;
    // Xoay máy giữa ván: tạm dừng để bé không mất khiên oan trong lúc bố cục đổi
    const flipped = G.W > 0 && G.H > 0 && (w > h) !== (G.W > G.H);
    G.dpr = Math.min(window.devicePixelRatio || 1, 2);
    G.W = w; G.H = h;
    canvas.width = Math.round(w * G.dpr);
    canvas.height = Math.round(h * G.dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    if (fxCanvas) {
      fxCanvas.width = canvas.width;
      fxCanvas.height = canvas.height;
      fxCanvas.style.width = w + 'px';
      fxCanvas.style.height = h + 'px';
    }
    layout();
    initStars();
    if (flipped && G.state === 'playing') { pauseGame(); toast('Xoay màn hình rồi, bấm ▶ Chơi tiếp nhé!', 2400); }
  }

  /** Tính vùng chơi (phần màn hình không bị bàn phím số che), hành tinh, khiên, pháo. */
  function layout() {
    const W = G.W, H = G.H;
    const old = G.layoutKey ? { f: G.field, apex: G.planet.cy - G.shieldR } : null;
    const f = { x: 0, y: 0, w: W, h: H };
    if (inGame()) {
      const pr = ui.numpad.getBoundingClientRect();
      if (W <= H) f.h = clamp(pr.top - 6, H * 0.45, H);          // màn hình dọc: bàn phím ở dưới
      else f.w = clamp(pr.left - 6, W * 0.5, W);                 // màn hình ngang: bàn phím bên phải
    }
    G.field = f;
    // Màn hẹp (điện thoại): thiên thạch to hơn để nhãn phép tính vẫn đọc được
    G.baseR = f.w < 600 ? clamp(Math.min(f.w, f.h) * 0.11, 44, 68) : clamp(Math.min(f.w, f.h) * 0.085, 36, 68);
    const domeH = clamp(f.h * 0.14, 50, 120);
    const pr = Math.max(f.w * 0.75, 280);
    G.planet = { cx: f.x + f.w / 2, cy: f.y + f.h - domeH + pr, r: pr, domeH: domeH };
    G.shieldR = pr + clamp(domeH * 0.5, 22, 50);
    G.cannon.x = G.planet.cx;
    G.cannon.y = G.planet.cy - pr;
    updateSpawnY();
    // Đổi bố cục giữa ván: dời thiên thạch theo tỉ lệ để chúng không rơi ngay vào khiên
    const apex = G.planet.cy - G.shieldR;
    const rescale = inGame() && old && old.f.w > 0 && old.apex > 0 && (old.f.w !== f.w || old.apex !== apex);
    G.meteors.forEach(function (m) {
      // Thiên thạch đã hiện đáp án vẫn phải to như lúc hiện (xoay máy không được thu nhỏ chữ)
      m.r = radiusFor(m.q ? (m.hint ? m.q.full : m.q.label) : '') * (m.hint ? 1.15 : 1);
      if (!rescale || m.dead) return;
      m.x = f.x + (m.x - old.f.x) * f.w / old.f.w;
      m.y = Math.min(m.y * (apex / old.apex), apex - m.r * 0.8);
      m.vy = m.vy * (apex / old.apex);
      m.x = clamp(m.x, f.x + edgePad(m.r), f.x + f.w - edgePad(m.r));
    });
    clearLabelCache();
    buildBackground();
  }

  /** Thiên thạch xuất hiện ngay dưới HUD (thẻ trả lời, đồng hồ, ô nhắc) để không bị che.
      Ô nhắc cao lên khi có chữ nên phải tính lại mỗi lần hiện/ẩn ô nhắc, không chỉ khi bố cục đổi. */
  function updateSpawnY() {
    G.spawnY = 0;
    if (!inGame()) return;
    try {
      const c = ui.hud.querySelector('.hud-center');
      G.spawnY = Math.max(0, (c ? c.getBoundingClientRect().bottom : ui.timer.getBoundingClientRect().bottom) + 6);
    } catch (e) { G.spawnY = 0; }
  }

  function radiusFor(label) {
    return Math.round(G.baseR * (1 + 0.05 * Math.max(0, String(label).length - 5)));
  }

  function surfaceY(dx) {
    const P = G.planet;
    const d = Math.min(Math.abs(dx), P.r);
    return P.cy - Math.sqrt(P.r * P.r - d * d);
  }

  /** Vẽ một lớp tĩnh vào canvas dùng lại (không cấp phát canvas mới mỗi lần bố cục đổi). */
  function layer(fn) {
    let c = G.bgCanvas;
    if (!c) { c = document.createElement('canvas'); G.bgCanvas = c; }
    if (c.width !== canvas.width || c.height !== canvas.height) { c.width = canvas.width; c.height = canvas.height; }
    const cx = c.getContext('2d');
    cx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    cx.clearRect(0, 0, G.W, G.H);
    fn(cx);
    return c;
  }

  function seededRand(seed) {
    let s = (seed >>> 0) || 1;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  function flower(c, x, y, s, color) {
    c.strokeStyle = '#3f9d3a';
    c.lineWidth = Math.max(1.5, s * 0.16);
    c.beginPath(); c.moveTo(x, y + s * 0.4); c.lineTo(x, y + s * 2.2); c.stroke();
    c.fillStyle = color;
    for (let i = 0; i < 5; i++) {
      const a = i * TAU / 5 - Math.PI / 2;
      c.beginPath(); c.arc(x + Math.cos(a) * s * 0.55, y + Math.sin(a) * s * 0.55, s * 0.4, 0, TAU); c.fill();
    }
    c.fillStyle = '#ffd94a';
    c.beginPath(); c.arc(x, y, s * 0.32, 0, TAU); c.fill();
  }

  function house(c, x, y, s, color) {
    c.fillStyle = color;
    c.fillRect(x - s * 0.5, y - s, s, s);
    c.fillStyle = '#c0392b';
    c.beginPath(); c.moveTo(x - s * 0.65, y - s); c.lineTo(x, y - s * 1.6); c.lineTo(x + s * 0.65, y - s); c.closePath(); c.fill();
    c.fillStyle = '#ffe66d';
    c.fillRect(x - s * 0.18, y - s * 0.7, s * 0.36, s * 0.3);
  }

  function tree(c, x, y, s) {
    c.fillStyle = '#7a4a1e';
    c.fillRect(x - s * 0.08, y - s * 0.55, s * 0.16, s * 0.6);
    c.fillStyle = '#3f9c3a';
    c.beginPath(); c.arc(x, y - s * 0.75, s * 0.42, 0, TAU); c.fill();
    c.beginPath(); c.arc(x - s * 0.3, y - s * 0.55, s * 0.32, 0, TAU); c.fill();
    c.beginPath(); c.arc(x + s * 0.3, y - s * 0.55, s * 0.32, 0, TAU); c.fill();
    c.fillStyle = '#63c05c';
    c.beginPath(); c.arc(x - s * 0.12, y - s * 0.88, s * 0.2, 0, TAU); c.fill();
  }

  /** Nền tĩnh: bầu trời sao, tinh vân, hành tinh Ba Hoa (vẽ 1 lần, dùng lại mỗi khung hình). */
  function buildBackground() {
    const W = G.W, H = G.H, P = G.planet, f = G.field;
    if (!W || !H) return;
    const key = [W, H, G.dpr, Math.round(f.w), Math.round(f.h), Math.round(P.cx), Math.round(P.cy)].join(',');
    if (G.bg && key === G.layoutKey) return;             // bố cục không đổi: giữ nguyên nền đã vẽ
    G.layoutKey = key;
    G.bg = layer(function (c) {
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#050c22');
      g.addColorStop(0.55, '#10224f');
      g.addColorStop(1, '#2a1a5e');
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);

      // Tinh vân
      const rand = seededRand(77);
      const cols = ['120,90,220', '40,200,220', '230,90,180', '90,140,255'];
      for (let i = 0; i < 6; i++) {
        const x = W * rand(), y = H * 0.7 * rand(), r = Math.min(W, H) * (0.2 + rand() * 0.3);
        const ng = c.createRadialGradient(x, y, 0, x, y, r);
        ng.addColorStop(0, 'rgba(' + cols[i % cols.length] + ',0.16)');
        ng.addColorStop(1, 'rgba(' + cols[i % cols.length] + ',0)');
        c.fillStyle = ng;
        c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
      }
      // Sao nhỏ tĩnh
      for (let i = 0; i < 160; i++) {
        const x = W * rand(), y = H * rand(), r = 0.5 + rand() * 1.4;
        c.fillStyle = 'rgba(255,255,255,' + (0.35 + rand() * 0.5).toFixed(2) + ')';
        c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
      }

      // Quầng khí quyển
      const ag = c.createRadialGradient(P.cx, P.cy, P.r * 0.98, P.cx, P.cy, P.r + Math.max(40, P.domeH));
      ag.addColorStop(0, 'rgba(120,230,255,0.35)');
      ag.addColorStop(1, 'rgba(120,230,255,0)');
      c.fillStyle = ag;
      c.beginPath(); c.arc(P.cx, P.cy, P.r + Math.max(40, P.domeH), 0, TAU); c.fill();

      // Hành tinh
      const pg = c.createRadialGradient(P.cx - P.r * 0.2, P.cy - P.r * 1.05, P.r * 0.1, P.cx, P.cy, P.r);
      pg.addColorStop(0, '#8ae6ff');
      pg.addColorStop(0.35, '#2ab0e6');
      pg.addColorStop(1, '#0f5f9c');
      c.fillStyle = pg;
      c.beginPath(); c.arc(P.cx, P.cy, P.r, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(180,245,255,0.7)';
      c.lineWidth = 4;
      c.beginPath(); c.arc(P.cx, P.cy, P.r - 2, 0, TAU); c.stroke();

      // Lục địa: dải cỏ xanh dọc bề mặt
      c.save();
      c.beginPath(); c.arc(P.cx, P.cy, P.r, 0, TAU); c.clip();
      c.fillStyle = '#6ddc7a';
      const rand2 = seededRand(21);
      for (let i = 0; i < 9; i++) {
        const dx = (rand2() - 0.5) * f.w * 1.3;
        const w = f.w * (0.08 + rand2() * 0.16), h = P.domeH * (0.25 + rand2() * 0.35);
        const y = surfaceY(dx) + h * 0.35;
        c.beginPath(); c.ellipse(P.cx + dx, y, w, h, 0, 0, TAU); c.fill();
      }
      c.fillStyle = '#4fc26a';
      for (let i = 0; i < 6; i++) {
        const dx = (rand2() - 0.5) * f.w * 1.2;
        const w = f.w * (0.05 + rand2() * 0.1), h = P.domeH * (0.15 + rand2() * 0.2);
        c.beginPath(); c.ellipse(P.cx + dx, surfaceY(dx) + h * 0.8, w, h, 0, 0, TAU); c.fill();
      }
      c.restore();

      // Ba bông hoa (3hoa) bên trái pháo, nhà và cây bên phải
      const s = clamp(f.w * 0.018, 7, 15);
      const fx = [-s * 12, -s * 8.5, -s * 5.2];
      const fc = ['#ff6fa5', '#ffffff', '#ffa94d'];
      // Ba bông hoa "3 hoa" đung đưa theo gió nên vẽ động mỗi khung hình, không in vào nền
      G.flowers = [];
      for (let i = 0; i < 3; i++) {
        G.flowers.push({ x: P.cx + fx[i], y: surfaceY(fx[i]) - s * 2.2, s: s * (i === 1 ? 1.2 : 1), color: fc[i] });
      }
      house(c, P.cx + s * 6, surfaceY(s * 6) + 1, s * 1.8, '#ffe9c4');
      house(c, P.cx + s * 9.5, surfaceY(s * 9.5) + 1, s * 1.4, '#ffd6e0');
      tree(c, P.cx + s * 12.5, surfaceY(s * 12.5) + 1, s * 2.6);
      tree(c, P.cx - s * 16, surfaceY(-s * 16) + 1, s * 2.2);
      const rand3 = seededRand(5);
      for (let i = 0; i < 8; i++) {
        const dx = (rand3() - 0.5) * f.w * 1.1;
        if (Math.abs(dx) < s * 14) continue;
        flower(c, P.cx + dx, surfaceY(dx) - s * 1.6, s * (0.5 + rand3() * 0.4), fc[i % 3]);
      }
    });
  }

  function initStars() {
    G.stars = [];
    for (let i = 0; i < 70; i++) {
      G.stars.push({ x: Math.random() * G.W, y: Math.random() * G.H * 0.85, r: 1 + Math.random() * 1.8, ph: Math.random() * TAU, sp: 1.5 + Math.random() * 3 });
    }
  }

  /* ================= THỰC THỂ ================= */
  function Meteor(o) {
    this.id = ++G.idSeq;
    this.kind = 'rock';       // rock | heart
    this.q = null;
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
    this.rot = 0; this.vr = 0;
    this.r = G.baseR;
    this.dead = false;
    this.popping = 0;
    this.scale = 1;
    this.spawnT = 0;
    this.hint = false;
    this.asked = false;          // đã bấm 💡 Gợi ý cho câu này (mất thưởng nhanh, điểm giảm nửa)
    this.sprite = null;          // ảnh viên đá dựng sẵn (không vẽ lại đa giác + hố mỗi khung hình)
    this.spriteR = 0;
    this.wrongs = 0;
    this.missed = false;
    this.born = G.time;
    this.targetedAt = null;
    this.craters = [];
    for (const k in o) this[k] = o[k];
    const n = 3 + rnd(0, 2);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, d = Math.random() * 0.55;
      this.craters.push({ dx: Math.cos(a) * d, dy: Math.sin(a) * d, r: 0.1 + Math.random() * 0.14 });
    }
  }

  function addText(text, x, y, o) {
    const t = { text: text, x: x, y: y, vy: -55, life: 1.1, max: 1.1, size: G.baseR * 0.85, color: '#fff', stroke: 'rgba(10,15,40,0.9)', t: 0 };
    if (o) for (const k in o) t[k] = o[k];
    t.max = t.life;
    t.y = Math.max(t.y, G.spawnY + t.size * 0.8);      // không trôi lên dải HUD (đồng hồ, thẻ trả lời)
    G.texts.push(t);
  }

  function addPart(p) {
    if (G.parts.length >= MAX_PARTS) G.parts.shift();
    G.parts.push(p);
  }

  function spawnExplosion(x, y, r, big) {
    const n = Motion.n(big ? 44 : 28);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, sp = (big ? 220 : 150) + Math.random() * (big ? 460 : 320);
      addPart({ kind: 'spark', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size: r * (0.05 + Math.random() * 0.08),
        color: pick(['#ffd166', '#ff9f1c', '#ff5400', '#ffffff', '#ffe66d']), life: 0.4 + Math.random() * 0.5, max: 0.9 });
    }
    for (let i = 0; i < Motion.n(10); i++) {
      const a = Math.random() * TAU, sp = 40 + Math.random() * 110;
      addPart({ kind: 'puff', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, size: r * (0.35 + Math.random() * 0.4), grow: r * 1.1,
        color: pick(['#6b5140', '#8c7160', '#5a463a']), life: 0.5 + Math.random() * 0.4, max: 0.9 });
    }
    for (let i = 0; i < Motion.n(8); i++) {
      const a = Math.random() * TAU, sp = 90 + Math.random() * 200;
      addPart({ kind: 'rock', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, size: r * (0.12 + Math.random() * 0.14),
        rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 10, color: '#7a5f4b', life: 0.7 + Math.random() * 0.5, max: 1.2 });
    }
  }

  function spawnTwinkle(x, y, r) {
    for (let i = 0; i < Motion.n(12); i++) {
      const a = Math.random() * TAU, sp = 60 + Math.random() * 160;
      addPart({ kind: 'spark', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size: r * (0.04 + Math.random() * 0.06),
        color: pick(['#ffffff', '#9af0ff', '#ffe66d']), life: 0.3 + Math.random() * 0.3, max: 0.6 });
    }
  }

  function spawnHeartBurst(x, y, r) {
    for (let i = 0; i < Motion.n(16); i++) {
      const a = Math.random() * TAU, sp = 80 + Math.random() * 220;
      addPart({ kind: 'heart', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, size: r * (0.15 + Math.random() * 0.2), color: pick(['#ff6b8b', '#ff8fb1', '#ffc2d1']), life: 0.7 + Math.random() * 0.5, max: 1.2 });
    }
  }

  function spawnConfetti(n) {
    const cols = ['#ff6b35', '#ffd166', '#06d6a0', '#118ab2', '#ef476f', '#7b5ea7', '#2ec4b6'];
    n = Motion.n(n);
    for (let i = 0; i < n; i++) {
      addPart({ kind: 'confetti', x: Math.random() * G.W, y: -20 - Math.random() * G.H * 0.5, vx: (Math.random() - 0.5) * 80, vy: 80 + Math.random() * 160,
        size: 6 + Math.random() * 8, color: pick(cols), rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 8, life: 4 + Math.random() * 2, max: 6, sway: Math.random() * TAU });
    }
  }

  /* ================= THIÊN THẠCH ================= */
  function speedMul() {
    const lvl = G.level;
    return (lvl ? lvl.speed : 0.7) * Math.min(1.6, 1 + 0.06 * (G.stage - 1));
  }
  function meteorCap() {
    let n = G.stage <= 3 ? 2 : G.stage <= 6 ? 3 : 4;
    // Câu 3 chữ số (nhân chia số lớn) cần nhiều thời gian đọc và tính hơn
    if (G.level && G.level.maxDigits === 3) n = Math.min(n, 3);
    if (G.field.w < 600) n = Math.min(n, 3);     // màn hẹp: đá to hơn nên bớt đá cho đỡ chen chúc
    return n;
  }
  /** Khoảng cách tối thiểu từ tâm thiên thạch tới mép sân: đủ chỗ cho cả vòng sáng mục tiêu. */
  function edgePad(r) { return Math.min(r * 1.35, Math.max(1, G.field.w / 2)); }
  function spawnGap() { return clamp(6.5 - 0.4 * (G.stage - 1), 3.0, 6.5) / (G.level ? G.level.speed : 1); }

  function liveMeteors() {
    return G.meteors.filter(function (m) { return !m.dead && m.popping <= 0; });
  }

  function spawnMeteor(q, kind, slowMul) {
    const f = G.field;
    const r = radiusFor(q ? q.label : '');
    const pad = edgePad(r);
    let x = 0, tries = 0;
    do {
      x = f.x + pad + Math.random() * Math.max(1, f.w - 2 * pad);
      tries++;
    } while (tries < 10 && G.meteors.some(function (m) { return !m.dead && m.y < f.h * 0.4 && Math.abs(m.x - x) < r * 2.4; }));
    const fallTime = BASE_FALL * (G.level && G.level.fall ? G.level.fall : 1) / speedMul() * (slowMul || 1);
    const apex = G.planet.cy - G.shieldR;
    let y0 = -r * 1.2;
    if (G.state === 'playing' || G.state === 'countdown') y0 = Math.min(G.spawnY + r * 1.1, apex - f.h * 0.35);
    const m = new Meteor({
      kind: kind || 'rock', q: q, x: x, y: y0, r: r,
      vy: (apex - y0) / fallTime,
      vx: (f.x + f.w / 2 - x) * 0.012 + (Math.random() - 0.5) * 10,
      rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 0.9
    });
    G.meteors.push(m);
    G.lastSpawn = G.time;
    if (!G.targetId) m.targetedAt = G.time;
    if (G.state === 'playing') { Sfx.play('spawn'); spawnTwinkle(m.x, m.y, r); }
    return m;
  }

  /** Mỗi ván chèn vài câu "cần ôn lại" (khoảng 1/4 số câu đầu ván) vào giữa các câu mới. */
  function spawnForQuestion() {
    G.spawnN++;
    let q = null;
    if (G.reviewQueue.length && REVIEW_SLOTS.indexOf(G.spawnN) >= 0) {
      const it = G.reviewQueue.shift();
      q = T.fromInfo(it.info);
      if (q) q.review = true;
    }
    if (!q) q = G.level.gen(G.op);
    const heart = !q.review && G.shields < MAX_SHIELDS && chance(0.14) && !G.meteors.some(function (m) { return !m.dead && m.kind === 'heart'; });
    spawnMeteor(q, heart ? 'heart' : 'rock');
  }

  /** Mục tiêu hiện tại: thiên thạch được chọn, hoặc thiên thạch thấp nhất. */
  function getTarget() {
    const live = liveMeteors();
    if (!live.length) { if (G.targetId) { G.targetId = 0; renderAnswerCard(false); } return null; }
    let t = null;
    for (let i = 0; i < live.length; i++) if (live[i].id === G.targetId) { t = live[i]; break; }
    if (!t) {
      t = live[0];
      for (let i = 1; i < live.length; i++) if (live[i].y > t.y) t = live[i];
      G.targetId = t.id;
      onTargetChanged(t);
    }
    return t;
  }

  function onTargetChanged(m) {
    renderAnswerCard(true);
    m.targetedAt = G.time;
    // queue: câu hỏi mới không được cắt lời giải thích/khen vừa đọc
    if (G.state === 'playing' && m.q) Voice.say(m.q.speech, { queue: true });
  }

  function lowestOf(list) {
    let t = list[0];
    for (let i = 1; i < list.length; i++) if (list[i].y > t.y) t = list[i];
    return t;
  }

  /* ================= THẺ TRẢ LỜI (HUD) ================= */
  function renderAnswerCard(pop) {
    const t = liveMeteors().find(function (m) { return m.id === G.targetId; }) || null;
    let html;
    if (!t || !t.q || G.state === 'over') {
      html = G.state === 'playing' ? 'Sẵn sàng…' : '…';
    } else {
      const typed = G.typed;
      const slot = (t.hint ? ghostSlot(typed, String(t.q.answer)) : '<span class="typed' + (typed ? '' : ' empty') + '">' + esc(typed || '?') + '</span>') +
        '<span class="caret"></span>';
      html = esc(t.q.text).replace('?', slot)
        .replace(' × ', ' <span class="op">×</span> ').replace(' : ', ' <span class="op">:</span> ');
      if (t.q.review) html = '<span class="review-tag">📝 Ôn lại</span>' + html;
    }
    const key = html;
    if (key === G.cardKey && !pop) return;
    G.cardKey = key;
    ui.answer.innerHTML = html;
    if (pop) {
      ui.answer.classList.remove('ok', 'shake', 'pop');
      void ui.answer.offsetWidth;
      ui.answer.classList.add('pop');
    }
    if (ui.fireBtn) ui.fireBtn.classList.toggle('ready', !!G.typed);
  }

  /** Đáp án đã lộ: hiện số mờ để bé gõ theo; gõ đúng thì chữ số xanh, gõ sai thì đỏ. */
  function ghostSlot(typed, ans) {
    if (!typed) return '<span class="typed ghost">' + esc(ans) + '</span>';
    let h = '';
    for (let i = 0; i < typed.length; i++) {
      const ok = typed.charAt(i) === ans.charAt(i);
      h += '<i class="' + (ok ? 'good' : 'bad') + '">' + esc(typed.charAt(i)) + '</i>';
    }
    if (typed.length < ans.length) h += '<i class="rest">' + esc(ans.slice(typed.length)) + '</i>';
    return '<span class="typed">' + h + '</span>';
  }

  function showHint(text, kind, ms) {
    const el = ui.hint;
    el.textContent = text;
    el.className = 'hint ' + (kind || '');
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
    clearTimeout(showHint._t);
    ms = ms == null ? 2400 : ms;
    if (ms > 0 && ms < 1e9) showHint._t = setTimeout(function () { el.classList.add('gone'); updateSpawnY(); }, ms);
    updateSpawnY();
  }
  /** Ẩn ô nhắc nhưng vẫn giữ chỗ (thiên thạch không rơi vào vùng chữ). */
  function hideHint() {
    clearTimeout(showHint._t);
    ui.hint.className = 'hint gone';
    ui.hint.textContent = '';
    updateSpawnY();
  }

  /** Băng-rôn "Đợt N!" là phần tử DOM (không vẽ lên canvas nữa) để không đè lên nhãn thiên thạch. */
  function showStageBanner(n) {
    const el = ui.stageBanner;
    if (!el) return;
    el.textContent = 'Đợt ' + n + '! Thiên thạch rơi nhanh hơn!';
    el.style.left = Math.round(G.field.x + G.field.w / 2) + 'px';
    el.style.top = Math.round(G.field.y + G.field.h * 0.4) + 'px';
    el.hidden = false;
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
    clearTimeout(showStageBanner._t);
    showStageBanner._t = setTimeout(function () { el.hidden = true; }, 1700);
  }
  function hideStageBanner() {
    clearTimeout(showStageBanner._t);
    if (ui.stageBanner) ui.stageBanner.hidden = true;
  }

  function cardFx(cls) {
    ui.answer.classList.remove('ok', 'shake', 'pop');
    void ui.answer.offsetWidth;
    ui.answer.classList.add(cls);
    clearTimeout(cardFx._t);
    cardFx._t = setTimeout(function () { ui.answer.classList.remove('ok', 'shake'); }, 600);
  }

  /* ================= GÕ SỐ & BẮN ================= */
  function maxDigits() { return G.level && G.level.maxDigits ? G.level.maxDigits : 3; }

  function typeDigit(d) {
    if (G.state !== 'playing') return;
    if (G.typed.length >= maxDigits()) {
      Sfx.play('del');
      cardFx('shake');
      showHint('Đáp án chỉ có ' + maxDigits() + ' chữ số thôi', 'info', 1200);
      return;
    }
    if (G.typed === '0') G.typed = '';
    G.typed += d;
    Sfx.play('key');
    renderAnswerCard(false);
  }

  function delDigit() {
    if (G.state !== 'playing') return;
    if (!G.typed) return;
    G.typed = G.typed.slice(0, -1);
    Sfx.play('del');
    renderAnswerCard(false);
  }

  function pressFx(key) {
    const b = ui.numpad.querySelector('[data-key="' + key + '"]');
    if (!b) return;
    b.classList.add('pressed');
    setTimeout(function () { b.classList.remove('pressed'); }, 110);
  }

  function fire() {
    if (G.state !== 'playing') return;
    if (!G.typed) {
      cardFx('shake');
      showHint('Gõ đáp án trước rồi mới bắn nhé!', 'info', 1500);
      Sfx.play('del');
      return;
    }
    const val = Number(G.typed);
    const target = getTarget();
    if (!target) {
      cardFx('shake');
      showHint('Chưa có thiên thạch nào, đợi chút nhé!', 'info', 1200);
      Sfx.play('del');
      return;                                   // giữ nguyên số đã gõ
    }
    let hit = null;
    if (target && target.q && target.q.answer === val) hit = target;
    else {
      const cands = liveMeteors().filter(function (m) { return m.q && m.q.answer === val; });
      if (cands.length) hit = lowestOf(cands);
    }
    G.typed = '';
    if (hit) onHit(hit); else onWrong(target, val);
    renderAnswerCard(false);
  }

  function multiplier() { return 1 + Math.min(3, Math.floor(G.streak / 3)); }

  /** Hiện đáp án trên thiên thạch: to hơn, rơi chậm lại, đọc lời giải thích đầy đủ. */
  function revealAnswer(m) {
    if (!m || !m.q || m.hint) return;
    m.hint = true;
    m.r = Math.max(m.r, radiusFor(m.q.full) * 1.15);
    m.sprite = null;                             // đá to lên: dựng lại ảnh
    m.vy *= 0.6;
    G.holdUntil = Math.max(G.holdUntil, G.time + 1.2);
    showHint('Đáp án: ' + m.q.full + ' – gõ theo nhé!', 'info', 1e9);
    Voice.say(T.speakEq(T.explainFor(m.q)));
    Sfx.play('hint');
    renderAnswerCard(true);
  }

  /** 💡 Gợi ý theo yêu cầu: lần 1 mách cách nghĩ (mất thưởng nhanh, điểm giảm nửa), lần 2 hiện đáp án. */
  function askHint() {
    if (G.state !== 'playing') return;
    const t = getTarget();
    if (!t || !t.q) {
      cardFx('shake');
      showHint('Chưa có thiên thạch nào, đợi chút nhé!', 'info', 1200);
      Sfx.play('del');
      return;
    }
    if (t.hint) {                                // đã lộ đáp án: đọc lại cho bé nghe
      showHint('Đáp án: ' + t.q.full + ' – gõ theo nhé!', 'info', 1e9);
      Voice.say(T.speakEq(T.explainFor(t.q)));
      return;
    }
    if (!t.asked) {
      t.asked = true;
      G.asked++;
      const tip = T.hintFor(t.q);
      Sfx.play('hint');
      showHint('💡 ' + tip, 'info', 4500);
      Voice.say(T.speakEq(tip));
      addText('💡', t.x, t.y - t.r * 1.15, { color: '#ffe066', size: G.baseR * 0.8, life: 1.0, vy: -20 });
      G.holdUntil = Math.max(G.holdUntil, G.time + 1.2);
      return;
    }
    revealAnswer(t);
  }

  function noteReview(q) {
    if (!q) return;
    if (G.review.some(function (r) { return r.full === q.full; })) return;
    if (G.review.length >= 8) return;
    G.review.push({ text: q.text, answer: q.answer, full: q.full, speechFull: q.speechFull, kind: q.kind, table: q.table });
  }

  /** Dữ liệu tối thiểu để dựng lại câu hỏi khi ôn lại. */
  function infoOf(q) { return { kind: q.kind, label: q.label, text: q.text, answer: q.answer, table: q.table }; }
  /** Chủ đề thống kê: bảng nhân/chia (t2…t9) hoặc kiểu câu (find, big). */
  function topicOf(q) { return q.table ? 't' + q.table : q.kind; }
  function bumpKey(k, ok) {
    const t = G.byTopic[k] || { c: 0, w: 0 };
    if (ok) t.c++; else t.w++;
    G.byTopic[k] = t;
  }
  function bumpTopic(q, ok) {
    const k = topicOf(q);
    bumpKey(k, ok);
    // Màn thử thách (c1…c7) có sổ riêng: báo cáo không được "mượn" số liệu của các bảng nó trộn vào
    if (G.level && G.level.id !== k) bumpKey(G.level.id, ok);
  }

  function fireLaser(m) {
    G.lasers.push({ x0: G.cannon.x, y0: G.cannon.y, x1: m.x, y1: m.y, life: 0.2, max: 0.2 });
    G.cannon.angle = Math.atan2(m.y - G.cannon.y, m.x - G.cannon.x);
    G.cannon.recoil = 1;
    Sfx.play('laser');
  }

  function destroyMeteor(m, big) {
    if (m.dead || m.popping > 0) return;
    m.popping = POP_T;
    spawnExplosion(m.x, m.y, m.r, big);
    if (m.kind === 'heart') spawnHeartBurst(m.x, m.y, m.r);
    if (G.state !== 'playing') return;           // ở menu: chỉ có hiệu ứng hình, không tiếng, không rung
    Sfx.play('explode');
    if (!Motion.lite) G.shake = Math.max(G.shake, big ? 0.7 : 0.3);
  }

  function onHit(m) {
    const q = m.q;
    fireLaser(m);
    destroyMeteor(m, false);
    G.correct++;
    let pts;
    if (m.hint) {
      // Nhìn đáp án rồi gõ theo: vẫn được điểm nhỏ nhưng KHÔNG tính là câu tự làm được
      G.hinted++;
      pts = HINT_POINTS;
      hideHint();
      addText('Nhớ nhé: ' + q.full, m.x, m.y + m.r * 1.4, { color: '#ffe066', size: G.baseR * 0.7, life: 1.6, vy: -20 });
      showHint(q.full + ' – nhớ nhé!', 'ok', 2000);
      Sfx.play('correct');
      Voice.say('Nhớ nhé: ' + q.speechFull);
    } else {
      G.solved++;
      if (!m.asked) Store.noteOk(q.text);        // cần gợi ý mới làm được thì vẫn để câu này trong sổ ôn lại
      bumpTopic(q, true);
      G.streak++;
      if (G.streak > G.bestStreak) G.bestStreak = G.streak;
      const age = G.time - (m.targetedAt != null ? m.targetedAt : m.born);
      const mult = multiplier();
      const speedBonus = m.asked ? 0 : age < 4 ? 50 : age < 8 ? 25 : 0;   // đã xin gợi ý thì không còn thưởng nhanh
      pts = m.asked ? 50 * mult : 100 * mult + speedBonus;
      const praise = G.streak > 0 && G.streak % 3 === 0 && mult > 1 ? 'Combo x' + mult + '!' : pick(PRAISE);
      const py = m.y < G.spawnY + m.r * 2.5 ? m.y + m.r * 1.3 : m.y - m.r * 1.3;
      addText(praise, m.x, py, { color: praise.indexOf('Combo') === 0 ? '#ff9f1c' : '#7bf1a8', size: G.baseR * 1.0, life: 1.2, vy: py > m.y ? 20 : -25 });
      if (speedBonus > 0) addText('⚡ nhanh +' + speedBonus, m.x, m.y + m.r * 0.9, { color: '#9af0ff', size: G.baseR * 0.6, life: 1.1, vy: 18 });
      if (praise.indexOf('Combo') === 0) { Sfx.play('combo'); Voice.say('Combo nhân ' + mult + '!'); }
      else { Sfx.play('correct'); Voice.say(praise); }
      showHint(q.full + ' ✓', 'ok', 1600);
    }
    G.score += pts;
    G.cheer = 1;                                 // hoa trên hành tinh reo lên một nhịp
    addText('+' + pts, m.x, m.y - m.r * 0.3, { color: '#ffe066', size: G.baseR * 0.95, life: 1.0 });
    cardFx('ok');
    if (!Motion.lite) G.flash = { c: '120,255,180', a: 0.16 };

    if (m.kind === 'heart') {
      if (G.shields < MAX_SHIELDS) {
        G.shields++;
        addText('+1 🛡️', m.x, m.y + m.r, { color: '#9af0ff', size: G.baseR * 0.9, life: 1.2 });
        Sfx.play('shield');
        Voice.say('Hồi một khiên!', { queue: true });
        const spans = ui.shields.children;
        const el = spans[G.shields - 1];
        if (el) { el.classList.remove('gain'); void el.offsetWidth; el.classList.add('gain'); }
      } else {
        G.score += 50;
        addText('+50', m.x, m.y + m.r, { color: '#ffe066', size: G.baseR * 0.8, life: 1.0 });
      }
    }

    const newStage = 1 + Math.floor(G.solved / 5);
    if (newStage > G.stage) {
      G.stage = newStage;
      showStageBanner(G.stage);
      Voice.say('Đợt ' + G.stage, { queue: true });
      Sfx.play('stage');
    }
    G.nextSpawnAt = G.time + 0.6;
  }

  function onWrong(target, val) {
    cardFx('shake');
    if (!Motion.lite) G.flash = { c: '255,60,90', a: 0.28 };
    Sfx.play('wrong');
    if (!target || !target.q) return;
    G.wrong++;                                   // số lần gõ sai (mọi lần thử)
    G.attemptsWrong++;
    G.streak = 0;
    target.wrongs++;
    if (!target.missed) {                        // mỗi câu chỉ tính "sai" một lần
      target.missed = true;
      G.missed++;
      bumpTopic(target.q, false);
      Store.noteMissed(target.q.text, infoOf(target.q));
    }
    addText('✗ ' + val, target.x, target.y - target.r * 1.3, { color: '#ff5c7a', size: G.baseR * 0.95, life: 1.0 });
    noteReview(target.q);
    if (target.wrongs >= 2 || target.hint || target.asked) {
      // Sai hai lần: hiện đáp án kèm lời giải thích, thiên thạch to hơn và rơi chậm lại
      if (target.hint) { showHint('Đáp án: ' + target.q.full + ' – gõ theo nhé!', 'info', 1e9); Voice.say(T.speakEq(T.explainFor(target.q))); }
      else revealAnswer(target);
    } else {
      // Sai lần đầu: mách cách nghĩ (chưa lộ đáp án) để bé tự tính lại
      const tip = T.hintFor(target.q);
      showHint('Chưa đúng. ' + tip, 'bad', 3200);
      Voice.say('Chưa đúng rồi. ' + T.speakEq(tip));
      G.holdUntil = Math.max(G.holdUntil, G.time + 0.8);
    }
  }

  function loseShield() {
    G.shields = Math.max(0, G.shields - 1);
    ui.shields.classList.remove('hit');
    void ui.shields.offsetWidth;
    ui.shields.classList.add('hit');
    if (G.shields <= 0) endGame('nolife');
  }

  function onShieldHit(m) {
    destroyMeteor(m, true);
    G.shieldFlash = 1;
    if (G.state !== 'playing') return;
    if (m.kind === 'heart') {
      addText('Tiếc quá!', m.x, m.y - m.r, { color: '#ffc2d1', size: G.baseR * 0.8, life: 1.0 });
      if (m.id === G.targetId) { G.typed = ''; }
      return;
    }
    if (!Motion.lite) { G.shake = 1; G.flash = { c: '255,255,255', a: 0.7 }; }
    Sfx.play('shieldhit');
    G.wrong++;
    G.streak = 0;
    if (m.q && !m.missed) {
      m.missed = true;
      G.missed++;
      bumpTopic(m.q, false);
      Store.noteMissed(m.q.text, infoOf(m.q));
    }
    addText('BÙM!', m.x, m.y - m.r, { color: '#ffb703', size: G.baseR * 1.4, life: 1.2 });
    if (m.hint) hideHint();
    showHint('Ối! ' + T.explainFor(m.q), 'bad', 3200);
    Voice.say('Ối! ' + T.speakEq(T.explainFor(m.q)));
    G.holdUntil = G.time + 1.8;                  // để bé kịp nghe lời giải thích
    noteReview(m.q);
    if (m.id === G.targetId) { G.typed = ''; }
    loseShield();
  }

  /* ================= CẬP NHẬT ================= */
  function updateMeteors(dt) {
    const f = G.field, P = G.planet, arr = G.meteors;
    let w = 0;
    for (let i = 0; i < arr.length; i++) {
      const m = arr[i];
      if (m.dead) continue;
      if (m.popping > 0) {
        m.popping -= dt;
        m.scale = Math.max(0.01, m.popping / POP_T);
        if (m.popping <= 0) { m.dead = true; continue; }
        arr[w++] = m;
        continue;
      }
      m.spawnT = Math.min(1, m.spawnT + dt * 2.2);
      m.y += m.vy * dt;
      m.x += m.vx * dt;
      m.rot += m.vr * dt;
      const pad = edgePad(m.r);                  // giữ cả vòng sáng mục tiêu trong sân, không bị cắt ở mép
      if (m.x < f.x + pad) { m.x = f.x + pad; m.vx = Math.abs(m.vx); }
      if (m.x > f.x + f.w - pad) { m.x = f.x + f.w - pad; m.vx = -Math.abs(m.vx); }
      const dx = m.x - P.cx, dy = m.y - P.cy;
      if (Math.sqrt(dx * dx + dy * dy) <= G.shieldR + m.r * 0.55) {
        onShieldHit(m);
        arr[w++] = m;
        continue;
      }
      if (m.y > G.H + m.r * 3) { m.dead = true; continue; }
      arr[w++] = m;
    }
    arr.length = w;
  }

  function updateLasers(dt) {
    const arr = G.lasers;
    let w = 0;
    for (let i = 0; i < arr.length; i++) {
      const l = arr[i];
      l.life -= dt;
      if (l.life > 0) arr[w++] = l;
    }
    arr.length = w;
    if (G.cannon.recoil > 0) G.cannon.recoil = Math.max(0, G.cannon.recoil - dt * 5);
  }

  function updateParts(dt) {
    const g = 700, arr = G.parts;
    let w = 0;
    for (let i = 0; i < arr.length; i++) {
      const p = arr[i];
      p.life -= dt;
      if (p.life <= 0) continue;
      if (p.kind === 'spark' || p.kind === 'heart' || p.kind === 'rock') {
        p.vy += g * (p.kind === 'heart' ? 0.4 : p.kind === 'spark' ? 0.6 : 1) * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.kind === 'rock') p.rot += p.vr * dt;
      } else if (p.kind === 'puff') {
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.size += p.grow * dt;
      } else if (p.kind === 'confetti') {
        p.sway += dt * 4;
        p.x += (p.vx + Math.sin(p.sway) * 60) * dt; p.y += p.vy * dt;
        p.rot += p.vr * dt;
        if (p.y > G.H + 20) continue;
      }
      arr[w++] = p;
    }
    arr.length = w;
  }

  function updateTexts(dt) {
    const arr = G.texts;
    let w = 0;
    for (let i = 0; i < arr.length; i++) {
      const t = arr[i];
      t.life -= dt; t.t += dt;
      if (t.life <= 0) continue;
      t.y += t.vy * dt;
      arr[w++] = t;
    }
    arr.length = w;
  }

  function updatePlaying(dt) {
    G.time += dt;
    G.timeLeft -= dt;
    if (G.timeLeft <= 0) { G.timeLeft = 0; endGame('timeup'); return; }
    if (G.timeLeft <= 10) {
      const s = Math.ceil(G.timeLeft);
      if (s !== G.lastWarnSec) { G.lastWarnSec = s; Sfx.play('warn'); }
      if (!G.hurry) { G.hurry = true; Music.setTempo(1.15); }
    }
    updateMeteors(dt);
    if (G.state !== 'playing') return;
    const hold = G.time < G.holdUntil;           // đang chờ bé nghe xong lời giải thích
    const live = liveMeteors();
    if (!hold) {
      if (live.length === 0) {
        if (G.time >= G.nextSpawnAt) spawnForQuestion();
      } else if (live.length < meteorCap() && G.time - G.lastSpawn >= spawnGap()) {
        spawnForQuestion();
      }
    }
    const keeps = live.some(function (m) { return m.id === G.targetId; });
    const t = (!hold || keeps) ? getTarget() : null;
    if (t) {
      const want = Math.atan2(t.y - G.cannon.y, t.x - G.cannon.x);
      let d = want - G.cannon.angle;
      while (d > Math.PI) d -= TAU;
      while (d < -Math.PI) d += TAU;
      G.cannon.angle += d * Math.min(1, dt * 8);
    }
  }

  function updateAttract(dt) {
    G.attractT -= dt;
    const live = liveMeteors();
    if (G.attractT <= 0 && live.length < (Motion.lite ? 1 : 3)) {
      G.attractT = 2.2 + Math.random() * 2.5;
      spawnMeteor(null, 'rock', 1.6);
    }
    updateMeteors(dt);
  }

  function update(dt) {
    G.anim += dt;
    if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 2.2);
    if (G.flash) { G.flash.a -= dt * 1.6; if (G.flash.a <= 0) G.flash = null; }
    if (G.shieldFlash > 0) G.shieldFlash = Math.max(0, G.shieldFlash - dt * 2.5);
    if (G.cheer > 0) G.cheer = Math.max(0, G.cheer - dt * 1.6);

    if (G.state === 'playing') updatePlaying(dt);
    else if (G.state === 'menu' || G.state === 'levels' || G.state === 'tables') updateAttract(dt);
    else if (G.state === 'over' || G.state === 'countdown') updateMeteors(dt);

    if (G.state !== 'paused') {
      updateLasers(dt);
      updateParts(dt);
      updateTexts(dt);
    }
    if (G.state === 'over' && !G.resultShown && G.anim >= G.overAt) showResults();
    syncHud();
  }

  /* ================= VẼ ================= */
  const STAR_ALPHA = [];
  for (let i = 0; i < 32; i++) STAR_ALPHA.push('rgba(255,255,255,' + (0.45 + 0.55 * i / 31).toFixed(2) + ')');

  function drawStars(c) {
    for (let i = 0; i < G.stars.length; i++) {
      const s = G.stars[i];
      const k = (0.5 + 0.5 * Math.sin(G.anim * s.sp + s.ph)) * 31;
      c.fillStyle = STAR_ALPHA[k < 0 ? 0 : k > 31 ? 31 : k | 0];
      c.beginPath(); c.arc(s.x, s.y, s.r, 0, TAU); c.fill();
    }
  }

  /** Ba bông hoa trên hành tinh: đung đưa nhè nhẹ, reo lên một nhịp khi bé bắn trúng. */
  function drawFlowers(c) {
    const arr = G.flowers;
    for (let i = 0; i < arr.length; i++) {
      const f = arr[i];
      const base = f.y + f.s * 2.2;              // gốc thân hoa nằm trên mặt đất
      let ang = 0;
      if (!Motion.lite) ang = Math.sin(G.anim * 2.5 + i * 1.7) * 0.07 + G.cheer * Math.sin(G.anim * 15 + i) * 0.13;
      c.save();
      c.translate(f.x, base);
      c.rotate(ang);
      c.translate(-f.x, -base);
      flower(c, f.x, f.y, f.s, f.color);
      c.restore();
    }
  }

  function drawShield(c) {
    const P = G.planet;
    if (inGame() && G.shields <= 0) return;
    const n = inGame() ? G.shields : 3;
    const col = n >= 3 ? '120,230,255' : n === 2 ? '255,214,102' : '255,90,120';
    const pulse = n === 1 ? 0.5 + 0.5 * Math.sin(G.anim * 6) : 0.5 + 0.5 * Math.sin(G.anim * 2);
    const base = 0.55 + 0.25 * pulse + G.shieldFlash * 0.5;
    c.save();
    c.lineCap = 'round';
    c.strokeStyle = 'rgba(' + col + ',' + (0.16 + G.shieldFlash * 0.3).toFixed(2) + ')';
    c.lineWidth = 22;
    c.beginPath(); c.arc(P.cx, P.cy, G.shieldR, 0, TAU); c.stroke();
    c.strokeStyle = 'rgba(' + col + ',' + Math.min(1, base).toFixed(2) + ')';
    c.lineWidth = 5;
    c.beginPath(); c.arc(P.cx, P.cy, G.shieldR, 0, TAU); c.stroke();
    // Vạch chạy dọc khiên
    c.strokeStyle = 'rgba(255,255,255,' + (0.35 + G.shieldFlash * 0.5).toFixed(2) + ')';
    c.lineWidth = 3;
    const span = Math.asin(Math.min(1, (G.field.w * 0.55) / G.shieldR));
    const off = (G.anim * 0.6) % (TAU / 24);
    for (let a = -Math.PI / 2 - span; a < -Math.PI / 2 + span; a += TAU / 24) {
      const a0 = a + off, a1 = a0 + TAU / 60;
      c.beginPath(); c.arc(P.cx, P.cy, G.shieldR, a0, a1); c.stroke();
    }
    c.restore();
  }

  function drawCannon(c) {
    const k = G.cannon;
    const r0 = clamp(G.baseR * 0.55, 18, 36);
    c.save();
    c.translate(k.x, k.y);
    // Bệ pháo
    c.fillStyle = '#1e9a8e';
    c.beginPath(); c.arc(0, 4, r0 * 1.25, Math.PI, TAU); c.fill();
    c.fillStyle = '#2ec4b6';
    c.beginPath(); c.arc(0, 2, r0, Math.PI, TAU); c.fill();
    // Nòng pháo
    c.rotate(k.angle);
    const rec = k.recoil * r0 * 0.5;
    c.fillStyle = '#5b5f7a';
    c.fillRect(-rec, -r0 * 0.36, r0 * 1.7, r0 * 0.72);
    c.fillStyle = '#9aa2c2';
    c.fillRect(-rec, -r0 * 0.36, r0 * 1.7, r0 * 0.22);
    c.fillStyle = '#ffd166';
    c.beginPath(); c.arc(r0 * 1.7 - rec, 0, r0 * 0.42, 0, TAU); c.fill();
    c.fillStyle = '#ff6b35';
    c.beginPath(); c.arc(r0 * 1.7 - rec, 0, r0 * 0.2, 0, TAU); c.fill();
    c.rotate(-k.angle);
    // Vòm kính
    c.fillStyle = 'rgba(200,245,255,0.55)';
    c.beginPath(); c.arc(0, 2, r0 * 0.62, Math.PI, TAU); c.fill();
    c.restore();
  }

  const FLAME = { outer: null, inner: null };
  /** Dải màu đuôi lửa vẽ trong hệ tọa độ chuẩn hóa (dài 1) rồi phóng to theo L:
      chỉ tạo hai dải màu một lần cho cả ván thay vì hai dải mỗi thiên thạch mỗi khung hình. */
  function flameGrads(c) {
    if (FLAME.outer) return;
    const g = c.createLinearGradient(0, 0, 0, -1);
    g.addColorStop(0, 'rgba(255,120,0,0.85)');
    g.addColorStop(0.5, 'rgba(255,190,40,0.5)');
    g.addColorStop(1, 'rgba(255,240,150,0)');
    FLAME.outer = g;
    const g2 = c.createLinearGradient(0, 0, 0, -0.6);
    g2.addColorStop(0, 'rgba(255,245,180,0.9)');
    g2.addColorStop(1, 'rgba(255,220,80,0)');
    FLAME.inner = g2;
  }

  function drawFlame(c, m) {
    const r = m.r * m.scale;
    const ang = Math.atan2(-m.vy, -m.vx);
    flameGrads(c);
    c.save();
    c.translate(m.x, m.y);
    c.rotate(ang + Math.PI / 2);
    const fl = 1 + 0.25 * Math.sin(G.anim * 23 + m.id);
    const L = r * (1.7 + 0.5 * fl);
    c.scale(L, L);
    const k = r / L;                             // bán kính đá quy về hệ tọa độ đã chuẩn hóa
    c.fillStyle = FLAME.outer;
    c.beginPath();
    c.moveTo(-k * 0.78, 0);
    c.quadraticCurveTo(-k * 0.5, -0.55, 0, -1);
    c.quadraticCurveTo(k * 0.5, -0.55, k * 0.78, 0);
    c.closePath();
    c.fill();
    c.fillStyle = FLAME.inner;
    c.beginPath();
    c.moveTo(-k * 0.42, 0);
    c.quadraticCurveTo(-k * 0.2, -0.35, 0, -0.6);
    c.quadraticCurveTo(k * 0.2, -0.35, k * 0.42, 0);
    c.closePath();
    c.fill();
    c.restore();
  }

  function heartPath(c, x, y, r) {
    c.beginPath();
    c.moveTo(x, y + r * 0.95);
    c.bezierCurveTo(x - r * 1.5, y - r * 0.1, x - r * 0.9, y - r * 1.2, x, y - r * 0.45);
    c.bezierCurveTo(x + r * 0.9, y - r * 1.2, x + r * 1.5, y - r * 0.1, x, y + r * 0.95);
    c.closePath();
  }

  /* Cỡ chữ và bề rộng nhãn tính một lần cho mỗi (chữ, bán kính): đo chữ là việc tốn kém,
     không cần lặp lại 60 lần mỗi giây khi thiên thạch chỉ rơi xuống. */
  const LABEL_CACHE = {};
  let labelCacheN = 0;
  function clearLabelCache() { for (const k in LABEL_CACHE) delete LABEL_CACHE[k]; labelCacheN = 0; }
  function labelSize(c, s, r, mul) {
    const key = s + '|' + Math.round(r) + '|' + (mul || 0);
    const hit = LABEL_CACHE[key];
    if (hit) return hit;
    // Màn hẹp (điện thoại): nhãn dài vẫn phải to, đừng thu nhỏ quá
    let size = r * (mul || (s.length <= 3 ? 0.9 : s.length <= 5 ? 0.66 : (G.field.w < 600 ? 0.56 : 0.52)));
    c.font = '800 ' + Math.round(size) + 'px ' + FONT;
    const w0 = c.measureText(s).width;
    const maxW = r * 2.1;
    if (w0 > maxW) size = size * maxW / w0;
    size = Math.max(size, Math.min(24, r * 0.55));       // luôn đủ lớn để bé đọc được
    size = Math.round(size);
    c.font = '800 ' + size + 'px ' + FONT;
    const out = { size: size, w: c.measureText(s).width, font: '800 ' + size + 'px ' + FONT };
    if (labelCacheN > 400) clearLabelCache();
    LABEL_CACHE[key] = out;
    labelCacheN++;
    return out;
  }

  function drawLabel(c, text, x, y, r, color, mul) {
    const s = String(text);
    const lm = labelSize(c, s, r, mul);
    const size = lm.size, w = lm.w;
    c.font = lm.font;
    G.lastLabelPx = size;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineJoin = 'round';
    if (w > r * 1.9) {                                    // chữ tràn ra ngoài đá: nền tối cho dễ đọc
      const pw = w + size * 0.5, ph = size * 1.25, rad = size * 0.6;
      c.fillStyle = 'rgba(15,10,30,0.8)';
      c.beginPath();
      if (c.roundRect) c.roundRect(x - pw / 2, y - ph / 2 + size * 0.05, pw, ph, rad);
      else c.rect(x - pw / 2, y - ph / 2 + size * 0.05, pw, ph);
      c.fill();
    }
    c.lineWidth = Math.max(3, size * 0.18);
    c.strokeStyle = 'rgba(15,10,30,0.92)';
    c.strokeText(s, x, y + size * 0.05);
    c.fillStyle = color || '#fff';
    c.fillText(s, x, y + size * 0.05);
  }

  /** Vẽ thân đá quanh gốc tọa độ (dùng để dựng ảnh sẵn, không gọi mỗi khung hình). */
  function paintRock(c, m, r) {
    const g = c.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
    g.addColorStop(0, '#c4ae95');
    g.addColorStop(0.55, '#7a5f4b');
    g.addColorStop(1, '#3e2d22');
    c.fillStyle = g;
    c.beginPath();
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * TAU;
      const rr = r * (0.94 + 0.08 * Math.sin(i * 2.3 + m.id));
      if (i === 0) c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    c.closePath();
    c.fill();
    c.strokeStyle = '#2a1d15';
    c.lineWidth = Math.max(2, r * 0.07);
    c.stroke();
    for (let i = 0; i < m.craters.length; i++) {
      const k = m.craters[i];
      c.fillStyle = 'rgba(40,25,15,0.45)';
      c.beginPath(); c.arc(k.dx * r, k.dy * r, k.r * r, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,230,200,0.18)';
      c.beginPath(); c.arc(k.dx * r - k.r * r * 0.3, k.dy * r - k.r * r * 0.3, k.r * r * 0.55, 0, TAU); c.fill();
    }
  }

  /** Ảnh viên đá dùng lại; chỉ dựng lại khi bán kính đổi (xoay máy, hiện đáp án). */
  function rockSprite(m) {
    if (m.sprite && m.spriteR === m.r) return m.sprite;
    const S = m.r * 1.2;                         // chừa chỗ cho viền và hố sát mép
    const px = Math.max(8, Math.ceil(S * 2 * G.dpr));
    const cv = m.sprite || document.createElement('canvas');
    if (cv.width !== px || cv.height !== px) { cv.width = px; cv.height = px; }
    const x = cv.getContext('2d');
    const k = px / (S * 2);
    x.setTransform(k, 0, 0, k, 0, 0);
    x.clearRect(0, 0, S * 2, S * 2);
    x.translate(S, S);
    paintRock(x, m, m.r);
    m.sprite = cv;
    m.spriteR = m.r;
    return cv;
  }

  function drawMeteor(c, m) {
    const ease = 1 - (1 - m.spawnT) * (1 - m.spawnT);
    const sc = m.scale * (0.3 + 0.7 * ease);
    const r = m.r * sc;
    if (m.popping <= 0) drawFlame(c, m);
    const isTarget = G.state === 'playing' && m.id === G.targetId && m.popping <= 0;
    if (isTarget) {
      const pr = r * (1.28 + 0.06 * Math.sin(G.anim * 7));
      c.strokeStyle = 'rgba(255,214,102,0.35)';
      c.lineWidth = Math.max(8, r * 0.3);
      c.beginPath(); c.arc(m.x, m.y, pr, 0, TAU); c.stroke();
      c.strokeStyle = m.hint ? 'rgba(154,240,255,0.95)' : 'rgba(255,214,102,0.95)';
      c.lineWidth = Math.max(3, r * 0.1);
      c.setLineDash([r * 0.35, r * 0.2]);
      c.lineDashOffset = -G.anim * 40;
      c.beginPath(); c.arc(m.x, m.y, pr, 0, TAU); c.stroke();
      c.setLineDash([]);
    }
    if (m.kind === 'heart') {
      c.save();
      c.shadowColor = 'rgba(255,120,170,0.9)';
      c.shadowBlur = r * 0.6;
      c.fillStyle = '#ff5c8a';
      heartPath(c, m.x, m.y, r * 1.05);
      c.fill();
      c.shadowBlur = 0;
      c.strokeStyle = '#b0123f';
      c.lineWidth = Math.max(2, r * 0.08);
      c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.35)';
      c.beginPath(); c.ellipse(m.x - r * 0.45, m.y - r * 0.45, r * 0.28, r * 0.18, -0.6, 0, TAU); c.fill();
      c.restore();
    } else {
      const S = m.r * 1.2 * sc;
      c.save();
      c.translate(m.x, m.y);
      c.rotate(m.rot);
      c.drawImage(rockSprite(m), -S, -S, S * 2, S * 2);
      c.restore();
    }
    if (m.q && sc > 0.5) {
      if (m.hint) {
        drawLabel(c, m.q.label, m.x, m.y - r * 0.55, r, '#fff', 0.42);
        drawLabel(c, '= ' + m.q.answer, m.x, m.y + r * 0.25, r, '#ffe066', 0.95);
      } else {
        drawLabel(c, m.q.label, m.x, m.y, r, '#fff');
      }
      if (m.q.review) {
        c.font = Math.round(r * 0.6) + 'px ' + FONT;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText('📝', m.x, m.y - r * 1.25);
      }
    }
  }

  function drawLasers(c) {
    c.lineCap = 'round';
    for (let i = 0; i < G.lasers.length; i++) {
      const l = G.lasers[i];
      const a = l.life / l.max;
      c.strokeStyle = 'rgba(120,230,255,' + (0.35 * a).toFixed(2) + ')';
      c.lineWidth = 14 * a + 4;
      c.beginPath(); c.moveTo(l.x0, l.y0); c.lineTo(l.x1, l.y1); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,' + (0.95 * a).toFixed(2) + ')';
      c.lineWidth = 5 * a + 1;
      c.beginPath(); c.moveTo(l.x0, l.y0); c.lineTo(l.x1, l.y1); c.stroke();
    }
  }

  function drawParts(c, only) {
    for (let i = 0; i < G.parts.length; i++) {
      const p = G.parts[i];
      if (only === 'confetti' ? p.kind !== 'confetti' : p.kind === 'confetti') continue;
      const a = Math.min(1, p.life / p.max * 1.6);
      c.globalAlpha = a;
      c.fillStyle = p.color;
      if (p.kind === 'confetti') {
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.rot);
        c.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        c.restore();
      } else if (p.kind === 'rock') {
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.rot);
        c.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.8);
        c.restore();
      } else if (p.kind === 'heart') {
        c.font = Math.round(p.size * 2) + 'px ' + FONT;
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('♥', p.x, p.y);
      } else {
        c.beginPath(); c.arc(p.x, p.y, p.size, 0, TAU); c.fill();
      }
    }
    c.globalAlpha = 1;
  }

  function drawTexts(c) {
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineJoin = 'round';
    for (let i = 0; i < G.texts.length; i++) {
      const t = G.texts[i];
      const a = Math.min(1, t.life / 0.35);
      let sc = 1;
      if (t.t < 0.12) sc = 0.4 + (t.t / 0.12) * 0.8;
      else if (t.t < 0.24) sc = 1.2 - ((t.t - 0.12) / 0.12) * 0.2;
      c.globalAlpha = a;
      c.font = '800 ' + Math.round(t.size * sc) + 'px ' + FONT;
      c.lineWidth = Math.max(3, t.size * sc * 0.16);
      c.strokeStyle = t.stroke;
      c.strokeText(t.text, t.x, t.y);
      c.fillStyle = t.color;
      c.fillText(t.text, t.x, t.y);
    }
    c.globalAlpha = 1;
  }

  function render() {
    if (!G.bg) return;
    const c = ctx;
    c.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    let sx = 0, sy = 0;
    if (G.shake > 0) {
      const amp = G.shake * G.shake * Math.min(G.W, G.H) * 0.03;
      sx = (Math.random() - 0.5) * 2 * amp;
      sy = (Math.random() - 0.5) * 2 * amp;
      c.translate(sx, sy);
    }
    c.drawImage(G.bg, 0, 0, G.W, G.H);
    drawStars(c);
    drawFlowers(c);
    drawShield(c);
    drawCannon(c);
    for (let i = 0; i < G.meteors.length; i++) if (!G.meteors[i].dead) drawMeteor(c, G.meteors[i]);
    drawLasers(c);
    drawParts(c);
    drawTexts(c);
    if (G.shake > 0) c.translate(-sx, -sy);
    if (G.state === 'playing' && G.shields === 1 && !Motion.lite) {
      const key = G.W + 'x' + G.H;
      if (G.vignetteKey !== key) {                 // dựng lại chỉ khi đổi kích thước (không cấp phát mỗi khung hình)
        G.vignetteKey = key;
        const g = c.createRadialGradient(G.W / 2, G.H / 2, Math.min(G.W, G.H) * 0.45, G.W / 2, G.H / 2, Math.max(G.W, G.H) * 0.75);
        g.addColorStop(0, 'rgba(255,40,80,0)');
        g.addColorStop(1, 'rgba(255,40,80,1)');
        G.vignette = g;
      }
      c.globalAlpha = 0.16 + 0.1 * Math.sin(G.anim * 5);
      c.fillStyle = G.vignette;
      c.fillRect(0, 0, G.W, G.H);
      c.globalAlpha = 1;
    }
    if (G.flash) {
      c.fillStyle = 'rgba(' + G.flash.c + ',' + Math.max(0, G.flash.a).toFixed(2) + ')';
      c.fillRect(0, 0, G.W, G.H);
    }
    renderFx();
  }

  /** Pháo giấy vẽ trên lớp riêng (#fx) để không bị bảng kết quả che. */
  let fxDirty = false;
  function renderFx() {
    if (!fxCtx) return;
    let n = 0;
    for (let i = 0; i < G.parts.length; i++) if (G.parts[i].kind === 'confetti') n++;
    if (!n && !fxDirty) return;
    fxCtx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    fxCtx.clearRect(0, 0, G.W, G.H);
    fxDirty = n > 0;
    if (n) drawParts(fxCtx, 'confetti');
  }

  /* ================= HUD ================= */
  function formatTime(s) {
    s = Math.max(0, Math.ceil(s));
    const m = Math.floor(s / 60), r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  function syncHud() {
    if (!inGame()) return;
    const h = G.hud;
    if (h.score !== G.score) {
      h.score = G.score;
      ui.score.textContent = fmt(G.score);
      ui.score.classList.remove('bump');
      void ui.score.offsetWidth;
      ui.score.classList.add('bump');
    }
    if (h.shields !== G.shields) {
      h.shields = G.shields;
      const spans = ui.shields.children;
      for (let i = 0; i < spans.length; i++) spans[i].classList.toggle('lost', i >= G.shields);
    }
    if (h.stage !== G.stage) { h.stage = G.stage; ui.stage.textContent = 'Đợt ' + G.stage; }
    const live = G.state === 'playing' || G.state === 'over';
    const mult = live ? multiplier() : 1;
    const streak = live ? G.streak : 0;
    if (h.mult !== mult || h.streak !== streak) {
      h.mult = mult; h.streak = streak;
      ui.combo.hidden = streak < 1;
      if (streak >= 1) {
        const k = streak % 3;
        ui.combo.textContent = (G.W < 700 ? 'x' : 'Combo x') + mult + ' 🔥 ' + '●'.repeat(k) + '○'.repeat(2 - k);
        ui.combo.style.animation = 'none';
        void ui.combo.offsetWidth;
        ui.combo.style.animation = '';
      }
    }
    const tt = formatTime(G.timeLeft);
    if (h.time !== tt) {
      h.time = tt;
      ui.time.textContent = tt;
      const frac = clamp(G.timeLeft / G.duration, 0, 1);
      ui.timerFill.style.width = (frac * 100).toFixed(1) + '%';
      ui.timerFill.classList.toggle('warn', G.timeLeft <= 30 && G.timeLeft > 10);
      ui.timerFill.classList.toggle('danger', G.timeLeft <= 10);
      ui.timer.classList.toggle('danger', G.timeLeft <= 10);
    }
  }

  function resetHud() {
    G.hud = { score: -1, shields: -1, stage: -1, mult: -1, streak: -1, time: '' };
    G.cardKey = '';
    ui.combo.hidden = true;
    hideHint();
    ui.answer.innerHTML = 'Sẵn sàng…';
    ui.timerFill.style.width = '100%';
    ui.timerFill.classList.remove('warn', 'danger');
    ui.timer.classList.remove('danger');
    if (ui.fireBtn) ui.fireBtn.classList.remove('ready');
  }

  /* ================= VÒNG ĐỜI VÁN CHƠI ================= */
  function clearWorld() {
    G.meteors.length = 0;
    G.parts.length = 0;
    G.texts.length = 0;
    G.lasers.length = 0;
    G.shake = 0;
    G.flash = null;
    G.shieldFlash = 0;
    G.targetId = 0;
    G.typed = '';
    G.holdUntil = 0;
    hideHint();
    hideStageBanner();
  }

  function startGame(level) {
    clearTimeout(G.cdTimer);
    G.level = level;
    G.mode = level.table ? 'table' : 'challenge';
    G.state = 'countdown';
    G.score = 0; G.shields = MAX_SHIELDS; G.streak = 0; G.bestStreak = 0; G.correct = 0; G.wrong = 0; G.stage = 1;
    G.solved = 0; G.hinted = 0; G.missed = 0; G.attemptsWrong = 0; G.asked = 0; G.byTopic = {}; G.holdUntil = 0; G.spawnN = 0;
    G.timeLeft = G.duration; G.time = 0; G.review = [];
    G.lastSpawn = -99; G.nextSpawnAt = 0; G.overAt = -1; G.lastWarnSec = -1; G.resultShown = false; G.lastEntry = null;
    G.resumeCountdown = false;
    G.cannon.angle = -Math.PI / 2; G.cannon.recoil = 0;
    // Ôn lại thông minh: lấy tối đa 3 câu bé hay sai mà màn này có thể hỏi
    G.reviewQueue = Store.reviewPool(function (info) {
      if (!info || !level.tables || !level.kinds) return false;
      if (level.tables.indexOf(info.table) < 0 || level.kinds.indexOf(info.kind) < 0) return false;
      return !level.table || G.op === 'mix' || info.kind === G.op;
    }).slice(0, 3);
    clearWorld();
    resetHud();
    showHud(true);
    ui.hud.classList.remove('paused');           // chơi lại từ màn Tạm dừng: HUD phải hiện lại đầy đủ
    showScreen('countdown');
    layout();
    syncHud();
    requestWake();
    G.hurry = false;
    Music.setTempo(1);
    Music.setDuck('pause', null);
    Music.play('game');
    Voice.stop();
    runCountdown(function () {
      G.state = 'playing';
      G.nextSpawnAt = G.time + 0.2;
      renderAnswerCard(false);
    });
  }

  function runCountdown(cb) {
    const el = ui.countNum;
    let n = 3;
    const step = function () {
      if (G.state !== 'countdown') return;
      el.style.animation = 'none';
      void el.offsetWidth;
      el.style.animation = '';
      if (n > 0) {
        el.textContent = String(n);
        el.classList.remove('go');
        Sfx.play('tick');
        n--;
        G.cdTimer = setTimeout(step, 850);
      } else {
        el.textContent = 'BẮN!';
        el.classList.add('go');
        Sfx.play('go');
        G.cdTimer = setTimeout(function () {
          if (G.state !== 'countdown') return;
          showScreen(null);
          cb();
        }, 750);
      }
    };
    step();
  }

  function pauseGame() {
    if (G.state !== 'playing' && G.state !== 'countdown') return;
    if (G.state === 'countdown') { clearTimeout(G.cdTimer); G.resumeCountdown = true; }
    G.state = 'paused';
    Voice.stop();
    Music.setDuck('pause', 0.25);
    quietAudio();
    ui.hud.classList.add('paused');
    $('pause-info').textContent = 'Điểm hiện tại: ' + fmt(G.score) + ' · Còn ' + formatTime(G.timeLeft);
    showScreen('pause');
  }

  /** Tạm ngưng bộ đếm nhạc và AudioContext khi không chơi (đỡ tốn pin, không rè tiếng). */
  function quietAudio() {
    try { Music._halt(); } catch (e) { /* bỏ qua */ }
    try { if (Sfx.ctx && Sfx.ctx.state === 'running') Sfx.ctx.suspend(); } catch (e) { /* bỏ qua */ }
  }
  function wakeAudio() {
    try { Sfx.unlock(); } catch (e) { /* bỏ qua */ }
    try { Music._kick(); } catch (e) { /* bỏ qua */ }
  }

  function resumeGame() {
    if (G.state !== 'paused') return;
    ui.hud.classList.remove('paused');
    showScreen(null);
    wakeAudio();
    Music.setDuck('pause', null);
    requestWake();
    if (G.resumeCountdown) {                     // bị ẩn giữa lúc đếm ngược: đếm lại từ đầu
      G.resumeCountdown = false;
      G.state = 'countdown';
      showScreen('countdown');
      runCountdown(function () {
        G.state = 'playing';
        G.nextSpawnAt = G.time + 0.2;
        renderAnswerCard(false);
      });
      return;
    }
    G.state = 'playing';
    const t = getTarget();
    G.holdUntil = G.time + 1;
    if (t && t.q) Voice.say(t.q.speech, { queue: true });
  }

  function endGame(reason) {
    if (G.state !== 'playing') return;
    G.state = 'over';
    G.endReason = reason;
    G.typed = '';
    G.overAt = G.anim + (reason === 'timeup' ? 1.0 : 1.4);
    Music.stop();
    Voice.stop();
    Voice.say(reason === 'timeup' ? 'Hết giờ rồi!' : 'Khiên đã vỡ rồi!');
    const cx = G.field.x + G.field.w / 2, cy = G.field.h * 0.42;
    if (reason === 'timeup') {
      Sfx.play('timeup');
      addText('Hết giờ!', cx, cy, { color: '#fff', stroke: 'rgba(17,138,178,0.95)', size: G.baseR * 1.9, life: 1.6, vy: -15 });
    } else {
      Sfx.play('lose');
      addText('Khiên đã vỡ!', cx, cy, { color: '#fff', stroke: 'rgba(239,71,111,0.95)', size: G.baseR * 1.8, life: 1.8, vy: -15 });
    }
    G.meteors.forEach(function (m) { if (!m.dead && m.popping <= 0) { m.popping = POP_T; spawnExplosion(m.x, m.y, m.r, false); } });
    ui.numpad.classList.add('off');
    G.holdUntil = 0;
    hideHint();
    hideStageBanner();
    renderAnswerCard(false);
  }

  function starThresholds(level, duration) {
    const f = STAR_FACTOR[level.id] || 0.7;
    const d = duration / 90;
    return [1200, 3000, 5000].map(function (v) { return Math.max(100, Math.round(v * f * d / 100) * 100); });
  }

  function starsFor(score, level, duration) {
    const th = starThresholds(level, duration);
    let s = 0;
    for (let i = 0; i < 3; i++) if (score >= th[i]) s = i + 1;
    return s;
  }

  function starsHtml(n) {
    let h = '';
    for (let i = 0; i < 3; i++) h += '<span class="' + (i < n ? 'on' : 'off') + '">★</span>';
    return h;
  }

  function opLabel(op) { return op === 'mul' ? 'Nhân' : op === 'div' ? 'Chia' : 'Nhân & chia'; }

  /** Bảng nên xem lại sau ván: bảng của màn vừa chơi, hoặc bảng bé sai nhiều nhất trong ván. */
  function tableToReview(lvl) {
    if (lvl && lvl.table) return lvl.table;
    const count = {};
    let n = 0, best = 0;
    G.review.forEach(function (r) {
      if (!r.table) return;
      count[r.table] = (count[r.table] || 0) + 1;
      if (count[r.table] > best) { best = count[r.table]; n = r.table; }
    });
    return n || G.tableN || 2;
  }

  function showResults() {
    const lvl = G.level;
    if (!lvl) { G.resultShown = true; goMenu(); return; }        // không có màn: về menu thay vì kẹt
    const score = G.score;
    const stars = starsFor(score, lvl, G.duration);
    let rec = { best: 0, stars: 0, top: [] };
    try { rec = Store.getRecord(lvl, G.op, G.duration); } catch (e) { /* bỏ qua */ }
    const isRecord = score > 0 && score > rec.best;
    const entry = { name: activeName(), score: score, date: Date.now() };
    const top = rec.top.slice();
    let qualifies = false;
    if (score > 0) {
      top.push(entry);
      top.sort(function (a, b) { return b.score - a.score; });
      const idx = top.indexOf(entry);
      if (idx < 5) qualifies = true; else top.splice(idx, 1);
      while (top.length > 5) top.pop();
    }
    G.lastEntry = qualifies ? entry : null;

    // Vẽ màn kết quả TRƯỚC, ghi dữ liệu sau: lỗi lưu trữ không được làm bé kẹt lại
    ui.resultTitle.textContent = G.endReason === 'timeup' ? '⏰ Hết giờ!' : '💥 Khiên đã vỡ!';
    ui.resultTitle.className = 'result-title ' + (G.endReason === 'timeup' ? 'timeup' : 'nolife');
    ui.resultLevel.textContent = lvl.icon + ' ' + lvl.title + (lvl.table ? ' · ' + opLabel(G.op) : '') + ' · ' + formatTime(G.duration);
    ui.resultScore.textContent = fmt(score);
    ui.resultStars.innerHTML = starsHtml(stars);
    ui.resultRecord.hidden = !isRecord;
    ui.stCorrect.textContent = G.solved;
    ui.stWrong.textContent = G.missed;
    ui.stCombo.textContent = G.bestStreak;
    if (ui.stCorrectSub) {
      const sub = [];
      if (G.hinted) sub.push('+' + G.hinted + ' nhìn đáp án');
      if (G.asked) sub.push(G.asked + ' lần 💡');
      ui.stCorrectSub.hidden = sub.length === 0;
      ui.stCorrectSub.textContent = sub.join(' · ');
    }
    if (ui.stWrongSub) {
      ui.stWrongSub.hidden = G.attemptsWrong === 0;
      ui.stWrongSub.textContent = G.attemptsWrong ? 'thử sai ' + G.attemptsWrong + ' lần' : '';
    }
    const total = G.solved + G.missed;
    ui.stAcc.textContent = total ? Math.round(G.solved / total * 100) + '%' : '–';

    ui.review.hidden = !G.review.length;
    ui.reviewChips.innerHTML = G.review.map(function (r, i) {
      return '<button type="button" class="chip" data-i="' + i + '">🔊 ' + esc(r.text).replace('?', '<b>' + esc(r.answer) + '</b>') + '</button>';
    }).join('');
    if (ui.reviewPerfect) ui.reviewPerfect.hidden = !(G.review.length === 0 && G.solved > 0);
    // Hết khiên hoặc còn câu sai: mời bé xem lại bảng cửu chương rồi thử lại (không bắt về menu)
    G.tableN = tableToReview(lvl);
    if (ui.resultTables) {
      const offer = G.endReason === 'nolife' || G.review.length > 0;
      ui.resultTables.hidden = !offer;
      ui.resultTables.textContent = '📖 Xem bảng ' + G.tableN;
    }
    renderLeader(top, G.lastEntry);

    G.resultShown = true;
    ui.hud.classList.add('hidden');
    showScreen('gameover');

    try {
      Store.setRecord(lvl, G.op, G.duration, { best: Math.max(rec.best, score), stars: Math.max(rec.stars, stars), top: top });
      Store.addStats({ correct: G.solved, wrong: G.missed, seconds: G.duration - G.timeLeft }, G.byTopic);
    } catch (e) { /* bỏ qua: không lưu được cũng không được làm hỏng màn kết quả */ }

    if (isRecord) { Sfx.play('record'); Sfx.play('applause'); spawnConfetti(140); Voice.say('Kỷ lục mới! Giỏi quá!', { queue: true }); }
    else if (stars >= 2) { Sfx.play('applause'); spawnConfetti(70); Voice.say('Chơi tốt lắm!', { queue: true }); }
    if (G.endReason === 'nolife' && total > 0 && G.solved / total < 0.5) {
      const msg = 'Ôn bảng ' + G.tableN + ' một chút rồi thử lại nhé!';
      toast(msg, 3000);
      Voice.say(msg, { queue: true });
    }
    setTimeout(function () { if (G.state === 'over') Music.play('menu'); }, 2500);
    releaseWake();
  }

  function activeName() {
    try { if (window.Players) return Players.active().name; } catch (e) { /* bỏ qua */ }
    return 'Bạn nhỏ';
  }

  function renderLeader(top, me) {
    if (!top || !top.length) {
      ui.leader.innerHTML = '<h3>🏆 Bảng vàng</h3><div class="empty">Chưa có điểm nào. Hãy là người đầu tiên!</div>';
      return;
    }
    ui.leader.innerHTML = '<h3>🏆 Bảng vàng</h3><ol>' + top.map(function (e) {
      return '<li' + (e === me ? ' class="me"' : '') + '><span>' + esc(e.name) + (e === me ? ' ⭐' : '') + '</span><span>' + fmt(e.score) + '</span></li>';
    }).join('') + '</ol>';
  }

  function leaveGame(nextState) {
    clearTimeout(G.cdTimer);
    G.state = nextState;
    G.level = null;
    G.resumeCountdown = false;
    clearWorld();
    ui.hud.classList.remove('paused');
    showHud(false);
    layout();
    G.spawnY = 0;
    releaseWake();
    Voice.stop();
    G.reading = false;
    Music.setDuck('pause', null);
    Music.play('menu');
  }

  function goMenu() {
    closeOverlays();
    leaveGame('menu');
    showScreen('menu');
  }

  function goLevels() {
    closeOverlays();
    leaveGame('levels');
    renderLevels();
    showScreen('levels');
    suggestTable();
  }

  function goTables() {
    closeOverlays();
    leaveGame('tables');
    renderTables();
    showScreen('tables');
  }

  /* ================= CHỌN MÀN ================= */
  function gradeLabel(g) { return g === 0 ? 'Thử thách' : 'Lớp ' + g; }
  function gradeClass(g) { return g === 0 ? 'gx' : 'g' + g; }

  /** "Đã thuộc": đúng ≥ 90% trên ít nhất 20 câu của chủ đề. */
  function mastered(topic) {
    const t = Store.p().stats.byTopic[topic];
    if (!t) return false;
    const n = t.c + t.w;
    return n >= 20 && t.c / n >= 0.9;
  }

  /** Bảng yếu nhất (đã làm ≥ 5 câu, chưa thuộc, tỉ lệ đúng thấp nhất);
      nếu chưa có thì bảng đầu tiên chưa có sao. */
  function weakestTable() {
    const st = Store.p().stats.byTopic;
    let id = null, acc = 2;
    T.TABLE_LEVELS.forEach(function (l) {
      const t = st['t' + l.table];
      if (!t || t.c + t.w < 5) return;
      if (mastered('t' + l.table)) return;         // đã thuộc rồi thì không gợi ý ôn thêm nữa
      const a = t.c / (t.c + t.w);
      if (a < acc) { acc = a; id = l.id; }
    });
    if (id) return id;
    for (let i = 0; i < T.TABLE_LEVELS.length; i++) {
      if (!Store.bestFor(T.TABLE_LEVELS[i].id).stars) return T.TABLE_LEVELS[i].id;
    }
    return null;
  }

  /** Gợi ý bảng nên luyện, đọc một lần mỗi lần mở trang. */
  function suggestTable() {
    if (G.suggestedOnce) return;
    const id = weakestTable();
    if (!id) return;
    G.suggestedOnce = true;
    const l = T.levelById(id);
    if (l && l.table) Voice.say('Hôm nay con luyện bảng ' + l.table + ' nhé!', { queue: true });
  }

  function renderLevels() {
    const isTable = G.mode === 'table';
    const list = isTable ? T.TABLE_LEVELS : T.CHALLENGE_LEVELS;
    ui.opRow.hidden = !isTable;
    ui.modeDesc.innerHTML = isTable
      ? 'Chọn <b>bảng</b> muốn luyện. Mỗi thiên thạch mang một phép tính!'
      : 'Trộn nhiều bảng, <b>tìm thừa số</b>, <b>nhân chia số lớn</b>… dành cho bạn đã thuộc bảng!';
    const weak = weakestTable();
    ui.levelGrid.innerHTML = list.map(function (l) {
      const any = Store.bestFor(l.id);                 // kỷ lục ở mọi chế độ: bấm "Nhân ×" không làm mất sao
      const cur = Store.getRecord(l, G.op, G.duration);
      const note = l.table && cur.best !== any.best ? '<span class="cur">chế độ này: ' + fmt(cur.best) + '</span>' : '';
      return '<div class="level-card" data-id="' + l.id + '" role="button" tabindex="0" aria-label="' + esc(l.title + ' – ' + l.desc) + '">' +
        '<span class="grade ' + gradeClass(l.grade) + '">' + gradeLabel(l.grade) + '</span>' +
        '<div class="icon">' + l.icon + '</div>' +
        '<div class="name">' + esc(l.title) + (l.id === weak ? ' <span class="ribbon">👉 Gợi ý</span>' : '') + '</div>' +
        '<div class="desc">' + esc(l.desc) + '</div>' +
        (l.table && mastered('t' + l.table) ? '<div class="mastered">✅ Đã thuộc</div>' : '') +
        '<div class="meta"><span class="best">🏆 ' + fmt(any.best) + note + '</span><span class="stars" aria-label="' + any.stars + ' sao">' + starsHtml(any.stars) + '</span></div>' +
        '</div>';
    }).join('');
    const tabs = ui.levels.querySelectorAll('.tab');
    for (let i = 0; i < tabs.length; i++) {
      const on = tabs[i].getAttribute('data-mode') === G.mode;
      tabs[i].classList.toggle('on', on);
      tabs[i].setAttribute('aria-selected', String(on));
    }
    const ops = ui.opGroup.querySelectorAll('button');
    for (let i = 0; i < ops.length; i++) {
      const on = ops[i].getAttribute('data-op') === G.op;
      ops[i].classList.toggle('on', on);
      ops[i].setAttribute('aria-pressed', String(on));
    }
  }

  /* ================= BẢNG CỬU CHƯƠNG ================= */
  function renderTables() {
    ui.tableTabs.innerHTML = T.ALL_TABLES.map(function (n) {
      return '<button type="button" data-n="' + n + '" class="' + (n === G.tableN ? 'on' : '') + '" aria-pressed="' + (n === G.tableN) + '" aria-label="Bảng ' + n + '">' + n + '</button>';
    }).join('');
    const rows = T.tableRows(G.tableN);
    const col = function (kind, title) {
      return '<div class="table-col ' + kind + '"><h3>' + title + '</h3>' + rows.map(function (r, i) {
        const s = r[kind].split(' = ');
        return '<div class="table-row" role="button" tabindex="0" data-kind="' + kind + '" data-i="' + i + '" aria-label="' + esc(T.speakEq(r[kind])) + '">' + esc(s[0]) + ' = <span class="ans">' + esc(s[1]) + '</span></div>';
      }).join('') + '</div>';
    };
    ui.tableBody.innerHTML = col('mul', T.TABLE_ICONS[G.tableN] + ' Bảng nhân ' + G.tableN) + col('div', T.TABLE_ICONS[G.tableN] + ' Bảng chia ' + G.tableN);
    const play = $('btn-tables-play');
    if (play) {
      play.innerHTML = '🚀 <span class="txt">Luyện bảng ' + G.tableN + '</span>';
      play.setAttribute('aria-label', 'Luyện bảng ' + G.tableN);
    }
  }

  function highlightRow(kind, i, on) {
    const el = ui.tableBody.querySelector('.table-row[data-kind="' + kind + '"][data-i="' + i + '"]');
    if (el) el.classList.toggle('speaking', !!on);
  }

  function speakRow(kind, i) {
    const rows = T.tableRows(G.tableN);
    const r = rows[i];
    if (!r) return;
    G.reading = false;
    if (!Voice.available) { toast('Thiết bị chưa có giọng đọc tiếng Việt 🙁'); return; }
    Voice.say(T.speakEq(r[kind]), {
      onstart: function () { highlightRow(kind, i, true); },
      onend: function () { highlightRow(kind, i, false); }
    });
  }

  /** Đọc lần lượt cả bảng nhân đang chọn, tô sáng từng dòng. */
  function readTable() {
    if (!Voice.available) { toast('Thiết bị chưa có giọng đọc tiếng Việt 🙁'); return; }
    if (G.reading) { G.reading = false; Voice.stop(); ui.tableBody.querySelectorAll('.speaking').forEach(function (e) { e.classList.remove('speaking'); }); return; }
    const n = G.tableN, rows = T.tableRows(n);
    G.reading = true;
    Voice.stop();
    let pending = 2 * rows.length + 2;
    const done = function () { pending--; if (pending <= 0) G.reading = false; };
    Voice.say('Bảng nhân ' + n, { queue: false, onend: done });
    rows.forEach(function (r, i) {
      Voice.say(T.speakEq(r.mul), {
        queue: true, rate: 0.95,
        onstart: function () { if (G.reading && G.tableN === n) highlightRow('mul', i, true); },
        onend: function () { highlightRow('mul', i, false); done(); }
      });
    });
    Voice.say('Bảng chia ' + n, { queue: true, onend: done });
    rows.forEach(function (r, i) {
      Voice.say(T.speakEq(r.div), {
        queue: true, rate: 0.95,
        onstart: function () { if (G.reading && G.tableN === n) highlightRow('div', i, true); },
        onend: function () { highlightRow('div', i, false); done(); }
      });
    });
  }

  /* ================= NGƯỜI CHƠI (hồ sơ dùng chung) ================= */
  const PlayersUI = { mode: null, avatar: null };

  function renderPlayerChip() {
    const b = $('btn-player');
    if (!b || !window.Players) return;
    b.innerHTML = Players.chipHtml() + '<span class="pl-hint" aria-hidden="true">▾</span>';
  }

  function renderPlayers() {
    if (!window.Players || !ui.players) return;
    const act = Players.active();
    $('player-list').innerHTML = Players.list().map(function (p) {
      const stars = Store.sumStars(p.id);
      return '<button type="button" class="player-item' + (p.id === act.id ? ' active' : '') + '" data-id="' + esc(p.id) + '" aria-pressed="' + (p.id === act.id) + '">' +
        '<span class="pl-avatar" aria-hidden="true">' + esc(p.avatar) + '</span><span class="pl-name">' + esc(p.name) +
        '<span class="pl-sub">⭐ ' + stars + ' sao</span></span></button>';
    }).join('');
    $('btn-player-remove').disabled = Players.list().length <= 1;
    $('player-form').hidden = !PlayersUI.mode;
  }

  function openPlayerForm(mode) {
    PlayersUI.mode = mode;                                   // 'add' | 'rename' | 'avatar'
    const act = Players.active();
    PlayersUI.avatar = mode === 'add' ? Players.AVATARS[Players.list().length % Players.AVATARS.length] : act.avatar;
    const input = $('player-name');
    input.value = mode === 'add' ? '' : act.name;
    input.hidden = mode === 'avatar';
    $('player-avatars').hidden = mode === 'rename';
    $('player-avatars').innerHTML = Players.AVATARS.map(function (a) {
      return '<button type="button" class="avatar" data-avatar="' + esc(a) + '" aria-pressed="' + (a === PlayersUI.avatar) + '" aria-label="Hình ' + esc(a) + '">' + esc(a) + '</button>';
    }).join('');
    renderPlayers();
    if (mode !== 'avatar') setTimeout(function () { try { input.focus(); } catch (e) { /* bỏ qua */ } }, 50);
  }

  function submitPlayerForm() {
    const name = $('player-name').value;
    let ok = false;
    if (PlayersUI.mode === 'add') ok = !!Players.add(name, PlayersUI.avatar);
    else if (PlayersUI.mode === 'rename') ok = Players.rename(Players.active().id, name);
    else if (PlayersUI.mode === 'avatar') ok = Players.setAvatar(Players.active().id, PlayersUI.avatar);
    if (!ok) {
      toast(PlayersUI.mode === 'add' && Players.list().length >= Players.MAX_PLAYERS ? 'Chỉ được tối đa ' + Players.MAX_PLAYERS + ' bạn thôi' : 'Con nhập tên nhé (1–16 chữ)');
      return;
    }
    PlayersUI.mode = null;
    Sfx.play('correct');
    renderPlayers();
    Voice.say('Chào ' + Players.active().name + '!');
  }

  /** Lời chào theo tên, một lần mỗi lần mở trang (sau thao tác chạm đầu tiên để iOS cho phép đọc). */
  function welcome() {
    if (G.welcomed || !window.Players) return;
    G.welcomed = true;
    Voice.say('Chào ' + Players.active().name + '! Cùng bảo vệ hành tinh Ba Hoa nào!');
  }

  /* ================= KẾT QUẢ CỦA BÉ (báo cáo cho phụ huynh) ================= */
  /** Một dòng "cần ôn lại", in đậm đúng phần bé phải trả lời:
      '7 × 8 = ?' → '7 × 8 = <b>56</b>', '? × 6 = 42' → '<b>7</b> × 6 = 42'. */
  function reviewHtml(it) {
    const q = T.fromInfo(it.info);
    if (!q) return esc(String(it.key));
    return esc(q.text).replace('?', '<b>' + esc(q.answer) + '</b>');
  }

  function reportRow(l) {
    const any = Store.bestFor(l.id);
    const st = Store.p().stats.byTopic;
    // Màn luyện bảng: lấy số liệu của chính bảng đó (mọi màn có bảng ấy đều cộng vào).
    // Màn thử thách: chỉ lấy số liệu của riêng màn, chưa chơi thì ghi "chưa chơi".
    const t = l.table ? st['t' + l.table] : st[l.id];
    const c = t ? t.c : 0, w = t ? t.w : 0;
    const n = c + w;
    return '<div class="report-row"><span class="t">' + esc(l.icon + ' ' + l.title) + '</span>' +
      '<span class="stars" aria-label="' + any.stars + ' sao">' + starsHtml(any.stars) + '</span>' +
      '<span>🏆 ' + fmt(any.best) + '</span>' +
      (n ? '<span>' + Math.round(c / n * 100) + '% (' + n + ' câu)</span>' : '<span class="muted">chưa chơi</span>') +
      (l.table && mastered('t' + l.table) ? '<span class="mastered">✅ Đã thuộc</span>' : '') + '</div>';
  }

  function renderReport() {
    if (!ui.report) return;
    const b = Store.p(), st = b.stats;
    $('report-title').textContent = '📊 Kết quả của ' + activeName();
    const total = st.correct + st.wrong, acc = total ? Math.round(st.correct / total * 100) : 0;
    let stars = 0;
    T.TABLE_LEVELS.concat(T.CHALLENGE_LEVELS).forEach(function (l) { stars += Store.bestFor(l.id).stars; });
    $('report-stats').innerHTML =
      '<div class="report-stat"><div class="v">' + fmt(st.plays) + '</div><div class="k">ván đã chơi</div></div>' +
      '<div class="report-stat"><div class="v">' + acc + '%</div><div class="k">trả lời đúng</div></div>' +
      '<div class="report-stat"><div class="v">' + Math.round(st.seconds / 60) + '</div><div class="k">phút luyện tập</div></div>' +
      '<div class="report-stat"><div class="v">' + stars + '/45</div><div class="k">sao</div></div>';
    $('report-levels').innerHTML = T.TABLE_LEVELS.map(reportRow).join('') + T.CHALLENGE_LEVELS.map(reportRow).join('');
    const weak = weakestTable(), wl = weak ? T.levelById(weak) : null;
    const pool = Store.reviewPool();
    $('report-review').innerHTML =
      (wl && wl.table ? '<div class="report-row weak"><span class="t">Bảng nên luyện thêm: ' + esc(wl.title) + '</span></div>' : '') +
      (pool.length
        ? pool.slice(0, 12).map(function (it) {
          return '<div class="report-row"><span class="t">' + reviewHtml(it) + '</span><span>✖ ' + it.n + '</span></div>';
        }).join('')
        : '<div class="report-row"><span class="t">Chưa có gì cần ôn — tuyệt vời! 🎉</span></div>');
  }

  /** Mở báo cáo và nhớ nơi đã mở (menu hay màn "Ai đang chơi?") để quay lại đúng chỗ. */
  function openReport(from) {
    G.reportFrom = from === 'players' ? 'players' : 'menu';
    renderReport();
    openOverlay('report');
  }
  function closeReport() {
    if (G.reportFrom === 'players') { PlayersUI.mode = null; renderPlayers(); openOverlay('players'); return; }
    closeOverlays();
  }

  /* ================= CỔNG PHỤ HUYNH (một phép nhân, không dùng window.prompt/confirm) ================= */
  const Gate = { cb: null, answer: 0 };
  function adultGate(cb) {
    if (!ui.parentGate) { if (window.confirm('Dành cho phụ huynh, thầy cô. Tiếp tục?')) cb(); return; }
    const a = 2 + Math.floor(Math.random() * 8), b = 2 + Math.floor(Math.random() * 8);
    Gate.cb = cb; Gate.answer = a * b;
    $('parent-gate-q').textContent = 'Dành cho phụ huynh, thầy cô. Để tiếp tục, hãy trả lời: ' + a + ' × ' + b + ' = ?';
    $('parent-gate-input').value = '';
    ui.parentGate.classList.remove('hidden');
    setTimeout(function () { try { $('parent-gate-input').focus(); } catch (e) { /* bỏ qua */ } }, 50);
  }
  function closeGate() { if (ui.parentGate) ui.parentGate.classList.add('hidden'); Gate.cb = null; }
  function submitGate() {
    const v = Number($('parent-gate-input').value);
    if (v === Gate.answer) { const cb = Gate.cb; closeGate(); Sfx.play('correct'); if (cb) cb(); }
    else { Sfx.play('wrong'); toast('Chưa đúng, thử lại nhé'); $('parent-gate-input').value = ''; }
  }

  /* ================= LỖI TOÀN CỤC: một lỗi không được làm treo ván chơi ================= */
  let errShown = 0, errLast = 0;
  function onFatal(msg) {
    const now = Date.now();
    if (now - errLast < 1000) return;              // lỗi lặp mỗi khung hình: chỉ xử lý mỗi giây một lần
    errLast = now;
    if (errShown++ < 3) {
      try { console.error('[cuu-chuong]', msg); } catch (e) { /* bỏ qua */ }
      try { toast('Có lỗi nhỏ, con thử lại nhé! 🙏', 2600); } catch (e) { /* bỏ qua */ }
    }
    try { if (inGame()) goMenu(); } catch (e) { /* bỏ qua */ }
  }

  /* ================= ĐẦU VÀO ================= */
  function evPos(e) {
    if (e.touches && e.touches.length) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  }

  function onCanvasDown(e) {
    Sfx.unlock();
    welcome();
    if (G.state !== 'playing') return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const pos = evPos(e);
    const live = liveMeteors();
    let best = null, bd = Infinity;
    for (let i = 0; i < live.length; i++) {
      const m = live[i];
      const dx = m.x - pos.x, dy = m.y - pos.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < m.r * 1.5 && d < bd) { best = m; bd = d; }
    }
    if (best && best.id !== G.targetId) {
      G.targetId = best.id;
      G.typed = '';                              // số đang gõ là của câu cũ: xóa đi cho khỏi bắn nhầm
      onTargetChanged(best);
      Sfx.play('target');
    }
    if (e.cancelable) e.preventDefault();
  }

  function onKey(key) {
    if (key === 'fire') { pressFx('fire'); fire(); }
    else if (key === 'del') { pressFx('del'); delDigit(); }
    else if (/^[0-9]$/.test(key)) { pressFx(key); typeDigit(key); }
  }

  function bindInput() {
    const DOWN = window.PointerEvent ? 'pointerdown' : 'touchstart';
    canvas.addEventListener(DOWN, onCanvasDown);
    ui.numpad.addEventListener(DOWN, function (e) {
      const b = e.target.closest ? e.target.closest('button[data-key]') : null;
      if (!b) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      Sfx.unlock();
      if (e.cancelable) e.preventDefault();
      onKey(b.getAttribute('data-key'));
    });
    // Chặn cuộn/zoom của Safari ngay trên canvas và bàn phím số (không gắn ở document để bảng vẫn cuộn mượt)
    canvas.addEventListener('touchmove', function (e) { if (e.cancelable) e.preventDefault(); }, { passive: false });
    canvas.addEventListener('touchstart', function (e) { if (e.cancelable) e.preventDefault(); }, { passive: false });
    ui.numpad.addEventListener('touchmove', function (e) { if (e.cancelable) e.preventDefault(); }, { passive: false });
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    document.addEventListener('dblclick', function (e) { if (e.target === canvas || ui.numpad.contains(e.target)) e.preventDefault(); });
    document.addEventListener('contextmenu', function (e) { if (e.target === canvas) e.preventDefault(); });
    // Mở khóa âm thanh ở mọi thao tác chạm đầu tiên (kể cả nút bấm)
    document.addEventListener('pointerdown', function () { Sfx.unlock(); if (G.state === 'menu') welcome(); }, { passive: true, capture: true });
    document.addEventListener('keydown', function (e) {
      const gateOpen = !!(ui.parentGate && !ui.parentGate.classList.contains('hidden'));
      if (e.target && e.target.tagName === 'INPUT') {              // đang gõ tên / cổng phụ huynh
        // Escape ở cổng phụ huynh chỉ đóng cổng (như nút "Hủy"), bảng kết quả vẫn mở
        if (e.key === 'Escape') { if (gateOpen) closeGate(); else closeOverlays(); e.target.blur(); }
        return;
      }
      if (e.key === 'Escape' && gateOpen) { closeGate(); return; }
      if (e.key === 'Escape' && anyOverlay() === 'report') { closeReport(); return; }
      if (e.key === 'Escape' && anyOverlay()) { closeOverlays(); return; }
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (G.state === 'playing') pauseGame(); else if (G.state === 'paused') resumeGame();
        return;
      }
      if (G.state !== 'playing') return;
      if (/^[0-9]$/.test(e.key)) { onKey(e.key); e.preventDefault(); }
      else if (e.key === 'Backspace' || e.key === 'Delete') { onKey('del'); e.preventDefault(); }
      else if (e.key === 'Enter' || e.key === ' ') { onKey('fire'); e.preventDefault(); }
      else if (e.key === 'h' || e.key === 'H') { askHint(); e.preventDefault(); }
    });
  }

  /* ================= GIAO DIỆN ================= */
  function click(id, fn) {
    const el = $(id);
    if (!el) return;
    el.addEventListener('click', function (e) { Sfx.unlock(); Sfx.play('click'); fn(e); });
  }

  function applyAudioSettings() {
    Sfx.setEnabled(Store.data.sound !== false);
    Music.setEnabled(Store.data.music !== false);
    Voice.setEnabled(Store.data.voice !== false);
  }

  function renderAudioToggles() {
    const defs = [
      { key: 'sound', on: '🔊 Hiệu ứng: Bật', off: '🔇 Hiệu ứng: Tắt' },
      { key: 'music', on: '🎵 Nhạc nền: Bật', off: '🎵 Nhạc nền: Tắt' },
      { key: 'voice', on: '🗣️ Đọc phép tính: Bật', off: '🗣️ Đọc phép tính: Tắt' },
      { key: 'fx', on: '✨ Hiệu ứng: Nhiều', off: '✨ Hiệu ứng: Ít' }
    ];
    const boxes = document.querySelectorAll('[data-audio-toggles]');
    for (let i = 0; i < boxes.length; i++) {
      boxes[i].innerHTML = defs.map(function (d) {
        const noVoice = d.key === 'voice' && !Voice.available;
        const on = d.key === 'fx' ? Store.data.fx !== 'lite' : (Store.data[d.key] !== false && !noVoice);
        let label = on ? d.on : d.off;
        if (noVoice) label = '🗣️ Đọc phép tính: chưa có giọng Việt';
        return '<button type="button" class="toggle ' + (on ? 'on' : 'off') + (d.key === 'fx' ? ' fx' : '') + '" data-set="' + d.key + '" aria-pressed="' + on + '"' +
          (noVoice ? ' disabled' : '') + '>' + label + '</button>';
      }).join('');
    }
  }

  function bindUi() {
    click('btn-play', function () { goLevels(); });
    click('btn-tables', function () { goTables(); });
    click('btn-tables-back', function () { goMenu(); });
    click('btn-tables-read', function () { readTable(); });
    click('btn-howto', function () { openOverlay('howto'); });
    click('btn-levels-howto', function () { openOverlay('howto'); });
    click('btn-howto-close', function () { closeOverlays(); });
    document.addEventListener('click', function (e) {
      const b = e.target.closest ? e.target.closest('.toggle[data-set]') : null;
      if (!b || b.disabled) return;
      const k = b.getAttribute('data-set');
      Sfx.unlock();
      if (k === 'fx') { Store.data.fx = Store.data.fx === 'lite' ? 'full' : 'lite'; Motion.refresh(); }
      else Store.data[k] = !(Store.data[k] !== false);
      Store.save();
      applyAudioSettings();
      renderAudioToggles();
      if (k === 'fx') { Sfx.play('click'); toast(Motion.lite ? 'Hiệu ứng ít: bớt rung, chớp và tia lửa ✨' : 'Hiệu ứng đầy đủ ✨'); }
      else if (Store.data[k] !== false) {
        if (k === 'sound') Sfx.play('correct');
        if (k === 'voice') Voice.say('Xin chào ' + activeName() + '! Cùng học bảng cửu chương nào!');
      } else {
        Sfx.play('click');
      }
    });
    click('btn-levels-back', function () { goMenu(); });
    click('btn-pause', function () { pauseGame(); });
    click('btn-hint', function () { askHint(); });
    click('btn-resume', function () { resumeGame(); });
    click('btn-restart', function () { const l = G.level; if (l) startGame(l); });
    click('btn-quit', function () {
      if (G.solved + G.missed > 0) {
        try { Store.addStats({ correct: G.solved, wrong: G.missed, seconds: G.duration - G.timeLeft }, G.byTopic); } catch (e) { /* bỏ qua */ }
      }
      goMenu();
    });
    click('btn-again', function () { const l = G.level; if (l) startGame(l); });
    // Sau ván: xem lại bảng cửu chương rồi luyện ngay bảng đó
    click('btn-result-tables', function () { goTables(); });
    click('btn-tables-play', function () {
      const l = T.levelById('t' + G.tableN);
      if (l) startGame(l);
    });
    click('btn-other-level', function () { goLevels(); });
    click('btn-home', function () { goMenu(); });
    ui.reviewChips.addEventListener('click', function (e) {
      const b = e.target.closest('button[data-i]');
      if (!b) return;
      const r = G.review[Number(b.getAttribute('data-i'))];
      if (!r) return;
      Sfx.unlock();
      Voice.say(r.speechFull, {
        onstart: function () { b.classList.add('speaking'); },
        onend: function () { b.classList.remove('speaking'); }
      });
    });

    /* ---- Hồ sơ người chơi ---- */
    click('btn-player', function () { PlayersUI.mode = null; renderPlayers(); openOverlay('players'); });
    click('btn-players-back', function () { PlayersUI.mode = null; closeOverlays(); });
    click('btn-player-add', function () { openPlayerForm('add'); });
    click('btn-player-rename', function () { openPlayerForm('rename'); });
    click('btn-player-avatar', function () { openPlayerForm('avatar'); });
    click('btn-player-cancel', function () { PlayersUI.mode = null; renderPlayers(); });
    click('btn-player-remove', function () {
      adultGate(function () {
        const p = Players.active();
        if (Players.remove(p.id)) {
          delete Store.data.players[p.id];
          Store.save();
          toast('Đã xóa ' + p.name);
          renderPlayers();
        }
      });
    });
    $('player-list').addEventListener('click', function (e) {
      const b = e.target.closest('.player-item');
      if (!b) return;
      Sfx.unlock(); Sfx.play('click');
      Players.setActive(b.getAttribute('data-id'));
    });
    $('player-form').addEventListener('submit', function (e) { e.preventDefault(); Sfx.unlock(); submitPlayerForm(); });
    $('player-avatars').addEventListener('click', function (e) {
      const b = e.target.closest('.avatar');
      if (!b) return;
      PlayersUI.avatar = b.getAttribute('data-avatar');
      const all = $('player-avatars').children;
      for (let i = 0; i < all.length; i++) all[i].setAttribute('aria-pressed', String(all[i] === b));
    });

    /* ---- Kết quả của bé (phụ huynh) ---- */
    click('btn-report', function () { openReport('menu'); });
    click('btn-players-report', function () { openReport('players'); });
    click('btn-report-back', function () { closeReport(); });
    click('btn-report-reset', function () {
      adultGate(function () {
        const name = activeName();
        Store.resetActive();
        renderReport();
        renderPlayers();
        if (G.state === 'levels') renderLevels();
        toast('Đã xóa tiến trình của ' + name);
      });
    });
    $('parent-gate-form').addEventListener('submit', function (e) { e.preventDefault(); submitGate(); });
    click('btn-parent-gate-cancel', function () { closeGate(); });

    const durBtns = ui.durationGroup.querySelectorAll('button');
    for (let i = 0; i < durBtns.length; i++) {
      durBtns[i].addEventListener('click', function () {
        Sfx.unlock(); Sfx.play('click');
        G.duration = Number(this.getAttribute('data-sec')) || 90;
        Store.data.duration = G.duration;
        Store.save();
        for (let k = 0; k < durBtns.length; k++) {
          durBtns[k].classList.toggle('on', durBtns[k] === this);
          durBtns[k].setAttribute('aria-pressed', String(durBtns[k] === this));
        }
      });
    }

    const opBtns = ui.opGroup.querySelectorAll('button');
    for (let i = 0; i < opBtns.length; i++) {
      opBtns[i].addEventListener('click', function () {
        Sfx.unlock(); Sfx.play('click');
        G.op = this.getAttribute('data-op') || 'mix';
        Store.data.op = G.op;
        Store.save();
        renderLevels();
      });
    }

    const tabs = ui.levels.querySelectorAll('.tab');
    for (let i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener('click', function () {
        Sfx.unlock(); Sfx.play('click');
        G.mode = this.getAttribute('data-mode') === 'challenge' ? 'challenge' : 'table';
        renderLevels();
      });
    }

    const openCard = function (card) {
      const lvl = T.levelById(card.getAttribute('data-id'));
      if (!lvl) return;
      Sfx.unlock(); Sfx.play('click');
      startGame(lvl);
    };
    ui.levelGrid.addEventListener('click', function (e) {
      const card = e.target.closest('.level-card');
      if (card) openCard(card);
    });
    ui.levelGrid.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest ? e.target.closest('.level-card') : null;
      if (!card) return;
      e.preventDefault();
      openCard(card);
    });

    ui.tableTabs.addEventListener('click', function (e) {
      const b = e.target.closest('button[data-n]');
      if (!b) return;
      Sfx.unlock(); Sfx.play('click');
      G.reading = false;
      Voice.stop();
      G.tableN = Number(b.getAttribute('data-n')) || 2;
      renderTables();
    });
    ui.tableBody.addEventListener('click', function (e) {
      const row = e.target.closest('.table-row');
      if (!row) return;
      Sfx.unlock(); Sfx.play('click');
      speakRow(row.getAttribute('data-kind'), Number(row.getAttribute('data-i')));
    });
    ui.tableBody.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const row = e.target.closest ? e.target.closest('.table-row') : null;
      if (!row) return;
      e.preventDefault();
      Sfx.unlock(); Sfx.play('click');
      speakRow(row.getAttribute('data-kind'), Number(row.getAttribute('data-i')));
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        if (G.state === 'playing' || G.state === 'countdown') pauseGame();
        else quietAudio();
        return;
      }
      wakeAudio();
      if (inGame() && G.state !== 'paused') requestWake();
    });
    window.addEventListener('pageshow', function () { wakeAudio(); });
    window.addEventListener('blur', function () { if (G.state === 'playing' || G.state === 'countdown') pauseGame(); });
  }

  /* ================= TIỆN ÍCH THIẾT BỊ ================= */
  function requestWake() {
    try {
      if ('wakeLock' in navigator && navigator.wakeLock.request) {
        navigator.wakeLock.request('screen').then(function (l) {
          G.wakeLock = l;
          try { l.addEventListener('release', function () { G.wakeLock = null; }); } catch (e) { /* bỏ qua */ }
        }).catch(function () { /* bỏ qua */ });
      }
    } catch (e) { /* bỏ qua */ }
  }
  function releaseWake() {
    try { if (G.wakeLock) { G.wakeLock.release(); G.wakeLock = null; } } catch (e) { /* bỏ qua */ }
  }

  function setupDeviceHints() {
    const ua = navigator.userAgent || '';
    const isIOS = /iP(hone|ad|od)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    let standalone = false;
    try { standalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches; } catch (e) { /* bỏ qua */ }
    if (ui.ipadTip) ui.ipadTip.hidden = !(isIOS && !standalone);
  }

  function registerSw() {
    try {
      if (!('serviceWorker' in navigator)) return;
      if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
      navigator.serviceWorker.register('sw.js').catch(function () { /* bỏ qua */ });
    } catch (e) { /* bỏ qua */ }
  }

  /* ================= VÒNG LẶP ================= */
  let lastTs = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    let dt = (ts - lastTs) / 1000;
    lastTs = ts;
    if (!(dt > 0)) dt = 0;
    if (dt > 0.05) dt = 0.05;
    // Kiểm tra kích thước định kỳ (phòng khi thiết bị đổi hướng mà không phát sự kiện resize)
    frame.tick = (frame.tick || 0) + 1;
    if (!G.bg || frame.tick % 30 === 0) {
      const w = app.clientWidth, h = app.clientHeight;
      if (!G.bg || (w && h && (w !== G.W || h !== G.H))) resize();
    }
    if (!G.bg) return;
    const t0 = performance.now();
    let t1 = t0, t2 = t0;
    try {                                        // một khung hình lỗi không được làm chết vòng lặp
      update(dt);
      t1 = performance.now();
      if (inGame() || (frame.tick & 1)) render();   // màn hình chờ: 30 hình/giây là đủ
      t2 = performance.now();
    } catch (err) {
      onFatal(err && err.message ? err.message : String(err));
      return;
    }
    const p = G.perf;
    p.n++; p.update += t1 - t0; p.render += t2 - t1;
    if (p.n >= 60) { p.avgUpdate = p.update / p.n; p.avgRender = p.render / p.n; p.n = 0; p.update = 0; p.render = 0; }
  }

  function boot() {
    try { if (window.Players) Players.load(); } catch (e) { /* bỏ qua */ }
    Store.load();
    Motion.refresh();
    G.duration = Store.data.duration;
    G.op = Store.data.op;
    renderPlayerChip();
    try {
      if (window.Players) {
        Players.onChange(function () {
          renderPlayerChip();
          renderPlayers();
          if (G.state === 'levels') renderLevels();
          if (ui.report && !ui.report.classList.contains('hidden')) renderReport();
        });
      }
    } catch (e) { /* bỏ qua */ }
    window.addEventListener('error', function (e) { onFatal(e && e.message); });
    window.addEventListener('unhandledrejection', function (e) { onFatal(e && e.reason && (e.reason.message || e.reason)); });
    try {
      const mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mq && mq.addEventListener) mq.addEventListener('change', function () { Motion.refresh(); renderAudioToggles(); });
    } catch (e) { /* bỏ qua */ }
    Voice.init();
    applyAudioSettings();
    renderAudioToggles();
    setTimeout(renderAudioToggles, 1200);
    setTimeout(renderAudioToggles, 3600);
    Music.play('menu');
    const durBtns = ui.durationGroup.querySelectorAll('button');
    for (let k = 0; k < durBtns.length; k++) {
      const on = Number(durBtns[k].getAttribute('data-sec')) === G.duration;
      durBtns[k].classList.toggle('on', on);
      durBtns[k].setAttribute('aria-pressed', String(on));
    }
    resize();
    let rt = 0;
    const onResize = function () { clearTimeout(rt); rt = setTimeout(resize, 80); };
    window.addEventListener('resize', onResize);
    bindInput();
    bindUi();
    setupDeviceHints();
    registerSw();
    try { if (document.fonts && document.fonts.load) document.fonts.load('800 32px "Baloo 2"'); } catch (e) { /* bỏ qua */ }
    showHud(false);
    showScreen('menu');
    requestAnimationFrame(function (ts) { lastTs = ts; requestAnimationFrame(frame); });
  }

  // Móc gỡ lỗi (chỉ đọc) để kiểm thử tự động
  window.__CuuChuong = {
    G: G, Store: Store, Motion: Motion, Gate: Gate,
    startGame: startGame, fire: fire, typeDigit: typeDigit, delDigit: delDigit, endGame: endGame,
    spawnMeteor: spawnMeteor, spawnForQuestion: spawnForQuestion, liveMeteors: liveMeteors, getTarget: getTarget,
    onHit: onHit, onWrong: onWrong, onShieldHit: onShieldHit, showResults: showResults, askHint: askHint,
    renderReport: renderReport, renderLevels: renderLevels, adultGate: adultGate,
    update: update, render: render, layout: layout,
    perf: function () { return { avgUpdate: G.perf.avgUpdate, avgRender: G.perf.avgRender, parts: G.parts.length, meteors: G.meteors.length }; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
