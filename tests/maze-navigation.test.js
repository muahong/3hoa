'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./lib/load');
const M = loadGame('me-cung-dong-ho', ['js/mazes.js']).Mazes;
const plain = v => JSON.parse(JSON.stringify(v));

test('random mazes: 900 seeds, all cells reachable, no dead ends, safe spawn, distinct layouts', () => {
  for (const id of M.ids) {
    const layouts = new Set();
    for (let seed = 0; seed < 300; seed++) {
      const m = M.build(id, false, seed), dist = M.distances(m, m.player.r, m.player.c);
      layouts.add(JSON.stringify(m.wall));
      for (let r = 0; r < m.rows; r++) for (let c = 0; c < m.cols; c++) {
        if (m.wall[r][c]) continue;
        assert.ok(dist[r][c] >= 0, `${id}/${seed}: unreachable ${r},${c}`);
        assert.ok(M.openDirs(m, r, c).length >= 2, `${id}/${seed}: dead end ${r},${c}`);
      }
      assert.ok(m.spots.length >= 12);
      assert.ok(m.ghosts.every(g => dist[g.r][g.c] >= 8), 'ghosts start far from owl');
      assert.ok(m.powers.some(p => dist[p.r][p.c] <= 4), 'rescue star near owl');
      const rotated = M.build(id, true, seed);
      for (let r = 0; r < m.rows; r++) for (let c = 0; c < m.cols; c++) {
        assert.equal(m.wall[r][c], rotated.wall[c][r], 'rotation must not regenerate layout');
        assert.equal(m.dot[r][c], rotated.dot[c][r]);
      }
      assert.deepEqual(plain(M.build(id, false, seed)), plain(m), 'same seed is reproducible');
    }
    assert.ok(layouts.size > 290, 'variety across seeds');
  }
});

test('tap paths are shortest, legal, stop at goal and avoid intervening clocks', () => {
  for (const id of M.ids) for (let seed = 0; seed < 30; seed++) {
    const m = M.build(id, false, seed), dist = M.distances(m, m.player.r, m.player.c);
    for (const goal of m.spots) {
      const route = M.path(m, m.player, goal);
      assert.equal(route.length, dist[goal.r][goal.c]);
      assert.deepEqual(plain(route[route.length - 1]), plain(goal));
      let p = m.player;
      route.forEach(n => { assert.equal(Math.abs(p.r - n.r) + Math.abs(p.c - n.c), 1); assert.equal(m.wall[n.r][n.c], false); p = n; });
      if (route.length > 2) {
        const avoid = route[1], alternate = M.path(m, m.player, goal, [avoid]);
        if (alternate) assert.ok(!alternate.some(p => p.r === avoid.r && p.c === avoid.c));
      }
    }
    assert.deepEqual(plain(M.path(m, m.player, m.player)), []);
    assert.equal(M.path(m, m.player, { r: 0, c: 0 }), null);
  }
});

test('owl follows tap path and stops; manual turn cancels route and reverses immediately', () => {
  const w = loadGame('me-cung-dong-ho', ['js/audio.js', 'js/clock.js', 'js/mazes.js', 'js/profile.js', 'js/game.js']);
  const X = w.__MeCung, G = X.G;
  G.maze = w.Mazes.build('A', false, 10); G.state = 'playing'; G.items = [];
  const start = G.maze.player;
  G.player = { from: {...start}, to: {...start}, t: 1, dir: null, want: null, moving: false, speed: 4 };
  const goal = G.maze.spots[0];
  assert.equal(X.goToCell(goal.r, goal.c), true);
  for (let i = 0; i < 1000 && G.routeGoal; i++) X.stepEntity(G.player, 0.05, X.playerDecide);
  assert.equal(G.routeGoal, null);
  assert.deepEqual(plain(G.player.from), plain(goal));
  assert.equal(G.player.moving, false);
  assert.equal(X.goToCell(start.r, start.c), true);
  X.stepEntity(G.player, 0.05, X.playerDecide);
  const p = G.player, beforeX = p.x, beforeY = p.y;
  X.setWant({dx: -p.dir.dx, dy: -p.dir.dy});
  assert.equal(G.routeGoal, null); assert.equal(G.route.length, 0);
  assert.ok(Math.abs(p.x - beforeX) < 1e-8 && Math.abs(p.y - beforeY) < 1e-8, 'reversal is continuous');
});

test('clock placement leaves a safe route to every answer without crossing another clock', () => {
  const w = loadGame('me-cung-dong-ho', ['js/audio.js', 'js/clock.js', 'js/mazes.js', 'js/profile.js', 'js/game.js']);
  const X = w.__MeCung, G = X.G;
  for (const level of w.Clock.LEVELS) for (let seed = 0; seed < 100; seed++) {
    G.maze = w.Mazes.build(level.maze, seed % 2 === 0, seed);
    G.player = { from: G.maze.player }; G.anim = 0;
    const round = w.Clock.makeRound(level);
    X.placeClocks(round);
    assert.equal(G.items.length, level.clocks);
    assert.equal(new Set(G.items.map(p => p.r + ',' + p.c)).size, level.clocks);
    for (const target of G.items) assert.ok(w.Mazes.path(G.maze, G.player.from, target, G.items), level.id + '/' + seed);
  }
});
