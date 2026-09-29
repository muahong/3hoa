# Tháp Đồng Hồ 🕐🧱

Trò chơi xếp đồng hồ kiểu Tetris giúp các bạn nhỏ lớp 2, lớp 3 học **xem đồng hồ**: giờ đúng, giờ rưỡi, giờ 15 phút, đếm 5 phút, giờ kém, xem giờ từng phút và một ngày 24 giờ.
Đồng hồ rơi từ trên xuống; bé đưa đồng hồ sang cột ghi đúng giờ rồi bấm **⬇ THẢ**. Thả đúng thì đồng hồ nổ lấp lánh và được điểm, thả sai thì đồng hồ hóa đá chồng thành tháp – tháp chạm đỉnh là thua.
Trước mỗi màn có **bài học** (đồng hồ động, giọng đọc), sau mỗi màn có **hỏi đáp 3 câu** để bé rút kinh nghiệm, ghi nhớ kiến thức và **mở khóa màn tiếp theo**.
Trong bài học, tên hai kim được tô và gạch chân đúng bằng màu của kim trên hình (**kim ngắn** xanh `#118ab2`, **kim dài** cam `#ff6b35`), kèm hai ô chú thích ngay dưới đồng hồ; các chữ in đậm khác dùng màu tím để không lẫn với tên kim.
Chạy trực tiếp trên trình duyệt (Safari trên iPad, Chrome, Edge...), không cần cài đặt, không cần máy chủ đặc biệt.

## Chơi thử trên máy tính

```bash
python -m http.server 8787 --directory thap-dong-ho
```

rồi mở `http://localhost:8787` trong trình duyệt. Trên máy tính: phím **← →** di chuyển, **↓** rơi nhanh, **Space** hoặc **Enter** thả, phím **1–4** chọn cột, **H** xin gợi ý 💡, **Esc** tạm dừng.

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
| `js/dao.js`, `dao.css` | Chế độ Đảo Khủng Long (thể loại "Tháp Xếp Hình" trong đảo), xem mục bên dưới |
| `manifest.json`, `sw.js`, `icons/` | Hỗ trợ cài như ứng dụng (PWA) và chơi ngoại tuyến |
| `og.jpg` | Ảnh chia sẻ 1200×630 cho Facebook, Zalo, Messenger (thẻ `og:image` trong `index.html`) |

## Chơi trong Đảo Khủng Long

Đảo (`dao-khung-long/`) mở game trong iframe với `?dao=1&man=<mã màn>` (hợp đồng ở `dao-khung-long/js/cau-noi.js`). Chỉ khi có `?dao=1`, trang nằm trong iframe và trang cha có `window.DaoCauNoi` thì `js/dao.js` mới bật; mở trực tiếp thì game chạy y như cũ. Các chỗ nối trong `js/game.js` đều ghi chú `[Đảo]`.

- **Mỗi khối rơi là một câu hỏi** của ngân hàng đảo (`cauTiep({ so_lua_chon: 4, vi_tri: ['cot_1'…] })`). Khối mang hình của đề (mặt đồng hồ), chữ ngắn ("1 giờ 15 phút") hoặc dấu hỏi; thẻ bên phải ghi đủ đề và hình to (tia số, các hình đánh số). Mỗi cột là một lựa chọn: chữ/số, hình nhỏ, hoặc mặt đồng hồ vẽ bằng canvas (khi đề chỉ có chữ, như "Đồng hồ nào chỉ 8 giờ?"). Câu có 2 hoặc 3 lựa chọn thì bảng có 2 hoặc 3 cột.
- Bé đưa khối sang cột (◀ ▶, chạm cột, kéo, phím ← → hoặc 1–4) rồi thả (⬇ THẢ, chạm cột lần nữa, Space/Enter/↓). Khối chạm đáy cột nào thì trả lời bằng giá trị của cột đó. Nhật ký: `doi_cot` (gộp các bước liền nhau, có `tu`, `den`, `buoc`, `cach`), `tha`, rồi `tra_loi` kèm `vi_tri`, `cot_dau`, `so_cot`.
- **Không hết giờ, không thua**: khối dừng lơ lửng một hàng trên chỗ đáp chờ bé; cột đá cao gần đỉnh thì tự dọn. Bảng 5 hàng, đĩa đáp án cao hơn để vẽ hình và đồng hồ.
- Sai: khối hóa đá, cột đúng sáng lên ("Đây!"), rồi đảo hiện màn "Gần đúng rồi" (`phanHoi`), câu sai quay lại sau 2 câu. Câu được thử 2 lần (`thu_lai`): khối bật lên, cột vừa chọn bị gạch.
- 💡 (hoặc phím H): ba cấp gợi ý của ngân hàng (`goiY`), cấp 3 gạch một cột sai (`loai_bo`). 🔊 đọc lại đề (`nghe_lai`). ⏸ / Esc: `tamDung`, bảng tạm dừng trên đảo có ▶ Chơi tiếp, 🔊 Âm thanh (bật / tắt hiệu ứng và nhạc trong ván này, không lưu) và 🏝️ Về đảo, giống nhau ở 6 game (`veDao`).
- Không menu, bài học, hỏi đáp, bảng kết quả, và không ghi `localStorage`: hết câu thì hiệu ứng "HOÀN THÀNH!" rồi `ketThuc({ diem, dong_phu })`, đảo hiện màn kết thúc riêng. Âm thanh và giọng đọc theo cài đặt của đảo (`thongTin().am_thanh`); khủng long của bé (ảnh của đảo) đứng cạnh tháp thay bạn cú.
- Câu không có lựa chọn (màn để dạng mặc định "quay kim" của kỹ năng): game xin đáp án nhiễu từ `NganHang` của đảo và ghi các lựa chọn đã hiện bằng thao tác `tro`.

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

Luật chơi: mỗi màn cần thả đúng một số đồng hồ nhất định (8–15). Thả đúng được 100 điểm nhân với combo (x2, x3, x4 khi đúng liên tiếp) cộng thưởng nhanh (chip **Combo 1/3 → 2/3 → x2** trên HUD cho bé thấy mình sắp được nhân điểm, và mỗi lần thả nhanh hiện thêm dòng **+50 ⚡ nhanh!**). Bé có thể bấm **💡** (hoặc phím **H**) để xin gợi ý bất cứ lúc nào – cột đúng sẽ nhấp nháy, đổi lại lượt đó chỉ được 20 điểm và không tính chuỗi combo. Thả sai, đồng hồ hóa đá chồng lên cột đó, đồng thời hiện đáp án đúng và cột đúng sáng lên. Thả đúng dọn bớt 1 viên đá của cột đó; đúng 5 lần liên tiếp dọn sạch tháp. Sai 2 lần liên tiếp, cột đúng sẽ nhấp nháy gợi ý (được ít điểm hơn). Đồng hồ không được chạm tới mà rơi hết giờ cũng tính là sai (⏰ hết giờ). Sau mỗi lần sai, trò chơi dừng 3 giây để đọc và giải thích cách xem, rồi hỏi lại chính đồng hồ đó. Bạn **cú mèo** ngồi cạnh tháp reo mừng khi bé thả đúng, che mắt khi bé thả sai và ngủ gật khi tạm dừng. Ở màn hình kết quả, mục **📝 Cần ôn lại** hiện những đồng hồ bé đọc nhầm – chạm vào thẻ để nghe cách đọc và mở lời giải thích ngắn. Kết thúc màn: 3 sao nếu không sai, 2 sao nếu sai không quá 1/5 số đồng hồ của màn (màn 8 câu: 2 lần, màn 15 câu: 3 lần) – màn hình tổng kết ghi rõ ngưỡng này. Nếu tháp đổ từ 2 lần trở lên, màn hình "Tháp đổ" mời bé bật **🐢 Chơi chậm hơn** (đồng hồ rơi lâu hơn 40 %, gợi ý ngay sau một lần sai); chế độ này được giữ nguyên khi bé thử lại hay xem lại bài học của chính màn đó, và tự tắt khi bé qua màn.

**Hỏi đáp sau màn**: 3 câu hỏi gồm 1 câu đọc đồng hồ (ưu tiên lấy từ chính đồng hồ bé đã đọc nhầm) và 2 câu kiến thức về bài vừa học. Riêng bài tổng kết của **Siêu Tháp** hỏi 2 đồng hồ + 1 câu kiến thức của phần khó (màn 4–7), ưu tiên đúng màn bé còn yếu nhất theo thống kê. Trả lời sai sẽ hiện lời giải thích và cho thử lại; trả lời đúng cả 3 câu mới mở khóa màn tiếp theo. Phụ huynh, thầy cô có thể mở khóa tất cả các màn ở màn hình chọn màn (có câu hỏi kiểm tra người lớn).

## Tùy chỉnh nhanh

- **Thêm hoặc sửa màn chơi**: chỉnh mảng `LEVELS` (số câu cần đúng `goal`, giây rơi `fall`), hàm `genFor` và `minutesFor` trong `js/clock.js`.
- **Bài học và câu hỏi**: sửa `LESSONS` và `CONCEPT` trong `js/clock.js`.
- **Kích thước bảng**: `COLS`, `ROWS` trong `js/game.js`.
- **Nhạc nền**: sửa giai điệu trong `TRACKS` ở `js/audio.js`.
- **Sau khi cập nhật game trên website**: ở thư mục gốc chạy `python scripts/refresh-games.py`. Script ghi lại dấu `noi-dung` của mọi tệp được lưu sẵn trong `sw.js` và tự tăng `CACHE` khi có tệp đổi (quên chạy thì `node tests/run.js` báo lỗi). Tệp mới thì thêm vào `CORE` (bắt buộc) hoặc `OPTIONAL` (cố gắng lưu) trước khi chạy. Phần còn lại của `sw.js` sinh từ script, không sửa tay: trang và JS/CSS lấy mạng trước (chờ tối đa 3 giây rồi dùng bản đã lưu), ảnh và phông lấy bộ nhớ đệm trước, phông Baloo 2 lấy từ `../fonts/`.
- **Ít hiệu ứng**: nút ✨ Hiệu ứng: Nhiều/Ít trên trang chính (và tự động khi hệ thống bật "giảm chuyển động") giảm hạt, tắt rung/chớp màn hình, tắt pháo giấy.
- **Điện thoại dựng đứng**: cụm ◀ ⬇ ▶ được thu gọn còn mỗi nút 💡 đặt bên lề trái (chạm thẳng vào cột để đưa đồng hồ tới, chạm lần nữa để thả) – nhờ vậy ô bảng rộng thêm khoảng 30 % và chữ trên đĩa đáp án đọc được. Máy tính bảng và máy tính vẫn có đủ bốn nút.

### Chọn cột và xác nhận thả bằng cảm ứng

Chạm lần đầu để chọn cột; ô đáp phía dưới có viền sáng cho biết đồng hồ sẽ đáp ở đâu. Chạm lại cột đã chọn rồi nhấc ngón để thả. Kéo ngang chỉ di chuyển/chọn cột, không thả; hủy chạm hoặc nhấc ngón ngoài bảng không thả. Quy tắc này áp dụng cả cột đồng hồ xuất hiện ban đầu. Các phím và nút THẢ vẫn thả trực tiếp.

## Kiểm thử

Chạy từ thư mục gốc của kho:

```
node --test tests/thap-dong-ho.test.js
node --test tests/thap-dong-ho-dao.test.js
NODE_PATH=/opt/node22/lib/node_modules node tests/e2e/thap-dong-ho.e2e.js
```
