"""Apply the self-contained game shell consistently; assets remain inside each PWA.

Also writes the shared part of every game's sw.js (SW_SHARED below) and a content stamp
(`// noi-dung: <hash>`) of the files each service worker precaches. When the stamp or the
shared part changes, CACHE is bumped, so a deploy never keeps serving old files.
Run after changing any game file:  python scripts/refresh-games.py
tests/consistency.test.js fails when the stamp no longer matches the files.
"""
from pathlib import Path
import hashlib
import re

ROOT = Path(__file__).resolve().parents[1]
GAMES = ['math-ninja', 'cuu-chuong', 'me-cung-dong-ho', 'thap-dong-ho', 'xe-tang-thoi-gian', 'cuoi-ho']
SW_GAMES = GAMES + ['dao-khung-long']
SW_MARKER = '/* ===== Phần dùng chung: sinh từ scripts/refresh-games.py, đừng sửa tay ===== */'
TEXT_EXT = {'.html', '.css', '.js', '.json', '.svg', '.txt', '.md'}
# Shared service worker logic (raw string: copied byte for byte after SW_MARKER in each sw.js).
# Each sw.js only declares CACHE, the stamp, CORE (install fails if one is missing) and OPTIONAL (best effort).
SW_SHARED = r'''/* Phông Baloo 2 tự lưu ở ../fonts: lưu sẵn để chơi ngoại tuyến vẫn đúng phông. */
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
'''
BENEFITS = {
    'math-ninja': ['Luyện tính nhẩm', 'Vuốt để chém', 'Chơi theo sức bé'],
    'cuu-chuong': ['Bảng nhân & chia', 'Gõ số để bắn', 'Luyện từng bảng'],
    'me-cung-dong-ho': ['Chạm để dẫn đường', 'Mê cung luôn mới', 'Học giờ qua trò chơi'],
    'thap-dong-ho': ['Quan sát kim đồng hồ', 'Chọn & xếp khối', 'Học từng bước'],
    'xe-tang-thoi-gian': ['Học xem giờ', 'Chạm robot để bắn', 'Khám phá từng màn'],
    'cuoi-ho': ['Học giờ & thời gian', 'Chọn vòng để nhảy', 'Có chế độ tập luyện'],
}
CSS = '''/* Shared game shell. Source: scripts/refresh-games.py; keep each PWA self-contained. */
/* iPad: a quick double tap anywhere must not zoom the page (the child cannot pinch back out, gestures are blocked).
   touch-action is not inherited and Safari starts over inside every scroll container, so it goes on every element;
   class or element rules (touch-action: none on canvas and drag areas, pan-y on lists) still win over *. */
* { touch-action: manipulation; }
/* Header buttons stay finger-sized; a hidden screen never swallows taps while it fades out. */
.screen-head .btn { min-width: 44px; min-height: 44px; }
.screen.hidden * { pointer-events: none !important; }
#menu .panel { position: relative; padding-top: 86px; border: 1px solid rgba(255,255,255,.9); background: rgba(255,255,255,.97); box-shadow: 0 24px 70px rgba(15,25,56,.25), inset 0 1px 0 #fff; }
.hub-home { display: inline-flex; justify-content: center; align-items: center; gap: 8px; min-height: 48px; padding: 9px 16px; border: 1px solid #c9d9e2; border-radius: 16px; background: #edf6fa; color: #22546b; font: 800 17px/1.25 var(--font); text-decoration: none; box-shadow: 0 3px 0 #c9d9e2; touch-action: manipulation; }
#menu .hub-home { position: absolute; left: 22px; top: 20px; }
.hub-home:hover { background: #dceef5; }
.hub-home:active { transform: translateY(2px); box-shadow: none; }
.hub-home:focus-visible, button:focus-visible, [role="button"]:focus-visible, a:focus-visible { outline: 3px solid #087e9f; outline-offset: 4px; }
#menu .player-chip { position: absolute; top: 20px; right: 22px; margin: 0; }
#menu .title { font-size: clamp(32px, 5.2vw, 60px); line-height: 1.07; letter-spacing: -.5px; }
#menu .title small { font-size: clamp(13px, 1.8vw, 21px); line-height: 1.4; letter-spacing: 2px; margin-top: 12px; }
#menu .logo-row > svg { width: 150px; height: 150px; }
#menu .subtitle { font-size: clamp(16px, 2vw, 20px); }
.game-benefits { display: flex; justify-content: center; flex-wrap: wrap; gap: 8px; margin: 16px 0 20px; }
.game-benefits span { background: #edf7f6; color: #286760; border: 1px solid #d4eae7; padding: 6px 12px; border-radius: 999px; font-size: 14px; font-weight: 700; }
#menu .toggle-row { border-top: 1px solid #e4e9f0; padding-top: 16px; margin-top: 22px; gap: 8px; }
#menu .toggle { min-height: 44px; font-size: 15px; border-width: 2px; padding: 8px 12px; }
#menu .footer-note { margin-top: 14px; font-size: 15px; line-height: 1.5; }
.panel .hub-return { margin-top: 20px; }
.screen { overscroll-behavior: contain; }
.screen-head { gap: 10px; }
.btn { touch-action: manipulation; }
.level-card { border: 1px solid rgba(120,144,166,.25); }
.level-card:focus-visible { outline-offset: -4px; }
.hero-character { width: clamp(160px, 25vw, 280px); height: auto; object-fit: contain; filter: drop-shadow(0 12px 12px rgba(34,48,62,.18)); flex-shrink: 0; }
@media (min-width: 601px) and (max-height: 800px) {
  #menu .title { font-size: 44px; }
  #menu .btn.big { font-size: 32px; padding: 14px 30px; min-height: 66px; }
  #menu .logo-row { margin-bottom: 6px; }
  #menu .toggle-row { margin-top: 16px; padding-top: 12px; }
  .game-benefits { margin: 12px 0 16px; }
}
@media (max-width: 600px) {
  #menu .panel { padding: 80px 18px 22px; }
  #menu .hub-home { left: 14px; top: 16px; font-size: 14px; padding: 8px 12px; }
  #menu .player-chip { right: 14px; top: 16px; max-width: 120px; }
  #menu .logo-row { gap: 10px; flex-wrap: wrap; }
  #menu .logo-row > svg { width: 110px; height: 110px; }
  #menu .title { font-size: clamp(30px, 8vw, 44px); }
  .hero-character { width: 180px; max-height: 130px; }
  .game-benefits { gap: 6px; margin: 12px 0; }
  .game-benefits span { font-size: 12px; padding: 5px 9px; }
  #menu .btn.big { font-size: 28px; min-height: 64px; padding: 13px 26px; }
  #menu .toggle { font-size: 14px; }
  .screen-head { flex-wrap: wrap; }
}
@media (max-width: 360px) {
  #menu .hub-home { font-size: 12px; padding: 8px 10px; }
  #menu .player-chip { max-width: 96px; font-size: 14px; padding: 6px 8px; gap: 4px; }
}
@media (max-height: 520px) and (orientation: landscape) {
  #menu .panel { padding-top: 76px; }
  #menu .logo-row { gap: 16px; }
  #menu .logo-row svg, #menu .logo-img, .hero-character { width: 110px; height: 80px; }
  #menu .title { font-size: 32px; }
  .game-benefits { margin: 10px 0; }
  #menu .btn.big { font-size: 25px; padding: 10px 24px; min-height: 54px; }
}
@media (prefers-reduced-motion: reduce) { .hub-home { transition: none; } }
'''

def apply():
    for game in GAMES:
        folder = ROOT / game
        html = (folder / 'index.html').read_text(encoding='utf-8')
        if 'game-shell.css' not in html:
            html = html.replace('</head>', '  <link rel="stylesheet" href="game-shell.css">\n</head>')
            html = html.replace('<div id="menu" class="screen">\n    <div class="panel">', '<div id="menu" class="screen">\n    <div class="panel">\n      <a class="hub-home" href="../" aria-label="Về trang chủ 3hoa.com">← Trang chủ 3hoa.com</a>')
            html = re.sub(r'<a href="https://3hoa.com"[^>]*>3hoa.com</a>', '3hoa.com', html)
            html = re.sub(r'(<p class="subtitle">.*?</p>)', lambda m: m[0] + '\n      <div class="game-benefits">' + ''.join('<span>' + x + '</span>' for x in BENEFITS[game]) + '</div>', html, count=1)
            # Home is also available from pause, without covering the playing field.
            start = html.index('<div id="pause"')
            end = html.index('</h2>', start) + 5
            html = html[:end] + '\n      <p class="hub-return"><a class="hub-home" id="pause-home" href="../">← Trang chủ 3hoa.com</a></p>' + html[end:]
            (folder / 'index.html').write_text(html, encoding='utf-8')
        if read_text(folder / 'game-shell.css') != CSS:
            (folder / 'game-shell.css').write_text(CSS, encoding='utf-8')
        sw = (folder / 'sw.js').read_text(encoding='utf-8')
        if './game-shell.css' not in sw:
            sw = sw.replace("'./style.css',", "'./style.css',\n  './game-shell.css',")
            (folder / 'sw.js').write_text(sw, encoding='utf-8')
    for game in SW_GAMES:
        refresh_sw(ROOT / game)


def read_text(path):
    return path.read_text(encoding='utf-8') if path.exists() else None


def precached(sw):
    """Every path listed in CORE, OPTIONAL and FONTS, relative to the game folder ('./' is index.html)."""
    out = []
    for m in re.finditer(r"const (?:CORE|OPTIONAL|FONTS) = \[([\s\S]*?)\];", sw):
        for p in re.findall(r"'([^']+)'", m[1]):
            p = p[2:] if p.startswith('./') else p
            out.append(p or 'index.html')
    return sorted(set(out))


def content_stamp(folder, sw):
    """sha256 over path + bytes of every precached file (text files with LF line ends, as git stores them).
    Mirrored by stamp() in tests/consistency.test.js."""
    h = hashlib.sha256()
    for rel in precached(sw):
        data = (folder / rel).read_bytes()
        if Path(rel).suffix.lower() in TEXT_EXT:
            data = data.replace(b'\r\n', b'\n')
        h.update(rel.encode('utf-8') + b'\0' + data + b'\0')
    return h.hexdigest()[:16]


def refresh_sw(folder):
    """Write SW_SHARED after SW_MARKER and the content stamp; bump CACHE only when the output changes."""
    old = (folder / 'sw.js').read_text(encoding='utf-8')
    if SW_MARKER not in old:
        raise SystemExit(folder.name + '/sw.js: thiếu dòng đánh dấu phần dùng chung')
    head = old[:old.index(SW_MARKER)]
    sw = head + SW_MARKER + '\n' + SW_SHARED
    stamp = content_stamp(folder, sw)
    sw = re.sub(r'// noi-dung: \w*', '// noi-dung: ' + stamp, sw, count=1)
    if sw == old:
        return
    sw = re.sub(r"(const CACHE = '[a-z-]+-v)(\d+)", lambda m: m[1] + str(int(m[2]) + 1), sw, count=1)
    (folder / 'sw.js').write_text(sw, encoding='utf-8')
    print(folder.name + '/sw.js: ' + re.search(r"const CACHE = '([^']+)'", sw)[1] + ', noi-dung ' + stamp)


if __name__ == '__main__':
    apply()
