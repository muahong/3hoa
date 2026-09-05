/* ============================================================
   clock.js – Mô hình thời gian cho Xe Tăng Thời Gian
   - Đọc giờ bằng tiếng Việt: giờ đúng, giờ rưỡi, giờ kém, 24 giờ, các buổi
   - Vẽ đồng hồ kim và đồng hồ điện tử lên Canvas (vector, không cần ảnh)
   - Sinh câu hỏi + đáp án nhiễu "giống lỗi thường gặp" cho từng dạng bài
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
  const TAU = Math.PI * 2;
  const FONT = '"Baloo 2", "Arial Rounded MT Bold", "Segoe UI", Arial, sans-serif';

  /* ================= ĐỌC GIỜ ================= */
  /** Đưa giờ về 1..12 */
  function h12(h) { h = h % 12; if (h <= 0) h += 12; return h; }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /**
   * Đọc giờ trên đồng hồ kim.
   * style: 'plain' → "3 giờ 30 phút" · 'ruoi' → "3 giờ rưỡi" · 'kem' → "4 giờ kém 15 phút" (khi phút > 30)
   */
  function readTime(h, m, style) {
    h = h12(h);
    if (m === 0) return h + ' giờ';
    if (style === 'ruoi' && m === 30) return h + ' giờ rưỡi';
    if (style === 'kem' && m > 30) return h12(h + 1) + ' giờ kém ' + (60 - m) + ' phút';
    return h + ' giờ ' + m + ' phút';
  }

  /** Đọc giờ theo cách 24 giờ: 15 giờ, 15 giờ 20 phút */
  function read24(h24, m) {
    return h24 + ' giờ' + (m ? ' ' + m + ' phút' : '');
  }

  /** Buổi trong ngày theo sách Toán 2: sáng 1–10, trưa 11–12, chiều 13–18, tối 19–21, đêm 22–24 */
  function session(h24) {
    if (h24 === 0 || h24 === 24) return 'đêm';
    if (h24 <= 10) return 'sáng';
    if (h24 <= 12) return 'trưa';
    if (h24 <= 18) return 'chiều';
    if (h24 <= 21) return 'tối';
    return 'đêm';
  }
  const SESSION_ICON = { 'sáng': '🌅', 'trưa': '☀️', 'chiều': '🌤️', 'tối': '🌙', 'đêm': '🌃' };
  const SESSIONS = ['sáng', 'trưa', 'chiều', 'tối', 'đêm'];

  /** "3 giờ chiều", "3 giờ 20 phút chiều" */
  function readSession(h24, m) {
    const hh = h24 === 24 || h24 === 0 ? 12 : h12(h24);
    return hh + ' giờ' + (m ? ' ' + m + ' phút' : '') + ' ' + session(h24);
  }

  /** Đồng hồ điện tử: "07:05", "19:30" */
  function digital(h, m) { return pad2(h) + ':' + pad2(m); }

  /** Đọc khoảng thời gian: 30 phút, 1 giờ, 1 giờ 15 phút */
  function readDuration(min) {
    const h = Math.floor(min / 60), m = min % 60;
    if (h === 0) return m + ' phút';
    return h + ' giờ' + (m ? ' ' + m + ' phút' : '');
  }

  /** Cộng phút vào giờ (12 giờ), trả về {h, m} */
  function addMinutes(h, m, plus) {
    const t = ((h12(h) * 60 + m + plus) % 720 + 720) % 720;
    return { h: h12(Math.floor(t / 60)), m: t % 60 };
  }
  function sameTime(a, b) { return h12(a.h) === h12(b.h) && a.m === b.m; }

  /* ================= VẼ ĐỒNG HỒ ================= */
  /**
   * Vẽ đồng hồ kim tại (x, y), bán kính r.
   * opts: { minuteTicks, emphasizeMinutes, numbers: 'all' | 'quarter' | 'auto', face, border, hourColor, minuteColor, alpha, noFace, noHands }
   * emphasizeMinutes: vạch phút đậm hơn (bài "chính xác đến từng phút", "kim dài chỉ số n")
   */
  function drawClock(c, x, y, r, h, m, opts) {
    const o = Object.assign({ minuteTicks: r >= 30, numbers: 'auto', face: '#ffffff', border: '#2b2d42', hourColor: '#2b2d42', minuteColor: '#ef476f', alpha: 1, shadow: true }, opts || {});
    c.save();
    c.globalAlpha = o.alpha;
    c.translate(x, y);
    if (!o.noFace) {
      // Mặt đồng hồ
      if (o.shadow) { c.shadowColor = 'rgba(0,0,0,0.25)'; c.shadowBlur = r * 0.25; c.shadowOffsetY = r * 0.08; }
      c.fillStyle = o.face;
      c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
      c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetY = 0;
      c.lineWidth = Math.max(2, r * 0.09);
      c.strokeStyle = o.border;
      c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
      // Vạch chia
      for (let i = 0; i < 60; i++) {
        const big = i % 5 === 0;
        if (!big && !o.minuteTicks) continue;
        const a = i / 60 * TAU - Math.PI / 2;
        const r0 = r * (big ? 0.84 : 0.88), r1 = r * 0.95;
        c.strokeStyle = big ? o.border : 'rgba(43,45,66,0.8)';
        c.lineWidth = big ? Math.max(1.5, r * 0.05)
          : (o.emphasizeMinutes ? Math.max(2, r * 0.035) : Math.max(1.5, r * 0.03));
        c.lineCap = 'round';
        c.beginPath(); c.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); c.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); c.stroke();
      }
      // Số
      const numbers = o.numbers === 'auto' ? (r >= 30 ? 'all' : 'quarter') : o.numbers;
      if (numbers !== 'none') {
        const size = numbers === 'all' ? r * 0.28 : r * 0.34;
        c.font = '800 ' + Math.round(size) + 'px ' + FONT;
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillStyle = o.border;
        for (let n = 1; n <= 12; n++) {
          if (numbers === 'quarter' && n % 3 !== 0) continue;
          const a = n / 12 * TAU - Math.PI / 2;
          const rr = r * 0.68;
          c.fillText(String(n), Math.cos(a) * rr, Math.sin(a) * rr + size * 0.06);
        }
      }
    }
    if (!o.noHands) {
      // Kim giờ (ngắn, đậm)
      const ha = ((h % 12) + m / 60) / 12 * TAU - Math.PI / 2;
      const ma = m / 60 * TAU - Math.PI / 2;
      c.lineCap = 'round';
      if (!o.hideHour) {
        c.strokeStyle = o.hourColor;
        c.lineWidth = Math.max(3, r * 0.11);
        c.beginPath(); c.moveTo(Math.cos(ha) * -r * 0.1, Math.sin(ha) * -r * 0.1); c.lineTo(Math.cos(ha) * r * 0.5, Math.sin(ha) * r * 0.5); c.stroke();
      }
      // Kim phút (dài, mảnh)
      c.strokeStyle = o.minuteColor;
      c.lineWidth = Math.max(2.5, r * 0.075);
      c.beginPath(); c.moveTo(Math.cos(ma) * -r * 0.12, Math.sin(ma) * -r * 0.12); c.lineTo(Math.cos(ma) * r * 0.8, Math.sin(ma) * r * 0.8); c.stroke();
      // Trục
      c.fillStyle = o.border;
      c.beginPath(); c.arc(0, 0, Math.max(2.5, r * 0.07), 0, TAU); c.fill();
      c.fillStyle = o.minuteColor;
      c.beginPath(); c.arc(0, 0, Math.max(1.2, r * 0.035), 0, TAU); c.fill();
    }
    c.restore();
  }

  /** Vẽ đồng hồ điện tử (khung + số) căn giữa tại (x, y), rộng w, cao h. */
  function drawDigital(c, x, y, w, h, text, opts) {
    const o = Object.assign({ bg: '#16213e', fg: '#7bf1a8', border: '#5b5f7a', alpha: 1 }, opts || {});
    c.save();
    c.globalAlpha = o.alpha;
    const rr = h * 0.22;
    c.fillStyle = o.border;
    roundRect(c, x - w / 2 - h * 0.08, y - h / 2 - h * 0.08, w + h * 0.16, h + h * 0.16, rr + h * 0.06);
    c.fill();
    c.fillStyle = o.bg;
    roundRect(c, x - w / 2, y - h / 2, w, h, rr);
    c.fill();
    c.font = '800 ' + Math.round(h * 0.62) + 'px ' + FONT;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = o.fg;
    c.shadowColor = o.fg; c.shadowBlur = h * 0.2;
    c.fillText(text, x, y + h * 0.04);
    c.restore();
  }

  function roundRect(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }

  /* ================= SINH CÂU HỎI ================= */
  /**
   * Cấu trúc câu hỏi:
   *  kind    : dạng bài (read, match, h24, five, kem, exact, digital, elapsed...)
   *  prompt  : { text, speech, clocks: [{h,m}], digital: 'hh:mm', session: 'chiều' }
   *  options : [{ label, clock: {h,m}|null, digital: 'hh:mm'|null, ok, speech }]
   *  answer  : { label, speech }   – câu trả lời đúng (để đọc, hiện gợi ý, ôn lại)
   *  explain : lời giải thích ngắn
   *  info    : dữ liệu tối thiểu để tạo lại đúng câu này (ôn lại thông minh) – xem fromInfo()
   *  Mỗi bộ sinh nhận thêm cfg ghi đè phần ngẫu nhiên (t, style, n5, variant, h24, h, m, start, dur, act) khi ôn lại.
   */
  function textOpt(label, ok, speech) { return { label: label, clock: null, digital: null, ok: !!ok, speech: speech || label }; }
  function clockOpt(t, ok, style) { return { label: readTime(t.h, t.m, style || 'plain'), clock: { h: h12(t.h), m: t.m }, digital: null, ok: !!ok, speech: 'Đồng hồ này chỉ ' + readTime(t.h, t.m, style || 'plain') }; }
  function digitalOpt(h, m, ok) { const d = digital(h, m); return { label: d, clock: null, digital: d, ok: !!ok, speech: h + ' giờ ' + m + ' phút' }; }

  /** Trộn 1 đáp án đúng với các đáp án sai (đã lọc trùng), lấy tối đa n phương án. */
  function buildOptions(correct, wrongs, n) {
    const seen = {};
    seen[correct.label] = true;
    const ws = [];
    for (let i = 0; i < wrongs.length; i++) {
      const w = wrongs[i];
      if (!w || seen[w.label]) continue;
      if (correct.clock && w.clock && sameTime(correct.clock, w.clock)) continue;
      seen[w.label] = true;
      ws.push(w);
    }
    const out = [correct].concat(ws.slice(0, n - 1));
    return shuffle(out);
  }

  /** Các thời điểm "nhầm lẫn thường gặp" quanh (h, m), chỉ dùng số phút bé đã học (minuteSet) trừ vài lỗi đọc nhầm kim. */
  function nearbyTimes(h, m, minuteSet) {
    const list = [];
    const inSet = (mm) => minuteSet.indexOf(mm) >= 0;
    const push = (hh, mm, force) => { if (mm >= 0 && mm < 60 && (force || inSet(mm))) list.push({ h: h12(hh), m: mm }); };
    push(h + 1, m);                                   // đọc nhầm kim giờ sang số kế tiếp
    push(h - 1, m);
    if (m > 0 && m % 5 === 0 && m / 5 !== m) push(h, m / 5, true);        // đọc số kim dài chỉ làm số phút (3 → "3 phút")
    if (m > 0 && m % 5 === 0) push(m / 5 === 0 ? 12 : m / 5, (h % 12) * 5);         // nhầm kim ngắn với kim dài (chỉ khi số phút đã học)
    if (m === 30) { push(h + 1, 0); push(h, 0); }
    const ms = shuffle(minuteSet.slice());
    for (let i = 0; i < ms.length && i < 4; i++) if (ms[i] !== m) push(h, ms[i]);
    push(h + 2, m); push(h - 2, m);
    push(h + 1, ms[0]); push(h - 1, ms[ms.length - 1]);
    push(h + 6, m);
    push(h + 3, m); push(h - 3, m);
    return list.filter((t) => !(h12(t.h) === h12(h) && t.m === m));
  }

  function mkTime(hours, minuteSet) {
    return { h: pick(hours), m: pick(minuteSet) };
  }
  const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  function wrap(o) {
    o.key = o.kind + '|' + (o.prompt.text || '') + '|' + o.answer.label;
    o.review = false;
    return o;
  }

  /** Chọn biến thể câu hỏi: cfg.variant (khi ôn lại) hoặc ngẫu nhiên theo các ngưỡng tích lũy. */
  function pickVariant(cfg, cuts) {
    if (cfg && Number.isInteger(cfg.variant) && cfg.variant >= 0 && cfg.variant <= cuts.length) return cfg.variant;
    const t = Math.random();
    for (let i = 0; i < cuts.length; i++) if (t < cuts[i]) return i;
    return cuts.length;
  }
  /** Tập số phút (không trùng, đã sắp xếp) để lưu vào info. */
  function uniqMinutes(arr) {
    const out = [];
    (arr || []).forEach((m) => { if (Number.isInteger(m) && m >= 0 && m <= 59 && out.indexOf(m) < 0) out.push(m); });
    return out.sort((a, b) => a - b);
  }
  const okH = (h) => Number.isInteger(h) && h >= 1 && h <= 12;
  const okM = (m) => Number.isInteger(m) && m >= 0 && m <= 59;

  /* ---------- Dạng 1: Nhìn đồng hồ kim → chọn cách đọc ---------- */
  function readQ(cfg) {
    const t = cfg.t && okH(cfg.t.h) && okM(cfg.t.m) ? { h: cfg.t.h, m: cfg.t.m } : mkTime(HOURS, cfg.minutes);
    const style = cfg.style || pick(cfg.styles || ['plain']);
    const correct = textOpt(readTime(t.h, t.m, style), true);
    const near = nearbyTimes(t.h, t.m, cfg.minutes);
    const wrongs = near.map((w) => textOpt(readTime(w.h, w.m, style)));
    if (style === 'kem') {
      // Lỗi hay gặp với "giờ kém": quên +1 giờ, hoặc lấy đúng số phút thay vì 60 − phút
      if (t.m > 30) {
        wrongs.unshift(textOpt(h12(t.h) + ' giờ kém ' + (60 - t.m) + ' phút'));
        wrongs.unshift(textOpt(h12(t.h + 1) + ' giờ kém ' + t.m + ' phút'));
      }
    }
    return wrap({
      kind: 'read',
      info: { kind: 'read', h: t.h, m: t.m, style: style, ms: uniqMinutes(cfg.minutes) },
      prompt: { text: 'Đồng hồ chỉ mấy giờ?', speech: 'Đồng hồ chỉ mấy giờ?', clocks: [t] },
      options: buildOptions(correct, shuffle(wrongs), cfg.n || 4),
      answer: { label: correct.label, speech: 'Đồng hồ chỉ ' + correct.label },
      explain: explainRead(t, style)
    });
  }

  function explainRead(t, style) {
    const h = h12(t.h), m = t.m;
    if (m === 0) return 'Kim dài chỉ số 12, kim ngắn chỉ số ' + h + ' nên là ' + h + ' giờ.';
    if (m === 30) return 'Kim dài chỉ số 6 là 30 phút. Kim ngắn đã qua số ' + h + ' nên là ' + h + ' giờ 30 phút (' + h + ' giờ rưỡi).';
    if (m === 15) return 'Kim dài chỉ số 3 là 15 phút. Kim ngắn qua số ' + h + ' một chút nên là ' + h + ' giờ 15 phút.';
    if (m % 5 === 0) {
      const base = 'Kim dài chỉ số ' + (m / 5) + ', đếm thêm 5: ' + m + ' phút. Kim ngắn đã qua số ' + h + ' nên là ' + h + ' giờ ' + m + ' phút.';
      if (style === 'kem' && m > 30) return base + ' Còn ' + (60 - m) + ' phút nữa là ' + h12(h + 1) + ' giờ, nên đọc là ' + h12(h + 1) + ' giờ kém ' + (60 - m) + ' phút.';
      return base;
    }
    const big = Math.floor(m / 5), small = m % 5;
    return 'Kim dài vừa qua số ' + (big || 12) + ' (' + big * 5 + ' phút) thêm ' + small + ' vạch nhỏ là ' + m + ' phút. Kim ngắn đã qua số ' + h + ' nên là ' + h + ' giờ ' + m + ' phút.';
  }

  /* ---------- Dạng 2: Nghe/đọc giờ → bắn đồng hồ kim đúng ---------- */
  function matchQ(cfg) {
    const t = cfg.t && okH(cfg.t.h) && okM(cfg.t.m) ? { h: cfg.t.h, m: cfg.t.m } : mkTime(HOURS, cfg.minutes);
    const style = cfg.style || pick(cfg.styles || ['plain']);
    const label = readTime(t.h, t.m, style);
    const correct = clockOpt(t, true, style);
    const wrongs = nearbyTimes(t.h, t.m, cfg.minutes).filter((w) => cfg.minutes.indexOf(w.m) >= 0).map((w) => clockOpt(w, false, style));
    return wrap({
      kind: 'match',
      info: { kind: 'match', h: t.h, m: t.m, style: style, ms: uniqMinutes(cfg.minutes) },
      prompt: { text: 'Bắn đồng hồ chỉ ' + label + '!', speech: 'Bắn đồng hồ chỉ ' + label, clocks: [] },
      options: buildOptions(correct, shuffle(wrongs), cfg.n || 3),
      answer: { label: label, speech: label + ': kim ngắn ' + hourHandText(t) + ', kim dài chỉ ' + minuteHandText(t.m) },
      explain: label + ': kim ngắn ' + hourHandText(t) + ', kim dài chỉ ' + minuteHandText(t.m) + '.'
    });
  }
  function hourHandText(t) {
    const h = h12(t.h);
    if (t.m === 0) return 'đúng số ' + h;
    if (t.m === 30) return 'ở giữa số ' + h + ' và số ' + h12(h + 1);
    if (t.m < 30) return 'qua số ' + h + ' một chút';
    return 'gần tới số ' + h12(h + 1);
  }
  function minuteHandText(m) {
    if (m === 0) return 'số 12';
    if (m % 5 === 0) return 'số ' + (m / 5);
    return 'qua số ' + (Math.floor(m / 5) || 12) + ' thêm ' + (m % 5) + ' vạch';
  }

  /* ---------- Dạng 3: Kim dài chỉ số n → bao nhiêu phút (lớp 3, 5 phút) ---------- */
  function fiveQ(cfg) {
    const n = Number.isInteger(cfg.n5) && cfg.n5 >= 1 && cfg.n5 <= 11 ? cfg.n5 : rnd(1, 11);
    const m = n * 5;
    const correct = textOpt(m + ' phút', true);
    const wrongs = [textOpt(n + ' phút'), textOpt((m + 5) + ' phút'), textOpt((m - 5 > 0 ? m - 5 : 55) + ' phút'), textOpt((n * 10 < 60 ? n * 10 : 30) + ' phút'), textOpt((60 - m) + ' phút')];
    return wrap({
      kind: 'five',
      info: { kind: 'five', n5: n },
      prompt: { text: 'Kim dài chỉ số ' + n + ' là bao nhiêu phút?', speech: 'Kim dài chỉ số ' + n + ' là bao nhiêu phút?', clocks: [{ h: 12, m: m }], hideHour: true, emphasizeMinutes: true },
      options: buildOptions(correct, shuffle(wrongs), cfg.n || 4),
      answer: { label: m + ' phút', speech: 'Kim dài chỉ số ' + n + ' là ' + m + ' phút' },
      explain: 'Mỗi số cách nhau 5 phút. Đếm 5, 10, 15… đến số ' + n + ' được ' + m + ' phút.'
    });
  }

  /* ---------- Dạng 4: 24 giờ và các buổi (lớp 2) ---------- */
  function h24Q(cfg) {
    const variant = pickVariant(cfg, [0.3, 0.55, 0.8]);
    const pm = Number.isInteger(cfg.h24) && cfg.h24 >= 13 && cfg.h24 <= 23 ? cfg.h24 : rnd(13, 23);   // giờ buổi chiều/tối/đêm
    if (variant === 0) {
      // "3 giờ chiều còn gọi là mấy giờ?" → 15 giờ
      const h24 = pm;
      const hh = h12(h24), s = session(h24);
      const correct = textOpt(h24 + ' giờ', true);
      const wrongs = [textOpt(hh + ' giờ'), textOpt((hh + 10) + ' giờ'), textOpt((h24 + 2 > 24 ? h24 - 2 : h24 + 2) + ' giờ'), textOpt((h24 - 1) + ' giờ'), textOpt((h24 + 1 > 24 ? 13 : h24 + 1) + ' giờ')];
      return wrap({
        kind: 'h24',
        info: { kind: 'h24', variant: 0, h24: h24 },
        prompt: { text: hh + ' giờ ' + s + ' còn gọi là mấy giờ?', speech: hh + ' giờ ' + s + ' còn gọi là mấy giờ?', clocks: [], session: s },
        options: buildOptions(correct, shuffle(wrongs), cfg.n || 4),
        answer: { label: h24 + ' giờ', speech: hh + ' giờ ' + s + ' còn gọi là ' + h24 + ' giờ' },
        explain: 'Buổi ' + s + ' ta lấy ' + hh + ' + 12 = ' + h24 + '. Vậy ' + hh + ' giờ ' + s + ' là ' + h24 + ' giờ.'
      });
    }
    if (variant === 1) {
      // "20 giờ còn gọi là mấy giờ?" → 8 giờ tối
      const h24 = pm;
      const hh = h12(h24), s = session(h24);
      const correct = textOpt(hh + ' giờ ' + s, true);
      const alt = s === 'chiều' ? 'tối' : 'chiều';
      // Đáp án nhiễu luôn là cách gọi hợp lệ (readSession) – không tạo "12 giờ sáng/chiều"
      const wrongs = [textOpt(hh + ' giờ sáng'), textOpt(readSession(h24 + 1 > 23 ? 13 : h24 + 1, 0)), textOpt(readSession(h24 - 1, 0)), textOpt(readSession(h24 - 10, 0)), textOpt(readSession(h24 - 12, 0)), textOpt(hh + ' giờ ' + alt)];
      return wrap({
        kind: 'h24',
        info: { kind: 'h24', variant: 1, h24: h24 },
        prompt: { text: h24 + ' giờ còn gọi là mấy giờ?', speech: h24 + ' giờ còn gọi là mấy giờ?', clocks: [] },
        options: buildOptions(correct, shuffle(wrongs), cfg.n || 4),
        answer: { label: hh + ' giờ ' + s, speech: h24 + ' giờ còn gọi là ' + hh + ' giờ ' + s },
        explain: h24 + ' − 12 = ' + hh + '. Từ 13 đến 18 giờ là buổi chiều, 19 đến 21 giờ là buổi tối, 22 đến 24 giờ là buổi đêm. Vậy ' + h24 + ' giờ là ' + hh + ' giờ ' + s + '.'
      });
    }
    if (variant === 2) {
      // Đồng hồ kim + buổi → giờ 24
      const h24 = pm;
      const hh = h12(h24), s = session(h24);
      const correct = textOpt(h24 + ' giờ', true);
      const wrongs = [textOpt(hh + ' giờ'), textOpt((h24 + 2 > 24 ? h24 - 2 : h24 + 2) + ' giờ'), textOpt((hh + 10) + ' giờ'), textOpt((h24 - 1) + ' giờ')];
      return wrap({
        kind: 'h24',
        info: { kind: 'h24', variant: 2, h24: h24 },
        prompt: { text: 'Buổi ' + s + ', đồng hồ chỉ như hình. Theo cách gọi 24 giờ, bây giờ là mấy giờ?', speech: 'Buổi ' + s + ', đồng hồ chỉ như hình. Theo cách gọi 24 giờ, bây giờ là mấy giờ?', clocks: [{ h: hh, m: 0 }], session: s },
        options: buildOptions(correct, shuffle(wrongs), cfg.n || 4),
        answer: { label: h24 + ' giờ', speech: 'Buổi ' + s + ', đồng hồ chỉ ' + hh + ' giờ, tức là ' + h24 + ' giờ' },
        explain: 'Đồng hồ chỉ ' + hh + ' giờ. Buổi ' + s + ' ta cộng thêm 12: ' + hh + ' + 12 = ' + h24 + ' giờ.'
      });
    }
    // "17 giờ là buổi nào?"
    const h24 = Number.isInteger(cfg.h24) && cfg.h24 >= 6 && cfg.h24 <= 23 ? cfg.h24 : pick([6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]);
    const s = session(h24);
    const correct = textOpt('Buổi ' + s, true);
    const wrongs = SESSIONS.filter((x) => x !== s).map((x) => textOpt('Buổi ' + x));
    return wrap({
      kind: 'h24',
      info: { kind: 'h24', variant: 3, h24: h24 },
      prompt: { text: h24 + ' giờ là buổi nào trong ngày?', speech: h24 + ' giờ là buổi nào trong ngày?', clocks: [] },
      options: buildOptions(correct, shuffle(wrongs), cfg.n || 4),
      answer: { label: 'Buổi ' + s, speech: h24 + ' giờ là buổi ' + s },
      explain: 'Sáng: 1 đến 10 giờ · Trưa: 11, 12 giờ · Chiều: 13 đến 18 giờ · Tối: 19 đến 21 giờ · Đêm: 22 đến 24 giờ. Vậy ' + h24 + ' giờ là buổi ' + s + '.'
    });
  }

  /* ---------- Dạng 5: Giờ kém (lớp 3) ---------- */
  const KEM_MINUTES = [40, 45, 50, 55];
  function kemQ(cfg) {
    const variant = pickVariant(cfg, [0.35, 0.6, 0.8]);
    const h = okH(cfg.h) ? cfg.h : pick(HOURS), m = KEM_MINUTES.indexOf(cfg.m) >= 0 ? cfg.m : pick(KEM_MINUTES);
    const hn = h12(h + 1), left = 60 - m;
    const kem = hn + ' giờ kém ' + left + ' phút';
    const plain = h + ' giờ ' + m + ' phút';
    const info = { kind: 'kem', variant: variant, h: h, m: m };
    if (variant === 0) {
      // "7 giờ 50 phút còn gọi là?" → 8 giờ kém 10 phút
      const correct = textOpt(kem, true);
      const wrongs = [textOpt(h + ' giờ kém ' + left + ' phút'), textOpt(hn + ' giờ kém ' + m + ' phút'), textOpt(h12(h + 2) + ' giờ kém ' + left + ' phút'), textOpt(hn + ' giờ kém ' + (left + 5) + ' phút'), textOpt(h + ' giờ kém ' + m + ' phút')];
      return wrap({
        kind: 'kem',
        info: info,
        prompt: { text: plain + ' còn gọi là?', speech: plain + ' còn gọi là?', clocks: [] },
        options: buildOptions(correct, shuffle(wrongs), cfg.n || 4),
        answer: { label: kem, speech: plain + ' còn gọi là ' + kem },
        explain: 'Còn ' + left + ' phút nữa là ' + hn + ' giờ (60 − ' + m + ' = ' + left + '), nên ' + plain + ' còn gọi là ' + kem + '.'
      });
    }
    if (variant === 1) {
      // "8 giờ kém 10 phút là mấy giờ mấy phút?" → 7 giờ 50 phút
      const correct = textOpt(plain, true);
      const wrongs = [textOpt(hn + ' giờ ' + left + ' phút'), textOpt(hn + ' giờ ' + m + ' phút'), textOpt(h + ' giờ ' + left + ' phút'), textOpt(h12(h - 1) + ' giờ ' + m + ' phút')];
      return wrap({
        kind: 'kem',
        info: info,
        prompt: { text: kem + ' là mấy giờ mấy phút?', speech: kem + ' là mấy giờ mấy phút?', clocks: [] },
        options: buildOptions(correct, shuffle(wrongs), cfg.n || 4),
        answer: { label: plain, speech: kem + ' là ' + plain },
        explain: kem + ' nghĩa là chưa tới ' + hn + ' giờ, còn thiếu ' + left + ' phút. 60 − ' + left + ' = ' + m + ', vậy là ' + plain + '.'
      });
    }
    if (variant === 2) {
      // Đồng hồ kim → đọc theo cách "giờ kém"
      const correct = textOpt(kem, true);
      const wrongs = [textOpt(h + ' giờ kém ' + left + ' phút'), textOpt(hn + ' giờ kém ' + m + ' phút'), textOpt(h12(h + 2) + ' giờ kém ' + left + ' phút'), textOpt(hn + ' giờ kém ' + (left === 5 ? 10 : left - 5) + ' phút')];
      return wrap({
        kind: 'kem',
        info: info,
        prompt: { text: 'Đọc đồng hồ theo cách "giờ kém":', speech: 'Đọc đồng hồ theo cách giờ kém', clocks: [{ h: h, m: m }] },
        options: buildOptions(correct, shuffle(wrongs), cfg.n || 4),
        answer: { label: kem, speech: 'Đồng hồ chỉ ' + plain + ', tức là ' + kem },
        explain: 'Đồng hồ chỉ ' + plain + '. Kim dài đã qua số 6, còn ' + left + ' phút nữa là ' + hn + ' giờ nên đọc là ' + kem + '.'
      });
    }
    // "Bắn đồng hồ chỉ 8 giờ kém 10 phút" → đồng hồ kim
    const correct = clockOpt({ h: h, m: m }, true, 'kem');
    const wrongs = [clockOpt({ h: hn, m: left }, false, 'kem'), clockOpt({ h: hn, m: m }, false, 'kem'), clockOpt({ h: h, m: left }, false, 'kem'), clockOpt({ h: h12(h - 1), m: m }, false, 'kem')];
    return wrap({
      kind: 'kem',
      info: info,
      prompt: { text: 'Bắn đồng hồ chỉ ' + kem + '!', speech: 'Bắn đồng hồ chỉ ' + kem, clocks: [] },
      options: buildOptions(correct, shuffle(wrongs), cfg.n || 3),
      answer: { label: kem, speech: kem + ' là ' + plain + ': kim ngắn gần tới số ' + hn + ', kim dài chỉ số ' + (m / 5) },
      explain: kem + ' là ' + plain + ': kim dài chỉ số ' + (m / 5) + ', kim ngắn gần tới số ' + hn + '.'
    });
  }

  /* ---------- Dạng 6: Chính xác đến phút & đồng hồ điện tử (lớp 3) ---------- */
  function exactQ(cfg) {
    const variant = pickVariant(cfg, [0.4, 0.7, 0.85]);
    const h = okH(cfg.h) ? cfg.h : pick(HOURS);
    let m = okM(cfg.m) && cfg.m % 5 !== 0 ? cfg.m : rnd(1, 59);
    if (m % 5 === 0) m = (m + rnd(1, 4)) % 60 || 7;
    const plain = h + ' giờ ' + m + ' phút';
    if (variant === 0) {
      // Đồng hồ kim chính xác đến phút → cách đọc
      const correct = textOpt(plain, true);
      const big = Math.floor(m / 5), small = m % 5;
      // Đáp án nhiễu là giờ hợp lệ: không có "11 giờ 0 phút" hay "60 phút"
      const wrongs = [textOpt(h12(h + 1) + ' giờ ' + m + ' phút'), textOpt(readTime(h, big * 5)), textOpt(h + ' giờ ' + (big + small) + ' phút'), textOpt(readTime(h, (m + 5) % 60)), textOpt(big * 5 + 5 >= 60 ? readTime(h12(h + 1), 0) : readTime(h, big * 5 + 5))];
      return wrap({
        kind: 'exact',
        info: { kind: 'exact', variant: 0, h: h, m: m },
        prompt: { text: 'Đồng hồ chỉ mấy giờ?', speech: 'Đồng hồ chỉ mấy giờ?', clocks: [{ h: h, m: m }], emphasizeMinutes: true },
        options: buildOptions(correct, shuffle(wrongs), cfg.n || 4),
        answer: { label: plain, speech: 'Đồng hồ chỉ ' + plain },
        explain: explainRead({ h: h, m: m }, 'plain')
      });
    }
    if (variant === 1) {
      // Đồng hồ điện tử 24 giờ → cách đọc kèm buổi
      const h24 = Number.isInteger(cfg.h24) && cfg.h24 >= 6 && cfg.h24 <= 22 ? cfg.h24 : pick([6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]);
      const hh = h12(h24), s = session(h24);
      const label = readSession(h24, m);
      const correct = textOpt(label, true);
      // Với 12 giờ chỉ có "trưa"/"đêm" là cách gọi hợp lệ
      const otherS = SESSIONS.filter((x) => x !== s && (hh !== 12 || x === 'trưa' || x === 'đêm'));
      const swapH = h12(m);            // đảo giờ/phút – bỏ nếu tạo ra "12 giờ … sáng/chiều/tối" (không phải cách gọi hợp lệ)
      const wrongs = [textOpt(hh + ' giờ ' + m + ' phút ' + pick(otherS)), textOpt(h12(hh + 1) + ' giờ ' + m + ' phút ' + s), textOpt(hh + ' giờ ' + ((m + 10) % 60) + ' phút ' + s)];
      if (swapH !== 12 || s === 'trưa' || s === 'đêm') wrongs.push(textOpt(swapH + ' giờ ' + hh + ' phút ' + s));
      if (h24 > 12) wrongs.unshift(textOpt(h24 + ' giờ ' + m + ' phút sáng'));
      return wrap({
        kind: 'digital',
        info: { kind: 'digital', variant: 1, m: m, h24: h24 },
        prompt: { text: 'Đồng hồ điện tử chỉ mấy giờ?', speech: 'Đồng hồ điện tử chỉ mấy giờ?', clocks: [], digital: digital(h24, m) },
        options: buildOptions(correct, shuffle(wrongs), cfg.n || 4),
        answer: { label: label, speech: 'Đồng hồ điện tử chỉ ' + label },
        explain: 'Số trước dấu hai chấm là giờ (' + h24 + '), số sau là phút (' + m + ').' + (h24 > 12 ? ' ' + h24 + ' − 12 = ' + hh + ', buổi ' + s + '.' : ' Buổi ' + s + '.')
      });
    }
    if (variant === 2) {
      // Đọc giờ → chọn đồng hồ điện tử
      const h24 = Number.isInteger(cfg.h24) && cfg.h24 >= 6 && cfg.h24 <= 21 ? cfg.h24 : pick([6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]);
      const hh = h12(h24), s = session(h24);
      const label = readSession(h24, m);
      const correct = digitalOpt(h24, m, true);
      const wrongs = [digitalOpt(h24 > 12 ? hh : (hh + 12) % 24, m), digitalOpt(h24, (m * 10) % 60 || 5), digitalOpt(m % 24, h24 > 12 ? hh : h24), digitalOpt((h24 + 1) % 24, m)];
      return wrap({
        kind: 'digital',
        info: { kind: 'digital', variant: 2, m: m, h24: h24 },
        prompt: { text: 'Bắn đồng hồ điện tử chỉ ' + label + '!', speech: 'Bắn đồng hồ điện tử chỉ ' + label, clocks: [] },
        options: buildOptions(correct, shuffle(wrongs), cfg.n || 4),
        answer: { label: digital(h24, m), speech: label + ' là ' + h24 + ' giờ ' + m + ' phút' },
        explain: (h24 > 12 ? 'Buổi ' + s + ': ' + hh + ' + 12 = ' + h24 + '. ' : '') + 'Đồng hồ điện tử ghi giờ trước, phút sau: ' + digital(h24, m) + '.'
      });
    }
    // Đọc giờ → đồng hồ kim chính xác đến phút
    const correct = clockOpt({ h: h, m: m }, true);
    const wrongs = [clockOpt({ h: h12(h + 1), m: m }), clockOpt({ h: h, m: (m + 20) % 60 }), clockOpt({ h: h, m: (m + 40) % 60 }), clockOpt({ h: h12(h + 6), m: m })];
    // Bảng đáp án cần vạch phút đậm: bé phải đếm từng vạch nhỏ mới phân biệt được
    const exactOpts = buildOptions(correct, shuffle(wrongs), cfg.n || 3);
    exactOpts.forEach((o) => { o.emphasizeMinutes = true; });
    return wrap({
      kind: 'exact',
      info: { kind: 'exact', variant: 3, h: h, m: m },
      prompt: { text: 'Bắn đồng hồ chỉ ' + plain + '!', speech: 'Bắn đồng hồ chỉ ' + plain, clocks: [] },
      options: exactOpts,
      answer: { label: plain, speech: plain + ': kim ngắn ' + hourHandText({ h: h, m: m }) + ', kim dài ' + minuteHandText(m) },
      explain: plain + ': kim dài ' + minuteHandText(m) + ', kim ngắn ' + hourHandText({ h: h, m: m }) + '.'
    });
  }

  /* ---------- Dạng 7: Thời gian trôi qua (lớp 3) ---------- */
  const ACTIVITIES = [
    { v: 'đọc sách', e: '📚' }, { v: 'tập vẽ', e: '🎨' }, { v: 'đá bóng', e: '⚽' }, { v: 'học bài', e: '✏️' },
    { v: 'tưới cây', e: '🌱' }, { v: 'chơi cờ', e: '♟️' }, { v: 'tập đàn', e: '🎹' }, { v: 'đạp xe', e: '🚲' }
  ];
  const DURS = [15, 30, 45, 60, 75, 90];
  function elapsedQ(cfg) {
    const variant = pickVariant(cfg, [0.45, 0.75]);
    const start = cfg.start && okH(cfg.start.h) && [0, 15, 30, 45].indexOf(cfg.start.m) >= 0 ? { h: cfg.start.h, m: cfg.start.m } : { h: pick(HOURS), m: pick([0, 15, 30, 45]) };
    const durs = cfg.durs || DURS;
    const dur = durs.indexOf(cfg.dur) >= 0 ? cfg.dur : pick(durs);
    const act = Number.isInteger(cfg.act) && ACTIVITIES[cfg.act] ? cfg.act : rnd(0, ACTIVITIES.length - 1);
    const end = addMinutes(start.h, start.m, dur);
    const sLabel = readTime(start.h, start.m, 'plain'), eLabel = readTime(end.h, end.m, 'plain');
    const info = { kind: 'elapsed', variant: variant, sh: start.h, sm: start.m, dur: dur, act: act };
    if (variant === 0) {
      // Hai đồng hồ → bao lâu
      const correct = textOpt(readDuration(dur), true);
      const wrongs = DURS.filter((d) => d !== dur).map((d) => textOpt(readDuration(d)));
      if (end.m > 0) wrongs.push(textOpt(end.m + ' phút'));
      return wrap({
        kind: 'elapsed',
        info: info,
        prompt: { text: 'Từ ' + sLabel + ' đến ' + eLabel + ' là bao lâu?', speech: 'Từ ' + sLabel + ' đến ' + eLabel + ' là bao lâu?', clocks: [start, end], arrow: true },
        options: buildOptions(correct, shuffle(wrongs), cfg.n || 4),
        answer: { label: readDuration(dur), speech: 'Từ ' + sLabel + ' đến ' + eLabel + ' là ' + readDuration(dur) },
        explain: explainElapsed(start, end, dur)
      });
    }
    if (variant === 1) {
      // Bắt đầu + kéo dài → kết thúc lúc mấy giờ (chọn đồng hồ kim)
      const a = ACTIVITIES[act];
      const correct = clockOpt(end, true);
      const wrongs = [clockOpt(addMinutes(end.h, end.m, 60)), clockOpt(addMinutes(end.h, end.m, -30)), clockOpt(addMinutes(end.h, end.m, 30)), clockOpt(start), clockOpt(addMinutes(end.h, end.m, -60))];
      const text = 'Bé ' + a.v + ' từ ' + sLabel + ', trong ' + readDuration(dur) + '. Bé xong lúc mấy giờ?';
      return wrap({
        kind: 'elapsed',
        info: info,
        prompt: { text: a.e + ' ' + text, speech: text, clocks: [] },
        options: buildOptions(correct, shuffle(wrongs), cfg.n || 3),
        answer: { label: eLabel, speech: 'Bé xong lúc ' + eLabel },
        explain: sLabel + ' thêm ' + readDuration(dur) + ' là ' + eLabel + '.'
      });
    }
    // Bắt đầu + kéo dài → kết thúc (chữ)
    const a = ACTIVITIES[act];
    const correct = textOpt(eLabel, true);
    const wrongs = [textOpt(readTime(end.h, (end.m + 30) % 60)), textOpt(readTime(h12(end.h + 1), end.m)), textOpt(readTime(start.h, (start.m + (dur % 60 || 30)) % 60)), textOpt(readTime(h12(end.h - 1), end.m)), textOpt(readTime(start.h, start.m))];
    const text = 'Bé ' + a.v + ' lúc ' + sLabel + ' và ' + a.v + ' trong ' + readDuration(dur) + '. Bé xong lúc mấy giờ?';
    return wrap({
      kind: 'elapsed',
      info: info,
      prompt: { text: a.e + ' ' + text, speech: text, clocks: [start] },
      options: buildOptions(correct, shuffle(wrongs), cfg.n || 4),
      answer: { label: eLabel, speech: 'Bé xong lúc ' + eLabel },
      explain: sLabel + ' thêm ' + readDuration(dur) + ' là ' + eLabel + '.'
    });
  }
  function explainElapsed(start, end, dur) {
    const sL = readTime(start.h, start.m), eL = readTime(end.h, end.m);
    if (dur < 60) return 'Kim dài đi từ số ' + (start.m / 5 || 12) + ' đến số ' + (end.m / 5 || 12) + ' là ' + dur + ' phút.';
    if (dur === 60) return 'Kim dài đi trọn một vòng, từ ' + sL + ' đến ' + eL + ' là 1 giờ.';
    return 'Từ ' + sL + ' đến ' + readTime(h12(start.h + 1), start.m) + ' là 1 giờ, thêm ' + (dur - 60) + ' phút nữa là ' + eL + '. Tổng cộng ' + readDuration(dur) + '.';
  }

  /* ---------- Tạo lại câu hỏi từ info (ôn lại thông minh) ---------- */
  /** Tập phút dùng cho đáp án nhiễu khi info cũ không có ms. */
  function minutesAround(m) {
    if (m % 5 === 0) return [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
    return uniqMinutes([m, 0, 15, 30, 45]);
  }
  /**
   * Tạo lại đúng câu hỏi đã lưu trong q.info (cùng dạng, cùng đáp án) với đáp án nhiễu mới.
   * cfg.n: số phương án (mặc định theo dạng bài). Trả về null nếu info không hợp lệ.
   */
  function fromInfo(info, cfg) {
    if (!info || typeof info !== 'object') return null;
    const n = cfg && cfg.n;
    try {
      switch (info.kind) {
        case 'read':
        case 'match': {
          if (!okH(info.h) || !okM(info.m)) return null;
          const ms = uniqMinutes(Array.isArray(info.ms) && info.ms.length ? info.ms : minutesAround(info.m));
          if (ms.indexOf(info.m) < 0) ms.push(info.m);
          const c = { n: n || (info.kind === 'read' ? 4 : 3), t: { h: info.h, m: info.m }, style: ['plain', 'ruoi', 'kem'].indexOf(info.style) >= 0 ? info.style : 'plain', minutes: ms };
          return info.kind === 'read' ? readQ(c) : matchQ(c);
        }
        case 'five':
          if (!(Number.isInteger(info.n5) && info.n5 >= 1 && info.n5 <= 11)) return null;
          return fiveQ({ n: n || 4, n5: info.n5 });
        case 'h24':
          if (!Number.isInteger(info.h24)) return null;
          return h24Q({ n: n || 4, variant: info.variant, h24: info.h24 });
        case 'kem':
          if (!okH(info.h) || KEM_MINUTES.indexOf(info.m) < 0) return null;
          return kemQ({ n: n || (info.variant === 3 ? 3 : 4), variant: info.variant, h: info.h, m: info.m });
        case 'exact':
        case 'digital':
          if (!okM(info.m)) return null;
          return exactQ({ n: n || (info.variant === 3 ? 3 : 4), variant: info.variant, h: info.h, m: info.m, h24: info.h24 });
        case 'elapsed':
          if (!okH(info.sh) || !okM(info.sm) || DURS.indexOf(info.dur) < 0) return null;
          return elapsedQ({ n: n || (info.variant === 1 ? 3 : 4), variant: info.variant, start: { h: info.sh, m: info.sm }, dur: info.dur, act: info.act });
        default:
          return null;
      }
    } catch (e) { return null; }
  }

  /* ---------- Tránh lặp câu vừa hỏi ---------- */
  const recent = [];
  function fresh(genFn) {
    let q = genFn();
    for (let i = 0; i < 8 && recent.indexOf(q.key) >= 0; i++) q = genFn();
    recent.push(q.key);
    if (recent.length > 6) recent.shift();
    return q;
  }

  window.Clock = {
    rnd, chance, pick, shuffle, TAU, FONT,
    h12, pad2, readTime, read24, readSession, readDuration, session, digital, addMinutes, sameTime, SESSION_ICON, SESSIONS,
    drawClock, drawDigital, roundRect,
    textOpt, clockOpt, digitalOpt, buildOptions, nearbyTimes, hourHandText, minuteHandText, explainRead,
    readQ, matchQ, fiveQ, h24Q, kemQ, exactQ, elapsedQ, fromInfo, fresh
  };
})();
