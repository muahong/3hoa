/* ============================================================
   ngan-hang.js – Ngân hàng câu hỏi theo mã nội dung và mã kỹ năng
   - Mã nội dung, mã lỗi, công thức nhận biết lỗi lấy từ docs/du-an-toan-2-3/spec/03a-chuong-trinh-lop-2.md (mục 3.3).
   - Mỗi câu có mã câu ổn định "<mã nội dung>|<mã kỹ năng>|<đề chuẩn hóa>" dùng chung cho mọi game.
   - Mỗi đáp án nhiễu mang mã lỗi sinh ra nó (một số có thể khớp nhiều công thức: ghi đủ các mã).
   - Sinh đề theo hạt giống (mulberry32) để phát lại được một ván.
   Bốn loại câu (trường loai của kỹ năng):
   - phep_tinh: cộng, trừ, nhân, chia; cấu trúc { phep, so, an }
   - so: số liền trước, liền sau, cấu tạo số, đọc số; cấu trúc { loai: 'so', kieu, so, cach }
   - nhan_tong: phép nhân là tổng các số hạng bằng nhau; cấu trúc { loai: 'nhan_tong', chieu, a, b }
   - loi_van: bài toán có lời văn hai bước (chọn phép tính rồi tính); cấu trúc { loai: 'loi_van', mau, dang, phep, so, nv }
   Thêm ở mục 5 (cắm bằng dangKyLoai ngay trong tệp này): 'thanh_phan' (tên số hạng, tổng, thừa số, thương…, 2.14, 2.23) và
   'lien_he_nhan_chia' (từ 2 × 7 = 14 viết phép chia, 2.24).
   API: window.NganHang
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- Ngẫu nhiên có hạt giống ---------------- */

  function taoRng(hatGiong) {
    let a = (hatGiong >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function nn(rng, a, b) { return a + Math.floor(rng() * (b - a + 1)); }
  function chon(rng, ds) { return ds[Math.floor(rng() * ds.length)]; }
  function tron(rng, ds) {
    const a = ds.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function chonTheoTrongSo(rng, ds) {
    let tong = 0;
    ds.forEach(function (x) { tong += x.w; });
    let r = rng() * tong;
    for (let i = 0; i < ds.length; i++) { r -= ds[i].w; if (r < 0) return ds[i]; }
    return ds[ds.length - 1];
  }

  /* ---------------- Từ điển mã ---------------- */

  /** Đủ 43 nội dung cần đạt của lớp 2: 26 nội dung số và phép tính (03a), 14 hình học và đo lường (B2.x), 3 thống kê và xác suất (C2.x). */
  const NOI_DUNG = {
    '2.1': 'Ôn tập các số đến 100: đọc, viết, đếm, chục và đơn vị, tia số',
    '2.2': 'So sánh, xếp thứ tự các số đến 100',
    '2.3': 'Đơn vị, chục, trăm, nghìn và cấu tạo số đến 1000',
    '2.4': 'Đọc, viết các số đến 1000',
    '2.5': 'Số liền trước, số liền sau',
    '2.6': 'So sánh, xếp thứ tự các số đến 1000',
    '2.7': 'Ước lượng số đồ vật theo nhóm chục',
    '2.8': 'Bảng cộng qua 10 (có nhớ) trong phạm vi 20',
    '2.9': 'Bảng trừ qua 10 (có nhớ) trong phạm vi 20',
    '2.10': 'Cộng, trừ không nhớ trong phạm vi 100',
    '2.11': 'Cộng, trừ có nhớ trong phạm vi 100',
    '2.12': 'Cộng, trừ trong phạm vi 1000',
    '2.13': 'Tính nhẩm với số tròn chục, tròn trăm',
    '2.14': 'Gọi tên thành phần: số hạng, tổng, số bị trừ, số trừ, hiệu',
    '2.15': 'Tìm thành phần chưa biết của phép cộng, phép trừ',
    '2.16': 'Tính giá trị biểu thức có hai dấu cộng, trừ',
    '2.17': 'Nhiều hơn, ít hơn một số đơn vị',
    '2.18': 'Giải bài toán có lời văn bằng một phép tính',
    '2.19': 'Ý nghĩa phép nhân: tổng các số hạng bằng nhau',
    '2.20': 'Bảng nhân 2, bảng nhân 5',
    '2.21': 'Ý nghĩa phép chia: chia đều, chia theo nhóm',
    '2.22': 'Bảng chia 2, bảng chia 5',
    '2.23': 'Gọi tên thừa số, tích, số bị chia, số chia, thương',
    '2.24': 'Quan hệ giữa phép nhân và phép chia',
    // 2.25 có trong chương trình 2018 nhưng KHÔNG có trong SGK Toán 2 Kết nối tri thức (sách không dạy một phần hai,
    // một phần năm): giữ mã để đủ 43 nội dung của chương trình, chưa có kỹ năng, màn hay câu hỏi nào dùng mã này.
    '2.25': 'Một phần hai, một phần năm',
    '2.26': 'Giải bài toán bằng một phép nhân hoặc một phép chia',
    'B2.1': 'Điểm, đoạn thẳng, đường thẳng, đường cong, đường gấp khúc',
    'B2.2': 'Ba điểm thẳng hàng',
    'B2.3': 'Hình tứ giác',
    'B2.4': 'Khối trụ, khối cầu',
    'B2.5': 'Thực hành lắp ghép, xếp hình',
    'B2.6': 'Đơn vị đo độ dài cm, dm, m, km và quan hệ giữa chúng',
    'B2.7': 'Thực hành đo và ước lượng độ dài',
    'B2.8': 'Tính độ dài đường gấp khúc',
    'B2.9': 'Ki-lô-gam và cân đồ vật',
    'B2.10': 'Lít và đo dung tích',
    'B2.11': 'Xem đồng hồ: giờ đúng, giờ 15 phút, giờ 30 phút',
    'B2.12': 'Ngày và giờ, các buổi trong ngày, một ngày 24 giờ',
    'B2.13': 'Ngày, tháng, xem lịch',
    'B2.14': 'Tiền Việt Nam, đổi tiền, mua bán đơn giản',
    'C2.1': 'Thu thập, phân loại, kiểm đếm số liệu',
    'C2.2': 'Đọc và mô tả biểu đồ tranh',
    'C2.3': 'Chắc chắn, có thể, không thể'
  };

  const TIEN_QUYET = {
    '2.1': ['L1.3'],
    '2.3': ['2.1'],
    '2.4': ['2.3', '2.1'],
    '2.5': ['2.1', '2.4'],
    '2.8': ['L1.2', 'L1.4'],
    '2.9': ['2.8', 'L1.2'],
    '2.10': ['L1.5', '2.1'],
    '2.11': ['2.8', '2.9', '2.10'],
    '2.12': ['2.11', '2.3'],
    '2.13': ['L1.2', '2.3'],
    '2.15': ['2.14', '2.8', '2.9'],
    '2.16': ['2.10', '2.11'],
    '2.17': ['L1.4', '2.10'],
    '2.18': ['2.17', '2.11', '2.10'],
    '2.19': ['L1.4', '2.10', '2.1'],
    '2.20': ['2.19', '2.1'],
    '2.21': ['2.19', '2.20'],
    '2.22': ['2.20', '2.21'],
    '2.26': ['2.19', '2.21', '2.20', '2.22', '2.18'],
    '2.2': ['2.1', 'L1.6'],
    '2.6': ['2.3', '2.4', '2.2'],
    '2.7': ['2.1', '2.13'],
    '2.14': ['2.10'],
    '2.23': ['2.19', '2.21'],
    '2.24': ['2.20', '2.22'],
    '2.25': ['2.21'],
    'B2.2': ['B2.1'],
    'B2.3': ['B2.1'],
    'B2.7': ['B2.6'],
    'B2.8': ['B2.1', '2.10'],
    'B2.9': ['2.10'],
    'B2.10': ['2.10'],
    'B2.12': ['B2.11'],
    'B2.14': ['2.12', '2.13'],
    'C2.2': ['C2.1'],
    'C2.3': ['C2.1']
  };

  /** be: lời game nói với bé; mo_ta: giải nghĩa cho phụ huynh và LLM. */
  const LOI = {
    'quen-nho': { be: 'Con quên nhớ 1 rồi', mo_ta: 'Quên nhớ 1 sang hàng chục (hoặc hàng trăm) khi cộng có nhớ', ngan: 'Con hay quên nhớ 1' },
    'quen-muon': { be: 'Con quên mượn 1 rồi', mo_ta: 'Mượn 1 chục rồi quên bớt 1 ở hàng chục (quên trả) khi trừ có nhớ', ngan: 'Con hay quên mượn 1' },
    'tru-nguoc': { be: 'Con lấy số bé trừ số lớn ở hàng đơn vị rồi', mo_ta: 'Trừ ngược ở hàng có mượn: lấy chữ số bé trừ chữ số lớn thay vì mượn 1', ngan: 'Con hay trừ ngược' },
    'nham-dau': { be: 'Con nhầm dấu rồi', mo_ta: 'Làm phép tính ngược dấu: cộng thay trừ hoặc trừ thay cộng', ngan: 'Con hay nhầm dấu' },
    'dem-lech': { be: 'Con đếm lệch một chút rồi', mo_ta: 'Tính lệch 1 (hoặc lệch 1 chục) so với đáp án đúng', ngan: 'Con hay đếm lệch 1' },
    'bu-sai-chieu': { be: 'Trừ 10 là trừ thừa, phải thêm lại chứ không bớt tiếp', mo_ta: 'Trừ tròn 10 rồi bớt tiếp phần thừa thay vì thêm lại', ngan: 'Con hay bớt sai chiều' },
    'sai-hang': { be: 'Con đặt tính lệch hàng rồi', mo_ta: 'Đặt tính lệch hàng: chữ số đơn vị bị cộng hoặc trừ vào hàng chục', ngan: 'Con hay đặt lệch hàng' },
    'viet-ca-so-nho': { be: 'Con viết cả số xuống, không nhớ 1 sang hàng bên trái', mo_ta: 'Viết cả tổng của một hàng (ví dụ 13) xuống thay vì viết 3 nhớ 1', ngan: 'Con hay quên nhớ 1' },
    'thieu-0': { be: 'Thiếu một chữ số 0 rồi', mo_ta: 'Kết quả thiếu một chữ số 0: nhầm chục thành đơn vị', ngan: 'Con hay thiếu số 0' },
    'thua-0': { be: 'Thừa một chữ số 0 rồi', mo_ta: 'Kết quả thừa một chữ số 0', ngan: 'Con hay thừa số 0' },
    'nguoc-thanh-phan': { be: 'Tìm số còn thiếu thì làm phép ngược lại nhé', mo_ta: 'Tìm thành phần chưa biết bằng phép tính sai chiều (13 − 6 thành 13 + 6)', ngan: 'Con hay làm ngược phép' },
    'bo-buoc': { be: 'Bài này có hai bước, con mới làm bước một', mo_ta: 'Dừng sau phép tính thứ nhất của biểu thức hai dấu', ngan: 'Con hay quên bước hai' },
    'trai-sang-phai': { be: 'Có hai dấu thì tính lần lượt từ trái sang phải', mo_ta: 'Tính phép sau trước, không theo thứ tự từ trái sang phải', ngan: 'Nhớ tính từ trái sang phải' },
    'o-ben-canh': { be: 'Con nhầm sang ô bên cạnh trong bảng rồi', mo_ta: 'Nhầm sang ô bên cạnh trong bảng nhân, bảng chia (đếm thêm thừa hoặc thiếu một lần)', ngan: 'Con hay nhầm ô bên cạnh' },
    'cong-thay-nhan': { be: 'Đây là phép nhân chứ không phải phép cộng nhé', mo_ta: 'Cộng hai số thay vì nhân (2 × 4 ra 6)', ngan: 'Con hay cộng thay nhân' },
    'tru-thay-chia': { be: 'Đây là phép chia chứ không phải phép trừ nhé', mo_ta: 'Trừ hai số thay vì chia (6 : 2 ra 4)', ngan: 'Con hay trừ thay chia' },
    'nhan-thay-chia': { be: 'Đây là phép chia, kết quả phải bé hơn số bị chia', mo_ta: 'Nhân hai số thay vì chia (6 : 2 ra 12)', ngan: 'Con hay nhân thay chia' },
    'nham-bang': { be: 'Con nhầm sang bảng khác rồi', mo_ta: 'Nhầm bảng 2 với bảng 5', ngan: 'Con hay nhầm bảng 2 với bảng 5' },
    'dao-thu-tu': { be: 'Số được lấy viết trước, số lần lấy viết sau', mo_ta: 'Đảo thứ tự hai thừa số, hoặc số bị chia với số chia (chưa quen thứ tự viết, không tính là sai toán)', ngan: 'Con chưa quen thứ tự viết' },
    'dem-nhom': { be: 'Con đếm lại số nhóm nhé', mo_ta: 'Đếm sai số nhóm hoặc số phần tử trong mỗi nhóm', ngan: 'Con hay đếm sai số nhóm' },
    'sai-phep': { be: 'Bài này phải làm phép tính khác', mo_ta: 'Chọn sai phép tính trong bài toán có lời văn (bé biết tính nhưng chưa hiểu đề)', ngan: 'Con hay chọn sai phép tính' },
    'doc-so': { be: 'Con xem lại cách đọc số nhé', mo_ta: 'Đọc, viết số sai: bỏ chữ số 0, đảo chữ số, viết theo từng từ nghe được', ngan: 'Con hay đọc, viết số sai' },
    'nham-truoc-sau': { be: 'Số liền sau hơn 1, số liền trước kém 1', mo_ta: 'Nhầm số liền trước với số liền sau', ngan: 'Con hay nhầm liền trước, liền sau' },
    'qua-chuc': { be: 'Qua 9 là sang chục mới', mo_ta: 'Sai khi đếm qua chục: liền sau 39 nói 30 hay 310, liền trước 40 nói 30', ngan: 'Con hay vấp khi qua chục' },
    'so-chu-so': { be: 'So hàng lớn nhất trước: số nào nhiều chữ số hơn thì lớn hơn', mo_ta: 'So sánh sai vì nhìn hàng đơn vị trước hoặc không đếm số chữ số (29 > 31, 99 > 100, 305 > 350)', ngan: 'Con hay so hàng đơn vị trước' },
    'chieu-dau': { be: 'Dấu mở miệng về phía số lớn hơn', mo_ta: 'Biết số nào lớn hơn nhưng điền dấu ngược, hoặc xếp đúng dãy nhưng ngược chiều yêu cầu', ngan: 'Con hay đặt dấu ngược chiều' },
    'ten-thanh-phan': { be: 'Con xem lại tên các thành phần nhé', mo_ta: 'Gọi nhầm tên thành phần: số bị trừ với số trừ, tổng với hiệu, tích với thương', ngan: 'Con hay nhầm tên thành phần' },
    'phan-khong-bang-nhau': { be: 'Một phần hai là chia thành hai phần bằng nhau', mo_ta: 'Chọn hình chia thành các phần không bằng nhau, hoặc nhầm một phần hai với một phần năm', ngan: 'Con hay nhầm phần bằng nhau' },
    'tach-10-sai': { be: 'Tách để được 10 rồi mới tính tiếp phần còn lại nhé', mo_ta: 'Tách số theo cách SGK Bài 7, 11 nhưng tính nhầm phần còn lại: 8 + 5 (tách 5 = 2 + 3) ra 12 hay 15; 13 − 5 (tách 13 = 10 + 3, 10 − 5 = 5) ra 5 vì quên cộng 3, hay 2 vì trừ 3', ngan: 'Con hay tách 10 sai' },
    'be-tru-lon': { be: 'Phép trừ lấy số lớn trừ số bé', mo_ta: 'Chọn phép trừ lấy số bé trừ số lớn (viết theo thứ tự các số trong đề) ở bài toán có lời văn', ngan: 'Con hay lấy số bé trừ số lớn' },
    'lien-he-nhan-chia': { be: 'Tích chia cho thừa số này thì được thừa số kia', mo_ta: 'Viết phép chia từ phép nhân mà nhầm vai các số: từ 2 × 7 = 14 viết 14 : 7 = 7 hay 14 : 7 = 14', ngan: 'Con hay nhầm khi viết phép chia từ phép nhân' },
    'khac': { be: 'Chưa đúng rồi', mo_ta: 'Không khớp lỗi nào đã biết', ngan: 'Luyện thêm cho chắc' }
  };

  /**
   * giay: thời gian gợi ý cho một câu ở dạng chọn đáp án (chỉnh theo từng bé trong ván).
   * gioi_han: phạm vi số của đáp án; nhieu_toi_da: số lớn nhất được dùng làm đáp án nhiễu (mặc định bằng gioi_han).
   * bai_hoc: mã bài học 30 giây hiện trước lần đầu gặp kỹ năng.
   */
  const KY_NANG = {
    'cong-qua-10': { noi_dung: '2.8', ten: 'Cộng qua 10 trong phạm vi 20', kieu: 'K1', giay: 7, gioi_han: 20, bai_hoc: 'tach-10' },
    'tru-qua-10': { noi_dung: '2.9', ten: 'Trừ qua 10 trong phạm vi 20', kieu: 'K1', giay: 8, gioi_han: 20, bai_hoc: 'tach-10' },
    'tim-so-thieu-20': { noi_dung: '2.15', ten: 'Tìm số còn thiếu trong phạm vi 20', kieu: 'K2', giay: 10, gioi_han: 20 },
    'cong-tru-khong-nho-100': { noi_dung: '2.10', ten: 'Cộng, trừ không nhớ trong phạm vi 100', kieu: 'K2', giay: 9, gioi_han: 100 },
    'cong-nho-2cs-1cs': { noi_dung: '2.11', ten: 'Cộng có nhớ: số có hai chữ số với số có một chữ số', kieu: 'K2', giay: 10, gioi_han: 100, bai_hoc: 'dat-tinh-co-nho' },
    'cong-nho-2cs-2cs': { noi_dung: '2.11', ten: 'Cộng có nhớ: số có hai chữ số với số có hai chữ số', kieu: 'K2', giay: 13, gioi_han: 100, bai_hoc: 'dat-tinh-co-nho' },
    'tru-nho-2cs-1cs': { noi_dung: '2.11', ten: 'Trừ có nhớ: số có hai chữ số cho số có một chữ số', kieu: 'K2', giay: 11, gioi_han: 100, bai_hoc: 'dat-tinh-co-nho' },
    'tru-nho-2cs-2cs': { noi_dung: '2.11', ten: 'Trừ có nhớ: số có hai chữ số cho số có hai chữ số', kieu: 'K2', giay: 14, gioi_han: 100, bai_hoc: 'dat-tinh-co-nho' },
    'nham-tron-chuc': { noi_dung: '2.13', ten: 'Nhẩm với số tròn chục', kieu: 'K1', giay: 7, gioi_han: 100 },
    'bieu-thuc-2-dau': { noi_dung: '2.16', ten: 'Biểu thức có hai dấu cộng, trừ', kieu: 'K2', giay: 18, gioi_han: 100 },
    // Giai đoạn 2
    'cau-tao-so-100': { noi_dung: '2.1', ten: 'Chục và đơn vị: đọc, viết số đến 100', kieu: 'K3', giay: 12, gioi_han: 100, nhieu_toi_da: 999, loai: 'so', bai_hoc: 'chuc-don-vi' },
    'lien-truoc-sau-100': { noi_dung: '2.5', ten: 'Số liền trước, số liền sau trong phạm vi 100', kieu: 'K1', giay: 6, gioi_han: 100, nhieu_toi_da: 999, loai: 'so' },
    'toan-hon-kem': { noi_dung: '2.17', ten: 'Bài toán hơn, kém nhau bao nhiêu', kieu: 'K4', giay: 30, gioi_han: 100, loai: 'loi_van', bai_hoc: 'giai-toan' },
    'toan-them-bot': { noi_dung: '2.18', ten: 'Bài toán thêm, bớt một số đơn vị', kieu: 'K4', giay: 30, gioi_han: 20, loai: 'loi_van', bai_hoc: 'giai-toan' },
    'toan-nhieu-it': { noi_dung: '2.17', ten: 'Bài toán nhiều hơn, ít hơn một số đơn vị', kieu: 'K4', giay: 30, gioi_han: 20, loai: 'loi_van', bai_hoc: 'giai-toan' },
    'toan-loi-van-100': { noi_dung: '2.18', ten: 'Bài toán có lời văn, cộng trừ có nhớ trong phạm vi 100', kieu: 'K4', giay: 40, gioi_han: 100, loai: 'loi_van', bai_hoc: 'giai-toan' },
    'nhan-y-nghia': { noi_dung: '2.19', ten: 'Phép nhân: tổng các số hạng bằng nhau', kieu: 'K3', giay: 10, gioi_han: 100, loai: 'nhan_tong', bai_hoc: 'phep-nhan' },
    'bang-nhan-2-5': { noi_dung: '2.20', ten: 'Bảng nhân 2, bảng nhân 5', kieu: 'K1', giay: 6, gioi_han: 60, bai_hoc: 'phep-nhan' },
    'chia-y-nghia': { noi_dung: '2.21', ten: 'Phép chia: chia đều, chia theo nhóm', kieu: 'K3', giay: 30, gioi_han: 100, loai: 'loi_van', bai_hoc: 'phep-chia' },
    'bang-chia-2-5': { noi_dung: '2.22', ten: 'Bảng chia 2, bảng chia 5', kieu: 'K1', giay: 6, gioi_han: 100, bai_hoc: 'phep-chia' },
    'toan-nhan-chia': { noi_dung: '2.26', ten: 'Bài toán bằng một phép nhân hoặc một phép chia', kieu: 'K4', giay: 40, gioi_han: 100, loai: 'loi_van', bai_hoc: 'phep-chia' },
    'cau-tao-so-1000': { noi_dung: '2.3', ten: 'Trăm, chục, đơn vị: cấu tạo số đến 1000', kieu: 'K3', giay: 15, gioi_han: 1000, nhieu_toi_da: 99999, loai: 'so', bai_hoc: 'tram-chuc-don-vi' },
    'doc-so-1000': { noi_dung: '2.4', ten: 'Đọc, viết số có ba chữ số', kieu: 'K3', giay: 12, gioi_han: 1000, nhieu_toi_da: 99999, loai: 'so', bai_hoc: 'tram-chuc-don-vi' },
    'cong-tru-1000': { noi_dung: '2.12', ten: 'Cộng, trừ trong phạm vi 1000 (nhớ không quá một lượt)', kieu: 'K2', giay: 18, gioi_han: 1000, bai_hoc: 'cong-tru-1000' },
    // Giai đoạn 5 (Cưỡi Hổ, vùng 8)
    'lien-truoc-sau-1000': { noi_dung: '2.5', ten: 'Số liền trước, số liền sau trong phạm vi 1000', kieu: 'K1', giay: 7, gioi_han: 1000, nhieu_toi_da: 9999, loai: 'so' },
    // Giai đoạn 4: bài toán có lời văn với đơn vị đo (Truyện Tranh vùng 3) và với tiền (vùng 9)
    'toan-kg-lit': { noi_dung: '2.18', ten: 'Bài toán có lời văn với ki-lô-gam, lít', kieu: 'K4', giay: 30, gioi_han: 100, loai: 'loi_van', bai_hoc: 'giai-toan' },
    'toan-tien': { noi_dung: 'B2.14', ten: 'Bài toán mua bán với tiền Việt Nam', kieu: 'K4', giay: 35, gioi_han: 1000, loai: 'loi_van', bai_hoc: 'giai-toan' },
    // Nhóm D của lần rà soát 2026-09-28: bài toán có lời văn trong phạm vi 1000 (SGK Bài 59 đến 63, 70), Truyện Tranh vùng 8
    'toan-loi-van-1000': { noi_dung: '2.18', ten: 'Bài toán có lời văn trong phạm vi 1000', kieu: 'K4', giay: 45, gioi_han: 1000, loai: 'loi_van', bai_hoc: 'giai-toan' }
    // Tên thành phần (2.14, 2.23) và quan hệ nhân, chia (2.24): thêm ở mục 5 bằng themKyNang
  };
  const THU_TU_KY_NANG = Object.keys(KY_NANG);
  function loaiKyNang(kn) { return (KY_NANG[kn] && KY_NANG[kn].loai) || 'phep_tinh'; }

  /* ---------------- Tiện ích số ---------------- */

  const dv = function (n) { return n % 10; };
  const chuc = function (n) { return Math.floor(n / 10) % 10; };
  const tram = function (n) { return Math.floor(n / 100) % 10; };
  const TRU = '−', NHAN = '×', CHIA = ':';

  function tinhPhep(a, p, b) {
    if (p === '+') return a + b;
    if (p === '×' || p === 'x') return a * b;
    if (p === ':') return a / b;
    return a - b;
  }

  function kyHieu(p, chuanHoa) {
    if (p === '+') return '+';
    if (p === '×' || p === 'x') return chuanHoa ? 'x' : NHAN;
    if (p === ':') return CHIA;
    return chuanHoa ? '-' : TRU;
  }
  function tuPhep(p) { return p === '+' ? 'cộng' : p === '×' || p === 'x' ? 'nhân' : p === ':' ? 'chia' : 'trừ'; }

  /** Hiện một giá trị cho bé đọc: số giữ nguyên, biểu thức chuẩn hóa ("2x3") thành "2 × 3". */
  function hienGiaTri(v) {
    if (typeof v === 'number') return String(v);
    return String(v == null ? '' : v).replace(/\s+/g, '').replace(/x/g, ' × ').replace(/\+/g, ' + ').replace(/:/g, ' : ').replace(/-/g, ' ' + TRU + ' ');
  }

  /* ---------------- Đọc số bằng chữ (theo SGK: linh, mười, mốt, tư, lăm) ---------------- */

  const CHU_SO = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  function docHaiSo(c, u, coTram) {
    if (c === 0) {
      if (u === 0) return '';
      if (coTram) return 'linh ' + (u === 4 ? 'tư' : CHU_SO[u]);
      return CHU_SO[u];
    }
    const s = c === 1 ? 'mười' : CHU_SO[c] + ' mươi';
    if (u === 0) return s;
    if (u === 1) return s + (c === 1 ? ' một' : ' mốt');
    if (u === 4) return s + (c === 1 ? ' bốn' : ' tư');
    if (u === 5) return s + ' lăm';
    return s + ' ' + CHU_SO[u];
  }
  /** Đọc số từ 0 đến 1000: 205 → "hai trăm linh năm", 304 → "ba trăm linh tư", 24 → "hai mươi tư". */
  function docSo(n) {
    n = Math.round(Number(n));
    if (n === 1000) return 'một nghìn';
    if (n === 0) return 'không';
    const t = tram(n), c = chuc(n), u = dv(n);
    const sau = docHaiSo(c, u, t > 0);
    if (t === 0) return sau;
    return CHU_SO[t] + ' trăm' + (sau ? ' ' + sau : '');
  }

  /* ============================================================
     1. Phép tính: cộng, trừ (giai đoạn 1), nhân, chia và cộng trừ trong phạm vi 1000
     ============================================================ */

  function tinhPT(ct) {
    if (Array.isArray(ct.phep)) return tinhPhep(tinhPhep(ct.so[0], ct.phep[0], ct.so[1]), ct.phep[1], ct.so[2]);
    if (ct.an === 'ket_qua') return tinhPhep(ct.so[0], ct.phep, ct.so[1]);
    const a = ct.so[0], b = ct.so[1], c = ct.kq;
    if (ct.phep === '+') return ct.an === 'so_hang_1' ? c - b : c - a;
    return ct.an === 'so_bi_tru' ? c + b : a - c;
  }

  function dePT(ct) {
    if (Array.isArray(ct.phep)) return ct.so[0] + ' ' + kyHieu(ct.phep[0]) + ' ' + ct.so[1] + ' ' + kyHieu(ct.phep[1]) + ' ' + ct.so[2] + ' = ?';
    if (ct.an === 'ket_qua') return ct.so[0] + ' ' + kyHieu(ct.phep) + ' ' + ct.so[1] + ' = ?';
    const x = ct.an === 'so_hang_1' || ct.an === 'so_bi_tru' ? ['?', ct.so[1]] : [ct.so[0], '?'];
    return x[0] + ' ' + kyHieu(ct.phep) + ' ' + x[1] + ' = ' + ct.kq;
  }

  function deChuanHoaPT(ct) {
    if (Array.isArray(ct.phep)) return ct.so[0] + kyHieu(ct.phep[0], true) + ct.so[1] + kyHieu(ct.phep[1], true) + ct.so[2];
    if (ct.an === 'ket_qua') return ct.so[0] + kyHieu(ct.phep, true) + ct.so[1];
    const x = ct.an === 'so_hang_1' || ct.an === 'so_bi_tru' ? ['?', ct.so[1]] : [ct.so[0], '?'];
    return x[0] + kyHieu(ct.phep, true) + x[1] + '=' + ct.kq;
  }

  function deDocPT(ct) {
    if (Array.isArray(ct.phep)) return ct.so[0] + ' ' + tuPhep(ct.phep[0]) + ' ' + ct.so[1] + ' ' + tuPhep(ct.phep[1]) + ' ' + ct.so[2] + ' bằng mấy?';
    if (ct.an === 'ket_qua') return ct.so[0] + ' ' + tuPhep(ct.phep) + ' ' + ct.so[1] + ' bằng mấy?';
    if (ct.an === 'so_hang_1' || ct.an === 'so_bi_tru') return 'Số nào ' + tuPhep(ct.phep) + ' ' + ct.so[1] + ' bằng ' + ct.kq + '?';
    return ct.so[0] + ' ' + tuPhep(ct.phep) + ' mấy bằng ' + ct.kq + '?';
  }

  /** Lỗi của phép nhân, phép chia trong bảng 2, 5 (03a mục 2.20, 2.22). */
  function loiNhanChia(ct, v, d, them) {
    const a = ct.so[0], b = ct.so[1];
    if (ct.phep === '×') {
      if (v === a * (b + 1) || v === a * (b - 1) || v === (a + 1) * b || v === (a - 1) * b) them('o-ben-canh');
      if (v === a + b) them('cong-thay-nhan');
      if ((a === 2 && v === 5 * b) || (a === 5 && v === 2 * b) || (b === 2 && v === 5 * a) || (b === 5 && v === 2 * a)) them('nham-bang');
    } else {
      if (v === a - b) them('tru-thay-chia');
      if (v === d + 1 || v === d - 1) them('o-ben-canh');
      if (v === a * b) them('nhan-thay-chia');
      if ((b === 5 && a % 2 === 0 && v === a / 2) || (b === 2 && a % 5 === 0 && v === a / 5)) them('nham-bang');
    }
    if (d > 0 && d % 10 === 0 && v * 10 === d) them('thieu-0');
    if (d > 0 && v === d * 10) them('thua-0');
  }

  /** Trả về danh sách mã lỗi khớp với đáp án sai v (rỗng nếu v đúng, ['khac'] nếu không khớp công thức nào). */
  function nhanBietLoiPT(ct, v) {
    v = Number(v);
    const d = tinhPT(ct);
    if (v === d) return [];
    const ma = [];
    const them = function (m) { if (ma.indexOf(m) < 0) ma.push(m); };
    if (Array.isArray(ct.phep)) {
      const a = ct.so[0], b = ct.so[1], c = ct.so[2];
      const r1 = tinhPhep(a, ct.phep[0], b);
      const phai = tinhPhep(a, ct.phep[0], tinhPhep(b, ct.phep[1], c));
      if (v === r1) them('bo-buoc');
      if (phai !== d && v === phai) them('trai-sang-phai');
      const coNho = function (x, p, y) { return p === '+' ? dv(x) + dv(y) >= 10 : dv(x) < dv(y); };
      if ((coNho(a, ct.phep[0], b) && ct.phep[0] === '+') || (coNho(r1, ct.phep[1], c) && ct.phep[1] === '+')) { if (v === d - 10) them('quen-nho'); }
      if ((coNho(a, ct.phep[0], b) && ct.phep[0] === '-') || (coNho(r1, ct.phep[1], c) && ct.phep[1] === '-')) { if (v === d + 10) them('quen-muon'); }
      if (v === d + 1 || v === d - 1) them('dem-lech');
    } else if (ct.an !== 'ket_qua') {
      const a = ct.so[0], b = ct.so[1], c = ct.kq;
      let nguoc = null;
      if (ct.phep === '+') nguoc = c + (ct.an === 'so_hang_1' ? b : a);
      else nguoc = ct.an === 'so_bi_tru' ? c - b : a + c;
      if (v === nguoc) them('nguoc-thanh-phan');
      if (v === d + 1 || v === d - 1) them('dem-lech');
    } else if (ct.phep === '×' || ct.phep === ':') {
      loiNhanChia(ct, v, d, them);
    } else if (ct.so[0] > 100 || ct.so[1] > 100) {
      loiBaChuSo(ct, v, d, them);
    } else {
      const a = ct.so[0], b = ct.so[1];
      const ua = dv(a), ub = dv(b), ta = chuc(a), tb = chuc(b);
      const haiChuSo = a >= 10 || b >= 10;
      const tronChuc = a % 10 === 0 && b % 10 === 0;
      if (tronChuc && d > 0) {
        if (v * 10 === d) them('thieu-0');
        if (v === d * 10) them('thua-0');
      }
      if (ct.phep === '+') {
        const nho = ua + ub >= 10;
        // Hai số có một chữ số: SGK Bài 7 dạy tách để được 10 (8 + 5: tách 5 = 2 + 3, 8 + 2 = 10, 10 + 3 = 13), gọi lỗi theo cách đó
        if (!haiChuSo && nho) {
          const lon = Math.max(a, b), can = 10 - lon;
          if (v === 10 + can || v === 10 + Math.min(a, b) || v === d - 10 || v === 10) them('tach-10-sai');
        }
        if (nho && v === d - 10) them('quen-nho');
        if (nho && haiChuSo && v === Number(String(ta + tb) + String(ua + ub))) them('viet-ca-so-nho');
        if (v === Math.abs(a - b)) them('nham-dau');
        if (a >= 10 && b < 10 && v === a + 10 * b) them('sai-hang');
        if (b >= 10 && a < 10 && v === b + 10 * a) them('sai-hang');
        if (a >= 10 && b >= 10 && b % 10 === 0 && a % 10 !== 0 && v === a + b / 10) them('sai-hang');
        if (a >= 10 && b >= 10 && a % 10 === 0 && b % 10 !== 0 && v === b + a / 10) them('sai-hang');
        if (a >= 10 && b >= 10 && !nho && ua !== tb && v === (ta + ub) * 10 + (ua + tb)) them('sai-hang');
        if (v === d + 1 || v === d - 1) them('dem-lech');
        if (!haiChuSo && (v === 2 * a || v === 2 * b)) them('dem-lech');
        if (haiChuSo && (v === d + 10 || (v === d - 10 && !nho))) them('dem-lech');
      } else {
        const muon = ua < ub;
        // Trừ qua 10 theo SGK Bài 11: 13 − 5, tách 13 = 10 + 3, 10 − 5 = 5, 5 + 3 = 8; quên cộng 3 ra 5, trừ 3 ra 2
        if (muon && a < 20 && b < 10 && (v === 10 - b || v === 10 - b - ua || v === 10)) them('tach-10-sai');
        if (muon && v === d + 10) them('quen-muon');
        if (muon && a < 20 && b < 10 && v === 10 - b) them('quen-muon');
        if (muon && v === (ta - tb) * 10 + (ub - ua)) them('tru-nguoc');
        if (muon && a >= 10 && b < 10 && v === d - 2 * (10 - b)) them('bu-sai-chieu');
        if (v === a + b) them('nham-dau');
        if (a >= 10 && b < 10 && a - 10 * b >= 0 && v === a - 10 * b) them('sai-hang');
        if (a >= 10 && b >= 10 && b % 10 === 0 && a % 10 !== 0 && v === a - b / 10) them('sai-hang');
        if (v === d + 1 || v === d - 1) them('dem-lech');
        if (haiChuSo && (v === d - 10 || (v === d + 10 && !muon))) them('dem-lech');
      }
    }
    if (!ma.length) ma.push('khac');
    return ma;
  }

  /** Nhớ, mượn trong phép cộng, trừ số có ba chữ số (nhớ không quá một lượt, 03a mục 2.12). */
  function nhoBaChuSo(a, p, b) {
    if (p === '+') {
      const nhoDv = dv(a) + dv(b) >= 10;
      const nhoChuc = chuc(a) + chuc(b) + (nhoDv ? 1 : 0) >= 10;
      return { dv: nhoDv, chuc: nhoChuc };
    }
    const muonDv = dv(a) < dv(b);
    const muonChuc = chuc(a) - (muonDv ? 1 : 0) < chuc(b);
    return { dv: muonDv, chuc: muonChuc };
  }

  function loiBaChuSo(ct, v, d, them) {
    const a = ct.so[0], b = ct.so[1];
    const ha = tram(a), hb = tram(b), ta = chuc(a), tb = chuc(b), ua = dv(a), ub = dv(b);
    const n = nhoBaChuSo(a, ct.phep, b);
    if (ct.phep === '+') {
      if (n.dv && v === d - 10) them('quen-nho');
      if (n.chuc && v === d - 100) them('quen-nho');
      if ((n.dv || n.chuc) && v === Number(String(ha + hb) + String(ta + tb) + String(ua + ub))) them('viet-ca-so-nho');
      if (v === Math.abs(a - b)) them('nham-dau');
      if (a >= 100 && b >= 10 && b < 100 && v === a + 10 * b) them('sai-hang');
      if (b >= 100 && a >= 10 && a < 100 && v === b + 10 * a) them('sai-hang');
      if (v === d + 1 || v === d - 1) them('dem-lech');
      if (v === d + 10 || (v === d - 10 && !n.dv) || v === d + 100 || (v === d - 100 && !n.chuc)) them('dem-lech');
    } else {
      if (n.dv && v === d + 10) them('quen-muon');
      if (n.chuc && v === d + 100) them('quen-muon');
      if (n.dv && v === (ha - hb) * 100 + (ta - tb) * 10 + (ub - ua)) them('tru-nguoc');
      if (n.chuc && !n.dv && v === (ha - hb) * 100 + (tb - ta) * 10 + (ua - ub)) them('tru-nguoc');
      if (v === a + b) them('nham-dau');
      if (a >= 100 && b >= 10 && b < 100 && a - 10 * b >= 0 && v === a - 10 * b) them('sai-hang');
      if (v === d + 1 || v === d - 1) them('dem-lech');
      if (v === d - 10 || (v === d + 10 && !n.dv) || v === d - 100 || (v === d + 100 && !n.chuc)) them('dem-lech');
    }
  }

  /** Câu game nói với bé khi bé chọn v (dùng tên lỗi đầu tiên). */
  function loiNoiPT(ct, v, maLoi) {
    const m = (maLoi && maLoi[0]) || 'khac';
    const d = tinhPT(ct);
    if (m === 'nham-dau') return ct.phep === '+' ? 'Đây là phép cộng nhé' : 'Đây là phép trừ nhé';
    if (m === 'dem-lech') return Number(v) < d ? 'Con đếm thiếu một chút rồi' : 'Con đếm thừa một chút rồi';
    if (m === 'viet-ca-so-nho' && ct.an === 'ket_qua' && ct.so[0] <= 100 && ct.so[1] <= 100) return 'Con viết cả ' + (dv(ct.so[0]) + dv(ct.so[1])) + ' xuống, quên nhớ 1 sang hàng chục';
    if (m === 'nguoc-thanh-phan') {
      // Lớp 2 chưa học quy tắc tìm thành phần (lớp 3): nói bằng câu hỏi "mấy cộng mấy" như SGK Bài 14
      if (ct.an === 'so_hang_1') return 'Số cần tìm cộng ' + ct.so[1] + ' phải bằng ' + ct.kq;
      if (ct.an === 'so_hang_2') return ct.so[0] + ' cộng số cần tìm phải bằng ' + ct.kq;
      if (ct.an === 'so_bi_tru') return 'Số cần tìm bớt đi ' + ct.so[1] + ' phải còn ' + ct.kq;
      return ct.so[0] + ' bớt đi số cần tìm phải còn ' + ct.kq;
    }
    if (m === 'tach-10-sai' && ct.an === 'ket_qua' && !Array.isArray(ct.phep)) {
      const a = ct.so[0], b = ct.so[1];
      if (ct.phep === '+' && a < 10 && b < 10) {
        const lon = Math.max(a, b), be = Math.min(a, b), can = 10 - lon;
        return 'Tách ' + be + ' = ' + can + ' + ' + (be - can) + ', ' + lon + ' + ' + can + ' = 10 rồi cộng tiếp ' + (be - can);
      }
      if (ct.phep === '-' && a < 20 && b < 10) return 'Tách ' + a + ' = 10 + ' + dv(a) + ', 10 ' + TRU + ' ' + b + ' = ' + (10 - b) + ' rồi cộng thêm ' + dv(a);
    }
    if (m === 'nham-bang') {
      const bang = ct.phep === '×' ? (ct.so[0] === 2 || ct.so[0] === 5 ? ct.so[0] : ct.so[1]) : ct.so[1];
      return 'Đây là bảng ' + (ct.phep === ':' ? 'chia ' : 'nhân ') + bang + ', không phải bảng ' + (ct.phep === ':' ? 'chia ' : 'nhân ') + (bang === 2 ? 5 : 2);
    }
    if (m === 'o-ben-canh') return ct.phep === '×' ? 'Con đếm thêm thừa hoặc thiếu một lần rồi' : 'Con nhầm sang dòng bên cạnh trong bảng chia rồi';
    return (LOI[m] || LOI.khac).be;
  }

  const CAP_CONG_QUA_10 = [];
  for (let a = 2; a <= 9; a++) for (let b = 2; b <= 9; b++) if (a + b >= 11) CAP_CONG_QUA_10.push([a, b]);
  const CAP_TRU_QUA_10 = [];
  for (let a = 11; a <= 18; a++) for (let b = 2; b <= 9; b++) if (a - b <= 9) CAP_TRU_QUA_10.push([a, b]);

  /**
   * Độ khó theo mức thành thạo (nhóm D của lần rà soát 2026-09-28): lapDanhSach gửi mức của kỹ năng trong muc.muc_thanh_thao.
   * Chưa học, làm quen: ưu tiên cặp số dễ; đã thuộc, vững chắc: ưu tiên cặp số khó (vẫn giữ khoảng một phần tư câu thường);
   * đang luyện hay không rõ mức: sinh như cũ và không gọi thêm rng, nên cùng hạt giống vẫn ra đúng danh sách câu như trước.
   */
  const MUC_DE = { chua_hoc: 1, lam_quen: 1 };
  const MUC_KHO = { da_thuoc: 1, vung_chac: 1 };
  function theoDoKho(rng, muc, sinh, de, kho) {
    const m = muc && muc.muc_thanh_thao;
    const loc = MUC_DE[m] ? de : MUC_KHO[m] ? kho : null;
    if (!loc) return sinh();
    if (rng() < 0.25) return sinh();
    let ct = sinh();
    for (let i = 0; i < 15 && !loc(ct.so[0], ct.so[1], ct); i++) ct = sinh();
    return ct;
  }
  /** Cặp số dễ, khó của từng kỹ năng cộng, trừ chính (a, b là hai số của phép tính). */
  const DO_KHO = {
    // 9 + 5, 8 + 4 dễ tách để được 10; 6 + 7, 5 + 8 khó hơn
    'cong-qua-10': { de: function (a, b) { return Math.max(a, b) === 9 || a + b <= 12; }, kho: function (a, b) { return Math.min(a, b) >= 5 && Math.max(a, b) <= 8; } },
    // 12 − 5, 15 − 9 dễ; 16 − 7, 14 − 6 khó hơn
    'tru-qua-10': { de: function (a, b) { return b === 9 || a <= 12; }, kho: function (a, b) { return a >= 14 && b >= 6 && b <= 8; } },
    'cong-nho-2cs-1cs': { de: function (a, b) { return dv(a) + b <= 12 && a < 50; }, kho: function (a, b) { return dv(a) + b >= 14; } },
    'cong-nho-2cs-2cs': { de: function (a, b) { return dv(a) + dv(b) <= 12 && a + b <= 70; }, kho: function (a, b) { return dv(a) + dv(b) >= 14 || a + b >= 90; } },
    'tru-nho-2cs-1cs': { de: function (a, b) { return b - dv(a) <= 3 && a <= 50; }, kho: function (a, b) { return b - dv(a) >= 5; } },
    'tru-nho-2cs-2cs': { de: function (a, b) { return a !== 100 && dv(b) - dv(a) <= 3 && a <= 60; }, kho: function (a, b) { return a === 100 || dv(b) - dv(a) >= 5; } },
    // Không nhớ là dễ, có nhớ (một lượt) là khó
    'cong-tru-1000': {
      de: function (a, b, ct) { const n = nhoBaChuSo(a, ct.phep, b); return !n.dv && !n.chuc; },
      kho: function (a, b, ct) { const n = nhoBaChuSo(a, ct.phep, b); return n.dv || n.chuc; }
    }
  };
  /** Bọc bộ sinh của một kỹ năng cộng, trừ chính bằng độ khó theo mức thành thạo. */
  function coDoKho(kn, sinh) {
    return function (rng, muc) { return theoDoKho(rng, muc, function () { return sinh(rng, muc); }, DO_KHO[kn].de, DO_KHO[kn].kho); };
  }

  /**
   * Dạng SGK Bài 10, 14: so sánh biểu thức với một số (9 + 5 ? 13, đáp án '<' '>' '='), dựng khi mục câu của màn có
   * cach 'so_sanh'; loại 'so_sanh' ở cau-so-sanh.js (chưa nạp thì hỏi phép tính như thường). Ba dấu đều nhau.
   */
  function coSoSanh(sinh) {
    return function (rng, muc) {
      const ct = sinh(rng, muc);
      if (!(muc && muc.cach && muc.cach.indexOf('so_sanh') >= 0 && LOAI_RIENG.so_sanh)) return ct;
      if (muc.cach.length > 1 && chonCach(rng, muc, []) !== 'so_sanh') return ct;
      const gt = tinhPhep(ct.so[0], ct.phep, ct.so[1]);
      const dich = chon(rng, ['<', '>', '=']);
      let b = dich === '=' ? gt : dich === '>' ? gt - nn(rng, 1, 3) : gt + nn(rng, 1, 3);
      if (b < 0) b = gt + 1;
      if (b > 20) b = gt - 1;
      return { loai: 'so_sanh', kieu: 'dau_bt', phep: ct.phep, so: [ct.so[0], ct.so[1]], b: b };
    };
  }

  /** Cộng, trừ trong 1000, nhớ không quá một lượt; nhom 0: không nhớ, 1: nhớ ở hàng đơn vị, 2: nhớ ở hàng chục. */
  function capCongTru1000(rng, cong, nhom, haiCs) {
    for (let thu = 0; ; thu++) {
      const a = nn(rng, 110, 899), b = haiCs ? nn(rng, 12, 98) : nn(rng, 110, 899);
      if (cong) {
        if (a + b > 999) continue;
        const n = nhoBaChuSo(a, '+', b);
        if (n.dv && n.chuc) continue;
        if ((n.dv ? 1 : n.chuc ? 2 : 0) !== nhom && thu < 400) continue;
        return { phep: '+', so: [a, b], an: 'ket_qua' };
      }
      if (b >= a || a - b < 10) continue;
      const m = nhoBaChuSo(a, '-', b);
      if (m.dv && m.chuc) continue;
      if (m.chuc && tram(a) - tram(b) - 1 < 0) continue;
      if ((m.dv ? 1 : m.chuc ? 2 : 0) !== nhom && thu < 400) continue;
      return { phep: '-', so: [a, b], an: 'ket_qua' };
    }
  }
  /** Hai số (x, y theo thứ tự phép tính) hợp với cộng, trừ trong 1000 của SGK: tổng không quá 999, nhớ không quá một lượt. */
  function hopLe1000(x, p, y) {
    if (p === '+') { if (x + y > 999) return false; const n = nhoBaChuSo(x, '+', y); return !(n.dv && n.chuc); }
    if (y >= x || x - y < 10) return false;
    const m = nhoBaChuSo(x, '-', y);
    return !(m.dv && m.chuc) && !(m.chuc && tram(x) - tram(y) - 1 < 0);
  }

  const SINH_PT = {
    'cong-qua-10': coSoSanh(coDoKho('cong-qua-10', function (rng) { const p = chon(rng, CAP_CONG_QUA_10); return { phep: '+', so: [p[0], p[1]], an: 'ket_qua' }; })),
    'tru-qua-10': coSoSanh(coDoKho('tru-qua-10', function (rng) { const p = chon(rng, CAP_TRU_QUA_10); return { phep: '-', so: [p[0], p[1]], an: 'ket_qua' }; })),
    'tim-so-thieu-20': function (rng) {
      if (rng() < 0.5) {
        const p = chon(rng, CAP_CONG_QUA_10);
        return { phep: '+', so: [p[0], p[1]], kq: p[0] + p[1], an: rng() < 0.5 ? 'so_hang_1' : 'so_hang_2' };
      }
      const q = chon(rng, CAP_TRU_QUA_10);
      return { phep: '-', so: [q[0], q[1]], kq: q[0] - q[1], an: rng() < 0.5 ? 'so_bi_tru' : 'so_tru' };
    },
    /**
     * muc.cach (tùy chọn) chọn phép: 'cong', 'tru' (số thứ hai có một hay hai chữ số như cũ), 'cong_1cs', 'cong_2cs', 'tru_1cs',
     * 'tru_2cs' (các màn có nhớ của vùng 4 trộn câu không nhớ cùng phép để bé phải xét có nhớ hay không). Không có cach: như cũ.
     */
    'cong-tru-khong-nho-100': function (rng, muc) {
      let mot, cong;
      if (muc && muc.cach && muc.cach.length) {
        const c = chonCach(rng, muc, []);
        cong = c.indexOf('cong') === 0;
        mot = /_1cs$/.test(c) ? true : /_2cs$/.test(c) ? false : rng() < 0.4;
      } else {
        mot = rng() < 0.4;
        cong = rng() < 0.5;
      }
      if (cong) {
        for (;;) {
          const a = nn(rng, 10, 88), b = mot ? nn(rng, 1, 9) : nn(rng, 10, 89);
          if (a + b <= 99 && dv(a) + dv(b) <= 9) return { phep: '+', so: [a, b], an: 'ket_qua' };
        }
      }
      for (;;) {
        const a2 = nn(rng, 21, 99), b2 = mot ? nn(rng, 1, 9) : nn(rng, 10, a2 - 1);
        if (b2 < a2 && dv(b2) <= dv(a2)) return { phep: '-', so: [a2, b2], an: 'ket_qua' };
      }
    },
    'cong-nho-2cs-1cs': coDoKho('cong-nho-2cs-1cs', function (rng) {
      const u = nn(rng, 2, 9);
      const a = nn(rng, 1, 8) * 10 + u;
      const b = nn(rng, 10 - u, 9);
      return { phep: '+', so: [a, b], an: 'ket_qua' };
    }),
    'cong-nho-2cs-2cs': coDoKho('cong-nho-2cs-2cs', function (rng) {
      for (;;) {
        const ua = nn(rng, 1, 9), ub = nn(rng, 10 - ua, 9);
        const ta = nn(rng, 1, 8), tb = nn(rng, 1, 9 - ta);
        const a = ta * 10 + ua, b = tb * 10 + ub;
        if (a + b <= 100) return { phep: '+', so: rng() < 0.5 ? [a, b] : [b, a], an: 'ket_qua' };
      }
    }),
    'tru-nho-2cs-1cs': coDoKho('tru-nho-2cs-1cs', function (rng) {
      const ua = nn(rng, 0, 8);
      const a = nn(rng, 2, 9) * 10 + ua;
      const b = nn(rng, ua + 1, 9);
      return { phep: '-', so: [a, b], an: 'ket_qua' };
    }),
    'tru-nho-2cs-2cs': coDoKho('tru-nho-2cs-2cs', function (rng) {
      if (rng() < 0.15) {
        const b0 = nn(rng, 1, 9) * 10 + nn(rng, 1, 9);
        return { phep: '-', so: [100, b0], an: 'ket_qua' };
      }
      const ua = nn(rng, 0, 8), ub = nn(rng, ua + 1, 9);
      const ta = nn(rng, 2, 9), tb = nn(rng, 1, ta - 1);
      return { phep: '-', so: [ta * 10 + ua, tb * 10 + ub], an: 'ket_qua' };
    }),
    'nham-tron-chuc': function (rng) {
      const dang = nn(rng, 1, 4);
      if (dang === 1) { const a = nn(rng, 1, 8), b = nn(rng, 1, 10 - a); return { phep: '+', so: [a * 10, b * 10], an: 'ket_qua' }; }
      if (dang === 2) { const a2 = nn(rng, 3, 10), b2 = nn(rng, 1, a2 - 1); return { phep: '-', so: [a2 * 10, b2 * 10], an: 'ket_qua' }; }
      if (dang === 3) { const a3 = nn(rng, 1, 7) * 10 + nn(rng, 1, 9); const b3 = nn(rng, 1, 9 - chuc(a3)) * 10; return { phep: '+', so: [a3, b3], an: 'ket_qua' }; }
      const a4 = nn(rng, 3, 9) * 10 + nn(rng, 1, 9); const b4 = nn(rng, 1, chuc(a4) - 1) * 10;
      return { phep: '-', so: [a4, b4], an: 'ket_qua' };
    },
    'bieu-thuc-2-dau': function (rng) {
      for (;;) {
        const p1 = rng() < 0.5 ? '+' : '-', p2 = rng() < 0.5 ? '+' : '-';
        const a = nn(rng, 10, 60), b = nn(rng, 2, rng() < 0.6 ? 9 : 30), c = nn(rng, 2, rng() < 0.6 ? 9 : 30);
        const r1 = tinhPhep(a, p1, b), r2 = tinhPhep(r1, p2, c);
        if (r1 >= 0 && r1 <= 100 && r2 >= 0 && r2 <= 100) return { phep: [p1, p2], so: [a, b, c], an: 'ket_qua' };
      }
    },
    /** Bảng nhân 2, 5: đủ các dòng từ × 1 đến × 10 (03a: không bỏ 2 × 1 và 5 × 10). */
    'bang-nhan-2-5': function (rng) {
      const a = rng() < 0.5 ? 2 : 5;
      return { phep: '×', so: [a, nn(rng, 1, 10)], an: 'ket_qua' };
    },
    'bang-chia-2-5': function (rng) {
      const b = rng() < 0.5 ? 2 : 5;
      return { phep: ':', so: [b * nn(rng, 1, 10), b], an: 'ket_qua' };
    },
    /** Ba nhóm đều nhau: không nhớ, nhớ ở hàng đơn vị, nhớ ở hàng chục; số thứ hai đôi khi có hai chữ số. */
    'cong-tru-1000': coDoKho('cong-tru-1000', function (rng) {
      const nhom = nn(rng, 0, 2);
      const cong = rng() < 0.5;
      const haiCs = rng() < 0.3;
      return capCongTru1000(rng, cong, nhom, haiCs);
    })
  };

  /** Ứng viên nhiễu có tên lỗi (w: trọng số), theo công thức ở 03a. */
  function ungVienNhieuPT(kyNang, ct) {
    const d = tinhPT(ct);
    const ds = [];
    const them = function (v, w) { ds.push({ v: v, w: w }); };
    if (Array.isArray(ct.phep)) {
      const a = ct.so[0], b = ct.so[1], c = ct.so[2];
      them(tinhPhep(a, ct.phep[0], b), 3);
      them(tinhPhep(a, ct.phep[0], tinhPhep(b, ct.phep[1], c)), 3);
      them(d - 10, 1); them(d + 10, 1);
    } else if (ct.an !== 'ket_qua') {
      const a = ct.so[0], b = ct.so[1], c = ct.kq;
      if (ct.phep === '+') them(c + (ct.an === 'so_hang_1' ? b : a), 3);
      else them(ct.an === 'so_bi_tru' ? c - b : a + c, 3);
    } else if (ct.phep === '×') {
      const a = ct.so[0], b = ct.so[1];
      them(a * (b + 1), 2); if (b > 1) them(a * (b - 1), 2);
      them(a + b, 2);
      them(a === 2 ? 5 * b : 2 * b, 1.5);
      if (b === 10) them(a, 1);
    } else if (ct.phep === ':') {
      const a = ct.so[0], b = ct.so[1];
      them(d + 1, 2); if (d > 1) them(d - 1, 2);
      them(a - b, 2);
      them(a * b, 1);
      if (b === 5 && a % 2 === 0) them(a / 2, 1.5);
      if (b === 2 && a % 5 === 0) them(a / 5, 1.5);
    } else if (ct.so[0] > 100 || ct.so[1] > 100) {
      const a = ct.so[0], b = ct.so[1];
      const n = nhoBaChuSo(a, ct.phep, b);
      if (ct.phep === '+') {
        if (n.dv) them(d - 10, 4);
        if (n.chuc) them(d - 100, 4);
        them(Math.abs(a - b), 0.5);
        if (b >= 10 && b < 100) them(a + 10 * b, 2);
      } else {
        if (n.dv) { them(d + 10, 3); them((tram(a) - tram(b)) * 100 + (chuc(a) - chuc(b)) * 10 + (dv(b) - dv(a)), 3); }
        if (n.chuc) { them(d + 100, 3); if (!n.dv) them((tram(a) - tram(b)) * 100 + (chuc(b) - chuc(a)) * 10 + (dv(a) - dv(b)), 2); }
        them(a + b, 0.5);
      }
    } else {
      const a = ct.so[0], b = ct.so[1];
      const ua = dv(a), ub = dv(b), ta = chuc(a), tb = chuc(b);
      if (ct.phep === '+') {
        if (a < 10 && b < 10) {
          // Cộng qua 10 (hai số có một chữ số): không dùng đ − 10 (4 + 7 hiện "1" là lộ đáp án), dùng lỗi tách 10 như SGK Bài 7;
          // lệch 1, lệch 2 do taoNhieu thêm
          const lon = Math.max(a, b), can = 10 - lon;
          if (ua + ub >= 10) { them(10 + can, 2.5); them(10 + Math.min(a, b), 2); }
          if (2 * a >= 10) them(2 * a, 0.5);
          if (2 * b >= 10) them(2 * b, 0.5);
        } else {
          them(d - 10, kyNang === 'nham-tron-chuc' ? 0.5 : 4);
          them(Math.abs(a - b), 1);
        }
        if (a >= 10 && b < 10) them(a + 10 * b, 2);
        if (b >= 10 && b % 10 === 0 && a % 10 !== 0) them(a + b / 10, 3);
        if (a % 10 === 0 && b % 10 === 0) { them(d / 10, 3); them(d * 10, 1); }
      } else {
        const quaMuoi = a < 20 && b < 10;
        // Trừ qua 10 (SGK Bài 11): hiệu luôn có một chữ số, nên nhiễu lớn hơn cả số bị trừ (đ + 10, cộng nhầm) lộ đáp án, không dùng;
        // ưu tiên lỗi tách 10 có một chữ số: 13 − 5 ra 5 (10 − 5, quên cộng 3) hay 2 (10 − 5 − 3)
        if (!quaMuoi) them(d + 10, 3);
        if (ua < ub) { const tn = (ta - tb) * 10 + (ub - ua); if (!quaMuoi) them(tn, 3); else if (tn < a) them(tn, 0.5); }
        if (quaMuoi) them(10 - b, 2);
        if (quaMuoi && ua < ub) them(10 - b - ua, 1.5);
        if (a >= 10 && b < 10 && ua < ub) them(d - 2 * (10 - b), 1.5);
        if (!quaMuoi) them(a + b, 1);
        if (a >= 10 && b < 10) them(a - 10 * b, 1);
        if (b >= 10 && b % 10 === 0 && a % 10 !== 0) them(a - b / 10, 3);
        if (a % 10 === 0 && b % 10 === 0) { them(d / 10, 3); them(d * 10, 1); }
      }
    }
    return ds;
  }

  function goiYPT(ct) {
    const d = tinhPT(ct);
    if (Array.isArray(ct.phep)) {
      const r1 = tinhPhep(ct.so[0], ct.phep[0], ct.so[1]);
      return [
        'Có hai dấu thì tính lần lượt từ trái sang phải nhé.',
        'Bước một: ' + ct.so[0] + ' ' + kyHieu(ct.phep[0]) + ' ' + ct.so[1] + ' = ' + r1 + '.',
        'Bước hai: ' + r1 + ' ' + kyHieu(ct.phep[1]) + ' ' + ct.so[2] + ' = ?'
      ];
    }
    if (ct.an !== 'ket_qua') {
      // Lớp 2 (SGK Bài 14): hỏi "mấy cộng mấy", đếm thêm, nhẩm bảng cộng, bảng trừ; quy tắc "muốn tìm số hạng…" là của lớp 3
      const a = ct.so[0], b = ct.so[1], c = ct.kq;
      if (ct.phep === '+') {
        const biet = ct.an === 'so_hang_1' ? b : a;
        return [
          (ct.an === 'so_hang_1' ? 'Mấy cộng ' + b : a + ' cộng mấy') + ' bằng ' + c + '? Đếm thêm từ ' + biet + ' tới ' + c + '.',
          'Đếm thêm từ ' + biet + ': mỗi lần đếm là thêm 1, đếm tới ' + c + ' thì dừng. Đếm được mấy lần?',
          'Nhẩm bảng trừ cũng được: ' + c + ' ' + TRU + ' ' + biet + ' = ?'
        ];
      }
      if (ct.an === 'so_bi_tru') return ['Mấy trừ ' + b + ' bằng ' + c + '?', 'Bớt đi ' + b + ' còn ' + c + ', vậy lúc đầu phải thêm lại ' + b + '.', c + ' + ' + b + ' = ?'];
      return [a + ' trừ mấy bằng ' + c + '?', 'Đếm lùi từ ' + a + ' tới ' + c + ': đếm được mấy lần?', 'Nhẩm bảng trừ: ' + a + ' ' + TRU + ' ' + c + ' = ?'];
    }
    const a = ct.so[0], b = ct.so[1];
    if (ct.phep === '×') {
      const dem = [];
      for (let i = 1; i <= b; i++) dem.push(i < b ? a * i : '?');
      return ['Đếm thêm ' + a + ', đếm đủ ' + b + ' lần nhé.', a + ' × ' + b + ' là ' + a + ' được lấy ' + b + ' lần.', 'Đếm: ' + dem.join(', ')];
    }
    if (ct.phep === ':') {
      return ['Nghĩ ngược lại: ' + b + ' nhân mấy bằng ' + a + '?', 'Đếm thêm ' + b + ' cho tới ' + a + ', đếm xem mấy lần.', b + ' × ? = ' + a];
    }
    const ua = dv(a), ub = dv(b), ta = chuc(a), tb = chuc(b);
    if (a > 100 || b > 100) return goiYBaChuSo(ct, d);
    if (a % 10 === 0 && b % 10 === 0) {
      return ['Đếm theo chục: ' + a + ' là ' + a / 10 + ' chục.', a / 10 + ' chục ' + (ct.phep === '+' ? 'cộng' : 'trừ') + ' ' + b / 10 + ' chục = ' + d / 10 + ' chục.', d / 10 + ' chục là mấy?'];
    }
    if (a < 10 && b < 10 && ct.phep === '+' && a + b <= 10) {
      const lon = Math.max(a, b), be = Math.min(a, b);
      return ['Đếm thêm ' + be + ' từ ' + lon + ' nhé.', 'Bắt đầu từ ' + lon + ', đếm thêm ' + be + ' số nữa.', lon + ' + ' + be + ' = ?'];
    }
    if (a < 10 && b < 10 && ct.phep === '+') {
      const lon = Math.max(a, b), be = Math.min(a, b), can = 10 - lon;
      return ['Tách ' + be + ' để ' + lon + ' thành 10 nhé.', lon + ' + ' + can + ' = 10, còn ' + (be - can) + '.', '10 + ' + (be - can) + ' = ?'];
    }
    if (a === 10 && b < 10 && ct.phep === '-') return ['Nhẩm bảng trừ: 10 ' + TRU + ' ' + b + '.', 'Đếm lùi ' + b + ' số từ 10.', '10 ' + TRU + ' ' + b + ' = ?'];
    if (a < 20 && b < 10 && ct.phep === '-' && ua < ub) {
      // SGK Bài 11: tách số bị trừ thành 10 và số lẻ (13 = 10 + 3), lấy 10 trừ trước rồi cộng số lẻ
      return ['Tách ' + a + ' = 10 + ' + ua + ' nhé.', '10 ' + TRU + ' ' + b + ' = ' + (10 - b) + '.', (10 - b) + ' + ' + ua + ' = ?'];
    }
    if (ct.phep === '+') {
      if (ua + ub >= 10) {
        return ['Cộng hàng đơn vị trước: ' + ua + ' + ' + ub + ' = ?', ua + ' + ' + ub + ' = ' + (ua + ub) + ', viết ' + dv(ua + ub) + ' nhớ 1.',
          'Hàng chục: ' + ta + ' + ' + tb + ' thêm 1 là ' + (ta + tb + 1) + '.'];
      }
      if (b % 10 === 0) return ['Cộng chục với chục, giữ nguyên hàng đơn vị.', ta + ' chục + ' + tb + ' chục = ' + (ta + tb) + ' chục.', 'Viết ' + (ta + tb) + ' rồi viết ' + ua + '.'];
      return ['Cộng hàng đơn vị trước: ' + ua + ' + ' + ub + ' = ' + (ua + ub) + '.', 'Rồi cộng hàng chục: ' + ta + ' + ' + tb + ' = ' + (ta + tb) + '.', 'Ghép lại: hàng chục ' + (ta + tb) + ', hàng đơn vị ' + (ua + ub) + '.'];
    }
    if (ua < ub) {
      return [ua + ' không trừ được ' + ub + ', mượn 1 chục: ' + (10 + ua) + ' ' + TRU + ' ' + ub + ' = ?',
        (10 + ua) + ' ' + TRU + ' ' + ub + ' = ' + (10 + ua - ub) + ', viết ' + (10 + ua - ub) + ' nhớ 1.',
        'Hàng chục: ' + tb + ' thêm 1 là ' + (tb + 1) + ', ' + (a >= 100 ? 10 : ta) + ' ' + TRU + ' ' + (tb + 1) + ' = ?'];
    }
    if (b % 10 === 0) return ['Trừ chục với chục, giữ nguyên hàng đơn vị.', ta + ' chục ' + TRU + ' ' + tb + ' chục = ' + (ta - tb) + ' chục.', 'Viết ' + (ta - tb) + ' rồi viết ' + ua + '.'];
    return ['Trừ hàng đơn vị trước: ' + ua + ' ' + TRU + ' ' + ub + ' = ' + (ua - ub) + '.', 'Rồi trừ hàng chục: ' + ta + ' ' + TRU + ' ' + tb + ' = ' + (ta - tb) + '.', 'Ghép lại hai hàng.'];
  }

  function goiYBaChuSo(ct, d) {
    const a = ct.so[0], b = ct.so[1];
    const ha = tram(a), hb = tram(b), ta = chuc(a), tb = chuc(b), ua = dv(a), ub = dv(b);
    const n = nhoBaChuSo(a, ct.phep, b);
    if (ct.phep === '+') {
      if (n.dv) return ['Đặt tính thẳng hàng, cộng từ hàng đơn vị: ' + ua + ' + ' + ub + ' = ?', ua + ' + ' + ub + ' = ' + (ua + ub) + ', viết ' + dv(ua + ub) + ' nhớ 1.', 'Hàng chục: ' + ta + ' + ' + tb + ' thêm 1 là ' + (ta + tb + 1) + '. Hàng trăm: ' + ha + ' + ' + hb + ' = ' + (ha + hb) + '.'];
      if (n.chuc) return ['Đặt tính thẳng hàng, cộng từ hàng đơn vị: ' + ua + ' + ' + ub + ' = ' + (ua + ub) + '.', 'Hàng chục: ' + ta + ' + ' + tb + ' = ' + (ta + tb) + ', viết ' + dv(ta + tb) + ' nhớ 1.', 'Hàng trăm: ' + ha + ' + ' + hb + ' thêm 1 là ' + (ha + hb + 1) + '.'];
      return ['Đặt tính thẳng hàng, cộng lần lượt từ hàng đơn vị.', 'Đơn vị: ' + ua + ' + ' + ub + ' = ' + (ua + ub) + '; chục: ' + ta + ' + ' + tb + ' = ' + (ta + tb) + '.', 'Hàng trăm: ' + ha + ' + ' + hb + ' = ' + (ha + hb) + '.'];
    }
    if (n.dv) return [ua + ' không trừ được ' + ub + ', mượn 1 chục: ' + (10 + ua) + ' ' + TRU + ' ' + ub + ' = ?', (10 + ua) + ' ' + TRU + ' ' + ub + ' = ' + (10 + ua - ub) + ', viết ' + (10 + ua - ub) + ' nhớ 1.', 'Hàng chục: ' + tb + ' thêm 1 là ' + (tb + 1) + ', ' + ta + ' ' + TRU + ' ' + (tb + 1) + ' = ' + (ta - tb - 1) + '. Hàng trăm: ' + ha + ' ' + TRU + ' ' + hb + ' = ' + (ha - hb) + '.'];
    if (n.chuc) return ['Hàng đơn vị: ' + ua + ' ' + TRU + ' ' + ub + ' = ' + (ua - ub) + '.', ta + ' không trừ được ' + tb + ', mượn 1 trăm: ' + (10 + ta) + ' ' + TRU + ' ' + tb + ' = ' + (10 + ta - tb) + ', nhớ 1.', 'Hàng trăm: ' + hb + ' thêm 1 là ' + (hb + 1) + ', ' + ha + ' ' + TRU + ' ' + (hb + 1) + ' = ' + (ha - hb - 1) + '.'];
    return ['Đặt tính thẳng hàng, trừ lần lượt từ hàng đơn vị.', 'Đơn vị: ' + ua + ' ' + TRU + ' ' + ub + ' = ' + (ua - ub) + '; chục: ' + ta + ' ' + TRU + ' ' + tb + ' = ' + (ta - tb) + '.', 'Hàng trăm: ' + ha + ' ' + TRU + ' ' + hb + ' = ' + (ha - hb) + '.'];
  }

  /** Lời giải cho màn "Gần đúng rồi": mã lời giải, các bước, và dữ liệu đặt tính cột dọc nếu có. */
  function loiGiaiPT(ct) {
    const d = tinhPT(ct);
    if (Array.isArray(ct.phep)) {
      const r1 = tinhPhep(ct.so[0], ct.phep[0], ct.so[1]);
      return { ma: 'tu-trai-sang-phai', buoc: [ct.so[0] + ' ' + kyHieu(ct.phep[0]) + ' ' + ct.so[1] + ' = ' + r1, r1 + ' ' + kyHieu(ct.phep[1]) + ' ' + ct.so[2] + ' = ' + d], kq: d };
    }
    if (ct.an !== 'ket_qua') {
      const a = ct.so[0], b = ct.so[1], c = ct.kq;
      let buoc;
      if (ct.phep === '+') buoc = ct.an === 'so_hang_1' ? [d + ' + ' + b + ' = ' + c, 'Vậy số còn thiếu là ' + d] : [a + ' + ' + d + ' = ' + c, 'Vậy số còn thiếu là ' + d];
      else if (ct.an === 'so_bi_tru') buoc = [c + ' + ' + b + ' = ' + d + ', thử lại: ' + d + ' ' + TRU + ' ' + b + ' = ' + c, 'Vậy số còn thiếu là ' + d];
      else buoc = [a + ' ' + TRU + ' ' + d + ' = ' + c, 'Vậy số còn thiếu là ' + d];
      return { ma: 'tim-thanh-phan', buoc: buoc, kq: d };
    }
    const a = ct.so[0], b = ct.so[1];
    if (ct.phep === '×') {
      const tong = [];
      for (let i = 0; i < b; i++) tong.push(a);
      const dem = [];
      for (let j = 1; j <= b; j++) dem.push(a * j);
      return { ma: 'dem-them', buoc: [a + ' được lấy ' + b + ' lần: ' + (b > 1 ? tong.join(' + ') : a) + ' = ' + d, 'Đếm thêm ' + a + ': ' + dem.join(', ')], kq: d };
    }
    if (ct.phep === ':') {
      return { ma: 'nghi-nguoc-nhan', buoc: [b + ' × ' + d + ' = ' + a, 'Vậy ' + a + ' : ' + b + ' = ' + d], kq: d };
    }
    const ua = dv(a), ub = dv(b), ta = chuc(a), tb = chuc(b);
    if (a > 100 || b > 100) return loiGiaiBaChuSo(ct, d);
    if (a % 10 === 0 && b % 10 === 0) {
      return { ma: 'dem-chuc', buoc: [a / 10 + ' chục ' + (ct.phep === '+' ? '+' : TRU) + ' ' + b / 10 + ' chục = ' + d / 10 + ' chục', 'Vậy ' + dePT(ct).replace('?', String(d))], kq: d };
    }
    if (a < 10 && b < 10 && ct.phep === '+' && a + b <= 10) {
      return { ma: 'dem-them', buoc: ['Đếm thêm ' + Math.min(a, b) + ' từ ' + Math.max(a, b), 'Vậy ' + a + ' + ' + b + ' = ' + d], kq: d };
    }
    if (a === 10 && b < 10 && ct.phep === '-') return { ma: 'dem-lui', buoc: ['Đếm lùi ' + b + ' số từ 10', 'Vậy 10 ' + TRU + ' ' + b + ' = ' + d], kq: d };
    if (a < 10 && b < 10 && ct.phep === '+') {
      const lon = Math.max(a, b), be = Math.min(a, b), can = 10 - lon;
      return { ma: 'tach-10-cong', buoc: ['Tách ' + be + ' = ' + can + ' + ' + (be - can), lon + ' + ' + can + ' = 10', '10 + ' + (be - can) + ' = ' + d], kq: d };
    }
    if (a < 20 && b < 10 && ct.phep === '-' && ua < ub) {
      return { ma: 'tach-10-tru', buoc: ['Tách ' + a + ' = 10 + ' + ua, '10 ' + TRU + ' ' + b + ' = ' + (10 - b), (10 - b) + ' + ' + ua + ' = ' + d], kq: d };
    }
    const cot = { tren: a, duoi: b, phep: ct.phep, kq: d, nho: false };
    if (ct.phep === '+') {
      cot.nho = ua + ub >= 10;
      const buoc = cot.nho
        ? [ua + ' + ' + ub + ' = ' + (ua + ub) + ', viết ' + dv(ua + ub) + ', nhớ 1', ta + ' + ' + tb + ' = ' + (ta + tb) + ', thêm 1 bằng ' + (ta + tb + 1) + ', viết ' + (ta + tb + 1)]
        : [ua + ' + ' + ub + ' = ' + (ua + ub) + ', viết ' + (ua + ub), ta + ' + ' + tb + ' = ' + (ta + tb) + ', viết ' + (ta + tb)];
      return { ma: cot.nho ? 'dat-tinh-cong-nho' : 'dat-tinh-cong', cot: cot, buoc: buoc, kq: d };
    }
    cot.nho = ua < ub;
    const taCo = a >= 100 ? 10 : ta;
    const buocTru = cot.nho
      ? [ua + ' không trừ được ' + ub + ', lấy ' + (10 + ua) + ' trừ ' + ub + ' bằng ' + (10 + ua - ub) + ', viết ' + (10 + ua - ub) + ', nhớ 1',
        tb + ' thêm 1 bằng ' + (tb + 1) + ', ' + taCo + ' trừ ' + (tb + 1) + ' bằng ' + (taCo - tb - 1) + (taCo - tb - 1 > 0 ? ', viết ' + (taCo - tb - 1) : '')]
      : [ua + ' trừ ' + ub + ' bằng ' + (ua - ub) + ', viết ' + (ua - ub), ta + ' trừ ' + tb + ' bằng ' + (ta - tb) + (ta - tb > 0 ? ', viết ' + (ta - tb) : '')];
    return { ma: cot.nho ? 'dat-tinh-tru-nho' : 'dat-tinh-tru', cot: cot, buoc: buocTru, kq: d };
  }

  function loiGiaiBaChuSo(ct, d) {
    const a = ct.so[0], b = ct.so[1];
    const ha = tram(a), hb = tram(b), ta = chuc(a), tb = chuc(b), ua = dv(a), ub = dv(b);
    const n = nhoBaChuSo(a, ct.phep, b);
    const cot = { tren: a, duoi: b, phep: ct.phep, kq: d, nho: n.dv || n.chuc, vi_tri_nho: n.dv ? 0 : 1 };
    let buoc;
    if (ct.phep === '+') {
      buoc = [
        ua + ' + ' + ub + ' = ' + (ua + ub) + (n.dv ? ', viết ' + dv(ua + ub) + ', nhớ 1' : ', viết ' + (ua + ub)),
        ta + ' + ' + tb + (n.dv ? ' thêm 1' : '') + ' bằng ' + (ta + tb + (n.dv ? 1 : 0)) + (n.chuc ? ', viết ' + dv(ta + tb) + ', nhớ 1' : ', viết ' + (ta + tb + (n.dv ? 1 : 0))),
        ha + ' + ' + hb + (n.chuc ? ' thêm 1' : '') + ' bằng ' + (ha + hb + (n.chuc ? 1 : 0)) + ', viết ' + (ha + hb + (n.chuc ? 1 : 0))
      ];
      return { ma: cot.nho ? 'dat-tinh-cong-nho' : 'dat-tinh-cong', cot: cot, buoc: buoc, kq: d };
    }
    if (n.dv) {
      buoc = [ua + ' không trừ được ' + ub + ', lấy ' + (10 + ua) + ' trừ ' + ub + ' bằng ' + (10 + ua - ub) + ', viết ' + (10 + ua - ub) + ', nhớ 1',
        tb + ' thêm 1 bằng ' + (tb + 1) + ', ' + ta + ' trừ ' + (tb + 1) + ' bằng ' + (ta - tb - 1) + ', viết ' + (ta - tb - 1),
        ha + ' trừ ' + hb + ' bằng ' + (ha - hb) + (ha - hb > 0 ? ', viết ' + (ha - hb) : '')];
    } else if (n.chuc) {
      buoc = [ua + ' trừ ' + ub + ' bằng ' + (ua - ub) + ', viết ' + (ua - ub),
        ta + ' không trừ được ' + tb + ', lấy ' + (10 + ta) + ' trừ ' + tb + ' bằng ' + (10 + ta - tb) + ', viết ' + (10 + ta - tb) + ', nhớ 1',
        hb + ' thêm 1 bằng ' + (hb + 1) + ', ' + ha + ' trừ ' + (hb + 1) + ' bằng ' + (ha - hb - 1) + (ha - hb - 1 > 0 ? ', viết ' + (ha - hb - 1) : '')];
    } else {
      buoc = [ua + ' trừ ' + ub + ' bằng ' + (ua - ub) + ', viết ' + (ua - ub), ta + ' trừ ' + tb + ' bằng ' + (ta - tb) + ', viết ' + (ta - tb), ha + ' trừ ' + hb + ' bằng ' + (ha - hb) + (ha - hb > 0 ? ', viết ' + (ha - hb) : '')];
    }
    return { ma: cot.nho ? 'dat-tinh-tru-nho' : 'dat-tinh-tru', cot: cot, buoc: buoc, kq: d };
  }

  /* ============================================================
     2. Số: liền trước, liền sau; cấu tạo số (chục, trăm); đọc số
     ============================================================ */

  function tinhSo(ct) {
    if (ct.kieu === 'lien_sau') return ct.so + 1;
    if (ct.kieu === 'lien_truoc') return ct.so - 1;
    return ct.so;
  }

  /** Cách nói số theo hàng: "7 trăm và 3 đơn vị", "4 chục và 7 đơn vị" (bỏ hàng có chữ số 0 như 03a). */
  function noiTheoHang(n) {
    if (n === 1000) return '10 trăm';
    const t = tram(n), c = chuc(n), u = dv(n);
    const phan = [];
    if (t) phan.push(t + ' trăm');
    if (c) phan.push(c + ' chục');
    if (u || !phan.length) phan.push(u + ' đơn vị');
    if (!t && c && !u) phan.push('0 đơn vị');
    return phan.length > 1 ? phan.slice(0, -1).join(', ') + ' và ' + phan[phan.length - 1] : phan[0];
  }
  /** Tổng trăm, chục, đơn vị: 205 → "200 + 5", 340 → "300 + 40". */
  function noiTheoTong(n) {
    const phan = [tram(n) * 100, chuc(n) * 10, dv(n)].filter(function (x) { return x > 0; });
    return phan.length ? phan.join(' + ') : '0';
  }

  function theSo(ct) {
    if (ct.kieu === 'lien_sau') return 'Liền sau của ' + ct.so;
    if (ct.kieu === 'lien_truoc') return 'Liền trước của ' + ct.so;
    if (ct.cach === 'chu') return docSo(ct.so);
    if (ct.cach === 'tong') return noiTheoTong(ct.so);
    if (ct.cach === 'hang') return noiTheoHang(ct.so);
    return String(ct.so);
  }

  function deSo(ct) {
    if (ct.kieu === 'lien_sau') return 'Số liền sau của ' + ct.so + ' là ?';
    if (ct.kieu === 'lien_truoc') return 'Số liền trước của ' + ct.so + ' là ?';
    if (ct.cach === 'chu') return 'Xếp số: ' + docSo(ct.so);
    if (ct.cach === 'tong') return 'Xếp số: ' + noiTheoTong(ct.so);
    if (ct.cach === 'hang') return 'Xếp số gồm ' + noiTheoHang(ct.so);
    return 'Xếp số ' + ct.so;
  }

  function deDocSo(ct) {
    if (ct.kieu === 'lien_sau') return 'Số liền sau của ' + ct.so + ' là số nào?';
    if (ct.kieu === 'lien_truoc') return 'Số liền trước của ' + ct.so + ' là số nào?';
    if (ct.cach === 'chu') return docSo(ct.so);
    if (ct.cach === 'tong') return 'Số bằng ' + noiTheoTong(ct.so).replace(/\+/g, 'cộng');
    if (ct.cach === 'hang') return 'Số gồm ' + noiTheoHang(ct.so);
    return 'Con xếp số ' + docSo(ct.so);
  }

  function maSo(ct) { return (ct.kieu === 'cau_tao' ? ct.cach : ct.kieu) + ':' + ct.so; }

  /** Các cách viết sai theo từng từ nghe được: 205 → 2005, 345 → 300405, 21 → 201. */
  function vietTheoTu(n) {
    const t = tram(n), c = chuc(n), u = dv(n);
    const ra = [];
    const phan = [t * 100, c * 10, u].filter(function (x) { return x > 0; }).map(String);
    if (phan.length > 1) ra.push(Number(phan.join('')));
    if (t && (c || u)) { ra.push(Number(String(t * 100) + String(c * 10 + u))); ra.push(Number(String(t) + '0' + String(c * 10 + u))); }
    return ra.filter(function (x, i, a) { return x !== n && a.indexOf(x) === i; });
  }

  function nhanBietLoiSo(ct, v) {
    v = Number(v);
    const d = tinhSo(ct);
    if (v === d) return [];
    const ma = [];
    const them = function (m) { if (ma.indexOf(m) < 0) ma.push(m); };
    if (ct.kieu === 'lien_sau' || ct.kieu === 'lien_truoc') {
      const n = ct.so;
      if (ct.kieu === 'lien_sau') {
        if (v === n - 1) them('nham-truoc-sau');
        if (n % 10 === 9 && (v === d - 10 || v === Number(String(Math.floor(n / 10)) + '10'))) them('qua-chuc');
      } else {
        if (v === n + 1) them('nham-truoc-sau');
        if (n % 10 === 0 && (v === d - 9 || v === n + 9)) them('qua-chuc');
        if (n % 100 === 0 && n >= 200 && v === n - 100) them('qua-chuc');
      }
      if (!ma.length && (v === d + 1 || v === d - 1)) them('dem-lech');
    } else {
      const sd = String(d), sv = String(v);
      if (sd.indexOf('0') >= 0 && sv.length && sd.replace(/0/g, '') === sv) them('doc-so');
      if (sv.length === sd.length && sv.split('').sort().join('') === sd.split('').sort().join('')) them('doc-so');
      if (vietTheoTu(d).indexOf(v) >= 0) them('doc-so');
      if (d < 100 && v < 100 && ((chuc(d) === 1 && v === dv(d) * 10) || (chuc(v) === 1 && d === dv(v) * 10))) them('doc-so');
      if (d % 10 === 0 && v * 10 === d) them('thieu-0');
      if (v === d * 10) them('thua-0');
    }
    if (!ma.length) ma.push('khac');
    return ma;
  }

  function loiNoiSo(ct, v, maLoi) {
    const m = (maLoi && maLoi[0]) || 'khac';
    const d = tinhSo(ct);
    if (m === 'nham-truoc-sau') return ct.kieu === 'lien_sau' ? 'Số liền sau thì hơn ' + ct.so + ' một đơn vị' : 'Số liền trước thì kém ' + ct.so + ' một đơn vị';
    if (m === 'qua-chuc') return ct.kieu === 'lien_sau' ? 'Sau ' + ct.so + ' là sang chục mới: ' + d : 'Trước ' + ct.so + ' là số ' + d;
    if (m === 'doc-so' || m === 'thieu-0' || m === 'thua-0') {
      const s = 'Số ' + d + ' đọc là ' + docSo(d);
      return chuc(d) === 0 && d >= 100 ? s + ', hàng chục là 0' : s;
    }
    if (m === 'dem-lech') return Number(v) < d ? 'Con đếm thiếu một chút rồi' : 'Con đếm thừa một chút rồi';
    return LOI.khac.be;
  }

  function sinhLien(rng) {
    const sau = rng() < 0.5;
    const quaChuc = rng() < 0.4;
    let n;
    if (sau) n = quaChuc ? nn(rng, 0, 9) * 10 + 9 : nn(rng, 1, 98);
    else n = quaChuc ? nn(rng, 1, 10) * 10 : nn(rng, 2, 99);
    return { loai: 'so', kieu: sau ? 'lien_sau' : 'lien_truoc', so: n };
  }

  function chonCach(rng, muc, macDinh) {
    const ds = (muc && muc.cach) || macDinh;
    return chonTheoTrongSo(rng, ds.map(function (c) { return typeof c === 'string' ? { c: c, w: 1 } : c; })).c;
  }

  /** Liền trước, liền sau đến 1000: khoảng 40% câu qua chục, qua trăm (03a mục 2.5: ít nhất 10 trong 30 câu). */
  function sinhLien1000(rng) {
    const sau = rng() < 0.5;
    const r = rng();
    let n;
    if (sau) {
      if (r < 0.15) n = nn(rng, 1, 9) * 100 + 99;
      else if (r < 0.4) n = nn(rng, 10, 99) * 10 + 9;
      else n = nn(rng, 100, 998);
    } else if (r < 0.15) n = nn(rng, 2, 9) * 100;
    else if (r < 0.4) n = nn(rng, 11, 99) * 10;
    else n = nn(rng, 101, 999);
    if (sau && n === 999 && rng() < 0.5) n = 998;
    return { loai: 'so', kieu: sau ? 'lien_sau' : 'lien_truoc', so: n };
  }

  const SINH_SO = {
    'lien-truoc-sau-100': function (rng) { return sinhLien(rng); },
    'lien-truoc-sau-1000': function (rng) { return sinhLien1000(rng); },
    'cau-tao-so-100': function (rng, muc) {
      const r = rng();
      let n;
      if (r < 0.15) n = nn(rng, 11, 19);
      else if (r < 0.35) n = nn(rng, 1, 9) * 10;
      else n = nn(rng, 1, 9) * 10 + nn(rng, 1, 9);
      let cach = chonCach(rng, muc, [{ c: 'so', w: 0.2 }, { c: 'hang', w: 0.35 }, { c: 'chu', w: 0.25 }, { c: 'tong', w: 0.2 }]);
      if (cach === 'tong' && n % 10 === 0) cach = 'hang';
      return { loai: 'so', kieu: 'cau_tao', so: n, cach: cach };
    },
    'cau-tao-so-1000': function (rng, muc) {
      const t = nn(rng, 1, 9);
      const r = rng();
      let c = nn(rng, 1, 9), u = nn(rng, 1, 9);
      if (r < 0.25) c = 0; else if (r < 0.45) u = 0; else if (r < 0.5) { c = 0; u = 0; }
      let cach = chonCach(rng, muc, [{ c: 'so', w: 0.25 }, { c: 'hang', w: 0.4 }, { c: 'tong', w: 0.35 }]);
      if (cach === 'tong' && c === 0 && u === 0) cach = 'hang';
      return { loai: 'so', kieu: 'cau_tao', so: t * 100 + c * 10 + u, cach: cach };
    },
    /** Phủ đủ sáu trường hợp đọc riêng (linh, mười, mốt, tư, lăm, tròn trăm) như 03a mục 2.4. */
    'doc-so-1000': function (rng, muc) {
      const t = nn(rng, 1, 9);
      const truongHop = chonTheoTrongSo(rng, [{ k: 'linh', w: 25 }, { k: 'muoi', w: 15 }, { k: 'mot', w: 10 }, { k: 'tu', w: 10 }, { k: 'lam', w: 15 }, { k: 'tron', w: 8 }, { k: 'khac', w: 17 }]).k;
      let c, u;
      if (truongHop === 'linh') { c = 0; u = nn(rng, 1, 9); }
      else if (truongHop === 'muoi') { c = 1; u = nn(rng, 0, 9); }
      else if (truongHop === 'mot') { c = nn(rng, 2, 9); u = 1; }
      else if (truongHop === 'tu') { c = nn(rng, 2, 9); u = 4; }
      else if (truongHop === 'lam') { c = nn(rng, 1, 9); u = 5; }
      else if (truongHop === 'tron') { c = 0; u = 0; }
      else { c = nn(rng, 2, 9); u = chon(rng, [0, 2, 3, 6, 7, 8, 9]); }
      return { loai: 'so', kieu: 'cau_tao', so: t * 100 + c * 10 + u, cach: chonCach(rng, muc, ['chu']) };
    }
  };

  function ungVienNhieuSo(kyNang, ct) {
    const d = tinhSo(ct);
    const ds = [];
    const them = function (v, w) { ds.push({ v: v, w: w }); };
    if (ct.kieu === 'lien_sau' || ct.kieu === 'lien_truoc') {
      const n = ct.so;
      them(ct.kieu === 'lien_sau' ? n - 1 : n + 1, 3);
      if (ct.kieu === 'lien_sau' && n % 10 === 9) { them(d - 10, 3); them(Number(String(Math.floor(n / 10)) + '10'), 1); }
      if (ct.kieu === 'lien_truoc' && n % 10 === 0) { them(d - 9, 3); them(n + 9, 1); }
      if (ct.kieu === 'lien_truoc' && n % 100 === 0 && n >= 200) them(n - 100, 2);
      if (n >= 100) { them(ct.kieu === 'lien_sau' ? d + 10 : d - 10, 0.6); }
      return ds;
    }
    const t = tram(d), c = chuc(d), u = dv(d);
    if (d >= 100) {
      if (c === 0 && u) { them(t * 10 + u, 3); them(t * 100 + u * 10, 3); }
      else if (u === 0 && c) { them(t * 10 + c, 3); them(t * 100 + c, 3); }
      else if (c === 0 && u === 0) { them(t, 2); them(d * 10, 2); }
      else { them(t * 100 + u * 10 + c, 3); them(u * 100 + c * 10 + t, 1); them(c * 100 + t * 10 + u, 1); }
      vietTheoTu(d).forEach(function (x) { them(x, 1); });
    } else {
      if (c && u && c !== u) them(u * 10 + c, 3);
      if (c === 1 && u) them(u * 10, 3);
      if (u === 0 && c) { them(c, 2); them(d * 10, 1); }
      vietTheoTu(d).forEach(function (x) { them(x, 1.5); });
    }
    return ds;
  }

  function goiYSo(ct) {
    const d = tinhSo(ct);
    if (ct.kieu === 'lien_sau') return ['Số liền sau là số đếm ngay sau ' + ct.so + '.', 'Liền sau thì thêm 1: ' + ct.so + ' + 1.', ct.so % 10 === 9 ? 'Qua 9 là sang chục mới: sau ' + ct.so + ' là số tròn chục.' : ct.so + ' + 1 = ?'];
    if (ct.kieu === 'lien_truoc') return ['Số liền trước là số đếm ngay trước ' + ct.so + '.', 'Liền trước thì bớt 1: ' + ct.so + ' ' + TRU + ' 1.', ct.so % 10 === 0 ? 'Đếm lùi từ ' + ct.so + ': số đứng trước tận cùng là 9.' : ct.so + ' ' + TRU + ' 1 = ?'];
    const t = tram(d), c = chuc(d), u = dv(d);
    const baHang = d >= 100;
    const gom = 'Số này gồm ' + (baHang ? t + ' trăm, ' : '') + c + ' chục và ' + u + ' đơn vị.';
    if (ct.cach === 'chu') return [baHang ? 'Nghe từng phần: mấy trăm, mấy mươi, mấy đơn vị.' : 'Nghe từng phần: mấy mươi, mấy đơn vị.', baHang && c === 0 ? '"Linh" nghĩa là hàng chục bằng 0.' : c === 1 ? '"Mười" nghĩa là 1 chục.' : 'Hàng chục đọc là "mươi", hàng đơn vị đọc sau cùng.', gom];
    if (ct.cach === 'tong') return ['Mỗi số trong tổng là một hàng: trăm, chục, đơn vị.', baHang ? (t * 100) + ' là ' + t + ' trăm.' : (c * 10) + ' là ' + c + ' chục.', gom];
    if (ct.cach === 'hang') return ['Thả đúng số khối cho từng hàng.', (baHang && c === 0) || u === 0 ? 'Hàng nào không nói tới thì hàng đó bằng 0, không thả khối nào.' : 'Mỗi thanh là 1 chục, mỗi khối nhỏ là 1 đơn vị.', gom];
    return [baHang ? 'Chữ số đầu tiên là hàng trăm, rồi hàng chục, cuối cùng là hàng đơn vị.' : 'Chữ số đầu tiên là hàng chục, chữ số sau là hàng đơn vị.', 'Chữ số 0 thì không thả khối nào ở hàng đó.', gom];
  }

  function loiGiaiSo(ct) {
    const d = tinhSo(ct);
    if (ct.kieu === 'lien_sau') return { ma: 'lien-sau', buoc: ['Số liền sau hơn số đã cho 1 đơn vị', ct.so + ' + 1 = ' + d], kq: d };
    if (ct.kieu === 'lien_truoc') return { ma: 'lien-truoc', buoc: ['Số liền trước kém số đã cho 1 đơn vị', ct.so + ' ' + TRU + ' 1 = ' + d], kq: d };
    const t = tram(d), c = chuc(d), u = dv(d);
    const baHang = d >= 100;
    return {
      ma: 'cau-tao-so',
      buoc: [d + ' gồm ' + (baHang ? t + ' trăm, ' : '') + c + ' chục và ' + u + ' đơn vị', d + ' = ' + noiTheoTong(d), 'Đọc là: ' + docSo(d)],
      khoi: { tram: t, chuc: c, dv: u },
      kq: d
    };
  }

  function ketLuanSo(ct) {
    const d = tinhSo(ct);
    if (ct.kieu === 'lien_sau') return 'Vậy số liền sau của ' + ct.so + ' là ' + d;
    if (ct.kieu === 'lien_truoc') return 'Vậy số liền trước của ' + ct.so + ' là ' + d;
    const tong = noiTheoTong(d);
    return 'Vậy ' + d + (tong.indexOf('+') >= 0 ? ' = ' + tong : '') + ', đọc là ' + docSo(d);
  }

  /* ============================================================
     3. Phép nhân là tổng các số hạng bằng nhau (2.19)
     chieu: tong_nhan (2 + 2 + 2 → 2 × 3), nhan_tong (2 × 3 → 2 + 2 + 2), tranh_nhan (3 nhóm 2 quả → 2 × 3)
     a: số trong mỗi nhóm (số được lấy), b: số nhóm (số lần lấy)
     ============================================================ */

  function chuoiTong(a, b) { const ds = []; for (let i = 0; i < b; i++) ds.push(a); return ds.join('+'); }
  function tinhNT(ct) { return ct.chieu === 'nhan_tong' ? chuoiTong(ct.a, ct.b) : ct.a + 'x' + ct.b; }
  function theNT(ct) {
    if (ct.chieu === 'nhan_tong') return ct.a + ' × ' + ct.b;
    if (ct.chieu === 'tranh_nhan') return ct.b + ' nhóm, mỗi nhóm ' + ct.a;
    return hienGiaTri(chuoiTong(ct.a, ct.b));
  }
  /** Tên đồ vật trong tranh các nhóm (để đề đọc lên có danh từ: "mỗi nhóm 4 quả cam"). */
  const TEN_VAT_NT = { '🍊': 'quả cam', '🍎': 'quả táo', '🌸': 'bông hoa', '⭐': 'ngôi sao', '🥚': 'quả trứng' };
  function tenVatNT(ct) { return TEN_VAT_NT[ct.vat] || 'đồ vật'; }
  function deNT(ct) {
    if (ct.chieu === 'nhan_tong') return ct.a + ' × ' + ct.b + ' viết thành tổng nào?';
    if (ct.chieu === 'tranh_nhan') return ct.b + ' nhóm, mỗi nhóm ' + ct.a + ' ' + tenVatNT(ct) + ' ' + (ct.vat || '') + ': phép nhân nào?';
    return hienGiaTri(chuoiTong(ct.a, ct.b)) + ' viết thành phép nhân nào?';
  }
  function deDocNT(ct) {
    if (ct.chieu === 'nhan_tong') return ct.a + ' nhân ' + ct.b + ' viết thành tổng nào?';
    if (ct.chieu === 'tranh_nhan') return 'Có ' + ct.b + ' nhóm, mỗi nhóm ' + ct.a + ' ' + tenVatNT(ct) + '. Phép nhân nào?';
    return chuoiTong(ct.a, ct.b).split('+').join(' cộng ') + ' viết thành phép nhân nào?';
  }
  function maNT(ct) { return ct.chieu + ':' + ct.a + 'x' + ct.b; }

  /** Đọc một biểu thức nhân hoặc tổng: "2x3" → { nhan: [2, 3] }, "2+2+2" → { tong: [2, 2, 2] }. */
  function docBieuThuc(v) {
    const s = String(v == null ? '' : v).replace(/\s+/g, '').replace(/×/g, 'x').replace(/−/g, '-');
    if (/^\d+x\d+$/.test(s)) return { nhan: s.split('x').map(Number) };
    if (/^\d+(\+\d+)+$/.test(s)) return { tong: s.split('+').map(Number) };
    return null;
  }

  function nhanBietLoiNT(ct, v) {
    const d = tinhNT(ct);
    const s = String(v).replace(/\s+/g, '').replace(/×/g, 'x');
    if (s === d) return [];
    const ma = [];
    const bt = docBieuThuc(s);
    const a = ct.a, b = ct.b;
    if (bt && bt.nhan) {
      const p = bt.nhan[0], q = bt.nhan[1];
      if (p === b && q === a && a !== b) ma.push('dao-thu-tu');
      else if (p === a && Math.abs(q - b) === 1) ma.push('dem-nhom');
    } else if (bt && bt.tong) {
      const t = bt.tong;
      const deu = t.every(function (x) { return x === t[0]; });
      if (deu && t[0] === b && t.length === a && a !== b) ma.push('dao-thu-tu');
      else if (deu && t[0] === a && Math.abs(t.length - b) === 1) ma.push('dem-nhom');
      else if (t.length === 2 && ((t[0] === a && t[1] === b) || (t[0] === b && t[1] === a))) ma.push('cong-thay-nhan');
    }
    if (!ma.length) ma.push('khac');
    return ma;
  }

  function loiNoiNT(ct, v, maLoi) {
    const m = (maLoi && maLoi[0]) || 'khac';
    if (m === 'dao-thu-tu') return ct.a + ' được lấy ' + ct.b + ' lần, viết ' + ct.a + ' × ' + ct.b;
    if (m === 'dem-nhom') return 'Con đếm lại xem có mấy nhóm ' + ct.a + ' nhé';
    if (m === 'cong-thay-nhan') return 'Phép nhân không phải là cộng hai số với nhau';
    return LOI.khac.be;
  }

  const SINH_NT = {
    'nhan-y-nghia': function (rng, muc) {
      const chieu = chonCach(rng, muc && muc.chieu ? { cach: muc.chieu } : null, [{ c: 'tong_nhan', w: 0.4 }, { c: 'nhan_tong', w: 0.3 }, { c: 'tranh_nhan', w: 0.3 }]);
      for (;;) {
        const a = nn(rng, 2, 5), b = nn(rng, 2, 5);
        if (a === b || (chieu === 'tranh_nhan' && a * b > 15)) continue;
        const ct = { loai: 'nhan_tong', chieu: chieu, a: a, b: b };
        if (chieu === 'tranh_nhan') ct.vat = chon(rng, ['🍊', '🍎', '🌸', '⭐', '🥚']);
        return ct;
      }
    }
  };

  function taoNhieuNT(ct, rng) {
    const a = ct.a, b = ct.b;
    const d = tinhNT(ct);
    const ungVien = [];
    // Thẻ đảo thứ tự (5 × 3 viết 3 + 3 + 3 + 3 + 3) có cùng giá trị với đáp án: ít dùng (trọng số 0,6) và nếu bé chọn thì
    // VanChoi cho chọn lại như Truyện Tranh (03a mục 2.19), không tính là sai hẳn
    if (ct.chieu === 'nhan_tong') {
      if (a !== b) ungVien.push({ v: chuoiTong(b, a), w: 0.6 });
      ungVien.push({ v: chuoiTong(a, b + 1), w: 2 });
      if (b > 2) ungVien.push({ v: chuoiTong(a, b - 1), w: 2 });
      ungVien.push({ v: a + '+' + b, w: 2 });
    } else {
      if (a !== b) ungVien.push({ v: b + 'x' + a, w: 0.6 });
      ungVien.push({ v: a + 'x' + (b + 1), w: 2 });
      if (b > 2) ungVien.push({ v: a + 'x' + (b - 1), w: 2 });
      ungVien.push({ v: a + '+' + b, w: 1.5 });
    }
    const ra = [];
    const con = ungVien.filter(function (x) { return x.v !== d; });
    while (ra.length < 2 && con.length) {
      const x = chonTheoTrongSo(rng, con);
      ra.push(x.v);
      con.splice(con.indexOf(x), 1);
    }
    return ra.map(function (v) { return { gia_tri: v, loi: nhanBietLoiNT(ct, v) }; });
  }

  function goiYNT(ct) {
    if (ct.chieu === 'nhan_tong') return ['Phép nhân ' + ct.a + ' × ' + ct.b + ' là ' + ct.a + ' được lấy ' + ct.b + ' lần.', 'Viết số ' + ct.a + ' đúng ' + ct.b + ' lần rồi nối bằng dấu cộng.', 'Tổng có ' + ct.b + ' số hạng, số hạng nào cũng là ' + ct.a + '.'];
    return ['Đếm xem mỗi nhóm có mấy, có mấy nhóm như thế.', 'Số trong mỗi nhóm viết trước, số nhóm viết sau.', ct.a + ' được lấy ' + ct.b + ' lần, viết ' + ct.a + ' × ?'];
  }

  function loiGiaiNT(ct) {
    return { ma: 'y-nghia-nhan', buoc: [ct.a + ' được lấy ' + ct.b + ' lần', hienGiaTri(chuoiTong(ct.a, ct.b)) + ' = ' + ct.a + ' × ' + ct.b + ' = ' + ct.a * ct.b], kq: tinhNT(ct) };
  }

  /* ============================================================
     4. Bài toán có lời văn: truyện ba khung, hai bước (chọn phép tính, rồi tính)
     Đề viết tay theo SGK Bài 4, 9, 13, 19 đến 24, 37 đến 45; số thay đổi trong phạm vi của từng kỹ năng.
     {x} {y}: hai số theo đúng thứ tự của phép tính đúng; {A} {B}: tên nhân vật.
     ============================================================ */

  const PHEP_DANG = { them: '+', gop: '+', nhieu_hon: '+', luc_dau: '+', bot: '-', con_lai: '-', it_hon: '-', hon_kem: '-', nhan: '×', chia_deu: ':', chia_nhom: ':' };

  const KY_CONG_TRU = ['toan-them-bot', 'toan-hon-kem', 'toan-loi-van-100'];
  const KY_NHIEU_IT = ['toan-nhieu-it', 'toan-loi-van-100'];
  const KY_CHIA = ['chia-y-nghia', 'toan-nhan-chia'];

  const MAU = [
    // Thêm
    { id: 'trung-khay', toi_da: 30, dang: 'them', ky: KY_CONG_TRU, vat: '🥚', dv: 'quả', ten: 'quả trứng', khung: ['Trên khay có {x} quả trứng.', '{A} đặt thêm {y} quả trứng vào khay.', 'Hỏi trên khay có tất cả bao nhiêu quả trứng?'], giai: 'Số quả trứng có tất cả là:' },
    { id: 'hoa-lo', toi_da: 20, dang: 'them', ky: KY_CONG_TRU, vat: '🌸', dv: 'bông', ten: 'bông hoa', khung: ['Lọ hoa có {x} bông hoa.', '{A} cắm thêm {y} bông hoa vào lọ.', 'Hỏi lọ hoa có tất cả bao nhiêu bông hoa?'], giai: 'Số bông hoa có tất cả là:' },
    { id: 'keo-co', toi_da: 30, dang: 'them', ky: KY_CONG_TRU, vat: '🦕', dv: 'bạn', ten: 'bạn', khung: ['Có {x} bạn khủng long đang chơi kéo co.', 'Có thêm {y} bạn chạy đến cùng chơi.', 'Hỏi lúc đó có tất cả bao nhiêu bạn chơi kéo co?'], giai: 'Số bạn chơi kéo co có tất cả là:' },
    { id: 'thuyen-ben', dang: 'them', ky: KY_CONG_TRU, vat: '⛵', dv: 'chiếc', ten: 'chiếc thuyền', khung: ['Bến sông có {x} chiếc thuyền.', 'Có thêm {y} chiếc thuyền cập bến.', 'Hỏi bến sông có tất cả bao nhiêu chiếc thuyền?'], giai: 'Số thuyền có tất cả là:' },
    { id: 'qua-mong-tang', dang: 'them', ky: KY_CONG_TRU, anh: 'berry', dv: 'quả', ten: 'quả mọng', khung: ['{A} có {x} quả mọng.', '{B} tặng {A} thêm {y} quả mọng.', 'Hỏi {A} có tất cả bao nhiêu quả mọng?'], giai: 'Số quả mọng {A} có tất cả là:' },
    { id: 'trung-ba-mua', dang: 'them', ky: ['toan-hon-kem', 'toan-loi-van-100'], vat: '🥚', dv: 'quả', ten: 'quả trứng', khung: ['Bà có {x} quả trứng.', 'Bà mua thêm {y} quả trứng nữa.', 'Hỏi bà có tất cả bao nhiêu quả trứng?'], giai: 'Số quả trứng bà có tất cả là:' },
    // Gộp
    { id: 'cay-vuon', dang: 'gop', ky: KY_CONG_TRU, vat: '🌳', dv: 'cây', ten: 'cây', khung: ['Trong vườn có {x} cây cam.', 'Trong vườn có {y} cây bưởi.', 'Hỏi trong vườn có tất cả bao nhiêu cây?'], giai: 'Số cây trong vườn có tất cả là:' },
    { id: 'hai-lop-trong', dang: 'gop', ky: KY_CONG_TRU, vat: '🌱', dv: 'cây', ten: 'cây', khung: ['Lớp 2A trồng được {x} cây.', 'Lớp 2B trồng được {y} cây.', 'Hỏi cả hai lớp trồng được bao nhiêu cây?'], giai: 'Số cây cả hai lớp trồng được là:' },
    { id: 'hai-gio-tao', dang: 'gop', ky: KY_CONG_TRU, vat: '🍎', dv: 'quả', ten: 'quả táo', khung: ['Giỏ thứ nhất có {x} quả táo.', 'Giỏ thứ hai có {y} quả táo.', 'Hỏi cả hai giỏ có bao nhiêu quả táo?'], giai: 'Số quả táo cả hai giỏ có là:' },
    { id: 'hai-ban-hai', dang: 'gop', ky: KY_CONG_TRU, anh: 'berry', dv: 'quả', ten: 'quả mọng', khung: ['{A} hái được {x} quả mọng.', '{B} hái được {y} quả mọng.', 'Hỏi cả hai bạn hái được bao nhiêu quả mọng?'], giai: 'Số quả mọng cả hai bạn hái được là:' },
    // Bớt
    { id: 'chim-canh', toi_da: 30, dang: 'bot', ky: KY_CONG_TRU, vat: '🐦', dv: 'con', ten: 'con chim', khung: ['Có {x} con chim đậu trên cành.', 'Sau đó {y} con chim bay đi.', 'Hỏi trên cành còn lại bao nhiêu con chim?'], giai: 'Số con chim còn lại là:' },
    { id: 'xe-buyt', toi_da: 45, dang: 'bot', ky: KY_CONG_TRU, vat: '🦕', dv: 'bạn', ten: 'bạn', khung: ['Trên xe buýt có {x} bạn khủng long.', 'Đến điểm dừng, {y} bạn xuống xe.', 'Hỏi trên xe còn lại bao nhiêu bạn?'], giai: 'Số bạn còn lại trên xe là:' },
    { id: 'bong-bay', toi_da: 30, dang: 'bot', ky: KY_CONG_TRU, vat: '🎈', dv: 'quả', ten: 'quả bóng bay', khung: ['{A} có {x} quả bóng bay.', 'Gió thổi bay mất {y} quả.', 'Hỏi {A} còn lại bao nhiêu quả bóng bay?'], giai: 'Số bóng bay {A} còn lại là:' },
    { id: 'banh-dia', toi_da: 20, dang: 'bot', ky: KY_CONG_TRU, vat: '🍪', dv: 'cái', ten: 'cái bánh', khung: ['Trên đĩa có {x} cái bánh.', '{A} và {B} đã ăn {y} cái bánh.', 'Hỏi trên đĩa còn lại mấy cái bánh?'], giai: 'Số bánh còn lại trên đĩa là:' },
    { id: 'ca-ao', dang: 'bot', ky: KY_CONG_TRU, vat: '🐟', dv: 'con', ten: 'con cá', khung: ['Trong ao có {x} con cá.', '{A} câu được {y} con cá.', 'Hỏi trong ao còn lại bao nhiêu con cá?'], giai: 'Số cá còn lại trong ao là:' },
    // Còn lại (có bán, cắt đi, dùng đơn vị đo)
    { id: 'lon-ban', dang: 'con_lai', ky: ['toan-them-bot', 'toan-loi-van-100'], vat: '🐷', dv: 'con', ten: 'con lợn', khung: ['Đàn lợn nhà {A} có {x} con.', 'Mẹ đã bán {y} con lợn.', 'Hỏi đàn lợn nhà {A} còn lại bao nhiêu con?'], giai: 'Số con lợn còn lại là:' },
    { id: 'day-cat', do_luong: true, dang: 'con_lai', ky: ['toan-hon-kem', 'toan-loi-van-100'], vat: '🧶', dv: 'cm', ten: 'cm', khung: ['Sợi dây dài {x} xăng-ti-mét.', '{A} cắt đi {y} xăng-ti-mét.', 'Hỏi sợi dây còn lại dài bao nhiêu xăng-ti-mét?'], giai: 'Sợi dây còn lại dài là:' },
    { id: 'gao-ban', do_luong: true, dang: 'con_lai', ky: ['toan-loi-van-100', 'toan-loi-van-1000'], khoang_1000: [[200, 900], [100, 500]], vat: '🍚', dv: 'kg', ten: 'kg gạo', khung: ['Cửa hàng có {x} ki-lô-gam gạo.', 'Cửa hàng đã bán {y} ki-lô-gam gạo.', 'Hỏi cửa hàng còn lại bao nhiêu ki-lô-gam gạo?'], giai: 'Số gạo cửa hàng còn lại là:' },
    // Nhiều hơn
    { id: 'hoa-do-vang', dang: 'nhieu_hon', ky: KY_NHIEU_IT, vat: '🌼', dv: 'bông', ten: 'bông hoa', khung: ['Có {x} bông hoa màu đỏ.', 'Số hoa màu vàng nhiều hơn số hoa màu đỏ là {y} bông.', 'Hỏi có bao nhiêu bông hoa màu vàng?'], giai: 'Số bông hoa màu vàng là:' },
    { id: 'ga-vit', dang: 'nhieu_hon', ky: KY_NHIEU_IT, vat: '🦆', dv: 'con', ten: 'con vịt', khung: ['Trên sân có {x} con gà.', 'Số vịt nhiều hơn số gà là {y} con.', 'Hỏi trên sân có bao nhiêu con vịt?'], giai: 'Số con vịt trên sân là:' },
    { id: 'vo-so', dang: 'nhieu_hon', ky: KY_NHIEU_IT, vat: '🐚', dv: 'vỏ', ten: 'vỏ sò', khung: ['{A} nhặt được {x} vỏ sò.', '{B} nhặt được nhiều hơn {A} {y} vỏ sò.', 'Hỏi {B} nhặt được bao nhiêu vỏ sò?'], giai: 'Số vỏ sò {B} nhặt được là:' },
    { id: 'hoc-boi', dang: 'nhieu_hon', ky: KY_NHIEU_IT, vat: '🏊', dv: 'bạn', ten: 'bạn nữ', khung: ['Lớp học bơi có {x} bạn nam.', 'Số bạn nữ nhiều hơn số bạn nam là {y} bạn.', 'Hỏi lớp học bơi có bao nhiêu bạn nữ?'], giai: 'Số bạn nữ của lớp học bơi là:' },
    // Ít hơn
    { id: 'thuyen-giay', dang: 'it_hon', ky: KY_NHIEU_IT, vat: '⛵', dv: 'cái', ten: 'cái thuyền', khung: ['{A} gấp được {x} cái thuyền giấy.', '{B} gấp được ít hơn {A} {y} cái.', 'Hỏi {B} gấp được mấy cái thuyền giấy?'], giai: 'Số thuyền {B} gấp được là:' },
    { id: 'tao-gio', dang: 'it_hon', ky: KY_NHIEU_IT, vat: '🍎', dv: 'quả', ten: 'quả táo', khung: ['Giỏ thứ nhất có {x} quả táo.', 'Giỏ thứ hai có ít hơn giỏ thứ nhất {y} quả.', 'Hỏi giỏ thứ hai có bao nhiêu quả táo?'], giai: 'Số quả táo ở giỏ thứ hai là:' },
    { id: 'but-mau', dang: 'it_hon', ky: KY_NHIEU_IT, vat: '🖍️', dv: 'cây', ten: 'cây bút màu', khung: ['{A} có {x} cây bút màu.', '{B} có ít hơn {A} {y} cây bút màu.', 'Hỏi {B} có bao nhiêu cây bút màu?'], giai: 'Số bút màu {B} có là:' },
    { id: 'doi-trong', dang: 'it_hon', ky: KY_NHIEU_IT, vat: '🥁', dv: 'người', ten: 'người', khung: ['Đội Một có {x} người đánh trống.', 'Đội Hai có ít hơn đội Một {y} người.', 'Hỏi đội Hai có bao nhiêu người đánh trống?'], giai: 'Số người đội Hai có là:' },
    // Hơn, kém nhau bao nhiêu
    { id: 'bi', dang: 'hon_kem', ky: ['toan-hon-kem', 'toan-loi-van-100'], vat: '🔵', dv: 'viên', ten: 'viên bi', khung: ['{A} có {x} viên bi.', '{B} có {y} viên bi.', 'Hỏi {A} có nhiều hơn {B} bao nhiêu viên bi?'], giai: '{A} có nhiều hơn {B} số viên bi là:' },
    { id: 'ngo-gui', dang: 'hon_kem', ky: ['toan-hon-kem', 'toan-loi-van-100'], vat: '🌽', dv: 'bắp', ten: 'bắp ngô', khung: ['Anh {A} gùi được {x} bắp ngô.', 'Em {B} gùi được {y} bắp ngô.', 'Hỏi anh gùi nhiều hơn em bao nhiêu bắp ngô?'], giai: 'Anh gùi nhiều hơn em số bắp ngô là:' },
    { id: 'cay-to', dang: 'hon_kem', ky: ['toan-hon-kem', 'toan-loi-van-100'], vat: '🌳', dv: 'cây', ten: 'cây', khung: ['Tổ Một trồng được {x} cây.', 'Tổ Hai trồng được {y} cây.', 'Hỏi tổ Hai trồng được ít hơn tổ Một bao nhiêu cây?'], giai: 'Tổ Hai trồng ít hơn tổ Một số cây là:' },
    { id: 'sach-ke', dang: 'hon_kem', ky: ['toan-hon-kem', 'toan-loi-van-100'], vat: '📘', dv: 'quyển', ten: 'quyển sách', khung: ['Kệ trên có {x} quyển sách.', 'Kệ dưới có {y} quyển sách.', 'Hỏi kệ trên nhiều hơn kệ dưới bao nhiêu quyển sách?'], giai: 'Kệ trên nhiều hơn kệ dưới số sách là:' },
    // Hơn, kém theo SGK Bài 4: "kém", "ngắn hơn", "thấp hơn", "hơn mấy tuổi"; so_be_truoc: đề nói số bé trước ({y} rồi mới {x}),
    // để bé không quen "số đầu trừ số sau" (thẻ nhiễu {y} − {x} bắt lỗi be-tru-lon). khoang: { x: [a, b], y: [a, b] } cho số thật.
    { id: 'be-ca', dang: 'hon_kem', so_be_truoc: true, toi_da: 40, ky: ['toan-hon-kem', 'toan-loi-van-100'], vat: '🐟', dv: 'con', ten: 'con cá', khung: ['Bể nhỏ có {y} con cá.', 'Bể to có {x} con cá.', 'Hỏi số cá ở bể nhỏ kém số cá ở bể to mấy con?'], giai: 'Số cá ở bể nhỏ kém số cá ở bể to là:' },
    { id: 'hoa-chua-to', dang: 'hon_kem', so_be_truoc: true, toi_da: 30, ky: ['toan-hon-kem', 'toan-loi-van-100'], vat: '🌼', dv: 'bông', ten: 'bông hoa', khung: ['Trên tờ giấy có {y} bông hoa chưa tô màu.', '{A} đã tô màu {x} bông hoa.', 'Hỏi số bông hoa chưa tô màu kém số bông hoa đã tô màu mấy bông?'], giai: 'Số bông hoa chưa tô màu kém số bông hoa đã tô màu là:' },
    { id: 'thuyen-kem', dang: 'hon_kem', so_be_truoc: true, toi_da: 40, ky: ['toan-hon-kem', 'toan-loi-van-100'], vat: '⛵', dv: 'cái', ten: 'cái thuyền', khung: ['{A} gấp được {y} cái thuyền giấy.', '{B} gấp được {x} cái thuyền giấy.', 'Hỏi {A} gấp được kém {B} mấy cái thuyền?'], giai: '{A} gấp được kém {B} số thuyền là:' },
    { id: 'tuoi-bo', dang: 'hon_kem', so_be_truoc: true, do_luong: true, khoang: { x: [30, 45], y: [5, 9] }, ky: ['toan-hon-kem', 'toan-loi-van-100'], vat: '🎂', dv: 'tuổi', ten: 'tuổi', khung: ['{A} {y} tuổi.', 'Bố của {A} {x} tuổi.', 'Hỏi bố hơn {A} bao nhiêu tuổi?'], giai: 'Bố hơn {A} số tuổi là:' },
    { id: 'bang-giay', dang: 'hon_kem', do_luong: true, toi_da: 30, ky: ['toan-hon-kem', 'toan-loi-van-100'], vat: '🎀', dv: 'cm', ten: 'cm', khung: ['Băng giấy màu đỏ dài {x} cm.', 'Băng giấy màu vàng dài {y} cm.', 'Hỏi băng giấy màu vàng ngắn hơn băng giấy màu đỏ mấy xăng-ti-mét?'], giai: 'Băng giấy màu vàng ngắn hơn băng giấy màu đỏ là:' },
    { id: 'but-sap', dang: 'hon_kem', so_be_truoc: true, do_luong: true, khoang: { x: [14, 25], y: [5, 12] }, ky: ['toan-hon-kem', 'toan-loi-van-100'], vat: '🖍️', dv: 'cm', ten: 'cm', khung: ['Bút sáp dài {y} cm.', 'Bút chì dài {x} cm.', 'Hỏi bút sáp ngắn hơn bút chì mấy xăng-ti-mét?'], giai: 'Bút sáp ngắn hơn bút chì là:' },
    { id: 'robot-cao', dang: 'hon_kem', do_luong: true, khoang: { x: [45, 99], y: [30, 90] }, ky: ['toan-hon-kem', 'toan-loi-van-100'], vat: '🤖', dv: 'cm', ten: 'cm', khung: ['Rô-bốt A cao {x} cm.', 'Rô-bốt B cao {y} cm.', 'Hỏi rô-bốt B thấp hơn rô-bốt A bao nhiêu xăng-ti-mét?'], giai: 'Rô-bốt B thấp hơn rô-bốt A là:' },
    { id: 'cay-thap', dang: 'hon_kem', so_be_truoc: true, do_luong: true, khoang: { x: [40, 95], y: [20, 70] }, ky: ['toan-hon-kem', 'toan-loi-van-100'], vat: '🌱', dv: 'cm', ten: 'cm', khung: ['Cây ớt cao {y} cm.', 'Cây cà chua cao {x} cm.', 'Hỏi cây ớt thấp hơn cây cà chua bao nhiêu xăng-ti-mét?'], giai: 'Cây ớt thấp hơn cây cà chua là:' },
    // Lúc đầu (có chữ "còn lại", "bán" nhưng phải cộng: bẫy từ khóa như 03a mục 2.18)
    { id: 'bi-cho', dang: 'luc_dau', ky: ['toan-loi-van-100'], vat: '🔵', dv: 'viên', ten: 'viên bi', khung: ['{A} cho {B} {y} viên bi.', 'Sau khi cho, {A} còn lại {x} viên bi.', 'Hỏi lúc đầu {A} có bao nhiêu viên bi?'], giai: 'Lúc đầu {A} có số viên bi là:' },
    { id: 'gao-luc-dau', do_luong: true, dang: 'luc_dau', ky: ['toan-loi-van-100', 'toan-loi-van-1000'], khoang_1000: [[150, 600], [100, 350]], vat: '🍚', dv: 'kg', ten: 'kg gạo', khung: ['Cửa hàng đã bán {y} ki-lô-gam gạo.', 'Cửa hàng còn lại {x} ki-lô-gam gạo.', 'Hỏi lúc đầu cửa hàng có bao nhiêu ki-lô-gam gạo?'], giai: 'Lúc đầu cửa hàng có số gạo là:' },
    { id: 'chim-luc-dau', dang: 'luc_dau', ky: ['toan-loi-van-100'], vat: '🐦', dv: 'con', ten: 'con chim', khung: ['Có {y} con chim đã bay đi.', 'Trên cành còn lại {x} con chim.', 'Hỏi lúc đầu trên cành có bao nhiêu con chim?'], giai: 'Lúc đầu trên cành có số con chim là:' },
    // Nhân: {x} trong mỗi nhóm, có {y} nhóm
    { id: 'dia-cam', dang: 'nhan', ky: ['toan-nhan-chia'], vat: '🍊', dv: 'quả', ten: 'quả cam', khung: ['Mỗi đĩa có {x} quả cam.', 'Có {y} đĩa như thế.', 'Hỏi có tất cả bao nhiêu quả cam?'], giai: 'Số quả cam có tất cả là:' },
    { id: 'xe-dap', dang: 'nhan', ky: ['toan-nhan-chia'], x_co_dinh: [2], vat: '🚲', dv: 'bánh', ten: 'bánh xe', khung: ['Mỗi xe đạp có {x} bánh xe.', 'Có {y} chiếc xe đạp.', 'Hỏi {y} chiếc xe đạp có bao nhiêu bánh xe?'], giai: 'Số bánh xe có tất cả là:' },
    { id: 'ban-hoc', dang: 'nhan', ky: ['toan-nhan-chia'], x_co_dinh: [2], vat: '🦕', dv: 'bạn', ten: 'bạn', khung: ['Mỗi bàn có {x} bạn ngồi.', 'Có {y} bàn như thế.', 'Hỏi có tất cả bao nhiêu bạn?'], giai: 'Số bạn có tất cả là:' },
    { id: 'o-an-quan', dang: 'nhan', ky: ['toan-nhan-chia'], x_co_dinh: [5], vat: '⚪', dv: 'viên', ten: 'viên sỏi', khung: ['Mỗi ô có {x} viên sỏi.', 'Có {y} ô như vậy.', 'Hỏi có tất cả bao nhiêu viên sỏi?'], giai: 'Số viên sỏi có tất cả là:' },
    { id: 'tui-gao', do_luong: true, dang: 'nhan', ky: ['toan-nhan-chia'], x_co_dinh: [5], vat: '🍚', dv: 'kg', ten: 'kg gạo', khung: ['Mỗi túi có {x} ki-lô-gam gạo.', 'Có {y} túi gạo như thế.', 'Hỏi có tất cả bao nhiêu ki-lô-gam gạo?'], giai: 'Số gạo có tất cả là:' },
    { id: 'lo-hoa-nhan', dang: 'nhan', ky: ['toan-nhan-chia'], vat: '🌸', dv: 'bông', ten: 'bông hoa', khung: ['Mỗi lọ có {x} bông hoa.', 'Có {y} lọ hoa như thế.', 'Hỏi có tất cả bao nhiêu bông hoa?'], giai: 'Số bông hoa có tất cả là:' },
    // Chia đều: {x} tất cả, chia đều thành {y} phần
    { id: 'keo-chia-deu', dang: 'chia_deu', ky: KY_CHIA, vat: '🍬', dv: 'cái', ten: 'cái kẹo', khung: ['Có {x} cái kẹo.', 'Chia đều cho {y} bạn.', 'Hỏi mỗi bạn được mấy cái kẹo?'], giai: 'Số kẹo mỗi bạn được là:' },
    { id: 'hoa-cam-deu', dang: 'chia_deu', ky: KY_CHIA, vat: '🌸', dv: 'bông', ten: 'bông hoa', khung: ['Có {x} bông hoa.', 'Cắm đều vào {y} lọ.', 'Hỏi mỗi lọ có mấy bông hoa?'], giai: 'Số bông hoa mỗi lọ có là:' },
    { id: 'vo-ngan', dang: 'chia_deu', ky: KY_CHIA, vat: '📘', dv: 'quyển', ten: 'quyển vở', khung: ['Có {x} quyển vở.', 'Xếp đều vào {y} ngăn.', 'Hỏi mỗi ngăn có mấy quyển vở?'], giai: 'Số vở mỗi ngăn có là:' },
    { id: 'cam-dia-deu', dang: 'chia_deu', ky: KY_CHIA, vat: '🍊', dv: 'quả', ten: 'quả cam', khung: ['Có {x} quả cam.', 'Chia đều vào {y} đĩa.', 'Hỏi mỗi đĩa có mấy quả cam?'], giai: 'Số quả cam mỗi đĩa có là:' },
    // Chia theo nhóm: {x} tất cả, mỗi nhóm {y}
    { id: 'keo-nhom', dang: 'chia_nhom', ky: KY_CHIA, vat: '🍬', dv: 'bạn', ten: 'bạn', khung: ['Có {x} cái kẹo.', 'Chia cho mỗi bạn {y} cái.', 'Hỏi chia được cho mấy bạn?'], giai: 'Số bạn được chia kẹo là:' },
    { id: 'hang-ban', dang: 'chia_nhom', ky: KY_CHIA, vat: '🦕', dv: 'hàng', ten: 'hàng', khung: ['Có {x} bạn khủng long.', 'Xếp thành các hàng, mỗi hàng {y} bạn.', 'Hỏi xếp được mấy hàng?'], giai: 'Số hàng xếp được là:' },
    { id: 'cam-dia-nhom', dang: 'chia_nhom', ky: KY_CHIA, vat: '🍊', dv: 'đĩa', ten: 'đĩa cam', khung: ['Có {x} quả cam.', 'Xếp vào các đĩa, mỗi đĩa {y} quả.', 'Hỏi được mấy đĩa cam như thế?'], giai: 'Số đĩa cam là:' },
    { id: 'hoa-lo-nhom', dang: 'chia_nhom', ky: KY_CHIA, vat: '🌸', dv: 'lọ', ten: 'lọ hoa', khung: ['Có {x} bông hoa.', 'Cắm vào các lọ, mỗi lọ {y} bông.', 'Hỏi cắm được mấy lọ hoa?'], giai: 'Số lọ hoa cắm được là:' },
    // Ki-lô-gam, lít (SGK Bài 15 đến 18): do_luong = số đo, vẽ một hình kèm số đo thay vì đếm từng vật
    { id: 'bao-thoc', toi_da: 60, dang: 'gop', ky: ['toan-kg-lit'], do_luong: true, vat: '🌾', dv: 'kg', ten: 'kg thóc', khung: ['Bao thứ nhất có {x} kg thóc.', 'Bao thứ hai có {y} kg thóc.', 'Hỏi cả hai bao có bao nhiêu ki-lô-gam thóc?'], giai: 'Cả hai bao có số ki-lô-gam thóc là:' },
    { id: 'robot-can', dang: 'nhieu_hon', ky: ['toan-kg-lit'], do_luong: true, vat: '🤖', dv: 'kg', ten: 'kg', khung: ['Rô-bốt A cân nặng {x} kg.', 'Rô-bốt B nặng hơn rô-bốt A {y} kg.', 'Hỏi rô-bốt B cân nặng bao nhiêu ki-lô-gam?'], giai: 'Rô-bốt B cân nặng là:' },
    { id: 'khung-long-can', dang: 'it_hon', ky: ['toan-kg-lit'], do_luong: true, vat: '⚖️', dv: 'kg', ten: 'kg', khung: ['{A} cân nặng {x} kg.', '{B} nhẹ hơn {A} {y} kg.', 'Hỏi {B} cân nặng bao nhiêu ki-lô-gam?'], giai: '{B} cân nặng là:' },
    { id: 'duong-ban', dang: 'con_lai', ky: ['toan-kg-lit'], do_luong: true, vat: '🍬', dv: 'kg', ten: 'kg đường', khung: ['Cửa hàng có {x} kg đường.', 'Cửa hàng đã bán {y} kg đường.', 'Hỏi cửa hàng còn lại bao nhiêu ki-lô-gam đường?'], giai: 'Số ki-lô-gam đường còn lại là:' },
    { id: 'gao-hai-tui', toi_da: 30, dang: 'hon_kem', ky: ['toan-kg-lit'], do_luong: true, vat: '🍚', dv: 'kg', ten: 'kg', khung: ['Túi gạo tẻ nặng {x} kg.', 'Túi gạo nếp nặng {y} kg.', 'Hỏi túi gạo tẻ nặng hơn túi gạo nếp bao nhiêu ki-lô-gam?'], giai: 'Túi gạo tẻ nặng hơn túi gạo nếp là:' },
    { id: 'nuoc-can', toi_da: 20, dang: 'gop', ky: ['toan-kg-lit'], do_luong: true, vat: '💧', dv: 'l', ten: 'l nước', khung: ['Can thứ nhất đựng {x} l nước.', 'Can thứ hai đựng {y} l nước.', 'Hỏi cả hai can đựng bao nhiêu lít nước?'], giai: 'Cả hai can đựng số lít nước là:' },
    { id: 'sua-thung', toi_da: 30, dang: 'bot', ky: ['toan-kg-lit'], do_luong: true, vat: '🥛', dv: 'l', ten: 'l sữa', khung: ['Thùng có {x} l sữa.', 'Mẹ rót ra {y} l sữa.', 'Hỏi thùng còn lại bao nhiêu lít sữa?'], giai: 'Thùng còn lại số lít sữa là:' },
    { id: 'dau-can', toi_da: 20, dang: 'them', ky: ['toan-kg-lit'], do_luong: true, vat: '🫙', dv: 'l', ten: 'l dầu', khung: ['Trong can có {x} l dầu.', 'Bố đổ thêm {y} l dầu vào can.', 'Hỏi trong can có tất cả bao nhiêu lít dầu?'], giai: 'Trong can có tất cả số lít dầu là:' },
    { id: 'xo-nuoc', toi_da: 20, dang: 'hon_kem', ky: ['toan-kg-lit'], do_luong: true, vat: '🪣', dv: 'l', ten: 'l', khung: ['Xô to đựng {x} l nước.', 'Xô bé đựng {y} l nước.', 'Hỏi xô to đựng nhiều hơn xô bé bao nhiêu lít nước?'], giai: 'Xô to đựng nhiều hơn xô bé là:' },
    // Trong phạm vi 1000 (SGK Bài 59 đến 63, 70): khoang_1000 = [[x nhỏ nhất, x lớn nhất], [y nhỏ nhất, y lớn nhất]] cho số thật
    // (sư tử con 107 kg, vườn ươm 456 cây); số chọn như cong-tru-1000 (nhớ không quá một lượt)
    { id: 'su-tu-ho', dang: 'nhieu_hon', ky: ['toan-loi-van-1000'], do_luong: true, khoang_1000: [[101, 180], [12, 60]], vat: '🐯', dv: 'kg', ten: 'kg', khung: ['Sư tử con nặng {x} kg.', 'Hổ con nặng hơn sư tử con {y} kg.', 'Hỏi hổ con nặng bao nhiêu ki-lô-gam?'], giai: 'Hổ con nặng là:' },
    { id: 'vuon-uom', dang: 'con_lai', ky: ['toan-loi-van-1000'], khoang_1000: [[300, 900], [100, 500]], vat: '🌱', dv: 'cây', ten: 'cây giống', khung: ['Vườn ươm có {x} cây giống.', 'Người ta lấy đi {y} cây giống để trồng.', 'Hỏi vườn ươm còn lại bao nhiêu cây giống?'], giai: 'Số cây giống còn lại là:' },
    { id: 'thu-vien', dang: 'them', ky: ['toan-loi-van-1000'], khoang_1000: [[200, 700], [50, 300]], vat: '📚', dv: 'quyển', ten: 'quyển sách', khung: ['Thư viện có {x} quyển sách.', 'Thư viện mua thêm {y} quyển sách.', 'Hỏi thư viện có tất cả bao nhiêu quyển sách?'], giai: 'Số sách thư viện có tất cả là:' },
    { id: 'hai-chang', dang: 'gop', ky: ['toan-loi-van-1000'], do_luong: true, khoang_1000: [[101, 500], [100, 400]], vat: '🚌', dv: 'km', ten: 'km', khung: ['Chặng đường thứ nhất dài {x} km.', 'Chặng đường thứ hai dài {y} km.', 'Hỏi cả hai chặng đường dài bao nhiêu ki-lô-mét?'], giai: 'Cả hai chặng đường dài là:' },
    { id: 'vai-ban', dang: 'con_lai', ky: ['toan-loi-van-1000'], do_luong: true, khoang_1000: [[200, 800], [100, 400]], vat: '🧵', dv: 'm', ten: 'm vải', khung: ['Cửa hàng có {x} m vải.', 'Cửa hàng đã bán {y} m vải.', 'Hỏi cửa hàng còn lại bao nhiêu mét vải?'], giai: 'Số mét vải cửa hàng còn lại là:' },
    { id: 'hai-kho', dang: 'hon_kem', ky: ['toan-loi-van-1000'], do_luong: true, khoang_1000: [[300, 900], [100, 600]], vat: '🍚', dv: 'kg', ten: 'kg gạo', khung: ['Kho thứ nhất có {x} kg gạo.', 'Kho thứ hai có {y} kg gạo.', 'Hỏi kho thứ hai có ít hơn kho thứ nhất bao nhiêu ki-lô-gam gạo?'], giai: 'Kho thứ hai có ít hơn kho thứ nhất là:' },
    { id: 'cau-dai', dang: 'hon_kem', so_be_truoc: true, ky: ['toan-loi-van-1000'], do_luong: true, khoang_1000: [[200, 900], [100, 600]], vat: '🌉', dv: 'm', ten: 'm', khung: ['Cây cầu thứ nhất dài {y} m.', 'Cây cầu thứ hai dài {x} m.', 'Hỏi cây cầu thứ nhất ngắn hơn cây cầu thứ hai bao nhiêu mét?'], giai: 'Cây cầu thứ nhất ngắn hơn cây cầu thứ hai là:' },
    { id: 'hai-truong', dang: 'it_hon', ky: ['toan-loi-van-1000'], khoang_1000: [[300, 900], [50, 250]], vat: '🎒', dv: 'học sinh', ten: 'học sinh', khung: ['Trường thứ nhất có {x} học sinh.', 'Trường thứ hai có ít hơn trường thứ nhất {y} học sinh.', 'Hỏi trường thứ hai có bao nhiêu học sinh?'], giai: 'Số học sinh trường thứ hai có là:' },
    // Tiền Việt Nam (SGK Bài 56, 58): tờ 100, 200, 500, 1 000 đồng, số tiền là số tròn trăm đến 1 000
    { id: 'mua-keo', dang: 'con_lai', ky: ['toan-tien'], do_luong: true, vat: '👛', dv: 'đồng', ten: 'đồng', khung: ['{A} có {x} đồng.', '{A} mua một gói kẹo hết {y} đồng.', 'Hỏi {A} còn lại bao nhiêu tiền?'], giai: 'Số tiền {A} còn lại là:' },
    { id: 'but-vo', dang: 'gop', ky: ['toan-tien'], do_luong: true, vat: '✏️', dv: 'đồng', ten: 'đồng', khung: ['Một chiếc bút chì giá {x} đồng.', 'Một quyển vở giá {y} đồng.', 'Hỏi mua cả bút chì và vở hết bao nhiêu tiền?'], giai: 'Mua cả bút chì và vở hết số tiền là:' },
    { id: 'me-cho', dang: 'them', ky: ['toan-tien'], do_luong: true, vat: '👛', dv: 'đồng', ten: 'đồng', khung: ['{A} có {x} đồng.', 'Mẹ cho {A} thêm {y} đồng.', 'Hỏi {A} có tất cả bao nhiêu tiền?'], giai: 'Số tiền {A} có tất cả là:' },
    { id: 'dieu-bong', dang: 'nhieu_hon', ky: ['toan-tien'], do_luong: true, vat: '🪁', dv: 'đồng', ten: 'đồng', khung: ['Một quả bóng giá {x} đồng.', 'Một con diều đắt hơn quả bóng {y} đồng.', 'Hỏi con diều giá bao nhiêu tiền?'], giai: 'Con diều có giá là:' },
    { id: 'kem-banh', dang: 'it_hon', ky: ['toan-tien'], do_luong: true, vat: '🍦', dv: 'đồng', ten: 'đồng', khung: ['Một cái bánh giá {x} đồng.', 'Một que kem rẻ hơn cái bánh {y} đồng.', 'Hỏi que kem giá bao nhiêu tiền?'], giai: 'Que kem có giá là:' },
    { id: 'hai-ban-tien', dang: 'hon_kem', ky: ['toan-tien'], do_luong: true, vat: '👛', dv: 'đồng', ten: 'đồng', khung: ['{A} có {x} đồng.', '{B} có {y} đồng.', 'Hỏi {A} có nhiều hơn {B} bao nhiêu tiền?'], giai: '{A} có nhiều hơn {B} số tiền là:' }
  ];
  const MAU_THEO_ID = {};
  MAU.forEach(function (m) { m.phep = PHEP_DANG[m.dang]; MAU_THEO_ID[m.id] = m; });

  /** Tỉ lệ các dạng trong một kỹ năng: màn nào cũng trộn phép để bé không đoán phép theo tên màn. */
  const DANG_THEO_KY = {
    'toan-hon-kem': { hon_kem: 2, gop: 1, them: 0.7, bot: 0.7, con_lai: 0.4 },
    'toan-them-bot': { them: 1, gop: 0.6, bot: 1, con_lai: 0.4 },
    'toan-nhieu-it': { nhieu_hon: 1, it_hon: 1 },
    'toan-loi-van-100': { them: 1, gop: 1, bot: 1, con_lai: 1, nhieu_hon: 0.8, it_hon: 0.8, hon_kem: 0.8, luc_dau: 0.9 },
    'chia-y-nghia': { chia_deu: 1, chia_nhom: 1 },
    'toan-nhan-chia': { nhan: 1, chia_deu: 1, chia_nhom: 1 },
    'toan-kg-lit': { gop: 1, them: 0.8, bot: 0.8, con_lai: 1, nhieu_hon: 0.8, it_hon: 0.8, hon_kem: 0.6 },
    'toan-tien': { gop: 1, them: 0.7, con_lai: 1.2, nhieu_hon: 0.8, it_hon: 0.8, hon_kem: 0.7 },
    'toan-loi-van-1000': { them: 1, gop: 1, con_lai: 1.2, nhieu_hon: 0.8, it_hon: 0.8, hon_kem: 1, luc_dau: 0.6 }
  };
  /** Đề có toi_da nhỏ hơn mức này thì không dùng cho kỹ năng (đĩa 20 cái bánh không hợp bài toán số có hai chữ số). */
  const TOI_THIEU_LV = { 'toan-hon-kem': 30, 'toan-loi-van-100': 30 };
  function hopKyNang(kn, m) { return m.ky.indexOf(kn) >= 0 && !(m.toi_da && TOI_THIEU_LV[kn] && m.toi_da < TOI_THIEU_LV[kn]); }

  const TEN_NV = ['Rex', 'Mây', 'Tốc Long', 'Khủng Long Lửa', 'Giáp Long', 'Rồng Biển', 'Mỏ Vịt Long', 'Tam Giác Long', 'Long Cổ Dài', 'Kiếm Long', 'Gai Long', 'Dực Long'];

  /** Hai số có hai chữ số, cộng hoặc trừ không nhớ, không quá toiDa (đề có số thật nhỏ như khay 30 quả trứng). */
  function soHaiCsKhongNho(rng, p, toiDa) {
    for (let thu = 0; thu < 300; thu++) {
      if (p === '+') {
        const a = nn(rng, 11, Math.max(11, toiDa - 10)), b = nn(rng, 10, Math.max(10, toiDa - a));
        if (a + b <= toiDa && dv(a) + dv(b) <= 9) return [a, b];
      } else {
        const a2 = nn(rng, 20, toiDa), b2 = nn(rng, 10, a2 - 5);
        if (dv(b2) <= dv(a2)) return [a2, b2];
      }
    }
    return p === '+' ? [10, Math.max(10, toiDa - 10)] : [toiDa, 10];
  }
  /** Hai số trong khoảng của đề (khoang), cộng trừ trong 100; có nhớ nếu kỹ năng là bài toán có nhớ (toan-loi-van-100). */
  function soTheoKhoang(kn, mau, rng) {
    const k = mau.khoang, p = mau.phep, canNho = kn === 'toan-loi-van-100';
    let du = null;
    for (let thu = 0; thu < 400; thu++) {
      const x = nn(rng, k.x[0], k.x[1]), y = nn(rng, k.y[0], k.y[1]);
      const kq = tinhPhep(x, p, y);
      if ((p === '-' && x <= y) || kq > 100) continue;
      du = du || [x, y];
      const nho = p === '+' ? dv(x) + dv(y) >= 10 : dv(x) < dv(y);
      if (nho === canNho) return [x, y];
    }
    return du || [k.x[1], k.y[0]];
  }
  /** Hai số cho bài toán trong phạm vi 1000 theo khoảng của đề, nhớ không quá một lượt, ba nhóm đều nhau như cong-tru-1000. */
  function soLoiVan1000(mau, rng) {
    const p = mau.phep;
    const k = mau.khoang_1000 || [[110, 899], [12, 899]];
    const nhom = nn(rng, 0, 2);
    let du = null;
    for (let thu = 0; thu < 800; thu++) {
      const x = nn(rng, k[0][0], k[0][1]), y = nn(rng, k[1][0], k[1][1]);
      if ((x <= 100 && y <= 100) || !hopLe1000(x, p, y)) continue;
      du = du || [x, y];
      const n = nhoBaChuSo(x, p, y);
      if ((n.dv ? 1 : n.chuc ? 2 : 0) === nhom) return [x, y];
    }
    return du || (p === '+' ? [345, 123] : [456, 148]);
  }

  /** Hai số theo phạm vi của kỹ năng và phép tính của đề (và số thật của đề: toi_da, khoang, khoang_1000). */
  function soLoiVan(kn, mau, rng) {
    const p = mau.phep;
    if (kn === 'toan-loi-van-1000') return soLoiVan1000(mau, rng);
    if (mau.khoang && (kn === 'toan-hon-kem' || kn === 'toan-loi-van-100' || kn === 'toan-kg-lit')) return soTheoKhoang(kn, mau, rng);
    if (kn === 'toan-them-bot' || kn === 'toan-nhieu-it') {
      const r = rng();
      if (p === '+') {
        if (r < 0.6) { const c = chon(rng, CAP_CONG_QUA_10); return [c[0], c[1]]; }
        if (r < 0.8) { const x = nn(rng, 2, 8); return [x, 10 - x]; }
        const x2 = nn(rng, 11, 16); return [x2, nn(rng, 2, 9 - dv(x2))];
      }
      // Bài 9 (thêm, bớt) học trước trừ qua 10 (Bài 11): chỉ trừ không qua 10 như SGK (10 − 3, 15 − 5, 14 − 3)
      if (kn === 'toan-them-bot') {
        if (r < 0.4) return [10, nn(rng, 2, 8)];
        const x4 = nn(rng, 12, 19); return [x4, rng() < 0.5 ? dv(x4) : nn(rng, 1, dv(x4) - 1)];
      }
      if (r < 0.6) { const t = chon(rng, CAP_TRU_QUA_10); return [t[0], t[1]]; }
      if (r < 0.8) { const x3 = nn(rng, 12, 19); return [x3, rng() < 0.5 ? dv(x3) : nn(rng, 1, dv(x3) - 1)]; }
      return [10, nn(rng, 2, 8)];
    }
    if (kn === 'toan-hon-kem') {
      if (mau.toi_da && mau.toi_da < 99) return soHaiCsKhongNho(rng, p, mau.toi_da);
      for (;;) {
        if (p === '+') {
          const a = nn(rng, 12, 76), b = nn(rng, 11, 60);
          if (a + b <= 99 && dv(a) + dv(b) <= 9) return [a, b];
        } else {
          const a2 = nn(rng, 25, 99), b2 = nn(rng, 10, a2 - 5);
          if (dv(b2) <= dv(a2)) return [a2, b2];
        }
      }
    }
    if (kn === 'toan-kg-lit') {
      // Bài 15 đến 18 học trước cộng, trừ có nhớ trong 100: số trong 20 qua 10, hoặc số có hai chữ số không nhớ (như SGK).
      // Đề có toi_da (can 20 l, túi gạo 30 kg) thì số không vượt quá: toi_da từ 20 trở xuống chỉ dùng số trong 20
      if (mau.toi_da && mau.toi_da <= 20) return soLoiVan('toan-nhieu-it', mau, rng);
      if (rng() < 0.45) return soLoiVan('toan-nhieu-it', mau, rng);
      return soLoiVan('toan-hon-kem', mau, rng);
    }
    if (kn === 'toan-tien') {
      for (;;) {
        const a = nn(rng, 2, 9), b = nn(rng, 1, 8);
        if (p === '+' && a + b <= 10) return [a * 100, b * 100];
        if (p === '-' && rng() < 0.15) return [1000, b * 100];
        if (p === '-' && a > b) return [a * 100, b * 100];
      }
    }
    if (kn === 'toan-loi-van-100') {
      let so = null;
      for (let thu = 0; thu < 300; thu++) {
        const ct = SINH_PT[p === '+' ? (rng() < 0.7 ? 'cong-nho-2cs-2cs' : 'cong-nho-2cs-1cs') : (rng() < 0.7 ? 'tru-nho-2cs-2cs' : 'tru-nho-2cs-1cs')](rng);
        so = [ct.so[0], ct.so[1]];
        if (!mau.toi_da || Math.max(so[0], so[1], tinhPhep(so[0], p, so[1])) <= mau.toi_da) return so;
      }
      return so;
    }
    if (kn === 'chia-y-nghia') {
      if (p === '×') return [nn(rng, 2, 5), nn(rng, 2, 5)];
      const y = nn(rng, 2, 5), d = nn(rng, 2, 5);
      return [y * d, y];
    }
    // toan-nhan-chia: số trong bảng nhân, chia 2 và 5
    if (p === '×') return [chon(rng, mau.x_co_dinh || [2, 5]), nn(rng, 2, 10)];
    const y2 = chon(rng, [2, 5]), d2 = nn(rng, 2, 10);
    return [y2 * d2, y2];
  }

  function sinhLoiVan(kn, rng, muc) {
    const tiLe = (muc && muc.dang_bai) || DANG_THEO_KY[kn];
    const dsDang = Object.keys(tiLe).filter(function (dg) { return MAU.some(function (m) { return m.dang === dg && hopKyNang(kn, m); }); });
    const dang = chonTheoTrongSo(rng, dsDang.map(function (dg) { return { dg: dg, w: tiLe[dg] }; })).dg;
    const mau = chon(rng, MAU.filter(function (m) { return m.dang === dang && hopKyNang(kn, m); }));
    const so = soLoiVan(kn, mau, rng);
    const a = chon(rng, TEN_NV);
    let b = chon(rng, TEN_NV);
    if (b === a) b = TEN_NV[(TEN_NV.indexOf(a) + 3) % TEN_NV.length];
    return { loai: 'loi_van', mau: mau.id, dang: mau.dang, phep: mau.phep, so: so, nv: [a, b] };
  }

  /** Số trong bài toán: số tiền từ 1 000 viết cách nhóm ba chữ số như SGK ("1 000 đồng"). */
  function soLV(ct, n) {
    const mau = MAU_THEO_ID[ct.mau];
    return mau && mau.dv === 'đồng' && n >= 1000 ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0') : String(n);
  }
  function dien(s, ct) {
    return s.replace(/\{x\}/g, soLV(ct, ct.so[0])).replace(/\{y\}/g, soLV(ct, ct.so[1])).replace(/\{A\}/g, ct.nv[0]).replace(/\{B\}/g, ct.nv[1]);
  }
  function khungLV(ct) { return MAU_THEO_ID[ct.mau].khung.map(function (k) { return dien(k, ct); }); }
  function ctPhep(ct) { return { phep: ct.phep, so: [ct.so[0], ct.so[1]], an: 'ket_qua' }; }
  function bieuThuc(ct) { return ct.so[0] + kyHieu(ct.phep, true) + ct.so[1]; }
  function tinhLV(ct) { return tinhPhep(ct.so[0], ct.phep, ct.so[1]); }
  function maLV(ct) { return ct.mau + ':' + bieuThuc(ct); }

  /**
   * Các thẻ phép tính ở bước 1 (thẻ đúng và thẻ nhiễu mang mã lỗi). Phép trừ có 3 thẻ: thêm thẻ lấy số bé trừ số lớn
   * ({y} − {x}, lỗi be-tru-lon). Phép cộng giữ 2 thẻ: đổi chỗ hai số hạng (y + x) vẫn đúng nên không bao giờ làm thẻ nhiễu,
   * còn thẻ trừ theo thứ tự ngược lại là phép trừ số bé cho số lớn, lớp 2 chưa gặp.
   */
  function luaChonBuoc1(ct, rng) {
    const x = ct.so[0], y = ct.so[1];
    const dung = bieuThuc(ct);
    const ds = [{ gia_tri: dung, loi: [] }];
    const them = function (v) { if (v !== dung && !ds.some(function (o) { return o.gia_tri === v; })) ds.push({ gia_tri: v, loi: loiBuoc1(ct, v) }); };
    if (ct.phep === '+') them(x >= y ? x + '-' + y : y + '-' + x);
    else if (ct.phep === '-') { them(x + '+' + y); if (x !== y) them(y + '-' + x); }
    else if (ct.phep === '×') {
      if (x !== y) them(y + 'x' + x); else them(x + ':' + y);
      them(x + '+' + y);
    } else {
      them(x + 'x' + y);
      them(rng() < 0.3 ? y + ':' + x : x + '-' + y);
    }
    return tron(rng, ds);
  }

  /** Lỗi ở bước chọn phép tính. */
  function loiBuoc1(ct, v) {
    const s = String(v).replace(/\s+/g, '').replace(/×/g, 'x').replace(/−/g, '-');
    if (s === bieuThuc(ct)) return [];
    const m = s.match(/^(\d+)([+\-x:])(\d+)$/);
    if (!m) return ['khac'];
    const p = m[2] === 'x' ? '×' : m[2];
    const a = Number(m[1]), b = Number(m[3]);
    const x = ct.so[0], y = ct.so[1];
    if (p === ct.phep) {
      if ((ct.phep === '×' || ct.phep === ':') && a === y && b === x) return ['dao-thu-tu'];
      if (ct.phep === '+' && a === y && b === x) return [];
      if (ct.phep === '-' && a === y && b === x) return ['be-tru-lon'];
      return ['khac'];
    }
    const ma = ['sai-phep'];
    if (ct.phep === '×' && p === '+') ma.push('cong-thay-nhan');
    if (ct.phep === ':' && p === '×') ma.push('nhan-thay-chia');
    if (ct.phep === ':' && p === '-') ma.push('tru-thay-chia');
    return ma;
  }

  const LY_DO_PHEP = {
    them: 'Thêm vào thì nhiều lên, con làm phép cộng',
    gop: 'Hỏi tất cả, cả hai thì gộp lại: phép cộng',
    nhieu_hon: 'Nhiều hơn thì thêm vào: phép cộng',
    luc_dau: 'Lúc đầu có nhiều hơn lúc sau: lấy số còn lại cộng với số đã bớt đi',
    bot: 'Bớt đi thì ít đi, con làm phép trừ',
    con_lai: 'Hỏi còn lại bao nhiêu thì bớt đi: phép trừ',
    it_hon: 'Ít hơn thì bớt đi: phép trừ',
    hon_kem: 'Muốn biết hơn, kém nhau bao nhiêu thì lấy số lớn trừ số bé',
    nhan: 'Các nhóm bằng nhau, có mấy nhóm như thế: phép nhân',
    chia_deu: 'Chia đều thành các phần bằng nhau: phép chia',
    chia_nhom: 'Chia thành các nhóm bằng nhau rồi đếm số nhóm: phép chia'
  };

  function loiNoiBuoc1(ct, v, maLoi) {
    const m = (maLoi && maLoi[0]) || 'khac';
    if (m === 'dao-thu-tu') return ct.phep === '×' ? ct.so[0] + ' được lấy ' + ct.so[1] + ' lần, viết ' + ct.so[0] + ' × ' + ct.so[1] : 'Số bị chia là số tất cả, viết trước: ' + ct.so[0] + ' : ' + ct.so[1];
    if (m === 'be-tru-lon') return 'Phép trừ lấy số lớn trừ số bé: ' + soLV(ct, ct.so[0]) + ' ' + TRU + ' ' + soLV(ct, ct.so[1]);
    return LY_DO_PHEP[ct.dang] || LOI['sai-phep'].be;
  }

  function goiYLV(ct) {
    const k = khungLV(ct);
    const dau = { them: 'Số ' + MAU_THEO_ID[ct.mau].ten + ' nhiều lên hay ít đi?', gop: 'Bài hỏi tất cả là bao nhiêu?', bot: 'Số ' + MAU_THEO_ID[ct.mau].ten + ' nhiều lên hay ít đi?', con_lai: 'Bài hỏi còn lại bao nhiêu?', nhieu_hon: 'Bạn có nhiều hơn thì số của bạn ấy lớn hơn hay bé hơn?', it_hon: 'Bạn có ít hơn thì số của bạn ấy lớn hơn hay bé hơn?', hon_kem: 'Bài hỏi hai số hơn, kém nhau bao nhiêu.', luc_dau: 'Lúc đầu nhiều hơn hay ít hơn lúc sau?', nhan: 'Các nhóm có bằng nhau không? Có mấy nhóm?', chia_deu: 'Chia đều nghĩa là các phần bằng nhau.', chia_nhom: 'Mỗi nhóm có mấy? Bài hỏi có mấy nhóm.' }[ct.dang];
    return ['Đọc lại khung 3: ' + k[2], dau, LY_DO_PHEP[ct.dang] + '.'];
  }

  function loiGiaiLV(ct) {
    const mau = MAU_THEO_ID[ct.mau];
    const d = tinhLV(ct);
    return {
      ma: 'bai-giai',
      buoc: [dien(mau.giai, ct), soLV(ct, ct.so[0]) + ' ' + kyHieu(ct.phep) + ' ' + soLV(ct, ct.so[1]) + ' = ' + soLV(ct, d) + ' (' + mau.dv + ')', 'Đáp số: ' + soLV(ct, d) + ' ' + mau.ten + '.'],
      kq: d
    };
  }

  /* ============================================================
     Chọn đúng loại câu
     ============================================================ */

  function loaiCt(ct) { return ct && ct.loai ? ct.loai : 'phep_tinh'; }

  /* ---------------- Loại câu cắm thêm (giai đoạn 4, 5) ----------------
     Các tệp js/cau-*.js đăng ký loại câu mới bằng NganHang.dangKyLoai(loai, impl) và kỹ năng mới bằng
     NganHang.themKyNang(ma, dinhNghia). impl gồm:
       tinh(ct)                        đáp án đúng (số, hoặc chuỗi chuẩn hóa như '<', '8:15', '12,25,31')
       de(ct), deDoc(ct)               đề hiện trên màn hình và đề để đọc
       deChuanHoa(ct)                  phần cuối của mã câu (không khoảng trắng, ổn định giữa các game)
       nhanBietLoi(ct, v, buoc)        [] nếu v đúng, danh sách mã lỗi nếu sai, ['khac'] nếu không nhận ra
       loiNoi(ct, v, maLoi, buoc)      câu game nói với bé khi bé chọn v
       goiY(ct)                        ba cấp gợi ý (mảng 3 chuỗi)
       loiGiai(ct)                     { ma, buoc: [...], html (tùy chọn, hình minh họa), kq }
       ketLuan(ct)                     câu chốt ở màn "Gần đúng rồi"
     Tùy chọn:
       theChu(ct)                      chữ trên thẻ (Lật Thẻ); mặc định là đề bỏ "= ?"
       taoNhieu(kyNang, ct, rng)       đáp án nhiễu [{ gia_tri, loi }]; mặc định dùng ungVienNhieu và lệch nhỏ (đáp án số)
       ungVienNhieu(kyNang, ct)        ứng viên nhiễu có tên lỗi [{ v, w }] cho đáp án số
       hienGiaTri(v, ct)               chữ hiện cho một giá trị bé chọn (mặc định hienGiaTri)
       veHinh(ct)                      HTML/SVG minh họa đề (tia số, hình, đồng hồ…), '' nếu không có
       veLuaChon(ct, v)                { nhan, hinh (HTML nhỏ), dong_ho: { h, m } } để game vẽ một lựa chọn
       dang                            dạng câu mặc định (chuỗi hoặc hàm(ct)): 'chon_dap_an', 'keo_tha', …
       moRong(q, ct, rng)              thêm trường riêng của loại câu vào câu đã dựng (dữ liệu cảnh chơi)
  */
  const LOAI_RIENG = {};
  function dangKyLoai(loai, impl) {
    if (!loai || !impl || typeof impl.tinh !== 'function') throw new Error('Loại câu không hợp lệ: ' + loai);
    LOAI_RIENG[loai] = impl;
  }
  function implCua(ct) { return LOAI_RIENG[loaiCt(ct)] || null; }

  /** Thêm kỹ năng: d = { noi_dung, ten, kieu, giay, gioi_han, loai, bai_hoc, nhieu_toi_da, sinh(rng, muc) }. */
  function themKyNang(ma, d) {
    if (!d || typeof d.sinh !== 'function') throw new Error('Kỹ năng thiếu hàm sinh: ' + ma);
    const kn = {};
    Object.keys(d).forEach(function (k) { if (k !== 'sinh') kn[k] = d[k]; });
    if (!kn.noi_dung || !NOI_DUNG[kn.noi_dung]) throw new Error('Kỹ năng ' + ma + ' có mã nội dung lạ: ' + kn.noi_dung);
    KY_NANG[ma] = kn;
    SINH[ma] = d.sinh;
    if (THU_TU_KY_NANG.indexOf(ma) < 0) THU_TU_KY_NANG.push(ma);
  }
  function themLoi(ma, d) { LOI[ma] = { be: d.be, mo_ta: d.mo_ta, ngan: d.ngan || d.be }; }
  function themNoiDung(ma, ten, tienQuyet) { NOI_DUNG[ma] = ten; if (tienQuyet) TIEN_QUYET[ma] = tienQuyet; }

  /** Đáp án đúng của một cấu trúc câu. */
  function tinh(ct) {
    const im = implCua(ct);
    if (im) return im.tinh(ct);
    const l = loaiCt(ct);
    if (l === 'so') return tinhSo(ct);
    if (l === 'nhan_tong') return tinhNT(ct);
    if (l === 'loi_van') return tinhLV(ct);
    return tinhPT(ct);
  }

  /** Đề hiển thị: "36 + 27 = ?", "Số liền sau của 39 là ?", câu chuyện đủ ba khung... */
  function deHien(ct) {
    const im = implCua(ct);
    if (im) return im.de(ct);
    const l = loaiCt(ct);
    if (l === 'so') return deSo(ct);
    if (l === 'nhan_tong') return deNT(ct);
    if (l === 'loi_van') return khungLV(ct).join(' ');
    return dePT(ct);
  }

  /** Đề chuẩn hóa cho mã câu: bỏ khoảng trắng, dấu trừ ASCII, dấu nhân x. */
  function deChuanHoa(ct) {
    const im = implCua(ct);
    if (im) return im.deChuanHoa(ct);
    const l = loaiCt(ct);
    if (l === 'so') return maSo(ct);
    if (l === 'nhan_tong') return maNT(ct);
    if (l === 'loi_van') return maLV(ct);
    return deChuanHoaPT(ct);
  }

  /** Đề để đọc bằng giọng nói. */
  function deDoc(ct) {
    const im = implCua(ct);
    if (im) return im.deDoc ? im.deDoc(ct) : im.de(ct);
    const l = loaiCt(ct);
    if (l === 'so') return deDocSo(ct);
    if (l === 'nhan_tong') return deDocNT(ct);
    if (l === 'loi_van') return khungLV(ct).join(' ');
    return deDocPT(ct);
  }

  function maCau(kyNang, ct) { return KY_NANG[kyNang].noi_dung + '|' + kyNang + '|' + deChuanHoa(ct); }

  /** Mã lỗi của đáp án v (03a mục 3.3). Bài toán có lời văn: buoc 1 là phép tính bé chọn, buoc 2 (mặc định) là kết quả. */
  function nhanBietLoi(ct, v, buoc) {
    const im = implCua(ct);
    if (im) return im.nhanBietLoi(ct, v, buoc);
    const l = loaiCt(ct);
    if (l === 'so') return nhanBietLoiSo(ct, v);
    if (l === 'nhan_tong') return nhanBietLoiNT(ct, v);
    if (l === 'loi_van') return buoc === 1 ? loiBuoc1(ct, v) : nhanBietLoiPT(ctPhep(ct), v);
    return nhanBietLoiPT(ct, v);
  }

  /** Câu game nói với bé khi bé chọn v (dùng tên lỗi đầu tiên). */
  function loiNoiVoiBe(ct, v, maLoi, buoc) {
    const im = implCua(ct);
    if (im) return im.loiNoi ? im.loiNoi(ct, v, maLoi, buoc) : (LOI[(maLoi && maLoi[0]) || 'khac'] || LOI.khac).be;
    const l = loaiCt(ct);
    if (l === 'so') return loiNoiSo(ct, v, maLoi);
    if (l === 'nhan_tong') return loiNoiNT(ct, v, maLoi);
    if (l === 'loi_van') return buoc === 1 ? loiNoiBuoc1(ct, v, maLoi) : loiNoiPT(ctPhep(ct), v, maLoi);
    return loiNoiPT(ct, v, maLoi);
  }

  function goiY(ct) {
    const im = implCua(ct);
    if (im) return im.goiY(ct);
    const l = loaiCt(ct);
    if (l === 'so') return goiYSo(ct);
    if (l === 'nhan_tong') return goiYNT(ct);
    if (l === 'loi_van') return goiYLV(ct);
    return goiYPT(ct);
  }

  function loiGiai(ct) {
    const im = implCua(ct);
    if (im) return im.loiGiai(ct);
    const l = loaiCt(ct);
    if (l === 'so') return loiGiaiSo(ct);
    if (l === 'nhan_tong') return loiGiaiNT(ct);
    if (l === 'loi_van') return loiGiaiLV(ct);
    return loiGiaiPT(ct);
  }

  /** Câu chốt lại đáp án ở màn "Gần đúng rồi". */
  function ketLuan(ct) {
    const im = implCua(ct);
    if (im) return im.ketLuan ? im.ketLuan(ct) : 'Đáp án đúng là ' + hienGiaTriCau(ct, im.tinh(ct));
    const l = loaiCt(ct);
    if (l === 'so') return ketLuanSo(ct);
    if (l === 'nhan_tong') return 'Vậy ' + hienGiaTri(chuoiTong(ct.a, ct.b)) + ' = ' + ct.a + ' × ' + ct.b;
    if (l === 'loi_van') { const mau = MAU_THEO_ID[ct.mau]; return 'Đáp số: ' + soLV(ct, tinhLV(ct)) + ' ' + mau.ten + '.'; }
    return 'Vậy ' + dePT(ct).replace('?', String(tinhPT(ct)));
  }

  /** Chữ trên thẻ (Lật Thẻ): phép tính không kèm "= ?", hoặc cách nói số. */
  function theChu(ct) {
    const im = implCua(ct);
    if (im) return im.theChu ? im.theChu(ct) : String(im.de(ct)).replace(/ = \?$/, '');
    const l = loaiCt(ct);
    if (l === 'so') return theSo(ct);
    if (l === 'nhan_tong') return theNT(ct);
    if (l === 'loi_van') return khungLV(ct)[2];
    return dePT(ct).replace(/ = \?$/, '');
  }

  /** Chữ hiện cho một giá trị của câu (ví dụ '8:15' thành "8 giờ 15 phút" với câu đồng hồ). */
  function hienGiaTriCau(ct, v) {
    const im = implCua(ct);
    if (im && im.hienGiaTri) return im.hienGiaTri(v, ct);
    return hienGiaTri(v);
  }

  /** HTML/SVG minh họa đề ('' nếu đề chỉ có chữ): tia số, tranh các nhóm, hình, đồng hồ… */
  function veHinh(ct) {
    const im = implCua(ct);
    if (im) return im.veHinh ? im.veHinh(ct) || '' : '';
    return '';
  }

  /** Cách vẽ một lựa chọn: { nhan, hinh?, dong_ho? } (game cũ dùng để ghi lên vòng lửa, quả, thiên thạch…). */
  function veLuaChon(ct, v) {
    const im = implCua(ct);
    if (im && im.veLuaChon) return im.veLuaChon(ct, v);
    return { nhan: hienGiaTriCau(ct, v) };
  }

  function hopLe(v, d, gioiHan) { return Number.isInteger(v) && v >= 0 && v <= gioiHan && v !== d; }

  /** Hai đáp án nhiễu: ít nhất một lỗi có tên (nếu có), cái còn lại lỗi có tên khác hoặc lệch nhỏ. */
  function taoNhieu(kyNang, ct, rng) {
    const im = implCua(ct);
    if (im && im.taoNhieu) return im.taoNhieu(kyNang, ct, rng);
    const l = loaiCt(ct);
    if (l === 'nhan_tong') return taoNhieuNT(ct, rng);
    const ctSo = l === 'loi_van' ? ctPhep(ct) : ct;
    const d = tinh(ctSo);
    const kn = KY_NANG[kyNang];
    const gioiHan = l === 'so' || im ? (kn.nhieu_toi_da || kn.gioi_han) : kn.gioi_han;
    const daCo = {};
    const coTen = [];
    const ung = im ? (im.ungVienNhieu ? im.ungVienNhieu(kyNang, ct) : []) : l === 'so' ? ungVienNhieuSo(kyNang, ct) : ungVienNhieuPT(kyNang, ctSo);
    ung.forEach(function (x) {
      if (!hopLe(x.v, d, gioiHan) || daCo[x.v]) return;
      const loi = im ? im.nhanBietLoi(ct, x.v) : l === 'so' ? nhanBietLoiSo(ct, x.v) : nhanBietLoiPT(ctSo, x.v);
      if (loi.length === 1 && (loi[0] === 'khac' || loi[0] === 'dem-lech')) return;
      daCo[x.v] = 1;
      coTen.push(x);
    });
    const le = [];
    const leNho = d >= 20 ? [1, -1, 10, -10, 2, -2] : [1, -1, 2, -2, 3];
    leNho.forEach(function (k) { const v = d + k; if (hopLe(v, d, kn.gioi_han) && !daCo[v]) le.push({ v: v, w: Math.abs(k) === 2 ? 0.5 : 1 }); });
    const ra = [];
    if (coTen.length) {
      const x = chonTheoTrongSo(rng, coTen);
      ra.push(x.v);
      const conLai = coTen.filter(function (y) { return y.v !== x.v; });
      if (conLai.length && rng() < 0.5) ra.push(chonTheoTrongSo(rng, conLai).v);
    }
    const leCon = le.filter(function (y) { return ra.indexOf(y.v) < 0; });
    while (ra.length < 2 && leCon.length) {
      const y = chonTheoTrongSo(rng, leCon);
      ra.push(y.v);
      leCon.splice(leCon.indexOf(y), 1);
    }
    for (let k = 3; ra.length < 2 && k < 30; k++) {
      [d + k, d - k].forEach(function (v) { if (ra.length < 2 && hopLe(v, d, kn.gioi_han) && ra.indexOf(v) < 0) ra.push(v); });
    }
    return ra.map(function (v) { return { gia_tri: v, loi: nhanBietLoi(ct, v) }; });
  }

  /* ---------------- Dựng câu hoàn chỉnh ---------------- */

  const SINH = Object.assign({}, SINH_PT, SINH_SO, SINH_NT);
  Object.keys(DANG_THEO_KY).forEach(function (kn) { SINH[kn] = function (rng, muc) { return sinhLoiVan(kn, rng, muc); }; });

  /* ============================================================
     5. Tên thành phần của phép tính (2.14: SGK Bài 3; 2.23: Bài 38, 42) và quan hệ nhân, chia (2.24: Bài 41, 42)
     Cắm bằng dangKyLoai như các tệp cau-*.js, nhưng để trong tệp này để mọi trang, kiểm thử đã nạp ngân hàng là có ngay.
     Loại 'thanh_phan': { loai, kieu, phep, so: [a, b], vi_tri }; vi_tri 0, 1, 2 là số thứ nhất, số thứ hai, kết quả.
       kieu 'ten':  "Trong 6 + 3 = 9, số 9 gọi là gì?", đáp án là mã tên ('tong'), lựa chọn hiện chữ "Tổng"
       kieu 'so':   "Trong 12 − 2 = 10, số trừ là số nào?", đáp án là số
       kieu 'tinh': "Tìm tổng, biết hai số hạng là 42 và 35." (SGK Bài 3, 38, 42: tìm tổng, hiệu, tích, thương)
     Mã lỗi: ten-thanh-phan (gọi nhầm tên, nhầm tổng với hiệu, tích với thương), kèm lỗi tính của phép tính bên trong.
     Loại 'lien_he_nhan_chia': { loai, so: [a, b], chia_cho: 0 | 1, an: 'thuong' | 'so_chia' | 'so_bi_chia' }
       "Từ 2 × 7 = 14, ta có 14 : 7 = ?" (SGK Bài 41: từ 2 × 3 = 6 viết được 6 : 3 = 2 và 6 : 2 = 3). Lỗi lien-he-nhan-chia.
     ============================================================ */

  const TEN_TP = { so_hang: 'Số hạng', tong: 'Tổng', so_bi_tru: 'Số bị trừ', so_tru: 'Số trừ', hieu: 'Hiệu', thua_so: 'Thừa số', tich: 'Tích', so_bi_chia: 'Số bị chia', so_chia: 'Số chia', thuong: 'Thương' };
  const VI_TRI_TP = { '+': ['so_hang', 'so_hang', 'tong'], '-': ['so_bi_tru', 'so_tru', 'hieu'], '×': ['thua_so', 'thua_so', 'tich'], ':': ['so_bi_chia', 'so_chia', 'thuong'] };
  /** Tên của phép "anh em" hay bị nhầm (tổng với hiệu, tích với thương). */
  const TEN_NHIEU_TP = { '+': 'hieu', '-': 'tong', '×': 'thuong', ':': 'tich' };
  const TEN_PHEP_TP = { '+': 'phép cộng', '-': 'phép trừ', '×': 'phép nhân', ':': 'phép chia' };
  const QUY_TAC_TP = {
    '+': 'Trong phép cộng, hai số được cộng gọi là số hạng, kết quả gọi là tổng.',
    '-': 'Trong phép trừ, số đứng đầu là số bị trừ, số đứng sau dấu trừ là số trừ, kết quả là hiệu.',
    '×': 'Trong phép nhân, hai số được nhân gọi là thừa số, kết quả gọi là tích.',
    ':': 'Trong phép chia, số đứng đầu là số bị chia, số đứng sau dấu chia là số chia, kết quả là thương.'
  };
  function tenTP(ma) { return TEN_TP[ma] || String(ma); }
  function thuongTP(ma) { return tenTP(ma).toLowerCase(); }
  function soTP(ct) { return [ct.so[0], ct.so[1], tinhPhep(ct.so[0], ct.phep, ct.so[1])]; }
  function bieuTP(ct) { const s = soTP(ct); return s[0] + ' ' + kyHieu(ct.phep) + ' ' + s[1] + ' = ' + s[2]; }
  function docBieuTP(ct) { const s = soTP(ct); return s[0] + ' ' + tuPhep(ct.phep) + ' ' + s[1] + ' bằng ' + s[2]; }
  /** Vị trí của một số trong phép tính, nói cho bé hiểu. */
  function moTaViTri(p, i) {
    if (i === 2) return 'kết quả của ' + TEN_PHEP_TP[p];
    if (p === '+') return 'một số được cộng';
    if (p === '×') return 'một số được nhân';
    if (p === '-') return i === 0 ? 'số đứng đầu phép trừ' : 'số đứng sau dấu trừ';
    return i === 0 ? 'số đứng đầu phép chia' : 'số đứng sau dấu chia';
  }
  function tenKetQuaTP(p) { return VI_TRI_TP[p][2]; }

  function tinhTP(ct) {
    if (ct.kieu === 'ten') return VI_TRI_TP[ct.phep][ct.vi_tri];
    if (ct.kieu === 'so') return soTP(ct)[ct.vi_tri];
    return soTP(ct)[2];
  }
  function deTinhTP(ct) {
    const a = ct.so[0], b = ct.so[1];
    if (ct.phep === '+') return 'Tìm tổng, biết hai số hạng là ' + a + ' và ' + b + '.';
    if (ct.phep === '-') return 'Tìm hiệu, biết số bị trừ là ' + a + ', số trừ là ' + b + '.';
    if (ct.phep === '×') return 'Tìm tích, biết hai thừa số là ' + a + ' và ' + b + '.';
    return 'Tìm thương, biết số bị chia là ' + a + ', số chia là ' + b + '.';
  }
  function deTP(ct) {
    if (ct.kieu === 'ten') return 'Trong ' + bieuTP(ct) + ', số ' + soTP(ct)[ct.vi_tri] + ' gọi là gì?';
    if (ct.kieu === 'so') return 'Trong ' + bieuTP(ct) + ', ' + thuongTP(VI_TRI_TP[ct.phep][ct.vi_tri]) + ' là số nào?';
    return deTinhTP(ct);
  }
  function deDocTP(ct) {
    if (ct.kieu === 'ten') return 'Trong ' + TEN_PHEP_TP[ct.phep] + ' ' + docBieuTP(ct) + ', số ' + soTP(ct)[ct.vi_tri] + ' gọi là gì?';
    if (ct.kieu === 'so') return 'Trong ' + TEN_PHEP_TP[ct.phep] + ' ' + docBieuTP(ct) + ', ' + thuongTP(VI_TRI_TP[ct.phep][ct.vi_tri]) + ' là số nào?';
    return deTinhTP(ct);
  }
  function maTP(ct) {
    const s = soTP(ct);
    const bt = s[0] + kyHieu(ct.phep, true) + s[1];
    return ct.kieu === 'tinh' ? 'tinh:' + bt : ct.kieu + ':' + bt + '=' + s[2] + ':' + ct.vi_tri;
  }
  function ctPTCua(ct) { return { phep: ct.phep, so: [ct.so[0], ct.so[1]], an: 'ket_qua' }; }

  function nhanBietLoiTP(ct, v) {
    const d = tinhTP(ct);
    if (ct.kieu === 'ten') {
      const x = String(v == null ? '' : v);
      if (x === d) return [];
      return TEN_TP[x] ? ['ten-thanh-phan'] : ['khac'];
    }
    const n = Number(v);
    if (n === d) return [];
    if (ct.kieu === 'so') return soTP(ct).indexOf(n) >= 0 ? ['ten-thanh-phan'] : ['khac'];
    const a = ct.so[0], b = ct.so[1];
    const ma = [];
    const them = function (m) { if (ma.indexOf(m) < 0) ma.push(m); };
    if (ct.phep === '+' && n === Math.abs(a - b)) them('ten-thanh-phan');
    if (ct.phep === '-' && n === a + b) them('ten-thanh-phan');
    if (ct.phep === '×' && n === a + b) { them('ten-thanh-phan'); them('cong-thay-nhan'); }
    if (ct.phep === ':' && n === a - b) { them('ten-thanh-phan'); them('tru-thay-chia'); }
    if (ct.phep === ':' && n === a * b) { them('ten-thanh-phan'); them('nhan-thay-chia'); }
    nhanBietLoiPT(ctPTCua(ct), n).forEach(function (m) { if (m !== 'khac') them(m); });
    if (!ma.length) ma.push('khac');
    return ma;
  }

  function loiNoiTP(ct, v, maLoi) {
    const m = (maLoi && maLoi[0]) || 'khac';
    const s = soTP(ct);
    if (ct.kieu === 'ten') {
      const n = s[ct.vi_tri];
      const dau = String(v) === TEN_NHIEU_TP[ct.phep] ? tenTP(v) + ' là kết quả của ' + TEN_PHEP_TP[ct.phep === '+' ? '-' : ct.phep === '-' ? '+' : ct.phep === '×' ? ':' : '×'] + '. ' : '';
      return dau + 'Số ' + n + ' là ' + moTaViTri(ct.phep, ct.vi_tri) + ', gọi là ' + thuongTP(tinhTP(ct));
    }
    if (ct.kieu === 'so') {
      const i = s.indexOf(Number(v));
      if (i < 0) return LOI.khac.be;
      return 'Số ' + v + ' là ' + thuongTP(VI_TRI_TP[ct.phep][i]) + '. ' + tenTP(VI_TRI_TP[ct.phep][ct.vi_tri]) + ' là ' + moTaViTri(ct.phep, ct.vi_tri);
    }
    if (m === 'ten-thanh-phan') return tenTP(tenKetQuaTP(ct.phep)) + ' là kết quả của ' + TEN_PHEP_TP[ct.phep] + ': ' + s[0] + ' ' + kyHieu(ct.phep) + ' ' + s[1];
    return loiNoiPT(ctPTCua(ct), v, maLoi);
  }

  function goiYTP(ct) {
    const s = soTP(ct);
    const kh = kyHieu(ct.phep);
    const cho = function (i) { return i === 2 ? 'số đứng sau dấu =' : i === 0 ? 'số đứng đầu' : 'số đứng sau dấu ' + kh; };
    if (ct.kieu === 'ten') {
      const n = s[ct.vi_tri];
      return [QUY_TAC_TP[ct.phep], 'Số ' + n + ' là ' + cho(ct.vi_tri) + ' trong ' + bieuTP(ct) + '.', 'Số ' + n + ' là ' + moTaViTri(ct.phep, ct.vi_tri) + '.'];
    }
    if (ct.kieu === 'so') {
      const ten = VI_TRI_TP[ct.phep][ct.vi_tri];
      return [QUY_TAC_TP[ct.phep], tenTP(ten) + ' là ' + moTaViTri(ct.phep, ct.vi_tri) + '.', 'Nhìn ' + cho(ct.vi_tri) + ' trong ' + bieuTP(ct) + '.'];
    }
    const g = goiYPT(ctPTCua(ct));
    return [tenTP(tenKetQuaTP(ct.phep)) + ' là kết quả của ' + TEN_PHEP_TP[ct.phep] + '.', 'Con tính ' + s[0] + ' ' + kh + ' ' + s[1] + '.', ct.phep === '×' || ct.phep === ':' ? g[2] : g[0]];
  }

  function cacTenTP(ct) {
    const s = soTP(ct);
    if (ct.phep === '+') return s[0] + ' và ' + s[1] + ' là số hạng, ' + s[2] + ' là tổng';
    if (ct.phep === '×') return s[0] + ' và ' + s[1] + ' là thừa số, ' + s[2] + ' là tích';
    if (ct.phep === '-') return s[0] + ' là số bị trừ, ' + s[1] + ' là số trừ, ' + s[2] + ' là hiệu';
    return s[0] + ' là số bị chia, ' + s[1] + ' là số chia, ' + s[2] + ' là thương';
  }

  /** Sơ đồ như khung kiến thức SGK: phép tính, dưới mỗi số là tên của nó. hienTen: hiện đủ tên (lời giải), không thì chỉ tô số đang hỏi. */
  function veSoDoTP(ct, hienTen) {
    const s = soTP(ct);
    const font = 'Baloo 2, Arial Rounded MT Bold, sans-serif';
    const xs = [80, 250, 430], xDau = [165, 340];
    let h = '<svg class="so-do-thanh-phan" viewBox="0 0 520 150" role="img" aria-label="' + esc(bieuTP(ct)) + '" xmlns="http://www.w3.org/2000/svg">';
    [kyHieu(ct.phep), '='].forEach(function (t, i) {
      h += '<text x="' + xDau[i] + '" y="62" text-anchor="middle" font-size="42" font-weight="800" fill="#3b2f63" font-family="' + font + '">' + esc(t) + '</text>';
    });
    s.forEach(function (n, i) {
      const hoi = i === ct.vi_tri;
      if (hoi) h += '<rect x="' + (xs[i] - 46) + '" y="16" width="92" height="62" rx="16" fill="' + (hienTen ? '#06d6a0' : '#ff8a1f') + '"/>';
      h += '<text x="' + xs[i] + '" y="62" text-anchor="middle" font-size="44" font-weight="800" fill="' + (hoi ? '#fff' : '#221a3b') + '" font-family="' + font + '">' + n + '</text>';
      if (hienTen || hoi) {
        h += '<line x1="' + xs[i] + '" y1="84" x2="' + xs[i] + '" y2="104" stroke="#3b2f63" stroke-width="3" stroke-linecap="round"/>';
        h += '<text x="' + xs[i] + '" y="134" text-anchor="middle" font-size="24" font-weight="800" fill="' + (hoi ? (hienTen ? '#05a57b' : '#e06a00') : '#3b2f63') + '" font-family="' + font + '">' +
          (hienTen ? esc(tenTP(VI_TRI_TP[ct.phep][i])) : '?') + '</text>';
      }
    });
    return h + '</svg>';
  }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function loiGiaiTP(ct) {
    const d = tinhTP(ct);
    const s = soTP(ct);
    if (ct.kieu === 'tinh') {
      const g = loiGiaiPT(ctPTCua(ct));
      const r = { ma: g.ma, buoc: [tenTP(tenKetQuaTP(ct.phep)) + ' là kết quả của ' + TEN_PHEP_TP[ct.phep] + ': ' + s[0] + ' ' + kyHieu(ct.phep) + ' ' + s[1]].concat(g.buoc), kq: d };
      if (g.cot) r.cot = g.cot;
      return r;
    }
    const ten = VI_TRI_TP[ct.phep][ct.vi_tri];
    const ket = ct.kieu === 'ten' ? 'Vậy số ' + s[ct.vi_tri] + ' gọi là ' + thuongTP(ten) : 'Vậy ' + thuongTP(ten) + ' là ' + s[ct.vi_tri];
    return { ma: 'ten-thanh-phan', buoc: [bieuTP(ct), cacTenTP(ct), ket], html: veSoDoTP(ct, true), kq: d };
  }
  function ketLuanTP(ct) {
    const s = soTP(ct);
    const ten = VI_TRI_TP[ct.phep][ct.vi_tri];
    if (ct.kieu === 'ten') return 'Vậy trong ' + bieuTP(ct) + ', số ' + s[ct.vi_tri] + ' là ' + thuongTP(ten) + '.';
    if (ct.kieu === 'so') return 'Vậy ' + thuongTP(ten) + ' là ' + s[ct.vi_tri] + '.';
    return 'Vậy ' + thuongTP(tenKetQuaTP(ct.phep)) + ' là ' + s[2] + ' (' + bieuTP(ct) + ').';
  }

  /** Chọn tối đa 2 đáp án nhiễu từ ứng viên có trọng số (số nguyên từ 0 đến 100, khác đáp án, không trùng). */
  function haiNhieuSo(ct, d, ung, rng, nhanBiet) {
    const daCo = {};
    const con = [];
    ung.forEach(function (x) { if (Number.isInteger(x.v) && x.v >= 0 && x.v <= 100 && x.v !== d && !daCo[x.v]) { daCo[x.v] = 1; con.push(x); } });
    const ra = [];
    while (ra.length < 2 && con.length) { const x = chonTheoTrongSo(rng, con); ra.push(x.v); con.splice(con.indexOf(x), 1); }
    for (let k = 2; ra.length < 2 && k < 20; k++) [d + k, d - k].forEach(function (v) { if (ra.length < 2 && v >= 0 && v <= 100 && ra.indexOf(v) < 0) ra.push(v); });
    return ra.map(function (v) { return { gia_tri: v, loi: nhanBiet(ct, v) }; });
  }

  function taoNhieuTP(kyNang, ct, rng) {
    const d = tinhTP(ct);
    if (ct.kieu === 'ten') {
      let sai = VI_TRI_TP[ct.phep].filter(function (x, i, a) { return x !== d && a.indexOf(x) === i; });
      if (sai.length < 2) sai.push(TEN_NHIEU_TP[ct.phep]);
      return tron(rng, sai.slice(0, 2)).map(function (v) { return { gia_tri: v, loi: nhanBietLoiTP(ct, v) }; });
    }
    if (ct.kieu === 'so') {
      return tron(rng, soTP(ct).filter(function (x) { return x !== d; })).map(function (v) { return { gia_tri: v, loi: nhanBietLoiTP(ct, v) }; });
    }
    const a = ct.so[0], b = ct.so[1];
    const ung = [];
    if (ct.phep === '+') ung.push({ v: Math.abs(a - b), w: 3 });
    if (ct.phep === '-') ung.push({ v: a + b, w: 3 });
    if (ct.phep === '×') { ung.push({ v: a + b, w: 3 }); ung.push({ v: a * (b + 1), w: 1.5 }); ung.push({ v: a * (b - 1), w: 1.5 }); }
    if (ct.phep === ':') { ung.push({ v: a - b, w: 3 }); ung.push({ v: a * b, w: 1 }); }
    ung.push({ v: d + 1, w: 1.5 }, { v: d - 1, w: 1.5 });
    if (d >= 20) ung.push({ v: d + 10, w: 1 }, { v: d - 10, w: 1 });
    return haiNhieuSo(ct, d, ung, rng, nhanBietLoiTP);
  }

  function theChuTP(ct) {
    const s = soTP(ct);
    if (ct.kieu === 'tinh') {
      if (ct.phep === '-') return 'Hiệu của ' + s[0] + ' và ' + s[1];
      if (ct.phep === ':') return 'Thương của ' + s[0] + ' và ' + s[1];
      return (ct.phep === '+' ? 'Tổng' : 'Tích') + ' của ' + s[0] + ' và ' + s[1];
    }
    if (ct.kieu === 'so') return tenTP(VI_TRI_TP[ct.phep][ct.vi_tri]) + ' của ' + bieuTP(ct);
    return 'Số ' + s[ct.vi_tri] + ' trong ' + bieuTP(ct);
  }

  dangKyLoai('thanh_phan', {
    tinh: tinhTP, de: deTP, deDoc: deDocTP, deChuanHoa: maTP, nhanBietLoi: nhanBietLoiTP, loiNoi: loiNoiTP,
    goiY: goiYTP, loiGiai: loiGiaiTP, ketLuan: ketLuanTP, taoNhieu: taoNhieuTP, theChu: theChuTP,
    hienGiaTri: function (v) { return TEN_TP[v] || String(v); },
    veLuaChon: function (ct, v) { return { nhan: TEN_TP[v] || String(v) }; },
    veHinh: function (ct) { return ct.kieu === 'ten' ? veSoDoTP(ct, false) : ''; },
    dang: 'chon_dap_an'
  });

  /** Phép cộng, trừ không nhớ như SGK Bài 3 (6 + 3 = 9, 12 − 2 = 10, 86 − 32 = 54): ba số khác nhau. */
  function soCongTruTP(rng, p) {
    for (let thu = 0; thu < 200; thu++) {
      let a, b;
      if (rng() < 0.35) {
        if (p === '+') { a = nn(rng, 2, 8); b = nn(rng, 1, 10 - a); }
        else { a = nn(rng, 5, 19); b = nn(rng, 1, Math.min(9, a - 1)); if (a >= 10 && dv(b) > dv(a)) continue; }
      } else {
        const ct = SINH_PT['cong-tru-khong-nho-100'](rng, { cach: [p === '+' ? 'cong' : 'tru'] });
        a = ct.so[0]; b = ct.so[1];
      }
      const c = tinhPhep(a, p, b);
      if (a !== b && a !== c && b !== c && c > 0) return [a, b];
    }
    return p === '+' ? [6, 3] : [12, 2];
  }
  /** Phép nhân, chia như SGK Bài 38, 42 (2 × 6 = 12, 4 × 2 = 8, 20 : 5 = 4, 16 : 8 = 2): ba số khác nhau. */
  function soNhanChiaTP(rng, p) {
    for (let thu = 0; thu < 200; thu++) {
      let a, b;
      if (p === '×') {
        if (rng() < 0.7) { const f = chon(rng, [2, 5]), g = nn(rng, 2, 10); if (rng() < 0.5) { a = f; b = g; } else { a = g; b = f; } }
        else { a = nn(rng, 2, 6); b = nn(rng, 2, 5); if (a * b > 20) continue; }
      } else if (rng() < 0.75) { b = chon(rng, [2, 5]); a = b * nn(rng, 2, 10); }
      else { const f = chon(rng, [2, 5]), g = nn(rng, 3, 9); a = f * g; b = g; }
      const c = tinhPhep(a, p, b);
      if (a !== b && a !== c && b !== c) return [a, b];
    }
    return p === '×' ? [2, 6] : [12, 2];
  }
  function sinhThanhPhan(phepMacDinh, soCua) {
    return function (rng, muc) {
      const kieu = chonCach(rng, muc, [{ c: 'ten', w: 2 }, { c: 'so', w: 1 }, { c: 'tinh', w: 1 }]);
      const p = chon(rng, (muc && muc.phep && muc.phep.length) ? muc.phep : phepMacDinh);
      const so = soCua(rng, p);
      let vi = nn(rng, 0, 2);
      // Hỏi "số hạng là số nào" thì có hai đáp án: phép cộng, phép nhân chỉ hỏi tổng, tích
      if (kieu === 'so' && (p === '+' || p === '×')) vi = 2;
      const ct = { loai: 'thanh_phan', kieu: kieu, phep: p, so: so };
      if (kieu !== 'tinh') ct.vi_tri = vi;
      return ct;
    };
  }

  /* ---------------- Quan hệ nhân, chia ---------------- */

  function soLH(ct) { const c = ct.so[0] * ct.so[1]; return { c: c, d: ct.so[ct.chia_cho], q: ct.so[1 - ct.chia_cho] }; }
  function tinhLH(ct) { const s = soLH(ct); return ct.an === 'so_chia' ? s.d : ct.an === 'so_bi_chia' ? s.c : s.q; }
  function nhanLH(ct) { return ct.so[0] + ' × ' + ct.so[1] + ' = ' + ct.so[0] * ct.so[1]; }
  function chiaLH(ct, chuanHoa) {
    const s = soLH(ct), k = chuanHoa ? ':' : ' : ', b = chuanHoa ? '=' : ' = ';
    if (ct.an === 'so_chia') return s.c + k + '?' + b + s.q;
    if (ct.an === 'so_bi_chia') return '?' + k + s.d + b + s.q;
    return s.c + k + s.d + b + '?';
  }
  function deLH(ct) { return 'Từ ' + nhanLH(ct) + ', ta có ' + chiaLH(ct); }
  function deDocLH(ct) {
    const s = soLH(ct);
    const dau = 'Từ ' + ct.so[0] + ' nhân ' + ct.so[1] + ' bằng ' + s.c + ', ta có ';
    if (ct.an === 'so_chia') return dau + s.c + ' chia mấy bằng ' + s.q + '?';
    if (ct.an === 'so_bi_chia') return dau + 'số nào chia ' + s.d + ' bằng ' + s.q + '?';
    return dau + s.c + ' chia ' + s.d + ' bằng mấy?';
  }
  function maLH(ct) { return 'lh:' + ct.so[0] + 'x' + ct.so[1] + ':' + chiaLH(ct, true); }
  function nhanBietLoiLH(ct, v) {
    const n = Number(v);
    const d = tinhLH(ct);
    if (n === d) return [];
    const s = soLH(ct);
    const ma = [];
    const them = function (m) { if (ma.indexOf(m) < 0) ma.push(m); };
    if (ct.an === 'thuong') {
      if (n === s.d || n === s.c) them('lien-he-nhan-chia');
      if (n === s.c - s.d) them('tru-thay-chia');
      if (n === s.c * s.d) them('nhan-thay-chia');
    } else if (ct.an === 'so_chia') {
      if (n === s.q || n === s.c) them('lien-he-nhan-chia');
      if (n === s.c - s.q) them('tru-thay-chia');
      if (n === s.c * s.q) them('nhan-thay-chia');
    } else {
      if (n === s.d + s.q) them('cong-thay-nhan');
      if (n === s.d || n === s.q) them('lien-he-nhan-chia');
      if (n === s.c + s.d || n === s.c - s.d || n === s.c + s.q || n === s.c - s.q) them('o-ben-canh');
    }
    if (!ma.length && (n === d + 1 || n === d - 1)) them('dem-lech');
    if (!ma.length) ma.push('khac');
    return ma;
  }
  function loiNoiLH(ct, v, maLoi) {
    const m = (maLoi && maLoi[0]) || 'khac';
    const s = soLH(ct);
    if (m === 'lien-he-nhan-chia') return 'Từ ' + nhanLH(ct) + ': ' + s.c + ' chia cho ' + s.d + ' thì được ' + s.q;
    if (m === 'cong-thay-nhan') return 'Số bị chia là tích: ' + s.d + ' × ' + s.q + ', không phải ' + s.d + ' + ' + s.q;
    if (m === 'o-ben-canh') return 'Số bị chia chính là tích trong phép nhân: ' + s.c;
    if (m === 'dem-lech') return 'Con nhìn lại phép nhân ' + nhanLH(ct) + ' nhé';
    return (LOI[m] || LOI.khac).be;
  }
  function goiYLH(ct) {
    const s = soLH(ct);
    const cuoi = ct.an === 'so_bi_chia' ? 'Số bị chia là tích của hai thừa số: ' + s.d + ' × ' + s.q + ' = ?'
      : ct.an === 'so_chia' ? s.q + ' là một thừa số, số chia là thừa số còn lại trong ' + nhanLH(ct) + '.'
        : 'Trong ' + nhanLH(ct) + ', bỏ thừa số ' + s.d + ' đi thì còn thừa số nào?';
    return ['Từ một phép nhân viết được hai phép chia: ' + nhanLH(ct) + '.', s.c + ' chia cho thừa số này thì được thừa số kia.', cuoi];
  }
  function loiGiaiLH(ct) {
    const s = soLH(ct);
    return { ma: 'nhan-ra-chia', buoc: [nhanLH(ct), s.c + ' : ' + ct.so[0] + ' = ' + ct.so[1], s.c + ' : ' + ct.so[1] + ' = ' + ct.so[0]], kq: tinhLH(ct) };
  }
  function taoNhieuLH(kyNang, ct, rng) {
    const s = soLH(ct);
    const d = tinhLH(ct);
    let ung;
    if (ct.an === 'thuong') ung = [{ v: s.d, w: 3 }, { v: s.c, w: 1.5 }, { v: s.c - s.d, w: 1 }, { v: d + 1, w: 1 }, { v: d - 1, w: 1 }];
    else if (ct.an === 'so_chia') ung = [{ v: s.q, w: 3 }, { v: s.c, w: 1.5 }, { v: s.c - s.q, w: 1 }, { v: d + 1, w: 1 }, { v: d - 1, w: 1 }];
    else ung = [{ v: s.d + s.q, w: 3 }, { v: s.c + s.d, w: 1.5 }, { v: s.c - s.d, w: 1.5 }, { v: s.q, w: 1 }];
    return haiNhieuSo(ct, d, ung, rng, nhanBietLoiLH);
  }

  dangKyLoai('lien_he_nhan_chia', {
    tinh: tinhLH, de: deLH, deDoc: deDocLH, deChuanHoa: maLH, nhanBietLoi: nhanBietLoiLH, loiNoi: loiNoiLH,
    goiY: goiYLH, loiGiai: loiGiaiLH, taoNhieu: taoNhieuLH,
    ketLuan: function (ct) { const s = soLH(ct); return 'Vậy ' + s.c + ' : ' + s.d + ' = ' + s.q + '.'; },
    theChu: function (ct) { return chiaLH(ct) + ' (từ ' + nhanLH(ct) + ')'; },
    dang: 'chon_dap_an'
  });

  /** Thừa số có một thừa số là 2 hoặc 5 (bảng nhân 2, 5), thừa số kia từ 2 đến 10 và khác nó; hỏi thương là chính. */
  function sinhLienHe(rng, muc) {
    const f = chon(rng, [2, 5]);
    let g = nn(rng, 2, 10);
    if (g === f) g = f === 2 ? 3 : 4;
    const so = rng() < 0.5 ? [f, g] : [g, f];
    return { loai: 'lien_he_nhan_chia', so: so, chia_cho: nn(rng, 0, 1), an: chonCach(rng, muc, [{ c: 'thuong', w: 2 }, { c: 'so_chia', w: 1 }, { c: 'so_bi_chia', w: 1 }]) };
  }

  themKyNang('ten-thanh-phan-cong-tru', { noi_dung: '2.14', ten: 'Gọi tên số hạng, tổng, số bị trừ, số trừ, hiệu', kieu: 'K3', giay: 10, gioi_han: 100, loai: 'thanh_phan', sinh: sinhThanhPhan(['+', '-'], soCongTruTP) });
  themKyNang('ten-thanh-phan-nhan-chia', { noi_dung: '2.23', ten: 'Gọi tên thừa số, tích, số bị chia, số chia, thương', kieu: 'K3', giay: 10, gioi_han: 100, loai: 'thanh_phan', sinh: sinhThanhPhan(['×', ':'], soNhanChiaTP) });
  themKyNang('nhan-chia-lien-he', { noi_dung: '2.24', ten: 'Từ phép nhân viết hai phép chia', kieu: 'K3', giay: 10, gioi_han: 100, loai: 'lien_he_nhan_chia', sinh: sinhLienHe });

  /**
   * Dựng một câu từ kỹ năng và cấu trúc (hoặc sinh mới nếu không có cấu trúc).
   * opts: { dang: 'chon_dap_an' | 'nhap_so' | 'ghep_doi' | 'keo_tha' | 'hai_buoc', muc: cấu hình của màn cho kỹ năng }
   */
  function taoCau(kyNang, ct, rng, opts) {
    opts = opts || {};
    const kn = KY_NANG[kyNang];
    if (!kn) throw new Error('Không có kỹ năng ' + kyNang);
    ct = ct || SINH[kyNang](rng, opts.muc || null);
    const d = tinh(ct);
    const im = implCua(ct);
    const q = {
      ky_nang: kyNang,
      noi_dung: kn.noi_dung,
      dang: opts.dang || dangMacDinh(ct),
      ma_cau: maCau(kyNang, ct),
      de: deHien(ct),
      de_doc: deDoc(ct),
      cau_truc: JSON.parse(JSON.stringify(ct)),
      dap_an: d,
      goi_y: goiY(ct),
      loi_giai: loiGiai(ct),
      ket_luan: ketLuan(ct),
      the: theChu(ct)
    };
    const hinh = veHinh(ct);
    if (hinh) q.hinh = hinh;
    if (q.dang === 'chon_dap_an' || q.dang === 'doc_va_chon') {
      const nhieu = taoNhieu(kyNang, ct, rng);
      q.lua_chon = tron(rng, [{ gia_tri: d, loi: [] }].concat(nhieu));
    } else if (q.dang === 'ghep_doi') {
      q.nhieu = taoNhieu(kyNang, ct, rng);
    } else if (q.dang === 'hai_buoc') {
      const b1 = luaChonBuoc1(ct, rng);
      q.buoc1 = { dap_an: bieuThuc(ct), lua_chon: b1 };
      q.lua_chon = b1;
      q.khung = khungLV(ct);
      q.mau = Object.assign({}, MAU_THEO_ID[ct.mau]);
      q.goi_y_buoc2 = goiYPT(ctPhep(ct));
      q.loi_giai_buoc2 = loiGiaiPT(ctPhep(ct));
      q.de_buoc2 = dePT(ctPhep(ct));
    }
    if (im && im.moRong) im.moRong(q, ct, rng);
    // Câu cấu tạo số hỏi ở dạng chọn đáp án (Đấu Trường, game cũ): đổi lời "Xếp số" thành câu hỏi chọn số
    if (loaiCt(ct) === 'so' && ct.kieu === 'cau_tao' && (q.dang === 'chon_dap_an' || q.dang === 'doc_va_chon')) {
      q.de = deChonSo(ct);
      q.de_doc = deDocChonSo(ct);
      q.goi_y = goiYChonSo(ct);
    }
    return q;
  }

  function deChonSo(ct) {
    if (ct.cach === 'chu') return 'Số "' + docSo(ct.so) + '" viết là số nào?';
    if (ct.cach === 'tong') return noiTheoTong(ct.so) + ' là số nào?';
    if (ct.cach === 'hang') return 'Số gồm ' + noiTheoHang(ct.so) + ' là số nào?';
    return 'Số ' + docSo(ct.so) + ' là số nào?';
  }
  function deDocChonSo(ct) {
    if (ct.cach === 'chu') return 'Số ' + docSo(ct.so) + ' viết là số nào?';
    if (ct.cach === 'tong') return noiTheoTong(ct.so).replace(/\+/g, 'cộng') + ' là số nào?';
    return deChonSo(ct);
  }
  function goiYChonSo(ct) {
    const d = ct.so, t = tram(d), c = chuc(d), u = dv(d);
    const baHang = d >= 100;
    const gom = 'Số này gồm ' + (baHang ? t + ' trăm, ' : '') + c + ' chục và ' + u + ' đơn vị.';
    return [
      baHang ? 'Viết lần lượt chữ số hàng trăm, hàng chục, hàng đơn vị.' : 'Viết chữ số hàng chục trước, hàng đơn vị sau.',
      baHang && c === 0 ? 'Hàng chục bằng 0 thì viết chữ số 0 ở giữa.' : u === 0 ? 'Hàng đơn vị bằng 0 thì viết chữ số 0 ở cuối.' : 'Mỗi hàng chỉ viết một chữ số.',
      gom
    ];
  }

  /** Dạng câu mặc định của một cấu trúc: bài toán có lời văn là hai bước, loại cắm thêm tự khai, còn lại chọn đáp án. */
  function dangMacDinh(ct) {
    if (loaiCt(ct) === 'loi_van') return 'hai_buoc';
    const im = implCua(ct);
    if (im && im.dang) return typeof im.dang === 'function' ? im.dang(ct) : im.dang;
    return 'chon_dap_an';
  }

  /**
   * Lập danh sách câu cho một ván.
   * man: { cau: [{ ky_nang, ty_le, cach?, chieu?, dang_bai? }], so_cau, tram_dung, dang }
   * opts: { cauNo: [{ cau, ky_nang, cau_truc }] (câu từng sai chưa sửa, đưa vào đầu), soCau,
   *         mucKy: { ky_nang: 'chua_hoc' | 'lam_quen' | 'dang_luyen' | 'da_thuoc' | 'vung_chac' } (mức thành thạo lúc bắt đầu ván) }
   * Bộ sinh nhận mức của kỹ năng trong muc.muc_thanh_thao (độ khó theo mức, xem theoDoKho).
   * Trả về [{ ky_nang, cau_truc, dang, on_lai_cua? }]
   */
  function lapDanhSach(man, rng, opts) {
    opts = opts || {};
    const mucKy = opts.mucKy || null;
    const mucCho = function (kn, m) {
      const mk = mucKy && mucKy[kn];
      const ten = mk && mk.muc ? mk.muc : mk;
      return ten ? Object.assign({}, m, { muc_thanh_thao: ten }) : m;
    };
    const n = opts.soCau || man.so_cau || 12;
    const ds = [];
    const daDung = {};
    (opts.cauNo || []).slice(0, Math.min(4, Math.floor(n / 3))).forEach(function (c) {
      if (!KY_NANG[c.ky_nang] || !c.cau_truc) return;
      const m = maCau(c.ky_nang, c.cau_truc);
      if (daDung[m]) return;
      daDung[m] = 1;
      ds.push({ ky_nang: c.ky_nang, cau_truc: c.cau_truc, on_lai_cua: c.cau });
    });
    const tron2 = man.cau.map(function (x) { return { ky_nang: x.ky_nang, w: x.ty_le || 1, muc: x }; });
    let thu = 0;
    while (ds.length < n && thu < n * 40) {
      thu++;
      const muc = chonTheoTrongSo(rng, tron2);
      const kn = muc.ky_nang;
      const ct = SINH[kn](rng, mucCho(kn, muc.muc));
      const m = maCau(kn, ct);
      if (daDung[m]) continue;
      const truoc = ds[ds.length - 1];
      if (truoc && tinh(truoc.cau_truc) === tinh(ct) && thu < n * 30) continue;
      daDung[m] = 1;
      ds.push({ ky_nang: kn, cau_truc: ct, dang_muc: muc.muc.dang || null });
    }
    // Câu nợ đứng đầu thì xen lẫn vào nửa đầu ván cho tự nhiên
    const soNo = ds.filter(function (x) { return x.on_lai_cua; }).length;
    if (soNo) {
      const no = ds.splice(0, soNo);
      no.forEach(function (x, i) { ds.splice(Math.min(ds.length, 1 + i * 2 + Math.floor(rng() * 2)), 0, x); });
    }
    ds.forEach(function (x, i) {
      if (x.dang_muc) x.dang = x.dang_muc;
      else if (man.dang) x.dang = man.dang;
      else if (loaiCt(x.cau_truc) === 'loi_van') x.dang = 'hai_buoc';
      else if (implCua(x.cau_truc) && implCua(x.cau_truc).dang) x.dang = dangMacDinh(x.cau_truc);
      else x.dang = man.tram_dung && (i + 1) % 4 === 0 ? 'nhap_so' : 'chon_dap_an';
      delete x.dang_muc;
    });
    return ds;
  }

  window.NganHang = {
    NOI_DUNG: NOI_DUNG,
    TIEN_QUYET: TIEN_QUYET,
    LOI: LOI,
    KY_NANG: KY_NANG,
    THU_TU_KY_NANG: THU_TU_KY_NANG,
    MAU_LOI_VAN: MAU,
    TEN_NV: TEN_NV,
    TRU: TRU,
    taoRng: taoRng,
    tron: tron,
    loaiKyNang: loaiKyNang,
    tinh: tinh,
    deHien: deHien,
    deChuanHoa: deChuanHoa,
    deDoc: deDoc,
    maCau: maCau,
    nhanBietLoi: nhanBietLoi,
    loiNoiVoiBe: loiNoiVoiBe,
    sinh: function (kyNang, rng, muc) { return SINH[kyNang](rng, muc || null); },
    taoNhieu: taoNhieu,
    goiY: goiY,
    loiGiai: loiGiai,
    ketLuan: ketLuan,
    theChu: theChu,
    hienGiaTri: hienGiaTri,
    docSo: docSo,
    noiTheoTong: noiTheoTong,
    noiTheoHang: noiTheoHang,
    ctPhep: ctPhep,
    bieuThuc: bieuThuc,
    taoCau: taoCau,
    lapDanhSach: lapDanhSach,
    // Cắm thêm loại câu và kỹ năng (giai đoạn 4, 5)
    dangKyLoai: dangKyLoai,
    coLoai: function (loai) { return !!LOAI_RIENG[loai] || loai === 'phep_tinh' || loai === 'so' || loai === 'nhan_tong' || loai === 'loi_van'; },
    themKyNang: themKyNang,
    themLoi: themLoi,
    themNoiDung: themNoiDung,
    hienGiaTriCau: hienGiaTriCau,
    veHinh: veHinh,
    veLuaChon: veLuaChon,
    dangMacDinh: dangMacDinh,
    nn: nn,
    chon: chon,
    chonTheoTrongSo: chonTheoTrongSo
  };
})();
