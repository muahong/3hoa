/* ============================================================
   clock.js – Kiến thức "xem đồng hồ" cho Mê Cung Đồng Hồ
   - Mô hình thời gian { h: giờ (0–23), m: phút (0–59) }
   - Đọc giờ tiếng Việt (giờ đúng, giờ rưỡi, giờ kém, buổi trong ngày)
   - Vẽ đồng hồ kim và đồng hồ điện tử (Canvas + SVG)
   - Danh sách màn chơi (lớp 2, lớp 3), bài học và ngân hàng câu hỏi
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
  const ALL_MINS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  /* ================= MÔ HÌNH THỜI GIAN ================= */
  function T(h, m) { return { h: ((h % 24) + 24) % 24, m: m }; }
  function h12(h) { const x = h % 12; return x === 0 ? 12 : x; }
  function key(t) { return t.h + ':' + t.m; }
  function same(a, b) { return !!a && !!b && a.h === b.h && a.m === b.m; }
  /** Hai thời điểm trông giống nhau trên đồng hồ kim (15:00 và 3:00). */
  function sameFace(a, b) { return h12(a.h) === h12(b.h) && a.m === b.m; }
  function pad(m) { return (m < 10 ? '0' : '') + m; }
  /** Cộng thêm d phút. Với miền 12 giờ (1–12) giữ nguyên miền đó. */
  function addMin(t, d, h24) {
    if (h24) {
      let total = (t.h * 60 + t.m + d) % 1440;
      if (total < 0) total += 1440;
      return T(Math.floor(total / 60), total % 60);
    }
    let total = (h12(t.h) * 60 + t.m + d) % 720;
    if (total < 0) total += 720;
    return T(h12(Math.floor(total / 60)), total % 60);
  }
  /** Buổi trong ngày theo sách Toán 2: sáng 1–10, trưa 11–12, chiều 13–18, tối 19–21, đêm 22–24. */
  function periodOf(h) {
    if (h >= 1 && h <= 10) return 'sáng';
    if (h === 11 || h === 12) return 'trưa';
    if (h >= 13 && h <= 18) return 'chiều';
    if (h >= 19 && h <= 21) return 'tối';
    return 'đêm';
  }
  function periodIcon(h) {
    const p = periodOf(h);
    return p === 'sáng' ? '🌅' : p === 'trưa' ? '☀️' : p === 'chiều' ? '🌇' : p === 'tối' ? '🌃' : '🌙';
  }

  /* ================= ĐỌC GIỜ ================= */
  /**
   * fmtText(t, o): đọc giờ bằng lời.
   *  o.h24   : dùng số giờ 0–24 ("15 giờ")
   *  o.ruoi  : 30 phút đọc là "rưỡi"
   *  o.kem   : từ 35 phút trở đi đọc kiểu "8 giờ kém 15 phút"
   *  o.period: thêm buổi ("3 giờ chiều")
   */
  function fmtText(t, o) {
    o = o || {};
    const H = o.h24 ? (t.h === 0 ? 24 : t.h) : h12(t.h);
    let s;
    if (t.m === 0) s = H + ' giờ';
    else if (t.m === 30 && o.ruoi) s = H + ' giờ rưỡi';
    else if (o.kem && t.m >= 35) {
      const next = o.h24 ? ((t.h + 1) % 24 || 24) : h12(t.h + 1);
      s = next + ' giờ kém ' + (60 - t.m) + ' phút';
    } else s = H + ' giờ ' + t.m + ' phút';
    if (o.period && !o.h24) s += ' ' + periodOf(t.h);
    return s;
  }
  function fmtDigital(t, h24) { return (h24 ? t.h : h12(t.h)) + ':' + pad(t.m); }
  /** Nhãn hiện trên vật phẩm trong mê cung. */
  function itemLabel(t, style) {
    if (style === 'digital24') return fmtDigital(t, true);
    if (style === 'digital12') return fmtDigital(t, false);
    return '';
  }

  /* ================= VẼ ĐỒNG HỒ ================= */
  const FONT = '"Baloo 2", "Arial Rounded MT Bold", "Segoe UI", Arial, sans-serif';
  const HOUR_COLOR = '#2b3a80';
  const MIN_COLOR = '#ef476f';

  function angles(t) {
    return { h: (h12(t.h) % 12 + t.m / 60) * 30, m: t.m * 6 };
  }

  /** Vẽ đồng hồ kim lên canvas, tâm (x,y), bán kính r. */
  function drawClock(ctx, x, y, r, t, o) {
    o = o || {};
    const a = angles(t);
    ctx.save();
    ctx.translate(x, y);
    // Mặt
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = o.face || '#ffffff'; ctx.fill();
    ctx.lineWidth = Math.max(2, r * 0.09); ctx.strokeStyle = o.rim || '#3b4a8a'; ctx.stroke();
    // Vạch
    for (let i = 0; i < 60; i++) {
      if (r < 22 && i % 5) continue;
      const big = i % 5 === 0;
      const ang = i * Math.PI / 30;
      const r1 = r * (big ? 0.8 : 0.86), r2 = r * 0.92;
      ctx.beginPath();
      ctx.moveTo(Math.sin(ang) * r1, -Math.cos(ang) * r1);
      ctx.lineTo(Math.sin(ang) * r2, -Math.cos(ang) * r2);
      ctx.lineWidth = big ? Math.max(1.5, r * 0.05) : Math.max(1, r * 0.025);
      ctx.strokeStyle = big ? '#3b4a8a' : '#a9b3d6';
      ctx.stroke();
    }
    // Số
    if (r >= 14) {
      const showAll = r >= 26;
      ctx.fillStyle = '#2b2d42';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '800 ' + Math.round(r * (showAll ? 0.28 : 0.34)) + 'px ' + FONT;
      for (let n = 1; n <= 12; n++) {
        if (!showAll && n % 3) continue;
        const ang = n * Math.PI / 6;
        const rr = r * 0.64;
        ctx.fillText(String(n), Math.sin(ang) * rr, -Math.cos(ang) * rr + r * 0.02);
      }
    }
    // Kim giờ (ngắn, xanh) và kim phút (dài, đỏ)
    const hand = function (deg, len, w, color) {
      ctx.save();
      ctx.rotate(deg * Math.PI / 180);
      ctx.beginPath();
      ctx.moveTo(0, r * 0.12); ctx.lineTo(0, -len);
      ctx.lineCap = 'round'; ctx.lineWidth = w; ctx.strokeStyle = color; ctx.stroke();
      ctx.restore();
    };
    hand(a.h, r * 0.5, Math.max(2.5, r * 0.11), HOUR_COLOR);
    hand(a.m, r * 0.76, Math.max(2, r * 0.075), MIN_COLOR);
    ctx.beginPath(); ctx.arc(0, 0, Math.max(2, r * 0.08), 0, Math.PI * 2); ctx.fillStyle = HOUR_COLOR; ctx.fill();
    ctx.restore();
  }

  /** Vẽ đồng hồ điện tử (khung tròn góc) lên canvas, tâm (x,y), chiều rộng w. */
  function drawDigital(ctx, x, y, w, label, o) {
    o = o || {};
    const h = w * 0.56;
    ctx.save();
    ctx.translate(x, y);
    const rr = h * 0.3;
    const rect = function (px, py, pw, ph, rad) {
      ctx.beginPath();
      ctx.moveTo(px + rad, py);
      ctx.arcTo(px + pw, py, px + pw, py + ph, rad);
      ctx.arcTo(px + pw, py + ph, px, py + ph, rad);
      ctx.arcTo(px, py + ph, px, py, rad);
      ctx.arcTo(px, py, px + pw, py, rad);
      ctx.closePath();
    };
    rect(-w / 2, -h / 2, w, h, rr);
    ctx.fillStyle = o.frame || '#3b4a8a'; ctx.fill();
    rect(-w / 2 + w * 0.06, -h / 2 + h * 0.12, w * 0.88, h * 0.76, rr * 0.6);
    ctx.fillStyle = o.screen || '#d9ffe9'; ctx.fill();
    ctx.fillStyle = o.text || '#1b2a4a';
    ctx.font = '800 ' + Math.round(h * 0.56) + 'px ' + FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, h * 0.04);
    ctx.restore();
  }

  /** SVG đồng hồ kim (dùng trong bài học, hỏi đáp, HUD). o.size px, o.minutes hiện số phút, o.cls lớp CSS. */
  function svgClock(t, o) {
    o = o || {};
    const size = o.size || 120;
    const a = angles(t);
    const vb = o.minutes ? '-24 -24 248 248' : '0 0 200 200';
    let s = '<svg class="clock-svg ' + (o.cls || '') + '" viewBox="' + vb + '" width="' + size + '" height="' + size + '" role="img" aria-label="' + fmtText(t) + '">';
    s += '<circle cx="100" cy="100" r="95" fill="#fff" stroke="#3b4a8a" stroke-width="7"/>';
    for (let i = 0; i < 60; i++) {
      const big = i % 5 === 0;
      const ang = i * Math.PI / 30;
      const r1 = big ? 78 : 84, r2 = 90;
      s += '<line x1="' + (100 + Math.sin(ang) * r1).toFixed(1) + '" y1="' + (100 - Math.cos(ang) * r1).toFixed(1) + '" x2="' + (100 + Math.sin(ang) * r2).toFixed(1) + '" y2="' + (100 - Math.cos(ang) * r2).toFixed(1) + '" stroke="' + (big ? '#3b4a8a' : '#b5bedb') + '" stroke-width="' + (big ? 4 : 2) + '" stroke-linecap="round"/>';
    }
    for (let n = 1; n <= 12; n++) {
      const ang = n * Math.PI / 6;
      s += '<text x="' + (100 + Math.sin(ang) * 63).toFixed(1) + '" y="' + (100 - Math.cos(ang) * 63 + 2).toFixed(1) + '" text-anchor="middle" dominant-baseline="middle" font-family="Baloo 2, Arial Rounded MT Bold, Arial, sans-serif" font-weight="800" font-size="24" fill="#2b2d42">' + n + '</text>';
      if (o.minutes) {
        s += '<text x="' + (100 + Math.sin(ang) * 111).toFixed(1) + '" y="' + (100 - Math.cos(ang) * 111 + 1).toFixed(1) + '" text-anchor="middle" dominant-baseline="middle" font-family="Baloo 2, Arial Rounded MT Bold, Arial, sans-serif" font-weight="800" font-size="14" fill="#ef476f">' + (n * 5 === 60 ? '0/60' : n * 5) + '</text>';
      }
    }
    s += '<g class="hand-h" style="transform-origin:100px 100px;transform:rotate(' + a.h + 'deg)"><line x1="100" y1="112" x2="100" y2="52" stroke="' + HOUR_COLOR + '" stroke-width="11" stroke-linecap="round"/></g>';
    s += '<g class="hand-m" style="transform-origin:100px 100px;transform:rotate(' + a.m + 'deg)"><line x1="100" y1="112" x2="100" y2="26" stroke="' + MIN_COLOR + '" stroke-width="7" stroke-linecap="round"/></g>';
    s += '<circle cx="100" cy="100" r="8" fill="' + HOUR_COLOR + '"/>';
    s += '</svg>';
    return s;
  }
  /** SVG đồng hồ điện tử. */
  function svgDigital(label, o) {
    o = o || {};
    const w = o.width || 150;
    return '<svg class="digital-svg ' + (o.cls || '') + '" viewBox="0 0 200 112" width="' + w + '" height="' + Math.round(w * 0.56) + '" role="img" aria-label="' + label + '">' +
      '<rect x="4" y="4" width="192" height="104" rx="26" fill="#3b4a8a"/>' +
      '<rect x="16" y="18" width="168" height="76" rx="14" fill="#d9ffe9"/>' +
      '<text x="100" y="60" text-anchor="middle" dominant-baseline="middle" font-family="Baloo 2, Arial Rounded MT Bold, Arial, sans-serif" font-weight="800" font-size="50" fill="#1b2a4a">' + label + '</text></svg>';
  }
  /** Cập nhật góc kim của một SVG đã vẽ (dùng cho hoạt hình bài học). */
  function setSvgTime(svg, t) {
    if (!svg) return;
    const a = angles(t);
    const hh = svg.querySelector('.hand-h'), mm = svg.querySelector('.hand-m');
    if (hh) hh.style.transform = 'rotate(' + a.h + 'deg)';
    if (mm) mm.style.transform = 'rotate(' + a.m + 'deg)';
    svg.setAttribute('aria-label', fmtText(t));
  }

  /* ================= GIẢI THÍCH CÁCH ĐỌC ================= */
  function explainRead(t, o) {
    o = o || {};
    const H = h12(t.h), next = h12(t.h + 1), k = t.m / 5, m = t.m;
    if (o.style === 'digital24') {
      const p = periodOf(t.h);
      if (t.h > 12) return 'Đồng hồ điện tử hiện ' + fmtDigital(t, true) + '. Số ' + t.h + ' lớn hơn 12 nên là buổi ' + p + ': ' + t.h + ' − 12 = ' + H + '. Vậy đó là ' + fmtText(t, { period: true }) + '.';
      return 'Đồng hồ điện tử hiện ' + fmtDigital(t, true) + ', tức là ' + fmtText(t, { period: true }) + ' (buổi ' + p + ' thì số giờ giữ nguyên).';
    }
    if (o.style === 'digital12') {
      return 'Trên đồng hồ điện tử, số trước dấu hai chấm là giờ (' + H + '), số sau dấu hai chấm là phút (' + pad(m) + '). Vậy ' + fmtDigital(t) + ' đọc là ' + fmtText(t) + '.';
    }
    if (m === 0) return 'Kim dài (màu đỏ) chỉ số 12 nên đây là giờ đúng. Kim ngắn (màu xanh) chỉ đúng số ' + H + ', vậy đồng hồ chỉ ' + H + ' giờ.';
    if (m === 30) return 'Kim dài chỉ số 6, tức là 30 phút (giờ rưỡi). Kim ngắn đã đi qua số ' + H + ' nhưng chưa tới số ' + next + ', nên đọc là ' + H + ' giờ 30 phút, hay ' + H + ' giờ rưỡi.';
    if (m === 15) return 'Kim dài chỉ số 3, tức là 15 phút (5, 10, 15). Kim ngắn vừa đi qua số ' + H + ', nên đọc là ' + H + ' giờ 15 phút.';
    let s = 'Kim dài chỉ số ' + k + ': lấy ' + k + ' × 5 = ' + m + ' phút. Kim ngắn đã qua số ' + H + ' (chưa tới số ' + next + '), nên đọc là ' + H + ' giờ ' + m + ' phút.';
    if (m >= 35 && o.kem) s += ' Còn ' + (60 - m) + ' phút nữa là ' + next + ' giờ, nên cũng đọc là ' + next + ' giờ kém ' + (60 - m) + ' phút.';
    return s;
  }

  /* ================= MÀN CHƠI ================= */
  /**
   * kind: analog  – HUD ghi giờ bằng chữ, trong mê cung là đồng hồ kim
   *       period  – HUD ghi "3 giờ chiều", trong mê cung là đồng hồ điện tử 24 giờ
   *       digital – HUD hiện đồng hồ kim, trong mê cung là đồng hồ điện tử 12 giờ
   *       elapsed – HUD hỏi "Bây giờ 7 giờ, 30 phút nữa là mấy giờ?", mê cung đồng hồ kim
   */
  const LEVELS = [
    { id: 'l1', n: 1, grade: 2, icon: '🕐', title: 'Giờ đúng', desc: 'Kim dài chỉ số 12, kim ngắn chỉ mấy giờ', kind: 'analog',
      mins: [0], focus: [0], maze: 'A', rounds: 4, clocks: 4, ghosts: 2, speed: 2.3,
      takeaway: 'Kim ngắn chỉ giờ, kim dài chỉ phút. Kim dài chỉ số 12 là giờ đúng: kim ngắn chỉ số mấy thì là mấy giờ.' },
    { id: 'l2', n: 2, grade: 2, icon: '🕡', title: 'Giờ rưỡi', desc: 'Kim dài chỉ số 6 là 30 phút', kind: 'analog',
      mins: [0, 30], focus: [30], maze: 'A', rounds: 5, clocks: 4, ghosts: 2, speed: 2.5, ruoi: true,
      takeaway: 'Kim dài chỉ số 6 là 30 phút, gọi là giờ rưỡi. Lúc đó kim ngắn ở giữa hai số, ta đọc theo số nhỏ hơn.' },
    { id: 'l3', n: 3, grade: 2, icon: '🕒', title: 'Giờ 15 phút', desc: 'Kim dài chỉ số 3 là 15 phút', kind: 'analog',
      mins: [0, 15, 30], focus: [15], maze: 'B', rounds: 5, clocks: 5, ghosts: 2, speed: 2.7,
      takeaway: 'Mỗi số trên mặt đồng hồ cách nhau 5 phút. Kim dài chỉ số 3 là 15 phút, chỉ số 6 là 30 phút.' },
    { id: 'l4', n: 4, grade: 2, icon: '🌗', title: 'Sáng, chiều, tối', desc: '3 giờ chiều còn gọi là 15 giờ', kind: 'period',
      mins: [0, 30], focus: [0, 30], maze: 'B', rounds: 5, clocks: 5, ghosts: 3, speed: 2.8,
      takeaway: 'Một ngày có 24 giờ. Từ 1 giờ chiều trở đi, lấy giờ cộng 12: 3 giờ chiều là 15 giờ, 8 giờ tối là 20 giờ.' },
    { id: 'l5', n: 5, grade: 3, icon: '🕗', title: 'Xem đúng 5 phút', desc: 'Kim dài chỉ số 4 là 20 phút', kind: 'analog',
      mins: ALL_MINS, focus: [5, 10, 20, 25, 35, 40, 50, 55], maze: 'B', rounds: 5, clocks: 5, ghosts: 3, speed: 3.0,
      takeaway: 'Muốn biết số phút, lấy số mà kim dài chỉ nhân với 5. Kim dài chỉ số 4 là 20 phút, chỉ số 8 là 40 phút.' },
    { id: 'l6', n: 6, grade: 3, icon: '🕙', title: 'Giờ kém', desc: '8 giờ kém 15 phút là 7 giờ 45 phút', kind: 'analog',
      mins: [35, 40, 45, 50, 55], focus: [35, 40, 45, 50, 55], maze: 'C', rounds: 5, clocks: 6, ghosts: 3, speed: 3.2, kem: true,
      takeaway: 'Khi kim dài đã qua số 6, có thể đọc theo cách giờ kém: 7 giờ 45 phút là 8 giờ kém 15 phút, vì còn 15 phút nữa mới đến 8 giờ.' },
    { id: 'l7', n: 7, grade: 3, icon: '⌚', title: 'Đồng hồ điện tử', desc: 'Kim ↔ số: 7:45 là 7 giờ 45 phút', kind: 'digital',
      mins: ALL_MINS, focus: ALL_MINS, maze: 'C', rounds: 5, clocks: 6, ghosts: 3, speed: 3.4,
      takeaway: 'Trên đồng hồ điện tử, số trước dấu hai chấm là giờ, số sau là phút: 7:05 là 7 giờ 5 phút, 7:45 là 7 giờ 45 phút.' },
    { id: 'l8', n: 8, grade: 3, icon: '⏳', title: 'Thời gian trôi', desc: '7 giờ + 30 phút = 7 giờ 30 phút', kind: 'elapsed',
      mins: ALL_MINS, focus: ALL_MINS, maze: 'C', rounds: 5, clocks: 6, ghosts: 4, speed: 3.6,
      takeaway: 'Muốn biết một lúc nữa là mấy giờ, ta cộng thêm phút. Đủ 60 phút thì thêm 1 giờ: 7 giờ 45 phút + 15 phút = 8 giờ.' }
  ];
  const LEVEL_BY_ID = {};
  LEVELS.forEach(function (l) { LEVEL_BY_ID[l.id] = l; });
  function levelById(id) { return LEVEL_BY_ID[id] || null; }

  function textOptsOf(level, forSpeech) {
    return { ruoi: level.ruoi ? (forSpeech ? true : chance(0.5)) : false, kem: !!level.kem };
  }

  function pickMinute(level) {
    return chance(0.72) ? pick(level.focus) : pick(level.mins);
  }

  function uniqTimes(list, exclude) {
    const seen = {}, out = [];
    list.forEach(function (t) {
      if (!t) return;
      if (t.h < 0 || t.m < 0 || t.m > 59) return;
      const k = key(t);
      if (seen[k]) return;
      if (exclude && exclude.some(function (e) { return same(e, t); })) return;
      seen[k] = true; out.push(t);
    });
    return out;
  }

  /** Đáp án nhiễu cho đồng hồ kim: những nhầm lẫn hay gặp. */
  function analogDistractors(t, level, n) {
    const H = h12(t.h), k = t.m / 5;
    const inMins = function (m) { return level.mins.indexOf(m) >= 0; };
    const tier1 = [], tier2 = [];
    // Đổi vai hai kim
    const sw = T(k === 0 ? 12 : k, (H % 12) * 5);
    if (inMins(sw.m)) tier1.push(sw);
    // Sai giờ ±1 (kim ngắn ở giữa hai số)
    tier1.push(T(h12(H + 1), t.m));
    tier1.push(T(h12(H - 1), t.m));
    // Giờ kém: cộng thay vì trừ, hoặc nhầm giờ
    if (level.kem || t.m >= 35) {
      if (inMins(60 - t.m)) tier1.push(T(h12(H + 1), 60 - t.m));
      if (inMins(60 - t.m)) tier1.push(T(H, 60 - t.m));
      tier2.push(T(h12(H + 1), t.m));
    }
    // Đọc số kim dài chỉ thành số phút (số 4 -> 4 phút không có trong mins, nên đổi thành ±5)
    if (inMins(t.m + 5)) tier2.push(T(H, t.m + 5));
    if (inMins(t.m - 5)) tier2.push(T(H, t.m - 5));
    // Cùng giờ, phút khác
    shuffle(level.mins.slice()).forEach(function (m) { if (m !== t.m) tier2.push(T(H, m)); });
    // Giờ khác, cùng phút
    shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]).forEach(function (h) { if (h !== H) tier2.push(T(h, t.m)); });
    const out = uniqTimes(shuffle(tier1).concat(shuffle(tier2)), [t]);
    return out.slice(0, n);
  }

  /** Đáp án nhiễu cho màn "Sáng, chiều, tối" (đồng hồ điện tử 24 giờ). */
  function periodDistractors(t, level, n) {
    const tier1 = [], tier2 = [];
    if (t.h >= 13) tier1.push(T(t.h - 12, t.m));      // quên cộng 12
    else tier1.push(T(t.h + 12, t.m));                 // cộng nhầm 12
    tier1.push(T(t.h + 1, t.m), T(t.h - 1, t.m));
    if (t.h >= 13) tier2.push(T(t.h - 10, t.m), T(t.h - 2, t.m));
    level.mins.forEach(function (m) { if (m !== t.m) tier2.push(T(t.h, m)); });
    shuffle([6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]).forEach(function (h) { tier2.push(T(h, t.m)); });
    return uniqTimes(shuffle(tier1).concat(shuffle(tier2)), [t]).slice(0, n);
  }

  /** Đáp án nhiễu cho đồng hồ điện tử 12 giờ (đọc kim -> số). */
  function digitalDistractors(t, level, n) {
    const H = h12(t.h), k = t.m / 5, k5 = t.m % 5 === 0;
    const tier1 = [], tier2 = [];
    if (k5 && k > 0 && k !== t.m) tier1.push(T(H, k));            // ghi số kim dài chỉ làm phút: 7:09
    if (k5) tier1.push(T(k === 0 ? 12 : k, (H % 12) * 5));        // đổi vai hai kim
    tier1.push(T(h12(H + 1), t.m));
    tier2.push(T(h12(H - 1), t.m));
    if (t.m + 5 < 60) tier2.push(T(H, t.m + 5));
    if (t.m - 5 >= 0) tier2.push(T(H, t.m - 5));
    if (t.m >= 35) tier2.push(T(h12(H + 1), 60 - t.m));
    shuffle(ALL_MINS.slice()).forEach(function (m) { if (m !== t.m) tier2.push(T(H, m)); });
    return uniqTimes(shuffle(tier1).concat(shuffle(tier2)), [t]).slice(0, n);
  }

  /** Đáp án nhiễu cho màn "Thời gian trôi". */
  function elapsedDistractors(start, delta, target, n) {
    const tier1 = [start, addMin(start, -delta), addMin(start, delta * 2)];
    const tier2 = [addMin(start, delta + 15), addMin(start, delta - 15), addMin(start, delta + 5), addMin(start, delta - 5), addMin(start, delta + 60), addMin(start, 60)];
    return uniqTimes(shuffle(tier1).concat(shuffle(tier2)), [target]).slice(0, n);
  }

  /**
   * Sinh một lượt chơi: mục tiêu cần tìm và các đồng hồ đặt trong mê cung.
   * Trả về { target, items:[time...] (đã trộn, có mục tiêu), style, html, speech, hudClock }
   */
  function makeRound(level) {
    const n = level.clocks;
    let target, distractors, style, html, speech, hudClock = null, extra = null;
    if (level.kind === 'analog') {
      target = T(rnd(1, 12), pickMinute(level));
      distractors = analogDistractors(target, level, n - 1);
      style = 'analog';
      const o = textOptsOf(level);
      const text = fmtText(target, o);
      html = 'Tìm đồng hồ chỉ <b>' + text + '</b>';
      speech = 'Tìm đồng hồ chỉ ' + text;
    } else if (level.kind === 'period') {
      const h = chance(0.7) ? rnd(13, 22) : rnd(6, 11);
      target = T(h, pickMinute(level));
      distractors = periodDistractors(target, level, n - 1);
      style = 'digital24';
      const text = fmtText(target, { period: true, ruoi: chance(0.5) });
      html = 'Tìm đồng hồ điện tử chỉ <b>' + periodIcon(h) + ' ' + text + '</b>';
      speech = 'Tìm đồng hồ điện tử chỉ ' + text;
    } else if (level.kind === 'digital') {
      target = T(rnd(1, 12), pickMinute(level));
      distractors = digitalDistractors(target, level, n - 1);
      style = 'digital12';
      html = 'Tìm đồng hồ điện tử <b>cùng giờ</b> với đồng hồ này';
      speech = 'Tìm đồng hồ điện tử cùng giờ với đồng hồ kim. Đồng hồ kim đang chỉ ' + fmtText(target);
      hudClock = target;
    } else {
      const start = T(rnd(1, 12), pick([0, 0, 15, 30, 45, 10, 20, 5, 40, 50]));
      const delta = pick([5, 10, 15, 15, 20, 30, 30, 45, 60]);
      target = addMin(start, delta);
      distractors = elapsedDistractors(start, delta, target, n - 1);
      style = 'analog';
      const dText = delta === 60 ? '1 giờ' : delta + ' phút';
      html = 'Bây giờ là <b>' + fmtText(start) + '</b>. <b>' + dText + '</b> nữa là mấy giờ?';
      speech = 'Bây giờ là ' + fmtText(start) + '. ' + dText + ' nữa là mấy giờ? Hãy tìm đồng hồ đó.';
      extra = { start: start, delta: delta };
    }
    // Bổ sung nếu chưa đủ đồng hồ nhiễu
    const domainH = level.kind === 'period' ? [6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    let guard = 0;
    while (distractors.length < n - 1 && guard++ < 200) {
      const cand = T(pick(domainH), pick(level.mins));
      if (!same(cand, target) && !distractors.some(function (d) { return same(d, cand); })) distractors.push(cand);
    }
    const items = shuffle(distractors.concat([target]));
    return { target: target, items: items, style: style, html: html, speech: speech, hudClock: hudClock, extra: extra };
  }

  /** Cách đọc thời gian của một vật phẩm trong mê cung (dùng khi bé chọn nhầm). */
  function describeItem(t, style, level) {
    if (style === 'digital24') return fmtText(t, { period: true });
    if (style === 'digital12') return fmtText(t);
    return fmtText(t, { kem: !!level.kem, ruoi: false });
  }

  /* ================= BÀI HỌC TRƯỚC MỖI MÀN ================= */
  const LESSONS = {
    l1: {
      title: 'Giờ đúng',
      lines: [
        'Mặt đồng hồ có <b>12 số</b>. <b>Kim ngắn</b> (màu xanh) chỉ <b>giờ</b>, <b>kim dài</b> (màu đỏ) chỉ <b>phút</b>.',
        'Khi kim dài chỉ đúng <b>số 12</b>, ta có <b>giờ đúng</b>. Kim ngắn chỉ số mấy thì là <b>mấy giờ</b>.',
        'Ví dụ: kim dài chỉ số 12, kim ngắn chỉ số 3 → <b>3 giờ</b>.'
      ],
      demos: [T(3, 0), T(7, 0), T(11, 0), T(12, 0)],
      speech: 'Mặt đồng hồ có 12 số. Kim ngắn chỉ giờ, kim dài chỉ phút. Khi kim dài chỉ đúng số 12, ta có giờ đúng. Kim ngắn chỉ số mấy thì là mấy giờ.'
    },
    l2: {
      title: 'Giờ rưỡi',
      lines: [
        '<b>1 giờ có 60 phút</b>. Kim dài đi <b>nửa vòng</b>, tới <b>số 6</b>, là được <b>30 phút</b>.',
        '30 phút là nửa giờ, nên còn gọi là <b>giờ rưỡi</b>: 7 giờ 30 phút = <b>7 giờ rưỡi</b>.',
        'Lúc đó kim ngắn nằm <b>giữa hai số</b> (giữa 7 và 8). Ta đọc theo <b>số nhỏ hơn</b>: 7 giờ rưỡi.'
      ],
      demos: [T(7, 30), T(2, 30), T(10, 30), T(12, 30)],
      speech: '1 giờ có 60 phút. Kim dài đi tới số 6 là được 30 phút, còn gọi là giờ rưỡi. Lúc đó kim ngắn nằm giữa hai số, ta đọc theo số nhỏ hơn. Ví dụ 7 giờ rưỡi.'
    },
    l3: {
      title: 'Giờ 15 phút',
      lines: [
        'Từ số này sang số kế bên, kim dài đi mất <b>5 phút</b>: số 1 là 5 phút, số 2 là 10 phút, <b>số 3 là 15 phút</b>.',
        'Kim dài chỉ số 3 → <b>15 phút</b>. Kim ngắn vừa đi qua số mấy thì là mấy giờ: <b>4 giờ 15 phút</b>.',
        'Ôn lại: kim dài chỉ số 12 là giờ đúng, số 6 là 30 phút (giờ rưỡi).'
      ],
      demos: [T(4, 15), T(8, 15), T(1, 15), T(6, 30)],
      speech: 'Từ số này sang số kế bên, kim dài đi mất 5 phút. Kim dài chỉ số 3 là 15 phút. Kim ngắn vừa đi qua số 4 thì là 4 giờ 15 phút.',
      minutes: true
    },
    l4: {
      title: 'Sáng, trưa, chiều, tối',
      lines: [
        'Một ngày có <b>24 giờ</b>. Kim ngắn đi <b>hai vòng</b> đồng hồ mỗi ngày.',
        '<b>Sáng</b>: 1 đến 10 giờ · <b>Trưa</b>: 11, 12 giờ · <b>Chiều</b>: 13 đến 18 giờ · <b>Tối</b>: 19 đến 21 giờ · <b>Đêm</b>: 22 đến 24 giờ.',
        'Từ buổi chiều, đồng hồ điện tử ghi <b>giờ + 12</b>: 3 giờ chiều là <b>15:00</b>, 8 giờ tối là <b>20:00</b>.'
      ],
      demos: [T(15, 0), T(20, 0), T(9, 0), T(17, 30)],
      digital: true,
      speech: 'Một ngày có 24 giờ. Buổi chiều và buổi tối, đồng hồ điện tử ghi số giờ cộng thêm 12. Ba giờ chiều là 15 giờ. Tám giờ tối là 20 giờ.'
    },
    l5: {
      title: 'Xem đồng hồ đúng 5 phút',
      lines: [
        'Kim dài đi từ số 12 tới số 1 là <b>5 phút</b>, tới số 2 là <b>10 phút</b>, tới số 3 là 15 phút…',
        'Muốn biết số phút, lấy <b>số kim dài chỉ × 5</b>: kim dài chỉ số 4 → 4 × 5 = <b>20 phút</b>; chỉ số 8 → <b>40 phút</b>.',
        'Kim ngắn <b>đã đi qua số mấy</b> thì là mấy giờ: <b>7 giờ 20 phút</b>.'
      ],
      demos: [T(7, 20), T(3, 40), T(9, 5), T(11, 55)],
      minutes: true,
      speech: 'Muốn biết số phút, lấy số mà kim dài chỉ nhân với 5. Kim dài chỉ số 4 là 20 phút. Kim dài chỉ số 8 là 40 phút. Kim ngắn đã đi qua số 7 thì là 7 giờ 20 phút.'
    },
    l6: {
      title: 'Giờ kém',
      lines: [
        'Khi kim dài <b>đã đi qua số 6</b>, ta có thể đọc theo cách <b>giờ kém</b>.',
        '<b>7 giờ 45 phút</b>: còn 15 phút nữa mới đến 8 giờ, nên đọc là <b>8 giờ kém 15 phút</b>. Tính: 60 − 45 = 15.',
        '<b>5 giờ 40 phút</b> = 6 giờ kém 20 phút · <b>10 giờ 55 phút</b> = 11 giờ kém 5 phút.'
      ],
      demos: [T(7, 45), T(5, 40), T(10, 55), T(2, 50)],
      kem: true,
      minutes: true,
      speech: 'Khi kim dài đã đi qua số 6, ta có thể đọc theo cách giờ kém. 7 giờ 45 phút còn 15 phút nữa mới đến 8 giờ, nên đọc là 8 giờ kém 15 phút.'
    },
    l7: {
      title: 'Đồng hồ điện tử',
      lines: [
        'Đồng hồ điện tử ghi <b>giờ : phút</b>. Số <b>trước</b> dấu hai chấm là <b>giờ</b>, số <b>sau</b> là <b>phút</b>.',
        '<b>7:45</b> đọc là 7 giờ 45 phút · <b>6:05</b> đọc là 6 giờ 5 phút (số 05 là 5 phút, không phải 50).',
        'Xem đồng hồ kim rồi tìm đồng hồ điện tử <b>cùng giờ</b>: kim ngắn qua số 7, kim dài chỉ số 9 → 7:45.'
      ],
      demos: [T(7, 45), T(6, 5), T(12, 30), T(3, 10)],
      both: true,
      speech: 'Đồng hồ điện tử ghi giờ, dấu hai chấm, rồi phút. Số trước dấu hai chấm là giờ, số sau là phút. 7:45 đọc là 7 giờ 45 phút.'
    },
    l8: {
      title: 'Thời gian trôi',
      lines: [
        'Muốn biết <b>một lúc nữa</b> là mấy giờ, ta <b>cộng thêm</b> số phút: 7 giờ + 30 phút = <b>7 giờ 30 phút</b>.',
        'Đủ <b>60 phút</b> thì được thêm <b>1 giờ</b>: 7 giờ 45 phút + 15 phút = 7 giờ 60 phút = <b>8 giờ</b>.',
        'Cộng thêm 1 giờ thì kim ngắn tiến thêm một số, kim dài đứng yên: 2 giờ 30 phút + 1 giờ = <b>3 giờ 30 phút</b>.'
      ],
      demos: [T(7, 0), T(7, 30), T(7, 45), T(8, 0)],
      minutes: true,
      speech: 'Muốn biết một lúc nữa là mấy giờ, ta cộng thêm số phút. 7 giờ cộng 30 phút là 7 giờ 30 phút. Đủ 60 phút thì được thêm 1 giờ.'
    }
  };

  /* ================= NGÂN HÀNG CÂU HỎI ================= */
  /**
   * Câu hỏi: { text, clock?, clockStyle?, options:[{label, clock?, clockStyle?}], answer, explain, speech }
   */
  function mkQ(text, options, correctIdx, explain, o) {
    o = o || {};
    const opts = [], seen = {};
    const order = [correctIdx];
    options.forEach(function (_, i) { if (i !== correctIdx) order.push(i); });
    order.forEach(function (i) {
      const op = options[i];
      const obj = typeof op === 'string' ? { label: op } : Object.assign({}, op);
      const k = obj.clock ? key(obj.clock) + '|' + (obj.clockStyle || '') : obj.label;
      if (seen[k]) return;
      seen[k] = true;
      obj.correct = i === correctIdx;
      opts.push(obj);
    });
    if (o.fill) {
      o.fill.forEach(function (label) {
        if (opts.length >= 4 || seen[label]) return;
        seen[label] = true;
        opts.push({ label: label });
      });
    }
    shuffle(opts);
    let answer = 0;
    opts.forEach(function (op, i) { if (op.correct) answer = i; delete op.correct; });
    return { text: text, clock: o.clock || null, clockStyle: o.clockStyle || 'analog', options: opts, answer: answer, explain: explain, speech: o.speech || text.replace(/<[^>]+>/g, '') };
  }
  function labelsOf(times, o) { return times.map(function (t) { return fmtText(t, o); }); }
  /** Nhãn giờ dự phòng (ngẫu nhiên) để bù khi đáp án bị trùng. */
  function hourFill(m) {
    return shuffle(HOURS12.slice()).map(function (h) { return fmtText(T(h, m || 0)); });
  }
  const HOURS12 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  /** "Đồng hồ chỉ mấy giờ?" với đồng hồ kim. */
  function qRead(level, t, o) {
    o = o || {};
    t = t || T(rnd(1, 12), pickMinute(level));
    const ds = analogDistractors(t, level, 3);
    const opts = labelsOf([t].concat(ds), { kem: !!o.kem, ruoi: !!o.ruoi });
    return mkQ(o.text || 'Đồng hồ chỉ mấy giờ?', opts, 0, explainRead(t, { kem: !!level.kem }), { clock: t, speech: 'Đồng hồ chỉ mấy giờ?' });
  }
  /** "Đồng hồ nào chỉ X?" với 4 đồng hồ kim để chọn. */
  function qPickClock(level, t, o) {
    o = o || {};
    t = t || T(rnd(1, 12), pickMinute(level));
    const ds = analogDistractors(t, level, 3);
    const label = fmtText(t, { kem: !!o.kem, ruoi: !!o.ruoi });
    const opts = [t].concat(ds).map(function (x) { return { label: fmtText(x), clock: x, clockStyle: 'analog', hideLabel: true }; });
    return mkQ('Đồng hồ nào chỉ <b>' + label + '</b>?', opts, 0, explainRead(t, { kem: !!level.kem }), { speech: 'Đồng hồ nào chỉ ' + label + '?' });
  }

  const QUIZ = {
    l1: [
      function (L) { return qRead(L); },
      function (L) { return qRead(L); },
      function () { return mkQ('Trên đồng hồ, <b>kim ngắn</b> chỉ gì?', ['Giờ', 'Phút', 'Giây', 'Ngày'], 0, 'Kim ngắn chỉ giờ, kim dài chỉ phút. Nhớ nhé: ngắn là giờ, dài là phút!'); },
      function () { return mkQ('Khi kim dài chỉ đúng <b>số 12</b>, ta gọi đó là gì?', ['Giờ đúng', 'Giờ rưỡi', 'Giờ kém', 'Nửa đêm'], 0, 'Kim dài chỉ số 12 nghĩa là 0 phút, ta có giờ đúng. Kim ngắn chỉ số mấy thì là mấy giờ.'); },
      function (L) { return qPickClock(L); },
      function () { return mkQ('Mặt đồng hồ có bao nhiêu số?', ['12 số', '10 số', '24 số', '60 số'], 0, 'Mặt đồng hồ có 12 số, từ 1 đến 12. Kim ngắn đi hết một vòng 12 số là 12 giờ.'); },
      function () { const h = rnd(1, 11); return mkQ('Kim dài chỉ số 12, kim ngắn chỉ số <b>' + h + '</b>. Đồng hồ chỉ mấy giờ?', [h + ' giờ', (h + 1) + ' giờ', '12 giờ', h + ' giờ 12 phút'], 0, 'Kim dài chỉ số 12 là giờ đúng, kim ngắn chỉ số ' + h + ' nên là ' + h + ' giờ.', { fill: hourFill(0) }); }
    ],
    l2: [
      function (L) { return qRead(L, T(rnd(1, 12), 30), { ruoi: true }); },
      function (L) { return qRead(L, T(rnd(1, 12), 30)); },
      function () { return mkQ('<b>Giờ rưỡi</b> nghĩa là mấy phút?', ['30 phút', '60 phút', '15 phút', '6 phút'], 0, 'Rưỡi là một nửa. Nửa giờ là 30 phút, lúc đó kim dài chỉ số 6.'); },
      function () { return mkQ('<b>1 giờ</b> có bao nhiêu phút?', ['60 phút', '30 phút', '12 phút', '100 phút'], 0, '1 giờ có 60 phút. Kim dài đi hết một vòng là 60 phút, tức 1 giờ.'); },
      function () { const h = rnd(1, 11); return mkQ('Kim dài chỉ số 6, kim ngắn ở <b>giữa số ' + h + ' và số ' + (h + 1) + '</b>. Đó là mấy giờ?', [h + ' giờ rưỡi', (h + 1) + ' giờ rưỡi', h + ' giờ', '6 giờ ' + h + ' phút'], 0, 'Kim dài chỉ số 6 là 30 phút (giờ rưỡi). Kim ngắn ở giữa hai số thì đọc theo số nhỏ hơn: ' + h + ' giờ rưỡi.'); },
      function (L) { return qPickClock(L, T(rnd(1, 12), 30), { ruoi: true }); },
      function () { const h = rnd(1, 12); return mkQ('<b>' + h + ' giờ rưỡi</b> còn được viết là:', [h + ' giờ 30 phút', h + ' giờ 6 phút', h + ' giờ 15 phút', (h + 1) + ' giờ 30 phút'], 0, h + ' giờ rưỡi tức là ' + h + ' giờ 30 phút, vì nửa giờ bằng 30 phút.'); }
    ],
    l3: [
      function (L) { return qRead(L, T(rnd(1, 12), 15)); },
      function (L) { return qRead(L); },
      function () { return mkQ('Kim dài chỉ <b>số 3</b> nghĩa là bao nhiêu phút?', ['15 phút', '3 phút', '30 phút', '45 phút'], 0, 'Mỗi số cách nhau 5 phút: số 1 là 5 phút, số 2 là 10 phút, số 3 là 15 phút.'); },
      function () { return mkQ('Kim dài đi từ số 12 đến số 1 mất bao nhiêu phút?', ['5 phút', '1 phút', '10 phút', '15 phút'], 0, 'Từ số này sang số kế bên, kim dài đi mất 5 phút.'); },
      function (L) { return qPickClock(L, T(rnd(1, 12), 15)); },
      function () { const h = rnd(1, 12); return mkQ('Kim dài chỉ số 12, kim ngắn chỉ số <b>' + h + '</b>. Là mấy giờ?', [h + ' giờ', h + ' giờ 12 phút', '12 giờ ' + h + ' phút', h + ' giờ 15 phút'], 0, 'Kim dài chỉ số 12 là giờ đúng, nên đó là ' + h + ' giờ.', { fill: hourFill(0) }); },
      function () { return mkQ('Kim dài chỉ số 6 nghĩa là bao nhiêu phút?', ['30 phút', '6 phút', '15 phút', '60 phút'], 0, 'Số 6 ở nửa vòng đồng hồ: 6 × 5 = 30 phút, tức giờ rưỡi.'); }
    ],
    l4: [
      function () { const h = rnd(1, 6); return mkQ('<b>' + h + ' giờ chiều</b> còn gọi là mấy giờ?', [(h + 12) + ' giờ', h + ' giờ', (h + 10) + ' giờ', (h + 2) + ' giờ'], 0, 'Buổi chiều ta lấy giờ cộng 12: ' + h + ' + 12 = ' + (h + 12) + '. Vậy ' + h + ' giờ chiều là ' + (h + 12) + ' giờ.'); },
      function () { return mkQ('Một ngày có bao nhiêu giờ?', ['24 giờ', '12 giờ', '60 giờ', '30 giờ'], 0, 'Một ngày có 24 giờ. Kim ngắn đi hai vòng đồng hồ: một vòng buổi sáng, một vòng buổi chiều tối.'); },
      function () { const h = rnd(19, 21); return mkQ('<b>' + h + ' giờ</b> là mấy giờ tối?', [(h - 12) + ' giờ tối', h + ' giờ tối', (h - 10) + ' giờ tối', (h - 2) + ' giờ tối'], 0, 'Số ' + h + ' lớn hơn 12 nên ta lấy ' + h + ' − 12 = ' + (h - 12) + '. Vậy là ' + (h - 12) + ' giờ tối.'); },
      function () { const h = pick([8, 9, 10]); return mkQ('Em đi ngủ lúc <b>' + h + ' giờ tối</b>. Đồng hồ điện tử hiện số mấy?', [{ label: (h + 12) + ':00', clock: T(h + 12, 0), clockStyle: 'digital24' }, { label: h + ':00', clock: T(h, 0), clockStyle: 'digital24' }, { label: (h + 10) + ':00', clock: T(h + 10, 0), clockStyle: 'digital24' }, { label: (h + 2) + ':00', clock: T(h + 2, 0), clockStyle: 'digital24' }], 0, 'Buổi tối, đồng hồ điện tử ghi giờ cộng 12: ' + h + ' + 12 = ' + (h + 12) + '. Vậy hiện ' + (h + 12) + ':00.'); },
      function () { const h = rnd(6, 10); return mkQ('Buổi sáng em đến trường lúc <b>' + h + ' giờ</b>. Đồng hồ điện tử hiện số mấy?', [{ label: h + ':00', clock: T(h, 0), clockStyle: 'digital24' }, { label: (h + 12) + ':00', clock: T(h + 12, 0), clockStyle: 'digital24' }, { label: (h + 1) + ':00', clock: T(h + 1, 0), clockStyle: 'digital24' }, { label: (h - 1) + ':00', clock: T(h - 1, 0), clockStyle: 'digital24' }], 0, 'Buổi sáng thì số giờ giữ nguyên, không cộng 12. Đồng hồ điện tử hiện ' + h + ':00.'); },
      function () { const h = rnd(13, 18); return mkQ('Đồng hồ điện tử hiện <b>' + h + ':00</b>. Đó là mấy giờ chiều?', [(h - 12) + ' giờ chiều', h + ' giờ chiều', (h - 10) + ' giờ chiều', (h - 12 + 1) + ' giờ chiều'], 0, h + ' − 12 = ' + (h - 12) + '. Vậy ' + h + ':00 là ' + (h - 12) + ' giờ chiều.', { clock: T(h, 0), clockStyle: 'digital24' }); },
      function () { return mkQ('<b>12 giờ đêm</b> còn gọi là mấy giờ?', ['24 giờ', '12 giờ', '20 giờ', '14 giờ'], 0, 'Một ngày có 24 giờ, kết thúc lúc 12 giờ đêm, nên 12 giờ đêm còn gọi là 24 giờ.'); }
    ],
    l5: [
      function (L) { return qRead(L); },
      function (L) { return qRead(L); },
      function () { const k = pick([2, 4, 7, 8, 9, 10, 11]); return mkQ('Kim dài chỉ <b>số ' + k + '</b> nghĩa là bao nhiêu phút?', [(k * 5) + ' phút', k + ' phút', (k * 10) + ' phút', (k * 5 + 5) + ' phút'], 0, 'Mỗi số là 5 phút: ' + k + ' × 5 = ' + (k * 5) + ' phút.'); },
      function () { return mkQ('Từ số 12 đến số 6, kim dài đi hết bao nhiêu phút?', ['30 phút', '6 phút', '60 phút', '15 phút'], 0, '6 × 5 = 30 phút. Kim dài đi nửa vòng là 30 phút.'); },
      function (L) { return qPickClock(L); },
      function () { const m = pick([20, 25, 35, 40, 50, 55]); return mkQ('Muốn kim dài chỉ <b>' + m + ' phút</b>, kim dài phải chỉ số mấy?', ['Số ' + (m / 5), 'Số ' + m, 'Số ' + (m / 5 + 1), 'Số ' + (m / 5 - 1)], 0, m + ' : 5 = ' + (m / 5) + '. Kim dài chỉ số ' + (m / 5) + ' là ' + m + ' phút.'); },
      function () { return mkQ('Kim dài chỉ <b>số 11</b> là bao nhiêu phút?', ['55 phút', '11 phút', '50 phút', '5 phút'], 0, '11 × 5 = 55 phút. Chỉ còn 5 phút nữa là tròn giờ.'); }
    ],
    l6: [
      function () { const h = rnd(1, 11), m = pick([5, 10, 15, 20, 25]); return mkQ('<b>' + (h + 1) + ' giờ kém ' + m + ' phút</b> là mấy giờ?', [h + ' giờ ' + (60 - m) + ' phút', (h + 1) + ' giờ ' + m + ' phút', (h + 1) + ' giờ ' + (60 - m) + ' phút', h + ' giờ ' + m + ' phút'], 0, 'Kém nghĩa là còn thiếu. ' + (h + 1) + ' giờ kém ' + m + ' phút là còn ' + m + ' phút nữa mới đến ' + (h + 1) + ' giờ, tức ' + h + ' giờ ' + (60 - m) + ' phút (60 − ' + m + ' = ' + (60 - m) + ').'); },
      function (L) { const t = T(rnd(1, 12), pick([35, 40, 45, 50, 55])); const n = h12(t.h + 1), k = 60 - t.m; return mkQ('Đồng hồ chỉ mấy giờ? (đọc theo cách <b>giờ kém</b>)', [n + ' giờ kém ' + k + ' phút', h12(t.h) + ' giờ kém ' + k + ' phút', n + ' giờ kém ' + t.m + ' phút', n + ' giờ ' + k + ' phút'], 0, explainRead(t, { kem: true }), { clock: t, speech: 'Đồng hồ chỉ mấy giờ? Đọc theo cách giờ kém.' }); },
      function () { const h = rnd(1, 11), m = pick([35, 40, 50, 55]); return mkQ('<b>' + h + ' giờ ' + m + ' phút</b> còn được đọc là:', [(h + 1) + ' giờ kém ' + (60 - m) + ' phút', h + ' giờ kém ' + (60 - m) + ' phút', (h + 1) + ' giờ kém ' + m + ' phút', (h + 1) + ' giờ ' + (60 - m) + ' phút'], 0, '60 − ' + m + ' = ' + (60 - m) + '. Còn ' + (60 - m) + ' phút nữa là ' + (h + 1) + ' giờ, nên đọc là ' + (h + 1) + ' giờ kém ' + (60 - m) + ' phút.'); },
      function () { return mkQ('Khi nào ta đọc theo cách <b>giờ kém</b>?', ['Khi kim dài đã đi qua số 6', 'Khi kim dài chưa tới số 6', 'Khi kim dài chỉ số 12', 'Khi kim ngắn chỉ số 6'], 0, 'Kim dài qua số 6 nghĩa là đã hơn 30 phút, sắp sang giờ mới, nên ta đọc "giờ kém".'); },
      function (L) { const t = T(rnd(1, 12), pick([35, 40, 45, 50, 55])); return qPickClock(L, t, { kem: true }); },
      function () { const h = rnd(1, 11); return mkQ('<b>' + (h + 1) + ' giờ kém 5 phút</b> là mấy giờ?', [h + ' giờ 55 phút', (h + 1) + ' giờ 5 phút', (h + 1) + ' giờ 55 phút', h + ' giờ 5 phút'], 0, 'Còn 5 phút nữa mới đến ' + (h + 1) + ' giờ, tức ' + h + ' giờ 55 phút (60 − 5 = 55).'); }
    ],
    l7: [
      function () { const t = T(rnd(1, 12), pick(ALL_MINS)); const ds = digitalDistractors(t, LEVEL_BY_ID.l7, 3); const opts = [t].concat(ds).map(function (x) { return { label: fmtDigital(x), clock: x, clockStyle: 'digital12', hideLabel: true }; }); return mkQ('Đồng hồ điện tử nào <b>cùng giờ</b> với đồng hồ kim?', opts, 0, explainRead(t) + ' Đồng hồ điện tử ghi ' + fmtDigital(t) + '.', { clock: t, speech: 'Đồng hồ điện tử nào cùng giờ với đồng hồ kim?' }); },
      function () { const t = T(rnd(1, 12), pick([5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55])); const opts = ['Số ' + (t.m / 5), 'Số ' + t.m, 'Số ' + h12(t.h), 'Số ' + (t.m / 5 + 1)]; return mkQ('Đồng hồ điện tử hiện <b>' + fmtDigital(t) + '</b>. Kim dài chỉ số mấy?', opts, 0, t.m + ' phút = ' + (t.m / 5) + ' × 5, nên kim dài chỉ số ' + (t.m / 5) + '.', { clock: t, clockStyle: 'digital12', fill: shuffle(HOURS12.slice()).map(function (n) { return 'Số ' + n; }) }); },
      function () { const h = rnd(1, 11); return mkQ('Đồng hồ điện tử hiện <b>' + h + ':30</b>. Kim ngắn nằm ở đâu?', ['Giữa số ' + h + ' và số ' + (h + 1), 'Đúng số ' + h, 'Đúng số 6', 'Giữa số ' + (h + 1) + ' và số ' + (h + 2)], 0, '30 phút là nửa giờ, nên kim ngắn đã đi được nửa đường từ số ' + h + ' sang số ' + (h + 1) + '.', { clock: T(h, 30), clockStyle: 'digital12' }); },
      function () { const t = T(rnd(1, 12), pick([5, 15, 25, 45, 50])); return mkQ('<b>' + fmtDigital(t) + '</b> đọc là:', [fmtText(t), h12(t.h) + ' giờ ' + (t.m / 5) + ' phút', fmtText(T(t.h, 60 - t.m)), fmtText(T(t.h + 1, t.m))], 0, explainRead(t, { style: 'digital12' }), { clock: t, clockStyle: 'digital12', fill: hourFill(t.m) }); },
      function () { const t = T(rnd(1, 12), pick(ALL_MINS)); const ds = digitalDistractors(t, LEVEL_BY_ID.l7, 3); const opts = [t].concat(ds).map(function (x) { return { label: fmtText(x), clock: x, clockStyle: 'analog', hideLabel: true }; }); return mkQ('Đồng hồ kim nào chỉ <b>' + fmtDigital(t) + '</b>?', opts, 0, explainRead(t), { speech: 'Đồng hồ kim nào chỉ ' + fmtText(t) + '?' }); },
      function () { return mkQ('Trên đồng hồ điện tử, số đứng <b>sau</b> dấu hai chấm chỉ gì?', ['Phút', 'Giờ', 'Giây', 'Ngày'], 0, 'Giờ : phút. Số trước dấu hai chấm là giờ, số sau dấu hai chấm là phút.'); },
      function () { const h = rnd(1, 12); return mkQ('Đồng hồ điện tử hiện <b>' + h + ':05</b>. Đó là mấy giờ?', [h + ' giờ 5 phút', h + ' giờ 50 phút', fmtText(T(h + 1, 5)), h + ' giờ 30 phút'], 0, 'Số 05 là 5 phút (không phải 50). Vậy là ' + h + ' giờ 5 phút, kim dài chỉ số 1.', { clock: T(h, 5), clockStyle: 'digital12' }); }
    ],
    l8: [
      function () { const h = rnd(1, 11), d = pick([15, 30, 10, 20]); const s = T(h, 0), r = addMin(s, d); return mkQ('Bây giờ là <b>' + fmtText(s) + '</b>. <b>' + d + ' phút</b> nữa là mấy giờ?', [fmtText(r), fmtText(addMin(s, d * 2)), fmtText(T(h + d / 5, 0)), fmtText(addMin(s, 60))], 0, fmtText(s) + ' + ' + d + ' phút = ' + fmtText(r) + '. Kim dài đi từ số 12 tới số ' + (d / 5) + '.', { clock: s, fill: hourFill(d) }); },
      function () { const h = rnd(1, 11); const s = T(h, 45), r = addMin(s, 15); return mkQ('Bây giờ là <b>' + fmtText(s) + '</b>. <b>15 phút</b> nữa là mấy giờ?', [fmtText(r), h + ' giờ 60 phút', fmtText(T(h, 30)), fmtText(T(h + 1, 15))], 0, '45 + 15 = 60 phút = 1 giờ. Vậy ' + fmtText(s) + ' + 15 phút = ' + fmtText(r) + '.', { clock: s }); },
      function () { const h = rnd(1, 10); return mkQ('Em bắt đầu học lúc <b>' + h + ' giờ</b>, học trong <b>1 giờ</b>. Em học xong lúc mấy giờ?', [(h + 1) + ' giờ', h + ' giờ 1 phút', (h + 2) + ' giờ', h + ' giờ 60 phút'], 0, 'Cộng thêm 1 giờ thì kim ngắn tiến thêm một số: ' + h + ' giờ + 1 giờ = ' + (h + 1) + ' giờ.'); },
      function () { const h = rnd(1, 11), m = pick([15, 30]); const s = T(h, m), r = addMin(s, 30); return mkQ('Phim bắt đầu lúc <b>' + fmtText(s) + '</b> và dài <b>30 phút</b>. Phim kết thúc lúc mấy giờ?', [fmtText(r), fmtText(addMin(s, 60)), fmtText(T(h, 30)), fmtText(addMin(s, -30))], 0, m + ' + 30 = ' + (m + 30) + (m + 30 >= 60 ? ' phút = 1 giờ' : ' phút') + '. Vậy phim kết thúc lúc ' + fmtText(r) + '.', { clock: s }); },
      function (L) { const s = T(rnd(1, 11), pick([0, 15, 30])), d = pick([5, 10, 15, 30, 45]); const r = addMin(s, d); const ds = elapsedDistractors(s, d, r, 3); const opts = [r].concat(ds).map(function (x) { return { label: fmtText(x), clock: x, clockStyle: 'analog', hideLabel: true }; }); return mkQ('Bây giờ là <b>' + fmtText(s) + '</b>. Đồng hồ nào chỉ giờ của <b>' + d + ' phút</b> sau?', opts, 0, fmtText(s) + ' + ' + d + ' phút = ' + fmtText(r) + '.', { speech: 'Bây giờ là ' + fmtText(s) + '. Đồng hồ nào chỉ giờ của ' + d + ' phút sau?' }); },
      function () { const h = rnd(1, 10); const s = T(h, 30); return mkQ('Bây giờ là <b>' + fmtText(s) + '</b>. <b>1 giờ</b> nữa là mấy giờ?', [fmtText(T(h + 1, 30)), fmtText(T(h + 1, 0)), fmtText(T(h, 31)), fmtText(T(h + 2, 30))], 0, 'Cộng 1 giờ: kim ngắn tiến thêm một số, phút giữ nguyên. ' + fmtText(s) + ' + 1 giờ = ' + fmtText(T(h + 1, 30)) + '.', { clock: s }); }
    ]
  };

  /** Chọn bộ câu hỏi cho màn: các câu rút kinh nghiệm từ lỗi trong mê cung trước, rồi câu trong ngân hàng. */
  function buildQuiz(level, mistakes, count) {
    count = count || 3;
    const qs = [];
    const seen = {};
    (mistakes || []).slice(0, 2).forEach(function (mis) {
      const k = key(mis.shown) + '|' + mis.style;
      if (seen[k]) return;
      seen[k] = true;
      qs.push(mistakeQuestion(level, mis));
    });
    const total = qs.length ? count + 1 : count;
    const bank = shuffle(QUIZ[level.id].slice());
    let i = 0;
    while (qs.length < total && i < bank.length) {
      const q = bank[i++](level);
      if (q) qs.push(q);
    }
    return qs;
  }

  /** Câu hỏi rút kinh nghiệm: đồng hồ bé đã chọn nhầm trong mê cung. */
  function mistakeQuestion(level, mis) {
    const shown = mis.shown, target = mis.target, style = mis.style;
    if (style === 'digital24') {
      const opts = uniqTimes([shown, target].concat(periodDistractors(shown, level, 4)), []).slice(0, 4);
      const labels = opts.map(function (x) { return fmtText(x, { period: true }); });
      return mkQ('Trong mê cung, em đã chọn nhầm đồng hồ điện tử <b>' + fmtDigital(shown, true) + '</b>. Đồng hồ này chỉ mấy giờ?', labels, 0,
        explainRead(shown, { style: 'digital24' }) + ' Còn đồng hồ cần tìm là ' + fmtText(target, { period: true }) + ' (' + fmtDigital(target, true) + ').',
        { clock: shown, clockStyle: 'digital24', speech: 'Em đã chọn nhầm đồng hồ điện tử ' + fmtText(shown, { h24: true }) + '. Đồng hồ này chỉ mấy giờ?' });
    }
    if (style === 'digital12') {
      const opts = uniqTimes([shown, target].concat(digitalDistractors(shown, level, 4)), []).slice(0, 4);
      const labels = opts.map(function (x) { return fmtText(x); });
      return mkQ('Trong mê cung, em đã chọn nhầm đồng hồ điện tử <b>' + fmtDigital(shown) + '</b>. Nó đọc là mấy giờ?', labels, 0,
        explainRead(shown, { style: 'digital12' }) + ' Còn đồng hồ cần tìm là ' + fmtDigital(target) + ' (' + fmtText(target) + ').',
        { clock: shown, clockStyle: 'digital12', speech: 'Em đã chọn nhầm đồng hồ điện tử ' + fmtText(shown) + '. Nó đọc là mấy giờ?' });
    }
    const ds = analogDistractors(shown, level, 4).filter(function (x) { return !same(x, target); });
    const opts = uniqTimes([shown, target].concat(ds), []).slice(0, 4);
    const o = { kem: !!level.kem, ruoi: false };
    const labels = opts.map(function (x) { return fmtText(x, o); });
    return mkQ('Trong mê cung, em đã chọn nhầm đồng hồ này. Nó chỉ mấy giờ?', labels, 0,
      explainRead(shown, { kem: !!level.kem }) + ' Còn đồng hồ cần tìm là ' + fmtText(target, o) + '.',
      { clock: shown, clockStyle: 'analog', speech: 'Em đã chọn nhầm đồng hồ này. Nó chỉ mấy giờ?' });
  }

  window.Clock = {
    rnd: rnd, chance: chance, pick: pick, shuffle: shuffle,
    T: T, h12: h12, key: key, same: same, sameFace: sameFace, addMin: addMin, pad: pad, periodOf: periodOf, periodIcon: periodIcon,
    fmtText: fmtText, fmtDigital: fmtDigital, itemLabel: itemLabel, describeItem: describeItem, explainRead: explainRead,
    drawClock: drawClock, drawDigital: drawDigital, svgClock: svgClock, svgDigital: svgDigital, setSvgTime: setSvgTime, angles: angles,
    LEVELS: LEVELS, levelById: levelById, LESSONS: LESSONS, QUIZ: QUIZ, ALL_MINS: ALL_MINS, HOURS12: HOURS12,
    makeRound: makeRound, buildQuiz: buildQuiz, mistakeQuestion: mistakeQuestion,
    HOUR_COLOR: HOUR_COLOR, MIN_COLOR: MIN_COLOR
  };
})();
