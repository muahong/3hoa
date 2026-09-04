# Cưỡi Hổ Vượt Lửa 🐯🔥

Trò chơi **cưỡi hổ nhảy qua vòng lửa** giúp các bạn nhỏ lớp 2, lớp 3 học một kỹ năng mới trong chương trình: **xem đồng hồ và tính thời gian**.
Bé cưỡi hổ chạy trong rạp xiếc; mỗi cụm có 3 vòng lửa mang 3 đáp án. Nhìn câu hỏi (đồng hồ kim, đồng hồ điện tử hoặc lời hỏi) rồi **chạm vào vòng lửa có đáp án đúng** để hổ nhảy qua.
Chạy trực tiếp trên trình duyệt (Safari trên iPad, Chrome, Edge...), không cần cài đặt, không cần máy chủ đặc biệt.

## Vòng lặp học tập của mỗi màn

1. **📖 Bài học** – 3 đến 5 trang ngắn có đồng hồ minh họa và giọng đọc, dạy kiến thức mới của màn.
2. **🐯 Vượt vòng lửa** – 8 đến 12 cụm vòng lửa. Đúng thì vòng nổ thành sao và được điểm; sai (hoặc hết giờ) thì mất 1 tim, vòng đúng sáng xanh và giọng đọc giải thích vì sao.
3. **❓ Hỏi đáp** – sau khi về đích, bé trả lời 4 đến 5 câu hỏi ghi nhớ kiến thức, kèm 1 đến 2 câu **ôn lại** đúng những câu bé vừa làm sai. Trả lời sai sẽ hiện giải thích và cho thử lại. Trả lời đúng hết mới **mở khóa màn tiếp theo**.

Tiến độ (màn đã mở, sao, điểm cao, huy hiệu) được lưu trên thiết bị (localStorage) **theo từng bé**: nhiều bé dùng chung một máy, mỗi bé có tên, hình đại diện và tiến trình riêng (nút người chơi ở menu chính; hồ sơ dùng chung với các game khác của 3hoa.com). Những câu bé làm sai được ghi nhớ và **ôn lại thông minh** (khoảng 25% câu của các ván sau, gắn nhãn "📝 Ôn lại"). Màn **📊 Kết quả** (ở Hành trình hoặc màn người chơi) cho phụ huynh xem sao từng màn, độ chính xác, thời gian luyện tập, chủ đề cần ôn. Các thao tác dành cho phụ huynh (mở khóa tất cả màn, xóa tiến trình, xóa người chơi) cần trả lời một phép nhân.

## Chơi thử trên máy tính

```bash
python -m http.server 8787 --directory cuoi-ho
```

rồi mở `http://localhost:8787` trong trình duyệt. Trên máy tính có thể bấm phím **1, 2, 3** (vòng trên, giữa, dưới) hoặc **↑ ↓ + Enter** để chọn vòng, **Enter/Space** (hoặc chạm màn hình) để chạy tiếp sau khi xem đáp án, **Esc** để tạm dừng hoặc đóng màn hình đang mở; trong bài học dùng **← →**, trong hỏi đáp dùng **1, 2, 3** và **Enter**; thẻ màn, dòng ghi nhớ và chip ôn lại đều dùng được bằng **Tab + Enter**. Kiểm thử tự động: `node --test tests/cuoi-ho.test.js` và `NODE_PATH=/opt/node22/lib/node_modules node tests/e2e/cuoi-ho.e2e.js` (chạy từ thư mục gốc của kho).

## Đưa lên website 3hoa.com

1. Tải **toàn bộ thư mục `cuoi-ho`** (giữ nguyên cấu trúc bên trong) lên website.
2. Truy cập `https://3hoa.com/cuoi-ho/` để chơi.
3. Website nên chạy qua **HTTPS** để bật được chế độ chơi ngoại tuyến (service worker) và tính năng "Thêm vào Màn hình chính" trên iPad.

## Cấu trúc thư mục

| Tệp | Nội dung |
| --- | --- |
| `index.html` | Khung giao diện: menu, hành trình (chọn màn), bài học, HUD, tạm dừng, kết quả, hỏi đáp, ghi nhớ |
| `style.css` | Giao diện rạp xiếc ban đêm, thân thiện với trẻ em, đổi bố cục theo màn hình ngang/dọc |
| `js/lessons.js` | Nội dung học: đọc giờ tiếng Việt, vẽ đồng hồ SVG, bộ sinh câu hỏi từng màn, bài học, câu hỏi đáp |
| `js/audio.js` | Hiệu ứng (lửa, nhảy, hổ gầm...), nhạc nền rạp xiếc tổng hợp bằng Web Audio, giọng đọc tiếng Việt (Web Speech) |
| `js/profile.js` | Hồ sơ người chơi dùng chung cho các game 3hoa.com (tên, hình đại diện; khóa `3hoa-players-v1`) |
| `js/game.js` | Bộ máy trò chơi: hổ và bé (vẽ bằng canvas), vòng lửa, cú nhảy, điểm, tim, combo, bài học, hỏi đáp, mở khóa |
| `manifest.json`, `sw.js`, `icons/` | Hỗ trợ cài như ứng dụng (PWA) và chơi ngoại tuyến |

## Các màn chơi (hành trình chinh phục đồng hồ)

| Màn | Kiến thức | Lớp |
| --- | --- | --- |
| 1. Giờ đúng | Kim ngắn chỉ giờ, kim dài chỉ phút; kim dài chỉ số 12 là giờ đúng | Lớp 2 |
| 2. Giờ rưỡi | 1 giờ = 60 phút; kim dài chỉ số 6 là 30 phút; kim ngắn giữa hai số thì đọc theo số nhỏ hơn | Lớp 2 |
| 3. Giờ 15 phút | Kim dài chỉ số 3 là 15 phút; ôn giờ đúng, giờ rưỡi | Lớp 2 |
| 4. Đếm từng 5 phút | Mỗi số là 5 phút (kim dài chỉ số k → k × 5 phút) | Lớp 3 |
| 5. Giờ kém | 8 giờ 45 phút = 9 giờ kém 15 phút | Lớp 3 |
| 6. Chính xác đến phút | Mỗi vạch nhỏ là 1 phút; đồng hồ điện tử | Lớp 3 |
| 7. Một ngày 24 giờ | Buổi sáng, trưa, chiều, tối; 3 giờ chiều = 15 giờ; đồng hồ điện tử 24 giờ | Lớp 3 |
| 8. Tính thời gian | 1 giờ = 60 phút, 1 ngày = 24 giờ, 1 tuần = 7 ngày, 1 năm = 12 tháng; giờ kết thúc, khoảng thời gian | Lớp 3 |
| 9. Siêu Hổ | Trộn tất cả, vòng lửa đến nhanh hơn, hoàn thành để nhận Huy hiệu Hổ Vàng | Thử thách |

Luật chơi: mỗi màn có 3 tim ❤️ (màn 1–3 được 4 tim vì bé mới học). Chọn sai hoặc hết giờ mất 1 tim; vòng bé chọn sai mang dấu **✕** đỏ, vòng đúng sáng xanh với dấu **✓** và viền nét đứt (phân biệt được cả khi bé khó nhìn màu), kèm lời giải thích trên màn hình (chạm để chạy tiếp). Hết tim thì hổ mệt: bé có thể chơi lại, xem lại bài học, hoặc bấm **🐯 Tập luyện** để chơi mà không mất tim (không tính kỷ lục và sao). Ở bảng kết quả, phần **📝 Cần ôn lại** có nút **🔁 Luyện lại các câu này** – một ván rút gọn chỉ gồm đúng những câu vừa sai (sinh lại với đáp án nhiễu mới, không mất tim, không tính kỷ lục). Bí quá thì bấm **💡 Gợi ý** (phím `H`): một vòng lửa sai sẽ tắt và mẹo của màn được nhắc lại, đổi lại câu đó chỉ được nửa điểm. Chạm vào thẻ câu hỏi để phóng to đồng hồ. Điểm thưởng chọn nhanh tính theo đồng hồ của từng màn (câu có lời văn ở màn 8 được cộng thêm vài giây để đọc đề), trả lời đúng liên tiếp có Combo x2, x3, x4. Sao ⭐: 3 sao không sai câu nào, 2 sao sai 1 câu, 1 sao về đích.

Màn **📖 Ghi nhớ** ở menu chính tóm tắt kiến thức của tất cả các màn, chạm vào từng dòng để nghe đọc. Phần kiến thức bé đang sai nhiều được gắn **📝** và tự xếp lên đầu.

Thiết lập thiết bị (dùng chung cho mọi bé): 🔊 Âm thanh, 🎵 Nhạc nền, 🗣️ Giọng đọc và **✨ Hiệu ứng: Nhiều/Ít** (Ít = bớt tia lửa, không rung/chớp màn hình, tắt hoạt ảnh; tự bật khi hệ thống chọn "giảm chuyển động"). Trang có Content-Security-Policy (không mã nội tuyến), dữ liệu đọc từ localStorage luôn được kiểm tra kiểu/khoảng, và một lỗi bất ngờ trong ván chơi sẽ đưa bé về menu kèm thông báo thay vì treo màn hình.

## Tùy chỉnh nhanh

- **Thêm hoặc sửa màn, bài học, câu hỏi đáp**: chỉnh mảng `LEVELS` trong `js/lessons.js` (số cụm vòng `gates`, giây chọn mỗi vòng `timer`, tốc độ `speed`, các trang `lesson`, câu hỏi `quiz`, dòng `notes`).
- **Bộ sinh câu hỏi cho vòng lửa**: các hàm `genL1` … `genL9` trong `js/lessons.js`.
- **Độ khó chung**: `JUMP_T`, `LEARN_T`, `RUN_GAP_T`, số tim `MAX_HEARTS` (hoặc `hearts` của từng màn trong `js/lessons.js`), ngưỡng sao `starsFor` trong `js/game.js`.
- **Nhạc nền**: sửa giai điệu trong `TRACKS` ở `js/audio.js`.
- **Sau khi cập nhật game trên website**: tăng số phiên bản `CACHE` trong `sw.js` (ví dụ `cuoi-ho-v2`) để thiết bị đã cài nhận bản mới.
