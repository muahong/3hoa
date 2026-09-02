/* ============================================================
   math.js – Sinh phép tính cộng/trừ theo chương trình lớp 1–3
   và các "đáp án nhiễu" giống lỗi sai thường gặp của trẻ.
   ============================================================ */
(function () {
  'use strict';

  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const chance = (p) => Math.random() < p;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  };
  const MINUS = '−';

  function mk(a, b, op, max) {
    return {
      a, b, op, max,
      answer: op === '+' ? a + b : a - b,
      text: a + ' ' + (op === '+' ? '+' : MINUS) + ' ' + b
    };
  }

  /* ---------- Lớp 1: cộng trừ trong phạm vi 10 ---------- */
  function gen10() {
    if (chance(0.5)) {
      let a = rnd(1, 9), b = rnd(1, 10 - a);
      if (chance(0.08)) { if (chance(0.5)) a = 0; else b = 0; }
      return mk(a, b, '+', 12);
    }
    let a = rnd(2, 10), b = rnd(1, a - 1);
    if (chance(0.08)) b = chance(0.5) ? a : 0;
    return mk(a, b, '-', 12);
  }

  /* ---------- Lớp 1: phạm vi 20, không nhớ ---------- */
  function gen20() {
    if (chance(0.5)) {
      const t = Math.random();
      if (t < 0.3) {                       // 10 + b hoặc a + 10
        const b = rnd(1, 9);
        return chance(0.5) ? mk(10, b, '+', 24) : mk(b, 10, '+', 24);
      }
      if (t < 0.75) {                      // 12 + 5 (không nhớ)
        const a = rnd(11, 18);
        const b = rnd(1, 9 - (a % 10));
        return chance(0.7) ? mk(a, b, '+', 24) : mk(b, a, '+', 24);
      }
      const a = rnd(1, 9), b = rnd(1, 10 - a);   // ôn tập phạm vi 10
      return mk(a, b, '+', 24);
    }
    const t = Math.random();
    if (t < 0.5) {                          // 17 - 4 (không mượn)
      const a = rnd(11, 19);
      return mk(a, rnd(1, a % 10), '-', 24);
    }
    if (t < 0.75) {                         // 17 - 10, 17 - 7
      const a = rnd(11, 19);
      return chance(0.5) ? mk(a, 10, '-', 24) : mk(a, a % 10, '-', 24);
    }
    const a = rnd(12, 20);                  // 18 - 13
    const b = rnd(11, a);
    if (a % 10 < b % 10) return mk(a, a % 10, '-', 24);
    return mk(a, b, '-', 24);
  }

  /* ---------- Lớp 2: cộng trừ có nhớ trong phạm vi 20 ---------- */
  function genCarry20() {
    if (chance(0.5)) {
      let a = rnd(2, 9), b = rnd(2, 9);
      if (a + b < 11) { b = 11 - a + rnd(0, Math.min(9 - (11 - a), 3)); }
      if (b > 9) b = 9;
      return mk(a, b, '+', 24);
    }
    const a = rnd(11, 18);
    const b = rnd(Math.max(2, a - 9), 9);
    return mk(a, b, '-', 24);
  }

  /* ---------- Lớp 2: phạm vi 100 ---------- */
  function gen100() {
    const t = Math.random();
    if (t < 0.3) {                          // 2 chữ số ± 1 chữ số
      if (chance(0.5)) { const a = rnd(11, 91), b = rnd(2, 9); return mk(a, b, '+', 120); }
      const a = rnd(12, 99), b = rnd(2, 9); return mk(a, b, '-', 120);
    }
    if (t < 0.7) {                          // 2 chữ số ± 2 chữ số
      if (chance(0.5)) { const a = rnd(10, 89), b = rnd(10, 99 - a); return mk(a, b, '+', 120); }
      const a = rnd(20, 99), b = rnd(10, a - 1); return mk(a, b, '-', 120);
    }
    if (t < 0.85) {                         // số tròn chục
      if (chance(0.5)) { const a = 10 * rnd(1, 8), b = 10 * rnd(1, 9 - a / 10); return mk(a, b, '+', 120); }
      const a = 10 * rnd(2, 10), b = 10 * rnd(1, a / 10 - 1); return mk(a, b, '-', 120);
    }
    if (chance(0.5)) { const a = rnd(1, 99); return mk(a, 100 - a, '+', 120); }   // cộng cho tròn 100
    return mk(100, rnd(1, 99), '-', 120);
  }

  /* ---------- Lớp 3: phạm vi 1000 ---------- */
  function gen1000() {
    const t = Math.random();
    if (t < 0.45) {                         // 3 chữ số ± 3 chữ số
      if (chance(0.5)) { const a = rnd(100, 899), b = rnd(100, 999 - a); return mk(a, b, '+', 1200); }
      const a = rnd(200, 999), b = rnd(100, a - 1); return mk(a, b, '-', 1200);
    }
    if (t < 0.7) {                          // 3 chữ số ± 2 chữ số
      if (chance(0.5)) { const a = rnd(100, 900), b = rnd(10, 99); return mk(a, b, '+', 1200); }
      const a = rnd(110, 999), b = rnd(10, 99); return mk(a, b, '-', 1200);
    }
    if (t < 0.85) {                         // số tròn trăm / tròn chục
      if (chance(0.5)) {
        if (chance(0.5)) { const a = 100 * rnd(1, 8), b = 100 * rnd(1, 9 - a / 100); return mk(a, b, '+', 1200); }
        const a = 10 * rnd(10, 89), b = 10 * rnd(1, 99 - a / 10); return mk(a, b, '+', 1200);
      }
      if (chance(0.5)) { const a = 100 * rnd(2, 10), b = 100 * rnd(1, a / 100 - 1); return mk(a, b, '-', 1200); }
      const a = 10 * rnd(20, 100), b = 10 * rnd(1, a / 10 - 1); return mk(a, b, '-', 1200);
    }
    if (chance(0.5)) { const a = rnd(100, 900); return mk(a, 1000 - a, '+', 1200); }
    return mk(1000, rnd(100, 900), '-', 1200);
  }

  /* ---------- Trộn tất cả ---------- */
  function genMix() {
    const t = Math.random();
    if (t < 0.2) return gen20();
    if (t < 0.45) return genCarry20();
    if (t < 0.8) return gen100();
    return gen1000();
  }

  /* ---------- Đáp án nhiễu (giống lỗi sai thường gặp) ---------- */
  function distractors(q, k) {
    const ans = q.answer, max = q.max;
    const cands = [];
    const add = (v, w) => {
      if (Number.isInteger(v) && v !== ans && v >= 0 && v <= max) cands.push({ v, w });
    };
    add(ans + 1, 3); add(ans - 1, 3);
    add(ans + 2, 2); add(ans - 2, 2);
    if (max >= 20) { add(ans + 10, 2); add(ans - 10, 2); }
    if (max >= 200) { add(ans + 100, 2); add(ans - 100, 2); }
    // Làm nhầm phép tính (cộng thay vì trừ và ngược lại)
    add(q.op === '+' ? Math.abs(q.a - q.b) : q.a + q.b, 3);
    // Quên nhớ / quên mượn
    if (q.op === '+' && (q.a % 10) + (q.b % 10) >= 10) add(ans - 10, 3);
    if (q.op === '-' && (q.a % 10) < (q.b % 10)) add(ans + 10, 3);
    // Đảo chữ số
    if (ans >= 10) {
      const rev = Number(String(ans).split('').reverse().join(''));
      if (rev !== ans) add(rev, 2);
    }
    // Chính các số hạng
    add(q.a, 1); add(q.b, 1);
    add(ans + 3, 1); add(ans - 3, 1); add(ans + 5, 1); add(ans - 5, 1);

    const chosen = new Set();
    const out = [];
    let pool = cands.slice();
    while (out.length < k && pool.length) {
      const total = pool.reduce((s, c) => s + c.w, 0);
      let r = Math.random() * total, idx = 0;
      for (let i = 0; i < pool.length; i++) { r -= pool[i].w; if (r <= 0) { idx = i; break; } }
      const v = pool[idx].v;
      chosen.add(v); out.push(v);
      pool = pool.filter((c) => c.v !== v);
    }
    let guard = 0;
    while (out.length < k && guard++ < 200) {
      const v = ans + rnd(-15, 15);
      if (v !== ans && v >= 0 && !chosen.has(v)) { chosen.add(v); out.push(v); }
    }
    return out;
  }

  /* ---------- Các màn chơi: Chém đáp án ---------- */
  const ANSWER_LEVELS = [
    { id: 'a1', title: 'Cộng trừ đến 10', desc: 'Ví dụ: 3 + 4, 9 − 5', icon: '🍎', grade: 1, speed: 0.82, fruits: 3, bomb: 0.0, big: false, gen: gen10 },
    { id: 'a2', title: 'Phạm vi 20', desc: 'Ví dụ: 12 + 5, 17 − 4', icon: '🍊', grade: 1, speed: 0.88, fruits: 3, bomb: 0.05, big: false, gen: gen20 },
    { id: 'a3', title: 'Cộng trừ có nhớ', desc: 'Ví dụ: 8 + 7, 15 − 9', icon: '🍋', grade: 2, speed: 0.92, fruits: 4, bomb: 0.08, big: false, gen: genCarry20 },
    { id: 'a4', title: 'Phạm vi 100', desc: 'Ví dụ: 36 + 27, 62 − 38', icon: '🍉', grade: 2, speed: 0.95, fruits: 4, bomb: 0.1, big: false, gen: gen100 },
    { id: 'a5', title: 'Phạm vi 1000', desc: 'Ví dụ: 456 + 287, 703 − 458', icon: '🥝', grade: 3, speed: 0.95, fruits: 4, bomb: 0.1, big: true, gen: gen1000 },
    { id: 'a6', title: 'Siêu Ninja', desc: 'Trộn tất cả, bay nhanh hơn!', icon: '🥷', grade: 0, speed: 1.12, fruits: 5, bomb: 0.16, big: true, gen: genMix }
  ];

  /* ---------- Các màn chơi: Ghép đôi ---------- */
  const PAIR_LEVELS = [
    {
      id: 'p1', title: 'Bạn của 10', desc: 'Chém 2 quả cộng lại bằng 10', icon: '🔟', grade: 1, speed: 0.85, fruits: 4, bomb: 0.0, op: '+',
      gen() { const x = rnd(1, 9); return { target: 10, op: '+', pair: [x, 10 - x], lo: 1, hi: 9 }; }
    },
    {
      id: 'p2', title: 'Cộng trong 20', desc: '2 quả cộng lại bằng số cho trước', icon: '➕', grade: 1, speed: 0.9, fruits: 4, bomb: 0.05, op: '+',
      gen() { const t = rnd(5, 20); const x = rnd(1, t - 1); return { target: t, op: '+', pair: [x, t - x], lo: 1, hi: 19 }; }
    },
    {
      id: 'p3', title: 'Trừ trong 20', desc: 'Quả lớn trừ quả bé bằng số cho trước', icon: '➖', grade: 2, speed: 0.9, fruits: 4, bomb: 0.06, op: '-',
      gen() { const t = rnd(1, 9); const x = rnd(t + 1, 20); return { target: t, op: '-', pair: [x, x - t], lo: 1, hi: 20 }; }
    },
    {
      id: 'p4', title: 'Bạn của 100', desc: 'Chém 2 quả cộng lại bằng 100', icon: '💯', grade: 2, speed: 0.95, fruits: 4, bomb: 0.08, op: '+',
      gen() { const x = chance(0.5) ? 10 * rnd(1, 9) : 5 * rnd(1, 19); return { target: 100, op: '+', pair: [x, 100 - x], lo: 5, hi: 95, step: 5 }; }
    },
    {
      id: 'p5', title: 'Cộng trong 100', desc: '2 quả cộng lại bằng số cho trước', icon: '🧮', grade: 3, speed: 1.0, fruits: 5, bomb: 0.1, op: '+',
      gen() { const t = rnd(30, 99); const x = rnd(1, t - 1); return { target: t, op: '+', pair: [x, t - x], lo: 1, hi: 98 }; }
    }
  ];

  function isPair(q, u, v) {
    return q.op === '+' ? u + v === q.target : Math.abs(u - v) === q.target;
  }

  /** Sinh giá trị các quả cho 1 đợt ở chế độ Ghép đôi (có đúng 1 cặp hợp lệ). */
  function pairWave(q, count) {
    const vals = [q.pair[0], q.pair[1]];
    let guard = 0;
    while (vals.length < count && guard++ < 300) {
      let v;
      if (chance(0.5)) {                              // số gần với cặp đúng để gây nhiễu
        const base = pick(q.pair);
        const d = pick([-3, -2, -1, 1, 2, 3]) * (q.step || 1);
        v = base + d;
      } else if (q.step) {
        v = q.lo + q.step * rnd(0, Math.floor((q.hi - q.lo) / q.step));
      } else {
        v = rnd(q.lo, q.hi);
      }
      if (v < q.lo || v > q.hi) continue;
      if (vals.some((u) => u === v)) continue;
      if (vals.some((u) => isPair(q, u, v))) continue;  // không tạo thêm cặp đúng
      vals.push(v);
    }
    while (vals.length < count) vals.push(rnd(q.lo, q.hi));
    return shuffle(vals);
  }

  /** Chuỗi hiển thị phép tính ghép đôi. held: giá trị quả đã chém (hoặc null). form: 'a' => held − ? ; 'b' => ? − held */
  function pairText(q, held, form) {
    const op = q.op === '+' ? '+' : MINUS;
    const Q = '<span class="q">?</span>';
    if (held == null) return Q + ' ' + op + ' ' + Q + ' = ' + q.target;
    const H = '<span class="held">' + held + '</span>';
    if (q.op === '+' || form !== 'b') return H + ' ' + op + ' ' + Q + ' = ' + q.target;
    return Q + ' ' + op + ' ' + H + ' = ' + q.target;
  }

  window.MathGen = {
    rnd, chance, pick, shuffle, MINUS,
    ANSWER_LEVELS, PAIR_LEVELS,
    distractors, isPair, pairWave, pairText,
    levelById(id) {
      return ANSWER_LEVELS.find((l) => l.id === id) || PAIR_LEVELS.find((l) => l.id === id) || null;
    }
  };
})();
