/* ============================================================
   am-thanh.js – Tiếng động tổng hợp bằng Web Audio (không tải tệp) và giọng đọc tiếng Việt
   API: window.AmThanh = { mo(), bat(ten), doc(chu), docChuoi(ds), chuanHoa(chu) (chữ sẽ đọc: đơn vị, nhóm số, dấu phép tính),
        dungDoc(), co: { tieng, giong } }
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
    // iOS để 'interrupted' (cuộc gọi, Siri, ra nền) chứ không chỉ 'suspended': khác 'running' là mở lại
    if (ac) { if (ac.state !== 'running' && ac.state !== 'closed') { try { ac.resume().catch(function () {}); } catch (e) { /* bỏ qua */ } } return; }
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
    go_phim: function (t) { not(880, t, 0.05, 'square', 0.07); },
    // Hang Khủng Long: mặc đồ, mở quà, và "phép" của từng món đồ khi bé làm đúng (js/phu-kien.js)
    mac_do: function (t) { on(t, 0.18, 0.18, 3000); not(523, t + 0.05, 0.14, 'triangle', 0.2); not(784, t + 0.14, 0.2, 'triangle', 0.22); },
    mo_qua: function (t) { on(t, 0.35, 0.25, 1800); [784, 988, 1175, 1568, 1976].forEach(function (f, i) { not(f, t + 0.15 + i * 0.07, 0.3, 'sine', 0.2); }); },
    phep_bay: function (t) { on(t, 0.4, 0.14, 700); not(660, t, 0.3, 'sine', 0.12, 990); },
    phep_lua: function (t) { on(t, 0.45, 0.22, 500); not(220, t, 0.35, 'sawtooth', 0.06, 440); },
    phep_sao: function (t) { [1319, 1568, 2093].forEach(function (f, i) { not(f, t + i * 0.06, 0.18, 'sine', 0.14); }); },
    phep_veo: function (t) { not(300, t, 0.25, 'triangle', 0.14, 1400); on(t + 0.05, 0.2, 0.1, 2500); },
    phep_chuong: function (t) { [0, 0.09, 0.18].forEach(function (d) { not(1760, t + d, 0.12, 'square', 0.05); not(2349, t + d + 0.03, 0.1, 'sine', 0.08); }); },
    phep_leng_keng: function (t) { [2093, 2637, 2349, 3136].forEach(function (f, i) { not(f, t + i * 0.07, 0.16, 'triangle', 0.1); }); },
    phep_giap: function (t) { not(196, t, 0.2, 'square', 0.1, 150); not(1568, t + 0.04, 0.4, 'triangle', 0.14); not(2093, t + 0.06, 0.35, 'sine', 0.1); }
  };

  function bat(ten) {
    if (!co.tieng || !ac || !TIENG[ten]) return;
    try { TIENG[ten](ac.currentTime + 0.01); } catch (e) { /* bỏ qua */ }
  }

  /* ---------------- Giọng đọc (Web Speech API, ưu tiên giọng cục bộ như "Linh" trên iPad) ---------------- */

  const nguoiNgheGiong = [];
  let trangThai = 'khong_co';
  function baoGiong() { nguoiNgheGiong.forEach(function (fn) { fn(); }); }
  function nhanGiong() {
    return trangThai === 'co' ? 'Giọng đọc: ' + (co.giong ? 'Bật' : 'Tắt') : trangThai === 'dang_tai' ? 'Đang tải giọng Việt' : 'Chưa có giọng Việt';
  }
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
        trangThai = this.co ? 'co' : ds.length ? 'khong_co' : 'dang_tai';
      } catch (e) { this.co = false; trangThai = 'khong_co'; }
      baoGiong();
    },
    khoiDong: function () {
      if (!('speechSynthesis' in window) || typeof window.SpeechSynthesisUtterance === 'undefined') return;
      const self = this;
      this.chon();
      try {
        if (window.speechSynthesis.addEventListener) window.speechSynthesis.addEventListener('voiceschanged', function () { self.chon(); });
        else window.speechSynthesis.onvoiceschanged = function () { self.chon(); };
      } catch (e) { /* bỏ qua */ }
      setTimeout(function () { self.chon(); }, 800);
    },
    moKhoa: function () {
      if (this.daMo || !('speechSynthesis' in window) || typeof window.SpeechSynthesisUtterance === 'undefined') return;
      try { const u = new window.SpeechSynthesisUtterance(' '); u.volume = 0; window.speechSynthesis.speak(u); this.daMo = true; } catch (e) { /* bỏ qua */ }
    }
  };
  giong.khoiDong();

  /*
   * Chuẩn hóa chữ trước khi đọc: bỏ khoảng trắng nhóm ba chữ số ("1 000" đọc là "một nghìn", không phải "một, không trăm"),
   * đơn vị viết tắt đứng sau một số thành chữ đầy đủ ("5 kg" → "5 ki-lô-gam"), dấu phép tính thành chữ.
   * Chữ thường không bị đụng tới: đơn vị chỉ đổi khi đứng ngay sau một số và không dính chữ cái nào phía sau ("3 máy" giữ nguyên).
   */
  const CHU_CAI = 'A-Za-z\\u00C0-\\u024F\\u1E00-\\u1EFF';
  const DON_VI = [['km', 'ki-lô-mét'], ['kg', 'ki-lô-gam'], ['cm', 'xăng-ti-mét'], ['dm', 'đề-xi-mét'], ['mm', 'mi-li-mét'], ['m', 'mét'], ['l', 'lít'], ['g', 'gam'], ['đ', 'đồng']];
  const RE_DON_VI = new RegExp('(\\d)[ \\u00a0\\u202f\\u2009]?(' + DON_VI.map(function (x) { return x[0]; }).join('|') + ')(?![' + CHU_CAI + '0-9])', 'g');
  const TEN_DON_VI = {};
  DON_VI.forEach(function (x) { TEN_DON_VI[x[0]] = x[1]; });
  // Số có nhóm ba chữ số: 1-3 chữ số, rồi một hay nhiều nhóm (khoảng trắng + đúng 3 chữ số), không dính chữ số nào hai đầu
  const RE_NHOM_SO = /(^|[^\d.,])(\d{1,3}(?:[    ]\d{3})+)(?!\d)/g;
  function chuanHoaDoc(chu) {
    let t = String(chu == null ? '' : chu);
    t = t.replace(RE_NHOM_SO, function (m, truoc, so) { return truoc + so.replace(/[    ]/g, ''); });
    t = t.replace(RE_DON_VI, function (m, so, dv) { return so + ' ' + TEN_DON_VI[dv]; });
    return t.replace(/−/g, ' trừ ').replace(/\+/g, ' cộng ').replace(/×/g, ' nhân ').replace(/(\d)\s*:\s*(\d)/g, '$1 chia $2').replace(/=/g, ' bằng ');
  }

  function doc(chu, tuyChon) {
    if (!co.giong || !chu) return false;
    giong.chon();
    if (!giong.co) return false;
    try {
      const ss = window.speechSynthesis;
      if (!(tuyChon && tuyChon.noiTiep)) ss.cancel();
      const u = new window.SpeechSynthesisUtterance(chuanHoaDoc(chu));
      u.voice = giong.giong;
      u.lang = giong.giong.lang || 'vi-VN';
      u.rate = 0.95;
      u.pitch = 1.05;
      u.onerror = function (event) {
        // Replacing or stopping our own utterance is a normal interaction.
        if (event && /^(canceled|interrupted)$/.test(event.error)) return;
        baoDocLoi();
      };
      ss.speak(u);
      return true;
    } catch (e) { baoDocLoi(); return false; }
  }
  function baoDocLoi() {
    if (typeof window.CustomEvent === 'function') window.dispatchEvent(new window.CustomEvent('dkl-doc-loi'));
  }
  function dungDoc() { try { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } catch (e) { /* bỏ qua */ } }
  /** Đọc nối tiếp nhiều câu (lời giải: tên lỗi, từng bước, "Vậy..."): câu đầu cắt lời đang đọc, các câu sau nối theo. */
  function docChuoi(ds) {
    ds = (Array.isArray(ds) ? ds : [ds]).filter(function (x) { return x != null && String(x).trim(); });
    let ok = false;
    ds.forEach(function (c, i) { ok = doc(c, i ? { noiTiep: true } : null) || ok; });
    return ok;
  }

  window.AmThanh = {
    co: co,
    mo: mo,
    bat: bat,
    doc: doc,
    docChuoi: docChuoi,
    chuanHoa: chuanHoaDoc,
    dungDoc: dungDoc,
    coGiong: function () { return giong.co; },
    nhanGiong: nhanGiong,
    trangThaiGiong: function () { return trangThai; },
    theoDoiGiong: function (fn) { nguoiNgheGiong.push(fn); fn(); },
    ganNutDoc: function (btn) {
      if (!btn || btn._giongDaGan) return;
      btn._giongDaGan = true;
      const nhan = btn.getAttribute('aria-label') || btn.textContent || 'Nghe';
      nguoiNgheGiong.push(function () {
        btn.disabled = !giong.co || !co.giong;
        btn.setAttribute('aria-label', btn.disabled ? nhan + '. ' + nhanGiong() : nhan);
        btn.title = btn.disabled ? nhanGiong() + '. Bố mẹ có thể thêm giọng Tiếng Việt trong cài đặt giọng nói của thiết bị.' : nhan;
      });
      nguoiNgheGiong[nguoiNgheGiong.length - 1]();
    },
    datTieng: function (b) { co.tieng = !!b; luuCo(); },
    datGiong: function (b) { co.giong = !!b; luuCo(); if (!b) dungDoc(); baoGiong(); }
  };
})();
