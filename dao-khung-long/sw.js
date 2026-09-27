/* Service worker: chơi ngoại tuyến sau lần tải đầu tiên (dữ liệu của bé nằm trong IndexedDB, không đi qua đây).
   Khi cập nhật game, đổi số phiên bản CACHE để máy nhận bản mới. */
const CACHE = 'dao-khung-long-v3';
const CORE = [
  './',
  './index.html',
  './style.css',
  './css/cau-ca.css',
  './css/cau-noi.css',
  './css/cho-khung-long.css',
  './css/dau-truong.css',
  './css/goc-phu-huynh.css',
  './css/lat-lich.css',
  './css/rung-hinh-khoi.css',
  './css/xuong-do-luong.css',
  './js/nhat-ky.js',
  './js/ngan-hang.js',
  './js/cau-so-sanh.js',
  './js/cau-do-luong.js',
  './js/cau-tien.js',
  './js/cau-thong-ke.js',
  './js/cau-hinh-hoc.js',
  './js/cau-thoi-gian.js',
  './js/hoc-tap.js',
  './js/dao.js',
  './js/ho-so.js',
  './js/van-choi.js',
  './js/am-thanh.js',
  './js/phan-hoi.js',
  './js/bai-hoc.js',
  './js/dua-xe.js',
  './js/khung-choi.js',
  './js/lat-the.js',
  './js/xep-hinh-so.js',
  './js/truyen-tranh.js',
  './js/xuong-do-luong.js',
  './js/cho-khung-long.js',
  './js/cau-ca.js',
  './js/rung-hinh-khoi.js',
  './js/lat-lich.js',
  './js/dau-truong.js',
  './js/cau-noi.js',
  './js/bao-cao.js',
  './js/goc-phu-huynh.js',
  './js/app.js',
  './manifest.json',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './assets/img/berry.webp',
  './assets/img/bg-circus-night.webp',
  './assets/img/bg-desert-pyramid.webp',
  './assets/img/bg-dusk-sky.webp',
  './assets/img/bg-garden.webp',
  './assets/img/bg-island-map.webp',
  './assets/img/bg-market.webp',
  './assets/img/bg-meadow.webp',
  './assets/img/bg-race-track.webp',
  './assets/img/bg-workshop.webp',
  './assets/img/boss-cuoi-nam.webp',
  './assets/img/boss-hk1.webp',
  './assets/img/car-may.webp',
  './assets/img/car-rex.webp',
  './assets/img/ic-cau-ca.webp',
  './assets/img/ic-cho.webp',
  './assets/img/ic-dau-truong.webp',
  './assets/img/ic-lat-lich.webp',
  './assets/img/ic-lat-the.webp',
  './assets/img/ic-rung-hinh.webp',
  './assets/img/ic-truyen-tranh.webp',
  './assets/img/ic-xep-hinh.webp',
  './assets/img/ic-xuong-do-luong.webp',
  './assets/img/may-adult.webp',
  './assets/img/may-cheer.webp',
  './assets/img/may-eating.webp',
  './assets/img/may-egg.webp',
  './assets/img/may-hatchling.webp',
  './assets/img/may-kid.webp',
  './assets/img/may-legend.webp',
  './assets/img/may-teen.webp',
  './assets/img/may-think.webp',
  './assets/img/rex-adult.webp',
  './assets/img/rex-cheer.webp',
  './assets/img/rex-eating.webp',
  './assets/img/rex-egg.webp',
  './assets/img/rex-hatchling.webp',
  './assets/img/rex-kid.webp',
  './assets/img/rex-legend.webp',
  './assets/img/rex-teen.webp',
  './assets/img/rex-think.webp',
  './assets/img/sp-duc-long.webp',
  './assets/img/sp-gai-long.webp',
  './assets/img/sp-giap-long.webp',
  './assets/img/sp-khung-long-lua.webp',
  './assets/img/sp-kiem-long.webp',
  './assets/img/sp-long-co-dai.webp',
  './assets/img/sp-mo-vit-long.webp',
  './assets/img/sp-rong-bien.webp',
  './assets/img/sp-tam-giac-long.webp',
  './assets/img/sp-toc-long.webp',
  './assets/img/the-lung.webp'
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
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k.indexOf('dao-khung-long-') === 0).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (!('caches' in self)) return;
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!sameOrigin && !isFont) return;
  // Hình: bộ nhớ đệm trước (không đổi giữa các bản); còn lại: mạng trước, dự phòng bộ nhớ đệm
  if (sameOrigin && /\/assets\/img\//.test(url.pathname)) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res && res.ok) { const copy = res.clone(); event.waitUntil(caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {})); }
      return res;
    })));
    return;
  }
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          event.waitUntil(caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {}));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)))
  );
});
