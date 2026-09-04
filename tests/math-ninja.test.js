'use strict';
/* Kiểm thử logic thuần của Ninja Toán Học:
   - js/math.js: bộ sinh phép tính, đáp án nhiễu, các màn chơi, chế độ Ghép đôi
   - js/fruits.js: dựng sprite trái cây
   - js/game.js (nạp trong window giả): Store – di trú dữ liệu cũ, đóng gói dữ liệu hỏng,
     hồ sơ từng bé, kho ôn lại thông minh và thống kê cho báo cáo phụ huynh. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadGame, makeStorage } = require('./lib/load.js');

const GAME_DIR = path.resolve(__dirname, '..', 'math-ninja');
const readGameFile = (rel) => fs.readFileSync(path.join(GAME_DIR, rel), 'utf8');

const MG = loadGame('math-ninja', ['js/math.js']).MathGen;
const N = 1000;                       // số câu sinh ra cho mỗi màn ở mỗi phép kiểm tra
const ANSWER_IDS = ['a1', 'a2', 'a3', 'a4', 'm1', 'a5', 'm2', 'm3', 'm4', 'a6'];
const PAIR_IDS = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
const calc = (a, b, op) => (op === '+' ? a + b : op === '-' ? a - b : a * b);
/* deepEqual không dùng được: đối tượng đến từ vm context khác nên prototype khác nhau */
const same = (a, b, msg) => assert.equal(JSON.stringify(a), JSON.stringify(b), msg);

/* ---------------- 1. Định nghĩa các màn chơi ---------------- */
test('ANSWER_LEVELS / PAIR_LEVELS: ids, thứ tự và các trường bắt buộc', () => {
  same(MG.ANSWER_LEVELS.map((l) => l.id), ANSWER_IDS);
  same(MG.PAIR_LEVELS.map((l) => l.id), PAIR_IDS);
  const all = MG.ANSWER_LEVELS.concat(MG.PAIR_LEVELS);
  assert.equal(new Set(all.map((l) => l.id)).size, all.length, 'id phải là duy nhất');
  for (const l of all) {
    assert.ok(l.title && typeof l.title === 'string', l.id + ' thiếu title');
    assert.ok(l.desc && typeof l.desc === 'string', l.id + ' thiếu desc');
    assert.ok(l.icon && typeof l.icon === 'string', l.id + ' thiếu icon');
    assert.ok([0, 1, 2, 3].includes(l.grade), l.id + ' grade lạ: ' + l.grade);
    assert.ok(l.speed >= 0.5 && l.speed <= 1.3, l.id + ' speed lạ: ' + l.speed);
    assert.ok(l.fruits >= 3 && l.fruits <= 5, l.id + ' fruits lạ: ' + l.fruits);
    assert.ok(l.bomb >= 0 && l.bomb <= 0.35, l.id + ' bomb lạ: ' + l.bomb);
    assert.equal(typeof l.gen, 'function', l.id + ' thiếu gen()');
  }
  assert.equal(MG.levelById('a1').title, 'Cộng trừ đến 10');
  assert.equal(MG.levelById('p6').id, 'p6');
  assert.equal(MG.levelById('zz'), null);
  assert.equal(MG.levelById(''), null);
  // Bảng nhân 3 và 4 thuộc lớp 3 theo Chương trình GDPT 2018
  assert.equal(MG.levelById('m2').grade, 3);
  assert.equal(MG.ANSWER_LEVELS.findIndex((l) => l.id === 'm2') > MG.ANSWER_LEVELS.findIndex((l) => l.id === 'a5'), true);
});

/* ---------------- 2. Bộ sinh phép tính "Chém đáp án" ---------------- */
test('mọi bộ sinh: answer đúng phép tính, không âm, trong phạm vi, text khớp', () => {
  for (const lvl of MG.ANSWER_LEVELS) {
    for (let i = 0; i < N; i++) {
      const q = lvl.gen();
      const tag = lvl.id + ' ' + q.a + q.op + q.b;
      assert.ok(['+', '-', '*'].includes(q.op), tag + ': op lạ');
      assert.ok(Number.isInteger(q.a) && Number.isInteger(q.b), tag + ': toán hạng không nguyên');
      assert.ok(q.a >= 0 && q.b >= 0, tag + ': toán hạng âm');
      assert.equal(q.answer, calc(q.a, q.b, q.op), tag + ': đáp án sai');
      assert.ok(q.answer >= 0, tag + ': đáp án âm');
      assert.ok(q.answer <= q.max, tag + ': đáp án vượt max ' + q.max);
      assert.equal(q.text, q.a + ' ' + MG.opSymbol(q.op) + ' ' + q.b, tag + ': text không khớp');
    }
  }
});

test('gen20 không còn "20 − 0" hay "a − a" (A28)', () => {
  const lvl = MG.levelById('a2');
  for (let i = 0; i < 5000; i++) {
    const q = lvl.gen();
    if (q.op !== '-') continue;
    assert.notEqual(q.b, 0, 'gen20 sinh ra ' + q.text);
    assert.notEqual(q.a, q.b, 'gen20 sinh ra ' + q.text);
  }
});

test('make(a, b, op, max) tính đúng và giữ nguyên tham số', () => {
  assert.equal(MG.make(3, 4, '+', 12).answer, 7);
  assert.equal(MG.make(9, 5, '-', 12).answer, 4);
  assert.equal(MG.make(6, 7, '*', 110).answer, 42);
  assert.equal(MG.make(6, 7, '*', 110).text, '6 × 7');
  assert.equal(MG.make(9, 5, '-', 12).text, '9 − 5');
  assert.equal(MG.make(3, 4, '+', 12).max, 12);
});

/* ---------------- 3. Đáp án nhiễu ---------------- */
test('distractors(q, k): đủ số lượng, nguyên, không trùng nhau và khác đáp án', () => {
  for (const lvl of MG.ANSWER_LEVELS) {
    for (let i = 0; i < N; i++) {
      const q = lvl.gen();
      for (const k of [2, 3, 4, 5]) {
        const d = MG.distractors(q, k);
        const tag = lvl.id + ' ' + q.text + ' k=' + k;
        assert.equal(d.length, k, tag + ': thiếu đáp án nhiễu');
        assert.equal(new Set(d).size, k, tag + ': đáp án nhiễu trùng nhau');
        for (const v of d) {
          assert.ok(Number.isInteger(v), tag + ': ' + v + ' không nguyên');
          assert.ok(v >= 0, tag + ': ' + v + ' âm');
          assert.notEqual(v, q.answer, tag + ': trùng đáp án đúng');
        }
      }
    }
  }
});

test('distractors mô phỏng lỗi "quên nhớ" (ans − 10) ở màn cộng trừ có nhớ', () => {
  const lvl = MG.levelById('a3');
  let seen = 0;
  for (let i = 0; i < N; i++) {
    const q = lvl.gen();
    if (q.op !== '+' || (q.a % 10) + (q.b % 10) < 10) continue;
    if (MG.distractors(q, 5).includes(q.answer - 10)) seen++;
  }
  assert.ok(seen > 0, 'không thấy đáp án nhiễu ans − 10 trong ' + N + ' lần sinh');
});

/* ---------------- 4. Chế độ Ghép đôi ---------------- */
test('bộ sinh Ghép đôi: cặp hợp lệ, hai giá trị nằm trong [lo, hi]', () => {
  for (const lvl of MG.PAIR_LEVELS) {
    for (let i = 0; i < N; i++) {
      const q = lvl.gen();
      const tag = lvl.id + ' ' + q.pair.join('/') + ' → ' + q.target;
      assert.equal(q.op, lvl.op, tag + ': op không khớp màn');
      assert.equal(q.pair.length, 2, tag + ': cặp phải có 2 số');
      assert.ok(MG.isPair(q, q.pair[0], q.pair[1]), tag + ': cặp không thỏa mãn');
      assert.equal(calc(Math.max(q.pair[0], q.pair[1]), Math.min(q.pair[0], q.pair[1]), q.op), q.target, tag + ': target sai');
      for (const v of q.pair) {
        assert.ok(Number.isInteger(v) && v >= q.lo && v <= q.hi, tag + ': ' + v + ' ngoài [' + q.lo + ',' + q.hi + ']');
        if (q.step) assert.equal(v % q.step, 0, tag + ': ' + v + ' không chia hết cho step ' + q.step);
      }
    }
  }
});

test('pairWave(q, n): đúng một cặp hợp lệ, giá trị không trùng (trừ chính cặp đôi)', () => {
  for (const lvl of MG.PAIR_LEVELS) {
    for (let i = 0; i < 300; i++) {
      const q = lvl.gen();
      for (const n of [3, 4, 5, 6]) {
        const vals = MG.pairWave(q, n);
        const tag = lvl.id + ' target=' + q.target + ' vals=' + vals.join(',');
        assert.equal(vals.length, n, tag + ': sai số lượng quả');
        let pairs = 0;
        for (let x = 0; x < n; x++) {
          for (let y = x + 1; y < n; y++) if (MG.isPair(q, vals[x], vals[y])) pairs++;
        }
        assert.equal(pairs, 1, tag + ': phải có đúng 1 cặp đúng, đang có ' + pairs);
        const dup = vals.length - new Set(vals).size;
        assert.ok(dup <= (q.pair[0] === q.pair[1] ? 1 : 0), tag + ': có giá trị trùng ngoài cặp đôi');
        for (const v of vals) {
          assert.ok(v >= q.lo && v <= q.hi, tag + ': ' + v + ' ngoài [' + q.lo + ',' + q.hi + ']');
        }
      }
    }
  }
});

/* ---------------- 5. Chuỗi hiển thị của Ghép đôi ---------------- */
test('pairResultText: không bao giờ ra phép trừ ngược, hai vế luôn bằng nhau (A3)', () => {
  for (const lvl of MG.PAIR_LEVELS) {
    for (let i = 0; i < N; i++) {
      const q = lvl.gen();
      for (const [u, v] of [[q.pair[0], q.pair[1]], [q.pair[1], q.pair[0]]]) {
        const t = MG.pairResultText(q, u, v);
        const m = t.match(/^(\d+) (.) (\d+) = (\d+)$/);
        assert.ok(m, lvl.id + ': chuỗi lạ "' + t + '"');
        const [, l, op, r, res] = m;
        if (op === MG.MINUS) assert.ok(Number(l) >= Number(r), lvl.id + ': trừ ngược "' + t + '"');
        assert.equal(calc(Number(l), Number(r), op === '+' ? '+' : op === MG.MINUS ? '-' : '*'), Number(res), lvl.id + ': "' + t + '" sai');
        assert.ok(Number(res) >= 0, lvl.id + ': "' + t + '" ra số âm');
      }
    }
  }
  assert.equal(MG.pairResultText({ op: '-', target: 1 }, 2, 3), '3 − 2 = 1');
  assert.equal(MG.pairResultText({ op: '+', target: 10 }, 3, 7), '3 + 7 = 10');
  assert.equal(MG.pairResultText({ op: '*', target: 42 }, 6, 7), '6 × 7 = 42');
});

test('pairText: hai dấu ? khi chưa chém, dấu ? đứng trước khi giữ số bé của phép trừ', () => {
  const q = { target: 1, op: '-', pair: [3, 2], lo: 1, hi: 20 };
  const empty = MG.pairText(q, null, 'a');
  assert.equal((empty.match(/\?/g) || []).length, 2, 'phải có 2 dấu ?');
  assert.ok(empty.indexOf('= 1') > 0);
  const formB = MG.pairText(q, 2, 'b');
  assert.ok(formB.indexOf('<span class="q">?</span>') < formB.indexOf('<span class="held">2</span>'), 'form b: ? phải đứng trước');
  const formA = MG.pairText(q, 3, 'a');
  assert.ok(formA.indexOf('<span class="held">3</span>') < formA.indexOf('<span class="q">?</span>'), 'form a: số đã giữ đứng trước');
  const plus = MG.pairText({ target: 10, op: '+', pair: [3, 7] }, 3, 'b');
  assert.ok(plus.indexOf('<span class="held">3</span>') < plus.indexOf('<span class="q">?</span>'), 'phép cộng luôn giữ số ở trước');
});

test('isPair: đúng với cả hai thứ tự, sai với cặp khác', () => {
  const plus = { op: '+', target: 10 };
  assert.ok(MG.isPair(plus, 3, 7) && MG.isPair(plus, 7, 3));
  assert.ok(!MG.isPair(plus, 3, 8));
  const minus = { op: '-', target: 4 };
  assert.ok(MG.isPair(minus, 9, 5) && MG.isPair(minus, 5, 9));
  const times = { op: '*', target: 42 };
  assert.ok(MG.isPair(times, 6, 7) && MG.isPair(times, 7, 6));
  assert.ok(!MG.isPair(times, 6, 8));
});

/* ---------------- 6. Sprite trái cây ---------------- */
test('Sprites.build dựng đủ sprite cho mọi loại quả, bom và tim', () => {
  const SP = loadGame('math-ninja', ['js/math.js', 'js/fruits.js']).Sprites;
  SP.build(40, 1);
  assert.ok(SP.TYPES.length >= 6, 'phải có ít nhất 6 loại quả');
  for (const t of SP.TYPES) {
    assert.ok(SP.fruits[t] && SP.fruits[t].skin && SP.fruits[t].skin.canvas, t + ': thiếu sprite vỏ');
    assert.ok(SP.fruits[t].inner && SP.fruits[t].inner.canvas, t + ': thiếu sprite ruột');
    assert.ok(SP.FRUITS[t].juice, t + ': thiếu màu nước quả');
  }
  assert.ok(SP.bomb && SP.bomb.canvas, 'thiếu sprite bom');
  assert.ok(SP.heart && SP.heart.canvas, 'thiếu sprite tim');
});

test('Sprites.halfSprite nướng sẵn nửa quả, dùng lại ô và không bao giờ trả sai hình', () => {
  const SP = loadGame('math-ninja', ['js/math.js', 'js/fruits.js']).Sprites;
  SP.build(40, 2);
  assert.ok(SP.halfSize > 0, 'chưa tính kích thước ô nướng sẵn');
  for (const t of SP.TYPES) {
    assert.ok(SP.halfSize >= SP.fruits[t].skin.size, t + ': ô nướng sẵn nhỏ hơn sprite vỏ');
  }

  // 1 ô cho mỗi nửa quả, không dùng chung khi còn sống
  const taken = [];
  for (let i = 0; i < 16; i++) {
    const sp = SP.halfSprite(SP.TYPES[i % SP.TYPES.length], i * 0.4, i % 2 ? 1 : -1);
    assert.ok(sp && sp.canvas, 'nửa quả ' + i + ': không nướng được');
    assert.equal(sp.size, SP.halfSize, 'mọi ô phải cùng kích thước để dùng lẫn được');
    assert.equal(sp.half, SP.halfSize / 2);
    assert.equal(sp.gen, SP.halfGen, 'ô phải mang số đời hiện tại');
    assert.equal(taken.indexOf(sp), -1, 'ô đang dùng bị cấp phát lần hai');
    taken.push(sp);
  }
  // kho đầy -> trả null để game vẽ trực tiếp (không lỗi, không hình sai)
  assert.equal(SP.halfSprite('apple', 0.2, 1), null, 'kho đầy phải trả null');
  // trả ô về kho thì cấp phát lại được
  SP.freeHalf(taken[3]);
  const again = SP.halfSprite('apple', 0.2, 1);
  assert.equal(again, taken[3], 'ô đã trả phải được dùng lại');
  assert.equal(SP.halfPool.length, 16, 'kho không được vượt quá 16 ô');

  // dựng lại sprite (xoay màn hình) làm cũ mọi ô đang giữ
  const oldGen = SP.halfGen;
  SP.build(52, 2);
  assert.ok(SP.halfGen > oldGen, 'dựng lại phải tăng số đời');
  assert.equal(SP.halfPool.length, 0, 'dựng lại phải dọn kho');
  SP.freeHalf(taken[0]);   // ô cũ: bỏ qua, không được làm hỏng kho mới
  assert.equal(SP.halfPool.length, 0, 'trả ô đời cũ không được đụng vào kho mới');
  const fresh = SP.halfSprite('kiwi', 1, -1);
  assert.ok(fresh && fresh.canvas && fresh.gen === SP.halfGen, 'kho mới phải cấp phát được');

  // loại quả không tồn tại -> null chứ không ném lỗi
  assert.equal(SP.halfSprite('khongco', 0, 1), null);
  SP.freeHalf(null);
  SP.freeHalf(undefined);
});

/* ---------------- 7. Store (js/game.js nạp trong window giả) ---------------- */
const GAME_FILES = ['js/audio.js', 'js/math.js', 'js/fruits.js', 'js/profile.js', 'js/game.js'];
function bootWith(seed, players) {
  const st = makeStorage();
  if (seed !== undefined) st.setItem('ninja-toan-v1', typeof seed === 'string' ? seed : JSON.stringify(seed));
  if (players) st.setItem('3hoa-players-v1', JSON.stringify(players));
  const w = loadGame('math-ninja', GAME_FILES, { localStorage: st });
  assert.ok(w.__NinjaToan && w.__NinjaToan.Store, 'game.js phải khởi động được trong môi trường giả');
  return { w, st, S: w.__NinjaToan.Store, X: w.__NinjaToan };
}

test('Store: dữ liệu cũ ở cấp cao nhất chuyển sang players.p1 và được đóng gói lại', () => {
  const legacy = Object.assign(JSON.parse('{"__proto__":{"pwned":1}}'), {
    music: false, duration: 60, names: ['Tí', '  Bo  ', 'x'.repeat(200), ''],
    records: {
      'answer:a1:90': { best: 1200, stars: 3, top: [{ name: 'Tí', score: 1200, date: 1 }] },
      'answer:a2:90': 'nope',
      'bogus:zz:90': { stars: 3 },
      'answer:zz:90': { best: 5 },
      'answer:a1:45': { best: 9 }
    }
  });
  const { S, st } = bootWith(legacy);
  assert.equal(S.data.music, false);
  assert.equal(S.data.sound, true);
  assert.equal(S.data.duration, 60);
  assert.equal(S.data.fx, 'full');
  assert.equal(S.data.records, undefined, 'không còn records ở cấp cao nhất');
  assert.equal(S.data.names, undefined, 'không còn names ở cấp cao nhất');
  assert.equal(Object.getPrototypeOf(S.data).pwned, undefined, '__proto__ phải bị loại bỏ');
  const p1 = S.data.players.p1;
  assert.equal(p1.records['answer:a1:90'].best, 1200);
  assert.equal(p1.records['answer:a1:90'].stars, 3);
  assert.equal(p1.records['answer:a1:90'].top[0].name, 'Tí');
  assert.equal(p1.records['answer:a2:90'], undefined, 'giá trị không phải object thì bỏ');
  assert.equal(p1.records['bogus:zz:90'], undefined, 'khóa sai định dạng thì bỏ');
  assert.equal(p1.records['answer:zz:90'], undefined, 'màn không tồn tại thì bỏ');
  assert.equal(p1.records['answer:a1:45'], undefined, 'thời lượng lạ thì bỏ');
  same(p1.names, ['Tí', 'Bo', 'x'.repeat(16)]);
  same(p1.missed, {});
  assert.equal(p1.stats.plays, 0);
  const saved = JSON.parse(st.getItem('ninja-toan-v1'));
  assert.equal(saved.records, undefined);
  assert.equal(saved.players.p1.records['answer:a1:90'].best, 1200);
  assert.equal(S.getRecord('answer', 'a1', 90).best, 1200);
  assert.equal(S.p(), p1);
});

test('Store: dữ liệu rác hoặc độc hại không ném lỗi và cho bucket trắng', () => {
  const seeds = ['{not json', '[]', '42', 'null', '"abc"', {}, { records: 5 }, { records: { 'answer:a1:90': { top: 'abc' } } },
    { records: { 'answer:a1:90': { top: [null, 5], best: 'abc', stars: null } } }, { players: [] },
    { players: { 'khóa xấu!': { records: {} }, p1: 7 } }, { names: 'abc' }, { duration: 'abc', fx: 'weird' }];
  for (const seed of seeds) {
    const { S } = bootWith(seed);
    const r = S.getRecord('answer', 'a1', 90);
    const tag = JSON.stringify(seed);
    same(r, { best: 0, stars: 0, top: [] }, tag);
    same(S.p().names, [], tag);
    assert.equal(S.data.duration, 90, tag);
    assert.equal(S.data.fx, 'full', tag);
    assert.equal(S.data.players['khóa xấu!'], undefined, tag);
  }
  // Tên dài và mã HTML bị cắt/lọc, điểm bị kẹp khoảng
  const { S } = bootWith({ records: { 'answer:a1:90': { best: 1e12, stars: 7, top: [{ name: '<img src=x>'.repeat(9000), score: -5 }] } } });
  const rec = S.getRecord('answer', 'a1', 90);
  assert.equal(rec.best, 999999);
  assert.equal(rec.stars, 3);
  assert.ok(rec.top[0].name.length <= 16, 'tên phải bị cắt còn ≤ 16 ký tự');
  assert.ok(rec.top[0].name.indexOf('<') < 0, 'tên không được chứa dấu <');
  assert.equal(rec.top[0].score, 0);
});

test('Store: mỗi bé một bucket riêng, accessor đi theo bé đang chơi', () => {
  const players = { v: 1, active: 'p2', players: [{ id: 'p1', name: 'Bé', avatar: '🐯' }, { id: 'p2', name: 'Na', avatar: '🦊' }] };
  const { S, w } = bootWith({ players: { p1: { records: { 'answer:a1:90': { best: 500, stars: 2, top: [] } }, names: ['Bé'] } } }, players);
  assert.equal(w.Players.active().id, 'p2');
  assert.equal(S.getRecord('answer', 'a1', 90).best, 0, 'bé mới chưa có kỷ lục');
  S.setRecord('answer', 'a1', 90, { best: 300, stars: 1, top: [{ name: 'Na', avatar: '🦊', score: 300, date: 2 }] });
  assert.equal(S.data.players.p2.records['answer:a1:90'].best, 300);
  assert.equal(S.data.players.p1.records['answer:a1:90'].best, 500, 'không đụng vào bucket của bé khác');
  assert.equal(S.data.players.p2.records['answer:a1:90'].top[0].avatar, '🦊');
  S.rememberName('Na');
  same(S.p().names, ['Na']);
  same(S.data.players.p1.names, ['Bé']);
  w.Players.setActive('p1');
  assert.equal(S.getRecord('answer', 'a1', 90).best, 500);
  S.setRecord('answer', 'zz', 90, { best: 10 });
  assert.equal(S.p().records['answer:zz:90'], undefined, 'không ghi kỷ lục cho màn không tồn tại');
  S.resetActive();
  assert.equal(S.getRecord('answer', 'a1', 90).best, 0);
  assert.equal(S.data.players.p2.records['answer:a1:90'].best, 300, 'xóa tiến trình chỉ ảnh hưởng bé đang chơi');
});

test('Store: kho ôn lại thông minh (noteMissed / noteOk / reviewPool)', () => {
  const { S, st } = bootWith();
  const info = { a: 7, b: 5, op: '+', max: 24, level: 'a1' };
  S.noteMissed('a:7+5', info);
  S.noteMissed('a:7+5', info);
  S.noteMissed('p:+:10:3,7', { target: 10, op: '+', pair: [3, 7], lo: 1, hi: 9, level: 'p1' });
  S.noteMissed('khóa-sai', info);                                   // key không khớp info → bỏ
  S.noteMissed('a:1+1', { a: 1, b: 1, op: '+', max: 12, level: 'zz' });  // màn không tồn tại → bỏ
  S.noteMissed('a:1+2', { a: 1, b: 2, op: '?', max: 12, level: 'a1' }); // phép tính lạ → bỏ
  same(Object.keys(S.p().missed).sort(), ['a:7+5', 'p:+:10:3,7']);
  assert.equal(S.p().missed['a:7+5'].n, 2);
  const pool = S.reviewPool((i) => i.level === 'a1');
  assert.equal(pool.length, 1);
  assert.equal(pool[0].key, 'a:7+5');
  assert.equal(pool[0].n, 2);
  same(pool[0].info, info);
  assert.equal(S.reviewPool().length, 2);
  S.noteOk('a:7+5');
  assert.equal(S.p().missed['a:7+5'].ok, 1, 'đúng 1 lần thì chưa xóa');
  S.noteOk('a:7+5');
  assert.equal(S.p().missed['a:7+5'], undefined, 'đúng 2 lần thì xóa khỏi kho ôn');
  S.noteOk('không-có');   // không được ném lỗi
  // Kho ôn được lưu lại và sống sót qua vòng đóng gói khi tải lại
  const again = bootWith(JSON.parse(st.getItem('ninja-toan-v1')));
  same(Object.keys(again.S.p().missed), ['p:+:10:3,7']);
  same(again.S.p().missed['p:+:10:3,7'].info.pair, [3, 7]);
});

test('Store: kho ôn giới hạn 60 mục, bỏ mục cũ nhất', () => {
  const { S } = bootWith();
  for (let b = 1; b <= 70; b++) S.noteMissed('a:1+' + b, { a: 1, b: b, op: '+', max: 120, level: 'a4' });
  const keys = Object.keys(S.p().missed);
  assert.equal(keys.length, 60);
  assert.ok(!keys.includes('a:1+1'), 'mục cũ nhất phải bị bỏ');
  assert.ok(keys.includes('a:1+70'), 'mục mới nhất phải còn');
});

test('Store: thống kê cho báo cáo phụ huynh (addStats)', () => {
  const { S } = bootWith();
  S.addStats({ topic: 'a1', correct: 5, wrong: 2, seconds: 90 });
  S.addStats({ topic: 'a1', correct: 3, wrong: 1, seconds: 60.4 });
  S.addStats({ topic: 'zz', correct: 9, wrong: 9, seconds: 10 });   // màn lạ: chỉ cộng tổng, không tạo byTopic
  const s = S.p().stats;
  assert.equal(s.plays, 3);
  assert.equal(s.correct, 17);
  assert.equal(s.wrong, 12);
  assert.equal(s.seconds, 160);
  same(s.byTopic.a1, { c: 8, w: 3 });
  assert.equal(s.byTopic.zz, undefined);
  assert.ok(s.last > 0);
});

test('Store: thống kê hỏng khi tải lại được ép về số hợp lệ', () => {
  const { S } = bootWith({
    players: {
      p1: {
        stats: { plays: -5, correct: 'abc', wrong: 3.7, seconds: 1e15, byTopic: { a1: { c: '7', w: 2 }, nope: { c: 1, w: 1 } } },
        missed: { 'a:7+5': { n: 'x', ok: 99, last: 'y', info: { a: 7, b: 5, op: '+', max: 24, level: 'a1' } } }
      }
    }
  });
  const s = S.p().stats;
  assert.equal(s.plays, 0);
  assert.equal(s.correct, 0);
  assert.equal(s.wrong, 3);
  same(s.byTopic, { a1: { c: 7, w: 2 } });
  const m = S.p().missed['a:7+5'];
  assert.equal(m.n, 1);
  assert.equal(m.ok, 9);
  assert.equal(m.last, 0);
});

/* ---------------- 8. Giao diện điện thoại & tài liệu (chống tái phát) ---------------- */
test('style.css: có khối thu gọn cho điện thoại ≤ 420 px', () => {
  const css = readGameFile('style.css');
  const m = css.match(/@media \(max-width: 420px\) \{[\s\S]*?\n\}/);
  assert.ok(m, 'thiếu @media (max-width: 420px)');
  const block = m[0];
  // Thanh tiêu đề "Chọn màn chơi" phải co lại được, nếu không nút 📖 bị cắt khỏi bảng
  assert.match(block, /\.screen-head h2 \{[^}]*white-space: normal/, '.screen-head h2 phải cho xuống dòng');
  assert.match(block, /\.screen-head \.btn \{[^}]*min-width: 44px/, 'nút trên thanh tiêu đề phải rộng ≥ 44 px');
  // Menu phải gọn lại để nhóm "Thời gian mỗi ván" không rơi xuống dưới màn hình
  assert.match(block, /#menu \.panel \{[^}]*padding/, 'phải thu gọn đệm của bảng menu');
  assert.match(block, /\.toggle \{[^}]*min-height: 44px/, 'công tắc vẫn phải cao ≥ 44 px');
});

test('style.css: nút bị khóa nhìn thấy rõ và vùng chạm liên kết chân trang ≥ 44 px', () => {
  const css = readGameFile('style.css');
  assert.match(css, /\.btn\[disabled\] \{[^}]*opacity: 0\.45/, 'thiếu .btn[disabled]');
  const foot = css.match(/\.footer-note a \{[\s\S]*?\}/);
  assert.ok(foot, 'thiếu .footer-note a');
  assert.match(foot[0], /min-height: 44px/, 'liên kết chân trang phải cao ≥ 44 px');
});

test('style.css: chữ trong báo cáo đủ tương phản (không dùng cam/xanh nhạt)', () => {
  const css = readGameFile('style.css');
  const v = css.match(/\.report-stat \.v \{[^}]*\}/);
  assert.ok(v, 'thiếu .report-stat .v');
  assert.doesNotMatch(v[0], /var\(--pl-accent\)|var\(--orange\)/, 'số liệu báo cáo không được dùng màu cam nhạt');
  const badge = css.match(/\.report-row \.mastered \{[^}]*\}/);
  assert.ok(badge, 'thiếu .report-row .mastered');
  assert.match(badge[0], /#05603f/, 'huy hiệu "Đã thuộc" phải dùng xanh đậm như thẻ màn chơi');
});

test('README mô tả đúng số nút bật/tắt hiện có trong game.js', () => {
  const js = readGameFile('js/game.js');
  const defs = js.match(/const TOGGLE_DEFS = \[[\s\S]*?\];/);
  const short = js.match(/const TOGGLE_DEFS_SHORT = \[[\s\S]*?\];/);
  assert.ok(defs && short, 'thiếu bảng nhãn công tắc');
  const keys = (b) => (b.match(/key: '/g) || []).length;
  assert.equal(keys(defs[0]), 4, 'phải có 4 công tắc');
  assert.equal(keys(short[0]), 4, 'bản nhãn ngắn cũng phải có 4 công tắc');
  // Nhãn ngắn phải thật sự ngắn hơn để 4 nút vừa hai hàng trên điện thoại
  const longest = (b) => Math.max.apply(null, (b.match(/on: '([^']*)'/g) || []).map((x) => x.length));
  assert.ok(longest(short[0]) < longest(defs[0]), 'nhãn ngắn phải ngắn hơn nhãn đầy đủ');
  assert.match(readGameFile('README.md'), /Bốn nút bật\/tắt/, 'README phải nói "Bốn nút bật/tắt"');
});

/* ---------------- 9. Giải thích cách nhẩm & tên lỗi quen thuộc (C3) ---------------- */
/** Kiểm tra mọi bước số học trong một câu explain(); trả false nếu chuỗi có dạng lạ. */
function checkExplain(q, s) {
  // "8 + 2 = 10, thêm 5 nữa là 15" / "15 − 5 = 10, bớt 4 nữa còn 6"
  let m = s.match(/^(\d+) ([+−]) (\d+) = (\d+), (thêm|bớt) (\d+) nữa (là|còn) (\d+)$/);
  if (m) {
    const a = Number(m[1]), b = Number(m[3]), c = Number(m[4]), d = Number(m[6]), e = Number(m[8]);
    const step1 = m[2] === '+' ? a + b : a - b;
    assert.equal(step1, c, q.text + ': bước 1 sai trong "' + s + '"');
    assert.equal(m[5] === 'thêm' ? c + d : c - d, e, q.text + ': bước 2 sai trong "' + s + '"');
    assert.equal(e, q.answer, q.text + ': kết quả cuối khác đáp án trong "' + s + '"');
    assert.ok(b > 0 && d > 0, q.text + ': bước có số 0 vô nghĩa trong "' + s + '"');
    assert.ok(c >= 0 && e >= 0, q.text + ': ra số âm trong "' + s + '"');
    return true;
  }
  // "6 × 7 = 6 × 5 + 6 × 2 = 30 + 12 = 42"
  m = s.match(/^(\d+) × (\d+) = (\d+) × 5 \+ (\d+) × (\d+) = (\d+) \+ (\d+) = (\d+)$/);
  if (m) {
    const n = m.map(Number);
    assert.equal(n[1], n[3], q.text + ': thừa số đầu đổi trong "' + s + '"');
    assert.equal(n[1], n[4], q.text + ': thừa số đầu đổi trong "' + s + '"');
    assert.equal(n[2] - 5, n[5], q.text + ': tách qua mốc 5 sai trong "' + s + '"');
    assert.equal(n[1] * 5, n[6], q.text + ': 5 lần sai trong "' + s + '"');
    assert.equal(n[1] * n[5], n[7], q.text + ': phần dư sai trong "' + s + '"');
    assert.equal(n[6] + n[7], n[8], q.text + ': tổng sai trong "' + s + '"');
    assert.equal(n[8], q.answer, q.text + ': kết quả cuối khác đáp án trong "' + s + '"');
    return true;
  }
  return false;
}

test('explain(q): mọi bước đều đúng số học và kết thúc bằng đáp án', () => {
  let seen = 0;
  for (const lvl of MG.ANSWER_LEVELS) {
    for (let i = 0; i < N; i++) {
      const q = lvl.gen();
      const s = MG.explain(q);
      assert.equal(typeof s, 'string', lvl.id + ': explain phải trả chuỗi');
      if (!s) continue;
      seen++;
      assert.ok(checkExplain(q, s), lvl.id + ': dạng chuỗi lạ "' + s + '"');
      assert.doesNotMatch(s, /-\d/, lvl.id + ': "' + s + '" có số âm');
    }
  }
  assert.ok(seen > N, 'phải giải thích được phần lớn các câu (chỉ có ' + seen + ')');
  // Vài ví dụ cụ thể theo đúng cách dạy ở tiểu học
  assert.equal(MG.explain(MG.make(8, 7, '+', 24)), '8 + 2 = 10, thêm 5 nữa là 15');
  assert.equal(MG.explain(MG.make(15, 9, '-', 24)), '15 − 5 = 10, bớt 4 nữa còn 6');
  assert.equal(MG.explain(MG.make(20, 7, '-', 24)), '20 − 10 = 10, thêm 3 nữa là 13');
  assert.equal(MG.explain(MG.make(36, 27, '+', 120)), '36 + 20 = 56, thêm 7 nữa là 63');
  assert.equal(MG.explain(MG.make(6, 7, '*', 110)), '6 × 7 = 6 × 5 + 6 × 2 = 30 + 12 = 42');
  // Phép quá dễ thì không cần giải thích
  assert.equal(MG.explain(MG.make(3, 4, '+', 12)), '');
  assert.equal(MG.explain(MG.make(9, 5, '-', 12)), '');
  assert.equal(MG.explain(null), '');
});

test('explain(q): không dạy mẹo "10 − 10 = 0" ở màn lớp 1', () => {
  // 10 − b không cần mẹo nào cả: bớt hết 10 rồi thêm lại là ngược cách dạy lớp 1
  assert.equal(MG.explain(MG.make(10, 1, '-', 12)), '');
  assert.equal(MG.explain(MG.make(10, 3, '-', 12)), '');
  assert.equal(MG.explain(MG.make(10, 9, '-', 12)), '');
  // Từ hai chục trở lên thì mẹo "bớt 10 rồi thêm lại" mới có ích
  assert.equal(MG.explain(MG.make(20, 7, '-', 24)), '20 − 10 = 10, thêm 3 nữa là 13');
  assert.equal(MG.explain(MG.make(30, 8, '-', 40)), '30 − 10 = 20, thêm 2 nữa là 22');
  // Không lời giải thích nào của bất kỳ màn nào được đi qua số 0
  for (const lvl of MG.ANSWER_LEVELS) {
    for (let i = 0; i < N; i++) {
      const s = MG.explain(lvl.gen());
      assert.doesNotMatch(s, /= 0,/, lvl.id + ': lời giải thích đi qua số 0 — "' + s + '"');
    }
  }
  // Quét màn a1 (lớp 1): mọi câu dạng 10 − b đều im lặng
  const a1 = MG.levelById('a1');
  let seen = 0;
  for (let i = 0; i < 20000; i++) {
    const q = a1.gen();
    if (q.op !== '-' || q.a !== 10 || q.b <= 0 || q.b >= 10) continue;
    seen++;
    assert.equal(MG.explain(q), '', 'a1: "' + q.text + '" không được giải thích vòng vo');
  }
  assert.ok(seen > 100, 'mẫu thử phải gặp dạng 10 − b (chỉ gặp ' + seen + ' lần)');
});

test('misconception(q, v): gọi đúng tên lỗi quen thuộc, im lặng với số ngẫu nhiên', () => {
  const carry = MG.make(8, 7, '+', 24);
  assert.match(MG.misconception(carry, 5), /quên nhớ/);
  const borrow = MG.make(15, 9, '-', 24);
  assert.match(MG.misconception(borrow, 16), /quên mượn/);
  const mul = MG.make(6, 7, '*', 110);
  assert.match(MG.misconception(mul, 48), /ô bên cạnh/);
  assert.match(MG.misconception(mul, 36), /ô bên cạnh/);
  assert.match(MG.misconception(mul, 13), /phép nhân/);
  assert.match(MG.misconception(MG.make(9, 4, '+', 24), 5), /phép cộng/);
  assert.match(MG.misconception(MG.make(9, 4, '-', 24), 13), /phép trừ/);
  assert.equal(MG.misconception(carry, 999), '');
  assert.equal(MG.misconception(carry, carry.answer), '');
  assert.equal(MG.misconception(null, 3), '');
  // Không bao giờ ném lỗi với dữ liệu lạ
  for (const lvl of MG.ANSWER_LEVELS) {
    for (let i = 0; i < 200; i++) {
      const q = lvl.gen();
      for (const v of MG.distractors(q, 4)) assert.equal(typeof MG.misconception(q, v), 'string');
    }
  }
});

/* ---------------- 10. Nhịp độ màn "Siêu Ninja" (C7) ---------------- */
test('genMix chỉ dùng số tròn khi vào phạm vi 1000', () => {
  const lvl = MG.levelById('a6');
  let big = 0;
  for (let i = 0; i < 20000; i++) {
    const q = lvl.gen();
    if (q.op === '*' || q.a < 100 || q.b < 100) continue;
    big++;
    assert.equal(q.a % 10, 0, 'Siêu Ninja sinh ra "' + q.text + '" (số hạng lẻ)');
    assert.equal(q.b % 10, 0, 'Siêu Ninja sinh ra "' + q.text + '" (số hạng lẻ)');
  }
  assert.ok(big > 100, 'phải có câu 3 chữ số để kiểm tra (chỉ có ' + big + ')');
});

test('màn số lớn bay chậm lại để bé kịp nhẩm (a5, m4 ≤ 0.9)', () => {
  for (const id of ['a5', 'm4']) {
    const l = MG.levelById(id);
    assert.ok(l.big === true, id + ' phải là màn số lớn');
    assert.ok(l.speed <= 0.9, id + ' bay quá nhanh: ' + l.speed);
  }
  // Siêu Ninja vẫn là màn thử thách nhanh nhất
  assert.ok(MG.levelById('a6').speed > MG.levelById('a5').speed);
});

/* ---------------- 11. Giao diện các tính năng mới (chống tái phát) ---------------- */
test('index.html: có nút 💡 Gợi ý, hai nút bước tiếp theo và lớp mưa giấy màu', () => {
  const html = readGameFile('index.html');
  assert.match(html, /id="btn-hint"[^>]*aria-label="[^"]+"/, 'thiếu nút 💡 có aria-label');
  assert.match(html, /id="btn-next"[^>]*hidden/, 'thiếu nút "Màn tiếp theo"');
  assert.match(html, /id="btn-easier"[^>]*hidden/, 'thiếu nút "Màn dễ hơn"');
  assert.match(html, /id="result-fx"[^>]*aria-hidden="true"/, 'thiếu lớp #result-fx');
  assert.match(html, /Bí quá thì bấm nút/, 'Cách chơi phải nói về nút gợi ý');
});

test('style.css: dải gợi ý xuống dòng được và mưa giấy màu tắt khi giảm chuyển động', () => {
  const css = readGameFile('style.css');
  const hint = css.match(/\n\.hint \{[\s\S]*?\n\}/);
  assert.ok(hint, 'thiếu .hint');
  assert.match(hint[0], /white-space: normal/, 'dải gợi ý phải xuống dòng được');
  assert.match(hint[0], /max-width: min\(92vw, 560px\)/, 'dải gợi ý phải có bề rộng tối đa');
  assert.match(css, /\.lite-fx \.result-fx \{[^}]*display: none/, 'chế độ Hiệu ứng: Ít phải tắt mưa giấy');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.result-fx \{[^}]*display: none/, 'giảm chuyển động phải tắt mưa giấy');
  assert.match(css, /\.hud-btn \{[\s\S]*?pointer-events: auto/, 'nút HUD phải bấm được');
  assert.match(css, /\.hud-btn\[disabled\]/, 'nút HUD bị khoá phải thấy rõ');
  assert.match(css, /\.level-card \.new \{/, 'thẻ màn chưa chơi phải có kiểu riêng');
  assert.match(css, /\.level-card\.next \{/, 'thẻ "chơi tiếp" phải nổi bật');
});

/* ---------------- 11b. Tương phản màu (C4/C9/C10) ----------------
   Chữ trắng nằm ở GIỮA nút, nên phải kiểm cả điểm giữa dải màu chứ không chỉ mốc đậm.
   Và vì nhãn nút thu xuống 15–17 px ở khổ điện thoại (không còn là "chữ to" theo WCAG),
   ngưỡng phải là 4.5:1 chứ không phải ngoại lệ 3:1 — nếu không phép thử chỉ đạt ở khổ màn hình thuận lợi. */
const srgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function lum(hex) {
  const v = srgb(hex).map((x) => {
    const u = x / 255;
    return u <= 0.03928 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const mixHex = (a, b) => '#' + srgb(a).map((v, i) => Math.round((v + srgb(b)[i]) / 2).toString(16).padStart(2, '0')).join('');

test('style.css: chữ trắng trên nút đạt 4.5:1 ở MỌI điểm của dải màu (C10)', () => {
  const css = readGameFile('style.css');
  const stopsOf = (rx, name) => {
    const m = css.match(rx);
    assert.ok(m, 'không tìm thấy nền chuyển sắc của ' + name);
    const s = (m[1].match(/#[0-9a-f]{6}/gi) || []).map((x) => x.toLowerCase());
    assert.equal(s.length, 2, name + ' phải có đúng hai mốc màu (đang: ' + m[1] + ')');
    return s;
  };
  const buttons = {
    '.btn': stopsOf(/\n\.btn \{[\s\S]*?background: (linear-gradient\([^;]*\));/, '.btn'),
    '.btn.teal': stopsOf(/\n\.btn\.teal \{ background: (linear-gradient\([^)]*\))/, '.btn.teal'),
    '.btn.green': stopsOf(/\n\.btn\.green \{ background: (linear-gradient\([^)]*\))/, '.btn.green')
  };
  for (const name of Object.keys(buttons)) {
    const s = buttons[name];
    for (const [where, c] of [['đỉnh', s[0]], ['giữa', mixHex(s[0], s[1])], ['đáy', s[1]]]) {
      const r = ratio('#ffffff', c);
      assert.ok(r >= 4.5, name + ': chữ trắng ở ' + where + ' nút chỉ đạt ' + r.toFixed(2) + ':1 trên ' + c
        + ' (cần 4.5:1 vì nhãn nút xuống 15–17 px trên điện thoại)');
    }
  }
  // Viền 3-D dưới nút phải đậm hơn đáy dải màu, nếu không nút mất cảm giác khối
  const tok = {};
  let m, re = /--([\w-]+):\s*(#[0-9a-f]{6})/gi;
  while ((m = re.exec(css))) tok[m[1]] = m[2].toLowerCase();
  const edges = { '.btn': 'orange-deep', '.btn.teal': 'teal-deep', '.btn.green': 'green-deep' };
  for (const name of Object.keys(edges)) {
    const shadow = tok[edges[name]];
    assert.ok(shadow, 'thiếu biến --' + edges[name]);
    assert.ok(lum(shadow) < lum(buttons[name][1]) * 0.85, name + ': viền 3-D (' + shadow + ') phải đậm hơn hẳn đáy nút (' + buttons[name][1] + ')');
  }
});

test('style.css: chữ trên bảng kết quả và thẻ màn đạt 4.5:1 (C4/C9)', () => {
  const css = readGameFile('style.css');
  const tok = {};
  let m, re = /--([\w-]+):\s*(#[0-9a-f]{6})/gi;
  while ((m = re.exec(css))) tok[m[1]] = m[2].toLowerCase();
  const colorOf = (sel) => {
    const r = css.match(new RegExp('\\n' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\{[^}]*color: ([^;]+);'));
    assert.ok(r, 'không tìm thấy màu chữ của ' + sel);
    const v = r[1].trim();
    const t = v.match(/^var\(--([\w-]+)\)$/);
    const hex = t ? tok[t[1]] : v.toLowerCase();
    assert.match(hex || '', /^#[0-9a-f]{6}$/, sel + ': không đọc được màu "' + v + '"');
    return hex;
  };
  // Ô thống kê nằm trên nền #f4f6fc, thẻ màn chuyển sắc xuống #f4f6fc ở chân thẻ
  const BG = '#f4f6fc';
  for (const sel of ['.stat.ok .v', '.stat.bad .v', '.stat.combo .v', '.stat.acc .v', '.stat.bomb .v',
    '.level-card .new', '.level-card .best']) {
    const r = ratio(colorOf(sel), BG);
    assert.ok(r >= 4.5, sel + ': chỉ đạt ' + r.toFixed(2) + ':1 trên ' + BG + ' (màu ' + colorOf(sel) + ')');
  }
});

/* Đọc một khai báo bất kỳ của một quy tắc CSS và quy về mã hex (giải cả var(--x)). */
function declOf(css, tok, sel, prop) {
  const q = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rule = css.match(new RegExp('\\n' + q + ' \\{([^}]*)\\}'));
  assert.ok(rule, 'không tìm thấy quy tắc ' + sel);
  // (^|;) để "color" không khớp nhầm vào "background-color"
  const m = rule[1].match(new RegExp('(?:^|;)\\s*' + prop + ':\\s*([^;]+)'));
  assert.ok(m, 'không tìm thấy ' + prop + ' của ' + sel);
  const v = m[1].trim();
  const t = v.match(/^var\(--([\w-]+)\)$/);
  const hex = (t ? tok[t[1]] : v).toLowerCase();
  assert.match(hex || '', /^#[0-9a-f]{6}$/, sel + ': không đọc được ' + prop + ' "' + v + '"');
  return hex;
}
const tokensOf = (css) => {
  const tok = {};
  let m, re = /--([\w-]+):\s*(#[0-9a-f]{6})/gi;
  while ((m = re.exec(css))) tok[m[1]] = m[2].toLowerCase();
  return tok;
};

test('style.css: chữ trên bảng vàng, chip thời gian, chân trang và dải gợi ý đạt 4.5:1', () => {
  const css = readGameFile('style.css');
  const tok = tokensOf(css);
  // [chọn tử, thuộc tính, nền/chữ đối diện, mô tả]
  const cases = [
    ['.leader h3', 'color', '#fffaf0', 'tiêu đề 🏆 Bảng vàng trên nền kem'],
    ['.leader li.me', 'color', '#fffaf0', 'dòng của chính bé trên bảng vàng'],
    ['.chip-group button.on', 'color', '#ffffff', 'chip thời gian đang chọn'],
    ['.footer-note a', 'color', '#ffffff', 'liên kết 3hoa.com ở chân trang'],
    ['.hint.bad', 'background', '#ffffff', 'dải giải thích khi chém sai (chữ trắng)']
  ];
  for (const [sel, prop, other, why] of cases) {
    const hex = declOf(css, tok, sel, prop);
    const r = ratio(hex, other);
    assert.ok(r >= 4.5, sel + ' (' + why + '): chỉ đạt ' + r.toFixed(2) + ':1 (' + hex + ' / ' + other + ')');
  }
  // Dải gợi ý đúng: chữ sẫm trên nền xanh lá
  const okBg = declOf(css, tok, '.hint.ok', 'background');
  const okFg = declOf(css, tok, '.hint.ok', 'color');
  assert.ok(ratio(okFg, okBg) >= 4.5, '.hint.ok chỉ đạt ' + ratio(okFg, okBg).toFixed(2) + ':1');
  // Dấu "?" trong thẻ phép tính là chữ rất to (34–58 px, đậm) nên ngưỡng WCAG là 3:1,
  // nhưng var(--orange) cũ chỉ đạt 2.84:1 nên vẫn phải đổi sang màu đậm hơn.
  const qc = declOf(css, tok, '.question-card .q', 'color');
  const rq = ratio(qc, '#ffffff');
  assert.ok(rq >= 3, '.question-card .q chỉ đạt ' + rq.toFixed(2) + ':1 trên thẻ trắng (cần ≥ 3 cho chữ to)');
});

test('style.css: mọi vùng chạm (nút, chip, thẻ) đều ≥ 44 px ở mọi khổ màn hình', () => {
  const css = readGameFile('style.css');
  const touch = /\.btn|button|\.toggle|\.tab\b|\.avatar|\.player-item|\.level-card/;
  let m, re = /([^{}]+)\{([^{}]*)\}/g, seen = 0;
  while ((m = re.exec(css))) {
    const sel = m[1].replace(/[\s\S]*\{/, '').trim();      // bỏ phần "@media (...) {" nếu có
    const mh = m[2].match(/min-height:\s*(\d+)px/);
    if (!mh || !touch.test(sel)) continue;
    seen++;
    assert.ok(Number(mh[1]) >= 44, sel + ': min-height ' + mh[1] + 'px < 44px (SPEC §4)');
  }
  assert.ok(seen >= 10, 'chỉ tìm thấy ' + seen + ' quy tắc vùng chạm — biểu thức lọc có vấn đề');
});

test('style.css: mưa giấy màu rơi phía sau bảng kết quả', () => {
  const css = readGameFile('style.css');
  const fx = css.match(/\n\.result-fx \{[\s\S]*?z-index: (\d+)/);
  assert.ok(fx, 'thiếu .result-fx');
  const panel = css.match(/\n#gameover \.panel \{[^}]*z-index: (\d+)/);
  assert.ok(panel, 'bảng kết quả phải có z-index riêng, nếu không giấy màu đè lên chữ');
  assert.ok(Number(panel[1]) > Number(fx[1]), 'bảng kết quả (' + panel[1] + ') phải xếp trên lớp giấy màu (' + fx[1] + ')');
});

test('game.js: câu dùng gợi ý chỉ 50 điểm và không tăng combo (C2)', () => {
  const js = readGameFile('js/game.js');
  const fn = js.match(/function onCorrect\(f\) \{[\s\S]*?\n  \}/);
  assert.ok(fn, 'không tìm thấy onCorrect');
  assert.match(fn[0], /const hinted = !!\(G\.wave && G\.wave\.hint\)/, 'phải biết câu đã dùng gợi ý');
  assert.match(fn[0], /hinted \? 50 :/, 'câu có gợi ý phải chỉ được 50 điểm');
  assert.match(fn[0], /if \(!hinted\) \{\s*\n\s*G\.streak\+\+/, 'câu có gợi ý không được tăng combo');
  assert.match(fn[0], /visibleAt/, 'thưởng nhanh phải tính từ lúc quả hiện ra');
});
