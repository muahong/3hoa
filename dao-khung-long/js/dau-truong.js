/* ============================================================
   dau-truong.js – Đấu Trường: khủng long của bé đấu trùm (Đấu Trường Học Kì 1, Đấu Trường Cuối Năm)
   - Câu hỏi trộn từ các vùng theo hồ sơ học tập (Dao.cauDauTruong trong app.js): kỹ năng bé đang yếu, kỹ năng tới hạn ôn,
     ít kỹ năng chưa học. Mọi câu ở dạng chọn đáp án, vẽ chung cho mọi loại câu: đề, hình của đề (q.hinh), các lựa chọn
     theo NganHang.veLuaChon ({ nhan, hinh, dong_ho }).
   - Mỗi câu tự làm đúng là một đòn; 3 câu tự làm đúng liền là tuyệt chiêu trừ 2 máu; đúng nhờ gợi ý là nửa đòn.
   - Câu sai: trùm làm một động tác vui (không ai mất máu, không mất quả mọng), rồi màn "Gần đúng rồi", câu quay lại
     sau 2 câu (VanChoi). Trùm hết máu là thắng, bỏ qua các câu còn lại; hết câu mà trùm còn máu là "Suýt thắng!".
   - Ghi: chon (vị trí, giá trị) mỗi lần bé chạm một lựa chọn; gợi ý cấp 3 gạch bớt một lựa chọn sai (loai_bo);
     van_ket_thuc có thang, mau_con_lai, mau_boss, so_don_trung, so_tuyet_chieu.

   Cân bằng (số câu so với máu trùm), mô phỏng bằng đúng luật ở đây và VanChoi (câu sai quay lại tối đa 2 lần):
     bé đúng 70% mỗi lượt, 12 máu: 10 câu thắng khoảng 70 đến 80% mỗi lần, 90 đến 96% trong hai lần;
     15 câu thì gần như luôn thắng (không còn là trận đấu), 9 câu thì dưới 20%.
     16 máu (cuối năm, trộn cả 10 vùng nên bé hay sai hơn): 14 câu thắng khoảng 75 đến 88% mỗi lần.
   Kiểm thử: tests/dao-khung-long-dau-truong.test.js (phần "cân bằng").
   API: window.DauTruong = { batDau(o), _trangThai(), Tran (luật trận, hàm thuần), _veLuaChon(ct, v) (HTML một lựa chọn) }
   ============================================================ */
(function () {
  'use strict';

  const CO_GIAM_DONG = (function () { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();

  /** Số câu tự làm đúng liền để tung tuyệt chiêu. */
  const LUA_DAY = 3;
  /** Thời gian (ms) của các pha: tới lúc trúng đòn, sang câu mới, trùm làm trò, ăn mừng. */
  const T = CO_GIAM_DONG
    ? { trung: 120, trungTC: 200, tiep: 800, tiepTC: 1000, tro: 600, thang: 1300, het: 600 }
    : { trung: 380, trungTC: 820, tiep: 1400, tiepTC: 2150, tro: 1400, thang: 2700, het: 1300 };
  const TEN_TUYET_CHIEU = ['Cú Húc Sấm Sét', 'Đuôi Quẫy Cầu Vồng', 'Tiếng Gầm Ngôi Sao', 'Cú Nhảy Sao Băng'];
  /** Trùm né đòn bằng một động tác vui: không làm bé sợ, không chê bé. */
  const TRO_TRUM = [
    { lop: 'dt-tro-nhay', noi: 'Vèo! Ta né kịp rồi!' },
    { lop: 'dt-tro-lac', noi: 'Ta nhảy điệu lắc lư nè!' },
    { lop: 'dt-tro-xoay', noi: 'Ta xoay một vòng!' },
    { lop: 'dt-tro-nhay', noi: 'Ối, suýt nữa thì trúng ta!' }
  ];

  /* ---------------- Trận đấu: hàm thuần (kiểm thử bằng Node) ---------------- */

  function taoTran(mauBoss) {
    const m = Math.max(1, Math.round((Number(mauBoss) || 12) * 2) / 2);
    return { mauToiDa: m, mau: m, lua: 0, soDon: 0, soTuyetChieu: 0, soNuaDon: 0, soHut: 0, satThuong: 0 };
  }

  /**
   * Một câu vừa đóng. ketQua theo VanChoi: 'dung_ngay' (một đòn, thêm một ngôi sao; đủ 3 sao là tuyệt chiêu 2 đòn),
   * 'dung_sau_goi_y' hoặc 'dung_lan_2' (nửa đòn, giữ nguyên sao), còn lại là trượt (tắt hết sao, không ai mất gì).
   * Trả về { trung, satThuong, tuyetChieu, nuaDon, thang, mau }.
   */
  function danh(t, ketQua) {
    if (ketQua === 'dung_ngay' || ketQua === 'dung_sau_goi_y' || ketQua === 'dung_lan_2') {
      let st = 0.5;
      let tuyet = false;
      if (ketQua === 'dung_ngay') {
        t.lua++;
        tuyet = t.lua >= LUA_DAY;
        st = tuyet ? 2 : 1;
        if (tuyet) { t.lua = 0; t.soTuyetChieu++; }
      } else t.soNuaDon++;
      const truoc = t.mau;
      t.mau = Math.max(0, t.mau - st);
      t.satThuong += truoc - t.mau;
      t.soDon++;
      return { trung: true, satThuong: st, tuyetChieu: tuyet, nuaDon: st < 1, thang: t.mau <= 0, mau: t.mau };
    }
    t.lua = 0;
    t.soHut++;
    return { trung: false, satThuong: 0, tuyetChieu: false, nuaDon: false, thang: false, mau: t.mau };
  }

  /** Máu hiện cho bé (số nguyên, nửa máu làm tròn lên). */
  function mauHien(t) { return Math.ceil(t.mau - 1e-9); }

  /** Trường riêng của van_ket_thuc. */
  function ketQuaVan(t, diem) {
    return {
      diem: diem || 0, thang: t.mau <= 0, mau_con_lai: t.mau, mau_boss: t.mauToiDa,
      so_don_trung: t.soDon, so_tuyet_chieu: t.soTuyetChieu, so_nua_don: t.soNuaDon
    };
  }

  /** Trùm chỉ còn ít máu (tới một phần tư, ít nhất 2): bé "suýt thắng". Còn nhiều hơn thì động viên, không nói suýt thắng. */
  function suytThang(t) { return t.mau > 0 && mauHien(t) <= Math.max(2, Math.ceil(t.mauToiDa / 4)); }

  /** Tiêu đề thẻ kết quả. */
  function tieuDe(t) { return t.mau <= 0 ? 'Chiến thắng!' : suytThang(t) ? 'Suýt thắng!' : 'Cố lên nhé!'; }

  /** Câu chốt trận cho bé (dưới tiêu đề). */
  function loiKet(t, tenBoss, tenKL) {
    if (t.mau <= 0) return (tenKL || 'Khủng long của con') + ' đã hạ ' + tenBoss + '!';
    return 'Trùm còn ' + mauHien(t) + ' máu, ' + (suytThang(t) ? 'con thử lại nhé!' : 'lần sau mình hạ trùm nhé!');
  }

  /** Một dòng tóm tắt cho màn kết thúc. */
  function dongPhu(t, tenBoss, diem) {
    const d = (diem || 0).toLocaleString('vi-VN') + ' điểm';
    if (t.mau <= 0) return 'Hạ ' + tenBoss + ': ' + t.soDon + ' đòn trúng' + (t.soTuyetChieu ? ', ' + t.soTuyetChieu + ' tuyệt chiêu' : '') + ' · ' + d;
    if (suytThang(t)) return 'Suýt thắng! Trùm còn ' + mauHien(t) + ' máu, con thử lại nhé · ' + d;
    return 'Trùm còn ' + mauHien(t) + ' máu, lần sau mình hạ trùm nhé · ' + d;
  }

  const Tran = { LUA_DAY: LUA_DAY, tao: taoTran, danh: danh, mauHien: mauHien, suytThang: suytThang, tieuDe: tieuDe, ketQuaVan: ketQuaVan, loiKet: loiKet, dongPhu: dongPhu };

  /* ---------------- Giao diện ---------------- */

  let s = null;
  let dom = null;

  function K() { return window.KhungChoi; }
  function NH() { return window.NganHang; }
  function AT() { return window.AmThanh; }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  const SAO_NO = '<svg viewBox="0 0 100 100" aria-hidden="true"><polygon points="50,2 60,34 94,22 70,48 98,64 64,66 70,98 50,74 30,98 36,66 2,64 30,48 6,22 40,34" fill="#ffd166" stroke="#ff8a1f" stroke-width="4" stroke-linejoin="round"/><circle cx="50" cy="52" r="14" fill="#fff8dc"/></svg>';

  const KHUON = [
    '<div class="dt-dau" id="dt-dau">',
    '  <div class="dt-ben dt-ben-be">',
    '    <div class="dt-bang dt-bang-be"><b class="dt-ten" id="dt-ten-be"></b>',
    '      <span class="dt-sao" id="dt-sao" role="img" aria-label="Sao tuyệt chiêu"><i></i><i></i><i></i></span></div>',
    '    <div class="dt-dung dt-dung-be"><div class="dt-dong" id="dt-dong-be"><img class="dt-hinh-be" id="dt-hinh-be" alt=""></div>',
    '      <p class="dt-noi dt-noi-be hidden" id="dt-noi-be" role="status"></p></div>',
    '  </div>',
    '  <div class="dt-giua" id="dt-giua"><div class="dt-hinh-de hidden" id="dt-hinh-de"></div></div>',
    '  <div class="dt-ben dt-ben-trum">',
    '    <div class="dt-bang dt-bang-trum"><b class="dt-ten" id="dt-ten-trum"></b>',
    '      <div class="dt-mau" id="dt-mau" role="img"><span class="dt-mau-tim" aria-hidden="true">❤</span>',
    '        <span class="dt-mau-ong"><i class="dt-mau-mat" id="dt-mau-mat"></i><i class="dt-mau-con" id="dt-mau-con"></i></span>',
    '        <b class="dt-mau-so" id="dt-mau-so" aria-hidden="true"></b></div></div>',
    '    <div class="dt-dung dt-dung-trum"><div class="dt-dong" id="dt-dong-trum"><img class="dt-hinh-trum" id="dt-hinh-trum" alt=""></div>',
    '      <span class="dt-no" id="dt-no" aria-hidden="true">' + SAO_NO + '</span>',
    '      <span class="dt-choang hidden" id="dt-choang" aria-hidden="true">💫</span>',
    '      <p class="dt-noi dt-noi-trum hidden" id="dt-noi-trum" role="status"></p></div>',
    '  </div>',
    '  <span class="dt-dan hidden" id="dt-dan" aria-hidden="true"></span>',
    '  <div class="dt-bang-lon hidden" id="dt-bang-lon" aria-hidden="true"><b id="dt-bl-chu"></b><small id="dt-bl-phu"></small></div>',
    '</div>',
    '<div class="dt-lua-chon" id="dt-lc" role="group" aria-label="Các đáp án"></div>',
    '<div class="dt-phu hidden" id="dt-mo-dau" role="dialog" aria-labelledby="dt-md-ten">',
    '  <div class="dt-the">',
    '    <div class="dt-canh"><img class="dt-canh-be" id="dt-md-be" alt=""><span class="dt-set" aria-hidden="true">⚡</span><img class="dt-canh-trum" id="dt-md-trum" alt=""></div>',
    '    <p class="dt-the-nhan" id="dt-md-nhan"></p>',
    '    <h2 class="dt-the-ten" id="dt-md-ten"></h2>',
    '    <p class="dt-the-loi">Hạ trùm bằng những câu trả lời đúng!</p>',
    '    <ul class="dt-luat" id="dt-md-luat"></ul>',
    '    <button class="nut nut-cam nut-to" id="dt-bat-dau" type="button">Bắt đầu</button>',
    '  </div>',
    '</div>',
    '<div class="dt-phu dt-ket hidden" id="dt-ket" role="dialog" aria-labelledby="dt-k-tieu-de">',
    '  <div class="dt-the dt-the-ket">',
    '    <div class="dt-canh"><img class="dt-canh-be" id="dt-k-be" alt=""><span class="dt-set dt-cup" id="dt-k-cup" aria-hidden="true">🏆</span><img class="dt-canh-trum" id="dt-k-trum" alt=""></div>',
    '    <h2 class="dt-the-ten" id="dt-k-tieu-de"></h2>',
    '    <p class="dt-the-loi" id="dt-k-loi"></p>',
    '    <div class="dt-k-mau hidden" id="dt-k-mau" aria-hidden="true"><span class="dt-mau-ong"><i class="dt-mau-con" id="dt-k-mau-con"></i></span></div>',
    '    <p class="dt-k-so" id="dt-k-so"></p>',
    '    <button class="nut nut-cam nut-to" id="dt-tiep" type="button">Tiếp tục</button>',
    '  </div>',
    '</div>'
  ].join('\n');

  function khoiDom() {
    let san = document.getElementById('dt-san');
    if (!san) {
      san = document.createElement('div');
      san.className = 'kc-game dt-san';
      san.id = 'dt-san';
      K().san().appendChild(san);
    }
    if (dom && dom.san === san) return dom;
    san.innerHTML = KHUON;
    const q = function (id) { return san.querySelector('#' + id); };
    dom = { san: san };
    ['dau', 'ten-be', 'sao', 'dong-be', 'hinh-be', 'noi-be', 'giua', 'hinh-de', 'ten-trum', 'mau', 'mau-mat', 'mau-con', 'mau-so',
      'dong-trum', 'hinh-trum', 'no', 'choang', 'noi-trum', 'dan', 'bang-lon', 'bl-chu', 'bl-phu', 'lc',
      'mo-dau', 'md-be', 'md-trum', 'md-nhan', 'md-ten', 'md-luat', 'bat-dau',
      'ket', 'k-be', 'k-cup', 'k-trum', 'k-tieu-de', 'k-loi', 'k-mau', 'k-mau-con', 'k-so', 'tiep'].forEach(function (id) {
      dom[id.replace(/-([a-z])/g, function (m, c) { return c.toUpperCase(); })] = q('dt-' + id);
    });
    dom.lc.addEventListener('click', function (e) {
      const b = e.target.closest('.dt-lc');
      if (b) chon(+b.getAttribute('data-i'));
    });
    dom.batDau.addEventListener('click', function () { batDauDanh(); });
    dom.tiep.addEventListener('click', function () { ketThuc(); });
    return dom;
  }

  /* ---------------- Hẹn giờ gắn với một ván (ván cũ không chạy nhầm sang ván mới) ---------------- */

  function hen(ms, fn) {
    const my = s;
    if (!my) return;
    const id = setTimeout(function () {
      my.hen = my.hen.filter(function (x) { return x !== id; });
      if (s !== my || my.daXong) return;
      // Bé đang tạm dừng: chờ bé chơi tiếp rồi mới sang pha sau (không mở lời giải dưới màn tạm dừng)
      const kc = K()._trangThai();
      if (kc && kc.tamDung) { hen(250, fn); return; }
      fn();
    }, ms);
    my.hen.push(id);
  }
  function xoaHen() { if (s) { s.hen.forEach(clearTimeout); s.hen = []; } }

  /* ---------------- Bắt đầu ---------------- */

  /**
   * o: { van, man (có man.dau_truong: { boss, ten_boss, mau_boss }), nen, phu, hinhGoiY, hinhBe, hinhCoVu, tenKhungLong,
   *      tuyetChieu (tên tuyệt chiêu khi khủng long mặc Bộ Giáp Học Kì 1, không thì null),
   *      anh(ten) → url, xemBaiHoc, onXong(kq), onThoat(kq) }
   */
  function batDau(o) {
    if (s) { xoaHen(); s.daXong = true; }
    khoiDom();
    const man = o.man || {};
    const dt = man.dau_truong || {};
    s = {
      o: o, van: o.van, man: man,
      boss: { ten: dt.ten_boss || 'Trùm', hinh: anh(o, dt.boss || 'boss-hk1') },
      tran: taoTran(dt.mau_boss || 12),
      q: null, lc: [], khoa: true, giaiDoan: 'mo_dau', hen: [], daXong: false, lanTro: 0
    };
    K().mo({
      van: o.van, game: 'dau-truong', tenGame: man.ten || 'Đấu Trường', nen: o.nen, phu: o.phu, hinhGoiY: o.hinhGoiY,
      onGoiY: goiY, onThoat: thoat, xemBaiHoc: o.xemBaiHoc, onPhim: phim
    });
    s.van.batDau({ mau_boss: s.tran.mauToiDa, tuyet_chieu_sau: LUA_DAY, boss: dt.boss || null });
    // Tải trước hình cổ vũ, hình suy nghĩ và trùm để đổi hình không bị nháy
    [o.hinhCoVu, o.hinhGoiY, s.boss.hinh].forEach(function (u) { if (u) { const im = new Image(); im.src = u; } });
    moDau();
  }

  function anh(o, ten) { return o && o.anh ? o.anh(ten) : 'assets/img/' + ten + '.webp'; }
  function tenKL() { return (s && s.o.tenKhungLong) || 'Khủng long của con'; }

  function moDau() {
    const o = s.o;
    dom.hinhBe.src = o.hinhBe || '';
    dom.hinhTrum.src = s.boss.hinh;
    dom.hinhTrum.alt = s.boss.ten;
    dom.tenBe.textContent = tenKL();
    dom.tenTrum.textContent = s.boss.ten;
    dom.dau.classList.remove('co-hinh');
    dom.hinhDe.classList.add('hidden');
    dom.hinhDe.innerHTML = '';
    dom.lc.innerHTML = '';
    ['dongBe', 'dongTrum'].forEach(function (k) { dom[k].className = 'dt-dong'; });
    dom.choang.classList.add('hidden');
    dom.bangLon.classList.add('hidden');
    moThe(dom.ket, false);
    anNoi();
    veMau();
    veSao();
    dom.mdBe.src = o.hinhBe || '';
    dom.mdTrum.src = s.boss.hinh;
    dom.mdNhan.textContent = (s.man.ten || 'Đấu Trường') + ' · ' + s.van.soCauDuKien() + ' câu hỏi';
    dom.mdTen.textContent = s.boss.ten;
    dom.mdLuat.innerHTML =
      '<li><span class="dt-luat-tim">❤</span>Trùm có <b>' + esc(s.tran.mauToiDa) + '</b> máu</li>' +
      '<li><span class="dt-luat-no">💥</span>Đúng 1 câu: trúng 1 đòn</li>' +
      '<li><span class="dt-luat-sao">★★★</span>Đúng liền 3 câu: tuyệt chiêu!</li>';
    moThe(dom.moDau, true);
    K().de('', null);
    K().tienDo();
    setTimeout(function () { try { dom.batDau.focus(); } catch (e) { /* bỏ qua */ } }, 50);
    AT().doc(s.boss.ten + ' thách đấu! Hạ trùm bằng những câu trả lời đúng!');
  }

  function batDauDanh() {
    if (!s || s.giaiDoan !== 'mo_dau' || K().dangKhoa()) return;
    s.giaiDoan = 'dau';
    moThe(dom.moDau, false);
    AT().bat('xuat_phat');
    cauMoi();
  }

  /* ---------------- Một câu ---------------- */

  function cauMoi() {
    if (!s || s.giaiDoan !== 'dau') return;
    anNoi();
    dom.hinhBe.src = s.o.hinhBe || '';
    dom.dongBe.className = 'dt-dong';
    dom.dongTrum.className = 'dt-dong';
    if (!s.van.conCau()) { hetCau(); return; }
    const q = s.van.cauTiep();
    if (!q) { hetCau(); return; }
    s.q = q;
    s.khoa = false;
    let lc = q.lua_chon;
    if (!lc || lc.length < 2) {
      // Phòng khi một loại câu chưa có sẵn lựa chọn: dựng từ đáp án nhiễu của ngân hàng
      lc = NH().tron(s.van.rng, [{ gia_tri: q.dap_an, loi: [] }].concat(NH().taoNhieu(q.ky_nang, q.cau_truc, s.van.rng)));
      q.lua_chon = lc;
    }
    s.lc = lc.map(function (x, i) { return { gia_tri: x.gia_tri, i: i, tt: 'mo' }; });
    K().anGoiY();
    K().tienDo();
    veHinhDe(q);
    veLuaChon();
    K().de(q.de, q.de_doc, { nay: true, docNgay: true });
  }

  function laDung(v) {
    const q = s.q;
    try { return NH().nhanBietLoi(q.cau_truc, v).length === 0; } catch (e) { return String(v) === String(q.dap_an); }
  }
  function coTen(q, v) {
    const l = NH().nhanBietLoi(q.cau_truc, v);
    return l.length && !l.every(function (m) { return m === 'khac' || m === 'dem-lech'; });
  }

  /* ---------------- Vẽ ---------------- */

  function veHinhDe(q) {
    const co = !!q.hinh;
    dom.dau.classList.toggle('co-hinh', co);
    dom.hinhDe.classList.toggle('hidden', !co);
    dom.hinhDe.innerHTML = co ? q.hinh : ''; // hình do ngân hàng câu dựng (không chứa dữ liệu người dùng)
  }

  function lopChu(t) { const n = String(t).length; return n > 16 ? ' rat-dai' : n > 6 ? ' dai' : ''; }

  /**
   * Một lựa chọn: hình (nếu ngân hàng có), đồng hồ, hoặc chữ. Có hình thì mặc định không hiện nhãn (nhãn thường lộ đáp án,
   * như "Hình tứ giác", "8 giờ 15 phút"); loại câu muốn hiện nhãn dưới hình thì trả thêm hien_nhan: true.
   */
  function veMot(ct, v, lopChung) {
    let r = null;
    try { r = NH().veLuaChon(ct, v); } catch (e) { r = null; }
    r = r || {};
    let nhan = r.nhan != null ? String(r.nhan) : '';
    if (!nhan) { try { nhan = NH().hienGiaTriCau(ct, v); } catch (e) { nhan = String(v); } }
    const phu = r.hien_nhan ? '<span class="dt-lc-phu">' + esc(nhan) + '</span>' : '';
    if (r.hinh) return { html: '<span class="dt-lc-hinh">' + r.hinh + '</span>' + phu, nhan: nhan, hinh: true };
    if (r.dong_ho) return { html: '<span class="dt-lc-hinh">' + dongHo(r.dong_ho.h, r.dong_ho.m) + '</span>' + phu, nhan: nhan, hinh: true };
    return { html: '<span class="dt-lc-chu' + (lopChung != null ? lopChung : lopChu(nhan)) + '">' + esc(nhan) + '</span>', nhan: nhan, hinh: false };
  }

  function veLuaChon() {
    const q = s.q;
    let ve = s.lc.map(function (c) { return veMot(q.cau_truc, c.gia_tri); });
    // Cùng một cỡ chữ cho cả hàng, theo nhãn dài nhất (không để "Có thể" to hơn hẳn "Không thể")
    const dai = ve.reduce(function (m, x) { return x.hinh ? m : Math.max(m, x.nhan.length); }, 0);
    const lopChung = lopChu(new Array(dai + 1).join('x'));
    ve = s.lc.map(function (c) { return veMot(q.cau_truc, c.gia_tri, lopChung); });
    const coHinh = ve.some(function (x) { return x.hinh; });
    dom.lc.className = 'dt-lua-chon so-' + s.lc.length + (coHinh ? ' co-hinh' : '');
    dom.lc.innerHTML = s.lc.map(function (c, i) {
      const x = ve[i];
      const nhanDoc = x.hinh && /^\d{1,2}:\d{2}$/.test(String(c.gia_tri)) ? 'Đồng hồ ' + (i + 1) : x.nhan;
      return '<button type="button" class="dt-lc' + (x.hinh ? ' co-hinh' : '') + '" data-i="' + i + '" style="--tre:' + (i * 0.07) + 's"' +
        ' aria-label="' + esc(nhanDoc) + '">' + x.html + '</button>';
    }).join('');
  }

  function nut(i) { return dom.lc.querySelector('.dt-lc[data-i="' + i + '"]'); }

  /** Đồng hồ kim đơn giản (dùng khi ngân hàng chỉ cho { h, m } mà chưa có DongHo.svg). */
  function dongHo(h, m) {
    if (window.DongHo && typeof window.DongHo.svg === 'function') {
      try { return window.DongHo.svg(h, m); } catch (e) { /* vẽ bản đơn giản */ }
    }
    h = Number(h) || 0; m = Number(m) || 0;
    const F = 'Baloo 2, Arial Rounded MT Bold, sans-serif';
    let t = '<svg viewBox="0 0 120 120" role="img" aria-label="Đồng hồ" xmlns="http://www.w3.org/2000/svg">';
    t += '<circle cx="60" cy="60" r="56" fill="#ffd166"/><circle cx="60" cy="60" r="50" fill="#fff" stroke="#3b2f63" stroke-width="3"/>';
    for (let i = 1; i <= 12; i++) {
      const g = i * Math.PI / 6;
      t += '<text x="' + (60 + Math.sin(g) * 39).toFixed(1) + '" y="' + (60 - Math.cos(g) * 39 + 4.5).toFixed(1) + '" text-anchor="middle" font-size="13" font-weight="800" fill="#221a3b" font-family="' + F + '">' + i + '</text>';
    }
    const gGio = ((h % 12) + m / 60) * Math.PI / 6;
    const gPhut = m * Math.PI / 30;
    t += '<line x1="60" y1="60" x2="' + (60 + Math.sin(gGio) * 24).toFixed(1) + '" y2="' + (60 - Math.cos(gGio) * 24).toFixed(1) + '" stroke="#221a3b" stroke-width="6" stroke-linecap="round"/>';
    t += '<line x1="60" y1="60" x2="' + (60 + Math.sin(gPhut) * 38).toFixed(1) + '" y2="' + (60 - Math.cos(gPhut) * 38).toFixed(1) + '" stroke="#ff6b35" stroke-width="4" stroke-linecap="round"/>';
    return t + '<circle cx="60" cy="60" r="4.5" fill="#221a3b"/></svg>';
  }

  function veMau() {
    const t = s.tran;
    const ti = Math.max(0, t.mau / t.mauToiDa);
    const pt = Math.round(ti * 1000) / 10 + '%';
    dom.mauCon.style.width = pt;
    dom.mauMat.style.width = pt;
    dom.mau.style.setProperty('--so-khuc', t.mauToiDa);
    dom.mauSo.textContent = mauHien(t);
    dom.mau.setAttribute('aria-label', 'Máu của trùm: còn ' + mauHien(t) + ' trên ' + t.mauToiDa);
    dom.mau.classList.toggle('it', ti > 0 && ti <= 0.34);
  }

  function veSao(sangHet) {
    const n = sangHet ? LUA_DAY : s.tran.lua;
    dom.sao.querySelectorAll('i').forEach(function (el, i) { el.classList.toggle('sang', i < n); el.classList.toggle('no', !!sangHet); });
    dom.sao.setAttribute('aria-label', 'Sao tuyệt chiêu: ' + n + ' trên ' + LUA_DAY);
  }

  function noi(ai, chu) {
    const el = ai === 'be' ? dom.noiBe : dom.noiTrum;
    el.textContent = chu;
    el.classList.remove('hidden');
    el.classList.remove('hien');
    void el.offsetWidth;
    el.classList.add('hien');
  }
  function anNoi(ai) {
    if (!dom) return;
    if (!ai || ai === 'be') dom.noiBe.classList.add('hidden');
    if (!ai || ai === 'trum') dom.noiTrum.classList.add('hidden');
  }

  /** Bật lại một hiệu ứng CSS trên phần tử (gỡ lớp, ép vẽ lại, thêm lớp). */
  function hieuUng(el, lop) {
    el.classList.remove(lop);
    void el.offsetWidth;
    el.classList.add(lop);
  }

  /** Hiện hoặc ẩn một thẻ (mở đầu, kết quả); khi có thẻ thì ẩn sân đấu phía sau cho gọn. */
  function moThe(el, co) {
    el.classList.toggle('hidden', !co);
    dom.san.classList.toggle('co-the', !dom.moDau.classList.contains('hidden') || !dom.ket.classList.contains('hidden'));
  }

  function bangLon(chu, phu, lop) {
    dom.blChu.textContent = chu;
    dom.blPhu.textContent = phu || '';
    dom.bangLon.className = 'dt-bang-lon' + (lop ? ' ' + lop : '');
    hieuUng(dom.bangLon, 'hien');
  }

  function tam(el) { return K().tamCua(el); }

  /* ---------------- Thao tác của bé ---------------- */

  function chon(i) {
    if (!s || s.giaiDoan !== 'dau' || s.khoa || K().dangKhoa()) return;
    const q = s.q;
    if (!q || q.xong) return;
    const c = s.lc[i];
    if (!c || c.tt !== 'mo') return;
    const viTri = 'lua_chon_' + (i + 1);
    s.van.thaoTac('chon', { doi_tuong: 'lua_chon', vi_tri: viTri, gia_tri: c.gia_tri });
    const kq = s.van.traLoi(c.gia_tri, { vi_tri: viTri, so_lua_chon: s.lc.length });
    if (!kq) return;
    if (kq.dung) { trungDon(c, kq); return; }
    if (kq.thuLai) {
      // Dạng chọn đáp án chỉ có một lần thử; giữ nhánh này cho loại câu cho thử lại
      c.tt = 'gach';
      const b = nut(i);
      if (b) { b.classList.add('sai'); b.disabled = true; }
      AT().bat('sai');
      K().bao(kq.loiNoi + '. Con thử lại nhé', 'sai', 2.6);
      return;
    }
    truot(c, kq);
  }

  /** Đúng: khủng long của bé ra đòn (hoặc tuyệt chiêu), trùm mất máu. */
  function trungDon(c, kq) {
    s.khoa = true;
    const r = danh(s.tran, kq.ketQua);
    const b = nut(c.i);
    if (b) b.classList.add('dung');
    dom.lc.classList.add('xong');
    AT().bat('dung');
    anNoi('be');
    dom.hinhBe.src = s.o.hinhCoVu || s.o.hinhBe || '';
    const diem = kq.ketQua === 'dung_ngay' ? (r.tuyetChieu ? 200 : 100) : 40;
    const xa = khoangCach();
    dom.dongBe.style.setProperty('--xa', xa + 'px');
    if (r.tuyetChieu) {
      // Mặc Bộ Giáp Học Kì 1: tuyệt chiêu riêng của bộ giáp (vẫn trừ 2 máu như mọi tuyệt chiêu)
      const ten = s.o.tuyetChieu || TEN_TUYET_CHIEU[(s.tran.soTuyetChieu - 1) % TEN_TUYET_CHIEU.length];
      veSao(true);
      bangLon('Tuyệt chiêu!', ten, 'tuyet-chieu');
      hieuUng(dom.dongBe, 'dt-tuyet-chieu');
      AT().bat('tang_toc');
      AT().doc('Tuyệt chiêu! ' + ten);
      bayDan();
    } else {
      veSao();
      hieuUng(dom.dongBe, 'dt-tan-cong');
    }
    const pNut = b ? tam(b) : null;
    hen(r.tuyetChieu ? T.trungTC : T.trung, function () {
      const p = tam(dom.dongTrum);
      hieuUng(dom.no, r.tuyetChieu ? 'no-to' : 'no');
      hieuUng(dom.dongTrum, 'dt-bi-trung');
      veMau();
      soTru(r.satThuong);
      // Điểm và quả mọng bay lên từ đáp án bé chọn; số máu bị trừ hiện trên trùm
      const pd = pNut || { x: p.x, y: p.y + 120 };
      K().congDiem(diem, pd.x, pd.y - 70, kq.quaMong ? '+' + kq.quaMong + ' quả mọng' : null);
      K().phao(p.x, p.y, r.tuyetChieu ? 30 : 14);
      if (r.tuyetChieu) veSao();
    });
    hen(r.tuyetChieu ? T.tiepTC : T.tiep, function () {
      dom.dongBe.className = 'dt-dong';
      if (r.thang) { thang(); return; }
      cauMoi();
    });
  }

  function khoangCach() {
    const a = dom.dongBe.getBoundingClientRect(), b = dom.dongTrum.getBoundingClientRect();
    const d = (b.left + b.width / 2) - (a.left + a.width / 2);
    return Math.max(40, Math.round(d * 0.42));
  }

  /** Ngôi sao tuyệt chiêu bay từ khủng long của bé sang trùm. */
  function bayDan() {
    const g = dom.dau.getBoundingClientRect();
    const a = dom.dongBe.getBoundingClientRect(), b = dom.dongTrum.getBoundingClientRect();
    dom.dan.style.setProperty('--tu-x', Math.round(a.left + a.width * 0.62 - g.left) + 'px');
    dom.dan.style.setProperty('--tu-y', Math.round(a.top + a.height * 0.45 - g.top) + 'px');
    dom.dan.style.setProperty('--den-x', Math.round(b.left + b.width * 0.5 - g.left) + 'px');
    dom.dan.style.setProperty('--den-y', Math.round(b.top + b.height * 0.45 - g.top) + 'px');
    dom.dan.classList.remove('hidden');
    hieuUng(dom.dan, 'bay');
    hen(T.trungTC + 60, function () { dom.dan.classList.add('hidden'); dom.dan.classList.remove('bay'); });
  }

  function soTru(st) {
    const el = document.createElement('b');
    el.className = 'dt-so-tru' + (st >= 2 ? ' to' : '');
    el.textContent = '−' + (st === 0.5 ? '½' : st);
    el.setAttribute('aria-hidden', 'true');
    dom.dongTrum.parentNode.appendChild(el);
    setTimeout(function () { el.remove(); }, 1300);
  }

  /** Sai: trùm làm một động tác vui rồi mở màn "Gần đúng rồi". */
  function truot(c, kq) {
    s.khoa = true;
    danh(s.tran, 'sai');
    veSao();
    const b = nut(c.i);
    if (b) b.classList.add('sai');
    AT().bat('sai');
    const tro = TRO_TRUM[s.lanTro++ % TRO_TRUM.length];
    hieuUng(dom.dongTrum, tro.lop);
    noi('trum', tro.noi);
    hen(T.tro, function () {
      anNoi('trum');
      dom.dongTrum.className = 'dt-dong';
      K().phanHoiCau(s.q, c.gia_tri, kq, function () { if (s && !s.daXong) cauMoi(); });
    });
  }

  /** Gợi ý ba cấp do khủng long của bé nói; cấp 3 gạch bớt một lựa chọn sai (giữ lựa chọn mang lỗi có tên). */
  function goiY() {
    if (!s) return;
    if (s.giaiDoan === 'mo_dau') { K().bao('Con bấm Bắt đầu nhé'); return; }
    if (s.giaiDoan !== 'dau' || s.khoa || K().dangKhoa()) return;
    const q = s.van.q;
    if (!q || q.xong) return;
    if (q.goiYCap >= 3) { K().bao('Con đã xem hết gợi ý rồi, con chọn đi nhé'); return; }
    let them = null;
    let gach = null;
    if (q.goiYCap + 1 === 3) {
      const mo = s.lc.filter(function (c) { return c.tt === 'mo'; });
      const sai = mo.filter(function (c) { return !laDung(c.gia_tri); });
      // Chỉ gạch khi còn từ 3 lựa chọn, để câu vẫn còn chọn thật sự
      if (mo.length >= 3 && sai.length) {
        sai.sort(function (a, b) { return (coTen(q, a.gia_tri) ? 1 : 0) - (coTen(q, b.gia_tri) ? 1 : 0); });
        gach = sai[0];
        them = { loai_bo: gach.gia_tri };
      }
    }
    const g = K().goiY(them);
    if (!g) return;
    K().anGoiY(); // khủng long của bé nói gợi ý ngay trên sân đấu
    dom.hinhBe.src = s.o.hinhGoiY || s.o.hinhBe || '';
    noi('be', g.loi);
    if (gach) {
      gach.tt = 'gach';
      const b = nut(gach.i);
      if (b) { b.classList.add('gach'); b.disabled = true; }
    }
  }

  function phim(e) {
    if (!s) return;
    const k = e.key;
    if (s.giaiDoan === 'mo_dau' && (k === 'Enter' || k === ' ')) { batDauDanh(); e.preventDefault(); return; }
    if (s.giaiDoan === 'ket' && !dom.ket.classList.contains('hidden') && (k === 'Enter' || k === ' ')) { ketThuc(); e.preventDefault(); return; }
    if (s.giaiDoan === 'dau' && /^[1-9]$/.test(k)) chon(+k - 1);
  }

  /* ---------------- Thắng, suýt thắng ---------------- */

  function thang() {
    s.giaiDoan = 'ket';
    s.khoa = true;
    K().de('', null);
    K().anGoiY();
    dom.lc.innerHTML = '';
    dom.lc.className = 'dt-lua-chon';
    veHinhDe({});
    dom.hinhBe.src = s.o.hinhCoVu || s.o.hinhBe || '';
    hieuUng(dom.dongBe, 'dt-mung');
    dom.dongTrum.className = 'dt-dong';
    hieuUng(dom.dongTrum, 'dt-thua');
    dom.choang.classList.remove('hidden');
    noi('trum', 'Ôi, ta chóng mặt quá! Con giỏi thật đấy!');
    bangLon('Chiến thắng!', tenKL() + ' đã hạ ' + s.boss.ten, 'thang');
    AT().bat('hoan_thanh');
    AT().doc('Chiến thắng! ' + tenKL() + ' đã hạ ' + s.boss.ten + '!');
    const p = tam(dom.dau);
    [0, 450, 900].forEach(function (ms, i) {
      hen(ms, function () { K().phao(p.x + (i - 1) * 180, p.y - 40, 26); });
    });
    hen(T.thang, function () { moKet(true); });
  }

  function hetCau() {
    s.giaiDoan = 'ket';
    s.khoa = true;
    K().de('', null);
    K().anGoiY();
    dom.lc.innerHTML = '';
    dom.lc.className = 'dt-lua-chon';
    veHinhDe({});
    noi('trum', 'Phù, suýt nữa thì ta thua rồi!');
    hieuUng(dom.dongTrum, 'dt-tro-lac');
    hen(T.het, function () { moKet(false); });
  }

  function moKet(thangTran) {
    const t = s.tran;
    anNoi();
    dom.bangLon.classList.add('hidden');
    dom.kBe.src = thangTran ? (s.o.hinhCoVu || s.o.hinhBe || '') : (s.o.hinhBe || '');
    dom.kTrum.src = s.boss.hinh;
    dom.kTrum.className = 'dt-canh-trum' + (thangTran ? ' thua' : '');
    dom.kTieuDe.textContent = tieuDe(t);
    dom.ket.classList.toggle('thang', thangTran);
    dom.kCup.classList.toggle('hidden', !thangTran);
    dom.kLoi.textContent = loiKet(t, s.boss.ten, tenKL());
    dom.kMau.classList.toggle('hidden', thangTran);
    dom.kMau.style.setProperty('--so-khuc', t.mauToiDa);
    dom.kMauCon.style.width = Math.round(t.mau / t.mauToiDa * 1000) / 10 + '%';
    const so = [];
    so.push('Trúng ' + (t.soDon ? t.soDon + ' đòn' : '0 đòn'));
    if (t.soTuyetChieu) so.push(t.soTuyetChieu + ' tuyệt chiêu');
    dom.kSo.textContent = so.join(' · ');
    moThe(dom.ket, true);
    AT().doc(dom.kTieuDe.textContent + ' ' + dom.kLoi.textContent);
    setTimeout(function () { try { dom.tiep.focus(); } catch (e) { /* bỏ qua */ } }, 50);
  }

  /* ---------------- Kết thúc ---------------- */

  function ketThuc() {
    if (!s || s.daXong) return;
    const my = s;
    const o = s.o;
    const diem = K().diem();
    const t = s.tran;
    const tenBoss = s.boss.ten;
    xoaHen();
    my.daXong = true;
    K().dong();
    const them = ketQuaVan(t, diem);
    my.van.ketThuc(false, them).then(function (kq) {
      if (!kq) return;
      kq.diem = diem;
      kq.thang = them.thang;
      kq.mauConLai = t.mau;
      kq.dongPhu = dongPhu(t, tenBoss, diem);
      if (s === my) { s = null; moThe(dom.ket, false); }
      if (o.onXong) o.onXong(kq);
    });
  }

  function thoat() {
    if (!s || s.daXong) return;
    // Trận đã xong (đang ăn mừng hoặc xem kết quả) mà bé bấm Về đảo: vẫn tính trận như bình thường
    if (s.giaiDoan === 'ket') { ketThuc(); return; }
    const my = s;
    const o = s.o;
    const diem = K().diem();
    xoaHen();
    my.daXong = true;
    K().dong();
    my.van.ketThuc(true, Object.assign(ketQuaVan(my.tran, diem), { ly_do: 've_dao', thang: false })).then(function (kq) {
      if (s === my) { s = null; moThe(dom.moDau, false); moThe(dom.ket, false); }
      if (o.onThoat) o.onThoat(kq);
    });
  }

  window.DauTruong = { batDau: batDau, _trangThai: function () { return s; }, Tran: Tran, _veLuaChon: veMot };
  (window.DaoTroChoi = window.DaoTroChoi || {})['dau-truong'] = { ten: 'Đấu Trường', khung: true, san: 'dt-san', batDau: batDau, _trangThai: window.DauTruong._trangThai };
})();
