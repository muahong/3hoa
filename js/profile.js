/* ============================================================
   profile.js – Hồ sơ người chơi dùng chung cho các game 3hoa.com
   - Nhiều bé dùng chung một máy: mỗi bé có tên, hình đại diện và tiến trình riêng
   - Lưu ở localStorage khóa '3hoa-players-v1' (chung cho mọi game trên cùng tên miền)
   - Tệp này giống hệt nhau ở mọi game (sao chép nguyên văn), nạp trước game.js
   API: window.Players = { KEY, AVATARS, load, list, active, setActive, add, rename, setAvatar, remove, onChange, esc, chipHtml, cleanName }
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
    chipHtml: chipHtml
  };
})();
