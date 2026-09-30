/* Service worker: chơi ngoại tuyến sau lần tải đầu tiên (dữ liệu của bé nằm trong IndexedDB, không đi qua đây).
   Đổi tệp của game thì chạy: python scripts/refresh-games.py (ghi lại dấu noi-dung, tự tăng CACHE). */
const CACHE = 'dao-khung-long-v12';
// noi-dung: 8e3009f3bc16d951
/* Tệp lõi: thiếu một tệp thì bản cài thất bại, máy giữ bản cũ. */
const CORE = [
  './',
  './index.html',
  './style.css',
  './css/cau-ca.css',
  './css/cau-noi.css',
  './css/cho-khung-long.css',
  './css/dau-truong.css',
  './css/goc-phu-huynh.css',
  './css/goc-phu-huynh-f.css',
  './css/hang.css',
  './css/huong-dan.css',
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
  './js/phu-kien.js',
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
  './js/huong-dan.js',
  './js/hang.js',
  './js/app.js',
  './manifest.json',
  './icons/icon-180.png',
  './icons/icon-192.png'
];
/* Tệp lớn hoặc chỉ dùng khi cài lên màn hình chính: cố gắng lưu sẵn. */
const OPTIONAL = [
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './assets/img/berry.webp',
  './assets/img/bg-circus-night.webp',
  './assets/img/bg-desert-pyramid.webp',
  './assets/img/bg-dusk-sky.webp',
  './assets/img/bg-garden.webp',
  './assets/img/bg-hang.webp',
  './assets/img/bg-island-map.webp',
  './assets/img/bg-market.webp',
  './assets/img/bg-meadow.webp',
  './assets/img/bg-race-track.webp',
  './assets/img/bg-workshop.webp',
  './assets/img/boss-cuoi-nam.webp',
  './assets/img/boss-hk1.webp',
  './assets/img/car-may.webp',
  './assets/img/car-rex.webp',
  './assets/img/hop-qua.webp',
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
  './assets/img/pk-can-cau.webp',
  './assets/img/pk-giap-hk1.webp',
  './assets/img/pk-giap-nhan-chia.webp',
  './assets/img/pk-giay-dua.webp',
  './assets/img/pk-khan-100.webp',
  './assets/img/pk-khien.webp',
  './assets/img/pk-mao-lua.webp',
  './assets/img/pk-mu-dong-ho.webp',
  './assets/img/pk-thuoc-vang.webp',
  './assets/img/pk-tui-tien.webp',
  './assets/img/pk-vong-co-nghin.webp',
  './assets/img/pk-vuong-mien.webp',
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
