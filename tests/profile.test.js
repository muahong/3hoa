'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame, makeStorage } = require('./lib/load.js');

const load = (storage) => loadGame('.', ['js/profile.js'], { localStorage: storage }).Players;

test('profile: default player is created and persisted', () => {
  const st = makeStorage();
  const P = load(st);
  assert.equal(P.active().id, 'p1');
  assert.equal(P.active().name, 'Bé');
  assert.ok(P.AVATARS.includes(P.active().avatar));
  assert.equal(P.list().length, 1);
  // storage is only written on change; a fresh load must still give the same default
  const P2 = load(st);
  assert.equal(P2.active().id, 'p1');
});

test('profile: add / rename / avatar / switch / remove with validation', () => {
  const st = makeStorage();
  const P = load(st);
  const events = [];
  P.onChange((a) => events.push(a.id + ':' + a.name));
  assert.equal(P.add('', '🦉'), null, 'empty name rejected');
  const a = P.add('  Minh   Anh <b>x</b>  ', '🦉');
  assert.ok(a && a.id !== 'p1');
  assert.equal(a.name, 'Minh Anh bx/b', 'angle brackets stripped, spaces collapsed');
  assert.equal(P.active().id, a.id, 'new player becomes active');
  assert.ok(P.add('Quá dài quá dài quá dài quá dài', '🐼').name.length <= 16);
  assert.equal(P.list().length, 3);
  assert.ok(P.setActive('p1'));
  assert.equal(P.active().name, 'Bé');
  assert.ok(!P.setActive('nope'));
  assert.ok(P.rename('p1', 'Bống'));
  assert.equal(P.active().name, 'Bống');
  assert.ok(!P.setAvatar('p1', '💣'));
  assert.ok(P.setAvatar('p1', '🐸'));
  assert.equal(P.active().avatar, '🐸');
  assert.ok(P.remove(a.id));
  assert.equal(P.list().length, 2);
  assert.ok(events.length >= 6);
  // persisted and reloadable
  const P2 = load(st);
  assert.equal(P2.list().length, 2);
  assert.equal(P2.active().name, 'Bống');
  // cannot remove last
  P2.remove(P2.list()[1].id);
  assert.ok(!P2.remove('p1'));
  assert.equal(P2.list().length, 1);
});

test('profile: corrupt / hostile storage is sanitized', () => {
  const st = makeStorage();
  st.setItem('3hoa-players-v1', JSON.stringify({ v: 1, active: '../x', players: [
    { id: 'ok1', name: '<script>alert(1)</script>', avatar: '💣', created: 'x' },
    { id: 'bad id!', name: 'Nope' },
    null, 42,
    { id: 'ok1', name: 'dup' },
    { id: 'ok2', name: '   ', avatar: '🦊' }
  ], __proto__: { polluted: true } }));
  const P = load(st);
  assert.equal(P.list().length, 2);
  assert.equal(P.list()[0].name, 'scriptalert(1)/s', 'tags stripped and capped at 16 chars');
  assert.equal(P.list()[0].avatar, P.AVATARS[0]);
  assert.equal(P.list()[1].name, 'Bé');
  assert.equal(P.active().id, 'ok1', 'invalid active falls back to first');
  assert.equal(({}).polluted, undefined);
  st.setItem('3hoa-players-v1', '{not json');
  const P2 = load(st);
  assert.equal(P2.active().id, 'p1');
  assert.ok(P2.chipHtml().includes('<span class="pl-name">Bé</span>'));
  assert.equal(P2.esc('<a href="x">'), '&lt;a href=&quot;x&quot;&gt;');
});

test('profile: cap at 8 players and cross-tab storage event re-reads', () => {
  const st = makeStorage();
  const w = loadGame('.', ['js/profile.js'], { localStorage: st });
  const P = w.Players;
  for (let i = 0; i < 10; i++) P.add('Bé ' + i, '🐯');
  assert.equal(P.list().length, 8);
  const other = load(st);
  const hits = [];
  P.onChange((a) => hits.push(a.id));
  other.setActive('p1');
  w.dispatchEvent({ type: 'storage', key: '3hoa-players-v1' });
  assert.equal(P.active().id, 'p1');
  assert.deepEqual(hits, ['p1']);
});

/* ============================================================
   Cổng phụ huynh dùng chung (C3): phép nhân cỡ người lớn / mã bố mẹ, sai 3 lần liền thì tạm khóa.
   Khóa '3hoa-cong-khoa-v1' và '3hoa-ma-bo-me-v1' dùng chung với cổng của Đảo Khủng Long.
   ============================================================ */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { makeWindow, ROOT } = require('./lib/load.js');

const GATE_KEY = '3hoa-cong-khoa-v1';
const PIN_KEY = '3hoa-ma-bo-me-v1';
const DAILY_KEY = '3hoa-het-gio-v1';
const GAME_DIRS = ['math-ninja', 'cuu-chuong', 'me-cung-dong-ho', 'thap-dong-ho', 'xe-tang-thoi-gian', 'cuoi-ho'];

/** FNV-1a 32 bit viết lại độc lập (BigInt, theo mã UTF-16) để đối chiếu Players.hashPin. */
function fnv1a(str) {
  let h = 2166136261n;
  for (let i = 0; i < str.length; i++) {
    h ^= BigInt(str.charCodeAt(i));
    h = (h * 16777619n) % 4294967296n;
  }
  return h.toString(16).padStart(8, '0');
}
const parseQ = (q) => { const m = /(\d+) × (\d+) = \?$/.exec(q.text); return m ? [Number(m[1]), Number(m[2])] : null; };
const answerOf = (q) => { const ab = parseQ(q); return String(ab[0] * ab[1]); };
const lockRec = (st) => JSON.parse(st.getItem(GATE_KEY));
function localDay(d) {
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

test('gate: adult multiplication questions follow the rules and change every call', () => {
  const P = load(makeStorage());
  let prev = null;
  const seenA = new Set(), seenB = new Set();
  for (let i = 0; i < 3000; i++) {
    const q = P.gateQuestion();
    assert.equal(q.pin, false);
    assert.match(q.text, /^Dành cho phụ huynh, thầy cô\. Để tiếp tục, hãy trả lời: \d+ × \d+ = \?$/);
    const [a, b] = parseQ(q);
    assert.ok(a >= 12 && a <= 49, 'số thứ nhất 12..49: ' + a);
    assert.ok(a % 10 !== 0 && a % 10 !== 1, 'không tròn chục, không tận cùng bằng 1: ' + a);
    assert.ok(b >= 3 && b <= 9 && b !== 5, 'số thứ hai 3..9, bỏ 5: ' + b);
    assert.notEqual(q.text, prev, 'không lặp lại câu vừa hỏi');
    prev = q.text;
    seenA.add(a); seenB.add(b);
  }
  assert.equal(seenA.size, 38 - 6, 'đủ mọi số hợp lệ'); // 38 số từ 12 tới 49, bỏ 20, 30, 40 và 21, 31, 41
  assert.deepEqual(Array.from(seenB).sort(), [3, 4, 6, 7, 8, 9]);
  assert.ok(!P.gateQuestion().text.match(/\b[2-9] × [2-9] =/), 'không còn câu bảng cửu chương');
});

test('gate: correct product passes once, wrong answer needs a new question', () => {
  const st = makeStorage();
  const P = load(st);
  let q = P.gateQuestion();
  assert.equal(P.gateCheck(' ' + answerOf(q) + ' '), 'ok', 'đúng (bỏ khoảng trắng)');
  assert.equal(st.getItem(GATE_KEY), null, 'đúng thì không ghi gì');
  assert.equal(P.gateCheck(answerOf(q)), 'wrong', 'mỗi câu chỉ trả lời một lần');
  q = P.gateQuestion();
  assert.equal(P.gateCheck(String(Number(answerOf(q)) + 1)), 'wrong');
  assert.deepEqual({ ...lockRec(st) }, { sai: 2, lan: 0, den: 0 }, 'đếm số lần sai liền');
  assert.equal(P.gateCheck(answerOf(q)), 'locked', 'đáp án của câu cũ sau khi sai không còn dùng được (lần sai thứ 3)');
  assert.ok(P.gateLockedSeconds() > 0);

  const st2 = makeStorage();
  const P2 = load(st2);
  q = P2.gateQuestion();
  assert.equal(P2.gateCheck('abc'), 'wrong');
  assert.equal(P2.gateCheck(''), 'wrong', 'chưa hỏi câu mới: vẫn là sai');
  q = P2.gateQuestion();
  assert.equal(P2.gateCheck(answerOf(q)), 'ok', 'câu mới trả lời đúng');
  assert.equal(st2.getItem(GATE_KEY), null, 'đúng thì xóa hồ sơ lần thử');
});

test('gate: third wrong answer in a row locks 60 s, then 120 s; success resets', () => {
  const st = makeStorage();
  const P = load(st);
  assert.equal(P.gateLockedSeconds(), 0);
  const wrongOnce = () => { const q = P.gateQuestion(); return P.gateCheck(String(Number(answerOf(q)) + 1)); };
  assert.equal(wrongOnce(), 'wrong');
  assert.equal(wrongOnce(), 'wrong');
  let t0 = Date.now();
  assert.equal(wrongOnce(), 'locked');
  let rec = lockRec(st);
  assert.equal(rec.sai, 0, 'khóa xong thì bắt đầu chuỗi mới');
  assert.equal(rec.lan, 1);
  assert.ok(Math.abs(rec.den - (t0 + 60000)) < 1000, 'lần khóa đầu 60 giây');
  assert.ok(P.gateLockedSeconds() >= 59 && P.gateLockedSeconds() <= 60);
  assert.match(P.gateLockText(), /tạm khóa.*1 phút/);
  // đang khóa: kể cả trả lời đúng cũng không qua, và không đổi hồ sơ
  const q = P.gateQuestion();
  assert.equal(P.gateCheck(answerOf(q)), 'locked');
  assert.deepEqual({ ...lockRec(st) }, { ...rec });

  // hết giờ khóa (giả lập bằng cách lùi mốc), sai 3 lần nữa → 120 giây
  st.setItem(GATE_KEY, JSON.stringify({ ...rec, den: Date.now() - 1 }));
  assert.equal(P.gateLockedSeconds(), 0);
  assert.equal(wrongOnce(), 'wrong');
  assert.equal(wrongOnce(), 'wrong');
  t0 = Date.now();
  assert.equal(wrongOnce(), 'locked');
  rec = lockRec(st);
  assert.equal(rec.lan, 2);
  assert.ok(Math.abs(rec.den - (t0 + 120000)) < 1000, 'lần khóa thứ hai 120 giây');
  assert.match(P.gateLockText(), /2 phút/);

  // trả lời đúng sau khi hết khóa → xóa hết, lần khóa sau lại từ 60 giây
  st.setItem(GATE_KEY, JSON.stringify({ ...rec, den: Date.now() - 1 }));
  const q2 = P.gateQuestion();
  assert.equal(P.gateCheck(answerOf(q2)), 'ok');
  assert.equal(st.getItem(GATE_KEY), null);
  wrongOnce(); wrongOnce(); t0 = Date.now();
  assert.equal(wrongOnce(), 'locked');
  assert.ok(Math.abs(lockRec(st).den - (t0 + 60000)) < 1000);

  // tối đa 15 phút; dưới 1 phút đếm bằng giây
  st.setItem(GATE_KEY, JSON.stringify({ sai: 2, lan: 9, den: 0 }));
  t0 = Date.now();
  assert.equal(wrongOnce(), 'locked');
  assert.ok(Math.abs(lockRec(st).den - (t0 + 15 * 60000)) < 1000, 'khóa tối đa 15 phút');
  st.setItem(GATE_KEY, JSON.stringify({ sai: 0, lan: 1, den: Date.now() + 42000 }));
  assert.match(P.gateLockText(), /42 giây|41 giây/);
});

test('gate: lock state is shared through storage (island and other games)', () => {
  const st = makeStorage();
  const A = load(st), B = load(st);
  const wrong = (P) => { P.gateQuestion(); return P.gateCheck('0'); };
  wrong(A); wrong(B);
  assert.equal(wrong(A), 'locked', 'lần sai ở game khác cũng được đếm');
  assert.ok(B.gateLockedSeconds() > 0, 'game khác cũng thấy đang khóa');
  // đảo ghi khóa theo cùng định dạng
  st.setItem(GATE_KEY, JSON.stringify({ sai: 0, lan: 3, den: Date.now() + 240000 }));
  assert.ok(A.gateLockedSeconds() > 230 && A.gateLockedSeconds() <= 240);
});

test('gate: parent PIN mode and hashPin formula', () => {
  assert.equal(fnv1a(''), '811c9dc5', 'kiểm tra lại bản FNV-1a độc lập');
  assert.equal(fnv1a('a'), 'e40c292c');
  const st = makeStorage();
  const P = load(st);
  for (const pin of ['2468', '0000', '1234', '9876', '0123']) assert.equal(P.hashPin(pin), fnv1a('3hoa-pin|' + pin), 'hashPin(' + pin + ')');
  assert.match(P.hashPin('2468'), /^[0-9a-f]{8}$/);
  assert.equal(P.hashPin('ạ'), fnv1a('3hoa-pin|ạ'), 'theo đơn vị UTF-16');

  st.setItem(PIN_KEY, JSON.stringify({ h: P.hashPin('2468') }));
  const q = P.gateQuestion();
  assert.equal(q.pin, true);
  assert.equal(q.text, 'Nhập mã bố mẹ (4 số) đã đặt trong Góc phụ huynh của Đảo Khủng Long');
  assert.equal(P.gateCheck('1357'), 'wrong');
  assert.equal(lockRec(st).sai, 1);
  assert.equal(P.gateQuestion().pin, true);
  assert.equal(P.gateCheck('2468'), 'ok');
  assert.equal(st.getItem(GATE_KEY), null);
  // ở chế độ mã, đáp số phép nhân không có tác dụng; sai 3 lần cũng khóa
  P.gateQuestion(); assert.equal(P.gateCheck(''), 'wrong');
  P.gateQuestion(); assert.equal(P.gateCheck('246'), 'wrong');
  P.gateQuestion(); assert.equal(P.gateCheck('24680'), 'locked');
  // bỏ mã (đảo xóa khóa) → quay về phép nhân
  st.removeItem(PIN_KEY);
  st.removeItem(GATE_KEY);
  assert.equal(P.gateQuestion().pin, false);
  // mã hỏng bị bỏ qua
  for (const bad of ['{"h":"XYZ"}', '{"h":"ABCDEF12"}', '{"h":12345678}', '[1]', '{bad', '"2468"']) {
    st.setItem(PIN_KEY, bad);
    assert.equal(P.gateQuestion().pin, false, 'mã hỏng: ' + bad);
  }
});

test('gate: garbage or hostile lock records are sanitized', () => {
  const st = makeStorage();
  const P = load(st);
  const cases = [
    ['{not json', 0],
    ['[1,2,3]', 0],
    ['"x"', 0],
    [JSON.stringify({ sai: 'x', lan: -4, den: 'soon' }), 0],
    [JSON.stringify({ sai: 0, lan: 1, den: Date.now() + 10 * 24 * 3600 * 1000 }), 0],   // xa quá mức tối đa: không khóa mãi
    [JSON.stringify({ sai: 0, lan: 1, den: Infinity }), 0],
    ['{"__proto__":{"den":99999999999999},"sai":1}', 0]
  ];
  for (const [raw, secs] of cases) {
    st.setItem(GATE_KEY, raw);
    assert.equal(P.gateLockedSeconds(), secs, 'hồ sơ: ' + raw);
  }
  assert.equal(({}).den, undefined, 'không làm bẩn Object.prototype');
  // ngoài khoảng → 0 (cùng cách lọc với đảo)
  st.setItem(GATE_KEY, JSON.stringify({ sai: 99, lan: 1e9, den: 0 }));
  P.gateQuestion();
  assert.equal(P.gateCheck('0'), 'wrong');
  assert.deepEqual({ ...lockRec(st) }, { sai: 1, lan: 0, den: 0 });
  st.setItem(GATE_KEY, JSON.stringify({ sai: 2.9, lan: 0, den: 0 }));
  P.gateQuestion();
  assert.equal(P.gateCheck('0'), 'locked', 'sai 2.9 → 2, lần sai tiếp theo khóa');
});

test('gate: still works when localStorage throws (private mode)', () => {
  const broken = { getItem() { throw new Error('no'); }, setItem() { throw new Error('no'); }, removeItem() { throw new Error('no'); } };
  const P = load(broken);
  const wrong = () => { P.gateQuestion(); return P.gateCheck('0'); };
  assert.equal(wrong(), 'wrong');
  assert.equal(wrong(), 'wrong');
  assert.equal(wrong(), 'locked', 'khóa giữ trong bộ nhớ');
  assert.ok(P.gateLockedSeconds() > 0);
});

/* ============================================================
   Giờ chơi trong ngày (C4): đảo ghi '3hoa-het-gio-v1', game cũ mở thẳng thì phủ lớp "đủ giờ rồi".
   ============================================================ */
function loadAt(st, pathname, search) {
  const w = makeWindow({ localStorage: st });
  w.location.pathname = pathname;
  w.location.search = search || '';
  const focused = [];
  const mk = w.document.createElement;
  w.document.createElement = (t) => { const e = mk(t); e.focus = () => focused.push(e); return e; };
  w.document.body.children.push(w.document.createElement('main'));   // phần trang có sẵn của game
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/profile.js'), 'utf8'), vm.createContext(w), { filename: 'js/profile.js' });
  w._focused = focused;
  return w;
}
const lockFor = (st, extra) => st.setItem(DAILY_KEY, JSON.stringify({ be: 'b1', ngay: localDay(new Date()), khoa_ca_trang: true, ...extra }));
const overlayOf = (w) => w.document.body.children.find((e) => e.attributes.role === 'dialog');
function textOf(e) { return (e.textContent || '') + ' ' + (e.children || []).map(textOf).join(' '); }
function findTag(e, tag) {
  if (e.tagName === tag) return e;
  for (const c of e.children || []) { const r = findTag(c, tag); if (r) return r; }
  return null;
}

test('daily lock: date, flag, page and ?dao=1 rules', () => {
  const st = makeStorage();
  const w = loadAt(st, '/math-ninja/');
  const P = w.Players;
  assert.equal(P.dailyLockActive(), false, 'chưa có mốc');
  lockFor(st);
  assert.equal(P.dailyLockActive(), true);
  for (const g of GAME_DIRS) {
    w.location.pathname = '/' + g + '/';
    assert.equal(P.dailyLockActive(), true, g);
    w.location.pathname = '/' + g + '/index.html';
    assert.equal(P.dailyLockActive(), true, g + '/index.html');
  }
  for (const p of ['/', '/index.html', '/dao-khung-long/', '/404.html', '/math-ninja']) {
    w.location.pathname = p;
    assert.equal(P.dailyLockActive(), false, 'không khóa ' + p);
  }
  w.location.pathname = '/cuoi-ho/';
  for (const s of ['?dao=1', '?dao=1&man=l1', '?man=l1&dao=1']) {
    w.location.search = s;
    assert.equal(P.dailyLockActive(), false, 'chạy trong đảo: ' + s);
  }
  for (const s of ['?dao=10', '?xdao=1', '?man=l1']) {
    w.location.search = s;
    assert.equal(P.dailyLockActive(), true, 'không phải chạy trong đảo: ' + s);
  }
  w.location.search = '';
  const y = new Date(); y.setDate(y.getDate() - 1);
  lockFor(st, { ngay: localDay(y) });
  assert.equal(P.dailyLockActive(), false, 'mốc của hôm qua');
  lockFor(st, { khoa_ca_trang: false });
  assert.equal(P.dailyLockActive(), false, 'bố mẹ không bật khóa cả trang');
  lockFor(st, { khoa_ca_trang: 'true' });
  assert.equal(P.dailyLockActive(), false, 'chỉ nhận true thật');
  lockFor(st, { ngay: localDay(new Date()).replace(/-/g, '/') });
  assert.equal(P.dailyLockActive(), false, 'ngày phải đúng dạng YYYY-MM-DD');
  for (const bad of ['{bad', '[]', '"x"', 'null']) {
    st.setItem(DAILY_KEY, bad);
    assert.equal(P.dailyLockActive(), false, 'mốc hỏng: ' + bad);
  }
});

test('daily lock: game page opened directly gets a blocking overlay; island iframe and hub do not', () => {
  const st = makeStorage();
  lockFor(st);
  const w = loadAt(st, '/thap-dong-ho/');
  const box = overlayOf(w);
  assert.ok(box, 'có lớp phủ');
  assert.equal(box.attributes['aria-modal'], 'true');
  assert.equal(box.style.position, 'fixed');
  assert.equal(box.style.pointerEvents, 'auto');
  assert.ok(Number(box.style.zIndex) > 100000);
  const txt = textOf(box);
  assert.match(txt, /Hôm nay con chơi đủ giờ rồi!/);
  assert.match(txt, /Bố mẹ đã đặt giờ chơi trong Đảo Khủng Long\. Mai mình chơi tiếp nhé!/);
  assert.match(txt, /Góc phụ huynh/);
  assert.doesNotMatch(txt, /\u2014/, 'không dùng gạch dài');
  const a = findTag(box, 'A');
  assert.ok(a, 'có nút về trang chủ');
  assert.equal(a.attributes.href, '../');
  assert.ok(w._focused.includes(a), 'tiêu điểm ở nút về trang chủ');
  const main = w.document.body.children[0];
  assert.equal(main.attributes.inert, '', 'phần game phía dưới bị vô hiệu');
  assert.equal(main.attributes['aria-hidden'], 'true');
  for (const t of ['keydown', 'pointerdown', 'touchstart', 'click']) assert.ok((w._listeners[t] || []).length > 0, 'chặn ' + t);
  // phím của bé không tới game: bị chặn lan truyền; Tab giữ tiêu điểm ở nút
  let stopped = 0, prevented = 0;
  w.dispatchEvent({ type: 'keydown', key: 'Tab', target: main, cancelable: true, stopPropagation() { stopped++; }, preventDefault() { prevented++; } });
  assert.equal(stopped, 1); assert.equal(prevented, 1);
  w.dispatchEvent({ type: 'pointerdown', target: main, cancelable: true, stopPropagation() { stopped++; }, preventDefault() { prevented++; } });
  assert.equal(stopped, 2); assert.equal(prevented, 2, 'chạm vào game bị chặn');
  // bố mẹ cho thêm giờ (đảo xóa mốc) → gỡ lớp phủ, trả lại trang
  st.removeItem(DAILY_KEY);
  w.dispatchEvent({ type: 'storage', key: DAILY_KEY });
  assert.equal(main.attributes.inert, undefined);
  assert.equal(main.attributes['aria-hidden'], undefined);
  w.dispatchEvent({ type: 'pointerdown', target: main, cancelable: true, stopPropagation() { stopped++; }, preventDefault() { prevented++; } });
  assert.equal(stopped, 2, 'hết khóa: không chặn nữa');

  assert.equal(overlayOf(loadAt(st, '/thap-dong-ho/')), undefined, 'không có mốc: không phủ');
  lockFor(st);
  assert.equal(overlayOf(loadAt(st, '/thap-dong-ho/', '?dao=1&man=L1')), undefined, 'chạy trong đảo: không phủ');
  assert.equal(overlayOf(loadAt(st, '/')), undefined, 'trang chủ không bao giờ bị khóa');
  assert.equal(overlayOf(loadAt(st, '/dao-khung-long/')), undefined, 'đảo tự lo giờ chơi');
});

test('gate: hub and all six games use the shared gate, no times-table question left', () => {
  const files = ['js/hub.js'].concat(GAME_DIRS.map((g) => g + '/js/game.js'));
  for (const f of files) {
    const js = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.match(js, /\.gateQuestion\(\)/, f + ' chưa dùng gateQuestion');
    assert.match(js, /\.gateCheck\(/, f + ' chưa dùng gateCheck');
    assert.match(js, /\.gateLockedSeconds\(\) > 0/, f + ' chưa chặn khi cổng đang khóa');
    assert.match(js, /'locked'/, f + ' chưa xử lý kết quả locked');
    assert.doesNotMatch(js, /Gate\.answer|parentA|2 \+ Math\.floor\(Math\.random\(\) \* 8\)/, f + ' còn câu nhân bảng cửu chương');
  }
  for (const f of ['index.html'].concat(GAME_DIRS.map((g) => g + '/index.html'))) {
    const html = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.match(html, /<input id="parent-gate-input"[^>]*inputmode="numeric"[^>]*maxlength="4"/, f + ': ô nhập phải nhận đủ mã 4 số');
  }
});
