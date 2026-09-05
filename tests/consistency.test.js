'use strict';
/* Kiểm tra tính nhất quán giữa các game: mọi game phải có cùng các tính năng dùng chung
   (CSP, hồ sơ người chơi, màn hình người chơi / kết quả / cổng phụ huynh, service worker, a11y cơ bản). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const GAMES = ['math-ninja', 'cuu-chuong', 'me-cung-dong-ho', 'thap-dong-ho', 'xe-tang-thoi-gian', 'cuoi-ho'];
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('profile.js is identical in every game and the hub', () => {
  const canon = read('js/profile.js');
  for (const g of GAMES) {
    assert.ok(fs.existsSync(path.join(ROOT, g, 'js/profile.js')), g + ' thiếu js/profile.js');
    assert.equal(read(g + '/js/profile.js'), canon, g + '/js/profile.js khác bản gốc /js/profile.js');
  }
});

for (const g of GAMES) {
  test(g + ': index.html has CSP, referrer, script order, shared screens, no inline handlers', () => {
    const html = read(g + '/index.html');
    assert.match(html, /<meta http-equiv="Content-Security-Policy"/, 'thiếu CSP meta');
    assert.match(html, /script-src 'self'/, 'CSP phải có script-src self');
    assert.match(html, /<meta name="referrer" content="no-referrer">/, 'thiếu referrer meta');
    assert.doesNotMatch(html, /\son[a-z]+\s*=\s*["']/i, 'còn thuộc tính on*= inline');
    assert.doesNotMatch(html, /<script(?![^>]*\ssrc=)[^>]*>/i, 'còn <script> inline');
    const scripts = Array.from(html.matchAll(/<script[^>]+src="([^"]+)"/g)).map((m) => m[1]);
    const iProfile = scripts.indexOf('js/profile.js'), iGame = scripts.indexOf('js/game.js');
    assert.ok(iProfile >= 0, 'chưa nạp js/profile.js');
    assert.ok(iGame > iProfile, 'js/profile.js phải nạp trước js/game.js');
    for (const id of ['btn-player', 'players', 'player-list', 'player-form', 'player-name', 'player-avatars', 'report', 'report-stats', 'report-review', 'parent-gate', 'parent-gate-input']) {
      assert.match(html, new RegExp('id="' + id + '"'), 'thiếu phần tử #' + id);
    }
    assert.match(html, /id="toast"[^>]*role="status"|role="status"[^>]*id="toast"/, '#toast thiếu role=status');
    assert.match(html, /aria-live="polite"/, 'thiếu aria-live');
  });

  test(g + ': service worker precaches profile.js and bumped its cache version', () => {
    const sw = read(g + '/sw.js');
    assert.match(sw, /'\.\/js\/profile\.js'/, 'CORE thiếu ./js/profile.js');
    const m = sw.match(/const CACHE = '([a-z-]+)-v(\d+)'/);
    assert.ok(m, 'không tìm thấy CACHE');
    const base = { 'math-ninja': 3, 'cuu-chuong': 1, 'me-cung-dong-ho': 1, 'thap-dong-ho': 1, 'xe-tang-thoi-gian': 1, 'cuoi-ho': 1 }[g];
    assert.ok(Number(m[2]) > base, 'CACHE chưa tăng phiên bản (đang ' + m[0] + ')');
    // mọi tệp trong CORE phải tồn tại
    const core = Array.from(sw.matchAll(/'\.\/([^']+)'/g)).map((x) => x[1]).filter((p) => p !== '');
    for (const p of core) assert.ok(fs.existsSync(path.join(ROOT, g, p)), 'CORE liệt kê tệp không tồn tại: ' + p);
  });

  test(g + ': game.js routes progress through the active player and has the shared hooks', () => {
    const js = read(g + '/js/game.js');
    assert.match(js, /players/, 'Store chưa có players');
    assert.match(js, /noteMissed/, 'thiếu Store.noteMissed');
    assert.match(js, /noteOk/, 'thiếu Store.noteOk');
    assert.match(js, /addStats/, 'thiếu Store.addStats');
    assert.match(js, /__proto__/, 'thiếu reviver chặn __proto__');
    assert.match(js, /addEventListener\('error'/, 'thiếu trình xử lý lỗi toàn cục');
    assert.match(js, /unhandledrejection/, 'thiếu trình xử lý unhandledrejection');
    assert.match(js, /prefers-reduced-motion/, 'chưa hỗ trợ prefers-reduced-motion');
    assert.match(js, /aria-pressed/, 'nút bật/tắt thiếu aria-pressed');
    assert.match(js, /Players\.(active|onChange)/, 'chưa dùng window.Players');
    assert.doesNotMatch(js, /window\.prompt\(/, 'còn dùng window.prompt');
  });

  test(g + ': style.css has focus-visible and reduced-motion rules', () => {
    const css = read(g + '/style.css');
    assert.match(css, /:focus-visible/, 'thiếu :focus-visible');
    assert.match(css, /prefers-reduced-motion/, 'thiếu @media (prefers-reduced-motion)');
    assert.match(css, /\.player-chip/, 'thiếu CSS .player-chip');
  });

  test(g + ': tests exist', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'tests', g + '.test.js')), 'thiếu tests/' + g + '.test.js');
    assert.ok(fs.existsSync(path.join(ROOT, 'tests/e2e', g + '.e2e.js')), 'thiếu tests/e2e/' + g + '.e2e.js');
  });
}

test('hub: CSP, no inline handlers, profile.js + hub.js loaded', () => {
  const html = read('index.html');
  assert.match(html, /<meta http-equiv="Content-Security-Policy"/);
  assert.doesNotMatch(html, /\son[a-z]+\s*=\s*["']/i, 'còn on*= inline');
  assert.match(html, /js\/profile\.js/);
  assert.match(html, /js\/hub\.js/);
  assert.ok(fs.existsSync(path.join(ROOT, 'js/hub.js')));
});

/* ============================================================
   Tính nhất quán theo scratchpad/CANON.md: cùng một cách nói, cùng một quy tắc ở cả sáu game
   ============================================================ */

for (const g of GAMES) {
  test(g + ' [canon]: report tiles, mastery badge, toggles, gate, entry points, welcome', () => {
    const js = read(g + '/js/game.js');
    const html = read(g + '/index.html');

    // 1. Ô thống kê: phút luyện tập (không phải giây), sao dạng n/max, nhãn đúng
    assert.match(js, /phút luyện tập/, 'thiếu ô "phút luyện tập"');
    assert.doesNotMatch(js, /giây luyện tập/, 'còn hiển thị "giây luyện tập"');
    assert.match(js, /ván đã chơi/, 'thiếu ô "ván đã chơi"');
    assert.match(js, /trả lời đúng/, 'thiếu ô "trả lời đúng"');

    // 1b. Dòng "Cần luyện thêm" và mục "Cần ôn lại"
    assert.match(html, /id="report-weak"/, 'thiếu #report-weak trong index.html');
    assert.match(js, /Cần luyện thêm/, 'thiếu chữ "Cần luyện thêm"');
    assert.match(js, /📝 Cần ôn lại/, 'tiêu đề mục ôn lại phải là "📝 Cần ôn lại"');

    // 2. Huy hiệu thuộc bài: chỉ dùng ✅, không dùng 🏅 hay 🎓
    assert.match(js, /✅ Đã thuộc/, 'thiếu huy hiệu "✅ Đã thuộc"');
    assert.doesNotMatch(js, /🏅 Đã thuộc|🎓 Đã thuộc/, 'huy hiệu "Đã thuộc" dùng biểu tượng khác ✅');

    // 3. Hàng nút bật/tắt
    assert.match(js, /🔊 Âm thanh: Bật/, 'nút đầu tiên phải là "🔊 Âm thanh"');
    assert.doesNotMatch(js, /🔊 Hiệu ứng/, '"Hiệu ứng" chỉ dành cho nút ✨');
    assert.match(js, /🎵 Nhạc nền: Bật/, 'thiếu nút "🎵 Nhạc nền"');
    assert.match(js, /✨ Hiệu ứng: Nhiều/, 'thiếu nút "✨ Hiệu ứng"');
    assert.match(js, /chưa có giọng Việt/, 'nút giọng đọc thiếu trạng thái "chưa có giọng Việt"');
    assert.match(js, /theo cài đặt máy/, 'nút hiệu ứng thiếu trạng thái "Ít (theo cài đặt máy)"');

    // 4. Cổng phụ huynh
    assert.match(js, /Dành cho phụ huynh, thầy cô\./, 'câu hỏi cổng phụ huynh thiếu phần mở đầu');

    // 5. Lối vào màn kết quả
    assert.match(html, /id="btn-report-levels"/, 'thiếu nút 📊 Kết quả ở màn chọn màn');
    assert.match(html, /id="btn-report"/, 'thiếu nút 📊 ở màn người chơi');
    assert.match(html, /📊 Kết quả/, 'nút ở màn chọn màn phải có chữ "📊 Kết quả"');

    // 6. Lời chào hiện bằng chữ (không chỉ giọng đọc)
    assert.match(js, /toast\('Chào ' \+|toast\("Chào " \+/, 'lời chào phải hiện bằng toast, không chỉ Voice.say');

    // 8. README nêu cách chạy kiểm thử
    const rm = read(g + '/README.md');
    assert.match(rm, new RegExp('tests/' + g + '\\.test\\.js'), 'README thiếu lệnh chạy kiểm thử đơn vị');
    assert.match(rm, new RegExp('tests/e2e/' + g + '\\.e2e\\.js'), 'README thiếu lệnh chạy kiểm thử đầu-cuối');
  });
}
