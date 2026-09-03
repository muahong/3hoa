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
