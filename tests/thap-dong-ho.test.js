'use strict';
// Kiểm thử logic thuần của Tháp Đồng Hồ: cách đọc giờ tiếng Việt, sinh mốc giờ/đáp án nhiễu, câu hỏi, SVG và Store (di trú, ôn lại, thống kê).
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame, makeStorage } = require('./lib/load.js');

const K = loadGame('thap-dong-ho', ['js/clock.js']).Clock;
const N = 500;
const noSymbols = (s) => !/[→×=−]/.test(s);
// Giá trị lấy từ vm context khác realm: so sánh sau khi ép về JSON thuần
const J = (v) => JSON.parse(JSON.stringify(v));
const deepJ = (a, b, msg) => assert.deepEqual(J(a), b, msg);

test('clock: Vietnamese reading for every (h, m) in plain / kém / 24h styles', () => {
  for (let h = 1; h <= 12; h++) {
    for (let m = 0; m < 60; m++) {
      const p = K.mk(h, m, 'plain', null, 6);
      assert.equal(K.read(p), h + ' giờ' + (m ? ' ' + m + ' phút' : ''));
      assert.equal(K.lines(p).join(' '), K.read(p));
      assert.equal(K.readPlain(p), K.read(p));
      const k = K.mk(h, m, 'kem', null, 5);
      if (m >= 35) assert.equal(K.read(k), (h % 12 + 1) + ' giờ kém ' + (60 - m) + ' phút');
      else assert.equal(K.read(k), K.read(p), 'kém chỉ dùng từ 35 phút');
      assert.ok(K.explain(p).length > 10 && K.explain(k).length > 10);
      assert.ok(K.explainShort(p).length > 5 && K.explainShort(k).length > 5);
      assert.ok(noSymbols(K.speakable(K.explain(p))) && noSymbols(K.speakable(K.explain(k))), 'speakable strips symbols');
      assert.ok(noSymbols(K.speakable(K.explainShort(k))));
      // "rưỡi" chỉ được nhắc khi 30 phút và màn ≤ 4
      for (const lv of [1, 2, 3, 4, 5, 6]) {
        const t = K.mk(h, m, 'plain', null, lv);
        assert.equal(/rưỡi/.test(K.speech(t)), m === 30 && lv <= 4, 'rưỡi lv=' + lv + ' m=' + m);
      }
      if (m >= 35) assert.ok(K.speech(k).indexOf('tức là ' + K.readPlain(k)) > 0);
      assert.equal(K.minuteNumber(m), (m / 5) % 12 || 12);
    }
  }
  for (let h24 = 0; h24 < 24; h24++) {
    for (const m of [0, 15, 30, 45, 7]) {
      const t = K.mk24(h24, m, 7);
      assert.ok(K.read(t).indexOf(h24 + ' giờ') === 0, K.read(t));
      assert.equal(t.h, h24 % 12 || 12);
      assert.equal(t.h24, h24);
      assert.equal(t.style, '24');
      assert.equal(t.period, K.periodOf(h24));
      const exp = h24 === 0 || h24 >= 22 ? 'đêm' : h24 <= 10 ? 'sáng' : h24 <= 12 ? 'trưa' : h24 <= 17 ? 'chiều' : 'tối';
      assert.equal(t.period, exp, 'buổi của ' + h24 + ' giờ');
      assert.ok(K.speech(t).indexOf(t.period) > 0, 'speech nhắc buổi');
      assert.ok(noSymbols(K.speakable(K.explain(t))));
      assert.equal(K.digital(t), (h24 < 10 ? '0' : '') + h24 + ':' + (m < 10 ? '0' : '') + m);
    }
  }
  assert.equal(K.speakable('17:30'), '17 giờ 30 phút');
  assert.equal(K.speakable('15:00 → 3 giờ chiều'), '15 giờ là 3 giờ chiều');
  assert.equal(K.speakable('9 × 5 = 45'), '9 nhân 5 bằng 45');
  assert.equal(K.key(K.mk24(15, 0), '24'), 'D15:0');
  assert.equal(K.key(K.mk(3, 0), 'x'), K.key(K.mk(15, 0), 'x'));
  assert.equal(K.digital(K.mk24(7, 5)), '07:05');
  assert.equal(K.esc('<b>&"\'</b>'), '&lt;b&gt;&amp;&quot;&#39;&lt;/b&gt;');
});

test('clock: genFor(n) respects each level\'s minutes and style (1000 samples per level)', () => {
  const STYLE = { 1: 'plain', 2: 'plain', 3: 'plain', 4: 'plain', 5: 'kem', 6: 'plain', 7: '24' };
  for (let n = 1; n <= 8; n++) {
    let fine = 0;
    for (let i = 0; i < 1000; i++) {
      const t = K.genFor(n);
      assert.ok(t.h >= 1 && t.h <= 12 && t.m >= 0 && t.m < 60);
      const lv = n === 8 ? t.lv : n;
      if (n === 8) assert.ok(lv >= 1 && lv <= 7, 'L8 sub level'); else assert.equal(t.lv, n);
      assert.ok(K.minutesFor(lv).indexOf(t.m) >= 0, 'L' + n + ' minute ' + t.m + ' allowed');
      assert.equal(t.style, STYLE[lv], 'L' + n + ' style');
      if (lv === 7) { assert.ok(t.h24 >= 1 && t.h24 <= 23); assert.ok(t.period); }
      else assert.equal(t.h24, undefined);
      if (n === 6 && t.m % 5) fine++;
    }
    if (n === 6) assert.ok(fine > 450 && fine < 750, 'L6 non-multiple-of-5 share ' + fine);
  }
});

test('clock: near(t) yields ≥ 3 unique, valid, different distractor clocks (500 per level)', () => {
  for (let n = 1; n <= 8; n++) {
    for (let i = 0; i < N; i++) {
      const t = K.genFor(n);
      const out = K.near(t);
      assert.ok(out.length >= 3, 'L' + n + ' near count ' + out.length);
      const keys = new Set();
      out.forEach((c) => {
        assert.ok(!K.same(c, t), 'distractor equals the answer');
        assert.ok(K.minutesFor(c.lv).indexOf(c.m) >= 0, 'distractor minute ' + c.m + ' outside level ' + c.lv);
        assert.equal(c.style, t.style);
        if (t.style === '24') assert.ok(c.h24 >= 1 && c.h24 <= 23, 'never 0 giờ');
        keys.add(K.key(c, c.style === '24' ? '24' : 'x'));
      });
      assert.equal(keys.size, out.length, 'duplicate distractors');
    }
  }
});

test('clock: near(t) puts ±1/±2 minute neighbours last so level 6 gets coarse distractors first (C1)', () => {
  for (let i = 0; i < N; i++) {
    for (const lv of [6, 8]) {
      const t = K.genFor(lv);
      if (t.style === '24') continue;
      const out = K.near(t);
      const isFine = (c) => c.h === t.h && Math.abs(c.m - t.m) <= 2;
      const nFine = out.filter(isFine).length;
      out.forEach((c, j) => assert.equal(isFine(c), j >= out.length - nFine, 'L' + lv + ' đáp án sát phút phải nằm cuối: ' + out.map((x) => K.read(x)).join(' | ')));
      if (lv === 6) assert.ok(out.length - nFine >= 6, 'còn ≥ 6 đáp án thô: ' + out.length + '/' + nFine);
    }
  }
});

test('clock: clockQuestion(n) has exactly one correct option among 3 unique texts (500 per level)', () => {
  for (let n = 1; n <= 8; n++) {
    for (let i = 0; i < N; i++) {
      const q = i % 2 ? K.clockQuestion(n) : K.clockQuestion(n, K.genFor(n));
      assert.equal(q.choices.length, 3);
      assert.equal(new Set(q.choices).size, 3, 'unique choices ' + q.choices.join('|'));
      assert.equal(q.choices[0], K.read(q.clock));
      assert.ok(q.explain && q.explain.length > 10);
      assert.ok(q.speech && q.q);
      if (n === 7) { assert.ok(q.q.indexOf('24 giờ') >= 0); assert.ok(q.speech.indexOf('24 giờ') >= 0); }
      assert.ok(noSymbols(K.speakable(q.explain)));
    }
  }
});

test('clock: quizFor(n, mistakes) — 3 questions, missed clocks come back, no duplicate options (300 per level)', () => {
  for (let n = 1; n <= 8; n++) {
    for (let i = 0; i < 300; i++) {
      const a = K.genFor(n), b = K.genFor(n);
      const mode = i % 3;
      const mistakes = mode === 0 ? [] : mode === 1 ? [a] : [a, b];
      const qs = K.quizFor(n, mistakes);
      assert.equal(qs.length, 3);
      assert.ok(qs[0].clock, 'first question reads a clock');
      assert.ok((qs[0].clock.lv || n) <= (n === 8 ? 7 : n));
      if (mode === 1) assert.equal(qs[0].clock, a);
      if (mode === 2) {
        const clocks = qs.filter((q) => q.clock).map((q) => q.clock);
        assert.ok(clocks.indexOf(a) >= 0 && clocks.indexOf(b) >= 0, 'both mistakes are asked again');
      }
      qs.forEach((q) => {
        assert.ok(q.choices.length >= 3);
        assert.equal(new Set(q.choices).size, q.choices.length, 'duplicate option texts');
        assert.ok(q.explain && q.q);
      });
    }
  }
});

test('clock: quizFor(8) capstone asks a hard-level concept, or the weakest level when known (C10)', () => {
  // Câu kiến thức của mỗi màn là duy nhất trong ngân hàng → tra ngược được câu hỏi thuộc màn nào
  const owner = {};
  for (const n in K.CONCEPT) K.CONCEPT[n].forEach((mk) => { owner[mk().q] = Number(n); });
  const seen = new Set();
  for (let i = 0; i < 600; i++) {
    const qs = K.quizFor(8, []);
    assert.equal(qs.length, 3);
    assert.ok(qs[0].clock && qs[1].clock, 'hai câu đọc đồng hồ');
    assert.ok(!qs[2].clock, 'câu thứ ba là câu kiến thức');
    const from = owner[qs[2].q];
    assert.ok(from != null, 'câu kiến thức lạ: ' + qs[2].q);
    assert.ok(K.CAPSTONE.indexOf(from) >= 0, 'bài tổng kết chỉ hỏi phần khó (màn ' + K.CAPSTONE.join(', ') + '), gặp màn ' + from);
    seen.add(from);
  }
  deepJ(Array.from(seen).sort(), J(K.CAPSTONE), 'đủ cả bốn màn khó xuất hiện');
  // Truyền màn yếu nhất: câu kiến thức luôn thuộc đúng màn đó (kể cả màn dễ)
  for (const weak of [1, 2, 3, 4, 5, 6, 7]) {
    for (let i = 0; i < 60; i++) {
      const qs = K.quizFor(8, [], weak);
      assert.equal(owner[qs[2].q], weak, 'màn yếu ' + weak + ' → câu kiến thức của màn đó');
    }
  }
  // Giá trị vô nghĩa thì quay về nhóm mặc định
  for (let i = 0; i < 60; i++) assert.ok(K.CAPSTONE.indexOf(owner[K.quizFor(8, [], 0)[2].q]) >= 0);
  for (let i = 0; i < 60; i++) assert.ok(K.CAPSTONE.indexOf(owner[K.quizFor(8, [], 99)[2].q]) >= 0);
});

test('clock: lesson html colours the two hand names so they match the legend under the clock (C12)', () => {
  for (let n = 1; n <= 8; n++) {
    const html = K.LESSONS[n].html;
    // Không còn "kim ngắn"/"kim dài" trần trong bài học: mỗi lần nhắc tới kim đều được tô màu của kim đó
    const bare = html.replace(/<b class="k[hm]">(Kim|kim) (ngắn|dài)<\/b>/g, '');
    assert.ok(!/(Kim|kim) (ngắn|dài)/.test(bare), 'bài học ' + n + ' còn tên kim chưa tô màu: ' + bare);
    const kh = (html.match(/<b class="kh">/g) || []).length, km = (html.match(/<b class="km">/g) || []).length;
    assert.equal(kh, (html.match(/(Kim|kim) ngắn/g) || []).length, 'bài học ' + n + ': kim ngắn luôn dùng lớp kh');
    assert.equal(km, (html.match(/(Kim|kim) dài/g) || []).length, 'bài học ' + n + ': kim dài luôn dùng lớp km');
    // Lời đọc không được lẫn thẻ HTML
    assert.ok(!/[<>]/.test(K.LESSONS[n].speech), 'lời đọc bài học ' + n + ' không chứa thẻ');
  }
  assert.ok(/<b class="kh">/.test(K.LESSONS[1].html) && /<b class="km">/.test(K.LESSONS[1].html), 'bài học 1 nhắc cả hai kim');
});

test('clock: CONCEPT / LESSONS / LEVELS are well-formed', () => {
  for (const n in K.CONCEPT) {
    K.CONCEPT[n].forEach((mk) => {
      const q = mk();
      assert.equal(q.choices.length, 3, n + ': ' + q.q);
      assert.equal(new Set(q.choices).size, 3, n + ': duplicate choices in ' + q.q);
      assert.ok(q.explain && q.explain.length > 5);
      assert.ok(noSymbols(K.speakable(q.explain)) && noSymbols(K.speakable(q.q)));
      q.choices.forEach((c) => assert.ok(noSymbols(K.speakable(c)), 'choice speakable ' + c));
    });
    assert.ok(K.CONCEPT[n].length >= 5);
  }
  for (let n = 1; n <= 8; n++) {
    const L = K.LESSONS[n];
    assert.ok(L && L.title && L.html && L.speech, 'lesson ' + n);
    assert.ok(L.demo.length >= 2);
    L.demo.forEach((t) => assert.ok(K.read(t).length > 3));
    if (L.ring) assert.ok(L.ring === 'min' || L.ring === 'kem');
  }
  assert.ok(/đêm/.test(K.LESSONS[7].html) && /22 giờ/.test(K.LESSONS[7].speech), 'lesson 7 explains đêm → 22 giờ');
  assert.equal(K.LEVELS.length, 8);
  K.LEVELS.forEach((l, i) => {
    assert.equal(l.n, i + 1);
    assert.equal(l.id, 'L' + (i + 1));
    assert.ok(l.goal >= 8 && l.goal <= 15);
    assert.ok(l.fall >= 10 && l.fall <= 20);
    assert.ok(['plain', 'kem', '24', 'mix'].indexOf(l.style) >= 0);
    assert.ok(l.keyMode === 'x' || l.keyMode === '24');
    assert.ok(l.lesson === K.LESSONS[l.n]);
    const t = l.gen();
    assert.ok(t && K.read(t));
    assert.ok(l.title && l.desc && l.icon);
  });
  assert.ok(K.LEVELS[4].desc.indexOf('45 phút') >= 0, 'L5 desc: 7 giờ 45 phút');
  assert.equal(K.levelById('L3').n, 3);
  assert.equal(K.levelByN(9), null);
});

test('clock: SVG — badge/digital drawn before the hands, kém ring labels anchored outside, aria-label', () => {
  const s = K.svg(K.mk24(18, 0, 7), { badge: true });
  assert.ok(s.indexOf('fill="#8a5a00"') >= 0 && s.indexOf('fill="#8a5a00"') < s.indexOf('class="hand hour"'), 'badge before hands');
  assert.ok(/y="108"/.test(s), 'badge sits below the dial');
  const d = K.svg(K.mk24(15, 0, 7), { digital: true, badge: false });
  assert.ok(d.indexOf('font-family="monospace"') >= 0 && d.indexOf('font-family="monospace"') < d.indexOf('class="hand hour"'), 'digital before hands');
  assert.ok(d.indexOf('15:00') > 0 && d.indexOf('#8a5a00') < 0);
  const t = K.mk(7, 45, 'kem', null, 5);
  const r = K.svg(t, { ring: 'kem' });
  for (let n = 7; n <= 11; n++) {
    const re = new RegExp('<text[^>]*text-anchor="end"[^>]*>kém ' + (60 - n * 5) + '</text>');
    assert.ok(re.test(r), 'kém ' + (60 - n * 5) + ' anchored end');
  }
  assert.ok(/text-anchor="middle"[^>]*>60<\/text>/.test(r), '12 o\'clock label is 60');
  assert.ok(!/0 \/ 60/.test(r));
  assert.ok(r.indexOf('aria-label="' + K.esc(K.read(t)) + '"') > 0);
  // Hồi quy: "kém 15" (9 giờ) từng bị hộp nhìn cắt mất chữ đầu – mọi nhãn phải nằm gọn trong viewBox
  assert.ok(/viewBox="-180 -180 360 360"/.test(r), 'kem ring viewBox extended');
  assert.ok(/class="clock-svg has-ring"/.test(r), 'đồng hồ có vòng số phút mang lớp has-ring cho CSS');
  // Hộp nhìn rộng ra thì kích thước vẽ ra cũng phải to ra, nếu không mặt đồng hồ bị thu nhỏ lại
  assert.ok(/width="(\d+)" height="\1"/.test(r));
  assert.equal(Number(/width="(\d+)"/.exec(r)[1]), Math.round(180 * 180 / 110), 'kem: vẽ to theo hộp nhìn');
  assert.equal(Number(/width="(\d+)"/.exec(K.svg(t, {}))[1]), 180, 'không vòng: giữ nguyên cỡ yêu cầu');
  const m = K.svg(K.mk(9, 15, 'plain', null, 3), { ring: 'min', size: 120 });
  assert.equal(Number(/width="(\d+)"/.exec(m)[1]), Math.round(120 * 130 / 110));
  assert.ok(/text-anchor="middle"[^>]*>15<\/text>/.test(m));
  // Không chữ nào tràn ra ngoài hộp nhìn ở mọi kiểu vẽ (ước lượng bề rộng rộng rãi: 0,62 × cỡ chữ / ký tự)
  const variants = [
    ['kem ring 7:45', K.svg(K.mk(7, 45, 'kem', null, 5), { ring: 'kem' })],
    ['kem ring 9:45', K.svg(K.mk(9, 45, 'kem', null, 5), { ring: 'kem' })],
    ['min ring', K.svg(K.mk(9, 15, 'plain', null, 3), { ring: 'min' })],
    ['plain', K.svg(K.mk(11, 55, 'plain', null, 6), {})],
    ['24h + badge', K.svg(K.mk24(18, 45, 7), { badge: true })],
    ['24h + digital', K.svg(K.mk24(23, 30, 7), { digital: true })],
    ['kem ring + badge', K.svg(K.mk24(21, 45, 7), { ring: 'kem', digital: true })]
  ];
  variants.forEach(([name, code]) => {
    const box = /viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"/.exec(code);
    assert.ok(box, name + ': viewBox');
    const ext = -Number(box[1]);
    const re = /<text([^>]*)>([^<]*)<\/text>/g;
    let m, n = 0;
    while ((m = re.exec(code))) {
      const at = m[1], txt = m[2];
      const get = (k) => { const g = new RegExp(k + '="([^"]*)"').exec(at); return g ? g[1] : null; };
      const x = Number(get('x') || 0), fs = Number(get('font-size') || 16), anchor = get('text-anchor') || 'start';
      const w = txt.length * fs * 0.62;
      const left = anchor === 'end' ? x - w : anchor === 'middle' ? x - w / 2 : x;
      assert.ok(left >= -ext + 2, name + ': "' + txt + '" tràn trái (' + left.toFixed(1) + ' < ' + (-ext + 2) + ')');
      assert.ok(left + w <= ext - 2, name + ': "' + txt + '" tràn phải (' + (left + w).toFixed(1) + ' > ' + (ext - 2) + ')');
      n++;
    }
    assert.ok(n >= 12, name + ': có nhãn số giờ');
  });
  assert.doesNotThrow(() => K.setSvgTime({ querySelector() { return null; }, setAttribute() {} }, K.mk(3, 0)));
  assert.doesNotThrow(() => K.setSvgTime(null, K.mk(3, 0)));
});

/* ---------- Store: nạp game.js vào window giả (audio → clock → profile → game) ---------- */
function loadStore(seed, players) {
  const st = makeStorage();
  if (seed != null) st.setItem('thap-dong-ho-v1', typeof seed === 'string' ? seed : JSON.stringify(seed));
  if (players) st.setItem('3hoa-players-v1', JSON.stringify(players));
  const w = loadGame('thap-dong-ho', ['js/audio.js', 'js/clock.js', 'js/profile.js', 'js/game.js'], { localStorage: st });
  return { X: w.__ThapDongHo, st: st, w: w };
}

test('store: legacy top-level progress migrates into players.p1 and is sanitized', () => {
  const { X, st } = loadStore({ sound: true, music: false, voice: true, unlocked: 3, levels: { L1: { best: 1200, stars: 3, done: 2 }, L2: { best: '1e309', stars: 99, done: 'x' }, L9: { best: 5 }, L3: [1] } });
  const S = X.Store;
  assert.equal(S.data.music, false);
  assert.equal(S.data.sound, true);
  assert.equal(S.data.fx, 'full');
  assert.equal(S.data.unlocked, undefined);
  assert.equal(S.data.levels, undefined);
  const p1 = S.data.players.p1;
  assert.equal(p1.unlocked, 3);
  deepJ(p1.levels.L1, { best: 1200, stars: 3, done: 2, fails: 0 });
  deepJ(p1.levels.L2, { best: 0, stars: 3, done: 0, fails: 0 });
  assert.equal(p1.levels.L9, undefined);
  assert.equal(p1.levels.L3, undefined);
  deepJ(p1.missed, {});
  deepJ(p1.stats, { plays: 0, correct: 0, wrong: 0, seconds: 0, byTopic: {}, last: 0 });
  assert.equal(S.p(), p1, 'active player is p1');
  assert.ok(S.isUnlocked(3) && !S.isUnlocked(4));
  assert.equal(S.rec('L1').best, 1200);
  const saved = JSON.parse(st.getItem('thap-dong-ho-v1'));
  assert.equal(saved.players.p1.unlocked, 3, 'migrated shape persisted');
  assert.equal(saved.unlocked, undefined);
});

test('store: hostile / junk storage never breaks boot or pollutes prototypes', () => {
  const junk = ['{not json', '[1,2]', '"x"', JSON.stringify({ levels: [1, 2], unlocked: '9', __proto__: { polluted: 1 } }),
    JSON.stringify({ players: { p1: { levels: { L1: { best: -5, stars: Infinity } }, unlocked: NaN, missed: { a: 1 }, stats: 'x' } } }),
    JSON.stringify({ players: [] }), 'x'.repeat(70000)];
  junk.forEach((raw) => {
    const { X } = loadStore(raw);
    assert.ok(X && X.Store.p(), 'boots with ' + raw.slice(0, 20));
    deepJ(Object.keys(X.Store.p().levels).filter((k) => !/^L[1-8]$/.test(k)), []);
    assert.ok(X.Store.p().unlocked >= 1 && X.Store.p().unlocked <= 8);
    assert.equal(({}).polluted, undefined);
    assert.equal(Object.getPrototypeOf(X.Store.data).polluted, undefined);
  });
  const { X } = loadStore(JSON.stringify({ levels: [1, 2], unlocked: '9', __proto__: { polluted: 1 } }));
  deepJ(X.Store.p().levels, {});
  assert.equal(X.Store.p().unlocked, 8, 'unlocked clamped to 8');
  const bad = loadStore({ players: { p1: { levels: { L1: { best: -5, stars: Infinity, done: 3.9 } }, unlocked: NaN, missed: { a: 1, b: { n: 2, info: { h: 99, m: -1, style: 'kem', lv: 3 } }, c: { n: 1, info: { style: 'nope' } } }, stats: { plays: -1, byTopic: { L1: { c: 3, w: 'x' } } } }, 'bad id!': { unlocked: 8 }, __proto__: { x: 1 } } }).X.Store;
  deepJ(bad.p().levels.L1, { best: 0, stars: 0, done: 3, fails: 0 }, 'Infinity → null → 0, 3.9 → 3');
  assert.equal(bad.p().unlocked, 1);
  deepJ(Object.keys(bad.p().missed), ['b']);
  deepJ(bad.p().missed.b.info, { h: 12, m: 0, style: 'kem', h24: null, lv: 3 });
  assert.equal(bad.p().stats.plays, 0);
  deepJ(bad.p().stats.byTopic.L1, { c: 3, w: 0, t: 0, plays: 0, cleared: 0 });
  assert.equal(bad.data.players['bad id!'], undefined);
});

test('store: missed / ok / reviewPool / addStats / resetActive and per-player isolation', () => {
  const { X, st } = loadStore(null);
  const S = X.Store, P = X.Players, K2 = X.K;
  const t = K2.mk(7, 45, 'kem', null, 5);
  const key = K2.key(t, '24') + '|' + t.style;
  const info = { h: 7, m: 45, style: 'kem', h24: null, lv: 5 };
  S.noteMissed(key, info);
  S.noteMissed(key, info);
  assert.equal(S.p().missed[key].n, 2);
  assert.equal(S.p().missed[key].ok, 0);
  deepJ(S.reviewPool().map((x) => x.key), [key]);
  deepJ(S.reviewPool((i) => i.style === 'plain'), []);
  S.noteOk(key);
  assert.equal(S.p().missed[key].ok, 1);
  S.noteMissed(key, info);
  assert.equal(S.p().missed[key].ok, 0, 'a new miss resets ok');
  S.noteOk(key); S.noteOk(key);
  assert.equal(S.p().missed[key], undefined, 'two correct answers retire the item');
  S.noteOk('unknown');
  for (let i = 0; i < 70; i++) S.noteMissed('k' + i, { h: 1 + i % 12, m: 0, style: 'plain', h24: null, lv: 1 });
  assert.equal(Object.keys(S.p().missed).length, 60, 'pool capped at 60');
  S.addStats({ topic: 'L1', correct: 8, wrong: 2, timeouts: 1, seconds: 61.4, cleared: true });
  S.addStats({ topic: 'L1', correct: 4, wrong: 0, seconds: 10, cleared: false });
  const s = S.p().stats;
  assert.equal(s.plays, 2); assert.equal(s.correct, 12); assert.equal(s.wrong, 2); assert.equal(s.seconds, 71);
  deepJ(s.byTopic.L1, { c: 12, w: 2, t: 1, plays: 2, cleared: 1 });
  assert.ok(s.last > 0);
  S.setRec('L1', { best: 900, stars: 2, done: 1 });
  assert.ok(S.unlock(2) && !S.unlock(2));
  // người chơi thứ hai: tiến trình riêng, người cũ giữ nguyên
  const mai = P.add('Mai', '🦉');
  assert.ok(mai && P.active().id === mai.id);
  assert.equal(S.p().unlocked, 1);
  deepJ(S.p().levels, {});
  deepJ(S.p().missed, {});
  assert.equal(S.data.players.p1.levels.L1.best, 900);
  S.setRec('L1', { best: 50, stars: 1, done: 1 });
  P.setActive('p1');
  assert.equal(S.rec('L1').best, 900);
  assert.equal(S.data.players[mai.id].levels.L1.best, 50);
  S.resetActive();
  assert.equal(S.rec('L1').best, 0);
  assert.equal(S.data.players[mai.id].levels.L1.best, 50, 'reset only touches the active player');
  // đã lưu và nạp lại được
  const again = loadGame('thap-dong-ho', ['js/audio.js', 'js/clock.js', 'js/profile.js', 'js/game.js'], { localStorage: st }).__ThapDongHo.Store;
  assert.equal(again.data.players[mai.id].levels.L1.best, 50);
  assert.equal(Object.keys(again.data.players.p1.missed).length, 0, 'reset persisted');
  assert.equal(again.data.players.p1.stats.plays, 0);
  assert.equal(again.data.players[mai.id].unlocked, 1);
});

test('store: legacy progress still migrates when the saved object already carries a players map that yields nothing', () => {
  // players rỗng (hoặc chỉ có id sai) + tiến trình cũ ở cấp cao nhất: không được đánh mất tiến trình
  const empty = loadStore({ players: {}, unlocked: 5, levels: { L1: { best: 800, stars: 2, done: 1 } } }).X.Store;
  assert.equal(empty.p().unlocked, 5);
  assert.equal(empty.rec('L1').best, 800);
  const badId = loadStore({ players: { 'bad id!': { unlocked: 8 } }, unlocked: 4, levels: { L2: { best: 300, stars: 1, done: 1 } } }).X.Store;
  assert.equal(Object.keys(badId.data.players).length, 1);
  assert.equal(badId.p().unlocked, 4);
  assert.equal(badId.rec('L2').best, 300);
  // players thật sự có dữ liệu: KHÔNG ghi đè bằng dữ liệu cũ
  const both = loadStore({ players: { p1: { unlocked: 2 } }, unlocked: 7, levels: { L1: { best: 999, stars: 3, done: 9 } } }).X.Store;
  assert.equal(both.p().unlocked, 2);
  assert.equal(both.rec('L1').best, 0);
});

test('gameplay: newLabel keeps a board readable — ≤ 1 pair within 2 minutes, Siêu Tháp always mixes sub-levels (C1)', () => {
  const { X } = loadStore(null);
  const K2 = X.K;
  const makeBoard = (level) => {
    X.G.level = level;
    const ex = [];
    for (let i = 0; i < 4; i++) ex.push(X.newLabel(ex, ex));
    return ex;
  };
  const finePairs = (b) => {
    let n = 0;
    for (let i = 0; i < b.length; i++) {
      for (let j = i + 1; j < b.length; j++) if (b[i].style !== '24' && b[j].style !== '24' && b[i].h === b[j].h && Math.abs(b[i].m - b[j].m) <= 2) n++;
    }
    return n;
  };
  const R = 1500;
  let boards6 = 0, single8 = 0;
  for (let i = 0; i < R; i++) {
    const b6 = makeBoard(K2.LEVELS[5]);
    assert.equal(b6.length, 4);
    assert.equal(new Set(b6.map((t) => K2.read(t))).size, 4, 'nhãn không trùng: ' + b6.map((t) => K2.read(t)).join(' | '));
    const p6 = finePairs(b6);
    assert.ok(p6 <= 1, 'màn 6: tối đa một cặp sát phút, gặp ' + p6 + ': ' + b6.map((t) => K2.read(t)).join(' | '));
    if (p6) boards6++;
    const b8 = makeBoard(K2.LEVELS[7]);
    assert.ok(finePairs(b8) <= 1, 'màn 8: tối đa một cặp sát phút');
    if (new Set(b8.map((t) => t.lv)).size < 2) single8++;
  }
  assert.ok(boards6 / R <= 0.15, 'màn 6: chỉ ' + (boards6 / R * 100).toFixed(1) + '% bảng có cặp sát phút (trước đây 45%)');
  assert.ok(single8 / R <= 0.05, 'màn 8: ' + (single8 / R * 100).toFixed(1) + '% bảng chỉ một kiểu bài (yêu cầu ≤ 5%)');
});

test('clock: ring labels stay readable on screen — rendered font size ≥ 11 px at every call site', () => {
  const fs = require('fs');
  const path = require('path');
  const css = fs.readFileSync(path.join(__dirname, '..', 'thap-dong-ho', 'style.css'), 'utf8');
  // Bề rộng thật do CSS quyết định (hộp nhìn rộng ra thì SVG phải được vẽ to ra tương ứng)
  const cssWidth = (sel) => {
    const re = new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{[^}]*width:\\s*(\\d+)px', 'g');
    const all = [];
    let m;
    while ((m = re.exec(css))) all.push(Number(m[1]));
    assert.ok(all.length, 'style.css có quy tắc cho ' + sel);
    return all;
  };
  const lesson = cssWidth('.lesson-demo .clock-svg.has-ring');       // máy tính bảng, điện thoại dọc, màn thấp
  const quiz = cssWidth('.quiz-clock .clock-svg.has-ring');
  const ringPx = (code, w) => {
    const box = Number(/viewBox="-?[\d.]+ -?[\d.]+ ([\d.]+)/.exec(code)[1]);
    const sizes = [];
    const re = /<text([^>]*)>(kém [\d]+|\d+)<\/text>/g;
    let m;
    while ((m = re.exec(code))) {
      const fsz = Number(/font-size="([\d.]+)"/.exec(m[1])[1]);
      if (fsz < 20) sizes.push(fsz * w / box);        // 21 = số giờ trên mặt số, không phải nhãn vòng
    }
    return Math.min.apply(null, sizes);
  };
  const kem = K.svg(K.mk(7, 45, 'kem', null, 5), { ring: 'kem' });
  const min = K.svg(K.mk(9, 15, 'plain', null, 3), { ring: 'min' });
  [[lesson[0], 'bài học'], [lesson[1], 'bài học (điện thoại)'], [quiz[0], 'hỏi đáp'], [quiz[1], 'hỏi đáp (điện thoại)']].forEach(([w, where]) => {
    assert.ok(ringPx(kem, w) >= 11, where + ' – nhãn "kém" chỉ ' + ringPx(kem, w).toFixed(1) + ' px (cần ≥ 11)');
    assert.ok(ringPx(min, w) >= 11, where + ' – nhãn vòng phút chỉ ' + ringPx(min, w).toFixed(1) + ' px');
  });
  // Mặt đồng hồ của bài học có vòng "kém" không được nhỏ hơn bài học thường
  const dial = (code, w) => 208 * w / Number(/viewBox="-?[\d.]+ -?[\d.]+ ([\d.]+)/.exec(code)[1]);
  const plainW = Number(/width:\s*(\d+)px/.exec(/\.lesson-demo \.clock-svg \{[^}]*\}/.exec(css)[0])[1]);
  assert.ok(dial(kem, lesson[0]) >= dial(K.svg(K.mk(3, 0, 'plain', null, 1), {}), plainW) * 0.84,
    'mặt đồng hồ bài học "giờ kém" ' + dial(kem, lesson[0]).toFixed(0) + ' px so với bài học thường ' + dial(K.svg(K.mk(3, 0), {}), plainW).toFixed(0) + ' px');
  // ... và không nhỏ hơn bản trước khi nâng cấp (177 px máy tính bảng / 131 px điện thoại)
  assert.ok(dial(kem, lesson[0]) >= 177, 'mặt đồng hồ bài học "giờ kém" ' + dial(kem, lesson[0]).toFixed(0) + ' px < 177 px');
  assert.ok(dial(kem, lesson[1]) >= 131, 'điện thoại: ' + dial(kem, lesson[1]).toFixed(0) + ' px < 131 px');
});

test('gameplay: stars scale with the length of the round (C5)', () => {
  const { X } = loadStore(null);
  assert.equal(X.twoStarLimit(8), 2);
  assert.equal(X.twoStarLimit(10), 2);
  assert.equal(X.twoStarLimit(12), 3);
  assert.equal(X.twoStarLimit(15), 3);
  X.K.LEVELS.forEach((l) => {
    assert.equal(X.starsFor(0, l.goal), 3, l.id + ': không sai → 3 sao');
    assert.equal(X.starsFor(X.twoStarLimit(l.goal), l.goal), 2, l.id + ': sai đúng ngưỡng → 2 sao');
    assert.equal(X.starsFor(X.twoStarLimit(l.goal) + 1, l.goal), 1, l.id + ': sai quá ngưỡng → 1 sao');
  });
  // Màn dài (15 câu) được sai nhiều hơn màn ngắn (8 câu) cho cùng 2 sao
  assert.equal(X.starsFor(3, 15), 2);
  assert.equal(X.starsFor(3, 8), 1);
});

test('gameplay: 🐢 chơi chậm sticks to the level across retries and clears on success (C3)', () => {
  const { X } = loadStore(null);
  const L1 = X.K.LEVELS[0], L2 = X.K.LEVELS[1];
  X.startLevel(L1, { slow: true });
  assert.equal(X.G.slow, true);
  assert.equal(X.G.slowFor, 'L1');
  X.startLevel(L1);                                   // 🔄 Thử lại / xem lại bài học: vẫn chậm
  assert.equal(X.G.slow, true, 'thử lại giữ chế độ chậm');
  X.startLevel(L2);                                   // màn khác: tốc độ thường
  assert.equal(X.G.slow, false);
  assert.equal(X.G.slowFor, null);
  X.startLevel(L1, { slow: true });
  X.G.state = 'playing';
  X.levelClear();                                     // qua màn: lần sau chơi lại ở tốc độ thường
  assert.equal(X.G.slowFor, null);
  X.startLevel(L1);
  assert.equal(X.G.slow, false);
});

test('gameplay: an on-demand hint never scores more than the automatic one', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'thap-dong-ho', 'js', 'game.js'), 'utf8');
  const auto = Number(/const HINT_POINTS = (\d+);/.exec(src)[1]);
  const asked = Number(/const ASK_HINT_POINTS = (\d+);/.exec(src)[1]);
  assert.ok(asked <= auto, 'xin gợi ý (' + asked + ') không được nhiều điểm hơn được gợi ý (' + auto + ')');
  assert.ok(asked > 0 && auto < 100, 'gợi ý vẫn ít điểm hơn tự đọc đúng');
});

test('audio: Voice.sentences splits long narration per sentence without lookbehind (Safari < 16.4 safe)', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'thap-dong-ho', 'js', 'audio.js'), 'utf8');
  assert.ok(!/\(\?<[=!]/.test(src), 'no regex lookbehind in audio.js (parse error on old iPadOS)');
  const V = loadGame('thap-dong-ho', ['js/audio.js']).Voice;
  deepJ(V.sentences('Kim ngắn chỉ giờ. Kim dài chỉ phút!  Đồng hồ chỉ mấy giờ? 3 giờ.'), ['Kim ngắn chỉ giờ.', 'Kim dài chỉ phút!', 'Đồng hồ chỉ mấy giờ?', '3 giờ.']);
  deepJ(V.sentences('   '), []);
  deepJ(V.sentences(null), []);
  deepJ(V.sentences('7 giờ 45 phút, tức là 8 giờ kém 15 phút'), ['7 giờ 45 phút, tức là 8 giờ kém 15 phút']);
  for (let n = 1; n <= 8; n++) {
    const parts = V.sentences(K.LESSONS[n].speech);
    assert.ok(parts.length >= 2 && parts.join(' ') === K.LESSONS[n].speech.replace(/\s+/g, ' ').trim(), 'lesson ' + n + ' narration is split losslessly');
    parts.forEach((p) => assert.ok(p.length < 200, 'each chunk short enough for Chrome TTS'));
  }
  // Không có giọng tiếng Việt (node): say() im lặng, không ném lỗi
  assert.doesNotThrow(() => V.say('Chào con'));
});

/* ---------- Giao diện: màu tên hai kim và hàng chip HUD (C12, C14) ---------- */
const readCss = () => {
  const fs = require('fs');
  const path = require('path');
  return fs.readFileSync(path.join(__dirname, '..', 'thap-dong-ho', 'style.css'), 'utf8');
};
/** Thân của quy tắc CSS có bộ chọn đúng bằng `sel` (không tính các bộ chọn dài hơn). */
const cssRule = (css, sel) => {
  const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp('(?:^|[}\\n])\\s*' + esc + '\\s*\\{([^}]*)\\}').exec(css);
  assert.ok(m, 'style.css có quy tắc "' + sel + '"');
  return m[1];
};
/** Giá trị một thuộc tính, đã thay var(--x) bằng giá trị khai báo ở :root. */
const cssValue = (css, sel, prop) => {
  const body = cssRule(css, sel);
  const m = new RegExp('(?:^|;)\\s*' + prop + '\\s*:\\s*([^;]+)').exec(body);
  assert.ok(m, 'quy tắc "' + sel + '" có thuộc tính ' + prop + ': ' + body);
  return m[1].trim().toLowerCase().replace(/var\(\s*(--[\w-]+)\s*\)/g, (all, name) => {
    const v = new RegExp('\\' + name + '\\s*:\\s*([^;]+)').exec(cssRule(css, ':root'));
    assert.ok(v, ':root khai báo ' + name);
    return v[1].trim().toLowerCase();
  });
};
/** Nội dung của khối @media bắt đầu bằng `head` (đếm ngoặc để lấy trọn khối). */
const mediaBlock = (css, head) => {
  const i = css.indexOf(head);
  assert.ok(i >= 0, 'style.css có khối "' + head + '"');
  let depth = 0, j = css.indexOf('{', i);
  const start = j;
  for (; j < css.length; j++) {
    if (css[j] === '{') depth++;
    else if (css[j] === '}' && --depth === 0) return css.slice(start + 1, j);
  }
  throw new Error('khối @media không đóng: ' + head);
};

test('lesson: hand names carry their own hand colour, different from ordinary bold text (C12)', () => {
  const css = readCss();
  const plain = cssValue(css, '.lesson-text b', 'color');
  const kh = cssValue(css, '.lesson-text b.kh', 'color');
  const km = cssValue(css, '.lesson-text b.km', 'color');
  // Lỗi cũ: <b class="km">kim dài</b> hiện đúng màu cam như MỌI chữ đậm khác → không ghép được với kim phút
  assert.notEqual(km, plain, 'tên "kim dài" phải khác màu chữ đậm thường (' + plain + ')');
  assert.notEqual(kh, plain, 'tên "kim ngắn" phải khác màu chữ đậm thường (' + plain + ')');
  assert.notEqual(kh, km, 'hai tên kim phải khác màu nhau');
  // Gạch chân đúng bằng màu kim vẽ trên mặt đồng hồ (cũng là màu ô chú thích dưới hình)
  const shared = cssRule(css, '.lesson-text b.kh, .lesson-text b.km');
  assert.match(shared, /text-decoration:\s*underline/, 'tên hai kim được gạch chân bằng màu kim');
  assert.equal(cssValue(css, '.lesson-text b.kh', 'text-decoration-color'), cssValue(css, '.hand-legend .lg.kh i', 'background'));
  assert.equal(cssValue(css, '.lesson-text b.km', 'text-decoration-color'), cssValue(css, '.hand-legend .lg.km i', 'background'));
  // Kim giờ vẽ màu #118ab2, kim phút #ff6b35 (js/clock.js) – ô chú thích phải trùng
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'thap-dong-ho', 'js', 'clock.js'), 'utf8');
  assert.match(src, /class="hand hour"[^]*?stroke="#118ab2"/, 'kim giờ vẽ màu #118ab2');
  assert.match(src, /class="hand minute"[^]*?stroke="#ff6b35"/, 'kim phút vẽ màu #ff6b35');
  assert.equal(cssValue(css, '.hand-legend .lg.kh i', 'background'), '#118ab2');
  assert.equal(cssValue(css, '.hand-legend .lg.km i', 'background'), '#ff6b35');
  // Chữ của chú thích cùng màu với tên kim trong bài để bé nối được hai nơi
  assert.equal(cssValue(css, '.hand-legend .lg.kh', 'color'), kh);
  assert.equal(cssValue(css, '.hand-legend .lg.km', 'color'), km);
  // Mọi lần nhắc tên kim trong bài học đều phải mang lớp màu
  for (let n = 1; n <= 8; n++) {
    const html = K.LESSONS[n].html;
    assert.ok(!/<b>\s*[Kk]im (ngắn|dài)/.test(html), 'bài học ' + n + ': tên kim in đậm phải có lớp kh/km');
    (html.match(/<b class="(kh|km)">([^<]*)<\/b>/g) || []).forEach((tag) => {
      const cls = /class="(kh|km)"/.exec(tag)[1], txt = />([^<]*)</.exec(tag)[1].toLowerCase();
      assert.ok(txt.indexOf(cls === 'kh' ? 'kim ngắn' : 'kim dài') >= 0, 'bài học ' + n + ': ' + tag + ' gắn sai lớp màu');
    });
  }
});

test('hud: the chip row never wraps on tablets, so the hint chip stays put (C14)', () => {
  const css = readCss();
  const wide = mediaBlock(css, '@media (min-width: 701px) {');
  assert.match(wide, /\.hud-top\s*\{[^}]*grid-template-columns:\s*auto 1fr auto/, 'cột trái lấy đúng bề rộng cần thiết');
  assert.match(wide, /\.hud-center\s*\{[^}]*justify-self:\s*center/);
  // Thiếu quy tắc này thì 5 chip (điểm, màn, ⏩, 📝, combo) xuống hai dòng và đẩy chip gợi ý xuống đè tiêu đề
  assert.match(wide, /\.hud-left\s*\{[^}]*flex-wrap:\s*nowrap/, 'hàng chip HUD không được xuống dòng từ 701 px');
  assert.match(wide, /\.hud-left \.stage-chip[^{]*\{[^}]*white-space:\s*nowrap/, 'từng chip không tự ngắt dòng');
  // Điện thoại (≤ 700 px) vẫn cho xuống dòng: HUD ở đó xếp hai hàng sẵn
  assert.match(cssRule(css, '.hud-left'), /flex-wrap:\s*wrap/);
  // Máy tính bảng hẹp: thu nhỏ đủ để cả 5 chip + thanh tiến độ + nút ⏸ nằm cùng một hàng
  const narrow = mediaBlock(css, '@media (min-width: 701px) and (max-width: 950px) {');
  assert.match(narrow, /\.score-box\s*\{[^}]*min-width:\s*(\d+)px/);
  assert.ok(Number(/\.progress \.bar\s*\{[^}]*width:\s*(\d+)px/.exec(narrow)[1]) <= 100, 'thanh tiến độ thu gọn dưới 950 px');
  // Nhãn màn chỉ ghi "Màn n" khi màn hình hẹp (chuỗi dài "Màn 5 · Giờ kém" làm tràn hàng)
  const game = require('fs').readFileSync(require('path').join(__dirname, '..', 'thap-dong-ho', 'js', 'game.js'), 'utf8');
  const fn = /function syncLevelChip\(\) \{[^]*?\n  \}/.exec(game);
  assert.ok(fn, 'game.js có syncLevelChip()');
  assert.match(fn[0], /G\.W >= 9\d\d/, 'chỉ ghép tên màn khi màn hình đủ rộng');
  assert.match(game, /\n    syncLevelChip\(\);/, 'layout() cập nhật nhãn màn khi xoay máy');
});
