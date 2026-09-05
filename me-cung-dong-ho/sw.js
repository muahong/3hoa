/* Service worker: cho phép chơi ngoại tuyến sau lần tải đầu tiên.
   Khi cập nhật game, đổi số phiên bản CACHE để người chơi nhận bản mới. */
const CACHE = 'me-cung-dong-ho-v4';
const CORE = [
  './',
  './index.html',
  './style.css',
  './js/audio.js',
  './js/clock.js',
  './js/mazes.js',
  './js/profile.js',
  './js/game.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-180.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];
const NET_TIMEOUT = 3500;   // ms – mạng chậm quá thì lấy bản trong bộ nhớ đệm
const hasCaches = typeof caches !== 'undefined';

self.addEventListener('install', (event) => {
  if (!hasCaches) { self.skipWaiting(); return; }
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.allSettled(CORE.map((u) => cache.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  if (!hasCaches) { self.clients.claim(); return; }
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k.indexOf('me-cung-dong-ho-') === 0).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/** fetch có giới hạn thời gian: quá NET_TIMEOUT thì coi như mất mạng. */
function fetchWithTimeout(req) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), NET_TIMEOUT);
    fetch(req).then((res) => { clearTimeout(timer); resolve(res); }, (err) => { clearTimeout(timer); reject(err); });
  });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || !hasCaches) return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!sameOrigin && !isFont) return;

  // Mạng trước (có giới hạn thời gian), dự phòng bộ nhớ đệm. Chỉ lưu phản hồi OK; lỗi 404/5xx thì ưu tiên bản đã lưu.
  event.respondWith(
    fetchWithTimeout(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
          return res;
        }
        return caches.match(req).then((hit) => hit || res);
      })
      .catch(() =>
        caches.match(req).then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined))
      )
  );
});
