/* ============================================================
   lat-the.js – Game Lật Thẻ Anh Em (trò chơi "Cặp tấm thẻ anh em" của SGK Toán 2 Bài 24)
   - Bên trái: thẻ phép tính úp. Bé lật một thẻ, rồi chạm thẻ kết quả là "anh em" của nó ở bên phải.
   - Thẻ kết quả gồm đáp án của mọi thẻ phép tính trên bàn và 2 thẻ nhiễu "gần đúng" mang mã lỗi (quên nhớ, ô bên cạnh…).
   - Chọn sai được thử lại một lần; sai lần nữa thì xem lời giải, câu đó quay lại ở bàn sau.
   - Ghi: lat (thẻ phép tính), chon (thẻ kết quả, vị trí), gợi ý cấp 3 gạch bớt một thẻ sai.
   API: window.LatThe = { batDau(o) }
   ============================================================ */
(function () {
  'use strict';

  const SO_PHEP = 6;
  const SO_NHIEU = 2;

  let s = null;
  let dom = null;

  function $(id) { return document.getElementById(id); }
  function K() { return window.KhungChoi; }
  function NH() { return window.NganHang; }
  function AT() { return window.AmThanh; }
  function esc(t) { return window.PhanHoi.esc(t); }

  function khoiDom() {
    if (dom) return dom;
    dom = { san: $('lt-san'), phep: $('lt-phep'), kq: $('lt-kq'), khay: $('lt-khay'), soCap: $('lt-so-cap'), banMoi: $('lt-ban-moi') };
    dom.phep.addEventListener('click', function (e) {
      const b = e.target.closest('.lt-the');
      if (b) latThe(+b.getAttribute('data-i'));
    });
    dom.kq.addEventListener('click', function (e) {
      const b = e.target.closest('.lt-the');
      if (b) chonKetQua(+b.getAttribute('data-i'));
    });
    return dom;
  }

  /**
   * o: { van, man, nen, phu, hinhGoiY, hinhThe (url mặt sau thẻ), xemBaiHoc, onXong(kq), onThoat(kq) }
   */
  function batDau(o) {
    khoiDom();
    s = { o: o, van: o.van, ban: null, cur: null, chuoi: 0, cap: 0, khoa: false, soBan: 0 };
    K().mo({
      van: o.van, game: 'lat-the', tenGame: 'Lật Thẻ Anh Em', nen: o.nen, phu: o.phu, hinhGoiY: o.hinhGoiY,
      onGoiY: goiY, onThoat: thoat, xemBaiHoc: o.xemBaiHoc
    });
    s.van.batDau({ so_the_phep: SO_PHEP, so_the_nhieu: SO_NHIEU });
    moBan();
  }

  function coTen(q, v) {
    const l = NH().nhanBietLoi(q.cau_truc, v);
    return l.length && !l.every(function (m) { return m === 'khac' || m === 'dem-lech'; });
  }

  /** Dựng một bàn: tối đa 6 thẻ phép tính có đáp án khác nhau, thẻ kết quả trộn lẫn 2 thẻ nhiễu có tên lỗi. */
  function moBan() {
    const qs = s.van.lapBan(SO_PHEP);
    if (!qs.length) { ketThuc(); return; }
    s.soBan++;
    const dapAn = qs.map(function (q) { return String(q.dap_an); });
    let ung = [];
    qs.forEach(function (q) {
      (q.nhieu || []).forEach(function (x) {
        const k = String(x.gia_tri);
        if (dapAn.indexOf(k) < 0 && !ung.some(function (u) { return String(u.v) === k; })) ung.push({ v: x.gia_tri, ten: coTen(q, x.gia_tri) ? 1 : 0 });
      });
    });
    ung = NH().tron(s.van.rng, ung).sort(function (a, b) { return b.ten - a.ten; });
    const the = qs.map(function (q) { return q.dap_an; }).concat(ung.slice(0, SO_NHIEU).map(function (u) { return u.v; }));
    s.ban = {
      phep: qs.map(function (q, i) { return { q: q, i: i, tt: 'up' }; }),
      kq: NH().tron(s.van.rng, the).map(function (v, i) { return { gia_tri: v, i: i, tt: 'mo' }; })
    };
    s.cur = null;
    K().de('Lật một thẻ phép tính', null, { nay: true });
    K().tienDo();
    ve(true);
    if (s.soBan > 1) {
      dom.banMoi.classList.remove('hidden');
      setTimeout(function () { dom.banMoi.classList.add('hidden'); }, 1100);
    }
  }

  /* ---------------- Vẽ ---------------- */

  function lopChu(t) { const n = String(t).length; return n > 16 ? ' rat-dai' : n > 8 ? ' dai' : ''; }

  function matTruoc(q) {
    const ct = q.cau_truc;
    if (ct && ct.loai === 'nhan_tong' && ct.chieu === 'tranh_nhan') {
      let h = '<span class="lt-tranh">';
      for (let i = 0; i < ct.b; i++) {
        h += '<span class="lt-nhom-vat">';
        for (let j = 0; j < ct.a; j++) h += '<i>' + esc(ct.vat || '●') + '</i>';
        h += '</span>';
      }
      return h + '</span>';
    }
    return '<b class="' + lopChu(q.the).trim() + '">' + esc(q.the) + '</b>';
  }

  function ve(moi) {
    const hinh = s.o.hinhThe || '';
    dom.phep.innerHTML = s.ban.phep.map(function (c) {
      const lat = c.tt !== 'up';
      const lop = ['lt-the', 'lt-the-phep'];
      if (lat) lop.push('lat');
      if (c.tt === 'xong' || c.tt === 'bo') lop.push('het');
      if (c === s.cur) lop.push('dang');
      if (moi) lop.push('chia');
      return '<button type="button" class="' + lop.join(' ') + '" data-i="' + c.i + '" style="--tre:' + (c.i * 0.06) + 's"' +
        ' aria-label="' + (lat ? esc(c.q.the) : 'Thẻ úp số ' + (c.i + 1)) + '"' + (c.tt === 'xong' || c.tt === 'bo' ? ' disabled' : '') + '>' +
        '<span class="lt-mat lt-sau"><img src="' + hinh + '" alt=""></span>' +
        '<span class="lt-mat lt-truoc">' + matTruoc(c.q) + '</span></button>';
    }).join('');
    dom.kq.innerHTML = s.ban.kq.map(function (k) {
      const lop = ['lt-the', 'lt-the-kq', 'lat'];
      if (k.tt === 'xong' || k.tt === 'bo') lop.push('het');
      if (k.tt === 'gach') lop.push('gach');
      if (k.sai) lop.push('sai');
      if (k.dung) lop.push('dung');
      if (moi) lop.push('chia');
      const t = NH().hienGiaTri(k.gia_tri);
      return '<button type="button" class="' + lop.join(' ') + '" data-i="' + k.i + '" style="--tre:' + (0.3 + k.i * 0.05) + 's"' +
        (k.tt === 'xong' || k.tt === 'bo' || k.tt === 'gach' ? ' disabled' : '') + ' aria-label="' + esc(t) + '">' +
        '<span class="lt-mat lt-truoc"><b class="' + lopChu(t).trim() + '">' + esc(t) + '</b></span></button>';
    }).join('');
    dom.soCap.textContent = s.cap;
  }

  function theEl(nhom, i) { return (nhom === 'phep' ? dom.phep : dom.kq).querySelector('[data-i="' + i + '"]'); }

  /* ---------------- Thao tác ---------------- */

  function latThe(i) {
    if (!s || s.khoa || K().dangKhoa()) return;
    const c = s.ban.phep[i];
    if (!c || c.tt !== 'up') return;
    if (s.cur) {
      K().bao('Con tìm thẻ anh em của thẻ đang mở trước nhé');
      const el = theEl('phep', s.cur.i);
      if (el) { el.classList.remove('nhac'); void el.offsetWidth; el.classList.add('nhac'); }
      return;
    }
    c.tt = 'mo';
    const luaChon = s.ban.kq.filter(function (k) { return k.tt === 'mo'; })
      .map(function (k) { return { gia_tri: k.gia_tri, vi_tri: 'the_kq_' + (k.i + 1) }; });
    const q = s.van.hienCau(c.q, luaChon);
    s.cur = c;
    s.van.thaoTac('lat', { doi_tuong: 'the_phep', vi_tri: 'the_phep_' + (i + 1), gia_tri: q.the });
    AT().bat('doi_lan');
    K().anGoiY();
    K().de(String(q.the).length <= 16 ? 'Thẻ anh em của ' + q.the + ' là thẻ nào?' : 'Tìm thẻ anh em của thẻ vừa lật', q.de_doc, { nay: true, docNgay: true });
    K().tienDo();
    ve(false);
  }

  function chonKetQua(i) {
    if (!s || s.khoa || K().dangKhoa()) return;
    const k = s.ban.kq[i];
    if (!k || k.tt !== 'mo') return;
    if (!s.cur) {
      K().bao('Con lật một thẻ phép tính trước nhé');
      return;
    }
    const viTri = 'the_kq_' + (i + 1);
    s.van.thaoTac('chon', { doi_tuong: 'the_kq', vi_tri: viTri, gia_tri: k.gia_tri });
    const kq = s.van.traLoi(k.gia_tri, { vi_tri: viTri });
    if (!kq) return;
    if (kq.dung) { ghepDung(k, kq); return; }
    AT().bat('sai');
    if (kq.thuLai) {
      k.sai = true;
      ve(false);
      K().bao(kq.loiNoi + '. Con thử lại nhé', 'sai', 2.8);
      setTimeout(function () { k.sai = false; if (s) ve(false); }, 800);
      return;
    }
    k.sai = true;
    ve(false);
    s.khoa = true;
    setTimeout(function () {
      if (!s) return;
      K().phanHoiCau(s.cur.q, k.gia_tri, kq, function () {
        k.sai = false;
        const dung = s.ban.kq.find(function (x) { return String(x.gia_tri) === String(s.cur.q.dap_an); });
        if (dung) dung.dung = true;
        ve(false);
        setTimeout(function () {
          if (!s) return;
          s.cur.tt = 'bo';
          if (dung) { dung.tt = 'bo'; dung.dung = false; }
          s.cur = null;
          s.khoa = false;
          K().de('Lật một thẻ phép tính', null);
          ve(false);
          sauMotCap();
        }, 900);
      });
    }, 450);
  }

  function ghepDung(k, kq) {
    const c = s.cur;
    const elK = theEl('kq', k.i);
    const p = elK ? K().tamCua(elK) : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    s.chuoi = kq.ketQua === 'dung_ngay' ? s.chuoi + 1 : 0;
    s.cap++;
    const diem = kq.ketQua === 'dung_ngay' ? 100 + (s.chuoi >= 3 ? 50 : 0) : 40;
    K().congDiem(diem, p.x, p.y - 40, kq.quaMong ? '+' + kq.quaMong + ' quả mọng' : null);
    K().phao(p.x, p.y, 16);
    AT().bat('dung');
    if (s.chuoi >= 3) K().bao(s.chuoi + ' cặp đúng liền!', 'dung', 1.6);
    k.dung = true;
    ve(false);
    s.khoa = true;
    setTimeout(function () {
      if (!s) return;
      c.tt = 'xong';
      k.tt = 'xong';
      k.dung = false;
      s.cur = null;
      s.khoa = false;
      K().anGoiY();
      K().de('Lật một thẻ phép tính', null);
      K().tienDo();
      ve(false);
      sauMotCap();
    }, 650);
  }

  function sauMotCap() {
    // thẻ bị gạch khi gợi ý chỉ sai với câu vừa xong: mở lại cho các câu sau
    s.ban.kq.forEach(function (k) { if (k.tt === 'gach') k.tt = 'mo'; });
    ve(false);
    const con = s.ban.phep.some(function (c) { return c.tt === 'up'; });
    if (con) return;
    if (s.van.conCau()) setTimeout(function () { if (s) moBan(); }, 400);
    else ketThuc();
  }

  /** Gợi ý ba cấp; cấp 3 gạch bớt một thẻ sai (ưu tiên thẻ lệch nhỏ, giữ lại thẻ mang lỗi có tên). */
  function goiY() {
    if (!s || K().dangKhoa()) return;
    if (!s.cur) { K().bao('Con lật một thẻ phép tính trước nhé'); return; }
    const q = s.van.q;
    if (!q || q.xong) return;
    let them = null;
    if (q.goiYCap + 1 === 3) {
      const sai = s.ban.kq.filter(function (k) { return k.tt === 'mo' && String(k.gia_tri) !== String(q.dap_an); });
      sai.sort(function (a, b) { return (coTen(q, a.gia_tri) ? 1 : 0) - (coTen(q, b.gia_tri) ? 1 : 0); });
      if (sai[0]) { sai[0].tt = 'gach'; them = { loai_bo: sai[0].gia_tri }; }
    }
    K().goiY(them);
    ve(false);
  }

  /* ---------------- Kết thúc ---------------- */

  function ketThuc() {
    const o = s.o;
    const diem = K().diem();
    const cap = s.cap;
    K().dong();
    s.van.ketThuc(false, { diem: diem, so_cap: cap }).then(function (kq) {
      kq.diem = diem;
      kq.dongPhu = 'Ghép được ' + cap + ' cặp anh em · ' + diem.toLocaleString('vi-VN') + ' điểm';
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

  window.LatThe = { batDau: batDau, _trangThai: function () { return s; } };
})();
