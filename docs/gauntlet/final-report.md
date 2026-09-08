# 3hoa: bản nâng cấp local

**Sáu game đã đạt review độc lập trong phạm vi đã thử; chưa phát hành.** Preview: `http://127.0.0.1:8787/docs/gauntlet/preview.html`.

## Mỗi game thay đổi gì

| Game | Thay đổi có tác động tới chơi/học | Review độc lập |
|---|---|---|
| Mê Cung Đồng Hồ | Chạm đích có đường đi/đổi ý/dừng; mê cung theo seed có vòng thoát; đáp án không bị đáp án khác chắn đường; ma chờ thao tác hợp lệ, bảo vệ sau sinh lại; đồng hồ và điều khiển ngang rõ hơn. | PASS, ba lỗi đã đóng |
| Ninja Toán Học | Một nét vuốt sai không tiếp tục trừ tim; dừng quả và giờ ván trong lúc đọc cách làm; sửa menu điện thoại và thông báo xoay màn hình che phép tính. | PASS, lỗi toast đã đóng |
| Vệ Binh Cửu Chương | Dừng thiên thạch và giờ ván khi đọc lời giải/gợi ý, vẫn nhập/xóa/sửa đáp án; mục tiêu đang sửa ổn định. | PASS |
| Tháp Đồng Hồ | Chọn cột và nhìn vị trí rơi trước; xác nhận lúc nhấc tay; kéo, hủy, nhấc ngoài không thả nhầm. | PASS |
| Xe Tăng Thời Gian | Đồng hồ phóng to, ngắm trước khi đạn rời nòng, chặn phát bắn trùng, HUD ngang dành đủ chỗ cho robot. Giữ lời giải sai/gợi ý và dừng robot tới khi chủ động thử lại. | PASS, lỗi hết lời giải đã đóng |
| Cưỡi Hổ Vượt Lửa | Phối thân/chân/người cưỡi khi chạy, bay, tiếp đất; giữ lời giải tới khi chọn chạy tiếp, không tự bỏ qua; điều khiển chọn vòng đáp án được giữ nguyên. | PASS |

Điều hướng từ menu/tạm dừng về trang chủ cùng tab; hồ sơ và tiến trình vẫn dùng cấu trúc lưu trữ hiện có. Không có tài khoản, analytics, dịch vụ trả phí hoặc service worker gốc mới.

## Bằng chứng

- [Review mê cung](review-maze.md), [ba game](review-three-games.md), [Xe Tăng/Cưỡi Hổ](review-action-games.md), [shared](review-shared.md), [tích hợp/cache](review-integration.md).
- Các builder và reviewer đã chơi vòng/màn bằng sự kiện chạm/phím thật, gồm sai, sửa, kết quả, quiz nếu có, chơi lại và tải lại. Debug chỉ đọc đáp án/geometry để điều khiển test; đây không chứng minh trẻ tự giải được bài.
- Unit **222/222**, sau tối ưu Tiger một dòng chạy lại **34/34** của Tiger; matrix **24/24** gồm lượt kiểm tra lại Ninja/Tank sau closure; cache/offline/hai hồ sơ cũ đạt qua nhiều lượt, kèm timeout và cảnh báo cleanup được giữ ở [chẩn đoán](cache-final-diagnostic.md).
- [Hiệu năng](performance-final.md) có số đo trước/sau và giới hạn; Tiger đã bỏ ghi DOM thừa, nhưng frame time desktop còn dao động; không chứng nhận60FPS ổn định.
- [Kiểm chứng tổng hợp](final-verification.md) phân biệt full-input, fixture lịch sử, legacy integration và giới hạn. Ảnh/log nặng nằm trong thư mục được gitignore; các harness nằm trong repo để tái tạo.
- Gallery có ảnh gameplay A/B dọc/ngang. Một số cặp cùng seed khởi tạo nhưng câu hỏi khác do thứ tự dùng RNG thay đổi; chú thích nêu rõ. Không phải khảo sát mù hay nghiên cứu trẻ em.

## Baseline và giới hạn

Checkout bắt đầu `a1f0458`. Không có `docs/game-refresh-2026-09-06.md` hoặc generator được nhắc trong yêu cầu; source khi đó còn footer mở tab mới và map RAW cố định. Báo cáo dựa trên baseline đã đọc/chạy, không gộp kết quả hoặc số test cũ thành thành tích đợt này.

Đã kiểm tra Windows Chromium, touch giả lập và bàn phím/chuột ở bốn kích thước. Chưa kiểm tra Safari, iPad vật lý, giọng Việt thật hoặc hiệu quả học với trẻ. Runtime hiện không phát trạng thái hidden khi đổi tab; các kiểm tra blur/visibility mô phỏng được ghi riêng. Hiệu năng là mẫu đo có giới hạn trên máy này, không suy ra iPad hoặc tốc độ production.

Chưa push/phát hành lên 3hoa.com. Product đã commit: `008c677` (shared), `229f24d` (mê cung), `9127177` (cache fixture), `f0eecd9` (Ninja/Cửu Chương/Tháp), `a8f05ec` (Xe Tăng/Cưỡi Hổ), `f81dbf5` (tối ưu Tiger và closure).

Quota tuần khi bàn giao: **15% đã dùng** theo công cụ usage limits; dưới giới hạn50% người dùng đặt. Không dùng reset credit.
