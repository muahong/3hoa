/* ============================================================
   hang.js – Hang Khủng Long: căn phòng của khủng long, và màn mở quà khi bé nhận món đồ mới
   - Khủng long đứng giữa hang, mặc món đồ bé chọn (mỗi lúc một món). Chạm khủng long thì bạn ấy nói, chạm bát quả mọng
     thì bạn ấy ăn (không tốn quả mọng). Các bạn khủng long đã nở từ trứng vùng đứng phía sau.
   - Ba ngăn: Tủ đồ (12 món, món chưa có là hình bóng kèm cách nhận), Bạn bè (10 bạn của trứng vùng), Cúp (10 cúp vùng, 2 cúp
     đấu trường). Chạm vào ô nào cũng được nghe đọc to; thẻ món đồ nói con có vì sao, mặc ở đâu, có phép gì.
   - Thời gian trong hang tính vào giờ chơi hôm nay (ho_so.gio_hang, HoSo.themGiayHang): chỉ tính lúc bé còn chạm (mỗi lần
     chạm cộng tối đa 60 giây), không tính lúc app ở nền. Hết giờ bố mẹ đặt thì rời hang và hiện hộp hết giờ.
   - Nhật ký: loai 'hang' (vao, roi, xem_mon, mac, coi, mo_qua), game 'hang-khung-long'.
   API: window.Hang = { mo(ctx), roi(sau), moQua(ma, ctx, xong), giayDangChoi(), dangMo() }
   ctx (app.js): { hoSo, hinh(ten), hinhKhungLong(p, loai), tenKhungLong(p), anhBe(loai) → Promise<url>, luu(),
        ghi(duLieu), moVung(so), vungMo(so), hetGioSau(giayThem), hetGio(), ve() }
   ============================================================ */
(function () {
  'use strict';

  const TOI_DA_MOI_CHAM = 60; // giây: một lần chạm giữ hang "đang chơi" tối đa chừng này
  const KIEM_GIO_MS = 10000;

  function PK() { return window.PhuKien; }
  function DAO() { return window.Dao; }
  function AT() { return window.AmThanh; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(id) { return document.getElementById(id); }
  function bayGio() { return (window.performance && window.performance.now) ? window.performance.now() : Date.now(); }
  function viet(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }

  let C = null; // bối cảnh từ app.js
  let S = null; // lần vào hang đang mở
  let tabCuoi = 'do'; // ngăn bé xem lần trước

  /* ---------------- Nội dung các ô ---------------- */

  function laTrung(p) { const m = p.khung_long && p.khung_long.muc; return m === 'trung' || m === 'lay_dong'; }
  function vungCua(d) { return DAO().vung(d.vung); }
  function trumCua(v) { return v && v.man && v.man[0] && v.man[0].dau_truong ? v.man[0].dau_truong.ten_boss : 'trùm'; }

  /** Con có món này vì… */
  function viSao(d) {
    const v = vungCua(d);
    if (v && v.dau_truong) return 'con đã hạ ' + trumCua(v) + ' ở ' + v.ten;
    return 'con thuộc hết các bài ở ' + (v ? v.ten : '') + ', trứng ' + (v ? v.ten_loai : '') + ' nở ra';
  }
  /** Để nhận món này… */
  function cachNhan(d) {
    const v = vungCua(d);
    if (v && v.dau_truong) return 'Thắng ' + trumCua(v) + ' ở ' + v.ten + '.';
    return 'Thuộc hết các bài ở ' + (v ? v.ten : '') + ' để trứng ' + (v ? v.ten_loai : '') + ' nở.';
  }

  function dsBan(p) {
    const tv = p.trung_vung || {};
    return DAO().VUNG.filter(function (v) { return !v.dau_truong && v.loai; }).map(function (v) {
      const t = tv[v.so];
      return { v: v, no: !!(t && t.no), ten: (t && t.ten) || v.ten_loai, luc: t && t.luc };
    });
  }
  function dsCup(p) {
    const kl = p.ky_luc || {};
    const dt = p.dau_truong_thang || {};
    return DAO().VUNG.map(function (v) {
      if (v.dau_truong) return { v: v, co: !!dt[v.so], sao: 0, dau_truong: true };
      const cup = v.man.find(function (m) { return m.cup; });
      const k = cup && kl[cup.id];
      return { v: v, co: !!k, sao: k ? k.sao || 0 : 0, dau_truong: false };
    });
  }

  /* ---------------- Dựng màn ---------------- */

  function dung() {
    const man = $('man-hang');
    if (man.getAttribute('data-dung')) return;
    man.setAttribute('data-dung', '1');
    man.innerHTML =
      '<div class="hk-nen" aria-hidden="true"></div>' +
      '<button class="nut-quay" id="hk-quay" type="button" aria-label="Về bản đồ">‹</button>' +
      '<h1 class="hk-ten">Hang Khủng Long</h1>' +
      '<div class="hk-canh">' +
      '  <div class="hk-ban" id="hk-ban"></div>' +
      '  <button class="hk-bat" id="hk-bat" type="button" aria-label="Cho khủng long ăn quả mọng">' +
      '    <span class="hk-chen" aria-hidden="true"></span><img alt="" data-anh="berry"><img alt="" data-anh="berry"><img alt="" data-anh="berry"></button>' +
      '  <button class="hk-kl" id="hk-kl" type="button" aria-label="Chạm vào khủng long"><img id="hk-kl-hinh" alt=""></button>' +
      '  <p class="hk-noi" id="hk-noi" aria-live="polite"></p>' +
      '  <button class="hk-dang-mac" id="hk-dang-mac" type="button"></button>' +
      '</div>' +
      '<aside class="hk-bang" aria-label="Đồ, bạn bè và cúp">' +
      '  <div class="hk-tab-hang" role="tablist">' +
      '    <button class="hk-tab" role="tab" type="button" data-tab="do" id="hk-tab-do">Tủ đồ</button>' +
      '    <button class="hk-tab" role="tab" type="button" data-tab="ban" id="hk-tab-ban">Bạn bè</button>' +
      '    <button class="hk-tab" role="tab" type="button" data-tab="cup" id="hk-tab-cup">Cúp</button>' +
      '  </div>' +
      '  <div class="hk-bang-than" id="hk-bang-than" role="tabpanel"></div>' +
      '</aside>' +
      '<div class="hk-lop hidden" id="hk-lop"></div>';
    man.querySelectorAll('img[data-anh]').forEach(function (im) { im.src = C.hinh(im.getAttribute('data-anh')); });
    man.addEventListener('pointerdown', cham, { passive: true });
    $('hk-quay').addEventListener('click', function () { AT().bat('cham'); roi(); });
    $('hk-kl').addEventListener('click', chamKhungLong);
    $('hk-bat').addEventListener('click', choAn);
    $('hk-dang-mac').addEventListener('click', function () {
      AT().bat('cham');
      const ma = PK().dangMac(C.hoSo);
      if (ma) moThe(ma); else noi('Chọn một món trong tủ đồ để ' + tenKL() + ' mặc nhé!');
    });
    man.querySelectorAll('.hk-tab').forEach(function (b) {
      b.addEventListener('click', function () { AT().bat('cham'); S.tab = tabCuoi = b.getAttribute('data-tab'); veBang(); });
    });
    $('hk-bang-than').addEventListener('click', function (e) {
      const b = e.target.closest('button');
      if (!b) return;
      AT().bat('cham');
      if (b.hasAttribute('data-do')) moThe(b.getAttribute('data-do'));
      else if (b.hasAttribute('data-ban')) chamBan(+b.getAttribute('data-ban'));
      else if (b.hasAttribute('data-cup')) chamCup(+b.getAttribute('data-cup'));
    });
    $('hk-ban').addEventListener('click', function (e) {
      const b = e.target.closest('[data-ban]');
      if (b) { AT().bat('cham'); chamBan(+b.getAttribute('data-ban')); }
    });
    $('hk-lop').addEventListener('click', function (e) {
      const b = e.target.closest('[data-viec]');
      if (!b && e.target !== this) return;
      viecThe(b ? b.getAttribute('data-viec') : 'dong');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && S && !$('hk-lop').classList.contains('hidden')) viecThe('dong');
    });
    document.addEventListener('visibilitychange', function () {
      if (!S) return;
      if (document.visibilityState === 'hidden') { cong(); S.cuoi = null; } else S.cuoi = bayGio();
    });
  }

  function tenKL() { return C.tenKhungLong(C.hoSo); }

  /* ---------------- Vào, rời hang và thời gian ---------------- */

  function mo(ctx) {
    C = ctx;
    dung();
    const p = C.hoSo;
    S = { tab: tabCuoi, batDau: Date.now(), cuoi: bayGio(), giay: 0, the: null, an: false };
    C.ghi({ viec: 'vao', mac: PK().dangMac(p) });
    $('man-hang').querySelector('.hk-nen').style.backgroundImage = 'url(' + C.hinh('bg-hang') + ')';
    veKhungLong();
    veBanTrongCanh();
    veDangMac();
    veBang();
    $('hk-lop').classList.add('hidden');
    const moi = PK().chuaXem(p).length;
    const coDo = PK().cuaBe(p).length;
    if (laTrung(p)) noi(tenKL() + ' còn trong trứng. Con chơi xong một ván là trứng nở nhé!');
    else if (moi) noi(p.ten + ' ơi, ' + tenKL() + ' có ' + (moi > 1 ? moi + ' món quà mới' : 'quà mới') + ' trong tủ đồ đó!');
    else if (!coDo) noi('Chào ' + p.ten + '! Tủ đồ còn trống. Con học ở các vùng để nhận đồ cho ' + tenKL() + ' nhé!');
    else noi('Chào ' + p.ten + '! Đây là hang của ' + tenKL() + '.');
    clearInterval(S.kiem);
    S.kiem = setInterval(kiemGio, KIEM_GIO_MS);
  }

  /** Cộng khoảng từ lần chạm trước (tối đa 60 giây) vào thời gian của lần vào hang. */
  function cong() {
    if (!S || S.cuoi == null) return;
    const t = bayGio();
    S.giay += Math.min(TOI_DA_MOI_CHAM, Math.max(0, (t - S.cuoi) / 1000));
    S.cuoi = t;
  }
  function cham() { if (S) cong(); }
  function giayDangChoi() {
    if (!S) return 0;
    const them = S.cuoi == null ? 0 : Math.min(TOI_DA_MOI_CHAM, Math.max(0, (bayGio() - S.cuoi) / 1000));
    return S.giay + them;
  }
  function kiemGio() {
    if (!S || !C) return;
    if (C.hetGioSau(giayDangChoi())) roi(function () { C.hetGio(); });
  }

  /** Rời hang: ghi thời gian vào hồ sơ và nhật ký; sau(): việc làm tiếp (mặc định về bản đồ). */
  function roi(sau) {
    if (!S) { (sau || C.ve)(); return; }
    cong();
    clearInterval(S.kiem);
    AT().dungDoc();
    const giay = Math.round(S.giay);
    const p = C.hoSo;
    window.HoSo.themGiayHang(p, window.NhatKy.ngayDiaPhuong(Date.now()), giay);
    C.ghi({ viec: 'roi', giay: giay, mac: PK().dangMac(p) });
    C.luu();
    S = null;
    (sau || C.ve)();
  }

  /* ---------------- Cảnh trong hang ---------------- */

  function veKhungLong(loai) {
    const p = C.hoSo;
    const im = $('hk-kl-hinh');
    const ten = C.hinhKhungLong(p, loai);
    im.classList.toggle('lac', laTrung(p) && !loai);
    // Khung có lề cố định: thay đồ (mũ cao hay không) thì khủng long vẫn cùng cỡ; trứng dùng hình gốc
    const khoa = ten + '|' + (PK().dangMac(p) || '');
    im.setAttribute('data-kl', khoa);
    if (laTrung(p)) { im.src = C.hinh(ten); return; }
    C.anhBe(loai, true).then(function (u) { if (im.getAttribute('data-kl') === khoa) im.src = u; });
  }
  function nhun(el) {
    el.classList.remove('nhun');
    void el.offsetWidth;
    el.classList.add('nhun');
  }

  function veBanTrongCanh() {
    const ds = dsBan(C.hoSo).map(function (b, i) { b.i = i; return b; }).filter(function (b) { return b.no; });
    ds.sort(function (a, b) { return String(b.luc || '').localeCompare(String(a.luc || '')); });
    $('hk-ban').innerHTML = ds.slice(0, 3).map(function (b, k) {
      return '<button type="button" class="hk-ban-mot vi-' + k + '" data-ban="' + b.i + '" aria-label="' + esc(b.ten) + '"><img src="' + C.hinh(b.v.loai) + '" alt=""></button>';
    }).join('');
  }

  function veDangMac() {
    const p = C.hoSo;
    const ma = PK().dangMac(p);
    const d = ma && PK().theoMa(ma);
    const el = $('hk-dang-mac');
    el.classList.toggle('trong', !d);
    el.innerHTML = d
      ? '<img src="' + C.hinh(d.anh) + '" alt=""><span><small>' + esc(tenKL()) + ' đang mặc</small><b>' + esc(d.ten) + '</b></span>'
      : '<span><small>' + esc(tenKL()) + ' đang mặc</small><b>Chưa mặc gì</b></span>';
    el.classList.toggle('hidden', laTrung(p));
  }

  function veBang() {
    const p = C.hoSo;
    ['do', 'ban', 'cup'].forEach(function (t) {
      const b = $('hk-tab-' + t);
      b.setAttribute('aria-selected', String(S.tab === t));
      b.classList.toggle('chon', S.tab === t);
    });
    const moi = PK().chuaXem(p);
    $('hk-tab-do').innerHTML = 'Tủ đồ' + (moi.length ? '<i class="hk-cham-moi" aria-label="có đồ mới"></i>' : '');
    let h = '';
    if (S.tab === 'do') {
      const co = PK().cuaBe(p);
      const dang = PK().dangMac(p);
      h = '<p class="hk-phu">Con có <b>' + co.length + '/' + PK().DS.length + '</b> món. Chạm để xem.</p><div class="hk-luoi">' + PK().DS.map(function (d) {
        const coMon = co.indexOf(d.ma) >= 0;
        return '<button type="button" class="hk-o' + (coMon ? '' : ' khoa') + (dang === d.ma ? ' dang' : '') + '" data-do="' + d.ma + '" aria-label="' + esc(coMon ? d.ten : 'Món đồ bí mật') + '">' +
          '<img src="' + C.hinh(d.anh) + '" alt=""><span>' + esc(coMon ? d.ten : '???') + '</span>' +
          (moi.indexOf(d.ma) >= 0 ? '<i class="hk-moi">Mới!</i>' : '') + (dang === d.ma ? '<i class="hk-dau" aria-hidden="true">✓</i>' : '') + '</button>';
      }).join('') + '</div>';
    } else if (S.tab === 'ban') {
      const ds = dsBan(p);
      h = '<p class="hk-phu">Bạn khủng long nở từ trứng các vùng: <b>' + ds.filter(function (b) { return b.no; }).length + '/' + ds.length + '</b></p><div class="hk-luoi">' + ds.map(function (b, i) {
        return '<button type="button" class="hk-o' + (b.no ? '' : ' khoa') + '" data-ban="' + i + '" aria-label="' + esc(b.no ? b.ten : 'Trứng ' + b.v.ten_loai) + '">' +
          '<img src="' + C.hinh(b.v.loai) + '" alt=""><span>' + esc(b.no ? b.ten : '???') + '</span></button>';
      }).join('') + '</div>';
    } else {
      const ds = dsCup(p);
      h = '<p class="hk-phu">Kệ cúp: <b>' + ds.filter(function (c) { return c.co; }).length + '/' + ds.length + '</b></p><div class="hk-luoi">' + ds.map(function (c, i) {
        const ten = c.dau_truong ? c.v.ten : 'Cúp ' + c.v.ten;
        return '<button type="button" class="hk-o hk-cup' + (c.co ? '' : ' khoa') + (c.dau_truong ? ' vang' : '') + '" data-cup="' + i + '" style="--mau:' + c.v.mau + '" aria-label="' + esc(ten) + '">' +
          '<img src="' + C.hinh('ic-dau-truong') + '" alt=""><span>' + esc(c.v.ten) + '</span>' +
          (c.co && c.sao ? '<i class="hk-sao" aria-hidden="true">' + '★'.repeat(c.sao) + '</i>' : '') + '</button>';
      }).join('') + '</div>';
    }
    $('hk-bang-than').innerHTML = h;
  }

  /* ---------------- Lời nói ---------------- */

  function noi(chu) {
    const el = $('hk-noi');
    el.textContent = chu;
    nhun(el);
    AT().doc(chu);
  }

  const LOI_CHAM = [
    function (p, t) { return 'Hi hi, nhột quá!'; },
    function (p, t) { return t + ' thương ' + p.ten + ' nhất!'; },
    function (p, t) { return 'Mình đi học toán tiếp nha ' + p.ten + '!'; },
    function (p, t) { return 'Con xem tủ đồ của ' + t + ' đi!'; },
    function (p, t) { return t + ' mạnh lắm đó!'; }
  ];
  function chamKhungLong() {
    AT().bat('cham');
    const p = C.hoSo;
    nhun($('hk-kl'));
    if (laTrung(p)) { noi('Cốc cốc! ' + tenKL() + ' sắp nở rồi.'); return; }
    S.loi = ((S.loi || 0) + 1) % LOI_CHAM.length;
    noi(LOI_CHAM[S.loi](p, tenKL()));
  }
  function choAn() {
    if (!S || S.an) return;
    const p = C.hoSo;
    AT().bat('qua_mong');
    if (laTrung(p)) { noi(tenKL() + ' nở rồi mới ăn quả mọng được nhé.'); return; }
    S.an = true;
    veKhungLong('an');
    noi('Măm măm! Quả mọng ngon quá. Cho ăn không tốn quả mọng đâu nhé.');
    setTimeout(function () { if (S) { S.an = false; veKhungLong(); } }, 2200);
  }
  function chamBan(i) {
    const b = dsBan(C.hoSo)[i];
    if (!b) return;
    const el = document.querySelector('#hk-ban [data-ban="' + i + '"]');
    if (el) nhun(el);
    if (b.no) noi('Tớ là ' + b.ten + '! Tớ nở vì con thuộc hết các bài ở ' + b.v.ten + '.');
    else noi('Trứng ' + b.v.ten_loai + ' đang chờ ở ' + b.v.ten + '. Con thuộc hết các bài ở đó thì trứng nở.');
  }
  function chamCup(i) {
    const c = dsCup(C.hoSo)[i];
    if (!c) return;
    if (c.dau_truong) noi(c.co ? 'Cúp ' + c.v.ten + '! Con đã hạ ' + trumCua(c.v) + '.' : 'Thắng ' + trumCua(c.v) + ' ở ' + c.v.ten + ' để có cúp này.');
    else noi(c.co ? 'Cúp ' + c.v.ten + '! Con được ' + c.sao + ' sao ở màn Cúp.' : 'Chơi xong các màn của ' + c.v.ten + ' để mở màn Cúp. Chơi màn Cúp là có cúp này.');
  }

  /* ---------------- Thẻ món đồ ---------------- */

  function loiThe(d, co) {
    if (!co) return 'Món đồ bí mật ở ' + vungCua(d).ten + '. ' + cachNhan(d);
    return d.ten + '. Con có vì ' + viSao(d) + '. ' + PK().phepCua(d.ma, tenKL());
  }

  function moThe(ma) {
    const p = C.hoSo;
    const d = PK().theoMa(ma);
    if (!d) return;
    const co = PK().coMon(p, ma);
    const dang = PK().dangMac(p) === ma;
    const v = vungCua(d);
    const ten = tenKL();
    S.the = ma;
    let h = '<div class="hk-the the" role="dialog" aria-modal="true" aria-labelledby="hk-the-ten">' +
      '<div class="hk-the-hinh' + (co ? '' : ' khoa') + '"><img src="' + C.hinh(d.anh) + '" alt=""></div><div class="hk-the-chu">';
    if (co) {
      h += '<h2 id="hk-the-ten">' + esc(d.ten) + '</h2>' +
        '<p class="hk-dong"><b>Con có vì</b><span>' + esc(viet(viSao(d))) + '.</span></p>' +
        '<p class="hk-dong"><b>Mặc ở</b><span>' + esc(viet(PK().TEN_CHO[d.cho])) + ' của ' + esc(ten) + '</span></p>' +
        '<p class="hk-dong"><b>Phép</b><span>' + esc(PK().phepCua(d.ma, ten)) + '</span></p>';
    } else {
      h += '<h2 id="hk-the-ten">Món đồ bí mật</h2>' +
        '<p class="hk-dong"><b>Ở đâu</b><span>' + esc(v.ten) + '</span></p>' +
        '<p class="hk-dong"><b>Để nhận</b><span>' + esc(cachNhan(d)) + '</span></p>' +
        '<p class="hk-dong"><b>Mặc ở</b><span>' + esc(viet(PK().TEN_CHO[d.cho])) + ' của ' + esc(ten) + '</span></p>';
    }
    h += '</div><div class="nut-hang">';
    h += '<button type="button" class="nut nut-trang" data-viec="nghe"><span aria-hidden="true">🔊</span> Nghe lại</button>';
    if (co && !laTrung(p)) h += dang ? '<button type="button" class="nut nut-trang" data-viec="coi">Cởi ra</button>' : '<button type="button" class="nut nut-cam" data-viec="mac">Mặc cho ' + esc(ten) + '</button>';
    if (!co) {
      const vm = C.vungMo(v.so);
      if (vm) h += '<button type="button" class="nut nut-cam" data-viec="di">Đi tới ' + esc(v.ten) + '</button>';
    }
    h += '<button type="button" class="nut nut-trang" data-viec="dong">Đóng</button></div></div>';
    const lop = $('hk-lop');
    lop.innerHTML = h;
    lop.classList.remove('hidden');
    AT().doc(loiThe(d, co));
    if (co) {
      C.ghi({ viec: 'xem_mon', ma: ma });
      if (PK().chuaXem(p).indexOf(ma) >= 0) {
        p.phu_kien_da_xem = p.phu_kien_da_xem || {};
        p.phu_kien_da_xem[ma] = window.NhatKy.ngayDiaPhuong(Date.now());
        C.luu();
        veBang();
      }
    }
    const nut = lop.querySelector('.nut-cam') || lop.querySelector('[data-viec="dong"]');
    setTimeout(function () { try { nut.focus(); } catch (e) { /* bỏ qua */ } }, 30);
  }

  function viecThe(viec) {
    const ma = S && S.the;
    const d = ma && PK().theoMa(ma);
    const p = C.hoSo;
    if (viec === 'nghe') { if (d) AT().doc(loiThe(d, PK().coMon(p, ma))); return; }
    $('hk-lop').classList.add('hidden');
    $('hk-lop').innerHTML = '';
    S.the = null;
    AT().bat('cham');
    if (viec === 'mac' && d) { macDo(ma); return; }
    if (viec === 'coi' && d) {
      p.dang_mac = null;
      C.ghi({ viec: 'coi', ma: ma });
      C.luu();
      veKhungLong(); veDangMac(); veBang();
      noi(tenKL() + ' cất ' + d.ten + ' vào tủ rồi.');
      return;
    }
    if (viec === 'di' && d) { roi(function () { C.moVung(d.vung); }); return; }
    AT().dungDoc();
  }

  function macDo(ma) {
    const p = C.hoSo;
    const d = PK().theoMa(ma);
    p.dang_mac = ma;
    C.ghi({ viec: 'mac', ma: ma });
    C.luu();
    AT().bat('mac_do');
    veKhungLong(); veDangMac(); veBang();
    nhun($('hk-kl'));
    noi(tenKL() + ' mặc ' + d.ten + ' rồi! ' + PK().phepCua(ma, tenKL()));
  }

  /* ---------------- Màn mở quà ---------------- */

  /**
   * Bé vừa nhận món `ma` (trứng vùng nở, thắng đấu trường): hộp quà → món đồ và phép của nó → mặc thử ngay hay để vào tủ.
   * xong(): làm tiếp (màn ăn mừng kế tiếp, bước tiếp theo bé đã chọn).
   */
  function moQua(ma, ctx, xong) {
    C = ctx;
    const d = PK().theoMa(ma);
    const man = $('man-qua');
    if (!d) { xong(); return; }
    const p = C.hoSo;
    const ten = tenKL();
    let daMo = false;
    man.innerHTML = '<div class="mq-khung" id="mq-khung">' +
      '<h1 class="mq-tieu-de">Quà cho ' + esc(ten) + '!</h1>' +
      '<button type="button" class="mq-hop" id="mq-hop" aria-label="Mở hộp quà"><span class="mq-tia" aria-hidden="true"></span><img src="' + C.hinh('hop-qua') + '" alt=""></button>' +
      '<p class="mq-goi">Chạm vào hộp quà để mở</p></div>';
    C.hien('man-qua');
    AT().bat('no_trung');
    AT().doc('Quà cho ' + ten + '! Con chạm vào hộp quà để mở nhé.');
    $('mq-hop').addEventListener('click', function () {
      if (daMo) return;
      daMo = true;
      AT().bat('mo_qua');
      C.ghi({ viec: 'mo_qua', ma: ma });
      const phep = PK().phepCua(ma, ten);
      $('mq-khung').innerHTML =
        '<div class="mq-vat"><span class="mq-tia" aria-hidden="true"></span><img src="' + C.hinh(d.anh) + '" alt=""></div>' +
        '<h1 class="mq-tieu-de">' + esc(d.ten) + '!</h1>' +
        '<p class="mq-chu">Con có vì ' + esc(viSao(d)) + '.</p>' +
        '<p class="mq-chu mq-phep"><b>Phép:</b> ' + esc(phep) + '</p>' +
        '<div class="nut-hang">' +
        (laTrung(p) ? '' : '<button type="button" class="nut nut-cam nut-to" id="mq-mac">Mặc cho ' + esc(ten) + ' ngay</button>') +
        '<button type="button" class="nut nut-trang" id="mq-sau">Để vào tủ</button></div>';
      AT().docChuoi([d.ten + '!', 'Con có vì ' + viSao(d) + '.', phep]);
      if ($('mq-mac')) $('mq-mac').addEventListener('click', function () {
        p.dang_mac = ma;
        C.ghi({ viec: 'mac', ma: ma });
        C.luu();
        AT().bat('mac_do');
        $('mq-khung').innerHTML =
          '<div class="mq-vat mq-kl"><span class="mq-tia" aria-hidden="true"></span><img id="mq-kl" src="' + C.hinh(C.hinhKhungLong(p, 'co_vu')) + '" alt=""></div>' +
          '<h1 class="mq-tieu-de">' + esc(ten) + ' oai quá!</h1>' +
          '<p class="mq-chu">' + esc(ten) + ' đang mặc ' + esc(d.ten) + '. Muốn thay đồ, con vào Hang Khủng Long trên bản đồ nhé.</p>' +
          '<div class="nut-hang"><button type="button" class="nut nut-cam nut-to" id="mq-xong">Tuyệt quá!</button></div>';
        C.anhBe('co_vu').then(function (u) { const im = $('mq-kl'); if (im) im.src = u; });
        AT().doc(ten + ' oai quá! Muốn thay đồ, con vào Hang Khủng Long trên bản đồ nhé.');
        $('mq-xong').addEventListener('click', function () { AT().bat('cham'); AT().dungDoc(); xong(); });
        setTimeout(function () { try { $('mq-xong').focus(); } catch (e) { /* bỏ qua */ } }, 30);
      });
      $('mq-sau').addEventListener('click', function () { AT().bat('cham'); AT().dungDoc(); xong(); });
    });
    setTimeout(function () { try { $('mq-hop').focus(); } catch (e) { /* bỏ qua */ } }, 30);
  }

  window.Hang = {
    mo: mo,
    roi: roi,
    moQua: moQua,
    giayDangChoi: giayDangChoi,
    dangMo: function () { return !!S; },
    _dsBan: dsBan, _dsCup: dsCup, _viSao: viSao, _cachNhan: cachNhan
  };
})();
