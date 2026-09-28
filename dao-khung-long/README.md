# Đảo Khủng Long

Game học Toán lớp 2 (SGK Kết nối tri thức với cuộc sống) cho iPad xoay ngang. Bé có hồ sơ riêng trên máy, ấp một quả trứng khủng long (Rex Dũng Mãnh hoặc Mây Dễ Thương), đi quanh hòn đảo 10 vùng đất và giải toán bằng nhiều kiểu game. Mỗi thao tác chơi được ghi vào nhật ký theo lược đồ sự kiện v1 để phụ huynh (và sau này một LLM) biết chính xác bé sai ở đâu.

Kế hoạch và mockup: artifact “Đảo Khủng Long” bản 2. Spec: `docs/du-an-toan-2-3/spec/06-theo-doi-hoc-tap.md`, `06-su-kien-v1.schema.json`, `03a-chuong-trinh-lop-2.md`.

## Giai đoạn 1

| Hạng mục | Có gì |
|---|---|
| Hồ sơ | Con là ai (tối đa 8 bé, hỏi lại sau 12 giờ), tạo hồ sơ 3 bước: tên, tuổi 5 đến 11, lớp gợi ý từ tuổi và năm học để xác nhận; mỗi tháng 9 hỏi lên lớp |
| Chọn trứng | Dũng Mãnh (Rex) hoặc Dễ Thương (Mây), không gán theo giới tính |
| Bản đồ | 10 vùng + 2 đấu trường đặt trên ảnh đảo; vùng học kì 2 khóa với lớp 2 cho tới khoảng Bài 37; vùng chưa có game hiện “Sắp có” |
| Nhiệm vụ hôm nay | 3 nhiệm vụ lập từ hồ sơ học tập: ôn nhanh cách quãng, luyện lại chỗ yếu (kèm lý do như “Con hay quên nhớ 1”), học mới theo bài đang học |
| Trang vùng | Trứng của vùng với vòng tiến độ, mức thành thạo từng màn, nhãn lỗi hay gặp, sao, cúp luyện tập chung |
| Đua Xe | Vùng 2 (cộng, trừ qua 10, tìm số còn thiếu), vùng 4 (cộng, trừ có nhớ trong 100, nhẩm tròn chục, biểu thức hai dấu), từ giai đoạn 2 thêm vùng 8 (cộng, trừ trong 1000) |
| Kết thúc màn | Sao, số câu đúng, câu tự làm, câu sửa được, quả mọng và cách tính, thanh lớn lên, 3 mặt cảm xúc |
| Ăn mừng | Trứng đầu tiên nở, khủng long lớn lên, trứng của vùng nở (đặt tên cho bạn mới) |
| Góc phụ huynh (bản đầu) | Cổng phép nhân của người lớn; sửa tuổi, lớp, bài đang học; tải nhật ký JSONL; tính lại tóm tắt từ nhật ký; xóa dữ liệu của bé |

### Đua Xe

- Ba làn, ba cổng đáp án. Chạm nửa trái hoặc nửa phải màn hình (hoặc phím mũi tên) để đổi làn; nút “Lao tới!” (phím mũi tên lên, phím cách) để về cổng nhanh.
- Cổng đúng: cộng điểm, 3 câu đúng liền thì TĂNG TỐC. Cổng sai: xe chậm lại (không đâm), màn “Gần đúng rồi!” gọi tên lỗi, đặt tính cột dọc hoặc tách 10 như SGK, nút xem bằng que tính. Câu sai quay lại sau 2 câu (tối đa 2 lần trong ván). Bé không chạm gì mà xe tự vào cổng sai thì câu tính là hết giờ (không gán lỗi), khủng long nhắc cách đổi làn và câu quay lại; bé tạm dừng lúc lời giải sắp mở thì lời giải mở khi bé bấm Chơi tiếp.
- Gợi ý 3 cấp (cấp 3 gạch bớt một cổng sai); câu dùng gợi ý không tính là tự làm.
- Màn có trạm dừng (vùng 4 màn 2, màn 5 và hai cúp): câu 4, 8, 12 bắt tự gõ đáp án, được thử 2 lần.
- Đua với bóng kỷ lục của chính mình; thời gian xem lời giải và gõ ở trạm dừng không tính vào thời gian đua.
- Thời gian mỗi câu theo kỹ năng (7 giây với bảng cộng, 13 đến 18 giây với phép có nhớ và biểu thức), tự dãn khi bé sai và rút ngắn nhẹ khi bé quyết nhanh.

### Quả mọng và mức lớn

- Câu tự làm đúng +3 (kỹ năng đã Vững chắc +1), đúng nhờ gợi ý hoặc lần 2 +1, sửa được câu từng sai +2 thêm, sai 0 (không bao giờ bị trừ). Kỹ năng lên Đã thuộc +50 (mỗi kỹ năng một lần, `ho_so.thuong_da_thuoc`), xong cả 3 nhiệm vụ trong ngày +20. Bỏ dở vẫn giữ quả mọng đã có.
- Mức lớn: Trứng, Trứng lay động, Sơ sinh, Nhí (500), Thiếu niên (1 200 và 3 nội dung đã thuộc), Trưởng thành (2 500 và 8 đã thuộc), Huyền thoại (5 000 và 1 đấu trường).
- Khác với kế hoạch: trứng đầu tiên nở khi bé đua xong ván đầu tiên (thay vì mốc 100 quả mọng) để bé thấy trứng nở ngay buổi đầu. Các con số nằm ở `HocTap.MUC_LON`, chỉnh sau khi thử với bé thật.
- Trứng của vùng nở khi mọi kỹ năng của các màn đang chơi được trong vùng đạt Đã thuộc (ở giai đoạn này chưa tính màn Truyện Tranh của vùng 2).

## Giai đoạn 2: game mới đợt 1, số và phép tính

Ba thể loại mới, bài học 30 giây, ngân hàng câu cho số, nhân chia và bài toán có lời văn. Vùng 1, 2, 4, 7, 8 mỗi vùng có ít nhất 2 thể loại.

| Vùng | Màn (bài SGK · thể loại) |
|---|---|
| 1 Bờ Biển Số 100 | Chục và đơn vị (Bài 1 · Xếp Hình Số), Số liền trước, liền sau (Bài 2 · Lật Thẻ), Hơn, kém nhau bao nhiêu (Bài 4, 5 · Truyện Tranh), Cúp (Lật Thẻ) |
| 2 Núi Lửa Qua 10 | 3 màn Đua Xe cũ, Bài toán thêm, bớt (Bài 9 · Truyện Tranh), Nhiều hơn, ít hơn (Bài 13 · Truyện Tranh), Lật thẻ bảng cộng, bảng trừ (luyện tập), Cúp (Đua Xe) |
| 4 Đường Đua Có Nhớ | 5 màn Đua Xe cũ, Bài toán có lời văn có nhớ (Truyện Tranh), Cặp tấm thẻ anh em (Bài 24 · Lật Thẻ, luyện tập), Cúp (Đua Xe) |
| 7 Thung Lũng Nhân Chia | Phép nhân (Bài 37, 38 · Lật Thẻ), Bảng nhân 2, 5 (Lật Thẻ), Phép chia (Bài 41, 42 · Truyện Tranh), Bảng chia 2, 5 (Lật Thẻ), Bài toán nhân, chia (Bài 45 · Truyện Tranh), Cúp (Lật Thẻ) |
| 8 Kim Tự Tháp 1000 | Trăm, chục, đơn vị (Bài 48 đến 52 · Xếp Hình Số), Đọc, viết số có ba chữ số (Bài 51 · Xếp Hình Số), Lật thẻ số và tổng (Bài 52, luyện tập), Cộng, trừ trong 1000 (Bài 59 đến 62 · Đua Xe có trạm dừng) |

Màn “luyện tập” luyện lại kỹ năng của màn khác bằng thể loại khác: không có kỹ năng riêng, không tính vào trứng vùng. Cúp cũ của vùng 2 và 4 vẫn chỉ cần các màn Đua Xe như giai đoạn 1 (`cup_can`).

### Khung chơi chung (`khung-choi.js`)

Truyện Tranh, Lật Thẻ, Xếp Hình Số dùng chung một khung như mockup: câu hỏi ở trên (có nút nghe), điểm và số câu bên trái, gợi ý và tạm dừng bên phải, thanh tiến độ, bóng gợi ý của khủng long, màn “Gần đúng rồi” (ghi `phan_hoi_xem` rồi đóng câu sai, câu quay lại sau 2 câu), tạm dừng (âm thanh, giọng đọc, xem lại bài học, về đảo). Game chỉ vẽ phần chơi ở giữa.

### Lật Thẻ Anh Em

- Trò “Cặp tấm thẻ anh em” của SGK Bài 24: bên trái 6 thẻ phép tính úp (mặt sau do Codex vẽ), bên phải 8 thẻ kết quả gồm đáp án của 6 thẻ và 2 thẻ nhiễu “gần đúng” mang mã lỗi (quên mượn, ô bên cạnh, đảo thứ tự…).
- Bé lật một thẻ phép tính rồi chạm thẻ anh em. Sai được thử lại một lần; sai lần nữa thì xem lời giải, cặp đó rời bàn và câu quay lại ở bàn sau. Ghép đúng liền 3 cặp được thưởng điểm.
- Thẻ có thể là phép tính (35 − 8), cách đọc số (hai trăm linh năm), tổng (400 + 8), “liền sau của 39”, tổng các số hạng bằng nhau (2 + 2 + 2), hoặc tranh các nhóm đồ vật.
- Gợi ý cấp 3 gạch bớt một thẻ sai (giữ lại thẻ mang lỗi có tên). Ghi `lat` (thẻ nào, vị trí), `chon` (thẻ kết quả, vị trí), `lua_chon` của câu là các thẻ đang có trên bàn.

### Xếp Hình Số

- Dựng số bằng mô hình khối như SGK: chạm máy thả trên cột Trăm, Chục, Đơn vị để thả một tấm trăm (lưới 10 × 10), thanh chục (10 ô), khối đơn vị; chạm nút − để lấy ra. Vùng 1 chỉ có Chục và Đơn vị.
- Thả tới khối thứ 10 thì 10 đơn vị tự gộp thành 1 chục (10 chục thành 1 trăm), có chữ bay “10 đơn vị = 1 chục”.
- Đề: “Xếp số 205”, “hai trăm linh năm” (có giọng đọc), “200 + 5”, “gồm 2 trăm và 5 đơn vị”. Bấm Xong để chấm; đúng thì hiện “205 = 200 + 5 · hai trăm linh năm” và xây thêm một tầng tháp.
- Xếp 250 hay 25 cho 205 là lỗi `doc-so`; lời giải có hình mô hình khối. Ghi `tha` (khối, cột, giá trị sau khi thả, có gộp không), `bo_chon`, `tra_loi` kèm số khối từng cột.

### Truyện Tranh

- Bài toán có lời văn kể bằng 3 khung tranh có giọng đọc: nhân vật là khủng long của đảo, đồ vật hiện đúng số lượng khi số nhỏ (từ 21 trở lên hiện “× số”).
- Bước 1 chọn phép tính (thẻ nhiễu: sai phép, đảo thứ tự thừa số), bước 2 tự gõ kết quả. Hai bước chấm riêng: chọn sai phép thì giải thích (đọc lại truyện, vì sao là phép cộng) rồi vẫn cho tính để đo riêng phần tính; câu đó tính là sai và quay lại. Đảo thứ tự 5 × 2 thay 2 × 5 không tính là sai: nhắc “2 được lấy 5 lần” rồi cho chọn lại (03a mục 2.19).
- Đúng cả hai bước thì hiện “Bài giải” như SGK: câu lời giải, phép tính có đơn vị, đáp số.
- 47 đề viết tay theo SGK (Bài 4, 9, 13, 19 đến 24, 37 đến 45) trong `NganHang.MAU_LOI_VAN`; số thay đổi trong phạm vi của từng kỹ năng. Mỗi màn trộn phép để bé không đoán phép theo tên màn; vùng 4 có bài “lúc đầu” (có chữ “bán”, “còn lại” nhưng phải cộng).
- Ghi `nghe_lai`, `chon` (bước 1), `go_so`, `xoa` (bước 2); `tra_loi` có trường `buoc`. Tóm tắt câu có thêm `buoc1` (bé chọn phép gì, đúng không) và `tra_loi_sai`.

### Bài học 30 giây (`bai-hoc.js`)

Hiện trước màn khi bé gặp nội dung mới lần đầu (kỹ năng chưa tới 10 câu, bài chưa xem), xem lại được trong menu tạm dừng. Dạy đúng trình tự SGK, có chữ và giọng đọc, bước cuối có một câu thử (không tính điểm):

| Mã | Nội dung |
|---|---|
| `phep-nhan` | Mỗi đĩa 2 quả cam, 3 đĩa: 2 + 2 + 2 = 6 rồi mới 2 × 3 = 6, “2 được lấy 3 lần” |
| `phep-chia` | Chia đều 6 quả vào 3 đĩa (6 : 3 = 2), chia theo nhóm mỗi đĩa 2 quả (6 : 2 = 3), từ 2 × 3 = 6 ra hai phép chia |
| `tram-chuc-don-vi` | 10 đơn vị = 1 chục, 10 chục = 1 trăm, 243 = 200 + 40 + 3, 205 “hai trăm linh năm” |
| `chuc-don-vi` | 10 đơn vị = 1 chục, 47 = 40 + 7 |
| `giai-toan` | Bài toán cho biết gì, hỏi gì, chọn phép tính, rồi mới tính, Bài giải và Đáp số |

Ghi `bai_hoc_xem`: mã bài học, số bước đã xem, tổng bước, số lần nghe lại, số giây, có bỏ qua không, câu thử bé chọn gì.

### Ngân hàng câu mới

| Kỹ năng | Mã | Lỗi nhận biết (03a mục 3.3) |
|---|---|---|
| `cau-tao-so-100`, `cau-tao-so-1000`, `doc-so-1000` | 2.1, 2.3, 2.4 | `doc-so` (bỏ chữ số 0, đảo chữ số, viết theo từng từ: 2005, 300405), `thieu-0`, `thua-0` |
| `lien-truoc-sau-100` | 2.5 | `nham-truoc-sau`, `qua-chuc` (liền sau 39 là 30 hay 310) |
| `nhan-y-nghia` | 2.19 | `dao-thu-tu`, `dem-nhom`, `cong-thay-nhan` |
| `bang-nhan-2-5`, `bang-chia-2-5` | 2.20, 2.22 | `o-ben-canh`, `cong-thay-nhan`, `tru-thay-chia`, `nhan-thay-chia`, `nham-bang`, `thieu-0`, `thua-0` |
| `toan-hon-kem`, `toan-them-bot`, `toan-nhieu-it`, `toan-loi-van-100`, `chia-y-nghia`, `toan-nhan-chia` | 2.17, 2.18, 2.21, 2.26 | Bước 1: `sai-phep` (kèm `cong-thay-nhan`, `nhan-thay-chia`, `tru-thay-chia`), `dao-thu-tu`; bước 2: lỗi của phép tính bên trong |
| `cong-tru-1000` | 2.12 | Nhớ, mượn không quá một lượt: `quen-nho` (đ − 10, đ − 100), `quen-muon`, `tru-nguoc`, `viet-ca-so-nho`, `sai-hang`, `nham-dau` |

Đọc số theo SGK: 205 “hai trăm linh năm”, 304 “ba trăm linh tư” (SGK Bài 51 dùng “linh tư”), 24 “hai mươi tư”, 14 “mười bốn”, 21 “hai mươi mốt”, 15 “mười lăm”. Mã câu mới: `2.20|bang-nhan-2-5|2x7`, `2.4|doc-so-1000|chu:205`, `2.18|toan-loi-van-100|hai-lop-trong:36+27`.

### Nhiệm vụ hôm nay

- Học mới: màn của bài đang học ở lớp trước, rồi các màn chưa học của khoảng 15 bài gần đây theo đúng thứ tự SGK.
- Ôn nhanh và luyện lại đổi sang thể loại lâu chưa dùng cho cùng kỹ năng (ví dụ hôm trước ôn cộng qua 10 bằng Đua Xe thì hôm nay bằng Lật Thẻ), tính từ tóm tắt câu (`Dao.lichSuTheLoai`).

### Hình mới

Codex vẽ biểu tượng 3 thể loại (`ic-truyen-tranh`, `ic-lat-the`, `ic-xep-hinh`) và mặt sau thẻ (`the-lung`): `assets/art/prompts/run9-gd2.txt`, `MANIFEST-gd2.md`. Khối trăm, chục, đơn vị vẽ bằng CSS để đúng 10 ô, 10 × 10 ô. Đồ vật trong truyện tranh là emoji và quả mọng của game.

## Giai đoạn 3: Góc phụ huynh

Sau cổng phép nhân của người lớn (hai chữ số nhân một chữ số, đổi mỗi lần mở, sai 3 lần thì thoát), góc phụ huynh có thanh chọn bé và bốn mục ở thanh dưới, thêm nút Cài đặt. Xem được trên iPad xoay ngang, xoay dọc và điện thoại 375 px. Phụ huynh đi từ tổng quan tới từng thao tác của một câu sai trong 1 đến 2 chạm: Tổng quan → thẻ Cần giúp → xem lại câu (1 chạm), Nhật ký → câu → xem lại (2 chạm).

| Màn | Có gì |
|---|---|
| Tổng quan tuần | Phút chơi, số ngày có chơi, số câu, % tự làm đúng (lùi, tới từng tuần); Con đã giỏi, Đang luyện, Cần giúp (mỗi thẻ kèm một câu sai thật của con, chạm là mở dòng thời gian của đúng câu đó), Con thích nhất, biểu đồ 4 tuần |
| Nhật ký chi tiết | Theo ngày hoặc cả tuần: từng ván (giờ, game, màn, số câu, phút, cảm xúc), từng câu (con chọn gì, lỗi gì, mấy giây, đã sửa chưa); lọc Tất cả, Chỉ câu sai, theo mã nội dung, theo mã lỗi |
| Xem lại một câu | Dòng thời gian mọi sự kiện của câu với mốc giây, mỗi kiểu thao tác có một câu tiếng Việt riêng; hình của đề, các lựa chọn và số lần con dừng ở mỗi lựa chọn; lần câu quay lại ("2 câu sau: làm lại đúng trong 5,1 giây"); Nhận xét giải thích lỗi theo cách SGK và nút "Xem N câu cùng lỗi" |
| Bản đồ kỹ năng | Đủ 43 nội dung theo 10 vùng, tô theo mức thấp nhất của các kỹ năng đã luyện, chấm đỏ là Cần giúp; chạm ô xem % tự làm đúng 14 ngày, số câu, giây trung vị, lỗi hay gặp, câu sai gần đây, các màn và game luyện nội dung đó, gợi ý Làm cùng con |
| Kế hoạch tuần tới | Luyện lại (kỹ năng yếu, luôn đổi sang thể loại khác lần trước), Ôn nền (nội dung tiên quyết), Học mới (theo bài đang học); Làm cùng con cho cả 43 mã; "Dùng kế hoạch này" lưu `ke_hoach_tuan` và nhiệm vụ hằng ngày đi theo kế hoạch trong những ngày đó |
| Cài đặt | Tuổi, lớp, bài đang học, thời gian chơi mỗi ngày (mặc định không giới hạn; phụ huynh chọn nhanh 15, 30, 45, 60, 90, 120 phút hoặc chỉnh từng 5 phút trong khoảng 5 đến 240, `gioi_han_phut`; khi có giới hạn thì "Riêng hôm nay": cho thêm 15 hoặc 30 phút tính từ bây giờ, không giới hạn hôm nay, hoặc như mọi ngày, `them_hom_nay` tự hết khi qua ngày, đổi thời gian không làm mất nhiệm vụ hôm nay), mở khóa mọi vùng (`mo_khoa_vung`), tải nhật ký JSONL, tính lại tóm tắt, xóa dữ liệu (hỏi lại trong trang) |
| Xuất cho trợ lý AI | Gói `dao-khung-long-xuat-v1.json` theo spec 06 mục 5.9: bí danh thay tên, từ điển mã chỉ gồm mã đã dùng, hồ sơ học tập, 20 ván gần nhất, tối đa 30 câu sai tiêu biểu (ưu tiên lỗi lặp lại, chưa sửa) kèm câu tả thao tác, hướng dẫn và hợp đồng đầu ra cho LLM; ước lượng token (byte UTF-8 chia 3, làm tròn lên), mặc định dưới 30 000 token; tùy chọn kèm nhật ký 7 ngày; nút Sao chép và Tải tệp |

Định nghĩa dùng chung (`js/bao-cao.js`): câu đã làm là mọi câu trừ `bo_qua`; câu tự làm là câu đã làm không dùng gợi ý; % tự làm đúng = `dung_ngay` chia câu tự làm (cùng quy tắc với mức thành thạo); tuần tính từ thứ Hai. Mọi con số tính lại được từ ba lớp tóm tắt hoặc nhật ký gốc, không lưu số riêng. Góc phụ huynh chỉ ghi `phu_huynh_mo` và `phu_huynh_cai_dat`, và chỉ khi bé đang xem là bé đang chơi (YC-09).

## Giai đoạn 4: game mới đợt 2, đo lường, tiền, thống kê, hình học, thời gian và hai đấu trường

Mỗi thể loại mới có tệp câu hỏi riêng (`js/cau-*.js`, cắm vào ngân hàng bằng `NganHang.dangKyLoai` và `themKyNang`), tệp game riêng dùng khung chơi chung, CSS riêng và bài học 30 giây. Mọi kỹ năng hỏi được cả ở dạng tương tác của game lẫn dạng chọn đáp án có hình (`veHinh`, `veLuaChon`) để Đấu Trường và game cũ dùng lại.

| Vùng | Thể loại | Kỹ năng (mã nội dung) | Bài học |
|---|---|---|---|
| 3 Xưởng Đo Lường | Xưởng Đo Lường: cân đĩa kéo quả cân 1, 2, 5 kg cho thăng bằng, cân đồng hồ, trạm rót nước theo lít, bàn thước kéo thước cm, xếp vật vào ô cm, dm, m, km | `nang-nhe`, `can-kg` (B2.9), `rot-lit` (B2.10), `don-vi-do-dai` (B2.6), `do-do-dai` (B2.7) | `ki-lo-gam`, `lit`, `do-dai` |
| 3 | Truyện Tranh với kg, lít (Bài 17, 18) | `toan-kg-lit` (2.18) | `giai-toan` |
| 5 Rừng Hình Khối | Rừng Hình Khối: bảng SVG lớn, chạm điểm, kéo nối đoạn thẳng, chạm đoạn để cộng độ dài, chọn hình, kéo vật vào rổ khối trụ, khối cầu, ghép hai mảnh thành hình mẫu | `nhan-dang-duong` (B2.1), `ba-diem-thang-hang` (B2.2), `duong-gap-khuc` (B2.8), `hinh-tu-giac` (B2.3), `ghep-hinh` (B2.5), `khoi-tru-cau` (B2.4) | `diem-doan-thang`, `duong-gap-khuc`, `hinh-tu-giac`, `khoi-tru-cau` |
| 6 Phố Đồng Hồ | Lật Lịch: tháp đồng hồ kéo kim (kim phút bắt vào 12 số, kim giờ đi theo như đồng hồ thật), lịch treo tường lật từng trang, dải 24 giờ với năm buổi | `xem-gio` (B2.11), `ngay-gio` (B2.12), `xem-lich` (B2.13) | `xem-dong-ho`, `ngay-gio`, `xem-lich` |
| 9 Chợ Khủng Long | Chợ Khủng Long: Mỏ Vịt Long bán hàng, kéo tờ tiền từ ví vào khay ("Đã trả: 700 đồng"), hộp tiền lẻ để đổi tiền, bé làm người bán trả lại tiền thừa | `nhan-biet-tien`, `tra-tien`, `doi-tien`, `tien-thua` (B2.14) | `tien-viet-nam`, `tien-thua` |
| 9 | Truyện Tranh mua bán | `toan-tien` (B2.14) | `giai-toan` |
| 10 Hồ Thống Kê | Câu Cá Thống Kê: chạm câu cá, thả vào giỏ đúng loại rồi đếm, biểu đồ tranh dựng từ số cá con câu được, hộp bóng để chọn chắc chắn, có thể, không thể rồi bốc thử | `kiem-dem` (C2.1), `bieu-do-tranh` (C2.2), `kha-nang` (C2.3) | `kiem-dem`, `bieu-do-tranh`, `kha-nang` |
| 8 Kim Tự Tháp 1000 | Câu Cá Thống Kê chế độ ước lượng: đàn cá hiện theo nhóm 10 trong 3 giây rồi lặn | `uoc-luong-chuc` (2.7) | `uoc-luong` |
| Đấu Trường HK1, Cuối Năm | Đấu Trường: khủng long của bé đấu trùm (`boss-hk1`, `boss-cuoi-nam`), mỗi câu đúng một đòn, 3 câu đúng liền là tuyệt chiêu 2 đòn, câu đúng nhờ gợi ý nửa đòn; câu sai trùm làm trò vui, không mất gì | Trộn kỹ năng của vùng 1 đến 6 (HK1) hoặc 1 đến 10 (Cuối Năm) theo hồ sơ học tập: kỹ năng Cần giúp, còn câu nợ, tự làm đúng thấp, tới hạn ôn được ưu tiên (`Dao.cauDauTruong`); bỏ bài hai bước | |

Đấu trường: trùm 12 máu với 10 câu (HK1), 16 máu với 14 câu (Cuối Năm); bé đúng khoảng 70% thắng trong 1 đến 2 lần (mô phỏng 400 ván mỗi đấu trường). Thắng lần đầu: cúp, phụ kiện (Bộ Giáp Học Kì 1, Vương Miện Cuối Năm), 100 quả mọng, và tính vào mức Huyền thoại. Đấu trường HK1 mở khi học tới Bài 30 hoặc đã luyện từ 6 kỹ năng của vùng 1 đến 6; Cuối Năm mở khi tới Bài 64 hoặc đã luyện từ 14 kỹ năng.

Theo SGK, không bịa thêm: lớp 2 chỉ xem giờ đúng, 15 phút, 30 phút (không có "kém"); tiền chỉ có Bài 56 với tờ 100, 200, 500, 1 000 đồng, nên đổi tiền và trả lại tiền thừa là phần mở rộng nhẹ (màn ghi "Bài 56 (mở rộng)"); biểu đồ tranh mỗi hình là 1 con. Màn học kì 2 trong vùng học kì 1 (độ dài Bài 55, 57, khối trụ khối cầu Bài 46) chờ tới Bài 37 với bé lớp 2.

Mã lỗi mới (80 mã trong từ điển, mỗi mã có lời nói với bé, giải nghĩa cho phụ huynh và nhãn ngắn): ví dụ `ben-thap-nhe` (nghĩ đĩa thấp là nhẹ), `dem-qua-can` (đếm số quả cân thay vì cộng khối lượng), `doc-sai-vach`, `nham-don-vi`, `doi-don-vi`, `do-tu-1` (đo từ vạch 1), `dem-so-to` (đếm số tờ thay vì cộng mệnh giá), `tra-thieu`, `tra-thua`, `nham-to-tien`, `dem-sot`, `doc-nham-hang` (đọc nhầm hàng biểu đồ), `nham-hon-kem`, `nham-kha-nang`, `nham-doan-duong`, `dem-thieu-doan`, `nham-thang-hang`, `nham-tu-giac`, `nham-khoi`, `nham-kim` (đổi vai kim giờ, kim phút), `lech-gio`, `doc-so-phut`, `nham-buoi`, `nham-thu`, `dem-ngay-lech`. Mỗi mã nhận ra bằng một công thức trên đáp án của bé, và đáp án nhiễu sinh từ chính công thức đó.

## Giai đoạn 5: sáu game cũ trong đảo

Chém Trái Cây (`math-ninja`), Bắn Thiên Thạch (`cuu-chuong`), Mê Cung (`me-cung-dong-ho`), Tháp Xếp Hình (`thap-dong-ho`), Xe Tăng (`xe-tang-thoi-gian`), Cưỡi Hổ (`cuoi-ho`) chạy trong đảo bằng một iframe cùng tên miền: `../<thư mục>/?dao=1&man=<mã màn>`. Cầu nối `js/cau-noi.js` đưa cho game cũ `window.parent.DaoCauNoi` (hợp đồng phiên bản 1, xem đầu tệp): game cũ lấy câu từ ngân hàng chung (`cauTiep`), báo từng thao tác (`thaoTac`), chấm qua đảo (`traLoi`), và khi bé sai hẳn thì chờ màn "Gần đúng rồi" chung của đảo hiện đè lên (`phanHoi`). Mọi sự kiện đi qua đúng một `NhatKy` và một `VanChoi` của đảo, nên không có hai nơi ghi một phiên và báo cáo gộp mọi game theo mã chương trình (ví dụ mã 2.11 gồm câu của Đua Xe, Bắn Thiên Thạch, Lật Thẻ). Spec 06 ban đầu định chép `nhat-ky.js` vào từng game; cầu nối thay cho cách đó (ghi trong lịch sử thay đổi của spec 06).

Chế độ đảo chỉ bật khi có `?dao=1`, trang nằm trong iframe và trang cha có `DaoCauNoi`; mở game trực tiếp thì game giữ nguyên như cũ (menu, tim, bài học, hỏi đáp, lưu tiến trình riêng). Trong đảo: thẻ Bắt đầu (chạm này mở âm thanh trên iPad), không menu, không tim, không thua, không hết giờ bắt buộc, không ghi localStorage của game, âm thanh theo cài đặt của đảo, tạm dừng có nút Về đảo.

| Game | Màn trong đảo | Cách chơi và thao tác ghi |
|---|---|---|
| Cưỡi Hổ | v1-m4 tia số, v8-m6 liền trước, liền sau đến 1000, v6-m7 đồng hồ, v10-m4 đọc biểu đồ tranh | Mỗi cụm 3 vòng lửa là một câu (`tren`, `giua`, `duoi`), thẻ câu hỏi hiện tia số, biểu đồ, đồng hồ; `cham` vòng lửa |
| Chém Trái Cây | v1-m5 so sánh (quả mang dấu >, <, =), v2-m7 cộng trừ qua 10, v7-m7 nhân chia, v10-m5 chắc chắn, có thể, không thể | Mỗi đợt quả là một câu, không bom; quả rơi thì bay lại chậm hơn; `vuot` quả đầu tiên lưỡi dao chạm |
| Bắn Thiên Thạch | v4-m8 cộng trừ có nhớ, v7-m6 bảng nhân chia (gõ kết quả, 2 lần thử), v1-m6 xếp thứ tự, v8-m5 so sánh số có ba chữ số | Một câu một lúc, thiên thạch trôi chậm rồi chờ; `go_so`, `xoa`, `ban`; xếp thứ tự chấm cả dãy một lần |
| Mê Cung | v1-m7 dãy đếm thêm, v5-m8 đường gấp khúc, v6-m4 đồng hồ | Mỗi vòng mê cung 3 đích mang lựa chọn, ma chạm thì về chỗ xuất phát (không mất gì); `di_chuyen` theo từng đoạn thẳng, `chon` đích |
| Tháp Xếp Hình | v5-m7 hình tứ giác, v6-m5 đồng hồ | Mỗi khối rơi là một câu, các cột mang lựa chọn, khối lơ lửng chờ bé thả; `doi_cot`, `tha` |
| Xe Tăng | v5-m9 ba điểm thẳng hàng, v6-m6 đồng hồ và các buổi | Robot mang lựa chọn đi chậm, không bao giờ tới xe tăng; `xoay_nong` khi nhắm xong, `ban` |

Màn của game cũ hỏi kỹ năng đo lường, hình học, thời gian ở dạng chọn đáp án (`dang: 'chon_dap_an'` trong `dao.js`, cầu nối cũng tự đổi khi game cũ xin lựa chọn). Service worker của từng game cũ đã tăng phiên bản và lưu thêm `js/dao.js`, `dao.css`.

## Hướng dẫn chơi và bước tiếp theo

Để bé tự hiểu luật chơi, cách ấp trứng, chơi theo thứ tự nào, làm sao lớn lên và có thêm bạn khủng long. Chữ to, có giọng đọc (nút Nghe), dùng số liệu thật của bé. Mọi con số đọc từ luật trong code (`HocTap.THUONG`, `SAO`, `DK_THUOC`, `MUC_LON`, `Dao.DAU_TRUONG_MO`, `BAI_HOC_KY_2`) nên không lệch khi chỉnh luật.

| Chỗ | Có gì |
|---|---|
| Trang Cách chơi (`js/huong-dan.js`) | 10 chương: Đảo, Nhiệm vụ (3 nhiệm vụ chơi lần lượt, nút chơi nhiệm vụ kế tiếp), Vùng đất (chơi từ Màn 1 xuống, 3 sao, cúp mở khi xong các màn chính, nhãn màu, màn học kì 2; hình là vùng bé vừa chơi với sao thật), Khi chơi (loa, bóng đèn gợi ý, sai thì câu quay lại sau 2 câu, bài học 30 giây, tạm dừng; hình nút giống hệt trong game), Quả mọng (bảng thưởng, không bao giờ bị trừ), Lớn lên (6 mức của khủng long của bé, mức chưa tới là bóng đen, còn thiếu gì để lên mức sau), Bạn mới (10 trứng vùng có bóng bạn khủng long nấp sau, số kỹ năng đã thuộc, chạm để sang vùng), Đã thuộc (bậc thang 5 mức, điều kiện thuộc, 3 kỹ năng sắp thuộc và còn thiếu gì), Đấu trường (trạng thái hai trùm, điều kiện mở), Trò chơi (16 trò, chạm để xem cách chơi) |
| Lần đầu lên đảo | Sau khi ấp trứng, bản ngắn 4 chương (Đảo, Nhiệm vụ, Khi chơi, Lớn lên) kết thúc bằng nút "Chơi nhiệm vụ 1" hoặc "Xem bản đồ" |
| Nút mở trang | Bản đồ: nút vàng "Cách chơi" (nhấp nháy, nhãn "Mới" tới khi bé mở lần đầu); trang vùng: nút ? (chương Vùng đất) và "Làm sao để trứng nở?" (chương Bạn mới); màn kết thúc: nút ? cạnh thanh lớn lên, kỹ năng, trứng vùng. Đóng trang là về đúng màn đang xem |
| Thẻ cách chơi của một trò | 3 bước có hình, theo thể loại và chế độ của màn (Xưởng Đo Lường cân, rót, thước, đơn vị; Chợ nhận biết, trả tiền, đổi tiền, người bán; Câu Cá; Lật Lịch), Đua Xe có trạm dừng thêm một bước. Hiện trước lần chơi đầu của 9 thể loại mới (sau bài học 30 giây nếu có; 6 game cũ và Đấu Trường đã có thẻ Bắt đầu kèm cách chơi); xem lại trong menu Tạm dừng (nút "Cách chơi" ở khung chơi chung và Đua Xe, phím Esc chỉ đóng thẻ, game vẫn tạm dừng) |
| Màn kết thúc | Gợi ý sao ("Tự làm đúng ngay 9 trên 10 câu để được 3 sao"); hàng kỹ năng chính của màn: mức hiện tại và từng điều kiện Đã thuộc đã đủ hay còn thiếu (tự làm 20 câu, đúng ngay 9 trên 10, chơi 2 ngày khác nhau, làm lại câu từng sai), đã thuộc thì ngày ôn để thành Vững chắc (`HocTap.tienDoThuoc`); trứng của vùng x/y kỹ năng đã thuộc; thẻ "Bước tiếp theo" có nút đi thẳng (đọc to sau 1,4 giây) |
| Bước tiếp theo (`Dao.buocTiep`) | Nếu phụ huynh có đặt giới hạn và hôm nay đã đủ thì nghỉ (thẻ có nút "Bố mẹ cho chơi thêm") → nhiệm vụ hôm nay còn lại (theo thứ tự) → màn vừa chơi chỉ 1 sao thì chơi lại → cúp của vùng vừa mở → màn chưa chơi cùng vùng → màn chưa chơi ở vùng khác theo thứ tự bài SGK, không vượt bài đang học quá 3 bài (bé lớp 2) → cúp đã mở chưa chơi → đấu trường đã mở chưa thắng → màn chưa đủ 3 sao → về đảo. Bé bấm thì xem hết màn ăn mừng (trứng nở, lớn lên…) rồi làm luôn; "Chơi lại" cũng chờ ăn mừng xong |
| Bản đồ khi đã xong 3 nhiệm vụ | "Xong nhiệm vụ hôm nay! Chơi thêm: …" và nút đi thẳng tới bước tiếp theo |

Hồ sơ bé thêm `huong_dan: { da_mo, gioi_thieu, cach_choi: { <thể loại>: ngày } }`. Trang Cách chơi không ghi nhật ký (không phải thao tác học). Kiểm thử: `tests/dao-khung-long-huong-dan.test.js`.

## Cấu trúc tệp

| Tệp | Vai trò |
|---|---|
| `index.html`, `style.css` | Mọi màn hình (một trang), CSP như các game khác; `css/*.css` là giao diện riêng của từng game mới, Góc phụ huynh và cầu nối |
| `js/nhat-ky.js` | Nhật ký sự kiện v1: ULID, phong bì chung, 4 tầng phiên/ván/câu/thao tác, bộ đệm ghi mỗi 2 giây, đóng phiên và ván dở khi app bị tắt ngang, xóa dữ liệu một bé. Kèm lớp lưu trữ IndexedDB (dự phòng bộ nhớ) |
| `js/ngan-hang.js` | Ngân hàng câu theo mã nội dung và mã kỹ năng: đủ 43 mã nội dung lớp 2, 4 loại câu gốc (phép tính, số, phép nhân từ tổng, bài toán có lời văn), cơ chế cắm thêm loại câu (`dangKyLoai`, `themKyNang`, `themLoi`), mã câu ổn định, đáp án nhiễu mang mã lỗi theo công thức 03a mục 3.3, gợi ý 3 cấp, lời giải, đọc số bằng chữ, đề truyện tranh (thêm kg, lít, tiền), sinh theo hạt giống |
| `js/cau-so-sanh.js` | Câu so sánh, xếp thứ tự (2.2, 2.6), tia số và dãy đếm thêm (2.1) |
| `js/cau-do-luong.js`, `js/cau-tien.js`, `js/cau-thong-ke.js`, `js/cau-hinh-hoc.js`, `js/cau-thoi-gian.js` | Loại câu, kỹ năng, mã lỗi và hình SVG của đo lường, tiền, thống kê, hình học, thời gian (`window.DongHo` vẽ đồng hồ, lịch, dải 24 giờ) |
| `js/hoc-tap.js` | Hàm thuần: tóm tắt câu, tóm tắt ván (kèm câu mô tả tiếng Việt), hồ sơ học tập, 5 mức thành thạo, cờ Cần giúp, quả mọng, sao, mức lớn |
| `js/van-choi.js` | Vòng đời một ván dùng chung cho mọi thể loại: xếp câu, câu sai (và hết giờ) quay lại, ghi đủ chuỗi sự kiện mỗi câu; dạng chọn đáp án, nhập số, ghép đôi, kéo thả, thao tác trên hình, xếp thứ tự, hai bước |
| `js/dao.js` | 10 vùng, 2 đấu trường, 80 màn, loài khủng long, luật mở vùng và mở màn học kì 2, trộn câu đấu trường, lập nhiệm vụ hôm nay (theo kế hoạch tuần nếu phụ huynh chọn), bước tiếp theo sau mỗi màn (`buocTiep`) |
| `js/ho-so.js` | Hồ sơ bé, gợi ý lớp từ tuổi, bé đang chơi, tên gợi ý từ hồ sơ chung `3hoa-players-v1` (chỉ đọc) |
| `js/khung-choi.js` | Khung chơi chung của các game mới: thanh câu hỏi, điểm, tiến độ, gợi ý (tự ẩn sau vài giây), màn “Gần đúng rồi”, tạm dừng, pháo giấy |
| `js/dua-xe.js`, `js/lat-the.js`, `js/xep-hinh-so.js`, `js/truyen-tranh.js` | Game của giai đoạn 1, 2 |
| `js/xuong-do-luong.js`, `js/cho-khung-long.js`, `js/cau-ca.js`, `js/rung-hinh-khoi.js`, `js/lat-lich.js`, `js/dau-truong.js` | Game của giai đoạn 4 (mỗi game đăng ký bài học 30 giây của mình) |
| `js/cau-noi.js` | Cầu nối cho sáu game cũ chạy trong iframe (giai đoạn 5) |
| `js/bao-cao.js`, `js/goc-phu-huynh.js` | Góc phụ huynh: hàm tính báo cáo thuần (kiểm thử được bằng Node) và giao diện |
| `js/bai-hoc.js` | Bài học 30 giây (`BaiHoc.dangKy`) và sự kiện `bai_hoc_xem` |
| `js/huong-dan.js`, `css/huong-dan.css` | Trang Cách chơi (10 chương), thẻ cách chơi của từng trò, và giao diện các chỗ chỉ đường (nút Cách chơi, bước tiếp theo, kỹ năng còn thiếu ở màn kết thúc) |
| `js/phan-hoi.js` | Nội dung màn “Gần đúng rồi!”: đặt tính cột dọc, que tính, mô hình khối, hình lời giải do ngân hàng câu dựng |
| `js/am-thanh.js` | Tiếng động tổng hợp bằng Web Audio, giọng đọc tiếng Việt |
| `js/app.js` | Điều phối các màn; sổ đăng ký thể loại `window.DaoTroChoi[game] = { ten, khung, san hoặc man, batDau }`; cập nhật tóm tắt, thưởng, nhiệm vụ, mức lớn, đấu trường sau mỗi ván; thời gian chơi do phụ huynh đặt (mặc định không giới hạn; hết giờ thì hộp "Hôm nay con chơi đủ giờ rồi" có nút Bố mẹ cho chơi thêm, qua cổng phép tính vào thẳng mục thời gian của Cài đặt) |
| `assets/img/` | Hình WebP xuất từ `assets/art/` bằng `python scripts/dkl-images.py` |
| `assets/art/` | Prompt và MANIFEST của hình do Codex vẽ (lượt `gd4`: 6 biểu tượng thể loại, 2 trùm đấu trường); bản gốc PNG chỉ giữ cục bộ, không đưa lên git |
| `sw.js`, `manifest.json`, `icons/` | PWA, chơi ngoại tuyến sau lần tải đầu |

## Dữ liệu trên máy

IndexedDB `dao-khung-long`:

| Kho | Khóa | Nội dung |
|---|---|---|
| `ho_so` | `id` | Hồ sơ bé (tên, tuổi khi nhập, lớp và nguồn của lớp, bài đang học, phong cách, khủng long, kỷ lục từng màn, nhiệm vụ hôm nay, trứng vùng đã nở, bài học đã xem, phụ kiện, đấu trường đã thắng `dau_truong_thang`, cài đặt của phụ huynh `gioi_han_phut` (null là không giới hạn), `them_hom_nay`, `mo_khoa_vung`, `ke_hoach_tuan`, trang Cách chơi và thẻ cách chơi đã xem `huong_dan`) |
| `su_kien` | `id` (ULID), chỉ mục `be_luc`, `van` | Nhật ký gốc, mỗi thao tác một sự kiện (cả của sáu game cũ khi chơi trong đảo); giữ 120 ngày (dọn nền mỗi ngày một lần, khóa `dkl-don-nhat-ky-v1`) |
| `tom_tat_cau` | `cau` | Tóm tắt từng câu |
| `tom_tat_van` | `van` | Tóm tắt từng ván, có câu mô tả tiếng Việt |
| `ho_so_hoc_tap` | `be` | Hồ sơ học tập tính từ hai kho trên |

localStorage: `dkl-be-dang-choi-v1` (bé đang chơi, lúc chơi gần nhất), `dkl-phien-mo-v1` (phiên, ván, câu đang mở để đóng lại nếu app bị tắt ngang, kèm số quả mọng của ván đang mở), `dkl-the-dang-mo-v1` (cửa sổ đang giữ đảo), `dkl-sao-luu-v1` (lúc sao lưu gần nhất), `dkl-don-nhat-ky-v1`, `dkl-am-thanh-v1`, `dkl-meo-mh-v1`.

Tên bé không đi vào nhật ký (chỉ có mã `be_…`), không vào gói xuất cho trợ lý AI. Không gửi gì ra ngoài; phụ huynh tự tải tệp.

## Sự kiện ghi

Mọi thể loại ghi cùng một chuỗi cho mỗi câu: `cau_hien` (mã câu, đề, cấu trúc, đáp án, các lựa chọn kèm vị trí và mã lỗi, câu ôn lại của câu nào, lần gặp thứ mấy), các `thao_tac` của thể loại đó (`doi_lan`, `lat`, `chon`, `bo_chon`, `go_so`, `xoa`, `tha`, `keo`, `dat`, `bo_ra`, `rot`, `keo_thuoc`, `cau`, `dem`, `boc`, `ve`, `noi`, `xoay`, `lat_trang`, `di_chuyen`, `doi_cot`, `xoay_nong`, `ban`, `vuot`, `cham`, `nghe_lai`), `goi_y`, `tra_loi` (giá trị, đúng sai, mã lỗi, lần thử, số lần đổi ý, cấp gợi ý, trường riêng của game như `to_tien`, `tong`), `phan_hoi_xem`, `cau_ket_thuc` (`dung_ngay`, `dung_sau_goi_y`, `dung_lan_2`, `sai`, `het_gio`, `bo_qua`). Quanh ván: `phien_bat_dau`, `van_bat_dau`, `van_ket_thuc` (đấu trường thêm `thang`, `mau_con_lai`), `thanh_thao_doi`, `thuong` (thêm `thang_dau_truong`), `cam_xuc`, `tam_dung`, `tiep_tuc`, `bai_hoc_xem`, `ho_so_doi`. Góc phụ huynh chỉ ghi `phu_huynh_*`. Đua Xe ghi thêm `thao_tac` kiểu `tu_vao_cong` khi xe tự vào cổng. Đổi ý tính các thao tác `doi_lan`, `bo_chon`, `doi_cot`, `xoa`, `bo_ra` và lần `chon` thứ hai trở đi.

## Kiểm thử

```bash
node tests/run.js
```

455 kiểm thử logic của cả repo. Riêng đảo: `tests/dao-khung-long.test.js` (nhật ký, ngân hàng, phát lại ván, tính lại khớp từng byte, mức thành thạo, nhiệm vụ, bài học), `tests/dao-khung-long-gd345.test.js` (đủ 12 thể loại, cả 10 vùng và 2 đấu trường chơi được, mỗi vùng ít nhất 2 thể loại, mọi màn dựng đủ câu, câu chọn đáp án có đúng một lựa chọn đúng, 43 mã nội dung thuộc đúng một vùng, nhiệm vụ theo kế hoạch tuần, mở màn học kì 2), `tests/dao-khung-long-<game>.test.js` cho từng game mới và Góc phụ huynh (mỗi tệp sinh vài trăm câu cho mỗi kỹ năng, kiểm từng công thức lỗi và phát lại một ván qua VanChoi, NhatKy, mọi sự kiện hợp lệ lược đồ), `tests/dao-khung-long-cau-noi.test.js` (hợp đồng cầu nối), `tests/dao-khung-long-huong-dan.test.js` (bước tiếp theo, còn thiếu gì để Đã thuộc, cách chơi đủ mọi thể loại và chế độ, 10 chương dựng được), `tests/<game cũ>-dao.test.js` (chế độ đảo của từng game cũ, và game giữ nguyên khi không có `?dao=1`), `tests/dao-khung-long-sua-loi.test.js` (các lỗi sửa sau lần rà soát 2026-09-28), `tests/dao-khung-long-luu-tru.test.js` (sao lưu và khôi phục, quả mọng của ván dở, một cửa sổ giữ đảo).

Chơi thử trong trình duyệt: `python scripts/dkl-phuc-vu.py 8790 .` ở gốc repo (máy chủ tĩnh có hàng đợi lớn), rồi `node scripts/dkl-cdp.js --kich-ban <tệp.js>` (Chrome headless, không cần Playwright; đọc phần đầu tệp). Trong bảng điều khiển có `window.__DKL` (`batDauMan(id)`, `moPhuHuynh`, `tinhLai`, `khoiPhucTep(tệp)`), `window.DaoTroChoi`, `CauNoi._trangThai()`, và `_trangThai()` của từng game.

## Sửa sau lần rà soát 2026-09-28

- Bài đang học: nguồn `uoc_luong_theo_ngay` thì tự tăng theo lịch năm học mỗi khi chọn bé và mỗi ngày mới (ghi `ho_so_doi`, trường `bai_dang_hoc`); phụ huynh đã chỉnh thì giữ nguyên, năm học mới thì hỏi lên lớp trước. Trước đây bài đứng yên từ lúc tạo hồ sơ nên vùng học kì 2 không bao giờ mở.
- Hồ sơ học tập đã lưu chỉ dùng trong ngày nó được tính; mở app hôm sau (hay để app qua nửa đêm) thì tính lại, và mức trước ván được tính theo hôm nay để không có `thanh_thao_doi` giả.
- Câu sai quay lại: mỗi ván thêm tối đa một phần ba số câu (ít nhất 3, `VanChoi.toiDaCau`), riêng Đấu Trường không giới hạn vì số câu đã cân theo luật cũ. Thanh tiến độ, nhãn "Câu x/y", vòng và cờ đích của Đua Xe, dấu chân Rừng Hình Khối tính cả câu quay lại (`VanChoi.tienDo()`), câu quay lại có nhãn "Làm lại"; màn "Gần đúng rồi" chỉ hứa câu quay lại khi thật sự còn chỗ (`VanChoi.seOnLai()`).
- Mức thành thạo: Đã thuộc chỉ tụt về Đang luyện khi có từ 2 câu nợ hoặc một câu nợ để quá 3 ngày (vẫn tụt khi tự làm đúng dưới 85%). Vững chắc cần 4 buổi ôn đạt, từ ngày 1, 3, 7, 14 sau ngày thuộc và mỗi buổi cách buổi đạt trước ít nhất 1, 2, 4, 7 ngày; hạn ôn tính theo cả hai.
- Nhật ký gốc cũ hơn 120 ngày được dọn mỗi ngày một lần, chạy nền 3 giây sau khi mở app, bằng một lệnh xóa theo khoảng mã ULID (trước đây duyệt cả kho mỗi lần mở app và bắt bé chờ).
- Nội dung: Bài 9 (thêm, bớt) chỉ trừ không qua 10; màn bài toán có lời văn vùng 4 mở từ Bài 23; Đấu Trường chỉ lấy kỹ năng của bài đã học tới hoặc đã luyện (thiếu thì thêm bài gần nhất cho đủ 4), mỗi vùng ít nhất một kỹ năng, bằng trọng số thì trộn theo ngày thay vì theo bảng chữ cái.

## Giữ dữ liệu của bé (nhóm B của lần rà soát 2026-09-28)

- Sao lưu và khôi phục (Góc phụ huynh, Cài đặt, mục "Sao lưu và giữ dữ liệu"): một tệp JSON `dao-khung-long-sao-luu` (phiên bản 1) gồm hồ sơ, tóm tắt câu, tóm tắt ván của mọi bé trên máy và nhật ký gốc 14 ngày gần nhất (hoặc toàn bộ nếu chọn). Khôi phục gộp theo mã, không xóa gì của máy: hồ sơ trùng mã giữ bản cập nhật sau, tóm tắt và nhật ký ghi theo mã nên khôi phục hai lần không nhân đôi, hồ sơ học tập được tính lại. Máy chưa có bé thì màn đầu có nút "Bố mẹ: khôi phục từ tệp sao lưu" (đổi máy, hoặc chuyển từ Safari sang đảo ở màn hình chính vì hai nơi có bộ nhớ riêng). API: `NhatKy.saoLuu`, `kiemTraSaoLuu`, `khoiPhuc`.
- Lưu bền: lần chạm đầu xin `navigator.storage.persist()` (trừ Firefox vì nó hiện hộp hỏi quyền; phụ huynh bấm "Xin lưu bền"). Góc phụ huynh nói rõ Safari có thể tự xóa dữ liệu sau 7 ngày không mở, lần sao lưu gần nhất, và cảnh báo khi máy không lưu được (duyệt riêng tư: app chạy bằng kho bộ nhớ, có thêm thông báo lúc mở). `NhatKy.trangThaiKho()`.
- IndexedDB: kết nối mất (iOS sau khi ra nền) hay đóng vì thẻ khác nâng phiên bản thì mở lại và thử lại một lần; giao dịch bị hủy nếu việc ghi ném lỗi giữa chừng; sự kiện chuẩn hóa qua JSON trước khi ghi. Chỉ lỗi hết chỗ mới dọn bớt nhật ký gốc (trước đây mọi lỗi đều xóa nhật ký cũ hơn 30 ngày); lỗi khác giữ bộ đệm và thử lại sau 6 giây. Đọc nhật ký theo bé, theo ván dùng `getAll` theo khoảng.
- App bị tắt ngang giữa ván: số quả mọng của ván đang mở được ghi vào dấu mở sau mỗi câu; lần mở sau ghi vào `van_ket_thuc` và cộng vào hồ sơ.
- Một cửa sổ giữ đảo: mở đảo ở cửa sổ (thẻ) khác thì cửa sổ cũ ghi nốt bộ đệm, thôi ghi nhật ký, dấu mở và kho (`NhatKy.giuThe`, kho của app bỏ qua lần ghi của cửa sổ đã nhường), hiện "Đảo đang mở ở cửa sổ khác" với nút "Chơi ở cửa sổ này" (tải lại để giữ đảo). Cửa sổ mới chờ 0,45 giây nếu cửa sổ kia vừa còn chạy. Trước đây hai cửa sổ ghi đè hồ sơ của nhau (mất giới hạn giờ vừa đặt, mất quả mọng).
- Tính lại tóm tắt chỉ dựng lại các ván còn nhật ký gốc, giữ nguyên tóm tắt của ván cũ hơn 120 ngày (trước đây mất lịch sử cũ và mức Vững chắc).

## Việc của các giai đoạn sau

- GĐ 6: thử với 5 đến 10 bé trên iPad trong 4 tuần; chỉnh độ khó, tỉ lệ quả mọng, số câu đấu trường, cách viết báo cáo; thử gói xuất với một LLM.
- Cần người rà: màu tờ tiền vẽ bằng SVG (gần màu tờ thật, không chép tờ thật) so với tranh SGK; đề truyện tranh và lịch mẫu theo SGK bản đầy đủ.
- Chưa có: vườn khủng long và phụ kiện hiển thị trên khủng long; bài học cho số liền trước, liền sau, so sánh số, tia số, ghép hình; biểu đồ tranh mỗi hình là 10 (Bài 65, 74), xúc xắc (Bài 66), vẽ đoạn thẳng theo độ dài (Bài 27), chọn túi hàng đủ 13 kg (Bài 18).
