/* ============================================================
   dao.js – Dữ liệu Đảo Khủng Long: 10 vùng đất, 2 đấu trường, các màn, loài khủng long,
   luật mở vùng theo lớp và bài đang học, lập 3 nhiệm vụ mỗi ngày từ hồ sơ học tập.
   API: window.Dao
   ============================================================ */
(function () {
  'use strict';

  /**
   * Mười hai thể loại của đảo và Đấu Trường. Trong trình duyệt, một màn chỉ chơi được khi mô-đun của thể loại đã đăng ký
   * vào window.DaoTroChoi (xem app.js); GAME_CO dùng khi chạy kiểm thử không có trình duyệt.
   * Sáu game cũ (giai đoạn 5) chạy trong khung iframe qua cầu nối js/cau-noi.js, thư mục ghi ở THU_MUC_GAME_CU.
   */
  const GAME_CO = {
    'dua-xe': true, 'truyen-tranh': true, 'lat-the': true, 'xep-hinh-so': true,
    'xuong-do-luong': true, 'cho-khung-long': true, 'cau-ca': true, 'rung-hinh-khoi': true, 'lat-lich': true, 'dau-truong': true,
    'chem-trai-cay': true, 'ban-thien-thach': true, 'me-cung': true, 'thap-xep-hinh': true, 'xe-tang': true, 'cuoi-ho': true
  };
  const TEN_GAME = {
    'dua-xe': 'Đua Xe', 'truyen-tranh': 'Truyện Tranh', 'lat-the': 'Lật Thẻ Anh Em', 'xep-hinh-so': 'Xếp Hình Số',
    'xuong-do-luong': 'Xưởng Đo Lường', 'cho-khung-long': 'Chợ Khủng Long', 'cau-ca': 'Câu Cá Thống Kê', 'rung-hinh-khoi': 'Rừng Hình Khối',
    'lat-lich': 'Lật Lịch', 'dau-truong': 'Đấu Trường',
    'chem-trai-cay': 'Chém Trái Cây', 'ban-thien-thach': 'Bắn Thiên Thạch', 'me-cung': 'Mê Cung', 'thap-xep-hinh': 'Tháp Xếp Hình',
    'xe-tang': 'Xe Tăng', 'cuoi-ho': 'Cưỡi Hổ Vượt Lửa'
  };
  /** Thư mục của sáu game cũ trên 3hoa.com (chạy trong iframe với ?dao=1). */
  const THU_MUC_GAME_CU = {
    'chem-trai-cay': 'math-ninja', 'ban-thien-thach': 'cuu-chuong', 'me-cung': 'me-cung-dong-ho',
    'thap-xep-hinh': 'thap-dong-ho', 'xe-tang': 'xe-tang-thoi-gian', 'cuoi-ho': 'cuoi-ho'
  };
  /** Dạng câu của từng thể loại (Truyện Tranh là bài hai bước, tự nhận từ loại kỹ năng). */
  const DANG_GAME = { 'lat-the': 'ghep_doi', 'xep-hinh-so': 'keo_tha' };
  /** Biểu tượng của từng thể loại: tên hình trong assets/img, hoặc đường dẫn (game cũ dùng biểu tượng của chính nó). Đua Xe dùng xe của bé. */
  const HINH_GAME = {
    'truyen-tranh': 'ic-truyen-tranh', 'lat-the': 'ic-lat-the', 'xep-hinh-so': 'ic-xep-hinh',
    'xuong-do-luong': 'ic-xuong-do-luong', 'cho-khung-long': 'ic-cho', 'cau-ca': 'ic-cau-ca', 'rung-hinh-khoi': 'ic-rung-hinh',
    'lat-lich': 'ic-lat-lich', 'dau-truong': 'ic-dau-truong'
  };
  Object.keys(THU_MUC_GAME_CU).forEach(function (g) { HINH_GAME[g] = '../' + THU_MUC_GAME_CU[g] + '/icons/icon-192.png'; });

  /*
   * Mỗi màn: một bài SGK, một thể loại game, một kỹ năng chính (ky_nang_chinh) quyết định mức thành thạo và trứng vùng.
   * luyen_tap: màn luyện lại kỹ năng của các màn khác bằng thể loại khác (không có kỹ năng riêng, không tính vào trứng vùng).
   * cup_can: các màn phải xong ít nhất một lần thì cúp mới mở (mặc định: mọi màn có kỹ năng chính).
   * Mỗi mục câu { ky_nang, ty_le, cach, dang, … } được chuyển nguyên cho bộ sinh câu của kỹ năng (cach: kiểu câu con).
   * che_do: chế độ riêng của thể loại (ví dụ Xưởng Đo Lường 'can', 'rot', 'thuoc'); game đọc m.che_do.
   * Màn có bai_dau từ 37 trở lên thuộc học kì 2: với bé lớp 2 chỉ mở khi đã học tới Bài 37 (manMo).
   */
  const MAN_V1 = [
    { id: 'v1-m1', so: 1, ten: 'Chục và đơn vị', bai: 'Bài 1', bai_dau: 1, game: 'xep-hinh-so', ky_nang_chinh: 'cau-tao-so-100', cau: [{ ky_nang: 'cau-tao-so-100' }], so_cau: 10 },
    { id: 'v1-m2', so: 2, ten: 'Số liền trước, số liền sau', bai: 'Bài 2', bai_dau: 2, game: 'lat-the', ky_nang_chinh: 'lien-truoc-sau-100', cau: [{ ky_nang: 'lien-truoc-sau-100' }], so_cau: 12 },
    { id: 'v1-m3', so: 3, ten: 'Hơn, kém nhau bao nhiêu', bai: 'Bài 4, 5', bai_dau: 4, game: 'truyen-tranh', ky_nang_chinh: 'toan-hon-kem', cau: [{ ky_nang: 'toan-hon-kem' }], so_cau: 8 },
    { id: 'v1-m4', so: 4, ten: 'Tia số, đếm thêm', bai: 'Bài 1, 2', bai_dau: 2, game: 'cuoi-ho', ky_nang_chinh: 'tia-so-100', cau: [{ ky_nang: 'tia-so-100' }], so_cau: 12 },
    { id: 'v1-m5', so: 5, ten: 'So sánh số', bai: 'Bài 1', bai_dau: 1, game: 'chem-trai-cay', ky_nang_chinh: 'so-sanh-100', cau: [{ ky_nang: 'so-sanh-100', cach: ['dau', 'dau', 'lon_nhat', 'be_nhat'] }], so_cau: 12 },
    { id: 'v1-m6', so: 6, ten: 'Xếp thứ tự từ bé đến lớn', bai: 'Bài 1', bai_dau: 1, game: 'ban-thien-thach', luyen_tap: true, cau: [{ ky_nang: 'so-sanh-100', cach: ['xep'], dang: 'sap_xep' }], so_cau: 6 },
    { id: 'v1-m7', so: 7, ten: 'Mê cung đếm thêm', bai: 'Bài 2', bai_dau: 2, game: 'me-cung', luyen_tap: true, cau: [{ ky_nang: 'tia-so-100', cach: ['day'] }], so_cau: 8 },
    // Nhóm D của lần rà soát 2026-09-28: thêm màn sau các màn cũ (giữ số màn cũ để bé và bước tiếp theo không lẫn)
    { id: 'v1-m8', so: 8, ten: 'Số hạng, tổng, số bị trừ, số trừ, hiệu', bai: 'Bài 3', bai_dau: 3, game: 'chem-trai-cay', ky_nang_chinh: 'ten-thanh-phan-cong-tru', cau: [{ ky_nang: 'ten-thanh-phan-cong-tru' }], so_cau: 10 },
    { id: 'v1-m9', so: 9, ten: 'Cộng, trừ không nhớ trong phạm vi 100', bai: 'Bài 5, 6', bai_dau: 5, game: 'dua-xe', ky_nang_chinh: 'cong-tru-khong-nho-100', cau: [{ ky_nang: 'cong-tru-khong-nho-100' }], so_cau: 12 },
    { id: 'v1-cup', so: 10, ten: 'Cúp Bờ Biển · Luyện tập chung', bai: 'Bài 6', bai_dau: 6, game: 'lat-the', cup: true, so_cau: 12, cup_can: ['v1-m1', 'v1-m2', 'v1-m3'],
      cau: [{ ky_nang: 'lien-truoc-sau-100', ty_le: 1 }, { ky_nang: 'cau-tao-so-100', ty_le: 1, cach: ['chu', 'hang', 'tong'] },
        { ky_nang: 'ten-thanh-phan-cong-tru', ty_le: 0.5, cach: ['tinh'] }, { ky_nang: 'cong-tru-khong-nho-100', ty_le: 0.5 }] }
  ];
  const MAN_V2 = [
    { id: 'v2-m1', so: 1, ten: 'Cộng qua 10', bai: 'Bài 7, 8', bai_dau: 7, game: 'dua-xe', ky_nang_chinh: 'cong-qua-10', cau: [{ ky_nang: 'cong-qua-10' }], so_cau: 12 },
    { id: 'v2-m2', so: 2, ten: 'Trừ qua 10', bai: 'Bài 11, 12', bai_dau: 11, game: 'dua-xe', ky_nang_chinh: 'tru-qua-10', cau: [{ ky_nang: 'tru-qua-10' }], so_cau: 12 },
    { id: 'v2-m3', so: 3, ten: 'Tìm số còn thiếu', bai: 'Bài 14', bai_dau: 14, game: 'dua-xe', ky_nang_chinh: 'tim-so-thieu-20', cau: [{ ky_nang: 'tim-so-thieu-20' }], so_cau: 12 },
    { id: 'v2-m4', so: 4, ten: 'Bài toán thêm, bớt', bai: 'Bài 9', bai_dau: 9, game: 'truyen-tranh', ky_nang_chinh: 'toan-them-bot', cau: [{ ky_nang: 'toan-them-bot' }], so_cau: 8 },
    { id: 'v2-m5', so: 5, ten: 'Bài toán nhiều hơn, ít hơn', bai: 'Bài 13', bai_dau: 13, game: 'truyen-tranh', ky_nang_chinh: 'toan-nhieu-it', cau: [{ ky_nang: 'toan-nhieu-it' }], so_cau: 8 },
    { id: 'v2-m6', so: 6, ten: 'Lật thẻ: bảng cộng, bảng trừ', bai: 'Bài 8, 12', bai_dau: 12, game: 'lat-the', luyen_tap: true, cau: [{ ky_nang: 'cong-qua-10' }, { ky_nang: 'tru-qua-10' }], so_cau: 12 },
    { id: 'v2-m7', so: 7, ten: 'Chém trái cây: cộng, trừ qua 10', bai: 'Bài 8, 12', bai_dau: 12, game: 'chem-trai-cay', luyen_tap: true, so_cau: 15,
      cau: [{ ky_nang: 'cong-qua-10' }, { ky_nang: 'tru-qua-10' }, { ky_nang: 'cong-qua-10', cach: ['so_sanh'], ty_le: 0.4 }, { ky_nang: 'tru-qua-10', cach: ['so_sanh'], ty_le: 0.4 }] },
    { id: 'v2-cup', so: 8, ten: 'Cúp Núi Lửa · Luyện tập chung', bai: 'Bài 14', bai_dau: 14, game: 'dua-xe', cup: true, tram_dung: true, so_cau: 15, cup_can: ['v2-m1', 'v2-m2', 'v2-m3'],
      cau: [{ ky_nang: 'cong-qua-10', ty_le: 1 }, { ky_nang: 'tru-qua-10', ty_le: 1 }, { ky_nang: 'tim-so-thieu-20', ty_le: 0.6 },
        { ky_nang: 'cong-qua-10', cach: ['so_sanh'], ty_le: 0.25 }, { ky_nang: 'tru-qua-10', cach: ['so_sanh'], ty_le: 0.25 }] }
  ];
  const MAN_V3 = [
    { id: 'v3-m1', so: 1, ten: 'Nặng hơn, nhẹ hơn', bai: 'Bài 15', bai_dau: 15, game: 'xuong-do-luong', che_do: 'can', ky_nang_chinh: 'nang-nhe', cau: [{ ky_nang: 'nang-nhe' }], so_cau: 8 },
    { id: 'v3-m2', so: 2, ten: 'Cân ki-lô-gam', bai: 'Bài 15', bai_dau: 15, game: 'xuong-do-luong', che_do: 'can', ky_nang_chinh: 'can-kg', cau: [{ ky_nang: 'can-kg' }], so_cau: 8 },
    { id: 'v3-m3', so: 3, ten: 'Lít: rót nước', bai: 'Bài 16', bai_dau: 16, game: 'xuong-do-luong', che_do: 'rot', ky_nang_chinh: 'rot-lit', cau: [{ ky_nang: 'rot-lit' }], so_cau: 8 },
    { id: 'v3-m4', so: 4, ten: 'Bài toán ki-lô-gam, lít', bai: 'Bài 17, 18', bai_dau: 17, game: 'truyen-tranh', ky_nang_chinh: 'toan-kg-lit', cau: [{ ky_nang: 'toan-kg-lit' }], so_cau: 8 },
    { id: 'v3-m5', so: 5, ten: 'Đề-xi-mét, mét, ki-lô-mét', bai: 'Bài 55', bai_dau: 55, game: 'xuong-do-luong', che_do: 'don_vi', ky_nang_chinh: 'don-vi-do-dai', cau: [{ ky_nang: 'don-vi-do-dai' }], so_cau: 10 },
    { id: 'v3-m6', so: 6, ten: 'Đo độ dài bằng thước', bai: 'Bài 57', bai_dau: 57, game: 'xuong-do-luong', che_do: 'thuoc', ky_nang_chinh: 'do-do-dai', cau: [{ ky_nang: 'do-do-dai' }], so_cau: 8 },
    { id: 'v3-cup', so: 7, ten: 'Cúp Xưởng · Luyện tập chung', bai: 'Bài 18', bai_dau: 18, game: 'xuong-do-luong', che_do: 'tron', cup: true, so_cau: 10, cup_can: ['v3-m1', 'v3-m2', 'v3-m3'],
      cau: [{ ky_nang: 'nang-nhe', ty_le: 0.6 }, { ky_nang: 'can-kg', ty_le: 1 }, { ky_nang: 'rot-lit', ty_le: 1 }] }
  ];
  const MAN_V4 = [
    { id: 'v4-m1', so: 1, ten: 'Cộng có nhớ: 2 chữ số + 1 chữ số', bai: 'Bài 19', bai_dau: 19, game: 'dua-xe', ky_nang_chinh: 'cong-nho-2cs-1cs', cau: [{ ky_nang: 'cong-nho-2cs-1cs', ty_le: 3 }, { ky_nang: 'cong-tru-khong-nho-100', cach: ['cong_1cs'], ty_le: 1 }], so_cau: 12 },
    { id: 'v4-m2', so: 2, ten: 'Cộng có nhớ: 2 chữ số + 2 chữ số', bai: 'Bài 20', bai_dau: 20, game: 'dua-xe', ky_nang_chinh: 'cong-nho-2cs-2cs', cau: [{ ky_nang: 'cong-nho-2cs-2cs', ty_le: 3 }, { ky_nang: 'cong-tru-khong-nho-100', cach: ['cong_2cs'], ty_le: 1 }], so_cau: 12, tram_dung: true },
    { id: 'v4-m3', so: 3, ten: 'Nhẩm số tròn chục', bai: 'Bài 21', bai_dau: 21, game: 'dua-xe', ky_nang_chinh: 'nham-tron-chuc', cau: [{ ky_nang: 'nham-tron-chuc' }], so_cau: 12 },
    { id: 'v4-m4', so: 4, ten: 'Trừ có nhớ: 2 chữ số − 1 chữ số', bai: 'Bài 22', bai_dau: 22, game: 'dua-xe', ky_nang_chinh: 'tru-nho-2cs-1cs', cau: [{ ky_nang: 'tru-nho-2cs-1cs', ty_le: 3 }, { ky_nang: 'cong-tru-khong-nho-100', cach: ['tru_1cs'], ty_le: 1 }], so_cau: 12 },
    { id: 'v4-m5', so: 5, ten: 'Trừ có nhớ: 2 chữ số − 2 chữ số', bai: 'Bài 23', bai_dau: 23, game: 'dua-xe', ky_nang_chinh: 'tru-nho-2cs-2cs', cau: [{ ky_nang: 'tru-nho-2cs-2cs', ty_le: 3 }, { ky_nang: 'cong-tru-khong-nho-100', cach: ['tru_2cs'], ty_le: 1 }], so_cau: 12, tram_dung: true },
    { id: 'v4-m6', so: 6, ten: 'Bài toán có lời văn', bai: 'Bài 19 đến 23', bai_dau: 23, game: 'truyen-tranh', ky_nang_chinh: 'toan-loi-van-100', cau: [{ ky_nang: 'toan-loi-van-100' }], so_cau: 8 },
    { id: 'v4-m7', so: 7, ten: 'Cặp tấm thẻ anh em', bai: 'Bài 24', bai_dau: 24, game: 'lat-the', luyen_tap: true, so_cau: 12,
      cau: [{ ky_nang: 'tru-nho-2cs-1cs', ty_le: 1 }, { ky_nang: 'tru-nho-2cs-2cs', ty_le: 1 }, { ky_nang: 'nham-tron-chuc', ty_le: 0.5 }] },
    { id: 'v4-m8', so: 8, ten: 'Bắn thiên thạch: cộng, trừ có nhớ', bai: 'Bài 22, 23', bai_dau: 23, game: 'ban-thien-thach', luyen_tap: true, dang: 'nhap_so', so_cau: 12,
      cau: [{ ky_nang: 'tru-nho-2cs-1cs', ty_le: 1 }, { ky_nang: 'tru-nho-2cs-2cs', ty_le: 1 }, { ky_nang: 'cong-nho-2cs-2cs', ty_le: 0.6 }] },
    { id: 'v4-cup', so: 9, ten: 'Cúp Đường Đua · Luyện tập chung', bai: 'Bài 24', bai_dau: 24, game: 'dua-xe', cup: true, tram_dung: true, so_cau: 15, cup_can: ['v4-m1', 'v4-m2', 'v4-m3', 'v4-m4', 'v4-m5'],
      cau: [{ ky_nang: 'cong-nho-2cs-2cs', ty_le: 1 }, { ky_nang: 'tru-nho-2cs-2cs', ty_le: 1 }, { ky_nang: 'cong-tru-khong-nho-100', ty_le: 0.6 }, { ky_nang: 'bieu-thuc-2-dau', ty_le: 0.8 }] }
  ];
  const MAN_V5 = [
    { id: 'v5-m1', so: 1, ten: 'Điểm, đoạn thẳng, đường thẳng, đường cong', bai: 'Bài 25', bai_dau: 25, game: 'rung-hinh-khoi', ky_nang_chinh: 'nhan-dang-duong', cau: [{ ky_nang: 'nhan-dang-duong' }], so_cau: 8 },
    { id: 'v5-m2', so: 2, ten: 'Ba điểm thẳng hàng', bai: 'Bài 25', bai_dau: 25, game: 'rung-hinh-khoi', ky_nang_chinh: 'ba-diem-thang-hang', cau: [{ ky_nang: 'ba-diem-thang-hang' }], so_cau: 8 },
    { id: 'v5-m3', so: 3, ten: 'Đường gấp khúc và độ dài', bai: 'Bài 26', bai_dau: 26, game: 'rung-hinh-khoi', ky_nang_chinh: 'duong-gap-khuc', cau: [{ ky_nang: 'duong-gap-khuc' }], so_cau: 8 },
    { id: 'v5-m4', so: 4, ten: 'Hình tứ giác', bai: 'Bài 26', bai_dau: 26, game: 'rung-hinh-khoi', ky_nang_chinh: 'hinh-tu-giac', cau: [{ ky_nang: 'hinh-tu-giac' }], so_cau: 8 },
    { id: 'v5-m5', so: 5, ten: 'Gấp, cắt, ghép hình', bai: 'Bài 27', bai_dau: 27, game: 'rung-hinh-khoi', ky_nang_chinh: 'ghep-hinh', cau: [{ ky_nang: 'ghep-hinh' }], so_cau: 6 },
    { id: 'v5-m6', so: 6, ten: 'Khối trụ, khối cầu', bai: 'Bài 46', bai_dau: 46, game: 'rung-hinh-khoi', ky_nang_chinh: 'khoi-tru-cau', cau: [{ ky_nang: 'khoi-tru-cau' }], so_cau: 8 },
    { id: 'v5-m7', so: 7, ten: 'Tháp xếp hình: tứ giác', bai: 'Bài 26', bai_dau: 26, game: 'thap-xep-hinh', luyen_tap: true, cau: [{ ky_nang: 'hinh-tu-giac', dang: 'chon_dap_an' }], so_cau: 10 },
    { id: 'v5-m8', so: 8, ten: 'Mê cung đường gấp khúc', bai: 'Bài 26', bai_dau: 26, game: 'me-cung', luyen_tap: true, cau: [{ ky_nang: 'duong-gap-khuc', dang: 'chon_dap_an' }], so_cau: 6 },
    { id: 'v5-m9', so: 9, ten: 'Xe tăng: ba điểm thẳng hàng', bai: 'Bài 25', bai_dau: 25, game: 'xe-tang', luyen_tap: true, cau: [{ ky_nang: 'ba-diem-thang-hang', dang: 'chon_dap_an' }], so_cau: 8 },
    { id: 'v5-cup', so: 10, ten: 'Cúp Rừng · Luyện tập chung', bai: 'Bài 28', bai_dau: 28, game: 'rung-hinh-khoi', cup: true, so_cau: 10, cup_can: ['v5-m1', 'v5-m2', 'v5-m3', 'v5-m4'],
      cau: [{ ky_nang: 'nhan-dang-duong', ty_le: 0.6 }, { ky_nang: 'ba-diem-thang-hang', ty_le: 0.6 }, { ky_nang: 'duong-gap-khuc', ty_le: 1 }, { ky_nang: 'hinh-tu-giac', ty_le: 1 }] }
  ];
  const MAN_V6 = [
    { id: 'v6-m1', so: 1, ten: 'Ngày và giờ, các buổi trong ngày', bai: 'Bài 29', bai_dau: 29, game: 'lat-lich', che_do: 'buoi', ky_nang_chinh: 'ngay-gio', cau: [{ ky_nang: 'ngay-gio' }], so_cau: 8 },
    { id: 'v6-m2', so: 2, ten: 'Xem đồng hồ', bai: 'Bài 29', bai_dau: 29, game: 'lat-lich', che_do: 'dong_ho', ky_nang_chinh: 'xem-gio', cau: [{ ky_nang: 'xem-gio' }], so_cau: 10 },
    { id: 'v6-m3', so: 3, ten: 'Ngày, tháng: xem lịch', bai: 'Bài 30', bai_dau: 30, game: 'lat-lich', che_do: 'lich', ky_nang_chinh: 'xem-lich', cau: [{ ky_nang: 'xem-lich' }], so_cau: 8 },
    { id: 'v6-m4', so: 4, ten: 'Mê cung đồng hồ', bai: 'Bài 29', bai_dau: 29, game: 'me-cung', luyen_tap: true, cau: [{ ky_nang: 'xem-gio', dang: 'chon_dap_an' }], so_cau: 8 },
    { id: 'v6-m5', so: 5, ten: 'Tháp đồng hồ', bai: 'Bài 29', bai_dau: 29, game: 'thap-xep-hinh', luyen_tap: true, cau: [{ ky_nang: 'xem-gio', dang: 'chon_dap_an' }], so_cau: 10 },
    { id: 'v6-m6', so: 6, ten: 'Xe tăng thời gian', bai: 'Bài 29, 31', bai_dau: 31, game: 'xe-tang', luyen_tap: true, cau: [{ ky_nang: 'xem-gio', ty_le: 1, dang: 'chon_dap_an' }, { ky_nang: 'ngay-gio', ty_le: 1, dang: 'chon_dap_an', cach: ['buoi', 'doi_24', 'doi_12', 'dong_ho_buoi'] }], so_cau: 10 },
    { id: 'v6-m7', so: 7, ten: 'Cưỡi hổ qua giờ', bai: 'Bài 31', bai_dau: 31, game: 'cuoi-ho', luyen_tap: true, cau: [{ ky_nang: 'xem-gio', dang: 'chon_dap_an' }], so_cau: 12 },
    { id: 'v6-cup', so: 8, ten: 'Cúp Phố Đồng Hồ · Luyện tập chung', bai: 'Bài 32', bai_dau: 32, game: 'lat-lich', che_do: 'tron', cup: true, so_cau: 10, cup_can: ['v6-m1', 'v6-m2', 'v6-m3'],
      cau: [{ ky_nang: 'ngay-gio', ty_le: 0.8 }, { ky_nang: 'xem-gio', ty_le: 1 }, { ky_nang: 'xem-lich', ty_le: 1 }] }
  ];
  const MAN_DT1 = [
    { id: 'dt1', so: 1, ten: 'Đấu Trường Học Kì 1', bai: 'Bài 33 đến 36', bai_dau: 33, game: 'dau-truong', cup: true, so_cau: 10, cau: [],
      dau_truong: { vung: [1, 2, 3, 4, 5, 6], boss: 'boss-hk1', ten_boss: 'Tam Giác Vương', phu_kien: 'Bộ Giáp Học Kì 1', mau_boss: 12 } }
  ];
  const MAN_V7 = [
    { id: 'v7-m1', so: 1, ten: 'Phép nhân', bai: 'Bài 37, 38', bai_dau: 37, game: 'lat-the', ky_nang_chinh: 'nhan-y-nghia', cau: [{ ky_nang: 'nhan-y-nghia' }], so_cau: 12 },
    { id: 'v7-m2', so: 2, ten: 'Bảng nhân 2, bảng nhân 5', bai: 'Bài 39, 40', bai_dau: 39, game: 'lat-the', ky_nang_chinh: 'bang-nhan-2-5', cau: [{ ky_nang: 'bang-nhan-2-5' }], so_cau: 12 },
    { id: 'v7-m3', so: 3, ten: 'Phép chia: chia đều, chia theo nhóm', bai: 'Bài 41, 42', bai_dau: 41, game: 'truyen-tranh', ky_nang_chinh: 'chia-y-nghia', cau: [{ ky_nang: 'chia-y-nghia' }], so_cau: 8 },
    { id: 'v7-m4', so: 4, ten: 'Bảng chia 2, bảng chia 5', bai: 'Bài 43, 44', bai_dau: 43, game: 'lat-the', ky_nang_chinh: 'bang-chia-2-5', cau: [{ ky_nang: 'bang-chia-2-5' }], so_cau: 12 },
    { id: 'v7-m5', so: 5, ten: 'Bài toán nhân, chia', bai: 'Bài 45', bai_dau: 45, game: 'truyen-tranh', ky_nang_chinh: 'toan-nhan-chia', cau: [{ ky_nang: 'toan-nhan-chia' }], so_cau: 9 },
    { id: 'v7-m6', so: 6, ten: 'Bắn thiên thạch: bảng nhân, bảng chia', bai: 'Bài 39 đến 44', bai_dau: 44, game: 'ban-thien-thach', luyen_tap: true, dang: 'nhap_so', so_cau: 15,
      cau: [{ ky_nang: 'bang-nhan-2-5', ty_le: 1 }, { ky_nang: 'bang-chia-2-5', ty_le: 1 }] },
    { id: 'v7-m7', so: 7, ten: 'Chém trái cây: nhân, chia', bai: 'Bài 39 đến 44', bai_dau: 44, game: 'chem-trai-cay', luyen_tap: true, so_cau: 15,
      cau: [{ ky_nang: 'bang-nhan-2-5', ty_le: 1 }, { ky_nang: 'bang-chia-2-5', ty_le: 1 }] },
    { id: 'v7-m8', so: 8, ten: 'Thừa số, tích', bai: 'Bài 38', bai_dau: 38, game: 'chem-trai-cay', ky_nang_chinh: 'ten-thanh-phan-nhan-chia', cau: [{ ky_nang: 'ten-thanh-phan-nhan-chia', phep: ['×'] }], so_cau: 10 },
    { id: 'v7-m9', so: 9, ten: 'Số bị chia, số chia, thương', bai: 'Bài 41, 42', bai_dau: 42, game: 'chem-trai-cay', ky_nang_chinh: 'nhan-chia-lien-he', so_cau: 12,
      cau: [{ ky_nang: 'nhan-chia-lien-he', ty_le: 1 }, { ky_nang: 'ten-thanh-phan-nhan-chia', phep: [':'], ty_le: 1 }] },
    { id: 'v7-cup', so: 10, ten: 'Cúp Thung Lũng · Luyện tập chung', bai: 'Bài 45', bai_dau: 45, game: 'lat-the', cup: true, so_cau: 12, cup_can: ['v7-m1', 'v7-m2', 'v7-m3', 'v7-m4', 'v7-m5'],
      cau: [{ ky_nang: 'bang-nhan-2-5', ty_le: 1 }, { ky_nang: 'bang-chia-2-5', ty_le: 1 }, { ky_nang: 'nhan-y-nghia', ty_le: 0.6 }, { ky_nang: 'nhan-chia-lien-he', ty_le: 0.5 }] }
  ];
  const MAN_V8 = [
    { id: 'v8-m1', so: 1, ten: 'Trăm, chục, đơn vị', bai: 'Bài 48 đến 52', bai_dau: 48, game: 'xep-hinh-so', ky_nang_chinh: 'cau-tao-so-1000', cau: [{ ky_nang: 'cau-tao-so-1000' }], so_cau: 10 },
    { id: 'v8-m2', so: 2, ten: 'Đọc, viết số có ba chữ số', bai: 'Bài 51', bai_dau: 51, game: 'xep-hinh-so', ky_nang_chinh: 'doc-so-1000', cau: [{ ky_nang: 'doc-so-1000' }], so_cau: 10 },
    { id: 'v8-m3', so: 3, ten: 'Lật thẻ: số và tổng trăm, chục, đơn vị', bai: 'Bài 52', bai_dau: 52, game: 'lat-the', luyen_tap: true, so_cau: 12,
      cau: [{ ky_nang: 'cau-tao-so-1000', ty_le: 1, cach: ['tong', 'hang'] }, { ky_nang: 'doc-so-1000', ty_le: 0.8 }] },
    { id: 'v8-m4', so: 4, ten: 'Cộng, trừ trong phạm vi 1000', bai: 'Bài 59 đến 62', bai_dau: 59, game: 'dua-xe', ky_nang_chinh: 'cong-tru-1000', cau: [{ ky_nang: 'cong-tru-1000' }], so_cau: 12, tram_dung: true },
    { id: 'v8-m5', so: 5, ten: 'So sánh số có ba chữ số', bai: 'Bài 50, 53', bai_dau: 53, game: 'ban-thien-thach', ky_nang_chinh: 'so-sanh-1000', cau: [{ ky_nang: 'so-sanh-1000', cach: ['lon_nhat', 'be_nhat', 'xep'] }], so_cau: 10 },
    { id: 'v8-m6', so: 6, ten: 'Số liền trước, số liền sau đến 1000', bai: 'Bài 51', bai_dau: 51, game: 'cuoi-ho', ky_nang_chinh: 'lien-truoc-sau-1000', cau: [{ ky_nang: 'lien-truoc-sau-1000' }], so_cau: 12 },
    { id: 'v8-m7', so: 7, ten: 'Ước lượng theo nhóm chục', bai: 'Bài 49', bai_dau: 49, game: 'cau-ca', che_do: 'uoc_luong', ky_nang_chinh: 'uoc-luong-chuc', cau: [{ ky_nang: 'uoc-luong-chuc' }], so_cau: 8 },
    { id: 'v8-m8', so: 8, ten: 'Bài toán có lời văn trong phạm vi 1000', bai: 'Bài 59 đến 63', bai_dau: 60, game: 'truyen-tranh', ky_nang_chinh: 'toan-loi-van-1000', cau: [{ ky_nang: 'toan-loi-van-1000' }], so_cau: 8 },
    { id: 'v8-cup', so: 9, ten: 'Cúp Kim Tự Tháp · Luyện tập chung', bai: 'Bài 54, 63', bai_dau: 63, game: 'dua-xe', cup: true, tram_dung: true, so_cau: 15, cup_can: ['v8-m1', 'v8-m2', 'v8-m4'],
      cau: [{ ky_nang: 'cong-tru-1000', ty_le: 1 }, { ky_nang: 'lien-truoc-sau-1000', ty_le: 0.6 }, { ky_nang: 'so-sanh-1000', ty_le: 0.6, cach: ['lon_nhat', 'be_nhat'] }] }
  ];
  const MAN_V9 = [
    { id: 'v9-m1', so: 1, ten: 'Nhận biết tờ tiền', bai: 'Bài 56', bai_dau: 56, game: 'cho-khung-long', che_do: 'nhan_biet', ky_nang_chinh: 'nhan-biet-tien', cau: [{ ky_nang: 'nhan-biet-tien' }], so_cau: 8 },
    { id: 'v9-m2', so: 2, ten: 'Trả tiền mua hàng', bai: 'Bài 56', bai_dau: 56, game: 'cho-khung-long', che_do: 'tra_tien', ky_nang_chinh: 'tra-tien', cau: [{ ky_nang: 'tra-tien' }], so_cau: 8 },
    { id: 'v9-m3', so: 3, ten: 'Đổi tiền', bai: 'Bài 56', bai_dau: 56, game: 'cho-khung-long', che_do: 'doi_tien', ky_nang_chinh: 'doi-tien', cau: [{ ky_nang: 'doi-tien' }], so_cau: 8 },
    { id: 'v9-m4', so: 4, ten: 'Làm người bán: trả lại tiền thừa', bai: 'Bài 56 (mở rộng)', bai_dau: 56, game: 'cho-khung-long', che_do: 'nguoi_ban', ky_nang_chinh: 'tien-thua', cau: [{ ky_nang: 'tien-thua' }], so_cau: 8 },
    { id: 'v9-m5', so: 5, ten: 'Bài toán mua bán', bai: 'Bài 56 (mở rộng)', bai_dau: 56, game: 'truyen-tranh', ky_nang_chinh: 'toan-tien', cau: [{ ky_nang: 'toan-tien' }], so_cau: 8 },
    { id: 'v9-cup', so: 6, ten: 'Cúp Chợ · Luyện tập chung', bai: 'Bài 56', bai_dau: 56, game: 'cho-khung-long', che_do: 'tron', cup: true, so_cau: 10, cup_can: ['v9-m1', 'v9-m2', 'v9-m3', 'v9-m4'],
      cau: [{ ky_nang: 'tra-tien', ty_le: 1 }, { ky_nang: 'doi-tien', ty_le: 0.8 }, { ky_nang: 'tien-thua', ty_le: 0.8 }] }
  ];
  const MAN_V10 = [
    { id: 'v10-m1', so: 1, ten: 'Thu thập, phân loại, kiểm đếm', bai: 'Bài 64', bai_dau: 64, game: 'cau-ca', che_do: 'kiem_dem', ky_nang_chinh: 'kiem-dem', cau: [{ ky_nang: 'kiem-dem' }], so_cau: 6 },
    { id: 'v10-m2', so: 2, ten: 'Biểu đồ tranh', bai: 'Bài 65', bai_dau: 65, game: 'cau-ca', che_do: 'bieu_do', ky_nang_chinh: 'bieu-do-tranh', cau: [{ ky_nang: 'bieu-do-tranh' }], so_cau: 8 },
    { id: 'v10-m3', so: 3, ten: 'Chắc chắn, có thể, không thể', bai: 'Bài 66', bai_dau: 66, game: 'cau-ca', che_do: 'hop_bong', ky_nang_chinh: 'kha-nang', cau: [{ ky_nang: 'kha-nang' }], so_cau: 8 },
    { id: 'v10-m4', so: 4, ten: 'Cưỡi hổ đọc biểu đồ tranh', bai: 'Bài 65', bai_dau: 65, game: 'cuoi-ho', luyen_tap: true, cau: [{ ky_nang: 'bieu-do-tranh', dang: 'chon_dap_an' }], so_cau: 8 },
    { id: 'v10-m5', so: 5, ten: 'Chém trái cây: chắc chắn, có thể, không thể', bai: 'Bài 66', bai_dau: 66, game: 'chem-trai-cay', luyen_tap: true, cau: [{ ky_nang: 'kha-nang', dang: 'chon_dap_an' }], so_cau: 8 },
    { id: 'v10-cup', so: 6, ten: 'Cúp Hồ Thống Kê · Luyện tập chung', bai: 'Bài 67', bai_dau: 67, game: 'cau-ca', che_do: 'tron', cup: true, so_cau: 8, cup_can: ['v10-m1', 'v10-m2', 'v10-m3'],
      cau: [{ ky_nang: 'kiem-dem', ty_le: 0.6 }, { ky_nang: 'bieu-do-tranh', ty_le: 1 }, { ky_nang: 'kha-nang', ty_le: 0.8 }] }
  ];
  const MAN_DT2 = [
    { id: 'dt2', so: 1, ten: 'Đấu Trường Cuối Năm', bai: 'Bài 68 đến 75', bai_dau: 68, game: 'dau-truong', cup: true, so_cau: 14, cau: [],
      dau_truong: { vung: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], boss: 'boss-cuoi-nam', ten_boss: 'Rồng Vàng Cuối Năm', phu_kien: 'Vương Miện Cuối Năm', mau_boss: 16 } }
  ];

  /** vi_tri: tọa độ trên ảnh bg-island-map (tỉ lệ 0..1). nen: ảnh nền trang vùng. noi_dung: các mã nội dung của vùng (bản đồ kỹ năng 43 ô). */
  const VUNG = [
    { so: 1, ten: 'Bờ Biển Số 100', chu_de: 'Chủ đề 1', bai: [1, 6], hoc_ky: 1, loai: 'sp-rong-bien', ten_loai: 'Rồng Biển', phu_kien: 'Khăn Số 100', mau: '#0ea5c6', vi_tri: [0.168, 0.2], nen: 'bg-meadow', phu: 'rgba(14,140,190,.62)', noi_dung: ['2.1', '2.2', '2.5', '2.10', '2.14'], man: MAN_V1 },
    { so: 2, ten: 'Núi Lửa Qua 10', chu_de: 'Chủ đề 2', bai: [7, 14], hoc_ky: 1, loai: 'sp-khung-long-lua', ten_loai: 'Khủng Long Lửa', phu_kien: 'Mào Lửa', mau: '#ef5a3c', vi_tri: [0.361, 0.148], nen: 'bg-dusk-sky', phu: 'rgba(214,64,36,.55)', noi_dung: ['2.8', '2.9', '2.15', '2.17', '2.18'], man: MAN_V2 },
    { so: 3, ten: 'Xưởng Đo Lường', chu_de: 'Chủ đề 3 và 11', bai: [15, 18], hoc_ky: 1, loai: 'sp-giap-long', ten_loai: 'Giáp Long', phu_kien: 'Thước Vàng', mau: '#8b6fd6', vi_tri: [0.539, 0.212], nen: 'bg-workshop', phu: 'rgba(90,60,170,.55)', noi_dung: ['B2.6', 'B2.7', 'B2.9', 'B2.10'], man: MAN_V3 },
    { so: 4, ten: 'Đường Đua Có Nhớ', chu_de: 'Chủ đề 4', bai: [19, 24], hoc_ky: 1, loai: 'sp-toc-long', ten_loai: 'Tốc Long', phu_kien: 'Giày Đua', mau: '#ff8a1f', vi_tri: [0.142, 0.372], nen: 'bg-race-track', phu: 'rgba(255,122,60,.72)', noi_dung: ['2.11', '2.13', '2.16'], man: MAN_V4 },
    { so: 5, ten: 'Rừng Hình Khối', chu_de: 'Chủ đề 5 và 9', bai: [25, 28], hoc_ky: 1, loai: 'sp-kiem-long', ten_loai: 'Kiếm Long', phu_kien: 'Khiên Hình Khối', mau: '#3aa65b', vi_tri: [0.361, 0.338], nen: 'bg-garden', phu: 'rgba(30,120,60,.55)', noi_dung: ['B2.1', 'B2.2', 'B2.3', 'B2.4', 'B2.5', 'B2.8'], man: MAN_V5 },
    { so: 6, ten: 'Phố Đồng Hồ', chu_de: 'Chủ đề 6', bai: [29, 32], hoc_ky: 1, loai: 'sp-duc-long', ten_loai: 'Dực Long', phu_kien: 'Mũ Đồng Hồ', mau: '#3d7be0', vi_tri: [0.539, 0.418], nen: 'bg-dusk-sky', phu: 'rgba(40,80,190,.55)', noi_dung: ['B2.11', 'B2.12', 'B2.13'], man: MAN_V6 },
    { so: 11, ten: 'Đấu Trường Học Kì 1', chu_de: 'Chủ đề 7', bai: [33, 36], hoc_ky: 1, dau_truong: true, loai: null, mau: '#c7a24a', vi_tri: [0.16, 0.55], nen: 'bg-circus-night', phu: 'rgba(40,20,70,.45)', noi_dung: [], man: MAN_DT1 },
    { so: 7, ten: 'Thung Lũng Nhân Chia', chu_de: 'Chủ đề 8', bai: [37, 45], hoc_ky: 2, loai: 'sp-tam-giac-long', ten_loai: 'Tam Giác Long', phu_kien: 'Giáp Nhân Chia', mau: '#d35a9c', vi_tri: [0.36, 0.555], nen: 'bg-garden', phu: 'rgba(170,60,130,.6)', noi_dung: ['2.19', '2.20', '2.21', '2.22', '2.23', '2.24', '2.25', '2.26'], man: MAN_V7 },
    { so: 8, ten: 'Kim Tự Tháp 1000', chu_de: 'Chủ đề 10 và 12', bai: [48, 63], hoc_ky: 2, loai: 'sp-long-co-dai', ten_loai: 'Long Cổ Dài', phu_kien: 'Vòng Cổ Nghìn', mau: '#c9a227', vi_tri: [0.548, 0.59], nen: 'bg-desert-pyramid', phu: 'rgba(150,100,20,.55)', noi_dung: ['2.3', '2.4', '2.6', '2.7', '2.12'], man: MAN_V8 },
    { so: 9, ten: 'Chợ Khủng Long', chu_de: 'Chủ đề 11', bai: [56, 56], hoc_ky: 2, loai: 'sp-mo-vit-long', ten_loai: 'Mỏ Vịt Long', phu_kien: 'Túi Tiền Nhỏ', mau: '#e0703a', vi_tri: [0.178, 0.733], nen: 'bg-market', phu: 'rgba(170,80,30,.5)', noi_dung: ['B2.14'], man: MAN_V9 },
    { so: 10, ten: 'Hồ Thống Kê', chu_de: 'Chủ đề 13', bai: [64, 67], hoc_ky: 2, loai: 'sp-gai-long', ten_loai: 'Gai Long', phu_kien: 'Cần Câu Bạc', mau: '#1d9bd1', vi_tri: [0.41, 0.808], nen: 'bg-meadow', phu: 'rgba(20,110,170,.55)', noi_dung: ['C2.1', 'C2.2', 'C2.3'], man: MAN_V10 },
    { so: 12, ten: 'Đấu Trường Cuối Năm', chu_de: 'Chủ đề 14', bai: [68, 75], hoc_ky: 2, dau_truong: true, loai: null, mau: '#c7a24a', vi_tri: [0.598, 0.69], nen: 'bg-circus-night', phu: 'rgba(40,20,70,.45)', noi_dung: [], man: MAN_DT2 }
  ];

  /** Hình khủng long theo phong cách và mức lớn. */
  const HINH = {
    dung_manh: { ten: 'Rex', trung: 'rex-egg', lay_dong: 'rex-egg', so_sinh: 'rex-hatchling', nhi: 'rex-kid', thieu_nien: 'rex-teen', truong_thanh: 'rex-adult', huyen_thoai: 'rex-legend', an: 'rex-eating', co_vu: 'rex-cheer', goi_y: 'rex-think', xe: 'car-rex' },
    de_thuong: { ten: 'Mây', trung: 'may-egg', lay_dong: 'may-egg', so_sinh: 'may-hatchling', nhi: 'may-kid', thieu_nien: 'may-teen', truong_thanh: 'may-adult', huyen_thoai: 'may-legend', an: 'may-eating', co_vu: 'may-cheer', goi_y: 'may-think', xe: 'car-may' }
  };

  const NHIEM_VU_TEN = { on_cach_quang: 'Ôn nhanh', luyen_lai: 'Luyện lại chỗ yếu', hoc_moi: 'Học mới' };

  /** Màu trứng của từng vùng: độ xoay màu (hue-rotate) trên quả trứng của bé. */
  const MAU_TRUNG = { 1: 190, 2: 150, 3: 260, 4: 95, 5: 120, 6: 215, 7: 290, 8: 20, 9: 345, 10: 175 };

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
  /** Thể loại đã có mô-đun: trong trình duyệt xem sổ đăng ký window.DaoTroChoi, khi kiểm thử dùng GAME_CO. */
  function coGame(g) {
    if (!GAME_CO[g]) return false;
    const reg = typeof window !== 'undefined' ? window.DaoTroChoi : null;
    return reg ? !!reg[g] : true;
  }
  /** Mọi kỹ năng của màn đã có trong ngân hàng câu (phòng khi một tệp cau-*.js chưa nạp được). */
  function coKyNang(m) {
    const KY = window.NganHang && window.NganHang.KY_NANG;
    return !KY || (m.cau || []).every(function (x) { return !!KY[x.ky_nang]; });
  }
  function choiDuoc(m) { return !!(m && coGame(m.game) && ((m.cau && m.cau.length) || m.dau_truong) && coKyNang(m)); }
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
    if (m.dau_truong) return m.ten;
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

  function daLuyen(hocTap, ky) {
    return ((hocTap && hocTap.ky_nang) || []).filter(function (k) {
      return ky.indexOf(k.ky_nang) >= 0 && (k.muc === 'dang_luyen' || k.muc === 'da_thuoc' || k.muc === 'vung_chac');
    }).length;
  }
  function kyNangCacVung(ds) {
    const kn = [];
    ds.forEach(function (so) { const v = vung(so); if (v) kyNangCuaVung(v).forEach(function (k) { if (kn.indexOf(k) < 0) kn.push(k); }); });
    return kn;
  }

  /** Học kì 2 bắt đầu từ bài này (vùng, màn học kì 2 chờ bé lớp 2 học tới). */
  const BAI_HOC_KY_2 = 37;
  /** Đấu trường mở khi học tới bài này, hoặc đã luyện (Đang luyện trở lên) từ chừng này kỹ năng của các vùng của nó. */
  const DAU_TRUONG_MO = { 11: { bai: 30, ky_nang: 6 }, 12: { bai: 64, ky_nang: 14 } };

  /**
   * Vùng có mở cho bé không. Trả về { mo, sap_co, ly_do }.
   * hoSo.mo_khoa_vung (phụ huynh mở khóa) mở mọi vùng. Đấu trường học kì 1 mở khi đã học tới Bài 30 hoặc đã luyện
   * từ 6 kỹ năng của vùng 1 đến 6; đấu trường cuối năm mở khi tới Bài 64 hoặc đã luyện từ 14 kỹ năng (hocTap tùy chọn).
   */
  function trangThaiVung(v, hoSo, hocTap) {
    const lop = (hoSo && hoSo.lop) || 2;
    const bai = (hoSo && hoSo.bai_dang_hoc) || 1;
    let mo;
    let lyDo = null;
    if (lop >= 3 || (hoSo && hoSo.mo_khoa_vung)) mo = true;
    else if (lop <= 1) { mo = v.so === 1 || v.so === 2; if (!mo) lyDo = 'lop_2'; }
    else if (v.dau_truong) {
      const dk = DAU_TRUONG_MO[v.so];
      mo = bai >= dk.bai || daLuyen(hocTap, kyNangCacVung(v.man[0].dau_truong.vung)) >= dk.ky_nang;
      if (!mo) lyDo = v.so === 12 ? 'dau_truong_cuoi_nam' : 'dau_truong_hk1';
    } else if (v.hoc_ky === 2) { mo = bai >= BAI_HOC_KY_2; if (!mo) lyDo = 'hoc_ky_2'; }
    else mo = true;
    const coMan = v.man.some(choiDuoc);
    return { mo: mo, sap_co: !coMan, ly_do: lyDo };
  }

  /** Màn có mở không (trong một vùng đã mở): màn học kì 2 ở vùng học kì 1 chờ tới Bài 37 với bé lớp 2. */
  function manMo(m, hoSo) {
    const lop = (hoSo && hoSo.lop) || 2;
    if (lop >= 3 || (hoSo && hoSo.mo_khoa_vung)) return true;
    if (m.bai_dau >= BAI_HOC_KY_2 && lop === 2) return ((hoSo && hoSo.bai_dang_hoc) || 1) >= BAI_HOC_KY_2;
    return true;
  }

  /** Cúp của vùng mở khi đã xong ít nhất một lần các màn trong cup_can (mặc định: mọi màn có kỹ năng chính). */
  function cupMo(v, hoSo) {
    const kl = (hoSo && hoSo.ky_luc) || {};
    const cup = v.man.find(function (m) { return m.cup; });
    if (cup && cup.dau_truong) return true;
    const can = cup && cup.cup_can
      ? cup.cup_can.map(man).filter(function (m) { return m && choiDuoc(m); })
      : v.man.filter(function (m) { return !m.cup && !m.luyen_tap && choiDuoc(m); });
    return can.every(function (m) { return kl[m.id] && kl[m.id].sao > 0; });
  }

  /** Các kỹ năng một màn luyện (mọi kỹ năng trong danh sách câu). */
  function kyNangCuaMan(m) {
    const ds = [];
    (m.cau || []).forEach(function (x) { if (ds.indexOf(x.ky_nang) < 0) ds.push(x.ky_nang); });
    return ds;
  }

  /* ---------------- Đấu trường ---------------- */

  /**
   * Danh sách câu của một đấu trường, lập theo hồ sơ học tập: ưu tiên kỹ năng bé đang yếu (Cần giúp, tự làm đúng thấp,
   * còn câu nợ) và kỹ năng đã thuộc tới hạn ôn; kỹ năng chưa học có trọng số nhỏ. Bỏ bài toán hai bước (Truyện Tranh có
   * đấu trường riêng của nó là các màn cúp) để mọi câu hỏi được ở dạng chọn đáp án.
   * coKyNang(kn) (tùy chọn): lọc thêm kỹ năng mà ngân hàng câu hiện có.
   * hoSo (tùy chọn): bé lớp 2 chỉ gặp kỹ năng của bài đã học tới (bai_dang_hoc) hoặc đã từng luyện; ít quá thì thêm các
   * bài gần nhất cho đủ 4. Mỗi vùng có ít nhất một kỹ năng khi còn chỗ; bằng trọng số thì xếp ngẫu nhiên theo ngày
   * (không theo bảng chữ cái). Trả về [{ ky_nang, ty_le }] (tối đa 10), trọng số giảm dần.
   */
  function cauDauTruong(m, hocTap, homNay, coKyNang, hoSo) {
    const muc = {};
    ((hocTap && hocTap.ky_nang) || []).forEach(function (k) { muc[k.ky_nang] = k; });
    const lop = (hoSo && hoSo.lop) || 2;
    const bai = hoSo && lop === 2 && !hoSo.mo_khoa_vung ? (hoSo.bai_dang_hoc || 1) : Infinity;
    const vungCua = {};
    const baiDau = {};
    const tatCa = [];
    m.dau_truong.vung.forEach(function (so) {
      const v = vung(so);
      if (!v) return;
      kyNangCuaVung(v).forEach(function (kn) {
        if (vungCua[kn] != null || (coKyNang && !coKyNang(kn))) return;
        vungCua[kn] = so;
        const mc = manTheoKyNang(kn);
        baiDau[kn] = mc ? mc.bai_dau : 1;
        tatCa.push(kn);
      });
    });
    let chon = tatCa.filter(function (kn) { return baiDau[kn] <= bai || (muc[kn] && muc[kn].so_cau > 0); });
    if (chon.length < 4) {
      chon = chon.concat(tatCa.filter(function (kn) { return chon.indexOf(kn) < 0; })
        .sort(function (a, b) { return baiDau[a] - baiDau[b]; }).slice(0, 4 - chon.length));
    }
    const ds = [];
    chon.forEach(function (kn) {
      const k = muc[kn];
      let w;
      if (!k || !k.so_cau) w = 0.3;
      else {
        w = 1;
        if (k.can_giup) w += 2;
        if (k.cau_no) w += 1;
        if (k.tu_lam_dung_14_ngay != null && k.tu_lam_dung_14_ngay < 0.8) w += 1;
        if (k.on_lai_ke_tiep && homNay && k.on_lai_ke_tiep <= homNay) w += 1;
      }
      ds.push({ ky_nang: kn, ty_le: w });
    });
    const tron = {};
    ds.forEach(function (x) { tron[x.ky_nang] = bam(String(homNay || '') + '|' + x.ky_nang); });
    const theoTrongSo = function (a, b) { return b.ty_le - a.ty_le || tron[a.ky_nang] - tron[b.ky_nang] || (a.ky_nang < b.ky_nang ? -1 : 1); };
    ds.sort(theoTrongSo);
    // Mỗi vùng một kỹ năng nặng nhất trước, rồi lấp chỗ còn lại theo trọng số
    const ra = [];
    const coVung = {};
    ds.forEach(function (x) { if (!coVung[vungCua[x.ky_nang]]) { coVung[vungCua[x.ky_nang]] = true; ra.push(x); } });
    ds.forEach(function (x) { if (ra.indexOf(x) < 0) ra.push(x); });
    return ra.slice(0, 10).sort(theoTrongSo);
  }
  /** Băm chuỗi thành số (FNV-1a), dùng để xếp ngẫu nhiên mà vẫn cố định trong một ngày. */
  function bam(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h;
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
    const manMoDs = [];
    const manLuyen = [];
    VUNG.forEach(function (v) {
      if (!trangThaiVung(v, hoSo, hocTap).mo) return;
      v.man.forEach(function (m) {
        if (m.cup || !choiDuoc(m) || !manMo(m, hoSo)) return;
        manLuyen.push(m);
        if (m.ky_nang_chinh && !m.luyen_tap) manMoDs.push(m);
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
      ra.push({ loai: loai, man: choi.id, ky_nang: kn, ly_do: lyDo || null, so_cau: choi.game === 'truyen-tranh' ? Math.min(soCau, 8) : Math.min(soCau, choi.so_cau || soCau), xong: false });
      return true;
    };
    const mucCua = function (m) { return muc[m.ky_nang_chinh] || { muc: 'chua_hoc', so_cau: 0 }; };
    const coLoai = function (loai) { return ra.some(function (x) { return x.loai === loai; }); };

    // 0. Kế hoạch tuần phụ huynh đã chọn (Góc phụ huynh): mỗi loại lấy một mục, xoay vòng theo ngày
    const kh = hoSo && hoSo.ke_hoach_tuan;
    if (kh && kh.tu && kh.den && kh.tu <= homNay && homNay <= kh.den && Array.isArray(kh.muc)) {
      const ngay = Math.max(0, window.HocTap ? window.HocTap.soNgay(homNay) - window.HocTap.soNgay(kh.tu) : 0);
      [['on_nen', 'on_cach_quang'], ['luyen_lai', 'luyen_lai'], ['hoc_moi', 'hoc_moi']].forEach(function (cap) {
        const ds = kh.muc.filter(function (x) { const m = man(x.man); return x.loai === cap[0] && m && manLuyen.indexOf(m) >= 0; });
        if (!ds.length) return;
        const x = ds[ngay % ds.length];
        them(cap[1], man(x.man), x.ly_do || 'Theo kế hoạch của bố mẹ', 12, false);
      });
    }

    // 1. Ôn nhanh: kỹ năng đã thuộc tới hạn ôn, nếu không có thì kỹ năng đã luyện lâu chưa chơi lại
    const on = manMoDs.filter(function (m) {
      const k = mucCua(m);
      return (k.muc === 'da_thuoc' || k.muc === 'vung_chac') && k.on_lai_ke_tiep && k.on_lai_ke_tiep <= homNay;
    }).sort(function (a, b) { return mucCua(a).on_lai_ke_tiep < mucCua(b).on_lai_ke_tiep ? -1 : 1; });
    const lau = manMoDs.filter(function (m) {
      const k = mucCua(m);
      return (k.muc === 'dang_luyen' || k.muc === 'da_thuoc' || k.muc === 'vung_chac') && k.lan_cuoi && k.lan_cuoi < homNay && !k.can_giup;
    }).sort(function (a, b) { return mucCua(a).lan_cuoi < mucCua(b).lan_cuoi ? -1 : 1; });
    if (!coLoai('on_cach_quang')) them('on_cach_quang', on[0] || lau[0], null, 8, true);

    // 2. Luyện lại chỗ yếu: cờ Cần giúp, câu còn nợ, tỉ lệ tự làm đúng thấp
    const yeu = manMoDs.filter(function (m) {
      const k = mucCua(m);
      return k.so_cau > 0 && (k.can_giup || k.cau_no > 0 || (k.muc === 'dang_luyen' && k.tu_lam_dung_14_ngay != null && k.tu_lam_dung_14_ngay < 0.8));
    }).sort(function (a, b) {
      const ka = mucCua(a), kb = mucCua(b);
      return (kb.can_giup ? 1 : 0) - (ka.can_giup ? 1 : 0) || (kb.cau_no || 0) - (ka.cau_no || 0) || (ka.tu_lam_dung_14_ngay || 0) - (kb.tu_lam_dung_14_ngay || 0);
    });
    if (yeu[0] && !coLoai('luyen_lai')) {
      const k = mucCua(yeu[0]);
      const loi = k.loi_hay_gap && k.loi_hay_gap[0] ? k.loi_hay_gap[0].ma : null;
      them('luyen_lai', yeu[0], loi && LOI[loi] ? LOI[loi].ngan : 'Luyện thêm cho chắc', 12, true);
    }

    // 3. Học mới: màn chưa học hoặc mới làm quen. Trước hết là màn của bài đang học ở lớp,
    // rồi các màn chưa học của khoảng 15 bài gần đây theo đúng thứ tự SGK, rồi các màn còn lại
    const bai = (hoSo && hoSo.bai_dang_hoc) || 1;
    const moi = manMoDs.filter(function (m) { const k = mucCua(m); return (k.muc === 'chua_hoc' || k.muc === 'lam_quen') && !daChon[m.id]; });
    const theoBai = function (a, b) { return a.bai_dau - b.bai_dau; };
    const daHoc = moi.filter(function (m) { return m.bai_dau <= bai; }).sort(theoBai);
    const baiNay = daHoc.length ? [daHoc[daHoc.length - 1]] : [];
    const ganDay = moi.filter(function (m) { return baiNay.indexOf(m) < 0 && m.bai_dau <= bai + 3 && m.bai_dau >= bai - 15; }).sort(theoBai);
    const thuTuMoi = baiNay.concat(ganDay, moi.filter(function (m) { return baiNay.indexOf(m) < 0 && ganDay.indexOf(m) < 0; }).sort(theoBai));
    let i = 0;
    while (ra.length < 3 && i < thuTuMoi.length) { them('hoc_moi', thuTuMoi[i], null, 12); i++; }

    // Chưa đủ 3: thêm màn đang luyện có tỉ lệ thấp nhất
    const conLai = manMoDs.filter(function (m) { return !daChon[m.id]; }).sort(function (a, b) {
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

  /** Vùng của một mã nội dung (bản đồ kỹ năng 43 ô), hoặc null. */
  function vungCuaNoiDung(ma) {
    const v = VUNG.find(function (x) { return x.noi_dung.indexOf(ma) >= 0; });
    return v ? v.so : null;
  }

  /* ---------------- Bước tiếp theo ---------------- */

  /** Tên ngắn của một màn cho bé đọc: "Màn 3 · Nhẩm số tròn chục", cúp và đấu trường giữ tên riêng. */
  function tenManNgan(m) { return m.cup || m.dau_truong ? m.ten : 'Màn ' + m.so + ' · ' + m.ten; }

  /**
   * Việc bé nên làm tiếp (màn kết thúc ván, bản đồ khi đã xong nhiệm vụ). Thứ tự ưu tiên:
   * đã đủ số phút bố mẹ cho (chỉ khi phụ huynh đặt giới hạn) → nhiệm vụ hôm nay còn lại → màn vừa chơi chỉ được 1 sao thì chơi lại → cúp của vùng vừa mở
   * → màn chưa chơi cùng vùng → màn chưa chơi ở vùng khác (theo thứ tự bài SGK, không vượt bài đang học quá 3 bài)
   * → cúp đã mở mà chưa chơi → đấu trường đã mở mà chưa thắng → màn chưa đủ 3 sao → về đảo.
   * o: { hoSo, hocTap, nhiemVu: { ds, thuong }, manVuaChoi (mã màn hoặc null), sao (số sao ván vừa chơi), duPhut (đã chơi đủ số phút phụ huynh đặt) }
   * Trả về { loai, man, vung, nhiem_vu, tieu_de, ly_do, nut };
   * loai: nghi | nhiem_vu | choi_lai | cup | man_tiep | dau_truong | them_sao | ve_dao.
   */
  function buocTiep(o) {
    const p = o.hoSo || {};
    const kl = p.ky_luc || {};
    const ra = function (loai, m, tieuDe, lyDo, nut, them) {
      return Object.assign({ loai: loai, man: m ? m.id : null, vung: m ? m.vung : null, nhiem_vu: null, tieu_de: tieuDe, ly_do: lyDo, nut: nut }, them || {});
    };
    // Chỉ khi phụ huynh đặt giới hạn phút (mặc định không giới hạn) và hôm nay đã đủ
    if (o.duPhut) return ra('nghi', null, 'Hôm nay con chơi đủ giờ bố mẹ cho rồi', 'Mai mình chơi tiếp nhé! Bố mẹ cho thêm giờ thì con chơi tiếp được.', 'Về đảo');

    // 1. Nhiệm vụ hôm nay còn lại, chơi lần lượt 1, 2, 3
    const ds = (o.nhiemVu && o.nhiemVu.ds) || [];
    const i = ds.findIndex(function (x) { return !x.xong && choiDuoc(man(x.man)); });
    if (i >= 0) {
      const m = man(ds[i].man);
      const con = ds.filter(function (x) { return !x.xong; }).length;
      const thuong = window.HocTap ? window.HocTap.THUONG.xong_3_nhiem_vu : 20;
      const lyDo = con === 1 ? 'Nhiệm vụ cuối của hôm nay' : 'Còn ' + con + ' nhiệm vụ hôm nay';
      return ra('nhiem_vu', m, 'Nhiệm vụ ' + (i + 1) + ': ' + m.ten,
        lyDo + (ds.length >= 3 && !o.nhiemVu.thuong ? ', xong cả ' + ds.length + ' được thêm ' + thuong + ' quả mọng' : ''),
        'Chơi nhiệm vụ ' + (i + 1), { nhiem_vu: i });
    }

    const moHet = (p.lop || 2) >= 3 || !!p.mo_khoa_vung;
    const gioiHan = moHet ? 999 : (p.bai_dang_hoc || 1) + 3;
    const tatCa = [];
    VUNG.forEach(function (v) {
      if (!trangThaiVung(v, p, o.hocTap).mo) return;
      v.man.forEach(function (m) { if (choiDuoc(m) && manMo(m, p)) tatCa.push(m); });
    });
    const moDuoc = function (m) { return tatCa.indexOf(m) >= 0; };

    // 2. Theo vùng vừa chơi: chơi lại khi mới 1 sao, cúp vừa mở, màn chưa chơi cùng vùng
    const mv = man(o.manVuaChoi);
    if (mv && !mv.dau_truong) {
      const v = vung(mv.vung);
      if (o.sao === 1 && !mv.cup) return ra('choi_lai', mv, 'Chơi lại ' + tenManNgan(mv), 'Con làm lại cho chắc để được thêm sao nhé', 'Chơi lại');
      const cup = v.man.find(function (m) { return m.cup; });
      if (cup && cup.id !== mv.id && moDuoc(cup) && cupMo(v, p) && !kl[cup.id]) {
        return ra('cup', cup, cup.ten, 'Cúp đã mở vì con chơi xong các màn chính của ' + v.ten, 'Chơi cúp');
      }
      const cungVung = tatCa.filter(function (m) { return m.vung === v.so && !m.cup && m.bai_dau <= gioiHan; });
      const sau = cungVung.filter(function (m) { return m.so > mv.so; }).concat(cungVung.filter(function (m) { return m.so < mv.so; }));
      const chua = sau.find(function (m) { return !kl[m.id]; });
      if (chua) return ra('man_tiep', chua, tenManNgan(chua), 'Màn con chưa chơi ở ' + v.ten, 'Chơi màn ' + chua.so);
    }

    // 3. Màn chưa chơi ở vùng khác, theo thứ tự bài trong SGK
    const chuaChoi = tatCa.filter(function (m) { return !m.cup && !m.dau_truong && !kl[m.id] && m.bai_dau <= gioiHan; })
      .sort(function (a, b) { return a.bai_dau - b.bai_dau || a.vung - b.vung || a.so - b.so; });
    if (chuaChoi.length) {
      const m = chuaChoi[0];
      const v = vung(m.vung);
      return ra('man_tiep', m, tenManNgan(m), 'Màn mới ở Vùng ' + v.so + ' · ' + v.ten, 'Chơi màn này');
    }

    // 4. Cúp đã mở mà chưa chơi, đấu trường đã mở mà chưa thắng
    const cupChua = tatCa.find(function (m) { return m.cup && !m.dau_truong && !kl[m.id] && cupMo(vung(m.vung), p); });
    if (cupChua) return ra('cup', cupChua, cupChua.ten, 'Cúp của ' + vung(cupChua.vung).ten + ' đang chờ con', 'Chơi cúp');
    const dt = tatCa.find(function (m) { return m.dau_truong && !(p.dau_truong_thang && p.dau_truong_thang[m.vung]); });
    if (dt) return ra('dau_truong', dt, dt.ten, 'Cùng khủng long của con đấu với ' + dt.dau_truong.ten_boss, 'Vào đấu trường');

    // 5. Màn đã chơi mà chưa đủ 3 sao (ít sao nhất trước)
    const thieuSao = tatCa.filter(function (m) { return !m.dau_truong && kl[m.id] && (kl[m.id].sao || 0) < 3 && m.bai_dau <= gioiHan; })
      .sort(function (a, b) { return (kl[a.id].sao || 0) - (kl[b.id].sao || 0) || a.bai_dau - b.bai_dau; });
    if (thieuSao.length) {
      const m = thieuSao[0];
      return ra('them_sao', m, tenManNgan(m), 'Con đang có ' + (kl[m.id].sao || 0) + ' sao, thử lấy đủ 3 sao nhé', 'Lấy thêm sao');
    }
    return ra('ve_dao', null, 'Về đảo chọn trò con thích', 'Con đã chơi hết các màn đang mở rồi. Giỏi quá!', 'Về đảo');
  }

  window.Dao = {
    VUNG: VUNG,
    HINH: HINH,
    GAME_CO: GAME_CO,
    TEN_GAME: TEN_GAME,
    HINH_GAME: HINH_GAME,
    DANG_GAME: DANG_GAME,
    THU_MUC_GAME_CU: THU_MUC_GAME_CU,
    NHIEM_VU_TEN: NHIEM_VU_TEN,
    MAU_TRUNG: MAU_TRUNG,
    BAI_HOC_KY_2: BAI_HOC_KY_2,
    DAU_TRUONG_MO: DAU_TRUONG_MO,
    vung: vung,
    man: man,
    coGame: coGame,
    choiDuoc: choiDuoc,
    manMo: manMo,
    manTheoKyNang: manTheoKyNang,
    kyNangCuaVung: kyNangCuaVung,
    kyNangCuaMan: kyNangCuaMan,
    lichSuTheLoai: lichSuTheLoai,
    tenManDayDu: tenManDayDu,
    uocLuongBai: uocLuongBai,
    trangThaiVung: trangThaiVung,
    cupMo: cupMo,
    cauDauTruong: cauDauTruong,
    vungCuaNoiDung: vungCuaNoiDung,
    lapNhiemVu: lapNhiemVu,
    tenManNgan: tenManNgan,
    buocTiep: buocTiep
  };
})();
