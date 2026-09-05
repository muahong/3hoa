'use strict';
/* Kiểm thử đầu-cuối trang chủ (3 khổ màn hình: iPad ngang, iPad dọc, điện thoại):
   gieo hồ sơ 2 bé + tiến trình các game (dạng mới lẫn dạng cũ, dữ liệu hỏng), mở /, kiểm tra
   lời chào, thẻ game, hộp thoại người chơi (đổi / thêm / xóa qua cổng phụ huynh / đổi tên / đổi hình),
   CSP, không inline handler, kích thước chạm, không cuộn ngang, focus bàn phím, đồng bộ giữa các tab.
   Chạy: NODE_PATH=/opt/node22/lib/node_modules node tests/e2e/hub.e2e.js */
const { withGame, assertClean } = require('./lib/browser.js');

const LAST = 1756800000000;   // mốc thời gian cố định để so sánh byte với dữ liệu đã gieo
const SEED = {
  '3hoa-players-v1': { v: 1, active: 'p1', players: [{ id: 'p1', name: 'Bống', avatar: '🐸', created: 1, updated: 1 }, { id: 'pab', name: 'Tí', avatar: '🦉', created: 2, updated: 2 }] },
  // dạng mới: players[<id>]
  'cuoi-ho-v1': { sound: true, players: { p1: { unlocked: 4, levels: { l1: { best: 900, stars: 3, quiz: true }, l2: { stars: 2, quiz: true }, l3: { stars: 3, quiz: true }, l4: { stars: 1, quiz: false } }, badge: false, missed: {}, stats: { plays: 4, correct: 30, wrong: 5, seconds: 900, last: LAST } } } },
  'cuu-chuong-v1': { players: { pab: { records: { 't2:mul:90': { stars: 2 }, 'c1:x:90': { stars: 1 } } } } },   // chỉ Tí có
  // dạng cũ (chưa di trú) → chỉ thuộc về p1
  'thap-dong-ho-v1': { unlocked: 3, levels: { L1: { best: 500, stars: 3, done: 1 }, L2: { stars: 2, done: 1 } } },
  'ninja-toan-v1': { records: { 'answer:a1:90': { best: 1200, stars: 3 }, 'answer:a1:60': { stars: 2 }, 'pair:p1:90': { stars: 1 } } }
};
const RAW = {
  'me-cung-dong-ho-v1': '{"__proto__":{"x":1},"records":{"l1":{"stars":99}}}',   // độc hại
  'xe-tang-thoi-gian-v1': '{oops'                                               // hỏng
};
const seedStrings = {};
Object.keys(SEED).forEach((k) => { seedStrings[k] = JSON.stringify(SEED[k]); });
Object.keys(RAW).forEach((k) => { seedStrings[k] = RAW[k]; });
const initScript = Object.keys(seedStrings).map((k) => 'localStorage.setItem(' + JSON.stringify(k) + ', ' + JSON.stringify(seedStrings[k]) + ');').join('\n');
const GAME_KEYS = ['ninja-toan-v1', 'cuu-chuong-v1', 'me-cung-dong-ho-v1', 'thap-dong-ho-v1', 'xe-tang-thoi-gian-v1', 'cuoi-ho-v1'];
const DIRS = ['math-ninja', 'cuu-chuong', 'me-cung-dong-ho', 'thap-dong-ho', 'xe-tang-thoi-gian', 'cuoi-ho'];

function eq(actual, expected, msg) {
  if (actual !== expected) throw new Error(msg + ': mong đợi ' + JSON.stringify(expected) + ', nhận ' + JSON.stringify(actual));
}
function ok(cond, msg) { if (!cond) throw new Error(msg); }
const text = async (page, sel) => (await page.textContent(sel) || '').replace(/\s+/g, ' ').trim();
const progress = (page, dir) => text(page, '[data-game="' + dir + '"] [data-progress]');

/* Tương phản WCAG (chạy trong trang): tỉ lệ nhỏ nhất giữa màu chữ của phần tử `sel` và MỌI màu nền
   (nền phẳng của chính nó / mọi mốc màu của gradient, hoặc nền của tổ tiên gần nhất không trong suốt). */
const contrastOf = (page, sel) => page.evaluate((s) => {
  const rgb = (str) => (String(str).match(/rgba?\(([^)]+)\)/g) || []).map((m) => m.match(/[\d.]+/g).map(Number)).filter((c) => c.length < 4 || c[3] > 0);
  const lum = (c) => { const f = c.slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]; };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const el = document.querySelector(s);
  if (!el) return null;
  const st = getComputedStyle(el), fg = rgb(st.color)[0];
  let bgs = rgb(st.backgroundImage).concat(rgb(st.backgroundColor));
  for (let a = el.parentElement; !bgs.length && a; a = a.parentElement) bgs = rgb(getComputedStyle(a).backgroundColor);
  if (!fg || !bgs.length) return null;
  return Math.min.apply(null, bgs.map((b) => ratio(fg, b)));
}, sel);

async function run(label, viewport, reduced) {
  const summary = {};
  const log = await withGame('', async ({ page, shot, hook, hookName, url, context }) => {
    // 1. Móc gỡ lỗi + đọc tiến trình
    eq(hookName, '__Hub', 'tên móc');
    eq(await hook('X.summarize("cuoi-ho").stars'), 9, 'cuoi-ho sao');
    eq(await hook('X.summarize("math-ninja").stars'), 4, 'ninja sao');
    eq(await hook('X.summarize("me-cung-dong-ho").stars'), 3, 'me-cung sao (99 → 3)');
    eq(await hook('X.summarize("xe-tang-thoi-gian").played'), false, 'xe-tang hỏng → chưa chơi');
    eq(await hook('X.summarize("cuu-chuong").played'), false, 'cuu-chuong: p1 chưa chơi');
    eq(await hook('Object.isFrozen(X)'), true, 'móc chỉ đọc');

    // 2. Chip, lời chào, thành tích, nút chơi tiếp
    eq(await text(page, '#btn-player .pl-name'), 'Bống', 'chip');
    eq(await text(page, '#hero-name'), 'Bống', 'lời chào');
    ok((await text(page, '#hero-title')).indexOf('Chào Bống!') >= 0, 'h1 "Chào Bống!"');
    ok(await page.isVisible('#hero-play'), 'hero-play hiện');
    ok((await page.getAttribute('#hero-play', 'href')).endsWith('cuoi-ho/'), 'hero-play → cuoi-ho');
    ok((await text(page, '#hero-play')).indexOf('Cưỡi Hổ') >= 0, 'hero-play tên game');
    const achv = await text(page, '#achv');
    ok(achv.indexOf('21/195') >= 0, 'achv sao: ' + achv);
    ok(achv.indexOf('15 phút') >= 0, 'achv phút: ' + achv);

    // 3. Thẻ game
    await page.waitForTimeout(700);   // thanh sao có transition 0.4s
    eq(await progress(page, 'cuoi-ho'), '⭐ 9/27 sao · 3/9 màn', 'cuoi-ho');
    eq(await progress(page, 'thap-dong-ho'), '⭐ 5/24 sao · 2/8 màn', 'thap (dạng cũ)');
    eq(await progress(page, 'math-ninja'), '⭐ 4/48 sao · 2/16 màn', 'ninja (dạng cũ)');
    eq(await progress(page, 'cuu-chuong'), 'Chưa chơi', 'cuu-chuong');
    eq(await progress(page, 'me-cung-dong-ho'), '⭐ 3/24 sao · 0/8 màn', 'me-cung (độc hại)');
    eq(await progress(page, 'xe-tang-thoi-gian'), 'Chưa chơi', 'xe-tang (hỏng)');
    eq(await text(page, '[data-game="cuoi-ho"] [data-best]'), '🏆 Kỷ lục: 900', 'kỷ lục cuoi-ho');
    eq(await text(page, '[data-game="math-ninja"] [data-best]'), '🏆 Kỷ lục: 1.200', 'kỷ lục ninja');
    ok(await page.isHidden('[data-game="cuu-chuong"] [data-best]'), 'kỷ lục ẩn khi chưa chơi');
    const ratio = await page.evaluate(() => { const b = document.querySelector('[data-game="cuoi-ho"] .bar'); const s = b.firstElementChild; return s.getBoundingClientRect().width / b.getBoundingClientRect().width; });
    ok(ratio > 0.3 && ratio < 0.37, 'thanh sao cuoi-ho ≈ 33%: ' + ratio.toFixed(3));
    // 3b. Tương phản ≥ 4.5:1 cho chữ nhỏ trên thẻ / bảng (SPEC §4): dòng tiến trình, dòng kỷ lục, thẻ chủ đề, thành tích
    for (const sel of ['[data-game="cuoi-ho"] .progress', '[data-game="cuu-chuong"] .progress.empty', '[data-game="cuoi-ho"] .best', '.tag', '.tag.grade', '.topics', '.achv li', '.lead']) {
      const c = await contrastOf(page, sel);
      ok(c !== null && c >= 4.5, 'tương phản ' + sel + ' = ' + (c === null ? 'null' : c.toFixed(2)));
    }

    // 4. Ảnh chụp
    await shot('hub-' + label);
    await page.screenshot({ path: require('path').join(__dirname, 'out', 'root', 'hub-' + label + '-full.png'), fullPage: true });

    // 5. Bảo mật / markup
    eq(await page.evaluate(() => document.querySelectorAll('[onclick],[onload],[onerror],script:not([src])').length), 0, 'không inline handler / inline script');
    ok(await page.evaluate(() => !!document.querySelector('meta[http-equiv="Content-Security-Policy"]')), 'có CSP');
    eq(await page.evaluate(() => (document.querySelector('meta[name="referrer"]') || {}).content), 'no-referrer', 'referrer meta');
    eq(await page.evaluate(() => document.querySelectorAll('a[href^="javascript:"]').length), 0, 'không javascript: href');
    const hrefs = await page.$$eval('article .btn', (els) => els.map((a) => a.getAttribute('href')));
    ok(hrefs.length === 6 && hrefs.every((h, i) => h === DIRS[i] + '/'), 'href thẻ game: ' + hrefs.join(','));
    for (const p of DIRS.map((d) => d + '/').concat(['css/main.css', 'js/hub.js', 'js/profile.js', 'manifest.json', 'images/favicon.svg', 'images/favicon-32.png', 'images/apple-touch-icon.png', 'images/icon-192.png', 'images/icon-512.png', 'images/icon-512-maskable.png', 'images/og.jpg', '404.html', 'robots.txt', 'sitemap.xml'])) {
      const r = await page.request.get(url + p);
      eq(r.status(), 200, 'GET ' + p);
    }
    ok(await page.evaluate(() => document.querySelectorAll('main, header, footer').length === 3), 'landmark');

    // 6. Mục tiêu chạm ≥ 44px, ảnh 192px
    const small = await page.$$eval('a.btn, .player-chip, .brand', (els) => els.filter((e) => e.offsetParent !== null).map((e) => { const r = e.getBoundingClientRect(); return { t: e.textContent.trim().slice(0, 20), w: Math.round(r.width), h: Math.round(r.height) }; }).filter((b) => b.w < 44 || b.h < 44));
    eq(small.length, 0, 'mục tiêu chạm nhỏ: ' + JSON.stringify(small));
    await page.evaluate(() => Promise.all(Array.from(document.querySelectorAll('article img')).map((img) => { img.scrollIntoView(); return img.complete ? null : new Promise((r) => { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); }); })));
    await page.evaluate(() => window.scrollTo(0, 0));
    const imgs = await page.$$eval('article img', (els) => els.map((i) => ({ src: i.getAttribute('src'), nw: i.naturalWidth, w: i.getAttribute('width'), h: i.getAttribute('height') })));
    ok(imgs.length === 6 && imgs.every((i) => /icon-192\.png$/.test(i.src) && i.nw === 192 && i.w === '192' && i.h === '192'), 'ảnh thẻ: ' + JSON.stringify(imgs));
    const perf = await page.evaluate(() => {
      const res = performance.getEntriesByType('resource').filter((e) => e.name.indexOf(location.origin) === 0);
      const nav = performance.getEntriesByType('navigation')[0];
      const sum = (list) => list.reduce((a, e) => a + (e.encodedBodySize || 0), 0);
      return { img: sum(res.filter((e) => e.initiatorType === 'img')), all: sum(res) + (nav ? nav.encodedBodySize || 0 : 0), n: res.length + 1 };
    });
    ok(perf.img <= 200000, 'ảnh ≤ 200 KB: ' + perf.img);

    // 7. Không cuộn ngang; điện thoại: trang ngắn, 3 thẻ đầu trong 2 màn hình
    const dims = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, h: document.documentElement.scrollHeight, cards: Array.from(document.querySelectorAll('article')).slice(0, 3).map((a) => Math.round(a.getBoundingClientRect().top)) }));
    ok(dims.sw <= dims.iw, 'cuộn ngang: ' + dims.sw + ' > ' + dims.iw);
    if (viewport.width <= 480) { ok(dims.h < 2600, 'trang điện thoại quá dài: ' + dims.h); ok(dims.cards.every((y) => y < viewport.height * 2), 'ba thẻ đầu trong 2 màn hình: ' + dims.cards.join(',')); }
    summary.imgBytes = perf.img; summary.allBytes = perf.all; summary.requests = perf.n; summary.docH = dims.h;

    // 8. Bàn phím: liên kết "bỏ qua" hiện ra khi focus và cao ≥ 44px; Tab tới nút .btn và thấy viền focus
    await page.focus('.skip');
    const skip = await page.evaluate(() => { const r = document.querySelector('.skip').getBoundingClientRect(); return { x: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height), focused: document.activeElement === document.querySelector('.skip') }; });
    ok(skip.focused && skip.x >= 0 && skip.w >= 44 && skip.h >= 44, 'liên kết bỏ qua khi focus: ' + JSON.stringify(skip));
    let onBtn = false;
    for (let i = 0; i < 12 && !onBtn; i++) { await page.keyboard.press('Tab'); onBtn = await page.evaluate(() => !!document.activeElement && document.activeElement.matches('a.btn')); }
    ok(onBtn, 'Tab tới a.btn');
    const outline = await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return { style: s.outlineStyle, w: parseFloat(s.outlineWidth) }; });
    ok(outline.style !== 'none' && outline.w >= 3, 'viền focus: ' + JSON.stringify(outline));

    // 9. Hộp thoại người chơi: mở, đổi bé, Escape
    await page.click('#btn-player');
    await page.waitForTimeout(150);
    ok(await page.evaluate(() => !document.getElementById('players').hidden), 'players mở');
    eq(await page.getAttribute('#btn-player', 'aria-expanded'), 'true', 'aria-expanded');
    ok(await page.evaluate(() => document.getElementById('players').contains(document.activeElement)), 'focus trong hộp thoại');
    eq(await page.$$eval('.player-item', (els) => els.length), 2, 'số bé');
    eq(await page.getAttribute('.player-item.active', 'data-id'), 'p1', 'bé đang hoạt động');
    eq(await text(page, '.player-item.active .pl-sub'), '⭐ 21 sao', 'tổng sao Bống');
    eq(await text(page, '.player-item[data-id="pab"] .pl-sub'), '⭐ 3 sao', 'tổng sao Tí');
    eq(await page.evaluate(() => getComputedStyle(document.querySelector('#players .note')).fontSize), '14px', 'ghi chú hộp thoại 14px (không bị .screen p đè)');
    await page.click('.player-item[data-id="pab"]');
    await page.waitForTimeout(150);
    eq(await text(page, '#btn-player .pl-name'), 'Tí', 'chip sau khi đổi');
    eq(await text(page, '#hero-name'), 'Tí', 'lời chào sau khi đổi');
    eq(await progress(page, 'cuu-chuong'), '⭐ 3/45 sao · 2/15 màn', 'cuu-chuong của Tí');
    eq(await progress(page, 'cuoi-ho'), 'Chưa chơi', 'cuoi-ho của Tí');
    ok((await page.getAttribute('#hero-play', 'href')).endsWith('cuu-chuong/'), 'hero-play của Tí');
    eq(await page.getAttribute('.player-item.active', 'data-id'), 'pab', 'danh sách cập nhật');
    await shot('hub-' + label + '-players');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    ok(await page.evaluate(() => document.getElementById('players').hidden), 'Escape đóng');
    eq(await page.getAttribute('#btn-player', 'aria-expanded'), 'false', 'aria-expanded false');
    ok(await page.evaluate(() => document.activeElement === document.getElementById('btn-player')), 'focus trả về chip');

    // 9b. Quay lại từ game qua page cache (iPad Safari): bé đã đổi TRONG game, cùng tab → không có sự kiện storage;
    //     trang nhận pageshow(persisted) → phải đọc lại hồ sơ. (Chromium headless không khôi phục bfcache nên mô phỏng sự kiện.)
    const setActiveRaw = (id) => page.evaluate((i) => { const s = JSON.parse(localStorage.getItem('3hoa-players-v1')); s.active = i; localStorage.setItem('3hoa-players-v1', JSON.stringify(s)); }, id);
    await setActiveRaw('p1');
    eq(await text(page, '#btn-player .pl-name'), 'Tí', 'trước pageshow: chip chưa đổi (đúng, chưa có sự kiện)');
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
    await page.waitForTimeout(100);
    eq(await text(page, '#btn-player .pl-name'), 'Bống', 'pageshow(persisted): chip');
    eq(await text(page, '#hero-name'), 'Bống', 'pageshow(persisted): lời chào');
    eq(await progress(page, 'cuoi-ho'), '⭐ 9/27 sao · 3/9 màn', 'pageshow(persisted): thẻ của Bống');
    eq(await progress(page, 'cuu-chuong'), 'Chưa chơi', 'pageshow(persisted): thẻ cuu-chuong về Chưa chơi');
    ok((await page.getAttribute('#hero-play', 'href')).endsWith('cuoi-ho/'), 'pageshow(persisted): chơi tiếp của Bống');
    eq(await page.getAttribute('.player-item.active', 'data-id'), 'p1', 'pageshow(persisted): danh sách bé');
    // quay lại tab (visibilitychange) sau khi game ở tab khác… hoặc chính tab này đổi bé → cũng đọc lại
    await setActiveRaw('pab');
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await page.waitForTimeout(100);
    eq(await text(page, '#btn-player .pl-name'), 'Tí', 'visibilitychange: chip');
    eq(await text(page, '#hero-name'), 'Tí', 'visibilitychange: lời chào');
    eq(await progress(page, 'cuu-chuong'), '⭐ 3/45 sao · 2/15 màn', 'visibilitychange: thẻ của Tí');
    eq(await page.getAttribute('.player-item.active', 'data-id'), 'pab', 'visibilitychange: danh sách bé');
    // pageshow thường (nạp mới) chỉ vẽ lại thẻ, không phá trạng thái đang có
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: false })));
    await page.waitForTimeout(50);
    eq(await text(page, '#btn-player .pl-name'), 'Tí', 'pageshow thường: vẫn Tí');

    // 10. Thêm bé mới (Enter gửi biểu mẫu)
    await page.click('#btn-player');
    await page.click('#btn-player-add');
    await page.waitForTimeout(100);
    ok(await page.isVisible('#player-form'), 'biểu mẫu hiện');
    await page.fill('#player-name', 'Mai');
    await page.click('.avatar[data-avatar="🦄"]');
    eq(await page.getAttribute('.avatar[data-avatar="🦄"]', 'aria-pressed'), 'true', 'chọn hình');
    await page.press('#player-name', 'Enter');
    await page.waitForTimeout(150);
    eq(await text(page, '#btn-player .pl-name'), 'Mai', 'chip Mai');
    eq(await text(page, '#btn-player .pl-avatar'), '🦄', 'hình Mai');
    eq(await page.$$eval('.player-item', (els) => els.length), 3, '3 bé');
    ok(await page.isHidden('#player-form'), 'biểu mẫu ẩn sau khi lưu');
    for (const d of DIRS) eq(await progress(page, d), 'Chưa chơi', d + ' của Mai');
    ok((await text(page, '#achv')).indexOf('Chưa có sao') >= 0, 'achv trống');
    ok(await page.isHidden('#hero-play'), 'hero-play ẩn');
    const stored = await page.evaluate((keys) => { const o = {}; keys.forEach((k) => { o[k] = localStorage.getItem(k); }); o.players = JSON.parse(localStorage.getItem('3hoa-players-v1')); return o; }, GAME_KEYS);
    eq(stored.players.players.length, 3, 'lưu 3 bé');
    eq(stored.players.players[2].name, 'Mai', 'tên lưu');
    eq(stored.players.active, stored.players.players[2].id, 'Mai là bé đang hoạt động');
    for (const k of GAME_KEYS) eq(stored[k], seedStrings[k], 'khóa game không đổi: ' + k);

    // 10b. Xóa Mai qua cổng phụ huynh (sai → giữ, đúng → xóa; không đụng khóa game)
    await page.click('#btn-player-remove');
    await page.waitForTimeout(100);
    ok(await page.evaluate(() => !document.getElementById('parent-gate').hidden), 'cổng phụ huynh mở');
    const q = await text(page, '#parent-gate-q');
    const m = q.match(/(\d+)\s*×\s*(\d+)/);
    ok(m, 'câu hỏi cổng: ' + q);
    await page.fill('#parent-gate-input', '1');
    await page.press('#parent-gate-input', 'Enter');
    await page.waitForTimeout(100);
    ok(await page.evaluate(() => !document.getElementById('parent-gate').hidden), 'sai → cổng vẫn mở');
    eq(await page.$$eval('.player-item', (els) => els.length), 3, 'sai → chưa xóa');
    await page.fill('#parent-gate-input', String(Number(m[1]) * Number(m[2])));
    await page.press('#parent-gate-input', 'Enter');
    await page.waitForTimeout(150);
    ok(await page.evaluate(() => document.getElementById('parent-gate').hidden), 'đúng → cổng đóng');
    eq(await page.$$eval('.player-item', (els) => els.length), 2, 'đã xóa Mai');
    eq(await text(page, '#btn-player .pl-name'), 'Bống', 'bé đầu tiên trở thành hoạt động');
    eq(await progress(page, 'cuoi-ho'), '⭐ 9/27 sao · 3/9 màn', 'thẻ trở lại của Bống');
    const stored2 = await page.evaluate((keys) => { const o = {}; keys.forEach((k) => { o[k] = localStorage.getItem(k); }); return o; }, GAME_KEYS);
    for (const k of GAME_KEYS) eq(stored2[k], seedStrings[k], 'khóa game không đổi sau khi xóa bé: ' + k);
    // chuyển sang Tí để bước đồng bộ tab có gì đó để đổi
    await page.click('.player-item[data-id="pab"]');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    eq(await text(page, '#btn-player .pl-name'), 'Tí', 'đang là Tí');

    // 11. Đồng bộ giữa các tab: tab khác đổi bé đang hoạt động → trang này cập nhật
    const p2 = await context.newPage();
    await p2.goto(url);
    await p2.evaluate(() => { const s = JSON.parse(localStorage.getItem('3hoa-players-v1')); s.active = 'p1'; localStorage.setItem('3hoa-players-v1', JSON.stringify(s)); });
    await page.waitForTimeout(300);
    eq(await text(page, '#btn-player .pl-name'), 'Bống', 'đồng bộ tab: chip');
    eq(await progress(page, 'cuoi-ho'), '⭐ 9/27 sao · 3/9 màn', 'đồng bộ tab: thẻ');
    // tab khác đổi tên bé đang chơi (không đổi bé) → chip và lời chào vẫn cập nhật
    await p2.evaluate(() => { const s = JSON.parse(localStorage.getItem('3hoa-players-v1')); s.players[0].name = 'Bống Ơi'; localStorage.setItem('3hoa-players-v1', JSON.stringify(s)); });
    await page.waitForTimeout(300);
    eq(await text(page, '#btn-player .pl-name'), 'Bống Ơi', 'đồng bộ tab: đổi tên');
    eq(await text(page, '#hero-name'), 'Bống Ơi', 'đồng bộ tab: lời chào');
    await p2.close();

    if (label === '1180x820') {
      // 12. Đổi tên + đổi hình (chỉ chạy một khổ)
      await page.click('#btn-player');
      await page.click('#btn-player-rename');
      await page.waitForTimeout(100);
      ok(await page.isHidden('#player-avatars'), 'đổi tên: ẩn lưới hình');
      await page.fill('#player-name', 'Bống Xinh');
      await page.press('#player-name', 'Enter');
      await page.waitForTimeout(150);
      eq(await text(page, '#btn-player .pl-name'), 'Bống Xinh', 'đổi tên');
      eq(await text(page, '#hero-name'), 'Bống Xinh', 'lời chào sau đổi tên');
      await page.click('#btn-player-avatar');
      await page.waitForTimeout(100);
      ok(await page.isHidden('#player-name'), 'đổi hình: ẩn ô tên');
      await page.click('.avatar[data-avatar="🐼"]');
      await page.click('#btn-player-save');
      await page.waitForTimeout(150);
      eq(await text(page, '#btn-player .pl-avatar'), '🐼', 'đổi hình');
      // Tên rỗng bị từ chối
      await page.click('#btn-player-rename');
      await page.fill('#player-name', '   ');
      await page.press('#player-name', 'Enter');
      await page.waitForTimeout(100);
      eq(await text(page, '#btn-player .pl-name'), 'Bống Xinh', 'tên rỗng bị từ chối');
      ok(await page.isVisible('#player-form'), 'biểu mẫu vẫn mở');
      await page.click('#btn-player-cancel');
      ok(await page.isHidden('#player-form'), 'Hủy ẩn biểu mẫu');
      // Bấm nền tối để đóng
      await page.mouse.click(5, 5);
      await page.waitForTimeout(100);
      ok(await page.evaluate(() => document.getElementById('players').hidden), 'bấm nền đóng hộp thoại');
      // 13. Nút chơi ngẫu nhiên đổi href sang một trong 6 game
      const rnd = await page.evaluate(() => { const a = document.getElementById('btn-random'); a.addEventListener('click', (e) => e.preventDefault(), { once: true }); a.click(); return a.getAttribute('href'); });
      ok(DIRS.some((d) => rnd === d + '/'), 'href ngẫu nhiên: ' + rnd);
      // Không có script inline nào cần 'unsafe-inline'; văn bản độc hại trong tên được escape
      await page.evaluate(() => { window.Players.rename('p1', '<img src=x onerror=alert(1)>'); });
      await page.waitForTimeout(100);
      eq(await page.evaluate(() => document.querySelectorAll('#btn-player img, #player-list img').length), 0, 'tên độc hại được escape');
      ok((await text(page, '#hero-name')).indexOf('img src=x') >= 0, 'tên hiển thị dạng văn bản');
      // 14. Bàn phím trong hộp thoại: Tab quay vòng bên trong, Escape ở cổng phụ huynh chỉ đóng cổng
      await page.click('#btn-player');
      await page.waitForTimeout(150);
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press(i % 3 === 2 ? 'Shift+Tab' : 'Tab');
        ok(await page.evaluate(() => document.getElementById('players').contains(document.activeElement)), 'Tab thoát khỏi hộp thoại ở bước ' + i);
      }
      await page.click('#btn-player-remove');
      await page.waitForTimeout(100);
      ok(await page.evaluate(() => !document.getElementById('parent-gate').hidden && document.activeElement.id === 'parent-gate-input'), 'cổng mở, focus ở ô đáp án');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(100);
      ok(await page.evaluate(() => document.getElementById('parent-gate').hidden && !document.getElementById('players').hidden), 'Escape chỉ đóng cổng');
      eq(await page.evaluate(() => getComputedStyle(document.body).overflow), 'hidden', 'khóa cuộn khi hộp thoại mở');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(100);
      eq(await page.evaluate(() => getComputedStyle(document.body).overflow), 'visible', 'mở cuộn khi đóng');
      // 14b. Huy hiệu (hoàn thành cuoi-ho + Hổ Vàng) hiện đúng và đủ tương phản (mực trên vàng, không trắng trên cam)
      await page.evaluate(() => {
        const d = JSON.parse(localStorage.getItem('cuoi-ho-v1'));
        const lv = {}; for (let i = 1; i <= 9; i++) lv['l' + i] = { best: 1000, stars: 3, quiz: true };
        d.players.p1 = { unlocked: 9, levels: lv, badge: true, missed: {}, stats: { plays: 9, correct: 90, wrong: 0, seconds: 3000, last: 1756800000000 } };
        localStorage.setItem('cuoi-ho-v1', JSON.stringify(d));
        window.__Hub.render();
      });
      await page.waitForTimeout(100);
      const badges = await page.$$eval('.achv li.badge', (els) => els.map((e) => e.textContent.trim()));
      ok(badges.length === 2 && badges[0].indexOf('Hổ Vàng') >= 0 && badges[1].indexOf('Cưỡi Hổ') >= 0, 'huy hiệu: ' + JSON.stringify(badges));
      eq(await progress(page, 'cuoi-ho'), '⭐ 27/27 sao · 9/9 màn · 🏅', 'thẻ cuoi-ho hoàn thành + 🏅');
      for (const sel of ['.achv li.badge', '.achv li:not(.badge)', '[data-game="cuoi-ho"] .progress']) {
        const c = await contrastOf(page, sel);
        ok(c !== null && c >= 4.5, 'tương phản ' + sel + ' = ' + (c === null ? 'null' : c.toFixed(2)));
      }
      await page.screenshot({ path: require('path').join(__dirname, 'out', 'root', 'hub-' + label + '-badges.png'), clip: { x: 0, y: 0, width: viewport.width, height: 420 } });
      // 15. Id người chơi lạ ('__proto__') trong hồ sơ không đọc được gì từ prototype và không gây lỗi
      const hostile = await page.evaluate(() => {
        localStorage.setItem('3hoa-players-v1', JSON.stringify({ v: 1, active: '__proto__', players: [{ id: '__proto__', name: 'X', avatar: '🐯' }] }));
        window.Players.load(); window.__Hub.render();
        return { name: window.Players.active().name, played: window.__Hub.summarizeAll('__proto__').filter((s) => s.played).length, pwn: ({}).x };
      });
      eq(hostile.name, 'X', 'hồ sơ lạ vẫn nạp');
      eq(hostile.played, 0, 'id lạ → không đọc được tiến trình');
      eq(hostile.pwn, undefined, 'không nhiễm prototype');
      // 16. Trang 404: cùng giao diện, 7 liên kết ≥ 44px, không lỗi
      const p404 = await context.newPage();
      const errs404 = [];
      p404.on('pageerror', (e) => errs404.push(String(e)));
      p404.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|net::ERR|Failed to load resource/.test(m.text())) errs404.push(m.text()); });
      await p404.goto(url + '404.html');
      await p404.waitForTimeout(300);
      const r404 = await p404.evaluate(() => ({ links: document.querySelectorAll('a.btn').length, small: Array.from(document.querySelectorAll('a.btn')).filter((a) => a.getBoundingClientRect().height < 44).length, csp: !!document.querySelector('meta[http-equiv="Content-Security-Policy"]'), inline: document.querySelectorAll('script,[onclick]').length }));
      await p404.screenshot({ path: require('path').join(__dirname, 'out', 'root', 'hub-404.png') });
      await p404.close();
      ok(r404.links === 7 && r404.small === 0 && r404.csp && r404.inline === 0 && errs404.length === 0, '404.html: ' + JSON.stringify(r404) + ' ' + errs404.join(';'));
    }
  }, { viewport, initScript, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const clean = assertClean(log, 'hub ' + label);
  console.log('hub ' + label + ' — ảnh ' + summary.imgBytes + ' B, tổng ' + summary.allBytes + ' B / ' + summary.requests + ' yêu cầu, cao ' + summary.docH + ' px' + (reduced ? ' (reduced motion)' : ''));
  return clean;
}

(async () => {
  let allOk = true;
  for (const [label, vp, reduced] of [['1180x820', { width: 1180, height: 820 }, false], ['820x1180', { width: 820, height: 1180 }, false], ['390x844', { width: 390, height: 844 }, true]]) {
    try { if (!(await run(label, vp, reduced))) allOk = false; }
    catch (e) { console.error('hub ' + label + ' — THẤT BẠI: ' + (e && e.stack || e)); allOk = false; }
  }
  if (!allOk) process.exit(1);
  console.log('hub e2e — tất cả đạt');
})().catch((e) => { console.error(e); process.exit(1); });
