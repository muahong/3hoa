/* Service worker: cho phép chơi ngoại tuyến sau lần tải đầu tiên.
   Khi cập nhật game, đổi số phiên bản CACHE để người chơi nhận bản mới. */
const CACHE = 'thap-dong-ho-v5';
const CORE = [
  './',
  './index.html',
  './style.css',
  './js/audio.js',
  './js/clock.js',
  './js/profile.js',
  './js/game.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-180.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  if (typeof caches === 'undefined') return;
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.allSettled(CORE.map((u) => cache.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  if (typeof caches === 'undefined') return;
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k.indexOf('thap-dong-ho-') === 0).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!sameOrigin && !isFont) return;
  if (typeof caches === 'undefined') return;

  // Mạng trước, dự phòng bộ nhớ đệm (luôn nhận bản mới khi có mạng); chỉ lưu phản hồi OK
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined))
      )
  );
});
