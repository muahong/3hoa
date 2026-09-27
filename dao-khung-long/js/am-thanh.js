/* ============================================================
   am-thanh.js – Tiếng động tổng hợp bằng Web Audio (không tải tệp) và giọng đọc tiếng Việt
   API: window.AmThanh = { mo(), bat(ten), doc(chu), dungDoc(), co: { tieng, giong } }
   ============================================================ */
(function () {
  'use strict';

  const KHOA = 'dkl-am-thanh-v1';
  const co = { tieng: true, giong: true };
  try {
    const s = JSON.parse(window.localStorage.getItem(KHOA) || 'null');
    if (s && typeof s === 'object') { co.tieng = s.tieng !== false; co.giong = s.giong !== false; }
  } catch (e) { /* bỏ qua */ }
  function luuCo() { try { window.localStorage.setItem(KHOA, JSON.stringify(co)); } catch (e) { /* bỏ qua */ } }

  let ac = null;
  let master = null;
  function mo() {
    if (ac) { if (ac.state === 'suspended') ac.resume().catch(function () {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      ac = new AC();
      master = ac.createGain();
      master.gain.value = 0.5;
      master.connect(ac.destination);
    } catch (e) { ac = null; }
    giong.moKhoa();
  }

  function not(tan, luc, dai, kieu, am, truot) {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = kieu || 'sine';
    o.frequency.setValueAtTime(tan, luc);
    if (truot) o.frequency.exponentialRampToValueAtTime(truot, luc + dai);
    g.gain.setValueAtTime(0.0001, luc);
    g.gain.exponentialRampToValueAtTime(am || 0.3, luc + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, luc + dai);
    o.connect(g); g.connect(master);
    o.start(luc); o.stop(luc + dai + 0.05);
  }
  function on(luc, dai, am, tanLoc) {
    const n = Math.floor(ac.sampleRate * dai);
    const buf = ac.createBuffer(1, n, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const f = ac.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = tanLoc || 1200; f.Q.value = 0.8;
    const g = ac.createGain();
    g.gain.value = am || 0.25;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(luc);
  }

  const TIENG = {
    cham: function (t) { not(660, t, 0.08, 'triangle', 0.18); },
    doi_lan: function (t) { not(420, t, 0.09, 'triangle', 0.16, 560); },
    dung: function (t) { not(784, t, 0.12, 'triangle', 0.3); not(1175, t + 0.09, 0.22, 'triangle', 0.28); },
    sai: function (t) { not(300, t, 0.25, 'sine', 0.25, 190); },
    tang_toc: function (t) { on(t, 0.5, 0.2, 900); not(300, t, 0.45, 'sawtooth', 0.08, 900); },
    qua_mong: function (t) { not(988, t, 0.08, 'sine', 0.2); not(1319, t + 0.06, 0.12, 'sine', 0.18); },
    hoan_thanh: function (t) { [523, 659, 784, 1047].forEach(function (f, i) { not(f, t + i * 0.12, 0.3, 'triangle', 0.26); }); },
    no_trung: function (t) { on(t, 0.25, 0.3, 2400); [659, 880, 1175, 1568].forEach(function (f, i) { not(f, t + 0.2 + i * 0.1, 0.35, 'sine', 0.24); }); },
    dem_nguoc: function (t) { not(523, t, 0.14, 'square', 0.1); },
    xuat_phat: function (t) { not(1047, t, 0.35, 'square', 0.12); },
    go_phim: function (t) { not(880, t, 0.05, 'square', 0.07); }
  };

  function bat(ten) {
    if (!co.tieng || !ac || !TIENG[ten]) return;
    try { TIENG[ten](ac.currentTime + 0.01); } catch (e) { /* bỏ qua */ }
  }

  /* ---------------- Giọng đọc (Web Speech API, ưu tiên giọng cục bộ như "Linh" trên iPad) ---------------- */

  const giong = {
    co: false,
    giong: null,
    daMo: false,
    chon: function () {
      try {
        const ds = window.speechSynthesis.getVoices() || [];
        const vi = ds.filter(function (v) { return /^vi([-_]|$)/i.test(v.lang || ''); });
        this.giong = vi.find(function (v) { return v.localService; }) || vi[0] || null;
        this.co = !!this.giong;
      } catch (e) { this.co = false; }
    },
    khoiDong: function () {
      if (!('speechSynthesis' in window) || typeof window.SpeechSynthesisUtterance === 'undefined') return;
      const self = this;
      this.chon();
      try { window.speechSynthesis.onvoiceschanged = function () { self.chon(); }; } catch (e) { /* bỏ qua */ }
      setTimeout(function () { self.chon(); }, 800);
    },
    moKhoa: function () {
      if (this.daMo || !('speechSynthesis' in window) || typeof window.SpeechSynthesisUtterance === 'undefined') return;
      try { const u = new window.SpeechSynthesisUtterance(' '); u.volume = 0; window.speechSynthesis.speak(u); this.daMo = true; } catch (e) { /* bỏ qua */ }
    }
  };
  giong.khoiDong();

  function doc(chu, tuyChon) {
    if (!co.giong || !giong.co || !chu) return false;
    try {
      const ss = window.speechSynthesis;
      if (!(tuyChon && tuyChon.noiTiep)) ss.cancel();
      const u = new window.SpeechSynthesisUtterance(String(chu).replace(/−/g, ' trừ ').replace(/\+/g, ' cộng ').replace(/=/g, ' bằng '));
      u.voice = giong.giong;
      u.lang = giong.giong.lang || 'vi-VN';
      u.rate = 0.95;
      u.pitch = 1.05;
      ss.speak(u);
      return true;
    } catch (e) { return false; }
  }
  function dungDoc() { try { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } catch (e) { /* bỏ qua */ } }

  window.AmThanh = {
    co: co,
    mo: mo,
    bat: bat,
    doc: doc,
    dungDoc: dungDoc,
    coGiong: function () { return giong.co; },
    datTieng: function (b) { co.tieng = !!b; luuCo(); },
    datGiong: function (b) { co.giong = !!b; luuCo(); if (!b) dungDoc(); }
  };
})();
