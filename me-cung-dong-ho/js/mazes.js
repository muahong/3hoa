/* ============================================================
   mazes.js – Các mê cung của Mê Cung Đồng Hồ
   Ký hiệu:  #  tường          .  hạt sáng (ăn được điểm)
             C  chỗ có thể đặt đồng hồ (cũng có hạt sáng)
             o  ngôi sao sức mạnh     P  chỗ Cú Tí xuất phát
             G  nhà của ma            ' ' lối đi trống (không hạt)
   Hàng có ô ngoài cùng mở (không phải #) là đường hầm nối hai bên.
   Khi màn hình dọc, mê cung được xoay (chuyển vị) để vừa màn hình.
   ============================================================ */
(function () {
  'use strict';

  const RAW = {
    A: {
      name: 'Làng Hoa',
      rows: [
        '###############',
        '#C....#.#....C#',
        '#.##.##.##.##.#',
        '#.#...#.#...#.#',
        '#.#.#.....#.#.#',
        '#o..#.GGG.#..o#',
        '#.#.#.....#.#.#',
        '#.#...#.#...#.#',
        '#.##.##.##.##.#',
        '#C....#P#....C#',
        '###############'
      ],
      // Các chỗ đặt đồng hồ bổ sung (hàng, cột) ngoài các ô C
      extra: [[3, 4], [3, 10], [7, 4], [7, 10], [1, 7], [5, 2], [5, 12]]
    },
    B: {
      name: 'Phố Đêm',
      rows: [
        '#################',
        '#C.....#.#.....C#',
        '#.###.#...#.###.#',
        '#o#...#.#.#...#o#',
        '#...#.......#...#',
        '....#.#GGG#.#....',
        '#.#.#.......#.#.#',
        '#.#...##.##...#.#',
        '#.###.#...#.###.#',
        '#C.....#P#.....C#',
        '#################'
      ],
      extra: [[1, 8], [3, 4], [3, 12], [5, 2], [5, 14], [7, 4], [7, 12], [8, 7], [8, 9]]
    },
    C: {
      name: 'Thành Phố Sao',
      rows: [
        '###################',
        '#C.......#.......C#',
        '#.###.##.#.##.###.#',
        '#...#...C.C...#...#',
        '###.#.#.###.#.#.###',
        '#C..#.#.....#.#..C#',
        '....#...GGG...#....',
        '#.#.###.###.###.#.#',
        '#o#.......C.....#o#',
        '#.###.###.###.###.#',
        '#.....#..P..#.....#',
        '#C.##.#.###.#.##.C#',
        '###################'
      ],
      extra: [[1, 5], [1, 13], [10, 2], [10, 16], [7, 1], [7, 17]]
    }
  };

  const DIRS = [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }];

  /** Dựng mê cung từ ASCII; transpose = true để xoay cho màn hình dọc. */
  function build(id, transpose, seed) {
    const src = seed == null ? (RAW[id] || RAW.A) : generate(id, seed);
    let rows = src.rows.map(function (r) { return r.split(''); });
    let extra = src.extra.slice();
    if (transpose) {
      const R = rows.length, Cn = rows[0].length;
      const t = [];
      for (let c = 0; c < Cn; c++) { t.push([]); for (let r = 0; r < R; r++) t[c].push(rows[r][c]); }
      rows = t;
      extra = extra.map(function (p) { return [p[1], p[0]]; });
    }
    const R = rows.length, Cn = rows[0].length;
    const wall = [], dot = [];
    const spots = [], powers = [], ghosts = [];
    let player = { r: 1, c: 1 };
    for (let r = 0; r < R; r++) {
      wall.push([]); dot.push([]);
      for (let c = 0; c < Cn; c++) {
        const ch = rows[r][c];
        wall[r].push(ch === '#');
        dot[r].push(ch === '.' || ch === 'C');
        if (ch === 'C') spots.push({ r: r, c: c });
        if (ch === 'o') powers.push({ r: r, c: c });
        if (ch === 'G') ghosts.push({ r: r, c: c });
        if (ch === 'P') player = { r: r, c: c };
      }
    }
    extra.forEach(function (p) {
      const r = p[0], c = p[1];
      if (rows[r] && rows[r][c] && rows[r][c] !== '#' && !spots.some(function (s) { return s.r === r && s.c === c; })) spots.push({ r: r, c: c });
    });
    const m = { id: id, name: src.name, rows: R, cols: Cn, wall: wall, dot: dot, spots: spots, powers: powers, ghosts: ghosts, player: player, transposed: !!transpose };
    m.dotCount = 0;
    for (let r = 0; r < R; r++) for (let c = 0; c < Cn; c++) if (dot[r][c]) m.dotCount++;
    return m;
  }

  /** Chuẩn hóa toạ độ ô (xử lý đường hầm). Trả về {r,c} hoặc null nếu không đi được. */
  function norm(m, r, c) {
    if (r < 0) r = m.rows - 1; else if (r >= m.rows) r = 0;
    if (c < 0) c = m.cols - 1; else if (c >= m.cols) c = 0;
    if (m.wall[r][c]) return null;
    return { r: r, c: c };
  }

  function isOpen(m, r, c) { return !!norm(m, r, c); }

  /** Các hướng đi được từ ô (r,c). */
  function openDirs(m, r, c) {
    return DIRS.filter(function (d) { return isOpen(m, r + d.dy, c + d.dx); });
  }

  /** Khoảng cách đi bộ (BFS) từ một ô tới mọi ô; trả về mảng 2D (−1 = không tới được). */
  function distances(m, r0, c0) {
    const dist = [];
    for (let r = 0; r < m.rows; r++) { dist.push([]); for (let c = 0; c < m.cols; c++) dist[r].push(-1); }
    const q = [{ r: r0, c: c0 }];
    dist[r0][c0] = 0;
    while (q.length) {
      const cur = q.shift();
      for (let i = 0; i < DIRS.length; i++) {
        const n = norm(m, cur.r + DIRS[i].dy, cur.c + DIRS[i].dx);
        if (n && dist[n.r][n.c] < 0) { dist[n.r][n.c] = dist[cur.r][cur.c] + 1; q.push(n); }
      }
    }
    return dist;
  }

  // Seeded braided maze: spanning tree first, then open every dead end.
  // All rooms remain connected, with two exits even at the spawn point.
  function generate(id, seed) {
    const base = RAW[id] || RAW.A, R = base.rows.length, Cn = base.rows[0].length;
    let s = seed >>> 0;
    const rand = function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
    const rows = Array.from({ length: R }, function () { return Array(Cn).fill('#'); });
    const inside = function (r, c) { return r > 0 && c > 0 && r < R - 1 && c < Cn - 1; };
    const stack = [{ r: 1, c: 1 }]; rows[1][1] = '.';
    while (stack.length) {
      const p = stack[stack.length - 1];
      const dirs = DIRS.filter(function (d) { const r = p.r + d.dy * 2, c = p.c + d.dx * 2; return inside(r, c) && rows[r][c] === '#'; });
      if (!dirs.length) { stack.pop(); continue; }
      const d = dirs[Math.floor(rand() * dirs.length)];
      rows[p.r + d.dy][p.c + d.dx] = '.';
      const n = { r: p.r + d.dy * 2, c: p.c + d.dx * 2 };
      rows[n.r][n.c] = '.'; stack.push(n);
    }
    for (let r = 1; r < R - 1; r += 2) for (let c = 1; c < Cn - 1; c += 2) {
      const exits = DIRS.filter(function (d) { return rows[r + d.dy][c + d.dx] !== '#'; });
      if (exits.length < 2 || rand() < 0.24) {
        const closed = DIRS.filter(function (d) { return inside(r + d.dy * 2, c + d.dx * 2) && rows[r + d.dy][c + d.dx] === '#'; });
        if (closed.length) { const d = closed[Math.floor(rand() * closed.length)]; rows[r + d.dy][c + d.dx] = '.'; }
      }
    }
    const pc = 1 + 2 * Math.floor((Cn - 3) / 4), pr = R - 2;
    rows[pr][pc] = 'P';
    const temp = { rows: R, cols: Cn, wall: rows.map(function (row) { return row.map(function (ch) { return ch === '#'; }); }) };
    const dist = distances(temp, pr, pc), rooms = [];
    for (let r = 1; r < R - 1; r += 2) for (let c = 1; c < Cn - 1; c += 2) if (r !== pr || c !== pc) rooms.push({ r: r, c: c, d: dist[r][c] });
    rooms.sort(function (a, b) { return b.d - a.d; });
    rooms.slice(0, 3).forEach(function (p) { rows[p.r][p.c] = 'G'; });
    const available = rooms.slice(3);
    // One rescue star close to the owl, two distributed across the map.
    const near = available.reduce(function (a, b) { return a.d < b.d ? a : b; });
    [near, available[0], available[Math.floor(available.length / 2)]].forEach(function (p) { rows[p.r][p.c] = 'o'; });
    available.forEach(function (p) { if (rows[p.r][p.c] === '.') rows[p.r][p.c] = 'C'; });
    return { name: base.name, rows: rows.map(function (row) { return row.join(''); }), extra: [] };
  }

  /** Shortest legal path, excluding the start. Optional cells to avoid (other clocks). */
  function path(m, start, goal, blocked) {
    if (!goal || !isOpen(m, goal.r, goal.c)) return null;
    const key = function (p) { return p.r + ',' + p.c; };
    const avoid = new Set((blocked || []).map(key));
    const seen = new Map([[key(start), null]]), q = [start];
    for (let i = 0; i < q.length; i++) {
      const cur = q[i];
      if (cur.r === goal.r && cur.c === goal.c) {
        const result = []; let p = cur;
        while (seen.get(key(p))) { result.unshift(p); p = seen.get(key(p)); }
        return result;
      }
      DIRS.forEach(function (d) {
        const n = norm(m, cur.r + d.dy, cur.c + d.dx);
        if (n && !seen.has(key(n)) && (!avoid.has(key(n)) || key(n) === key(goal))) { seen.set(key(n), cur); q.push(n); }
      });
    }
    return null;
  }

  window.Mazes = { RAW: RAW, DIRS: DIRS, build: build, norm: norm, isOpen: isOpen, openDirs: openDirs, distances: distances, path: path, ids: Object.keys(RAW) };
})();
