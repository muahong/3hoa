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
  function build(id, transpose, seed, compact) {
    const src = seed == null ? (RAW[id] || RAW.A) : generate(id, seed, compact);
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
    const m = { id: id, seed: seed, compact: !!compact, name: src.name, rows: R, cols: Cn, wall: wall, dot: dot, spots: spots, powers: powers, ghosts: ghosts, player: player, transposed: !!transpose };
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

  // Seeded DFS with braided junctions and an outer escape loop. RAW remains a
  // compatibility fixture; gameplay supplies a seed and rotates the same map.
  function generate(id, seed, compact) {
    let state = (seed >>> 0) || 1;
    const random = function () { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
    const base = RAW[id] || RAW.A;
    const R = compact ? 9 : base.rows.length, N = compact ? 13 : base.rows[0].length;
    const a = Array.from({ length: R }, function () { return Array(N).fill('#'); });
    const stack = [[1, 1]]; a[1][1] = '.';
    while (stack.length) {
      const p = stack[stack.length - 1];
      const ds = DIRS.filter(function (d) { const r = p[0] + d.dy * 2, c = p[1] + d.dx * 2; return r > 0 && r < R - 1 && c > 0 && c < N - 1 && a[r][c] === '#'; });
      if (!ds.length) { stack.pop(); continue; }
      const d = ds[Math.floor(random() * ds.length)];
      a[p[0] + d.dy][p[1] + d.dx] = '.';
      const p2 = [p[0] + d.dy * 2, p[1] + d.dx * 2]; a[p2[0]][p2[1]] = '.'; stack.push(p2);
    }
    for (let r = 1; r < R - 1; r += 2) for (let c = 1; c < N - 1; c += 2) {
      const open = DIRS.filter(function (d) { return a[r + d.dy][c + d.dx] !== '#'; });
      const closed = DIRS.filter(function (d) { const rr = r + d.dy * 2, cc = c + d.dx * 2; return rr > 0 && rr < R - 1 && cc > 0 && cc < N - 1 && a[r + d.dy][c + d.dx] === '#'; });
      if (closed.length && (open.length < 2 || random() < 0.3)) { const d = closed[Math.floor(random() * closed.length)]; a[r + d.dy][c + d.dx] = '.'; }
    }
    for (let r = 1; r < R - 1; r++) { a[r][1] = '.'; a[r][N - 2] = '.'; }
    for (let c = 1; c < N - 1; c++) { a[1][c] = '.'; a[R - 2][c] = '.'; }
    // Occasional wider rooms differ from narrow corridors, without removing exits.
    for (let r = 2; r < R - 2; r += 2) for (let c = 2; c < N - 2; c += 2) if (random() < 0.16 && DIRS.some(function (d) { return a[r + d.dy][c + d.dx] !== '#'; })) a[r][c] = '.';
    a[R - 2][1] = 'P'; a[1][N - 2] = 'G'; a[1][N - 3] = 'G'; a[2][N - 2] = 'G';
    a[1][1] = 'o'; a[R - 2][N - 2] = 'o';
    const extra = [];
    for (let r = 1; r < R - 1; r++) for (let c = 1; c < N - 1; c++) if (a[r][c] === '.') extra.push([r, c]);
    return { name: base.name, rows: a.map(function (r) { return r.join(''); }), extra: extra };
  }

  /** BFS excluding all other answer cells. No knowledge of answer correctness. */
  function path(m, start, target, blocked) {
    if (!norm(m, target.r, target.c)) return null;
    const key = function (p) { return p.r + ',' + p.c; };
    const avoid = new Set((blocked || []).filter(function (p) { return key(p) !== key(target) && key(p) !== key(start); }).map(key));
    const queue = [start], seen = new Map([[key(start), null]]);
    for (let i = 0; i < queue.length; i++) {
      const cur = queue[i];
      if (key(cur) === key(target)) {
        const result = []; let at = cur;
        while (at) { result.push({ r: at.r, c: at.c }); at = seen.get(key(at)); }
        return result.reverse();
      }
      DIRS.forEach(function (d) { const n = norm(m, cur.r + d.dy, cur.c + d.dx); if (n && !seen.has(key(n)) && !avoid.has(key(n))) { seen.set(key(n), cur); queue.push(n); } });
    }
    return null;
  }

  function fairSpots(m, start, count, random, attempt) {
    attempt = attempt || 0;
    random = random || Math.random;
    const dist = distances(m, start.r, start.c);
    const candidates = m.spots.filter(function (s) { return dist[s.r][s.c] >= 3; });
    for (let i = candidates.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); const t = candidates[i]; candidates[i] = candidates[j]; candidates[j] = t; }
    const chosen = [];
    for (const s of candidates) {
      if (chosen.some(function (p) { return Math.abs(p.r - s.r) + Math.abs(p.c - s.c) < 3; })) continue;
      const trial = chosen.concat([s]);
      if (!trial.every(function (t) { return !!path(m, start, t, trial); })) continue;
      chosen.push(s); if (chosen.length === count) return chosen;
    }
    // Relax spacing only, never answer accessibility.
    for (const s of candidates) {
      if (chosen.some(function (p) { return p.r === s.r && p.c === s.c; })) continue;
      const trial = chosen.concat([s]);
      if (trial.every(function (t) { return !!path(m, start, t, trial); })) chosen.push(s);
      if (chosen.length === count) return chosen;
    }
    return attempt < 30 ? fairSpots(m, start, count, random, attempt + 1) : null;
  }

  window.Mazes = { RAW: RAW, DIRS: DIRS, build: build, norm: norm, isOpen: isOpen, openDirs: openDirs, distances: distances, path: path, fairSpots: fairSpots, ids: Object.keys(RAW) };
})();
