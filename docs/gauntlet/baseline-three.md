# Baseline: Ninja, Cửu Chương, Tháp Đồng Hồ

Khảo sát local ngày 2026-09-06. Đã đọc README của ba game. Script: `tests/e2e/gauntlet-baseline-three.js`; ảnh và log: `tests/e2e/out/gauntlet/baseline-three/`.

## Môi trường và giới hạn

- Windows, Node 22.23.2. Playwright có sẵn qua Python driver package: `C:/Users/son.nguyen/AppData/Roaming/Python/Python312/site-packages/playwright/driver/package`; Chromium builds 1208/1234 đã cài. Không cài dependency mới.
- Context mới, 1180×820 desktop và 390×844 mobile emulation. Không seed điểm, không gọi hàm thắng/thua, không sửa state. Chỉ đọc debug state/geometry để định vị input và ghi kết quả. Mobile dùng touch dispatch cho vuốt, touchscreen tap cho bàn phím/cột.
- Đây là lượt baseline ngắn: đã vào menu → chọn màn → bài học (Tháp) → chơi → sai/đúng/gợi ý. Chưa chạy hết ván 90 giây hoặc chuỗi quiz/mở khóa; không được dùng báo cáo này để tuyên bố đã nghiệm thu toàn bộ vòng chơi.
- Không thấy pageerror hoặc tràn ngang trong sáu tổ hợp. Các nút DOM gameplay nhìn thấy đều đủ 44×44. Đây không chứng minh Safari thật hay vùng chạm Canvas đều đạt.

## Quan sát và gói đề xuất

| Game | Quan sát baseline | Tác động / ưu tiên | Gói đề xuất và điều kiện chấp nhận |
|---|---|---|---|
| Ninja | Vuốt thật được ghi nhận; lần đầu mobile có 1 đúng, 2 sai. Sau sai, các quả vẫn tiếp tục bay; HUD giải thích và nhiệm vụ thao tác cùng tồn tại. | P2 học tập: trẻ phải đọc giải thích đồng thời đuổi theo quả; đây là nhận định thiết kế dựa trên hành vi quan sát, chưa có dữ liệu trẻ thật. | Dừng ngắn hoặc làm chậm gameplay sau lỗi, giữ đúng câu và cho thao tác sửa có chủ đích. Nghiệm thu: sai bằng swipe thật → khoảng đọc không mất thêm tim do cùng thao tác; giải thích còn đọc được trên 390px; tiếp tục tự nhiên không đổi luật ghi nhận lỗi/điểm. |
| Cửu Chương | Gõ 1 và BẮN ở bảng 2 tạo phản hồi sai, nút gợi ý hoạt động. Thiên thạch vẫn tiến nhanh trở lại khi thẻ lời mách đang hiện. Mã hiện giữ 0,8s sau sai đầu, 1,2s sau gợi ý; thẻ gợi ý hiện 4,5s. | P2 công bằng: thời gian đọc dài hơn thời gian bảo vệ khỏi áp lực rơi. Không coi ảnh chụp giữa animation chữ nhỏ là lỗi typography đã xác nhận. | Bảo vệ đủ khoảng đọc lời mách, giữ mục tiêu đang sửa ổn định khi trẻ nhập số. Nghiệm thu: có nhiều thiên thạch, nhập từng chữ số/chạm gợi ý không đổi câu bất ngờ, không trừ khiên trong khoảng đọc đã quy định; trả lời xong khôi phục nhịp chơi. |
| Tháp | Mobile có hướng dẫn “chạm vào cột… chạm lần nữa để thả”; nút THẢ bị ẩn. Mã `onCanvasDown` thả ngay nếu cột chạm bằng cột hiện tại, kể cả chạm đầu tiên; `pointerdown` đã commit trước khi biết trẻ định kéo hay hủy. | P1 cần tái hiện đích danh trước sửa: thao tác kéo bắt đầu trên cột hiện tại có thể thả nhầm; hướng dẫn hai chạm không nhất quán với chạm đầu vào cột ban đầu. | Tách chọn cột và xác nhận thả, hoặc chỉ commit ở pointerup không kéo/hủy. Nghiệm thu: một chạm đầu trên cột ban đầu không tự phạt; kéo từ cột hiện tại sang cột khác không thả sớm; pointercancel không thả; thao tác touch thật vẫn hoàn tất một câu. |

## Bằng chứng để review

- `*-menu.png`, `*-gameplay.png`: đúng viewport nêu trên.
- Ninja `*-after-input.png`: điểm/tim thay đổi do swipe thật.
- Cửu Chương `*-wrong.png`, `*-after-input.png`: gõ sai và gợi ý.
- Tháp `*-lesson.png`, `*-feedback.png`: bài học và phản hồi sau thả.
- `observations.json`: các thao tác, text, kích thước nút, lỗi runtime và state kết thúc; không chứa state giả lập thắng.

Các ảnh không dùng seed cố định nên chưa phải A/B ngang điều kiện. Đề xuất cần được builder xác minh bằng test tình huống độc lập; không xem nhận xét thiết kế là bug đã chứng minh.
