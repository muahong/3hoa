/* ============================================================
   tables.js – Sinh phép nhân, phép chia theo bảng cửu chương
   (lớp 2: bảng 2, 5 · lớp 3: bảng 3, 4, 6, 7, 8, 9), tìm thừa số
   và nhân chia số lớn. Kèm danh sách các màn chơi.
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
  const TIMES = '×';
  const DIV = ':';
  const ALL_TABLES = [2, 3, 4, 5, 6, 7, 8, 9];

  /** Chọn số nhân 1..10, ưu tiên 2..9 (1 và 10 dễ hơn nên ít gặp hơn). */
  function pickMultiplier() {
    const r = Math.random();
    if (r < 0.06) return 1;
    if (r < 0.14) return 10;
    return rnd(2, 9);
  }

  /** Chuyển ký hiệu toán sang lời đọc: "7 × 8 = 56" -> "7 nhân 8 bằng 56". */
  function speakEq(s) {
    return String(s)
      .replace(/×/g, ' nhân ').replace(/:/g, ' chia ').replace(/=/g, ' bằng ')
      .replace(/\?/g, ' mấy ').replace(/\s+/g, ' ').trim();
  }

  /**
   * Tạo đối tượng câu hỏi.
   *  label : chữ hiện trên thiên thạch (ngắn)
   *  text  : phép tính đầy đủ có dấu ? (hiện ở thẻ trả lời, ? sẽ được thay bằng số đang gõ)
   *  answer: đáp án (số nguyên)
   *  full  : phép tính đã điền đáp án, ví dụ "7 × 8 = 56"
   */
  function mk(kind, label, text, answer, table) {
    const full = text.replace('?', String(answer));
    return {
      kind: kind, label: label, text: text, answer: answer, table: table || 0, full: full,
      speech: speakEq(text) + '?',
      speechFull: speakEq(full)
    };
  }

  /* ---------- Bảng nhân n ---------- */
  function mulQ(n, m, allowSwap) {
    if (m == null) m = pickMultiplier();
    // Sách giáo khoa trình bày "n × m"; với lớp 3 thỉnh thoảng đảo lại để bé quen tính giao hoán.
    // Lớp 2 (bảng 2, bảng 5) thì KHÔNG đảo: thẻ màn ghi "2 × 1 … 2 × 10" nên câu hỏi phải đúng như vậy.
    const swap = allowSwap !== false && chance(0.25);
    const a = swap ? m : n, b = swap ? n : m;
    return mk('mul', a + ' ' + TIMES + ' ' + b, a + ' ' + TIMES + ' ' + b + ' = ?', n * m, n);
  }

  /* ---------- Bảng chia n ---------- */
  function divQ(n, m) {
    if (m == null) m = pickMultiplier();
    return mk('div', (n * m) + ' ' + DIV + ' ' + n, (n * m) + ' ' + DIV + ' ' + n + ' = ?', m, n);
  }

  /* ---------- Tìm thừa số / số bị chia / số chia (lớp 3) ---------- */
  function findQ(n) {
    if (n == null) n = pick(ALL_TABLES);
    const m = rnd(2, 9), p = n * m;
    const t = Math.random();
    if (t < 0.3) return mk('find', '? ' + TIMES + ' ' + n + ' = ' + p, '? ' + TIMES + ' ' + n + ' = ' + p, m, n);
    if (t < 0.6) return mk('find', n + ' ' + TIMES + ' ? = ' + p, n + ' ' + TIMES + ' ? = ' + p, m, n);
    if (t < 0.8) return mk('find', '? ' + DIV + ' ' + n + ' = ' + m, '? ' + DIV + ' ' + n + ' = ' + m, p, n);
    return mk('find', p + ' ' + DIV + ' ? = ' + m, p + ' ' + DIV + ' ? = ' + m, n, n);
  }

  /* ---------- Nhân, chia số có 2–3 chữ số với số có 1 chữ số (lớp 3) ---------- */
  function bigQ() {
    const t = Math.random();
    if (t < 0.35) {                                   // 23 × 4, 47 × 3
      const b = rnd(2, 9), a = rnd(11, Math.min(49, Math.floor(999 / b)));
      return mk('big', a + ' ' + TIMES + ' ' + b, a + ' ' + TIMES + ' ' + b + ' = ?', a * b, 0);
    }
    if (t < 0.55) {                                   // 213 × 3, 125 × 4
      const b = rnd(2, 4), a = rnd(101, Math.floor(999 / b));
      return mk('big', a + ' ' + TIMES + ' ' + b, a + ' ' + TIMES + ' ' + b + ' = ?', a * b, 0);
    }
    if (t < 0.8) {                                    // 84 : 4, 96 : 3
      const d = rnd(2, 9), q = rnd(11, Math.floor(99 / d));
      return mk('big', (q * d) + ' ' + DIV + ' ' + d, (q * d) + ' ' + DIV + ' ' + d + ' = ?', q, 0);
    }
    const d = rnd(2, 9), q = rnd(Math.ceil(100 / d), Math.floor(999 / d));   // 156 : 3, 248 : 4
    return mk('big', (q * d) + ' ' + DIV + ' ' + d, (q * d) + ' ' + DIV + ' ' + d + ' = ?', q, 0);
  }

  /** Sinh câu hỏi bảng cửu chương từ danh sách bảng và phép (mul | div | mix).
      allowSwap = false: giữ nguyên thứ tự "n × m" (dùng cho bảng lớp 2). */
  function tableQ(tables, op, allowSwap) {
    const n = pick(tables);
    const useDiv = op === 'div' || (op === 'mix' && chance(0.45));
    return useDiv ? divQ(n) : mulQ(n, null, allowSwap);
  }

  /** Tránh lặp lại câu vừa hỏi: thử lại vài lần nếu trùng với 4 câu gần nhất. */
  const recent = [];
  function fresh(genFn) {
    let q = genFn();
    for (let i = 0; i < 6 && recent.indexOf(q.full) >= 0; i++) q = genFn();
    recent.push(q.full);
    if (recent.length > 4) recent.shift();
    return q;
  }

  /** Kiểm tra một phép tính đã điền đáp án, ví dụ "7 × 8 = 56" hoặc "42 : 6 = 7". */
  function checkEq(full) {
    const m = String(full).match(/^(\d{1,4}) ([×:]) (\d{1,4}) = (\d{1,4})$/);
    if (!m) return false;
    const a = Number(m[1]), b = Number(m[3]), r = Number(m[4]);
    if (m[2] === TIMES) return a * b === r;
    return b !== 0 && a === b * r;
  }

  /**
   * Dựng lại một câu hỏi từ dữ liệu đã lưu trong "cần ôn lại" (localStorage).
   * Trả về null nếu dữ liệu hỏng hoặc phép tính sai (không tin dữ liệu đọc từ máy).
   */
  function fromInfo(info) {
    if (!info || typeof info !== 'object') return null;
    const kind = info.kind;
    if (['mul', 'div', 'find', 'big'].indexOf(kind) < 0) return null;
    const label = String(info.label == null ? '' : info.label);
    const text = String(info.text == null ? '' : info.text);
    const answer = Number(info.answer);
    const table = Number(info.table);
    if (!label || label.length > 24 || !text || text.length > 24) return null;
    if (!Number.isFinite(answer) || answer < 0 || answer > 999 || Math.floor(answer) !== answer) return null;
    if (!Number.isFinite(table) || table < 0 || table > 9 || Math.floor(table) !== table) return null;
    if (text.indexOf('?') < 0) return null;
    const q = mk(kind, label, text, answer, table);
    if (!checkEq(q.full)) return null;
    return q;
  }

  /* ---------- Gợi ý cách nghĩ và lời giải thích ----------
     Quy ước để giọng đọc tiếng Việt phát âm đúng (js/audio.js đọc qua speakEq):
     · KHÔNG dùng dấu ":" làm dấu câu (chỉ dùng làm dấu chia giữa hai số)
     · KHÔNG dùng dấu "?" (sẽ bị đọc thành "mấy") */
  function eqParts(full) {
    const m = String(full).match(/^(\d{1,4}) ([×:]) (\d{1,4}) = (\d{1,4})$/);
    if (!m) return null;
    return { a: Number(m[1]), op: m[2], b: Number(m[3]), r: Number(m[4]) };
  }

  /** Với câu "tìm thừa số", số cần tìm nằm ở vế trái (a) khi câu bắt đầu bằng "?", ngược lại là b. */
  function findSlot(q) { return String(q.text).charAt(0) === '?' ? 'a' : 'b'; }

  /**
   * Gợi ý cách nghĩ – KHÔNG nói thẳng đáp án, chỉ mách con cách tính.
   * Dùng cho nút 💡 Gợi ý lần đầu và cho lần trả lời sai thứ nhất.
   */
  function hintFor(q) {
    const p = q && eqParts(q.full);
    if (!p) return '';
    if (q.kind === 'find') {
      const slot = findSlot(q);
      if (p.op === TIMES) {
        return 'Muốn tìm thừa số chưa biết, con lấy tích chia cho thừa số kia, tức là ' +
          p.r + ' ' + DIV + ' ' + (slot === 'a' ? p.b : p.a) + '.';
      }
      if (slot === 'a') return 'Muốn tìm số bị chia, con lấy thương nhân với số chia, tức là ' + p.r + ' ' + TIMES + ' ' + p.b + '.';
      return 'Muốn tìm số chia, con lấy số bị chia chia cho thương, tức là ' + p.a + ' ' + DIV + ' ' + p.r + '.';
    }
    if (q.kind === 'big') {
      if (p.op === TIMES) return 'Con đặt tính rồi tính, nhân ' + p.b + ' với từng chữ số của ' + p.a + ' từ phải sang trái.';
      return 'Con đặt tính rồi tính, chia lần lượt từng chữ số của ' + p.a + ' cho ' + p.b + ' từ trái sang phải.';
    }
    if (p.op === DIV) return 'Con nghĩ ngược lại, ' + p.b + ' nhân mấy thì bằng ' + p.a + '.';
    if (p.a === 1 || p.b === 1) return 'Nhân với 1 thì được chính số đó.';
    if (p.a === 10 || p.b === 10) return 'Nhân với 10 thì viết thêm chữ số 0 vào sau.';
    return 'Con đếm thêm một lần nữa. Lấy ' + p.a + ' ' + TIMES + ' ' + (p.b - 1) + ' rồi cộng thêm ' + p.a + '.';
  }

  /** Lời giải thích đầy đủ (có đáp án) – dùng khi hiện đáp án hoặc khi thiên thạch chạm khiên. */
  function explainFor(q) {
    const p = q && eqParts(q.full);
    if (!p) return '';
    if (q.kind === 'find') {
      const slot = findSlot(q);
      let how;
      if (p.op === TIMES) how = 'Lấy ' + p.r + ' ' + DIV + ' ' + (slot === 'a' ? p.b : p.a) + ' = ' + (slot === 'a' ? p.a : p.b);
      else if (slot === 'a') how = 'Lấy ' + p.r + ' ' + TIMES + ' ' + p.b + ' = ' + p.a;
      else how = 'Lấy ' + p.a + ' ' + DIV + ' ' + p.r + ' = ' + p.b;
      return how + '. Vậy ' + q.full + '.';
    }
    if (q.kind === 'big') return q.full + '. ' + hintFor(q);
    if (p.op === DIV) return q.full + ' vì ' + p.b + ' ' + TIMES + ' ' + p.r + ' = ' + p.a + '.';
    if (p.a === 1 || p.b === 1) return q.full + ' vì nhân với 1 thì giữ nguyên số đó.';
    if (p.a === 10 || p.b === 10) return q.full + ' vì nhân với 10 thì viết thêm chữ số 0 vào sau.';
    return q.full + ' vì ' + p.a + ' ' + TIMES + ' ' + (p.b - 1) + ' = ' + (p.a * (p.b - 1)) + ', cộng thêm ' + p.a + ' nữa.';
  }

  const TABLE_ICONS = { 2: '🐥', 3: '🐸', 4: '🦋', 5: '⭐', 6: '🐝', 7: '🌈', 8: '🐙', 9: '🦄' };

  /* ---------- Màn chơi: Luyện từng bảng (chọn nhân / chia / cả hai ở màn chọn) ---------- */
  const TABLE_LEVELS = ALL_TABLES.map(function (n) {
    return {
      id: 't' + n, table: n, title: 'Bảng ' + n,
      desc: n + ' ' + TIMES + ' 1 … ' + n + ' ' + TIMES + ' 10 và ' + (n * 10) + ' ' + DIV + ' ' + n,
      icon: TABLE_ICONS[n], grade: (n === 2 || n === 5) ? 2 : 3,
      speed: (n === 2 || n === 5) ? 0.85 : 0.95, maxDigits: 2, fall: 1,
      tables: [n], kinds: ['mul', 'div'],
      // Lớp 3 mới đảo thừa số (tính giao hoán); lớp 2 giữ đúng thứ tự của bảng
      gen(op) { return fresh(function () { return tableQ([n], op || 'mix', n !== 2 && n !== 5); }); }
    };
  });

  /* ---------- Màn chơi: Thử thách ---------- */
  const CHALLENGE_LEVELS = [
    {
      id: 'c1', title: 'Bảng 2 và 5', desc: 'Nhân và chia với 2, với 5', icon: '🚀', grade: 2, speed: 0.9, maxDigits: 2, fall: 1,
      tables: [2, 5], kinds: ['mul', 'div'],
      gen() { return fresh(function () { return tableQ([2, 5], 'mix', false); }); }
    },
    {
      id: 'c2', title: 'Bảng 3, 4, 6', desc: 'Nhân và chia với 3, 4, 6', icon: '🛸', grade: 3, speed: 0.95, maxDigits: 2, fall: 1,
      tables: [3, 4, 6], kinds: ['mul', 'div'],
      gen() { return fresh(function () { return tableQ([3, 4, 6], 'mix', true); }); }
    },
    {
      id: 'c3', title: 'Bảng 7, 8, 9', desc: 'Nhân và chia với 7, 8, 9', icon: '🌌', grade: 3, speed: 0.95, maxDigits: 2, fall: 1,
      tables: [7, 8, 9], kinds: ['mul', 'div'],
      gen() { return fresh(function () { return tableQ([7, 8, 9], 'mix', true); }); }
    },
    {
      id: 'c4', title: 'Cả bảng cửu chương', desc: 'Trộn tất cả bảng từ 2 đến 9', icon: '🪐', grade: 3, speed: 1.0, maxDigits: 2, fall: 1,
      tables: ALL_TABLES.slice(), kinds: ['mul', 'div'],
      gen() { return fresh(function () { return tableQ(ALL_TABLES, 'mix', true); }); }
    },
    {
      id: 'c5', title: 'Tìm thừa số', desc: 'Ví dụ: ? ' + TIMES + ' 6 = 42, 42 ' + DIV + ' ? = 6', icon: '🔍', grade: 3, speed: 0.9, maxDigits: 2, fall: 1.15,
      tables: ALL_TABLES.slice(), kinds: ['find'],
      gen() { return fresh(function () { return findQ(); }); }
    },
    {
      id: 'c6', title: 'Nhân chia số lớn', desc: 'Ví dụ: 23 ' + TIMES + ' 4, 84 ' + DIV + ' 4, 125 ' + TIMES + ' 3', icon: '🌠', grade: 3, speed: 0.85, maxDigits: 3, fall: 1.5,
      tables: [0], kinds: ['big'],
      gen() { return fresh(bigQ); }
    },
    {
      id: 'c7', title: 'Siêu Vệ Binh', desc: 'Trộn tất cả, thiên thạch rơi nhanh hơn!', icon: '🦸', grade: 0, speed: 1.15, maxDigits: 3, fall: 1.25,
      tables: ALL_TABLES.concat([0]), kinds: ['mul', 'div', 'find', 'big'],
      gen() {
        return fresh(function () {
          const t = Math.random();
          if (t < 0.6) return tableQ(ALL_TABLES, 'mix', true);
          if (t < 0.8) return findQ();
          return bigQ();
        });
      }
    }
  ];

  /** Dữ liệu cho màn "Xem bảng cửu chương". */
  function tableRows(n) {
    const rows = [];
    for (let m = 1; m <= 10; m++) {
      rows.push({
        m: m,
        mul: n + ' ' + TIMES + ' ' + m + ' = ' + (n * m),
        div: (n * m) + ' ' + DIV + ' ' + n + ' = ' + m
      });
    }
    return rows;
  }

  window.Tables = {
    rnd, chance, pick, shuffle, TIMES, DIV, ALL_TABLES, TABLE_ICONS,
    TABLE_LEVELS, CHALLENGE_LEVELS,
    mulQ, divQ, findQ, bigQ, tableQ, tableRows, speakEq, checkEq, fromInfo, hintFor, explainFor,
    levelById(id) {
      return TABLE_LEVELS.find((l) => l.id === id) || CHALLENGE_LEVELS.find((l) => l.id === id) || null;
    }
  };
})();
