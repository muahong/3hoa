'use strict';
/* Kiểm thử logic thuần của Mê Cung Đồng Hồ (js/clock.js, js/mazes.js) và di trú dữ liệu của Store (js/game.js nạp trong window giả). */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame, makeStorage } = require('./lib/load.js');

const w = loadGame('me-cung-dong-ho', ['js/clock.js', 'js/mazes.js']);
const C = w.Clock, M = w.Mazes;
const N = 500;
const T = C.T;
const optKey = (op) => (op.clock ? 'c:' + C.key(op.clock) + '|' + (op.clockStyle || '') : 'l:' + op.label);
const plain = (o) => JSON.parse(JSON.stringify(o));   // đối tượng sinh trong vm khác realm: so sánh theo giá trị

/* ---------------- Đọc giờ ---------------- */
test('me-cung: fmtText / fmtDigital / periodOf / addMin đúng với mọi (h, m)', () => {
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m++) {
      const t = T(h, m);
      const plain = C.fmtText(t);
      assert.ok(plain.length > 0);
      assert.ok(plain.startsWith(C.h12(h) + ' giờ'), plain);
      if (m === 0) assert.equal(plain, C.h12(h) + ' giờ');
      else assert.ok(plain.endsWith(m + ' phút'), plain);
      // "kém" chỉ khi phút >= 35, đọc theo giờ kế tiếp
      const kem = C.fmtText(t, { kem: true });
      if (m >= 35) {
        assert.ok(kem.indexOf('kém') >= 0, kem);
        assert.ok(kem.startsWith(C.h12(h + 1) + ' giờ kém ' + (60 - m) + ' phút'), kem);
      } else assert.ok(kem.indexOf('kém') < 0, kem);
      // "rưỡi" chỉ ở 30 phút
      const ruoi = C.fmtText(t, { ruoi: true });
      assert.equal(ruoi.indexOf('rưỡi') >= 0, m === 30, ruoi);
      // 24 giờ
      const h24 = C.fmtText(t, { h24: true });
      assert.ok(h24.startsWith((h === 0 ? 24 : h) + ' giờ'), h24);
      // buổi
      const per = C.fmtText(t, { period: true });
      assert.ok(per.endsWith(' ' + C.periodOf(h)), per);
      // đồng hồ điện tử
      assert.match(C.fmtDigital(t), /^\d{1,2}:\d\d$/);
      assert.equal(C.fmtDigital(t, true), h + ':' + (m < 10 ? '0' : '') + m);
      assert.equal(C.fmtDigital(t), C.h12(h) + ':' + (m < 10 ? '0' : '') + m);
      // addMin
      for (const d of [5, 15, 30, 45, 60, 90]) {
        const a = C.addMin(t, d, true);
        assert.equal(a.h * 60 + a.m, (h * 60 + m + d) % 1440, 'addMin 24h');
        const b = C.addMin(C.addMin(t, d), -d);
        assert.equal(C.h12(b.h), C.h12(h)); assert.equal(b.m, m);
        assert.ok(C.addMin(t, d).h >= 1 && C.addMin(t, d).h <= 12, 'addMin 12h giữ miền 1–12');
      }
    }
  }
  const P = C.periodOf;
  for (let h = 1; h <= 10; h++) assert.equal(P(h), 'sáng');
  assert.equal(P(11), 'trưa'); assert.equal(P(12), 'trưa');
  for (let h = 13; h <= 18; h++) assert.equal(P(h), 'chiều');
  for (let h = 19; h <= 21; h++) assert.equal(P(h), 'tối');
  assert.equal(P(22), 'đêm'); assert.equal(P(23), 'đêm'); assert.equal(P(0), 'đêm');
  assert.equal(C.h12(0), 12); assert.equal(C.h12(12), 12); assert.equal(C.h12(13), 1);
  assert.equal(C.fmtText(T(7, 45), { kem: true }), '8 giờ kém 15 phút');
  assert.equal(C.fmtText(T(12, 55), { kem: true }), '1 giờ kém 5 phút');
  assert.equal(C.fmtText(T(15, 0), { period: true }), '3 giờ chiều');
});

/* ---------------- Lượt chơi (makeRound) ---------------- */
test('me-cung: makeRound × 500 mỗi màn – đúng một đồng hồ đúng, khóa duy nhất, đúng tập phút', () => {
  for (const L of C.LEVELS) {
    for (let i = 0; i < N; i++) {
      const r = C.makeRound(L);
      assert.equal(r.items.length, L.clocks, L.id + ' số đồng hồ');
      assert.equal(r.items.filter((t) => C.same(t, r.target)).length, 1, L.id + ' đúng một mục tiêu');
      const keys = r.items.map(C.key);
      assert.equal(new Set(keys).size, keys.length, L.id + ' khóa trùng: ' + keys.join(' '));
      assert.ok(r.html && r.speech, L.id + ' html/speech');
      assert.equal(r.review, false);
      if (L.kind !== 'elapsed') {
        // màn điện tử cố ý có đồng hồ nhiễu "ghi số kim dài chỉ làm phút" (7:09) -> phút 1..11 được phép
        r.items.forEach((t) => assert.ok(L.mins.indexOf(t.m) >= 0 || (L.kind === 'digital' && t.m >= 1 && t.m <= 11), L.id + ' phút ngoài tập: ' + C.key(t)));
        assert.ok(L.mins.indexOf(r.target.m) >= 0, L.id + ' mục tiêu ngoài tập phút');
        if (L.id === 'l6') r.items.forEach((t) => assert.ok(t.m >= 35, 'l6 chỉ giờ kém'));
        assert.ok(L.focus.indexOf(r.target.m) >= 0 || L.mins.indexOf(r.target.m) >= 0);
      }
      if (L.kind === 'period') {
        assert.ok((r.target.h >= 6 && r.target.h <= 11) || (r.target.h >= 13 && r.target.h <= 22), 'period h=' + r.target.h);
        assert.equal(r.style, 'digital24');
      } else if (L.kind === 'digital') {
        assert.equal(r.style, 'digital12');
        assert.ok(r.hudClock && C.same(r.hudClock, r.target));
        // A24: giọng đọc không đọc giờ của đồng hồ kim (đó là đáp án)
        assert.ok(r.speech.indexOf(C.fmtText(r.target)) < 0, 'l7 speech lộ đáp án: ' + r.speech);
      } else if (L.kind === 'elapsed') {
        assert.ok(r.extra && r.extra.start && r.extra.delta);
        assert.ok(C.same(r.target, C.addMin(r.extra.start, r.extra.delta)), 'elapsed target = start + delta');
        assert.ok(r.target.h >= 1 && r.target.h <= 12);
      } else {
        assert.equal(r.style, 'analog');
        assert.ok(r.target.h >= 1 && r.target.h <= 12);
      }
    }
  }
});

test('me-cung: makeRound với exclude không lặp mục tiêu; 500 màn mô phỏng không trùng mục tiêu', () => {
  for (const L of C.LEVELS) {
    for (let i = 0; i < N; i++) {
      const used = [];
      for (let rd = 0; rd < L.rounds; rd++) {
        const r = C.makeRound(L, null, used);
        assert.ok(used.indexOf(C.key(r.target)) < 0, L.id + ' lặp mục tiêu ' + C.key(r.target));
        used.push(C.key(r.target));
      }
    }
  }
});

test('me-cung: makeRound(level, forced) trả về đúng mục tiêu ôn lại với review = true', () => {
  for (const L of C.LEVELS) {
    for (let i = 0; i < 200; i++) {
      const base = C.makeRound(L);
      let forced, want;
      if (L.kind === 'elapsed') { forced = { start: { h: base.extra.start.h, m: base.extra.start.m }, delta: base.extra.delta }; want = base.target; }
      else { forced = { h: base.target.h, m: base.target.m }; want = base.target; }
      const r = C.makeRound(L, forced, []);
      assert.equal(r.review, true, L.id + ' review');
      assert.ok(C.same(r.target, want), L.id + ' mục tiêu ép: ' + C.key(r.target) + ' ≠ ' + C.key(want));
      assert.equal(r.items.filter((t) => C.same(t, r.target)).length, 1);
      assert.equal(new Set(r.items.map(C.key)).size, r.items.length);
      if (L.kind === 'elapsed') assert.deepEqual([r.extra.start.h, r.extra.start.m, r.extra.delta], [forced.start.h, forced.start.m, forced.delta]);
    }
    // forced không hợp lệ (phút ngoài tập của màn) -> bỏ qua, sinh ngẫu nhiên
    const bad = C.makeRound(L, L.kind === 'elapsed' ? { start: { h: 3, m: 7 }, delta: 99 } : { h: 3, m: 7 }, []);
    assert.equal(bad.review, false, L.id + ' forced không hợp lệ phải bị bỏ qua');
  }
});

test('me-cung: màn 8 – 3 lượt đầu không cộng "nhớ", lượt sau chỉ nhớ với số tròn 15 phút (C4)', () => {
  const L = C.levelById('l8');
  const CARRY = [15, 30, 45];
  for (let round = 0; round < 5; round++) {
    for (let i = 0; i < 600; i++) {
      const r = C.makeRound(L, null, [], { round: round });
      const st = r.extra.start, d = r.extra.delta;
      assert.ok(C.DELTAS.indexOf(d) >= 0, 'delta ngoài danh sách: ' + d);
      assert.ok(C.same(r.target, C.addMin(st, d)), 'target = start + delta');
      if (st.m + d > 60 && d !== 60) {
        assert.ok(round >= 3, 'lượt ' + round + ' không được cộng nhớ: ' + st.m + ' + ' + d);
        assert.ok(CARRY.indexOf(d) >= 0 && CARRY.indexOf(st.m) >= 0, 'nhớ chỉ với số tròn 15 phút: ' + st.m + ' + ' + d);
      }
    }
  }
  // các lượt sau phải THƯỜNG XUYÊN ra bài cộng qua giờ mới (bài học vừa dạy dạng này)
  for (const round of [3, 4]) {
    let carry = 0;
    const n = 2000;
    for (let i = 0; i < n; i++) {
      const r = C.makeRound(L, null, [], { round: round });
      if (r.extra.start.m + r.extra.delta > 60 && r.extra.delta !== 60) carry++;
    }
    assert.ok(carry / n >= 0.25, 'lượt ' + round + ': bài cộng qua giờ mới quá hiếm (' + Math.round(carry / n * 100) + '%)');
    assert.ok(carry / n <= 0.7, 'lượt ' + round + ': cộng qua giờ mới không được lấn hết (' + Math.round(carry / n * 100) + '%)');
  }
  // 3 lượt đầu vẫn tuyệt đối không có nhớ
  for (let i = 0; i < 2000; i++) {
    const r = C.makeRound(L, null, [], { round: i % 3 });
    assert.ok(r.extra.start.m + r.extra.delta <= 60 || r.extra.delta === 60, 'lượt đầu không được cộng nhớ');
  }
  // bài học có ví dụ "qua giờ mới" khớp với đề bài sinh ra
  const les = C.LESSONS.l8;
  assert.ok(les.lines.length >= 4, 'bài 8 có thêm dòng cộng qua giờ');
  assert.ok(les.lines.some((x) => /8 giờ 15 phút/.test(x)), 'bài 8 dạy ví dụ 7 giờ 45 + 30 phút');
  assert.ok(les.demos.some((t) => t.h === 8 && t.m === 15), 'bài 8 có ví dụ minh họa 8 giờ 15 phút');
});

/* ---------------- Giải thích ---------------- */
test('me-cung: explainRead / describeItem không rỗng, nhắc "kém" đúng chỗ', () => {
  for (let h = 1; h <= 12; h++) {
    for (const m of C.ALL_MINS) {
      const t = T(h, m);
      for (const style of ['analog', 'digital12', 'digital24']) {
        for (const kem of [true, false]) {
          const s = C.explainRead(t, { style: style, kem: kem });
          assert.ok(s.length > 20, s);
          if (style === 'analog') assert.equal(s.indexOf('kém') >= 0, kem && m >= 35, s);
        }
        const d = C.describeItem(t, style, { kem: false });
        assert.ok(d.length > 0);
      }
      assert.equal(C.describeItem(t, 'analog', { kem: true }).indexOf('kém') >= 0, m >= 35);
    }
  }
});

/* ---------------- Ngân hàng câu hỏi ---------------- */
function checkQuestion(q, where) {
  assert.ok(q && Array.isArray(q.options), where + ' câu hỏi');
  assert.ok(q.options.length >= 4, where + ' phải có ≥ 4 đáp án, có ' + q.options.length + ': ' + q.options.map((o) => o.label).join(' | '));
  assert.ok(q.answer >= 0 && q.answer < q.options.length, where + ' chỉ số đáp án');
  const keys = q.options.map(optKey);
  assert.equal(new Set(keys).size, keys.length, where + ' đáp án trùng: ' + keys.join(' | '));
  const labels = q.options.map((o) => o.label);
  assert.equal(new Set(labels).size, labels.length, where + ' nhãn trùng: ' + labels.join(' | '));
  q.options.forEach((o) => assert.ok(o.label && String(o.label).length > 0, where + ' nhãn rỗng'));
  assert.ok(q.text && q.explain && q.speech, where + ' text/explain/speech');
  assert.doesNotMatch(q.speech, /\d:\d\d/, where + ' giọng đọc chứa "7:45": ' + q.speech);
  assert.doesNotMatch(q.speech, /<[^>]+>/, where + ' giọng đọc chứa thẻ HTML');
  const is24 = /^l4\b/.test(where);   // màn "Sáng, chiều, tối" dùng giờ 13–24 là đúng ý
  labels.forEach((l) => {
    if (!is24) assert.doesNotMatch(String(l), /\b1[3-9] giờ/, where + ' nhãn "13 giờ": ' + l);
    assert.doesNotMatch(String(l), /số 1[3-9]\b/, where + ' nhãn "số 13": ' + l);
  });
  if (q.options[q.answer].clock === undefined && q.clock && q.clockStyle === 'analog' && /^Đồng hồ chỉ mấy giờ/.test(q.text)) {
    // qRead: nhãn đúng phải là cách đọc của đồng hồ (có thể là "kém"/"rưỡi" tuỳ tuỳ chọn)
    const t = q.clock, lab = q.options[q.answer].label;
    const ok = [C.fmtText(t), C.fmtText(t, { kem: true }), C.fmtText(t, { ruoi: true })].indexOf(lab) >= 0;
    assert.ok(ok, where + ' nhãn đúng ' + lab + ' ≠ ' + C.fmtText(t));
  }
  if (q.options[q.answer].clock && q.options[q.answer].hideLabel && /^Đồng hồ nào chỉ <b>/.test(q.text)) {
    const t = q.options[q.answer].clock;
    const m = /<b>(.+?)<\/b>/.exec(q.text);
    assert.ok(m && [C.fmtText(t), C.fmtText(t, { kem: true }), C.fmtText(t, { ruoi: true })].indexOf(m[1]) >= 0, where + ' đồng hồ đúng không khớp câu hỏi');
  }
}

test('me-cung: mọi câu hỏi trong ngân hàng × 500 – ≥ 4 đáp án, duy nhất, có giải thích, giọng đọc sạch', () => {
  for (const L of C.LEVELS) {
    const bank = C.QUIZ[L.id];
    assert.ok(bank && bank.length >= 5, L.id + ' ngân hàng');
    bank.forEach((gen, gi) => {
      for (let i = 0; i < N; i++) checkQuestion(gen(L), L.id + '[' + gi + ']');
    });
  }
});

test('me-cung: l4 – buổi trong câu hỏi khớp periodOf (không "10 giờ tối" cho 22 giờ)', () => {
  const L = C.levelById('l4');
  for (let i = 0; i < 3000; i++) {
    const q = C.QUIZ.l4[i % C.QUIZ.l4.length](L);
    const plain = q.text.replace(/<[^>]+>/g, '');
    const m = /(\d{1,2}) giờ (sáng|trưa|chiều|tối|đêm)/.exec(plain);
    if (!m) continue;
    const h12 = Number(m[1]), word = m[2];
    const ans = q.options[q.answer];
    let h24 = null;
    if (ans.clock) h24 = ans.clock.h;
    else { const mm = /^(\d{1,2}) giờ/.exec(ans.label); if (mm) { const n = Number(mm[1]); h24 = n > 12 ? n : (word === 'sáng' ? n : n + 12); } }
    if (h24 == null) continue;
    assert.equal(C.periodOf(h24 === 24 ? 0 : h24), word, 'l4: "' + plain + '" đáp án ' + (ans.label || C.key(ans.clock)));
    assert.equal(C.h12(h24), h12);
  }
});

test('me-cung: qRead / qPickClock / reviewQuestion mang khóa ôn lại; buildQuiz × 2000 mỗi màn', () => {
  for (const L of C.LEVELS) {
    for (let i = 0; i < 2000; i++) {
      const qs = C.buildQuiz(L, [], 3);
      assert.equal(qs.length, 3, L.id + ' số câu');
      qs.forEach((q, k) => checkQuestion(q, L.id + ' buildQuiz#' + k));
      // với lỗi trong mê cung: 4 câu, câu đầu là câu rút kinh nghiệm về đồng hồ đã chọn nhầm
      if (i % 10 === 0) {
        const r = C.makeRound(L);
        const shown = r.items.find((t) => !C.same(t, r.target));
        const mis = { shown: shown, target: r.target, style: r.style };
        const qs2 = C.buildQuiz(L, [mis], 3);
        assert.equal(qs2.length, 4, L.id + ' có lỗi -> 4 câu');
        assert.ok(C.same(qs2[0].clock, shown), L.id + ' câu đầu về đồng hồ đã chọn nhầm');
        assert.ok(qs2[0].reviewKey && qs2[0].reviewInfo, L.id + ' mistakeQuestion có reviewKey');
        qs2.forEach((q, k) => checkQuestion(q, L.id + ' buildQuiz(mistake)#' + k));
        // ôn lại thông minh: pool không rỗng -> có đúng một câu review:true, vẫn 3 câu (thay một câu ngân hàng)
        const info = L.kind === 'elapsed' ? { kind: 'elapsed', start: { h: r.extra.start.h, m: r.extra.start.m }, delta: r.extra.delta } : { kind: L.kind, h: r.target.h, m: r.target.m };
        const qs3 = C.buildQuiz(L, [], 3, [{ key: 'x', info: info, n: 2 }]);
        assert.equal(qs3.length, 3, L.id + ' pool -> vẫn 3 câu');
        const rev = qs3.filter((q) => q.review);
        assert.equal(rev.length, 1, L.id + ' đúng một câu ôn lại');
        assert.ok(rev[0].reviewKey && rev[0].reviewInfo, L.id + ' câu ôn lại có khóa');
        if (L.kind !== 'elapsed') assert.equal(rev[0].reviewKey, L.kind + '|' + C.key(T(L.kind === 'period' ? r.target.h : C.h12(r.target.h), r.target.m)));
        else assert.equal(rev[0].reviewKey, 'elapsed|' + C.key(r.extra.start) + '+' + r.extra.delta);
        checkQuestion(rev[0], L.id + ' reviewQuestion');
        // info không hợp lệ -> không có câu ôn lại, không lỗi
        assert.equal(C.reviewQuestion(L, { kind: L.kind, h: 3, m: 7 }), null);
        assert.equal(C.reviewQuestion(L, null), null);
      }
    }
    // mọi qRead / qPickClock trong ngân hàng đều có reviewKey đúng dạng "analog|h:m"
    if (L.kind === 'analog') {
      for (let i = 0; i < 200; i++) {
        C.QUIZ[L.id].forEach((gen) => {
          const q = gen(L);
          if (q.clock && q.clockStyle === 'analog' && q.reviewKey) {
            assert.equal(q.reviewKey, 'analog|' + C.key(q.clock));
            assert.deepEqual([q.reviewInfo.kind, q.reviewInfo.h, q.reviewInfo.m], ['analog', q.clock.h, q.clock.m]);
          }
        });
      }
    }
  }
});

/* ---------------- C5: bộ câu hỏi nào cũng có hình đồng hồ ---------------- */
test('me-cung: buildQuiz × 2000 mỗi màn – luôn có ít nhất một câu kèm hình đồng hồ (C5)', () => {
  const hasPic = (q) => !!(q.clock || q.options.some((op) => !!op.clock));
  for (const L of C.LEVELS) {
    let miss = 0;
    for (let i = 0; i < 2000; i++) {
      const qs = C.buildQuiz(L, [], 3);
      if (!qs.some(hasPic)) miss++;
      // hàm dùng chung của clock.js phải cho cùng kết quả
      qs.forEach((q) => assert.equal(C.hasPicture(q), hasPic(q), L.id + ' hasPicture'));
      // mọi câu lấy từ ngân hàng đều mang theo hàm sinh (để hỏi lại / sinh lại nếu cần)
      qs.forEach((q) => assert.ok(!q.gen || typeof q.gen === 'function', L.id + ' q.gen'));
    }
    assert.equal(miss, 0, L.id + ': ' + miss + '/2000 bộ câu hỏi không có hình đồng hồ');
    // có lỗi trong mê cung hoặc có pool ôn lại thì vẫn phải có hình
    for (let i = 0; i < 200; i++) {
      const r = C.makeRound(L);
      const shown = r.items.find((t) => !C.same(t, r.target));
      assert.ok(C.buildQuiz(L, [{ shown: shown, target: r.target, style: r.style }], 3).some(hasPic), L.id + ' (có lỗi) thiếu hình');
    }
  }
});

test('me-cung: mistakeQuestion cho từng kiểu đồng hồ – có cả đồng hồ đã chọn lẫn mục tiêu, đáp án là đồng hồ đã chọn', () => {
  const cases = [
    { L: C.levelById('l1'), style: 'analog' }, { L: C.levelById('l6'), style: 'analog' },
    { L: C.levelById('l4'), style: 'digital24' }, { L: C.levelById('l7'), style: 'digital12' }
  ];
  cases.forEach(({ L, style }) => {
    for (let i = 0; i < N; i++) {
      const r = C.makeRound(L);
      const shown = r.items.find((t) => !C.same(t, r.target));
      const q = C.mistakeQuestion(L, { shown: shown, target: r.target, style: style });
      checkQuestion(q, L.id + ' mistakeQuestion');
      assert.ok(C.same(q.clock, shown));
      const lab = (t) => (style === 'digital24' ? C.fmtText(t, { period: true }) : style === 'digital12' ? C.fmtText(t) : C.fmtText(t, { kem: !!L.kem, ruoi: false }));
      const labels = q.options.map((o) => o.label);
      assert.equal(q.options[q.answer].label, lab(shown), 'đáp án là đồng hồ đã chọn');
      assert.ok(labels.indexOf(lab(r.target)) >= 0, 'có mục tiêu trong đáp án');
      assert.equal(q.reviewKey.split('|')[1], C.key(shown));
    }
  });
});

/* ---------------- C17 / C22: hình minh họa trên HUD và SVG ---------------- */
test('me-cung: màn 8 luôn hiện đồng hồ kim của mốc bắt đầu trên HUD (C17)', () => {
  const l8 = C.levelById('l8');
  for (let i = 0; i < N; i++) {
    const r = C.makeRound(l8, null, [], { round: i % 5 });
    assert.ok(r.hudClock, 'l8 phải có hudClock');
    assert.equal(C.key(r.hudClock), C.key(r.extra.start), 'hudClock là mốc bắt đầu');
    assert.equal(C.key(C.addMin(r.extra.start, r.extra.delta)), C.key(r.target));
  }
  // các màn khác: chỉ màn đồng hồ điện tử mới hiện đồng hồ kim mẫu
  C.LEVELS.forEach((l) => {
    const r = C.makeRound(l);
    if (l.kind === 'analog' || l.kind === 'period') assert.equal(r.hudClock, null, l.id + ' không cần hudClock');
    else assert.ok(r.hudClock, l.id + ' cần hudClock');
  });
});

test('me-cung: svgClock / svgDigital – vòng số phút và ghi chú giờ/phút (C22)', () => {
  const t = T(7, 45);
  const plain2 = C.svgClock(t, { size: 120 });
  assert.ok(plain2.indexOf('aria-label="7 giờ 45 phút"') >= 0);
  assert.ok(plain2.indexOf('font-size="18"') < 0, 'không có vòng phút khi tắt');
  const mins = C.svgClock(t, { size: 180, minutes: true });
  assert.ok(mins.indexOf('font-size="18"') > 0, 'vòng số phút dùng cỡ 18');
  assert.ok(mins.indexOf('0/60') > 0);
  const d = C.svgDigital('7:45', { width: 150 });
  assert.ok(d.indexOf('viewBox="0 0 200 112"') > 0);
  assert.ok(d.indexOf('>giờ<') < 0);
  const dc = C.svgDigital('7:45', { width: 150, caption: true });
  assert.ok(dc.indexOf('viewBox="0 0 200 146"') > 0, 'có ghi chú thì khung cao hơn');
  assert.ok(dc.indexOf('>giờ<') > 0 && dc.indexOf('>phút<') > 0, 'có chữ giờ / phút');
  // nhãn được thoát ký tự khi chèn vào SVG
  assert.ok(C.svgDigital('<b>x', {}).indexOf('&lt;b&gt;x') > 0);
});

/* ---------------- Màn, bài học ---------------- */
test('me-cung: LEVELS / LESSONS hợp lệ', () => {
  assert.equal(C.LEVELS.length, 8);
  C.LEVELS.forEach((l, i) => {
    assert.equal(l.n, i + 1); assert.ok(l.id && l.title && l.desc && l.icon && l.takeaway);
    assert.ok([2, 3].indexOf(l.grade) >= 0);
    assert.ok(['analog', 'period', 'digital', 'elapsed'].indexOf(l.kind) >= 0);
    l.mins.forEach((m) => assert.ok(C.ALL_MINS.indexOf(m) >= 0, l.id + ' mins'));
    l.focus.forEach((m) => assert.ok(l.mins.indexOf(m) >= 0, l.id + ' focus ⊆ mins'));
    assert.ok(l.rounds >= 4 && l.clocks >= 4 && l.ghosts >= 1 && l.ghosts <= 4 && l.speed > 0);
    assert.ok(M.ids.indexOf(l.maze) >= 0, l.id + ' maze');
    const les = C.LESSONS[l.id];
    assert.ok(les && les.title && les.speech, l.id + ' lesson');
    assert.ok(les.lines.length >= 3 && les.demos.length >= 4, l.id + ' lesson lines/demos');
    les.demos.forEach((t) => assert.ok(t.h >= 0 && t.h < 24 && C.ALL_MINS.indexOf(t.m) >= 0));
    assert.equal(C.levelById(l.id), l);
  });
  assert.equal(C.levelById('nope'), null);
  // C20: bài 4 (buổi trong ngày) phải có ví dụ từ 13 giờ trở đi để dạy phép "+ 12"
  const l4 = C.LESSONS.l4;
  assert.ok(l4.digital === true, 'bài 4 hiện đồng hồ điện tử');
  assert.ok(l4.demos.some((t) => t.h >= 13), 'bài 4 cần ví dụ buổi chiều / tối');
  assert.ok(l4.demos.some((t) => t.h < 12), 'bài 4 cần ví dụ buổi sáng');
  // C4: bài 8 dạy cả trường hợp cộng qua giờ mới
  assert.ok(C.LESSONS.l8.lines.length >= 4 && C.LESSONS.l8.lines.some((s) => s.indexOf('8 giờ 15 phút') >= 0), 'bài 8 có ví dụ cộng nhớ');
  assert.ok(C.LESSONS.l8.demos.some((t) => t.h === 8 && t.m === 15));
});

/* ---------------- Mê cung ---------------- */
test('me-cung: mọi mê cung × 2 hướng – đi tới được mọi hạt, đủ chỗ đặt đồng hồ', () => {
  M.ids.forEach((id) => {
    [false, true].forEach((tr) => {
      const m = M.build(id, tr);
      const raw = M.RAW[id];
      assert.equal(m.rows, tr ? raw.rows[0].length : raw.rows.length);
      assert.equal(m.cols, tr ? raw.rows.length : raw.rows[0].length);
      assert.equal(m.transposed, tr);
      assert.ok(m.ghosts.length >= 1 && m.powers.length >= 2 && m.spots.length >= 6, id + ' thành phần');
      assert.ok(!m.wall[m.player.r][m.player.c], id + ' Cú Tí trên tường');
      m.spots.concat(m.powers).forEach((s) => assert.ok(M.isOpen(m, s.r, s.c), id + ' chỗ đặt không đi được'));
      const dist = M.distances(m, m.player.r, m.player.c);
      let dots = 0;
      for (let r = 0; r < m.rows; r++) for (let c = 0; c < m.cols; c++) if (m.dot[r][c]) { dots++; assert.ok(dist[r][c] >= 0, id + ' hạt không tới được ' + r + ',' + c); }
      assert.equal(dots, m.dotCount);
      m.spots.forEach((s) => assert.ok(dist[s.r][s.c] >= 0));
      // đường hầm: ô mép mở nối sang bên kia
      for (let r = 0; r < m.rows; r++) if (!m.wall[r][0]) assert.ok(M.norm(m, r, -1) && M.norm(m, r, -1).c === m.cols - 1, id + ' đường hầm');
    });
  });
});

/* ---------------- Store (game.js nạp trong window giả) ---------------- */
const GAME_FILES = ['js/audio.js', 'js/clock.js', 'js/mazes.js', 'js/profile.js', 'js/game.js'];
const blankStats = { plays: 0, correct: 0, wrong: 0, seconds: 0, byTopic: {}, last: 0 };
function loadStore(raw, playersRaw) {
  const st = makeStorage();
  if (raw != null) st.setItem('me-cung-dong-ho-v1', typeof raw === 'string' ? raw : JSON.stringify(raw));
  if (playersRaw) st.setItem('3hoa-players-v1', JSON.stringify(playersRaw));
  const win = loadGame('me-cung-dong-ho', GAME_FILES, { localStorage: st });
  return { S: win.__MeCung.Store, P: win.Players, st: st, win: win };
}

test('me-cung Store: dữ liệu cũ (unlocked/records ở mức trên) di trú vào players.p1 và được làm sạch', () => {
  const { S, st } = loadStore({ sound: true, music: false, voice: true, unlocked: 3, records: { l1: { best: 1200, stars: 3, passed: true, plays: 2 }, l2: { best: 'abc', stars: 99, passed: 'yes' }, zzz: { best: 5 } } });
  assert.equal(S.data.music, false); assert.equal(S.data.sound, true); assert.equal(S.data.fx, 'full');
  assert.equal(S.data.unlocked, undefined); assert.equal(S.data.records, undefined);
  const b = S.data.players.p1;
  assert.ok(b, 'bucket p1');
  assert.equal(b.unlocked, 3);
  assert.deepEqual(plain(b.records.l1), { best: 1200, stars: 3, passed: true, plays: 2 });
  assert.deepEqual(plain(b.records.l2), { best: 0, stars: 3, passed: false, plays: 0 });
  assert.equal(b.records.zzz, undefined, 'chỉ giữ màn có thật');
  assert.deepEqual(plain(b.missed), {}); assert.deepEqual(plain(b.stats), blankStats);
  // đã lưu lại hình dạng mới
  const saved = JSON.parse(st.getItem('me-cung-dong-ho-v1'));
  assert.equal(saved.unlocked, undefined); assert.equal(saved.players.p1.unlocked, 3);
  // accessor đi qua người chơi đang hoạt động (p1)
  assert.equal(S.p(), b);
  assert.equal(S.isUnlocked(2), true); assert.equal(S.isUnlocked(3), false);
  assert.equal(S.rec(C.LEVELS[0]).best, 1200);
});

test('me-cung Store: dữ liệu hỏng / độc hại không làm sập, __proto__ bị bỏ', () => {
  for (const raw of ['{"records":"abc"}', '{"records":{"l1":5},"unlocked":"1e400"}', 'not json', '[1,2]', '{"players":"x"}', '{"players":{"p1":{"unlocked":99,"records":{"l1":{"best":"1e400","stars":-4}},"missed":{"k":{"n":"x"}},"stats":{"plays":-1,"byTopic":{"l1":{"c":"a","w":3}}}}}}']) {
    const { S } = loadStore(raw);
    const b = S.p();
    assert.ok(b.unlocked >= 1 && b.unlocked <= C.LEVELS.length, raw);
    assert.deepEqual(Object.keys(b).sort(), ['missed', 'records', 'stats', 'unlocked']);
    for (const id in b.records) { const r = b.records[id]; assert.ok(Number.isFinite(r.best) && r.best >= 0 && r.stars >= 0 && r.stars <= 3, raw); }
    for (const k in b.missed) assert.ok(Number.isFinite(b.missed[k].n) && b.missed[k].n >= 0);
    assert.ok(b.stats.plays >= 0);
  }
  const { S } = loadStore('{"__proto__":{"polluted":1},"players":{"p1":{"__proto__":{"x":1},"unlocked":2}}}');
  assert.equal(({}).polluted, undefined);
  assert.equal(S.p().unlocked, 2);
  // khóa người chơi lạ bị loại, tối đa 60 mục ôn lại
  const missed = {}; for (let i = 0; i < 80; i++) missed['k' + i] = { n: 1, ok: 0, last: i, info: { kind: 'analog', h: 7, m: 30 } };
  const { S: S2 } = loadStore({ players: { 'bad id!': { unlocked: 8 }, p1: { unlocked: 4, missed: missed } } });
  assert.equal(S2.data.players['bad id!'], undefined);
  assert.equal(Object.keys(S2.data.players.p1.missed).length, 60);
  assert.ok(S2.data.players.p1.missed.k79 && !S2.data.players.p1.missed.k0, 'giữ mục mới nhất');
});

test('me-cung Store: noteMissed / noteOk / reviewPool / addStats / resetActive và tách biệt theo người chơi', () => {
  const { S, P } = loadStore(null);
  assert.equal(P.active().id, 'p1');
  S.noteMissed('analog|7:45', { kind: 'analog', h: 7, m: 45, style: 'analog' });
  S.noteMissed('analog|7:45', { kind: 'analog', h: 7, m: 45, style: 'analog' });
  S.noteMissed('elapsed|7:0+30', { kind: 'elapsed', start: { h: 7, m: 0 }, delta: 30 });
  assert.equal(S.p().missed['analog|7:45'].n, 2);
  let pool = S.reviewPool();
  assert.equal(pool.length, 2); assert.equal(pool[0].key, 'analog|7:45');
  assert.deepEqual(plain(pool[0].info), { kind: 'analog', h: 7, m: 45, style: 'analog' });
  pool = S.reviewPool((info) => info.kind === 'elapsed');
  assert.equal(pool.length, 1); assert.equal(pool[0].info.delta, 30);
  S.noteOk('analog|7:45'); assert.equal(S.p().missed['analog|7:45'].ok, 1);
  S.noteOk('analog|7:45'); assert.equal(S.p().missed['analog|7:45'], undefined, 'đúng 2 lần thì xoá');
  S.noteOk('không có'); // không lỗi
  S.addStats({ correct: 4, wrong: 1, seconds: 61.4, topic: 'l1' });
  assert.deepEqual(plain(S.p().stats.byTopic.l1), { c: 4, w: 1 });
  assert.equal(S.p().stats.plays, 1); assert.equal(S.p().stats.seconds, 61);
  S.setRec(C.LEVELS[0], { best: 900, stars: 2, passed: true, plays: 1 });
  assert.equal(S.unlock(1), true); assert.equal(S.unlock(1), false); assert.equal(S.p().unlocked, 2);
  // người chơi mới: bucket riêng, trống
  const p2 = P.add('Mai', '🦉');
  assert.equal(P.active().id, p2.id);
  assert.equal(S.p().unlocked, 1); assert.deepEqual(plain(S.p().records), {}); assert.equal(S.reviewPool().length, 0);
  assert.equal(S.data.players.p1.unlocked, 2); assert.equal(S.data.players.p1.records.l1.best, 900);
  S.noteMissed('analog|3:0', { kind: 'analog', h: 3, m: 0 });
  assert.equal(S.reviewPool().length, 1);
  S.resetActive();
  assert.deepEqual(plain(S.p()), plain(S.blank()));
  assert.equal(S.data.players.p1.unlocked, 2, 'reset chỉ xoá bé đang chơi');
  P.setActive('p1');
  assert.equal(S.p().unlocked, 2);
  // hơn 60 mục: bỏ mục cũ nhất
  for (let i = 0; i < 70; i++) S.noteMissed('k' + i, { kind: 'analog', h: 1, m: 0 });
  assert.ok(Object.keys(S.p().missed).length <= 60);
});
