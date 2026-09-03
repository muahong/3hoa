/* ============================================================
   game.js – Bộ máy trò chơi Cưỡi Hổ Vượt Lửa
   - Canvas 2D, vòng lặp requestAnimationFrame theo thời gian thực (dt)
   - Bé cưỡi hổ chạy qua rạp xiếc; mỗi cụm 3 vòng lửa mang 3 đáp án,
     chạm vào vòng có đáp án đúng để hổ nhảy qua
   - Mỗi màn: Bài học → Vượt vòng lửa → Hỏi đáp (mở khóa màn tiếp theo)
   ============================================================ */
(function () {
  'use strict';

  const L = window.Lessons, Sfx = window.Sfx, Music = window.Music, Voice = window.Voice;
  const rnd = L.rnd, chance = L.chance, pick = L.pick, esc = L.esc;
  const TAU = Math.PI * 2;
  const FONT = '"Baloo 2", "Arial Rounded MT Bold", "Segoe UI", Arial, sans-serif';
  const $ = function (id) { return document.getElementById(id); };
  const clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  const PRAISE = ['Tuyệt vời!', 'Giỏi quá!', 'Đúng rồi!', 'Hổ bay!', 'Xuất sắc!', 'Nhảy đẹp!', 'Siêu đỉnh!', 'Hay lắm!'];
  const MAX_HEARTS = 3;
  const MAX_PARTS = 450;
  const JUMP_T = 0.85;        // giây cho một cú nhảy qua vòng
  const LEARN_T = 2.8;        // giây dừng lại nhìn đáp án đúng sau khi sai
  const RUN_GAP_T = 1.4;      // giây chạy giữa hai cụm vòng lửa
  const LANES = 3;            // số vòng lửa mỗi cụm (trên, giữa, dưới)

  /* ================= LƯU TRỮ (localStorage) ================= */
  const Store = {
    key: 'cuoi-ho-v1',
    data: { sound: true, music: true, voice: true, seenTip: false, progress: { unlocked: 1, levels: {}, badge: false } },
    load() {
      try {
        const raw = localStorage.getItem(this.key);
        if (raw) {
          const d = JSON.parse(raw);
          if (d && typeof d === 'object') Object.assign(this.data, d);
        }
      } catch (e) { /* bỏ qua */ }
      if (!this.data.progress || typeof this.data.progress !== 'object') this.data.progress = { unlocked: 1, levels: {}, badge: false };
      if (!this.data.progress.levels) this.data.progress.levels = {};
      if (!(this.data.progress.unlocked >= 1)) this.data.progress.unlocked = 1;
    },
    save() {
      try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* bỏ qua */ }
    },
    lv(id) {
      return this.data.progress.levels[id] || { best: 0, stars: 0, quiz: false, done: false, plays: 0 };
    },
    setLv(id, rec) {
      this.data.progress.levels[id] = rec;
      this.save();
    },
    isUnlocked(level) { return level.index + 1 <= this.data.progress.unlocked; },
    unlockUpTo(n) {
      if (n > this.data.progress.unlocked) { this.data.progress.unlocked = n; this.save(); return true; }
      return false;
    }
  };

  /* ================= TRẠNG THÁI ================= */
  const G = {
    W: 0, H: 0, dpr: 1,
    state: 'menu',            // menu | levels | lesson | notes | countdown | playing | paused | over | quiz
    level: null,
    anim: 0,                  // đồng hồ hoạt hình (luôn chạy)
    time: 0,                  // đồng hồ ván chơi
    ground: 0, hudBottom: 0, r: 60, tigerX: 200, stopX: 400, jumpDist: 160, speed: 380, laneY: [0, 0, 0],
    scroll: 0, phase: 'run',  // run | choose | jump | learn | finish | done
    gates: [], gateIdx: 0, gateTime: 0, jumpT: 0, learnT: 0, finishX: 0, doneT: 0, gap: 600,
    tiger: { y: 0, phase: 0, state: 'run', hurt: 0, cheer: 0, blink: 0, tilt: 0, jumpH: 0 },
    parts: [], texts: [], bg: null, tileGround: null, tileAud: null, tileW: 480, audW: 720,
    shake: 0, flash: null, glowCache: {},
    score: 0, hearts: MAX_HEARTS, streak: 0, bestStreak: 0, correct: 0, wrong: 0, review: [], firstChoice: true,
    hud: { score: -1, hearts: -1, stage: -1, mult: -1, time: '' },
    cdTimer: 0, resultShown: false, overAt: -1, endReason: '', wakeLock: null, cursor: 1, attractT: 0,
    lastCrackle: 0, lastStep: 0, quizPassedNow: false,
    perf: { n: 0, update: 0, render: 0, avgUpdate: 0, avgRender: 0 }
  };

  /* ================= DOM ================= */
  const app = $('app');
  const canvas = $('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  const ui = {
    hud: $('hud'), menu: $('menu'), levels: $('levels'), lesson: $('lesson'), notes: $('notes'), howto: $('howto'),
    countdown: $('countdown'), pause: $('pause'), gameover: $('gameover'), quiz: $('quiz'), toast: $('toast'),
    score: $('hud-score'), stage: $('hud-stage'), combo: $('hud-combo'), question: $('hud-question'), visual: $('hud-visual'), prompt: $('hud-prompt'),
    timer: $('hud-timer'), timerFill: $('hud-timer-fill'), time: $('hud-time'), hearts: $('hud-hearts'), hint: $('hud-hint'), tapTip: $('tap-tip'),
    countNum: $('count-num'), levelGrid: $('level-grid'), journeyStats: $('journey-stats'),
    lessonTitle: $('lesson-title'), slideVisual: $('slide-visual'), slideText: $('slide-text'), slideDots: $('slide-dots'),
    slidePrev: $('btn-slide-prev'), slideNext: $('btn-slide-next'), lessonStart: $('btn-lesson-start'), lessonSkip: $('btn-lesson-skip'), lessonBack: $('btn-lesson-back'),
    notesList: $('notes-list'),
    resultTitle: $('result-title'), resultLevel: $('result-level'), resultScore: $('result-score'), resultStars: $('result-stars'), resultRecord: $('result-record'),
    stCorrect: $('st-correct'), stWrong: $('st-wrong'), stCombo: $('st-combo'), stAcc: $('st-acc'),
    review: $('review'), reviewChips: $('review-chips'), resultMsg: $('result-msg'),
    btnQuiz: $('btn-quiz'), btnAgain: $('btn-again'), btnNextLevel: $('btn-next-level'),
    quizTitle: $('quiz-title'), quizDots: $('quiz-dots'), quizBody: $('quiz-body'), quizVisual: $('quiz-visual'), quizText: $('quiz-text'),
    quizAnswers: $('quiz-answers'), quizFeedback: $('quiz-feedback'), quizNext: $('btn-quiz-next'), quizRetry: $('btn-quiz-retry'),
    quizDone: $('quiz-done'), unlockArt: $('unlock-art'), unlockTitle: $('unlock-title'), unlockDesc: $('unlock-desc'), quizPlayNext: $('btn-quiz-play-next'),
    ipadTip: $('ipad-tip')
  };
  const SCREENS = ['menu', 'levels', 'lesson', 'notes', 'countdown', 'pause', 'gameover', 'quiz'];

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
  }

  /** Tính mặt đất, bán kính vòng lửa, vị trí hổ, độ dài cú nhảy theo kích thước màn hình. */
  function layout() {
    const W = G.W, H = G.H;
    // Điện thoại xoay ngang (màn hình rất thấp): HUD xếp gọn một hàng (CSS), mặt đất và vòng lửa được phép nhỏ hơn
    const shortLand = W > H && H < 480;
    G.ground = H - clamp(H * 0.13, shortLand ? 48 : 56, 120);
    let hudBottom = clamp(H * 0.24, shortLand ? 80 : 130, 210);
    if (inGame()) {
      try {
        // Khi xếp ngang (điện thoại nằm ngang), thẻ câu hỏi có thể thấp hơn ô đếm giờ nên lấy mép dưới thấp nhất của cả hai
        hudBottom = Math.max(shortLand ? 64 : 110, hudCenterBottom() + 8);
      } catch (e) { /* bỏ qua */ }
    }
    G.hudBottom = hudBottom;
    const avail = G.ground - 12 - hudBottom - 10;
    G.r = clamp(Math.min(avail / 6.9, W * 0.14, 84), shortLand ? 28 : 34, 84);
    // Cú nhảy ngắn hơn trên màn hình hẹp để sau khi nhảy, cụm vòng vẫn còn trên màn hình (bé nhìn thấy vòng đúng)
    const narrow = W < H || W < 700;
    G.jumpDist = clamp(G.r * (narrow ? 1.7 : 2.4), 90, 260);
    G.tigerX = Math.round(clamp(W * (narrow ? 0.24 : 0.27), G.jumpDist + G.r * 1.35, Math.max(G.jumpDist + G.r * 1.35, W - G.r * 1.3 - G.jumpDist)));
    G.stopX = G.tigerX + G.jumpDist;
    const low = G.ground - G.r - 10;
    G.laneY = [low - G.r * 4.6, low - G.r * 2.3, low];
    setSpeed();
    G.glowCache = {};
    buildBackground();
    buildTiles();
    repositionGates();
  }

  /** Mép dưới của một phần tử theo hộp bố cục (bỏ qua transform của hiệu ứng pop/lắc). */
  function layoutBottom(el) {
    const parent = el.offsetParent;
    return (parent ? parent.getBoundingClientRect().top : 0) + el.offsetTop + el.offsetHeight;
  }
  /** Mép dưới thấp nhất của thẻ câu hỏi và ô đếm giờ (không tính gợi ý tạm thời). */
  function hudCenterBottom() {
    return Math.max(layoutBottom(ui.question), layoutBottom(ui.timer));
  }

  function setSpeed() {
    G.speed = clamp(G.W * 0.42, 260, 520) * (G.level ? G.level.speed : 0.75);
    G.gap = Math.max(G.speed * RUN_GAP_T, G.W * 0.45) + G.jumpDist * 2 + G.r;
  }

  /** Sau khi đổi kích thước giữa ván: dời các cụm vòng chưa qua theo khoảng cách mới. */
  function repositionGates() {
    if (!G.gates.length) return;
    const cur = G.gates[Math.min(G.gateIdx, G.gates.length - 1)];
    if (G.phase === 'choose' || G.phase === 'jump' || G.phase === 'learn') {
      // giữ nguyên vị trí màn hình của cụm hiện tại
      const sx = G.phase === 'choose' ? G.stopX : cur.wx - G.scroll;
      G.scroll = cur.wx - sx;
    }
    for (let i = G.gateIdx + 1; i < G.gates.length; i++) G.gates[i].wx = cur.wx + (i - G.gateIdx) * G.gap;
    G.finishX = G.gates[G.gates.length - 1].wx + G.gap * 0.9;
  }

  function layer(w, h, fn) {
    const c = document.createElement('canvas');
    c.width = Math.round(w * G.dpr); c.height = Math.round(h * G.dpr);
    const cx = c.getContext('2d');
    cx.scale(G.dpr, G.dpr);
    fn(cx);
    return c;
  }

  function seededRand(seed) {
    let s = (seed >>> 0) || 1;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  /** Nền tĩnh: bầu trời đêm, sao, trăng, rạp xiếc ở xa (vẽ 1 lần). */
  function buildBackground() {
    const W = G.W, H = G.H, gr = G.ground;
    if (!W || !H) return;
    G.bg = layer(W, H, function (c) {
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#120833');
      g.addColorStop(0.5, '#33155e');
      g.addColorStop(1, '#7a2d5e');
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
      const rand = seededRand(99);
      // Sao
      for (let i = 0; i < 140; i++) {
        const x = W * rand(), y = gr * 0.75 * rand(), r = 0.5 + rand() * 1.5;
        c.fillStyle = 'rgba(255,255,255,' + (0.3 + rand() * 0.6).toFixed(2) + ')';
        c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
      }
      // Trăng
      const mx = W * 0.82, my = Math.min(gr * 0.22, 120), mr = clamp(Math.min(W, H) * 0.05, 22, 46);
      const mg = c.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 3);
      mg.addColorStop(0, 'rgba(255,240,190,0.35)'); mg.addColorStop(1, 'rgba(255,240,190,0)');
      c.fillStyle = mg; c.beginPath(); c.arc(mx, my, mr * 3, 0, TAU); c.fill();
      c.fillStyle = '#fff2c2'; c.beginPath(); c.arc(mx, my, mr, 0, TAU); c.fill();
      c.fillStyle = 'rgba(200,180,120,0.35)';
      c.beginPath(); c.arc(mx - mr * 0.3, my - mr * 0.2, mr * 0.22, 0, TAU); c.fill();
      c.beginPath(); c.arc(mx + mr * 0.25, my + mr * 0.3, mr * 0.16, 0, TAU); c.fill();
      // Lều xiếc ở xa (bóng)
      const tents = [[W * 0.12, 1.0], [W * 0.5, 1.3], [W * 0.88, 0.9]];
      tents.forEach(function (t) {
        const cx = t[0], s = t[1], bw = clamp(W * 0.22, 140, 340) * s, bh = clamp(H * 0.12, 50, 110) * s, th = bh * 1.5;
        const base = gr - clamp(G.r * 2.4, 60, 200);
        // thân lều sọc
        for (let i = 0; i < 8; i++) {
          c.fillStyle = i % 2 ? '#5b1c46' : '#7c2556';
          c.fillRect(cx - bw / 2 + (bw / 8) * i, base - bh, bw / 8 + 1, bh);
        }
        // mái
        c.fillStyle = '#8f2c62';
        c.beginPath(); c.moveTo(cx - bw / 2 - 12, base - bh); c.lineTo(cx, base - bh - th); c.lineTo(cx + bw / 2 + 12, base - bh); c.closePath(); c.fill();
        c.fillStyle = '#b23b78';
        c.beginPath(); c.moveTo(cx - bw * 0.18, base - bh); c.lineTo(cx, base - bh - th); c.lineTo(cx + bw * 0.18, base - bh); c.closePath(); c.fill();
        // cờ
        c.fillStyle = '#ffd166';
        c.beginPath(); c.moveTo(cx, base - bh - th); c.lineTo(cx, base - bh - th - 22 * s); c.lineTo(cx + 18 * s, base - bh - th - 15 * s); c.closePath(); c.fill();
        // đèn quanh mái
        for (let i = 0; i <= 6; i++) {
          const px = cx - bw / 2 + (bw / 6) * i;
          c.fillStyle = i % 2 ? '#ffe066' : '#ff9f1c';
          c.beginPath(); c.arc(px, base - bh + 4, 3.2 * s, 0, TAU); c.fill();
        }
      });
      // Khán đài ở xa (dải tối) và hàng rào
      const base = gr - clamp(G.r * 2.4, 60, 200);
      const sg = c.createLinearGradient(0, base - 10, 0, gr);
      sg.addColorStop(0, '#3a1447'); sg.addColorStop(1, '#5c2a5a');
      c.fillStyle = sg; c.fillRect(0, base - 6, W, gr - base + 6);
    });
  }

  /** Các lớp cuộn được (lặp theo chiều ngang): khán giả + dây cờ, và mặt đất sân xiếc. */
  function buildTiles() {
    const W = G.W, H = G.H, gr = G.ground, r = G.r;
    if (!W || !H) return;
    // --- Khán giả ---
    const AW = G.audW = 720;
    const AH = clamp(r * 2.6, 70, 210);
    G.audH = AH;
    G.tileAud = layer(AW, AH, function (c) {
      const rand = seededRand(7);
      const cols = ['#ff6b6b', '#ffd166', '#06d6a0', '#4cc9f0', '#f72585', '#ff9f1c', '#b5e48c', '#c77dff'];
      const rows = 3;
      for (let row = 0; row < rows; row++) {
        const y = AH * (0.32 + row * 0.24);
        const sz = clamp(r * 0.24, 6, 16) * (1 + row * 0.12);
        // băng ghế
        c.fillStyle = row % 2 ? 'rgba(60,20,70,0.55)' : 'rgba(90,35,95,0.55)';
        c.fillRect(0, y + sz * 0.6, AW, sz * 1.3);
        for (let x = (row % 2) * sz; x < AW; x += sz * 2.1) {
          const col = cols[Math.floor(rand() * cols.length)];
          // thân
          c.fillStyle = col; c.globalAlpha = 0.75;
          c.beginPath(); c.ellipse(x + sz * 0.5, y + sz * 0.7, sz * 0.75, sz * 0.6, 0, Math.PI, TAU); c.fill();
          // đầu
          c.fillStyle = ['#ffd6b0', '#f1c27d', '#e0ac69', '#8d5524'][Math.floor(rand() * 4)];
          c.beginPath(); c.arc(x + sz * 0.5, y, sz * 0.42, 0, TAU); c.fill();
          c.globalAlpha = 1;
        }
      }
      // Dây cờ đuôi nheo phía trên
      c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(0, 6); c.quadraticCurveTo(AW * 0.25, 22, AW * 0.5, 6); c.quadraticCurveTo(AW * 0.75, 22, AW, 6); c.stroke();
      for (let i = 0; i < 12; i++) {
        const t = (i + 0.5) / 12;
        const x = AW * t;
        const seg = t < 0.5 ? t * 2 : (t - 0.5) * 2;
        const y = 6 + 16 * (1 - Math.pow(2 * seg - 1, 2)) * 0.5 + 4;
        c.fillStyle = cols[i % cols.length];
        c.beginPath(); c.moveTo(x - 9, y - 2); c.lineTo(x + 9, y - 2); c.lineTo(x, y + 14); c.closePath(); c.fill();
      }
    });
    // --- Mặt đất ---
    const TW = G.tileW = 480;
    const TH = H - gr + 2;
    G.tileGround = layer(TW, TH, function (c) {
      const g = c.createLinearGradient(0, 0, 0, TH);
      g.addColorStop(0, '#e8b877'); g.addColorStop(1, '#b8804a');
      c.fillStyle = g; c.fillRect(0, 0, TW, TH);
      // viền sân xiếc sọc đỏ trắng
      const bh = clamp(r * 0.28, 10, 20);
      for (let x = 0; x < TW; x += 40) {
        c.fillStyle = (x / 40) % 2 ? '#d62828' : '#fff5e6';
        c.fillRect(x, 0, 40, bh);
      }
      c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(0, bh, TW, 3);
      // vệt cát, hoa văn
      const rand = seededRand(3);
      c.fillStyle = 'rgba(255,255,255,0.12)';
      for (let i = 0; i < 26; i++) {
        c.beginPath(); c.ellipse(TW * rand(), bh + 8 + (TH - bh - 12) * rand(), 4 + rand() * 12, 1.5 + rand() * 2.5, 0, 0, TAU); c.fill();
      }
      c.fillStyle = 'rgba(120,60,20,0.16)';
      for (let i = 0; i < 18; i++) {
        c.beginPath(); c.arc(TW * rand(), bh + 6 + (TH - bh - 10) * rand(), 1.5 + rand() * 2.5, 0, TAU); c.fill();
      }
      // ngôi sao vàng trên sàn
      for (let i = 0; i < 3; i++) star(c, 60 + i * 160 + rand() * 40, bh + 14 + rand() * (TH - bh - 30), 6 + rand() * 5, 'rgba(255,209,102,0.45)');
    });
  }

  function star(c, x, y, r, color) {
    c.fillStyle = color;
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const rr = i % 2 ? r * 0.45 : r;
      if (i === 0) c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    c.closePath(); c.fill();
  }

  /* ================= HẠT & CHỮ BAY ================= */
  function addText(text, x, y, o) {
    const t = { text: text, x: x, y: y, vy: -55, life: 1.1, max: 1.1, size: G.r * 0.7, color: '#fff', stroke: 'rgba(30,10,40,0.9)', t: 0 };
    if (o) for (const k in o) t[k] = o[k];
    t.max = t.life;
    G.texts.push(t);
  }
  function addPart(p) {
    if (G.parts.length >= MAX_PARTS) G.parts.shift();
    G.parts.push(p);
  }
  function spawnBurst(x, y, r) {
    for (let i = 0; i < 34; i++) {
      const a = Math.random() * TAU, sp = 120 + Math.random() * 360;
      addPart({ kind: 'spark', x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, size: r * (0.05 + Math.random() * 0.07),
        color: pick(['#ffd166', '#ff9f1c', '#ffffff', '#ffe66d', '#ff6b35']), life: 0.5 + Math.random() * 0.5, max: 1 });
    }
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * TAU, sp = 60 + Math.random() * 160;
      addPart({ kind: 'star', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, size: r * (0.12 + Math.random() * 0.14), rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 8,
        color: pick(['#ffd166', '#ffffff', '#ffe066']), life: 0.8 + Math.random() * 0.5, max: 1.3 });
    }
  }
  function spawnSmoke(x, y, r) {
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * TAU, sp = 30 + Math.random() * 80;
      addPart({ kind: 'puff', x: x + Math.cos(a) * r * 0.6, y: y + Math.sin(a) * r * 0.6, vx: Math.cos(a) * sp * 0.4, vy: -40 - Math.random() * 60, size: r * (0.2 + Math.random() * 0.25), grow: r * 0.5,
        color: pick(['rgba(70,60,80,0.6)', 'rgba(110,100,120,0.55)', 'rgba(50,40,60,0.6)']), life: 0.8 + Math.random() * 0.6, max: 1.4 });
    }
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * TAU, sp = 100 + Math.random() * 220;
      addPart({ kind: 'spark', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, size: r * (0.05 + Math.random() * 0.06), color: pick(['#ff3d00', '#ff7b1c', '#ffb703']), life: 0.4 + Math.random() * 0.4, max: 0.8 });
    }
  }
  function spawnEmber(x, y, r) {
    addPart({ kind: 'ember', x: x, y: y, vx: (Math.random() - 0.5) * 30, vy: -40 - Math.random() * 70, size: r * (0.03 + Math.random() * 0.04), color: pick(['#ffb703', '#ff7b1c', '#ffe066']), life: 0.6 + Math.random() * 0.7, max: 1.3 });
  }
  function spawnConfetti(n) {
    const cols = ['#ff6b35', '#ffd166', '#06d6a0', '#118ab2', '#ef476f', '#7b5ea7', '#2ec4b6'];
    for (let i = 0; i < n; i++) {
      addPart({ kind: 'confetti', x: Math.random() * G.W, y: -20 - Math.random() * G.H * 0.5, vx: (Math.random() - 0.5) * 80, vy: 80 + Math.random() * 160,
        size: 6 + Math.random() * 8, color: pick(cols), rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 8, life: 4 + Math.random() * 2, max: 6, sway: Math.random() * TAU });
    }
  }
  function spawnHearts(x, y, r) {
    for (let i = 0; i < 8; i++) {
      addPart({ kind: 'heart', x: x + (Math.random() - 0.5) * r, y: y, vx: (Math.random() - 0.5) * 60, vy: -60 - Math.random() * 80, size: r * (0.12 + Math.random() * 0.1), color: pick(['#ff6b8b', '#ff8fb1']), life: 0.8 + Math.random() * 0.5, max: 1.3 });
    }
  }

  /* ================= CỤM VÒNG LỬA (GATE) ================= */
  function buildGates() {
    G.gates = [];
    const n = G.level.gates || 10;
    const first = G.stopX + G.speed * 1.3;
    for (let i = 0; i < n; i++) {
      const q = L.fresh(G.level.gen);
      G.gates.push({
        i: i, q: q, wx: first + i * G.gap, chosen: -1, result: null, evaluated: false, active: false, passed: false, answeredAt: 0,
        rings: [0, 1, 2].map(function () { return { burst: -1, flare: 0, reveal: false }; })
      });
    }
    G.finishX = G.gates[n - 1].wx + G.gap * 0.9;
  }

  function curGate() { return G.gates[G.gateIdx] || null; }
  function gateX(gate) { return gate.wx - G.scroll; }

  function activateGate(gate) {
    gate.active = true;
    G.phase = 'choose';
    G.gateTime = 0;
    G.cursor = 1;
    G.kbd = false;
    renderQuestion(gate.q);
    Sfx.play('whoosh');
    Voice.say(gate.q.speech);
    if (!Store.data.seenTip && G.firstChoice) ui.tapTip.hidden = false;
  }

  /** Bé chọn vòng lửa (0 = trên, 1 = giữa, 2 = dưới). */
  function choose(lane) {
    if (G.state !== 'playing' || G.phase !== 'choose') return;
    const gate = curGate();
    if (!gate) return;
    lane = clamp(Math.round(lane), 0, LANES - 1);
    gate.chosen = lane;
    gate.answeredAt = G.gateTime;
    beginJump(gate, lane);
    Sfx.play('select');
    if (!Store.data.seenTip) { Store.data.seenTip = true; Store.save(); }
    ui.tapTip.hidden = true;
    G.firstChoice = false;
    ui.timer.classList.add('idle');
  }

  function beginJump(gate, lane) {
    G.phase = 'jump';
    G.jumpT = 0;
    G.tiger.jumpH = (G.ground - 0.55 * G.r) - G.laneY[lane];
    G.tiger.state = 'jump';
    Sfx.play('jump');
  }

  function onTimeout(gate) {
    gate.result = 'miss';
    gate.chosen = gate.q.answer;
    gate.answeredAt = G.gateTime;
    beginJump(gate, gate.chosen);
    ui.tapTip.hidden = true;
    ui.timer.classList.add('idle');
    Sfx.play('timeup');
  }

  function evaluate(gate) {
    gate.evaluated = true;
    if (gate.result === 'miss') { onMiss(gate); return; }
    if (gate.chosen === gate.q.answer) { gate.result = 'ok'; onCorrect(gate); }
    else { gate.result = 'bad'; onWrong(gate); }
  }

  function multiplier() { return 1 + Math.min(3, Math.floor(G.streak / 3)); }

  function noteReview(q) {
    if (!q) return;
    if (G.review.some(function (r) { return r.key === q.key; })) return;
    if (G.review.length >= 8) return;
    G.review.push({ key: q.key, q: q, text: L.strip(q.prompt), answer: q.answerText, speech: q.speech + ' ' + q.answerSpeech });
  }

  function onCorrect(gate) {
    const lane = gate.chosen, q = gate.q;
    const x = gateX(gate), y = G.laneY[lane];
    gate.rings[lane].burst = 0;
    spawnBurst(x, y, G.r);
    G.correct++;
    G.streak++;
    if (G.streak > G.bestStreak) G.bestStreak = G.streak;
    const mult = multiplier();
    const speedBonus = gate.answeredAt < 5 ? 50 : gate.answeredAt < 10 ? 25 : 0;
    const pts = 100 * mult + speedBonus;
    G.score += pts;
    const praise = G.streak > 0 && G.streak % 3 === 0 && mult > 1 ? 'Combo x' + mult + '!' : pick(PRAISE);
    addText(praise, x, y - G.r * 1.4, { color: praise.indexOf('Combo') === 0 ? '#ff9f1c' : '#7bf1a8', size: G.r * 0.9, life: 1.2 });
    addText('+' + pts, x, y - G.r * 0.5, { color: '#ffe066', size: G.r * 0.8, life: 1.0 });
    if (praise.indexOf('Combo') === 0) { Sfx.play('combo'); Voice.say('Combo nhân ' + mult + '!'); }
    else { Sfx.play('correct'); Voice.say(praise + ' ' + q.answerSpeech + '.'); }
    Sfx.play('fire');
    showHint('✓ ' + q.answerText, 'ok', 1800);
    cardFx('ok');
    G.flash = { c: '120,255,180', a: 0.14 };
    G.tiger.cheer = 0.9;
  }

  function onWrong(gate) {
    const lane = gate.chosen, q = gate.q;
    const x = gateX(gate), y = G.laneY[lane];
    gate.rings[lane].flare = 1;
    gate.rings[q.answer].reveal = true;
    spawnSmoke(x, y, G.r);
    G.wrong++;
    G.streak = 0;
    G.tiger.hurt = 1.0;
    G.shake = 0.8;
    G.flash = { c: '255,60,60', a: 0.32 };
    Sfx.play('burn');
    Sfx.play('roar');
    addText('Ái! Nóng quá!', Math.max(G.tigerX + G.r * 0.4, Math.min(G.W / 2, G.r * 4.5)), G.ground - G.r * 2.4, { color: '#ff5c7a', size: G.r * 0.85, life: 1.3 });
    cardFx('shake');
    loseHeart();
    showHint('Đáp án: ' + q.answerText, 'bad', LEARN_T * 1000 + 600);
    Voice.say('Chưa đúng. Đáp án là ' + q.answerSpeech + '. ' + q.explain);
    noteReview(q);
  }

  function onMiss(gate) {
    const q = gate.q, lane = gate.chosen;
    const x = gateX(gate), y = G.laneY[lane];
    gate.rings[q.answer].reveal = true;
    G.wrong++;
    G.streak = 0;
    G.flash = { c: '255,180,60', a: 0.25 };
    addText('Hết giờ!', Math.max(G.tigerX + G.r * 0.4, Math.min(G.W / 2, G.r * 4.5)), G.ground - G.r * 2.4, { color: '#ffb703', size: G.r * 0.9, life: 1.3 });
    Sfx.play('wrong');
    loseHeart();
    showHint('Hết giờ! Đáp án: ' + q.answerText, 'bad', LEARN_T * 1000 + 600);
    Voice.say('Hết giờ rồi. Đáp án là ' + q.answerSpeech + '. ' + q.explain);
    noteReview(q);
  }

  function loseHeart() {
    G.hearts = Math.max(0, G.hearts - 1);
    ui.hearts.classList.remove('hit');
    void ui.hearts.offsetWidth;
    ui.hearts.classList.add('hit');
    Sfx.play('heart');
  }

  function celebrateFinish() {
    Sfx.play('finish');
    Sfx.play('applause');
    spawnConfetti(120);
    addText('🏁 Về đích!', G.W / 2, G.hudBottom + G.r * 1.2, { color: '#fff', stroke: 'rgba(6,160,120,0.95)', size: G.r * 1.5, life: 2.0, vy: -12 });
    Voice.say('Về đích rồi! Hổ và bé giỏi quá!');
    G.tiger.cheer = 2;
  }

  /* ================= CẬP NHẬT ================= */
  function updateGates(dt) {
    for (let g = Math.max(0, G.gateIdx - 1); g < Math.min(G.gates.length, G.gateIdx + 2); g++) {
      const gate = G.gates[g];
      for (let i = 0; i < LANES; i++) {
        const rg = gate.rings[i];
        if (rg.burst >= 0 && rg.burst < 1) rg.burst = Math.min(1, rg.burst + dt * 2.2);
        if (rg.flare > 0) rg.flare = Math.max(0, rg.flare - dt * 0.8);
      }
    }
    // Tàn lửa bay lên từ cụm vòng đang chờ
    const gate = curGate();
    if (gate && (G.phase === 'choose' || G.phase === 'learn') && G.parts.length < MAX_PARTS - 40) {
      for (let i = 0; i < LANES; i++) {
        if (Math.random() < 0.18) {
          const a = -Math.PI * (0.15 + Math.random() * 0.7);
          spawnEmber(gateX(gate) + Math.cos(a) * G.r, G.laneY[i] + Math.sin(a) * G.r, G.r);
        }
      }
    }
  }

  function updatePlaying(dt) {
    G.time += dt;
    const tg = G.tiger;
    if (tg.hurt > 0) tg.hurt = Math.max(0, tg.hurt - dt);
    if (tg.cheer > 0) tg.cheer = Math.max(0, tg.cheer - dt);
    const gate = curGate();
    switch (G.phase) {
      case 'run':
        G.scroll += G.speed * dt;
        tg.phase += dt * 11;
        tg.state = 'run';
        if (!gate) { G.phase = 'finish'; break; }
        if (gate.wx - G.scroll <= G.stopX) { G.scroll = gate.wx - G.stopX; activateGate(gate); }
        break;
      case 'choose':
        G.gateTime += dt;
        tg.state = 'idle';
        if (G.gateTime >= G.level.timer) onTimeout(gate);
        break;
      case 'jump': {
        G.jumpT += dt;
        const t = Math.min(1, G.jumpT / JUMP_T);
        G.scroll = gate.wx - G.stopX + 2 * G.jumpDist * t;
        tg.y = -tg.jumpH * Math.sin(Math.PI * t);
        tg.tilt = -0.32 * Math.cos(Math.PI * t);
        tg.phase += dt * 4;
        if (t >= 0.5 && !gate.evaluated) evaluate(gate);
        if (t >= 1) {
          tg.y = 0; tg.tilt = 0; gate.passed = true;
          Sfx.play('land');
          if (gate.result === 'ok') { G.gateIdx++; G.phase = 'run'; }
          else { G.phase = 'learn'; G.learnT = 0; }
        }
        break;
      }
      case 'learn':
        G.learnT += dt;
        tg.state = 'idle';
        if (G.learnT >= LEARN_T) {
          if (G.hearts <= 0) { endGame('nolife'); return; }
          G.gateIdx++;
          G.phase = 'run';
          ui.hint.hidden = true;
        }
        break;
      case 'finish':
        G.scroll += G.speed * dt;
        tg.phase += dt * 11;
        tg.state = 'run';
        if (G.finishX - G.scroll <= G.tigerX + G.r * 0.2) { G.phase = 'done'; G.doneT = 0; celebrateFinish(); }
        break;
      case 'done':
        G.doneT += dt;
        tg.state = 'cheer';
        if (G.doneT >= 1.7) { endGame('finish'); return; }
        break;
    }
    updateGates(dt);
  }

  function updateAttract(dt) {
    G.scroll += G.speed * dt * 0.7;
    G.tiger.phase += dt * 9;
    G.tiger.state = 'run';
    G.tiger.y = 0; G.tiger.tilt = 0;
  }

  function updateParts(dt) {
    const g = 700, arr = G.parts;
    let w = 0;
    for (let i = 0; i < arr.length; i++) {
      const p = arr[i];
      p.life -= dt;
      if (p.life <= 0) continue;
      if (p.kind === 'spark' || p.kind === 'star' || p.kind === 'heart') {
        p.vy += g * (p.kind === 'heart' ? 0.3 : p.kind === 'star' ? 0.7 : 0.6) * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.kind === 'star') p.rot += p.vr * dt;
      } else if (p.kind === 'ember') {
        p.vx += Math.sin(G.anim * 10 + p.y * 0.05) * 40 * dt;
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

  function update(dt) {
    G.anim += dt;
    if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 2.2);
    if (G.flash) { G.flash.a -= dt * 1.6; if (G.flash.a <= 0) G.flash = null; }
    const tg = G.tiger;
    tg.blink -= dt;
    if (tg.blink < -0.14) tg.blink = 2.5 + Math.random() * 3;

    if (G.state === 'playing') updatePlaying(dt);
    else if (G.state === 'over' || G.state === 'countdown') { if (tg.cheer > 0) tg.cheer = Math.max(0, tg.cheer - dt); if (tg.hurt > 0) tg.hurt = Math.max(0, tg.hurt - dt); updateGates(dt); if (G.state === 'countdown') tg.state = 'idle'; }
    else if (G.state !== 'paused') updateAttract(dt);

    if (G.state !== 'paused') {
      updateParts(dt);
      updateTexts(dt);
    }
    if (G.state === 'over' && !G.resultShown && G.anim >= G.overAt) showResults();
    syncHud();
  }

  /* ================= VẼ: ĐỒNG HỒ NHỎ TRONG VÒNG ================= */
  function drawClock(c, x, y, R, h, m) {
    c.save();
    c.translate(x, y);
    c.fillStyle = '#f7b733';
    c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill();
    c.fillStyle = '#fffdf6';
    c.beginPath(); c.arc(0, 0, R * 0.88, 0, TAU); c.fill();
    for (let i = 0; i < 60; i++) {
      const big = i % 5 === 0;
      if (!big && R < 28) continue;
      const a = i / 60 * TAU - Math.PI / 2;
      const r0 = R * (big ? 0.74 : 0.8), r1 = R * 0.86;
      c.strokeStyle = big ? '#2b2d42' : '#a0a4b8';
      c.lineWidth = big ? Math.max(1.5, R * 0.05) : 1;
      c.beginPath(); c.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); c.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); c.stroke();
    }
    if (R >= 20) {
      const fs = Math.max(7, R * 0.21);
      c.font = '800 ' + Math.round(fs) + 'px ' + FONT;
      c.fillStyle = '#2b2d42';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      const nums = R >= 30 ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : [12, 3, 6, 9];
      for (let k = 0; k < nums.length; k++) {
        const n = nums[k], a = n / 12 * TAU - Math.PI / 2;
        c.fillText(String(n), Math.cos(a) * R * 0.6, Math.sin(a) * R * 0.6 + fs * 0.06);
      }
    }
    const ha = (((h % 12) + m / 60) / 12) * TAU - Math.PI / 2, ma = (m / 60) * TAU - Math.PI / 2;
    c.lineCap = 'round';
    c.strokeStyle = '#2b2d42'; c.lineWidth = Math.max(2, R * 0.1);
    c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(ha) * R * 0.46, Math.sin(ha) * R * 0.46); c.stroke();
    c.strokeStyle = '#ef476f'; c.lineWidth = Math.max(1.5, R * 0.07);
    c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(ma) * R * 0.72, Math.sin(ma) * R * 0.72); c.stroke();
    c.fillStyle = '#2b2d42';
    c.beginPath(); c.arc(0, 0, Math.max(2, R * 0.07), 0, TAU); c.fill();
    c.restore();
  }

  /* ================= VẼ: VÒNG LỬA ================= */
  const FIRE_COLORS = {
    orange: ['#ff6a00', '#ffe066'],
    red: ['#ff1e1e', '#ffc2a0'],
    green: ['#22d66a', '#d9ffe8'],
    dim: ['#b34a10', '#ffb26b']
  };

  function glowSprite(r, hue) {
    const key = hue + ':' + Math.round(r);
    if (G.glowCache[key]) return G.glowCache[key];
    const size = r * 4.4;
    const col = hue === 'green' ? '60,230,120' : hue === 'red' ? '255,60,40' : '255,150,40';
    const spr = layer(size, size, function (c) {
      const g = c.createRadialGradient(size / 2, size / 2, r * 0.5, size / 2, size / 2, size / 2);
      g.addColorStop(0, 'rgba(' + col + ',0)');
      g.addColorStop(0.45, 'rgba(' + col + ',0.42)');
      g.addColorStop(1, 'rgba(' + col + ',0)');
      c.fillStyle = g;
      c.fillRect(0, 0, size, size);
    });
    G.glowCache[key] = spr;
    return spr;
  }

  function drawFlames(c, x, y, r, intensity, hue, seed) {
    const cols = FIRE_COLORS[hue] || FIRE_COLORS.orange;
    const N = 14;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU + Math.sin(G.anim * 0.9 + i + seed) * 0.06;
      const fl = 0.5 + 0.5 * Math.sin(G.anim * 12 + i * 2.3 + seed) * Math.sin(G.anim * 7.3 + i * 1.1);
      const len = r * (0.24 + 0.3 * fl) * intensity;
      const ca = Math.cos(a), sa = Math.sin(a);
      const bx = x + ca * r, by = y + sa * r;
      const px = -sa * r * 0.14, py = ca * r * 0.14;
      const up = len * 0.45;
      for (let k = 0; k < 2; k++) {
        const s = k === 0 ? 1 : 0.55, w = k === 0 ? 1 : 0.55;
        const tipx = bx + ca * len * s, tipy = by + sa * len * s - up * s;
        c.fillStyle = cols[k];
        c.globalAlpha = k === 0 ? 0.88 : 0.95;
        c.beginPath();
        c.moveTo(bx + px * w, by + py * w);
        c.quadraticCurveTo(bx + ca * len * 0.5 * s + px * w * 0.7, by + sa * len * 0.5 * s + py * w * 0.7 - up * 0.3, tipx, tipy);
        c.quadraticCurveTo(bx + ca * len * 0.5 * s - px * w * 0.7, by + sa * len * 0.5 * s - py * w * 0.7 - up * 0.3, bx - px * w, by - py * w);
        c.closePath();
        c.fill();
      }
    }
    c.globalAlpha = 1;
  }

  function splitLabel(s) {
    s = String(s);
    if (s.length <= 9 || s.indexOf(' ') < 0) return [s];
    const words = s.split(' ');
    let best = null, bestDiff = Infinity;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
      const d = Math.abs(a.length - b.length);
      if (d < bestDiff) { bestDiff = d; best = [a, b]; }
    }
    return best || [s];
  }

  function drawLabel(c, text, x, y, r, color, scale) {
    const lines = splitLabel(text);
    let size = r * (lines.length > 1 ? 0.3 : (String(text).length <= 4 ? 0.44 : 0.36)) * (scale || 1);
    const maxW = r * 1.4;
    c.font = '800 ' + Math.round(size) + 'px ' + FONT;
    let w = 0;
    for (let i = 0; i < lines.length; i++) w = Math.max(w, c.measureText(lines[i]).width);
    if (w > maxW) { size = size * maxW / w; c.font = '800 ' + Math.round(size) + 'px ' + FONT; }
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineJoin = 'round';
    c.lineWidth = Math.max(3, size * 0.2);
    c.strokeStyle = 'rgba(20,8,40,0.95)';
    c.fillStyle = color || '#fff';
    const lh = size * 1.05;
    for (let i = 0; i < lines.length; i++) {
      const ly = y + (i - (lines.length - 1) / 2) * lh + size * 0.05;
      c.strokeText(lines[i], x, ly);
      c.fillText(lines[i], x, ly);
    }
  }

  function drawRing(c, gate, lane, x, y) {
    const rg = gate.rings[lane], opt = gate.q.options[lane];
    const r0 = G.r;
    if (rg.burst >= 1) return;
    let scale = 1, alpha = 1;
    if (rg.burst >= 0) { scale = 1 + rg.burst * 0.55; alpha = 1 - rg.burst; }
    const r = r0 * scale;
    const isCur = gate === curGate();
    const waiting = isCur && G.phase === 'choose';
    const hue = rg.reveal ? 'green' : rg.flare > 0 ? 'red' : (gate.passed && !isCur) ? 'dim' : 'orange';
    const intensity = rg.reveal ? 1.25 : rg.flare > 0 ? 1 + rg.flare * 0.8 : waiting ? 1 : 0.8;
    c.globalAlpha = alpha;
    // Quầng sáng
    const spr = glowSprite(r0, hue === 'dim' ? 'orange' : hue);
    const gs = r * 4.4;
    c.globalAlpha = alpha * (hue === 'dim' ? 0.4 : 0.9);
    c.drawImage(spr, x - gs / 2, y - gs / 2, gs, gs);
    c.globalAlpha = alpha;
    // Lửa
    drawFlames(c, x, y, r, intensity, hue, gate.i * 3 + lane * 7);
    c.globalAlpha = alpha;
    // Vành vòng
    c.lineWidth = r * 0.2; c.strokeStyle = '#4a1a0c';
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke();
    c.lineWidth = r * 0.09; c.strokeStyle = hue === 'green' ? '#7dffb0' : hue === 'red' ? '#ff6b6b' : '#ff8c1a';
    c.beginPath(); c.arc(x, y, r * 1.04, 0, TAU); c.stroke();
    c.lineWidth = r * 0.05; c.strokeStyle = 'rgba(255,230,120,0.75)';
    c.beginPath(); c.arc(x, y, r * 0.91, 0, TAU); c.stroke();
    // Đĩa tối bên trong để đọc chữ
    c.fillStyle = rg.reveal ? 'rgba(6,70,40,0.78)' : rg.flare > 0 ? 'rgba(90,10,20,0.72)' : 'rgba(22,8,44,0.7)';
    c.beginPath(); c.arc(x, y, r * 0.8, 0, TAU); c.fill();
    // Nhãn: chữ hoặc đồng hồ nhỏ
    if (opt) {
      if (opt.clock) drawClock(c, x, y, r * 0.62, opt.clock.h, opt.clock.m);
      else drawLabel(c, opt.text, x, y, r, rg.reveal ? '#c8ffe0' : '#fff', rg.reveal ? 1.08 : 1);
    }
    // Vòng chọn (đang nhảy tới)
    if (isCur && G.phase === 'jump' && gate.chosen === lane && !gate.evaluated) {
      c.strokeStyle = 'rgba(255,214,102,0.95)'; c.lineWidth = Math.max(3, r * 0.08);
      c.setLineDash([r * 0.3, r * 0.18]); c.lineDashOffset = -G.anim * 50;
      c.beginPath(); c.arc(x, y, r * 1.22, 0, TAU); c.stroke();
      c.setLineDash([]);
    }
    // Dấu tích xanh cho vòng đúng được hé lộ
    if (rg.reveal) {
      const pr = r * (1.2 + 0.05 * Math.sin(G.anim * 8));
      c.strokeStyle = 'rgba(120,255,170,' + (0.6 + 0.3 * Math.sin(G.anim * 8)).toFixed(2) + ')';
      c.lineWidth = Math.max(4, r * 0.1);
      c.beginPath(); c.arc(x, y, pr, 0, TAU); c.stroke();
      c.fillStyle = '#06d6a0';
      c.beginPath(); c.arc(x + r * 0.8, y - r * 0.8, r * 0.3, 0, TAU); c.fill();
      c.font = '800 ' + Math.round(r * 0.4) + 'px ' + FONT;
      c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('✓', x + r * 0.8, y - r * 0.78);
    }
    // Con trỏ bàn phím
    if (waiting && G.kbd && G.cursor === lane) {
      const bx = x - r * 1.55 + Math.sin(G.anim * 6) * r * 0.08;
      c.fillStyle = '#ffd166';
      c.beginPath(); c.moveTo(bx, y - r * 0.28); c.lineTo(bx + r * 0.36, y); c.lineTo(bx, y + r * 0.28); c.closePath(); c.fill();
    }
    c.globalAlpha = 1;
  }

  function drawGate(c, gate) {
    const x = gateX(gate);
    if (x < -G.r * 3 || x > G.W + G.r * 3) return;
    const r = G.r, gr = G.ground;
    // Cột đỡ: vẽ từng đoạn giữa các vòng (không xuyên qua mặt vòng)
    const topY = G.laneY[0] - r * 1.05;
    const segs = [[topY, G.laneY[0] - r * 0.9]];
    for (let i = 0; i < LANES - 1; i++) segs.push([G.laneY[i] + r * 0.9, G.laneY[i + 1] - r * 0.9]);
    segs.push([G.laneY[LANES - 1] + r * 0.9, gr]);
    for (let k = 0; k < segs.length; k++) {
      c.fillStyle = '#5b3418';
      c.fillRect(x - r * 0.08, segs[k][0], r * 0.16, segs[k][1] - segs[k][0]);
      c.fillStyle = '#8a5a2b';
      c.fillRect(x - r * 0.08, segs[k][0], r * 0.06, segs[k][1] - segs[k][0]);
    }
    c.fillStyle = '#4a2a12';
    c.beginPath(); c.moveTo(x - r * 0.45, gr + 2); c.lineTo(x - r * 0.2, gr - r * 0.22); c.lineTo(x + r * 0.2, gr - r * 0.22); c.lineTo(x + r * 0.45, gr + 2); c.closePath(); c.fill();
    c.fillStyle = '#ffd166';
    c.beginPath(); c.arc(x, topY - r * 0.28, r * 0.28, 0, TAU); c.fill();
    for (let i = LANES - 1; i >= 0; i--) drawRing(c, gate, i, x, G.laneY[i]);
    // Số thứ tự cụm ở chân cột
    c.fillStyle = '#ffd166';
    c.beginPath(); c.arc(x, gr - r * 0.5, r * 0.3, 0, TAU); c.fill();
    c.font = '800 ' + Math.round(r * 0.34) + 'px ' + FONT;
    c.fillStyle = '#6a4a00'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(String(gate.i + 1), x, gr - r * 0.48);
  }

  function drawFinish(c) {
    if (!G.finishX) return;
    const x = G.finishX - G.scroll;
    const r = G.r, gr = G.ground;
    if (x < -r * 4 || x > G.W + r * 4) return;
    const h = r * 5.2, w = r * 3.2;
    c.fillStyle = '#5b3418';
    c.fillRect(x - w / 2 - r * 0.1, gr - h, r * 0.2, h);
    c.fillRect(x + w / 2 - r * 0.1, gr - h, r * 0.2, h);
    const wave = Math.sin(G.anim * 3) * r * 0.08;
    c.fillStyle = '#d62828';
    c.beginPath();
    c.moveTo(x - w / 2, gr - h);
    c.lineTo(x + w / 2, gr - h);
    c.lineTo(x + w / 2, gr - h + r * 1.4 + wave);
    c.lineTo(x - w / 2, gr - h + r * 1.4 - wave);
    c.closePath(); c.fill();
    c.strokeStyle = '#ffd166'; c.lineWidth = Math.max(3, r * 0.08); c.stroke();
    c.font = '800 ' + Math.round(r * 0.8) + 'px ' + FONT;
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('ĐÍCH', x, gr - h + r * 0.72);
    // Cờ đuôi nheo hai bên
    for (let i = 0; i < 6; i++) {
      c.fillStyle = ['#ffd166', '#06d6a0', '#4cc9f0', '#f72585', '#ff9f1c', '#c77dff'][i];
      const fy = gr - h + r * 1.6 + i * r * 0.5;
      c.beginPath(); c.moveTo(x - w / 2 - r * 0.1, fy); c.lineTo(x - w / 2 + r * 0.5, fy + r * 0.2); c.lineTo(x - w / 2 - r * 0.1, fy + r * 0.4); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(x + w / 2 + r * 0.1, fy); c.lineTo(x + w / 2 - r * 0.5, fy + r * 0.2); c.lineTo(x + w / 2 + r * 0.1, fy + r * 0.4); c.closePath(); c.fill();
    }
  }

  /* ================= VẼ: HỔ VÀ BÉ ================= */
  function drawLegs(c, u, ph, running, jumping, far) {
    const col = far ? '#d9700f' : '#f7931e', paw = far ? '#c2620c' : '#e6851a';
    const legs = [[0.95 * u, -0.85 * u, 0], [-1.0 * u, -0.85 * u, Math.PI]];
    for (let k = 0; k < legs.length; k++) {
      const ax = legs[k][0] + (far ? -0.12 * u : 0), ay = legs[k][1], off = legs[k][2];
      let a;
      if (jumping) a = (ax > 0 ? 0.8 : -0.8) * (far ? 0.75 : 1);
      else if (running) a = Math.sin(ph + off + (far ? Math.PI * 0.55 : 0)) * 0.7;
      else a = far ? 0.14 : -0.08;
      const len = 0.92 * u;
      const fx = ax + Math.sin(a) * len, fy = ay + Math.cos(a) * len;
      c.strokeStyle = col; c.lineWidth = 0.34 * u; c.lineCap = 'round';
      c.beginPath(); c.moveTo(ax, ay); c.lineTo(fx, fy); c.stroke();
      c.fillStyle = paw;
      c.beginPath(); c.ellipse(fx + 0.08 * u, fy + 0.02 * u, 0.27 * u, 0.17 * u, 0, 0, TAU); c.fill();
      c.strokeStyle = '#2b1a12'; c.lineWidth = 0.09 * u;
      const mx = ax + Math.sin(a) * len * 0.45, my = ay + Math.cos(a) * len * 0.45;
      c.beginPath(); c.moveTo(mx - 0.13 * u, my); c.lineTo(mx + 0.13 * u, my); c.stroke();
    }
  }

  function drawRider(c, u, ph, tg, running) {
    const bx = -0.2 * u, by = -1.75 * u;
    const bounce = running ? Math.abs(Math.sin(ph)) * 0.05 * u : 0;
    c.save();
    c.translate(0, -bounce);
    // Áo choàng bay
    const wave = Math.sin(G.anim * 9) * 0.14 * u + (running || G.phase === 'jump' ? 0.1 * u : 0);
    c.fillStyle = '#7b5ea7';
    c.beginPath();
    c.moveTo(bx - 0.25 * u, by - 0.8 * u);
    c.quadraticCurveTo(bx - 0.9 * u, by - 0.7 * u + wave, bx - 1.35 * u, by - 0.25 * u + wave * 1.5);
    c.lineTo(bx - 1.05 * u, by + 0.15 * u + wave);
    c.quadraticCurveTo(bx - 0.6 * u, by - 0.1 * u, bx - 0.2 * u, by - 0.15 * u);
    c.closePath(); c.fill();
    // Chân
    c.strokeStyle = '#3a86ff'; c.lineWidth = 0.22 * u; c.lineCap = 'round';
    c.beginPath(); c.moveTo(bx + 0.05 * u, by - 0.15 * u); c.lineTo(bx + 0.3 * u, by + 0.62 * u); c.stroke();
    c.fillStyle = '#2b2d42';
    c.beginPath(); c.ellipse(bx + 0.4 * u, by + 0.68 * u, 0.2 * u, 0.12 * u, 0.3, 0, TAU); c.fill();
    // Thân áo
    c.fillStyle = '#e63946';
    roundRect(c, bx - 0.42 * u, by - 0.95 * u, 0.82 * u, 0.95 * u, 0.22 * u);
    c.fill();
    c.fillStyle = '#ffd166';
    c.beginPath(); c.arc(bx - 0.02 * u, by - 0.5 * u, 0.09 * u, 0, TAU); c.fill();
    // Tay: ôm cổ hổ, hoặc giơ lên khi vui
    c.strokeStyle = '#ffd6b0'; c.lineWidth = 0.19 * u;
    c.beginPath(); c.moveTo(bx + 0.3 * u, by - 0.75 * u);
    if (tg.cheer > 0) c.lineTo(bx + 0.55 * u, by - 1.95 * u); else c.lineTo(1.0 * u, -1.8 * u);
    c.stroke();
    c.fillStyle = '#ffd6b0';
    if (tg.cheer > 0) { c.beginPath(); c.arc(bx + 0.55 * u, by - 1.98 * u, 0.13 * u, 0, TAU); c.fill(); }
    // Đầu
    const hx = bx - 0.1 * u, hy = by - 1.36 * u;
    c.fillStyle = '#ffd6b0';
    c.beginPath(); c.arc(hx, hy, 0.42 * u, 0, TAU); c.fill();
    // Mũ bảo hiểm vàng
    c.fillStyle = '#ffd166';
    c.beginPath(); c.arc(hx, hy - 0.06 * u, 0.46 * u, Math.PI, TAU); c.fill();
    c.fillStyle = '#e0a800';
    roundRect(c, hx - 0.52 * u, hy - 0.12 * u, 1.04 * u, 0.13 * u, 0.06 * u); c.fill();
    c.fillStyle = '#fff';
    star(c, hx + 0.02 * u, hy - 0.3 * u, 0.12 * u, '#fff');
    // Mắt, miệng
    c.fillStyle = '#2b2d42';
    c.beginPath(); c.arc(hx + 0.16 * u, hy + 0.02 * u, 0.05 * u, 0, TAU); c.fill();
    c.strokeStyle = '#c0392b'; c.lineWidth = 0.05 * u;
    c.beginPath(); c.arc(hx + 0.12 * u, hy + 0.14 * u, 0.12 * u, 0.1, Math.PI - 0.4); c.stroke();
    c.restore();
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }

  function drawTigerHead(c, u, tg) {
    const hx = 1.55 * u, hy = -1.75 * u, R = 0.72 * u;
    // Tai
    [[hx - 0.42 * u, hy - 0.58 * u], [hx + 0.36 * u, hy - 0.6 * u]].forEach(function (e) {
      c.fillStyle = '#f7931e'; c.beginPath(); c.arc(e[0], e[1], 0.25 * u, 0, TAU); c.fill();
      c.fillStyle = '#ffc7a0'; c.beginPath(); c.arc(e[0], e[1] + 0.02 * u, 0.13 * u, 0, TAU); c.fill();
    });
    // Đầu
    const g = c.createRadialGradient(hx - 0.2 * u, hy - 0.25 * u, 0.1 * u, hx, hy, R);
    g.addColorStop(0, '#ffb347'); g.addColorStop(1, '#f28c1b');
    c.fillStyle = g;
    c.beginPath(); c.arc(hx, hy, R, 0, TAU); c.fill();
    // Sọc trán
    c.strokeStyle = '#2b1a12'; c.lineWidth = 0.1 * u; c.lineCap = 'round';
    c.beginPath(); c.moveTo(hx - 0.05 * u, hy - 0.62 * u); c.lineTo(hx - 0.02 * u, hy - 0.4 * u); c.stroke();
    c.beginPath(); c.moveTo(hx - 0.28 * u, hy - 0.55 * u); c.lineTo(hx - 0.2 * u, hy - 0.36 * u); c.stroke();
    c.beginPath(); c.moveTo(hx + 0.2 * u, hy - 0.58 * u); c.lineTo(hx + 0.16 * u, hy - 0.38 * u); c.stroke();
    c.beginPath(); c.moveTo(hx - 0.62 * u, hy + 0.05 * u); c.lineTo(hx - 0.45 * u, hy + 0.1 * u); c.stroke();
    // Má, mõm
    c.fillStyle = '#fff3e0';
    c.beginPath(); c.ellipse(hx + 0.28 * u, hy + 0.26 * u, 0.44 * u, 0.3 * u, 0, 0, TAU); c.fill();
    // Mắt
    const eyes = [[hx - 0.08 * u, hy - 0.12 * u], [hx + 0.34 * u, hy - 0.14 * u]];
    for (let i = 0; i < eyes.length; i++) {
      const ex = eyes[i][0], ey = eyes[i][1];
      if (tg.hurt > 0) {
        c.strokeStyle = '#2b1a12'; c.lineWidth = 0.07 * u;
        c.beginPath(); c.moveTo(ex - 0.1 * u, ey - 0.1 * u); c.lineTo(ex + 0.1 * u, ey + 0.1 * u); c.moveTo(ex + 0.1 * u, ey - 0.1 * u); c.lineTo(ex - 0.1 * u, ey + 0.1 * u); c.stroke();
      } else if (tg.blink < 0) {
        c.strokeStyle = '#2b1a12'; c.lineWidth = 0.06 * u;
        c.beginPath(); c.moveTo(ex - 0.12 * u, ey); c.lineTo(ex + 0.12 * u, ey); c.stroke();
      } else {
        c.fillStyle = '#fff'; c.beginPath(); c.ellipse(ex, ey, 0.14 * u, 0.16 * u, 0, 0, TAU); c.fill();
        c.fillStyle = '#2b2d42'; c.beginPath(); c.arc(ex + 0.04 * u, ey + 0.02 * u, 0.08 * u, 0, TAU); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(ex + 0.07 * u, ey - 0.03 * u, 0.03 * u, 0, TAU); c.fill();
      }
    }
    // Mũi
    c.fillStyle = '#e05a6d';
    c.beginPath(); c.moveTo(hx + 0.55 * u, hy + 0.1 * u); c.lineTo(hx + 0.75 * u, hy + 0.1 * u); c.lineTo(hx + 0.65 * u, hy + 0.24 * u); c.closePath(); c.fill();
    // Miệng
    c.strokeStyle = '#2b1a12'; c.lineWidth = 0.06 * u;
    if (tg.hurt > 0) {
      c.fillStyle = '#c0392b'; c.beginPath(); c.ellipse(hx + 0.5 * u, hy + 0.42 * u, 0.12 * u, 0.15 * u, 0, 0, TAU); c.fill();
    } else if (tg.cheer > 0) {
      c.fillStyle = '#c0392b'; c.beginPath(); c.arc(hx + 0.5 * u, hy + 0.36 * u, 0.16 * u, 0, Math.PI); c.fill();
    } else {
      c.beginPath(); c.arc(hx + 0.5 * u, hy + 0.3 * u, 0.14 * u, 0.2, Math.PI - 0.2); c.stroke();
    }
    // Ria
    c.strokeStyle = '#2b1a12'; c.lineWidth = 0.04 * u;
    [[0.05, -0.08], [0.1, 0.02], [0.05, 0.12]].forEach(function (w) {
      c.beginPath(); c.moveTo(hx + 0.62 * u, hy + 0.25 * u + w[1] * u); c.lineTo(hx + 1.0 * u, hy + 0.18 * u + w[1] * u * 2 + w[0] * u); c.stroke();
    });
  }

  function drawTiger(c) {
    const tg = G.tiger, u = G.r * 0.5;
    const x = G.tigerX, y = G.ground + tg.y;
    const running = tg.state === 'run';
    const jumping = G.phase === 'jump' && G.state === 'playing';
    const ph = tg.phase;
    const bob = running ? Math.abs(Math.sin(ph)) * 0.12 * u : (tg.state === 'idle' ? Math.sin(G.anim * 2.5) * 0.04 * u : tg.state === 'cheer' ? Math.abs(Math.sin(G.anim * 8)) * 0.35 * u : 0);
    // Bóng đổ
    const sh = clamp(1 + tg.y / (G.r * 5), 0.3, 1);
    c.fillStyle = 'rgba(0,0,0,' + (0.22 * sh).toFixed(2) + ')';
    c.beginPath(); c.ellipse(x + 0.2 * u, G.ground + 0.12 * u, 1.75 * u * sh, 0.26 * u * sh, 0, 0, TAU); c.fill();
    c.save();
    c.translate(x, y - bob);
    if (tg.hurt > 0) c.translate((Math.random() - 0.5) * 0.14 * u, (Math.random() - 0.5) * 0.14 * u);
    if (jumping) { c.translate(0, -1.1 * u); c.rotate(tg.tilt); c.translate(0, 1.1 * u); }
    // Đuôi
    const sway = Math.sin(G.anim * 4 + (running ? ph * 0.5 : 0)) * 0.35;
    c.strokeStyle = '#f28c1b'; c.lineWidth = 0.24 * u; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-1.4 * u, -1.3 * u); c.quadraticCurveTo(-2.1 * u, -1.0 * u + sway * u * 0.4, -2.3 * u, -1.9 * u + sway * u); c.stroke();
    c.strokeStyle = '#2b1a12'; c.lineWidth = 0.2 * u;
    c.beginPath(); c.moveTo(-2.22 * u, -1.72 * u + sway * u * 0.9); c.lineTo(-2.3 * u, -1.9 * u + sway * u); c.stroke();
    // Chân xa
    drawLegs(c, u, ph, running, jumping, true);
    // Thân
    c.save();
    c.beginPath(); c.ellipse(0, -1.1 * u, 1.55 * u, 0.78 * u, 0, 0, TAU); c.clip();
    const bg = c.createLinearGradient(0, -1.9 * u, 0, -0.3 * u);
    bg.addColorStop(0, '#ffa63d'); bg.addColorStop(1, '#f07f14');
    c.fillStyle = bg; c.fillRect(-2 * u, -2 * u, 4 * u, 2 * u);
    c.fillStyle = '#fff3e0';
    c.beginPath(); c.ellipse(0.1 * u, -0.66 * u, 1.15 * u, 0.36 * u, 0, 0, TAU); c.fill();
    c.strokeStyle = '#2b1a12'; c.lineWidth = 0.17 * u; c.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const sx = -1.05 * u + i * 0.5 * u;
      c.beginPath(); c.moveTo(sx, -1.9 * u); c.quadraticCurveTo(sx - 0.2 * u, -1.45 * u, sx - 0.08 * u, -0.98 * u); c.stroke();
    }
    c.restore();
    // Chân gần
    drawLegs(c, u, ph, running, jumping, false);
    // Bé cưỡi hổ
    drawRider(c, u, ph, tg, running);
    // Đầu hổ
    drawTigerHead(c, u, tg);
    c.restore();
    if (tg.hurt > 0) {
      c.fillStyle = 'rgba(255,60,60,' + (0.18 * tg.hurt).toFixed(2) + ')';
      c.beginPath(); c.arc(x + 0.3 * u, y - 1.3 * u, 2.6 * u, 0, TAU); c.fill();
    }
  }

  /* ================= VẼ: NỀN & HIỆU ỨNG ================= */
  function drawSpotlights(c) {
    const W = G.W, gr = G.ground;
    const beams = [[W * 0.1, 0.5], [W * 0.9, -0.5]];
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < beams.length; i++) {
      const bx = beams[i][0];
      const a = Math.sin(G.anim * 0.45 + i * 2.1) * 0.35 + beams[i][1] * 0.2;
      const tx = bx + Math.tan(a) * gr;
      c.fillStyle = 'rgba(255,235,180,0.07)';
      c.beginPath(); c.moveTo(bx, -10); c.lineTo(tx - W * 0.09, gr); c.lineTo(tx + W * 0.09, gr); c.closePath(); c.fill();
    }
    c.restore();
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
      } else if (p.kind === 'star') {
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
        star(c, 0, 0, p.size, p.color);
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
    const c = ctx, W = G.W, H = G.H;
    c.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    let sx = 0, sy = 0;
    if (G.shake > 0) {
      const amp = G.shake * G.shake * Math.min(W, H) * 0.025;
      sx = (Math.random() - 0.5) * 2 * amp;
      sy = (Math.random() - 0.5) * 2 * amp;
      c.translate(sx, sy);
    }
    c.drawImage(G.bg, 0, 0, W, H);
    drawSpotlights(c);
    // Khán giả (cuộn chậm)
    if (G.tileAud) {
      const ay = G.ground - G.audH - 4;
      let ax = -((G.scroll * 0.35) % G.audW);
      for (let x = ax - G.audW; x < W; x += G.audW) c.drawImage(G.tileAud, x, ay, G.audW, G.audH);
    }
    // Mặt đất (cuộn theo tốc độ chạy)
    if (G.tileGround) {
      const th = H - G.ground + 2;
      let gx = -(G.scroll % G.tileW);
      for (let x = gx - G.tileW; x < W; x += G.tileW) c.drawImage(G.tileGround, x, G.ground, G.tileW, th);
    }
    if (inGame()) {
      drawFinish(c);
      for (let i = Math.max(0, G.gateIdx - 1); i < Math.min(G.gates.length, G.gateIdx + 3); i++) drawGate(c, G.gates[i]);
    }
    drawTiger(c);
    drawParts(c);
    drawTexts(c);
    if (G.shake > 0) c.translate(-sx, -sy);
    if (G.state === 'playing' && G.hearts === 1) {
      const a = 0.14 + 0.08 * Math.sin(G.anim * 5);
      const g = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
      g.addColorStop(0, 'rgba(255,40,80,0)');
      g.addColorStop(1, 'rgba(255,40,80,' + a.toFixed(2) + ')');
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
    }
    if (G.flash) {
      c.fillStyle = 'rgba(' + G.flash.c + ',' + Math.max(0, G.flash.a).toFixed(2) + ')';
      c.fillRect(0, 0, W, H);
    }
  }

  /* ================= HUD ================= */
  function renderQuestion(q) {
    ui.prompt.innerHTML = q ? q.prompt : 'Sẵn sàng…';
    const vis = q ? L.visualHtml(q, 104) : '';
    ui.visual.innerHTML = vis;
    ui.visual.hidden = !vis;
    ui.question.classList.remove('ok', 'shake', 'pop');
    void ui.question.offsetWidth;
    ui.question.classList.add('pop');
    // Câu hỏi dài làm thẻ cao hơn lúc đo ở đầu ván (màn hình thấp): tính lại bố cục để vòng lửa không bị HUD che
    if (q && inGame()) {
      try { if (hudCenterBottom() + 8 > G.hudBottom + 1) layout(); } catch (e) { /* bỏ qua */ }
    }
    ui.timer.classList.remove('idle');
    ui.hint.hidden = true;
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
    ui.question.classList.remove('ok', 'shake', 'pop');
    void ui.question.offsetWidth;
    ui.question.classList.add(cls);
    clearTimeout(cardFx._t);
    cardFx._t = setTimeout(function () { ui.question.classList.remove('ok', 'shake'); }, 700);
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
    const stage = Math.min(G.gates.length, G.gateIdx + 1);
    if (h.stage !== stage) { h.stage = stage; ui.stage.textContent = 'Vòng ' + stage + '/' + G.gates.length; }
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
    const limit = G.level ? G.level.timer : 15;
    const left = G.phase === 'choose' ? Math.max(0, limit - G.gateTime) : limit;
    const tt = String(Math.ceil(left));
    if (h.time !== tt) {
      h.time = tt;
      ui.time.textContent = tt;
      const frac = clamp(left / limit, 0, 1);
      ui.timerFill.style.width = (frac * 100).toFixed(1) + '%';
      ui.timerFill.classList.toggle('warn', left <= limit * 0.5 && left > 5);
      ui.timerFill.classList.toggle('danger', left <= 5 && G.phase === 'choose');
      ui.timer.classList.toggle('danger', left <= 5 && G.phase === 'choose');
      if (G.phase === 'choose' && left <= 5 && left > 0) Sfx.play('warn');
    }
  }

  function resetHud() {
    G.hud = { score: -1, hearts: -1, stage: -1, mult: -1, time: '' };
    ui.combo.hidden = true;
    ui.hint.hidden = true;
    ui.tapTip.hidden = true;
    renderQuestion(null);
    ui.timer.classList.add('idle');
    ui.timerFill.style.width = '100%';
    ui.timerFill.classList.remove('warn', 'danger');
    ui.timer.classList.remove('danger');
  }

  /* ================= VÒNG ĐỜI VÁN CHƠI ================= */
  function clearWorld() {
    G.parts.length = 0;
    G.texts.length = 0;
    G.shake = 0;
    G.flash = null;
    G.tiger.y = 0; G.tiger.tilt = 0; G.tiger.hurt = 0; G.tiger.cheer = 0;
  }

  function startGame(level) {
    clearTimeout(G.cdTimer);
    G.level = level;
    G.state = 'countdown';
    G.score = 0; G.hearts = MAX_HEARTS; G.streak = 0; G.bestStreak = 0; G.correct = 0; G.wrong = 0;
    G.time = 0; G.review = []; G.scroll = 0; G.phase = 'run'; G.gateIdx = 0; G.gateTime = 0; G.jumpT = 0; G.learnT = 0;
    G.overAt = -1; G.resultShown = false; G.resultSaved = false; G.quizPassedNow = false;
    clearWorld();
    resetHud();
    showHud(true);
    showScreen('countdown');
    renderQuestion({ prompt: 'Sẵn sàng…', clock: { h: 12, m: 0 } });   // giữ chỗ cho thẻ câu hỏi cao nhất khi đo HUD
    layout();
    renderQuestion(null);
    ui.timer.classList.add('idle');
    buildGates();
    syncHud();
    requestWake();
    Music.setDuck('pause', null);
    Music.play('game');
    Voice.stop();
    Sfx.play('roar');
    runCountdown(function () {
      G.state = 'playing';
      G.tiger.state = 'run';
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
        el.textContent = 'CHẠY!';
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
    $('pause-info').textContent = 'Điểm hiện tại: ' + fmt(G.score) + ' · Vòng ' + Math.min(G.gates.length, G.gateIdx + 1) + '/' + G.gates.length;
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
    G.overAt = G.anim + (reason === 'finish' ? 1.3 : 1.6);
    Music.stop();
    ui.tapTip.hidden = true;
    const cx = G.W / 2, cy = G.hudBottom + G.r * 1.5;
    if (reason === 'finish') {
      // hiệu ứng đã phát ở celebrateFinish()
    } else {
      Sfx.play('lose');
      Voice.stop();
      Voice.say('Hổ mệt rồi! Xem lại bài học rồi thử lại nhé.');
      addText('Hổ mệt rồi!', cx, cy, { color: '#fff', stroke: 'rgba(239,71,111,0.95)', size: G.r * 1.5, life: 1.8, vy: -15 });
      G.tiger.hurt = 1.5;
    }
  }

  function starsFor(correct, total, finished) {
    if (!finished) return 0;
    if (correct >= total - 1) return 3;
    if (correct >= total - 3) return 2;
    if (correct >= Math.ceil(total * 0.5)) return 1;
    return 0;
  }

  function starsHtml(n) {
    let h = '';
    for (let i = 0; i < 3; i++) h += '<span class="' + (i < n ? 'on' : 'off') + '">★</span>';
    return h;
  }

  function showResults() {
    G.resultShown = true;
    const lvl = G.level, score = G.score, finished = G.endReason === 'finish';
    const rec = Store.lv(lvl.id);
    const first = !G.resultSaved;
    const isRecord = first && finished && score > 0 && score > (rec.best || 0);
    const stars = starsFor(G.correct, G.gates.length, finished);
    if (first) {
      G.resultSaved = true;
      rec.plays = (rec.plays || 0) + 1;
      if (finished) { rec.done = true; rec.best = Math.max(rec.best || 0, score); rec.stars = Math.max(rec.stars || 0, stars); }
      Store.setLv(lvl.id, rec);
    }
    const next = L.LEVELS[lvl.index + 1];

    ui.resultTitle.textContent = finished ? '🏁 Về đích!' : '😿 Hổ mệt rồi!';
    ui.resultTitle.className = 'result-title ' + (finished ? 'finish' : 'nolife');
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
      const vis = r.q.clock ? L.clockSvg(r.q.clock, 36, 'mini') : r.q.digital ? '<i class="dg">' + esc(r.q.digital) + '</i>' : '';
      return '<span data-i="' + i + '">' + vis + '<span class="tx">' + esc(r.text) + ' → <b>' + esc(r.answer) + '</b></span></span>';
    }).join('');

    if (finished) {
      ui.btnQuiz.hidden = false;
      ui.btnQuiz.textContent = rec.quiz ? '❓ Hỏi đáp lại' : (next ? '❓ HỎI ĐÁP – mở khóa màn ' + next.n : '🏆 HỎI ĐÁP – nhận Huy hiệu Hổ Vàng');
      ui.btnQuiz.className = 'btn ' + (rec.quiz ? 'small purple' : 'big purple');
      ui.btnAgain.className = 'btn ' + (rec.quiz ? 'small' : 'big');
      ui.btnNextLevel.hidden = !(rec.quiz && next);
      if (rec.quiz && next) ui.btnNextLevel.textContent = '▶ Màn ' + next.n + ': ' + next.title;
      ui.resultMsg.textContent = rec.quiz
        ? (next ? 'Con đã mở khóa màn tiếp theo rồi. Chơi lại để phá kỷ lục hoặc sang màn mới nhé!' : 'Con đã hoàn thành cả hành trình! Chơi lại để phá kỷ lục nhé.')
        : (next ? 'Trả lời đúng các câu hỏi đáp để mở khóa màn ' + next.n + ': ' + next.title + '!' : 'Trả lời đúng các câu hỏi đáp cuối cùng để nhận Huy hiệu Hổ Vàng!');
    } else {
      ui.btnQuiz.hidden = true;
      ui.btnAgain.className = 'btn big';
      ui.btnNextLevel.hidden = true;
      ui.resultMsg.textContent = 'Hết tim rồi! Xem lại bài học, ôn các câu sai rồi cưỡi hổ thử lại nhé. Cần về đích mới được vào phần hỏi đáp.';
    }
    showScreen('gameover');
    if (first) {
      if (isRecord) { Sfx.play('record'); spawnConfetti(100); Voice.say('Kỷ lục mới! Giỏi quá!', { queue: true }); }
      else if (stars >= 2) { spawnConfetti(60); Voice.say('Chơi tốt lắm!', { queue: true }); }
      setTimeout(function () { if (G.state === 'over') Music.play('menu'); }, 2000);
    } else Music.play('menu');
    releaseWake();
  }

  function leaveGame() {
    clearTimeout(G.cdTimer);
    const was = inGame();
    G.level = null;
    G.gates = [];
    G.gateIdx = 0;
    G.phase = 'run';
    G.finishX = 0;
    clearWorld();
    showHud(false);
    if (was) { setSpeed(); layout(); }
    releaseWake();
    Voice.stop();
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

  function goNotes() {
    leaveGame();
    G.state = 'notes';
    renderNotes();
    showScreen('notes');
  }

  /* ================= CHỌN MÀN (HÀNH TRÌNH) ================= */
  function gradeLabel(g) { return g === 0 ? 'Thử thách' : 'Lớp ' + g; }
  function gradeClass(g) { return g === 0 ? 'gx' : 'g' + g; }

  function renderLevels() {
    const p = Store.data.progress;
    let stars = 0, done = 0;
    L.LEVELS.forEach(function (l) { const r = Store.lv(l.id); stars += r.stars || 0; if (r.quiz) done++; });
    ui.journeyStats.innerHTML =
      '<span>⭐ ' + stars + '/' + (L.LEVELS.length * 3) + ' sao</span>' +
      '<span>✅ ' + done + '/' + L.LEVELS.length + ' màn đã hỏi đáp</span>' +
      (p.badge ? '<span class="badge">🏆 Huy hiệu Hổ Vàng</span>' : '');
    ui.levelGrid.innerHTML = L.LEVELS.map(function (l) {
      const rec = Store.lv(l.id);
      const locked = !Store.isUnlocked(l);
      const current = l.index + 1 === p.unlocked;
      const prev = L.LEVELS[l.index - 1];
      return '<div class="level-card' + (locked ? ' locked' : '') + (current ? ' current' : '') + '" data-id="' + l.id + '" role="button">' +
        '<span class="grade ' + gradeClass(l.grade) + '">' + gradeLabel(l.grade) + '</span>' +
        (rec.quiz ? '<span class="quiz-ok">✅ Đã hỏi đáp</span>' : '') +
        '<div class="icon">' + l.icon + '</div>' +
        '<div class="name"><span class="num">Màn ' + l.n + ':</span> ' + esc(l.title) + '</div>' +
        '<div class="desc">' + esc(l.desc) + '</div>' +
        '<div class="meta"><span class="best">🏆 ' + fmt(rec.best || 0) + '</span><span class="stars">' + starsHtml(rec.stars || 0) + '</span></div>' +
        (locked ? '<div class="lock"><div class="em">🔒</div><div class="lk-name">Màn ' + l.n + ': ' + esc(l.title) + '</div><div class="lk-how">Hoàn thành hỏi đáp màn ' + (prev ? prev.n : '') + ' để mở khóa</div></div>' : '') +
        '</div>';
    }).join('');
  }

  /* ================= BÀI HỌC ================= */
  const Lesson = { level: null, i: 0, from: 'levels' };

  function showLesson(level, from) {
    Lesson.level = level;
    Lesson.i = 0;
    Lesson.from = from || 'levels';
    if (Lesson.from !== 'pause' && Lesson.from !== 'results') { leaveGame(); G.state = 'lesson'; }
    else Voice.stop();
    ui.lessonTitle.textContent = level.icon + ' Màn ' + level.n + ': ' + level.title;
    const rec = Store.lv(level.id);
    ui.lessonSkip.hidden = Lesson.from === 'pause' || !(rec.plays > 0);
    showScreen('lesson');
    renderSlide();
    Music.play('menu');
  }

  function renderSlide() {
    const lv = Lesson.level;
    if (!lv) return;
    const s = lv.lesson[Lesson.i];
    const last = Lesson.i === lv.lesson.length - 1;
    ui.slideVisual.innerHTML = L.visualHtml(s, 220);
    ui.slideText.innerHTML = s.text;
    ui.slideDots.innerHTML = lv.lesson.map(function (_, i) { return '<span class="' + (i === Lesson.i ? 'on' : i < Lesson.i ? 'done' : '') + '"></span>'; }).join('');
    ui.slidePrev.disabled = Lesson.i === 0;
    ui.slideNext.hidden = last;
    ui.lessonStart.hidden = !last || Lesson.from === 'pause';
    ui.lessonBack.textContent = Lesson.from === 'pause' ? '← Chơi tiếp' : '← Quay lại';
    Voice.say(L.strip(s.text));
  }

  function slideStep(d) {
    const lv = Lesson.level;
    if (!lv) return;
    const n = clamp(Lesson.i + d, 0, lv.lesson.length - 1);
    if (n === Lesson.i) return;
    Lesson.i = n;
    Sfx.play('page');
    renderSlide();
  }

  function lessonBack() {
    if (Lesson.from === 'pause') { showScreen('pause'); Voice.stop(); return; }
    if (Lesson.from === 'results') { G.state = 'over'; showScreen('gameover'); Voice.stop(); return; }
    goLevels();
  }

  /* ================= GHI NHỚ ================= */
  function renderNotes() {
    ui.notesList.innerHTML = L.LEVELS.filter(function (l) { return l.grade > 0; }).map(function (l) {
      return '<div class="note-group"><h3>' + l.icon + ' Màn ' + l.n + ': ' + esc(l.title) + '<span class="g">' + gradeLabel(l.grade) + '</span></h3>' +
        l.notes.map(function (t, i) { return '<div class="note-line" data-l="' + l.id + '" data-i="' + i + '">' + esc(t) + '</div>'; }).join('') + '</div>';
    }).join('');
  }

  function readNotes() {
    if (!Voice.available) { toast('Thiết bị chưa có giọng đọc tiếng Việt 🙁'); return; }
    if (G.reading) { G.reading = false; Voice.stop(); return; }
    G.reading = true;
    Voice.stop();
    const lines = ui.notesList.querySelectorAll('.note-line');
    lines.forEach(function (el, i) {
      Voice.say(el.textContent, {
        queue: true, rate: 0.95,
        onstart: function () { if (G.reading) el.classList.add('speaking'); },
        onend: function () { el.classList.remove('speaking'); if (i === lines.length - 1) G.reading = false; }
      });
    });
  }

  /* ================= HỎI ĐÁP (mở khóa màn tiếp) ================= */
  const Quiz = { level: null, list: [], i: 0, wrongTotal: 0, answered: false };

  function startQuiz(level) {
    Quiz.level = level;
    Quiz.i = 0;
    Quiz.wrongTotal = 0;
    const list = level.quiz.map(function (z) { return L.mkQ(z); });
    const rev = (G.level === level ? G.review : []).slice(0, 2);
    rev.forEach(function (r) { r.q.review = true; list.push(r.q); });
    if (!rev.length) { const q = L.fresh(level.gen); q.review = true; list.push(q); }
    Quiz.list = list;
    G.state = 'quiz';
    ui.quizDone.hidden = true;
    ui.quizBody.hidden = false;
    showScreen('quiz');
    renderQuizQ();
    Music.play('menu');
  }

  function reshuffleQ(q) {
    const pairs = q.options.map(function (o, i) { return { o: o, ok: i === q.answer }; });
    L.shuffle(pairs);
    q.options = pairs.map(function (p) { return p.o; });
    q.answer = pairs.findIndex(function (p) { return p.ok; });
  }

  function renderQuizQ() {
    const q = Quiz.list[Quiz.i], lv = Quiz.level;
    Quiz.answered = false;
    ui.quizTitle.textContent = '❓ Hỏi đáp – Màn ' + lv.n;
    ui.quizDots.innerHTML = Quiz.list.map(function (_, i) { return '<span class="' + (i === Quiz.i ? 'on' : i < Quiz.i ? 'done' : '') + '"></span>'; }).join('');
    const vis = L.visualHtml(q, 170);
    ui.quizVisual.innerHTML = vis;
    ui.quizVisual.hidden = !vis;
    ui.quizText.innerHTML = (q.review ? '<span style="color:#b5640c">📝 Ôn lại:</span> ' : '') + q.prompt;
    ui.quizAnswers.innerHTML = q.options.map(function (o, i) {
      return '<button type="button" data-i="' + i + '">' + L.optionHtml(o, 88) + '</button>';
    }).join('');
    ui.quizFeedback.hidden = true;
    ui.quizNext.hidden = true;
    ui.quizRetry.hidden = true;
    Voice.say(q.speech);
  }

  function onQuizAnswer(idx) {
    if (Quiz.answered) return;
    const q = Quiz.list[Quiz.i];
    const ok = idx === q.answer;
    Quiz.answered = true;
    const btns = ui.quizAnswers.querySelectorAll('button');
    for (let i = 0; i < btns.length; i++) {
      btns[i].disabled = true;
      if (i === idx) btns[i].classList.add(ok ? 'ok' : 'bad');
      else if (ok || i !== q.answer) btns[i].classList.add('dim');
      if (!ok && i === q.answer) btns[i].classList.add('ok');
    }
    ui.quizFeedback.hidden = false;
    const dots = ui.quizDots.children;
    if (ok) {
      ui.quizFeedback.className = 'quiz-feedback ok';
      ui.quizFeedback.innerHTML = '✅ <b>Đúng rồi!</b> ' + esc(q.explain);
      ui.quizNext.hidden = false;
      ui.quizNext.textContent = Quiz.i === Quiz.list.length - 1 ? '🎉 Hoàn thành' : 'Tiếp ▶';
      if (dots[Quiz.i]) dots[Quiz.i].className = 'done';
      Sfx.play('correct');
      Voice.say('Đúng rồi! ' + q.explain);
    } else {
      Quiz.wrongTotal++;
      ui.quizFeedback.className = 'quiz-feedback bad';
      ui.quizFeedback.innerHTML = '❌ <b>Chưa đúng.</b> Đáp án đúng là <b>' + esc(q.answerText) + '</b>. ' + esc(q.explain) + ' <b>Thử lại nhé!</b>';
      ui.quizRetry.hidden = false;
      if (dots[Quiz.i]) dots[Quiz.i].className = 'bad';
      Sfx.play('wrong');
      Voice.say('Chưa đúng. Đáp án đúng là ' + q.answerSpeech + '. ' + q.explain + ' Thử lại nhé!');
    }
  }

  function quizRetry() {
    const q = Quiz.list[Quiz.i];
    reshuffleQ(q);
    Sfx.play('page');
    renderQuizQ();
  }

  function quizNext() {
    Quiz.i++;
    if (Quiz.i < Quiz.list.length) { Sfx.play('page'); renderQuizQ(); return; }
    finishQuiz();
  }

  function finishQuiz() {
    const level = Quiz.level;
    const rec = Store.lv(level.id);
    const firstTime = !rec.quiz;
    rec.quiz = true;
    Store.setLv(level.id, rec);
    const next = L.LEVELS[level.index + 1];
    let unlocked = false;
    if (next) unlocked = Store.unlockUpTo(next.index + 1);
    else if (!Store.data.progress.badge) { Store.data.progress.badge = true; Store.save(); unlocked = true; }
    G.quizPassedNow = true;
    ui.quizBody.hidden = true;
    ui.quizDone.hidden = false;
    ui.unlockArt.textContent = next ? (unlocked ? '🔓' : '🎉') : '🏆';
    ui.unlockTitle.textContent = next
      ? (unlocked ? 'Mở khóa màn ' + next.n + '!' : 'Giỏi lắm!')
      : (unlocked ? 'Huy hiệu Hổ Vàng!' : 'Siêu Hổ tuyệt đỉnh!');
    ui.unlockDesc.innerHTML = next
      ? (Quiz.wrongTotal === 0 ? 'Trả lời đúng hết ngay lần đầu! ' : 'Con đã hiểu bài rồi. ') + 'Màn tiếp theo: <b>' + next.icon + ' Màn ' + next.n + ': ' + esc(next.title) + '</b> – ' + esc(next.desc) + '.'
      : 'Con đã hoàn thành cả hành trình chinh phục đồng hồ! Giờ con có thể xem giờ đúng, giờ rưỡi, giờ kém, 24 giờ và tính thời gian rồi. 🐯🔥';
    ui.quizPlayNext.hidden = !next;
    if (next) ui.quizPlayNext.textContent = '▶ Chơi màn ' + next.n + ': ' + next.title;
    Sfx.play('unlock');
    Sfx.play('applause');
    spawnConfetti(140);
    Voice.stop();
    Voice.say(next ? (unlocked ? 'Mở khóa màn ' + next.n + ': ' + next.title + '. Giỏi lắm!' : 'Giỏi lắm! Con đã hiểu bài rồi.') : 'Chúc mừng! Con đã nhận Huy hiệu Hổ Vàng!');
    if (firstTime && Store.data.progress.badge && !next) spawnConfetti(100);
  }

  function quizBack() {
    Voice.stop();
    G.reading = false;
    if (G.level && G.resultShown) { G.state = 'over'; showResults(); }
    else goLevels();
  }

  /* ================= ĐẦU VÀO ================= */
  function onCanvasDown(e) {
    Sfx.unlock();
    if (G.state !== 'playing' || G.phase !== 'choose') return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const gate = curGate();
    if (!gate) return;
    const x = e.clientX, y = e.clientY;
    let best = -1, bd = Infinity;
    for (let i = 0; i < LANES; i++) {
      const dy = Math.abs(y - G.laneY[i]);
      const dx = Math.abs(x - G.stopX);
      if (dy < G.r * 1.15 && dx < G.r * 2.6 && dy < bd) { best = i; bd = dy; }
    }
    if (best >= 0) choose(best);
    if (e.cancelable) e.preventDefault();
  }

  function bindInput() {
    canvas.addEventListener('pointerdown', onCanvasDown);
    document.addEventListener('touchmove', function (e) { if (e.target === canvas && e.cancelable) e.preventDefault(); }, { passive: false });
    document.addEventListener('touchstart', function (e) { if (e.target === canvas && e.cancelable) e.preventDefault(); }, { passive: false });
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    document.addEventListener('dblclick', function (e) { if (e.target === canvas) e.preventDefault(); });
    document.addEventListener('contextmenu', function (e) { if (e.target === canvas) e.preventDefault(); });
    document.addEventListener('pointerdown', function () { Sfx.unlock(); }, true);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (G.state === 'playing') pauseGame(); else if (G.state === 'paused') resumeGame();
        return;
      }
      if (G.state === 'lesson') {
        if (e.key === 'ArrowRight') { slideStep(1); e.preventDefault(); }
        else if (e.key === 'ArrowLeft') { slideStep(-1); e.preventDefault(); }
        else if (e.key === 'Enter' && !ui.lessonStart.hidden) { startGame(Lesson.level); e.preventDefault(); }
        return;
      }
      if (G.state === 'quiz' && !ui.quizBody.hidden) {
        if (/^[1-3]$/.test(e.key) && !Quiz.answered) { onQuizAnswer(Number(e.key) - 1); e.preventDefault(); }
        else if (e.key === 'Enter') { if (!ui.quizNext.hidden) quizNext(); else if (!ui.quizRetry.hidden) quizRetry(); e.preventDefault(); }
        return;
      }
      if (G.state !== 'playing' || G.phase !== 'choose') return;
      if (/^[1-3]$/.test(e.key)) { choose(Number(e.key) - 1); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { G.kbd = true; G.cursor = clamp(G.cursor - 1, 0, LANES - 1); Sfx.play('click'); e.preventDefault(); }
      else if (e.key === 'ArrowDown') { G.kbd = true; G.cursor = clamp(G.cursor + 1, 0, LANES - 1); Sfx.play('click'); e.preventDefault(); }
      else if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') { G.kbd = true; choose(G.cursor); e.preventDefault(); }
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

  function bindUi() {
    click('btn-play', function () { goLevels(); });
    click('btn-notes', function () { goNotes(); });
    click('btn-notes-back', function () { G.reading = false; Voice.stop(); goMenu(); });
    click('btn-notes-read', function () { readNotes(); });
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
        if (k === 'voice') Voice.say('Xin chào! Cùng cưỡi hổ học xem đồng hồ nào!');
      } else {
        Sfx.play('click');
      }
    });
    click('btn-levels-back', function () { goMenu(); });
    click('btn-unlock-all', function () {
      if (!window.confirm('Mở khóa tất cả các màn? (Dành cho phụ huynh, giáo viên)')) return;
      Store.unlockUpTo(L.LEVELS.length);
      renderLevels();
      toast('Đã mở khóa tất cả các màn 🔓');
    });
    ui.levelGrid.addEventListener('click', function (e) {
      const card = e.target.closest('.level-card');
      if (!card) return;
      const lvl = L.levelById(card.getAttribute('data-id'));
      if (!lvl) return;
      Sfx.unlock();
      if (!Store.isUnlocked(lvl)) {
        Sfx.play('wrong');
        const prev = L.LEVELS[lvl.index - 1];
        toast('🔒 Hoàn thành phần hỏi đáp của màn ' + (prev ? prev.n + ' (' + prev.title + ')' : 'trước') + ' để mở khóa nhé!', 2600);
        return;
      }
      Sfx.play('click');
      showLesson(lvl, 'levels');
    });
    // Bài học
    click('btn-lesson-back', function () { lessonBack(); });
    click('btn-slide-prev', function () { slideStep(-1); });
    click('btn-slide-next', function () { slideStep(1); });
    click('btn-lesson-read', function () { const s = Lesson.level && Lesson.level.lesson[Lesson.i]; if (s) Voice.say(L.strip(s.text)); });
    click('btn-lesson-start', function () { if (Lesson.level) startGame(Lesson.level); });
    click('btn-lesson-skip', function () { if (Lesson.level) startGame(Lesson.level); });
    // Chơi
    click('btn-pause', function () { pauseGame(); });
    click('btn-resume', function () { resumeGame(); });
    click('btn-restart', function () { const l = G.level; if (l) startGame(l); });
    click('btn-pause-lesson', function () { if (G.level) showLesson(G.level, 'pause'); });
    click('btn-quit', function () { goMenu(); });
    // Kết quả
    click('btn-again', function () { const l = G.level; if (l) startGame(l); });
    click('btn-quiz', function () { if (G.level) startQuiz(G.level); });
    click('btn-next-level', function () { const n = G.level && L.LEVELS[G.level.index + 1]; if (n) showLesson(n, 'levels'); });
    click('btn-result-lesson', function () { if (G.level) showLesson(G.level, 'results'); });
    click('btn-other-level', function () { goLevels(); });
    click('btn-home', function () { goMenu(); });
    ui.reviewChips.addEventListener('click', function (e) {
      const s = e.target.closest('span[data-i]');
      if (!s) return;
      const r = G.review[Number(s.getAttribute('data-i'))];
      if (r) { Sfx.unlock(); Voice.say(r.text + ' ' + r.answer + '. ' + r.q.explain); }
    });
    // Hỏi đáp
    click('btn-quiz-back', function () { quizBack(); });
    click('btn-quiz-read', function () { const q = Quiz.list[Quiz.i]; if (q) Voice.say(q.speech + '. ' + q.options.map(L.optSpeech).join('. ')); });
    click('btn-quiz-next', function () { quizNext(); });
    click('btn-quiz-retry', function () { quizRetry(); });
    ui.quizAnswers.addEventListener('click', function (e) {
      const b = e.target.closest('button[data-i]');
      if (!b || b.disabled) return;
      Sfx.unlock();
      onQuizAnswer(Number(b.getAttribute('data-i')));
    });
    click('btn-quiz-play-next', function () { const n = Quiz.level && L.LEVELS[Quiz.level.index + 1]; if (n) showLesson(n, 'levels'); });
    click('btn-quiz-levels', function () { goLevels(); });
    click('btn-quiz-home', function () { goMenu(); });
    // Ghi nhớ
    ui.notesList.addEventListener('click', function (e) {
      const line = e.target.closest('.note-line');
      if (!line) return;
      Sfx.unlock(); Sfx.play('click');
      G.reading = false;
      if (!Voice.available) { toast('Thiết bị chưa có giọng đọc tiếng Việt 🙁'); return; }
      Voice.say(line.textContent, {
        onstart: function () { line.classList.add('speaking'); },
        onend: function () { line.classList.remove('speaking'); }
      });
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
  window.__CuoiHo = { G: G, Store: Store, Quiz: Quiz, Lesson: Lesson, startGame: startGame, choose: choose, endGame: endGame, startQuiz: startQuiz, onQuizAnswer: onQuizAnswer, quizNext: quizNext, quizRetry: quizRetry, showLesson: showLesson, goLevels: goLevels, curGate: curGate, update: update, render: render, layout: layout };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
