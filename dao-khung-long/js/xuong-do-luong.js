/* ============================================================
   xuong-do-luong.js – Game Xưởng Đo Lường (vùng 3, Giáp Long): cân, rót, đo như SGK Toán 2 Bài 15 đến 18, 55, 57
   - Cân đĩa: đòn cân nghiêng mượt theo khối lượng hai bên. Bé kéo quả cân 1, 2, 5 kg (hoặc quả chanh, quả cam) từ kệ
     lên đĩa bên phải, kéo ra để bỏ; cách chạm: chạm quả cân rồi chạm đĩa, chạm quả cân trên đĩa để bỏ.
     Cân thăng bằng rồi mới chọn số ki-lô-gam. Câu "bên nào nặng hơn" chạm thẳng vào đĩa cân hoặc thẻ.
   - Trạm rót nước: chạm (hoặc giữ) nút Rót để đổ từng ca 1 l vào can; mực nước dâng, hàng ca đã rót đếm được.
     Rót đầy rồi chọn số lít, hoặc rót tới vạch rồi bấm Xong (nút Bớt 1 l để sửa).
   - Bàn thước: kéo thước (hoặc nút mũi tên) cho vạch 0 trùng đầu đồ vật, đọc số rồi gõ trên bàn phím số.
   - Hộp đơn vị: kéo thẻ đồ vật vào hộp cm, dm, m, km (hoặc chạm hộp).
   - Câu còn lại: hình của ngân hàng câu với thẻ lựa chọn hoặc bàn phím số.
   Chỉ chấm đáp án cuối (traLoi), thử 2 lần; sai hẳn thì màn "Gần đúng rồi" có hình trạng thái đúng.
   Ghi: keo, dat, bo_ra, cham, tha (quả cân, thẻ), rot, bo_ra (nước), keo_thuoc, chon, go_so, xoa, dem (thước 2 dm).
   Bài học 30 giây: ki-lo-gam (Bài 15), lit (Bài 16), do-dai (Bài 55).
   API: window.XuongDoLuong = { batDau(o), _trangThai() }
   ============================================================ */
(function () {
  'use strict';

  const CO_GIAM_DONG = (function () { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();
  const NGUONG_KEO = 8;
  const TOI_DA_DIA = 6;

  let s = null;
  let dom = null;

  function $(id) { return document.getElementById(id); }
  function K() { return window.KhungChoi; }
  function NH() { return window.NganHang; }
  function AT() { return window.AmThanh; }
  function C() { return window.CauDoLuong; }
  function esc(t) { return C().esc(t); }
  function an(el, b) { if (el) el.classList.toggle('hidden', !!b); }
  function rung(el) { if (!el) return; el.classList.remove('rung'); void el.getBoundingClientRect(); el.classList.add('rung'); }
  function tong(ds) { return ds.reduce(function (t, x) { return t + x; }, 0); }

  function khoiDom() {
    let san = $('xd-san');
    if (!san) {
      san = document.createElement('div');
      san.id = 'xd-san';
      san.className = 'kc-game xd-san';
      K().san().appendChild(san);
    }
    if (dom && dom.san === san) return dom;
    san.innerHTML =
      '<section class="xd-canh" id="xd-canh" aria-label="Bàn làm việc">' +
        '<p class="xd-trang-thai hidden" id="xd-trang-thai" role="status"></p>' +
        '<div class="xd-khung" id="xd-khung"></div>' +
        '<div class="xd-khay hidden" id="xd-khay"></div>' +
        '<div class="xd-dung hidden" id="xd-dung" aria-live="polite"><b id="xd-dung-chu"></b></div>' +
      '</section>' +
      '<aside class="xd-ben" id="xd-ben">' +
        '<img class="xd-tho" id="xd-tho" alt="">' +
        '<p class="xd-ben-nhan" id="xd-ben-nhan"></p>' +
        '<div class="xd-lc" id="xd-lc"></div>' +
      '</aside>' +
      '<div class="xd-bong-keo hidden" id="xd-bong-keo" aria-hidden="true"></div>';
    dom = { san: san };
    ['canh', 'trang-thai', 'khung', 'khay', 'dung', 'dung-chu', 'ben', 'tho', 'ben-nhan', 'lc', 'bong-keo'].forEach(function (k) {
      dom[k.replace(/-([a-z])/g, function (m, c) { return c.toUpperCase(); })] = $('xd-' + k);
    });
    san.addEventListener('pointerdown', xuongNhan);
    san.addEventListener('pointermove', diChuyen);
    san.addEventListener('pointerup', nhaRa);
    san.addEventListener('pointercancel', huyKeo);
    san.addEventListener('lostpointercapture', function (e) { if (s && s.keo && s.keo.pid === e.pointerId) huyKeo(); });
    san.addEventListener('click', bamNut);
    return dom;
  }

  /**
   * o: xem vaoMan trong app.js ({ van, man, che_do, nen, phu, hinhGoiY, anh(ten), xemBaiHoc, onXong(kq), onThoat(kq), … })
   */
  function batDau(o) {
    khoiDom();
    dom.san.classList.remove('hidden');
    s = { o: o, van: o.van, q: null, khoa: false, keo: null, chuoi: 0, soDung: 0, tk: { can: 0, rot: 0, do: 0, dv: 0 } };
    dom.tho.src = o.anh ? o.anh('sp-giap-long') : '';
    K().mo({
      van: o.van, game: 'xuong-do-luong', tenGame: 'Xưởng Đo Lường', nen: o.nen, phu: o.phu, hinhGoiY: o.hinhGoiY,
      onGoiY: goiY, onThoat: thoat, xemBaiHoc: o.xemBaiHoc, onPhim: phim, onTamDung: function () { dungGiu(); huyKeo(); }
    });
    s.van.batDau({ che_do: o.che_do || (o.man && o.man.che_do) || null });
    cauMoi();
  }

  /* ---------------- Câu mới, dựng cảnh ---------------- */

  function donCanh() {
    if (!s) return;
    dungGiu();
    huyKeo();
    if (s.can && s.can.raf) cancelAnimationFrame(s.can.raf);
    (s.hen || []).forEach(clearTimeout);
    s.hen = [];
    s.can = null; s.rot = null; s.thuoc = null; s.pl = null; s.dem = null;
    an(dom.dung, true);
    dom.san.classList.remove('xd-thang');
  }
  /** Hẹn giờ của ván: bé đang tạm dừng thì chờ bé chơi tiếp mới chạy (KhungChoi.khiChoi). */
  function hen(f, ms) { const t = setTimeout(function () { if (s) K().khiChoi(function () { if (s) f(); }); }, ms); s.hen.push(t); return t; }

  function cauMoi() {
    if (!s) return;
    donCanh();
    if (!s.van.conCau()) { ketThuc(); return; }
    const q = s.van.cauTiep();
    s.q = q;
    s.khoa = false;
    s.nhap = '';
    s.xd = q.xd || C().canhCua(q.cau_truc);
    K().anGoiY();
    K().de(q.de, q.de_doc, { nay: true, docNgay: true });
    K().tienDo();
    dungCanh(q, s.xd);
  }

  function dungCanh(q, xd) {
    dom.san.setAttribute('data-canh', xd.canh);
    dom.khay.innerHTML = '';
    dom.khay.className = 'xd-khay hidden';
    trangThai('');
    if (xd.canh === 'can') canhCan(q, xd);
    else if (xd.canh === 'rot') canhRot(q, xd);
    else if (xd.canh === 'thuoc') canhThuoc(q, xd);
    else if (xd.canh === 'phan_loai') canhPhanLoai(q, xd);
    else canhTranh(q, xd);
    benPhai(q, xd);
  }

  function trangThai(chu, loai) {
    dom.trangThai.textContent = chu || '';
    dom.trangThai.className = 'xd-trang-thai' + (chu ? '' : ' hidden') + (loai ? ' ' + loai : '');
  }

  function svgCua() { return dom.khung.querySelector('svg'); }
  function toaDoSvg(svg, x, y) {
    const m = svg && svg.getScreenCTM ? svg.getScreenCTM() : null;
    if (!m) return null;
    const p = svg.createSVGPoint();
    p.x = x; p.y = y;
    return p.matrixTransform(m.inverse());
  }

  /* ---------------- Cân đĩa ---------------- */

  function monCua(x) { return x[0] === 'qc1' ? [{ kg: 1 }] : [{ vat: x[0], n: x[1] }]; }

  function canhCan(q, xd) {
    const ct = q.cau_truc;
    const c = { tuongTac: !!xd.tuong_tac, ke: [], thuTu: [], chonKe: null, goc: 0, vt: 0, dich: 0, raf: 0, t: 0, soThaoTac: 0, khoiTrai: 0, don: 'kg', thang: false, daThang: false };
    s.can = c;
    let phai = [];
    if (ct.loai === 'nang_nhe' && ct.kieu === 'so_sanh') {
      c.docCan = true;
      c.trai = monCua(ct.trai);
      phai = monCua(ct.phai);
      c.dichDoc = C().gocTheoLech(ct.lech);
    } else if (ct.loai === 'nang_nhe') {
      c.don = 'qua';
      c.u = ct.u;
      c.trai = [{ vat: ct.x, n: 1 }];
      c.khoiTrai = ct.n;
      if (c.tuongTac) for (let i = 0; i < Math.min(8, ct.n + 2); i++) c.ke.push({ i: i, kg: 1, tren: false });
      else phai = [{ vat: ct.u, n: ct.n }];
    } else {
      c.trai = [{ vat: ct.vat, n: 1 }].concat((ct.qt || []).map(function (w) { return { kg: w }; }));
      c.khoiTrai = tong(ct.qp);
      if (c.tuongTac) ct.qp.concat(ct.ke || []).sort(function (a, b) { return a - b; }).forEach(function (kg, i) { c.ke.push({ i: i, kg: kg, tren: false }); });
      else phai = ct.qp.map(function (w) { return { kg: w }; });
    }
    const vung = '<rect id="xd-vung-trai" x="-300" y="-84" width="292" height="320" fill="transparent"/><rect id="xd-vung-phai" x="8" y="-84" width="292" height="320" fill="transparent"/>';
    dom.khung.innerHTML = C().bocSvg(C().VB_CAN, vung + C().veCan({ trai: c.trai, phai: phai, goc: 0, id: 'xd' }), 'Cân đĩa', 'xd-hinh xd-hinh-can' + (c.docCan && ct.hoi !== 'quan_he' ? ' xd-cham-dia' : ''));
    c.el = { don: $('xd-don'), trai: $('xd-dia-trai'), phai: $('xd-dia-phai'), doPhai: $('xd-do-phai') };
    if (c.docCan) {
      // cân từ từ nghiêng về đúng trạng thái để bé nhìn
      hen(function () { datGoc(c.dichDoc); AT().bat('doi_lan'); }, CO_GIAM_DONG ? 0 : 450);
      return;
    }
    if (!c.tuongTac) { c.thang = true; return; }
    const tenU = c.don === 'kg' ? 'Quả cân' : C().hoa(C().VAT[c.u].ten);
    dom.khay.innerHTML = '<span class="xd-khay-nhan">' + esc(tenU) + '</span><div class="xd-ke" id="xd-ke">' +
      c.ke.map(function (x) {
        const nhan = c.don === 'kg' ? 'Quả cân ' + x.kg + ' ki-lô-gam' : C().VAT[c.u].ten;
        return '<button type="button" class="xd-ke-mon' + (c.don === 'kg' ? '' : ' xd-ke-qua') + '" data-i="' + x.i + '" aria-label="' + esc(nhan) + '">' + monKe(x) + '</button>';
      }).join('') + '</div><span class="xd-khay-goi">Kéo lên đĩa bên phải</span>';
    dom.khay.classList.toggle('xd-khay-qua', c.don !== 'kg');
    an(dom.khay, false);
    datGoc(C().gocTheoChenh(-c.khoiTrai));
    capNhatTrangThaiCan();
  }
  function monKe(x) {
    const c = s.can;
    if (c.don === 'kg') return C().svgQuaCan(x.kg);
    return '<span class="xd-ke-e">' + C().VAT[c.u].e + '</span>';
  }
  function khoiPhai() { const c = s.can; return c.thuTu.reduce(function (t, i) { return t + c.ke[i].kg; }, 0); }
  function tenMon(x) { return s.can.don === 'kg' ? 'qua_can_' + x.kg + 'kg' : 'qua_' + s.can.u; }

  function datGoc(dich) {
    const c = s && s.can;
    if (!c) return;
    c.dich = dich;
    if (CO_GIAM_DONG) { c.goc = dich; c.vt = 0; veGoc(dich); return; }
    if (!c.raf) { c.t = 0; c.raf = requestAnimationFrame(buocCan); }
  }
  /** Lò xo tắt dần: đòn cân lắc nhẹ rồi dừng đúng góc. */
  function buocCan(t) {
    const c = s && s.can;
    if (!c || !c.el) return;
    const dt = c.t ? Math.min(0.04, (t - c.t) / 1000) : 0.016;
    c.t = t;
    const a = -70 * (c.goc - c.dich) - 10 * c.vt;
    c.vt += a * dt;
    c.goc += c.vt * dt;
    if (Math.abs(c.goc - c.dich) < 0.04 && Math.abs(c.vt) < 0.08) { c.goc = c.dich; c.vt = 0; veGoc(c.goc); c.raf = 0; return; }
    veGoc(c.goc);
    c.raf = requestAnimationFrame(buocCan);
  }
  function veGoc(g) {
    const c = s.can, e = c.el;
    if (!e.don) return;
    e.don.setAttribute('transform', 'rotate(' + Math.round(g * 100) / 100 + ')');
    const t = C().diemTreo(g, 'trai'), p = C().diemTreo(g, 'phai');
    e.trai.setAttribute('transform', 'translate(' + t.x + ' ' + t.y + ')');
    e.phai.setAttribute('transform', 'translate(' + p.x + ' ' + p.y + ')');
  }

  function veDiaPhai() {
    const c = s.can;
    const mon = c.don === 'kg' ? c.thuTu.map(function (i) { return { kg: c.ke[i].kg, i: i }; }) : (c.thuTu.length ? [{ vat: c.u, n: c.thuTu.length }] : []);
    c.el.doPhai.innerHTML = C().veDo(mon);
    c.ke.forEach(function (x) {
      const b = dom.khay.querySelector('.xd-ke-mon[data-i="' + x.i + '"]');
      if (!b) return;
      b.classList.toggle('trong', x.tren);
      b.classList.toggle('chon', c.chonKe === x.i);
      b.setAttribute('aria-label', (x.tren ? 'Lấy lại ' : '') + (c.don === 'kg' ? 'quả cân ' + x.kg + ' ki-lô-gam' : C().VAT[c.u].ten) + (x.tren ? ' từ đĩa cân' : ''));
    });
    const R = khoiPhai(), d = R - c.khoiTrai;
    c.thang = d === 0 && c.thuTu.length > 0;
    datGoc(C().gocTheoChenh(d));
    capNhatTrangThaiCan();
    moLuaChon(c.thang);
    dom.san.classList.toggle('xd-thang', c.thang);
    if (c.thang && !c.daThang) {
      c.daThang = true;
      AT().bat('qua_mong');
      const kim = c.el.don ? K().tamCua(c.el.don) : null;
      if (kim) K().phao(kim.x, kim.y - 40, 8);
    }
  }
  function capNhatTrangThaiCan() {
    const c = s.can;
    if (!c || !c.tuongTac) return;
    const d = khoiPhai() - c.khoiTrai;
    if (c.thang) trangThai('Cân thăng bằng rồi!', 'thang');
    else if (c.don === 'qua') trangThai('Cân chưa thăng bằng', 'lech');
    else trangThai(d < 0 ? 'Bên trái đang nặng hơn' : 'Bên phải đang nặng hơn', 'lech');
  }

  function datQuaCan(i, cach) {
    const c = s.can, x = c && c.ke[i];
    if (!x || x.tren || s.khoa) return;
    if (c.thuTu.length >= TOI_DA_DIA) { K().bao('Đĩa đầy rồi, con bỏ bớt ra nhé'); return; }
    x.tren = true;
    c.thuTu.push(i);
    c.chonKe = null;
    c.soThaoTac++;
    AT().bat('doi_lan');
    veDiaPhai();
    s.van.thaoTac('dat', { doi_tuong: tenMon(x), den: 'dia_phai', gia_tri: x.kg, trai: c.khoiTrai, phai: khoiPhai(), thang_bang: c.thang, cach: cach });
  }
  function boRa(i, cach) {
    const c = s.can, x = c && c.ke[i];
    if (!x || !x.tren || s.khoa) return;
    x.tren = false;
    c.thuTu.splice(c.thuTu.indexOf(i), 1);
    c.soThaoTac++;
    AT().bat('cham');
    veDiaPhai();
    s.van.thaoTac('bo_ra', { doi_tuong: tenMon(x), tu: 'dia_phai', gia_tri: x.kg, trai: c.khoiTrai, phai: khoiPhai(), thang_bang: c.thang, cach: cach });
  }
  function chamKe(i) {
    const c = s.can, x = c && c.ke[i];
    if (!x || x.tren) return;
    c.chonKe = c.chonKe === i ? null : i;
    s.van.thaoTac('cham', { doi_tuong: tenMon(x), vi_tri: 'ke_' + (i + 1), gia_tri: x.kg });
    AT().bat('cham');
    veDiaPhai();
    if (c.chonKe != null) K().bao('Chạm vào đĩa bên phải để đặt lên cân', '', 1.8);
  }
  function chamDia(ben) {
    const c = s.can;
    const ct = s.q.cau_truc;
    if (c.docCan) {
      if (ct.hoi === 'quan_he') return;
      const k = (s.q.lua_chon || []).findIndex(function (x) { return x.gia_tri === ben; });
      const nut = dom.lc.querySelector('.xd-lc-nut[data-i="' + k + '"]');
      if (nut && nut.disabled) return;
      s.van.thaoTac('chon', { doi_tuong: 'dia_can', gia_tri: ben, vi_tri: 'dia_' + ben });
      chot(ben, { cach: 'cham_dia' });
      return;
    }
    if (!c.tuongTac) return;
    if (ben === 'trai') { K().bao(c.don === 'kg' ? 'Quả cân đặt ở đĩa bên phải nhé' : 'Đặt quả lên đĩa bên phải nhé'); return; }
    if (c.chonKe != null) { datQuaCan(c.chonKe, 'cham'); return; }
    if (c.don === 'qua' && c.thuTu.length) { boRa(c.thuTu[c.thuTu.length - 1], 'cham'); return; }
    K().bao(c.don === 'kg' ? 'Kéo quả cân từ kệ lên đĩa nhé' : 'Kéo quả từ kệ lên đĩa nhé', '', 1.8);
  }
  function trongVung(x, y) {
    const svg = svgCua();
    const p = toaDoSvg(svg, x, y);
    if (!p || p.y < -90 || p.y > 250) return null;
    if (p.x > 12 && p.x < 305) return 'phai';
    if (p.x < -12 && p.x > -305) return 'trai';
    return null;
  }
  function extraCan() {
    const c = s.can;
    if (!c || c.docCan) return {};
    const du = { trai: c.khoiTrai, phai: c.tuongTac ? khoiPhai() : c.khoiTrai, thang_bang: !!c.thang };
    if (c.don === 'kg') du.qua_can = c.tuongTac ? c.thuTu.map(function (i) { return c.ke[i].kg; }) : s.q.cau_truc.qp.slice();
    else du.so_qua = c.tuongTac ? c.thuTu.length : s.q.cau_truc.n;
    if (c.tuongTac) du.so_thao_tac = c.soThaoTac;
    return du;
  }
  /** Gợi ý cấp 3: đặt đúng các quả cân lên đĩa cho bé (bé vẫn phải tự cộng). */
  function datHoCan() {
    const c = s.can, ct = s.q.cau_truc;
    c.ke.forEach(function (x) { x.tren = false; });
    c.thuTu = [];
    const can = c.don === 'kg' ? ct.qp.slice() : Array(ct.n).fill(1);
    can.forEach(function (kg) {
      const x = c.ke.find(function (y) { return !y.tren && y.kg === kg; });
      if (x) { x.tren = true; c.thuTu.push(x.i); }
    });
    c.chonKe = null;
    veDiaPhai();
    return can;
  }

  /* ---------------- Trạm rót nước ---------------- */

  function canhRot(q) {
    const ct = q.cau_truc;
    const laVach = ct.kieu === 'vach';
    const loai = laVach ? 'binh' : ct.vat;
    const B = C().BINH[loai];
    const r = { max: laVach ? ct.max : ct.l, nuoc: 0, soCa: 0, bot: 0, dang: false, dangGiu: false, laVach: laVach, loai: loai, cao: laVach ? 270 : Math.min(262, B.cao + 26), rong: laVach ? 170 : B.rong, x: 215, day: 368 };
    s.rot = r;
    const mieng = r.day - r.cao;
    let h = '<rect x="6" y="' + (r.day - 2) + '" width="648" height="30" rx="12" fill="#d8a86b" opacity=".55"/>';
    h += '<g transform="translate(' + r.x + ' ' + r.day + ')">' + C().veBinh({ loai: loai, max: r.max, nuoc: 0, vach: laVach ? 1 : 0, ghi: 2, rong: r.rong, cao: r.cao, id: 'xd-binh', day: !laVach, danhDau: laVach ? ct.l : null }) + '</g>';
    h += '<rect id="xd-dong" class="xd-dong-nuoc" x="' + (r.x + r.rong / 2 - 34) + '" y="' + (mieng - 20) + '" width="15" height="10" rx="7" fill="#4fb3f6"/>';
    h += '<g transform="translate(520 ' + (r.day - 60) + ')"><g id="xd-ca" class="xd-ca">' + C().veCa('1 l', 1, 1.35, 'xd-ca-nuoc') + '</g></g>';
    h += '<g id="xd-nhan-day" class="xd-nhan-day hidden">' + C().nhanTron(r.x, mieng - 36, 'Đầy rồi!', '#06d6a0', '#053d33', 28) + '</g>';
    dom.khung.innerHTML = C().bocSvg([0, -44, 660, 454], h, 'Trạm rót nước', 'xd-hinh xd-hinh-rot');
    dom.khay.innerHTML = '<button type="button" class="nut nut-cam xd-nut-rot" id="xd-nut-rot" aria-label="Rót một ca 1 lít"><span class="xd-rot-bieu">' + C().bocSvg([-44, -84, 104, 90], C().veCa('1 l', 1), 'Ca 1 lít', 'xd-hinh-ca') + '</span>Rót</button>' +
      (laVach ? '<button type="button" class="nut nut-trang xd-nut-bot" id="xd-nut-bot" disabled>Bớt 1 l</button>' : '') +
      '<div class="xd-da-rot" id="xd-da-rot"><span>Đã rót:</span><span class="xd-da-rot-ds" id="xd-da-rot-ds"></span></div>';
    an(dom.khay, false);
  }
  function veNuoc() {
    const r = s.rot;
    const el = $('xd-binh-nuoc');
    if (el) el.style.transform = 'translateY(' + (C().mucNuoc(r.nuoc, r.max, r.cao) - C().mucNuoc(0, r.max, r.cao)) + 'px)';
    const ds = $('xd-da-rot-ds');
    if (ds) {
      let h = '';
      for (let i = 0; i < r.nuoc; i++) h += '<i class="xd-ca-nho">1 l</i>';
      ds.innerHTML = h;
    }
    const bot = $('xd-nut-bot');
    if (bot) bot.disabled = r.nuoc <= 0 || s.khoa;
    const xong = $('xd-nut-xong');
    if (xong) xong.disabled = r.nuoc <= 0 || s.khoa;
  }
  function rotMot() {
    const r = s && s.rot;
    if (!r || r.dang || s.khoa || K().dangKhoa()) return;
    if (r.nuoc >= r.max) {
      rung($('xd-nut-rot'));
      K().bao(r.laVach ? 'Bình đầy rồi! Rót quá thì bấm Bớt 1 l' : 'Đầy rồi, không rót thêm được nữa', 'sai', 2);
      s.van.thaoTac('rot', { doi_tuong: 'ca_1l', den: r.loai, gia_tri: r.nuoc, tran: true });
      dungGiu();
      return;
    }
    r.dang = true;
    const ca = $('xd-ca'), dong = $('xd-dong'), nuocCa = $('xd-ca-nuoc');
    const mieng = r.day - r.cao;
    // ca quay quanh tâm hộp bao (transform-box: fill-box): tính vị trí vòi sau khi nghiêng để dòng nước chảy đúng từ vòi
    const k = 1.35, g = -64 * Math.PI / 180;
    const tx = 8 * k, ty = -39 * k, vx = -42 * k - tx, vy = -80 * k - ty;
    const sx = tx + vx * Math.cos(g) - vy * Math.sin(g), sy = ty + vx * Math.sin(g) + vy * Math.cos(g);
    const dichX = r.x + r.rong / 2 - 32, dichY = mieng - 16;
    const dx = Math.round(dichX - (520 + sx)), dy = Math.round(dichY - (r.day - 60 + sy));
    const nhanh = CO_GIAM_DONG;
    if (ca) ca.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(-64deg)';
    AT().bat('doi_lan');
    hen(function () {
      const yMat = r.day + C().mucNuoc(r.nuoc + 1, r.max, r.cao);
      if (dong) { dong.setAttribute('x', Math.round(dichX - 7)); dong.setAttribute('y', Math.round(dichY)); dong.setAttribute('height', Math.max(10, Math.round(yMat - dichY))); dong.classList.add('chay'); }
      if (nuocCa) nuocCa.classList.add('can');
      r.nuoc++;
      r.soCa++;
      s.tk.rot++;
      veNuoc();
      s.van.thaoTac('rot', { doi_tuong: 'ca_1l', den: r.loai, gia_tri: r.nuoc });
    }, nhanh ? 0 : 280);
    hen(function () {
      if (dong) dong.classList.remove('chay');
      if (ca) ca.style.transform = '';
    }, nhanh ? 60 : 820);
    hen(function () {
      if (nuocCa) nuocCa.classList.remove('can');
      r.dang = false;
      if (!r.laVach && r.nuoc >= r.max) {
        an($('xd-nhan-day'), false);
        AT().bat('qua_mong');
        moLuaChon(true);
        trangThai('Đầy rồi! Con đếm số ca đã rót nhé', 'thang');
        dungGiu();
        return;
      }
      if (r.dangGiu) hen(rotMot, 90);
    }, nhanh ? 120 : 1050);
  }
  function batDauRot(e) {
    const r = s.rot;
    if (!r) return;
    r.dangGiu = true;
    r.boQuaClick = true;
    try { e.target.setPointerCapture(e.pointerId); } catch (er) { /* bỏ qua */ }
    rotMot();
  }
  function dungGiu() { if (s && s.rot) s.rot.dangGiu = false; }
  function botNuoc() {
    const r = s.rot;
    if (!r || r.dang || r.nuoc <= 0 || s.khoa) return;
    r.nuoc--;
    r.bot++;
    AT().bat('cham');
    veNuoc();
    s.van.thaoTac('bo_ra', { doi_tuong: 'nuoc', tu: 'binh', gia_tri: r.nuoc });
  }
  function xongRot() {
    const r = s.rot;
    if (!r || r.dang || r.nuoc <= 0) return;
    chot(r.nuoc, { so_ca: r.soCa, bot: r.bot });
  }
  function doDay() {
    const r = s.rot;
    const them = r.max - r.nuoc;
    r.nuoc = r.max;
    veNuoc();
    an($('xd-nhan-day'), false);
    moLuaChon(true);
    trangThai('Đầy rồi! Con đếm số ca đã rót nhé', 'thang');
    return them;
  }

  /* ---------------- Bàn thước ---------------- */

  function canhThuoc(q) {
    const ct = q.cau_truc;
    const px = C().PX_CM, X0 = C().X0_THUOC, Y0 = 132;
    const k0 = ct.kieu === 'lech' ? ct.dau : -2.5;
    const t = { k: k0, rx: X0 - k0 * px, px: px, X0: X0, Y0: Y0, dai: ct.dai, soLanKeo: 0, kMin: -3, kMax: 15 - ct.dai };
    s.thuoc = t;
    let h = '<rect x="-40" y="46" width="840" height="200" rx="24" fill="#e2b77f" stroke="#b9854a" stroke-width="4"/>';
    h += '<path d="M40 70 H300 M420 84 H720 M60 224 H340 M470 214 H700" stroke="#c99a5e" stroke-width="3" stroke-linecap="round" opacity=".7"/>';
    h += '<g id="xd-thuoc" class="xd-thuoc" style="transform: translate(' + t.rx + 'px,' + Y0 + 'px)">' + C().veThuoc({ px: px }) + '<rect x="' + (-0.7 * px) + '" y="0" width="' + (16.4 * px) + '" height="62" fill="transparent"/></g>';
    h += '<g transform="translate(' + X0 + ' ' + (Y0 - C().caoVatDo(ct.vat)) + ')" pointer-events="none">' + C().veVatDo(ct.vat, ct.dai, px, ct.dai) + '</g>';
    h += '<g id="xd-so-khoang"></g>';
    dom.khung.innerHTML = C().bocSvg([0, 30, 760, 232], h, 'Bàn đo: ' + C().tenVatDo(ct.vat) + ' và thước xăng-ti-mét', 'xd-hinh xd-hinh-thuoc');
    dom.khay.innerHTML = '<button type="button" class="nut nut-trang xd-nut-dich" data-dich="-1" aria-label="Dịch thước sang trái 1 xăng-ti-mét">◀</button>' +
      '<span class="xd-khay-goi">Kéo thước cho vạch 0 trùng đầu ' + esc(C().tenVatDo(ct.vat)) + '</span>' +
      '<button type="button" class="nut nut-trang xd-nut-dich" data-dich="1" aria-label="Dịch thước sang phải 1 xăng-ti-mét">▶</button>';
    an(dom.khay, false);
  }
  function datThuoc(rx, muot) {
    const t = s.thuoc, el = $('xd-thuoc');
    t.rx = rx;
    if (!el) return;
    el.classList.toggle('xd-muot', !!muot);
    el.style.transform = 'translate(' + Math.round(rx * 10) / 10 + 'px,' + t.Y0 + 'px)';
  }
  function thaThuoc(cach, kMoi) {
    const t = s.thuoc;
    const truoc = t.k;
    let k = kMoi != null ? kMoi : Math.round((t.X0 - t.rx) / t.px);
    k = Math.max(t.kMin, Math.min(t.kMax, k));
    t.k = k;
    if (cach !== 'goi_y') { t.soLanKeo++; s.tk.do++; }
    datThuoc(t.X0 - k * t.px, true);
    AT().bat('cham');
    if (cach !== 'goi_y') s.van.thaoTac('keo_thuoc', { doi_tuong: 'thuoc', gia_tri: k, vach_cuoi: k + t.dai, vach_truoc: Math.round(truoc * 10) / 10, cach: cach });
    if (k === 0) trangThai('Vạch 0 trùng đầu ' + C().tenVatDo(s.q.cau_truc.vat) + ' rồi', 'thang');
    else trangThai('');
  }
  function dichThuoc(d) {
    const t = s.thuoc;
    if (!t || s.khoa) return;
    const kCu = (t.X0 - t.rx) / t.px;
    thaThuoc('nut', Math.round(kCu) - d);
  }
  /** Gợi ý cấp 3 của câu thước lệch: đánh số từng khoảng 1 cm trên đồ vật. */
  function danhSoKhoang() {
    const t = s.thuoc, g = $('xd-so-khoang');
    if (!g) return;
    let h = '';
    for (let i = 1; i <= t.dai; i++) h += C().chuSvg(t.X0 + (i - 0.5) * t.px, t.Y0 - C().caoVatDo(s.q.cau_truc.vat) - 26, i, 22, '#d84f1d');
    g.innerHTML = h;
  }

  /* ---------------- Hộp đơn vị ---------------- */

  function canhPhanLoai(q) {
    const ct = q.cau_truc;
    const x = C().VAT_DAI[ct.vat];
    s.pl = { hop: null, soLanKeo: 0 };
    const cau = esc(C().hoa(x.ten) + ' ' + x.dong + ' ' + ct.so);
    dom.khung.innerHTML = '<div class="xd-pl">' +
      '<div class="xd-pl-the" id="xd-pl-the" role="img" aria-label="' + esc(q.de) + '"><span class="xd-pl-e">' + x.e + '</span><span class="xd-pl-cau">' + cau + ' <i class="xd-pl-o" id="xd-pl-o">?</i></span></div>' +
      '<div class="xd-pl-hang">' + C().DV.map(function (u) {
        return '<button type="button" class="xd-pl-hop" data-dv="' + u + '" aria-label="Hộp ' + C().DV_TEN[u] + '"><span class="xd-pl-nap"></span><b>' + u + '</b><small>' + C().DV_TEN[u] + '</small></button>';
      }).join('') + '</div></div>';
  }
  function hopDuoi(x, y) {
    const ds = dom.khung.querySelectorAll('.xd-pl-hop');
    for (let i = 0; i < ds.length; i++) {
      const r = ds[i].getBoundingClientRect();
      if (x >= r.left - 8 && x <= r.right + 8 && y >= r.top - 30 && y <= r.bottom + 8 && !ds[i].disabled) return ds[i];
    }
    return null;
  }
  function thaVaoHop(dv, cach) {
    if (!s.pl || s.khoa || K().dangKhoa()) return;
    const hop = dom.khung.querySelector('.xd-pl-hop[data-dv="' + dv + '"]');
    if (!hop || hop.disabled) return;
    const the = $('xd-pl-the');
    s.van.thaoTac('tha', { doi_tuong: 'the_vat', den: 'hop_' + dv, gia_tri: dv, cach: cach });
    s.tk.dv++;
    $('xd-pl-o').textContent = dv;
    if (the) { the.style.transform = ''; the.classList.add('vao'); }
    hop.classList.add('nhan');
    hen(function () { hop.classList.remove('nhan'); }, 500);
    chot(dv, { hop: dv, cach: cach });
  }

  /* ---------------- Tranh (câu đọc hình, tính, đổi đơn vị) ---------------- */

  function canhTranh(q, xd) {
    if (q.hinh) dom.khung.innerHTML = '<div class="xd-tranh' + (xd.dem_thuoc ? ' xd-dem-thuoc' : '') + '">' + q.hinh + '</div>';
    else dom.khung.innerHTML = '<div class="xd-bt"><p class="xd-bt-chu">' + esc(q.de).replace('?', '<span class="xd-o-dap" id="xd-o-dap">?</span>') + '</p></div>';
    if (xd.dem_thuoc) { s.dem = { da: {}, so: 0 }; trangThai('Chạm từng thước để đếm thêm ' + q.cau_truc.thuoc, ''); }
  }
  function demThuoc(g) {
    const d = s.dem;
    const i = +g.getAttribute('data-i');
    if (!d || d.da[i] || s.khoa) return;
    d.da[i] = 1;
    d.so += s.q.cau_truc.thuoc;
    g.classList.add('da-dem');
    const b = g.getBBox();
    g.insertAdjacentHTML('beforeend', C().chuSvg(b.x + b.width / 2, b.y + b.height + 30, d.so, 26, '#d84f1d'));
    AT().bat('cham');
    s.van.thaoTac('dem', { doi_tuong: 'thuoc_2dm', vi_tri: 'thuoc_' + (i + 1), gia_tri: d.so });
  }

  /* ---------------- Bên phải: lựa chọn, bàn phím số, nút Xong ---------------- */

  function benPhai(q, xd) {
    const nhap = xd.nhap;
    dom.ben.setAttribute('data-nhap', nhap);
    if (nhap === 'chon') {
      const lc = q.lua_chon || [];
      const cho = xd.tuong_tac;
      dom.benNhan.textContent = cho ? (xd.canh === 'rot' ? 'Rót đầy rồi thì chọn:' : 'Cân thăng bằng rồi thì chọn:') : (xd.canh === 'can' && s.can && s.can.docCan && q.cau_truc.hoi !== 'quan_he' ? 'Chạm vào đĩa cân hoặc chọn:' : 'Chọn đáp án:');
      const dau = lc.length && lc.every(function (x) { return ['<', '>', '='].indexOf(String(x.gia_tri)) >= 0; });
      dom.lc.className = 'xd-lc xd-lc-chon' + (lc.length > 3 ? ' bon' : '') + (dau ? ' xd-lc-dau' : '');
      dom.lc.innerHTML = lc.map(function (x, k) {
        const v = NH().veLuaChon(q.cau_truc, x.gia_tri);
        return '<button type="button" class="xd-lc-nut" data-i="' + k + '"' + (cho ? ' disabled' : '') + '>' + (v.hinh ? '<span class="xd-lc-e">' + v.hinh + '</span>' : '') + '<b>' + esc(v.nhan) + '</b></button>';
      }).join('');
      dom.ben.classList.toggle('cho', !!cho);
    } else if (nhap === 'so') {
      dom.benNhan.textContent = 'Gõ đáp án:';
      dom.lc.className = 'xd-lc xd-lc-so';
      dom.lc.innerHTML = '<div class="xd-man-so" id="xd-man-so"><b id="xd-so-nhap">?</b><span>' + esc(xd.don_vi || '') + '</span></div><div class="xd-phim">' +
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'xoa', '0', 'xong'].map(function (k) {
          const lop = k === 'xong' ? 'xd-phim-xong' : k === 'xoa' ? 'xd-phim-xoa' : '';
          return '<button type="button" data-k="' + k + '"' + (lop ? ' class="' + lop + '"' : '') + (k === 'xoa' ? ' aria-label="Xóa"' : '') + '>' + (k === 'xoa' ? '⌫' : k === 'xong' ? 'Xong' : k) + '</button>';
        }).join('') + '</div>';
      dom.ben.classList.remove('cho');
    } else if (nhap === 'xong') {
      dom.benNhan.textContent = 'Rót tới vạch ' + q.cau_truc.l + ' l rồi bấm Xong';
      dom.lc.className = 'xd-lc xd-lc-xong';
      dom.lc.innerHTML = '<p class="xd-lc-meo">Vạch cần rót tới có ngôi sao. Mỗi ca là 1 l.</p><button type="button" class="nut nut-cam nut-to xd-nut-xong" id="xd-nut-xong" disabled>Xong</button>';
      dom.ben.classList.remove('cho');
    } else {
      dom.benNhan.textContent = 'Kéo thẻ vào hộp đơn vị hợp lí';
      dom.lc.className = 'xd-lc xd-lc-keo';
      dom.lc.innerHTML = '<p class="xd-lc-meo">Hoặc chạm vào hộp con chọn.</p><p class="xd-lc-meo nho">1 dm cỡ một gang tay, 1 m cỡ một sải tay.</p>';
      dom.ben.classList.remove('cho');
    }
  }
  function moLuaChon(mo) {
    if (!s || !s.xd || s.xd.nhap !== 'chon' || !s.xd.tuong_tac) return;
    dom.lc.querySelectorAll('.xd-lc-nut').forEach(function (b) { if (!b.classList.contains('sai') && !b.classList.contains('gach')) b.disabled = !mo || s.khoa; });
    dom.ben.classList.toggle('cho', !mo);
  }
  function chonDapAn(k) {
    const q = s.q;
    const x = q.lua_chon && q.lua_chon[k];
    if (!x || s.khoa || K().dangKhoa()) return;
    s.van.thaoTac('chon', { doi_tuong: 'lua_chon', gia_tri: x.gia_tri, vi_tri: 'lua_chon_' + (k + 1) });
    AT().bat('cham');
    const o = $('xd-o-dap');
    if (o) { o.textContent = NH().veLuaChon(q.cau_truc, x.gia_tri).nhan; o.classList.add('co'); }
    chot(x.gia_tri, extraCanh());
  }
  function phimSo(k) {
    if (!s || s.khoa || K().dangKhoa() || s.xd.nhap !== 'so') return;
    if (k === 'xong') {
      if (!s.nhap) { K().bao('Con gõ số trước nhé', '', 1.6); rung($('xd-man-so')); return; }
      chot(Number(s.nhap), Object.assign({ nhap: s.nhap }, extraCanh()));
      return;
    }
    if (k === 'xoa') {
      if (!s.nhap) return;
      s.nhap = s.nhap.slice(0, -1);
      s.van.thaoTac('xoa', { hien_tai: s.nhap });
    } else {
      if (s.nhap.length >= 4 || (s.nhap === '0')) return;
      s.nhap += k;
      s.van.thaoTac('go_so', { gia_tri: Number(k), hien_tai: s.nhap });
    }
    AT().bat('go_phim');
    veNhap();
  }
  function veNhap() {
    const t = s.nhap || '?';
    const a = $('xd-so-nhap'), b = $('xd-o-dap');
    if (a) a.textContent = t;
    if (b) { b.textContent = t; b.classList.toggle('co', !!s.nhap); }
  }
  function extraCanh() {
    if (s.can) return extraCan();
    if (s.rot) return { so_ca: s.rot.soCa, day: s.rot.nuoc >= s.rot.max };
    if (s.thuoc) return { vach_dau: s.thuoc.k, vach_cuoi: s.thuoc.k + s.thuoc.dai, so_lan_keo: s.thuoc.soLanKeo };
    if (s.dem) return { da_dem: s.dem.so };
    return {};
  }

  /* ---------------- Chấm ---------------- */

  function chot(v, extra) {
    if (!s || s.khoa || K().dangKhoa()) return;
    const q = s.q;
    const kq = s.van.traLoi(v, extra || {});
    if (!kq) return;
    if (kq.dung) { dungRoi(kq, v); return; }
    AT().bat('sai');
    danhDau(v, 'sai');
    if (kq.thuLai) {
      K().bao(kq.loiNoi + '. Con thử lại nhé', 'sai', 3.4);
      AT().doc(kq.loiNoi);
      if (s.xd.nhap === 'so') { s.nhap = ''; veNhap(); rung($('xd-man-so')); }
      else if ($('xd-o-dap')) hen(function () { const o = $('xd-o-dap'); if (o) { o.textContent = '?'; o.classList.remove('co'); } }, 900);
      if (s.pl) hen(function () { const the = $('xd-pl-the'); if (the) the.classList.remove('vao'); const o = $('xd-pl-o'); if (o) o.textContent = '?'; }, 700);
      return;
    }
    s.khoa = true;
    moLuaChon(false);
    veNuocKhoa();
    hen(function () {
      if (!s || s.q !== q) return;
      K().phanHoiCau(q, v, kq, function () { cauMoi(); });
    }, 650);
  }
  function veNuocKhoa() { if (s.rot) veNuoc(); }
  function danhDau(v, lop) {
    const q = s.q;
    const k = (q.lua_chon || []).findIndex(function (x) { return String(x.gia_tri) === String(v); });
    if (s.xd.nhap === 'chon' && k >= 0) {
      const b = dom.lc.querySelector('.xd-lc-nut[data-i="' + k + '"]');
      if (b) { b.classList.add(lop); if (lop === 'sai') { b.disabled = true; rung(b); } }
    }
    if (s.pl) {
      const hop = dom.khung.querySelector('.xd-pl-hop[data-dv="' + v + '"]');
      if (hop) { hop.classList.add(lop); if (lop === 'sai') { hop.disabled = true; rung(hop); } }
    }
  }
  function dungRoi(kq, v) {
    const q = s.q;
    s.khoa = true;
    s.soDung++;
    s.chuoi = kq.ketQua === 'dung_ngay' ? s.chuoi + 1 : 0;
    if (s.can && !s.can.docCan) s.tk.can++;
    danhDau(v, 'dung');
    moLuaChon(false);
    veNuocKhoa();
    const p = K().tamCua(dom.khung);
    const diem = (kq.ketQua === 'dung_ngay' ? 100 : 40) + (s.chuoi >= 3 ? 20 : 0);
    K().congDiem(diem, p.x, p.y - 60, kq.quaMong ? '+' + kq.quaMong + ' quả mọng' : null);
    K().phao(p.x, p.y - 20, 18);
    AT().bat('dung');
    if (s.chuoi >= 3) K().bao(s.chuoi + ' câu đúng liền!', 'dung', 1.6);
    dom.dungChu.textContent = q.ket_luan;
    an(dom.dung, false);
    AT().doc(q.ket_luan);
    hen(cauMoi, CO_GIAM_DONG ? 1500 : 2300);
  }

  /* ---------------- Gợi ý ---------------- */

  function goiY() {
    if (!s || !s.q || s.khoa || K().dangKhoa()) return;
    const q = s.van.q;
    if (!q || q.xong) return;
    let them = null;
    if (q.goiYCap + 1 === 3) them = goiYCap3();
    K().goiY(them);
  }
  /** Cấp 3 làm giúp một bước trên hình (vẫn để bé tự trả lời), hoặc gạch bớt một lựa chọn sai. */
  function goiYCap3() {
    const ct = s.q.cau_truc;
    if (s.can && s.can.tuongTac) return { tu_dat: datHoCan() };
    if (s.rot && !s.rot.laVach && s.rot.nuoc < s.rot.max) return { do_day: doDay() };
    if (s.rot && s.rot.laVach) { const g = svgCua(); if (g) g.classList.add('xd-sao-nhap'); return { danh_dau_vach: ct.l }; }
    if (s.thuoc) {
      if (ct.kieu === 'do') { thaThuoc('goi_y', 0); return { can_thuoc: 0 }; }
      danhSoKhoang();
      return { dem_khoang: true };
    }
    if (s.dem) return null;
    const ds = s.xd.nhap === 'chon' ? dom.lc.querySelectorAll('.xd-lc-nut') : s.pl ? dom.khung.querySelectorAll('.xd-pl-hop') : [];
    const lc = s.q.lua_chon || [];
    const sai = [];
    ds.forEach(function (b) {
      if (b.disabled && !(s.xd.tuong_tac)) return;
      const v = s.pl ? b.getAttribute('data-dv') : lc[+b.getAttribute('data-i')].gia_tri;
      if (String(v) !== String(s.q.dap_an) && !b.classList.contains('sai')) sai.push({ b: b, v: v, ten: NH().nhanBietLoi(ct, v).some(function (m) { return m !== 'khac' && m !== 'dem-lech'; }) });
    });
    if (!sai.length) return null;
    sai.sort(function (a, b) { return (a.ten ? 1 : 0) - (b.ten ? 1 : 0); });
    sai[0].b.classList.add('gach');
    sai[0].b.disabled = true;
    return { loai_bo: sai[0].v };
  }

  /* ---------------- Chạm, kéo thả (Pointer Events) ---------------- */

  function xuongNhan(e) {
    if (!s || !s.q || s.khoa || K().dangKhoa() || s.keo) return;
    if (e.button != null && e.button > 0) return;
    const t = e.target;
    const xd = s.xd;
    let k = null;
    if (xd.canh === 'can' && s.can) {
      const ke = t.closest('.xd-ke-mon');
      const qc = t.closest('.xd-qc-dia');
      if (ke && ke.classList.contains('trong')) k = { loai: 'ke_trong', i: +ke.getAttribute('data-i') };
      else if (ke && !ke.disabled) k = { loai: 'ke', i: +ke.getAttribute('data-i'), el: ke };
      else if (qc && s.can.tuongTac) k = { loai: 'dia', i: +qc.getAttribute('data-i') };
      else if (t.closest('svg')) k = { loai: 'cham_dia' };
    } else if (xd.canh === 'thuoc' && t.closest('#xd-thuoc')) {
      const svg = svgCua();
      const p = toaDoSvg(svg, e.clientX, e.clientY);
      if (!p) return;
      k = { loai: 'thuoc', rx0: s.thuoc.rx, sx0: p.x };
    } else if (xd.canh === 'phan_loai' && t.closest('#xd-pl-the')) {
      k = { loai: 'the' };
    } else if (xd.canh === 'rot' && t.closest('#xd-nut-rot')) {
      const nut = t.closest('#xd-nut-rot');
      if (!nut.disabled) batDauRot(e);
      e.preventDefault();
      return;
    }
    if (!k) return;
    k.pid = e.pointerId;
    k.x0 = e.clientX;
    k.y0 = e.clientY;
    k.daKeo = false;
    s.keo = k;
    try { dom.san.setPointerCapture(e.pointerId); } catch (er) { /* bỏ qua */ }
    e.preventDefault();
  }
  function diChuyen(e) {
    const k = s && s.keo;
    if (!k || e.pointerId !== k.pid) return;
    const dx = e.clientX - k.x0, dy = e.clientY - k.y0;
    if (!k.daKeo) {
      if (Math.hypot(dx, dy) < NGUONG_KEO || k.loai === 'cham_dia' || k.loai === 'ke_trong') return;
      k.daKeo = true;
      batDauKeo(k);
    }
    if (k.loai === 'ke' || k.loai === 'dia') {
      datBong(e.clientX, e.clientY);
      const v = trongVung(e.clientX, e.clientY);
      dom.san.classList.toggle('xd-tro-phai', v === 'phai');
    } else if (k.loai === 'thuoc') {
      const p = toaDoSvg(svgCua(), e.clientX, e.clientY);
      if (!p) return;
      const t = s.thuoc;
      const rx = Math.max(t.X0 - t.kMax * t.px - 12, Math.min(t.X0 - t.kMin * t.px + 12, k.rx0 + (p.x - k.sx0)));
      datThuoc(rx, false);
    } else if (k.loai === 'the') {
      const the = $('xd-pl-the');
      if (the) the.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(' + Math.max(-8, Math.min(8, dx / 30)) + 'deg)';
      dom.khung.querySelectorAll('.xd-pl-hop').forEach(function (h) { h.classList.remove('tro'); });
      const h = hopDuoi(e.clientX, e.clientY);
      if (h) h.classList.add('tro');
    }
  }
  function batDauKeo(k) {
    if (k.loai === 'ke' || k.loai === 'dia') {
      const c = s.can, x = c.ke[k.i];
      c.chonKe = null;
      s.van.thaoTac('keo', { doi_tuong: tenMon(x), tu: k.loai === 'ke' ? 'ke' : 'dia_phai', gia_tri: x.kg });
      dom.bongKeo.innerHTML = monKe(x);
      dom.bongKeo.classList.toggle('qua', c.don !== 'kg');
      an(dom.bongKeo, false);
      if (k.loai === 'ke' && k.el) k.el.classList.add('dang-keo');
      if (k.loai === 'dia') { const el = c.el.doPhai.querySelector('.xd-qc-dia[data-i="' + k.i + '"]'); if (el) el.setAttribute('opacity', '.35'); }
      AT().bat('cham');
    } else if (k.loai === 'the') {
      s.pl.soLanKeo++;
      s.van.thaoTac('keo', { doi_tuong: 'the_vat', gia_tri: s.q.cau_truc.vat });
      const the = $('xd-pl-the');
      if (the) the.classList.add('dang-keo');
    }
  }
  function datBong(x, y) { dom.bongKeo.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)'; }
  function nhaRa(e) {
    if (s && s.rot && s.rot.dangGiu) dungGiu();
    const k = s && s.keo;
    if (!k || e.pointerId !== k.pid) return;
    s.keo = null;
    try { dom.san.releasePointerCapture(e.pointerId); } catch (er) { /* bỏ qua */ }
    anBong();
    if (!k.daKeo) { chamNhanh(k, e); return; }
    if (k.loai === 'ke') {
      if (k.el) k.el.classList.remove('dang-keo');
      const v = trongVung(e.clientX, e.clientY);
      if (v === 'phai') datQuaCan(k.i, 'keo');
      else {
        const x = s.can.ke[k.i];
        s.van.thaoTac('tha', { doi_tuong: tenMon(x), den: v === 'trai' ? 'dia_trai' : 'ke', gia_tri: x.kg, tra_lai: true });
        if (v === 'trai') K().bao(s.can.don === 'kg' ? 'Quả cân đặt ở đĩa bên phải nhé' : 'Đặt quả lên đĩa bên phải nhé', '', 2);
        veDiaPhai();
      }
    } else if (k.loai === 'dia') {
      if (trongVung(e.clientX, e.clientY) !== 'phai') boRa(k.i, 'keo');
      else veDiaPhai();
    } else if (k.loai === 'thuoc') thaThuoc('keo');
    else if (k.loai === 'the') {
      const the = $('xd-pl-the');
      if (the) the.classList.remove('dang-keo');
      dom.khung.querySelectorAll('.xd-pl-hop').forEach(function (h) { h.classList.remove('tro'); });
      const h = hopDuoi(e.clientX, e.clientY);
      if (h) thaVaoHop(h.getAttribute('data-dv'), 'keo');
      else {
        if (the) the.style.transform = '';
        s.van.thaoTac('tha', { doi_tuong: 'the_vat', den: 'ngoai', gia_tri: s.q.cau_truc.vat });
      }
    }
  }
  function chamNhanh(k, e) {
    if (k.loai === 'ke') chamKe(k.i);
    else if (k.loai === 'ke_trong') boRa(k.i, 'cham');
    else if (k.loai === 'dia') { if (s.can.chonKe != null) datQuaCan(s.can.chonKe, 'cham'); else boRa(k.i, 'cham'); }
    else if (k.loai === 'cham_dia') { const v = trongVung(e.clientX, e.clientY); if (v) chamDia(v); }
    else if (k.loai === 'the') {
      K().bao('Kéo thẻ vào hộp đơn vị hợp lí, hoặc chạm vào hộp', '', 2);
      dom.khung.querySelectorAll('.xd-pl-hop:not(:disabled)').forEach(function (h) { rung(h); });
    }
  }
  function anBong() {
    an(dom.bongKeo, true);
    dom.bongKeo.innerHTML = '';
    dom.san.classList.remove('xd-tro-phai');
  }
  function huyKeo() {
    const k = s && s.keo;
    if (!k) return;
    s.keo = null;
    anBong();
    if (k.el) k.el.classList.remove('dang-keo');
    if (k.loai === 'thuoc' && k.daKeo) thaThuoc('keo');
    if (k.loai === 'the') { const the = $('xd-pl-the'); if (the) { the.style.transform = ''; the.classList.remove('dang-keo'); } }
    if (k.loai === 'dia' && s.can) veDiaPhai();
  }
  function bamNut(e) {
    if (!s || !s.q) return;
    const g = e.target.closest && e.target.closest('.xd-thuoc-2dm');
    if (g && s.dem) { demThuoc(g); return; }
    const b = e.target.closest('button');
    if (!b || b.disabled || !dom.san.contains(b)) return;
    const banPhim = e.detail === 0; // bấm bằng bàn phím (Enter, cách): không qua Pointer Events
    if (b.classList.contains('xd-ke-mon')) {
      // bàn phím: Enter trên quả cân ở kệ thì đặt lên đĩa, trên ô trống thì lấy quả cân đó về
      if (banPhim && s.can) { const i = +b.getAttribute('data-i'); if (b.classList.contains('trong')) boRa(i, 'phim'); else datQuaCan(i, 'phim'); }
      return;
    }
    if (b.id === 'xd-nut-rot') { if (banPhim) rotMot(); return; }
    if (b.classList.contains('xd-lc-nut')) { chonDapAn(+b.getAttribute('data-i')); return; }
    if (b.hasAttribute('data-k')) { phimSo(b.getAttribute('data-k')); return; }
    if (b.id === 'xd-nut-bot') { botNuoc(); return; }
    if (b.id === 'xd-nut-xong') { xongRot(); return; }
    if (b.hasAttribute('data-dich')) { dichThuoc(+b.getAttribute('data-dich')); return; }
    if (b.classList.contains('xd-pl-hop')) thaVaoHop(b.getAttribute('data-dv'), 'cham');
  }
  function phim(e) {
    if (!s || !s.q || s.khoa) return;
    const k = e.key;
    if (s.xd.nhap === 'so') {
      if (/^[0-9]$/.test(k)) { phimSo(k); e.preventDefault(); }
      else if (k === 'Backspace') { phimSo('xoa'); e.preventDefault(); }
      else if (k === 'Enter') { phimSo('xong'); e.preventDefault(); }
    } else if (s.xd.nhap === 'chon' && /^[1-4]$/.test(k)) {
      const b = dom.lc.querySelector('.xd-lc-nut[data-i="' + (Number(k) - 1) + '"]');
      if (b && !b.disabled) chonDapAn(Number(k) - 1);
    }
    if (s.rot && (k === 'r' || k === ' ')) { rotMot(); e.preventDefault(); }
    if (s.rot && k === 'Enter' && s.xd.nhap === 'xong') xongRot();
    if (s.thuoc && (k === 'ArrowLeft' || k === 'ArrowRight')) { dichThuoc(k === 'ArrowLeft' ? -1 : 1); e.preventDefault(); }
  }

  /* ---------------- Kết thúc ---------------- */

  function dongPhu(diem) {
    const tk = s.tk, ds = [];
    if (tk.can) ds.push('Cân thăng bằng ' + tk.can + ' lần');
    if (tk.rot) ds.push('rót ' + tk.rot + ' ca nước');
    if (tk.do) ds.push('đặt thước ' + tk.do + ' lần');
    if (tk.dv) ds.push('xếp ' + tk.dv + ' thẻ đơn vị');
    ds.push('đúng ' + s.soDung + ' câu');
    const t = ds.join(', ');
    return t.charAt(0).toUpperCase() + t.slice(1) + ' · ' + diem.toLocaleString('vi-VN') + ' điểm';
  }
  function ketThuc() {
    const o = s.o;
    const diem = K().diem();
    const phu = dongPhu(diem);
    donCanh();
    K().dong();
    s.van.ketThuc(false, { diem: diem, can_thang_bang: s.tk.can, lit_da_rot: s.tk.rot, lan_dat_thuoc: s.tk.do }).then(function (kq) {
      kq.diem = diem;
      kq.dongPhu = phu;
      s = null;
      if (o.onXong) o.onXong(kq);
    });
  }
  function thoat() {
    if (!s) return;
    const o = s.o;
    const diem = K().diem();
    donCanh();
    K().dong();
    s.van.ketThuc(true, { ly_do: 've_dao', diem: diem }).then(function (kq) {
      s = null;
      if (o.onThoat) o.onThoat(kq);
    });
  }

  /* ---------------- Bài học 30 giây (dạy đúng trình tự SGK) ---------------- */

  function dangKyBaiHoc() {
    const BH = window.BaiHoc, CD = window.CauDoLuong;
    if (!BH || !CD) return;
    const svg = function (vb, noiDung, nhan) { return '<div class="xd-bh-hinh">' + CD.bocSvg(vb, noiDung, nhan, 'xd-hinh') + '</div>'; };
    const can = function (o, nhan) { return svg(CD.VB_CAN.slice(0, 3).concat([380]), CD.veCan(o), nhan); };
    const tag = function (chu, nen, mau) { return { chu: chu, nen: nen, mau: mau }; };
    BH.dangKy('ki-lo-gam', {
      ten: 'Ki-lô-gam',
      buoc: [
        { chu: 'Cân lệch về bên nào thì bên đó nặng hơn. Quả dưa hấu nặng hơn bó rau, bó rau nhẹ hơn quả dưa hấu.', ve: function () {
          return can({ trai: [{ vat: 'dua_hau', n: 1 }], phai: [{ vat: 'rau', n: 1 }], goc: -10, nhanTrai: tag('nặng hơn', '#fff4ec', '#d84f1d'), nhanPhai: tag('nhẹ hơn', '#f1ecff', '#4a3494') }, 'Cân lệch về bên quả dưa hấu');
        } },
        { chu: 'Cân nằm ngang thì hai bên nặng bằng nhau: quả dưa hấu nặng bằng 2 quả bưởi.', ve: function () {
          return can({ trai: [{ vat: 'dua_hau', n: 1 }], phai: [{ vat: 'buoi', n: 2 }], goc: 0, nhanTrai: tag('nặng bằng', '#e6faf4', '#0f6b62'), nhanPhai: tag('nặng bằng', '#e6faf4', '#0f6b62') }, 'Cân nằm ngang');
        } },
        { chu: 'Đây là quả cân 1 ki-lô-gam. Ki-lô-gam viết tắt là kg.', ve: function () {
          return svg([-120, -150, 240, 170], '<g transform="scale(2)">' + CD.veQuaCan(1, 0, 0) + '</g>', 'Quả cân 1 ki-lô-gam');
        } },
        { chu: 'Quả dưa hấu cân bằng hai quả cân 1 kg: quả dưa hấu cân nặng 2 kg.', ve: function () {
          return can({ trai: [{ vat: 'dua_hau', n: 1 }], phai: [{ kg: 1 }, { kg: 1 }], goc: 0, nhanPhai: tag('1 kg + 1 kg = 2 kg', '#fff4ec', '#d84f1d') }, 'Quả dưa hấu cân bằng hai quả cân 1 kg');
        }, thu: { hoi: 'Con thử nhé: hộp quà cân bằng quả cân 2 kg và quả cân 1 kg. Hộp quà nặng mấy ki-lô-gam?', lua_chon: ['3 kg', '2 kg'], dung: '3 kg', dung_noi: 'Đúng rồi! 2 kg + 1 kg = 3 kg.', sai_noi: 'Cộng số ki-lô-gam trên quả cân: 2 kg + 1 kg = 3 kg, không đếm số quả cân nhé.' } }
      ]
    });
    const binhCoc = function () {
      let h = '<g transform="translate(110 250)">' + CD.veBinh({ loai: 'binh', max: 1, nuoc: 0.9, rong: 130, cao: 200 }) + '</g>';
      for (let i = 0; i < 4; i++) h += '<g transform="translate(' + (270 + i * 60) + ' 240) scale(1.4)">' + CD.veCoc(0, 0) + '</g>';
      return svg([0, 20, 540, 250], h, 'Bình nước rót ra được 4 cốc');
    };
    BH.dangKy('lit', {
      ten: 'Lít',
      buoc: [
        { chu: 'Bình đựng nhiều nước hơn cốc. Rót hết nước từ bình sang được 4 cốc: lượng nước trong bình bằng lượng nước ở cả 4 cốc.', ve: binhCoc },
        { chu: 'Đây là ca 1 lít. Lít viết tắt là l.', ve: function () { return svg([-80, -175, 190, 185], '<g transform="scale(2)">' + CD.veCa('1 l', 0.9) + '</g>', 'Ca 1 lít'); } },
        { chu: 'Rót nước từ can vào đầy hai ca 1 l, ta được 2 l nước.', ve: function () {
          const h = '<g transform="translate(120 260)">' + CD.veBinh({ loai: 'can', max: 1, nuoc: 0.5, rong: 150, cao: 200 }) + '</g>' +
            '<g transform="translate(320 250) scale(1.4)">' + CD.veCa('1 l', 1) + '</g><g transform="translate(450 250) scale(1.4)">' + CD.veCa('1 l', 1) + '</g>' + CD.nhanTron(385, 290, '1 l + 1 l = 2 l', '#fff4ec', '#d84f1d', 26);
          return svg([0, 20, 540, 300], h, 'Can rót đầy hai ca 1 lít');
        } },
        { chu: 'Rót hết nước trong bình được 3 ca 1 l.', ve: function () {
          let h = '<g transform="translate(110 260)">' + CD.veBinh({ loai: 'binh', max: 1, nuoc: 0.9, rong: 130, cao: 200 }) + '</g>';
          for (let i = 0; i < 3; i++) h += '<g transform="translate(' + (280 + i * 95) + ' 250) scale(1.25)">' + CD.veCa('1 l', 1) + '</g>';
          return svg([0, 20, 540, 260], h, 'Bình rót ra được 3 ca 1 lít');
        }, thu: { hoi: 'Bình đựng mấy lít nước?', lua_chon: ['3 l', '1 l'], dung: '3 l', dung_noi: 'Đúng rồi! 3 ca 1 l là 3 l nước.', sai_noi: 'Mỗi ca là 1 l, có 3 ca nên bình đựng 3 l nước.' } }
      ]
    });
    const thanh = function (n, nhan, duoi, mau) {
      let h = '';
      const w = Math.min(84, 520 / n);
      for (let i = 0; i < n; i++) h += '<rect x="' + (20 + i * w) + '" y="60" width="' + (w - 4) + '" height="46" rx="8" fill="' + (i % 2 ? '#ffd166' : mau) + '" stroke="#6b1f3a" stroke-width="2.5"/>' + CD.chuSvg(20 + i * w + (w - 4) / 2, 92, nhan, 20, '#6b1f3a');
      return h + CD.chuSvg(20 + n * w / 2, 150, duoi, 30, '#d84f1d');
    };
    BH.dangKy('do-dai', {
      ten: 'Đo độ dài: cm, dm, m, km',
      buoc: [
        { chu: 'Đo bằng thước: đặt vạch 0 trùng một đầu bút chì. Đầu kia ở vạch 10, vậy bút chì dài 10 cm.', ve: function () {
          return svg([0, 52, 760, 210], CD.veThuocVaVat({ vat: 'but_chi', dai: 10, dau: 0, muiTen: true }), 'Bút chì dài 10 xăng-ti-mét');
        } },
        { chu: 'Đề-xi-mét viết tắt là dm: 1 dm = 10 cm. Gang tay em dài khoảng 1 dm.', ve: function () {
          let h = '';
          for (let i = 0; i < 10; i++) h += '<rect x="' + (40 + i * 34) + '" y="60" width="32" height="46" rx="4" fill="' + (i % 2 ? '#ffe0ea' : '#ffb8c9') + '" stroke="#6b1f3a" stroke-width="2"/>' + CD.chuSvg(56 + i * 34, 92, '1', 16, '#6b1f3a');
          h += CD.chuSvg(210, 150, '10 cm = 1 dm', 32, '#d84f1d') + CD.emojiSvg(470, 130, '✋', 90);
          return svg([0, 40, 560, 130], h, '10 xăng-ti-mét bằng 1 đề-xi-mét');
        } },
        { chu: 'Mét viết tắt là m: 1 m = 10 dm, 1 m = 100 cm. Sải tay em dài khoảng 1 m.', ve: function () {
          return svg([0, 40, 560, 130], thanh(10, '1 dm', '10 dm = 1 m = 100 cm', '#ffb8c9'), '10 đề-xi-mét bằng 1 mét');
        } },
        { chu: 'Ki-lô-mét viết tắt là km: 1 km = 1 000 m. Từ một cột cây số tới cột cây số tiếp theo dài 1 km.', ve: function () {
          const cot = function (x, so) { return '<rect x="' + (x - 38) + '" y="40" width="76" height="80" rx="26" fill="#fff" stroke="#6b7a99" stroke-width="4"/><rect x="' + (x - 38) + '" y="40" width="76" height="30" rx="14" fill="#ef476f"/>' + CD.chuSvg(x, 104, so, 20, '#221a3b') + '<rect x="' + (x - 6) + '" y="118" width="12" height="30" fill="#6b7a99"/>'; };
          const h = '<rect x="0" y="146" width="560" height="26" rx="8" fill="#9aa3b5"/><path d="M20 159 H540" stroke="#fff" stroke-width="4" stroke-dasharray="26 18"/>' + cot(80, 'KM 30') + cot(480, 'KM 29') +
            '<path d="M126 90 H434" stroke="#d84f1d" stroke-width="4"/><path d="M120 90 l14 -8 v16 Z M440 90 l-14 -8 v16 Z" fill="#d84f1d"/>' + CD.nhanTron(280, 70, '1 km = 1 000 m', '#fff4ec', '#d84f1d', 26);
          return svg([0, 30, 560, 150], h, 'Hai cột cây số cách nhau 1 ki-lô-mét');
        }, thu: { hoi: 'Quãng đường từ nhà Mai đến trường dài khoảng bao nhiêu?', lua_chon: ['2 dm', '2 m', '2 km'], dung: '2 km', dung_noi: 'Đúng rồi! Quãng đường đi học đo bằng ki-lô-mét: khoảng 2 km.', sai_noi: '2 dm chỉ bằng hai gang tay, 2 m bằng hai sải tay. Đường đến trường dài khoảng 2 km.' } }
      ]
    });
    // Bài học nằm trong tệp game (nạp sau bai-hoc.js): gắn mã bài học cho kỹ năng tại đây để kỹ năng không trỏ tới bài chưa có
    Object.keys(CD.BAI_HOC).forEach(function (kn) {
      if (window.NganHang.KY_NANG[kn] && BH.coBai(CD.BAI_HOC[kn])) window.NganHang.KY_NANG[kn].bai_hoc = CD.BAI_HOC[kn];
    });
  }
  dangKyBaiHoc();

  window.XuongDoLuong = { batDau: batDau, _trangThai: function () { return s; } };
  (window.DaoTroChoi = window.DaoTroChoi || {})['xuong-do-luong'] = { ten: 'Xưởng Đo Lường', khung: true, san: 'xd-san', batDau: batDau, _trangThai: window.XuongDoLuong._trangThai };
})();
