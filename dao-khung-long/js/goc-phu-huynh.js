/* ============================================================
   goc-phu-huynh.js – Góc phụ huynh: cổng phép nhân của người lớn, rồi các màn xem và chỉnh cho từng bé.
   Tự dựng giao diện trong <section id="man-phu-huynh">. Chỉ ghi sự kiện phu_huynh_* (YC-09).
   API: window.GocPhuHuynh = { mo(ve, ctx) }
   ctx (do app.js truyền vào, xem ctxPhuHuynh): A, hinh, hinhKhungLong, tenKhungLong, soDep, homNay, bao, hien,
   tenManNgan, taiDuLieuBe(id), tinhLai(id), thoat(), hoSoDoi(p), beBiXoa(id).
   ============================================================ */
(function () {
  'use strict';

  const NK = window.NhatKy, HS = window.HoSo;
  let ctx = null;
  let dom = null;
  const CONG = { hoi: null, nhap: '', sai: 0 };
  let be = null; // { hoSo, cauDs, vanDs, hocTap } của bé đang xem

  function $(id) { return document.getElementById(id); }
  function esc(s) { return window.PhanHoi.esc(s); }

  function khoiDom() {
    if (dom) return dom;
    const sec = $('man-phu-huynh');
    sec.innerHTML =
      '<button class="nut-quay" id="ph-quay" type="button" aria-label="Quay lại">‹</button>' +
      '<div class="ph-cong" id="ph-cong">' +
        '<div class="ph-khoa"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 10V7.5a4.5 4.5 0 0 1 9 0V10" stroke="currentColor" stroke-width="2.6" fill="none"/><rect x="4.5" y="10" width="15" height="11" rx="3" fill="currentColor"/></svg></div>' +
        '<h1 id="ph-tieu-de">Dành cho bố mẹ</h1>' +
        '<p>Nhập kết quả phép tính để vào</p>' +
        '<p class="ph-hoi" id="ph-hoi">7 × 8 = ?</p>' +
        '<div class="ph-o" id="ph-o"></div>' +
        '<div class="ban-phim ban-phim-nho" id="ph-ban-phim">' +
          [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (k) { return '<button type="button" data-k="' + k + '">' + k + '</button>'; }).join('') +
          '<button type="button" data-k="xoa" class="phim-xoa" aria-label="Xóa">⌫</button><button type="button" data-k="0">0</button><button type="button" data-k="xong" class="phim-xong">Vào</button>' +
        '</div>' +
      '</div>' +
      '<div class="ph-bang hidden" id="ph-bang">' +
        '<h1>Góc phụ huynh</h1>' +
        '<div class="ph-chon-be hidden" id="ph-chon-be"></div>' +
        '<div class="ph-o-be" id="ph-be"></div>' +
        '<div class="ph-nhom">' +
          '<h2>Tuổi và lớp</h2>' +
          '<div class="ph-dong"><span>Tuổi</span><div class="nut-chon-hang" id="ph-tuoi"></div></div>' +
          '<div class="ph-dong"><span>Lớp</span><div class="nut-chon-hang" id="ph-lop"></div></div>' +
          '<div class="ph-dong"><span>Bài đang học (Toán 2)</span><div class="ph-buoc-so"><button type="button" id="ph-bai-tru" aria-label="Bớt">−</button><b id="ph-bai">1</b><button type="button" id="ph-bai-cong" aria-label="Thêm">+</button></div></div>' +
        '</div>' +
        '<div class="ph-nhom">' +
          '<h2>Dữ liệu trên máy này</h2>' +
          '<p id="ph-thong-ke">…</p>' +
          '<div class="nut-hang trai">' +
            '<button class="nut nut-trang" id="ph-tai" type="button">Tải nhật ký (JSONL)</button>' +
            '<button class="nut nut-trang" id="ph-tinh-lai" type="button">Tính lại tóm tắt từ nhật ký</button>' +
            '<button class="nut nut-do" id="ph-xoa" type="button">Xóa dữ liệu của bé</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    dom = sec;
    $('ph-quay').addEventListener('click', function () { ctx.thoat(); });
    $('ph-ban-phim').addEventListener('click', function (e) { const b = e.target.closest('button'); if (b) congGo(b.getAttribute('data-k')); });
    $('ph-chon-be').addEventListener('click', function (e) { const b = e.target.closest('button[data-id]'); if (b) xemBe(b.getAttribute('data-id')); });
    $('ph-tuoi').addEventListener('click', function (e) { const b = e.target.closest('button'); if (b) doiCaiDat('tuoi', +b.getAttribute('data-tuoi')); });
    $('ph-lop').addEventListener('click', function (e) { const b = e.target.closest('button'); if (b) doiCaiDat('lop', +b.getAttribute('data-lop')); });
    $('ph-bai-tru').addEventListener('click', function () { doiCaiDat('bai_dang_hoc', be.hoSo.bai_dang_hoc - 1); });
    $('ph-bai-cong').addEventListener('click', function () { doiCaiDat('bai_dang_hoc', be.hoSo.bai_dang_hoc + 1); });
    $('ph-tai').addEventListener('click', taiNhatKy);
    $('ph-tinh-lai').addEventListener('click', function () {
      ctx.tinhLai(be.hoSo.id).then(function (r) {
        if (!r) return;
        ctx.bao('Đã tính lại ' + r.so_van + ' ván, ' + r.so_cau + ' câu từ ' + r.so_su_kien + ' sự kiện' + (r.khop ? '. Khớp với bản đang lưu.' : '. Đã cập nhật bản lưu.'), 4);
        return xemBe(be.hoSo.id);
      });
    });
    $('ph-xoa').addEventListener('click', xoaDuLieuBe);
    return dom;
  }

  /** Ghi sự kiện phụ huynh (chỉ khi có bé đang chơi: nhật ký luôn gắn với một bé). */
  function ghi(loai, du) { if (NK.be()) NK.ghi(loai, du, { game: 'goc-phu-huynh' }); }

  function mo(ve, c) {
    ctx = c;
    khoiDom();
    const a = 6 + Math.floor(Math.random() * 4), b = 6 + Math.floor(Math.random() * 4);
    CONG.hoi = { a: a, b: b };
    CONG.nhap = '';
    $('ph-hoi').textContent = a + ' × ' + b + ' = ?';
    $('ph-o').textContent = '';
    $('ph-cong').classList.remove('hidden');
    $('ph-bang').classList.add('hidden');
    ctx.hien('man-phu-huynh');
  }

  function congGo(k) {
    if (k === 'xoa') CONG.nhap = CONG.nhap.slice(0, -1);
    else if (k === 'xong') {
      if (Number(CONG.nhap) === CONG.hoi.a * CONG.hoi.b) { moBang(); return; }
      CONG.sai++;
      CONG.nhap = '';
      ctx.bao('Chưa đúng. Góc này dành cho bố mẹ nhé!');
      if (CONG.sai >= 3) { CONG.sai = 0; ctx.thoat(); return; }
    } else if (CONG.nhap.length < 3) CONG.nhap += k;
    $('ph-o').textContent = CONG.nhap;
  }

  function moBang() {
    $('ph-cong').classList.add('hidden');
    $('ph-bang').classList.remove('hidden');
    const ds = ctx.A.dsBe || [];
    const cb = $('ph-chon-be');
    cb.classList.toggle('hidden', ds.length < 2 && !!ctx.A.hoSo);
    cb.innerHTML = ds.map(function (p) {
      return '<button type="button" class="nut nut-trang" data-id="' + esc(p.id) + '">' + esc(p.ten) + '</button>';
    }).join('');
    const dau = ctx.A.hoSo ? ctx.A.hoSo.id : ds[0] && ds[0].id;
    if (!dau) {
      $('ph-be').innerHTML = '<p>Chưa có hồ sơ bé nào trên máy này.</p>';
      document.querySelectorAll('#ph-bang .ph-nhom').forEach(function (el) { el.classList.add('hidden'); });
      return;
    }
    ghi('phu_huynh_mo', { man: 'cai_dat' });
    xemBe(dau);
  }

  function xemBe(id) {
    return ctx.taiDuLieuBe(id).then(function (d) {
      if (!d || !d.hoSo) return;
      be = d;
      const p = d.hoSo;
      document.querySelectorAll('#ph-bang .ph-nhom').forEach(function (el) { el.classList.remove('hidden'); });
      document.querySelectorAll('#ph-chon-be button').forEach(function (b) { b.classList.toggle('chon', b.getAttribute('data-id') === id); });
      $('ph-be').innerHTML = '<img src="' + ctx.hinh(ctx.hinhKhungLong(p)) + '" alt=""><div><b>' + esc(p.ten) + '</b><span>' + esc(ctx.tenKhungLong(p)) + ' · ' + ctx.soDep(p.khung_long.qua_mong) + ' quả mọng · ' + (p.van_xong || 0) + ' ván đã xong</span></div>';
      veChon();
      return NK.docCuaBe(p.id).then(function (ds) {
        $('ph-thong-ke').textContent = ds.length + ' sự kiện trong nhật ký gốc · ' + d.vanDs.length + ' ván · ' + d.cauDs.length + ' câu. Dữ liệu chỉ nằm trên máy này, không gửi đi đâu.';
      });
    });
  }

  function veChon() {
    const p = be.hoSo;
    const tuoi = HS.tuoiHienTai(p);
    let h = '';
    for (let t = 5; t <= 11; t++) h += '<button type="button" data-tuoi="' + t + '" class="' + (t === tuoi ? 'chon' : '') + '">' + t + '</button>';
    $('ph-tuoi').innerHTML = h;
    h = '';
    for (let l = 1; l <= 5; l++) h += '<button type="button" data-lop="' + l + '" class="' + (l === p.lop ? 'chon' : '') + '">' + l + '</button>';
    $('ph-lop').innerHTML = h;
    $('ph-bai').textContent = p.bai_dang_hoc;
  }

  function doiCaiDat(truong, moi) {
    const p = be.hoSo;
    let cu;
    if (truong === 'tuoi') {
      cu = HS.tuoiHienTai(p);
      p.tuoi_khi_nhap = moi;
      p.ngay_nhap_tuoi = ctx.homNay();
      p.nam_sinh_uoc_tinh = new Date().getFullYear() - moi;
    } else if (truong === 'lop') {
      cu = p.lop; p.lop = moi; p.lop_nguon = 'phu_huynh'; p.nam_hoc_cua_lop = HS.namHocBatDau(new Date());
    } else if (truong === 'bai_dang_hoc') {
      cu = p.bai_dang_hoc; p.bai_dang_hoc = Math.max(1, Math.min(75, moi)); p.bai_nguon = 'phu_huynh'; moi = p.bai_dang_hoc;
    }
    if (cu === moi) return;
    ghi('phu_huynh_cai_dat', { truong: truong, cu: cu, moi: moi });
    ctx.hoSoDoi(p);
    veChon();
  }

  function taiNhatKy() {
    const p = be.hoSo;
    NK.xuatJsonl(p.id).then(function (txt) {
      const blob = new Blob([txt], { type: 'application/x-ndjson' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'dao-khung-long-nhat-ky-' + ctx.homNay() + '.jsonl';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      ghi('phu_huynh_cai_dat', { truong: 'tai_nhat_ky', so_su_kien: txt ? txt.split('\n').length - 1 : 0 });
    });
  }

  function xoaDuLieuBe() {
    const p = be.hoSo;
    if (!window.confirm('Xóa toàn bộ dữ liệu của ' + p.ten + ' trên máy này? Việc này không hoàn tác được.')) return;
    NK.xoaBe(p.id).then(function () {
      ctx.beBiXoa(p.id);
      ctx.bao('Đã xóa dữ liệu của ' + p.ten);
      be = null;
      ctx.thoat();
    });
  }

  window.GocPhuHuynh = { mo: mo, _trangThai: function () { return { be: be, cong: CONG }; } };
})();
