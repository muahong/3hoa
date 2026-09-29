/* ============================================================
   sw-home.js – service worker của TRANG CHỦ 3hoa.com (phạm vi '/')
   Mục đích: mở được trang chủ khi ngoại tuyến (iPad, đã thêm vào màn hình chính).

   Quy tắc quan trọng:
   - Chỉ lưu và chỉ trả lời các tệp của trang chủ (danh sách CORE + trang /rieng-tu/).
   - KHÔNG BAO GIỜ gọi respondWith cho đường dẫn của game (/math-ninja/, /cuu-chuong/, …, /dao-khung-long/)
     hay /docs/, /tests/, /scripts/, /out/: yêu cầu đi thẳng ra mạng như khi không có service worker.
     Mỗi game có service worker riêng với phạm vi dài hơn (ví dụ /math-ninja/); trình duyệt luôn chọn
     đăng ký có phạm vi khớp DÀI NHẤT, nên sau lần mở game đầu tiên, game do service worker của nó điều khiển.
     Lần đầu (game chưa đăng ký) trang game thuộc phạm vi '/' của tệp này, nhưng tệp này để yêu cầu đi qua.
   - activate chỉ xóa cache của chính nó (tiền tố 3hoa-home-); cache của các game dùng chung CacheStorage
     của tên miền nên tuyệt đối không đụng tới.
   - Trang (HTML), CSS, JS, manifest: mạng trước (chờ tối đa 3 giây), hỏng mạng thì dùng bản đã lưu.
     Nhờ vậy sửa trang chủ rồi đẩy lên là bé thấy ngay khi có mạng, không cần tăng CACHE.
     Phông chữ và hình: dùng bản đã lưu, cập nhật lại ở nền.
   - Tăng CACHE khi đổi danh sách CORE (thêm / bớt tệp).
   ============================================================ */
'use strict';

const CACHE = '3hoa-home-v1';
const PREFIX = '3hoa-home-';
const NET_TIMEOUT = 3000;

/* Đường dẫn tương đối với vị trí tệp này (gốc site) */
const CORE = [
  './',
  'index.html',
  'css/main.css',
  'js/hub.js',
  'js/profile.js',
  'fonts/baloo-2.css',
  'fonts/baloo-2-vietnamese.woff2',
  'fonts/baloo-2-latin.woff2',
  'fonts/baloo-2-latin-ext.woff2',
  'images/favicon.svg',
  'images/favicon-32.png',
  'images/apple-touch-icon.png',
  'images/icon-192.png',
  'images/icon-512.png',
  'images/icon-512-maskable.png',
  'images/the-dao-khung-long.webp',
  'images/the-math-ninja.webp',
  'images/the-cuu-chuong.webp',
  'images/the-me-cung-dong-ho.webp',
  'images/the-thap-dong-ho.webp',
  'images/the-xe-tang-thoi-gian.webp',
  'images/the-cuoi-ho.webp',
  'manifest.json',
  '404.html',
  'rieng-tu/'
];

/* Thư mục không bao giờ trả lời (để nguyên cho mạng / service worker của game) */
const PASS_THROUGH = ['/math-ninja/', '/cuu-chuong/', '/me-cung-dong-ho/', '/thap-dong-ho/', '/xe-tang-thoi-gian/',
  '/cuoi-ho/', '/dao-khung-long/', '/docs/', '/tests/', '/scripts/', '/out/', '/.github/'];

const BASE = new URL('./', self.location.href);
function abs(u) { return new URL(u, BASE).href; }
/* Trang HTML của trang chủ được trả lời khi điều hướng (kể cả dạng /index.html) */
const PAGES = { '/': abs('./'), '/index.html': abs('./'), '/rieng-tu/': abs('rieng-tu/'), '/rieng-tu/index.html': abs('rieng-tu/'), '/404.html': abs('404.html') };
const OWN = new Set(CORE.map(abs));

/** Đường dẫn (pathname, so với gốc site) có thuộc một thư mục phải để nguyên không? */
function isPassThrough(pathname) {
  const p = String(pathname || '/').toLowerCase();
  const rel = '/' + p.slice(BASE.pathname.length);
  return PASS_THROUGH.some(function (dir) { return rel === dir.slice(0, -1) || rel.indexOf(dir) === 0; });
}

/** Khóa cache của một yêu cầu, hoặc null nếu tệp này không được trả lời yêu cầu đó. */
function cacheKeyFor(request) {
  if (!request || request.method !== 'GET') return null;
  let url;
  try { url = new URL(request.url); } catch (e) { return null; }
  if (url.origin !== BASE.origin) return null;
  if (isPassThrough(url.pathname)) return null;
  const rel = '/' + url.pathname.slice(BASE.pathname.length);
  if (request.mode === 'navigate') return Object.prototype.hasOwnProperty.call(PAGES, rel) ? PAGES[rel] : null;
  const href = url.origin + url.pathname;
  return OWN.has(href) ? href : null;
}

function isStatic(key) { return /\.(woff2|png|webp|svg|jpg)$/i.test(key); }

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(CORE.map(function (u) { return new Request(abs(u), { cache: 'reload' }); })); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.filter(function (k) { return k.indexOf(PREFIX) === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.clients.claim(); })
  );
});

function saveCopy(key, res) {
  if (res && res.ok && res.type === 'basic') {
    const copy = res.clone();
    caches.open(CACHE).then(function (c) { return c.put(key, copy); }).catch(function () { /* bỏ qua (hết chỗ…) */ });
  }
  return res;
}

/** Mạng trước; quá NET_TIMEOUT hoặc lỗi mạng thì dùng bản đã lưu (nếu có). */
function networkFirst(request, key) {
  const net = fetch(request).then(function (res) { return saveCopy(key, res); });
  return new Promise(function (resolve, reject) {
    let done = false;
    function fromCache(err) {
      return caches.match(key).then(function (hit) {
        if (hit) { if (!done) { done = true; resolve(hit); } return; }
        if (err) { if (!done) { done = true; reject(err); } }
      });
    }
    const timer = setTimeout(function () { fromCache(null); }, NET_TIMEOUT);
    net.then(function (res) { clearTimeout(timer); if (!done) { done = true; resolve(res); } },
      function (err) { clearTimeout(timer); fromCache(err || new Error('offline')); });
  });
}

/** Bản đã lưu trước, cập nhật lại ở nền; chưa có thì lấy mạng. */
function cacheFirst(request, key) {
  return caches.match(key).then(function (hit) {
    const net = fetch(request).then(function (res) { return saveCopy(key, res); });
    if (hit) { net.catch(function () { /* ngoại tuyến */ }); return hit; }
    return net;
  });
}

self.addEventListener('fetch', function (e) {
  const key = cacheKeyFor(e.request);
  if (!key) return;   // không phải tệp của trang chủ: để trình duyệt / service worker của game xử lý
  e.respondWith(isStatic(key) && e.request.mode !== 'navigate' ? cacheFirst(e.request, key) : networkFirst(e.request, key));
});

/* Cho kiểm thử trong Node (vm): không ảnh hưởng trình duyệt */
self.__swHome = { CACHE: CACHE, CORE: CORE, PASS_THROUGH: PASS_THROUGH, cacheKeyFor: cacheKeyFor, isPassThrough: isPassThrough };
