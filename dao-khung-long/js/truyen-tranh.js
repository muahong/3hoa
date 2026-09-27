/* ============================================================
   truyen-tranh.js – Game Truyện Tranh Phiêu Lưu: bài toán có lời văn kể bằng 3 khung tranh có giọng đọc
   - Khung 1, 2 kể dữ kiện, khung 3 hỏi. Nhân vật là khủng long của đảo; đồ vật hiện đúng số lượng khi số nhỏ.
   - Bước 1: bé chọn phép tính (thẻ đúng và thẻ nhiễu sai phép, đảo thứ tự). Bước 2: bé tự gõ kết quả.
     Hai bước chấm riêng nên biết bé sai vì chưa hiểu đề hay vì tính nhầm (03a mục 2.17, 2.18, 2.26).
   - Đúng cả hai bước thì hiện "Bài giải" như SGK (câu lời giải, phép tính có đơn vị, đáp số).
   - Ghi: nghe_lai (đọc lại đề), chon (thẻ phép tính, bước 1), go_so, xoa (bước 2), gợi ý từng bước.
   API: window.TruyenTranh = { batDau(o) }
   ============================================================ */
(function () {
  'use strict';

  const HINH_NV = {
    'Rex': 'rex-kid', 'Mây': 'may-kid', 'Tốc Long': 'sp-toc-long', 'Khủng Long Lửa': 'sp-khung-long-lua', 'Giáp Long': 'sp-giap-long',
    'Rồng Biển': 'sp-rong-bien', 'Mỏ Vịt Long': 'sp-mo-vit-long', 'Tam Giác Long': 'sp-tam-giac-long', 'Long Cổ Dài': 'sp-long-co-dai',
    'Kiếm Long': 'sp-kiem-long', 'Gai Long': 'sp-gai-long', 'Dực Long': 'sp-duc-long'
  };
  const VI_TRI_NEN = ['18% 60%', '50% 55%', '82% 60%'];

  let s = null;
  let dom = null;

  function $(id) { return document.getElementById(id); }
  function K() { return window.KhungChoi; }
  function NH() { return window.NganHang; }
  function AT() { return window.AmThanh; }
  function esc(t) { return window.PhanHoi.esc(t); }

  function khoiDom() {
    if (dom) return dom;
    dom = {
      san: $('tt-san'), khung: $('tt-khung'), buoc1: $('tt-buoc1'), thePhep: $('tt-the-phep'), buoc2: $('tt-buoc2'),
      hoi2: $('tt-hoi2'), o: $('tt-o'), banPhim: $('tt-ban-phim'), giai: $('tt-giai'), giaiNd: $('tt-giai-nd'), giaiTiep: $('tt-giai-tiep')
    };
    dom.thePhep.addEventListener('click', function (e) {
      const b = e.target.closest('.tt-the');
      if (b) chonPhep(b.getAttribute('data-v'));
    });
    dom.banPhim.addEventListener('click', function (e) {
      const b = e.target.closest('button');
      if (!b) return;
      const k = b.getAttribute('data-k');
      if (k === 'xoa') xoa(); else if (k === 'xong') chotSo(); else go(k);
    });
    dom.giaiTiep.addEventListener('click', function () { if (s && s.choTiep) { s.choTiep = false; cauMoi(); } });
    return dom;
  }

  /** o: { van, man, nen, phu, hinhGoiY, hinhBe (khủng long của bé), anh(ten) → url, xemBaiHoc, onXong(kq), onThoat(kq) } */
  function batDau(o) {
    khoiDom();
    s = { o: o, van: o.van, q: null, nhap: '', khoa: false, choTiep: false, dung: 0 };
    K().mo({
      van: o.van, game: 'truyen-tranh', tenGame: 'Truyện Tranh', nen: o.nen, phu: o.phu, hinhGoiY: o.hinhGoiY,
      onGoiY: goiY, onThoat: thoat, xemBaiHoc: o.xemBaiHoc, onPhim: phim, onNgheLai: ngheLai
    });
    s.van.batDau({ hai_buoc: true });
    cauMoi();
  }

  /* ---------------- Một bài toán ---------------- */

  function cauMoi() {
    if (!s) return;
    dom.giai.classList.add('hidden');
    if (!s.van.conCau()) { ketThuc(); return; }
    const q = s.van.cauTiep();
    s.q = q;
    s.nhap = '';
    s.khoa = false;
    K().anGoiY();
    K().tienDo();
    veKhung(q);
    veBuoc1(q);
    K().de('Đọc truyện rồi chọn phép tính', q.khung.join(' '), { nay: true });
    docTruyen(q);
  }

  function docTruyen(q) {
    if (!AT().co.giong) return;
    AT().doc(q.khung[0]);
    AT().doc(q.khung[1], { noiTiep: true });
    AT().doc(q.khung[2], { noiTiep: true });
  }

  function ngheLai() {
    if (!s || !s.q || s.q.xong) return;
    s.van.thaoTac('nghe_lai', { doi_tuong: 'de' });
    docTruyen(s.q);
  }

  function anh(ten) { return s.o.anh ? s.o.anh(ten) : 'assets/img/' + ten + '.webp'; }

  /** Đồ vật: đúng số lượng khi số nhỏ, số lớn thì một hình kèm "× số". */
  function vat(q, n, kieu) {
    const m = q.mau;
    const mot = m.anh ? '<img src="' + anh(m.anh) + '" alt="">' : '<i>' + esc(m.vat) + '</i>';
    // Số đo (kg, l, cm, đồng): một hình kèm số đo, không vẽ từng "ki-lô-gam"
    if (m.do_luong) return '<span class="tt-vat ' + (kieu || '') + '"><span class="tt-vat-so">' + mot + '<b>' + esc(n + ' ' + m.dv) + '</b></span></span>';
    if (n > 20) return '<span class="tt-vat ' + (kieu || '') + '"><span class="tt-vat-so">' + mot + '<b>× ' + n + '</b></span></span>';
    let h = '';
    for (let i = 0; i < n; i++) h += mot;
    return '<span class="tt-vat ' + (kieu || '') + (n > 10 ? ' nhieu' : '') + '">' + h + '</span>';
  }
  function nhom(q, moi, soNhom) {
    const m = q.mau;
    const mot = m.anh ? '<img src="' + anh(m.anh) + '" alt="">' : '<i>' + esc(m.vat) + '</i>';
    if (m.do_luong) {
      let g = '<span class="tt-vat tt-cac-nhom">';
      for (let i = 0; i < Math.min(soNhom, 10); i++) g += '<span class="tt-dia nho">' + mot + '<b>' + esc(moi + ' ' + m.dv) + '</b></span>';
      return g + '</span>';
    }
    if (moi * soNhom > 25) return '<span class="tt-vat"><span class="tt-vat-so"><span class="tt-dia nho">' + mot + '<b>' + moi + '</b></span><b>× ' + soNhom + '</b></span></span>';
    let h = '<span class="tt-vat tt-cac-nhom">';
    for (let i = 0; i < soNhom; i++) {
      h += '<span class="tt-dia">';
      for (let j = 0; j < moi; j++) h += mot;
      h += '</span>';
    }
    return h + '</span>';
  }
  function dia(n) {
    let h = '<span class="tt-vat tt-cac-nhom">';
    for (let i = 0; i < Math.min(n, 10); i++) h += '<span class="tt-dia trong"></span>';
    return h + '</span>';
  }

  function veKhung(q) {
    const ct = q.cau_truc;
    const x = ct.so[0], y = ct.so[1];
    const chu = q.mau.khung.join(' ');
    const coA = chu.indexOf('{A}') >= 0, coB = chu.indexOf('{B}') >= 0;
    const hinhA = coA ? anh(HINH_NV[ct.nv[0]] || 'rex-kid') : s.o.hinhBe;
    const hinhB = coB ? anh(HINH_NV[ct.nv[1]] || 'may-kid') : hinhA;
    let v1 = '', v2 = '';
    switch (ct.dang) {
      case 'them': v1 = vat(q, x); v2 = vat(q, y, 'den'); break;
      case 'gop': v1 = vat(q, x); v2 = vat(q, y); break;
      case 'bot': case 'con_lai': v1 = vat(q, x); v2 = vat(q, y, 'di'); break;
      case 'nhieu_hon': v1 = vat(q, x); v2 = '<span class="tt-nhan">nhiều hơn ' + y + '</span>'; break;
      case 'it_hon': v1 = vat(q, x); v2 = '<span class="tt-nhan">ít hơn ' + y + '</span>'; break;
      case 'hon_kem': v1 = vat(q, x); v2 = vat(q, y); break;
      case 'luc_dau': v1 = vat(q, y, 'di'); v2 = vat(q, x); break;
      case 'nhan': v1 = nhom(q, x, 1); v2 = nhom(q, x, y); break;
      case 'chia_deu': v1 = vat(q, x); v2 = dia(y); break;
      case 'chia_nhom': v1 = vat(q, x); v2 = nhom(q, y, 1); break;
      default: v1 = vat(q, x); v2 = vat(q, y);
    }
    const nen = s.o.nen;
    const khung = [
      { hinh: hinhA, vat: v1, chu: q.khung[0] },
      { hinh: hinhB, vat: v2, chu: q.khung[1] },
      { hinh: s.o.hinhGoiY, vat: '<span class="tt-hoi-cham">?</span>', chu: q.khung[2], hoi: true }
    ];
    dom.khung.innerHTML = khung.map(function (k, i) {
      return '<figure class="tt-khung' + (k.hoi ? ' hoi' : '') + '" style="--tre:' + (i * 0.55) + 's">' +
        '<span class="tt-canh" style="background-image:url(' + nen + ');background-position:' + VI_TRI_NEN[i] + '"></span>' +
        '<span class="tt-so-khung">' + (i + 1) + '</span>' +
        '<img class="tt-nv" src="' + k.hinh + '" alt="">' +
        '<span class="tt-do">' + k.vat + '</span>' +
        '<figcaption>' + boiSo(k.chu) + '</figcaption></figure>';
    }).join('');
  }

  /** In đậm các con số trong lời kể (không đụng tên lớp như "2A"). */
  function boiSo(t) { return esc(t).replace(/\b(\d+)\b/g, '<b>$1</b>'); }

  function veBuoc1(q) {
    dom.buoc1.classList.remove('hidden');
    dom.buoc2.classList.add('hidden');
    dom.thePhep.innerHTML = q.buoc1.lua_chon.map(function (x) {
      return '<button type="button" class="tt-the" data-v="' + esc(x.gia_tri) + '">' + esc(NH().hienGiaTri(x.gia_tri)) + '</button>';
    }).join('');
  }

  function theEl(v) {
    return Array.prototype.find.call(dom.thePhep.querySelectorAll('.tt-the'), function (b) { return b.getAttribute('data-v') === v; });
  }

  function chonPhep(v) {
    if (!s || !s.q || s.khoa || K().dangKhoa() || s.q.buoc !== 1) return;
    s.van.thaoTac('chon', { doi_tuong: 'the_phep', gia_tri: v });
    const kq = s.van.traLoi(v);
    if (!kq) return;
    const el = theEl(v);
    if (kq.dung) {
      if (el) el.classList.add('dung');
      AT().bat('dung');
      s.khoa = true;
      setTimeout(function () { if (s) { s.khoa = false; moBuoc2(); } }, 550);
      return;
    }
    AT().bat('sai');
    if (kq.thuLai) {
      if (el) { el.classList.remove('rung'); void el.offsetWidth; el.classList.add('rung'); }
      K().bao(kq.loiNoi + '. Con chọn lại nhé', 'sai', 3.2);
      AT().doc(kq.loiNoi);
      return;
    }
    // Chọn sai phép: giải thích vì sao, rồi vẫn cho tính với phép đúng để đo riêng bước tính
    if (el) el.classList.add('sai');
    const dung = theEl(kq.dapAn);
    if (dung) dung.classList.add('goi');
    s.khoa = true;
    const html = '<h2>Mình cùng xem nhé!</h2>' +
      '<p class="ph-loi">Con chọn <b>' + esc(NH().hienGiaTri(v)) + '</b>. Mình đọc lại truyện nhé.</p>' +
      '<div class="ph-giai"><ol class="ph-buoc">' + s.q.khung.map(function (k) { return '<li>' + boiSo(k) + '</li>'; }).join('') + '</ol></div>' +
      '<p class="ph-loi">' + esc(kq.loiNoi) + '.</p>' +
      '<p class="ph-ket">Phép tính đúng: ' + esc(NH().hienGiaTri(kq.dapAn)) + '</p>';
    setTimeout(function () {
      if (!s) return;
      K().hienPhanHoi({ html: html, note: 'Bây giờ con tính kết quả nhé', doc: kq.loiNoi }, function (giay, nut) {
        s.van.phanHoiXem(giay, nut, { buoc: 1, ma_loi_giai: 'chon-phep' });
        s.khoa = false;
        moBuoc2();
      });
    }, 500);
  }

  function moBuoc2() {
    const q = s.q;
    s.nhap = '';
    dom.buoc1.classList.add('hidden');
    dom.buoc2.classList.remove('hidden');
    dom.hoi2.textContent = 'Con tính: ' + q.de_buoc2;
    dom.o.textContent = '';
    dom.o.classList.remove('sai');
    K().anGoiY();
    K().de('Con tính: ' + q.de_buoc2, NH().deDoc(NH().ctPhep(q.cau_truc)), { nay: true });
  }

  function go(k) {
    if (!s || !s.q || s.khoa || K().dangKhoa() || s.q.buoc !== 2 || s.nhap.length >= 3) return;
    s.nhap += k;
    dom.o.textContent = s.nhap;
    dom.o.classList.remove('sai');
    AT().bat('go_phim');
    s.van.thaoTac('go_so', { gia_tri: Number(k), hien_tai: s.nhap });
  }
  function xoa() {
    if (!s || !s.q || s.khoa || s.q.buoc !== 2 || !s.nhap) return;
    s.nhap = s.nhap.slice(0, -1);
    dom.o.textContent = s.nhap;
    s.van.thaoTac('xoa', { hien_tai: s.nhap });
  }

  function chotSo() {
    if (!s || !s.q || s.khoa || K().dangKhoa() || s.q.buoc !== 2 || !s.nhap) return;
    const v = Number(s.nhap);
    const kq = s.van.traLoi(v, { nhap: s.nhap });
    if (!kq) return;
    if (kq.dung) {
      AT().bat('dung');
      const p = K().tamCua(dom.o);
      if (kq.ketQua !== 'sai') {
        s.dung++;
        K().congDiem(kq.ketQua === 'dung_ngay' ? 150 : 50, p.x, p.y - 40, kq.quaMong ? '+' + kq.quaMong + ' quả mọng' : null);
        K().phao(p.x, p.y, 18);
      }
      K().tienDo();
      hienBaiGiai(s.q);
      return;
    }
    AT().bat('sai');
    if (kq.thuLai) {
      dom.o.classList.add('sai');
      K().bao('Chưa đúng, con tính lại nhé', 'sai');
      s.nhap = '';
      setTimeout(function () { if (s) dom.o.textContent = ''; }, 500);
      return;
    }
    s.khoa = true;
    const q = s.q;
    const qTinh = {
      de: q.de_buoc2, dap_an: q.dap_an, loi_giai: q.loi_giai_buoc2, cau_truc: NH().ctPhep(q.cau_truc),
      ket_luan: 'Vậy ' + q.de_buoc2.replace('?', String(q.dap_an)) + '. ' + q.ket_luan
    };
    K().phanHoiCau(qTinh, v, Object.assign({}, kq, { moDau: 'Con tính ra' }), function () { cauMoi(); }, { buoc: 2 });
  }

  /** Bài giải như SGK sau khi làm xong một bài. */
  function hienBaiGiai(q) {
    s.khoa = true;
    const b = q.loi_giai.buoc;
    dom.giaiNd.innerHTML = '<p class="tt-giai-nhan">Bài giải</p><p>' + esc(b[0]) + '</p><p class="tt-giai-phep">' + esc(b[1]) + '</p><p class="tt-giai-dap">' + esc(b[2]) + '</p>';
    dom.giai.classList.remove('hidden');
    s.choTiep = true;
    AT().doc(b[2]);
    setTimeout(function () { try { dom.giaiTiep.focus(); } catch (e) { /* bỏ qua */ } }, 50);
  }

  function phim(e) {
    if (!s || !s.q) return;
    const k = e.key;
    if (s.choTiep && (k === 'Enter' || k === ' ')) { s.choTiep = false; cauMoi(); e.preventDefault(); return; }
    if (s.q.buoc === 1 && /^[1-3]$/.test(k)) {
      const b = dom.thePhep.querySelectorAll('.tt-the')[+k - 1];
      if (b) chonPhep(b.getAttribute('data-v'));
      return;
    }
    if (s.q.buoc !== 2) return;
    if (/^[0-9]$/.test(k)) { go(k); e.preventDefault(); }
    else if (k === 'Backspace') { xoa(); e.preventDefault(); }
    else if (k === 'Enter') { chotSo(); e.preventDefault(); }
  }

  function goiY() {
    if (!s || !s.q || s.q.xong || K().dangKhoa()) return;
    K().goiY();
  }

  /* ---------------- Kết thúc ---------------- */

  function ketThuc() {
    const o = s.o;
    const diem = K().diem();
    const dung = s.dung;
    K().dong();
    s.van.ketThuc(false, { diem: diem }).then(function (kq) {
      kq.diem = diem;
      kq.dongPhu = 'Giải đúng ' + dung + ' bài toán · ' + diem.toLocaleString('vi-VN') + ' điểm';
      s = null;
      if (o.onXong) o.onXong(kq);
    });
  }

  function thoat() {
    if (!s) return;
    const o = s.o;
    const diem = K().diem();
    K().dong();
    s.van.ketThuc(true, { ly_do: 've_dao', diem: diem }).then(function (kq) {
      s = null;
      if (o.onThoat) o.onThoat(kq);
    });
  }

  window.TruyenTranh = { batDau: batDau, _trangThai: function () { return s; } };
  (window.DaoTroChoi = window.DaoTroChoi || {})['truyen-tranh'] = { ten: 'Truyện Tranh', khung: true, san: 'tt-san', batDau: batDau, _trangThai: window.TruyenTranh._trangThai };
})();
