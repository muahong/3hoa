# Nghiệm thu tổng hợp

Sáu game đã đạt review gameplay độc lập; chưa phát hành. Mỗi kết quả dưới đây chỉ có phạm vi được nêu.

## Tích hợp đã đạt

- Shared navigation: independent PASS, SH-01/SH-02 closed; commit008c677.
- Maze gameplay/layout: independent PASS, ba lỗi closed; main integrated matrix4views/cache/legacy4+8 PASS; commit229f24d.
- Historical cache fixture: reviewer phát hiện bucket thứ hai không nằm trong danh sách hồ sơ. Đã sửa để tạo hồ sơ bằng UI bản cũ, seed dữ liệu lịch sử đã sanitize, update từ a1f0458, chọn cả hai qua UI khi offline và đối chiếu dữ liệu đang được game nạp. Independent closure PASS; commit9127177. Kết quả cache bản cuối được ghi ở phần dưới.

## Phân loại bằng chứng

- Full-input harness: dùng sự kiện chạm/phím thật, chỉ đọc đáp án/geometry/state để định vị và xác nhận; không set điểm/tim/thắng. Chứng minh cơ chế xử lý đầu vào và vòng chơi, không chứng minh trẻ tự giải được toán.
- Existing legacy E2E có fixture/state hooks/teleport: chỉ là integration/logic evidence, không được gọi là chơi thắng thật.
- Cache test seed tiến trình lịch sử: dữ liệu thử riêng để xác minh bảo toàn lưu trữ, không phải thành tích kiếm được.
- A/B: viewport/DPR/state/seed phải ghi rõ; không phải thử nghiệm trẻ em hoặc nghiên cứu mù. Baseline một số ảnh không có seed đồng nhất.
- Hiệu năng: Chromium Windows, không phải Safari hay iPad vật lý. RAF cadence khác với CPU update/render hoặc CDP TaskDuration; không gộp chúng thành một số FPS.

## Chuyển tab: giới hạn môi trường đã quan sát

Main đã chơi mê cung qua in-app browser, chạm đúng đồng hồ được180điểm/1đồng hồ và3tim; sau khi mở tab preview, game không hiện pause. Đọc document.hidden/visibilityState trả false/visible. Phép kiểm tra headless Chromium với hai tab và bringToFront cũng cho cả tab nền false/visible. Vì runtime không phát trạng thái ẩn, đây chưa chứng minh xử lý visibilitychange đúng hay sai.

Thử chạy Chromium GUI đã cài (build1234 rồi1208) để kiểm tra đổi tab thật đều bị lỗi launch `spawn UNKNOWN`; không cài browser mới hoặc đổi thiết lập hệ thống. Các test visibilitychange/blur do harness phát phải được ghi là sự kiện mô phỏng. Chưa chứng nhận tự động pause khi đổi tab trên browser GUI/thiết bị thật.

## Bản cuối — 2026-09-07

- Gameplay: sáu game independent PASS, các lỗi review đã đóng; source hashes trong từng report. Tiger giữ nguyên sau PASS; Ninja và Tank có focused closure sau sửa.
- Unit: **222/222 PASS**, sau Ninja/Tank closure, `final-unit.txt`. Sau Tiger tối ưu một dòng, chạy lại 34/34 Tiger và focused input/independent review; không lặp toàn bộ suite.
- Matrix: **24/24 PASS** tổng hợp: 16 case không đổi từ `final-matrix.txt`, 8 Ninja/Tank chạy lại sau closure ở `final-matrix-closure.txt`. JSON tổng hợp `tests/e2e/out/gauntlet/matrix/final-results.json`.
- Existing E2E: xem three-package.md/action-package.md; các phiên dùng fixture được phân biệt. Tank 11 phiên trước P2 và 1/8/9 sau P2; Tiger 1–11 rồi 12–14 đạt. Không cộng lượt chạy lại thành số test độc lập.
- Generator: cả sáu báo unchanged; không thay profile.js. Gallery: mọi đường dẫn local tồn tại, bố cục đã mở bằng in-app browser.
- Tiger cache cuối: baselinev6→v10, offline/historicalprofiles/scope PASS; bằng chứng tiger-perf-closure.md.
- Cache và performance: kết luận cuối trong cache-final-diagnostic.md và performance-final.md; timeout trong các lượt trước vẫn được lưu, không bỏ qua để công bố một lượt toàn bộ xanh.
