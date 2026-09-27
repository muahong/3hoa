/* ============================================================
   bai-hoc.js – Bài học 30 giây: chỉ hiện khi bé gặp nội dung mới, dạy đúng trình tự SGK Toán 2
   - phep-nhan (Bài 37): mỗi đĩa 2 quả cam, 3 đĩa: 2 + 2 + 2 = 6 rồi mới 2 × 3 = 6 ("2 được lấy 3 lần").
   - phep-chia (Bài 41): chia đều 6 quả vào 3 đĩa (6 : 3 = 2), chia theo nhóm mỗi đĩa 2 quả (6 : 2 = 3).
   - tram-chuc-don-vi (Bài 48, 51, 52), chuc-don-vi (Bài 1), giai-toan (Bài 9: cho biết gì, hỏi gì, chọn phép tính).
   - Có giọng đọc tiếng Việt và luôn có chữ đi kèm; nút Nghe lại, Bỏ qua. Bước cuối có câu thử (không tính điểm).
   - Ghi sự kiện bai_hoc_xem: mã bài học, số bước đã xem, số lần nghe lại, thời lượng, có bỏ qua không, câu thử.
   API: window.BaiHoc = { BAI, mo(ma, o), coBai(ma) }
   ============================================================ */
(function () {
  'use strict';

  function esc(t) { return window.PhanHoi.esc(t); }
  function lap(n, f) { let h = ''; for (let i = 0; i < n; i++) h += f(i); return h; }
  function dia(soQua, vat, tre, nhan) {
    return '<span class="bh-dia' + (soQua > 5 ? ' khay' : '') + '" style="--tre:' + (tre || 0) + 's">' + lap(soQua, function () { return '<i>' + vat + '</i>'; }) + (nhan != null ? '<b class="bh-dem">' + nhan + '</b>' : '') + '</span>';
  }
  function khoi(lop, n, tre) { return lap(n, function (i) { return '<i class="kh ' + lop + ' bh-hien" style="--tre:' + ((tre || 0) + i * 0.08) + 's"></i>'; }); }
  function moHinh(t, c, u, tre) {
    return '<div class="bh-mo-hinh">' +
      (t != null ? '<span class="bh-cot"><span class="bh-khoi">' + khoi('kh-tram', t, tre) + '</span><b>' + t + '</b><small>trăm</small></span>' : '') +
      '<span class="bh-cot"><span class="bh-khoi">' + khoi('kh-chuc', c, (tre || 0) + 0.4) + '</span><b>' + c + '</b><small>chục</small></span>' +
      '<span class="bh-cot"><span class="bh-khoi">' + khoi('kh-dv', u, (tre || 0) + 0.8) + '</span><b>' + u + '</b><small>đơn vị</small></span></div>';
  }
  function pt(t, tre) { return '<p class="bh-pt bh-hien" style="--tre:' + (tre || 0) + 's">' + t + '</p>'; }

  /** Mỗi bước: chu (chữ hiện và đọc), ve() trả về HTML hình minh họa, thu (câu thử ở bước cuối). */
  const BAI = {
    'phep-nhan': {
      ten: 'Phép nhân',
      buoc: [
        { chu: 'Mỗi đĩa có 2 quả cam.', ve: function () { return '<div class="bh-hang">' + dia(2, '🍊', 0) + '</div>'; } },
        { chu: 'Có 3 đĩa như thế. Đếm thêm 2: 2, 4, 6. Có tất cả 6 quả cam.', ve: function () {
          return '<div class="bh-hang">' + dia(2, '🍊', 0, 2) + dia(2, '🍊', 0.5, 4) + dia(2, '🍊', 1, 6) + '</div>' + pt('2 + 2 + 2 = 6', 1.4);
        } },
        { chu: '2 được lấy 3 lần, ta viết 2 × 3 = 6. Đọc là: hai nhân ba bằng sáu.', ve: function () {
          return '<div class="bh-hang">' + dia(2, '🍊', 0) + dia(2, '🍊', 0) + dia(2, '🍊', 0) + '</div>' +
            '<p class="bh-pt to bh-hien"><span class="bh-o">2<small>mỗi đĩa</small></span> × <span class="bh-o">3<small>số đĩa</small></span> = 6</p>';
        } },
        { chu: 'Con thử nhé: mỗi đĩa có 5 quả, có 2 đĩa. Phép nhân nào đúng?', ve: function () {
          return '<div class="bh-hang">' + dia(5, '🍎', 0) + dia(5, '🍎', 0.3) + '</div>';
        }, thu: { lua_chon: ['5 × 2', '2 × 5'], dung: '5 × 2', dung_noi: 'Đúng rồi! 5 được lấy 2 lần nên viết 5 × 2.', sai_noi: '5 quả được lấy 2 lần nên viết 5 × 2 nhé.' } }
      ]
    },
    'phep-chia': {
      ten: 'Phép chia',
      buoc: [
        { chu: 'Có 6 quả cam, chia đều vào 3 đĩa.', ve: function () {
          return '<div class="bh-hang bh-qua">' + lap(6, function () { return '<i>🍊</i>'; }) + '</div><div class="bh-hang">' + dia(0, '', 0) + dia(0, '', 0.1) + dia(0, '', 0.2) + '</div>';
        } },
        { chu: 'Cho vào mỗi đĩa 1 quả, rồi thêm 1 quả nữa là vừa hết cam.', ve: function () {
          return '<div class="bh-hang">' + dia(2, '🍊', 0) + dia(2, '🍊', 0.3) + dia(2, '🍊', 0.6) + '</div>';
        } },
        { chu: 'Mỗi đĩa có 2 quả. Ta có phép chia 6 : 3 = 2. Đọc là: sáu chia ba bằng hai.', ve: function () {
          return '<div class="bh-hang">' + dia(2, '🍊', 0, 2) + dia(2, '🍊', 0, 2) + dia(2, '🍊', 0, 2) + '</div>' +
            '<p class="bh-pt to bh-hien"><span class="bh-o">6<small>quả cam</small></span> : <span class="bh-o">3<small>đĩa</small></span> = 2</p>';
        } },
        { chu: 'Nếu mỗi đĩa 2 quả thì 6 quả cam xếp được 3 đĩa: 6 : 2 = 3.', ve: function () {
          return '<div class="bh-hang">' + dia(2, '🍊', 0, 1) + dia(2, '🍊', 0.4, 2) + dia(2, '🍊', 0.8, 3) + '</div>' + pt('6 : 2 = 3', 1.2);
        } },
        { chu: 'Từ 2 × 3 = 6 ta có hai phép chia: 6 : 3 = 2 và 6 : 2 = 3. Con thử nhé: 10 cái kẹo chia đều cho 5 bạn, phép tính nào?', ve: function () {
          return pt('2 × 3 = 6', 0) + '<div class="bh-hai">' + pt('6 : 3 = 2', 0.4) + pt('6 : 2 = 3', 0.8) + '</div>';
        }, thu: { lua_chon: ['10 : 5', '10 − 5', '10 × 5'], dung: '10 : 5', dung_noi: 'Đúng rồi! Chia đều cho 5 bạn là 10 : 5.', sai_noi: 'Chia đều thành 5 phần bằng nhau là phép chia 10 : 5 nhé.' } }
      ]
    },
    'tram-chuc-don-vi': {
      ten: 'Trăm, chục, đơn vị',
      buoc: [
        { chu: '10 khối nhỏ là 1 chục.', ve: function () {
          return '<div class="bh-hang bh-khoi-hang"><span class="bh-khoi">' + khoi('kh-dv', 10) + '</span><b class="bh-bang">=</b><span class="bh-khoi">' + khoi('kh-chuc', 1, 1) + '</span></div>';
        } },
        { chu: '10 chục là 1 trăm.', ve: function () {
          return '<div class="bh-hang bh-khoi-hang"><span class="bh-khoi">' + khoi('kh-chuc', 10) + '</span><b class="bh-bang">=</b><span class="bh-khoi">' + khoi('kh-tram', 1, 1) + '</span></div>';
        } },
        { chu: 'Số 243 gồm 2 trăm, 4 chục và 3 đơn vị. Ta viết 243 = 200 + 40 + 3.', ve: function () {
          return moHinh(2, 4, 3) + pt('243 = 200 + 40 + 3', 1.4);
        } },
        { chu: 'Số 205 gồm 2 trăm, 0 chục và 5 đơn vị. Đọc là: hai trăm linh năm. Hàng chục là 0 thì không có thanh chục nào.', ve: function () {
          return moHinh(2, 0, 5) + pt('205 = 200 + 5', 1.2);
        }, thu: { lua_chon: ['205', '250', '25'], dung: '205', hoi: 'Hai trăm linh năm viết là số nào?', dung_noi: 'Đúng rồi! Hai trăm linh năm là 205.', sai_noi: '"Linh" nghĩa là hàng chục bằng 0: hai trăm linh năm là 205.' } }
      ]
    },
    'chuc-don-vi': {
      ten: 'Chục và đơn vị',
      buoc: [
        { chu: '10 khối nhỏ là 1 chục.', ve: function () {
          return '<div class="bh-hang bh-khoi-hang"><span class="bh-khoi">' + khoi('kh-dv', 10) + '</span><b class="bh-bang">=</b><span class="bh-khoi">' + khoi('kh-chuc', 1, 1) + '</span></div>';
        } },
        { chu: 'Số 47 gồm 4 chục và 7 đơn vị. Ta viết 47 = 40 + 7. Đọc là: bốn mươi bảy.', ve: function () {
          return moHinh(null, 4, 7) + pt('47 = 40 + 7', 1.2);
        }, thu: { lua_chon: ['74', '47', '407'], dung: '47', hoi: 'Bốn mươi bảy viết là số nào?', dung_noi: 'Đúng rồi! 4 chục và 7 đơn vị là 47.', sai_noi: 'Bốn mươi bảy gồm 4 chục và 7 đơn vị, viết là 47.' } }
      ]
    },
    'giai-toan': {
      ten: 'Giải bài toán có lời văn',
      buoc: [
        { chu: 'Đọc kĩ bài toán. Bài toán cho biết gì? Trên khay có 8 quả trứng, Mai đặt thêm 2 quả trứng.', ve: function () {
          return '<div class="bh-hang">' + dia(8, '🥚', 0) + '<b class="bh-bang">+</b>' + dia(2, '🥚', 0.6) + '</div>';
        } },
        { chu: 'Bài toán hỏi gì? Hỏi trên khay có tất cả bao nhiêu quả trứng.', ve: function () {
          return '<div class="bh-hang">' + dia(8, '🥚', 0) + dia(2, '🥚', 0) + '<b class="bh-bang">?</b></div>';
        } },
        { chu: 'Thêm vào thì nhiều lên, nên chọn phép cộng: 8 + 2.', ve: function () {
          return '<div class="bh-hai"><span class="bh-the dung bh-hien">8 + 2</span><span class="bh-the gach bh-hien" style="--tre:.3s">8 − 2</span></div>';
        } },
        { chu: 'Rồi mới tính: 8 + 2 = 10. Đáp số: 10 quả trứng. Con thử nhé: có 9 con chim, 3 con bay đi. Chọn phép tính nào?', ve: function () {
          return '<div class="bh-giai bh-hien"><p><b>Bài giải</b></p><p>Số quả trứng có tất cả là:</p><p>8 + 2 = 10 (quả)</p><p>Đáp số: 10 quả trứng.</p></div>';
        }, thu: { lua_chon: ['9 + 3', '9 − 3'], dung: '9 − 3', dung_noi: 'Đúng rồi! Bay đi là bớt đi: 9 − 3.', sai_noi: 'Bay đi thì ít đi, con làm phép trừ 9 − 3 nhé.' } }
      ]
    }
  };

  let dom = null;
  let s = null;
  function $(id) { return document.getElementById(id); }

  function khoiDom() {
    if (dom) return dom;
    dom = { man: $('man-bai-hoc'), ten: $('bh-tieu-de'), cham: $('bh-cham'), san: $('bh-san'), chu: $('bh-chu'), thu: $('bh-thu'), hinh: $('bh-hinh'), nghe: $('bh-nghe'), boQua: $('bh-bo-qua'), tiep: $('bh-tiep') };
    dom.nghe.addEventListener('click', function () { if (s) { s.ngheLai++; doc(); } });
    dom.boQua.addEventListener('click', function () { ket(true); });
    dom.tiep.addEventListener('click', function () { tiep(); });
    dom.thu.addEventListener('click', function (e) {
      const b = e.target.closest('button');
      if (b) thu(b.getAttribute('data-v'));
    });
    return dom;
  }

  function doc() {
    const b = BAI[s.ma].buoc[s.i];
    window.AmThanh.doc(b.thu && b.thu.hoi ? b.chu + ' ' + b.thu.hoi : b.chu);
  }

  function veBuoc() {
    const bai = BAI[s.ma];
    const b = bai.buoc[s.i];
    s.daXem = Math.max(s.daXem, s.i + 1);
    dom.cham.innerHTML = bai.buoc.map(function (x, i) { return '<li class="' + (i < s.i ? 'xong' : i === s.i ? 'dang' : '') + '"></li>'; }).join('');
    dom.san.innerHTML = b.ve();
    dom.chu.textContent = b.chu + (b.thu && b.thu.hoi ? ' ' + b.thu.hoi : '');
    const cuoi = s.i === bai.buoc.length - 1;
    if (b.thu) {
      const ds = b.thu.lua_chon.slice();
      for (let k = ds.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); const t = ds[k]; ds[k] = ds[j]; ds[j] = t; }
      dom.thu.innerHTML = ds.map(function (v) { return '<button type="button" class="bh-the" data-v="' + esc(v) + '">' + esc(v) + '</button>'; }).join('');
      dom.thu.classList.remove('hidden');
      dom.tiep.disabled = !s.thuXong;
    } else {
      dom.thu.classList.add('hidden');
      dom.tiep.disabled = false;
    }
    dom.tiep.textContent = cuoi ? (s.o.chuKetThuc || 'Bắt đầu chơi') : 'Tiếp';
    doc();
  }

  function thu(v) {
    const b = BAI[s.ma].buoc[s.i];
    if (!b.thu || s.thuXong) return;
    const dung = v === b.thu.dung;
    s.thuKq = { chon: v, dung: dung };
    s.thuXong = true;
    dom.thu.querySelectorAll('button').forEach(function (x) {
      const val = x.getAttribute('data-v');
      x.disabled = true;
      if (val === b.thu.dung) x.classList.add('dung');
      else if (val === v) x.classList.add('sai');
    });
    window.AmThanh.bat(dung ? 'dung' : 'cham');
    dom.chu.textContent = dung ? b.thu.dung_noi : b.thu.sai_noi;
    window.AmThanh.doc(dom.chu.textContent);
    dom.tiep.disabled = false;
  }

  function tiep() {
    if (!s) return;
    const bai = BAI[s.ma];
    if (s.i < bai.buoc.length - 1) { s.i++; veBuoc(); window.AmThanh.bat('cham'); return; }
    ket(false);
  }

  function ket(boQua) {
    if (!s) return;
    const o = s.o;
    const du = {
      ma_bai_hoc: s.ma, so_buoc_da_xem: s.daXem, tong_buoc: BAI[s.ma].buoc.length,
      nghe_lai: s.ngheLai, giay: Math.round((performance.now() - s.t0) / 100) / 10, bo_qua: !!boQua
    };
    if (s.thuKq) du.thu = s.thuKq;
    window.AmThanh.dungDoc();
    s = null;
    window.NhatKy.ghi('bai_hoc_xem', du, o.nguCanh || {});
    if (o.onXong) o.onXong(du);
  }

  /**
   * Mở một bài học. o: { hinhGoiY, nguCanh: { game, vung, man } (gắn vào sự kiện), chuKetThuc, onXong(duLieu) }.
   * Màn bài học (#man-bai-hoc) do app hiện trước khi gọi.
   */
  function mo(ma, o) {
    khoiDom();
    if (!BAI[ma]) { if (o && o.onXong) o.onXong(null); return; }
    s = { ma: ma, o: o || {}, i: 0, daXem: 0, ngheLai: 0, t0: performance.now(), thuXong: false, thuKq: null };
    dom.ten.textContent = BAI[ma].ten;
    dom.hinh.src = (o && o.hinhGoiY) || '';
    veBuoc();
    setTimeout(function () { try { dom.tiep.focus(); } catch (e) { /* bỏ qua */ } }, 60);
  }

  window.BaiHoc = { BAI: BAI, mo: mo, coBai: function (ma) { return !!BAI[ma]; } };
})();
