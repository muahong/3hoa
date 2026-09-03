/* ============================================================
   game.js – Bộ máy trò chơi Xe Tăng Thời Gian
   - Canvas 2D, vòng lặp requestAnimationFrame theo thời gian thực (dt)
   - Robot mang bảng đáp án (chữ hoặc đồng hồ) tiến về phía xe tăng
   - Chạm vào robot có đáp án đúng để bắn; sai 2 lần thì đáp án được đánh dấu
   - Luồng mỗi màn: bài học → bắn robot → hỏi đáp → mở khóa màn sau
   ============================================================ */
(function () {
  'use strict';

  const C = window.Clock, L = window.Levels, Sfx = window.Sfx, Music = window.Music, Voice = window.Voice;
  const rnd = C.rnd, chance = C.chance, pick = C.pick, shuffle = C.shuffle;
  const TAU = Math.PI * 2;
  const FONT = C.FONT;
  const $ = function (id) { return document.getElementById(id); };
  const clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  const PRAISE = ['Chính xác!', 'Tuyệt vời!', 'Giỏi quá!', 'Đúng rồi!', 'Xuất sắc!', 'Siêu đỉnh!', 'Hay lắm!', 'Bắn trúng!'];
  const MAX_HEARTS = 3;
  const MAX_PARTS = 400;
  const SHELL_T = 0.34;          // giây đạn bay tới mục tiêu
  const HINT_POINTS = 20;        // điểm khi bắn robot đã được đánh dấu đáp án
  const QUIZ_N = 4;              // số câu hỏi đáp mỗi màn
  const QUIZ_PASS = 3;           // số câu đúng để mở khóa màn sau
  const OPT_COLORS = ['#ff6b35', '#118ab2', '#7b5ea7', '#06d6a0', '#ef476f'];

  /* ================= LƯU TRỮ (localStorage) ================= */
  const Store = {
    key: 'xe-tang-thoi-gian-v1',
    data: { sound: true, music: true, voice: true, progress: {}, unlockAll: false },
    load() {
      try {
        const raw = localStorage.getItem(this.key);
        if (raw) {
          const d = JSON.parse(raw);
          if (d && typeof d === 'object') Object.assign(this.data, d);
        }
      } catch (e) { /* bỏ qua */ }
      if (!this.data.progress || typeof this.data.progress !== 'object') this.data.progress = {};
    },
    save() {
      try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* bỏ qua */ }
    },
    prog(id) {
      return this.data.progress[id] || { best: 0, stars: 0, passed: false, plays: 0, quizBest: 0 };
    },
    setProg(id, p) {
      this.data.progress[id] = p;
      this.save();
    },
    isUnlocked(level) {
      if (this.data.unlockAll) return true;
      const prev = L.prev(level);
      if (!prev) return true;
      return !!this.prog(prev.id).passed;
    }
  };

  /* ================= TRẠNG THÁI ================= */
  const G = {
    W: 0, H: 0, dpr: 1,
    state: 'menu',            // menu | levels | lesson | countdown | playing | paused | over | quiz
    level: null,
    anim: 0, time: 0,
    field: { x: 0, y: 0, w: 0, h: 0 },
    horizon: 0, lineY: 0, spawnY: 0,
    tank: { x: 0, y: 0, angle: -Math.PI / 2, recoil: 0, vx: 0, targetX: null, trackPh: 0, size: 60, hit: 0 },
    robots: [], shells: [], parts: [], texts: [], clouds: [],
    bg: null, shake: 0, flash: null,
    score: 0, hearts: MAX_HEARTS, streak: 0, bestStreak: 0, correct: 0, wrong: 0,
    qIndex: 0, qTotal: 8, q: null, qWrongs: 0, hint: false, retry: false, qBorn: 0,
    phase: 'idle',            // idle | ask | wait
    phaseT: 0, idSeq: 0, selected: -1, review: [], endReason: '', overAt: -1, resultShown: false,
    hud: { score: -1, hearts: -1, progress: '', mult: -1 },
    cdTimer: 0, wakeLock: null, attractT: 1.5,
    lessonMode: 'play', lessonClock: { h: 3, m: 0, fh: 3, fm: 0, t: 1 }, lessonEx: 0,
    quiz: { items: [], i: 0, correct: 0, answered: false, level: null },
    perf: { n: 0, update: 0, render: 0, avgUpdate: 0, avgRender: 0 }
  };

  /* ================= DOM ================= */
  const app = $('app');
  const canvas = $('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  const ui = {
    hud: $('hud'), menu: $('menu'), levels: $('levels'), lesson: $('lesson'), howto: $('howto'), parent: $('parent'),
    countdown: $('countdown'), pause: $('pause'), gameover: $('gameover'), quiz: $('quiz'), toast: $('toast'),
    score: $('hud-score'), progress: $('hud-progress'), combo: $('hud-combo'), prompt: $('hud-prompt'),
    promptVisual: $('prompt-visual'), promptText: $('prompt-text'), hearts: $('hud-hearts'), hint: $('hud-hint'),
    countNum: $('count-num'), levelGrid: $('level-grid'),
    lessonTitle: $('lesson-title'), lessonIntro: $('lesson-intro'), lessonClock: $('lesson-clock'), lessonClockLabel: $('lesson-clock-label'),
    lessonExamples: $('lesson-examples'), lessonPoints: $('lesson-points'), btnLessonPlay: $('btn-lesson-play'), btnLessonQuiz: $('btn-lesson-quiz'),
    resultTitle: $('result-title'), resultLevel: $('result-level'), resultScore: $('result-score'),
    resultStars: $('result-stars'), resultRecord: $('result-record'),
    stCorrect: $('st-correct'), stWrong: $('st-wrong'), stCombo: $('st-combo'), stAcc: $('st-acc'),
    review: $('review'), reviewChips: $('review-chips'), btnQuiz: $('btn-quiz'), btnAgain: $('btn-again'),
    quizBody: $('quiz-body'), quizDone: $('quiz-done'), quizProgress: $('quiz-progress'), quizTag: $('quiz-tag'),
    quizVisual: $('quiz-visual'), quizQ: $('quiz-q'), quizOpts: $('quiz-opts'), quizExplain: $('quiz-explain'), btnQuizNext: $('btn-quiz-next'),
    quizDoneTitle: $('quiz-done-title'), quizScore: $('quiz-score'), quizDoneMsg: $('quiz-done-msg'),
    btnQuizNextLevel: $('btn-quiz-next-level'), btnQuizReview: $('btn-quiz-review'), btnQuizRetry: $('btn-quiz-retry'),
    parentGate: $('parent-gate'), parentBody: $('parent-body'), parentQ: $('parent-q'), parentInput: $('parent-input'),
    ipadTip: $('ipad-tip')
  };
  const SCREENS = ['menu', 'levels', 'lesson', 'countdown', 'pause', 'gameover', 'quiz'];

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
  function inGame() { return G.state === 'countdown' || G.state === 'playing' || G.state === 'paused' || G.state === 'over'; }

  /** Vẽ đồng hồ/đồng hồ điện tử vào một canvas DOM (dùng cho HUD, bài học, hỏi đáp). */
  function paintClockCanvas(cv, h, m, opts) {
    const cssW = cv.clientWidth || Number(cv.getAttribute('width')) || 120;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const px = Math.round(cssW * dpr);
    if (cv.width !== px || cv.height !== px) { cv.width = px; cv.height = px; }
    const c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, cssW, cssW);
    C.drawClock(c, cssW / 2, cssW / 2, cssW * 0.46, h, m, Object.assign({ minuteTicks: true, numbers: 'all' }, opts || {}));
  }

  /** Dựng phần hình minh họa (đồng hồ kim / điện tử / buổi) cho câu hỏi vào một phần tử DOM. */
  function buildVisual(el, prompt, big) {
    el.innerHTML = '';
    let any = false;
    if (prompt.session) {
      const s = document.createElement('div');
      s.className = 'session';
      s.textContent = C.SESSION_ICON[prompt.session] || '🕒';
      s.title = 'Buổi ' + prompt.session;
      el.appendChild(s);
      any = true;
    }
    (prompt.clocks || []).forEach(function (t, i) {
      if (i > 0 && prompt.arrow) {
        const a = document.createElement('div');
        a.className = 'arrow';
        a.textContent = '→';
        el.appendChild(a);
      }
      const cv = document.createElement('canvas');
      el.appendChild(cv);
      cv.setAttribute('width', big ? 150 : 108);
      cv.setAttribute('height', big ? 150 : 108);
      requestAnimationFrame(function () { paintClockCanvas(cv, t.h, t.m, { hideHour: !!prompt.hideHour }); });
      any = true;
    });
    if (prompt.digital) {
      const d = document.createElement('div');
      d.className = 'digital';
      d.textContent = prompt.digital;
      el.appendChild(d);
      any = true;
    }
    el.hidden = !any;
    return any;
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
    layout();
    initClouds();
    if (G.state === 'lesson') paintLessonClock(true);
  }

  function layout() {
    const W = G.W, H = G.H;
    G.field = { x: 0, y: 0, w: W, h: H };
    G.horizon = H * 0.3;
    const size = clamp(Math.min(W, H) * 0.11, 44, 78);
    G.tank.size = size;
    G.tank.y = H - size * 1.05 - Math.max(8, H * 0.03);
    if (G.tank.x === 0 || G.tank.x > W) G.tank.x = W / 2;
    G.tank.x = clamp(G.tank.x, size, W - size);
    G.lineY = G.tank.y - size * 1.6;
    G.spawnY = H * 0.32;
    if (inGame()) {
      try { G.spawnY = Math.max(H * 0.22, ui.prompt.getBoundingClientRect().bottom + 16); } catch (e) { /* bỏ qua */ }
    }
    buildBackground();
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

  function flower(c, x, y, s, color) {
    c.strokeStyle = '#3f9d3a';
    c.lineWidth = Math.max(1.5, s * 0.16);
    c.beginPath(); c.moveTo(x, y + s * 0.4); c.lineTo(x, y + s * 2); c.stroke();
    c.fillStyle = color;
    for (let i = 0; i < 5; i++) {
      const a = i * TAU / 5 - Math.PI / 2;
      c.beginPath(); c.arc(x + Math.cos(a) * s * 0.55, y + Math.sin(a) * s * 0.55, s * 0.4, 0, TAU); c.fill();
    }
    c.fillStyle = '#ffd94a';
    c.beginPath(); c.arc(x, y, s * 0.32, 0, TAU); c.fill();
  }

  /** Tháp đồng hồ ở chân trời (mặt đồng hồ được vẽ động theo giờ thật). */
  function clockTower(c, x, baseY, s) {
    c.fillStyle = '#e9d8b4';
    c.fillRect(x - s * 0.5, baseY - s * 3.2, s, s * 3.2);
    c.fillStyle = '#c9b48c';
    c.fillRect(x - s * 0.5, baseY - s * 3.2, s * 0.14, s * 3.2);
    c.fillStyle = '#b5563b';
    c.beginPath(); c.moveTo(x - s * 0.65, baseY - s * 3.2); c.lineTo(x, baseY - s * 4.1); c.lineTo(x + s * 0.65, baseY - s * 3.2); c.closePath(); c.fill();
    c.fillStyle = '#ffd166';
    c.beginPath(); c.arc(x, baseY - s * 4.1, s * 0.09, 0, TAU); c.fill();
    for (let i = 0; i < 3; i++) {
      c.fillStyle = '#7a6a4c';
      c.fillRect(x - s * 0.12, baseY - s * (1.2 + i * 0.55), s * 0.24, s * 0.35);
    }
  }

  /** Nền tĩnh: bầu trời, đồi xa, tháp đồng hồ, cánh đồng và các vạch phối cảnh (vẽ 1 lần). */
  function buildBackground() {
    const W = G.W, H = G.H, hz = G.horizon;
    if (!W || !H) return;
    G.bg = layer(function (c) {
      const g = c.createLinearGradient(0, 0, 0, hz);
      g.addColorStop(0, '#5cc6ff');
      g.addColorStop(1, '#cdefff');
      c.fillStyle = g;
      c.fillRect(0, 0, W, hz + 2);
      // Mặt trời
      const sg = c.createRadialGradient(W * 0.82, hz * 0.4, 0, W * 0.82, hz * 0.4, hz * 0.55);
      sg.addColorStop(0, 'rgba(255,240,150,0.95)');
      sg.addColorStop(0.35, 'rgba(255,225,100,0.6)');
      sg.addColorStop(1, 'rgba(255,225,100,0)');
      c.fillStyle = sg;
      c.beginPath(); c.arc(W * 0.82, hz * 0.4, hz * 0.55, 0, TAU); c.fill();
      // Đồi xa
      c.fillStyle = '#8fd694';
      c.beginPath();
      c.moveTo(0, hz);
      const rand = seededRand(11);
      for (let x = 0; x <= W; x += W / 8) c.lineTo(x, hz - hz * (0.12 + rand() * 0.22));
      c.lineTo(W, hz); c.closePath(); c.fill();
      c.fillStyle = '#6cc26f';
      c.beginPath();
      c.moveTo(0, hz);
      for (let x = 0; x <= W; x += W / 5) c.lineTo(x, hz - hz * (0.05 + rand() * 0.14));
      c.lineTo(W, hz); c.closePath(); c.fill();
      // Tháp đồng hồ + cây
      const ts = clamp(hz * 0.32, 26, 70);
      clockTower(c, W * 0.2, hz + 2, ts);
      tree(c, W * 0.06, hz + 2, ts * 1.1);
      tree(c, W * 0.34, hz + 2, ts * 0.8);
      tree(c, W * 0.6, hz + 2, ts * 0.9);
      tree(c, W * 0.93, hz + 2, ts * 1.0);
      tree(c, W * 0.76, hz + 2, ts * 0.7);
      // Cánh đồng
      const fg = c.createLinearGradient(0, hz, 0, H);
      fg.addColorStop(0, '#79c96b');
      fg.addColorStop(0.5, '#5fb455');
      fg.addColorStop(1, '#3f9c3a');
      c.fillStyle = fg;
      c.fillRect(0, hz, W, H - hz);
      // Dải phối cảnh
      c.fillStyle = 'rgba(255,255,255,0.06)';
      let y = hz, step = 14;
      let k = 0;
      while (y < H) {
        if (k % 2 === 0) c.fillRect(0, y, W, step);
        y += step; step *= 1.18; k++;
      }
      // Đường mòn giữa sân
      c.fillStyle = 'rgba(205,170,110,0.35)';
      c.beginPath();
      c.moveTo(W * 0.46, hz); c.lineTo(W * 0.54, hz); c.lineTo(W * 0.68, H); c.lineTo(W * 0.32, H); c.closePath(); c.fill();
      // Hoa nhỏ hai bên
      const rand2 = seededRand(5);
      const cols = ['#ff6fa5', '#ffffff', '#ffa94d', '#ffe66d'];
      for (let i = 0; i < 26; i++) {
        const fx = W * rand2(), fy = hz + (H - hz) * (0.15 + rand2() * 0.8);
        if (Math.abs(fx - W / 2) < W * 0.16) continue;
        const s = 3 + (fy - hz) / (H - hz) * 6;
        flower(c, fx, fy, s, cols[i % 4]);
      }
      // Ba bông hoa lớn (3hoa) góc trái dưới
      const s3 = clamp(W * 0.014, 7, 13);
      flower(c, s3 * 3, H - s3 * 4, s3, '#ff6fa5');
      flower(c, s3 * 6.5, H - s3 * 4.6, s3 * 1.2, '#ffffff');
      flower(c, s3 * 10, H - s3 * 4, s3, '#ffa94d');
    });
  }

  function initClouds() {
    G.clouds = [];
    for (let i = 0; i < 5; i++) {
      G.clouds.push({ x: Math.random() * G.W, y: G.horizon * (0.1 + Math.random() * 0.5), s: 20 + Math.random() * 30, v: 6 + Math.random() * 10 });
    }
  }

  /* ================= THỰC THỂ ================= */
  function Robot(o) {
    this.id = ++G.idSeq;
    this.opt = null; this.idx = 0;
    this.x = 0; this.y = 0; this.x0 = 0; this.vy = 0;
    this.w = 120; this.h = 70; this.clock = false;
    this.ph = Math.random() * TAU;
    this.state = 'in';          // in | live | wrong | dying | flee
    this.t = 0; this.scale = 0.2; this.alpha = 1;
    this.hint = false; this.dead = false; this.showTime = null;
    for (const k in o) this[k] = o[k];
  }

  function addText(text, x, y, o) {
    const t = { text: text, x: x, y: y, vy: -55, life: 1.1, max: 1.1, size: G.tank.size * 0.6, color: '#fff', stroke: 'rgba(10,15,40,0.9)', t: 0 };
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
        color: pick(['#6b6b7a', '#8c8c9c', '#5a5a6a']), life: 0.5 + Math.random() * 0.4, max: 0.9 });
    }
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * TAU, sp = 90 + Math.random() * 200;
      addPart({ kind: 'gear', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, size: r * (0.14 + Math.random() * 0.14),
        rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 12, color: pick(['#9aa2c2', '#5b5f7a', '#ffd166']), life: 0.8 + Math.random() * 0.5, max: 1.3 });
    }
  }

  function spawnSparks(x, y, r, color) {
    for (let i = 0; i < 14; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, sp = 120 + Math.random() * 260;
      addPart({ kind: 'spark', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size: r * (0.04 + Math.random() * 0.05),
        color: color || pick(['#ffffff', '#ffe66d', '#ff9f1c']), life: 0.25 + Math.random() * 0.3, max: 0.55 });
    }
  }

  function spawnConfetti(n) {
    const cols = ['#ff6b35', '#ffd166', '#06d6a0', '#118ab2', '#ef476f', '#7b5ea7', '#2ec4b6'];
    for (let i = 0; i < n; i++) {
      addPart({ kind: 'confetti', x: Math.random() * G.W, y: -20 - Math.random() * G.H * 0.5, vx: (Math.random() - 0.5) * 80, vy: 80 + Math.random() * 160,
        size: 6 + Math.random() * 8, color: pick(cols), rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 8, life: 4 + Math.random() * 2, max: 6, sway: Math.random() * TAU });
    }
  }

  /* ================= ROBOT & CÂU HỎI ================= */
  function liveRobots() {
    return G.robots.filter(function (r) { return !r.dead && (r.state === 'in' || r.state === 'live' || r.state === 'wrong'); });
  }

  function fallTime() {
    const lvl = G.level;
    const base = lvl ? lvl.fall : 24;
    const k = 1 - Math.min(0.35, 0.035 * G.qIndex);
    return base * k / (lvl ? lvl.speed : 1);
  }

  /** Kích thước bảng cho các phương án của câu hỏi (bảng chữ rộng, bảng đồng hồ vuông). */
  function boardSize(q) {
    const f = G.field, n = q.options.length;
    const isClock = q.options.some(function (o) { return o.clock; });
    const s = G.tank.size;
    if (isClock) {
      const d = clamp(Math.min(f.w / (n + 0.6), s * 2.4, f.h * 0.2), 84, 150);
      return { w: d, h: d, clock: true, cols: n };
    }
    let longest = 0;
    q.options.forEach(function (o) { longest = Math.max(longest, o.label.length); });
    let w = clamp(s * (1.9 + longest * 0.06), 118, 230);
    let cols = n;
    if (n * (w + 12) > f.w - 16) { cols = 2; w = clamp(Math.min(w, (f.w - 40) / 2), 118, 230); }
    return { w: w, h: clamp(w * 0.5, 62, 96), clock: false, cols: cols };
  }

  function spawnRobots(q) {
    const f = G.field;
    const bs = boardSize(q);
    const n = q.options.length;
    const cols = bs.cols, rows = Math.ceil(n / cols);
    const cellW = f.w / cols;
    const rowGap = bs.h + G.tank.size * 1.15;
    const base = G.spawnY + bs.h / 2 + G.tank.size * 0.7;
    const lowest = base + (rows - 1) * rowGap;
    const vy = Math.max(6, (G.lineY - lowest - bs.h / 2) / fallTime());
    for (let i = 0; i < n; i++) {
      const col = i % cols, row = Math.floor(i / cols);
      const x = f.x + cellW * (col + 0.5) + (rows > 1 ? 0 : (Math.random() - 0.5) * cellW * 0.15);
      // Hàng đầu (row 0) ở xa hơn = cao hơn trên màn hình; hàng sau gần xe tăng hơn
      const y = base + row * rowGap;
      const r = new Robot({ opt: q.options[i], idx: i, x: x, x0: x, y: y, vy: vy, w: bs.w, h: bs.h, clock: bs.clock, t: 0 });
      G.robots.push(r);
    }
    if (G.state === 'playing') Sfx.play('spawn');
  }

  function nextQuestion(sameQ) {
    const q = sameQ || G.level.gen();
    G.q = q;
    G.qWrongs = 0;
    G.hint = false;
    G.retry = !!sameQ;
    G.qBorn = G.time;
    G.selected = -1;
    if (sameQ) q.options = shuffle(q.options.slice());
    spawnRobots(q);
    G.phase = 'ask';
    renderPrompt(true);
    Sfx.play('question');
    Voice.say(q.prompt.speech);
  }

  /* ================= THẺ CÂU HỎI (HUD) ================= */
  function renderPrompt(pop) {
    const q = G.q;
    if (!q) {
      ui.promptText.textContent = G.state === 'playing' ? 'Sẵn sàng…' : '…';
      ui.promptVisual.hidden = true;
      ui.promptVisual.innerHTML = '';
      return;
    }
    ui.promptText.textContent = q.prompt.text;
    buildVisual(ui.promptVisual, q.prompt, false);
    if (pop) {
      ui.prompt.classList.remove('ok', 'shake', 'pop');
      void ui.prompt.offsetWidth;
      ui.prompt.classList.add('pop');
    }
    // Bố cục có thể đổi chiều cao thẻ → cập nhật vị trí xuất hiện của robot
    setTimeout(function () { if (inGame()) { try { G.spawnY = Math.max(G.H * 0.22, ui.prompt.getBoundingClientRect().bottom + 16); } catch (e) { /* bỏ qua */ } } }, 50);
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
    ui.prompt.classList.remove('ok', 'shake', 'pop');
    void ui.prompt.offsetWidth;
    ui.prompt.classList.add(cls);
    clearTimeout(cardFx._t);
    cardFx._t = setTimeout(function () { ui.prompt.classList.remove('ok', 'shake'); }, 600);
  }

  /* ================= BẮN ================= */
  function multiplier() { return 1 + Math.min(3, Math.floor(G.streak / 3)); }

  function noteReview(q) {
    if (!q) return;
    if (G.review.some(function (r) { return r.key === q.key; })) return;
    if (G.review.length >= 8) return;
    G.review.push({ key: q.key, q: q, text: q.answer.label, speech: q.answer.speech, prompt: q.prompt.text });
  }

  function muzzle() {
    const t = G.tank, s = t.size;
    const len = s * 0.95 - t.recoil * s * 0.25;
    return { x: t.x + Math.cos(t.angle) * len, y: t.y - s * 0.25 + Math.sin(t.angle) * len };
  }

  function fireAt(robot) {
    if (G.state !== 'playing' || G.phase !== 'ask') return;
    if (!robot || robot.dead || robot.state === 'dying' || robot.state === 'flee') return;
    if (robot.state === 'wrong') { Sfx.play('target'); showHint('Bảng này sai rồi, chọn bảng khác nhé!', 'info', 1400); return; }
    if (G.shells.some(function (s) { return s.robot === robot; })) return;
    const t = G.tank;
    t.angle = Math.atan2(robot.y - (t.y - t.size * 0.25), robot.x - t.x);
    t.recoil = 1;
    const m = muzzle();
    G.shells.push({ x0: m.x, y0: m.y, x: m.x, y: m.y, x1: robot.x, y1: robot.y, t: 0, dur: SHELL_T, robot: robot, trail: [] });
    G.shake = Math.max(G.shake, 0.18);
    Sfx.play('shot');
    spawnSparks(m.x, m.y, t.size, '#ffe66d');
  }

  function resolveShell(sh) {
    const r = sh.robot;
    if (!r || r.dead || G.state !== 'playing' || G.phase !== 'ask') return;
    if (r.state === 'dying' || r.state === 'flee' || r.state === 'wrong') return;
    if (r.opt.ok) onHit(r); else onWrong(r);
  }

  function destroyRobot(r, big) {
    if (r.dead || r.state === 'dying') return;
    r.state = 'dying';
    r.t = 0;
    spawnExplosion(r.x, r.y, Math.max(r.w, r.h) * 0.5, big);
    if (G.state !== 'playing') return;
    Sfx.play('explode');
    G.shake = Math.max(G.shake, big ? 0.7 : 0.4);
  }

  function fleeOthers(except) {
    G.robots.forEach(function (r) {
      if (r === except || r.dead || r.state === 'dying') return;
      r.state = 'flee';
      r.t = 0;
    });
  }

  function onHit(r) {
    const q = G.q;
    destroyRobot(r, false);
    fleeOthers(r);
    G.correct++;
    G.qIndex++;
    let pts;
    if (G.hint) {
      pts = HINT_POINTS;
      addText('Nhớ nhé: ' + q.answer.label, r.x, r.y - r.h * 0.9, { color: '#ffe066', size: G.tank.size * 0.5, life: 1.5 });
      Voice.say('Đúng rồi. ' + q.answer.speech);
    } else {
      if (!G.retry) {
        G.streak++;
        if (G.streak > G.bestStreak) G.bestStreak = G.streak;
      }
      const age = G.time - G.qBorn;
      const mult = multiplier();
      const speedBonus = age < 5 ? 50 : age < 9 ? 25 : 0;
      pts = 100 * mult + speedBonus;
      const praise = G.streak > 0 && G.streak % 3 === 0 && mult > 1 ? 'Combo x' + mult + '!' : pick(PRAISE);
      addText(praise, r.x, r.y - r.h * 0.9, { color: praise.indexOf('Combo') === 0 ? '#ff9f1c' : '#7bf1a8', size: G.tank.size * 0.75, life: 1.2 });
      if (praise.indexOf('Combo') === 0) { Sfx.play('combo'); Voice.say('Combo nhân ' + mult + '! ' + q.answer.speech); }
      else { Sfx.play('correct'); Voice.say(praise + ' ' + q.answer.speech); }
    }
    G.score += pts;
    addText('+' + pts, r.x, r.y - r.h * 0.2, { color: '#ffe066', size: G.tank.size * 0.7, life: 1.0 });
    showHint(q.answer.label + ' ✓', 'ok', 1800);
    cardFx('ok');
    G.flash = { c: '120,255,180', a: 0.14 };
    G.phase = 'wait';
    G.phaseT = 1.15;
  }

  function onWrong(r) {
    const q = G.q;
    G.wrong++;
    G.streak = 0;
    G.qWrongs++;
    r.state = 'wrong';
    r.t = 0;
    cardFx('shake');
    G.flash = { c: '255,60,90', a: 0.22 };
    Sfx.play('ricochet');
    spawnSparks(r.x, r.y + r.h * 0.4, r.w * 0.5);
    addText('✗', r.x, r.y - r.h * 0.9, { color: '#ff5c7a', size: G.tank.size * 0.9, life: 1.0 });
    noteReview(q);
    if (G.qWrongs >= 2 && !G.hint) {
      G.hint = true;
      G.robots.forEach(function (rb) { if (rb.opt && rb.opt.ok && !rb.dead) rb.hint = true; });
      showHint('Đáp án: ' + q.answer.label + ' – bắn bảng có vòng vàng nhé!', 'info', 3200);
      Voice.say('Đáp án là ' + q.answer.speech + '. Bắn bảng có vòng vàng nhé!');
      Sfx.play('hint');
    } else {
      showHint(r.opt.clock ? r.opt.speech + '. Thử lại nhé!' : 'Sai rồi, thử lại nhé!', 'bad', 1800);
      Voice.say(r.opt.clock ? r.opt.speech + '. Thử lại nhé!' : 'Sai rồi! Thử lại nhé.');
    }
  }

  function loseHeart() {
    G.hearts = Math.max(0, G.hearts - 1);
    ui.hearts.classList.remove('hit');
    void ui.hearts.offsetWidth;
    ui.hearts.classList.add('hit');
    if (G.hearts <= 0) endGame('nolife');
  }

  /** Robot chạm tới xe tăng. */
  function onBreach(r) {
    const q = G.q;
    G.robots.forEach(function (rb) { if (!rb.dead && rb.state !== 'dying') { rb.state = 'flee'; rb.t = 0; } });
    G.tank.hit = 1;
    spawnExplosion(G.tank.x, G.tank.y - G.tank.size * 0.3, G.tank.size, true);
    if (G.state !== 'playing') return;
    G.shake = 1;
    G.flash = { c: '255,255,255', a: 0.6 };
    Sfx.play('breach');
    G.wrong++;
    G.streak = 0;
    addText('BÙM!', G.tank.x, G.tank.y - G.tank.size * 1.4, { color: '#ffb703', size: G.tank.size * 1.1, life: 1.2 });
    showHint('Đáp án: ' + q.answer.label, 'bad', 2600);
    Voice.say('Ối! ' + q.answer.speech);
    noteReview(q);
    loseHeart();
    if (G.state === 'playing') {
      G.phase = 'wait';
      G.phaseT = 1.7;
      G.pendingRetry = q;
    }
  }

  /* ================= CẬP NHẬT ================= */
  function updateRobots(dt) {
    const arr = G.robots;
    let w = 0;
    for (let i = 0; i < arr.length; i++) {
      const r = arr[i];
      if (r.dead) continue;
      r.t += dt;
      r.ph += dt;
      if (r.state === 'in') {
        r.scale = Math.min(1, r.scale + dt * 3.2);
        if (r.scale >= 1) r.state = 'live';
      } else if (r.state === 'dying') {
        r.scale = Math.max(0.01, 1 - r.t / 0.3);
        if (r.t >= 0.3) { r.dead = true; continue; }
        arr[w++] = r;
        continue;
      } else if (r.state === 'flee') {
        r.y -= (300 + r.t * 900) * dt;
        r.alpha = Math.max(0, 1 - r.t / 0.6);
        if (r.t >= 0.65 || r.y < -r.h * 2) { r.dead = true; continue; }
        arr[w++] = r;
        continue;
      }
      if (G.state === 'playing' && G.phase === 'ask') {
        r.y += r.vy * dt;
        r.x = r.x0 + Math.sin(r.ph * 1.3 + r.idx) * G.tank.size * 0.12;
        if (r.y + r.h * 0.5 >= G.lineY) { onBreach(r); arr[w++] = r; continue; }
      } else if (G.state !== 'playing') {
        r.x = r.x0 + Math.sin(r.ph * 0.8 + r.idx) * G.tank.size * 0.4;
        r.y += r.vy * dt;
        if (r.y > G.lineY) { r.state = 'flee'; r.t = 0; }
      }
      arr[w++] = r;
    }
    arr.length = w;
  }

  function updateShells(dt) {
    const arr = G.shells;
    let w = 0;
    for (let i = 0; i < arr.length; i++) {
      const s = arr[i];
      s.t += dt;
      const k = Math.min(1, s.t / s.dur);
      const r = s.robot;
      if (r && !r.dead) { s.x1 = r.x; s.y1 = r.y; }
      s.x = s.x0 + (s.x1 - s.x0) * k;
      s.y = s.y0 + (s.y1 - s.y0) * k;
      s.trail.push({ x: s.x, y: s.y });
      if (s.trail.length > 8) s.trail.shift();
      if (k >= 1) { resolveShell(s); continue; }
      arr[w++] = s;
    }
    arr.length = w;
    const t = G.tank;
    if (t.recoil > 0) t.recoil = Math.max(0, t.recoil - dt * 5);
    if (t.hit > 0) t.hit = Math.max(0, t.hit - dt * 2);
  }

  function updateTank(dt) {
    const t = G.tank, s = t.size;
    const maxV = s * 6;
    let ax = 0;
    if (t.targetX != null) {
      const d = t.targetX - t.x;
      if (Math.abs(d) < 3) { t.targetX = null; t.vx *= 0.5; }
      else ax = Math.sign(d) * maxV * 6;
    }
    if (G.keys.left) ax = -maxV * 6;
    if (G.keys.right) ax = maxV * 6;
    if (ax) t.vx = clamp(t.vx + ax * dt, -maxV, maxV); else t.vx *= Math.max(0, 1 - dt * 10);
    t.x += t.vx * dt;
    if (t.x < s) { t.x = s; t.vx = 0; }
    if (t.x > G.W - s) { t.x = G.W - s; t.vx = 0; }
    t.trackPh += t.vx * dt * 0.08;
    if (Math.abs(t.vx) > 20 && Math.random() < dt * 8) Sfx.play('move');
  }

  function updateParts(dt) {
    const g = 700, arr = G.parts;
    let w = 0;
    for (let i = 0; i < arr.length; i++) {
      const p = arr[i];
      p.life -= dt;
      if (p.life <= 0) continue;
      if (p.kind === 'spark' || p.kind === 'gear') {
        p.vy += g * (p.kind === 'spark' ? 0.6 : 1) * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.kind === 'gear') p.rot += p.vr * dt;
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

  function updateClouds(dt) {
    for (let i = 0; i < G.clouds.length; i++) {
      const c = G.clouds[i];
      c.x += c.v * dt;
      if (c.x - c.s * 2.5 > G.W) c.x = -c.s * 2.5;
    }
  }

  function updatePlaying(dt) {
    G.time += dt;
    updateTank(dt);
    updateRobots(dt);
    if (G.state !== 'playing') return;
    if (G.phase === 'wait') {
      G.phaseT -= dt;
      if (G.phaseT <= 0) {
        if (G.qIndex >= G.qTotal) { endGame('done'); return; }
        const again = G.pendingRetry;
        G.pendingRetry = null;
        nextQuestion(again || null);
      }
    } else if (G.phase === 'idle') {
      nextQuestion(null);
    } else if (G.phase === 'ask') {
      // Cảnh báo khi robot sắp tới
      const live = liveRobots();
      let nearest = 0;
      for (let i = 0; i < live.length; i++) nearest = Math.max(nearest, (live[i].y + live[i].h * 0.5 - G.spawnY) / Math.max(1, G.lineY - G.spawnY));
      G.danger = nearest;
      if (nearest > 0.8) {
        const s = Math.floor(G.time * 2);
        if (s !== G.lastWarn) { G.lastWarn = s; Sfx.play('warn'); }
      }
    }
  }

  /** Chế độ "chờ" ở menu: vài robot mang đồng hồ giờ thật lượn qua lại. */
  function updateAttract(dt) {
    G.attractT -= dt;
    if (G.attractT <= 0 && liveRobots().length < 3) {
      G.attractT = 2.5 + Math.random() * 2.5;
      const now = new Date();
      const h = now.getHours() % 12 || 12, m = now.getMinutes();
      const useClock = chance(0.6);
      const opt = useClock ? C.clockOpt({ h: h, m: m }, false) : C.textOpt(C.readTime(h, m, 'plain'), false);
      const d = G.tank.size * 2;
      const r = new Robot({ opt: opt, idx: rnd(0, 3), x: G.W * (0.15 + Math.random() * 0.7), vy: 10 + Math.random() * 8, w: useClock ? d : d * 1.5, h: useClock ? d : d * 0.55, clock: useClock, t: 0 });
      r.x0 = r.x;
      r.y = G.horizon * 0.8 + Math.random() * G.H * 0.2;
      G.robots.push(r);
    }
    updateRobots(dt);
    const t = G.tank;
    t.angle += ((-Math.PI / 2 + Math.sin(G.anim * 0.5) * 0.5) - t.angle) * Math.min(1, dt * 2);
    if (t.recoil > 0) t.recoil = Math.max(0, t.recoil - dt * 5);
  }

  function update(dt) {
    G.anim += dt;
    if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 2.2);
    if (G.flash) { G.flash.a -= dt * 1.6; if (G.flash.a <= 0) G.flash = null; }
    updateClouds(dt);

    if (G.state === 'playing') updatePlaying(dt);
    else if (G.state === 'menu' || G.state === 'levels' || G.state === 'lesson' || G.state === 'quiz') updateAttract(dt);
    else if (G.state === 'over' || G.state === 'countdown') { updateRobots(dt); updateTank(dt); }

    if (G.state !== 'paused') {
      updateShells(dt);
      updateParts(dt);
      updateTexts(dt);
    }
    if (G.state === 'lesson') paintLessonClock(false, dt);
    if (G.state === 'over' && !G.resultShown && G.anim >= G.overAt) showResults();
    syncHud();
  }

  /* ================= VẼ ================= */
  function drawClouds(c) {
    c.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < G.clouds.length; i++) {
      const k = G.clouds[i];
      c.beginPath();
      c.arc(k.x, k.y, k.s, 0, TAU);
      c.arc(k.x + k.s * 0.9, k.y - k.s * 0.3, k.s * 0.8, 0, TAU);
      c.arc(k.x + k.s * 1.8, k.y, k.s * 0.9, 0, TAU);
      c.arc(k.x + k.s * 0.9, k.y + k.s * 0.35, k.s * 0.85, 0, TAU);
      c.fill();
    }
  }

  function drawTowerClock(c) {
    const W = G.W, hz = G.horizon;
    const ts = clamp(hz * 0.32, 26, 70);
    const now = new Date();
    C.drawClock(c, W * 0.2, hz + 2 - ts * 2.55, ts * 0.32, now.getHours() % 12, now.getMinutes(), { minuteTicks: false, numbers: 'none', shadow: false });
  }

  function drawDefenseLine(c) {
    if (!inGame()) return;
    const y = G.lineY;
    const danger = G.state === 'playing' ? (G.danger || 0) : 0;
    c.save();
    c.setLineDash([14, 10]);
    c.lineDashOffset = -G.anim * 30;
    c.lineWidth = 4;
    c.strokeStyle = danger > 0.8 ? 'rgba(255,80,100,' + (0.6 + 0.4 * Math.sin(G.anim * 10)).toFixed(2) + ')' : 'rgba(255,255,255,0.55)';
    c.beginPath(); c.moveTo(0, y); c.lineTo(G.W, y); c.stroke();
    c.setLineDash([]);
    // Cọc tiêu
    for (let x = G.W * 0.08; x < G.W; x += G.W * 0.28) {
      c.fillStyle = '#ff6b35';
      c.beginPath(); c.moveTo(x - 7, y + 2); c.lineTo(x + 7, y + 2); c.lineTo(x, y - 18); c.closePath(); c.fill();
      c.fillStyle = '#fff';
      c.fillRect(x - 4, y - 9, 8, 3);
    }
    c.restore();
  }

  function drawTank(c) {
    const t = G.tank, s = t.size;
    const x = t.x, y = t.y;
    c.save();
    c.translate(x, y);
    // Bóng
    c.fillStyle = 'rgba(0,0,0,0.22)';
    c.beginPath(); c.ellipse(0, s * 0.55, s * 1.25, s * 0.28, 0, 0, TAU); c.fill();
    // Xích
    const trackW = s * 2.3, trackH = s * 0.62;
    c.fillStyle = '#2b2d42';
    C.roundRect(c, -trackW / 2, s * 0.05, trackW, trackH, trackH / 2); c.fill();
    c.fillStyle = '#5b5f7a';
    C.roundRect(c, -trackW / 2 + 4, s * 0.05 + 4, trackW - 8, trackH - 8, trackH / 2); c.fill();
    // Bánh xe (xoay theo chuyển động)
    const nWheel = 4;
    for (let i = 0; i < nWheel; i++) {
      const wx = -trackW / 2 + trackH / 2 + 6 + i * ((trackW - trackH - 12) / (nWheel - 1));
      const wy = s * 0.05 + trackH / 2;
      c.fillStyle = '#9aa2c2';
      c.beginPath(); c.arc(wx, wy, trackH * 0.3, 0, TAU); c.fill();
      c.strokeStyle = '#2b2d42';
      c.lineWidth = 3;
      c.beginPath();
      const a = t.trackPh + i;
      c.moveTo(wx + Math.cos(a) * trackH * 0.25, wy + Math.sin(a) * trackH * 0.25);
      c.lineTo(wx - Math.cos(a) * trackH * 0.25, wy - Math.sin(a) * trackH * 0.25);
      c.stroke();
    }
    // Thân
    const hitTint = t.hit > 0 ? t.hit : 0;
    const bg = c.createLinearGradient(0, -s * 0.4, 0, s * 0.1);
    bg.addColorStop(0, hitTint > 0.3 ? '#ff9a7a' : '#7ed957');
    bg.addColorStop(1, hitTint > 0.3 ? '#c0503a' : '#3f9c3a');
    c.fillStyle = bg;
    c.beginPath();
    c.moveTo(-s * 1.0, s * 0.1); c.lineTo(-s * 0.82, -s * 0.38); c.lineTo(s * 0.82, -s * 0.38); c.lineTo(s * 1.0, s * 0.1); c.closePath();
    c.fill();
    c.strokeStyle = '#256b22'; c.lineWidth = 3; c.stroke();
    // Ba bông hoa nhỏ trên thân
    ['#ff6fa5', '#ffffff', '#ffa94d'].forEach(function (col, i) {
      const fx = -s * 0.62 + i * s * 0.26, fy = -s * 0.14;
      c.fillStyle = col;
      for (let k = 0; k < 5; k++) { const a = k * TAU / 5 - Math.PI / 2; c.beginPath(); c.arc(fx + Math.cos(a) * s * 0.06, fy + Math.sin(a) * s * 0.06, s * 0.045, 0, TAU); c.fill(); }
      c.fillStyle = '#ffd94a';
      c.beginPath(); c.arc(fx, fy, s * 0.035, 0, TAU); c.fill();
    });
    // Nòng pháo (xoay theo góc)
    const ty = -s * 0.25;
    c.save();
    c.translate(0, ty);
    c.rotate(t.angle);
    const rec = t.recoil * s * 0.25;
    c.fillStyle = '#2b2d42';
    C.roundRect(c, s * 0.2 - rec, -s * 0.1, s * 0.8, s * 0.2, s * 0.1); c.fill();
    c.fillStyle = '#5b5f7a';
    C.roundRect(c, s * 0.85 - rec, -s * 0.15, s * 0.22, s * 0.3, s * 0.06); c.fill();
    if (t.recoil > 0.6) {
      c.fillStyle = 'rgba(255,220,80,' + ((t.recoil - 0.6) * 2.5).toFixed(2) + ')';
      c.beginPath(); c.arc(s * 1.1 - rec, 0, s * 0.28 * t.recoil, 0, TAU); c.fill();
    }
    c.restore();
    // Tháp pháo + đồng hồ
    const tg = c.createRadialGradient(-s * 0.1, ty - s * 0.1, s * 0.05, 0, ty, s * 0.5);
    tg.addColorStop(0, '#5cc24a');
    tg.addColorStop(1, '#2e7d32');
    c.fillStyle = tg;
    c.beginPath(); c.arc(0, ty, s * 0.48, 0, TAU); c.fill();
    c.strokeStyle = '#256b22'; c.lineWidth = 3; c.stroke();
    const now = new Date();
    C.drawClock(c, 0, ty, s * 0.34, now.getHours() % 12, now.getMinutes(), { minuteTicks: false, numbers: 'quarter', shadow: false });
    // Ăng-ten
    c.strokeStyle = '#2b2d42'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(-s * 0.5, ty - s * 0.1); c.lineTo(-s * 0.68, ty - s * 0.7); c.stroke();
    c.fillStyle = (Math.sin(G.anim * 6) > 0) ? '#ff6b35' : '#ffb703';
    c.beginPath(); c.arc(-s * 0.69, ty - s * 0.74, s * 0.07, 0, TAU); c.fill();
    c.restore();
  }

  /** Chữ trên bảng: tự co chữ và ngắt tối đa 2 dòng. */
  function fitLines(c, text, maxW, size, weight) {
    const words = String(text).split(' ');
    for (let sz = size; sz >= 10; sz -= 1) {
      c.font = (weight || 800) + ' ' + sz + 'px ' + FONT;
      if (c.measureText(text).width <= maxW) return { lines: [text], size: sz };
      // thử 2 dòng
      let best = null;
      for (let i = 1; i < words.length; i++) {
        const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
        const w = Math.max(c.measureText(a).width, c.measureText(b).width);
        if (w <= maxW && (!best || w < best.w)) best = { lines: [a, b], size: sz, w: w };
      }
      if (best) return best;
    }
    c.font = '800 10px ' + FONT;
    return { lines: [text], size: 10 };
  }

  function drawRobot(c, r) {
    const sc = r.scale, w = r.w * sc, h = r.h * sc;
    const bob = Math.sin(r.ph * 2.2) * G.tank.size * 0.05;
    const x = r.x, y = r.y + bob;
    const isWrong = r.state === 'wrong';
    const col = OPT_COLORS[r.idx % OPT_COLORS.length];
    c.save();
    c.globalAlpha = r.alpha;
    // Bóng dưới đất
    c.fillStyle = 'rgba(0,0,0,0.18)';
    c.beginPath(); c.ellipse(x, r.y + h * 0.5 + G.tank.size * 0.55, w * 0.45, G.tank.size * 0.14, 0, 0, TAU); c.fill();
    // Đầu robot (trên bảng)
    const hr = Math.min(w, h) * 0.26;
    const hy = y - h / 2 - hr * 0.9;
    // Cánh quạt
    c.strokeStyle = 'rgba(43,45,66,0.75)';
    c.lineWidth = Math.max(2, hr * 0.12);
    c.beginPath(); c.moveTo(x, hy - hr * 1.05); c.lineTo(x, hy - hr * 1.45); c.stroke();
    const spin = Math.cos(r.ph * 30);
    c.beginPath(); c.moveTo(x - hr * 1.1 * spin, hy - hr * 1.45); c.lineTo(x + hr * 1.1 * spin, hy - hr * 1.45); c.stroke();
    // Đầu
    c.fillStyle = isWrong ? '#9aa2c2' : '#dfe6f5';
    c.beginPath(); c.arc(x, hy, hr, 0, TAU); c.fill();
    c.strokeStyle = '#2b2d42'; c.lineWidth = Math.max(2, hr * 0.1); c.stroke();
    // Mắt
    c.fillStyle = isWrong ? '#5b5f7a' : col;
    c.beginPath(); c.arc(x - hr * 0.35, hy - hr * 0.05, hr * 0.22, 0, TAU); c.arc(x + hr * 0.35, hy - hr * 0.05, hr * 0.22, 0, TAU); c.fill();
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(x - hr * 0.3, hy - hr * 0.12, hr * 0.08, 0, TAU); c.arc(x + hr * 0.4, hy - hr * 0.12, hr * 0.08, 0, TAU); c.fill();
    // Miệng
    c.strokeStyle = '#2b2d42'; c.lineWidth = Math.max(1.5, hr * 0.08);
    c.beginPath();
    if (isWrong) c.arc(x, hy + hr * 0.55, hr * 0.28, Math.PI * 1.15, Math.PI * 1.85);
    else c.arc(x, hy + hr * 0.25, hr * 0.32, Math.PI * 0.15, Math.PI * 0.85);
    c.stroke();
    // Tay cầm bảng
    c.strokeStyle = '#5b5f7a'; c.lineWidth = Math.max(3, hr * 0.18); c.lineCap = 'round';
    c.beginPath(); c.moveTo(x - hr * 0.8, hy + hr * 0.6); c.lineTo(x - w * 0.35, y - h / 2 + 4); c.stroke();
    c.beginPath(); c.moveTo(x + hr * 0.8, hy + hr * 0.6); c.lineTo(x + w * 0.35, y - h / 2 + 4); c.stroke();
    // Vòng vàng gợi ý
    if (r.hint && !isWrong && r.state !== 'dying') {
      const pr = 1.08 + 0.04 * Math.sin(G.anim * 7);
      c.strokeStyle = 'rgba(255,214,102,0.95)';
      c.lineWidth = Math.max(4, h * 0.08);
      c.setLineDash([h * 0.25, h * 0.14]);
      c.lineDashOffset = -G.anim * 40;
      C.roundRect(c, x - w * pr / 2 - 6, y - h * pr / 2 - 6, w * pr + 12, h * pr + 12, h * 0.3); c.stroke();
      c.setLineDash([]);
    }
    // Khung chọn bằng bàn phím
    if (G.state === 'playing' && G.selected === r.idx && !isWrong) {
      c.strokeStyle = 'rgba(255,255,255,0.9)';
      c.lineWidth = 3;
      c.setLineDash([6, 6]);
      C.roundRect(c, x - w / 2 - 8, y - h / 2 - 8, w + 16, h + 16, h * 0.28); c.stroke();
      c.setLineDash([]);
    }
    // Bảng
    c.shadowColor = 'rgba(0,0,0,0.25)'; c.shadowBlur = 10; c.shadowOffsetY = 4;
    c.fillStyle = isWrong ? '#b9c1d8' : col;
    C.roundRect(c, x - w / 2, y - h / 2, w, h, Math.min(w, h) * 0.22); c.fill();
    c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetY = 0;
    const pad = Math.max(4, Math.min(w, h) * 0.08);
    c.fillStyle = isWrong ? '#e6e9f3' : '#ffffff';
    C.roundRect(c, x - w / 2 + pad, y - h / 2 + pad, w - pad * 2, h - pad * 2, Math.min(w, h) * 0.16); c.fill();
    // Nội dung (bỏ qua khi bảng đang co nhỏ lúc nổ)
    if (r.opt && sc > 0.3) {
      if (r.opt.clock) {
        C.drawClock(c, x, y, Math.max(2, (Math.min(w, h) - pad * 2) * 0.46), r.opt.clock.h, r.opt.clock.m, { shadow: false, alpha: isWrong ? 0.45 : 1 });
      } else if (r.opt.digital) {
        C.drawDigital(c, x, y, Math.max(10, w - pad * 4), Math.max(6, h * 0.55), r.opt.digital, { alpha: isWrong ? 0.45 : 1 });
      } else {
        const fit = fitLines(c, r.opt.label, w - pad * 3.2, Math.round(h * 0.4), 800);
        c.font = '800 ' + fit.size + 'px ' + FONT;
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillStyle = isWrong ? '#98a0bd' : '#2b2d42';
        const lh = fit.size * 1.05;
        fit.lines.forEach(function (ln, i) { c.fillText(ln, x, y + (i - (fit.lines.length - 1) / 2) * lh + fit.size * 0.06); });
      }
      // Số thứ tự (phím tắt)
      if (G.state === 'playing' && !isWrong) {
        c.fillStyle = col;
        c.beginPath(); c.arc(x - w / 2 + pad * 1.6, y - h / 2 + pad * 1.6, Math.max(8, h * 0.13), 0, TAU); c.fill();
        c.font = '800 ' + Math.round(Math.max(10, h * 0.16)) + 'px ' + FONT;
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillStyle = '#fff';
        c.fillText(String(r.idx + 1), x - w / 2 + pad * 1.6, y - h / 2 + pad * 1.6 + 1);
      }
    }
    if (isWrong) {
      c.font = '800 ' + Math.round(h * 0.9) + 'px ' + FONT;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = 'rgba(239,71,111,0.85)';
      c.fillText('✗', x, y + h * 0.05);
    }
    c.restore();
  }

  function drawShells(c) {
    for (let i = 0; i < G.shells.length; i++) {
      const s = G.shells[i];
      c.lineCap = 'round';
      for (let k = 1; k < s.trail.length; k++) {
        const a = k / s.trail.length;
        c.strokeStyle = 'rgba(255,200,80,' + (a * 0.6).toFixed(2) + ')';
        c.lineWidth = 2 + a * 6;
        c.beginPath(); c.moveTo(s.trail[k - 1].x, s.trail[k - 1].y); c.lineTo(s.trail[k].x, s.trail[k].y); c.stroke();
      }
      const kf = Math.min(1, s.t / s.dur);
      const size = G.tank.size * (0.13 + 0.1 * Math.sin(kf * Math.PI));
      c.fillStyle = '#2b2d42';
      c.beginPath(); c.arc(s.x, s.y, size, 0, TAU); c.fill();
      c.fillStyle = '#ffd166';
      c.beginPath(); c.arc(s.x - size * 0.3, s.y - size * 0.3, size * 0.4, 0, TAU); c.fill();
    }
  }

  function drawParts(c) {
    for (let i = 0; i < G.parts.length; i++) {
      const p = G.parts[i];
      const a = Math.min(1, p.life / p.max * 1.6);
      c.globalAlpha = a;
      c.fillStyle = p.color;
      if (p.kind === 'confetti') {
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
        c.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        c.restore();
      } else if (p.kind === 'gear') {
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
        c.beginPath();
        for (let k = 0; k < 8; k++) {
          const a0 = k / 8 * TAU, rr = k % 2 ? p.size : p.size * 0.7;
          if (k === 0) c.moveTo(Math.cos(a0) * rr, Math.sin(a0) * rr); else c.lineTo(Math.cos(a0) * rr, Math.sin(a0) * rr);
        }
        c.closePath(); c.fill();
        c.restore();
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
    drawClouds(c);
    drawTowerClock(c);
    drawDefenseLine(c);
    // Robot xa vẽ trước (y nhỏ)
    const rs = G.robots.filter(function (r) { return !r.dead; }).sort(function (a, b) { return a.y - b.y; });
    for (let i = 0; i < rs.length; i++) drawRobot(c, rs[i]);
    drawTank(c);
    drawShells(c);
    drawParts(c);
    drawTexts(c);
    if (G.shake > 0) c.translate(-sx, -sy);
    if (G.state === 'playing' && G.hearts === 1) {
      const a = 0.14 + 0.1 * Math.sin(G.anim * 5);
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
    const pr = 'Câu ' + Math.min(G.qTotal, G.qIndex + 1) + '/' + G.qTotal;
    if (h.progress !== pr) { h.progress = pr; ui.progress.textContent = pr; }
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
  }

  function resetHud() {
    G.hud = { score: -1, hearts: -1, progress: '', mult: -1 };
    ui.combo.hidden = true;
    ui.hint.hidden = true;
    ui.promptText.textContent = 'Sẵn sàng…';
    ui.promptVisual.hidden = true;
    ui.promptVisual.innerHTML = '';
  }

  /* ================= VÒNG ĐỜI VÁN CHƠI ================= */
  function clearWorld() {
    G.robots.length = 0;
    G.parts.length = 0;
    G.texts.length = 0;
    G.shells.length = 0;
    G.shake = 0;
    G.flash = null;
    G.q = null;
    G.pendingRetry = null;
    G.selected = -1;
    G.danger = 0;
  }

  function startGame(level) {
    clearTimeout(G.cdTimer);
    G.level = level;
    G.state = 'countdown';
    G.score = 0; G.hearts = MAX_HEARTS; G.streak = 0; G.bestStreak = 0; G.correct = 0; G.wrong = 0;
    G.qIndex = 0; G.qTotal = level.questions; G.time = 0; G.review = [];
    G.overAt = -1; G.resultShown = false; G.lastWarn = -1;
    G.tank.angle = -Math.PI / 2; G.tank.recoil = 0; G.tank.x = G.W / 2; G.tank.vx = 0; G.tank.targetX = null; G.tank.hit = 0;
    G.phase = 'idle';
    clearWorld();
    resetHud();
    showHud(true);
    showScreen('countdown');
    layout();
    syncHud();
    requestWake();
    Music.setTempo(1);
    Music.setDuck('pause', null);
    Music.play('game');
    Voice.stop();
    runCountdown(function () {
      G.state = 'playing';
      G.phase = 'idle';
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
    $('pause-info').textContent = 'Điểm hiện tại: ' + fmt(G.score) + ' · Câu ' + Math.min(G.qTotal, G.qIndex + 1) + '/' + G.qTotal;
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
    G.phase = 'idle';
    G.overAt = G.anim + (reason === 'done' ? 1.6 : 1.4);
    Music.stop();
    Voice.stop();
    const cx = G.W / 2, cy = G.H * 0.42;
    if (reason === 'done') {
      Sfx.play('win');
      Voice.say('Hoàn thành màn ' + G.level.n + '! Giỏi lắm!');
      addText('Hoàn thành!', cx, cy, { color: '#fff', stroke: 'rgba(4,166,124,0.95)', size: G.tank.size * 1.5, life: 1.8, vy: -15 });
      spawnConfetti(90);
    } else {
      Sfx.play('lose');
      Voice.say('Xe tăng hết máu rồi! Thử lại nhé.');
      addText('Xe tăng hết máu!', cx, cy, { color: '#fff', stroke: 'rgba(239,71,111,0.95)', size: G.tank.size * 1.3, life: 1.8, vy: -15 });
    }
    G.robots.forEach(function (r) { if (!r.dead && r.state !== 'dying') { r.state = 'flee'; r.t = 0; } });
    renderPrompt(false);
  }

  /** 3 sao: không sai câu nào và còn đủ tim · 2 sao: sai không quá 2 lần và còn ít nhất 2 tim · 1 sao: hoàn thành */
  function starsFor() {
    if (G.wrong === 0 && G.hearts === MAX_HEARTS) return 3;
    if (G.wrong <= 2 && G.hearts >= 2) return 2;
    return 1;
  }

  function starsHtml(n) {
    let h = '';
    for (let i = 0; i < 3; i++) h += '<span class="' + (i < n ? 'on' : 'off') + '">★</span>';
    return h;
  }

  function showResults() {
    G.resultShown = true;
    const lvl = G.level, score = G.score;
    const done = G.endReason === 'done';
    const p = Store.prog(lvl.id);
    const isRecord = done && score > 0 && score > (p.best || 0);
    const stars = done ? starsFor() : 0;
    p.best = Math.max(p.best || 0, done ? score : 0);
    p.stars = Math.max(p.stars || 0, stars);
    p.plays = (p.plays || 0) + 1;
    Store.setProg(lvl.id, p);

    ui.resultTitle.textContent = done ? '🎉 Hoàn thành màn ' + lvl.n + '!' : '💥 Xe tăng hết máu!';
    ui.resultTitle.className = 'result-title ' + (done ? 'win' : 'nolife');
    ui.resultLevel.textContent = lvl.icon + ' Màn ' + lvl.n + ': ' + lvl.title;
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
      return '<span data-i="' + i + '">' + (r.q.prompt.clocks && r.q.prompt.clocks.length ? '🕒 ' : '') + esc(r.prompt.length > 34 ? r.text : r.prompt.replace(/[?!:]$/, '') + ' → ') + (r.prompt.length > 34 ? '' : '<b>' + esc(r.text) + '</b>') + '</span>';
    }).join('');

    ui.btnQuiz.hidden = !done;
    ui.btnAgain.classList.toggle('big', !done);
    showScreen('gameover');
    if (isRecord) { Sfx.play('record'); Sfx.play('applause'); spawnConfetti(120); Voice.say('Kỷ lục mới! Giỏi quá!', { queue: true }); }
    else if (stars >= 2) { Sfx.play('applause'); spawnConfetti(60); }
    if (done) Voice.say('Bây giờ hãy vào phần hỏi đáp để mở khóa màn tiếp theo nhé!', { queue: true });
    setTimeout(function () { if (G.state === 'over') Music.play('menu'); }, 2500);
    releaseWake();
  }

  function leaveGame() {
    clearTimeout(G.cdTimer);
    const was = inGame();
    clearWorld();
    showHud(false);
    if (was) layout();
    releaseWake();
    Voice.stop();
    Music.setDuck('pause', null);
    Music.play('menu');
  }

  function goMenu() {
    leaveGame();
    G.level = null;
    G.state = 'menu';
    showScreen('menu');
  }

  function goLevels() {
    leaveGame();
    G.state = 'levels';
    renderLevels();
    showScreen('levels');
  }

  /* ================= CHỌN MÀN ================= */
  function gradeLabel(l) { return l.grade === 0 ? 'Thử thách' : 'Lớp ' + l.grade + (l.gradeNote ? ' · ' + l.gradeNote : ''); }
  function gradeClass(g) { return g === 0 ? 'gx' : 'g' + g; }

  function renderLevels() {
    let nextFound = false;
    ui.levelGrid.innerHTML = L.LEVELS.map(function (l) {
      const p = Store.prog(l.id);
      const unlocked = Store.isUnlocked(l);
      const isNext = unlocked && !p.passed && !nextFound;
      if (isNext) nextFound = true;
      let meta;
      if (!unlocked) meta = '<span class="lock">🔒 Qua hỏi đáp màn ' + (l.n - 1) + ' để mở</span>';
      else meta = '<span class="best">' + (p.passed ? '<span class="passed">✅ Đã qua</span>' : '🏆 ' + fmt(p.best || 0)) + '</span><span class="stars">' + starsHtml(p.stars || 0) + '</span>';
      return '<div class="level-card' + (unlocked ? '' : ' locked') + (isNext ? ' next' : '') + '" data-id="' + l.id + '" role="button">' +
        '<span class="num">MÀN ' + l.n + '</span>' +
        '<span class="grade ' + gradeClass(l.grade) + '">' + gradeLabel(l) + '</span>' +
        '<div class="icon">' + (unlocked ? l.icon : '🔒') + '</div>' +
        '<div class="name">' + esc(l.title) + '</div>' +
        '<div class="desc">' + esc(l.desc) + '</div>' +
        '<div class="meta">' + meta + '</div>' +
        '</div>';
    }).join('');
    const passedN = L.LEVELS.filter(function (l) { return Store.prog(l.id).passed; }).length;
    $('levels-desc').innerHTML = passedN >= L.LEVELS.length
      ? '🏅 Tuyệt vời! Bé đã hoàn thành <b>tất cả</b> các màn. Chơi lại để lập kỷ lục mới nhé!'
      : 'Vượt qua phần <b>hỏi đáp</b> của mỗi màn để mở khóa màn tiếp theo! Đã qua <b>' + passedN + '/' + L.LEVELS.length + '</b> màn.';
  }

  /* ================= BÀI HỌC ================= */
  function showLesson(level, mode) {
    leaveGame();
    G.level = level;
    G.state = 'lesson';
    G.lessonMode = mode || 'play';
    const ls = level.lesson;
    ui.lessonTitle.textContent = '📖 Màn ' + level.n + ': ' + level.title;
    ui.lessonIntro.textContent = ls.intro;
    ui.lessonPoints.innerHTML = ls.points.map(function (p, i) { return '<li data-n="' + (i + 1) + '">' + p + '</li>'; }).join('');
    ui.lessonExamples.innerHTML = ls.examples.map(function (e, i) {
      return '<button type="button" data-i="' + i + '" class="' + (i === 0 ? 'on' : '') + '">' + esc(e.label || C.readTime(e.h, e.m, level.id === 'l2' ? 'ruoi' : 'plain')) + '</button>';
    }).join('');
    ui.btnLessonPlay.hidden = G.lessonMode !== 'play';
    ui.btnLessonQuiz.hidden = G.lessonMode !== 'quiz';
    G.lessonEx = -1;
    G.lessonClock = { h: ls.examples[0].h, m: ls.examples[0].m, fh: ls.examples[0].h, fm: ls.examples[0].m, t: 1 };
    setLessonExample(0, false);
    showScreen('lesson');
    paintLessonClock(true);
    requestAnimationFrame(function () { paintLessonClock(true); });
  }

  function setLessonExample(i, speak) {
    const ls = G.level.lesson;
    const e = ls.examples[i];
    if (!e) return;
    const lc = G.lessonClock;
    const curAngle = ((lc.h % 12) + lc.m / 60);
    const target = ((e.h % 12) + e.m / 60);
    lc.fh = curAngle; lc.fm = lc.m;
    lc.th = target; lc.tm = e.m;
    lc.t = 0;
    lc.h = e.h; lc.m = e.m;
    G.lessonEx = i;
    const btns = ui.lessonExamples.querySelectorAll('button');
    for (let k = 0; k < btns.length; k++) btns[k].classList.toggle('on', k === i);
    const label = e.label || C.readTime(e.h, e.m, G.level.id === 'l2' ? 'ruoi' : 'plain');
    ui.lessonClockLabel.textContent = label;
    if (speak) Voice.say(label.replace(/·/g, ', hay là ').replace(/\(/g, ', buổi ').replace(/\)/g, '').replace(/→/g, ' đến ').replace(/:/g, ' là ').replace(/\+/g, ' cộng ').replace(/=/g, ' bằng '));
  }

  function paintLessonClock(force, dt) {
    const lc = G.lessonClock;
    if (!force && lc.t >= 1) return;
    if (dt) lc.t = Math.min(1, lc.t + dt * 1.6);
    const k = lc.t >= 1 ? 1 : 1 - Math.pow(1 - lc.t, 3);
    let hAngle = lc.th == null ? (lc.h % 12) + lc.m / 60 : lc.fh + (lc.th - lc.fh) * k;
    let mVal = lc.tm == null ? lc.m : lc.fm + (lc.tm - lc.fm) * k;
    // Kim giờ tính theo phút để đồng bộ khi quay
    const h = Math.floor(hAngle) % 12;
    const m = lc.t >= 1 ? lc.m : (hAngle - Math.floor(hAngle)) * 60;
    paintClockCanvas(ui.lessonClock, h, lc.t >= 1 ? lc.m : m, { minuteTicks: true, numbers: 'all' });
    void mVal;
  }

  function readLesson() {
    const ls = G.level.lesson;
    if (!Voice.available) { toast('Thiết bị chưa có giọng đọc tiếng Việt 🙁'); return; }
    Voice.stop();
    Voice.say(ls.intro);
    Voice.say(ls.speech, { queue: true, rate: 0.95 });
  }

  /* ================= HỎI ĐÁP ================= */
  function buildQuiz(level) {
    const items = [];
    // 1. Ôn lại lỗi lúc nãy (nếu có) – rút kinh nghiệm
    const mistakes = shuffle(G.review.slice());
    if (mistakes.length && G.level === level) items.push({ kind: 'practice', tag: 'Ôn lại lỗi lúc nãy', q: mistakes[0].q });
    // 2. Câu hỏi khái niệm từ ngân hàng
    const bank = shuffle(level.quiz.slice());
    const nConcept = Math.min(bank.length, QUIZ_N - 1 - items.length);
    for (let i = 0; i < nConcept; i++) items.push({ kind: 'concept', tag: 'Ghi nhớ kiến thức', q: bank[i] });
    // 3. Câu luyện tập mới sinh
    while (items.length < QUIZ_N) items.push({ kind: 'practice', tag: 'Luyện tập', q: level.gen() });
    return shuffle(items).slice(0, QUIZ_N);
  }

  function startQuiz(level) {
    leaveGame();
    G.level = level;
    G.state = 'quiz';
    G.quiz = { items: buildQuiz(level), i: 0, correct: 0, answered: false, level: level, wrongIdx: [] };
    ui.quizBody.hidden = false;
    ui.quizDone.hidden = true;
    showScreen('quiz');
    renderQuizQuestion();
  }

  /** Chuẩn hóa một câu hỏi (khái niệm hoặc luyện tập) về dạng { text, prompt, options[{label, clock, digital, ok}], explain, speech } */
  function normQuiz(item) {
    const q = item.q;
    if (item.kind === 'concept') {
      const opts = q.a.map(function (label, i) { return { label: label, clock: null, digital: null, ok: i === 0 }; });
      return { text: q.q, prompt: { clocks: q.clock ? [q.clock] : [], digital: q.digital || null, hideHour: !!q.hideHour }, options: shuffle(opts), explain: q.explain, speech: q.q, answer: q.a[0] };
    }
    return { text: q.prompt.text.replace(/^Bắn /, 'Chọn ').replace(/!$/, '.'), prompt: q.prompt, options: q.options, explain: q.explain, speech: q.prompt.speech.replace(/^Bắn /, 'Chọn '), answer: q.answer.label };
  }

  function renderQuizQuestion() {
    const Q = G.quiz;
    const item = Q.items[Q.i];
    const n = normQuiz(item);
    Q.cur = n;
    Q.answered = false;
    ui.quizProgress.innerHTML = Q.items.map(function (it, i) {
      const cls = i === Q.i ? 'cur' : it.result === true ? 'ok' : it.result === false ? 'bad' : '';
      return '<span class="' + cls + '"></span>';
    }).join('');
    ui.quizTag.textContent = 'Câu ' + (Q.i + 1) + '/' + Q.items.length + ' · ' + item.tag;
    ui.quizQ.textContent = n.text;
    buildVisual(ui.quizVisual, n.prompt, true);
    const hasClock = n.options.some(function (o) { return o.clock; });
    ui.quizOpts.className = 'quiz-opts' + (hasClock ? ' clocks' : '');
    ui.quizOpts.innerHTML = n.options.map(function (o, i) {
      let inner;
      if (o.clock) inner = '<canvas width="110" height="110" data-h="' + o.clock.h + '" data-m="' + o.clock.m + '"></canvas>';
      else if (o.digital) inner = '<span class="digital">' + esc(o.digital) + '</span>';
      else inner = esc(o.label);
      return '<button type="button" class="quiz-opt" data-i="' + i + '">' + inner + '</button>';
    }).join('');
    const cvs = ui.quizOpts.querySelectorAll('canvas');
    requestAnimationFrame(function () {
      for (let i = 0; i < cvs.length; i++) paintClockCanvas(cvs[i], Number(cvs[i].getAttribute('data-h')), Number(cvs[i].getAttribute('data-m')), {});
    });
    ui.quizExplain.hidden = true;
    ui.btnQuizNext.hidden = true;
    Voice.say(n.speech);
  }

  function answerQuiz(i) {
    const Q = G.quiz;
    if (Q.answered) return;
    const n = Q.cur;
    const o = n.options[i];
    if (!o) return;
    Q.answered = true;
    const btns = ui.quizOpts.querySelectorAll('.quiz-opt');
    for (let k = 0; k < btns.length; k++) {
      btns[k].disabled = true;
      if (n.options[k].ok) btns[k].classList.add('ok');
      else if (k === i) btns[k].classList.add('bad');
      else btns[k].classList.add('dim');
    }
    Q.items[Q.i].result = !!o.ok;
    if (o.ok) {
      Q.correct++;
      ui.quizExplain.innerHTML = '<b>' + pick(PRAISE) + '</b> ' + esc(n.explain);
      ui.quizExplain.className = 'quiz-explain ok';
      Sfx.play('correct');
      Voice.say(pick(PRAISE) + ' ' + n.explain);
    } else {
      ui.quizExplain.innerHTML = '<b>Chưa đúng.</b> Đáp án là <b>' + esc(n.answer) + '</b>. ' + esc(n.explain);
      ui.quizExplain.className = 'quiz-explain bad';
      Sfx.play('wrong');
      Voice.say('Chưa đúng. Đáp án là ' + n.answer + '. ' + n.explain);
    }
    ui.quizExplain.hidden = false;
    ui.btnQuizNext.hidden = false;
    ui.btnQuizNext.textContent = Q.i + 1 < Q.items.length ? 'Tiếp theo ▶' : 'Xem kết quả ▶';
    ui.quizProgress.children[Q.i].className = o.ok ? 'ok' : 'bad';
  }

  function nextQuiz() {
    const Q = G.quiz;
    if (!Q.answered) return;
    Q.i++;
    if (Q.i < Q.items.length) { renderQuizQuestion(); return; }
    finishQuiz();
  }

  function finishQuiz() {
    const Q = G.quiz, lvl = Q.level;
    const passed = Q.correct >= QUIZ_PASS;
    const p = Store.prog(lvl.id);
    p.quizBest = Math.max(p.quizBest || 0, Q.correct);
    const firstPass = passed && !p.passed;
    if (passed) p.passed = true;
    Store.setProg(lvl.id, p);
    const nextL = L.next(lvl);
    ui.quizBody.hidden = true;
    ui.quizDone.hidden = false;
    ui.quizScore.textContent = 'Đúng ' + Q.correct + '/' + Q.items.length + ' câu';
    ui.btnQuizNextLevel.hidden = !(passed && nextL);
    ui.btnQuizReview.hidden = passed;
    ui.btnQuizRetry.hidden = passed;
    if (passed) {
      ui.quizDoneTitle.textContent = Q.correct === Q.items.length ? '🏆 Xuất sắc!' : '🎉 Tuyệt vời!';
      ui.quizDoneTitle.className = 'result-title win';
      if (nextL) {
        ui.quizDoneMsg.innerHTML = firstPass ? '🔓 Bé đã <b>mở khóa</b> màn ' + nextL.n + ': <b>' + esc(nextL.title) + '</b>!' : 'Bé đã nhớ bài rồi! Màn ' + nextL.n + ': <b>' + esc(nextL.title) + '</b> đang chờ.';
        ui.btnQuizNextLevel.textContent = '➡ Màn ' + nextL.n + ': ' + nextL.title;
      } else {
        ui.quizDoneMsg.innerHTML = '🏅 Bé đã hoàn thành <b>tất cả</b> các màn! Bé là Siêu Xe Tăng Thời Gian!';
      }
      Sfx.play(firstPass ? 'unlock' : 'win');
      Sfx.play('applause');
      spawnConfetti(120);
      Voice.say(firstPass && nextL ? 'Tuyệt vời! Bé đã mở khóa màn ' + nextL.n + ': ' + nextL.title : 'Tuyệt vời! Bé đã nhớ bài rồi!');
    } else {
      ui.quizDoneTitle.textContent = '💪 Cùng ôn lại nhé!';
      ui.quizDoneTitle.className = 'result-title nolife';
      ui.quizDoneMsg.innerHTML = 'Cần đúng <b>' + QUIZ_PASS + '/' + Q.items.length + '</b> câu để mở khóa màn sau. Xem lại bài học rồi thử lại nhé!';
      Sfx.play('lose');
      Voice.say('Cùng ôn lại bài học rồi thử lại nhé!');
    }
    if (G.state === 'quiz') renderLevels();
  }

  /* ================= PHỤ HUYNH ================= */
  function openParent() {
    G.parentA = rnd(3, 9); G.parentB = rnd(3, 9);
    ui.parentQ.textContent = G.parentA + ' × ' + G.parentB + ' = ?';
    ui.parentInput.value = '';
    ui.parentGate.hidden = false;
    ui.parentBody.hidden = true;
    ui.parent.classList.remove('hidden');
  }
  function checkParent() {
    if (Number(ui.parentInput.value) === G.parentA * G.parentB) {
      ui.parentGate.hidden = true;
      ui.parentBody.hidden = false;
      ui.parentInput.blur();
    } else {
      toast('Chưa đúng, thử lại nhé!');
      ui.parentInput.value = '';
    }
  }

  /* ================= ĐẦU VÀO ================= */
  G.keys = { left: false, right: false };

  function robotAt(px, py) {
    const live = liveRobots();
    let best = null, bd = Infinity;
    for (let i = 0; i < live.length; i++) {
      const r = live[i];
      const hw = r.w / 2 + 14, hh = r.h / 2 + 14;
      const dx = Math.abs(px - r.x), dy = py - r.y;
      const headOk = Math.abs(px - r.x) < r.w * 0.3 && dy < 0 && dy > -r.h * 0.5 - Math.min(r.w, r.h) * 0.6;
      if ((dx < hw && Math.abs(dy) < hh) || headOk) {
        const d = dx * dx + dy * dy;
        if (d < bd) { best = r; bd = d; }
      }
    }
    return best;
  }

  function onCanvasDown(e) {
    Sfx.unlock();
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.cancelable) e.preventDefault();
    if (G.state !== 'playing') return;
    const r = robotAt(e.clientX, e.clientY);
    if (r) { fireAt(r); return; }
    // Vùng dưới: lái xe tăng tới vị trí chạm
    if (e.clientY > G.lineY - G.tank.size) {
      G.tank.targetX = e.clientX;
      G.dragTank = true;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* bỏ qua */ }
    }
  }
  function onCanvasMove(e) {
    if (!G.dragTank || G.state !== 'playing') return;
    G.tank.targetX = e.clientX;
  }
  function onCanvasUp() { G.dragTank = false; }

  function selectNext(dir) {
    const live = liveRobots().filter(function (r) { return r.state !== 'wrong'; }).sort(function (a, b) { return a.idx - b.idx; });
    if (!live.length) return;
    let k = live.findIndex(function (r) { return r.idx === G.selected; });
    k = (k + dir + live.length) % live.length;
    if (k < 0) k = 0;
    G.selected = live[k].idx;
    Sfx.play('target');
  }

  function bindInput() {
    canvas.addEventListener('pointerdown', onCanvasDown);
    canvas.addEventListener('pointermove', onCanvasMove);
    canvas.addEventListener('pointerup', onCanvasUp);
    canvas.addEventListener('pointercancel', onCanvasUp);
    document.addEventListener('touchmove', function (e) { if (e.target === canvas && e.cancelable) e.preventDefault(); }, { passive: false });
    document.addEventListener('touchstart', function (e) { if (e.target === canvas && e.cancelable) e.preventDefault(); }, { passive: false });
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    document.addEventListener('dblclick', function (e) { if (e.target === canvas) e.preventDefault(); });
    document.addEventListener('contextmenu', function (e) { if (e.target === canvas) e.preventDefault(); });
    document.addEventListener('pointerdown', function () { Sfx.unlock(); }, true);
    document.addEventListener('keydown', function (e) {
      if (e.target === ui.parentInput) return;
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (G.state === 'playing') pauseGame(); else if (G.state === 'paused') resumeGame();
        return;
      }
      if (G.state === 'quiz' && /^[1-4]$/.test(e.key)) { answerQuiz(Number(e.key) - 1); return; }
      if (G.state === 'quiz' && (e.key === 'Enter' || e.key === ' ')) { nextQuiz(); return; }
      if (G.state !== 'playing') return;
      if (/^[1-5]$/.test(e.key)) {
        const r = G.robots.find(function (rb) { return !rb.dead && rb.idx === Number(e.key) - 1; });
        if (r) fireAt(r);
        e.preventDefault();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { selectNext(-1); e.preventDefault(); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'Tab') { selectNext(1); e.preventDefault(); }
      else if (e.key === 'Enter' || e.key === ' ') {
        if (G.selected < 0) selectNext(1);
        const r = G.robots.find(function (rb) { return !rb.dead && rb.idx === G.selected; });
        if (r) fireAt(r);
        e.preventDefault();
      } else if (e.key === 'a' || e.key === 'A') { G.keys.left = true; }
      else if (e.key === 'd' || e.key === 'D') { G.keys.right = true; }
    });
    document.addEventListener('keyup', function (e) {
      if (e.key === 'a' || e.key === 'A') G.keys.left = false;
      if (e.key === 'd' || e.key === 'D') G.keys.right = false;
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
      { key: 'voice', on: '🗣️ Đọc câu hỏi: Bật', off: '🗣️ Đọc câu hỏi: Tắt' }
    ];
    const boxes = document.querySelectorAll('[data-audio-toggles]');
    for (let i = 0; i < boxes.length; i++) {
      boxes[i].innerHTML = defs.map(function (d) {
        const noVoice = d.key === 'voice' && !Voice.available;
        const on = Store.data[d.key] !== false && !noVoice;
        let label = on ? d.on : d.off;
        if (noVoice) label = '🗣️ Đọc câu hỏi: chưa có giọng Việt';
        return '<button type="button" class="toggle ' + (on ? 'on' : 'off') + '" data-set="' + d.key + '"' +
          (noVoice ? ' disabled' : '') + '>' + label + '</button>';
      }).join('');
    }
  }

  function openLevel(level) {
    if (!Store.isUnlocked(level)) {
      toast('🔒 Hãy vượt qua hỏi đáp màn ' + (level.n - 1) + ' trước nhé!');
      Sfx.play('wrong');
      return;
    }
    showLesson(level, 'play');
  }

  function bindUi() {
    click('btn-play', function () { goLevels(); });
    click('btn-howto', function () { ui.howto.classList.remove('hidden'); });
    click('btn-howto-close', function () { ui.howto.classList.add('hidden'); });
    click('btn-levels-back', function () { goMenu(); });
    click('btn-parent', function () { openParent(); });
    click('btn-parent-close', function () { ui.parent.classList.add('hidden'); });
    click('btn-parent-check', function () { checkParent(); });
    ui.parentInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') checkParent(); });
    click('btn-unlock-all', function () { Store.data.unlockAll = true; Store.save(); renderLevels(); toast('Đã mở khóa tất cả màn 🔓'); });
    click('btn-lock-all', function () { Store.data.unlockAll = false; Store.save(); renderLevels(); toast('Các màn sẽ mở theo tiến trình 🔒'); });
    click('btn-reset-progress', function () {
      if (!window.confirm('Xóa toàn bộ điểm và tiến trình của bé?')) return;
      Store.data.progress = {}; Store.data.unlockAll = false; Store.save(); renderLevels(); toast('Đã xóa tiến trình');
    });
    ui.levelGrid.addEventListener('click', function (e) {
      const card = e.target.closest('.level-card');
      if (!card) return;
      const lvl = L.byId(card.getAttribute('data-id'));
      if (!lvl) return;
      Sfx.unlock(); Sfx.play('click');
      openLevel(lvl);
    });
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
        if (k === 'voice') Voice.say('Xin chào! Cùng học xem đồng hồ nào!');
      } else {
        Sfx.play('click');
      }
    });
    // Bài học
    click('btn-lesson-back', function () { goLevels(); });
    click('btn-lesson-read', function () { readLesson(); });
    click('btn-lesson-play', function () { if (G.level) startGame(G.level); });
    click('btn-lesson-quiz', function () { if (G.level) startQuiz(G.level); });
    ui.lessonExamples.addEventListener('click', function (e) {
      const b = e.target.closest('button[data-i]');
      if (!b) return;
      Sfx.unlock(); Sfx.play('tock');
      setLessonExample(Number(b.getAttribute('data-i')), true);
    });
    ui.lessonPoints.addEventListener('click', function (e) {
      const li = e.target.closest('li');
      if (!li) return;
      Sfx.unlock();
      Voice.say(li.textContent);
    });
    // HUD
    click('btn-pause', function () { pauseGame(); });
    click('btn-say', function () { if (G.q) Voice.say(G.q.prompt.speech); });
    click('btn-resume', function () { resumeGame(); });
    click('btn-restart', function () { const l = G.level; if (l) startGame(l); });
    click('btn-pause-lesson', function () { const l = G.level; if (l) showLesson(l, 'play'); });
    click('btn-quit', function () { goMenu(); });
    // Kết quả
    click('btn-quiz', function () { const l = G.level; if (l) startQuiz(l); });
    click('btn-again', function () { const l = G.level; if (l) startGame(l); });
    click('btn-other-level', function () { goLevels(); });
    click('btn-home', function () { goMenu(); });
    ui.reviewChips.addEventListener('click', function (e) {
      const s = e.target.closest('span[data-i]');
      if (!s) return;
      const r = G.review[Number(s.getAttribute('data-i'))];
      if (r) { Sfx.unlock(); Voice.say(r.speech); }
    });
    // Hỏi đáp
    ui.quizOpts.addEventListener('click', function (e) {
      const b = e.target.closest('.quiz-opt');
      if (!b || b.disabled) return;
      Sfx.unlock();
      answerQuiz(Number(b.getAttribute('data-i')));
    });
    click('btn-quiz-next', function () { nextQuiz(); });
    click('btn-quiz-say', function () { if (G.quiz.cur) Voice.say(G.quiz.cur.speech); });
    click('btn-quiz-next-level', function () { const n = L.next(G.quiz.level); if (n) openLevel(n); else goLevels(); });
    click('btn-quiz-review', function () { showLesson(G.quiz.level, 'quiz'); });
    click('btn-quiz-retry', function () { startQuiz(G.quiz.level); });
    click('btn-quiz-replay', function () { showLesson(G.quiz.level, 'play'); });
    click('btn-quiz-levels', function () { goLevels(); });

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
    Voice.init();
    applyAudioSettings();
    renderAudioToggles();
    setTimeout(renderAudioToggles, 1200);
    setTimeout(renderAudioToggles, 3600);
    Music.play('menu');
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
  window.__XeTang = { G: G, Store: Store, startGame: startGame, showLesson: showLesson, startQuiz: startQuiz, fireAt: fireAt, liveRobots: liveRobots, endGame: endGame, answerQuiz: answerQuiz, nextQuiz: nextQuiz, goLevels: goLevels, goMenu: goMenu, update: update, render: render, layout: layout, openLevel: openLevel };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
