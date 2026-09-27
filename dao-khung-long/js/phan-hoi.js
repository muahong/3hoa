/* ============================================================
   phan-hoi.js – Nội dung màn "Gần đúng rồi!" dùng chung cho mọi game:
   gọi tên lỗi thân thiện, đặt tính cột dọc như SGK ("viết 3, nhớ 1"), các bước tách 10,
   và bảng que tính (bó chục, que lẻ). Chỉ dựng HTML, không giữ trạng thái.
   API: window.PhanHoi
   ============================================================ */
(function () {
  'use strict';

  const TRU = '−';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function chuSo(n, soCot) { const s = String(n); return new Array(Math.max(0, soCot - s.length) + 1).join(' ') + s; }

  /** Đặt tính cột dọc. cot: { tren, duoi, phep, kq, nho } */
  function cotDoc(cot) {
    const soCot = Math.max(String(cot.tren).length, String(cot.duoi).length, String(cot.kq).length);
    const o = function (s, lop) { return '<span class="o' + (lop ? ' ' + lop : '') + '">' + (s === ' ' ? '' : esc(s)) + '</span>'; };
    const hang = function (chu, dau, lopCot) {
      let h = '<div class="hang">' + o(dau || ' ', 'dau');
      const s = chuSo(chu, soCot);
      for (let i = 0; i < soCot; i++) h += o(s[i], lopCot ? lopCot(i) : '');
      return h + '</div>';
    };
    let nho = '<div class="hang nho">' + o(' ', 'dau');
    for (let i = 0; i < soCot; i++) {
      const hangDv = i === soCot - 1, hangChuc = i === soCot - 2;
      let chu = ' ';
      if (cot.nho && cot.phep === '+' && hangChuc) chu = '1';
      if (cot.nho && cot.phep === '-' && hangDv) chu = '1';
      nho += o(chu, chu !== ' ' ? 'cam' : '');
    }
    nho += '</div>';
    const duoi = cot.nho && cot.phep === '-'
      ? hang(cot.duoi, TRU, function (i) { return i === soCot - 2 ? 'co-nho' : ''; })
      : hang(cot.duoi, cot.phep === '+' ? '+' : TRU);
    return '<div class="cot-doc" aria-label="Đặt tính">' + nho + hang(cot.tren) + duoi + '<div class="gach"></div>' + hang(cot.kq, '', function () { return 'kq'; }) + '</div>';
  }

  function bo(n, lop) { let s = ''; for (let i = 0; i < n; i++) s += '<i class="bo' + (lop ? ' ' + lop : '') + '"></i>'; return s; }
  function que(n, lop) { let s = ''; for (let i = 0; i < n; i++) s += '<i class="que' + (lop ? ' ' + lop : '') + '"></i>'; return s; }
  function dong(nhan, hinh, ghiChu) {
    return '<div class="qt-dong"><b>' + esc(nhan) + '</b><span class="qt-hinh">' + hinh + '</span>' + (ghiChu ? '<em>' + esc(ghiChu) + '</em>' : '') + '</div>';
  }

  /** Bảng que tính cho phép cộng, trừ hai số (null nếu dạng câu không hợp). */
  function queTinh(ct) {
    if (!ct || Array.isArray(ct.phep) || ct.an !== 'ket_qua') return null;
    const a = ct.so[0], b = ct.so[1];
    if (a > 100 || b > 100) return null;
    const ca = Math.floor(a / 10), ua = a % 10, cb = Math.floor(b / 10), ub = b % 10;
    let h = '';
    if (ct.phep === '+') {
      const d = a + b;
      h += dong(String(a), bo(ca) + que(ua), ca + ' bó, ' + ua + ' que');
      h += dong('+ ' + b, bo(cb) + que(ub), cb + ' bó, ' + ub + ' que');
      if (ua + ub >= 10) {
        h += dong('Gộp que', que(10, 'cam') + que(ua + ub - 10), ua + ' + ' + ub + ' = ' + (ua + ub) + ' que: bó 10 que thành 1 bó');
        h += dong('= ' + d, bo(ca + cb) + bo(1, 'cam') + que(ua + ub - 10), (ca + cb + 1) + ' bó, ' + (ua + ub - 10) + ' que');
      } else {
        h += dong('= ' + d, bo(ca + cb) + que(ua + ub), (ca + cb) + ' bó, ' + (ua + ub) + ' que');
      }
    } else {
      const d = a - b;
      h += dong(String(a), bo(ca) + que(ua), ca + ' bó, ' + ua + ' que');
      if (ua < ub) {
        h += dong('Tháo 1 bó', bo(ca - 1) + que(10, 'cam') + que(ua), ua + ' que không bớt được ' + ub + ' que: tháo 1 bó');
        h += dong(TRU + ' ' + b, bo(cb, 'mo') + que(ub, 'mo'), 'bớt ' + cb + ' bó, ' + ub + ' que');
        h += dong('= ' + d, bo(ca - 1 - cb) + que(10 + ua - ub), 'còn ' + (ca - 1 - cb) + ' bó, ' + (10 + ua - ub) + ' que');
      } else {
        h += dong(TRU + ' ' + b, bo(cb, 'mo') + que(ub, 'mo'), 'bớt ' + cb + ' bó, ' + ub + ' que');
        h += dong('= ' + d, bo(ca - cb) + que(ua - ub), 'còn ' + (ca - cb) + ' bó, ' + (ua - ub) + ' que');
      }
    }
    return '<div class="que-tinh">' + h + '</div>';
  }

  /** Nội dung chính: lời gọi tên lỗi, lời giải. */
  function noiDung(q, giaTri, kq) {
    const coTen = kq.loi && kq.loi.length && kq.loi[0] !== 'khac';
    const lg = q.loi_giai || {};
    let h = '<h2>' + (coTen ? 'Gần đúng rồi!' : 'Mình cùng xem nhé!') + '</h2>';
    h += '<p class="ph-loi">Con chọn <b>' + esc(giaTri) + '</b>. ' + esc(kq.loiNoi || '') + (coTen ? ', mình cùng xem nhé.' : '.') + '</p>';
    h += '<div class="ph-giai">';
    if (lg.cot) h += cotDoc(lg.cot);
    h += '<ol class="ph-buoc">' + (lg.buoc || []).map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ol>';
    h += '</div>';
    h += '<p class="ph-ket">Vậy ' + esc(q.de.replace('?', String(q.dap_an))) + '</p>';
    return h;
  }

  window.PhanHoi = { cotDoc: cotDoc, queTinh: queTinh, noiDung: noiDung, esc: esc };
})();
