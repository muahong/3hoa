/* ============================================================
   game.js – Bộ máy trò chơi Xe Tăng Thời Gian
   - Canvas 2D, vòng lặp requestAnimationFrame theo thời gian thực (dt)
   - Robot mang bảng đáp án (chữ hoặc đồng hồ) tiến về phía xe tăng
   - Chạm vào robot có đáp án đúng để bắn; sai 2 lần thì đáp án được đánh dấu
   - Luồng mỗi màn: bài học → bắn robot → hỏi đáp → mở khóa màn sau
   ============================================================ */
(function () {
  'use strict';

  const C = window.Clock, L = window.Levels, Sfx = window.Sfx, Music = window.Music, Voice = window.Voice, Players = window.Players;
  const rnd = C.rnd, chance = C.chance, pick = C.pick, shuffle = C.shuffle;
  const TAU = Math.PI * 2;
  const FONT = C.FONT;
  const $ = function (id) { return document.getElementById(id); };
  const clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  const PRAISE = ['Chính xác!', 'Tuyệt vời!', 'Giỏi quá!', 'Đúng rồi!', 'Xuất sắc!', 'Siêu đỉnh!', 'Hay lắm!', 'Bắn trúng!'];
  const QUIZ_PRAISE = PRAISE.filter(function (p) { return p !== 'Bắn trúng!'; });   // hỏi đáp không có "bắn"
  const MAX_HEARTS = 3;
  const MAX_PARTS = 400;
  const SHELL_T = 0.34;          // giây đạn bay tới mục tiêu
  const HINT_POINTS = 20;        // điểm khi bắn robot đã được đánh dấu đáp án
  const QUIZ_N = 4;              // số câu hỏi đáp mỗi màn
  const QUIZ_PASS = 3;           // số câu đúng để mở khóa màn sau
  const REVIEW_CHIPS = 4;        // số chip "cần ôn lại" hiện trên bảng kết quả (còn lại xem ở 📊 Kết quả)
  const OPT_COLORS = ['#ff6b35', '#118ab2', '#7b5ea7', '#06d6a0', '#ef476f'];

  /* ================= LƯU TRỮ (localStorage) =================
     Thiết lập thiết bị (sound, music, voice, fx) ở cấp cao nhất; tiến trình từng bé nằm trong players[<id>]
     = { progress, unlockAll, missed (kho ôn lại), stats }. Dữ liệu cũ (progress ở cấp cao nhất) được di trú vào p1.
     KHÔNG tin dữ liệu đọc từ máy: mọi giá trị đều được ép kiểu và giới hạn. */
  function toInt(v, max) { v = Number(v); return Number.isFinite(v) ? clamp(Math.round(v), 0, max) : 0; }
  const Store = {
    key: 'xe-tang-thoi-gian-v1',
    MAX_RAW: 65536,
    INFO_KEYS: ['kind', 'level', 'variant', 'h', 'm', 'h24', 'sh', 'sm', 'dur', 'act', 'n5', 'style', 'ms'],
    data: { sound: true, music: true, voice: true, fx: 'full', players: {} },
    corrupt: false,
    /** Bucket tiến trình trống của một người chơi */
    blank() { return { progress: {}, unlockAll: false, missed: {}, stats: { plays: 0, correct: 0, wrong: 0, seconds: 0, byTopic: {}, last: 0 } }; },
    reviver(k, v) { return (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v; },
    load() {
      let d = null;
      this.corrupt = false;
      try {
        const raw = localStorage.getItem(this.key);
        if (raw && raw.length > this.MAX_RAW) this.corrupt = true;
        else if (raw) d = JSON.parse(raw, this.reviver);
      } catch (e) { d = null; this.corrupt = true; }
      if (!d || typeof d !== 'object') d = {};
      // Thiết lập thiết bị
      this.data.sound = d.sound !== false; this.data.music = d.music !== false; this.data.voice = d.voice !== false;
      this.data.fx = d.fx === 'lite' ? 'lite' : 'full';
      // Tiến trình theo người chơi
      this.data.players = {};
      const src = d.players && typeof d.players === 'object' ? d.players : null;
      if (src) for (const id in src) if (/^[A-Za-z0-9_-]{1,24}$/.test(id)) this.data.players[id] = this.sanitize(src[id]);
      // Di trú dữ liệu cũ (chưa có players): đưa vào người chơi mặc định p1
      if (d.players == null && (d.progress || d.unlockAll != null)) {
        this.data.players.p1 = this.sanitize({ progress: d.progress, unlockAll: d.unlockAll });
        this.save();
      }
    },
    /** Tiến trình một màn luôn có đủ trường, đúng kiểu, trong khoảng */
    normProg(raw) {
      const o = raw && typeof raw === 'object' ? raw : {};
      return { best: toInt(o.best, 1e7), stars: toInt(o.stars, 3), passed: o.passed === true, plays: toInt(o.plays, 1e6), quizBest: toInt(o.quizBest, QUIZ_N) };
    },
    /** Chỉ giữ các trường info hợp lệ (để tạo lại câu ôn) */
    normInfo(info) {
      if (!info || typeof info !== 'object') return null;
      const out = {};
      this.INFO_KEYS.forEach(function (k) {
        const v = info[k];
        if (k === 'kind' || k === 'style') { if (typeof v === 'string' && v.length <= 12) out[k] = v; }
        else if (k === 'ms') { if (Array.isArray(v)) out.ms = v.filter(function (x) { return Number.isInteger(x) && x >= 0 && x <= 59; }).slice(0, 12); }
        else if (Number.isFinite(v)) out[k] = clamp(Math.round(v), 0, 1e4);
      });
      return out.kind ? out : null;
    },
    /** Ép bucket của một người chơi về đúng kiểu/khoảng */
    sanitize(b) {
      const self = this, out = this.blank();
      if (!b || typeof b !== 'object') return out;
      out.unlockAll = b.unlockAll === true;
      const prog = b.progress && typeof b.progress === 'object' ? b.progress : {};
      L.LEVELS.forEach(function (l) { if (prog[l.id] != null) out.progress[l.id] = self.normProg(prog[l.id]); });
      const missed = b.missed && typeof b.missed === 'object' ? b.missed : {};
      const keys = Object.keys(missed).filter(function (k) { return k.length <= 80 && missed[k] && typeof missed[k] === 'object'; });
      keys.sort(function (x, y) { return toInt(missed[y].last, 1e14) - toInt(missed[x].last, 1e14); });
      keys.slice(0, 60).forEach(function (k) {
        const e = missed[k];
        out.missed[k] = { n: toInt(e.n, 1e4), ok: toInt(e.ok, 10), last: toInt(e.last, 1e14), info: self.normInfo(e.info) };
      });
      const st = b.stats && typeof b.stats === 'object' ? b.stats : {};
      out.stats.plays = toInt(st.plays, 1e6); out.stats.correct = toInt(st.correct, 1e7); out.stats.wrong = toInt(st.wrong, 1e7);
      out.stats.seconds = toInt(st.seconds, 1e8); out.stats.last = toInt(st.last, 1e14);
      const bt = st.byTopic && typeof st.byTopic === 'object' ? st.byTopic : {};
      Object.keys(bt).slice(0, 40).forEach(function (k) { if (k.length <= 24 && bt[k] && typeof bt[k] === 'object') out.stats.byTopic[k] = { c: toInt(bt[k].c, 1e7), w: toInt(bt[k].w, 1e7) }; });
      return out;
    },
    save() {
      try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* bỏ qua */ }
    },
    /** Id người chơi đang hoạt động (p1 khi chưa có mô-đun hồ sơ) */
    activeId() { return Players ? Players.active().id : 'p1'; },
    /** Bucket của người chơi đang hoạt động (tạo mới nếu chưa có) */
    p() {
      const id = this.activeId();
      if (!this.data.players[id]) this.data.players[id] = this.blank();
      return this.data.players[id];
    },
    prog(id) {
      return this.normProg(this.p().progress[id]);
    },
    setProg(id, p) {
      this.p().progress[id] = this.normProg(p);
      this.save();
    },
    isUnlocked(level) {
      if (this.p().unlockAll) return true;
      const prev = L.prev(level);
      if (!prev) return true;
      return !!this.prog(prev.id).passed;
    },
    /** Tổng sao của một bucket (hiện ở danh sách người chơi) */
    sumStars(b) {
      let s = 0;
      if (b && b.progress) for (const id in b.progress) s += toInt(b.progress[id] && b.progress[id].stars, 3);
      return s;
    },
    /* ---- Ôn lại thông minh: kho câu bé đã làm sai ---- */
    noteMissed(key, info) {
      const m = this.p().missed; key = String(key).slice(0, 80);
      const e = m[key] || { n: 0, ok: 0, last: 0, info: null };
      e.n++; e.ok = 0; e.last = Date.now(); e.info = this.normInfo(info) || e.info; m[key] = e;
      const keys = Object.keys(m);
      if (keys.length > 60) { keys.sort(function (a, b) { return m[a].last - m[b].last; }); delete m[keys[0]]; }
      this.save();
    },
    noteOk(key) {
      const m = this.p().missed; key = String(key).slice(0, 80);
      const e = m[key];
      if (!e) return;
      e.ok++;
      if (e.ok >= 2) delete m[key];
      this.save();
    },
    /** Danh sách cần ôn (ưu tiên sai nhiều, gần đây); filterFn(info, key) để lọc theo màn */
    reviewPool(filterFn) {
      const m = this.p().missed;
      return Object.keys(m).filter(function (k) { return !filterFn || filterFn(m[k].info, k); })
        .sort(function (a, b) { return m[b].n - m[a].n || m[b].last - m[a].last; })
        .map(function (k) { return { key: k, info: m[k].info, n: m[k].n }; });
    },
    /* ---- Thống kê cho bảng kết quả của phụ huynh ---- */
    addStats(round) {
      const s = this.p().stats;
      if (round.plays !== false) s.plays++;
      s.correct += toInt(round.correct, 1e6); s.wrong += toInt(round.wrong, 1e6); s.seconds += toInt(round.seconds, 1e6); s.last = Date.now();
      if (round.topic) {
        const t = s.byTopic[round.topic] || { c: 0, w: 0 };
        t.c += toInt(round.correct, 1e6); t.w += toInt(round.wrong, 1e6);
        s.byTopic[round.topic] = t;
      }
      this.save();
    },
    /** Xóa toàn bộ tiến trình của người chơi đang hoạt động */
    resetActive() {
      this.data.players[this.activeId()] = this.blank();
      this.save();
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
    phaseT: 0, slowT: 0, perfect: 0, idSeq: 0, selected: -1, review: [], endReason: '', overAt: -1, resultShown: false,
    hintReserve: 44,          // chiều cao chừa sẵn cho chip gợi ý (đo thật ở mỗi câu)
    hud: { score: -1, hearts: -1, progress: '', mult: -1, hintOff: null },
    cdTimer: 0, wakeLock: null, attractT: 1.5,
    lessonMode: 'play', lessonClock: { h: 3, m: 0, fh: 3, fm: 0, t: 1 }, lessonEx: 0,
    quiz: { items: [], i: 0, correct: 0, answered: false, level: null, done: false },
    reviewSlots: null, reviewUsed: [], missedKeys: [],
    faceCache: {}, tankGrad: null, vignette: null, bgCanvas: null, nowH: 0, nowM: 0, nowT: -9,
    perf: { n: 0, update: 0, render: 0, avgUpdate: 0, avgRender: 0 }
  };

  /** Hiệu ứng ít (prefers-reduced-motion hoặc thiết lập fx = 'lite'): ít hạt, không rung, không chớp */
  const Motion = {
    lite: false,
    refresh() {
      let pref = false;
      try { pref = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { /* bỏ qua */ }
      this.lite = pref || Store.data.fx === 'lite';
      document.documentElement.classList.toggle('lite-fx', this.lite);
    }
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
    btnHint: $('btn-hint'), btnResultLesson: $('btn-result-lesson'),
    countNum: $('count-num'), levelGrid: $('level-grid'),
    lessonTitle: $('lesson-title'), lessonIntro: $('lesson-intro'), lessonClock: $('lesson-clock'), lessonClockLabel: $('lesson-clock-label'), lessonExtra: $('lesson-extra'),
    lessonExamples: $('lesson-examples'), lessonPoints: $('lesson-points'), btnLessonPlay: $('btn-lesson-play'), btnLessonQuiz: $('btn-lesson-quiz'),
    resultTitle: $('result-title'), resultLevel: $('result-level'), resultScore: $('result-score'),
    resultStars: $('result-stars'), resultRecord: $('result-record'),
    stCorrect: $('st-correct'), stWrong: $('st-wrong'), stCombo: $('st-combo'), stAcc: $('st-acc'),
    review: $('review'), reviewChips: $('review-chips'), reviewMore: $('review-more'), btnQuiz: $('btn-quiz'), btnAgain: $('btn-again'),
    quizBody: $('quiz-body'), quizDone: $('quiz-done'), quizProgress: $('quiz-progress'), quizTag: $('quiz-tag'),
    quizVisual: $('quiz-visual'), quizQ: $('quiz-q'), quizOpts: $('quiz-opts'), quizExplain: $('quiz-explain'), btnQuizNext: $('btn-quiz-next'),
    quizDoneTitle: $('quiz-done-title'), quizScore: $('quiz-score'), quizDoneMsg: $('quiz-done-msg'),
    btnQuizNextLevel: $('btn-quiz-next-level'), btnQuizReview: $('btn-quiz-review'), btnQuizRetry: $('btn-quiz-retry'),
    parentGate: $('parent-quiz'), parentBody: $('parent-body'), parentQ: $('parent-q'), parentInput: $('parent-input'),
    resetConfirm: $('reset-confirm'), players: $('players'), report: $('report'), gate: $('parent-gate'),
    ipadTip: $('ipad-tip')
  };
  const SCREENS = ['menu', 'levels', 'lesson', 'countdown', 'pause', 'gameover', 'quiz'];
  // Các lớp phủ (không đổi G.state): đóng bằng nút của chính nó hoặc phím Escape
  const OVERLAYS = ['gate', 'report', 'players', 'howto', 'parent'];

  function showScreen(name) {
    SCREENS.forEach(function (k) { ui[k].classList.toggle('hidden', k !== name); });
    // Người dùng bàn phím: đưa tiêu điểm vào nút chính của bảng vừa hiện (không cuộn); hỏi đáp dùng phím 1–4
    if (name && name !== 'countdown' && name !== 'quiz') focusFirst(ui[name]);
  }
  const FOCUS_SEL = ['.btn.big:not([hidden])', '.level-card.next', '.player-item.active', '.btn:not(.ghost):not([hidden])', '.btn:not([hidden])'];
  function focusFirst(root) {
    if (!G.usedKeys || !root) return;          // chỉ khi đã dùng bàn phím (không hiện viền tiêu điểm trên máy cảm ứng)
    try {
      let b = null;
      for (let i = 0; i < FOCUS_SEL.length && !b; i++) b = root.querySelector(FOCUS_SEL[i]);
      if (b && document.activeElement !== b) b.focus({ preventScroll: true });
    } catch (e) { /* bỏ qua */ }
  }
  function overlayOpen(k) { return ui[k] && !ui[k].classList.contains('hidden'); }
  /** Đóng lớp phủ trên cùng (phím Escape); trả về true nếu đã đóng một lớp */
  function escapeOverlay() {
    for (let i = 0; i < OVERLAYS.length; i++) {
      const k = OVERLAYS[i];
      if (!overlayOpen(k)) continue;
      if (k === 'gate') closeGate();
      else if (k === 'parent') closeParent();
      else ui[k].classList.add('hidden');
      return true;
    }
    return false;
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
      // Kích thước hiện thật do CSS quyết định (108 px, 120 px từ 700 px trở lên, 84/72 px ở màn nhỏ);
      // thuộc tính width/height chỉ là số đo dự phòng khi canvas chưa được bố trí (clientWidth = 0)
      const px = big ? 150 : (G.W >= 700 ? 120 : 108);
      cv.setAttribute('width', px);
      cv.setAttribute('height', px);
      const opts = { hideHour: !!prompt.hideHour, emphasizeMinutes: !!prompt.emphasizeMinutes };
      requestAnimationFrame(function () { paintClockCanvas(cv, t.h, t.m, opts); });
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
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (G.bg && w === G.W && h === G.H && dpr === G.dpr) return;   // không đổi → không dựng lại nền
    G.dpr = dpr;
    G.W = w; G.H = h;
    canvas.width = Math.round(w * G.dpr);
    canvas.height = Math.round(h * G.dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    G.faceCache = {};
    layout();
    buildBackground();
    initClouds();
    if (G.state === 'lesson') paintLessonClock(true);
  }

  /** Đo trước chiều cao chip gợi ý của câu này (chữ dài → chip 2–4 dòng) để chừa đúng chỗ cho nó.
      Đo trên một bản sao rời (không có role/aria-live) để trình đọc màn hình KHÔNG đọc trước đáp án. */
  function measureHintReserve(q) {
    const el = ui.hint;
    if (!q || !el.hidden) return G.hintReserve;                 // chip đang hiện: giữ số đo cũ, không đụng vào
    let h = 44;
    const probe = el.cloneNode(false);
    probe.removeAttribute('id');
    probe.removeAttribute('role');
    probe.removeAttribute('aria-live');
    probe.removeAttribute('hidden');
    probe.setAttribute('aria-hidden', 'true');
    probe.className = 'hint info';
    probe.textContent = answerHint(q);                          // chuỗi dài nhất có thể hiện (đáp án · vì sao)
    probe.style.cssText = 'visibility:hidden;animation:none';
    try {
      el.parentNode.appendChild(probe);
      h = probe.offsetHeight || 44;
    } catch (e) { /* bỏ qua */ }
    if (probe.parentNode) probe.parentNode.removeChild(probe);
    G.hintReserve = clamp(h + 8, 44, Math.max(44, G.H * 0.2));
    return G.hintReserve;
  }

  /** Vị trí robot xuất hiện: ngay dưới thẻ câu hỏi và chip gợi ý (đo bằng offsetTop/offsetHeight để bỏ qua hiệu ứng pop). */
  function promptSpawnY() {
    let top = 0, el = ui.prompt;
    try { while (el) { top += el.offsetTop; el = el.offsetParent; } } catch (e) { top = 0; }
    const bottom = top + (ui.prompt.offsetHeight || 0);
    const short = G.H < 480;   // điện thoại nằm ngang: dồn sát hơn
    return Math.max(G.H * 0.22, bottom + (short ? 8 : 16 + G.hintReserve));
  }

  function layout() {
    const W = G.W, H = G.H;
    const oldW = G.field.w, oldH = G.field.h, oldLineY = G.lineY;
    G.field = { x: 0, y: 0, w: W, h: H };
    G.horizon = H * 0.3;
    const size = clamp(Math.min(W, H) * 0.11, 44, 78);
    G.tank.size = size;
    G.tank.y = H - size * 1.05 - Math.max(8, H * 0.03);
    if (G.tank.x === 0 || G.tank.x > W) G.tank.x = W / 2;
    G.tank.x = clamp(G.tank.x, size, W - size);
    G.lineY = G.tank.y - size * (H < 480 ? 1.2 : 1.6);
    G.spawnY = H * 0.32;
    if (inGame() && G.q) {
      ui.prompt.classList.toggle('stack', promptStacked(G.q));   // bố cục thẻ theo bề rộng mới
      measureHintReserve(G.q);                                   // bề rộng mới → chip gợi ý xuống dòng khác đi
    }
    if (inGame()) G.spawnY = promptSpawnY();
    G.tankGrad = null; G.vignette = null;
    // Xoay màn hình giữa câu hỏi: xếp lại robot vào lưới mới
    if (inGame() && G.q && (oldW !== W || oldH !== H)) regridRobots(oldLineY);
  }

  /** Sau khi đổi kích thước giữa câu hỏi: đặt lại bảng, cột và hàng cho robot đang sống (đầu robot vẫn nằm dưới thẻ câu hỏi),
      giữ tỉ lệ quãng đường đã đi so với vị trí xuất phát của hàng đó. */
  function regridRobots(oldLineY) {
    const q = G.q, f = G.field;
    const live = liveRobots();
    if (!q || !live.length) return;
    const bs = boardSize(q);
    const cols = bs.cols, cellW = f.w / cols;
    const hr = Math.min(bs.w, bs.h) * 0.26;
    const rowGap = bs.h + G.tank.size * (G.H < 480 ? 0.6 : 1.15);
    const base = G.spawnY + bs.h / 2 + hr * 2.35 + 4;
    const edge = Math.min(edgeMargin(bs), f.w / 2);
    live.forEach(function (r) {
      const col = r.idx % cols, row = Math.floor(r.idx / cols);
      const oldY0 = r.y0 == null ? r.y : r.y0;
      const y0 = base + row * rowGap;
      const k = Math.max(0.05, (G.lineY - y0) / Math.max(1, oldLineY - oldY0));
      r.w = bs.w; r.h = bs.h; r.clock = bs.clock; r.sprite = null;
      r.x0 = clamp(f.x + cellW * (col + 0.5), f.x + edge, f.x + f.w - edge);
      r.x = r.x0;
      r.y = Math.min(G.lineY - r.h / 2 - 4, y0 + (r.y - oldY0) * k);
      r.y0 = y0;
      r.vy = r.vy * k;
    });
  }

  /** Lớp nền dùng lại một canvas cố định (không cấp phát 15–20 MB mỗi lần xoay). */
  function layer(fn) {
    const c = G.bgCanvas || (G.bgCanvas = document.createElement('canvas'));
    if (c.width !== canvas.width || c.height !== canvas.height) { c.width = canvas.width; c.height = canvas.height; }
    const cx = c.getContext('2d');
    cx.setTransform(1, 0, 0, 1, 0, 0);
    cx.clearRect(0, 0, c.width, c.height);
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
    const n = Math.round((big ? 44 : 28) * (Motion.lite ? 0.4 : 1));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, sp = (big ? 220 : 150) + Math.random() * (big ? 460 : 320);
      addPart({ kind: 'spark', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size: r * (0.05 + Math.random() * 0.08),
        color: pick(['#ffd166', '#ff9f1c', '#ff5400', '#ffffff', '#ffe66d']), life: 0.4 + Math.random() * 0.5, max: 0.9 });
    }
    for (let i = 0; i < (Motion.lite ? 4 : 10); i++) {
      const a = Math.random() * TAU, sp = 40 + Math.random() * 110;
      addPart({ kind: 'puff', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, size: r * (0.35 + Math.random() * 0.4), grow: r * 1.1,
        color: pick(['#6b6b7a', '#8c8c9c', '#5a5a6a']), life: 0.5 + Math.random() * 0.4, max: 0.9 });
    }
    for (let i = 0; i < (Motion.lite ? 3 : 8); i++) {
      const a = Math.random() * TAU, sp = 90 + Math.random() * 200;
      addPart({ kind: 'gear', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, size: r * (0.14 + Math.random() * 0.14),
        rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 12, color: pick(['#9aa2c2', '#5b5f7a', '#ffd166']), life: 0.8 + Math.random() * 0.5, max: 1.3 });
    }
  }

  function spawnSparks(x, y, r, color) {
    for (let i = 0; i < (Motion.lite ? 6 : 14); i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, sp = 120 + Math.random() * 260;
      addPart({ kind: 'spark', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size: r * (0.04 + Math.random() * 0.05),
        color: color || pick(['#ffffff', '#ffe66d', '#ff9f1c']), life: 0.25 + Math.random() * 0.3, max: 0.55 });
    }
  }

  function spawnConfetti(n) {
    const cols = ['#ff6b35', '#ffd166', '#06d6a0', '#118ab2', '#ef476f', '#7b5ea7', '#2ec4b6'];
    if (Motion.lite) n = Math.round(n * 0.4);
    for (let i = 0; i < n; i++) {
      addPart({ kind: 'confetti', x: Math.random() * G.W, y: -20 - Math.random() * G.H * 0.5, vx: (Math.random() - 0.5) * 80, vy: 80 + Math.random() * 160,
        size: 6 + Math.random() * 8, color: pick(cols), rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 8, life: 4 + Math.random() * 2, max: 6, sway: Math.random() * TAU });
    }
  }

  /* ================= ROBOT & CÂU HỎI ================= */
  function liveRobots() {
    return G.robots.filter(function (r) { return !r.dead && (r.state === 'in' || r.state === 'live' || r.state === 'wrong'); });
  }

  /** Thời gian robot đi hết quãng đường. Câu dài (thời gian trôi qua, đọc từng phút) được thêm giờ để bé kịp tính. */
  function fallTime(q) {
    const lvl = G.level;
    const base = lvl ? lvl.fall : 24;
    const k = 1 - Math.min(0.25, 0.035 * G.qIndex);      // càng về cuối càng nhanh, nhưng không quá 25%
    const kind = q && q.kind;
    const hard = kind === 'elapsed' ? 1.4 : (kind === 'exact' || kind === 'digital') ? 1.2 : 1;
    return base * k * hard / (lvl ? lvl.speed : 1);
  }

  /** Kích thước bảng cho các phương án của câu hỏi (bảng chữ rộng, bảng đồng hồ vuông). */
  function boardSize(q) {
    const f = G.field, n = q.options.length;
    const isClock = q.options.some(function (o) { return o.clock; });
    const s = G.tank.size;
    if (isClock) {
      // Mặt đồng hồ dưới 100 px thì bé không đọc nổi kim phút: màn hẹp thì xếp 2 cột (2 hàng) thay vì thu nhỏ
      let cols = n;
      if (n > 2 && n * 122 > f.w - 16) cols = 2;
      const floor = f.h < 480 ? 84 : 100;      // điện thoại nằm ngang: quá thấp cho bảng 100 px
      const d = clamp(Math.min(f.w / (cols + 0.6), s * 2.4, f.h * (cols < n ? 0.28 : 0.2)), floor, 150);
      return { w: d, h: d, clock: true, cols: cols };
    }
    let longest = 0;
    q.options.forEach(function (o) { longest = Math.max(longest, o.label.length); });
    let w = clamp(s * (1.9 + longest * 0.06), 118, 230);
    let cols = n;
    if (n * (w + 12) > f.w - 16) {
      const w1 = (f.w - 16) / n - 12;
      // Màn thấp (điện thoại nằm ngang): không đủ chiều cao cho 2 hàng → thu bảng để xếp 1 hàng nếu còn đọc được
      if (f.h < 480 && w1 >= 118) w = w1;
      else { cols = 2; w = clamp(Math.min(w, (f.w - 40) / 2), 118, 230); }
    }
    return { w: w, h: clamp(w * 0.5, 62, 96), clock: false, cols: cols };
  }

  /** Lề trái/phải chừa cho bảng: nửa bề rộng + biên đung đưa + vòng vàng gợi ý (để vòng không bị cắt ở mép). */
  function edgeMargin(bs) {
    return bs.w / 2 + G.tank.size * 0.12 + 2 + Math.max(10, bs.h * 0.08) + 6;
  }

  function spawnRobots(q) {
    const f = G.field;
    const bs = boardSize(q);
    const n = q.options.length;
    const cols = bs.cols, rows = Math.ceil(n / cols);
    const cellW = f.w / cols;
    const hr = Math.min(bs.w, bs.h) * 0.26;                 // bán kính đầu robot (xem drawRobot)
    const rowGap = bs.h + G.tank.size * (G.H < 480 ? 0.6 : 1.15);
    const base = G.spawnY + bs.h / 2 + hr * 2.35 + 4;        // cả cánh quạt nằm dưới thẻ câu hỏi
    const lowest = base + (rows - 1) * rowGap;
    const ft = G.H < 480 ? Math.max(fallTime(q) * 0.75, 8) : fallTime(q);
    const vy = Math.max(1, G.lineY - lowest - bs.h / 2) / ft;
    const edge = edgeMargin(bs);
    for (let i = 0; i < n; i++) {
      const col = i % cols, row = Math.floor(i / cols);
      const sway = G.tank.size * 0.12 + 2;
      const slack = Math.max(0, cellW - bs.w - sway * 2);
      const x = clamp(f.x + cellW * (col + 0.5) + (rows > 1 ? 0 : (Math.random() - 0.5) * Math.min(cellW * 0.15, slack)), f.x + Math.min(edge, f.w / 2), f.x + f.w - Math.min(edge, f.w / 2));
      // Hàng đầu (row 0) ở xa hơn = cao hơn trên màn hình; hàng sau gần xe tăng hơn
      const y = base + row * rowGap;
      const r = new Robot({ opt: q.options[i], idx: i, x: x, x0: x, y: y, y0: y, vy: vy, w: bs.w, h: bs.h, clock: bs.clock, t: 0 });
      G.robots.push(r);
    }
    if (G.state === 'playing') Sfx.play('spawn');
  }

  /** Lấy một câu trong kho "cần ôn lại" của bé (đã gặp ở màn ≤ màn hiện tại), tạo lại với đáp án nhiễu mới. */
  function reviewQuestion() {
    const lvN = G.level ? G.level.n : 0;
    const pool = Store.reviewPool(function (info) { return !!info && info.level <= lvN; });
    for (let i = 0; i < pool.length; i++) {
      if (G.reviewUsed.indexOf(pool[i].key) >= 0) continue;
      const q = C.fromInfo(pool[i].info);
      if (!q) continue;
      G.reviewUsed.push(pool[i].key);
      q.key = pool[i].key;      // giữ khóa cũ để noteOk xóa đúng mục trong kho
      q.review = true;
      return q;
    }
    return null;
  }

  function nextQuestion(sameQ) {
    let q = sameQ || null;
    if (!q && G.reviewSlots && G.reviewSlots.has(G.qIndex)) q = reviewQuestion();
    if (!q) q = G.level.gen();
    G.q = q;
    G.qWrongs = 0;
    G.hint = false;
    G.retry = !!sameQ;
    G.qBorn = G.time;
    G.selected = -1;
    if (sameQ) q.options = shuffle(q.options.slice());
    clearTimeout(showHint._t);
    ui.hint.hidden = true;                         // không để chip ✓ của câu trước lơ lửng
    ui.btnHint.disabled = false;
    renderPrompt(true);
    measureHintReserve(q);                         // chừa chỗ cho chip giải thích (dài 1–4 dòng)
    G.spawnY = promptSpawnY();                     // đo thẻ câu hỏi xong mới đặt robot
    spawnRobots(q);
    // Hỏi lại câu vừa vỡ tuyến: đánh dấu sẵn đáp án đúng (như đã gợi ý) nên chỉ được HINT_POINTS
    if (sameQ) { G.hint = true; markAnswer(); ui.btnHint.disabled = true; }
    G.phase = 'ask';
    Sfx.play('question');
    Voice.say(q.prompt.speech, { queue: true });   // không cắt lời khen/đáp án đang đọc
  }

  /** Vẽ vòng vàng quanh bảng đáp án đúng đang bay (không đụng robot đang nổ / bỏ chạy). */
  function markAnswer() {
    G.robots.forEach(function (rb) {
      if (rb.opt && rb.opt.ok && !rb.dead && rb.state !== 'dying' && rb.state !== 'flee') rb.hint = true;
    });
  }

  /** Chip gợi ý "đáp án · vì sao" (bỏ phần lặp khi lời giải thích đã mở đầu bằng chính đáp án) */
  function answerHint(q) {
    const ex = q.explain || '';
    return ex.indexOf(q.answer.label) === 0 ? ex : q.answer.label + ' · ' + ex;
  }

  /** Đọc thành lời: đổi "14:21" của đồng hồ điện tử thành "14 giờ 21 phút" (chữ trên chip vẫn giữ nguyên). */
  function speakable(text) {
    return String(text || '').replace(/(\d{1,2}):(\d{2})/g, function (a, h, m) {
      return Number(h) + ' giờ ' + (Number(m) === 0 ? 'đúng' : Number(m) + ' phút');
    });
  }

  /** Nút 💡: đánh dấu đáp án đúng, đọc lời giải thích, robot đi chậm lại; câu đó chỉ còn HINT_POINTS. */
  function useHint() {
    const q = G.q;
    if (G.state !== 'playing' || G.phase !== 'ask' || !q || G.hint) return false;
    G.hint = true;
    G.slowT = 2.5;                                 // chờ bé nghe/đọc lời giải thích
    markAnswer();
    ui.btnHint.disabled = true;
    showHint(q.explain, 'info', 4000);
    Voice.say(speakable(q.explain));
    Sfx.play('hint');
    return true;
  }

  /* ================= THẺ CÂU HỎI (HUD) ================= */
  /** Màn hẹp: 2 đồng hồ, hoặc 1 hình kèm câu dài → xếp hình trên, chữ dưới để chữ không bị ép thành 4–6 dòng */
  function promptStacked(q) {
    const n = (q.prompt.clocks || []).length;
    const hasVisual = n > 0 || !!q.prompt.digital || !!q.prompt.session;
    return G.W < 640 && (n >= 2 || (hasVisual && q.prompt.text.length > 40));
  }

  function renderPrompt(pop) {
    const q = G.q;
    if (!q) {
      ui.promptText.textContent = G.state === 'playing' ? 'Sẵn sàng…' : '…';
      ui.promptVisual.hidden = true;
      ui.promptVisual.innerHTML = '';
      ui.prompt.classList.remove('stack');
      return;
    }
    ui.promptText.textContent = q.prompt.text;
    buildVisual(ui.promptVisual, q.prompt, false);
    ui.prompt.classList.toggle('stack', promptStacked(q));
    if (pop) {
      ui.prompt.classList.remove('ok', 'shake', 'pop');
      void ui.prompt.offsetWidth;
      ui.prompt.classList.add('pop');
    }
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
    if (G.missedKeys.indexOf(q.key) >= 0) return;          // mỗi câu chỉ ghi nhận một lần mỗi ván
    G.missedKeys.push(q.key);
    Store.noteMissed(q.key, Object.assign({ level: G.level ? G.level.n : L.LEVELS.length }, q.info || {}));
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
    // Đo thời gian rơi của CHÍNH câu vừa trả lời (fallTime giảm dần theo qIndex → phải đo trước khi tăng)
    const ft = fallTime(q);
    destroyRobot(r, false);
    fleeOthers(r);
    G.correct++;
    G.qIndex++;
    let pts;
    if (G.hint) {
      pts = HINT_POINTS;
      G.perfect = 0;                 // đã nhìn gợi ý: chuỗi "đúng ngay" bắt đầu lại
      // Chữ bay lên phải ngắn để còn đọc được trên điện thoại; lời giải thích đầy đủ nằm ở chip #hud-hint bên dưới
      addText('Nhớ nhé: ' + q.answer.label, G.W / 2, r.y - r.h * 0.9, { color: '#ffe066', size: Math.min(G.tank.size * 0.5, 22), life: 1.8 });
      Voice.say('Đúng rồi. ' + q.answer.speech + '. ' + speakable(q.explain));
    } else {
      if (G.qWrongs === 0 && !G.retry) Store.noteOk(q.key);   // trả lời đúng ngay → bớt một lần cần ôn
      if (!G.retry) {
        G.streak++;
        if (G.streak > G.bestStreak) G.bestStreak = G.streak;
      }
      const age = G.time - G.qBorn;
      const mult = multiplier();
      // Thưởng nhanh tính theo thời gian rơi của chính câu đó (câu dài được nhiều thời gian hơn)
      const speedBonus = age < ft * 0.25 ? 50 : age < ft * 0.45 ? 25 : 0;
      pts = 100 * mult + speedBonus;
      const praise = G.streak > 0 && G.streak % 3 === 0 && mult > 1 ? 'Combo x' + mult + '!' : pick(PRAISE);
      addText(praise, r.x, r.y - r.h * 0.9, { color: praise.indexOf('Combo') === 0 ? '#ff9f1c' : '#7bf1a8', size: G.tank.size * 0.75, life: 1.2 });
      if (speedBonus) addText('⚡ Nhanh +' + speedBonus, r.x, r.y - r.h * 1.5, { color: '#ffd166', size: Math.min(G.tank.size * 0.55, 26), life: 1.1 });
      if (praise.indexOf('Combo') === 0) { Sfx.play('combo'); Voice.say('Combo nhân ' + mult + '! ' + q.answer.speech); }
      else { Sfx.play('correct'); Voice.say(praise + ' ' + q.answer.speech); }
      // Thưởng tim sau mỗi 5 câu đúng ngay từ lần đầu (không để bé rơi vào vòng thua liên tiếp)
      if (G.qWrongs === 0 && !G.retry) {
        G.perfect++;
        if (G.perfect % 5 === 0 && G.hearts < MAX_HEARTS) gainHeart();
      } else G.perfect = 0;
    }
    G.score += pts;
    addText('+' + pts, r.x, r.y - r.h * 0.2, { color: '#ffe066', size: G.tank.size * 0.7, life: 1.0 });
    // Đã xem gợi ý: giữ nguyên lời giải thích trên chip để bé đọc lại một nhịp nữa
    showHint(G.hint ? answerHint(q) + ' ✓' : q.answer.label + ' ✓', 'ok', G.hint ? 2600 : 1100);
    cardFx('ok');
    G.flash = { c: '120,255,180', a: 0.14 };
    G.phase = 'wait';
    G.phaseT = G.hint ? Math.min(2.6, 1.15 + (q.explain || '').length * 0.012) : 1.15;
  }

  function onWrong(r) {
    const q = G.q;
    G.wrong++;
    G.streak = 0;
    G.perfect = 0;
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
      // Sai 2 lần: đánh dấu đáp án đúng và giải thích *vì sao* (chữ + giọng đọc), robot đi chậm lại một nhịp
      G.hint = true;
      G.slowT = 2.5;
      markAnswer();
      ui.btnHint.disabled = true;
      showHint(answerHint(q), 'info', 4500);
      Voice.say('Đáp án là ' + q.answer.speech + '. ' + speakable(q.explain));
      Sfx.play('hint');
    } else {
      // Lần sai đầu: nói rõ bảng vừa chọn là gì (để bé tự đối chiếu) rồi mời thử lại – chưa lộ đáp án
      const why = r.opt.clock || r.opt.digital ? r.opt.speech + '. Chưa đúng, thử lại nhé!' : 'Bảng “' + r.opt.label + '” chưa đúng. Thử lại nhé!';
      showHint(why, 'bad', 1800);
      Voice.say(speakable(why));
    }
  }

  function loseHeart() {
    G.hearts = Math.max(0, G.hearts - 1);
    ui.hearts.classList.remove('hit');
    void ui.hearts.offsetWidth;
    ui.hearts.classList.add('hit');
    if (G.hearts <= 0) endGame('nolife');
  }

  /** Thưởng lại 1 tim sau 5 câu đúng ngay liên tiếp. */
  function gainHeart() {
    G.hearts = Math.min(MAX_HEARTS, G.hearts + 1);
    const span = ui.hearts.children[G.hearts - 1];
    if (span) {
      span.classList.remove('lost', 'gain');
      void span.offsetWidth;
      span.classList.add('gain');
    }
    Sfx.play('heart');
    addText('+❤️', G.tank.x, G.tank.y - G.tank.size * 1.6, { color: '#ff8fa6', size: Math.min(G.tank.size * 0.9, 40), life: 1.4 });
    toast('5 câu đúng liền – thưởng 1 tim ❤️', 1800);
    Voice.say('Giỏi quá! Con được thưởng một trái tim.', { queue: true });
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
    G.perfect = 0;
    addText('BÙM!', G.tank.x, G.tank.y - G.tank.size * 1.4, { color: '#ffb703', size: G.tank.size * 1.1, life: 1.2 });
    showHint(answerHint(q), 'bad', 4500);
    Voice.say('Ối! Đáp án là ' + q.answer.speech + '. ' + speakable(q.explain));
    noteReview(q);
    loseHeart();
    if (G.state === 'playing') {
      G.phase = 'wait';
      // Chờ đủ lâu để bé đọc hết lời giải thích (câu dài 140 chữ → 4,5 giây) trước khi hỏi lại
      G.phaseT = Math.min(4.5, 1.7 + (q.explain || '').length * 0.02);
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
        r.y += r.vy * dt * (G.slowT > 0 ? 0.3 : 1);      // đang đọc lời giải thích → robot đi chậm lại
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
    if (G.slowT > 0) G.slowT = Math.max(0, G.slowT - dt);
    updateTank(dt);
    updateRobots(dt);
    if (G.state !== 'playing') return;
    if (G.phase === 'wait') {
      G.phaseT -= dt;
      // Đợi lời khen/đáp án đọc xong (kéo dài tối đa 2,5 s), giữ nguyên nhịp khi không có giọng đọc
      if (G.phaseT <= 0 && !(Voice._speaking && G.phaseT > -2.5)) {
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
    if (G.anim - G.nowT > 1) { const d = new Date(); G.nowH = d.getHours() % 12; G.nowM = d.getMinutes(); G.nowT = G.anim; }
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

  /** Mặt đồng hồ (không kim) vẽ sẵn một lần cho mỗi bán kính – tháp và tháp pháo chỉ vẽ kim mỗi khung hình. */
  function faceSprite(rad, opts) {
    const key = Math.round(rad * 10) + ':' + (opts.numbers || 'auto');
    let s = G.faceCache[key];
    if (s && s.dpr === G.dpr) return s;
    const size = Math.ceil(rad * 2.4);
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(size * G.dpr); cv.height = cv.width;
    const cx = cv.getContext('2d');
    cx.scale(G.dpr, G.dpr);
    C.drawClock(cx, size / 2, size / 2, rad, 0, 0, Object.assign({ shadow: false }, opts, { noHands: true }));
    s = { cv: cv, size: size, dpr: G.dpr };
    G.faceCache[key] = s;
    return s;
  }
  function drawLiveClock(c, x, y, rad, h, m, opts) {
    const s = faceSprite(rad, opts);
    c.drawImage(s.cv, x - s.size / 2, y - s.size / 2, s.size, s.size);
    C.drawClock(c, x, y, rad, h, m, Object.assign({ shadow: false }, opts, { noFace: true }));
  }

  function drawTowerClock(c) {
    const W = G.W, hz = G.horizon;
    const ts = clamp(hz * 0.32, 26, 70);
    drawLiveClock(c, W * 0.2, hz + 2 - ts * 2.55, ts * 0.32, G.nowH, G.nowM, { minuteTicks: false, numbers: 'none', shadow: false });
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
    // Thân (gradient tạo một lần theo kích thước & trạng thái trúng đạn)
    const hitTint = t.hit > 0 ? t.hit : 0;
    const gk = Math.round(s) + (hitTint > 0.3 ? 'h' : 'n');
    if (!G.tankGrad || G.tankGrad.key !== gk) {
      const bg = c.createLinearGradient(0, -s * 0.4, 0, s * 0.1);
      bg.addColorStop(0, hitTint > 0.3 ? '#ff9a7a' : '#7ed957');
      bg.addColorStop(1, hitTint > 0.3 ? '#c0503a' : '#3f9c3a');
      const tg = c.createRadialGradient(-s * 0.1, -s * 0.25 - s * 0.1, s * 0.05, 0, -s * 0.25, s * 0.5);
      tg.addColorStop(0, '#5cc24a');
      tg.addColorStop(1, '#2e7d32');
      G.tankGrad = { key: gk, bg: bg, tg: tg };
    }
    c.fillStyle = G.tankGrad.bg;
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
    // Tháp pháo + đồng hồ (giờ thật)
    c.fillStyle = G.tankGrad.tg;
    c.beginPath(); c.arc(0, ty, s * 0.48, 0, TAU); c.fill();
    c.strokeStyle = '#256b22'; c.lineWidth = 3; c.stroke();
    drawLiveClock(c, 0, ty, s * 0.34, G.nowH, G.nowM, { minuteTicks: false, numbers: 'quarter', shadow: false });
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

  /** Bảng đáp án (khung, mặt đồng hồ/điện tử/chữ, bóng đổ) vẽ sẵn một lần vào canvas riêng; mỗi khung hình chỉ drawImage. */
  function boardSprite(r) {
    const w = r.w, h = r.h, isWrong = r.state === 'wrong';
    const pad = Math.max(4, Math.min(w, h) * 0.08);
    const m = Math.ceil(Math.max(12, h * 0.15));            // lề cho bóng đổ
    const cv = document.createElement('canvas');
    cv.width = Math.ceil((w + m * 2) * G.dpr); cv.height = Math.ceil((h + m * 2) * G.dpr);
    const c = cv.getContext('2d');
    c.scale(G.dpr, G.dpr);
    c.translate(m + w / 2, m + h / 2);
    const col = OPT_COLORS[r.idx % OPT_COLORS.length];
    c.shadowColor = 'rgba(0,0,0,0.25)'; c.shadowBlur = 10; c.shadowOffsetY = 4;
    c.fillStyle = isWrong ? '#b9c1d8' : col;
    C.roundRect(c, -w / 2, -h / 2, w, h, Math.min(w, h) * 0.22); c.fill();
    c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetY = 0;
    c.fillStyle = isWrong ? '#e6e9f3' : '#ffffff';
    C.roundRect(c, -w / 2 + pad, -h / 2 + pad, w - pad * 2, h - pad * 2, Math.min(w, h) * 0.16); c.fill();
    if (r.opt) {
      if (r.opt.clock) {
        C.drawClock(c, 0, 0, Math.max(2, (Math.min(w, h) - pad * 2) * 0.46), r.opt.clock.h, r.opt.clock.m, { shadow: false, alpha: isWrong ? 0.45 : 1, emphasizeMinutes: !!r.opt.emphasizeMinutes });
      } else if (r.opt.digital) {
        C.drawDigital(c, 0, 0, Math.max(10, w - pad * 4), Math.max(6, h * 0.55), r.opt.digital, { alpha: isWrong ? 0.45 : 1 });
      } else {
        const fit = fitLines(c, r.opt.label, w - pad * 3.2, Math.round(h * 0.4), 800);
        c.font = '800 ' + fit.size + 'px ' + FONT;
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillStyle = isWrong ? '#98a0bd' : '#2b2d42';
        const lh = fit.size * 1.05;
        fit.lines.forEach(function (ln, i) { c.fillText(ln, 0, (i - (fit.lines.length - 1) / 2) * lh + fit.size * 0.06); });
      }
    }
    return { cv: cv, w: w + m * 2, h: h + m * 2, wrong: isWrong, dpr: G.dpr };
  }

  /** Có hiện huy hiệu phím 1–4 trên bảng không: chỉ khi bé đã dùng bàn phím hoặc máy có con trỏ chuột. */
  function showKeyBadges() {
    if (G.usedKeys) return true;
    if (showKeyBadges._fine == null) {
      try { showKeyBadges._fine = !!(window.matchMedia && window.matchMedia('(pointer: fine)').matches); } catch (e) { showKeyBadges._fine = false; }
    }
    return showKeyBadges._fine;
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
    // Bảng + nội dung: sprite vẽ sẵn, co giãn theo r.scale (lúc xuất hiện / nổ)
    if (!r.sprite || r.sprite.wrong !== isWrong || r.sprite.dpr !== G.dpr) r.sprite = boardSprite(r);
    const sp = r.sprite;
    c.drawImage(sp.cv, x - sp.w * sc / 2, y - sp.h * sc / 2, sp.w * sc, sp.h * sc);
    const pad = Math.max(4, Math.min(w, h) * 0.08);
    if (r.opt && sc > 0.3) {
      // Số thứ tự (phím tắt) – chỉ hiện với người dùng bàn phím/chuột, máy cảm ứng thì bớt rối
      if (G.state === 'playing' && !isWrong && showKeyBadges()) {
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
      let fs = t.size * sc;
      c.font = '800 ' + Math.round(fs) + 'px ' + FONT;
      let w = c.measureText(t.text).width;
      if (w > G.W - 24) {                          // co cho vừa màn hình nhưng không nhỏ hơn 14px (bé phải đọc được)
        fs = Math.max(fs * (G.W - 24) / w, 14);
        c.font = '800 ' + Math.round(fs) + 'px ' + FONT;
        w = c.measureText(t.text).width;
      }
      const tx = w >= G.W - 24 ? G.W / 2 : clamp(t.x, w / 2 + 12, G.W - w / 2 - 12);
      c.lineWidth = Math.max(3, fs * 0.16);
      c.strokeStyle = t.stroke;
      c.strokeText(t.text, tx, t.y);
      c.fillStyle = t.color;
      c.fillText(t.text, tx, t.y);
    }
    c.globalAlpha = 1;
  }

  function render() {
    if (!G.bg) return;
    const c = ctx;
    c.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    let sx = 0, sy = 0;
    const shaking = G.shake > 0 && !Motion.lite;
    if (shaking) {
      const amp = G.shake * G.shake * Math.min(G.W, G.H) * 0.03;
      sx = (Math.random() - 0.5) * 2 * amp;
      sy = (Math.random() - 0.5) * 2 * amp;
      c.translate(sx, sy);
    }
    c.drawImage(G.bg, 0, 0, G.W, G.H);
    drawClouds(c);
    drawTowerClock(c);
    drawDefenseLine(c);
    // Robot xa vẽ trước (y nhỏ) – sắp xếp tại chỗ, không tạo mảng mới mỗi khung hình
    const rs = G.robots;
    rs.sort(byY);
    for (let i = 0; i < rs.length; i++) if (!rs[i].dead) drawRobot(c, rs[i]);
    drawTank(c);
    drawShells(c);
    drawParts(c);
    drawTexts(c);
    if (shaking) c.translate(-sx, -sy);
    if (G.state === 'playing' && G.hearts === 1 && !Motion.lite) {
      if (!G.vignette) {
        const g = c.createRadialGradient(G.W / 2, G.H / 2, Math.min(G.W, G.H) * 0.45, G.W / 2, G.H / 2, Math.max(G.W, G.H) * 0.75);
        g.addColorStop(0, 'rgba(255,40,80,0)');
        g.addColorStop(1, 'rgba(255,40,80,1)');
        G.vignette = g;
      }
      c.globalAlpha = 0.14 + 0.1 * Math.sin(G.anim * 5);
      c.fillStyle = G.vignette;
      c.fillRect(0, 0, G.W, G.H);
      c.globalAlpha = 1;
    }
    if (G.flash) {
      const fa = Math.min(Math.max(0, G.flash.a), Motion.lite ? 0.12 : 1);
      c.fillStyle = 'rgba(' + G.flash.c + ',' + fa.toFixed(2) + ')';
      c.fillRect(0, 0, G.W, G.H);
    }
  }
  function byY(a, b) { return a.y - b.y; }

  /* ================= HUD ================= */
  function syncHud() {
    const h = G.hud;
    // Nút 💡 chỉ sáng đúng lúc đang hỏi và chưa gợi ý (đếm ngược, pha chờ, bảng kết quả → mờ đi)
    const hintOff = !(G.state === 'playing' && G.phase === 'ask' && !!G.q && !G.hint);
    if (h.hintOff !== hintOff) { h.hintOff = hintOff; ui.btnHint.disabled = hintOff; }
    if (!inGame()) return;
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
    const pr = 'Câu ' + Math.min(G.qTotal, G.qIndex + 1) + '/' + G.qTotal + (G.q && G.q.review ? ' · 📝 Ôn lại' : '');
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
    G.hud = { score: -1, hearts: -1, progress: '', mult: -1, hintOff: null };
    ui.combo.hidden = true;
    ui.hint.hidden = true;
    ui.btnHint.disabled = true;                    // chỉ sáng lại khi thật sự đang hỏi (syncHud)
    ui.promptText.textContent = 'Sẵn sàng…';
    ui.promptVisual.hidden = true;
    ui.promptVisual.innerHTML = '';
    ui.prompt.classList.remove('stack', 'ok', 'shake');
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
    G.reviewUsed = []; G.missedKeys = [];
    G.reviewSlots = pickReviewSlots(level, G.qTotal);
    G.overAt = -1; G.resultShown = false; G.lastWarn = -1; G.slowT = 0; G.perfect = 0;
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

  /** Chọn ~25% vị trí câu (ít nhất 1, nhiều nhất 3) để chèn câu ôn lại từ kho của bé, nếu kho có câu hợp với màn này. */
  function pickReviewSlots(level, total) {
    const poolN = Store.reviewPool(function (info) { return !!info && info.level <= level.n; }).length;
    if (!poolN || total < 2) return null;
    const k = clamp(Math.round(total * 0.25), 1, Math.min(3, poolN));
    const idx = [];
    for (let i = 1; i < total; i++) idx.push(i);
    return new Set(shuffle(idx).slice(0, k));
  }

  function runCountdown(cb) {
    const el = ui.countNum;
    let n = 3;
    G.cdCb = cb;                     // để chạy lại đếm ngược khi tab hiện trở lại
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
    requestWake();
  }

  function endGame(reason) {
    if (G.state !== 'playing') return;
    G.state = 'over';
    G.endReason = reason;
    G.phase = 'idle';
    G.overAt = G.anim + (reason === 'done' ? 1.6 : 1.9);
    Music.stop();
    const cx = G.W / 2, cy = G.H * 0.42;
    // Không cắt lời khen / đáp án đang đọc: xếp hàng câu kết thúc
    if (reason === 'done') {
      Sfx.play('win');
      Voice.say('Hoàn thành màn ' + G.level.n + '! Giỏi lắm!', { queue: true });
      addText('Hoàn thành!', cx, cy, { color: '#fff', stroke: 'rgba(4,166,124,0.95)', size: G.tank.size * 1.5, life: 1.8, vy: -15 });
      spawnConfetti(90);
    } else {
      Sfx.play('lose');
      Voice.say('Xe tăng hết máu rồi! Xem lại bài học rồi thử lại nhé.', { queue: true });
      addText('Xe tăng hết máu!', cx, cy, { color: '#fff', stroke: 'rgba(239,71,111,0.95)', size: G.tank.size * 1.3, life: 1.8, vy: -15 });
    }
    G.robots.forEach(function (r) { if (!r.dead && r.state !== 'dying') { r.state = 'flee'; r.t = 0; } });
    renderPrompt(false);
  }

  /** Sao tính theo SỐ CÂU bị sai (mỗi câu chỉ tính một lần, dù bắn trượt mấy lần), không theo số lần bắn trượt:
      3 sao: không câu nào sai và còn đủ tim · 2 sao: sai ≤ 2 câu và còn ≥ 2 tim · 1 sao: hoàn thành. */
  function starsFor() {
    const missedQ = G.review.length;
    if (missedQ === 0 && G.hearts === MAX_HEARTS) return 3;
    if (missedQ <= 2 && G.hearts >= 2) return 2;
    return 1;
  }

  /** Bỏ phần mệnh lệnh "Bắn đồng hồ chỉ …" ở đầu câu hỏi để chip ôn lại đọc gọn: "7 giờ 50 phút → 8 giờ kém 10 phút".
      Câu hỏi thật ("Đồng hồ chỉ mấy giờ?") thì giữ nguyên, chỉ bỏ dấu câu cuối. */
  function shortPrompt(text) {
    return String(text || '')
      .replace(/^Bắn đồng hồ điện tử chỉ\s*/, '').replace(/^Bắn đồng hồ chỉ\s*/, '').replace(/^Bắn\s*/, '')
      .replace(/^Đồng hồ điện tử chỉ (?!mấy)/, '').replace(/^Đồng hồ chỉ (?!mấy)/, '')
      .replace(/[?!:]+$/, '').trim();
  }

  /** Chip "cần ôn lại": câu hỏi rút gọn → đáp án (đồng hồ kim / điện tử / chữ) + một dòng vì sao. */
  function reviewChipHtml(r, i) {
    const q = r.q;
    const ok = (q.options || []).filter(function (o) { return o.ok; })[0] || null;
    let ans;
    if (ok && ok.clock) ans = '<canvas class="chip-clock" width="44" height="44" data-h="' + ok.clock.h + '" data-m="' + ok.clock.m + '"' + (ok.emphasizeMinutes ? ' data-em="1"' : '') + '></canvas>';
    else if (ok && ok.digital) ans = '<span class="digital">' + esc(ok.digital) + '</span>';
    else ans = '<b>' + esc(r.text) + '</b>';
    const ask = shortPrompt(r.prompt);
    return '<button type="button" class="review-chip" data-i="' + i + '" aria-label="Nghe lại: ' + esc(r.text) + '">' +
      '<span class="rc-line">🔊 ' + (ask ? esc(ask) + ' → ' : '') + ans + '</span>' +
      (q.explain ? '<span class="rc-why">' + esc(q.explain) + '</span>' : '') +
      '</button>';
  }

  /** Vẽ các mặt đồng hồ nhỏ 44 px trong chip / bảng kết quả (sau khi bảng đã hiện để đo được bề rộng). */
  function paintChipClocks(root) {
    const cvs = root.querySelectorAll('canvas.chip-clock');
    if (!cvs.length) return;
    requestAnimationFrame(function () {
      for (let i = 0; i < cvs.length; i++) {
        paintClockCanvas(cvs[i], Number(cvs[i].getAttribute('data-h')), Number(cvs[i].getAttribute('data-m')),
          { numbers: 'quarter', emphasizeMinutes: cvs[i].getAttribute('data-em') === '1' });
      }
    });
  }

  function starsHtml(n) {
    let h = '';
    for (let i = 0; i < 3; i++) h += '<span class="' + (i < n ? 'on' : 'off') + '">★</span>';
    return h;
  }

  function showResults() {
    G.resultShown = true;
    G.texts.length = 0;                       // không để chữ "Hết máu!" trên canvas đè lên bảng kết quả
    const lvl = G.level, score = G.score;
    const done = G.endReason === 'done';
    const p = Store.prog(lvl.id);
    const isRecord = done && score > 0 && score > (p.best || 0);
    const stars = done ? starsFor() : 0;
    p.best = Math.max(p.best || 0, done ? score : 0);
    p.stars = Math.max(p.stars || 0, stars);
    p.plays = (p.plays || 0) + 1;
    Store.setProg(lvl.id, p);
    Store.addStats({ correct: G.correct, wrong: G.wrong, seconds: G.time, topic: lvl.id });

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

    // Chỉ hiện vài chip: bảng kết quả phải luôn chừa chỗ cho các nút "🔄 Chơi lại" / "🧠 Hỏi đáp" trong màn hình
    ui.review.hidden = !G.review.length;
    ui.reviewChips.innerHTML = G.review.slice(0, REVIEW_CHIPS).map(function (r, i) { return reviewChipHtml(r, i); }).join('');
    paintChipClocks(ui.reviewChips);
    const moreReview = Math.max(0, G.review.length - REVIEW_CHIPS);
    ui.reviewMore.textContent = moreReview ? '… và ' + moreReview + ' câu nữa – xem đủ ở 📊 Kết quả' : '';
    ui.reviewMore.hidden = !moreReview;

    ui.btnQuiz.hidden = !done;
    ui.btnResultLesson.hidden = done;          // hết máu → mời bé xem lại bài học trước khi chơi tiếp
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

  /** "Đã thuộc": đúng ≥ 90% trên ít nhất 20 câu của màn đó */
  function mastered(topic) {
    const t = Store.p().stats.byTopic[topic];
    if (!t) return false;
    const n = t.c + t.w;
    return n >= 20 && t.c / n >= 0.9;
  }

  function renderLevels() {
    let nextFound = false;
    ui.levelGrid.innerHTML = L.LEVELS.map(function (l) {
      const p = Store.prog(l.id);
      const unlocked = Store.isUnlocked(l);
      const isNext = unlocked && !p.passed && !nextFound;
      if (isNext) nextFound = true;
      let meta;
      if (!unlocked) meta = '<span class="lock">🔒 Qua hỏi đáp màn ' + (l.n - 1) + ' để mở</span>';
      else meta = '<span class="best">🏆 ' + (p.best ? fmt(p.best) : '—') + '</span>' +
        '<span class="quiz-best">🧠 ' + (p.quizBest || 0) + '/' + QUIZ_N + '</span>' +
        '<span class="stars" aria-hidden="true">' + starsHtml(p.stars || 0) + '</span>';
      const label = 'Màn ' + l.n + ': ' + l.title + ', ' + gradeLabel(l) +
        (unlocked ? (p.passed ? ', đã qua' : '') + (mastered(l.id) ? ', đã thuộc' : '') + ', ' + (p.stars || 0) + ' sao, điểm cao ' + fmt(p.best || 0) + ', hỏi đáp ' + (p.quizBest || 0) + ' trên ' + QUIZ_N : ', đang khóa');
      return '<div class="level-card' + (unlocked ? '' : ' locked') + (isNext ? ' next' : '') + '" data-id="' + l.id + '" role="button"' +
        ' tabindex="' + (unlocked ? '0' : '-1') + '"' + (unlocked ? '' : ' aria-disabled="true"') + ' aria-label="' + esc(label) + '">' +
        '<div class="level-head">' +
        '<span class="num">MÀN ' + l.n + (p.passed ? ' <span class="passed" title="Đã qua hỏi đáp">✅</span>' : '') + '</span>' +
        '<span class="grade ' + gradeClass(l.grade) + '">' + gradeLabel(l) + '</span>' +
        '</div>' +
        '<div class="icon">' + (unlocked ? l.icon : '🔒') + '</div>' +
        '<div class="name">' + esc(l.title) + '</div>' +
        '<div class="desc">' + esc(l.desc) + '</div>' +
        (unlocked && mastered(l.id) ? '<div class="mastered">✅ Đã thuộc</div>' : '') +
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
    ui.lessonPoints.innerHTML = ls.points.map(function (p, i) { return '<li data-n="' + (i + 1) + '" role="button" tabindex="0">' + p + '</li>'; }).join('');
    ui.lessonExamples.innerHTML = ls.examples.map(function (e, i) {
      // Nút giữ nhãn ngắn (e.btn); nhãn đầy đủ dạy sự tương đương nằm dưới mặt đồng hồ
      return '<button type="button" data-i="' + i + '" class="' + (i === 0 ? 'on' : '') + '">' + esc(e.btn || e.label || C.readTime(e.h, e.m, level.id === 'l2' ? 'ruoi' : 'plain')) + '</button>';
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
    // Bài "thời gian trôi qua": kim quay chậm từ giờ bắt đầu (e.from) tới giờ kết thúc để bé thấy khoảng thời gian
    const from = e.from && Number.isFinite(e.from.h) && Number.isFinite(e.from.m) ? e.from : null;
    const curAngle = from ? ((from.h % 12) + from.m / 60) : ((lc.h % 12) + lc.m / 60);
    const target = ((e.h % 12) + e.m / 60);
    lc.fh = curAngle; lc.fm = from ? from.m : lc.m;
    lc.th = target; lc.tm = e.m;
    lc.rate = from ? 1.12 : 1.6;
    lc.t = 0;
    lc.h = e.h; lc.m = e.m;
    G.lessonEx = i;
    const btns = ui.lessonExamples.querySelectorAll('button');
    for (let k = 0; k < btns.length; k++) btns[k].classList.toggle('on', k === i);
    const label = e.label || C.readTime(e.h, e.m, G.level.id === 'l2' ? 'ruoi' : 'plain');
    ui.lessonClockLabel.textContent = label;
    // Bài "24 giờ" và "từng phút & điện tử": thêm biểu tượng buổi + đồng hồ điện tử + cách gọi 24 giờ
    if (ui.lessonExtra) {
      if (Number.isInteger(e.h24)) {
        ui.lessonExtra.innerHTML = '<span class="ses" aria-hidden="true">' + esc(C.SESSION_ICON[e.session] || '🕒') + '</span>' +
          '<span class="digital">' + esc(C.digital(e.h24, e.m)) + '</span>' +
          '<span class="h24">= ' + e.h24 + ' giờ' + (e.session ? ' · buổi ' + esc(e.session) : '') + '</span>';
        ui.lessonExtra.hidden = false;
      } else {
        ui.lessonExtra.hidden = true;
        ui.lessonExtra.innerHTML = '';
      }
    }
    if (speak) {
      // "07:13" → "7 giờ 13 phút"; các ký hiệu → lời; gọn khoảng trắng để giọng đọc không ngắt lạ
      const speech = label.replace(/(\d{1,2}):(\d{2})/g, function (_, hh, mm) { return Number(hh) + ' giờ ' + Number(mm) + ' phút'; })
        .replace(/·/g, ', hay là ').replace(/\(/g, ', buổi ').replace(/\)/g, '').replace(/→/g, ' đến ').replace(/:/g, ' là ').replace(/\+/g, ' cộng ').replace(/=/g, ' bằng ')
        .replace(/\s+/g, ' ').replace(/\s,/g, ',').trim();
      Voice.say(speech);
    }
  }

  function paintLessonClock(force, dt) {
    const lc = G.lessonClock;
    if (!force && lc.t >= 1) return;
    if (dt) lc.t = Math.min(1, lc.t + dt * (lc.rate || 1.6));
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
    // 2. Câu hỏi khái niệm từ ngân hàng (màn tổng ôn l9: 2 khái niệm + 2 luyện tập để thiên về thực hành)
    const bank = shuffle(level.quiz.slice());
    const nConcept = level.id === 'l9' ? Math.min(bank.length, 2) : Math.min(bank.length, QUIZ_N - 1 - items.length);
    for (let i = 0; i < nConcept; i++) items.push({ kind: 'concept', tag: 'Ghi nhớ kiến thức', q: bank[i] });
    // 3. Câu luyện tập mới sinh
    while (items.length < QUIZ_N) items.push({ kind: 'practice', tag: 'Luyện tập', q: level.gen() });
    return shuffle(items).slice(0, QUIZ_N);
  }

  function startQuiz(level) {
    leaveGame();
    G.level = level;
    G.state = 'quiz';
    G.quiz = { items: buildQuiz(level), i: 0, correct: 0, answered: false, level: level, done: false, wrongIdx: [] };
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
      return { text: q.q, prompt: { clocks: q.clock ? [q.clock] : [], digital: q.digital || null, hideHour: !!q.hideHour }, options: shuffle(opts), explain: q.explain, speech: q.q, answer: q.a[0], answerSpeech: q.a[0], key: null, info: null };
    }
    // answerSpeech: đọc "7 giờ 5 phút" thay vì "07:05"; key/info để ghi vào kho ôn lại
    return { text: q.prompt.text.replace(/^Bắn /, 'Chọn ').replace(/!$/, '.'), prompt: q.prompt, options: q.options, explain: q.explain, speech: q.prompt.speech.replace(/^Bắn /, 'Chọn '), answer: q.answer.label, answerSpeech: q.answer.speech || q.answer.label, key: q.key || null, info: q.info || null };
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
      const aria = (o.clock ? 'Đồng hồ ' : 'Phương án ') + (i + 1) + (o.clock ? '' : ': ' + o.label);
      return '<button type="button" class="quiz-opt" data-i="' + i + '" aria-label="' + esc(aria) + '">' +
        '<span class="key" aria-hidden="true">' + (i + 1) + '</span>' + inner + '</button>';
    }).join('');
    requestAnimationFrame(paintQuizClocks);
    ui.quizExplain.hidden = true;
    ui.btnQuizNext.hidden = true;
    Voice.say(n.speech);
  }

  /** Vẽ lại các mặt đồng hồ của phương án hỏi đáp (tách riêng để font tải xong có thể vẽ lại mà không đọc lại câu hỏi). */
  function paintQuizClocks() {
    const cvs = ui.quizOpts.querySelectorAll('canvas');
    for (let i = 0; i < cvs.length; i++) paintClockCanvas(cvs[i], Number(cvs[i].getAttribute('data-h')), Number(cvs[i].getAttribute('data-m')), {});
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
      btns[k].setAttribute('aria-pressed', String(k === i));
      if (n.options[k].ok) { btns[k].classList.add('ok'); btns[k].setAttribute('aria-label', btns[k].getAttribute('aria-label') + ' – đúng'); }
      else if (k === i) { btns[k].classList.add('bad'); btns[k].setAttribute('aria-label', btns[k].getAttribute('aria-label') + ' – sai'); }
      else btns[k].classList.add('dim');
    }
    Q.items[Q.i].result = !!o.ok;
    // Câu luyện tập: cập nhật kho ôn lại của bé
    if (n.key) {
      if (o.ok) Store.noteOk(n.key);
      else Store.noteMissed(n.key, Object.assign({ level: Q.level ? Q.level.n : L.LEVELS.length }, n.info || {}));
    }
    if (o.ok) {
      Q.correct++;
      const pr = pick(QUIZ_PRAISE);              // cùng một lời khen cho chữ và giọng đọc
      ui.quizExplain.innerHTML = '<b>' + pr + '</b> ' + esc(n.explain);
      ui.quizExplain.className = 'quiz-explain ok';
      Sfx.play('correct');
      Voice.say(pr + ' ' + n.explain);
    } else {
      ui.quizExplain.innerHTML = '<b>Chưa đúng.</b> Đáp án là <b>' + esc(n.answer) + '</b>. ' + esc(n.explain);
      ui.quizExplain.className = 'quiz-explain bad';
      Sfx.play('wrong');
      Voice.say('Chưa đúng. Đáp án là ' + n.answerSpeech + '. ' + n.explain);
    }
    ui.quizExplain.hidden = false;
    ui.btnQuizNext.hidden = false;
    ui.btnQuizNext.textContent = Q.i + 1 < Q.items.length ? 'Tiếp theo ▶' : 'Xem kết quả ▶';
    ui.quizProgress.children[Q.i].className = o.ok ? 'ok' : 'bad';
  }

  function nextQuiz() {
    const Q = G.quiz;
    if (Q.done || !Q.answered || Q.i >= Q.items.length) return;   // đã xong: Enter/Space không chạy lại finishQuiz
    Q.i++;
    if (Q.i < Q.items.length) { renderQuizQuestion(); return; }
    finishQuiz();
  }

  function finishQuiz() {
    const Q = G.quiz, lvl = Q.level;
    if (Q.done || !lvl) return;
    Q.done = true;
    const passed = Q.correct >= QUIZ_PASS;
    const p = Store.prog(lvl.id);
    p.quizBest = Math.max(p.quizBest || 0, Q.correct);
    const firstPass = passed && !p.passed;
    if (passed) p.passed = true;
    Store.setProg(lvl.id, p);
    Store.addStats({ correct: Q.correct, wrong: Q.items.length - Q.correct, seconds: 0, topic: 'quiz:' + lvl.id, plays: false });
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
    G.parentA = rnd(6, 9); G.parentB = rnd(6, 9);
    ui.parentQ.textContent = G.parentA + ' × ' + G.parentB + ' = ?';
    ui.parentInput.value = '';
    ui.parentGate.hidden = false;
    ui.parentBody.hidden = true;
    ui.resetConfirm.hidden = true;
    $('parent-who').textContent = 'Đang xem tiến trình của ' + Players.active().name + '. Các màn được mở khóa dần theo phần hỏi đáp; bạn có thể mở tất cả để bé học theo đúng lớp của mình.';
    ui.parent.classList.remove('hidden');
    setTimeout(function () { try { ui.parentInput.focus(); } catch (e) { /* bỏ qua */ } }, 50);
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
  /** Đóng bảng phụ huynh: lần mở sau phải trả lời câu hỏi mới */
  function closeParent() {
    ui.parent.classList.add('hidden');
    ui.parentInput.value = '';
    ui.parentGate.hidden = false;
    ui.parentBody.hidden = true;
    ui.resetConfirm.hidden = true;
  }
  /** Xóa tiến trình của người chơi đang hoạt động (đã qua cổng phụ huynh) */
  function resetProgress() {
    const name = Players.active().name;
    Store.resetActive();
    renderLevels();
    renderPlayers();
    if (overlayOpen('report')) renderReport();
    toast('Đã xóa tiến trình của ' + name);
  }

  /** Cổng phụ huynh dùng chung (xóa tiến trình, xóa người chơi): câu nhân trong trang – không dùng window.prompt/confirm. */
  const Gate = { cb: null, answer: 0 };
  function adultGate(cb) {
    const a = 2 + Math.floor(Math.random() * 8), b = 2 + Math.floor(Math.random() * 8);
    Gate.cb = cb; Gate.answer = a * b;
    $('parent-gate-q').textContent = 'Dành cho phụ huynh, thầy cô. Để tiếp tục, hãy trả lời: ' + a + ' × ' + b + ' = ?';
    $('parent-gate-input').value = '';
    ui.gate.classList.remove('hidden');
    setTimeout(function () { try { $('parent-gate-input').focus(); } catch (e) { /* bỏ qua */ } }, 50);
  }
  function closeGate() { ui.gate.classList.add('hidden'); Gate.cb = null; }
  function submitGate() {
    const v = Number($('parent-gate-input').value);
    if (v === Gate.answer) { const cb = Gate.cb; closeGate(); Sfx.play('correct'); if (cb) cb(); }
    else { Sfx.play('wrong'); toast('Chưa đúng, thử lại nhé'); $('parent-gate-input').value = ''; }
  }

  /* ================= NGƯỜI CHƠI (hồ sơ dùng chung giữa các game) ================= */
  const PlayersUI = { mode: null, avatar: null };
  function renderPlayerChip() {
    const b = $('btn-player');
    if (!b) return;
    b.innerHTML = Players.chipHtml() + '<span class="pl-hint" aria-hidden="true">▾</span>';
    b.setAttribute('aria-label', 'Đổi người chơi (đang chơi: ' + Players.active().name + ')');
  }
  function renderPlayers() {
    const act = Players.active();
    $('player-list').innerHTML = Players.list().map(function (p) {
      const stars = Store.sumStars(Store.data.players[p.id]);   // sao của riêng game này
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
    if (Voice.available) Voice.say('Chào ' + Players.active().name + '!');
  }
  /** Lời chào theo tên, một lần mỗi lần mở trang (khi bé bấm Chơi ngay) */
  function welcome() {
    if (G.welcomed) return;
    G.welcomed = true;
    const name = Players.active().name;
    toast('Chào ' + name + ' 👋');
    Voice.say('Chào ' + name + '! Cùng học xem đồng hồ nào!');
  }

  /* ================= KẾT QUẢ CỦA BÉ (phụ huynh) ================= */
  /** Mô tả một mục trong kho ôn lại bằng chữ dễ đọc, ví dụ "7 giờ 50 phút → 8 giờ kém 10 phút" */
  function describeReview(it) {
    const i = it.info;
    if (!i) return String(it.key);
    let s;
    try {
      switch (i.kind) {
        case 'read': s = '🕒 Đọc đồng hồ: ' + C.readTime(i.h, i.m, i.style || 'plain'); break;
        case 'match': s = '🎯 Chọn đồng hồ chỉ ' + C.readTime(i.h, i.m, i.style || 'plain'); break;
        case 'five': s = 'Kim dài chỉ số ' + i.n5 + ' = ' + (i.n5 * 5) + ' phút'; break;
        case 'h24':
          if (i.variant === 1) s = i.h24 + ' giờ = ' + C.readSession(i.h24, 0);
          else if (i.variant === 3) s = i.h24 + ' giờ là buổi ' + C.session(i.h24);
          else s = C.readSession(i.h24, 0) + ' = ' + i.h24 + ' giờ';
          break;
        case 'kem': s = C.readTime(i.h, i.m) + ' → ' + C.readTime(i.h, i.m, 'kem'); break;
        case 'exact': s = '🕒 ' + C.readTime(i.h, i.m) + ' (từng phút)'; break;
        case 'digital': s = C.digital(i.h24, i.m) + ' = ' + C.readSession(i.h24, i.m); break;
        case 'elapsed': {
          const end = C.addMinutes(i.sh, i.sm, i.dur);
          s = C.readTime(i.sh, i.sm) + ' + ' + C.readDuration(i.dur) + ' → ' + C.readTime(end.h, end.m);
          break;
        }
        default: s = String(it.key);
      }
    } catch (e) { s = String(it.key); }
    return s + (i.level ? ' · Màn ' + i.level : '');
  }
  function renderReport() {
    const p = Players.active(), b = Store.p(), s = b.stats;
    $('report-title').textContent = '📊 Kết quả của ' + p.name;
    const total = s.correct + s.wrong, acc = total ? Math.round(s.correct / total * 100) : 0;
    const passedN = L.LEVELS.filter(function (l) { return Store.prog(l.id).passed; }).length;
    $('report-stats').innerHTML =
      '<div class="report-stat"><div class="v">' + s.plays + '</div><div class="k">ván đã chơi</div></div>' +
      '<div class="report-stat"><div class="v">' + acc + '%</div><div class="k">trả lời đúng</div></div>' +
      '<div class="report-stat"><div class="v">' + Math.round(s.seconds / 60) + '</div><div class="k">phút luyện tập</div></div>' +
      '<div class="report-stat"><div class="v">' + passedN + '/' + L.LEVELS.length + '</div><div class="k">màn đã qua</div></div>';
    $('report-levels').innerHTML = L.LEVELS.map(function (l) {
      const r = Store.prog(l.id), t = s.byTopic[l.id] || { c: 0, w: 0 }, n = t.c + t.w;
      const acc1 = n ? Math.round(t.c / n * 100) : 0;
      const weak = n >= 5 && acc1 < 70;                       // chủ đề yếu: cần luyện thêm
      return '<div class="report-row"><span class="t">' + esc(l.icon + ' Màn ' + l.n + ': ' + l.title) + '</span>' +
        '<span class="stars" aria-label="' + r.stars + ' sao">' + starsHtml(r.stars) + '</span>' +
        '<span>🏆 ' + fmt(r.best) + '</span><span>🧠 ' + r.quizBest + '/' + QUIZ_N + '</span>' +
        (n ? '<span>🎯 ' + acc1 + '% (' + n + ' câu)</span>' : '<span class="muted">chưa chơi</span>') +
        (r.passed ? '<span class="passed">✅ Đã qua</span>' : '') +
        (mastered(l.id) ? '<span class="mastered">🏅 Đã thuộc</span>' : '') +
        (weak ? '<span class="n">⚠️ Cần luyện thêm</span>' : '') + '</div>';
    }).join('');
    const pool = Store.reviewPool();
    $('report-review').innerHTML = pool.length
      ? pool.slice(0, 12).map(function (it) {
        return '<div class="report-row">' + reviewClockHtml(it.info) + '<span class="t">' + esc(describeReview(it)) + '</span><span class="n">✖ ' + it.n + '</span></div>';
      }).join('')
      : '<div class="report-row"><span class="t">Chưa có gì cần ôn — tuyệt vời! 🎉</span></div>';
    paintChipClocks($('report-review'));
  }

  /** Mặt đồng hồ nhỏ minh họa cho một mục trong kho ôn lại (khi mục đó có giờ/phút). */
  function reviewClockHtml(i) {
    if (!i) return '';
    let h = null, m = null;
    if ((i.kind === 'read' || i.kind === 'match' || i.kind === 'exact' || i.kind === 'kem') && Number.isInteger(i.h) && Number.isInteger(i.m)) { h = i.h; m = i.m; }
    else if (i.kind === 'five' && Number.isInteger(i.n5)) { h = 12; m = i.n5 * 5; }
    else if (i.kind === 'elapsed' && Number.isInteger(i.sh) && Number.isInteger(i.sm)) { h = i.sh; m = i.sm; }
    if (h == null) return '';
    return '<canvas class="chip-clock" width="40" height="40" data-h="' + h + '" data-m="' + m + '"></canvas>';
  }
  function openReport() {
    renderReport();
    ui.report.classList.remove('hidden');
    focusFirst(ui.report);
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
    // Chỉ chặn cuộn/zoom trên canvas (không gắn ở document để các bảng vẫn cuộn mượt)
    canvas.addEventListener('touchmove', function (e) { if (e.cancelable) e.preventDefault(); }, { passive: false });
    canvas.addEventListener('touchstart', function (e) { if (e.cancelable) e.preventDefault(); }, { passive: false });
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    document.addEventListener('dblclick', function (e) { if (e.target === canvas) e.preventDefault(); });
    document.addEventListener('contextmenu', function (e) { if (e.target === canvas) e.preventDefault(); });
    document.addEventListener('pointerdown', function () { Sfx.unlock(); }, true);
    document.addEventListener('keydown', function (e) {
      G.usedKeys = true;
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {   // đang gõ tên / đáp án: không bắt phím trò chơi
        if (e.key === 'Escape') escapeOverlay();
        return;
      }
      // Đang tiêu điểm ở một nút HUD (⏸ 🔊 💡): Enter/Space phải bấm nút đó, không bắn xe tăng
      if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.closest && e.target.closest('#hud button')) return;
      if (e.key === 'Escape' && escapeOverlay()) return;                  // đóng lớp phủ trên cùng (người chơi, kết quả, cổng…)
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (G.state === 'playing') pauseGame();
        else if (G.state === 'paused') resumeGame();
        else if (G.state === 'quiz' && e.key === 'Escape') goLevels();   // hỏi đáp luôn có đường ra
        return;
      }
      if (G.state === 'quiz') {
        if (!ui.quizDone.hidden) return;                                   // đã xong hỏi đáp: không chạy lại
        if (/^[1-4]$/.test(e.key)) { answerQuiz(Number(e.key) - 1); return; }
        if (e.key === 'Enter' || e.key === ' ') { nextQuiz(); return; }
        return;
      }
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

  const TOGGLE_KEYS = ['sound', 'music', 'voice'];
  function renderAudioToggles() {
    const defs = [
      { key: 'sound', on: '🔊 Âm thanh: Bật', off: '🔇 Âm thanh: Tắt' },
      { key: 'music', on: '🎵 Nhạc nền: Bật', off: '🎵 Nhạc nền: Tắt' },
      { key: 'voice', on: '🗣️ Đọc câu hỏi: Bật', off: '🗣️ Đọc câu hỏi: Tắt' },
      { key: 'fx', on: '✨ Hiệu ứng: Nhiều', off: '✨ Hiệu ứng: Ít' }        // hiệu ứng hình ảnh (rung, hạt, chớp)
    ];
    const boxes = document.querySelectorAll('[data-audio-toggles]');
    for (let i = 0; i < boxes.length; i++) {
      boxes[i].innerHTML = defs.map(function (d) {
        const noVoice = d.key === 'voice' && !Voice.available;
        const on = d.key === 'fx' ? Store.data.fx !== 'lite' : (Store.data[d.key] !== false && !noVoice);
        let label = on ? d.on : d.off;
        if (noVoice) label = '🗣️ Đọc câu hỏi: chưa có giọng Việt';
        return '<button type="button" class="toggle ' + (on ? 'on' : 'off') + (d.key === 'fx' && !on ? ' lite' : '') + '" data-set="' + d.key + '"' +
          ' aria-pressed="' + (on ? 'true' : 'false') + '"' + (noVoice ? ' disabled' : '') + '>' + label + '</button>';
      }).join('');
    }
  }

  /** Enter/Space trên phần tử role="button" (thẻ màn, ý bài học) hoạt động như chạm */
  function keyActivate(container, sel) {
    container.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const el = e.target && e.target.closest ? e.target.closest(sel) : null;
      if (!el) return;
      e.preventDefault();
      el.click();
    });
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
    click('btn-play', function () { welcome(); goLevels(); });
    click('btn-howto', function () { ui.howto.classList.remove('hidden'); focusFirst(ui.howto); });
    click('btn-howto-close', function () { ui.howto.classList.add('hidden'); });
    click('btn-levels-back', function () { goMenu(); });
    // Phụ huynh (bảng có câu hỏi nhân trong trang)
    click('btn-parent', function () { openParent(); });
    click('btn-parent-close', function () { closeParent(); });
    click('btn-parent-check', function () { checkParent(); });
    ui.parentInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); checkParent(); } });
    click('btn-unlock-all', function () { Store.p().unlockAll = true; Store.save(); renderLevels(); toast('Đã mở khóa tất cả màn 🔓'); });
    click('btn-lock-all', function () { Store.p().unlockAll = false; Store.save(); renderLevels(); toast('Các màn sẽ mở theo tiến trình 🔒'); });
    click('btn-reset-progress', function () {
      $('reset-confirm-text').textContent = 'Xóa toàn bộ điểm, sao và tiến trình của ' + Players.active().name + '? Không thể hoàn tác.';
      ui.resetConfirm.hidden = false;
    });
    click('btn-reset-no', function () { ui.resetConfirm.hidden = true; });
    click('btn-reset-yes', function () { ui.resetConfirm.hidden = true; resetProgress(); });
    // Cổng phụ huynh dùng chung
    $('parent-gate-form').addEventListener('submit', function (e) { e.preventDefault(); Sfx.unlock(); submitGate(); });
    click('btn-parent-gate-cancel', function () { closeGate(); });
    // Người chơi
    click('btn-player', function () { PlayersUI.mode = null; renderPlayers(); ui.players.classList.remove('hidden'); focusFirst(ui.players); });
    click('btn-players-back', function () { PlayersUI.mode = null; ui.players.classList.add('hidden'); });
    $('player-list').addEventListener('click', function (e) {
      const b = e.target.closest('.player-item');
      if (!b) return;
      Sfx.unlock(); Sfx.play('click');
      Players.setActive(b.getAttribute('data-id'));
    });
    click('btn-player-add', function () { openPlayerForm('add'); });
    click('btn-player-rename', function () { openPlayerForm('rename'); });
    click('btn-player-avatar', function () { openPlayerForm('avatar'); });
    click('btn-player-cancel', function () { PlayersUI.mode = null; renderPlayers(); });
    $('player-form').addEventListener('submit', function (e) { e.preventDefault(); Sfx.unlock(); submitPlayerForm(); });
    $('player-avatars').addEventListener('click', function (e) {
      const b = e.target.closest('.avatar');
      if (!b) return;
      PlayersUI.avatar = b.getAttribute('data-avatar');
      const all = $('player-avatars').children;
      for (let i = 0; i < all.length; i++) all[i].setAttribute('aria-pressed', String(all[i] === b));
      Sfx.play('tock');
    });
    click('btn-player-remove', function () {
      const p = Players.active();
      if (Players.list().length <= 1) { toast('Cần ít nhất một người chơi'); return; }
      adultGate(function () {
        if (Players.remove(p.id)) { delete Store.data.players[p.id]; Store.save(); toast('Đã xóa ' + p.name); renderPlayers(); }
      });
    });
    // Kết quả của bé
    click('btn-report', function () { openReport(); });
    click('btn-players-report', function () { openReport(); });
    click('btn-report-back', function () { ui.report.classList.add('hidden'); });
    click('btn-report-reset', function () { adultGate(function () { resetProgress(); }); });
    // Chọn màn (chạm hoặc Enter/Space)
    ui.levelGrid.addEventListener('click', function (e) {
      const card = e.target.closest('.level-card');
      if (!card) return;
      const lvl = L.byId(card.getAttribute('data-id'));
      if (!lvl) return;
      Sfx.unlock(); Sfx.play('click');
      openLevel(lvl);
    });
    keyActivate(ui.levelGrid, '.level-card');
    keyActivate(ui.lessonPoints, 'li');
    document.addEventListener('click', function (e) {
      const b = e.target.closest ? e.target.closest('.toggle[data-set]') : null;
      if (!b || b.disabled) return;
      const k = b.getAttribute('data-set');
      Sfx.unlock();
      if (k === 'fx') {                                    // hiệu ứng hình ảnh: 'full' | 'lite'
        Store.data.fx = Store.data.fx === 'lite' ? 'full' : 'lite';
        Store.save();
        Motion.refresh();
        renderAudioToggles();
        Sfx.play('click');
        toast(Store.data.fx === 'lite' ? 'Hiệu ứng ít: không rung màn hình, ít hạt ✨' : 'Hiệu ứng đầy đủ ✨');
        return;
      }
      if (TOGGLE_KEYS.indexOf(k) < 0) return;
      Store.data[k] = !(Store.data[k] !== false);
      Store.save();
      applyAudioSettings();
      renderAudioToggles();
      if (Store.data[k] !== false) {
        if (k === 'sound') Sfx.play('correct');
        if (k === 'voice') Voice.say('Xin chào ' + Players.active().name + '! Cùng học xem đồng hồ nào!');
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
    click('btn-hint', function () { if (!useHint()) toast(G.hint ? 'Đáp án đã được đánh dấu rồi nhé 💡' : 'Bấm 💡 khi câu hỏi đang hiện nhé!', 1600); });
    click('btn-resume', function () { resumeGame(); });
    click('btn-restart', function () { const l = G.level; if (l) startGame(l); });
    click('btn-pause-lesson', function () { const l = G.level; if (l) showLesson(l, 'play'); });
    click('btn-quit', function () { goMenu(); });
    // Kết quả
    click('btn-quiz', function () { const l = G.level; if (l) startQuiz(l); });
    click('btn-again', function () { const l = G.level; if (l) startGame(l); });
    click('btn-result-lesson', function () { const l = G.level; if (l) showLesson(l, 'play'); });
    click('btn-other-level', function () { goLevels(); });
    click('btn-home', function () { goMenu(); });
    ui.reviewChips.addEventListener('click', function (e) {
      const s = e.target.closest('.review-chip[data-i]');
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
    click('btn-quiz-exit', function () { goLevels(); });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        if (G.state === 'playing') pauseGame();
        if (G.state === 'countdown') clearTimeout(G.cdTimer);   // đếm ngược dừng, chạy lại khi tab hiện trở lại
        Music._halt();                                           // giữ Music.wanted; tránh nhạc giật khi tab ẩn
      } else {
        Sfx.resume();                                            // tiếp tục AudioContext + nhạc nền
        if (G.state === 'countdown' && G.cdCb) runCountdown(G.cdCb);
        if (G.state === 'playing') requestWake();
      }
    });
    window.addEventListener('blur', function () { if (G.state === 'playing') pauseGame(); });
    window.addEventListener('pageshow', function () { Sfx.resume(); });   // iOS: quay lại từ bfcache / sau cuộc gọi
    window.addEventListener('focus', function () { Sfx.resume(); });
  }

  /* ================= LỖI TOÀN CỤC ================= */
  let errShown = 0;
  /** Một lỗi bất ngờ không được làm treo trò chơi: báo nhẹ, đưa về menu nếu đang chơi dở. */
  function onFatal(msg) {
    if (errShown++ > 2) return;             // không lặp thông báo
    try { console.error('[xe-tang]', msg); } catch (e) { /* bỏ qua */ }
    try { toast('Có lỗi nhỏ, con thử lại nhé! 🙏', 2600); } catch (e) { /* bỏ qua */ }
    try { if (inGame()) goMenu(); } catch (e) { /* bỏ qua */ }
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
    let t1 = t0;
    try {
      update(dt);
      t1 = performance.now();
      render();
    } catch (err) { onFatal(err && err.message); return; }   // một khung hình lỗi không làm dừng requestAnimationFrame
    const t2 = performance.now();
    const p = G.perf;
    p.n++; p.update += t1 - t0; p.render += t2 - t1;
    if (p.n >= 60) { p.avgUpdate = p.update / p.n; p.avgRender = p.render / p.n; p.n = 0; p.update = 0; p.render = 0; }
  }

  function boot() {
    window.addEventListener('error', function (e) { onFatal(e && e.message); });
    window.addEventListener('unhandledrejection', function (e) { onFatal(e && e.reason && e.reason.message); });
    Store.load();
    Motion.refresh();
    Voice.init();
    applyAudioSettings();
    renderAudioToggles();
    setTimeout(renderAudioToggles, 1200);
    setTimeout(renderAudioToggles, 3600);
    try { if (Voice.supported) window.speechSynthesis.addEventListener('voiceschanged', renderAudioToggles); } catch (e) { /* bỏ qua */ }
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mq && mq.addEventListener) mq.addEventListener('change', function () { Motion.refresh(); });
    } catch (e) { /* bỏ qua */ }
    // Hồ sơ người chơi: chip trên menu, đổi người → vẽ lại phần hiện tiến trình (không đụng ván đang chơi)
    renderPlayerChip();
    Players.onChange(function () {
      renderPlayerChip();
      renderPlayers();
      if (G.state === 'levels') renderLevels();
      if (overlayOpen('report')) renderReport();
    });
    Music.play('menu');
    resize();
    let rt = 0;
    const onResize = function () { clearTimeout(rt); rt = setTimeout(resize, 80); };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', function () { setTimeout(resize, 250); });   // + resize debounce + kiểm tra mỗi 30 khung hình
    bindInput();
    bindUi();
    setupDeviceHints();
    registerSw();
    // Font "Baloo 2" tải xong sau khi trang đã vẽ → vẽ lại các mặt đồng hồ/bảng cho đúng phông chữ
    try {
      if (document.fonts && document.fonts.load) document.fonts.load('800 32px "Baloo 2"');
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () {
        G.faceCache = {};
        G.robots.forEach(function (r) { r.sprite = null; });
        if (G.state === 'lesson') paintLessonClock(true);
        if (G.q) renderPrompt(false);
        if (G.state === 'quiz') paintQuizClocks();
        if (!ui.review.hidden) paintChipClocks(ui.reviewChips);
      }).catch(function () { /* bỏ qua */ });
    } catch (e) { /* bỏ qua */ }
    showHud(false);
    showScreen('menu');
    if (Store.corrupt) toast('Dữ liệu đã lưu bị lỗi nên được đặt lại 🙏', 3000);
    requestAnimationFrame(function (ts) { lastTs = ts; requestAnimationFrame(frame); });
  }

  // Móc gỡ lỗi (chỉ đọc) để kiểm thử tự động
  window.__XeTang = {
    G: G, Store: Store, Players: Players, Motion: Motion,
    startGame: startGame, showLesson: showLesson, startQuiz: startQuiz, fireAt: fireAt, liveRobots: liveRobots, endGame: endGame, useHint: useHint,
    answerQuiz: answerQuiz, nextQuiz: nextQuiz, goLevels: goLevels, goMenu: goMenu, update: update, render: render, layout: layout,
    openLevel: openLevel, renderLevels: renderLevels, renderReport: renderReport, openReport: openReport, adultGate: adultGate, resetProgress: resetProgress,
    speakable: speakable, answerHint: answerHint, syncHud: syncHud,
    starsFor: starsFor, fallTime: fallTime, boardSize: boardSize, shortPrompt: shortPrompt, gainHeart: gainHeart, buildQuiz: buildQuiz
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
