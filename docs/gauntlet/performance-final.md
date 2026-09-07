# Hiệu năng — mẫu đo có giới hạn

Windows Chromium headless, Intel i7-1370P, DPR 1, không throttle. Mỗi mẫu 120 khoảng RAF, seed 3060906. Các browser test đã dừng trước lượt main đo; không kiểm soát được mọi tác vụ của hệ điều hành. RAF là cadence trình duyệt; CDP TaskDuration là main-thread task, không phải CPU/GPU toàn máy.

## Tank: gameplay chủ động

`gauntlet-action-refresh.e2e.js before|after --active`: baseline a1f0458 qua route, bản mới reload tương ứng, lái D 180ms rồi chọn đáp án đúng bằng phím. Đọc state để chọn; không set điểm/tim. Cả bốn mẫu tăng thời gian, correct=1, score=150, clockZoom=false.

| Phiên bản / viewport | Load ms | RAF mean / p95 / max ms | Task ms |
|---|---:|---|---:|
| before-active / 390×844 | 993.1 | 16.67 / 16.8 / 16.8 | 493.3 |
| before-active / 1180×820 | 665.8 | 17.08 / 16.8 / 33.4 | 994.3 |
| after-active / 390×844 | 117.2 | 16.81 / 16.7 / 33.3 | 654.6 |
| after-active / 1180×820 | 130.0 | 17.22 / 16.8 / 33.4 | 846.2 |

Không thấy P95 tăng trong mẫu Tank active. Câu hỏi desktop khác nhau dù seed khởi tạo giống nhau vì thứ tự dùng RNG/frame khác; không gọi đây là benchmark cảnh hoàn toàn đồng nhất hoặc tăng tốc đã chứng minh. Load bản mới hưởng cache/font khác, không suy ra tối ưu tải.

Workload cũ bắn phím1 ở AFTER vào readingHold, vì vậy số đo `after/summary.json` có cờ clockZoom=true và không được dùng để khẳng định active performance.

## Tiger: nhảy sai và phản hồi

Lượt đầu AFTER desktop p95 33.4ms so với baseline cũ16.7ms. Kiểm tra lại qua `--compare-tiger` gặp cùng câu11giờ, chọn sai phím2:

| Phiên bản / viewport | Load ms | RAF mean / p95 / max ms | Task ms |
|---|---:|---|---:|
| before-tiger-check / 390×844 | 1087.3 | 16.94 / 16.8 / 33.4 | 1487.3 |
| before-tiger-check / 1180×820 | 894.0 | 16.67 / 16.8 / 16.8 | 1465.6 |
| after-tiger-check / 390×844 | 205.8 | 16.80 / 16.7 / 33.3 | 1483.3 |
| after-tiger-check / 1180×820 | 264.3 | 18.61 / 33.4 / 33.4 | 2151.6 |

Desktop chậm hơn tái hiện trong hai mẫu ban đầu. Điều tra bounded tìm được ghi thuộc tính disabled thừa mỗi frame; bản sửa chỉ cập nhật khi qua ngưỡng0.9s. Số lần ghi giảm54→2, mẫu đầu sau sửa P95 desktop16.7ms. Tuy nhiên lượt lặp lại lên33.4ms, cặp cuối baseline→fixed cũng đều33.4ms (mean25.42→26.67ms, Task3125→3234ms). Vì vậy chỉ kết luận đã loại bỏ DOM write thừa; chưa chứng minh cải thiện frame time ổn định. Chi tiết và targeted regression ở [tiger-perf-closure.md](tiger-perf-closure.md). Không có cam kết60FPS hoặc iPad.

## Ba game toán và mê cung

[three-package.md](three-package.md) ghi load và119RAF: Tháp p95 16.7→16.7ms, Ninja33.3→16.7, Cửu Chương16.8→16.8. AFTER có browser/unit chạy đồng thời; không kết luận tăng tốc từ mẫu nhiễu.

[maze-package.md](maze-package.md) ghi navigation và CPU update+render active: desktop/phone trước≈0.44/0.40ms, sau≈0.26/0.34; lượt trung gian tải nền≈1.23/0.98. Maze khác topology và workload; CPU draw không phải GPU frame interval.

Ảnh và JSON raw ở tests/e2e/out/gauntlet/. Các log main tóm tắt được commit ở docs/gauntlet/performance-*.txt. Không có page/console/request error trong các mẫu main, có warning do service worker bị chặn ở context benchmark. Không suy ra Safari/iPad thật.
