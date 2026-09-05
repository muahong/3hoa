/* ============================================================
   clock.js – Kiến thức xem đồng hồ cho Tháp Đồng Hồ
   - Biểu diễn một mốc giờ và cách đọc tiếng Việt
     (giờ đúng, giờ rưỡi, giờ 15 phút, đếm 5 phút, giờ kém, 24 giờ)
   - Sinh mốc giờ và các đáp án nhiễu "giống lỗi thường gặp" theo từng màn
   - Vẽ đồng hồ bằng SVG (bài học, hỏi đáp, ôn lại)
   - Bài học trước mỗi màn và ngân hàng câu hỏi sau mỗi màn
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
  /** Chọn ngẫu nhiên theo trọng số: [[giá trị, trọng số], ...] */
  const weighted = (pairs) => {
    let sum = 0;
    for (let i = 0; i < pairs.length; i++) sum += pairs[i][1];
    let r = Math.random() * sum;
    for (let i = 0; i < pairs.length; i++) {
      r -= pairs[i][1];
      if (r < 0) return pairs[i][0];
    }
    return pairs[pairs.length - 1][0];
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ================= MỐC GIỜ ================= */
  const PERIOD_ICON = { 'sáng': '🌅', 'trưa': '☀️', 'chiều': '🌤️', 'tối': '🌙', 'đêm': '🌃' };

  /** Buổi trong ngày theo giờ 24 (dùng cho màn "Một ngày 24 giờ"). */
  function periodOf(h24) {
    if (h24 >= 1 && h24 <= 10) return 'sáng';
    if (h24 === 11 || h24 === 12) return 'trưa';
    if (h24 >= 13 && h24 <= 17) return 'chiều';
    if (h24 >= 18 && h24 <= 21) return 'tối';
    return 'đêm';
  }

  /**
   * Tạo mốc giờ.
   *  h     : giờ trên mặt đồng hồ 1..12
   *  m     : phút 0..59
   *  style : cách đọc – 'plain' (3 giờ 15 phút), 'kem' (8 giờ kém 15 phút), '24' (15 giờ)
   *  h24   : giờ trong ngày 0..23 (chỉ với style '24')
   *  lv    : số thứ tự màn sinh ra mốc giờ này (để chọn đáp án nhiễu phù hợp)
   */
  function mk(h, m, style, h24, lv) {
    const t = { h: ((h - 1) % 12 + 12) % 12 + 1, m: ((m % 60) + 60) % 60, style: style || 'plain', lv: lv || 1 };
    if (h24 != null) {
      t.h24 = ((h24 % 24) + 24) % 24;
      t.h = t.h24 % 12 || 12;
      t.period = periodOf(t.h24);
    }
    return t;
  }
  function mk24(h24, m, lv) { return mk(0, m, '24', h24, lv); }

  /** Hai mốc giờ có cùng vị trí kim (và cùng buổi nếu có) hay không. */
  function same(a, b) {
    if (a.h !== b.h || a.m !== b.m) return false;
    if (a.h24 != null && b.h24 != null) return a.h24 === b.h24;
    return true;
  }

  /** Khóa so trùng: màn 24 giờ phân biệt theo buổi, các màn khác chỉ theo vị trí kim. */
  function key(t, mode) {
    if (mode === '24' && t.h24 != null) return 'D' + t.h24 + ':' + t.m;
    return (t.h % 12) + ':' + t.m;
  }

  /** Các dòng chữ ghi trên cột, ví dụ ["3 giờ", "15 phút"], ["8 giờ", "kém 15 phút"], ["15 giờ"]. */
  function lines(t) {
    if (t.style === '24' && t.h24 != null) {
      const out = [t.h24 + ' giờ'];
      if (t.m) out.push(t.m + ' phút');
      return out;
    }
    if (t.style === 'kem' && t.m >= 35) {
      return [(t.h % 12 + 1) + ' giờ', 'kém ' + (60 - t.m) + ' phút'];
    }
    const out = [t.h + ' giờ'];
    if (t.m) out.push(t.m + ' phút');
    return out;
  }

  /** Cách đọc đầy đủ: "3 giờ 15 phút", "8 giờ kém 15 phút", "15 giờ 30 phút". */
  function read(t) { return lines(t).join(' '); }

  /** Cách đọc "thường" (không dùng kém, không dùng 24 giờ): "7 giờ 45 phút". */
  function readPlain(t) { return t.h + ' giờ' + (t.m ? ' ' + t.m + ' phút' : ''); }

  /** Câu để giọng đọc nói ra. */
  function speech(t) {
    if (t.style === '24' && t.h24 != null) {
      const s = read(t);
      if (t.h24 >= 13 || t.h24 === 0) return s + ', tức là ' + readPlain(t) + ' ' + t.period;
      return s + ' ' + t.period;
    }
    if (t.style === 'kem' && t.m >= 35) return read(t) + ', tức là ' + readPlain(t);
    if (t.m === 30 && t.lv <= 4) return read(t) + ', hay ' + t.h + ' giờ rưỡi';
    return read(t);
  }

  /** Dạng đồng hồ điện tử: "15:00", "07:05". */
  function digital(t) {
    const hh = t.h24 != null ? t.h24 : t.h;
    return (hh < 10 ? '0' : '') + hh + ':' + (t.m < 10 ? '0' : '') + t.m;
  }

  /** Số trên mặt đồng hồ mà kim dài đang chỉ (12 khi 0 phút). */
  function minuteNumber(m) { return (m / 5) % 12 || 12; }

  /** Lời giải thích cách đọc một mốc giờ (dùng trong hỏi đáp và ôn lại). */
  function explain(t) {
    const H = t.h, nextH = t.h % 12 + 1;
    let s;
    if (t.m === 0) {
      s = 'Kim dài chỉ số 12 nên là giờ đúng. Kim ngắn chỉ số ' + H + ' → ' + H + ' giờ.';
    } else {
      if (t.m % 5 === 0) {
        s = 'Kim dài chỉ số ' + minuteNumber(t.m) + ' → ' + minuteNumber(t.m) + ' × 5 = ' + t.m + ' phút. ';
      } else {
        const base = Math.floor(t.m / 5) * 5, extra = t.m - base;
        s = 'Kim dài qua số ' + (base ? base / 5 : 12) + ' (' + base + ' phút) thêm ' + extra + ' vạch nhỏ → ' + t.m + ' phút. ';
      }
      s += 'Kim ngắn đã qua số ' + H + ' nhưng chưa tới số ' + nextH + ' → ' + readPlain(t) + '.';
      if (t.style === 'kem' && t.m >= 35) {
        s += ' Còn ' + (60 - t.m) + ' phút nữa là đến ' + nextH + ' giờ, nên đọc là ' + read(t) + '.';
      }
    }
    if (t.style === '24' && t.h24 != null) {
      if (t.h24 >= 13) s += ' Buổi ' + t.period + ' nên cộng thêm 12: ' + H + ' + 12 = ' + t.h24 + ' → ' + read(t) + '.';
      else if (t.h24 === 0) s += ' 12 giờ đêm còn gọi là 0 giờ.';
      else s += ' Buổi ' + t.period + ' nên giữ nguyên: ' + read(t) + '.';
    }
    return s;
  }

  /** Giải thích ngắn (một dòng) hiện trên HUD ngay khi bé đọc nhầm. */
  function explainShort(t) {
    let s;
    if (t.m === 0) s = 'Kim dài số 12 → giờ đúng';
    else if (t.m % 5 === 0) s = 'Kim dài số ' + minuteNumber(t.m) + ' → ' + t.m + ' phút';
    else s = 'Kim dài qua số ' + (Math.floor(t.m / 5) || 12) + ' thêm ' + (t.m % 5) + ' vạch → ' + t.m + ' phút';
    if (t.style === 'kem' && t.m >= 35) s += ', còn ' + (60 - t.m) + ' phút nữa là ' + (t.h % 12 + 1) + ' giờ';
    if (t.style === '24' && t.h24 != null) {
      if (t.h24 >= 13) s += ', buổi ' + t.period + ' → ' + t.h + ' + 12 = ' + t.h24 + ' giờ';
      else if (t.h24 === 0) s += ', 12 giờ đêm = 0 giờ';
      else s += ', buổi ' + t.period + ' giữ nguyên';
    }
    return s;
  }

  /** Đổi ký hiệu toán học thành lời nói để giọng đọc không đọc "mũi tên", "nhân", "bằng" sai. */
  function speakable(s) {
    return String(s == null ? '' : s)
      .replace(/(\d{1,2}):(\d{2})/g, function (m, h, mm) { return Number(h) + ' giờ' + (Number(mm) ? ' ' + Number(mm) + ' phút' : ''); })
      .replace(/\s*→\s*/g, ' là ')
      .replace(/\s*×\s*/g, ' nhân ')
      .replace(/\s*=\s*/g, ' bằng ')
      .replace(/\s*−\s*/g, ' trừ ')
      .replace(/\s*\+\s*/g, ' cộng ')
      .replace(/\s+/g, ' ').trim();
  }

  /* ================= VẼ ĐỒNG HỒ (SVG) ================= */
  /**
   * SVG mặt đồng hồ. opts: size, ring ('min' | 'kem' | null), badge (mặc định có nếu có buổi), digital, cls
   * Kim được đặt góc bằng CSS transform để có thể hoạt hình (xem lesson demo).
   */
  function svg(t, o) {
    o = o || {};
    const size = o.size || 180;
    const ring = o.ring || null;
    const hasBadge = !!(t.period && o.badge !== false);
    // Hộp nhìn phải đủ rộng cho chữ dài nhất của vòng "kém": "kém 25" neo cuối tại x = −108
    let ext = ring === 'kem' ? 180 : ring ? 130 : 110;
    if (hasBadge || o.digital) ext = Math.max(ext, 136);
    // Hộp nhìn rộng ra thì vẽ TO ra theo, nếu không mặt đồng hồ và chữ vòng "kém" sẽ bị thu nhỏ lại
    // (kích thước cuối cùng vẫn có thể do CSS quyết định – xem .clock-svg.has-ring trong style.css).
    const px = Math.round(size * ext / 110);
    const hA = ((t.h % 12) + t.m / 60) * 30, mA = t.m * 6;
    let s = '<svg class="clock-svg' + (ring ? ' has-ring' : '') + (o.cls ? ' ' + o.cls : '') + '" viewBox="' + (-ext) + ' ' + (-ext) + ' ' + (ext * 2) + ' ' + (ext * 2) + '" width="' + px + '" height="' + px + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + esc(read(t)) + '">';
    s += '<circle r="104" fill="#e9edf8"/><circle r="100" fill="#ffffff" stroke="#2b2d42" stroke-width="6"/>';
    for (let i = 0; i < 60; i++) {
      const a = i * 6 * Math.PI / 180, big = i % 5 === 0;
      const r1 = big ? 84 : 90, r2 = 96;
      s += '<line x1="' + (Math.sin(a) * r1).toFixed(1) + '" y1="' + (-Math.cos(a) * r1).toFixed(1) + '" x2="' + (Math.sin(a) * r2).toFixed(1) + '" y2="' + (-Math.cos(a) * r2).toFixed(1) + '" stroke="' + (big ? '#2b2d42' : '#9aa0b8') + '" stroke-width="' + (big ? 4 : 2) + '" stroke-linecap="round"/>';
    }
    for (let n = 1; n <= 12; n++) {
      const a = n * 30 * Math.PI / 180;
      s += '<text x="' + (Math.sin(a) * 68).toFixed(1) + '" y="' + (-Math.cos(a) * 68).toFixed(1) + '" font-size="21" font-weight="800" text-anchor="middle" dominant-baseline="central" fill="#2b2d42">' + n + '</text>';
    }
    if (ring) {
      // Vòng số phút nằm NGOÀI mặt đồng hồ: chữ "kém 5…25" neo ra ngoài để không chạm viền (đọc nhầm thành "kém 1")
      for (let n = 1; n <= 12; n++) {
        const a = n * 30 * Math.PI / 180;
        let label = String(n * 5);
        let color = '#d84f1d';
        let anchor = 'middle', rad = 117, fs = 14;
        if (ring === 'kem') {
          fs = 18;                                     // đủ lớn để đọc được cả khi đồng hồ vẽ nhỏ trên điện thoại
          if (n >= 7 && n <= 11) { label = 'kém ' + (60 - n * 5); color = '#5a3f85'; anchor = 'end'; rad = 108; }
          else if (n >= 1 && n <= 5) { anchor = 'start'; rad = 108; }
          else { rad = 121; if (n === 12) label = '60'; }
        }
        s += '<text x="' + (Math.sin(a) * rad).toFixed(1) + '" y="' + (-Math.cos(a) * rad).toFixed(1) + '" font-size="' + fs + '" font-weight="800" text-anchor="' + anchor + '" dominant-baseline="central" fill="' + color + '">' + label + '</text>';
      }
    }
    // Nhãn buổi và đồng hồ điện tử vẽ TRƯỚC và NGOÀI mặt đồng hồ để không che kim giờ (lúc 5–7 giờ)
    if (hasBadge) {
      s += '<rect x="-44" y="108" width="88" height="26" rx="13" fill="#fff4d6" stroke="#e0a800" stroke-width="2"/>';
      s += '<text y="121" font-size="15" font-weight="800" text-anchor="middle" dominant-baseline="central" fill="#8a5a00">' + PERIOD_ICON[t.period] + ' ' + t.period + '</text>';
    }
    if (o.digital) {
      s += '<rect x="-36" y="-134" width="72" height="24" rx="6" fill="#2b2d42"/>';
      s += '<text y="-122" font-size="16" font-weight="800" text-anchor="middle" dominant-baseline="central" fill="#7bf1a8" font-family="monospace">' + esc(digital(t)) + '</text>';
    }
    s += '<g class="hand hour" style="transform:rotate(' + hA.toFixed(1) + 'deg)"><line x1="0" y1="12" x2="0" y2="-50" stroke="#118ab2" stroke-width="11" stroke-linecap="round"/></g>';
    s += '<g class="hand minute" style="transform:rotate(' + mA.toFixed(1) + 'deg)"><line x1="0" y1="14" x2="0" y2="-80" stroke="#ff6b35" stroke-width="7" stroke-linecap="round"/></g>';
    s += '<circle r="7" fill="#2b2d42"/>';
    s += '</svg>';
    return s;
  }

  /** Quay kim của một SVG đã vẽ sang mốc giờ mới (luôn quay theo chiều kim đồng hồ). */
  function setSvgTime(svgEl, t) {
    if (!svgEl) return;
    const hour = svgEl.querySelector('.hand.hour'), minute = svgEl.querySelector('.hand.minute');
    const targetH = ((t.h % 12) + t.m / 60) * 30, targetM = t.m * 6;
    const spin = (el, target) => {
      if (!el) return;
      const cur = Number(el.getAttribute('data-angle') || (/rotate\(([-\d.]+)deg\)/.exec(el.style.transform || '') || [0, 0])[1]) || 0;
      let d = ((target - cur) % 360 + 360) % 360;
      if (d < 0.01) d = 0;
      const next = cur + d;
      el.setAttribute('data-angle', String(next));
      el.style.transform = 'rotate(' + next.toFixed(1) + 'deg)';
    };
    spin(hour, targetH);
    spin(minute, targetM);
    const badge = svgEl.querySelector('text[fill="#8a5a00"]');
    if (badge && t.period) badge.textContent = PERIOD_ICON[t.period] + ' ' + t.period;
    const dig = svgEl.querySelector('text[font-family="monospace"]');
    if (dig) dig.textContent = digital(t);
    svgEl.setAttribute('aria-label', read(t));
  }

  /* ================= SINH MỐC GIỜ THEO MÀN ================= */
  const FIVES = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const ALL_MIN = []; for (let i = 0; i < 60; i++) ALL_MIN.push(i);
  const hourRnd = () => rnd(1, 12);

  /** Sinh một mốc giờ cho màn n (1..8). */
  function genFor(n) {
    switch (n) {
      case 1: return mk(hourRnd(), 0, 'plain', null, 1);
      case 2: return mk(hourRnd(), chance(0.7) ? 30 : 0, 'plain', null, 2);
      case 3: return mk(hourRnd(), weighted([[15, 55], [30, 25], [0, 20]]), 'plain', null, 3);
      case 4: return mk(hourRnd(), chance(0.08) ? 0 : pick(FIVES), 'plain', null, 4);
      case 5: return mk(hourRnd(), chance(0.75) ? pick([35, 40, 45, 50, 55]) : pick([5, 10, 15, 20, 25, 30]), 'kem', null, 5);
      case 6: {
        let m;
        if (chance(0.6)) { do { m = rnd(1, 59); } while (m % 5 === 0); }
        else m = pick(FIVES);
        return mk(hourRnd(), m, 'plain', null, 6);
      }
      case 7: {
        const h24 = chance(0.75) ? rnd(13, 23) : rnd(1, 12);
        return mk24(h24, weighted([[0, 60], [30, 25], [15, 7], [45, 8]]), 7);
      }
      default: {
        const sub = weighted([[1, 5], [2, 9], [3, 11], [4, 15], [5, 15], [6, 15], [7, 15]]);
        const t = genFor(sub);
        t.lv = sub;
        return t;
      }
    }
  }

  /** Các số phút hợp lệ của màn n (để tạo đáp án nhiễu cùng "kiểu" với mốc giờ). */
  function minutesFor(n) {
    switch (n) {
      case 1: return [0];
      case 2: return [0, 30];
      case 3: return [0, 15, 30];
      case 4: case 5: return [0].concat(FIVES);
      case 6: return ALL_MIN;
      case 7: return [0, 15, 30, 45];
      default: return ALL_MIN;
    }
  }

  /** Đáp án nhiễu "giống lỗi thường gặp" của mốc giờ t (đã xáo trộn, chưa lọc trùng). */
  function near(t) {
    const lv = t.lv || 1;
    const mins = minutesFor(lv);
    const out = [];
    const seen = {};
    const push = (c) => {
      if (!c || same(c, t)) return;
      if (mins.indexOf(c.m) < 0) return;
      const k = key(c, c.style === '24' ? '24' : 'x');
      if (seen[k]) return;
      seen[k] = true;
      out.push(c);
    };
    if (t.style === '24' && t.h24 != null) {
      const H = t.h24;
      const add24 = (h24, m) => { h24 = ((h24 % 24) + 24) % 24; if (h24 === 0) return; push(mk24(h24, m, lv)); };
      add24(H + 12, t.m);                    // cùng mặt đồng hồ, khác buổi (quên cộng 12)
      add24(H + 1, t.m); add24(H - 1, t.m);
      add24(H + 2, t.m); add24(H - 2, t.m);
      if (t.m === 0) { add24(H, 30); } else { add24(H, 0); add24(H, 60 - t.m); }
      add24(H + 10, t.m);
      return shuffle(out);
    }
    const addP = (h, m) => { if (m < 0 || m > 59) return; push(mk(h, m, t.style, null, lv)); };
    // Nhầm kim ngắn với kim dài
    if (t.m % 5 === 0) addP(minuteNumber(t.m), t.h * 5 % 60);
    // Nhầm giờ (kim ngắn đã đi quá nửa đường nên tưởng là giờ kế tiếp)
    addP(t.h + 1, t.m); addP(t.h - 1, t.m);
    // Nhầm "kém" với "hơn": 8 giờ kém 15 ↔ 8 giờ 15 phút; 3 giờ 15 ↔ 3 giờ 45
    if (t.m >= 35) addP(t.h + 1, 60 - t.m);
    if (t.m > 0 && t.m < 30) addP(t.h, 60 - t.m);
    // Nhầm số phút
    addP(t.h, t.m + 5); addP(t.h, t.m - 5);
    addP(t.h, t.m + 15); addP(t.h, t.m - 15);
    addP(t.h, t.m + 30); addP(t.h, t.m - 30);
    if (lv === 6 || lv === 8) { addP(t.h, t.m + 1); addP(t.h, t.m - 1); addP(t.h, t.m + 2); addP(t.h, t.m - 2); addP(t.h, t.m + 10); }
    addP(t.h + 2, t.m); addP(t.h - 2, t.m);
    addP(t.h + 6, t.m);
    // Đáp án chỉ chênh 1–2 phút gần như không phân biệt được trên mặt đồng hồ nhỏ:
    // xếp xuống cuối để những đáp án "thô" (±5, ±15, lệch giờ) luôn được lấy trước.
    const fine = out.filter((c) => c.h === t.h && Math.abs(c.m - t.m) <= 2);
    if (!fine.length) return shuffle(out);
    return shuffle(out.filter((c) => fine.indexOf(c) < 0)).concat(shuffle(fine));
  }

  /* ================= BÀI HỌC & CÂU HỎI ================= */
  /** Câu hỏi đọc đồng hồ: cho trước mốc giờ (hoặc sinh mới theo màn). */
  function clockQuestion(n, t) {
    t = t || genFor(n);
    const mode = t.style === '24' ? '24' : 'x';
    const correct = read(t);
    const texts = [correct];
    const cands = near(t);
    for (let i = 0; i < cands.length && texts.length < 3; i++) {
      const s = read(cands[i]);
      if (texts.indexOf(s) < 0 && key(cands[i], mode) !== key(t, mode)) texts.push(s);
    }
    let guard = 0;
    while (texts.length < 3 && guard++ < 40) {
      const c = genFor(t.lv || n);
      const s = read(c);
      if (texts.indexOf(s) < 0) texts.push(s);
    }
    return {
      q: t.style === '24' ? 'Theo cách 24 giờ, đồng hồ chỉ mấy giờ?' : 'Đồng hồ chỉ mấy giờ?',
      clock: t,
      choices: texts,
      explain: explain(t),
      speech: t.style === '24' ? 'Theo cách 24 giờ, đồng hồ này chỉ mấy giờ?' : 'Đồng hồ này chỉ mấy giờ?'
    };
  }

  /** Câu hỏi kiến thức: lựa chọn đầu tiên trong choices là đáp án đúng. */
  const Q = (q, choices, explainText) => () => ({ q: q, choices: choices.slice(), explain: explainText });

  const CONCEPT = {
    1: [
      Q('Trên mặt đồng hồ, kim ngắn là kim gì?', ['Kim giờ', 'Kim phút', 'Kim giây'], 'Kim ngắn là kim giờ, kim dài là kim phút.'),
      Q('Kim dài chỉ số 12, kim ngắn chỉ số 7. Đồng hồ chỉ mấy giờ?', ['7 giờ', '12 giờ', '7 giờ 12 phút'], 'Kim dài chỉ số 12 là giờ đúng. Kim ngắn chỉ số 7 nên đọc là 7 giờ.'),
      Q('Một ngày có bao nhiêu giờ?', ['24 giờ', '12 giờ', '60 giờ'], 'Một ngày có 24 giờ.'),
      Q('Một giờ có bao nhiêu phút?', ['60 phút', '100 phút', '12 phút'], 'Một giờ có 60 phút.'),
      Q('Lúc 9 giờ đúng, kim dài chỉ số mấy?', ['Số 12', 'Số 9', 'Số 6'], 'Giờ đúng thì kim dài luôn chỉ số 12, còn kim ngắn chỉ số 9.'),
      Q('Kim nào chỉ phút?', ['Kim dài', 'Kim ngắn', 'Cả hai kim'], 'Kim dài chỉ phút, kim ngắn chỉ giờ.')
    ],
    2: [
      Q('Kim dài chỉ số 6 nghĩa là bao nhiêu phút?', ['30 phút', '6 phút', '60 phút'], 'Kim dài chỉ số 6 là 30 phút, tức là nửa giờ (giờ rưỡi).'),
      Q('5 giờ rưỡi còn được đọc là?', ['5 giờ 30 phút', '5 giờ 6 phút', '6 giờ 30 phút'], 'Rưỡi nghĩa là 30 phút: 5 giờ rưỡi = 5 giờ 30 phút.'),
      Q('Lúc 7 giờ 30 phút, kim ngắn nằm ở đâu?', ['Giữa số 7 và số 8', 'Đúng số 7', 'Đúng số 8'], 'Đã được nửa giờ nên kim ngắn đi được nửa đường từ số 7 sang số 8.'),
      Q('Kim ngắn nằm giữa số 2 và số 3, kim dài chỉ số 6. Đồng hồ chỉ?', ['2 giờ 30 phút', '3 giờ 30 phút', '6 giờ 15 phút'], 'Kim ngắn đã qua số 2 nhưng chưa tới số 3 nên vẫn là 2 giờ; kim dài chỉ số 6 là 30 phút.'),
      Q('Nửa giờ là bao nhiêu phút?', ['30 phút', '50 phút', '15 phút'], 'Một giờ có 60 phút, nửa giờ là 30 phút.'),
      Q('Lúc giờ rưỡi, kim dài chỉ số mấy?', ['Số 6', 'Số 12', 'Số 3'], 'Giờ rưỡi thì kim dài luôn chỉ số 6.')
    ],
    3: [
      Q('Kim dài chỉ số 3 là bao nhiêu phút?', ['15 phút', '3 phút', '30 phút'], 'Mỗi số cách nhau 5 phút: số 3 là 3 × 5 = 15 phút.'),
      Q('Kim dài đi từ số 12 đến số 1 hết bao nhiêu phút?', ['5 phút', '1 phút', '15 phút'], 'Từ số này sang số kế tiếp, kim dài đi mất 5 phút.'),
      Q('Bạn Lan vào học lúc 7 giờ 15 phút. Kim dài chỉ số mấy?', ['Số 3', 'Số 15', 'Số 7'], '15 phút = 3 × 5, nên kim dài chỉ số 3.'),
      Q('Kim dài chỉ số 3 và kim ngắn vừa qua số 10. Đồng hồ chỉ?', ['10 giờ 15 phút', '3 giờ 50 phút', '10 giờ 3 phút'], 'Kim ngắn qua số 10 là 10 giờ; kim dài chỉ số 3 là 15 phút.'),
      Q('Từ 8 giờ đến 8 giờ 15 phút là bao nhiêu phút?', ['15 phút', '8 phút', '30 phút'], 'Từ 8 giờ đúng đến 8 giờ 15 phút, kim dài đi được 15 phút.'),
      Q('Kim dài chỉ số 2 là bao nhiêu phút?', ['10 phút', '2 phút', '20 phút'], 'Số 2 là 2 × 5 = 10 phút.')
    ],
    4: [
      Q('Kim dài chỉ số 8 là bao nhiêu phút?', ['40 phút', '8 phút', '45 phút'], 'Lấy số đó nhân 5: 8 × 5 = 40 phút.'),
      Q('Kim dài chỉ số 11 là bao nhiêu phút?', ['55 phút', '11 phút', '50 phút'], '11 × 5 = 55 phút.'),
      Q('Đồng hồ chỉ 4 giờ 20 phút. Kim dài chỉ số mấy?', ['Số 4', 'Số 20', 'Số 2'], '20 phút = 4 × 5, nên kim dài chỉ số 4.'),
      Q('Kim dài chỉ số 9 là bao nhiêu phút?', ['45 phút', '9 phút', '40 phút'], '9 × 5 = 45 phút.'),
      Q('Muốn biết số phút khi kim dài chỉ số 7, ta tính?', ['7 × 5 = 35 phút', '7 + 5 = 12 phút', '7 × 10 = 70 phút'], 'Mỗi số cách nhau 5 phút nên lấy 7 × 5 = 35 phút.'),
      Q('Kim dài chỉ số 10, kim ngắn gần tới số 3. Đồng hồ chỉ?', ['2 giờ 50 phút', '3 giờ 50 phút', '10 giờ 15 phút'], 'Kim ngắn chưa tới số 3 nên vẫn là 2 giờ; số 10 là 50 phút.')
    ],
    5: [
      Q('8 giờ kém 15 phút là mấy giờ?', ['7 giờ 45 phút', '8 giờ 15 phút', '8 giờ 45 phút'], 'Kém 15 phút nghĩa là còn 15 phút nữa mới đến 8 giờ: 7 giờ 45 phút.'),
      Q('6 giờ 50 phút đọc theo cách "giờ kém" là?', ['7 giờ kém 10 phút', '6 giờ kém 10 phút', '7 giờ kém 50 phút'], 'Còn 10 phút nữa là 7 giờ, nên đọc là 7 giờ kém 10 phút.'),
      Q('Kim dài chỉ số 9, ta đọc "kém" bao nhiêu phút?', ['Kém 15 phút', 'Kém 9 phút', 'Kém 45 phút'], 'Từ số 9 đến số 12 còn 3 số, tức là 15 phút.'),
      Q('Khi nào ta thường đọc "giờ kém"?', ['Khi kim dài đã qua số 6', 'Khi kim dài chỉ số 12', 'Khi kim dài chưa tới số 6'], 'Từ 35 phút trở đi (kim dài đã qua số 6), ta có thể đọc theo cách giờ kém.'),
      Q('9 giờ kém 5 phút là mấy giờ?', ['8 giờ 55 phút', '9 giờ 5 phút', '8 giờ 5 phút'], 'Còn 5 phút nữa mới đến 9 giờ, tức là 8 giờ 55 phút.'),
      Q('Kim dài chỉ số 8 thì đọc "kém" bao nhiêu phút?', ['Kém 20 phút', 'Kém 40 phút', 'Kém 8 phút'], 'Từ số 8 đến số 12 còn 4 số, tức là 20 phút.')
    ],
    6: [
      Q('Giữa hai số liền nhau trên mặt đồng hồ có mấy vạch nhỏ?', ['4 vạch', '5 vạch', '2 vạch'], '5 phút gồm 5 khoảng, nên giữa hai số có 4 vạch nhỏ.'),
      Q('Mỗi vạch nhỏ trên mặt đồng hồ ứng với?', ['1 phút', '5 phút', '1 giờ'], 'Mỗi vạch nhỏ là 1 phút, mỗi số là 5 phút.'),
      Q('Kim dài qua số 4 thêm 2 vạch nhỏ là bao nhiêu phút?', ['22 phút', '42 phút', '6 phút'], 'Số 4 là 20 phút, thêm 2 vạch là 22 phút.'),
      Q('Kim dài chỉ vạch nhỏ ngay trước số 6. Đó là bao nhiêu phút?', ['29 phút', '31 phút', '25 phút'], 'Số 6 là 30 phút, lùi lại 1 vạch là 29 phút.'),
      Q('Lúc 7 giờ 8 phút, kim dài nằm ở đâu?', ['Qua số 1 thêm 3 vạch', 'Đúng số 8', 'Qua số 8 một chút'], 'Số 1 là 5 phút, thêm 3 vạch nữa là 8 phút.'),
      Q('Kim dài qua số 9 thêm 4 vạch là bao nhiêu phút?', ['49 phút', '45 phút', '13 phút'], 'Số 9 là 45 phút, thêm 4 vạch là 49 phút.')
    ],
    7: [
      Q('2 giờ chiều là mấy giờ?', ['14 giờ', '2 giờ', '12 giờ'], 'Buổi chiều cộng thêm 12: 2 + 12 = 14 giờ.'),
      Q('20 giờ là mấy giờ tối?', ['8 giờ tối', '10 giờ tối', '2 giờ tối'], '20 − 12 = 8, nên 20 giờ là 8 giờ tối.'),
      Q('Trong một ngày, kim ngắn quay được mấy vòng?', ['2 vòng', '1 vòng', '24 vòng'], 'Một ngày có 24 giờ, mỗi vòng là 12 giờ nên kim ngắn quay 2 vòng.'),
      Q('Đồng hồ điện tử ghi 17:30. Đó là mấy giờ?', ['5 giờ 30 phút chiều', '7 giờ 30 phút tối', '5 giờ 30 phút sáng'], '17 − 12 = 5, nên 17:30 là 5 giờ 30 phút chiều.'),
      Q('Bé đi ngủ lúc 9 giờ tối. Đồng hồ điện tử ghi?', ['21:00', '09:00', '19:00'], '9 giờ tối = 9 + 12 = 21 giờ, đồng hồ điện tử ghi 21:00.'),
      Q('12 giờ đêm còn gọi là?', ['24 giờ hay 0 giờ', '12 giờ trưa', '14 giờ'], 'Một ngày kết thúc lúc 24 giờ, cũng là 0 giờ của ngày mới.'),
      Q('8 giờ sáng thì đồng hồ điện tử ghi?', ['08:00', '20:00', '18:00'], 'Buổi sáng giữ nguyên số giờ: 8 giờ sáng là 08:00.')
    ]
  };

  const LESSONS = {
    1: {
      title: 'Kim ngắn, kim dài và giờ đúng',
      html: '<p>Đồng hồ có hai kim: <b class="kh">kim ngắn</b> chỉ <b>giờ</b>, <b class="km">kim dài</b> chỉ <b>phút</b>.</p>' +
        '<p>Khi <b class="km">kim dài</b> chỉ đúng <b>số 12</b>, ta có <b>giờ đúng</b>. <b class="kh">Kim ngắn</b> chỉ số mấy thì đọc là <b>mấy giờ</b>.</p>' +
        '<p>Ví dụ: <b class="kh">kim ngắn</b> chỉ số 3, <b class="km">kim dài</b> chỉ số 12 → <b>3 giờ</b>.</p>',
      speech: 'Đồng hồ có hai kim. Kim ngắn chỉ giờ, kim dài chỉ phút. Khi kim dài chỉ đúng số 12, ta có giờ đúng. Kim ngắn chỉ số mấy thì đọc là mấy giờ. Ví dụ: kim ngắn chỉ số 3, kim dài chỉ số 12, đồng hồ chỉ 3 giờ.',
      demo: [mk(3, 0), mk(7, 0), mk(11, 0)]
    },
    2: {
      title: 'Giờ rưỡi: kim dài chỉ số 6',
      html: '<p><b class="km">Kim dài</b> chỉ <b>số 6</b> nghĩa là đã được <b>30 phút</b>, tức là <b>nửa giờ</b>.</p>' +
        '<p>Ta đọc <b>3 giờ 30 phút</b>, hay <b>3 giờ rưỡi</b>.</p>' +
        '<p>Lúc này <b class="kh">kim ngắn</b> đã đi qua số 3 và nằm <b>giữa số 3 và số 4</b>. <b class="kh">Kim ngắn</b> chưa tới số 4 thì vẫn là <b>3 giờ</b>!</p>',
      speech: 'Kim dài chỉ số 6 nghĩa là đã được 30 phút, tức là nửa giờ. Ta đọc 3 giờ 30 phút, hay 3 giờ rưỡi. Lúc này kim ngắn nằm giữa số 3 và số 4. Kim ngắn chưa tới số 4 thì vẫn là 3 giờ.',
      demo: [mk(3, 30, 'plain', null, 2), mk(8, 30, 'plain', null, 2), mk(12, 30, 'plain', null, 2)]
    },
    3: {
      title: 'Giờ 15 phút: kim dài chỉ số 3',
      html: '<p>Từ số này sang số kế tiếp, <b class="km">kim dài</b> đi mất <b>5 phút</b>: số 1 là 5 phút, số 2 là 10 phút, <b>số 3 là 15 phút</b>.</p>' +
        '<p><b class="km">Kim dài</b> chỉ số 3, <b class="kh">kim ngắn</b> vừa qua số 9 → <b>9 giờ 15 phút</b>.</p>',
      speech: 'Từ số này sang số kế tiếp, kim dài đi mất 5 phút. Số 1 là 5 phút, số 2 là 10 phút, số 3 là 15 phút. Kim dài chỉ số 3, kim ngắn vừa qua số 9, đồng hồ chỉ 9 giờ 15 phút.',
      demo: [mk(9, 15, 'plain', null, 3), mk(2, 15, 'plain', null, 3), mk(6, 15, 'plain', null, 3)], ring: 'min'
    },
    4: {
      title: 'Đếm 5 phút một',
      html: '<p><b class="km">Kim dài</b> chỉ số mấy, ta lấy số đó <b>nhân 5</b> để biết số phút: số 4 → 20 phút, số 8 → 40 phút, số 11 → 55 phút.</p>' +
        '<p><b class="kh">Kim ngắn</b> đã qua số 6, <b class="km">kim dài</b> chỉ số 8 → <b>6 giờ 40 phút</b>.</p>',
      speech: 'Kim dài chỉ số mấy, ta lấy số đó nhân 5 để biết số phút. Số 4 là 20 phút, số 8 là 40 phút, số 11 là 55 phút. Kim ngắn đã qua số 6, kim dài chỉ số 8, đồng hồ chỉ 6 giờ 40 phút.',
      demo: [mk(6, 40, 'plain', null, 4), mk(10, 20, 'plain', null, 4), mk(1, 55, 'plain', null, 4)], ring: 'min'
    },
    5: {
      title: 'Giờ kém',
      html: '<p>Khi <b class="km">kim dài</b> đã <b>qua số 6</b> (từ 35 phút trở đi), ta có thể đọc theo cách <b>giờ kém</b>.</p>' +
        '<p><b>7 giờ 45 phút</b> nghĩa là còn <b>15 phút</b> nữa mới đến 8 giờ, nên đọc là <b>8 giờ kém 15 phút</b>.</p>' +
        '<p>Đếm ngược từ số 12: số 11 → kém 5, số 10 → kém 10, số 9 → kém 15, số 8 → kém 20, số 7 → kém 25.</p>',
      speech: 'Khi kim dài đã qua số 6, từ 35 phút trở đi, ta có thể đọc theo cách giờ kém. 7 giờ 45 phút nghĩa là còn 15 phút nữa mới đến 8 giờ, nên đọc là 8 giờ kém 15 phút. Đếm ngược từ số 12: số 11 là kém 5, số 10 là kém 10, số 9 là kém 15, số 8 là kém 20, số 7 là kém 25.',
      demo: [mk(7, 45, 'kem', null, 5), mk(4, 50, 'kem', null, 5), mk(9, 40, 'kem', null, 5)], ring: 'kem'
    },
    6: {
      title: 'Xem giờ từng phút',
      html: '<p>Giữa hai số liền nhau có <b>4 vạch nhỏ</b>. Mỗi vạch nhỏ là <b>1 phút</b>.</p>' +
        '<p><b class="km">Kim dài</b> qua số 4 (20 phút) thêm <b>3 vạch</b> → <b>23 phút</b>. <b class="kh">Kim ngắn</b> đã qua số 6 → <b>6 giờ 23 phút</b>.</p>',
      speech: 'Giữa hai số liền nhau có 4 vạch nhỏ. Mỗi vạch nhỏ là 1 phút. Kim dài qua số 4 là 20 phút, thêm 3 vạch là 23 phút. Kim ngắn đã qua số 6, đồng hồ chỉ 6 giờ 23 phút.',
      demo: [mk(6, 23, 'plain', null, 6), mk(2, 7, 'plain', null, 6), mk(10, 52, 'plain', null, 6)], ring: 'min'
    },
    7: {
      title: 'Một ngày có 24 giờ',
      html: '<p>Một ngày có <b>24 giờ</b>, bắt đầu từ 12 giờ đêm. <b class="kh">Kim ngắn</b> quay <b>2 vòng</b> mỗi ngày.</p>' +
        '<p>Buổi <b>chiều</b>, <b>tối</b>, ta <b>cộng thêm 12</b>: 1 giờ chiều = <b>13 giờ</b>, 3 giờ chiều = <b>15 giờ</b>, 8 giờ tối = <b>20 giờ</b>.</p>' +
        '<p>Buổi <b>đêm</b> cũng cộng 12: 10 giờ đêm = <b>22 giờ</b>. 12 giờ trưa vẫn là <b>12 giờ</b>. Trong trò chơi, cột ghi giờ theo cách 24 giờ.</p>' +
        '<p>Đồng hồ điện tử ghi <b>15:00</b> nghĩa là 3 giờ chiều. Nhìn biểu tượng buổi (🌅 sáng, ☀️ trưa, 🌤️ chiều, 🌙 tối, 🌃 đêm) trên đồng hồ nhé!</p>',
      speech: 'Một ngày có 24 giờ, bắt đầu từ 12 giờ đêm. Kim ngắn quay 2 vòng mỗi ngày. Buổi chiều và buổi tối, ta cộng thêm 12. 1 giờ chiều là 13 giờ, 3 giờ chiều là 15 giờ, 8 giờ tối là 20 giờ. Buổi đêm cũng cộng 12: 10 giờ đêm là 22 giờ. 12 giờ trưa vẫn là 12 giờ. Trong trò chơi, cột ghi giờ theo cách 24 giờ. Đồng hồ điện tử ghi 15 giờ nghĩa là 3 giờ chiều.',
      demo: [mk24(15, 0, 7), mk24(20, 0, 7), mk24(8, 0, 7), mk24(22, 30, 7)], digital: true
    },
    8: {
      title: 'Siêu Tháp Đồng Hồ',
      html: '<p>Ôn lại tất cả: giờ đúng, giờ rưỡi, 15 phút, đếm 5 phút, giờ kém, từng phút và 24 giờ.</p>' +
        '<p>Đồng hồ rơi <b>nhanh hơn</b>. Hãy nhìn kỹ <b class="kh">kim ngắn</b>, <b class="km">kim dài</b> và biểu tượng buổi trước khi thả nhé!</p>',
      speech: 'Ôn lại tất cả những gì đã học. Đồng hồ rơi nhanh hơn. Hãy nhìn kỹ kim ngắn, kim dài và biểu tượng buổi trước khi thả nhé!',
      demo: [mk(3, 0), mk(3, 30, 'plain', null, 2), mk(7, 45, 'kem', null, 5), mk24(15, 0, 7), mk(6, 23, 'plain', null, 6)]
    }
  };

  /* ================= MÀN CHƠI ================= */
  const LEVELS = [
    { n: 1, id: 'L1', title: 'Giờ đúng', icon: '🕒', grade: 2, desc: 'Kim dài chỉ số 12: 3 giờ, 7 giờ…', goal: 8, fall: 16, style: 'plain', ring: null },
    { n: 2, id: 'L2', title: 'Giờ rưỡi', icon: '🕞', grade: 2, desc: 'Kim dài chỉ số 6: 3 giờ 30 phút', goal: 10, fall: 16, style: 'plain', ring: null },
    { n: 3, id: 'L3', title: 'Giờ 15 phút', icon: '🕝', grade: 2, desc: 'Kim dài chỉ số 3: 9 giờ 15 phút', goal: 10, fall: 15, style: 'plain', ring: 'min' },
    { n: 4, id: 'L4', title: 'Đếm 5 phút', icon: '🕙', grade: 3, desc: '6 giờ 40 phút, 2 giờ 55 phút…', goal: 12, fall: 15, style: 'plain', ring: 'min' },
    { n: 5, id: 'L5', title: 'Giờ kém', icon: '🕗', grade: 3, desc: '7 giờ 45 phút = 8 giờ kém 15 phút', goal: 12, fall: 15, style: 'kem', ring: 'kem' },
    { n: 6, id: 'L6', title: 'Từng phút', icon: '🕰️', grade: 3, desc: 'Đọc chính xác: 6 giờ 23 phút', goal: 12, fall: 15, style: 'plain', ring: 'min' },
    { n: 7, id: 'L7', title: 'Một ngày 24 giờ', icon: '🌗', grade: 3, desc: '3 giờ chiều = 15 giờ', goal: 12, fall: 14, style: '24', ring: null },
    { n: 8, id: 'L8', title: 'Siêu Tháp', icon: '🏰', grade: 0, desc: 'Trộn tất cả, rơi nhanh hơn!', goal: 15, fall: 11, style: 'mix', ring: null }
  ];
  LEVELS.forEach(function (l) {
    l.gen = function () { return genFor(l.n); };
    l.lesson = LESSONS[l.n];
    l.keyMode = l.style === '24' ? '24' : 'x';
  });

  /** Các màn được lấy câu kiến thức cho bài tổng kết (Siêu Tháp): phần khó, đúng chương trình lớp 3. */
  const CAPSTONE = [4, 5, 6, 7];

  /**
   * Bộ câu hỏi sau màn n: 1 câu đọc đồng hồ (ưu tiên từ lỗi của bé) + 2 câu kiến thức.
   * Màn 8 lấy 2 câu đọc đồng hồ + 1 câu kiến thức của phần KHÓ (màn 4–7),
   * hoặc của màn bé còn yếu nhất khi được truyền vào `weakest` (1..7).
   */
  function quizFor(n, mistakes, weakest) {
    const out = [];
    const miss = (mistakes || []).slice();
    shuffle(miss);
    if (n === 8) {
      out.push(clockQuestion(8, miss[0] || null));
      out.push(clockQuestion(8, miss[1] || null));
      const pool = CONCEPT[weakest] ? [weakest] : CAPSTONE;
      let all = [];
      pool.forEach(function (k) { all = all.concat(CONCEPT[k]); });
      shuffle(all);
      out.push(all[0]());
      return out;
    }
    out.push(clockQuestion(n, miss[0] || null));
    const bank = shuffle(CONCEPT[n].slice());
    // Bé đọc nhầm từ 2 đồng hồ trở lên: hỏi lại cả hai (thay một câu kiến thức)
    if (miss.length >= 2) out.push(clockQuestion(n, miss[1])); else out.push(bank[0]());
    out.push(bank[1]());
    return out;
  }

  window.Clock = {
    rnd, chance, pick, shuffle, weighted, esc,
    PERIOD_ICON, periodOf,
    mk, mk24, same, key, lines, read, readPlain, speech, digital, explain, explainShort, speakable, minuteNumber,
    svg, setSvgTime,
    genFor, minutesFor, near,
    LEVELS, LESSONS, CONCEPT, CAPSTONE, clockQuestion, quizFor,
    levelById(id) { return LEVELS.find((l) => l.id === id) || null; },
    levelByN(n) { return LEVELS[n - 1] || null; }
  };
})();
