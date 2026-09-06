'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { loadGame } = require('./lib/load');
const M = loadGame('me-cung-dong-ho', ['js/mazes.js']).Mazes;
const key = m => m.wall.map(r => r.map(v => +v).join('')).join('/');
test('maze refresh: 600 seeds connected, diverse, escapable spawn, fair answer paths and transpose', () => {
  const hashes = new Set();
  for (let seed = 1; seed <= 600; seed++) {
    for (const compact of [true, false]) {
      const id = M.ids[seed % 3], m = M.build(id, false, seed, compact);
      hashes.add(key(m));
      const distances = M.distances(m, m.player.r, m.player.c);
      let vertices = 0, edges = 0;
      for (let r = 0; r < m.rows; r++) for (let c = 0; c < m.cols; c++) if (!m.wall[r][c]) { assert.ok(distances[r][c] >= 0, `isolated seed ${seed} at ${r},${c}`); vertices++; edges += M.openDirs(m, r, c).length; }
      assert.ok(edges / 2 >= vertices, `cycle seed ${seed}`);
      assert.ok(M.openDirs(m, m.player.r, m.player.c).length >= 2, `spawn exits ${seed}`);
      for (const g of m.ghosts) assert.ok(distances[g.r][g.c] >= 8, `ghost spawn ${seed}`);
      let s = seed; const rnd = () => ((s = (Math.imul(s,1664525)+1013904223)>>>0)/4294967296);
      // Starting at any of the last round's answers should support the next round.
      let start = m.player;
      for (let round = 0; round < 6; round++) {
        const spots = M.fairSpots(m, start, 6, rnd); assert.ok(spots, `placement seed ${seed} round ${round}`);
        assert.equal(spots.length,6);
        for (const target of spots) {
          const p = M.path(m, start, target, spots); assert.ok(p, `path seed ${seed}`);
          for (let i = 1; i < p.length; i++) assert.equal(Math.abs(p[i].r-p[i-1].r)+Math.abs(p[i].c-p[i-1].c),1);
          assert.ok(p.slice(1,-1).every(t => !spots.some(a => a.r===t.r && a.c===t.c)));
        }
        start = spots[round];
      }
      const rotated = M.build(id,true,seed,compact);
      for (let r=0;r<m.rows;r++) for(let c=0;c<m.cols;c++) assert.equal(m.wall[r][c],rotated.wall[c][r]);
      assert.equal(key(M.build(id,false,seed,compact)),key(m));
    }
  }
  assert.ok(hashes.size >= 1150, `unique structures ${hashes.size}/1200`);
});
test('maze refresh: BFS respects blocked answers and walls, including RAW tunnels', () => {
  for(const id of M.ids) {
    const m=M.build(id,false), a=m.player;
    assert.equal(M.path(m,a,{r:0,c:0},[]),null);
    const spots=M.fairSpots(m,a,6,()=>0.45); assert.ok(spots);
    for(const b of spots) assert.ok(M.path(m,a,b,spots));
  }
});
