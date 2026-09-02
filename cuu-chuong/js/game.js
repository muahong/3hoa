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
  const HINT_POINTS = 20;      // điểm khi bắn thiên thạch đã hiện đáp án

  /* ================= LƯU TRỮ (localStorage) ================= */
  const Store = {
    key: 'cuu-chuong-v1',
    data: { sound: true, music: true, voice: true, duration: 90, op: 'mix', names: [], records: {} },
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
    recKey(level, op, duration) { return level.id + ':' + (level.table ? op : 'x') + ':' + duration; },
    getRecord(level, op, duration) {
      return this.data.records[this.recKey(level, op, duration)] || { best: 0, stars: 0, top: [] };
    },
    setRecord(level, op, duration, rec) {
      this.data.records[this.recKey(level, op, duration)] = rec;
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
    typed: '', targetId: 0, lastSpawn: -99, nextSpawnAt: 0, idSeq: 0, attractT: 0.8, review: [],
    overAt: -1, lastWarnSec: -1, endReason: '', hurry: false,
    hud: { score: -1, shields: -1, stage: -1, mult: -1, time: '' },
    cardKey: '', cdTimer: 0, resultShown: false, lastEntry: null, wakeLock: null, tableN: 2, reading: false,
    perf: { n: 0, update: 0, render: 0, avgUpdate: 0, avgRender: 0 }
  };

  /* ================= DOM ================= */
  const app = $('app');
  const canvas = $('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  const ui = {
    hud: $('hud'), menu: $('menu'), levels: $('levels'), tables: $('tables'), howto: $('howto'), countdown: $('countdown'),
    pause: $('pause'), gameover: $('gameover'), toast: $('toast'), numpad: $('numpad'),
    score: $('hud-score'), stage: $('hud-stage'), combo: $('hud-combo'), answer: $('hud-answer'),
    timer: $('hud-timer'), timerFill: $('hud-timer-fill'), time: $('hud-time'), shields: $('hud-shields'), hint: $('hud-hint'),
    countNum: $('count-num'), levelGrid: $('level-grid'), modeDesc: $('mode-desc'), opRow: $('op-row'), opGroup: $('op-group'),
    tableTabs: $('table-tabs'), tableBody: $('table-body'),
    resultTitle: $('result-title'), resultLevel: $('result-level'), resultScore: $('result-score'),
    resultStars: $('result-stars'), resultRecord: $('result-record'),
    stCorrect: $('st-correct'), stWrong: $('st-wrong'), stCombo: $('st-combo'), stAcc: $('st-acc'),
    review: $('review'), reviewChips: $('review-chips'),
    nameEntry: $('name-entry'), nameInput: $('name-input'), nameChips: $('name-chips'), leader: $('leader'),
    durationGroup: $('duration-group'), ipadTip: $('ipad-tip'), fireBtn: ui_fire()
  };
  function ui_fire() { return document.querySelector('#numpad .fire'); }
  const SCREENS = ['menu', 'levels', 'tables', 'countdown', 'pause', 'gameover'];

  function showScreen(name) {
    SCREENS.forEach(function (k) { ui[k].classList.toggle('hidden', k !== name); });
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
    G.dpr = Math.min(window.devicePixelRatio || 1, 2);
    G.W = w; G.H = h;
    canvas.width = Math.round(w * G.dpr);
    canvas.height = Math.round(h * G.dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    layout();
    initStars();
  }

  /** Tính vùng chơi (phần màn hình không bị bàn phím số che), hành tinh, khiên, pháo. */
  function layout() {
    const W = G.W, H = G.H;
    const f = { x: 0, y: 0, w: W, h: H };
    if (inGame()) {
      const pr = ui.numpad.getBoundingClientRect();
      if (W <= H) f.h = clamp(pr.top - 6, H * 0.45, H);          // màn hình dọc: bàn phím ở dưới
      else f.w = clamp(pr.left - 6, W * 0.5, W);                 // màn hình ngang: bàn phím bên phải
    }
    G.field = f;
    G.baseR = clamp(Math.min(f.w, f.h) * 0.085, 36, 68);
    const domeH = clamp(f.h * 0.14, 50, 120);
    const pr = Math.max(f.w * 0.75, 280);
    G.planet = { cx: f.x + f.w / 2, cy: f.y + f.h - domeH + pr, r: pr, domeH: domeH };
    G.shieldR = pr + clamp(domeH * 0.5, 22, 50);
    G.cannon.x = G.planet.cx;
    G.cannon.y = G.planet.cy - pr;
    // Thiên thạch xuất hiện ngay dưới HUD (thẻ trả lời + đồng hồ) để không bị che
    G.spawnY = 0;
    if (inGame()) {
      try { G.spawnY = Math.max(0, ui.timer.getBoundingClientRect().bottom + 6); } catch (e) { G.spawnY = 0; }
    }
    G.meteors.forEach(function (m) { m.r = radiusFor(m.q ? m.q.label : ''); });
    buildBackground();
  }

  function radiusFor(label) {
    return Math.round(G.baseR * (1 + 0.05 * Math.max(0, String(label).length - 5)));
  }

  function surfaceY(dx) {
    const P = G.planet;
    const d = Math.min(Math.abs(dx), P.r);
    return P.cy - Math.sqrt(P.r * P.r - d * d);
  }

  function layer(fn) {
    const c = document.createElement('canvas');
    c.width = canvas.width; c.height = canvas.height;
    const cx = c.getContext('2d');
    cx.scale(G.dpr, G.dpr);
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
      for (let i = 0; i < 3; i++) flower(c, P.cx + fx[i], surfaceY(fx[i]) - s * 2.2, s * (i === 1 ? 1.2 : 1), fc[i]);
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
    this.wrongs = 0;
    this.born = G.time;
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
    G.texts.push(t);
  }

  function addPart(p) {
    if (G.parts.length >= MAX_PARTS) G.parts.shift();
    G.parts.push(p);
  }

  function spawnExplosion(x, y, r, big) {
    const n = big ? 44 : 28;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, sp = (big ? 220 : 150) + Math.random() * (big ? 460 : 320);
      addPart({ kind: 'spark', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size: r * (0.05 + Math.random() * 0.08),
        color: pick(['#ffd166', '#ff9f1c', '#ff5400', '#ffffff', '#ffe66d']), life: 0.4 + Math.random() * 0.5, max: 0.9 });
    }
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * TAU, sp = 40 + Math.random() * 110;
      addPart({ kind: 'puff', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, size: r * (0.35 + Math.random() * 0.4), grow: r * 1.1,
        color: pick(['#6b5140', '#8c7160', '#5a463a']), life: 0.5 + Math.random() * 0.4, max: 0.9 });
    }
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * TAU, sp = 90 + Math.random() * 200;
      addPart({ kind: 'rock', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, size: r * (0.12 + Math.random() * 0.14),
        rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 10, color: '#7a5f4b', life: 0.7 + Math.random() * 0.5, max: 1.2 });
    }
  }

  function spawnTwinkle(x, y, r) {
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * TAU, sp = 60 + Math.random() * 160;
      addPart({ kind: 'spark', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size: r * (0.04 + Math.random() * 0.06),
        color: pick(['#ffffff', '#9af0ff', '#ffe66d']), life: 0.3 + Math.random() * 0.3, max: 0.6 });
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

  /* ================= THIÊN THẠCH ================= */
  function speedMul() {
    const lvl = G.level;
    return (lvl ? lvl.speed : 0.7) * Math.min(1.6, 1 + 0.06 * (G.stage - 1));
  }
  function meteorCap() { return G.stage <= 3 ? 2 : G.stage <= 6 ? 3 : 4; }
  function spawnGap() { return clamp(6.5 - 0.4 * (G.stage - 1), 3.0, 6.5) / (G.level ? G.level.speed : 1); }

  function liveMeteors() {
    return G.meteors.filter(function (m) { return !m.dead && m.popping <= 0; });
  }

  function spawnMeteor(q, kind, slowMul) {
    const f = G.field;
    const r = radiusFor(q ? q.label : '');
    let x = 0, tries = 0;
    do {
      x = f.x + r + 8 + Math.random() * Math.max(1, f.w - 2 * r - 16);
      tries++;
    } while (tries < 10 && G.meteors.some(function (m) { return !m.dead && m.y < f.h * 0.4 && Math.abs(m.x - x) < r * 2.4; }));
    const fallTime = BASE_FALL / speedMul() * (slowMul || 1);
    const apex = G.planet.cy - G.shieldR;
    let y0 = -r * 1.2;
    if (G.state === 'playing' || G.state === 'countdown') y0 = Math.min(G.spawnY + r * 0.9, apex - f.h * 0.35);
    const m = new Meteor({
      kind: kind || 'rock', q: q, x: x, y: y0, r: r,
      vy: (apex - y0) / fallTime,
      vx: (f.x + f.w / 2 - x) * 0.012 + (Math.random() - 0.5) * 10,
      rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 0.9
    });
    G.meteors.push(m);
    G.lastSpawn = G.time;
    if (G.state === 'playing') { Sfx.play('spawn'); spawnTwinkle(m.x, m.y, r); }
    return m;
  }

  function spawnForQuestion() {
    const q = G.level.gen(G.op);
    const heart = G.shields < MAX_SHIELDS && chance(0.14) && !G.meteors.some(function (m) { return !m.dead && m.kind === 'heart'; });
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
    if (G.state === 'playing' && m.q) Voice.say(m.q.speech);
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
    if (!t || !t.q) {
      html = G.state === 'playing' ? 'Sẵn sàng…' : '…';
    } else {
      const typed = G.typed;
      const slot = '<span class="typed' + (typed ? '' : ' empty') + '">' + (typed || '?') + '</span><span class="caret"></span>';
      html = esc(t.q.text).replace('?', slot)
        .replace(' × ', ' <span class="op">×</span> ').replace(' : ', ' <span class="op">:</span> ');
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

  function showHint(text, kind, ms) {
    const el = ui.hint;
    el.textContent = text;
    el.className = 'hint ' + (kind || '');
    el.hidden = false;
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
    clearTimeout(showHint._t);
    showHint._t = setTimeout(function () { el.hidden = true; }, ms || 2400);
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
    if (G.typed.length >= maxDigits()) { Sfx.play('del'); return; }
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

  function noteReview(q) {
    if (!q) return;
    if (G.review.some(function (r) { return r.full === q.full; })) return;
    if (G.review.length >= 8) return;
    G.review.push({ full: q.full, speechFull: q.speechFull });
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
    G.shake = Math.max(G.shake, big ? 0.7 : 0.3);
  }

  function onHit(m) {
    const q = m.q;
    fireLaser(m);
    destroyMeteor(m, false);
    G.correct++;
    let pts;
    if (m.hint) {
      pts = HINT_POINTS;
      addText('Nhớ nhé: ' + q.full, m.x, m.y - m.r * 1.3, { color: '#ffe066', size: G.baseR * 0.7, life: 1.4 });
    } else {
      G.streak++;
      if (G.streak > G.bestStreak) G.bestStreak = G.streak;
      const age = G.time - m.born;
      const mult = multiplier();
      const speedBonus = age < 4 ? 50 : age < 8 ? 25 : 0;
      pts = 100 * mult + speedBonus;
      const praise = G.streak > 0 && G.streak % 3 === 0 && mult > 1 ? 'Combo x' + mult + '!' : pick(PRAISE);
      addText(praise, m.x, m.y - m.r * 1.3, { color: praise.indexOf('Combo') === 0 ? '#ff9f1c' : '#7bf1a8', size: G.baseR * 1.0, life: 1.2 });
      if (praise.indexOf('Combo') === 0) { Sfx.play('combo'); Voice.say('Combo nhân ' + mult + '!'); }
      else { Sfx.play('correct'); Voice.say(praise); }
    }
    G.score += pts;
    addText('+' + pts, m.x, m.y - m.r * 0.3, { color: '#ffe066', size: G.baseR * 0.95, life: 1.0 });
    showHint(q.full + ' ✓', 'ok', 1600);
    cardFx('ok');
    G.flash = { c: '120,255,180', a: 0.16 };

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

    const newStage = 1 + Math.floor(G.correct / 5);
    if (newStage > G.stage) {
      G.stage = newStage;
      addText('Đợt ' + G.stage + '!', G.field.x + G.field.w / 2, G.field.h * 0.4, { color: '#ffd166', size: G.baseR * 1.6, life: 1.6, vy: -25 });
      addText('Thiên thạch rơi nhanh hơn!', G.field.x + G.field.w / 2, G.field.h * 0.4 + G.baseR * 1.4, { color: '#fff', size: G.baseR * 0.75, life: 1.6, vy: -25 });
      Sfx.play('stage');
    }
    G.nextSpawnAt = G.time + 0.6;
  }

  function onWrong(target, val) {
    G.wrong++;
    G.streak = 0;
    cardFx('shake');
    G.flash = { c: '255,60,90', a: 0.28 };
    Sfx.play('wrong');
    if (!target || !target.q) return;
    target.wrongs++;
    addText('✗ ' + val, target.x, target.y - target.r * 1.3, { color: '#ff5c7a', size: G.baseR * 0.95, life: 1.0 });
    noteReview(target.q);
    if (target.wrongs >= 2 && !target.hint) {
      target.hint = true;
      showHint('Đáp án: ' + target.q.full + ' – gõ theo nhé!', 'info', 3000);
      Voice.say('Đáp án là: ' + target.q.speechFull);
      Sfx.play('hint');
    } else {
      showHint('Sai rồi, thử lại nhé!', 'bad', 1400);
      Voice.say('Sai rồi! Thử lại nhé.');
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
    G.shake = 1;
    G.flash = { c: '255,255,255', a: 0.7 };
    Sfx.play('shieldhit');
    G.wrong++;
    G.streak = 0;
    addText('BÙM!', m.x, m.y - m.r, { color: '#ffb703', size: G.baseR * 1.4, life: 1.2 });
    showHint(m.q.full, 'bad', 2600);
    Voice.say('Ối! ' + m.q.speechFull);
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
      if (m.x < f.x + m.r) { m.x = f.x + m.r; m.vx = Math.abs(m.vx); }
      if (m.x > f.x + f.w - m.r) { m.x = f.x + f.w - m.r; m.vx = -Math.abs(m.vx); }
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
    const live = liveMeteors();
    if (live.length === 0) {
      if (G.time >= G.nextSpawnAt) spawnForQuestion();
    } else if (live.length < meteorCap() && G.time - G.lastSpawn >= spawnGap()) {
      spawnForQuestion();
    }
    const t = getTarget();
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
    if (G.attractT <= 0 && live.length < 3) {
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
  function drawStars(c) {
    for (let i = 0; i < G.stars.length; i++) {
      const s = G.stars[i];
      const a = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(G.anim * s.sp + s.ph));
      c.fillStyle = 'rgba(255,255,255,' + a.toFixed(2) + ')';
      c.beginPath(); c.arc(s.x, s.y, s.r, 0, TAU); c.fill();
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

  function drawFlame(c, m) {
    const r = m.r * m.scale;
    const ang = Math.atan2(-m.vy, -m.vx);
    c.save();
    c.translate(m.x, m.y);
    c.rotate(ang + Math.PI / 2);
    const fl = 1 + 0.25 * Math.sin(G.anim * 23 + m.id);
    const L = r * (1.7 + 0.5 * fl);
    const g = c.createLinearGradient(0, 0, 0, -L);
    g.addColorStop(0, 'rgba(255,120,0,0.85)');
    g.addColorStop(0.5, 'rgba(255,190,40,0.5)');
    g.addColorStop(1, 'rgba(255,240,150,0)');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(-r * 0.78, 0);
    c.quadraticCurveTo(-r * 0.5, -L * 0.55, 0, -L);
    c.quadraticCurveTo(r * 0.5, -L * 0.55, r * 0.78, 0);
    c.closePath();
    c.fill();
    const g2 = c.createLinearGradient(0, 0, 0, -L * 0.6);
    g2.addColorStop(0, 'rgba(255,245,180,0.9)');
    g2.addColorStop(1, 'rgba(255,220,80,0)');
    c.fillStyle = g2;
    c.beginPath();
    c.moveTo(-r * 0.42, 0);
    c.quadraticCurveTo(-r * 0.2, -L * 0.35, 0, -L * 0.6);
    c.quadraticCurveTo(r * 0.2, -L * 0.35, r * 0.42, 0);
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

  function drawLabel(c, text, x, y, r, color) {
    const s = String(text);
    let size = r * (s.length <= 3 ? 0.9 : s.length <= 5 ? 0.66 : 0.52);
    c.font = '800 ' + Math.round(size) + 'px ' + FONT;
    const w = c.measureText(s).width;
    const maxW = r * 1.72;
    if (w > maxW) { size = size * maxW / w; c.font = '800 ' + Math.round(size) + 'px ' + FONT; }
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineJoin = 'round';
    c.lineWidth = Math.max(3, size * 0.18);
    c.strokeStyle = 'rgba(15,10,30,0.92)';
    c.strokeText(s, x, y + size * 0.05);
    c.fillStyle = color || '#fff';
    c.fillText(s, x, y + size * 0.05);
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
      c.save();
      c.translate(m.x, m.y);
      c.rotate(m.rot);
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
      c.restore();
    }
    if (m.q && sc > 0.5) {
      if (m.hint) drawLabel(c, m.q.full, m.x, m.y, r, '#ffe066');
      else drawLabel(c, m.q.label, m.x, m.y, r, '#fff');
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
    drawShield(c);
    drawCannon(c);
    for (let i = 0; i < G.meteors.length; i++) if (!G.meteors[i].dead) drawMeteor(c, G.meteors[i]);
    drawLasers(c);
    drawParts(c);
    drawTexts(c);
    if (G.shake > 0) c.translate(-sx, -sy);
    if (G.state === 'playing' && G.shields === 1) {
      const a = 0.16 + 0.1 * Math.sin(G.anim * 5);
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
    if (h.shields !== G.shields) {
      h.shields = G.shields;
      const spans = ui.shields.children;
      for (let i = 0; i < spans.length; i++) spans[i].classList.toggle('lost', i >= G.shields);
    }
    if (h.stage !== G.stage) { h.stage = G.stage; ui.stage.textContent = 'Đợt ' + G.stage; }
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
    G.hud = { score: -1, shields: -1, stage: -1, mult: -1, time: '' };
    G.cardKey = '';
    ui.combo.hidden = true;
    ui.hint.hidden = true;
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
  }

  function startGame(level) {
    clearTimeout(G.cdTimer);
    G.level = level;
    G.mode = level.table ? 'table' : 'challenge';
    G.state = 'countdown';
    G.score = 0; G.shields = MAX_SHIELDS; G.streak = 0; G.bestStreak = 0; G.correct = 0; G.wrong = 0; G.stage = 1;
    G.timeLeft = G.duration; G.time = 0; G.review = [];
    G.lastSpawn = -99; G.nextSpawnAt = 0; G.overAt = -1; G.lastWarnSec = -1; G.resultShown = false; G.lastEntry = null;
    G.cannon.angle = -Math.PI / 2; G.cannon.recoil = 0;
    clearWorld();
    resetHud();
    showHud(true);
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
    if (G.state !== 'playing') return;
    G.state = 'paused';
    Voice.stop();
    Music.setDuck('pause', 0.25);
    $('pause-info').textContent = 'Điểm hiện tại: ' + fmt(G.score) + ' · Còn ' + formatTime(G.timeLeft);
    showScreen('pause');
  }

  function resumeGame() {
    if (G.state !== 'paused') return;
    G.state = 'playing';
    showScreen(null);
    Sfx.unlock();
    Music.setDuck('pause', null);
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

  function showResults() {
    G.resultShown = true;
    const lvl = G.level, score = G.score;
    const rec = Store.getRecord(lvl, G.op, G.duration);
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
    Store.setRecord(lvl, G.op, G.duration, newRec);
    G.lastEntry = qualifies ? entry : null;

    ui.resultTitle.textContent = G.endReason === 'timeup' ? '⏰ Hết giờ!' : '💥 Khiên đã vỡ!';
    ui.resultTitle.className = 'result-title ' + (G.endReason === 'timeup' ? 'timeup' : 'nolife');
    ui.resultLevel.textContent = lvl.icon + ' ' + lvl.title + (lvl.table ? ' · ' + opLabel(G.op) : '') + ' · ' + formatTime(G.duration);
    ui.resultScore.textContent = fmt(score);
    ui.resultStars.innerHTML = starsHtml(stars);
    ui.resultRecord.hidden = !isRecord;
    ui.stCorrect.textContent = G.correct;
    ui.stWrong.textContent = G.wrong;
    ui.stCombo.textContent = G.bestStreak;
    const total = G.correct + G.wrong;
    ui.stAcc.textContent = total ? Math.round(G.correct / total * 100) + '%' : '–';

    ui.review.hidden = !G.review.length;
    ui.reviewChips.innerHTML = G.review.map(function (r, i) {
      const parts = r.full.split(' = ');
      return '<span data-i="' + i + '">' + esc(parts[0]) + ' = <b>' + esc(parts[1] || '') + '</b></span>';
    }).join('');

    ui.nameEntry.hidden = !qualifies;
    if (qualifies) {
      ui.nameInput.value = lastName === 'Bạn nhỏ' ? '' : lastName;
      ui.nameChips.innerHTML = Store.data.names.map(function (n) { return '<button type="button" data-name="' + esc(n) + '">' + esc(n) + '</button>'; }).join('');
    }
    renderLeader(newRec.top, entry);
    showScreen('gameover');
    if (isRecord) { Sfx.play('record'); Sfx.play('applause'); spawnConfetti(140); Voice.say('Kỷ lục mới! Giỏi quá!', { queue: true }); }
    else if (stars >= 2) { Sfx.play('applause'); spawnConfetti(70); Voice.say('Chơi tốt lắm!', { queue: true }); }
    setTimeout(function () { if (G.state === 'over') Music.play('menu'); }, 2500);
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
    const rec = Store.getRecord(G.level, G.op, G.duration);
    rec.top = rec.top.map(function (e) { return e.date === G.lastEntry.date && e.score === G.lastEntry.score ? G.lastEntry : e; });
    Store.setRecord(G.level, G.op, G.duration, rec);
    renderLeader(rec.top, G.lastEntry);
    ui.nameEntry.hidden = true;
    ui.nameInput.blur();
    toast('Đã lưu tên ' + name + ' vào bảng vàng! 🎉');
    Sfx.play('click');
  }

  function leaveGame() {
    clearTimeout(G.cdTimer);
    const was = inGame();
    G.level = null;
    clearWorld();
    showHud(false);
    if (was) layout();
    releaseWake();
    Voice.stop();
    G.reading = false;
    Music.setDuck('pause', null);
    Music.play('menu');
  }

  function goMenu() {
    leaveGame();
    G.state = 'menu';
    showScreen('menu');
  }

  function goLevels() {
    leaveGame();
    G.state = 'levels';
    renderLevels();
    showScreen('levels');
  }

  function goTables() {
    leaveGame();
    G.state = 'tables';
    renderTables();
    showScreen('tables');
  }

  /* ================= CHỌN MÀN ================= */
  function gradeLabel(g) { return g === 0 ? 'Thử thách' : 'Lớp ' + g; }
  function gradeClass(g) { return g === 0 ? 'gx' : 'g' + g; }

  function renderLevels() {
    const isTable = G.mode === 'table';
    const list = isTable ? T.TABLE_LEVELS : T.CHALLENGE_LEVELS;
    ui.opRow.hidden = !isTable;
    ui.modeDesc.innerHTML = isTable
      ? 'Chọn <b>bảng</b> muốn luyện. Mỗi thiên thạch mang một phép tính!'
      : 'Trộn nhiều bảng, <b>tìm thừa số</b>, <b>nhân chia số lớn</b>… dành cho bạn đã thuộc bảng!';
    ui.levelGrid.innerHTML = list.map(function (l) {
      const rec = Store.getRecord(l, G.op, G.duration);
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
    const ops = ui.opGroup.querySelectorAll('button');
    for (let i = 0; i < ops.length; i++) ops[i].classList.toggle('on', ops[i].getAttribute('data-op') === G.op);
  }

  /* ================= BẢNG CỬU CHƯƠNG ================= */
  function renderTables() {
    ui.tableTabs.innerHTML = T.ALL_TABLES.map(function (n) {
      return '<button type="button" data-n="' + n + '" class="' + (n === G.tableN ? 'on' : '') + '">' + n + '</button>';
    }).join('');
    const rows = T.tableRows(G.tableN);
    const col = function (kind, title) {
      return '<div class="table-col ' + kind + '"><h3>' + title + '</h3>' + rows.map(function (r, i) {
        const s = r[kind].split(' = ');
        return '<div class="table-row" data-kind="' + kind + '" data-i="' + i + '">' + esc(s[0]) + ' = <span class="ans">' + esc(s[1]) + '</span></div>';
      }).join('') + '</div>';
    };
    ui.tableBody.innerHTML = col('mul', T.TABLE_ICONS[G.tableN] + ' Bảng nhân ' + G.tableN) + col('div', T.TABLE_ICONS[G.tableN] + ' Bảng chia ' + G.tableN);
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
    Voice.say('Bảng nhân ' + n, { queue: false });
    rows.forEach(function (r, i) {
      Voice.say(T.speakEq(r.mul), {
        queue: true, rate: 0.95,
        onstart: function () { if (G.reading && G.tableN === n) highlightRow('mul', i, true); },
        onend: function () { highlightRow('mul', i, false); if (i === rows.length - 1) G.reading = false; }
      });
    });
  }

  /* ================= ĐẦU VÀO ================= */
  function onCanvasDown(e) {
    Sfx.unlock();
    if (G.state !== 'playing') return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const live = liveMeteors();
    let best = null, bd = Infinity;
    for (let i = 0; i < live.length; i++) {
      const m = live[i];
      const dx = m.x - e.clientX, dy = m.y - e.clientY;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < m.r * 1.5 && d < bd) { best = m; bd = d; }
    }
    if (best && best.id !== G.targetId) {
      G.targetId = best.id;
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
    canvas.addEventListener('pointerdown', onCanvasDown);
    ui.numpad.addEventListener('pointerdown', function (e) {
      const b = e.target.closest ? e.target.closest('button[data-key]') : null;
      if (!b) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      Sfx.unlock();
      if (e.cancelable) e.preventDefault();
      onKey(b.getAttribute('data-key'));
    });
    // Chặn cuộn/zoom của Safari khi thao tác trên canvas / bàn phím
    document.addEventListener('touchmove', function (e) { if ((e.target === canvas || ui.numpad.contains(e.target)) && e.cancelable) e.preventDefault(); }, { passive: false });
    document.addEventListener('touchstart', function (e) { if (e.target === canvas && e.cancelable) e.preventDefault(); }, { passive: false });
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    document.addEventListener('dblclick', function (e) { if (e.target === canvas || ui.numpad.contains(e.target)) e.preventDefault(); });
    document.addEventListener('contextmenu', function (e) { if (e.target === canvas) e.preventDefault(); });
    // Mở khóa âm thanh ở mọi thao tác chạm đầu tiên (kể cả nút bấm)
    document.addEventListener('pointerdown', function () { Sfx.unlock(); }, true);
    document.addEventListener('keydown', function (e) {
      if (e.target === ui.nameInput) return;
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (G.state === 'playing') pauseGame(); else if (G.state === 'paused') resumeGame();
        return;
      }
      if (G.state !== 'playing') return;
      if (/^[0-9]$/.test(e.key)) { onKey(e.key); e.preventDefault(); }
      else if (e.key === 'Backspace' || e.key === 'Delete') { onKey('del'); e.preventDefault(); }
      else if (e.key === 'Enter' || e.key === ' ') { onKey('fire'); e.preventDefault(); }
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
      { key: 'voice', on: '🗣️ Đọc phép tính: Bật', off: '🗣️ Đọc phép tính: Tắt' }
    ];
    const boxes = document.querySelectorAll('[data-audio-toggles]');
    for (let i = 0; i < boxes.length; i++) {
      boxes[i].innerHTML = defs.map(function (d) {
        const noVoice = d.key === 'voice' && !Voice.available;
        const on = Store.data[d.key] !== false && !noVoice;
        let label = on ? d.on : d.off;
        if (noVoice) label = '🗣️ Đọc phép tính: chưa có giọng Việt';
        return '<button type="button" class="toggle ' + (on ? 'on' : 'off') + '" data-set="' + d.key + '"' +
          (noVoice ? ' disabled' : '') + '>' + label + '</button>';
      }).join('');
    }
  }

  function bindUi() {
    click('btn-play', function () { goLevels(); });
    click('btn-tables', function () { goTables(); });
    click('btn-tables-back', function () { goMenu(); });
    click('btn-tables-read', function () { readTable(); });
    click('btn-howto', function () { ui.howto.classList.remove('hidden'); });
    click('btn-levels-howto', function () { ui.howto.classList.remove('hidden'); });
    click('btn-howto-close', function () { ui.howto.classList.add('hidden'); });
    document.addEventListener('click', function (e) {
      const b = e.target.closest ? e.target.closest('.toggle[data-set]') : null;
      if (!b || b.disabled) return;
      const k = b.getAttribute('data-set');
      Sfx.unlock();
      Store.data[k] = !(Store.data[k] !== false);
      Store.save();
      applyAudioSettings();
      renderAudioToggles();
      if (Store.data[k] !== false) {
        if (k === 'sound') Sfx.play('correct');
        if (k === 'voice') Voice.say('Xin chào! Cùng học bảng cửu chương nào!');
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
    click('btn-other-level', function () { goLevels(); });
    click('btn-home', function () { goMenu(); });
    click('btn-save-name', function () { saveName(); });
    ui.nameInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') saveName(); });
    ui.nameChips.addEventListener('click', function (e) {
      const b = e.target.closest('button[data-name]');
      if (b) { ui.nameInput.value = b.getAttribute('data-name'); saveName(); }
    });
    ui.reviewChips.addEventListener('click', function (e) {
      const s = e.target.closest('span[data-i]');
      if (!s) return;
      const r = G.review[Number(s.getAttribute('data-i'))];
      if (r) { Sfx.unlock(); Voice.say(r.speechFull); }
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

    ui.levelGrid.addEventListener('click', function (e) {
      const card = e.target.closest('.level-card');
      if (!card) return;
      const lvl = T.levelById(card.getAttribute('data-id'));
      if (!lvl) return;
      Sfx.unlock(); Sfx.play('click');
      startGame(lvl);
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
    if (!G.bg || frame.tick % 30 === 0) {
      const w = app.clientWidth, h = app.clientHeight;
      if (!G.bg || (w && h && (w !== G.W || h !== G.H))) resize();
    }
    if (!G.bg) return;
    const t0 = performance.now();
    update(dt);
    const t1 = performance.now();
    render();
    const t2 = performance.now();
    const p = G.perf;
    p.n++; p.update += t1 - t0; p.render += t2 - t1;
    if (p.n >= 60) { p.avgUpdate = p.update / p.n; p.avgRender = p.render / p.n; p.n = 0; p.update = 0; p.render = 0; }
  }

  function boot() {
    Store.load();
    G.duration = [60, 90, 120].indexOf(Number(Store.data.duration)) >= 0 ? Number(Store.data.duration) : 90;
    G.op = ['mul', 'div', 'mix'].indexOf(Store.data.op) >= 0 ? Store.data.op : 'mix';
    Voice.init();
    applyAudioSettings();
    renderAudioToggles();
    setTimeout(renderAudioToggles, 1200);
    setTimeout(renderAudioToggles, 3600);
    Music.play('menu');
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
  window.__CuuChuong = { G: G, Store: Store, startGame: startGame, fire: fire, typeDigit: typeDigit, delDigit: delDigit, endGame: endGame, spawnMeteor: spawnMeteor, liveMeteors: liveMeteors, getTarget: getTarget, update: update, render: render, layout: layout };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
