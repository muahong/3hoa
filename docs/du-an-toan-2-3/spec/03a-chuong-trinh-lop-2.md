# Spec chương trình học lớp 2

> Tình trạng: Bản nháp | Ngày: 2026-09-10 | Chủ sở hữu: 3hoa | Liên quan: `docs/du-an-toan-2-3/ban-do-toan-2-3.md`, `docs/du-an-toan-2-3/01-muc-tieu-va-ky-vong.md`, `docs/du-an-toan-2-3/02-nhan-vat-ao.md`, `docs/du-an-toan-2-3/spec/03b-chuong-trinh-lop-3.md` (sẽ viết), `docs/du-an-toan-2-3/spec/06-theo-doi-hoc-tap.md` (sẽ viết), `docs/du-an-toan-2-3/templates/mau-spec.md`

| | |
|---|---|
| Mục tiêu phục vụ | M1, M3, M10, M12 (xem `01-muc-tieu-va-ky-vong.md`) |
| Phạm vi | 26 nội dung mạch Số và phép tính lớp 2 (mã 2.1 đến 2.26 trong bản đồ). Mạch Hình học và Đo lường (B2.x), Thống kê và Xác suất (C2.x), Thực hành (D2.1) sẽ có spec riêng |
| Người đọc | Người thiết kế màn chơi, người viết lời mách, người viết bộ sinh đề và kiểm thử, giáo viên rà nội dung |

## 1. Tài liệu này dùng để làm gì

Bản đồ `ban-do-toan-2-3.md` liệt kê 26 nội dung Số và phép tính lớp 2 nhưng chỉ ghi tên và trạng thái game. Người thiết kế màn chơi cần nhiều hơn thế: bé phải làm được gì thì gọi là đạt, cần biết gì trước, đúng bao nhiêu câu trong bao lâu thì game được phép gắn nhãn "Đã thuộc", bé hay sai kiểu gì và game nhận ra kiểu sai đó bằng cách nào. Tài liệu này trả lời các câu hỏi đó cho từng mã, giữ nguyên mã số của bản đồ để spec game, bảng ánh xạ màn (M12) và báo cáo phụ huynh (M8) trỏ về cùng một chỗ.

Cách dùng:

- Khi mở spec cho một màn chơi mới, chép mục tương ứng ở phần 5 vào mục "Yêu cầu" của spec đó, rồi chỉ viết thêm cơ chế chơi. Không viết lại yêu cầu cần đạt theo cách khác.
- Bộ sinh đề của game lấy danh sách lỗi ở từng mục để sinh đáp án nhiễu và ghi mã lỗi (mục 3.3) vào nhật ký ván.
- Ngưỡng thành thạo ở từng mục là ngưỡng để game gắn nhãn; định nghĩa gộp "Đã thuộc" và "Chưa thuộc" cho báo cáo vẫn theo mục 3 của `01-muc-tieu-va-ky-vong.md`.
- Nội dung nào ghi "Cần giáo viên rà" là điểm người viết chưa chắc về cách trình bày trong ba bộ SGK hiện hành; không phát hành màn đó trước khi rà (M10).

## 2. Tổng quan mạch kiến thức lớp 2

### 2.1 Bốn nhóm nội dung

Lớp 2 theo Chương trình GDPT 2018 (Thông tư 32/2018) mở rộng phạm vi số từ 100 lên 1000 và, quan trọng nhất, là năm đầu tiên bé gặp phép nhân và phép chia. 26 nội dung Số và phép tính chia thành bốn nhóm, mỗi nhóm có một "xương sống" mà mọi nội dung khác bám vào:

| Nhóm | Mã | Xương sống | Bé phải mang gì từ lớp 1 |
|---|---|---|---|
| Số và cấu tạo số | 2.1 đến 2.7 | Giá trị theo hàng: 1 trăm = 10 chục, 1 chục = 10 đơn vị. Số 205 là 2 trăm, 0 chục, 5 đơn vị | Đếm, đọc, viết số đến 100; chục và đơn vị |
| Cộng trừ | 2.8 đến 2.18 | Bảng cộng qua 10 và bảng trừ qua 10 (8 + 7, 15 − 9). Không thuộc hai bảng này thì mọi phép có nhớ trong 100 và 1000 đều thành đếm ngón tay | Bạn của 10 (3 + 7, 6 + 4); cộng trừ không nhớ trong 20 và trong 100 |
| Nhân chia | 2.19 đến 2.26 | Hiểu 2 × 4 là "2 được lấy 4 lần" trước khi thuộc bảng; hiểu 8 : 2 là "chia 8 thành 2 phần bằng nhau" trước khi thuộc bảng chia | Đếm thêm 2, thêm 5 (2, 4, 6, 8; 5, 10, 15) |
| Ngôn ngữ toán | 2.14, 2.23 | Gọi đúng tên số hạng, tổng, số bị trừ, số trừ, hiệu, thừa số, tích, số bị chia, số chia, thương. Bé cần tên gọi để hiểu lời mách "lấy tích chia cho thừa số kia" | Chưa có |

### 2.2 Bước ngoặt của lớp 2: từ cộng lặp sang nhân, từ chia đều sang chia

Đây là chỗ người thiết kế game dễ làm sai nhất, vì người lớn đã quên mình từng không hiểu phép nhân. SGK lớp 2 dạy phép nhân theo ba bước, và game phải giữ đúng ba bước này thay vì nhảy thẳng vào bảng:

1. **Tổng các số hạng bằng nhau.** Bé nhìn 4 đĩa, mỗi đĩa 2 quả cam, viết 2 + 2 + 2 + 2 = 8. Bé phải tự nhận ra "các số hạng đều bằng nhau" và phân biệt với 2 + 2 + 3 (không bằng nhau, không thành phép nhân được).
2. **Chuyển sang phép nhân.** 2 + 2 + 2 + 2 = 8 viết thành 2 × 4 = 8, đọc là "hai nhân bốn bằng tám". Thứ tự có nghĩa: số được lấy đứng trước, số lần lấy đứng sau. "2 được lấy 4 lần" là 2 × 4, không phải 4 × 2. Lớp 2 giữ nghiêm thứ tự này (Vệ Binh Cửu Chương đã làm đúng: bảng 2 và 5 không đảo thừa số); tính giao hoán để lớp 3.
3. **Bảng nhân 2, bảng nhân 5** dựng từ phép cộng lặp: 2 × 1 = 2, 2 × 2 = 2 + 2 = 4, 2 × 3 = 2 + 2 + 2 = 6, và nhận xét mỗi dòng hơn dòng trên 2 đơn vị. Bé thuộc bảng bằng đếm thêm 2 rồi mới thuộc bằng phản xạ.

Phép chia cũng đi ba bước tương tự:

1. **Chia đều.** 6 cái bánh chia đều cho 2 bạn, mỗi bạn 3 cái. Viết 6 : 2 = 3, đọc "sáu chia hai bằng ba".
2. **Chia theo nhóm.** 6 cái bánh, mỗi bạn 2 cái, chia được cho 3 bạn. Cũng viết 6 : 2 = 3. Hai tình huống khác nhau cho cùng một phép tính; SGK dạy cả hai vì bài toán có lời văn (2.26) dùng cả hai.
3. **Bảng chia từ bảng nhân.** Từ 2 × 3 = 6 suy ra 6 : 2 = 3 và 6 : 3 = 2. Bé không học thuộc bảng chia như một bảng mới mà "nghĩ ngược" bảng nhân: 14 : 2 = ? là "2 nhân mấy bằng 14".

Hệ quả cho game: một màn "bảng nhân 2" mà bé chưa qua bước 1 và 2 sẽ dạy bé thuộc lòng dãy số, và phụ huynh sẽ thấy con đọc vanh vách 2 × 7 = 14 nhưng không giải được "mỗi hộp 2 bút, 7 hộp có mấy bút". Vì thế 2.19 và 2.21 (ý nghĩa) được xếp P0 dù chưa có game, ngang với 2.20 và 2.22 (bảng) đã có game.

Ký hiệu theo SGK: dấu nhân là ×, dấu chia là dấu hai chấm (14 : 2), không dùng ÷. Đọc "14 chia 2" (không đọc "chia cho"). Dấu trừ đọc là "trừ", phép 15 − 9 đọc "mười lăm trừ chín".

### 2.3 Thứ tự dạy trong năm học

Ba bộ SGK hiện hành (Kết nối tri thức, Chân trời sáng tạo, Cánh diều) xếp chương khác nhau đôi chút, nhưng mạch chung như sau. Game nên mở màn theo thứ tự này để bé chơi đúng thứ đang học ở lớp; phụ huynh cũng dùng thứ tự này để đọc báo cáo "con đang ở đâu".

| Giai đoạn | Tuần (ước lượng) | Nội dung Số và phép tính | Nội dung mạch khác học xen | Ghi chú cho game |
|---|---|---|---|---|
| Học kỳ 1, đầu | 1 đến 4 | 2.1 ôn số đến 100, 2.2 so sánh, 2.5 liền trước liền sau, 2.14 số hạng tổng, số bị trừ số trừ hiệu, 2.17 nhiều hơn ít hơn | Đề-xi-mét (B2.6), điểm và đoạn thẳng (B2.1) | Ôn lớp 1, phù hợp cho bé lớp 2 mới vào năm và bé lớp 3 yếu |
| Học kỳ 1, giữa | 5 đến 10 | 2.8 bảng cộng qua 10, 2.9 bảng trừ qua 10, 2.15 tìm số hạng, số bị trừ, số trừ (một số sách đặt sau 2.11), 2.18 bài toán một phép tính | Ki-lô-gam (B2.9), lít (B2.10) | Cao điểm luyện phản xạ. Ninja a3 phục vụ đúng giai đoạn này |
| Học kỳ 1, cuối | 11 đến 18 | 2.10 cộng trừ không nhớ trong 100, 2.11 có nhớ trong 100, 2.13 nhẩm tròn chục, 2.16 biểu thức hai dấu | Đường gấp khúc, ba điểm thẳng hàng, hình tứ giác (B2.1 đến B2.3), ngày giờ, ngày tháng (B2.11 đến B2.13) | Ninja a4. Ôn tập học kỳ 1 quanh tuần 17 đến 18 |
| Học kỳ 2, đầu | 19 đến 26 | 2.19 ý nghĩa phép nhân, 2.20 bảng nhân 2 và 5, 2.23 thừa số tích, 2.21 ý nghĩa phép chia, 2.22 bảng chia 2 và 5, 2.23 số bị chia số chia thương, 2.24 quan hệ nhân chia, 2.25 một phần hai một phần năm, 2.26 bài toán nhân chia | Khối trụ, khối cầu (B2.4), xếp hình (B2.5) | Bước ngoặt của năm. Ninja m1 d1 và Vệ Binh bảng 2, 5 |
| Học kỳ 2, giữa | 27 đến 31 | 2.3 đơn vị chục trăm nghìn, 2.4 đọc viết đến 1000, 2.6 so sánh đến 1000, 2.7 ước lượng, 2.5 liền trước liền sau trong 1000 | Mét, ki-lô-mét (B2.6, B2.7), tiền Việt Nam (B2.14) | Chưa có game nào. Nền cho 3.1 đến 3.3 ở lớp 3 |
| Học kỳ 2, cuối | 32 đến 35 | 2.12 cộng trừ trong 1000 (không nhớ và có nhớ không quá một lượt), 2.13 nhẩm tròn trăm | Biểu đồ tranh (C2.1, C2.2), chắc chắn có thể không thể (C2.3), ôn tập cuối năm | Ninja a5 sinh câu có hai lượt nhớ (456 + 287), vượt yêu cầu lớp 2; cần chế độ giới hạn một lượt nhớ |

Hai điểm thứ tự cần giữ khi mở khóa màn:

- 2.8 và 2.9 trước 2.11: bé chưa thuộc 6 + 7 thì không đặt tính 36 + 27 được.
- 2.19 trước 2.20, 2.21 trước 2.22, và 2.20 trước 2.22 (bảng chia rút từ bảng nhân).

## 3. Quy ước dùng trong tài liệu

### 3.1 Mã kiến thức tiên quyết từ lớp 1

Bản đồ không có mã cho lớp 1. Tài liệu này dùng tạm các mã sau (chỉ để ghi tiên quyết; không đưa vào bản đồ và không có game riêng, trừ hai màn Ninja a1, a2 vốn giữ nguyên theo mục 6 của `01-muc-tieu-va-ky-vong.md`):

| Mã | Nội dung lớp 1 (GDPT 2018) | Game hiện có |
|---|---|---|
| L1.1 | Đếm, đọc, viết số đến 10; so sánh trong 10 | Không |
| L1.2 | Cộng trừ trong phạm vi 10; các cặp số có tổng bằng 10 ("bạn của 10": 3 + 7, 6 + 4) | Ninja a1, màn ghép đôi p1 |
| L1.3 | Số đến 100: đọc, viết, chục và đơn vị, tia số | Không |
| L1.4 | Cộng trừ không nhớ trong phạm vi 20 (12 + 5, 17 − 4) | Ninja a2, p2 |
| L1.5 | Cộng trừ không nhớ trong phạm vi 100 dạng số tròn chục và số có hai chữ số với số có một chữ số (30 + 20, 34 + 5) | Không |
| L1.6 | So sánh, xếp thứ tự số đến 100 | Không |
| L1.7 | Xem giờ đúng | Bốn game đồng hồ, màn 1 |

### 3.2 Khung ngưỡng thành thạo

Mỗi nội dung thuộc một trong bốn kiểu, và ngưỡng đề xuất lấy theo kiểu đó rồi chỉnh riêng nếu cần (ghi trong từng mục). Thời gian tính từ lúc câu hỏi hiện đủ trên màn hình đến lúc bé chốt đáp án; thời gian đọc lời mách không tính. Mọi con số "đúng" chỉ đếm câu **không dùng gợi ý** (mã `h` tách khỏi `c` theo M12).

| Kiểu | Ví dụ | Chính xác | Thời gian trung vị hợp lý (7 đến 9 tuổi) | Cờ "đang đoán" | Số lần lặp tối thiểu trước khi gắn nhãn |
|---|---|---|---|---|---|
| K1 Phản xạ (bảng) | 8 + 7, 15 − 9, 2 × 7, 35 : 5 | 9/10 trong mỗi phiên, ở 2 phiên cách nhau ít nhất 1 ngày | Chọn đáp án: dưới 4 giây. Nhập số: dưới 6 giây | Trung vị dưới 1 giây, hoặc tỉ lệ đúng gần 1/số đáp án | 40 câu, phủ ít nhất 80% các dòng của bảng (không được chỉ luyện 2 × 2 và 2 × 5) |
| K2 Thủ tục (đặt tính, nhẩm nhiều bước) | 36 + 27, 62 − 38, 452 − 138, 12 + 5 − 3 | 9/10 trong 2 phiên cách nhau ít nhất 1 ngày | Hai chữ số: chọn đáp án dưới 10 giây, nhập số dưới 20 giây. Ba chữ số: dưới 15 giây và 30 giây. Biểu thức hai dấu: dưới 20 giây | Trung vị dưới 2 giây ở phép có nhớ | 30 câu, trong đó ít nhất 15 câu có nhớ hoặc mượn |
| K3 Khái niệm (ý nghĩa, tên gọi, cấu tạo số, so sánh) | 2 + 2 + 2 = 2 × 3, "hai trăm linh năm" là 205, 305 và 350 số nào lớn hơn | 8/10 trong 2 phiên | Dưới 8 giây cho chọn đáp án; dưới 15 giây cho kéo thả hay xếp | Trung vị dưới 1,5 giây | 20 câu, phủ mọi biến thể liệt kê trong mục |
| K4 Vận dụng (bài toán có lời văn) | "Mỗi hộp 5 bút, 4 hộp có mấy bút?" | 4/5 trong 2 phiên, tính riêng bước chọn phép tính và bước tính | Dưới 40 giây cả bài; bước chọn phép tính dưới 20 giây | Không gắn cờ đoán (đề dài, đọc chậm là bình thường) | 15 bài, cân bằng các phép tính; không được đoán phép tính theo màn (màn "nhân" toàn bài nhân) |

Cách kết hợp với định nghĩa gộp ở `01-muc-tieu-va-ky-vong.md`: nhãn "Đã thuộc" cho một mã nội dung được gắn khi (a) đủ 20 câu không gợi ý trong 14 ngày với ít nhất 90% đúng, (b) kho ôn lại của mã đó trống, và (c) đạt điều kiện số phiên và độ phủ của kiểu tương ứng ở bảng trên. Điều kiện thời gian không dùng để từ chối nhãn mà để phụ huynh thấy "đúng nhưng còn chậm" (báo cáo ghi "con làm đúng 36 + 27 nhưng mất trung bình 25 giây, đang đếm ngón tay").

### 3.3 Mã lỗi để game ghi vào nhật ký

Nhật ký ván (M12) có trường "mã lỗi". Dưới đây là bộ mã dùng chung cho lớp 2; từng mục ở phần 5 ghi rõ cách nhận ra lỗi từ đáp án sai của bé (so đáp án bé chọn với một công thức), và bộ sinh đề dùng chính công thức đó để tạo đáp án nhiễu. Ninja hiện đã nhận ra 6 lỗi đầu trong `math-ninja/js/math.js` (hàm `misconception`), nhưng chỉ hiện lời nhắc lúc chơi, chưa lưu.

| Mã | Tên gọi (như game nói với bé) | Công thức nhận biết (v là đáp án bé chọn, đ là đáp án đúng) | Nội dung liên quan |
|---|---|---|---|
| `quen-nho` | "Con quên nhớ 1 rồi!" | Phép cộng có nhớ, v = đ − 10 (hoặc đ − 100 khi nhớ ở hàng chục) | 2.8, 2.11, 2.12 |
| `quen-muon` | "Con quên mượn 1 rồi!" (một số sách nói "quên trả 1") | Phép trừ có mượn, v = đ + 10 (hoặc đ + 100) | 2.9, 2.11, 2.12 |
| `tru-nguoc` | "Con trừ ngược số bé cho số lớn rồi!" | Phép trừ có mượn ở hàng đơn vị, v có chữ số đơn vị bằng (đơn vị số trừ − đơn vị số bị trừ) và hàng chục không giảm: 62 − 38 cho 36; 15 − 9 cho 14 | 2.9, 2.11, 2.12 |
| `nham-dau` | "Đây là phép trừ nhé!" hoặc "Đây là phép cộng nhé!" | v bằng kết quả của phép ngược dấu: 62 − 38 cho 100; 36 + 27 cho 9 | 2.8 đến 2.12, 2.16 |
| `o-ben-canh` | "Nhầm sang ô bên cạnh trong bảng nhân rồi!" | Nhân: v = a × (b ± 1) hoặc (a ± 1) × b. Chia: v = đ ± 1 | 2.20, 2.22 |
| `cong-thay-nhan` | "Đây là phép nhân chứ không phải phép cộng nhé!" | v = a + b khi phép là a × b | 2.19, 2.20 |
| `tru-thay-chia` | "Đây là phép chia chứ không phải phép trừ nhé!" | v = a − b khi phép là a : b | 2.21, 2.22 |
| `nhan-thay-chia` | "Đây là phép chia, kết quả phải bé hơn số bị chia" | v = a × b khi phép là a : b | 2.21, 2.22, 2.26 |
| `nham-bang` | "Đây là bảng 2, không phải bảng 5" | v = 5 × b khi phép là 2 × b (và ngược lại); v = a : 2 khi phép là a : 5 | 2.20, 2.22 |
| `dem-lech` | "Con đếm thiếu (hoặc thừa) 1 rồi!" | v = đ ± 1 ở phép cộng trừ qua 10, hoặc ở phép nhân với v = đ ± a (đếm thêm thừa hoặc thiếu một lần) | 2.8, 2.9, 2.20 |
| `bu-sai-chieu` | "Trừ đi 10 là trừ thừa, phải thêm lại chứ không bớt tiếp" | Bé làm a − 10 rồi bớt tiếp (10 − b) thay vì thêm: 15 − 9 thành 15 − 10 − 1 = 4; công thức v = đ − 2 × (10 − b) | 2.9, 2.11 |
| `sai-hang` | "Con đặt tính lệch hàng rồi!" | Số có một chữ số bị cộng vào hàng chục: 34 + 5 cho 84; 45 − 3 cho 15 | 2.10, 2.11 |
| `viet-ca-so-nho` | "Con viết cả 13 xuống, không nhớ 1 sang hàng chục!" | v = ghép chữ số hàng chục với tổng hàng đơn vị chưa nhớ: 36 + 27 cho 513 | 2.11, 2.12 |
| `thieu-0` hoặc `thua-0` | "Thiếu (thừa) một chữ số 0 rồi!" | v = đ : 10 hoặc v = đ × 10 | 2.13, 2.3, 2.4 |
| `doc-so` | "Số này đọc là ..." | Chọn số có cùng các chữ số nhưng khác thứ tự hoặc thiếu chữ số 0 ở giữa: nghe "hai trăm linh năm" chọn 25 hoặc 250 | 2.3, 2.4 |
| `so-chu-so` | "Số nào có nhiều chữ số hơn thì lớn hơn!" hoặc "So hàng chục trước, hàng đơn vị sau" | So sánh sai vì nhìn chữ số đầu hoặc nhìn hàng đơn vị trước: chọn 99 > 100, chọn 29 > 31, chọn 305 > 350 | 2.2, 2.6 |
| `chieu-dau` | "Dấu mở miệng về phía số lớn hơn" | Bé chỉ đúng số lớn hơn nhưng điền dấu ngược (45 > 54), hoặc xếp đúng dãy nhưng ngược chiều yêu cầu | 2.2, 2.6 |
| `nham-truoc-sau` | "Số liền sau hơn 1, số liền trước kém 1" | Hỏi liền trước mà v = đ + 2 (bé nói liền sau), hỏi liền sau mà v = đ − 2 | 2.5 |
| `qua-chuc` | "Qua 9 là sang chục mới, qua 99 là sang trăm mới" | Liền sau 99 nói 90 hay 910; liền trước 300 nói 290 hay 209; đếm ngược 30 rồi 20 | 2.1, 2.5 |
| `dem-nhom` | "Con đếm lại số nhóm (hoặc số quả trong mỗi nhóm) nhé" | Ở bài ý nghĩa nhân chia, v = a × (số nhóm ± 1) hoặc số nhóm sai khi kéo thả | 2.19, 2.21, 2.26 |
| `phan-khong-bang-nhau` | "Một phần hai là chia thành hai phần bằng nhau" | Chọn hình chia hai phần không bằng nhau, hoặc tô 1/2 khi hỏi 1/5 | 2.25 |
| `ten-thanh-phan` | "Số đứng trước dấu trừ là số bị trừ, số đứng sau là số trừ" | Nhãn tên đặt đảo nhau (số bị trừ và số trừ, số bị chia và số chia), hoặc gọi kết quả phép trừ là "tổng", kết quả phép chia là "tích" | 2.14, 2.23 |
| `bo-buoc` | "Bài này có hai bước, con mới làm bước một" | Biểu thức hai dấu mà v bằng kết quả phép tính đầu; bài toán có lời văn mà bé chọn đúng phép nhưng không tính | 2.16, 2.18, 2.26 |
| `dao-thu-tu` | "Số được lấy viết trước, số lần lấy viết sau" | Viết 4 × 2 cho 2 + 2 + 2 + 2; viết 2 : 14 cho phép chia | 2.19, 2.21, 2.26 |
| `sai-phep` | "Bài này phải làm phép ... " | Trong bài toán có lời văn, chọn sai phép tính (cộng khi phải trừ, nhân khi phải chia) | 2.17, 2.18, 2.26 |
| `nguoc-thanh-phan` | "Muốn tìm số bị trừ, con lấy hiệu cộng số trừ" | Tìm thành phần chưa biết: ? − 7 = 8 cho 1 (lấy 8 − 7); 15 − ? = 9 cho 24 (lấy 15 + 9) | 2.15 |
| `trai-sang-phai` | "Có hai dấu thì tính lần lượt từ trái sang phải" | 20 − 8 + 6 cho 6 (tính 8 + 6 trước) | 2.16 |
| `khac` | (không nhận ra) | Không khớp công thức nào | Mọi mã |

Quy tắc sinh đáp án nhiễu: mỗi câu có ít nhất một đáp án nhiễu là lỗi có tên (trọng số cao) và một đáp án lệch nhỏ (đ ± 1, đ ± 2, đ ± 10); các đáp án nhiễu không được trùng nhau, không trùng đáp án đúng, không âm, không vượt phạm vi số của nội dung (M10). Khi hai công thức cho cùng một số (ví dụ 15 − 9: `tru-nguoc` cho 14 và `quen-muon` cho 16, nhưng ở 13 − 7 thì `tru-nguoc` cho 14 và đ + 10 cũng là 16), game ghi cả hai mã, báo cáo chỉ đếm khi một mã lặp từ 3 lần.

### 3.4 Dạng câu hỏi phù hợp game

| Dạng | Viết tắt | Phù hợp | Không phù hợp |
|---|---|---|---|
| Chọn đáp án (3 đến 4 quả, thiên thạch, cửa) | CĐA | K1, K3; mọi câu có đáp án là một số hoặc một tên gọi | Phép có nhớ ở bé đang đoán (xem điều kiện đổi hướng (c) ở `01`) |
| Nhập số (bàn phím số) | NS | K2; mọi câu cần bé tự ra số, chống đoán | Bé lớp 2 đầu năm gõ chậm; cần nút xóa to |
| Ghép đôi (chém hai quả) | GĐ | Bạn của 10, bạn của 100, cặp nhân chia, phép tính với tên thành phần | Câu có nhiều hơn hai vế |
| Sắp xếp (kéo thẻ vào thứ tự) | SX | 2.2, 2.6, 2.5 | Quá 5 thẻ trên điện thoại |
| Kéo thả (nhãn, thẻ trăm chục đơn vị, quả vào đĩa) | KT | 2.3, 2.14, 2.19, 2.21, 2.23, 2.25 | Màn tính giờ |
| Thao tác trên hình (tô, cắt, xếp hàng) | TH | 2.19, 2.21, 2.25, 2.7 | Bé cần kết quả nhanh |
| Đọc và chọn (giọng đọc số, bé chọn thẻ) | ĐC | 2.4, 2.1 | Máy không có giọng Việt (phải có phụ đề chữ) |
| Hai bước (chọn phép tính rồi mới tính) | 2B | K4: 2.17, 2.18, 2.26 | Ván tính giờ ngắn 1 phút |

## 4. Bảng tóm tắt 26 nội dung

Trạng thái game lấy từ bản đồ ngày 2026-09-10. Cột "Kiểu" theo mục 3.2.

| Mã | Tên | Kiểu | Tiên quyết | Ưu tiên | Trạng thái game | Màn hiện có |
|---|---|---|---|---|---|---|
| 2.1 | Ôn tập các số đến 100: đọc, viết, đếm, chục và đơn vị, tia số | K3 | L1.3 | P2 | Chưa có | |
| 2.2 | So sánh, xếp thứ tự các số đến 100 | K3 | 2.1, L1.6 | P2 | Chưa có | |
| 2.3 | Đơn vị, chục, trăm, nghìn và cấu tạo số đến 1000 | K3 | 2.1 | P1 | Chưa có | |
| 2.4 | Đọc, viết các số đến 1000 | K3 | 2.3 | P1 | Chưa có | |
| 2.5 | Số liền trước, số liền sau | K1 | 2.1, 2.4 | P1 | Chưa có | |
| 2.6 | So sánh, xếp thứ tự các số đến 1000 | K3 | 2.3, 2.4, 2.2 | P1 | Chưa có | |
| 2.7 | Ước lượng số đồ vật theo nhóm chục | K3 | 2.1, 2.13 | P2 | Chưa có | |
| 2.8 | Bảng cộng qua 10 (có nhớ) trong phạm vi 20 | K1 | L1.2, L1.4 | P0 | Đã có | Ninja a3, p2 |
| 2.9 | Bảng trừ qua 10 (có nhớ) trong phạm vi 20 | K1 | 2.8, L1.2 | P0 | Đã có | Ninja a3, p3 |
| 2.10 | Cộng, trừ không nhớ trong phạm vi 100 | K2 | L1.5, 2.1 | P1 | Đã có | Ninja a4 (lẫn với 2.11) |
| 2.11 | Cộng, trừ có nhớ trong phạm vi 100 | K2 | 2.8, 2.9, 2.10 | P0 | Đã có | Ninja a4 |
| 2.12 | Cộng, trừ trong phạm vi 1000 | K2 | 2.11, 2.3 | P1 | Đã có (vượt mức) | Ninja a5 (lớp 3) |
| 2.13 | Tính nhẩm với số tròn chục, tròn trăm | K1 | L1.2, 2.3 | P0 | Một phần | Ninja a4, a5, p4 |
| 2.14 | Gọi tên số hạng, tổng, số bị trừ, số trừ, hiệu | K3 | L1.2 | P2 | Chưa có | |
| 2.15 | Tìm thành phần chưa biết của phép cộng, phép trừ | K2 | 2.14, 2.8, 2.9 | P0 | Một phần | Ninja p1, p2, p3 |
| 2.16 | Tính giá trị biểu thức có hai dấu cộng, trừ | K2 | 2.10, 2.11 | P1 | Chưa có | |
| 2.17 | Nhiều hơn, ít hơn một số đơn vị | K4 | L1.4, 2.10 | P2 | Chưa có | |
| 2.18 | Giải bài toán có lời văn bằng một phép tính | K4 | 2.17, 2.11 | P1 | Chưa có | |
| 2.19 | Ý nghĩa phép nhân: tổng các số hạng bằng nhau | K3 | L1.4, 2.10 | P0 | Chưa có | |
| 2.20 | Bảng nhân 2, bảng nhân 5 | K1 | 2.19 | P0 | Đã có | Ninja m1, Vệ Binh bảng 2, 5 |
| 2.21 | Ý nghĩa phép chia: chia đều, chia theo nhóm | K3 | 2.19, 2.20 | P0 | Chưa có | |
| 2.22 | Bảng chia 2, bảng chia 5 | K1 | 2.20, 2.21 | P0 | Đã có | Ninja d1, Vệ Binh bảng 2, 5 |
| 2.23 | Gọi tên thừa số, tích, số bị chia, số chia, thương | K3 | 2.20, 2.22, 2.14 | P2 | Chưa có | |
| 2.24 | Quan hệ giữa phép nhân và phép chia | K3 | 2.20, 2.22, 2.23 | P0 | Một phần | Ninja p6, p7 (bảng đến 9, lớp 3) |
| 2.25 | Một phần hai, một phần năm | K3 | 2.21, 2.22 | P2 | Chưa có | |
| 2.26 | Giải bài toán bằng một phép nhân hoặc một phép chia | K4 | 2.19, 2.21, 2.20, 2.22, 2.18 | P1 | Chưa có | |

Đếm theo ưu tiên: P0 có 10 (2.8, 2.9, 2.11, 2.13, 2.15, 2.19, 2.20, 2.21, 2.22, 2.24), P1 có 9 (2.3, 2.4, 2.5, 2.6, 2.10, 2.12, 2.16, 2.18, 2.26), P2 có 7 (2.1, 2.2, 2.7, 2.14, 2.17, 2.23, 2.25). Thứ tự làm hợp với M3: 3T nâng 2.15 và 2.24 từ "một phần"; 6T thêm 2.13, 2.19, 2.21; 12T thêm 2.18, 2.26.

## 5. Chi tiết từng nội dung

Mỗi mục dùng cùng bố cục: Yêu cầu cần đạt (hành vi quan sát được), Tiên quyết, Ngưỡng thành thạo, Lỗi thường gặp (kèm cách nhận biết và mã), Ví dụ bài (mức Dễ, Trung bình, Khó; cột "Nhiễu" là đáp án sai nên đưa vào để bắt lỗi có tên), Dạng câu hỏi, Ưu tiên và lý do. Ký hiệu "?" là ô trống trong SGK lớp 2 (SGK 2018 lớp 2 dùng ô trống hoặc dấu hỏi, chưa dùng chữ x).

### 2.1 Ôn tập các số đến 100: đọc, viết, đếm, chục và đơn vị, tia số

**Yêu cầu cần đạt**

- Đếm xuôi và đếm ngược trong phạm vi 100 không vấp khi qua chục (38, 39, 40, 41; 51, 50, 49).
- Đếm thêm 2, thêm 5, thêm 10 từ một mốc bất kỳ (2, 4, 6, 8; 35, 40, 45; 10, 20, 30). Đây là nền của bảng nhân 2 và 5.
- Đọc đúng các số có cách đọc riêng: 15 "mười lăm", 21 "hai mươi mốt", 24 "hai mươi tư" (chấp nhận "hai mươi bốn"), 55 "năm mươi lăm", 11 "mười một".
- Nói được 47 gồm 4 chục và 7 đơn vị, viết 47 = 40 + 7; ngược lại, nghe "3 chục 8 đơn vị" viết 38; "5 chục 0 đơn vị" viết 50.
- Chỉ đúng vị trí một số trên tia số chia vạch 10 (65 nằm giữa 60 và 70, gần 70 hơn) và điền số còn thiếu trên tia số chia vạch 1.

**Tiên quyết:** L1.1, L1.3.

**Ngưỡng thành thạo:** kiểu K3. Cấu tạo số 9/10, đọc số 8/10, tia số 8/10; trung vị dưới 8 giây; 20 câu phủ đủ năm nhóm yêu cầu trên; 2 phiên cách nhau ít nhất 1 ngày.

**Lỗi thường gặp**

| Lỗi | Ví dụ | Nhận biết qua đáp án sai | Mã |
|---|---|---|---|
| Đảo chục và đơn vị | "4 chục 7 đơn vị" viết 74 | v là số đảo hai chữ số của đ | `doc-so` |
| Viết theo cách đọc | "hai mươi mốt" viết 201 | v có 3 chữ số, bắt đầu bằng số tròn chục của đ | `doc-so` |
| Nhầm "mười lăm" với "năm mươi" | nghe 15 chọn 50 | v = 50 khi đ = 15 và ngược lại; tương tự 13 và 30, 14 và 40 | `doc-so` |
| Đếm ngược tụt cả chục | 30, 29 rồi nói 20 | v = đ − 9 khi đếm ngược qua chục | `qua-chuc` |
| Đếm thêm lệch một | 2, 4, 6, 7 | v = đ ± 1 trong dãy đếm thêm | `dem-lech` |
| Coi mỗi vạch tia số là 1 khi vạch là 10 | chỉ 65 vào giữa vạch 6 và 7 | vị trí chọn bằng đ : 10 | `thieu-0` |

**Ví dụ bài**

| Mức | Câu | Đáp án | Nhiễu | Dạng |
|---|---|---|---|---|
| Dễ | Số 36 gồm ? chục và ? đơn vị | 3 chục, 6 đơn vị | 6 chục 3 đơn vị | KT |
| Dễ | Đếm thêm 10: 10, 20, 30, ?, 50 | 40 | 35, 31, 45 | CĐA |
| TB | Nghe "bảy mươi lăm", chọn thẻ | 75 | 57, 705, 70 | ĐC |
| TB | 5 chục và 0 đơn vị là số nào? | 50 | 5, 500, 05 | CĐA |
| TB | Trên tia số vạch 10, số 65 nằm giữa hai vạch nào? | 60 và 70 | 6 và 7, 50 và 60 | TH |
| Khó | Đếm ngược: 43, 42, 41, ?, 39 | 40 | 30, 44, 41 | CĐA |
| Khó | Đếm thêm 5 từ 35: 35, 40, ?, 50 | 45 | 44, 41, 55 | CĐA |
| Khó | Số có chữ số hàng chục là 9, hàng đơn vị là 0 | 90 | 9, 09, 99 | NS |

**Dạng câu hỏi:** KT (thả số vào cột chục hay đơn vị như gợi ý trong bản đồ), CĐA, ĐC, TH trên tia số.

**Ưu tiên: P2.** Nội dung ôn lớp 1, phần lớn bé lớp 2 đã đạt; giá trị chính là chẩn đoán đầu năm và cho bé còn yếu. Không làm game riêng; làm thành màn 1 của game cấu tạo số (2.3) và dùng đếm thêm 2, thêm 5 làm màn khởi động cho 2.20.

### 2.2 So sánh, xếp thứ tự các số đến 100

**Yêu cầu cần đạt**

- Điền đúng dấu >, <, = giữa hai số có hai chữ số và nói được lý do: "so hàng chục trước, hàng chục bằng nhau mới so hàng đơn vị" (48 > 41 vì cùng 4 chục, 8 > 1).
- Xếp 3 đến 4 số theo thứ tự từ bé đến lớn và từ lớn đến bé; chỉ ra số lớn nhất, bé nhất trong nhóm.
- Nêu số lớn nhất có hai chữ số (99), số bé nhất có hai chữ số (10), số bé nhất có một chữ số (0).
- Tìm số ở giữa hai số cho trước cách nhau 2 (47 < ? < 49).

**Tiên quyết:** 2.1, L1.6.

**Ngưỡng thành thạo:** kiểu K3. So sánh hai số 9/10 dưới 6 giây; xếp 4 số 8/10 dưới 15 giây; 20 câu, trong đó ít nhất 6 câu "bẫy hàng đơn vị" (29 và 31) và 3 câu có 100; 2 phiên.

**Lỗi thường gặp**

| Lỗi | Ví dụ | Nhận biết qua đáp án sai | Mã |
|---|---|---|---|
| Nhìn hàng đơn vị trước | 29 > 31 vì 9 > 1 | cặp có chục a < chục b nhưng đơn vị a > đơn vị b, bé chọn a | `so-chu-so` |
| Nhiều chữ số hơn nhưng bé chọn số kia | 99 > 100 | cặp khác số chữ số, bé chọn số ít chữ số hơn | `so-chu-so` |
| Nhầm chiều dấu | viết 45 > 54 dù biết 54 lớn hơn | bé chọn đúng số lớn hơn ở câu hỏi "số nào lớn hơn" nhưng điền dấu ngược | `chieu-dau` |
| Xếp ngược chiều yêu cầu | hỏi bé đến lớn, xếp lớn đến bé | dãy bé xếp là đảo ngược đúng của dãy đáp án | `chieu-dau` |
| Bỏ sót số khi xếp | xếp 62, 26, 66 đúng nhưng bỏ 60 | dãy thiếu phần tử | `khac` |

**Ví dụ bài**

| Mức | Câu | Đáp án | Nhiễu | Dạng |
|---|---|---|---|---|
| Dễ | 35 ? 53 | < | > | CĐA |
| Dễ | 70 ? 69 | > | <, = | CĐA |
| TB | 48 ? 41 | > | < | CĐA |
| TB | 29 ? 31 | < | > (bẫy 9 > 1) | CĐA |
| TB | Xếp 62, 26, 60, 66 từ bé đến lớn | 26, 60, 62, 66 | dãy ngược | SX |
| Khó | 100 ? 99 | > | < | CĐA |
| Khó | 47 < ? < 49 | 48 | 46, 50 | NS |
| Khó | Số lớn nhất có hai chữ số | 99 | 90, 100, 98 | CĐA |

**Dạng câu hỏi:** CĐA (chém quả mang số lớn hơn: chỉ hai quả, không bom), SX (xếp bậc thang), GĐ (ghép số với dấu).

**Ưu tiên: P2.** Đã học ở lớp 1, phụ huynh ít thấy con vướng; cơ chế "chém quả lớn hơn" rất rẻ nên nên gộp vào cùng màn với 2.6 (một màn, hai phạm vi số) thay vì làm riêng.

### 2.3 Đơn vị, chục, trăm, nghìn và cấu tạo số đến 1000

**Yêu cầu cần đạt**

- Nói và viết được: 10 đơn vị = 1 chục, 10 chục = 1 trăm (100), 10 trăm = 1 nghìn (1000).
- Đếm số tròn trăm (100, 200, ..., 900, 1000) và số tròn chục trong phạm vi 1000 (270, 280, 290, 300).
- Phân tích 345 gồm 3 trăm, 4 chục, 5 đơn vị và viết 345 = 300 + 40 + 5; làm ngược lại. Xử lý được số có chữ số 0: 205 = 200 + 5, 340 = 300 + 40.
- Dựng số bằng thẻ trăm, thẻ chục, thẻ đơn vị (mô hình khối lập phương của SGK) và đọc số từ mô hình.
- Nói giá trị của một chữ số theo hàng: trong 728, chữ số 2 ở hàng chục, giá trị 20.

**Tiên quyết:** 2.1, L1.3.

**Ngưỡng thành thạo:** kiểu K3. 9/10; chọn đáp án dưới 10 giây, kéo thả thẻ dưới 20 giây; 20 câu trong đó ít nhất 6 câu có chữ số 0 ở hàng chục hoặc hàng đơn vị; 2 phiên.

**Lỗi thường gặp**

| Lỗi | Ví dụ | Nhận biết qua đáp án sai | Mã |
|---|---|---|---|
| Bỏ hàng có chữ số 0 | "2 trăm 5 đơn vị" viết 25 | v là đ bỏ đi chữ số 0 | `doc-so` |
| Viết nối tiếp các phần | 300 + 40 + 5 viết 300405 | v có nhiều hơn 3 chữ số | `doc-so` |
| Giá trị chữ số bỏ hàng | chữ số 4 trong 345 "có giá trị 4" | v = đ : 10 hoặc đ : 100 | `thieu-0` |
| Nhầm chục với trăm | 10 chục = 1000 | v = đ × 10 | `thua-0` |
| Đếm thanh chục thành đơn vị | mô hình 2 thanh chục 3 khối lẻ đọc là 5 | v = số thẻ, không phải giá trị | `khac` (ghi chú "đếm thẻ") |
| Chưa gộp 10 chục thành 1 trăm | dùng 12 thẻ chục cho 124 | không sai về giá trị; game chấp nhận, nhắc gộp | không ghi lỗi |

**Ví dụ bài**

| Mức | Câu | Đáp án | Nhiễu | Dạng |
|---|---|---|---|---|
| Dễ | 10 chục = ? | 100 | 10, 1000, 20 | CĐA |
| Dễ | Số gồm 4 trăm, 2 chục, 7 đơn vị | 427 | 472, 4207, 247 | NS |
| TB | 560 = 500 + ? | 60 | 6, 600, 50 | CĐA |
| TB | Số gồm 7 trăm và 3 đơn vị | 703 | 73, 730, 7003 | NS |
| TB | Dựng số 245 bằng thẻ 100, 10, 1 | 2 trăm, 4 chục, 5 đơn vị | | KT |
| Khó | Chữ số 8 trong 382 có giá trị bao nhiêu? | 80 | 8, 800, 3 | CĐA |
| Khó | 9 trăm + 10 chục = ? | 1000 | 910, 9010, 190 | CĐA |
| Khó | Có 3 thẻ trăm, 12 thẻ chục, 4 thẻ đơn vị, đó là số nào? | 424 | 3124, 334, 412 | NS |

**Dạng câu hỏi:** KT (xây tháp thẻ trăm chục đơn vị như gợi ý bản đồ), CĐA, NS, TH (đếm mô hình).

**Ưu tiên: P1.** Nền cho 2.4, 2.6, 2.12 và cho 3.2, 3.3 ở lớp 3; chưa có game; dễ đo; phụ huynh thấy con sai ở số có chữ số 0 (703, 205) khá thường xuyên. Làm chung một game với 2.1, 2.4, 2.5, 2.6 (game "số đến 1000").

### 2.4 Đọc, viết các số đến 1000

**Yêu cầu cần đạt**

- Đọc số có ba chữ số đúng quy tắc tiếng Việt, gồm các trường hợp riêng: 205 "hai trăm linh năm" (chấp nhận "lẻ" theo phương ngữ miền Nam), 210 "hai trăm mười", 215 "hai trăm mười lăm", 221 "hai trăm hai mươi mốt", 224 "hai trăm hai mươi tư" (chấp nhận "bốn"), 225 "hai trăm hai mươi lăm", 300 "ba trăm", 1000 "một nghìn".
- Viết số khi nghe đọc hoặc khi đọc dòng chữ.
- Ghép được cột "Viết số" và cột "Đọc số" như bảng trong SGK.

**Tiên quyết:** 2.3, 2.1.

**Ngưỡng thành thạo:** kiểu K3. 9/10 dưới 8 giây; 20 câu phủ đủ sáu trường hợp riêng (linh, mười, mốt, tư, lăm, tròn trăm); 2 phiên.

**Lỗi thường gặp**

| Lỗi | Ví dụ | Nhận biết qua đáp án sai | Mã |
|---|---|---|---|
| Nghe "linh" mà bỏ chữ số 0 hoặc đặt sai chỗ | "hai trăm linh năm" viết 25 hoặc 250 | v là đ bỏ 0, hoặc đ với hai chữ số cuối đảo | `doc-so` |
| Viết theo từng từ nghe được | "ba trăm mười lăm" viết 3015 | v có 4 chữ số | `doc-so` |
| Đọc sai từ riêng | 315 đọc "ba trăm mười năm", 221 "hai trăm hai mươi một", 205 "hai trăm không năm" | ở câu chọn cách đọc, bé chọn phương án có "năm" thay "lăm", "một" thay "mốt", "không" thay "linh" | `doc-so` |
| Số tròn trăm thừa 0 | "năm trăm" viết 5000 | v = đ × 10 | `thua-0` |
| Nhầm "mười" với "một" | "bốn trăm mười" viết 401 | v khác đ ở hai chữ số cuối 10 và 01 | `doc-so` |

**Ví dụ bài**

| Mức | Câu | Đáp án | Nhiễu | Dạng |
|---|---|---|---|---|
| Dễ | Nghe "ba trăm", chọn thẻ | 300 | 30, 3000, 303 | ĐC |
| Dễ | 148 đọc là? | một trăm bốn mươi tám | một trăm bốn tám, một trăm bốn mươi lăm | CĐA |
| TB | Nghe "bốn trăm linh bảy" | 407 | 470, 47, 4007 | ĐC |
| TB | 615 đọc là? | sáu trăm mười lăm | sáu trăm mười năm, sáu trăm linh năm, sáu trăm năm mươi | CĐA |
| TB | Nghe "chín trăm chín mươi mốt" | 991 | 919, 990, 9901 | ĐC |
| Khó | 504 đọc là? | năm trăm linh bốn | năm trăm bốn, năm trăm bốn mươi, năm mươi tư | CĐA |
| Khó | Nghe "một nghìn" | 1000 | 100, 10000, 1001 | ĐC |
| Khó | Ghép ba thẻ chữ với ba thẻ số: 130, 103, 113 | | | GĐ |

**Dạng câu hỏi:** ĐC (giọng đọc nêu, bé bắn thẻ; máy không có giọng Việt thì hiện dòng chữ), CĐA cách đọc, GĐ. Game phải chấp nhận cả "linh" và "lẻ", "tư" và "bốn" khi hiện phương án đúng, nhưng dùng "linh" và "tư" làm mặc định (theo SGK).

**Ưu tiên: P1.** Cùng lý do với 2.3; giọng đọc sẵn có của các game (Web Speech) là lợi thế hiếm có cho nội dung này. Cần giáo viên rà: danh sách cách đọc chấp nhận được cho từng vùng.

### 2.5 Số liền trước, số liền sau

**Yêu cầu cần đạt**

- Nêu số liền trước (kém 1) và số liền sau (hơn 1) của một số bất kỳ đến 1000, kể cả qua chục và qua trăm: liền sau 99 là 100, liền trước 300 là 299, liền sau 999 là 1000.
- Điền số còn thiếu giữa hai số liền kề trên tia số (348, ?, 350).
- Nói được "hai số liền nhau hơn kém nhau 1 đơn vị".

**Tiên quyết:** 2.1, 2.4.

**Ngưỡng thành thạo:** kiểu K1. 9/10 dưới 4 giây, 2 phiên cách nhau ít nhất 1 ngày; 30 câu trong đó ít nhất 10 câu qua chục hoặc qua trăm.

**Lỗi thường gặp**

| Lỗi | Ví dụ | Nhận biết qua đáp án sai | Mã |
|---|---|---|---|
| Nhầm trước với sau | liền trước 45 nói 46 | hỏi liền trước mà v = đ + 2; hỏi liền sau mà v = đ − 2 | `nham-truoc-sau` |
| Qua chục sai | liền trước 70 nói 60; liền sau 99 nói 910 | câu có đổi hàng và v ≠ đ, không thuộc mã trên | `qua-chuc` |
| Qua trăm sai | liền trước 500 nói 490 hay 400 | như trên, ở hàng trăm | `qua-chuc` |
| Nhầm "liền" với "gần" | liền trước 45 nói 43 | v = đ ± 2 cùng phía | `dem-lech` |

**Ví dụ bài**

| Mức | Câu | Đáp án | Nhiễu | Dạng |
|---|---|---|---|---|
| Dễ | Số liền sau của 27 | 28 | 26, 29, 37 | CĐA |
| Dễ | Số liền trước của 63 | 62 | 64, 61, 53 | CĐA |
| TB | Số liền sau của 99 | 100 | 98, 90, 910 | CĐA |
| TB | Số liền trước của 70 | 69 | 60, 71, 79 | CĐA |
| TB | Điền: 348, ?, 350 | 349 | 347, 351, 340 | NS |
| Khó | Số liền trước của 500 | 499 | 490, 501, 400 | CĐA |
| Khó | Số liền sau của 999 | 1000 | 998, 9910, 100 | NS |
| Khó | Số ở giữa 199 và 201 | 200 | 190, 210, 100 | NS |

**Dạng câu hỏi:** CĐA trên tia số đang trôi (kiểu nhảy ô của Cưỡi Hổ, như gợi ý bản đồ), NS.

**Ưu tiên: P1.** Rẻ, đo rất rõ, là dạng bài xuất hiện trong mọi đề kiểm tra lớp 2; chưa có game; lỗi qua chục, qua trăm cho phụ huynh thấy con có hiểu hàng chưa.

### 2.6 So sánh, xếp thứ tự các số đến 1000

**Yêu cầu cần đạt**

- So sánh hai số đến 1000 và nói được quy tắc: số nào có nhiều chữ số hơn thì lớn hơn (100 > 99); cùng số chữ số thì so hàng trăm, rồi hàng chục, rồi hàng đơn vị (372 > 327 vì cùng 3 trăm, 7 chục > 2 chục).
- Xếp 3 đến 4 số có ba chữ số theo thứ tự; tìm số lớn nhất, bé nhất.
- Nêu số lớn nhất có ba chữ số (999), số bé nhất có ba chữ số (100).
- So sánh số với số tròn trăm, tròn chục gần đó (450 < 500, 450 > 400): nền cho làm tròn ở lớp 3 (3.5).

**Tiên quyết:** 2.3, 2.4, 2.2.

**Ngưỡng thành thạo:** kiểu K3. So sánh hai số 9/10 dưới 6 giây; xếp 4 số 8/10 dưới 15 giây; 20 câu, ít nhất 5 câu khác số chữ số (99 và 100, 1000 và 999) và 5 câu cùng hàng trăm, bẫy ở hàng đơn vị (305 và 350); 2 phiên.

**Lỗi thường gặp**

| Lỗi | Ví dụ | Nhận biết qua đáp án sai | Mã |
|---|---|---|---|
| Nhìn chữ số đầu, không đếm số chữ số | 99 > 100 | cặp khác số chữ số, chọn số ít chữ số hơn | `so-chu-so` |
| So hàng thấp trước | 305 > 350 vì 5 > 0 | cặp cùng hàng trăm, chục a < chục b, đơn vị a > đơn vị b, chọn a | `so-chu-so` |
| Nhầm chiều dấu | 245 > 543 | chọn đúng số lớn hơn nhưng điền dấu ngược | `chieu-dau` |
| Bỏ qua chữ số 0 | 500 = 50 | v coi 500 và 50 bằng nhau | `thieu-0` |

**Ví dụ bài**

| Mức | Câu | Đáp án | Nhiễu | Dạng |
|---|---|---|---|---|
| Dễ | 245 ? 543 | < | > | CĐA |
| Dễ | 600 ? 599 | > | < | CĐA |
| TB | 372 ? 327 | > | < | CĐA |
| TB | 99 ? 100 | < | > | CĐA |
| TB | 305 ? 350 | < | > | CĐA |
| Khó | Xếp 480, 408, 840, 804 từ lớn đến bé | 840, 804, 480, 408 | dãy ngược, 840, 480, 804, 408 | SX |
| Khó | 199 ? 201 | < | > | CĐA |
| Khó | Số bé nhất có ba chữ số | 100 | 101, 111, 999 | CĐA |

**Dạng câu hỏi:** CĐA, SX, bắn ba thiên thạch theo thứ tự (gợi ý bản đồ; sai thứ tự thì mất lượt, ghi `chieu-dau` nếu bé bắn ngược hoàn toàn).

**Ưu tiên: P1.** Cùng game với 2.3 đến 2.5; nền cho 3.4; lỗi `so-chu-so` là tín hiệu rõ cho phụ huynh rằng con chưa hiểu giá trị theo hàng.

### 2.7 Ước lượng số đồ vật theo nhóm chục

**Yêu cầu cần đạt**

- Nhìn một nhóm 20 đến 60 đồ vật (xếp thành hàng hoặc cụm có thể nhận ra nhóm 10) trong vài giây và nói "khoảng 30", rồi đếm để kiểm tra.
- Chọn ước lượng hợp lý trong ba mức cách nhau một chục hoặc hai chục.
- Giải thích cách làm: "mỗi hàng khoảng 10 quả, có 3 hàng nên khoảng 30".

**Tiên quyết:** 2.1 (đếm thêm 10), 2.13 (nhẩm số tròn chục).

**Ngưỡng thành thạo:** kiểu K3, có điều chỉnh: 8/10 chọn đúng mức (sai lệch một nhóm chục vẫn tính hợp lý nếu số thật cách mốc dưới 3); thời gian chọn dưới 5 giây (chọn quá 10 giây là bé đang đếm từng cái, ghi cờ "đếm thay vì ước lượng", không tính sai); 15 câu; 2 phiên. Game chỉ hiện số lượng cách mốc tròn chục không quá 3 (27 đến 33 cho mốc 30) để đáp án không gây tranh cãi.

**Lỗi thường gặp**

| Lỗi | Ví dụ | Nhận biết qua đáp án sai | Mã |
|---|---|---|---|
| Ước lượng theo cảm giác, không dùng nhóm | chọn "khoảng 50" cho 30 quả | v lệch từ 2 mốc chục trở lên | `khac` (ghi chú "không theo nhóm") |
| Đếm từng cái | mất 15 giây rồi chọn đúng | thời gian quá 10 giây | cờ "đếm", không phải lỗi |
| Coi "khoảng 30" phải đúng 30 | đếm được 32 rồi đổi sang "khoảng 40" | đổi đáp án sau khi đếm | `khac` |
| Đếm nhóm sai | 4 hàng 10 nói khoảng 30 | v = đ − 10 hoặc đ + 10 | `dem-nhom` |

**Ví dụ bài** (mô tả hình vì đề là tranh)

| Mức | Câu | Đáp án | Nhiễu | Dạng |
|---|---|---|---|---|
| Dễ | 3 hàng táo, mỗi hàng 10 quả, hiện 3 giây | khoảng 30 | khoảng 10, khoảng 50 | CĐA |
| Dễ | 2 khay trứng đầy (10 quả) và 1 khay còn 8 | khoảng 30 | khoảng 20, khoảng 40 | CĐA |
| TB | 42 con cá bơi thành 4 đàn 10 con và 2 con lẻ | khoảng 40 | khoảng 30, khoảng 50 | CĐA |
| TB | 19 viên bi rải rác, bé tự khoanh nhóm 10 | khoảng 20 | khoảng 10, khoảng 30 | TH |
| Khó | 58 bông hoa trong 6 luống, một luống thiếu 2 | khoảng 60 | khoảng 50, khoảng 70 | CĐA |
| Khó | Hai đàn: đàn cá đỏ khoảng 30, đàn cá xanh khoảng 20, đàn nào nhiều hơn? | cá đỏ | cá xanh | CĐA |

**Dạng câu hỏi:** TH (khoanh nhóm 10 bằng ngón tay), CĐA ba mức, hình hiện 3 giây rồi mờ.

**Ưu tiên: P2.** Nội dung mới của chương trình 2018, ít bài trong SGK, khó chấm tự động và ít giá trị báo cáo cho phụ huynh. Làm sau khi có game đếm và phân loại (C2.1) vì dùng chung cảnh "đồ vật rơi vào giỏ".

### 2.8 Bảng cộng qua 10 (có nhớ) trong phạm vi 20

Bảng gồm 36 phép: 9 + 2 đến 9 + 9, 8 + 3 đến 8 + 9, 7 + 4 đến 7 + 9, 6 + 5 đến 6 + 9, 5 + 6 đến 5 + 9, 4 + 7 đến 4 + 9, 3 + 8, 3 + 9, 2 + 9. SGK dạy lần lượt "9 cộng với một số", "8 cộng với một số", "7, 6 cộng với một số" rồi mới gộp thành bảng. Cách tính chuẩn là **tách số hạng sau để làm tròn 10**: 8 + 7 = 8 + 2 + 5 = 10 + 5 = 15 (lời giải thích của Ninja "8 + 2 = 10, thêm 5 nữa là 15" đúng cách này). Cách phụ được chấp nhận: đếm tiếp từ số lớn (từ 8 đếm thêm 7).

**Yêu cầu cần đạt**

- Nhẩm đúng mọi phép trong bảng và nói được cách tách: "9 + 5: lấy 1 của 5 cho 9 thành 10, còn 4, là 14".
- Biết 7 + 8 và 8 + 7 cùng bằng 15 (đổi chỗ hai số hạng thì tổng không đổi) để chỉ phải thuộc nửa bảng.
- Nhận ra phép nào qua 10 và phép nào không (9 + 5 qua 10; 9 + 1 không) để chọn cách làm.
- Dùng được bảng để nhẩm dạng 8 + 7 + 2 hoặc 5 + 9 trong bài toán có lời văn.

**Tiên quyết:** L1.2 (bạn của 10: phải thuộc 8 + 2, 9 + 1, 7 + 3 mới tách được), L1.4.

**Ngưỡng thành thạo:** kiểu K1. 9/10 mỗi phiên ở 2 phiên cách nhau ít nhất 1 ngày; trung vị dưới 4 giây (CĐA) hoặc 6 giây (NS); 40 câu phủ ít nhất 29 trong 36 phép. Báo cáo ghi thêm "đúng nhưng còn đếm" khi tỉ lệ đúng từ 90% mà trung vị trên 6 giây (bé đang đếm ngón tay, như nhân vật Bin ở `02-nhan-vat-ao.md`).

**Lỗi thường gặp**

| Lỗi | Ví dụ | Nhận biết qua đáp án sai | Mã |
|---|---|---|---|
| Đếm tiếp thiếu hoặc thừa 1 (đếm cả số xuất phát) | 8 + 7 = 14 hoặc 16 | v = đ ± 1 | `dem-lech` |
| Tách sai, làm tròn 10 rồi quên phần còn lại hoặc cộng nhầm | 9 + 5: 9 + 1 = 10, còn 5, là 15 | v = đ + 1 (tách mà không bớt phần đã lấy) | `dem-lech` |
| Chỉ ghi phần đơn vị, quên chục | 8 + 7 = 5 | v = đ − 10 | `quen-nho` |
| Nhầm dấu | 8 + 7 = 1 | v = a − b (lấy số lớn trừ số bé) | `nham-dau` |
| Dùng "gấp đôi" nhầm | 8 + 7 = 8 + 8 = 16, hoặc 7 + 7 = 14 | v = 2a hoặc 2b | `dem-lech` |

**Ví dụ bài**

| Mức | Câu | Đáp án | Nhiễu | Dạng |
|---|---|---|---|---|
| Dễ | 9 + 2 | 11 | 10, 12, 7 | CĐA |
| Dễ | 9 + 5 | 14 | 13, 15, 4 | CĐA |
| TB | 8 + 7 | 15 | 14, 16, 5 | CĐA |
| TB | 7 + 6 | 13 | 12, 14, 1 | CĐA |
| TB | 6 + 9 (số hạng bé đứng trước) | 15 | 14, 16, 3 | CĐA |
| Khó | 4 + 8 | 12 | 11, 13, 4 | NS |
| Khó | 7 + 9 | 16 | 15, 17, 2 | NS |
| Khó | Chém hai quả có tổng bằng 14 trong 9, 5, 8, 6, 3 | 9 và 5, 8 và 6 | 9 và 6 | GĐ |

**Dạng câu hỏi:** CĐA (Ninja a3), GĐ (Ninja p2 "Cộng trong 20"), NS.

**Ưu tiên: P0.** Nằm trong danh sách M1. Nền của toàn bộ phép cộng có nhớ (2.11, 2.12, 3.7, 3.8). Đã có game, việc còn lại là ghi `byTopic` tách theo dấu cộng và dấu trừ trong màn a3 (hiện a3 gộp cả hai), gắn mã lỗi và cờ "còn đếm" (M12).

### 2.9 Bảng trừ qua 10 (có nhớ) trong phạm vi 20

Bảng gồm 36 phép: 11 − 2 đến 11 − 9, 12 − 3 đến 12 − 9, 13 − 4 đến 13 − 9, 14 − 5 đến 14 − 9, 15 − 6 đến 15 − 9, 16 − 7 đến 16 − 9, 17 − 8, 17 − 9, 18 − 9. SGK dạy "11 trừ đi một số", "12 trừ đi một số", ... rồi gộp thành bảng. Hai cách tính chuẩn: **tách số trừ để về 10**: 15 − 9 = 15 − 5 − 4 = 10 − 4 = 6 (Ninja giải thích "15 − 5 = 10, bớt 4 nữa còn 6"); và **nghĩ ngược sang phép cộng**: 9 + mấy = 15. Cách phụ: tách số bị trừ 15 = 10 + 5, 10 − 9 = 1, 1 + 5 = 6.

**Yêu cầu cần đạt**

- Nhẩm đúng mọi phép trong bảng và nói được cách tách hoặc cách nghĩ ngược.
- Liên hệ với bảng cộng: vì 9 + 6 = 15 nên 15 − 9 = 6 và 15 − 6 = 9 (bộ ba số 9, 6, 15).
- Nhận ra phép nào qua 10 (13 − 7) và phép nào không (17 − 4, thuộc L1.4).

**Tiên quyết:** 2.8, L1.2.

**Ngưỡng thành thạo:** kiểu K1, giống 2.8: 9/10 ở 2 phiên, trung vị dưới 4 giây (CĐA) hoặc 6 giây (NS), 40 câu phủ ít nhất 29 trong 36 phép. Phép trừ thường chậm hơn phép cộng 1 đến 2 giây ở cùng bé; không so sánh hai bảng với nhau trong báo cáo.

**Lỗi thường gặp**

| Lỗi | Ví dụ | Nhận biết qua đáp án sai | Mã |
|---|---|---|---|
| Trừ ngược số bé cho số lớn ở hàng đơn vị, giữ nguyên chục | 15 − 9 = 14 (lấy 9 − 5 = 4, giữ 1) | v = 10 + (b − đơn vị của a) | `tru-nguoc` |
| Đếm lùi thiếu hoặc thừa 1 | 15 − 9 = 7 hoặc 5 | v = đ ± 1 | `dem-lech` |
| Trừ tròn 10 rồi bớt tiếp thay vì thêm lại | 15 − 9 = 15 − 10 − 1 = 4 | v = đ − 2 × (10 − b) | `bu-sai-chieu` |
| Nhầm dấu | 15 − 9 = 24 | v = a + b | `nham-dau` |
| Quên "trả" chục khi tách số bị trừ | 15 − 9: 10 − 9 = 1, quên cộng 5 | v = 10 − b | `quen-muon` |

**Ví dụ bài**

| Mức | Câu | Đáp án | Nhiễu | Dạng |
|---|---|---|---|---|
| Dễ | 11 − 2 | 9 | 8, 10, 13 | CĐA |
| Dễ | 12 − 3 | 9 | 11, 8, 15 | CĐA |
| TB | 15 − 9 | 6 | 14, 7, 5 | CĐA |
| TB | 13 − 7 | 6 | 14, 5, 7 | CĐA |
| TB | 12 − 5 | 7 | 13, 6, 8 | CĐA |
| Khó | 17 − 8 | 9 | 11, 8, 10 | NS |
| Khó | 16 − 9 | 7 | 13, 6, 8 | NS |
| Khó | Chém quả lớn trừ quả bé bằng 8 trong 17, 9, 15, 7, 12 | 17 và 9, 15 và 7 | 12 và 7 | GĐ |

**Dạng câu hỏi:** CĐA (Ninja a3), GĐ (Ninja p3 "Trừ trong 20"), NS.

**Ưu tiên: P0.** Nằm trong M1. Lỗi `tru-nguoc` ở đây là lỗi sẽ theo bé lên 62 − 38 và 703 − 458; bắt được sớm ở bảng trừ là giá trị lớn nhất cho phụ huynh. Cần làm như 2.8: tách thống kê a3 theo dấu, ghi mã lỗi.

### 2.10 Cộng, trừ không nhớ trong phạm vi 100

**Yêu cầu cần đạt**

- Đặt tính đúng (đơn vị thẳng đơn vị, chục thẳng chục) rồi tính từ phải sang trái: 34 + 25 = 59, 68 − 23 = 45.
- Làm đúng khi một số hạng có một chữ số: 34 + 5 = 39, 47 − 6 = 41 (đây là chỗ lệch hàng).
- Nhẩm được dạng số có hai chữ số với số tròn chục: 45 + 20 = 65, 67 − 30 = 37 (giao với 2.13).
- Thử lại phép trừ bằng phép cộng: 68 − 23 = 45 vì 45 + 23 = 68.

**Tiên quyết:** L1.5, 2.1.

**Ngưỡng thành thạo:** kiểu K2, mức nhẹ: 9/10 ở 2 phiên; CĐA dưới 8 giây, NS dưới 15 giây; 30 câu trong đó ít nhất 8 câu có số một chữ số.

**Lỗi thường gặp**

| Lỗi | Ví dụ | Nhận biết qua đáp án sai | Mã |
|---|---|---|---|
| Lệch hàng: cộng số một chữ số vào hàng chục | 34 + 5 = 84; 58 − 3 = 28 | v = a + 10b (cộng) hoặc a − 10b (trừ) | `sai-hang` |
| Cộng chéo hàng | 34 + 25: 3 + 5 = 8, 4 + 2 = 6, ra 86 | v = (chục a + đơn vị b) × 10 + (đơn vị a + chục b) | `sai-hang` |
| Nhầm dấu | 68 − 23 = 91 | v = a + b hoặc a − b ngược dấu | `nham-dau` |
| Tính sai một hàng vì đếm lệch | 34 + 25 = 58 | v = đ ± 1 hoặc đ ± 10 | `dem-lech` |

**Ví dụ bài**

| Mức | Câu | Đáp án | Nhiễu | Dạng |
|---|---|---|---|---|
| Dễ | 32 + 45 | 77 | 76, 78, 13 | CĐA |
| Dễ | 56 − 24 | 32 | 33, 31, 80 | CĐA |
| TB | 34 + 5 | 39 | 84, 38, 29 | CĐA |
| TB | 58 − 3 | 55 | 28, 54, 61 | CĐA |
| TB | 45 + 20 | 65 | 47, 25, 60 | CĐA |
| Khó | 27 + 62 | 89 | 88, 99, 35 | NS |
| Khó | 99 − 47 | 52 | 42, 53, 146 | NS |
| Khó | Đặt tính 47 − 6: kéo chữ số 6 vào đúng cột | cột đơn vị | cột chục | KT |

**Dạng câu hỏi:** CĐA (Ninja a4), NS, KT đặt tính (kéo chữ số vào cột hàng, đúng cột mới được tính).

**Ưu tiên: P1.** Đã có trong a4 nhưng lẫn với 2.11; giá trị chính là làm mốc so sánh: bé đúng 2.10 mà sai 2.11 thì vấn đề là "nhớ", bé sai cả 2.10 thì vấn đề là đặt tính hoặc bảng cộng. Bộ sinh a4 cần gắn nhãn từng câu có nhớ hay không để ghi `byTopic` riêng.

### 2.11 Cộng, trừ có nhớ trong phạm vi 100

Nội dung nặng nhất học kỳ 1. SGK dạy theo thứ tự: số có hai chữ số cộng số có một chữ số có nhớ (28 + 7), rồi hai số có hai chữ số (36 + 27), tương tự cho phép trừ (43 − 8, 62 − 38), rồi 100 trừ đi một số (100 − 36).

**Yêu cầu cần đạt**

- Đặt tính và tính 36 + 27 = 63, nói được "6 + 7 = 13, viết 3 nhớ 1; 3 + 2 = 5, thêm 1 là 6, viết 6".
- Đặt tính và tính 62 − 38 = 24, nói được "2 không trừ được 8, lấy 12 − 8 = 4, viết 4 nhớ 1; 3 thêm 1 là 4, 6 − 4 = 2, viết 2".
- Làm đúng dạng có một chữ số: 28 + 7 = 35, 43 − 8 = 35, và dạng 100 − 36 = 64.
- Nhận ra khi nào có nhớ (6 + 7 qua 10) và khi nào không (34 + 25), trong một dãy trộn hai loại.
- Nhẩm được các cặp có tổng 100 (45 + 55, 30 + 70): "bạn của 100".

**Tiên quyết:** 2.8, 2.9 (bắt buộc: 6 + 7 và 12 − 8 phải là phản xạ), 2.10.

**Ngưỡng thành thạo:** kiểu K2. 9/10 ở 2 phiên cách nhau ít nhất 1 ngày; CĐA dưới 10 giây, NS dưới 20 giây; 30 câu trong đó ít nhất 15 câu có nhớ hoặc mượn, trộn với câu không nhớ. Khi bé bị cờ đoán ở CĐA (trung vị dưới 2 giây và đúng gần 25%), chuyển sang NS theo điều kiện (c) mục 8 của `01-muc-tieu-va-ky-vong.md`.

**Lỗi thường gặp**

| Lỗi | Ví dụ | Nhận biết qua đáp án sai | Mã |
|---|---|---|---|
| Quên nhớ 1 sang hàng chục | 36 + 27 = 53 | v = đ − 10 | `quen-nho` |
| Viết cả 13 xuống, không nhớ | 36 + 27 = 513 | v = (chục a + chục b) ghép với (đơn vị a + đơn vị b) thành số 3 chữ số | `viet-ca-so-nho` |
| Trừ ngược ở hàng đơn vị | 62 − 38 = 36 (lấy 8 − 2) | v = (chục a − chục b) × 10 + (đơn vị b − đơn vị a) | `tru-nguoc` |
| Mượn rồi quên trừ 1 ở hàng chục | 62 − 38 = 34 | v = đ + 10 | `quen-muon` |
| Nhầm dấu | 62 − 38 = 100; 36 + 27 = 9 | v = a + b ở phép trừ; v = a − b ở phép cộng | `nham-dau` |
| Lệch hàng với số một chữ số | 28 + 7 = 98 | v = a + 10b | `sai-hang` |
| Sai bảng cộng hoặc bảng trừ bên trong | 36 + 27 = 64 (6 + 7 = 14) | v = đ ± 1 | `dem-lech` |
| 100 trừ: quên mượn qua hai hàng | 100 − 36 = 74 | v = đ + 10 | `quen-muon` |

Hai lỗi `tru-nguoc` và `quen-muon` cùng xuất hiện ở phép trừ nhưng khác bản chất: trừ ngược là chưa hiểu mượn, quên trừ 1 là hiểu nhưng thiếu bước. Lời mách khác nhau ("2 không trừ được 8 thì phải mượn 1 chục" và "con mượn 1 rồi thì hàng chục phải bớt 1"), nên nhất định ghi hai mã riêng.

**Ví dụ bài**

| Mức | Câu | Đáp án | Nhiễu | Dạng |
|---|---|---|---|---|
| Dễ | 28 + 7 | 35 | 25, 98, 34 | CĐA |
| Dễ | 43 − 8 | 35 | 45, 34, 36 | CĐA |
| TB | 36 + 27 | 63 | 53, 513, 9 | CĐA |
| TB | 62 − 38 | 24 | 36, 34, 100 | CĐA |
| TB | 47 + 35 | 82 | 72, 712, 12 | NS |
| Khó | 100 − 36 | 64 | 74, 136, 36 | NS |
| Khó | 91 − 47 | 44 | 54, 56, 138 | NS |
| Khó | Chém hai quả có tổng 100 trong 45, 55, 35, 75, 60 | 45 và 55 | 35 và 75 (đúng, phải chấp nhận), 45 và 60 | GĐ |

**Dạng câu hỏi:** CĐA (Ninja a4), NS (bàn phím kiểu Vệ Binh, ưu tiên cho màn có nhớ), GĐ (Ninja p4 "Bạn của 100"), KT đặt tính từng bước: bé kéo chữ số 3 xuống hàng đơn vị và kéo "nhớ 1" lên hàng chục (dạy đúng quy trình, hợp với người tin vào đặt tính như phụ huynh trong `02-nhan-vat-ao.md`).

**Ưu tiên: P0.** Nằm trong M1, là nội dung phụ huynh lớp 2 hỏi nhiều nhất ("con hay quên nhớ"). Đã có game; việc cần làm: tách thống kê có nhớ và không nhớ trong a4, ghi mã lỗi, thêm màn NS.

### 2.12 Cộng, trừ trong phạm vi 1000

Yêu cầu của lớp 2 theo Thông tư 32: cộng, trừ các số trong phạm vi 1000 **không nhớ hoặc có nhớ không quá một lượt**. Hai lượt nhớ (456 + 287) hay mượn liên tiếp (703 − 458) là yêu cầu lớp 3 (mã 3.7). Màn Ninja a5 hiện sinh cả hai loại, nên với bé lớp 2 phải có bộ lọc riêng.

**Yêu cầu cần đạt**

- Đặt tính và tính số có ba chữ số không nhớ: 235 + 142 = 377, 568 − 235 = 333.
- Có nhớ một lượt ở hàng đơn vị: 326 + 158 = 484; 452 − 138 = 314.
- Có nhớ một lượt ở hàng chục: 452 + 273 = 725; 526 − 173 = 353.
- Số ba chữ số với số hai chữ số, đặt thẳng hàng: 345 + 42 = 387, 678 − 45 = 633.
- Nói được từng bước như ở 2.11, thêm hàng trăm.

**Tiên quyết:** 2.11, 2.3.

**Ngưỡng thành thạo:** kiểu K2. 9/10 ở 2 phiên; CĐA dưới 15 giây, NS dưới 30 giây; 30 câu chia đều ba nhóm: không nhớ, nhớ ở hàng đơn vị, nhớ ở hàng chục.

**Lỗi thường gặp**

| Lỗi | Ví dụ | Nhận biết qua đáp án sai | Mã |
|---|---|---|---|
| Quên nhớ (ở hàng đơn vị hoặc hàng chục) | 326 + 158 = 474; 452 + 273 = 625 | v = đ − 10 hoặc đ − 100 | `quen-nho` |
| Quên trừ 1 sau khi mượn | 452 − 138 = 324; 526 − 173 = 453 | v = đ + 10 hoặc đ + 100 | `quen-muon` |
| Trừ ngược | 452 − 138 = 326 | ở hàng có mượn, chữ số của v bằng (chữ số số trừ − chữ số số bị trừ). Lưu ý: khi mượn ở hàng chục (526 − 173), trừ ngược và quên mượn cùng cho 453; game ghi cả hai mã | `tru-nguoc` |
| Viết cả số nhớ | 326 + 158 = 4714 | v có 4 chữ số | `viet-ca-so-nho` |
| Lệch hàng với số hai chữ số | 345 + 42 = 765 | v = a + 10b | `sai-hang` |
| Nhầm dấu | 568 − 235 = 803 | v = a + b | `nham-dau` |

**Ví dụ bài**

| Mức | Câu | Đáp án | Nhiễu | Dạng |
|---|---|---|---|---|
| Dễ | 235 + 142 | 377 | 376, 387, 93 | CĐA |
| Dễ | 568 − 235 | 333 | 343, 323, 803 | CĐA |
| TB | 326 + 158 | 484 | 474, 4714, 168 | NS |
| TB | 452 − 138 | 314 | 324, 326, 590 | NS |
| TB | 452 + 273 | 725 | 625, 6125, 179 | NS |
| Khó | 526 − 173 | 353 | 453, 253, 699 | NS |
| Khó | 345 + 42 | 387 | 765, 377, 303 | NS |
| Khó | 600 − 250 | 350 | 450, 250, 850 | NS |

**Dạng câu hỏi:** NS là chính (bàn phím số của Vệ Binh, thiên thạch rơi chậm như màn "Nhân chia số lớn"); CĐA cho câu không nhớ; KT đặt tính ba cột.

**Ưu tiên: P1.** Nền cho 3.7, 3.8; game đã có nhưng vượt mức; việc cần làm là thêm cờ `carries` (số lượt nhớ) vào bộ sinh a5, mở chế độ "lớp 2" chỉ lấy câu có tối đa một lượt nhớ, và ghi `byTopic` 2.12 hay 3.7 theo cờ đó.

### 2.13 Tính nhẩm với số tròn chục, tròn trăm

**Yêu cầu cần đạt**

- Nhẩm số tròn chục bằng cách đếm chục: 30 + 40 = 70 vì "3 chục + 4 chục = 7 chục"; 90 − 60 = 30; 70 + 60 = 130.
- Nhẩm số tròn trăm: 300 + 400 = 700, 800 − 500 = 300, 1000 − 300 = 700.
- Nhẩm tròn trăm với tròn chục: 400 + 30 = 430, 430 − 30 = 400, 430 − 400 = 30.
- Nhẩm số có hai chữ số với số tròn chục: 45 + 20 = 65, 67 − 30 = 37.
- Nói được lý do ("vì 3 + 4 = 7 nên 300 + 400 = 700").

**Tiên quyết:** L1.2, 2.3.

**Ngưỡng thành thạo:** kiểu K1. 9/10 ở 2 phiên; trung vị dưới 4 giây (CĐA) hoặc 6 giây (NS); 40 câu phủ đủ bốn dạng trên.

**Lỗi thường gặp**

| Lỗi | Ví dụ | Nhận biết qua đáp án sai | Mã |
|---|---|---|---|
| Thừa chữ số 0 | 300 + 400 = 7000 | v = đ × 10 | `thua-0` |
| Thiếu chữ số 0 | 300 + 400 = 70; 80 − 50 = 3 | v = đ : 10 | `thieu-0` |
| Cộng chữ số rồi ghép số 0, không để ý hàng | 400 + 30 = 700 hoặc 70 | v = (chữ số của a + chữ số của b) × 100 hoặc × 10 | `sai-hang` |
| Cộng số tròn chục vào hàng đơn vị | 45 + 20 = 47 | v = a + b : 10 | `sai-hang` |
| Nhầm dấu | 1000 − 300 = 1300 | v = a + b | `nham-dau` |
| Lấy luôn số trừ làm kết quả | 1000 − 300 = 300 | v = b | `khac` |

**Ví dụ bài**

| Mức | Câu | Đáp án | Nhiễu | Dạng |
|---|---|---|---|---|
| Dễ | 30 + 40 | 70 | 7, 700, 10 | CĐA |
| Dễ | 80 − 50 | 30 | 3, 130, 300 | CĐA |
| TB | 300 + 500 | 800 | 80, 8000, 200 | CĐA |
| TB | 400 + 30 | 430 | 700, 70, 340 | CĐA |
| TB | 45 + 20 | 65 | 47, 25, 60 | CĐA |
| Khó | 1000 − 300 | 700 | 300, 70, 1300 | NS |
| Khó | 430 − 400 | 30 | 300, 3, 830 | NS |
| Khó | 70 + 60 | 130 | 13, 1300, 10 | NS |

**Dạng câu hỏi:** CĐA tốc độ cao (chuỗi đúng liên tiếp tính điểm, như gợi ý cho 3.10 trong bản đồ), NS. Màn Ninja "Siêu Ninja" đã dùng số tròn trăm trong phạm vi 1000 để bé nhẩm kịp; tách phần đó thành màn riêng là đủ.

**Ưu tiên: P0.** Trong danh sách M3 mốc 6T. Rất rẻ (bộ sinh đã có trong a4, a5, genRound1000), đo rất sạch, và là kỹ năng phụ huynh hay hỏi ("con nhẩm được chưa"). Nền cho ước lượng (2.7), làm tròn (3.5) và nhẩm lớp 3 (3.10).

### 2.14 Gọi tên thành phần: số hạng, tổng, số bị trừ, số trừ, hiệu

**Yêu cầu cần đạt**

- Trong 8 + 7 = 15 chỉ ra 8 và 7 là số hạng, 15 là tổng; biết cả biểu thức "8 + 7" cũng được gọi là tổng.
- Trong 15 − 9 = 6 chỉ ra 15 là số bị trừ, 9 là số trừ, 6 là hiệu; biết "15 − 9" cũng gọi là hiệu.
- Đi ngược từ tên ra phép tính: "tính tổng của 24 và 35" là 24 + 35 = 59; "tính hiệu của 60 và 18" là 60 − 18 = 42; "số bị trừ là 50, số trừ là 27, hiệu là 23".
- Hiểu lời mách dùng tên gọi ở 2.15: "muốn tìm số hạng chưa biết, lấy tổng trừ số hạng kia".

**Tiên quyết:** L1.2.

**Ngưỡng thành thạo:** kiểu K3. 9/10 dưới 8 giây; 20 câu phủ đủ năm tên gọi, cả chiều "chỉ tên" và chiều "từ tên ra phép tính"; 2 phiên.

**Lỗi thường gặp**

| Lỗi | Ví dụ | Nhận biết qua đáp án sai | Mã |
|---|---|---|---|
| Đảo số bị trừ và số trừ (cả hai đều có chữ "trừ") | kéo nhãn "số trừ" vào 15 trong 15 − 9 = 6 | hai nhãn hoán đổi nhau | `ten-thanh-phan` |
| Gọi mọi kết quả là "tổng" | 15 − 9 = 6, hỏi 6 gọi là gì, chọn "tổng" | chọn "tổng" ở phép trừ | `ten-thanh-phan` |
| Nghe "hiệu" vẫn làm phép cộng | "hiệu của 60 và 18" ra 78 | v = a + b khi hỏi hiệu; v = a − b khi hỏi tổng | `sai-phep` |
| Hiểu "số hạng" là số ở hàng nào đó | chọn chữ số 5 trong 15 làm số hạng | chọn một chữ số thay vì một số | `khac` |

**Ví dụ bài**

| Mức | Câu | Đáp án | Nhiễu | Dạng |
|---|---|---|---|---|
| Dễ | Kéo ba nhãn "số hạng", "số hạng", "tổng" vào 8 + 7 = 15 | 8, 7 là số hạng; 15 là tổng | | KT |
| Dễ | Trong 15 − 9 = 6, số bị trừ là số nào? | 15 | 9, 6 | CĐA |
| TB | Tính tổng của 24 và 35 | 59 | 11, 58 | NS |
| TB | Tính hiệu của 60 và 18 | 42 | 78, 52 | NS |
| TB | Trong 36 + 27 = 63, số 63 gọi là gì? | tổng | hiệu, số hạng, số bị trừ | CĐA |
| Khó | Số bị trừ là 50, số trừ là 27. Hiệu là bao nhiêu? | 23 | 77, 33 | NS |
| Khó | Tổng của hai số là 15, một số hạng là 8. Số hạng kia là? | 7 | 23, 6 | NS |
| Khó | Ghép ba nhãn với ba số trong 45 − 20 = 25 | 45 số bị trừ, 20 số trừ, 25 hiệu | | GĐ |

**Dạng câu hỏi:** KT (kéo nhãn vào phép tính đang sáng, như gợi ý bản đồ), CĐA, GĐ, NS.

**Ưu tiên: P2.** Là ngôn ngữ, không phải kỹ năng tính; phụ huynh ít hỏi. Nhưng rất rẻ và cần cho lời mách của 2.15, nên làm thành **bài học ngắn kèm 3 câu hỏi đáp** đặt trước màn 2.15 (đúng kiểu bài học của Tháp Đồng Hồ), không làm game riêng. Câu hỏi ví dụ "tổng của hai số là 15, một số hạng là 8" là cầu nối sang 2.15.

### 2.15 Tìm thành phần chưa biết của phép cộng, phép trừ

SGK 2018 lớp 2 viết thành phần chưa biết bằng ô trống hoặc dấu ?, ví dụ "? + 5 = 12"; chữ x xuất hiện ở lớp 3 hoặc tùy bộ sách. Cần giáo viên rà: cách viết của bộ sách gia đình dùng để hiện đúng trên màn hình.

**Yêu cầu cần đạt**

- Tìm số hạng: ? + 5 = 12, làm 12 − 5 = 7 và nói "muốn tìm số hạng chưa biết, lấy tổng trừ đi số hạng kia".
- Tìm số bị trừ: ? − 7 = 8, làm 8 + 7 = 15, nói "lấy hiệu cộng với số trừ".
- Tìm số trừ: 15 − ? = 9, làm 15 − 9 = 6, nói "lấy số bị trừ trừ đi hiệu".
- Làm được trong phạm vi 100: ? + 25 = 60, 84 − ? = 39, ? − 28 = 47.
- Thử lại bằng cách thay số vừa tìm vào chỗ trống (7 + 5 = 12, đúng).
- Dạng nhẩm ngược của bảng: 8 + ? = 15 (nghĩ "8 cộng mấy bằng 15") là bước đầu, không cần quy tắc.

**Tiên quyết:** 2.14, 2.8, 2.9; trong phạm vi 100 cần 2.10, 2.11.

**Ngưỡng thành thạo:** kiểu K2. 9/10 ở 2 phiên; CĐA dưới 8 giây (phạm vi 20), NS dưới 15 giây (phạm vi 100); 30 câu chia đều ba dạng (số hạng, số bị trừ, số trừ). Báo cáo tách ba dạng vì bé thường đạt "số hạng" trước "số trừ" vài tuần.

**Lỗi thường gặp**

| Lỗi | Ví dụ | Nhận biết qua đáp án sai | Mã |
|---|---|---|---|
| Luôn trừ dù phải cộng (tìm số bị trừ) | ? − 7 = 8 ra 1 | v = hiệu − số trừ (hoặc giá trị tuyệt đối) | `nguoc-thanh-phan` |
| Luôn cộng dù phải trừ (tìm số trừ) | 15 − ? = 9 ra 24 | v = số bị trừ + hiệu | `nguoc-thanh-phan` |
| Coi dấu "=" là "ra kết quả", cộng hai số có sẵn | ? + 5 = 12 ra 17 | v = b + c | `nguoc-thanh-phan` |
| Chọn đúng phép, tính sai | ? + 5 = 12 ra 6 | v = đ ± 1 | `dem-lech`, hoặc mã của phép tính bên trong |
| Lấy nguyên một số trong đề | ? + 5 = 12 ra 12 | v bằng một số cho trước | `khac` |

**Ví dụ bài**

| Mức | Câu | Đáp án | Nhiễu | Dạng |
|---|---|---|---|---|
| Dễ | 8 + ? = 15 | 7 | 23, 6, 15 | CĐA |
| Dễ | ? + 5 = 12 | 7 | 17, 6, 12 | CĐA |
| TB | ? − 7 = 8 | 15 | 1, 14, 8 | CĐA |
| TB | 15 − ? = 9 | 6 | 24, 5, 9 | CĐA |
| TB | ? + 25 = 60 | 35 | 85, 45, 25 | NS |
| Khó | 84 − ? = 39 | 45 | 123, 55, 39 | NS |
| Khó | ? − 28 = 47 | 75 | 19, 65, 47 | NS |
| Khó | Chọn hai quả có hiệu bằng 8 trong 17, 9, 15, 6 | 17 và 9 | 15 và 6 | GĐ |

**Dạng câu hỏi:** CĐA, NS, GĐ (các màn ghép đôi p1, p2, p3 của Ninja là dạng ẩn của "tìm số hạng"). Màn mới nên hiện phép tính có ô trống nhấp nháy và, khi bé sai, sáng lên tên gọi của từng thành phần (dùng lại bài học 2.14).

**Ưu tiên: P0.** Trong M3 mốc 3T (nâng từ "một phần"). Dạng bài rất phổ biến trong kiểm tra, và là nội dung đầu tiên đo được bé "hiểu quan hệ" hay chỉ "thuộc bảng": bé thuộc 8 + 7 = 15 mà không làm được ? − 7 = 8 là tín hiệu rõ cho phụ huynh. Chưa có màn viết hẳn phép tính có ô trống.

### 2.16 Tính giá trị biểu thức có hai dấu cộng, trừ

Lớp 2 chỉ có biểu thức hai dấu cộng, trừ, không có dấu ngoặc, không trộn nhân chia (dấu ngoặc và thứ tự nhân chia trước là 3.23).

**Yêu cầu cần đạt**

- Tính từ trái sang phải và viết hai bước: 12 + 5 − 3 = 17 − 3 = 14; 20 − 8 + 6 = 12 + 6 = 18.
- Nói được quy tắc "có hai dấu cộng, trừ thì tính lần lượt từ trái sang phải".
- Làm được trong phạm vi 100 có nhớ: 36 + 27 − 13 = 63 − 13 = 50; 45 − 18 + 30 = 27 + 30 = 57; với số tròn: 100 − 40 − 30 = 30.

**Tiên quyết:** 2.10, 2.11.

**Ngưỡng thành thạo:** kiểu K2. 9/10 ở 2 phiên; NS dưới 20 giây, CĐA dưới 12 giây; 20 câu, ít nhất 8 câu dạng "trừ rồi cộng" (chỗ bẫy tính vế phải trước).

**Lỗi thường gặp**

| Lỗi | Ví dụ | Nhận biết qua đáp án sai | Mã |
|---|---|---|---|
| Tính vế phải trước | 20 − 8 + 6 = 20 − 14 = 6 | v = a − (b + c) hoặc a + (b − c) | `trai-sang-phai` |
| Chỉ làm phép tính đầu | 12 + 5 − 3 = 17 | v = kết quả bước một | `bo-buoc` |
| Nhầm dấu ở bước hai | 12 + 5 − 3 = 20 | v = a + b + c | `nham-dau` |
| Lỗi có nhớ bên trong | 36 + 27 − 13 = 40 | v = đ − 10 | `quen-nho` |

**Ví dụ bài**

| Mức | Câu | Đáp án | Nhiễu | Dạng |
|---|---|---|---|---|
| Dễ | 12 + 5 − 3 | 14 | 20, 17, 4 | NS |
| Dễ | 10 − 4 + 2 | 8 | 4, 6, 16 | CĐA |
| TB | 20 − 8 + 6 | 18 | 6, 12, 34 | CĐA |
| TB | 8 + 7 − 9 | 6 | 15, 24, 7 | NS |
| TB | 64 − 25 + 8 | 47 | 39, 31, 97 | NS |
| Khó | 36 + 27 − 13 | 50 | 63, 76, 40 | NS |
| Khó | 45 − 18 + 30 | 57 | 27, 67, 93 | NS |
| Khó | 100 − 40 − 30 | 30 | 90, 60, 170 | NS |

**Dạng câu hỏi:** "Leo thang" như gợi ý bản đồ: mỗi bậc một dấu, bé nhập kết quả trung gian rồi mới hiện bậc sau (chấm được từng bước, ghi `bo-buoc` khi bé dừng ở bậc một). CĐA cho câu trong 20.

**Ưu tiên: P1.** Chưa có game, dễ đo theo từng bước, nền trực tiếp cho 3.23 (biểu thức có ngoặc, nhân chia). Giá trị với phụ huynh vừa phải vì bé ít sai ở dạng hai dấu cộng trừ, sai chủ yếu ở phép có nhớ bên trong.

### 2.17 Nhiều hơn, ít hơn một số đơn vị

**Yêu cầu cần đạt**

- Hiểu "Bình có nhiều hơn An 3 quả" nghĩa là số quả của Bình bằng số quả của An thêm 3; "ít hơn 3 quả" là bớt 3.
- Giải bài toán về nhiều hơn (dạng thuận) bằng phép cộng: "An có 5 quả cam, Bình có nhiều hơn An 3 quả. Hỏi Bình có mấy quả cam?" làm 5 + 3 = 8 (quả).
- Giải bài toán về ít hơn (dạng thuận) bằng phép trừ: "An có 12 viên bi, Bình có ít hơn An 4 viên. Hỏi Bình có mấy viên bi?" làm 12 − 4 = 8 (viên).
- Tìm hai số hơn kém nhau bao nhiêu: "Bình có 12 viên bi, An có 8 viên. Bình nhiều hơn An mấy viên?" làm 12 − 8 = 4.
- Dạng ngược ("Bình có 8 viên, ít hơn An 4 viên, An có mấy viên?") không thuộc lớp 2; game không đưa vào màn lớp 2.

**Tiên quyết:** L1.4, 2.10, 2.11 (khi số trong phạm vi 100).

**Ngưỡng thành thạo:** kiểu K4. 4/5 ở 2 phiên; bước chọn phép tính dưới 20 giây; 15 bài, cân bằng "nhiều hơn", "ít hơn" và "hơn kém bao nhiêu" (5 bài mỗi dạng).

**Lỗi thường gặp**

| Lỗi | Ví dụ | Nhận biết qua đáp án sai | Mã |
|---|---|---|---|
| Làm theo từ khóa: thấy "nhiều hơn" là cộng | "Bình 12, An 8, Bình nhiều hơn An mấy viên?" làm 12 + 8 = 20 | chọn phép cộng ở bài "hơn kém bao nhiêu" | `sai-phep` |
| Chọn ngược phép ở dạng thuận | "ít hơn 4 viên" làm 12 + 4 = 16 | chọn phép ngược | `sai-phep` |
| Lấy sai số | 12 − 8 khi phải 12 − 4 | phép tính dùng số không đúng vị trí | `khac` ("sai số liệu") |
| Sai đơn vị | "8 quả" cho bài về viên bi | chọn sai thẻ đơn vị | `khac` ("đơn vị") |
| Tính sai | 12 − 4 = 9 | mã của phép tính bên trong | `dem-lech` |

**Ví dụ bài** (mỗi đề có tranh minh họa hai giỏ, hai hàng đồ vật)

| Mức | Câu | Đáp án | Nhiễu | Dạng |
|---|---|---|---|---|
| Dễ | An có 5 quả cam, Bình có nhiều hơn An 3 quả. Hỏi Bình có mấy quả cam? | 5 + 3 = 8 (quả) | 5 − 3 = 2 | 2B |
| Dễ | Lan có 9 bông hoa, Hoa có ít hơn Lan 2 bông. Hỏi Hoa có mấy bông hoa? | 9 − 2 = 7 (bông) | 9 + 2 = 11 | 2B |
| TB | Lớp 2A có 32 bạn, lớp 2B có nhiều hơn lớp 2A 3 bạn. Hỏi lớp 2B có bao nhiêu bạn? | 35 (bạn) | 29 | 2B |
| TB | Anh 12 tuổi, em ít hơn anh 4 tuổi. Hỏi em mấy tuổi? | 8 (tuổi) | 16 | 2B |
| TB | Bình có 12 viên bi, An có 8 viên bi. Hỏi Bình có nhiều hơn An mấy viên bi? | 12 − 8 = 4 (viên) | 20 | 2B |
| Khó | Cây cam cao 45 dm, cây bưởi cao hơn cây cam 18 dm. Hỏi cây bưởi cao bao nhiêu đề-xi-mét? | 63 (dm) | 27 | 2B |
| Khó | Thùng thứ nhất có 60 l dầu, thùng thứ hai có ít hơn thùng thứ nhất 25 l. Hỏi thùng thứ hai có bao nhiêu lít dầu? | 35 (l) | 85 | 2B |
| Khó | Hai giỏ táo: giỏ đỏ 15 quả, giỏ xanh 9 quả. Thêm vào giỏ xanh mấy quả để hai giỏ bằng nhau? | 6 (quả) | 24 | TH |

**Dạng câu hỏi:** 2B (chọn phép tính, tính, chọn đơn vị); TH hai giỏ quả thêm bớt cho đúng câu (gợi ý bản đồ), rất hợp để dạy nghĩa trước khi làm bài chữ.

**Ưu tiên: P2.** Giá trị sư phạm cao nhưng chấm tự động chỉ tin được ở bước chọn phép tính, SGK có ít bài và dạng khó (ngược) nằm ở lớp 3. Không làm riêng; đưa vào làm nhóm đề "nhiều hơn, ít hơn" trong game bài toán có lời văn (2.18).

### 2.18 Giải bài toán có lời văn bằng một phép tính

**Yêu cầu cần đạt**

- Đọc (hoặc nghe) đề có tranh, nói được "bài toán cho biết gì, hỏi gì".
- Chọn đúng phép tính: cộng khi thêm vào, gộp lại, "tất cả", "cả hai"; trừ khi bớt đi, "còn lại", "ít hơn", tìm phần còn lại.
- Trình bày đúng mẫu SGK: dòng "Bài giải", câu lời giải, phép tính có tên đơn vị trong ngoặc (36 + 27 = 63 (cây)), dòng "Đáp số: 63 cây".
- Số liệu trong phạm vi 100 có nhớ; cuối năm có bài trong phạm vi 1000 và bài dùng đơn vị đo (kg, l, cm, dm, m).

**Tiên quyết:** 2.17, 2.11, 2.10; đề trong phạm vi 1000 cần 2.12.

**Ngưỡng thành thạo:** kiểu K4. Tách hai bước: chọn phép tính 4/5 và tính đúng 4/5, ở 2 phiên; cả bài dưới 40 giây; 15 bài với tỉ lệ cộng và trừ bằng nhau, ít nhất 3 bài "bẫy từ khóa" (có chữ "bán", "còn lại" nhưng phải cộng). Không gắn nhãn "Đã thuộc" cho bé chỉ chơi đề một dạng.

**Lỗi thường gặp**

| Lỗi | Ví dụ | Nhận biết qua đáp án sai | Mã |
|---|---|---|---|
| Chọn phép theo từ khóa hoặc cộng mọi số trong đề | "Bán 15 kg, còn 40 kg, lúc đầu có bao nhiêu?" làm 40 − 15 | chọn phép ngược với đáp án | `sai-phep` |
| Chọn đúng phép, lấy sai số | dùng số ở câu hỏi (lớp 2A, 2B) làm số liệu | phép tính chứa số không phải số liệu | `khac` ("sai số liệu") |
| Đúng phép, không tính hoặc tính sai | 36 + 27 = 53 | mã của phép tính bên trong | `quen-nho`, `bo-buoc` |
| Sai đơn vị hoặc thiếu đáp số | "63 con" cho bài về cây | chọn sai thẻ đơn vị | `khac` ("đơn vị") |
| Trả lời trước khi đọc xong đề | bấm trước khi giọng đọc kết thúc | thời gian trả lời ngắn hơn thời gian đọc | cờ "trả lời quá sớm" |

**Ví dụ bài**

| Mức | Câu | Đáp án | Nhiễu (phép tính) | Dạng |
|---|---|---|---|---|
| Dễ | Trong vườn có 8 cây cam và 7 cây bưởi. Hỏi trong vườn có tất cả bao nhiêu cây? | 8 + 7 = 15 (cây) | 8 − 7 | 2B |
| Dễ | Có 15 con gà, 9 con đã vào chuồng. Hỏi còn mấy con gà chưa vào chuồng? | 15 − 9 = 6 (con) | 15 + 9 | 2B |
| TB | Lớp 2A trồng được 36 cây, lớp 2B trồng được 27 cây. Hỏi cả hai lớp trồng được bao nhiêu cây? | 63 (cây) | 36 − 27 | 2B |
| TB | Cửa hàng có 62 kg gạo, đã bán 38 kg. Hỏi cửa hàng còn lại bao nhiêu ki-lô-gam gạo? | 24 (kg) | 62 + 38 | 2B |
| TB | Bà có 45 quả trứng, bà mua thêm 25 quả nữa. Hỏi bà có tất cả bao nhiêu quả trứng? | 70 (quả) | 45 − 25 | 2B |
| Khó | Sợi dây dài 100 cm, cắt đi 36 cm. Hỏi sợi dây còn lại dài bao nhiêu xăng-ti-mét? | 64 (cm) | 100 + 36 | 2B |
| Khó | Sau khi bán 15 kg gạo, cửa hàng còn lại 40 kg gạo. Hỏi lúc đầu cửa hàng có bao nhiêu ki-lô-gam gạo? | 40 + 15 = 55 (kg) | 40 − 15 | 2B |
| Khó | Đội một sửa được 245 m đường, đội hai sửa được 132 m đường. Hỏi cả hai đội sửa được bao nhiêu mét đường? | 377 (m) | 245 − 132 | 2B |

**Dạng câu hỏi:** 2B trong "truyện tranh ba khung có giọng đọc" (gợi ý bản đồ): khung 1 và 2 kể dữ kiện, khung 3 hỏi; bé chọn phép tính (hai thẻ 8 + 7 và 8 − 7), nhập kết quả, chọn thẻ đơn vị. Đề phải viết tay và rà theo SGK (M10), không sinh tự động; bộ đề ban đầu 60 bài (30 cộng, 30 trừ) là đủ cho 15 bài mỗi phiên không lặp trong 4 phiên.

**Ưu tiên: P1.** Trong M3 mốc 12T. Giá trị với phụ huynh rất cao ("con biết tính nhưng không biết chọn phép"), chưa có game, chấm được bước chọn phép. Xếp sau các nội dung P0 vì tốn công viết và rà đề, và cần giọng đọc tốt (bé lớp 2 đầu năm đọc chậm).

### 2.19 Ý nghĩa phép nhân: tổng các số hạng bằng nhau

Bài đầu tiên của mạch nhân chia, thường ở tuần 19 đến 20. Mọi thứ ở 2.20 đến 2.26 dựa vào bài này. Đọc lại mục 2.2 trước khi thiết kế.

**Yêu cầu cần đạt**

- Nhìn tranh 4 đĩa, mỗi đĩa 2 quả cam: viết 2 + 2 + 2 + 2 = 8, rồi viết 2 × 4 = 8, đọc "hai nhân bốn bằng tám", nói "2 được lấy 4 lần".
- Chiều ngược: cho 5 × 3, viết thành 5 + 5 + 5 = 15 và tính.
- Nhận ra tổng nào chuyển được thành phép nhân (3 + 3 + 3 + 3) và tổng nào không (3 + 3 + 4).
- Tự xếp đồ vật thành các hàng bằng nhau rồi viết phép nhân tương ứng.
- Viết phép nhân từ lời: "mỗi bàn có 2 bạn, có 5 bàn" là 2 × 5.
- Giữ đúng thứ tự: số được lấy viết trước, số lần lấy viết sau.

**Tiên quyết:** L1.4, 2.10 (cộng dãy nhiều số hạng), 2.1 (đếm thêm 2, thêm 5).

**Ngưỡng thành thạo:** kiểu K3. 9/10 ở 2 phiên; CĐA dưới 10 giây, KT và TH dưới 20 giây; 20 câu trong đó ít nhất 5 câu "không thành phép nhân được" và 5 câu chiều ngược (từ phép nhân ra tổng).

**Lỗi thường gặp**

| Lỗi | Ví dụ | Nhận biết qua đáp án sai | Mã |
|---|---|---|---|
| Đảo thứ tự hai thừa số | 2 + 2 + 2 + 2 viết 4 × 2 | v là phép nhân đúng tích nhưng đảo vị trí | `dao-thu-tu` |
| Đếm sai số nhóm hoặc số phần tử | 4 đĩa 2 quả viết 2 × 3 | số lần lấy lệch 1 | `dem-nhom` |
| Cộng hai số thay vì nhân | 2 × 4 = 6 | v = a + b | `cong-thay-nhan` |
| Cộng lặp thiếu một lần | 2 × 4 = 2 + 2 + 2 = 6 | v = đ − a | `dem-lech` |
| Chuyển tổng không bằng nhau thành phép nhân | 3 + 3 + 4 viết 3 × 3 | chọn "viết được" ở tổng có số hạng khác nhau | `khac` ("số hạng không bằng nhau") |

Về `dao-thu-tu`: 4 × 2 cho tích đúng nên không được coi là "sai toán", nhưng SGK lớp 2 yêu cầu 2 × 4. Game không trừ tim, không tính là đúng, mách "2 được lấy 4 lần, viết 2 × 4" rồi hỏi lại; báo cáo ghi "chưa quen thứ tự viết", không ghi vào cột sai.

**Ví dụ bài**

| Mức | Câu | Đáp án | Nhiễu | Dạng |
|---|---|---|---|---|
| Dễ | Tranh 3 đĩa, mỗi đĩa 2 quả táo. Phép nhân nào? | 2 × 3 = 6 | 3 × 2, 2 + 3, 2 × 6 | CĐA |
| Dễ | 5 + 5 + 5 viết thành phép nhân | 5 × 3 | 3 × 5, 5 × 5, 5 + 3 | KT |
| TB | 2 × 5 viết thành tổng | 2 + 2 + 2 + 2 + 2 | 5 + 5, 2 + 5 | CĐA |
| TB | Tổng nào viết được thành phép nhân: 4 + 4 + 4; 4 + 4 + 5; 4 + 3 + 4 | 4 + 4 + 4 | hai tổng kia | CĐA |
| TB | Xếp 12 quả thành các hàng, mỗi hàng 3 quả, rồi viết phép nhân | 4 hàng, 3 × 4 = 12 | 4 × 3 | TH |
| Khó | Mỗi bàn có 2 bạn, có 5 bàn. Phép nhân nào? | 2 × 5 | 5 × 2, 2 + 5 | CĐA |
| Khó | 3 × 4 = ? (tính bằng cộng) | 12 | 7, 9, 15 | NS |
| Khó | 2 × 1 = ? | 2 | 1, 3, 21 | CĐA |

**Dạng câu hỏi:** TH (xếp quả thành hàng đều, gợi ý bản đồ: "xếp quả thành các hàng đều nhau rồi viết 4 + 4 + 4 thành 4 × 3"), KT (kéo số vào hai ô của phép nhân), CĐA.

**Ưu tiên: P0.** Trong M3 mốc 6T, nhóm "hiểu". Không có nội dung này thì 2.20 chỉ là học vẹt dãy số; phụ huynh không tự nhận ra con thuộc bảng mà không hiểu, game là chỗ duy nhất đo được điều đó (bé đúng 2 × 7 nhưng sai "mỗi bàn 2 bạn, 7 bàn"). Chưa có game.

### 2.20 Bảng nhân 2, bảng nhân 5

**Yêu cầu cần đạt**

- Lập bảng nhân 2 từ phép cộng lặp (2 × 1 = 2, 2 × 2 = 4, ..., 2 × 10 = 20) và nhận xét "tích sau hơn tích trước 2 đơn vị"; tương tự bảng nhân 5.
- Nhẩm đúng mọi phép trong hai bảng, thứ tự như SGK (2 × 7, không đảo).
- Khi quên, tự tìm lại bằng đếm thêm (2 × 7: đếm 2, 4, 6, 8, 10, 12, 14) hoặc từ dòng bên cạnh (2 × 7 = 2 × 6 + 2).
- Nhận ra tích bảng 5 luôn tận cùng 0 hoặc 5, tích bảng 2 luôn là số chẵn (dùng để tự kiểm tra).
- Tính với đơn vị đo: 2 kg × 5 = 10 kg, 5 cm × 3 = 15 cm.

**Tiên quyết:** 2.19, 2.1 (đếm thêm 2, thêm 5).

**Ngưỡng thành thạo:** kiểu K1. 9/10 ở 2 phiên cách nhau ít nhất 1 ngày; CĐA dưới 4 giây, NS dưới 6 giây; 40 câu phủ ít nhất 16 trong 20 dòng của hai bảng, có cả 2 × 1 và 5 × 10 (hai dòng bé hay bỏ qua). Báo cáo ghi riêng bảng 2 và bảng 5.

**Lỗi thường gặp**

| Lỗi | Ví dụ | Nhận biết qua đáp án sai | Mã |
|---|---|---|---|
| Nhầm ô bên cạnh (đếm thêm thừa hoặc thiếu một lần) | 2 × 7 = 12 hoặc 16; 5 × 6 = 25 hoặc 35 | v = a × (b ± 1) | `o-ben-canh` |
| Cộng thay nhân | 2 × 7 = 9; 5 × 4 = 9 | v = a + b | `cong-thay-nhan` |
| Nhầm bảng | 2 × 7 = 35 | v = 5 × b khi hỏi 2 × b | `nham-bang` |
| Sai chẵn lẻ bảng 5 | 5 × 7 = 30 | v tận cùng 0 khi b lẻ (trùng `o-ben-canh`) | `o-ben-canh` |
| Nhầm × 10 với × 1 hoặc thừa 0 | 2 × 10 = 2; 5 × 10 = 500 | v = a hoặc v = đ × 10 | `thieu-0`, `thua-0` |

**Ví dụ bài**

| Mức | Câu | Đáp án | Nhiễu | Dạng |
|---|---|---|---|---|
| Dễ | 2 × 3 | 6 | 4, 8, 5 | CĐA |
| Dễ | 5 × 2 | 10 | 5, 15, 7 | CĐA |
| TB | 2 × 7 | 14 | 12, 16, 9 | CĐA |
| TB | 5 × 6 | 30 | 25, 35, 11 | CĐA |
| TB | 2 × 9 | 18 | 16, 20, 11 | NS |
| Khó | 5 × 9 | 45 | 40, 50, 14 | NS |
| Khó | 5 × 8 | 40 | 35, 45, 13 | NS |
| Khó | Chém hai quả có tích bằng 20 trong 2, 10, 5, 4, 3 | 2 và 10, 5 và 4 | 5 và 3 | GĐ |

**Dạng câu hỏi:** CĐA (Ninja m1), NS (Vệ Binh bảng 2, bảng 5), GĐ. Lời mách lớp 2 phải là "đếm thêm 2" hoặc "lấy dòng trên cộng 2", không dùng mẹo lớp 3 kiểu "7 × 7 rồi cộng 7".

**Ưu tiên: P0.** Trong M1. Đã có hai game; việc cần làm là ánh xạ m1 và bảng 2, 5 của Vệ Binh vào cùng mã 2.20 trong báo cáo gộp, ghi mã lỗi, và kiểm tra lời mách của Vệ Binh cho bảng 2, 5 đúng cách đếm thêm.

### 2.21 Ý nghĩa phép chia: chia đều, chia theo nhóm

**Yêu cầu cần đạt**

- Chia đều: 6 cái bánh chia đều cho 2 bạn, mỗi bạn được 3 cái; viết 6 : 2 = 3, đọc "sáu chia hai bằng ba". Thao tác được bằng tay: chia từng cái lần lượt vào 2 đĩa cho đến hết.
- Chia theo nhóm: 6 cái bánh, mỗi bạn 2 cái, chia được cho 3 bạn; cũng viết 6 : 2 = 3. Thao tác: gom từng nhóm 2 cho đến hết rồi đếm số nhóm.
- Từ tranh viết phép chia đúng thứ tự (số bị chia là tổng số, viết trước).
- Bước đầu liên hệ nhân và chia: 2 × 3 = 6 nên 6 : 2 = 3.
- Nhận ra khi không chia đều được (7 quả cho 2 bạn còn dư 1); lớp 2 chỉ cần nói "không chia đều được", phép chia có dư là 3.18.

**Tiên quyết:** 2.19, 2.20.

**Ngưỡng thành thạo:** kiểu K3. 9/10 ở 2 phiên; CĐA dưới 10 giây, KT dưới 25 giây; 20 câu gồm 8 chia đều, 8 chia theo nhóm, 4 câu viết phép chia từ tranh. Báo cáo tách hai ý nghĩa vì bài toán có lời văn (2.26) dùng cả hai.

**Lỗi thường gặp**

| Lỗi | Ví dụ | Nhận biết qua đáp án sai | Mã |
|---|---|---|---|
| Viết ngược | 2 : 6 = 3 | số bị chia và số chia đổi chỗ | `dao-thu-tu` |
| Trừ thay chia | 6 : 2 = 4 | v = a − b | `tru-thay-chia` |
| Nhân thay chia | 6 : 2 = 12 | v = a × b | `nhan-thay-chia` |
| Chia không đều | đĩa 4 cái, đĩa 2 cái | các phần không bằng nhau khi kéo thả | `phan-khong-bang-nhau` |
| Đếm nhóm sai | gom nhóm 2 được 3 bạn nhưng nói 4 | số nhóm lệch 1 | `dem-nhom` |
| Nhầm hai câu hỏi | hỏi "mỗi bạn mấy cái" mà trả lời số bạn | v là số nhóm khi hỏi số phần tử (hoặc ngược lại), chỉ nhận ra khi hai số khác nhau | `khac` ("nhầm câu hỏi") |

**Ví dụ bài**

| Mức | Câu | Đáp án | Nhiễu | Dạng |
|---|---|---|---|---|
| Dễ | Kéo 6 cái bánh vào 2 đĩa cho đều nhau | mỗi đĩa 3; game viết 6 : 2 = 3 | | KT |
| Dễ | Có 8 quả, mỗi túi 2 quả. Được mấy túi? | 4 | 6, 16, 2 | CĐA |
| TB | 10 bông hoa cắm đều vào 5 lọ. Mỗi lọ mấy bông? | 10 : 5 = 2 | 5, 15, 50 | CĐA |
| TB | Tranh 12 cái kẹo chia đều cho 2 bạn. Phép chia nào? | 12 : 2 = 6 | 2 : 12, 12 − 2, 12 × 2 | CĐA |
| TB | 2 × 5 = 10, vậy 10 : 2 = ? | 5 | 8, 20, 2 | CĐA |
| Khó | 15 cái bánh, mỗi hộp 5 cái. Xếp được mấy hộp? | 3 | 10, 75, 5 | NS |
| Khó | 7 quả táo chia đều cho 2 bạn. Chia đều được không? | không, còn dư 1 | có | CĐA |
| Khó | Chọn đề đúng cho 20 : 5 = 4: "20 cái kẹo chia đều cho 5 bạn" hay "5 bạn, mỗi bạn 4 cái kẹo, có tất cả bao nhiêu cái?" | đề thứ nhất | đề thứ hai (là 4 × 5) | CĐA |

**Dạng câu hỏi:** KT (kéo bánh chia vào đĩa, game tự viết lại thành phép chia, gợi ý bản đồ), TH (gom nhóm), CĐA, NS.

**Ưu tiên: P0.** Trong M3 mốc 6T, nhóm "hiểu". Không có bài này thì 2.22 là học thuộc, và lỗi `tru-thay-chia` (42 : 7 = 35 ở lớp 3) chính là hậu quả của việc chưa từng chia bánh vào đĩa. Chưa có game.

### 2.22 Bảng chia 2, bảng chia 5

**Yêu cầu cần đạt**

- Lập bảng chia 2 từ bảng nhân 2 (2 : 2 = 1, 4 : 2 = 2, ..., 20 : 2 = 10) và bảng chia 5 (5 : 5 = 1, ..., 50 : 5 = 10).
- Nhẩm 14 : 2 = 7 bằng cách nghĩ ngược "2 nhân mấy bằng 14"; 35 : 5 = 7.
- Nhận ra số bị chia trong bảng 2 là số chẵn, trong bảng 5 tận cùng 0 hoặc 5 (tự kiểm tra: 13 : 2 không có trong bảng).
- Tính với đơn vị: 10 kg : 2 = 5 kg; 20 cm : 5 = 4 cm.
- Viết và đọc đúng: 14 : 2 = 7, "mười bốn chia hai bằng bảy".

**Tiên quyết:** 2.20, 2.21.

**Ngưỡng thành thạo:** kiểu K1. 9/10 ở 2 phiên; CĐA dưới 4 giây, NS dưới 6 giây; 40 câu phủ ít nhất 16 trong 20 dòng. Báo cáo ghi riêng bảng chia 2 và bảng chia 5, và đối chiếu với bảng nhân tương ứng ("con thuộc bảng nhân 5 nhưng bảng chia 5 mới đúng 6/10").

**Lỗi thường gặp**

| Lỗi | Ví dụ | Nhận biết qua đáp án sai | Mã |
|---|---|---|---|
| Trừ thay chia | 14 : 2 = 12 | v = a − b | `tru-thay-chia` |
| Ô bên cạnh | 14 : 2 = 6 hoặc 8; 35 : 5 = 6 hoặc 8 | v = đ ± 1 | `o-ben-canh` |
| Nhân thay chia | 14 : 2 = 28 | v = a × b | `nhan-thay-chia` |
| Nhầm bảng | 10 : 5 = 5 (làm 10 : 2) | v = a : 2 khi hỏi a : 5, hoặc ngược lại | `nham-bang` |
| Thiếu, thừa chữ số 0 | 50 : 5 = 1 hoặc 100 | v = đ : 10 hoặc đ × 10 | `thieu-0`, `thua-0` |
| Viết ngược khi tự lập bảng | 2 : 14 = 7 | số bị chia đứng sau | `dao-thu-tu` |

**Ví dụ bài**

| Mức | Câu | Đáp án | Nhiễu | Dạng |
|---|---|---|---|---|
| Dễ | 6 : 2 | 3 | 4, 12, 2 | CĐA |
| Dễ | 10 : 5 | 2 | 5, 50, 1 | CĐA |
| TB | 14 : 2 | 7 | 12, 6, 8 | CĐA |
| TB | 35 : 5 | 7 | 30, 6, 8 | CĐA |
| TB | 20 : 5 | 4 | 15, 10, 5 | NS |
| Khó | 45 : 5 | 9 | 40, 8, 10 | NS |
| Khó | 18 : 2 | 9 | 16, 8, 10 | NS |
| Khó | 50 : 5 | 10 | 45, 1, 100 | NS |

**Dạng câu hỏi:** CĐA (Ninja d1, viết 14 : 2 như SGK), NS (Vệ Binh bảng 2, 5, phần Chia), GĐ (hai quả chia nhau bằng số cho trước).

**Ưu tiên: P0.** Trong M1. Đã có game; cần ánh xạ d1 và bảng chia 2, 5 của Vệ Binh vào mã 2.22, ghi mã lỗi (`tru-thay-chia` là lỗi phụ huynh cần thấy sớm nhất).

### 2.23 Gọi tên thừa số, tích, số bị chia, số chia, thương

**Yêu cầu cần đạt**

- Trong 2 × 7 = 14 chỉ ra 2 và 7 là thừa số, 14 là tích; biết "2 × 7" cũng gọi là tích.
- Trong 14 : 2 = 7 chỉ ra 14 là số bị chia, 2 là số chia, 7 là thương; biết "14 : 2" cũng gọi là thương.
- Từ tên ra phép tính: "tính tích của 5 và 4" là 5 × 4 = 20; "tính thương của 20 và 5" là 20 : 5 = 4; "số bị chia là 30, số chia là 5, thương là 6".
- Hiểu lời mách dùng tên gọi ở 2.24 và 3.19: "muốn tìm thừa số chưa biết, lấy tích chia cho thừa số kia".

**Tiên quyết:** 2.20, 2.22, 2.14.

**Ngưỡng thành thạo:** kiểu K3. 9/10 dưới 8 giây; 20 câu phủ đủ năm tên gọi và hai chiều; 2 phiên.

**Lỗi thường gặp**

| Lỗi | Ví dụ | Nhận biết qua đáp án sai | Mã |
|---|---|---|---|
| Đảo số bị chia và số chia | kéo nhãn "số chia" vào 14 trong 14 : 2 = 7 | hai nhãn hoán đổi | `ten-thanh-phan` |
| Gọi tích là "tổng", gọi thương là "tích" | 5 × 7 = 35, hỏi 35 gọi là gì, chọn "tổng" | chọn tên của phép khác | `ten-thanh-phan` |
| Nghe "tích" vẫn cộng | "tích của 5 và 4" ra 9 | v = a + b | `cong-thay-nhan` |
| Nghe "thương" lại trừ | "thương của 20 và 5" ra 15 | v = a − b | `tru-thay-chia` |

**Ví dụ bài**

| Mức | Câu | Đáp án | Nhiễu | Dạng |
|---|---|---|---|---|
| Dễ | Kéo nhãn "thừa số", "thừa số", "tích" vào 2 × 7 = 14 | 2, 7 thừa số; 14 tích | | KT |
| Dễ | Trong 14 : 2 = 7, số chia là số nào? | 2 | 14, 7 | CĐA |
| TB | Tính tích của 5 và 4 | 20 | 9, 1 | NS |
| TB | Tính thương của 20 và 5 | 4 | 15, 100, 25 | NS |
| TB | Trong 5 × 7 = 35, số 35 gọi là gì? | tích | tổng, thừa số, thương | CĐA |
| Khó | Số bị chia là 30, số chia là 5. Thương là bao nhiêu? | 6 | 25, 150, 35 | NS |
| Khó | Tích của hai số là 18, một thừa số là 2. Thừa số kia là? | 9 | 16, 36, 20 | NS |
| Khó | Ghép ba nhãn với ba số trong 45 : 5 = 9 | 45 số bị chia, 5 số chia, 9 thương | | GĐ |

**Dạng câu hỏi:** KT (ghép nhãn vào phép tính, dùng lại màn bài học của Tháp Đồng Hồ như gợi ý bản đồ), CĐA, GĐ, NS.

**Ưu tiên: P2.** Cùng lý do với 2.14: là ngôn ngữ, rẻ, cần cho lời mách. Làm thành bài học ngắn kèm 3 câu hỏi đáp đặt trước màn 2.24, không làm game riêng.

### 2.24 Quan hệ giữa phép nhân và phép chia

**Yêu cầu cần đạt**

- Từ 2 × 7 = 14 viết được hai phép chia 14 : 2 = 7 và 14 : 7 = 2 (SGK lớp 2: "từ một phép nhân viết được hai phép chia").
- Từ bộ ba số (2, 7, 14) hoặc tranh 2 hàng 7 quả, viết một phép nhân và hai phép chia. Viết thêm 7 × 2 = 14 không sai nhưng lớp 2 chưa yêu cầu; bộ bốn phép tính có giao hoán là mức lớp 3.
- Thử lại phép chia bằng phép nhân: 35 : 5 = 7 vì 5 × 7 = 35; phát hiện được phép chia sai nhờ thử lại.
- Dùng quan hệ này để tìm kết quả phép chia trong bảng khi quên: 45 : 5 là "5 nhân mấy bằng 45".
- Điền thừa số hoặc số chia còn thiếu trong bảng 2, 5 bằng cách nghĩ ngược: ? × 5 = 35, 45 : ? = 9 (chưa cần quy tắc "lấy tích chia cho thừa số kia", quy tắc ấy là 3.19).

**Tiên quyết:** 2.20, 2.22, 2.23.

**Ngưỡng thành thạo:** kiểu K3. 9/10 ở 2 phiên; CĐA dưới 10 giây, KT "bộ ba" dưới 25 giây; 20 câu, gồm ít nhất 6 câu viết phép chia từ phép nhân, 6 câu thử lại, 4 câu điền thừa số hoặc số chia.

**Lỗi thường gặp**

| Lỗi | Ví dụ | Nhận biết qua đáp án sai | Mã |
|---|---|---|---|
| Viết phép chia ngược | 2 : 14 = 7 | số bị chia không phải tích | `dao-thu-tu` |
| Nhầm thương với số chia | 14 : 2 = 2 | v = b | `ten-thanh-phan` |
| Chọn phép chia ngoài bộ ba | từ 2 × 7 = 14 viết 14 : 5 | phép chia có số không thuộc bộ ba | `khac` ("khác bộ ba") |
| Thử lại bằng ô bên cạnh | 35 : 5 = 6 "vì 5 × 6 = 30" | v = đ ± 1 | `o-ben-canh` |
| Trừ thay chia khi nghĩ ngược | 14 : 2 = 12 | v = a − b | `tru-thay-chia` |

**Ví dụ bài**

| Mức | Câu | Đáp án | Nhiễu | Dạng |
|---|---|---|---|---|
| Dễ | Từ 2 × 5 = 10 viết hai phép chia | 10 : 2 = 5, 10 : 5 = 2 | 2 : 10, 5 : 10 | KT |
| Dễ | 15 : 5 = 3 vì 5 × ? = 15 | 3 | 10, 5, 20 | CĐA |
| TB | Bộ ba 2, 9, 18: phép nào không thuộc bộ? 18 : 9 = 2; 2 × 9 = 18; 18 − 9 = 9 | 18 − 9 = 9 | hai phép kia | CĐA |
| TB | Tranh 4 hàng, mỗi hàng 5 quả: viết một phép nhân và hai phép chia | 5 × 4 = 20, 20 : 5 = 4, 20 : 4 = 5 | 4 × 5 (chấp nhận, không tính sai) | KT |
| TB | 40 : 5 = 8, vậy 40 : 8 = ? | 5 | 35, 8, 320 | CĐA |
| Khó | ? × 5 = 35 | 7 | 30, 6, 40 | NS |
| Khó | 45 : ? = 9 | 5 | 36, 4, 405 | NS |
| Khó | Bin làm 35 : 5 = 6. Đúng hay sai? Vì sao? | sai, vì 5 × 6 = 30 | đúng | CĐA |

**Dạng câu hỏi:** KT "bộ ba" (kéo ba số vào ba phép tính đang trống), CĐA, NS, GĐ (Ninja p6 "Nhân bằng…" và p7 "Chia bằng…" là dạng này nhưng lấy cả bảng đến 9, tức lớp 3; cần biến thể chỉ dùng bảng 2, 5 để gắn mã 2.24).

**Ưu tiên: P0.** Trong M3 mốc 3T (nâng từ "một phần"). Là điều giúp bé không phải học bảng chia như một bảng mới, và là nền của 3.19; bé sai 2.24 mà đúng 2.22 là bé đang thuộc vẹt bảng chia, tín hiệu đáng giá cho phụ huynh.

### 2.25 Một phần hai, một phần năm

Cần giáo viên rà: vị trí của nội dung này khác nhau giữa ba bộ SGK 2018 (có bộ giới thiệu ngay sau bảng chia 2 và 5 ở mức nhận biết qua hình, có bộ dồn sang "một phần mấy" ở lớp 3, mã 3.22). Spec viết theo bản đồ, ở mức nhận biết qua hình; ký hiệu viết dạng phân số có gạch ngang như SGK (trong văn bản này ghi 1/2, 1/5 cho gọn).

**Yêu cầu cần đạt**

- Nhận biết một phần hai (một nửa) của một hình: hình được chia thành 2 phần bằng nhau, đã tô 1 phần; đọc "một phần hai", viết 1/2.
- Nhận biết một phần năm tương tự với hình chia 5 phần bằng nhau, tô 1 phần.
- Chọn đúng hình đã tô 1/2 (hoặc 1/5) trong nhiều hình, trong đó có hình chia không đều.
- Tự tô 1/2, 1/5 của hình cho trước.
- Gắn với phép chia qua hình: khoanh 1/2 số con thỏ trong tranh 8 con (4 con, vì 8 : 2 = 4); khoanh 1/5 số quả trong tranh 10 quả (2 quả). Chỉ yêu cầu làm trên hình, chưa yêu cầu quy tắc.

**Tiên quyết:** 2.21, 2.22.

**Ngưỡng thành thạo:** kiểu K3. 8/10 ở 2 phiên; CĐA dưới 8 giây, TH dưới 20 giây; 20 câu, mỗi phiên có ít nhất 5 hình bẫy (chia không đều, hoặc số phần khác 2 và 5).

**Lỗi thường gặp**

| Lỗi | Ví dụ | Nhận biết qua đáp án sai | Mã |
|---|---|---|---|
| Chọn hình chia không bằng nhau | hình chữ nhật chia hai phần to nhỏ, tô phần to, bé nói 1/2 | chọn hình có các phần không bằng nhau | `phan-khong-bang-nhau` |
| Nhầm 1/2 với 1/5 | hình chia 5 tô 1 phần, bé nói 1/2 | chọn tên phần theo hình khác | `phan-khong-bang-nhau` |
| Tô số phần bằng mẫu số | tô 2 phần cho 1/2, 5 phần cho 1/5 | số phần tô bằng mẫu số | `khac` ("tô cả mẫu số") |
| Lấy mẫu số hoặc trừ đi mẫu số khi khoanh | 1/2 của 10 quả khoanh 2 quả hoặc 8 quả | v = b hoặc v = a − b | `tru-thay-chia` |

**Ví dụ bài**

| Mức | Câu | Đáp án | Nhiễu | Dạng |
|---|---|---|---|---|
| Dễ | Hình tròn chia đôi, tô 1 phần. Đã tô một phần mấy hình tròn? | 1/2 | 1/5, "hai phần" | CĐA |
| Dễ | Tô 1/2 hình chữ nhật đã chia 2 ô bằng nhau | tô 1 ô | tô 2 ô | TH |
| TB | Hình nào đã tô 1/2? (a) chia 2 phần không đều, tô 1; (b) chia 4 phần đều, tô 1; (c) chia 2 phần đều, tô 1 | (c) | (a), (b) | CĐA |
| TB | Hình chia 5 phần bằng nhau, tô 1 phần. Đã tô một phần mấy? | 1/5 | 1/2, "5 phần" | CĐA |
| TB | Tô 1/5 hình chữ nhật đã chia 5 ô | tô 1 ô | tô 5 ô, tô 2 ô | TH |
| Khó | Khoanh 1/2 số con thỏ trong tranh 8 con | 4 con | 2 con, 6 con | TH |
| Khó | Khoanh 1/5 số quả cam trong tranh 10 quả | 2 quả | 5 quả, 8 quả | TH |
| Khó | Hình nào KHÔNG được tô 1/2? | hình chia không đều | các hình chia đều | CĐA |

**Dạng câu hỏi:** TH (cắt bánh, tô phần, khoanh nhóm; gợi ý bản đồ), CĐA.

**Ưu tiên: P2.** Chỉ ở mức nhận biết, ít bài trong SGK, giá trị báo cáo thấp và vị trí lớp chưa chắc. Làm cùng 3.22 ở lớp 3 với chung một màn "chia đàn cá thành các phần bằng nhau".

### 2.26 Giải bài toán bằng một phép nhân hoặc một phép chia

**Yêu cầu cần đạt**

- Đọc (hoặc nghe) đề có tranh, nhận ra ba tình huống: "mỗi ... có ..., có ... như thế" là phép nhân (mỗi bàn 2 bạn, 5 bàn: 2 × 5 = 10); "chia đều cho" là phép chia tìm số phần tử mỗi phần (10 cái kẹo chia đều cho 5 bạn: 10 : 5 = 2); "mỗi ... được ..., hỏi được mấy ..." là phép chia tìm số nhóm (10 cái kẹo, mỗi bạn 2 cái: 10 : 2 = 5).
- Viết phép nhân đúng thứ tự (số được lấy trước) và đúng đơn vị: 2 × 5 = 10 (bạn), không phải 10 (bàn).
- Trình bày mẫu SGK: Bài giải, câu lời giải, phép tính, Đáp số.
- Số liệu trong bảng nhân, chia 2 và 5.

**Tiên quyết:** 2.19, 2.21 (bắt buộc, vì đây là chỗ hai ý nghĩa được dùng), 2.20, 2.22, 2.18 (cách trình bày).

**Ngưỡng thành thạo:** kiểu K4. Chọn đúng phép 4/5 và tính đúng 4/5 ở 2 phiên; cả bài dưới 40 giây; 15 bài chia đều ba tình huống (5 nhân, 5 chia đều, 5 chia theo nhóm), trộn lẫn trong một màn. Không gắn nhãn nếu bé chỉ chơi màn toàn bài nhân.

**Lỗi thường gặp**

| Lỗi | Ví dụ | Nhận biết qua đáp án sai | Mã |
|---|---|---|---|
| Chọn nhân thay chia hoặc ngược lại | "10 cái kẹo chia đều cho 5 bạn" làm 10 × 5 | chọn dấu ngược | `sai-phep`, `nhan-thay-chia` |
| Chọn cộng | "mỗi bàn 2 bạn, 5 bàn" làm 2 + 5 = 7 | chọn dấu + | `sai-phep`, `cong-thay-nhan` |
| Đảo thứ tự thừa số | 5 × 2 = 10 | tích đúng, thứ tự ngược; không trừ tim, hỏi lại | `dao-thu-tu` |
| Đảo số bị chia | 5 : 10 | số bị chia không phải tổng số | `dao-thu-tu` |
| Sai đơn vị | "10 bàn" thay "10 bạn" | chọn sai thẻ đơn vị | `khac` ("đơn vị") |
| Đúng phép, tính sai | 2 × 5 = 12 | mã của phép tính bên trong | `o-ben-canh` |

**Ví dụ bài**

| Mức | Câu | Đáp án | Nhiễu (phép tính) | Dạng |
|---|---|---|---|---|
| Dễ | Mỗi bàn có 2 bạn. Hỏi 5 bàn như thế có bao nhiêu bạn? | 2 × 5 = 10 (bạn) | 5 × 2, 2 + 5, 10 : 2 | 2B |
| Dễ | Có 10 cái kẹo chia đều cho 5 bạn. Hỏi mỗi bạn được mấy cái kẹo? | 10 : 5 = 2 (cái) | 10 × 5, 10 − 5 | 2B |
| TB | Có 10 cái kẹo, chia cho mỗi bạn 2 cái. Hỏi chia được cho mấy bạn? | 10 : 2 = 5 (bạn) | 2 × 10, 10 − 2 | 2B |
| TB | Mỗi túi có 5 kg gạo. Hỏi 4 túi như thế có bao nhiêu ki-lô-gam gạo? | 5 × 4 = 20 (kg) | 4 × 5, 5 + 4 | 2B |
| TB | Mỗi xe đạp có 2 bánh. Hỏi 8 xe đạp có bao nhiêu bánh xe? | 2 × 8 = 16 (bánh) | 8 × 2, 2 + 8 | 2B |
| Khó | Có 20 quyển vở xếp đều vào 5 ngăn. Hỏi mỗi ngăn có mấy quyển vở? | 20 : 5 = 4 (quyển) | 20 : 4, 20 × 5 | 2B |
| Khó | Có 18 bạn xếp thành các hàng, mỗi hàng 2 bạn. Hỏi xếp được mấy hàng? | 18 : 2 = 9 (hàng) | 18 − 2, 18 × 2 | 2B |
| Khó | Có 5 đĩa, mỗi đĩa có 5 quả cam. Hỏi có tất cả bao nhiêu quả cam? | 5 × 5 = 25 (quả) | 5 + 5, 5 : 5 | 2B |

**Dạng câu hỏi:** 2B với bước đầu là "chọn dấu × hay :" (gợi ý bản đồ), rồi chọn hoặc nhập phép tính đầy đủ, nhập kết quả, chọn đơn vị. Đề viết tay, rà SGK (M10); bộ đề ban đầu 45 bài (15 mỗi tình huống).

**Ưu tiên: P1.** Trong M3 mốc 12T. Là bài kiểm tra thật sự cho toàn bộ mạch nhân chia lớp 2 (bé thuộc bảng mà không chọn được dấu là chưa hiểu 2.19 và 2.21). Xếp sau P0 vì tốn công viết đề và phải có 2.19, 2.21 trước.

## 6. Ánh xạ màn chơi hiện có sang mã lớp 2

Đề xuất cho bảng ánh xạ của M12 (mục (3)). Một màn có thể ghi vào nhiều mã, quyết định theo từng câu chứ không theo màn.

| Game | Màn | Mã | Cách tách theo câu |
|---|---|---|---|
| Ninja | a3 Cộng trừ có nhớ | 2.8, 2.9 | theo dấu: + là 2.8, − là 2.9 |
| Ninja | a4 Phạm vi 100 | 2.10, 2.11 | theo cờ có nhớ hoặc mượn của câu |
| Ninja | a5 Phạm vi 1000 | 2.12, 3.7 | không quá một lượt nhớ là 2.12, hai lượt là 3.7; cần thêm cờ `carries` vào bộ sinh |
| Ninja | m1 Nhân 2 và 5 | 2.20 | câu có × 10 ghi vào 2.20 kèm ghi chú; không tách mã riêng |
| Ninja | d1 Chia cho 2 và 5 | 2.22 | như trên |
| Ninja | a6 Siêu Ninja | theo câu | `gen20` là L1.4; `genCarry20` là 2.8 hoặc 2.9; `gen100` là 2.10 hoặc 2.11; `genMul9`, `genDiv9` là 3.12, 3.13; `genRound1000` là 2.13 |
| Ninja | p1 Bạn của 10 | L1.2 | không ghi vào mã lớp 2 |
| Ninja | p2 Cộng trong 20, p3 Trừ trong 20 | 2.8, 2.9 (dạng ẩn của 2.15) | ghi vào 2.8 và 2.9; khi có màn 2.15 thật thì ghi thêm 2.15 với trọng số thấp |
| Ninja | p4 Bạn của 100 | 2.11, 2.13 | cặp tròn chục (30 + 70) là 2.13, cặp có nhớ (45 + 55) là 2.11 |
| Ninja | p5 Cộng trong 100 | 2.10, 2.11 | theo cờ có nhớ; game gắn màn này lớp 3 nhưng nội dung là lớp 2 |
| Ninja | p6 Nhân bằng…, p7 Chia bằng… | 2.24 hoặc 3.19 | cả hai thừa số thuộc {2, 5, 10} là 2.24; còn lại là 3.19 và 3.12, 3.13 |
| Vệ Binh | Bảng 2, Bảng 5, phần Nhân | 2.20 | |
| Vệ Binh | Bảng 2, Bảng 5, phần Chia | 2.22 | |
| Vệ Binh | Thử thách Bảng 2 và 5 | 2.20, 2.22 | theo dấu |
| Vệ Binh | Tìm thừa số | 3.19 | 2.24 khi chỉ dùng bảng 2, 5 |
| Vệ Binh | Nhân chia số lớn | 3.14, 3.16 | không thuộc lớp 2 |
| Bốn game đồng hồ | mọi màn | B2.11, B2.12, B3.17, B3.18 | ngoài phạm vi spec này |

Nội dung lớp 2 chưa có màn nào: 2.1 đến 2.7, 2.14, 2.16, 2.17, 2.18, 2.19, 2.21, 2.23, 2.25, 2.26. Nội dung có màn nhưng thống kê chưa tách được: 2.8, 2.9 (a3 gộp), 2.10, 2.11 (a4 gộp), 2.12 (a5 vượt mức), 2.13 (lẫn trong a4, a5, a6), 2.15 và 2.24 (chỉ dạng ẩn).

## 7. Câu hỏi mở và điểm cần giáo viên rà

| Câu hỏi | Ai trả lời | Hạn |
|---|---|---|
| Cách viết thành phần chưa biết ở lớp 2 (ô trống, dấu ?, hay chữ x) trong từng bộ SGK, để màn 2.15 hiện đúng | Giáo viên rà theo bảng kiểm SGK (M10) | 2026-11-30 |
| 2.25 có nằm trong lớp 2 của bộ sách gia đình dùng không; nếu không, gộp hẳn vào 3.22 | Giáo viên | 2026-11-30 |
| Xác nhận phạm vi 2.12 lớp 2 là "có nhớ không quá một lượt" và cách SGK gọi ("nhớ" hay "mượn", "trả") ở phép trừ | Giáo viên | 2026-11-30 |
| Danh sách cách đọc số chấp nhận trong 2.4 ("linh" và "lẻ", "tư" và "bốn") theo vùng | Giáo viên | 2026-11-30 |
| Cách xử lý `dao-thu-tu` (không trừ tim, hỏi lại) có giữ được tinh thần M5 không, hay bé thấy bị bắt bẻ | Review với nhân vật Bin và cô giáo trong `02-nhan-vat-ao.md` | 3T |
| Ngưỡng dưới 4 giây cho K1 có hợp với quả đang bay của Ninja không (thời gian bay của quả có thể dài hơn) | Đo trên số nền 3T, chỉnh theo màn | 3T |
| 40 câu tối thiểu cho K1 tương đương 3 đến 4 ván 1 phút; có nên hạ còn 30 với bé chơi ván 1 phút | Đo số nền | 3T |
| Trùng mã lỗi (526 − 173: trừ ngược và quên mượn cùng ra 453) xử lý ở bộ sinh (tránh câu trùng) hay ở báo cáo (đếm cả hai) | Người bảo trì, ghi ADR nếu đổi | 2026-10-31 |

## 8. Kế hoạch kiểm chứng

- Bộ sinh đề của mỗi mã sinh 10 000 câu và kiểm tra: đáp án đúng, không có nhiễu trùng đáp án hay trùng nhau, nhiễu trong phạm vi số của mã, mỗi câu có ít nhất một nhiễu là lỗi có tên (M10).
- Mọi ví dụ trong tài liệu này được đưa vào kiểm thử: đưa từng đáp án nhiễu qua hàm nhận biết lỗi phải trả về đúng mã ghi trong cột "Mã"; kiểm thử này nằm trong `tests/` cùng với bảng ánh xạ ở mục 6.
- Bảng kiểm SGK: giáo viên rà các mục ghi "Cần giáo viên rà" và các lời mách trước khi phát hành màn mới.
- Thử với 3 bé lớp 2 thật (một bé kiểu Bin) ở mốc 3T: quan sát xem ngưỡng thời gian K1 và K2 có làm bé hụt hơi không, và bé có hiểu lời mách gọi tên lỗi không.
- Chuyển sang "Đã duyệt" khi: giáo viên rà xong mục 7, bảng ánh xạ mục 6 được đưa vào ít nhất Ninja và Vệ Binh, và số nền 3T cho thấy ngưỡng không cần đổi quá một bậc.

## Lịch sử thay đổi

| Ngày | Thay đổi | Bởi |
|---|---|---|
| 2026-09-10 | Bản đầu: 26 nội dung, khung ngưỡng, bộ mã lỗi, ánh xạ màn | 3hoa |
