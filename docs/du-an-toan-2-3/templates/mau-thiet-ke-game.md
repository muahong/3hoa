# Thiết kế game: Tên game

| | |
|---|---|
| Tình trạng | Ý tưởng / Bản nháp / Đang làm / Đã phát hành |
| Ngày | 2026-09-10 |
| Thư mục | `/ten-game/` |
| Nội dung dạy | Mã trong `ban-do-toan-2-3.md` (ví dụ 3.18 chia có dư) và mã kỹ năng (ví dụ L3.SO.CHIA-CO-DU) |
| Lớp | 2, 3 |
| Mục tiêu phục vụ | M... |

## 1. Một câu mô tả

"Bé làm gì, để học gì, cảm giác ra sao." Ví dụ: Bé chia kẹo vào rổ cho các bạn thú, phần thừa rơi ra ngoài, để hiểu số dư luôn nhỏ hơn số chia.

## 2. Kiến thức và mục tiêu học tập

- Yêu cầu cần đạt (chép từ spec chương trình, không diễn đạt lại).
- Kiến thức tiên quyết và cách game kiểm tra trước khi vào.
- Lỗi thường gặp mà game phải phát hiện được, và đáp án nhiễu tương ứng.

## 3. Vòng lặp chơi

1. Bài học ngắn (dưới 60 giây, có giọng đọc, có hình động).
2. Chơi: mô tả cơ chế cốt lõi, điều khiển trên màn hình chạm, nhịp độ, thời lượng một màn (mục tiêu 2 đến 4 phút).
3. Hỏi đáp 3 câu để mở màn sau: dạng câu, cách giải thích khi sai.
4. Kết quả: sao, kỷ lục, câu "cần ôn lại".

## 4. Độ khó và thích nghi

Bảng màn chơi: màn, nội dung, ví dụ câu, tốc độ, số vật thể, xác suất bom hoặc bẫy. Quy tắc tăng giảm độ khó theo mức thành thạo (tham chiếu `spec/03c-do-thi-ky-nang-va-thanh-thao.md`).

## 5. Phản hồi và cảm xúc

Khi đúng, khi sai, khi thua: âm thanh, hình, lời nói. Nguyên tắc: sai không bị chế giễu, luôn hiện đáp án đúng, không mất tiến trình đã đạt.

## 6. Dữ liệu ghi nhận

Bảng sự kiện theo `spec/06-theo-doi-hoc-tap.md`: sự kiện, khi nào, trường, kỹ năng gắn kèm, loại lỗi.

## 7. Hình ảnh, âm thanh, nhân vật

Phong cách, bảng màu, nhân vật, nguồn ảnh, giọng đọc tiếng Việt.

## 8. Kỹ thuật

Tự chứa trong thư mục, sao chép `profile.js` và `game-shell.css`, service worker, khoá localStorage riêng, kiểm thử trong `tests/`.

## 9. Tiêu chí hoàn thành

- [ ] 3 bé trong nhóm nhân vật ảo chơi thử (mô phỏng) không bị kẹt điều khiển.
- [ ] Giáo viên review xác nhận đúng sư phạm.
- [ ] Sự kiện học tập hiện đúng trong báo cáo phụ huynh.
- [ ] Kiểm thử tự động đạt, chạy tốt trên iPad Safari.
