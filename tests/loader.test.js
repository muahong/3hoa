'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./lib/load.js');

test('loader: every content module loads and exposes its global', () => {
  assert.ok(loadGame('cuoi-ho', ['js/lessons.js']).Lessons.LEVELS.length >= 9);
  assert.ok(loadGame('me-cung-dong-ho', ['js/clock.js', 'js/mazes.js']).Clock);
  assert.ok(loadGame('me-cung-dong-ho', ['js/clock.js', 'js/mazes.js']).Mazes);
  assert.ok(loadGame('thap-dong-ho', ['js/clock.js']).Clock);
  assert.ok(loadGame('xe-tang-thoi-gian', ['js/clock.js', 'js/levels.js']).Levels);
  assert.ok(loadGame('math-ninja', ['js/math.js', 'js/fruits.js']).MathGen);
  assert.ok(loadGame('math-ninja', ['js/math.js', 'js/fruits.js']).Sprites);
  assert.ok(loadGame('cuu-chuong', ['js/tables.js']).Tables);
  assert.ok(loadGame('cuoi-ho', ['js/audio.js']).Sfx);
});

test('loader: cuoi-ho generators produce exactly one correct option', () => {
  const L = loadGame('cuoi-ho', ['js/lessons.js']).Lessons;
  for (const lv of L.LEVELS) {
    for (let i = 0; i < 300; i++) {
      const q = L.fresh(lv.gen);
      assert.ok(q.options.length >= 3, lv.id + ' options');
      assert.ok(q.answer >= 0 && q.answer < q.options.length, lv.id + ' answer index');
      const keys = q.options.map(L.optKey);
      assert.equal(new Set(keys).size, keys.length, lv.id + ' duplicate options: ' + keys.join(' | '));
      assert.ok(q.answerText && q.explain, lv.id + ' text/explain');
    }
  }
});
