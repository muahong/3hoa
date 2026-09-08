# Gauntlet 3hoa: bản local đã review

2026-09-07 · D:\Projects\3hoa · branch `codex/gauntlet-2026-09-06` · baseline `a1f0458`. Chưa push/phát hành.

## Trạng thái cuối

- Tiger perf closure: bỏ ghi disabled thừa mỗi frame (54→2 lần); 34 unit, giữ lời giải/guard/ack và cachev10 đạt; reviewer xác nhận. Frame time desktop vẫn dao động, không cam kết60FPS; xem tiger-perf-closure.md.
- Cả sáu game được rà soát và có review độc lập PASS trong phạm vi đã thử. Các lỗi quan trọng của shared, maze, Ninja và Tank đã đóng; xem [báo cáo cuối](final-report.md).
- Chủ sở hữu: main tích hợp/shared; baseline_other_games Ninja/Cửu Chương/Tháp; baseline_action_games Tank/Tiger. Reviewer khác builder. Các gói product đã khóa và commit, không còn agent sửa product.
- Unit 222/222 trước Tiger tối ưu một dòng; 34/34 Tiger chạy lại sau sửa. Matrix 24/24 tổng hợp, gồm 8 Ninja/Tank chạy lại sau closure. Full-input từng game, quiz nếu có, replay và reload được reviewer ghi riêng; fixture không tính là chơi thắng.
- Cache: ba game đầu đạt trong final-cache-closure.txt; Tower/Tank/Tiger đạt chuỗi kiểm tra riêng. Các timeout/chẩn đoán và giới hạn ở [cache-final-diagnostic.md](cache-final-diagnostic.md). Không gọi là một lượt sáu game liền mạch không lỗi.
- Hiệu năng/ảnh: [performance-final.md](performance-final.md), [gallery](preview.html), [kiểm chứng](final-verification.md). Ảnh nặng được gitignore, mọi harness trong repo.
- Quota tuần: bắt đầu tiếp tục 0%, mốc gần nhất 15%; giới hạn người dùng 50%, mốc dự phòng 45%. Không dùng reset credit.

## Commit product

- `008c677`: shared navigation và input sau pause.
- `229f24d`: mê cung seed, route, fairness và landscape.
- `9127177`: historical cache/profile fixture được reviewer xác nhận.
- `f0eecd9`: Ninja/Cửu Chương đọc phản hồi; Tháp chọn/confirm.
- `a8f05ec`: Tank/Tiger motion, zoom và deliberate reading.
- `f81dbf5`: Tiger bỏ ghi DOM thừa, focused independent closure/cachev10.

## Bằng chứng và giới hạn

[Review shared](review-shared.md), [maze](review-maze.md), [ba game](review-three-games.md), [Tank/Tiger](review-action-games.md), [integration](review-integration.md).

Baseline không có docs/game-refresh-2026-09-06.md hoặc generator cũ được nhắc trong yêu cầu. Giữ nguyên file người dùng `docs/prompts/3hoa-gauntlet-astra-high.md`, không commit nó.

Đã kiểm Windows Chromium, touch giả lập/keyboard. Chưa Safari/iPad vật lý/giọng Việt thật/child playtest. Native hidden-tab không được runtime phát; simulated blur không thay thế chứng nhận thiết bị thật. Không có thay đổi dữ liệu người dùng thật.

## Chạy lại và bàn giao

PowerShell: đặt `NODE_PATH=C:\Users\son.nguyen\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules`, rồi chạy `node tests/run.js`, `node tests/e2e/gauntlet-matrix.e2e.js [game...]`, `node tests/e2e/gauntlet-cache.e2e.js [game...]`. Các lệnh theo gói nằm trong báo cáo tương ứng.

Preview đang phục vụ tại http://127.0.0.1:8787/docs/gauntlet/preview.html bằng Python HTTP server. Có thể khởi động lại từ repo: `C:\Python312\python.exe -m http.server 8787 --bind 127.0.0.1`.

Bước tiếp theo ngoài phạm vi local: user review và kiểm tra Safari/iPad thật; chỉ triển khai khi có yêu cầu cho phép. Không tự push.
