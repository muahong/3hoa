'use strict';
// sw-home.js (service worker của trang chủ, phạm vi '/'): chỉ trả lời tệp của trang chủ, KHÔNG BAO GIỜ respondWith
// cho đường dẫn của game hay /docs/, /tests/…; cài bằng cache: 'reload'; activate chỉ xóa cache cũ của chính nó.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { ROOT } = require('./lib/load.js');

const ORIGIN = 'https://3hoa.com';

function makeCaches(initial) {
  const store = new Map((initial || []).map((n) => [n, new Map()]));
  return {
    _store: store,
    open(n) {
      if (!store.has(n)) store.set(n, new Map());
      const c = store.get(n);
      return Promise.resolve({
        addAll(reqs) { reqs.forEach((r) => c.set(r.url, { url: r.url, cache: r.cache })); return Promise.resolve(); },
        put(k, v) { c.set(typeof k === 'string' ? k : k.url, v); return Promise.resolve(); },
        match(k) { return Promise.resolve(c.get(typeof k === 'string' ? k : k.url)); }
      });
    },
    keys() { return Promise.resolve(Array.from(store.keys())); },
    delete(n) { return Promise.resolve(store.delete(n)); },
    match(k) {
      const key = typeof k === 'string' ? k : k.url;
      for (const c of store.values()) if (c.has(key)) return Promise.resolve(c.get(key));
      return Promise.resolve(undefined);
    }
  };
}

function loadSw(opts) {
  opts = opts || {};
  const listeners = {};
  const self = {
    location: { href: ORIGIN + '/sw-home.js' },
    addEventListener(t, fn) { listeners[t] = fn; },
    skipWaiting() { return Promise.resolve(); },
    clients: { claim() { return Promise.resolve(); } }
  };
  class Request { constructor(url, init) { this.url = String(url); this.cache = init && init.cache; this.method = 'GET'; this.mode = 'cors'; } }
  const caches = makeCaches(opts.caches);
  const ctx = vm.createContext({ self, caches, Request, URL, Set, Promise, setTimeout, clearTimeout, fetch: opts.fetch || (() => Promise.reject(new Error('offline'))) });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'sw-home.js'), 'utf8'), ctx, { filename: 'sw-home.js' });
  return { self, listeners, caches };
}

function fetchEvent(listeners, url, mode) {
  let responded = null;
  const ev = { request: { url, method: 'GET', mode: mode || 'no-cors' }, respondWith(p) { responded = p; } };
  listeners.fetch(ev);
  return responded;
}

const GAME_DIRS = ['math-ninja', 'cuu-chuong', 'me-cung-dong-ho', 'thap-dong-ho', 'xe-tang-thoi-gian', 'cuoi-ho', 'dao-khung-long'];

test('sw-home: never responds for game folders, docs, tests, other origins or non-GET', () => {
  const { listeners } = loadSw();
  const paths = [];
  for (const g of GAME_DIRS) {
    paths.push('/' + g + '/', '/' + g + '/index.html', '/' + g + '/sw.js', '/' + g + '/js/profile.js', '/' + g + '/icons/icon-192.png', '/' + g);
  }
  paths.push('/docs/gauntlet/preview.html', '/tests/run.js', '/scripts/refresh-games.py', '/out/x.png', '/MATH-NINJA/', '/khong-co/', '/sitemap.xml', '/robots.txt', '/sw-home.js');
  for (const p of paths) {
    for (const mode of ['navigate', 'no-cors', 'cors', 'same-origin']) {
      assert.equal(fetchEvent(listeners, ORIGIN + p, mode), null, p + ' (' + mode + ') must pass through');
    }
  }
  assert.equal(fetchEvent(listeners, 'https://example.com/', 'navigate'), null);
  assert.equal(fetchEvent(listeners, 'https://example.com/css/main.css'), null);
  let r = null;
  listeners.fetch({ request: { url: ORIGIN + '/css/main.css', method: 'POST', mode: 'cors' }, respondWith(p) { r = p; } });
  assert.equal(r, null, 'POST passes through');
});

test('sw-home: answers homepage pages and assets', () => {
  const { listeners } = loadSw();
  for (const p of ['/', '/index.html', '/rieng-tu/', '/rieng-tu/index.html', '/404.html', '/?utm=x']) {
    const r = fetchEvent(listeners, ORIGIN + p, 'navigate');
    assert.ok(r, p + ' handled');
    r.catch(() => {});   // ngoại tuyến và chưa có cache: lỗi là đúng
  }
  for (const p of ['/css/main.css', '/js/hub.js', '/js/profile.js', '/fonts/baloo-2.css', '/fonts/baloo-2-vietnamese.woff2', '/images/the-cuoi-ho.webp', '/manifest.json']) {
    const r = fetchEvent(listeners, ORIGIN + p);
    assert.ok(r, p + ' handled');
    r.catch(() => {});
  }
});

test('sw-home: CORE only lists homepage files that exist, installed with cache: reload', async () => {
  const { self, listeners, caches } = loadSw();
  const core = Array.from(self.__swHome.CORE);
  for (const u of core) {
    assert.ok(!GAME_DIRS.some((g) => u.startsWith(g + '/')), u + ' is inside a game folder');
    const f = path.join(ROOT, u.endsWith('/') ? u + 'index.html' : u);
    assert.ok(fs.existsSync(f), u + ' exists');
  }
  for (const f of ['index.html', 'css/main.css', 'js/hub.js', 'js/profile.js', 'manifest.json', '404.html', 'rieng-tu/', 'fonts/baloo-2.css']) assert.ok(core.includes(f), f + ' precached');
  // mọi hình của trang chủ đều được lưu sẵn
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  for (const m of html.matchAll(/<img[^>]+src="([^"]+)"/g)) assert.ok(core.includes(m[1]), m[1] + ' precached');
  let wait = null;
  listeners.install({ waitUntil(p) { wait = p; } });
  await wait;
  const c = caches._store.get(self.__swHome.CACHE);
  assert.equal(c.size, core.length);
  for (const v of c.values()) assert.equal(v.cache, 'reload');
  assert.ok(c.has(ORIGIN + '/'));
});

test('sw-home: activate deletes only its own old caches', async () => {
  const { self, listeners, caches } = loadSw({ caches: ['3hoa-home-v0', 'math-ninja-v7', 'cuoi-ho-v3', 'dao-khung-long-v12', 'other'] });
  await caches.open(self.__swHome.CACHE);
  let wait = null;
  listeners.activate({ waitUntil(p) { wait = p; } });
  await wait;
  assert.deepEqual((await caches.keys()).sort(), ['3hoa-home-v1', 'cuoi-ho-v3', 'dao-khung-long-v12', 'math-ninja-v7', 'other'].map((n) => n === '3hoa-home-v1' ? self.__swHome.CACHE : n).sort());
});

test('sw-home: navigation is network-first and falls back to the cache when offline', async () => {
  // trực tuyến: trả bản mạng và lưu lại
  const online = loadSw({ fetch: () => Promise.resolve({ ok: true, type: 'basic', body: 'net', clone() { return { body: 'copy' }; } }) });
  const r1 = await fetchEvent(online.listeners, ORIGIN + '/', 'navigate');
  assert.equal(r1.body, 'net');
  // ngoại tuyến: trả bản đã lưu
  const offline = loadSw();
  const c = await offline.caches.open(offline.self.__swHome.CACHE);
  await c.put(ORIGIN + '/', { body: 'cached' });
  const r2 = await fetchEvent(offline.listeners, ORIGIN + '/index.html', 'navigate');
  assert.equal(r2.body, 'cached');
});

test('hub registers sw-home.js with scope "./" (root)', () => {
  const hub = fs.readFileSync(path.join(ROOT, 'js/hub.js'), 'utf8');
  assert.match(hub, /register\('sw-home\.js', \{ scope: '\.\/' \}\)/);
});
