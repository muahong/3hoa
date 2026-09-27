# Đảo Khủng Long

Game học Toán lớp 2 (SGK Kết nối tri thức với cuộc sống) cho iPad xoay ngang. Bé có hồ sơ riêng trên máy, ấp một quả trứng khủng long (Rex Dũng Mãnh hoặc Mây Dễ Thương), đi quanh hòn đảo 10 vùng đất và giải toán bằng nhiều kiểu game. Mỗi thao tác chơi được ghi vào nhật ký theo lược đồ sự kiện v1 để phụ huynh (và sau này một LLM) biết chính xác bé sai ở đâu.

Kế hoạch và mockup: artifact “Đảo Khủng Long” bản 2. Spec: `docs/du-an-toan-2-3/spec/06-theo-doi-hoc-tap.md`, `06-su-kien-v1.schema.json`, `03a-chuong-trinh-lop-2.md`.

## Giai đoạn 1 (bản này)

| Hạng mục | Có gì |
|---|---|
| Hồ sơ | Con là ai (tối đa 8 bé, hỏi lại sau 12 giờ), tạo hồ sơ 3 bước: tên, tuổi 5 đến 11, lớp gợi ý từ tuổi và năm học để xác nhận; mỗi tháng 9 hỏi lên lớp |
| Chọn trứng | Dũng Mãnh (Rex) hoặc Dễ Thương (Mây), không gán theo giới tính |
| Bản đồ | 10 vùng + 2 đấu trường đặt trên ảnh đảo; vùng học kì 2 khóa với lớp 2 cho tới khoảng Bài 37; vùng chưa có game hiện “Sắp có” |
| Nhiệm vụ hôm nay | 3 nhiệm vụ lập từ hồ sơ học tập: ôn nhanh cách quãng, luyện lại chỗ yếu (kèm lý do như “Con hay quên nhớ 1”), học mới theo bài đang học |
| Trang vùng | Trứng của vùng với vòng tiến độ, mức thành thạo từng màn, nhãn lỗi hay gặp, sao, cúp luyện tập chung |
| Đua Xe | Vùng 2 (cộng, trừ qua 10, tìm số còn thiếu) và vùng 4 (cộng, trừ có nhớ trong 100, nhẩm tròn chục, biểu thức hai dấu) |
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

## Cấu trúc tệp

| Tệp | Vai trò |
|---|---|
| `index.html`, `style.css` | Mọi màn hình (một trang), CSP như các game khác |
| `js/nhat-ky.js` | Nhật ký sự kiện v1: ULID, phong bì chung, 4 tầng phiên/ván/câu/thao tác, bộ đệm ghi mỗi 2 giây, đóng phiên và ván dở khi app bị tắt ngang, xóa dữ liệu một bé. Kèm lớp lưu trữ IndexedDB (dự phòng bộ nhớ). Tự chứa để sao chép vào game khác |
| `js/ngan-hang.js` | Ngân hàng câu theo mã nội dung và mã kỹ năng, mã câu ổn định, đáp án nhiễu mang mã lỗi theo công thức 03a mục 3.3, gợi ý 3 cấp, lời giải, sinh theo hạt giống |
| `js/hoc-tap.js` | Hàm thuần: tóm tắt câu, tóm tắt ván (kèm câu mô tả tiếng Việt), hồ sơ học tập, 5 mức thành thạo, cờ Cần giúp, quả mọng, sao, mức lớn |
| `js/van-choi.js` | Vòng đời một ván dùng chung cho mọi thể loại: xếp câu, câu sai quay lại, ghi đủ chuỗi sự kiện mỗi câu |
| `js/dao.js` | 10 vùng, 2 đấu trường, các màn, loài khủng long, luật mở vùng, lập nhiệm vụ hôm nay |
| `js/ho-so.js` | Hồ sơ bé, gợi ý lớp từ tuổi, bé đang chơi, tên gợi ý từ hồ sơ chung `3hoa-players-v1` (chỉ đọc) |
| `js/dua-xe.js` | Game Đua Xe: đường giả 3D trên canvas, cổng, trạm dừng, bóng kỷ lục, màn phản hồi |
| `js/phan-hoi.js` | Nội dung màn “Gần đúng rồi!”: đặt tính cột dọc, que tính |
| `js/am-thanh.js` | Tiếng động tổng hợp bằng Web Audio, giọng đọc tiếng Việt |
| `js/app.js` | Điều phối các màn, cập nhật tóm tắt, thưởng, nhiệm vụ, mức lớn sau mỗi ván |
| `assets/img/` | Hình WebP xuất từ `assets/art/` bằng `python scripts/dkl-images.py` |
| `assets/art/` | Prompt và MANIFEST của hình do Codex vẽ; bản gốc PNG chỉ giữ cục bộ, không đưa lên git |
| `sw.js`, `manifest.json`, `icons/` | PWA, chơi ngoại tuyến sau lần tải đầu |

## Dữ liệu trên máy

IndexedDB `dao-khung-long`:

| Kho | Khóa | Nội dung |
|---|---|---|
| `ho_so` | `id` | Hồ sơ bé (tên, tuổi khi nhập, lớp và nguồn của lớp, bài đang học, phong cách, khủng long, kỷ lục từng màn, nhiệm vụ hôm nay, trứng vùng đã nở) |
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

Kiểm tra lược đồ sự kiện, ULID, phiên nghỉ 10 phút, đóng phiên dở, gợi ý lớp, ngân hàng câu và mã lỗi, phát lại một ván theo kịch bản (YC-03), tính lại tóm tắt từ nhật ký khớp từng byte (YC-05), mức thành thạo, nhiệm vụ, luật mở vùng, xóa dữ liệu bé (YC-08), danh sách tệp của service worker.

Chơi thử: mở `dao-khung-long/` qua một máy chủ tĩnh (ví dụ `python -m http.server` ở gốc repo). Trong bảng điều khiển trình duyệt có `window.__DKL` (trạng thái app) và `window.DuaXe._trangThai()` để gỡ lỗi.

## Việc của các giai đoạn sau

- GĐ 2: Xếp Hình Số, Truyện Tranh (mở màn “Bài toán thêm, bớt” của vùng 2), Lật Thẻ Anh Em; bài học 30 giây.
- GĐ 3: Góc phụ huynh đầy đủ (tổng quan tuần, nhật ký chi tiết, xem lại một câu, bản đồ kỹ năng, xuất gói cho LLM).
- GĐ 4, 5: các thể loại còn lại, hai đấu trường, đưa 6 game cũ vào đảo qua `nhat-ky.js`.
- Chưa có: vườn khủng long, phụ kiện hiển thị trên khủng long, thẻ Đảo Khủng Long trên trang chủ 3hoa.com.
