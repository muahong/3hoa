/* Service worker: cho phép chơi ngoại tuyến sau lần tải đầu tiên.
   Khi cập nhật game, đổi số phiên bản CACHE để người chơi nhận bản mới. */
const CACHE = 'xe-tang-thoi-gian-v2';
const CORE = [
  './',
  './index.html',
  './style.css',
  './js/audio.js',
  './js/clock.js',
  './js/levels.js',
  './js/profile.js',
  './js/game.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-180.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];
const NET_TIMEOUT = 4000;   // ms chờ mạng trước khi dùng bộ nhớ đệm

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
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k.indexOf('xe-tang-thoi-gian-') === 0).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/** Lưu vào bộ nhớ đệm chỉ khi phản hồi thành công (không lưu lỗi 404/500 hay phản hồi mờ). */
function store(req, res) {
  if (!res || !res.ok) return res;
  const copy = res.clone();
  caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
  return res;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || typeof caches === 'undefined') return;
  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!sameOrigin && !isFont) return;

  if (isFont) {
    // Phông chữ: bộ nhớ đệm trước (ít khi đổi), tải mạng khi chưa có
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => store(req, res)).catch(() => Response.error()))
    );
    return;
  }

  // Cùng nguồn: mạng trước (có giới hạn thời gian), dự phòng bộ nhớ đệm (luôn nhận bản mới khi có mạng)
  const timeout = new Promise((resolve, reject) => setTimeout(() => reject(new Error('timeout')), NET_TIMEOUT));
  event.respondWith(
    Promise.race([fetch(req), timeout])
      .then((res) => store(req, res))
      .catch(() =>
        caches.match(req)
          .then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html') : null))
          .then((hit) => hit || Response.error())
      )
  );
});
