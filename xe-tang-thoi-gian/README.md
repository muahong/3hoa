# Xe Tăng Thời Gian 🕒🤖

Trò chơi xe tăng bắn robot giúp các bạn nhỏ lớp 2, lớp 3 học **xem đồng hồ** theo chương trình Toán:
giờ đúng, giờ rưỡi, giờ 15 phút, ngày – 24 giờ và các buổi, xem đồng hồ đến 5 phút, giờ kém, chính xác đến từng phút, đồng hồ điện tử và thời gian trôi qua.
Chạy trực tiếp trên trình duyệt (Safari trên iPad, Chrome, Edge...), không cần cài đặt, không cần máy chủ đặc biệt.

## Cách học trong game

Mỗi màn dạy **một kiến thức mới** và gồm ba bước:

1. **📖 Bài học** – giải thích ngắn gọn kèm đồng hồ minh họa, chạm vào các ví dụ để xem kim quay và nghe đọc.
2. **🎯 Bắn robot** – robot mang bảng đáp án (chữ hoặc đồng hồ) tiến về phía xe tăng. Bé nhìn câu hỏi ở trên, **chạm vào robot có đáp án đúng** để bắn. Bắn sai 2 lần thì đáp án đúng được đánh dấu vòng vàng. Robot chạm tới xe tăng làm mất 1 tim (có 3 tim); đúng ngay **5 câu liền** thì được **thưởng lại 1 tim**. Các câu dài (thời gian trôi qua, đọc từng phút) được thêm thời gian để bé kịp tính.
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

Không cần cơ sở dữ liệu. Tiến trình (màn đã mở khóa, sao, điểm cao, kho "cần ôn lại", thống kê) được lưu ngay trên thiết bị (localStorage) của từng máy, **riêng cho từng bé**: chạm vào **tên bé** trên trang chính để thêm bạn mới, đổi tên, đổi hình (hồ sơ dùng chung cho mọi game trên 3hoa.com). Dữ liệu của phiên bản cũ được tự động chuyển sang bé đầu tiên.

## Cấu trúc thư mục

| Tệp | Nội dung |
| --- | --- |
| `index.html` | Khung giao diện: menu, chọn màn, bài học, HUD, tạm dừng, kết quả, hỏi đáp, mục phụ huynh |
| `style.css` | Giao diện đồng quê tươi sáng, thân thiện với trẻ em, tối ưu cảm ứng iPad |
| `js/clock.js` | Mô hình thời gian: đọc giờ tiếng Việt, vẽ đồng hồ kim/điện tử, sinh câu hỏi và đáp án nhiễu "giống lỗi thường gặp" |
| `js/levels.js` | 9 màn chơi: bài học, bộ sinh câu hỏi và ngân hàng câu hỏi đáp có giải thích |
| `js/audio.js` | Hiệu ứng, nhạc nền tổng hợp bằng Web Audio và giọng đọc tiếng Việt (Web Speech) |
| `js/profile.js` | Hồ sơ người chơi dùng chung giữa các game (tên, hình đại diện) – giống hệt ở mọi game |
| `js/game.js` | Bộ máy trò chơi: xe tăng, robot, đạn, hiệu ứng, điểm, combo, hỏi đáp, lưu tiến trình, ôn lại thông minh, bảng kết quả |
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

Các màn mở khóa lần lượt. Nút **👨‍👩‍👧** ở màn chọn màn (có câu hỏi nhân để trẻ không tự bấm) cho phép phụ huynh, thầy cô **mở khóa tất cả màn** để bé học đúng phần của lớp mình, hoặc xóa tiến trình của bé đang chơi.

**Học từ chỗ sai**: bắn sai 2 lần (hoặc bị robot chạm tới xe tăng) thì đáp án đúng được đánh dấu **vòng vàng** kèm một câu **giải thích vì sao** (chữ + giọng đọc), robot cũng đi chậm lại một nhịp để bé kịp nghe. Bé cũng có thể tự bấm nút **💡 Gợi ý** cạnh câu hỏi bất cứ lúc nào. Câu đã được gợi ý (kể cả câu hỏi lại sau khi mất tim) chỉ được **20 điểm** thay vì 100 × hệ số combo. Hết máu, bảng kết quả có thêm nút **📖 Xem lại bài học**.

**Ôn lại thông minh**: câu bé làm sai được ghi vào kho "cần ôn lại"; ở các ván sau, khoảng 1/4 số câu (1–3 câu, chỉ những câu thuộc màn đã học) được lấy từ kho này với đáp án nhiễu mới và gắn nhãn **📝 Ôn lại** trên HUD. Trả lời đúng hai lần thì câu đó ra khỏi kho. Bảng kết quả cuối ván có mục **📝 Cần ôn lại**: mỗi chip nêu câu hỏi rút gọn, đáp án (vẽ lại đúng mặt đồng hồ hoặc đồng hồ điện tử) và **một dòng vì sao**; chạm vào chip để nghe đọc lại. Bảng chỉ hiện **4 chip** (kèm dòng “… và N câu nữa”) để các nút **🔄 Chơi lại**, **📖 Xem lại bài học**, **🏠 Trang chính** luôn nằm trong màn hình; xem đủ danh sách ở **📊 Kết quả**.

**Bài học nhìn thấy được**: dưới mặt đồng hồ, nhãn dạy luôn **sự tương đương** ("7 giờ 50 phút = 8 giờ kém 10 phút", "3 giờ 30 phút = 3 giờ rưỡi"); bài **Ngày và giờ** và **Từng phút & điện tử** hiện thêm biểu tượng buổi, **đồng hồ điện tử** và cách gọi 24 giờ (🌤️ 15:00 = 15 giờ · buổi chiều); bài **Thời gian trôi qua** cho kim quay chậm từ giờ bắt đầu tới giờ kết thúc. Ở các bài đếm từng phút, **vạch phút được vẽ đậm hơn** để bé đếm được.

**📊 Kết quả** (màn chọn màn hoặc màn người chơi): số ván, tỉ lệ đúng, phút luyện tập, sao/điểm/hỏi đáp từng màn, dấu **Đã thuộc** (đúng ≥ 90 % trên ≥ 20 câu), chủ đề cần luyện thêm và kho cần ôn lại của bé. Nút xóa tiến trình ở đây (và xóa người chơi) đều qua **cổng phụ huynh** (câu nhân) trong trang.

Nút **✨ Hiệu ứng: Nhiều/Ít** (cạnh các nút âm thanh) giảm rung màn hình, chớp sáng và số hạt; thiết bị bật "giảm chuyển động" cũng tự chuyển sang mức ít.

## Tùy chỉnh nhanh

- **Thêm hoặc sửa màn chơi, bài học, câu hỏi đáp**: chỉnh mảng `LEVELS` trong `js/levels.js` (`questions` số câu mỗi màn, `fall` số giây robot tiến tới xe tăng, `speed` hệ số tốc độ, `lesson`, `quiz`).
- **Số câu hỏi đáp và ngưỡng đạt**: `QUIZ_N`, `QUIZ_PASS` trong `js/game.js`.
- **Ngưỡng sao**: hàm `starsFor` trong `js/game.js` – tính theo **số câu** bị sai (mỗi câu chỉ tính một lần dù bắn trượt mấy lần) và số tim còn lại: 3 sao khi không sai câu nào và còn đủ tim, 2 sao khi sai ≤ 2 câu và còn ≥ 2 tim.
- **Thời gian robot tiến tới**: hàm `fallTime` trong `js/game.js` (câu "thời gian trôi qua" ×1,4; "từng phút / điện tử" ×1,2; càng về cuối màn nhanh dần nhưng không quá 25 %).
- **Thưởng tim**: hàm `gainHeart` và điều kiện `G.perfect % 5` trong `js/game.js`.
- **Điểm khi đã xem gợi ý**: hằng số `HINT_POINTS` trong `js/game.js` (mặc định 20).
- **Nhạc nền**: sửa giai điệu trong `TRACKS` ở `js/audio.js`.
- **Sau khi cập nhật game trên website**: tăng số phiên bản `CACHE` trong `sw.js` (ví dụ `xe-tang-thoi-gian-v3`) để thiết bị đã cài nhận bản mới.

## Kiểm thử

Chạy từ thư mục gốc của kho:

```
node --test tests/xe-tang-thoi-gian.test.js
NODE_PATH=/opt/node22/lib/node_modules node tests/e2e/xe-tang-thoi-gian.e2e.js
```
