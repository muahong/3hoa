/* ============================================================
   profile.js – Hồ sơ người chơi dùng chung cho các game 3hoa.com
   - Nhiều bé dùng chung một máy: mỗi bé có tên, hình đại diện và tiến trình riêng
   - Lưu ở localStorage khóa '3hoa-players-v1' (chung cho mọi game trên cùng tên miền)
   - Tệp này giống hệt nhau ở mọi game (sao chép nguyên văn), nạp trước game.js
   API: window.Players = { KEY, AVATARS, load, list, active, setActive, add, rename, setAvatar, remove, onChange, esc, chipHtml, cleanName,
                           gateQuestion, gateCheck, gateLockedSeconds, gateLockText, hashPin, dailyLockActive }
   - Cổng phụ huynh dùng chung (trang chủ + 6 game): phép nhân cỡ người lớn hoặc mã bố mẹ, sai 3 lần liền thì tạm khóa.
     Cùng khóa và công thức với cổng phụ huynh của Đảo Khủng Long:
       '3hoa-cong-khoa-v1' = { sai, lan, den }   (số lần sai liền, số lần đã khóa, khóa tới mốc ms; xóa khi trả lời đúng)
       '3hoa-ma-bo-me-v1'  = { h }                (FNV-1a 32 bit của '3hoa-pin|' + mã; chỉ đọc, đảo đặt / xóa)
   - Giờ chơi trong ngày: đảo ghi '3hoa-het-gio-v1' = { be, ngay, khoa_ca_trang } khi bé hết giờ. Mở game cũ trực tiếp
     (không có ?dao=1) trong ngày đó thì phủ một lớp báo "đủ giờ rồi" lên cả trang. Trang chủ không bao giờ bị khóa.
   ============================================================ */
(function () {
  'use strict';

  const KEY = '3hoa-players-v1';
  const AVATARS = ['🐯', '🦉', '🚀', '🐼', '🦊', '🐸', '🦄', '🐧', '🐻', '🐨', '🦁', '🐰', '🐙', '🦖', '🐬', '🐝'];
  const MAX_PLAYERS = 8;
  const NAME_MAX = 16;
  const DEFAULT_ID = 'p1';

  const esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  /** Bỏ các khóa nguy hiểm khi đọc JSON từ localStorage. */
  function reviver(k, v) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') return undefined;
    return v;
  }

  function cleanName(s) {
    s = String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim();
    if (s.length > NAME_MAX) s = s.slice(0, NAME_MAX).trim();
    return s;
  }

  function cleanId(s) {
    s = String(s == null ? '' : s);
    return /^[A-Za-z0-9_-]{1,24}$/.test(s) ? s : '';
  }

  function now() { return Date.now(); }

  function uid(existing) {
    let id;
    do {
      id = 'p' + now().toString(36) + Math.floor(Math.random() * 1679616).toString(36);
    } while (existing.some(function (p) { return p.id === id; }));
    return id;
  }

  const state = { v: 1, active: DEFAULT_ID, players: [] };
  const listeners = [];

  function read() {
    let d = null;
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) d = JSON.parse(raw, reviver);
    } catch (e) { d = null; }
    const players = [];
    if (d && typeof d === 'object' && Array.isArray(d.players)) {
      for (let i = 0; i < d.players.length && players.length < MAX_PLAYERS; i++) {
        const p = d.players[i];
        if (!p || typeof p !== 'object') continue;
        const id = cleanId(p.id);
        if (!id || players.some(function (q) { return q.id === id; })) continue;
        const name = cleanName(p.name) || 'Bé';
        const avatar = AVATARS.indexOf(p.avatar) >= 0 ? p.avatar : AVATARS[0];
        const created = typeof p.created === 'number' && p.created > 0 ? p.created : now();
        const updated = typeof p.updated === 'number' && p.updated > 0 ? p.updated : created;
        players.push({ id: id, name: name, avatar: avatar, created: created, updated: updated });
      }
    }
    state.players = players;
    state.active = d && typeof d === 'object' ? cleanId(d.active) : '';
    ensure();
  }

  function ensure() {
    if (!state.players.length) {
      const t = now();
      state.players.push({ id: DEFAULT_ID, name: 'Bé', avatar: AVATARS[0], created: t, updated: t });
    }
    if (!state.players.some(function (p) { return p.id === state.active; })) state.active = state.players[0].id;
  }

  function write() {
    try { window.localStorage.setItem(KEY, JSON.stringify({ v: 1, active: state.active, players: state.players })); } catch (e) { /* bỏ qua (hết chỗ, chế độ riêng tư...) */ }
  }

  function emit() {
    const a = active();
    for (let i = 0; i < listeners.length; i++) {
      try { listeners[i](a); } catch (e) { /* bỏ qua lỗi của người nghe */ }
    }
  }

  function byId(id) {
    for (let i = 0; i < state.players.length; i++) if (state.players[i].id === id) return state.players[i];
    return null;
  }

  function active() {
    ensure();
    return byId(state.active) || state.players[0];
  }

  function list() {
    return state.players.map(function (p) { return { id: p.id, name: p.name, avatar: p.avatar, created: p.created, updated: p.updated }; });
  }

  function setActive(id) {
    const p = byId(cleanId(id));
    if (!p) return false;
    if (state.active !== p.id) {
      state.active = p.id;
      p.updated = now();
      write();
      emit();
    }
    return true;
  }

  function add(name, avatar) {
    name = cleanName(name);
    if (!name) return null;
    if (state.players.length >= MAX_PLAYERS) return null;
    if (AVATARS.indexOf(avatar) < 0) avatar = AVATARS[state.players.length % AVATARS.length];
    const t = now();
    const p = { id: uid(state.players), name: name, avatar: avatar, created: t, updated: t };
    state.players.push(p);
    state.active = p.id;
    write();
    emit();
    return { id: p.id, name: p.name, avatar: p.avatar, created: p.created, updated: p.updated };
  }

  function rename(id, name) {
    const p = byId(cleanId(id));
    name = cleanName(name);
    if (!p || !name) return false;
    p.name = name;
    p.updated = now();
    write();
    emit();
    return true;
  }

  function setAvatar(id, avatar) {
    const p = byId(cleanId(id));
    if (!p || AVATARS.indexOf(avatar) < 0) return false;
    p.avatar = avatar;
    p.updated = now();
    write();
    emit();
    return true;
  }

  function remove(id) {
    id = cleanId(id);
    if (state.players.length <= 1) return false;
    const idx = state.players.findIndex(function (p) { return p.id === id; });
    if (idx < 0) return false;
    state.players.splice(idx, 1);
    ensure();
    write();
    emit();
    return true;
  }

  function onChange(fn) {
    if (typeof fn === 'function') listeners.push(fn);
    return function () { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); };
  }

  function chipHtml(p) {
    p = p || active();
    return '<span class="pl-avatar" aria-hidden="true">' + esc(p.avatar) + '</span><span class="pl-name">' + esc(p.name) + '</span>';
  }

  // Đồng bộ khi tab/game khác đổi người chơi
  try {
    window.addEventListener('storage', function (e) {
      if (!e || e.key !== KEY) return;
      const before = state.active;
      read();
      if (state.active !== before) emit();
    });
  } catch (e) { /* bỏ qua */ }

  read();

  /* ---------- Đọc JSON nhỏ từ localStorage (an toàn) ---------- */
  function isObj(o) { return !!o && typeof o === 'object' && !Array.isArray(o); }
  function readJson(key) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw || raw.length > 2000) return null;
      const d = JSON.parse(raw, reviver);
      return isObj(d) ? d : null;
    } catch (e) { return null; }
  }
  /** Số nguyên 0..max; sai kiểu hoặc ngoài khoảng thì 0 (cùng cách lọc với cổng của đảo). */
  function intOr0(v, max) {
    v = typeof v === 'number' ? Math.floor(v) : NaN;
    return v >= 0 && v <= max ? v : 0;
  }

  /* ---------- Cổng phụ huynh dùng chung ---------- */
  const GATE_KEY = '3hoa-cong-khoa-v1';
  const PIN_KEY = '3hoa-ma-bo-me-v1';
  const GATE_TRIES = 3;                  // sai 3 lần liền thì tạm khóa
  const LOCK_BASE = 60000;               // lần khóa thứ n: 60 giây × 2^(n-1)
  const LOCK_MAX = 15 * 60000;           // tối đa 15 phút
  const PIN_TEXT = 'Nhập mã bố mẹ (4 số) đã đặt trong Góc phụ huynh của Đảo Khủng Long';
  const gate = { a: 0, b: 0, live: false };
  let memLock = null;                    // bản dự phòng khi localStorage không dùng được (chế độ riêng tư…)

  /** FNV-1a 32 bit (theo đơn vị UTF-16) của '3hoa-pin|' + mã → 8 chữ số hex thường. Giống hệt cách đảo lưu mã. */
  function hashPin(pin) {
    const s = '3hoa-pin|' + String(pin == null ? '' : pin);
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
    return h.toString(16).padStart(8, '0');
  }
  function pinHash() {
    const d = readJson(PIN_KEY);
    return d && typeof d.h === 'string' && /^[0-9a-f]{8}$/.test(d.h) ? d.h : '';
  }

  /** Hồ sơ lần thử đã lọc kiểu / khoảng: { sai: 0..2, lan: 0..60, den: mốc ms hoặc 0 }. */
  function readLock() {
    let d = null;
    try {
      window.localStorage.getItem(GATE_KEY);   // thử truy cập: ném lỗi → dùng bản trong bộ nhớ
      d = readJson(GATE_KEY);
    } catch (e) { d = memLock; }
    const out = { sai: 0, lan: 0, den: 0 };
    if (!isObj(d)) return out;
    out.sai = intOr0(d.sai, GATE_TRIES - 1);
    out.lan = intOr0(d.lan, 60);
    const den = typeof d.den === 'number' && Number.isFinite(d.den) ? d.den : 0;
    // mốc khóa xa hơn mức tối đa (đồng hồ máy bị lùi, dữ liệu hỏng) không được khóa mãi
    out.den = den > now() && den <= now() + LOCK_MAX ? den : 0;
    return out;
  }
  function writeLock(rec) {
    memLock = rec;
    try {
      if (rec) window.localStorage.setItem(GATE_KEY, JSON.stringify(rec));
      else window.localStorage.removeItem(GATE_KEY);
    } catch (e) { /* bỏ qua */ }
  }

  function gateLockedSeconds() {
    const den = readLock().den;
    return den > now() ? Math.ceil((den - now()) / 1000) : 0;
  }
  function gateLockText() {
    const s = Math.max(1, gateLockedSeconds());
    const t = s >= 60 ? Math.ceil(s / 60) + ' phút' : s + ' giây';
    return '🔒 Cổng phụ huynh tạm khóa vì trả lời sai nhiều lần. Thử lại sau ' + t + ' nhé!';
  }

  /** Câu hỏi mới: { text, pin }. Có mã bố mẹ thì hỏi mã; không thì một phép nhân cỡ người lớn (khác câu vừa hỏi). */
  function gateQuestion() {
    if (pinHash()) { gate.live = true; return { text: PIN_TEXT, pin: true }; }
    let a, b;
    do {
      a = 12 + Math.floor(Math.random() * 38);   // 12..49, không tròn chục, không tận cùng bằng 1
      b = 3 + Math.floor(Math.random() * 7);     // 3..9, bỏ 5
    } while (a % 10 === 0 || a % 10 === 1 || b === 5 || (a === gate.a && b === gate.b));
    gate.a = a; gate.b = b; gate.live = true;
    return { text: 'Dành cho phụ huynh, thầy cô. Để tiếp tục, hãy trả lời: ' + a + ' × ' + b + ' = ?', pin: false };
  }

  /** Kiểm tra câu trả lời: 'ok' | 'wrong' (người gọi phải hỏi câu mới) | 'locked'. Mỗi câu chỉ được trả lời một lần. */
  function gateCheck(value) {
    const rec = readLock();
    const live = gate.live;
    gate.live = false;
    if (rec.den) return 'locked';
    const v = String(value == null ? '' : value).trim();
    const h = pinHash();
    const ok = h ? v !== '' && hashPin(v) === h
      : live && /^\d{1,4}$/.test(v) && Number(v) === gate.a * gate.b;
    if (ok) { writeLock(null); return 'ok'; }
    rec.sai++;
    if (rec.sai >= GATE_TRIES) {
      rec.lan = Math.min(60, rec.lan + 1);
      rec.sai = 0;
      rec.den = now() + Math.min(LOCK_MAX, LOCK_BASE * Math.pow(2, rec.lan - 1));
      writeLock(rec);
      return 'locked';
    }
    writeLock(rec);
    return 'wrong';
  }

  /* ---------- Giờ chơi trong ngày (do phụ huynh đặt trong Đảo Khủng Long) ---------- */
  const DAILY_KEY = '3hoa-het-gio-v1';
  const GAME_DIRS = ['/math-ninja/', '/cuu-chuong/', '/me-cung-dong-ho/', '/thap-dong-ho/', '/xe-tang-thoi-gian/', '/cuoi-ho/'];
  const LOCK_ID = 'het-gio-3hoa';

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function todayLocal() {
    const d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  /** Đúng khi bé đã hết giờ hôm nay và trang là một trong 6 game cũ mở trực tiếp (không chạy trong đảo với ?dao=1). */
  function dailyLockActive() {
    let path = '', search = '';
    try { path = String(window.location.pathname || ''); search = String(window.location.search || ''); } catch (e) { return false; }
    if (!GAME_DIRS.some(function (dir) { return path.indexOf(dir) >= 0; })) return false;
    if (/[?&]dao=1(?:&|$)/.test(search)) return false;
    const d = readJson(DAILY_KEY);
    return !!d && d.khoa_ca_trang === true && d.ngay === todayLocal();
  }

  /** Nhãn văn bản dựng bằng DOM + CSSOM (CSP của các trang không cho style / script nội tuyến trong HTML). */
  function el(tag, text, css) {
    const e = document.createElement(tag);
    if (text) e.textContent = text;
    if (css) Object.keys(css).forEach(function (k) { e.style[k] = css[k]; });
    return e;
  }
  const lockUi = { box: null, btn: null, hid: [], guard: false };
  /** Chặn phím và thao tác chạm tới game phía dưới (game nghe ở document / window nên phải chặn ở pha bắt của window). */
  function guardEvent(e) {
    const box = lockUi.box;
    if (!box) return;
    if (e.type === 'keydown' && e.key === 'Tab') {
      e.preventDefault();
      try { lockUi.btn.focus(); } catch (err) { /* bỏ qua */ }
    }
    const t = e.target;
    const inside = !!t && (t === box || (typeof box.contains === 'function' && box.contains(t)));
    if (!inside && e.cancelable && e.type !== 'keydown' && e.type !== 'keyup') e.preventDefault();
    // Enter trên nút / chạm vào nút vẫn giữ hành động mặc định (đi về trang chủ); game không nhận được sự kiện
    e.stopPropagation();
  }
  function showDailyLock() {
    if (!document.body || lockUi.box) return;
    const box = el('div', '', {
      position: 'fixed', top: '0', left: '0', right: '0', bottom: '0', zIndex: '2147483000',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', boxSizing: 'border-box',
      background: 'rgba(24, 28, 58, 0.94)', pointerEvents: 'auto', overflowY: 'auto',
      fontFamily: "'Baloo 2', 'Segoe UI', system-ui, sans-serif", color: '#2d2a4a', textAlign: 'center'
    });
    box.id = LOCK_ID;
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-labelledby', LOCK_ID + '-tieu-de');
    box.setAttribute('aria-describedby', LOCK_ID + '-loi');
    const panel = el('div', '', {
      background: '#fffdf6', borderRadius: '24px', padding: '28px 22px 22px', width: '100%', maxWidth: '440px',
      boxSizing: 'border-box', boxShadow: '0 12px 40px rgba(0, 0, 0, 0.35)'
    });
    const icon = el('div', '🌙', { fontSize: '64px', lineHeight: '1.1' });
    icon.setAttribute('aria-hidden', 'true');
    const title = el('h2', 'Hôm nay con chơi đủ giờ rồi!', { margin: '10px 0 8px', fontSize: '28px', lineHeight: '1.25', color: '#3b2f86' });
    title.id = LOCK_ID + '-tieu-de';
    const msg = el('p', 'Bố mẹ đã đặt giờ chơi trong Đảo Khủng Long. Mai mình chơi tiếp nhé!', { margin: '0 0 20px', fontSize: '20px', lineHeight: '1.4' });
    msg.id = LOCK_ID + '-loi';
    const home = el('a', '🏠 Về trang chủ', {
      display: 'inline-block', minHeight: '48px', padding: '12px 30px', boxSizing: 'border-box', borderRadius: '999px',
      background: '#43a047', color: '#ffffff', fontSize: '22px', fontWeight: '700', textDecoration: 'none',
      boxShadow: '0 5px 0 #2e7d32', outlineOffset: '4px'
    });
    home.id = LOCK_ID + '-ve';
    home.setAttribute('href', '../');
    const note = el('p', 'Dành cho phụ huynh: có thể cho bé thêm giờ trong Góc phụ huynh của Đảo Khủng Long.', { margin: '20px 0 0', fontSize: '14px', lineHeight: '1.4', color: '#6b6785' });
    panel.appendChild(icon); panel.appendChild(title); panel.appendChild(msg); panel.appendChild(home); panel.appendChild(note);
    box.appendChild(panel);
    // Phần còn lại của trang: không nhận tiêu điểm / thao tác, trình đọc màn hình bỏ qua (nhớ lại để trả về khi mở khóa)
    lockUi.hid = [];
    Array.prototype.slice.call(document.body.children || []).forEach(function (k) {
      try {
        if (typeof k.hasAttribute === 'function' && k.hasAttribute('inert')) return;
        lockUi.hid.push({ node: k, aria: k.getAttribute('aria-hidden') });
        k.setAttribute('inert', '');
        k.setAttribute('aria-hidden', 'true');
      } catch (e) { /* bỏ qua */ }
    });
    document.body.appendChild(box);
    lockUi.box = box; lockUi.btn = home;
    if (!lockUi.guard) {
      lockUi.guard = true;
      ['keydown', 'keyup', 'pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'touchstart', 'touchmove', 'touchend', 'wheel', 'contextmenu'].forEach(function (t) {
        try { window.addEventListener(t, guardEvent, { capture: true, passive: false }); } catch (e) { /* bỏ qua */ }
      });
    }
    try { home.focus(); } catch (e) { /* bỏ qua */ }
    setTimeout(function () { try { if (lockUi.btn) lockUi.btn.focus(); } catch (e) { /* bỏ qua */ } }, 120);   // game có thể tự đặt tiêu điểm lúc khởi động
  }
  /** Phụ huynh vừa cho thêm giờ (đảo xóa khóa): gỡ lớp phủ, trả lại trang như cũ. */
  function hideDailyLock() {
    const box = lockUi.box;
    if (!box) return;
    lockUi.box = null; lockUi.btn = null;
    try { if (box.parentNode) box.parentNode.removeChild(box); } catch (e) { /* bỏ qua */ }
    lockUi.hid.forEach(function (h) {
      try {
        h.node.removeAttribute('inert');
        if (h.aria == null) h.node.removeAttribute('aria-hidden'); else h.node.setAttribute('aria-hidden', h.aria);
      } catch (e) { /* bỏ qua */ }
    });
    lockUi.hid = [];
  }
  function checkDailyLock() {
    try { if (dailyLockActive()) showDailyLock(); else hideDailyLock(); } catch (e) { /* bỏ qua: không bao giờ làm hỏng game */ }
  }
  try {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', checkDailyLock);
    else checkDailyLock();
    // Đảo ghi khóa khi bé đang mở game ở tab khác; quay lại từ bộ nhớ trang (Back trên iPad Safari)
    window.addEventListener('storage', function (e) { if (e && e.key === DAILY_KEY) checkDailyLock(); });
    window.addEventListener('pageshow', checkDailyLock);
  } catch (e) { /* bỏ qua */ }

  window.Players = {
    KEY: KEY,
    AVATARS: AVATARS.slice(),
    MAX_PLAYERS: MAX_PLAYERS,
    NAME_MAX: NAME_MAX,
    load: function () { read(); return { active: state.active, players: list() }; },
    list: list,
    active: active,
    setActive: setActive,
    add: add,
    rename: rename,
    setAvatar: setAvatar,
    remove: remove,
    onChange: onChange,
    esc: esc,
    cleanName: cleanName,
    chipHtml: chipHtml,
    gateQuestion: gateQuestion,
    gateCheck: gateCheck,
    gateLockedSeconds: gateLockedSeconds,
    gateLockText: gateLockText,
    hashPin: hashPin,
    dailyLockActive: dailyLockActive
  };
})();
