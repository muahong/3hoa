# Trạng thái bộ tài liệu dự án Toán lớp 2 và 3

Cập nhật: 2026-09-10 (tạm dừng vì hết quota, tiếp tục sau).

## Đã có

| Tệp | Ghi chú |
|---|---|
| `ban-do-toan-2-3.md` | 93 nội dung Toán 2 và 3, trạng thái game, gợi ý cơ chế chơi (nguồn gốc: artifact Bản đồ Toán lớp 2 và 3) |
| `01-muc-tieu-va-ky-vong.md` | Tài liệu mục tiêu chính thức, tổng hợp từ 3 bản nháp do hội đồng 3 giám khảo chấm (`review/goals-*.md`) |
| `02-nhan-vat-ao.md` | 5 bé, 3 phụ huynh, 4 giáo viên hàng đầu, 1 chuyên gia marketing, kèm câu hỏi review và giọng nói để nhập vai |
| `spec/03a-chuong-trinh-lop-2.md`, `spec/03b-chuong-trinh-lop-3.md` | Yêu cầu cần đạt, tiên quyết, ngưỡng thành thạo, lỗi thường gặp, ví dụ bài, ưu tiên cho từng nội dung |
| `templates/` | Mẫu ADR, mẫu spec, mẫu thiết kế game |

## Còn thiếu (theo thứ tự làm tiếp)

1. `spec/03c-do-thi-ky-nang-va-thanh-thao.md`: đồ thị kỹ năng, 5 mức thành thạo, mô hình tiến bộ, tín hiệu thích hoặc không thích, bảng mã kỹ năng. (Agent cuối của giai đoạn 1 bị dừng giữa chừng.)
2. Giai đoạn 2, soạn song song: `spec/04-san-pham.md` (PRD), `spec/05-thiet-ke-game.md` (nguyên tắc vui và học, danh mục cơ chế theo loại nội dung, thích nghi độ khó), `spec/06-theo-doi-hoc-tap.md` (sự kiện, lược đồ dữ liệu, phát hiện lỗi và sở thích), `spec/07-bao-cao-phu-huynh.md` (báo cáo tuần, mạnh yếu, tiến bộ, mẫu báo cáo), `08-chi-so-thanh-cong.md`, `09-quyen-rieng-tu-va-an-toan.md`, `10-lo-trinh.md`, `11-marketing.md`, `12-ke-hoach-kiem-chung.md`, bộ ADR trong `adr/` (web tĩnh không backend; module dùng chung sao chép; mô hình thành thạo; lược đồ sự kiện học tập; vòng lặp bài học, chơi, hỏi đáp; xuất nhập dữ liệu; dữ liệu trẻ em; thích nghi độ khó; giọng đọc tiếng Việt; thứ tự ưu tiên chủ đề), `glossary.md`, `README.md` mục lục.
3. Giai đoạn 3: hội đồng nhân vật ảo review từng tài liệu (5 góc nhìn: bé qua chuyên gia phát triển trẻ, phụ huynh, giáo viên, marketing, kỹ thuật và nhất quán), sửa, review vòng 2, phê bình tính đầy đủ và nhất quán liên tài liệu, ghi báo cáo vào `review/`.
4. Rà toàn bộ tệp: không còn ký tự gạch ngang dài (—), số liệu và mã nội dung khớp giữa các tài liệu.

## Cách tiếp tục

Workflow giai đoạn 1 có thể resume để chạy nốt mục 1 với kết quả cũ được cache:
script `C:\Users\son.nguyen\.claude\projects\D--Projects-3hoa\21a8168e-d74f-4a36-ad76-384962242932\workflows\scripts\toan23-nen-tang-wf_ceb87161-aae.js`, run ID `wf_ceb87161-aae`.
