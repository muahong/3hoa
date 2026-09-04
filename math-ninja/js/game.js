/* ============================================================
   game.js – Bộ máy trò chơi Ninja Toán Học
   - Canvas 2D, vòng lặp requestAnimationFrame theo thời gian thực (dt)
   - Vật lý ném quả kiểu Fruit Ninja, chém bằng ngón tay (Pointer Events, đa chạm)
   - Hai chế độ: "Chém đáp án" và "Ghép đôi"
   ============================================================ */
(function () {
  'use strict';

  const MG = window.MathGen, SP = window.Sprites, Sfx = window.Sfx, Music = window.Music, Voice = window.Voice;
  const rnd = MG.rnd, chance = MG.chance, pick = MG.pick, shuffle = MG.shuffle;
  const TAU = Math.PI * 2;
  const FONT = '"Baloo 2", "Arial Rounded MT Bold", "Segoe UI", Arial, sans-serif';
  const $ = function (id) { return document.getElementById(id); };
  const clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  const PRAISE = ['Chính xác!', 'Tuyệt vời!', 'Giỏi quá!', 'Đúng rồi!', 'Xuất sắc!', 'Siêu đỉnh!', 'Hay lắm!'];
  const STAR_FACTOR = { a1: 1, a2: 0.95, a3: 0.85, a4: 0.7, a5: 0.5, a6: 0.6, m1: 0.9, m2: 0.85, m3: 0.7, m4: 0.5, p1: 0.9, p2: 0.75, p3: 0.7, p4: 0.6, p5: 0.5, p6: 0.55 };
  const POP_T = 0.28;
  const MAX_HEARTS = 3;
  const TRAIL_MS = 170;
  const MAX_STAINS = 14;
  const MAX_PARTS = 250;          // hạt nhiều hơn mức này chỉ tốn thời gian vẽ, mắt không thấy khác
  const MAX_PARTS_LITE = 120;

  /* ================= LƯU TRỮ (localStorage) =================
     Thiết lập thiết bị ở cấp cao nhất (sound, music, voice, duration, fx, seenTip).
     Tiến trình của từng bé nằm ở players[id] = { records, names, missed, stats }:
       records – kỷ lục theo 'chế độ:màn:thời gian', names – tên đã dùng cho bảng vàng,
       missed  – kho "ôn lại thông minh", stats – thống kê cho báo cáo phụ huynh.
     Dữ liệu bản cũ (records/names ở cấp cao nhất) tự chuyển sang bé mặc định p1.
     KHÔNG tin bất kỳ giá trị nào đọc từ máy: ép kiểu, kẹp khoảng, cắt độ dài chuỗi,
     và loại bỏ khóa __proto__/constructor/prototype khi đọc JSON. */
  const NAME_MAX = 16;
  const REC_KEY_RE = /^(answer|pair):[a-z]\d:(60|90|120)$/;
  const Store = {
    key: 'ninja-toan-v1',
    data: { sound: true, music: true, voice: true, duration: 90, fx: 'full', seenTip: false, players: {} },
    blank() {
      return { records: {}, names: [], missed: {}, stats: { plays: 0, correct: 0, wrong: 0, seconds: 0, byTopic: {}, last: 0 } };
    },
    reviver(k, v) { return (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v; },
    int(v, lo, hi, def) { v = Math.floor(Number(v)); return Number.isFinite(v) ? clamp(v, lo, hi) : def; },
    cleanName(s) {
      return String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX).trim();
    },
    mkey(k) { return String(k == null ? '' : k).slice(0, 80); },
    load() {
      let d = null;
      try { const raw = localStorage.getItem(this.key); if (raw) d = JSON.parse(raw, this.reviver); } catch (e) { d = null; }
      if (!d || typeof d !== 'object') d = {};
      this.data.sound = d.sound !== false;
      this.data.music = d.music !== false;
      this.data.voice = d.voice !== false;
      this.data.fx = d.fx === 'lite' ? 'lite' : 'full';
      this.data.seenTip = d.seenTip === true;
      this.data.duration = [60, 90, 120].indexOf(Number(d.duration)) >= 0 ? Number(d.duration) : 90;
      this.data.players = {};
      const src = d.players && typeof d.players === 'object' ? d.players : null;
      if (src) {
        Object.keys(src).forEach(function (id) {
          if (/^[A-Za-z0-9_-]{1,24}$/.test(id)) Store.data.players[id] = Store.sanitize(src[id]);
        });
      }
      if (!Object.keys(this.data.players).length && (d.records || d.names)) {
        // Di trú dữ liệu cũ (players thiếu, rỗng hoặc chỉ có id hỏng): kỷ lục và tên cũ thuộc về bé mặc định p1
        this.data.players.p1 = this.sanitize({ records: d.records, names: d.names });
        this.save();
      }
    },
    /** Ép một bucket tiến trình về đúng kiểu/khoảng. */
    sanitize(b) {
      const out = this.blank();
      if (!b || typeof b !== 'object') return out;
      const recs = b.records && typeof b.records === 'object' ? b.records : {};
      Object.keys(recs).slice(0, 200).forEach(function (k) {
        if (!recs[k] || typeof recs[k] !== 'object') return;
        if (!REC_KEY_RE.test(k) || !MG.levelById(k.split(':')[1])) return;
        out.records[k] = Store.cleanRec(recs[k]);
      });
      const names = Array.isArray(b.names) ? b.names : [];
      for (let i = 0; i < names.length && out.names.length < 5; i++) {
        const n = this.cleanName(names[i]);
        if (n && out.names.indexOf(n) < 0) out.names.push(n);
      }
      const ms = b.missed && typeof b.missed === 'object' ? b.missed : {};
      Object.keys(ms).slice(0, 120).forEach(function (k) {
        const e = ms[k], key = Store.mkey(k);
        if (!key || !e || typeof e !== 'object') return;
        const info = Store.cleanInfo(e.info);
        if (!info || keyForInfo(info) !== key) return;    // info phải sinh lại đúng câu đã lưu
        out.missed[key] = { n: Store.int(e.n, 1, 9999, 1), ok: Store.int(e.ok, 0, 9, 0), last: Store.int(e.last, 0, 9e15, 0), info: info };
      });
      this.capMissed(out.missed);
      const st = b.stats && typeof b.stats === 'object' ? b.stats : {};
      out.stats.plays = this.int(st.plays, 0, 9999999, 0);
      out.stats.correct = this.int(st.correct, 0, 99999999, 0);
      out.stats.wrong = this.int(st.wrong, 0, 99999999, 0);
      out.stats.seconds = this.int(st.seconds, 0, 999999999, 0);
      out.stats.last = this.int(st.last, 0, 9e15, 0);
      const bt = st.byTopic && typeof st.byTopic === 'object' ? st.byTopic : {};
      Object.keys(bt).slice(0, 40).forEach(function (k) {
        const t = bt[k];
        if (!MG.levelById(k) || !t || typeof t !== 'object') return;
        out.stats.byTopic[k] = { c: Store.int(t.c, 0, 99999999, 0), w: Store.int(t.w, 0, 99999999, 0) };
      });
      return out;
    },
    /** Một mục kỷ lục sạch: { best, stars, top: [≤5 × {name, avatar, score, date}] }. */
    cleanRec(r) {
      r = r && typeof r === 'object' ? r : {};
      const avatars = window.Players ? Players.AVATARS : [];
      const top = (Array.isArray(r.top) ? r.top : [])
        .filter(function (e) { return e && typeof e === 'object'; })
        .slice(0, 20)
        .map(function (e) {
          return {
            name: Store.cleanName(e.name) || 'Bạn nhỏ',
            avatar: avatars.indexOf(e.avatar) >= 0 ? e.avatar : '',
            score: Store.int(e.score, 0, 999999, 0),
            date: Store.int(e.date, 0, 9e15, 0)
          };
        })
        .sort(function (a, b) { return b.score - a.score; })
        .slice(0, 5);
      return { best: this.int(r.best, 0, 999999, 0), stars: this.int(r.stars, 0, 3, 0), top: top };
    },
    /** Dữ liệu tối thiểu để dựng lại một câu cần ôn (chỉ nhận số hợp lệ và màn có thật). */
    cleanInfo(info) {
      if (!info || typeof info !== 'object') return null;
      const lvl = typeof info.level === 'string' ? MG.levelById(info.level) : null;
      if (!lvl) return null;
      const op = info.op === '+' || info.op === '-' || info.op === '*' ? info.op : null;
      if (!op) return null;
      if (Array.isArray(info.pair)) {
        if (info.pair.length !== 2) return null;
        const u = this.int(info.pair[0], 0, 1000, -1), v = this.int(info.pair[1], 0, 1000, -1);
        const target = this.int(info.target, 0, 1000, -1);
        if (u < 0 || v < 0 || target < 0) return null;
        const out = { target: target, op: op, pair: [u, v], lo: this.int(info.lo, 0, 1000, 1), hi: this.int(info.hi, 1, 1000, 100), level: lvl.id };
        const step = this.int(info.step, 1, 100, 0);
        if (step) out.step = step;
        return out;
      }
      const a = this.int(info.a, 0, 10000, -1), b = this.int(info.b, 0, 10000, -1);
      if (a < 0 || b < 0) return null;
      return { a: a, b: b, op: op, max: this.int(info.max, 1, 100000, 1200), level: lvl.id };
    },
    capMissed(m) {
      const keys = Object.keys(m);
      if (keys.length <= 60) return;
      keys.sort(function (a, b) { return m[a].last - m[b].last; });
      for (let i = 0; i < keys.length - 60; i++) delete m[keys[i]];
    },
    save() {
      try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* bỏ qua */ }
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
    recKey(mode, levelId, duration) { return mode + ':' + levelId + ':' + duration; },
    getRecord(mode, levelId, duration) {
      return this.cleanRec(this.p().records[this.recKey(mode, levelId, duration)]);
    },
    setRecord(mode, levelId, duration, rec) {
      try {
        const key = this.recKey(mode, levelId, duration);
        if (!REC_KEY_RE.test(key)) return;
        this.p().records[key] = this.cleanRec(rec);
        this.save();
      } catch (e) { /* bỏ qua: lỗi lưu trữ không được làm hỏng ván chơi */ }
    },
    rememberName(name) {
      name = this.cleanName(name);
      if (!name) return;
      const b = this.p();
      const names = b.names.filter(function (n) { return n !== name; });
      names.unshift(name);
      b.names = names.slice(0, 5);
      this.save();
    },
    /* ---- Ôn lại thông minh ---- */
    noteMissed(key, info) {
      const m = this.p().missed;
      key = this.mkey(key);
      const clean = this.cleanInfo(info);
      if (!key || !clean || keyForInfo(clean) !== key) return;
      const e = m[key] || { n: 0, ok: 0, last: 0, info: null };
      e.n = Math.min(9999, e.n + 1); e.ok = 0; e.last = Date.now(); e.info = clean;
      m[key] = e;
      this.capMissed(m);
      this.save();
    },
    noteOk(key) {
      const m = this.p().missed;
      key = this.mkey(key);
      const e = m[key];
      if (!e) return;
      e.ok++;
      if (e.ok >= 2) delete m[key];
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
    addStats(round) {
      const s = this.p().stats;
      s.plays++;
      s.correct += Math.max(0, round.correct || 0);
      s.wrong += Math.max(0, round.wrong || 0);
      s.seconds += Math.max(0, Math.round(round.seconds || 0));
      s.last = Date.now();
      if (round.topic && MG.levelById(round.topic)) {
        const t = s.byTopic[round.topic] || { c: 0, w: 0 };
        t.c += Math.max(0, round.correct || 0);
        t.w += Math.max(0, round.wrong || 0);
        s.byTopic[round.topic] = t;
      }
      this.save();
    },
    resetActive() { this.data.players[this.activeId()] = this.blank(); this.save(); }
  };

  /* ================= CHUYỂN ĐỘNG GIẢM =================
     Tôn trọng prefers-reduced-motion và nút "✨ Hiệu ứng: Ít": ít hạt hơn, không rung/chớp màn hình. */
  const Motion = {
    lite: false,
    refresh() {
      let pref = false;
      try { pref = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { /* bỏ qua */ }
      this.lite = pref || Store.data.fx === 'lite';
      try { document.documentElement.classList.toggle('lite-fx', this.lite); } catch (e) { /* bỏ qua */ }
    }
  };
  function fxCount(n) { return Motion.lite ? Math.max(1, Math.round(n * 0.4)) : n; }

  /* ================= TRẠNG THÁI ================= */
  const G = {
    W: 0, H: 0, dpr: 1, baseR: 40, R: 40, gravity: 800,
    state: 'menu',          // menu | levels | countdown | playing | paused | over
    mode: 'answer',         // answer | pair
    level: null,
    duration: 90,
    anim: 0,                // đồng hồ hoạt hình (luôn chạy)
    time: 0,                // đồng hồ ván chơi (chỉ chạy khi playing)
    fruits: [], halves: [], parts: [], stains: [], texts: [], blades: new Map(), clouds: [],
    bgSky: null, bgHills: null, sun: { x: 0, y: 0, r: 0 }, sunGlow: null,
    shake: 0, flash: null, lowHpGrad: null, hudBottom: 0,
    score: 0, hearts: MAX_HEARTS, streak: 0, bestStreak: 0, correct: 0, wrong: 0, bombs: 0, stage: 1, timeLeft: 90,
    question: null, wave: null, held: null, heldForm: 'a', misses: 0, qStart: 0,
    nextQuestionAt: -1, relaunchAt: -1, overAt: -1, attractT: 0.5, lastWarnSec: -1, endReason: '',
    stageBannerAt: -1, missedList: [], reviewUsed: 0, asked: 0, hurry: false,
    resumeCountdown: false, welcomed: false, lastInputAt: 0, musicIdle: false,
    nextLevel: null, easierLevel: null,
    hud: { score: -1, hearts: -1, stage: -1, mult: -1, time: '', fill: -1, hintOn: null },
    cdTimer: 0, resultShown: false, lastEntry: null, wakeLock: null,
    perf: { n: 0, update: 0, render: 0, dt: 0, avgUpdate: 0, avgRender: 0, avgDt: 0 }
  };

  /* ================= DOM ================= */
  const app = $('app');
  const canvas = $('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  const ui = {
    hud: $('hud'), menu: $('menu'), levels: $('levels'), howto: $('howto'), countdown: $('countdown'),
    pause: $('pause'), gameover: $('gameover'), players: $('players'), report: $('report'),
    parentGate: $('parent-gate'), toast: $('toast'),
    score: $('hud-score'), stage: $('hud-stage'), combo: $('hud-combo'), question: $('hud-question'),
    timer: $('hud-timer'), timerFill: $('hud-timer-fill'), time: $('hud-time'), hearts: $('hud-hearts'), hint: $('hud-hint'),
    review: $('hud-review'), btnHint: $('btn-hint'), hudTop: null,
    countNum: $('count-num'), levelGrid: $('level-grid'), modeDesc: $('mode-desc'),
    resultTitle: $('result-title'), resultLevel: $('result-level'), resultScore: $('result-score'),
    resultStars: $('result-stars'), resultRecord: $('result-record'), resultReview: $('result-review'),
    stCorrect: $('st-correct'), stWrong: $('st-wrong'), stBomb: $('st-bomb'), stCombo: $('st-combo'), stAcc: $('st-acc'),
    resultFx: $('result-fx'), btnNext: $('btn-next'), btnEasier: $('btn-easier'),
    nameEntry: $('name-entry'), nameInput: $('name-input'), nameChips: $('name-chips'), leader: $('leader'),
    durationGroup: $('duration-group'), ipadTip: $('ipad-tip')
  };
  ui.hudTop = ui.hud ? ui.hud.querySelector('.hud-top') : null;
  const SCREENS = ['menu', 'levels', 'countdown', 'pause', 'gameover', 'players', 'report'];

  function showScreen(name) {
    SCREENS.forEach(function (k) { if (ui[k]) ui[k].classList.toggle('hidden', k !== name); });
  }
  function isOpen(el) { return !!el && !el.classList.contains('hidden'); }
  function showHud(on) { ui.hud.classList.toggle('hidden', !on); }
  function toast(msg, ms) {
    ui.toast.textContent = msg;
    // Bảng phủ mờ (tạm dừng, kết quả, hồ sơ...) che mất đáy màn hình → đưa thông báo lên trên
    let dim = false;
    try { dim = !!document.querySelector('.screen.dim:not(.hidden)'); } catch (e) { /* bỏ qua */ }
    ui.toast.classList.toggle('top', dim);
    ui.toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { ui.toast.classList.remove('show'); }, ms || 1800);
  }
  function fmt(n) { try { return Number(n).toLocaleString('vi-VN'); } catch (e) { return String(n); } }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ================= KÍCH THƯỚC & NỀN ================= */
  function resize() {
    const w = app.clientWidth || window.innerWidth;
    const h = app.clientHeight || window.innerHeight;
    if (!w || !h) return;
    if (w === G.W && h === G.H && G.dpr === Math.min(window.devicePixelRatio || 1, 2) && G.bgSky) return;
    const oldW = G.W, oldH = G.H;
    const wasPlaying = G.state === 'playing' && oldW > 0 && oldH > 0;
    G.dpr = Math.min(window.devicePixelRatio || 1, 2);
    G.W = w; G.H = h;
    canvas.width = Math.round(w * G.dpr);
    canvas.height = Math.round(h * G.dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    G.baseR = clamp(Math.min(w, h) * 0.066, 32, 64);
    if (oldW > 0 && oldH > 0) rescaleWorld(w / oldW, h / oldH);
    applyFruitSize();
    buildBackground();
    initClouds(oldW > 0 && oldH > 0 ? { fx: w / oldW, fy: h / oldH } : null);
    measureHud();
    // Xoay màn hình giữa ván: tạm dừng để bé không bị mất quả vì quỹ đạo đổi
    if (wasPlaying) { pauseGame(); toast('Đã xoay màn hình, bấm ▶ để chơi tiếp'); }
  }

  /** Giữ nguyên bố cục tương đối khi đổi hướng màn hình (quả không bị văng ra ngoài). */
  function rescaleWorld(fx, fy) {
    if (!(fx > 0) || !(fy > 0) || (fx === 1 && fy === 1)) return;
    const lists = [G.fruits, G.halves, G.texts, G.stains, G.parts];
    for (let i = 0; i < lists.length; i++) {
      const arr = lists[i];
      for (let k = 0; k < arr.length; k++) {
        const o = arr[k];
        if (typeof o.x === 'number') o.x *= fx;
        if (typeof o.y === 'number') o.y *= fy;
        if (typeof o.vx === 'number') o.vx *= fx;
        if (typeof o.vy === 'number') o.vy *= fy;
      }
    }
  }

  /** Đáy của thanh HUD (để quả không bay khuất sau thẻ phép tính). Chỉ đo khi đổi kích thước. */
  function measureHud() {
    if (!ui.hudTop || !inGame() || ui.hud.classList.contains('hidden')) { G.hudBottom = 0; return; }
    try { G.hudBottom = Math.max(0, ui.hudTop.getBoundingClientRect().bottom); } catch (e) { G.hudBottom = 0; }
  }

  function inGame() { return G.state === 'countdown' || G.state === 'playing' || G.state === 'paused' || G.state === 'over'; }

  function applyFruitSize() {
    const big = inGame() && G.level && G.level.big;
    G.R = Math.round(G.baseR * (big ? 1.25 : 1));
    SP.build(G.R, G.dpr);
    G.fruits.forEach(function (f) { f.r = G.R; });
    updateGravity();
  }

  function updateGravity() {
    let speed = 0.8;
    if (inGame() && G.level) speed = G.level.speed * Math.min(1.35, 1 + 0.04 * (G.stage - 1));
    G.gravity = G.H * 0.55 * speed * speed;
  }

  /** Vẽ một lớp nền tĩnh vào canvas ngoài màn hình (dùng lại canvas cũ để không cấp phát lại khi xoay máy). */
  function layer(old, fn) {
    const c = old || document.createElement('canvas');
    c.width = canvas.width; c.height = canvas.height;   // gán width cũng xóa sạch canvas
    const cx = c.getContext('2d');
    cx.setTransform(1, 0, 0, 1, 0, 0);
    cx.scale(G.dpr, G.dpr);
    fn(cx);
    return c;
  }

  function mountains(c, W, H, baseY, color, n, amp, seed) {
    const rand = seededRand(seed);
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(0, H);
    c.lineTo(0, H * baseY);
    const step = W / n;
    for (let i = 0; i < n; i++) {
      const x0 = i * step, x1 = (i + 1) * step;
      const peakY = H * baseY - H * amp * (0.5 + rand() * 0.7);
      c.quadraticCurveTo(x0 + step * 0.5, peakY, x1, H * baseY);
    }
    c.lineTo(W, H);
    c.closePath();
    c.fill();
  }

  function hill(c, W, H, baseY, color, n, amp, phase) {
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(0, H);
    for (let x = 0; x <= W + 10; x += 12) {
      const y = H * baseY - H * amp * (0.5 + 0.5 * Math.sin(x / W * Math.PI * n + phase));
      c.lineTo(x, y);
    }
    c.lineTo(W, H);
    c.closePath();
    c.fill();
  }

  function hillY(W, H, baseY, n, amp, phase, x) {
    return H * baseY - H * amp * (0.5 + 0.5 * Math.sin(x / W * Math.PI * n + phase));
  }

  function seededRand(seed) {
    let s = (seed >>> 0) || 1;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
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
    c.beginPath(); c.arc(x + s * 0.22, y - s * 0.7, s * 0.14, 0, TAU); c.fill();
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

  function buildBackground() {
    const W = G.W, H = G.H;
    G.sun = { x: W * 0.84, y: H * 0.15, r: Math.min(W, H) * 0.07 };

    G.bgSky = layer(G.bgSky, function (c) {
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#3d9df5');
      g.addColorStop(0.55, '#8fd3ff');
      g.addColorStop(1, '#eafaff');
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
      mountains(c, W, H, 0.64, '#c3d5f4', 5, 0.16, 5);
      mountains(c, W, H, 0.7, '#a9c0ea', 4, 0.13, 9);
    });

    G.bgHills = layer(G.bgHills, function (c) {
      const rand = seededRand(21);
      hill(c, W, H, 0.76, '#a8e07e', 3, 0.09, 0.4);
      for (let i = 0; i < 6; i++) {
        const x = W * (0.04 + 0.92 * rand());
        const s = H * 0.055 * (0.8 + rand() * 0.6);
        tree(c, x, hillY(W, H, 0.76, 3, 0.09, 0.4, x) + s * 0.1, s);
      }
      hill(c, W, H, 0.84, '#7fcf5e', 4, 0.07, 2.1);
      for (let i = 0; i < 7; i++) {
        const x = W * (0.02 + 0.96 * rand());
        const s = H * 0.03 * (0.8 + rand() * 0.7);
        const y = hillY(W, H, 0.84, 4, 0.07, 2.1, x);
        c.fillStyle = '#4aa844';
        c.beginPath(); c.ellipse(x, y, s * 1.4, s, 0, 0, TAU); c.fill();
        c.fillStyle = '#6cc65f';
        c.beginPath(); c.ellipse(x - s * 0.3, y - s * 0.3, s * 0.7, s * 0.45, 0, 0, TAU); c.fill();
      }
      hill(c, W, H, 0.91, '#55b846', 3, 0.05, 4.2);
      // "3 hoa" – ba bông hoa lớn góc trái + hoa nhỏ rải rác
      const fs = Math.min(W, H) * 0.014;
      flower(c, W * 0.06, H * 0.9, fs * 1.4, '#ff6fa5');
      flower(c, W * 0.1, H * 0.925, fs * 1.6, '#ffffff');
      flower(c, W * 0.145, H * 0.905, fs * 1.3, '#ffa94d');
      const cols = ['#ff6fa5', '#ffffff', '#ffa94d', '#b48cf0'];
      for (let i = 0; i < 12; i++) {
        const x = W * (0.2 + 0.78 * rand());
        const y = H * (0.9 + 0.07 * rand());
        flower(c, x, y, fs * (0.6 + rand() * 0.6), cols[i % cols.length]);
      }
      c.fillStyle = '#3f9d3a';
      c.fillRect(0, H - H * 0.025, W, H * 0.025);
    });

    G.sunGlow = null;
    // Vầng đỏ cảnh báo khi còn 1 tim: dựng sẵn một lần cho mỗi kích thước (độ mờ đổi bằng globalAlpha)
    G.lowHpGrad = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
    G.lowHpGrad.addColorStop(0, 'rgba(255,40,80,0)');
    G.lowHpGrad.addColorStop(1, 'rgba(255,40,80,1)');
  }

  /** scale = { fx, fy } để giữ nguyên vị trí mây khi xoay màn hình (không dựng lại mây). */
  function initClouds(scale) {
    if (scale && G.clouds.length) {
      for (let i = 0; i < G.clouds.length; i++) { G.clouds[i].x *= scale.fx; G.clouds[i].y *= scale.fy; }
      return;
    }
    G.clouds = [];
    for (let i = 0; i < 5; i++) {
      const n = 4 + rnd(0, 2), puffs = [];
      for (let k = 0; k < n; k++) puffs.push({ dx: (k / (n - 1) - 0.5) * 2.3, dy: (Math.random() - 0.5) * 0.5, r: 0.55 + Math.random() * 0.5 });
      G.clouds.push({ x: Math.random() * G.W, y: G.H * (0.04 + Math.random() * 0.4), s: 0.6 + Math.random() * 0.7, v: 6 + Math.random() * 12, puffs: puffs });
    }
  }

  /* ================= THỰC THỂ ================= */
  function Fruit(o) {
    this.kind = 'fruit';      // fruit | bomb | heart
    this.type = pick(SP.TYPES);
    this.value = null;
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
    this.rot = 0; this.vr = 0;
    this.r = G.R;
    this.delay = 0;
    this.launched = false;
    this.dead = false;
    this.popping = 0;
    this.scale = 1;
    this.wave = null;
    this.hint = false;
    for (const k in o) this[k] = o[k];
  }

  function Half(f, angle, side) {
    this.type = f.type;
    this.x = f.x; this.y = f.y;
    const nx = -Math.sin(angle), ny = Math.cos(angle);
    const push = 120 + Math.random() * 90;
    this.vx = f.vx * 0.8 + nx * push * side + (Math.random() - 0.5) * 40;
    this.vy = f.vy * 0.6 + ny * push * side - 40;
    this.rot = f.rot;
    this.vr = side * (2 + Math.random() * 3);
    this.cut = angle - f.rot;
    this.side = side;
    this.r = f.r;
    // Nướng sẵn nửa quả (A16): tránh clip() mỗi khung hình. null = kho đầy, vẽ trực tiếp.
    this.sprite = SP.halfSprite(f.type, this.cut, side);
  }

  /** Trả các ô sprite nửa quả về kho rồi dọn danh sách. */
  function clearHalves() {
    for (let i = 0; i < G.halves.length; i++) SP.freeHalf(G.halves[i].sprite);
    G.halves.length = 0;
  }

  function addText(text, x, y, o) {
    const t = { text: text, x: x, y: y, vy: -55, life: 1.1, max: 1.1, size: G.R * 0.85, color: '#fff', stroke: 'rgba(30,20,50,0.85)', t: 0 };
    if (o) for (const k in o) t[k] = o[k];
    t.max = t.life;
    G.texts.push(t);
  }

  function addPart(p) {
    const cap = Motion.lite ? MAX_PARTS_LITE : MAX_PARTS;
    if (G.parts.length >= cap) G.parts.splice(0, Math.min(20, G.parts.length));   // bỏ theo lô, rẻ hơn shift() từng hạt
    G.parts.push(p);
  }

  function spawnJuice(f, px, py, angle) {
    const col = SP.FRUITS[f.type].juice;
    const nDrop = fxCount(14), nSpark = fxCount(8);
    for (let i = 0; i < nDrop; i++) {
      const a = angle + (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2 + (Math.random() - 0.5) * 1.3;
      const sp = 100 + Math.random() * 320;
      const life = 0.5 + Math.random() * 0.5;
      addPart({ kind: 'drop', x: px + (Math.random() - 0.5) * f.r * 0.6, y: py + (Math.random() - 0.5) * f.r * 0.6,
        vx: Math.cos(a) * sp + f.vx * 0.3, vy: Math.sin(a) * sp + f.vy * 0.3,
        size: f.r * (0.06 + Math.random() * 0.1), color: col, life: life, max: life });
    }
    for (let i = 0; i < nSpark; i++) {
      const a = Math.random() * TAU, sp = 60 + Math.random() * 160;
      const life = 0.25 + Math.random() * 0.25;
      addPart({ kind: 'spark', x: px, y: py, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, size: f.r * 0.05, color: '#ffffff', life: life, max: life });
    }
  }

  function spawnStain(f) {
    const col = SP.FRUITS[f.type].juice;
    const blobs = [];
    const n = 5 + rnd(0, 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, d = Math.random() * f.r * 0.75;
      blobs.push({ dx: Math.cos(a) * d, dy: Math.sin(a) * d, r: f.r * (0.22 + Math.random() * 0.3) });
    }
    if (G.stains.length >= MAX_STAINS) G.stains.shift();
    G.stains.push({ x: f.x, y: f.y, color: col, blobs: blobs, life: 3.2, max: 3.2 });
  }

  function spawnPuff(x, y, r, color, n) {
    n = fxCount(n);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, sp = 20 + Math.random() * 60;
      addPart({ kind: 'puff', x: x + (Math.random() - 0.5) * r, y: y + (Math.random() - 0.5) * r, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20,
        size: r * (0.25 + Math.random() * 0.3), grow: r * 0.6, color: color, life: 0.35 + Math.random() * 0.3, max: 0.6 });
    }
  }

  function spawnExplosion(x, y, r) {
    const nSpark = fxCount(36), nPuff = fxCount(12);
    for (let i = 0; i < nSpark; i++) {
      const a = Math.random() * TAU, sp = 200 + Math.random() * 500;
      addPart({ kind: 'spark', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size: r * (0.05 + Math.random() * 0.08),
        color: pick(['#ffd166', '#ff9f1c', '#ff5400', '#ffffff']), life: 0.4 + Math.random() * 0.5, max: 0.9 });
    }
    for (let i = 0; i < nPuff; i++) {
      const a = Math.random() * TAU, sp = 40 + Math.random() * 120;
      addPart({ kind: 'puff', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, size: r * (0.4 + Math.random() * 0.5), grow: r * 1.2,
        color: pick(['#555', '#777', '#999']), life: 0.6 + Math.random() * 0.5, max: 1.1 });
    }
  }

  function spawnHeartBurst(x, y, r) {
    const n = fxCount(16);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, sp = 80 + Math.random() * 220;
      addPart({ kind: 'heart', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, size: r * (0.15 + Math.random() * 0.2), color: pick(['#ff6b8b', '#ff8fb1', '#ffc2d1']), life: 0.7 + Math.random() * 0.5, max: 1.2 });
    }
  }

  function spawnConfetti(n) {
    const cols = ['#ff6b35', '#ffd166', '#06d6a0', '#118ab2', '#ef476f', '#7b5ea7', '#2ec4b6'];
    n = fxCount(n);
    for (let i = 0; i < n; i++) {
      addPart({ kind: 'confetti', x: Math.random() * G.W, y: -20 - Math.random() * G.H * 0.5, vx: (Math.random() - 0.5) * 80, vy: 80 + Math.random() * 160,
        size: 6 + Math.random() * 8, color: pick(cols), rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 8, life: 4 + Math.random() * 2, max: 6, sway: Math.random() * TAU });
    }
  }

  /* ================= PHÓNG QUẢ ================= */
  /** Chia bề ngang thành n ô, mỗi quả một ô. Trả về { xs, slotW } – ô hẹp thì bớt xê dịch để quả không chồng nhau. */
  function lanes(n) {
    const margin = G.W * 0.1 + G.R;
    const span = Math.max(G.R * 2, G.W - 2 * margin);
    const slotW = span / n;
    const minGap = G.R * 2.3;
    const jitter = clamp((slotW - minGap) / slotW, 0, 0.7);
    const order = shuffle(Array.from({ length: n }, function (_, i) { return i; }));
    const xs = order.map(function (i) { return margin + slotW * (i + (1 - jitter) / 2 + Math.random() * jitter); });
    return { xs: xs, slotW: slotW, minGap: minGap };
  }

  /**
   * values: mảng số (null = quả trơn không có số). opts: { bomb, heart, lead, track }
   */
  function launchWave(values, opts) {
    opts = opts || {};
    const items = values.map(function (v) { return { kind: 'fruit', value: v }; });
    if (opts.bomb) items.push({ kind: 'bomb' });
    if (opts.heart) items.push({ kind: 'heart' });
    shuffle(items);
    const ln = lanes(items.length);
    const xs = ln.xs;
    if (opts.x != null && xs.length === 1) xs[0] = opts.x;
    const tight = ln.slotW < ln.minGap;
    const wave = opts.track ? { fruits: [], resolved: false, startTime: G.qStart, hint: false, bombed: false, visibleAt: -1 } : null;
    const H = G.H, W = G.W, g = G.gravity;
    // Đỉnh đường bay phải nằm dưới thanh HUD, nếu không quả bị thẻ phép tính che (màn hình ngang của điện thoại)
    const minApex = (inGame() ? G.hudBottom : 0) + G.R * 1.3;
    items.forEach(function (it, i) {
      const x = xs[i];
      const apexY = Math.min(H * 0.6, Math.max(minApex, H * 0.14) + Math.random() * H * 0.18);
      const y0 = H + G.R * 1.3;
      const f = new Fruit({
        kind: it.kind,
        value: it.value == null ? null : it.value,
        x: x, y: y0,
        vy: -Math.sqrt(2 * g * (y0 - apexY)),
        vx: (W / 2 - x) * (items.length >= 4 ? 0.06 : 0.12) + (Math.random() - 0.5) * W * 0.06,
        vr: (Math.random() - 0.5) * 3,
        rot: Math.random() * TAU,
        delay: (opts.lead || 0) + i * (tight ? 0.28 : 0.17) + Math.random() * 0.1,
        wave: wave
      });
      if (wave) wave.fruits.push(f);
      G.fruits.push(f);
    });
    if (wave) G.wave = wave;
    return wave;
  }

  /* ================= LUỒNG CÂU HỎI ================= */
  /** Khóa nhận dạng một câu (dùng cho kho ôn lại). */
  function keyForInfo(info) {
    if (!info) return '';
    if (Array.isArray(info.pair)) {
      return 'p:' + info.op + ':' + info.target + ':' + info.pair.slice().sort(function (x, y) { return x - y; }).join(',');
    }
    return 'a:' + info.a + info.op + info.b;
  }

  /** Gắn key/info cho câu hỏi hiện tại để ghi vào kho ôn lại. */
  function tagQuestion(q) {
    if (!q || !G.level) return q;
    q.info = G.mode === 'answer'
      ? { a: q.a, b: q.b, op: q.op, max: q.max, level: G.level.id }
      : { target: q.target, op: q.op, pair: q.pair.slice(), lo: q.lo, hi: q.hi, step: q.step, level: G.level.id };
    if (q.info.step == null) delete q.info.step;
    q.key = keyForInfo(q.info);
    return q;
  }

  /** Khoảng 1/4 số câu lấy từ kho "cần ôn lại" của bé (tối đa 3 câu mỗi ván). */
  function pickQuestion() {
    const lvl = G.level;
    const pool = Store.reviewPool(function (info) { return info && info.level === lvl.id; });
    if (pool.length && G.reviewUsed < 3 && G.asked >= 1 && chance(0.25)) {
      const it = pool[G.reviewUsed % pool.length];
      const inf = it.info;
      let q = null;
      if (G.mode === 'answer' && !Array.isArray(inf.pair)) q = MG.make(inf.a, inf.b, inf.op, inf.max);
      else if (G.mode === 'pair' && Array.isArray(inf.pair)) {
        q = { target: inf.target, op: inf.op, pair: inf.pair.slice(), lo: inf.lo, hi: inf.hi };
        if (inf.step) q.step = inf.step;
      }
      if (q) { q.review = true; G.reviewUsed++; return tagQuestion(q); }
    }
    return tagQuestion(lvl.gen());
  }

  function newQuestion() {
    G.misses = 0;
    G.held = null;
    ui.hint.hidden = true;
    clearTimeout(revealAnswer._t);
    G.question = pickQuestion();
    G.asked++;
    G.qStart = G.time;
    renderQuestionCard(true);
    Sfx.play('question');
    Voice.say(questionSpeech(), { queue: true });
    // Số lớn cần thời gian đọc và nhẩm: cho bé gần 1,5 giây trước khi quả bay lên
    const slow = (G.level && G.level.big) || (G.mode === 'answer' && G.question.max >= 1000);
    launchForQuestion(slow ? 1.4 : 0.45);
  }

  /** Đánh dấu quả đúng bằng vòng vàng (sau 2 lần lỡ hoặc khi bé bấm 💡) và ghi câu này vào kho ôn lại.
      byButton = bé chủ động xin gợi ý. Dù cách nào, câu này chỉ còn 50 điểm (xem onCorrect). */
  function markHint(wave, byButton) {
    const q = G.question;
    if (!wave || !q) return;
    wave.hint = true;
    const want = G.mode === 'answer' ? [q.answer] : q.pair.slice();
    wave.fruits.forEach(function (f) {
      if (f.kind !== 'fruit') return;
      const idx = want.indexOf(f.value);
      if (idx >= 0) { f.hint = true; want.splice(idx, 1); }
    });
    if (!q.hintNoted) {
      q.hintNoted = true;
      // Chỉ để nhìn từ ngoài vào (window.__NinjaToan trong tests/e2e): trò chơi dùng thẳng
      // tham số byButton ở ngay dưới, không đọc lại trường này.
      q.hintByButton = !!byButton;
      const txt = G.mode === 'answer' ? q.text + ' = ' + q.answer : MG.pairResultText(q, q.pair[0], q.pair[1]);
      const why = G.mode === 'answer' ? MG.explain(q) : '';
      // Bé tự bấm 💡 thì khen; máy tự bật vòng vàng sau 2 lần lỡ thì nói rõ vì sao
      const lead = byButton ? '💡 ' : '💡 Lỡ 2 lần rồi, đáp án là: ';
      showHint(lead + txt + (why ? ' · ' + why : ''));
      Voice.say((byButton ? 'Gợi ý: ' : 'Đáp án là ') + speakMath(txt), { queue: true });
      Store.noteMissed(q.key, q.info);
      noteReview(txt);
    }
    // Đợt quả bay lại vẫn giữ nguyên "ai xin gợi ý" của câu hỏi này (dành cho debug hook)
    wave.hintByButton = !!q.hintByButton;
    syncHintBtn(true);
  }

  /** Nút 💡 chỉ bật khi đợt quả hiện tại chưa được giải và chưa dùng gợi ý. */
  function syncHintBtn(force) {
    if (!ui.btnHint) return;
    const on = G.state === 'playing' && !!G.wave && !G.wave.resolved && !G.wave.hint;
    if (!force && G.hud.hintOn === on) return;
    G.hud.hintOn = on;
    ui.btnHint.disabled = !on;
  }

  function launchForQuestion(lead) {
    const lvl = G.level;
    const maxByWidth = Math.max(3, Math.floor((G.W - G.W * 0.2) / (G.R * 2.6)));
    let count = Math.min(6, maxByWidth, lvl.fruits + (G.stage >= 4 ? 1 : 0) + (G.stage >= 7 ? 1 : 0));
    if (G.mode === 'answer' && G.question.max >= 1000) count = Math.min(count, 4);   // số 4 chữ số cần chỗ để đọc
    let values;
    if (G.mode === 'answer') {
      values = shuffle([G.question.answer].concat(MG.distractors(G.question, count - 1)));
    } else {
      values = MG.pairWave(G.question, count);
    }
    const bombP = Math.min(0.35, lvl.bomb + 0.03 * (G.stage - 1));
    const bomb = G.correct >= 2 && chance(bombP);
    const heart = G.hearts < MAX_HEARTS && chance(0.16);
    const wave = launchWave(values, { bomb: bomb, heart: heart, lead: lead, track: true });
    // Đã lỡ 2 lần, hoặc bé đã bấm 💡: đợt quả mới vẫn giữ vòng vàng chỉ đáp án
    if (G.misses >= 2 || (G.question && G.question.hintNoted)) markHint(wave);
    else syncHintBtn(true);
  }

  /** Ghi một phép tính vào danh sách "Cần ôn lại" của ván này (hiện ở màn kết quả). */
  function noteReview(text) {
    if (!text) return;
    if (G.missedList.indexOf(text) < 0) G.missedList.push(text);
    if (G.missedList.length > 20) G.missedList.shift();
  }

  function renderQuestionCard(pop) {
    const q = G.question;
    if (!q) return;
    let html;
    if (G.mode === 'answer') html = esc(q.text) + ' = <span class="q">?</span>';
    else html = MG.pairText(q, G.held, G.heldForm);
    ui.question.innerHTML = html;
    if (ui.review) ui.review.hidden = !q.review;
    ui.question.classList.remove('ok', 'shake');
    if (pop) {
      ui.question.classList.remove('pop');
      void ui.question.offsetWidth;
      ui.question.classList.add('pop');
    }
  }

  /** Dải thông báo gợi ý dưới đồng hồ (đáp án đúng, lý do sai...).
      Câu dài phải ở lại lâu hơn để bé kịp đọc: ~110 ms cho mỗi chữ, lời giải thích sai ít nhất 3,5 s. */
  function showHint(text, kind, ms) {
    const el = ui.hint;
    text = String(text);
    el.textContent = text;
    el.className = 'hint ' + (kind || '');
    el.hidden = false;
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
    let dur = ms || Math.max(2600, 800 + text.length * 110);
    if (!ms && kind === 'bad') dur = Math.max(3500, dur);
    clearTimeout(showHint._t);
    showHint._t = setTimeout(function () { el.hidden = true; }, Math.min(9000, dur));
  }

  /** Hiện luôn đáp án đúng ngay trong thẻ phép tính (1,5 s) khi bé chém sai. */
  function revealAnswer(q) {
    if (G.mode !== 'answer' || !q) return;
    ui.question.innerHTML = esc(q.text) + ' = <span class="q reveal">' + esc(String(q.answer)) + '</span>';
    clearTimeout(revealAnswer._t);
    revealAnswer._t = setTimeout(function () {
      if (G.question === q && G.state === 'playing') renderQuestionCard(false);
    }, 1500);
  }

  function cardFx(cls) {
    ui.question.classList.remove('ok', 'shake', 'pop');
    void ui.question.offsetWidth;
    ui.question.classList.add(cls);
    clearTimeout(cardFx._t);
    cardFx._t = setTimeout(function () { ui.question.classList.remove('ok', 'shake'); }, 600);
  }

  function popFruit(f) {
    if (f.dead) return;
    if (!f.launched) { f.dead = true; return; }
    if (f.popping > 0) return;
    f.popping = POP_T;
    spawnPuff(f.x, f.y, f.r, 'rgba(255,255,255,0.8)', 4);
  }

  function popOthers(except) {
    G.fruits.forEach(function (f) {
      if (f === except || f.dead || f.kind === 'heart') return;
      popFruit(f);
    });
  }

  function multiplier() { return 1 + Math.min(3, Math.floor(G.streak / 3)); }

  function addScore(pts) {
    G.score += pts;
  }

  function onCorrect(f) {
    G.correct++;
    // Câu đã xem gợi ý: vẫn khen nhưng chỉ 50 điểm và không tăng chuỗi combo
    const hinted = !!(G.wave && G.wave.hint);
    if (!hinted) {
      G.streak++;
      if (G.streak > G.bestStreak) G.bestStreak = G.streak;
    }
    // Thưởng nhanh tính từ lúc quả đầu tiên hiện ra, không phải lúc ra câu hỏi (quả còn đang bay lên)
    const t0 = G.wave && G.wave.visibleAt >= 0 ? G.wave.visibleAt : G.qStart;
    const elapsed = G.time - t0;
    const mult = multiplier();
    const speedBonus = hinted ? 0 : elapsed < 2.0 ? 50 : elapsed < 4.0 ? 25 : 0;
    const pts = hinted ? 50 : 100 * mult + speedBonus;
    addScore(pts);
    G.wave.resolved = true;
    popOthers(f);
    addText('+' + pts + (hinted ? ' (gợi ý)' : ''), f.x, f.y - f.r * 0.2, { color: '#ffe066', size: G.R * 0.95, life: 1.0 });
    if (speedBonus === 50) {
      addText('⚡ Nhanh +50', f.x, f.y + f.r * 0.9, { color: '#ffd166', size: G.R * 0.7, life: 1.1, vy: -35 });
      Sfx.play('combo');
    }
    const praise = G.streak > 0 && G.streak % 3 === 0 && mult > 1 ? 'Combo x' + mult + '!' : pick(PRAISE);
    addText(praise, f.x, f.y - f.r * 1.3, { color: praise.indexOf('Combo') === 0 ? '#ff9f1c' : '#7bf1a8', size: G.R * 1.05, life: 1.2 });
    if (praise.indexOf('Combo') === 0) Sfx.play('combo'); else Sfx.play('correct');
    Voice.say(praise.indexOf('Combo') === 0 ? 'Combo nhân ' + mult + '!' : praise);
    cardFx('ok');
    if (!Motion.lite) G.flash = { c: '120,255,180', a: 0.18 };
    if (G.wave && !G.wave.hint && G.question && G.question.key) Store.noteOk(G.question.key);
    const newStage = 1 + Math.floor(G.correct / 5);
    if (newStage > G.stage) {
      G.stage = newStage;
      updateGravity();
      // Hoãn nửa giây để bảng "Màn N!" không đè lên lời khen và điểm cộng
      G.stageBannerAt = G.time + 0.5;
    }
    G.nextQuestionAt = G.time + 0.75;
  }

  /** Bảng "Màn N!" giữa màn hình, phát sau khi lời khen bay lên. */
  function showStageBanner() {
    addText('Màn ' + G.stage + '!', G.W / 2, G.H * 0.3, { color: '#ffd166', stroke: 'rgba(43,45,66,0.95)', size: G.R * 1.7, life: 1.6, vy: -25 });
    addText('Nhanh hơn nào!', G.W / 2, G.H * 0.3 + G.R * 1.4, { color: '#fff', stroke: 'rgba(43,45,66,0.95)', size: G.R * 0.8, life: 1.6, vy: -25 });
    Sfx.play('stage');
    spawnConfetti(30);
    ui.stage.classList.remove('pop');
    void ui.stage.offsetWidth;
    ui.stage.classList.add('pop');
  }

  function loseHeart() {
    G.hearts = Math.max(0, G.hearts - 1);
    ui.hearts.classList.remove('hit');
    void ui.hearts.offsetWidth;
    ui.hearts.classList.add('hit');
    if (G.hearts <= 0) endGame('nolife');
  }

  function onWrong(f, hint) {
    G.wrong++;
    G.streak = 0;
    addText('Sai rồi!', f.x, f.y - f.r * 1.2, { color: '#ff5c7a', size: G.R * 1.0, life: 1.1 });
    addText('✗', f.x, f.y, { color: '#ff2d55', size: G.R * 1.3, life: 0.8, vy: -20 });
    if (hint) showHint(hint, 'bad');
    Voice.say('Sai rồi! ' + (hint ? speakMath(hint) : ''));
    cardFx('shake');
    if (!Motion.lite) { G.flash = { c: '255,60,90', a: 0.25 }; G.shake = Math.max(G.shake, 0.45); }
    Sfx.play('wrong');
    loseHeart();
  }

  function onBomb(f) {
    Sfx.play('bomb');
    // Chớp trắng nhẹ hơn (0,5 thay vì 0,9) và không rung khi bé chọn "Hiệu ứng: Ít"
    if (!Motion.lite) { G.shake = 0.7; G.flash = { c: '255,255,255', a: 0.5, decay: 3 }; }
    spawnExplosion(f.x, f.y, f.r);
    addText('BÙM!', f.x, f.y - f.r, { color: '#ffb703', size: G.R * 1.5, life: 1.2 });
    Voice.say('Ối! Bom!');
    G.fruits.forEach(function (o) { if (o !== f && !o.dead) popFruit(o); });
    G.held = null;
    G.streak = 0;
    G.bombs++;                       // chém bom không phải là sai toán: không tính vào độ chính xác
    if (G.wave) G.wave.bombed = true;
    renderQuestionCard(false);
    loseHeart();
  }

  function onHeart(f) {
    Sfx.play('heart');
    spawnHeartBurst(f.x, f.y, f.r);
    if (G.hearts < MAX_HEARTS) {
      G.hearts++;
      addText('+1 ❤️', f.x, f.y - f.r, { color: '#ff8fb1', size: G.R * 1.0, life: 1.2 });
      Voice.say('Thêm một tim!');
      const spans = ui.hearts.children;
      const el = spans[G.hearts - 1];
      if (el) { el.classList.remove('gain'); void el.offsetWidth; el.classList.add('gain'); }
    } else {
      addScore(50);
      addText('+50', f.x, f.y - f.r, { color: '#ffe066', size: G.R * 0.9, life: 1.0 });
    }
  }

  function onAnswerSlice(f) {
    const q = G.question;
    if (f.value === q.answer) { onCorrect(f); return true; }
    // Sai thì vừa cho đáp án, vừa dạy cách làm ("vì sao") và gọi tên lỗi quen thuộc nếu nhận ra
    const miss = MG.misconception(q, f.value);
    const why = MG.explain(q);
    const tail = miss && why ? miss + ' ' + why : (miss || why);
    onWrong(f, q.text + ' = ' + q.answer + (tail ? ' · ' + tail : ''));
    revealAnswer(q);
    Store.noteMissed(q.key, q.info);
    noteReview(q.text + ' = ' + q.answer);
    return false;
  }

  function partnerInAir(v, except) {
    const q = G.question;
    return G.fruits.some(function (o) {
      return o !== except && !o.dead && o.popping <= 0 && o.kind === 'fruit' && o.value != null && MG.isPair(q, v, o.value);
    });
  }

  /** Bạn ghép của quả này có trong đợt vừa phóng không (kể cả quả đã rơi mất)? */
  function partnerInWave(f) {
    const q = G.question;
    return !!(G.wave && G.wave.fruits.some(function (o) {
      return o !== f && o.kind === 'fruit' && o.value != null && MG.isPair(q, f.value, o.value);
    }));
  }

  function onPairSlice(f) {
    const q = G.question;
    if (G.held == null) {
      if (!partnerInAir(f.value, f)) {
        if (partnerInWave(f)) {
          // Bạn của quả này đã rơi mất: không phạt tim, đợt quả sẽ bay lại
          addText('Lỡ mất bạn của ' + f.value + ' rồi!', clamp(f.x, G.R * 2, G.W - G.R * 2), f.y - f.r * 1.2, { color: '#dfe3ef', size: G.R * 0.8, life: 1.1 });
          Sfx.play('miss');
          if (G.relaunchAt < 0) G.relaunchAt = G.time + 0.35;
          return false;
        }
        const op = MG.opSymbol(q.op);
        const need = q.op === '+' ? q.target - f.value
          : q.op === '*' ? (f.value !== 0 && q.target % f.value === 0 ? q.target / f.value : null)
          : null;
        const pairTxt = q.op === '-'
          ? Math.max(q.pair[0], q.pair[1]) + ' ' + op + ' ' + Math.min(q.pair[0], q.pair[1]) + ' = ' + q.target
          : q.pair[0] + ' ' + op + ' ' + q.pair[1] + ' = ' + q.target;
        onWrong(f, (need != null && need > 0 ? f.value + ' cần ' + need + '. ' : '') + 'Cặp đúng: ' + pairTxt);
        Store.noteMissed(q.key, q.info);
        noteReview(MG.pairResultText(q, q.pair[0], q.pair[1]));
        return false;
      }
      G.held = f.value;
      if (q.op === '-') {
        const needA = f.value - q.target;
        const hasA = needA > 0 && G.fruits.some(function (o) { return o !== f && !o.dead && o.kind === 'fruit' && o.value === needA; });
        G.heldForm = hasA ? 'a' : 'b';
      } else {
        G.heldForm = 'a';
      }
      renderQuestionCard(true);
      Sfx.play('pop');
      const need = q.op === '+' ? q.target - f.value
        : q.op === '*' ? q.target / f.value
        : (G.heldForm === 'a' ? f.value - q.target : f.value + q.target);
      addText('Tìm số ' + need + '!', f.x, f.y - f.r * 1.2, { color: '#5ce1e6', size: G.R * 0.95, life: 1.2 });
      Voice.say('Tìm số ' + need + '!');
      return false;
    }
    if (MG.isPair(q, G.held, f.value)) {
      const first = G.held;
      G.held = null;
      onCorrect(f);
      const txt = MG.pairResultText(q, first, f.value);
      showHint(txt + ' ✓', 'ok');
      Voice.say(speakMath(txt), { queue: true });
      return true;
    }
    const first = G.held;
    G.held = null;
    // Vừa chỉ ra phép tính sai, vừa dạy luôn cặp đúng để bé biết đường làm lại
    onWrong(f, MG.pairResultText(q, first, f.value) + ', không phải ' + q.target +
      ' · Cặp đúng: ' + MG.pairResultText(q, q.pair[0], q.pair[1]));
    Store.noteMissed(q.key, q.info);
    noteReview(MG.pairResultText(q, q.pair[0], q.pair[1]));
    renderQuestionCard(false);
    return false;
  }

  /* ================= CHÉM ================= */
  function segCircle(x0, y0, x1, y1, cx, cy, r) {
    const dx = x1 - x0, dy = y1 - y0;
    const len2 = dx * dx + dy * dy;
    let t = 0;
    if (len2 > 0) t = clamp(((cx - x0) * dx + (cy - y0) * dy) / len2, 0, 1);
    const px = x0 + dx * t - cx, py = y0 + dy * t - cy;
    return px * px + py * py <= r * r ? t : -1;
  }

  function canSlice() {
    return G.state === 'playing' || G.state === 'menu' || G.state === 'levels';
  }

  /** Bổ đôi quả (chỉ hình ảnh + âm thanh, không tính điểm/lỗi). */
  function splitVisual(f, angle, px, py) {
    if (f.dead) return;
    f.dead = true;
    G.halves.push(new Half(f, angle, 1), new Half(f, angle, -1));
    spawnJuice(f, px, py, angle);
    spawnStain(f);
    Sfx.play('splat');
  }

  /**
   * Một nhát vuốt qua nhiều quả được xử lý MỘT LẦN cho cả nhóm:
   * bom được ưu tiên; nếu có quả đúng thì tính đúng; nếu toàn quả sai chỉ mất 1 tim.
   * blade (có thể null) dùng để chặn mất 2 tim trong cùng một đường vuốt.
   */
  function sliceSegment(blade, x0, y0, x1, y1) {
    const hits = [];
    for (let i = 0; i < G.fruits.length; i++) {
      const f = G.fruits[i];
      if (!f.launched || f.dead || f.popping > 0) continue;
      const t = segCircle(x0, y0, x1, y1, f.x, f.y, f.r * 0.98);
      if (t >= 0) hits.push({ f: f, t: t });
    }
    if (!hits.length) return;
    hits.sort(function (a, b) { return a.t - b.t; });
    const angle = Math.atan2(y1 - y0, x1 - x0);
    const at = function (h) { return { x: x0 + (x1 - x0) * h.t, y: y0 + (y1 - y0) * h.t }; };
    const playing = G.state === 'playing';

    // 1) Bom luôn thắng: nổ và bỏ qua phần còn lại của nhát vuốt
    const bomb = hits.find(function (h) { return h.f.kind === 'bomb'; });
    if (bomb) { sliceFruit(bomb.f, angle, at(bomb).x, at(bomb).y); return; }

    // 2) Tim: ăn ngay, không ảnh hưởng phần còn lại
    hits.filter(function (h) { return h.f.kind === 'heart'; })
      .forEach(function (h) { sliceFruit(h.f, angle, at(h).x, at(h).y); });
    const fr = hits.filter(function (h) { return h.f.kind === 'fruit'; });
    if (!fr.length) return;
    if (!playing) { fr.forEach(function (h) { splitVisual(h.f, angle, at(h).x, at(h).y); }); return; }

    const wrongOk = function () {
      // Cùng một đường vuốt không được lấy 2 tim (ngón tay quét ngang qua cả hàng quả)
      if (!blade) return true;
      const now = performance.now();
      if (now - (blade.lastWrongAt || 0) < 150) return false;
      blade.lastWrongAt = now;
      return true;
    };

    if (G.mode === 'answer') {
      const good = fr.find(function (h) { return h.f.value === G.question.answer; });
      if (good) {
        fr.forEach(function (h) { if (h !== good) splitVisual(h.f, angle, at(h).x, at(h).y); });
        sliceFruit(good.f, angle, at(good).x, at(good).y);
        return;
      }
      const first = fr[0];
      fr.forEach(function (h) { if (h !== first) splitVisual(h.f, angle, at(h).x, at(h).y); });
      if (wrongOk()) sliceFruit(first.f, angle, at(first).x, at(first).y);
      else splitVisual(first.f, angle, at(first).x, at(first).y);
      return;
    }

    // Ghép đôi: tìm cặp hợp lệ trong nhóm quả vừa chém
    const q = G.question;
    let target = null;
    if (G.held != null) target = fr.find(function (h) { return MG.isPair(q, G.held, h.f.value); }) || null;
    if (target) {
      fr.forEach(function (h) { if (h !== target) splitVisual(h.f, angle, at(h).x, at(h).y); });
      sliceFruit(target.f, angle, at(target).x, at(target).y);
      return;
    }
    if (G.held == null) {
      for (let i = 0; i < fr.length && !target; i++) {
        for (let k = i + 1; k < fr.length; k++) {
          if (MG.isPair(q, fr[i].f.value, fr[k].f.value)) {
            sliceFruit(fr[i].f, angle, at(fr[i]).x, at(fr[i]).y);      // quả thứ nhất: giữ lại
            target = fr[k];
            break;
          }
        }
      }
      if (target) {
        fr.forEach(function (h) { if (h !== target && !h.f.dead) splitVisual(h.f, angle, at(h).x, at(h).y); });
        sliceFruit(target.f, angle, at(target).x, at(target).y);
        return;
      }
    }
    const first = fr[0];
    fr.forEach(function (h) { if (h !== first) splitVisual(h.f, angle, at(h).x, at(h).y); });
    if (wrongOk()) sliceFruit(first.f, angle, at(first).x, at(first).y);
    else splitVisual(first.f, angle, at(first).x, at(first).y);
  }

  function sliceFruit(f, angle, px, py) {
    f.dead = true;
    if (f.kind === 'bomb') {
      if (G.state === 'playing') { onBomb(f); return true; }
      spawnExplosion(f.x, f.y, f.r);
      Sfx.play('bomb');
      if (!Motion.lite) G.shake = Math.max(G.shake, 0.5);
      return false;
    }
    if (f.kind === 'heart') {
      if (G.state === 'playing') onHeart(f); else { spawnHeartBurst(f.x, f.y, f.r); Sfx.play('heart'); }
      return false;
    }
    G.halves.push(new Half(f, angle, 1), new Half(f, angle, -1));
    spawnJuice(f, px, py, angle);
    spawnStain(f);
    Sfx.play('splat');
    if (G.state !== 'playing' || f.value == null) return false;
    return G.mode === 'answer' ? onAnswerSlice(f) : onPairSlice(f);
  }

  /* ================= CẬP NHẬT ================= */
  function onFruitFell(f) {
    if (G.state !== 'playing' || f.kind !== 'fruit' || f.value == null || !f.wave || f.wave.resolved) return;
    const q = G.question;
    if (G.mode === 'answer') {
      if (f.value === q.answer) {
        addText('Lỡ rồi!', clamp(f.x, G.R * 2, G.W - G.R * 2), G.H - G.R * 2.2, { color: '#dfe3ef', size: G.R * 0.8, life: 0.9 });
        Sfx.play('miss');
      }
    } else if (G.held != null) {
      if (!partnerInAir(G.held, null)) {
        G.held = null;
        renderQuestionCard(false);
        addText('Lỡ mất rồi!', clamp(f.x, G.R * 2, G.W - G.R * 2), G.H - G.R * 2.2, { color: '#dfe3ef', size: G.R * 0.8, life: 0.9 });
        Sfx.play('miss');
      }
    } else if (q.pair.indexOf(f.value) >= 0 && !partnerInAir(f.value, f)) {
      // Cả hai quả của cặp đúng đều rơi mất mà bé chưa chém quả nào
      addText('Lỡ rồi!', clamp(f.x, G.R * 2, G.W - G.R * 2), G.H - G.R * 2.2, { color: '#dfe3ef', size: G.R * 0.8, life: 0.9 });
      Sfx.play('miss');
      if (!Store.data.seenTip) {
        Store.data.seenTip = true;
        Store.save();
        toast('Không sao, quả sẽ bay lại!');
        Voice.say('Không sao, quả sẽ bay lại!', { queue: true });
      }
    }
  }

  function updateFruits(dt) {
    const g = G.gravity, H = G.H;
    const arr = G.fruits;
    let w = 0;
    for (let i = 0; i < arr.length; i++) {
      const f = arr[i];
      if (f.dead) continue;
      if (!f.launched) {
        f.delay -= dt;
        if (f.delay <= 0) { f.launched = true; if (G.state !== 'over') Sfx.play('launch'); }
        else { arr[w++] = f; continue; }
      }
      if (f.popping > 0) {
        f.popping -= dt;
        f.scale = Math.max(0.01, f.popping / POP_T);
        if (f.popping <= 0) { f.dead = true; continue; }
        arr[w++] = f;
        continue;
      }
      f.vy += g * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.rot += f.vr * dt;
      if (f.wave && f.wave.visibleAt < 0 && f.y < H - f.r) f.wave.visibleAt = G.time;
      if (f.vy > 0 && f.y - f.r > H + 10) { f.dead = true; onFruitFell(f); continue; }
      arr[w++] = f;
    }
    arr.length = w;
  }

  function updateHalves(dt) {
    const g = G.gravity, arr = G.halves;
    let w = 0;
    for (let i = 0; i < arr.length; i++) {
      const h = arr[i];
      h.vy += g * dt;
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      h.rot += h.vr * dt;
      if (h.y - h.r * 1.5 < G.H) arr[w++] = h;
      else SP.freeHalf(h.sprite);
    }
    arr.length = w;
  }

  function updateParts(dt) {
    const g = G.gravity, arr = G.parts;
    let w = 0;
    for (let i = 0; i < arr.length; i++) {
      const p = arr[i];
      p.life -= dt;
      if (p.life <= 0) continue;
      if (p.kind === 'drop' || p.kind === 'spark' || p.kind === 'heart') {
        p.vy += g * (p.kind === 'heart' ? 0.5 : 0.9) * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
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

  function updateStains(dt) {
    const arr = G.stains;
    let w = 0;
    for (let i = 0; i < arr.length; i++) {
      const s = arr[i];
      s.life -= dt;
      if (s.life > 0) arr[w++] = s;
    }
    arr.length = w;
  }

  function updateClouds(dt) {
    for (let i = 0; i < G.clouds.length; i++) {
      const c = G.clouds[i];
      c.x += c.v * dt;
      if (c.x > G.W + 160 * c.s) { c.x = -160 * c.s; c.y = G.H * (0.04 + Math.random() * 0.4); }
    }
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
    if (G.stageBannerAt >= 0 && G.time >= G.stageBannerAt) { G.stageBannerAt = -1; showStageBanner(); }
    if (G.nextQuestionAt >= 0 && G.time >= G.nextQuestionAt) { G.nextQuestionAt = -1; newQuestion(); }
    if (G.relaunchAt >= 0 && G.time >= G.relaunchAt) {
      G.relaunchAt = -1;
      // Chém trúng bom không tính là "lỡ" (không tiến tới vòng gợi ý)
      if (!(G.wave && G.wave.bombed)) G.misses++;
      launchForQuestion(0.1);
    }
    updateFruits(dt);
    if (G.state !== 'playing') return;
    if (G.wave && !G.wave.resolved && G.relaunchAt < 0 && G.nextQuestionAt < 0) {
      let allDead = true;
      for (let i = 0; i < G.wave.fruits.length; i++) if (!G.wave.fruits[i].dead) { allDead = false; break; }
      if (allDead) {
        G.relaunchAt = G.time + 0.35;
        if (G.held != null) { G.held = null; renderQuestionCard(false); }
      }
    }
  }

  /** Quả trang trí nên bay ở hai bên bảng menu, không chui sau bảng (đo 1 lần mỗi lần phóng, không mỗi khung hình). */
  function attractX() {
    const scr = G.state === 'levels' ? ui.levels : ui.menu;
    const panel = scr && scr.querySelector('.panel');
    if (!panel) return null;
    let r;
    try { r = panel.getBoundingClientRect(); } catch (e) { return null; }
    const pad = G.R * 1.3;
    const left = r.left - 2 * pad, right = G.W - r.right - 2 * pad;
    const okL = left > 0, okR = right > 0;
    if (!okL && !okR) return null;                      // bảng chiếm hết bề ngang: cứ bay như cũ
    const useLeft = okL && (!okR || Math.random() < 0.5);
    return useLeft ? pad + Math.random() * left : r.right + pad + Math.random() * right;
  }

  function updateAttract(dt) {
    G.attractT -= dt;
    let alive = 0;
    for (let i = 0; i < G.fruits.length; i++) if (!G.fruits[i].dead) alive++;
    if (G.attractT <= 0 && alive < 3) {
      G.attractT = 1.3 + Math.random() * 1.4;
      launchWave([null], { lead: 0, track: false, x: attractX() });
    }
    updateFruits(dt);
  }

  function update(dt) {
    G.anim += dt;
    updateClouds(dt);
    if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 2.2);
    if (G.flash) { G.flash.a -= dt * (G.flash.decay || 1.6); if (G.flash.a <= 0) G.flash = null; }

    if (G.state === 'playing') updatePlaying(dt);
    else if (G.state === 'menu' || G.state === 'levels') updateAttract(dt);
    else if (G.state === 'over' || G.state === 'countdown') updateFruits(dt);

    if (G.state !== 'paused') {
      updateHalves(dt);
      updateParts(dt);
      updateTexts(dt);
      updateStains(dt);
    }
    if (G.state === 'over' && !G.resultShown && G.anim >= G.overAt) showResults();
    syncHud();
  }

  /* ================= VẼ ================= */
  function drawSun(c) {
    const s = G.sun;
    c.save();
    c.translate(s.x, s.y);
    c.rotate(G.anim * 0.06);
    c.fillStyle = 'rgba(255,238,140,0.16)';
    const L = Math.max(G.W, G.H) * 1.5;
    c.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12;
      c.moveTo(0, 0);
      c.lineTo(Math.cos(a - 0.1) * L, Math.sin(a - 0.1) * L);
      c.lineTo(Math.cos(a + 0.1) * L, Math.sin(a + 0.1) * L);
    }
    c.closePath();
    c.fill();
    c.rotate(-G.anim * 0.06);
    if (!G.sunGlow) {
      G.sunGlow = c.createRadialGradient(0, 0, s.r * 0.6, 0, 0, s.r * 2.6);
      G.sunGlow.addColorStop(0, 'rgba(255,240,150,0.55)');
      G.sunGlow.addColorStop(1, 'rgba(255,240,150,0)');
    }
    c.fillStyle = G.sunGlow;
    c.beginPath(); c.arc(0, 0, s.r * 2.6, 0, TAU); c.fill();
    c.fillStyle = '#ffe66d';
    c.beginPath(); c.arc(0, 0, s.r, 0, TAU); c.fill();
    c.fillStyle = '#fff7b8';
    c.beginPath(); c.arc(-s.r * 0.25, -s.r * 0.25, s.r * 0.5, 0, TAU); c.fill();
    c.restore();
  }

  function drawClouds(c) {
    const base = Math.min(G.W, G.H) * 0.06;
    c.fillStyle = 'rgba(255,255,255,0.93)';
    for (let i = 0; i < G.clouds.length; i++) {
      const cl = G.clouds[i];
      c.beginPath();
      for (let k = 0; k < cl.puffs.length; k++) {
        const p = cl.puffs[k];
        const r = p.r * base * cl.s;
        const x = cl.x + p.dx * base * cl.s, y = cl.y + p.dy * base * cl.s;
        c.moveTo(x + r, y);
        c.arc(x, y, r, 0, TAU);
      }
      c.fill();
    }
  }

  function drawStains(c) {
    for (let i = 0; i < G.stains.length; i++) {
      const s = G.stains[i];
      const a = Math.min(1, s.life / s.max * 1.4) * 0.55;
      c.globalAlpha = a;
      c.fillStyle = s.color;
      c.beginPath();
      for (let k = 0; k < s.blobs.length; k++) {
        const b = s.blobs[k];
        c.moveTo(s.x + b.dx + b.r, s.y + b.dy);
        c.arc(s.x + b.dx, s.y + b.dy, b.r, 0, TAU);
      }
      c.fill();
    }
    c.globalAlpha = 1;
  }

  const FONT_CACHE = {};
  function numFont(size) {
    const k = size | 0;
    if (!FONT_CACHE[k]) FONT_CACHE[k] = '800 ' + k + 'px ' + FONT;
    return FONT_CACHE[k];
  }

  function drawNumber(c, v, x, y, r) {
    const s = String(v);
    // Số 3–4 chữ số chỉ thu nhỏ vừa đủ (0,84 / 0,72) để vẫn đọc được trên quả nhỏ
    const size = r * (s.length <= 2 ? 1.0 : s.length === 3 ? 0.84 : 0.72);
    c.font = numFont(Math.round(size));
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineJoin = 'round';
    c.lineWidth = Math.max(2.5, r * 0.13);
    c.strokeStyle = 'rgba(25,20,40,0.9)';
    c.strokeText(s, x, y + r * 0.05);
    c.fillStyle = '#fff';
    c.fillText(s, x, y + r * 0.05);
  }

  function drawSpark(c, f) {
    const lx = f.r * 0.62, ly = -f.r * 1.22;
    const cs = Math.cos(f.rot), sn = Math.sin(f.rot);
    const x = f.x + (lx * cs - ly * sn) * f.scale, y = f.y + (lx * sn + ly * cs) * f.scale;
    c.strokeStyle = '#ffd166';
    c.lineWidth = 2;
    c.lineCap = 'round';
    c.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = Math.random() * TAU, l = f.r * (0.12 + Math.random() * 0.22);
      c.moveTo(x, y);
      c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    }
    c.stroke();
    c.fillStyle = '#fff3b0';
    c.beginPath(); c.arc(x, y, f.r * 0.1 * (0.8 + Math.random() * 0.5), 0, TAU); c.fill();
  }

  /** Vỏ quả (không có số) – số được vẽ ở lượt sau để quả bên cạnh không che mất chữ. */
  function drawFruitSkin(c, f) {
    if (!f.launched) return;
    const sc = f.scale;
    if (f.kind === 'bomb') { SP.draw(c, SP.bomb, f.x, f.y, f.rot, sc); drawSpark(c, f); return; }
    if (f.kind === 'heart') {
      const pulse = Motion.lite ? 1 : 1 + 0.08 * Math.sin(G.anim * 8 + f.x);
      SP.draw(c, SP.heart, f.x, f.y, Motion.lite ? 0 : Math.sin(G.anim * 3 + f.x) * 0.15, sc * pulse);
      return;
    }
    if (f.hint) {
      const pr = f.r * (Motion.lite ? 1.25 : 1.25 + 0.08 * Math.sin(G.anim * 7));
      c.strokeStyle = 'rgba(255,214,102,0.9)';
      c.lineWidth = Math.max(3, f.r * 0.12);
      c.beginPath(); c.arc(f.x, f.y, pr, 0, TAU); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.6)';
      c.lineWidth = Math.max(1.5, f.r * 0.05);
      c.beginPath(); c.arc(f.x, f.y, pr + f.r * 0.12, 0, TAU); c.stroke();
    }
    SP.draw(c, SP.fruits[f.type].skin, f.x, f.y, f.rot, sc);
  }

  function drawFruitNumber(c, f) {
    if (!f.launched || f.kind !== 'fruit' || f.value == null || f.scale <= 0.5) return;
    drawNumber(c, f.value, f.x, f.y, f.r * f.scale);
  }

  function drawParts(c) {
    for (let i = 0; i < G.parts.length; i++) {
      const p = G.parts[i];
      const a = Math.min(1, p.life / p.max * 1.6);
      c.globalAlpha = a;
      c.fillStyle = p.color;
      if (p.kind === 'confetti') {
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.rot);
        c.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        c.restore();
      } else if (p.kind === 'heart') {
        c.font = numFont(Math.round(p.size * 2));
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('♥', p.x, p.y);
      } else if (p.kind === 'puff') {
        c.beginPath(); c.arc(p.x, p.y, p.size, 0, TAU); c.fill();
      } else {
        // Giọt/tia: hình vuông nhỏ thay cho arc() – ở cỡ 3–6 px mắt không phân biệt được mà rẻ hơn nhiều
        c.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
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
      c.font = numFont(Math.round(t.size * sc));
      c.lineWidth = Math.max(3, t.size * sc * 0.16);
      c.strokeStyle = t.stroke;
      c.strokeText(t.text, t.x, t.y);
      c.fillStyle = t.color;
      c.fillText(t.text, t.x, t.y);
    }
    c.globalAlpha = 1;
  }

  const BLADE_GLOW = [], BLADE_CORE = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    BLADE_GLOW.push('rgba(120,210,255,' + (0.35 * t).toFixed(2) + ')');
    BLADE_CORE.push('rgba(255,255,255,' + (0.95 * t).toFixed(2) + ')');
  }

  function drawBlades(c) {
    const now = performance.now();
    const maxW = Math.max(6, G.R * 0.28);
    c.lineCap = 'round';
    c.lineJoin = 'round';
    G.blades.forEach(function (b, id) {
      while (b.pts.length && now - b.pts[0].t > TRAIL_MS) b.pts.shift();
      const n = b.pts.length;
      if (n < 2) { if (!b.active) G.blades.delete(id); return; }
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 1; i < n; i++) {
          const t = i / (n - 1);
          c.lineWidth = maxW * t * (pass === 0 ? 2.4 : 1);
          c.strokeStyle = (pass === 0 ? BLADE_GLOW : BLADE_CORE)[Math.round(t * 24)];
          c.beginPath();
          c.moveTo(b.pts[i - 1].x, b.pts[i - 1].y);
          c.lineTo(b.pts[i].x, b.pts[i].y);
          c.stroke();
        }
      }
    });
  }

  function render() {
    if (!G.bgSky || !G.bgHills) return;
    const c = ctx;
    c.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    let sx = 0, sy = 0;
    if (G.shake > 0) {
      const amp = G.shake * G.shake * Math.min(G.W, G.H) * 0.03;
      sx = (Math.random() - 0.5) * 2 * amp;
      sy = (Math.random() - 0.5) * 2 * amp;
      c.translate(sx, sy);
    }
    c.drawImage(G.bgSky, 0, 0, G.W, G.H);
    drawSun(c);
    drawClouds(c);
    c.drawImage(G.bgHills, 0, 0, G.W, G.H);
    drawStains(c);
    for (let i = 0; i < G.halves.length; i++) {
      const h = G.halves[i];
      if (h.sprite && h.sprite.gen !== SP.halfGen) h.sprite = SP.halfSprite(h.type, h.cut, h.side);  // sprite dựng lại sau khi xoay màn
      if (h.sprite) SP.draw(c, h.sprite, h.x, h.y, h.rot, 1);
      else SP.drawHalf(c, h.type, h.x, h.y, h.rot, h.cut, h.side);
    }
    for (let i = 0; i < G.fruits.length; i++) drawFruitSkin(c, G.fruits[i]);
    for (let i = 0; i < G.fruits.length; i++) drawFruitNumber(c, G.fruits[i]);
    drawParts(c);
    drawTexts(c);
    drawBlades(c);
    if (G.shake > 0) c.translate(-sx, -sy);
    if (G.state === 'playing' && G.hearts === 1 && G.lowHpGrad) {
      c.globalAlpha = Motion.lite ? 0.22 : 0.18 + 0.1 * Math.sin(G.anim * 5);
      c.fillStyle = G.lowHpGrad;
      c.fillRect(0, 0, G.W, G.H);
      c.globalAlpha = 1;
    }
    if (G.flash) {
      c.fillStyle = 'rgba(' + G.flash.c + ',' + Math.max(0, G.flash.a).toFixed(2) + ')';
      c.fillRect(0, 0, G.W, G.H);
    }
  }

  /* ================= HUD ================= */
  function formatTime(s) {
    s = Math.max(0, Math.ceil(s));
    const m = Math.floor(s / 60), r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  function syncHud() {
    if (!inGame()) return;
    syncHintBtn(false);
    const h = G.hud;
    if (h.score !== G.score) {
      h.score = G.score;
      ui.score.textContent = fmt(G.score);
      ui.score.classList.remove('bump');
      void ui.score.offsetWidth;
      ui.score.classList.add('bump');
    }
    if (h.hearts !== G.hearts) {
      h.hearts = G.hearts;
      const spans = ui.hearts.children;
      for (let i = 0; i < spans.length; i++) spans[i].classList.toggle('lost', i >= G.hearts);
      ui.hearts.setAttribute('aria-label', 'Còn ' + G.hearts + ' tim');
      ui.hearts.classList.toggle('low', G.hearts === 1 && !Motion.lite);
    }
    if (h.stage !== G.stage) { h.stage = G.stage; ui.stage.textContent = 'Màn ' + G.stage; }
    const mult = G.state === 'playing' || G.state === 'over' ? multiplier() : 1;
    if (h.mult !== mult) {
      h.mult = mult;
      ui.combo.hidden = mult < 2;
      if (mult >= 2) {
        ui.combo.textContent = 'Combo x' + mult + ' 🔥';
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
    G.hud = { score: -1, hearts: -1, stage: -1, mult: -1, time: '', fill: -1, hintOn: null };
    ui.combo.hidden = true;
    ui.hint.hidden = true;
    if (ui.review) ui.review.hidden = true;
    ui.question.innerHTML = 'Sẵn sàng…';
    ui.timerFill.style.width = '100%';
    ui.timerFill.classList.remove('warn', 'danger');
    ui.timer.classList.remove('danger');
  }

  /* ================= VÒNG ĐỜI VÁN CHƠI ================= */
  function clearWorld() {
    G.fruits.length = 0;
    clearHalves();
    G.parts.length = 0;
    G.stains.length = 0;
    G.texts.length = 0;
    G.blades.clear();
    G.wave = null;
    G.shake = 0;
    G.flash = null;
  }

  function startGame(level) {
    clearTimeout(G.cdTimer);
    G.level = level;
    G.mode = MG.PAIR_LEVELS.indexOf(level) >= 0 ? 'pair' : 'answer';
    G.state = 'countdown';
    G.score = 0; G.hearts = MAX_HEARTS; G.streak = 0; G.bestStreak = 0; G.correct = 0; G.wrong = 0; G.bombs = 0; G.stage = 1;
    G.timeLeft = G.duration; G.time = 0; G.question = null; G.held = null; G.misses = 0;
    G.nextQuestionAt = -1; G.relaunchAt = -1; G.overAt = -1; G.lastWarnSec = -1; G.resultShown = false; G.lastEntry = null;
    G.stageBannerAt = -1; G.missedList = []; G.reviewUsed = 0; G.asked = 0; G.resumeCountdown = false;
    G.nextLevel = null; G.easierLevel = null;
    showResultFx(false);
    clearTimeout(revealAnswer._t);
    clearWorld();
    applyFruitSize();
    updateGravity();
    resetHud();
    showHud(true);
    measureHud();
    showScreen('countdown');
    syncHud();
    requestWake();
    G.hurry = false;
    Music.setTempo(1);
    Music.setDuck('pause', null);
    Music.play('game');
    Voice.stop();
    runCountdown(function () {
      G.state = 'playing';
      G.nextQuestionAt = G.time + 0.15;
    });
  }

  function runCountdown(cb) {
    const el = ui.countNum;
    let n = 3;
    // Gọi tên bé ngay đầu ván cho thân thiện (C6)
    try {
      if (window.Players) Voice.say('Sẵn sàng nhé, ' + Players.active().name + '!', { queue: true });
    } catch (e) { /* bỏ qua */ }
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
        el.textContent = 'CHÉM!';
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
    if (G.state === 'countdown') {
      // Ẩn tab giữa lúc đếm ngược: dừng lại, không để ván bắt đầu khi bé không nhìn màn hình
      clearTimeout(G.cdTimer);
      G.state = 'paused';
      G.resumeCountdown = true;
      G.blades.clear();
      Voice.stop();
      Music.setDuck('pause', 0.25);
      $('pause-info').textContent = 'Sẵn sàng chưa?';
      showScreen('pause');
      return;
    }
    if (G.state !== 'playing') return;
    G.state = 'paused';
    G.blades.clear();
    Voice.stop();
    Music.setDuck('pause', 0.25);
    $('pause-info').textContent = 'Điểm hiện tại: ' + fmt(G.score) + ' · Còn ' + formatTime(G.timeLeft);
    showScreen('pause');
  }

  function resumeGame() {
    if (G.state !== 'paused') return;
    Sfx.unlock();
    Music.setDuck('pause', null);
    if (G.resumeCountdown) {
      G.resumeCountdown = false;
      G.state = 'countdown';
      showScreen('countdown');
      requestWake();
      runCountdown(function () {
        G.state = 'playing';
        G.nextQuestionAt = G.time + 0.15;
      });
      return;
    }
    G.state = 'playing';
    showScreen(null);
    requestWake();
  }

  function endGame(reason) {
    if (G.state !== 'playing') return;
    G.state = 'over';
    G.endReason = reason;
    G.blades.clear();
    G.nextQuestionAt = -1; G.relaunchAt = -1;
    G.overAt = G.anim + (reason === 'timeup' ? 1.0 : 1.3);
    Music.stop();
    Music.setTempo(1);
    G.hurry = false;
    // Khi hết tim, lời giải thích của câu sai cuối cùng phải được đọc xong (không cắt ngang)
    if (reason !== 'nolife') Voice.stop();
    Voice.say(reason === 'timeup' ? 'Hết giờ rồi!' : 'Hết tim rồi!', { queue: reason === 'nolife' });
    if (reason === 'timeup') {
      Sfx.play('timeup');
      addText('Hết giờ!', G.W / 2, G.H * 0.45, { color: '#fff', stroke: 'rgba(17,138,178,0.95)', size: G.R * 1.9, life: 1.6, vy: -15 });
    } else {
      Sfx.play('lose');
      addText('Hết tim rồi!', G.W / 2, G.H * 0.45, { color: '#fff', stroke: 'rgba(239,71,111,0.95)', size: G.R * 1.9, life: 1.8, vy: -15 });
    }
    G.fruits.forEach(function (f) { if (!f.dead && f.kind !== 'heart') popFruit(f); });
  }

  function starThresholds(level, duration) {
    const f = STAR_FACTOR[level.id] || 0.7;
    const d = duration / 90;
    return [1500, 3500, 6000].map(function (v) { return Math.max(100, Math.round(v * f * d / 100) * 100); });
  }

  function starsFor(score, level, duration) {
    const th = starThresholds(level, duration);
    let s = 0;
    for (let i = 0; i < 3; i++) if (score >= th[i]) s = i + 1;
    return s;
  }

  function starsHtml(n) {
    let h = '<span role="img" aria-label="' + n + ' trên 3 sao">';
    for (let i = 0; i < 3; i++) h += '<span class="' + (i < n ? 'on' : 'off') + '" aria-hidden="true">★</span>';
    return h + '</span>';
  }

  function showResults() {
    const lvl = G.level, score = G.score;
    if (!lvl) { goMenu(); return; }                       // không có màn nào đang chơi: không có gì để hiện
    const me = window.Players ? Players.active() : { name: 'Bạn nhỏ', avatar: '' };
    const stars = starsFor(score, lvl, G.duration);
    let rec = { best: 0, stars: 0, top: [] };
    let newRec = rec, entry = null, qualifies = false, isRecord = false;
    // Ghi kỷ lục: lỗi lưu trữ (dữ liệu hỏng, hết chỗ) không được làm kẹt ván ở trạng thái 'over'
    try {
      rec = Store.getRecord(G.mode, lvl.id, G.duration);
      isRecord = score > 0 && score > rec.best;
      entry = { name: me.name, avatar: me.avatar, score: score, date: Date.now() };
      const top = rec.top.slice();
      if (score > 0) {
        top.push(entry);
        top.sort(function (a, b) { return b.score - a.score; });
        const idx = top.indexOf(entry);
        if (idx < 5) qualifies = true; else top.splice(idx, 1);
        while (top.length > 5) top.pop();
      }
      newRec = { best: Math.max(rec.best, score), stars: Math.max(rec.stars, stars), top: top };
      Store.setRecord(G.mode, lvl.id, G.duration, newRec);
      Store.addStats({ topic: lvl.id, correct: G.correct, wrong: G.wrong, seconds: Math.round(G.time) });
    } catch (e) {
      try { console.error('[ninja-toan] showResults', e && e.message); } catch (e2) { /* bỏ qua */ }
    }
    G.lastEntry = qualifies ? entry : null;

    ui.resultTitle.textContent = G.endReason === 'timeup' ? '⏰ Hết giờ!' : '💔 Hết tim rồi!';
    ui.resultTitle.className = 'result-title ' + (G.endReason === 'timeup' ? 'timeup' : 'nolife');
    ui.resultLevel.textContent = (G.mode === 'answer' ? 'Chém đáp án' : 'Ghép đôi') + ' · ' + lvl.icon + ' ' + lvl.title + ' · ' + formatTime(G.duration);
    ui.resultScore.textContent = fmt(score);
    ui.resultStars.innerHTML = starsHtml(stars);
    ui.resultRecord.hidden = !isRecord;
    ui.stCorrect.textContent = G.correct;
    ui.stWrong.textContent = G.wrong;
    if (ui.stBomb) ui.stBomb.textContent = G.bombs;
    ui.stCombo.textContent = G.bestStreak;
    const total = G.correct + G.wrong;
    ui.stAcc.textContent = total ? Math.round(G.correct / total * 100) + '%' : '–';

    // "Cần ôn lại": các phép tính bé làm sai (hoặc phải nhờ gợi ý) trong ván này
    if (ui.resultReview) {
      const list = G.missedList.slice(0, 6);
      ui.resultReview.hidden = !list.length;
      ui.resultReview.innerHTML = list.length
        ? '📝 Cần ôn lại: ' + list.map(function (t) { return esc(t); }).join(' · ')
        : '';
    }

    const names = Store.p().names;
    ui.nameEntry.hidden = !qualifies;
    if (qualifies) {
      ui.nameInput.value = me.name;
      ui.nameChips.innerHTML = names.map(function (n) { return '<button type="button" data-name="' + esc(n) + '">' + esc(n) + '</button>'; }).join('');
    }
    renderLeader(newRec.top, entry);
    renderNextStep(lvl, stars);
    // Ẩn HUD, dòng chữ trên canvas và dải gợi ý để không lộ ra dưới bảng kết quả
    showHud(false);
    G.texts.length = 0;
    ui.hint.hidden = true;
    G.resultShown = true;
    showScreen('gameover');
    showResultFx(isRecord || stars >= 2);
    if (isRecord) { Sfx.play('record'); Sfx.play('applause'); spawnConfetti(140); Voice.say('Kỷ lục mới! Giỏi quá!', { queue: true }); }
    else if (stars >= 2) { Sfx.play('applause'); spawnConfetti(70); Voice.say('Chơi tốt lắm!', { queue: true }); }
    if (G.missedList.length) Voice.say('Cần ôn lại: ' + speakMath(G.missedList[0]), { queue: true });
    if (G.nextLevel) Voice.say('Ba sao rồi! Thử màn tiếp theo nhé!', { queue: true });
    else if (G.easierLevel) Voice.say('Thử một màn dễ hơn cho quen tay nhé!', { queue: true });
    setTimeout(function () { if (G.state === 'over') Music.play('menu'); }, 2500);
    releaseWake();
  }

  /** Bước tiếp theo gợi ý ở bảng kết quả: 3 sao → màn sau; hết tim → màn dễ hơn (C5). */
  function renderNextStep(lvl, stars) {
    const list = G.mode === 'answer' ? MG.ANSWER_LEVELS : MG.PAIR_LEVELS;
    const i = list.indexOf(lvl);
    G.nextLevel = stars >= 3 && i >= 0 && i < list.length - 1 ? list[i + 1] : null;
    G.easierLevel = !G.nextLevel && G.endReason === 'nolife' && i > 0 ? list[i - 1] : null;
    if (ui.btnNext) {
      ui.btnNext.hidden = !G.nextLevel;
      if (G.nextLevel) ui.btnNext.textContent = '➡ ' + G.nextLevel.icon + ' ' + G.nextLevel.title;
    }
    if (ui.btnEasier) {
      ui.btnEasier.hidden = !G.easierLevel;
      if (G.easierLevel) ui.btnEasier.textContent = '🐣 ' + G.easierLevel.icon + ' ' + G.easierLevel.title;
    }
  }

  /** Mưa giấy màu bằng CSS trên bảng kết quả (tắt khi bé chọn "Hiệu ứng: Ít"). */
  const FX_COLORS = ['#ff6b35', '#ffd166', '#06d6a0', '#118ab2', '#ef476f', '#7b5ea7'];
  function showResultFx(on) {
    const el = ui.resultFx;
    if (!el) return;
    clearTimeout(showResultFx._t);
    if (!on || Motion.lite) { el.hidden = true; el.innerHTML = ''; return; }
    let h = '';
    for (let i = 0; i < 24; i++) {
      h += '<i style="left:' + Math.round(Math.random() * 100) + '%;background:' + FX_COLORS[i % FX_COLORS.length] +
        ';animation-delay:' + (Math.random() * 1.4).toFixed(2) + 's;animation-duration:' + (2.2 + Math.random() * 1.6).toFixed(2) + 's"></i>';
    }
    el.innerHTML = h;
    el.hidden = false;
    showResultFx._t = setTimeout(function () { el.hidden = true; el.innerHTML = ''; }, 6000);
  }

  function renderLeader(top, me) {
    if (!top || !top.length) {
      ui.leader.innerHTML = '<h3>🏆 Bảng vàng</h3><div class="empty">Chưa có điểm nào. Hãy là người đầu tiên!</div>';
      return;
    }
    ui.leader.innerHTML = '<h3>🏆 Bảng vàng</h3><ol>' + top.map(function (e) {
      return '<li' + (e === me ? ' class="me"' : '') + '><span>' + (e.avatar ? esc(e.avatar) + ' ' : '') + esc(e.name) + (e === me ? ' ⭐' : '') + '</span><span>' + fmt(e.score) + '</span></li>';
    }).join('') + '</ol>';
  }

  function saveName() {
    if (!G.lastEntry || !G.level) return;
    const name = Store.cleanName(ui.nameInput.value) || 'Bạn nhỏ';
    G.lastEntry.name = name;
    Store.rememberName(name);
    const rec = Store.getRecord(G.mode, G.level.id, G.duration);
    rec.top = rec.top.map(function (e) { return e.date === G.lastEntry.date && e.score === G.lastEntry.score ? G.lastEntry : e; });
    Store.setRecord(G.mode, G.level.id, G.duration, rec);
    renderLeader(rec.top, G.lastEntry);
    ui.nameEntry.hidden = true;
    ui.nameInput.blur();
    toast('Đã lưu tên ' + name + ' vào bảng vàng! 🎉');
    Sfx.play('click');
  }

  function goMenu() {
    clearTimeout(G.cdTimer);
    showResultFx(false);
    G.state = 'menu';
    G.level = null;
    clearWorld();
    applyFruitSize();
    showHud(false);
    measureHud();
    showScreen('menu');
    releaseWake();
    Voice.stop();
    Music.setDuck('pause', null);
    Music.play('menu');
  }

  function goLevels() {
    clearTimeout(G.cdTimer);
    showResultFx(false);
    G.state = 'levels';
    if (inGame()) { clearWorld(); }
    G.level = null;
    applyFruitSize();
    showHud(false);
    measureHud();
    renderLevels();
    showScreen('levels');
    releaseWake();
    Voice.stop();
    Music.setDuck('pause', null);
    Music.play('menu');
  }

  /* ================= CHỌN MÀN ================= */
  function gradeLabel(g) { return g === 0 ? 'Thử thách' : 'Lớp ' + g; }
  function gradeClass(g) { return g === 0 ? 'gx' : 'g' + g; }

  /** "Đã thuộc": đúng ≥ 90% trên ít nhất 20 câu của màn đó. */
  function mastered(topic) {
    const t = Store.p().stats.byTopic[topic];
    if (!t) return false;
    const n = t.c + t.w;
    return n >= 20 && t.c / n >= 0.9;
  }

  function renderLevels() {
    const list = G.mode === 'answer' ? MG.ANSWER_LEVELS : MG.PAIR_LEVELS;
    ui.modeDesc.innerHTML = G.mode === 'answer'
      ? 'Nhìn phép tính, chém quả có <b>đáp án đúng</b>!'
      : 'Chém <b>2 quả</b> cộng, trừ hoặc nhân với nhau bằng <b>số cho trước</b>!';
    // Kỷ lục gộp cả ba mức thời gian: bé chơi 1 phút vẫn thấy thành tích của ván 2 phút (C9)
    const agg = list.map(function (l) {
      let stars = 0, best = 0, bestDur = G.duration;
      [60, 90, 120].forEach(function (d) {
        const r = Store.getRecord(G.mode, l.id, d);
        if (r.stars > stars) stars = r.stars;
        if (r.best > best) { best = r.best; bestDur = d; }
      });
      return { stars: stars, best: best, dur: bestDur };
    });
    let nextIdx = agg.findIndex(function (a) { return a.stars < 2; });   // màn nên chơi tiếp
    ui.levelGrid.innerHTML = list.map(function (l, i) {
      const a = agg[i];
      const done = mastered(l.id);
      const isNext = i === nextIdx;
      const label = l.title + ', ' + gradeLabel(l.grade) + ', ' +
        (a.best ? 'kỷ lục ' + fmt(a.best) + ' điểm, ' + a.stars + ' trên 3 sao' : 'chưa chơi') +
        (done ? ', đã thuộc' : '') + (isNext ? ', nên chơi tiếp' : '');
      return '<div class="level-card' + (a.stars >= 3 ? ' done' : '') + (isNext ? ' next' : '') +
        (done || isNext ? ' badged' : '') +
        '" data-id="' + l.id + '" role="button" tabindex="0" aria-label="' + esc(label) + '">' +
        '<span class="grade ' + gradeClass(l.grade) + '">' + gradeLabel(l.grade) + '</span>' +
        (done ? '<span class="mastered">✅ Đã thuộc</span>' : isNext ? '<span class="mastered next-badge">👉 Chơi tiếp</span>' : '') +
        '<div class="icon" aria-hidden="true">' + l.icon + '</div>' +
        '<div class="name">' + esc(l.title) + '</div>' +
        '<div class="desc">' + esc(l.desc) + '</div>' +
        '<div class="meta">' +
        (a.best ? '<span class="best">🏆 ' + fmt(a.best) + ' <small>(' + formatTime(a.dur) + ')</small></span>'
          : '<span class="new">✨ Chưa chơi</span>') +
        '<span class="stars">' + starsHtml(a.stars) + '</span></div>' +
        '</div>';
    }).join('');
    const tabs = ui.levels.querySelectorAll('.tab');
    for (let i = 0; i < tabs.length; i++) {
      const on = tabs[i].getAttribute('data-mode') === G.mode;
      tabs[i].classList.toggle('on', on);
      tabs[i].setAttribute('aria-selected', String(on));
    }
  }

  /* ================= NGƯỜI CHƠI (hồ sơ dùng chung, js/profile.js) ================= */
  const PlayersUI = { mode: null, avatar: null, from: 'menu' };

  /** Tổng sao tối đa của game: mỗi màn (chém đáp án và ghép đôi) được nhiều nhất 3 sao. */
  const MAX_STARS = (MG.ANSWER_LEVELS.length + MG.PAIR_LEVELS.length) * 3;

  /** Tổng số sao của một bé trong game này (lấy sao cao nhất của mỗi chế độ:màn, cộng lại). */
  function sumStars(bucket) {
    if (!bucket || !bucket.records) return 0;
    const best = {};
    Object.keys(bucket.records).forEach(function (k) {
      const parts = k.split(':');
      const id = parts[0] + ':' + parts[1];
      const st = Store.int(bucket.records[k].stars, 0, 3, 0);
      if (!(best[id] >= st)) best[id] = st;
    });
    let s = 0;
    Object.keys(best).forEach(function (k) { s += best[k]; });
    return s;
  }

  function renderPlayerChip() {
    const b = $('btn-player');
    if (!b || !window.Players) return;
    b.innerHTML = Players.chipHtml() + '<span class="pl-hint" aria-hidden="true">▾</span>';
  }

  function renderPlayers() {
    if (!window.Players || !ui.players) return;
    const act = Players.active();
    $('player-list').innerHTML = Players.list().map(function (p) {
      const stars = sumStars(Store.data.players[p.id]);
      return '<button type="button" class="player-item' + (p.id === act.id ? ' active' : '') + '" data-id="' + esc(p.id) + '" aria-pressed="' + (p.id === act.id) + '">' +
        '<span class="pl-avatar" aria-hidden="true">' + esc(p.avatar) + '</span><span class="pl-name">' + esc(p.name) +
        '<span class="pl-sub">⭐ ' + stars + ' sao</span></span></button>';
    }).join('');
    $('btn-player-remove').disabled = Players.list().length <= 1;
    $('player-form').hidden = !PlayersUI.mode;
  }

  function openPlayers(from) {
    PlayersUI.mode = null;
    PlayersUI.from = from || 'menu';
    renderPlayers();
    showScreen('players');
  }
  function closePlayers() {
    PlayersUI.mode = null;
    if (PlayersUI.from === 'levels') { renderLevels(); showScreen('levels'); }
    else showScreen('menu');
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
    const name = Players.active().name;
    toast('Chào ' + name + ' 👋');
    Voice.say('Chào ' + name + '! Cùng chém trái cây học toán nào!');
  }

  /* ================= KẾT QUẢ CỦA BÉ (báo cáo cho phụ huynh) ================= */
  const Report = { from: 'menu' };

  /** Mô tả một câu trong kho ôn lại, ví dụ "🍎 Cộng trừ đến 10 · 7 + 5 = 12". */
  function describeReview(it) {
    const inf = it && it.info;
    if (!inf) return String(it && it.key || '');
    const lvl = MG.levelById(inf.level);
    const head = lvl ? lvl.icon + ' ' + lvl.title + ' · ' : '';
    if (Array.isArray(inf.pair)) return head + MG.pairResultText(inf, inf.pair[0], inf.pair[1]);
    const q = MG.make(inf.a, inf.b, inf.op, inf.max);
    return head + q.text + ' = ' + q.answer;
  }

  function renderReport() {
    if (!window.Players || !ui.report) return;
    const p = Players.active(), b = Store.p(), s = b.stats;
    $('report-title').textContent = '📊 Kết quả của ' + p.name;
    const total = s.correct + s.wrong, acc = total ? Math.round(s.correct / total * 100) : 0;
    $('report-stats').innerHTML =
      '<div class="report-stat"><div class="v">' + fmt(s.plays) + '</div><div class="k">ván đã chơi</div></div>' +
      '<div class="report-stat"><div class="v">' + acc + '%</div><div class="k">trả lời đúng</div></div>' +
      '<div class="report-stat"><div class="v">' + Math.round(s.seconds / 60) + '</div><div class="k">phút luyện tập</div></div>' +
      '<div class="report-stat"><div class="v">' + sumStars(b) + '/' + MAX_STARS + '</div><div class="k">sao</div></div>';
    // Chủ đề còn yếu: đã làm ≥ 5 câu mà đúng dưới 70% (dùng chung cho dòng tóm tắt và huy hiệu từng dòng)
    const isWeak = function (id) {
      const t = s.byTopic[id];
      return !!(t && t.c + t.w >= 5 && t.c / (t.c + t.w) < 0.7);
    };
    const weak = MG.ANSWER_LEVELS.concat(MG.PAIR_LEVELS).filter(function (l) {
      return isWeak(l.id);
    }).sort(function (x, y) {
      const a = s.byTopic[x.id], c = s.byTopic[y.id];
      return a.c / (a.c + a.w) - c.c / (c.c + c.w);
    }).slice(0, 3);
    const weakLine = $('report-weak');
    weakLine.textContent = weak.length ? 'Cần luyện thêm: ' + weak.map(function (l) { return l.icon + ' ' + l.title; }).join(', ') : '';
    weakLine.hidden = !weak.length;
    $('report-levels').innerHTML = MG.ANSWER_LEVELS.concat(MG.PAIR_LEVELS).map(function (l) {
      const mode = MG.PAIR_LEVELS.indexOf(l) >= 0 ? 'pair' : 'answer';
      let stars = 0, best = 0, bestDur = 90;
      [60, 90, 120].forEach(function (d) {
        const r = Store.getRecord(mode, l.id, d);
        if (r.stars > stars) stars = r.stars;
        if (r.best > best) { best = r.best; bestDur = d; }
      });
      const t = s.byTopic[l.id] || { c: 0, w: 0 }, n = t.c + t.w;
      return '<div class="report-row"><span class="t">' + esc((mode === 'pair' ? '🤝 ' : '🎯 ') + l.icon + ' ' + l.title) + '</span>' +
        '<span class="stars">' + starsHtml(stars) + '</span>' +
        '<span>🏆 ' + fmt(best) + (best ? ' (' + formatTime(bestDur) + ')' : '') + '</span>' +
        (n ? '<span>' + Math.round(t.c / n * 100) + '% (' + n + ' câu)</span>' : '<span class="muted">chưa chơi</span>') +
        (mastered(l.id) ? '<span class="mastered">✅ Đã thuộc</span>' : '') +
        (isWeak(l.id) ? '<span class="weak">⚠️ Cần luyện thêm</span>' : '') + '</div>';
    }).join('');
    const pool = Store.reviewPool();
    $('report-review').innerHTML = pool.length
      ? pool.slice(0, 12).map(function (it) { return '<div class="report-row"><span class="t">' + esc(describeReview(it)) + '</span><span>✖ ' + it.n + '</span></div>'; }).join('')
      : '<div class="report-row"><span class="t">Chưa có gì cần ôn — tuyệt vời! 🎉</span></div>';
    $('btn-report-reset').textContent = '🗑 Xóa tiến trình của ' + p.name;
  }

  function openReport(from) {
    Report.from = from || 'menu';
    renderReport();
    showScreen('report');
  }
  function closeReport() {
    if (Report.from === 'players') { renderPlayers(); showScreen('players'); }
    else if (Report.from === 'levels') { renderLevels(); showScreen('levels'); }
    else showScreen('menu');
  }

  /* ================= CỔNG PHỤ HUYNH (một phép nhân, không dùng window.prompt/confirm) ================= */
  const Gate = { cb: null, answer: 0 };
  function adultGate(cb) {
    if (!ui.parentGate) { if (window.confirm('Dành cho phụ huynh, thầy cô. Tiếp tục?')) cb(); return; }   // dự phòng khi thiếu HTML
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
    if (now - errLast < 1000) return;         // lỗi lặp mỗi khung hình chỉ xử lý mỗi giây một lần
    errLast = now;
    if (errShown++ < 3) {
      try { console.error('[ninja-toan]', msg); } catch (e) { /* bỏ qua */ }
      try { toast('Có lỗi nhỏ, con thử lại nhé! 🙏', 2600); } catch (e) { /* bỏ qua */ }
    }
    try { if (inGame()) goMenu(); } catch (e) { /* bỏ qua */ }   // thoát ván an toàn thay vì đứng hình
  }

  /* ================= ĐẦU VÀO (CHẠM / CHUỘT) ================= */
  function handleMove(b, x, y, t) {
    const dx = x - b.lx, dy = y - b.ly;
    const d2 = dx * dx + dy * dy;
    if (d2 < 4) return;
    b.pts.push({ x: x, y: y, t: t });
    if (b.pts.length > 24) b.pts.shift();
    if (canSlice()) sliceSegment(b, b.lx, b.ly, x, y);
    const dt = Math.max(1, t - b.lt);
    if (Math.sqrt(d2) / dt * 1000 > 900 && canSlice()) Sfx.play('swoosh');
    b.lx = x; b.ly = y; b.lt = t;
  }

  function onPointerDown(e) {
    Sfx.unlock();
    wakeIdle();
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* bỏ qua */ }
    const t = performance.now();
    G.blades.set(e.pointerId, { pts: [{ x: e.clientX, y: e.clientY, t: t }], lx: e.clientX, ly: e.clientY, lt: t, active: true, lastWrongAt: 0 });
    if (e.cancelable) e.preventDefault();
  }

  function onPointerMove(e) {
    const b = G.blades.get(e.pointerId);
    if (!b || !b.active) return;
    const t = performance.now();
    if (e.getCoalescedEvents) {
      const list = e.getCoalescedEvents();
      if (list && list.length > 1) {
        for (let i = 0; i < list.length; i++) handleMove(b, list[i].clientX, list[i].clientY, t);
        return;
      }
    }
    handleMove(b, e.clientX, e.clientY, t);
  }

  function onPointerEnd(e) {
    const b = G.blades.get(e.pointerId);
    if (b) b.active = false;
  }

  function bindInput() {
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerEnd);
    canvas.addEventListener('pointercancel', onPointerEnd);
    canvas.addEventListener('pointerleave', onPointerEnd);
    // Chặn cuộn/zoom của Safari khi thao tác trên canvas (chỉ trên canvas, để các bảng vẫn cuộn được)
    canvas.addEventListener('touchmove', function (e) { if (e.cancelable) e.preventDefault(); }, { passive: false });
    canvas.addEventListener('touchstart', function (e) { if (e.cancelable) e.preventDefault(); }, { passive: false });
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    document.addEventListener('dblclick', function (e) { e.preventDefault(); });
    document.addEventListener('contextmenu', function (e) { if (e.target === canvas) e.preventDefault(); });
    // Mở khóa âm thanh ở mọi thao tác (iOS chỉ chấp nhận touchend/click, nên bắt cả ba)
    document.addEventListener('pointerdown', function () { Sfx.unlock(); if (G.state === 'menu') welcome(); }, { passive: true, capture: true });
    document.addEventListener('touchend', function () { Sfx.unlock(); checkAudioBlocked(); }, { passive: true, capture: true });
    document.addEventListener('click', function () { Sfx.unlock(); checkAudioBlocked(); }, { passive: true, capture: true });
    window.addEventListener('pageshow', function () { Sfx.resume(); });
    document.addEventListener('keydown', onKey);
  }

  function onKey(e) {
    wakeIdle();
    // Escape đóng cổng phụ huynh / biểu mẫu ngay cả khi con trỏ đang ở trong ô nhập
    if (e.key === 'Escape' && isOpen(ui.parentGate)) { closeGate(); e.preventDefault(); return; }
    if (e.key === 'Escape' && isOpen(ui.players) && PlayersUI.mode) { PlayersUI.mode = null; renderPlayers(); e.preventDefault(); return; }
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;   // đang gõ tên
    if (isOpen(ui.parentGate)) return;
    if (isOpen(ui.howto)) { if (e.key === 'Escape' || e.key === 'Enter') { ui.howto.classList.add('hidden'); e.preventDefault(); } return; }
    if (isOpen(ui.report)) { if (e.key === 'Escape') { closeReport(); e.preventDefault(); } return; }
    if (isOpen(ui.players)) { if (e.key === 'Escape') { closePlayers(); e.preventDefault(); } return; }
    if (G.state === 'over' && e.key === 'Enter') { if (G.level) startGame(G.level); e.preventDefault(); return; }
    if (G.state === 'paused' && e.key === 'Enter') { resumeGame(); e.preventDefault(); return; }
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
      if (G.state === 'playing' || G.state === 'countdown') pauseGame();
      else if (G.state === 'paused') resumeGame();
      else if (G.state === 'levels') goMenu();
    }
  }

  /* ================= GIAO DIỆN ================= */
  /** Có thao tác trở lại: đếm lại thời gian rảnh và bật lại nhạc nền nếu đã tắt vì để lâu. */
  function wakeIdle() {
    G.lastInputAt = performance.now();
    if (G.musicIdle) { G.musicIdle = false; if (G.state === 'menu' || G.state === 'levels') Music.play('menu'); }
  }

  function click(id, fn) {
    const el = $(id);
    if (!el) return;
    el.addEventListener('click', function (e) { wakeIdle(); Sfx.unlock(); Sfx.play('click'); fn(e); });
  }

  /* ---------- Âm thanh: cài đặt & nút bật/tắt ---------- */
  function applyAudioSettings() {
    Sfx.setEnabled(Store.data.sound !== false);
    Music.setEnabled(Store.data.music !== false);
    Voice.setEnabled(Store.data.voice !== false);
  }

  const TOGGLE_DEFS = [
    { key: 'sound', on: '🔊 Âm thanh: Bật', off: '🔇 Âm thanh: Tắt' },
    { key: 'music', on: '🎵 Nhạc nền: Bật', off: '🎵 Nhạc nền: Tắt' },
    { key: 'voice', on: '🗣️ Giọng đọc: Bật', off: '🗣️ Giọng đọc: Tắt' },
    { key: 'fx', on: '✨ Hiệu ứng: Nhiều', off: '✨ Hiệu ứng: Ít' }
  ];

  function renderAudioToggles() {
    const boxes = document.querySelectorAll('[data-audio-toggles]');
    for (let i = 0; i < boxes.length; i++) {
      boxes[i].innerHTML = TOGGLE_DEFS.map(function (d) {
        const noVoice = d.key === 'voice' && !Voice.available;
        // Máy đang bật "giảm chuyển động": hiệu ứng luôn ở mức Ít, công tắc phải báo đúng như vậy và bị khóa
        const forced = d.key === 'fx' && Motion.lite && Store.data.fx !== 'lite';
        const on = d.key === 'fx' ? !Motion.lite : (Store.data[d.key] !== false && !noVoice);
        let label = on ? d.on : d.off;
        if (noVoice) label = '🗣️ Giọng đọc: chưa có giọng Việt';
        if (forced) label = '✨ Hiệu ứng: Ít (theo cài đặt máy)';
        return '<button type="button" class="toggle ' + (on ? 'on' : 'off') + '" data-set="' + d.key + '" aria-pressed="' + on + '"' +
          (noVoice || forced ? ' disabled' : '') + '>' + label + '</button>';
      }).join('');
    }
  }

  /** Chuyển ký hiệu toán sang lời để đọc: "17 − 5 = 12" -> "17 trừ 5 bằng 12" */
  function speakMath(s) {
    return String(s).replace(/−/g, ' trừ ').replace(/\+/g, ' cộng ').replace(/×/g, ' nhân ').replace(/≠/g, ' không bằng ')
      .replace(/=/g, ' bằng ').replace(/✓/g, '').replace(/💡/g, '').replace(/ ?· ?/g, ', ')
      .replace(/\s+/g, ' ').replace(/\s+,/g, ',').trim();
  }

  function opWord(op) { return op === '+' ? ' cộng ' : op === '-' ? ' trừ ' : ' nhân '; }

  function questionSpeech() {
    const q = G.question;
    if (!q) return '';
    if (G.mode === 'answer') return q.a + opWord(q.op) + q.b + ' bằng mấy?';
    if (q.op === '+') return 'Hai số nào cộng lại bằng ' + q.target + '?';
    if (q.op === '*') return 'Hai số nào nhân với nhau bằng ' + q.target + '?';
    return 'Hai số nào trừ nhau bằng ' + q.target + '?';
  }

  function bindUi() {
    click('btn-play', function () { goLevels(); });
    click('btn-howto', function () { ui.howto.classList.remove('hidden'); });
    click('btn-levels-howto', function () { ui.howto.classList.remove('hidden'); });
    click('btn-howto-close', function () { ui.howto.classList.add('hidden'); });
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
        if (k === 'voice') Voice.say('Xin chào ' + (window.Players ? Players.active().name : 'con') + '! Cùng học toán nào!');
      } else {
        Sfx.play('click');
      }
    });
    click('btn-levels-back', function () { goMenu(); });
    click('btn-pause', function () { pauseGame(); });
    click('btn-resume', function () { resumeGame(); });
    click('btn-restart', function () { const l = G.level; if (l) startGame(l); });
    click('btn-quit', function () { goMenu(); });
    click('btn-again', function () { const l = G.level; if (l) startGame(l); });
    click('btn-next', function () { if (G.nextLevel) startGame(G.nextLevel); });
    click('btn-easier', function () { if (G.easierLevel) startGame(G.easierLevel); });
    // 💡 Gợi ý theo yêu cầu: đánh dấu quả đúng, đọc đáp án — đổi lại câu này chỉ được 50 điểm
    click('btn-hint', function () {
      if (G.state !== 'playing' || !G.wave || G.wave.resolved || G.wave.hint) return;
      markHint(G.wave, true);
    });
    click('btn-other-level', function () { goLevels(); });
    click('btn-home', function () { goMenu(); });
    click('btn-save-name', function () { saveName(); });
    ui.nameInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') saveName(); });
    ui.nameChips.addEventListener('click', function (e) {
      const b = e.target.closest('button[data-name]');
      if (b) { ui.nameInput.value = b.getAttribute('data-name'); saveName(); }
    });

    const durBtns = ui.durationGroup.querySelectorAll('button');
    for (let i = 0; i < durBtns.length; i++) {
      durBtns[i].addEventListener('click', function () {
        Sfx.unlock(); Sfx.play('click');
        G.duration = Number(this.getAttribute('data-sec')) || 90;
        Store.data.duration = G.duration;
        Store.save();
        for (let k = 0; k < durBtns.length; k++) {
          const on = durBtns[k] === this;
          durBtns[k].classList.toggle('on', on);
          durBtns[k].setAttribute('aria-pressed', String(on));
        }
      });
    }

    const tabs = ui.levels.querySelectorAll('.tab');
    const setMode = function (m) {
      G.mode = m === 'pair' ? 'pair' : 'answer';
      renderLevels();
    };
    for (let i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener('click', function () {
        Sfx.unlock(); Sfx.play('click');
        setMode(this.getAttribute('data-mode'));
      });
      tabs[i].addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        const next = tabs[(Array.prototype.indexOf.call(tabs, this) + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        setMode(next.getAttribute('data-mode'));
        next.focus();
      });
    }

    ui.levelGrid.addEventListener('click', function (e) {
      const card = e.target.closest('.level-card');
      if (!card) return;
      const lvl = MG.levelById(card.getAttribute('data-id'));
      if (!lvl) return;
      Sfx.unlock(); Sfx.play('click');
      startGame(lvl);
    });
    ui.levelGrid.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest ? e.target.closest('.level-card') : null;
      if (!card) return;
      e.preventDefault();
      card.click();
    });

    /* ---- Hồ sơ người chơi ---- */
    click('btn-player', function () { openPlayers(G.state === 'levels' ? 'levels' : 'menu'); });
    click('btn-players-back', function () { closePlayers(); });
    $('player-list').addEventListener('click', function (e) {
      const b = e.target.closest('.player-item');
      if (!b) return;
      Sfx.unlock(); Sfx.play('click');
      Players.setActive(b.getAttribute('data-id'));
      renderPlayers();
    });
    click('btn-player-add', function () { openPlayerForm('add'); });
    click('btn-player-rename', function () { openPlayerForm('rename'); });
    click('btn-player-avatar', function () { openPlayerForm('avatar'); });
    click('btn-player-cancel', function () { PlayersUI.mode = null; renderPlayers(); });
    $('player-form').addEventListener('submit', function (e) { e.preventDefault(); Sfx.unlock(); submitPlayerForm(); });
    $('player-avatars').addEventListener('click', function (e) {
      const b = e.target.closest('.avatar');
      if (!b) return;
      Sfx.unlock(); Sfx.play('click');
      PlayersUI.avatar = b.getAttribute('data-avatar');
      const all = $('player-avatars').children;
      for (let i = 0; i < all.length; i++) all[i].setAttribute('aria-pressed', String(all[i] === b));
    });
    click('btn-player-remove', function () {
      if (Players.list().length <= 1) return;
      adultGate(function () {
        const p = Players.active();
        if (Players.remove(p.id)) { delete Store.data.players[p.id]; Store.save(); toast('Đã xóa ' + p.name); renderPlayers(); }
      });
    });
    Players.onChange(function () {
      renderPlayerChip();
      if (isOpen(ui.players)) renderPlayers();
      if (isOpen(ui.report)) renderReport();
      if (G.state === 'levels') renderLevels();
    });

    /* ---- Kết quả của bé (phụ huynh) ---- */
    click('btn-report-menu', function () { openReport('menu'); });
    click('btn-report-levels', function () { openReport('levels'); });
    click('btn-report', function () { openReport('players'); });
    click('btn-report-back', function () { closeReport(); });
    click('btn-report-reset', function () {
      adultGate(function () {
        const name = Players.active().name;
        Store.resetActive();
        renderReport();
        if (G.state === 'levels') renderLevels();
        toast('Đã xóa tiến trình của ' + name);
      });
    });
    $('parent-gate-form').addEventListener('submit', function (e) { e.preventDefault(); Sfx.unlock(); submitGate(); });
    click('btn-parent-gate-cancel', function () { closeGate(); });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        if (G.state === 'playing' || G.state === 'countdown') pauseGame();
        Music._halt();                                  // ngừng lịch phát nốt khi tab ẩn
        try { if (Sfx.ctx && Sfx.ctx.suspend) Sfx.ctx.suspend(); } catch (e) { /* bỏ qua */ }
      } else {
        Sfx.resume();
        if (inGame() && G.state !== 'over') requestWake();   // hệ thống thu hồi wake lock khi ẩn → xin lại
      }
    });
    window.addEventListener('blur', function () { if (G.state === 'playing' || G.state === 'countdown') pauseGame(); });
  }

  /** Sau thao tác hợp lệ mà audio vẫn chưa chạy thì nhắc người chơi (chỉ nhắc 1 lần). */
  function checkAudioBlocked() {
    if (checkAudioBlocked._done) return;
    checkAudioBlocked._done = true;
    setTimeout(function () {
      if (Store.data.sound === false && Store.data.music === false) return;
      if (Sfx.ctx && Sfx.ctx.state === 'running') return;
      checkAudioBlocked._shown = (checkAudioBlocked._shown || 0) + 1;
      if (checkAudioBlocked._shown > 2) return;              // nhắc tối đa 2 lần, không bám theo mỗi lần chạm
      checkAudioBlocked._done = false;
      toast(Sfx.isIOS
        ? '🔇 Âm thanh chưa bật: hãy tắt Chế độ im lặng (biểu tượng chuông), tăng âm lượng rồi chạm lại.'
        : '🔇 Chạm vào màn hình để bật âm thanh', 5000);
    }, 1500);
  }

  /* ================= TIỆN ÍCH THIẾT BỊ ================= */
  function requestWake() {
    try {
      if ('wakeLock' in navigator && navigator.wakeLock.request) {
        navigator.wakeLock.request('screen').then(function (l) {
          G.wakeLock = l;
          try { l.addEventListener('release', function () { if (G.wakeLock === l) G.wakeLock = null; }); } catch (e) { /* bỏ qua */ }
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
    if (!G.bgSky || frame.tick % 30 === 0) {
      const w = app.clientWidth, h = app.clientHeight;
      if (!G.bgSky || (w && h && (w !== G.W || h !== G.H))) resize();
    }
    if (!G.bgSky) return;
    // Menu để lâu không ai chạm: vẽ thưa lại và tắt nhạc cho đỡ tốn pin
    const idleFor = (G.state === 'menu' || G.state === 'levels') ? ts - G.lastInputAt : 0;
    if (idleFor > 180000 && !G.musicIdle) { G.musicIdle = true; Music.stop(); }
    if (idleFor > 90000 && frame.tick % 2 === 0) return;
    const t0 = performance.now();
    let t1 = t0;
    try {
      update(dt);
      t1 = performance.now();
      render();
    } catch (e) {
      // Một khung hình lỗi không được làm chết vòng lặp: thay mới danh sách thực thể rồi chơi tiếp
      try { clearHalves(); } catch (e2) { /* kho sprite hỏng thì bỏ qua */ }
      G.fruits = []; G.halves = []; G.parts = []; G.texts = []; G.stains = [];
      onFatal(e && e.message ? e.message : String(e));
      return;
    }
    const t2 = performance.now();
    const p = G.perf;
    p.n++;
    p.update += t1 - t0;
    p.render += t2 - t1;
    p.dt += dt;
    if (p.n >= 60) {
      p.avgUpdate = p.update / p.n; p.avgRender = p.render / p.n; p.avgDt = p.dt / p.n;
      p.n = 0; p.update = 0; p.render = 0; p.dt = 0;
    }
  }

  function boot() {
    Store.load();
    Motion.refresh();
    try {
      const mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mq && mq.addEventListener) mq.addEventListener('change', function () { Motion.refresh(); });
    } catch (e) { /* bỏ qua */ }
    G.duration = [60, 90, 120].indexOf(Number(Store.data.duration)) >= 0 ? Number(Store.data.duration) : 90;
    G.lastInputAt = performance.now();
    Voice.init();
    window.addEventListener('error', function (e) { onFatal(e && e.message ? e.message : 'error'); });
    window.addEventListener('unhandledrejection', function (e) { onFatal(e && e.reason && e.reason.message ? e.reason.message : 'unhandledrejection'); });
    renderPlayerChip();
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
    window.addEventListener('orientationchange', function () { setTimeout(resize, 250); setTimeout(resize, 600); });
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
  window.__NinjaToan = {
    G: G, Store: Store, Motion: Motion, Gate: Gate, Report: Report, PlayersUI: PlayersUI, Players: window.Players,
    startGame: startGame, endGame: endGame, launchWave: launchWave, updateGravity: updateGravity,
    sliceSegment: function (x0, y0, x1, y1) { return sliceSegment(null, x0, y0, x1, y1); },
    goMenu: goMenu, goLevels: goLevels, newQuestion: newQuestion, pickQuestion: pickQuestion, markHint: markHint,
    renderLevels: renderLevels, renderReport: renderReport, renderPlayers: renderPlayers, openReport: openReport,
    adultGate: adultGate, onFatal: onFatal, render: render, update: update,
    showHint: showHint, showResultFx: showResultFx, renderNextStep: renderNextStep
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
