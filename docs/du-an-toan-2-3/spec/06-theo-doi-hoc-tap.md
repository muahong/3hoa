# Theo dõi học tập: hồ sơ bé, nhật ký thao tác và dữ liệu cho LLM

| | |
|---|---|
| Tình trạng | Bản nháp |
| Ngày | 2026-09-27 |
| Chủ sở hữu | 3hoa |
| Mục tiêu phục vụ | M12, M8, M7, M5, M2, M1 (xem `01-muc-tieu-va-ky-vong.md`) |
| Liên quan | `spec/03a-chuong-trinh-lop-2.md` (mã nội dung, mã lỗi, khung thành thạo K1 đến K4), `spec/06-su-kien-v1.schema.json` (lược đồ máy đọc được), kế hoạch “Đảo Khủng Long” |

## 1. Tóm tắt

Game Đảo Khủng Long ghi lại **từng thao tác chơi** của bé (chạm, vuốt, kéo, thả, gõ số, xin gợi ý, đổi ý, thoát), không chỉ kết quả đúng sai của câu. Nhật ký gốc là một dòng sự kiện JSON cho mỗi thao tác, tự mô tả đủ để đọc riêng từng dòng. Từ nhật ký gốc, game tính ra ba lớp dữ liệu: tóm tắt từng câu, tóm tắt từng ván và hồ sơ học tập của bé. Phụ huynh xem được tới từng câu, từng thao tác (“con kéo thanh chục vào cột trăm rồi mới sửa lại”). Hồ sơ học tập và các bản tóm tắt được viết sẵn cả dạng JSON lẫn câu tiếng Việt, kèm từ điển mã, để sau này đưa cho một LLM phân tích và cá nhân hóa nội dung mà không phải đổi cấu trúc dữ liệu.

Quyết định đã chốt (2026-09-27): hồ sơ nằm trên máy (không tài khoản, không server); thiết bị chính là iPad; bé tự chọn phong cách khủng long; bé tự đặt tên và nhập tuổi.

## 2. Vấn đề và mục tiêu

- Hiện 6 game chỉ lưu tổng `stats` (số câu đúng, sai, giây) và kho `missed`. Không biết bé sai ở bước nào, sai kiểu gì, đổi ý mấy lần, chần chừ ở đâu, có bấm gợi ý trước khi trả lời không.
- Phụ huynh cần biết **chính xác chỗ sai**: câu nào, bé chọn gì, bé đã làm những thao tác gì trước khi chốt, lỗi đó lặp lại bao nhiêu lần.
- Sau này cần cho LLM đọc để: nhận xét bằng lời, tìm quy luật lỗi, đề xuất nhiệm vụ và bài học phù hợp riêng từng bé.

Mục tiêu đo được:

- 100% câu hỏi trong mọi game sinh đủ chuỗi sự kiện `cau_hien` → các `thao_tac` → `tra_loi` (kiểm thử tự động cho từng game).
- Từ nhật ký gốc tính lại được đúng mọi số trong báo cáo phụ huynh (báo cáo không lưu số riêng).
- Một bản xuất cho LLM của 4 tuần chơi nằm dưới 30 000 token.

Không phải mục tiêu: không gửi dữ liệu đi đâu tự động; không gọi LLM trong phiên bản đầu; không ghi âm, không chụp ảnh, không lưu vị trí địa lý.

## 3. Người dùng và tình huống

1. **Bé lần đầu mở game** trên iPad của gia đình: chạm “Thêm bạn”, gõ tên (hoặc chọn tên gợi ý), chọn tuổi bằng nút số 5 đến 11, game gợi ý “Con đang học lớp 2 phải không?”, bé hoặc phụ huynh xác nhận, rồi chọn trứng Dũng Mãnh hay Dễ Thương.
2. **Bé chơi Đua Xe** 4 phút: mỗi lần đổi làn, mỗi cổng vào, mỗi lần bấm gợi ý đều được ghi.
3. **Phụ huynh tối hôm đó** mở Góc phụ huynh, thấy “Trừ có nhớ: cần giúp”, chạm vào, xem danh sách câu sai, chạm vào câu 62 − 38 để xem lại từng thao tác của con và thời điểm.
4. **Cuối tháng** phụ huynh bấm “Xuất dữ liệu cho trợ lý” để nhận một tệp JSON (đã ẩn tên thật) và tự quyết định có dán vào một công cụ AI hay không.

## 4. Yêu cầu

### 4.1 Yêu cầu chức năng

| Mã | Yêu cầu | Ưu tiên | Tiêu chí nghiệm thu |
|---|---|---|---|
| YC-01 | Tạo hồ sơ với tên hiển thị (1 đến 16 ký tự) và tuổi (5 đến 11) | P0 | Không cho lưu khi thiếu tên hoặc tuổi; tên lọc ký tự điều khiển và `<>` |
| YC-02 | Gợi ý lớp từ tuổi và năm học, bé hoặc phụ huynh xác nhận hay sửa | P0 | Tuổi 7 vào tháng 10/2026 gợi ý lớp 2; sửa được thành lớp 1 hoặc 3 |
| YC-03 | Mỗi thao tác chơi sinh một sự kiện theo lược đồ v1 | P0 | Kiểm thử phát lại một ván mẫu: số sự kiện và thứ tự khớp kịch bản |
| YC-04 | Mỗi câu có mã câu ổn định, mã nội dung, mã kỹ năng, dạng câu, đáp án đúng, từng đáp án nhiễu kèm mã lỗi sinh ra nó | P0 | Cùng một đề sinh cùng mã câu ở mọi game |
| YC-05 | Tóm tắt câu, tóm tắt ván, hồ sơ học tập tính lại được hoàn toàn từ nhật ký gốc | P0 | Xóa lớp tóm tắt, tính lại, so khớp từng byte |
| YC-06 | Góc phụ huynh xem được: ngày → ván → câu → thao tác, lọc theo nội dung và theo mã lỗi | P0 | Từ một câu sai mở được dòng thời gian thao tác trong 2 chạm |
| YC-07 | Xuất dữ liệu cho LLM theo mục 5.7, mặc định ẩn tên thật | P1 | Tệp xuất không chứa tên hiển thị của bé |
| YC-08 | Xóa toàn bộ dữ liệu của một bé sau cổng phụ huynh | P0 | Sau khi xóa, IndexedDB không còn khóa nào của bé |
| YC-09 | Không ghi gì khi đang ở màn hình phụ huynh ngoài sự kiện `phu_huynh_*` | P1 | Mở báo cáo không làm đổi thống kê của bé |

### 4.2 Yêu cầu phi chức năng

- Chạy hoàn toàn trên máy, không mạng vẫn ghi đủ.
- Ghi sự kiện không làm giật khung hình: gom vào bộ đệm trong bộ nhớ, ghi xuống IndexedDB mỗi 2 giây hoặc khi hết ván, khi ẩn tab (`visibilitychange`).
- Dung lượng: khoảng 250 byte mỗi sự kiện, 300 đến 600 sự kiện cho 15 phút chơi, tức dưới 150 KB mỗi ngày. Giữ nhật ký gốc 120 ngày (khoảng 15 MB), sau đó chỉ giữ tóm tắt ván. Dùng IndexedDB, không dùng localStorage cho nhật ký (localStorage chỉ khoảng 5 MB).
- Nhắc “Thêm vào Màn hình chính” để Safari không xóa dữ liệu sau 7 ngày không mở.

## 5. Thiết kế đề xuất

### 5.1 Hồ sơ bé

```json
{
  "id": "be_01J8Z3K7",
  "ten": "An",
  "tuoi_khi_nhap": 7,
  "ngay_nhap_tuoi": "2026-09-27",
  "nam_sinh_uoc_tinh": 2019,
  "lop": 2,
  "lop_nguon": "goi_y_tu_tuoi_da_xac_nhan",
  "bai_dang_hoc": 22,
  "phong_cach": "dung_manh",
  "khung_long": { "ten": "Rex", "loai": "rex", "muc": "thieu_nien", "qua_mong": 1240 },
  "tao_luc": "2026-09-27T19:02:11+07:00"
}
```

Quy tắc gợi ý lớp (năm học bắt đầu tháng 9):

- `nam_hoc_bat_dau` = năm hiện tại nếu tháng ≥ 9, ngược lại năm hiện tại trừ 1.
- `nam_sinh_uoc_tinh` = năm hiện tại trừ tuổi (bé chưa tới sinh nhật thì lệch 1 năm, vì vậy luôn hỏi lại).
- `lop_goi_y` = `nam_hoc_bat_dau` − `nam_sinh_uoc_tinh` − 5, kẹp trong khoảng 1 đến 5.
- Ví dụ: tháng 9/2026, bé nói 7 tuổi: năm sinh ước tính 2019, lớp gợi ý 2026 − 2019 − 5 = 2.
- Màn hỏi: “Con đang học lớp 2 phải không?” với ba nút Lớp 1, Lớp 2, Lớp 3. Kết quả lưu ở `lop` và `lop_nguon`.
- Mỗi năm học mới (tháng 9), game hỏi lại một lần: “Năm nay con lên lớp 3 rồi phải không?”.
- Tuổi và lớp chỉ dùng để chọn nội dung mặc định, không hiện cho bé khác, không đưa vào bản xuất mặc định ngoài `tuoi` và `lop`.

### 5.2 Bốn tầng thời gian

| Tầng | Mã | Bắt đầu khi | Ví dụ |
|---|---|---|---|
| Phiên | `phien` | Mở app hoặc quay lại sau 10 phút không chạm | Tối 12/10, 19:02 đến 19:18 |
| Ván | `van` | Bắt đầu một màn chơi | Đua Xe, vùng 4, màn 2 |
| Câu | `cau` | Một câu hỏi hiện đủ trên màn hình | 36 + 27 |
| Thao tác | sự kiện | Mỗi hành động của bé hoặc phản hồi của game | Đổi sang làn trái lúc 3,1 giây |

### 5.3 Phong bì chung của mọi sự kiện

Mỗi sự kiện là một dòng JSON (JSONL). Các trường chung:

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `v` | số | Phiên bản lược đồ, hiện là 1 |
| `id` | chuỗi | Mã sự kiện duy nhất (ULID, sắp xếp được theo thời gian) |
| `luc` | chuỗi | Thời điểm theo giờ máy, ISO 8601 có múi giờ |
| `ms` | số | Mili giây tính từ lúc câu hiện (trong câu) hoặc từ lúc ván bắt đầu (ngoài câu) |
| `be` | chuỗi | Mã hồ sơ bé |
| `phien`, `van`, `cau` | chuỗi | Mã các tầng đang mở (trường nào không áp dụng thì bỏ) |
| `loai` | chuỗi | Loại sự kiện, xem 5.4 |
| `game`, `vung`, `man` | chuỗi, số | Game, vùng, màn đang chơi |
| `du_lieu` | đối tượng | Nội dung riêng của từng loại |

### 5.4 Danh mục loại sự kiện

| Loại | Khi nào | Nội dung `du_lieu` chính |
|---|---|---|
| `phien_bat_dau` / `phien_ket_thuc` | Mở, đóng app | phiên bản app, thiết bị, hướng màn hình, lý do kết thúc |
| `van_bat_dau` | Vào màn chơi | nhiệm vụ nguồn (`hoc_moi`, `luyen_lai`, `on_cach_quang`, `tu_chon`), tham số độ khó, hạt giống sinh đề |
| `bai_hoc_xem` | Xem bài học 30 giây | mã bài học, số bước đã xem, có bấm nghe lại, thời lượng |
| `cau_hien` | Câu hiện đủ | mã câu, mã nội dung, mã kỹ năng, dạng câu, đề dạng chữ và dạng cấu trúc, đáp án đúng, các lựa chọn (giá trị, vị trí, mã lỗi sinh ra), là câu ôn lại hay không |
| `thao_tac` | Mỗi hành động của bé | `kieu` (`cham`, `vuot`, `keo`, `tha`, `go_so`, `xoa`, `doi_lan`, `chon`, `bo_chon`, `nghe_lai`), đối tượng, giá trị, vị trí chuẩn hóa 0 đến 1 |
| `goi_y` | Bé xin gợi ý | cấp gợi ý (1: nhắc cách nghĩ, 2: bước đầu, 3: gần đáp án), mã nội dung gợi ý |
| `tra_loi` | Bé chốt một đáp án | giá trị, đúng hay sai, mã lỗi (có thể nhiều), lần thử thứ mấy, số lần đổi ý, đã dùng gợi ý cấp nào, bước (với bài hai bước) |
| `phan_hoi_xem` | Màn “Gần đúng rồi” hiện | mã lời giải, thời gian bé nhìn, nút bé bấm (`que_tinh`, `choi_tiep`) |
| `cau_ket_thuc` | Câu đóng lại | kết quả cuối (`dung_ngay`, `dung_sau_goi_y`, `dung_lan_2`, `sai`, `het_gio`, `bo_qua`), tổng giây |
| `tam_dung`, `tiep_tuc` | Tạm dừng | nguồn (nút, ẩn tab) |
| `van_ket_thuc` | Hết ván hoặc thoát | số câu, đúng, sai, gợi ý, sao, quả mọng, có bỏ dở không, câu cuối trước khi thoát |
| `cam_xuc` | Bé chạm mặt cảm xúc | `vui`, `binh_thuong`, `chan` |
| `thuong` | Nhận thưởng | quả mọng cộng thêm, lý do, phụ kiện |
| `thanh_thao_doi` | Mức thành thạo đổi | mã kỹ năng, mức cũ, mức mới, bằng chứng (số câu, tỉ lệ, số ngày) |
| `ho_so_doi` | Đổi tên, tuổi, lớp, phong cách | trường đổi, giá trị cũ và mới |
| `phu_huynh_mo`, `phu_huynh_cai_dat` | Phụ huynh xem hoặc chỉnh | màn đã mở, thiết lập đã đổi |

### 5.5 Mã câu và mô tả câu

Mã câu ổn định giúp theo dõi cùng một phép tính qua nhiều game: `<mã nội dung>|<mã kỹ năng>|<đề chuẩn hóa>`, ví dụ `2.11|cong-nho-2cs-2cs|36+27`. Game không tự bịa nội dung trong mã: đề chuẩn hóa là đề bỏ khoảng trắng, dấu nhân là `x`, dấu chia là `:`.

Sự kiện `cau_hien` luôn mang đủ ngữ cảnh để đọc riêng:

```json
{"v":1,"id":"01J9...Q1","luc":"2026-10-12T19:04:03.812+07:00","ms":0,"be":"be_01J8Z3K7","phien":"ph_0412","van":"va_0412_03","cau":"c_0412_03_07","loai":"cau_hien","game":"dua-xe","vung":4,"man":"dx-2",
 "du_lieu":{"ma_cau":"2.11|cong-nho-2cs-2cs|36+27","noi_dung":"2.11","ky_nang":"cong-nho-2cs-2cs","dang":"chon_dap_an",
  "de":"36 + 27 = ?","cau_truc":{"phep":"+","so":[36,27],"an":"ket_qua"},"dap_an":63,
  "lua_chon":[{"gia_tri":53,"vi_tri":"lan_trai","loi":["quen-nho"]},{"gia_tri":63,"vi_tri":"lan_giua","loi":[]},{"gia_tri":73,"vi_tri":"lan_phai","loi":["lech-chuc"]}],
  "on_lai":false,"lan_gap_thu":3}}
```

### 5.6 Một câu đầy đủ: ví dụ trong Đua Xe

Bé An gặp 36 + 27, đổi làn hai lần, vào cổng 53 (sai), xem lời giải, câu quay lại sau 2 câu và làm đúng.

```jsonl
{"loai":"cau_hien","ms":0,"cau":"c07","du_lieu":{"ma_cau":"2.11|cong-nho-2cs-2cs|36+27","dap_an":63,"lua_chon":[{"gia_tri":53,"vi_tri":"lan_trai","loi":["quen-nho"]},{"gia_tri":63,"vi_tri":"lan_giua","loi":[]},{"gia_tri":73,"vi_tri":"lan_phai","loi":["lech-chuc"]}]}}
{"loai":"thao_tac","ms":1840,"cau":"c07","du_lieu":{"kieu":"doi_lan","tu":"lan_giua","den":"lan_trai","gia_tri_duoi_xe":53}}
{"loai":"thao_tac","ms":3120,"cau":"c07","du_lieu":{"kieu":"doi_lan","tu":"lan_trai","den":"lan_giua","gia_tri_duoi_xe":63}}
{"loai":"thao_tac","ms":4210,"cau":"c07","du_lieu":{"kieu":"doi_lan","tu":"lan_giua","den":"lan_trai","gia_tri_duoi_xe":53}}
{"loai":"tra_loi","ms":6480,"cau":"c07","du_lieu":{"gia_tri":53,"dung":false,"loi":["quen-nho"],"lan_thu":1,"so_lan_doi_y":3,"goi_y_cap":0}}
{"loai":"phan_hoi_xem","ms":6500,"cau":"c07","du_lieu":{"ma_loi_giai":"dat-tinh-cong-nho","giay_xem":9.2,"nut":"choi_tiep"}}
{"loai":"cau_ket_thuc","ms":15700,"cau":"c07","du_lieu":{"ket_qua":"sai","tong_giay":6.5,"se_on_lai_sau_cau":2}}
{"loai":"cau_hien","ms":0,"cau":"c10","du_lieu":{"ma_cau":"2.11|cong-nho-2cs-2cs|36+27","on_lai":true,"on_lai_cua":"c07","dap_an":63}}
{"loai":"tra_loi","ms":5120,"cau":"c10","du_lieu":{"gia_tri":63,"dung":true,"loi":[],"lan_thu":1,"so_lan_doi_y":0,"goi_y_cap":0}}
{"loai":"cau_ket_thuc","ms":5130,"cau":"c10","du_lieu":{"ket_qua":"dung_ngay","tong_giay":5.1,"sua_duoc_cau":"c07"}}
```

(Để gọn, ví dụ bỏ các trường phong bì chung; bản thật luôn có đủ.)

Từ chuỗi này, báo cáo phụ huynh viết được: “Con đổi làn 3 lần, đứng giữa 53 và 63 rồi chọn 53: con biết 6 + 7 = 13 nhưng quên nhớ 1 sang hàng chục. Hai câu sau con làm lại đúng trong 5 giây.”

### 5.7 Thao tác theo từng thể loại game

| Thể loại | Thao tác ghi | Thông tin chẩn đoán rút ra |
|---|---|---|
| Chém Trái Cây | `vuot` (đường vuốt cắt quả nào), `chon` | Chém nhầm quả kế bên, chém vội trước khi đọc đề |
| Bắn Thiên Thạch | `go_so`, `xoa`, `chon` (bắn) | Gõ từng chữ số theo thứ tự nào, xóa sửa mấy lần, viết ngược chữ số |
| Mê Cung | `cham` ô đích, `vuot` hướng, đồng hồ đã đi qua | Đi tới đồng hồ sai rồi quay lại |
| Tháp Xếp Hình, Xếp Hình Số | `doi_cot`, `tha`, khối bỏ nhầm cột | Nhầm hàng trăm với hàng chục, thiếu chữ số 0 |
| Xe Tăng | `xoay_nong`, `ban`, mục tiêu trúng | Ngắm lâu hay bắn vội |
| Cưỡi Hổ | `cham` vòng lửa | Chọn nhầm vòng bên cạnh trên tia số |
| Đua Xe | `doi_lan`, cổng đi qua | Chần chừ giữa đúng và nhiễu, số lần đổi ý |
| Truyện Tranh | `chon` phép tính (bước 1), `go_so` (bước 2), `nghe_lai` | Sai hiểu đề hay sai tính |
| Xưởng Đo Lường | `keo`, `tha` quả cân, `rot` (lượng nước), `keo_thuoc` | Thử bao nhiêu lần mới thăng bằng |
| Chợ Khủng Long | `keo` tờ tiền vào khay, `bo_chon` | Đếm số tờ thay vì cộng mệnh giá |
| Câu Cá Thống Kê | `cau` cá loại nào, `dem`, `chon` | Đếm sót, đọc nhầm hàng biểu đồ |
| Lật Thẻ | `lat` thẻ, cặp đúng hay sai | Nhớ vị trí, ghép nhầm cặp gần đúng |

### 5.8 Các lớp dữ liệu tính từ nhật ký gốc

1. **Tóm tắt câu** (một dòng cho mỗi câu): mã câu, kết quả, giây, số lần đổi ý, gợi ý cấp cao nhất, mã lỗi, đã sửa được chưa.
2. **Tóm tắt ván**: game, màn, nhiệm vụ nguồn, số câu, đúng ngay, đúng sau gợi ý, sai, sửa được, sao, quả mọng, cảm xúc, bỏ dở, và một câu mô tả tiếng Việt sinh theo khuôn cố định:
   “Ván Đua Xe màn 2 (cộng có nhớ 2 chữ số), 16 câu, đúng ngay 12, nhờ gợi ý 2, sai 2 rồi sửa được cả 2. Lỗi: quên nhớ (2 lần). Con chọn Vui.”
3. **Hồ sơ học tập** (tính lại mỗi khi hết ván): theo từng kỹ năng có mức thành thạo, số câu, tỉ lệ tự làm đúng 14 ngày, giây trung vị, mã lỗi hay gặp kèm tối đa 3 câu ví dụ thật, ngày ôn cách quãng kế tiếp; thêm sở thích (thể loại hay tự chọn, tỉ lệ Vui), nhịp chơi (giờ hay chơi, số ngày trong tuần), xu hướng 4 tuần.

Báo cáo phụ huynh chỉ đọc ba lớp này; mọi số trong báo cáo đều bấm vào được để xuống tới nhật ký gốc.

### 5.9 Định dạng cho LLM

Mục tiêu: một LLM đọc được mà không cần biết code của game, và đề xuất của nó được kiểm tra trước khi dùng.

**Gói xuất** (`dao-khung-long-xuat-v1.json`), sinh trên máy khi phụ huynh bấm nút:

```json
{
  "loai_goi": "dao-khung-long/ho-so-hoc-tap",
  "phien_ban": 1,
  "tao_luc": "2026-10-31T20:15:00+07:00",
  "be": { "bi_danh": "be_1", "tuoi": 7, "lop": 2, "bai_dang_hoc": 23, "phong_cach": "dung_manh" },
  "tu_dien": {
    "noi_dung": { "2.11": "Cộng, trừ có nhớ trong phạm vi 100", "2.8": "Bảng cộng qua 10 trong phạm vi 20" },
    "loi": { "quen-nho": "Quên nhớ 1 sang hàng chục khi cộng có nhớ", "quen-muon": "Quên trả 1 ở hàng chục khi trừ có nhớ" },
    "muc": ["chua_hoc", "lam_quen", "dang_luyen", "da_thuoc", "vung_chac"],
    "tien_quyet": { "2.11": ["2.8", "2.9", "2.10"] }
  },
  "ho_so": {
    "ky_nang": [
      { "ma": "2.11", "ky_nang": "cong-nho-2cs-2cs", "muc": "dang_luyen", "so_cau": 58, "tu_lam_dung_14_ngay": 0.64, "giay_trung_vi": 14,
        "loi_hay_gap": [ { "ma": "quen-nho", "lan": 7, "vi_du": ["36+27→53", "45+38→73"] } ], "on_lai_ke_tiep": "2026-11-02" }
    ],
    "so_thich": { "the_loai_tu_chon": { "dua-xe": 18, "chem-trai-cay": 6 }, "ti_le_vui": 0.78 },
    "nhip": { "ngay_choi_4_tuan": 19, "phut_trung_binh_ngay": 14, "gio_hay_choi": "19:00-20:00" }
  },
  "van_gan_day": [ "Ván Đua Xe màn 2 (cộng có nhớ 2 chữ số), 16 câu, đúng ngay 12, ..." ],
  "cau_sai_tieu_bieu": [ { "ma_cau": "2.11|cong-nho-2cs-2cs|36+27", "thao_tac": "đổi làn 3 lần giữa 53 và 63, chọn 53 sau 6,5 giây", "loi": ["quen-nho"] } ]
}
```

Nguyên tắc cho gói xuất:

- Tên trường tiếng Việt không dấu, dạng `snake_case`, nhất quán với mã lỗi đang dùng (`quen-nho`). Mọi mã đều có lời giải nghĩa trong `tu_dien`, nên LLM không phải đoán.
- Kèm câu mô tả tiếng Việt có dấu ở mỗi ván và mỗi câu sai tiêu biểu; LLM đọc câu nhanh hơn đọc số.
- Gọn: gói 4 tuần gồm hồ sơ đầy đủ, 20 ván gần nhất và tối đa 30 câu sai tiêu biểu (ưu tiên câu có lỗi lặp lại), dưới 30 000 token. Nhật ký gốc không đưa vào mặc định; có tùy chọn “kèm nhật ký chi tiết” cho phân tích sâu.
- Riêng tư: dùng `bi_danh` thay tên thật; không có ngày sinh; không có mã thiết bị. Không bao giờ tự gửi; phụ huynh tự sao chép.

**Hợp đồng đầu ra** khi sau này game gọi LLM để cá nhân hóa: LLM phải trả về JSON đúng khuôn, và game chỉ nhận những giá trị có trong danh mục của game.

```json
{
  "nhan_xet_cho_phu_huynh": "Con đã vững bảng cộng qua 10. Lỗi chính tuần này là quên nhớ 1 khi cộng số có hai chữ số...",
  "nhiem_vu_de_xuat": [
    { "noi_dung": "2.11", "ky_nang": "cong-nho-2cs-2cs", "game": "dua-xe", "che_do": "dat-tinh-co-o-nho", "so_cau": 12, "ly_do": "sửa lỗi quên nhớ" },
    { "noi_dung": "2.8", "ky_nang": "bang-cong-qua-10", "game": "chem-trai-cay", "so_cau": 20, "ly_do": "ôn nền cho cộng có nhớ" }
  ],
  "bai_hoc_goi_y": ["que-tinh-gom-chuc"],
  "loi_nhan_cho_be": "Rex tin con làm được phép cộng có nhớ rồi!"
}
```

Kiểm tra trước khi áp dụng: `noi_dung`, `ky_nang`, `game`, `che_do`, `bai_hoc_goi_y` phải nằm trong danh mục; `so_cau` trong khoảng 5 đến 30; lời nhắn cho bé qua bộ lọc từ ngữ và dưới 80 ký tự. Sai khuôn thì bỏ đề xuất, dùng bộ lập kế hoạch có sẵn của game.

### 5.10 Lưu trữ

- IndexedDB, cơ sở dữ liệu `dao-khung-long`, các kho: `ho_so` (khóa `id`), `su_kien` (khóa `id`, chỉ mục `be+luc`, `be+cau`), `tom_tat_cau`, `tom_tat_van`, `ho_so_hoc_tap`, `thiet_lap`.
- Ghi theo lô; nếu ghi lỗi (hết dung lượng), giữ tóm tắt, bỏ bớt nhật ký gốc cũ nhất và ghi một sự kiện `luu_tru_canh_bao`.
- Di trú: mỗi thay đổi lược đồ tăng `v`; bộ đọc hiểu mọi phiên bản cũ; không sửa sự kiện đã ghi.
- 6 game cũ chơi trong đảo qua cầu nối `dao-khung-long/js/cau-noi.js` (giai đoạn 5): đảo mở game cũ trong một iframe cùng tên miền (`../<thư mục>/?dao=1&man=<mã màn>`), game cũ lấy câu hỏi và ghi mọi thao tác qua `window.parent.DaoCauNoi`. Mọi sự kiện đi qua đúng một `NhatKy` và một `VanChoi` của đảo, nên không có hai nơi cùng ghi một phiên, và báo cáo gộp mọi game theo mã chương trình. Khi chơi riêng ngoài đảo, game cũ giữ nguyên `stats` và `missed` như trước để trang chủ không vỡ. (Bản đầu của spec định chép `nhat-ky.js` vào từng game; đổi sang cầu nối vì tránh được phiên lệch khi chuyển trang và giữ một bộ sinh câu duy nhất.)

## 6. Dữ liệu ghi nhận cho Góc phụ huynh

| Màn phụ huynh | Đọc từ | Hiện gì |
|---|---|---|
| Tổng quan tuần | hồ sơ học tập, tóm tắt ván | phút, ngày, câu, tỉ lệ tự làm đúng, giỏi, đang luyện, cần giúp, thích gì |
| Bản đồ kỹ năng | hồ sơ học tập | 43 nội dung theo 10 vùng, mức thành thạo, cờ cần giúp |
| Nhật ký chi tiết | tóm tắt ván, tóm tắt câu | theo ngày: từng ván, từng câu, kết quả, lỗi, giây, lọc theo nội dung hoặc mã lỗi |
| Xem lại một câu | nhật ký gốc | dòng thời gian thao tác với mốc giây, đáp án bé cân nhắc, gợi ý đã xem, lần làm lại |
| Kế hoạch tuần | hồ sơ học tập | nhiệm vụ đề xuất, lý do, việc làm cùng con |

## 7. Câu hỏi mở và rủi ro

| Câu hỏi | Ai trả lời | Hạn |
|---|---|---|
| Ghi vị trí chạm (x, y) có cần không, hay chỉ ghi đối tượng được chạm? Đề xuất: chỉ ghi đối tượng, trừ game vuốt | 3hoa | trước khi làm GĐ 0 |
| Giữ nhật ký gốc 120 ngày có đủ cho LLM phân tích xu hướng cả học kì? Tóm tắt ván giữ vĩnh viễn nên xu hướng vẫn còn | 3hoa | GĐ 3 |
| Máy dùng chung: bé chơi nhầm hồ sơ anh chị làm lệch dữ liệu. Hỏi lại “Con là ai?” sau 12 giờ | thử với bé thật | GĐ 5 |
| iPad cũ có chậm khi ghi IndexedDB giữa ván không | kiểm thử trên máy thật | GĐ 0 |

## 8. Kế hoạch kiểm chứng

- Kiểm thử đơn vị cho `nhat-ky.js`: phong bì đủ trường, ULID tăng dần, lược đồ hợp lệ theo `06-su-kien-v1.schema.json`.
- Kịch bản phát lại: mỗi game có một ván mẫu được điều khiển tự động; so chuỗi sự kiện sinh ra với chuỗi mong đợi.
- Tính lại: xóa ba lớp tóm tắt, dựng lại từ nhật ký gốc, so khớp.
- Đo dung lượng thật sau 7 ngày chơi của 2 bé.
- Thử gói xuất với một LLM: đọc gói của bé mẫu, trả đúng khuôn đầu ra ở mục 5.9 trong 5 lần liên tiếp.

## Lịch sử thay đổi

| Ngày | Thay đổi | Bởi |
|---|---|---|
| 2026-09-27 | Bản đầu: hồ sơ có tuổi và lớp, nhật ký từng thao tác, ba lớp tóm tắt, gói xuất và hợp đồng đầu ra cho LLM | 3hoa |
| 2026-09-27 | Giai đoạn 2 của Đảo Khủng Long: thêm mã game `xep-hinh-so` vào lược đồ v1 (thêm, không đổi phiên bản); `tra_loi` của bài hai bước có `buoc`; tóm tắt câu có `buoc1` (bước chọn phép) và `tra_loi_sai`; `chon` chỉ tính là đổi ý từ lần chọn thứ hai trong câu; sự kiện `bai_hoc_xem` có mã bài học, số bước, nghe lại, giây, bỏ qua, câu thử | 3hoa |
| 2026-09-27 | Giai đoạn 3 đến 5 của Đảo Khủng Long: thêm mã game `rung-hinh-khoi`, `lat-lich` và các kiểu thao tác `ve`, `noi`, `xoay`, `boc`, `lat_trang`, `dat`, `bo_ra`, `di_chuyen`, `nhay`, `ngam`, `tro` vào lược đồ v1 (thêm, không đổi phiên bản); `cau_ket_thuc` dùng `het_gio` cho game có giờ (câu quay lại sau 2 câu như câu sai); ngân hàng câu có đủ 43 mã nội dung lớp 2 (B2.x, C2.x) và cơ chế cắm thêm loại câu; sáu game cũ ghi qua cầu nối iframe thay vì chép `nhat-ky.js`; Góc phụ huynh đủ các màn ở mục 6 và gói xuất cho LLM ở mục 5.9 | 3hoa |
