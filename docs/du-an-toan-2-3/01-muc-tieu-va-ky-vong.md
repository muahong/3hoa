# Mục tiêu và kỳ vọng của dự án

> Tình trạng: Bản nháp | Ngày: 2026-09-10 | Chủ sở hữu: 3hoa | Liên quan: `docs/du-an-toan-2-3/ban-do-toan-2-3.md`, `docs/du-an-toan-2-3/02-nhan-vat-ao.md`, `docs/du-an-toan-2-3/templates/mau-spec.md`, `docs/du-an-toan-2-3/templates/mau-adr.md`, `docs/du-an-toan-2-3/review/goals-hoi-dong.md`, `docs/game-refresh-2026-09-06.md`

Tổng hợp từ ba bản nháp trong `review/` (xem `review/goals-hoi-dong.md`). Ràng buộc thật: một người làm, web tĩnh trên GitHub Pages, không backend, không tài khoản, dữ liệu trong localStorage; mục tiêu nào không đo được bằng localStorage hoặc khảo sát nhỏ thì không đưa vào. Spec và ADR trích dẫn mã M1 đến M13.

## 1. Tuyên bố mục đích

3hoa.com giúp bé lớp 2 và 3 tự cầm iPad hay điện thoại của gia đình chơi 10 đến 15 phút để luyện các mốc Toán phải lặp tới khi thành phản xạ: 8 + 7, 36 + 27, 6 × 7, 42 : 7, đọc "8 giờ kém 15 phút". Bé sai bao nhiêu lần cũng không xấu hổ, luôn được chỉ cách nghĩ trước khi lộ đáp án, câu sai quay lại cho tới khi làm được. Game ghi lại bé đúng gì, sai gì, xin gợi ý bao nhiêu, rồi kể cho phụ huynh bằng tiếng Việt thường, ngay trên máy, không gửi đi đâu.

Mọi mục tiêu phục vụ hai điều: bé muốn quay lại, phụ huynh hiểu con và tin sản phẩm. **Luật loại tính năng:** tính năng giúp học nhanh hơn nhưng khiến bé sợ sai, hoặc khiến phụ huynh phải hỏi "dữ liệu của con đi đâu", thì bị loại. Một người bảo trì, chi phí gần bằng không, nên chỉ mở rộng những gì đo được là có tác dụng.

## 2. Vấn đề đang giải quyết

### 2.1 Cho bé

Lớp 2 và 3 có nhiều bậc thang phải luyện tới mức tự động: cộng trừ qua 10 (8 + 7), có nhớ trong 100 (36 + 27), bảng nhân chia 2 đến 9, nhân chia số có hai chữ số (84 : 4), giờ kém. Lỗi của bé lặp lại và có tên: quên nhớ 1 (36 + 27 = 53), nhầm ô bên cạnh trong bảng nhân (6 × 7 = 48), trừ thay vì chia (42 : 7 = 35). Vở bài tập không nói vì sao sai, sai trước mặt người lớn làm bé sợ, và không ai nhớ bé đã sai 42 : 7 ba lần trong tuần. Sáu game hiện có đã giải thích cách nhẩm, gọi tên lỗi (`misconception` trong `math-ninja/js/math.js`) và có kho ôn lại (câu sai quay lại tới khi đúng 2 lần). Nhưng bé mới được luyện phần "tính", chưa được luyện phần "hiểu": ý nghĩa phép nhân (4 + 4 + 4 là 4 × 3), chia có dư (17 : 5 = 3 dư 2), gấp lên nhiều lần.

### 2.2 Cho phụ huynh

Màn 📊 Kết quả từng game đã có số ván, tỉ lệ đúng, phút luyện, "Cần luyện thêm" (từ 5 câu mà đúng dưới 70%), "Đã thuộc" (đúng từ 90% trên ít nhất 20 câu). Nhưng chưa trả lời được "con tiến bộ ra sao" vì bốn hạn chế:

1. `stats` cộng dồn, chỉ có một mốc `last`, không có lịch sử theo tuần.
2. Sổ ghi theo màn (`a3`, `d4`), chưa gộp theo mã chương trình: phụ huynh phải tự cộng màn a3 của Ninja với bảng 2 của Vệ Binh.
3. Tỉ lệ đúng tính cả câu có gợi ý (`math-ninja/js/game.js` dòng 891 tăng `G.correct` trước khi xét gợi ý, chỉ `noteOk` ở dòng 918 loại trừ; Vệ Binh đếm `G.hinted` trong ván nhưng `addStats` không lưu), nên huy hiệu Đã thuộc có thể cấp cho bé chủ yếu bấm 💡.
4. Không ghi ván bỏ dở, thời gian trả lời, loại lỗi, tín hiệu thích hay chán.

### 2.3 Hiện trạng

Theo bản đồ 93 nội dung: 14 đã có game (lớp 2: 8, lớp 3: 6), 10 một phần (4 và 6), 69 chưa có (32 và 37). Mọi nội dung đã có đều là phép tính hoặc xem đồng hồ; hình học, đo lường, tiền, thống kê, bài toán có lời văn chưa có gì.

## 3. Mục tiêu cuối cùng (north star)

**Sau 4 tuần dùng, bé tự xin chơi lại và phụ huynh kể được ba điều đúng về con: con thích gì, đã giỏi phép toán nào, còn vướng phép toán nào. Bằng chứng nằm trong dữ liệu của chính bé.**

Định nghĩa dùng chung:

| Khái niệm | Định nghĩa |
|---|---|
| Nội dung | Một mã trong bản đồ (2.8, B2.11), không phải màn chơi; màn gắn mã qua bảng ánh xạ ở M12 |
| Chưa thuộc | Câu không gợi ý đúng dưới 50% trên ít nhất 10 câu, lấy từ ván chơi bình thường, không có ván kiểm tra |
| Đã thuộc | Ít nhất 20 câu không gợi ý, đúng từ 90%, kho ôn lại của nội dung đó trống; có nhật ký ván thì chỉ tính 14 ngày gần nhất. Huy hiệu hiện tại (tính cả gợi ý) không dùng làm số nền |
| Chơi đều | Ít nhất 2 ngày và 30 phút mỗi tuần, trong 4 tuần liên tiếp |
| Tiến bộ có bằng chứng | Trong một tháng, bé chơi đều và có ít nhất một nội dung chuyển từ Chưa thuộc sang Đã thuộc; nội dung thuộc sẵn từ trước không tính |

Chỉ số: **tỉ lệ bé tiến bộ có bằng chứng mỗi tháng** trong nhóm quan sát (gia đình gửi phiếu hằng tháng; mẫu số là bé có phiếu và còn nội dung Chưa thuộc). Đạt khi đến 2027-09-10 nhóm có từ 30 bé và 3 tháng liên tiếp gần nhất từ 50%. Chỉ tính được từ phiếu, nên M12 là điều kiện tiên quyết.

## 4. Bộ mục tiêu chi tiết

Mốc: 3T = 2026-12-10, 6T = 2027-03-10, 12T = 2027-09-10.

**Ưu tiên khi phải chọn:** (1) M12, M13; (2) M9, M5, M11; (3) M1, M2, M10; (4) M7, M8; (5) M4, M6; (6) M3. Game mới không có nhật ký ván thì không chứng minh được gì; mất tiến trình một lần là mất lòng tin cả gia đình; bé sợ sai thì bỏ chơi và mọi số khác thành trống.

### 4.1 Học tập

| Mã | Mục tiêu và chỉ số | Ngưỡng theo mốc | Cách đo |
|---|---|---|---|
| M1 | North star. Nhắm tới: lớp 2 là 2.8, 2.9, 2.11, 2.20, 2.22, B2.11; lớp 3 là 3.12, 3.13, 3.14, 3.16, B3.17 | 3T: số nền, từ 10 bé, theo định nghĩa mới. 6T: 40%, từ 20 bé. 12T: 50%, từ 30 bé | Script so hai phiếu liên tiếp |
| M2 | Sửa được, nhớ được: (a) tỉ lệ mục `missed` được xóa trong 5 ván kế tiếp; (b) tỉ lệ nội dung Đã thuộc mà 4 tuần sau vẫn đúng từ 75% qua câu ôn lại thường; (b) dưới ngưỡng thì đưa ôn lại theo khoảng cách thời gian vào kho `missed` | 3T: số nền. 6T: (a) 50%, (b) 70%. 12T: (a) 60%, (b) 80% | Nhật ký ván |
| M3 | Phủ nội dung có chọn lọc: số nội dung "Đã có game", chỉ tính khi có màn luyện, có ôn lại và ghi `byTopic` gắn mã | 3T: 18, nâng 4 mục "một phần" (2.15, 3.11, 3.19, 2.24). 6T: 24, thêm 2.13, 3.17, B3.18 và ba nội dung "hiểu" 2.19, 2.21, 3.18. 12T: 32, hết "một phần", có 2.18, 2.26, 3.20 và game tiền Việt Nam (B2.14, B3.15) | Cột trạng thái trong bản đồ |

### 4.2 Trải nghiệm chơi

| Mã | Mục tiêu và chỉ số | Ngưỡng theo mốc | Cách đo |
|---|---|---|---|
| M4 | Bé tự quay lại: tỉ lệ bé chơi đều | 3T: số nền. 6T: 40%. 12T: 50% | Nhật ký ván; hỏi "bé tự mở hay được nhắc" |
| M5 | Không sợ sai: tỉ lệ ván thoát ngay sau lần sai đầu; sau khi thua, tỉ lệ chơi lại trong 2 phút | 6T: thoát dưới 10%, chơi lại từ 60%. 12T: giữ | Nhật ký ván ghi cờ bỏ dở kèm số câu sai lúc thoát |
| M6 | Vừa sức, gợi ý là phao: ván hoàn thành; ván từ 2 sao; câu dùng 💡; một chạm "vui / thường / chán" sau ván | 6T: hoàn thành từ 80%; 2 sao trong 40% đến 70% (ngoài dải thì chỉnh tốc độ màn đó); gợi ý 5% đến 20%; "vui" từ 70%. 12T: giữ ở mọi màn có từ 30 ván | Nhật ký ván; `records` |

### 4.3 Thấu hiểu cho phụ huynh

| Mã | Mục tiêu và chỉ số | Ngưỡng theo mốc | Cách đo |
|---|---|---|---|
| M7 | Phụ huynh đọc hiểu: sau 2 phút xem báo cáo, trả lời đúng 3 câu (thích gì, giỏi gì, vướng gì) so với dữ liệu | 3T: khảo sát lần 1 với 10 phụ huynh. 6T: 7/10. 12T: 8/10 | Khảo sát mỗi quý, cùng bộ 3 câu |
| M8 | Phiếu và báo cáo gộp: nút "Sao chép kết quả" ở trang chủ tạo phiếu văn bản (phút chơi, % đúng không gợi ý, nội dung yếu, 5 phép tính sai nhiều nhất, ngày chơi 4 tuần); báo cáo gộp 6 game theo mã chương trình, giọng thường: "Tuần này con thuộc bảng nhân 7, còn hay quên nhớ khi trừ 62 - 38" | 3T: nút chạy, từ 10 phiếu mỗi tháng. 6T: trang chủ có phần gộp "Con giỏi / cần luyện / tiến bộ 4 tuần", 60% gia đình mở mỗi tháng. 12T: thêm gợi ý "tuần này luyện màn nào" | Lượt mở báo cáo ghi vào phiếu; số phiếu mỗi tháng |

### 4.4 Chất lượng và an toàn

| Mã | Mục tiêu và chỉ số | Ngưỡng theo mốc | Cách đo |
|---|---|---|---|
| M9 | Không mất tiến trình sau cập nhật; tỉ lệ gia đình đã "Thêm vào Màn hình chính" | Mọi mốc: 0 lần mất; mỗi lần tăng `CACHE` trong `sw.js` kèm kiểm thử di trú. 6T: 80% đã cài | Kiểm thử tự động (hiện 228/228); khảo sát quý |
| M10 | Đúng toán, đúng SGK: chia viết bằng dấu hai chấm (42 : 7, không phải 42 ÷ 7); lớp 2 giữ thứ tự bảng (2 × 7, không đảo); sinh 10 000 câu mỗi màn không có đáp án sai hay nhiễu trùng đáp án. Một đợt rà tìm ra từ 3 lỗi kiến thức thì dừng phát hành nội dung mới | Mọi mốc: 0 lỗi kiến thức mở quá 14 ngày. 3T: bảng kiểm SGK bằng văn bản, rà xong 6 game. 6T: mọi màn mới qua bảng kiểm trước phát hành | `node tests/run.js`, kiểm thử sinh đề; giáo viên rà là mong muốn |
| M11 | Chạy tốt máy thật, riêng tư kiểm chứng được | Mọi mốc: 0 host ngoài trừ fonts.googleapis.com và fonts.gstatic.com. 3T: test e2e đếm host mỗi phát hành; trang cam kết riêng tư có cách xóa dữ liệu. 6T: hai game nặng (Xe Tăng Thời Gian 2,4 MB, Cưỡi Hổ Vượt Lửa 2,3 MB) còn không quá 1,2 MB, bốn game kia dưới 0,7 MB; thử 1 iPad Safari và 1 Android mỗi phát hành. 12T: tải lần đầu dưới 3 giây trên 4G | Bảng kiểm phát hành; `du -sk` |

### 4.5 Vận hành

| Mã | Mục tiêu và chỉ số | Ngưỡng theo mốc | Cách đo |
|---|---|---|---|
| M12 | Nền đo lường không cần server: (1) tách `h` (đúng nhờ gợi ý) khỏi `c` trong `byTopic` cả 6 game; (2) nhật ký ván `history[]` tối đa 300 mục (thời điểm, game, màn, đúng, sai, gợi ý, giây trung vị chỉ để gắn cờ đoán mò, bỏ dở, câu ôn lại, mã lỗi); (3) bảng ánh xạ màn sang mã (`a3` sang 2.8 và 2.9, `d4` sang 3.16, Tháp màn 5 sang B3.17); (4) phiếu kết quả; (5) script trong `scripts/` in đủ M1 đến M8 từ một phiếu, kèm sổ tay đo lường | (1) hạn 2026-10-31. 3T: (2), (3), (4) trong cả 6 game, trang chủ vẫn chỉ đọc. 6T: (5) | Script chạy trên phiếu thật; kiểm thử di trú |
| M13 | Bền vững một người | Mọi mốc: không quá 6 giờ mỗi tuần; không quá 1 triệu đồng mỗi năm; mỗi tháng 1 phát hành có ghi chú kiểm chứng như `docs/game-refresh-2026-09-06.md`. 6T: người ngoài dựng và phát hành thử trong 1 giờ theo README | Sổ giờ; lịch sử commit |

## 5. Kỳ vọng của từng bên

| Bên | Cam kết (phải giữ) | Mong muốn (không hứa) |
|---|---|---|
| Bé | Mở là chơi trong 5 giây, không đăng nhập, không quảng cáo. Sai luôn có cách nghĩ trước khi lộ đáp án (7 × 8: lấy 7 × 7 rồi cộng 7), lời mách luôn có chữ, không bị chê. Sao và kỷ lục không mất vì cập nhật | Game mới mỗi quý; nhân vật đẹp như hổ và xe tăng |
| Phụ huynh | Biết con thích gì, giỏi gì, vướng gì trong 2 phút, bằng tiếng Việt thường. Dữ liệu chỉ ở máy nhà, không gửi đi đâu nếu không tự bấm "Sao chép kết quả". Xóa tiến trình qua cổng phụ huynh | Gợi ý tuần này luyện gì; phiếu in |
| Giáo viên | Viết và đọc như SGK (14 : 2, "8 giờ kém 15 phút"); mở khóa mọi màn để dùng trên lớp | Phiếu in kèm mã QR |
| Người làm sản phẩm | Không quá 6 giờ mỗi tuần; mỗi thay đổi có kiểm thử, số liệu và mã M nó phục vụ; được dừng mở rộng khi số liệu nói không | Người góp sức |

## 6. Không phải mục tiêu và ranh giới phạm vi

- Không tài khoản, không đồng bộ giữa các máy, không server trong 12 tháng; từ 30% gia đình dùng 2 máy và than mất tiến trình thì mở ADR về xuất nhập dữ liệu bằng mã QR hoặc tệp.
- Không quảng cáo, không thu phí, không thu thư điện tử, không thu thập gì ngoài tên và hình đại diện bé tự chọn.
- Không thông báo đẩy, không đổi huy hiệu lấy quà thật, không xếp hạng khác máy, không hiện kết quả bé này cho bé khác: bé quay lại phải vì trò chơi.
- Không chatbot, không lời giải sinh tự động (mọi lời mách viết tay, rà theo SGK); không chấm điểm thay nhà trường, không ván nào gọi là "kiểm tra" với bé.
- Không phủ đủ 93 nội dung (32 nội dung có game tốt hơn 93 nội dung có game xoàng); mạch Thực hành (D2.1, D3.1) làm bằng phiếu in; không bảng điều khiển cả lớp, không LMS, không ứng dụng gốc, PWA "Thêm vào Màn hình chính" là đủ.
- Không mở sang lớp 4, 5 hay tiếng Anh trước ngưỡng 12T; màn lớp 1 trong Ninja (a1, a2) giữ nguyên; không thay thầy cô và SGK, chỉ dạy bài mới ở mức bài học ngắn như Tháp Đồng Hồ.

**Không đổi dù kết quả thế nào:** không tài khoản, không quảng cáo, không gửi dữ liệu ra ngoài. Không đạt north star trong ranh giới đó thì làm khác đi bên trong ranh giới, không nới ranh giới.

## 7. Giả định và rủi ro lớn nhất, cách kiểm chứng sớm

| Giả định hoặc rủi ro | Nếu sai | Kiểm chứng sớm và hạn |
|---|---|---|
| Huy hiệu Đã thuộc tính cả câu gợi ý | Số nền bị thổi phồng; "Đã thuộc" giả | Tách `h` khỏi `c` ở cả 6 game; 2026-10-31 |
| localStorage đủ bền | Safari xóa dữ liệu trang không mở 7 ngày (trừ khi đã cài lên màn hình chính) | iPad thật: chơi, để 8 ngày, mở lại, so có cài và không cài; nếu mất, nhắc cài ở lần mở thứ 2; 2026-10-31 |
| Bé vui nhưng không học, chỉ chém quả may rủi (4 quả thì đoán đúng 25%) | Báo cáo lừa phụ huynh | So tỉ lệ đúng không gợi ý với 25%; gắn cờ ván giây trung vị dưới 1 giây; hỏi miệng 5 bé 10 phép tính; 2026-11-15 và quý 1/2027 |
| Đúng SGK làm phụ huynh và giáo viên tin | Một lỗi ký hiệu (42 ÷ 7, đảo 2 × 7 ở lớp 2) đủ để mất tin | Bảng kiểm SGK bằng văn bản, tự rà 6 game, mời giáo viên rà lại nếu có; 2026-11-30 |
| Phụ huynh chịu gửi phiếu hằng tháng | Mọi mục tiêu chỉ là cảm giác | Tháng 12/2026 mời 15 gia đình, cần 10 gửi; dưới 6 thì rút phiếu còn một dòng, một nút. Kênh phụ: quan sát trực tiếp 5 bé mỗi quý |
| Máy dùng chung, bé chọn nhầm hồ sơ anh chị | Báo cáo sai bé | Nhắc "Con là ai?" khi mở game sau 12 giờ; 2026-12-10 |
| Một người làm được một nội dung mỗi 4 đến 6 tuần trong 6 giờ mỗi tuần | Cạn sức, bản đồ không bao giờ đầy | Sổ giờ hằng tuần; đo thời gian thật 3 nội dung đầu, quá 6 tuần thì hạ M3; 2027-01-31 |

## 8. Tiêu chí thành công và đổi hướng

**3T, bắt buộc:** M12 (1) đến (4) chạy trong cả 6 game; M9 bằng 0; bảng kiểm SGK xong; nhóm quan sát từ 10 bé có gửi phiếu. Chưa có phiếu nào thì dừng làm game mới cho tới khi có.

**6T, đạt khi:** M1 từ 40%; M5 thoát dưới 10%; M7 từ 7/10; M8 có báo cáo gộp; M11 hai game nặng đã giảm dung lượng. Không đạt M1 nhưng đạt M4 và M7: giữ hướng, chỉnh ôn lại. Không đạt cả M1 lẫn M4: đổi hướng.

**Thành công (12T)** khi đồng thời: nhóm quan sát từ 30 bé; 3 tháng liên tiếp từ 50% bé tiến bộ có bằng chứng (M1); 8/10 phụ huynh đọc hiểu (M7); 32 nội dung có game (M3); 0 lần mất tiến trình (M9); bảo trì không quá 6 giờ mỗi tuần (M13). Khi đó mới cân nhắc ADR về lớp 4 hoặc đồng bộ giữa các máy.

**Đổi hướng khi:**

- (a) Sau 6T nhóm quan sát dưới 8 bé dù đã mời qua 2 lớp và 2 nhóm phụ huynh: dừng mở rộng, giữ trang cho gia đình và bạn bè.
- (b) M4 dưới 30% hoặc 70% thiết bị ngừng chơi sau tuần 2: vấn đề là động lực; dừng M3, dành 6 tuần sửa vòng chơi lõi (độ khó, thưởng, nhịp) cùng 5 bé quan sát trực tiếp. Không biến game thành phần thưởng sau bài luyện.
- (c) Tỉ lệ đúng không gợi ý gần 25% hoặc giây trung vị dưới 1 giây ở từ 30% ván: bé đang đoán; bắt buộc nhập đáp án như Vệ Binh ở các màn có nhớ.
- (d) M7 dưới 5/10 sau hai lần thiết kế lại: cách kể sai, không phải thiếu dữ liệu; rút báo cáo còn 3 dòng (thuộc, cần luyện, sai nhiều nhất), bỏ biểu đồ.

**Dừng khi** người bảo trì vượt 10 giờ mỗi tuần trong 2 tháng liền, hoặc mất dữ liệu lặp lại lần thứ 2 chưa rõ nguyên nhân: đóng băng tính năng mới, chỉ sửa lỗi và giữ trang chạy tới khi có người thứ hai.

## 9. Cách dùng tài liệu này

**Ai đọc.** Người bảo trì đọc trước khi mở bất kỳ spec hay ADR nào; người review đóng vai nhân vật trong `02-nhan-vat-ao.md` dùng mục 3, 5 và 6 làm thước; giáo viên góp nội dung đọc mục 2.1, M3 và M10. Phụ huynh đọc trang cam kết riêng tư (M11) và báo cáo (M8), không đọc tài liệu này.

**Mọi spec và ADR trỏ về mã M** ở dòng "Mục tiêu phục vụ" (`templates/mau-spec.md`) hoặc "Mục tiêu liên quan" (`templates/mau-adr.md`): spec nhật ký ván ghi M12, M5; spec game tiền Việt Nam ghi M3, M1, M10; spec báo cáo gộp ghi M8, M7. Việc không trỏ về mã nào thì không làm; hai việc tranh giờ thì thứ tự ưu tiên ở đầu mục 4 quyết định.

**Khi nào cập nhật.** Ba lần review vào 2026-12-10, 2027-03-10, 2027-09-10; mỗi lần ghi một ADR nêu số thực đo so với ngưỡng ở mục 4 và quyết định theo mục 8. Đổi ngưỡng hay định nghĩa giữa hai kỳ phải qua ADR. Không đánh số lại mã M: mục tiêu bị bỏ thì ghi "đã bỏ, xem ADR-XXXX" và giữ chỗ để tham chiếu cũ không gãy.
