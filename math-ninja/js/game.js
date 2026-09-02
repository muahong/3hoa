/* ============================================================
   game.js – Bộ máy trò chơi Ninja Toán Học
   - Canvas 2D, vòng lặp requestAnimationFrame theo thời gian thực (dt)
   - Vật lý ném quả kiểu Fruit Ninja, chém bằng ngón tay (Pointer Events, đa chạm)
   - Hai chế độ: "Chém đáp án" và "Ghép đôi"
   ============================================================ */
(function () {
  'use strict';

  const MG = window.MathGen, SP = window.Sprites, Sfx = window.Sfx;
  const rnd = MG.rnd, chance = MG.chance, pick = MG.pick, shuffle = MG.shuffle;
  const TAU = Math.PI * 2;
  const FONT = '"Baloo 2", "Arial Rounded MT Bold", "Segoe UI", Arial, sans-serif';
  const $ = function (id) { return document.getElementById(id); };
  const clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  const PRAISE = ['Chính xác!', 'Tuyệt vời!', 'Giỏi quá!', 'Đúng rồi!', 'Xuất sắc!', 'Siêu đỉnh!', 'Hay lắm!'];
  const STAR_FACTOR = { a1: 1, a2: 0.95, a3: 0.85, a4: 0.7, a5: 0.5, a6: 0.6, p1: 0.9, p2: 0.75, p3: 0.7, p4: 0.6, p5: 0.5 };
  const POP_T = 0.28;
  const MAX_HEARTS = 3;
  const TRAIL_MS = 170;
  const MAX_STAINS = 14;
  const MAX_PARTS = 400;

  /* ================= LƯU TRỮ (localStorage) ================= */
  const Store = {
    key: 'ninja-toan-v1',
    data: { sound: true, duration: 90, names: [], records: {} },
    load() {
      try {
        const raw = localStorage.getItem(this.key);
        if (raw) {
          const d = JSON.parse(raw);
          if (d && typeof d === 'object') Object.assign(this.data, d);
        }
      } catch (e) { /* bỏ qua */ }
      if (!this.data.records) this.data.records = {};
      if (!Array.isArray(this.data.names)) this.data.names = [];
    },
    save() {
      try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* bỏ qua */ }
    },
    recKey(mode, levelId, duration) { return mode + ':' + levelId + ':' + duration; },
    getRecord(mode, levelId, duration) {
      return this.data.records[this.recKey(mode, levelId, duration)] || { best: 0, stars: 0, top: [] };
    },
    setRecord(mode, levelId, duration, rec) {
      this.data.records[this.recKey(mode, levelId, duration)] = rec;
      this.save();
    },
    rememberName(name) {
      const names = this.data.names.filter(function (n) { return n !== name; });
      names.unshift(name);
      this.data.names = names.slice(0, 5);
      this.save();
    }
  };

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
    shake: 0, flash: null,
    score: 0, hearts: MAX_HEARTS, streak: 0, bestStreak: 0, correct: 0, wrong: 0, stage: 1, timeLeft: 90,
    question: null, wave: null, held: null, heldForm: 'a', misses: 0, qStart: 0,
    nextQuestionAt: -1, relaunchAt: -1, overAt: -1, attractT: 0.5, lastWarnSec: -1, endReason: '',
    hud: { score: -1, hearts: -1, stage: -1, mult: -1, time: '', fill: -1 },
    cdTimer: 0, resultShown: false, lastEntry: null, wakeLock: null,
    perf: { n: 0, update: 0, render: 0, dt: 0, avgUpdate: 0, avgRender: 0, avgDt: 0 }
  };

  /* ================= DOM ================= */
  const app = $('app');
  const canvas = $('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  const ui = {
    hud: $('hud'), menu: $('menu'), levels: $('levels'), howto: $('howto'), countdown: $('countdown'),
    pause: $('pause'), gameover: $('gameover'), toast: $('toast'),
    score: $('hud-score'), stage: $('hud-stage'), combo: $('hud-combo'), question: $('hud-question'),
    timer: $('hud-timer'), timerFill: $('hud-timer-fill'), time: $('hud-time'), hearts: $('hud-hearts'), hint: $('hud-hint'),
    countNum: $('count-num'), levelGrid: $('level-grid'), modeDesc: $('mode-desc'),
    resultTitle: $('result-title'), resultLevel: $('result-level'), resultScore: $('result-score'),
    resultStars: $('result-stars'), resultRecord: $('result-record'),
    stCorrect: $('st-correct'), stWrong: $('st-wrong'), stCombo: $('st-combo'), stAcc: $('st-acc'),
    nameEntry: $('name-entry'), nameInput: $('name-input'), nameChips: $('name-chips'), leader: $('leader'),
    btnSound: $('btn-sound'), durationGroup: $('duration-group'), ipadTip: $('ipad-tip')
  };
  const SCREENS = ['menu', 'levels', 'countdown', 'pause', 'gameover'];

  function showScreen(name) {
    SCREENS.forEach(function (k) { ui[k].classList.toggle('hidden', k !== name); });
  }
  function showHud(on) { ui.hud.classList.toggle('hidden', !on); }
  function toast(msg, ms) {
    ui.toast.textContent = msg;
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
    G.dpr = Math.min(window.devicePixelRatio || 1, 2);
    G.W = w; G.H = h;
    canvas.width = Math.round(w * G.dpr);
    canvas.height = Math.round(h * G.dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    G.baseR = clamp(Math.min(w, h) * 0.062, 30, 64);
    applyFruitSize();
    buildBackground();
    initClouds();
  }

  function inGame() { return G.state === 'countdown' || G.state === 'playing' || G.state === 'paused' || G.state === 'over'; }

  function applyFruitSize() {
    const big = inGame() && G.level && G.level.big;
    G.R = Math.round(G.baseR * (big ? 1.15 : 1));
    SP.build(G.R, G.dpr);
    G.fruits.forEach(function (f) { f.r = G.R; });
    updateGravity();
  }

  function updateGravity() {
    let speed = 0.8;
    if (inGame() && G.level) speed = G.level.speed * Math.min(1.35, 1 + 0.04 * (G.stage - 1));
    G.gravity = G.H * 0.55 * speed * speed;
  }

  function layer(fn) {
    const c = document.createElement('canvas');
    c.width = canvas.width; c.height = canvas.height;
    const cx = c.getContext('2d');
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

    G.bgSky = layer(function (c) {
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#3d9df5');
      g.addColorStop(0.55, '#8fd3ff');
      g.addColorStop(1, '#eafaff');
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
      mountains(c, W, H, 0.64, '#c3d5f4', 5, 0.16, 5);
      mountains(c, W, H, 0.7, '#a9c0ea', 4, 0.13, 9);
    });

    G.bgHills = layer(function (c) {
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
  }

  function initClouds() {
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
  }

  function addText(text, x, y, o) {
    const t = { text: text, x: x, y: y, vy: -55, life: 1.1, max: 1.1, size: G.R * 0.85, color: '#fff', stroke: 'rgba(30,20,50,0.85)', t: 0 };
    if (o) for (const k in o) t[k] = o[k];
    t.max = t.life;
    G.texts.push(t);
  }

  function addPart(p) {
    if (G.parts.length >= MAX_PARTS) G.parts.shift();
    G.parts.push(p);
  }

  function spawnJuice(f, px, py, angle) {
    const col = SP.FRUITS[f.type].juice;
    for (let i = 0; i < 14; i++) {
      const a = angle + (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2 + (Math.random() - 0.5) * 1.3;
      const sp = 100 + Math.random() * 320;
      addPart({ kind: 'drop', x: px + (Math.random() - 0.5) * f.r * 0.6, y: py + (Math.random() - 0.5) * f.r * 0.6,
        vx: Math.cos(a) * sp + f.vx * 0.3, vy: Math.sin(a) * sp + f.vy * 0.3,
        size: f.r * (0.06 + Math.random() * 0.1), color: col, life: 0.5 + Math.random() * 0.5, max: 1 });
    }
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * TAU, sp = 60 + Math.random() * 160;
      addPart({ kind: 'spark', x: px, y: py, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, size: f.r * 0.05, color: '#ffffff', life: 0.25 + Math.random() * 0.25, max: 1 });
    }
    G.parts.forEach(function (p) { if (p.max === 1) p.max = p.life; });
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
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, sp = 20 + Math.random() * 60;
      addPart({ kind: 'puff', x: x + (Math.random() - 0.5) * r, y: y + (Math.random() - 0.5) * r, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20,
        size: r * (0.25 + Math.random() * 0.3), grow: r * 0.6, color: color, life: 0.35 + Math.random() * 0.3, max: 0.6 });
    }
  }

  function spawnExplosion(x, y, r) {
    for (let i = 0; i < 36; i++) {
      const a = Math.random() * TAU, sp = 200 + Math.random() * 500;
      addPart({ kind: 'spark', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size: r * (0.05 + Math.random() * 0.08),
        color: pick(['#ffd166', '#ff9f1c', '#ff5400', '#ffffff']), life: 0.4 + Math.random() * 0.5, max: 0.9 });
    }
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * TAU, sp = 40 + Math.random() * 120;
      addPart({ kind: 'puff', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, size: r * (0.4 + Math.random() * 0.5), grow: r * 1.2,
        color: pick(['#555', '#777', '#999']), life: 0.6 + Math.random() * 0.5, max: 1.1 });
    }
  }

  function spawnHeartBurst(x, y, r) {
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * TAU, sp = 80 + Math.random() * 220;
      addPart({ kind: 'heart', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, size: r * (0.15 + Math.random() * 0.2), color: pick(['#ff6b8b', '#ff8fb1', '#ffc2d1']), life: 0.7 + Math.random() * 0.5, max: 1.2 });
    }
  }

  function spawnConfetti(n) {
    const cols = ['#ff6b35', '#ffd166', '#06d6a0', '#118ab2', '#ef476f', '#7b5ea7', '#2ec4b6'];
    for (let i = 0; i < n; i++) {
      addPart({ kind: 'confetti', x: Math.random() * G.W, y: -20 - Math.random() * G.H * 0.5, vx: (Math.random() - 0.5) * 80, vy: 80 + Math.random() * 160,
        size: 6 + Math.random() * 8, color: pick(cols), rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 8, life: 4 + Math.random() * 2, max: 6, sway: Math.random() * TAU });
    }
  }

  /* ================= PHÓNG QUẢ ================= */
  function lanes(n) {
    const margin = G.W * 0.1 + G.R;
    const span = Math.max(G.R * 2, G.W - 2 * margin);
    const slotW = span / n;
    const order = shuffle(Array.from({ length: n }, function (_, i) { return i; }));
    return order.map(function (i) { return margin + slotW * (i + 0.15 + Math.random() * 0.7); });
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
    const xs = lanes(items.length);
    const wave = opts.track ? { fruits: [], resolved: false, startTime: G.qStart, hint: false } : null;
    const H = G.H, W = G.W, g = G.gravity;
    items.forEach(function (it, i) {
      const x = xs[i];
      const apexY = H * (0.14 + Math.random() * 0.18);
      const y0 = H + G.R * 1.3;
      const f = new Fruit({
        kind: it.kind,
        value: it.value == null ? null : it.value,
        x: x, y: y0,
        vy: -Math.sqrt(2 * g * (y0 - apexY)),
        vx: (W / 2 - x) * 0.12 + (Math.random() - 0.5) * W * 0.06,
        vr: (Math.random() - 0.5) * 3,
        rot: Math.random() * TAU,
        delay: (opts.lead || 0) + i * 0.17 + Math.random() * 0.1,
        wave: wave
      });
      if (wave) wave.fruits.push(f);
      G.fruits.push(f);
    });
    if (wave) G.wave = wave;
    return wave;
  }

  /* ================= LUỒNG CÂU HỎI ================= */
  function newQuestion() {
    G.misses = 0;
    G.held = null;
    ui.hint.hidden = true;
    G.question = G.level.gen();
    G.qStart = G.time;
    renderQuestionCard(true);
    launchForQuestion(0.45);
  }

  function launchForQuestion(lead) {
    const lvl = G.level;
    const maxByWidth = Math.max(3, Math.floor((G.W - G.W * 0.2) / (G.R * 2.6)));
    const count = Math.min(6, maxByWidth, lvl.fruits + (G.stage >= 4 ? 1 : 0) + (G.stage >= 7 ? 1 : 0));
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
    wave.hint = G.misses >= 2;
    if (wave.hint) {
      const want = G.mode === 'answer' ? [G.question.answer] : G.question.pair.slice();
      wave.fruits.forEach(function (f) {
        if (f.kind !== 'fruit') return;
        const idx = want.indexOf(f.value);
        if (idx >= 0) { f.hint = true; want.splice(idx, 1); }
      });
    }
  }

  function renderQuestionCard(pop) {
    const q = G.question;
    if (!q) return;
    let html;
    if (G.mode === 'answer') html = esc(q.text) + ' = <span class="q">?</span>';
    else html = MG.pairText(q, G.held, G.heldForm);
    ui.question.innerHTML = html;
    ui.question.classList.remove('ok', 'shake');
    if (pop) {
      ui.question.classList.remove('pop');
      void ui.question.offsetWidth;
      ui.question.classList.add('pop');
    }
  }

  /** Dải thông báo gợi ý dưới đồng hồ (đáp án đúng, lý do sai...). */
  function showHint(text, kind) {
    const el = ui.hint;
    el.textContent = text;
    el.className = 'hint ' + (kind || '');
    el.hidden = false;
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
    clearTimeout(showHint._t);
    showHint._t = setTimeout(function () { el.hidden = true; }, 2200);
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
    const q = G.question;
    G.correct++;
    G.streak++;
    if (G.streak > G.bestStreak) G.bestStreak = G.streak;
    const elapsed = G.time - G.qStart;
    const mult = multiplier();
    const speedBonus = elapsed < 2.5 ? 50 : elapsed < 5 ? 25 : 0;
    const pts = 100 * mult + speedBonus;
    addScore(pts);
    G.wave.resolved = true;
    popOthers(f);
    addText('+' + pts, f.x, f.y - f.r * 0.2, { color: '#ffe066', size: G.R * 0.95, life: 1.0 });
    const praise = G.streak > 0 && G.streak % 3 === 0 && mult > 1 ? 'Combo x' + mult + '!' : pick(PRAISE);
    addText(praise, f.x, f.y - f.r * 1.3, { color: praise.indexOf('Combo') === 0 ? '#ff9f1c' : '#7bf1a8', size: G.R * 1.05, life: 1.2 });
    if (praise.indexOf('Combo') === 0) Sfx.play('combo'); else Sfx.play('correct');
    cardFx('ok');
    G.flash = { c: '120,255,180', a: 0.18 };
    const newStage = 1 + Math.floor(G.correct / 5);
    if (newStage > G.stage) {
      G.stage = newStage;
      updateGravity();
      addText('Màn ' + G.stage + '!', G.W / 2, G.H * 0.45, { color: '#ffd166', size: G.R * 1.7, life: 1.6, vy: -25 });
      addText('Nhanh hơn nào!', G.W / 2, G.H * 0.45 + G.R * 1.4, { color: '#fff', size: G.R * 0.8, life: 1.6, vy: -25 });
      Sfx.play('stage');
    }
    G.nextQuestionAt = G.time + 0.75;
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
    cardFx('shake');
    G.flash = { c: '255,60,90', a: 0.32 };
    G.shake = Math.max(G.shake, 0.45);
    Sfx.play('wrong');
    loseHeart();
  }

  function onBomb(f) {
    Sfx.play('bomb');
    G.shake = 1;
    G.flash = { c: '255,255,255', a: 0.9 };
    spawnExplosion(f.x, f.y, f.r);
    addText('BÙM!', f.x, f.y - f.r, { color: '#ffb703', size: G.R * 1.5, life: 1.2 });
    G.fruits.forEach(function (o) { if (o !== f && !o.dead) popFruit(o); });
    G.held = null;
    G.streak = 0;
    G.wrong++;
    renderQuestionCard(false);
    loseHeart();
  }

  function onHeart(f) {
    Sfx.play('heart');
    spawnHeartBurst(f.x, f.y, f.r);
    if (G.hearts < MAX_HEARTS) {
      G.hearts++;
      addText('+1 ❤️', f.x, f.y - f.r, { color: '#ff8fb1', size: G.R * 1.0, life: 1.2 });
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
    onWrong(f, q.text + ' = ' + q.answer);
    return false;
  }

  function partnerInAir(v, except) {
    const q = G.question;
    return G.fruits.some(function (o) {
      return o !== except && !o.dead && o.popping <= 0 && o.kind === 'fruit' && o.value != null && MG.isPair(q, v, o.value);
    });
  }

  function onPairSlice(f) {
    const q = G.question;
    const opTxt = q.op === '+' ? ' + ' : ' ' + MG.MINUS + ' ';
    if (G.held == null) {
      if (!partnerInAir(f.value, f)) {
        onWrong(f, 'Không có quả nào ghép với ' + f.value);
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
      const need = q.op === '+' ? q.target - f.value : (G.heldForm === 'a' ? f.value - q.target : f.value + q.target);
      addText('Tìm số ' + need + '!', f.x, f.y - f.r * 1.2, { color: '#5ce1e6', size: G.R * 0.95, life: 1.2 });
      return false;
    }
    if (MG.isPair(q, G.held, f.value)) {
      const first = G.held;
      G.held = null;
      onCorrect(f);
      showHint(first + opTxt + f.value + ' = ' + q.target + ' ✓', 'ok');
      return true;
    }
    const first = G.held;
    G.held = null;
    onWrong(f, first + opTxt + f.value + ' ≠ ' + q.target);
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

  function sliceSegment(x0, y0, x1, y1) {
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
    for (let i = 0; i < hits.length; i++) {
      const h = hits[i];
      if (h.f.dead) continue;
      const stop = sliceFruit(h.f, angle, x0 + (x1 - x0) * h.t, y0 + (y1 - y0) * h.t);
      if (stop) break;
    }
  }

  function sliceFruit(f, angle, px, py) {
    f.dead = true;
    if (f.kind === 'bomb') {
      if (G.state === 'playing') { onBomb(f); return true; }
      spawnExplosion(f.x, f.y, f.r);
      Sfx.play('bomb');
      G.shake = Math.max(G.shake, 0.5);
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
        if (f.delay <= 0) f.launched = true;
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
    }
    if (G.nextQuestionAt >= 0 && G.time >= G.nextQuestionAt) { G.nextQuestionAt = -1; newQuestion(); }
    if (G.relaunchAt >= 0 && G.time >= G.relaunchAt) { G.relaunchAt = -1; G.misses++; launchForQuestion(0.1); }
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

  function updateAttract(dt) {
    G.attractT -= dt;
    let alive = 0;
    for (let i = 0; i < G.fruits.length; i++) if (!G.fruits[i].dead) alive++;
    if (G.attractT <= 0 && alive < 3) {
      G.attractT = 1.3 + Math.random() * 1.4;
      launchWave([null], { lead: 0, track: false });
    }
    updateFruits(dt);
  }

  function update(dt) {
    G.anim += dt;
    updateClouds(dt);
    if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 2.2);
    if (G.flash) { G.flash.a -= dt * 1.6; if (G.flash.a <= 0) G.flash = null; }

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

  function drawNumber(c, v, x, y, r) {
    const s = String(v);
    const size = r * (s.length <= 2 ? 1.0 : s.length === 3 ? 0.78 : 0.62);
    c.font = '800 ' + Math.round(size) + 'px ' + FONT;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineJoin = 'round';
    c.lineWidth = Math.max(3, r * 0.17);
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

  function drawFruit(c, f) {
    if (!f.launched) return;
    const sc = f.scale;
    if (f.kind === 'bomb') { SP.draw(c, SP.bomb, f.x, f.y, f.rot, sc); drawSpark(c, f); return; }
    if (f.kind === 'heart') {
      const pulse = 1 + 0.08 * Math.sin(G.anim * 8 + f.x);
      SP.draw(c, SP.heart, f.x, f.y, Math.sin(G.anim * 3 + f.x) * 0.15, sc * pulse);
      return;
    }
    if (f.hint) {
      const pr = f.r * (1.25 + 0.08 * Math.sin(G.anim * 7));
      c.strokeStyle = 'rgba(255,214,102,0.9)';
      c.lineWidth = Math.max(3, f.r * 0.12);
      c.beginPath(); c.arc(f.x, f.y, pr, 0, TAU); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.6)';
      c.lineWidth = Math.max(1.5, f.r * 0.05);
      c.beginPath(); c.arc(f.x, f.y, pr + f.r * 0.12, 0, TAU); c.stroke();
    }
    SP.draw(c, SP.fruits[f.type].skin, f.x, f.y, f.rot, sc);
    if (f.value != null && sc > 0.5) drawNumber(c, f.value, f.x, f.y, f.r * sc);
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
          c.strokeStyle = pass === 0 ? 'rgba(120,210,255,' + (0.35 * t).toFixed(2) + ')' : 'rgba(255,255,255,' + (0.95 * t).toFixed(2) + ')';
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
      SP.drawHalf(c, h.type, h.x, h.y, h.rot, h.cut, h.side);
    }
    for (let i = 0; i < G.fruits.length; i++) drawFruit(c, G.fruits[i]);
    drawParts(c);
    drawTexts(c);
    drawBlades(c);
    if (G.shake > 0) c.translate(-sx, -sy);
    if (G.state === 'playing' && G.hearts === 1) {
      const a = 0.18 + 0.1 * Math.sin(G.anim * 5);
      const g = c.createRadialGradient(G.W / 2, G.H / 2, Math.min(G.W, G.H) * 0.45, G.W / 2, G.H / 2, Math.max(G.W, G.H) * 0.75);
      g.addColorStop(0, 'rgba(255,40,80,0)');
      g.addColorStop(1, 'rgba(255,40,80,' + a.toFixed(2) + ')');
      c.fillStyle = g;
      c.fillRect(0, 0, G.W, G.H);
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
    G.hud = { score: -1, hearts: -1, stage: -1, mult: -1, time: '', fill: -1 };
    ui.combo.hidden = true;
    ui.hint.hidden = true;
    ui.question.innerHTML = 'Sẵn sàng…';
    ui.timerFill.style.width = '100%';
    ui.timerFill.classList.remove('warn', 'danger');
    ui.timer.classList.remove('danger');
  }

  /* ================= VÒNG ĐỜI VÁN CHƠI ================= */
  function clearWorld() {
    G.fruits.length = 0;
    G.halves.length = 0;
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
    G.score = 0; G.hearts = MAX_HEARTS; G.streak = 0; G.bestStreak = 0; G.correct = 0; G.wrong = 0; G.stage = 1;
    G.timeLeft = G.duration; G.time = 0; G.question = null; G.held = null; G.misses = 0;
    G.nextQuestionAt = -1; G.relaunchAt = -1; G.overAt = -1; G.lastWarnSec = -1; G.resultShown = false; G.lastEntry = null;
    clearWorld();
    applyFruitSize();
    updateGravity();
    resetHud();
    showHud(true);
    showScreen('countdown');
    syncHud();
    requestWake();
    runCountdown(function () {
      G.state = 'playing';
      G.nextQuestionAt = G.time + 0.15;
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
    if (G.state !== 'playing') return;
    G.state = 'paused';
    G.blades.clear();
    $('pause-info').textContent = 'Điểm hiện tại: ' + fmt(G.score) + ' · Còn ' + formatTime(G.timeLeft);
    showScreen('pause');
  }

  function resumeGame() {
    if (G.state !== 'paused') return;
    G.state = 'playing';
    showScreen(null);
    Sfx.unlock();
  }

  function endGame(reason) {
    if (G.state !== 'playing') return;
    G.state = 'over';
    G.endReason = reason;
    G.blades.clear();
    G.nextQuestionAt = -1; G.relaunchAt = -1;
    G.overAt = G.anim + (reason === 'timeup' ? 1.0 : 1.3);
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
    let h = '';
    for (let i = 0; i < 3; i++) h += '<span class="' + (i < n ? 'on' : 'off') + '">★</span>';
    return h;
  }

  function showResults() {
    G.resultShown = true;
    const lvl = G.level, score = G.score;
    const rec = Store.getRecord(G.mode, lvl.id, G.duration);
    const isRecord = score > 0 && score > (rec.best || 0);
    const stars = starsFor(score, lvl, G.duration);
    const lastName = Store.data.names[0] || 'Bạn nhỏ';
    const entry = { name: lastName, score: score, date: Date.now() };
    const top = (rec.top || []).slice();
    let qualifies = false;
    if (score > 0) {
      top.push(entry);
      top.sort(function (a, b) { return b.score - a.score; });
      const idx = top.indexOf(entry);
      if (idx < 5) qualifies = true; else top.splice(idx, 1);
      while (top.length > 5) top.pop();
    }
    const newRec = { best: Math.max(rec.best || 0, score), stars: Math.max(rec.stars || 0, stars), top: top };
    Store.setRecord(G.mode, lvl.id, G.duration, newRec);
    G.lastEntry = qualifies ? entry : null;

    ui.resultTitle.textContent = G.endReason === 'timeup' ? '⏰ Hết giờ!' : '💔 Hết tim rồi!';
    ui.resultTitle.className = 'result-title ' + (G.endReason === 'timeup' ? 'timeup' : 'nolife');
    ui.resultLevel.textContent = (G.mode === 'answer' ? 'Chém đáp án' : 'Ghép đôi') + ' · ' + lvl.icon + ' ' + lvl.title + ' · ' + formatTime(G.duration);
    ui.resultScore.textContent = fmt(score);
    ui.resultStars.innerHTML = starsHtml(stars);
    ui.resultRecord.hidden = !isRecord;
    ui.stCorrect.textContent = G.correct;
    ui.stWrong.textContent = G.wrong;
    ui.stCombo.textContent = G.bestStreak;
    const total = G.correct + G.wrong;
    ui.stAcc.textContent = total ? Math.round(G.correct / total * 100) + '%' : '–';

    ui.nameEntry.hidden = !qualifies;
    if (qualifies) {
      ui.nameInput.value = lastName === 'Bạn nhỏ' ? '' : lastName;
      ui.nameChips.innerHTML = Store.data.names.map(function (n) { return '<button type="button" data-name="' + esc(n) + '">' + esc(n) + '</button>'; }).join('');
    }
    renderLeader(newRec.top, entry);
    showScreen('gameover');
    if (isRecord) { Sfx.play('record'); spawnConfetti(140); }
    else if (stars >= 2) spawnConfetti(70);
    releaseWake();
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

  function saveName() {
    if (!G.lastEntry) return;
    const name = (ui.nameInput.value || '').trim().slice(0, 14) || 'Bạn nhỏ';
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
    G.state = 'menu';
    G.level = null;
    clearWorld();
    applyFruitSize();
    showHud(false);
    showScreen('menu');
    releaseWake();
  }

  function goLevels() {
    clearTimeout(G.cdTimer);
    G.state = 'levels';
    if (inGame()) { clearWorld(); }
    G.level = null;
    applyFruitSize();
    showHud(false);
    renderLevels();
    showScreen('levels');
    releaseWake();
  }

  /* ================= CHỌN MÀN ================= */
  function gradeLabel(g) { return g === 0 ? 'Thử thách' : 'Lớp ' + g; }
  function gradeClass(g) { return g === 0 ? 'gx' : 'g' + g; }

  function renderLevels() {
    const list = G.mode === 'answer' ? MG.ANSWER_LEVELS : MG.PAIR_LEVELS;
    ui.modeDesc.innerHTML = G.mode === 'answer'
      ? 'Nhìn phép tính, chém quả có <b>đáp án đúng</b>!'
      : 'Chém <b>2 quả</b> cộng (hoặc trừ) lại bằng <b>số cho trước</b>!';
    ui.levelGrid.innerHTML = list.map(function (l) {
      const rec = Store.getRecord(G.mode, l.id, G.duration);
      return '<div class="level-card" data-id="' + l.id + '" role="button">' +
        '<span class="grade ' + gradeClass(l.grade) + '">' + gradeLabel(l.grade) + '</span>' +
        '<div class="icon">' + l.icon + '</div>' +
        '<div class="name">' + esc(l.title) + '</div>' +
        '<div class="desc">' + esc(l.desc) + '</div>' +
        '<div class="meta"><span class="best">🏆 ' + fmt(rec.best || 0) + '</span><span class="stars">' + starsHtml(rec.stars || 0) + '</span></div>' +
        '</div>';
    }).join('');
    const tabs = ui.levels.querySelectorAll('.tab');
    for (let i = 0; i < tabs.length; i++) tabs[i].classList.toggle('on', tabs[i].getAttribute('data-mode') === G.mode);
  }

  /* ================= ĐẦU VÀO (CHẠM / CHUỘT) ================= */
  function handleMove(b, x, y, t) {
    const dx = x - b.lx, dy = y - b.ly;
    const d2 = dx * dx + dy * dy;
    if (d2 < 4) return;
    b.pts.push({ x: x, y: y, t: t });
    if (b.pts.length > 24) b.pts.shift();
    if (canSlice()) sliceSegment(b.lx, b.ly, x, y);
    const dt = Math.max(1, t - b.lt);
    if (Math.sqrt(d2) / dt * 1000 > 900 && canSlice()) Sfx.play('swoosh');
    b.lx = x; b.ly = y; b.lt = t;
  }

  function onPointerDown(e) {
    Sfx.unlock();
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* bỏ qua */ }
    const t = performance.now();
    G.blades.set(e.pointerId, { pts: [{ x: e.clientX, y: e.clientY, t: t }], lx: e.clientX, ly: e.clientY, lt: t, active: true });
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
    // Chặn cuộn/zoom của Safari khi thao tác trên canvas
    document.addEventListener('touchmove', function (e) { if (e.target === canvas && e.cancelable) e.preventDefault(); }, { passive: false });
    document.addEventListener('touchstart', function (e) { if (e.target === canvas && e.cancelable) e.preventDefault(); }, { passive: false });
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    document.addEventListener('dblclick', function (e) { e.preventDefault(); });
    document.addEventListener('contextmenu', function (e) { if (e.target === canvas) e.preventDefault(); });
    // Mở khóa âm thanh ở mọi thao tác chạm đầu tiên (kể cả nút bấm)
    document.addEventListener('pointerdown', function () { Sfx.unlock(); }, true);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (G.state === 'playing') pauseGame(); else if (G.state === 'paused') resumeGame();
      }
    });
  }

  /* ================= GIAO DIỆN ================= */
  function click(id, fn) {
    const el = $(id);
    if (!el) return;
    el.addEventListener('click', function (e) { Sfx.unlock(); Sfx.play('click'); fn(e); });
  }

  function updateSoundBtn() {
    ui.btnSound.textContent = Store.data.sound ? '🔊 Âm thanh: Bật' : '🔇 Âm thanh: Tắt';
  }

  function bindUi() {
    click('btn-play', function () { goLevels(); });
    click('btn-howto', function () { ui.howto.classList.remove('hidden'); });
    click('btn-levels-howto', function () { ui.howto.classList.remove('hidden'); });
    click('btn-howto-close', function () { ui.howto.classList.add('hidden'); });
    click('btn-sound', function () {
      Store.data.sound = !Store.data.sound;
      Store.save();
      Sfx.setEnabled(Store.data.sound);
      updateSoundBtn();
      if (Store.data.sound) Sfx.play('correct');
    });
    click('btn-levels-back', function () { goMenu(); });
    click('btn-pause', function () { pauseGame(); });
    click('btn-resume', function () { resumeGame(); });
    click('btn-restart', function () { const l = G.level; if (l) startGame(l); });
    click('btn-quit', function () { goMenu(); });
    click('btn-again', function () { const l = G.level; if (l) startGame(l); });
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
        for (let k = 0; k < durBtns.length; k++) durBtns[k].classList.toggle('on', durBtns[k] === this);
      });
    }

    const tabs = ui.levels.querySelectorAll('.tab');
    for (let i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener('click', function () {
        Sfx.unlock(); Sfx.play('click');
        G.mode = this.getAttribute('data-mode') === 'pair' ? 'pair' : 'answer';
        renderLevels();
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

    document.addEventListener('visibilitychange', function () {
      if (document.hidden && G.state === 'playing') pauseGame();
      if (!document.hidden) Sfx.unlock();
    });
    window.addEventListener('blur', function () { if (G.state === 'playing') pauseGame(); });
  }

  /* ================= TIỆN ÍCH THIẾT BỊ ================= */
  function requestWake() {
    try {
      if ('wakeLock' in navigator && navigator.wakeLock.request) {
        navigator.wakeLock.request('screen').then(function (l) { G.wakeLock = l; }).catch(function () { /* bỏ qua */ });
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
    const t0 = performance.now();
    update(dt);
    const t1 = performance.now();
    render();
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
    G.duration = [60, 90, 120].indexOf(Number(Store.data.duration)) >= 0 ? Number(Store.data.duration) : 90;
    Sfx.setEnabled(Store.data.sound !== false);
    updateSoundBtn();
    const durBtns = ui.durationGroup.querySelectorAll('button');
    for (let k = 0; k < durBtns.length; k++) durBtns[k].classList.toggle('on', Number(durBtns[k].getAttribute('data-sec')) === G.duration);
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
  window.__NinjaToan = { G: G, Store: Store, startGame: startGame, sliceSegment: sliceSegment, launchWave: launchWave, endGame: endGame, updateGravity: updateGravity, render: render, update: update };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
