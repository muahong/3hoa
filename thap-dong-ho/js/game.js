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

  const K = window.Clock, Sfx = window.Sfx, Music = window.Music, Voice = window.Voice, Players = window.Players;
  const rnd = K.rnd, chance = K.chance, pick = K.pick, esc = K.esc;
  const TAU = Math.PI * 2;
  const FONT = '"Baloo 2", "Arial Rounded MT Bold", "Segoe UI", Arial, sans-serif';
  const $ = function (id) { return document.getElementById(id); };
  const clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  const COLS = 4, ROWS = 6;
  const PRAISE = ['Chính xác!', 'Tuyệt vời!', 'Giỏi quá!', 'Đúng rồi!', 'Xuất sắc!', 'Siêu đỉnh!', 'Hay lắm!', 'Đúng giờ!'];
  const HINT_POINTS = 50;        // điểm khi trò chơi TỰ bật gợi ý cột (bé đang sai liên tiếp, cần được đỡ)
  const ASK_HINT_POINTS = 20;    // điểm khi bé chủ động bấm 💡 (xin gợi ý thì "đắt" hơn được giúp)
  const MAX_PARTS = 400;
  const MAX_SPRITES = 64;        // số ảnh viên gạch được lưu sẵn
  const WRONG_PAUSE = 3.0;       // giây dừng lại để học sau khi thả sai
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
  /* Thiết lập thiết bị (sound, music, voice, fx) ở cấp cao nhất; tiến trình của từng bé nằm trong players[<id>].
     Dữ liệu cũ (unlocked/levels ở cấp cao nhất) được di trú sang người chơi mặc định p1. */
  const Store = {
    key: 'thap-dong-ho-v1',
    data: { sound: true, music: true, voice: true, fx: 'full', players: {} },
    /** Tiến trình trống của một người chơi: hình dạng cũ + missed (ôn lại) + stats (báo cáo). */
    blank() {
      return { unlocked: 1, levels: {}, badge: false, missed: {}, stats: { plays: 0, correct: 0, wrong: 0, seconds: 0, byTopic: {}, last: 0 } };
    },
    reviver(k, v) { return (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v; },
    /** Ép về số nguyên trong [lo, hi]; giá trị không hợp lệ (NaN, ∞, chuỗi lạ) → lo. */
    num(v, lo, hi) {
      v = Number(v);
      if (!isFinite(v)) return lo;
      v = Math.floor(v);
      return v < lo ? lo : v > hi ? hi : v;
    },
    load() {
      let d = null;
      try {
        let raw = localStorage.getItem(this.key);
        if (raw && raw.length > 64 * 1024) raw = null;          // dữ liệu rác quá lớn
        if (raw) d = JSON.parse(raw, this.reviver);
      } catch (e) { d = null; }
      if (!d || typeof d !== 'object' || Array.isArray(d)) d = {};
      this.data.sound = d.sound !== false;
      this.data.music = d.music !== false;
      this.data.voice = d.voice !== false;
      this.data.fx = d.fx === 'lite' ? 'lite' : 'full';
      this.data.players = {};
      const src = d.players && typeof d.players === 'object' && !Array.isArray(d.players) ? d.players : null;
      if (src) {
        for (const id in src) {
          if (Object.prototype.hasOwnProperty.call(src, id) && /^[A-Za-z0-9_-]{1,24}$/.test(id)) this.data.players[id] = this.sanitize(src[id]);
        }
      }
      // Di trú dữ liệu cũ (tiến trình ở cấp cao nhất) vào người chơi mặc định p1.
      // Xét theo NỘI DUNG đã đọc được: players rỗng hoặc toàn id sai vẫn phải di trú.
      if (!Object.keys(this.data.players).length && (d.levels != null || d.unlocked != null)) {
        this.data.players.p1 = this.sanitize({ unlocked: d.unlocked, levels: d.levels });
        this.save();
      }
    },
    /** Ép mọi giá trị đọc từ máy về đúng kiểu và khoảng hợp lệ – không tin bất cứ thứ gì. */
    sanitize(b) {
      const out = this.blank();
      const num = this.num;
      if (!b || typeof b !== 'object' || Array.isArray(b)) return out;
      out.unlocked = num(b.unlocked, 1, K.LEVELS.length);
      out.badge = b.badge === true;
      if (b.levels && typeof b.levels === 'object' && !Array.isArray(b.levels)) {
        K.LEVELS.forEach(function (l) {
          const r = b.levels[l.id];
          if (!r || typeof r !== 'object' || Array.isArray(r)) return;
          out.levels[l.id] = { best: num(r.best, 0, 9999999), stars: num(r.stars, 0, 3), done: num(r.done, 0, 1000000), fails: num(r.fails, 0, 1000000) };
        });
      }
      if (b.missed && typeof b.missed === 'object' && !Array.isArray(b.missed)) {
        const m = b.missed;
        const keys = Object.keys(m).filter(function (k) { return k.length <= 80 && m[k] && typeof m[k] === 'object'; });
        keys.sort(function (x, y) { return (Number(m[y].last) || 0) - (Number(m[x].last) || 0); });
        keys.slice(0, 60).forEach(function (k) {
          const e = m[k], info = e.info;
          if (!info || typeof info !== 'object') return;
          if (info.style !== 'plain' && info.style !== 'kem' && info.style !== '24') return;
          out.missed[k] = {
            n: num(e.n, 0, 1000000), ok: num(e.ok, 0, 1000000), last: num(e.last, 0, 9e15),
            info: { h: num(info.h, 1, 12), m: num(info.m, 0, 59), style: info.style, h24: info.h24 == null ? null : num(info.h24, 0, 23), lv: num(info.lv, 1, K.LEVELS.length) }
          };
        });
      }
      const st = b.stats && typeof b.stats === 'object' && !Array.isArray(b.stats) ? b.stats : {};
      const S = out.stats;
      S.plays = num(st.plays, 0, 1e9); S.correct = num(st.correct, 0, 1e9); S.wrong = num(st.wrong, 0, 1e9);
      S.seconds = num(st.seconds, 0, 1e9); S.last = num(st.last, 0, 9e15);
      if (st.byTopic && typeof st.byTopic === 'object' && !Array.isArray(st.byTopic)) {
        Object.keys(st.byTopic).slice(0, 40).forEach(function (k) {
          const t = st.byTopic[k];
          if (!t || typeof t !== 'object' || k.length > 40) return;
          S.byTopic[k] = { c: num(t.c, 0, 1e9), w: num(t.w, 0, 1e9), t: num(t.t, 0, 1e9), plays: num(t.plays, 0, 1e9), cleared: num(t.cleared, 0, 1e9) };
        });
      }
      return out;
    },
    save() {
      try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* bỏ qua */ }
    },
    activeId() { return Players ? Players.active().id : 'p1'; },
    /** Tiến trình của người chơi đang hoạt động (tạo mới nếu chưa có). */
    p() {
      const id = this.activeId();
      if (!this.data.players[id]) this.data.players[id] = this.blank();
      return this.data.players[id];
    },
    rec(id) { return this.p().levels[id] || { best: 0, stars: 0, done: 0, fails: 0 }; },
    setRec(id, rec) { this.p().levels[id] = Object.assign(this.rec(id), rec); this.save(); },
    isUnlocked(n) { return n <= this.p().unlocked; },
    unlock(n) {
      n = clamp(n, 1, K.LEVELS.length);
      const b = this.p();
      if (n > b.unlocked) { b.unlocked = n; this.save(); return true; }
      return false;
    },
    /* ---- Ôn lại thông minh: những đồng hồ bé đọc nhầm ---- */
    noteMissed(key, info) {
      const m = this.p().missed;
      key = String(key).slice(0, 80);
      const e = m[key] || { n: 0, ok: 0, last: 0, info: null };
      e.n++; e.ok = 0; e.last = Date.now(); e.info = info || e.info;
      m[key] = e;
      const keys = Object.keys(m);
      if (keys.length > 60) { keys.sort(function (a, b) { return m[a].last - m[b].last; }); delete m[keys[0]]; }
      this.save();
    },
    noteOk(key) {
      const m = this.p().missed;
      key = String(key).slice(0, 80);
      const e = m[key];
      if (!e) return;
      e.ok++;
      if (e.ok >= 2) delete m[key];
      this.save();
    },
    reviewPool(filterFn) {
      const m = this.p().missed;
      return Object.keys(m)
        .filter(function (k) { return !filterFn || filterFn(m[k].info, k); })
        .sort(function (a, b) { return m[b].n - m[a].n || m[b].last - m[a].last; })
        .map(function (k) { return { key: k, info: m[k].info, n: m[k].n }; });
    },
    /* ---- Thống kê cho báo cáo phụ huynh: round = { topic, correct, wrong, timeouts, seconds, cleared } ---- */
    addStats(round) {
      const s = this.p().stats;
      s.plays++;
      s.correct += round.correct || 0; s.wrong += round.wrong || 0;
      s.seconds += Math.round(round.seconds || 0); s.last = Date.now();
      if (round.topic) {
        const t = s.byTopic[round.topic] || { c: 0, w: 0, t: 0, plays: 0, cleared: 0 };
        t.c += round.correct || 0; t.w += round.wrong || 0; t.t += round.timeouts || 0; t.plays++;
        if (round.cleared) t.cleared++;
        s.byTopic[round.topic] = t;
      }
      this.save();
    },
    resetActive() { this.data.players[this.activeId()] = this.blank(); this.save(); }
  };

  /* ================= TRẠNG THÁI ================= */
  const G = {
    W: 0, H: 0, dpr: 1, landscape: true,
    state: 'menu',          // menu | players | report | levels | lesson | countdown | playing | paused | clear | fail | summary | quiz
    level: null,
    anim: 0,                // đồng hồ hoạt hình (luôn chạy)
    time: 0,                // đồng hồ ván chơi (chỉ chạy khi playing)
    board: { x: 0, y: 0, w: 0, h: 0, cell: 80, plateH: 70, top: 0 },
    big: { x: 0, y: 0, r: 80, cardW: 200, cardH: 200, titleH: 30 },
    lastPiece: null,        // đồng hồ vừa thả (hiện ở đồng hồ lớn cho tới lượt sau)
    cols: [],               // { t, prevT, flip, glow, hint, stack: [ { t, id, cracks, popAt, dead } ] }
    piece: null,            // { t, col, x, row, land, target, born, mode: fall|hard|pop, pop, hint, touched, review, id }
    parts: [], texts: [], clouds: [], deco: [], bg: null, staticLayer: null, sprites: {}, spriteN: 0, shake: 0, flash: null,
    owl: null, owlSprites: {}, owlMood: 'idle', owlUntil: 0,   // 🦉 bạn cú ngồi cạnh tháp
    score: 0, streak: 0, bestStreak: 0, correct: 0, wrong: 0, timeouts: 0, wrongRun: 0, review: [],
    slow: false,            // 🐢 chơi chậm hơn: đồng hồ rơi lâu hơn 40 %, gợi ý sớm hơn
    slowFor: null,          // id màn đang ở chế độ chậm (thử lại/xem lại bài học vẫn giữ chế độ này)
    retryT: null,           // đồng hồ vừa đọc nhầm – hỏi lại ngay ở lượt kế tiếp
    reviewPool: [], reviewUsed: 0, reviewMax: 0,   // ôn lại thông minh (~25% số câu của màn)
    nextPieceAt: 0, lastTarget: -1, idSeq: 0, clearAt: -1, failAt: -1, endReason: '', dangerT: 0,
    hud: { score: -1, correct: -1, combo: null, speed: -1, review: null, pause: null },
    cdTimer: 0, wakeLock: null, softDrop: false, drag: null, decoT: 0,
    demo: { i: 0, next: 0, svg: null, list: [] }, lessonFromPause: false,
    quiz: null, resultSaved: false, greeted: false, reportFrom: 'levels', celebrateBadge: false,
    perf: { n: 0, update: 0, render: 0, frame: 0, avgUpdate: 0, avgRender: 0, avgFrame: 0 }
  };

  /* ================= ÍT HIỆU ỨNG ================= */
  /* Tôn trọng prefers-reduced-motion và thiết lập "✨ Hiệu ứng: Ít": ít hạt hơn, không rung màn hình, không chớp sáng. */
  const Motion = {
    lite: false,
    refresh() {
      let pref = false;
      try { pref = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { /* bỏ qua */ }
      this.lite = pref || Store.data.fx === 'lite';
      try { document.documentElement.classList.toggle('lite-fx', this.lite); } catch (e) { /* bỏ qua */ }
    },
    parts(n) { return this.lite ? Math.max(1, Math.round(n * 0.3)) : n; }
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
    failLevel: $('fail-level'), failReview: $('review-fail'), failReviewList: $('review-fail-list'), failInfo: $('fail-info'), failSlow: $('btn-fail-slow'),
    quizHead: $('quiz-head'), quizDots: $('quiz-dots'), quizBody: $('quiz-body'), quizQ: $('quiz-q'), quizClock: $('quiz-clock'), quizChoices: $('quiz-choices'),
    quizFeedback: $('quiz-feedback'), quizExplain: $('quiz-explain'), quizNext: $('btn-quiz-next'), quizRetry: $('btn-quiz-retry'),
    quizDone: $('quiz-done'), quizDoneTitle: $('quiz-done-title'), quizDoneText: $('quiz-done-text'), quizNextLevel: $('btn-quiz-next-level'),
    ipadTip: $('ipad-tip'), fx: $('fx'), quizLegend: $('quiz-legend'),
    hudSpeed: $('hud-speed'), hudReview: $('hud-review'), btnPause: $('btn-pause'),
    players: $('players'), report: $('report'), parentGate: $('parent-gate'),
    playerChip: $('btn-player'), playerList: $('player-list'), playerForm: $('player-form'), playerName: $('player-name'), playerAvatars: $('player-avatars'),
    reportTitle: $('report-title'), reportStats: $('report-stats'), reportLevels: $('report-levels'), reportReview: $('report-review'),
    gateQ: $('parent-gate-q'), gateInput: $('parent-gate-input'), gateForm: $('parent-gate-form')
  };
  const SCREENS = ['menu', 'players', 'report', 'levels', 'lesson', 'countdown', 'pause', 'summary', 'fail', 'quiz'];

  function showScreen(name) {
    SCREENS.forEach(function (k) { if (ui[k]) ui[k].classList.toggle('hidden', k !== name); });
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
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (G.bg && w === G.W && h === G.H && dpr === G.dpr) return;   // không đổi gì: không dựng lại nền (9 ms, 15 MB ở dpr 2)
    G.dpr = dpr;
    G.W = w; G.H = h;
    canvas.width = Math.round(w * G.dpr);
    canvas.height = Math.round(h * G.dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    G.sprites = {}; G.spriteN = 0;
    buildBackground();
    initClouds();
    layout();
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
    syncLevelChip();   // nhãn màn dài/ngắn theo bề rộng: phải xong TRƯỚC khi đo chiều cao hàng HUD
    const sab = ui.safeProbe ? ui.safeProbe.offsetHeight : 0;
    let hudH = 60;
    // Đo HUD khi ẩn chip gợi ý (chip nằm tuyệt đối bên dưới thanh tiến độ) và chừa chỗ cho nó
    const hintWas = ui.hint.hidden;
    ui.hint.hidden = true;
    try { hudH = Math.max(52, ui.hudTop.getBoundingClientRect().bottom + 6); } catch (e) { /* bỏ qua */ }
    ui.hint.hidden = hintWas;
    // Chừa chỗ cho chip gợi ý: lời giải thích dài nhất xuống 2 dòng trên máy tính bảng và 3 dòng trên
    // điện thoại, nên phải chừa đủ cả trường hợp xấu nhất thì chip mới không đè lên tiêu đề đồng hồ lớn.
    // Màn hình quá thấp (điện thoại nằm ngang) thì KHÔNG chừa – chip nằm đè lên nền trời, còn hơn là
    // đẩy hàng đĩa đáp án xuống dưới mép màn hình.
    if (H >= 460) hudH += 70;
    const pad = 10;
    const landscape = W > H * 1.05;
    G.landscape = landscape;
    // Điện thoại dựng đứng: cụm ◀ ⬇ ▶ chiếm gần 80 px chiều cao mà chạm thẳng vào cột đã làm được cả hai việc.
    // Thu gọn còn mỗi phím 💡 đặt bên lề trái → ô bảng to hơn ~25 %, chữ trên đĩa đáp án đọc được.
    const narrow = !landscape && W < 480;
    G.narrow = narrow;
    ui.controls.classList.toggle('compact', narrow);
    const B = G.board, Big = G.big;
    const ring = !!(G.level && G.level.ring);
    const cardK = ring ? (narrow ? 2.6 : 2.95) : (narrow ? 2.4 : 2.5);   // thẻ đồng hồ lớn rộng hơn khi có vòng số phút
    const bigGeom = function (r) {
      Big.r = r;
      Big.titleH = clamp(r * 0.22, 14, 26) + 10;
      Big.cardW = r * cardK;
      Big.cardH = r * cardK;
    };
    const plateK = function (cell) { return cell < 70 ? 1.05 : 0.9; };
    // Cụm nút phải đủ rộng để phím hẹp nhất (💡 = 0,9 phần trên tổng 1 + 1,4 + 1 + 0,9 = 4,3 phần)
    // vẫn ≥ 44 px như yêu cầu vùng chạm. #controls: viền 2 px mỗi bên, đệm và khe 8 px (6 px dưới 700 px).
    const kgap = W <= 700 ? 6 : 8;
    const cwMin = Math.min(Math.ceil(44 / 0.9 * 4.3 + kgap * 5 + 4), W - 8);
    if (landscape) {
      const panelW = clamp(W * 0.34, 230, 420);
      const availH = H - hudH - pad - sab - 8;
      const availW = W - panelW - pad * 3;
      const cell = clamp(Math.min(availH / (ROWS + 1.0 + 1.05), availW / COLS), 34, 150);
      B.cell = cell; B.w = cell * COLS; B.h = cell * ROWS; B.plateH = cell * plateK(cell);
      B.x = Math.round((W - panelW - B.w) / 2);
      B.y = Math.round(hudH + pad + cell);
      // Hàng đĩa đáp án luôn phải nằm trên mép dưới (điện thoại nằm ngang: ô đã chạm mức nhỏ nhất)
      const bottom = H - sab - 4;
      if (B.y + B.h + B.plateH > bottom) B.y = Math.round(Math.max(hudH + 4, bottom - B.h - B.plateH));
      bigGeom(clamp(Math.min(panelW / (cardK + 0.15), availH * 0.24), 48, 160));
      Big.x = Math.round(W - panelW / 2 - pad);
      Big.y = Math.round(hudH + pad + Big.titleH + Big.cardH / 2);
      const cw = Math.max(Math.min(panelW - 24, 320), cwMin);
      setControls(Big.x - cw / 2, Big.y + Big.cardH / 2 + 14, cw);
    } else {
      const ctlH = narrow ? 0 : 78;                  // 💡 gọn nằm bên lề, không lấy chiều cao của bảng
      const availH = H - hudH - ctlH - pad * 3 - sab;
      bigGeom(clamp(availH * (narrow ? 0.1 : 0.12), 40, 110));
      const bigArea = Big.titleH + Big.cardH + 12;
      const cell = clamp(Math.min((availH - bigArea) / (ROWS + 1.0 + 1.05), (W - pad * 2) / COLS), 30, 150);
      B.cell = cell; B.w = cell * COLS; B.h = cell * ROWS; B.plateH = cell * plateK(cell);
      Big.x = Math.round(W / 2);
      Big.y = Math.round(hudH + pad + Big.titleH + Big.cardH / 2);
      B.x = Math.round((W - B.w) / 2);
      B.y = Math.round(Big.y + Big.cardH / 2 + 12 + cell);
      // Đĩa đáp án phải ở trên cụm nút, cụm nút phải ở trên mép dưới
      const bottom = H - sab - ctlH - 6;
      if (B.y + B.h + B.plateH > bottom) B.y = Math.round(Math.max(Big.y + Big.cardH / 2 + 8, bottom - B.h - B.plateH));
      if (narrow) {
        const cw = Math.max(52, Math.min(64, B.x - 8));          // vừa khít lề trái, vẫn ≥ 44 px vùng chạm
        setControls(Math.max(2, (B.x - cw) / 2), B.y + B.h * 0.55, cw);
      } else {
        const cw = Math.max(Math.min(W - 20, 380), cwMin);
        setControls((W - cw) / 2, B.y + B.h + B.plateH + 12, cw);
      }
    }
    B.top = B.y - B.cell;
    // 🦉 Bạn cú ngồi trong khoảng trống bên phải tháp (không bao giờ đè lên bảng, thẻ đồng hồ hay cụm nút)
    const owlSpace = (landscape ? Big.x - Big.cardW / 2 : W) - (B.x + B.w);
    const os = Math.min(owlSpace - 14, B.cell * 1.15, 120);
    G.owl = os >= 34 ? { s: os, x: B.x + B.w + (owlSpace - os) / 2, y: B.y + B.h + B.plateH - os * 1.15 } : null;
    if (G.piece) G.piece.x = B.x + G.piece.col * B.cell;
    // Kích thước ô đổi → ảnh gạch, cỡ chữ cột và lớp tĩnh (khung bảng, thẻ đồng hồ lớn) phải dựng lại
    G.sprites = {}; G.spriteN = 0;
    G.owlSprites = {};
    Big.titleSize = {};
    if (G.level && G.cols.length) { layoutPlates(); buildStaticLayer(); } else G.staticLayer = null;
  }

  function layer(fn) {
    const c = document.createElement('canvas');
    c.width = canvas.width; c.height = canvas.height;
    const cx = c.getContext('2d');
    cx.scale(G.dpr, G.dpr);
    fn(cx);
    return c;
  }

  /** Lớp tĩnh vẽ một lần mỗi lần bố cục: khung bảng có bóng đổ, lưới và thẻ đồng hồ lớn (đỡ 3 lần shadowBlur mỗi khung hình). */
  function buildStaticLayer() {
    G.staticLayer = layer(function (c) {
      const B = G.board, Big = G.big;
      const pad = 8;
      const frameY = B.top - pad, frameH = (B.y - B.top) + B.h + B.plateH + pad * 2;
      c.save();
      c.shadowColor = 'rgba(0,20,60,0.3)';
      c.shadowBlur = 24;
      c.shadowOffsetY = 8;
      roundRect(c, B.x - pad, frameY, B.w + pad * 2, frameH, 20);
      c.fillStyle = 'rgba(20,35,80,0.62)';
      c.fill();
      c.restore();
      roundRect(c, B.x - pad, frameY, B.w + pad * 2, frameH, 20);
      c.strokeStyle = 'rgba(255,255,255,0.45)';
      c.lineWidth = 3;
      c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.13)';
      c.lineWidth = 1;
      for (let i = 1; i < COLS; i++) {
        c.beginPath(); c.moveTo(B.x + i * B.cell, B.y); c.lineTo(B.x + i * B.cell, B.y + B.h); c.stroke();
      }
      for (let j = 1; j < ROWS; j++) {
        c.beginPath(); c.moveTo(B.x, B.y + j * B.cell); c.lineTo(B.x + B.w, B.y + j * B.cell); c.stroke();
      }
      // Thẻ đồng hồ lớn
      const r = Big.r, bw = Big.cardW, bh = Big.cardH;
      c.save();
      c.shadowColor = 'rgba(0,20,60,0.25)';
      c.shadowBlur = 20; c.shadowOffsetY = 6;
      roundRect(c, Big.x - bw / 2, Big.y - bh / 2, bw, bh, r * 0.3);
      c.fillStyle = 'rgba(255,255,255,0.9)';
      c.fill();
      c.restore();
    });
  }

  function seededRand(seed) {
    let s = (seed >>> 0) || 1;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    roundRectPath(c, x, y, w, h, r);
  }
  /** Thêm một hình chữ nhật bo góc vào đường đang vẽ (không mở đường mới) – dùng khi cần nhiều hình trong một đường. */
  function roundRectPath(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
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
  const badgeW = {};          // bề rộng nhãn buổi đã đo, theo (buổi, bán kính)
  let badgeN = 0;
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
    // Mặt đồng hồ nhỏ (viên gạch trên bảng): chữ số dưới 22 px không đọc nổi – thay bằng vạch 12/3/6/9 đậm hơn
    const nums = r >= 22;
    c.lineCap = 'round';
    for (let i = 0; i < 60; i++) {
      const big = i % 5 === 0;
      if (!big && !showSmall) continue;
      const quarter = i % 15 === 0;
      const a = i * 6 * Math.PI / 180;
      const r1 = big ? (!nums && quarter ? r * 0.74 : r * 0.82) : r * 0.88, r2 = r * 0.95;
      c.strokeStyle = big ? ink : (o.gray ? '#a5a9bb' : '#9aa0b8');
      c.lineWidth = big ? Math.max(1.2, r * (!nums && quarter ? 0.09 : 0.045)) : Math.max(0.8, r * 0.02);
      c.beginPath();
      c.moveTo(Math.sin(a) * r1, -Math.cos(a) * r1);
      c.lineTo(Math.sin(a) * r2, -Math.cos(a) * r2);
      c.stroke();
    }
    if (nums) {
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
      // Vòng số phút neo ra NGOÀI viền để chữ "kém 5…25" không chạm mặt đồng hồ (từng bị đọc nhầm thành "kém 1")
      c.textBaseline = 'middle';
      const size = Math.max(11, r * 0.13);
      c.font = '800 ' + Math.round(size) + 'px ' + FONT;
      for (let n = 1; n <= 12; n++) {
        const a = n * 30 * Math.PI / 180;
        let label = String(n * 5), color = '#d84f1d', align = 'center', rad = r * 1.17;
        if (o.ring === 'kem') {
          if (n >= 7 && n <= 11) { label = 'kém ' + (60 - n * 5); color = '#5a3f85'; align = 'right'; rad = r * 1.06; }
          else if (n >= 1 && n <= 5) { align = 'left'; rad = r * 1.06; }
          else { rad = r * 1.2; if (n === 12) label = '60'; }
        }
        const lx = Math.sin(a) * rad, ly = -Math.cos(a) * rad;
        c.textAlign = align;
        if (o.ring === 'kem' && n >= 7 && n <= 11) {
          const tw = c.measureText(label).width;
          c.fillStyle = 'rgba(255,255,255,0.85)';
          roundRect(c, lx - tw - size * 0.3, ly - size * 0.62, tw + size * 0.6, size * 1.24, size * 0.6);
          c.fill();
        }
        c.fillStyle = color;
        c.fillText(label, lx, ly);
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
    // Buổi trong ngày: vẽ DƯỚI mặt đồng hồ để không che kim giờ (lúc 5–7 giờ)
    if (t.period && o.badge) {
      const label = K.PERIOD_ICON[t.period] + ' ' + t.period;
      const fs = Math.max(10, r * 0.16);
      c.font = '800 ' + Math.round(fs) + 'px ' + FONT;
      const bk = t.period + '|' + Math.round(r);
      if (badgeW[bk] == null) { if (badgeN++ > 64) { for (const k in badgeW) delete badgeW[k]; badgeN = 0; } badgeW[bk] = c.measureText(label).width + fs * 1.2; }
      const tw = badgeW[bk];
      roundRect(c, -tw / 2, r * 1.02, tw, fs * 1.5, fs * 0.75);
      c.fillStyle = '#fff4d6'; c.fill();
      c.strokeStyle = '#e0a800'; c.lineWidth = Math.max(1, r * 0.02); c.stroke();
      c.fillStyle = '#8a5a00';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(label, 0, r * 1.02 + fs * 0.78);
    }
    c.restore();
  }

  /** Vẽ nội dung một viên gạch (không kể vết nứt) – dùng trực tiếp hoặc để tạo ảnh lưu sẵn. */
  function paintTile(c, x, y, s, t, rubble) {
    const rad = s * 0.2;
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
    drawClockFace(c, x + s / 2, y + s / 2, s * 0.38, t, { gray: rubble, mini: rubble || s < 70 });
    if (t.period) {
      c.font = Math.round(s * 0.2) + 'px ' + FONT;
      c.textAlign = 'right'; c.textBaseline = 'top';
      c.fillStyle = '#2b2d42';
      c.fillText(K.PERIOD_ICON[t.period], x + s - s * 0.06, y + s * 0.05);
    }
  }

  /** Ảnh viên gạch lưu sẵn theo (loại, mốc giờ, cỡ) – mỗi viên đá không còn vẽ lại 60 vạch + gradient mỗi khung hình. */
  function tileSprite(t, kind, s) {
    const rubble = kind === 'rubble';
    const key = kind + '|' + K.key(t, '24') + '|' + (t.period || '') + '|' + Math.round(s);
    let spr = G.sprites[key];
    if (spr) return spr;
    if (G.spriteN >= MAX_SPRITES) { G.sprites = {}; G.spriteN = 0; }
    const m = 4, dpr = G.dpr || 1;
    spr = document.createElement('canvas');
    spr.width = Math.ceil((s + m * 2) * dpr); spr.height = spr.width;
    const c = spr.getContext('2d');
    c.scale(dpr, dpr);
    paintTile(c, m, m, s, t, rubble);
    spr.margin = m;
    G.sprites[key] = spr; G.spriteN++;
    return spr;
  }

  /** Vẽ một viên gạch đồng hồ (kích thước s) – kind: piece | ghost | rubble */
  function drawTile(c, x, y, s, t, kind, extra) {
    const rad = s * 0.2;
    c.save();
    if (kind === 'ghost') {
      if (extra && extra.tint) c.strokeStyle = extra.tint;
      c.setLineDash([s * 0.12, s * 0.08]);
      c.lineWidth = Math.max(2, s * 0.04);
      c.strokeStyle = extra && extra.tint ? extra.tint : 'rgba(255,255,255,0.75)';
      roundRect(c, x, y, s, s, rad);
      c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.12)';
      c.fill();
      c.restore();
      return;
    }
    const rubble = kind === 'rubble';
    if (extra && extra.direct) paintTile(c, x, y, s, t, rubble);
    else {
      const spr = tileSprite(t, kind, s);
      c.drawImage(spr, x - spr.margin, y - spr.margin, s + spr.margin * 2, s + spr.margin * 2);
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

  /* ================= CÚ MÈO CỔ VŨ ================= */
  /* Bạn cú ngồi cạnh tháp: reo mừng khi bé thả đúng, che mắt khi thả sai, ngủ khi tạm dừng.
     Vẽ sẵn ra ảnh theo (trạng thái, cỡ) nên mỗi khung hình chỉ tốn một lệnh drawImage. */
  function paintOwl(c, s, state) {
    const cx = s / 2, by = s * 1.15;
    const cheer = state === 'cheer', worry = state === 'worry', sleep = state === 'sleep';
    c.lineCap = 'round'; c.lineJoin = 'round';
    // Chân
    c.strokeStyle = '#e08a2e'; c.lineWidth = Math.max(2, s * 0.05);
    c.beginPath(); c.moveTo(cx - s * 0.15, by - s * 0.13); c.lineTo(cx - s * 0.15, by - s * 0.02);
    c.moveTo(cx + s * 0.15, by - s * 0.13); c.lineTo(cx + s * 0.15, by - s * 0.02); c.stroke();
    // Thân và chỏm tai
    c.fillStyle = '#a9743f';
    c.beginPath(); c.ellipse(cx, by - s * 0.46, s * 0.42, s * 0.48, 0, 0, TAU); c.fill();
    c.beginPath();
    c.moveTo(cx - s * 0.36, by - s * 0.78); c.lineTo(cx - s * 0.22, by - s * 1.04); c.lineTo(cx - s * 0.06, by - s * 0.84); c.closePath();
    c.moveTo(cx + s * 0.36, by - s * 0.78); c.lineTo(cx + s * 0.22, by - s * 1.04); c.lineTo(cx + s * 0.06, by - s * 0.84); c.closePath();
    c.fill();
    // Bụng
    c.fillStyle = '#f5e2c0';
    c.beginPath(); c.ellipse(cx, by - s * 0.3, s * 0.25, s * 0.28, 0, 0, TAU); c.fill();
    const ey = by - s * 0.62, er = s * 0.15, ex = s * 0.17;
    if (worry) {
      // Hai cánh che mắt
      c.fillStyle = '#8c5c2c';
      c.beginPath(); c.ellipse(cx - ex, ey, er * 1.25, er * 0.95, -0.3, 0, TAU); c.fill();
      c.beginPath(); c.ellipse(cx + ex, ey, er * 1.25, er * 0.95, 0.3, 0, TAU); c.fill();
    } else if (cheer || sleep) {
      // Mắt cong: cười (^ ^) hoặc nhắm ngủ (‿ ‿)
      c.strokeStyle = '#2b2d42'; c.lineWidth = Math.max(2, s * 0.045);
      c.beginPath();
      c.arc(cx - ex, ey + (cheer ? er * 0.4 : -er * 0.2), er * 0.8, cheer ? Math.PI : 0, cheer ? TAU : Math.PI);
      c.stroke();
      c.beginPath();
      c.arc(cx + ex, ey + (cheer ? er * 0.4 : -er * 0.2), er * 0.8, cheer ? Math.PI : 0, cheer ? TAU : Math.PI);
      c.stroke();
    } else {
      c.fillStyle = '#ffffff';
      c.beginPath(); c.arc(cx - ex, ey, er, 0, TAU); c.arc(cx + ex, ey, er, 0, TAU); c.fill();
      c.fillStyle = '#2b2d42';
      c.beginPath(); c.arc(cx - ex + s * 0.02, ey, er * 0.5, 0, TAU); c.arc(cx + ex + s * 0.02, ey, er * 0.5, 0, TAU); c.fill();
    }
    // Mỏ
    c.fillStyle = '#ffb703';
    c.beginPath();
    c.moveTo(cx, by - s * 0.5); c.lineTo(cx - s * 0.07, by - s * 0.42); c.lineTo(cx + s * 0.07, by - s * 0.42);
    c.closePath(); c.fill();
    // Cánh hai bên (giơ lên khi reo mừng)
    if (!worry) {
      c.fillStyle = '#8c5c2c';
      const wy = cheer ? by - s * 0.72 : by - s * 0.42;
      c.save(); c.translate(cx - s * 0.38, wy); c.rotate(cheer ? -0.9 : -0.15);
      c.beginPath(); c.ellipse(0, 0, s * 0.1, s * 0.24, 0, 0, TAU); c.fill(); c.restore();
      c.save(); c.translate(cx + s * 0.38, wy); c.rotate(cheer ? 0.9 : 0.15);
      c.beginPath(); c.ellipse(0, 0, s * 0.1, s * 0.24, 0, 0, TAU); c.fill(); c.restore();
    }
    if (sleep) {
      c.fillStyle = '#2b2d42';
      c.font = '800 ' + Math.round(s * 0.2) + 'px ' + FONT;
      c.textAlign = 'left'; c.textBaseline = 'alphabetic';
      c.fillText('z', cx + s * 0.34, by - s * 0.94);
      c.font = '800 ' + Math.round(s * 0.14) + 'px ' + FONT;
      c.fillText('z', cx + s * 0.24, by - s * 1.06);
    }
  }

  function owlSprite(state, s) {
    const key = state + '|' + Math.round(s);
    let spr = G.owlSprites[key];
    if (spr) return spr;
    const dpr = G.dpr || 1;
    spr = document.createElement('canvas');
    spr.width = Math.max(1, Math.ceil(s * dpr));
    spr.height = Math.max(1, Math.ceil(s * 1.15 * dpr));
    const c = spr.getContext('2d');
    c.scale(dpr, dpr);
    paintOwl(c, s, state);
    G.owlSprites[key] = spr;
    return spr;
  }

  /** Trạng thái hiện tại của bạn cú (hết hạn thì về "nhìn tháp"). */
  function owlState() {
    if (G.state === 'paused') return 'sleep';
    if (G.owlUntil > G.anim) return G.owlMood;
    return 'idle';
  }
  function owlSay(mood, secs) { G.owlMood = mood; G.owlUntil = G.anim + secs; }

  function drawOwl(c) {
    const o = G.owl;
    if (!o) return;
    const s = o.s;
    const state = owlState();
    const spr = owlSprite(state, s);
    const t = G.anim;
    const bob = Motion.lite ? 0 : (state === 'cheer' ? Math.abs(Math.sin(t * 9)) * s * 0.14 : Math.sin(t * 1.6) * s * 0.03);
    c.drawImage(spr, o.x, o.y - bob, s, s * 1.15);
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
  /** Chữ bay lên. o.wait: chờ mấy giây rồi mới hiện (để hai lời khen không đè lên nhau). */
  function addText(text, x, y, o) {
    const t = { text: text, x: x, y: y, vy: -55, life: 1.1, max: 1.1, size: G.board.cell * 0.4, color: '#fff', stroke: 'rgba(10,15,40,0.9)', t: 0, wait: 0 };
    if (o) for (const k in o) t[k] = o[k];
    t.max = t.life;
    G.texts.push(t);
  }
  function addPart(p) {
    if (G.parts.length >= MAX_PARTS) G.parts.shift();
    G.parts.push(p);
  }
  function spawnSparkle(x, y, r, big) {
    const n = Motion.parts(big ? 40 : 22);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, sp = (big ? 200 : 130) + Math.random() * (big ? 400 : 260);
      addPart({ kind: 'spark', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size: r * (0.05 + Math.random() * 0.08),
        color: pick(['#ffd166', '#ff9f1c', '#ffffff', '#ffe66d', '#7bf1a8', '#9af0ff']), life: 0.4 + Math.random() * 0.5, max: 0.9 });
    }
    for (let i = 0, ns = Motion.parts(6); i < ns; i++) {
      const a = Math.random() * TAU, sp = 60 + Math.random() * 120;
      addPart({ kind: 'star', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, size: r * (0.18 + Math.random() * 0.14), color: '#ffd166', rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 6, life: 0.6 + Math.random() * 0.4, max: 1.0 });
    }
  }
  function spawnDust(x, y, r) {
    for (let i = 0, np = Motion.parts(12); i < np; i++) {
      const a = Math.random() * TAU, sp = 30 + Math.random() * 90;
      addPart({ kind: 'puff', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20, size: r * (0.2 + Math.random() * 0.25), grow: r * 0.8,
        color: pick(['#a3a7b8', '#c4c8d6', '#8b90a3']), life: 0.45 + Math.random() * 0.35, max: 0.8 });
    }
    for (let i = 0, nr = Motion.parts(6); i < nr; i++) {
      const a = Math.random() * TAU, sp = 80 + Math.random() * 160;
      addPart({ kind: 'rock', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, size: r * (0.1 + Math.random() * 0.12), rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 10, color: '#7d8196', life: 0.6 + Math.random() * 0.5, max: 1.1 });
    }
  }
  function spawnConfetti(n) {
    const cols = ['#ff6b35', '#ffd166', '#06d6a0', '#118ab2', '#ef476f', '#7b5ea7', '#2ec4b6'];
    n = Motion.lite ? Math.min(n, 20) : n;
    for (let i = 0; i < n; i++) {
      addPart({ kind: 'confetti', x: Math.random() * G.W, y: -20 - Math.random() * G.H * 0.5, vx: (Math.random() - 0.5) * 80, vy: 80 + Math.random() * 160,
        size: 6 + Math.random() * 8, color: pick(cols), rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 8, life: 4 + Math.random() * 2, max: 6, sway: Math.random() * TAU });
    }
  }

  /** Pháo giấy bằng DOM: nằm TRÊN lớp phủ mờ của bảng kết quả / hỏi đáp (hạt vẽ trên canvas bị lớp phủ làm nhạt đi). */
  const FX_COLORS = ['#ff6b35', '#ffd166', '#06d6a0', '#118ab2', '#ef476f', '#7b5ea7', '#2ec4b6'];
  function domConfetti(n) {
    const layer = ui.fx;
    if (!layer || Motion.lite || !n) return;
    n = Math.min(n, 40);
    clearTimeout(domConfetti._t);
    let html = '';
    for (let i = 0; i < n; i++) {
      const x = Math.round(Math.random() * 100), d = (Math.random() * 0.9).toFixed(2), r = Math.round(Math.random() * 360);
      const dur = (2.2 + Math.random() * 1.4).toFixed(2), w = 6 + Math.round(Math.random() * 6);
      html += '<i style="left:' + x + '%;background:' + pick(FX_COLORS) + ';width:' + w + 'px;height:' + Math.round(w * 0.55) +
        'px;animation-delay:' + d + 's;animation-duration:' + dur + 's;transform:rotate(' + r + 'deg)"></i>';
    }
    layer.innerHTML = html;
    domConfetti._t = setTimeout(function () { layer.innerHTML = ''; }, 4600);
  }

  /* ================= CỘT & NHÃN GIỜ ================= */
  function stackH(col) {
    const c = G.cols[col];
    if (!c) return 0;
    let n = 0;
    for (let j = 0; j < c.stack.length; j++) if (!c.stack[j].dead) n++;
    return n;
  }
  function anyRubble() { return G.cols.some(function (c) { return c.stack.some(function (r) { return !r.dead; }); }); }

  /* ---- Ôn lại thông minh: khóa/thông tin lưu của một mốc giờ và kho ôn lại phù hợp với màn ---- */
  function reviewKey(t) { return K.key(t, '24') + '|' + t.style; }
  function reviewInfo(t) { return { h: t.h, m: t.m, style: t.style, h24: t.h24 == null ? null : t.h24, lv: t.lv || 1 }; }

  /** Những đồng hồ bé từng đọc nhầm mà màn này được phép hỏi (đúng kiểu đọc, không vượt quá bài đã học). */
  function buildReviewPool(level) {
    return Store.reviewPool(function (info) {
      if (!info || info.lv > level.n) return false;
      if (level.style === 'kem' && info.style !== 'kem') return false;
      if (level.n === 7 && info.h24 == null) return false;
      if (level.n !== 7 && level.n !== 8 && info.style === '24') return false;
      return true;
    }).map(function (it) { return K.mk(it.info.h, it.info.m, it.info.style, it.info.h24, level.n === 8 ? it.info.lv : level.n); });
  }

  function labelConflict(existing, t) {
    const mode = G.level.keyMode;
    return existing.some(function (e) { return K.key(e, mode) === K.key(t, mode) || K.read(e) === K.read(t); });
  }

  /** Lấy một đồng hồ trong kho ôn lại không trùng với nhãn đang có (hoặc null). */
  function takeReview(existing) {
    for (let i = 0; i < G.reviewPool.length; i++) {
      const t = G.reviewPool[i];
      if (!labelConflict(existing, t)) { G.reviewPool.splice(i, 1); return t; }
    }
    return null;
  }

  /** Hai mốc giờ chênh nhau ≤ 2 phút cùng giờ: trên viên gạch nhỏ bé gần như không thể phân biệt. */
  function finePair(a, b) {
    if (a.style === '24' || b.style === '24') return false;   // 9 giờ / 21 giờ: nhãn khác hẳn nhau, lại có nhãn buổi
    return a.h === b.h && Math.abs(a.m - b.m) <= 2;
  }
  function hasFinePair(list) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) if (finePair(list[i], list[j])) return true;
    }
    return false;
  }
  /** Số kiểu bài khác nhau đang có trên bảng (Siêu Tháp trộn nhiều màn). */
  function distinctLv(list) {
    const seen = {};
    let n = 0;
    list.forEach(function (t) { const k = t.lv || 1; if (!seen[k]) { seen[k] = 1; n++; } });
    return n;
  }

  /**
   * Sinh nhãn giờ mới không trùng (theo khóa của màn và theo chữ hiện) với các nhãn đang có.
   * Hai luật cho bảng dễ đọc: tối đa MỘT cặp chênh ≤ 2 phút, và Siêu Tháp luôn có ≥ 2 kiểu bài.
   * `board` là các nhãn thật sự ở trên bảng (khi đổi nhãn một cột thì không tính nhãn cũ của cột đó).
   */
  function newLabel(existing, board) {
    const level = G.level;
    const others = board || existing;
    const fineLeft = !hasFinePair(others);                       // đã có một cặp sát nhau rồi thì thôi
    const needMix = level.n === 8 && others.length > 0 && distinctLv(others) < 2;
    const nearP = level.n === 8 ? 0.35 : 0.65;                   // Siêu Tháp ít lấy "hàng xóm" để trộn nhiều kiểu bài
    let cands = existing.length && !needMix && chance(nearP) ? K.near(pick(existing)) : [];
    for (let i = 0; i < 80; i++) {
      const t = cands.length ? cands.shift() : level.gen();
      if (labelConflict(existing, t)) continue;
      if (!fineLeft && others.some(function (e) { return finePair(e, t); })) continue;
      if (needMix && i < 50 && t.lv === others[0].lv) continue;
      return t;
    }
    for (let i = 0; i < 300; i++) { const t = level.gen(); if (!labelConflict(existing, t)) return t; }
    return level.gen();
  }

  function initCols() {
    G.cols = [];
    const existing = [];
    for (let i = 0; i < COLS; i++) {
      // Một cột đầu tiên mang đồng hồ cần ôn lại (nếu có)
      let t = i === 0 && G.reviewUsed < G.reviewMax ? takeReview(existing) : null;
      const review = !!t;
      if (!t) t = newLabel(existing);
      existing.push(t);
      G.cols.push({ t: t, prevT: null, flip: 0, glow: 0, hint: false, review: review, stack: [], lines: null, prevLines: null });
    }
    layoutPlates();
  }

  function replaceLabel(i) {
    const col = G.cols[i];
    const others = G.cols.map(function (c) { return c.t; });
    const board = G.cols.filter(function (c, j) { return j !== i; }).map(function (c) { return c.t; });
    let t = G.reviewUsed < G.reviewMax && chance(0.35) ? takeReview(others) : null;
    col.review = !!t;
    if (!t) t = newLabel(others, board);
    col.prevT = col.t;
    col.t = t;
    col.flip = 1;
    col.hint = false;
    layoutPlates();
  }

  /* ================= ĐỒNG HỒ RƠI ================= */
  /** Hệ số tăng tốc theo bậc (mỗi 5 câu đúng nhanh thêm 12 %, tối đa ×1,45; Siêu Tháp ×1,3). */
  function speedMul() {
    const lvl = G.level;
    return Math.min(lvl && lvl.n === 8 ? 1.3 : 1.45, 1 + 0.12 * Math.floor(G.correct / 5));
  }
  /** Số giây một đồng hồ rơi từ trên xuống chỗ đáp – KHÔNG đổi theo chiều cao tháp. */
  function fallTime() {
    const lvl = G.level;
    return (lvl ? lvl.fall : 15) / speedMul() * (G.slow ? 1.4 : 1);   // 🐢 chơi chậm hơn: thêm 40 % thời gian
  }

  function spawnPiece() {
    if (!G.level) return;
    let target = -1, review = false;
    // Hỏi lại ngay đồng hồ vừa đọc nhầm (nhãn vẫn còn trên cột vì chỉ thả đúng mới đổi nhãn)
    if (G.retryT) {
      for (let i = 0; i < COLS; i++) {
        const ct = G.cols[i].t;
        if (K.key(ct, '24') === K.key(G.retryT, '24') && ct.style === G.retryT.style) { target = i; review = true; break; }
      }
      G.retryT = null;
    }
    // Ôn lại thông minh: cột đang mang đồng hồ trong kho ôn lại
    if (target < 0 && G.reviewUsed < G.reviewMax && chance(0.6)) {
      for (let i = 0; i < COLS; i++) if (G.cols[i].review) { target = i; review = true; G.reviewUsed++; G.cols[i].review = false; break; }
    }
    if (target < 0) {
      target = rnd(0, COLS - 1);
      if (target === G.lastTarget && chance(0.85)) target = (target + rnd(1, COLS - 1)) % COLS;
    }
    G.lastTarget = target;
    // Cột xuất hiện: KHÔNG phải cột đúng (để không "được điểm vì không làm gì"), ưu tiên cột còn nhiều chỗ trống
    const free = [];
    for (let i = 0; i < COLS; i++) if (i !== target && stackH(i) <= ROWS - 2) free.push(i);
    const col = free.length ? pick(free) : (target + 1) % COLS;
    const hint = G.wrongRun >= (G.slow ? 1 : 2);          // chế độ chậm: gợi ý ngay sau một lần sai
    const p = {
      t: G.cols[target].t, col: col, x: G.board.x + col * G.board.cell, row: -1.0, land: ROWS - 1 - stackH(col), target: target,
      born: G.time, mode: 'fall', pop: 0, hint: hint, asked: false, touched: false, review: review, id: ++G.idSeq
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

  /** Đưa đồng hồ sang cột col: luôn tới được (nhảy lên chỗ đáp nếu tháp cột đó cao hơn vị trí hiện tại). */
  function moveTo(col) {
    const p = G.piece;
    if (G.state !== 'playing' || !p || p.mode !== 'fall') return false;
    col = clamp(Math.round(col), 0, COLS - 1);
    if (col === p.col) return false;
    p.col = col;
    p.land = ROWS - 1 - stackH(col);
    if (p.row > p.land) p.row = p.land;
    p.touched = true;
    Sfx.play('move');
    return true;
  }
  /** Bước sang cột kề (◀ ▶, phím mũi tên): cũng luôn tới được – nhảy lên nóc tháp cột đó nếu cột cao hơn vị trí hiện tại. */
  function stepTo(col) {
    const p = G.piece;
    if (G.state !== 'playing' || !p || p.mode !== 'fall') return false;
    if (col < 0 || col >= COLS) { Sfx.play('click'); return false; }
    return moveTo(col);
  }
  function moveLeft() { return stepTo((G.piece ? G.piece.col : 0) - 1); }
  function moveRight() { return stepTo((G.piece ? G.piece.col : 0) + 1); }

  function hardDrop() {
    const p = G.piece;
    if (G.state !== 'playing' || !p || p.mode !== 'fall') return false;
    p.mode = 'hard';
    p.touched = true;
    Sfx.play('drop');
    return true;
  }

  /** 💡 Gợi ý theo yêu cầu: cột đúng nhấp nháy, đổi lại đồng hồ này chỉ được ASK_HINT_POINTS điểm và không tính chuỗi. */
  function useHint() {
    const p = G.piece;
    if (G.state !== 'playing' || !p || p.mode !== 'fall') return false;
    if (p.hint) { showHint('Cột đang nhấp nháy ✨ là cột đúng đó con!', 'info', 1600); return true; }
    p.hint = true;
    p.asked = true;
    G.cols.forEach(function (c, i) { c.hint = i === p.target; });
    Sfx.play('hint');
    showHint('Gợi ý: thả vào cột đang nhấp nháy ✨', 'info', 2200);
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
    const timeout = !p.touched;                 // bé chưa chạm gì: hết giờ, không tính là đọc đúng
    const ok = !timeout && p.col === p.target;
    G.lastPiece = { t: p.t, ok: ok };
    if (ok) { onCorrect(p); return; }
    if (timeout) G.timeouts++;
    onWrong(p, timeout);
  }

  function onCorrect(p) {
    const B = G.board;
    const row = ROWS - 1 - stackH(p.col);
    p.row = row;
    p.mode = 'pop';
    p.pop = POP_T;
    const cpos = tileCenter(p.col, row);
    spawnSparkle(cpos.x, cpos.y, B.cell * 0.5, false);
    const mulBefore = speedMul();
    G.correct++;
    // Đúng nhờ gợi ý thì chỉ bớt một bậc "đang sai liên tiếp" (gợi ý còn giữ cho lượt sau), đúng tự lực thì xóa hẳn
    if (p.hint) G.wrongRun = Math.max(0, G.wrongRun - 1); else G.wrongRun = 0;
    if (!p.hint) Store.noteOk(reviewKey(p.t));
    let pts;
    if (p.hint) {
      pts = p.asked ? ASK_HINT_POINTS : HINT_POINTS;
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
      // Thưởng nhanh hiện thành lời khen riêng (bé thấy được vì sao hôm nay nhiều điểm hơn)
      if (speedBonus > 0) {
        addText('+' + speedBonus + ' ⚡ nhanh!', cpos.x, cpos.y + B.cell * 0.1, { color: '#9af0ff', size: B.cell * 0.32, life: 1.0, vy: -40, wait: 0.4 });
      }
      if (isCombo) { Sfx.play('combo'); Voice.say('Combo nhân ' + mult + '!'); }
      else if (chance(0.5)) Voice.say(praise);
    }
    G.score += pts;
    addText('+' + pts, cpos.x, cpos.y - B.cell * 0.25, { color: '#ffe066', size: B.cell * 0.42, life: 1.0 });
    Sfx.play('pop');
    owlSay('cheer', 1.4);
    showHint(K.read(p.t) + ' ✓', 'ok', 1500);
    if (!Motion.lite) G.flash = { c: '120,255,180', a: 0.14 };

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
    if (speedMul() > mulBefore) {
      addText('Nhanh hơn một chút! ⏩', B.x + B.w / 2, B.y + B.h * 0.25, { color: '#fff', size: B.cell * 0.34, life: 1.4, vy: -20 });
    }
    G.nextPieceAt = G.time + 0.55;
  }

  /** Thả sai (hoặc hết giờ): hóa đá, giải thích cách đọc, đánh dấu cột đúng, ghi vào kho ôn lại và hỏi lại ngay lượt sau. */
  function onWrong(p, timeout) {
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
    if (!Motion.lite) {
      G.shake = Math.max(G.shake, 0.5);
      G.flash = { c: '255,60,90', a: 0.22 };
    }
    Sfx.play('land');
    Sfx.play('wrong');
    owlSay('worry', 1.8);
    addText(timeout ? '⏰' : '✗', cpos.x, cpos.y - B.cell * 0.6, { color: '#ff5c7a', size: B.cell * 0.6, life: 1.0 });
    showHint((timeout ? 'Hết giờ! ' : '') + 'Đồng hồ chỉ ' + K.read(p.t) + ' · ' + K.explainShort(p.t), 'bad', WRONG_PAUSE * 1000);
    const wrongAt = G.time;
    Voice.say((timeout ? 'Hết giờ rồi! ' : 'Sai rồi! ') + 'Đồng hồ chỉ ' + K.speech(p.t), {
      onend: function () { if (G.state === 'playing' && !G.piece) G.nextPieceAt = Math.min(G.nextPieceAt, Math.max(G.time + 0.6, wrongAt + 2.0)); }
    });
    G.cols[p.target].glow = 1;                 // mũi tên "Đây!" trên cột đúng (drawPlates)
    noteReview(p.t);
    Store.noteMissed(reviewKey(p.t), reviewInfo(p.t));
    G.retryT = p.t;                            // hỏi lại chính đồng hồ này ở lượt kế tiếp
    G.cols.forEach(function (c) { c.hint = false; });
    if (stackH(p.col) >= ROWS) { towerFail(); return; }
    if (stackH(p.col) >= ROWS - 1) addText('⚠️ Tháp sắp chạm đỉnh!', B.x + B.w / 2, B.y + B.h * 0.25, { color: '#ffb3c1', size: B.cell * 0.34, life: 2.0, vy: -15 });
    G.nextPieceAt = G.time + WRONG_PAUSE;
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
    const land = ROWS - 1 - stackH(p.col);
    p.land = land;
    let v = (land + 1) / fallTime();           // rơi từ hàng -1 tới chỗ đáp mất đúng fallTime() giây dù tháp cao hay thấp
    if (p.mode === 'hard') v = HARD_SPEED;
    else if (G.softDrop) v = Math.max(v, SOFT_SPEED);
    p.row += v * dt;
    const tx = B.x + p.col * B.cell;
    p.x += (tx - p.x) * Math.min(1, dt * 16);
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
      const t = K.genFor(rnd(1, 7));
      G.deco.push({ x: Math.random() * (G.W - s), y: -s - 10, s: s, vy: 28 + Math.random() * 30, rot: (Math.random() - 0.5) * 0.4, vr: (Math.random() - 0.5) * 0.3, t: t, text: K.read(t) });
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
      if (t.wait > 0) { t.wait -= dt; arr[w++] = t; continue; }   // chưa tới lượt hiện
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
      d.next = G.anim + 4.5;
      const t = d.list[d.i];
      K.setSvgTime(d.svg, t);
      ui.lessonCaption.textContent = K.read(t) + (t.m === 30 && t.lv <= 4 ? ' (rưỡi)' : '');
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
    if (!boardVisible() || !G.cols.length) updateDeco(dt);   // đúng điều kiện vẽ ở render() – không để đồng hồ trang trí đứng hình

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

  /** Đồng hồ trang trí rơi ở màn hình menu – kèm cách đọc để bé nhìn thấy giờ ngay cả khi chưa vào chơi. */
  function drawDeco(c) {
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    for (let i = 0; i < G.deco.length; i++) {
      const d = G.deco[i];
      c.save();
      c.translate(d.x + d.s / 2, d.y + d.s / 2);
      c.rotate(d.rot);
      c.globalAlpha = 0.85;
      drawTile(c, -d.s / 2, -d.s / 2, d.s, d.t, 'piece', { direct: true });
      c.restore();
      const size = fitFont(c, d.text, d.s * 1.7, d.s * 0.22);
      c.globalAlpha = 0.9;
      c.lineWidth = Math.max(3, size * 0.34);
      c.strokeStyle = 'rgba(10,25,60,0.75)';
      c.strokeText(d.text, d.x + d.s / 2, d.y + d.s + size * 0.9);
      c.fillStyle = '#fff6d8';
      c.fillText(d.text, d.x + d.s / 2, d.y + d.s + size * 0.9);
      c.globalAlpha = 1;
    }
  }

  function drawBoard(c) {
    const B = G.board;
    if (G.staticLayer) c.drawImage(G.staticLayer, 0, 0, G.W, G.H);
    else buildStaticLayer();
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

  /** Dòng chữ trên một cột: tách "kém" xuống dòng riêng khi cột hẹp, bỏ " phút" khi cột rất hẹp. */
  function plateLines(t, w) {
    let lines = K.lines(t);
    if (w < 130 && lines.length === 2 && lines[1].indexOf('kém ') === 0) lines = [lines[0], 'kém', lines[1].slice(4)];
    // Đĩa hẹp (điện thoại): bỏ chữ " phút" – "9 giờ 20" vẫn đọc đúng mà cỡ chữ chung của bốn cột không tụt về 11 px
    if (w < 56 || (lines.length === 3 && w < 62)) lines = lines.map(function (s) { return s.replace(' phút', ''); });
    return lines;
  }

  /** Tính dòng chữ và MỘT cỡ chữ chung cho cả 4 cột (không còn cột "kém" chữ 13 px cạnh cột chữ 21 px). Gọi khi đổi nhãn/bố cục. */
  function layoutPlates() {
    const B = G.board, c = ctx;
    const w = B.cell - 6, h = B.plateH - 6;
    let size = Infinity;
    const measure = function (ls) {
      const n = ls.length;
      const base = h * (n === 1 ? 0.42 : n === 2 ? 0.33 : 0.27);
      for (let k = 0; k < n; k++) size = Math.min(size, fitFont(c, ls[k], w - 10, base));
    };
    for (let i = 0; i < G.cols.length; i++) {
      const col = G.cols[i];
      col.lines = plateLines(col.t, w);
      col.prevLines = col.prevT ? plateLines(col.prevT, w) : null;
      measure(col.lines);
      if (col.prevLines) measure(col.prevLines);
    }
    G.plateFont = isFinite(size) ? Math.max(11, Math.min(size, h * 0.42)) : Math.max(11, h * 0.3);
  }

  /** Mũi tên "Đây!" nhún nhảy phía trên một cột (cột đúng sau khi thả sai, hoặc cột gợi ý). */
  function drawMarker(c, cx, y, color) {
    const B = G.board;
    const bob = Math.abs(Math.sin(G.anim * 5)) * B.cell * 0.12;
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    c.strokeStyle = 'rgba(10,15,40,0.9)';
    c.fillStyle = color;
    c.font = '800 ' + Math.round(B.cell * 0.28) + 'px ' + FONT;
    c.lineWidth = Math.max(3, B.cell * 0.045);
    c.strokeText('Đây!', cx, y - B.cell * 0.78 - bob);
    c.fillText('Đây!', cx, y - B.cell * 0.78 - bob);
    c.font = '800 ' + Math.round(B.cell * 0.55) + 'px ' + FONT;
    c.lineWidth = Math.max(3, B.cell * 0.08);
    c.strokeText('⬇', cx, y - B.cell * 0.36 - bob);
    c.fillText('⬇', cx, y - B.cell * 0.36 - bob);
  }

  function drawPlates(c) {
    const B = G.board;
    const y = B.y + B.h + 6, h = B.plateH - 6;
    if (G.plateFont == null) layoutPlates();
    const size = G.plateFont;
    for (let i = 0; i < COLS; i++) {
      const col = G.cols[i];
      if (!col) continue;
      const st = COL_STYLE[i];
      const x = B.x + i * B.cell + 3, w = B.cell - 6;
      const cx = x + w / 2, cy = y + h / 2;
      let sy = 1;
      let lines = col.lines || plateLines(col.t, w);
      if (col.flip > 0) {
        sy = Math.abs(Math.cos(col.flip * Math.PI));
        if (col.flip > 0.5 && col.prevT) lines = col.prevLines || plateLines(col.prevT, w);
      }
      c.save();
      c.translate(cx, cy);
      c.scale(1, Math.max(0.04, sy));
      c.translate(-cx, -cy);
      if (!Motion.lite) {
        if (col.glow > 0) {
          c.shadowColor = 'rgba(80,255,150,' + Math.min(1, col.glow * 1.5).toFixed(2) + ')';
          c.shadowBlur = 26;
        } else if (col.hint) {
          c.shadowColor = 'rgba(255,214,102,' + (0.6 + 0.4 * Math.sin(G.anim * 7)).toFixed(2) + ')';
          c.shadowBlur = 24;
        }
      }
      roundRect(c, x, y, w, h, Math.min(16, w * 0.18));
      c.fillStyle = col.glow > 0 ? '#c9ffd9' : st.fill;
      c.fill();
      c.shadowBlur = 0;
      c.lineWidth = Math.max(2, w * 0.04);
      c.strokeStyle = col.glow > 0 ? '#06d6a0' : (col.hint ? '#ffbf1f' : st.edge);
      c.stroke();
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = '800 ' + Math.round(size) + 'px ' + FONT;
      const n = lines.length;
      const lh = size * 1.08;
      for (let k = 0; k < n; k++) {
        const ly = cy + (k - (n - 1) / 2) * lh + size * 0.04;
        c.fillStyle = lines[k].indexOf('kém') === 0 ? '#5a3f85' : st.ink;
        c.fillText(lines[k], cx, ly);
      }
      c.restore();
      if (col.glow > 0) drawMarker(c, cx, y, '#7bf1a8');
      else if (col.hint) drawMarker(c, cx, y, '#ffbf1f');
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
    drawTile(c, B.x + p.col * B.cell + 3, B.y + land * B.cell + 3, B.cell - 6, p.t, 'ghost', p.hint && p.col === p.target ? { tint: '#ffd166' } : null);
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
    roundRect(c, x + 2, y + 5, s, s, s * 0.2);
    c.fillStyle = 'rgba(0,0,0,0.22)';
    c.fill();
    drawTile(c, x, y, s, p.t, 'piece');
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
    // (Thẻ nền nằm trong lớp tĩnh – xem buildStaticLayer)
    // Tiêu đề: câu hỏi khi đang có đồng hồ rơi, kết quả của đồng hồ vừa thả khi chờ lượt sau
    let title = 'Sẵn sàng…', color = '#fff';
    if (live) title = p.review ? '📝 Ôn lại: đồng hồ chỉ mấy giờ?' : (p.t.style === '24' ? 'Mấy giờ (24 giờ)?' : 'Đồng hồ chỉ mấy giờ?');
    else if (G.lastPiece) { title = (G.lastPiece.ok ? '✓ ' : '✗ ') + K.read(G.lastPiece.t); color = G.lastPiece.ok ? '#7bf1a8' : '#ffb3c1'; }
    c.textAlign = 'center'; c.textBaseline = 'middle';
    if (!Big.titleSize) Big.titleSize = {};
    let ts = Big.titleSize[title];
    // Bề rộng cho phép: không bao giờ vượt quá chỗ trống thật sự hai bên (tiêu đề "📝 Ôn lại…" dài nhất)
    const maxW = Math.min(bw + r * 0.6, 2 * Math.max(60, Math.min(Big.x - 8, G.W - Big.x - 8)));
    if (ts == null) ts = Big.titleSize[title] = fitFont(c, title, maxW, clamp(r * 0.22, 14, 26));
    else c.font = '800 ' + Math.round(ts) + 'px ' + FONT;
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
      if (t.wait > 0) continue;
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
    if (boardVisible() && G.cols.length) {
      // Mây không lượn qua phía sau bảng chơi và thẻ đồng hồ lớn: chữ trên đĩa đáp án và mặt đồng hồ luôn rõ nét
      const B = G.board, Big = G.big, pd = 8;
      c.save();
      c.beginPath();
      c.rect(0, 0, G.W, G.H);
      roundRectPath(c, B.x - pd, B.top - pd, B.w + pd * 2, (B.y - B.top) + B.h + B.plateH + pd * 2, 20);
      roundRectPath(c, Big.x - Big.cardW / 2, Big.y - Big.cardH / 2, Big.cardW, Big.cardH, Big.r * 0.3);
      c.clip('evenodd');
      drawClouds(c);
      c.restore();
      drawBoard(c);
      drawOwl(c);
      drawStack(c);
      drawGhost(c);
      drawPiece(c);
      drawPlates(c);
      drawBigClock(c);
    } else {
      drawClouds(c);
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
      ui.progText.setAttribute('aria-label', 'Đã đúng ' + G.correct + ' trên ' + goal);
      ui.progFill.style.width = (clamp(G.correct / goal, 0, 1) * 100).toFixed(1) + '%';
    }
    // Combo: đếm tiến trình 1/3, 2/3 rồi mới tới ×2 – bé thấy mình sắp được nhân điểm
    const mult = G.state === 'playing' ? multiplier() : 1;
    const streak = G.state === 'playing' ? G.streak : 0;
    const combo = mult >= 2 ? 'Combo x' + mult + ' 🔥' : (streak >= 1 ? 'Combo ' + streak + '/3 🔥' : '');
    if (h.combo !== combo) {
      h.combo = combo;
      ui.combo.hidden = !combo;
      ui.combo.classList.toggle('warm', combo !== '' && mult < 2);
      if (combo) {
        ui.combo.textContent = combo;
        ui.combo.style.animation = 'none';
        void ui.combo.offsetWidth;
        ui.combo.style.animation = '';
      }
    }
    const speed = Math.round(speedMul() * 10) / 10;
    if (h.speed !== speed) {
      h.speed = speed;
      ui.hudSpeed.hidden = speed <= 1;
      ui.hudSpeed.textContent = '⏩ ×' + speed.toFixed(1);
    }
    const rv = !!(G.piece && G.piece.review && G.piece.mode !== 'pop');
    if (h.review !== rv) { h.review = rv; ui.hudReview.hidden = !rv; }
    const pauseOn = G.state === 'playing';
    if (h.pause !== pauseOn) { h.pause = pauseOn; ui.btnPause.hidden = !pauseOn; }
  }

  /** Nhãn màn chơi. Màn hình hẹp (< 960 px) chỉ ghi "Màn n": đủ 5 chip mà vẫn gọn một hàng (C14). */
  function syncLevelChip() {
    if (!G.level) return;
    const full = G.W >= 960;
    ui.levelChip.textContent = 'Màn ' + G.level.n + (full ? ' · ' + G.level.title : '') + (G.slow ? ' 🐢' : '');
    ui.levelChip.setAttribute('aria-label', 'Màn ' + G.level.n + ': ' + G.level.title + (G.slow ? ', chơi chậm' : ''));
  }

  function resetHud() {
    G.hud = { score: -1, correct: -1, combo: null, speed: -1, review: null, pause: null };
    ui.combo.hidden = true;
    ui.hint.hidden = true;
    ui.hudSpeed.hidden = true;
    ui.hudReview.hidden = true;
    ui.progFill.style.width = '0%';
    syncLevelChip();
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
    if (ui.fx) { clearTimeout(domConfetti._t); ui.fx.innerHTML = ''; }
  }

  function startLevel(level, opts) {
    clearTimeout(G.cdTimer);
    G.level = level;
    // 🐢 chơi chậm hơn: bật khi được yêu cầu, và GIỮ NGUYÊN khi thử lại / xem lại bài học cùng một màn
    // (chơi màn khác hoặc hoàn thành màn thì trở lại tốc độ thường)
    G.slow = opts && opts.slow != null ? !!opts.slow : G.slowFor === level.id;
    G.slowFor = G.slow ? level.id : null;
    G.state = 'countdown';
    G.score = 0; G.streak = 0; G.bestStreak = 0; G.correct = 0; G.wrong = 0; G.timeouts = 0; G.wrongRun = 0; G.review = [];
    G.time = 0; G.nextPieceAt = 0; G.lastTarget = -1; G.lastPiece = null; G.clearAt = -1; G.failAt = -1; G.endReason = ''; G.resultSaved = false;
    G.quiz = null; G.deco.length = 0; G.retryT = null; G.owlMood = 'idle'; G.owlUntil = 0;
    // Ôn lại thông minh: ~25 % số câu của màn (1–3) lấy từ những đồng hồ bé từng đọc nhầm
    G.reviewPool = buildReviewPool(level);
    G.reviewUsed = 0;
    G.reviewMax = G.reviewPool.length ? Math.min(3, Math.max(1, Math.round(level.goal * 0.25))) : 0;
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
      // Điện thoại dựng đứng không có ◀ ⬇ ▶: nhắc bé cách chạm (một lần mỗi ván)
      if (G.narrow) showHint('Chạm vào cột để đưa đồng hồ tới, chạm lần nữa để thả 👆', 'info', 3000);
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
    G.lessonFromPause = false;
    stopDemo();
    showScreen(null);
    Sfx.unlock();
    Music.setDuck('pause', null);
    requestWake();
  }

  function levelClear() {
    if (G.state !== 'playing') return;
    G.state = 'clear';
    G.endReason = 'clear';
    G.slowFor = null;                          // đã qua màn: lần sau chơi lại ở tốc độ thường
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
    G.piece = null;                            // không để đồng hồ cuối "đứng hình" trên bảng
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
    if (!Motion.lite) G.shake = 1;
    G.piece = null;
    let d = 0.25;
    G.cols.forEach(function (c, i) {
      for (let j = c.stack.length - 1; j >= 0; j--) { const r = c.stack[j]; if (!r.dead && r.popAt == null) { popRubble(i, j, d); d += 0.06; } }
    });
    const B = G.board;
    addText('THÁP ĐỔ!', B.x + B.w / 2, B.y + B.h * 0.4, { color: '#fff', stroke: 'rgba(239,71,111,0.95)', size: B.cell * 0.8, life: 2.0, vy: -12 });
  }

  /** 3 sao: không sai lần nào · 2 sao: sai không quá 1/5 số câu của màn (màn dài được sai nhiều hơn). */
  function twoStarLimit(goal) { return Math.ceil((goal || 10) / 5); }
  function starsFor(wrong, goal) { return wrong === 0 ? 3 : wrong <= twoStarLimit(goal) ? 2 : 1; }
  function starsHtml(n) {
    let h = '';
    for (let i = 0; i < 3; i++) h += '<span class="' + (i < n ? 'on' : 'off') + '">★</span>';
    return h;
  }
  function gradeLabel(g) { return g === 0 ? 'Tổng hợp' : 'Lớp ' + g; }
  function gradeClass(g) { return g === 0 ? 'gx' : 'g' + g; }

  /** Thẻ ôn lại: đồng hồ to hơn, biểu tượng buổi trước cách đọc, chạm để nghe và mở lời giải thích ngắn. */
  function reviewHtml(list) {
    return list.map(function (r, i) {
      const em = r.t.period ? K.PERIOD_ICON[r.t.period] + ' ' : '';
      return '<div class="review-item" data-i="' + i + '" role="button" tabindex="0" aria-expanded="false" aria-label="' + esc('Đồng hồ chỉ ' + r.text + ', chạm để nghe và xem cách đọc') + '">' +
        K.svg(r.t, { size: 110, badge: false }) +
        '<div class="rv-text">' + esc(em + r.text) + '</div>' +
        '<div class="rv-why" hidden>' + esc(K.explainShort(r.t)) + '</div></div>';
    }).join('');
  }

  function showSummary() {
    G.state = 'summary';
    const lvl = G.level, score = G.score;
    const stars = starsFor(G.wrong, lvl.goal);
    const rec = Store.rec(lvl.id);
    const isRecord = score > (rec.best || 0);
    if (!G.resultSaved) {
      Store.setRec(lvl.id, { best: Math.max(rec.best || 0, score), stars: Math.max(rec.stars || 0, stars), done: (rec.done || 0) + 1 });
      Store.addStats({ topic: lvl.id, correct: G.correct, wrong: G.wrong, timeouts: G.timeouts, seconds: G.time, cleared: true });
      G.resultSaved = true;
    }
    ui.sumTitle.textContent = '🎉 Hoàn thành màn ' + lvl.n + '!';
    ui.sumLevel.textContent = lvl.icon + ' ' + lvl.title + ' · ' + gradeLabel(lvl.grade);
    ui.sumScore.textContent = fmt(score);
    ui.sumStars.innerHTML = starsHtml(stars);
    ui.sumRecord.hidden = !isRecord;
    ui.stCorrect.textContent = G.correct;
    ui.stWrong.textContent = G.wrong;
    if (ui.stWrong.nextElementSibling) ui.stWrong.nextElementSibling.textContent = 'Sai ❌' + (G.timeouts ? ' (' + G.timeouts + ' hết giờ)' : '');
    ui.stCombo.textContent = G.bestStreak;
    ui.review.hidden = !G.review.length;
    ui.reviewList.innerHTML = reviewHtml(G.review);
    const next = K.levelByN(lvl.n + 1);
    ui.sumNote.innerHTML = (next
      ? 'Trả lời đúng <b>3 câu hỏi</b> để mở khóa màn ' + next.n + ': <b>' + esc(next.title) + '</b>!'
      : 'Trả lời đúng <b>3 câu hỏi</b> để nhận danh hiệu <b>Vua Xem Giờ</b>!') +
      '<span class="star-rule">⭐⭐ khi sai không quá ' + twoStarLimit(lvl.goal) + ' lần · ⭐⭐⭐ khi không sai lần nào</span>';
    showHud(false);
    showScreen('summary');
    if (isRecord) { Sfx.play('record'); Sfx.play('applause'); spawnConfetti(120); domConfetti(40); }
    else if (stars >= 2) { Sfx.play('applause'); spawnConfetti(60); domConfetti(stars === 3 ? 30 : 18); }
    releaseWake();
    setTimeout(function () { if (G.state === 'summary') Music.play('menu'); }, 2000);
  }

  function showFail() {
    G.state = 'fail-screen';
    const lvl = G.level;
    if (!G.resultSaved) {
      Store.setRec(lvl.id, { fails: (Store.rec(lvl.id).fails || 0) + 1 });
      Store.addStats({ topic: lvl.id, correct: G.correct, wrong: G.wrong, timeouts: G.timeouts, seconds: G.time, cleared: false });
      G.resultSaved = true;
    }
    ui.failLevel.textContent = lvl.icon + ' Màn ' + lvl.n + ' · ' + lvl.title;
    ui.failInfo.textContent = 'Đã đúng ' + G.correct + '/' + lvl.goal + ' · Sai ' + G.wrong + ' lần' + (G.timeouts ? ' (' + G.timeouts + ' hết giờ)' : '') + ' · Điểm: ' + fmt(G.score);
    ui.failReview.hidden = !G.review.length;
    ui.failReviewList.innerHTML = reviewHtml(G.review);
    // Đổ tháp từ 2 lần trở lên: mời bé chơi chậm hơn thay vì cứ thử lại mãi.
    // Đang ở chế độ chậm mà vẫn đổ thì nút vẫn còn (đổi lời) – không để bé rơi vào ngõ cụt.
    if (ui.failSlow) {
      ui.failSlow.hidden = (Store.rec(lvl.id).fails || 0) < 2;
      ui.failSlow.textContent = G.slow ? '🐢 Vẫn chơi chậm' : '🐢 Chơi chậm hơn';
    }
    showHud(false);
    showScreen('fail');
    releaseWake();
    setTimeout(function () { if (G.state === 'fail-screen') Music.play('menu'); }, 1500);
  }

  function leaveGame() {
    clearTimeout(G.cdTimer);
    const was = inGame();
    G.level = null;
    G.quiz = null;                                 // không để ván hỏi đáp cũ sót lại (màn chơi đã bị xóa)
    G.cols = [];
    clearWorld();
    showHud(false);
    // Giải phóng ~500 nút SVG của các màn hình đã ẩn
    ui.reviewList.innerHTML = ''; ui.failReviewList.innerHTML = ''; ui.quizClock.innerHTML = ''; ui.lessonClock.innerHTML = ''; ui.quizChoices.innerHTML = '';
    if (was) layout(); else G.staticLayer = null;
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
    // 👑 Vua Xem Giờ: chúc mừng một lần, ngay trên bảng chọn màn (thẻ Siêu Tháp đã có vương miện)
    if (G.celebrateBadge) {
      G.celebrateBadge = false;
      Sfx.play('chime');
      spawnConfetti(Motion.lite ? 20 : 200);
      domConfetti(Motion.lite ? 0 : 40);
      toast('👑 Con là Vua Xem Giờ! Giỏi lắm!', 3200);
    }
  }

  /* ================= CHỌN MÀN ================= */
  /** Đã thuộc: đúng ≥ 90 % trên ít nhất 20 đồng hồ của màn đó. */
  function mastered(id) {
    const t = Store.p().stats.byTopic[id];
    if (!t) return false;
    const n = t.c + t.w;
    return n >= 20 && t.c / n >= 0.9;
  }

  function renderLevels() {
    const bucket = Store.p();
    ui.levelGrid.innerHTML = K.LEVELS.map(function (l) {
      const rec = Store.rec(l.id);
      const locked = !Store.isUnlocked(l.n);
      const label = 'Màn ' + l.n + ': ' + l.title + (locked ? ', đang khóa' : ', ' + (rec.stars || 0) + ' sao');
      return '<div class="level-card' + (locked ? ' locked' : '') + '" data-id="' + l.id + '" role="button" tabindex="' + (locked ? '-1' : '0') + '"' +
        (locked ? ' aria-disabled="true"' : '') + ' aria-label="' + esc(label) + '">' +
        '<span class="grade ' + gradeClass(l.grade) + '">' + gradeLabel(l.grade) + '</span>' +
        (l.n === 8 && bucket.badge ? '<span class="crown" aria-label="Vua Xem Giờ">👑</span>' : '') +
        '<div class="icon">' + (locked ? '🔒' : l.icon) + '</div>' +
        '<div class="name">Màn ' + l.n + ': ' + esc(l.title) + (mastered(l.id) ? '<span class="mastered">✅ Đã thuộc</span>' : '') + '</div>' +
        '<div class="desc">' + esc(l.desc) + '</div>' +
        (locked
          ? '<div class="meta"><span class="lock-note">Hoàn thành màn ' + (l.n - 1) + ' + hỏi đáp để mở</span></div>'
          : '<div class="meta">' + (rec.done ? '<span class="best">🏆 ' + fmt(rec.best || 0) + '</span>' : '<span class="best new">Chưa chơi</span>') +
            '<span class="stars">' + starsHtml(rec.stars || 0) + '</span></div>') +
        '</div>';
    }).join('');
  }

  function unlockAll() {
    adultGate(function () {
      Store.unlock(K.LEVELS.length);
      renderLevels();
      Sfx.play('unlock');
      toast('Đã mở khóa tất cả các màn! 🔓');
    });
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
    ui.lessonHead.textContent = level.icon + ' Màn ' + level.n + (G.W < 480 ? '' : ' · ' + gradeLabel(level.grade));
    ui.lessonTitle.textContent = L.title;
    ui.lessonText.innerHTML = L.html;
    ui.lessonClock.innerHTML = K.svg(L.demo[0], { size: 230, ring: L.ring || null, digital: !!L.digital, badge: true });
    const d0 = L.demo[0];
    ui.lessonCaption.textContent = K.read(d0) + (d0.m === 30 && d0.lv <= 4 ? ' (rưỡi)' : '');
    ui.lessonStart.textContent = fromPause ? '▶ Chơi tiếp' : '▶ Bắt đầu chơi';
    // Đồng hồ minh họa đứng yên ở ví dụ đầu cho tới khi giọng đọc xong (không có giọng: 6 giây)
    G.demo = { i: 0, next: Infinity, svg: ui.lessonClock.querySelector('svg'), list: L.demo };
    showScreen('lesson');
    Voice.stop();
    if (Voice.available && Voice.enabled) {
      Voice.say(L.speech, { rate: 0.95, onend: function () { if (G.demo.list === L.demo) G.demo.next = G.anim + 0.6; } });
      G.demo.next = G.anim + 30;               // dự phòng nếu giọng đọc không báo kết thúc
    } else G.demo.next = G.anim + 6;
  }

  function readLesson() {
    if (!G.level) return;
    if (!Voice.available) { toast('Thiết bị chưa có giọng đọc tiếng Việt 🙁'); return; }
    Voice.say(K.speakable(G.level.lesson.speech), { rate: 0.95 });
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
  /** Màn bé còn yếu nhất (sai ≥ 20 % trên ít nhất 8 câu) trong các màn có ngân hàng câu kiến thức – 0 nếu chưa rõ. */
  function weakestLevelN() {
    const by = Store.p().stats.byTopic;
    let best = 0, worst = 0;
    K.LEVELS.forEach(function (l) {
      if (!K.CONCEPT[l.n]) return;
      const t = by[l.id];
      if (!t) return;
      const n = t.c + t.w;
      if (n < 8) return;
      const r = t.w / n;
      if (r >= 0.2 && r > worst) { worst = r; best = l.n; }
    });
    return best;
  }

  function startQuiz() {
    if (!G.level) return;
    G.state = 'quiz';
    const mistakes = G.review.map(function (r) { return r.t; });
    // Bài tổng kết (Siêu Tháp) hỏi phần khó, ưu tiên đúng màn bé còn yếu nhất
    G.quiz = { qs: K.quizFor(G.level.n, mistakes, weakestLevelN()), i: 0, firstTry: 0, wrongOnThis: false, done: false };
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
    if (ui.quizLegend) ui.quizLegend.hidden = !q.clock;         // chú thích màu kim chỉ hiện khi có đồng hồ
    const order = K.shuffle(q.choices.map(function (c, i) { return { text: c, i: i }; }));
    Qz.order = order;
    ui.quizChoices.innerHTML = order.map(function (o) {
      return '<button type="button" class="choice" data-text="' + esc(o.text) + '">' + esc(o.text) + '</button>';
    }).join('');
    ui.quizFeedback.hidden = true;
    ui.quizFeedback.className = 'quiz-feedback';
    Qz.wrongOnThis = false;
    Voice.stop();
    Voice.say(K.speakable(q.speech || q.q));    // câu kiến thức có thể chứa "17:30", "×", "="
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
      const isAns = b.getAttribute('data-text') === q.choices[0];
      if (b.getAttribute('data-text') === text) b.classList.add(correct ? 'ok' : 'bad');
      else if (isAns) b.classList.add(correct ? 'ok' : 'reveal');   // sai: đánh dấu đáp án đúng để bé học
    }
    ui.quizFeedback.hidden = false;
    if (correct) {
      if (!Qz.wrongOnThis) { Qz.firstTry++; if (q.clock) Store.noteOk(reviewKey(q.clock)); }
      ui.quizFeedback.className = 'quiz-feedback ok';
      ui.quizExplain.innerHTML = '<b>✅ Chính xác!</b> ' + esc(q.explain);
      ui.quizNext.hidden = false;
      ui.quizRetry.hidden = true;
      ui.quizNext.textContent = Qz.i + 1 < Qz.qs.length ? 'Câu tiếp theo ▶' : 'Xem kết quả 🏆';
      Sfx.play('quizok');
      Voice.say('Đúng rồi! ' + K.speakable(q.explain), { rate: 0.98 });
    } else {
      Qz.wrongOnThis = true;
      if (q.clock) Store.noteMissed(reviewKey(q.clock), reviewInfo(q.clock));
      ui.quizFeedback.className = 'quiz-feedback bad';
      ui.quizExplain.innerHTML = '<b>❌ Chưa đúng.</b> 💡 ' + esc(q.explain);
      ui.quizNext.hidden = true;
      ui.quizRetry.hidden = false;
      Sfx.play('quizbad');
      Voice.say('Chưa đúng. ' + K.speakable(q.explain), { rate: 0.98 });
    }
  }

  /** Thử lại: câu đọc đồng hồ được thay bằng một đồng hồ MỚI cùng kiểu (không đoán mò 3 đáp án đã lộ). */
  function quizRetry() {
    const Qz = G.quiz;
    if (!Qz) return;
    const wasWrong = Qz.wrongOnThis;
    const q = Qz.qs[Qz.i];
    if (q && q.clock && G.level) {
      const lv = q.clock.lv || G.level.n;
      let fresh = null;
      for (let i = 0; i < 8 && !fresh; i++) {
        const t = K.genFor(lv);
        if (!K.same(t, q.clock)) fresh = K.clockQuestion(G.level.n, t);
      }
      if (fresh) Qz.qs[Qz.i] = fresh;
    }
    renderQuizQuestion();
    Qz.wrongOnThis = wasWrong;
  }

  /** Thoát hỏi đáp về màn hình chọn màn (không mở khóa). */
  function quizExit() {
    if (G.state !== 'quiz') return;
    goLevels();
  }

  function quizNext() {
    const Qz = G.quiz;
    if (!Qz || !G.level) { goLevels(); return; }
    Qz.i++;
    if (Qz.i < Qz.qs.length) renderQuizQuestion(); else quizDone();
  }

  function quizDone() {
    const Qz = G.quiz, lvl = G.level;
    if (!Qz || !lvl) { goLevels(); return; }         // không còn màn chơi (đã thoát): quay về chọn màn
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
      text = 'Bạn trả lời đúng ngay lần đầu <b>' + Qz.firstTry + '/' + Qz.qs.length + '</b> câu. Màn ' + next.n + ': <b>' + esc(next.title) + '</b> ' + (newly ? 'đã sẵn sàng!' : 'đang chờ bạn!');
      ui.quizNextLevel.hidden = false;
      // Điện thoại: nhãn nút ngắn lại (tên màn đã nằm ngay bên trên), tránh nút cao 3 dòng
      ui.quizNextLevel.textContent = G.W < 480 ? '▶ Chơi màn ' + next.n : '▶ Chơi màn ' + next.n + ': ' + next.title;
    } else {
      title = '👑 Vua Xem Giờ!';
      text = 'Bạn đã hoàn thành tất cả các màn và trả lời đúng ngay lần đầu <b>' + Qz.firstTry + '/' + Qz.qs.length + '</b> câu. Tuyệt vời!';
      ui.quizNextLevel.hidden = true;
      if (!Store.p().badge) { Store.p().badge = true; Store.save(); G.celebrateBadge = true; }
    }
    ui.quizDoneTitle.textContent = title;
    ui.quizDoneText.innerHTML = text;
    Sfx.play(newly ? 'unlock' : 'clear');
    Sfx.play('applause');
    spawnConfetti(140);
    domConfetti(40);
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
    // Kéo ngang: chỉ đi qua cột còn chỗ (không "nhảy" và đáp ngay xuống một cột cao chỉ vì kéo lướt qua)
    if (d.moved && G.piece && col !== G.piece.col && canOccupy(col, G.piece.row)) moveTo(col);
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
      else if (act === 'hint') useHint();
    });
    // Chỉ chặn cuộn chạm trên bảng chơi và cụm nút (các bảng khác vẫn cuộn được, listener ở document giữ passive)
    const stopTouch = function (e) { if (e.cancelable) e.preventDefault(); };
    canvas.addEventListener('touchstart', stopTouch, { passive: false });
    canvas.addEventListener('touchmove', stopTouch, { passive: false });
    ui.controls.addEventListener('touchmove', stopTouch, { passive: false });
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    document.addEventListener('dblclick', function (e) { if (e.target === canvas || ui.controls.contains(e.target)) e.preventDefault(); });
    document.addEventListener('contextmenu', function (e) { if (e.target === canvas) e.preventDefault(); });
    document.addEventListener('pointerdown', function (e) {
      Sfx.unlock();
      if (G.state === 'menu' && !(e.target && e.target.closest && e.target.closest('#btn-player'))) welcome();
    }, true);
    document.addEventListener('keydown', function (e) {
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;    // đang gõ tên bé / đáp án cổng phụ huynh
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (!ui.parentGate.classList.contains('hidden')) { closeGate(); return; }
        if (!ui.howto.classList.contains('hidden')) { ui.howto.classList.add('hidden'); return; }
        if (G.state === 'players') { closePlayers(); return; }
        if (G.state === 'report') { closeReport(); return; }
        if (G.state === 'quiz') { if (e.key === 'Escape') quizExit(); return; }
        if (G.state === 'paused' && G.lessonFromPause) { G.lessonFromPause = false; stopDemo(); Voice.stop(); showScreen('pause'); return; }
        if (G.state === 'playing') pauseGame(); else if (G.state === 'paused') resumeGame();
        return;
      }
      if (G.state !== 'playing') return;
      if (e.key === 'ArrowLeft') { moveLeft(); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { moveRight(); e.preventDefault(); }
      else if (e.key === 'ArrowDown') { G.softDrop = true; e.preventDefault(); }
      else if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowUp') { hardDrop(); e.preventDefault(); }
      else if (e.key === 'h' || e.key === 'H') { useHint(); e.preventDefault(); }
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
      { key: 'sound', on: '🔊 Âm thanh: Bật', off: '🔇 Âm thanh: Tắt' },
      { key: 'music', on: '🎵 Nhạc nền: Bật', off: '🎵 Nhạc nền: Tắt' },
      { key: 'voice', on: '🗣️ Giọng đọc: Bật', off: '🗣️ Giọng đọc: Tắt' },
      { key: 'fx', on: '✨ Hiệu ứng: Nhiều', off: '✨ Hiệu ứng: Ít' }
    ];
    const boxes = document.querySelectorAll('[data-audio-toggles]');
    for (let i = 0; i < boxes.length; i++) {
      boxes[i].innerHTML = defs.map(function (d) {
        const on = d.key === 'fx' ? Store.data.fx !== 'lite' : Store.data[d.key] !== false;
        let label = on ? d.on : d.off;
        if (d.key === 'voice' && on && !Voice.available) label = '🗣️ Giọng đọc: đang tìm giọng…';   // iOS nạp giọng muộn – không khóa nút
        return '<button type="button" class="toggle ' + (on ? 'on' : 'off') + '" data-set="' + d.key + '" aria-pressed="' + on + '">' + label + '</button>';
      }).join('');
    }
  }

  /* ================= HỒ SƠ NGƯỜI CHƠI ================= */
  const PlayersUI = { mode: null, avatar: null };

  /** Tổng số sao của một hồ sơ trong game này. */
  function sumStars(bucket) {
    let n = 0;
    if (!bucket || !bucket.levels) return 0;
    for (const id in bucket.levels) n += Number(bucket.levels[id].stars) || 0;
    return n;
  }

  function renderPlayerChip() {
    if (!Players || !ui.playerChip) return;
    const a = Players.active();
    ui.playerChip.innerHTML = Players.chipHtml() + '<span class="pl-hint" aria-hidden="true">▾</span>';
    ui.playerChip.setAttribute('aria-label', 'Đổi người chơi (đang chơi: ' + a.name + ')');
  }

  function renderPlayers() {
    if (!Players) return;
    const act = Players.active();
    ui.playerList.innerHTML = Players.list().map(function (p) {
      const st = Store.data.players[p.id];
      const stars = st ? sumStars(st) : 0;
      return '<button type="button" class="player-item' + (p.id === act.id ? ' active' : '') + '" data-id="' + esc(p.id) + '" aria-pressed="' + (p.id === act.id) + '">' +
        '<span class="pl-avatar" aria-hidden="true">' + esc(p.avatar) + '</span><span class="pl-name">' + esc(p.name) + (st && st.badge ? ' 👑' : '') +
        '<span class="pl-sub">⭐ ' + stars + ' sao</span></span></button>';
    }).join('');
    const rm = $('btn-player-remove');
    rm.disabled = Players.list().length <= 1;                 // chỉ còn một bạn thì không xóa được
    rm.setAttribute('aria-disabled', String(rm.disabled));
    ui.playerForm.hidden = !PlayersUI.mode;
  }

  function openPlayers() {
    if (!Players || inGame()) return;
    PlayersUI.mode = null;
    G.state = 'players';
    renderPlayers();
    showScreen('players');
  }
  function closePlayers() {
    PlayersUI.mode = null;
    G.state = 'menu';
    showScreen('menu');
  }

  function openPlayerForm(mode) {
    PlayersUI.mode = mode;                                   // 'add' | 'rename' | 'avatar'
    const act = Players.active();
    PlayersUI.avatar = mode === 'add' ? Players.AVATARS[Players.list().length % Players.AVATARS.length] : act.avatar;
    ui.playerName.value = mode === 'add' ? '' : act.name;
    ui.playerName.hidden = mode === 'avatar';
    ui.playerAvatars.hidden = mode === 'rename';
    ui.playerAvatars.innerHTML = Players.AVATARS.map(function (a) {
      return '<button type="button" class="avatar" data-avatar="' + esc(a) + '" aria-pressed="' + (a === PlayersUI.avatar) + '" aria-label="Hình ' + esc(a) + '">' + esc(a) + '</button>';
    }).join('');
    renderPlayers();
    if (mode !== 'avatar') setTimeout(function () { try { ui.playerName.focus(); } catch (e) { /* bỏ qua */ } }, 50);
  }

  function submitPlayerForm() {
    if (!Players) return;
    const name = ui.playerName.value;
    let ok = false;
    if (PlayersUI.mode === 'add') ok = !!Players.add(name, PlayersUI.avatar);
    else if (PlayersUI.mode === 'rename') ok = Players.rename(Players.active().id, name);
    else if (PlayersUI.mode === 'avatar') ok = Players.setAvatar(Players.active().id, PlayersUI.avatar);
    if (!ok) {
      toast(PlayersUI.mode === 'add' && Players.list().length >= Players.MAX_PLAYERS ? 'Chỉ được tối đa ' + Players.MAX_PLAYERS + ' bạn thôi' : 'Con nhập tên nhé (1–16 chữ)');
      return;
    }
    PlayersUI.mode = null;
    Sfx.play('chime');
    renderPlayers();
    G.greeted = true;
    Voice.say('Chào ' + Players.active().name + '!');
  }

  /** Chào bé theo tên một lần mỗi lần mở trang (khi có thao tác đầu tiên ở menu). */
  function welcome() {
    if (G.greeted || !Players) return;
    G.greeted = true;
    const name = Players.active().name;
    toast('Chào ' + name + ' 👋');
    Voice.say('Chào ' + name + '! Cùng xếp tháp đồng hồ nào!');
  }

  /* ================= CỔNG PHỤ HUYNH ================= */
  /* Câu nhân đơn giản gõ vào ô trong trang (window.prompt bị chặn khi cài như ứng dụng). */
  const Gate = { cb: null, answer: 0 };
  function adultGate(cb) {
    if (!ui.parentGate || !ui.gateForm || !ui.gateInput) {
      let ok = false;
      try { ok = window.confirm('Dành cho phụ huynh, thầy cô. Tiếp tục?'); } catch (e) { ok = false; }
      if (ok && cb) cb();
      return;
    }
    const a = 2 + Math.floor(Math.random() * 8), b = 2 + Math.floor(Math.random() * 8);
    Gate.cb = cb; Gate.answer = a * b;
    ui.gateQ.textContent = 'Dành cho phụ huynh, thầy cô. Để tiếp tục, hãy trả lời: ' + a + ' × ' + b + ' = ?';
    ui.gateInput.value = '';
    ui.parentGate.classList.remove('hidden');
    setTimeout(function () { try { ui.gateInput.focus(); } catch (e) { /* bỏ qua */ } }, 50);
  }
  function closeGate() {
    if (ui.parentGate) ui.parentGate.classList.add('hidden');
    Gate.cb = null;
  }
  function submitGate() {
    const v = Number(String(ui.gateInput.value).trim());
    if (v === Gate.answer) { const cb = Gate.cb; closeGate(); Sfx.play('quizok'); if (cb) cb(); }
    else { Sfx.play('wrong'); toast('Chưa đúng, thử lại nhé'); ui.gateInput.value = ''; }
  }

  /* ================= KẾT QUẢ CỦA BÉ (báo cáo cho phụ huynh) ================= */
  function reviewTime(it) {
    const i = it && it.info;
    return i ? K.mk(i.h, i.m, i.style, i.h24, i.lv) : null;
  }
  /** "7 giờ 45 phút" / "8 giờ kém 15 phút (7 giờ 45 phút)" / "15 giờ (3 giờ chiều)". */
  function describeReview(it) {
    const t = reviewTime(it);
    if (!t) return String(it && it.key || '');
    let s = K.read(t);
    if (t.style === 'kem' && t.m >= 35) s += ' (' + K.readPlain(t) + ')';
    else if (t.h24 != null) s += ' (' + K.readPlain(t) + ' ' + t.period + ')';
    return s;
  }
  function openReport(from) {
    if (inGame()) return;
    G.reportFrom = from === 'players' ? 'players' : 'levels';
    G.state = 'report';
    renderReport();
    showScreen('report');
  }
  function closeReport() {
    if (G.reportFrom === 'players' && Players) { openPlayers(); return; }
    G.state = 'levels';
    renderLevels();
    showScreen('levels');
  }
  function renderReport() {
    const name = Players ? Players.active().name : 'Bé';
    const b = Store.p(), s = b.stats;
    ui.reportTitle.textContent = '📊 Kết quả của ' + name;
    const total = s.correct + s.wrong, acc = total ? Math.round(s.correct / total * 100) : 0;
    const stat = function (v, k) { return '<div class="report-stat"><div class="v">' + v + '</div><div class="k">' + k + '</div></div>'; };
    // Dưới một phút thì ghi theo giây (báo "0 phút luyện tập" sau ba ván là sai)
    const timeV = s.seconds < 60 ? s.seconds : Math.round(s.seconds / 60 * 10) / 10;
    ui.reportStats.innerHTML = stat(s.plays, 'ván đã chơi') + stat(acc + '%', 'trả lời đúng') + stat(timeV, s.seconds < 60 ? 'giây luyện tập' : 'phút luyện tập') + stat(sumStars(b) + (b.badge ? ' 👑' : ''), 'sao');
    // 3 màn yếu nhất: ít nhất 8 câu đã trả lời VÀ sai từ 20 % trở lên – đúng 89 % thì không phải "cần luyện thêm"
    const weak = K.LEVELS.map(function (l) { const t = s.byTopic[l.id]; return t && t.c + t.w >= 8 && t.w / (t.c + t.w) >= 0.2 ? { id: l.id, r: t.w / (t.c + t.w) } : null; })
      .filter(function (x) { return x; }).sort(function (a, c) { return c.r - a.r; }).slice(0, 3);
    ui.reportLevels.innerHTML = K.LEVELS.map(function (l) {
      const r = Store.rec(l.id), t = s.byTopic[l.id] || { c: 0, w: 0 }, n = t.c + t.w;
      const isWeak = weak.some(function (w) { return w.id === l.id; });
      return '<div class="report-row"><span class="t">' + esc(l.icon + ' Màn ' + l.n + ': ' + l.title) + '</span>' +
        '<span class="stars">' + starsHtml(r.stars || 0) + '</span><span>🏆 ' + fmt(r.best || 0) + '</span>' +
        (n ? '<span>' + Math.round(t.c / n * 100) + '% đúng · ' + n + ' câu</span>'
          : r.done ? '<span class="rv-explain">đã chơi ' + r.done + ' lần</span>' : '<span class="rv-explain">chưa chơi</span>') +
        (mastered(l.id) ? '<span class="mastered">✅ Đã thuộc</span>' : '') +
        (isWeak ? '<span class="weak">📌 Cần luyện thêm</span>' : '') + '</div>';
    }).join('');
    const pool = Store.reviewPool();
    ui.reportReview.innerHTML = pool.length ? pool.slice(0, 12).map(function (it) {
      const t = reviewTime(it);
      return '<div class="report-row">' + (t ? K.svg(t, { size: 56, badge: false }) : '') +
        '<span class="t">' + esc(describeReview(it)) + (t ? '<span class="rv-explain">' + esc(K.explainShort(t)) + '</span>' : '') + '</span>' +
        '<span>✖ ' + it.n + '</span></div>';
    }).join('') : '<div class="report-row"><span class="t">Chưa có gì cần ôn — tuyệt vời! 🎉</span></div>';
  }

  function bindReviewList(el, listGetter) {
    el.addEventListener('click', function (e) {
      const it = e.target.closest ? e.target.closest('.review-item') : null;
      if (!it) return;
      const r = listGetter()[Number(it.getAttribute('data-i'))];
      if (!r) return;
      Sfx.unlock();
      Sfx.play('click');
      Voice.say('Đồng hồ chỉ ' + r.speech + '. ' + K.speakable(K.explainShort(r.t)));
      const why = it.querySelector('.rv-why');
      if (why) { why.hidden = !why.hidden; it.setAttribute('aria-expanded', String(!why.hidden)); }
      it.classList.remove('speaking');
      void it.offsetWidth;
      it.classList.add('speaking');
    });
    el.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const it = e.target.closest ? e.target.closest('.review-item') : null;
      if (!it) return;
      e.preventDefault();
      it.click();
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
    click('btn-restart', function () { const l = G.level; if (l) startLevel(l, { slow: G.slow }); });   // giữ 🐢 khi chơi lại
    click('btn-quit', function () { goMenu(); });
    click('btn-quiz', function () { startQuiz(); });
    click('btn-sum-replay', function () { const l = G.level; if (l) startLevel(l); });
    click('btn-sum-home', function () { goMenu(); });
    click('btn-quiz-exit', function () { quizExit(); });
    click('btn-fail-retry', function () { const l = G.level; if (l) startLevel(l, { slow: G.slow }); });   // thử lại vẫn giữ 🐢
    click('btn-fail-slow', function () { const l = G.level; if (!l) return; startLevel(l, { slow: true }); toast('🐢 Chế độ chậm: con có nhiều thời gian hơn nhé!'); });
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
      // Đọc các đáp án theo đúng thứ tự đang hiển thị, đổi ký hiệu (→ × = 17:30) thành lời
      const opts = (Qz.order || []).map(function (o, i) { return ['Một', 'Hai', 'Ba', 'Bốn'][i] + ': ' + K.speakable(o.text); });
      Voice.say(K.speakable(q.speech || q.q) + '. ' + opts.join('. '), { rate: 0.95 });
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

    // Hồ sơ người chơi, báo cáo và cổng phụ huynh
    click('btn-player', function () { openPlayers(); });
    click('btn-players-back', function () { closePlayers(); });
    click('btn-report', function () { openReport('players'); });
    click('btn-report-levels', function () { openReport('levels'); });
    click('btn-report-back', function () { closeReport(); });
    click('btn-report-reset', function () {
      adultGate(function () {
        const name = Players ? Players.active().name : 'bé';
        Store.resetActive();
        renderReport();
        toast('Đã xóa tiến trình của ' + name);
      });
    });
    click('btn-player-add', function () { openPlayerForm('add'); });
    click('btn-player-rename', function () { openPlayerForm('rename'); });
    click('btn-player-avatar', function () { openPlayerForm('avatar'); });
    click('btn-player-cancel', function () { PlayersUI.mode = null; renderPlayers(); });
    click('btn-player-remove', function () {
      if (!Players || Players.list().length <= 1) return;
      adultGate(function () {
        const p = Players.active();
        if (Players.remove(p.id)) { delete Store.data.players[p.id]; Store.save(); toast('Đã xóa ' + p.name); renderPlayers(); }
      });
    });
    if (ui.playerList) ui.playerList.addEventListener('click', function (e) {
      const b = e.target.closest ? e.target.closest('.player-item') : null;
      if (!b || !Players) return;
      Sfx.unlock();
      Sfx.play('click');
      Players.setActive(b.getAttribute('data-id'));
    });
    if (ui.playerForm) ui.playerForm.addEventListener('submit', function (e) { e.preventDefault(); Sfx.unlock(); submitPlayerForm(); });
    if (ui.playerAvatars) ui.playerAvatars.addEventListener('click', function (e) {
      const b = e.target.closest ? e.target.closest('.avatar') : null;
      if (!b) return;
      PlayersUI.avatar = b.getAttribute('data-avatar');
      const all = ui.playerAvatars.children;
      for (let i = 0; i < all.length; i++) all[i].setAttribute('aria-pressed', String(all[i] === b));
    });
    if (ui.gateForm) ui.gateForm.addEventListener('submit', function (e) { e.preventDefault(); Sfx.unlock(); submitGate(); });
    click('btn-parent-gate-cancel', function () { closeGate(); });
    if (Players) Players.onChange(function () {
      renderPlayerChip();
      G.greeted = false;
      if (inGame()) return;                                  // đang chơi: không đụng tới ván đang diễn ra
      if (G.state === 'players') renderPlayers();
      else if (G.state === 'levels') renderLevels();
      else if (G.state === 'report') renderReport();
    });

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
      if (k === 'fx') {
        Store.data.fx = Store.data.fx === 'lite' ? 'full' : 'lite';
        Store.save();
        Motion.refresh();
        renderAudioToggles();
        Sfx.play('click');
        return;
      }
      if (k !== 'sound' && k !== 'music' && k !== 'voice') return;
      Store.data[k] = !(Store.data[k] !== false);
      Store.save();
      applyAudioSettings();
      renderAudioToggles();
      if (Store.data[k] !== false) {
        if (k === 'sound') Sfx.play('pop');
        if (k === 'voice') Voice.say('Chào ' + (Players ? Players.active().name : 'con') + '! Cùng xếp tháp đồng hồ nào!');
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

    ui.levelGrid.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest ? e.target.closest('.level-card') : null;
      if (!card) return;
      e.preventDefault();
      card.click();
    });

    bindReviewList(ui.reviewList, function () { return G.review; });
    bindReviewList(ui.failReviewList, function () { return G.review; });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden && G.state === 'playing') pauseGame();
      if (!document.hidden) { Sfx.unlock(); if (inGame()) requestWake(); }
    });
    window.addEventListener('blur', function () { if (G.state === 'playing') pauseGame(); });
  }

  /* ================= TIỆN ÍCH THIẾT BỊ ================= */
  function requestWake() {
    try {
      if (G.wakeLock) return;
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

  /* ================= LỖI TOÀN CỤC ================= */
  /* Một lỗi bất ngờ không được làm đứng trò chơi: báo nhẹ nhàng, kết thúc ván về menu, không ném lại vào vòng lặp. */
  let errShown = 0;
  function onFatal(msg) {
    if (errShown++ > 2) return;               // không lặp thông báo
    try { console.error('[thap-dong-ho]', msg); } catch (e) { /* bỏ qua */ }
    try {
      toast('Có lỗi nhỏ, con thử lại nhé! 🙏', 2600);
      clearTimeout(G.cdTimer);
      if (inGame() || G.state === 'summary' || G.state === 'quiz' || G.state === 'fail-screen') goMenu();
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
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (!G.bg || (w && h && (w !== G.W || h !== G.H || dpr !== G.dpr))) resize();
    }
    if (!G.bg) return;
    const t0 = performance.now();
    let t1 = t0;
    try {
      update(dt);
      t1 = performance.now();
      render();
    } catch (e) {
      onFatal(e && e.message ? e.message : String(e));   // bỏ khung hình này, requestAnimationFrame vẫn chạy
      return;
    }
    const t2 = performance.now();
    const p = G.perf;
    p.n++; p.update += t1 - t0; p.render += t2 - t1; p.frame += t2 - t0;
    if (p.n >= 60) {
      p.avgUpdate = p.update / p.n; p.avgRender = p.render / p.n; p.avgFrame = p.frame / p.n;
      p.n = 0; p.update = 0; p.render = 0; p.frame = 0;
    }
  }

  function boot() {
    if (Players) { try { Players.load(); } catch (e) { /* bỏ qua */ } }
    Store.load();
    Motion.refresh();
    try {
      const mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mq && mq.addEventListener) mq.addEventListener('change', function () { Motion.refresh(); });
    } catch (e) { /* bỏ qua */ }
    window.addEventListener('error', function (e) { onFatal(e && e.message); });
    window.addEventListener('unhandledrejection', function (e) { onFatal(e && e.reason && e.reason.message ? e.reason.message : String(e && e.reason)); });
    Voice.init();
    Voice.onChange = renderAudioToggles;
    applyAudioSettings();
    renderAudioToggles();
    setTimeout(renderAudioToggles, 1200);
    setTimeout(renderAudioToggles, 3600);
    renderPlayerChip();
    Music.play('menu');
    resize();
    let rt = 0;
    const onResize = function () { clearTimeout(rt); rt = setTimeout(resize, 80); };
    window.addEventListener('resize', onResize);
    // (xoay màn hình: sự kiện resize + kiểm tra mỗi 30 khung hình là đủ, không dựng nền 3–4 lần)
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
    moveTo: moveTo, moveLeft: moveLeft, moveRight: moveRight, stepTo: stepTo, hardDrop: hardDrop, spawnPiece: spawnPiece, landPiece: landPiece, levelClear: levelClear, towerFail: towerFail,
    showSummary: showSummary, startQuiz: startQuiz, quizAnswer: quizAnswer, quizNext: quizNext, quizRetry: quizRetry, quizExit: quizExit,
    update: update, render: render, layout: layout, resize: resize, stackH: stackH, pauseGame: pauseGame, resumeGame: resumeGame,
    onWrong: onWrong, onCorrect: onCorrect, showFail: showFail, speedMul: speedMul, fallTime: fallTime, layoutPlates: layoutPlates, newLabel: newLabel, useHint: useHint,
    starsFor: starsFor, twoStarLimit: twoStarLimit, quizDone: quizDone,
    renderLevels: renderLevels, renderReport: renderReport, openReport: openReport, openPlayers: openPlayers, adultGate: adultGate, closeGate: closeGate,
    submitGate: submitGate, welcome: welcome, showHint: showHint, Motion: Motion, Players: Players,
    domConfetti: domConfetti, weakestLevelN: weakestLevelN, mastered: mastered, syncHud: syncHud, spawnConfetti: spawnConfetti,
    owlState: owlState, owlSay: owlSay
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
