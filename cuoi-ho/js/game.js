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
  const pick = L.pick, esc = L.esc;
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
  const TAP_TIP_TEXT = '👆 Chạm vào vòng lửa có đáp án đúng để hổ nhảy qua!';
  const REVIEW_FIELDS = ['h', 'm', 'r', 'v', 'w', 'd', 'k'];   // các trường số hợp lệ trong info của câu ôn lại

  /* ================= LƯU TRỮ (localStorage) =================
     Thiết lập thiết bị ở cấp cao nhất (sound, music, voice, fx, seenTip). Tiến trình của từng bé nằm ở players[id]:
     { unlocked, levels, badge } (hình dạng cũ) + missed (câu từng sai để ôn lại thông minh) + stats (kết quả của bé).
     Dữ liệu cũ (progress ở cấp cao nhất) được chuyển sang bé mặc định p1. KHÔNG tin bất kỳ giá trị nào đọc từ máy:
     mọi trường đều được ép kiểu/kẹp khoảng, khóa __proto__/constructor/prototype bị loại bỏ khi đọc JSON. */
  const Store = {
    key: 'cuoi-ho-v1',
    data: { sound: true, music: true, voice: true, fx: 'full', seenTip: false, players: {} },
    blank() {
      return { unlocked: 1, levels: {}, badge: false, missed: {}, stats: { plays: 0, correct: 0, wrong: 0, seconds: 0, byTopic: {}, last: 0 } };
    },
    reviver(k, v) { return (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v; },
    int(v, lo, hi, def) { v = Math.floor(Number(v)); return Number.isFinite(v) ? clamp(v, lo, hi) : def; },
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
      this.data.players = {};
      const src = d.players && typeof d.players === 'object' ? d.players : null;
      if (src) {
        Object.keys(src).forEach(function (id) {
          if (/^[A-Za-z0-9_-]{1,24}$/.test(id) && src[id] && typeof src[id] === 'object') Store.data.players[id] = Store.sanitize(src[id]);
        });
      } else if (d.progress && typeof d.progress === 'object') {
        // Di trú dữ liệu cũ (chưa có players): tiến trình cũ thuộc về bé mặc định p1
        this.data.players.p1 = this.sanitize(d.progress);
        this.save();
      }
    },
    /** Ép một bucket tiến trình về đúng kiểu/khoảng. */
    sanitize(b) {
      const out = this.blank();
      if (!b || typeof b !== 'object') return out;
      out.unlocked = this.int(b.unlocked, 1, L.LEVELS.length, 1);
      out.badge = b.badge === true;
      const lv = b.levels && typeof b.levels === 'object' ? b.levels : {};
      L.LEVELS.forEach(function (l) {
        const r = lv[l.id];
        if (!r || typeof r !== 'object') return;
        out.levels[l.id] = Store.cleanRec(r);
      });
      const ms = b.missed && typeof b.missed === 'object' ? b.missed : {};
      Object.keys(ms).slice(0, 120).forEach(function (k) {
        const e = ms[k], key = Store.mkey(k);
        if (!key || !e || typeof e !== 'object') return;
        const info = Store.cleanInfo(e.info);
        if (!info) return;
        const q = L.regen(info);
        if (!q || Store.mkey(q.key) !== key) return;   // info phải sinh lại đúng câu đã lưu
        out.missed[key] = { n: Store.int(e.n, 1, 9999, 1), ok: Store.int(e.ok, 0, 9, 0), last: Store.int(e.last, 0, 9e15, 0), info: info };
      });
      Store.capMissed(out.missed);
      const st = b.stats && typeof b.stats === 'object' ? b.stats : {};
      out.stats.plays = this.int(st.plays, 0, 9999999, 0);
      out.stats.correct = this.int(st.correct, 0, 99999999, 0);
      out.stats.wrong = this.int(st.wrong, 0, 99999999, 0);
      out.stats.seconds = this.int(st.seconds, 0, 999999999, 0);
      out.stats.last = this.int(st.last, 0, 9e15, 0);
      const bt = st.byTopic && typeof st.byTopic === 'object' ? st.byTopic : {};
      Object.keys(bt).slice(0, 40).forEach(function (k) {
        const t = bt[k];
        if (!L.levelById(k) || !t || typeof t !== 'object') return;
        out.stats.byTopic[k] = { c: Store.int(t.c, 0, 99999999, 0), w: Store.int(t.w, 0, 99999999, 0) };
      });
      return out;
    },
    cleanRec(r) {
      r = r && typeof r === 'object' ? r : {};
      return { best: this.int(r.best, 0, 999999, 0), stars: this.int(r.stars, 0, 3, 0), quiz: r.quiz === true, done: r.done === true, plays: this.int(r.plays, 0, 99999, 0) };
    },
    cleanInfo(info) {
      if (!info || typeof info !== 'object' || typeof info.lv !== 'string' || !L.levelById(info.lv)) return null;
      const out = { lv: info.lv };
      for (let i = 0; i < REVIEW_FIELDS.length; i++) {
        const f = REVIEW_FIELDS[i], v = Number(info[f]);
        if (info[f] != null && Number.isFinite(v) && v >= 0 && v <= 1000) out[f] = v;
      }
      return out;
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
    lv(id) {
      const r = this.p().levels[id];
      return r ? this.cleanRec(r) : { best: 0, stars: 0, quiz: false, done: false, plays: 0 };
    },
    setLv(id, rec) {
      try {
        if (!L.levelById(id)) return;
        this.p().levels[id] = this.cleanRec(rec);
        this.save();
      } catch (e) { /* bỏ qua: lỗi lưu trữ không được làm hỏng ván chơi */ }
    },
    isUnlocked(level) { return level.index + 1 <= this.p().unlocked; },
    unlockUpTo(n) {
      const b = this.p();
      n = this.int(n, 1, L.LEVELS.length, 1);
      if (n > b.unlocked) { b.unlocked = n; this.save(); return true; }
      return false;
    },
    /* ---- Ôn lại thông minh ---- */
    noteMissed(key, info) {
      const m = this.p().missed; key = this.mkey(key);
      const clean = this.cleanInfo(info);
      if (!key || !clean) return;
      const q = L.regen(clean);
      if (!q || this.mkey(q.key) !== key) return;   // info phải sinh lại được đúng câu này (không lưu rác)
      const e = m[key] || { n: 0, ok: 0, last: 0, info: null };
      e.n = Math.min(9999, e.n + 1); e.ok = 0; e.last = Date.now(); e.info = clean; m[key] = e;
      this.capMissed(m);
      this.save();
    },
    noteOk(key) {
      const m = this.p().missed; key = this.mkey(key);
      const e = m[key];
      if (!e) return;
      e.ok++;
      if (e.ok >= 2) delete m[key];
      this.save();
    },
    /** Danh sách câu cần ôn (nhiều sai nhất trước); filterFn(info, key) để lọc theo màn. */
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
      s.plays++; s.correct += round.correct || 0; s.wrong += round.wrong || 0; s.seconds += Math.round(round.seconds || 0); s.last = Date.now();
      const bump = function (topic, c, w) {
        if (!topic || !L.levelById(topic)) return;
        const t = s.byTopic[topic] || { c: 0, w: 0 };
        t.c += c; t.w += w; s.byTopic[topic] = t;
      };
      if (round.topic) bump(round.topic, round.correct || 0, round.wrong || 0);
      if (round.perTopic) Object.keys(round.perTopic).forEach(function (k) { bump(k, round.perTopic[k].c || 0, round.perTopic[k].w || 0); });
      this.save();
    },
    resetActive() { this.data.players[this.activeId()] = this.blank(); this.save(); }
  };

  /* ================= CHUYỂN ĐỘNG GIẢM =================
     Tôn trọng prefers-reduced-motion và thiết lập "✨ Hiệu ứng: Ít": ít hạt hơn, không rung/chớp màn hình, tắt hoạt ảnh CSS. */
  const Motion = {
    lite: false,
    refresh() {
      let pref = false;
      try { pref = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { /* bỏ qua */ }
      this.lite = pref || Store.data.fx === 'lite';
      try { document.documentElement.classList.toggle('lite-fx', this.lite); } catch (e) { /* bỏ qua */ }
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
    shake: 0, flash: null, glowCache: {}, flameCache: {}, clockCache: {}, layers: {}, builtKey: '', vignette: null, tigerGfx: null,
    score: 0, hearts: MAX_HEARTS, streak: 0, bestStreak: 0, correct: 0, wrong: 0, review: [], firstChoice: true,
    hud: { score: -1, hearts: -1, stage: -1, mult: -1, time: '' },
    cdTimer: 0, resultShown: false, overAt: -1, endReason: '', wakeLock: null, cursor: 1, attractT: 0,
    lastCrackle: 0, lastStep: 0, quizPassedNow: false, cdPending: false, stars: 0, isRecord: false, welcomed: false,
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
    ipadTip: $('ipad-tip'),
    players: $('players'), report: $('report'), parentGate: $('parent-gate')
  };
  const SCREENS = ['menu', 'levels', 'lesson', 'notes', 'countdown', 'pause', 'gameover', 'quiz', 'players', 'report'];

  function showScreen(name) {
    SCREENS.forEach(function (k) { if (ui[k]) ui[k].classList.toggle('hidden', k !== name); });
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
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (w === G.W && h === G.H && dpr === G.dpr && G.bg) return;   // không đổi gì → không dựng lại các lớp
    G.dpr = dpr;
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
    G.ground = H - clamp(H * 0.13, 56, 120);
    let hudBottom = clamp(H * 0.24, 130, 210);
    if (inGame()) {
      try { hudBottom = Math.max(110, ui.timer.getBoundingClientRect().bottom + 8); } catch (e) { /* bỏ qua */ }
    }
    G.hudBottom = hudBottom;
    const avail = G.ground - 12 - hudBottom - 10;
    // Màn hình hẹp: vòng nhỏ hơn một chút và cú nhảy dài hơn để đầu hổ không che vòng dưới cùng
    const narrow = W < H || W < 700;
    const rMax = H > W ? 100 : 84;
    G.r = clamp(Math.min(avail / 6.9, W * (narrow ? 0.125 : 0.14), rMax), 34, rMax);
    G.jumpDist = clamp(G.r * (narrow ? 2.25 : 2.4), 90, 260);
    G.tigerX = Math.round(clamp(W * (narrow ? 0.24 : 0.27), G.jumpDist + G.r * 1.35, Math.max(G.jumpDist + G.r * 1.35, W - G.r * 1.3 - G.jumpDist)));
    G.stopX = G.tigerX + G.jumpDist;
    const low = G.ground - G.r - 10;
    G.laneY = [low - G.r * 4.6, low - G.r * 2.3, low];
    setSpeed();
    // Chỉ dựng lại các lớp đồ họa khi kích thước/bán kính thực sự thay đổi (xoay máy, đổi HUD)
    const key = [W, H, Math.round(G.ground), Math.round(G.r * 10), G.dpr].join(',');
    if (key !== G.builtKey) {
      G.builtKey = key;
      dropCache(G.glowCache); G.glowCache = {};
      dropCache(G.flameCache); G.flameCache = {};
      dropCache(G.clockCache); G.clockCache = {};
      buildBackground();
      buildTiles();
      buildTigerGfx();
      buildVignette();
    }
    repositionGates();
  }

  /** Giải phóng bộ nhớ của các sprite đã dựng. */
  function dropCache(obj) {
    for (const k in obj) { try { obj[k].width = 0; obj[k].height = 0; } catch (e) { /* bỏ qua */ } }
  }

  /** Gradient đầu/thân hổ tạo một lần theo bán kính (tọa độ cục bộ khi vẽ hổ). */
  function buildTigerGfx() {
    const u = G.r * 0.5;
    const hx = 1.55 * u, hy = -1.75 * u, R = 0.72 * u;
    const head = ctx.createRadialGradient(hx - 0.2 * u, hy - 0.25 * u, 0.1 * u, hx, hy, R);
    head.addColorStop(0, '#ffb347'); head.addColorStop(1, '#f28c1b');
    const body = ctx.createLinearGradient(0, -1.9 * u, 0, -0.3 * u);
    body.addColorStop(0, '#ffa63d'); body.addColorStop(1, '#f07f14');
    G.tigerGfx = { u: u, head: head, body: body };
  }

  /** Viền đỏ khi còn 1 tim: vẽ sẵn ở độ phân giải thấp (gradient mượt nên phóng to không lộ). */
  function buildVignette() {
    const W = G.W, H = G.H;
    if (!W || !H) return;
    const vw = Math.max(2, Math.ceil(W / 4)), vh = Math.max(2, Math.ceil(H / 4));
    G.vignette = layer(vw, vh, function (c) {
      const g = c.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.45, vw / 2, vh / 2, Math.max(vw, vh) * 0.75);
      g.addColorStop(0, 'rgba(255,40,80,0)');
      g.addColorStop(1, 'rgba(255,40,80,0.22)');
      c.fillStyle = g;
      c.fillRect(0, 0, vw, vh);
    }, 'vignette', 1);
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

  /** Canvas phụ (vẽ 1 lần). name: dùng lại canvas cũ cùng tên (không cấp phát mới khi cùng kích thước); dpr: ép tỉ lệ. */
  function layer(w, h, fn, name, dpr) {
    dpr = dpr || G.dpr;
    const pw = Math.max(1, Math.round(w * dpr)), ph = Math.max(1, Math.round(h * dpr));
    let c = name ? G.layers[name] : null;
    if (!c) { c = document.createElement('canvas'); if (name) G.layers[name] = c; }
    if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph; }
    const cx = c.getContext('2d');
    cx.setTransform(1, 0, 0, 1, 0, 0);
    cx.clearRect(0, 0, pw, ph);
    cx.scale(dpr, dpr);
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
    }, 'bg');
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
    }, 'aud');
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
    }, 'ground');
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
  function fxCount(n) { return Motion.lite ? Math.max(1, Math.round(n * 0.3)) : n; }
  function spawnBurst(x, y, r) {
    for (let i = 0, n = fxCount(34); i < n; i++) {
      const a = Math.random() * TAU, sp = 120 + Math.random() * 360;
      addPart({ kind: 'spark', x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, size: r * (0.05 + Math.random() * 0.07),
        color: pick(['#ffd166', '#ff9f1c', '#ffffff', '#ffe66d', '#ff6b35']), life: 0.5 + Math.random() * 0.5, max: 1 });
    }
    for (let i = 0, n = fxCount(10); i < n; i++) {
      const a = Math.random() * TAU, sp = 60 + Math.random() * 160;
      addPart({ kind: 'star', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, size: r * (0.12 + Math.random() * 0.14), rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 8,
        color: pick(['#ffd166', '#ffffff', '#ffe066']), life: 0.8 + Math.random() * 0.5, max: 1.3 });
    }
  }
  function spawnSmoke(x, y, r) {
    for (let i = 0, n = fxCount(12); i < n; i++) {
      const a = Math.random() * TAU, sp = 30 + Math.random() * 80;
      addPart({ kind: 'puff', x: x + Math.cos(a) * r * 0.6, y: y + Math.sin(a) * r * 0.6, vx: Math.cos(a) * sp * 0.4, vy: -40 - Math.random() * 60, size: r * (0.2 + Math.random() * 0.25), grow: r * 0.25,
        color: pick(['rgba(70,60,80,0.6)', 'rgba(110,100,120,0.55)', 'rgba(50,40,60,0.6)']), life: 0.5 + Math.random() * 0.3, max: 0.8 });
    }
    for (let i = 0, n = fxCount(14); i < n; i++) {
      const a = Math.random() * TAU, sp = 100 + Math.random() * 220;
      addPart({ kind: 'spark', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, size: r * (0.05 + Math.random() * 0.06), color: pick(['#ff3d00', '#ff7b1c', '#ffb703']), life: 0.4 + Math.random() * 0.4, max: 0.8 });
    }
  }
  function spawnEmber(x, y, r) {
    addPart({ kind: 'ember', x: x, y: y, vx: (Math.random() - 0.5) * 30, vy: -40 - Math.random() * 70, size: r * (0.03 + Math.random() * 0.04), color: pick(['#ffb703', '#ff7b1c', '#ffe066']), life: 0.6 + Math.random() * 0.7, max: 1.3 });
  }
  function spawnConfetti(n) {
    const cols = ['#ff6b35', '#ffd166', '#06d6a0', '#118ab2', '#ef476f', '#7b5ea7', '#2ec4b6'];
    n = fxCount(n);
    for (let i = 0; i < n; i++) {
      addPart({ kind: 'confetti', x: Math.random() * G.W, y: -20 - Math.random() * G.H * 0.5, vx: (Math.random() - 0.5) * 80, vy: 80 + Math.random() * 160,
        size: 6 + Math.random() * 8, color: pick(cols), rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 8, life: 4 + Math.random() * 2, max: 6, sway: Math.random() * TAU });
    }
  }
  function spawnHearts(x, y, r) {
    for (let i = 0, n = fxCount(8); i < n; i++) {
      addPart({ kind: 'heart', x: x + (Math.random() - 0.5) * r, y: y, vx: (Math.random() - 0.5) * 60, vy: -60 - Math.random() * 80, size: r * (0.12 + Math.random() * 0.1), color: pick(['#ff6b8b', '#ff8fb1']), life: 0.8 + Math.random() * 0.5, max: 1.3 });
    }
  }

  /* ================= CỤM VÒNG LỬA (GATE) ================= */
  /** Danh sách câu cần ôn phù hợp với màn (chỉ những câu thuộc màn này hoặc màn trước, ví dụ "giờ kém" không xuất hiện trước màn 5). */
  function reviewPoolFor(level) {
    return Store.reviewPool(function (info) {
      const lv = info && L.levelById(info.lv);
      return !!lv && lv.index <= level.index;
    });
  }

  function buildGates() {
    G.gates = [];
    const n = G.level.gates || 10;
    const first = G.stopX + G.speed * 1.3;
    const used = Object.create(null);
    const qs = [];
    for (let i = 0; i < n; i++) {
      let q = L.fresh(G.level.gen), tries = 0;
      while (used[q.key] && ++tries < 12) q = L.fresh(G.level.gen);   // không hỏi lại cùng một câu trong một ván
      used[q.key] = true;
      qs.push(q);
    }
    // Ôn lại thông minh: khoảng 25% câu (1–3) lấy từ những câu bé từng làm sai, sinh lại với đáp án nhiễu mới
    const pool = reviewPoolFor(G.level);
    if (pool.length) {
      const k = Math.min(pool.length, clamp(Math.round(n * 0.25), 1, 3));
      const step = Math.max(1, Math.floor(n / (k + 1)));
      let placed = 0;
      for (let j = 0; j < pool.length && placed < k; j++) {
        const q = L.regen(pool[j].info);
        if (!q || used[q.key]) continue;
        q.review = true;
        qs[Math.min(n - 1, 1 + placed * step)] = q;
        used[q.key] = true;
        placed++;
      }
    }
    for (let i = 0; i < n; i++) {
      G.gates.push({
        i: i, q: qs[i], wx: first + i * G.gap, chosen: -1, result: null, evaluated: false, active: false, passed: false, answeredAt: 0,
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
    // Sau một câu sai: không cắt ngang lời giải thích đang đọc, xếp câu hỏi mới đọc nối tiếp
    Voice.say(gate.q.speech, { queue: gate.i > 0 && !!G.gates[gate.i - 1] && G.gates[gate.i - 1].result !== 'ok' });
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
    if (G.streak % 3 === 0) spawnHearts(x, y - G.r, G.r);
    showHint('✓ ' + q.answerText, 'ok', 1800);
    cardFx('ok');
    if (!Motion.lite) G.flash = { c: '120,255,180', a: 0.14 };
    G.tiger.cheer = 0.9;
    Store.noteOk(q.key);   // trả lời đúng câu từng sai → tiến gần đến "đã thuộc"
  }

  /** Lời giải thích (chữ + giọng đọc) khi sai/hết giờ; giữ trên màn hình đến khi hổ chạy tiếp. Bé có thể chạm để chạy tiếp. */
  function explainHint(prefix, q) {
    showHint('<b>' + esc(prefix + q.answerText) + '</b> · ' + esc(q.explain), 'bad', 0, true);
    ui.tapTip.textContent = '👆 Chạm để chạy tiếp';
    ui.tapTip.hidden = false;
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
    if (!Motion.lite) { G.shake = 0.8; G.flash = { c: '255,60,60', a: 0.32 }; }
    Sfx.play('burn');
    Sfx.play('roar');
    // Chữ bay đặt phía trên, bên phải hổ (sau cú nhảy cụm vòng nằm bên trái hổ) để không che vòng đúng đang hé lộ
    addText('Ái! Nóng quá!', G.tigerX + G.r * 0.2, G.ground - G.r * 2.5, { color: '#ff5c7a', size: G.r * 0.55, life: 1.3, vy: -20, align: 'left' });
    cardFx('shake');
    loseHeart();
    explainHint('Đáp án: ', q);
    Voice.say('Chưa đúng. Đáp án là ' + q.answerSpeech + '. ' + q.explain);
    noteReview(q);
    Store.noteMissed(q.key, q.info);
  }

  function onMiss(gate) {
    const q = gate.q;
    gate.rings[q.answer].reveal = true;
    G.wrong++;
    G.streak = 0;
    if (!Motion.lite) G.flash = { c: '255,180,60', a: 0.25 };
    addText('Hết giờ!', G.tigerX + G.r * 0.2, G.ground - G.r * 2.5, { color: '#ffb703', size: G.r * 0.6, life: 1.3, vy: -20, align: 'left' });
    Sfx.play('wrong');
    loseHeart();
    explainHint('Hết giờ! Đáp án: ', q);
    Voice.say('Hết giờ rồi. Đáp án là ' + q.answerSpeech + '. ' + q.explain);
    noteReview(q);
    Store.noteMissed(q.key, q.info);
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
        // Đợi đọc xong lời giải thích (tối đa thêm 6 giây); bé có thể chạm màn hình để chạy tiếp ngay
        if (G.learnT >= LEARN_T && !(Voice.speaking() && G.learnT < LEARN_T + 6)) {
          if (G.hearts <= 0) { endGame('nolife'); return; }
          G.gateIdx++;
          G.phase = 'run';
          ui.hint.hidden = true;
          ui.tapTip.hidden = true;
          ui.tapTip.textContent = TAP_TIP_TEXT;
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

  const FLAME_PHASES = 6;
  /** Lửa quanh vòng: 14 ngọn lửa hai lớp. t = thời điểm hoạt hình (sprite dùng thời điểm cố định cho từng pha). */
  function drawFlames(c, x, y, r, intensity, hue, seed, t) {
    const cols = FIRE_COLORS[hue] || FIRE_COLORS.orange;
    const N = 14;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU + Math.sin(t * 0.9 + i + seed) * 0.06;
      const fl = 0.5 + 0.5 * Math.sin(t * 12 + i * 2.3 + seed) * Math.sin(t * 7.3 + i * 1.1);
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

  /** Sprite lửa dựng sẵn (mỗi màu × 6 pha) thay cho ~184 đường cong mỗi khung hình; dpr ≤ 1.5 vì lửa mềm, phóng to không lộ. */
  function flameSprite(hue, phase) {
    const key = hue + ':' + phase;
    let spr = G.flameCache[key];
    if (spr) return spr;
    const r = G.r, S = r * 3.6;
    spr = layer(S, S, function (c) { drawFlames(c, S / 2, S / 2, r, 1, hue, 0, phase * 0.37 + 1); }, null, Math.min(G.dpr, 1.5));
    G.flameCache[key] = spr;
    return spr;
  }

  /** Mặt đồng hồ nhỏ trong vòng lửa: vẽ một lần rồi dùng lại (60 vạch + 12 số mỗi khung hình là quá tốn). */
  function drawClockCached(c, x, y, R, scale, h, m) {
    const key = h + ':' + m + ':' + Math.round(R);
    let spr = G.clockCache[key];
    const S = Math.ceil(2 * R + 6);
    if (!spr) {
      if (Object.keys(G.clockCache).length >= 48) { dropCache(G.clockCache); G.clockCache = {}; }
      spr = G.clockCache[key] = layer(S, S, function (cc) { drawClock(cc, S / 2, S / 2, R, h, m); });
    }
    const d = S * (scale || 1);
    c.drawImage(spr, x - d / 2, y - d / 2, d, d);
  }

  /** Tách nhãn dài thành 2 dòng, không tách giữa số và đơn vị ("8 giờ 30 phút / chiều", "9 giờ kém / 15 phút"). */
  function splitLabel(s) {
    s = String(s);
    if (s.length <= 9 || s.indexOf(' ') < 0) return [s];
    const words = s.split(' ');
    let best = null, bestDiff = Infinity;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
      const d = Math.abs(a.length - b.length) + (/(giờ|phút|kém|Buổi|ngày|tháng|tuần|lễ)$/.test(a) ? 0 : 6);
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
    // Lửa: sprite dựng sẵn, đổi pha theo thời gian; to hơn khi bùng (sai) hoặc hé lộ (đúng)
    const ph = Math.floor(G.anim * 9 + gate.i * 1.7 + lane * 2.3) % FLAME_PHASES;
    const fs = 3.6 * r * (0.8 + 0.2 * intensity);
    c.drawImage(flameSprite(hue, ph), x - fs / 2, y - fs / 2, fs, fs);
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
      if (opt.clock) drawClockCached(c, x, y, r0 * 0.62, scale, opt.clock.h, opt.clock.m);
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
    // Đầu (gradient dựng sẵn theo bán kính, không cấp phát mỗi khung hình)
    c.fillStyle = tigerGfx(u).head;
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

  function tigerGfx(u) {
    if (!G.tigerGfx || G.tigerGfx.u !== u) buildTigerGfx();
    return G.tigerGfx;
  }

  function drawTiger(c) {
    const tg = G.tiger, u = G.r * 0.5;
    const x = G.tigerX, y = G.ground + tg.y;
    const running = tg.state === 'run';
    const jumping = G.phase === 'jump' && G.state === 'playing';
    const ph = tg.phase;
    const bob = running ? Math.abs(Math.sin(ph)) * 0.12 * u : (tg.state === 'idle' ? (Motion.lite ? 0 : Math.sin(G.anim * 2.5) * 0.04 * u) : tg.state === 'cheer' ? Math.abs(Math.sin(G.anim * 8)) * 0.35 * u : 0);
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
    c.fillStyle = tigerGfx(u).body; c.fillRect(-2 * u, -2 * u, 4 * u, 2 * u);
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
      c.textAlign = t.align || 'center';
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
    // Khi đang xem đáp án đúng: vẽ lại cụm vòng lên trên hổ để đầu hổ không che vòng đúng (màn hình hẹp)
    if (inGame() && G.phase === 'learn') { const cg = curGate(); if (cg) drawGate(c, cg); }
    drawParts(c);
    drawTexts(c);
    if (G.shake > 0) c.translate(-sx, -sy);
    if (G.state === 'playing' && G.hearts === 1 && G.vignette) {
      c.globalAlpha = 0.65 + 0.35 * Math.sin(G.anim * 5);
      c.drawImage(G.vignette, 0, 0, W, H);
      c.globalAlpha = 1;
    }
    if (G.flash) {
      c.fillStyle = 'rgba(' + G.flash.c + ',' + Math.max(0, G.flash.a).toFixed(2) + ')';
      c.fillRect(0, 0, W, H);
    }
  }

  /* ================= HUD ================= */
  function renderQuestion(q) {
    ui.prompt.innerHTML = q ? (q.review ? '<span class="review-tag">📝 Ôn lại</span> ' : '') + q.prompt : 'Sẵn sàng…';
    const vis = q ? L.visualHtml(q, 104) : '';
    ui.visual.innerHTML = vis;
    ui.visual.hidden = !vis;
    ui.question.classList.remove('ok', 'shake', 'pop');
    void ui.question.offsetWidth;
    ui.question.classList.add('pop');
    ui.timer.classList.remove('idle');
    ui.hint.hidden = true;
  }

  /** Chip thông báo dưới thẻ câu hỏi. ms = 0: không tự ẩn (ẩn khi hổ chạy tiếp); html = true: text đã là HTML an toàn (đã esc). */
  function showHint(text, kind, ms, html) {
    const el = ui.hint;
    if (html) el.innerHTML = text; else el.textContent = text;
    el.className = 'hint ' + (kind || '');
    el.hidden = false;
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
    clearTimeout(showHint._t);
    if (ms !== 0) showHint._t = setTimeout(function () { el.hidden = true; }, ms || 2400);
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
      ui.hearts.setAttribute('aria-label', 'Còn ' + G.hearts + ' tim');
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
      ui.timer.setAttribute('aria-label', 'Còn ' + tt + ' giây');
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
    ui.tapTip.textContent = TAP_TIP_TEXT;
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
    G.overAt = -1; G.resultShown = false; G.resultSaved = false; G.quizPassedNow = false; G.stars = 0; G.isRecord = false; G.cdPending = false;
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
      // Tab bị ẩn giữa lúc đếm ngược: chờ hiện lại rồi mới đếm tiếp (không để ván bắt đầu chạy khi không ai nhìn)
      if (document.hidden) { G.cdPending = true; G.cdTimer = setTimeout(step, 300); return; }
      G.cdPending = false;
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
          if (document.hidden) pauseGame();
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

  /** Sao: về đích không sai câu nào 3 sao, sai 1 câu 2 sao, về đích 1 sao; không về đích 0 sao. */
  function starsFor(correct, total, finished) {
    if (!finished) return 0;
    const wrong = Math.max(0, total - correct);
    return wrong === 0 ? 3 : wrong === 1 ? 2 : 1;
  }

  function starsHtml(n) {
    let h = '';
    for (let i = 0; i < 3; i++) h += '<span class="' + (i < n ? 'on' : 'off') + '">★</span>';
    return h;
  }

  /** Lưu kết quả ván (đúng một lần mỗi ván): kỷ lục, sao, thống kê cho báo cáo. Lỗi lưu trữ không được làm mất màn kết quả. */
  function persistResults() {
    if (G.resultSaved || !G.level) return;
    G.resultSaved = true;
    const lvl = G.level, score = G.score, finished = G.endReason === 'finish';
    G.stars = starsFor(G.correct, G.gates.length, finished);
    G.isRecord = false;
    try {
      const rec = Store.lv(lvl.id);
      G.isRecord = finished && score > 0 && score > rec.best;
      rec.plays = rec.plays + 1;
      if (finished) { rec.done = true; rec.best = Math.max(rec.best, score); rec.stars = Math.max(rec.stars, G.stars); }
      Store.setLv(lvl.id, rec);
      // Thống kê theo chủ đề; màn Siêu Hổ trộn nhiều chủ đề nên tính thêm theo từng câu
      const per = {};
      if (lvl.id === 'l9') {
        G.gates.forEach(function (g) {
          if (!g.evaluated || !g.q.topic) return;
          const t = per[g.q.topic] || { c: 0, w: 0 };
          if (g.result === 'ok') t.c++; else t.w++;
          per[g.q.topic] = t;
        });
      }
      Store.addStats({ correct: G.correct, wrong: G.wrong, seconds: G.time, topic: lvl.id, perTopic: per });
    } catch (e) { /* bỏ qua: dữ liệu hỏng/hết chỗ không được che màn kết quả */ }
  }

  /** Vẽ màn kết quả (gọi lại được khi quay về từ bài học/hỏi đáp, không lưu lại và không phát lại hiệu ứng). */
  function renderResults() {
    const lvl = G.level;
    if (!lvl) return;
    const score = G.score, finished = G.endReason === 'finish', stars = G.stars;
    const rec = Store.lv(lvl.id);
    const next = L.LEVELS[lvl.index + 1];

    ui.resultTitle.textContent = finished ? '🏁 Về đích!' : '😿 Hổ mệt rồi!';
    ui.resultTitle.className = 'result-title ' + (finished ? 'finish' : 'nolife');
    ui.resultLevel.textContent = lvl.icon + ' Màn ' + lvl.n + ': ' + lvl.title;
    ui.resultScore.textContent = fmt(score);
    ui.resultStars.innerHTML = starsHtml(stars);
    ui.resultStars.setAttribute('aria-label', stars + ' sao');
    ui.resultRecord.hidden = !G.isRecord;
    ui.stCorrect.textContent = G.correct;
    ui.stWrong.textContent = G.wrong;
    ui.stCombo.textContent = G.bestStreak;
    const total = G.correct + G.wrong;
    ui.stAcc.textContent = total ? Math.round(G.correct / total * 100) + '%' : '–';

    ui.review.hidden = !G.review.length;
    ui.reviewChips.innerHTML = G.review.map(function (r, i) {
      const vis = r.q.clock ? L.clockSvg(r.q.clock, 36, 'mini') : r.q.digital ? '<i class="dg">' + esc(r.q.digital) + '</i>' : '';
      return '<span data-i="' + i + '" role="button" tabindex="0" aria-label="Nghe lại: ' + esc(r.text + ' ' + r.answer) + '">' + vis + '<span class="tx">' + esc(r.text) + ' → <b>' + esc(r.answer) + '</b></span></span>';
    }).join('');

    if (finished) {
      ui.btnQuiz.hidden = false;
      ui.btnQuiz.textContent = rec.quiz ? '❓ Hỏi đáp lại' : (next ? '❓ HỎI ĐÁP – mở khóa màn ' + next.n : '🏆 HỎI ĐÁP – nhận Huy hiệu Hổ Vàng');
      ui.btnQuiz.className = 'btn ' + (rec.quiz ? 'small purple' : 'big purple');
      ui.btnAgain.className = 'btn ' + (rec.quiz ? 'small' : 'big');
      ui.btnNextLevel.hidden = !(rec.quiz && next);
      if (rec.quiz && next) ui.btnNextLevel.textContent = '▶ Màn ' + next.n + ': ' + next.title;
      ui.resultMsg.textContent = (rec.quiz
        ? (next ? 'Con đã mở khóa màn tiếp theo rồi. Chơi lại để phá kỷ lục hoặc sang màn mới nhé!' : 'Con đã hoàn thành cả hành trình! Chơi lại để phá kỷ lục nhé.')
        : (next ? 'Trả lời đúng các câu hỏi đáp để mở khóa màn ' + next.n + ': ' + next.title + '!' : 'Trả lời đúng các câu hỏi đáp cuối cùng để nhận Huy hiệu Hổ Vàng!')) +
        (stars < 3 ? ' Không sai câu nào để được 3 sao!' : '');
    } else {
      ui.btnQuiz.hidden = true;
      ui.btnAgain.className = 'btn big';
      ui.btnNextLevel.hidden = true;
      ui.resultMsg.textContent = 'Hết tim rồi! Xem lại bài học, ôn các câu sai rồi cưỡi hổ thử lại nhé. Cần về đích mới được vào phần hỏi đáp.';
    }
  }

  function showResults() {
    G.resultShown = true;
    persistResults();
    renderResults();
    showScreen('gameover');
    if (G.isRecord) { Sfx.play('record'); spawnConfetti(100); Voice.say('Kỷ lục mới! Giỏi quá!', { queue: true }); }
    else if (G.stars >= 2) { spawnConfetti(60); Voice.say('Chơi tốt lắm!', { queue: true }); }
    setTimeout(function () { if (G.state === 'over') Music.play('menu'); }, 2000);
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
    G.reading = false;
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
    const p = Store.p();
    let stars = 0, done = 0;
    L.LEVELS.forEach(function (l) { const r = Store.lv(l.id); stars += r.stars; if (r.quiz) done++; });
    ui.journeyStats.innerHTML =
      '<span>⭐ ' + stars + '/' + (L.LEVELS.length * 3) + ' sao</span>' +
      '<span>✅ ' + done + '/' + L.LEVELS.length + ' màn đã hỏi đáp</span>' +
      (p.badge ? '<span class="badge">🏆 Huy hiệu Hổ Vàng</span>' : '');
    // Màn "hiện tại" = màn đầu tiên đã mở mà chưa xong hỏi đáp (sau "mở khóa tất cả" vẫn là màn bé đang học dở)
    let currentId = null;
    for (let i = 0; i < L.LEVELS.length && !currentId; i++) { const l = L.LEVELS[i]; if (Store.isUnlocked(l) && !Store.lv(l.id).quiz) currentId = l.id; }
    if (!currentId) currentId = L.LEVELS[clamp(p.unlocked, 1, L.LEVELS.length) - 1].id;
    ui.levelGrid.innerHTML = L.LEVELS.map(function (l) {
      const rec = Store.lv(l.id);
      const locked = !Store.isUnlocked(l);
      const current = l.id === currentId;
      const prev = L.LEVELS[l.index - 1];
      const know = !locked && mastered(l.id);
      const label = 'Màn ' + l.n + ': ' + l.title + ', ' + gradeLabel(l.grade) + (locked ? ', đang khóa' : ', ' + rec.stars + ' sao' + (rec.quiz ? ', đã hỏi đáp' : '') + (know ? ', đã thuộc' : ''));
      return '<div class="level-card' + (locked ? ' locked' : '') + (current ? ' current' : '') + '" data-id="' + l.id + '" role="button" tabindex="' + (locked ? '-1' : '0') + '"' + (locked ? ' aria-disabled="true"' : '') + ' aria-label="' + esc(label) + '">' +
        '<span class="grade ' + gradeClass(l.grade) + '">' + gradeLabel(l.grade) + '</span>' +
        (rec.quiz ? '<span class="quiz-ok">✅ Đã hỏi<span class="long"> đáp</span></span>' : '') +
        '<div class="icon">' + l.icon + '</div>' +
        '<div class="name"><span class="num">Màn ' + l.n + ':</span> ' + esc(l.title) + '</div>' +
        '<div class="desc">' + esc(l.desc) + (know ? ' <b class="mastered">🎓 Đã thuộc</b>' : '') + '</div>' +
        '<div class="meta"><span class="best">🏆 ' + fmt(rec.best) + '</span><span class="stars" aria-hidden="true">' + starsHtml(rec.stars) + '</span></div>' +
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
    ui.lessonBack.textContent = Lesson.from === 'pause' ? '← Tạm dừng' : Lesson.from === 'results' ? '← Kết quả' : '← Quay lại';
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
    if (Lesson.from === 'results') { G.state = 'over'; renderResults(); showScreen('gameover'); Voice.stop(); return; }
    goLevels();
  }

  /* ================= GHI NHỚ ================= */
  function renderNotes() {
    ui.notesList.innerHTML = L.LEVELS.filter(function (l) { return l.grade > 0; }).map(function (l) {
      return '<div class="note-group"><h3>' + l.icon + ' Màn ' + l.n + ': ' + esc(l.title) + '<span class="g">' + gradeLabel(l.grade) + '</span></h3>' +
        l.notes.map(function (t, i) { return '<div class="note-line" role="button" tabindex="0" data-l="' + l.id + '" data-i="' + i + '">' + esc(t) + '</div>'; }).join('') + '</div>';
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
    if (!level) return;
    Quiz.level = level;
    Quiz.i = 0;
    Quiz.wrongTotal = 0;
    const list = level.quiz.map(function (z) { return L.mkQ(z); });
    // 1–2 câu bé vừa làm sai trong ván này (sinh lại với đáp án nhiễu mới); không sai câu nào thì lấy một câu từ kho ôn lại, hoặc một câu thêm
    const rev = (G.level === level ? G.review : []).slice(0, 2);
    rev.forEach(function (r) { const q = (r.q.info && L.regen(r.q.info)) || r.q; q.review = true; list.push(q); });
    if (!rev.length) {
      const pool = reviewPoolFor(level);
      let q = pool.length ? L.regen(pool[0].info) : null;
      if (q) q.review = true; else { q = L.fresh(level.gen); q.extra = true; }
      list.push(q);
    }
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
    ui.quizText.innerHTML = (q.review ? '<span class="review-tag">📝 Ôn lại:</span> ' : q.extra ? '<span class="review-tag extra">🔥 Câu thêm:</span> ' : '') + q.prompt;
    ui.quizAnswers.innerHTML = q.options.map(function (o, i) {
      return '<button type="button" data-i="' + i + '" aria-label="Đáp án ' + (i + 1) + ': ' + esc(L.optLabel(o)) + '">' + L.optionHtml(o, 88) + '</button>';
    }).join('');
    ui.quizFeedback.className = 'quiz-feedback is-empty';   // giữ chỗ để các nút không nhảy khi hiện lời giải
    ui.quizFeedback.innerHTML = '';
    ui.quizNext.hidden = true;
    ui.quizRetry.hidden = true;
    Voice.say(q.speech);
  }

  function onQuizAnswer(idx) {
    if (Quiz.answered) return;
    const q = Quiz.list[Quiz.i];
    idx = Number(idx);
    if (!q || !(idx >= 0 && idx < q.options.length)) return;
    const ok = idx === q.answer;
    Quiz.answered = true;
    q.tries = (q.tries || 0) + 1;
    const reveal = !ok && q.tries >= 2;   // sau 2 lần sai mới đánh dấu đáp án đúng (không "mò" được ngay lần đầu)
    const btns = ui.quizAnswers.querySelectorAll('button');
    for (let i = 0; i < btns.length; i++) {
      btns[i].disabled = true;
      if (i === idx) btns[i].classList.add(ok ? 'ok' : 'bad');
      else if (reveal && i === q.answer) btns[i].classList.add('ok');
      else btns[i].classList.add('dim');
    }
    const dots = ui.quizDots.children;
    if (ok) {
      ui.quizFeedback.className = 'quiz-feedback ok';
      ui.quizFeedback.innerHTML = '✅ <b>Đúng rồi!</b> ' + esc(q.explain);
      ui.quizNext.hidden = false;
      ui.quizNext.textContent = Quiz.i === Quiz.list.length - 1 ? '🎉 Hoàn thành' : 'Tiếp ▶';
      if (dots[Quiz.i]) dots[Quiz.i].className = 'done';
      Sfx.play('correct');
      Voice.say('Đúng rồi! ' + q.explain);
      if (q.tries === 1) Store.noteOk(q.key);
    } else {
      Quiz.wrongTotal++;
      ui.quizFeedback.className = 'quiz-feedback bad';
      ui.quizFeedback.innerHTML = reveal
        ? '❌ <b>Chưa đúng.</b> Đáp án đúng là <b>' + esc(q.answerText) + '</b>. ' + esc(q.explain) + ' <b>Thử lại nhé!</b>'
        : '❌ <b>Chưa đúng.</b> ' + esc(q.explain) + ' <b>Nghĩ kỹ rồi thử lại nhé!</b>';
      ui.quizRetry.hidden = false;
      if (dots[Quiz.i]) dots[Quiz.i].className = 'bad';
      Sfx.play('wrong');
      Voice.say(reveal ? 'Chưa đúng. Đáp án đúng là ' + q.answerSpeech + '. ' + q.explain + ' Thử lại nhé!' : 'Chưa đúng. ' + q.explain + ' Nghĩ kỹ rồi thử lại nhé!');
      Store.noteMissed(q.key, q.info);   // chỉ lưu được câu sinh tự động (có info); câu hỏi đáp cố định bị bỏ qua
    }
  }

  function quizRetry() {
    const q = Quiz.list[Quiz.i];
    if (!q) return;
    if ((q.review || q.extra) && (q.tries || 0) < 2 && q.info) {
      // Câu sinh tự động: sinh lại cùng câu hỏi với đáp án nhiễu mới (không mò theo vị trí cũ)
      const nq = L.regen(q.info);
      if (nq) { nq.review = q.review; nq.extra = q.extra; nq.tries = q.tries; Quiz.list[Quiz.i] = nq; }
      else reshuffleQ(q);
    } else reshuffleQ(q);
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
    else { const b = Store.p(); if (!b.badge) { b.badge = true; Store.save(); unlocked = true; } }
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
    if (firstTime && !next) spawnConfetti(100);
  }

  function quizBack() {
    Voice.stop();
    G.reading = false;
    if (G.level && G.resultShown) { G.state = 'over'; renderResults(); showScreen('gameover'); Music.play('menu'); }
    else goLevels();
  }

  /* ================= NGƯỜI CHƠI (hồ sơ dùng chung, js/profile.js) ================= */
  const PlayersUI = { mode: null, avatar: null, from: 'menu' };

  function sumStars(bucket) {
    let s = 0;
    if (!bucket || !bucket.levels) return 0;
    L.LEVELS.forEach(function (l) { const r = bucket.levels[l.id]; if (r) s += Store.int(r.stars, 0, 3, 0); });
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
        '<span class="pl-avatar" aria-hidden="true">' + esc(p.avatar) + '</span><span class="pl-name">' + esc(p.name) + '<span class="pl-sub">⭐ ' + stars + ' sao</span></span></button>';
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
  function closePlayers() { PlayersUI.mode = null; showScreen(PlayersUI.from === 'levels' ? 'levels' : 'menu'); }

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

  /** Lời chào theo tên, một lần mỗi lần mở trang (gọi sau thao tác chạm đầu tiên để iOS cho phép đọc). */
  function welcome() {
    if (G.welcomed || !window.Players) return;
    G.welcomed = true;
    Voice.say('Chào ' + Players.active().name + '! Cùng cưỡi hổ học xem đồng hồ nào!');
  }

  /* ================= KẾT QUẢ CỦA BÉ (báo cáo cho phụ huynh) ================= */
  const Report = { from: 'levels' };

  /** "Đã thuộc" một chủ đề: đúng ≥ 90% trên ít nhất 20 câu. */
  function mastered(topic) {
    const t = Store.p().stats.byTopic[topic];
    if (!t) return false;
    const n = t.c + t.w;
    return n >= 20 && t.c / n >= 0.9;
  }

  /** Mô tả câu cần ôn cho phụ huynh, ví dụ "🕘 Màn 5 · 🕒 7 giờ 45 phút: Đọc theo cách “giờ kém” → 8 giờ kém 15 phút". */
  function describeReview(it) {
    const q = L.regen(it.info);
    const lv = it.info && L.levelById(it.info.lv);
    const head = lv ? lv.icon + ' Màn ' + lv.n + ' · ' : '';
    if (!q) return head + String(it.key).split('|')[0];
    const vis = q.clock ? '🕒 ' + L.plain(q.clock.h, q.clock.m) + ': ' : q.digital ? '⏱ ' + q.digital + ': ' : '';
    return head + vis + L.strip(q.prompt) + ' → ' + q.answerText;
  }

  function renderReport() {
    if (!window.Players || !ui.report) return;
    const p = Players.active(), b = Store.p(), s = b.stats;
    $('report-title').textContent = '📊 Kết quả của ' + p.name;
    const total = s.correct + s.wrong, acc = total ? Math.round(s.correct / total * 100) : 0;
    let stars = 0;
    L.LEVELS.forEach(function (l) { stars += Store.lv(l.id).stars; });
    $('report-stats').innerHTML =
      '<div class="report-stat"><div class="v">' + fmt(s.plays) + '</div><div class="k">ván đã chơi</div></div>' +
      '<div class="report-stat"><div class="v">' + acc + '%</div><div class="k">trả lời đúng</div></div>' +
      '<div class="report-stat"><div class="v">' + Math.round(s.seconds / 60) + '</div><div class="k">phút luyện tập</div></div>' +
      '<div class="report-stat"><div class="v">' + stars + '/' + (L.LEVELS.length * 3) + '</div><div class="k">sao</div></div>';
    $('report-levels').innerHTML = L.LEVELS.map(function (l) {
      const r = Store.lv(l.id), t = s.byTopic[l.id] || { c: 0, w: 0 }, n = t.c + t.w;
      return '<div class="report-row"><span class="t">' + esc(l.icon + ' Màn ' + l.n + ': ' + l.title) + '</span>' +
        '<span class="stars" aria-label="' + r.stars + ' sao">' + starsHtml(r.stars) + '</span><span>🏆 ' + fmt(r.best) + '</span>' +
        (n ? '<span>' + Math.round(t.c / n * 100) + '% (' + n + ' câu)</span>' : '<span class="muted">chưa chơi</span>') +
        (mastered(l.id) ? '<span class="mastered">✅ Đã thuộc</span>' : '') +
        (r.quiz ? '<span class="quiz-tag">❓ đã hỏi đáp</span>' : '') + '</div>';
    }).join('');
    // Chủ đề yếu nhất: đã làm ≥ 5 câu mà đúng dưới 70%
    const weak = L.LEVELS.filter(function (l) { const t = s.byTopic[l.id]; return t && t.c + t.w >= 5 && t.c / (t.c + t.w) < 0.7; })
      .map(function (l) { return l.icon + ' ' + l.title; });
    const pool = Store.reviewPool();
    $('report-review').innerHTML =
      (weak.length ? '<div class="report-row weak"><span class="t">Chủ đề cần luyện thêm: ' + esc(weak.join(', ')) + '</span></div>' : '') +
      (pool.length
        ? pool.slice(0, 12).map(function (it) { return '<div class="report-row"><span class="t">' + esc(describeReview(it)) + '</span><span>✖ ' + it.n + '</span></div>'; }).join('')
        : '<div class="report-row"><span class="t">Chưa có gì cần ôn — tuyệt vời! 🎉</span></div>');
  }

  function openReport(from) {
    Report.from = from || 'levels';
    renderReport();
    showScreen('report');
  }
  function closeReport() {
    if (Report.from === 'players') { renderPlayers(); showScreen('players'); }
    else if (Report.from === 'menu') showScreen('menu');
    else { renderLevels(); showScreen('levels'); }
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
    if (errShown++ < 3) {                     // không spam thông báo
      try { console.error('[cuoi-ho]', msg); } catch (e) { /* bỏ qua */ }
      try { toast('Có lỗi nhỏ, con thử lại nhé! 🙏', 2600); } catch (e) { /* bỏ qua */ }
    }
    try { if (inGame()) goMenu(); } catch (e) { /* bỏ qua */ }   // kết thúc ván an toàn thay vì đứng hình
  }

  /* ================= ĐẦU VÀO ================= */
  /** Bé chạm/ấn để chạy tiếp ngay khi đang xem đáp án đúng (sau ít nhất 0,9 giây để kịp nhìn). */
  function skipLearn() {
    if (G.state !== 'playing' || G.phase !== 'learn' || G.learnT < 0.9) return;
    G.learnT = Math.max(G.learnT, LEARN_T + 6);
    Voice.stop();
  }

  function onCanvasDown(e) {
    Sfx.unlock();
    if (G.state === 'playing' && G.phase === 'learn') { skipLearn(); if (e.cancelable) e.preventDefault(); return; }
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
    // Chặn cuộn/zoom chỉ trên canvas (không chặn toàn trang để các bảng vẫn cuộn được)
    canvas.addEventListener('touchmove', function (e) { if (e.cancelable) e.preventDefault(); }, { passive: false });
    canvas.addEventListener('touchstart', function (e) { if (e.cancelable) e.preventDefault(); }, { passive: false });
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    document.addEventListener('dblclick', function (e) { if (e.target === canvas) e.preventDefault(); });
    document.addEventListener('contextmenu', function (e) { if (e.target === canvas) e.preventDefault(); });
    document.addEventListener('pointerdown', function () { Sfx.unlock(); }, { passive: true, capture: true });
    document.addEventListener('keydown', onKey);
  }

  function isOpen(el) { return !!el && !el.classList.contains('hidden'); }

  function onKey(e) {
    const t = e.target;
    // Escape đóng cổng phụ huynh / biểu mẫu tên ngay cả khi đang ở trong ô nhập
    if (e.key === 'Escape' && isOpen(ui.parentGate)) { closeGate(); e.preventDefault(); return; }
    if (e.key === 'Escape' && isOpen(ui.players) && PlayersUI.mode) { PlayersUI.mode = null; renderPlayers(); e.preventDefault(); return; }
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;   // đang gõ tên / đáp án
    // Các lớp phủ (điều khiển theo màn hình đang hiện, không theo G.state: bài học/hỏi đáp có thể mở từ tạm dừng hay kết quả)
    if (isOpen(ui.parentGate)) { if (e.key === 'Escape') { closeGate(); e.preventDefault(); } return; }
    if (isOpen(ui.howto)) { if (e.key === 'Escape' || e.key === 'Enter') { ui.howto.classList.add('hidden'); e.preventDefault(); } return; }
    if (isOpen(ui.report)) { if (e.key === 'Escape') { closeReport(); e.preventDefault(); } return; }
    if (isOpen(ui.players)) { if (e.key === 'Escape') { closePlayers(); e.preventDefault(); } return; }
    if (isOpen(ui.lesson)) {
      if (e.key === 'ArrowRight') { slideStep(1); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { slideStep(-1); e.preventDefault(); }
      else if (e.key === 'Enter' && !ui.lessonStart.hidden) { startGame(Lesson.level); e.preventDefault(); }
      else if (e.key === 'Escape') { lessonBack(); e.preventDefault(); }
      return;
    }
    if (isOpen(ui.quiz)) {
      if (ui.quizBody.hidden) return;
      if (/^[1-3]$/.test(e.key) && !Quiz.answered) { onQuizAnswer(Number(e.key) - 1); e.preventDefault(); }
      else if (e.key === 'Enter') { if (!ui.quizNext.hidden) quizNext(); else if (!ui.quizRetry.hidden) quizRetry(); e.preventDefault(); }
      else if (e.key === 'Escape') { quizBack(); e.preventDefault(); }
      return;
    }
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
      if (G.state === 'playing') pauseGame(); else if (G.state === 'paused') resumeGame();
      return;
    }
    if (G.state === 'playing' && G.phase === 'learn') { if (e.key === 'Enter' || e.key === ' ') { skipLearn(); e.preventDefault(); } return; }
    if (G.state !== 'playing' || G.phase !== 'choose') return;
    if (/^[1-3]$/.test(e.key)) { choose(Number(e.key) - 1); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { G.kbd = true; G.cursor = clamp(G.cursor - 1, 0, LANES - 1); Sfx.play('click'); e.preventDefault(); }
    else if (e.key === 'ArrowDown') { G.kbd = true; G.cursor = clamp(G.cursor + 1, 0, LANES - 1); Sfx.play('click'); e.preventDefault(); }
    else if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') { G.kbd = true; choose(G.cursor); e.preventDefault(); }
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
        const on = d.key === 'fx' ? Store.data.fx !== 'lite' : (Store.data[d.key] !== false && !noVoice);
        let label = on ? d.on : d.off;
        if (noVoice) label = '🗣️ Giọng đọc: chưa có giọng Việt';
        return '<button type="button" class="toggle ' + (on ? 'on' : 'off') + (d.key === 'fx' ? ' fx' : '') + '" data-set="' + d.key + '" aria-pressed="' + on + '"' +
          (noVoice ? ' disabled' : '') + '>' + label + '</button>';
      }).join('');
    }
  }

  function bindUi() {
    click('btn-play', function () { welcome(); goLevels(); });   // lời chào theo tên ở thao tác đầu tiên
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
      if (k === 'fx') { Store.data.fx = Store.data.fx === 'lite' ? 'full' : 'lite'; Motion.refresh(); }
      else Store.data[k] = !(Store.data[k] !== false);
      Store.save();
      applyAudioSettings();
      renderAudioToggles();
      if (k === 'fx') { Sfx.play('click'); toast(Motion.lite ? 'Hiệu ứng ít: bớt rung, chớp và tia lửa ✨' : 'Hiệu ứng đầy đủ ✨'); }
      else if (Store.data[k] !== false) {
        if (k === 'sound') Sfx.play('correct');
        if (k === 'voice') Voice.say('Xin chào ' + (window.Players ? Players.active().name : 'con') + '! Cùng cưỡi hổ học xem đồng hồ nào!');
      } else {
        Sfx.play('click');
      }
    });
    click('btn-levels-back', function () { goMenu(); });
    click('btn-unlock-all', function () {
      adultGate(function () {
        Store.unlockUpTo(L.LEVELS.length);
        renderLevels();
        toast('Đã mở khóa tất cả các màn 🔓');
      });
    });
    const openCard = function (card) {
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
    };
    ui.levelGrid.addEventListener('click', function (e) { const card = e.target.closest('.level-card'); if (card) openCard(card); });
    ui.levelGrid.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest ? e.target.closest('.level-card') : null;
      if (!card) return;
      e.preventDefault();
      openCard(card);
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
    const speakChip = function (s) {
      const r = G.review[Number(s.getAttribute('data-i'))];
      if (r) { Sfx.unlock(); Voice.say(r.text + ' ' + r.answer + '. ' + r.q.explain); }
    };
    ui.reviewChips.addEventListener('click', function (e) { const s = e.target.closest('span[data-i]'); if (s) speakChip(s); });
    ui.reviewChips.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const s = e.target.closest ? e.target.closest('span[data-i]') : null;
      if (s) { e.preventDefault(); speakChip(s); }
    });
    // Hỏi đáp
    click('btn-quiz-back', function () { quizBack(); });
    click('btn-quiz-read', function () {
      const q = Quiz.list[Quiz.i];
      if (!q) return;
      // Không đọc lần lượt các đồng hồ (đọc ra là lộ đáp án); câu chữ thì đọc đủ ba lựa chọn
      Voice.say(q.options.some(function (o) { return o.clock; }) ? q.speech + '. Chọn đồng hồ đúng trong ba đồng hồ.' : q.speech + '. ' + q.options.map(L.optSpeech).join('. '));
    });
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
    const speakLine = function (line) {
      Sfx.unlock(); Sfx.play('click');
      G.reading = false;
      if (!Voice.available) { toast('Thiết bị chưa có giọng đọc tiếng Việt 🙁'); return; }
      Voice.say(line.textContent, {
        onstart: function () { line.classList.add('speaking'); },
        onend: function () { line.classList.remove('speaking'); }
      });
    };
    ui.notesList.addEventListener('click', function (e) { const line = e.target.closest('.note-line'); if (line) speakLine(line); });
    ui.notesList.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const line = e.target.closest ? e.target.closest('.note-line') : null;
      if (line) { e.preventDefault(); speakLine(line); }
    });

    // Người chơi (hồ sơ dùng chung giữa các game)
    click('btn-player', function () { welcome(); openPlayers('menu'); });
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
    // Kết quả của bé (phụ huynh)
    click('btn-report', function () { openReport('players'); });
    click('btn-report-levels', function () { openReport('levels'); });
    click('btn-report-back', function () { closeReport(); });
    click('btn-report-reset', function () {
      adultGate(function () {
        const name = Players.active().name;
        Store.resetActive();
        toast('Đã xóa tiến trình của ' + name);
        renderReport();
      });
    });
    // Cổng phụ huynh
    $('parent-gate-form').addEventListener('submit', function (e) { e.preventDefault(); Sfx.unlock(); submitGate(); });
    click('btn-parent-gate-cancel', function () { closeGate(); });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        if (G.state === 'playing') pauseGame();
        Music._halt();                 // ngừng lập lịch nốt khi tab ẩn; 'wanted' giữ nguyên để phát lại khi hiện
      } else {
        Sfx.unlock();
        if (inGame() && G.state !== 'over') requestWake();   // hệ thống thu hồi wake lock khi ẩn → xin lại
      }
    });
    window.addEventListener('blur', function () { if (G.state === 'playing') pauseGame(); });
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
    frame.tick = (frame.tick || 0) + 1;
    if (!G.bg || frame.tick % 30 === 0) {
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
    } catch (e) {
      onFatal(e && e.message ? e.message : String(e));   // một khung hình lỗi không được làm chết vòng lặp
      return;
    }
    const t2 = performance.now();
    const p = G.perf;
    p.n++; p.update += t1 - t0; p.render += t2 - t1;
    if (p.n >= 60) { p.avgUpdate = p.update / p.n; p.avgRender = p.render / p.n; p.n = 0; p.update = 0; p.render = 0; }
  }

  function boot() {
    Store.load();
    Motion.refresh();
    try {
      const mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mq && mq.addEventListener) mq.addEventListener('change', function () { Motion.refresh(); });
    } catch (e) { /* bỏ qua */ }
    Voice.init();
    // Khi giọng đọc bị dừng (bất kỳ đâu): dọn trạng thái "đang đọc" của màn Ghi nhớ để không kẹt
    Voice.onstop = function () {
      G.reading = false;
      try { ui.notesList.querySelectorAll('.speaking').forEach(function (el) { el.classList.remove('speaking'); }); } catch (e) { /* bỏ qua */ }
    };
    window.addEventListener('error', function (e) { onFatal(e && e.message ? e.message : 'error'); });
    window.addEventListener('unhandledrejection', function (e) { onFatal(e && e.reason && e.reason.message ? e.reason.message : 'unhandledrejection'); });
    renderPlayerChip();
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
  window.__CuoiHo = {
    G: G, Store: Store, Quiz: Quiz, Lesson: Lesson, Gate: Gate, Motion: Motion, Report: Report, PlayersUI: PlayersUI,
    startGame: startGame, choose: choose, endGame: endGame, startQuiz: startQuiz, onQuizAnswer: onQuizAnswer, quizNext: quizNext, quizRetry: quizRetry,
    showLesson: showLesson, goLevels: goLevels, goMenu: goMenu, curGate: curGate, update: update, render: render, layout: layout,
    renderLevels: renderLevels, renderReport: renderReport, adultGate: adultGate, persistResults: persistResults, onFatal: onFatal, skipLearn: skipLearn
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
