# Tháp Đồng Hồ 🕐🧱

Trò chơi xếp đồng hồ kiểu Tetris giúp các bạn nhỏ lớp 2, lớp 3 học **xem đồng hồ**: giờ đúng, giờ rưỡi, giờ 15 phút, đếm 5 phút, giờ kém, xem giờ từng phút và một ngày 24 giờ.
Đồng hồ rơi từ trên xuống; bé đưa đồng hồ sang cột ghi đúng giờ rồi bấm **⬇ THẢ**. Thả đúng thì đồng hồ nổ lấp lánh và được điểm, thả sai thì đồng hồ hóa đá chồng thành tháp – tháp chạm đỉnh là thua.
Trước mỗi màn có **bài học** (đồng hồ động, giọng đọc), sau mỗi màn có **hỏi đáp 3 câu** để bé rút kinh nghiệm, ghi nhớ kiến thức và **mở khóa màn tiếp theo**.
Chạy trực tiếp trên trình duyệt (Safari trên iPad, Chrome, Edge...), không cần cài đặt, không cần máy chủ đặc biệt.

## Chơi thử trên máy tính

```bash
python -m http.server 8787 --directory thap-dong-ho
```

rồi mở `http://localhost:8787` trong trình duyệt. Trên máy tính: phím **← →** di chuyển, **↓** rơi nhanh, **Space** hoặc **Enter** thả, phím **1–4** chọn cột, **Esc** tạm dừng.

## Đưa lên website 3hoa.com

1. Tải **toàn bộ thư mục `thap-dong-ho`** (giữ nguyên cấu trúc bên trong) lên website.
2. Truy cập `https://3hoa.com/thap-dong-ho/` để chơi.
3. Website nên chạy qua **HTTPS** để bật được chế độ chơi ngoại tuyến (service worker) và tính năng "Thêm vào Màn hình chính" trên iPad.

Không cần cơ sở dữ liệu. Tiến trình mở khóa màn, điểm cao và số sao được lưu ngay trên thiết bị (localStorage) của từng máy.

## Hồ sơ người chơi, ôn lại thông minh và kết quả của bé

- **Nhiều bé dùng chung một máy**: chạm vào nút tên (🐯 Bé ▾) trên trang chính để thêm bạn mới, đổi tên, đổi hình hoặc chọn bạn đang chơi. Mỗi bạn có tiến trình, sao, kỷ lục và kho ôn lại riêng. Danh sách người chơi (`js/profile.js`, khóa `3hoa-players-v1`) dùng chung cho mọi trò chơi của 3hoa.com trên cùng thiết bị, nên bé chỉ cần tạo tên một lần.
- **Ôn lại thông minh**: đồng hồ bé đọc nhầm được ghi lại; ở lượt kế tiếp bé được hỏi lại ngay, và ở các màn sau khoảng 25 % số câu (1–3 câu mỗi màn, gắn nhãn 📝 Ôn lại) lấy từ kho này cho tới khi bé đọc đúng 2 lần.
- **📊 Kết quả** (màn hình chọn màn hoặc màn hình người chơi): số ván, tỉ lệ đúng, phút luyện tập, sao và kỷ lục từng màn, màn cần luyện thêm, danh hiệu ✅ Đã thuộc (đúng ≥ 90 % trên ít nhất 20 đồng hồ) và danh sách đồng hồ cần ôn. Nút xóa tiến trình và nút mở khóa tất cả các màn nằm sau **cổng phụ huynh** (một phép nhân đơn giản).

## Cấu trúc thư mục

| Tệp | Nội dung |
| --- | --- |
| `index.html` | Khung giao diện: menu, chọn màn, bài học, HUD, nút điều khiển, tạm dừng, kết quả, hỏi đáp |
| `style.css` | Giao diện thị trấn tươi sáng thân thiện với trẻ em, tự đổi bố cục theo màn hình ngang/dọc |
| `js/clock.js` | Kiến thức xem giờ: cách đọc tiếng Việt (giờ đúng, rưỡi, kém, 24 giờ), sinh mốc giờ và đáp án nhiễu theo màn, vẽ đồng hồ SVG, bài học, ngân hàng câu hỏi |
| `js/audio.js` | Hiệu ứng, nhạc nền tổng hợp bằng Web Audio và giọng đọc tiếng Việt (Web Speech) |
| `js/profile.js` | Hồ sơ người chơi dùng chung cho các trò chơi 3hoa.com (tên, hình đại diện, người đang chơi) – giống hệt nhau ở mọi game |
| `js/game.js` | Bộ máy trò chơi: bảng 4 cột × 6 hàng, đồng hồ rơi, tháp đá, điểm, combo, bài học, hỏi đáp, mở khóa màn |
| `manifest.json`, `sw.js`, `icons/` | Hỗ trợ cài như ứng dụng (PWA) và chơi ngoại tuyến |

## Các màn chơi

| Màn | Kiến thức | Lớp |
| --- | --- | --- |
| 1. Giờ đúng | Kim ngắn chỉ giờ, kim dài chỉ phút; kim dài chỉ số 12 là giờ đúng | Lớp 2 |
| 2. Giờ rưỡi | Kim dài chỉ số 6 là 30 phút; kim ngắn nằm giữa hai số | Lớp 2 |
| 3. Giờ 15 phút | Mỗi số cách nhau 5 phút; kim dài chỉ số 3 là 15 phút | Lớp 2 |
| 4. Đếm 5 phút | Số kim dài chỉ × 5 = số phút (6 giờ 40 phút, 2 giờ 55 phút…) | Lớp 3 |
| 5. Giờ kém | 7 giờ 45 phút = 8 giờ kém 15 phút | Lớp 3 |
| 6. Từng phút | Mỗi vạch nhỏ là 1 phút: 6 giờ 23 phút | Lớp 3 |
| 7. Một ngày 24 giờ | 3 giờ chiều = 15 giờ; đồng hồ điện tử | Lớp 3 |
| 8. Siêu Tháp | Trộn tất cả, đồng hồ rơi nhanh hơn | Tổng hợp |

Luật chơi: mỗi màn cần thả đúng một số đồng hồ nhất định (8–15). Thả đúng được 100 điểm nhân với combo (x2, x3, x4 khi đúng liên tiếp) cộng thưởng nhanh. Thả sai, đồng hồ hóa đá chồng lên cột đó, đồng thời hiện đáp án đúng và cột đúng sáng lên. Thả đúng dọn bớt 1 viên đá của cột đó; đúng 5 lần liên tiếp dọn sạch tháp. Sai 2 lần liên tiếp, cột đúng sẽ nhấp nháy gợi ý (được ít điểm hơn). Đồng hồ không được chạm tới mà rơi hết giờ cũng tính là sai (⏰ hết giờ). Sau mỗi lần sai, trò chơi dừng 3 giây để đọc và giải thích cách xem, rồi hỏi lại chính đồng hồ đó. Kết thúc màn: 3 sao nếu không sai, 2 sao nếu sai không quá 2 lần.

**Hỏi đáp sau màn**: 3 câu hỏi gồm 1 câu đọc đồng hồ (ưu tiên lấy từ chính đồng hồ bé đã đọc nhầm) và 2 câu kiến thức về bài vừa học. Trả lời sai sẽ hiện lời giải thích và cho thử lại; trả lời đúng cả 3 câu mới mở khóa màn tiếp theo. Phụ huynh, thầy cô có thể mở khóa tất cả các màn ở màn hình chọn màn (có câu hỏi kiểm tra người lớn).

## Tùy chỉnh nhanh

- **Thêm hoặc sửa màn chơi**: chỉnh mảng `LEVELS` (số câu cần đúng `goal`, giây rơi `fall`), hàm `genFor` và `minutesFor` trong `js/clock.js`.
- **Bài học và câu hỏi**: sửa `LESSONS` và `CONCEPT` trong `js/clock.js`.
- **Kích thước bảng**: `COLS`, `ROWS` trong `js/game.js`.
- **Nhạc nền**: sửa giai điệu trong `TRACKS` ở `js/audio.js`.
- **Sau khi cập nhật game trên website**: tăng số phiên bản `CACHE` trong `sw.js` (hiện là `thap-dong-ho-v2`, lần sau đổi thành `thap-dong-ho-v3`) để thiết bị đã cài nhận bản mới.
- **Ít hiệu ứng**: nút ✨ Hiệu ứng: Nhiều/Ít trên trang chính (và tự động khi hệ thống bật "giảm chuyển động") giảm hạt, tắt rung/chớp màn hình.
