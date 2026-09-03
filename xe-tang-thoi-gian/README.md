# Xe Tăng Thời Gian 🕒🤖

Trò chơi xe tăng bắn robot giúp các bạn nhỏ lớp 2, lớp 3 học **xem đồng hồ** theo chương trình Toán:
giờ đúng, giờ rưỡi, giờ 15 phút, ngày – 24 giờ và các buổi, xem đồng hồ đến 5 phút, giờ kém, chính xác đến từng phút, đồng hồ điện tử và thời gian trôi qua.
Chạy trực tiếp trên trình duyệt (Safari trên iPad, Chrome, Edge...), không cần cài đặt, không cần máy chủ đặc biệt.

## Cách học trong game

Mỗi màn dạy **một kiến thức mới** và gồm ba bước:

1. **📖 Bài học** – giải thích ngắn gọn kèm đồng hồ minh họa, chạm vào các ví dụ để xem kim quay và nghe đọc.
2. **🎯 Bắn robot** – robot mang bảng đáp án (chữ hoặc đồng hồ) tiến về phía xe tăng. Bé nhìn câu hỏi ở trên, **chạm vào robot có đáp án đúng** để bắn. Bắn sai 2 lần thì đáp án đúng được đánh dấu vòng vàng. Robot chạm tới xe tăng làm mất 1 tim (có 3 tim).
3. **🧠 Hỏi đáp** – 4 câu: ôn lại lỗi vừa mắc trong màn, câu hỏi ghi nhớ kiến thức và câu luyện tập mới, mỗi câu đều có **giải thích**. Trả lời đúng **3/4** câu trở lên mới **mở khóa màn tiếp theo**; nếu chưa đạt, bé xem lại bài học rồi làm lại hỏi đáp.

## Chơi thử trên máy tính

```bash
python -m http.server 8787 --directory xe-tang-thoi-gian
```

rồi mở `http://localhost:8787` trong trình duyệt. Trên máy tính: phím **1 2 3 4** bắn robot tương ứng, **← →** chọn mục tiêu rồi **Enter** để bắn, **A / D** lái xe tăng, **Esc** tạm dừng. Trong phần hỏi đáp: phím **1 2 3 4** chọn đáp án, **Enter** sang câu tiếp.

## Đưa lên website 3hoa.com

1. Tải **toàn bộ thư mục `xe-tang-thoi-gian`** (giữ nguyên cấu trúc bên trong) lên website.
2. Truy cập `https://3hoa.com/xe-tang-thoi-gian/` để chơi.
3. Website nên chạy qua **HTTPS** để bật được chế độ chơi ngoại tuyến (service worker) và tính năng "Thêm vào Màn hình chính" trên iPad.

Không cần cơ sở dữ liệu. Tiến trình (màn đã mở khóa, sao, điểm cao) được lưu ngay trên thiết bị (localStorage) của từng máy.

## Cấu trúc thư mục

| Tệp | Nội dung |
| --- | --- |
| `index.html` | Khung giao diện: menu, chọn màn, bài học, HUD, tạm dừng, kết quả, hỏi đáp, mục phụ huynh |
| `style.css` | Giao diện đồng quê tươi sáng, thân thiện với trẻ em, tối ưu cảm ứng iPad |
| `js/clock.js` | Mô hình thời gian: đọc giờ tiếng Việt, vẽ đồng hồ kim/điện tử, sinh câu hỏi và đáp án nhiễu "giống lỗi thường gặp" |
| `js/levels.js` | 9 màn chơi: bài học, bộ sinh câu hỏi và ngân hàng câu hỏi đáp có giải thích |
| `js/audio.js` | Hiệu ứng, nhạc nền tổng hợp bằng Web Audio và giọng đọc tiếng Việt (Web Speech) |
| `js/game.js` | Bộ máy trò chơi: xe tăng, robot, đạn, hiệu ứng, điểm, combo, hỏi đáp, lưu tiến trình |
| `manifest.json`, `sw.js`, `icons/` | Hỗ trợ cài như ứng dụng (PWA) và chơi ngoại tuyến |

## Các màn chơi

| Màn | Kiến thức | Lớp |
| --- | --- | --- |
| 1. Giờ đúng | Kim ngắn chỉ giờ, kim dài chỉ phút; kim dài chỉ số 12 | Lớp 2 (ôn tập) |
| 2. Giờ rưỡi | 1 giờ = 60 phút; kim dài chỉ số 6 là 30 phút, "rưỡi" | Lớp 2 |
| 3. Giờ 15 phút | Kim dài chỉ số 3 là 15 phút | Lớp 2 |
| 4. Ngày và giờ | Một ngày 24 giờ; các buổi sáng, trưa, chiều, tối, đêm; 3 giờ chiều = 15 giờ | Lớp 2 |
| 5. Đến 5 phút | Mỗi số cách nhau 5 phút, đếm thêm 5 theo kim dài | Lớp 3 |
| 6. Giờ kém | 7 giờ 50 phút = 8 giờ kém 10 phút | Lớp 3 |
| 7. Từng phút & điện tử | Mỗi vạch nhỏ là 1 phút; đọc đồng hồ điện tử 07:13, 19:13 | Lớp 3 |
| 8. Thời gian trôi qua | Từ 7 giờ đến 7 giờ 30 phút là 30 phút; giờ kết thúc | Lớp 3 |
| 9. Siêu Xe Tăng | Trộn tất cả, robot tiến nhanh hơn | Thử thách |

Các màn mở khóa lần lượt. Nút **👨‍👩‍👧** ở màn chọn màn (có câu hỏi nhân để trẻ không tự bấm) cho phép phụ huynh, thầy cô **mở khóa tất cả màn** để bé học đúng phần của lớp mình, hoặc xóa tiến trình.

## Tùy chỉnh nhanh

- **Thêm hoặc sửa màn chơi, bài học, câu hỏi đáp**: chỉnh mảng `LEVELS` trong `js/levels.js` (`questions` số câu mỗi màn, `fall` số giây robot tiến tới xe tăng, `speed` hệ số tốc độ, `lesson`, `quiz`).
- **Số câu hỏi đáp và ngưỡng đạt**: `QUIZ_N`, `QUIZ_PASS` trong `js/game.js`.
- **Ngưỡng sao**: hàm `starsFor` trong `js/game.js`.
- **Nhạc nền**: sửa giai điệu trong `TRACKS` ở `js/audio.js`.
- **Sau khi cập nhật game trên website**: tăng số phiên bản `CACHE` trong `sw.js` (ví dụ `xe-tang-thoi-gian-v2`) để thiết bị đã cài nhận bản mới.
