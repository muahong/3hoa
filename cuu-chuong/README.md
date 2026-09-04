# Vệ Binh Cửu Chương 🚀🪐

Trò chơi bắn thiên thạch giúp các bạn nhỏ lớp 2, lớp 3 thuộc **bảng nhân, bảng chia** (bảng cửu chương).
Thiên thạch mang phép tính rơi xuống hành tinh Ba Hoa; bé gõ đáp án trên bàn phím số rồi bấm **🚀 BẮN** để pháo laser phá thiên thạch.
Chạy trực tiếp trên trình duyệt (Safari trên iPad, Chrome, Edge...), không cần cài đặt, không cần máy chủ đặc biệt.

## Chơi thử trên máy tính

```bash
python -m http.server 8787 --directory cuu-chuong
```

rồi mở `http://localhost:8787` trong trình duyệt. Trên máy tính có thể gõ số bằng bàn phím, **Enter** để bắn, **Backspace** để xóa, **Esc** để tạm dừng.

## Đưa lên website 3hoa.com

1. Tải **toàn bộ thư mục `cuu-chuong`** (giữ nguyên cấu trúc bên trong) lên website.
2. Truy cập `https://3hoa.com/cuu-chuong/` để chơi.
3. Website nên chạy qua **HTTPS** để bật được chế độ chơi ngoại tuyến (service worker) và tính năng "Thêm vào Màn hình chính" trên iPad.

Không cần cơ sở dữ liệu. Điểm cao và bảng vàng được lưu ngay trên thiết bị (localStorage) của từng máy.

## Cấu trúc thư mục

| Tệp | Nội dung |
| --- | --- |
| `index.html` | Khung giao diện: menu, chọn màn, bảng cửu chương, HUD, bàn phím số, tạm dừng, kết quả |
| `style.css` | Giao diện vũ trụ thân thiện với trẻ em, bàn phím số đổi bố cục theo màn hình ngang/dọc |
| `js/tables.js` | Sinh phép nhân, phép chia theo từng bảng, tìm thừa số, nhân chia số lớn; cấu hình màn chơi |
| `js/audio.js` | Hiệu ứng, nhạc nền tổng hợp bằng Web Audio và giọng đọc tiếng Việt (Web Speech) |
| `js/profile.js` | Hồ sơ người chơi dùng chung cho mọi game 3hoa (tên, hình đại diện, tiến trình riêng) – **giống hệt nhau ở mọi game** |
| `js/game.js` | Bộ máy trò chơi: thiên thạch, pháo laser, khiên, điểm, combo, bảng vàng, ôn lại thông minh, báo cáo cho phụ huynh |
| `manifest.json`, `sw.js`, `icons/` | Hỗ trợ cài như ứng dụng (PWA) và chơi ngoại tuyến |

## Các màn chơi

**Luyện từng bảng** (chọn Nhân ×, Chia :, hoặc Cả hai)

| Màn | Lớp |
| --- | --- |
| Bảng 2, Bảng 5 | Lớp 2 |
| Bảng 3, 4, 6, 7, 8, 9 | Lớp 3 |

**Thử thách**

| Màn | Nội dung |
| --- | --- |
| Bảng 2 và 5 | Lớp 2 – trộn nhân và chia |
| Bảng 3, 4, 6 · Bảng 7, 8, 9 · Cả bảng cửu chương | Lớp 3 |
| Tìm thừa số | `? × 6 = 42`, `42 : ? = 6` |
| Nhân chia số lớn | `23 × 4`, `84 : 4`, `125 × 3` |
| Siêu Vệ Binh | Trộn tất cả, rơi nhanh hơn |

Luật chơi: mỗi ván 1, 1,5 hoặc 2 phút, có 3 khiên 🛡️. Thiên thạch chạm khiên làm mất 1 khiên và hiện lời giải thích. Trả lời sai lần đầu, game mách **cách nghĩ** (chưa lộ đáp án); sai lần thứ hai, thiên thạch hiện đáp án để bé gõ theo (được ít điểm hơn, thẻ trả lời hiện số mờ, gõ đúng chữ số nào thì chữ số đó xanh). Bắn thiên thạch 💗 để hồi khiên. Trả lời đúng liên tiếp để nhân điểm (Combo x2, x3, x4). Cứ 5 câu đúng lên một đợt, thiên thạch rơi nhanh hơn và xuất hiện nhiều hơn. Cuối ván có mục **Cần ôn lại** liệt kê các phép tính bé làm sai (chạm để nghe đọc).

Màn **📖 Bảng cửu chương** ở menu chính cho bé xem bảng nhân và bảng chia từ 2 đến 9, chạm vào từng dòng để nghe đọc, hoặc bấm **🔊 Đọc cả bảng** (đọc lần lượt cả bảng nhân rồi bảng chia). Bấm **🚀 Luyện bảng này** ở cuối màn để vào chơi ngay bảng đang xem.

Hết khiên hoặc còn câu làm sai, màn kết quả hiện thêm nút **📖 Xem bảng N** để bé ôn lại đúng bảng vừa gặp khó rồi thử lại — không phải quay về menu tìm lại.
Câu của lớp 2 (bảng 2, bảng 5) luôn giữ đúng thứ tự của bảng (`2 × 7`, không đảo thành `7 × 2`); lớp 3 mới đảo thừa số để bé quen tính giao hoán. Màn có câu 3 chữ số (Nhân chia số lớn, Siêu Vệ Binh) và màn Tìm thừa số cho thiên thạch rơi chậm hơn để bé kịp tính.

## Nút 💡 Gợi ý 💡

Bé bí thì bấm nút **💡** ở góc trên bên phải (hoặc phím **H** trên máy tính):

1. **Lần đầu** – game mách *cách nghĩ* theo đúng cách dạy ở tiểu học, chưa nói đáp án: `7 × 8` → "Con đếm thêm một lần nữa. Lấy 7 × 7 rồi cộng thêm 7."; `42 : 6` → "Con nghĩ ngược lại, 6 nhân mấy thì bằng 42."; `? × 6 = 42` → "Muốn tìm thừa số chưa biết, con lấy tích chia cho thừa số kia, tức là 42 : 6."; `23 × 4` → "Con đặt tính rồi tính…". Câu này mất phần thưởng trả lời nhanh và chỉ được **nửa điểm**, nhưng vẫn tính là bé tự làm được.
2. **Lần thứ hai** – hiện thẳng đáp án kèm lời giải thích đầy đủ (như khi sai 2 lần).

Mọi lời mách và lời giải thích đều được **đọc thành tiếng** (nếu máy có giọng tiếng Việt). Màn kết quả ghi rõ số câu bé đã nhìn đáp án và số lần dùng gợi ý.

## Nhiều bé dùng chung một máy 👧🧒

Bấm vào **thẻ tên** dưới tiêu đề ở menu chính để mở màn **👋 Ai đang chơi?**: thêm bạn mới (tên tối đa 16 chữ, chọn hình đại diện), đổi tên, đổi hình, xóa bạn.
Mỗi bé có kỷ lục, sao, bảng vàng, danh sách "cần ôn lại" và thống kê **riêng**. Danh sách bạn được dùng chung cho mọi game trên 3hoa.com (khóa `3hoa-players-v1`), nên bé chỉ cần chọn tên một lần.
Dữ liệu cũ (khi chưa có hồ sơ) tự động chuyển thành tiến trình của bé đầu tiên, không mất kỷ lục.

## Ôn lại thông minh 📝

Câu nào bé trả lời sai (hoặc để thiên thạch chạm khiên) sẽ được ghi nhớ. Ván sau, khoảng 1/4 số thiên thạch đầu ván mang lại chính những phép tính đó, có nhãn **📝 Ôn lại**. Trả lời đúng 2 lần thì câu đó được xóa khỏi danh sách.

## Kết quả của bé (cho phụ huynh) 📊

Nút **📊 Kết quả** ở màn chọn màn chơi và ở menu chính (hoặc biểu tượng 📊 ở màn người chơi) hiện: số ván đã chơi, tỉ lệ đúng, số phút luyện tập, tổng sao (dạng `n/45`), dòng **Cần luyện thêm** (màn đã làm ≥ 5 câu mà đúng dưới 70%, tối đa 3 màn — chưa đủ dữ liệu thì ẩn), kỷ lục và tỉ lệ đúng từng bảng (kèm nhãn **✅ Đã thuộc** khi bé đúng ≥ 90% trên ít nhất 20 câu, nhãn **⚠️ Cần luyện thêm** ở dòng còn yếu) và mục **📝 Cần ôn lại**.
Mỗi dòng chỉ nói về đúng màn đó: màn luyện bảng cộng dồn mọi câu của bảng ấy, màn thử thách có sổ riêng, màn chưa chơi ghi **chưa chơi**.
Nút **🗑 Xóa tiến trình** được bảo vệ bằng một phép nhân dành cho người lớn (không dùng hộp thoại của trình duyệt).

## Hiệu ứng và trợ năng ♿

- Nút **✨ Hiệu ứng: Nhiều / Ít** cạnh các nút âm thanh: giảm hạt, tắt rung và chớp màn hình. Máy đã bật *Giảm chuyển động* (prefers-reduced-motion) được tự động dùng chế độ ít hiệu ứng.
- Mọi thẻ màn chơi, dòng bảng cửu chương bấm được bằng phím **Tab + Enter**, có viền tiêu điểm rõ ràng; vùng chạm tối thiểu 44 px; nút bật/tắt có `aria-pressed`.
- Bảng điều khiển mở ra bằng hiệu ứng nhẹ, ngôi sao ở màn kết quả hiện lần lượt, pháo giấy chúc mừng khi lập kỷ lục hoặc đạt từ 2 sao — tất cả đều tắt khi chọn *Hiệu ứng: Ít*.
- Ba bông hoa trên hành tinh đung đưa theo gió và reo lên mỗi lần bé bắn trúng (đứng yên ở chế độ ít hiệu ứng).
- Ở màn hình chờ game chỉ vẽ 30 hình/giây, thân thiên thạch và dải màu đuôi lửa được dựng sẵn một lần nên máy đỡ nóng, đỡ tốn pin.

## Tùy chỉnh nhanh

- **Thêm hoặc sửa màn chơi**: chỉnh `TABLE_LEVELS` và `CHALLENGE_LEVELS` trong `js/tables.js` (tốc độ `speed`, số chữ số tối đa `maxDigits`).
- **Độ khó**: `BASE_FALL` (giây rơi tới khiên), `meteorCap()`, `spawnGap()` trong `js/game.js`; hệ số `fall` của từng màn trong `js/tables.js`.
- **Lời mách và lời giải thích**: hàm `hintFor()` và `explainFor()` trong `js/tables.js` (không dùng dấu `?` và chỉ dùng dấu `:` làm dấu chia để máy đọc đúng).
- **Ngưỡng sao**: hàm `starThresholds` và bảng `STAR_FACTOR` trong `js/game.js`.
- **Nhạc nền**: sửa giai điệu trong `TRACKS` ở `js/audio.js`.
- **Sau khi cập nhật game trên website**: tăng số phiên bản `CACHE` trong `sw.js` (ví dụ `cuu-chuong-v2` → `cuu-chuong-v3`) để thiết bị đã cài nhận bản mới.
- **`js/profile.js` là tệp dùng chung**: khi sửa, phải sao chép y nguyên sang tất cả các game (kiểm thử `tests/consistency.test.js` sẽ báo lỗi nếu khác nhau).

## Kiểm thử

Chạy từ thư mục gốc của kho:

```bash
node --test tests/cuu-chuong.test.js
NODE_PATH=/opt/node22/lib/node_modules node tests/e2e/cuu-chuong.e2e.js
```
