/* ============================================================
   game.js – Bộ máy trò chơi Mê Cung Đồng Hồ
   - Canvas 2D, vòng lặp requestAnimationFrame theo thời gian thực (dt)
   - Cú Tí đi trong mê cung (kiểu Pacman), ăn hạt sáng, tránh Ma Ngủ Gật
   - Mỗi lượt: đọc mục tiêu (ví dụ "7 giờ 30 phút") rồi tìm đúng đồng hồ
   - Qua màn -> hỏi đáp (rút kinh nghiệm) -> mở khóa màn tiếp theo
   ============================================================ */
(function () {
  'use strict';

  const C = window.Clock, M = window.Mazes, Sfx = window.Sfx, Music = window.Music, Voice = window.Voice, Players = window.Players;
  const rnd = C.rnd, chance = C.chance, pick = C.pick;
  const TAU = Math.PI * 2;
  const FONT = '"Baloo 2", "Arial Rounded MT Bold", "Segoe UI", Arial, sans-serif';
  const $ = function (id) { return document.getElementById(id); };
  const clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  const MAX_LIVES = 3;
  const PLAYER_SPEED = 4.0;          // ô / giây
  const FRIGHT_TIME = 7;             // giây ma buồn ngủ sau khi ăn sao
  const MIN_CELL = 30;               // px – dưới mức này đổi sang mê cung nhỏ hơn
  const POINTS = { dot: 10, power: 50, clock: 100, fast: 50, ghost: 200, quiz: 100, life: 100, allDots: 300, streak: 25 };
  const GHOST_KINDS = [
    { kind: 'red', color: '#ef476f', name: 'Ma Đỏ', chase: 0.85 },
    { kind: 'pink', color: '#ff8fab', name: 'Ma Hồng', chase: 0.7 },
    { kind: 'cyan', color: '#4cc9f0', name: 'Ma Xanh', chase: 0.6 },
    { kind: 'orange', color: '#ffb703', name: 'Ma Cam', chase: 0.6 }
  ];
  const PRAISE = ['Chính xác!', 'Tuyệt vời!', 'Giỏi quá!', 'Đúng rồi!', 'Xuất sắc!', 'Siêu đỉnh!', 'Hay lắm!', 'Cú Tí giỏi ghê!'];
  const DIR = { up: { dx: 0, dy: -1 }, down: { dx: 0, dy: 1 }, left: { dx: -1, dy: 0 }, right: { dx: 1, dy: 0 } };

  /* ================= LƯU TRỮ (localStorage) ================= */
  /** Ép về số nguyên trong [a, b]; giá trị lạ (chuỗi, NaN, ∞) thành a. KHÔNG tin dữ liệu đọc từ máy. */
  function numIn(v, a, b) {
    const n = Number(v);
    return Number.isFinite(n) ? clamp(Math.round(n), a, b) : a;
  }
  /** Làm sạch thông tin của một mục "cần ôn lại". */
  function cleanInfo(info) {
    const o = {};
    o.kind = ['analog', 'period', 'digital', 'elapsed'].indexOf(info.kind) >= 0 ? info.kind : 'analog';
    if (info.h != null) o.h = numIn(info.h, 0, 23);
    if (info.m != null) o.m = numIn(info.m, 0, 59);
    if (info.start && typeof info.start === 'object') o.start = { h: numIn(info.start.h, 0, 23), m: numIn(info.start.m, 0, 59) };
    if (info.delta != null) o.delta = numIn(info.delta, 0, 120);
    if (typeof info.style === 'string') o.style = info.style.slice(0, 12);
    return o;
  }
  const Store = {
    key: 'me-cung-dong-ho-v1',
    // Thiết lập thiết bị ở mức trên; tiến trình của từng bé nằm trong players[<id>]
    data: { sound: true, music: true, voice: true, fx: 'full', players: {} },
    /** Tiến trình trống của một người chơi (hình dạng cũ + missed + stats). */
    blank() { return { unlocked: 1, records: {}, missed: {}, stats: { plays: 0, correct: 0, wrong: 0, seconds: 0, byTopic: {}, last: 0 } }; },
    reviver(k, v) { return (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v; },
    load() {
      let d = null;
      try { const raw = localStorage.getItem(this.key); if (raw) d = JSON.parse(raw, this.reviver); } catch (e) { d = null; }
      if (!d || typeof d !== 'object') d = {};
      this.data.sound = d.sound !== false; this.data.music = d.music !== false; this.data.voice = d.voice !== false;
      this.data.fx = d.fx === 'lite' ? 'lite' : 'full';
      this.data.players = {};
      const src = d.players && typeof d.players === 'object' ? d.players : {};
      for (const id in src) if (/^[A-Za-z0-9_-]{1,24}$/.test(id)) this.data.players[id] = this.sanitize(src[id]);
      // Di trú dữ liệu cũ (chưa có bé nào hợp lệ): đưa vào người chơi mặc định p1
      if (!Object.keys(this.data.players).length && (d.unlocked != null || d.records)) {
        this.data.players.p1 = this.sanitize({ unlocked: d.unlocked, records: d.records });
        this.save();
      }
    },
    /** Ép mọi giá trị của một bucket về đúng kiểu/khoảng. */
    sanitize(b) {
      const out = this.blank();
      if (!b || typeof b !== 'object') return out;
      out.unlocked = numIn(b.unlocked, 1, C.LEVELS.length);
      const recs = b.records && typeof b.records === 'object' ? b.records : {};
      C.LEVELS.forEach(function (l) {
        const r = recs[l.id];
        if (!r || typeof r !== 'object') return;
        out.records[l.id] = { best: numIn(r.best, 0, 999999), stars: numIn(r.stars, 0, 3), passed: r.passed === true, plays: numIn(r.plays, 0, 1e6) };
      });
      const missed = b.missed && typeof b.missed === 'object' ? b.missed : {};
      const keys = Object.keys(missed).filter(function (k) { return k.length <= 80 && missed[k] && typeof missed[k] === 'object'; });
      keys.sort(function (x, y) { return (Number(missed[y].last) || 0) - (Number(missed[x].last) || 0); });
      keys.slice(0, 60).forEach(function (k) {
        const e = missed[k];
        const info = e.info && typeof e.info === 'object' ? cleanInfo(e.info) : null;
        out.missed[k] = { n: numIn(e.n, 0, 1e6), ok: numIn(e.ok, 0, 10), last: numIn(e.last, 0, 1e14), info: info };
      });
      const s = b.stats && typeof b.stats === 'object' ? b.stats : {};
      out.stats.plays = numIn(s.plays, 0, 1e6); out.stats.correct = numIn(s.correct, 0, 1e7); out.stats.wrong = numIn(s.wrong, 0, 1e7);
      out.stats.seconds = numIn(s.seconds, 0, 1e9); out.stats.last = numIn(s.last, 0, 1e14);
      const bt = s.byTopic && typeof s.byTopic === 'object' ? s.byTopic : {};
      Object.keys(bt).slice(0, 40).forEach(function (k) {
        const t = bt[k];
        if (t && typeof t === 'object' && k.length <= 40) out.stats.byTopic[k] = { c: numIn(t.c, 0, 1e7), w: numIn(t.w, 0, 1e7) };
      });
      return out;
    },
    save() {
      try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* bỏ qua */ }
    },
    activeId() { return Players ? Players.active().id : 'p1'; },
    /** Bucket tiến trình của người chơi đang hoạt động (tạo mới nếu chưa có). */
    p() {
      const id = this.activeId();
      if (!this.data.players[id]) this.data.players[id] = this.blank();
      return this.data.players[id];
    },
    rec(level) { return this.p().records[level.id] || { best: 0, stars: 0, passed: false, plays: 0 }; },
    setRec(level, rec) { this.p().records[level.id] = rec; this.save(); },
    isUnlocked(idx) { return idx < this.p().unlocked; },
    unlock(idx) {
      const b = this.p();
      if (idx + 1 > b.unlocked) { b.unlocked = Math.min(idx + 1, C.LEVELS.length); this.save(); return true; }
      return false;
    },
    /** Ghi nhận một câu bé làm sai (để ôn lại). Tối đa 60 mục, bỏ mục cũ nhất. */
    noteMissed(key, info) {
      const m = this.p().missed; key = String(key).slice(0, 80);
      const e = m[key] || { n: 0, ok: 0, last: 0, info: null };
      e.n++; e.ok = 0; e.last = Date.now(); e.info = info ? cleanInfo(info) : e.info; m[key] = e;
      const keys = Object.keys(m);
      if (keys.length > 60) { keys.sort(function (a, b) { return m[a].last - m[b].last; }); delete m[keys[0]]; }
      this.save();
    },
    /** Bé làm đúng một mục đang ôn: đúng 2 lần thì bỏ khỏi danh sách. */
    noteOk(key) {
      key = String(key).slice(0, 80);
      const m = this.p().missed, e = m[key];
      if (!e) return;
      e.ok++;
      if (e.ok >= 2) delete m[key];
      this.save();
    },
    /** Danh sách cần ôn (ưu tiên mục sai nhiều, mới nhất). filterFn(info, key) để lọc theo màn. */
    reviewPool(filterFn) {
      const m = this.p().missed;
      return Object.keys(m).filter(function (k) { return !filterFn || filterFn(m[k].info, k); })
        .sort(function (a, b) { return m[b].n - m[a].n || m[b].last - m[a].last; })
        .map(function (k) { return { key: k, info: m[k].info, n: m[k].n }; });
    },
    /** Cộng dồn thống kê sau mỗi ván: { correct, wrong, seconds, topic }. */
    addStats(round) {
      const s = this.p().stats;
      s.plays++; s.correct += round.correct || 0; s.wrong += round.wrong || 0; s.seconds += Math.round(round.seconds || 0); s.last = Date.now();
      if (round.topic) { const t = s.byTopic[round.topic] || { c: 0, w: 0 }; t.c += round.correct || 0; t.w += round.wrong || 0; s.byTopic[round.topic] = t; }
      this.save();
    },
    resetActive() { this.data.players[this.activeId()] = this.blank(); this.save(); }
  };

  /* ================= TRẠNG THÁI ================= */
  const G = {
    W: 0, H: 0, dpr: 1, touch: false,
    state: 'menu',            // menu | levels | lesson | learn | countdown | playing | dying | ready | clear | paused | quiz | result
    level: null, levelIdx: -1,
    mazeId: 'A', maze: null, cell: 40, ox: 0, oy: 0, field: { x: 0, y: 0, w: 0, h: 0 },
    player: null, ghosts: [], dots: null, dotsLeft: 0, powers: [], items: [],
    round: 0, roundInfo: null, roundStart: 0, nextRoundAt: -1, roundWrong: 0, streak: 0,
    score: 0, lives: MAX_LIVES, found: 0, wrong: 0, ghostsEaten: 0, mistakes: [],
    fright: 0, frightCombo: 0, invuln: 0, stateT: 0,
    parts: [], texts: [], stars: [],
    anim: 0, time: 0, bg: null, mazeLayer: null, shake: 0, flash: null,
    hud: { score: -1, lives: -1, level: '', power: -1 },
    cdTimer: 0, wakeLock: null,
    lesson: { level: null, idx: 0, timer: 0 },
    learn: { t: C.T(7, 0), minutes: false, h24: false },
    quiz: null, result: null,
    reviewRounds: {}, usedTargets: [], welcomed: false, magnified: null, prevState: '', reportFrom: '',
    perf: { n: 0, update: 0, render: 0, frame: 0, avgUpdate: 0, avgRender: 0, avgFrame: 0 }
  };

  /* ================= DOM ================= */
  const app = $('app');
  const canvas = $('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  // Lớp riêng cho pháo giấy: nằm TRÊN lớp phủ mờ của màn kết quả nên bé nhìn thấy rõ
  const fxCanvas = $('fx');
  const fxCtx = fxCanvas ? fxCanvas.getContext('2d') : null;
  const ui = {
    hud: $('hud'), hudTop: document.querySelector('#hud .hud-top'), dpad: $('dpad'),
    menu: $('menu'), levels: $('levels'), lesson: $('lesson'), learn: $('learn'), howto: $('howto'), countdown: $('countdown'),
    pause: $('pause'), quiz: $('quiz'), result: $('result'), toast: $('toast'),
    score: $('hud-score'), levelChip: $('hud-level'), power: $('hud-power'), target: $('hud-target'), targetClock: $('hud-target-clock'),
    targetText: $('hud-target-text'), hint: $('hud-hint'), lives: $('hud-lives'),
    countNum: $('count-num'), levelGrid: $('level-grid'),
    lessonTitle: $('lesson-title'), lessonClock: $('lesson-clock'), lessonText: $('lesson-text'), lessonDemos: $('lesson-demos'),
    learnClock: $('learn-clock'), learnRead: $('learn-read'), learnAlt: $('learn-alt'), learnDigital: $('learn-digital'), learnSteps: $('learn-steps'), learnMinutes: $('btn-learn-minutes'),
    learnPeriod: $('learn-period'), learn24h: $('btn-learn-24h'),
    quizProgress: $('quiz-progress'), quizQ: $('quiz-q'), quizClock: $('quiz-clock'), quizOptions: $('quiz-options'), quizFeedback: $('quiz-feedback'), fbTitle: $('fb-title'), fbText: $('fb-text'),
    resultTitle: $('result-title'), resultLevel: $('result-level'), resultScore: $('result-score'), resultStars: $('result-stars'), resultRecord: $('result-record'),
    stFound: $('st-found'), stWrong: $('st-wrong'), stGhost: $('st-ghost'), stQuiz: $('st-quiz'), takeaway: $('result-takeaway'), resultReview: $('result-review'), unlockNote: $('result-unlock'),
    btnNext: $('btn-next-level'), ipadTip: $('ipad-tip'), pauseInfo: $('pause-info'),
    players: $('players'), report: $('report'), gate: $('parent-gate')
  };
  const SCREENS = ['menu', 'levels', 'lesson', 'learn', 'countdown', 'pause', 'quiz', 'result'];
  // Lớp phủ (không đổi G.state): hướng dẫn, người chơi, kết quả, cổng phụ huynh
  const OVERLAYS = ['howto', 'players', 'report', 'gate'];

  function showScreen(name) {
    SCREENS.forEach(function (k) { ui[k].classList.toggle('hidden', k !== name); });
    OVERLAYS.forEach(function (k) { ui[k].classList.add('hidden'); });
  }
  function openOverlay(name) {
    // Cổng phụ huynh nằm đè lên lớp phủ đang mở (báo cáo / người chơi) nên không đóng các lớp khác
    if (name === 'gate') { ui.gate.classList.remove('hidden'); return; }
    OVERLAYS.forEach(function (k) { if (k !== 'gate') ui[k].classList.toggle('hidden', k !== name); });
  }
  function overlayOpen() {
    return OVERLAYS.some(function (k) { return !ui[k].classList.contains('hidden'); });
  }
  /** Đóng lớp phủ trên cùng (cổng phụ huynh trước, rồi các lớp còn lại). */
  function closeOverlay() {
    if (!ui.gate.classList.contains('hidden')) { closeGate(); return; }
    if (!ui.report.classList.contains('hidden') && G.reportFrom === 'players') { openOverlay('players'); renderPlayers(); return; }
    OVERLAYS.forEach(function (k) { ui[k].classList.add('hidden'); });
  }
  function focusEl(id) {
    setTimeout(function () {
      try { const el = typeof id === 'string' ? $(id) : id; if (el && !el.hidden && !el.disabled) el.focus({ preventScroll: true }); } catch (e) { /* bỏ qua */ }
    }, 60);
  }
  function showHud(on) {
    ui.hud.classList.toggle('hidden', !on);
    ui.dpad.classList.toggle('off', !(on && G.touch));
  }
  function toast(msg, ms) {
    ui.toast.textContent = msg;
    ui.toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { ui.toast.classList.remove('show'); }, ms || 1800);
  }
  function fmt(n) { try { return Number(n).toLocaleString('vi-VN'); } catch (e) { return String(n); } }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function inGame() { return ['countdown', 'playing', 'dying', 'ready', 'clear', 'paused'].indexOf(G.state) >= 0; }
  function starsHtml(n) {
    let s = '';
    for (let i = 1; i <= 3; i++) s += '<span class="' + (i <= n ? 'on' : 'off') + '">★</span>';
    return s;
  }

  /* ================= KÍCH THƯỚC & BỐ CỤC ================= */
  function resize() {
    const w = app.clientWidth || window.innerWidth;
    const h = app.clientHeight || window.innerHeight;
    if (!w || !h) return;
    G.dpr = Math.min(window.devicePixelRatio || 1, 2);
    G.W = w; G.H = h;
    canvas.width = Math.round(w * G.dpr);
    canvas.height = Math.round(h * G.dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    if (fxCanvas) {
      fxCanvas.width = canvas.width; fxCanvas.height = canvas.height;
      fxCanvas.style.width = w + 'px'; fxCanvas.style.height = h + 'px';
    }
    buildBackground();
    layout();
  }

  /** Vùng còn trống cho mê cung (trừ HUD phía trên và nút di chuyển). */
  function computeField() {
    const W = G.W, H = G.H;
    const sal = safe('left'), sar = safe('right'), sat = safe('top'), sab = safe('bottom');
    const f = { x: sal + 8, y: sat + 8, w: W - sal - sar - 16, h: H - sat - sab - 16 };
    if (inGame() || G.state === 'quiz' || G.state === 'result') {
      const hr = ui.hudTop.getBoundingClientRect();
      if (hr.height) f.y = Math.max(f.y, hr.bottom + 6);
      if (G.touch) {
        const pr = ui.dpad.getBoundingClientRect();
        if (pr.width) {
          if (W <= H) f.h = Math.min(H - sab - 8, pr.top - 6) - f.y;         // dọc: nút ở dưới
          else f.w = pr.left - 8 - f.x;                                       // ngang: nút bên phải
        }
      }
      f.h = H - sab - 8 - f.y < f.h ? H - sab - 8 - f.y : f.h;
    }
    f.w = Math.max(120, f.w); f.h = Math.max(120, f.h);
    return f;
  }
  function safe(side) {
    try {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--sa' + side[0]);
      return parseFloat(v) || 0;
    } catch (e) { return 0; }
  }

  function cellFor(mazeId, transposed, f) {
    const raw = M.RAW[mazeId];
    const rows = transposed ? raw.rows[0].length : raw.rows.length;
    const cols = transposed ? raw.rows.length : raw.rows[0].length;
    return Math.floor(Math.min(f.w / cols, f.h / rows));
  }

  /** Chọn mê cung vừa màn hình: ưu tiên mê cung của màn, nếu ô quá nhỏ thì dùng mê cung nhỏ hơn. */
  function chooseMaze(preferred, f) {
    const transposed = f.h > f.w;
    // Chừa lề phòng khi thẻ mục tiêu của các lượt sau dài hơn (HUD cao thêm)
    const ff = { w: f.w - 8, h: f.h - 28 };
    const order = [preferred].concat(['C', 'B', 'A'].filter(function (id) { return id !== preferred; }));
    for (let i = 0; i < order.length; i++) {
      if (cellFor(order[i], transposed, ff) >= MIN_CELL) return { id: order[i], transposed: transposed };
    }
    return { id: 'A', transposed: transposed };
  }

  /** Đo vùng trống với HUD ở trạng thái cao nhất (thẻ sao hiện) để bố cục mê cung không phải đổi khi thẻ sao xuất hiện. */
  function measureField() {
    if (!inGame()) return computeField();
    const wasHidden = ui.power.hidden, text = ui.power.textContent;
    ui.power.hidden = false; ui.power.textContent = '⭐ Ma buồn ngủ 7s';
    const f = computeField();
    ui.power.hidden = wasHidden; ui.power.textContent = text;
    return f;
  }
  function layout() {
    G.field = measureField();
    if (!G.maze) return;
    const wantT = G.field.h > G.field.w;
    if (wantT !== G.maze.transposed) transposeState(wantT);
    const m = G.maze;
    G.cell = Math.max(14, Math.floor(Math.min(G.field.w / m.cols, G.field.h / m.rows)));
    G.ox = Math.round(G.field.x + (G.field.w - G.cell * m.cols) / 2);
    G.oy = Math.round(G.field.y + (G.field.h - G.cell * m.rows) / 2);
    buildMazeLayer();
  }

  /** Xoay toàn bộ trạng thái khi thiết bị đổi hướng (hàng <-> cột). */
  function transposeState(wantT) {
    G.maze = M.build(G.mazeId, wantT);
    const dots = [];
    for (let r = 0; r < G.maze.rows; r++) { dots.push([]); for (let c = 0; c < G.maze.cols; c++) dots[r].push(G.dots[c][r]); }
    G.dots = dots;
    const swapCell = function (p) { if (p) { const r = p.r; p.r = p.c; p.c = r; } };
    const swapEnt = function (e) {
      swapCell(e.from); swapCell(e.to); swapCell(e.home); swapCell(e.corner);
      if (e.dir) e.dir = { dx: e.dir.dy, dy: e.dir.dx };
      if (e.want) e.want = { dx: e.want.dy, dy: e.want.dx };
      syncPos(e);
    };
    swapEnt(G.player);
    G.ghosts.forEach(swapEnt);
    G.items.forEach(swapCell);
    G.powers.forEach(swapCell);
  }

  /* ================= NỀN & LỚP MÊ CUNG ================= */
  /** Vẽ sẵn một lớp (w×h px CSS). Dùng lại canvas cũ nếu kích thước không đổi (đỡ cấp phát khi xoay màn hình). */
  function layer(w, h, fn, existing) {
    const pw = Math.max(1, Math.round(w * G.dpr)), ph = Math.max(1, Math.round(h * G.dpr));
    let c = existing;
    if (!c || c.width !== pw || c.height !== ph) {
      c = document.createElement('canvas');
      c.width = pw; c.height = ph;
    }
    const cx = c.getContext('2d');
    cx.setTransform(1, 0, 0, 1, 0, 0);
    cx.clearRect(0, 0, pw, ph);
    cx.scale(G.dpr, G.dpr);
    fn(cx);
    return c;
  }
  function seededRand(seed) {
    let s = (seed >>> 0) || 1;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  function buildBackground() {
    const W = G.W, H = G.H;
    G.bg = layer(W, H, function (c) {
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#0b1240'); g.addColorStop(0.6, '#1a2270'); g.addColorStop(1, '#2d2a7a');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      const rand = seededRand(42);
      // Mây mờ
      for (let i = 0; i < 5; i++) {
        const x = W * rand(), y = H * 0.8 * rand(), r = Math.min(W, H) * (0.25 + rand() * 0.3);
        const ng = c.createRadialGradient(x, y, 0, x, y, r);
        ng.addColorStop(0, 'rgba(120,110,230,0.18)'); ng.addColorStop(1, 'rgba(120,110,230,0)');
        c.fillStyle = ng; c.fillRect(x - r, y - r, r * 2, r * 2);
      }
      // Sao
      for (let i = 0; i < 110; i++) {
        const x = W * rand(), y = H * rand(), r = 0.5 + rand() * 1.5;
        c.fillStyle = 'rgba(255,255,255,' + (0.35 + rand() * 0.6) + ')';
        c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
      }
      // Trăng
      const mx = W * 0.86, my = H * 0.16, mr = clamp(Math.min(W, H) * 0.06, 22, 54);
      const mg = c.createRadialGradient(mx, my, mr * 0.2, mx, my, mr * 2.6);
      mg.addColorStop(0, 'rgba(255,240,180,0.35)'); mg.addColorStop(1, 'rgba(255,240,180,0)');
      c.fillStyle = mg; c.beginPath(); c.arc(mx, my, mr * 2.6, 0, TAU); c.fill();
      c.fillStyle = '#fff3c4'; c.beginPath(); c.arc(mx, my, mr, 0, TAU); c.fill();
      c.fillStyle = 'rgba(0,0,0,0.06)';
      c.beginPath(); c.arc(mx - mr * 0.3, my - mr * 0.2, mr * 0.18, 0, TAU); c.fill();
      c.beginPath(); c.arc(mx + mr * 0.25, my + mr * 0.3, mr * 0.12, 0, TAU); c.fill();
      // Đồi xa
      c.fillStyle = 'rgba(20,18,70,0.9)';
      c.beginPath(); c.moveTo(0, H);
      for (let x = 0; x <= W; x += 20) c.lineTo(x, H - H * 0.08 - Math.sin(x / W * 6) * H * 0.03 - Math.sin(x / W * 17) * H * 0.012);
      c.lineTo(W, H); c.closePath(); c.fill();
    }, G.bg);
    // Sao lấp lánh: gieo cố định để không "nhảy" khi xoay màn hình
    const sr = seededRand(7);
    G.stars = [];
    for (let i = 0; i < 24; i++) G.stars.push({ x: sr() * W, y: sr() * H * 0.7, p: sr() * TAU, s: 1 + sr() * 1.5 });
  }

  /** Lớp mê cung chỉ to bằng mê cung (không phải cả màn hình); vẽ tại (G.ox-4, G.oy-4). */
  function buildMazeLayer() {
    const m = G.maze, s = G.cell;
    if (!m) { G.mazeLayer = null; return; }
    const lw = s * m.cols + 8, lh = s * m.rows + 8;
    G.mazeLayerW = lw; G.mazeLayerH = lh;
    G.mazeLayer = layer(lw, lh, function (c) {
      const x0 = 4, y0 = 4;
      // Nền lối đi
      c.fillStyle = 'rgba(8,10,40,0.55)';
      roundRect(c, 0, 0, lw, lh, 12); c.fill();
      // Tường: một gradient dùng chung, dịch chuyển theo từng ô
      const g = c.createLinearGradient(0, 0, 0, s);
      g.addColorStop(0, '#6b6ff0'); g.addColorStop(1, '#3f3fb8');
      const rad = Math.max(3, s * 0.18), hiH = Math.max(2, s * 0.22), hiR = Math.max(2, s * 0.12);
      for (let r = 0; r < m.rows; r++) {
        for (let col = 0; col < m.cols; col++) {
          if (!m.wall[r][col]) continue;
          c.save();
          c.translate(x0 + col * s, y0 + r * s);
          c.fillStyle = g;
          roundRect(c, 1, 1, s - 2, s - 2, rad); c.fill();
          c.fillStyle = 'rgba(255,255,255,0.18)';
          roundRect(c, 3, 3, s - 6, hiH, hiR); c.fill();
          c.restore();
        }
      }
      // Cửa đường hầm sáng nhẹ
      c.fillStyle = 'rgba(255,255,255,0.08)';
      for (let r = 0; r < m.rows; r++) {
        if (!m.wall[r][0]) c.fillRect(x0 - 4, y0 + r * s, 6, s);
        if (!m.wall[r][m.cols - 1]) c.fillRect(x0 + m.cols * s - 2, y0 + r * s, 6, s);
      }
      for (let col = 0; col < m.cols; col++) {
        if (!m.wall[0][col]) c.fillRect(x0 + col * s, y0 - 4, s, 6);
        if (!m.wall[m.rows - 1][col]) c.fillRect(x0 + col * s, y0 + m.rows * s - 2, s, 6);
      }
    }, G.mazeLayer);
  }

  function roundRect(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  /* ================= THỰC THỂ ================= */
  function makeEntity(cell, speed) {
    return { from: { r: cell.r, c: cell.c }, to: { r: cell.r, c: cell.c }, t: 1, dir: null, want: null, moving: false, speed: speed, x: cell.c + 0.5, y: cell.r + 0.5 };
  }
  function syncPos(e) {
    if (!e.moving || !e.dir) { e.x = e.from.c + 0.5; e.y = e.from.r + 0.5; return; }
    e.x = e.from.c + 0.5 + e.dir.dx * e.t;
    e.y = e.from.r + 0.5 + e.dir.dy * e.t;
  }
  function px(x) { return G.ox + x * G.cell; }
  function py(y) { return G.oy + y * G.cell; }

  /** Di chuyển thực thể trên lưới. decide(e) trả về hướng tiếp theo khi ở tâm ô (hoặc null để dừng). */
  function stepEntity(e, dt, decide) {
    let dist = e.speed * dt;
    let guard = 0;
    while (dist > 0 && guard++ < 8) {
      if (!e.moving || e.t >= 1) {
        const d = decide(e);
        if (!d) { e.moving = false; e.t = 1; syncPos(e); return; }
        e.dir = d;
        e.to = { r: e.from.r + d.dy, c: e.from.c + d.dx };
        e.t = 0; e.moving = true;
      }
      const step = Math.min(dist, 1 - e.t);
      e.t += step; dist -= step;
      syncPos(e);
      if (e.t >= 1 - 1e-6) {
        e.t = 1;
        const n = M.norm(G.maze, e.to.r, e.to.c) || { r: e.from.r, c: e.from.c };
        e.from = { r: n.r, c: n.c };
        e.to = { r: n.r, c: n.c };
        syncPos(e);
        if (e.onArrive) e.onArrive(e);
        if (G.state !== 'playing') return;
      }
    }
  }

  function playerDecide(p) {
    const m = G.maze, r = p.from.r, c = p.from.c;
    if (p.want && M.isOpen(m, r + p.want.dy, c + p.want.dx)) { return p.want; }
    if (p.moving && p.dir && M.isOpen(m, r + p.dir.dy, c + p.dir.dx)) return p.dir;
    return null;
  }

  function setWant(d) {
    const p = G.player;
    if (!p) return;
    p.want = d;
    // Quay đầu ngay lập tức khi đang đi
    if (p.moving && p.dir && p.t > 0 && p.t < 1 && d.dx === -p.dir.dx && d.dy === -p.dir.dy) {
      const oldFrom = p.from;
      const n = M.norm(G.maze, p.to.r, p.to.c) || oldFrom;
      p.from = { r: n.r, c: n.c };
      p.to = { r: oldFrom.r, c: oldFrom.c };
      p.dir = d;
      p.t = 1 - p.t;
      syncPos(p);
    }
  }

  function ghostTarget(g) {
    const p = G.player;
    const pc = p.from;
    switch (g.kind) {
      case 'red': return { r: pc.r, c: pc.c };
      case 'pink': {
        const d = p.dir || { dx: 0, dy: -1 };
        return { r: pc.r + d.dy * 3, c: pc.c + d.dx * 3 };
      }
      case 'cyan': return chance(0.5) ? { r: pc.r, c: pc.c } : g.corner;
      default: {
        const dd = Math.abs(g.from.r - pc.r) + Math.abs(g.from.c - pc.c);
        return dd > 6 ? { r: pc.r, c: pc.c } : g.corner;
      }
    }
  }

  function ghostDecide(g) {
    const m = G.maze, r = g.from.r, c = g.from.c;
    let dirs = M.openDirs(m, r, c);
    if (dirs.length > 1 && g.dir) dirs = dirs.filter(function (d) { return !(d.dx === -g.dir.dx && d.dy === -g.dir.dy); });
    if (!dirs.length) return null;
    if (g.state === 'fright') return pick(dirs);
    const target = ghostTarget(g);
    if (!target || Math.random() > g.chase) return pick(dirs);
    let best = null, bd = Infinity;
    for (let i = 0; i < dirs.length; i++) {
      const d = dirs[i];
      const nr = r + d.dy, nc = c + d.dx;
      const dd = (nr - target.r) * (nr - target.r) + (nc - target.c) * (nc - target.c) + Math.random() * 0.5;
      if (dd < bd) { bd = dd; best = d; }
    }
    return best;
  }

  function reverseGhost(g) {
    if (!g.moving || !g.dir) return;
    const oldFrom = g.from;
    const n = M.norm(G.maze, g.to.r, g.to.c) || oldFrom;
    g.from = { r: n.r, c: n.c };
    g.to = { r: oldFrom.r, c: oldFrom.c };
    g.dir = { dx: -g.dir.dx, dy: -g.dir.dy };
    g.t = 1 - g.t;
    syncPos(g);
  }

  /* ================= BẮT ĐẦU MÀN ================= */
  function startLevel(level) {
    G.level = level;
    G.levelIdx = C.LEVELS.indexOf(level);
    G.state = 'countdown';
    showHud(true);
    showScreen('countdown');
    Voice.stop();
    // Ôn lại thông minh: ~25% số lượt (1–3, không bao giờ lượt đầu) lấy từ các mục bé từng làm sai
    G.usedTargets = [];
    G.reviewRounds = {};
    const pool = poolFor(level);
    if (pool.length && level.rounds > 1) {
      const nRev = Math.min(pool.length, clamp(Math.round(level.rounds * 0.25), 1, 3));
      const slots = [];
      for (let i = 1; i < level.rounds; i++) slots.push(i);
      C.shuffle(slots);
      for (let i = 0; i < nRev; i++) G.reviewRounds[slots[i]] = pool[i];
    }
    // Sinh mục tiêu và vẽ thẻ HUD trước để đo đúng vùng trống còn lại cho mê cung.
    // Bố cục được "đóng băng" cho cả màn: gợi ý và thẻ sao nằm đè lên (absolute) nên không đổi chiều cao HUD.
    G.roundInfo = C.makeRound(level, null, G.usedTargets, { round: 0 });
    ui.hint.hidden = true; ui.power.hidden = true;
    G.fright = 0;
    renderTarget(false);
    G.field = measureField();
    const ch = chooseMaze(level.maze, G.field);
    G.mazeId = ch.id;
    G.maze = M.build(ch.id, ch.transposed);
    G.dots = G.maze.dot.map(function (row) { return row.slice(); });
    G.dotsLeft = G.maze.dotCount;
    G.powers = G.maze.powers.map(function (p) { return { r: p.r, c: p.c, taken: false }; });
    G.items = [];
    G.score = 0; G.lives = MAX_LIVES; G.found = 0; G.wrong = 0; G.ghostsEaten = 0; G.mistakes = [];
    G.round = 0; G.fright = 0; G.frightCombo = 0; G.invuln = 0; G.time = 0; G.nextRoundAt = -1; G.streak = 0;
    G.parts = []; G.texts = []; G.shake = 0; G.flash = null;
    G.hud = { score: -1, lives: -1, level: '', power: -1 };
    G.quiz = null; G.result = null;
    spawnEntities();
    layout();
    startRound(true, G.roundInfo);
    runCountdown();
    requestWake();
  }

  function spawnEntities() {
    const m = G.maze;
    const p = makeEntity(m.player, PLAYER_SPEED);
    p.anim = 0; p.dying = 0; p.mood = ''; p.moodT = 0; p.onArrive = onPlayerArrive;
    G.player = p;
    G.ghosts = [];
    const n = clamp(G.level.ghosts, 1, 4);
    const corners = [{ r: 1, c: 1 }, { r: 1, c: m.cols - 2 }, { r: m.rows - 2, c: 1 }, { r: m.rows - 2, c: m.cols - 2 }];
    for (let i = 0; i < n; i++) {
      const kind = GHOST_KINDS[i];
      const home = m.ghosts[i % m.ghosts.length];
      const g = makeEntity(home, G.level.speed);
      g.kind = kind.kind; g.color = kind.color; g.name = kind.name; g.chase = kind.chase;
      g.home = { r: home.r, c: home.c };
      g.corner = corners[i % corners.length];
      g.state = 'home';
      g.releaseAt = 0;
      g.id = i;
      G.ghosts.push(g);
    }
    resetPositions(true);
  }

  /** Đưa Cú Tí và ma về chỗ xuất phát (đầu màn hoặc sau khi mất tim). */
  function resetPositions(first) {
    const m = G.maze;
    const p = G.player;
    p.from = { r: m.player.r, c: m.player.c }; p.to = { r: m.player.r, c: m.player.c };
    p.t = 1; p.moving = false; p.dir = { dx: 0, dy: -1 }; p.want = null; p.dying = 0;
    syncPos(p);
    G.ghosts.forEach(function (g, i) {
      g.from = { r: g.home.r, c: g.home.c }; g.to = { r: g.home.r, c: g.home.c };
      g.t = 1; g.moving = false; g.dir = null; g.state = 'home';
      g.releaseAt = G.time + (first ? 1.0 : 1.5) + i * 2.2;
      syncPos(g);
    });
    G.fright = 0;
    G.frightCombo = 0;
    Music.setTempo(1);
    G.invuln = 2.0;
  }

  function runCountdown() {
    const seq = ['3', '2', '1', 'GO!'];
    let i = 0;
    clearTimeout(G.cdTimer);
    const tick = function () {
      if (G.state !== 'countdown') return;
      if (document.hidden) { G.cdTimer = setTimeout(tick, 300); return; }   // chờ khi tab bị ẩn
      ui.countNum.textContent = seq[i];
      ui.countNum.classList.toggle('go', i === 3);
      ui.countNum.style.animation = 'none';
      void ui.countNum.offsetWidth;
      ui.countNum.style.animation = '';
      Sfx.play(i === 3 ? 'go' : 'tick');
      i++;
      if (i < seq.length) G.cdTimer = setTimeout(tick, 900);
      else G.cdTimer = setTimeout(beginPlay, 700);
    };
    tick();
  }

  function beginPlay() {
    if (G.state !== 'countdown') return;
    G.state = 'playing';
    showScreen(null);
    showHud(true);
    Music.play('game');
    Music.setTempo(1);
    if (G.roundInfo) Voice.say(G.roundInfo.speech);
    G.roundStart = G.time;
  }

  /* ================= LƯỢT CHƠI (mục tiêu) ================= */
  function startRound(silent, info) {
    const level = G.level;
    if (!level) return;
    if (!info) {
      const rv = G.reviewRounds[G.round];
      info = C.makeRound(level, rv ? rv.info : null, G.usedTargets, { round: G.round });
    }
    G.roundInfo = info;
    G.roundWrong = 0;
    G.usedTargets.push(C.key(info.target));
    G.roundStart = G.time;
    G.nextRoundAt = -1;
    G.items = [];
    placeClocks(G.roundInfo);
    // Hồi lại ngôi sao đã ăn
    G.powers.forEach(function (p) { p.taken = false; });
    renderTarget(true);
    if (!silent) { Sfx.play('target'); Voice.say(G.roundInfo.speech); }
  }

  /** Đặt các đồng hồ vào các chỗ trống, xa Cú Tí và cách nhau. */
  function placeClocks(info) {
    const m = G.maze, p = G.player;
    const dist = M.distances(m, p.from.r, p.from.c);
    const n = info.items.length;
    const spots = m.spots.slice();
    let best = null;
    for (let attempt = 0; attempt < 40 && !best; attempt++) {
      const minPlayer = attempt < 20 ? 4 : attempt < 30 ? 3 : 2;
      const minGap = attempt < 10 ? 4 : attempt < 20 ? 3 : 2;
      const cand = C.shuffle(spots.filter(function (s) { return dist[s.r][s.c] >= minPlayer; }));
      const chosen = [];
      for (let i = 0; i < cand.length && chosen.length < n; i++) {
        const s = cand[i];
        let ok = true;
        for (let k = 0; k < chosen.length; k++) {
          if (Math.abs(chosen[k].r - s.r) + Math.abs(chosen[k].c - s.c) < minGap) { ok = false; break; }
        }
        if (ok) chosen.push(s);
      }
      if (chosen.length >= n) best = chosen;
    }
    if (!best) best = C.shuffle(spots).slice(0, n);
    G.items = info.items.map(function (t, i) {
      const s = best[i] || best[0];
      return { r: s.r, c: s.c, time: t, correct: C.same(t, info.target), style: info.style, taken: false, born: G.anim, wobble: Math.random() * TAU };
    });
  }

  function renderTarget(pop) {
    const ri = G.roundInfo;
    if (!ri) return;
    ui.targetText.innerHTML = (ri.review ? '<span class="review-tag">📝 Ôn lại</span> ' : '') + ri.html;
    if (ri.hudClock) {
      ui.targetClock.hidden = false;
      ui.targetClock.innerHTML = C.svgClock(ri.hudClock, { size: 112 });
    } else {
      ui.targetClock.hidden = true;
      ui.targetClock.innerHTML = '';
    }
    if (pop) cardFx('pop');
  }

  function cardFx(cls) {
    const el = ui.target;
    el.classList.remove('pop', 'shake', 'ok');
    void el.offsetWidth;
    el.classList.add(cls);
    clearTimeout(cardFx._t);
    cardFx._t = setTimeout(function () { el.classList.remove('shake', 'ok'); }, 700);
  }

  function showHint(text, kind, ms) {
    const el = ui.hint;
    el.textContent = text;
    el.className = 'hint ' + (kind || 'info');
    el.hidden = false;
    placeHint(el);
    clearTimeout(showHint._t);
    showHint._t = setTimeout(function () { el.hidden = true; }, ms || 2600);
  }
  /** Đo kích thước thật của thanh gợi ý: hiệu ứng "hint-pop" mới chạy nên nó đang bị thu nhỏ. */
  function steadyRect(el) {
    const prev = el.style.animation;
    el.style.animation = 'none';
    void el.offsetWidth;                 // buộc trình duyệt tính lại, bỏ transform của hiệu ứng
    const r = el.getBoundingClientRect();
    el.style.animation = prev;
    return r;
  }

  /** Lời giải thích dài có thể che chính chiếc đồng hồ vừa được đánh dấu -> hạ thanh gợi ý xuống dưới mê cung. */
  function placeHint(el) {
    if (!inGame() || !G.items.length) return;
    const it = G.items.find(function (o) { return o.hint && !o.taken && !o.wrongAt; });
    if (!it) return;
    const cx = px(it.c + 0.5), cy = py(it.r + 0.5), s = G.cell * 1.05;   // cả vòng sáng vàng (bán kính 0,92 ô)
    const hides = function (r) { return r.height > 0 && r.top < cy + s && r.bottom > cy - s && r.left < cx + s && r.right > cx - s; };
    if (!hides(steadyRect(el))) return;
    el.classList.add('low');
    if (hides(steadyRect(el))) el.classList.remove('low');   // ở dưới cũng che thì giữ chỗ cũ
  }

  /* ================= SỰ KIỆN TRONG MÊ CUNG ================= */
  function onPlayerArrive(p) {
    const r = p.from.r, c = p.from.c;
    if (G.dots[r][c]) {
      G.dots[r][c] = false;
      G.dotsLeft--;
      addScore(POINTS.dot);
      Sfx.play('dot');
      if (G.dotsLeft <= 0) {
        G.dots = G.maze.dot.map(function (row) { return row.slice(); });
        G.dotsLeft = G.maze.dotCount;
        addScore(POINTS.allDots);
        addText('+' + POINTS.allDots + ' Hết hạt sáng!', px(p.x), py(p.y) - G.cell, { color: '#ffd166' });
        Sfx.play('bonus');
        toast('🍬 Ăn hết hạt sáng! Thưởng +' + POINTS.allDots);
      }
    }
    for (let i = 0; i < G.powers.length; i++) {
      const pw = G.powers[i];
      if (!pw.taken && pw.r === r && pw.c === c) { pw.taken = true; onPower(p); }
    }
    for (let i = 0; i < G.items.length; i++) {
      const it = G.items[i];
      if (!it.taken && !it.wrongAt && it.r === r && it.c === c) { onItem(it); break; }
    }
  }

  function onPower(p) {
    addScore(POINTS.power);
    G.fright = FRIGHT_TIME;
    G.frightCombo = 0;
    G.ghosts.forEach(function (g) { if (g.state === 'active') { g.state = 'fright'; reverseGhost(g); } });
    Sfx.play('power');
    Music.setTempo(1.12);
    spawnBurst(px(p.x), py(p.y), G.cell * 0.4, ['#ffd166', '#fff3c4', '#ffb703'], 22);
    addText('⭐ Ma buồn ngủ!', px(p.x), py(p.y) - G.cell, { color: '#ffd166' });
  }

  /** Khóa và thông tin "ôn lại" của lượt hiện tại (Store.noteMissed / noteOk). */
  function reviewKey(level, ri) {
    if (level.kind === 'elapsed' && ri.extra) return 'elapsed|' + C.key(ri.extra.start) + '+' + ri.extra.delta;
    return level.kind + '|' + C.key(ri.target);
  }
  function reviewInfo(level, ri) {
    if (level.kind === 'elapsed' && ri.extra) return { kind: 'elapsed', start: { h: ri.extra.start.h, m: ri.extra.start.m }, delta: ri.extra.delta, style: ri.style };
    return { kind: level.kind, h: ri.target.h, m: ri.target.m, style: ri.style };
  }
  /** Các mục cần ôn phù hợp với màn này (đúng loại, đúng tập phút của màn). */
  function poolFor(level) {
    return Store.reviewPool(function (info) {
      if (!info || info.kind !== level.kind) return false;
      if (level.kind === 'elapsed') return !!(info.start && C.DELTAS.indexOf(info.delta) >= 0 && C.ALL_MINS.indexOf(info.start.m) >= 0);
      if (info.m == null || level.mins.indexOf(info.m) < 0) return false;
      if (level.kind === 'period') return info.h >= 6 && info.h <= 22 && info.h !== 12;
      return true;
    });
  }

  /** Lời gợi ý của lượt hiện tại: cách đọc (hoặc cách tính) ra đồng hồ cần tìm. */
  function hintText() {
    const ri = G.roundInfo, level = G.level;
    if (!ri || !level) return '';
    if (level.kind === 'elapsed' && ri.extra) {
      const d = ri.extra.delta;
      return C.fmtText(ri.extra.start) + ' + ' + (d === 60 ? '1 giờ' : d + ' phút') + ' = ' + C.fmtText(ri.target) + '. ' + C.explainRead(ri.target, { kem: !!level.kem });
    }
    return C.explainRead(ri.target, { kem: !!level.kem, style: ri.style });
  }
  /** Đánh dấu đồng hồ đúng bằng vòng sáng vàng (sau 2 lần nhầm, hoặc khi bé bấm 💡). */
  function markHint() {
    const it = G.items.find(function (o) { return o.correct && !o.taken && !o.wrongAt; });
    if (it) it.hint = true;
    return !!it;
  }
  /** Bé xin gợi ý: đánh dấu đồng hồ đúng, đọc cách xem giờ và bỏ thưởng "Nhanh!". */
  function askHint() {
    if (!G.roundInfo || !G.level || !inGame()) return;
    G.roundInfo.hinted = true;
    markHint();
    const t = hintText();
    showHint('💡 ' + t, 'info', 4200);
    Voice.say(t);
    Sfx.play('hint');
  }

  function onItem(it) {
    const p = G.player, ri = G.roundInfo, level = G.level;
    if (!p || !ri || !level) return;
    const x = px(p.x), y = py(p.y);
    if (it.correct) {
      it.taken = true;
      const fast = !ri.hinted && (G.time - G.roundStart) < 12;
      G.streak = ri.wrongCount ? 0 : G.streak + 1;
      const bonus = G.streak >= 2 ? POINTS.streak * G.streak : 0;
      const pts = POINTS.clock + (fast ? POINTS.fast : 0) + bonus;
      addScore(pts);
      G.found++;
      Sfx.play('clock');
      cardFx('ok');
      spawnBurst(x, y, G.cell * 0.6, ['#06d6a0', '#ffd166', '#fff', '#2ec4b6'], 36);
      addText('+' + pts + (fast ? ' Nhanh!' : ''), x, y - G.cell * 0.8, { color: '#06d6a0' });
      if (bonus) addText('🔥 ' + G.streak + ' liên tiếp!', x, y - G.cell * 1.7, { color: '#ffd166' });
      const praise = pick(PRAISE);
      setMood('happy', 1.6);
      showHint('✅ ' + praise + ' Đó là ' + C.describeItem(it.time, it.style, level), 'ok', 2200);
      Voice.say(praise);
      if (!ri.wrongCount) Store.noteOk(reviewKey(level, ri));
      G.round++;
      // Các đồng hồ còn lại mờ dần và không còn "ăn" được nữa
      G.items.forEach(function (o) { if (!o.taken) { o.taken = true; o.fade = G.time; } });
      if (G.round >= level.rounds) {
        if (G.wrong === 0) addText('⭐ Không nhầm lần nào!', px(p.x), py(p.y) - G.cell * (bonus ? 2.6 : 1.7), { color: '#ffd166' });
        levelClear();
      } else {
        G.nextRoundAt = G.time + 1.4;
      }
    } else {
      if (it.wrongAt) return;                       // chiếc này đã chọn nhầm rồi
      it.wrongAt = G.time;
      ri.wrongCount = (ri.wrongCount || 0) + 1;
      G.roundWrong = (G.roundWrong || 0) + 1;
      G.streak = 0;
      G.wrong++;
      const mkey = reviewKey(level, ri);
      G.mistakes.push({ shown: it.time, target: ri.target, style: it.style, key: mkey, info: reviewInfo(level, ri) });
      Store.noteMissed(mkey, reviewInfo(level, ri));
      const what = C.describeItem(it.time, it.style, level);
      setMood('sad', 2.4);
      Sfx.play('wrong');
      cardFx('shake');
      if (!Motion.lite) G.shake = 0.35;
      spawnBurst(x, y, G.cell * 0.5, ['#ef476f', '#ff8fab'], 16);
      addText('✗ ' + what, x, y - G.cell * 0.8, { color: '#ef476f' });
      // Màn đồng hồ điện tử: chỉ lúc này mới đọc giờ của đồng hồ kim (không đọc sẵn để khỏi lộ đáp án)
      const more = level.kind === 'digital' && ri.hudClock ? ' Đồng hồ kim đang chỉ ' + C.fmtText(ri.hudClock) + '.' : '';
      if (G.roundWrong >= 2) {
        // Nhầm 2 lần: chỉ luôn đồng hồ đúng (vòng sáng vàng) và giải thích cách xem
        markHint();
        const tip = hintText();
        showHint('💡 ' + tip, 'info', 4200);
        Voice.say('Ối! Đồng hồ đó chỉ ' + what + '. ' + tip);
      } else {
        showHint('❌ Đồng hồ đó chỉ ' + what, 'bad', 3200);
        Voice.say('Ối! Đồng hồ đó chỉ ' + what + '.' + more + ' ' + ri.speech);
      }
      loseLife(false);
      // Nghỉ một nhịp để bé kịp đọc lời giải thích (ma và Cú Tí đứng yên); không đè lên nhịp "mất tim cuối"
      if (G.state === 'playing') { G.state = 'ready'; G.stateT = 1.8; G.invuln = 2.5; }
    }
  }

  function addScore(n) {
    G.score += n;
  }

  /** Nét mặt của Cú Tí trong t giây (vui / tiu nghỉu / hoảng). */
  function setMood(kind, t) {
    const p = G.player;
    if (p) { p.mood = kind; p.moodT = t; }
  }

  function loseLife(byGhost) {
    G.lives--;
    ui.lives.classList.remove('hit'); void ui.lives.offsetWidth; ui.lives.classList.add('hit');
    if (G.lives <= 0) {
      G.lives = 0;
      if (byGhost) { G.state = 'dying'; G.stateT = 1.3; G.player.dying = 0.0001; }
      else { G.state = 'dying'; G.stateT = 1.0; }
      return;
    }
    if (byGhost) {
      G.state = 'dying'; G.stateT = 1.3; G.player.dying = 0.0001;
    } else {
      G.invuln = 1.5;
    }
  }

  function onGhostCatch(g) {
    if (G.state !== 'playing') return;
    if (g.state === 'fright') {
      g.state = 'home';
      g.from = { r: g.home.r, c: g.home.c }; g.to = { r: g.home.r, c: g.home.c }; g.t = 1; g.moving = false; g.dir = null;
      syncPos(g);
      g.releaseAt = G.time + 4;
      const pts = POINTS.ghost * Math.pow(2, Math.min(3, G.frightCombo));
      G.frightCombo++;
      G.ghostsEaten++;
      addScore(pts);
      Sfx.play('eatghost');
      spawnBurst(px(G.player.x), py(G.player.y), G.cell * 0.5, [g.color, '#fff', '#4cc9f0'], 26);
      addText('+' + pts + ' 👻', px(G.player.x), py(G.player.y) - G.cell * 0.8, { color: '#4cc9f0' });
      return;
    }
    if (G.invuln > 0) return;
    setMood('scared', 1.6);
    Sfx.play('hurt');
    if (!Motion.lite) { G.shake = 0.5; G.flash = { color: 'rgba(239,71,111,0.35)', t: 0.4 }; }
    showHint('👻 ' + g.name + ' bắt được Cú Tí!', 'bad', 2200);
    Voice.say('Ối, bị ' + g.name + ' bắt rồi!');
    loseLife(true);
  }

  function afterDying() {
    if (G.lives <= 0) { endLevel(false); return; }
    resetPositions(false);
    G.state = 'ready';
    G.stateT = 1.4;
    const what = G.roundInfo ? G.roundInfo.html.replace(/<[^>]+>/g, '') : '';
    showHint('Cẩn thận nhé! ' + what, 'info', 2600);
    if (G.roundInfo) Voice.say('Cẩn thận nhé! ' + G.roundInfo.speech);
  }

  function levelClear() {
    G.state = 'clear';
    G.stateT = 2.2;
    Sfx.play('levelclear');
    spawnConfetti(80);
    addText('🎉 Qua màn!', px(G.player.x), py(G.player.y) - G.cell * 1.8, { color: '#ffd166', size: G.cell * 0.9 });
    Voice.say('Tuyệt vời! Cú Tí đã tìm đủ đồng hồ. Bây giờ trả lời vài câu hỏi nhé!');
    releaseWake();
  }

  /* ================= HỎI ĐÁP ================= */
  function startQuiz() {
    if (!G.level) { goMenu(); return; }
    G.state = 'quiz';
    showHud(false);
    Music.play('menu');
    Music.setTempo(1);
    const list = C.buildQuiz(G.level, G.mistakes, 3, poolFor(G.level));
    G.quiz = { list: list, queue: list.slice(), total: list.length, firstTry: 0, correctDone: 0, tried: [], current: null, answered: false };
    // Màn hình hẹp ẩn lời dẫn cho gọn bảng -> nhắc một lần bằng toast
    if (!startQuiz._said && window.innerWidth <= 480) { startQuiz._said = true; toast('Trả lời đúng hết để mở màn tiếp theo nhé!', 2600); }
    showScreen('quiz');
    renderQuestion();
  }

  function renderQuestion() {
    const q = G.quiz && G.quiz.queue[0];
    if (!q) { endLevel(true); return; }
    G.quiz.current = q;
    G.quiz.answered = false;
    const done = G.quiz.correctDone;
    let dots = '';
    for (let i = 0; i < G.quiz.total; i++) dots += '<span class="dot' + (i < done ? ' done' : i === done ? ' now' : '') + '"></span>';
    ui.quizProgress.innerHTML = 'Câu ' + (done + 1) + '/' + G.quiz.total + ' ' + dots;
    ui.quizQ.innerHTML = (q.review ? '<span class="review-tag">📝 Ôn lại</span> ' : '') + q.text;
    if (q.clock) {
      ui.quizClock.hidden = false;
      // Vòng số phút chỉ có ích khi đồng hồ đủ to (màn hình hẹp thì chữ sẽ quá nhỏ)
      const showMins = (!!G.level.kem || G.level.id === 'l5') && G.W >= 700;
      ui.quizClock.innerHTML = q.clockStyle === 'analog' ? C.svgClock(q.clock, { size: 180, minutes: showMins }) : C.svgDigital(C.fmtDigital(q.clock, q.clockStyle === 'digital24'), { width: 200 });
    } else { ui.quizClock.hidden = true; ui.quizClock.innerHTML = ''; }
    ui.quizOptions.innerHTML = q.options.map(function (op, i) {
      let inner = '';
      if (op.clock) {
        inner += op.clockStyle === 'analog' ? C.svgClock(op.clock, { size: 130 }) : C.svgDigital(C.fmtDigital(op.clock, op.clockStyle === 'digital24'), { width: 150 });
        if (!op.hideLabel) inner += '<span>' + esc(op.label) + '</span>';
      } else inner = esc(op.label);
      return '<button type="button" class="opt" data-i="' + i + '" aria-label="' + esc('Đáp án ' + (i + 1) + ': ' + op.label) + '">' + inner + '</button>';
    }).join('');
    ui.quizFeedback.hidden = true;
    Voice.say(q.speech);
    focusEl(ui.quizOptions.querySelector('.opt'));
  }

  function quizAnswer(i) {
    const Q = G.quiz;
    if (!Q || Q.answered) return;
    const q = Q.current;
    Q.answered = true;
    const correct = i === q.answer;
    const btns = ui.quizOptions.querySelectorAll('.opt');
    for (let k = 0; k < btns.length; k++) {
      btns[k].disabled = true;
      if (k === q.answer) { btns[k].classList.add('right'); btns[k].setAttribute('aria-label', 'Đúng: ' + q.options[k].label); }
      else if (k === i) { btns[k].classList.add('wrong'); btns[k].setAttribute('aria-label', 'Sai: ' + q.options[k].label); }
      else btns[k].classList.add('dim');
    }
    const first = Q.tried.indexOf(q) < 0;
    if (first) Q.tried.push(q);
    Q.queue.shift();
    if (correct) {
      if (first) { Q.firstTry++; addScore(POINTS.quiz); if (q.reviewKey) Store.noteOk(q.reviewKey); }
      Q.correctDone++;
      Sfx.play('correct');
      ui.quizFeedback.className = 'quiz-feedback ok';
      ui.fbTitle.textContent = '🎉 ' + pick(PRAISE) + (first ? ' +' + POINTS.quiz + ' điểm' : '');
      ui.fbText.textContent = q.explain;
      Voice.say(pick(PRAISE) + ' ' + q.explain);
    } else {
      const ansOp = q.options[q.answer], ans = ansOp.label;
      if (q.reviewKey) Store.noteMissed(q.reviewKey, q.reviewInfo);
      // Hỏi lại câu này sau (đảo lại thứ tự đáp án)
      const again = Object.assign({}, q);
      const arr = q.options.map(function (op, k) { return { op: op, ok: k === q.answer }; });
      C.shuffle(arr);
      again.options = arr.map(function (x) { return x.op; });
      again.answer = arr.findIndex(function (x) { return x.ok; });
      Q.tried.push(again);
      Q.queue.push(again);
      Sfx.play('wrong');
      ui.quizFeedback.className = 'quiz-feedback bad';
      if (ansOp.hideLabel) {
        // Đáp án là hình đồng hồ: nói rõ đồng hồ bé đã chọn chỉ mấy giờ thay vì lặp lại câu hỏi
        const chosen = q.options[i];
        const chosenText = chosen && chosen.clock ? 'Đồng hồ con chọn chỉ ' + C.describeItem(chosen.clock, chosen.clockStyle, G.level) + '. ' : '';
        ui.fbTitle.textContent = '🤔 Chưa đúng. Đồng hồ đúng được tô xanh';
        ui.fbText.textContent = chosenText + q.explain + ' Câu này sẽ được hỏi lại, con nhớ nhé!';
        Voice.say('Chưa đúng. ' + chosenText + q.explain);
      } else {
        ui.fbTitle.textContent = '🤔 Chưa đúng. Đáp án là: ' + ans;
        ui.fbText.textContent = q.explain + ' Câu này sẽ được hỏi lại, con nhớ nhé!';
        Voice.say('Chưa đúng. Đáp án là ' + ans + '. ' + q.explain);
      }
    }
    ui.quizFeedback.hidden = false;
    $('btn-quiz-next').textContent = Q.queue.length ? 'Tiếp tục ▶' : '🏁 Xem kết quả';
    focusEl('btn-quiz-next');
    try { ui.quizFeedback.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { /* bỏ qua */ }
  }

  function quizNext() {
    const Q = G.quiz;
    if (!Q || !Q.answered) return;
    if (Q.queue.length) renderQuestion();
    else endLevel(true);
  }

  /* ================= KẾT THÚC MÀN ================= */
  function endLevel(win) {
    const level = G.level;
    if (!level) { goMenu(); return; }           // không có màn nào đang chơi -> không kẹt ở màn kết quả
    G.state = 'result';
    showHud(false);
    releaseWake();
    Voice.stop();
    const Q = G.quiz;
    const quizFirst = Q ? Q.firstTry : 0, quizTotal = Q ? Q.total : 3;
    if (win) addScore(G.lives * POINTS.life);
    const stars = win ? 1 + (quizFirst === quizTotal ? 1 : 0) + (G.wrong === 0 ? 1 : 0) : 0;
    const rec = Store.rec(level);
    const record = win && G.score > (rec.best || 0);
    let unlocked = false;
    try {
      rec.plays = (rec.plays || 0) + 1;
      if (win) { rec.best = Math.max(rec.best || 0, G.score); rec.stars = Math.max(rec.stars || 0, stars); rec.passed = true; }
      Store.setRec(level, rec);
      if (win) unlocked = Store.unlock(G.levelIdx + 1);
      Store.addStats({ correct: G.found + (Q ? quizFirst : 0), wrong: G.wrong + (Q ? quizTotal - quizFirst : 0), seconds: G.time, topic: level.id });
    } catch (e) { /* bỏ qua – lỗi lưu trữ không được chặn màn kết quả */ }
    const hasNext = G.levelIdx + 1 < C.LEVELS.length;
    const name = Players ? Players.active().name : 'con';

    ui.resultTitle.textContent = win ? (stars === 3 ? '🌟 Hoàn hảo!' : '🎉 Qua màn!') : '💔 Hết tim rồi!';
    ui.resultTitle.className = 'result-title ' + (win ? 'win' : 'lose');
    ui.resultLevel.textContent = 'Màn ' + level.n + ': ' + level.title + ' (Lớp ' + level.grade + ')';
    ui.resultScore.textContent = fmt(G.score);
    ui.resultStars.innerHTML = starsHtml(stars);
    ui.resultStars.setAttribute('aria-label', stars + ' trên 3 sao');
    ui.resultRecord.hidden = !record;
    ui.stFound.textContent = G.found + '/' + level.rounds;
    ui.stWrong.textContent = G.wrong;
    ui.stGhost.textContent = G.ghostsEaten;
    ui.stQuiz.textContent = Q ? quizFirst + '/' + quizTotal : '–';
    let take = '<b>Điều cần nhớ:</b> ' + esc(level.takeaway);
    if (!win && G.mistakes.length) {
      const mis = G.mistakes[G.mistakes.length - 1];
      take += '<br><b>Lần này con nhầm:</b> đồng hồ ' + esc(C.describeItem(mis.shown, mis.style, level)) + ' với ' + esc(C.describeItem(mis.target, mis.style, level)) + '. ' + esc(C.explainRead(mis.shown, { kem: !!level.kem, style: mis.style }));
    }
    ui.takeaway.innerHTML = take;
    // "Cần ôn lại": các đồng hồ nhầm trong ván này, rồi vài mục cũ cùng màn (hiện cả khi thắng lẫn khi thua)
    const rows = [], seenRev = {};
    G.mistakes.forEach(function (mis) {
      const k = mis.key || C.key(mis.target);
      if (seenRev[k] || rows.length >= 3) return;
      seenRev[k] = true;
      // Màn "Thời gian trôi": nhắc lại cả phép cộng (giờ + phút = …), không chỉ mỗi kết quả
      const want = mis.info && mis.info.kind === 'elapsed' && mis.info.start ? describeReview({ info: mis.info }) : C.describeItem(mis.target, mis.style, level);
      rows.push('📝 ' + want + ' (con chọn ' + C.describeItem(mis.shown, mis.style, level) + ')');
    });
    try {
      poolFor(level).forEach(function (it) {
        if (seenRev[it.key] || rows.length >= 5) return;
        seenRev[it.key] = true;
        rows.push('📝 ' + describeReview(it));
      });
    } catch (e) { /* bỏ qua */ }
    ui.resultReview.innerHTML = rows.length
      ? '<b>📝 Cần ôn lại:</b><ul>' + rows.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul>'
      : '';
    ui.resultReview.hidden = !rows.length;
    $('btn-result-lesson').hidden = win;                 // thua thì mời bé xem lại bài học rồi chơi tiếp
    ui.unlockNote.hidden = !(win && unlocked && hasNext);
    ui.unlockNote.textContent = hasNext ? '🔓 Đã mở khóa màn ' + (level.n + 1) + ': ' + C.LEVELS[G.levelIdx + 1].title + '!' : '🏆 Con đã hoàn thành tất cả các màn!';
    if (win && !hasNext) ui.unlockNote.hidden = false;
    ui.btnNext.hidden = !(win && hasNext);
    ui.toast.classList.remove('show');          // không để lời nhắc cũ che các nút của bảng kết quả
    showScreen('result');
    Music.play('menu');
    if (win) {
      Sfx.play(record ? 'record' : 'applause');
      if (unlocked) setTimeout(function () { Sfx.play('unlock'); }, 700);
      spawnConfetti(90);
      Voice.say(stars === 3 ? 'Hoàn hảo! ' + name + ' được ba sao!' : 'Giỏi lắm, ' + name + '! Qua màn rồi! ' + (unlocked && hasNext ? 'Đã mở khóa màn tiếp theo.' : ''));
    } else {
      Sfx.play('lose');
      Voice.say('Hết tim rồi. ' + name + ' thử lại nhé, nhớ nhìn kỹ kim ngắn và kim dài!');
    }
    focusEl(win && hasNext ? 'btn-next-level' : 'btn-retry');
  }

  /* ================= HẠT, CHỮ, PHÁO GIẤY ================= */
  function spawnBurst(x, y, r, colors, n) {
    if (Motion.lite) n = Math.ceil(n * 0.3);       // ít hiệu ứng: bớt hạt
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, sp = 60 + Math.random() * 220;
      G.parts.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: 0.5 + Math.random() * 0.5, max: 1, size: r * (0.12 + Math.random() * 0.2), color: pick(colors), g: 260, spin: Math.random() * TAU, kind: 'dot' });
    }
    if (G.parts.length > 500) G.parts.splice(0, G.parts.length - 500);
  }
  function spawnConfetti(n) {
    const cols = ['#ff6b35', '#ffd166', '#06d6a0', '#118ab2', '#ef476f', '#7b5ea7', '#2ec4b6'];
    if (Motion.lite) n = Math.min(n, 20);
    for (let i = 0; i < n; i++) {
      G.parts.push({ x: Math.random() * G.W, y: -20 - Math.random() * G.H * 0.4, vx: (Math.random() - 0.5) * 120, vy: 80 + Math.random() * 140, life: 2.5 + Math.random() * 1.5, max: 4, size: 5 + Math.random() * 6, color: pick(cols), g: 60, spin: Math.random() * TAU, kind: 'confetti' });
    }
  }
  function addText(text, x, y, o) {
    o = o || {};
    const size = o.size || G.cell * 0.55;
    const half = Math.min(G.W / 2, text.length * size * 0.28 + 8);
    const tx = clamp(x, half, G.W - half);
    // Xếp tầng: dòng chữ mới không đè lên dòng chữ đang hiện ở cùng chỗ (ví dụ "+250 Nhanh!" và "🔥 3 liên tiếp!")
    // Giữ chữ trong khung mê cung (không đè lên HUD ở phía trên)
    const gap = Math.max(26, size * 1.35), lo = Math.max(size, G.oy > 0 ? G.oy + size * 0.8 : size), hi = G.H - size;
    const busy = function (v) { return G.texts.some(function (t) { return Math.abs(t.x - tx) < 200 && Math.abs(t.y - v) < Math.max(gap, t.size * 1.35); }); };
    const y0 = clamp(y, lo, hi);
    let ty = y0;
    for (let k = 1; k <= 6 && busy(ty); k++) {
      const up = clamp(y0 - k * gap, lo, hi), down = clamp(y0 + k * gap, lo, hi);
      if (!busy(up)) { ty = up; break; }
      if (!busy(down)) { ty = down; break; }
    }
    G.texts.push({ text: text, x: tx, y: ty, vy: -50, life: 1.2, max: 1.2, size: size, color: o.color || '#fff' });
  }

  /* ================= CẬP NHẬT ================= */
  function update(dt) {
    G.anim += dt;
    const st = G.state;
    // Hạt & chữ luôn chạy
    for (let i = G.parts.length - 1; i >= 0; i--) {
      const p = G.parts[i];
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.spin += dt * 4;
      if (p.life <= 0 || p.y > G.H + 40) G.parts.splice(i, 1);
    }
    for (let i = G.texts.length - 1; i >= 0; i--) {
      const t = G.texts[i];
      t.life -= dt; t.y += t.vy * dt;
      if (t.life <= 0) G.texts.splice(i, 1);
    }
    if (G.player && G.player.moodT > 0) { G.player.moodT -= dt; if (G.player.moodT <= 0) G.player.mood = ''; }
    if (G.shake > 0) G.shake = Math.max(0, G.shake - dt);
    if (G.flash) { G.flash.t -= dt; if (G.flash.t <= 0) G.flash = null; }
    if (!inGame() || st === 'paused' || st === 'countdown') { updateHud(); return; }
    G.time += dt;

    if (st === 'dying') {
      G.stateT -= dt;
      if (G.player.dying > 0) G.player.dying = clamp(1 - G.stateT / 1.3, 0, 1);
      if (G.stateT <= 0) afterDying();
      updateHud(); return;
    }
    if (st === 'ready') {
      G.stateT -= dt;
      if (G.stateT <= 0) { G.state = 'playing'; }
      updateHud(); return;
    }
    if (st === 'clear') {
      G.stateT -= dt;
      if (G.stateT <= 0) startQuiz();
      updateHud(); return;
    }

    // ----- playing -----
    if (G.invuln > 0) G.invuln -= dt;
    if (G.fright > 0) {
      G.fright -= dt;
      if (G.fright <= 0) {
        G.fright = 0;
        G.ghosts.forEach(function (g) { if (g.state === 'fright') g.state = 'active'; });
        Music.setTempo(1);
        Sfx.play('ghostwake');
      }
    }
    if (G.nextRoundAt > 0 && G.time >= G.nextRoundAt) startRound(false);

    const p = G.player;
    p.anim += dt;
    stepEntity(p, dt, playerDecide);
    if (G.state !== 'playing') { updateHud(); return; }

    G.ghosts.forEach(function (g) {
      if (g.state === 'home') {
        if (G.time >= g.releaseAt) { g.state = G.fright > 0 ? 'fright' : 'active'; g.dir = null; g.moving = false; }
        else return;
      }
      g.speed = G.level.speed * (g.state === 'fright' ? 0.55 : 1) * (G.round >= 3 ? 1.08 : 1);
      stepEntity(g, dt, ghostDecide);
      const dx = g.x - p.x, dy = g.y - p.y;
      if (dx * dx + dy * dy < 0.42) onGhostCatch(g);
    });
    updateHud();
  }

  function updateHud() {
    const h = G.hud;
    if (h.score !== G.score) {
      h.score = G.score;
      ui.score.textContent = fmt(G.score);
      ui.score.classList.remove('bump'); void ui.score.offsetWidth; ui.score.classList.add('bump');
    }
    if (h.lives !== G.lives) {
      h.lives = G.lives;
      const spans = ui.lives.children;
      for (let i = 0; i < spans.length; i++) spans[i].classList.toggle('lost', i >= G.lives);
      ui.lives.setAttribute('aria-label', 'Còn ' + G.lives + ' tim');
    }
    const lvl = G.level ? 'Màn ' + G.level.n + ' · 🕐 ' + Math.min(G.round, G.level.rounds) + '/' + G.level.rounds + (G.W >= 700 ? ' đồng hồ' : '') : '';
    if (h.level !== lvl) { h.level = lvl; ui.levelChip.textContent = lvl; }
    const pw = G.fright > 0 ? Math.ceil(G.fright) : 0;
    if (h.power !== pw) {
      h.power = pw;
      ui.power.hidden = pw === 0;
      if (pw) ui.power.textContent = '⭐ Ma buồn ngủ ' + pw + 's';
    }
  }

  /* ================= VẼ ================= */
  function render() {
    drawFxLayer();
    ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    ctx.globalAlpha = 1;
    if (G.bg) ctx.drawImage(G.bg, 0, 0, G.W, G.H);
    // Sao lấp lánh (một fillStyle, đổi globalAlpha – không tạo chuỗi màu mỗi sao)
    ctx.fillStyle = '#fff';
    for (let i = 0; i < G.stars.length; i++) {
      const s = G.stars[i];
      ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(G.anim * 1.5 + s.p));
      ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (!inGame() && G.state !== 'quiz' && G.state !== 'result') {
      drawMenuScene();
      drawParts(ctx);
      return;
    }
    if (!G.maze) return;
    ctx.save();
    if (G.shake > 0) {
      const k = G.shake * 10;
      ctx.translate((Math.random() - 0.5) * k, (Math.random() - 0.5) * k);
    }
    if (G.mazeLayer) ctx.drawImage(G.mazeLayer, G.ox - 4, G.oy - 4, G.mazeLayerW, G.mazeLayerH);
    drawDots();
    drawPowers();
    drawItems();
    G.ghosts.forEach(drawGhost);
    drawPlayer();
    drawMagnifier();
    ctx.restore();
    if (!partsOnFx()) drawParts(ctx);
    drawTexts();
    if (G.flash) {
      ctx.fillStyle = G.flash.color;
      ctx.globalAlpha = clamp(G.flash.t / 0.4, 0, 1);
      ctx.fillRect(0, 0, G.W, G.H);
      ctx.globalAlpha = 1;
    }
  }

  function drawMenuScene() {
    // Cú Tí bay lượn phía dưới menu cho vui
    const t = G.anim;
    const x = G.W * 0.5 + Math.sin(t * 0.5) * G.W * 0.35;
    const y = G.H * 0.88 + Math.sin(t * 2) * 8;
    drawOwl(x, y, clamp(G.W * 0.03, 18, 30), { dx: Math.cos(t * 0.5) >= 0 ? 1 : -1, dy: 0 }, t, 0, 'happy');
  }

  function drawDots() {
    const m = G.maze, s = G.cell;
    ctx.fillStyle = '#ffe08a';
    const r = Math.max(2, s * 0.1);
    for (let row = 0; row < m.rows; row++) {
      const line = G.dots[row];
      for (let col = 0; col < m.cols; col++) {
        if (!line[col]) continue;
        ctx.beginPath(); ctx.arc(px(col + 0.5), py(row + 0.5), r, 0, TAU); ctx.fill();
      }
    }
  }

  /* Bộ đệm sprite: đồng hồ và ngôi sao (có quầng sáng) được vẽ sẵn một lần,
     mỗi khung hình chỉ drawImage -> nhẹ cho iPad. */
  const sprites = { map: {}, keys: [] };
  function sprite(key, size, draw) {
    let sp = sprites.map[key];
    if (sp) return sp;
    const c = document.createElement('canvas');
    c.width = Math.ceil(size * G.dpr); c.height = Math.ceil(size * G.dpr);
    const cx = c.getContext('2d');
    cx.scale(G.dpr, G.dpr);
    draw(cx, size);
    sp = { c: c, size: size };
    sprites.map[key] = sp;
    sprites.keys.push(key);
    if (sprites.keys.length > 80) delete sprites.map[sprites.keys.shift()];
    return sp;
  }
  /** Sprite đồng hồ cho ô cỡ s (mặc định G.cell). Bán kính 0.78 s để đọc được cả trên điện thoại. */
  function itemSprite(it, s) {
    s = s || G.cell;
    const key = 'i|' + it.style + '|' + C.key(it.time) + '|' + s + '|' + G.dpr;
    return sprite(key, Math.ceil(s * 2), function (cx, size) {
      const h = size / 2;
      cx.save();
      cx.shadowColor = 'rgba(255,255,255,0.7)'; cx.shadowBlur = s * 0.3;
      cx.fillStyle = 'rgba(255,255,255,0.9)';
      if (it.style === 'analog') { cx.beginPath(); cx.arc(h, h, s * 0.78, 0, TAU); cx.fill(); }
      else { roundRect(cx, h - s * 0.85, h - s * 0.47, s * 1.7, s * 0.95, s * 0.26); cx.fill(); }
      cx.restore();
      if (it.style === 'analog') C.drawClock(cx, h, h, s * 0.78, it.time);
      else C.drawDigital(cx, h, h, s * 1.7, C.itemLabel(it.time, it.style));
    });
  }
  function starSprite() {
    const s = G.cell;
    return sprite('star|' + s + '|' + G.dpr, Math.ceil(s * 1.3), function (cx, size) {
      const h = size / 2;
      cx.save();
      cx.shadowColor = 'rgba(255,209,102,0.9)'; cx.shadowBlur = s * 0.3;
      cx.fillStyle = '#ffd166';
      drawStarPath(cx, h, h, s * 0.34, s * 0.15, 0);
      cx.fill();
      cx.restore();
      cx.strokeStyle = '#e0a800'; cx.lineWidth = Math.max(1, s * 0.04);
      drawStarPath(cx, h, h, s * 0.34, s * 0.15, 0);
      cx.stroke();
    });
  }
  function drawStarPath(c, x, y, R, r, rot) {
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 === 0 ? R : r;
      const a = rot + i * Math.PI / 5 - Math.PI / 2;
      const xx = x + Math.cos(a) * rad, yy = y + Math.sin(a) * rad;
      if (i === 0) c.moveTo(xx, yy); else c.lineTo(xx, yy);
    }
    c.closePath();
  }

  function drawPowers() {
    const sp = starSprite();
    for (let i = 0; i < G.powers.length; i++) {
      const p = G.powers[i];
      if (p.taken) continue;
      const x = px(p.c + 0.5), y = py(p.r + 0.5);
      const pulse = 1 + Math.sin(G.anim * 5 + i) * 0.12;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(G.anim * 1.2);
      ctx.scale(pulse, pulse);
      ctx.drawImage(sp.c, -sp.size / 2, -sp.size / 2, sp.size, sp.size);
      ctx.restore();
    }
  }

  function drawItems() {
    const s = G.cell;
    for (let i = 0; i < G.items.length; i++) {
      const it = G.items[i];
      let alpha = 1;
      if (it.taken) {
        if (!it.fade) continue;                                   // đồng hồ đúng đã ăn: biến mất ngay
        alpha = 1 - clamp((G.time - it.fade) / 0.5, 0, 1);        // đồng hồ còn lại: mờ dần 0,5 s
        if (alpha <= 0) continue;
      } else if (it.wrongAt) {
        if (G.time - it.wrongAt > 2.2) { it.taken = true; continue; }  // chọn nhầm: còn thấy 2,2 s rồi biến mất
        alpha = 0.7;
      }
      const sp = itemSprite(it);
      const x = px(it.c + 0.5), y = py(it.r + 0.5);
      const age = G.anim - it.born;
      const sc = 0.5 + 0.5 * clamp(age / 0.35, 0, 1);
      const bob = Math.sin(G.anim * 2.5 + it.wobble) * s * 0.03;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y + bob);
      ctx.scale(sc, sc);
      ctx.drawImage(sp.c, -sp.size / 2, -sp.size / 2, sp.size, sp.size);
      if (it.wrongAt) {
        ctx.globalAlpha = 1;
        ctx.font = '800 ' + Math.round(s * 0.8) + 'px ' + FONT;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = Math.max(2, s * 0.14); ctx.strokeStyle = 'rgba(10,15,40,0.9)'; ctx.lineJoin = 'round';
        ctx.strokeText('✗', 0, 0);
        ctx.fillStyle = '#ef476f'; ctx.fillText('✗', 0, 0);
      }
      ctx.restore();
      // Gợi ý: vòng sáng vàng nhấp nháy quanh đồng hồ đúng
      if (it.hint && !it.taken && !it.wrongAt) {
        ctx.save();
        ctx.globalAlpha = Motion.lite ? 0.9 : 0.5 + 0.5 * Math.sin(G.anim * 6);
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = Math.max(3, s * 0.12);
        ctx.beginPath(); ctx.arc(x, y + bob, s * 0.92, 0, TAU); ctx.stroke();
        ctx.restore();
      }
    }
  }

  /** Kính lúp: trên màn hình nhỏ (ô < 44 px) phóng to đồng hồ gần Cú Tí nhất để bé đọc được kim. */
  function drawMagnifier() {
    const p = G.player;
    G.magnified = null;
    if (G.cell >= 44 || !p || (G.state !== 'playing' && G.state !== 'ready')) return;
    let best = null, bd = 1.5;
    for (let i = 0; i < G.items.length; i++) {
      const it = G.items[i];
      if (it.taken || it.wrongAt) continue;
      const d = Math.abs(it.c + 0.5 - p.x) + Math.abs(it.r + 0.5 - p.y);
      if (d <= bd) { bd = d; best = it; }
    }
    if (!best) return;
    G.magnified = C.key(best.time);
    const sp = itemSprite(best, Math.ceil(G.cell * 1.3));
    const f = G.field, half = sp.size / 2;
    const x = clamp(px(best.c + 0.5), f.x + half, f.x + f.w - half);
    const y = clamp(py(best.r + 0.5) - G.cell * 1.7, f.y + half, f.y + f.h - half);
    ctx.save();
    ctx.fillStyle = 'rgba(8,10,40,0.6)';
    roundRect(ctx, x - half * 0.8, y - half * 0.8, half * 1.6, half * 1.6, half * 0.3); ctx.fill();
    ctx.drawImage(sp.c, x - half, y - half, sp.size, sp.size);
    ctx.restore();
  }

  /** mood: '' | 'happy' (ăn đúng) | 'sad' (chọn nhầm) | 'scared' (gặp ma) */
  function drawOwl(x, y, R, dir, anim, dying, mood) {
    ctx.save();
    ctx.translate(x, y);
    if (dying > 0) { ctx.rotate(dying * TAU * 1.5); const k = Math.max(0.02, 1 - dying); ctx.scale(k, k); }
    const flap = Math.sin(anim * 14) * 0.35;
    const dx = dir ? dir.dx : 0, dy = dir ? dir.dy : 0;
    // Cánh
    ctx.fillStyle = '#a5642b';
    ctx.save(); ctx.translate(-R * 0.9, R * 0.05); ctx.rotate(-0.25 - flap); ctx.beginPath(); ctx.ellipse(0, 0, R * 0.3, R * 0.6, 0, 0, TAU); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(R * 0.9, R * 0.05); ctx.rotate(0.25 + flap); ctx.beginPath(); ctx.ellipse(0, 0, R * 0.3, R * 0.6, 0, 0, TAU); ctx.fill(); ctx.restore();
    // Tai
    ctx.fillStyle = '#8a5a2b';
    ctx.beginPath(); ctx.moveTo(-R * 0.85, -R * 0.55); ctx.lineTo(-R * 0.6, -R * 1.15); ctx.lineTo(-R * 0.25, -R * 0.75); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(R * 0.85, -R * 0.55); ctx.lineTo(R * 0.6, -R * 1.15); ctx.lineTo(R * 0.25, -R * 0.75); ctx.closePath(); ctx.fill();
    // Thân
    ctx.fillStyle = '#d98c48';
    ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
    ctx.lineWidth = Math.max(1.5, R * 0.08); ctx.strokeStyle = '#7a4a1e'; ctx.stroke();
    // Bụng
    ctx.fillStyle = '#f5d7a8';
    ctx.beginPath(); ctx.ellipse(0, R * 0.4, R * 0.58, R * 0.45, 0, 0, TAU); ctx.fill();
    // Mắt (thỉnh thoảng chớp; mở to hơn khi hoảng)
    const wide = mood === 'scared' ? 1.16 : 1;
    const ex = R * 0.38, ey = -R * 0.15, er = R * 0.34 * wide;
    const blink = !Motion.lite && dying <= 0 && (G.anim % 3.6) > 3.46;
    if (blink) {
      ctx.strokeStyle = '#2b2d42'; ctx.lineWidth = Math.max(1.5, R * 0.11); ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(-ex, ey - er * 0.2, er * 0.8, 0.18 * Math.PI, 0.82 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ex, ey - er * 0.2, er * 0.8, 0.18 * Math.PI, 0.82 * Math.PI);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-ex, ey, er, 0, TAU); ctx.arc(ex, ey, er, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2b2d42';
      const pr = R * 0.16 * (mood === 'scared' ? 0.8 : 1), pox = dx * R * 0.1, poy = dy * R * 0.1;
      ctx.beginPath(); ctx.arc(-ex + pox, ey + poy, pr, 0, TAU); ctx.arc(ex + pox, ey + poy, pr, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-ex + pox + pr * 0.35, ey + poy - pr * 0.35, pr * 0.35, 0, TAU); ctx.arc(ex + pox + pr * 0.35, ey + poy - pr * 0.35, pr * 0.35, 0, TAU); ctx.fill();
    }
    // Lông mày theo tâm trạng: vui thì cong lên, tiu nghỉu thì xuôi xuống
    if (mood === 'happy' || mood === 'sad') {
      ctx.strokeStyle = '#7a4a1e'; ctx.lineWidth = Math.max(1.5, R * 0.09); ctx.lineCap = 'round';
      const by = ey - er - R * 0.12, tilt = mood === 'happy' ? -R * 0.12 : R * 0.14;
      ctx.beginPath();
      ctx.moveTo(-ex - er * 0.7, by - tilt); ctx.lineTo(-ex + er * 0.7, by + tilt);
      ctx.moveTo(ex - er * 0.7, by + tilt); ctx.lineTo(ex + er * 0.7, by - tilt);
      ctx.stroke();
    }
    // Mỏ (vui thì hé mở như đang cười)
    ctx.fillStyle = '#ff9f1c';
    const beak = mood === 'happy' ? R * 0.5 : R * 0.4;
    ctx.beginPath(); ctx.moveTo(-R * 0.16, R * 0.12); ctx.lineTo(R * 0.16, R * 0.12); ctx.lineTo(0, beak); ctx.closePath(); ctx.fill();
    if (mood === 'scared') {                       // giọt mồ hôi nhỏ bên má
      ctx.fillStyle = '#8ecbff';
      ctx.beginPath(); ctx.arc(R * 0.72, -R * 0.5, R * 0.13, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function drawPlayer() {
    const p = G.player;
    if (!p) return;
    const R = G.cell * 0.42;
    if (G.invuln > 0 && G.state === 'playing' && Math.floor(G.anim * 10) % 2 === 0) ctx.globalAlpha = 0.5;
    // Đứng yên thì nhún nhẹ cho có sức sống
    const bob = p.moving || Motion.lite ? 0 : Math.sin(G.anim * 2.2) * R * 0.09;
    drawOwl(px(p.x), py(p.y) + bob, R, p.dir, p.moving ? p.anim : 0, p.dying, p.moodT > 0 ? p.mood : '');
    ctx.globalAlpha = 1;
  }

  function drawGhost(g) {
    const R = G.cell * 0.42;
    const x = px(g.x), y = py(g.y);
    const fright = g.state === 'fright';
    const blink = fright && G.fright < 2 && Math.floor(G.anim * 6) % 2 === 0;
    const home = g.state === 'home';
    ctx.save();
    ctx.translate(x, y);
    const wob = Math.sin(G.anim * 8 + g.id) * R * 0.05;
    ctx.fillStyle = fright ? (blink ? '#f1f3fa' : '#3a5bd9') : g.color;
    ctx.beginPath();
    ctx.arc(0, -R * 0.1 + wob, R, Math.PI, 0);
    const bottom = R * 0.9 + wob;
    ctx.lineTo(R, bottom);
    const bumps = 3;
    for (let i = 0; i < bumps; i++) {
      const x1 = R - (i * 2 + 1) * (R / bumps), x2 = R - (i * 2 + 2) * (R / bumps);
      const off = (Math.floor(G.anim * 8) + i) % 2 === 0 ? R * 0.22 : R * 0.05;
      ctx.lineTo(x1, bottom - off);
      ctx.lineTo(x2, bottom);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = Math.max(1, R * 0.06); ctx.stroke();
    // Mắt
    const ex = R * 0.36, ey = -R * 0.2 + wob;
    if (fright || home) {
      ctx.strokeStyle = home ? '#2b2d42' : '#fff';
      ctx.lineWidth = Math.max(1.5, R * 0.1); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-ex - R * 0.18, ey); ctx.lineTo(-ex + R * 0.18, ey); ctx.moveTo(ex - R * 0.18, ey); ctx.lineTo(ex + R * 0.18, ey); ctx.stroke();
      ctx.fillStyle = home ? '#fff' : '#fff';
      ctx.font = '800 ' + Math.round(R * 0.6) + 'px ' + FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const zz = Math.floor(G.anim * 2) % 2 === 0 ? 'z z' : 'z';
      ctx.fillText(zz, R * 0.6, -R * 1.1 + Math.sin(G.anim * 3) * R * 0.1);
    } else {
      const dx = g.dir ? g.dir.dx : 0, dy = g.dir ? g.dir.dy : 0;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(-ex, ey, R * 0.22, R * 0.26, 0, 0, TAU); ctx.ellipse(ex, ey, R * 0.22, R * 0.26, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2b2d42';
      ctx.beginPath(); ctx.arc(-ex + dx * R * 0.1, ey + dy * R * 0.1, R * 0.11, 0, TAU); ctx.arc(ex + dx * R * 0.1, ey + dy * R * 0.1, R * 0.11, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function drawParts(c) {
    c = c || ctx;
    for (let i = 0; i < G.parts.length; i++) {
      const p = G.parts[i];
      c.globalAlpha = clamp(p.life / (p.kind === 'confetti' ? 0.8 : p.max * 0.6), 0, 1);
      c.fillStyle = p.color;
      if (p.kind === 'confetti') {
        c.save(); c.translate(p.x, p.y); c.rotate(p.spin);
        c.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        c.restore();
      } else {
        c.beginPath(); c.arc(p.x, p.y, p.size, 0, TAU); c.fill();
      }
    }
    c.globalAlpha = 1;
  }
  /** Khi qua màn / xem kết quả, hạt được vẽ ở lớp #fx (nằm trên lớp phủ mờ) cho bé nhìn rõ. */
  function partsOnFx() { return !!fxCtx && (G.state === 'result' || G.state === 'clear'); }
  function drawFxLayer() {
    if (!fxCtx) return;
    const want = partsOnFx() && G.parts.length > 0;
    if (!want && !drawFxLayer.dirty) return;                 // không xoá cả lớp mỗi khung khi không có hạt
    fxCtx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    fxCtx.clearRect(0, 0, G.W, G.H);
    drawFxLayer.dirty = want;
    if (want) drawParts(fxCtx);
  }

  function drawTexts() {
    for (let i = 0; i < G.texts.length; i++) {
      const t = G.texts[i];
      ctx.globalAlpha = clamp(t.life / 0.4, 0, 1);
      ctx.font = '800 ' + Math.round(t.size) + 'px ' + FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = Math.max(2, t.size * 0.18); ctx.strokeStyle = 'rgba(10,15,40,0.9)'; ctx.lineJoin = 'round';
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color; ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  /* ================= MÀN HÌNH: MENU, CHỌN MÀN ================= */
  function goMenu() {
    G.state = 'menu';
    clearTimeout(G.cdTimer);
    stopLesson();
    releaseWake();
    Voice.stop();
    G.quiz = null; G.result = null; G.nextRoundAt = -1; G.lesson.resume = false;
    Music.setDuck('pause', null);
    showHud(false);
    showScreen('menu');
    renderPlayerChip();
    Music.play('menu');
    Music.setTempo(1);
  }
  function goLevels() {
    G.state = 'levels';
    clearTimeout(G.cdTimer);
    stopLesson();
    releaseWake();
    Voice.stop();
    showHud(false);
    renderLevels();
    showScreen('levels');
    Music.play('menu');
    Music.setTempo(1);
  }

  /** "Đã thuộc": ≥ 20 câu ở màn này với ≥ 90% đúng. */
  function mastered(bucket, id) {
    const t = bucket.stats.byTopic[id];
    if (!t) return false;
    const n = t.c + t.w;
    return n >= 20 && t.c / n >= 0.9;
  }
  function renderLevels() {
    const b = Store.p();
    ui.levelGrid.innerHTML = C.LEVELS.map(function (l, idx) {
      const unlocked = Store.isUnlocked(idx);
      const rec = Store.rec(l);
      const current = idx === b.unlocked - 1;
      const label = 'Màn ' + l.n + ': ' + l.title + (unlocked ? '' : ' (chưa mở khóa)');
      return '<div class="level-card' + (unlocked ? '' : ' locked') + (current ? ' current' : '') + (rec.passed ? ' passed' : '') + '" data-id="' + esc(l.id) + '" role="button" tabindex="' + (unlocked ? '0' : '-1') + '"' + (unlocked ? '' : ' aria-disabled="true"') + ' aria-label="' + esc(label) + '">' +
        '<span class="grade g' + esc(l.grade) + '">Lớp ' + esc(l.grade) + '</span>' +
        '<div class="icon" aria-hidden="true">' + (unlocked ? esc(l.icon) : '🔒') + '</div>' +
        '<div class="num">MÀN ' + esc(l.n) + (rec.passed ? ' <span class="done" aria-hidden="true">✅</span>' : '') + '</div>' +
        '<div class="name">' + esc(l.title) + '</div>' +
        '<div class="desc">' + esc(l.desc) + '</div>' +
        (mastered(b, l.id) ? '<span class="mastered">✅ Đã thuộc</span>' : '') +
        '<div class="meta"><span class="best">' + (unlocked ? '🏆 ' + fmt(rec.best || 0) : '🔒 Qua màn ' + (l.n - 1)) + '</span><span class="stars" aria-label="' + (rec.stars || 0) + ' sao">' + starsHtml(rec.stars || 0) + '</span></div>' +
        '</div>';
    }).join('');
  }

  /* ================= BÀI HỌC TRƯỚC MÀN ================= */
  /** opts.resume: xem lại bài học giữa chừng (từ màn tạm dừng) rồi chơi tiếp, không chơi lại từ đầu. */
  function showLesson(level, opts) {
    const L = level && C.LESSONS[level.id];
    if (!L) { goLevels(); return; }
    G.state = 'lesson';
    clearTimeout(G.cdTimer);
    releaseWake();
    showHud(false);
    G.lesson.level = level;
    G.lesson.idx = 0;
    G.lesson.resume = !!(opts && opts.resume);
    $('btn-lesson-play').textContent = G.lesson.resume ? '▶ Chơi tiếp' : '▶ Vào mê cung';
    ui.lessonTitle.textContent = '📘 Bài ' + level.n + ': ' + L.title;
    ui.lessonText.innerHTML = L.lines.map(function (s) { return '<p>' + s + '</p>'; }).join('');
    ui.lessonDemos.innerHTML = L.demos.map(function (t, i) {
      return '<button type="button" data-i="' + i + '" class="' + (i === 0 ? 'on' : '') + '">' + esc(lessonLabel(L, t)) + '</button>';
    }).join('');
    renderLessonClock(L, L.demos[0], true);
    showScreen('lesson');
    Music.play('menu');
    Voice.say(L.speech);
    // Tự động chuyển ví dụ cho đến khi bé chạm vào
    clearInterval(G.lesson.timer);
    G.lesson.timer = setInterval(function () {
      if (G.state !== 'lesson') { stopLesson(); return; }
      G.lesson.idx = (G.lesson.idx + 1) % L.demos.length;
      selectDemo(G.lesson.idx, false);
    }, 4000);
  }
  function stopLesson() { clearInterval(G.lesson.timer); G.lesson.timer = 0; }

  function lessonLabel(L, t) {
    if (L.digital) return C.fmtText(t, { period: true });
    return C.fmtText(t, { kem: !!L.kem, ruoi: false });
  }

  function renderLessonClock(L, t, first) {
    const size = 220;
    let html = '';
    let read = '';
    if (L.digital) {
      // Kim + số cạnh nhau: bé thấy kim ngắn vẫn chỉ số 3 khi đồng hồ điện tử ghi 15 giờ
      html = C.svgClock(t, { size: 170 }) + C.svgDigital(C.fmtDigital(t, true), { width: 190 });
      read = C.fmtText(t, { period: true }) + '<small>' + C.periodIcon(t.h) + ' buổi ' + C.periodOf(t.h) + ' · ' + C.fmtText(t, { h24: true }) +
        (t.h >= 13 ? ' (' + C.h12(t.h) + ' + 12 = ' + t.h + ')' : '') + '</small>';
    } else if (L.both) {
      html = C.svgClock(t, { size: size }) + C.svgDigital(C.fmtDigital(t), { width: 150, caption: true });
      read = C.fmtText(t);
    } else {
      html = C.svgClock(t, { size: size, minutes: !!L.minutes });
      read = C.fmtText(t, { kem: !!L.kem, ruoi: false });
      if (t.m === 30) read += '<small>hay ' + C.fmtText(t, { ruoi: true }) + '</small>';
      else if (L.kem) read += '<small>tức ' + C.fmtText(t) + '</small>';
    }
    const existing = ui.lessonClock.querySelector('svg.clock-svg');
    if (!first && existing && !L.digital && !L.both) {
      C.setSvgTime(existing, t);
      const r = ui.lessonClock.querySelector('.read');
      if (r) r.innerHTML = read;
    } else {
      ui.lessonClock.innerHTML = html + '<div class="read">' + read + '</div>';
      const svgs = ui.lessonClock.querySelectorAll('svg .hand-h, svg .hand-m');
      for (let i = 0; i < svgs.length; i++) svgs[i].style.transition = 'transform 0.7s ease';
    }
  }

  function selectDemo(i, byUser) {
    const L = C.LESSONS[G.lesson.level.id];
    G.lesson.idx = i;
    const btns = ui.lessonDemos.querySelectorAll('button');
    for (let k = 0; k < btns.length; k++) btns[k].classList.toggle('on', k === i);
    renderLessonClock(L, L.demos[i], false);
    if (byUser) { stopLesson(); Voice.say(lessonLabel(L, L.demos[i])); }
  }

  /* ================= HỌC XEM GIỜ ================= */
  function goLearn() {
    G.state = 'learn';
    clearTimeout(G.cdTimer);
    stopLesson();
    showHud(false);
    showScreen('learn');
    Music.play('menu');
    renderLearn(true);
  }
  function renderLearn(first) {
    const t = G.learn.t;
    const existing = ui.learnClock.querySelector('svg.clock-svg');
    if (!first && existing && !G.learn.rebuild) C.setSvgTime(existing, t);
    else {
      ui.learnClock.innerHTML = C.svgClock(t, { size: 280, minutes: G.learn.minutes });
      const hands = ui.learnClock.querySelectorAll('.hand-h, .hand-m');
      for (let i = 0; i < hands.length; i++) hands[i].style.transition = 'transform 0.6s ease';
      G.learn.rebuild = false;
    }
    ui.learnRead.textContent = C.fmtText(t);
    let alt = '';
    if (t.m === 0) alt = 'Kim dài chỉ số 12: giờ đúng.';
    else if (t.m === 30) alt = 'Hay: ' + C.fmtText(t, { ruoi: true }) + ' (kim dài chỉ số 6).';
    else if (t.m >= 35) alt = 'Hay: ' + C.fmtText(t, { kem: true }) + ' (kim dài đã qua số 6).';
    else alt = 'Kim dài chỉ số ' + (t.m / 5) + ': ' + (t.m / 5) + ' × 5 = ' + t.m + ' phút.';
    ui.learnAlt.textContent = alt;
    ui.learnDigital.innerHTML = C.svgDigital(C.fmtDigital(t, G.learn.h24), { width: 150 });
    ui.learnMinutes.textContent = G.learn.minutes ? '🔢 Ẩn số phút' : '🔢 Hiện số phút';
    // Buổi trong ngày (lớp 3): 15 giờ 30 phút là 3 giờ 30 phút chiều
    if (ui.learnPeriod) {
      ui.learnPeriod.hidden = !G.learn.h24;
      ui.learnPeriod.textContent = G.learn.h24
        ? C.periodIcon(t.h) + ' ' + C.fmtText(t, { period: true }) + ' · ' + C.fmtText(t, { h24: true })
        : '';
    }
    if (ui.learn24h) {
      ui.learn24h.textContent = G.learn.h24 ? '🌗 Ẩn buổi & 24 giờ' : '🌗 Buổi & 24 giờ';
      ui.learn24h.setAttribute('aria-pressed', String(G.learn.h24));
    }
  }
  function learnSpeak() {
    const t = G.learn.t;
    let s = C.fmtText(t) + '.';
    if (t.m === 30) s += ' Hay ' + C.fmtText(t, { ruoi: true }) + '.';
    else if (t.m >= 35) s += ' Hay ' + C.fmtText(t, { kem: true }) + '.';
    if (G.learn.h24) s += ' Buổi ' + C.periodOf(t.h) + ', tức là ' + C.fmtText(t, { h24: true }) + '.';
    Voice.say(s);
  }

  /* ================= TẠM DỪNG ================= */
  function pauseGame() {
    if (G.state !== 'playing' && G.state !== 'ready') return;
    G.prevState = G.state;
    G.state = 'paused';
    Voice.stop();
    ui.pauseInfo.textContent = G.roundInfo ? 'Đang tìm: ' + G.roundInfo.html.replace(/<[^>]+>/g, '') : 'Nghỉ một chút rồi chơi tiếp nhé!';
    showScreen('pause');
    Music.setDuck('pause', 0.3);
    releaseWake();
    focusEl('btn-resume');
  }
  function resumeGame() {
    if (G.state !== 'paused') return;
    G.state = G.prevState === 'ready' ? 'ready' : 'playing';
    showScreen(null);
    showHud(true);
    Music.setDuck('pause', null);
    Music.play('game');
    requestWake();
  }

  /* ================= ĐẦU VÀO ================= */
  const swipe = { active: false, id: -1, ax: 0, ay: 0, sx: 0, sy: 0, moved: false };
  function onCanvasDown(e) {
    Sfx.unlock();
    if (!inGame()) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    swipe.active = true; swipe.id = e.pointerId; swipe.ax = swipe.sx = e.clientX; swipe.ay = swipe.sy = e.clientY; swipe.moved = false;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* bỏ qua */ }
    if (e.cancelable) e.preventDefault();
  }
  function onCanvasMove(e) {
    if (!swipe.active || e.pointerId !== swipe.id) return;
    const dx = e.clientX - swipe.ax, dy = e.clientY - swipe.ay;
    const TH = 22;
    if (Math.abs(dx) > TH || Math.abs(dy) > TH) {
      const d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? DIR.right : DIR.left) : (dy > 0 ? DIR.down : DIR.up);
      setWant(d);
      swipe.ax = e.clientX; swipe.ay = e.clientY; swipe.moved = true;
    }
    if (e.cancelable) e.preventDefault();
  }
  function onCanvasUp(e) {
    if (!swipe.active || e.pointerId !== swipe.id) return;
    swipe.active = false;
    if (!swipe.moved && G.player && G.state === 'playing') {
      // Chạm nhẹ: đi về phía điểm chạm
      const dx = e.clientX - px(G.player.x), dy = e.clientY - py(G.player.y);
      if (Math.abs(dx) > G.cell * 0.4 || Math.abs(dy) > G.cell * 0.4) {
        setWant(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? DIR.right : DIR.left) : (dy > 0 ? DIR.down : DIR.up));
      }
    }
  }

  function bindInput() {
    canvas.addEventListener('pointerdown', onCanvasDown);
    canvas.addEventListener('pointermove', onCanvasMove);
    canvas.addEventListener('pointerup', onCanvasUp);
    canvas.addEventListener('pointercancel', function () { swipe.active = false; });
    ui.dpad.addEventListener('pointerdown', function (e) {
      const b = e.target.closest ? e.target.closest('button[data-dir]') : null;
      if (!b) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      Sfx.unlock();
      if (e.cancelable) e.preventDefault();
      b.classList.add('pressed');
      setTimeout(function () { b.classList.remove('pressed'); }, 140);
      setWant(DIR[b.getAttribute('data-dir')]);
    });
    document.addEventListener('touchmove', function (e) { if ((e.target === canvas || ui.dpad.contains(e.target)) && e.cancelable) e.preventDefault(); }, { passive: false });
    document.addEventListener('touchstart', function (e) { if (e.target === canvas && e.cancelable) e.preventDefault(); }, { passive: false });
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    document.addEventListener('dblclick', function (e) { if (e.target === canvas || ui.dpad.contains(e.target)) e.preventDefault(); });
    document.addEventListener('contextmenu', function (e) { if (e.target === canvas) e.preventDefault(); });
    document.addEventListener('pointerdown', function () {
      Sfx.unlock();
      // Chào bé theo tên ở lần chạm đầu tiên (mỗi lần mở trang một lần)
      if (!G.welcomed && G.state === 'menu' && Players) {
        G.welcomed = true;
        // Máy không có giọng Việt vẫn phải thấy lời chào, nên luôn hiện bằng chữ
        toast('Chào ' + Players.active().name + ' 👋');
        Voice.say('Chào ' + Players.active().name + '! Cùng Cú Tí đi tìm giờ đúng nào!');
      }
    }, true);
    document.addEventListener('keydown', function (e) {
      const k = e.key;
      if (k === 'Escape' && overlayOpen()) { closeOverlay(); return; }
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;        // đang gõ tên / đáp án phụ huynh
      if (G.state === 'quiz') {
        if (k === 'Escape') { goLevels(); return; }
        if (!G.quiz) return;
        if ((k === 'Enter' || k === ' ') && G.quiz.answered) { quizNext(); e.preventDefault(); return; }
        if (!G.quiz.answered && /^[1-4]$/.test(k)) { quizAnswer(Number(k) - 1); e.preventDefault(); }
        return;
      }
      if (k === 'Escape' || k === 'p' || k === 'P') {
        if (G.state === 'playing' || G.state === 'ready') pauseGame(); else if (G.state === 'paused') resumeGame();
        return;
      }
      if (!inGame()) return;
      const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
      if (map[k]) { setWant(DIR[map[k]]); e.preventDefault(); }
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
      { key: 'sound', on: '🔊 Âm thanh: Bật', off: '🔇 Âm thanh: Tắt' },
      { key: 'music', on: '🎵 Nhạc nền: Bật', off: '🎵 Nhạc nền: Tắt' },
      { key: 'voice', on: '🗣️ Giọng đọc: Bật', off: '🗣️ Giọng đọc: Tắt' },
      { key: 'fx', on: '✨ Hiệu ứng: Nhiều', off: '✨ Hiệu ứng: Ít' }
    ];
    const boxes = document.querySelectorAll('[data-audio-toggles]');
    for (let i = 0; i < boxes.length; i++) {
      boxes[i].innerHTML = defs.map(function (d) {
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

  /* ================= GIẢM CHUYỂN ĐỘNG / HIỆU ỨNG ================= */
  const Motion = {
    lite: false,
    refresh() {
      let pref = false;
      try { pref = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { /* bỏ qua */ }
      this.lite = pref || Store.data.fx === 'lite';
      document.documentElement.classList.toggle('lite-fx', this.lite);
    }
  };

  /* ================= LỖI TOÀN CỤC ================= */
  let errShown = 0;
  function onFatal(msg) {
    if (errShown++ > 2) return;                 // không làm phiền bé nhiều lần
    try { console.error('[me-cung]', msg); } catch (e) { /* bỏ qua */ }
    toast('Có lỗi nhỏ, con thử lại nhé! 🙏', 2600);
    try { if (inGame() || G.state === 'quiz') goMenu(); } catch (e) { /* bỏ qua */ }
  }

  /* ================= NGƯỜI CHƠI (hồ sơ) ================= */
  const PlayersUI = { mode: null, avatar: null };
  const MAX_STARS = C.LEVELS.length * 3;              // tổng số sao tối đa của game (mỗi màn 3 sao)
  function sumStars(bucket) {
    let n = 0;
    if (bucket && bucket.records) for (const id in bucket.records) n += Number(bucket.records[id].stars) || 0;
    return n;
  }
  function renderPlayerChip() {
    const b = $('btn-player');
    if (!b || !Players) return;
    b.innerHTML = Players.chipHtml() + '<span class="pl-hint" aria-hidden="true">▾</span>';
  }
  function renderPlayers() {
    if (!Players) return;
    const act = Players.active();
    $('player-list').innerHTML = Players.list().map(function (p) {
      const st = Store.data.players[p.id];
      const stars = st ? sumStars(st) : 0;
      return '<button type="button" class="player-item' + (p.id === act.id ? ' active' : '') + '" data-id="' + esc(p.id) + '" aria-pressed="' + (p.id === act.id) + '">' +
        '<span class="pl-avatar" aria-hidden="true">' + esc(p.avatar) + '</span><span class="pl-name">' + esc(p.name) + '<span class="pl-sub">⭐ ' + stars + ' sao</span></span></button>';
    }).join('');
    $('btn-player-remove').disabled = Players.list().length <= 1;
    $('player-form').hidden = !PlayersUI.mode;
  }
  function openPlayerForm(mode) {
    PlayersUI.mode = mode;                                   // 'add' | 'rename' | 'avatar'
    const act = Players.active();
    PlayersUI.avatar = mode === 'add' ? Players.AVATARS[Players.list().length % Players.AVATARS.length] : act.avatar;
    $('player-name').value = mode === 'add' ? '' : act.name;
    $('player-name').hidden = mode === 'avatar';
    $('player-avatars').hidden = mode === 'rename';
    $('player-avatars').innerHTML = Players.AVATARS.map(function (a) {
      return '<button type="button" class="avatar" data-avatar="' + esc(a) + '" aria-pressed="' + (a === PlayersUI.avatar) + '" aria-label="Hình ' + esc(a) + '">' + esc(a) + '</button>';
    }).join('');
    renderPlayers();
    if (mode !== 'avatar') focusEl('player-name');
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

  /* ================= CỔNG PHỤ HUYNH ================= */
  const Gate = { cb: null, answer: 0 };
  function adultGate(cb) {
    const a = 2 + Math.floor(Math.random() * 8), b = 2 + Math.floor(Math.random() * 8);
    if (!ui.gate || !$('parent-gate-q') || !$('parent-gate-input')) {
      // Dự phòng khi không dựng được cổng trong trang (thiếu phần tử): hỏi bằng hộp thoại của trình duyệt
      let ok = false;
      try { ok = window.confirm('Dành cho phụ huynh, thầy cô. Bấm OK để tiếp tục.'); } catch (e) { ok = false; }
      if (ok && cb) cb();
      return;
    }
    Gate.cb = cb; Gate.answer = a * b;
    $('parent-gate-q').textContent = 'Dành cho phụ huynh, thầy cô. Để tiếp tục, hãy trả lời: ' + a + ' × ' + b + ' = ?';
    $('parent-gate-input').value = '';
    openOverlay('gate');
    focusEl('parent-gate-input');
  }
  function closeGate() { ui.gate.classList.add('hidden'); Gate.cb = null; }

  /* ================= KẾT QUẢ CỦA BÉ (báo cáo) ================= */
  function describeReview(it) {
    const info = it.info || {};
    if (info.kind === 'elapsed' && info.start) {
      const s = C.T(info.start.h, info.start.m), d = info.delta || 0;
      return C.fmtText(s) + ' + ' + (d === 60 ? '1 giờ' : d + ' phút') + ' = ' + C.fmtText(C.addMin(s, d));
    }
    const t = C.T(info.h || 0, info.m || 0);
    if (info.kind === 'period') return C.fmtText(t, { period: true }) + ' (' + C.fmtDigital(t, true) + ')';
    if (info.kind === 'digital') return C.fmtDigital(t) + ' = ' + C.fmtText(t);
    return C.fmtText(t) + (t.m >= 35 ? ' → ' + C.fmtText(t, { kem: true }) : t.m === 30 ? ' (' + C.fmtText(t, { ruoi: true }) + ')' : '');
  }
  function renderReport() {
    if (!Players) return;
    const p = Players.active(), b = Store.p(), s = b.stats;
    const stat = function (v, k) { return '<div class="report-stat"><div class="v">' + v + '</div><div class="k">' + k + '</div></div>'; };
    $('report-title').textContent = '📊 Kết quả của ' + p.name;
    const total = s.correct + s.wrong, acc = total ? Math.round(s.correct / total * 100) : 0;
    $('report-stats').innerHTML = stat(s.plays, 'ván đã chơi') + stat(acc + '%', 'trả lời đúng') +
      stat(Math.round(s.seconds / 60), 'phút luyện tập') + stat(sumStars(b) + '/' + MAX_STARS, 'sao');
    // Màn còn yếu: đã làm ≥ 5 câu mà đúng dưới 70% (dùng chung cho dòng tóm tắt và huy hiệu từng dòng)
    const isWeak = function (id) {
      const t = s.byTopic[id];
      return !!(t && t.c + t.w >= 5 && t.c / (t.c + t.w) < 0.7);
    };
    $('report-levels').innerHTML = C.LEVELS.map(function (l) {
      const r = Store.rec(l), t = s.byTopic[l.id] || { c: 0, w: 0 }, n = t.c + t.w;
      return '<div class="report-row"><span class="t">' + esc(l.icon + ' Màn ' + l.n + ': ' + l.title) + '</span>' +
        '<span class="stars" aria-label="' + (r.stars || 0) + ' sao">' + starsHtml(r.stars || 0) + '</span><span>🏆 ' + fmt(r.best || 0) + '</span>' +
        (n ? '<span>' + Math.round(t.c / n * 100) + '% đúng (' + n + ' câu)</span>' : '<span class="muted">chưa chơi</span>') +
        (mastered(b, l.id) ? '<span class="mastered">✅ Đã thuộc</span>' : '') +
        (isWeak(l.id) ? '<span class="weak">⚠️ Cần luyện thêm</span>' : '') + '</div>';
    }).join('');
    const weak = C.LEVELS.filter(function (l) { return isWeak(l.id); }).sort(function (x, y) {
      const a = s.byTopic[x.id], c = s.byTopic[y.id];
      return a.c / (a.c + a.w) - c.c / (c.c + c.w);
    }).slice(0, 3);
    const weakLine = $('report-weak');
    weakLine.textContent = weak.length ? 'Cần luyện thêm: ' + weak.map(function (l) { return l.icon + ' Màn ' + l.n + ': ' + l.title; }).join(', ') : '';
    weakLine.hidden = !weak.length;
    const pool = Store.reviewPool();
    $('report-review').innerHTML = pool.length
      ? pool.slice(0, 12).map(function (it) { return '<div class="report-row"><span class="t">' + esc(describeReview(it)) + '</span><span>✖ ' + it.n + '</span></div>'; }).join('')
      : '<div class="report-row"><span class="t">Chưa có gì cần ôn — tuyệt vời! 🎉</span></div>';
    $('btn-report-reset').textContent = '🗑 Xóa tiến trình của ' + p.name;
  }
  function openReport(from) {
    G.reportFrom = from || '';
    renderReport();
    openOverlay('report');
    focusEl('btn-report-back');
  }

  function bindUi() {
    click('btn-play', function () { goLevels(); });
    click('btn-learn', function () { goLearn(); });
    click('btn-howto', function () { ui.howto.classList.remove('hidden'); });
    click('btn-levels-howto', function () { ui.howto.classList.remove('hidden'); });
    click('btn-howto-close', function () { ui.howto.classList.add('hidden'); });
    click('btn-levels-back', function () { goMenu(); });
    click('btn-learn-back', function () { goMenu(); });
    click('btn-lesson-back', function () { goLevels(); });
    click('btn-lesson-speak', function () { const L = C.LESSONS[G.lesson.level.id]; Voice.say(L.speech); });
    click('btn-lesson-play', function () {
      stopLesson();
      if (G.state !== 'lesson') return;                           // chạm hai lần liền (đã sang đếm ngược): không bắt đầu màn hai lần
      if (G.lesson.resume && G.level && G.maze) {                   // xem lại bài học giữa chừng -> chơi tiếp, không chơi lại từ đầu
        G.lesson.resume = false;
        G.state = 'paused';
        resumeGame();
        return;
      }
      if (G.lesson.level) startLevel(G.lesson.level);
    });
    click('btn-hud-speak', function () { if (G.roundInfo) Voice.say(G.roundInfo.speech); });
    click('btn-hud-hint', function () { askHint(); });
    click('btn-pause', function () { pauseGame(); });
    click('btn-resume', function () { resumeGame(); });
    click('btn-restart', function () { Music.setDuck('pause', null); if (G.level) startLevel(G.level); });
    click('btn-lesson-again', function () { Music.setDuck('pause', null); if (G.level) showLesson(G.level, { resume: true }); });
    click('btn-quit', function () { Music.setDuck('pause', null); goMenu(); });
    click('btn-quiz-next', function () { quizNext(); });
    click('btn-quiz-speak', function () { if (G.quiz && G.quiz.current) Voice.say(G.quiz.current.speech); });
    click('btn-quiz-quit', function () { goLevels(); });
    click('btn-next-level', function () { const n = C.LEVELS[G.levelIdx + 1]; if (n && Store.isUnlocked(G.levelIdx + 1)) showLesson(n); else goLevels(); });
    click('btn-retry', function () { if (G.level && G.state === 'result') startLevel(G.level); });   // chạm hai lần: chỉ lần đầu có tác dụng
    click('btn-result-lesson', function () { if (G.level) showLesson(G.level); });
    click('btn-other-level', function () { goLevels(); });
    click('btn-home', function () { goMenu(); });
    click('btn-learn-random', function () { G.learn.t = C.T(G.learn.h24 ? rnd(0, 23) : rnd(1, 12), pick(C.ALL_MINS)); renderLearn(false); learnSpeak(); });
    click('btn-learn-24h', function () {
      G.learn.h24 = !G.learn.h24;
      if (!G.learn.h24) G.learn.t = C.T(C.h12(G.learn.t.h), G.learn.t.m);   // về lại miền 1–12 giờ
      renderLearn(false);
      learnSpeak();
    });
    click('btn-learn-minutes', function () { G.learn.minutes = !G.learn.minutes; G.learn.rebuild = true; renderLearn(false); });
    click('btn-learn-speak', function () { learnSpeak(); });
    // Hai nút dành cho phụ huynh: qua cổng phép nhân trong trang (không dùng window.confirm), tác động lên bé đang chơi
    click('btn-unlock-all', function () {
      adultGate(function () { Store.p().unlocked = C.LEVELS.length; Store.save(); renderLevels(); Sfx.play('unlock'); toast('🔓 Đã mở khóa tất cả các màn'); });
    });
    click('btn-reset-progress', function () {
      adultGate(function () { Store.resetActive(); renderLevels(); toast('🔄 Đã đặt lại. Bắt đầu từ màn 1 nhé!'); });
    });

    // ----- người chơi (hồ sơ của từng bé) -----
    click('btn-player', function () { PlayersUI.mode = null; renderPlayers(); openOverlay('players'); focusEl('btn-players-back'); });
    click('btn-players-back', function () { closeOverlay(); });
    click('btn-player-add', function () { openPlayerForm('add'); });
    click('btn-player-rename', function () { openPlayerForm('rename'); });
    click('btn-player-avatar', function () { openPlayerForm('avatar'); });
    click('btn-player-cancel', function () { PlayersUI.mode = null; renderPlayers(); });
    click('btn-player-remove', function () {
      adultGate(function () {
        const p = Players.active();
        if (Players.remove(p.id)) { delete Store.data.players[p.id]; Store.save(); toast('Đã xóa ' + p.name); renderPlayers(); }
      });
    });
    $('player-list').addEventListener('click', function (e) {
      const b = e.target.closest ? e.target.closest('.player-item') : null;
      if (!b) return;
      Sfx.unlock(); Sfx.play('click');
      Players.setActive(b.getAttribute('data-id'));
      renderPlayers();
    });
    $('player-form').addEventListener('submit', function (e) { e.preventDefault(); Sfx.unlock(); submitPlayerForm(); });
    $('player-avatars').addEventListener('click', function (e) {
      const b = e.target.closest ? e.target.closest('.avatar') : null;
      if (!b) return;
      Sfx.unlock(); Sfx.play('click');
      PlayersUI.avatar = b.getAttribute('data-avatar');
      const all = $('player-avatars').children;
      for (let i = 0; i < all.length; i++) all[i].setAttribute('aria-pressed', String(all[i] === b));
    });
    // ----- kết quả của bé (báo cáo cho phụ huynh) -----
    click('btn-report', function () { openReport('players'); });
    click('btn-report-levels', function () { openReport('levels'); });
    click('btn-report-back', function () { closeOverlay(); });
    click('btn-report-reset', function () {
      adultGate(function () { Store.resetActive(); renderReport(); if (G.state === 'levels') renderLevels(); toast('Đã xóa tiến trình của ' + Players.active().name); });
    });
    // ----- cổng phụ huynh -----
    $('parent-gate-form').addEventListener('submit', function (e) {
      e.preventDefault();
      Sfx.unlock();
      const v = Number($('parent-gate-input').value);
      if (v === Gate.answer) { const cb = Gate.cb; closeGate(); Sfx.play('correct'); if (cb) cb(); }
      else { Sfx.play('wrong'); toast('Chưa đúng, thử lại nhé'); $('parent-gate-input').value = ''; focusEl('parent-gate-input'); }
    });
    click('btn-parent-gate-cancel', function () { closeGate(); });
    if (Players) {
      Players.onChange(function () {
        renderPlayerChip();
        if (!ui.players.classList.contains('hidden')) renderPlayers();
        if (!ui.report.classList.contains('hidden')) renderReport();
        if (G.state === 'levels') renderLevels();
      });
    }

    document.addEventListener('click', function (e) {
      const b = e.target.closest ? e.target.closest('.toggle[data-set]') : null;
      if (!b || b.disabled) return;
      const k = b.getAttribute('data-set');
      Sfx.unlock();
      if (k === 'fx') Store.data.fx = Store.data.fx === 'lite' ? 'full' : 'lite';   // ✨ Hiệu ứng: Nhiều / Ít (không phải bật/tắt)
      else Store.data[k] = !(Store.data[k] !== false);
      Store.save();
      applyAudioSettings();
      Motion.refresh();
      renderAudioToggles();
      const on = k === 'fx' ? Store.data.fx !== 'lite' : Store.data[k] !== false;
      if (on) {
        if (k === 'sound') Sfx.play('correct');
        if (k === 'voice') Voice.say('Chào ' + (Players ? Players.active().name : 'con') + '! Cùng Cú Tí học xem đồng hồ nào!');
        if (k === 'fx') Sfx.play('click');
      } else Sfx.play('click');
    });

    ui.levelGrid.addEventListener('click', function (e) {
      const card = e.target.closest('.level-card');
      if (!card) return;
      const idx = C.LEVELS.findIndex(function (l) { return l.id === card.getAttribute('data-id'); });
      if (idx < 0) return;
      Sfx.unlock();
      if (!Store.isUnlocked(idx)) {
        Sfx.play('hint');
        toast('🔒 Hãy qua màn ' + idx + ' và trả lời đúng câu hỏi để mở màn này nhé!');
        Voice.say('Hãy qua màn ' + idx + ' trước đã nhé!');
        return;
      }
      Sfx.play('click');
      showLesson(C.LEVELS[idx]);
    });
    // Bàn phím: Enter / Space trên thẻ màn (role="button") hoạt động như chạm
    ui.levelGrid.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target && e.target.closest ? e.target.closest('.level-card') : null;
      if (!card) return;
      e.preventDefault();
      card.click();
    });

    ui.lessonDemos.addEventListener('click', function (e) {
      const b = e.target.closest('button[data-i]');
      if (!b) return;
      Sfx.unlock(); Sfx.play('click');
      selectDemo(Number(b.getAttribute('data-i')), true);
    });

    ui.learnSteps.addEventListener('click', function (e) {
      const b = e.target.closest('button[data-step]');
      if (!b) return;
      Sfx.unlock(); Sfx.play('click');
      G.learn.t = C.addMin(G.learn.t, Number(b.getAttribute('data-step')), G.learn.h24);
      renderLearn(false);
      learnSpeak();
    });

    ui.quizOptions.addEventListener('click', function (e) {
      const b = e.target.closest('button.opt');
      if (!b || b.disabled) return;
      Sfx.unlock();
      quizAnswer(Number(b.getAttribute('data-i')));
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        if (G.state === 'playing' || G.state === 'ready') pauseGame();
        try { if (Sfx.ctx && Sfx.ctx.state === 'running') Sfx.ctx.suspend(); } catch (e) { /* bỏ qua */ }   // tab ẩn: ngừng tổng hợp âm thanh
      } else Sfx.unlock();                                                                                  // hiện lại: resume (unlock) nối nhạc
    });
    window.addEventListener('blur', function () { if (G.state === 'playing' || G.state === 'ready') pauseGame(); });
  }

  /* ================= TIỆN ÍCH THIẾT BỊ ================= */
  function requestWake() {
    try {
      if (G.wakeLock && !G.wakeLock.released) return;             // đang giữ rồi: không xin thêm (tránh rò rỉ sentinel)
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
    try { G.touch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches; } catch (e) { G.touch = false; }
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
    frame.tick = (frame.tick || 0) + 1;
    if (!G.bg || frame.tick % 30 === 0) {
      // Chỉ bố cục lại khi khung đổi kích thước (xoay màn hình). Trong một màn, bố cục mê cung được "đóng băng":
      // gợi ý / thẻ sao nằm đè lên (absolute) nên HUD không đổi chiều cao và mê cung không nhảy.
      const w = app.clientWidth, h = app.clientHeight;
      if (!G.bg || (w && h && (w !== G.W || h !== G.H))) resize();
    }
    if (!G.bg) return;
    const t0 = performance.now();
    let t1 = t0;
    try {
      update(dt);
      t1 = performance.now();
      render();
    } catch (e) { onFatal(e && e.message ? e.message : String(e)); }   // một khung lỗi không được giết cả vòng lặp
    const t2 = performance.now();
    const p = G.perf;
    p.n++; p.update += t1 - t0; p.render += t2 - t1; p.frame += t2 - t0;
    if (p.n >= 60) { p.avgUpdate = p.update / p.n; p.avgRender = p.render / p.n; p.avgFrame = p.frame / p.n; p.n = 0; p.update = 0; p.render = 0; p.frame = 0; }
  }

  function boot() {
    // Lỗi toàn cục: báo nhẹ nhàng và đưa về menu thay vì treo giữa ván
    window.addEventListener('error', function (e) { onFatal(e && e.message); });
    window.addEventListener('unhandledrejection', function (e) { onFatal(e && e.reason && e.reason.message ? e.reason.message : 'unhandledrejection'); });
    if (Players) Players.load();
    Store.load();
    Motion.refresh();
    try {
      const mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mq && mq.addEventListener) mq.addEventListener('change', function () { Motion.refresh(); });
    } catch (e) { /* bỏ qua */ }
    // Chờ phông chữ (tối đa 0,6 giây) để menu không "nhảy" chữ khi Baloo 2 tải xong
    const doc = document.documentElement;
    doc.classList.add('fonts-pending');
    const fontsDone = function () { doc.classList.remove('fonts-pending'); };
    setTimeout(fontsDone, 600);
    try {
      if (document.fonts && document.fonts.load) {
        document.fonts.load('800 32px "Baloo 2"');
        if (document.fonts.ready && document.fonts.ready.then) document.fonts.ready.then(fontsDone, fontsDone);
      } else fontsDone();
    } catch (e) { fontsDone(); }
    Voice.init();
    applyAudioSettings();
    renderAudioToggles();
    renderPlayerChip();
    setTimeout(renderAudioToggles, 1200);
    setTimeout(renderAudioToggles, 3600);
    Music.play('menu');
    setupDeviceHints();
    resize();
    let rt = 0;
    const onResize = function () { clearTimeout(rt); rt = setTimeout(resize, 80); };
    // Xoay màn hình: sự kiện resize + vòng lặp khung tự so kích thước; không cần thêm orientationchange (tránh dựng lại lớp nền 3–4 lần)
    window.addEventListener('resize', onResize);
    bindInput();
    bindUi();
    registerSw();
    showHud(false);
    showScreen('menu');
    requestAnimationFrame(function (ts) { lastTs = ts; requestAnimationFrame(frame); });
  }

  // Móc gỡ lỗi (chỉ đọc) để kiểm thử tự động
  window.__MeCung = {
    G: G, Store: Store, startLevel: startLevel, showLesson: showLesson, startRound: startRound, startQuiz: startQuiz, quizAnswer: quizAnswer, quizNext: quizNext,
    endLevel: endLevel, setWant: setWant, update: update, render: render, layout: layout, goLevels: goLevels, goMenu: goMenu, goLearn: goLearn, onItem: onItem, askHint: askHint,
    teleport: function (r, c) { const p = G.player; p.from = { r: r, c: c }; p.to = { r: r, c: c }; p.t = 1; p.moving = false; syncPos(p); onPlayerArrive(p); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
