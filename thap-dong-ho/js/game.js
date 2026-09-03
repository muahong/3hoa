/* ============================================================
   game.js – Bộ máy trò chơi Tháp Đồng Hồ
   - Canvas 2D, vòng lặp requestAnimationFrame theo thời gian thực (dt)
   - Đồng hồ rơi kiểu Tetris: đưa sang cột ghi đúng giờ rồi THẢ.
     Thả đúng: nổ lấp lánh, ghi điểm. Thả sai: hóa đá, chồng thành tháp.
     Tháp chạm đỉnh là thua; trả lời đúng dọn bớt đá.
   - Trước mỗi màn có bài học, sau mỗi màn có hỏi đáp để mở khóa màn kế
   ============================================================ */
(function () {
  'use strict';

  const K = window.Clock, Sfx = window.Sfx, Music = window.Music, Voice = window.Voice;
  const rnd = K.rnd, chance = K.chance, pick = K.pick, esc = K.esc;
  const TAU = Math.PI * 2;
  const FONT = '"Baloo 2", "Arial Rounded MT Bold", "Segoe UI", Arial, sans-serif';
  const $ = function (id) { return document.getElementById(id); };
  const clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  const COLS = 4, ROWS = 6;
  const PRAISE = ['Chính xác!', 'Tuyệt vời!', 'Giỏi quá!', 'Đúng rồi!', 'Xuất sắc!', 'Siêu đỉnh!', 'Hay lắm!', 'Đúng giờ!'];
  const HINT_POINTS = 20;        // điểm khi có gợi ý cột
  const MAX_PARTS = 400;
  const POP_T = 0.35;            // giây hoạt hình đồng hồ nổ
  const SOFT_SPEED = 7;          // hàng/giây khi giữ phím xuống
  const HARD_SPEED = 32;         // hàng/giây khi bấm THẢ
  const COL_STYLE = [
    { fill: '#ffd9ad', edge: '#e08a2e', ink: '#6b3a00' },
    { fill: '#c8f7c0', edge: '#3fa64b', ink: '#0f4a17' },
    { fill: '#a9eeff', edge: '#1f9fc4', ink: '#073f52' },
    { fill: '#ffc9f5', edge: '#c24fb8', ink: '#5a1352' }
  ];

  /* ================= LƯU TRỮ (localStorage) ================= */
  const Store = {
    key: 'thap-dong-ho-v1',
    data: { sound: true, music: true, voice: true, unlocked: 1, levels: {} },
    load() {
      try {
        const raw = localStorage.getItem(this.key);
        if (raw) {
          const d = JSON.parse(raw);
          if (d && typeof d === 'object') Object.assign(this.data, d);
        }
      } catch (e) { /* bỏ qua */ }
      if (!this.data.levels || typeof this.data.levels !== 'object') this.data.levels = {};
      this.data.unlocked = clamp(Number(this.data.unlocked) || 1, 1, K.LEVELS.length);
    },
    save() {
      try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* bỏ qua */ }
    },
    rec(id) { return this.data.levels[id] || { best: 0, stars: 0, done: 0 }; },
    setRec(id, rec) { this.data.levels[id] = rec; this.save(); },
    isUnlocked(n) { return n <= this.data.unlocked; },
    unlock(n) {
      n = clamp(n, 1, K.LEVELS.length);
      if (n > this.data.unlocked) { this.data.unlocked = n; this.save(); return true; }
      return false;
    }
  };

  /* ================= TRẠNG THÁI ================= */
  const G = {
    W: 0, H: 0, dpr: 1, landscape: true,
    state: 'menu',          // menu | levels | lesson | countdown | playing | paused | clear | fail | summary | quiz
    level: null,
    anim: 0,                // đồng hồ hoạt hình (luôn chạy)
    time: 0,                // đồng hồ ván chơi (chỉ chạy khi playing)
    board: { x: 0, y: 0, w: 0, h: 0, cell: 80, plateH: 70, top: 0 },
    big: { x: 0, y: 0, r: 80, cardW: 200, cardH: 200, titleH: 30 },
    lastPiece: null,        // đồng hồ vừa thả (hiện ở đồng hồ lớn cho tới lượt sau)
    cols: [],               // { t, prevT, flip, glow, hint, stack: [ { t, id, cracks, popAt, dead } ] }
    piece: null,            // { t, col, x, row, target, born, mode: fall|hard|pop, pop, hint, id }
    parts: [], texts: [], clouds: [], deco: [], bg: null, shake: 0, flash: null,
    score: 0, streak: 0, bestStreak: 0, correct: 0, wrong: 0, wrongRun: 0, review: [],
    nextPieceAt: 0, lastTarget: -1, idSeq: 0, clearAt: -1, failAt: -1, endReason: '', dangerT: 0,
    hud: { score: -1, correct: -1, mult: -1 },
    cdTimer: 0, wakeLock: null, softDrop: false, drag: null, decoT: 0,
    demo: { i: 0, next: 0, svg: null, list: [] }, lessonFromPause: false,
    quiz: null, resultSaved: false,
    perf: { n: 0, update: 0, render: 0, avgUpdate: 0, avgRender: 0 }
  };

  /* ================= DOM ================= */
  const app = $('app');
  const canvas = $('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  const ui = {
    hud: $('hud'), hudTop: document.querySelector('#hud .hud-top'), controls: $('controls'), safeProbe: $('safe-probe'),
    menu: $('menu'), levels: $('levels'), lesson: $('lesson'), howto: $('howto'), countdown: $('countdown'),
    pause: $('pause'), summary: $('summary'), fail: $('fail'), quiz: $('quiz'), toast: $('toast'),
    score: $('hud-score'), levelChip: $('hud-level'), combo: $('hud-combo'), progFill: $('hud-progress-fill'), progText: $('hud-progress-text'), hint: $('hud-hint'),
    countNum: $('count-num'), levelGrid: $('level-grid'),
    lessonHead: $('lesson-head'), lessonTitle: $('lesson-title'), lessonClock: $('lesson-clock'), lessonCaption: $('lesson-caption'), lessonText: $('lesson-text'), lessonStart: $('btn-lesson-start'),
    sumTitle: $('sum-title'), sumLevel: $('sum-level'), sumScore: $('sum-score'), sumStars: $('sum-stars'), sumRecord: $('sum-record'), sumNote: $('sum-note'),
    stCorrect: $('st-correct'), stWrong: $('st-wrong'), stCombo: $('st-combo'), review: $('review'), reviewList: $('review-list'),
    failLevel: $('fail-level'), failReview: $('review-fail'), failReviewList: $('review-fail-list'), failInfo: $('fail-info'),
    quizHead: $('quiz-head'), quizDots: $('quiz-dots'), quizBody: $('quiz-body'), quizQ: $('quiz-q'), quizClock: $('quiz-clock'), quizChoices: $('quiz-choices'),
    quizFeedback: $('quiz-feedback'), quizExplain: $('quiz-explain'), quizNext: $('btn-quiz-next'), quizRetry: $('btn-quiz-retry'),
    quizDone: $('quiz-done'), quizDoneTitle: $('quiz-done-title'), quizDoneText: $('quiz-done-text'), quizNextLevel: $('btn-quiz-next-level'),
    ipadTip: $('ipad-tip')
  };
  const SCREENS = ['menu', 'levels', 'lesson', 'countdown', 'pause', 'summary', 'fail', 'quiz'];

  function showScreen(name) {
    SCREENS.forEach(function (k) { ui[k].classList.toggle('hidden', k !== name); });
  }
  function showHud(on) {
    ui.hud.classList.toggle('hidden', !on);
    ui.controls.classList.toggle('off', !on);
  }
  function toast(msg, ms) {
    ui.toast.textContent = msg;
    ui.toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { ui.toast.classList.remove('show'); }, ms || 2000);
  }
  function fmt(n) { try { return Number(n).toLocaleString('vi-VN'); } catch (e) { return String(n); } }
  function inGame() { return G.state === 'countdown' || G.state === 'playing' || G.state === 'paused' || G.state === 'clear' || G.state === 'fail'; }
  function boardVisible() { return inGame() || G.state === 'summary' || G.state === 'quiz'; }

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
  }

  function setControls(left, top, width) {
    const el = ui.controls;
    const maxTop = G.H - (ui.safeProbe ? ui.safeProbe.offsetHeight : 0) - 84;
    el.style.left = Math.round(clamp(left, 4, G.W - width - 4)) + 'px';
    el.style.top = Math.round(Math.min(top, maxTop)) + 'px';
    el.style.width = Math.round(width) + 'px';
  }

  /** Tính vị trí bảng chơi (4 cột × 6 hàng), đồng hồ lớn và cụm nút điều khiển. */
  function layout() {
    const W = G.W, H = G.H;
    if (!W || !H) return;
    const sab = ui.safeProbe ? ui.safeProbe.offsetHeight : 0;
    let hudH = 60;
    try { hudH = Math.max(52, ui.hudTop.getBoundingClientRect().bottom + 6); } catch (e) { /* bỏ qua */ }
    const pad = 10;
    const landscape = W > H * 1.05;
    G.landscape = landscape;
    const B = G.board, Big = G.big;
    const ring = !!(G.level && G.level.ring);
    const cardK = ring ? 2.95 : 2.5;                 // thẻ đồng hồ lớn rộng hơn khi có vòng số phút
    const bigGeom = function (r) {
      Big.r = r;
      Big.titleH = clamp(r * 0.22, 14, 26) + 10;
      Big.cardW = r * cardK;
      Big.cardH = r * cardK;
    };
    const plateK = function (cell) { return cell < 70 ? 1.05 : 0.9; };
    if (landscape) {
      const panelW = clamp(W * 0.34, 230, 420);
      const availH = H - hudH - pad - sab - 8;
      const availW = W - panelW - pad * 3;
      const cell = clamp(Math.min(availH / (ROWS + 1.0 + 1.05), availW / COLS), 34, 150);
      B.cell = cell; B.w = cell * COLS; B.h = cell * ROWS; B.plateH = cell * plateK(cell);
      B.x = Math.round((W - panelW - B.w) / 2);
      B.y = Math.round(hudH + pad + cell);
      bigGeom(clamp(Math.min(panelW / (cardK + 0.15), availH * 0.24), 48, 160));
      Big.x = Math.round(W - panelW / 2 - pad);
      Big.y = Math.round(hudH + pad + Big.titleH + Big.cardH / 2);
      const cw = Math.min(panelW - 24, 320);
      setControls(Big.x - cw / 2, Big.y + Big.cardH / 2 + 14, cw);
    } else {
      const ctlH = 78;
      const availH = H - hudH - ctlH - pad * 3 - sab;
      bigGeom(clamp(availH * 0.12, 40, 110));
      const bigArea = Big.titleH + Big.cardH + 12;
      const cell = clamp(Math.min((availH - bigArea) / (ROWS + 1.0 + 1.05), (W - pad * 2) / COLS), 30, 150);
      B.cell = cell; B.w = cell * COLS; B.h = cell * ROWS; B.plateH = cell * plateK(cell);
      Big.x = Math.round(W / 2);
      Big.y = Math.round(hudH + pad + Big.titleH + Big.cardH / 2);
      B.x = Math.round((W - B.w) / 2);
      B.y = Math.round(Big.y + Big.cardH / 2 + 12 + cell);
      const cw = Math.min(W - 20, 380);
      setControls((W - cw) / 2, B.y + B.h + B.plateH + 12, cw);
    }
    B.top = B.y - B.cell;
    if (G.piece) G.piece.x = B.x + G.piece.col * B.cell;
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

  function roundRect(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
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
  }

  /** Tháp đồng hồ của thị trấn (trang trí nền). */
  function clockTower(c, x, groundY, s) {
    const w = s, h = s * 3.2;
    c.fillStyle = '#e9d8b8';
    c.fillRect(x - w / 2, groundY - h, w, h);
    c.fillStyle = '#d3bd93';
    c.fillRect(x - w / 2, groundY - h, w * 0.18, h);
    c.fillStyle = '#c0392b';
    c.beginPath(); c.moveTo(x - w * 0.65, groundY - h); c.lineTo(x, groundY - h - s * 1.1); c.lineTo(x + w * 0.65, groundY - h); c.closePath(); c.fill();
    c.fillStyle = '#ffd94a';
    c.beginPath(); c.arc(x, groundY - h - s * 1.15, s * 0.1, 0, TAU); c.fill();
    for (let i = 0; i < 3; i++) {
      c.fillStyle = '#7fb3d5';
      c.fillRect(x - w * 0.14, groundY - h * (0.22 + i * 0.2), w * 0.28, h * 0.1);
    }
    drawClockFace(c, x, groundY - h * 0.78, s * 0.36, K.mk(10, 10), { mini: true });
    c.fillStyle = '#8a6a3a';
    c.fillRect(x - w * 0.16, groundY - h * 0.16, w * 0.32, h * 0.16);
  }

  /** Nền tĩnh: bầu trời, mặt trời, đồi, thị trấn với tháp đồng hồ, cỏ hoa (vẽ 1 lần). */
  function buildBackground() {
    const W = G.W, H = G.H;
    if (!W || !H) return;
    G.bg = layer(function (c) {
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#5fb8ff');
      g.addColorStop(0.55, '#a8ddff');
      g.addColorStop(1, '#e6f7ff');
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
      // Mặt trời
      const sx = W * 0.12, sy = H * 0.14, sr = Math.min(W, H) * 0.07;
      const sg = c.createRadialGradient(sx, sy, sr * 0.2, sx, sy, sr * 2.6);
      sg.addColorStop(0, 'rgba(255,240,150,0.9)');
      sg.addColorStop(0.4, 'rgba(255,220,100,0.35)');
      sg.addColorStop(1, 'rgba(255,220,100,0)');
      c.fillStyle = sg;
      c.beginPath(); c.arc(sx, sy, sr * 2.6, 0, TAU); c.fill();
      c.fillStyle = '#ffe066';
      c.beginPath(); c.arc(sx, sy, sr, 0, TAU); c.fill();
      // Đồi xa
      const groundY = H * 0.86;
      c.fillStyle = '#9ad98a';
      c.beginPath(); c.ellipse(W * 0.25, groundY + 10, W * 0.5, H * 0.16, 0, Math.PI, TAU); c.fill();
      c.fillStyle = '#7fcf6e';
      c.beginPath(); c.ellipse(W * 0.8, groundY + 10, W * 0.55, H * 0.13, 0, Math.PI, TAU); c.fill();
      // Thị trấn
      const s = clamp(Math.min(W, H) * 0.045, 16, 40);
      const rand = seededRand(11);
      clockTower(c, W * 0.86, groundY + 2, s * 1.6);
      const xs = [0.05, 0.14, 0.24, 0.62, 0.72, 0.95];
      const cols = ['#ffe9c4', '#ffd6e0', '#dff3ff', '#fff2b3', '#e5ffe0', '#ffe0cc'];
      for (let i = 0; i < xs.length; i++) house(c, W * xs[i], groundY + 2, s * (1.2 + rand() * 0.8), cols[i]);
      tree(c, W * 0.33, groundY + 2, s * 2.2);
      tree(c, W * 0.55, groundY + 2, s * 1.8);
      tree(c, W * 0.78, groundY + 2, s * 2.0);
      // Mặt đất
      c.fillStyle = '#6cc75b';
      c.fillRect(0, groundY, W, H - groundY);
      c.fillStyle = '#5bb54c';
      c.fillRect(0, groundY, W, 6);
      // Ba bông hoa (3hoa) và hoa nhỏ
      const fc = ['#ff6fa5', '#ffffff', '#ffa94d'];
      for (let i = 0; i < 3; i++) flower(c, W * 0.42 + i * s * 1.4, groundY + s * 0.6, s * (i === 1 ? 0.6 : 0.5), fc[i]);
      for (let i = 0; i < 14; i++) flower(c, rand() * W, groundY + s * (0.5 + rand() * 0.9), s * (0.22 + rand() * 0.2), fc[i % 3]);
    });
  }

  function initClouds() {
    G.clouds = [];
    for (let i = 0; i < 6; i++) {
      G.clouds.push({ x: Math.random() * G.W, y: G.H * (0.05 + Math.random() * 0.4), w: 50 + Math.random() * 70, sp: 6 + Math.random() * 10, a: 0.65 + Math.random() * 0.3 });
    }
  }

  /* ================= VẼ ĐỒNG HỒ (CANVAS) ================= */
  /**
   * Vẽ mặt đồng hồ tại (x, y) bán kính r cho mốc giờ t.
   * o.gray: hóa đá · o.ring: 'min' | 'kem' · o.badge: hiện buổi · o.mini: rút gọn chi tiết
   */
  function drawClockFace(c, x, y, r, t, o) {
    o = o || {};
    const ink = o.gray ? '#6b6f85' : '#2b2d42';
    c.save();
    c.translate(x, y);
    c.fillStyle = o.gray ? '#dfe2ea' : '#ffffff';
    c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
    c.lineWidth = Math.max(1.5, r * 0.07);
    c.strokeStyle = ink;
    c.stroke();
    const showSmall = r >= 26 && !o.mini;
    c.lineCap = 'round';
    for (let i = 0; i < 60; i++) {
      const big = i % 5 === 0;
      if (!big && !showSmall) continue;
      const a = i * 6 * Math.PI / 180;
      const r1 = big ? r * 0.82 : r * 0.88, r2 = r * 0.95;
      c.strokeStyle = big ? ink : (o.gray ? '#a5a9bb' : '#9aa0b8');
      c.lineWidth = big ? Math.max(1.2, r * 0.045) : Math.max(0.8, r * 0.02);
      c.beginPath();
      c.moveTo(Math.sin(a) * r1, -Math.cos(a) * r1);
      c.lineTo(Math.sin(a) * r2, -Math.cos(a) * r2);
      c.stroke();
    }
    if (r >= 14) {
      const allNums = r >= 40;
      c.fillStyle = ink;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = '800 ' + Math.round(r * (allNums ? 0.2 : 0.26)) + 'px ' + FONT;
      for (let n = 1; n <= 12; n++) {
        if (!allNums && n % 3 !== 0) continue;
        const a = n * 30 * Math.PI / 180;
        c.fillText(String(n), Math.sin(a) * r * 0.68, -Math.cos(a) * r * 0.68 + r * 0.01);
      }
    }
    if (o.ring && r >= 40) {
      c.textAlign = 'center'; c.textBaseline = 'middle';
      for (let n = 1; n <= 12; n++) {
        const a = n * 30 * Math.PI / 180;
        let label = String(n * 5), color = '#d84f1d', size = r * 0.13;
        if (o.ring === 'kem') {
          if (n >= 7 && n <= 11) { label = 'kém ' + (60 - n * 5); color = '#5a3f85'; size = r * 0.11; }
          else if (n === 12) label = '0';
        }
        c.font = '800 ' + Math.round(size) + 'px ' + FONT;
        c.fillStyle = color;
        c.fillText(label, Math.sin(a) * r * 1.17, -Math.cos(a) * r * 1.17);
      }
    }
    // Kim giờ
    const hA = ((t.h % 12) + t.m / 60) * 30 * Math.PI / 180;
    const mA = t.m * 6 * Math.PI / 180;
    c.strokeStyle = o.gray ? '#8a8fa8' : '#118ab2';
    c.lineWidth = Math.max(2.5, r * 0.11);
    c.beginPath();
    c.moveTo(-Math.sin(hA) * r * 0.12, Math.cos(hA) * r * 0.12);
    c.lineTo(Math.sin(hA) * r * 0.52, -Math.cos(hA) * r * 0.52);
    c.stroke();
    // Kim phút
    c.strokeStyle = o.gray ? '#a0a4b8' : '#ff6b35';
    c.lineWidth = Math.max(2, r * 0.07);
    c.beginPath();
    c.moveTo(-Math.sin(mA) * r * 0.14, Math.cos(mA) * r * 0.14);
    c.lineTo(Math.sin(mA) * r * 0.8, -Math.cos(mA) * r * 0.8);
    c.stroke();
    c.fillStyle = ink;
    c.beginPath(); c.arc(0, 0, Math.max(2, r * 0.07), 0, TAU); c.fill();
    // Buổi trong ngày
    if (t.period && o.badge) {
      const label = K.PERIOD_ICON[t.period] + ' ' + t.period;
      const fs = Math.max(9, r * 0.16);
      c.font = '800 ' + Math.round(fs) + 'px ' + FONT;
      const tw = c.measureText(label).width + fs * 1.2;
      roundRect(c, -tw / 2, r * 0.3, tw, fs * 1.5, fs * 0.75);
      c.fillStyle = '#fff4d6'; c.fill();
      c.strokeStyle = '#e0a800'; c.lineWidth = Math.max(1, r * 0.02); c.stroke();
      c.fillStyle = '#8a5a00';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(label, 0, r * 0.3 + fs * 0.78);
    }
    c.restore();
  }

  /** Vẽ một viên gạch đồng hồ (kích thước s) – kind: piece | ghost | rubble */
  function drawTile(c, x, y, s, t, kind, extra) {
    const rad = s * 0.2;
    c.save();
    if (kind === 'ghost') {
      c.setLineDash([s * 0.12, s * 0.08]);
      c.lineWidth = Math.max(2, s * 0.04);
      c.strokeStyle = 'rgba(255,255,255,0.75)';
      roundRect(c, x, y, s, s, rad);
      c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.12)';
      c.fill();
      c.restore();
      return;
    }
    const rubble = kind === 'rubble';
    const g = c.createLinearGradient(x, y, x, y + s);
    if (rubble) { g.addColorStop(0, '#c9ccd8'); g.addColorStop(1, '#8e93a8'); }
    else { g.addColorStop(0, '#fff9e8'); g.addColorStop(1, '#ffe0a3'); }
    roundRect(c, x, y, s, s, rad);
    c.fillStyle = g; c.fill();
    c.lineWidth = Math.max(2, s * 0.045);
    c.strokeStyle = rubble ? '#5b5f7a' : '#c77d1a';
    c.stroke();
    if (!rubble) {
      c.strokeStyle = 'rgba(255,255,255,0.7)';
      c.lineWidth = Math.max(1, s * 0.02);
      roundRect(c, x + s * 0.06, y + s * 0.06, s * 0.88, s * 0.88, rad * 0.8);
      c.stroke();
    }
    drawClockFace(c, x + s / 2, y + s / 2, s * 0.38, t, { gray: rubble, mini: s < 70 });
    if (t.period) {
      c.font = Math.round(s * 0.2) + 'px ' + FONT;
      c.textAlign = 'right'; c.textBaseline = 'top';
      c.fillText(K.PERIOD_ICON[t.period], x + s - s * 0.06, y + s * 0.05);
    }
    if (rubble && extra && extra.cracks) {
      c.strokeStyle = 'rgba(40,45,70,0.55)';
      c.lineWidth = Math.max(1, s * 0.025);
      c.lineCap = 'round';
      for (let i = 0; i < extra.cracks.length; i++) {
        const k = extra.cracks[i];
        c.beginPath();
        c.moveTo(x + k[0] * s, y + k[1] * s);
        for (let j = 2; j < k.length; j += 2) c.lineTo(x + k[j] * s, y + k[j + 1] * s);
        c.stroke();
      }
      c.font = '800 ' + Math.round(s * 0.26) + 'px ' + FONT;
      c.textAlign = 'left'; c.textBaseline = 'top';
      c.fillStyle = '#ef476f';
      c.fillText('✗', x + s * 0.08, y + s * 0.04);
    }
    c.restore();
  }

  function makeCracks() {
    const out = [];
    const n = 2 + rnd(0, 2);
    for (let i = 0; i < n; i++) {
      let x = Math.random(), y = Math.random() < 0.5 ? 0 : 1;
      const seg = [x, y];
      const steps = 3 + rnd(0, 2);
      for (let s = 0; s < steps; s++) {
        x += (Math.random() - 0.5) * 0.35;
        y += (y === 0 ? 1 : -1) * (0.15 + Math.random() * 0.2) * (s === 0 ? 1 : 1);
        seg.push(clamp(x, 0.02, 0.98), clamp(y, 0.02, 0.98));
        if (s === 0) y = seg[seg.length - 1];
      }
      out.push(seg);
    }
    return out;
  }

  /* ================= HẠT & CHỮ BAY ================= */
  function addText(text, x, y, o) {
    const t = { text: text, x: x, y: y, vy: -55, life: 1.1, max: 1.1, size: G.board.cell * 0.4, color: '#fff', stroke: 'rgba(10,15,40,0.9)', t: 0 };
    if (o) for (const k in o) t[k] = o[k];
    t.max = t.life;
    G.texts.push(t);
  }
  function addPart(p) {
    if (G.parts.length >= MAX_PARTS) G.parts.shift();
    G.parts.push(p);
  }
  function spawnSparkle(x, y, r, big) {
    const n = big ? 40 : 22;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, sp = (big ? 200 : 130) + Math.random() * (big ? 400 : 260);
      addPart({ kind: 'spark', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size: r * (0.05 + Math.random() * 0.08),
        color: pick(['#ffd166', '#ff9f1c', '#ffffff', '#ffe66d', '#7bf1a8', '#9af0ff']), life: 0.4 + Math.random() * 0.5, max: 0.9 });
    }
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * TAU, sp = 60 + Math.random() * 120;
      addPart({ kind: 'star', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, size: r * (0.18 + Math.random() * 0.14), color: '#ffd166', rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 6, life: 0.6 + Math.random() * 0.4, max: 1.0 });
    }
  }
  function spawnDust(x, y, r) {
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * TAU, sp = 30 + Math.random() * 90;
      addPart({ kind: 'puff', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20, size: r * (0.2 + Math.random() * 0.25), grow: r * 0.8,
        color: pick(['#a3a7b8', '#c4c8d6', '#8b90a3']), life: 0.45 + Math.random() * 0.35, max: 0.8 });
    }
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * TAU, sp = 80 + Math.random() * 160;
      addPart({ kind: 'rock', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, size: r * (0.1 + Math.random() * 0.12), rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 10, color: '#7d8196', life: 0.6 + Math.random() * 0.5, max: 1.1 });
    }
  }
  function spawnConfetti(n) {
    const cols = ['#ff6b35', '#ffd166', '#06d6a0', '#118ab2', '#ef476f', '#7b5ea7', '#2ec4b6'];
    for (let i = 0; i < n; i++) {
      addPart({ kind: 'confetti', x: Math.random() * G.W, y: -20 - Math.random() * G.H * 0.5, vx: (Math.random() - 0.5) * 80, vy: 80 + Math.random() * 160,
        size: 6 + Math.random() * 8, color: pick(cols), rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 8, life: 4 + Math.random() * 2, max: 6, sway: Math.random() * TAU });
    }
  }

  /* ================= CỘT & NHÃN GIỜ ================= */
  function stackH(col) { return G.cols[col] ? G.cols[col].stack.filter(function (r) { return !r.dead; }).length : 0; }
  function anyRubble() { return G.cols.some(function (c) { return c.stack.some(function (r) { return !r.dead; }); }); }

  /** Sinh nhãn giờ mới không trùng (theo khóa của màn và theo chữ hiện) với các nhãn đang có. */
  function newLabel(existing) {
    const level = G.level, mode = level.keyMode;
    const conflict = function (t) {
      return existing.some(function (e) { return K.key(e, mode) === K.key(t, mode) || K.read(e) === K.read(t); });
    };
    let cands = existing.length && chance(0.65) ? K.near(pick(existing)) : [];
    for (let i = 0; i < 80; i++) {
      const t = cands.length ? cands.shift() : level.gen();
      if (!conflict(t)) return t;
    }
    for (let i = 0; i < 300; i++) { const t = level.gen(); if (!conflict(t)) return t; }
    return level.gen();
  }

  function initCols() {
    G.cols = [];
    const existing = [];
    for (let i = 0; i < COLS; i++) {
      const t = newLabel(existing);
      existing.push(t);
      G.cols.push({ t: t, prevT: null, flip: 0, glow: 0, hint: false, stack: [] });
    }
  }

  function replaceLabel(i) {
    const col = G.cols[i];
    const t = newLabel(G.cols.map(function (c) { return c.t; }));
    col.prevT = col.t;
    col.t = t;
    col.flip = 1;
    col.hint = false;
  }

  /* ================= ĐỒNG HỒ RƠI ================= */
  function fallTime() {
    const lvl = G.level;
    const mul = Math.min(1.5, 1 + 0.035 * G.correct);
    return (lvl ? lvl.fall : 15) / mul;
  }

  function spawnPiece() {
    if (!G.level) return;
    let target = rnd(0, COLS - 1);
    if (target === G.lastTarget && chance(0.85)) target = (target + rnd(1, COLS - 1)) % COLS;
    G.lastTarget = target;
    // Cột xuất hiện: ưu tiên cột còn nhiều chỗ trống
    const free = [];
    for (let i = 0; i < COLS; i++) if (stackH(i) <= ROWS - 2) free.push(i);
    const col = free.length ? pick(free) : rnd(0, COLS - 1);
    const hint = G.wrongRun >= 2;
    const p = {
      t: G.cols[target].t, col: col, x: G.board.x + col * G.board.cell, row: -1.0, target: target,
      born: G.time, mode: 'fall', pop: 0, hint: hint, id: ++G.idSeq
    };
    G.piece = p;
    G.cols.forEach(function (c, i) { c.hint = hint && i === target; });
    if (hint) { showHint('Gợi ý: thả vào cột đang nhấp nháy ✨', 'info', 2200); Sfx.play('hint'); }
    else Sfx.play('tock');
  }

  function canOccupy(col, row) {
    if (col < 0 || col >= COLS) return false;
    return row <= ROWS - 1 - stackH(col) + 0.001;
  }

  function moveTo(col) {
    const p = G.piece;
    if (G.state !== 'playing' || !p || p.mode !== 'fall') return false;
    col = clamp(Math.round(col), 0, COLS - 1);
    if (col === p.col) return false;
    const dir = col > p.col ? 1 : -1;
    let moved = false;
    while (p.col !== col) {
      const nc = p.col + dir;
      if (!canOccupy(nc, p.row)) break;
      p.col = nc;
      moved = true;
    }
    if (moved) Sfx.play('move'); else Sfx.play('click');
    return moved;
  }
  function moveLeft() { return moveTo((G.piece ? G.piece.col : 0) - 1); }
  function moveRight() { return moveTo((G.piece ? G.piece.col : 0) + 1); }

  function hardDrop() {
    const p = G.piece;
    if (G.state !== 'playing' || !p || p.mode !== 'fall') return false;
    p.mode = 'hard';
    Sfx.play('drop');
    return true;
  }

  function multiplier() { return 1 + Math.min(3, Math.floor(G.streak / 3)); }

  function noteReview(t) {
    if (G.review.some(function (r) { return K.key(r.t, '24') === K.key(t, '24') && r.t.style === t.style; })) return;
    if (G.review.length >= 8) return;
    G.review.push({ t: t, text: K.read(t), speech: K.speech(t) });
  }

  function tileCenter(col, row) {
    const B = G.board;
    return { x: B.x + col * B.cell + B.cell / 2, y: B.y + row * B.cell + B.cell / 2 };
  }

  function popRubble(col, idx, delay) {
    const r = G.cols[col].stack[idx];
    if (!r || r.dead) return;
    r.popAt = G.anim + (delay || 0);
  }

  function landPiece(p) {
    const ok = p.col === p.target;
    G.lastPiece = { t: p.t, ok: ok };
    if (ok) onCorrect(p); else onWrong(p);
  }

  function onCorrect(p) {
    const B = G.board;
    const row = ROWS - 1 - stackH(p.col);
    p.row = row;
    p.mode = 'pop';
    p.pop = POP_T;
    const cpos = tileCenter(p.col, row);
    spawnSparkle(cpos.x, cpos.y, B.cell * 0.5, false);
    G.correct++;
    G.wrongRun = 0;
    let pts;
    if (p.hint) {
      pts = HINT_POINTS;
      addText('Nhớ nhé: ' + K.read(p.t), cpos.x, cpos.y - B.cell * 0.7, { color: '#ffe066', size: B.cell * 0.34, life: 1.5 });
      G.streak = 0;
    } else {
      G.streak++;
      if (G.streak > G.bestStreak) G.bestStreak = G.streak;
      const age = G.time - p.born;
      const mult = multiplier();
      const speedBonus = age < 5 ? 50 : age < 9 ? 25 : 0;
      pts = 100 * mult + speedBonus;
      const isCombo = G.streak % 3 === 0 && mult > 1;
      const praise = isCombo ? 'Combo x' + mult + '!' : pick(PRAISE);
      addText(praise, cpos.x, cpos.y - B.cell * 0.75, { color: isCombo ? '#ff9f1c' : '#7bf1a8', size: B.cell * 0.46, life: 1.2 });
      if (isCombo) { Sfx.play('combo'); Voice.say('Combo nhân ' + mult + '!'); }
      else if (chance(0.5)) Voice.say(praise);
    }
    G.score += pts;
    addText('+' + pts, cpos.x, cpos.y - B.cell * 0.25, { color: '#ffe066', size: B.cell * 0.42, life: 1.0 });
    Sfx.play('pop');
    showHint(K.read(p.t) + ' ✓', 'ok', 1500);
    G.flash = { c: '120,255,180', a: 0.14 };

    // Dọn đá: 1 viên trên cùng của cột này; đúng 5 lần liên tiếp thì dọn sạch
    const col = G.cols[p.col];
    const live = col.stack.filter(function (r) { return !r.dead && r.popAt == null; });
    if (live.length) {
      popRubble(p.col, col.stack.indexOf(live[live.length - 1]), 0.15);
      addText('Dọn 1 viên đá! 🧹', cpos.x, cpos.y + B.cell * 0.9, { color: '#9af0ff', size: B.cell * 0.3, life: 1.2 });
      Sfx.play('sweep');
    }
    if (G.streak > 0 && G.streak % 5 === 0 && anyRubble()) {
      let d = 0.2;
      G.cols.forEach(function (c, i) { c.stack.forEach(function (r, j) { if (!r.dead && r.popAt == null) { popRubble(i, j, d); d += 0.07; } }); });
      addText('🧹 Dọn sạch tháp!', B.x + B.w / 2, B.y + B.h * 0.4, { color: '#ffd166', size: B.cell * 0.55, life: 1.6, vy: -25 });
      Voice.say('Dọn sạch tháp!', { queue: true });
      Sfx.play('stage');
    }
    replaceLabel(p.col);
    if (G.correct >= G.level.goal) { levelClear(); return; }
    if (G.correct % 5 === 0) {
      addText('Nhanh hơn một chút! ⏩', B.x + B.w / 2, B.y + B.h * 0.25, { color: '#fff', size: B.cell * 0.34, life: 1.4, vy: -20 });
    }
    G.nextPieceAt = G.time + 0.55;
  }

  function onWrong(p) {
    const B = G.board;
    const col = G.cols[p.col];
    const row = ROWS - 1 - stackH(p.col);
    col.stack.push({ t: p.t, id: ++G.idSeq, cracks: makeCracks(), popAt: null, dead: false, born: G.anim });
    G.piece = null;
    G.wrong++;
    G.streak = 0;
    G.wrongRun++;
    const cpos = tileCenter(p.col, row);
    spawnDust(cpos.x, cpos.y + B.cell * 0.3, B.cell * 0.5);
    G.shake = Math.max(G.shake, 0.5);
    G.flash = { c: '255,60,90', a: 0.22 };
    Sfx.play('land');
    Sfx.play('wrong');
    addText('✗', cpos.x, cpos.y - B.cell * 0.6, { color: '#ff5c7a', size: B.cell * 0.6, life: 1.0 });
    showHint('Đồng hồ chỉ ' + K.read(p.t), 'bad', 3000);
    Voice.say('Sai rồi! Đồng hồ chỉ ' + K.speech(p.t));
    const tc = G.cols[p.target];
    tc.glow = 1;
    const tpos = tileCenter(p.target, ROWS - 1);
    addText('Đúng là cột này ⬇', tpos.x, tpos.y + B.cell * 0.2, { color: '#7bf1a8', size: B.cell * 0.3, life: 2.2, vy: -8 });
    noteReview(p.t);
    G.cols.forEach(function (c) { c.hint = false; });
    if (stackH(p.col) >= ROWS) { towerFail(); return; }
    if (stackH(p.col) >= ROWS - 1) { showHint('Cẩn thận! Tháp sắp chạm đỉnh!', 'bad', 2600); }
    G.nextPieceAt = G.time + 1.3;
  }

  /* ================= CẬP NHẬT ================= */
  function updatePlaying(dt) {
    G.time += dt;
    const p = G.piece, B = G.board;
    if (!p) {
      if (G.time >= G.nextPieceAt) spawnPiece();
      return;
    }
    if (p.mode === 'pop') {
      p.pop -= dt;
      if (p.pop <= 0) G.piece = null;
      return;
    }
    let v = ROWS / fallTime();
    if (p.mode === 'hard') v = HARD_SPEED;
    else if (G.softDrop) v = Math.max(v, SOFT_SPEED);
    p.row += v * dt;
    const tx = B.x + p.col * B.cell;
    p.x += (tx - p.x) * Math.min(1, dt * 16);
    const land = ROWS - 1 - stackH(p.col);
    if (p.row >= land) {
      p.row = land;
      p.x = tx;
      landPiece(p);
    }
  }

  function updateCols(dt) {
    for (let i = 0; i < G.cols.length; i++) {
      const c = G.cols[i];
      if (c.flip > 0) c.flip = Math.max(0, c.flip - dt * 2.6);
      if (c.glow > 0) c.glow = Math.max(0, c.glow - dt * 0.45);
      let w = 0;
      for (let j = 0; j < c.stack.length; j++) {
        const r = c.stack[j];
        if (r.popAt != null && !r.dead && G.anim >= r.popAt) {
          r.dead = true;
          const pos = tileCenter(i, ROWS - 1 - j);
          if (G.state === 'fail') spawnDust(pos.x, pos.y, G.board.cell * 0.5); else spawnSparkle(pos.x, pos.y, G.board.cell * 0.45, false);
        }
        if (!r.dead) c.stack[w++] = r;
      }
      c.stack.length = w;
    }
  }

  function updateEnding() {
    if (G.state === 'clear' && G.anim >= G.clearAt) showSummary();
    else if (G.state === 'fail' && G.anim >= G.failAt) showFail();
  }

  function updateDeco(dt) {
    G.decoT -= dt;
    if (G.decoT <= 0 && G.deco.length < 6) {
      G.decoT = 1.4 + Math.random() * 1.6;
      const s = 56 + Math.random() * 50;
      G.deco.push({ x: Math.random() * (G.W - s), y: -s - 10, s: s, vy: 28 + Math.random() * 30, rot: (Math.random() - 0.5) * 0.4, vr: (Math.random() - 0.5) * 0.3, t: K.genFor(rnd(1, 7)) });
    }
    let w = 0;
    for (let i = 0; i < G.deco.length; i++) {
      const d = G.deco[i];
      d.y += d.vy * dt;
      d.rot += d.vr * dt;
      if (d.y < G.H * 0.86) G.deco[w++] = d;
      else spawnSparkle(d.x + d.s / 2, d.y + d.s / 2, d.s * 0.4, false);
    }
    G.deco.length = w;
  }

  function updateClouds(dt) {
    for (let i = 0; i < G.clouds.length; i++) {
      const k = G.clouds[i];
      k.x += k.sp * dt;
      if (k.x - k.w * 1.6 > G.W) k.x = -k.w * 1.6;
    }
  }

  function updateParts(dt) {
    const g = 700, arr = G.parts;
    let w = 0;
    for (let i = 0; i < arr.length; i++) {
      const p = arr[i];
      p.life -= dt;
      if (p.life <= 0) continue;
      if (p.kind === 'spark' || p.kind === 'star' || p.kind === 'rock') {
        p.vy += g * (p.kind === 'star' ? 0.5 : p.kind === 'spark' ? 0.6 : 1) * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.rot != null) p.rot += p.vr * dt;
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

  function updateLesson() {
    const d = G.demo;
    if (!d.list.length || !d.svg) return;
    if (G.anim >= d.next) {
      d.i = (d.i + 1) % d.list.length;
      d.next = G.anim + 3.0;
      const t = d.list[d.i];
      K.setSvgTime(d.svg, t);
      ui.lessonCaption.textContent = K.read(t);
      ui.lessonCaption.classList.remove('pop');
      void ui.lessonCaption.offsetWidth;
      ui.lessonCaption.classList.add('pop');
    }
  }

  function update(dt) {
    G.anim += dt;
    if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 2.2);
    if (G.flash) { G.flash.a -= dt * 1.6; if (G.flash.a <= 0) G.flash = null; }

    if (G.state === 'playing') updatePlaying(dt);
    else if (G.state === 'clear' || G.state === 'fail') updateEnding();
    else if (G.state === 'lesson' || (G.state === 'paused' && G.lessonFromPause)) updateLesson();
    if (!boardVisible()) updateDeco(dt);

    if (G.state !== 'paused') {
      updateCols(dt);
      updateClouds(dt);
      updateParts(dt);
      updateTexts(dt);
    }
    syncHud();
  }

  /* ================= VẼ ================= */
  function drawClouds(c) {
    for (let i = 0; i < G.clouds.length; i++) {
      const k = G.clouds[i];
      c.fillStyle = 'rgba(255,255,255,' + k.a.toFixed(2) + ')';
      c.beginPath();
      c.arc(k.x, k.y, k.w * 0.32, 0, TAU);
      c.arc(k.x + k.w * 0.35, k.y - k.w * 0.12, k.w * 0.4, 0, TAU);
      c.arc(k.x + k.w * 0.75, k.y, k.w * 0.3, 0, TAU);
      c.arc(k.x + k.w * 0.4, k.y + k.w * 0.1, k.w * 0.34, 0, TAU);
      c.fill();
    }
  }

  function drawDeco(c) {
    for (let i = 0; i < G.deco.length; i++) {
      const d = G.deco[i];
      c.save();
      c.translate(d.x + d.s / 2, d.y + d.s / 2);
      c.rotate(d.rot);
      c.globalAlpha = 0.85;
      drawTile(c, -d.s / 2, -d.s / 2, d.s, d.t, 'piece');
      c.restore();
    }
  }

  function drawBoard(c) {
    const B = G.board;
    const pad = 8;
    const frameY = B.top - pad, frameH = (B.y - B.top) + B.h + B.plateH + pad * 2;
    c.save();
    c.shadowColor = 'rgba(0,20,60,0.3)';
    c.shadowBlur = 24;
    c.shadowOffsetY = 8;
    roundRect(c, B.x - pad, frameY, B.w + pad * 2, frameH, 20);
    c.fillStyle = 'rgba(20,35,80,0.42)';
    c.fill();
    c.restore();
    roundRect(c, B.x - pad, frameY, B.w + pad * 2, frameH, 20);
    c.strokeStyle = 'rgba(255,255,255,0.45)';
    c.lineWidth = 3;
    c.stroke();
    // Lưới
    c.strokeStyle = 'rgba(255,255,255,0.13)';
    c.lineWidth = 1;
    for (let i = 1; i < COLS; i++) {
      c.beginPath(); c.moveTo(B.x + i * B.cell, B.y); c.lineTo(B.x + i * B.cell, B.y + B.h); c.stroke();
    }
    for (let j = 1; j < ROWS; j++) {
      c.beginPath(); c.moveTo(B.x, B.y + j * B.cell); c.lineTo(B.x + B.w, B.y + j * B.cell); c.stroke();
    }
    // Vạch đỉnh nguy hiểm
    let danger = false;
    for (let i = 0; i < COLS; i++) if (stackH(i) >= ROWS - 2) danger = true;
    const blink = danger ? 0.55 + 0.45 * Math.sin(G.anim * 6) : 0.35;
    c.strokeStyle = 'rgba(255,90,120,' + blink.toFixed(2) + ')';
    c.lineWidth = danger ? 3 : 2;
    c.setLineDash([10, 8]);
    c.beginPath(); c.moveTo(B.x, B.y); c.lineTo(B.x + B.w, B.y); c.stroke();
    c.setLineDash([]);
  }

  function fitFont(c, text, maxW, size, weight) {
    c.font = (weight || '800') + ' ' + Math.round(size) + 'px ' + FONT;
    const w = c.measureText(text).width;
    if (w > maxW) {
      size = size * maxW / w;
      c.font = (weight || '800') + ' ' + Math.round(size) + 'px ' + FONT;
    }
    return size;
  }

  function drawPlates(c) {
    const B = G.board;
    const y = B.y + B.h + 6, h = B.plateH - 6;
    for (let i = 0; i < COLS; i++) {
      const col = G.cols[i];
      if (!col) continue;
      const st = COL_STYLE[i];
      const x = B.x + i * B.cell + 3, w = B.cell - 6;
      const cx = x + w / 2, cy = y + h / 2;
      let sy = 1;
      let t = col.t;
      if (col.flip > 0) {
        sy = Math.abs(Math.cos(col.flip * Math.PI));
        if (col.flip > 0.5 && col.prevT) t = col.prevT;
      }
      c.save();
      c.translate(cx, cy);
      c.scale(1, Math.max(0.04, sy));
      c.translate(-cx, -cy);
      if (col.glow > 0) {
        c.shadowColor = 'rgba(80,255,150,' + Math.min(1, col.glow * 1.5).toFixed(2) + ')';
        c.shadowBlur = 26;
      } else if (col.hint) {
        c.shadowColor = 'rgba(255,214,102,' + (0.6 + 0.4 * Math.sin(G.anim * 7)).toFixed(2) + ')';
        c.shadowBlur = 24;
      }
      roundRect(c, x, y, w, h, Math.min(16, w * 0.18));
      c.fillStyle = col.glow > 0 ? '#c9ffd9' : st.fill;
      c.fill();
      c.shadowBlur = 0;
      c.lineWidth = Math.max(2, w * 0.04);
      c.strokeStyle = col.glow > 0 ? '#06d6a0' : (col.hint ? '#ffbf1f' : st.edge);
      c.stroke();
      let lines = K.lines(t);
      if (w < 78 && lines.length === 2 && lines[1].indexOf('kém ') === 0) lines = [lines[0], 'kém', lines[1].slice(4)];
      c.fillStyle = st.ink;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      const n = lines.length;
      const base = h * (n === 1 ? 0.42 : n === 2 ? 0.33 : 0.27);
      let size = base;
      for (let k = 0; k < n; k++) size = Math.min(size, fitFont(c, lines[k], w - 10, base));
      c.font = '800 ' + Math.round(size) + 'px ' + FONT;
      const lh = size * 1.08;
      for (let k = 0; k < n; k++) {
        const ly = cy + (k - (n - 1) / 2) * lh + size * 0.04;
        c.fillText(lines[k], cx, ly);
      }
      c.restore();
      if (col.hint) {
        c.font = Math.round(B.cell * 0.3) + 'px ' + FONT;
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('✨', cx, y - B.cell * 0.2 - Math.abs(Math.sin(G.anim * 5)) * 6);
      }
    }
  }

  function drawStack(c) {
    const B = G.board;
    for (let i = 0; i < COLS; i++) {
      const col = G.cols[i];
      if (!col) continue;
      for (let j = 0; j < col.stack.length; j++) {
        const r = col.stack[j];
        if (r.dead) continue;
        const row = ROWS - 1 - j;
        const x = B.x + i * B.cell + 3, y = B.y + row * B.cell + 3;
        const age = G.anim - (r.born || 0);
        const wob = age < 0.25 ? Math.sin(age * 40) * (1 - age / 0.25) * 3 : 0;
        drawTile(c, x + wob, y, B.cell - 6, r.t, 'rubble', r);
      }
    }
  }

  function drawGhost(c) {
    const p = G.piece, B = G.board;
    if (!p || p.mode === 'pop') return;
    const land = ROWS - 1 - stackH(p.col);
    if (land < p.row + 0.5) return;
    drawTile(c, B.x + p.col * B.cell + 3, B.y + land * B.cell + 3, B.cell - 6, p.t, 'ghost');
  }

  function drawPiece(c) {
    const p = G.piece, B = G.board;
    if (!p) return;
    const s = B.cell - 6;
    const x = p.x + 3, y = B.y + p.row * B.cell + 3;
    if (p.mode === 'pop') {
      const k = Math.max(0, p.pop / POP_T);
      const sc = 0.2 + 0.8 * k;
      c.save();
      c.globalAlpha = k;
      c.translate(x + s / 2, y + s / 2);
      c.scale(sc + (1 - k) * 0.6, sc + (1 - k) * 0.6);
      drawTile(c, -s / 2, -s / 2, s, p.t, 'piece');
      c.restore();
      return;
    }
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.3)';
    c.shadowBlur = 14;
    c.shadowOffsetY = 6;
    drawTile(c, x, y, s, p.t, 'piece');
    c.restore();
    if (p.mode === 'fall' && G.state === 'playing') {
      const gl = 0.5 + 0.5 * Math.sin(G.anim * 5);
      c.strokeStyle = 'rgba(255,214,102,' + (0.35 + 0.45 * gl).toFixed(2) + ')';
      c.lineWidth = 3;
      roundRect(c, x - 3, y - 3, s + 6, s + 6, s * 0.22);
      c.stroke();
    }
  }

  function drawBigClock(c) {
    const Big = G.big, lvl = G.level;
    const p = G.piece;
    const live = p && p.mode !== 'pop';
    const shown = live ? p.t : (G.lastPiece ? G.lastPiece.t : null);
    const r = Big.r;
    const bw = Big.cardW, bh = Big.cardH;
    const top = Big.y - bh / 2;
    c.save();
    c.shadowColor = 'rgba(0,20,60,0.25)';
    c.shadowBlur = 20; c.shadowOffsetY = 6;
    roundRect(c, Big.x - bw / 2, top, bw, bh, r * 0.3);
    c.fillStyle = 'rgba(255,255,255,0.72)';
    c.fill();
    c.restore();
    // Tiêu đề: câu hỏi khi đang có đồng hồ rơi, kết quả của đồng hồ vừa thả khi chờ lượt sau
    let title = 'Sẵn sàng…', color = '#fff';
    if (live) title = 'Đồng hồ chỉ mấy giờ?';
    else if (G.lastPiece) { title = (G.lastPiece.ok ? '✓ ' : '✗ ') + K.read(G.lastPiece.t); color = G.lastPiece.ok ? '#7bf1a8' : '#ffb3c1'; }
    c.textAlign = 'center'; c.textBaseline = 'middle';
    const ts = fitFont(c, title, bw + r * 0.6, clamp(r * 0.22, 14, 26));
    c.lineJoin = 'round';
    c.lineWidth = Math.max(3, ts * 0.2);
    c.strokeStyle = 'rgba(10,15,40,0.85)';
    c.fillStyle = color;
    const ty = top - Big.titleH / 2 + 2;
    c.strokeText(title, Big.x, ty);
    c.fillText(title, Big.x, ty);
    if (shown) {
      if (!live) c.globalAlpha = 0.85;
      drawClockFace(c, Big.x, Big.y, r * 0.92, shown, { badge: true, ring: lvl ? lvl.ring : null });
      c.globalAlpha = 1;
    } else {
      c.globalAlpha = 0.35;
      drawClockFace(c, Big.x, Big.y, r * 0.92, K.mk(12, 0), { mini: true });
      c.globalAlpha = 1;
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
      } else if (p.kind === 'rock') {
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
        c.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.8);
        c.restore();
      } else if (p.kind === 'star') {
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
        c.beginPath();
        for (let k = 0; k < 10; k++) {
          const rr = k % 2 ? p.size * 0.45 : p.size;
          const ang = k * Math.PI / 5 - Math.PI / 2;
          if (k === 0) c.moveTo(Math.cos(ang) * rr, Math.sin(ang) * rr); else c.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
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
      const amp = G.shake * G.shake * Math.min(G.W, G.H) * 0.025;
      sx = (Math.random() - 0.5) * 2 * amp;
      sy = (Math.random() - 0.5) * 2 * amp;
      c.translate(sx, sy);
    }
    c.drawImage(G.bg, 0, 0, G.W, G.H);
    drawClouds(c);
    if (boardVisible() && G.cols.length) {
      drawBoard(c);
      drawStack(c);
      drawGhost(c);
      drawPiece(c);
      drawPlates(c);
      drawBigClock(c);
    } else {
      drawDeco(c);
    }
    drawParts(c);
    drawTexts(c);
    if (G.shake > 0) c.translate(-sx, -sy);
    if (G.flash) {
      c.fillStyle = 'rgba(' + G.flash.c + ',' + Math.max(0, G.flash.a).toFixed(2) + ')';
      c.fillRect(0, 0, G.W, G.H);
    }
  }

  /* ================= HUD ================= */
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
    if (h.correct !== G.correct) {
      h.correct = G.correct;
      const goal = G.level ? G.level.goal : 10;
      ui.progText.textContent = '🕐 ' + G.correct + '/' + goal;
      ui.progFill.style.width = (clamp(G.correct / goal, 0, 1) * 100).toFixed(1) + '%';
    }
    const mult = G.state === 'playing' ? multiplier() : 1;
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
    G.hud = { score: -1, correct: -1, mult: -1 };
    ui.combo.hidden = true;
    ui.hint.hidden = true;
    ui.progFill.style.width = '0%';
    if (G.level) ui.levelChip.textContent = 'Màn ' + G.level.n + ' · ' + G.level.title;
  }

  /* ================= VÒNG ĐỜI MÀN CHƠI ================= */
  function clearWorld() {
    G.parts.length = 0;
    G.texts.length = 0;
    G.piece = null;
    G.shake = 0;
    G.flash = null;
    G.softDrop = false;
    G.drag = null;
  }

  function startLevel(level) {
    clearTimeout(G.cdTimer);
    G.level = level;
    G.state = 'countdown';
    G.score = 0; G.streak = 0; G.bestStreak = 0; G.correct = 0; G.wrong = 0; G.wrongRun = 0; G.review = [];
    G.time = 0; G.nextPieceAt = 0; G.lastTarget = -1; G.lastPiece = null; G.clearAt = -1; G.failAt = -1; G.endReason = ''; G.resultSaved = false;
    G.quiz = null; G.deco.length = 0;
    clearWorld();
    initCols();
    resetHud();
    showHud(true);
    showScreen('countdown');
    layout();
    syncHud();
    requestWake();
    Music.setDuck('pause', null);
    Music.play('game');
    Voice.stop();
    stopDemo();
    runCountdown(function () {
      G.state = 'playing';
      G.nextPieceAt = G.time + 0.3;
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
        el.textContent = 'XẾP!';
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
    G.softDrop = false;
    Voice.stop();
    Music.setDuck('pause', 0.25);
    $('pause-info').textContent = 'Màn ' + G.level.n + ' · ' + G.level.title + ' · Điểm: ' + fmt(G.score) + ' · Đã đúng ' + G.correct + '/' + G.level.goal;
    showScreen('pause');
  }

  function resumeGame() {
    if (G.state !== 'paused') return;
    G.state = 'playing';
    showScreen(null);
    Sfx.unlock();
    Music.setDuck('pause', null);
  }

  function levelClear() {
    if (G.state !== 'playing') return;
    G.state = 'clear';
    G.endReason = 'clear';
    G.clearAt = G.anim + 2.3;
    G.softDrop = false;
    ui.controls.classList.add('off');
    Music.stop();
    Voice.stop();
    Sfx.play('clear');
    Voice.say('Hoàn thành màn ' + G.level.n + '! Giỏi quá!');
    let d = 0.3;
    G.cols.forEach(function (c, i) { c.stack.forEach(function (r, j) { if (!r.dead && r.popAt == null) { popRubble(i, j, d); d += 0.08; } }); });
    const B = G.board;
    addText('HOÀN THÀNH!', B.x + B.w / 2, B.y + B.h * 0.4, { color: '#fff', stroke: 'rgba(6,214,160,0.95)', size: B.cell * 0.8, life: 2.2, vy: -12 });
    spawnConfetti(120);
  }

  function towerFail() {
    if (G.state !== 'playing') return;
    G.state = 'fail';
    G.endReason = 'fail';
    G.failAt = G.anim + 2.0;
    G.softDrop = false;
    ui.controls.classList.add('off');
    Music.stop();
    Voice.stop();
    Sfx.play('lose');
    Voice.say('Ối! Tháp đổ rồi! Xem lại bài học rồi thử lại nhé.');
    G.shake = 1;
    let d = 0.25;
    G.cols.forEach(function (c, i) {
      for (let j = c.stack.length - 1; j >= 0; j--) { const r = c.stack[j]; if (!r.dead && r.popAt == null) { popRubble(i, j, d); d += 0.06; } }
    });
    const B = G.board;
    addText('THÁP ĐỔ!', B.x + B.w / 2, B.y + B.h * 0.4, { color: '#fff', stroke: 'rgba(239,71,111,0.95)', size: B.cell * 0.8, life: 2.0, vy: -12 });
  }

  function starsFor(wrong) { return wrong === 0 ? 3 : wrong <= 2 ? 2 : 1; }
  function starsHtml(n) {
    let h = '';
    for (let i = 0; i < 3; i++) h += '<span class="' + (i < n ? 'on' : 'off') + '">★</span>';
    return h;
  }
  function gradeLabel(g) { return g === 0 ? 'Tổng hợp' : 'Lớp ' + g; }
  function gradeClass(g) { return g === 0 ? 'gx' : 'g' + g; }

  function reviewHtml(list) {
    return list.map(function (r, i) {
      return '<div class="review-item" data-i="' + i + '" role="button">' + K.svg(r.t, { size: 84, badge: true }) + '<div class="rv-text">' + esc(r.text) + '</div></div>';
    }).join('');
  }

  function showSummary() {
    G.state = 'summary';
    const lvl = G.level, score = G.score;
    const stars = starsFor(G.wrong);
    const rec = Store.rec(lvl.id);
    const isRecord = score > (rec.best || 0);
    if (!G.resultSaved) {
      Store.setRec(lvl.id, { best: Math.max(rec.best || 0, score), stars: Math.max(rec.stars || 0, stars), done: (rec.done || 0) + 1 });
      G.resultSaved = true;
    }
    ui.sumTitle.textContent = '🎉 Hoàn thành màn ' + lvl.n + '!';
    ui.sumLevel.textContent = lvl.icon + ' ' + lvl.title + ' · ' + gradeLabel(lvl.grade);
    ui.sumScore.textContent = fmt(score);
    ui.sumStars.innerHTML = starsHtml(stars);
    ui.sumRecord.hidden = !isRecord;
    ui.stCorrect.textContent = G.correct;
    ui.stWrong.textContent = G.wrong;
    ui.stCombo.textContent = G.bestStreak;
    ui.review.hidden = !G.review.length;
    ui.reviewList.innerHTML = reviewHtml(G.review);
    const next = K.levelByN(lvl.n + 1);
    ui.sumNote.innerHTML = next
      ? 'Trả lời đúng <b>3 câu hỏi</b> để mở khóa màn ' + next.n + ': <b>' + esc(next.title) + '</b>!'
      : 'Trả lời đúng <b>3 câu hỏi</b> để nhận danh hiệu <b>Vua Xem Giờ</b>!';
    showHud(false);
    showScreen('summary');
    if (isRecord) { Sfx.play('record'); Sfx.play('applause'); spawnConfetti(120); }
    else if (stars >= 2) { Sfx.play('applause'); spawnConfetti(60); }
    releaseWake();
    setTimeout(function () { if (G.state === 'summary') Music.play('menu'); }, 2000);
  }

  function showFail() {
    G.state = 'fail-screen';
    const lvl = G.level;
    ui.failLevel.textContent = lvl.icon + ' Màn ' + lvl.n + ' · ' + lvl.title;
    ui.failInfo.textContent = 'Đã đúng ' + G.correct + '/' + lvl.goal + ' · Sai ' + G.wrong + ' lần · Điểm: ' + fmt(G.score);
    ui.failReview.hidden = !G.review.length;
    ui.failReviewList.innerHTML = reviewHtml(G.review);
    showHud(false);
    showScreen('fail');
    releaseWake();
    setTimeout(function () { if (G.state === 'fail-screen') Music.play('menu'); }, 1500);
  }

  function leaveGame() {
    clearTimeout(G.cdTimer);
    const was = inGame();
    G.level = null;
    G.cols = [];
    clearWorld();
    showHud(false);
    if (was) layout();
    releaseWake();
    Voice.stop();
    stopDemo();
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

  /* ================= CHỌN MÀN ================= */
  function renderLevels() {
    ui.levelGrid.innerHTML = K.LEVELS.map(function (l) {
      const rec = Store.rec(l.id);
      const locked = !Store.isUnlocked(l.n);
      return '<div class="level-card' + (locked ? ' locked' : '') + '" data-id="' + l.id + '" role="button">' +
        '<span class="grade ' + gradeClass(l.grade) + '">' + gradeLabel(l.grade) + '</span>' +
        '<div class="icon">' + (locked ? '🔒' : l.icon) + '</div>' +
        '<div class="name">Màn ' + l.n + ': ' + esc(l.title) + '</div>' +
        '<div class="desc">' + esc(l.desc) + '</div>' +
        (locked
          ? '<div class="meta"><span class="lock-note">Hoàn thành màn ' + (l.n - 1) + ' + hỏi đáp để mở</span></div>'
          : '<div class="meta"><span class="best">🏆 ' + fmt(rec.best || 0) + '</span><span class="stars">' + starsHtml(rec.stars || 0) + '</span></div>') +
        '</div>';
    }).join('');
  }

  function unlockAll() {
    let ans = null;
    try { ans = window.prompt('Dành cho phụ huynh, thầy cô: 7 × 8 = ?'); } catch (e) { ans = null; }
    if (ans === null) return;
    if (String(ans).trim() === '56') {
      Store.unlock(K.LEVELS.length);
      renderLevels();
      Sfx.play('unlock');
      toast('Đã mở khóa tất cả các màn! 🔓');
    } else {
      Sfx.play('wrong');
      toast('Chưa đúng rồi 🙈');
    }
  }

  /* ================= BÀI HỌC ================= */
  function stopDemo() {
    G.demo.list = [];
    G.demo.svg = null;
  }

  function openLesson(level, fromPause) {
    G.level = level;
    G.lessonFromPause = !!fromPause;
    if (!fromPause) G.state = 'lesson';
    const L = level.lesson;
    ui.lessonHead.textContent = level.icon + ' Màn ' + level.n + ' · ' + gradeLabel(level.grade);
    ui.lessonTitle.textContent = L.title;
    ui.lessonText.innerHTML = L.html;
    ui.lessonClock.innerHTML = K.svg(L.demo[0], { size: 230, ring: L.ring || null, digital: !!L.digital, badge: true });
    ui.lessonCaption.textContent = K.read(L.demo[0]);
    ui.lessonStart.textContent = fromPause ? '▶ Chơi tiếp' : '▶ Bắt đầu chơi';
    G.demo = { i: 0, next: G.anim + 3.0, svg: ui.lessonClock.querySelector('svg'), list: L.demo };
    showScreen('lesson');
    Voice.stop();
    Voice.say(L.speech, { rate: 0.95 });
  }

  function readLesson() {
    if (!G.level) return;
    if (!Voice.available) { toast('Thiết bị chưa có giọng đọc tiếng Việt 🙁'); return; }
    Voice.say(G.level.lesson.speech, { rate: 0.95 });
  }

  function lessonStart() {
    if (!G.level) return;
    if (G.lessonFromPause) {
      G.lessonFromPause = false;
      stopDemo();
      Voice.stop();
      showScreen('pause');
      resumeGame();
      return;
    }
    startLevel(G.level);
  }

  /* ================= HỎI ĐÁP ================= */
  function startQuiz() {
    if (!G.level) return;
    G.state = 'quiz';
    const mistakes = G.review.map(function (r) { return r.t; });
    G.quiz = { qs: K.quizFor(G.level.n, mistakes), i: 0, firstTry: 0, wrongOnThis: false, done: false };
    ui.quizDone.hidden = true;
    ui.quizBody.hidden = false;
    renderQuizQuestion();
    showScreen('quiz');
    Music.play('menu');
  }

  function renderQuizQuestion() {
    const Qz = G.quiz;
    const q = Qz.qs[Qz.i];
    const n = Qz.qs.length;
    ui.quizHead.textContent = '📝 Câu ' + (Qz.i + 1) + '/' + n;
    let dots = '';
    for (let i = 0; i < n; i++) dots += '<span class="' + (i < Qz.i ? 'done' : i === Qz.i ? 'cur' : '') + '"></span>';
    ui.quizDots.innerHTML = dots;
    ui.quizQ.textContent = q.q;
    ui.quizClock.innerHTML = q.clock ? K.svg(q.clock, { size: 210, badge: true, ring: G.level && G.level.ring && G.level.n <= 5 ? G.level.ring : null }) : '';
    ui.quizClock.hidden = !q.clock;
    const order = K.shuffle(q.choices.map(function (c, i) { return { text: c, i: i }; }));
    ui.quizChoices.innerHTML = order.map(function (o) {
      return '<button type="button" class="choice" data-text="' + esc(o.text) + '">' + esc(o.text) + '</button>';
    }).join('');
    ui.quizFeedback.hidden = true;
    ui.quizFeedback.className = 'quiz-feedback';
    Qz.wrongOnThis = false;
    Voice.stop();
    Voice.say(q.speech || q.q);
  }

  function quizAnswer(text) {
    const Qz = G.quiz;
    if (!Qz || Qz.done) return;
    const q = Qz.qs[Qz.i];
    if (!ui.quizFeedback.hidden) return;
    const correct = text === q.choices[0];
    const btns = ui.quizChoices.querySelectorAll('.choice');
    for (let i = 0; i < btns.length; i++) {
      const b = btns[i];
      b.disabled = true;
      if (b.getAttribute('data-text') === text) b.classList.add(correct ? 'ok' : 'bad');
      if (correct && b.getAttribute('data-text') === q.choices[0]) b.classList.add('ok');
    }
    ui.quizFeedback.hidden = false;
    if (correct) {
      if (!Qz.wrongOnThis) Qz.firstTry++;
      ui.quizFeedback.className = 'quiz-feedback ok';
      ui.quizExplain.innerHTML = '<b>✅ Chính xác!</b> ' + esc(q.explain);
      ui.quizNext.hidden = false;
      ui.quizRetry.hidden = true;
      ui.quizNext.textContent = Qz.i + 1 < Qz.qs.length ? 'Câu tiếp theo ▶' : 'Xem kết quả 🏆';
      Sfx.play('quizok');
      Voice.say('Đúng rồi! ' + q.explain, { rate: 0.98 });
    } else {
      Qz.wrongOnThis = true;
      ui.quizFeedback.className = 'quiz-feedback bad';
      ui.quizExplain.innerHTML = '<b>❌ Chưa đúng.</b> 💡 ' + esc(q.explain);
      ui.quizNext.hidden = true;
      ui.quizRetry.hidden = false;
      Sfx.play('quizbad');
      Voice.say('Chưa đúng. ' + q.explain, { rate: 0.98 });
    }
  }

  function quizRetry() {
    const Qz = G.quiz;
    if (!Qz) return;
    const wasWrong = Qz.wrongOnThis;
    renderQuizQuestion();
    Qz.wrongOnThis = wasWrong;
  }

  function quizNext() {
    const Qz = G.quiz;
    if (!Qz) return;
    Qz.i++;
    if (Qz.i < Qz.qs.length) renderQuizQuestion(); else quizDone();
  }

  function quizDone() {
    const Qz = G.quiz, lvl = G.level;
    Qz.done = true;
    const next = K.levelByN(lvl.n + 1);
    const newly = next ? Store.unlock(next.n) : false;
    ui.quizBody.hidden = true;
    ui.quizDone.hidden = false;
    ui.quizHead.textContent = '📝 Hỏi đáp';
    ui.quizDots.innerHTML = '';
    let title, text;
    if (next) {
      title = newly ? 'Mở khóa màn ' + next.n + ': ' + next.title + '!' : 'Xuất sắc! Màn ' + next.n + ' đang chờ bạn!';
      text = 'Bạn trả lời đúng ngay lần đầu <b>' + Qz.firstTry + '/' + Qz.qs.length + '</b> câu. ' + (newly ? 'Màn tiếp theo đã sẵn sàng!' : 'Màn ' + next.n + ' đang chờ bạn!');
      ui.quizNextLevel.hidden = false;
      ui.quizNextLevel.textContent = '▶ Chơi màn ' + next.n + ': ' + next.title;
    } else {
      title = '👑 Vua Xem Giờ!';
      text = 'Bạn đã hoàn thành tất cả các màn và trả lời đúng ngay lần đầu <b>' + Qz.firstTry + '/' + Qz.qs.length + '</b> câu. Tuyệt vời!';
      ui.quizNextLevel.hidden = true;
    }
    ui.quizDoneTitle.textContent = title;
    ui.quizDoneText.innerHTML = text;
    Sfx.play(newly ? 'unlock' : 'clear');
    Sfx.play('applause');
    spawnConfetti(140);
    Voice.say(next ? (newly ? 'Mở khóa màn ' + next.n + '! Giỏi quá!' : 'Xuất sắc!') : 'Bạn là Vua Xem Giờ! Tuyệt vời!');
  }

  /* ================= ĐẦU VÀO ================= */
  function boardColAt(x) {
    const B = G.board;
    return clamp(Math.floor((x - B.x) / B.cell), 0, COLS - 1);
  }

  function onCanvasDown(e) {
    Sfx.unlock();
    if (G.state !== 'playing') return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const p = G.piece;
    if (!p || p.mode !== 'fall') return;
    const B = G.board;
    if (e.clientX < B.x - B.cell * 0.6 || e.clientX > B.x + B.w + B.cell * 0.6) return;
    if (e.clientY < B.top - 20 || e.clientY > B.y + B.h + B.plateH + 20) return;
    const col = boardColAt(e.clientX);
    G.drag = { id: e.pointerId, x0: e.clientX, col0: col, moved: false, t0: G.anim };
    if (col === p.col) hardDrop();
    else moveTo(col);
    if (e.cancelable) e.preventDefault();
  }

  function onCanvasMove(e) {
    const d = G.drag;
    if (!d || d.id !== e.pointerId || G.state !== 'playing') return;
    const col = boardColAt(e.clientX);
    if (Math.abs(e.clientX - d.x0) > G.board.cell * 0.45) d.moved = true;
    if (d.moved && G.piece && col !== G.piece.col) moveTo(col);
  }

  function onCanvasUp(e) {
    const d = G.drag;
    if (d && d.id === e.pointerId) G.drag = null;
  }

  function bindInput() {
    canvas.addEventListener('pointerdown', onCanvasDown);
    canvas.addEventListener('pointermove', onCanvasMove);
    canvas.addEventListener('pointerup', onCanvasUp);
    canvas.addEventListener('pointercancel', onCanvasUp);
    ui.controls.addEventListener('pointerdown', function (e) {
      const b = e.target.closest ? e.target.closest('button[data-act]') : null;
      if (!b) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      Sfx.unlock();
      if (e.cancelable) e.preventDefault();
      b.classList.add('pressed');
      setTimeout(function () { b.classList.remove('pressed'); }, 110);
      const act = b.getAttribute('data-act');
      if (act === 'left') moveLeft();
      else if (act === 'right') moveRight();
      else if (act === 'drop') hardDrop();
    });
    document.addEventListener('touchmove', function (e) { if ((e.target === canvas || ui.controls.contains(e.target)) && e.cancelable) e.preventDefault(); }, { passive: false });
    document.addEventListener('touchstart', function (e) { if (e.target === canvas && e.cancelable) e.preventDefault(); }, { passive: false });
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    document.addEventListener('dblclick', function (e) { if (e.target === canvas || ui.controls.contains(e.target)) e.preventDefault(); });
    document.addEventListener('contextmenu', function (e) { if (e.target === canvas) e.preventDefault(); });
    document.addEventListener('pointerdown', function () { Sfx.unlock(); }, true);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (G.state === 'playing') pauseGame(); else if (G.state === 'paused') resumeGame();
        return;
      }
      if (G.state !== 'playing') return;
      if (e.key === 'ArrowLeft') { moveLeft(); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { moveRight(); e.preventDefault(); }
      else if (e.key === 'ArrowDown') { G.softDrop = true; e.preventDefault(); }
      else if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowUp') { hardDrop(); e.preventDefault(); }
      else if (/^[1-4]$/.test(e.key)) { moveTo(Number(e.key) - 1); e.preventDefault(); }
    });
    document.addEventListener('keyup', function (e) { if (e.key === 'ArrowDown') G.softDrop = false; });
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
      { key: 'voice', on: '🗣️ Giọng đọc: Bật', off: '🗣️ Giọng đọc: Tắt' }
    ];
    const boxes = document.querySelectorAll('[data-audio-toggles]');
    for (let i = 0; i < boxes.length; i++) {
      boxes[i].innerHTML = defs.map(function (d) {
        const noVoice = d.key === 'voice' && !Voice.available;
        const on = Store.data[d.key] !== false && !noVoice;
        let label = on ? d.on : d.off;
        if (noVoice) label = '🗣️ Giọng đọc: chưa có giọng Việt';
        return '<button type="button" class="toggle ' + (on ? 'on' : 'off') + '" data-set="' + d.key + '"' +
          (noVoice ? ' disabled' : '') + '>' + label + '</button>';
      }).join('');
    }
  }

  function bindReviewList(el, listGetter) {
    el.addEventListener('click', function (e) {
      const it = e.target.closest ? e.target.closest('.review-item') : null;
      if (!it) return;
      const r = listGetter()[Number(it.getAttribute('data-i'))];
      if (!r) return;
      Sfx.unlock();
      Sfx.play('click');
      Voice.say('Đồng hồ chỉ ' + r.speech);
      it.classList.remove('speaking');
      void it.offsetWidth;
      it.classList.add('speaking');
    });
  }

  function bindUi() {
    click('btn-play', function () { goLevels(); });
    click('btn-howto', function () { ui.howto.classList.remove('hidden'); });
    click('btn-levels-howto', function () { ui.howto.classList.remove('hidden'); });
    click('btn-howto-close', function () { ui.howto.classList.add('hidden'); });
    click('btn-levels-back', function () { goMenu(); });
    click('btn-unlock-all', function () { unlockAll(); });
    click('btn-lesson-back', function () {
      if (G.lessonFromPause) { G.lessonFromPause = false; stopDemo(); Voice.stop(); showScreen('pause'); return; }
      goLevels();
    });
    click('btn-lesson-read', function () { readLesson(); });
    click('btn-lesson-start', function () { lessonStart(); });
    click('btn-pause', function () { pauseGame(); });
    click('btn-resume', function () { resumeGame(); });
    click('btn-lesson-again', function () { if (G.level) openLesson(G.level, true); });
    click('btn-restart', function () { const l = G.level; if (l) startLevel(l); });
    click('btn-quit', function () { goMenu(); });
    click('btn-quiz', function () { startQuiz(); });
    click('btn-sum-home', function () { goMenu(); });
    click('btn-fail-retry', function () { const l = G.level; if (l) startLevel(l); });
    click('btn-fail-lesson', function () { const l = G.level; if (l) { stopDemo(); openLesson(l, false); } });
    click('btn-fail-levels', function () { goLevels(); });
    click('btn-fail-home', function () { goMenu(); });
    click('btn-quiz-next', function () { quizNext(); });
    click('btn-quiz-retry', function () { quizRetry(); });
    click('btn-quiz-read', function () {
      const Qz = G.quiz;
      if (!Qz || Qz.done) return;
      if (!Voice.available) { toast('Thiết bị chưa có giọng đọc tiếng Việt 🙁'); return; }
      const q = Qz.qs[Qz.i];
      Voice.say((q.speech || q.q) + '. ' + q.choices.slice().sort().join('. '), { rate: 0.95 });
    });
    click('btn-quiz-next-level', function () {
      const next = G.level ? K.levelByN(G.level.n + 1) : null;
      if (!next) { goLevels(); return; }
      leaveGame();
      openLesson(next, false);
    });
    click('btn-quiz-replay', function () { const l = G.level; if (l) startLevel(l); });
    click('btn-quiz-levels', function () { goLevels(); });
    click('btn-quiz-home', function () { goMenu(); });

    ui.quizChoices.addEventListener('click', function (e) {
      const b = e.target.closest ? e.target.closest('button.choice') : null;
      if (!b || b.disabled) return;
      Sfx.unlock();
      quizAnswer(b.getAttribute('data-text'));
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
        if (k === 'sound') Sfx.play('pop');
        if (k === 'voice') Voice.say('Xin chào! Cùng học xem đồng hồ nào!');
      } else {
        Sfx.play('click');
      }
    });

    ui.levelGrid.addEventListener('click', function (e) {
      const card = e.target.closest('.level-card');
      if (!card) return;
      const lvl = K.levelById(card.getAttribute('data-id'));
      if (!lvl) return;
      Sfx.unlock();
      if (!Store.isUnlocked(lvl.n)) {
        Sfx.play('wrong');
        card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
        toast('🔒 Hoàn thành màn ' + (lvl.n - 1) + ' và trả lời đúng câu hỏi để mở khóa nhé!', 2600);
        return;
      }
      Sfx.play('click');
      openLesson(lvl, false);
    });

    bindReviewList(ui.reviewList, function () { return G.review; });
    bindReviewList(ui.failReviewList, function () { return G.review; });

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
  window.__ThapDongHo = {
    G: G, Store: Store, K: K, startLevel: startLevel, openLesson: openLesson, goLevels: goLevels, goMenu: goMenu,
    moveTo: moveTo, hardDrop: hardDrop, spawnPiece: spawnPiece, landPiece: landPiece, levelClear: levelClear, towerFail: towerFail,
    showSummary: showSummary, startQuiz: startQuiz, quizAnswer: quizAnswer, quizNext: quizNext, quizRetry: quizRetry,
    update: update, render: render, layout: layout, stackH: stackH, pauseGame: pauseGame, resumeGame: resumeGame
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
