# Mục tiêu và kỳ vọng của dự án (bản nháp A: kết quả học tập là trên hết)

| | |
|---|---|
| Tình trạng | Bản nháp |
| Ngày | 2026-09-10 |
| Chủ sở hữu | 3hoa |
| Liên quan | `docs/du-an-toan-2-3/ban-do-toan-2-3.md`, `docs/du-an-toan-2-3/templates/mau-spec.md`, `docs/du-an-toan-2-3/templates/mau-adr.md`, `docs/game-refresh-2026-09-06.md` |

Sau review, bản này trở thành `docs/du-an-toan-2-3/01-muc-tieu-va-ky-vong.md`. Mã M1 đến M12 ở mục 4 là mã mà spec và ADR trích dẫn ở dòng "Mục tiêu phục vụ".

## 1. Tuyên bố mục đích

Dự án làm ra và duy trì bộ trò chơi web trên 3hoa.com để một bé lớp 2 hoặc lớp 3 luyện các yêu cầu cần đạt của môn Toán (Chương trình GDPT 2018) tới mức thành thạo đo được: làm đúng, làm nhanh và còn nhớ sau nhiều tuần. Trò chơi là phương tiện, kết quả là bé làm được phép tính mà trước đó chưa làm được: nhẩm 8 + 7 = 15 trong 3 giây thay vì đếm ngón tay, tính 36 + 27 = 63 mà không quên nhớ 1, đọc đúng 42 : 7 = 6 vì nhớ 7 × 6 = 42. Mọi hoạt động khi chơi được ghi ngay trên thiết bị của gia đình để phụ huynh nhìn vào là biết bé thích gì, giỏi gì, chưa biết gì và tiến bộ ra sao. Sản phẩm miễn phí, không tài khoản, không gửi dữ liệu ra ngoài, chạy trên iPad và điện thoại có sẵn ở nhà. Mọi spec, ADR và quyết định ưu tiên phải chỉ ra được nó phục vụ mục tiêu nào ở mục 4.

## 2. Vấn đề đang giải quyết

### 2.1 Cho bé

- Lớp 2 có 44 nội dung, lớp 3 có 49 nội dung (theo bản đồ). Nhiều nội dung chỉ đạt khi lặp tới mức tự động: bảng cộng trừ qua 10 (2.8, 2.9), bảng nhân chia 2 và 5 (2.20, 2.22), bảng 3, 4, 6, 7, 8, 9 (3.12, 3.13). Vở bài tập mỗi bảng chỉ có vài chục câu, và bé chán sau khoảng 10 phút.
- Lỗi lặp lại và có tên: quên nhớ 1 (36 + 27 = 53), nhầm ô bảng nhân (6 × 7 = 48), trừ thay vì chia (42 : 7 = 35), nhầm giờ kém (7 giờ 45 phút đọc thành 8 giờ 45 phút). Ninja Toán Học và Vệ Binh Cửu Chương đã gọi tên các lỗi này khi bé sai (`misconception` trong `math-ninja/js/math.js`) nhưng chưa đếm tần suất.
- Làm vở không có phản hồi ngay, sai một kiểu có thể sai cả trang. Game hiện có cho đáp án và cách nhẩm trong 1,5 giây, dừng quả 3,5 đến 9 giây để bé đọc.

### 2.2 Cho phụ huynh

- Phụ huynh thường chỉ biết bé yếu khi có điểm kiểm tra, và điểm không chỉ ra bé yếu ở nội dung nào trong 93 nội dung.
- Báo cáo 📊 Kết quả trong cả 6 game đã có số ván, tỉ lệ đúng, phút luyện tập, sao, huy hiệu Đã thuộc (từ 90% trên ít nhất 20 câu), dòng Cần luyện thêm (dưới 70% trên ít nhất 5 câu) và danh sách Cần ôn lại. Nhưng nó chưa trả lời được "tiến bộ ra sao" vì dữ liệu đang ghi có năm hạn chế:
  1. `stats` cộng dồn từ ván đầu, chỉ có một dấu thời gian `last`, không có lịch sử theo tuần.
  2. Mỗi game giữ sổ riêng theo màn (`byTopic` với mã `a3`, `t2`, `c5`), chưa gộp theo mã chương trình: màn a3 của Ninja và bảng 2 của Vệ Binh cùng nói về 2.8 và 2.20 nhưng phụ huynh phải tự cộng.
  3. Tỉ lệ đúng tính cả câu có gợi ý: trong Ninja, `onCorrect` tăng `G.correct` cả khi có gợi ý, chỉ kho ôn lại (`noteOk`) loại trừ. Huy hiệu Đã thuộc có thể cấp cho bé chủ yếu bấm 💡.
  4. Không ghi thời gian trả lời từng câu, nên không phân biệt được "biết" với "nhẩm nhanh".
  5. Không ghi loại lỗi, nên không nói được bé sai vì quên nhớ hay vì nhầm bảng.

### 2.3 Hiện trạng 6 game so với bản đồ

| Trạng thái | Số nội dung | Nội dung tiêu biểu |
|---|---|---|
| Đã có game | 14 trên 93 (15%) | 2.8 đến 2.12, 2.20, 2.22, B2.11 (lớp 2); 3.7, 3.12 đến 3.14, 3.16, B3.17 (lớp 3) |
| Một phần | 10 trên 93 | 2.13 nhẩm số tròn, 2.15 và 3.11 tìm thành phần chưa biết, 3.17 chia số ba chữ số, B3.18 thời gian trôi qua |
| Chưa có | 69 trên 93 (74%) | Toàn bộ bài toán có lời văn (2.18, 2.26, 3.24, 3.25), chia có dư (3.18), hình học, đo lường, tiền, lịch, thống kê |

Cả 14 nội dung đã có đều thuộc hai mảng: phép tính (Ninja, Vệ Binh) và xem đồng hồ (4 game). Thế mạnh sẵn có là ôn lại thông minh (câu sai quay lại chiếm khoảng 1/4 số câu cho tới khi đúng 2 lần) và hồ sơ nhiều bé dùng chung `3hoa-players-v1`.

## 3. Mục tiêu cuối cùng (north star)

**Sau 8 tuần chơi đều (ít nhất 3 buổi mỗi tuần, mỗi buổi 10 đến 15 phút), một bé lớp 2 hoặc lớp 3 làm đúng và nhanh ít nhất 3 nội dung chương trình mà ở tuần đầu bé còn sai hoặc còn phải đếm, và phụ huynh chỉ cần đọc báo cáo trên máy là nói đúng được bé giỏi gì, chưa biết gì.**

Định nghĩa dùng xuyên suốt:

- **Chưa biết** một nội dung: ván kiểm tra đầu vào 10 câu không gợi ý đúng từ 5 câu trở xuống, hoặc `byTopic` dưới 50% trên ít nhất 10 câu.
- **Thành thạo** một nội dung: trong 14 ngày gần nhất có ít nhất 20 câu không gợi ý, đúng từ 90%, thời gian trả lời trung vị dưới ngưỡng nhanh, và kho ôn lại của nội dung đó trống. Ngưỡng nhanh: cộng trừ trong 20: 3 giây; bảng nhân chia: 4 giây; cộng trừ có nhớ trong 100: 8 giây; phạm vi 1000: 15 giây; đọc một đồng hồ: 5 giây.
- **Chơi đều**: ít nhất 3 ngày chơi mỗi tuần, tổng từ 30 phút mỗi tuần, trong 4 tuần liên tiếp.

Đã đạt north star khi cả bốn dấu hiệu sau cùng đúng trên nhóm theo dõi (bé có phụ huynh đồng ý gửi dữ liệu xuất từ máy):

1. Từ 60% số bé chơi đều chuyển được ít nhất 3 nội dung từ "chưa biết" sang "thành thạo" trong 8 tuần.
2. Sau 4 tuần không luyện nội dung đó, ván kiểm tra lại vẫn đúng từ 80% ở từ 70% số bé.
3. Từ 8 trên 10 phụ huynh nêu đúng 2 điểm mạnh và 2 điểm yếu của bé khớp với dữ liệu, sau 2 phút đọc báo cáo.
4. Từ 50% số bé vẫn chơi đều ở tuần thứ 8 mà không cần phụ huynh ép.

## 4. Bộ mục tiêu chi tiết

### 4.1 Phát biểu, chỉ số, ngưỡng và cách đo

| Mã | Phát biểu | Chỉ số và ngưỡng đạt | Cách đo |
|---|---|---|---|
| **A. Học tập** | | | |
| M1 | Bé chuyển nội dung từ chưa biết sang thành thạo | Từ 60% bé chơi đều đạt thành thạo ít nhất 3 nội dung sau 8 tuần; lớp 2 nhắm 2.8, 2.9, 2.11, B2.11; lớp 3 nhắm 3.12, 3.13, 3.14, 3.16, B3.17 | `baseline[topic]` từ ván kiểm tra đầu vào; `byTopic` tách câu có gợi ý; lịch sử theo ván có thời gian trả lời trung vị |
| M2 | Bé giữ được sau khi ngừng luyện | Từ 70% bé đã thành thạo còn đúng từ 80% ở ván kiểm tra lại sau 4 tuần | Lịch sử theo ván; kho `missed` không phát sinh mục mới |
| M3 | Lỗi có tên giảm dần | Tần suất mỗi loại lỗi ở tuần 8 giảm từ 50% so với tuần 1 trên cùng nội dung | Ghi mã lỗi từ `misconception` vào `byTopic[topic].err` |
| M4 | Độ phủ chương trình tăng theo ưu tiên | "Đã có game": 14 lên 24, 40, 60; ưu tiên Số và phép tính lớp 2 và 3, rồi bài toán có lời văn, đo lường, hình học | Cột trạng thái trong bản đồ; chỉ tính "đã có" khi có màn dạy, có ôn lại và có mã chương trình gắn vào dữ liệu |
| **B. Trải nghiệm chơi** | | | |
| M5 | Bé tự muốn quay lại | Từ 50% bé trong nhóm theo dõi chơi đều 4 tuần liên tiếp; buổi chơi trung vị 8 đến 15 phút | Lịch sử theo ván; hỏi phụ huynh "ai đề nghị chơi, bé hay người lớn" |
| M6 | Vui mà không ức chế | Ván thua (hết tim, tháp đổ) tối đa 30%; sau khi thua, từ 60% chơi lại trong 2 phút; câu dùng gợi ý tối đa 25%; bé nói "muốn chơi nữa" ở từ 8 trên 10 phiên quan sát | Ghi kết quả ván và số câu gợi ý; quan sát 10 bé mỗi quý |
| **C. Thấu hiểu cho phụ huynh** | | | |
| M7 | Báo cáo trả lời được 4 câu: thích gì, giỏi gì, chưa biết gì, tiến bộ ra sao | Từ 8 trên 10 phụ huynh nêu đúng 2 điểm mạnh và 2 điểm yếu sau 2 phút đọc, gọi được tên nội dung ("còn yếu cộng có nhớ trong 100") | Phỏng vấn có đối chiếu dữ liệu xuất từ máy |
| M8 | Một báo cáo gộp cả 6 game theo mã chương trình, có mốc tuần | Từ 40% thiết bị đang hoạt động mở báo cáo ít nhất 1 lần mỗi tuần; hiện đường tiến bộ 8 tuần cho từng nội dung | Đếm lượt mở báo cáo trong localStorage; bảng ánh xạ màn sang mã chương trình |
| **D. Chất lượng và an toàn** | | | |
| M9 | Đúng toán, đúng cách viết SGK | 0 lỗi nội dung toán tồn quá 7 ngày; sinh 10 000 câu mỗi màn không có đáp án sai hay nhiễu trùng đáp án đúng; phép chia luôn viết bằng dấu hai chấm; kiểm thử tự động đạt 100% trước mỗi phát hành (hiện 228 trên 228) | `node tests/run.js`, kiểm thử sinh đề hàng loạt, sổ lỗi nội dung |
| M10 | An toàn, riêng tư, tiếp cận được | 0 yêu cầu mạng ngoài trừ Google Fonts; xóa dữ liệu chỉ sau cổng phụ huynh; chạy trên iPad Safari, iPhone và Android Chrome; vùng bấm từ 44 px; tôn trọng giảm chuyển động | Kiểm tra bảng mạng và 4 thiết bị thật mỗi phát hành |
| **E. Vận hành** | | | |
| M11 | Nhịp phát hành đều, không hồi quy | Mỗi tháng ít nhất 1 nội dung mới hoặc 1 cải tiến đo lường; mỗi phát hành tăng `CACHE` và có ghi chú kiểm chứng như `docs/game-refresh-2026-09-06.md`; lỗi hồi quy sửa trong 7 ngày | Nhật ký phát hành trong `docs/` |
| M12 | Bền vững với chi phí gần 0, có vòng phản hồi thật | Hạ tầng 0 đồng ngoài tên miền; tải lần đầu dưới 3 giây trên 4G, mỗi game dưới 2 MB; chơi ngoại tuyến sau lần mở đầu; mỗi quý 10 phiên quan sát bé và 10 phỏng vấn phụ huynh | GitHub Pages, Lighthouse trên máy thật, sổ phỏng vấn |

### 4.2 Mốc thời gian (tính từ 2026-09-10)

| Mã | 3 tháng (2026-12-10) | 6 tháng (2027-03-10) | 12 tháng (2027-09-10) |
|---|---|---|---|
| M1 | Có ván kiểm tra đầu vào và lịch sử theo ván; nhóm theo dõi 10 bé, đo trước và sau 8 tuần lần đầu | 30 bé; từ 40% đạt 3 nội dung | 100 bé; từ 60% |
| M2 | Có ván kiểm tra lại tự động sau 4 tuần | Từ 50% giữ được | Từ 70% |
| M3 | Ghi mã lỗi ở Ninja và Vệ Binh | Báo cáo hiện loại lỗi; giảm 30% | Giảm 50% |
| M4 | 24 nội dung (thêm 2.13, 2.14, 2.15, 2.16, 2.19, 2.21, 2.24, 3.11, 3.18, 3.19) | 40, có bài toán có lời văn một bước | 60 |
| M5 | Đo được nhịp chơi; từ 30% chơi đều | Từ 40% | Từ 50% |
| M6 | Ghi số câu gợi ý và kết quả ván | Đạt ngưỡng gợi ý 25% | Đạt cả 4 ngưỡng |
| M7 | Phỏng vấn 10 phụ huynh với báo cáo hiện có làm mốc đối chiếu | 6 trên 10 | 8 trên 10 |
| M8 | Ánh xạ màn sang mã chương trình xong cho 6 game | Báo cáo gộp phát hành; 25% mở hằng tuần | 40% |
| M9 | Kiểm thử sinh đề 10 000 câu cho 14 nội dung đã có | Áp dụng cho mọi nội dung mới | Duy trì |
| M10 | Kiểm tra mạng và thiết bị thật thành bước bắt buộc | Duy trì | Duy trì |
| M11 | 3 phát hành | 6 phát hành | 12 phát hành |
| M12 | Lighthouse trên iPad và Android; đợt quan sát đầu tiên | Đợt 2 | Đợt 4 |

### 4.3 Dữ liệu cần bổ sung để đo được (sẽ có spec riêng)

1. Lịch sử theo ván `players[<id>].history[]`: `{ t, game, topic, c, w, h, ms }` với `h` là số câu có gợi ý, `ms` là thời gian trả lời trung vị; giữ tối đa 300 ván gần nhất.
2. Tách `h` (đúng nhờ gợi ý) khỏi `c` trong `byTopic` của cả 6 game.
3. Mã lỗi khi sai, đếm theo nội dung.
4. Ván kiểm tra đầu vào 10 câu, không gợi ý, không tính điểm, lưu `baseline[topic]`; ván kiểm tra lại được nhắc sau 4 tuần.
5. Bảng ánh xạ màn sang mã chương trình dùng chung (`a3` sang 2.8 và 2.9, `d4` sang 3.16, Tháp màn 5 sang B3.17).
6. Nút sao chép dữ liệu JSON sau cổng phụ huynh, để nhóm theo dõi gửi số liệu mà dự án không cần máy chủ.

## 5. Kỳ vọng của từng bên

| Bên | Cam kết (dự án phải làm được) | Mong muốn (cố gắng, không hứa) |
|---|---|---|
| Bé | Chơi ngay không cần đăng nhập; câu sai được chỉ cách làm trong vài giây và gặp lại cho tới khi làm được; không bị phạt vì thua; chọn tên một lần dùng cho mọi game | Nhân vật và cốt truyện nối giữa các game; phần thưởng sưu tầm; giọng đọc hay hơn giọng máy |
| Phụ huynh | Biết bé giỏi gì, chưa biết gì theo đúng tên nội dung chương trình; thấy tiến bộ theo tuần; xóa được dữ liệu; không quảng cáo, không thu thập dữ liệu; chạy trên máy đang có | Phiếu in hoạt động ngoài màn hình cho phần Thực hành và trải nghiệm; gợi ý "tuần này nên luyện gì" |
| Giáo viên | Nội dung bám yêu cầu cần đạt, viết và đọc như SGK (42 : 7, "8 giờ kém 15 phút"); có nút mở khóa mọi màn để dùng trên lớp | Chế độ cả lớp chơi trên máy chiếu; bảng tổng hợp nhiều bé (ngoài phạm vi, xem mục 6) |
| Người làm sản phẩm | Mọi tính năng mới nêu mã mục tiêu M nó phục vụ; có kiểm thử và ghi chú kiểm chứng; số liệu quyết định thay cho cảm giác | Kiểm thử tự động trên thiết bị thật; bộ sinh đề dùng chung cho 6 game |

## 6. Không phải mục tiêu và ranh giới phạm vi

- Không thay thế sách giáo khoa hay giáo viên; game luyện và củng cố, không dạy khái niệm mới nếu chưa có bài học ngắn kèm theo.
- Không phủ hết 93 nội dung trong 12 tháng; mốc là 60. Hình học vẽ bằng compa, ê ke và phần Thực hành và trải nghiệm (D2.1, D3.1) chỉ hỗ trợ bằng phiếu in.
- Không tài khoản, máy chủ, đồng bộ nhiều thiết bị, bảng xếp hạng chung. Dữ liệu ở trên máy; chia sẻ chỉ qua nút sao chép JSON hoặc ảnh chụp báo cáo.
- Không quảng cáo, không mua trong ứng dụng, không thu phí.
- Không mở rộng sang lớp 4 trở lên hay môn khác; màn lớp 1 hiện có được giữ nhưng không phát triển thêm.
- Không chấm điểm thay nhà trường; báo cáo để phụ huynh hiểu bé, không phải bằng chứng học lực.
- Không có tính năng mạng xã hội, trò chuyện hay nội dung do người dùng tạo.

## 7. Giả định và rủi ro lớn nhất, cách kiểm chứng sớm

| Giả định hoặc rủi ro | Nếu sai thì | Kiểm chứng sớm và hạn |
|---|---|---|
| Chơi 30 đến 45 phút mỗi tuần là đủ để tự động hóa bảng cộng qua 10 hoặc một bảng nhân | North star không đạt dù bé chơi đều; phải tăng thời lượng hoặc đổi cơ chế | 10 bé, 4 tuần, đo trước và sau bằng ván kiểm tra 10 câu và bài giấy 10 câu; hạn 2026-11-15 |
| Rủi ro lớn nhất: bé vui nhưng không học, chỉ chém quả may rủi (4 quả thì đoán mò đúng 25%) | Tỉ lệ đúng cao giả; báo cáo lừa phụ huynh | So tỉ lệ đúng không gợi ý với 25%; ghi thời gian trả lời (đoán mò thường dưới 1 giây); đối chiếu bài giấy; hạn 2026-11-15 |
| Dữ liệu hiện tại không có mốc thời gian | Mọi mục tiêu nhóm A và C không đo được | Ưu tiên số 1 của 3 tháng đầu: lịch sử theo ván và ván kiểm tra đầu vào; hạn 2026-12-10 |
| Huy hiệu Đã thuộc đang tính cả câu gợi ý | Phụ huynh tin bé đã thuộc trong khi bé chỉ biết bấm 💡 | Tách `h` khỏi `c` ở cả 6 game; hạn 2026-10-31 |
| Phụ huynh muốn xem báo cáo | Nhóm C không có người dùng; dồn sức vào nhóm A và B | Phỏng vấn 10 phụ huynh với báo cáo hiện có, hỏi họ mở 📊 mấy lần trong tháng qua; hạn 2026-10-15 |
| localStorage bền trên iPad: Safari có thể xóa bộ nhớ của trang web không được mở trong 7 ngày (ứng dụng đã thêm vào Màn hình chính thường không bị) | Mất tiến trình và mất luôn dữ liệu đo | Thử trên iPad thật: mở game, để 8 ngày, mở lại; nếu mất thì hướng dẫn thêm vào Màn hình chính ngay lần đầu; hạn 2026-10-31 |
| Máy dùng chung, bé chọn nhầm hồ sơ của anh chị | Dữ liệu nhiễu, báo cáo sai bé | Nhắc "Con là ai?" khi mở game sau 12 giờ; hỏi phụ huynh khi phỏng vấn; hạn 2026-12-10 |
| Máy không có giọng tiếng Việt (nhiều Android, Windows) | Bé không nghe được cách nhẩm, hiệu quả học giảm | Thống kê thiết bị của nhóm theo dõi; nếu trên 30% không có giọng thì ưu tiên lời giải bằng chữ to và hình; hạn 2026-11-30 |

## 8. Tiêu chí quyết định

**Coi là thành công** khi tại mốc 6 tháng (2027-03-10), trên nhóm theo dõi từ 30 bé, cả ba điều sau đúng: từ 40% bé chơi đều đạt thành thạo 3 nội dung (M1), từ 6 trên 10 phụ huynh nêu đúng điểm mạnh và điểm yếu (M7), và độ phủ đạt 40 nội dung (M4). Khi đó tiếp tục lộ trình 12 tháng và giữ định hướng "game là phương tiện, thành thạo là kết quả".

**Phải đổi hướng** nếu tại mốc 3 tháng (2026-12-10) gặp một trong các dấu hiệu sau, dù đã có dữ liệu đo:

1. Dưới 30% bé chơi đều cải thiện được dù chỉ một nội dung (từ chưa biết lên trên 80%): cơ chế lặp hiện tại không đủ; chuyển sang bài luyện ngắn có cấu trúc (10 câu, tăng dần) và dùng game làm phần thưởng sau khi luyện.
2. Tỉ lệ đúng không gợi ý gần 25% hoặc thời gian trả lời trung vị dưới 1 giây ở từ 30% ván: bé đang đoán; bắt buộc nhập đáp án như Vệ Binh thay vì chém quả ở các màn có nhớ.
3. Từ 70% thiết bị ngừng chơi sau tuần thứ 2: vấn đề là động lực, không phải nội dung; dừng mở rộng độ phủ (M4) và dồn sức cho M5, M6 trong 3 tháng kế tiếp.
4. Dưới 3 trên 10 phụ huynh từng mở báo cáo và không muốn mở: thu hẹp nhóm C thành một dòng tóm tắt gửi qua Zalo mỗi tuần, không xây báo cáo gộp lớn.

Người quyết định là chủ sở hữu 3hoa, họp review vào 2026-12-10 và 2027-03-10; mỗi lần review ghi thành một ADR theo `templates/mau-adr.md`, nêu số liệu thực đo so với ngưỡng ở mục 4.
