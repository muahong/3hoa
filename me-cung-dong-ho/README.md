# Mê Cung Đồng Hồ 🕐🦉

Trò chơi mê cung kiểu Pacman giúp các bạn nhỏ **lớp 2, lớp 3** học kỹ năng **xem đồng hồ** (nội dung Toán lớp 2 và lớp 3).
Cú Tí đi trong mê cung, ăn hạt sáng, tránh Ma Ngủ Gật và phải tìm đúng **đồng hồ** chỉ giờ ghi ở mục tiêu (ví dụ *7 giờ 30 phút*).
Trước mỗi màn có **bài học ngắn**, sau mỗi màn có **phần hỏi đáp**: trả lời đúng mới mở được màn tiếp theo, câu trả lời sai được giải thích và hỏi lại để bé rút kinh nghiệm.
Chạy trực tiếp trên trình duyệt (Safari trên iPad, Chrome, Edge...), không cần cài đặt, không cần máy chủ đặc biệt.

## Chơi thử trên máy tính

```bash
python -m http.server 8787 --directory me-cung-dong-ho
```

rồi mở `http://localhost:8787` trong trình duyệt. Trên máy tính dùng **phím mũi tên** hoặc **W A S D** để đi, **Esc** để tạm dừng. Trên iPad/điện thoại: **vuốt** trên màn hình, **chạm** vào nơi muốn đi hoặc bấm các nút mũi tên.

## Đưa lên website 3hoa.com

1. Tải **toàn bộ thư mục `me-cung-dong-ho`** (giữ nguyên cấu trúc bên trong) lên website.
2. Truy cập `https://3hoa.com/me-cung-dong-ho/` để chơi.
3. Website nên chạy qua **HTTPS** để bật được chế độ chơi ngoại tuyến (service worker) và tính năng "Thêm vào Màn hình chính" trên iPad.

Không cần cơ sở dữ liệu. Tiến độ (màn đã mở khóa), điểm cao và số sao được lưu ngay trên thiết bị (localStorage).

## Cấu trúc thư mục

| Tệp | Nội dung |
| --- | --- |
| `index.html` | Khung giao diện: menu, chọn màn, bài học, học xem giờ, HUD, nút di chuyển, hỏi đáp, kết quả |
| `style.css` | Giao diện đêm trăng thân thiện với trẻ em, tối ưu cảm ứng, đổi bố cục theo màn hình ngang/dọc |
| `js/clock.js` | Kiến thức xem giờ: mô hình thời gian, đọc giờ tiếng Việt, vẽ đồng hồ (Canvas + SVG), màn chơi, bài học, ngân hàng câu hỏi, đáp án nhiễu "giống lỗi thường gặp" |
| `js/mazes.js` | Ba mê cung ASCII (có đường hầm), tự xoay khi màn hình dọc, BFS |
| `js/audio.js` | Hiệu ứng, nhạc nền tổng hợp bằng Web Audio và giọng đọc tiếng Việt (Web Speech) |
| `js/profile.js` | Hồ sơ người chơi dùng chung cho các game 3hoa.com (tên, hình đại diện; khóa `3hoa-players-v1`) – sao chép nguyên văn, nạp trước `game.js` |
| `js/game.js` | Bộ máy trò chơi: di chuyển trên lưới, AI ma, sao sức mạnh, mục tiêu, mạng, hỏi đáp, mở khóa, lưu tiến độ theo từng bé, ôn lại thông minh, báo cáo |
| `manifest.json`, `sw.js`, `icons/` | Hỗ trợ cài như ứng dụng (PWA) và chơi ngoại tuyến |

## Các màn chơi (mở khóa lần lượt)

| Màn | Kiến thức | Lớp |
| --- | --- | --- |
| 1. Giờ đúng | Kim ngắn chỉ giờ, kim dài chỉ số 12 | Lớp 2 (ôn) |
| 2. Giờ rưỡi | Kim dài chỉ số 6 là 30 phút | Lớp 2 |
| 3. Giờ 15 phút | Kim dài chỉ số 3 là 15 phút, mỗi số cách 5 phút | Lớp 2 |
| 4. Sáng, chiều, tối | Một ngày 24 giờ, 3 giờ chiều = 15 giờ (đồng hồ điện tử) | Lớp 2 |
| 5. Xem đúng 5 phút | Số kim dài chỉ × 5 = số phút | Lớp 3 |
| 6. Giờ kém | 7 giờ 45 phút = 8 giờ kém 15 phút | Lớp 3 |
| 7. Đồng hồ điện tử | Đối chiếu đồng hồ kim với 7:45, 6:05… | Lớp 3 |
| 8. Thời gian trôi | 7 giờ + 30 phút = 7 giờ 30 phút, đủ 60 phút thêm 1 giờ | Lớp 3 |

Mỗi màn gồm 4–5 lượt tìm đồng hồ. Trong mê cung có 4–6 đồng hồ, chỉ một chiếc đúng; các chiếc còn lại là những nhầm lẫn hay gặp (đổi vai hai kim, sai giờ khi kim ngắn ở giữa hai số, cộng thay vì trừ ở giờ kém, quên cộng 12 buổi chiều…).

Luật chơi: có 3 tim ❤️. Bị ma bắt hoặc ăn nhầm đồng hồ mất 1 tim (game cho biết đồng hồ đó chỉ mấy giờ). Ăn ⭐ để ma buồn ngủ và bắt được ma. Ăn hết hạt sáng được thưởng. Tìm đủ đồng hồ là qua màn → **hỏi đáp** 3 câu (thêm 1 câu "rút kinh nghiệm" nếu bé chọn nhầm đồng hồ trong màn). Trả lời sai sẽ hiện lời giải thích và hỏi lại câu đó; trả lời đúng hết mới mở màn tiếp theo. Sao: qua màn 1 sao, hỏi đáp đúng ngay lần đầu +1 sao, không chọn nhầm đồng hồ +1 sao.

Màn **📖 Học xem giờ** ở menu chính cho bé quay kim (+5 phút, +15 phút, +30 phút, +1 giờ), xem cách đọc, đồng hồ điện tử tương ứng và nghe đọc.

## Nhiều bé chơi chung một máy

Nút **người chơi** (hình + tên) ở góc menu chính mở màn *Ai đang chơi?*: thêm bạn mới (tối đa 8), đổi tên, đổi hình. Mỗi bé có tiến độ, kỷ lục, sao và danh sách *cần ôn lại* riêng; tên và hình dùng chung cho mọi game trên 3hoa.com. Khoảng 25% số lượt trong một màn (1–3 lượt, không bao giờ lượt đầu) được lấy từ những giờ bé từng đọc nhầm (gắn nhãn *📝 Ôn lại*); một câu hỏi đáp cũng ôn lại mục đó. Đọc đúng 2 lần thì mục được bỏ khỏi danh sách.

## Dành cho phụ huynh

Ở màn **Chọn màn chơi** có nút **📊 Kết quả** (số ván, tỉ lệ đúng, phút luyện tập, sao và tỉ lệ đúng từng màn, màn cần luyện thêm, danh sách cần ôn lại của bé đang chơi), nút *mở khóa tất cả các màn* (khi bé lớp 3 muốn học ngay giờ kém) và *học lại từ đầu* (xóa tiến độ của bé đang chơi). Các thao tác này hỏi một phép nhân (ví dụ *7 × 8 = ?*) để bé không tự bấm. Trên menu chính có nút **✨ Hiệu ứng: Nhiều/Ít** cho máy yếu hoặc bé nhạy với chuyển động (game cũng tự giảm hiệu ứng khi hệ thống bật *Reduce Motion*).

## Tùy chỉnh nhanh

- **Thêm hoặc sửa màn chơi**: mảng `LEVELS` trong `js/clock.js` (số lượt `rounds`, số đồng hồ `clocks`, số ma `ghosts`, tốc độ ma `speed`, tập phút `mins`/`focus`, mê cung `maze`).
- **Bài học và câu hỏi**: `LESSONS` và `QUIZ` trong `js/clock.js`; số câu hỏi mỗi màn: tham số của `C.buildQuiz` trong `startQuiz()` (`js/game.js`).
- **Mê cung**: `RAW` trong `js/mazes.js` (ký hiệu ghi ở đầu tệp). Ô tối thiểu `MIN_CELL` trong `js/game.js` quyết định khi nào dùng mê cung nhỏ hơn.
- **Tốc độ Cú Tí, thời gian ma buồn ngủ, điểm**: `PLAYER_SPEED`, `FRIGHT_TIME`, `POINTS` trong `js/game.js`.
- **Nhạc nền**: sửa giai điệu trong `TRACKS` ở `js/audio.js`.
- **Sau khi cập nhật game trên website**: tăng số phiên bản `CACHE` trong `sw.js` (ví dụ `me-cung-dong-ho-v2`) để thiết bị đã cài nhận bản mới.
