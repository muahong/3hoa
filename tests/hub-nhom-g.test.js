'use strict';
// Trang chủ, nhóm G (rà soát 2026-09-28): thẻ Đảo Khủng Long đọc dkl-tom-tat-v1, "Chơi tiếp" / "Chơi ngẫu nhiên" tới được đảo,
// xóa một bạn (sau cổng phụ huynh) xóa luôn players[<id>] trong khóa của 6 game.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadGame, makeWindow, makeStorage, ROOT } = require('./lib/load.js');

const load = (st) => loadGame('.', ['js/profile.js', 'js/hub.js'], { localStorage: st });
const arr = (a) => Array.from(a);

/* DOM giả đủ dùng cho hub.js: phần tử theo id giữ nguyên giữa các lần gọi, nhớ trình nghe sự kiện, có thẻ đảo. */
function makeDom(win) {
  const els = {};
  function el(id) {
    if (els[id]) return els[id];
    const listeners = {};
    const classes = new Set();
    const e = {
      id, hidden: false, disabled: false, value: '', innerHTML: '', style: {}, attributes: {}, children: [],
      _text: '',
      get textContent() { return this._text; }, set textContent(v) { this._text = String(v); },
      classList: { add(c) { classes.add(c); }, remove(c) { classes.delete(c); }, contains(c) { return classes.has(c); }, toggle(c, on) { if (on === undefined) on = !classes.has(c); if (on) classes.add(c); else classes.delete(c); return on; } },
      setAttribute(k, v) { this.attributes[k] = String(v); }, getAttribute(k) { return k in this.attributes ? this.attributes[k] : null; },
      addEventListener(t, fn) { (listeners[t] = listeners[t] || []).push(fn); },
      _fire(t, extra) { const ev = Object.assign({ type: t, target: e, preventDefault() {} }, extra || {}); (listeners[t] || []).forEach((fn) => fn.call(e, ev)); },
      querySelector(sel) { return e._q ? e._q[sel] || null : null; }, querySelectorAll() { return []; },
      focus() {}, contains() { return false; }, closest() { return null; }
    };
    els[id] = e;
    return e;
  }
  const islandCard = el('__island-card');
  islandCard._q = { '[data-island-progress]': el('__island-progress') };
  win.document.getElementById = (id) => el(id);
  win.document.querySelector = (sel) => (sel === 'article[data-island="dao-khung-long"]' ? islandCard : null);
  win.document.addEventListener = () => {};
  return { el, islandCard, islandProgress: el('__island-progress') };
}

function loadWithDom(st) {
  const win = makeWindow({ localStorage: st });
  const dom = makeDom(win);
  const ctx = vm.createContext(win);
  for (const f of ['js/profile.js', 'js/hub.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  return { win, dom, ctx };
}

function playersKey(list, active) {
  return JSON.stringify({ v: 1, active, players: list.map((p, i) => ({ id: p.id, name: p.name, avatar: '🐯', created: 1000 + i, updated: 1000 + i })) });
}
function island(be, luc) { return JSON.stringify({ v: 1, luc: luc || '2026-09-28T08:00:00.000Z', be }); }

test('hub G3: dkl-tom-tat-v1 is validated defensively', () => {
  const bad = ['{oops', '[]', 'null', '{"v":2,"be":[]}', '{"v":1,"be":{}}', '{"v":1}', '"x"'];
  for (const raw of bad) {
    const st = makeStorage();
    st.setItem('dkl-tom-tat-v1', raw);
    assert.equal(load(st).__Hub.readIsland(), null, raw);
  }
  const st = makeStorage();
  st.setItem('dkl-tom-tat-v1', '{"__proto__":{"pwn":1},"v":1,"luc":"not a date","be":[' +
    '{"ten":"  Tí  ","qua_mong":"12","man_xong":3.4,"sao":-7},' +
    '{"ten":"<b>An</b>\\u0001","qua_mong":1e99,"man_xong":"x","sao":5,"__proto__":{"pwn":2}},' +
    '{"ten":""},{"ten":42},"chuoi",null,[1]]}');
  const d = load(st).__Hub.readIsland();
  assert.equal(({}).pwn, undefined, 'no prototype pollution');
  assert.equal(d.luc, 0);
  assert.deepEqual(arr(d.be).map((b) => [b.ten, b.qua_mong, b.man_xong, b.sao]), [['Tí', 12, 3, 0], ['bAn/b', 1e6, 0, 5]]);
  // quá dài thì bỏ qua cả khóa
  const big = makeStorage();
  big.setItem('dkl-tom-tat-v1', island([{ ten: 'x'.repeat(200000), sao: 1 }]));
  assert.equal(load(big).__Hub.readIsland(), null);
});

test('hub G3: island card matches the active hub player by name (case and accent insensitive)', () => {
  const st = makeStorage();
  st.setItem('3hoa-players-v1', playersKey([{ id: 'p1', name: 'Bé' }, { id: 'pab', name: 'đan  ' }], 'pab'));
  st.setItem('dkl-tom-tat-v1', island([{ ten: 'Tí', qua_mong: 5, man_xong: 1, sao: 2 }, { ten: 'ĐAN', qua_mong: 1234, man_xong: 7, sao: 15 }]));
  const { win, dom } = loadWithDom(st);
  const H = win.__Hub;
  assert.equal(H.nameKey('  Đan '), H.nameKey('dan'));
  assert.equal(H.nameKey('Tí'), 'ti');
  assert.equal(H.islandFor('dan').sao, 15);
  assert.equal(H.islandFor('Không có'), null);
  assert.equal(dom.islandProgress.textContent, '⭐ 15 sao · 7 màn xong · 🫐 1.234 quả mọng');
  assert.ok(dom.islandCard.classList.contains('played'));
  // "Chơi tiếp" dẫn tới đảo khi đảo là nơi bé chơi gần nhất (6 game chưa chơi)
  assert.equal(dom.el('hero-play').getAttribute('href'), 'dao-khung-long/');
  assert.equal(dom.el('hero-play').hidden, false);

  // Bé khác không có trên đảo: chỉ hiện số bé đang nuôi khủng long
  win.Players.setActive('p1');
  assert.equal(dom.islandProgress.textContent, '🦖 2 bé đang nuôi khủng long');
  assert.equal(dom.islandCard.classList.contains('played'), false);
  assert.equal(dom.el('hero-play').hidden, true);
});

test('hub G3: no island summary keeps the intro line; "Chơi tiếp" prefers the most recent game', () => {
  const st = makeStorage();
  const { dom } = loadWithDom(st);
  assert.equal(dom.islandProgress.textContent, 'Bố mẹ xem được con vướng ở đâu, tới từng thao tác');

  const st2 = makeStorage();
  st2.setItem('3hoa-players-v1', playersKey([{ id: 'p1', name: 'Tí' }], 'p1'));
  st2.setItem('thap-dong-ho-v1', JSON.stringify({ players: { p1: { levels: { L1: { stars: 3, done: 1 } }, stats: { last: Date.parse('2026-09-28T09:00:00Z') } } } }));
  st2.setItem('dkl-tom-tat-v1', island([{ ten: 'tí', qua_mong: 3, man_xong: 1, sao: 1 }], '2026-09-28T08:00:00Z'));
  const a = loadWithDom(st2);
  assert.equal(a.dom.el('hero-play').getAttribute('href'), 'thap-dong-ho/', 'tháp played later than the island');
  st2.setItem('dkl-tom-tat-v1', island([{ ten: 'tí', qua_mong: 3, man_xong: 1, sao: 1 }], '2026-09-28T10:00:00Z'));
  const b = loadWithDom(st2);
  assert.equal(b.dom.el('hero-play').getAttribute('href'), 'dao-khung-long/');
});

test('hub G3: "Chơi ngẫu nhiên" can lead to all 7 games including the island', () => {
  const { win, dom, ctx } = loadWithDom(makeStorage());
  assert.deepEqual(arr(win.__Hub.PLAYABLE), ['math-ninja', 'cuu-chuong', 'me-cung-dong-ho', 'thap-dong-ho', 'xe-tang-thoi-gian', 'cuoi-ho', 'dao-khung-long']);
  const seen = new Set();
  const M = vm.runInContext('Math', ctx);
  const rnd = M.random;
  for (let i = 0; i < 7; i++) {
    M.random = () => (i + 0.5) / 7;
    dom.el('btn-random')._fire('click');
    seen.add(dom.el('btn-random').getAttribute('href'));
  }
  M.random = rnd;
  assert.equal(seen.size, 7);
  assert.ok(seen.has('dao-khung-long/'));
});

test('hub G3: removing a kid after the parent gate deletes players[<id>] in the 6 game keys only', () => {
  const st = makeStorage();
  st.setItem('3hoa-players-v1', playersKey([{ id: 'p1', name: 'Bé' }, { id: 'pti', name: 'Tí' }], 'pti'));
  const both = (extra) => JSON.stringify(Object.assign({ sound: false, music: true, players: { p1: { records: { 'answer:a1:90': { stars: 3 } } }, pti: { records: { 'answer:a1:90': { stars: 1 } } } } }, extra || {}));
  st.setItem('ninja-toan-v1', both({ duration: 60 }));
  st.setItem('cuu-chuong-v1', both());
  st.setItem('me-cung-dong-ho-v1', JSON.stringify({ voice: true, players: { p1: { records: { l1: { stars: 2 } } } } }));   // không có bé này
  st.setItem('thap-dong-ho-v1', '{oops');                                                                                  // hỏng: để nguyên
  st.setItem('xe-tang-thoi-gian-v1', JSON.stringify({ players: { pti: { progress: { l1: { stars: 3, passed: true } } } } }));
  // cuoi-ho-v1 không có
  st.setItem('dkl-tom-tat-v1', island([{ ten: 'Tí', sao: 4, man_xong: 2, qua_mong: 9 }]));
  const untouched = { 'me-cung-dong-ho-v1': st.getItem('me-cung-dong-ho-v1'), 'thap-dong-ho-v1': st.getItem('thap-dong-ho-v1'), 'dkl-tom-tat-v1': st.getItem('dkl-tom-tat-v1') };

  const { win, dom } = loadWithDom(st);
  assert.equal(win.__Hub.summarize('math-ninja', 'pti').stars, 1);
  dom.el('btn-player-remove')._fire('click');
  assert.equal(dom.el('parent-gate').hidden, false, 'parent gate opens first');
  assert.match(dom.el('parent-gate-what').textContent, /6 trò chơi/);
  assert.match(dom.el('parent-gate-what').textContent, /Đảo Khủng Long/);
  assert.equal(st.getItem('ninja-toan-v1'), both({ duration: 60 }), 'nothing deleted before the gate is answered');

  // Cổng: sai thì không xóa gì
  dom.el('parent-gate-input').value = '1';
  dom.el('parent-gate-form')._fire('submit');
  assert.equal(win.Players.list().length, 2);
  assert.equal(st.getItem('ninja-toan-v1'), both({ duration: 60 }));

  // Cổng: đúng thì xóa
  const m = dom.el('parent-gate-q').textContent.match(/(\d+) × (\d+)/);
  assert.ok(m, 'gate question asks a multiplication');
  dom.el('parent-gate-input').value = String(Number(m[1]) * Number(m[2]));
  dom.el('parent-gate-form')._fire('submit');

  assert.deepEqual(arr(win.Players.list()).map((p) => p.id), ['p1']);
  const nj = JSON.parse(st.getItem('ninja-toan-v1'));
  assert.deepEqual(Object.keys(nj.players), ['p1'], 'other kids kept');
  assert.equal(nj.duration, 60); assert.equal(nj.sound, false); assert.equal(nj.music, true);
  assert.deepEqual(Object.keys(JSON.parse(st.getItem('cuu-chuong-v1')).players), ['p1']);
  assert.deepEqual(JSON.parse(st.getItem('xe-tang-thoi-gian-v1')), { players: {} });
  assert.equal(st.getItem('cuoi-ho-v1'), null, 'missing key is not created');
  for (const k of Object.keys(untouched)) assert.equal(st.getItem(k), untouched[k], k + ' untouched');
  assert.equal(win.__Hub.summarize('math-ninja', 'pti').played, false);
});

test('hub G3: purge survives a storage that throws on write', () => {
  const st = makeStorage();
  st.setItem('3hoa-players-v1', playersKey([{ id: 'p1', name: 'Bé' }, { id: 'pti', name: 'Tí' }], 'pti'));
  st.setItem('ninja-toan-v1', JSON.stringify({ players: { pti: {} } }));
  st.setItem('cuu-chuong-v1', JSON.stringify({ players: { pti: {} } }));
  const { win, dom } = loadWithDom(st);
  const set = st.setItem;
  st.setItem = function (k, v) { if (k === 'ninja-toan-v1') throw new Error('QuotaExceeded'); return set.call(this, k, v); };
  dom.el('btn-player-remove')._fire('click');
  const m = dom.el('parent-gate-q').textContent.match(/(\d+) × (\d+)/);
  dom.el('parent-gate-input').value = String(Number(m[1]) * Number(m[2]));
  assert.doesNotThrow(() => dom.el('parent-gate-form')._fire('submit'));
  assert.equal(win.Players.list().length, 1);
  assert.deepEqual(JSON.parse(st.getItem('cuu-chuong-v1')), { players: {} }, 'other games still purged');
});

test('hub G: homepage files have no em dash and no Google Fonts', () => {
  for (const f of ['index.html', '404.html', 'rieng-tu/index.html', 'js/hub.js', 'css/main.css', 'manifest.json', 'sw-home.js']) {
    const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.ok(!s.includes(String.fromCharCode(0x2014)), f + ' has an em dash');
    assert.ok(!/fonts\.(googleapis|gstatic)\.com/.test(s), f + ' still uses Google Fonts');
  }
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const list = ld['@graph'].find((n) => n['@type'] === 'ItemList');
  assert.equal(list.itemListElement.length, 7);
  for (const it of list.itemListElement) {
    assert.equal(it.item['@type'], 'LearningResource');
    assert.equal(it.item.inLanguage, 'vi');
    assert.equal(it.item.isAccessibleForFree, true);
    assert.match(it.item.url, /^https:\/\/3hoa\.com\/[a-z-]+\/$/);
    assert.ok(fs.existsSync(path.join(ROOT, new URL(it.item.url).pathname, 'index.html')), it.item.url);
  }
  // mọi hình trong trang chủ đều tồn tại và nhẹ
  for (const m of html.matchAll(/<img[^>]+src="([^"]+)"/g)) {
    const f = path.join(ROOT, m[1]);
    assert.ok(fs.existsSync(f), m[1]);
    assert.ok(fs.statSync(f).size < 30000, m[1] + ' is too big for a 120px thumbnail');
  }
  const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
  assert.ok(man.shortcuts.some((s) => s.url === '/dao-khung-long/'));
});
