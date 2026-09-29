'use strict';
/* Service worker của 7 game (nhóm G, rà soát 2026-09-28): chạy từng sw.js trong vm với self / caches / fetch giả
   để kiểm tra các hành vi chính: cài đặt (tệp lõi bắt buộc, tệp phụ cố gắng), mạng trước có giới hạn thời gian,
   bỏ qua ?dao=1&man=... khi lưu trang, luôn tải { cache: 'no-cache' }, ảnh / phông lấy bộ nhớ đệm trước. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const SW_GAMES = ['math-ninja', 'cuu-chuong', 'me-cung-dong-ho', 'thap-dong-ho', 'xe-tang-thoi-gian', 'cuoi-ho', 'dao-khung-long'];
const tick = () => new Promise((r) => setImmediate(r));
const flush = async () => { for (let i = 0; i < 12; i++) await tick(); };

/** Bộ nhớ đệm giả: mỗi cache là Map url -> Response; so khớp theo url, tùy chọn ignoreSearch. */
function fakeCaches(base) {
  const store = new Map();
  const abs = (k) => new URL(typeof k === 'string' ? k : k.url, base).href;
  const noSearch = (u) => { const x = new URL(u); x.search = ''; x.hash = ''; return x.href; };
  function open(name) {
    if (!store.has(name)) store.set(name, new Map());
    const m = store.get(name);
    return {
      entries: m,
      put(k, res) { m.set(abs(k), res); return Promise.resolve(); },
      match(k, o) {
        const u = abs(k);
        if (o && o.ignoreSearch) { for (const [key, v] of m) if (noSearch(key) === noSearch(u)) return Promise.resolve(v.clone()); return Promise.resolve(undefined); }
        return Promise.resolve(m.has(u) ? m.get(u).clone() : undefined);
      },
      addAll(reqs) {
        return Promise.all(reqs.map((r) => env.fetch(r).then((res) => { if (!res.ok) throw new TypeError('addAll ' + r.url + ' ' + res.status); return [r, res]; })))
          .then((all) => { for (const [r, res] of all) m.set(abs(r), res); });
      }
    };
  }
  const env = {
    store,
    fetch: null,
    api: {
      open: (n) => Promise.resolve(open(n)),
      keys: () => Promise.resolve(Array.from(store.keys())),
      delete: (n) => Promise.resolve(store.delete(n)),
      match: () => Promise.resolve(undefined)
    },
    open
  };
  return env;
}

/** Nạp sw.js của một game; fetch giả do từng kiểm thử điều khiển; setTimeout giả để tua nhanh NET_TIMEOUT. */
function loadSW(game) {
  const base = 'https://3hoa.com/' + game + '/sw.js';
  const src = fs.readFileSync(path.join(ROOT, game, 'sw.js'), 'utf8');
  const handlers = {};
  const timers = [];
  const cs = fakeCaches(base);
  const calls = [];
  let net = () => Promise.resolve(new Response('ok', { status: 200 }));
  class Req {
    constructor(u, init) {
      init = init || {};
      this.url = new URL(typeof u === 'string' ? u : u.url, base).href;
      this.method = (typeof u === 'object' && u.method) || 'GET';
      this.mode = init.mode || (typeof u === 'object' && u.mode) || 'cors';
      this.cache = init.cache || 'default';
    }
  }
  const fetchFn = (r, init) => {
    const url = new URL(typeof r === 'string' ? r : r.url, base).href;
    const cache = (init && init.cache) || (typeof r === 'object' && r.cache) || 'default';
    calls.push({ url, cache });
    return net(url);
  };
  cs.fetch = fetchFn;
  const self = {
    location: new URL(base),
    addEventListener: (t, fn) => { handlers[t] = fn; },
    skipWaiting: () => Promise.resolve(),
    clients: { claim: () => Promise.resolve() }
  };
  const ctx = vm.createContext({
    self, caches: cs.api, fetch: fetchFn, Request: Req, Response, URL, Promise,
    setTimeout: (fn) => { timers.push(fn); return timers.length; }, clearTimeout: (id) => { timers[id - 1] = null; }
  });
  vm.runInContext(src, ctx, { filename: game + '/sw.js' });
  const cacheName = src.match(/const CACHE = '([^']+)'/)[1];
  return {
    handlers, calls, cs, cacheName, base,
    setNet(fn) { net = fn; },
    fireTimers() { const t = timers.splice(0); t.forEach((f) => f && f()); },
    list(name) { return Array.from(src.match(new RegExp('const ' + name + ' = \\[([\\s\\S]*?)\\];'))[1].matchAll(/'([^']+)'/g)).map((m) => m[1]); },
    async install() {
      let p; handlers.install({ waitUntil: (x) => { p = x; } }); return p;
    },
    fetchEvent(url, mode) {
      const request = { url: new URL(url, base).href, method: 'GET', mode: mode || 'cors' };
      let res, waits = [];
      handlers.fetch({ request, respondWith: (x) => { res = x; }, waitUntil: (x) => waits.push(x) });
      return { res, waits };
    }
  };
}

for (const g of SW_GAMES) {
  test(g + ' sw: cài đặt tải tệp lõi bằng cache "reload"; thiếu tệp lõi thì cài hỏng, thiếu tệp phụ vẫn cài được', async () => {
    const sw = loadSW(g);
    const core = sw.list('CORE'), optional = sw.list('OPTIONAL'), fonts = sw.list('FONTS');
    assert.ok(core.includes('./') && core.includes('./index.html'));
    assert.deepEqual(fonts, ['../fonts/baloo-2.css', '../fonts/baloo-2-vietnamese.woff2', '../fonts/baloo-2-latin-ext.woff2', '../fonts/baloo-2-latin.woff2']);
    for (const f of fonts) assert.ok(fs.existsSync(path.join(ROOT, g, f)), 'thiếu ' + f);
    // Cài bình thường, một tệp phụ hỏng: vẫn cài được, đủ tệp lõi + phông
    const bad = optional.length ? new URL(optional[0], sw.base).href : null;
    sw.setNet((u) => Promise.resolve(new Response('x', { status: u === bad ? 404 : 200 })));
    await sw.install();
    const c = sw.cs.store.get(sw.cacheName);
    for (const u of core.concat(fonts)) assert.ok(c.has(new URL(u, sw.base).href), 'chưa lưu ' + u);
    if (bad) assert.ok(!c.has(bad), 'không lưu tệp lỗi 404');
    for (const call of sw.calls) assert.equal(call.cache, 'reload', 'cài đặt bỏ qua bộ nhớ đệm HTTP: ' + call.url);
    // Thiếu một tệp lõi: bản cài thất bại
    const sw2 = loadSW(g);
    const miss = new URL('./index.html', sw2.base).href;
    sw2.setNet((u) => Promise.resolve(new Response('x', { status: u === miss ? 404 : 200 })));
    await assert.rejects(sw2.install());
  });

  test(g + ' sw: trang mở bằng ?dao=1&man=... chỉ lưu một bản, mất mạng hay mạng chậm vẫn mở được', async () => {
    const sw = loadSW(g);
    sw.setNet(() => Promise.resolve(new Response('trang', { status: 200 })));
    for (const man of ['a1', 'b2', 'c3']) {
      const ev = sw.fetchEvent('https://3hoa.com/' + g + '/?dao=1&man=' + man, 'navigate');
      assert.equal(await (await ev.res).text(), 'trang');
      await Promise.all(ev.waits);
    }
    const keys = Array.from(sw.cs.store.get(sw.cacheName).keys());
    assert.deepEqual(keys, ['https://3hoa.com/' + g + '/'], 'một bản cho mọi màn');
    assert.ok(sw.calls.every((x) => x.cache === 'no-cache'), 'tải trang với cache no-cache');
    // Mất mạng: lấy bản đã lưu (bỏ qua ?...)
    sw.setNet(() => Promise.reject(new TypeError('offline')));
    const off = sw.fetchEvent('https://3hoa.com/' + g + '/?dao=1&man=z9', 'navigate');
    assert.equal(await (await off.res).text(), 'trang');
    // Mạng treo: quá NET_TIMEOUT thì lấy bản đã lưu
    sw.setNet(() => new Promise(() => {}));
    const slow = sw.fetchEvent('https://3hoa.com/' + g + '/?dao=1', 'navigate');
    let done = false; slow.res.then(() => { done = true; });
    await flush();
    assert.equal(done, false, 'còn chờ mạng trước khi hết giờ');
    sw.fireTimers();
    assert.equal(await (await slow.res).text(), 'trang');
  });

  test(g + ' sw: JS / CSS mạng trước có hạn giờ, lỗi 404 dùng bản đã lưu; ảnh lấy bộ nhớ đệm trước; khác tên miền thì bỏ qua', async () => {
    const sw = loadSW(g);
    const js = 'https://3hoa.com/' + g + '/js/game.js';
    let body = 'v1';
    sw.setNet(() => Promise.resolve(new Response(body, { status: 200 })));
    let ev = sw.fetchEvent(js);
    assert.equal(await (await ev.res).text(), 'v1');
    await Promise.all(ev.waits);
    body = 'v2';
    ev = sw.fetchEvent(js);
    assert.equal(await (await ev.res).text(), 'v2', 'có mạng thì luôn nhận bản mới');
    await Promise.all(ev.waits);
    sw.setNet(() => Promise.resolve(new Response('lỗi', { status: 500 })));
    assert.equal(await (await sw.fetchEvent(js).res).text(), 'v2', 'lỗi máy chủ: dùng bản đã lưu');
    sw.setNet(() => new Promise(() => {}));
    const slow = sw.fetchEvent(js);
    await flush(); sw.fireTimers();
    assert.equal(await (await slow.res).text(), 'v2', 'mạng chậm: dùng bản đã lưu');
    // Chưa có bản lưu mà mạng chậm: tiếp tục chờ mạng, không trả lỗi
    let release;
    sw.setNet(() => new Promise((r) => { release = r; }));
    const fresh = sw.fetchEvent('https://3hoa.com/' + g + '/js/moi.js');
    await flush(); sw.fireTimers(); await flush();
    release(new Response('muộn', { status: 200 }));
    assert.equal(await (await fresh.res).text(), 'muộn');
    assert.ok(sw.calls.every((x) => x.cache === 'no-cache'));
    // Ảnh: đã có trong bộ nhớ đệm thì không gọi mạng
    const img = 'https://3hoa.com/' + g + '/icons/icon-192.png';
    await (await sw.cs.api.open(sw.cacheName)).put(img, new Response('anh', { status: 200 }));
    const n = sw.calls.length;
    assert.equal(await (await sw.fetchEvent(img).res).text(), 'anh');
    assert.equal(sw.calls.length, n, 'ảnh lấy từ bộ nhớ đệm');
    // Khác tên miền: không đụng tới
    assert.equal(sw.fetchEvent('https://example.com/a.js').res, undefined);
  });

  test(g + ' sw: kích hoạt chỉ xóa bộ nhớ đệm cũ của chính game', async () => {
    const sw = loadSW(g);
    const prefix = sw.cacheName.replace(/v\d+$/, '');
    for (const n of [prefix + 'v1', sw.cacheName, 'khac-game-v3', '3hoa-khac']) sw.cs.open(n);
    let p; sw.handlers.activate({ waitUntil: (x) => { p = x; } }); await p;
    assert.deepEqual(Array.from(sw.cs.store.keys()).sort(), [sw.cacheName, 'khac-game-v3', '3hoa-khac'].sort());
  });
}
