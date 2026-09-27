/* ============================================================
   xep-hinh-so.js – Game Xếp Hình Số (nâng cấp từ Tháp Đồng Hồ): dựng số bằng khối như mô hình SGK
   - Ba cột Trăm, Chục, Đơn vị (vùng 1 chỉ có Chục và Đơn vị). Chạm máy thả trên mỗi cột để thả một tấm trăm,
     một thanh chục hay một khối đơn vị; chạm nút − (hoặc khối trên cùng) để lấy ra.
   - Đủ 10 khối đơn vị thì tự gộp thành 1 thanh chục, 10 thanh chục gộp thành 1 tấm trăm (10 đơn vị = 1 chục).
   - Đề: "Xếp số 205", "hai trăm linh năm" (giọng đọc), "200 + 5", "gồm 2 trăm và 5 đơn vị".
   - Bấm Xong để chấm; sai được thử lại một lần, rồi xem lời giải có mô hình khối. Mỗi số đúng xây thêm một tầng tháp.
   - Ghi: tha (khối nào, vào cột nào, giá trị sau khi thả, có gộp không), bo_chon (lấy khối ra), tra_loi kèm số khối từng cột.
   API: window.XepHinhSo = { batDau(o) }
   ============================================================ */
(function () {
  'use strict';

  const HANG = ['tram', 'chuc', 'dv'];
  const TEN = { tram: 'trăm', chuc: 'chục', dv: 'đơn vị' };
  const DOI_TUONG = { tram: 'tam_tram', chuc: 'thanh_chuc', dv: 'khoi_don_vi' };
  const TREN = { dv: 'chuc', chuc: 'tram' };
  const TOI_DA = 9;

  let s = null;
  let dom = null;

  function $(id) { return document.getElementById(id); }
  function K() { return window.KhungChoi; }
  function NH() { return window.NganHang; }
  function AT() { return window.AmThanh; }

  function khoiDom() {
    if (dom) return dom;
    dom = { san: $('xh-san'), bang: $('xh-bang'), xong: $('xh-xong'), thap: $('xh-thap'), tang: $('xh-tang'), dung: $('xh-dung'), dungSo: $('xh-dung-so'), dungDoc: $('xh-dung-doc') };
    HANG.forEach(function (h) {
      dom['cot_' + h] = $('xh-cot-' + h);
      dom['chua_' + h] = $('xh-chua-' + h);
      dom['so_' + h] = $('xh-so-' + h);
    });
    dom.bang.addEventListener('click', function (e) {
      const t = e.target.closest('[data-tha]');
      if (t) { tha(t.getAttribute('data-tha')); return; }
      const b = e.target.closest('[data-bot]');
      if (b) { bot(b.getAttribute('data-bot')); return; }
      const k = e.target.closest('.xh-chua');
      if (k) bot(k.getAttribute('data-hang'));
    });
    dom.xong.addEventListener('click', function () { xong(); });
    return dom;
  }

  /** o: { van, man, nen, phu, hinhGoiY, hinhCoVu, xemBaiHoc, onXong(kq), onThoat(kq) } */
  function batDau(o) {
    khoiDom();
    const baHang = o.man.cau.some(function (x) { return (NH().KY_NANG[x.ky_nang].gioi_han || 0) >= 1000; });
    s = { o: o, van: o.van, q: null, dem: { tram: 0, chuc: 0, dv: 0 }, baHang: baHang, khoa: false, tang: 0, moi: null };
    dom.san.classList.toggle('hai-hang', !baHang);
    dom.cot_tram.classList.toggle('hidden', !baHang);
    K().mo({
      van: o.van, game: 'xep-hinh-so', tenGame: 'Xếp Hình Số', nen: o.nen, phu: o.phu, hinhGoiY: o.hinhGoiY,
      onGoiY: goiY, onThoat: thoat, xemBaiHoc: o.xemBaiHoc, onPhim: phim
    });
    s.van.batDau({ so_cot: baHang ? 3 : 2 });
    veThap();
    cauMoi();
  }

  function giaTri() { return s.dem.tram * 100 + s.dem.chuc * 10 + s.dem.dv; }

  function cauMoi() {
    if (!s) return;
    dom.dung.classList.add('hidden');
    if (!s.van.conCau()) { ketThuc(); return; }
    const q = s.van.cauTiep();
    s.q = q;
    s.dem = { tram: 0, chuc: 0, dv: 0 };
    s.moi = null;
    s.khoa = false;
    K().anGoiY();
    K().de(q.de, q.de_doc, { nay: true, docNgay: true });
    K().tienDo();
    ve();
  }

  /* ---------------- Vẽ ---------------- */

  function ve() {
    HANG.forEach(function (h) {
      const n = s.dem[h];
      let html = '';
      for (let i = 0; i < n; i++) html += '<i class="kh kh-' + h + (s.moi === h && i === n - 1 ? ' roi' : '') + '"></i>';
      dom['chua_' + h].innerHTML = html;
      dom['so_' + h].textContent = n;
      dom['cot_' + h].classList.toggle('co', n > 0);
    });
    dom.xong.disabled = giaTri() === 0 || s.khoa;
    s.moi = null;
  }

  function veThap() {
    let h = '';
    for (let i = 0; i < s.tang; i++) h += '<i style="--i:' + i + '"></i>';
    dom.thap.innerHTML = h;
    dom.tang.textContent = s.tang + ' tầng';
  }

  function rung(el) { if (!el) return; el.classList.remove('rung'); void el.offsetWidth; el.classList.add('rung'); }

  /* ---------------- Thao tác ---------------- */

  function tha(h) {
    if (!s || !s.q || s.khoa || K().dangKhoa()) return;
    if (h === 'tram' && !s.baHang) return;
    let gop = null;
    if (s.dem[h] >= TOI_DA) {
      const tren = TREN[h];
      if (!tren || (tren === 'tram' && !s.baHang)) { K().bao(h === 'tram' ? 'Nhiều nhất 9 trăm thôi con nhé' : 'Nhiều nhất 9 chục thôi con nhé'); rung(dom['cot_' + h]); return; }
      if (s.dem[tren] >= TOI_DA) { K().bao('Hàng ' + TEN[tren] + ' đầy rồi con nhé'); rung(dom['cot_' + tren]); return; }
      // 10 khối gộp thành 1 khối của hàng trên
      s.dem[h] = 0;
      s.dem[tren]++;
      s.moi = tren;
      gop = '10 ' + TEN[h] + ' thành 1 ' + TEN[tren];
      const p = K().tamCua(dom['cot_' + tren]);
      K().chuBay('10 ' + TEN[h] + ' = 1 ' + TEN[tren], p.x - 60, p.y - 40, 'nho');
      AT().bat('qua_mong');
    } else {
      s.dem[h]++;
      s.moi = h;
      AT().bat('go_phim');
    }
    const du = { doi_tuong: DOI_TUONG[h], den: 'cot_' + h, gia_tri: giaTri(), tram: s.dem.tram, chuc: s.dem.chuc, dv: s.dem.dv };
    if (gop) du.gop = gop;
    s.van.thaoTac('tha', du);
    ve();
  }

  function bot(h) {
    if (!s || !s.q || s.khoa || K().dangKhoa() || !h || !s.dem[h]) return;
    s.dem[h]--;
    AT().bat('cham');
    s.van.thaoTac('bo_chon', { doi_tuong: DOI_TUONG[h], tu: 'cot_' + h, gia_tri: giaTri(), tram: s.dem.tram, chuc: s.dem.chuc, dv: s.dem.dv });
    ve();
  }

  function phim(e) {
    if (!s || !s.q || s.khoa) return;
    const k = e.key;
    if (k === 'Enter') { xong(); e.preventDefault(); }
    else if (k === '1' || k === 't') tha(s.baHang ? 'tram' : 'chuc');
    else if (k === '2' || k === 'c') tha('chuc');
    else if (k === '3' || k === 'd') tha('dv');
  }

  function xong() {
    if (!s || !s.q || s.khoa || K().dangKhoa()) return;
    const v = giaTri();
    if (!v) return;
    const kq = s.van.traLoi(v, { tram: s.dem.tram, chuc: s.dem.chuc, dv: s.dem.dv });
    if (!kq) return;
    if (kq.dung) { xepDung(v, kq); return; }
    AT().bat('sai');
    if (kq.thuLai) {
      rung(dom.bang);
      K().bao('Con xếp ' + v + '. ' + kq.loiNoi + '. Con sửa lại nhé', 'sai', 3.4);
      AT().doc(kq.loiNoi);
      return;
    }
    s.khoa = true;
    ve();
    const q = s.q;
    K().phanHoiCau(q, v, Object.assign({}, kq, { moDau: 'Con xếp', chonHien: String(v) }), function () { cauMoi(); });
  }

  function xepDung(v, kq) {
    s.khoa = true;
    s.tang++;
    veThap();
    const p = K().tamCua(dom.bang);
    const diem = kq.ketQua === 'dung_ngay' ? 100 : 40;
    K().congDiem(diem, p.x, p.y - 60, kq.quaMong ? '+' + kq.quaMong + ' quả mọng' : null);
    K().phao(p.x, p.y - 20, 20);
    AT().bat('dung');
    const tong = NH().noiTheoTong(v);
    dom.dungSo.textContent = tong.indexOf('+') >= 0 ? v + ' = ' + tong : String(v);
    dom.dungDoc.textContent = NH().docSo(v);
    dom.dung.classList.remove('hidden');
    AT().doc(NH().docSo(v));
    ve();
    setTimeout(cauMoi, 1900);
  }

  function goiY() {
    if (!s || !s.q || K().dangKhoa()) return;
    K().goiY();
  }

  /* ---------------- Kết thúc ---------------- */

  function ketThuc() {
    const o = s.o;
    const diem = K().diem();
    const tang = s.tang;
    K().dong();
    s.van.ketThuc(false, { diem: diem, tang_thap: tang }).then(function (kq) {
      kq.diem = diem;
      kq.dongPhu = 'Tháp cao ' + tang + ' tầng · ' + diem.toLocaleString('vi-VN') + ' điểm';
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

  window.XepHinhSo = { batDau: batDau, _trangThai: function () { return s; } };
  (window.DaoTroChoi = window.DaoTroChoi || {})['xep-hinh-so'] = { ten: 'Xếp Hình Số', khung: true, san: 'xh-san', batDau: batDau, _trangThai: window.XepHinhSo._trangThai };
})();
