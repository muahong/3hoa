# Cải thiện game 3hoa.com — 06/09/2026

## Thay đổi

- Cả sáu game: nút về trang chủ trong cùng tab ở menu và khi tạm dừng; hồ sơ ở góc phải; tiêu đề và nút chính thích ứng với màn hình nhỏ; vùng bấm tối thiểu 44–48 px cho điều hướng/công tắc; viền focus khi dùng bàn phím; hướng dẫn thao tác ngắn; tách thiết lập khỏi nút chơi chính.
- Mê Cung Đồng Hồ: chạm để tìm đường ngắn nhất, vẽ đường đi, dừng tại đích, tránh đi qua đồng hồ khác. Vuốt nhạy hơn; nhớ hướng rẽ, tự đi qua góc cua đơn và quay đầu ngay. Bộ sinh mê cung DFS có mở thêm vòng đi, loại ngõ cụt, giữ seed khi xoay màn hình. Ma xuất phát xa, chờ bé bắt đầu di chuyển, chạy chậm hơn Cú Tí; bảo vệ 4 giây sau xuất phát. Thêm sao gần điểm bắt đầu. Việc đặt đồng hồ kiểm tra các đường tiếp cận để tránh ép bé đi qua đáp án khác.
- Xe Tăng Thời Gian: thân xe có bánh xích, giáp nhiều lớp, đèn và viền vàng; giữ nòng xoay, giật khi bắn, đồng hồ thật. Menu vẽ cùng xe như trong ván chơi.
- Cưỡi Hổ Vượt Lửa: minh họa hổ và bé cưỡi mới; giữ nhảy, nghiêng, nhún khi chạy và phản hồi khi mất tim. Hỗ trợ giảm chuyển động; đồ họa cũ là dự phòng nếu ảnh chưa tải được.
- Ninja Toán Học, Vệ Binh Cửu Chương, Tháp Đồng Hồ: nâng cấp bố cục, điều hướng và khả năng thao tác qua lớp CSS dùng chung. Nội dung bài học, tiến trình và quy tắc chấm điểm được giữ nguyên.
- Trang chủ cập nhật ảnh xe tăng/hổ, giữ đúng tỷ lệ ảnh.
- Mỗi game có bản sao `game-shell.css`, được tái tạo bằng `python scripts/refresh-games.py`; không import chéo thư mục, tiếp tục hoạt động như các PWA tự chứa. Tăng CACHE cho cả sáu game; đưa CSS và ảnh mới vào CORE.

## Kiểm chứng

- `node tests/run.js`: **228/228 đạt**; bổ sung các bài trong `tests/maze-navigation.test.js` và kiểm tra điều hướng cùng tab trong `tests/consistency.test.js`. Kiểm tra cú pháp các tệp JS sửa đổi và `git diff --check` đều đạt.
- 900 seed (300 cho mỗi kích thước): mọi ô mở đến được, mỗi ô có ít nhất hai lối thoát, ma cách điểm xuất phát ít nhất 8 bước, sao cách tối đa 4 bước, cùng seed tạo cùng bản đồ ở hai chiều màn hình.
- 800 lượt đặt đồng hồ trên 8 màn: không trùng vị trí, có đường tới từng đáp án khi chặn các đồng hồ khác.
- Kiểm thử đường đi ngắn nhất, không xuyên tường, tự dừng và quay đầu không nhảy vị trí.
- Trình duyệt Codex: kiểm tra menu cả sáu game tại 390 × 844; xe tăng/hổ ở 1280 × 720; mê cung xoay giữa dọc và ngang. Các ảnh kiểm tra cục bộ nằm tại `tests/e2e/out/refresh/` (không commit).
- Thử tương tác: nút trang chủ từ màn tạm dừng xe tăng giữ nguyên tab (1 tab trước và sau); Ninja nhận 50 điểm sau vuốt; Vệ Binh nhận 150 điểm sau nhập và bắn; Cưỡi Hổ nhận 100 điểm và sang vòng 2; mê cung đi tới đồng hồ 12 giờ sau một lần chạm và ghi nhận 1/4 mục tiêu. Tháp vào màn, chọn cột và tạm dừng được.
- Sửa kiểm thử CSS Cưỡi Hổ vốn lỗi trên Windows do CRLF: chuẩn hóa xuống dòng trước khi kiểm tra phạm vi media query.

Giới hạn: đây là kiểm thử bằng trình duyệt Chromium và màn hình giả lập; chưa thử trên thiết bị iPad/Safari thật. Chưa chạy lại toàn bộ kịch bản Playwright đầu-cuối cũ. Không xác nhận chất lượng giọng Việt trên máy không có giọng Việt. Hình hổ là một sprite có chuyển động toàn thân, chưa phải bộ khung hình chạy riêng cho từng chân.

## Nguồn ảnh và prompt

Tạo mới bằng công cụ ImageGen tích hợp, nền trong suốt; giữ bản gốc trong thư mục ảnh sinh của Codex và sao chép vào dự án. Không dùng API key hay dịch vụ ảnh ngoài.

- `xe-tang-thoi-gian/assets/tank-body.png`: “Create a single production game sprite, use case stylized-concept. A beautifully polished friendly green toy tank BODY for a children's clock-learning browser game. Transparent alpha background. Strict straight side view, horizontally wide body, dark rubber caterpillar tracks with six detailed metal wheels, layered emerald and mint armor, brass trim, small flower decal and amber headlights, rounded inviting high-quality hand painted 3D illustration with crisp silhouette. The body has NO gun barrel and NO turret and NO clock (these are animated separately by the game). No antenna. The flat upper deck is centered ready for a turret. Entire body fits centered with just 4 percent transparent margin. Body aspect ratio approximately 2.8:1. No text, no watermark, no scene, no ground, no detached objects. Save the resulting asset for use in the local game project.”
- `cuoi-ho/assets/tiger-rider.png`: “Create a single production game character sprite, use case illustration-story. Transparent alpha background. A cute lively orange tiger carrying a smiling Vietnamese elementary-school adventurer child in a teal outfit and a safe little helmet, holding a small saddle handle. Strict side view facing RIGHT, the tiger in a lively running/leaping pose with four clearly separated paws, long curved striped tail on the left, big expressive face on the right, soft white muzzle and cheeks, beautiful distinctive dark stripes, warm golden orange fur. Polished premium children's storybook game art, soft 3D volume, crisp clean silhouette and warm light, finely painted detail still readable at 180 pixels wide. Friendly, brave, joyful. Whole tiger and child entirely visible, centered, roughly 1.55:1 width-to-height, tightly framed with 4 percent transparent margin. No fire, no hoop, no ground, no backdrop, no letters, no watermark. This sprite replaces a crude canvas drawing in a children's educational running game.”
