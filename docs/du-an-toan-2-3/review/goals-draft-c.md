# Mục tiêu và kỳ vọng của dự án (bản nháp C: bền vững và đo được là trên hết)

| | |
|---|---|
| Tình trạng | Bản nháp |
| Ngày | 2026-09-10 |
| Chủ sở hữu | 3hoa |
| Liên quan | `docs/du-an-toan-2-3/ban-do-toan-2-3.md`, `docs/du-an-toan-2-3/templates/mau-adr.md`, `docs/game-refresh-2026-09-06.md`, `docs/gauntlet/status.md` |

Góc nhìn: một người làm, website tĩnh trên GitHub Pages, không backend, không tài khoản, ngân sách nhỏ. Mục tiêu nào không đo được bằng localStorage hoặc khảo sát nhỏ thì không đưa vào. Mã M1 đến M11 dùng để ADR và spec trích dẫn.

## 1. Tuyên bố mục đích

3hoa.com giúp trẻ lớp 2 và 3 luyện các mốc Toán phải lặp nhiều lần (8 + 7, 36 + 27, 42 : 7, đọc giờ 7 giờ kém 15) bằng trò chơi 1 đến 2 phút trên iPad hoặc điện thoại của gia đình, không cài đặt, không đăng nhập. Mỗi ván, game ghi lại bé đúng gì, sai gì, sai mấy lần, rồi tự đưa câu sai quay lại để bé sửa. Phụ huynh mở một màn hình là biết con thuộc phép nào, yếu phép nào, tuần này có tiến bộ không. Dự án phải chạy lâu dài với một người bảo trì và chi phí gần bằng không, nên chỉ làm những gì đo được là có tác dụng.

## 2. Vấn đề đang giải quyết

**Cho bé.** Chương trình 2018 lớp 2 và 3 có nhiều nội dung phải luyện tới khi thành phản xạ: cộng trừ qua 10 (8 + 7, 15 - 9), cộng trừ có nhớ trong 100 (36 + 27, 62 - 38), bảng nhân chia 2 đến 9 (6 × 7, 42 : 7), nhân chia số có hai chữ số (23 × 4, 84 : 4), xem giờ từng phút. Vở bài tập cho 10 phép giống nhau, sai thì tối mới được chữa, và không ai nhớ bé đã sai 42 : 7 ba lần trong tuần.

**Cho phụ huynh.** Hỏi "hôm nay con học gì" không ra thông tin. Họ cần biết con đã thuộc phép nào, hay sai phép nào. Sách và vở không thống kê giúp.

**Hiện trạng 6 game theo bản đồ 93 nội dung.**

| Trạng thái | Lớp 2 (44) | Lớp 3 (49) | Tổng |
|---|---|---|---|
| Đã có game | 8 | 6 | 14 (15%) |
| Một phần | 4 | 6 | 10 |
| Chưa có | 32 | 37 | 69 |

Cả 14 nội dung đã có đều thuộc phép tính (Ninja Toán Học, Vệ Binh Cửu Chương) và xem đồng hồ (4 game). Hình học, đo lường, tiền, thống kê: chưa có gì.

**Dữ liệu đang ghi.** Mỗi game lưu riêng cho từng bé: `stats` (`plays`, `correct`, `wrong`, `seconds`, `byTopic[màn] = {c, w}`, `last`), kho `missed` (số lần sai `n`, số lần đúng lại `ok`) cho từng phép tính, `records` (sao, kỷ lục theo màn). Cả 6 game có màn 📊 Kết quả với ngưỡng chung: "Cần luyện thêm" khi từ 5 câu mà đúng dưới 70%, "Đã thuộc" khi đúng từ 90% trên ít nhất 20 câu. Trang chủ chỉ đọc sao, kỷ lục, phút chơi.

**Chưa ghi được:** nhật ký theo ngày (chỉ có một mốc `last`), ván bỏ dở, tín hiệu bé thích hay chán, báo cáo chung 6 game. Vì thế chưa trả lời được "bé tiến bộ qua các trò chơi ra sao".

## 3. Mục tiêu cuối cùng (north star)

**Bé tiến bộ có bằng chứng**: trong một tháng, dữ liệu của chính bé cho thấy ít nhất một chủ đề (`byTopic`) chuyển từ "chưa thuộc" sang "Đã thuộc", và bé chơi ít nhất 4 ngày khác nhau.

Chỉ số north star: **tỉ lệ bé tiến bộ có bằng chứng mỗi tháng** trong nhóm quan sát (các gia đình đồng ý gửi phiếu kết quả hằng tháng).

Đã đạt khi: đến 2027-09-10, nhóm quan sát có từ 30 bé và 3 tháng liên tiếp gần nhất, mỗi tháng có từ 50% bé tiến bộ có bằng chứng. Không có server nên con số này chỉ tính được từ phiếu phụ huynh gửi về; M10 (nền đo lường) vì thế là điều kiện tiên quyết.

## 4. Bộ mục tiêu chi tiết

Ưu tiên khi phải chọn: M10, M11 (đo được, bền vững) trước; rồi M8, M9 (không mất dữ liệu, chạy tốt máy thật); rồi M1, M2 (học tập); rồi M6, M7 (phụ huynh); rồi M4, M5 (trải nghiệm); cuối cùng M3 (phủ thêm nội dung). Game mới không có nhật ký ván thì không chứng minh được gì; mất tiến trình một lần là mất lòng tin cả gia đình.

Mốc: 3 tháng = 2026-12-10, 6 tháng = 2027-03-10, 12 tháng = 2027-09-10.

### 4.1 Học tập

| Mã | Mục tiêu và chỉ số | Ngưỡng theo mốc | Cách đo |
|---|---|---|---|
| M1 | North star: tỉ lệ bé có chủ đề mới đạt "Đã thuộc" trong tháng, chơi từ 4 ngày | 3 tháng: số nền với từ 10 bé. 6 tháng: từ 40% với từ 20 bé. 12 tháng: từ 50% với từ 30 bé | So `byTopic` giữa hai phiếu liên tiếp; số ngày chơi từ nhật ký ván (M10) |
| M2 | Ôn lại có tác dụng: tỉ lệ phép tính vào kho `missed` được xóa (đúng lại 2 lần) trong 5 ván kế tiếp | 3 tháng: số nền. 6 tháng: từ 50%. 12 tháng: từ 60% | Nhật ký ván ghi số câu ôn lại đã ra và đã xóa |
| M3 | Phủ nội dung có chọn lọc: số nội dung "Đã có game" trong bản đồ 93 | 3 tháng: 18 (nâng 4 mục "một phần", ví dụ 2.15 tìm số hạng chưa biết ? + 5 = 12, 3.18 chia có dư 17 : 5 = 3 dư 2). 6 tháng: 24, có 1 game mới cho nhóm chưa có (ưu tiên tiền Việt Nam 2.14, 3.15). 12 tháng: 32, hết mục "một phần" | Cập nhật cột trạng thái sau mỗi phát hành; chỉ tính "Đã có" khi game ghi `byTopic` cho mục đó |

### 4.2 Trải nghiệm chơi

| Mã | Mục tiêu và chỉ số | Ngưỡng theo mốc | Cách đo |
|---|---|---|---|
| M4 | Bé tự quay lại: tỉ lệ bé chơi từ 2 ngày mỗi tuần trong 4 tuần liên tiếp | 3 tháng: số nền. 6 tháng: từ 40%. 12 tháng: từ 50% | Nhật ký ván; khảo sát hỏi "bé tự mở hay được nhắc" |
| M5 | Ván trọn vẹn, vừa sức: tỉ lệ ván hoàn thành và tỉ lệ ván từ 2 sao | 6 tháng: hoàn thành từ 80%; ván từ 2 sao trong khoảng 40% đến 70% (dưới là quá khó, trên là quá dễ, chỉnh tốc độ màn đó). 12 tháng: giữ ở mọi màn có từ 30 ván | Nhật ký ván có cờ bỏ dở; `records`. Mong muốn: một chạm "vui / thường / chán" sau ván, "vui" từ 70% |

### 4.3 Thấu hiểu cho phụ huynh

| Mã | Mục tiêu và chỉ số | Ngưỡng theo mốc | Cách đo |
|---|---|---|---|
| M6 | Phụ huynh đọc hiểu: sau 1 phút xem báo cáo, trả lời đúng "con đã thuộc gì" và "con hay sai gì" so với dữ liệu thật | 3 tháng: khảo sát lần 1 với 10 phụ huynh. 6 tháng: từ 7/10. 12 tháng: từ 8/10 | Khảo sát mỗi quý qua Zalo hoặc trực tiếp, cùng bộ 2 câu |
| M7 | Phiếu kết quả và báo cáo chung: nút "Sao chép kết quả" ở trang chủ tạo văn bản gồm tên bé, mỗi game: phút chơi, % đúng, chủ đề còn yếu, 5 phép tính sai nhiều nhất, số ngày chơi 4 tuần qua | 3 tháng: nút chạy; từ 70% gia đình trong nhóm gửi phiếu hằng tháng. 6 tháng: trang chủ có phần "Con giỏi / cần luyện / tiến bộ 4 tuần qua" gộp 6 game, từ 60% gia đình mở mỗi tháng. 12 tháng: thêm gợi ý "tuần này luyện màn nào" | Đếm lượt mở báo cáo trong localStorage, đưa vào phiếu; số phiếu nhận mỗi tháng |

### 4.4 Chất lượng và an toàn

| Mã | Mục tiêu và chỉ số | Ngưỡng theo mốc | Cách đo |
|---|---|---|---|
| M8 | Không mất tiến trình: số lần báo mất sao, kỷ lục, kho ôn lại sau cập nhật; tỉ lệ gia đình đã "Thêm vào màn hình chính" | Mọi mốc: 0 lần mất; mỗi lần tăng `CACHE` trong `sw.js` kèm kiểm thử di trú. 6 tháng: từ 80% gia đình đã cài lên màn hình chính (tránh Safari xóa localStorage sau 7 ngày không mở) | Kiểm thử tự động (hiện 228/228); câu hỏi trong khảo sát quý |
| M9 | Chạy tốt máy thật, không theo dõi: mỗi phát hành thử trên 1 iPad Safari thật và 1 Android tầm trung; dung lượng; yêu cầu mạng ngoài | Ngay: không yêu cầu mạng nào ngoài Google Fonts, không mã theo dõi. 6 tháng: Xe Tăng Thời Gian (2,4 MB) và Cưỡi Hổ Vượt Lửa (2,3 MB) giảm còn không quá 1,2 MB; bốn game còn lại dưới 0,7 MB. 12 tháng: tải lần đầu dưới 3 giây trên 4G | Bảng kiểm phát hành; `du -sk` từng thư mục; Lighthouse trên điện thoại |

### 4.5 Vận hành

| Mã | Mục tiêu và chỉ số | Ngưỡng theo mốc | Cách đo |
|---|---|---|---|
| M10 | Nền đo lường không cần server: nhật ký ván tối đa 300 mục mỗi bé (thời điểm, game, màn, đúng, sai, gợi ý, giây, hoàn thành hay bỏ dở, số câu ôn lại); phiếu kết quả; sổ tay đo lường ghi cách tính M1 đến M7 | 3 tháng: nhật ký có trong cả 6 game (trang chủ chỉ đọc), phiếu chạy, sổ tay xong. 6 tháng: mọi chỉ số M1 đến M7 tính được từ phiếu bằng một script trong `scripts/` | Script đọc một phiếu, in đủ chỉ số; kiểm thử di trú cho khóa mới |
| M11 | Bền vững một người: giờ bảo trì mỗi tuần, chi phí mỗi năm, số phát hành mỗi tháng, thời gian người mới dựng được theo README | Mọi mốc: không quá 6 giờ mỗi tuần (trung bình tháng); không quá 1 triệu đồng mỗi năm; mỗi tháng ít nhất 1 phát hành. 6 tháng: một người ngoài dựng và phát hành thử trong 1 giờ | Sổ giờ trong `docs/du-an-toan-2-3/`; lịch sử commit; hóa đơn tên miền |

## 5. Kỳ vọng của từng bên

| Bên | Cam kết (phải giữ) | Mong muốn (không hứa) |
|---|---|---|
| Bé (7 đến 9 tuổi) | Mở là chơi được trong 5 giây, không đăng nhập, không quảng cáo, không mua gì. Sai luôn có cách nghĩ trước khi lộ đáp án (7 × 8: lấy 7 × 7 rồi cộng 7). Sao và kỷ lục không mất vì cập nhật | Game mới mỗi quý; giọng đọc tiếng Việt hay trên mọi máy; nhân vật đẹp như hổ và xe tăng ở các game còn lại |
| Phụ huynh | Biết con giỏi gì, yếu gì trong 1 phút, không thuật ngữ. Dữ liệu chỉ nằm trên máy nhà, không gửi đi đâu nếu không tự bấm "Sao chép kết quả". Xóa tiến trình phải qua cổng phụ huynh | Gợi ý mỗi tuần luyện màn nào; phiếu in được |
| Giáo viên | Bám Chương trình 2018, phép chia viết bằng dấu hai chấm như SGK (14 : 2), bảng 2 và 5 giữ đúng thứ tự thừa số. Mở khóa mọi màn để dùng trên lớp | Phiếu bài tập in kèm mã QR; bảng theo dõi cả lớp (ngoài phạm vi khi chưa có server) |
| Người làm sản phẩm | Không quá 6 giờ mỗi tuần, không nợ chi phí, mỗi thay đổi có kiểm thử và số liệu; được phép dừng mở rộng khi số liệu nói không | 1 đến 2 người góp sức (giáo viên góp nội dung, lập trình viên review); được trường hoặc nhóm phụ huynh giới thiệu |

## 6. Không phải mục tiêu và ranh giới phạm vi

- Không tài khoản, không đồng bộ giữa các máy, không server trong 12 tháng; xem lại chỉ qua ADR có dữ liệu từ M7 (bao nhiêu gia đình dùng từ 2 máy).
- Không quảng cáo, không thu phí, không thu thập gì ngoài tên gọi và hình đại diện bé tự chọn.
- Không phủ đủ 93 nội dung trong 12 tháng: 32 nội dung có game tốt hơn 93 nội dung có game xoàng.
- Không bảng điều khiển cho cả lớp, không LMS, không chơi qua mạng, không ứng dụng gốc trên App Store hay Google Play.
- Không mở sang lớp 4, 5 hay tiếng Anh trước khi north star đạt ngưỡng 12 tháng.
- Không thay thế thầy cô và SGK: game luyện tập và phản hồi, chỉ dạy bài mới ở mức bài học ngắn như Tháp Đồng Hồ.

## 7. Giả định và rủi ro lớn nhất, cách kiểm chứng sớm

| Giả định | Nếu sai | Kiểm chứng sớm |
|---|---|---|
| localStorage đủ bền làm nơi lưu duy nhất | Safari xóa dữ liệu trang không mở trong 7 ngày (trừ khi đã cài lên màn hình chính); bé mất hết sao | Tháng 10/2026: trên iPad thật, chơi rồi không mở 8 ngày, so sánh có cài và không cài; nếu mất, thêm lời nhắc cài ở lần mở thứ 2 |
| Phụ huynh chịu gửi phiếu hằng tháng | Không có số liệu thì mọi mục tiêu chỉ là cảm giác | Tháng 12/2026: mời 15 gia đình, cần 10 gửi phiếu; dưới 6 thì rút phiếu còn một dòng, một nút trước khi làm gì khác |
| Tỉ lệ đúng phản ánh việc thuộc, không phải đoán | Ninja có thể chém bừa, Tháp có thể xin gợi ý liên tục; "Đã thuộc" giả | Nhật ký ghi số lần gợi ý (Vệ Binh đã đếm `hinted`); "Đã thuộc" chỉ tính câu không gợi ý; quý 1/2027 hỏi miệng 5 bé 10 phép tính để đối chiếu |
| Bé tự quay lại, không cần ép | M4 thất bại, dữ liệu thưa, M1 không tính được | Khảo sát 3 tháng hỏi "bé tự mở hay được nhắc"; đối chiếu số ngày chơi |
| Một người giữ được 6 giờ mỗi tuần trong 12 tháng | Cạn sức, bỏ dở, cập nhật hỏng cache | Sổ giờ hằng tuần; hai tháng liền vượt 10 giờ là cắt phạm vi ngay (mục 8) |
| Máy nhà có giọng đọc tiếng Việt | Bé đọc chậm không nghe được cách nghĩ | Bảng kiểm phát hành ghi máy không có giọng Việt; lời mách luôn có chữ |

## 8. Tiêu chí quyết định

**3 tháng (2026-12-10).** Bắt buộc: M10 chạy trong cả 6 game, M8 bằng 0, nhóm quan sát từ 10 bé có gửi phiếu. Chưa có phiếu nào thì dừng làm game mới cho tới khi có.

**6 tháng (2027-03-10).** Đạt khi M1 từ 40%, M6 từ 7/10, M7 có báo cáo tổng hợp, M9 hai game nặng đã giảm dung lượng. Không đạt M1 nhưng đạt M4 và M6: giữ hướng, chỉnh nội dung ôn lại. Không đạt cả M1 lẫn M4: đổi hướng.

**Thành công (2027-09-10)** khi đồng thời: nhóm quan sát từ 30 bé; 3 tháng liên tiếp có từ 50% bé tiến bộ có bằng chứng (M1); từ 8/10 phụ huynh đọc hiểu (M6); từ 32 nội dung có game (M3); 0 lần mất tiến trình (M8); bảo trì không quá 6 giờ mỗi tuần (M11). Khi đó mới cân nhắc ADR về lớp 4 hoặc đồng bộ giữa các máy.

**Đổi hướng khi**: (a) sau 6 tháng nhóm quan sát dưới 8 bé dù đã mời qua 2 lớp và 2 nhóm phụ huynh: dừng mở rộng, giữ trang làm công cụ cho gia đình và bạn bè; (b) M4 dưới 30% sau hai lần sửa trải nghiệm: ưu tiên phiếu bài tập in kèm game ngắn thay vì game hành động; (c) M6 dưới 5/10 sau hai lần thiết kế lại: rút báo cáo còn 3 dòng (thuộc, cần luyện, sai nhiều nhất), bỏ biểu đồ; (d) từ 30% gia đình dùng 2 máy và than mất tiến trình: mở ADR về xuất nhập dữ liệu bằng mã QR hoặc tệp, chưa phải server.

**Dừng khi** người bảo trì vượt 10 giờ mỗi tuần trong 2 tháng liền, hoặc mất dữ liệu lặp lại lần thứ 2 chưa rõ nguyên nhân: đóng băng tính năng mới, chỉ sửa lỗi và giữ trang chạy cho tới khi có người thứ hai cùng làm.
