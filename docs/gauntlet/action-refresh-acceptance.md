# Tank / Tiger: acceptance và performance trước sửa

Product chưa sửa trong lượt đo này; shared shell hiện ở commit `008c6777f45146374aa0fb6555f49ff9e0395f4c`. Baseline UX trước đó ở `baseline-action.md`.

## Performance BEFORE

Harness: `tests/e2e/gauntlet-action-refresh.e2e.js before` (đổi `before` thành `after` để đo lại). Báo cáo chi tiết, 120 interval RAF, CDP main-thread task/script/layout và ảnh ở `tests/e2e/out/gauntlet/action-refresh/before/`.

Windows, Node 22.23.2, CPU Intel i7-1370P / 20 logical CPUs, Chromium bundled headless, DPR 1, no throttle, seed RNG 3060906. Mỗi trường hợp là một run. Seed cố định không đồng nghĩa RNG gameplay tuyệt đối giống nhau: hình ảnh tiêu thụ random theo frame cadence. Câu và lựa chọn thực tế được lưu để đối chiếu. Chạy local; không phải đo mạng production hoặc iPad vật lý. Có thể có tải nền từ công việc khác.

| Game / viewport | Load (ms) | RAF mean / p95 / max (ms) | Main-thread task / 120 frames (ms) | Workload input thật |
|---|---:|---|---:|---|
| Tank 390×844 | 439.5 | 16.67 / 16.7 / 16.8 | 712.1 | Giữ D 180 ms, thả, bắn phím 1 |
| Tank 1180×820 | 466.5 | 16.67 / 16.8 / 16.8 | 726.2 | Giữ D 180 ms, thả, bắn phím 1 |
| Tiger 390×844 | 492.6 | 16.67 / 16.8 / 16.8 | 691.0 | Chọn vòng sai bằng phím 2, nhảy/phản hồi |
| Tiger 1180×820 | 560.0 | 16.67 / 16.7 / 16.8 | 1405.9 | Chọn vòng sai bằng phím 2, nhảy/phản hồi |

Cả bốn log không pageerror / console error / failed request. Tank đọc đúng trạng thái đã di chuyển x và góc nòng sau bắn; Tiger ở `learn`, tim từ 4 xuống 3 sau nhảy sai. Không sửa state hoặc gọi hàm xử lý trả lời. RAF cho cadence; CDP TaskDuration là thời gian main-thread, không phải CPU cả hệ thống hay GPU.

## Tank: tiêu chí đề xuất

1. **Đọc đồng hồ:** mở/đóng phóng to từ HUD bằng tap và keyboard; mặt đồng hồ ≥160 px tại 390 px; khi mở, robot và đồng hồ thời gian không tiến; đóng giữ cùng câu, tim, điểm. Đồng hồ/hint/đóng không che nhau ở 390×844 và 844×390. Giữ nguyên màu kim và ý nghĩa học.
2. **Ngắm và bắn:** thân/track di chuyển liên tục theo input; nòng quay về mục tiêu trước lúc đạn rời nòng; đạn khởi đầu đúng muzzle và feedback theo robot đã chọn. Không bắn trùng một target do tap nhanh; không đổi câu trước khi xác nhận hit. Keyboard 1–4/arrow+Enter và tap vẫn dùng được. Giảm chuyển động không làm chậm input hay tăng độ khó.
3. **Acceptance cơ học:** video hoặc chuỗi ảnh chọn mục tiêu xa trái/phải, giữ A/D, nhả, bắn; state read-only chứng minh track phase thay đổi với quãng đường và recoil trở về 0. Không coi thao tác gọi `fireAt` từ debug hook là gameplay.

Source đã có track phase, recoil và projectile, nhưng `fireAt` gán góc nòng tức thì. Cải tiến là phối chuyển động có sẵn và readability; tránh bổ sung điều khiển thừa.

## Tiger: tiêu chí đề xuất

1. **Học chủ động:** sau sai/hết giờ, giữ prompt + lời giải + vòng ✓/✕ khi không input ≥10 s; có control Tiếp tục nhìn thấy ngay cả chiều cao 360 px; Enter/Space tương đương. Tap chọn vòng ban đầu không tự kích hoạt bước tiếp theo.
2. **Sửa sai giữ bằng chứng:** nếu thêm lượt thử lại thì không ghi đè đáp án sai đầu; không cộng điểm/sao/first-try accuracy cho correction, không trừ tim lần hai trong cùng correction; đọc localStorage sau game/quiz chứng minh sự phân biệt. Chưa chốt thêm lượt retry bắt buộc: ưu tiên sửa deliberate continue trước, không tự mở rộng vòng học.
3. **Chạy → nhảy → tiếp đất:** input hiện tại là chọn vòng đáp án rồi hổ tự nhảy; giữ cơ chế này. Bốn chân có pose thu khi bay, duỗi/đỡ khi tiếp đất, thân và bé cưỡi phối cùng nhịp; không xuyên đất; ring evaluation chỉ một lần; đủ ba làn, xoay viewport và reduced-motion không mất click/hit. Không thêm nút nhảy timing.
4. **Performance:** cùng workload/viewport/DPR/seed của BEFORE, 120 frames có action; rà bất kỳ hồi quy p95 / CPU task đáng kể và nêu độ nhiễu phép đo. Không tăng chi tiết nền nếu làm khó đọc kim hoặc tăng CPU vô ích.

## Chưa xác minh ở đợt đo

Chưa có full-run thắng/quiz/save/reload cho bản sửa vì product vẫn đang chờ quyền builder. Không tuyên bố Safari/iPad, mạng production, hoặc hiệu quả học thật từ phép đo này.
