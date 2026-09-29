'use strict';
/* Nhóm G của đợt rà soát 2026-09-28 cho 6 game cũ và trang Đảo Khủng Long:
   phông Baloo 2 tự lưu (không Google Fonts), thẻ chia sẻ (Open Graph, canonical), ảnh trong game nhẹ,
   không dấu gạch dài, và bảng tạm dừng trên đảo có nút âm thanh giống nhau ở 6 game.
   Service worker: tests/games-nhom-g-sw.test.js và tests/consistency.test.js. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const GAMES = ['math-ninja', 'cuu-chuong', 'me-cung-dong-ho', 'thap-dong-ho', 'xe-tang-thoi-gian', 'cuoi-ho'];
const PAGES = GAMES.concat(['dao-khung-long']);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const GACH_DAI = String.fromCharCode(0x2014);

/** Kích thước ảnh: PNG đọc IHDR, JPEG đọc khung SOF. */
function imageSize(file) {
  const b = fs.readFileSync(path.join(ROOT, file));
  if (b.readUInt32BE(0) === 0x89504e47) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), bytes: b.length, type: 'png' };
  assert.equal(b.readUInt16BE(0), 0xffd8, file + ' không phải JPEG');
  let i = 2;
  while (i < b.length) {
    const m = b.readUInt16BE(i), len = b.readUInt16BE(i + 2);
    if (m >= 0xffc0 && m <= 0xffcf && m !== 0xffc4 && m !== 0xffc8 && m !== 0xffcc) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7), bytes: b.length, type: 'jpeg' };
    i += 2 + len;
  }
  throw new Error('không đọc được kích thước ' + file);
}

for (const g of PAGES) {
  test(g + ': phông Baloo 2 tự lưu ở ../fonts, CSP không còn Google Fonts', () => {
    const html = read(g + '/index.html');
    assert.match(html, /<link rel="stylesheet" href="\.\.\/fonts\/baloo-2\.css">/);
    assert.doesNotMatch(html, /fonts\.g(oogleapis|static)\.com/, 'còn Google Fonts');
    const csp = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/)[1];
    assert.match(csp, /font-src 'self' data:;/);
    assert.match(csp, /style-src 'self' 'unsafe-inline';/);
    assert.match(csp, /connect-src 'self';/);
    assert.ok(html.indexOf('../fonts/baloo-2.css') < html.indexOf('href="style.css"'), 'phông nạp trước style.css');
  });

  test(g + ': thẻ chia sẻ Open Graph / Twitter, canonical, ảnh og.jpg 1200x630 nhẹ', () => {
    const html = read(g + '/index.html');
    const url = 'https://3hoa.com/' + g + '/';
    const meta = (k) => { const m = html.match(new RegExp('<meta (?:property|name)="' + k + '" content="([^"]+)">')); return m && m[1]; };
    assert.match(html, new RegExp('<link rel="canonical" href="' + url + '">'));
    assert.equal(meta('og:url'), url);
    assert.equal(meta('og:type'), 'website');
    assert.equal(meta('og:locale'), 'vi_VN');
    assert.equal(meta('og:title'), html.match(/<title>([^<]+)<\/title>/)[1]);
    assert.equal(meta('og:description'), meta('description'));
    assert.equal(meta('og:image'), url + 'og.jpg');
    assert.equal(meta('twitter:card'), 'summary_large_image');
    assert.equal(meta('twitter:image'), url + 'og.jpg');
    assert.ok(meta('og:image:alt'));
    const s = imageSize(g + '/og.jpg');
    assert.deepEqual([s.type, s.w, s.h], ['jpeg', 1200, 630]);
    assert.ok(s.bytes < 150 * 1024, g + '/og.jpg nặng ' + s.bytes + ' byte');
  });
}

test('ảnh trong game: tank-body.png và tiger-rider.png đủ nét cho iPad (2x) mà nhẹ; không ảnh nào của game quá 300 KB', () => {
  // Xe tăng vẽ rộng tối đa 2,65 × 78 = 207 px CSS; hổ rộng tối đa 280 px CSS (ảnh ở menu), 250 px trong game
  const tank = imageSize('xe-tang-thoi-gian/assets/tank-body.png');
  const tiger = imageSize('cuoi-ho/assets/tiger-rider.png');
  assert.ok(tank.w >= 414 && tank.bytes < 200 * 1024, 'tank-body.png ' + tank.w + ' px, ' + tank.bytes + ' byte');
  assert.ok(tiger.w >= 520 && tiger.bytes < 260 * 1024, 'tiger-rider.png ' + tiger.w + ' px, ' + tiger.bytes + ' byte');
  for (const g of GAMES) {
    const walk = (d) => fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(d + '/' + e.name) : [d + '/' + e.name]);
    for (const f of walk(g).filter((x) => /\.(png|jpe?g|webp|gif)$/i.test(x))) {
      assert.ok(fs.statSync(path.join(ROOT, f)).size < 300 * 1024, f + ' quá 300 KB');
    }
  }
});

test('không còn dấu gạch dài trong 6 game cũ, trang đảo, service worker và kiểm thử của chúng', () => {
  const walk = (d) => fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(d + '/' + e.name) : [d + '/' + e.name]);
  const files = GAMES.flatMap((g) => walk(g)).filter((f) => /\.(html|css|js|json|md|svg)$/.test(f))
    .concat(['dao-khung-long/index.html', 'dao-khung-long/sw.js', 'dao-khung-long/manifest.json', 'scripts/refresh-games.py', 'tests/consistency.test.js'])
    .concat(fs.readdirSync(__dirname).filter((f) => GAMES.some((g) => f.startsWith(g + '.') || f.startsWith(g + '-dao.')) || f.startsWith('games-nhom-g')).map((f) => 'tests/' + f));
  for (const f of files) {
    const lines = read(f).split('\n');
    lines.forEach((l, i) => assert.ok(l.indexOf(GACH_DAI) < 0, f + ':' + (i + 1) + ' còn dấu gạch dài: ' + l.trim().slice(0, 80)));
  }
});

/* ---------------- Bảng tạm dừng trên đảo: ▶ Chơi tiếp / 🔊 Âm thanh + 🏝️ Về đảo ---------------- */

const BAT_DAU = '  /* ==== Bảng tạm dừng trên đảo: khối này giống hệt nhau ở 6 game';
const KET_THUC = '  /* ==== hết khối bảng tạm dừng ==== */';
function khoiTamDung(g) {
  const js = read(g + '/js/dao.js').replace(/\r\n/g, '\n');
  const a = js.indexOf(BAT_DAU), b = js.indexOf(KET_THUC);
  assert.ok(a > 0 && b > a, g + '/js/dao.js thiếu khối bảng tạm dừng');
  return js.slice(a, b + KET_THUC.length);
}

test('bảng tạm dừng trên đảo: khối dựng giống hệt nhau ở 6 game, mỗi game nối nút âm thanh vào thiết lập âm thanh của mình', () => {
  const mau = khoiTamDung(GAMES[0]);
  for (const g of GAMES) {
    assert.equal(khoiTamDung(g), mau, g + ': khối bảng tạm dừng khác math-ninja');
    const js = read(g + '/js/dao.js').replace(/\r\n/g, '\n').replace(mau, '');
    const i = js.indexOf('hangTamDung(');   // lời gọi (ngoài phần định nghĩa)
    assert.ok(i > 0, g + ' chưa gọi hangTamDung');
    assert.match(js.slice(i, i + 600), /Sfx\.setEnabled\(bat\)|applyAudioSettings\(\)|apDungAmThanh\(\)/, g + ': nút âm thanh phải bật / tắt âm thanh của game');
  }
});

/** DOM tí hon đủ cho khối bảng tạm dừng: cây phần tử, id, lớp, thuộc tính, sự kiện click. */
function miniDom(cssAn) {
  const byId = {};
  function el(tag, id) {
    const e = {
      tagName: tag.toUpperCase(), children: [], parentNode: null, hidden: false, textContent: '', attrs: {}, listeners: [], _cls: new Set(),
      get id() { return this._id || ''; }, set id(v) { this._id = v; byId[v] = this; },
      get className() { return Array.from(this._cls).join(' '); }, set className(v) { this._cls = new Set(String(v).split(/\s+/).filter(Boolean)); },
      get classList() { const s = this._cls; return { add: (...c) => c.forEach((x) => s.add(x)), remove: (...c) => c.forEach((x) => s.delete(x)), contains: (c) => s.has(c) }; },
      get nextSibling() { const p = this.parentNode; if (!p) return null; return p.children[p.children.indexOf(this) + 1] || null; },
      setAttribute(k, v) { this.attrs[k] = String(v); }, getAttribute(k) { return this.attrs[k]; },
      appendChild(c) { return this.insertBefore(c, null); },
      insertBefore(c, ref) {
        if (c.parentNode) c.parentNode.children.splice(c.parentNode.children.indexOf(c), 1);
        const i = ref ? this.children.indexOf(ref) : -1;
        if (i < 0) this.children.push(c); else this.children.splice(i, 0, c);
        c.parentNode = this; return c;
      },
      addEventListener(t, fn) { if (t === 'click') this.listeners.push(fn); },
      click() { this.listeners.forEach((fn) => fn({})); }
    };
    if (id) e.id = id;
    return e;
  }
  const panel = el('div');
  const hang1 = el('div'); hang1.className = 'btn-row';
  const tiep = el('button', 'btn-resume'); tiep.textContent = '▶ Chơi tiếp';
  hang1.appendChild(tiep);
  const hang2 = el('div'); hang2.className = 'btn-row';
  const choiLai = el('button', 'btn-restart');
  const ve = el('button', 'btn-dao-ve'); ve.className = 'btn ghost small'; ve.textContent = 'Về đảo'; ve.hidden = true;
  hang2.appendChild(choiLai); hang2.appendChild(ve);
  panel.appendChild(el('h2')); panel.appendChild(hang1); panel.appendChild(hang2);
  const document = {
    createElement: (t) => el(t),
    getElementById: (id) => byId[id] || null,
    querySelector: (q) => (q === '#pause .panel' ? panel : null)
  };
  const window = { getComputedStyle: (e) => ({ display: cssAn.includes(e.id) ? 'none' : 'inline-flex' }), Sfx: { unlock() {}, play() {} } };
  return { document, window, panel, hang1, hang2, tiep, ve, choiLai };
}

for (const g of GAMES) {
  test(g + ' đảo: nút 🔊 Âm thanh nằm cạnh 🏝️ Về đảo, ngay dưới ▶ Chơi tiếp, bật / tắt đúng trạng thái', () => {
    const d = miniDom(['btn-restart']);
    const ctx = vm.createContext({ document: d.document, window: d.window, String, Array });
    vm.runInContext(khoiTamDung(g) + '\nthis.hangTamDung = hangTamDung;', ctx);
    let tieng = true; const goi = [];
    const kq = ctx.hangTamDung(d.ve, () => tieng, (b) => { tieng = b; goi.push(b); });
    const hang = d.panel.children[2];
    assert.equal(d.panel.children[1], d.hang1, '"▶ Chơi tiếp" vẫn đứng đầu');
    assert.equal(hang.className, 'btn-row dao-hang-tam-dung');
    const [am, ve] = hang.children;
    assert.equal(ve, d.ve, 'nút Về đảo chuyển vào hàng mới');
    assert.equal(ve.textContent, '🏝️ Về đảo');
    assert.equal(ve.hidden, false);
    assert.ok(ve.classList.contains('teal') && !ve.classList.contains('small') && !ve.classList.contains('ghost'));
    assert.equal(d.hang2.hidden, true, 'hàng cũ chỉ còn nút đã ẩn trên đảo: ẩn luôn');
    assert.equal(am.id, 'dao-nut-am-thanh');
    assert.equal(am.textContent, '🔊 Âm thanh: Bật');
    assert.equal(am.getAttribute('aria-pressed'), 'true');
    am.click();
    assert.deepEqual(goi, [false]);
    assert.equal(am.textContent, '🔇 Âm thanh: Tắt');
    assert.equal(am.getAttribute('aria-pressed'), 'false');
    assert.ok(am.classList.contains('off'));
    am.click();
    assert.deepEqual(goi, [false, true]);
    assert.equal(am.textContent, '🔊 Âm thanh: Bật');
    assert.equal(ctx.hangTamDung(d.ve, () => true, () => {}), null, 'chỉ dựng một lần');
    assert.ok(kq && typeof kq.ve === 'function');
    // Hàng cũ còn nút đang hiện (Tháp Đồng Hồ: "Về đảo" nằm cạnh "Chơi tiếp") thì giữ nguyên
    const d2 = miniDom([]);
    d2.hang1.appendChild(d2.ve);
    const ctx2 = vm.createContext({ document: d2.document, window: d2.window, String, Array });
    vm.runInContext(khoiTamDung(g) + '\nthis.hangTamDung = hangTamDung;', ctx2);
    ctx2.hangTamDung(d2.ve, () => false, () => {});
    assert.equal(d2.hang1.hidden, false);
    assert.equal(d2.panel.children[2].children[0].textContent, '🔇 Âm thanh: Tắt');
  });
}

test('dao.css của 6 game có cùng quy tắc cho hàng tạm dừng trên đảo', () => {
  const quyTac = (g) => read(g + '/dao.css').replace(/\r\n/g, '\n').split('\n').filter((l) => /^\.dao-hang-tam-dung/.test(l)).join('\n');
  const mau = quyTac(GAMES[0]);
  assert.ok(mau.split('\n').length === 2);
  for (const g of GAMES) assert.equal(quyTac(g), mau, g + '/dao.css');
});
