/* Service worker: cho phép chơi ngoại tuyến sau lần tải đầu tiên.
   Khi cập nhật game, đổi số phiên bản CACHE để người chơi nhận bản mới. */
const CACHE = 'ninja-toan-v2';
const CORE = [
  './',
  './index.html',
  './style.css',
  './js/audio.js',
  './js/math.js',
  './js/fruits.js',
  './js/game.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-180.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.allSettled(CORE.map((u) => cache.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
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

  // Mạng trước, dự phòng bộ nhớ đệm (luôn nhận bản mới khi có mạng)
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && (res.ok || res.type === 'opaque')) {
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
