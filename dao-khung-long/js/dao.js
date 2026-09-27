/* ============================================================
   dao.js – Dữ liệu Đảo Khủng Long: 10 vùng đất, 2 đấu trường, các màn, loài khủng long,
   luật mở vùng theo lớp và bài đang học, lập 3 nhiệm vụ mỗi ngày từ hồ sơ học tập.
   API: window.Dao
   ============================================================ */
(function () {
  'use strict';

  /** Thể loại game đã chơi được trong đảo (các giai đoạn sau thêm dần). */
  const GAME_CO = { 'dua-xe': true, 'truyen-tranh': true, 'lat-the': true, 'xep-hinh-so': true };
  const TEN_GAME = {
    'dua-xe': 'Đua Xe', 'truyen-tranh': 'Truyện Tranh', 'lat-the': 'Lật Thẻ Anh Em', 'ban-thien-thach': 'Bắn Thiên Thạch',
    'xep-hinh-so': 'Xếp Hình Số', 'xuong-do-luong': 'Xưởng Đo Lường', 'cho-khung-long': 'Chợ Khủng Long', 'cau-ca': 'Câu Cá Thống Kê'
  };
  /** Dạng câu của từng thể loại (Truyện Tranh là bài hai bước, tự nhận từ loại kỹ năng). */
  const DANG_GAME = { 'lat-the': 'ghep_doi', 'xep-hinh-so': 'keo_tha' };
  /** Biểu tượng của từng thể loại trong danh sách màn và thẻ nhiệm vụ (Đua Xe dùng xe của bé). */
  const HINH_GAME = { 'truyen-tranh': 'ic-truyen-tranh', 'lat-the': 'ic-lat-the', 'xep-hinh-so': 'ic-xep-hinh' };

  /*
   * Mỗi màn: một bài SGK, một thể loại game, một kỹ năng chính (ky_nang_chinh) quyết định mức thành thạo và trứng vùng.
   * luyen_tap: màn luyện lại kỹ năng của các màn khác bằng thể loại khác (không có kỹ năng riêng, không tính vào trứng vùng).
   * cup_can: các màn phải xong ít nhất một lần thì cúp mới mở (mặc định: mọi màn có kỹ năng chính).
   */
  const MAN_V1 = [
    { id: 'v1-m1', so: 1, ten: 'Chục và đơn vị', bai: 'Bài 1', bai_dau: 1, game: 'xep-hinh-so', ky_nang_chinh: 'cau-tao-so-100', cau: [{ ky_nang: 'cau-tao-so-100' }], so_cau: 10 },
    { id: 'v1-m2', so: 2, ten: 'Số liền trước, số liền sau', bai: 'Bài 2', bai_dau: 2, game: 'lat-the', ky_nang_chinh: 'lien-truoc-sau-100', cau: [{ ky_nang: 'lien-truoc-sau-100' }], so_cau: 12 },
    { id: 'v1-m3', so: 3, ten: 'Hơn, kém nhau bao nhiêu', bai: 'Bài 4, 5', bai_dau: 4, game: 'truyen-tranh', ky_nang_chinh: 'toan-hon-kem', cau: [{ ky_nang: 'toan-hon-kem' }], so_cau: 8 },
    { id: 'v1-cup', so: 4, ten: 'Cúp Bờ Biển · Luyện tập chung', bai: 'Bài 6', bai_dau: 6, game: 'lat-the', cup: true, so_cau: 12,
      cau: [{ ky_nang: 'lien-truoc-sau-100', ty_le: 1 }, { ky_nang: 'cau-tao-so-100', ty_le: 1, cach: ['chu', 'hang', 'tong'] }] }
  ];
  const MAN_V2 = [
    { id: 'v2-m1', so: 1, ten: 'Cộng qua 10', bai: 'Bài 7, 8', bai_dau: 7, game: 'dua-xe', ky_nang_chinh: 'cong-qua-10', cau: [{ ky_nang: 'cong-qua-10' }], so_cau: 12 },
    { id: 'v2-m2', so: 2, ten: 'Trừ qua 10', bai: 'Bài 11, 12', bai_dau: 11, game: 'dua-xe', ky_nang_chinh: 'tru-qua-10', cau: [{ ky_nang: 'tru-qua-10' }], so_cau: 12 },
    { id: 'v2-m3', so: 3, ten: 'Tìm số còn thiếu', bai: 'Bài 14', bai_dau: 14, game: 'dua-xe', ky_nang_chinh: 'tim-so-thieu-20', cau: [{ ky_nang: 'tim-so-thieu-20' }], so_cau: 12 },
    { id: 'v2-m4', so: 4, ten: 'Bài toán thêm, bớt', bai: 'Bài 9', bai_dau: 9, game: 'truyen-tranh', ky_nang_chinh: 'toan-them-bot', cau: [{ ky_nang: 'toan-them-bot' }], so_cau: 8 },
    { id: 'v2-m5', so: 5, ten: 'Bài toán nhiều hơn, ít hơn', bai: 'Bài 13', bai_dau: 13, game: 'truyen-tranh', ky_nang_chinh: 'toan-nhieu-it', cau: [{ ky_nang: 'toan-nhieu-it' }], so_cau: 8 },
    { id: 'v2-m6', so: 6, ten: 'Lật thẻ: bảng cộng, bảng trừ', bai: 'Bài 8, 12', bai_dau: 12, game: 'lat-the', luyen_tap: true, cau: [{ ky_nang: 'cong-qua-10' }, { ky_nang: 'tru-qua-10' }], so_cau: 12 },
    { id: 'v2-cup', so: 7, ten: 'Cúp Núi Lửa · Luyện tập chung', bai: 'Bài 14', bai_dau: 14, game: 'dua-xe', cup: true, tram_dung: true, so_cau: 15, cup_can: ['v2-m1', 'v2-m2', 'v2-m3'],
      cau: [{ ky_nang: 'cong-qua-10', ty_le: 1 }, { ky_nang: 'tru-qua-10', ty_le: 1 }, { ky_nang: 'tim-so-thieu-20', ty_le: 0.6 }] }
  ];
  const MAN_V4 = [
    { id: 'v4-m1', so: 1, ten: 'Cộng có nhớ: 2 chữ số + 1 chữ số', bai: 'Bài 19', bai_dau: 19, game: 'dua-xe', ky_nang_chinh: 'cong-nho-2cs-1cs', cau: [{ ky_nang: 'cong-nho-2cs-1cs' }], so_cau: 12 },
    { id: 'v4-m2', so: 2, ten: 'Cộng có nhớ: 2 chữ số + 2 chữ số', bai: 'Bài 20', bai_dau: 20, game: 'dua-xe', ky_nang_chinh: 'cong-nho-2cs-2cs', cau: [{ ky_nang: 'cong-nho-2cs-2cs' }], so_cau: 12, tram_dung: true },
    { id: 'v4-m3', so: 3, ten: 'Nhẩm số tròn chục', bai: 'Bài 21', bai_dau: 21, game: 'dua-xe', ky_nang_chinh: 'nham-tron-chuc', cau: [{ ky_nang: 'nham-tron-chuc' }], so_cau: 12 },
    { id: 'v4-m4', so: 4, ten: 'Trừ có nhớ: 2 chữ số − 1 chữ số', bai: 'Bài 22', bai_dau: 22, game: 'dua-xe', ky_nang_chinh: 'tru-nho-2cs-1cs', cau: [{ ky_nang: 'tru-nho-2cs-1cs' }], so_cau: 12 },
    { id: 'v4-m5', so: 5, ten: 'Trừ có nhớ: 2 chữ số − 2 chữ số', bai: 'Bài 23', bai_dau: 23, game: 'dua-xe', ky_nang_chinh: 'tru-nho-2cs-2cs', cau: [{ ky_nang: 'tru-nho-2cs-2cs' }], so_cau: 12, tram_dung: true },
    { id: 'v4-m6', so: 6, ten: 'Bài toán có lời văn', bai: 'Bài 19 đến 23', bai_dau: 20, game: 'truyen-tranh', ky_nang_chinh: 'toan-loi-van-100', cau: [{ ky_nang: 'toan-loi-van-100' }], so_cau: 8 },
    { id: 'v4-m7', so: 7, ten: 'Cặp tấm thẻ anh em', bai: 'Bài 24', bai_dau: 24, game: 'lat-the', luyen_tap: true, so_cau: 12,
      cau: [{ ky_nang: 'tru-nho-2cs-1cs', ty_le: 1 }, { ky_nang: 'tru-nho-2cs-2cs', ty_le: 1 }, { ky_nang: 'nham-tron-chuc', ty_le: 0.5 }] },
    { id: 'v4-cup', so: 8, ten: 'Cúp Đường Đua · Luyện tập chung', bai: 'Bài 24', bai_dau: 24, game: 'dua-xe', cup: true, tram_dung: true, so_cau: 15, cup_can: ['v4-m1', 'v4-m2', 'v4-m3', 'v4-m4', 'v4-m5'],
      cau: [{ ky_nang: 'cong-nho-2cs-2cs', ty_le: 1 }, { ky_nang: 'tru-nho-2cs-2cs', ty_le: 1 }, { ky_nang: 'cong-tru-khong-nho-100', ty_le: 0.6 }, { ky_nang: 'bieu-thuc-2-dau', ty_le: 0.8 }] }
  ];
  const MAN_V7 = [
    { id: 'v7-m1', so: 1, ten: 'Phép nhân', bai: 'Bài 37, 38', bai_dau: 37, game: 'lat-the', ky_nang_chinh: 'nhan-y-nghia', cau: [{ ky_nang: 'nhan-y-nghia' }], so_cau: 12 },
    { id: 'v7-m2', so: 2, ten: 'Bảng nhân 2, bảng nhân 5', bai: 'Bài 39, 40', bai_dau: 39, game: 'lat-the', ky_nang_chinh: 'bang-nhan-2-5', cau: [{ ky_nang: 'bang-nhan-2-5' }], so_cau: 12 },
    { id: 'v7-m3', so: 3, ten: 'Phép chia: chia đều, chia theo nhóm', bai: 'Bài 41, 42', bai_dau: 41, game: 'truyen-tranh', ky_nang_chinh: 'chia-y-nghia', cau: [{ ky_nang: 'chia-y-nghia' }], so_cau: 8 },
    { id: 'v7-m4', so: 4, ten: 'Bảng chia 2, bảng chia 5', bai: 'Bài 43, 44', bai_dau: 43, game: 'lat-the', ky_nang_chinh: 'bang-chia-2-5', cau: [{ ky_nang: 'bang-chia-2-5' }], so_cau: 12 },
    { id: 'v7-m5', so: 5, ten: 'Bài toán nhân, chia', bai: 'Bài 45', bai_dau: 45, game: 'truyen-tranh', ky_nang_chinh: 'toan-nhan-chia', cau: [{ ky_nang: 'toan-nhan-chia' }], so_cau: 9 },
    { id: 'v7-cup', so: 6, ten: 'Cúp Thung Lũng · Luyện tập chung', bai: 'Bài 45', bai_dau: 45, game: 'lat-the', cup: true, so_cau: 12,
      cau: [{ ky_nang: 'bang-nhan-2-5', ty_le: 1 }, { ky_nang: 'bang-chia-2-5', ty_le: 1 }, { ky_nang: 'nhan-y-nghia', ty_le: 0.6 }] }
  ];
  const MAN_V8 = [
    { id: 'v8-m1', so: 1, ten: 'Trăm, chục, đơn vị', bai: 'Bài 48 đến 52', bai_dau: 48, game: 'xep-hinh-so', ky_nang_chinh: 'cau-tao-so-1000', cau: [{ ky_nang: 'cau-tao-so-1000' }], so_cau: 10 },
    { id: 'v8-m2', so: 2, ten: 'Đọc, viết số có ba chữ số', bai: 'Bài 51', bai_dau: 51, game: 'xep-hinh-so', ky_nang_chinh: 'doc-so-1000', cau: [{ ky_nang: 'doc-so-1000' }], so_cau: 10 },
    { id: 'v8-m3', so: 3, ten: 'Lật thẻ: số và tổng trăm, chục, đơn vị', bai: 'Bài 52', bai_dau: 52, game: 'lat-the', luyen_tap: true, so_cau: 12,
      cau: [{ ky_nang: 'cau-tao-so-1000', ty_le: 1, cach: ['tong', 'hang'] }, { ky_nang: 'doc-so-1000', ty_le: 0.8 }] },
    { id: 'v8-m4', so: 4, ten: 'Cộng, trừ trong phạm vi 1000', bai: 'Bài 59 đến 62', bai_dau: 59, game: 'dua-xe', ky_nang_chinh: 'cong-tru-1000', cau: [{ ky_nang: 'cong-tru-1000' }], so_cau: 12, tram_dung: true }
  ];

  /** vi_tri: tọa độ trên ảnh bg-island-map (tỉ lệ 0..1). nen: ảnh nền trang vùng. */
  const VUNG = [
    { so: 1, ten: 'Bờ Biển Số 100', chu_de: 'Chủ đề 1', bai: [1, 6], hoc_ky: 1, loai: 'sp-rong-bien', ten_loai: 'Rồng Biển', phu_kien: 'Khăn Số 100', mau: '#0ea5c6', vi_tri: [0.168, 0.2], nen: 'bg-meadow', phu: 'rgba(14,140,190,.62)', man: MAN_V1 },
    { so: 2, ten: 'Núi Lửa Qua 10', chu_de: 'Chủ đề 2', bai: [7, 14], hoc_ky: 1, loai: 'sp-khung-long-lua', ten_loai: 'Khủng Long Lửa', phu_kien: 'Mào Lửa', mau: '#ef5a3c', vi_tri: [0.361, 0.148], nen: 'bg-dusk-sky', phu: 'rgba(214,64,36,.55)', man: MAN_V2 },
    { so: 3, ten: 'Xưởng Đo Lường', chu_de: 'Chủ đề 3', bai: [15, 18], hoc_ky: 1, loai: 'sp-giap-long', ten_loai: 'Giáp Long', phu_kien: null, mau: '#8b6fd6', vi_tri: [0.539, 0.212], nen: 'bg-workshop', man: [] },
    { so: 4, ten: 'Đường Đua Có Nhớ', chu_de: 'Chủ đề 4', bai: [19, 24], hoc_ky: 1, loai: 'sp-toc-long', ten_loai: 'Tốc Long', phu_kien: 'Giày Đua', mau: '#ff8a1f', vi_tri: [0.142, 0.372], nen: 'bg-race-track', phu: 'rgba(255,122,60,.72)', man: MAN_V4 },
    { so: 5, ten: 'Rừng Hình Khối', chu_de: 'Chủ đề 5 và 9', bai: [25, 28], hoc_ky: 1, loai: 'sp-kiem-long', ten_loai: 'Kiếm Long', phu_kien: null, mau: '#3aa65b', vi_tri: [0.361, 0.338], nen: 'bg-garden', man: [] },
    { so: 6, ten: 'Phố Đồng Hồ', chu_de: 'Chủ đề 6', bai: [29, 32], hoc_ky: 1, loai: 'sp-duc-long', ten_loai: 'Dực Long', phu_kien: 'Mũ Đồng Hồ', mau: '#3d7be0', vi_tri: [0.539, 0.418], nen: 'bg-dusk-sky', man: [] },
    { so: 11, ten: 'Đấu Trường Học Kì 1', chu_de: 'Chủ đề 7', bai: [33, 36], hoc_ky: 1, dau_truong: true, loai: null, mau: '#c7a24a', vi_tri: [0.16, 0.55], nen: 'bg-circus-night', man: [] },
    { so: 7, ten: 'Thung Lũng Nhân Chia', chu_de: 'Chủ đề 8', bai: [37, 45], hoc_ky: 2, loai: 'sp-tam-giac-long', ten_loai: 'Tam Giác Long', phu_kien: 'Giáp Nhân Chia', mau: '#d35a9c', vi_tri: [0.36, 0.555], nen: 'bg-garden', phu: 'rgba(170,60,130,.6)', man: MAN_V7 },
    { so: 8, ten: 'Kim Tự Tháp 1000', chu_de: 'Chủ đề 10 và 12', bai: [48, 63], hoc_ky: 2, loai: 'sp-long-co-dai', ten_loai: 'Long Cổ Dài', phu_kien: null, mau: '#c9a227', vi_tri: [0.548, 0.59], nen: 'bg-desert-pyramid', phu: 'rgba(150,100,20,.55)', man: MAN_V8 },
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
  VUNG.forEach(function (v) {
    v.man.forEach(function (m) {
      m.vung = v.so;
      if (!m.dang && DANG_GAME[m.game]) m.dang = DANG_GAME[m.game];
      theoMan[m.id] = m;
    });
  });

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

  /** Cúp của vùng mở khi đã xong ít nhất một lần các màn trong cup_can (mặc định: mọi màn có kỹ năng chính). */
  function cupMo(v, hoSo) {
    const kl = (hoSo && hoSo.ky_luc) || {};
    const cup = v.man.find(function (m) { return m.cup; });
    const can = cup && cup.cup_can
      ? cup.cup_can.map(man).filter(Boolean)
      : v.man.filter(function (m) { return !m.cup && !m.luyen_tap && choiDuoc(m); });
    return can.every(function (m) { return kl[m.id] && kl[m.id].sao > 0; });
  }

  /** Các kỹ năng một màn luyện (mọi kỹ năng trong danh sách câu). */
  function kyNangCuaMan(m) {
    const ds = [];
    (m.cau || []).forEach(function (x) { if (ds.indexOf(x.ky_nang) < 0) ds.push(x.ky_nang); });
    return ds;
  }

  /* ---------------- Nhiệm vụ hôm nay ---------------- */

  /**
   * Lập 3 nhiệm vụ: ôn nhanh cách quãng, luyện lại chỗ yếu, học mới.
   * hoSo: hồ sơ bé; hocTap: hồ sơ học tập (có thể null); homNay: 'YYYY-MM-DD'
   * lichSu (tùy chọn): { ky_nang: { game: 'YYYY-MM-DD' lần cuối luyện kỹ năng đó bằng thể loại đó } }.
   * Ôn nhanh và luyện lại đổi sang thể loại lâu chưa dùng cho kỹ năng đó (một kiến thức, nhiều trò chơi).
   */
  function lapNhiemVu(hoSo, hocTap, homNay, lichSu) {
    const LOI = window.NganHang.LOI;
    const muc = {};
    ((hocTap && hocTap.ky_nang) || []).forEach(function (k) { muc[k.ky_nang] = k; });
    const manMo = [];
    const manLuyen = [];
    VUNG.forEach(function (v) {
      if (!trangThaiVung(v, hoSo).mo) return;
      v.man.forEach(function (m) {
        if (m.cup || !choiDuoc(m)) return;
        manLuyen.push(m);
        if (m.ky_nang_chinh && !m.luyen_tap) manMo.push(m);
      });
    });
    const ra = [];
    const daChon = {};
    /** Màn cùng kỹ năng ở thể loại lâu chưa dùng nhất (giữ màn chính nếu chưa có lịch sử). */
    const doiTheLoai = function (m) {
      const kn = m.ky_nang_chinh;
      const ls = (lichSu && lichSu[kn]) || {};
      const khac = manLuyen.filter(function (x) { return x.id !== m.id && x.game !== m.game && !daChon[x.id] && kyNangCuaMan(x).indexOf(kn) >= 0; });
      if (!khac.length) return m;
      const lanCuoi = function (x) { return ls[x.game] || ''; };
      return [m].concat(khac).sort(function (x, y) { return lanCuoi(x) < lanCuoi(y) ? -1 : lanCuoi(x) > lanCuoi(y) ? 1 : 0; })[0];
    };
    const them = function (loai, m, lyDo, soCau, doi) {
      if (!m || daChon[m.id]) return false;
      const kn = m.ky_nang_chinh;
      const choi = doi ? doiTheLoai(m) : m;
      daChon[m.id] = true;
      daChon[choi.id] = true;
      ra.push({ loai: loai, man: choi.id, ky_nang: kn, ly_do: lyDo || null, so_cau: choi.game === 'truyen-tranh' ? Math.min(soCau, 8) : soCau, xong: false });
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
    them('on_cach_quang', on[0] || lau[0], null, 8, true);

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
      them('luyen_lai', yeu[0], loi && LOI[loi] ? LOI[loi].ngan : 'Luyện thêm cho chắc', 12, true);
    }

    // 3. Học mới: màn chưa học hoặc mới làm quen. Trước hết là màn của bài đang học ở lớp,
    // rồi các màn chưa học của khoảng 15 bài gần đây theo đúng thứ tự SGK, rồi các màn còn lại
    const bai = (hoSo && hoSo.bai_dang_hoc) || 1;
    const moi = manMo.filter(function (m) { const k = mucCua(m); return (k.muc === 'chua_hoc' || k.muc === 'lam_quen') && !daChon[m.id]; });
    const theoBai = function (a, b) { return a.bai_dau - b.bai_dau; };
    const daHoc = moi.filter(function (m) { return m.bai_dau <= bai; }).sort(theoBai);
    const baiNay = daHoc.length ? [daHoc[daHoc.length - 1]] : [];
    const ganDay = moi.filter(function (m) { return baiNay.indexOf(m) < 0 && m.bai_dau <= bai + 3 && m.bai_dau >= bai - 15; }).sort(theoBai);
    const thuTuMoi = baiNay.concat(ganDay, moi.filter(function (m) { return baiNay.indexOf(m) < 0 && ganDay.indexOf(m) < 0; }).sort(theoBai));
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

  /** Lịch sử thể loại theo kỹ năng, tính từ tóm tắt câu: { ky_nang: { game: ngày gần nhất } }. */
  function lichSuTheLoai(cauDs) {
    const ls = {};
    (cauDs || []).forEach(function (c) {
      if (!c.ky_nang || !c.game) return;
      const k = ls[c.ky_nang] = ls[c.ky_nang] || {};
      if (!k[c.game] || c.ngay > k[c.game]) k[c.game] = c.ngay;
    });
    return ls;
  }

  window.Dao = {
    VUNG: VUNG,
    HINH: HINH,
    GAME_CO: GAME_CO,
    TEN_GAME: TEN_GAME,
    HINH_GAME: HINH_GAME,
    DANG_GAME: DANG_GAME,
    NHIEM_VU_TEN: NHIEM_VU_TEN,
    vung: vung,
    man: man,
    choiDuoc: choiDuoc,
    manTheoKyNang: manTheoKyNang,
    kyNangCuaVung: kyNangCuaVung,
    kyNangCuaMan: kyNangCuaMan,
    lichSuTheLoai: lichSuTheLoai,
    tenManDayDu: tenManDayDu,
    uocLuongBai: uocLuongBai,
    trangThaiVung: trangThaiVung,
    cupMo: cupMo,
    lapNhiemVu: lapNhiemVu
  };
})();
