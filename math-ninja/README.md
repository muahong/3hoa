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

## Chơi trên iPad toàn màn hình

Mở trang bằng Safari → bấm nút **Chia sẻ** → **Thêm vào Màn hình chính**. Biểu tượng "Ninja Toán" sẽ xuất hiện như một ứng dụng và chạy toàn màn hình, không có thanh địa chỉ.

## Cấu trúc thư mục

| Tệp | Nội dung |
| --- | --- |
| `index.html` | Khung giao diện: menu, chọn màn, HUD, tạm dừng, kết quả |
| `style.css` | Giao diện thân thiện với trẻ em, tối ưu cảm ứng |
| `js/math.js` | Sinh phép tính theo từng lớp và các đáp án nhiễu "giống lỗi thường gặp" |
| `js/fruits.js` | Vẽ trái cây, bom, tim bằng Canvas (vector, không cần ảnh) |
| `js/audio.js` | Âm thanh tổng hợp bằng Web Audio (không cần file mp3) |
| `js/game.js` | Bộ máy trò chơi: vật lý, chém đa chạm, điểm, combo, bảng vàng |
| `manifest.webmanifest`, `sw.js`, `icons/` | Hỗ trợ cài như ứng dụng (PWA) và chơi ngoại tuyến |

## Các màn chơi

**Chém đáp án** (nhìn phép tính, chém quả có đáp án đúng)

| Màn | Nội dung |
| --- | --- |
| Cộng trừ đến 10 | Lớp 1 |
| Phạm vi 20 | Lớp 1, không nhớ |
| Cộng trừ có nhớ | Lớp 2, ví dụ 8 + 7, 15 − 9 |
| Phạm vi 100 | Lớp 2 |
| Phạm vi 1000 | Lớp 3 |
| Siêu Ninja | Trộn tất cả, bay nhanh hơn |

**Ghép đôi** (chém 2 quả cộng hoặc trừ lại bằng số cho trước): Bạn của 10, Cộng trong 20, Trừ trong 20, Bạn của 100, Cộng trong 100.

Luật chơi: mỗi ván 1, 1,5 hoặc 2 phút, có 3 tim. Chém số sai hoặc chém bom mất 1 tim. Chém tim 💗 để hồi mạng. Trả lời đúng liên tiếp để nhân điểm (Combo x2, x3, x4). Cứ 5 câu đúng lên một màn, quả bay nhanh hơn một chút. Nếu lỡ mất quả đúng 2 lần, quả đúng sẽ được đánh dấu vòng vàng để gợi ý.

## Tùy chỉnh nhanh

- **Thêm hoặc sửa màn chơi**: chỉnh mảng `ANSWER_LEVELS` và `PAIR_LEVELS` trong `js/math.js` (tốc độ `speed`, số quả `fruits`, tỉ lệ bom `bomb`).
- **Ngưỡng sao**: hàm `starThresholds` và bảng `STAR_FACTOR` trong `js/game.js`.
- **Thời gian mỗi ván**: nhóm nút trong `index.html` (`data-sec`).
- **Sau khi cập nhật game trên website**: tăng số phiên bản `CACHE` trong `sw.js` (ví dụ `ninja-toan-v2`) để thiết bị đã cài nhận bản mới.
