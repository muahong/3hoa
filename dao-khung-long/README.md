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
- Cổng đúng: cộng điểm, 3 câu đúng liền thì TĂNG TỐC. Cổng sai: xe chậm lại (không đâm), màn “Gần đúng rồi!” gọi tên lỗi, đặt tính cột dọc hoặc tách 10 như SGK, nút xem bằng que tính. Câu sai quay lại sau 2 câu (tối đa 2 lần trong ván).
- Gợi ý 3 cấp (cấp 3 gạch bớt một cổng sai); câu dùng gợi ý không tính là tự làm.
- Màn có trạm dừng (vùng 4 màn 2, màn 5 và hai cúp): câu 4, 8, 12 bắt tự gõ đáp án, được thử 2 lần.
- Đua với bóng kỷ lục của chính mình; thời gian xem lời giải và gõ ở trạm dừng không tính vào thời gian đua.
- Thời gian mỗi câu theo kỹ năng (7 giây với bảng cộng, 13 đến 18 giây với phép có nhớ và biểu thức), tự dãn khi bé sai và rút ngắn nhẹ khi bé quyết nhanh.

### Quả mọng và mức lớn

- Câu tự làm đúng +3 (kỹ năng đã Vững chắc +1), đúng nhờ gợi ý hoặc lần 2 +1, sửa được câu từng sai +2 thêm, sai 0 (không bao giờ bị trừ). Kỹ năng lên Đã thuộc +50, xong cả 3 nhiệm vụ trong ngày +20. Bỏ dở vẫn giữ quả mọng đã có.
- Mức lớn: Trứng, Trứng lay động, Sơ sinh, Nhí (500), Thiếu niên (1 200 và 3 nội dung đã thuộc), Trưởng thành (2 500 và 8 đã thuộc), Huyền thoại (5 000 và 1 đấu trường).
- Khác với kế hoạch: trứng đầu tiên nở khi bé đua xong ván đầu tiên (thay vì mốc 100 quả mọng) để bé thấy trứng nở ngay buổi đầu. Các con số nằm ở `HocTap.MUC_LON`, chỉnh sau khi thử với bé thật.
- Trứng của vùng nở khi mọi kỹ năng của các màn đang chơi được trong vùng đạt Đã thuộc (ở giai đoạn này chưa tính màn Truyện Tranh của vùng 2).

## Giai đoạn 2 (bản này): game mới đợt 1, số và phép tính

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

## Cấu trúc tệp

| Tệp | Vai trò |
|---|---|
| `index.html`, `style.css` | Mọi màn hình (một trang), CSP như các game khác |
| `js/nhat-ky.js` | Nhật ký sự kiện v1: ULID, phong bì chung, 4 tầng phiên/ván/câu/thao tác, bộ đệm ghi mỗi 2 giây, đóng phiên và ván dở khi app bị tắt ngang, xóa dữ liệu một bé. Kèm lớp lưu trữ IndexedDB (dự phòng bộ nhớ). Tự chứa để sao chép vào game khác |
| `js/ngan-hang.js` | Ngân hàng câu theo mã nội dung và mã kỹ năng (phép tính, số, phép nhân từ tổng, bài toán có lời văn), mã câu ổn định, đáp án nhiễu mang mã lỗi theo công thức 03a mục 3.3, gợi ý 3 cấp, lời giải, đọc số bằng chữ, 47 đề truyện tranh, sinh theo hạt giống |
| `js/hoc-tap.js` | Hàm thuần: tóm tắt câu, tóm tắt ván (kèm câu mô tả tiếng Việt), hồ sơ học tập, 5 mức thành thạo, cờ Cần giúp, quả mọng, sao, mức lớn |
| `js/van-choi.js` | Vòng đời một ván dùng chung cho mọi thể loại: xếp câu, câu sai quay lại, ghi đủ chuỗi sự kiện mỗi câu; dạng chọn đáp án, nhập số, ghép đôi (dựng bàn Lật Thẻ), kéo thả, hai bước |
| `js/dao.js` | 10 vùng, 2 đấu trường, các màn, loài khủng long, luật mở vùng, lập nhiệm vụ hôm nay |
| `js/ho-so.js` | Hồ sơ bé, gợi ý lớp từ tuổi, bé đang chơi, tên gợi ý từ hồ sơ chung `3hoa-players-v1` (chỉ đọc) |
| `js/dua-xe.js` | Game Đua Xe: đường giả 3D trên canvas, cổng, trạm dừng, bóng kỷ lục, màn phản hồi |
| `js/khung-choi.js` | Khung chơi chung của các game mới: thanh câu hỏi, điểm, tiến độ, gợi ý, màn “Gần đúng rồi”, tạm dừng, pháo giấy |
| `js/lat-the.js` | Game Lật Thẻ Anh Em |
| `js/xep-hinh-so.js` | Game Xếp Hình Số |
| `js/truyen-tranh.js` | Game Truyện Tranh |
| `js/bai-hoc.js` | Bài học 30 giây và sự kiện `bai_hoc_xem` |
| `js/phan-hoi.js` | Nội dung màn “Gần đúng rồi!”: đặt tính cột dọc (cả nhớ ở hàng chục), que tính, mô hình khối trăm, chục, đơn vị |
| `js/am-thanh.js` | Tiếng động tổng hợp bằng Web Audio, giọng đọc tiếng Việt |
| `js/app.js` | Điều phối các màn, cập nhật tóm tắt, thưởng, nhiệm vụ, mức lớn sau mỗi ván |
| `assets/img/` | Hình WebP xuất từ `assets/art/` bằng `python scripts/dkl-images.py` |
| `assets/art/` | Prompt và MANIFEST của hình do Codex vẽ; bản gốc PNG chỉ giữ cục bộ, không đưa lên git |
| `sw.js`, `manifest.json`, `icons/` | PWA, chơi ngoại tuyến sau lần tải đầu |

## Dữ liệu trên máy

IndexedDB `dao-khung-long`:

| Kho | Khóa | Nội dung |
|---|---|---|
| `ho_so` | `id` | Hồ sơ bé (tên, tuổi khi nhập, lớp và nguồn của lớp, bài đang học, phong cách, khủng long, kỷ lục từng màn, nhiệm vụ hôm nay, trứng vùng đã nở, bài học đã xem) |
| `su_kien` | `id` (ULID), chỉ mục `be_luc`, `van` | Nhật ký gốc, mỗi thao tác một sự kiện; giữ 120 ngày |
| `tom_tat_cau` | `cau` | Tóm tắt từng câu |
| `tom_tat_van` | `van` | Tóm tắt từng ván, có câu mô tả tiếng Việt |
| `ho_so_hoc_tap` | `be` | Hồ sơ học tập tính từ hai kho trên |

localStorage: `dkl-be-dang-choi-v1` (bé đang chơi, lúc chơi gần nhất), `dkl-phien-mo-v1` (phiên, ván, câu đang mở để đóng lại nếu app bị tắt ngang), `dkl-am-thanh-v1`, `dkl-meo-mh-v1`.

Tên bé không đi vào nhật ký (chỉ có mã `be_…`). Không gửi gì ra ngoài; phụ huynh tự tải tệp JSONL.

## Sự kiện Đua Xe ghi

`phien_bat_dau`, `ho_so_doi` (tạo hồ sơ, lên lớp, khủng long lớn), `van_bat_dau` (nguồn nhiệm vụ, hệ số thời gian, hạt giống), rồi với mỗi câu: `cau_hien` (mã câu, đề, cấu trúc, đáp án, 3 lựa chọn kèm làn và mã lỗi, câu ôn lại của câu nào, lần gặp thứ mấy), `thao_tac` (`doi_lan` kèm giá trị trước mũi xe, `cham` nút Lao tới hoặc nút que tính, `nghe_lai`, `go_so`, `xoa`), `goi_y` (cấp, nội dung, cổng bị gạch), `tra_loi` (giá trị, đúng sai, mã lỗi, lần thử, số lần đổi ý, cấp gợi ý, làn, bé có chủ động chọn không), `phan_hoi_xem`, `cau_ket_thuc` (kết quả, giây, câu đã sửa). Cuối ván: `van_ket_thuc`, `thanh_thao_doi`, `thuong`, `cam_xuc`. Tạm dừng: `tam_dung`, `tiep_tuc`. Góc phụ huynh chỉ ghi `phu_huynh_*`.

Mã lỗi dùng bảng 03a mục 3.3. Đáp án lệch 1 chục không có tên riêng được ghi là `dem-lech` (ví dụ trong spec 06 dùng `lech-chuc`, mã này chưa có trong bảng 03a).

## Kiểm thử

```bash
node --test tests/dao-khung-long.test.js
```

Kiểm tra lược đồ sự kiện, ULID, phiên nghỉ 10 phút, đóng phiên dở, gợi ý lớp, ngân hàng câu và mã lỗi, phát lại một ván theo kịch bản (YC-03), tính lại tóm tắt từ nhật ký khớp từng byte (YC-05), mức thành thạo, nhiệm vụ, luật mở vùng, xóa dữ liệu bé (YC-08), danh sách tệp của service worker. Giai đoạn 2 thêm: câu số, nhân chia, bài toán (đúng đáp án, đúng phạm vi, nhiễu mang mã lỗi), bảng lỗi 03a cho các mã mới, đọc số theo SGK, phát lại ván Lật Thẻ, Truyện Tranh (chấm riêng hai bước, đảo thứ tự không tính sai), Xếp Hình Số, sự kiện bài học, vùng 1, 2, 4, 7, 8 có ít nhất 2 thể loại, nhiệm vụ đổi thể loại.

Chơi thử: mở `dao-khung-long/` qua một máy chủ tĩnh (ví dụ `python -m http.server` ở gốc repo). Trong bảng điều khiển trình duyệt có `window.__DKL` (trạng thái app, `batDauMan(id)`), `DuaXe._trangThai()`, `LatThe._trangThai()`, `XepHinhSo._trangThai()`, `TruyenTranh._trangThai()` để gỡ lỗi.

## Việc của các giai đoạn sau

- GĐ 3: Góc phụ huynh đầy đủ (tổng quan tuần, nhật ký chi tiết, xem lại một câu, bản đồ kỹ năng, xuất gói cho LLM); báo cáo tách bước chọn phép và bước tính của bài toán (`buoc1`).
- GĐ 4: Xưởng Đo Lường, Chợ Khủng Long, Câu Cá Thống Kê, Rừng Hình Khối, Lật Lịch, hai đấu trường boss.
- GĐ 5: đưa 6 game cũ vào đảo qua `nhat-ky.js` (Chém Trái Cây, Bắn Thiên Thạch, Mê Cung, Tháp, Xe Tăng, Cưỡi Hổ).
- Chưa có: vườn khủng long, phụ kiện hiển thị trên khủng long, thẻ Đảo Khủng Long trên trang chủ 3hoa.com; bài học cho số liền trước, liền sau; đề truyện tranh cần giáo viên rà theo SGK bản đầy đủ.
