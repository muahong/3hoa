# Spec chương trình học lớp 3

> Tình trạng: Bản nháp | Ngày: 2026-09-10 | Chủ sở hữu: 3hoa | Liên quan: `docs/du-an-toan-2-3/ban-do-toan-2-3.md` (bản đồ 93 nội dung), `docs/du-an-toan-2-3/01-muc-tieu-va-ky-vong.md` (mã mục tiêu M1 đến M13), `docs/du-an-toan-2-3/02-nhan-vat-ao.md`, `docs/du-an-toan-2-3/spec/03a-chuong-trinh-lop-2.md` (tiên quyết lớp 2), `docs/du-an-toan-2-3/spec/06-theo-doi-hoc-tap.md` (mã lỗi và nhật ký ván), `docs/du-an-toan-2-3/templates/mau-spec.md`

Mục tiêu phục vụ: M1, M3, M10 (đúng SGK), M12 (bảng ánh xạ màn sang mã nội dung, mã lỗi).

## 1. Tài liệu này dùng để làm gì

Đây là tài liệu tham chiếu chính cho người thiết kế game khi làm bất kỳ màn chơi nào chạm tới Toán lớp 3. Với mỗi nội dung trong bản đồ (giữ nguyên mã 3.1, 3.2... của bản đồ), tài liệu nêu: bé phải làm được gì (hành vi quan sát được), cần biết gì trước, ngưỡng nào thì game được gọi là "Đã thuộc", bé hay sai kiểu gì và game nhận ra lỗi đó qua đáp án sai ra sao, 5 đến 8 bài mẫu, dạng câu hỏi hợp với game, và mức ưu tiên cho dự án.

Quy ước mã: nội dung mạch Số và phép tính ghi trần `3.7`; ba mạch còn lại ghi kèm chữ mạch `B3.8` (Hình học và Đo lường), `C3.2` (Thống kê và Xác suất), `D3.1` (Thực hành), giống cách viết trong `01-muc-tieu-va-ky-vong.md`. Mã lớp 2 (`2.11`, `B2.11`) trỏ sang `spec/03a-chuong-trinh-lop-2.md`. Mã lớp 1 (`1.x`) chỉ dùng ở phần tiên quyết, chưa có spec riêng.

Nguồn kiến thức: Chương trình GDPT 2018 môn Toán (Thông tư 32/2018), đối chiếu với ba bộ SGK lớp 3 đang dùng (Kết nối tri thức, Chân trời sáng tạo, Cánh Diều). Ký hiệu theo SGK: phép chia viết `42 : 7`, phép nhân viết `7 × 8`, phép trừ viết `62 − 38`, chia có dư viết `17 : 5 = 3 (dư 2)`, thành phần chưa biết viết bằng ô trống hoặc dấu `?` (SGK 2018 lớp 3 chưa dùng chữ `x`).

## 2. Tổng quan mạch kiến thức lớp 3

Lớp 3 là năm bé đi từ "tính được" sang "hiểu và vận dụng": số mở rộng ba lần (1 000, 10 000, 100 000), bảng cửu chương hoàn thành, và lần đầu bé gặp năm thứ mà trẻ Việt hay hụt: **chia có dư**, **biểu thức có dấu ngoặc**, **gấp và giảm một số lần**, **một phần mấy**, **chu vi và diện tích**. Đây cũng là năm bài toán có lời văn chuyển từ một bước sang hai bước.

| Mạch | Số nội dung | Xương sống | Nơi bé hay hụt |
|---|---|---|---|
| A. Số và phép tính | 25 (3.1 đến 3.25) | Số đến 100 000; cộng trừ có nhớ nhiều lần; bảng nhân chia 3, 4, 6, 7, 8, 9; nhân chia ngoài bảng với số có một chữ số; chia có dư; biểu thức; gấp, giảm, một phần mấy; bài toán hai bước, rút về đơn vị | 3.18 chia có dư (số dư lớn hơn số chia), 3.23 thứ tự phép tính, 3.20 và 3.21 nhầm "gấp 3 lần" với "nhiều hơn 3", 3.17 thương có chữ số 0 ở giữa |
| B. Hình học và Đo lường | 19 (B3.1 đến B3.19) | Góc vuông, trung điểm, hình chữ nhật và hình vuông; chu vi; diện tích và cm²; mm, g, ml, độ C, tiền, tháng năm, giờ từng phút, thời gian trôi qua | B3.8 và B3.10 nhầm chu vi với diện tích, B3.18 trừ giờ như trừ số (1 giờ = 100 phút), B3.4 không nhận ra hình vuông bị xoay |
| C. Thống kê và Xác suất | 4 (C3.1 đến C3.4) | Kiểm đếm, bảng số liệu, biểu đồ tranh có biểu tượng đại diện nhiều đơn vị, chắc chắn, có thể, không thể | C3.3 quên "mỗi biểu tượng bằng 5" |
| D. Thực hành và trải nghiệm | 1 (D3.1) | Đo đạc quanh nhà, thời gian biểu | Làm ngoài màn hình |

Ba sợi dây nối lớp 2 sang lớp 3 mà game phải giữ liền mạch:

1. **Có nhớ**: 8 + 7 (2.8) sang 36 + 27 (2.11) sang 456 + 287 (3.7) sang 2 789 + 4 567 (3.8). Lỗi "quên nhớ 1" đi theo bé suốt ba năm, cùng một mã lỗi.
2. **Bảng nhân chia**: bảng 2, 5 (2.20, 2.22) sang bảng 3, 4, 6, 7, 8, 9 (3.12, 3.13) sang nhân chia ngoài bảng (3.14, 3.16) sang chia có dư (3.18). Không thuộc bảng thì mọi thứ phía sau đổ.
3. **Ý nghĩa phép tính**: 4 + 4 + 4 là 4 × 3 (2.19) sang gấp 3 lần (3.20) sang so sánh gấp mấy lần (3.21) sang rút về đơn vị (3.25). Bé chỉ thuộc bảng mà không hiểu nghĩa sẽ chọn sai phép tính ở bài toán có lời văn.

## 3. Thứ tự dạy hợp lý trong năm học

Ba bộ SGK đều bám một trục chung, chỉ lệch nhau vài tuần ở chỗ đặt bảng nhân 8, 9, biểu thức số và xem đồng hồ. Thứ tự dưới đây là thứ tự game nên mở khóa nội dung cho bé lớp 3 (cột "Tuần" là ước lượng, năm học 35 tuần, học kỳ 1 khoảng 18 tuần).

### Học kỳ 1

| Tuần | Nội dung | Ghi chú |
|---|---|---|
| 1 đến 3 | 3.1 ôn số đến 1 000; 3.7 cộng trừ có nhớ trong 1 000; 3.11 tìm thành phần phép cộng, phép trừ; ôn hình học và đo lường lớp 2 | Ôn tập, mọi bộ sách giống nhau |
| 4 đến 6 | 3.12 và 3.13 bảng nhân, chia 3 và 4; 3.19 tìm thừa số, số bị chia, số chia; 3.22 một phần mấy (đọc 1/2 đến 1/9 trên hình) | Kết nối tri thức và Cánh Diều dạy bảng 3, 4 rồi mới sang hình học |
| 6 đến 8 | 3.12 và 3.13 bảng nhân, chia 6 và 7; 3.20 gấp một số lên nhiều lần | |
| 8 đến 10 | B3.1 điểm ở giữa, trung điểm; B3.2 góc vuông, ê ke; B3.3 tam giác, tứ giác; B3.4 hình chữ nhật, hình vuông; B3.5 hình tròn, compa; B3.6 khối lập phương, khối hộp chữ nhật | Cánh Diều đưa khối lập phương sang học kỳ 2 |
| 10 đến 12 | 3.14 nhân số có hai chữ số với số có một chữ số; 3.20 giảm một số đi nhiều lần; 3.21 so sánh số lớn gấp mấy lần số bé; 3.18 chia hết, chia có dư; 3.16 chia số có hai chữ số cho số có một chữ số | Chia có dư đứng ngay trước chia ngoài bảng ở cả ba bộ |
| 12 đến 14 | 3.12 và 3.13 bảng nhân, chia 8 và 9; 3.15 và 3.17 nhân, chia số có ba chữ số với số có một chữ số | Chân trời sáng tạo dạy đủ bảng 6 đến 9 liền nhau trước khi nhân chia ngoài bảng |
| 14 đến 16 | B3.11 bảng đơn vị đo độ dài, mm; B3.12 gam; B3.13 mi-li-lít; B3.14 nhiệt độ; B3.17 xem đồng hồ từng phút; 3.22 tìm một phần mấy của một số | Kết nối tri thức và Chân trời sáng tạo đặt xem đồng hồ ở học kỳ 1, Cánh Diều đặt ở học kỳ 2 |
| 16 đến 18 | 3.23 biểu thức số, thứ tự thực hiện, dấu ngoặc; 3.24 bài toán giải bằng hai bước tính; ôn cuối học kỳ 1 | Cánh Diều dạy biểu thức ở đầu học kỳ 2 |

### Học kỳ 2

| Tuần | Nội dung | Ghi chú |
|---|---|---|
| 19 đến 21 | 3.2 số đến 10 000; 3.4 so sánh; 3.5 làm tròn đến hàng chục, hàng trăm, hàng nghìn; 3.6 chữ số La Mã | |
| 21 đến 23 | 3.8 cộng trừ trong 10 000; 3.10 nhẩm số tròn nghìn; 3.15 và 3.17 nhân, chia số có bốn chữ số với số có một chữ số | |
| 23 đến 25 | B3.7 chu vi tam giác, tứ giác; B3.8 chu vi hình chữ nhật, hình vuông; B3.9 diện tích, cm²; B3.10 diện tích hình chữ nhật, hình vuông; B3.19 bài toán chu vi, diện tích | Chân trời sáng tạo dạy chu vi ngay sau hình chữ nhật ở học kỳ 1, diện tích ở học kỳ 2 |
| 25 đến 27 | 3.25 bài toán rút về đơn vị; B3.15 tiền Việt Nam; B3.16 tháng, năm, xem lịch; B3.18 thời gian trôi qua | |
| 27 đến 30 | 3.3 số đến 100 000; 3.4 so sánh, xếp thứ tự trong 100 000; 3.5 làm tròn; 3.9 cộng trừ trong 100 000; 3.10 nhẩm số tròn chục nghìn; 3.15 và 3.17 nhân, chia số có năm chữ số với số có một chữ số | |
| 30 đến 32 | C3.1 thu thập, ghi chép số liệu; C3.2 bảng số liệu; C3.3 biểu đồ tranh; C3.4 khả năng xảy ra | Kết nối tri thức rải thống kê ở cả hai học kỳ |
| 32 đến 35 | Ôn tập cuối năm; D3.1 thực hành đo đạc, thời gian biểu | |

Hệ quả cho game: một bé lớp 3 chơi vào tháng 10 chưa học chia có dư và chưa học số đến 10 000. Mở khóa nội dung nên theo thứ tự trên, và trang chủ nên nhắc phụ huynh "bé đang học đến đâu" thay vì mở hết. Với bé học kỳ 2 hoặc bé đã lên lớp 4 ôn lại thì mở toàn bộ.

## 4. Bảng tóm tắt

Trạng thái theo bản đồ ngày 2026-09-10: Đã có = có màn luyện trên 3hoa.com; Một phần = mới chạm tới; Chưa có. Ưu tiên: P0 làm trước (nền tảng, đo được, nhiều giá trị với phụ huynh), P1 làm trong năm đầu, P2 làm khi có sức hoặc bằng phiếu in.

| Mã | Tên | Tiên quyết | Ưu tiên | Trạng thái game |
|---|---|---|---|---|
| 3.1 | Ôn tập các số đến 1 000 | 2.3, 2.4, 2.6 | P2 | Một phần (Ninja a5 chỉ tính) |
| 3.2 | Số đến 10 000: đọc, viết, cấu tạo | 3.1 | P1 | Chưa có |
| 3.3 | Số đến 100 000: đọc, viết, cấu tạo | 3.2 | P2 | Chưa có |
| 3.4 | So sánh, xếp thứ tự trong 100 000 | 3.2, 3.3, 2.6 | P1 | Chưa có |
| 3.5 | Làm tròn đến hàng chục, trăm, nghìn | 3.2, 3.4 | P1 | Chưa có |
| 3.6 | Chữ số La Mã I đến XXI | 2.1 (đếm đến 21) | P2 | Chưa có |
| 3.7 | Cộng, trừ số có ba chữ số có nhớ | 2.11, 2.12, 3.1 | P0 | Đã có (Ninja a5) |
| 3.8 | Cộng, trừ trong 10 000 | 3.7, 3.2 | P1 | Chưa có |
| 3.9 | Cộng, trừ trong 100 000 | 3.8, 3.3 | P2 | Chưa có |
| 3.10 | Nhẩm số tròn nghìn, tròn chục nghìn | 2.13, 3.2, 3.3 | P1 | Chưa có |
| 3.11 | Tìm thành phần phép cộng, phép trừ | 2.14, 2.15, 3.7 | P0 | Một phần (Ninja p1 p2 p3) |
| 3.12 | Bảng nhân 3, 4, 6, 7, 8, 9 | 2.19, 2.20 | P0 | Đã có (Ninja m2 m3, Vệ Binh) |
| 3.13 | Bảng chia 3, 4, 6, 7, 8, 9 | 2.21, 2.22, 2.24, 3.12 | P0 | Đã có (Ninja d2 d3, Vệ Binh) |
| 3.14 | Nhân số có hai chữ số với số có một chữ số | 3.12, 2.11 | P0 | Đã có (Ninja m4, Vệ Binh) |
| 3.15 | Nhân số có ba, bốn, năm chữ số với số có một chữ số | 3.14, 3.2, 3.3 | P1 | Một phần (m4 tới ba chữ số) |
| 3.16 | Chia số có hai chữ số cho số có một chữ số | 3.13, 3.18 | P0 | Đã có (Ninja d4, Vệ Binh) |
| 3.17 | Chia số có ba, bốn, năm chữ số cho số có một chữ số | 3.16, 3.18 | P1 | Một phần (d4 luôn chia hết theo hàng) |
| 3.18 | Phép chia hết và phép chia có dư | 3.13, 2.21 | P0 | Chưa có |
| 3.19 | Tìm thành phần phép nhân, phép chia | 2.23, 2.24, 3.12, 3.13 | P0 | Một phần (Ninja p6 p7, Vệ Binh Tìm thừa số) |
| 3.20 | Gấp một số lên nhiều lần, giảm đi nhiều lần | 3.12, 3.13, 2.17 | P1 | Chưa có |
| 3.21 | Số lớn gấp mấy lần số bé, số bé bằng một phần mấy số lớn | 3.20, 3.13 | P1 | Chưa có |
| 3.22 | Một phần mấy của một số | 2.25, 3.13 | P1 | Chưa có |
| 3.23 | Biểu thức số, dấu ngoặc, thứ tự phép tính | 2.16, 3.12, 3.13 | P1 | Chưa có |
| 3.24 | Bài toán giải bằng hai bước tính | 2.18, 2.26, 3.20, 3.23 | P1 | Chưa có |
| 3.25 | Bài toán rút về đơn vị | 3.24, 3.14, 3.16 | P1 | Chưa có |
| B3.1 | Điểm ở giữa, trung điểm | B2.1, B2.2, B2.7 | P2 | Chưa có |
| B3.2 | Góc, góc vuông, ê ke | B2.1, B2.11 | P1 | Chưa có |
| B3.3 | Tam giác, tứ giác: đỉnh, cạnh, góc | B2.3, B3.2 | P2 | Chưa có |
| B3.4 | Hình chữ nhật, hình vuông | B3.2, B3.3 | P1 | Chưa có |
| B3.5 | Hình tròn: tâm, bán kính, đường kính | B2.1, B2.7 | P2 | Chưa có |
| B3.6 | Khối lập phương, khối hộp chữ nhật | B2.4, B3.4 | P2 | Chưa có |
| B3.7 | Chu vi tam giác, tứ giác | B2.8, B3.3, 3.7 | P2 | Chưa có |
| B3.8 | Chu vi hình chữ nhật, hình vuông | B3.7, B3.4, 3.14 | P1 | Chưa có |
| B3.9 | Diện tích, xăng-ti-mét vuông | B3.4, 3.12 | P2 | Chưa có |
| B3.10 | Diện tích hình chữ nhật, hình vuông | B3.9, 3.14 | P1 | Chưa có |
| B3.11 | Bảng đơn vị đo độ dài | B2.6, 3.10 | P2 | Chưa có |
| B3.12 | Gam, ki-lô-gam | B2.9, 3.2 | P2 | Chưa có |
| B3.13 | Mi-li-lít, lít | B2.10, 3.2 | P2 | Chưa có |
| B3.14 | Nhiệt độ, độ C | 2.2 (tia số) | P2 | Chưa có |
| B3.15 | Tiền Việt Nam mệnh giá lớn | B2.14, 3.10, 3.24 | P1 | Chưa có |
| B3.16 | Tháng, năm, xem lịch | B2.13 | P1 | Chưa có |
| B3.17 | Xem đồng hồ từng phút, đồng hồ điện tử | B2.11, B2.12 | P0 | Đã có (Tháp, Xe Tăng, Cưỡi Hổ) |
| B3.18 | Tính khoảng thời gian | B3.17, 3.7 | P0 | Một phần (chưa có dạng tìm giờ bắt đầu) |
| B3.19 | Bài toán chu vi, diện tích | B3.8, B3.10, 3.24 | P2 | Chưa có |
| C3.1 | Thu thập, phân loại, ghi chép số liệu | C2.1 | P2 | Chưa có |
| C3.2 | Bảng số liệu | C3.1, 3.4 | P2 | Chưa có |
| C3.3 | Biểu đồ tranh, so sánh số liệu | C2.2, 3.12 | P2 | Chưa có |
| C3.4 | Khả năng xảy ra của sự kiện | C2.3 | P2 | Chưa có |
| D3.1 | Thực hành đo đạc, thời gian biểu | B3.8, B3.10, B3.18 | P2 | Chưa có (phiếu in) |

Đếm: 6 đã có, 6 một phần, 37 chưa có, khớp mục 2.3 của `01-muc-tieu-va-ky-vong.md`. P0: 10 nội dung; P1: 20; P2: 19.

## 5. Ngưỡng thành thạo và quy ước dùng chung

Định nghĩa "Đã thuộc" gốc nằm ở mục 3 của `01-muc-tieu-va-ky-vong.md`: ít nhất 20 câu không gợi ý, đúng từ 90%, kho ôn lại của nội dung đó trống, chỉ tính 14 ngày gần nhất. Tài liệu này thêm hai điều kiện để tránh "thuộc giả": **hai phiên** (hai ngày khác nhau, cách nhau ít nhất 1 ngày) và **thời gian trả lời** (tính từ lúc câu hỏi hiện đủ trên màn hình đến lúc bé chốt đáp án; ở Ninja là lúc quả hiện ra, ở Vệ Binh là lúc bấm BẮN). Câu trả lời chậm hơn trần thời gian nhưng đúng vẫn là đúng, chỉ không được tính vào ngưỡng "Đã thuộc"; câu trả lời dưới 1 giây ở dạng chọn đáp án bị gắn cờ đoán mò (mục 7 của `01-muc-tieu-va-ky-vong.md`).

| Nhóm | Dùng cho | Độ chính xác | Thời gian mỗi câu | Số câu tối thiểu |
|---|---|---|---|---|
| N1 phản xạ | Bảng nhân, bảng chia, nhẩm số tròn, đọc giờ | 9/10 trong mỗi phiên, 2 phiên | Dưới 4 giây | 30 câu không gợi ý, phủ đủ mọi dòng của bảng |
| N2 tính viết ngắn | Cộng trừ ba chữ số, nhân chia hai và ba chữ số với một chữ số, chia có dư | 9/10, 2 phiên | Dưới 15 giây | 20 câu |
| N3 tính viết dài | Cộng trừ bốn và năm chữ số, nhân chia bốn và năm chữ số | 8/10, 2 phiên | Dưới 30 giây | 20 câu |
| N4 khái niệm và đọc | Đọc viết số, so sánh, làm tròn, gấp giảm, một phần mấy, hình học, đơn vị đo | 9/10, 2 phiên | Dưới 10 giây | 20 câu |
| N5 bài toán | Bài toán hai bước, rút về đơn vị, chu vi diện tích, thời gian trôi qua | 4/5, 2 phiên | Dưới 60 giây mỗi bài | 10 bài, ít nhất 3 dạng khác nhau |

Trần thời gian là cho trẻ 8 đến 9 tuổi thao tác trên iPad hoặc điện thoại, đã tính cả thời gian nhập số bằng bàn phím trên màn hình (khoảng 1 giây cho mỗi hai chữ số). Nếu game có nhập số thì cộng thêm 2 giây cho N2 và 3 giây cho N3.

Quy ước dạng câu hỏi (dùng trong cột "Dạng" ở từng mục): **chọn** (chọn 1 trong 3 đến 4 đáp án, kiểu chém quả của Ninja hoặc bắn robot của Xe Tăng), **nhập** (gõ số trên bàn phím, kiểu Vệ Binh), **ghép** (ghép đôi hai thẻ), **xếp** (kéo thả để sắp thứ tự), **kéo** (kéo vật vào đúng chỗ), **hình** (thao tác trực tiếp trên hình: xoay kim, kéo đỉnh, tô ô), **đúng sai** (hai nút). Dạng **chọn** chỉ đáng tin khi đáp án nhiễu sinh từ lỗi thật của bé (mục "Lỗi thường gặp" của từng nội dung); dạng **nhập** là bắt buộc cho nội dung có nhớ, có dư, nhiều chữ số theo tiêu chí đổi hướng (c) của `01-muc-tieu-va-ky-vong.md`.

Quy ước mã lỗi: mỗi lỗi có một mã ASCII ngắn (ví dụ `quen-nho`, `tru-nguoc`, `o-ben-canh`) để game ghi vào nhật ký ván theo M12 và báo cáo phụ huynh gộp theo tên lỗi. Danh mục đầy đủ ở phụ lục cuối tài liệu. Game chỉ ghi mã lỗi khi đáp án sai của bé **trùng đúng** với đáp án nhiễu sinh từ lỗi đó; sai khác thì ghi `khac`.

## 6. Mạch A: Số và phép tính

### 3.1 Ôn tập các số đến 1 000

**Yêu cầu cần đạt**

- Đọc đúng số có ba chữ số kể cả số có chữ số 0 ở giữa hoặc cuối: 205 đọc là "hai trăm linh năm", 340 đọc là "ba trăm bốn mươi", 999 đọc là "chín trăm chín mươi chín".
- Viết được số khi nghe đọc: nghe "bốn trăm linh bảy" viết 407, không viết 4007.
- Nói được cấu tạo số: 638 gồm 6 trăm, 3 chục, 8 đơn vị; viết được 638 = 600 + 30 + 8 và ngược lại.
- Chỉ được số liền trước, liền sau: liền trước 500 là 499, liền sau 999 là 1 000.
- Đặt đúng một số lên tia số chia vạch 100 hoặc 10.

**Kiến thức tiên quyết:** 2.3 (đơn vị, chục, trăm), 2.4 (đọc viết số đến 1 000), 2.5 (liền trước, liền sau), 2.6 (so sánh trong 1 000).

**Ngưỡng thành thạo:** nhóm N4, riêng đọc số nghe giọng thì dưới 6 giây. Tối thiểu 20 câu trong đó ít nhất 6 câu có chữ số 0.

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| Viết theo lời đọc, mỗi tiếng một chữ số | "bốn trăm linh bảy" viết thành 4007 | Số có 4 chữ số, chèn 0 sau hàng trăm | `viet-theo-loi` |
| Bỏ chữ số 0 ở giữa | 407 viết thành 47, hoặc đọc 407 là "bốn mươi bảy" | Số bị mất chữ số 0 | `mat-so-0` |
| Nhầm hàng khi ghép cấu tạo | "3 trăm và 5 đơn vị" viết 35 hoặc 350 | 35 (thiếu hàng chục), 350 (5 nhảy sang hàng chục) | `sai-hang` |
| Liền trước, liền sau qua mốc tròn | Liền trước 500 trả lời 490 hoặc 400 | Đáp án đúng trừ 10 hoặc 100 | `qua-moc-tron` |
| Đảo chữ số khi viết | 638 viết 683 | Hoán vị hai chữ số | `dao-chu-so` |

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | Nghe "ba trăm hai mươi lăm", chọn số | 325 | chọn |
| Dễ | 4 trăm 2 chục 6 đơn vị là số nào | 426 | nhập |
| Trung bình | Nghe "bảy trăm linh ba", viết số | 703 | nhập (nhiễu 73, 7003, 730) |
| Trung bình | Số liền sau của 899 | 900 | nhập |
| Trung bình | 560 = 500 + ? | 60 | nhập |
| Khó | Kéo thẻ 100, 10, 1 xếp thành số 407 | 4 thẻ 100, 7 thẻ 1 | kéo |
| Khó | Đặt số 640 lên tia số 600 đến 700 vạch 10 | vạch thứ 4 | hình |

**Ưu tiên:** P2. Nền tảng nhưng phần lớn bé lớp 3 đã nắm từ lớp 2; game chỉ cần một màn ôn ngắn dùng chung với 3.2 (cùng cơ chế máy đếm bốn ô), không đáng làm riêng.

### 3.2 Các số đến 10 000: đọc, viết, cấu tạo số

**Yêu cầu cần đạt**

- Đọc, viết số có bốn chữ số, nhất là số có chữ số 0: 1 005 đọc là "một nghìn không trăm linh năm", 4 020 đọc là "bốn nghìn không trăm hai mươi", 2 400 đọc là "hai nghìn bốn trăm".
- Nói cấu tạo: 3 052 gồm 3 nghìn, 0 trăm, 5 chục, 2 đơn vị; viết 3 052 = 3 000 + 50 + 2.
- Đếm thêm 1 000, thêm 100, thêm 10 từ một số bất kỳ: 4 700, 4 800, 4 900, 5 000.
- Nhận biết 10 000 là "mười nghìn", bằng 10 nghìn, là số liền sau 9 999.
- Viết được số tròn nghìn, tròn trăm trong phạm vi 10 000.

**Kiến thức tiên quyết:** 3.1.

**Ngưỡng thành thạo:** nhóm N4, dưới 8 giây cho đọc số, dưới 12 giây cho ghép cấu tạo bằng thẻ. Tối thiểu 20 câu, ít nhất 8 câu có chữ số 0 ở hàng trăm hoặc hàng chục.

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| Viết theo lời đọc | "một nghìn không trăm linh năm" viết 10005 hoặc 1 0005 | Số có 5 chữ số trở lên | `viet-theo-loi` |
| Bỏ "không trăm" khi đọc | Đọc 4 020 là "bốn nghìn hai mươi" | Ở dạng chọn cách đọc: phương án thiếu "không trăm" | `mat-so-0` |
| Nhầm hàng khi ghép cấu tạo | "3 nghìn 5 chục" viết 3 500 | 3 500 thay vì 3 050 | `sai-hang` |
| Đếm thêm qua mốc nghìn | 4 900 thêm 100 trả lời 4 1000 hoặc 5 900 | Chuỗi số không tăng đúng bước | `qua-moc-tron` |
| Nhầm 10 000 với 1 000 hoặc 100 000 | Liền sau 9 999 trả lời 1 000 | Sai số chữ số 0 | `dem-so-0` |

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | Nghe "hai nghìn ba trăm", chọn số | 2 300 | chọn (nhiễu 230, 20 300, 2 030) |
| Dễ | 5 nghìn 4 trăm 7 chục 1 đơn vị | 5 471 | nhập |
| Trung bình | Chỉnh máy đếm bốn ô cho khớp "một nghìn không trăm linh năm" | 1 0 0 5 | hình |
| Trung bình | 6 080 = 6 000 + ? + 0 | 80 | nhập |
| Trung bình | Đếm tiếp: 7 700, 7 800, 7 900, ? | 8 000 | nhập |
| Khó | Số gồm 9 nghìn và 9 đơn vị | 9 009 | nhập (nhiễu 99, 9 090, 9 900) |
| Khó | Số liền sau của 9 999 | 10 000 | nhập |
| Khó | Chọn cách đọc đúng của 3 007 | "ba nghìn không trăm linh bảy" | chọn |

**Ưu tiên:** P1. Là cửa ngõ của học kỳ 2 lớp 3 và của mọi phép tính trong 10 000; dễ đo bằng nhập số; phụ huynh thấy rõ khi con đọc sai "một nghìn không trăm linh năm". Chưa có game.

### 3.3 Các số đến 100 000: đọc, viết, cấu tạo số

**Yêu cầu cần đạt**

- Đọc, viết số có năm chữ số: 25 300 đọc là "hai mươi lăm nghìn ba trăm", 30 007 đọc là "ba mươi nghìn không trăm linh bảy", 100 000 đọc là "một trăm nghìn".
- Nói cấu tạo theo hàng chục nghìn, nghìn, trăm, chục, đơn vị: 46 205 gồm 4 chục nghìn, 6 nghìn, 2 trăm, 0 chục, 5 đơn vị.
- Nhận ra phần "nghìn" đọc như số có hai chữ số: 45 000 là "bốn mươi lăm nghìn", không phải "bốn năm nghìn".
- Đếm thêm 10 000, thêm 1 000 từ một số bất kỳ.

**Kiến thức tiên quyết:** 3.2.

**Ngưỡng thành thạo:** nhóm N4, dưới 10 giây. Tối thiểu 20 câu, ít nhất 8 câu có chữ số 0.

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| Viết theo lời đọc | "ba mươi nghìn không trăm linh bảy" viết 300007 | Số có 6 chữ số | `viet-theo-loi` |
| Đọc phần nghìn từng chữ số | 45 000 đọc "bốn năm nghìn" | Phương án đọc sai | `doc-tung-chu-so` |
| Mất chữ số 0 ở giữa | 30 007 viết 3 007 hoặc 37 | Số ít chữ số hơn | `mat-so-0` |
| Nhầm hàng chục nghìn với nghìn | "5 chục nghìn 2 nghìn" viết 5 200 | 5 200 thay vì 52 000 | `sai-hang` |
| Đếm thêm qua 100 000 | 90 000 thêm 10 000 trả lời 10 000 | Thiếu một chữ số 0 | `dem-so-0` |

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | Nghe "hai mươi nghìn", chọn số | 20 000 | chọn (nhiễu 2 000, 200 000, 20 100) |
| Dễ | 3 chục nghìn 4 nghìn 5 trăm | 34 500 | nhập |
| Trung bình | Chỉnh máy đếm năm ô cho khớp "sáu mươi nghìn không trăm bốn mươi" | 6 0 0 4 0 | hình |
| Trung bình | 78 020 = 70 000 + 8 000 + ? | 20 | nhập |
| Khó | Số gồm 9 chục nghìn và 9 đơn vị | 90 009 | nhập |
| Khó | Chọn cách đọc đúng của 15 015 | "mười lăm nghìn không trăm mười lăm" | chọn |
| Khó | Số liền sau của 99 999 | 100 000 | nhập |

**Ưu tiên:** P2. Cùng cơ chế với 3.2, chỉ thêm một ô; làm ngay sau 3.2 nếu 3.2 chứng minh được có bé dùng. Giá trị với phụ huynh thấp hơn vì đến cuối năm mới học.

### 3.4 So sánh, xếp thứ tự các số trong phạm vi 100 000

**Yêu cầu cần đạt**

- Nói được quy tắc và làm đúng: số nào nhiều chữ số hơn thì lớn hơn (9 876 < 12 345); cùng số chữ số thì so từ hàng cao nhất, hàng nào khác thì quyết định ở hàng đó (45 210 > 45 190 vì hàng trăm 2 > 1).
- Dùng đúng dấu >, <, = giữa hai số.
- Xếp 3 đến 5 số theo thứ tự từ bé đến lớn hoặc từ lớn đến bé, kể cả khi có số ít chữ số hơn.
- Tìm số lớn nhất, bé nhất trong nhóm.

**Kiến thức tiên quyết:** 3.2, 3.3, 2.6.

**Ngưỡng thành thạo:** nhóm N4, dưới 6 giây cho so sánh hai số, dưới 20 giây cho xếp 4 số. Tối thiểu 20 câu, ít nhất 5 câu có hai số khác số chữ số, 5 câu chỉ khác ở hàng chục hoặc đơn vị.

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| So chữ số đầu, bỏ qua độ dài | 9 876 > 12 345 vì 9 > 1 | Chọn số ít chữ số hơn là lớn hơn khi chữ số đầu của nó lớn hơn | `so-chu-so-dau` |
| So hàng đơn vị trước | 45 190 > 45 210 vì 0 > ... hoặc 1 293 > 1 310 vì 3 > 0 | Chọn số có hàng đơn vị lớn hơn | `so-hang-thap` |
| Xếp ngược chiều yêu cầu | Đề "từ bé đến lớn" nhưng xếp từ lớn đến bé | Dãy đảo hoàn toàn | `nguoc-chieu` |
| Nhầm hướng dấu | Viết 3 400 < 2 900 | Dấu ngược | `nguoc-dau` |
| Đọc nhầm số có chữ số 0 | 30 500 so với 35 000 | Chọn 30 500 lớn hơn | `mat-so-0` |

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | 4 500 ? 5 400 | < | chọn (ba dấu) |
| Dễ | Số lớn nhất trong 999, 1 000, 899 | 1 000 | chọn |
| Trung bình | 9 876 ? 12 345 | < | chọn |
| Trung bình | 45 210 ? 45 190 | > | chọn |
| Trung bình | Xếp từ bé đến lớn: 3 050, 3 500, 3 005 | 3 005, 3 050, 3 500 | xếp |
| Khó | Bắn thiên thạch theo thứ tự tăng dần: 12 000, 9 999, 10 100, 12 010 | 9 999, 10 100, 12 000, 12 010 | xếp |
| Khó | Số bé nhất có năm chữ số khác nhau | 10 234 | nhập |

**Ưu tiên:** P1. Dễ đo, đáp án nhiễu rõ ràng, làm được ngay bằng cơ chế bắn thiên thạch theo thứ tự đã gợi ý trong bản đồ; là nền cho làm tròn (3.5) và cho đọc bảng số liệu (C3.2).

### 3.5 Làm tròn số đến hàng chục, hàng trăm, hàng nghìn

**Yêu cầu cần đạt**

- Nói được quy tắc: nhìn chữ số ở hàng liền bên phải hàng cần làm tròn; nếu là 0, 1, 2, 3, 4 thì giữ nguyên (làm tròn xuống), nếu là 5, 6, 7, 8, 9 thì thêm 1 vào hàng đó (làm tròn lên); mọi hàng bên phải đổi thành 0.
- Làm tròn đúng: 1 249 làm tròn đến hàng chục là 1 250, đến hàng trăm là 1 200, đến hàng nghìn là 1 000; 3 462 đến hàng trăm là 3 500.
- Làm tròn đúng số có chữ số 9 phải nhớ: 2 996 làm tròn đến hàng chục là 3 000.
- Chỉ trên tia số: 1 249 gần 1 200 hơn hay gần 1 300 hơn.

**Kiến thức tiên quyết:** 3.2, 3.4, 2.13 (số tròn chục, tròn trăm).

**Ngưỡng thành thạo:** nhóm N4, dưới 8 giây. Tối thiểu 20 câu, phủ cả ba hàng, ít nhất 4 câu có chữ số quyết định là 5 và 3 câu phải nhớ qua hàng.

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| Nhìn nhầm hàng quyết định (thường nhìn hàng đơn vị) | 1 249 làm tròn đến trăm ra 1 300 vì thấy 9 | Đáp án đúng cộng thêm một bậc của hàng làm tròn | `nham-hang-quyet-dinh` |
| Làm tròn dây chuyền | 1 249 → 1 250 → 1 300 | Như trên, cần kèm câu hỏi "vì sao" để tách với lỗi trên | `lam-tron-day-chuyen` |
| Chỉ cắt bỏ, không làm tròn lên | 3 462 đến hàng trăm ra 3 400 | Đáp án đúng trừ một bậc khi chữ số quyết định từ 5 trở lên | `chi-cat-bo` |
| Mốc 5 làm tròn xuống | 45 đến hàng chục ra 40 | Như trên nhưng chỉ khi chữ số quyết định là 5 | `moc-5-xuong` |
| Không đổi các hàng bên phải thành 0 | 3 462 đến hàng trăm ra 3 562 | Các chữ số bên phải giữ nguyên | `giu-hang-phai` |

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | 72 làm tròn đến hàng chục | 70 | chọn (nhiễu 80, 60, 75) |
| Dễ | 380 làm tròn đến hàng trăm | 400 | chọn |
| Trung bình | 1 249 làm tròn đến hàng trăm | 1 200 | chọn (nhiễu 1 300, 1 250, 1 000) |
| Trung bình | 3 462 làm tròn đến hàng trăm | 3 500 | nhập |
| Trung bình | Bắn số 1 249 về mốc gần nhất trên tia số 1 000 đến 2 000 vạch 100 | 1 200 | hình |
| Khó | 2 996 làm tròn đến hàng chục | 3 000 | nhập |
| Khó | 45 000 là số nào sau đây làm tròn đến hàng nghìn: 44 499, 44 500, 45 500 | 44 500 | chọn |

**Ưu tiên:** P1. Nội dung mới của Chương trình 2018 mà phụ huynh học chương trình cũ không quen, nên hay dạy sai (làm tròn dây chuyền); game dạy đúng quy tắc sẽ được phụ huynh tin. Cơ chế tia số đã có gợi ý trong bản đồ.

### 3.6 Chữ số La Mã từ I đến XXI

**Yêu cầu cần đạt**

- Nhận ra ba ký hiệu I (1), V (5), X (10); đọc được các số từ I đến XXI và viết được số La Mã tương ứng với số từ 1 đến 21.
- Nói được quy tắc: ký hiệu nhỏ đứng trước ký hiệu lớn thì bớt (IV là 4, IX là 9), đứng sau thì thêm (VI là 6, XI là 11); không viết quá ba ký hiệu I liền nhau.
- Đọc giờ trên đồng hồ ghi số La Mã.

**Kiến thức tiên quyết:** đếm đến 21 (lớp 1), B2.11 (xem đồng hồ) nếu dùng mặt đồng hồ.

**Ngưỡng thành thạo:** nhóm N1 nhưng dưới 5 giây. Tối thiểu 20 câu phủ đủ 21 số.

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| Cộng thay vì bớt khi ký hiệu nhỏ đứng trước | IV đọc là 6, IX đọc là 11 | Đáp án đúng cộng 2 (IV → 6) hoặc cộng 2 (IX → 11) | `la-ma-cong-thay-bot` |
| Viết bằng cách lặp | 4 viết IIII, 9 viết VIIII | Chuỗi có 4 ký hiệu I liền | `la-ma-lap` |
| Đảo thứ tự | 6 viết IV, 4 viết VI | Chuỗi đảo ngược | `la-ma-dao` |
| Nhầm X với V | XI đọc là 6 | Đáp án lệch 5 | `la-ma-nham-ky-hieu` |
| Đọc từng ký hiệu rồi cộng bừa | XIX đọc là 21 (10 + 1 + 10) | 21 thay vì 19 | `la-ma-cong-thay-bot` |

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | VII là số mấy | 7 | chọn (nhiễu 5, 6, 8) |
| Dễ | Viết số 3 bằng chữ số La Mã | III | chọn |
| Trung bình | IX là số mấy | 9 | chọn (nhiễu 11, 10, 4) |
| Trung bình | Viết số 14 | XIV | ghép (ghép thẻ số với thẻ La Mã) |
| Khó | XIX là số mấy | 19 | chọn (nhiễu 21, 11, 9) |
| Khó | Đồng hồ số La Mã: kim ngắn gần IV, kim dài chỉ XII | 4 giờ | hình |
| Khó | Xếp III, XII, IX, VI từ bé đến lớn | III, VI, IX, XII | xếp |

**Ưu tiên:** P2. Ít giá trị nền tảng, ít thời lượng trong SGK; nhưng chi phí thấp nếu chỉ thêm mặt đồng hồ số La Mã vào Tháp Đồng Hồ như bản đồ gợi ý, nên làm kèm khi sửa game đồng hồ.

### 3.7 Cộng, trừ các số có ba chữ số có nhớ

**Yêu cầu cần đạt**

- Đặt tính thẳng hàng rồi tính đúng phép cộng có nhớ một hoặc hai lần: 456 + 287 = 743, nói được "6 cộng 7 bằng 13, viết 3 nhớ 1; 5 cộng 8 bằng 13, thêm 1 là 14, viết 4 nhớ 1; 4 cộng 2 bằng 6, thêm 1 là 7".
- Tính đúng phép trừ có mượn, kể cả mượn liên tiếp qua chữ số 0: 703 − 458 = 245.
- Nhẩm được các trường hợp đặc biệt: 500 − 1 = 499, 1 000 − 400 = 600, 250 + 250 = 500.
- Thử lại: 743 − 287 = 456 để kiểm tra phép cộng.
- Ước lượng trước khi tính: 456 + 287 "khoảng 700".

**Kiến thức tiên quyết:** 2.11 (có nhớ trong 100), 2.12 (cộng trừ trong 1 000), 3.1.

**Ngưỡng thành thạo:** nhóm N2, dưới 15 giây (17 giây nếu nhập số). Tối thiểu 20 câu không gợi ý, ít nhất 6 câu nhớ hai lần, 4 câu trừ có chữ số 0 ở số bị trừ. Ninja a5 hiện chỉ có dạng chọn với 4 quả; theo tiêu chí đổi hướng (c), cần thêm dạng nhập cho nội dung này trước khi cấp "Đã thuộc".

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| Quên nhớ ở hàng chục | 456 + 287 = 733 | Đáp án đúng trừ 10 | `quen-nho` |
| Quên nhớ ở hàng trăm | 456 + 287 = 643 | Đáp án đúng trừ 100 | `quen-nho` |
| Trừ ngược (lấy số lớn trừ số bé trong từng hàng) | 703 − 458 = 355 | Từng hàng lấy hiệu tuyệt đối | `tru-nguoc` |
| Quên mượn (không bớt 1 ở hàng bên trái) | 562 − 138 = 434 | Đáp án đúng cộng 10 | `quen-muon` |
| Mượn qua số 0 sai | 703 − 458 = 345 | Đáp án đúng cộng 100 | `quen-muon` |
| Nhầm dấu | 456 + 287 chọn 169 | Bằng hiệu thay vì tổng | `nham-dau` |
| Đặt tính lệch hàng | 456 + 87 = 1 326 | Số hạng ngắn bị dịch sang trái một hàng | `lech-hang` |

Cách Ninja hiện làm: `distractors` trong `math-ninja/js/math.js` đã sinh nhiễu `ans − 10` khi có nhớ và `ans + 10` khi có mượn; `misconception` gọi tên "Con quên nhớ 1 rồi!". Cần bổ sung nhiễu `ans − 100`, `ans + 100` cho nhớ ở hàng trăm và nhiễu "trừ ngược từng hàng" cho số có ba chữ số.

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | 325 + 143 | 468 | chọn |
| Dễ | 600 − 250 | 350 | chọn |
| Trung bình | 456 + 287 | 743 | nhập (nhiễu 733, 643, 169) |
| Trung bình | 562 − 138 | 424 | nhập (nhiễu 434, 436) |
| Trung bình | 375 + 125 | 500 | nhập |
| Khó | 703 − 458 | 245 | nhập (nhiễu 355, 345, 255) |
| Khó | 1 000 − 236 | 764 | nhập |
| Khó | Chọn phép thử lại đúng cho 456 + 287 = 743 | 743 − 287 = 456 | chọn |

**Ưu tiên:** P0. Nền tảng của mọi phép cộng trừ về sau, đã có màn a5 nên chi phí thêm dạng nhập và mã lỗi thấp; "quên nhớ" là lỗi phụ huynh nhận ra ngay khi đọc báo cáo.

### 3.8 Cộng, trừ trong phạm vi 10 000

**Yêu cầu cần đạt**

- Đặt tính và tính đúng với số có bốn chữ số, nhớ tới ba lần: 2 789 + 4 567 = 7 356; 5 000 − 2 345 = 2 655.
- Cộng trừ số có số chữ số khác nhau, đặt thẳng hàng đơn vị: 2 345 + 678 = 3 023.
- Nhẩm số tròn trăm, tròn nghìn: 3 200 + 1 800 = 5 000; 10 000 − 4 000 = 6 000.
- Giải bài toán có lời văn một bước với số trong 10 000 (kho có 3 250 kg gạo, bán 1 675 kg, còn bao nhiêu kg).

**Kiến thức tiên quyết:** 3.7, 3.2.

**Ngưỡng thành thạo:** nhóm N3, dưới 25 giây (28 giây nếu nhập số). Tối thiểu 20 câu, ít nhất 5 câu nhớ ba lần, 4 câu trừ từ số tròn nghìn.

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| Quên nhớ ở một hàng | 2 789 + 4 567 = 7 256 hoặc 6 356 | Đáp án đúng trừ 100 hoặc 1 000 | `quen-nho` |
| Trừ ngược từng hàng | 5 000 − 2 345 = 3 345 | Từng hàng lấy hiệu tuyệt đối | `tru-nguoc` |
| Quên mượn dây chuyền qua các số 0 | 5 000 − 2 345 = 3 655 hoặc 2 755 | Đáp án đúng cộng 1 000 hoặc 100 | `quen-muon` |
| Đặt tính lệch hàng | 2 345 + 678 = 9 125 | Số ngắn dịch trái một hàng | `lech-hang` |
| Đếm sai số chữ số 0 khi nhẩm | 3 200 + 1 800 = 500 hoặc 50 000 | Sai bậc 10 | `dem-so-0` |

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | 2 300 + 1 500 | 3 800 | chọn |
| Dễ | 4 000 − 1 000 | 3 000 | chọn |
| Trung bình | 3 456 + 2 187 | 5 643 | nhập |
| Trung bình | 6 543 − 2 178 | 4 365 | nhập (nhiễu 4 375, 4 435) |
| Trung bình | 2 345 + 678 | 3 023 | nhập (nhiễu 9 125, 2 913) |
| Khó | 2 789 + 4 567 | 7 356 | nhập (nhiễu 7 256, 6 356, 6 256) |
| Khó | 5 000 − 2 345 | 2 655 | nhập (nhiễu 3 345, 3 655) |
| Khó | Kho có 3 250 kg gạo, bán 1 675 kg. Còn bao nhiêu kg | 1 575 | nhập, chọn phép tính trước |

**Ưu tiên:** P1. Bản đồ ghi đúng: chỉ cần nới trần số của Ninja a5 và thêm dạng nhập; đo được ngay bằng mã lỗi của 3.7.

### 3.9 Cộng, trừ trong phạm vi 100 000

**Yêu cầu cần đạt**

- Đặt tính và tính đúng với số có năm chữ số: 45 678 + 23 456 = 69 134; 100 000 − 37 250 = 62 750.
- Nhẩm số tròn chục nghìn: 40 000 + 30 000 = 70 000; 90 000 − 50 000 = 40 000.
- Giữ được sự chú ý qua 5 cột, tự kiểm tra bằng ước lượng: 45 678 + 23 456 "khoảng 70 000".

**Kiến thức tiên quyết:** 3.8, 3.3.

**Ngưỡng thành thạo:** nhóm N3, dưới 30 giây (33 giây nếu nhập số). Tối thiểu 20 câu.

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| Quên nhớ ở một hàng | 45 678 + 23 456 = 69 034 | Đáp án đúng trừ 100, 1 000 hoặc 10 000 | `quen-nho` |
| Trừ ngược | 100 000 − 37 250 = 37 250 hoặc 137 250 | Từng hàng lấy hiệu tuyệt đối, hoặc cộng | `tru-nguoc`, `nham-dau` |
| Quên mượn qua dãy số 0 | 100 000 − 37 250 = 63 750 | Đáp án đúng cộng 1 000 | `quen-muon` |
| Lệch hàng với số bốn chữ số | 45 678 + 2 345 = 69 128 | Số ngắn dịch trái | `lech-hang` |
| Bỏ sót cột hàng chục nghìn | 45 678 + 23 456 = 9 134 | Thiếu chữ số đầu | `bo-cot` |

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | 40 000 + 30 000 | 70 000 | chọn |
| Dễ | 25 000 − 5 000 | 20 000 | chọn |
| Trung bình | 34 125 + 52 431 | 86 556 | nhập |
| Trung bình | 78 654 − 23 421 | 55 233 | nhập |
| Khó | 45 678 + 23 456 | 69 134 | nhập (nhiễu 69 034, 68 134) |
| Khó | 100 000 − 37 250 | 62 750 | nhập (nhiễu 63 750, 72 750) |
| Khó | 56 789 + 8 765 | 65 554 | nhập (nhiễu 144 439) |

**Ưu tiên:** P2. Đến cuối năm mới học, thao tác nhập 5 chữ số trên điện thoại chậm, cùng mã lỗi với 3.7 và 3.8 nên không thêm thông tin cho phụ huynh; làm sau khi 3.8 chạy ổn.

### 3.10 Tính nhẩm với số tròn nghìn, tròn chục nghìn

**Yêu cầu cần đạt**

- Nhẩm cộng trừ: 3 000 + 5 000 = 8 000 (nghĩ "3 nghìn cộng 5 nghìn bằng 8 nghìn"), 9 000 − 4 000 = 5 000, 20 000 + 30 000 = 50 000, 100 000 − 60 000 = 40 000.
- Nhẩm nhân chia với số có một chữ số: 4 000 × 2 = 8 000, 8 000 : 4 = 2 000, 30 000 × 3 = 90 000, 60 000 : 2 = 30 000.
- Nhẩm dạng "nghìn cộng trăm": 6 000 + 500 = 6 500; 7 000 + 200 + 30 = 7 230.
- Nói được cách nhẩm bằng lời: "8 nghìn chia 4 bằng 2 nghìn".

**Kiến thức tiên quyết:** 2.13 (nhẩm tròn chục, tròn trăm), 3.2, 3.3, 3.12, 3.13 (với nhân chia nhẩm).

**Ngưỡng thành thạo:** nhóm N1, dưới 4 giây. Tối thiểu 30 câu, trộn cả bốn phép tính.

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| Đếm sai số chữ số 0 | 3 000 + 5 000 = 80 000; 6 000 : 3 = 200 | Đáp án đúng nhân hoặc chia 10 | `dem-so-0` |
| Cộng cả số 0 như chữ số | 6 000 + 500 = 11 000 | 6 + 5 rồi gắn ba số 0 | `sai-hang` |
| Nhầm dấu | 9 000 − 4 000 = 13 000 | Tổng thay hiệu | `nham-dau` |
| Nhân thay chia | 8 000 : 4 = 32 000 | Tích thay thương | `nhan-thay-chia` |
| Nhầm bảng nhân | 7 000 × 8 = 54 000 | Sai như lỗi bảng nhân, thêm số 0 đúng | `nham-bang` |

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | 3 000 + 5 000 | 8 000 | chọn (nhiễu 80 000, 800, 8 500) |
| Dễ | 9 000 − 4 000 | 5 000 | chọn |
| Trung bình | 6 000 + 500 | 6 500 | chọn (nhiễu 11 000, 6 050) |
| Trung bình | 8 000 : 4 | 2 000 | chọn (nhiễu 200, 32 000) |
| Trung bình | 20 000 + 30 000 | 50 000 | chọn |
| Khó | 7 000 × 8 | 56 000 | chọn (nhiễu 54 000, 5 600) |
| Khó | 100 000 − 60 000 | 40 000 | chọn |
| Khó | 90 000 : 3 | 30 000 | chọn |

**Ưu tiên:** P1. Chi phí rất thấp (một màn tốc độ trong Ninja hoặc Siêu Ninja dùng bộ sinh số tròn như `genRound1000` hiện có), đo được như bảng cửu chương, và là nơi lỗi `dem-so-0` lộ rõ nhất.

### 3.11 Tìm thành phần chưa biết của phép cộng, phép trừ

**Yêu cầu cần đạt**

- Gọi đúng tên thành phần: trong 25 + ? = 61, ? là số hạng; trong ? − 17 = 45, ? là số bị trừ; trong 84 − ? = 39, ? là số trừ.
- Nói được và dùng đúng ba quy tắc: số hạng = tổng − số hạng kia; số bị trừ = hiệu + số trừ; số trừ = số bị trừ − hiệu.
- Viết được phép tính tìm rồi thử lại: ? + 25 = 61 nên ? = 61 − 25 = 36, thử 36 + 25 = 61.
- Làm được với số có ba chữ số: ? − 235 = 418 nên ? = 653.

**Kiến thức tiên quyết:** 2.14 (tên thành phần), 2.15 (tìm thành phần trong phạm vi 100), 3.7.

**Ngưỡng thành thạo:** nhóm N2, dưới 15 giây. Tối thiểu 20 câu, mỗi dạng (số hạng, số bị trừ, số trừ) ít nhất 6 câu. Ninja p1 p2 p3 hiện chỉ cho ghép đôi hai số có tổng cho trước, chưa đủ để tính là nội dung này.

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| Cộng khi phải trừ (thấy dấu + là cộng) | ? + 25 = 61 trả lời 86 | Tổng hai số cho | `cong-thay-tru` |
| Trừ khi phải cộng (thấy dấu − là trừ) | ? − 17 = 45 trả lời 28 | Hiệu hai số cho | `tru-thay-cong` |
| Nhầm quy tắc số trừ | 84 − ? = 39 trả lời 123 | Tổng hai số cho | `nham-quy-tac-so-tru` |
| Trừ ngược khi tìm số trừ | 84 − ? = 39, tính 39 − 84 rồi bỏ dấu | Thường ra đúng 45, chỉ nhận ra qua câu hỏi "con lấy gì trừ gì" | không ghi |
| Tính sai sau khi chọn đúng phép | ? = 61 − 25 = 46 | Sai như 3.7 | mã của 3.7 |

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | ? + 5 = 12 | 7 | nhập |
| Dễ | 10 − ? = 4 | 6 | nhập |
| Trung bình | ? + 25 = 61 | 36 | nhập (nhiễu 86, 46) |
| Trung bình | ? − 17 = 45 | 62 | nhập (nhiễu 28, 32) |
| Trung bình | 84 − ? = 39 | 45 | nhập (nhiễu 123, 55) |
| Trung bình | Trong 84 − ? = 39, ? gọi là gì | số trừ | chọn (số bị trừ, số trừ, hiệu) |
| Khó | ? − 235 = 418 | 653 | nhập (nhiễu 183, 643) |
| Khó | Chọn phép tính để tìm ? trong 500 − ? = 275 | 500 − 275 | chọn (500 + 275, 275 − 500) |

**Ưu tiên:** P0. Mục tiêu M3 mốc 3T yêu cầu nâng 3.11 từ "một phần" lên "đã có"; là nội dung có tên thành phần rõ nên báo cáo phụ huynh nói được "con nhầm quy tắc tìm số trừ"; cơ chế bàn phím số của Vệ Binh dùng lại được nguyên vẹn.

### 3.12 Bảng nhân 3, 4, 6, 7, 8, 9

**Yêu cầu cần đạt**

- Lập được bảng nhân mới từ phép cộng các số hạng bằng nhau và từ bảng đã biết: 7 × 6 = 7 × 5 + 7 = 35 + 7 = 42.
- Đọc thuộc từng bảng theo thứ tự (7 × 1 đến 7 × 10) rồi trả lời được bất kỳ dòng nào khi hỏi rời, không cần đếm từ đầu.
- Dùng tính chất giao hoán: 7 × 8 = 8 × 7 = 56, biết chỉ cần thuộc một nửa bảng.
- Nhân với 1 và với 0: 7 × 1 = 7, 7 × 0 = 0, 0 × 9 = 0.
- Trả lời được 6 × 7 và 7 × 6 trong cùng thời gian; hết lớp 3 thuộc trọn bảng 2 đến 9.

**Kiến thức tiên quyết:** 2.19 (ý nghĩa phép nhân), 2.20 (bảng 2, 5).

**Ngưỡng thành thạo:** nhóm N1, dưới 4 giây; ngưỡng tính riêng cho từng bảng và thêm một lần cho "cả bảng cửu chương trộn". Tối thiểu 30 câu mỗi bảng, phủ đủ 10 dòng, và ít nhất 60 câu trộn 2 đến 9 cho huy hiệu tổng.

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| Nhầm ô bên cạnh trong bảng | 7 × 8 = 49 hoặc 63 | a × (b ± 1) hoặc (a ± 1) × b | `o-ben-canh` |
| Lẫn tích của cặp khác | 7 × 8 = 54 (nhớ nhầm 6 × 9), 6 × 4 = 28 (7 × 4) | Là tích của một cặp khác trong bảng, chênh dưới 6 | `nham-bang` |
| Cộng thay nhân | 7 × 8 = 15 | a + b | `cong-thay-nhan` |
| Nhân với 0 và 1 | 7 × 0 = 7, 7 × 1 = 1 | a (với × 0), b hoặc 1 (với × 1) | `nhan-0-1` |
| Đếm thêm lệch một lần | 7 × 6 = 35 (dừng ở 7 × 5) | a × (b − 1), trùng `o-ben-canh`; tách bằng thời gian trả lời dài | `o-ben-canh` |

Ninja `misconception` đã gọi tên "Nhầm sang ô bên cạnh trong bảng nhân rồi!" và "Đây là phép nhân chứ không phải phép cộng nhé!"; Vệ Binh `hintFor` đã mách "Lấy 7 × 7 rồi cộng thêm 7". Chưa ghi mã lỗi vào `stats`.

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | 3 × 4 | 12 | chọn |
| Dễ | 4 × 5 | 20 | chọn |
| Trung bình | 6 × 7 | 42 | chọn (nhiễu 36, 48, 13) |
| Trung bình | 8 × 6 | 48 | nhập |
| Trung bình | 9 × 0 | 0 | chọn (nhiễu 9, 90, 1) |
| Khó | 7 × 8 | 56 | nhập (nhiễu 54, 49, 63) |
| Khó | 9 × 7 | 63 | nhập (nhiễu 56, 72, 64) |
| Khó | Ghép các thẻ có cùng tích: 6 × 8, 4 × 12, 8 × 6, 2 × 24 | ghép đủ 4 thẻ | ghép |

**Ưu tiên:** P0. Mục tiêu M1 nêu đích danh 3.12; đã có hai game, việc còn lại là ghi mã lỗi, tách câu có gợi ý, và cấp huy hiệu theo từng bảng.

### 3.13 Bảng chia 3, 4, 6, 7, 8, 9

**Yêu cầu cần đạt**

- Lập bảng chia từ bảng nhân: vì 7 × 6 = 42 nên 42 : 7 = 6 và 42 : 6 = 7.
- Trả lời rời bất kỳ dòng nào: 42 : 7, 72 : 9, 56 : 8, 27 : 3.
- Nói được bộ bốn phép tính cùng họ: 6 × 7 = 42, 7 × 6 = 42, 42 : 6 = 7, 42 : 7 = 6.
- Chia cho 1, chia số cho chính nó, 0 chia cho số khác 0: 8 : 1 = 8, 8 : 8 = 1, 0 : 8 = 0; biết không có phép chia cho 0.
- Phân biệt được câu hỏi "42 chia 7" với "42 trừ 7".

**Kiến thức tiên quyết:** 2.21 (ý nghĩa phép chia), 2.22 (bảng chia 2, 5), 2.24 (quan hệ nhân chia), 3.12.

**Ngưỡng thành thạo:** nhóm N1, dưới 4 giây (bé thường chậm hơn nhân khoảng 1 giây, chấp nhận 5 giây trong tháng đầu học bảng). Tối thiểu 30 câu mỗi bảng.

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| Trừ thay chia | 42 : 7 = 35 | a − b | `tru-thay-chia` |
| Nhầm ô bên cạnh | 42 : 7 = 5 hoặc 7 | thương ± 1 | `o-ben-canh` |
| Chia nhầm cho số khác | 42 : 7 = 7 (nhớ 42 : 6) | a : (b ± 1) khi chia hết | `nham-bang` |
| Chia cho 1, chia cho chính nó, chia 0 | 8 : 8 = 0; 0 : 8 = 8; 8 : 1 = 1 | 0, b, 1 tương ứng | `chia-0-1` |
| Đảo số bị chia và số chia | 7 : 42 (đọc ngược) hoặc trả lời 42 : 7 = 42 | a hoặc b | `dao-thanh-phan` |
| Thiếu hoặc thừa một chữ số 0 khi số bị chia tròn chục | 70 : 7 = 1 | thương chia 10 | `dem-so-0` |

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | 12 : 3 | 4 | chọn |
| Dễ | 20 : 4 | 5 | chọn |
| Trung bình | 42 : 7 | 6 | chọn (nhiễu 35, 5, 7) |
| Trung bình | 54 : 6 | 9 | nhập |
| Trung bình | 0 : 8 | 0 | chọn (nhiễu 8, 1) |
| Khó | 72 : 9 | 8 | nhập (nhiễu 7, 9, 63) |
| Khó | 56 : 8 | 7 | nhập (nhiễu 6, 8, 48) |
| Khó | Từ 7 × 6 = 42 viết hai phép chia | 42 : 7 = 6 và 42 : 6 = 7 | ghép |

**Ưu tiên:** P0. Trong M1; đã có game; lỗi "trừ thay chia" là lỗi phụ huynh dễ hiểu nhất khi báo cáo.

### 3.14 Nhân số có hai chữ số với số có một chữ số

**Yêu cầu cần đạt**

- Đặt tính và tính đúng trường hợp không nhớ: 12 × 4 = 48, 21 × 3 = 63; nói được "4 nhân 2 bằng 8, viết 8; 4 nhân 1 bằng 4, viết 4".
- Tính đúng trường hợp có nhớ: 23 × 4 = 92 ("4 nhân 3 bằng 12, viết 2 nhớ 1; 4 nhân 2 bằng 8, thêm 1 là 9"), 47 × 3 = 141, 56 × 6 = 336.
- Nhân số tròn chục nhẩm được: 30 × 4 = 120, 60 × 5 = 300.
- Giải bài toán một bước: mỗi hộp 24 cái bánh, 3 hộp có bao nhiêu cái.

**Kiến thức tiên quyết:** 3.12, 2.11 (cộng có nhớ để cộng phần nhớ).

**Ngưỡng thành thạo:** nhóm N2, dưới 12 giây (15 giây nếu nhập). Tối thiểu 20 câu, ít nhất 10 câu có nhớ, 4 câu tích có ba chữ số.

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| Quên nhớ | 23 × 4 = 82 | Đáp án đúng trừ 10 | `quen-nho` |
| Cộng phần nhớ trước khi nhân | 23 × 4: 2 + 1 = 3, 3 × 4 = 12, viết 122 | Hàng chục thành (chữ số chục + nhớ) × số nhân | `nho-truoc-nhan` |
| Viết cả 12 xuống, không nhớ | 23 × 4 = 812 | Tích riêng của hai hàng nối liền | `viet-ca-tich-rieng` |
| Chỉ nhân hàng đơn vị | 23 × 4 = 32 hoặc 12 | Bỏ hàng chục | `bo-hang` |
| Nhầm bảng nhân ở một hàng | 47 × 3 = 131 (7 × 3 = 21 nhưng 4 × 3 = 11) | Sai lệch bằng bội của 10 do bảng | `nham-bang` |
| Nhân số tròn chục sai số 0 | 30 × 4 = 12 hoặc 1 200 | Sai bậc 10 | `dem-so-0` |

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | 12 × 4 | 48 | chọn |
| Dễ | 30 × 4 | 120 | chọn (nhiễu 12, 1 200, 34) |
| Trung bình | 23 × 4 | 92 | nhập (nhiễu 82, 122, 812) |
| Trung bình | 15 × 6 | 90 | nhập |
| Trung bình | 47 × 3 | 141 | nhập (nhiễu 131, 1 221) |
| Khó | 56 × 6 | 336 | nhập (nhiễu 306, 326) |
| Khó | 89 × 9 | 801 | nhập |
| Khó | Mỗi hộp 24 cái bánh, 3 hộp có bao nhiêu cái | 72 | nhập, chọn phép tính trước |

**Ưu tiên:** P0. Trong M1; Ninja m4 và Vệ Binh "Nhân chia số lớn" đã có; cần bổ sung nhiễu `nho-truoc-nhan` và `viet-ca-tich-rieng` vào `distractors`, hiện mới có `o-ben-canh` và `cong-thay-nhan`.

### 3.15 Nhân số có ba, bốn, năm chữ số với số có một chữ số

**Yêu cầu cần đạt**

- Đặt tính và tính đúng: 213 × 3 = 639 (không nhớ), 125 × 4 = 500, 1 234 × 4 = 4 936, 2 789 × 4 = 11 156 (nhớ liên tiếp), 12 305 × 4 = 49 220.
- Xử lý chữ số 0 trong thừa số: 2 057 × 3 = 6 171 (không bỏ hàng trăm), 1 200 × 4 = 4 800.
- Nhẩm số tròn trăm, tròn nghìn: 300 × 3 = 900, 2 000 × 4 = 8 000.
- Ước lượng trước: 2 789 × 4 "khoảng 3 000 × 4 = 12 000".

**Kiến thức tiên quyết:** 3.14, 3.2, 3.3.

**Ngưỡng thành thạo:** ba chữ số theo nhóm N2 dưới 15 giây; bốn và năm chữ số theo nhóm N3 dưới 30 giây. Tối thiểu 20 câu mỗi cỡ, ít nhất 5 câu có chữ số 0 ở giữa.

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| Quên nhớ ở một hàng | 2 789 × 4 = 11 056 hoặc 10 156 | Đáp án đúng trừ 100 hoặc 1 000 | `quen-nho` |
| Bỏ chữ số 0 ở giữa | 2 057 × 3 = 671 hoặc 6 071 | Thiếu một chữ số, hoặc hàng có 0 không nhận phần nhớ | `bo-so-0-giua` |
| Cộng phần nhớ trước khi nhân | 125 × 4 = 580 | Như 3.14 | `nho-truoc-nhan` |
| Nhớ sai giá trị (nhớ 1 khi phải nhớ 2) | 2 789 × 4 = 10 056 | Đáp án lệch bội của 100 hoặc 1 000 | `nho-sai` |
| Sai số 0 với số tròn | 1 200 × 4 = 480 | Sai bậc 10 | `dem-so-0` |

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | 213 × 3 | 639 | chọn |
| Dễ | 2 000 × 4 | 8 000 | chọn |
| Trung bình | 125 × 4 | 500 | nhập (nhiễu 580, 480) |
| Trung bình | 1 234 × 4 | 4 936 | nhập |
| Trung bình | 2 057 × 3 | 6 171 | nhập (nhiễu 671, 6 071) |
| Khó | 2 789 × 4 | 11 156 | nhập (nhiễu 11 056, 10 156, 8 156) |
| Khó | 12 305 × 4 | 49 220 | nhập |
| Khó | 16 250 × 6 | 97 500 | nhập |

**Ưu tiên:** P1. M3 mốc 6T nêu 3.17; 3.15 là cặp song sinh, cùng cơ chế nhập số, nới trần từ m4. Phụ huynh coi "nhân số lớn" là thước đo lớp 3 rõ nhất.

### 3.16 Chia số có hai chữ số cho số có một chữ số

**Yêu cầu cần đạt**

- Đặt tính và chia đúng trường hợp từng hàng chia hết: 84 : 4 = 21, 96 : 3 = 32; nói được "8 chia 4 được 2, viết 2; hạ 4, 4 chia 4 được 1, viết 1".
- Chia đúng trường hợp phải gộp hàng chục và hàng đơn vị: 72 : 6 = 12 ("7 chia 6 được 1, dư 1; hạ 2 thành 12, 12 chia 6 được 2"), 91 : 7 = 13, 56 : 4 = 14.
- Chia đúng trường hợp chữ số hàng chục nhỏ hơn số chia: 45 : 5 = 9 (lấy cả 45 chia), 36 : 4 = 9.
- Nhẩm số tròn chục: 80 : 4 = 20, 60 : 3 = 20.
- Thử lại bằng phép nhân: 12 × 6 = 72.

**Kiến thức tiên quyết:** 3.13, 3.18 (chia có dư ở bước trung gian: 7 : 6 = 1 dư 1).

**Ngưỡng thành thạo:** nhóm N2, dưới 15 giây (18 giây nếu nhập). Tối thiểu 20 câu, ít nhất 8 câu phải gộp hàng.

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| Chia từng chữ số riêng, bỏ phần dư | 72 : 6 = 10 (7 : 6 được 1, 2 : 6 được 0) | Hai chữ số chia riêng, dư bị vứt | `chia-tung-chu-so` |
| Quên hạ chữ số | 84 : 4 = 2 | Chỉ có thương của hàng chục | `quen-ha` |
| Thiếu chữ số 0 ở thương | 80 : 4 = 2 | Thương chia 10 | `dem-so-0` |
| Trừ thay chia | 84 : 4 = 80 | a − b | `tru-thay-chia` |
| Nhầm bảng ở một bước | 91 : 7 = 12 | Thương lệch 1 do nhẩm sai 21 : 7 | `nham-bang` |
| Dư ở bước trung gian lớn hơn số chia | 72 : 6: lấy 7 : 6 được 0 dư 7, rồi 72 : 6 nhẩm không ra | Không trả lời hoặc trả lời chậm | không ghi, dựa vào thời gian |

Ninja `explain` đã dạy "72 : 6 = 60 : 6 + 12 : 6 = 10 + 2 = 12" (tách số bị chia thành phần tròn chục chia hết và phần còn lại). Cách này đúng và hợp với nhẩm, nhưng SGK trình bày đặt tính theo cột; game nên cho cả hai, đặt tính trước.

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | 84 : 4 | 21 | chọn |
| Dễ | 80 : 4 | 20 | chọn (nhiễu 2, 200, 76) |
| Trung bình | 96 : 3 | 32 | nhập |
| Trung bình | 45 : 5 | 9 | nhập |
| Trung bình | 72 : 6 | 12 | nhập (nhiễu 10, 11, 66) |
| Khó | 91 : 7 | 13 | nhập (nhiễu 12, 14, 84) |
| Khó | 56 : 4 | 14 | nhập (nhiễu 11, 13) |
| Khó | Chọn phép thử lại đúng cho 72 : 6 = 12 | 12 × 6 = 72 | chọn |

**Ưu tiên:** P0. Trong M1; Ninja d4 và Vệ Binh đã có nhưng d4 chỉ chọn quả; cần dạng nhập, mã lỗi `chia-tung-chu-so`, và không nên trộn với 3.17 khi cấp huy hiệu.

### 3.17 Chia số có ba, bốn, năm chữ số cho số có một chữ số

**Yêu cầu cần đạt**

- Chia đúng khi mọi bước chia hết: 848 : 4 = 212, 639 : 3 = 213.
- Chia đúng khi phải gộp ở bước đầu (chữ số đầu nhỏ hơn số chia): 312 : 4 = 78 ("3 không chia được cho 4, lấy 31 chia 4 được 7 dư 3; hạ 2 thành 32, 32 chia 4 được 8").
- Viết đúng chữ số 0 ở giữa thương: 1 236 : 4 = 309 ("12 chia 4 được 3; hạ 3, 3 chia 4 được 0, viết 0; hạ 6 thành 36, 36 chia 4 được 9").
- Chia có dư ở kết quả cuối: 725 : 3 = 241 (dư 2), viết đúng và thử lại 241 × 3 + 2 = 725.
- Số bốn, năm chữ số: 4 936 : 4 = 1 234; 49 220 : 4 = 12 305.

**Kiến thức tiên quyết:** 3.16, 3.18.

**Ngưỡng thành thạo:** ba chữ số theo nhóm N2 dưới 18 giây; bốn và năm chữ số theo nhóm N3 dưới 35 giây. Tối thiểu 20 câu mỗi cỡ, ít nhất 5 câu thương có chữ số 0 ở giữa, 5 câu có dư.

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| Bỏ chữ số 0 ở giữa thương | 1 236 : 4 = 39 | Thương thiếu một chữ số, các chữ số khác đúng | `bo-so-0-thuong` |
| Chia từng chữ số riêng | 312 : 4 = 0 7 8 → 78 nhưng với 624 : 4 ra 1 0 1 | Bỏ dư giữa các bước | `chia-tung-chu-so` |
| Quên hạ chữ số cuối | 848 : 4 = 21 | Thương ngắn hơn một chữ số | `quen-ha` |
| Số dư cuối lớn hơn hoặc bằng số chia | 725 : 3 = 240 (dư 5) | Số dư ≥ số chia | `so-du-lon` |
| Quên viết số dư | 725 : 3 = 241 | Thiếu phần "(dư 2)" | `quen-so-du` |
| Sai bảng ở một bước | 639 : 3 = 223 | Một chữ số thương lệch 1 | `nham-bang` |

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | 848 : 4 | 212 | chọn |
| Dễ | 600 : 3 | 200 | chọn |
| Trung bình | 312 : 4 | 78 | nhập (nhiễu 87, 708) |
| Trung bình | 639 : 3 | 213 | nhập |
| Trung bình | 725 : 3 | 241 (dư 2) | nhập hai ô: thương và dư |
| Khó | 1 236 : 4 | 309 | nhập (nhiễu 39, 39 dư 0, 390) |
| Khó | 4 936 : 4 | 1 234 | nhập |
| Khó | 49 220 : 4 | 12 305 | nhập (nhiễu 1 235) |

**Ưu tiên:** P1. M3 mốc 6T nêu đích danh 3.17; d4 hiện luôn chia hết từng hàng nên chưa dạy được chỗ khó nhất là chữ số 0 ở thương. Cần bàn phím có hai ô (thương, dư).

### 3.18 Phép chia hết và phép chia có dư

**Yêu cầu cần đạt**

- Nhận ra khi nào chia hết, khi nào có dư bằng thao tác chia đều: 15 cái kẹo chia 5 bạn, mỗi bạn 3 cái, không thừa; 17 cái kẹo chia 5 bạn, mỗi bạn 3 cái, thừa 2 cái.
- Viết đúng theo SGK: 17 : 5 = 3 (dư 2); đọc "17 chia 5 bằng 3 dư 2".
- Nói được và kiểm tra quy tắc: số dư luôn bé hơn số chia; với số chia 5, số dư chỉ có thể là 1, 2, 3, 4.
- Thử lại: 5 × 3 + 2 = 17 (thương nhân số chia rồi cộng số dư bằng số bị chia).
- Giải bài toán có dư và hiểu ý nghĩa số dư: 31 học sinh, mỗi thuyền chở 4 người, cần ít nhất 8 thuyền (7 thuyền chở 28, còn 3 người cần thêm 1 thuyền); 31 quả cam xếp hộp 4 quả thì được 7 hộp và thừa 3 quả.

**Kiến thức tiên quyết:** 3.13, 2.21 (chia đều, chia theo nhóm).

**Ngưỡng thành thạo:** nhóm N2, dưới 12 giây cho phép chia trong bảng có dư, dưới 60 giây cho bài toán. Tối thiểu 20 câu, trong đó ít nhất 6 câu chia hết (để bé không mặc định luôn có dư) và 4 câu số dư bằng số chia trừ 1.

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| Số dư lớn hơn hoặc bằng số chia | 17 : 5 = 2 (dư 7); 17 : 5 = 3 (dư 5)... | Số dư ≥ số chia, thương nhỏ hơn đúng | `so-du-lon` |
| Thương làm tròn lên, dư âm hoặc bỏ dư | 17 : 5 = 4 | Thương lớn hơn đúng 1, không có dư | `thuong-vuot` |
| Viết số dư thành thương | 17 : 5 = 2 | Thương bằng số dư đúng | `dao-thuong-du` |
| Quên số dư | 17 : 5 = 3 | Thương đúng nhưng thiếu dư | `quen-so-du` |
| "Không chia được" | 17 : 5 → bỏ qua hoặc trả lời 0 | 0 hoặc không trả lời | `khong-chia-duoc` |
| Trừ thay chia | 17 : 5 = 12 | a − b | `tru-thay-chia` |
| Bài toán "ít nhất": không cộng thêm 1 | 31 người, thuyền 4 chỗ, trả lời 7 thuyền | Thương không làm tròn lên | `quen-them-1` |
| Bài toán "được mấy hộp": cộng thêm 1 sai chỗ | 31 quả, hộp 4 quả, trả lời 8 hộp | Thương cộng 1 khi không cần | `them-1-thua` |

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | Kéo 17 viên kẹo vào 5 rổ cho đều, còn thừa mấy viên | 2 | kéo |
| Dễ | 15 : 5 chia hết hay có dư | chia hết | đúng sai |
| Trung bình | 17 : 5 | 3 (dư 2) | nhập hai ô (nhiễu 2 dư 7, 4, 3) |
| Trung bình | 29 : 4 | 7 (dư 1) | nhập hai ô |
| Trung bình | Số dư của phép chia cho 6 có thể là số nào: 0, 1, 2, 3, 4, 5, 6, 7 | 0 đến 5 | chọn nhiều |
| Khó | 50 : 7 | 7 (dư 1) | nhập hai ô (nhiễu 6 dư 8, 8) |
| Khó | 31 học sinh đi thuyền, mỗi thuyền chở 4 người. Cần ít nhất mấy thuyền | 8 | nhập (nhiễu 7, 7 dư 3) |
| Khó | Chọn phép thử lại đúng cho 29 : 4 = 7 (dư 1) | 4 × 7 + 1 = 29 | chọn (4 × 7 − 1, 7 × 1 + 4) |

**Ưu tiên:** P0. Là một trong ba nội dung "hiểu" mà M3 mốc 6T yêu cầu và là chỗ trẻ Việt hụt nhiều nhất trong lớp 3 (số dư lớn hơn số chia là lỗi phổ biến tới hết lớp 4); chưa có game; cơ chế chia kẹo vào rổ trong bản đồ vừa dạy nghĩa vừa đo được.

### 3.19 Tìm thành phần chưa biết của phép nhân, phép chia

**Yêu cầu cần đạt**

- Gọi đúng tên: trong ? × 6 = 42, ? là thừa số; trong ? : 7 = 6, ? là số bị chia; trong 42 : ? = 6, ? là số chia.
- Nói được và dùng đúng ba quy tắc: thừa số = tích : thừa số kia; số bị chia = thương × số chia; số chia = số bị chia : thương.
- Viết được phép tính tìm rồi thử lại: ? × 6 = 42 nên ? = 42 : 6 = 7, thử 7 × 6 = 42.
- Làm được với tích trong 100 và với số tròn chục: ? × 4 = 80 nên ? = 20.

**Kiến thức tiên quyết:** 2.23 (tên thành phần), 2.24 (quan hệ nhân chia), 3.12, 3.13.

**Ngưỡng thành thạo:** nhóm N1 mở rộng: dưới 6 giây, 9/10. Tối thiểu 20 câu, mỗi dạng ít nhất 6 câu. Vệ Binh "Tìm thừa số" đã đúng dạng; Ninja p6 p7 (ghép hai quả có tích cho trước) chỉ tính là bổ trợ.

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| Nhân khi phải chia (thấy dấu × là nhân) | ? × 6 = 42 trả lời 252 | Tích hai số cho | `nhan-thay-chia` |
| Chia khi phải nhân (tìm số bị chia) | ? : 7 = 6 trả lời 1 (7 : 6 làm tròn) hoặc 13 (cộng) | Thương hoặc tổng hai số cho | `chia-thay-nhan` |
| Nhầm quy tắc số chia | 42 : ? = 6 trả lời 252 hoặc 36 | Tích hoặc hiệu hai số cho | `nham-quy-tac-so-chia` |
| Trả lời bằng số đã cho | ? × 6 = 42 trả lời 6 hoặc 42 | a hoặc b | `dao-thanh-phan` |
| Sai bảng sau khi chọn đúng phép | ? = 42 : 6 = 8 | Như 3.13 | mã của 3.13 |

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | ? × 2 = 10 | 5 | nhập |
| Dễ | 20 : ? = 5 | 4 | nhập |
| Trung bình | ? × 6 = 42 | 7 | nhập (nhiễu 252, 36, 6) |
| Trung bình | ? : 7 = 6 | 42 | nhập (nhiễu 13, 1) |
| Trung bình | 42 : ? = 6 | 7 | nhập (nhiễu 36, 252) |
| Trung bình | Trong 42 : ? = 6, ? gọi là gì | số chia | chọn |
| Khó | ? × 4 = 80 | 20 | nhập (nhiễu 320, 76) |
| Khó | Chọn phép tính để tìm ? trong ? : 8 = 9 | 9 × 8 | chọn (9 : 8, 8 : 9, 9 + 8) |

**Ưu tiên:** P0. M3 mốc 3T yêu cầu nâng 3.19 lên "đã có"; Vệ Binh đã có màn Tìm thừa số, cần thêm tên thành phần, mã lỗi và gắn mã 3.19 vào `byTopic`.

### 3.20 Gấp một số lên nhiều lần, giảm một số đi nhiều lần

**Yêu cầu cần đạt**

- Gấp: muốn gấp 4 lên 3 lần, lấy 4 × 3 = 12; vẽ được sơ đồ đoạn thẳng 1 phần và 3 phần.
- Giảm: muốn giảm 12 đi 3 lần, lấy 12 : 3 = 4; sơ đồ 3 phần và 1 phần.
- Phân biệt bằng lời và bằng phép tính bốn cách nói: "nhiều hơn 3" (cộng 3), "gấp 3 lần" (nhân 3), "ít hơn 3" (trừ 3), "giảm 3 lần" (chia 3). Với số 4: nhiều hơn 3 là 7, gấp 3 lần là 12, ít hơn 3 là 1, giảm đi... không hỏi vì 4 không chia hết cho 3; với số 12: nhiều hơn 3 là 15, gấp 3 lần là 36, ít hơn 3 là 9, giảm 3 lần là 4.
- Giải bài toán một bước: "Mẹ 36 tuổi, gấp 4 lần tuổi con. Con mấy tuổi" (36 : 4 = 9).

**Kiến thức tiên quyết:** 3.12, 3.13, 2.17 (nhiều hơn, ít hơn một số đơn vị).

**Ngưỡng thành thạo:** nhóm N4, dưới 8 giây cho câu chọn phép tính, dưới 12 giây cho câu tính. Tối thiểu 20 câu, bắt buộc trộn bốn cách nói với tỉ lệ ngang nhau (đây là phép đo chính, không phải tính đúng).

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| Cộng thay nhân | Gấp 4 lên 3 lần trả lời 7 | a + b | `cong-thay-gap` |
| Trừ thay chia | Giảm 12 đi 3 lần trả lời 9 | a − b | `tru-thay-giam` |
| Nhân khi phải giảm | Giảm 12 đi 3 lần trả lời 36 | a × b | `nhan-thay-giam` |
| Chia khi phải gấp | Gấp 12 lên 3 lần trả lời 4 | a : b | `chia-thay-gap` |
| Hiểu "gấp 3 lần" là cộng thêm 3 lần số đó | Gấp 4 lên 3 lần trả lời 16 (4 + 4 × 3) | a + a × b | `gap-cong-them` |
| Ngược chiều ở bài toán (mẹ gấp con) | Mẹ 36 tuổi gấp 4 lần con, trả lời con 144 tuổi | a × b thay a : b | `nguoc-chieu` |

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | Đưa 4 quả vào máy, chọn "gấp 3 lần", ra mấy quả | 12 | chọn (nhiễu 7, 1, 16) |
| Dễ | Gấp 5 lên 2 lần | 10 | nhập |
| Trung bình | Giảm 12 đi 3 lần | 4 | nhập (nhiễu 9, 36, 15) |
| Trung bình | 12 nhiều hơn 3 là bao nhiêu; 12 gấp 3 lần là bao nhiêu | 15; 36 | nhập hai ô |
| Trung bình | Chọn phép tính: "giảm 24 đi 6 lần" | 24 : 6 | chọn (24 − 6, 24 × 6, 24 + 6) |
| Khó | Mẹ 36 tuổi, gấp 4 lần tuổi con. Con mấy tuổi | 9 | nhập (nhiễu 144, 32, 40) |
| Khó | Sợi dây 8 m, gấp lên 6 lần rồi giảm đi 4 lần thì dài mấy mét | 12 | nhập |
| Khó | Ghép mỗi câu với phép tính: "nhiều hơn 5", "gấp 5 lần", "ít hơn 5", "giảm 5 lần" | + 5, × 5, − 5, : 5 | ghép |

**Ưu tiên:** P1 (M3 mốc 12T nêu 3.20). Là nội dung "hiểu" mà bé hay nhầm với "nhiều hơn, ít hơn" tới tận lớp 4; dễ đo bằng ghép câu với phép tính; cơ chế máy nhân bản trong bản đồ nhìn thấy được kết quả nên dạy nghĩa tốt.

### 3.21 So sánh số lớn gấp mấy lần số bé, số bé bằng một phần mấy số lớn

**Yêu cầu cần đạt**

- Trả lời "gấp mấy lần" bằng phép chia: 18 quả cam và 6 quả táo, cam gấp táo 18 : 6 = 3 lần; ghi đơn vị là "lần".
- Đảo lại được: táo bằng 1/3 số cam.
- Phân biệt "nhiều hơn bao nhiêu" (18 − 6 = 12 quả) với "gấp mấy lần" (3 lần) trên cùng một cặp số.
- Đọc từ sơ đồ đoạn thẳng hoặc hai cột đồ vật xếp cạnh nhau.

**Kiến thức tiên quyết:** 3.20, 3.13, 3.22 (đọc 1/n).

**Ngưỡng thành thạo:** nhóm N4, dưới 10 giây. Tối thiểu 20 câu, trong đó ít nhất 8 câu hỏi "một phần mấy" và 4 câu đặt cạnh "nhiều hơn bao nhiêu".

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| Trừ thay chia | 18 gấp 6 là 12 lần | a − b | `tru-thay-chia` |
| Chia ngược | 6 : 18, không ra hoặc trả lời 3 nhưng gán sai chiều ("táo gấp cam 3 lần") | Chiều câu trả lời ngược | `nguoc-chieu` |
| Trả lời 3 khi hỏi "một phần mấy" | Táo bằng 3 số cam | Số nguyên thay vì 1/3 | `nham-lan-voi-phan` |
| Trả lời 1/3 khi hỏi "gấp mấy lần" | Cam gấp táo 1/3 lần | Ngược lỗi trên | `nham-lan-voi-phan` |
| Đếm hai cột rồi cộng | 18 và 6 trả lời 24 | a + b | `nham-dau` |

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | Cột A 8 quả, cột B 2 quả. A gấp B mấy lần | 4 | chọn (nhiễu 6, 10, 2) |
| Dễ | 10 gấp 5 mấy lần | 2 | nhập |
| Trung bình | 18 quả cam, 6 quả táo. Cam gấp táo mấy lần | 3 | nhập (nhiễu 12, 24) |
| Trung bình | Cùng đề trên: táo bằng một phần mấy số cam | 1/3 | chọn (1/3, 3, 1/12, 12) |
| Trung bình | 18 quả cam, 6 quả táo. Cam nhiều hơn táo bao nhiêu quả | 12 | nhập (nhiễu 3) |
| Khó | Anh 32 viên bi, em 8 viên. Số bi của em bằng một phần mấy số bi của anh | 1/4 | chọn |
| Khó | Sợi dây 45 cm gấp mấy lần sợi dây 9 cm | 5 | nhập |
| Khó | Ghép ba câu hỏi với ba phép tính cho cặp 24 và 6: nhiều hơn, gấp mấy lần, một phần mấy | 24 − 6, 24 : 6, 1/(24 : 6) | ghép |

**Ưu tiên:** P1. Đi liền 3.20 và 3.22, dùng chung cơ chế hai cột đồ vật; lỗi "trả lời 12 lần" là câu chuyện phụ huynh nhận ra ngay.

### 3.22 Một phần mấy của một số và cách tìm

**Yêu cầu cần đạt**

- Đọc, viết 1/2, 1/3, 1/4, 1/5, 1/6, 1/7, 1/8, 1/9 và chỉ được phần tương ứng trên hình chia đều: hình tròn chia 4 phần bằng nhau, tô 1 phần là 1/4.
- Nhận ra hình chia không đều thì không phải 1/n dù có n phần.
- Tìm một phần mấy của một số bằng phép chia: 1/4 của 20 là 20 : 4 = 5; 1/3 của 27 kg là 9 kg.
- Giải bài toán một bước: lớp có 32 học sinh, 1/4 số học sinh là nữ, có 8 bạn nữ.

**Kiến thức tiên quyết:** 2.25 (một phần hai, một phần năm), 3.13.

**Ngưỡng thành thạo:** nhóm N4, dưới 10 giây. Tối thiểu 20 câu, ít nhất 6 câu trên hình (kể cả hình chia không đều) và 10 câu tìm 1/n của số.

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| Nhân thay chia | 1/4 của 20 trả lời 80 | a × n | `nhan-thay-chia` |
| Trừ thay chia | 1/4 của 20 trả lời 16 | a − n | `tru-thay-chia` |
| Đọc 1/n là n | Hình tô 1 trong 4 phần đọc là "4" hoặc "1/1" | n | `nham-lan-voi-phan` |
| Đếm phần tô làm tử, không xét chia đều | Hình 4 phần không đều, tô 1 vẫn gọi 1/4 | Chọn "đúng" ở hình chia không đều | `khong-xet-deu` |
| Đọc ngược | 1/4 đọc "bốn phần một" | Phương án đọc ngược | `doc-nguoc-phan-so` |
| Lấy số phần thay số lượng | 1/4 của 20 trả lời 4 | n | `dao-thanh-phan` |

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | Hình tròn chia 3 phần bằng nhau, tô 1 phần. Đã tô mấy phần hình tròn | 1/3 | chọn (1/2, 3, 1/4) |
| Dễ | Tô 1/5 của hình chữ nhật chia 5 ô | tô 1 ô | hình |
| Trung bình | Hình vuông chia 4 phần không bằng nhau, tô 1 phần. Có phải đã tô 1/4 không | không | đúng sai |
| Trung bình | 1/4 của 20 | 5 | nhập (nhiễu 80, 16, 4) |
| Trung bình | 1/3 của 27 kg | 9 kg | nhập |
| Khó | Bắt 1/6 đàn cá 30 con | 5 con | kéo |
| Khó | Lớp 3A có 32 học sinh, 1/4 là nữ. Có mấy bạn nữ | 8 | nhập (nhiễu 28, 128) |
| Khó | 1/8 của 72 m | 9 m | nhập |

**Ưu tiên:** P1. Phân số đơn giản là nền của lớp 4; đo được bằng chọn và nhập; cơ chế chia đàn cá của bản đồ vừa dạy chia đều vừa dạy 1/n. Nên làm cùng 3.21 trong một game.

### 3.23 Biểu thức số, tính giá trị biểu thức, dấu ngoặc, thứ tự phép tính

**Yêu cầu cần đạt**

- Gọi được "60 + 20 − 5" là biểu thức và "75" là giá trị của biểu thức.
- Nói và dùng đúng ba quy tắc theo thứ tự SGK dạy: (1) chỉ có cộng trừ hoặc chỉ có nhân chia thì tính từ trái sang phải: 60 + 20 − 5 = 75, 49 : 7 × 5 = 35, 24 : 6 : 2 = 2; (2) có cả cộng trừ và nhân chia thì nhân chia trước, cộng trừ sau: 30 + 5 × 4 = 50, 100 − 36 : 4 = 91; (3) có dấu ngoặc thì tính trong ngoặc trước: (30 + 5) × 4 = 140, 100 − (20 + 30) = 50, 81 : (3 × 3) = 9.
- Chỉ được phép tính nào làm trước trong một biểu thức cho sẵn trước khi tính.
- Viết biểu thức từ lời: "lấy 30 cộng 5 rồi nhân với 4" là (30 + 5) × 4.

**Kiến thức tiên quyết:** 2.16 (biểu thức có hai dấu cộng, trừ), 3.12, 3.13, 3.7.

**Ngưỡng thành thạo:** nhóm N2, dưới 15 giây cho biểu thức hai phép tính, dưới 25 giây cho ba phép tính. Tối thiểu 20 câu, mỗi quy tắc ít nhất 6 câu, và ít nhất 4 cặp biểu thức chỉ khác nhau dấu ngoặc (30 + 5 × 4 và (30 + 5) × 4) để đo riêng lỗi bỏ ngoặc.

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| Tính từ trái sang phải bất chấp | 30 + 5 × 4 = 140 | Giá trị khi tính tuần tự | `trai-sang-phai` |
| Bỏ dấu ngoặc | (30 + 5) × 4 = 50 | Giá trị khi bỏ ngoặc | `bo-ngoac` |
| Nhân chia trước cả khi có ngoặc bao cộng trừ | 100 − (20 + 30) = 100 − 20 + 30 = 110 | Giá trị khi xóa ngoặc và tính trái sang phải | `bo-ngoac` |
| Nhân trước chia, hoặc cộng trước trừ, không theo trái sang phải | 24 : 6 × 2 = 2; 24 : 6 : 2 = 8; 60 − 20 + 5 = 35 | Giá trị khi gộp hai phép cùng bậc từ bên phải | `sai-thu-tu-cung-bac` |
| Tính đúng thứ tự nhưng sai một phép | 30 + 5 × 4 = 30 + 20 = 40 | Sai như 3.7, 3.12 | mã của phép tính đó |
| Quên phần chưa tính | 30 + 5 × 4 = 20 | Chỉ có giá trị của phép ưu tiên | `bo-phep-tinh` |

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | 60 + 20 − 5 | 75 | nhập |
| Dễ | Trong 30 + 5 × 4, phép nào làm trước | 5 × 4 | chọn (chém quả "5 × 4" trước) |
| Trung bình | 30 + 5 × 4 | 50 | nhập (nhiễu 140, 20) |
| Trung bình | (30 + 5) × 4 | 140 | nhập (nhiễu 50) |
| Trung bình | 49 : 7 × 5 | 35 | nhập (nhiễu 1, 7) |
| Khó | 100 − (20 + 30) | 50 | nhập (nhiễu 110, 80) |
| Khó | 24 : 6 : 2 | 2 | nhập (nhiễu 8) |
| Khó | Viết biểu thức: "lấy 81 chia cho tích của 3 và 3" | 81 : (3 × 3) | xếp thẻ |

**Ưu tiên:** P1. Chỗ trẻ Việt hụt rõ (trái sang phải bất chấp) và kéo dài sang lớp 4, 5; đo được từng quy tắc bằng cặp biểu thức đối chứng; cơ chế chém đúng thứ tự trong bản đồ biến quy tắc thành luật chơi.

### 3.24 Giải bài toán bằng hai bước tính

**Yêu cầu cần đạt**

- Đọc đề và nói được câu hỏi cần gì, bước trung gian là gì: "Thùng thứ nhất có 24 l dầu, thùng thứ hai ít hơn thùng thứ nhất 8 l. Cả hai thùng có bao nhiêu lít" cần biết thùng thứ hai trước (24 − 8 = 16 l), rồi cộng (24 + 16 = 40 l).
- Viết được hai phép tính, mỗi phép có câu lời giải và đơn vị, và đáp số.
- Làm được các dạng thường gặp lớp 3: nhiều hơn hoặc ít hơn rồi tính tổng; gấp hoặc giảm rồi tính tổng hoặc hiệu (anh 12 viên bi, em bằng 1/3 của anh, cả hai 16 viên); mua bán (3 quyển vở giá 8 000 đồng một quyển, đưa 50 000 đồng, còn lại 26 000 đồng); tổng rồi chia đều (2 thùng 24 và 18 quả, chia đều 6 rổ, mỗi rổ 7 quả).
- Nhận ra khi đề chỉ cần một bước.

**Kiến thức tiên quyết:** 2.18 (bài toán một phép tính), 2.26 (bài toán nhân chia), 3.20, 3.23, 3.7.

**Ngưỡng thành thạo:** nhóm N5, 4/5 bài, dưới 60 giây một bài, 10 bài trải ít nhất 3 dạng. Game nên chấm riêng hai việc: chọn đúng phép tính từng bước (đo hiểu) và tính đúng (đo kỹ năng).

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| Chỉ làm một bước | Trả lời 16 l (số dầu thùng hai) | Kết quả bước trung gian | `mot-buoc` |
| Cộng cả hai số cho | 24 + 8 = 32 rồi 24 + 32 = 56 | Dùng số trong đề sai vai trò | `sai-so-lieu` |
| Ngược chiều "ít hơn" | Thùng hai là 24 + 8 = 32, cả hai 56 | Bước một cộng thay trừ | `nguoc-chieu` |
| Nhầm "ít hơn 8" với "giảm 8 lần" | Thùng hai là 24 : 8 = 3 | Bước một chia thay trừ | `tru-thay-giam` (ngược) |
| Tính đúng nhưng đáp số sai đơn vị | 40 kg | Đơn vị khác đề | `sai-don-vi` |
| Bước hai dùng phép sai | 24 − 16 = 8 | Hiệu thay tổng | `nham-dau` |

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | Hộp đỏ 6 kẹo, hộp xanh nhiều hơn 4 kẹo. Cả hai hộp | 16 | chọn phép tính bước 1, nhập kết quả |
| Dễ | Đề chỉ cần một bước: có 24 quả, ăn 8 quả, còn mấy quả | 16, một bước | chọn "một bước hay hai bước" |
| Trung bình | Thùng một 24 l, thùng hai ít hơn 8 l. Cả hai thùng | 40 | chọn phép tính hai bước, nhập (nhiễu 16, 56, 32) |
| Trung bình | Anh 12 viên bi, em bằng 1/3 của anh. Cả hai anh em | 16 | nhập (nhiễu 4, 36, 48) |
| Trung bình | Xếp thứ tự các bước giải cho đề "3 quyển vở, 8 000 đồng một quyển, đưa 50 000, còn lại" | 8 000 × 3; 50 000 − 24 000 | xếp |
| Khó | Hai thùng có 24 và 18 quả, chia đều vào 6 rổ. Mỗi rổ mấy quả | 7 | nhập (nhiễu 4, 42) |
| Khó | Mẹ 36 tuổi, gấp 4 lần tuổi con. Mẹ hơn con mấy tuổi | 27 | nhập (nhiễu 9, 32) |
| Khó | Chọn câu lời giải đúng cho bước 1 của bài thùng dầu | "Thùng thứ hai có số lít dầu là" | chọn |

**Ưu tiên:** P1. Là nơi phụ huynh thấy "con biết tính mà không biết giải toán"; cơ chế hai cửa liên tiếp trong bản đồ tách đúng hai bước; cần giọng đọc đề vì bé lớp 3 đọc chậm.

### 3.25 Giải bài toán liên quan đến rút về đơn vị

**Yêu cầu cần đạt**

- Dạng 1 (tìm giá trị nhiều đơn vị): 4 túi gạo nặng 24 kg, hỏi 7 túi nặng bao nhiêu. Bước rút về đơn vị: 24 : 4 = 6 kg mỗi túi; bước hai: 6 × 7 = 42 kg.
- Dạng 2 (tìm số đơn vị): 24 kg gạo đựng đều 4 túi, hỏi 42 kg đựng mấy túi như thế. Bước một: 24 : 4 = 6 kg; bước hai: 42 : 6 = 7 túi.
- Nói được vì sao bước một luôn là phép chia ("tìm một túi trước") và bước hai là nhân (dạng 1) hay chia (dạng 2).
- Làm với tiền: 5 quyển vở 40 000 đồng, 3 quyển bao nhiêu (8 000 × 3 = 24 000).

**Kiến thức tiên quyết:** 3.24, 3.14, 3.16, 3.13.

**Ngưỡng thành thạo:** nhóm N5, 4/5 bài, dưới 60 giây. 10 bài, trộn đều hai dạng, đề đổi ngữ cảnh (gạo, vở, dầu, tiền) để đo hiểu chứ không phải nhớ mẫu.

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| Nhân luôn, bỏ bước rút về đơn vị | 24 × 7 = 168 | Tích hai số trong đề | `mot-buoc` |
| Chia sai chiều ở bước một | 4 : 24 | Không ra số nguyên, bé đoán | `nguoc-chieu` |
| Nhầm dạng 2 với dạng 1 (bước hai nhân thay chia) | 42 × 6 = 252 túi | Tích thay thương ở bước hai | `nham-dang-rut-ve-don-vi` |
| Bước hai chia sai số | 42 : 4 = 10 dư 2 | Chia cho số túi thay vì cho giá một túi | `sai-so-lieu` |
| Trả lời giá trị một đơn vị | 6 kg | Kết quả bước trung gian | `mot-buoc` |

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | 2 hộp có 10 bút. 1 hộp có mấy bút | 5 | nhập |
| Dễ | Cùng đề: 3 hộp có mấy bút | 15 | nhập (nhiễu 30, 13) |
| Trung bình | 4 túi gạo 24 kg. 7 túi nặng bao nhiêu kg | 42 | chọn phép tính hai bước, nhập (nhiễu 168, 6, 28) |
| Trung bình | 24 kg đựng đều 4 túi. 42 kg đựng mấy túi | 7 | nhập (nhiễu 252, 10) |
| Trung bình | Chọn bước một cho đề "5 quyển vở 40 000 đồng, 3 quyển bao nhiêu" | 40 000 : 5 | chọn (40 000 × 3, 40 000 : 3) |
| Khó | 6 chai đựng 12 l nước. 30 l cần mấy chai | 15 | nhập (nhiễu 60, 5) |
| Khó | 8 bàn ngồi 32 học sinh. Lớp 40 học sinh cần mấy bàn như thế | 10 | nhập |
| Khó | Ghép hai đề với hai dạng: "7 túi nặng bao nhiêu" và "42 kg đựng mấy túi" | dạng 1, dạng 2 | ghép |

**Ưu tiên:** P1. Bài toán mua bán nối thẳng với tiền Việt Nam (B3.15) mà M3 mốc 12T yêu cầu; là dạng phụ huynh hay kèm sai (nhân luôn); nên làm sau 3.24 và dùng chung khung.

## 7. Mạch B: Hình học và Đo lường

### B3.1 Điểm ở giữa, trung điểm của đoạn thẳng

**Yêu cầu cần đạt**

- Chỉ được điểm ở giữa: ba điểm A, M, B thẳng hàng và M nằm giữa A và B.
- Nhận ra trung điểm: M là trung điểm của đoạn AB khi M ở giữa A và B và AM = MB; đoạn 8 cm có trung điểm cách mỗi đầu 4 cm.
- Phân biệt "ở giữa" (chỉ cần nằm giữa) với "trung điểm" (phải cách đều).
- Xác định trung điểm bằng thước: đo, chia đôi, đánh dấu; và trên lưới ô vuông bằng đếm ô.

**Kiến thức tiên quyết:** B2.1 (điểm, đoạn thẳng), B2.2 (ba điểm thẳng hàng), B2.7 (đo độ dài), 3.13 (chia 2).

**Ngưỡng thành thạo:** nhóm N4, dưới 8 giây cho câu nhận biết, dưới 15 giây cho câu đặt điểm. Tối thiểu 20 câu, ít nhất 6 câu "ở giữa nhưng không phải trung điểm".

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| Coi mọi điểm ở giữa là trung điểm | AM = 3 cm, MB = 5 cm vẫn chọn "trung điểm" | Chọn "đúng" khi hai nửa khác nhau | `o-giua-la-trung-diem` |
| Gọi điểm không thẳng hàng là ở giữa | M lệch khỏi đoạn AB | Chọn "đúng" khi M không trên AB | `khong-thang-hang` |
| Chia đôi sai | Đoạn 8 cm đặt điểm ở 3 cm | Vị trí lệch 1 ô hoặc 1 cm | `chia-doi-sai` |
| Đếm ô từ 1 thay vì từ 0 | Đoạn 6 ô đặt điểm ở ô thứ 4 | Lệch một ô | `dem-lech` |

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | Ba điểm A, M, B trên một đường. Điểm nào ở giữa | M | chọn |
| Dễ | Đặt cầu đúng giữa hai bờ cách nhau 8 ô | ô thứ 4 | hình |
| Trung bình | AM = 4 cm, MB = 4 cm. M có là trung điểm của AB không | có | đúng sai |
| Trung bình | AM = 3 cm, MB = 5 cm. M có là trung điểm không | không (chỉ ở giữa) | đúng sai |
| Trung bình | Đoạn AB dài 10 cm, M là trung điểm. AM dài bao nhiêu | 5 cm | nhập |
| Khó | Trên lưới, chọn điểm là trung điểm của AB trong 3 điểm cho sẵn | điểm cách đều | chọn trên hình |
| Khó | M là trung điểm của AB, AM = 6 cm. AB dài bao nhiêu | 12 cm | nhập (nhiễu 3, 6) |

**Ưu tiên:** P2. Ít thời lượng, nhưng cơ chế đặt cầu của bản đồ rẻ và vui; làm kèm gói hình học B3.2 đến B3.4.

### B3.2 Góc, góc vuông và góc không vuông, dùng ê ke

**Yêu cầu cần đạt**

- Chỉ được đỉnh và hai cạnh của một góc; đọc tên "góc đỉnh O, cạnh OA, OB".
- Nhận ra góc vuông và góc không vuông bằng mắt khi góc đặt xoay bất kỳ, và kiểm tra bằng ê ke: đặt đỉnh ê ke trùng đỉnh góc, một cạnh ê ke trùng một cạnh góc, cạnh kia trùng thì vuông.
- Tìm góc vuông trong hình: hình chữ nhật có 4 góc vuông, tam giác vuông có 1 góc vuông.
- Nhận ra hai kim đồng hồ lúc 3 giờ đúng và 9 giờ đúng tạo góc vuông.

**Kiến thức tiên quyết:** B2.1, B2.11 (đồng hồ nếu dùng kim).

**Ngưỡng thành thạo:** nhóm N4, dưới 6 giây cho nhận biết, dưới 12 giây cho thao tác ê ke. Tối thiểu 20 câu, ít nhất 8 góc vuông đặt nghiêng, 4 góc hơi lớn hơn vuông và 4 góc hơi nhỏ hơn vuông (lệch 10 đến 15 độ, không quá gần để không thành đánh đố).

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| Không nhận ra góc vuông bị xoay | Góc vuông có cạnh nghiêng 45 độ trả lời "không vuông" | Sai ở góc vuông xoay, đúng ở góc vuông đứng | `goc-xoay` |
| Coi góc tù là góc vuông | Góc 110 độ trả lời "vuông" | Sai ở góc lớn hơn vuông | `goc-tu-la-vuong` |
| Đặt ê ke lệch đỉnh | Đỉnh ê ke không trùng đỉnh góc rồi kết luận | Trong game: thả ê ke cách đỉnh quá 1 ô | `e-ke-lech` |
| Nhầm đỉnh với cạnh khi đọc tên | Gọi "góc đỉnh A" khi A là đầu cạnh | Chọn điểm không phải đỉnh | `nham-dinh-canh` |
| Đếm góc vuông thiếu ở hình nghiêng | Hình chữ nhật xoay trả lời có 2 góc vuông | Số nhỏ hơn thực tế | `goc-xoay` |

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | Góc này vuông hay không vuông (góc vuông đứng) | vuông | đúng sai |
| Dễ | Xoay kim đồng hồ cho hai kim tạo góc vuông | 3 giờ hoặc 9 giờ | hình |
| Trung bình | Góc vuông xoay nghiêng 30 độ: vuông hay không | vuông | đúng sai |
| Trung bình | Góc 110 độ: vuông hay không | không vuông | đúng sai |
| Trung bình | Kéo ê ke vào góc để kiểm tra rồi trả lời | theo góc | hình |
| Khó | Hình có mấy góc vuông (tam giác vuông xoay) | 1 | nhập |
| Khó | Đọc tên góc có đỉnh O, cạnh OM, ON | "góc đỉnh O, cạnh OM, ON" | chọn |
| Khó | Tứ giác có 2 góc vuông và 2 góc không vuông: chọn cả 2 góc vuông | 2 góc | chọn trên hình |

**Ưu tiên:** P1. Dùng lại kim đồng hồ đã có trong bốn game nên chi phí thấp; là tiên quyết trực tiếp của hình chữ nhật, hình vuông (B3.4) và chu vi, diện tích.

### B3.3 Hình tam giác, hình tứ giác: đỉnh, cạnh, góc

**Yêu cầu cần đạt**

- Đếm và gọi tên: tam giác ABC có 3 đỉnh A, B, C, 3 cạnh AB, BC, CA, 3 góc; tứ giác có 4 đỉnh, 4 cạnh, 4 góc.
- Nhận ra tam giác, tứ giác ở mọi tư thế, kể cả tứ giác lõm hoặc kéo dài.
- Đọc tên hình bằng chữ cái theo thứ tự đi vòng: tứ giác MNPQ.
- Đo và ghi độ dài cạnh; biết hình vuông và hình chữ nhật cũng là tứ giác.

**Kiến thức tiên quyết:** B2.3 (hình tứ giác), B3.2.

**Ngưỡng thành thạo:** nhóm N4, dưới 8 giây. Tối thiểu 20 câu, ít nhất 5 hình xoay lạ.

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| Đếm thiếu cạnh ở hình lõm hoặc xoay | Tứ giác lõm đếm 3 cạnh | Số nhỏ hơn thực tế | `dem-thieu` |
| Chỉ nhận hình "chuẩn" | Tam giác nhọn dài trả lời "không phải tam giác" | Sai ở hình không cân | `hinh-khong-chuan` |
| Không coi hình vuông là tứ giác | Hỏi "hình vuông có phải tứ giác không" trả lời không | Chọn "không" | `khong-nhan-truong-hop-rieng` |
| Nhầm đỉnh với góc khi đếm | Trả lời "6 đỉnh" (đếm cả đỉnh lẫn góc) | Gấp đôi số đúng | `nham-dinh-canh` |
| Đọc tên chéo | Tứ giác MNPQ đọc thành MPNQ | Thứ tự chữ cái không đi vòng | `doc-ten-cheo` |

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | Hình này là tam giác hay tứ giác | tứ giác | chọn |
| Dễ | Tam giác có mấy cạnh | 3 | nhập |
| Trung bình | Đếm đỉnh của tứ giác lõm đang xoay | 4 | nhập (nhiễu 3, 5) |
| Trung bình | Chạm vào tất cả các cạnh của tứ giác MNPQ | 4 cạnh | hình |
| Trung bình | Hình vuông có phải là tứ giác không | có | đúng sai |
| Khó | Trong 6 hình rơi xuống, kéo hình vào thùng tam giác hoặc tứ giác (có hình 5 cạnh làm nhiễu) | phân đúng | kéo |
| Khó | Tam giác ABC có AB = 3 cm, BC = 4 cm, CA = 5 cm. Cạnh dài nhất | CA | chọn |

**Ưu tiên:** P2. Gói hình học chung với B3.2 và B3.4; giá trị riêng thấp.

### B3.4 Hình chữ nhật, hình vuông: cạnh và góc

**Yêu cầu cần đạt**

- Nói đặc điểm hình chữ nhật: 4 góc vuông, 2 cạnh dài bằng nhau, 2 cạnh ngắn bằng nhau; gọi được chiều dài, chiều rộng.
- Nói đặc điểm hình vuông: 4 góc vuông, 4 cạnh bằng nhau.
- Nhận ra hình chữ nhật, hình vuông ở mọi tư thế (đứng, xoay 45 độ) và loại hình giống nhưng không phải (hình bình hành lệch, hình thoi không vuông).
- Kiểm tra bằng ê ke và thước: đo 4 cạnh, kiểm tra 4 góc.
- Vẽ hình chữ nhật, hình vuông trên lưới ô vuông theo kích thước cho trước.

**Kiến thức tiên quyết:** B3.2, B3.3.

**Ngưỡng thành thạo:** nhóm N4, dưới 8 giây. Tối thiểu 20 câu, ít nhất 5 hình xoay 45 độ và 5 hình "gần giống" (bình hành, thoi, chữ nhật hơi lệch góc).

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| Hình vuông xoay 45 độ gọi là "hình thoi", không phải hình vuông | Chọn "không phải hình vuông" | Sai ở hình vuông xoay, đúng ở hình vuông đứng | `goc-xoay` |
| Hình chữ nhật dựng đứng không nhận ra | Chiều dài theo chiều dọc trả lời "không phải" | Sai khi cạnh dài dựng đứng | `hinh-khong-chuan` |
| Hình bình hành lệch coi là hình chữ nhật | Chọn "là hình chữ nhật" | Sai ở hình không có góc vuông | `bo-qua-goc-vuong` |
| Nhầm chiều dài với chiều rộng | Ghi chiều dài 3 cm, chiều rộng 5 cm | Hai số đảo | `dao-dai-rong` |
| Kéo đỉnh sửa hình nhưng chỉ chỉnh cạnh, không chỉnh góc | Hình có 4 cạnh bằng nhau nhưng không vuông vẫn nộp | Hình thoi | `bo-qua-goc-vuong` |

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | Hình này là hình chữ nhật hay hình vuông (đứng) | hình vuông | chọn |
| Dễ | Hình chữ nhật có mấy góc vuông | 4 | nhập |
| Trung bình | Hình vuông xoay 45 độ: có phải hình vuông không | có | đúng sai |
| Trung bình | Hình bình hành lệch: có phải hình chữ nhật không | không | đúng sai |
| Trung bình | Hình chữ nhật có chiều dài 5 cm, chiều rộng 3 cm. Cạnh đối diện với cạnh 5 cm dài bao nhiêu | 5 cm | nhập |
| Khó | Kéo đỉnh của hình méo cho thành hình vuông (game kiểm tra 4 cạnh bằng nhau và 4 góc vuông) | hình vuông | hình |
| Khó | Vẽ trên lưới hình chữ nhật dài 6 ô rộng 2 ô | đúng kích thước | hình |
| Khó | Trong 8 hình, chọn tất cả hình chữ nhật (có hình vuông, bình hành, thang) | các hình đúng, gồm cả hình vuông nếu đề cho phép | chọn nhiều |

Ghi chú sư phạm: SGK lớp 3 chưa nhấn "hình vuông là hình chữ nhật đặc biệt"; game không nên hỏi câu "hình vuông có phải hình chữ nhật không" để tránh trái với cách thầy cô dạy, mà chỉ hỏi theo đặc điểm (mấy góc vuông, cạnh nào bằng nhau).

**Ưu tiên:** P1. Tiên quyết trực tiếp của chu vi và diện tích (B3.8, B3.10); cơ chế kéo đỉnh trong bản đồ đo được cả hai đặc điểm.

### B3.5 Hình tròn: tâm, bán kính, đường kính, vẽ bằng compa

**Yêu cầu cần đạt**

- Chỉ được tâm O, bán kính OA (đoạn từ tâm tới một điểm trên đường tròn), đường kính AB (đoạn qua tâm, hai đầu trên đường tròn).
- Nói được: đường kính dài gấp 2 lần bán kính; mọi bán kính của một hình tròn bằng nhau; tâm là trung điểm của đường kính.
- Vẽ hình tròn bằng compa với bán kính cho trước: mở compa đúng 3 cm để vẽ bán kính 3 cm.
- Phân biệt đoạn qua tâm với đoạn nối hai điểm trên đường tròn nhưng không qua tâm.

**Kiến thức tiên quyết:** B2.1, B2.7, B3.1 (trung điểm), 3.12 (nhân 2).

**Ngưỡng thành thạo:** nhóm N4, dưới 8 giây. Tối thiểu 20 câu.

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| Đoạn không qua tâm gọi là đường kính | Chọn dây cung CD là đường kính | Chọn đoạn không qua O | `khong-qua-tam` |
| Bán kính bằng đường kính | Đường kính 8 cm trả lời bán kính 8 cm | Không chia 2 | `ban-kinh-bang-duong-kinh` |
| Mở compa bằng đường kính khi vẽ bán kính | Vẽ bán kính 3 cm nhưng hình ra bán kính 6 cm | Hình lớn gấp đôi | `mo-compa-sai` |
| Tâm không là trung điểm | Đặt O lệch trên AB | O lệch quá 1 ô | `chia-doi-sai` |
| Đường kính "phải nằm ngang" | Đường kính dựng đứng trả lời không phải | Sai ở đường kính nghiêng | `goc-xoay` |

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | Chạm vào tâm của hình tròn | O | hình |
| Dễ | Đoạn OA là bán kính hay đường kính | bán kính | chọn |
| Trung bình | Bán kính 4 cm thì đường kính dài bao nhiêu | 8 cm | nhập (nhiễu 4, 2, 16) |
| Trung bình | Đoạn CD nối hai điểm trên đường tròn nhưng không qua O: có phải đường kính không | không | đúng sai |
| Trung bình | Kéo compa vẽ vòng bán kính 3 ô để bắt trọn mục tiêu | đúng bán kính | hình |
| Khó | Đường kính 10 cm, bán kính bao nhiêu | 5 cm | nhập (nhiễu 10, 20) |
| Khó | Hình tròn tâm O có bán kính OA = 5 cm và OB. OB dài bao nhiêu | 5 cm | nhập |

**Ưu tiên:** P2. Ít giá trị đo lường; làm khi đã có gói hình học, tận dụng cơ chế kéo compa.

### B3.6 Khối lập phương, khối hộp chữ nhật

**Yêu cầu cần đạt**

- Đếm đúng: mỗi khối có 6 mặt, 12 cạnh, 8 đỉnh.
- Nói đặc điểm: khối lập phương có 6 mặt đều là hình vuông bằng nhau; khối hộp chữ nhật có 6 mặt là hình chữ nhật (có thể có 2 mặt là hình vuông), các mặt đối diện bằng nhau.
- Phân biệt hình phẳng (hình vuông) với khối (khối lập phương); nhận ra khối trong đồ vật thật: viên xúc xắc, hộp sữa, hộp giấy.
- Nhận ra khối khi chỉ nhìn thấy 3 mặt trong hình vẽ.

**Kiến thức tiên quyết:** B2.4 (khối trụ, khối cầu), B3.4.

**Ngưỡng thành thạo:** nhóm N4, dưới 8 giây. Tối thiểu 20 câu.

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| Đếm chỉ phần nhìn thấy | 3 mặt, 9 cạnh, 7 đỉnh | Số bằng phần nhìn thấy trong hình vẽ | `dem-phan-thay` |
| Nhầm hình phẳng với khối | Gọi khối lập phương là hình vuông | Chọn tên hình phẳng | `phang-voi-khoi` |
| Hộp có 2 mặt vuông gọi là lập phương | Hộp 4 × 4 × 10 trả lời lập phương | Chọn lập phương khi các cạnh không bằng nhau | `khoi-gan-giong` |
| Đếm cạnh thành 8 (theo đỉnh) | Trả lời 8 cạnh | 8 | `dem-thieu` |

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | Viên xúc xắc là khối gì | khối lập phương | chọn |
| Dễ | Khối hộp chữ nhật có mấy mặt | 6 | nhập (nhiễu 3, 4, 8) |
| Trung bình | Khối đang quay chậm có mấy đỉnh | 8 | nhập (nhiễu 7, 6, 4) |
| Trung bình | Khối lập phương có mấy cạnh | 12 | nhập (nhiễu 8, 6, 9) |
| Trung bình | Hộp sữa có 2 mặt vuông và 4 mặt chữ nhật là khối gì | khối hộp chữ nhật | chọn |
| Khó | Kéo đồ vật vào đúng thùng: xúc xắc, hộp giấy, lon nước (khối trụ), quả bóng | phân đúng | kéo |
| Khó | Mặt của khối lập phương là hình gì, mấy mặt bằng nhau | hình vuông, 6 | chọn |

**Ưu tiên:** P2. Giá trị thấp cho báo cáo phụ huynh; làm bằng cơ chế khối quay chậm khi rảnh.

### B3.7 Chu vi hình tam giác, hình tứ giác

**Yêu cầu cần đạt**

- Nói được chu vi là tổng độ dài các cạnh; tính chu vi tam giác cạnh 3 cm, 4 cm, 5 cm bằng 3 + 4 + 5 = 12 cm.
- Tính chu vi tứ giác: 2 dm + 3 dm + 4 dm + 5 dm = 14 dm.
- Đổi về cùng đơn vị trước khi cộng: tam giác có cạnh 1 dm, 8 cm, 9 cm: 10 + 8 + 9 = 27 cm.
- Đo cạnh rồi tính chu vi hình vẽ trên lưới hoặc bằng thước ảo.

**Kiến thức tiên quyết:** B2.8 (độ dài đường gấp khúc), B3.3, 3.7, B3.11 (đổi đơn vị).

**Ngưỡng thành thạo:** nhóm N2, dưới 15 giây. Tối thiểu 20 câu, ít nhất 4 câu trộn đơn vị.

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| Bỏ sót một cạnh | 3 + 4 = 7 cm | Tổng thiếu một cạnh | `bo-canh` |
| Cộng khi đơn vị khác nhau | 1 + 8 + 9 = 18 | Cộng số không đổi đơn vị | `khong-doi-don-vi` |
| Nhân các cạnh | 3 × 4 × 5 = 60 | Tích | `nham-chu-vi-dien-tich` |
| Đo cạnh sai | Cạnh 4 ô đọc 5 ô | Lệch 1 | `dem-lech` |
| Quên đơn vị | 12 | Thiếu đơn vị ở dạng nhập có ô đơn vị | `sai-don-vi` |

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | Tam giác cạnh 3 cm, 4 cm, 5 cm. Chu vi | 12 cm | nhập |
| Dễ | Tứ giác 4 cạnh đều 5 cm. Chu vi | 20 cm | nhập |
| Trung bình | Tứ giác 2 dm, 3 dm, 4 dm, 5 dm | 14 dm | nhập (nhiễu 9, 120) |
| Trung bình | Đo trên lưới rồi tính chu vi tam giác 3, 4, 5 ô | 12 ô | hình rồi nhập |
| Khó | Tam giác cạnh 1 dm, 8 cm, 9 cm. Chu vi bằng bao nhiêu cm | 27 cm | nhập (nhiễu 18, 117) |
| Khó | Rào vườn tứ giác 12 m, 15 m, 9 m, 14 m. Cần bao nhiêu mét rào | 50 m | nhập |
| Khó | Tam giác có 3 cạnh bằng nhau, chu vi 27 cm. Mỗi cạnh dài bao nhiêu | 9 cm | nhập (nhiễu 81, 24) |

**Ưu tiên:** P2. Là bước đệm của B3.8; cơ chế rào vườn dùng chung với B3.8 và B3.19, không cần màn riêng.

### B3.8 Chu vi hình chữ nhật, chu vi hình vuông

**Yêu cầu cần đạt**

- Rút ra và nói được quy tắc: chu vi hình chữ nhật bằng (chiều dài + chiều rộng) × 2, cùng đơn vị; chu vi hình vuông bằng cạnh × 4.
- Tính đúng: hình chữ nhật dài 8 cm rộng 5 cm có chu vi (8 + 5) × 2 = 26 cm; hình vuông cạnh 7 cm có chu vi 7 × 4 = 28 cm.
- Đổi đơn vị trước khi tính: dài 2 dm, rộng 5 cm thì (20 + 5) × 2 = 50 cm.
- Giải ngược đơn giản: hình vuông chu vi 20 cm thì cạnh 20 : 4 = 5 cm.
- Giải thích được vì sao nhân 2: đi quanh sân một vòng gặp chiều dài hai lần và chiều rộng hai lần.

**Kiến thức tiên quyết:** B3.7, B3.4, 3.14, 3.23 (dấu ngoặc).

**Ngưỡng thành thạo:** nhóm N2, dưới 15 giây. Tối thiểu 20 câu, ít nhất 6 hình vuông, 4 câu trộn đơn vị, 3 câu ngược.

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| Quên nhân 2 | 8 + 5 = 13 cm | (dài + rộng) | `quen-nhan-2` |
| Nhân dài với rộng (nhầm diện tích) | 8 × 5 = 40 cm | dài × rộng | `nham-chu-vi-dien-tich` |
| Không đặt ngoặc, chỉ nhân đôi chiều rộng | 8 + 5 × 2 = 18 cm | dài + rộng × 2 | `bo-ngoac` |
| Chu vi hình vuông nhân 2 hoặc cộng 4 | 7 × 2 = 14; 7 + 4 = 11 | cạnh × 2, cạnh + 4 | `quen-nhan-2` |
| Không đổi đơn vị | (2 + 5) × 2 = 14 | Cộng dm với cm | `khong-doi-don-vi` |
| Giải ngược sai: chia 2 thay chia 4 | Hình vuông chu vi 20 cm, cạnh 10 cm | chu vi : 2 | `nham-quy-tac-nguoc` |

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | Chạy quanh sân hình chữ nhật dài 6 bước rộng 4 bước, đếm số bước một vòng | 20 | hình rồi nhập |
| Dễ | Hình vuông cạnh 5 cm. Chu vi | 20 cm | nhập (nhiễu 10, 25, 9) |
| Trung bình | Hình chữ nhật dài 8 cm rộng 5 cm. Chu vi | 26 cm | nhập (nhiễu 13, 40, 18) |
| Trung bình | Chọn biểu thức tính chu vi hình chữ nhật dài 12 m rộng 7 m | (12 + 7) × 2 | chọn (12 + 7 × 2, 12 × 7, 12 + 7) |
| Trung bình | Hình vuông cạnh 9 dm. Chu vi | 36 dm | nhập |
| Khó | Hình chữ nhật dài 2 dm rộng 5 cm. Chu vi bằng bao nhiêu cm | 50 cm | nhập (nhiễu 14, 100) |
| Khó | Hình vuông chu vi 20 cm. Cạnh dài bao nhiêu | 5 cm | nhập (nhiễu 10, 80) |
| Khó | Hình chữ nhật chu vi 24 cm, dài 8 cm. Rộng bao nhiêu | 4 cm | nhập (nhiễu 16, 12) |

**Ưu tiên:** P1. Công thức đầu tiên của đời học sinh, phụ huynh rất quan tâm; lỗi "quên nhân 2" và "nhầm với diện tích" dễ nhận qua nhiễu; cơ chế chạy quanh sân dạy được cái vì sao.

### B3.9 Diện tích của một hình, đơn vị xăng-ti-mét vuông

**Yêu cầu cần đạt**

- Hiểu diện tích là phần mặt phẳng hình chiếm; so sánh diện tích hai hình bằng cách đặt chồng hoặc đếm ô vuông.
- Biết 1 cm² là diện tích hình vuông cạnh 1 cm; đọc "một xăng-ti-mét vuông", viết cm².
- Đếm ô để nêu diện tích: hình phủ 6 ô vuông 1 cm² có diện tích 6 cm²; ghép hai nửa ô thành một ô.
- Phân biệt chu vi (đo đường bao, đơn vị cm) với diện tích (đo mặt, đơn vị cm²) trên cùng một hình: hình chữ nhật 3 ô × 2 ô có chu vi 10 cm và diện tích 6 cm².

**Kiến thức tiên quyết:** B3.4, 3.12, B3.8.

**Ngưỡng thành thạo:** nhóm N4, dưới 12 giây cho đếm ô. Tối thiểu 20 câu, ít nhất 5 hình có nửa ô, 5 câu hỏi cả chu vi lẫn diện tích.

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| Đếm ô bỏ sót hoặc trùng | Hình 12 ô đếm 11 hoặc 13 | Lệch 1 đến 2 | `dem-lech` |
| Nửa ô tính là một ô | Hình 4 ô và 2 nửa ô trả lời 6 | Cộng số nửa ô như ô nguyên | `nua-o` |
| Ghi đơn vị cm thay cm² | 6 cm | Đơn vị sai ở ô chọn đơn vị | `sai-don-vi` |
| Đếm chu vi khi hỏi diện tích | Hình 3 × 2 trả lời 10 | Bằng chu vi | `nham-chu-vi-dien-tich` |
| Hình dài hơn thì diện tích lớn hơn | Hình 1 × 6 và 3 × 3: chọn 1 × 6 lớn hơn | Chọn hình dài | `dai-la-lon` |

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | Đếm ô vuông phủ kín hình | 6 | nhập |
| Dễ | Hình A 5 ô, hình B 7 ô. Hình nào có diện tích lớn hơn | B | chọn |
| Trung bình | Hình gồm 4 ô nguyên và 2 nửa ô. Diện tích bằng bao nhiêu cm² | 5 cm² | nhập (nhiễu 6, 4) |
| Trung bình | Chọn đơn vị đúng cho diện tích: cm hay cm² | cm² | chọn |
| Trung bình | Tô đúng 8 cm² trên lưới | 8 ô | hình |
| Khó | Hình chữ nhật 3 ô × 2 ô (mỗi ô 1 cm). Chu vi và diện tích | 10 cm; 6 cm² | nhập hai ô |
| Khó | Hình 1 × 6 và hình 3 × 3: hình nào diện tích lớn hơn | 3 × 3 (9 so với 6) | chọn |

**Ưu tiên:** P2. Cần dạy trước B3.10 nhưng bản thân chỉ là đếm ô; gộp thành màn mở đầu của game diện tích, dùng nền kẻ ô của Tháp Đồng Hồ như bản đồ gợi ý.

### B3.10 Diện tích hình chữ nhật, diện tích hình vuông

**Yêu cầu cần đạt**

- Rút ra từ đếm ô và nói được: diện tích hình chữ nhật bằng chiều dài × chiều rộng (cùng đơn vị đo); diện tích hình vuông bằng cạnh × cạnh.
- Tính đúng: hình chữ nhật 5 cm × 3 cm có diện tích 15 cm²; hình vuông cạnh 5 cm có diện tích 25 cm².
- Đổi đơn vị trước khi nhân: dài 2 dm rộng 5 cm thì 20 × 5 = 100 cm².
- Trên cùng một hình, tính được cả chu vi lẫn diện tích và ghi đúng hai đơn vị: hình vuông cạnh 5 cm có chu vi 20 cm và diện tích 25 cm².

**Kiến thức tiên quyết:** B3.9, 3.14, B3.8.

**Ngưỡng thành thạo:** nhóm N2, dưới 15 giây. Tối thiểu 20 câu, ít nhất 6 câu hỏi cả chu vi lẫn diện tích, 4 câu trộn đơn vị. Tránh dùng hình vuông cạnh 4 cm để đo phân biệt chu vi và diện tích (cùng ra 16).

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| Tính chu vi khi hỏi diện tích | 5 × 3: trả lời 16 | (dài + rộng) × 2 | `nham-chu-vi-dien-tich` |
| Hình vuông: cạnh × 4 thay cạnh × cạnh | Cạnh 5 cm trả lời 20 cm² | cạnh × 4 | `nham-chu-vi-dien-tich` |
| Cộng thay nhân | 5 + 3 = 8 cm² | dài + rộng | `cong-thay-nhan` |
| Ghi đơn vị cm | 15 cm | Đơn vị sai | `sai-don-vi` |
| Không đổi đơn vị | 2 × 5 = 10 | Nhân dm với cm | `khong-doi-don-vi` |
| Nhân sai (bảng nhân) | 7 × 8 = 54 cm² | Như 3.12 | mã của 3.12 |

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | Lát gạch nền 4 ô × 3 ô, game đếm số viên, bé viết phép nhân | 4 × 3 = 12 | hình rồi nhập |
| Dễ | Hình chữ nhật dài 5 cm rộng 3 cm. Diện tích | 15 cm² | nhập (nhiễu 16, 8) |
| Trung bình | Hình vuông cạnh 5 cm. Diện tích | 25 cm² | nhập (nhiễu 20, 10) |
| Trung bình | Chọn đúng biểu thức tính diện tích hình chữ nhật 9 cm × 6 cm | 9 × 6 | chọn ((9 + 6) × 2, 9 + 6) |
| Trung bình | Hình vuông cạnh 5 cm: chu vi và diện tích | 20 cm; 25 cm² | nhập hai ô |
| Khó | Hình chữ nhật dài 2 dm rộng 5 cm. Diện tích bằng bao nhiêu cm² | 100 cm² | nhập (nhiễu 10, 50) |
| Khó | Hình chữ nhật diện tích 24 cm², chiều rộng 4 cm. Chiều dài | 6 cm | nhập (nhiễu 20, 96) |
| Khó | Hai hình: chữ nhật 8 × 2 và vuông 4 × 4. Chu vi hình nào lớn hơn, diện tích hình nào lớn hơn | chữ nhật (20 so với 16); bằng nhau (16) | chọn hai lần |

**Ưu tiên:** P1. Cùng B3.8 là hai công thức phụ huynh hỏi nhiều nhất; câu hỏi kép chu vi và diện tích trên cùng hình là phép đo rõ nhất cho lỗi nhầm lẫn; cơ chế lát gạch nối thẳng sang phép nhân.

### B3.11 Bảng đơn vị đo độ dài: mm, cm, dm, m, km

**Yêu cầu cần đạt**

- Đọc, viết mm và biết 1 cm = 10 mm; nhắc lại 1 dm = 10 cm, 1 m = 10 dm = 100 cm, 1 m = 1 000 mm, 1 km = 1 000 m.
- Đổi đơn vị một bước: 3 m = 30 dm = 300 cm; 5 cm = 50 mm; 2 km = 2 000 m; 400 cm = 4 m.
- Đổi số đo có hai đơn vị: 1 m 5 cm = 105 cm; 3 dm 4 cm = 34 cm.
- Chọn đơn vị hợp lý: bề dày quyển vở đo bằng mm, chiều cao cửa bằng m, quãng đường về quê bằng km.
- Cộng trừ số đo cùng đơn vị: 4 dm + 7 dm = 11 dm; 1 m − 30 cm = 70 cm.

**Kiến thức tiên quyết:** B2.6 (cm, dm, m, km), 3.10 (nhân chia số tròn).

**Ngưỡng thành thạo:** nhóm N4, dưới 8 giây. Tối thiểu 20 câu, phủ đủ các cặp đơn vị kề nhau và ít nhất 4 câu hai đơn vị.

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| Nhầm hệ số (10 với 100, 100 với 1 000) | 1 m = 10 cm; 1 km = 100 m | Sai bậc 10 | `dem-so-0` |
| Đổi ngược chiều | 300 cm = 3 000 m | Nhân khi phải chia | `doi-nguoc` |
| Ghép hai đơn vị bằng cách viết liền số | 1 m 5 cm = 15 cm | Viết liền các chữ số | `ghep-don-vi-lien` |
| Cộng khác đơn vị | 2 m + 5 cm = 7 | Cộng số không đổi | `khong-doi-don-vi` |
| Chọn đơn vị không hợp lý | Chiều cao cửa 2 cm | Đơn vị lệch bậc | `don-vi-khong-hop-ly` |

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | 1 cm = ? mm | 10 | nhập |
| Dễ | Bề dày quyển sách đo bằng đơn vị nào | mm | chọn (mm, m, km) |
| Trung bình | 3 m = ? cm | 300 | nhập (nhiễu 30, 3 000) |
| Trung bình | 1 m 5 cm = ? cm | 105 | nhập (nhiễu 15, 150) |
| Trung bình | Nhảy trên thang đơn vị từ 5 cm xuống mm | 50 mm | hình |
| Khó | 4 km 300 m = ? m | 4 300 | nhập (nhiễu 43 000, 430, 4 030) |
| Khó | 1 m − 30 cm = ? cm | 70 | nhập (nhiễu 29, 130) |
| Khó | Xếp từ ngắn đến dài: 1 m, 15 dm, 120 cm, 900 mm | 900 mm, 1 m, 120 cm, 15 dm | xếp |

**Ưu tiên:** P2. Cần cho chu vi (B3.7, B3.8); cơ chế thang đơn vị (mỗi bậc nhân hoặc chia 10) dùng lại được cho gam và mi-li-lít nên làm chung một game đo lường.

### B3.12 Gam, ki-lô-gam và quan hệ giữa hai đơn vị

**Yêu cầu cần đạt**

- Đọc, viết g và biết 1 kg = 1 000 g; đọc được cân đồng hồ có vạch 100 g, 200 g, 500 g và cân đĩa với các quả cân 1 kg, 500 g, 200 g, 100 g.
- Đổi: 2 kg = 2 000 g; 1 500 g = 1 kg 500 g; 3 000 g = 3 kg.
- So sánh: 2 kg lớn hơn 1 500 g; 900 g nhỏ hơn 1 kg.
- Cộng trừ, nhân chia số đo: 350 g + 150 g = 500 g; 1 kg − 400 g = 600 g; 250 g × 4 = 1 000 g = 1 kg.
- Ước lượng: quả trứng khoảng 50 g, túi gạo 5 kg, quyển vở khoảng 100 g.

**Kiến thức tiên quyết:** B2.9 (ki-lô-gam), 3.2 (số đến 10 000), 3.10.

**Ngưỡng thành thạo:** nhóm N4, dưới 10 giây. Tối thiểu 20 câu, ít nhất 6 câu đọc cân, 4 câu so sánh khác đơn vị.

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| 1 kg = 100 g | 2 kg = 200 g | Sai bậc 10 | `dem-so-0` |
| Ghép hai đơn vị bằng viết liền | 1 kg 50 g = 150 g | Viết liền thay vì 1 050 g | `ghep-don-vi-lien` |
| So sánh bằng số, bỏ đơn vị | 1 500 g > 2 kg vì 1 500 > 2 | Chọn số lớn hơn không đổi đơn vị | `khong-doi-don-vi` |
| Đọc cân đồng hồ sai vạch | Kim ở vạch 700 g đọc 7 kg hoặc 600 g | Lệch vạch hoặc sai đơn vị | `doc-vach-sai` |
| Cộng quả cân thiếu | Đĩa có 500 g + 200 g + 100 g đọc 700 g | Tổng thiếu một quả | `bo-canh` |

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | 1 kg = ? g | 1 000 | nhập |
| Dễ | Cân đồng hồ kim chỉ vạch 500 g. Đọc số cân | 500 g | chọn |
| Trung bình | 1 500 g = ? kg ? g | 1 kg 500 g | nhập hai ô |
| Trung bình | 2 kg và 1 500 g, bên nào nặng hơn | 2 kg | chọn |
| Trung bình | Đặt quả cân lên đĩa để cân thăng bằng với túi 1 kg 300 g (có quả 1 kg, 500 g, 200 g, 100 g) | 1 kg + 200 g + 100 g | kéo |
| Khó | 1 kg − 400 g = ? g | 600 | nhập (nhiễu 996, 400) |
| Khó | Mỗi gói 250 g, 4 gói nặng bao nhiêu kg | 1 kg | nhập (nhiễu 1 000, 100) |
| Khó | Quả trứng nặng khoảng bao nhiêu: 5 g, 50 g, 500 g, 5 kg | 50 g | chọn |

**Ưu tiên:** P2. Cùng game đo lường với B3.11 và B3.13; giá trị với phụ huynh vừa phải, nhưng cơ chế cân ở chợ gần đời sống, hợp phiếu thực hành D3.1.

### B3.13 Mi-li-lít, lít

**Yêu cầu cần đạt**

- Đọc, viết ml và biết 1 l = 1 000 ml; đọc vạch trên ca đong, chai có ghi 250 ml, 500 ml.
- Đổi: 2 l = 2 000 ml; 1 200 ml = 1 l 200 ml; 2 chai 500 ml = 1 l.
- Cộng trừ, nhân chia số đo: 300 ml + 200 ml = 500 ml; 1 l − 250 ml = 750 ml; 1 l : 4 = 250 ml.
- Ước lượng: một thìa khoảng 5 ml, một cốc khoảng 200 ml, một chai nước lớn 1 l 500 ml.

**Kiến thức tiên quyết:** B2.10 (lít), 3.2, 3.10.

**Ngưỡng thành thạo:** nhóm N4, dưới 10 giây. Tối thiểu 20 câu, ít nhất 6 câu đọc vạch.

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| 1 l = 100 ml | 2 l = 200 ml | Sai bậc 10 | `dem-so-0` |
| Ghép hai đơn vị bằng viết liền | 1 l 200 ml = 1 200 ml đúng nhưng 1 l 20 ml viết 120 ml | Viết liền thay vì 1 020 ml | `ghep-don-vi-lien` |
| Đọc vạch sai | Vạch 250 ml đọc 200 hoặc 300 | Lệch một vạch | `doc-vach-sai` |
| Rót quá hoặc thiếu | Yêu cầu 750 ml, dừng ở 700 hoặc 800 | Lệch vạch nhỏ | `doc-vach-sai` |
| Chia 1 l cho 4 sai | 1 l : 4 = 25 ml | Sai bậc 10 | `dem-so-0` |

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | 1 l = ? ml | 1 000 | nhập |
| Dễ | Ca đong vạch 200, 400, 600, 800, 1 000. Nước tới vạch thứ ba | 600 ml | chọn |
| Trung bình | 2 chai 500 ml được bao nhiêu lít | 1 l | nhập (nhiễu 1 000 l, 100) |
| Trung bình | Rót nước đến đúng vạch 750 ml | 750 | hình |
| Trung bình | 1 l 200 ml = ? ml | 1 200 | nhập (nhiễu 120, 1 020) |
| Khó | Pha nước cam: 300 ml nước cam + 700 ml nước lọc, được mấy lít | 1 l | nhập |
| Khó | Chai 1 l rót đều 4 cốc, mỗi cốc bao nhiêu ml | 250 ml | nhập (nhiễu 25, 400) |
| Khó | Một thìa nước khoảng: 5 ml, 50 ml, 500 ml | 5 ml | chọn |

**Ưu tiên:** P2. Cùng game đo lường; cơ chế rót nước đã có gợi ý.

### B3.14 Nhiệt độ, độ C, đọc nhiệt kế

**Yêu cầu cần đạt**

- Đọc, viết °C ("độ C"); đọc nhiệt kế có vạch 1 độ hoặc 2 độ: cột chất lỏng tới vạch 37 đọc 37 °C.
- Biết các mốc: nước đá 0 °C, nước sôi 100 °C, cơ thể người khoảng 37 °C, ngày nắng nóng Hà Nội khoảng 35 đến 38 °C, ngày lạnh Sa Pa khoảng 5 °C.
- So sánh nóng lạnh: 32 °C nóng hơn 25 °C; 38 °C thì bị sốt.
- Kéo cột nhiệt kế đến số cho trước.

**Kiến thức tiên quyết:** 2.2 (tia số, so sánh trong 100), B2.7 (đọc vạch trên thước).

**Ngưỡng thành thạo:** nhóm N4, dưới 8 giây. Tối thiểu 20 câu, ít nhất 6 câu nhiệt kế vạch 2 độ.

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| Đọc vạch 2 độ như vạch 1 độ | Cột ở giữa 36 và 38 đọc 36 hoặc 38 thay vì 37; hoặc đếm mỗi vạch 1 độ | Lệch 1 hoặc gấp đôi khoảng | `doc-vach-sai` |
| Đọc số ghi gần nhất thay vì vạch | Cột ở 27 đọc 30 | Làm tròn lên số ghi | `doc-vach-sai` |
| Số lớn là lạnh | 5 °C nóng hơn 30 °C | Chọn ngược | `nguoc-dau` |
| Nhầm mốc đời sống | Nước sôi 37 °C, cơ thể 100 °C | Đổi chỗ hai mốc | `nham-moc` |

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | Nhiệt kế vạch 1 độ, cột tới 25. Đọc nhiệt độ | 25 °C | chọn |
| Dễ | Nước sôi ở bao nhiêu độ C | 100 °C | chọn (0, 37, 100) |
| Trung bình | Nhiệt kế vạch 2 độ, cột giữa 36 và 38 | 37 °C | chọn (nhiễu 36, 38, 35) |
| Trung bình | Kéo cột nhiệt kế cho khớp tranh ngày nắng nóng 36 °C | 36 | hình |
| Trung bình | 32 °C và 25 °C, hôm nào nóng hơn | 32 °C | chọn |
| Khó | Bé đo được 38 °C, có bị sốt không (bình thường 37 °C) | có | đúng sai |
| Khó | Sáng 22 °C, trưa tăng thêm 9 °C. Trưa bao nhiêu độ | 31 °C | nhập |

**Ưu tiên:** P2. Ít thời lượng, chi phí thấp (một tia số dựng đứng); ghép vào game đo lường như một màn nhỏ.

### B3.15 Tiền Việt Nam mệnh giá lớn, tính tiền khi mua bán

**Yêu cầu cần đạt**

- Nhận biết tờ 10 000, 20 000, 50 000, 100 000 đồng (và 200 000, 500 000 ở mức nhận biết) qua màu và số; đọc "hai mươi nghìn đồng".
- Đổi tiền: 1 tờ 50 000 = 5 tờ 10 000 = 2 tờ 20 000 + 1 tờ 10 000; 100 000 = 2 tờ 50 000.
- Tính tổng giá: vở 8 000 + bút 5 000 = 13 000 đồng; nhân: 3 quyển vở 8 000 đồng hết 24 000 đồng.
- Trả tiền và tính tiền thừa: đưa 20 000 mua 13 000 thì thừa 7 000; chọn tổ hợp tờ tiền để trả vừa đủ hoặc để trả lại.
- Nối với bài toán hai bước (3.24) và rút về đơn vị (3.25) trong ngữ cảnh mua bán.

**Kiến thức tiên quyết:** B2.14 (tiền đến 5 000 đồng), 3.10 (nhẩm số tròn nghìn), 3.24.

**Ngưỡng thành thạo:** nhóm N2, dưới 15 giây cho tính tiền, dưới 25 giây cho chọn tờ tiền. Tối thiểu 20 câu, ít nhất 6 câu tiền thừa, 4 câu đổi tiền.

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| Đếm sai số chữ số 0 | 20 000 − 13 000 = 70 000 hoặc 700 | Sai bậc 10 | `dem-so-0` |
| Nhầm mệnh giá | Tờ 20 000 đọc 2 000 hoặc 200 000 | Sai bậc 10 khi đọc tờ tiền | `nham-menh-gia` |
| Cộng tiền nghìn với tiền trăm như cùng hàng | 5 000 + 500 = 10 000 | Cộng chữ số đầu | `sai-hang` |
| Tiền thừa tính ngược | Đưa 20 000 mua 13 000, thừa 13 000 hoặc 33 000 | Trả lại giá hoặc tổng | `nham-dau` |
| Đổi tiền thiếu tờ | 50 000 = 4 tờ 10 000 | Tổng các tờ không bằng | `bo-canh` |
| Trả không đủ hoặc thừa quá | Mua 13 000 đưa 10 000 | Tổng tờ đưa nhỏ hơn giá | `tra-thieu` |

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | Chạm vào tờ 20 000 đồng trong 4 tờ | tờ 20 000 | chọn trên hình |
| Dễ | Vở 8 000 đồng và bút 5 000 đồng hết bao nhiêu tiền | 13 000 | nhập (nhiễu 1 300, 130 000) |
| Trung bình | Đưa 20 000 mua 13 000. Được trả lại bao nhiêu | 7 000 | nhập (nhiễu 70 000, 13 000, 33 000) |
| Trung bình | Kéo các tờ tiền để trả vừa đúng 35 000 (có tờ 10 000, 20 000, 5 000) | 20 000 + 10 000 + 5 000 | kéo |
| Trung bình | 1 tờ 50 000 đổi được mấy tờ 10 000 | 5 | nhập (nhiễu 4, 50) |
| Khó | 3 quyển vở 8 000 đồng một quyển, đưa 50 000. Trả lại bao nhiêu | 26 000 | nhập hai bước |
| Khó | Có 100 000 đồng, mua 2 món 35 000 và 45 000. Còn lại | 20 000 | nhập |
| Khó | 5 quyển vở 40 000 đồng. 3 quyển bao nhiêu tiền | 24 000 | nhập (rút về đơn vị) |

**Ưu tiên:** P1. M3 mốc 12T yêu cầu game tiền Việt Nam (B2.14, B3.15); phụ huynh thấy ngay giá trị đời sống; là ngữ cảnh tự nhiên cho 3.24 và 3.25.

### B3.16 Tháng, năm, số ngày trong tháng, xem lịch

**Yêu cầu cần đạt**

- Biết 1 năm có 12 tháng; kể tên các tháng theo thứ tự; 1 năm thường có 365 ngày, năm nhuận có 366 ngày (mức nhận biết).
- Nói số ngày từng tháng: tháng 1, 3, 5, 7, 8, 10, 12 có 31 ngày; tháng 4, 6, 9, 11 có 30 ngày; tháng 2 có 28 hoặc 29 ngày; dùng được quy tắc nắm tay.
- Xem lịch tháng: ngày 15 tháng 3 là thứ mấy; thứ hai tuần sau là ngày mấy; tháng này có mấy ngày chủ nhật.
- Tính khoảng cách ngày đơn giản trong tháng: từ ngày 5 đến ngày 12 là 7 ngày; sinh nhật ngày 20 còn bao nhiêu ngày nữa.

**Kiến thức tiên quyết:** B2.13 (ngày, tháng, xem lịch), 3.7.

**Ngưỡng thành thạo:** nhóm N4, dưới 8 giây cho số ngày trong tháng, dưới 15 giây cho xem lịch. Tối thiểu 20 câu, phủ đủ 12 tháng, ít nhất 5 câu "tuần sau, tuần trước".

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| Tháng 2 có 30 hoặc 31 ngày | Trả lời 30 | 30, 31 | `thang-2` |
| Tưởng tháng xen kẽ 31, 30 đều đặn | Tháng 8 có 30 ngày, tháng 9 có 31 | Sai ở tháng 7 và 8 liền nhau, tháng 12 | `xen-ke-sai` |
| Đếm khoảng ngày lệch 1 | Từ ngày 5 đến ngày 12 trả lời 8 ngày (đếm cả hai đầu) | Đáp án đúng cộng 1 | `dem-lech` |
| Tuần sau không cộng 7 | Thứ hai ngày 3, thứ hai tuần sau trả lời ngày 9 hoặc 11 | Không lệch đúng 7 | `tuan-7-ngay` |
| Đọc lịch nhầm hàng, cột | Ngày 15 ở cột thứ tư đọc thứ năm | Lệch một cột | `doc-nham-cot` |
| Nhầm số tháng với số ngày | Một năm có 30 tháng | Số lạ | `nham-moc` |

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | Một năm có mấy tháng | 12 | nhập |
| Dễ | Tháng 4 có bao nhiêu ngày | 30 | chọn (28, 30, 31) |
| Trung bình | Tháng 2 năm thường có bao nhiêu ngày | 28 | chọn (nhiễu 30, 29, 31) |
| Trung bình | Đếm trên nắm tay: tháng 8 có bao nhiêu ngày | 31 | hình rồi chọn |
| Trung bình | Lịch tháng 3: ngày 15 là thứ mấy | theo lịch | chọn trên lịch |
| Khó | Thứ hai là ngày 3. Thứ hai tuần sau là ngày mấy | 10 | nhập (nhiễu 9, 11, 4) |
| Khó | Hôm nay ngày 5, sinh nhật ngày 12 cùng tháng. Còn mấy ngày nữa | 7 | nhập (nhiễu 8, 6) |
| Khó | Ngày 30 tháng 4 là thứ bảy. Ngày 1 tháng 5 là thứ mấy | chủ nhật | chọn |

**Ưu tiên:** P1. Gần đời sống, phụ huynh dễ kiểm chứng ("con biết tháng 2 có mấy ngày"); cơ chế lật lịch hợp với mê cung sẵn có; mở rộng tự nhiên của gói đồng hồ.

### B3.17 Xem đồng hồ chính xác đến từng phút, đồng hồ điện tử

**Yêu cầu cần đạt**

- Đọc giờ theo 5 phút: kim dài chỉ số 8 là 40 phút (8 × 5); 6 giờ 40 phút.
- Đọc chính xác từng phút bằng cách đếm vạch nhỏ từ số gần nhất: 6 giờ 23 phút (số 4 là 20 phút, thêm 3 vạch).
- Đọc giờ kém: 7 giờ 55 phút cũng là 8 giờ kém 5 phút; 7 giờ 45 phút là 8 giờ kém 15 phút; biết kim ngắn lúc đó đã gần số 8.
- Đọc đồng hồ điện tử và gọi 24 giờ: 07:13 là 7 giờ 13 phút sáng, 19:13 là 19 giờ 13 phút tức 7 giờ 13 phút tối; 15:00 là 3 giờ chiều.
- Chỉnh kim hoặc số điện tử về giờ cho trước.

**Kiến thức tiên quyết:** B2.11 (giờ đúng, rưỡi, 15 phút, giờ kém), B2.12 (24 giờ, các buổi), 3.12 (nhân 5).

**Ngưỡng thành thạo:** nhóm N1, dưới 5 giây cho 5 phút và điện tử, dưới 8 giây cho từng phút (Xe Tăng hiện nhân thời gian 1,2 cho câu từng phút). Tối thiểu 30 đồng hồ, ít nhất 8 câu giờ kém, 8 câu điện tử buổi chiều tối. Đã có màn 4 đến 7 của Tháp Đồng Hồ và các màn tương ứng của Xe Tăng, Cưỡi Hổ.

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| Đọc số kim dài chỉ làm số phút | Kim dài chỉ số 4 đọc "4 phút" thay vì 20 phút | Phút bằng số trên mặt | `phut-bang-so` |
| Kim ngắn gần số sau, đọc giờ sau | 6 giờ 55 phút đọc 7 giờ 55 phút | Giờ cộng 1 khi phút từ 35 trở lên | `gio-cong-1` |
| Giờ kém ngược chiều | 8 giờ kém 5 đọc thành 8 giờ 5 phút | Phút đổi dấu | `gio-kem-nguoc` |
| Nhầm hai kim | 3 giờ 30 phút đọc 6 giờ 15 phút | Đổi vai hai kim | `nham-kim` |
| Đếm vạch lệch | 6 giờ 23 phút đọc 6 giờ 22 hoặc 24 | Lệch 1 phút | `dem-lech` |
| 24 giờ: không trừ 12 hoặc cộng 12 sai | 15:00 đọc 5 giờ chiều; 19:13 đọc "19 giờ sáng" | Giờ lệch hoặc buổi sai | `24-gio-sai` |

Tháp Đồng Hồ và Xe Tăng đã sinh đáp án nhiễu "giống lỗi thường gặp" trong `clock.js`; cần gắn mã lỗi khi ghi `missed`.

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | Kim ngắn qua 6, kim dài chỉ 8 | 6 giờ 40 phút | chọn |
| Dễ | Đồng hồ điện tử 07:13 | 7 giờ 13 phút | chọn |
| Trung bình | Kim ngắn qua 6, kim dài qua số 4 thêm 3 vạch | 6 giờ 23 phút | chọn (nhiễu 6 giờ 4 phút, 6 giờ 22, 4 giờ 32) |
| Trung bình | Kim ngắn gần 8, kim dài chỉ 11: đọc theo giờ kém | 8 giờ kém 5 phút | chọn (nhiễu 8 giờ 5, 7 giờ kém 5) |
| Trung bình | 19:13 là mấy giờ tối | 7 giờ 13 phút tối | chọn |
| Khó | Xoay kim về 9 giờ kém 20 phút | 8:40 | hình |
| Khó | 15:00 là mấy giờ buổi chiều | 3 giờ chiều | chọn (nhiễu 5 giờ, 15 giờ sáng) |
| Khó | Ghép đồng hồ kim với đồng hồ điện tử cùng giờ (4 cặp, có 07:15 và 19:15) | ghép đúng | ghép |

**Ưu tiên:** P0. Trong M1 (B3.17); đã có ba game, việc còn lại là mã lỗi, gộp ba game về một mã nội dung trong báo cáo, và tách câu có gợi ý.

### B3.18 Tính khoảng thời gian, thời gian trôi qua

**Yêu cầu cần đạt**

- Biết các đơn vị và quan hệ: 1 giờ = 60 phút, 1 ngày = 24 giờ, 1 tuần = 7 ngày, 1 năm = 12 tháng; đổi 2 giờ = 120 phút, 90 phút = 1 giờ 30 phút.
- Tính thời gian trôi qua trong cùng giờ: từ 7 giờ đến 7 giờ 30 phút là 30 phút; qua mốc giờ: từ 8 giờ 15 phút đến 9 giờ là 45 phút (đếm tới 9 giờ), từ 8 giờ 45 phút đến 9 giờ 20 phút là 35 phút (15 phút tới 9 giờ rồi thêm 20 phút).
- Tìm giờ kết thúc: bắt đầu 7 giờ 30 phút, học 45 phút, kết thúc 8 giờ 15 phút.
- Tìm giờ bắt đầu (dạng ngược): kết thúc 9 giờ, kéo dài 40 phút, bắt đầu 8 giờ 20 phút.
- Đọc thời gian biểu và trả lời "tiết học kéo dài bao lâu".

**Kiến thức tiên quyết:** B3.17, 3.7, 3.11 (tìm thành phần cho dạng ngược).

**Ngưỡng thành thạo:** nhóm N5 rút gọn: 8/10, dưới 30 giây mỗi câu (Xe Tăng hiện nhân thời gian 1,4 cho câu này). Tối thiểu 20 câu, ít nhất 6 câu qua mốc giờ, 4 câu dạng ngược.

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| Trừ giờ như trừ số (1 giờ = 100 phút) | 9 giờ − 8 giờ 15 = 85 phút | Đáp án đúng cộng 40 khi qua mốc giờ | `gio-100-phut` |
| Đếm mốc thay vì khoảng | Từ 7 giờ đến 9 giờ là 3 giờ (đếm 7, 8, 9) | Đáp án đúng cộng 1 | `dem-moc` |
| Chỉ lấy hiệu phút, bỏ giờ | Từ 8 giờ 15 đến 9 giờ là 15 phút | Hiệu phút tuyệt đối | `bo-gio` |
| Dạng ngược: cộng thay trừ | Kết thúc 9 giờ, kéo dài 40 phút, bắt đầu 9 giờ 40 | Giờ kết thúc cộng khoảng | `nguoc-chieu` |
| Đổi đơn vị sai | 2 giờ = 200 phút; 90 phút = 1 giờ 90 phút | Sai hệ số 60 | `gio-100-phut` |
| Giờ kết thúc vượt 60 phút không đổi | 7 giờ 30 + 45 phút = 7 giờ 75 phút | Phút từ 60 trở lên | `qua-60-phut` |

Cưỡi Hổ (màn 8) và Xe Tăng (màn 8) đã có giờ kết thúc và khoảng thời gian; chưa có giờ bắt đầu.

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | Từ 7 giờ đến 7 giờ 30 phút là bao nhiêu phút | 30 phút | chọn |
| Dễ | 1 giờ = ? phút | 60 | nhập |
| Trung bình | Từ 8 giờ 15 phút đến 9 giờ | 45 phút | chọn (nhiễu 85, 15, 1 giờ 15) |
| Trung bình | Bắt đầu 7 giờ 30, học 45 phút. Kết thúc lúc mấy giờ | 8 giờ 15 phút | chọn (nhiễu 7 giờ 75, 8 giờ 45) |
| Trung bình | 2 giờ = ? phút | 120 | nhập (nhiễu 200, 2 000) |
| Khó | Từ 8 giờ 45 phút đến 9 giờ 20 phút | 35 phút | nhập (nhiễu 75, 25) |
| Khó | Phim kết thúc lúc 9 giờ, dài 40 phút. Bắt đầu lúc mấy giờ | 8 giờ 20 phút | chọn (nhiễu 9 giờ 40, 8 giờ 60) |
| Khó | Từ 7 giờ đến 9 giờ là mấy giờ | 2 giờ | chọn (nhiễu 3) |

**Ưu tiên:** P0. M3 mốc 6T nêu B3.18; hai game đã có dạng xuôi, thêm dạng ngược và mã lỗi `gio-100-phut` là xong; lỗi này phụ huynh cũng hay mắc nên báo cáo có giá trị.

### B3.19 Giải bài toán liên quan đến chu vi và diện tích

**Yêu cầu cần đạt**

- Đọc đề, nhận ra đề hỏi chu vi (rào, viền, đi quanh) hay diện tích (lát, phủ, sơn).
- Bài xuôi: vườn hình chữ nhật dài 25 m rộng 12 m, cần bao nhiêu mét rào (chu vi 74 m); tờ giấy hình chữ nhật dài 9 cm rộng 6 cm, diện tích 54 cm².
- Bài ngược một bước: hình vuông chu vi 32 cm, cạnh 8 cm; hình chữ nhật chu vi 24 cm, dài 8 cm, rộng 4 cm (nửa chu vi 12 trừ 8); hình chữ nhật diện tích 24 cm², rộng 4 cm, dài 6 cm.
- Bài hai bước: tính cạnh hình vuông từ chu vi rồi tính diện tích (chu vi 20 cm, cạnh 5 cm, diện tích 25 cm²).
- Trình bày đủ lời giải, phép tính, đơn vị, đáp số.

**Kiến thức tiên quyết:** B3.8, B3.10, 3.24, 3.16.

**Ngưỡng thành thạo:** nhóm N5, 4/5 bài, dưới 90 giây. 10 bài, ít nhất 3 bài ngược và 2 bài hai bước.

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| Chọn sai đại lượng | Hỏi rào (chu vi) nhưng tính dài × rộng | Bằng diện tích | `nham-chu-vi-dien-tich` |
| Bài ngược chu vi hình chữ nhật: quên chia 2 | Chu vi 24, dài 8, rộng 24 − 8 = 16 | chu vi − dài | `quen-nua-chu-vi` |
| Hình vuông ngược: chia 2 thay chia 4 | Chu vi 32, cạnh 16 | chu vi : 2 | `nham-quy-tac-nguoc` |
| Chỉ làm một bước | Chu vi 20, cạnh 5, dừng lại | Kết quả trung gian | `mot-buoc` |
| Đơn vị sai | Diện tích ghi cm, chu vi ghi cm² | Đơn vị đảo | `sai-don-vi` |
| Không đổi đơn vị | Dài 1 m rộng 40 cm tính (1 + 40) × 2 | Cộng khác đơn vị | `khong-doi-don-vi` |

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | Vườn hình chữ nhật dài 25 m rộng 12 m. Cần bao nhiêu mét rào | 74 m | chọn công thức rồi nhập |
| Dễ | Tờ giấy dài 9 cm rộng 6 cm. Diện tích | 54 cm² | nhập (nhiễu 30, 15) |
| Trung bình | Đề nói "lát gạch kín nền": hỏi chu vi hay diện tích | diện tích | chọn |
| Trung bình | Hình vuông chu vi 32 cm. Cạnh | 8 cm | nhập (nhiễu 16, 128) |
| Trung bình | Hình chữ nhật chu vi 24 cm, dài 8 cm. Rộng | 4 cm | nhập (nhiễu 16, 12) |
| Khó | Hình vuông chu vi 20 cm. Diện tích | 25 cm² | nhập hai bước (nhiễu 5, 100, 400) |
| Khó | Hình chữ nhật diện tích 24 cm², rộng 4 cm. Chu vi | 20 cm | nhập hai bước (nhiễu 6, 28) |
| Khó | Sân dài 1 m rộng 40 cm. Chu vi bằng bao nhiêu cm | 280 cm | nhập (nhiễu 82, 2 080) |

**Ưu tiên:** P2. Đặt sau B3.8 và B3.10 như bản đồ ghi; dùng chung bối cảnh khu vườn; chỉ đáng làm khi hai nội dung trước đã có dữ liệu.

## 8. Mạch C: Thống kê và Xác suất

### C3.1 Thu thập, phân loại, ghi chép số liệu

**Yêu cầu cần đạt**

- Phân loại đồ vật theo một tiêu chí (màu, loại, hình) rồi kiểm đếm bằng vạch: mỗi vật một vạch, nhóm 5 vạch (4 vạch và một vạch gạch chéo).
- Ghi kết quả vào bảng kiểm đếm hai cột (loại, số lượng) và đọc lại: "có 7 quả táo, 4 quả cam".
- Thu thập số liệu từ chính hoạt động: số câu đúng mỗi ván, số sao mỗi màn.
- Kiểm tra tổng: các nhóm cộng lại bằng tổng số vật.

**Kiến thức tiên quyết:** C2.1 (thu thập, phân loại, kiểm đếm), 3.12 (nhân 5 để đếm nhóm vạch).

**Ngưỡng thành thạo:** nhóm N4, dưới 15 giây cho kiểm đếm 10 đến 20 vật. Tối thiểu 15 câu.

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| Đếm trùng hoặc bỏ sót khi vật di chuyển | 12 vật đếm 11 hoặc 13 | Lệch 1 đến 2 | `dem-lech` |
| Đọc nhóm vạch sai (nhóm 5 đếm 4 hoặc 6) | 2 nhóm và 3 vạch đọc 11 hoặc 15 | Lệch bội của nhóm | `nhom-vach` |
| Phân loại sai tiêu chí | Xếp theo màu khi đề bảo theo loại | Số liệu các cột không khớp | `sai-tieu-chi` |
| Tổng không khớp | 7 + 4 = 12 vật nhưng có 11 | Tổng lệch | `bo-canh` |

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | Kéo 11 quả vào giỏ táo hoặc giỏ cam, rồi trả lời mỗi giỏ mấy quả | 7 và 4 | kéo rồi nhập |
| Dễ | Đọc bảng kiểm đếm có 2 nhóm 5 vạch và 3 vạch | 13 | nhập (nhiễu 11, 15, 8) |
| Trung bình | Đàn cá bơi qua: đếm cá đỏ, cá xanh | theo màn | nhập hai ô |
| Trung bình | Vẽ vạch kiểm đếm cho số 9 | 5 + 4 vạch | hình |
| Khó | Ván vừa chơi: bé đúng 8, sai 2, gợi ý 1. Điền vào bảng | 8, 2, 1 | nhập ba ô |
| Khó | Bảng ghi 7 táo, 4 cam, 5 chuối. Tổng có mấy quả | 16 | nhập |

**Ưu tiên:** P2. Cơ chế "ghi lại kết quả các màn thành bảng của bé" trong bản đồ vừa dạy thống kê vừa là báo cáo phụ huynh (M8); làm khi có nhật ký ván (M12).

### C3.2 Bảng số liệu: đọc, mô tả, nhận xét

**Yêu cầu cần đạt**

- Đọc bảng có tiêu đề hàng, cột: bảng "số học sinh các lớp 3A, 3B, 3C" có 32, 30, 35 học sinh; trả lời "lớp 3B có bao nhiêu học sinh".
- Tìm nhiều nhất, ít nhất; so sánh hai ô: 3C nhiều hơn 3B 5 học sinh.
- Tính tổng hoặc hiệu từ bảng: cả ba lớp 97 học sinh.
- Nhận xét một câu đúng từ bảng: "lớp 3C đông nhất".
- Điền số còn thiếu vào bảng khi biết tổng.

**Kiến thức tiên quyết:** C3.1, 3.4 (so sánh), 3.7.

**Ngưỡng thành thạo:** nhóm N4, dưới 15 giây. Tối thiểu 15 câu trên ít nhất 5 bảng khác nhau.

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| Đọc nhầm hàng hoặc cột | Hỏi 3B trả lời 32 (số của 3A) | Giá trị ô kề bên | `doc-nham-cot` |
| Nhiều nhất trả lời tên cột cuối hoặc số lớn nhất thay tên | Hỏi lớp nào đông nhất trả lời "35" | Trả lời số thay vì tên, hoặc tên sai | `nham-ten-gia-tri` |
| Cộng cả số ở tiêu đề | Cộng "3" của 3A vào tổng | Tổng lệch | `sai-so-lieu` |
| "Nhiều hơn bao nhiêu" trả lời số lớn | 3C nhiều hơn 3B trả lời 35 | Giá trị thay hiệu | `nham-dau` |

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | Bảng 3A 32, 3B 30, 3C 35. Lớp 3B có bao nhiêu học sinh | 30 | chọn |
| Dễ | Lớp nào đông nhất | 3C | chọn |
| Trung bình | 3C nhiều hơn 3B bao nhiêu học sinh | 5 | nhập (nhiễu 35, 65) |
| Trung bình | Cả ba lớp có bao nhiêu học sinh | 97 | nhập |
| Trung bình | Bảng sao của bé: Ninja 9, Vệ Binh 12, Tháp 6. Game nào bé được nhiều sao nhất | Vệ Binh | chọn |
| Khó | Bảng thiếu ô 3B, tổng 97, 3A 32, 3C 35. Điền 3B | 30 | nhập |
| Khó | Chọn câu nhận xét đúng từ bảng (3 câu, 1 đúng) | câu đúng | chọn |

**Ưu tiên:** P2. Bản đồ gợi ý dùng hồ sơ điểm số của bé làm bảng: đây là cách rẻ nhất và có ý nghĩa nhất, nên ghép vào màn Kết quả thay vì game riêng.

### C3.3 Biểu đồ tranh và so sánh số liệu

**Yêu cầu cần đạt**

- Đọc biểu đồ tranh có chú thích "mỗi 🍎 chỉ 1 quả" và "mỗi 🍎 chỉ 5 quả": hàng có 4 biểu tượng, mỗi biểu tượng 5 quả, là 20 quả.
- Đọc nửa biểu tượng khi mỗi biểu tượng chỉ số chẵn (nửa 🍎 là 5 khi mỗi 🍎 là 10).
- So sánh: hàng nào nhiều hơn, nhiều hơn bao nhiêu; tổng các hàng.
- Vẽ biểu đồ tranh từ bảng số liệu: 15 quả với mỗi biểu tượng 5 quả thì vẽ 3 biểu tượng.

**Kiến thức tiên quyết:** C2.2 (biểu đồ tranh), 3.12, 3.13, C3.2.

**Ngưỡng thành thạo:** nhóm N4, dưới 15 giây. Tối thiểu 15 câu, ít nhất 8 câu có biểu tượng đại diện nhiều đơn vị.

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| Đếm biểu tượng, quên nhân giá trị | 4 biểu tượng (mỗi cái 5) trả lời 4 | Số biểu tượng thay vì số lượng | `quen-gia-tri-bieu-tuong` |
| Nửa biểu tượng tính nguyên | 3 biểu tượng rưỡi (mỗi cái 10) trả lời 40 | Làm tròn lên | `nua-o` |
| So sánh nhầm hàng | Hỏi hàng táo trả lời số hàng cam | Giá trị hàng kề | `doc-nham-cot` |
| "Nhiều hơn bao nhiêu" đếm chênh biểu tượng, quên nhân | Chênh 2 biểu tượng (mỗi cái 5) trả lời 2 | Hiệu số biểu tượng | `quen-gia-tri-bieu-tuong` |
| Vẽ sai số biểu tượng | 15 quả vẽ 15 biểu tượng khi mỗi cái 5 | Số biểu tượng bằng số lượng | `quen-gia-tri-bieu-tuong` |

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | Biểu đồ mỗi 🍎 chỉ 1 quả, hàng có 6 🍎 | 6 | nhập |
| Dễ | Hàng nào có nhiều biểu tượng nhất | theo hình | chọn |
| Trung bình | Mỗi 🍎 chỉ 5 quả, hàng có 4 🍎. Có bao nhiêu quả | 20 | nhập (nhiễu 4, 9) |
| Trung bình | Hàng táo 4 🍎, hàng cam 2 🍊, mỗi biểu tượng 5 quả. Táo nhiều hơn cam bao nhiêu quả | 10 | nhập (nhiễu 2, 20) |
| Trung bình | Kéo biểu tượng lên biểu đồ để thể hiện 15 quả (mỗi biểu tượng 5) | 3 | kéo |
| Khó | Mỗi biểu tượng 10, hàng có 3 biểu tượng rưỡi | 35 | nhập (nhiễu 40, 30, 4) |
| Khó | Biểu đồ số sao bé đạt mỗi tuần (mỗi ⭐ chỉ 2 sao): tuần nào tăng nhiều nhất | theo dữ liệu | chọn |

**Ưu tiên:** P2. Dựng biểu đồ ngay từ số liệu bé vừa kiếm được là cách dạy tốt nhất và cũng là một phần báo cáo M8 (tiến bộ 4 tuần); làm sau khi có `history[]`.

### C3.4 Khả năng xảy ra của một sự kiện

**Yêu cầu cần đạt**

- Dùng đúng ba từ: "chắc chắn" (hộp toàn bóng đỏ, lấy được bóng đỏ), "không thể" (hộp toàn bóng đỏ, lấy được bóng xanh), "có thể" (hộp có 3 đỏ 1 xanh, lấy được bóng xanh).
- Nhận xét sau nhiều lần thử: lấy 10 lần từ hộp 3 đỏ 1 xanh thì đỏ xuất hiện nhiều hơn xanh, nhưng lần nào cũng có thể ra xanh.
- Đặt ví dụ đời sống: "ngày mai mặt trời mọc ở hướng đông" là chắc chắn; "tung xúc xắc được 7 chấm" là không thể.
- Không đòi hỏi tính xác suất bằng số.

**Kiến thức tiên quyết:** C2.3 (chắc chắn, có thể, không thể).

**Ngưỡng thành thạo:** nhóm N4, dưới 8 giây. Tối thiểu 15 câu, ba loại ngang nhau.

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Đáp án sai nhận biết | Mã lỗi |
|---|---|---|---|
| "Có thể" cho mọi trường hợp | Hộp toàn đỏ vẫn chọn "có thể" ra đỏ | Chọn "có thể" khi chỉ có một loại | `co-the-moi-thu` |
| "Không thể" vì ít | Hộp 9 đỏ 1 xanh chọn "không thể" ra xanh | Chọn "không thể" khi vẫn có | `it-la-khong-the` |
| "Chắc chắn" vì nhiều | Hộp 9 đỏ 1 xanh chọn "chắc chắn" ra đỏ | Chọn "chắc chắn" khi còn loại khác | `nhieu-la-chac-chan` |
| Dựa vào lần thử trước | Vừa ra xanh nên lần sau "chắc chắn" ra đỏ | Đổi câu trả lời sau mỗi lần thử | `dua-vao-lan-truoc` |

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | Hộp có 5 bóng đỏ. Lấy một bóng, được bóng đỏ là | chắc chắn | chọn ba từ |
| Dễ | Cùng hộp, được bóng xanh là | không thể | chọn |
| Trung bình | Hộp 3 đỏ 1 xanh. Được bóng xanh là | có thể | chọn |
| Trung bình | Hộp 9 đỏ 1 xanh. Được bóng đỏ là | có thể | chọn (nhiễu chắc chắn) |
| Trung bình | Bốc thử 10 lần từ hộp 3 đỏ 1 xanh, game ghi kết quả. Màu nào ra nhiều hơn | đỏ (thường) | quan sát rồi chọn |
| Khó | Tung xúc xắc được 7 chấm là | không thể | chọn |
| Khó | Vòng quay có 4 ô: 3 ô sao, 1 ô tim. Quay được tim là | có thể | chọn |

**Ưu tiên:** P2. Cơ chế vòng quay may mắn trước mỗi màn trong bản đồ gần như miễn phí; giá trị đo thấp nhưng vui.

## 9. Mạch D: Hoạt động thực hành và trải nghiệm

### D3.1 Đo đạc quanh nhà, tính chu vi diện tích đồ vật, lập thời gian biểu

**Yêu cầu cần đạt**

- Đo bằng thước thật chiều dài, chiều rộng mặt bàn, quyển sách, cửa sổ; ghi số đo có đơn vị; tính chu vi, diện tích (với vật nhỏ, đơn vị cm và cm²).
- Cân, đong đồ vật trong bếp: túi gạo, chai nước; đọc cân, đọc vạch chai.
- Lập thời gian biểu một ngày: giờ dậy, giờ học, giờ chơi, giờ ngủ; tính mỗi việc kéo dài bao lâu.
- Đọc lịch tháng ở nhà, đánh dấu sinh nhật người thân, tính còn bao nhiêu ngày.
- Kể lại với người lớn kết quả đo bằng câu đầy đủ.

**Kiến thức tiên quyết:** B3.8, B3.10, B3.11, B3.12, B3.13, B3.16, B3.18.

**Ngưỡng thành thạo:** không chấm bằng game. Phiếu in đạt khi bé điền đủ 5 số đo có đơn vị, 1 chu vi, 1 diện tích, 1 thời gian biểu có ít nhất 5 mốc; phụ huynh ký xác nhận.

**Lỗi thường gặp và cách nhận biết**

| Lỗi | Ví dụ | Cách phụ huynh nhận biết | Mã lỗi |
|---|---|---|---|
| Đo từ vạch 1 thay vì vạch 0 | Sách dài 24 cm ghi 25 cm | Đặt lại thước cùng bé | `dem-lech` |
| Ghi số đo không đơn vị | "24" | Ô đơn vị trống | `sai-don-vi` |
| Tính diện tích với hai đơn vị khác nhau | Dài 1 m rộng 40 cm nhân thẳng | Kết quả vô lý (40) | `khong-doi-don-vi` |
| Thời gian biểu có mốc chồng nhau | Học 19:00 đến 20:00 và chơi 19:30 đến 20:30 | Hai việc cùng lúc | `qua-60-phut` (dùng chung) |

**Ví dụ bài và dạng câu hỏi**

| Mức | Bài | Đáp án | Dạng |
|---|---|---|---|
| Dễ | Đo chiều dài quyển vở Toán bằng cm | khoảng 24 cm (tùy vở) | phiếu in |
| Dễ | Chai nước ở nhà ghi bao nhiêu ml | theo chai | phiếu in |
| Trung bình | Đo mặt bàn học rồi tính chu vi | theo bàn | phiếu in |
| Trung bình | Đo tờ giấy A4 rồi tính diện tích (21 cm × 30 cm, làm tròn) | 630 cm² | phiếu in |
| Khó | Lập thời gian biểu tối nay từ 18 giờ đến 21 giờ, tính giờ học kéo dài bao lâu | theo bé | phiếu in |
| Khó | Quét mã QR trên phiếu để vào màn game chu vi hình chữ nhật với số đo bé vừa đo | game nhận số đo | phiếu và game |

**Ưu tiên:** P2. Theo mục 6 của `01-muc-tieu-va-ky-vong.md`, mạch Thực hành làm bằng phiếu in, không làm game. Phiếu kèm mã QR về game B3.8, B3.10, B3.18 để dữ liệu thực hành cũng vào nhật ký.

## 10. Ánh xạ màn chơi hiện có sang mã nội dung lớp 3

Bảng này phục vụ M12 (3): game ghi `byTopic` theo màn, báo cáo gộp theo mã. Một màn có thể trỏ tới nhiều mã; khi đó ghi mã theo từng câu (dựa vào cỡ số của câu), không chia đều.

| Game | Màn | Mã nội dung | Ghi chú |
|---|---|---|---|
| Ninja Toán Học | a5 Phạm vi 1000 | 3.7 | Câu số tròn trăm, tròn chục ghi thêm 2.13 |
| Ninja Toán Học | m2 Nhân 3 và 4, m3 Bảng cửu chương | 3.12 | Câu bảng 2, 5 lẫn vào ghi 2.20 |
| Ninja Toán Học | d2 Chia cho 3 và 4, d3 Bảng chia | 3.13 | Câu bảng 2, 5 ghi 2.22 |
| Ninja Toán Học | m4 Nhân số lớn | 3.14 (hai chữ số, tròn chục), 3.15 (ba chữ số) | Theo `genMulBig` |
| Ninja Toán Học | d4 Chia số lớn | 3.16 (hai chữ số, tròn chục), 3.17 (ba chữ số) | Theo `genDivBig`; chưa có chia có dư |
| Ninja Toán Học | p6 Nhân bằng…, p7 Chia bằng… | 3.19 (bổ trợ) | Không tính vào "Đã thuộc" của 3.19 |
| Ninja Toán Học | Siêu Ninja | theo từng câu | `genMix` trộn nhiều mã |
| Vệ Binh Cửu Chương | Bảng 3, 4, 6, 7, 8, 9 (t3 đến t9) | 3.12 (nhân), 3.13 (chia) | Theo `kind` của câu |
| Vệ Binh Cửu Chương | Bảng 3, 4, 6 · Bảng 7, 8, 9 · Cả bảng cửu chương (c2, c3, c4) | 3.12, 3.13 | Theo `kind` |
| Vệ Binh Cửu Chương | Tìm thừa số | 3.19 | Đúng dạng SGK |
| Vệ Binh Cửu Chương | Nhân chia số lớn | 3.14, 3.15, 3.16, 3.17 | Theo cỡ số của `bigQ` |
| Tháp Đồng Hồ | Màn 4 Đếm 5 phút, 5 Giờ kém, 6 Từng phút, 7 Một ngày 24 giờ | B3.17 | Màn 1 đến 3 ghi B2.11 |
| Xe Tăng Thời Gian | Các màn 5 phút, giờ kém, từng phút và điện tử (màn 7) | B3.17 | Màn 4 Ngày và giờ ghi B2.12 |
| Xe Tăng Thời Gian | Màn 8 Thời gian trôi qua | B3.18 | Chưa có dạng tìm giờ bắt đầu |
| Cưỡi Hổ Vượt Lửa | Các màn từng phút, điện tử | B3.17 | |
| Cưỡi Hổ Vượt Lửa | Màn 8 Tính thời gian | B3.18 | Có đổi đơn vị giờ, ngày, tuần, năm |
| Mê Cung Đồng Hồ | Màn giờ kém, từng phút (nếu có) | B3.17 | Kiểm tra lại `LEVELS` khi làm ánh xạ |

## 11. Phụ lục: danh mục mã lỗi

Mã lỗi ghi vào nhật ký ván (M12) và dùng để gộp câu chuyện cho phụ huynh. Một mã dùng chung cho nhiều nội dung khi bản chất lỗi giống nhau, để báo cáo nói được "con quên nhớ ở cả cộng lẫn nhân". Cột "Lời cho phụ huynh" là câu game và báo cáo dùng, đã có sẵn ở Ninja cho vài mã.

| Mã lỗi | Bản chất | Nội dung dùng | Lời cho phụ huynh |
|---|---|---|---|
| `quen-nho` | Không cộng phần nhớ sang hàng bên trái | 3.7, 3.8, 3.9, 3.14, 3.15 | Con quên nhớ 1 |
| `quen-muon` | Không bớt 1 ở hàng đã cho mượn | 3.7, 3.8, 3.9 | Con quên mượn 1 |
| `tru-nguoc` | Từng hàng lấy số lớn trừ số bé | 3.7, 3.8, 3.9 | Con trừ ngược, lấy số dưới trừ số trên |
| `nham-dau` | Làm phép tính khác dấu đề cho | 3.7 đến 3.11, 3.21, 3.24, B3.15, C3.2 | Con nhìn nhầm dấu |
| `lech-hang` | Đặt tính không thẳng hàng đơn vị | 3.7, 3.8, 3.9 | Con đặt tính lệch hàng |
| `bo-cot`, `bo-hang` | Bỏ sót một cột hoặc một hàng khi tính | 3.9, 3.14 | Con bỏ sót một hàng |
| `dem-so-0` | Sai số chữ số 0 (sai bậc 10) | 3.2, 3.3, 3.8, 3.10, 3.13, 3.14, 3.15, 3.16, B3.11, B3.12, B3.13, B3.15 | Con đếm nhầm số 0 |
| `viet-theo-loi` | Viết số theo từng tiếng đọc | 3.1, 3.2, 3.3 | Con viết số theo cách đọc |
| `mat-so-0`, `doc-tung-chu-so` | Bỏ chữ số 0 ở giữa, đọc phần nghìn từng chữ số | 3.1 đến 3.4 | Con bỏ sót chữ số 0 |
| `sai-hang` | Đặt chữ số sai hàng khi ghép cấu tạo hoặc nhẩm | 3.1, 3.2, 3.3, 3.10, B3.15 | Con nhầm hàng |
| `qua-moc-tron`, `dao-chu-so` | Sai khi đếm qua mốc tròn, đảo chữ số | 3.1, 3.2 | Con lúng túng khi qua số tròn |
| `so-chu-so-dau`, `so-hang-thap`, `nguoc-chieu`, `nguoc-dau` | So sánh sai quy tắc, ngược chiều sắp xếp hoặc ngược dấu | 3.4, 3.20, 3.21, 3.24, 3.25, B3.14, B3.18 | Con so sánh chưa đúng quy tắc |
| `nham-hang-quyet-dinh`, `lam-tron-day-chuyen`, `chi-cat-bo`, `moc-5-xuong`, `giu-hang-phai` | Lỗi làm tròn | 3.5 | Con làm tròn chưa đúng quy tắc |
| `la-ma-cong-thay-bot`, `la-ma-lap`, `la-ma-dao`, `la-ma-nham-ky-hieu` | Lỗi chữ số La Mã | 3.6 | Con chưa nắm quy tắc số La Mã |
| `cong-thay-tru`, `tru-thay-cong`, `nham-quy-tac-so-tru` | Chọn sai phép khi tìm thành phần cộng trừ | 3.11 | Con nhầm quy tắc tìm số trừ (hoặc số bị trừ, số hạng) |
| `nhan-thay-chia`, `chia-thay-nhan`, `nham-quy-tac-so-chia` | Chọn sai phép khi tìm thành phần nhân chia hoặc một phần mấy | 3.10, 3.19, 3.22 | Con nhầm quy tắc tìm số chia (hoặc thừa số, số bị chia) |
| `o-ben-canh` | Nhầm ô bên cạnh trong bảng nhân, bảng chia | 3.12, 3.13 | Con nhầm sang ô bên cạnh trong bảng |
| `nham-bang` | Lẫn tích hoặc thương của cặp khác | 3.10, 3.12 đến 3.17 | Con lẫn với dòng khác trong bảng |
| `cong-thay-nhan` | Cộng hai thừa số | 3.12, B3.10 | Con cộng thay vì nhân |
| `tru-thay-chia` | Trừ thay vì chia | 3.13, 3.16, 3.18, 3.21, 3.22 | Con trừ thay vì chia |
| `nhan-0-1`, `chia-0-1` | Sai với 0 và 1 | 3.12, 3.13 | Con chưa nhớ nhân chia với 0 và 1 |
| `dao-thanh-phan` | Trả lời bằng số có sẵn trong đề, đảo vai số | 3.13, 3.19, 3.22 | Con lấy luôn số trong đề |
| `nho-truoc-nhan`, `viet-ca-tich-rieng`, `nho-sai`, `bo-so-0-giua` | Lỗi nhân có nhớ | 3.14, 3.15 | Con xử lý phần nhớ khi nhân chưa đúng |
| `chia-tung-chu-so`, `quen-ha`, `bo-so-0-thuong` | Lỗi chia theo cột | 3.16, 3.17 | Con chia từng chữ số rời, quên hạ hoặc quên số 0 ở thương |
| `so-du-lon`, `thuong-vuot`, `dao-thuong-du`, `quen-so-du`, `khong-chia-duoc` | Lỗi chia có dư | 3.17, 3.18 | Số dư của con lớn hơn số chia (hoặc con quên số dư) |
| `quen-them-1`, `them-1-thua` | Hiểu sai ý nghĩa số dư trong bài toán | 3.18 | Con chưa hiểu phần dư cần thêm một chuyến hay bỏ đi |
| `cong-thay-gap`, `tru-thay-giam`, `nhan-thay-giam`, `chia-thay-gap`, `gap-cong-them` | Nhầm gấp, giảm với nhiều hơn, ít hơn | 3.20, 3.24 | Con nhầm "gấp 3 lần" với "nhiều hơn 3" |
| `nham-lan-voi-phan`, `khong-xet-deu`, `doc-nguoc-phan-so` | Lỗi một phần mấy | 3.21, 3.22 | Con nhầm "gấp 3 lần" với "một phần ba" |
| `trai-sang-phai`, `bo-ngoac`, `sai-thu-tu-cung-bac`, `bo-phep-tinh` | Lỗi thứ tự thực hiện phép tính | 3.23, B3.8 | Con tính từ trái sang phải mà quên nhân chia trước (hoặc quên dấu ngoặc) |
| `mot-buoc`, `sai-so-lieu`, `sai-don-vi`, `nham-dang-rut-ve-don-vi` | Lỗi giải toán có lời văn | 3.24, 3.25, B3.19, D3.1 | Con mới làm được bước một |
| `o-giua-la-trung-diem`, `khong-thang-hang`, `chia-doi-sai`, `dem-lech` | Lỗi điểm, trung điểm, đếm vạch | B3.1, B3.5, B3.7, B3.9, B3.16, B3.17, C3.1 | Con đếm lệch một vạch (hoặc chưa phân biệt ở giữa với trung điểm) |
| `goc-xoay`, `goc-tu-la-vuong`, `e-ke-lech`, `nham-dinh-canh`, `hinh-khong-chuan`, `bo-qua-goc-vuong`, `dao-dai-rong`, `khong-nhan-truong-hop-rieng`, `dem-thieu`, `doc-ten-cheo` | Lỗi nhận dạng hình phẳng | B3.2, B3.3, B3.4, B3.5 | Con chưa nhận ra hình khi bị xoay (hoặc chưa kiểm tra góc vuông) |
| `khong-qua-tam`, `ban-kinh-bang-duong-kinh`, `mo-compa-sai` | Lỗi hình tròn | B3.5 | Con nhầm bán kính với đường kính |
| `dem-phan-thay`, `phang-voi-khoi`, `khoi-gan-giong` | Lỗi khối | B3.6 | Con chỉ đếm mặt nhìn thấy |
| `bo-canh`, `khong-doi-don-vi`, `nham-chu-vi-dien-tich`, `quen-nhan-2`, `nham-quy-tac-nguoc`, `quen-nua-chu-vi`, `nua-o`, `dai-la-lon` | Lỗi chu vi, diện tích | B3.7 đến B3.10, B3.12, B3.15, B3.19, C3.1 | Con nhầm chu vi với diện tích (hoặc quên nhân 2, quên đổi đơn vị) |
| `doi-nguoc`, `ghep-don-vi-lien`, `don-vi-khong-hop-ly`, `doc-vach-sai`, `nham-moc` | Lỗi đơn vị đo | B3.11 đến B3.14, B3.16 | Con đổi đơn vị chưa đúng (hoặc đọc vạch lệch) |
| `nham-menh-gia`, `tra-thieu` | Lỗi tiền | B3.15 | Con nhầm mệnh giá tờ tiền |
| `thang-2`, `xen-ke-sai`, `tuan-7-ngay`, `doc-nham-cot` | Lỗi lịch, bảng | B3.16, C3.2, C3.3 | Con chưa nhớ số ngày các tháng (hoặc đọc nhầm cột) |
| `phut-bang-so`, `gio-cong-1`, `gio-kem-nguoc`, `nham-kim`, `24-gio-sai` | Lỗi xem đồng hồ | B3.17 | Con đọc số kim dài chỉ làm số phút (hoặc nhầm giờ kém) |
| `gio-100-phut`, `dem-moc`, `bo-gio`, `qua-60-phut` | Lỗi khoảng thời gian | B3.18, D3.1 | Con trừ giờ như trừ số, tưởng 1 giờ có 100 phút |
| `nhom-vach`, `sai-tieu-chi`, `nham-ten-gia-tri`, `quen-gia-tri-bieu-tuong` | Lỗi thống kê | C3.1, C3.2, C3.3 | Con quên mỗi hình trong biểu đồ chỉ 5 (hoặc đếm nhóm vạch sai) |
| `co-the-moi-thu`, `it-la-khong-the`, `nhieu-la-chac-chan`, `dua-vao-lan-truoc` | Lỗi khả năng xảy ra | C3.4 | Con nhầm "ít" với "không thể" |
| `khac` | Sai không trùng mẫu nào | mọi nội dung | (không nêu tên lỗi) |

Quy tắc chọn mã khi một đáp án sai khớp nhiều mẫu (ví dụ 7 × 6 = 35 vừa là `o-ben-canh` vừa có thể là `nham-bang`): ưu tiên mã đứng trước trong bảng "Lỗi thường gặp" của nội dung đó; nếu thời gian trả lời trên 8 giây ở câu bảng nhân thì thêm cờ `cham` để báo cáo tách "chưa thuộc" với "nhầm khi vội".

## 12. Câu hỏi mở và rủi ro

| Câu hỏi | Ai trả lời | Hạn |
|---|---|---|
| Ba bộ SGK đặt bảng nhân 8, 9 và biểu thức số lệch nhau vài tuần; thứ tự mở khóa trong game theo bộ nào, hay hỏi phụ huynh "bé học sách nào" một lần | 3hoa, hỏi 5 phụ huynh | 2026-10-31 |
| Trần thời gian N1 đến N5 chưa đo trên bé thật; cần 5 bé chơi thử mỗi nhóm để chỉnh | 3hoa quan sát trực tiếp | 2026-11-15 |
| Chia có dư cần bàn phím hai ô (thương và dư); Vệ Binh hiện một ô. Làm ô thứ hai hay hỏi tách hai câu | Người thiết kế game | Trước khi làm 3.18 |
| Có nên hỏi "hình vuông có phải hình chữ nhật không" ở lớp 3 (ghi chú B3.4) | Giáo viên rà SGK | 2026-11-30 |
| Mã lỗi hình học và thống kê chưa được kiểm chứng bằng dữ liệu thật; có thể gộp bớt sau 3 tháng | 3hoa, sau khi có nhật ký ván | 2027-03-10 |
| Tiền 200 000 và 500 000 đồng: SGK lớp 3 có dạy tính hay chỉ nhận biết, kiểm tra lại cả ba bộ | Giáo viên rà SGK | 2026-11-30 |

## 13. Kế hoạch kiểm chứng

- Mỗi màn mới sinh 10 000 câu bằng kiểm thử `node tests/run.js`: không có đáp án nhiễu trùng đáp án đúng, không có số dư lớn hơn hoặc bằng số chia, không có phép chia cho 0, biểu thức có ngoặc luôn cho giá trị khác biểu thức bỏ ngoặc trong cặp đối chứng (M10).
- Mỗi mã lỗi có ít nhất một kiểm thử: cho đáp án sai mẫu, hàm nhận diện phải trả đúng mã.
- Mọi ví dụ trong tài liệu này đã tính lại bằng tay; khi đưa vào game, thêm vào bộ kiểm thử làm câu cố định.
- Bảng kiểm SGK bằng văn bản (M10 mốc 3T) dùng mục "Yêu cầu cần đạt" của từng nội dung làm danh mục rà.
- Chuyển sang "Đã duyệt" khi: giáo viên trong hội đồng `02-nhan-vat-ao.md` rà xong mạch A và B3.17, B3.18; 5 bé chơi thử xác nhận trần thời gian; các câu hỏi mở đến hạn 2026-11-30 đã có câu trả lời.

## Lịch sử thay đổi

| Ngày | Thay đổi | Bởi |
|---|---|---|
| 2026-09-10 | Bản đầu: 49 nội dung lớp 3 theo bản đồ, ngưỡng N1 đến N5, danh mục mã lỗi, ánh xạ màn hiện có | 3hoa |
