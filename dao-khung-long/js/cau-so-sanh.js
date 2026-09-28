/* ============================================================
   cau-so-sanh.js – Câu hỏi so sánh, xếp thứ tự số (2.2, 2.6) và tia số, dãy số đếm thêm (2.1)
   Cắm vào NganHang bằng dangKyLoai, dùng cho Chém Trái Cây, Bắn Thiên Thạch, Mê Cung, Cưỡi Hổ và Đấu Trường.
   - Loại 'so_sanh': kieu 'dau' (45 ? 54, đáp án '<' '>' '='), 'lon_nhat', 'be_nhat' (chọn một số),
     'xep' (xếp 4 số, đáp án '26,60,62,66'), 'giua' (47 < ? < 49).
     kieu 'dau_bt' (so sánh biểu thức với một số như SGK Bài 10, 14: 9 + 5 ? 13; { phep, so: [9, 5], b: 13 }), do bộ sinh
     cong-qua-10, tru-qua-10 dựng khi mục câu của màn có cach 'so_sanh' (ngan-hang.js).
   - Loại 'tia_so': kieu 'tia' (tia số có vạch, số ở chỗ dấu ?), 'day' (dãy đếm thêm, đếm lùi).
   Mã lỗi theo 03a mục 2.1, 2.2, 2.6: so-chu-so (so hàng đơn vị trước, không đếm số chữ số), chieu-dau
   (dấu ngược, xếp ngược chiều), thieu-0 (coi 500 = 50, vạch 10 coi là 1), dem-lech, qua-chuc; chua-tinh (so biểu thức
   khi chưa tính: lấy số đầu của biểu thức so với số kia).
   ============================================================ */
(function () {
  'use strict';

  const NH = window.NganHang;
  const nn = NH.nn, chon = NH.chon, tron = NH.tron;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function dau(a, b) { return a < b ? '<' : a > b ? '>' : '='; }
  function nguoc(d) { return d === '<' ? '>' : d === '>' ? '<' : '='; }
  function chuanDau(v) {
    const s = String(v == null ? '' : v).trim();
    if (s === '<' || s === '&lt;' || s === 'be_hon') return '<';
    if (s === '>' || s === '&gt;' || s === 'lon_hon') return '>';
    if (s === '=' || s === 'bang') return '=';
    return s;
  }
  function tenDau(d) { return d === '<' ? 'bé hơn' : d === '>' ? 'lớn hơn' : 'bằng'; }
  function tenHang(i, soCs) { return ['đơn vị', 'chục', 'trăm', 'nghìn'][soCs - 1 - i] || ''; }

  /** Dấu bé sẽ điền nếu so hàng đơn vị trước (cùng số chữ số) hoặc so chữ số đầu mà không đếm số chữ số. */
  function dauBay(a, b) {
    const sa = String(a), sb = String(b);
    if (sa.length !== sb.length) return dau(Number(sa[0]), Number(sb[0])) === '=' ? dau(sa.length, sb.length) : dau(Number(sa[0]), Number(sb[0]));
    for (let i = sa.length - 1; i >= 0; i--) if (sa[i] !== sb[i]) return dau(Number(sa[i]), Number(sb[i]));
    return '=';
  }
  function laBay(a, b) { const t = dauBay(a, b); return t !== '=' && t !== dau(a, b); }
  /** So như bé so hàng thấp trước: dùng để sắp một dãy theo cách sai. */
  function soBay(x, y) { const t = dauBay(x, y); return t === '<' ? -1 : t === '>' ? 1 : 0; }

  function xepDung(ds, chieu) { return ds.slice().sort(function (x, y) { return chieu === 'giam' ? y - x : x - y; }); }
  function chuoiDs(ds) { return ds.join(','); }
  function docDs(v) {
    if (Array.isArray(v)) return v.map(Number);
    return String(v == null ? '' : v).split(/[,\s]+/).filter(Boolean).map(Number);
  }

  /* ---------------- Loại 'so_sanh' ---------------- */

  NH.themLoi('chua-tinh', { be: 'Tính kết quả phép tính trước rồi mới so sánh nhé', mo_ta: 'So sánh biểu thức với một số khi chưa tính: lấy số đầu tiên của biểu thức so với số kia (9 + 5 ? 13 điền < vì 9 < 13)', ngan: 'Con hay so sánh khi chưa tính' });

  function giaTriBT(ct) { return ct.phep === '+' ? ct.so[0] + ct.so[1] : ct.so[0] - ct.so[1]; }
  function bieuBT(ct) { return ct.so[0] + ' ' + (ct.phep === '+' ? '+' : NH.TRU) + ' ' + ct.so[1]; }

  function tinhSS(ct) {
    if (ct.kieu === 'dau') return dau(ct.a, ct.b);
    if (ct.kieu === 'dau_bt') return dau(giaTriBT(ct), ct.b);
    if (ct.kieu === 'lon_nhat') return Math.max.apply(null, ct.ds);
    if (ct.kieu === 'be_nhat') return Math.min.apply(null, ct.ds);
    if (ct.kieu === 'giua') return (ct.a + ct.b) / 2;
    return chuoiDs(xepDung(ct.ds, ct.chieu));
  }

  function deSS(ct) {
    if (ct.kieu === 'dau') return ct.a + ' ? ' + ct.b;
    if (ct.kieu === 'dau_bt') return bieuBT(ct) + ' ? ' + ct.b;
    if (ct.kieu === 'lon_nhat') return 'Số nào lớn nhất: ' + ct.ds.join(', ') + '?';
    if (ct.kieu === 'be_nhat') return 'Số nào bé nhất: ' + ct.ds.join(', ') + '?';
    if (ct.kieu === 'giua') return ct.a + ' < ? < ' + ct.b;
    return 'Xếp ' + ct.ds.join(', ') + ' theo thứ tự từ ' + (ct.chieu === 'giam' ? 'lớn đến bé' : 'bé đến lớn');
  }

  function deDocSS(ct) {
    if (ct.kieu === 'dau') return 'So sánh ' + ct.a + ' và ' + ct.b + '. ' + ct.a + ' lớn hơn, bé hơn hay bằng ' + ct.b + '?';
    if (ct.kieu === 'dau_bt') {
      const doc = ct.so[0] + (ct.phep === '+' ? ' cộng ' : ' trừ ') + ct.so[1];
      return 'So sánh ' + doc + ' với ' + ct.b + '. ' + doc + ' lớn hơn, bé hơn hay bằng ' + ct.b + '?';
    }
    if (ct.kieu === 'lon_nhat') return 'Trong các số ' + ct.ds.join(', ') + ', số nào lớn nhất?';
    if (ct.kieu === 'be_nhat') return 'Trong các số ' + ct.ds.join(', ') + ', số nào bé nhất?';
    if (ct.kieu === 'giua') return 'Số nào lớn hơn ' + ct.a + ' và bé hơn ' + ct.b + '?';
    return deSS(ct);
  }

  function maSS(ct) {
    if (ct.kieu === 'dau') return 'dau:' + ct.a + ',' + ct.b;
    if (ct.kieu === 'dau_bt') return 'dau_bt:' + ct.so[0] + (ct.phep === '+' ? '+' : '-') + ct.so[1] + ',' + ct.b;
    if (ct.kieu === 'giua') return 'giua:' + ct.a + ',' + ct.b;
    if (ct.kieu === 'xep') return 'xep-' + (ct.chieu === 'giam' ? 'giam' : 'tang') + ':' + ct.ds.join(',');
    return (ct.kieu === 'lon_nhat' ? 'lon' : 'be') + ':' + ct.ds.join(',');
  }

  function loiChonMot(ct, v) {
    const d = tinhSS(ct);
    const ma = [];
    const lon = ct.kieu === 'lon_nhat';
    const khac = ct.ds.filter(function (x) { return x !== d; });
    if (khac.indexOf(v) < 0) return ['khac'];
    // bé chọn số "thắng" nếu so hàng thấp trước (hoặc so chữ số đầu khi khác số chữ số)
    const theoBay = ct.ds.slice().sort(function (x, y) { return lon ? -soBay(x, y) : soBay(x, y); })[0];
    if (v === theoBay) ma.push('so-chu-so');
    const nguocChieu = lon ? Math.min.apply(null, ct.ds) : Math.max.apply(null, ct.ds);
    if (!ma.length && v === nguocChieu) ma.push('chieu-dau');
    if (!ma.length) ma.push('khac');
    return ma;
  }

  function nhanBietLoiSS(ct, v) {
    const d = tinhSS(ct);
    if (ct.kieu === 'dau_bt') {
      const x = chuanDau(v);
      if (x === d) return [];
      if (x !== '<' && x !== '>' && x !== '=') return ['khac'];
      const ma = [];
      if (x === dau(ct.so[0], ct.b)) ma.push('chua-tinh');
      if (x === '=' && Math.abs(giaTriBT(ct) - ct.b) === 1) ma.push('dem-lech');
      if (d !== '=' && x === nguoc(d)) ma.push('chieu-dau');
      return ma.length ? ma : ['khac'];
    }
    if (ct.kieu === 'dau') {
      const x = chuanDau(v);
      if (x === d) return [];
      if (x !== '<' && x !== '>' && x !== '=') return ['khac'];
      if (x === '=' && (ct.a === ct.b * 10 || ct.b === ct.a * 10)) return ['thieu-0'];
      // 45 > 54: hai số đảo chữ số cho nhau, 03a xếp vào nhầm chiều dấu; các cặp bẫy khác (29 và 31, 99 và 100) là so-chu-so
      const daoChuSo = String(ct.a).split('').reverse().join('') === String(ct.b);
      if (laBay(ct.a, ct.b) && x === dauBay(ct.a, ct.b) && !daoChuSo) return ['so-chu-so'];
      if (d !== '=' && x === nguoc(d)) return ['chieu-dau'];
      return ['khac'];
    }
    if (ct.kieu === 'giua') {
      const n = Number(v);
      if (n === d) return [];
      if (n === ct.a - 1 || n === ct.b + 1 || n === ct.a || n === ct.b) return ['dem-lech'];
      return ['khac'];
    }
    if (ct.kieu === 'xep') {
      const ds = docDs(v);
      if (chuoiDs(ds) === d) return [];
      if (ds.length !== ct.ds.length) return ['khac'];
      if (chuoiDs(ds) === chuoiDs(xepDung(ct.ds, ct.chieu === 'giam' ? 'tang' : 'giam'))) return ['chieu-dau'];
      const bay = ct.ds.slice().sort(function (x, y) { return ct.chieu === 'giam' ? -soBay(x, y) : soBay(x, y); });
      if (chuoiDs(ds) === chuoiDs(bay)) return ['so-chu-so'];
      return ['khac'];
    }
    const n = Number(v);
    if (n === d) return [];
    return loiChonMot(ct, n);
  }

  function loiNoiSS(ct, v, maLoi) {
    const m = (maLoi && maLoi[0]) || 'khac';
    if (ct.kieu === 'dau_bt') {
      if (m === 'chua-tinh') return 'Tính ' + bieuBT(ct) + ' = ' + giaTriBT(ct) + ' trước, rồi mới so sánh với ' + ct.b;
      if (m === 'dem-lech') return 'Con tính lại ' + bieuBT(ct) + ' nhé';
      if (m === 'chieu-dau') return 'Dấu mở miệng về phía số lớn hơn';
      return 'Chưa đúng rồi';
    }
    const soCs = String(Math.max(ct.a || 0, ct.b || 0, Math.max.apply(null, ct.ds || [0]))).length;
    if (m === 'so-chu-so') return soCs >= 3 ? 'So hàng trăm trước, rồi hàng chục, hàng đơn vị so sau cùng' : 'So hàng chục trước, hàng chục bằng nhau mới so hàng đơn vị';
    if (m === 'chieu-dau') return ct.kieu === 'dau' ? 'Dấu mở miệng về phía số lớn hơn' : ct.kieu === 'xep' ? 'Con xếp ngược chiều rồi' : 'Con chọn ngược rồi: đề hỏi số ' + (ct.kieu === 'lon_nhat' ? 'lớn nhất' : 'bé nhất');
    if (m === 'thieu-0') return 'Hai số này khác nhau: một số có thêm chữ số 0';
    if (m === 'dem-lech') return 'Số ở giữa phải lớn hơn ' + ct.a + ' và bé hơn ' + ct.b;
    return 'Chưa đúng rồi';
  }

  function cachSo(a, b) {
    const sa = String(a), sb = String(b);
    if (sa.length !== sb.length) return [a + ' có ' + sa.length + ' chữ số, ' + b + ' có ' + sb.length + ' chữ số', 'Số nào nhiều chữ số hơn thì lớn hơn'];
    for (let i = 0; i < sa.length; i++) {
      if (sa[i] !== sb[i]) {
        const h = tenHang(i, sa.length);
        const buoc = [];
        if (i > 0) buoc.push('Các hàng lớn hơn bằng nhau');
        buoc.push('So hàng ' + h + ': ' + sa[i] + ' ' + (sa[i] < sb[i] ? '<' : '>') + ' ' + sb[i]);
        return buoc;
      }
    }
    return ['Hai số giống hệt nhau'];
  }

  function goiYSS(ct) {
    if (ct.kieu === 'dau_bt') return ['Tính ' + bieuBT(ct) + ' trước.', bieuBT(ct) + ' = ' + giaTriBT(ct) + '.', 'So sánh ' + giaTriBT(ct) + ' với ' + ct.b + '. Dấu mở miệng về phía số lớn hơn.'];
    if (ct.kieu === 'dau') {
      const soCs = String(Math.max(ct.a, ct.b)).length;
      return [
        'Số nào có nhiều chữ số hơn thì lớn hơn. Cùng số chữ số thì so từ hàng lớn nhất.',
        soCs >= 3 ? 'So hàng trăm trước, rồi mới tới hàng chục.' : 'So hàng chục trước: ' + Math.floor(ct.a / 10) + ' chục và ' + Math.floor(ct.b / 10) + ' chục.',
        'Dấu mở miệng về phía số lớn hơn, như cá sấu há miệng đớp số lớn.'
      ];
    }
    if (ct.kieu === 'giua') return ['Số ở giữa lớn hơn ' + ct.a + ' và bé hơn ' + ct.b + '.', 'Đếm tiếp từ ' + ct.a + '.', 'Số liền sau của ' + ct.a + ' là số nào?'];
    const lon = ct.kieu === 'lon_nhat' || (ct.kieu === 'xep' && ct.chieu === 'giam');
    return [
      'Số nào nhiều chữ số hơn thì lớn hơn. Cùng số chữ số thì so từ hàng lớn nhất.',
      'Nhìn hàng ' + (String(Math.max.apply(null, ct.ds)).length >= 3 ? 'trăm' : 'chục') + ' của từng số trước.',
      ct.kieu === 'xep' ? 'Tìm số ' + (lon ? 'lớn' : 'bé') + ' nhất đặt đầu tiên, rồi tìm tiếp trong các số còn lại.' : 'Loại dần từng số: số nào ' + (lon ? 'bé' : 'lớn') + ' hơn một số khác thì không phải.'
    ];
  }

  function loiGiaiSS(ct) {
    const d = tinhSS(ct);
    if (ct.kieu === 'dau') return { ma: 'so-sanh-hang', buoc: cachSo(ct.a, ct.b).concat(['Vậy ' + ct.a + ' ' + d + ' ' + ct.b]), kq: d };
    if (ct.kieu === 'dau_bt') return { ma: 'so-sanh-bieu-thuc', buoc: [bieuBT(ct) + ' = ' + giaTriBT(ct), giaTriBT(ct) + ' ' + d + ' ' + ct.b, 'Vậy ' + bieuBT(ct) + ' ' + d + ' ' + ct.b], kq: d };
    if (ct.kieu === 'giua') return { ma: 'so-o-giua', buoc: [ct.a + ', ' + d + ', ' + ct.b + ' là ba số liền nhau', ct.a + ' < ' + d + ' < ' + ct.b], kq: d };
    if (ct.kieu === 'xep') {
      const x = xepDung(ct.ds, ct.chieu);
      return { ma: 'xep-thu-tu', buoc: ['So từ hàng lớn nhất của từng số', 'Từ ' + (ct.chieu === 'giam' ? 'lớn đến bé' : 'bé đến lớn') + ': ' + x.join(', ')], kq: d };
    }
    const khac = ct.ds.filter(function (x) { return x !== d; });
    const lon = ct.kieu === 'lon_nhat';
    return { ma: 'so-lon-be-nhat', buoc: khac.map(function (x) { return d + ' ' + (lon ? '>' : '<') + ' ' + x; }).concat(['Vậy số ' + (lon ? 'lớn' : 'bé') + ' nhất là ' + d]), kq: d };
  }

  function ketLuanSS(ct) {
    const d = tinhSS(ct);
    if (ct.kieu === 'dau') return 'Vậy ' + ct.a + ' ' + d + ' ' + ct.b + ' (' + ct.a + ' ' + tenDau(d) + ' ' + ct.b + ')';
    if (ct.kieu === 'dau_bt') return 'Vậy ' + bieuBT(ct) + ' ' + d + ' ' + ct.b + ' (vì ' + giaTriBT(ct) + ' ' + tenDau(d) + ' ' + ct.b + ')';
    if (ct.kieu === 'xep') return 'Vậy xếp được: ' + xepDung(ct.ds, ct.chieu).join(', ');
    if (ct.kieu === 'giua') return 'Vậy ' + ct.a + ' < ' + d + ' < ' + ct.b;
    return 'Vậy số ' + (ct.kieu === 'lon_nhat' ? 'lớn' : 'bé') + ' nhất là ' + d;
  }

  function taoNhieuSS(kyNang, ct, rng) {
    const d = tinhSS(ct);
    let ds;
    if (ct.kieu === 'dau' || ct.kieu === 'dau_bt') ds = ['<', '>', '='].filter(function (x) { return x !== d; });
    else if (ct.kieu === 'lon_nhat' || ct.kieu === 'be_nhat') ds = ct.ds.filter(function (x) { return x !== d; });
    else if (ct.kieu === 'giua') ds = [ct.a, ct.b + 1].filter(function (x) { return x !== d; });
    else {
      const nguocChieu = chuoiDs(xepDung(ct.ds, ct.chieu === 'giam' ? 'tang' : 'giam'));
      const bay = chuoiDs(ct.ds.slice().sort(function (x, y) { return ct.chieu === 'giam' ? -soBay(x, y) : soBay(x, y); }));
      ds = [nguocChieu];
      if (bay !== d && bay !== nguocChieu) ds.push(bay);
      else {
        const lech = xepDung(ct.ds, ct.chieu);
        const t = lech[1]; lech[1] = lech[2]; lech[2] = t;
        ds.push(chuoiDs(lech));
      }
    }
    return tron(rng, ds).map(function (v) { return { gia_tri: v, loi: nhanBietLoiSS(ct, v) }; });
  }

  function hienSS(v, ct) {
    if (ct && ct.kieu === 'xep') return docDs(v).join(', ');
    return String(v);
  }

  NH.dangKyLoai('so_sanh', {
    tinh: tinhSS, de: deSS, deDoc: deDocSS, deChuanHoa: maSS, nhanBietLoi: nhanBietLoiSS, loiNoi: loiNoiSS,
    goiY: goiYSS, loiGiai: loiGiaiSS, ketLuan: ketLuanSS, taoNhieu: taoNhieuSS, hienGiaTri: hienSS,
    theChu: function (ct) { return ct.kieu === 'dau' ? ct.a + ' ? ' + ct.b : deSS(ct); },
    dang: function (ct) { return ct.kieu === 'xep' ? 'sap_xep' : 'chon_dap_an'; },
    veLuaChon: function (ct, v) { return { nhan: hienSS(v, ct) }; }
  });

  /* ---------------- Sinh câu so sánh ---------------- */

  /** Một cặp số có hai chữ số; bay: cặp bẫy hàng đơn vị (29 và 31) hoặc có 100. */
  function capHai(rng, bay) {
    if (bay) {
      if (rng() < 0.25) return rng() < 0.5 ? [100, nn(rng, 90, 99)] : [nn(rng, 90, 99), 100];
      const t = nn(rng, 1, 8);
      const a = t * 10 + nn(rng, 5, 9), b = (t + nn(rng, 1, 2)) * 10 + nn(rng, 0, 4);
      return rng() < 0.5 ? [a, b] : [b, a];
    }
    for (;;) {
      const a = nn(rng, 10, 99), b = rng() < 0.3 ? Math.floor(a / 10) * 10 + nn(rng, 0, 9) : nn(rng, 10, 99);
      if (a !== b) return [a, b];
    }
  }
  /** Một cặp số có ba chữ số; bẫy cùng hàng trăm (305 và 350) hoặc khác số chữ số (99 và 100, 1000 và 999). */
  function capBa(rng, bay) {
    if (bay) {
      const r = rng();
      if (r < 0.3) { const p = chon(rng, [[99, 100], [999, 1000], [nn(rng, 10, 99), nn(rng, 100, 199)]]); return rng() < 0.5 ? p : [p[1], p[0]]; }
      const h = nn(rng, 1, 9);
      if (r < 0.65) { const c = nn(rng, 0, 4), u = nn(rng, 5, 9); const a = h * 100 + c * 10 + u, b = h * 100 + (c + nn(rng, 1, 4)) * 10 + nn(rng, 0, u - 1); return rng() < 0.5 ? [a, b] : [b, a]; }
      const a2 = h * 100 + nn(rng, 5, 9) * 10 + nn(rng, 5, 9), b2 = Math.min(9, h + 1) * 100 + nn(rng, 0, 4) * 10 + nn(rng, 0, 4);
      if (a2 < b2) return rng() < 0.5 ? [a2, b2] : [b2, a2];
    }
    for (;;) {
      const a = nn(rng, 100, 999), b = rng() < 0.4 ? Math.floor(a / 100) * 100 + nn(rng, 0, 99) : nn(rng, 100, 999);
      if (a !== b) return [a, b];
    }
  }
  function nhomSo(rng, n, baCs) {
    for (let thu = 0; thu < 200; thu++) {
      const ds = [];
      const coBay = rng() < 0.6;
      if (coBay) { const p = baCs ? capBa(rng, true) : capHai(rng, true); ds.push(p[0], p[1]); }
      while (ds.length < n) {
        const x = baCs ? nn(rng, 100, 999) : nn(rng, 10, 99);
        if (ds.indexOf(x) < 0) ds.push(x);
      }
      const d = tron(rng, ds);
      if (new Set(d).size === n) return d;
    }
    return baCs ? [123, 132, 213, 231] : [12, 21, 31, 13];
  }

  function sinhSoSanh(baCs) {
    return function (rng, muc) {
      const cach = NH.chonTheoTrongSo(rng, ((muc && muc.cach) || ['dau', 'dau', 'dau', 'lon_nhat', 'be_nhat', 'giua']).map(function (c) { return { c: c, w: 1 }; })).c;
      if (cach === 'dau') {
        if (rng() < 0.06) { const x = baCs ? nn(rng, 100, 999) : nn(rng, 10, 99); return { loai: 'so_sanh', kieu: 'dau', a: x, b: x }; }
        if (baCs && rng() < 0.08) { const t = nn(rng, 1, 9) * 100; return rng() < 0.5 ? { loai: 'so_sanh', kieu: 'dau', a: t, b: t / 10 } : { loai: 'so_sanh', kieu: 'dau', a: t / 10, b: t }; }
        const p = baCs ? capBa(rng, rng() < 0.45) : capHai(rng, rng() < 0.4);
        return { loai: 'so_sanh', kieu: 'dau', a: p[0], b: p[1] };
      }
      if (cach === 'giua') {
        const a = baCs ? nn(rng, 100, 997) : nn(rng, 10, 97);
        return { loai: 'so_sanh', kieu: 'giua', a: a, b: a + 2 };
      }
      if (cach === 'xep') return { loai: 'so_sanh', kieu: 'xep', ds: nhomSo(rng, 4, baCs), chieu: rng() < 0.65 ? 'tang' : 'giam' };
      return { loai: 'so_sanh', kieu: cach, ds: nhomSo(rng, (muc && muc.so_luong) || 3, baCs) };
    };
  }

  NH.themKyNang('so-sanh-100', { noi_dung: '2.2', ten: 'So sánh, xếp thứ tự các số đến 100', kieu: 'K3', giay: 7, gioi_han: 100, loai: 'so_sanh', sinh: sinhSoSanh(false) });
  NH.themKyNang('so-sanh-1000', { noi_dung: '2.6', ten: 'So sánh, xếp thứ tự các số đến 1000', kieu: 'K3', giay: 8, gioi_han: 1000, loai: 'so_sanh', sinh: sinhSoSanh(true) });

  /* ---------------- Loại 'tia_so': tia số và dãy đếm thêm ---------------- */

  function soCua(ct, i) { return ct.dau + i * ct.buoc; }
  function tinhTS(ct) { return soCua(ct, ct.an); }

  function deTS(ct) {
    if (ct.kieu === 'tia') return 'Số nào ở chỗ dấu ? trên tia số?';
    const ds = [];
    for (let i = 0; i < ct.n; i++) ds.push(i === ct.an ? '?' : soCua(ct, i));
    return ds.join(', ');
  }
  function deDocTS(ct) {
    if (ct.kieu === 'tia') return 'Trên tia số, mỗi vạch cách nhau ' + Math.abs(ct.buoc) + '. Số nào ở chỗ dấu hỏi?';
    const ds = [];
    for (let i = 0; i < ct.n; i++) ds.push(i === ct.an ? 'mấy' : soCua(ct, i));
    return (ct.buoc > 0 ? 'Đếm thêm ' + ct.buoc : 'Đếm lùi ' + (-ct.buoc)) + ': ' + ds.join(', ');
  }
  function maTS(ct) { return ct.kieu + ':' + ct.dau + ',' + ct.buoc + ',' + ct.n + ',' + ct.an; }

  function nhanBietLoiTS(ct, v) {
    v = Number(v);
    const d = tinhTS(ct);
    if (v === d) return [];
    const ma = [];
    const b = Math.abs(ct.buoc);
    const truoc = ct.an > 0 ? soCua(ct, ct.an - 1) : null;
    // qua chục: 37, 38, 39, ? mà nói 30 hay 310; đếm lùi 30, 29 rồi nói 20 (v = đ − 9)
    if (truoc != null && Math.abs(ct.buoc) < 10 && Math.floor(truoc / 10) !== Math.floor(d / 10)) {
      if (ct.buoc > 0 && (v === d - 10 || v === Number(String(Math.floor(truoc / 10)) + String(d % 10 === 0 ? 10 : d % 10)))) ma.push('qua-chuc');
      if (ct.buoc < 0 && v === d - 9) ma.push('qua-chuc');
    }
    if (b === 10 && d % 10 === 0 && v * 10 === d) ma.push('thieu-0');
    if (!ma.length && (v === d + ct.buoc || v === d - ct.buoc || v === d + 1 || v === d - 1)) ma.push('dem-lech');
    if (!ma.length) ma.push('khac');
    return ma;
  }
  function loiNoiTS(ct, v, maLoi) {
    const m = (maLoi && maLoi[0]) || 'khac';
    const b = Math.abs(ct.buoc);
    if (m === 'qua-chuc') return ct.buoc > 0 ? 'Qua 9 là sang chục mới' : 'Đếm lùi qua chục thì số tròn chục đứng trước số có 9 đơn vị';
    if (m === 'thieu-0') return 'Mỗi vạch là ' + b + ', không phải 1';
    if (m === 'dem-lech') return b === 1 ? 'Con đếm lệch một chút rồi' : 'Mỗi lần ' + (ct.buoc > 0 ? 'thêm ' : 'bớt ') + b + ' nhé';
    return 'Chưa đúng rồi';
  }
  function goiYTS(ct) {
    const b = Math.abs(ct.buoc);
    const tr = ct.an > 0 ? soCua(ct, ct.an - 1) : soCua(ct, ct.an + 1);
    return [
      ct.kieu === 'tia' ? 'Xem hai vạch cạnh nhau cách nhau bao nhiêu.' : 'Xem hai số cạnh nhau hơn kém nhau bao nhiêu.',
      'Mỗi lần ' + (ct.buoc > 0 ? 'thêm ' : 'bớt ') + b + '.',
      ct.an > 0 ? tr + (ct.buoc > 0 ? ' + ' : ' − ') + b + ' = ?' : 'Số sau nó là ' + tr + ', đếm ngược lại ' + b + '.'
    ];
  }
  function loiGiaiTS(ct) {
    const d = tinhTS(ct);
    const b = Math.abs(ct.buoc);
    const buoc = ['Mỗi ' + (ct.kieu === 'tia' ? 'vạch' : 'số') + ' ' + (ct.buoc > 0 ? 'hơn' : 'kém') + ' số trước nó ' + b];
    if (ct.an > 0) buoc.push(soCua(ct, ct.an - 1) + (ct.buoc > 0 ? ' + ' : ' − ') + b + ' = ' + d);
    else buoc.push(soCua(ct, 1) + (ct.buoc > 0 ? ' − ' : ' + ') + b + ' = ' + d);
    return { ma: 'dem-them', buoc: buoc, html: ct.kieu === 'tia' ? veTia(ct, true) : '', kq: d };
  }

  /** Tia số SVG: vạch đều, số dưới vạch, chỗ ? tô cam. hienDapAn: điền đáp án vào chỗ ? */
  function veTia(ct, hienDapAn) {
    const n = ct.n;
    const w = 640, h = 120, l = 40, r = 600;
    const gap = (r - l) / (n - 1);
    let s = '<svg class="tia-so" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Tia số" xmlns="http://www.w3.org/2000/svg">';
    s += '<line x1="16" y1="50" x2="' + (w - 10) + '" y2="50" stroke="#3b2f63" stroke-width="5" stroke-linecap="round"/>';
    s += '<path d="M' + (w - 26) + ' 38 L' + (w - 6) + ' 50 L' + (w - 26) + ' 62 Z" fill="#3b2f63"/>';
    for (let i = 0; i < n; i++) {
      const x = l + i * gap;
      const la = i === ct.an;
      const an = !la && ct.an_so && ct.an_so.indexOf(i) >= 0;
      s += '<line x1="' + x + '" y1="36" x2="' + x + '" y2="64" stroke="#3b2f63" stroke-width="4" stroke-linecap="round"/>';
      if (la) {
        s += '<rect x="' + (x - 34) + '" y="72" width="68" height="40" rx="12" fill="' + (hienDapAn ? '#06d6a0' : '#ff8a1f') + '"/>';
        s += '<text x="' + x + '" y="101" text-anchor="middle" font-size="28" font-weight="800" fill="#fff" font-family="Baloo 2, Arial Rounded MT Bold, sans-serif">' + (hienDapAn ? tinhTS(ct) : '?') + '</text>';
        s += '<circle cx="' + x + '" cy="50" r="9" fill="' + (hienDapAn ? '#06d6a0' : '#ff8a1f') + '"/>';
      } else if (!an) {
        s += '<text x="' + x + '" y="101" text-anchor="middle" font-size="26" font-weight="700" fill="#221a3b" font-family="Baloo 2, Arial Rounded MT Bold, sans-serif">' + esc(soCua(ct, i)) + '</text>';
      }
    }
    return s + '</svg>';
  }

  function ungVienTS(kyNang, ct) {
    const d = tinhTS(ct);
    const ds = [{ v: d + ct.buoc, w: 2 }, { v: d - ct.buoc, w: 1.5 }];
    if (Math.abs(ct.buoc) > 1) { ds.push({ v: d + 1, w: 1.5 }); ds.push({ v: d - 1, w: 1 }); }
    if (Math.abs(ct.buoc) === 10 && d % 10 === 0) ds.push({ v: d / 10, w: 2 });
    const truoc = ct.an > 0 ? soCua(ct, ct.an - 1) : null;
    if (truoc != null && Math.abs(ct.buoc) < 10 && Math.floor(truoc / 10) !== Math.floor(d / 10)) {
      if (ct.buoc > 0) { ds.push({ v: d - 10, w: 3 }); ds.push({ v: Number(String(Math.floor(truoc / 10)) + String(d % 10 === 0 ? 10 : d % 10)), w: 1 }); }
      else ds.push({ v: d - 9, w: 3 });
    }
    return ds;
  }

  NH.dangKyLoai('tia_so', {
    tinh: tinhTS, de: deTS, deDoc: deDocTS, deChuanHoa: maTS, nhanBietLoi: nhanBietLoiTS, loiNoi: loiNoiTS,
    goiY: goiYTS, loiGiai: loiGiaiTS, ungVienNhieu: ungVienTS,
    ketLuan: function (ct) { return 'Vậy số ở chỗ dấu ? là ' + tinhTS(ct); },
    theChu: function (ct) { return ct.kieu === 'day' ? deTS(ct) : 'Tia số ' + soCua(ct, 0) + ' … ' + soCua(ct, ct.n - 1); },
    veHinh: function (ct) { return ct.kieu === 'tia' ? veTia(ct, false) : ''; }
  });

  /** Tia số, dãy đếm thêm 1, 2, 5, 10 và đếm lùi 1 trong phạm vi 100; khoảng 35% câu qua chục (03a mục 2.1). */
  function sinhTiaSo(rng, muc) {
    const kieu = NH.chonTheoTrongSo(rng, ((muc && muc.cach) || ['tia', 'tia', 'day']).map(function (c) { return { c: c, w: 1 }; })).c;
    const buoc = NH.chonTheoTrongSo(rng, [{ b: 1, w: 3 }, { b: 2, w: 2 }, { b: 5, w: 2 }, { b: 10, w: 2 }, { b: -1, w: kieu === 'day' ? 2 : 0 }]).b;
    const n = kieu === 'tia' ? 6 : 5;
    for (let thu = 0; thu < 100; thu++) {
      let dau;
      if (Math.abs(buoc) === 10) dau = nn(rng, 0, 4) * 10 + (rng() < 0.3 ? 5 : 0);
      else if (buoc === 5) dau = nn(rng, 0, 14) * 5;
      else if (buoc === 2) dau = nn(rng, 0, 45) * 2;
      else if (buoc === 1) dau = nn(rng, 1, 94);
      else dau = nn(rng, 6, 99);
      const an = nn(rng, kieu === 'tia' ? 1 : 1, n - 1);
      const ct = { loai: 'tia_so', kieu: kieu, dau: dau, buoc: buoc, n: n, an: an };
      const cuoi = soCua(ct, n - 1);
      if (cuoi < 0 || cuoi > 100) continue;
      const d = tinhTS(ct), truoc = soCua(ct, an - 1);
      const quaChuc = Math.floor(truoc / 10) !== Math.floor(d / 10);
      if (Math.abs(buoc) === 1 && !quaChuc && rng() < 0.45) continue;
      if (kieu === 'tia' && rng() < 0.3 && Math.abs(buoc) !== 1) ct.an_so = [nn(rng, 1, n - 2)].filter(function (i) { return i !== an; });
      if (ct.an_so && !ct.an_so.length) delete ct.an_so;
      return ct;
    }
    return { loai: 'tia_so', kieu: 'tia', dau: 36, buoc: 1, n: 6, an: 4 };
  }

  NH.themKyNang('tia-so-100', { noi_dung: '2.1', ten: 'Tia số, đếm thêm trong phạm vi 100', kieu: 'K3', giay: 8, gioi_han: 100, nhieu_toi_da: 999, loai: 'tia_so', sinh: sinhTiaSo });

  window.CauSoSanh = { dauBay: dauBay, laBay: laBay, veTia: veTia };
})();
