'use strict';
/* Kiểm thử logic thuần của Xe Tăng Thời Gian (không cần trình duyệt):
   - đọc giờ tiếng Việt (12×60 thời điểm, các buổi, khoảng thời gian, đồng hồ điện tử)
   - mọi bộ sinh câu hỏi và mọi màn: đúng một đáp án, phương án không trùng, chữ đọc/giải thích nhất quán
   - ràng buộc từng màn (l1 chỉ giờ đúng, l6 chỉ giờ kém…), tạo lại câu ôn từ info
   - định nghĩa màn / bài học / hỏi đáp
   - Store (nạp cả game.js vào window giả): di trú dữ liệu cũ, làm sạch dữ liệu hỏng, kho ôn lại, thống kê, tách theo người chơi */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame, makeStorage } = require('./lib/load.js');

const GAME = 'xe-tang-thoi-gian';
const KEY = 'xe-tang-thoi-gian-v1';
const w = loadGame(GAME, ['js/clock.js', 'js/levels.js']);
const C = w.Clock, L = w.Levels;
const N = 600;
const BAD = [/số số/, /qua số 0\b/, / 0 phút/, /\b12 giờ( \d+ phút)? (sáng|chiều|tối)\b/, /undefined/, /NaN/];
const SESSION_OF = (h) => (h === 0 || h === 24) ? 'đêm' : h <= 10 ? 'sáng' : h <= 12 ? 'trưa' : h <= 18 ? 'chiều' : h <= 21 ? 'tối' : 'đêm';
/** So sánh sâu qua JSON: đối tượng từ window giả (vm) có prototype khác realm của test */
const plain = (o) => JSON.parse(JSON.stringify(o));
const eqJ = (a, b, msg) => assert.deepEqual(plain(a), plain(b), msg);

function texts(q) {
  const out = [q.prompt.text, q.prompt.speech, q.answer.label, q.answer.speech, q.explain];
  q.options.forEach((o) => { out.push(o.label); out.push(o.speech); });
  return out;
}

/** Bất biến chung cho mọi câu hỏi */
function checkQ(q, tag) {
  assert.ok(q && typeof q === 'object', tag + ': là đối tượng');
  assert.ok(Array.isArray(q.options) && q.options.length >= 3, tag + ': ≥ 3 phương án (' + (q.options && q.options.length) + ')');
  const oks = q.options.filter((o) => o.ok);
  assert.equal(oks.length, 1, tag + ': đúng một đáp án đúng');
  const labels = q.options.map((o) => o.label);
  assert.equal(new Set(labels).size, labels.length, tag + ': nhãn trùng: ' + labels.join(' | '));
  const clocks = q.options.filter((o) => o.clock);
  for (let i = 0; i < clocks.length; i++) {
    const c = clocks[i].clock;
    assert.ok(Number.isInteger(c.h) && c.h >= 1 && c.h <= 12, tag + ': giờ đồng hồ 1..12');
    assert.ok(Number.isInteger(c.m) && c.m >= 0 && c.m <= 59, tag + ': phút đồng hồ 0..59');
    for (let j = i + 1; j < clocks.length; j++) assert.ok(!C.sameTime(c, clocks[j].clock), tag + ': hai đồng hồ cùng giờ');
  }
  assert.equal(q.answer.label, oks[0].label, tag + ': answer.label khớp phương án đúng');
  assert.ok(typeof q.answer.speech === 'string' && q.answer.speech.trim(), tag + ': answer.speech');
  assert.ok(typeof q.explain === 'string' && q.explain.trim().length > 10, tag + ': explain');
  assert.ok(q.prompt && typeof q.prompt.text === 'string' && q.prompt.text.trim() && typeof q.prompt.speech === 'string' && q.prompt.speech.trim(), tag + ': prompt');
  assert.ok(typeof q.key === 'string' && q.key.length > 3, tag + ': key');
  assert.ok(q.info && q.info.kind === q.kind, tag + ': info.kind = ' + q.kind);
  (q.prompt.clocks || []).forEach((t) => assert.ok(t.h >= 1 && t.h <= 12 && t.m >= 0 && t.m <= 59, tag + ': đồng hồ đề bài'));
  q.options.forEach((o) => {
    assert.ok(typeof o.label === 'string' && o.label.trim(), tag + ': nhãn rỗng');
    assert.ok(typeof o.speech === 'string' && o.speech.trim(), tag + ': speech rỗng');
    if (!o.ok) assert.notEqual(o.label, q.answer.label, tag + ': đáp án nhiễu trùng đáp án đúng');
  });
  texts(q).forEach((s) => BAD.forEach((re) => assert.ok(!re.test(String(s)), tag + ': chữ lỗi "' + s + '" (' + re + ')')));
}

/* ---------------- Đọc giờ ---------------- */
test('readTime: đủ 12×60 thời điểm theo 3 cách đọc plain / ruoi / kem', () => {
  for (let h = 1; h <= 12; h++) {
    for (let m = 0; m < 60; m++) {
      const plain = m === 0 ? h + ' giờ' : h + ' giờ ' + m + ' phút';
      assert.equal(C.readTime(h, m, 'plain'), plain);
      assert.equal(C.readTime(h, m), plain);
      assert.equal(C.readTime(h, m, 'ruoi'), m === 30 ? h + ' giờ rưỡi' : plain, 'rưỡi chỉ khi 30 phút');
      assert.equal(C.readTime(h, m, 'kem'), m > 30 ? C.h12(h + 1) + ' giờ kém ' + (60 - m) + ' phút' : plain, 'kém chỉ khi > 30 phút');
    }
  }
  assert.equal(C.readTime(0, 0), '12 giờ');
  assert.equal(C.readTime(13, 5), '1 giờ 5 phút');
  assert.equal(C.readTime(12, 55, 'kem'), '1 giờ kém 5 phút');
});

test('readSession / session: ranh giới các buổi theo sách Toán 2', () => {
  for (let h = 0; h <= 24; h++) assert.equal(C.session(h), SESSION_OF(h), 'buổi của ' + h + ' giờ');
  assert.equal(C.readSession(12, 0), '12 giờ trưa');
  assert.equal(C.readSession(0, 5), '12 giờ 5 phút đêm');
  assert.equal(C.readSession(24, 0), '12 giờ đêm');
  assert.equal(C.readSession(15, 20), '3 giờ 20 phút chiều');
  assert.equal(C.readSession(19, 0), '7 giờ tối');
  assert.equal(C.readSession(7, 0), '7 giờ sáng');
  assert.equal(C.read24(15, 0), '15 giờ');
  assert.equal(C.read24(15, 20), '15 giờ 20 phút');
});

test('addMinutes / readDuration / digital / digitalOpt', () => {
  eqJ(C.addMinutes(11, 45, 30), { h: 12, m: 15 });
  eqJ(C.addMinutes(12, 0, 60), { h: 1, m: 0 });
  eqJ(C.addMinutes(1, 0, -30), { h: 12, m: 30 });
  assert.equal(C.readDuration(75), '1 giờ 15 phút');
  assert.equal(C.readDuration(60), '1 giờ');
  assert.equal(C.readDuration(30), '30 phút');
  assert.equal(C.digital(7, 5), '07:05');
  assert.equal(C.digital(19, 30), '19:30');
  const d = C.digitalOpt(7, 5, true);
  assert.equal(d.label, '07:05');
  assert.equal(d.speech, '7 giờ 5 phút', 'giọng đọc không đọc số 0 đứng đầu');
  assert.equal(d.ok, true);
});

test('hourHandText / minuteHandText / explainRead: phút 1–4 nói "số 12", không "số 0"', () => {
  [1, 2, 3, 4].forEach((m) => {
    assert.ok(C.minuteHandText(m).indexOf('số 12') >= 0 && C.minuteHandText(m).indexOf('số 0') < 0, 'minuteHandText(' + m + ') = ' + C.minuteHandText(m));
    const ex = C.explainRead({ h: 11, m: m }, 'plain');
    assert.ok(ex.indexOf('số 12') >= 0 && !/qua số 0\b/.test(ex), 'explainRead 11:' + m + ' = ' + ex);
  });
  assert.equal(C.minuteHandText(0), 'số 12');
  assert.equal(C.minuteHandText(15), 'số 3');
  assert.equal(C.minuteHandText(17), 'qua số 3 thêm 2 vạch');
  assert.equal(C.hourHandText({ h: 3, m: 0 }), 'đúng số 3');
  assert.equal(C.hourHandText({ h: 3, m: 30 }), 'ở giữa số 3 và số 4');
  assert.equal(C.hourHandText({ h: 12, m: 50 }), 'gần tới số 1');
  assert.ok(C.explainRead({ h: 4, m: 45 }, 'kem').indexOf('5 giờ kém 15 phút') >= 0);
});

/* ---------------- Bộ sinh câu hỏi ---------------- */
test('readQ: ' + N + ' câu, đáp án khớp đồng hồ đề bài', () => {
  for (let i = 0; i < N; i++) {
    const q = C.readQ({ minutes: [0, 15, 30, 45], styles: ['plain', 'ruoi', 'kem'], n: 4 });
    checkQ(q, 'readQ#' + i);
    assert.equal(q.kind, 'read');
    assert.equal(q.prompt.clocks.length, 1);
    const t = q.prompt.clocks[0];
    assert.equal(q.answer.label, C.readTime(t.h, t.m, q.info.style));
    eqJ([q.info.h, q.info.m], [t.h, t.m]);
    assert.ok(q.options.every((o) => !o.clock));
  }
});

test('matchQ: ' + N + ' câu, đồng hồ đúng khớp nhãn, giọng đọc không "số số"', () => {
  for (let i = 0; i < N; i++) {
    const q = C.matchQ({ minutes: [0, 30], n: 3 });
    checkQ(q, 'matchQ#' + i);
    assert.equal(q.kind, 'match');
    const ok = q.options.find((o) => o.ok);
    assert.ok(ok.clock && C.sameTime(ok.clock, { h: q.info.h, m: q.info.m }));
    assert.equal(q.answer.label, C.readTime(q.info.h, q.info.m, q.info.style));
    assert.ok(q.options.every((o) => o.clock && [0, 30].indexOf(o.clock.m) >= 0), 'chỉ dùng số phút đã học');
    assert.ok(/kim dài chỉ (số \d+|qua số)/.test(q.answer.speech), q.answer.speech);
  }
});

test('fiveQ: ' + N + ' câu, số × 5', () => {
  for (let i = 0; i < N; i++) {
    const q = C.fiveQ({ n: 4 });
    checkQ(q, 'fiveQ#' + i);
    assert.equal(q.kind, 'five');
    assert.equal(q.answer.label, q.info.n5 * 5 + ' phút');
    assert.equal(q.prompt.clocks[0].m, q.info.n5 * 5);
    assert.ok(q.prompt.hideHour);
  }
});

test('h24Q: ' + N + ' câu, 4 biến thể đúng quy ước 24 giờ', () => {
  const seen = new Set();
  for (let i = 0; i < N; i++) {
    const q = C.h24Q({ n: 4 });
    checkQ(q, 'h24Q#' + i);
    assert.equal(q.kind, 'h24');
    const v = q.info.variant, h24 = q.info.h24;
    seen.add(v);
    if (v === 0 || v === 2) { assert.ok(h24 >= 13 && h24 <= 23); assert.equal(q.answer.label, h24 + ' giờ'); }
    else if (v === 1) { assert.ok(h24 >= 13 && h24 <= 23); assert.equal(q.answer.label, C.readSession(h24, 0)); }
    else { assert.equal(v, 3); assert.equal(q.answer.label, 'Buổi ' + C.session(h24)); }
  }
  assert.equal(seen.size, 4, 'đủ 4 biến thể');
});

test('kemQ: ' + N + ' câu, "giờ kém" nhất quán với giờ thường', () => {
  for (let i = 0; i < N; i++) {
    const q = C.kemQ({ n: 4 });
    checkQ(q, 'kemQ#' + i);
    assert.equal(q.kind, 'kem');
    const { h, m, variant } = q.info;
    assert.ok([40, 45, 50, 55].indexOf(m) >= 0, 'phút > 30');
    const kem = C.readTime(h, m, 'kem'), plain = C.readTime(h, m, 'plain');
    if (variant === 1) assert.equal(q.answer.label, plain);
    else assert.equal(q.answer.label, kem);
    if (variant === 3) { const ok = q.options.find((o) => o.ok); assert.ok(ok.clock && C.sameTime(ok.clock, { h: h, m: m })); }
    if (variant === 2) eqJ(q.prompt.clocks[0], { h: h, m: m });
  }
});

test('exactQ: ' + N + ' câu, từng phút & điện tử', () => {
  const seen = new Set();
  for (let i = 0; i < N; i++) {
    const q = C.exactQ({ n: 4 });
    checkQ(q, 'exactQ#' + i);
    const v = q.info.variant, m = q.info.m;
    seen.add(v);
    assert.ok(m % 5 !== 0 && m >= 1 && m <= 59, 'phút lẻ');
    if (v === 0) { assert.equal(q.kind, 'exact'); assert.equal(q.answer.label, C.readTime(q.info.h, m)); eqJ(q.prompt.clocks[0], { h: q.info.h, m: m }); }
    else if (v === 1) { assert.equal(q.kind, 'digital'); assert.equal(q.answer.label, C.readSession(q.info.h24, m)); assert.equal(q.prompt.digital, C.digital(q.info.h24, m)); }
    else if (v === 2) { assert.equal(q.kind, 'digital'); assert.equal(q.answer.label, C.digital(q.info.h24, m)); assert.ok(q.options.every((o) => /^\d{2}:\d{2}$/.test(o.label))); }
    else { assert.equal(q.kind, 'exact'); const ok = q.options.find((o) => o.ok); assert.ok(ok.clock && C.sameTime(ok.clock, { h: q.info.h, m: m })); }
  }
  assert.equal(seen.size, 4);
});

test('elapsedQ: ' + N + ' câu, giờ kết thúc = bắt đầu + khoảng', () => {
  const seen = new Set();
  for (let i = 0; i < N; i++) {
    const q = C.elapsedQ({ n: 4 });
    checkQ(q, 'elapsedQ#' + i);
    assert.equal(q.kind, 'elapsed');
    const { sh, sm, dur, variant } = q.info;
    seen.add(variant);
    const end = C.addMinutes(sh, sm, dur);
    if (variant === 0) {
      assert.equal(q.answer.label, C.readDuration(dur));
      eqJ(q.prompt.clocks, [{ h: sh, m: sm }, end]);
    } else if (variant === 1) {
      const ok = q.options.find((o) => o.ok);
      assert.ok(ok.clock && C.sameTime(ok.clock, end));
    } else {
      assert.equal(q.answer.label, C.readTime(end.h, end.m));
    }
  }
  assert.equal(seen.size, 3);
});

/* ---------------- Từng màn ---------------- */
test('mọi màn: ' + N + ' câu / màn qua gen() (C.fresh) thỏa bất biến và ràng buộc kiến thức', () => {
  const ALLOWED_M = { l1: [0], l2: [0, 30], l3: [0, 15, 30] };
  L.LEVELS.forEach((lv) => {
    const kinds = new Set();
    for (let i = 0; i < N; i++) {
      const q = lv.gen();
      checkQ(q, lv.id + '#' + i);
      kinds.add(q.kind);
      const allClocks = q.options.filter((o) => o.clock).map((o) => o.clock).concat(q.prompt.clocks || []);
      if (lv.n <= 5) {
        assert.ok(texts(q).every((s) => s.indexOf('kém') < 0), lv.id + ': không có "giờ kém" trước màn 6');
        allClocks.forEach((c) => assert.equal(c.m % 5, 0, lv.id + ': chỉ số phút chẵn 5'));
      }
      if (ALLOWED_M[lv.id]) allClocks.forEach((c) => assert.ok(ALLOWED_M[lv.id].indexOf(c.m) >= 0, lv.id + ': phút ' + c.m + ' chưa học'));
      if (lv.id === 'l6') assert.equal(q.kind, 'kem');
      if (lv.id === 'l7') assert.ok(q.kind === 'exact' || q.kind === 'digital');
      if (lv.id === 'l8') assert.equal(q.kind, 'elapsed');
      if (lv.id === 'l4') assert.equal(q.kind, 'h24');
    }
    if (lv.id === 'l9') assert.ok(kinds.size >= 5, 'l9 trộn ≥ 5 dạng: ' + Array.from(kinds).join(','));
  });
});

test('fromInfo: tạo lại đúng câu (cùng dạng, cùng đề, cùng đáp án) với đáp án nhiễu hợp lệ', () => {
  L.LEVELS.forEach((lv) => {
    for (let i = 0; i < 300; i++) {
      const q = lv.gen();
      const q2 = C.fromInfo(q.info, { n: 4 });
      assert.ok(q2, lv.id + ': fromInfo trả về câu hỏi cho ' + JSON.stringify(q.info));
      checkQ(q2, lv.id + ' fromInfo#' + i);
      assert.equal(q2.kind, q.kind);
      assert.equal(q2.prompt.text, q.prompt.text);
      assert.equal(q2.answer.label, q.answer.label);
      assert.equal(q2.key, q.key, 'cùng key để noteOk xóa đúng mục');
      eqJ(q2.info, q.info);
    }
  });
  // info hỏng → null, không ném lỗi
  [null, 42, {}, { kind: 'read', h: 99, m: 0 }, { kind: 'kem', h: 3, m: 10 }, { kind: 'elapsed', sh: 3, sm: 0, dur: 7 }, { kind: 'xyz' }, { kind: 'five', n5: 12 }].forEach((info) => {
    assert.equal(C.fromInfo(info, { n: 4 }), null, 'info hỏng: ' + JSON.stringify(info));
  });
});

test('định nghĩa màn, bài học, hỏi đáp hợp lệ', () => {
  assert.equal(L.LEVELS.length, 9);
  L.LEVELS.forEach((lv, i) => {
    assert.equal(lv.id, 'l' + (i + 1));
    assert.equal(lv.n, i + 1);
    assert.ok(lv.title && lv.icon && lv.desc);
    assert.ok(lv.questions >= 8 && lv.fall > 0 && lv.speed >= 1, lv.id + ' questions/fall/speed');
    assert.ok(lv.lesson && lv.lesson.intro && lv.lesson.speech);
    assert.ok(lv.lesson.points.length >= 3, lv.id + ' ≥ 3 ý bài học');
    assert.ok(lv.lesson.examples.length >= 3, lv.id + ' ≥ 3 ví dụ');
    lv.lesson.examples.forEach((e) => assert.ok(e.h >= 1 && e.h <= 12 && e.m >= 0 && e.m <= 59, lv.id + ' ví dụ ' + JSON.stringify(e)));
    assert.ok(Array.isArray(lv.quiz) && lv.quiz.length >= 5, lv.id + ' ngân hàng hỏi đáp');
    lv.quiz.forEach((it, k) => {
      const tag = lv.id + ' quiz#' + k;
      assert.ok(typeof it.q === 'string' && it.q.trim(), tag + ' q');
      assert.ok(Array.isArray(it.a) && it.a.length >= 3, tag + ' ≥ 3 phương án');
      assert.equal(new Set(it.a).size, it.a.length, tag + ' phương án trùng');
      assert.ok(typeof it.explain === 'string' && it.explain.trim(), tag + ' explain');
      if (it.clock) assert.ok(it.clock.h >= 1 && it.clock.h <= 12 && it.clock.m >= 0 && it.clock.m <= 59, tag + ' clock');
      if (it.digital) assert.ok(/^\d{2}:\d{2}$/.test(it.digital), tag + ' digital');
    });
  });
  assert.equal(L.byId('l1'), L.LEVELS[0]);
  assert.equal(L.byId('nope'), null);
  assert.equal(L.next(L.LEVELS[8]), null);
  assert.equal(L.prev(L.LEVELS[0]), null);
  assert.equal(L.next(L.LEVELS[0]), L.LEVELS[1]);
  assert.ok(L.LEVELS[8].quiz.length >= 20, 'l9 gom ngân hàng các màn trước');
});

/* ---------------- Store (nạp cả game.js vào window giả) ---------------- */
const FULL = ['js/audio.js', 'js/clock.js', 'js/levels.js', 'js/profile.js', 'js/game.js'];
const loadFull = (st) => loadGame(GAME, FULL, { localStorage: st });

test('Store: dữ liệu cũ (progress ở cấp cao nhất) di trú vào players.p1, ép kiểu, lưu lại', () => {
  const st = makeStorage();
  st.setItem(KEY, '{"sound":true,"music":false,"voice":true,"progress":{"l1":{"best":1500,"stars":3,"passed":true,"plays":2,"quizBest":4},"l2":{"best":"abc","stars":9,"passed":"yes","quizBest":99},"l3":"x","zzz":{"best":5}},"unlockAll":"true","__proto__":{"polluted":1},"constructor":{"prototype":{"polluted":1}}}');
  const g = loadFull(st);
  const S = g.__XeTang.Store;
  assert.equal(S.data.music, false, 'thiết lập thiết bị giữ nguyên');
  assert.equal(S.data.sound, true);
  assert.equal(S.data.fx, 'full');
  assert.equal(S.data.progress, undefined, 'không còn progress ở cấp cao nhất');
  eqJ(S.data.players.p1.progress.l1, { best: 1500, stars: 3, passed: true, plays: 2, quizBest: 4 });
  eqJ(S.data.players.p1.progress.l2, { best: 0, stars: 3, passed: false, plays: 0, quizBest: 4 }, 'giá trị sai kiểu bị ép về khoảng hợp lệ');
  eqJ(S.data.players.p1.progress.l3, { best: 0, stars: 0, passed: false, plays: 0, quizBest: 0 }, 'progress[id] không phải object → mặc định (A1)');
  assert.equal(S.data.players.p1.progress.zzz, undefined, 'chỉ giữ id màn có thật');
  assert.equal(S.data.players.p1.unlockAll, false, 'unlockAll phải là boolean true');
  assert.equal(S.data.players.p1.polluted, undefined);
  assert.equal(({}).polluted, undefined);
  const saved = JSON.parse(st.getItem(KEY));
  assert.ok(saved.players && saved.players.p1 && saved.progress === undefined, 'hình dạng mới đã được lưu');
  assert.equal(S.prog('l1').best, 1500);
  assert.equal(S.prog('l3').best, 0);
  const GL = g.Levels;   // LEVELS của chính window đó (isUnlocked so sánh theo tham chiếu)
  assert.equal(S.isUnlocked(GL.LEVELS[0]), true);
  assert.equal(S.isUnlocked(GL.LEVELS[1]), true, 'l1 đã qua → mở l2');
  assert.equal(S.isUnlocked(GL.LEVELS[2]), false);
  // Nạp lại từ hình dạng mới: không di trú lần nữa, dữ liệu giữ nguyên
  const S2 = loadFull(st).__XeTang.Store;
  assert.equal(S2.prog('l1').best, 1500);
});

test('Store: dữ liệu hỏng / thù địch được làm sạch, quá lớn thì đặt lại', () => {
  const st = makeStorage();
  st.setItem(KEY, '{not json');
  let S = loadFull(st).__XeTang.Store;
  assert.equal(S.corrupt, true);
  eqJ(Object.keys(S.data.players), []);
  assert.equal(S.prog('l1').best, 0);
  st.setItem(KEY, JSON.stringify({ players: 'nope', progress: null }));
  S = loadFull(st).__XeTang.Store;
  eqJ(Object.keys(S.data.players), []);
  const missed = {};
  for (let i = 0; i < 80; i++) missed['k' + i] = { n: i, ok: 'x', last: i, info: { kind: 'read', h: 3, m: 0, level: 1, evil: 'x', style: 'plain' } };
  missed['x'.repeat(200)] = { n: 1 };
  st.setItem(KEY, JSON.stringify({ fx: 'lite', players: { p1: { progress: { l1: { best: 1e12, stars: -4, plays: 'many' } }, missed: missed, stats: { plays: -1, correct: 'a', seconds: 1e20, byTopic: { l1: { c: 5, w: 1 }, bad: 'x' } } }, 'bad id!': { progress: {} }, '../x': {} } }));
  S = loadFull(st).__XeTang.Store;
  assert.equal(S.data.fx, 'lite');
  eqJ(Object.keys(S.data.players), ['p1'], 'id không hợp lệ bị bỏ');
  const b = S.data.players.p1;
  eqJ(b.progress.l1, { best: 1e7, stars: 0, passed: false, plays: 0, quizBest: 0 });
  assert.equal(Object.keys(b.missed).length, 60, 'kho ôn lại tối đa 60 mục');
  assert.ok(Object.keys(b.missed).every((k) => k.length <= 80));
  assert.equal(b.missed.k79.info.evil, undefined, 'chỉ giữ trường info hợp lệ');
  assert.equal(b.missed.k79.info.kind, 'read');
  assert.equal(b.missed.k79.ok, 0);
  eqJ(b.stats.byTopic, { l1: { c: 5, w: 1 } });
  assert.equal(b.stats.plays, 0);
  assert.equal(b.stats.seconds, 1e8);
  // > 64 KB → đặt lại
  st.setItem(KEY, '{"players":{"p1":{"progress":{"l1":{"best":' + '1'.repeat(70000) + '}}}}}');
  S = loadFull(st).__XeTang.Store;
  assert.equal(S.corrupt, true);
  assert.equal(S.prog('l1').best, 0);
});

test('Store: kho ôn lại (noteMissed/noteOk/reviewPool), thống kê, xóa tiến trình, tách theo người chơi', () => {
  const st = makeStorage();
  const g = loadFull(st);
  const S = g.__XeTang.Store, P = g.Players, GL = g.Levels;
  const q = C.kemQ({ n: 4 });
  S.noteMissed(q.key, Object.assign({ level: 6 }, q.info));
  S.noteMissed(q.key, Object.assign({ level: 6 }, q.info));
  assert.equal(S.p().missed[q.key].n, 2);
  assert.equal(S.p().missed[q.key].info.level, 6);
  assert.equal(S.p().missed[q.key].info.kind, 'kem');
  const q1 = C.readQ({ minutes: [0], styles: ['plain'], n: 4 });
  S.noteMissed(q1.key, Object.assign({ level: 1 }, q1.info));
  assert.equal(S.reviewPool().length, 2);
  assert.equal(S.reviewPool()[0].key, q.key, 'ưu tiên sai nhiều');
  assert.equal(S.reviewPool((info) => info.level <= 1).length, 1, 'lọc theo màn');
  assert.ok(C.fromInfo(S.reviewPool()[0].info, { n: 4 }), 'info lưu lại tạo lại được câu hỏi');
  S.noteOk(q.key);
  assert.equal(S.p().missed[q.key].ok, 1);
  S.noteOk(q.key);
  assert.equal(S.p().missed[q.key], undefined, 'đúng 2 lần → xóa khỏi kho');
  S.noteOk('không có');
  for (let i = 0; i < 70; i++) S.noteMissed('key' + i, { kind: 'five', n5: 3, level: 5 });
  assert.equal(Object.keys(S.p().missed).length, 60, 'giữ tối đa 60 mục (bỏ mục cũ nhất)');
  S.addStats({ correct: 6, wrong: 2, seconds: 30.6, topic: 'l1' });
  S.addStats({ correct: 3, wrong: 1, seconds: 0, topic: 'quiz:l1', plays: false });
  eqJ([S.p().stats.plays, S.p().stats.correct, S.p().stats.wrong, S.p().stats.seconds], [1, 9, 3, 31]);
  eqJ(S.p().stats.byTopic, { l1: { c: 6, w: 2 }, 'quiz:l1': { c: 3, w: 1 } });
  S.setProg('l1', { best: 900, stars: 2, passed: true, plays: 1, quizBest: 3 });
  assert.equal(S.sumStars(S.p()), 2);
  // Người chơi mới: bucket riêng, tiến trình cũ không lộ sang
  const mai = P.add('Mai', '🦉');
  assert.ok(mai && P.active().id === mai.id);
  assert.equal(S.activeId(), mai.id);
  assert.equal(S.prog('l1').best, 0);
  assert.equal(S.isUnlocked(GL.LEVELS[1]), false);
  assert.equal(S.reviewPool().length, 0);
  assert.equal(S.p().stats.plays, 0);
  S.setProg('l1', { best: 50, stars: 1 });
  P.setActive('p1');
  assert.equal(S.prog('l1').best, 900);
  assert.equal(S.prog('l1').quizBest, 3);
  assert.equal(S.isUnlocked(GL.LEVELS[1]), true);
  assert.equal(S.data.players[mai.id].progress.l1.best, 50, 'bucket của Mai được giữ');
  const saved = JSON.parse(st.getItem(KEY));
  assert.equal(saved.players.p1.progress.l1.best, 900);
  assert.equal(saved.players[mai.id].progress.l1.best, 50);
  S.resetActive();
  assert.equal(S.prog('l1').best, 0);
  assert.equal(S.p().stats.plays, 0);
  assert.equal(S.data.players[mai.id].progress.l1.best, 50, 'xóa chỉ người chơi đang hoạt động');
});
