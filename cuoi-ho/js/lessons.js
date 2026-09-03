/* ============================================================
   lessons.js – Nội dung học cho Cưỡi Hổ Vượt Lửa
   Kỹ năng: XEM ĐỒNG HỒ & THỜI GIAN (lớp 2, lớp 3)
   - Đọc giờ tiếng Việt (giờ đúng, giờ rưỡi, giờ kém, 24 giờ...)
   - Vẽ đồng hồ bằng SVG cho bài học, HUD và phần hỏi đáp
   - Sinh câu hỏi cho các vòng lửa (mỗi vòng = một đáp án)
   - Danh sách màn chơi: bài học, bộ sinh câu hỏi, câu hỏi đáp mở khóa
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
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const strip = (s) => String(s).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

  /* ================= ĐỌC GIỜ ================= */
  const nextH = (h) => (h % 12) + 1;
  const prevH = (h) => (h === 1 ? 12 : h - 1);
  const pad2 = (n) => (n < 10 ? '0' : '') + n;
  /** "3 giờ", "3 giờ 25 phút" */
  function plain(h, m) { return m === 0 ? h + ' giờ' : h + ' giờ ' + m + ' phút'; }
  /** "3 giờ rưỡi" */
  function ruoi(h) { return h + ' giờ rưỡi'; }
  /** 8:45 -> "9 giờ kém 15 phút" (chỉ dùng khi m > 30) */
  function kem(h, m) { return nextH(h) + ' giờ kém ' + (60 - m) + ' phút'; }
  /** Buổi trong ngày theo giờ 24h */
  function buoi(H) { return H <= 10 ? 'sáng' : H <= 12 ? 'trưa' : H <= 18 ? 'chiều' : H <= 23 ? 'tối' : 'đêm'; }
  const BUOI_ICON = { 'sáng': '☀️', 'trưa': '🌤️', 'chiều': '🌇', 'tối': '🌙', 'đêm': '🌙' };
  /** 15 -> "3 giờ chiều" */
  function h24ToText(H, m) {
    const h = H === 0 ? 12 : H > 12 ? H - 12 : H;
    return plain(h, m || 0) + ' ' + buoi(H);
  }
  function digital(H, m) { return pad2(H) + ':' + pad2(m); }

  /* ================= LỰA CHỌN (VÒNG LỬA) =================
     Mỗi lựa chọn: { text } hoặc { clock: {h, m} } */
  const T = (text) => ({ text: String(text) });
  const C = (h, m) => (h >= 1 && h <= 12 && m >= 0 && m <= 59 ? { clock: { h: h, m: m } } : null);
  function optKey(o) { return !o ? '' : o.clock ? 'c:' + o.clock.h + ':' + o.clock.m : 't:' + o.text; }
  function optLabel(o) { return o.clock ? '🕒 ' + plain(o.clock.h, o.clock.m) : o.text; }
  function optSpeech(o) { return o.clock ? 'đồng hồ chỉ ' + plain(o.clock.h, o.clock.m) : o.text; }

  /** Đồng hồ "đổi kim": kim giờ chỉ vị trí kim phút và ngược lại (lỗi hay gặp). */
  function swapped(h, m) {
    if (m % 5 !== 0) return null;
    const nh = m === 0 ? 12 : m / 5;
    const nm = (h % 12) * 5;
    if (nh === h && nm === m) return null;
    return C(nh, nm);
  }

  /** Chọn (n-1) lựa chọn nhiễu khác nhau và khác đáp án; thiếu thì lấy từ fallback(). */
  function uniq(correct, cands, n, fallback) {
    const out = [correct];
    const keys = { [optKey(correct)]: true };
    const add = (o) => {
      if (!o) return false;
      const k = optKey(o);
      if (keys[k]) return false;
      keys[k] = true;
      out.push(o);
      return true;
    };
    for (let i = 0; i < cands.length && out.length < n; i++) add(cands[i]);
    for (let i = 0; i < 40 && out.length < n && fallback; i++) add(fallback());
    return out;
  }

  /** Tạo câu hỏi: lựa chọn được xáo trộn, answer là chỉ số đáp án đúng sau khi xáo. */
  function mkQ(o) {
    const opts = o.options.filter(Boolean).map((op, i) => ({ op: op, ok: i === (o.answer || 0) }));
    shuffle(opts);
    const q = {
      prompt: o.prompt,
      speech: o.speech || strip(o.prompt),
      clock: o.clock || null,
      digital: o.digital || null,
      icon: o.icon || null,
      options: opts.map((x) => x.op),
      answer: opts.findIndex((x) => x.ok),
      explain: o.explain || '',
      topic: o.topic || ''
    };
    q.answerText = optLabel(q.options[q.answer]);
    q.answerSpeech = optSpeech(q.options[q.answer]);
    q.key = strip(q.prompt) + '|' + optKey(q.options[q.answer]);
    return q;
  }

  /** Tránh lặp câu vừa hỏi. */
  const recent = [];
  function fresh(genFn) {
    let q = genFn();
    for (let i = 0; i < 8 && recent.indexOf(q.key) >= 0; i++) q = genFn();
    recent.push(q.key);
    if (recent.length > 6) recent.shift();
    return q;
  }

  const fbText = () => T(plain(rnd(1, 12), pick([0, 15, 30, 45])));
  const fbClock = () => C(rnd(1, 12), rnd(0, 11) * 5);
  const H = () => rnd(1, 12);

  /* ================= BỘ SINH CÂU HỎI TỪNG MÀN ================= */

  /* Màn 1 – Giờ đúng */
  function genL1() {
    const h = H();
    if (chance(0.68)) {
      return mkQ({
        prompt: 'Đồng hồ chỉ mấy giờ?', clock: { h: h, m: 0 },
        options: uniq(T(plain(h, 0)), [T(h === 12 ? '6 giờ' : '12 giờ'), T(plain(nextH(h), 0)), T(plain(prevH(h), 0))], 3, fbText),
        explain: 'Kim dài chỉ số 12 nên là giờ đúng. Kim ngắn chỉ số ' + h + ' → ' + h + ' giờ.'
      });
    }
    return mkQ({
      prompt: 'Đồng hồ nào chỉ <b>' + h + ' giờ</b>?', speech: 'Đồng hồ nào chỉ ' + h + ' giờ?',
      options: uniq(C(h, 0), [swapped(h, 0), C(nextH(h), 0), C(prevH(h), 0)], 3, fbClock),
      explain: h + ' giờ đúng: kim ngắn chỉ số ' + h + ', kim dài chỉ số 12.'
    });
  }

  /* Màn 2 – Giờ rưỡi */
  function genL2() {
    const h = H();
    const r = Math.random();
    if (r < 0.2) {
      return mkQ({
        prompt: 'Đồng hồ chỉ mấy giờ?', clock: { h: h, m: 0 },
        options: uniq(T(plain(h, 0)), [T(ruoi(h)), T(plain(nextH(h), 0)), T(ruoi(prevH(h)))], 3, fbText),
        explain: 'Kim dài chỉ số 12 → giờ đúng: ' + h + ' giờ.'
      });
    }
    if (r < 0.7) {
      const ans = chance(0.55) ? ruoi(h) : plain(h, 30);
      return mkQ({
        prompt: 'Đồng hồ chỉ mấy giờ?', clock: { h: h, m: 30 },
        options: uniq(T(ans), [T(ruoi(nextH(h))), T(plain(h, 6)), T(plain(h, 0)), T(ruoi(prevH(h)))], 3, fbText),
        explain: 'Kim dài chỉ số 6 → 30 phút, gọi là rưỡi. Kim ngắn ở giữa số ' + h + ' và số ' + nextH(h) + ' → lấy số nhỏ hơn: ' + ruoi(h) + '.'
      });
    }
    return mkQ({
      prompt: 'Đồng hồ nào chỉ <b>' + ruoi(h) + '</b>?', speech: 'Đồng hồ nào chỉ ' + ruoi(h) + '?',
      options: uniq(C(h, 30), [C(nextH(h), 30), C(h, 0), swapped(h, 30)], 3, fbClock),
      explain: ruoi(h) + ': kim dài chỉ số 6, kim ngắn ở giữa số ' + h + ' và số ' + nextH(h) + '.'
    });
  }

  /* Màn 3 – Giờ 15 phút (ôn giờ đúng, giờ rưỡi) */
  function genL3() {
    const h = H();
    const r = Math.random();
    const m = r < 0.55 ? 15 : r < 0.8 ? 30 : 0;
    if (chance(0.7)) {
      const ans = m === 30 && chance(0.5) ? ruoi(h) : plain(h, m);
      const cands = m === 15
        ? [T(plain(h, 3)), T(plain(nextH(h), 15)), T(plain(h, 30)), T(plain(3, (h % 12) * 5))]
        : m === 30 ? [T(ruoi(nextH(h))), T(plain(h, 15)), T(plain(h, 6))]
          : [T(plain(h, 15)), T(plain(nextH(h), 0)), T(ruoi(h))];
      return mkQ({
        prompt: 'Đồng hồ chỉ mấy giờ?', clock: { h: h, m: m },
        options: uniq(T(ans), cands, 3, fbText),
        explain: m === 15 ? 'Kim dài chỉ số 3 → 15 phút. Kim ngắn qua số ' + h + ' một chút → ' + plain(h, 15) + '.'
          : m === 30 ? 'Kim dài chỉ số 6 → 30 phút. Kim ngắn ở giữa số ' + h + ' và ' + nextH(h) + ' → ' + ruoi(h) + '.'
            : 'Kim dài chỉ số 12 → giờ đúng: ' + h + ' giờ.'
      });
    }
    const txt = m === 30 && chance(0.5) ? ruoi(h) : plain(h, m);
    return mkQ({
      prompt: 'Đồng hồ nào chỉ <b>' + txt + '</b>?', speech: 'Đồng hồ nào chỉ ' + txt + '?',
      options: uniq(C(h, m), [C(h, m === 15 ? 30 : 15), C(nextH(h), m), swapped(h, m)], 3, fbClock),
      explain: txt + ': kim dài chỉ số ' + (m === 15 ? '3' : m === 30 ? '6' : '12') + ', kim ngắn ' + (m === 0 ? 'chỉ số ' + h : 'qua số ' + h) + '.'
    });
  }

  /* Màn 4 – Xem đồng hồ chính xác đến 5 phút (kim dài chỉ số k → k × 5 phút) */
  function genL4() {
    const h = H();
    const k = chance(0.6) ? rnd(1, 6) : rnd(7, 11);
    const m = k * 5;
    const r = Math.random();
    if (r < 0.2) {
      return mkQ({
        prompt: 'Kim dài chỉ số <b>' + k + '</b>. Đó là bao nhiêu phút?', speech: 'Kim dài chỉ số ' + k + '. Đó là bao nhiêu phút?',
        clock: { h: 12, m: m, hideHour: true, hl: 'minute' },
        options: uniq(T(m + ' phút'), [T(k + ' phút'), T((m + 5) + ' phút'), T((m - 5) + ' phút'), T((k * 10) + ' phút')], 3, () => T(rnd(1, 11) * 5 + ' phút')),
        explain: 'Mỗi số là 5 phút. Kim dài chỉ số ' + k + ' → ' + k + ' × 5 = ' + m + ' phút.'
      });
    }
    if (r < 0.72) {
      return mkQ({
        prompt: 'Đồng hồ chỉ mấy giờ?', clock: { h: h, m: m },
        options: uniq(T(plain(h, m)), [T(plain(h, k)), T(plain(nextH(h), m)), T(plain(h, m + (chance(0.5) ? 5 : -5))), swapped(h, m) ? T(plain(swapped(h, m).clock.h, swapped(h, m).clock.m)) : null], 3, fbText),
        explain: 'Kim dài chỉ số ' + k + ' → ' + k + ' × 5 = ' + m + ' phút. Kim ngắn ' + (m >= 35 ? 'chưa đến số ' + nextH(h) : 'đã qua số ' + h) + ' → ' + plain(h, m) + '.'
      });
    }
    return mkQ({
      prompt: 'Đồng hồ nào chỉ <b>' + plain(h, m) + '</b>?', speech: 'Đồng hồ nào chỉ ' + plain(h, m) + '?',
      options: uniq(C(h, m), [C(h, m + (chance(0.5) ? 5 : -5)), C(nextH(h), m), swapped(h, m)], 3, fbClock),
      explain: plain(h, m) + ': kim dài chỉ số ' + k + ' (' + k + ' × 5 = ' + m + '), kim ngắn qua số ' + h + '.'
    });
  }

  /* Màn 5 – Giờ kém */
  function genL5() {
    const h = H();
    const m = pick([35, 40, 45, 50, 55]);
    const h2 = nextH(h), k2 = 60 - m;
    const r = Math.random();
    if (r < 0.4) {
      return mkQ({
        prompt: 'Đọc theo cách <b>“giờ kém”</b>:', speech: 'Đọc giờ theo cách giờ kém', clock: { h: h, m: m },
        options: uniq(T(kem(h, m)), [T(h + ' giờ kém ' + k2 + ' phút'), T(h2 + ' giờ kém ' + m + ' phút'), T(plain(h2, k2))], 3,
          () => T(rnd(1, 12) + ' giờ kém ' + pick([5, 10, 15, 20, 25]) + ' phút')),
        explain: plain(h, m) + ': còn ' + k2 + ' phút nữa là đến ' + h2 + ' giờ → ' + kem(h, m) + '.'
      });
    }
    if (r < 0.7) {
      return mkQ({
        prompt: '<b>' + kem(h, m) + '</b> là mấy giờ mấy phút?', speech: kem(h, m) + ' là mấy giờ mấy phút?',
        options: uniq(T(plain(h, m)), [T(plain(h2, k2)), T(plain(h, k2)), T(plain(h2, m))], 3, fbText),
        explain: kem(h, m) + ': lấy ' + h2 + ' giờ lùi lại ' + k2 + ' phút → ' + plain(h, m) + '.'
      });
    }
    return mkQ({
      prompt: 'Đồng hồ nào chỉ <b>' + kem(h, m) + '</b>?', speech: 'Đồng hồ nào chỉ ' + kem(h, m) + '?',
      options: uniq(C(h, m), [C(h2, k2), C(h, k2), C(h2, m)], 3, fbClock),
      explain: kem(h, m) + ' = ' + plain(h, m) + ': kim dài chỉ số ' + (m / 5) + ', kim ngắn gần số ' + h2 + ' nhưng chưa tới.'
    });
  }

  /* Màn 6 – Chính xác đến từng phút, đồng hồ điện tử */
  function genL6() {
    const h = H();
    let m = rnd(1, 59);
    if (m % 5 === 0) m = Math.min(59, m + rnd(1, 4));
    const k = Math.floor(m / 5), j = m - k * 5, near = k * 5;
    const r = Math.random();
    if (r < 0.2) {
      return mkQ({
        prompt: 'Kim dài qua số <b>' + k + '</b> thêm <b>' + j + '</b> vạch. Đó là bao nhiêu phút?',
        speech: 'Kim dài qua số ' + k + ' thêm ' + j + ' vạch. Đó là bao nhiêu phút?',
        clock: { h: 12, m: m, hideHour: true, hl: 'minute' },
        options: uniq(T(m + ' phút'), [T(near + ' phút'), T((k + j) + ' phút'), T((m + 5) + ' phút'), T((m - 1) + ' phút')], 3, () => T(rnd(1, 59) + ' phút')),
        explain: 'Số ' + k + ' là ' + near + ' phút, thêm ' + j + ' vạch (mỗi vạch 1 phút) → ' + m + ' phút.'
      });
    }
    if (r < 0.45) {
      const rev = Number(String(m).split('').reverse().join(''));
      return mkQ({
        prompt: 'Đồng hồ điện tử chỉ mấy giờ?', digital: digital(h, m),
        options: uniq(T(plain(h, m)), [rev !== m && rev < 60 ? T(plain(h, rev)) : null, T(plain(nextH(h), m)), T(plain(h, m + (m < 50 ? 10 : -10))), T(plain(h, near))], 3, fbText),
        explain: 'Đồng hồ điện tử ghi giờ : phút. ' + digital(h, m) + ' là ' + plain(h, m) + '.'
      });
    }
    if (r < 0.78) {
      return mkQ({
        prompt: 'Đồng hồ chỉ mấy giờ?', clock: { h: h, m: m },
        options: uniq(T(plain(h, m)), [T(plain(h, near)), T(plain(h, m + rnd(1, 3))), T(plain(h, m - rnd(1, 3))), T(plain(nextH(h), m))], 3, fbText),
        explain: 'Kim dài qua số ' + k + ' (' + near + ' phút) thêm ' + j + ' vạch → ' + m + ' phút. Kim ngắn ' + (m >= 30 ? 'chưa đến số ' + nextH(h) : 'qua số ' + h) + ' → ' + plain(h, m) + '.'
      });
    }
    return mkQ({
      prompt: 'Đồng hồ nào chỉ <b>' + plain(h, m) + '</b>?', speech: 'Đồng hồ nào chỉ ' + plain(h, m) + '?',
      options: uniq(C(h, m), [C(h, m + (m < 57 ? 2 : -2)), C(h, near === 0 ? 5 : near), C(nextH(h), m)], 3, fbClock),
      explain: plain(h, m) + ': kim dài qua số ' + k + ' thêm ' + j + ' vạch, kim ngắn qua số ' + h + '.'
    });
  }

  /* Màn 7 – Buổi trong ngày, cách gọi 24 giờ, đồng hồ điện tử 24 giờ */
  function genL7() {
    const r = Math.random();
    if (r < 0.27) {
      const h = rnd(1, 11), b = h <= 6 ? 'chiều' : 'tối', H24 = h + 12;
      return mkQ({
        prompt: '<b>' + h + ' giờ ' + b + '</b> là mấy giờ (theo cách 24 giờ)?', speech: h + ' giờ ' + b + ' là mấy giờ theo cách 24 giờ?', icon: BUOI_ICON[b],
        options: uniq(T(H24 + ' giờ'), [T(h + ' giờ'), T((h + 10) + ' giờ'), T((H24 + (chance(0.5) ? 1 : -1)) + ' giờ')], 3, () => T(rnd(13, 24) + ' giờ')),
        explain: 'Buổi ' + b + ' thì lấy giờ cộng thêm 12: ' + h + ' + 12 = ' + H24 + ' → ' + H24 + ' giờ.'
      });
    }
    if (r < 0.52) {
      const H24 = rnd(13, 23), h = H24 - 12, b = buoi(H24);
      return mkQ({
        prompt: '<b>' + H24 + ' giờ</b> là mấy giờ ' + b + '?', speech: H24 + ' giờ là mấy giờ ' + b + '?', icon: BUOI_ICON[b],
        options: uniq(T(h + ' giờ ' + b), [T((H24 - 10) + ' giờ ' + b), h < 11 ? T((h + 1) + ' giờ ' + b) : null, h > 1 ? T((h - 1) + ' giờ ' + b) : null, T(H24 + ' giờ ' + b)], 3, () => T(rnd(1, 12) + ' giờ ' + b)),
        explain: H24 + ' − 12 = ' + h + ' → ' + h + ' giờ ' + b + '.'
      });
    }
    if (r < 0.77) {
      const H24 = chance(0.7) ? rnd(13, 23) : rnd(6, 11), m = pick([0, 0, 15, 30, 45]);
      const b = buoi(H24), h = H24 > 12 ? H24 - 12 : H24;
      const wrongB = H24 > 12 ? 'sáng' : (h <= 6 ? 'chiều' : 'tối');
      return mkQ({
        prompt: 'Đồng hồ điện tử chỉ mấy giờ?', digital: digital(H24, m),
        options: uniq(T(plain(h, m) + ' ' + b), [T(plain(h, m) + ' ' + wrongB), H24 > 12 ? T(plain(H24 - 10, m) + ' ' + b) : T((h + 12) + ' giờ' + (m ? ' ' + m + ' phút' : '') + ' sáng'), h < 12 ? T(plain(h + 1, m) + ' ' + b) : null], 3, () => T(plain(rnd(1, 12), m) + ' ' + pick(['sáng', 'chiều', 'tối']))),
        explain: digital(H24, m) + ': ' + (H24 > 12 ? H24 + ' − 12 = ' + h + ' → ' : '') + plain(h, m) + ' ' + b + '.'
      });
    }
    const H24 = pick([6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19, 20, 21, 22]);
    const b = buoi(H24);
    const all = ['sáng', 'trưa', 'chiều', 'tối'];
    return mkQ({
      prompt: '<b>' + H24 + ' giờ</b> là buổi nào trong ngày?', speech: H24 + ' giờ là buổi nào trong ngày?',
      clock: { h: H24 > 12 ? H24 - 12 : H24, m: 0 },
      options: uniq(T('Buổi ' + b), shuffle(all.filter((x) => x !== b)).map((x) => T('Buổi ' + x)), 3, null),
      explain: (H24 <= 10 ? 'Từ 1 đến 10 giờ là buổi sáng.' : H24 <= 12 ? '11 giờ, 12 giờ là buổi trưa.' : H24 <= 18 ? 'Từ 13 giờ (1 giờ chiều) đến 18 giờ là buổi chiều.' : 'Từ 19 giờ (7 giờ tối) trở đi là buổi tối.') + ' → ' + H24 + ' giờ là buổi ' + b + '.'
    });
  }

  /* Màn 8 – Đơn vị thời gian, tính giờ kết thúc, tính khoảng thời gian */
  const CONV = [
    ['1 giờ = ? phút', '60 phút', ['100 phút', '30 phút', '24 phút'], '1 giờ có 60 phút.'],
    ['2 giờ = ? phút', '120 phút', ['200 phút', '60 phút', '100 phút'], '2 giờ = 60 + 60 = 120 phút.'],
    ['3 giờ = ? phút', '180 phút', ['300 phút', '120 phút', '60 phút'], '3 × 60 = 180 phút.'],
    ['Nửa giờ = ? phút', '30 phút', ['50 phút', '15 phút', '60 phút'], 'Nửa giờ là 30 phút.'],
    ['1 giờ 30 phút = ? phút', '90 phút', ['130 phút', '60 phút', '100 phút'], '60 + 30 = 90 phút.'],
    ['1 giờ 15 phút = ? phút', '75 phút', ['115 phút', '60 phút', '45 phút'], '60 + 15 = 75 phút.'],
    ['1 ngày = ? giờ', '24 giờ', ['12 giờ', '60 giờ', '30 giờ'], 'Một ngày có 24 giờ.'],
    ['2 ngày = ? giờ', '48 giờ', ['24 giờ', '36 giờ', '60 giờ'], '24 + 24 = 48 giờ.'],
    ['1 tuần lễ = ? ngày', '7 ngày', ['5 ngày', '10 ngày', '12 ngày'], 'Một tuần lễ có 7 ngày.'],
    ['2 tuần lễ = ? ngày', '14 ngày', ['7 ngày', '10 ngày', '20 ngày'], '7 + 7 = 14 ngày.'],
    ['1 năm = ? tháng', '12 tháng', ['10 tháng', '24 tháng', '7 tháng'], 'Một năm có 12 tháng.'],
    ['60 phút = ? giờ', '1 giờ', ['6 giờ', '60 giờ', '2 giờ'], '60 phút = 1 giờ.'],
    ['120 phút = ? giờ', '2 giờ', ['12 giờ', '1 giờ', '20 giờ'], '120 = 60 + 60 → 2 giờ.'],
    ['90 phút = ? giờ ? phút', '1 giờ 30 phút', ['9 giờ', '1 giờ 90 phút', '2 giờ'], '90 = 60 + 30 → 1 giờ 30 phút.']
  ];
  function genL8() {
    const r = Math.random();
    if (r < 0.4) {
      const c = pick(CONV);
      return mkQ({
        prompt: c[0].replace(/\?/g, '<b>?</b>'), speech: c[0].replace(/\?/g, ' mấy ').replace('=', ' bằng '),
        options: uniq(T(c[1]), shuffle(c[2].slice()).map(T), 3, null), answer: 0, explain: c[3]
      });
    }
    const h = rnd(1, 9);
    if (r < 0.6) {
      const d = pick([15, 30, 45]);
      const who = pick(['Bạn Lan', 'Bạn Nam', 'Bé Mai', 'Bạn Hổ', 'Bạn Bình']);
      const act = pick(['đọc sách', 'tập vẽ', 'tưới cây', 'chơi bóng', 'làm bài']);
      return mkQ({
        prompt: who + ' bắt đầu ' + act + ' lúc <b>' + h + ' giờ</b>, làm trong <b>' + d + ' phút</b>. Xong lúc mấy giờ?',
        speech: who + ' bắt đầu ' + act + ' lúc ' + h + ' giờ, làm trong ' + d + ' phút. Xong lúc mấy giờ?',
        clock: { h: h, m: 0 },
        options: uniq(T(plain(h, d)), [T(plain(h + 1, 0)), T(plain(h, d / 5)), T(plain(h + 1, d)), T(plain(h, d === 15 ? 30 : 15))], 3, fbText),
        explain: h + ' giờ thêm ' + d + ' phút → ' + plain(h, d) + '.'
      });
    }
    if (r < 0.8) {
      const k = rnd(1, 3);
      return mkQ({
        prompt: 'Từ <b>' + h + ' giờ</b> đến <b>' + (h + k) + ' giờ</b> là bao lâu?', speech: 'Từ ' + h + ' giờ đến ' + (h + k) + ' giờ là bao lâu?',
        clock: { h: h, m: 0 },
        options: uniq(T(k + ' giờ'), [T((k + 1) + ' giờ'), T((h + k) + ' giờ'), T((k * 10) + ' phút'), T((k + 2) + ' giờ')], 3, () => T(rnd(1, 6) + ' giờ')),
        explain: (h + k) + ' − ' + h + ' = ' + k + ' → ' + k + ' giờ.'
      });
    }
    const m1 = pick([0, 15, 30]), d2 = pick([15, 30, 45].filter((x) => m1 + x <= 60)), m2 = m1 + d2;
    const t2 = m2 === 60 ? plain(h + 1, 0) : plain(h, m2);
    return mkQ({
      prompt: 'Từ <b>' + plain(h, m1) + '</b> đến <b>' + t2 + '</b> là bao nhiêu phút?', speech: 'Từ ' + plain(h, m1) + ' đến ' + t2 + ' là bao nhiêu phút?',
      clock: { h: h, m: m1 },
      options: uniq(T(d2 + ' phút'), [T((d2 + 15) + ' phút'), T(Math.max(5, d2 - 15) + ' phút'), T(m2 + ' phút'), T('1 giờ')], 3, () => T(rnd(1, 11) * 5 + ' phút')),
      explain: 'Kim dài đi từ ' + m1 + ' phút đến ' + m2 + ' phút → ' + d2 + ' phút.'
    });
  }

  /* Màn 9 – Siêu Hổ: trộn tất cả */
  function genL9() {
    const t = Math.random();
    if (t < 0.08) return genL1();
    if (t < 0.18) return genL2();
    if (t < 0.28) return genL3();
    if (t < 0.45) return genL4();
    if (t < 0.6) return genL5();
    if (t < 0.75) return genL6();
    if (t < 0.88) return genL7();
    return genL8();
  }

  /* ================= CÂU HỎI ĐÁP (mở khóa màn tiếp) =================
     qz(prompt, [đúng, nhiễu...], giải thích, {clock|digital}) */
  function qz(prompt, opts, explain, extra) {
    const o = { prompt: prompt, options: opts.map(T), answer: 0, explain: explain };
    if (extra) for (const k in extra) o[k] = extra[k];
    return o;
  }

  /* ================= DANH SÁCH MÀN ================= */
  const LEVELS = [
    {
      id: 'l1', n: 1, title: 'Giờ đúng', icon: '🕒', grade: 2, gates: 8, timer: 18, speed: 0.9,
      desc: 'Kim ngắn chỉ giờ, kim dài chỉ số 12',
      lesson: [
        { clock: { h: 3, m: 0, noHands: true }, text: 'Đây là <b>mặt đồng hồ</b>. Trên đó có <b>12 số</b>, từ 1 đến 12, xếp thành vòng tròn.' },
        { clock: { h: 3, m: 0, hl: 'hour' }, text: 'Đồng hồ có 2 kim. <b>Kim ngắn</b> chỉ <b>GIỜ</b>.' },
        { clock: { h: 3, m: 0, hl: 'minute' }, text: '<b>Kim dài</b> chỉ <b>PHÚT</b>.' },
        { clock: { h: 3, m: 0 }, text: 'Khi kim dài chỉ đúng <b>số 12</b>, ta có <b>giờ đúng</b>. Kim ngắn chỉ số mấy thì là mấy giờ. Đồng hồ này chỉ <b>3 giờ</b>.' },
        { clock: { h: 8, m: 0 }, text: 'Kim ngắn chỉ số 8, kim dài chỉ số 12 → <b>8 giờ</b>. Con thử đọc: 8 giờ!' }
      ],
      notes: ['Kim ngắn chỉ GIỜ, kim dài chỉ PHÚT.', 'Kim dài chỉ số 12 → giờ đúng: kim ngắn chỉ số mấy là mấy giờ.'],
      gen: genL1,
      quiz: [
        qz('Kim <b>ngắn</b> trên đồng hồ chỉ gì?', ['Giờ', 'Phút', 'Giây'], 'Kim ngắn chỉ GIỜ, kim dài chỉ PHÚT.'),
        qz('Đồng hồ này chỉ mấy giờ?', ['5 giờ', '12 giờ', '6 giờ'], 'Kim dài chỉ số 12 → giờ đúng. Kim ngắn chỉ số 5 → 5 giờ.', { clock: { h: 5, m: 0 } }),
        qz('<b>Giờ đúng</b> là khi kim dài chỉ số mấy?', ['Số 12', 'Số 6', 'Số 3'], 'Giờ đúng: kim dài chỉ số 12.'),
        qz('Con muốn xem mấy giờ thì nhìn vào kim nào trước?', ['Kim ngắn', 'Kim dài', 'Không cần nhìn'], 'Nhìn kim ngắn để biết giờ, rồi nhìn kim dài để biết phút.')
      ]
    },
    {
      id: 'l2', n: 2, title: 'Giờ rưỡi', icon: '🕞', grade: 2, gates: 8, timer: 18, speed: 0.9,
      desc: 'Kim dài chỉ số 6 là 30 phút',
      lesson: [
        { clock: { h: 12, m: 0, arc: 60, hl: 'minute' }, text: 'Kim dài đi <b>hết một vòng</b> là <b>60 phút</b>, tức là <b>1 giờ</b>.' },
        { clock: { h: 3, m: 30, arc: 30, hl: 'minute' }, text: 'Kim dài đi được <b>nửa vòng</b>, chỉ vào <b>số 6</b>, là <b>30 phút</b>.' },
        { clock: { h: 3, m: 30 }, text: '30 phút còn gọi là <b>rưỡi</b>. Đồng hồ này chỉ <b>3 giờ 30 phút</b>, hay <b>3 giờ rưỡi</b>.' },
        { clock: { h: 3, m: 30, hl: 'hour' }, text: 'Chú ý: lúc này kim ngắn nằm <b>giữa số 3 và số 4</b>. Ta đọc theo <b>số nhỏ hơn</b>: 3 giờ rưỡi, chứ không phải 4 giờ rưỡi!' },
        { clock: { h: 7, m: 30 }, text: 'Kim ngắn giữa số 7 và số 8, kim dài chỉ số 6 → <b>7 giờ rưỡi</b> (7 giờ 30 phút).' }
      ],
      notes: ['1 giờ = 60 phút. Kim dài đi nửa vòng, chỉ số 6 → 30 phút = "rưỡi".', 'Kim ngắn nằm giữa hai số → đọc theo số nhỏ hơn.'],
      gen: genL2,
      quiz: [
        qz('Kim dài chỉ <b>số 6</b> nghĩa là bao nhiêu phút?', ['30 phút', '6 phút', '15 phút'], 'Kim dài chỉ số 6 là nửa vòng → 30 phút.'),
        qz('Đồng hồ này chỉ mấy giờ?', ['9 giờ rưỡi', '10 giờ rưỡi', '9 giờ 6 phút'], 'Kim dài chỉ số 6 → 30 phút. Kim ngắn giữa số 9 và 10 → lấy số nhỏ hơn: 9 giờ rưỡi.', { clock: { h: 9, m: 30 } }),
        qz('Kim ngắn nằm giữa số 4 và số 5, kim dài chỉ số 6. Đó là mấy giờ?', ['4 giờ rưỡi', '5 giờ rưỡi', '4 giờ 5 phút'], 'Kim ngắn giữa 4 và 5 → đọc theo số nhỏ hơn là 4. Kim dài số 6 → rưỡi. Vậy là 4 giờ rưỡi.'),
        qz('<b>1 giờ</b> có bao nhiêu phút?', ['60 phút', '30 phút', '100 phút'], 'Kim dài đi hết một vòng là 60 phút = 1 giờ.')
      ]
    },
    {
      id: 'l3', n: 3, title: 'Giờ 15 phút', icon: '🕝', grade: 2, gates: 10, timer: 16, speed: 0.95,
      desc: 'Kim dài chỉ số 3 là 15 phút',
      lesson: [
        { clock: { h: 12, m: 15, arc: 15, hl: 'minute' }, text: 'Từ số 12 đến số 3, kim dài đi được <b>một phần tư vòng</b>: đó là <b>15 phút</b>.' },
        { clock: { h: 2, m: 15 }, text: 'Kim dài chỉ <b>số 3</b> → 15 phút. Kim ngắn đã qua số 2 một chút → <b>2 giờ 15 phút</b>.' },
        { clock: { h: 2, m: 15, hl: 'hour' }, text: 'Kim ngắn <b>chưa đến số 3</b> nên vẫn là 2 giờ, không phải 3 giờ nhé!' },
        { clock: { h: 12, m: 0, marks: [15, 30] }, text: 'Ghi nhớ: kim dài chỉ <b>số 12</b> → giờ đúng, <b>số 3</b> → 15 phút, <b>số 6</b> → 30 phút (rưỡi).' }
      ],
      notes: ['Kim dài chỉ số 3 → 15 phút.', 'Số 12 → giờ đúng · số 3 → 15 phút · số 6 → 30 phút.'],
      gen: genL3,
      quiz: [
        qz('Kim dài chỉ <b>số 3</b> là bao nhiêu phút?', ['15 phút', '3 phút', '30 phút'], 'Từ 12 đến 3 là một phần tư vòng → 15 phút.'),
        qz('Đồng hồ này chỉ mấy giờ?', ['6 giờ 15 phút', '6 giờ 3 phút', '3 giờ 6 phút'], 'Kim ngắn qua số 6, kim dài chỉ số 3 → 6 giờ 15 phút.', { clock: { h: 6, m: 15 } }),
        qz('Bạn Lan vào học lúc <b>7 giờ 15 phút</b>. Kim dài phải chỉ số mấy?', ['Số 3', 'Số 15', 'Số 6'], '15 phút → kim dài chỉ số 3.'),
        qz('Kim dài chỉ số 12 thì ta có gì?', ['Giờ đúng', 'Giờ rưỡi', '15 phút'], 'Kim dài chỉ số 12 → giờ đúng.')
      ]
    },
    {
      id: 'l4', n: 4, title: 'Đếm từng 5 phút', icon: '🕔', grade: 3, gates: 10, timer: 16, speed: 1,
      desc: 'Mỗi số trên đồng hồ là 5 phút',
      lesson: [
        { clock: { h: 12, m: 5, arc: 5, hl: 'minute' }, text: 'Từ số này sang số kế tiếp, kim dài đi được <b>5 phút</b>.' },
        { clock: { h: 12, m: 20, minuteLabels: true, hl: 'minute' }, text: 'Ta <b>đếm thêm 5</b>: số 1 → 5 phút, số 2 → 10 phút, số 3 → 15, số 4 → <b>20 phút</b>…' },
        { clock: { h: 12, m: 45, minuteLabels: true, hl: 'minute' }, text: '…số 6 → 30, số 7 → 35, số 8 → 40, số 9 → <b>45</b>, số 10 → 50, số 11 → 55 phút. Giống bảng nhân 5 đó!' },
        { clock: { h: 7, m: 20 }, text: 'Kim dài chỉ số 4 → 4 × 5 = 20 phút. Kim ngắn qua số 7 → <b>7 giờ 20 phút</b>.' },
        { clock: { h: 10, m: 40, hl: 'hour' }, text: 'Kim dài chỉ số 8 → 40 phút. Kim ngắn <b>chưa đến số 11</b> nên vẫn là 10 giờ → <b>10 giờ 40 phút</b>.' }
      ],
      notes: ['Mỗi số trên đồng hồ = 5 phút. Kim dài chỉ số k → k × 5 phút.', 'Kim ngắn chưa đến số tiếp theo thì vẫn đọc theo số trước.'],
      gen: genL4,
      quiz: [
        qz('Kim dài chỉ <b>số 4</b> là bao nhiêu phút?', ['20 phút', '4 phút', '40 phút'], '4 × 5 = 20 phút.'),
        qz('Kim dài chỉ <b>số 9</b> là bao nhiêu phút?', ['45 phút', '9 phút', '50 phút'], '9 × 5 = 45 phút.'),
        qz('Đồng hồ này chỉ mấy giờ?', ['10 giờ 35 phút', '10 giờ 7 phút', '11 giờ 35 phút'], 'Kim dài chỉ số 7 → 35 phút. Kim ngắn chưa đến số 11 → 10 giờ 35 phút.', { clock: { h: 10, m: 35 } }),
        qz('Từ số 12 đến số 1, kim dài đi mất bao lâu?', ['5 phút', '1 phút', '10 phút'], 'Mỗi số cách nhau 5 phút.')
      ]
    },
    {
      id: 'l5', n: 5, title: 'Giờ kém', icon: '🕘', grade: 3, gates: 10, timer: 16, speed: 1,
      desc: '8 giờ 45 phút = 9 giờ kém 15 phút',
      lesson: [
        { clock: { h: 8, m: 45 }, text: 'Đồng hồ chỉ <b>8 giờ 45 phút</b>. Kim dài đã đi <b>quá số 6</b>, gần hết vòng rồi.' },
        { clock: { h: 8, m: 45, arc: [45, 60], hl: 'minute' }, text: 'Chỉ còn <b>15 phút</b> nữa là đến 9 giờ. Ta đọc là <b>9 giờ kém 15 phút</b>.' },
        { digital: '08:45', text: 'Cách tính: <b>60 − 45 = 15</b> → “kém 15”. Giờ lấy giờ tiếp theo: <b>8 + 1 = 9</b>. Vậy 8 giờ 45 = 9 giờ kém 15.' },
        { clock: { h: 6, m: 50 }, text: '6 giờ 50 phút: 60 − 50 = 10, giờ tiếp theo là 7 → <b>7 giờ kém 10 phút</b>.' },
        { clock: { h: 3, m: 40 }, text: '3 giờ 40 phút → <b>4 giờ kém 20 phút</b>. Chỉ dùng cách “giờ kém” khi kim dài đã qua số 6 nhé!' }
      ],
      notes: ['Kim dài qua số 6 → có thể đọc "giờ kém": lấy giờ tiếp theo, kém (60 − phút).', '8 giờ 45 = 9 giờ kém 15 · 6 giờ 50 = 7 giờ kém 10.'],
      gen: genL5,
      quiz: [
        qz('<b>8 giờ 40 phút</b> còn đọc là gì?', ['9 giờ kém 20 phút', '8 giờ kém 20 phút', '9 giờ kém 40 phút'], '60 − 40 = 20, giờ tiếp theo là 9 → 9 giờ kém 20 phút.'),
        qz('<b>5 giờ kém 15 phút</b> là mấy giờ?', ['4 giờ 45 phút', '5 giờ 15 phút', '4 giờ 15 phút'], '5 giờ lùi lại 15 phút → 4 giờ 45 phút.'),
        qz('Ta dùng cách đọc “giờ kém” khi kim dài ở đâu?', ['Đã qua số 6', 'Chưa đến số 6', 'Đúng số 12'], 'Khi kim dài đã qua số 6 (hơn 30 phút), ta có thể đọc "giờ kém".'),
        qz('Đồng hồ này chỉ mấy giờ (đọc theo cách giờ kém)?', ['11 giờ kém 10 phút', '10 giờ kém 10 phút', '11 giờ kém 50 phút'], '10 giờ 50 phút: 60 − 50 = 10 → 11 giờ kém 10 phút.', { clock: { h: 10, m: 50 } })
      ]
    },
    {
      id: 'l6', n: 6, title: 'Chính xác đến phút', icon: '🕰️', grade: 3, gates: 10, timer: 18, speed: 1,
      desc: 'Mỗi vạch nhỏ là 1 phút, đồng hồ điện tử',
      lesson: [
        { clock: { h: 12, m: 3, arc: [0, 5], hl: 'minute', zoomTicks: true }, text: 'Giữa hai số liền nhau có <b>5 vạch nhỏ</b>. Mỗi vạch nhỏ là <b>1 phút</b>.' },
        { clock: { h: 7, m: 23, hl: 'minute' }, text: 'Cách xem: đếm 5, 10, 15, 20 đến số ngay trước kim dài (số 4 → <b>20 phút</b>), rồi đếm thêm <b>3 vạch</b> → <b>23 phút</b>.' },
        { clock: { h: 7, m: 23 }, text: 'Kim ngắn đã qua số 7 → <b>7 giờ 23 phút</b>.' },
        { digital: '07:23', text: '<b>Đồng hồ điện tử</b> ghi giờ : phút. <b>07:23</b> đọc là 7 giờ 23 phút.' },
        { clock: { h: 11, m: 52 }, text: 'Kim dài qua số 10 (50 phút) thêm 2 vạch → 52 phút. Kim ngắn chưa đến 12 → <b>11 giờ 52 phút</b>.' }
      ],
      notes: ['Mỗi vạch nhỏ = 1 phút. Đếm từng 5 đến số trước kim dài, rồi đếm thêm từng vạch.', 'Đồng hồ điện tử ghi giờ : phút, ví dụ 07:23 = 7 giờ 23 phút.'],
      gen: genL6,
      quiz: [
        qz('Mỗi <b>vạch nhỏ</b> trên đồng hồ là mấy phút?', ['1 phút', '5 phút', '10 phút'], 'Giữa hai số có 5 vạch nhỏ, mỗi vạch là 1 phút.'),
        qz('Đồng hồ này chỉ mấy giờ?', ['3 giờ 8 phút', '3 giờ 40 phút', '3 giờ 1 phút'], 'Kim dài qua số 1 (5 phút) thêm 3 vạch → 8 phút. Kim ngắn qua số 3 → 3 giờ 8 phút.', { clock: { h: 3, m: 8 } }),
        qz('Đồng hồ điện tử ghi <b>06:52</b>. Đọc là?', ['6 giờ 52 phút', '6 giờ 25 phút', '52 giờ 6 phút'], 'Số trước dấu hai chấm là giờ, số sau là phút → 6 giờ 52 phút.', { digital: '06:52' }),
        qz('Kim dài qua số 9 thêm 2 vạch. Đó là bao nhiêu phút?', ['47 phút', '45 phút', '11 phút'], 'Số 9 là 45 phút, thêm 2 vạch → 47 phút.')
      ]
    },
    {
      id: 'l7', n: 7, title: 'Một ngày 24 giờ', icon: '🌙', grade: 3, gates: 10, timer: 16, speed: 1,
      desc: '3 giờ chiều là 15 giờ',
      lesson: [
        { emoji: '🌅🌞🌇🌙', text: 'Một ngày có <b>24 giờ</b>. Kim ngắn đi <b>2 vòng</b> đồng hồ: một vòng buổi sáng, một vòng buổi chiều và tối.' },
        { clock: { h: 3, m: 0 }, digital: '15:00', text: 'Sau 12 giờ trưa, ta đếm tiếp: 1 giờ chiều là <b>13 giờ</b>, 2 giờ chiều là 14 giờ, <b>3 giờ chiều là 15 giờ</b>…' },
        { emoji: '🌇 ➕ 12', text: 'Cách đổi: giờ buổi chiều, tối <b>cộng thêm 12</b>. Ví dụ 5 giờ chiều → 5 + 12 = <b>17 giờ</b>. 8 giờ tối → 8 + 12 = <b>20 giờ</b>.' },
        { emoji: '20 ➖ 12', text: 'Ngược lại: <b>20 giờ</b> → 20 − 12 = 8 → <b>8 giờ tối</b>. 14 giờ → 14 − 12 = 2 → 2 giờ chiều.' },
        { digital: '19:30', text: 'Đồng hồ điện tử ghi theo 24 giờ. <b>19:30</b> là 7 giờ 30 phút tối. Buổi sáng thì giữ nguyên: 07:30 là 7 giờ 30 phút sáng.' }
      ],
      notes: ['Một ngày có 24 giờ. Buổi chiều, tối: giờ + 12 (3 giờ chiều = 15 giờ).', 'Đổi ngược: 20 giờ − 12 = 8 giờ tối. Buổi sáng giữ nguyên.'],
      gen: genL7,
      quiz: [
        qz('Một ngày có bao nhiêu giờ?', ['24 giờ', '12 giờ', '60 giờ'], 'Một ngày có 24 giờ, kim ngắn đi 2 vòng.'),
        qz('<b>4 giờ chiều</b> là mấy giờ?', ['16 giờ', '14 giờ', '4 giờ'], 'Buổi chiều cộng thêm 12: 4 + 12 = 16 giờ.'),
        qz('<b>21 giờ</b> là mấy giờ tối?', ['9 giờ tối', '11 giờ tối', '21 giờ tối'], '21 − 12 = 9 → 9 giờ tối.'),
        qz('Đồng hồ điện tử ghi <b>18:30</b> nghĩa là?', ['6 giờ 30 phút chiều', '8 giờ 30 phút tối', '18 giờ 30 phút sáng'], '18 − 12 = 6 → 6 giờ 30 phút chiều.', { digital: '18:30' })
      ]
    },
    {
      id: 'l8', n: 8, title: 'Tính thời gian', icon: '⏳', grade: 3, gates: 10, timer: 18, speed: 1,
      desc: '1 giờ = 60 phút, giờ bắt đầu, giờ kết thúc',
      lesson: [
        { emoji: '⏱️📅', text: '<b>1 giờ = 60 phút</b> · <b>1 ngày = 24 giờ</b> · <b>1 tuần lễ = 7 ngày</b> · <b>1 năm = 12 tháng</b>.' },
        { clock: { h: 8, m: 30, arc: [0, 30], hl: 'minute' }, text: 'Tính giờ kết thúc: bắt đầu lúc <b>8 giờ</b>, học trong <b>30 phút</b> → kết thúc lúc <b>8 giờ 30 phút</b>.' },
        { clock: { h: 9, m: 0 }, text: 'Tính khoảng thời gian: từ <b>7 giờ</b> đến <b>9 giờ</b> là <b>2 giờ</b> (9 − 7 = 2).' },
        { clock: { h: 3, m: 45, arc: [15, 45], hl: 'minute' }, text: 'Từ 3 giờ 15 phút đến 3 giờ 45 phút: kim dài đi từ 15 đến 45 → <b>30 phút</b>.' },
        { emoji: '🔁', text: 'Đổi đơn vị: 2 giờ = 60 + 60 = <b>120 phút</b>. 1 giờ 30 phút = <b>90 phút</b>. Nửa giờ = <b>30 phút</b>.' }
      ],
      notes: ['1 giờ = 60 phút · 1 ngày = 24 giờ · 1 tuần = 7 ngày · 1 năm = 12 tháng.', 'Giờ kết thúc = giờ bắt đầu + thời gian làm. Khoảng thời gian = giờ sau − giờ trước.'],
      gen: genL8,
      quiz: [
        qz('<b>1 giờ</b> bằng bao nhiêu phút?', ['60 phút', '100 phút', '24 phút'], '1 giờ = 60 phút.'),
        qz('Một <b>tuần lễ</b> có mấy ngày?', ['7 ngày', '5 ngày', '12 ngày'], 'Một tuần lễ có 7 ngày.'),
        qz('Bạn Nam bắt đầu đọc sách lúc <b>8 giờ</b>, đọc trong <b>30 phút</b>. Nam đọc xong lúc mấy giờ?', ['8 giờ 30 phút', '8 giờ 3 phút', '9 giờ'], '8 giờ + 30 phút = 8 giờ 30 phút.', { clock: { h: 8, m: 0 } }),
        qz('Từ <b>7 giờ</b> đến <b>7 giờ 45 phút</b> là bao nhiêu phút?', ['45 phút', '7 phút', '15 phút'], 'Kim dài đi từ 0 đến 45 phút → 45 phút.')
      ]
    },
    {
      id: 'l9', n: 9, title: 'Siêu Hổ', icon: '🐯', grade: 0, gates: 12, timer: 12, speed: 1.15,
      desc: 'Trộn tất cả, vòng lửa đến nhanh hơn!',
      lesson: [
        { emoji: '🐯🔥🏆', text: 'Màn cuối cùng! Trộn <b>tất cả</b> những gì con đã học: giờ đúng, giờ rưỡi, 15 phút, từng 5 phút, giờ kém, từng phút, 24 giờ và tính thời gian.' },
        { clock: { h: 10, m: 10 }, text: 'Nhớ nhé: nhìn <b>kim ngắn</b> để biết giờ, <b>kim dài</b> để biết phút. Mỗi số = 5 phút, mỗi vạch = 1 phút. Chiều tối thì cộng 12.' },
        { emoji: '⚡', text: 'Vòng lửa đến <b>nhanh hơn</b> và chỉ có <b>12 giây</b> để chọn. Vượt qua 12 vòng để nhận <b>Huy hiệu Hổ Vàng</b>!' }
      ],
      notes: ['Ôn tập tổng hợp: nhìn kim ngắn → giờ, kim dài → phút.'],
      gen: genL9,
      quiz: [
        qz('Đồng hồ này chỉ mấy giờ?', ['4 giờ 25 phút', '5 giờ 25 phút', '4 giờ 5 phút'], 'Kim dài chỉ số 5 → 25 phút. Kim ngắn qua số 4 → 4 giờ 25 phút.', { clock: { h: 4, m: 25 } }),
        qz('<b>7 giờ tối</b> là mấy giờ?', ['19 giờ', '17 giờ', '7 giờ'], '7 + 12 = 19 giờ.'),
        qz('<b>2 giờ 50 phút</b> còn đọc là gì?', ['3 giờ kém 10 phút', '2 giờ kém 10 phút', '3 giờ kém 50 phút'], '60 − 50 = 10, giờ tiếp theo là 3 → 3 giờ kém 10 phút.'),
        qz('Bắt đầu chơi lúc <b>4 giờ</b>, chơi trong <b>1 giờ</b>. Xong lúc mấy giờ?', ['5 giờ', '4 giờ 1 phút', '6 giờ'], '4 giờ + 1 giờ = 5 giờ.'),
        qz('Đồng hồ điện tử ghi <b>09:07</b>. Đọc là?', ['9 giờ 7 phút', '9 giờ 70 phút', '7 giờ 9 phút'], 'Giờ : phút → 9 giờ 7 phút.', { digital: '09:07' })
      ]
    }
  ];
  LEVELS.forEach((l, i) => { l.index = i; });

  /* ================= VẼ ĐỒNG HỒ (SVG) =================
     c: { h, m, hl: 'hour'|'minute', arc: số phút | [từ, đến], minuteLabels, hideHour, hideMinute, noHands, marks: [phút...] } */
  function polar(cx, cy, r, minutes) {
    const a = (minutes / 60) * Math.PI * 2 - Math.PI / 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  }
  function clockSvg(c, size, cls) {
    c = c || {};
    const S = 240, cx = 120, cy = 120, R = 92;
    const h = c.h == null ? 12 : c.h, m = c.m == null ? 0 : c.m;
    let s = '<svg class="clock ' + (cls || '') + '" viewBox="0 0 ' + S + ' ' + S + '" width="' + (size || 160) + '" height="' + (size || 160) + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R + 14) + '" fill="#f7b733" stroke="#b5640c" stroke-width="4"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R + 4) + '" fill="#fffdf6" stroke="#e0c27a" stroke-width="2"/>';
    // Cung tô màu (phút)
    if (c.arc != null) {
      const from = Array.isArray(c.arc) ? c.arc[0] : 0, to = Array.isArray(c.arc) ? c.arc[1] : c.arc;
      const span = to - from;
      if (span >= 60) s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R - 2) + '" fill="rgba(255,107,53,0.28)"/>';
      else if (span > 0) {
        const p0 = polar(cx, cy, R - 2, from), p1 = polar(cx, cy, R - 2, to);
        s += '<path d="M' + cx + ' ' + cy + ' L' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1) + ' A' + (R - 2) + ' ' + (R - 2) + ' 0 ' + (span > 30 ? 1 : 0) + ' 1 ' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) + ' Z" fill="rgba(255,107,53,0.3)"/>';
      }
    }
    // Vạch phút
    for (let i = 0; i < 60; i++) {
      const big = i % 5 === 0;
      const p0 = polar(cx, cy, R - (big ? 10 : 6), i), p1 = polar(cx, cy, R, i);
      s += '<line x1="' + p0[0].toFixed(1) + '" y1="' + p0[1].toFixed(1) + '" x2="' + p1[0].toFixed(1) + '" y2="' + p1[1].toFixed(1) + '" stroke="' + (big ? '#2b2d42' : (c.zoomTicks ? '#ef476f' : '#8a8fa8')) + '" stroke-width="' + (big ? 3 : (c.zoomTicks ? 2.5 : 1.5)) + '" stroke-linecap="round"/>';
    }
    // Số 1..12
    for (let i = 1; i <= 12; i++) {
      const p = polar(cx, cy, R - 24, i * 5);
      s += '<text x="' + p[0].toFixed(1) + '" y="' + (p[1] + 1).toFixed(1) + '" text-anchor="middle" dominant-baseline="middle" font-size="21" font-weight="800" fill="#2b2d42">' + i + '</text>';
    }
    // Nhãn phút bên ngoài (5, 10, ... 60)
    if (c.minuteLabels) {
      for (let i = 1; i <= 12; i++) {
        const p = polar(cx, cy, R + 27, i * 5);
        s += '<text x="' + p[0].toFixed(1) + '" y="' + (p[1] + 1).toFixed(1) + '" text-anchor="middle" dominant-baseline="middle" font-size="13" font-weight="800" fill="#b5640c">' + (i * 5) + '</text>';
      }
    }
    // Đánh dấu vị trí (ví dụ số 3, số 6)
    if (c.marks) {
      c.marks.forEach((mm) => {
        const p = polar(cx, cy, R - 24, mm);
        s += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="15" fill="none" stroke="#ef476f" stroke-width="3"/>';
      });
    }
    if (!c.noHands) {
      const hourMin = ((h % 12) + m / 60) * 5;
      if (!c.hideHour) {
        const p = polar(cx, cy, R * 0.55, hourMin);
        if (c.hl === 'hour') s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + p[0].toFixed(1) + '" y2="' + p[1].toFixed(1) + '" stroke="rgba(255,209,102,0.9)" stroke-width="20" stroke-linecap="round"/>';
        s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + p[0].toFixed(1) + '" y2="' + p[1].toFixed(1) + '" stroke="#2b2d42" stroke-width="9" stroke-linecap="round"/>';
      }
      if (!c.hideMinute) {
        const p = polar(cx, cy, R * 0.82, m);
        if (c.hl === 'minute') s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + p[0].toFixed(1) + '" y2="' + p[1].toFixed(1) + '" stroke="rgba(255,209,102,0.9)" stroke-width="18" stroke-linecap="round"/>';
        s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + p[0].toFixed(1) + '" y2="' + p[1].toFixed(1) + '" stroke="#ef476f" stroke-width="6" stroke-linecap="round"/>';
      }
    }
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="7" fill="#2b2d42"/><circle cx="' + cx + '" cy="' + cy + '" r="3" fill="#ffd166"/>';
    s += '</svg>';
    return s;
  }
  function digitalHtml(str, cls) {
    return '<div class="digital ' + (cls || '') + '"><span>' + esc(str) + '</span></div>';
  }
  /** HTML minh họa của câu hỏi / slide (đồng hồ kim, đồng hồ điện tử, biểu tượng). */
  function visualHtml(o, size) {
    let s = '';
    if (o.clock) s += clockSvg(o.clock, size);
    if (o.digital) s += digitalHtml(o.digital);
    if (o.emoji) s += '<div class="emoji-art">' + esc(o.emoji) + '</div>';
    if (o.icon && !o.clock && !o.digital) s += '<div class="emoji-art">' + esc(o.icon) + '</div>';
    return s;
  }
  function optionHtml(o, size) {
    return o.clock ? clockSvg(o.clock, size || 96, 'mini') : '<span>' + esc(o.text) + '</span>';
  }

  window.Lessons = {
    rnd, chance, pick, shuffle, esc, strip,
    plain, ruoi, kem, buoi, h24ToText, digital, nextH, prevH,
    T, C, optKey, optLabel, optSpeech, mkQ, fresh, uniq,
    LEVELS,
    levelById(id) { return LEVELS.find((l) => l.id === id) || null; },
    clockSvg, digitalHtml, visualHtml, optionHtml
  };
})();
