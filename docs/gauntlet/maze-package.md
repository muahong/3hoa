# Gói mê cung — vòng 1

Owner: maze_builder. Reviewer: main, chưa đánh giá.

## Trước sửa / tiêu chí nhận

Main quan sát bản local: đọc mục tiêu khoảng 30 giây mất 2 tim; chạm sau tường chỉ chọn trục; mã chỉ có 3 RAW cố định. Builder xác minh source tương ứng. Baseline ảnh/perf được lưu trong `tests/e2e/out/gauntlet/maze` trước sửa.

1. Chạm đích tìm đường BFS, tránh tất cả đồng hồ khác bất kể đúng/sai; vẽ đường/đích; đổi đích, vuốt, quay đầu, cancel/pause không giữ lệnh cũ.
2. Map có seed tái lập, nhiều cấu trúc, vòng thoát, mọi đáp án tới được không phải qua đáp án khác. Giữ API RAW cũ.
3. Đọc câu hỏi an toàn cho tới thao tác đầu tiên, ma ra chậm theo thứ tự; sinh lại có bảo vệ.
4. Điện thoại ngang/dọc đọc và chạm được đáp án; xoay bảo toàn map/trạng thái.
5. Test nhiều seed và đường đi; E2E ít nhất một màn bằng input thật, không teleport hoặc ghi state thắng. Đo frame gameplay và tải ở cùng viewport/DPR.

Giới hạn: Chromium giả lập, không đại diện Safari hoặc iPad thật. Không tự đóng review.

## Kiểm chứng builder (không thay thế review)

- `node --test tests/maze-refresh.test.js tests/me-cung-dong-ho.test.js`: 21/21. 600 seed × map đầy đủ/compact × 6 lượt giả lập vị trí đích; liên thông, vòng thoát, 2 lối sinh, ma cách ít nhất 8 ô, tất cả 6 đáp án có đường tránh mọi đáp án khác; xoay giữ cấu trúc. Seed 69 từng làm bộ chọn tham lam thiếu chỗ: thử lại có giới hạn, tuyệt đối không bỏ điều kiện đường đi.
- `node tests/e2e/maze-refresh.e2e.js`: desktop 1180×820 và touch 390×844 đi thật đến 1 đáp án sai, 4 đáp án đúng, còn 2 tim; trả lời quiz bằng nút → kết quả lưu passed → chơi lại 3 tim → reload giữ tiến trình. Không teleport, không ghi trạng thái thắng, không vô hiệu ma.
- `node tests/e2e/maze-refresh.e2e.js --extra-inputs`: 844×390 và 820×1180 chạm đổi đích, phím quay đầu ghi đè đường chạm, Space dừng, pointercancel, pause/resume, xoay giữ seed. Sau fix, blocked keyboard, D-pad tap và swipe touch CDP đều giữ reading safety; đi được bắt đầu grace >3 giây. PASS.
- Legacy `me-cung-dong-ho.e2e.js`: 1–7 pass, gồm di trú, hồ sơ, kiến thức, kết quả thua, reduced motion, offline (tắt server rồi reload). Setup ma được cập nhật để gửi lệnh di chuyển trước khi kiểm tra ma ra; assertion vẫn kiểm tra ma thực sự ra và đang sợ sao. Cache expectation v4 → v5.
- Legacy 8 phát hiện HUD ở màn 7 tablet dọc cao thêm khoảng 7px sau khi status/độ rộng grid đổi. Đã reserve33px status, điền stage/score trước khi đo layout. Rerun8 PASS, ô39px, HUD có khoảng cách; không bỏ assertion.
- Lỗi mất cú chạm ngay khi vừa Resume đã tái hiện qua input thật: panel fade-out còn bắt pointer. Sửa lớp con screen.hidden không nhận pointer; đường chơi thật hiện đi hết màn.

## Ảnh và hiệu năng

Tất cả ở `tests/e2e/out/gauntlet/maze/` (gitignored): `before/after-{1180,390,844,820}-{menu,gameplay}.png`, `after-*-moving.png`, wrong-feedback, quiz-after-real-play, result, rotated. Ảnh `travel-failed.png` giữ lại làm bằng chứng lỗi đã sửa, không đại diện bản cuối.

- Ô màn 1 bản cuối: desktop 62→60px; phone dọc 31→32px; phone ngang 21→36px; tablet dọc 53→53px. Màn 7 tablet dọc39px (thẻ tham chiếu lớn hơn).
- `perf-before.json`, `perf-after.json`: CPU update+render, navigation load, viewport/DPR1. Số đo đang đọc phải phân biệt với `activePerf` đang đi ăn hạt.
- `perf-before-active.json`: nạp mã HEAD qua route trình duyệt, service worker bị chặn để không lấy nhầm bản mới. `activeSamples` ghi trạng thái và tim trong khi gửi phím thật. Bản cũ có mẫu đang đi rồi dying/mất tim rất sớm.
- Mẫu CPU update+render đang chơi desktop/phone dọc trước khoảng 0.44/0.40ms; sau bản cuối đang đi route khoảng 0.26/0.34ms, còn lượt trước khi nhiều browser cùng chạy đạt1.23/0.98ms. Đây không phải GPU frame interval; bản cũ/mới khác cấu trúc và workload, có tiến trình browser khác đồng thời, không suy ra tăng tốc hoặc FPS/iPad thật. Navigation load bản cuối desktop/phone dọc/ngang/tablet khoảng494/581/864/687ms, phụ thuộc cache/font và môi trường. Không có asset đồ họa mới.

Runtime: Node v22.23.2, Playwright Chromium 1234 trên Windows. Lệnh E2E cần `$env:NODE_PATH='C:\Users\son.nguyen\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'`.

## Phần còn lại / ranh giới

Reviewer độc lập đã trả REVISE lần1, xác minh 2 lỗi (blocked direction; HUD lvl7). Builder sửa đúng hai lỗi và khóa lại product cho closure review; chưa tự đóng verdict. Điều hướng/shared CSS và kiểm thử cập nhật từ service worker cũ do main tích hợp. Chưa có kiểm thử thiết bị iPad thật, Safari hoặc giọng Việt thật. Chưa phát hành hoặc commit riêng bởi builder.

Final builder rerun sau hai fixes: toàn bộ `maze-refresh.e2e.js` 4 viewport PASS, gồm blocked keyboard/Dpad/swipe ở cả 4; desktop + phone dọc vẫn hoàn tất thật với 4 đúng, 1 sai, 2 tim và quiz/result/retry/persist. Legacy 8 và extra-inputs đều PASS.

## Vòng sửa tiếp theo: rail ngang ở màn 7/8

Reviewer đóng hai lỗi đầu, nhưng tìm thêm target card và nút bị cắt dưới đáy ở màn 7, 844×390. Main xác minh ảnh trước khi giao sửa. Nguyên nhân: rail hẹp xếp tim, điểm, tiến độ, trạng thái và lời dẫn đầy đủ nối tiếp, không có giới hạn cho tổng chiều cao.

- Điểm/tiến độ thành một hàng; bỏ từ “đồng hồ” lặp lại ở tiến độ rail; gap 4px; trạng thái ngắn một dòng theo ngữ cảnh. Không ẩn điều khiển.
- Giữ nghĩa nhiệm vụ qua hình tham chiếu: màn 7 “Tìm số cùng giờ”; màn 8 “Bây giờ như hình. Sau X phút?”. Giọng đọc đầy đủ không đổi. Khi xoay, lời dài tự trở lại. Nhãn ôn tập dùng dòng nhãn mục tiêu sẵn có để không tăng chiều cao.
- Đồng hồ tham chiếu tăng 58→80px; cả nút nghe và gợi ý giữ 44×44px.
- `node tests/e2e/maze-refresh.e2e.js --hud`: màn 7/8 tại 390×844, 844×390, 780×360, 820×1180, 1180×820; kiểm tra reading/route/stopped/power/rotated, toàn bộ DOM card/text/button trong viewport, gap với board, clock ngang ≥80px. 50/50 PASS; phase power lấy sao bằng touch thật. Ở 780×360, màn 8 có power chip, card bottom351.75px, vẫn trong màn hình.
- `--shots` đã cập nhật toàn bộ ảnh `after-*` menu/gameplay ở 4 viewport cho gallery cuối, không ghi đè số đo active/perfect-input trước đó (`shots-final.json` riêng). Logic sau thay đổi vẫn 21/21.

Reviewer đã đóng cả ba lỗi: final PASS với extended46/46 và power20/20. Main tích hợp shared shell, tăng cache v6, kiểm tra matrix4view PASS (bao gồm tạo/đổi hồ sơ qua DOM ở mobile), actual old-cache upgrade/EVERY CORE/offline/storage/scope PASS, legacy4+8 PASS. Chưa phát hành.
