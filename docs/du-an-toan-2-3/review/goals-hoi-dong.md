# Hội đồng chấm ba bản nháp "Mục tiêu và kỳ vọng"

> Tình trạng: Bản nháp | Ngày: 2026-09-10 | Chủ sở hữu: 3hoa | Liên quan: `docs/du-an-toan-2-3/01-muc-tieu-va-ky-vong.md` (bản tổng hợp), `docs/du-an-toan-2-3/review/goals-draft-a.md`, `goals-draft-b.md`, `goals-draft-c.md`, `docs/du-an-toan-2-3/02-nhan-vat-ao.md`

## 1. Cách chấm

Ba bản nháp được viết theo ba góc nhìn cố ý khác nhau: A "kết quả học tập là trên hết", B "bé và phụ huynh là trên hết", C "bền vững và đo được là trên hết". Ba giám khảo chấm độc lập, mỗi người đối chiếu với mã nguồn (`math-ninja/js/game.js`, `cuu-chuong/js/game.js`, `du -sk` từng thư mục, `docs/game-refresh-2026-09-06.md`) trước khi cho điểm. Năm tiêu chí, mỗi tiêu chí 10 điểm: rõ ràng, đo được, sát thực tế, lấy trẻ làm trung tâm, đầy đủ. Giọng của ba giám khảo khác nhau rõ: một người nhìn từ khoa học học tập, một người nói như phụ huynh có con yếu bảng cửu chương ("con tôi yếu bảng cửu chương thì bản này không hứa gì cho con"), một người soi mã và lịch sử git.

## 2. Bảng điểm

| Bản | Giám khảo | Rõ ràng | Đo được | Sát thực tế | Lấy trẻ làm trung tâm | Đầy đủ | Tổng /50 |
|---|---|---|---|---|---|---|---|
| A | 1 | 8 | 7 | 4 | 6 | 8 | 33 |
| A | 2 | 8 | 7 | 4 | 6 | 7 | 32 |
| A | 3 | 8 | 7 | 5 | 6 | 8 | 34 |
| B | 1 | 8 | 6 | 6 | 9 | 7 | 36 |
| B | 2 | 9 | 7 | 6 | 9 | 7 | 38 |
| B | 3 | 9 | 6 | 6 | 9 | 7 | 37 |
| C | 1 | 9 | 8 | 9 | 6 | 9 | 41 |
| C | 2 | 8 | 9 | 9 | 6 | 9 | 41 |
| C | 3 | 8 | 9 | 9 | 6 | 9 | 41 |

Tổng ba giám khảo: A 99, B 111, C 123. Cả ba đều chọn **C** làm xương sống. Điểm nhất quán đáng chú ý: C thắng áp đảo ở "sát thực tế" (9, 9, 9 so với 4 đến 6 của A và B) nhưng thua B ở "lấy trẻ làm trung tâm" (6 so với 9), và cả ba giám khảo đều cho A và C cùng 6 điểm ở tiêu chí này.

## 3. Vì sao C thắng

- Là bản duy nhất viết cho đúng người sẽ làm: một người, web tĩnh, không backend, và biến ràng buộc đó thành số đo được (6 giờ mỗi tuần, 1 triệu đồng mỗi năm, 32 nội dung thay vì 60, nhóm 30 bé thay vì 100) cùng tiêu chí "Dừng khi" mà A và B không có.
- Mọi con số kiểm chứng được ngay trong repo: 2468 KB và 2329 KB theo `du -sk`, 8/4/32 và 6/6/37 theo bản đồ, 228/228 theo ghi chú kiểm chứng ngày 06/09.
- Nền đo lường (nhật ký ván, nút sao chép phiếu, script đọc phiếu) là điều kiện tiên quyết có cổng 3 tháng, trong khi A và B mặc nhiên coi dữ liệu sẽ có.
- Có thứ tự ưu tiên tường minh kèm lý do; A có 12 và B có 18 mục tiêu không xếp hạng.

## 4. Lỗi của C đã sửa trong bản tổng hợp

| Điểm yếu giám khảo nêu | Cách sửa |
|---|---|
| North star không định nghĩa "chưa thuộc"; bé thuộc sẵn bảng 2 chơi 25 câu cũng được tính là tiến bộ | Mục 3 có bảng định nghĩa Chưa thuộc, Đã thuộc, Chơi đều, Tiến bộ có bằng chứng; nội dung không có bằng chứng Chưa thuộc không được tính |
| "Đã thuộc" tính cả câu gợi ý, chỉ nhắc ở bảng rủi ro | Đưa vào định nghĩa Đã thuộc, vào M12 mục (1) với hạn 2026-10-31, và vào số nền 3 tháng của M1 |
| Bé xếp sau người bảo trì; không có chỉ số sợ sai | Thêm luật loại tính năng ở mục 1, M5 "Không sợ sai" xếp nhóm ưu tiên 2 cùng M9, M11 |
| "Vệ Binh đã đếm hinted" gây hiểu nhầm là đã có dữ liệu | Mục 2.2 ghi đúng: `G.hinted` chỉ đếm trong ván, `addStats` không lưu |
| Phụ thuộc phiếu hằng tháng, không có kênh thay thế | Bảng rủi ro thêm kênh phụ: quan sát trực tiếp 5 bé mỗi quý; M8 hạ còn "từ 10 phiếu mỗi tháng" |
| Thiếu rủi ro máy dùng chung, rủi ro đúng SGK, non-goals thông báo đẩy và quà thật, màn lớp 1 | Bổ sung đủ ở mục 6 và 7; thêm M10 "Đúng toán, đúng SGK" |
| Không có bảng ánh xạ màn sang mã chương trình | M12 mục (3) với ví dụ a3, d4, Tháp màn 5 |
| Ký hiệu 2.14, 3.15 mập mờ; 3.18 chia có dư ghi là "một phần" trong khi bản đồ ghi "chưa có" | Ghi B2.14, B3.15; xếp 3.18 vào nhóm nội dung mới ở mốc 6 tháng |
| Pivot (b) nghiêng sang phiếu bài tập giấy | Đổi thành sửa vòng chơi lõi cùng 5 bé quan sát; ghi rõ không dùng game làm phần thưởng sau bài luyện |
| M6 đòi phụ huynh hiểu trong 1 phút | Nới thành 2 phút (nay là M7), cùng bộ 3 câu của B |

## 5. Ý ghép từ bản A

- Ba định nghĩa vận hành Chưa biết, Thành thạo, Chơi đều (bỏ ngưỡng giây; giây trung vị chỉ còn là chỉ số phụ để gắn cờ đoán mò).
- Năm hạn chế dữ liệu ở mục 2.2 với dẫn chứng `game.js` dòng 891 và 918; hạn 2026-10-31 tách `h` khỏi `c` ở cả 6 game.
- Bảng ánh xạ màn sang mã chương trình; quy tắc chỉ tính "Đã có game" khi có màn luyện, có ôn lại và có mã gắn vào dữ liệu.
- Cột hạn cụ thể cho từng dòng rủi ro; rủi ro đoán mò 25% với cách kiểm chứng; rủi ro máy dùng chung với nhắc "Con là ai?" sau 12 giờ. Rủi ro máy không có giọng Việt được gộp thành cam kết "lời mách luôn có chữ" ở mục 5 thay vì một hàng riêng.
- M2b giữ được sau 4 tuần, nhưng đo qua câu ôn lại bình thường, không gọi là kiểm tra.
- Sinh 10 000 câu mỗi màn không có đáp án sai hay nhiễu trùng đáp án đúng; mã lỗi từ `misconception` ghi vào nhật ký ván.
- Tín hiệu đổi hướng (c) bắt buộc nhập đáp án ở màn có nhớ khi phát hiện đoán mò; (b) 70% thiết bị ngừng sau tuần 2 thì dừng mở rộng.
- Non-goal "không chấm điểm thay nhà trường".

## 6. Ý ghép từ bản B

- Câu north star "Sau 4 tuần dùng, bé tự xin chơi lại và phụ huynh kể được ba điều đúng về con" làm câu mở mục 3, gắn với chỉ số của C.
- Luật loại tính năng: giúp học nhanh hơn nhưng làm bé sợ sai hoặc làm phụ huynh nghi ngờ dữ liệu thì loại.
- Chỉ số "không sợ sai" (ván thoát ngay sau lần sai đầu dưới 10%) thành M5; dải "gợi ý là phao" 5% đến 20% vào M6.
- Khoảng trống "tính" và "hiểu": 2.19, 2.21, 3.18 vào mốc 6 tháng của M3; bảng nhân chia lớp 2 (2.20, 2.22) vào nội dung nhắm tới của M1.
- Non-goals: không thông báo đẩy, không quà thật, không xếp hạng khác máy, không chatbot, không lời giải sinh tự động, PWA thay App Store; mục "Không đổi dù kết quả thế nào".
- Rủi ro đúng SGK (42 ÷ 7, đảo 2 × 7) với tín hiệu dừng phát hành khi từ 3 lỗi một đợt rà; giáo viên rà là mong muốn, bảng kiểm bằng văn bản là điều kiện.
- Câu mẫu báo cáo "Tuần này con thuộc bảng nhân 7, còn hay quên nhớ khi trừ 62 - 38".
- Quy tắc "Đã thuộc mà 4 tuần sau đúng dưới ngưỡng thì đưa ôn lại theo khoảng cách thời gian vào kho missed", đặt ngay trong hàng M2 thay vì mục 8.
- Kiểm chứng năng lực: đo thời gian thật 3 nội dung đầu, quá 6 tuần thì hạ M3.
- Trang cam kết riêng tư kèm test e2e đếm 0 host ngoài hai host font.

## 7. Ý cố tình không lấy

- A: nhóm 100 bé, 10 nội dung mới trong 3 tháng, 10 phiên quan sát và 10 phỏng vấn mỗi quý, ván kiểm tra đầu vào, ngưỡng giây làm điều kiện thành thạo, dùng game làm phần thưởng sau bài luyện.
- B: 18 mục tiêu, độ phủ 60/93, M4 chuyển kiến thức giữa Vệ Binh và Ninja (chưa đo được vì màn d3 gộp nhiều bảng), M18 đếm thư phản hồi, câu "reviewUsed đếm gợi ý" (sai: biến này đếm câu ôn lại).
- C: ngưỡng M6 một phút, pivot phiếu bài tập giấy, "Vệ Binh đã đếm hinted".
