/* ============================================================
   audio.js – Âm thanh tổng hợp bằng Web Audio API
   Không cần tải file âm thanh, hoạt động tốt trên iPad/iOS
   (AudioContext chỉ được tạo/mở khóa sau thao tác chạm đầu tiên).
   ============================================================ */
(function () {
  'use strict';

  const Sfx = {
    ctx: null,
    master: null,
    enabled: true,
    _noise: null,
    _lastSwoosh: 0,
    _unlocked: false,

    /** Gọi trong một sự kiện người dùng (pointerdown/click) để mở khóa audio trên iOS. */
    unlock() {
      try {
        if (!this.ctx) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return;
          this.ctx = new AC();
          this.master = this.ctx.createGain();
          this.master.gain.value = this.enabled ? 0.6 : 0;
          this.master.connect(this.ctx.destination);
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
        if (!this._unlocked) {
          // Phát một buffer im lặng để iOS "mở khóa" hẳn đầu ra
          const buf = this.ctx.createBuffer(1, 1, 22050);
          const src = this.ctx.createBufferSource();
          src.buffer = buf;
          src.connect(this.ctx.destination);
          src.start(0);
          this._unlocked = true;
        }
      } catch (e) { /* bỏ qua */ }
    },

    setEnabled(on) {
      this.enabled = !!on;
      if (this.master) this.master.gain.value = this.enabled ? 0.6 : 0;
    },

    _ready() {
      return this.enabled && this.ctx && this.ctx.state === 'running';
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

    /** Nốt nhạc đơn giản với đường bao (envelope). */
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
      g.connect(this.master);
      osc.start(start);
      osc.stop(start + o.dur + 0.05);
    },

    /** Tiếng nhiễu (noise) qua bộ lọc – dùng cho swoosh, splat, nổ. */
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
      src.connect(flt); flt.connect(g); g.connect(this.master);
      src.start(start, Math.random() * 0.5);
      src.stop(start + o.dur + 0.05);
    },

    play(name) {
      if (!this._ready()) return;
      try {
        switch (name) {
          case 'swoosh': {
            const now = performance.now();
            if (now - this._lastSwoosh < 110) return;
            this._lastSwoosh = now;
            this._noiseHit({ dur: 0.16, vol: 0.12, f0: 700, f1: 3200, q: 0.8 });
            break;
          }
          case 'splat':
            this._noiseHit({ dur: 0.12, vol: 0.32, filter: 'lowpass', f0: 900, f1: 200 });
            this._tone(150, { type: 'sine', dur: 0.12, vol: 0.35, slide: 60 });
            break;
          case 'pop':
            this._tone(620, { type: 'sine', dur: 0.07, vol: 0.18, slide: 980 });
            break;
          case 'correct':
            this._tone(523.25, { t: 0, dur: 0.1, vol: 0.32 });
            this._tone(659.25, { t: 0.09, dur: 0.1, vol: 0.32 });
            this._tone(783.99, { t: 0.18, dur: 0.16, vol: 0.34 });
            this._tone(1046.5, { t: 0.3, dur: 0.22, vol: 0.28, type: 'sine' });
            break;
          case 'wrong':
            this._tone(220, { type: 'sawtooth', dur: 0.28, vol: 0.22, slide: 140 });
            this._tone(110, { type: 'square', dur: 0.28, vol: 0.12, slide: 70 });
            break;
          case 'bomb':
            this._noiseHit({ dur: 0.7, vol: 0.55, filter: 'lowpass', f0: 2500, f1: 80, q: 0.7 });
            this._tone(90, { type: 'sine', dur: 0.55, vol: 0.5, slide: 28 });
            break;
          case 'heart':
            this._tone(880, { type: 'sine', dur: 0.12, vol: 0.28 });
            this._tone(1174.7, { type: 'sine', t: 0.1, dur: 0.14, vol: 0.28 });
            this._tone(1760, { type: 'sine', t: 0.2, dur: 0.3, vol: 0.22 });
            break;
          case 'combo':
            [659.25, 783.99, 987.77, 1318.5].forEach((f, i) => this._tone(f, { t: i * 0.06, dur: 0.11, vol: 0.28 }));
            break;
          case 'stage':
            [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this._tone(f, { t: i * 0.09, dur: i === 4 ? 0.4 : 0.14, vol: 0.3, type: 'square' }));
            break;
          case 'tick':
            this._tone(900, { type: 'square', dur: 0.06, vol: 0.18 });
            break;
          case 'go':
            this._tone(1200, { type: 'square', dur: 0.25, vol: 0.25 });
            this._tone(1600, { type: 'square', t: 0.1, dur: 0.3, vol: 0.22 });
            break;
          case 'warn':
            this._tone(1000, { type: 'sine', dur: 0.08, vol: 0.2 });
            break;
          case 'timeup':
            [880, 880, 880].forEach((f, i) => this._tone(f, { t: i * 0.18, dur: 0.14, vol: 0.3, type: 'square' }));
            this._tone(440, { t: 0.6, dur: 0.5, vol: 0.3, type: 'triangle', slide: 300 });
            break;
          case 'lose':
            [523.25, 466.16, 415.3, 349.23].forEach((f, i) => this._tone(f, { t: i * 0.16, dur: 0.22, vol: 0.28, type: 'triangle' }));
            break;
          case 'record':
            [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98].forEach((f, i) => this._tone(f, { t: i * 0.09, dur: i === 5 ? 0.6 : 0.15, vol: 0.3 }));
            this._tone(2093, { t: 0.55, dur: 0.6, vol: 0.15, type: 'sine' });
            break;
          case 'click':
            this._tone(700, { type: 'sine', dur: 0.05, vol: 0.15, slide: 900 });
            break;
          case 'miss':
            this._tone(400, { type: 'sine', dur: 0.15, vol: 0.12, slide: 250 });
            break;
        }
      } catch (e) { /* bỏ qua lỗi audio */ }
    }
  };

  window.Sfx = Sfx;
})();
