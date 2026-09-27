# Mục tiêu và kỳ vọng của dự án (bản nháp B: bé và phụ huynh là trên hết)

Tình trạng: Bản nháp | Ngày: 2026-09-10 | Chủ sở hữu: 3hoa | Liên quan: docs/du-an-toan-2-3/ban-do-toan-2-3.md, docs/du-an-toan-2-3/templates/mau-adr.md, docs/game-refresh-2026-09-06.md

Mục tiêu đánh mã M1, M2... để ADR trích dẫn. Mốc tính từ 2026-09-10: 3T = 2026-12-10, 6T = 2027-03-10, 12T = 2027-09-10.

## 1. Tuyên bố mục đích

3hoa.com làm trò chơi Toán để một bé lớp 2 hoặc lớp 3 tự cầm iPad chơi 15 phút, sai bao nhiêu lần cũng không xấu hổ, và hôm sau xin chơi lại. Trong lúc bé chơi, trò chơi ghi lại việc bé làm được và chưa làm được (8 + 7 đã thuộc, 62 − 38 còn quên nhớ, 42 : 7 chưa biết) rồi kể lại cho phụ huynh bằng lời dễ hiểu, ngay trên máy, không gửi đi đâu. Mọi mục tiêu học tập ở đây phục vụ hai điều đó: bé muốn quay lại, phụ huynh hiểu con hơn và tin sản phẩm. Tính năng nào giúp học nhanh hơn nhưng khiến bé sợ sai, hoặc khiến phụ huynh phải hỏi "dữ liệu của con đi đâu", tính năng đó bị loại.

## 2. Vấn đề đang giải quyết

### 2.1 Với bé

Lớp 2 và 3 là hai năm nhiều bậc thang nhất của Toán tiểu học (Chương trình GDPT 2018, bản đồ 93 nội dung): cộng trừ có nhớ (8 + 7 phải tách thành 8 + 2 + 5; 36 + 27 phải nhớ 1 sang hàng chục), bảng nhân chia 2 đến 9 (6 × 7, 42 : 7), nhân chia số có hai ba chữ số (23 × 4, 84 : 4), giờ kém (7 giờ 45 phút cũng là 8 giờ kém 15 phút), rồi bài toán hai bước tính. Trượt một bậc thì các bậc sau lung lay: chưa thuộc bảng 7 thì không chia được 42 : 7 và không làm nổi bài rút về đơn vị.

Phiếu bài tập giấy có ba điểm yếu mà trò chơi sửa được: không nói vì sao sai; sai nhiều lần trước mặt người lớn làm bé sợ; không ai nhớ bé đã sai câu nào để hỏi lại đúng câu đó.

Sáu game hiện có đã làm được một phần: Ninja và Vệ Binh giải thích cách nhẩm khi sai ("42 : 7 = 6 vì 7 × 6 = 42"), gọi tên lỗi ("Con quên nhớ 1 rồi!"), có kho ôn lại thông minh (câu sai quay lại khoảng 1/4 số câu, đúng 2 lần mới xóa) và huy hiệu Đã thuộc (đúng từ 90% trên ít nhất 20 câu); bốn game đồng hồ có bài học và hỏi đáp 3 câu sau màn. Nhưng độ phủ hẹp: 14/93 nội dung đã có game, 10 mới chạm một phần, 69 chưa có gì (toàn bộ hình học, đo lường, tiền Việt Nam, thống kê, bài toán có lời văn). Bé được luyện kỹ phần "tính" mà chưa được luyện phần "hiểu" (ý nghĩa phép nhân, một phần hai, gấp lên mấy lần).

### 2.2 Với phụ huynh

Mục 📊 Kết quả trong mỗi game đã hiện số ván, tỉ lệ đúng, phút luyện tập, màn cần luyện thêm (từ 5 câu mà đúng dưới 70%) và danh sách cần ôn. Ba khoảng trống:

1. Không có bức tranh chung: phải mở từng game; trang chủ chỉ cộng sao và phút.
2. Không có dòng thời gian: `stats` chỉ giữ tổng cộng dồn (`plays`, `correct`, `wrong`, `seconds`, `byTopic`) và một mốc `last`, nên không trả lời được "tuần này con tiến bộ gì".
3. Không ghi sở thích: không lưu bé chọn game nào, bỏ dở ván nào, xin gợi ý mấy lần (Ninja đếm `reviewUsed` trong ván rồi bỏ).

Về niềm tin: trang chủ đã ghi "Dữ liệu chỉ lưu trên máy này, không gửi đi đâu" và "không quảng cáo", mã nguồn đúng như vậy (không backend, không tài khoản, chỉ tải font từ Google Fonts). Nhưng lời cam kết chưa có trang riêng, và phụ huynh chưa có cách kiểm chứng ngoài tin lời.

## 3. Mục tiêu cuối cùng (north star)

**Sau 4 tuần dùng, bé tự xin chơi lại và phụ huynh kể được ba điều đúng về con: con thích gì, con đã giỏi phép toán nào, con còn vướng phép toán nào.**

Nhận biết đã đạt (nhóm thử nghiệm tối thiểu 10 gia đình mỗi mốc):

| Dấu hiệu | Ngưỡng | Cách đo |
|---|---|---|
| Bé quay lại | Từ 3 ngày chơi mỗi tuần, trong 3 trên 4 tuần | Nhật ký ngày chơi trong localStorage (cần thêm, M9) |
| Bé không sợ sai | Dưới 10% ván bị thoát ngay sau lần sai đầu | Ghi sự kiện thoát ván kèm số câu sai |
| Bé tự hào | Bé kể được một thứ mình vừa Đã thuộc | Phỏng vấn 5 phút, đối chiếu huy hiệu |
| Phụ huynh hiểu con | 8/10 trả lời đúng 3 câu: thích gì, giỏi gì, vướng gì | Khảo sát, chấm bằng dữ liệu xuất từ máy |
| Phụ huynh tin | 9/10 nói "yên tâm cho con dùng không cần ngồi cạnh" | Khảo sát 1 câu kèm lý do |

## 4. Bộ mục tiêu chi tiết

### 4.1 Học tập

| Mã | Phát biểu | Chỉ số | Ngưỡng | Cách đo | 3T / 6T / 12T |
|---|---|---|---|---|---|
| M1 | Phủ Số và phép tính lớp 2 và 3 (51 nội dung) trước, mạch khác sau | Số nội dung "Đã có game" | 60/93 ở 12T | Cập nhật bản đồ mỗi lần phát hành | 20 / 35 / 60 |
| M2 | Thuộc thật, không đoán | Tỉ lệ bé đạt Đã thuộc (≥ 90% trên ≥ 20 câu) ở bảng nhân chia của lớp mình sau 6 tuần | 7/10 bé | `stats.byTopic` của Ninja, Vệ Binh | 5/10 / 7/10 / 8/10 |
| M3 | Câu sai được sửa, không lặp mãi | Tỉ lệ mục `missed` được xóa trong vòng 3 ván sau khi ghi | ≥ 70% | Lưu thêm số ván lúc ghi và lúc xóa | 60% / 70% / 80% |
| M4 | Kiến thức chuyển giữa hai cách chơi | Bé Đã thuộc bảng 7 ở Vệ Binh thì đúng ≥ 80% với 42 : 7, 56 : 7 ở Ninja | ≥ 80% | So `byTopic` giữa `cuu-chuong-v1` và `ninja-toan-v1` | đo nền / 80% / 85% |

### 4.2 Trải nghiệm chơi

| Mã | Phát biểu | Chỉ số | Ngưỡng | Cách đo | 3T / 6T / 12T |
|---|---|---|---|---|---|
| M5 | Bé muốn chơi lại | Ngày chơi mỗi tuần; độ dài phiên | ≥ 3 ngày; phiên 8 đến 20 phút | Nhật ký ngày chơi (M9) | 2 / 3 / 3 ngày |
| M6 | Không sợ sai | Tỉ lệ ván thoát ngay sau lần sai đầu | < 10% | Sự kiện thoát ván | 20% / 10% / 8% |
| M7 | Độ khó vừa tay, gợi ý là phao | Tỉ lệ ván ≥ 2 sao; tỉ lệ ván hết tim; tỉ lệ câu dùng 💡 | 55 đến 75%; < 25%; 5 đến 20% | `records[*].stars`; lưu thêm cờ hết tim và `hinted` vào `stats` | có số đo / đạt / giữ |

### 4.3 Thấu hiểu cho phụ huynh

| Mã | Phát biểu | Chỉ số | Ngưỡng | Cách đo | 3T / 6T / 12T |
|---|---|---|---|---|---|
| M8 | Một Sổ tay phụ huynh cho cả 6 game, mở từ trang chủ | Phụ huynh xem 2 phút rồi trả lời đúng 3 câu | 8/10 | Khảo sát đối chiếu dữ liệu | bản đầu / 6/10 / 8/10 |
| M9 | Dòng thời gian theo tuần | Mỗi hồ sơ có ảnh tuần: ngày chơi, đúng, sai, chủ đề mới Đã thuộc | 100% hồ sơ có ≥ 4 tuần | Thêm `weeks[]` (tối đa 26 tuần) vào khóa game | thiết kế / có / có |
| M10 | Ghi được sở thích | Ván và phút theo game; ván bỏ dở; game mở đầu tiên | Sổ tay nêu được game thích nhất và ít thích nhất | Trang chủ đọc 6 khóa game (chỉ đọc) | có / có / có |
| M11 | Cam kết riêng tư kiểm chứng được | Trang phụ huynh nêu: không tài khoản, không quảng cáo, không gửi dữ liệu, cách xóa | Test tự động đếm 0 yêu cầu ngoài font | Test e2e liệt kê host | có trang / có test / giữ |

### 4.4 Chất lượng và an toàn

| Mã | Phát biểu | Chỉ số | Ngưỡng | Cách đo | 3T / 6T / 12T |
|---|---|---|---|---|---|
| M12 | Không rò rỉ | Số host ngoài được gọi | 0, trừ fonts.googleapis.com và fonts.gstatic.com | Test e2e mỗi lần phát hành | 0 / 0 / 0 |
| M13 | Đúng SGK | Lỗi kiến thức hoặc ký hiệu (dấu chia, thứ tự 2 × 7, cách đọc giờ) do giáo viên tìm ra | 0 lỗi mở quá 2 tuần | Một giáo viên tiểu học rà mỗi màn mới | rà 6 game / mọi màn mới / giữ |
| M14 | Chạy ổn, bé nào cũng chơi được | Gauntlet e2e; thử 3 máy thật; vùng chạm ≥ 44 px, chế độ Ít hiệu ứng, giọng đọc | 100% kịch bản qua, 0 lỗi chặn | `tests/run.js`, `gauntlet-matrix.e2e.js`, `consistency.test.js` | thử máy thật / giữ / giữ |
| M15 | Không mất tiến trình | Báo cáo mất tiến trình sau cập nhật | 0 | Di trú có kiểm thử; tăng `CACHE` đúng quy trình | 0 / 0 / 0 |

### 4.5 Vận hành

| Mã | Phát biểu | Chỉ số | Ngưỡng | Cách đo | 3T / 6T / 12T |
|---|---|---|---|---|---|
| M16 | Nhịp đều, quyết định có lý do | Nội dung mới hoặc cải tiến lớn mỗi 4 tuần; ADR cho mỗi thay đổi dữ liệu hoặc luật chơi | ≥ 1; 100% | Nhật ký phát hành; thư mục `adr` | 3 / 6 / 12 |
| M17 | Chi phí gần 0 | Chi phí năm ngoài tên miền | 0 đồng (GitHub Pages) | Sao kê | 0 / 0 / 0 |
| M18 | Nghe được phụ huynh | Phản hồi qua thư điện tử trên trang phụ huynh | ≥ 10 mỗi quý, trả lời trong 7 ngày | Hộp thư | 5 / 10 / 10 |

## 5. Kỳ vọng của từng bên

| Bên | Kỳ vọng | Loại |
|---|---|---|
| Bé | Vào chơi trong 2 chạm, không đăng nhập; sai thì được chỉ cách làm, không mất hết điểm, không bị chê | Cam kết |
| Bé | Sao, kỷ lục, nhân vật của riêng mình; mỗi tháng có thứ mới | Mong muốn |
| Phụ huynh | Không quảng cáo, không mua trong game, không thu thập dữ liệu; xóa được mọi thứ bằng một nút sau cổng phụ huynh | Cam kết |
| Phụ huynh | Sổ tay nói tiếng Việt thường: "Tuần này con thuộc bảng nhân 7, còn hay quên nhớ khi trừ 62 − 38" | Cam kết từ 6T |
| Phụ huynh | Gợi ý việc làm cùng con ngoài màn hình (phiếu in, xem lịch, đi chợ tính tiền) | Mong muốn |
| Giáo viên | Nội dung, ký hiệu, cách đọc khớp SGK; có bảng đối chiếu với chương trình | Cam kết |
| Giáo viên | Mở khóa mọi màn để dùng trên lớp; in được kết quả một bé | Mong muốn |
| Người làm sản phẩm | Mỗi game tự chứa, kiểm thử chạy dưới 5 phút, không build, không dịch vụ ngoài (cam kết); dữ liệu đủ để biết một màn có quá khó không mà không cần máy chủ (mong muốn) | Cả hai |

## 6. Không phải mục tiêu và ranh giới phạm vi

- Không tài khoản, không đăng nhập, không đồng bộ đám mây. Hai máy là hai hồ sơ; giải pháp cho phép là xuất nhập tệp tiến trình.
- Không quảng cáo, không mua trong game, không gói trả phí, không thu thư điện tử phụ huynh.
- Không xếp hạng giữa các bé khác máy, không đổi huy hiệu lấy quà thật, không thông báo đẩy; bé quay lại phải vì trò chơi.
- Không thay SGK hay giáo viên: trò chơi luyện và củng cố, không giảng bài mới dài. Không dạy trước chương trình (không lấn sang lớp 4); lớp 1 giữ như hiện có trong Ninja.
- Không chatbot, không lời giải sinh tự động: mọi lời giải thích viết tay và rà theo SGK.
- Không ứng dụng gốc trên App Store; PWA "Thêm vào Màn hình chính" là đủ.
- Không chấm điểm kiểu bài kiểm tra, không hiện kết quả bé này cho bé khác.
- Mạch Hoạt động thực hành (2 nội dung) làm bằng phiếu in cho phụ huynh, không làm game.

## 7. Giả định và rủi ro lớn nhất

| Giả định | Nếu sai | Kiểm chứng sớm |
|---|---|---|
| Chơi vui tự sinh động lực, không cần thưởng ngoài | Bé chỉ chém quả, không đọc lời giải; cùng câu sai từ 3 lần | Trước 3T, với 5 bé: đếm mục `missed` có `n ≥ 3` sau 2 tuần; trên 30% kho thì sửa khoảng đọc sau lỗi |
| Một máy là đủ | Bé dùng 2 máy, dữ liệu tách đôi; xóa dữ liệu trình duyệt là mất hết | Hỏi 10 gia đình số thiết bị; từ 4 gia đình dùng 2 máy thì làm xuất nhập tệp ở 6T |
| Phụ huynh sẽ mở Sổ tay nếu nó ở trang chủ | Ghi mà không ai đọc | Đếm số lần mở (lưu cục bộ); dưới 1 lần mỗi tuần thì đổi sang thẻ tóm tắt hiện thẳng ở trang chủ |
| Một hai người làm được một nội dung mỗi 4 tuần | Bản đồ không bao giờ đầy, mất nhịp là mất niềm tin | Đo thời gian thật của 3 nội dung đầu; trung bình quá 6 tuần thì hạ M1 |
| Đúng SGK làm phụ huynh và giáo viên tin (rủi ro lớn nhất) | Một lỗi ký hiệu (42 ÷ 7 thay vì 42 : 7, đảo 2 × 7 thành 7 × 2 ở lớp 2) đủ để bị coi là không đáng tin | Trước 3T một giáo viên rà 6 game; mỗi màn mới phải qua rà trước khi phát hành |

## 8. Tiêu chí quyết định

Thành công ở 6T (2027-03-10) khi đủ cả bốn: (1) north star đạt trên 10 gia đình; (2) M1 đạt 35 nội dung, trong đó có ý nghĩa phép nhân, phép chia có dư và bài toán một phép tính; (3) Sổ tay có dòng thời gian 4 tuần (M8, M9); (4) M12 và M13 giữ mức 0.

Đổi hướng khi gặp một dấu hiệu sau, kiểm tra tại 3T và 6T:

- Dưới 4/10 bé quay lại từ 3 ngày mỗi tuần dù đã có nội dung mới: dừng mở rộng, dành một chu kỳ sửa vòng chơi lõi (độ khó, thưởng, nhịp).
- Dưới 5/10 phụ huynh trả lời đúng 3 câu dù đã có Sổ tay: cách kể chuyện sai, không phải thiếu dữ liệu; làm lại Sổ tay cùng giáo viên và phụ huynh trước khi ghi thêm trường nào.
- Bé Đã thuộc một chủ đề mà 4 tuần sau chơi lại đúng dưới 75%: ngưỡng quá dễ, phải đưa ôn lại theo khoảng cách thời gian vào kho `missed`.
- Giáo viên tìm ra từ 3 lỗi kiến thức trong một đợt rà: dừng phát hành nội dung mới tới khi có quy trình đối chiếu SGK bằng văn bản.
- Nhịp phát hành trượt 2 kỳ liên tiếp: thu M1 về mạch Số và phép tính, chấp nhận 12T đạt 45 thay vì 60.

Không đổi dù kết quả thế nào: không tài khoản, không quảng cáo, không gửi dữ liệu ra ngoài. Không đạt north star trong ranh giới đó thì làm khác đi bên trong ranh giới, không nới ranh giới.
