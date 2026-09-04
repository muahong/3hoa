/* ============================================================
   fruits.js – Vẽ trái cây, bom, tim bằng Canvas (vector, không cần ảnh)
   Mỗi loại được vẽ 1 lần vào canvas ẩn (sprite) rồi drawImage
   mỗi khung hình => rất nhẹ cho iPad.
   ============================================================ */
(function () {
  'use strict';
  const TAU = Math.PI * 2;

  /* Màu ruột (mặt cắt) và màu nước ép của từng loại quả */
  const FRUITS = {
    apple:      { name: 'Táo',        inner: '#fff4d6', juice: '#ffd66b', pad: 0.34 },
    orange:     { name: 'Cam',        inner: '#ffb244', juice: '#ff9f1c', pad: 0.24 },
    lemon:      { name: 'Chanh',      inner: '#fff59a', juice: '#fff176', pad: 0.3 },
    watermelon: { name: 'Dưa hấu',    inner: '#ff4d5e', juice: '#ff3d55', pad: 0.24 },
    kiwi:       { name: 'Kiwi',       inner: '#8bd34a', juice: '#9be35a', pad: 0.12 },
    dragon:     { name: 'Thanh long', inner: '#fbf7f1', juice: '#ff5fa8', pad: 0.42 },
    peach:      { name: 'Đào',        inner: '#ffd977', juice: '#ffb85c', pad: 0.3 },
    plum:       { name: 'Mận',        inner: '#ffc857', juice: '#b06be0', pad: 0.22 }
  };
  const TYPES = Object.keys(FRUITS);

  /* Bộ sinh số ngẫu nhiên có hạt giống => hoa văn luôn giống nhau */
  function seeded(seed) {
    let s = (seed >>> 0) || 1;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  function highlight(ctx, x, y, rx, ry, rot, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    ctx.fillStyle = 'rgba(255,255,255,' + (alpha == null ? 0.35 : alpha) + ')';
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function leaf(ctx, x, y, len, wid, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    const g = ctx.createLinearGradient(-len, 0, len, 0);
    g.addColorStop(0, '#8be36d');
    g.addColorStop(1, '#3e9e3a');
    ctx.fillStyle = g;
    ctx.strokeStyle = '#2f7f30';
    ctx.lineWidth = Math.max(1, wid * 0.2);
    ctx.beginPath();
    ctx.moveTo(-len, 0);
    ctx.quadraticCurveTo(0, -wid, len, 0);
    ctx.quadraticCurveTo(0, wid, -len, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-len * 0.8, 0);
    ctx.lineTo(len * 0.8, 0);
    ctx.stroke();
    ctx.restore();
  }

  function stem(ctx, x0, y0, x1, y1, w) {
    ctx.strokeStyle = '#7a4a1e';
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + x1) / 2 + w, (y0 + y1) / 2, x1, y1);
    ctx.stroke();
  }

  /* ---------------- Vỏ ngoài ---------------- */
  const SKIN = {
    apple(ctx, r) {
      stem(ctx, 0, -r * 0.7, r * 0.16, -r * 1.12, r * 0.11);
      leaf(ctx, r * 0.38, -r * 1.0, r * 0.34, r * 0.17, -0.45);
      const g = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.08, 0, 0, r * 1.1);
      g.addColorStop(0, '#ff9282');
      g.addColorStop(0.5, '#ef3b34');
      g.addColorStop(1, '#a51d17');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.72);
      ctx.bezierCurveTo(-r * 0.35, -r * 1.1, -r * 1.15, -r * 0.7, -r * 1.0, r * 0.05);
      ctx.bezierCurveTo(-r * 0.9, r * 0.7, -r * 0.45, r * 1.02, 0, r * 0.96);
      ctx.bezierCurveTo(r * 0.45, r * 1.02, r * 0.9, r * 0.7, r * 1.0, r * 0.05);
      ctx.bezierCurveTo(r * 1.15, -r * 0.7, r * 0.35, -r * 1.1, 0, -r * 0.72);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(110,18,12,0.55)';
      ctx.lineWidth = r * 0.05;
      ctx.stroke();
      highlight(ctx, -r * 0.42, -r * 0.42, r * 0.2, r * 0.3, -0.6, 0.38);
      highlight(ctx, r * 0.3, r * 0.55, r * 0.22, r * 0.09, -0.3, 0.12);
    },

    orange(ctx, r) {
      const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r * 1.05);
      g.addColorStop(0, '#ffc766');
      g.addColorStop(0.55, '#ff9a1f');
      g.addColorStop(1, '#d9680a');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(150,60,0,0.5)';
      ctx.lineWidth = r * 0.05;
      ctx.stroke();
      const rand = seeded(7);
      ctx.fillStyle = 'rgba(120,50,0,0.16)';
      for (let i = 0; i < 70; i++) {
        const a = rand() * TAU, d = Math.sqrt(rand()) * r * 0.9;
        ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d, r * 0.035, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = '#6b8f2a';
      ctx.beginPath(); ctx.arc(0, -r * 0.93, r * 0.1, 0, TAU); ctx.fill();
      leaf(ctx, r * 0.3, -r * 0.98, r * 0.32, r * 0.15, -0.35);
      highlight(ctx, -r * 0.4, -r * 0.4, r * 0.2, r * 0.3, -0.7, 0.32);
    },

    lemon(ctx, r) {
      const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r * 1.1);
      g.addColorStop(0, '#fff8a8');
      g.addColorStop(0.55, '#ffd83b');
      g.addColorStop(1, '#e0a800');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 1.02, r * 0.8, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(-r * 1.05, 0, r * 0.15, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 1.05, 0, r * 0.15, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(160,110,0,0.45)';
      ctx.lineWidth = r * 0.05;
      ctx.beginPath(); ctx.arc(-r * 1.05, 0, r * 0.15, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(r * 1.05, 0, r * 0.15, 0, TAU); ctx.stroke();
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 1.02, r * 0.8, 0, 0, TAU); ctx.fill();
      ctx.stroke();
      const rand = seeded(3);
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      for (let i = 0; i < 50; i++) {
        const a = rand() * TAU, d = Math.sqrt(rand()) * 0.9;
        ctx.beginPath(); ctx.arc(Math.cos(a) * d * r, Math.sin(a) * d * r * 0.78, r * 0.03, 0, TAU); ctx.fill();
      }
      leaf(ctx, -r * 0.8, -r * 0.6, r * 0.3, r * 0.14, 0.6);
      highlight(ctx, -r * 0.4, -r * 0.32, r * 0.24, r * 0.15, -0.35, 0.4);
    },

    watermelon(ctx, r) {
      const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r * 1.05);
      g.addColorStop(0, '#86dc70');
      g.addColorStop(0.6, '#3fae52');
      g.addColorStop(1, '#22803a');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
      ctx.save();
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip();
      ctx.strokeStyle = 'rgba(20,90,35,0.75)';
      ctx.lineWidth = r * 0.2;
      ctx.lineCap = 'round';
      for (let k = -2; k <= 2; k++) {
        const x = k * r * 0.42;
        ctx.beginPath();
        ctx.moveTo(x * 0.55, -r * 1.1);
        ctx.bezierCurveTo(x * 1.35, -r * 0.4, x * 0.6, r * 0.4, x * 1.15, r * 1.1);
        ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = 'rgba(15,70,25,0.6)';
      ctx.lineWidth = r * 0.05;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
      stem(ctx, 0, -r * 0.92, r * 0.25, -r * 1.15, r * 0.1);
      highlight(ctx, -r * 0.4, -r * 0.4, r * 0.2, r * 0.3, -0.7, 0.28);
    },

    kiwi(ctx, r) {
      const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r * 1.05);
      g.addColorStop(0, '#b48f5d');
      g.addColorStop(0.6, '#8a6539');
      g.addColorStop(1, '#5e4223');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.86, 0, 0, TAU); ctx.fill();
      const rand = seeded(11);
      ctx.strokeStyle = 'rgba(215,180,125,0.55)';
      ctx.lineWidth = Math.max(1, r * 0.03);
      ctx.lineCap = 'round';
      for (let i = 0; i < 140; i++) {
        const a = rand() * TAU, d = Math.sqrt(rand()) * r * 0.92;
        const x = Math.cos(a) * d, y = Math.sin(a) * d * 0.86, b = rand() * TAU;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(b) * r * 0.07, y + Math.sin(b) * r * 0.07); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(60,40,20,0.5)';
      ctx.lineWidth = r * 0.05;
      ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.86, 0, 0, TAU); ctx.stroke();
      highlight(ctx, -r * 0.4, -r * 0.35, r * 0.22, r * 0.26, -0.6, 0.14);
    },

    dragon(ctx, r) {
      const fin = function (a, len, front) {
        ctx.save();
        ctx.rotate(a);
        ctx.translate(r * (front ? 0.5 : 0.78), 0);
        const g = ctx.createLinearGradient(0, 0, len, 0);
        g.addColorStop(0, '#ff5fb0');
        g.addColorStop(0.55, '#ff8ac6');
        g.addColorStop(1, '#5fc95a');
        ctx.fillStyle = g;
        ctx.strokeStyle = 'rgba(160,20,90,0.5)';
        ctx.lineWidth = r * 0.04;
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.17);
        ctx.quadraticCurveTo(len * 0.7, -r * 0.24, len, 0);
        ctx.quadraticCurveTo(len * 0.7, r * 0.24, 0, r * 0.17);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      };
      for (let i = 0; i < 9; i++) fin(-Math.PI / 2 + i * TAU / 9 + 0.15, r * 0.6, false);
      const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r * 1.05);
      g.addColorStop(0, '#ff8ac6');
      g.addColorStop(0.55, '#ff2f97');
      g.addColorStop(1, '#c4127a');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.9, r, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(150,10,80,0.5)';
      ctx.lineWidth = r * 0.05;
      ctx.stroke();
      for (let i = 0; i < 5; i++) fin(-Math.PI / 2 + 0.5 + i * 1.25, r * 0.55, true);
      highlight(ctx, -r * 0.35, -r * 0.45, r * 0.18, r * 0.28, -0.5, 0.32);
    },

    peach(ctx, r) {
      leaf(ctx, r * 0.3, -r * 0.95, r * 0.34, r * 0.16, -0.5);
      const g = ctx.createLinearGradient(-r * 0.8, -r * 0.8, r * 0.8, r * 0.8);
      g.addColorStop(0, '#ffe08a');
      g.addColorStop(0.45, '#ffb36b');
      g.addColorStop(1, '#ff6f7d');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, r * 0.03, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(180,70,60,0.5)';
      ctx.lineWidth = r * 0.05;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(200,80,70,0.55)';
      ctx.lineWidth = r * 0.07;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-r * 0.05, -r * 0.9);
      ctx.quadraticCurveTo(-r * 0.45, -r * 0.1, -r * 0.1, r * 0.85);
      ctx.stroke();
      highlight(ctx, -r * 0.42, -r * 0.4, r * 0.22, r * 0.3, -0.6, 0.3);
    },

    plum(ctx, r) {
      stem(ctx, 0, -r * 0.8, r * 0.1, -r * 1.12, r * 0.09);
      const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r * 1.05);
      g.addColorStop(0, '#c893f5');
      g.addColorStop(0.55, '#7f43c2');
      g.addColorStop(1, '#3f1f6e');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.95, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(40,10,70,0.55)';
      ctx.lineWidth = r * 0.05;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(40,10,70,0.4)';
      ctx.lineWidth = r * 0.06;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(r * 0.05, -r * 0.85);
      ctx.quadraticCurveTo(r * 0.45, -r * 0.1, r * 0.1, r * 0.8);
      ctx.stroke();
      highlight(ctx, -r * 0.4, -r * 0.4, r * 0.2, r * 0.3, -0.6, 0.3);
    }
  };

  /* ---------------- Mặt cắt (ruột) ---------------- */
  function disc(ctx, r, fill, rim, rimW) {
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = rim;
    ctx.lineWidth = rimW;
    ctx.beginPath(); ctx.arc(0, 0, r - rimW / 2, 0, TAU); ctx.stroke();
  }
  function citrus(ctx, r, fill, rim, pith) {
    disc(ctx, r, fill, rim, r * 0.08);
    ctx.strokeStyle = pith;
    ctx.lineWidth = r * 0.08;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.86, 0, TAU); ctx.stroke();
    ctx.lineWidth = r * 0.05;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = i * TAU / 10;
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86);
    }
    ctx.stroke();
    ctx.fillStyle = pith;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.1, 0, TAU); ctx.fill();
  }
  function pit(ctx, rx, ry, c1, c2) {
    ctx.fillStyle = c1;
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = c2;
    ctx.lineWidth = Math.max(1, rx * 0.12);
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const y = -ry * 0.5 + i * ry * 0.5;
      ctx.moveTo(-rx * 0.6, y);
      ctx.quadraticCurveTo(0, y + ry * 0.2, rx * 0.6, y);
    }
    ctx.stroke();
  }

  const INNER = {
    apple(ctx, r) {
      disc(ctx, r, '#fff4d6', '#e0342c', r * 0.1);
      ctx.fillStyle = '#e9d7ad';
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5;
        const d = i % 2 ? r * 0.18 : r * 0.36;
        ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#5a3a1a';
      for (let i = 0; i < 5; i++) {
        ctx.save();
        ctx.rotate(-Math.PI / 2 + i * TAU / 5);
        ctx.beginPath(); ctx.ellipse(r * 0.2, 0, r * 0.09, r * 0.05, 0, 0, TAU); ctx.fill();
        ctx.restore();
      }
    },
    orange(ctx, r) { citrus(ctx, r, '#ffb244', '#f47f14', '#ffefd0'); },
    lemon(ctx, r) { citrus(ctx, r, '#fff59a', '#f2c200', '#fffde8'); },
    watermelon(ctx, r) {
      disc(ctx, r, '#ff4d5e', '#2f8f3a', r * 0.14);
      ctx.strokeStyle = '#fbe9d0';
      ctx.lineWidth = r * 0.09;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.83, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#23201f';
      for (let i = 0; i < 9; i++) {
        ctx.save(); ctx.rotate(i * TAU / 9);
        ctx.beginPath(); ctx.ellipse(r * 0.5, 0, r * 0.1, r * 0.055, 0, 0, TAU); ctx.fill();
        ctx.restore();
      }
      for (let i = 0; i < 4; i++) {
        ctx.save(); ctx.rotate(i * TAU / 4 + 0.4);
        ctx.beginPath(); ctx.ellipse(r * 0.22, 0, r * 0.09, r * 0.05, 0, 0, TAU); ctx.fill();
        ctx.restore();
      }
    },
    kiwi(ctx, r) {
      disc(ctx, r, '#8bd34a', '#7a5a33', r * 0.09);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.9);
      g.addColorStop(0, '#f3f7d8');
      g.addColorStop(0.35, '#d6ec9a');
      g.addColorStop(1, 'rgba(139,211,74,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, TAU); ctx.fill();
      ctx.fillStyle = '#1e1a14';
      for (let i = 0; i < 18; i++) {
        ctx.save(); ctx.rotate(i * TAU / 18);
        ctx.beginPath(); ctx.ellipse(r * 0.42, 0, r * 0.06, r * 0.035, 0, 0, TAU); ctx.fill();
        ctx.restore();
      }
    },
    dragon(ctx, r) {
      disc(ctx, r, '#fbf7f1', '#f0288a', r * 0.11);
      const rand = seeded(23);
      ctx.fillStyle = '#1b1b1b';
      for (let i = 0; i < 50; i++) {
        const a = rand() * TAU, d = Math.sqrt(rand()) * r * 0.8;
        ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d, r * 0.035, 0, TAU); ctx.fill();
      }
    },
    peach(ctx, r) {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, '#ffb64a');
      g.addColorStop(1, '#ffe9a0');
      disc(ctx, r, g, '#ff8f7a', r * 0.09);
      pit(ctx, r * 0.3, r * 0.36, '#8a4b1f', '#5e2f0f');
    },
    plum(ctx, r) {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, '#f0a030');
      g.addColorStop(1, '#ffd66b');
      disc(ctx, r, g, '#6b3a9e', r * 0.1);
      pit(ctx, r * 0.22, r * 0.28, '#8a4b1f', '#5e2f0f');
    }
  };

  /* ---------------- Bom ---------------- */
  function drawBomb(ctx, r) {
    ctx.strokeStyle = '#8b5a2b';
    ctx.lineWidth = r * 0.09;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(r * 0.1, -r * 0.8);
    ctx.quadraticCurveTo(r * 0.25, -r * 1.25, r * 0.62, -r * 1.22);
    ctx.stroke();
    ctx.fillStyle = '#6b6b70';
    ctx.beginPath(); ctx.arc(r * 0.05, -r * 0.82, r * 0.2, 0, TAU); ctx.fill();
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.05, 0, 0, r);
    g.addColorStop(0, '#80808a');
    g.addColorStop(0.45, '#2e2e36');
    g.addColorStop(1, '#0d0d12');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.92, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = r * 0.05;
    ctx.stroke();
    highlight(ctx, -r * 0.36, -r * 0.38, r * 0.16, r * 0.24, -0.6, 0.28);
    // Đầu lâu nhỏ để bé nhận ra "nguy hiểm"
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath(); ctx.arc(0, r * 0.02, r * 0.3, 0, TAU); ctx.fill();
    ctx.fillRect(-r * 0.2, r * 0.18, r * 0.4, r * 0.2);
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(-r * 0.11, -r * 0.02, r * 0.08, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.11, -r * 0.02, r * 0.08, 0, TAU); ctx.fill();
    ctx.fillRect(-r * 0.06, r * 0.24, r * 0.04, r * 0.14);
    ctx.fillRect(r * 0.02, r * 0.24, r * 0.04, r * 0.14);
  }

  /* ---------------- Tim (hồi mạng) ---------------- */
  function drawHeart(ctx, r) {
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.05, 0, 0, r * 1.2);
    g.addColorStop(0, '#ff9bbd');
    g.addColorStop(0.5, '#ff3b78');
    g.addColorStop(1, '#c2124e');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, r * 0.95);
    ctx.bezierCurveTo(-r * 1.4, r * 0.1, -r * 0.65, -r * 1.05, 0, -r * 0.4);
    ctx.bezierCurveTo(r * 0.65, -r * 1.05, r * 1.4, r * 0.1, 0, r * 0.95);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,10,60,0.6)';
    ctx.lineWidth = r * 0.06;
    ctx.stroke();
    highlight(ctx, -r * 0.45, -r * 0.42, r * 0.14, r * 0.2, -0.6, 0.45);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    const w = r * 0.13, l = r * 0.4;
    ctx.fillRect(-w / 2, -l / 2 + r * 0.05, w, l);
    ctx.fillRect(-l / 2, -w / 2 + r * 0.05, l, w);
  }

  /* ---------------- Tạo sprite ---------------- */
  function makeSprite(fn, r, pad, dpr) {
    const size = Math.ceil((r + pad) * 2);
    const c = document.createElement('canvas');
    c.width = Math.ceil(size * dpr);
    c.height = c.width;
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.translate(size / 2, size / 2);
    fn(ctx, r);
    return { canvas: c, size: size, half: size / 2 };
  }

  const Sprites = {
    TYPES: TYPES,
    FRUITS: FRUITS,
    r: 0,
    dpr: 1,
    fruits: {},
    bomb: null,
    heart: null,

    build(r, dpr) {
      if (this.r === r && this.dpr === dpr && this.bomb) return;
      // Giải phóng bộ nhớ của sprite cũ (đổi hướng màn hình dựng lại nhiều lần)
      const release = function (sp) { if (sp && sp.canvas) sp.canvas.width = 0; };
      for (const t in this.fruits) { release(this.fruits[t].skin); release(this.fruits[t].inner); }
      release(this.bomb); release(this.heart);
      this.r = r;
      this.dpr = dpr;
      this.fruits = {};
      for (let i = 0; i < TYPES.length; i++) {
        const t = TYPES[i];
        this.fruits[t] = {
          skin: makeSprite(SKIN[t], r, FRUITS[t].pad * r, dpr),
          inner: makeSprite(INNER[t], r, r * 0.06, dpr),
          def: FRUITS[t]
        };
      }
      this.bomb = makeSprite(drawBomb, r, r * 0.45, dpr);
      this.heart = makeSprite(drawHeart, r, r * 0.3, dpr);
    },

    /** Vẽ 1 sprite nguyên quả tại (x, y). */
    draw(ctx, sp, x, y, rot, scale) {
      ctx.save();
      ctx.translate(x, y);
      if (rot) ctx.rotate(rot);
      if (scale !== 1) ctx.scale(scale, scale);
      ctx.drawImage(sp.canvas, -sp.half, -sp.half, sp.size, sp.size);
      ctx.restore();
    },

    /**
     * Vẽ nửa quả đã chém.
     * cutAngle: góc đường cắt trong hệ toạ độ cục bộ của quả; side: +1/-1 (nửa nào).
     */
    drawHalf(ctx, type, x, y, rot, cutAngle, side) {
      const e = this.fruits[type];
      if (!e) return;
      const sk = e.skin, inn = e.inner;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.save();
      ctx.rotate(cutAngle);
      ctx.beginPath();
      ctx.rect(-sk.size, side > 0 ? 0 : -sk.size, sk.size * 2, sk.size);
      ctx.clip();
      ctx.rotate(-cutAngle);
      ctx.drawImage(sk.canvas, -sk.half, -sk.half, sk.size, sk.size);
      ctx.restore();
      ctx.rotate(cutAngle);
      ctx.scale(1, 0.38);
      ctx.drawImage(inn.canvas, -inn.half, -inn.half, inn.size, inn.size);
      ctx.restore();
    }
  };

  window.Sprites = Sprites;
})();
