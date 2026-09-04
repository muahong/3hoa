'use strict';
/* Kiểm thử logic Vệ Binh Cửu Chương: sinh phép nhân/chia (mọi màn, mọi phép, ≥ 500 câu mỗi tổ hợp),
   lời đọc tiếng Việt, định nghĩa màn chơi, dựng lại câu ôn lại và kho lưu trữ theo từng bé. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame, makeStorage } = require('./lib/load.js');

const T = loadGame('cuu-chuong', ['js/tables.js']).Tables;
const N = 500;
const EQ = /^(\d{1,4}) ([×:]) (\d{1,4}) = (\d{1,4})$/;

/** Phép tính đã điền đáp án phải đúng về mặt số học. */
function arithmeticOk(full) {
  const m = String(full).match(EQ);
  if (!m) return false;
  const a = Number(m[1]), b = Number(m[3]), r = Number(m[4]);
  return m[2] === '×' ? a * b === r : b !== 0 && a === b * r;
}

function checkQuestion(q, l, op) {
  assert.ok(q && typeof q === 'object', 'gen() phải trả về câu hỏi');
  assert.ok(['mul', 'div', 'find', 'big'].indexOf(q.kind) >= 0, 'kind lạ: ' + q.kind);
  assert.match(q.full, EQ, 'full sai định dạng: ' + q.full);
  assert.ok(arithmeticOk(q.full), 'phép tính sai: ' + q.full);
  assert.equal(q.full.indexOf('?'), -1, 'full không được còn dấu ?: ' + q.full);
  assert.ok(q.text.indexOf('?') >= 0, 'text phải có dấu ?: ' + q.text);
  assert.equal(q.text.replace('?', String(q.answer)), q.full, 'text/answer không khớp full: ' + q.text);
  assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer <= 999, 'đáp án lạ: ' + q.answer);
  assert.ok(String(q.answer).length <= l.maxDigits, l.id + ': đáp án dài hơn maxDigits: ' + q.answer);
  assert.ok(q.label.length > 0 && q.label.length <= 12, 'nhãn thiên thạch quá dài: ' + q.label);
  assert.equal(q.speech, T.speakEq(q.text) + '?');
  assert.equal(q.speechFull, T.speakEq(q.full));
  assert.ok(q.speech.indexOf('×') < 0 && q.speech.indexOf(':') < 0, 'lời đọc còn ký hiệu toán: ' + q.speech);
  assert.ok(T.checkEq(q.full), 'checkEq phải chấp nhận: ' + q.full);
  if (q.kind === 'mul' || q.kind === 'div') {
    const rhs = Number(q.full.split(' = ')[1]);
    assert.equal(q.answer, rhs, 'đáp án phải là vế phải: ' + q.full);
  }
  if (op && op !== 'mix') assert.equal(q.kind, op, l.id + ' phải sinh phép ' + op);
  if (l.table) assert.equal(q.table, l.table, l.id + ': sai bảng ' + q.table);
  assert.ok(l.kinds.indexOf(q.kind) >= 0, l.id + ': kind ngoài danh sách khai báo');
  assert.ok(l.tables.indexOf(q.table) >= 0, l.id + ': bảng ngoài danh sách khai báo (' + q.table + ')');
}

test('mỗi bảng nhân/chia sinh câu hỏi hợp lệ (8 bảng × 3 phép × 500 câu)', () => {
  T.TABLE_LEVELS.forEach((l) => {
    ['mul', 'div', 'mix'].forEach((op) => {
      for (let i = 0; i < N; i++) checkQuestion(l.gen(op), l, op);
    });
  });
});

test('các màn thử thách sinh câu hỏi hợp lệ (7 màn × 500 câu)', () => {
  T.CHALLENGE_LEVELS.forEach((l) => {
    for (let i = 0; i < N; i++) checkQuestion(l.gen('mix'), l, null);
  });
});

test('c5 luôn là tìm thừa số, c6 luôn là nhân chia số lớn, c7 trộn nhiều kiểu', () => {
  const c5 = T.levelById('c5'), c6 = T.levelById('c6'), c7 = T.levelById('c7');
  for (let i = 0; i < N; i++) assert.equal(c5.gen('mix').kind, 'find');
  for (let i = 0; i < N; i++) {
    const q = c6.gen('mix');
    assert.equal(q.kind, 'big');
    assert.equal(q.table, 0);
    assert.ok(q.answer <= 999 && q.answer >= 1);
  }
  const kinds = {};
  for (let i = 0; i < N; i++) kinds[c7.gen('mix').kind] = true;
  assert.ok(Object.keys(kinds).length >= 2, 'c7 phải trộn ít nhất 2 kiểu câu');
});

test('không hỏi lại ngay câu vừa hỏi', () => {
  const t7 = T.levelById('t7');
  let prev = null;
  for (let i = 0; i < 200; i++) {
    const q = t7.gen('mul');
    assert.notEqual(q.full, prev, 'lặp lại câu vừa hỏi: ' + q.full);
    prev = q.full;
  }
});

test('lời đọc tiếng Việt tự nhiên', () => {
  assert.equal(T.speakEq('7 × 8 = ?'), '7 nhân 8 bằng mấy');
  assert.equal(T.speakEq('42 : ? = 6'), '42 chia mấy bằng 6');
  assert.equal(T.speakEq('56 : 7 = 8'), '56 chia 7 bằng 8');
});

test('bảng cửu chương để xem có đủ 10 dòng, nhân và chia khớp nhau', () => {
  T.ALL_TABLES.forEach((n) => {
    const rows = T.tableRows(n);
    assert.equal(rows.length, 10);
    rows.forEach((r, i) => {
      assert.equal(r.m, i + 1);
      assert.equal(r.mul, n + ' × ' + (i + 1) + ' = ' + n * (i + 1));
      assert.equal(r.div, n * (i + 1) + ' : ' + n + ' = ' + (i + 1));
      assert.ok(arithmeticOk(r.mul) && arithmeticOk(r.div));
    });
  });
  assert.equal(T.tableRows(7)[2].mul, '7 × 3 = 21');
  assert.equal(T.tableRows(7)[2].div, '21 : 7 = 3');
});

test('levelById', () => {
  assert.equal(T.levelById('t9').table, 9);
  assert.equal(T.levelById('c7').id, 'c7');
  assert.equal(T.levelById('zz'), null);
  assert.equal(T.levelById(''), null);
});

test('định nghĩa 15 màn chơi hợp lệ', () => {
  const all = T.TABLE_LEVELS.concat(T.CHALLENGE_LEVELS);
  assert.equal(all.length, 15);
  const ids = {};
  all.forEach((l) => {
    assert.equal(ids[l.id], undefined, 'id trùng: ' + l.id);
    ids[l.id] = true;
    assert.match(l.id, /^(t[2-9]|c[1-7])$/);
    assert.ok(l.title && l.desc && l.icon, l.id + ' thiếu tiêu đề/mô tả/biểu tượng');
    assert.ok([2, 3].indexOf(l.maxDigits) >= 0, l.id + ': maxDigits lạ');
    assert.ok(l.speed >= 0.8 && l.speed <= 1.2, l.id + ': speed ngoài khoảng');
    assert.ok(typeof l.fall === 'number' && l.fall >= 1 && l.fall <= 2, l.id + ': fall phải ≥ 1 (câu khó rơi chậm hơn)');
    assert.ok([0, 2, 3].indexOf(l.grade) >= 0, l.id + ': grade lạ');
    assert.ok(Array.isArray(l.tables) && l.tables.length > 0, l.id + ': thiếu tables');
    assert.ok(Array.isArray(l.kinds) && l.kinds.length > 0, l.id + ': thiếu kinds');
    l.kinds.forEach((k) => assert.ok(['mul', 'div', 'find', 'big'].indexOf(k) >= 0, l.id + ': kind lạ ' + k));
    assert.equal(typeof l.gen, 'function');
  });
  T.TABLE_LEVELS.forEach((l) => {
    assert.equal(l.grade, l.table === 2 || l.table === 5 ? 2 : 3, 'bảng ' + l.table + ' sai lớp');
  });
});

test('bảng lớp 2 không đảo thừa số, bảng lớp 3 thì có', () => {
  const M = 1000;
  ['t2', 't5', 'c1'].forEach((id) => {
    const l = T.levelById(id);
    for (let i = 0; i < M; i++) {
      const q = l.gen('mul');
      if (q.kind !== 'mul') continue;
      assert.equal(q.label.split(' ')[0], String(q.table),
        id + ': câu nhân của lớp 2 phải bắt đầu bằng số của bảng (' + q.label + ')');
    }
  });
  const t7 = T.levelById('t7');
  let swapped = 0, n = 0;
  for (let i = 0; i < M; i++) {
    const q = t7.gen('mul');
    if (q.kind !== 'mul') continue;
    n++;
    if (q.label.split(' ')[0] !== '7') swapped++;
  }
  const ratio = swapped / n;
  assert.ok(ratio >= 0.1 && ratio <= 0.4, 'tỉ lệ đảo thừa số của bảng 7 phải trong [0.1, 0.4], đang ' + ratio);
});

test('câu 3 chữ số được cho rơi chậm hơn', () => {
  assert.ok(T.levelById('c6').fall >= 1.4, 'màn nhân chia số lớn phải rơi chậm hơn hẳn');
  assert.ok(T.levelById('c7').fall > 1 && T.levelById('c7').fall < T.levelById('c6').fall);
  assert.ok(T.levelById('c5').fall > 1, 'màn tìm thừa số phải rơi chậm hơn một chút');
  T.TABLE_LEVELS.forEach((l) => assert.equal(l.fall, 1, l.id + ': màn luyện bảng giữ tốc độ chuẩn'));
});

test('fromInfo dựng lại đúng câu đã lưu và từ chối dữ liệu hỏng', () => {
  const all = T.TABLE_LEVELS.concat(T.CHALLENGE_LEVELS);
  for (let i = 0; i < 300; i++) {
    const l = all[i % all.length];
    const q = l.gen('mix');
    const back = T.fromInfo({ kind: q.kind, label: q.label, text: q.text, answer: q.answer, table: q.table });
    assert.ok(back, 'không dựng lại được: ' + q.text);
    assert.equal(back.full, q.full);
    assert.equal(back.speech, q.speech);
    assert.equal(back.speechFull, q.speechFull);
  }
  const good = { kind: 'mul', label: '7 × 8', text: '7 × 8 = ?', answer: 56, table: 7 };
  assert.ok(T.fromInfo(good));
  assert.equal(T.fromInfo(null), null);
  assert.equal(T.fromInfo('7 × 8'), null);
  assert.equal(T.fromInfo(Object.assign({}, good, { answer: 55 })), null, 'đáp án sai phải bị loại');
  assert.equal(T.fromInfo(Object.assign({}, good, { kind: 'evil' })), null);
  assert.equal(T.fromInfo(Object.assign({}, good, { text: '7 × 8 = 56' })), null, 'thiếu dấu ? phải bị loại');
  assert.equal(T.fromInfo(Object.assign({}, good, { table: 99 })), null);
  assert.equal(T.fromInfo(Object.assign({}, good, { label: new Array(40).join('x') })), null);
  assert.equal(T.fromInfo({ kind: 'div', label: '0 : 0', text: '0 : 0 = ?', answer: 0, table: 0 }), null, 'không chia cho 0');
});

/* ---------- Gợi ý cách nghĩ và lời giải thích (dùng cho nút 💡 và mọi đường bé làm sai) ---------- */

/** Mọi phép tính xuất hiện trong một câu văn đều phải đúng về số học. */
function everyEqInTextOk(txt) {
  const found = String(txt).match(/\d{1,4} [×:] \d{1,4} = \d{1,4}/g) || [];
  return found.every(arithmeticOk);
}

/** Câu đọc cho máy nói: không được có dấu "?" và dấu ":" chỉ được dùng làm dấu chia giữa hai số. */
function speakSafe(txt) {
  if (String(txt).indexOf('?') >= 0) return false;
  return String(txt).replace(/\d+ : \d+/g, '#').indexOf(':') < 0;
}

test('gợi ý và lời giải thích luôn có, đọc được và không sai phép tính', () => {
  const levels = T.TABLE_LEVELS.concat(T.CHALLENGE_LEVELS);
  let withEq = 0;
  for (const l of levels) {
    for (let i = 0; i < 120; i++) {
      const q = l.gen('mix');
      const hint = T.hintFor(q), exp = T.explainFor(q);
      assert.ok(hint.length > 8 && hint.length <= 140, l.id + ': gợi ý lạ – ' + hint);
      assert.ok(exp.length > 5 && exp.length <= 160, l.id + ': lời giải thích lạ – ' + exp);
      assert.ok(speakSafe(hint), l.id + ': gợi ý có ký tự máy đọc sai – ' + hint);
      assert.ok(speakSafe(exp), l.id + ': lời giải thích có ký tự máy đọc sai – ' + exp);
      assert.ok(everyEqInTextOk(hint), l.id + ': gợi ý chứa phép tính sai – ' + hint);
      assert.ok(everyEqInTextOk(exp), l.id + ': lời giải thích chứa phép tính sai – ' + exp);
      assert.ok(exp.indexOf(String(q.answer)) >= 0, l.id + ': lời giải thích phải có đáp án – ' + exp);
      if (/\d/.test(hint)) withEq++;
      // gợi ý KHÔNG được nói thẳng "= đáp án"
      assert.ok(hint.indexOf('= ' + q.answer) < 0, l.id + ': gợi ý lộ đáp án – ' + hint);
    }
  }
  assert.ok(withEq > 0, 'phải có gợi ý dùng số cụ thể');
});

test('gợi ý bám sát cách dạy ở tiểu học cho từng kiểu câu', () => {
  assert.equal(T.hintFor(T.mulQ(7, 8, false)), 'Con đếm thêm một lần nữa. Lấy 7 × 7 rồi cộng thêm 7.');
  assert.equal(T.explainFor(T.mulQ(7, 8, false)), '7 × 8 = 56 vì 7 × 7 = 49, cộng thêm 7 nữa.');
  assert.equal(T.hintFor(T.mulQ(5, 1, false)), 'Nhân với 1 thì được chính số đó.');
  assert.equal(T.hintFor(T.mulQ(3, 10, false)), 'Nhân với 10 thì viết thêm chữ số 0 vào sau.');
  assert.equal(T.explainFor(T.mulQ(3, 10, false)), '3 × 10 = 30 vì nhân với 10 thì viết thêm chữ số 0 vào sau.');
  assert.equal(T.hintFor(T.divQ(6, 7)), 'Con nghĩ ngược lại, 6 nhân mấy thì bằng 42.');
  assert.equal(T.explainFor(T.divQ(6, 7)), '42 : 6 = 7 vì 6 × 7 = 42.');
  // bốn dạng "tìm thừa số"
  const find = (text, answer, table) => T.fromInfo({ kind: 'find', label: text, text: text, answer: answer, table: table });
  assert.equal(T.hintFor(find('? × 6 = 42', 7, 6)), 'Muốn tìm thừa số chưa biết, con lấy tích chia cho thừa số kia, tức là 42 : 6.');
  assert.equal(T.explainFor(find('? × 6 = 42', 7, 6)), 'Lấy 42 : 6 = 7. Vậy 7 × 6 = 42.');
  assert.equal(T.explainFor(find('6 × ? = 42', 7, 6)), 'Lấy 42 : 6 = 7. Vậy 6 × 7 = 42.');
  assert.equal(T.hintFor(find('? : 6 = 7', 42, 6)), 'Muốn tìm số bị chia, con lấy thương nhân với số chia, tức là 7 × 6.');
  assert.equal(T.explainFor(find('? : 6 = 7', 42, 6)), 'Lấy 7 × 6 = 42. Vậy 42 : 6 = 7.');
  assert.equal(T.hintFor(find('42 : ? = 7', 6, 6)), 'Muốn tìm số chia, con lấy số bị chia chia cho thương, tức là 42 : 7.');
  assert.equal(T.explainFor(find('42 : ? = 7', 6, 6)), 'Lấy 42 : 7 = 6. Vậy 42 : 6 = 7.');
  // nhân chia số lớn: nhắc cách đặt tính
  const big = T.fromInfo({ kind: 'big', label: '23 × 4', text: '23 × 4 = ?', answer: 92, table: 0 });
  assert.equal(T.hintFor(big), 'Con đặt tính rồi tính, nhân 4 với từng chữ số của 23 từ phải sang trái.');
  assert.ok(T.explainFor(big).indexOf('23 × 4 = 92.') === 0, T.explainFor(big));
  const bigDiv = T.fromInfo({ kind: 'big', label: '84 : 4', text: '84 : 4 = ?', answer: 21, table: 0 });
  assert.equal(T.hintFor(bigDiv), 'Con đặt tính rồi tính, chia lần lượt từng chữ số của 84 cho 4 từ trái sang phải.');
  // dữ liệu hỏng thì trả về chuỗi rỗng, không ném lỗi
  assert.equal(T.hintFor(null), '');
  assert.equal(T.explainFor(undefined), '');
  assert.equal(T.hintFor({ kind: 'mul', full: 'hỏng' }), '');
});

test('checkEq chỉ chấp nhận phép tính đúng', () => {
  assert.ok(T.checkEq('7 × 8 = 56'));
  assert.ok(T.checkEq('56 : 7 = 8'));
  assert.ok(!T.checkEq('7 × 8 = 57'));
  assert.ok(!T.checkEq('56 : 0 = 8'));
  assert.ok(!T.checkEq('7 x 8 = 56'));
  assert.ok(!T.checkEq('<img src=x>'));
});

/* ================= Kho lưu trữ (Store) ================= */
function boot(seed) {
  const st = makeStorage();
  if (seed != null) st.setItem('cuu-chuong-v1', seed);
  const w = loadGame('cuu-chuong', ['js/audio.js', 'js/tables.js', '../js/profile.js', 'js/game.js'], { localStorage: st });
  return { w: w, X: w.__CuuChuong, st: st };
}
const infoFor = (a, b) => ({ kind: 'mul', label: a + ' × ' + b, text: a + ' × ' + b + ' = ?', answer: a * b, table: a });

test('Store: di trú dữ liệu cũ sang bé p1, giữ thiết lập của máy', () => {
  const legacy = JSON.stringify({
    sound: true, music: false, voice: true, duration: 120, op: 'div', names: ['Mai'],
    records: { 't7:mix:90': { best: 2500, stars: 2, top: [{ name: 'Mai', score: 2500, date: 1 }] } }
  });
  const { X, st } = boot(legacy);
  assert.equal(X.Store.data.players.p1.records['t7:mix:90'].best, 2500);
  assert.equal(X.Store.data.players.p1.records['t7:mix:90'].stars, 2);
  assert.equal(X.Store.data.players.p1.records['t7:mix:90'].top[0].name, 'Mai');
  assert.equal(X.Store.data.records, undefined, 'phải xóa trường cũ ở mức trên cùng');
  assert.equal(X.Store.data.names, undefined);
  assert.equal(X.Store.data.music, false);
  assert.equal(X.Store.data.duration, 120);
  assert.equal(X.Store.data.op, 'div');
  assert.equal(X.Store.data.fx, 'full');
  assert.equal(X.Store.p().stats.plays, 0);
  const saved = JSON.parse(st.getItem('cuu-chuong-v1'));
  assert.ok(saved.players && saved.players.p1, 'phải lưu lại hình dạng mới');
  assert.equal(saved.players.p1.records['t7:mix:90'].best, 2500);
});

test('Store: players rỗng mà còn kỷ lục cũ thì vẫn phải di trú (không mất kỷ lục)', () => {
  const seed = '{"players":{},"records":{"t7:mix:90":{"best":2500,"stars":2,"top":[]}}}';
  const { X, st } = boot(seed);
  assert.equal(X.Store.data.players.p1.records['t7:mix:90'].best, 2500, 'kỷ lục cũ bị mất khi players rỗng');
  assert.equal(X.Store.data.records, undefined);
  assert.equal(JSON.parse(st.getItem('cuu-chuong-v1')).players.p1.records['t7:mix:90'].best, 2500);
  // players chỉ chứa id không hợp lệ cũng vậy
  const bad = boot('{"players":{"../evil":{"records":{}}},"records":{"t2:mix:60":{"best":700,"stars":1,"top":[]}}}');
  assert.equal(bad.X.Store.data.players.p1.records['t2:mix:60'].best, 700);
  assert.equal(bad.X.Store.data.players['../evil'], undefined);
});

test('Store: dữ liệu rác không làm hỏng game và không lây nhiễm prototype', () => {
  const seeds = [
    '{', '[]', 'null', '"x"', '{"records":"oops"}', '{"records":[1,2]}', '{"records":{"bad key":{}}}',
    '{"__proto__":{"pwned":1}}', '{"constructor":{"prototype":{"pwned":1}}}',
    '{"players":"nope"}', '{"players":{"../evil":{"records":{}}}}',
    '{"players":{"p1":{"records":{"t2:mix:90":{"top":[null,{"name":42,"score":"x"}],"best":"<b>9</b>","stars":99}}}}}',
    '{"names":["<img src=x onerror=1>"],"records":{"t7:mix:90":{"best":-5,"top":[null]}}}',
    '{"duration":9999,"op":"evil","fx":"evil","sound":"maybe"}'
  ];
  seeds.forEach((seed) => {
    const { X } = boot(seed);
    const b = X.Store.p();
    assert.ok(!('pwned' in X.Store.data), seed + ': prototype của Store.data bị đổi');
    assert.equal(X.Store.data.pwned, undefined, seed + ': dữ liệu lạ lọt vào Store');
    assert.equal(({}).pwned, undefined, seed + ': prototype toàn cục bị nhiễm');
    assert.equal(typeof b.records, 'object');
    assert.ok(!Array.isArray(b.records));
    assert.ok([60, 90, 120].indexOf(X.Store.data.duration) >= 0, seed + ': duration không hợp lệ');
    assert.ok(['mul', 'div', 'mix'].indexOf(X.Store.data.op) >= 0, seed + ': op không hợp lệ');
    assert.ok(X.Store.data.fx === 'full' || X.Store.data.fx === 'lite');
    Object.keys(b.records).forEach((k) => {
      assert.match(k, /^(t[2-9]|c[1-7]):(mul|div|mix|x):(60|90|120)$/, seed + ': khóa kỷ lục lạ ' + k);
      const r = b.records[k];
      assert.ok(Number.isInteger(r.best) && r.best >= 0, seed + ': best lạ');
      assert.ok(Number.isInteger(r.stars) && r.stars >= 0 && r.stars <= 3, seed + ': stars lạ');
      assert.ok(Array.isArray(r.top) && r.top.length <= 5);
      r.top.forEach((e) => {
        assert.equal(typeof e.name, 'string');
        assert.ok(Array.from(e.name).length <= 16);
        assert.ok(Number.isInteger(e.score) && e.score >= 0);
      });
    });
    assert.equal(Object.keys(X.Store.data.players).indexOf('../evil'), -1, 'id người chơi lạ phải bị bỏ');
    assert.ok(Number.isInteger(b.stats.plays) && b.stats.plays >= 0);
  });
});

test('Store: câu cần ôn phải dựng lại được, tối đa 60 câu, đúng 2 lần thì xóa', () => {
  const { X } = boot(null);
  // dữ liệu rác trong missed bị loại
  X.Store.noteMissed('7 × 8 = ?', { kind: 'mul', label: '7 × 8', text: '7 × 8 = ?', answer: 55, table: 7 });
  assert.equal(Object.keys(X.Store.p().missed).length, 0, 'info sai phép tính phải bị bỏ');
  X.Store.noteMissed('7 × 8 = ?', infoFor(7, 8));
  X.Store.noteMissed('7 × 8 = ?', infoFor(7, 8));
  assert.equal(X.Store.p().missed['7 × 8 = ?'].n, 2);
  X.Store.noteOk('7 × 8 = ?');
  assert.equal(X.Store.p().missed['7 × 8 = ?'].ok, 1);
  X.Store.noteOk('7 × 8 = ?');
  assert.equal(X.Store.p().missed['7 × 8 = ?'], undefined, 'đúng 2 lần thì xóa khỏi danh sách ôn');

  let n = 0;
  for (let a = 2; a <= 9 && n < 61; a++) {
    for (let b = 1; b <= 10 && n < 61; b++) {
      const info = infoFor(a, b);
      X.Store.noteMissed(info.text, info);
      n++;
    }
  }
  assert.equal(n, 61);
  assert.ok(Object.keys(X.Store.p().missed).length <= 60, 'phải giới hạn 60 câu ôn');

  const pool = X.Store.reviewPool();
  assert.ok(pool.length > 0);
  for (let i = 1; i < pool.length; i++) assert.ok(pool[i - 1].n >= pool[i].n, 'phải sắp xếp theo số lần sai');
  const only7 = X.Store.reviewPool((info) => info.table === 7);
  assert.ok(only7.length > 0 && only7.every((it) => it.info.table === 7));
});

test('Store: thống kê, kỷ lục chung mọi chế độ và xóa tiến trình', () => {
  const { X } = boot(null);
  const lvl = T.levelById('t7');
  X.Store.setRecord(lvl, 'mul', 60, { best: 900, stars: 1, top: [] });
  X.Store.setRecord(lvl, 'mix', 90, { best: 2500, stars: 2, top: [{ name: 'Bé', score: 2500, date: 1 }] });
  assert.equal(X.Store.bestFor('t7').best, 2500);
  assert.equal(X.Store.bestFor('t7').stars, 2);
  assert.equal(X.Store.getRecord(lvl, 'mul', 60).best, 900);
  assert.equal(X.Store.getRecord(lvl, 'div', 120).best, 0, 'chế độ chưa chơi phải là 0');
  assert.equal(X.Store.sumStars(), 2);
  assert.equal(X.Store.sumStars('p1'), 2, 'gọi theo id phải ra cùng kết quả');
  // Hồ sơ dùng chung cho cả 6 game: bé tạo ở game khác chưa có tiến trình ở đây
  assert.equal(X.Store.sumStars('p9'), 0, 'bé chưa từng chơi game này không được mượn sao của bé đang chơi');
  assert.equal(X.Store.data.players.p9, undefined, 'chỉ đọc số sao thì không được tạo bucket rỗng');

  X.Store.addStats({ correct: 5, wrong: 2, seconds: 90 }, { t7: { c: 5, w: 2 } });
  X.Store.addStats({ correct: 3, wrong: 0, seconds: 60 }, { t7: { c: 3, w: 0 }, big: { c: 1, w: 1 } });
  const s = X.Store.p().stats;
  assert.equal(s.plays, 2);
  assert.equal(s.correct, 8);
  assert.equal(s.wrong, 2);
  assert.equal(s.seconds, 150);
  assert.equal(s.byTopic.t7.c, 8);
  assert.equal(s.byTopic.t7.w, 2);
  assert.equal(s.byTopic.big.c, 1);
  assert.equal(s.byTopic.big.w, 1);

  X.Store.resetActive();
  assert.equal(X.Store.p().stats.plays, 0);
  assert.equal(Object.keys(X.Store.p().records).length, 0);
  assert.equal(Object.keys(X.Store.p().missed).length, 0);
});

test('Store: mỗi bé một bucket riêng', () => {
  const { w, X } = boot(null);
  const lvl = T.levelById('t7');
  X.Store.setRecord(lvl, 'mix', 90, { best: 1200, stars: 1, top: [] });
  const p2 = w.Players.add('Lan', '🦊');
  assert.ok(p2 && p2.id !== 'p1');
  assert.equal(X.Store.getRecord(lvl, 'mix', 90).best, 0, 'bé mới phải bắt đầu từ 0');
  X.Store.setRecord(lvl, 'mix', 90, { best: 300, stars: 0, top: [] });
  w.Players.setActive('p1');
  assert.equal(X.Store.getRecord(lvl, 'mix', 90).best, 1200, 'tiến trình của bé cũ không được đổi');
});

/* ================= Thống kê theo màn và báo cáo cho phụ huynh ================= */
/** Cho phép đọc lại HTML mà renderReport() ghi ra (document giả tạo phần tử mới mỗi lần gọi). */
function withReportDom(w) {
  const cache = {};
  w.document.getElementById = function (id) {
    if (!cache[id]) cache[id] = w.document.createElement('div');
    return cache[id];
  };
  return cache;
}
/** Các dòng của bảng "kết quả từng màn". */
function reportRows(cache) {
  return String(cache['report-levels'].innerHTML).split('<div class="report-row">').slice(1);
}
function rowOf(rows, head) {
  return rows.find(function (r) { return r.indexOf(head + '</span>') >= 0; }) || '';
}

test('Store: thống kê giữ riêng khóa của màn thử thách (c1…c7)', () => {
  const { X, st } = boot(null);
  X.Store.addStats({ correct: 4, wrong: 1, seconds: 30 }, { t7: { c: 2, w: 1 }, c5: { c: 4, w: 1 }, 'xx!': { c: 9, w: 9 } });
  const bt = X.Store.p().stats.byTopic;
  assert.equal(bt.c5.c, 4, 'phải nhận khóa thống kê theo màn thử thách');
  assert.equal(bt.c5.w, 1);
  assert.equal(bt['xx!'], undefined, 'khóa lạ phải bị bỏ');
  const again = boot(st.getItem('cuu-chuong-v1'));
  assert.equal(again.X.Store.p().stats.byTopic.c5.c, 4, 'nạp lại không được xóa thống kê màn thử thách');
  assert.equal(again.X.Store.p().stats.byTopic.t7.c, 2);
});

test('Báo cáo: màn thử thách chưa chơi ghi "chưa chơi", không mượn số liệu của bảng', () => {
  const { w, X } = boot(null);
  const els = withReportDom(w);
  // Bé chỉ mới luyện Bảng 7 (18 đúng / 2 sai)
  X.Store.addStats({ correct: 18, wrong: 2, seconds: 120 }, { t7: { c: 18, w: 2 } });
  X.renderReport();
  let rows = reportRows(els);
  assert.equal(rows.length, 15, 'báo cáo phải có 15 dòng');
  const t7 = rowOf(rows, '🌈 Bảng 7');
  assert.ok(t7.indexOf('90% (20 câu)') >= 0, 'dòng Bảng 7 phải có tỉ lệ đúng: ' + t7);
  assert.ok(t7.indexOf('Đã thuộc') >= 0, 'đúng 90% trên 20 câu phải là "Đã thuộc"');
  ['🌌 Bảng 7, 8, 9', '🪐 Cả bảng cửu chương', '🔍 Tìm thừa số', '🦸 Siêu Vệ Binh', '🚀 Bảng 2 và 5'].forEach((head) => {
    const r = rowOf(rows, head);
    assert.ok(r, 'thiếu dòng ' + head);
    assert.ok(r.indexOf('chưa chơi') >= 0, head + ': màn chưa chơi không được mượn số liệu của bảng khác: ' + r);
    assert.ok(r.indexOf('%') < 0, head + ': không được hiện tỉ lệ khi chưa chơi');
  });
  assert.ok(rowOf(rows, '⭐ Bảng 5').indexOf('chưa chơi') >= 0, 'bảng chưa chơi cũng phải ghi "chưa chơi"');
  // Bảng đã thuộc thì không còn bị gợi ý "nên luyện thêm"
  assert.ok(String(els['report-review'].innerHTML).indexOf('Bảng 7') < 0, 'bảng đã thuộc không được gợi ý luyện thêm');

  // Chơi thêm một ván "Tìm thừa số": dòng đó mới có số liệu của riêng nó
  X.Store.addStats({ correct: 3, wrong: 1, seconds: 40 }, { t6: { c: 3, w: 1 }, c5: { c: 3, w: 1 } });
  X.renderReport();
  rows = reportRows(els);
  assert.ok(rowOf(rows, '🔍 Tìm thừa số').indexOf('75% (4 câu)') >= 0, 'màn đã chơi phải hiện số liệu của chính nó');
  assert.ok(rowOf(rows, '🪐 Cả bảng cửu chương').indexOf('chưa chơi') >= 0, 'màn khác vẫn phải là "chưa chơi"');
  assert.ok(rowOf(rows, '🐝 Bảng 6').indexOf('75% (4 câu)') >= 0, 'bảng 6 được cộng dồn từ mọi màn có bảng 6');
});
