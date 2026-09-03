'use strict';
// Kiểm thử logic trang chủ: đọc tiến trình các game (dạng mới / dạng cũ / dữ liệu hỏng), tổng hợp và KHÔNG ghi vào khóa của game
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame, makeStorage } = require('./lib/load.js');

const load = (st) => loadGame('.', ['js/profile.js', 'js/hub.js'], { localStorage: st });
// Mảng tạo trong ngữ cảnh vm có Array.prototype khác → sao chép sang mảng của tiến trình kiểm thử trước khi deepEqual
const arr = (a) => Array.from(a);

function seed() {
  const st = makeStorage();
  // dạng cũ (chưa di trú): cuoi-ho giữ tiến trình dưới progress.*
  st.setItem('cuoi-ho-v1', JSON.stringify({ sound: true, progress: { unlocked: 4, levels: { l1: { best: 900, stars: 3, quiz: true }, l2: { stars: 2, quiz: true }, l3: { stars: 3, quiz: true }, l4: { stars: 1, quiz: false } }, badge: false } }));
  // dạng mới: players[<id>]
  st.setItem('thap-dong-ho-v1', JSON.stringify({ players: { p1: { unlocked: 3, levels: { L1: { best: 500, stars: 3, done: 1 }, L2: { stars: 2, done: 1 } }, stats: { seconds: 600, last: 1700000000000 } }, pab: { levels: { L1: { stars: 1, done: 1 } } } } }));
  // dạng cũ arcade: records['mode:level:duration']
  st.setItem('ninja-toan-v1', JSON.stringify({ records: { 'answer:a1:90': { best: 1200, stars: 3 }, 'answer:a1:60': { stars: 2 }, 'pair:p1:90': { stars: 1 }, 'bogus:zz:90': { stars: 3 }, 'answer:a2:90': 'nope' } }));
  st.setItem('cuu-chuong-v1', JSON.stringify({ records: { 't2:mul:90': { stars: 2 }, 't2:div:90': { stars: 3 }, 'c1:x:90': { stars: 1 } } }));
  // dữ liệu độc hại
  st.setItem('me-cung-dong-ho-v1', '{"__proto__":{"pwn":1},"records":{"l1":{"stars":99,"best":"abc"},"l2":{"stars":-5,"passed":true},"l9":{"stars":3}}}');
  return st;
}

test('hub: summarize reads legacy and migrated shapes per player', () => {
  const w = load(seed());
  const H = w.__Hub;
  assert.ok(Object.isFrozen(H), 'hook is frozen');
  const ch = H.summarize('cuoi-ho', 'p1');
  assert.deepEqual([ch.stars, ch.max, ch.done, ch.total, ch.played, ch.best], [9, 27, 3, 9, true, 900]);
  const chOther = H.summarize('cuoi-ho', 'pab');
  assert.equal(chOther.stars, 0); assert.equal(chOther.played, false);
  const th = H.summarize('thap-dong-ho', 'p1');
  assert.deepEqual([th.stars, th.done, th.seconds, th.last, th.best], [5, 2, 600, 1700000000000, 500]);
  const thOther = H.summarize('thap-dong-ho', 'pab');
  assert.deepEqual([thOther.stars, thOther.done, thOther.played], [1, 1, true]);
  const nj = H.summarize('math-ninja', 'p1');
  assert.deepEqual([nj.stars, nj.max, nj.done, nj.best], [4, 48, 2, 1200]);
  const cc = H.summarize('cuu-chuong', 'p1');
  assert.deepEqual([cc.stars, cc.max, cc.done, cc.unit], [4, 45, 2, 'bảng']);
  const mc = H.summarize('me-cung-dong-ho', 'p1');
  assert.deepEqual([mc.stars, mc.done, mc.best, mc.played], [3, 1, 0, true]);
  assert.equal(({}).pwn, undefined, 'no prototype pollution');
  const xt = H.summarize('xe-tang-thoi-gian', 'p1');
  assert.deepEqual([xt.stars, xt.played], [0, false]);
  assert.equal(H.summarize('nope', 'p1'), null);
});

test('hub: garbage storage never throws and reads as "chưa chơi"', () => {
  for (const raw of ['{oops', '[1,2]', '"str"', 'null', '{"players":[]}', '{"players":{"p1":[]}}', '{"players":{"p1":{"progress":"x"}}}']) {
    const st = makeStorage();
    st.setItem('xe-tang-thoi-gian-v1', raw);
    const s = load(st).__Hub.summarize('xe-tang-thoi-gian', 'p1');
    assert.deepEqual([s.stars, s.played], [0, false], raw);
  }
});

test('hub: summarizeAll / aggregate totals and read-only storage', () => {
  const st = seed();
  const before = Array.from(st._map.entries());
  const w = load(st);
  const H = w.__Hub;
  const all = H.summarizeAll('p1');
  assert.equal(all.length, 6);
  assert.deepEqual(arr(all).map((s) => s.max), [48, 45, 24, 24, 27, 27]);
  const agg = H.aggregate(all);
  assert.equal(agg.max, 195);
  assert.equal(agg.stars, 4 + 4 + 3 + 5 + 0 + 9);
  assert.equal(agg.seconds, 600);
  assert.doesNotThrow(() => H.render());
  // Không ghi vào bất kỳ khóa game nào (chỉ Players mới được ghi khóa của nó, và chỉ khi có thay đổi)
  assert.deepEqual(Array.from(st._map.entries()), before, 'storage unchanged after load + render');
  // Đổi người chơi → chỉ khóa hồ sơ thay đổi
  w.Players.add('Tí', '🦉');
  const after = Array.from(st._map.entries()).filter(([k]) => k !== '3hoa-players-v1');
  assert.deepEqual(after, before);
  assert.equal(H.summarize('cuoi-ho').played, false, 'active player is now the new one');
});

test('hub: GAMES table is frozen and consistent', () => {
  const H = load(makeStorage()).__Hub;
  assert.ok(Object.isFrozen(H.GAMES));
  assert.deepEqual(arr(H.GAMES).map((g) => g.key), ['ninja-toan-v1', 'cuu-chuong-v1', 'me-cung-dong-ho-v1', 'thap-dong-ho-v1', 'xe-tang-thoi-gian-v1', 'cuoi-ho-v1']);
  for (const g of H.GAMES) { assert.ok(g.units.length >= 8, g.id); assert.ok(Object.isFrozen(g)); }
});
