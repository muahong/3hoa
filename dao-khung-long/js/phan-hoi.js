/* ============================================================
   phan-hoi.js – Nội dung màn "Gần đúng rồi!" dùng chung cho mọi game:
   gọi tên lỗi thân thiện, đặt tính cột dọc như SGK ("viết 3, nhớ 1"), các bước tách 10,
   bảng que tính (bó chục, que lẻ), mô hình khối trăm, chục, đơn vị. Chỉ dựng HTML, không giữ trạng thái.
   API: window.PhanHoi
   ============================================================ */
(function () {
  'use strict';

  const TRU = '−';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function chuSo(n, soCot) { const s = String(n); return new Array(Math.max(0, soCot - s.length) + 1).join(' ') + s; }
  function hienGiaTri(v) { return window.NganHang && window.NganHang.hienGiaTri ? window.NganHang.hienGiaTri(v) : String(v); }

  /**
   * Đặt tính cột dọc. cot: { tren, duoi, phep, kq, nho, vi_tri_nho }
   * vi_tri_nho: hàng sinh ra nhớ, đếm từ phải (0: hàng đơn vị, 1: hàng chục).
   */
  function cotDoc(cot) {
    const soCot = Math.max(String(cot.tren).length, String(cot.duoi).length, String(cot.kq).length);
    const vi = cot.vi_tri_nho || 0;
    const o = function (s, lop) { return '<span class="o' + (lop ? ' ' + lop : '') + '">' + (s === ' ' ? '' : esc(s)) + '</span>'; };
    const hang = function (chu, dau, lopCot) {
      let h = '<div class="hang">' + o(dau || ' ', 'dau');
      const s = chuSo(chu, soCot);
      for (let i = 0; i < soCot; i++) h += o(s[i], lopCot ? lopCot(i) : '');
      return h + '</div>';
    };
    let nho = '<div class="hang nho">' + o(' ', 'dau');
    for (let i = 0; i < soCot; i++) {
      let chu = ' ';
      if (cot.nho && cot.phep === '+' && i === soCot - 2 - vi) chu = '1';
      if (cot.nho && cot.phep === '-' && i === soCot - 1 - vi) chu = '1';
      nho += o(chu, chu !== ' ' ? 'cam' : '');
    }
    nho += '</div>';
    const duoi = cot.nho && cot.phep === '-'
      ? hang(cot.duoi, TRU, function (i) { return i === soCot - 2 - vi ? 'co-nho' : ''; })
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
    if (!ct || ct.loai || Array.isArray(ct.phep) || ct.an !== 'ket_qua' || (ct.phep !== '+' && ct.phep !== '-')) return null;
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

  /** Mô hình khối như SGK: tấm trăm, thanh chục, khối đơn vị (khoi: { tram, chuc, dv }). */
  function khoiSo(khoi, nho) {
    let h = '<div class="mo-hinh' + (nho ? ' nho' : '') + '" aria-label="' + esc((khoi.tram ? khoi.tram + ' trăm, ' : '') + khoi.chuc + ' chục, ' + khoi.dv + ' đơn vị') + '">';
    const nhom = function (lop, n, ten) {
      let s = '<span class="mh-nhom"><span class="mh-khoi">';
      for (let i = 0; i < n; i++) s += '<i class="kh ' + lop + '"></i>';
      return s + '</span><small>' + n + ' ' + ten + '</small></span>';
    };
    if (khoi.tram) h += nhom('kh-tram', khoi.tram, 'trăm');
    h += nhom('kh-chuc', khoi.chuc || 0, 'chục');
    h += nhom('kh-dv', khoi.dv || 0, 'đơn vị');
    return h + '</div>';
  }

  /**
   * Nội dung chính: lời gọi tên lỗi, lời giải.
   * kq: { loi, loiNoi, chonHien (chữ hiện cho đáp án bé chọn), moDau (mặc định "Con chọn") }
   */
  function noiDung(q, giaTri, kq) {
    const coTen = kq.loi && kq.loi.length && kq.loi[0] !== 'khac';
    const lg = q.loi_giai || {};
    const chon = kq.chonHien != null ? kq.chonHien : q.cau_truc && window.NganHang && window.NganHang.hienGiaTriCau ? window.NganHang.hienGiaTriCau(q.cau_truc, giaTri) : hienGiaTri(giaTri);
    let h = '<h2>' + (coTen ? 'Gần đúng rồi!' : 'Mình cùng xem nhé!') + '</h2>';
    const loiNoi = String(kq.loiNoi || '').replace(/[.!\s]+$/, '');
    // Lời đã kết bằng "nhé" thì không thêm ", mình cùng xem nhé" để khỏi lặp
    const duoi = coTen && !/nhé$/.test(loiNoi) ? ', mình cùng xem nhé.' : '.';
    h += '<p class="ph-loi">' + esc(kq.moDau || 'Con chọn') + ' <b>' + esc(chon) + '</b>. ' + esc(loiNoi) + duoi + '</p>';
    h += '<div class="ph-giai">';
    if (lg.cot) h += cotDoc(lg.cot);
    if (lg.khoi) h += khoiSo(lg.khoi, true);
    if (lg.html) h += '<div class="ph-hinh-giai">' + lg.html + '</div>'; // hình minh họa do ngân hàng câu dựng (không chứa dữ liệu người dùng)
    h += '<ol class="ph-buoc">' + (lg.buoc || []).map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ol>';
    h += '</div>';
    h += '<p class="ph-ket">' + esc(q.ket_luan || ('Vậy ' + q.de.replace('?', String(q.dap_an)))) + '</p>';
    return h;
  }

  window.PhanHoi = { cotDoc: cotDoc, queTinh: queTinh, khoiSo: khoiSo, noiDung: noiDung, esc: esc };
})();
