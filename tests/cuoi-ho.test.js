'use strict';
/* Kiểm thử logic thuần của Cưỡi Hổ Vượt Lửa: đọc giờ tiếng Việt, bộ sinh câu hỏi từng màn,
   định nghĩa màn/bài học/hỏi đáp, vẽ đồng hồ SVG, và di trú/đóng gói dữ liệu lưu trữ (Store trong game.js). */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame, makeStorage } = require('./lib/load.js');

const L = loadGame('cuoi-ho', ['js/lessons.js']).Lessons;
const N = 500;
const IDS = L.LEVELS.map((l) => l.id);
const hasKey = (q) => q.options.map(L.optKey);
// So sánh theo JSON: đối tượng đến từ một vm context khác nên deepStrictEqual sẽ báo khác prototype
const same = (a, b, msg) => assert.equal(JSON.stringify(a), JSON.stringify(b), msg);

/* ---------- 1. Đọc giờ ---------- */
test('cuoi-ho: reading helpers', () => {
  assert.equal(L.plain(3, 0), '3 giờ');
  assert.equal(L.plain(3, 25), '3 giờ 25 phút');
  assert.equal(L.ruoi(7), '7 giờ rưỡi');
  assert.equal(L.kem(8, 45), '9 giờ kém 15 phút');
  assert.equal(L.kem(12, 50), '1 giờ kém 10 phút');
  assert.equal(L.nextH(12), 1);
  assert.equal(L.prevH(1), 12);
  assert.equal(L.digital(7, 5), '07:05');
  for (let H = 1; H <= 10; H++) assert.equal(L.buoi(H), 'sáng', 'buổi ' + H);
  assert.equal(L.buoi(11), 'trưa'); assert.equal(L.buoi(12), 'trưa');
  for (let H = 13; H <= 18; H++) assert.equal(L.buoi(H), 'chiều', 'buổi ' + H);
  for (let H = 19; H <= 21; H++) assert.equal(L.buoi(H), 'tối', 'buổi ' + H);
  assert.equal(L.buoi(22), 'đêm'); assert.equal(L.buoi(23), 'đêm'); assert.equal(L.buoi(0), 'đêm');
  assert.equal(L.h24ToText(15, 0), '3 giờ chiều');
  assert.equal(L.h24ToText(23, 0), '11 giờ đêm');
  assert.equal(L.h24ToText(0, 0), '12 giờ đêm');
  assert.equal(L.h24ToText(19, 30), '7 giờ 30 phút tối');
  for (let h = 1; h <= 12; h++) {
    for (let m = 0; m < 60; m++) {
      assert.match(L.plain(h, m), /^\d{1,2} giờ( \d{1,2} phút)?$/);
      if (m > 30) assert.ok(L.kem(h, m).startsWith(L.nextH(h) + ' giờ kém ' + (60 - m)), L.kem(h, m));
    }
  }
});

/* ---------- 2. Bất biến của bộ sinh câu hỏi ---------- */
function checkQ(q, lvId, where) {
  assert.ok(q && q.options, where + ' câu hỏi rỗng');
  assert.equal(q.options.length, 3, where + ' phải có 3 lựa chọn');
  const keys = hasKey(q);
  assert.equal(new Set(keys).size, 3, where + ' lựa chọn trùng: ' + keys.join(' | '));
  assert.ok(q.answer >= 0 && q.answer < 3, where + ' answer ngoài phạm vi');
  assert.ok(q.answerText && q.answerText.trim(), where + ' answerText rỗng');
  assert.ok(q.explain && q.explain.trim(), where + ' explain rỗng');
  assert.ok(q.speech && q.speech.trim(), where + ' speech rỗng');
  assert.equal(q.answerText, L.optLabel(q.options[q.answer]), where + ' answerText ≠ nhãn đáp án');
  assert.equal(keys.filter((k) => k === L.optKey(q.options[q.answer])).length, 1, where + ' đúng một đáp án');
  assert.ok(IDS.includes(q.topic), where + ' topic lạ: ' + q.topic);
  assert.ok(q.info && IDS.includes(q.info.lv), where + ' info.lv lạ');
  assert.ok(q.key.indexOf('|') > 0, where + ' key');
  const prompt = L.strip(q.prompt);
  // Đáp án chữ của câu "Đồng hồ chỉ mấy giờ?" phải khớp với đồng hồ được vẽ
  if (q.clock && !q.options.some((o) => o.clock) && (prompt === 'Đồng hồ chỉ mấy giờ?' || prompt === 'Đọc theo cách “giờ kém”:')) {
    const h = q.clock.h, m = q.clock.m;
    const ok = [L.plain(h, m), m === 30 ? L.ruoi(h) : null, m > 30 ? L.kem(h, m) : null].filter(Boolean);
    assert.ok(ok.includes(q.answerText), where + ' đáp án "' + q.answerText + '" không khớp đồng hồ ' + h + ':' + m);
  }
  // Câu chọn đồng hồ: đồng hồ đúng phải là giờ được hỏi trong đề
  if (q.options.some((o) => o.clock)) {
    assert.ok(q.options.every((o) => o.clock), where + ' trộn đồng hồ và chữ');
    const c = q.options[q.answer].clock;
    const cands = [L.plain(c.h, c.m), c.m === 30 ? L.ruoi(c.h) : null, c.m > 30 ? L.kem(c.h, c.m) : null].filter(Boolean);
    assert.ok(cands.some((s) => prompt.indexOf(s) >= 0), where + ' đề "' + prompt + '" không nêu đồng hồ đúng ' + c.h + ':' + c.m);
  }
  // Đồng hồ điện tử: đáp án bắt đầu bằng giờ đọc 12h của nó
  if (q.digital && prompt === 'Đồng hồ điện tử chỉ mấy giờ?') {
    const H = Number(q.digital.slice(0, 2)), m = Number(q.digital.slice(3, 5));
    const h = H === 0 ? 12 : H > 12 ? H - 12 : H;
    assert.ok(q.answerText.startsWith(L.plain(h, m)), where + ' điện tử ' + q.digital + ' → ' + q.answerText);
    if (lvId === 'l7') assert.ok(q.answerText.endsWith(' ' + L.buoi(H)), where + ' buổi của ' + q.digital + ': ' + q.answerText);
  }
  // Sinh lại từ info phải cho đúng câu (cùng key)
  const r = L.regen(q.info);
  assert.ok(r, where + ' regen null');
  assert.equal(r.key, q.key, where + ' regen đổi câu: ' + r.key + ' ≠ ' + q.key);
  assert.equal(r.topic, q.topic, where + ' regen đổi topic');
}

for (const lv of L.LEVELS) {
  test('cuoi-ho: generator invariants ' + lv.id + ' (' + lv.title + ')', () => {
    for (let i = 0; i < N; i++) checkQ(L.fresh(lv.gen), lv.id, lv.id + '/fresh#' + i);
    for (let i = 0; i < N; i++) {
      const q = lv.gen();
      checkQ(q, lv.id, lv.id + '/gen#' + i);
      if (lv.id !== 'l9') assert.equal(q.topic, lv.id, lv.id + ' topic phải là chính màn');
    }
  });
}

/* ---------- 3. Lỗi nội dung đã sửa ---------- */
test('cuoi-ho: L6 never says "số 0" / "0 phút"; clock-option pairs differ by ≥ 5 minutes', () => {
  const gen = L.levelById('l6').gen;
  for (let i = 0; i < 3000; i++) {
    const q = gen();
    assert.doesNotMatch(L.strip(q.prompt), /số 0\b/, q.prompt);
    assert.doesNotMatch(q.explain, /số 0\b/, q.explain);
    for (const o of q.options) {
      if (o.text) assert.notEqual(o.text, '0 phút');
      if (o.text) assert.doesNotMatch(o.text, /^\d+ giờ 0 phút$/, o.text);
    }
    if (q.options.some((o) => o.clock)) {
      const ms = q.options.map((o) => o.clock.h * 60 + o.clock.m);
      for (let a = 0; a < ms.length; a++) for (let b = a + 1; b < ms.length; b++) assert.ok(Math.abs(ms[a] - ms[b]) >= 5, 'đồng hồ quá gần nhau: ' + ms.join(','));
    }
  }
});

test('cuoi-ho: L6 never offers an impossible minute value (> 59 phút)', () => {
  const gen = L.levelById('l6').gen;
  for (let i = 0; i < 3000; i++) {
    const q = gen();
    for (const o of q.options) {
      if (!o.text) continue;
      const found = o.text.match(/(\d+) phút/g) || [];
      for (const f of found) assert.ok(Number(f.replace(' phút', '')) <= 59, 'l6 số phút không thể có trên đồng hồ: ' + o.text);
    }
    const em = q.explain.match(/(\d+) phút/g) || [];
    for (const f of em) assert.ok(Number(f.replace(' phút', '')) <= 60, 'l6 giải thích: ' + q.explain);
  }
});

test('cuoi-ho: L7 no nonsense options (13 giờ tối, 19 giờ sáng, 10/11 giờ tối, 12 giờ sáng/chiều)', () => {
  const gen = L.levelById('l7').gen;
  for (let i = 0; i < 3000; i++) {
    const q = gen();
    for (const o of q.options) {
      assert.doesNotMatch(o.text, /^(1[3-9]|2\d) giờ.* (sáng|trưa|chiều|tối|đêm)$/, o.text);
      assert.doesNotMatch(o.text, /^12 giờ( \d+ phút)? (sáng|chiều)$/, o.text);
      // 22–23 giờ là buổi đêm (Toán 2), không phải buổi tối — kiểm cả đáp án lẫn đáp án nhiễu
      assert.doesNotMatch(o.text, /^(10|11) giờ.* tối$/, o.text);
      assert.doesNotMatch(o.text, /^([1-6]) giờ.* tối$/, o.text);
    }
    assert.doesNotMatch(q.answerText, /(10|11) giờ.* tối$/, q.answerText);
  }
});

test('cuoi-ho: không màn nào đưa ra số phút không có trên đồng hồ (> 59 phút)', () => {
  for (const lv of L.LEVELS) {
    for (let i = 0; i < 1200; i++) {
      const q = lv.gen();
      for (const o of q.options) {
        if (!o.text) continue;
        // "1 giờ 90 phút" là đáp án nhiễu CỐ Ý của bài đổi đơn vị màn 8 (90 phút = ? giờ ? phút)
        if (o.text === '1 giờ 90 phút') continue;
        const hm = o.text.match(/^\d+ giờ (\d+) phút/);
        if (hm) assert.ok(Number(hm[1]) <= 59, lv.id + ': giờ không thể đọc như vậy: ' + o.text);
        // Màn 4/6 hỏi "kim dài chỉ bao nhiêu phút" → chỉ có 0–59 phút
        if (lv.id === 'l4' || lv.id === 'l6') {
          const d = o.text.match(/^(\d+) phút$/);
          if (d) assert.ok(Number(d[1]) <= 59, lv.id + ': vị trí kim dài không thể là ' + o.text);
        }
      }
    }
  }
});

test('cuoi-ho: L6 (đọc đồng hồ, lựa chọn chữ) không có đáp án nhiễu lệch 1–4 phút tuỳ tiện', () => {
  const gen = L.levelById('l6').gen;
  let checked = 0;
  for (let i = 0; i < 4000; i++) {
    const q = gen();
    if (!q.clock || q.options.some((o) => o.clock) || q.clock.hideHour) continue;
    const h = q.clock.h, m = q.clock.m;
    checked++;
    for (const o of q.options) {
      const mm = o.text.match(/^(\d+) giờ(?: (\d+) phút)?$/);
      if (!mm) continue;
      const oh = Number(mm[1]), om = mm[2] ? Number(mm[2]) : 0;
      if (oh !== h || om === m) continue;
      // Đáp án nhiễu hoặc là một vạch số 5 phút (đọc nhầm số kim dài vừa đi qua), hoặc cách đáp án ít nhất 5 phút
      assert.ok(om % 5 === 0 || Math.abs(om - m) >= 5, 'l6 nhiễu quá sát đáp án: ' + q.answerText + ' vs ' + o.text);
    }
  }
  assert.ok(checked > 300, 'phải kiểm được nhiều câu đọc đồng hồ (' + checked + ')');
});

test('cuoi-ho: L2/L3 explanation names the shown answer; L8 explains clock positions as numbers', () => {
  for (const id of ['l2', 'l3']) {
    const gen = L.levelById(id).gen;
    for (let i = 0; i < 2000; i++) {
      const q = gen();
      if (/30 phút$/.test(q.answerText) && L.strip(q.prompt) === 'Đồng hồ chỉ mấy giờ?') assert.ok(q.explain.indexOf(q.answerText) >= 0, id + ': ' + q.answerText + ' ∉ ' + q.explain);
    }
  }
  const gen8 = L.levelById('l8').gen;
  for (let i = 0; i < 2000; i++) {
    const q = gen8();
    assert.doesNotMatch(q.explain, /đi từ \d+ phút đến/, q.explain);
    assert.doesNotMatch(q.explain, /số 60\b/, q.explain);
  }
});

/* ---------- 4. Nhiễu đa dạng, swapped ---------- */
test('cuoi-ho: distractor sets vary between draws (uniq shuffles candidates)', () => {
  const groups = { l1: {}, l4: {}, l5: {} };
  for (const id of Object.keys(groups)) {
    const gen = L.levelById(id).gen;
    for (let i = 0; i < 4000; i++) {
      const q = gen();
      const p = L.strip(q.prompt);
      const want = id === 'l1' ? p === 'Đồng hồ chỉ mấy giờ?' : id === 'l4' ? p === 'Đồng hồ chỉ mấy giờ?' : /là mấy giờ mấy phút\?$/.test(p);
      if (!want) continue;
      const g = groups[id][q.answerText] = groups[id][q.answerText] || { n: 0, sets: new Set() };
      g.n++;
      g.sets.add(hasKey(q).filter((k) => k !== L.optKey(q.options[q.answer])).sort().join('||'));
    }
    const rich = Object.keys(groups[id]).filter((k) => groups[id][k].n >= 12);
    assert.ok(rich.length > 0, id + ': không có key đủ mẫu');
    assert.ok(rich.some((k) => groups[id][k].sets.size >= 3), id + ': bộ nhiễu vẫn cố định: ' + rich.map((k) => k + '=' + groups[id][k].sets.size).join(', '));
  }
  same(L.swapped(3, 0), { clock: { h: 12, m: 15 } });
  assert.equal(L.swapped(3, 15), null);
  assert.equal(L.swapped(7, 23), null);
});

test('cuoi-ho: fresh() avoids repeating recent questions', () => {
  const gen = L.levelById('l1').gen;
  let good = 0;
  for (let t = 0; t < 300; t++) {
    const keys = new Set();
    for (let i = 0; i < 12; i++) keys.add(L.fresh(gen).key);
    if (keys.size >= 10) good++;
  }
  assert.ok(good >= 285, 'chỉ ' + good + '/300 lượt có ≥ 10 câu khác nhau');
});

/* ---------- 5. Định nghĩa màn ---------- */
test('cuoi-ho: level / lesson / quiz definitions are well-formed', () => {
  assert.equal(L.LEVELS.length, 9);
  let lastGrade = 2;
  L.LEVELS.forEach((l, i) => {
    assert.equal(l.id, 'l' + (i + 1));
    assert.equal(l.index, i);
    assert.equal(l.n, i + 1);
    assert.ok(l.gates >= 8 && l.gates <= 12, l.id + ' gates');
    assert.ok(l.timer >= 12 && l.timer <= 18, l.id + ' timer');
    assert.ok(l.speed > 0, l.id + ' speed');
    if (l.hearts != null) assert.ok(l.hearts >= 3 && l.hearts <= 5, l.id + ' hearts');
    if (i < 3) assert.equal(l.hearts, 4, l.id + ' màn đầu được thêm một tim');
    assert.ok([0, 2, 3].includes(l.grade), l.id + ' grade');
    if (l.grade === 0) assert.equal(i, L.LEVELS.length - 1, 'thử thách phải ở cuối'); else { assert.ok(l.grade >= lastGrade, 'lớp không giảm'); lastGrade = l.grade; }
    assert.ok(typeof l.gen === 'function' && l.title && l.icon && l.desc, l.id + ' meta');
    assert.ok(l.lesson.length >= 3, l.id + ' lesson');
    l.lesson.forEach((s, k) => {
      assert.ok(s.text && s.text.trim(), l.id + ' slide ' + k + ' text');
      assert.ok(s.clock || s.digital || s.emoji || s.math || s.strip, l.id + ' slide ' + k + ' visual');
      if (s.clock) assert.ok(s.clock.h >= 1 && s.clock.h <= 12 && s.clock.m >= 0 && s.clock.m <= 59, l.id + ' slide ' + k + ' clock');
      assert.ok(L.visualHtml(s, 200).length > 0);
    });
    assert.ok(l.notes.length >= 1, l.id + ' notes');
    assert.ok(l.quiz.length >= 4, l.id + ' quiz');
    l.quiz.forEach((z, k) => {
      const q = L.mkQ(z);
      assert.equal(q.options.length, 3, l.id + ' quiz ' + k);
      assert.equal(new Set(q.options.map(L.optLabel)).size, 3, l.id + ' quiz ' + k + ' trùng');
      assert.ok(q.answer >= 0 && q.answer < 3);
      assert.equal(q.answerText, z.options[0].text, l.id + ' quiz ' + k + ' đáp án phải là lựa chọn đầu tiên khai báo');
      assert.ok(q.explain && q.explain.trim());
      if (z.clock) assert.ok(q.clock);
    });
  });
  assert.equal(L.levelById('l5').id, 'l5');
  assert.equal(L.levelById('nope'), null);
  assert.equal(L.regen(null), null);
  assert.equal(L.regen({ lv: 'l9' }), null);
  assert.equal(L.regen({ lv: 'zzz', h: 3 }), null);
});

/* ---------- 6. SVG / HTML ---------- */
test('cuoi-ho: clockSvg / visualHtml / optionHtml', () => {
  const lab = L.clockSvg({ h: 12, m: 20, minuteLabels: true }, 220);
  assert.ok(lab.indexOf('viewBox="-22 -22 284 284"') >= 0, 'nhãn phút cần viewBox rộng hơn');
  for (let i = 1; i <= 12; i++) assert.ok(lab.indexOf('>' + (i * 5) + '</text>') >= 0, 'thiếu nhãn ' + i * 5);
  assert.ok(L.clockSvg({ h: 3, m: 0 }, 104).indexOf('viewBox="0 0 240 240"') >= 0);
  // Đồng hồ nhỏ: chữ số phóng theo tỉ lệ để bé đọc được (C1/C4); đồng hồ to giữ nguyên cỡ gốc
  const fs = (svg) => Number((svg.match(/font-size="([\d.]+)"/) || [])[1]);
  assert.ok(fs(L.clockSvg({ h: 3, m: 0 }, 88)) > 25, 'đồng hồ 88px phải có chữ số to hơn 25');
  assert.ok(fs(L.clockSvg({ h: 3, m: 0 }, 132)) > 23, 'đồng hồ HUD 132px: chữ số > 23');
  assert.equal(fs(L.clockSvg({ h: 3, m: 0 }, 220)), 21, 'đồng hồ lớn giữ cỡ chữ gốc');
  assert.ok(fs(L.clockSvg({ h: 3, m: 0 }, 60)) <= 21 * 1.3 + 0.01, 'không phóng quá 1,3 lần (số không đè nhau)');
  assert.ok(L.clockSvg({ h: 3, m: 0 }, 104).indexOf('width="104"') >= 0);
  assert.ok(L.clockSvg({ h: 3, m: 0, noHands: true }).indexOf('stroke-width="9"') < 0, 'noHands không vẽ kim');
  const d = L.visualHtml({ digital: '07:23<b>' });
  assert.ok(d.indexOf('07:23&lt;b&gt;') >= 0, 'digital phải escape');
  assert.ok(L.optionHtml(L.T('<b>')).indexOf('&lt;b&gt;') >= 0, 'optionHtml phải escape');
  assert.ok(L.optionHtml(L.C(3, 0)).indexOf('class="clock mini"') >= 0);
  assert.equal(L.esc('<a href="x">&\''), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
  assert.equal(L.strip('<b>7</b>  giờ '), '7 giờ');
});

/* ---------- 6b. Lớp vẽ của đồng hồ bài học, hình minh họa mới (C12, C13, C14) ---------- */
test('cuoi-ho: clockSvg draws the numerals last with a halo, and both hands stay visible', () => {
  const svg = L.clockSvg({ h: 3, m: 30, hl: 'hour', arc: [15, 20] }, 220);
  const lastHand = Math.max(svg.lastIndexOf('#ef476f'), svg.lastIndexOf('stroke-width="9"'));
  const firstNum = svg.indexOf('paint-order="stroke"');
  assert.ok(firstNum > lastHand, 'chữ số phải vẽ SAU kim (không bị kim che)');
  assert.equal((svg.match(/paint-order="stroke"/g) || []).length, 12, '12 chữ số đều có viền trắng');
  // Quầng sáng (hl) vẽ trước cả hai kim, nếu không nó phủ lên kim kia
  const glow = svg.indexOf('rgba(255,209,102,0.9)');
  assert.ok(glow >= 0 && glow < svg.indexOf('#2b2d42" stroke-width="9"'), 'quầng sáng vẽ trước kim giờ');
  // Kim giờ và kim phút đều có viền trắng để không lẫn vào nhau
  assert.ok(svg.indexOf('stroke="#fffdf6" stroke-width="13"') >= 0, 'kim giờ có viền trắng');
  assert.ok(svg.indexOf('stroke="#fffdf6" stroke-width="10"') >= 0, 'kim phút có viền trắng');
  // hideHour / hideMinute vẫn phải bỏ đúng kim (kể cả viền)
  const noH = L.clockSvg({ h: 3, m: 30, hideHour: true, hl: 'hour' });
  assert.ok(noH.indexOf('stroke-width="9"') < 0 && noH.indexOf('stroke-width="13"') < 0, 'hideHour bỏ cả kim giờ lẫn viền');
  assert.ok(noH.indexOf('rgba(255,209,102,0.9)') < 0, 'hideHour thì không vẽ quầng kim giờ');
  const noM = L.clockSvg({ h: 3, m: 30, hideMinute: true });
  assert.ok(noM.indexOf('#ef476f') < 0 && noM.indexOf('stroke-width="10"') < 0, 'hideMinute bỏ cả kim phút lẫn viền');
});

test('cuoi-ho: math / 24h-strip visuals render and escape', () => {
  const m = L.visualHtml({ emoji: '🌇', math: '5 + 12 = 17' });
  assert.ok(m.indexOf('<div class="math-art">5 + 12 = 17</div>') >= 0, 'phép tính viết to');
  assert.ok(m.indexOf('emoji-art') < m.indexOf('math-art'), 'biểu tượng trước, phép tính sau');
  assert.ok(L.visualHtml({ math: '<b>x</b>' }).indexOf('&lt;b&gt;') >= 0, 'math phải escape');
  const s = L.visualHtml({ strip: true });
  assert.ok(s.indexOf('class="h24-strip"') >= 0, 'có băng 24 giờ');
  for (let i = 1; i <= 24; i++) assert.ok(s.indexOf('<span>' + i + '</span>') >= 0, 'băng 24 giờ thiếu số ' + i);
  assert.ok(s.indexOf('class="row am"') < s.indexOf('class="row pm"'), 'hàng 1–12 nằm trên hàng 13–24');
});

test('cuoi-ho: lessons explain the "why" of the hour hand and of the 24-hour day', () => {
  const l2 = L.LEVELS[1].lesson;
  assert.ok(l2.length >= 6, 'màn 2 cần trang giải thích "vì sao"');
  const why = l2.filter((s) => /Vì sao/.test(s.text));
  assert.equal(why.length, 1, 'màn 2 có đúng một trang "Vì sao?"');
  assert.ok(why[0].clock && why[0].clock.hl === 'hour' && Array.isArray(why[0].clock.arc), 'trang "vì sao" tô sáng kim giờ');
  const l7 = L.LEVELS[6].lesson;
  assert.equal(l7.filter((s) => s.strip).length, 1, 'màn 7 có đúng một trang băng 24 giờ');
  assert.equal(l7.filter((s) => s.math).length, 2, 'màn 7 có 2 trang phép tính ±12');
  // Không còn emoji kiểu "🌇 ➕ 12" (bé đọc không ra)
  L.LEVELS.forEach((l) => l.lesson.forEach((s, k) => {
    if (s.emoji) assert.doesNotMatch(s.emoji, /[➕➖]/, l.id + ' trang ' + k + ': dùng math thay cho emoji phép tính');
  }));
});

/* ---------- 6c. Thời gian thêm cho câu có lời văn (C15) ---------- */
test('cuoi-ho: only L8 word problems get extra seconds, and mkQ carries extraTime', () => {
  assert.equal(L.mkQ({ prompt: 'p', options: [L.T('a'), L.T('b'), L.T('c')], explain: 'e' }).extraTime, 0, 'mặc định 0');
  assert.equal(L.mkQ({ prompt: 'p', options: [L.T('a'), L.T('b'), L.T('c')], explain: 'e', extraTime: 4 }).extraTime, 4);
  let withExtra = 0, total = 0;
  for (let i = 0; i < 3000; i++) {
    const q = L.LEVELS[7].gen();
    total++;
    assert.ok(q.extraTime === 0 || q.extraTime === 4, 'l8 extraTime chỉ 0 hoặc 4: ' + q.extraTime);
    // Câu có lời văn / khoảng thời gian mới được cộng giờ; câu đổi đơn vị ngắn thì không
    const isWord = /(bắt đầu|Từ )/.test(L.strip(q.prompt));
    assert.equal(q.extraTime > 0, isWord, 'l8: ' + L.strip(q.prompt) + ' → extraTime ' + q.extraTime);
    if (q.extraTime) withExtra++;
  }
  assert.ok(withExtra > total * 0.3 && withExtra < total * 0.8, 'khoảng 60% câu màn 8 có lời văn (được: ' + withExtra + '/' + total + ')');
  for (const i of [0, 1, 2, 3, 4, 5, 6]) {
    for (let k = 0; k < 300; k++) assert.equal(L.LEVELS[i].gen().extraTime, 0, L.LEVELS[i].id + ' không cần thêm giờ');
  }
  // Màn 9 trộn mọi màn nên vẫn có thể rơi vào câu lời văn của màn 8
  for (let k = 0; k < 500; k++) {
    const q = L.LEVELS[8].gen();
    assert.ok(q.extraTime === 0 || (q.extraTime === 4 && q.topic === 'l8'), 'l9 chỉ kế thừa extraTime của l8');
  }
});

/* ---------- 7. API lựa chọn ---------- */
test('cuoi-ho: uniq / mkQ / T / C', () => {
  const u = L.uniq(L.T('a'), [L.T('a'), L.T('b'), null, L.T('c')], 3, null);
  assert.equal(u.length, 3);
  assert.equal(new Set(u.map(L.optKey)).size, 3);
  assert.equal(u[0].text, 'a');
  let n = 0;
  const f = L.uniq(L.T('x'), [], 3, () => L.T('f' + (n++)));
  assert.equal(f.length, 3);
  assert.equal(L.C(13, 0), null); assert.equal(L.C(3, 60), null); same(L.C(3, 5), { clock: { h: 3, m: 5 } });
  for (let i = 0; i < 200; i++) {
    const q = L.mkQ({ prompt: 'p', options: [L.T('đúng'), L.T('s1'), L.T('s2')], explain: 'e' });
    assert.equal(q.answerText, 'đúng');
    assert.equal(L.optLabel(q.options[q.answer]), 'đúng');
    assert.equal(q.key, 'p|t:đúng');
  }
  assert.equal(L.optLabel(L.C(8, 45)), '🕒 8 giờ 45 phút');
  assert.equal(L.optSpeech(L.C(8, 45)), 'đồng hồ chỉ 8 giờ 45 phút');
});

/* ---------- 8. Store (game.js) : di trú dữ liệu cũ, đóng gói dữ liệu hỏng, ôn lại, thống kê ---------- */
const GAME_FILES = ['js/audio.js', 'js/lessons.js', 'js/profile.js', 'js/game.js'];
function bootWith(seed, players) {
  const st = makeStorage();
  if (seed !== undefined) st.setItem('cuoi-ho-v1', typeof seed === 'string' ? seed : JSON.stringify(seed));
  if (players) st.setItem('3hoa-players-v1', JSON.stringify(players));
  const w = loadGame('cuoi-ho', GAME_FILES, { localStorage: st });
  assert.ok(w.__CuoiHo && w.__CuoiHo.Store, 'game.js phải khởi động được trong môi trường giả');
  return { w, st, S: w.__CuoiHo.Store, X: w.__CuoiHo };
}

test('cuoi-ho Store: legacy top-level progress migrates to players.p1 and is sanitized', () => {
  const legacy = { sound: true, music: false, voice: true, seenTip: true, progress: { unlocked: 3, levels: { l1: { best: 1200, stars: 3, quiz: true, done: true, plays: 2 }, l2: { best: '<img src=x onerror="window.__xss=1">', stars: 'abc' }, l3: 5, zz: { best: 9 } }, badge: 'yes' } };
  const { S, st } = bootWith(Object.assign(JSON.parse('{"__proto__":{"polluted":1}}'), legacy));
  assert.equal(S.data.music, false);
  assert.equal(S.data.seenTip, true);
  assert.equal(S.data.progress, undefined, 'không còn progress ở cấp cao nhất');
  assert.equal(Object.getPrototypeOf(S.data).polluted, undefined);
  const p1 = S.data.players.p1;
  assert.equal(p1.unlocked, 3);
  assert.equal(p1.badge, false, 'badge phải là boolean true mới nhận');
  same(p1.levels.l1, { best: 1200, stars: 3, quiz: true, done: true, plays: 2 });
  same(p1.levels.l2, { best: 0, stars: 0, quiz: false, done: false, plays: 0 });
  assert.equal(p1.levels.l3, undefined);
  assert.equal(p1.levels.zz, undefined);
  same(p1.missed, {});
  assert.equal(p1.stats.plays, 0);
  const saved = JSON.parse(st.getItem('cuoi-ho-v1'));
  assert.equal(saved.progress, undefined);
  assert.equal(saved.players.p1.unlocked, 3);
  assert.equal(S.lv('l1').best, 1200);
  assert.equal(S.p(), p1);
});

test('cuoi-ho Store: garbage / hostile storage never throws and yields a blank bucket', () => {
  for (const seed of ['{not json', '[]', '42', 'null', { progress: 'abc' }, { progress: { unlocked: '99', levels: 'abc' } }, { progress: { levels: { l2: 5 } } }, { players: [] }, { players: { 'bad id!': { unlocked: 5 }, p1: 7 } }]) {
    const { S } = bootWith(seed);
    const b = S.p();
    assert.ok(b.unlocked >= 1 && b.unlocked <= 9, JSON.stringify(seed));
    assert.equal(typeof b.levels, 'object');
    same(S.lv('l2'), { best: 0, stars: 0, quiz: false, done: false, plays: 0 });
    assert.equal(S.data.players['bad id!'], undefined);
  }
  const { S } = bootWith({ progress: { unlocked: '99', levels: 'abc' } });
  assert.equal(S.p().unlocked, 9, 'kẹp trong 1..9');
  const { S: S2 } = bootWith(undefined);
  assert.equal(S2.p().unlocked, 1);
  assert.equal(S2.data.fx, 'full');
  const { S: S3 } = bootWith({ fx: 'lite', players: { p1: { unlocked: 2, missed: { 'x|y': { n: 3, info: { lv: 'l1', h: 99 } } }, stats: { plays: -5, byTopic: { l1: { c: '7', w: 2 }, nope: { c: 1, w: 1 } } } } } });
  assert.equal(S3.data.fx, 'lite');
  same(S3.p().missed, {}, 'info không sinh lại được đúng câu → bỏ');
  assert.equal(S3.p().stats.plays, 0);
  same(S3.p().stats.byTopic, { l1: { c: 7, w: 2 } });
});

test('cuoi-ho Store: per-player buckets, accessors follow the active player', () => {
  const players = { v: 1, active: 'p2', players: [{ id: 'p1', name: 'Bé', avatar: '🐯' }, { id: 'p2', name: 'Minh', avatar: '🦉' }] };
  const { S, w } = bootWith({ players: { p1: { unlocked: 4, levels: { l1: { best: 500, stars: 2 } } } } }, players);
  assert.equal(w.Players.active().id, 'p2');
  assert.equal(S.p().unlocked, 1, 'p2 mới toanh');
  assert.equal(S.lv('l1').best, 0);
  S.setLv('l1', { best: 300, stars: 1, quiz: true, done: true, plays: 1 });
  assert.equal(S.data.players.p2.levels.l1.best, 300);
  assert.equal(S.data.players.p1.levels.l1.best, 500, 'không đụng bucket của p1');
  assert.ok(S.unlockUpTo(3));
  assert.equal(S.data.players.p2.unlocked, 3);
  assert.equal(S.data.players.p1.unlocked, 4);
  w.Players.setActive('p1');
  assert.equal(S.p().unlocked, 4);
  assert.equal(S.lv('l1').best, 500);
  assert.equal(S.isUnlocked(w.Lessons.LEVELS[3]), true);
  assert.equal(S.isUnlocked(w.Lessons.LEVELS[4]), false);
  S.setLv('nope', { best: 1 });
  assert.equal(S.p().levels.nope, undefined);
  S.resetActive();
  assert.equal(S.p().unlocked, 1);
  assert.equal(S.data.players.p2.unlocked, 3);
});

test('cuoi-ho Store: noteMissed / noteOk / reviewPool / addStats', () => {
  const { S, w } = bootWith(undefined);
  const Lx = w.Lessons;
  const q5 = Lx.levelById('l5').gen(), q1 = Lx.levelById('l1').gen();
  S.noteMissed(q5.key, q5.info);
  S.noteMissed(q5.key, q5.info);
  S.noteMissed(q1.key, q1.info);
  S.noteMissed('bogus', { lv: 'l1', h: 'x' });   // info không sinh lại được câu 'bogus' → bỏ qua
  S.noteMissed('nokey', null);
  S.noteMissed(q1.key + 'x', q1.info);            // key không khớp info → bỏ qua
  const m = S.p().missed;
  assert.equal(Object.keys(m).length, 2);
  assert.equal(m[q5.key].n, 2);
  assert.equal(m[q5.key].ok, 0);
  assert.equal(m[q5.key].info.lv, 'l5');
  const pool = S.reviewPool();
  assert.equal(pool[0].key, q5.key, 'sai nhiều nhất lên đầu');
  assert.equal(S.reviewPool((info) => Lx.levelById(info.lv).index <= 0).length, 1, 'lọc theo màn: chỉ l1');
  assert.equal(Lx.regen(pool[0].info).key, q5.key);
  S.noteOk(q5.key);
  assert.equal(m[q5.key].ok, 1);
  S.noteOk(q5.key);
  assert.equal(m[q5.key], undefined, 'đúng 2 lần → thuộc');
  S.noteOk('missing');
  for (let i = 0; i < 80; i++) { const q = Lx.levelById('l6').gen(); S.noteMissed(q.key, q.info); }
  assert.ok(Object.keys(S.p().missed).length <= 60, 'tối đa 60 câu');
  S.addStats({ correct: 7, wrong: 3, seconds: 42.4, topic: 'l9', perTopic: { l1: { c: 2, w: 1 }, zz: { c: 1, w: 0 } } });
  const s = S.p().stats;
  assert.equal(s.plays, 1); assert.equal(s.correct, 7); assert.equal(s.wrong, 3); assert.equal(s.seconds, 42);
  same(s.byTopic.l9, { c: 7, w: 3 });
  same(s.byTopic.l1, { c: 2, w: 1 });
  assert.equal(s.byTopic.zz, undefined);
  assert.ok(s.last > 0);
  // Tải lại từ localStorage: giữ nguyên
  const { S: S2 } = (function () { const st = makeStorage(); st.setItem('cuoi-ho-v1', JSON.stringify(S.data)); const w2 = loadGame('cuoi-ho', GAME_FILES, { localStorage: st }); return { S: w2.__CuoiHo.Store }; })();
  assert.equal(S2.p().stats.correct, 7);
  assert.equal(Object.keys(S2.p().missed).length, Object.keys(S.p().missed).length);
});
