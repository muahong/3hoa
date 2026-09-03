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
  assert.ok(/viewBox="-150 -150 300 300"/.test(r), 'kem ring viewBox extended');
  const m = K.svg(K.mk(9, 15, 'plain', null, 3), { ring: 'min', size: 120 });
  assert.ok(/width="120"/.test(m) && /text-anchor="middle"[^>]*>15<\/text>/.test(m));
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
