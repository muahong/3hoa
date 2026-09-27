/* ============================================================
   dao.js – Dữ liệu Đảo Khủng Long: 10 vùng đất, 2 đấu trường, các màn, loài khủng long,
   luật mở vùng theo lớp và bài đang học, lập 3 nhiệm vụ mỗi ngày từ hồ sơ học tập.
   API: window.Dao
   ============================================================ */
(function () {
  'use strict';

  /** Thể loại game đã chơi được trong đảo (các giai đoạn sau thêm dần). */
  const GAME_CO = { 'dua-xe': true };
  const TEN_GAME = {
    'dua-xe': 'Đua Xe', 'truyen-tranh': 'Truyện Tranh', 'lat-the': 'Lật Thẻ Anh Em', 'ban-thien-thach': 'Bắn Thiên Thạch',
    'xep-hinh-so': 'Xếp Hình Số', 'xuong-do-luong': 'Xưởng Đo Lường', 'cho-khung-long': 'Chợ Khủng Long', 'cau-ca': 'Câu Cá Thống Kê'
  };

  const MAN_V2 = [
    { id: 'v2-m1', so: 1, ten: 'Cộng qua 10', bai: 'Bài 7, 8', bai_dau: 7, game: 'dua-xe', ky_nang_chinh: 'cong-qua-10', cau: [{ ky_nang: 'cong-qua-10' }], so_cau: 12 },
    { id: 'v2-m2', so: 2, ten: 'Trừ qua 10', bai: 'Bài 11, 12', bai_dau: 11, game: 'dua-xe', ky_nang_chinh: 'tru-qua-10', cau: [{ ky_nang: 'tru-qua-10' }], so_cau: 12 },
    { id: 'v2-m3', so: 3, ten: 'Tìm số còn thiếu', bai: 'Bài 14', bai_dau: 14, game: 'dua-xe', ky_nang_chinh: 'tim-so-thieu-20', cau: [{ ky_nang: 'tim-so-thieu-20' }], so_cau: 12 },
    { id: 'v2-m4', so: 4, ten: 'Bài toán thêm, bớt, nhiều hơn, ít hơn', bai: 'Bài 9, 13', bai_dau: 9, game: 'truyen-tranh', ky_nang_chinh: null, cau: [] },
    { id: 'v2-cup', so: 5, ten: 'Cúp Núi Lửa · Luyện tập chung', bai: 'Bài 14', bai_dau: 14, game: 'dua-xe', cup: true, tram_dung: true, so_cau: 15,
      cau: [{ ky_nang: 'cong-qua-10', ty_le: 1 }, { ky_nang: 'tru-qua-10', ty_le: 1 }, { ky_nang: 'tim-so-thieu-20', ty_le: 0.6 }] }
  ];
  const MAN_V4 = [
    { id: 'v4-m1', so: 1, ten: 'Cộng có nhớ: 2 chữ số + 1 chữ số', bai: 'Bài 19', bai_dau: 19, game: 'dua-xe', ky_nang_chinh: 'cong-nho-2cs-1cs', cau: [{ ky_nang: 'cong-nho-2cs-1cs' }], so_cau: 12 },
    { id: 'v4-m2', so: 2, ten: 'Cộng có nhớ: 2 chữ số + 2 chữ số', bai: 'Bài 20', bai_dau: 20, game: 'dua-xe', ky_nang_chinh: 'cong-nho-2cs-2cs', cau: [{ ky_nang: 'cong-nho-2cs-2cs' }], so_cau: 12, tram_dung: true },
    { id: 'v4-m3', so: 3, ten: 'Nhẩm số tròn chục', bai: 'Bài 21', bai_dau: 21, game: 'dua-xe', ky_nang_chinh: 'nham-tron-chuc', cau: [{ ky_nang: 'nham-tron-chuc' }], so_cau: 12 },
    { id: 'v4-m4', so: 4, ten: 'Trừ có nhớ: 2 chữ số − 1 chữ số', bai: 'Bài 22', bai_dau: 22, game: 'dua-xe', ky_nang_chinh: 'tru-nho-2cs-1cs', cau: [{ ky_nang: 'tru-nho-2cs-1cs' }], so_cau: 12 },
    { id: 'v4-m5', so: 5, ten: 'Trừ có nhớ: 2 chữ số − 2 chữ số', bai: 'Bài 23', bai_dau: 23, game: 'dua-xe', ky_nang_chinh: 'tru-nho-2cs-2cs', cau: [{ ky_nang: 'tru-nho-2cs-2cs' }], so_cau: 12, tram_dung: true },
    { id: 'v4-cup', so: 6, ten: 'Cúp Đường Đua · Luyện tập chung', bai: 'Bài 24', bai_dau: 24, game: 'dua-xe', cup: true, tram_dung: true, so_cau: 15,
      cau: [{ ky_nang: 'cong-nho-2cs-2cs', ty_le: 1 }, { ky_nang: 'tru-nho-2cs-2cs', ty_le: 1 }, { ky_nang: 'cong-tru-khong-nho-100', ty_le: 0.6 }, { ky_nang: 'bieu-thuc-2-dau', ty_le: 0.8 }] }
  ];

  /** vi_tri: tọa độ trên ảnh bg-island-map (tỉ lệ 0..1). nen: ảnh nền trang vùng. */
  const VUNG = [
    { so: 1, ten: 'Bờ Biển Số 100', chu_de: 'Chủ đề 1', bai: [1, 6], hoc_ky: 1, loai: 'sp-rong-bien', ten_loai: 'Rồng Biển', phu_kien: 'Khăn Số 100', mau: '#0ea5c6', vi_tri: [0.168, 0.2], nen: 'bg-meadow', man: [] },
    { so: 2, ten: 'Núi Lửa Qua 10', chu_de: 'Chủ đề 2', bai: [7, 14], hoc_ky: 1, loai: 'sp-khung-long-lua', ten_loai: 'Khủng Long Lửa', phu_kien: 'Mào Lửa', mau: '#ef5a3c', vi_tri: [0.361, 0.148], nen: 'bg-dusk-sky', phu: 'rgba(214,64,36,.55)', man: MAN_V2 },
    { so: 3, ten: 'Xưởng Đo Lường', chu_de: 'Chủ đề 3', bai: [15, 18], hoc_ky: 1, loai: 'sp-giap-long', ten_loai: 'Giáp Long', phu_kien: null, mau: '#8b6fd6', vi_tri: [0.539, 0.212], nen: 'bg-workshop', man: [] },
    { so: 4, ten: 'Đường Đua Có Nhớ', chu_de: 'Chủ đề 4', bai: [19, 24], hoc_ky: 1, loai: 'sp-toc-long', ten_loai: 'Tốc Long', phu_kien: 'Giày Đua', mau: '#ff8a1f', vi_tri: [0.142, 0.372], nen: 'bg-race-track', phu: 'rgba(255,122,60,.72)', man: MAN_V4 },
    { so: 5, ten: 'Rừng Hình Khối', chu_de: 'Chủ đề 5 và 9', bai: [25, 28], hoc_ky: 1, loai: 'sp-kiem-long', ten_loai: 'Kiếm Long', phu_kien: null, mau: '#3aa65b', vi_tri: [0.361, 0.338], nen: 'bg-garden', man: [] },
    { so: 6, ten: 'Phố Đồng Hồ', chu_de: 'Chủ đề 6', bai: [29, 32], hoc_ky: 1, loai: 'sp-duc-long', ten_loai: 'Dực Long', phu_kien: 'Mũ Đồng Hồ', mau: '#3d7be0', vi_tri: [0.539, 0.418], nen: 'bg-dusk-sky', man: [] },
    { so: 11, ten: 'Đấu Trường Học Kì 1', chu_de: 'Chủ đề 7', bai: [33, 36], hoc_ky: 1, dau_truong: true, loai: null, mau: '#c7a24a', vi_tri: [0.16, 0.55], nen: 'bg-circus-night', man: [] },
    { so: 7, ten: 'Thung Lũng Nhân Chia', chu_de: 'Chủ đề 8', bai: [37, 45], hoc_ky: 2, loai: 'sp-tam-giac-long', ten_loai: 'Tam Giác Long', phu_kien: 'Giáp Nhân Chia', mau: '#d35a9c', vi_tri: [0.36, 0.555], nen: 'bg-garden', man: [] },
    { so: 8, ten: 'Kim Tự Tháp 1000', chu_de: 'Chủ đề 10 và 12', bai: [48, 63], hoc_ky: 2, loai: 'sp-long-co-dai', ten_loai: 'Long Cổ Dài', phu_kien: null, mau: '#c9a227', vi_tri: [0.548, 0.59], nen: 'bg-desert-pyramid', man: [] },
    { so: 9, ten: 'Chợ Khủng Long', chu_de: 'Chủ đề 11', bai: [56, 56], hoc_ky: 2, loai: 'sp-mo-vit-long', ten_loai: 'Mỏ Vịt Long', phu_kien: null, mau: '#e0703a', vi_tri: [0.178, 0.733], nen: 'bg-market', man: [] },
    { so: 10, ten: 'Hồ Thống Kê', chu_de: 'Chủ đề 13', bai: [64, 67], hoc_ky: 2, loai: 'sp-gai-long', ten_loai: 'Gai Long', phu_kien: null, mau: '#1d9bd1', vi_tri: [0.41, 0.808], nen: 'bg-meadow', man: [] },
    { so: 12, ten: 'Đấu Trường Cuối Năm', chu_de: 'Chủ đề 14', bai: [68, 75], hoc_ky: 2, dau_truong: true, loai: null, mau: '#c7a24a', vi_tri: [0.598, 0.69], nen: 'bg-circus-night', man: [] }
  ];

  /** Hình khủng long theo phong cách và mức lớn. */
  const HINH = {
    dung_manh: { ten: 'Rex', trung: 'rex-egg', lay_dong: 'rex-egg', so_sinh: 'rex-hatchling', nhi: 'rex-kid', thieu_nien: 'rex-teen', truong_thanh: 'rex-adult', huyen_thoai: 'rex-legend', an: 'rex-eating', co_vu: 'rex-cheer', goi_y: 'rex-think', xe: 'car-rex' },
    de_thuong: { ten: 'Mây', trung: 'may-egg', lay_dong: 'may-egg', so_sinh: 'may-hatchling', nhi: 'may-kid', thieu_nien: 'may-teen', truong_thanh: 'may-adult', huyen_thoai: 'may-legend', an: 'may-eating', co_vu: 'may-cheer', goi_y: 'may-think', xe: 'car-may' }
  };

  const NHIEM_VU_TEN = { on_cach_quang: 'Ôn nhanh', luyen_lai: 'Luyện lại chỗ yếu', hoc_moi: 'Học mới' };

  /* ---------------- Tra cứu ---------------- */

  const theoMan = {};
  VUNG.forEach(function (v) { v.man.forEach(function (m) { m.vung = v.so; theoMan[m.id] = m; }); });

  function vung(so) { return VUNG.find(function (v) { return v.so === so; }) || null; }
  function man(id) { return theoMan[id] || null; }
  function choiDuoc(m) { return !!(m && GAME_CO[m.game] && m.cau && m.cau.length); }
  function manTheoKyNang(kn) {
    for (let i = 0; i < VUNG.length; i++) for (let j = 0; j < VUNG[i].man.length; j++) {
      const m = VUNG[i].man[j];
      if (m.ky_nang_chinh === kn && choiDuoc(m)) return m;
    }
    return null;
  }
  /** Kỹ năng cần "Đã thuộc" để trứng của vùng nở (chỉ tính các màn đã chơi được ở giai đoạn này). */
  function kyNangCuaVung(v) {
    const ds = [];
    v.man.forEach(function (m) { if (choiDuoc(m) && m.ky_nang_chinh && ds.indexOf(m.ky_nang_chinh) < 0) ds.push(m.ky_nang_chinh); });
    return ds;
  }
  function tenManDayDu(m) {
    const v = vung(m.vung);
    return (v ? v.ten + ' · ' : '') + (m.cup ? m.ten : 'Màn ' + m.so + ' · ' + m.ten);
  }

  /* ---------------- Năm học, bài đang học ---------------- */

  /** Ước lượng bài SGK Toán 2 đang học theo ngày: năm học từ 5/9, 75 bài trong 35 tuần. */
  function uocLuongBai(ngay) {
    const d = ngay instanceof Date ? ngay : new Date(ngay);
    const y = d.getMonth() + 1 >= 9 ? d.getFullYear() : d.getFullYear() - 1;
    const batDau = new Date(y, 8, 5);
    const tuan = Math.floor((d - batDau) / (7 * 86400000));
    if (d.getMonth() + 1 >= 6 && d.getMonth() + 1 <= 8) return 75;
    return Math.max(1, Math.min(75, 1 + Math.round(Math.max(0, tuan) * 75 / 35)));
  }

  /** Vùng có mở cho bé không. Trả về { mo, sap_co, ly_do } */
  function trangThaiVung(v, hoSo) {
    const lop = (hoSo && hoSo.lop) || 2;
    const bai = (hoSo && hoSo.bai_dang_hoc) || 1;
    let mo;
    let lyDo = null;
    if (lop >= 3) mo = true;
    else if (lop <= 1) { mo = v.so === 1 || v.so === 2; if (!mo) lyDo = 'lop_2'; }
    else if (v.hoc_ky === 2) { mo = bai >= 37; if (!mo) lyDo = 'hoc_ky_2'; }
    else mo = true;
    const coMan = v.man.some(choiDuoc);
    return { mo: mo, sap_co: !coMan, ly_do: lyDo };
  }

  /** Cúp của vùng mở khi đã xong mọi màn chơi được khác ít nhất một lần. */
  function cupMo(v, hoSo) {
    const kl = (hoSo && hoSo.ky_luc) || {};
    return v.man.filter(function (m) { return !m.cup && choiDuoc(m); }).every(function (m) { return kl[m.id] && kl[m.id].sao > 0; });
  }

  /* ---------------- Nhiệm vụ hôm nay ---------------- */

  /**
   * Lập 3 nhiệm vụ: ôn nhanh cách quãng, luyện lại chỗ yếu, học mới.
   * hoSo: hồ sơ bé; hocTap: hồ sơ học tập (có thể null); homNay: 'YYYY-MM-DD'
   */
  function lapNhiemVu(hoSo, hocTap, homNay) {
    const LOI = window.NganHang.LOI;
    const muc = {};
    ((hocTap && hocTap.ky_nang) || []).forEach(function (k) { muc[k.ky_nang] = k; });
    const manMo = [];
    VUNG.forEach(function (v) {
      if (!trangThaiVung(v, hoSo).mo) return;
      v.man.forEach(function (m) { if (!m.cup && choiDuoc(m)) manMo.push(m); });
    });
    const ra = [];
    const daChon = {};
    const them = function (loai, m, lyDo, soCau) {
      if (!m || daChon[m.id]) return false;
      daChon[m.id] = true;
      ra.push({ loai: loai, man: m.id, ky_nang: m.ky_nang_chinh, ly_do: lyDo || null, so_cau: soCau, xong: false });
      return true;
    };
    const mucCua = function (m) { return muc[m.ky_nang_chinh] || { muc: 'chua_hoc', so_cau: 0 }; };

    // 1. Ôn nhanh: kỹ năng đã thuộc tới hạn ôn, nếu không có thì kỹ năng đã luyện lâu chưa chơi lại
    const on = manMo.filter(function (m) {
      const k = mucCua(m);
      return (k.muc === 'da_thuoc' || k.muc === 'vung_chac') && k.on_lai_ke_tiep && k.on_lai_ke_tiep <= homNay;
    }).sort(function (a, b) { return mucCua(a).on_lai_ke_tiep < mucCua(b).on_lai_ke_tiep ? -1 : 1; });
    const lau = manMo.filter(function (m) {
      const k = mucCua(m);
      return (k.muc === 'dang_luyen' || k.muc === 'da_thuoc' || k.muc === 'vung_chac') && k.lan_cuoi && k.lan_cuoi < homNay && !k.can_giup;
    }).sort(function (a, b) { return mucCua(a).lan_cuoi < mucCua(b).lan_cuoi ? -1 : 1; });
    them('on_cach_quang', on[0] || lau[0], null, 8);

    // 2. Luyện lại chỗ yếu: cờ Cần giúp, câu còn nợ, tỉ lệ tự làm đúng thấp
    const yeu = manMo.filter(function (m) {
      const k = mucCua(m);
      return k.so_cau > 0 && (k.can_giup || k.cau_no > 0 || (k.muc === 'dang_luyen' && k.tu_lam_dung_14_ngay != null && k.tu_lam_dung_14_ngay < 0.8));
    }).sort(function (a, b) {
      const ka = mucCua(a), kb = mucCua(b);
      return (kb.can_giup ? 1 : 0) - (ka.can_giup ? 1 : 0) || (kb.cau_no || 0) - (ka.cau_no || 0) || (ka.tu_lam_dung_14_ngay || 0) - (kb.tu_lam_dung_14_ngay || 0);
    });
    if (yeu[0]) {
      const k = mucCua(yeu[0]);
      const loi = k.loi_hay_gap && k.loi_hay_gap[0] ? k.loi_hay_gap[0].ma : null;
      them('luyen_lai', yeu[0], loi && LOI[loi] ? LOI[loi].ngan : 'Luyện thêm cho chắc', 12);
    }

    // 3. Học mới: màn chưa học hoặc mới làm quen, ưu tiên bài đang học ở lớp
    const bai = (hoSo && hoSo.bai_dang_hoc) || 1;
    const moi = manMo.filter(function (m) { const k = mucCua(m); return (k.muc === 'chua_hoc' || k.muc === 'lam_quen') && !daChon[m.id]; });
    const hopBai = moi.filter(function (m) { return m.bai_dau <= bai + 3; });
    const thuTuMoi = hopBai.concat(moi.filter(function (m) { return hopBai.indexOf(m) < 0; }));
    let i = 0;
    while (ra.length < 3 && i < thuTuMoi.length) { them('hoc_moi', thuTuMoi[i], null, 12); i++; }

    // Chưa đủ 3: thêm màn đang luyện có tỉ lệ thấp nhất
    const conLai = manMo.filter(function (m) { return !daChon[m.id]; }).sort(function (a, b) {
      return (mucCua(a).tu_lam_dung_14_ngay || 0) - (mucCua(b).tu_lam_dung_14_ngay || 0);
    });
    i = 0;
    while (ra.length < 3 && i < conLai.length) { them(mucCua(conLai[i]).so_cau ? 'luyen_lai' : 'hoc_moi', conLai[i], null, 12); i++; }

    const thuTu = { on_cach_quang: 0, luyen_lai: 1, hoc_moi: 2 };
    ra.sort(function (a, b) { return thuTu[a.loai] - thuTu[b.loai]; });
    return ra;
  }

  window.Dao = {
    VUNG: VUNG,
    HINH: HINH,
    GAME_CO: GAME_CO,
    TEN_GAME: TEN_GAME,
    NHIEM_VU_TEN: NHIEM_VU_TEN,
    vung: vung,
    man: man,
    choiDuoc: choiDuoc,
    manTheoKyNang: manTheoKyNang,
    kyNangCuaVung: kyNangCuaVung,
    tenManDayDu: tenManDayDu,
    uocLuongBai: uocLuongBai,
    trangThaiVung: trangThaiVung,
    cupMo: cupMo,
    lapNhiemVu: lapNhiemVu
  };
})();
