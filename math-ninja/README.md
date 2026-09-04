# Ninja Toán Học 🍎🥷

Trò chơi chém trái cây (kiểu Fruit Ninja) giúp các bạn nhỏ lớp 1 đến lớp 3 luyện **phép cộng và phép trừ**.
Chạy trực tiếp trên trình duyệt (Safari trên iPad, Chrome, Edge...), không cần cài đặt, không cần máy chủ đặc biệt.

## Chơi thử trên máy tính

Mở thư mục này bằng một máy chủ tĩnh bất kỳ, ví dụ:

```bash
python -m http.server 8787 --directory math-ninja
```

rồi mở `http://localhost:8787` trong trình duyệt. (Mở thẳng file `index.html` cũng chạy được, nhưng chế độ ngoại tuyến sẽ không hoạt động.)

## Đưa lên website 3hoa.com

1. Tải **toàn bộ thư mục `math-ninja`** (giữ nguyên cấu trúc bên trong) lên website, ví dụ vào `public_html/math-ninja/`.
2. Truy cập `https://3hoa.com/math-ninja/` để chơi.
3. Website nên chạy qua **HTTPS** để bật được chế độ chơi ngoại tuyến (service worker) và tính năng "Thêm vào Màn hình chính" hoạt động đẹp nhất trên iPad.

Không cần cơ sở dữ liệu. Điểm cao và bảng vàng được lưu ngay trên thiết bị (localStorage) của từng máy.

## Nhiều bé chơi chung một máy (hồ sơ người chơi)

- Bấm vào **chip tên** ở menu chính để chọn hoặc thêm bé (tối đa 8 bé, mỗi bé có tên và hình đại diện). Hồ sơ dùng chung cho mọi game trên 3hoa.com (khóa `3hoa-players-v1`).
- Mỗi bé có kỷ lục, bảng vàng, kho **"ôn lại thông minh"** (những phép tính từng sai sẽ xuất hiện lại khoảng 1/4 số câu, có nhãn 📝 Ôn lại) và **📊 Kết quả** riêng (số ván, độ chính xác, phút luyện tập, sao từng màn, chủ đề còn yếu, huy hiệu "Đã thuộc").
- Nút **🗑 Xóa tiến trình** và xóa người chơi nằm sau một câu hỏi nhân dành cho phụ huynh.
- Cấu trúc lưu trữ (khóa `ninja-toan-v1`): thiết lập thiết bị ở cấp cao nhất (`sound`, `music`, `voice`, `fx`, `duration`, `seenTip`) và `players[<id>] = { records, names, missed, stats }` cho từng bé. Dữ liệu của bản cũ (chưa có hồ sơ) được tự chuyển sang bé mặc định `p1`.

## Chơi trên iPad toàn màn hình

Mở trang bằng Safari → bấm nút **Chia sẻ** → **Thêm vào Màn hình chính**. Biểu tượng "Ninja Toán" sẽ xuất hiện như một ứng dụng và chạy toàn màn hình, không có thanh địa chỉ.

## Cấu trúc thư mục

| Tệp | Nội dung |
| --- | --- |
| `index.html` | Khung giao diện: menu, chọn màn, HUD, tạm dừng, kết quả |
| `style.css` | Giao diện thân thiện với trẻ em, tối ưu cảm ứng |
| `js/math.js` | Sinh phép tính theo từng lớp, đáp án nhiễu "giống lỗi thường gặp", lời giải thích cách nhẩm (`explain`) và tên lỗi quen thuộc (`misconception`) |
| `js/fruits.js` | Vẽ trái cây, bom, tim bằng Canvas (vector, không cần ảnh) |
| `js/audio.js` | Âm thanh tổng hợp bằng Web Audio (không cần file mp3) |
| `js/game.js` | Bộ máy trò chơi: vật lý, chém đa chạm, điểm, combo, bảng vàng |
| `js/profile.js` | Hồ sơ người chơi dùng chung cho các game 3hoa.com (tên, hình đại diện; khóa `3hoa-players-v1`) |
| `manifest.json`, `sw.js`, `icons/` | Hỗ trợ cài như ứng dụng (PWA) và chơi ngoại tuyến |

## Các màn chơi

**Chém đáp án** (nhìn phép tính, chém quả có đáp án đúng)

| Màn | Nội dung |
| --- | --- |
| Cộng trừ đến 10 | Lớp 1 |
| Phạm vi 20 | Lớp 1, không nhớ |
| Cộng trừ có nhớ | Lớp 2, ví dụ 8 + 7, 15 − 9 |
| Phạm vi 100 | Lớp 2 |
| Nhân 2 và 5 | Lớp 2, bảng nhân 2, 5 (đôi khi 10) |
| Phạm vi 1000 | Lớp 3 |
| Nhân 3 và 4 | Lớp 3, bảng nhân 3, 4 (ôn 2, 5) |
| Bảng cửu chương | Lớp 3, bảng nhân 2 đến 9 |
| Nhân số lớn | Lớp 3, ví dụ 23 × 4, 40 × 6, 120 × 3 |
| Siêu Ninja | Trộn cộng, trừ, nhân, bay nhanh hơn (phần phạm vi 1000 chỉ dùng số tròn trăm/tròn chục để bé nhẩm kịp) |

**Ghép đôi** (chém 2 quả cộng, trừ hoặc nhân với nhau bằng số cho trước): Bạn của 10, Cộng trong 20, Trừ trong 20, Bạn của 100, Cộng trong 100, Nhân bằng…

Luật chơi: mỗi ván 1, 1,5 hoặc 2 phút, có 3 tim. Chém số sai hoặc chém bom mất 1 tim (bom không tính là câu sai). Chém tim 💗 để hồi mạng. Trả lời đúng liên tiếp để nhân điểm (Combo x2, x3, x4). Cứ 5 câu đúng lên một màn, quả bay nhanh hơn một chút. Nếu lỡ mất quả đúng 2 lần, quả đúng sẽ được đánh dấu vòng vàng để gợi ý.

### Học được gì khi chơi

- **Gợi ý theo yêu cầu 💡** – bí quá thì bấm nút 💡 ở góc trên (hoặc lỡ 2 lần thì game tự gợi ý): quả đúng có vòng vàng, game đọc và hiện đáp án. Câu dùng gợi ý được **50 điểm** thay vì 100 và không tính vào chuỗi combo.
- **Giải thích khi sai** – ngoài đáp án, game còn dạy mẹo nhẩm ("8 + 2 = 10, thêm 5 nữa là 15", "6 × 7 = 6 × 5 + 6 × 2 = 30 + 12 = 42") và gọi tên lỗi quen thuộc ("Con quên nhớ 1 rồi!", "Nhầm sang ô bên cạnh trong bảng nhân rồi!"). Đáp án đúng hiện ngay trong thẻ phép tính 1,5 giây.
- **Thưởng nhanh ⚡** – trả lời trong 2 giây được thêm 50 điểm (2–4 giây: 25 điểm), tính từ lúc quả hiện ra chứ không phải lúc ra câu hỏi.
- **Cần ôn lại 📝** – cuối ván liệt kê những phép tính đã sai; những câu đó quay lại ở các ván sau với nhãn 📝 Ôn lại, đúng 2 lần là xoá khỏi kho.
- **Đã thuộc ✅** – khi đúng từ 90% trên ít nhất 20 câu của một màn, thẻ màn đó được gắn huy hiệu "Đã thuộc" (ở lưới chọn màn và trong 📊 Kết quả).
- **Bước tiếp theo** – được 3 sao thì bảng kết quả mời chơi **màn tiếp theo**; hết tim thì mời chơi **màn dễ hơn**. Lưới chọn màn gắn nhãn 👉 Chơi tiếp cho màn nên luyện.

## Âm thanh

- **Âm thanh** (nút 🔊): tiếng chém, nước bắn, chuông đúng/sai, bom, tim, combo... (tổng hợp bằng Web Audio, không cần file mp3).
- **Nhạc nền** (nút 🎵): nhạc chiptune tự tổng hợp, bài nhẹ ở menu và bài sôi động khi chơi, tăng tốc ở 10 giây cuối.
- **Đọc phép tính** (nút 🗣️): đọc to phép tính, lời khen, đáp án đúng khi sai... bằng giọng tiếng Việt của thiết bị (Web Speech API). Trên iPad/iPhone dùng giọng "Linh" có sẵn; máy tính cần có giọng tiếng Việt (Windows: cài gói ngôn ngữ Tiếng Việt, Chrome: giọng Google). Nếu thiết bị không có giọng Việt, nút này tự vô hiệu.

Bốn nút bật/tắt (**🔊 Âm thanh**, **🎵 Nhạc nền**, **🗣️ Đọc phép tính** và **✨ Hiệu ứng: Nhiều/Ít** cho máy yếu hoặc bé nhạy với chuyển động) nằm ở menu chính và màn hình tạm dừng, được ghi nhớ trên thiết bị. Trên điện thoại hẹp (≤ 420 px) nhãn được rút gọn (🔊 Âm thanh · 🎵 Nhạc · 🗣️ Đọc · ✨ Nhiều/Ít) để bốn nút vừa hai hàng. Nếu máy đã bật "Giảm chuyển động" trong Cài đặt, nút ✨ hiển thị **Ít (theo cài đặt máy)** và bị khóa.

## Tùy chỉnh nhanh

- **Nhạc nền**: sửa giai điệu trong `TRACKS` ở `js/audio.js` (tên nốt và số bước 1/16).

- **Thêm hoặc sửa màn chơi**: chỉnh mảng `ANSWER_LEVELS` và `PAIR_LEVELS` trong `js/math.js` (tốc độ `speed`, số quả `fruits`, tỉ lệ bom `bomb`).
- **Ngưỡng sao**: hàm `starThresholds` và bảng `STAR_FACTOR` trong `js/game.js`.
- **Thời gian mỗi ván**: nhóm nút trong `index.html` (`data-sec`).
- **Sau khi cập nhật game trên website**: tăng số phiên bản `CACHE` trong `sw.js` (ví dụ `ninja-toan-v2`) để thiết bị đã cài nhận bản mới.
