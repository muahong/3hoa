/* Service worker: chơi ngoại tuyến sau lần tải đầu tiên.
   Đổi tệp của game thì chạy: python scripts/refresh-games.py (ghi lại dấu noi-dung, tự tăng CACHE). */
const CACHE = 'me-cung-dong-ho-v11';
// noi-dung: 5ef0cbabc7c9a071
/* Tệp lõi: thiếu một tệp thì bản cài thất bại, máy giữ bản cũ. */
const CORE = [
  './',
  './index.html',
  './style.css',
  './game-shell.css',
  './dao.css',
  './js/audio.js',
  './js/clock.js',
  './js/mazes.js',
  './js/profile.js',
  './js/dao.js',
  './js/game.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-180.png'
];
/* Tệp lớn hoặc chỉ dùng khi cài lên màn hình chính: cố gắng lưu sẵn. */
const OPTIONAL = [
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];

/* ===== Phần dùng chung: sinh từ scripts/refresh-games.py, đừng sửa tay ===== */
/* Phông Baloo 2 tự lưu ở ../fonts: lưu sẵn để chơi ngoại tuyến vẫn đúng phông. */
const FONTS = [
  '../fonts/baloo-2.css',
  '../fonts/baloo-2-vietnamese.woff2',
  '../fonts/baloo-2-latin-ext.woff2',
  '../fonts/baloo-2-latin.woff2'
];
const NET_TIMEOUT = 3000;   // ms: mạng chậm quá thì dùng bản đã lưu (nếu có)
const PREFIX = CACHE.replace(/v\d+$/, '');
const STATIC = /\.(png|jpe?g|webp|gif|svg|ico|woff2?|mp3|ogg|wav|m4a)$/i;   // ảnh, phông, âm thanh: ít đổi
const hasCaches = typeof caches !== 'undefined';

/** Tải thẳng từ máy chủ, bỏ qua bộ nhớ đệm HTTP (max-age=600), để một bản cài không trộn JS cũ với JS mới. */
const fresh = (u) => new Request(u, { cache: 'reload' });

self.addEventListener('install', (event) => {
  if (!hasCaches) { self.skipWaiting(); return; }
  event.waitUntil(
    caches.open(CACHE)
      // Tệp lõi: thiếu một tệp thì bản cài thất bại, máy giữ nguyên bản cũ đang chạy tốt
      .then((cache) => cache.addAll(CORE.map(fresh)).then(() =>
        // Tệp phụ và phông chữ: cố gắng lưu, thiếu thì lúc chơi sẽ tải sau
        Promise.allSettled(OPTIONAL.concat(FONTS).map((u) =>
          fetch(fresh(u)).then((res) => { if (res && res.ok) return cache.put(u, res); })))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  if (!hasCaches) { self.clients.claim(); return; }
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k.indexOf(PREFIX) === 0).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/** Tìm trong bộ nhớ đệm của bản này. Trang (nav) bỏ qua ?dao=1&man=... và có index.html dự phòng. */
function fromCache(key, nav) {
  return caches.open(CACHE)
    .then((cache) => cache.match(key, { ignoreSearch: nav }).then((hit) => hit || (nav ? cache.match('./index.html') : undefined)))
    .catch(() => undefined);
}

/** Lưu bản mới (chỉ phản hồi OK, không lưu lỗi 404/5xx hay phản hồi mờ). */
function keep(key, res) {
  if (!res || !res.ok) return Promise.resolve();
  const copy = res.clone();
  return caches.open(CACHE).then((cache) => cache.put(key, copy)).catch(() => {});
}

/** Mạng trước, chờ tối đa NET_TIMEOUT: quá hạn hoặc mất mạng thì dùng bản đã lưu; lỗi 404/5xx cũng ưu tiên bản đã lưu. */
function networkFirst(event, req, key, nav) {
  const net = fetch(req, { cache: 'no-cache' });
  event.waitUntil(net.then((res) => keep(key, res), () => {}));
  return new Promise((resolve) => {
    let over = false;
    const give = (res) => { if (!over && res) { over = true; resolve(res); } };
    const timer = setTimeout(() => { fromCache(key, nav).then(give); }, NET_TIMEOUT);   // không có bản lưu thì chờ mạng tiếp
    net.then((res) => {
      clearTimeout(timer);
      if (res && res.ok) { give(res); return; }
      fromCache(key, nav).then((hit) => give(hit || res));
    }, () => {
      clearTimeout(timer);
      fromCache(key, nav).then((hit) => give(hit || Response.error()));
    });
  });
}

/** Ảnh, phông, âm thanh: bộ nhớ đệm trước (mỗi bản CACHE mới tải lại hết), chưa có thì tải và lưu. */
function cacheFirst(req) {
  return fromCache(req, false).then((hit) => hit || fetch(req, { cache: 'no-cache' }).then((res) => keep(req, res).then(() => res)));
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || !hasCaches) return;
  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;   // chỉ lo tệp cùng tên miền
  const nav = req.mode === 'navigate';
  if (!nav && STATIC.test(url.pathname)) { event.respondWith(cacheFirst(req)); return; }
  // Trang lưu một bản theo đường dẫn không kèm ?..., JS/CSS/JSON lưu theo đúng yêu cầu
  event.respondWith(networkFirst(event, req, nav ? url.origin + url.pathname : req, nav));
});
