/* ============================================================
   audio.js – Âm thanh cho Tháp Đồng Hồ
   - Sfx: hiệu ứng tổng hợp bằng Web Audio (không cần file mp3)
   - Music: nhạc nền chiptune "tích tắc", lập lịch chính xác theo AudioContext
   - Voice: giọng đọc tiếng Việt (Web Speech API) đọc bài học, giờ, câu hỏi
   Tất cả chỉ được mở khóa sau thao tác chạm đầu tiên (yêu cầu của iOS).
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- Tiện ích nốt nhạc ---------------- */
  const NOTE_IDX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const freqCache = {};
  function midiOf(name) {
    const m = /^([A-G])(#?)(\d)$/.exec(name);
    if (!m) return 69;
    return 12 * (Number(m[3]) + 1) + NOTE_IDX[m[1]] + (m[2] ? 1 : 0);
  }
  function noteFreq(name) {
    if (freqCache[name]) return freqCache[name];
    const f = 440 * Math.pow(2, (midiOf(name) - 69) / 12);
    freqCache[name] = f;
    return f;
  }
  /** [[nốt|null, số bước 1/16], ...] -> mảng theo từng bước */
  function expand(seq) {
    const out = [];
    for (let i = 0; i < seq.length; i++) {
      const n = seq[i][0], d = seq[i][1];
      out.push(n ? { note: n, len: d } : null);
      for (let k = 1; k < d; k++) out.push(null);
    }
    return out;
  }
  /** Bass theo hợp âm mỗi ô nhịp: gốc ở phách 1,3 và quãng 5 ở phách 2,4 */
  function bassLine(roots, bouncy) {
    const out = [];
    for (let b = 0; b < roots.length; b++) {
      const root = roots[b];
      const midi = midiOf(root);
      const fifthMidi = midi + 7;
      const fifth = NAMES[fifthMidi % 12] + (Math.floor(fifthMidi / 12) - 1);
      for (let s = 0; s < 16; s++) {
        if (!bouncy) { out.push(s === 0 ? { note: root, len: 14 } : null); continue; }
        if (s % 4 === 0) out.push({ note: root, len: 2 });
        else if (s % 4 === 2) out.push({ note: fifth, len: 2 });
        else out.push(null);
      }
    }
    return out;
  }

  /* ---------------- Bản nhạc ---------------- */
  const TRACKS = {
    // Khi chơi: vui tươi kiểu "tích tắc", 124 BPM, 8 ô nhịp
    game: {
      bpm: 124,
      leadType: 'square', leadVol: 0.075, leadCut: 2500,
      lead: expand([
        ['C5', 2], ['E5', 2], ['G5', 2], ['E5', 2], ['C5', 2], ['E5', 2], ['G5', 4],
        ['A5', 2], ['G5', 2], ['E5', 2], ['G5', 2], ['A5', 2], ['G5', 2], ['E5', 4],
        ['F5', 2], ['A5', 2], ['C6', 2], ['A5', 2], ['F5', 2], ['A5', 2], ['C6', 4],
        ['B5', 2], ['A5', 2], ['G5', 2], ['F5', 2], ['E5', 2], ['D5', 2], ['C5', 4],
        ['G5', 2], ['G5', 2], ['A5', 2], ['B5', 2], ['C6', 4], ['B5', 2], ['A5', 2],
        ['G5', 2], ['E5', 2], ['G5', 2], ['E5', 2], ['D5', 2], ['E5', 2], ['D5', 4],
        ['C5', 2], ['E5', 2], ['G5', 2], ['C6', 2], ['B5', 2], ['G5', 2], ['A5', 4],
        ['G5', 2], ['E5', 2], ['D5', 2], ['E5', 2], ['C5', 8]
      ]),
      bass: bassLine(['C3', 'A2', 'F2', 'G2', 'C3', 'G2', 'C3', 'G2'], true),
      bassVol: 0.12,
      kick: 'x...x...x...x...',
      snare: '....x.......x...',
      hat: 'x.x.x.x.x.x.x.x.'
    },
    // Menu: nhẹ nhàng như tiếng chuông đồng hồ, 84 BPM, rải hợp âm Đô trưởng
    menu: {
      bpm: 84,
      leadType: 'triangle', leadVol: 0.11, leadCut: 3000,
      lead: expand([
        ['E4', 2], ['G4', 2], ['C5', 2], ['G4', 2], ['E4', 2], ['G4', 2], ['C5', 2], ['G4', 2],
        ['D4', 2], ['G4', 2], ['B4', 2], ['G4', 2], ['D4', 2], ['G4', 2], ['B4', 2], ['G4', 2],
        ['C4', 2], ['F4', 2], ['A4', 2], ['F4', 2], ['C4', 2], ['F4', 2], ['A4', 2], ['F4', 2],
        ['D4', 2], ['G4', 2], ['B4', 2], ['D5', 2], ['B4', 2], ['G4', 2], ['D4', 2], ['G4', 2]
      ]),
      bass: bassLine(['C3', 'G2', 'F2', 'G2'], false),
      bassVol: 0.09,
      kick: '', snare: '', hat: '......x.......x.'
    }
  };
  for (const k in TRACKS) TRACKS[k].steps = TRACKS[k].lead.length;

  /* ============================================================
     Sfx – hiệu ứng
     ============================================================ */
  const Sfx = {
    ctx: null,
    master: null,   // âm lượng tổng
    sfx: null,      // nhánh hiệu ứng (bật/tắt riêng)
    enabled: true,
    _noise: null,
    _unlocked: false,

    /** Gọi trong một sự kiện người dùng (pointerdown/click) để mở khóa audio trên iOS. */
    unlock() {
      try {
        if (!this.ctx) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return;
          this.ctx = new AC();
          this.master = this.ctx.createGain();
          this.master.gain.value = 0.6;
          this.master.connect(this.ctx.destination);
          this.sfx = this.ctx.createGain();
          this.sfx.gain.value = this.enabled ? 1 : 0;
          this.sfx.connect(this.master);
          Music._init(this.ctx, this.master);
        }
        const done = () => { Music._kick(); };
        if (this.ctx.state === 'suspended') this.ctx.resume().then(done, done);
        else done();
        if (!this._unlocked) {
          const buf = this.ctx.createBuffer(1, 1, 22050);
          const src = this.ctx.createBufferSource();
          src.buffer = buf;
          src.connect(this.ctx.destination);
          src.start(0);
          this._unlocked = true;
        }
      } catch (e) { /* bỏ qua */ }
      Voice.unlock();
    },

    setEnabled(on) {
      this.enabled = !!on;
      if (this.sfx) this.sfx.gain.value = this.enabled ? 1 : 0;
    },

    _ready() {
      return this.ctx && this.ctx.state === 'running';
    },

    _noiseBuffer() {
      if (this._noise) return this._noise;
      const len = this.ctx.sampleRate * 1.0;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this._noise = buf;
      return buf;
    },

    _tone(freq, opts) {
      const o = Object.assign({ type: 'triangle', t: 0, dur: 0.12, vol: 0.4, attack: 0.005, release: 0.08, slide: null, detune: 0 }, opts || {});
      const ctx = this.ctx;
      const start = ctx.currentTime + o.t;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = o.type;
      osc.frequency.setValueAtTime(freq, start);
      if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), start + o.dur);
      if (o.detune) osc.detune.value = o.detune;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(o.vol, start + o.attack);
      g.gain.setValueAtTime(o.vol, start + Math.max(o.attack, o.dur - o.release));
      g.gain.exponentialRampToValueAtTime(0.0001, start + o.dur + 0.02);
      osc.connect(g);
      g.connect(this.sfx);
      osc.start(start);
      osc.stop(start + o.dur + 0.05);
    },

    _noiseHit(opts) {
      const o = Object.assign({ t: 0, dur: 0.15, vol: 0.3, filter: 'bandpass', f0: 1000, f1: null, q: 1 }, opts || {});
      const ctx = this.ctx;
      const start = ctx.currentTime + o.t;
      const src = ctx.createBufferSource();
      src.buffer = this._noiseBuffer();
      const flt = ctx.createBiquadFilter();
      flt.type = o.filter;
      flt.Q.value = o.q;
      flt.frequency.setValueAtTime(o.f0, start);
      if (o.f1) flt.frequency.exponentialRampToValueAtTime(Math.max(30, o.f1), start + o.dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(o.vol, start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, start + o.dur);
      src.connect(flt); flt.connect(g); g.connect(this.sfx);
      src.start(start, Math.random() * 0.5);
      src.stop(start + o.dur + 0.05);
    },

    play(name) {
      if (!this.enabled || !this._ready()) return;
      try {
        switch (name) {
          case 'click':
            this._tone(700, { type: 'sine', dur: 0.05, vol: 0.15, slide: 900 });
            break;
          case 'move':                                  // dịch đồng hồ sang cột khác
            this._tone(520, { type: 'sine', dur: 0.05, vol: 0.14, slide: 700 });
            break;
          case 'drop':                                  // thả nhanh
            this._noiseHit({ dur: 0.18, vol: 0.12, filter: 'bandpass', f0: 600, f1: 2400, q: 0.8 });
            this._tone(300, { type: 'triangle', dur: 0.16, vol: 0.12, slide: 900 });
            break;
          case 'land':                                  // đồng hồ chạm tháp (sai)
            this._noiseHit({ dur: 0.3, vol: 0.32, filter: 'lowpass', f0: 1600, f1: 150, q: 0.8 });
            this._tone(110, { type: 'sine', dur: 0.26, vol: 0.34, slide: 45 });
            break;
          case 'pop':                                   // đồng hồ nổ lấp lánh (đúng)
            this._noiseHit({ dur: 0.16, vol: 0.14, f0: 2400, f1: 5000, q: 1.2 });
            this._tone(523.25, { t: 0, dur: 0.1, vol: 0.3 });
            this._tone(659.25, { t: 0.08, dur: 0.1, vol: 0.3 });
            this._tone(783.99, { t: 0.16, dur: 0.16, vol: 0.32 });
            this._tone(1046.5, { t: 0.27, dur: 0.24, vol: 0.26, type: 'sine' });
            break;
          case 'wrong':
            this._tone(220, { type: 'sawtooth', dur: 0.28, vol: 0.2, slide: 140 });
            this._tone(110, { type: 'square', dur: 0.28, vol: 0.1, slide: 70 });
            break;
          case 'sweep':                                 // dọn đá khỏi tháp
            this._noiseHit({ dur: 0.35, vol: 0.18, f0: 800, f1: 4000, q: 0.7 });
            this._tone(880, { type: 'sine', dur: 0.12, vol: 0.18, slide: 1400 });
            break;
          case 'combo':
            [659.25, 783.99, 987.77, 1318.5].forEach((f, i) => this._tone(f, { t: i * 0.06, dur: 0.11, vol: 0.28 }));
            break;
          case 'stage':
            [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this._tone(f, { t: i * 0.09, dur: i === 4 ? 0.4 : 0.14, vol: 0.3, type: 'square' }));
            break;
          case 'clear':                                 // hoàn thành màn
            [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98].forEach((f, i) => this._tone(f, { t: i * 0.09, dur: i === 5 ? 0.6 : 0.15, vol: 0.3 }));
            this._tone(2093, { t: 0.55, dur: 0.6, vol: 0.15, type: 'sine' });
            break;
          case 'chime':                                 // tiếng chuông đồng hồ
            [1046.5, 1318.5, 1567.98, 2093].forEach((f, i) => this._tone(f, { t: i * 0.12, dur: 0.5, vol: 0.14, type: 'sine' }));
            break;
          case 'tick':
            this._tone(900, { type: 'square', dur: 0.06, vol: 0.18 });
            break;
          case 'tock':
            this._tone(600, { type: 'square', dur: 0.06, vol: 0.14 });
            break;
          case 'go':
            this._tone(1200, { type: 'square', dur: 0.25, vol: 0.25 });
            this._tone(1600, { type: 'square', t: 0.1, dur: 0.3, vol: 0.22 });
            break;
          case 'hint':
            this._tone(1318.5, { type: 'sine', dur: 0.1, vol: 0.14 });
            this._tone(1567.98, { type: 'sine', t: 0.1, dur: 0.16, vol: 0.14 });
            break;
          case 'quizok':
            this._tone(783.99, { t: 0, dur: 0.12, vol: 0.3 });
            this._tone(1046.5, { t: 0.1, dur: 0.12, vol: 0.3 });
            this._tone(1318.5, { t: 0.2, dur: 0.3, vol: 0.28, type: 'sine' });
            break;
          case 'quizbad':
            this._tone(330, { type: 'triangle', dur: 0.2, vol: 0.22, slide: 260 });
            this._tone(260, { type: 'triangle', t: 0.18, dur: 0.28, vol: 0.2, slide: 200 });
            break;
          case 'unlock':                                // mở khóa màn mới
            [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this._tone(f, { t: i * 0.08, dur: 0.14, vol: 0.28, type: 'square' }));
            this._tone(1568, { t: 0.36, dur: 0.5, vol: 0.2, type: 'sine' });
            this._noiseHit({ t: 0.36, dur: 0.4, vol: 0.12, f0: 3000, f1: 6000, q: 1 });
            break;
          case 'lose':                                  // tháp đổ
            this._noiseHit({ dur: 0.8, vol: 0.45, filter: 'lowpass', f0: 2200, f1: 80, q: 0.7 });
            [523.25, 466.16, 415.3, 349.23].forEach((f, i) => this._tone(f, { t: 0.2 + i * 0.16, dur: 0.22, vol: 0.26, type: 'triangle' }));
            break;
          case 'record':
            [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98].forEach((f, i) => this._tone(f, { t: i * 0.09, dur: i === 5 ? 0.6 : 0.15, vol: 0.3 }));
            this._tone(2093, { t: 0.55, dur: 0.6, vol: 0.15, type: 'sine' });
            break;
          case 'applause':
            for (let i = 0; i < 40; i++) {
              this._noiseHit({ t: Math.random() * 1.8, dur: 0.05 + Math.random() * 0.06, vol: 0.05 + Math.random() * 0.06, f0: 1800 + Math.random() * 2500, q: 1.2 });
            }
            break;
        }
      } catch (e) { /* bỏ qua lỗi audio */ }
    }
  };

  /* ============================================================
     Music – nhạc nền
     ============================================================ */
  const Music = {
    enabled: true,
    ctx: null,
    gain: null,
    duckGain: null,
    track: null,
    trackName: null,
    wanted: null,
    step: 0,
    nextTime: 0,
    timer: null,
    tempoMul: 1,

    _init(ctx, master) {
      this.ctx = ctx;
      this.gain = ctx.createGain();
      this.gain.gain.value = 0.24;
      this.duckGain = ctx.createGain();
      this.duckGain.gain.value = 1;
      this.gain.connect(this.duckGain);
      this.duckGain.connect(master);
    },

    /** Yêu cầu phát bản nhạc (menu | game). Tự bắt đầu khi audio được mở khóa. */
    play(name) {
      this.wanted = name;
      this._kick();
    },

    stop() {
      this.wanted = null;
      this._halt();
    },

    _halt() {
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
      this.trackName = null;
      this.track = null;
    },

    _kick() {
      if (!this.enabled || !this.wanted || !this.ctx || this.ctx.state !== 'running') return;
      if (this.trackName === this.wanted && this.timer) return;
      this._halt();
      this.track = TRACKS[this.wanted];
      if (!this.track) return;
      this.trackName = this.wanted;
      this.step = 0;
      this.nextTime = this.ctx.currentTime + 0.08;
      const self = this;
      this.timer = setInterval(function () { self._tick(); }, 25);
    },

    setEnabled(on) {
      this.enabled = !!on;
      if (!this.enabled) this._halt(); else this._kick();
    },

    setTempo(mul) {
      this.tempoMul = mul || 1;
    },

    /** Hạ nhỏ nhạc theo từng nguồn (voice, pause...); mức hiệu lực là mức nhỏ nhất đang bật. */
    ducks: {},
    setDuck(key, level) {
      if (level == null) delete this.ducks[key]; else this.ducks[key] = level;
      if (!this.duckGain || !this.ctx) return;
      let v = 1;
      for (const k in this.ducks) v = Math.min(v, this.ducks[k]);
      this.duckGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.06);
    },
    duck(on, level) {
      this.setDuck('voice', on ? (level == null ? 0.35 : level) : null);
    },

    _tick() {
      const ctx = this.ctx, tr = this.track;
      if (!ctx || !tr) return;
      const stepDur = 60 / (tr.bpm * this.tempoMul) / 4;
      if (this.nextTime < ctx.currentTime - 0.5) this.nextTime = ctx.currentTime + 0.05;  // sau khi tab bị ẩn
      while (this.nextTime < ctx.currentTime + 0.14) {
        this._schedule(this.step, this.nextTime, stepDur);
        this.step = (this.step + 1) % tr.steps;
        this.nextTime += stepDur;
      }
    },

    _schedule(i, t, stepDur) {
      const tr = this.track;
      const L = tr.lead[i];
      if (L) this._note(noteFreq(L.note), t, L.len * stepDur * 0.9, tr.leadType, tr.leadVol, tr.leadCut);
      const B = tr.bass[i];
      if (B) this._note(noteFreq(B.note), t, B.len * stepDur * 0.85, 'triangle', tr.bassVol, 900);
      const p = i % 16;
      if (tr.kick[p] === 'x') this._kickDrum(t);
      if (tr.snare[p] === 'x') this._snare(t);
      if (tr.hat[p] === 'x') this._hat(t, p % 4 === 0 ? 0.05 : 0.03);
    },

    _note(freq, t, dur, type, vol, cutoff) {
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      const flt = ctx.createBiquadFilter();
      flt.type = 'lowpass';
      flt.frequency.value = cutoff;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
      g.gain.setValueAtTime(vol, t + Math.max(0.02, dur * 0.55));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(flt); flt.connect(g); g.connect(this.gain);
      osc.start(t);
      osc.stop(t + dur + 0.03);
    },

    _kickDrum(t) {
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.35, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      osc.connect(g); g.connect(this.gain);
      osc.start(t); osc.stop(t + 0.16);
    },

    _snare(t) {
      const ctx = this.ctx;
      const src = ctx.createBufferSource();
      src.buffer = Sfx._noiseBuffer();
      const flt = ctx.createBiquadFilter();
      flt.type = 'bandpass'; flt.frequency.value = 1800; flt.Q.value = 0.8;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.16, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
      src.connect(flt); flt.connect(g); g.connect(this.gain);
      src.start(t, Math.random() * 0.5); src.stop(t + 0.13);
    },

    _hat(t, vol) {
      const ctx = this.ctx;
      const src = ctx.createBufferSource();
      src.buffer = Sfx._noiseBuffer();
      const flt = ctx.createBiquadFilter();
      flt.type = 'highpass'; flt.frequency.value = 7000;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
      src.connect(flt); flt.connect(g); g.connect(this.gain);
      src.start(t, Math.random() * 0.5); src.stop(t + 0.05);
    }
  };

  /* ============================================================
     Voice – giọng đọc tiếng Việt (Web Speech API)
     ============================================================ */
  const Voice = {
    enabled: true,
    supported: false,
    available: false,
    voice: null,
    _unlocked: false,
    _speaking: false,

    init() {
      if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return;
      this.supported = true;
      const self = this;
      const pick = function () {
        try {
          const vs = window.speechSynthesis.getVoices() || [];
          const vi = vs.filter(function (v) { return /^vi([-_]|$)/i.test(v.lang || ''); });
          // Ưu tiên giọng cục bộ (iPad: "Linh"), sau đó giọng Google
          self.voice = vi.find(function (v) { return v.localService; }) || vi[0] || null;
          self.available = !!self.voice;
        } catch (e) { /* bỏ qua */ }
      };
      pick();
      try { window.speechSynthesis.onvoiceschanged = pick; } catch (e) { /* bỏ qua */ }
      setTimeout(pick, 800);
      setTimeout(pick, 3000);
    },

    /** Mở khóa trong thao tác người dùng (iOS cần một lần speak trong sự kiện chạm). */
    unlock() {
      if (!this.supported || this._unlocked) return;
      try {
        const u = new SpeechSynthesisUtterance(' ');
        u.volume = 0;
        window.speechSynthesis.speak(u);
        this._unlocked = true;
      } catch (e) { /* bỏ qua */ }
    },

    /** Đọc một câu. opts: { queue: true } để không cắt câu đang đọc; rate, pitch; onstart, onend. */
    say(text, opts) {
      opts = opts || {};
      if (!this.enabled || !this.available || !text) return;
      try {
        const ss = window.speechSynthesis;
        if (!opts.queue) ss.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.voice = this.voice;
        u.lang = this.voice.lang || 'vi-VN';
        u.rate = opts.rate || 1.0;
        u.pitch = opts.pitch || 1.05;
        u.volume = 1;
        const self = this;
        u.onstart = function () { self._speaking = true; Music.duck(true, 0.3); if (opts.onstart) opts.onstart(); };
        u.onend = u.onerror = function () {
          self._speaking = false;
          if (!ss.pending && !ss.speaking) Music.duck(false);
          if (opts.onend) opts.onend();
        };
        ss.speak(u);
      } catch (e) { /* bỏ qua */ }
    },

    stop() {
      try { if (this.supported) window.speechSynthesis.cancel(); } catch (e) { /* bỏ qua */ }
      this._speaking = false;
      Music.duck(false);
    },

    setEnabled(on) {
      this.enabled = !!on;
      if (!this.enabled) this.stop();
    }
  };

  window.Sfx = Sfx;
  window.Music = Music;
  window.Voice = Voice;
})();
