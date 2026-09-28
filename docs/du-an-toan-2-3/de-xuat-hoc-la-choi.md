# Đề xuất cải tiến Đảo Khủng Long: phần toán phải là phần chơi

> Tình trạng: Đề xuất | Ngày: 2026-09-28 | Chủ sở hữu: 3hoa | Mục tiêu phục vụ: M4, M5, M6, M1, M3 | Liên quan: `01-muc-tieu-va-ky-vong.md`, `02-nhan-vat-ao.md`, `ban-do-toan-2-3.md`, `templates/mau-thiet-ke-game.md`, `dao-khung-long/README.md`, [post của Yu-kai Chou](https://x.com/yukaichou/status/2104408042775138668)

## Tóm tắt

Yu-kai Chou (tác giả khung động lực Octalysis) xếp hạng 10 game học mà trẻ "nài được chơi" và rút ra một ý: trẻ quay lại khi chính hoạt động học là phần vui, không phải khi toán là cổng kiểm tra chắn trước phần vui. Các nghiên cứu có đối chứng ở mục 1.4 cũng nói như vậy.

Đảo Khủng Long đã làm tốt phần "không làm bé sợ": sai không mất gì, lỗi được gọi tên, gợi ý do chính khủng long của bé nói, không quảng cáo. Đảo cũng đã có 6 thể loại mà thao tác chính là phép toán. Nhưng đọc kỹ code thì có ba chỗ hở lớn:

1. **Toán vẫn là cổng, chưa là cách chơi.** 50 trên 80 màn là "chọn 1 trong N đáp án" bọc trong đua xe, lật thẻ, chém quả. Năm nội dung số học ưu tiên của M1 (2.8, 2.9, 2.11, 2.20, 2.22) chỉ được luyện bằng các thể loại đó.
2. **Gần như không có gì thuộc về bé và ở lại.** Nút đặt tên bạn mới ghi "Đưa về Vườn" nhưng không có vườn. Phụ kiện không bao giờ hiện. Tháp và biểu đồ bé dựng bị xóa sau mỗi ván. Quả mọng chỉ là một con số.
3. **Bé bị chấm nhiều hơn được chơi.** Màn kết thúc cho bé 7 tuổi xem khoảng 36 con số và 8 đến 9 điều kiện. Nhãn "Cần giúp" hiện ngay trước mắt bé.

Tài liệu đề xuất 24 việc chia 4 đợt:

- **Đợt 0:** sửa 3 lỗi đang làm mất khoảnh khắc vui và làm sai số đo.
- **Đợt 1:** 8 việc nhỏ.
- **Đợt 2:** sở hữu, bất ngờ và phản hồi.
- **Đợt 3:** thể loại mới mà thao tác chính là phép toán, mở đầu bằng "Tiệc Quả Mọng" cho ý nghĩa phép nhân, phép chia.

Mỗi việc ghi rõ hiện trạng trong code, cách làm, công sức, mục tiêu M và cách đo.

## 1. Bài viết nói gì

Post ngày 28/09/2026 của Yu-kai Chou dẫn tới bài xếp hạng [10 Best Learning Games for Kids (2026)](https://yukaichou.com/gamification-examples/top-ten-learning-games-kids/). Ý chính của post, dịch sát:

> Phần lớn "game giáo dục" vẫn là phiếu bài tập có kinh phí. Con rồng hỏi 7 × 8 bằng mấy, bé chạm 56, pháo giấy rơi, và phần toán chưa lúc nào thấy giống đang chơi. Thiết kế đó coi game là đồ trang trí quanh một bài kiểm tra. Game giữ chân được trẻ thì biến chính hoạt động học thành thứ trẻ muốn làm: trong Prodigy, giải toán là thứ tung phép thuật; trong DragonBox, bé di chuyển thẻ để cô lập chiếc hộp phát sáng và học đại số trước khi ai gọi nó là đại số; trong Minecraft Education, xây chính là bài học, nên không có gì dừng game lại để dạy. Trẻ nài được mở app vì chính phần luyện tập là phần vui, và không phải vượt qua bài kiểm tra mới tới được phần vui.

Post gọi tên hai động lực chính. CD3 (sáng tạo và phản hồi) là cảm giác nước đi tiếp theo của mình thay đổi được những gì trên màn hình. CD4 (sở hữu) là cảm giác pháp sư, hay thế giới mình xây, là của mình.

### 1.1 Mười game và bài học rút ra

| # | Game | Điểm mạnh theo tác giả | Core Drive | Bài học cho Đảo |
|---|---|---|---|---|
| 1 | Minecraft Education | Xây chính là bài học | CD3, CD4, CD5 | Thứ bé làm ra phải ở lại và thuộc về bé |
| 2 | Prodigy Math | Giải toán là tung phép thuật; độ khó tự chỉnh theo từng bé; có chọn phép, chọn chiến thuật | CD2, CD3, CD5, CD7 | Đảo đã có kiểu này ở Đấu Trường; còn thiếu quyền chọn chiêu và độ khó thích nghi |
| 3 | Khan Academy Kids | Miễn phí, không quảng cáo; 5 nhân vật là bạn đồng hành chứ không là thầy; bé tự chọn khám phá gì | CD1, CD2, CD3 | Đã giữ được "không gì cắt ngang"; cần thêm tiếng nói của bạn khủng long và quyền chọn |
| 4 | DragonBox | Luật chơi chính là phép biến đổi đại số; phản hồi là chính câu đố, không cần điểm hay xu | CD2, CD3, CD7 | Hình mẫu quan trọng nhất: thao tác của bé là phép toán |
| 5 | Duolingo | Chuỗi ngày, XP, bảng xếp hạng gia đình | CD2, CD5, CD6, CD8 | Tác giả tự hỏi "sợ mất chuỗi có lành mạnh cho trẻ không". Nên giữ thói quen, bỏ nỗi sợ mất |
| 6 | ABCmouse | Con đường 10 bậc rõ ràng; bé trang trí phòng riêng; quà bất ngờ ở các mốc | CD2, CD4, CD7 | Phòng riêng và quà ở mốc là thứ Đảo chưa có |
| 7 | Code.org | Viết lệnh là thấy chạy ngay: "mình bảo máy làm và máy làm thật" | CD1, CD2, CD3 | Cho bé thấy đáp án của mình "trông ra sao" ngay trên hình |
| 8 | PBS Kids | Trẻ đã yêu nhân vật, tình cảm làm phần việc nặng | CD4, CD5, CD7 | Rex, Mây phải là bạn biết nói, biết nhớ |
| 9 | Osmo | Tay chạm đồ vật thật, màn hình đáp lại; "cái này con làm ra" | CD3, CD4, CD7 | Nối game với đồ vật thật trong nhà |
| 10 | Roblox (giáo dục) | Trẻ chuyển từ chơi game sang làm game | CD3, CD4, CD5 | Cho bé ra đề, làm "cô giáo" đố bố mẹ |

### 1.2 Năm ghi chú chính của tác giả

1. Game học thành công khi trẻ chơi mà không thấy mình đang học. Khi trẻ nhận ra đây là "học" chứ không phải "chơi", động lực sụp.
2. CD3 là thứ game học cần nhất: trẻ cần thấy mình làm được, không bao giờ thấy mình bị kiểm tra. "Làm chủ mới là việc học; bài kiểm tra chỉ là thủ tục giấy tờ."
3. Game tốt dạy kỹ năng mang theo được: nhận ra quy luật, kiên trì, tò mò. Nội dung chỉ là cái cớ để game tồn tại.
4. Ý định giáo dục không bắt buộc phải có mới tạo ra tác động giáo dục; thiết kế game tốt thì bắt buộc.
5. Trẻ nhớ cảm giác học lâu hơn nhớ kiến thức. Thiết kế cho cảm giác, kiến thức sẽ theo sau.

### 1.3 Tám Core Drive của Octalysis

| Mã | Tên | Nghĩa với bé 7 tuổi | Dùng thế nào ở Đảo |
|---|---|---|---|
| CD1 | Ý nghĩa lớn lao | Con đang giúp hòn đảo, giúp các bạn | Dùng |
| CD2 | Phát triển, thành tựu | Con giỏi lên, khủng long lớn lên | Dùng, như thông tin chứ không như điều kiện |
| CD3 | Sáng tạo và phản hồi | Con làm gì thì màn hình đổi theo cái đó | Dùng nhiều nhất |
| CD4 | Sở hữu | Khủng long, khu vườn, tòa tháp là của con | Dùng nhiều, nhấn vào thứ bé tự làm ra |
| CD5 | Kết nối | Bạn khủng long, bố mẹ chơi cùng | Dùng trong nhà, không so với bé khác |
| CD6 | Khan hiếm, nóng lòng | Phải chờ mới có | Tránh |
| CD7 | Bất ngờ, tò mò | Hôm nay có gì lạ? | Dùng nhẹ: chỉ bất ngờ vui, không cờ bạc |
| CD8 | Sợ mất | Mất chuỗi, mất tim | Tránh |

Theo [chính Octalysis](https://yukaichou.com/gamification-study/white-hat-black-hat-gamification-octalysis-framework/), CD1 đến CD3 là "mũ trắng": người chơi thấy mình mạnh, tự chủ. CD6 đến CD8 là "mũ đen": tạo áp lực, dễ thành cảm giác bị điều khiển. Luật loại tính năng ở `01-muc-tieu-va-ky-vong.md` mục 1 ("tính năng khiến bé sợ sai thì bị loại") đã đặt Đảo ở phía mũ trắng.

Octalysis [xếp CD4 vào nhóm động lực "bên ngoài"](https://yukaichou.com/gamification-video-course/beginners-guide-gamification-20-90-left-brain-brain-core-drives-intrinsic-extrinsic/). Sở hữu chỉ thành động lực bền khi thứ được sở hữu là thứ bé tự tạo ra (CD3 cộng CD4), như thế giới Minecraft. Vì vậy các đề xuất bên dưới nhấn vào "thứ bé làm ra", không nhấn vào "sưu tầm đồ".

### 1.4 Nghiên cứu đỡ cho ý chính

Bài của Yu-kai Chou là góc nhìn của một nhà thiết kế, không phải thí nghiệm. Các nghiên cứu sau nói cùng một điều:

| Nghiên cứu | Kết quả | Hệ quả cho Đảo |
|---|---|---|
| [Habgood và Ainsworth (2011)](https://www.tandfonline.com/doi/abs/10.1080/10508406.2010.508029), game Zombie Division, trẻ 7 đến 11 tuổi | Bản "tích hợp nội tại" học được nhiều hơn bản "bên ngoài" trong cùng thời gian. Ở bản nội tại, bé chọn vũ khí là số chia để chia được số trên ngực bộ xương. Ở bản bên ngoài, bé trả lời câu hỏi rồi mới được đánh. Khi được tự chọn, trẻ chơi bản nội tại lâu gấp 7 lần | Toán phải là cách chơi, không phải cổng chắn trước cách chơi. Thước đo đáng tin nhất là thời gian bé **tự chọn** chơi |
| [Deci, Koestner và Ryan (1999)](https://www.researchgate.net/publication/12712628_A_Meta-Analytic_Review_of_Experiments_Examining_the_Effects_of_Extrinsic_Rewards_on_Intrinsic_Motivation), tổng hợp 128 thí nghiệm | Phần thưởng hữu hình, biết trước, kiểu "làm X thì được Y" làm giảm hứng thú tự nguyện. Lời khen mang thông tin về năng lực làm tăng hứng thú | Quả mọng, sao nên là thông tin "con giỏi lên thế nào", không là điều kiện "làm đủ mới được". Lời khen phải nói bé giỏi ở chỗ nào |
| [Cordova và Lepper (1996)](https://eric.ed.gov/?id=EJ540338), 72 học sinh lớp 4 và 5 luyện thứ tự phép tính trên máy | So với bản trình bày trừu tượng, ba cách đều làm tăng rõ hứng thú, độ say mê, lượng học được trong cùng thời gian và cảm giác mình làm được: đặt bài vào một bối cảnh hấp dẫn, cá nhân hóa (tên bé, tên bạn, món bé thích), và cho bé được chọn | Bối cảnh đảo là đúng hướng. Cần thêm cá nhân hóa và quyền chọn (việc 1.3, 1.4) |
| [Walkington và Hayata (2017)](https://link.springer.com/article/10.1007/s11858-017-0842-z), tổng quan về cá nhân hóa trong học toán | Cá nhân hóa chỉ ở bề mặt (thay vài chữ trong đề) cho kết quả không chắc chắn. Lợi ích rõ hơn khi đề nối với trải nghiệm thật của bé, và khi bé có vai trò "sở hữu" (tự chọn, tự tạo bối cảnh) | Đừng chỉ thay tên cho có. Nên dùng chính những bạn khủng long bé đã ấp và đặt tên, và cho bé tự ra đề (việc 3.5) |

Một điểm tinh tế: kiểu Prodigy "đúng thì phép thuật trúng" vẫn là tích hợp **bên ngoài** theo định nghĩa của Habgood, vì câu hỏi bật ra hành động chứ toán không định hình hành động. Đấu Trường của Đảo đã làm đúng kiểu này. Phần Đảo còn thiếu là kiểu DragonBox (thao tác là phép toán) và kiểu Minecraft (thứ bé làm ra thuộc về bé).

## 2. Đảo Khủng Long hôm nay, soi bằng bài viết

Khảo sát ngày 2026-09-28 ở commit `6cb080f` (trùng `main`). Đường dẫn tính từ `dao-khung-long/` nếu không ghi khác. Số dòng có thể lệch khi code đổi.

### 2.1 Những điều Đảo đã làm đúng (giữ nguyên)

| Điều đã đúng | Bằng chứng | Ứng với |
|---|---|---|
| Không quảng cáo, không thu phí, không gì cắt ngang ván | `01-muc-tieu-va-ky-vong.md` mục 6 | Khan Academy Kids |
| Sai không mất gì: không trừ quả mọng, không tim, không thua trong đảo; khi bé sai, trùm làm trò vui | `js/huong-dan.js:425`, `js/dau-truong.js:532-547` | Tránh CD8 |
| Gợi ý do chính khủng long của bé nói. Gợi ý cấp 3 thao tác ngay trên bảng: đặt quả cân, rót nước, khoanh số cho kim phút | `js/khung-choi.js:180-187`, `js/xuong-do-luong.js:727-736`, `js/lat-lich.js:657` | Bạn đồng hành |
| Gọi tên lỗi; câu sai quay lại sau 2 câu; có ôn cách quãng; sửa được câu từng sai được thêm quả mọng | `js/van-choi.js:15-16`, `js/hoc-tap.js:424-430` | Kiên trì là kỹ năng mang theo được |
| 6 thể loại mà thao tác là phép toán, ví dụ 10 khối đơn vị tự gộp thành 1 chục, cân đĩa nghiêng dần, rót nước tới vạch, trả tiền bằng tờ nào cũng được miễn đủ tổng, kéo kim đồng hồ | `js/xep-hinh-so.js:111-122`, `js/xuong-do-luong.js:199-259`, `js/cau-tien.js:325-327`, `js/lat-lich.js:237-251` | DragonBox |
| Đấu Trường: đúng là ra đòn, 3 câu đúng liền là tuyệt chiêu | `js/dau-truong.js:459-501` | Prodigy |
| Cùng một kỹ năng được luyện bằng thể loại khác nhau qua các ngày | `js/dao.js` (`lichSuTheLoai`, `lapNhiemVu`) | Chống nhàm |
| Bé đặt tên bạn khủng long mới nở | `js/app.js:953-966` | Hạt giống của CD4 |

### 2.2 Chấm theo 8 Core Drive

| Core Drive | Đang có | Còn thiếu | Mức |
|---|---|---|---|
| CD1 Ý nghĩa | Lời mở đầu "Đây là hòn đảo của con. Con giải toán để nuôi Rex lớn lên." (`js/huong-dan.js:296-302`) | Không có câu chuyện hay lý do lớn hơn việc cho Rex ăn | Yếu |
| CD2 Thành tựu | Quả mọng, 7 mức lớn, sao, cúp, trứng vùng, 5 mức thành thạo, nhiệm vụ | Màn kết thúc quá tải (mục 2.4). Giữa các mức lớn là khoảng lặng dài: Nhí cần 500 quả mọng, Thiếu niên cần 1 200 quả mọng và 3 kỹ năng Đã thuộc | Mạnh nhưng nặng thủ tục |
| CD3 Sáng tạo, phản hồi | 30 màn có thao tác thật (mục 2.3) | 50 màn chọn đáp án. Không được chọn chiêu. Không có hoạt động mở nào: mọi câu chỉ có một đáp án. Đáp án sai chỉ được gọi tên bằng chữ, không vẽ ra. Mức thành thạo không đổi câu được sinh (`js/van-choi.js:30`) | Vừa |
| CD4 Sở hữu | Chọn trứng, đặt tên bạn mới | Không có vườn dù nút ghi "Đưa về Vườn" (`js/app.js:955`). Phụ kiện không hiện: `p.phu_kien` không được đọc ở đâu, cũng không có hình phụ kiện. Tháp, biểu đồ bị xóa sau ván (`js/xep-hinh-so.js:52`, `js/cau-ca.js:861-865`). Quả mọng không dùng vào việc gì. Tên Rex, Mây cố định (`js/ho-so.js:96`) | Yếu |
| CD5 Kết nối | Mỏ Vịt Long biết nói (`js/cho-khung-long.js:150-161`); trùm biết đùa; khủng long nói gợi ý | Rex, Mây không có tính cách, không giọng riêng, không nhớ bé. Tên nhân vật truyện tranh lấy ngẫu nhiên (`js/ngan-hang.js:1209, 1270-1273`). Không có gì để chơi cùng bố mẹ | Yếu |
| CD6 Khan hiếm | Chỉ có giới hạn giờ do phụ huynh đặt, không phải cơ chế game | Không cần thêm | Đúng mức |
| CD7 Bất ngờ | Bóng bạn khủng long nấp sau trứng vùng; thể loại đổi theo ngày | Không có gì ngẫu nhiên trong thưởng. Bốn kiểu ăn mừng chung một tiếng nhạc (`js/app.js:958`). Nội dung mới có thể đứng yên vì bài đang học không tự tăng (việc 0.2) | Yếu |
| CD8 Sợ mất | Không trừ, không thua, không tim | Đúng hướng, không cần thêm | Tốt, vì vắng đúng chỗ |

### 2.3 Toán nằm ở đâu trong từng thể loại

| Thể loại | Số màn | Thao tác của bé có phải là phép toán? |
|---|---|---|
| Xếp Hình Số | 3 | Có. Khối bé thả chính là số; 10 đơn vị tự gộp thành 1 chục |
| Xưởng Đo Lường | 6 | Một phần. Cân nghiêng dần và rót tới vạch là thật, nhưng cân xong bé vẫn chọn tổng ki-lô-gam trong các lựa chọn. Chỉ khoảng 38% câu ki-lô-gam dùng cân đĩa (`js/cau-do-luong.js:1111-1127`) |
| Chợ Khủng Long | 5 | Có, với trả tiền, đổi tiền, trả lại tiền thừa. Nhận biết và so sánh tiền là chọn đáp án |
| Rừng Hình Khối | 7 | Phần lớn có: chạm, vẽ, nối ngay trên hình |
| Lật Lịch | 4 | Một phần. Kéo kim là thật, chiếm khoảng 45% câu đồng hồ (`js/cau-thoi-gian.js:420-421`); còn lại chọn thẻ |
| Câu Cá Thống Kê | 5 | Một phần. Câu và phân loại cá là thao tác thật; câu hỏi là gõ số hoặc chọn; biểu đồ do Gai Long dựng, không phải bé |
| Đua Xe | 12 | Không. Làn xe là 1 trong 3 lựa chọn (`js/dua-xe.js:339-340`) |
| Lật Thẻ | 9 | Không. Chọn 1 trong tối đa 8 thẻ kết quả luôn ngửa, nên lật thẻ không có phần nhớ |
| Truyện Tranh | 8 | Không. Chọn phép tính rồi gõ kết quả; bé không động vào tranh |
| Đấu Trường | 2 | Không. Mọi câu bị ép về dạng chọn đáp án (`js/app.js:577-580`) |
| 6 game cũ trong đảo | 19 | Không. Chém, bắn, lái, nhảy chỉ để chọn 1 trong 2 đến 4 lựa chọn. Cầu nối đổi mọi câu thao tác về chọn đáp án (`js/cau-noi.js:197-198`) |

Như vậy chỉ 30 trên 80 màn có thao tác là phép toán, và ngay trong 30 màn đó nhiều câu vẫn là chọn đáp án.

Quan trọng hơn là các nội dung ưu tiên của M1 cho lớp 2 được luyện ở đâu:

| Mã | Nội dung | Thể loại đang luyện |
|---|---|---|
| 2.8, 2.9 | Cộng, trừ qua 10 | Đua Xe, Lật Thẻ, Chém Trái Cây |
| 2.11 | Cộng, trừ có nhớ trong 100 | Đua Xe, Lật Thẻ, Bắn Thiên Thạch |
| 2.20, 2.22 | Bảng nhân, bảng chia 2 và 5 | Lật Thẻ, Bắn Thiên Thạch, Chém Trái Cây |
| 2.19 | Ý nghĩa phép nhân | Lật Thẻ |
| 2.21 | Ý nghĩa phép chia | Truyện Tranh |

Với phần "thuộc cho nhanh" (8 + 7, 2 × 7), luyện chọn đáp án nhanh là hợp lý và nên giữ. Vấn đề nằm ở phần "hiểu": vì sao 8 + 7 = 10 + 5, vì sao phải nhớ 1, vì sao 4 + 4 + 4 = 4 × 3. Phần này chỉ xuất hiện trong màn "Gần đúng rồi!" sau khi bé đã sai, hoặc trong bài học 30 giây. Các kỹ năng của Đua Xe không có bài học 30 giây nào. `01-muc-tieu-va-ky-vong.md` mục 2.1 đã gọi đúng tên lỗ hổng này: "bé mới được luyện phần tính, chưa được luyện phần hiểu".

### 2.4 Ba chỗ hở lớn và hai chỗ hở phụ

**Hở 1: toán là cổng, chưa là cách chơi.** Xem mục 2.3.

**Hở 2: không có gì thuộc về bé và ở lại.** Bằng chứng ở mục 2.2, dòng CD4. Bé chơi 4 tuần thì thứ duy nhất tích lại mà bé nhìn thấy là một con số quả mọng và hình khủng long đổi 4 lần.

**Hở 3: bé bị chấm nhiều hơn được chơi.** Một ván Đua Xe bình thường (nhiệm vụ 1 trên 3, được 2 sao, chưa thuộc) cho bé xem trên màn kết thúc:

- khoảng 36 con số;
- 8 đến 9 luật, điều kiện;
- 3 dòng tính quả mọng, ví dụ "11 câu tự làm × 3 = 33";
- 3 nút "?".

Màn này có cả danh sách "Để thành Đã thuộc, con cần: Tự làm 20 câu (con đã làm 13) / Đúng ngay 9 trên 10 câu (con đang 8 trên 10) / Chơi 2 ngày khác nhau (con mới 1 ngày)" (`js/app.js:761-893`).

Ngoài màn kết thúc:

- Trang vùng hiện nhãn đỏ "Cần giúp" kèm lỗi, ví dụ "hay quên nhớ 1" (`js/app.js:468, 482-483`).
- Trang vùng ghi "SGK Chủ đề 4 · Bài 19 đến 24 · Học kì 1" (`js/app.js:451`).
- Trang Cách chơi dài khoảng 1 100 âm tiết, giải thích luật sao, bảng quả mọng và 4 điều kiện Đã thuộc.

Na ghét dòng "Cần luyện thêm" hiện lúc bà ngoại nhìn. Su ghét "màn hình kết quả liệt kê câu sai to trước mặt mẹ" (`02-nhan-vat-ao.md`).

**Hở phụ 4: khủng long chưa là bạn.** Rex, Mây có tên cố định và không có giọng riêng. Trên bản đồ, khủng long chỉ nói "Đi nào!" và không chạm được (`style.css:175`, `pointer-events: none`). Truyện Tranh không dùng tên bé, cũng không dùng tên các bạn bé đã đặt.

**Hở phụ 5: ít quyền chọn, ít bất ngờ.** Nhiệm vụ hôm nay không đổi được. Sau mỗi ván chỉ có một thẻ gợi ý, đọc to sau 1,4 giây. Không có gì ngẫu nhiên trong thưởng.

## 3. Đề xuất

Công sức: **Nhỏ** là dưới 6 giờ, **Vừa** là 6 đến 20 giờ, **Lớn** là trên 20 giờ và thường cần vẽ thêm hình. Mốc 6 giờ theo M13 là quỹ thời gian một tuần.

### Đợt 0: sửa ba chỗ làm mất khoảnh khắc vui và làm sai số đo

Làm trước mọi việc khác, tổng dưới một tuần.

**0.1 Không để mất màn ăn mừng khi bé bỏ dở ván.**

- *Hiện nay:* `sauVan` xếp màn ăn mừng (lên mức lớn, trứng vùng nở) vào `A.hangMung`.
  - Nếu ván bỏ dở, game về đảo luôn (`js/app.js:754`), và ván sau xóa hàng đợi (`js/app.js:726`).
  - Trứng vùng vẫn nở trong hồ sơ, nhưng bé không bao giờ thấy lúc nở. Bé cũng không được đặt tên bạn mới: `trung_vung[v].ten` mãi là `null`.
  - Khủng long đổi hình mà không có lời chúc nào. Bé hay bỏ dở như Cốm là bé mất nhiều nhất.
  - Ở ván đầu tiên, màn kết thúc đã hiện hình khủng long đang ăn và dòng "Rex: Sơ sinh → Nhí" trước khi màn "Trứng đã nở!" xuất hiện (`js/app.js:729, 778, 873-879`). Bất ngờ lớn nhất của buổi đầu bị lộ trước.
- *Đề xuất:*
  - Khi về đảo mà hàng đợi còn màn ăn mừng thì chiếu trước khi hiện bản đồ.
  - Trứng đã nở mà chưa có tên thì lần mở đảo sau hỏi lại tên.
  - Ở ván đầu, màn kết thúc giữ hình trứng lay động cho tới màn "Trứng đã nở!".
  - Thêm kiểm thử cho cả ba.
- *Công sức:* Nhỏ. *Mục tiêu:* M4, M5.

**0.2 "Bài đang học" tự tăng theo lịch.**

- *Hiện nay:* bài đang học chỉ được đoán một lần khi tạo hồ sơ (`js/ho-so.js:93`) và khi hỏi lên lớp vào tháng 9 (`js/app.js:288`).
  - Bé lớp 2 tạo hồ sơ ngày 28/9/2026 sẽ giữ Bài 7 mãi. Trong khi đó, theo chính hàm `Dao.uocLuongBai`, ngày 15/11/2026 đã là Bài 22 và ngày 10/1/2027 là Bài 40.
  - Nếu bố mẹ không vào Góc phụ huynh chỉnh, vùng 7 đến 10 (nhân chia, số đến 1000, chợ, thống kê) khóa suốt năm. Đấu Trường Học Kì 1 cũng khóa nếu bé chưa luyện đủ 6 kỹ năng.
  - "Bước tiếp theo" chỉ gợi ý màn tới bài đang học cộng 3 (`js/dao.js:508`). "Học mới" ưu tiên màn quanh bài đang học, nên cứ loanh quanh Bài 7 đến 10.
  - Đây đúng là điều Tí nói: "ba ngày không có gì mới là bỏ".
- *Đề xuất:*
  - Nếu `bai_nguon` là `uoc_luong_theo_ngay` thì tính lại mỗi ngày.
  - Nếu bố mẹ đã đặt bài thì lưu ngày đặt, rồi cộng thêm theo cùng nhịp 75 bài trong 35 tuần.
  - Báo cáo tuần ghi "Con đang học khoảng Bài N" kèm nút sửa.
  - Ghi `ho_so_doi` mỗi khi bài đổi.
- *Công sức:* Nhỏ. *Mục tiêu:* M3, M4, M1.

**0.3 Ghi đúng ván nào bé tự chọn.**

- *Hiện nay:* ba loại ván đều ghi `nguon: 'tu_chon'`:
  - ván mở từ thẻ "Bước tiếp theo" (`js/app.js:420`);
  - ván mở từ nút "Chơi lại" (`js/app.js:1176`);
  - ván bé tự chạm trên trang vùng (`js/app.js:1166`).

  Vì vậy "Con thích nhất" trong Góc phụ huynh (`js/bao-cao.js:202-215`) và `so_thich.the_loai_tu_chon` (`js/hoc-tap.js:373`) đếm cả ván do game gợi ý là "ván con tự chọn". Trong khi đó, bé có tự chọn chơi phần toán hay không lại chính là thước đo quan trọng nhất của bài viết và của thí nghiệm Habgood.
- *Đề xuất:*
  - Thêm hai giá trị `buoc_tiep` và `choi_lai`.
  - "Con thích nhất" chỉ tính ván `tu_chon` và `choi_lai`. Bé chủ động chơi lại là tín hiệu thích mạnh nhất.
  - Cập nhật dòng `van_bat_dau` trong `spec/06-theo-doi-hoc-tap.md` và lược đồ sự kiện.
- *Công sức:* Nhỏ. *Mục tiêu:* M12, M6, M7.

### Đợt 1: việc nhỏ, hiệu quả lớn

Mỗi việc cần một đến ba buổi.

**1.1 Màn kết thúc cho bé: ít số, nhiều cảm xúc.** (Ghi chú 2 của tác giả; Deci và cộng sự)

- *Hiện nay:* xem Hở 3.
- *Đề xuất:*
  - **Màn kết thúc** giữ lại:
    - khủng long ăn quả mọng;
    - một con số duy nhất, ví dụ "+33 quả mọng";
    - sao;
    - thanh lớn lên;
    - ba mặt cảm xúc;
    - bước tiếp theo;
    - một câu khen có thông tin. Chọn theo thứ tự ưu tiên: "Con sửa được 2 câu từng sai!", rồi "Con tách 10 đúng hết!", rồi "Con tự làm 11 câu!", rồi kỷ lục.
  - **Mỗi kỹ năng là một cái cây:** Chưa học là hạt, Làm quen là mầm, Đang luyện là cây non, Đã thuộc ra hoa, Vững chắc ra quả. Mỗi câu tự làm đúng là một giọt nước tưới cây. Bé thấy cây lớn chứ không thấy "con đang 8 trên 10".
  - **Chuyển đi chỗ khác:** bảng tính quả mọng và 4 điều kiện Đã thuộc vào nút "?" (cho bé tò mò như Tí) và vào Góc phụ huynh.
  - **Bỏ nhãn "Cần giúp"** khỏi mắt bé.
  - **Đổi lý do nhiệm vụ** từ nhãn gắn vào bé ("Con hay quên nhớ 1") sang việc cùng làm ("Mình luyện nhớ 1 cho thật chắc nhé").
  - **Thu nhỏ dòng SGK** trên trang vùng. Tên màn dùng lời của đảo; mã bài SGK để cho bố mẹ.
- *Vì sao:* bé cần thấy mình đang giỏi lên, không thấy mình đang bị chấm. Việc học vẫn đo đủ, chỉ không bày ra trước mắt bé.
- *Công sức:* Nhỏ đến Vừa. *Tệp:* `js/app.js` (`moKetThuc`, `veKyNangKetThuc`, trang vùng), `js/dao.js:427`, `js/huong-dan.js` (chương Đã thuộc). *Mục tiêu:* M5, M6.

**1.2 Rex và Mây biết nói, biết nhớ.** (PBS Kids, Khan Academy Kids)

- *Hiện nay:* người kể chuyện xưng "con" như cô giáo. Khủng long không có giọng riêng; lời của nó là "Đi nào!" và các câu gợi ý.
- *Đề xuất:*
  - Viết khoảng 60 câu ngắn, mỗi câu dưới 12 chữ, theo hai tính cách của trứng bé đã chọn: Rex gan dạ, hay đùa; Mây hiền, thích hoa.
  - Khủng long xưng "tớ", gọi bé là "cậu", để là **bạn** chứ không là cô giáo.
  - Chỉ nói ở 5 lúc, để không thành tiếng ồn với bé như Cốm: chào, sau câu sai đầu tiên của ván, khi bé sửa được câu từng sai, khi xong nhiệm vụ, lúc chia tay.
  - Dùng giọng đọc sẵn có trên máy, nhưng mỗi con một cao độ và tốc độ riêng.
  - Chạm khủng long trên bản đồ thì nó đáp lại. Về sau, chạm là mở Tổ (việc 2.1).

| Lúc | Rex (Dũng Mãnh) | Mây (Dễ Thương) |
|---|---|---|
| Chào, có nhắc chuyện thật lấy từ nhật ký | "An về rồi! Hôm qua cậu sửa được 36 + 27 đấy!" | "An ơi, tớ nhớ cậu. Hoa hôm qua nở rồi này!" |
| Sau câu sai đầu tiên | "Ối, tớ cũng hay quên nhớ 1. Thử lại nào!" | "Không sao đâu, sai là để học mà." |
| Sửa được câu từng sai | "Cậu làm được rồi! Tớ biết mà!" | "Giỏi quá, câu khó nhất hôm nay đấy!" |
| Chia tay | "Tớ buồn ngủ rồi. Trứng Gai Long đang lay động đấy, mai xem nhé!" | "Mai cậu quay lại tưới cây với tớ nhé." |

- *Vì sao:* bạn đồng hành làm bé muốn quay lại vì ai đó, không chỉ vì điểm. Câu "tớ cũng hay sai" dạy bé rằng sai là bình thường, đúng điều Su và Na cần.
- *Công sức:* Nhỏ đến Vừa. *Tệp:* `js/app.js`, `js/am-thanh.js`, `style.css`. *Mục tiêu:* M4, M5.

**1.3 Truyện Tranh kể về bé và bạn của bé.** (PBS Kids; Cordova và Lepper, Walkington và Hayata ở mục 1.4)

- *Hiện nay:*
  - Nhân vật {A}, {B} được lấy ngẫu nhiên trong 12 tên loài.
  - Không dùng tên bé, cũng không dùng tên các bạn bé đã đặt.
  - Vài đề vẫn ở bối cảnh người, như "Mẹ đã bán {y} con lợn", "Lớp 2A trồng được {x} cây" (`js/ngan-hang.js:1117-1193, 1209, 1270-1273`).
- *Đề xuất:*
  - Ưu tiên khủng long của bé và các bạn đã nở, gọi bằng tên bé đặt (ví dụ "Mít", "Bông").
  - Thỉnh thoảng cho chính bé vào truyện: "An có 36 quả mọng…".
  - Đề bối cảnh người đổi sang đảo khi đổi được.
- *Vì sao:* đây không chỉ là thay tên. Những bạn này do chính bé ấp và đặt tên, nên bé có vai trò sở hữu, đúng chỗ mà nghiên cứu thấy lợi ích rõ nhất.
- *Công sức:* Nhỏ. *Mục tiêu:* M1 (2.18, 2.26), M6.

**1.4 Bé chọn cách chơi, hồ sơ học tập chọn nội dung.** (Khan Academy Kids, Prodigy)

- *Hiện nay:* nhiệm vụ không đổi được, và sau mỗi ván chỉ có một thẻ gợi ý.
- *Đề xuất:*
  - Mỗi thẻ nhiệm vụ cho 2 thể loại cùng luyện một kỹ năng: "Ôn cộng qua 10: Đua Xe hay Lật Thẻ?".
  - Thẻ "Bước tiếp theo" có 2 lựa chọn.
  - Hồ sơ học tập vẫn quyết định luyện gì; bé quyết định chơi bằng gì.
  - Ghi lại thể loại bé chọn. Đây là dữ liệu sở thích thật, cần có việc 0.3 trước.
- *Công sức:* Nhỏ đến Vừa. *Tệp:* `js/dao.js` (`lapNhiemVu`, `buocTiep`), `js/app.js`. *Mục tiêu:* M4, M6.

**1.5 Lịch chăm khủng long thay cho chuỗi ngày.** (Duolingo, nhưng bỏ CD8)

- *Hiện nay:* bé không thấy những ngày mình đã chơi; chỉ bố mẹ thấy "x/7 ngày có chơi".
- *Đề xuất:*
  - Trên bản đồ có 7 ô, bắt đầu từ thứ Hai.
  - Ngày nào chơi xong 1 ván thì ô đó nở một bông hoa.
  - Đủ 3 ngày trong tuần thì hoa thành một chậu, đặt vào Tổ (việc 2.1) và giữ mãi.
  - Không có chữ nào về ngày bỏ lỡ, không có gì héo.
  - Mốc 3 ngày cao hơn một chút so với định nghĩa "Chơi đều" (từ 2 ngày và 30 phút mỗi tuần), để bé nào đạt mốc thì chắc chắn đã chơi đều.
- *Công sức:* Nhỏ. *Mục tiêu:* M4.

**1.6 Nhiệm vụ ngoài đời.** (Osmo)

- *Hiện nay:* 43 việc "Làm cùng con" đã viết sẵn, mỗi mã nội dung một việc (`js/bao-cao.js:852`), nhưng chỉ nằm sau cổng phụ huynh.
- *Đề xuất:*
  - Mỗi tuần một thẻ "Rex đố cậu làm ngoài đời", viết lại theo giọng khủng long từ việc của kỹ năng bé đang học. Ví dụ: "Lấy đũa bó thành từng bó 10, rồi làm 36 + 27 với bố mẹ nhé!".
  - Bé bấm "Con làm rồi!" thì nhận một nhãn dán cho Tổ.
  - Góc phụ huynh thấy việc bé đã làm.
  - Không chấm, không cần chứng minh.
- *Công sức:* Nhỏ. *Mục tiêu:* M1, M7.

**1.7 Vào chơi nhanh ở lần đầu.** (Minecraft: không gì dừng game lại để dạy)

- *Hiện nay:* trước câu toán đầu tiên có 9 đến 11 chạm, thêm gõ tên, rồi một hướng dẫn ngắn đọc to 4 chương (khoảng 280 âm tiết). Trong khi đó, `01-muc-tieu-va-ky-vong.md` mục 5 cam kết "mở là chơi trong 5 giây".
- *Đề xuất:*
  - Chọn trứng xong là vào thẳng một ván 6 câu; trứng nở cuối ván.
  - Hướng dẫn tách thành từng lời nhắc nhỏ đúng lúc, do Rex nói: lần đầu thấy nhiệm vụ, lần đầu có quả mọng, lần đầu tới trang vùng.
- *Công sức:* Nhỏ. *Mục tiêu:* M4.

**1.8 Bỏ cổng hỏi đáp ở 4 game đồng hồ khi chơi riêng, và sửa mẫu thiết kế game.**

- *Hiện nay:* khi chơi ngoài đảo, 4 game đồng hồ bắt qua phần hỏi đáp mới mở màn sau:
  - Xe Tăng: đúng 3 trên 4 câu.
  - Cưỡi Hổ: đúng hết.
  - Mê Cung, Tháp: có hỏi đáp để mở màn.

  Đây đúng là hình mẫu bài viết chê: phải qua bài kiểm tra mới tới phần vui. Bin và Cốm ghi "hỏi đáp 3 câu sau màn" trong mục ghét, còn Tí ghét "màn khóa phải mở tuần tự". Mẫu `templates/mau-thiet-ke-game.md` bước 3 vẫn ghi "Hỏi đáp 3 câu để mở màn sau", nên game mới dễ lặp lại lỗi này.
- *Đề xuất:*
  - Chơi xong màn là mở màn sau. Hỏi đáp thành "Thử thách thêm" tự chọn, làm thì được thêm sao.
  - Sửa mẫu thiết kế: thay bước 3 bằng mục "Toán nằm ở đâu trong cơ chế?", kèm phép thử: *bỏ phần toán đi, game còn chơi được không? Nếu còn thì toán đang là vỏ bọc.*
- *Công sức:* Nhỏ đến Vừa (4 game, nhớ tăng `CACHE`). *Mục tiêu:* M5, M6.

### Đợt 2: sở hữu, bất ngờ và phản hồi

Mỗi việc 1 đến 2 tuần.

**2.1 Tổ khủng long.** (Minecraft, ABCmouse)

- *Hiện nay:*
  - Bé đặt tên bạn mới rồi bấm "Đưa về Vườn", nhưng không có vườn.
  - Bạn đã nở không hiện trên bản đồ.
  - Phụ kiện (Mào Lửa, Giày Đua, Bộ Giáp Học Kì 1…) chỉ là chữ.
- *Đề xuất:*
  - Chạm khủng long trên bản đồ để vào Tổ. Nền `assets/img/bg-garden.webp` đã có sẵn.
  - Trong Tổ có:
    - khủng long của bé, mặc phụ kiện bé chọn;
    - các bạn đã nở đi lại, kèm tên bé đặt;
    - cây kỹ năng (việc 1.1), chậu hoa (việc 1.5), nhãn dán ngoài đời (việc 1.6).
  - Bé chạm để vuốt ve khủng long, cho ăn một quả mọng (hình `rex-eating`, `may-eating` đã có), kéo thả để sắp xếp đồ.
  - Đổi được tên Rex, Mây.
- *Làm theo 3 bước:*
  - (a) Màn Tổ với khủng long, các bạn đã nở và danh sách phụ kiện: Vừa.
  - (b) Vẽ 12 phụ kiện và gắn lên khủng long: Lớn, cần hình.
  - (c) Kéo thả sắp xếp: Vừa.

  Trước khi có bước (a), đổi chữ nút "Đưa về Vườn" thành "Chào bạn mới!".
- *Mục tiêu:* M4.

**2.2 Thứ bé làm ra thì ở lại.** (Minecraft)

- *Hiện nay:* tháp trong Xếp Hình Số về 0 mỗi ván. Biểu đồ tranh trong Câu Cá bị xóa khi hết ván.
- *Đề xuất:*
  - Mỗi tầng tháp bé xây cộng dồn vào một "Tháp Số" trong Tổ.
  - Cá bé câu được thả vào hồ của Tổ: "Hồ của cậu có 124 con cá".
  - Đồng hồ bé chỉnh đúng treo lên một bức tường đồng hồ.
  - Bé thấy công sức của mình lớn dần qua nhiều tuần.
- *Công sức:* Vừa. *Mục tiêu:* M4.

**2.3 Quà chọn được ở các mốc quả mọng.** (ABCmouse)

- *Hiện nay:* quả mọng chỉ cộng dồn. Ước tính với khoảng 25 quả mọng mỗi ván và 4 ván mỗi ngày chơi:

  | Mức | Khoảng số ngày chơi để tới |
  |---|---|
  | Nhí | 4 |
  | Thiếu niên | 10 |
  | Trưởng thành | 20 |
  | Huyền thoại | 40 |

  Giữa hai mức chỉ có thanh tiến độ nhích lên.
- *Đề xuất:*
  - Không tiêu quả mọng, để giữ lời hứa "không bao giờ bị trừ".
  - Cứ mỗi 200 quả mọng, bé được chọn 1 trong 3 món cho Tổ: cây, đá, đèn, ổ rơm…
  - Được chọn là CD3, giữ lại là CD4, mốc gần là CD2.
- *Công sức:* Vừa (cần hình nhỏ). *Mục tiêu:* M4.

**2.4 Bất ngờ vui, không cờ bạc.** (ABCmouse, Prodigy)

- *Hiện nay:* không có gì ngẫu nhiên trong thưởng, và mọi màn ăn mừng dùng chung một tiếng nhạc.
- *Đề xuất:*
  - **Khách ghé đảo:** 1 đến 2 lần mỗi tuần, một bạn khủng long ghé bản đồ nhờ bé giải một câu tới hạn ôn, rồi cảm ơn bằng một món cho Tổ. Đây là ôn cách quãng khoác áo bất ngờ.
  - **Trò mới:** giữa hai mức lớn, khủng long thỉnh thoảng học được một động tác mới.
  - **Nhạc riêng:** mỗi kiểu ăn mừng một điệu.
  - **Luật chung:** ai cũng nhận được; không có món hiếm; không mua được; không đếm ngược.
- *Công sức:* Vừa. *Mục tiêu:* M4, M2.

**2.5 Đảo hồi sinh: một câu chuyện nhỏ.** (CD1)

- *Hiện nay:* không có lý do nào lớn hơn việc nuôi Rex.
- *Đề xuất:*
  - Câu chuyện: "Đảo ngủ quên, các vùng mất màu. Mỗi kỹ năng cậu luyện làm vùng sáng lại."
  - Trên bản đồ:
    - vùng chưa luyện thì nhạt màu;
    - kỹ năng Đang luyện thắp một ngọn đèn;
    - kỹ năng Đã thuộc nở hoa;
    - trứng vùng nở thì cây cầu sang vùng bên sáng lên.
  - Bản đồ thành cuốn nhật ký học tập bé nhìn thấy được, không cần chữ hay số.
- *Công sức:* Vừa. *Mục tiêu:* M4.

**2.6 Cho bé thấy đáp án của mình "trông ra sao".** (Code.org, DragonBox)

- *Hiện nay:* màn "Gần đúng rồi!" ghi "Con chọn **53**. Con quên nhớ 1 rồi", rồi chỉ vẽ cách làm đúng (`js/phan-hoi.js:99-116`). Ba thể loại đã làm tốt việc này ngay trong game:
  - Chợ: "Cộng lại là 900 đồng, còn thiếu 100 đồng".
  - Lật Lịch: "Đồng hồ của con chỉ 3 giờ 30 phút".
  - Xếp Hình Số: "Con xếp 250".
- *Đề xuất:* vẽ đáp án của bé cạnh đáp án đúng, bằng cùng một mô hình:
  - 53 và 63 bằng khối chục; thanh chục bé "quên" nhấp nháy.
  - Hai đồng hồ.
  - Hai điểm trên tia số.
  - Hai khay tiền.

  Đặt hai trường hợp cạnh nhau giúp bé tự thấy chỗ khác, thay vì chỉ được nghe kể.
- *Công sức:* Vừa. *Tệp:* `js/phan-hoi.js`, phần `loi_giai` của các bộ sinh câu. *Mục tiêu:* M1, M2, M5.

**2.7 Độ khó bậc thang trong ván.** (Prodigy)

- *Hiện nay:*
  - Danh sách câu được lập một lần ở đầu ván (`js/van-choi.js:30`).
  - Mức thành thạo không làm đổi câu được sinh.
  - Chỉ Đua Xe có dãn và rút thời gian (`js/dua-xe.js:357, 369`).
- *Đề xuất:*
  - Mỗi kỹ năng có 3 bậc, trong đúng phạm vi SGK. Ví dụ với 2.8:
    - bậc 1: đề có kèm hình khung 10 ô;
    - bậc 2: phép tính thường;
    - bậc 3: dạng tìm số "8 + ? = 15", hoặc hai số sát nhau như 9 + 8.
  - 4 câu tự làm đúng liền thì lên một bậc; 2 câu sai liền thì xuống bậc có hình.
  - Giữ dải "2 sao ở 40% đến 70% số ván" của M6.
  - Bin và Tí có mồi để lên khó; Na và Su có chỗ đỡ.
- *Công sức:* Vừa đến Lớn, vì mỗi bộ sinh câu phải thêm tham số bậc. *Mục tiêu:* M6, M1.

### Đợt 3: toán là cách chơi

Mỗi việc 3 đến 6 tuần. Làm từng việc một, đo xong mới làm việc sau.

**3.1 Tiệc Quả Mọng: chia đều, chia theo nhóm, phép nhân bằng tay.** (DragonBox cộng Minecraft; đây là đề xuất chủ lực)

- *Hiện nay:*
  - 2.19 chỉ luyện bằng Lật Thẻ, tức ghép thẻ "2 + 2 + 2" với thẻ "2 × 3".
  - 2.21 chỉ luyện bằng Truyện Tranh, tức chọn phép tính.
  - M3 ở mốc 6T đòi ba nội dung "hiểu" là 2.19, 2.21 và 3.18.
  - `ban-do-toan-2-3.md` đã gợi ý đúng hướng: "Kéo bánh chia đều vào các đĩa, game tự viết lại thành phép chia". Ví dụ trong `templates/mau-thiet-ke-game.md` cũng chính là chia kẹo, phần thừa rơi ra ngoài.
- *Cách chơi:* các bạn khủng long bé đã nở ngồi quanh bàn tiệc, gọi bằng tên bé đặt. Bé kéo quả mọng vào đĩa.
  - **Chia đều.** "Chia 12 quả cho 3 bạn." Bé kéo từng quả hay từng nắm, game viết dần dưới bàn.
    - Đĩa lệch thì bạn ít quả phụng phịu, bạn nhiều quả ngượng ngùng. Bé thấy ngay là chưa đều, không cần chữ "sai".
    - Khi đã đều, game viết: "12 : 3 = 4, mỗi bạn 4 quả".
  - **Chia theo nhóm.** "Mỗi đĩa 4 quả thì 12 quả đủ mấy đĩa?" Bé bày đĩa, game viết 12 : 4 = 3.
  - **Phép nhân.** "3 bạn, mỗi bạn 4 quả." Bé bày xong, game viết 4 + 4 + 4 = 12, rồi 4 × 3 = 12. Thứ tự thừa số đúng SGK lớp 2: 4 được lấy 3 lần.
  - **Về sau:**
    - một phần hai, một phần năm (2.25): chia đôi chiếc bánh;
    - chia có dư (3.18): quả thừa lăn xuống đất, và luôn ít hơn số bạn.
  - **Quả dùng để bày** là quả mọng bé đã hái. Game chỉ "mượn" để bày, không trừ.
- *Tái dùng có sẵn:*
  - khung chơi chung (`js/khung-choi.js`);
  - kéo thả kiểu Chợ (`js/cho-khung-long.js`);
  - các sự kiện `keo`, `dat`, `tra_loi`;
  - bài học 30 giây `phep-nhan`, `phep-chia` (đĩa cam) gần như là kịch bản sẵn.
- *Lỗi đo được qua thao tác:* chia không đều; đếm số nhóm thay vì số trong nhóm (`dem-nhom`); đảo thừa số (`dao-thu-tu`); cộng thay nhân.
- *Công sức:* Lớn. *Mục tiêu:* M1, M3 (2.19, 2.21, rồi 3.18).

**3.2 Xe 10 Chỗ: tách 10 bằng tay.** (DragonBox; cách dạy Singapore Math của cô Tan Mei Lin trong `02-nhan-vat-ao.md`)

- *Hiện nay:* cách "tách 10" (8 + 5 = 8 + 2 + 3) chỉ hiện trong gợi ý và trong màn "Gần đúng rồi!" sau khi bé đã sai.
- *Đề xuất:* thêm một bước "xếp khách" trước khi đua, hoặc làm thành một màn riêng ở vùng 2.
  - **Cộng qua 10.** Xe có 10 ghế, là khung 10 ô như SGK. 8 bạn đã ngồi, 5 bạn đang chờ. Bé kéo 2 bạn lên cho đủ xe, 3 bạn còn lại lên xe sau. Game viết "8 + 2 = 10, 10 + 3 = 13".
  - **Trừ qua 10.** Với 13 − 5: 3 bạn xuống xe lẻ trước để còn 10, rồi 2 bạn nữa xuống xe 10 chỗ, còn lại 8.
  - **Sau đó** đua như cũ để luyện cho nhanh. Hiểu bằng tay, nhanh bằng đua.
- *Công sức:* Vừa đến Lớn. *Mục tiêu:* M1 (2.8, 2.9).

**3.3 Gộp khối, đổi khối: có nhớ, có mượn bằng tay.** (DragonBox)

- *Hiện nay:* Xếp Hình Số đã có cơ chế 10 đơn vị tự gộp thành 1 chục, nhưng chỉ dùng để dựng một số.
- *Đề xuất:* thêm chế độ "gộp hai đống".
  - **Cộng có nhớ, 36 + 27.** Bé kéo hai đống lại; 13 khối đơn vị bó thành 1 chục ngay trước mắt; bé đọc ra 63.
  - **Trừ có mượn, 62 − 38.** Không đủ đơn vị thì bé đập 1 thanh chục thành 10 khối.
  - **Hai lỗi quen thuộc** không thể xảy ra khi làm bằng khối, và bé thấy vì sao:
    - quên nhớ, ra 53;
    - lấy số lớn trừ số bé trong cột, ra 36.
- *Công sức:* Vừa. *Mục tiêu:* M1 (2.11, 2.12).

**3.4 Đấu Trường có chọn chiêu.** (Prodigy)

- *Hiện nay:* mỗi câu đúng là một đòn cố định. Tuyệt chiêu tự đến theo thứ tự (`js/dau-truong.js:30, 51-70`).
- *Đề xuất:*
  - Mỗi lượt, bé chọn 1 trong 3 chiêu. Mỗi chiêu là một kỹ năng, ví dụ "Đuôi Quật: cộng có nhớ", "Hơi Thở Lửa: bảng nhân", "Khiên Đá: đo lường".
  - Trùm có một "điểm yếu" hiện rõ. Điểm yếu là kỹ năng tới hạn ôn hoặc cần luyện, do hồ sơ học tập quyết định. Chiêu đánh vào điểm yếu gây 2 đòn.
  - Bé thấy mình quyết chiến thuật, còn hồ sơ học tập vẫn lái việc ôn.
  - Câu thao tác (kéo kim, đặt quả cân) được vào đấu trường như "chiêu đặc biệt".
- *Công sức:* Vừa. *Mục tiêu:* M6, M2.

**3.5 Con làm cô giáo: bé ra đề đố bố mẹ.** (Roblox; học bằng cách dạy lại)

- *Hiện nay:* trong game không có chỗ nào để bé ra đề, hay để chơi cùng người lớn.
- *Đề xuất:*
  - Bé chọn hai bạn khủng long, một món đồ, hai số (trong phạm vi kỹ năng bé đã luyện) và phép tính. Game dựng truyện tranh 3 khung như Truyện Tranh.
  - Bố mẹ giải trên cùng máy. Bé chấm bằng đáp án game giữ, rồi "khen" bố mẹ bằng nhãn dán.
  - Ghi thành một loại ván riêng, không tính vào mức thành thạo.
  - Tí được thắng bố; Na kiên trì hơn khi có người ngồi cùng.
- *Công sức:* Vừa đến Lớn. *Mục tiêu:* M4, M7.

**3.6 Thử cho một game cũ hành động mang nghĩa toán.**

- *Hiện nay:* trong đảo, chém, bắn, lái, nhảy chỉ để chọn 1 trong 2 đến 4 lựa chọn. Robot không bao giờ tới, và không ai thua.
- *Đề xuất:* thử trước với Xe Tăng.
  - Nòng súng chính là kim phút. Robot mang câu "8 giờ 15 phút"; bé xoay nòng tới đúng vị trí của kim rồi bắn. Thao tác đặt giờ chính là thao tác ngắm.
  - So tỉ lệ bé tự chọn chơi lại giữa bản mới và bản cũ, trước khi làm tiếp các game khác.
- *Công sức:* Vừa đến Lớn. *Mục tiêu:* M6, M1 (B2.11).

## 4. Theo từng bé

| Bé | Hôm nay dễ vướng ở đâu | Việc giúp nhiều nhất |
|---|---|---|
| Bin: tốc độ, điểm số | Chơi mãi màn dễ để phá kỷ lục; bấm loạn qua màn giải thích | 3.4 chọn chiêu; 2.7 bậc thang (có mồi lên khó); 1.4 chọn cách chơi |
| Su: cẩn thận, sợ sai | Đua Xe có giờ cho mỗi câu; màn kết thúc liệt kê điều kiện như phiếu điểm | 1.1 màn kết thúc nhẹ; 1.2 khủng long nói "sai là để học"; 2.6 thấy mình sai ở đâu |
| Tí: giỏi, chán nhanh | Bài đang học không tự tăng; câu không khó dần | 0.2; 2.7; 3.5 ra đề đố bố; 2.4 bất ngờ |
| Na: yếu bảng nhân, dễ nản, thích nhân vật dễ thương | Thấy nhãn "Cần giúp"; sợ bị so sánh | 1.1 bỏ "Cần giúp" khỏi mắt bé; 1.3 truyện có bạn của bé; 2.1 Tổ; 3.1 hiểu phép nhân bằng tay |
| Cốm: tập trung 5 đến 7 phút, thích chuyển động | Lần đầu phải qua 9 đến 11 chạm và 4 chương đọc; bỏ dở thì mất màn ăn mừng | 1.7 vào chơi nhanh; 0.1 giữ màn ăn mừng; 1.2 câu nói ngắn; 2.4 bất ngờ |

## 5. Những điều không nên làm

Các bẫy mà bài viết, hoặc chính các game trong danh sách, cho thấy. Đối chiếu với `01-muc-tieu-va-ky-vong.md` mục 6.

| Không làm | Vì sao |
|---|---|
| Chuỗi ngày kiểu "đừng để mất chuỗi" | CD8. Chính tác giả tự hỏi nó có lành mạnh cho trẻ không. Su, Na khóc khi mất thứ đã có; mất chuỗi một lần có thể là lý do bỏ hẳn |
| Bảng xếp hạng giữa các bé, kể cả anh em dùng chung máy | Trái mục 6 ("không hiện kết quả bé này cho bé khác"). Na vốn hay bị so với chị |
| Tiêu quả mọng để bỏ qua câu, mua gợi ý, mua thêm lượt | Biến việc học thành thứ phải né, và quả mọng mất nghĩa "con giỏi lên" |
| Hộp quà ngẫu nhiên có món hiếm, phải chơi nhiều mới có | CD6 và CD7 kiểu cờ bạc. Bất ngờ chỉ nên là bất ngờ vui, ai cũng nhận được |
| Biến game thành phần thưởng sau bài luyện ("làm xong 10 câu mới được chơi") | Đúng thứ bài viết gọi là phiếu bài tập có kinh phí. `01` mục 8 (b) cũng cấm |
| Thêm đồng hồ đếm ngược để tăng kịch tính | Su, Na sai cả câu làm được khi bị giục. Kịch tính nên đến từ câu đố, không từ áp lực giờ |
| Khen chung chung ("Giỏi quá!") sau mọi câu | Lời khen có thông tin ("Con tách 10 đúng rồi!") mới nuôi hứng thú. Khen mọi lúc thành tiếng ồn |
| Đổi mọi màn chọn đáp án thành màn thao tác | Luyện cho thuộc bảng cộng, bảng nhân cần nhiều lượt nhanh; màn chọn đáp án nhanh vẫn có chỗ. Thao tác dành cho phần "hiểu" |

## 6. Đo thế nào

### 6.1 Câu hỏi và thước đo

| Câu hỏi | Thước đo | Có sẵn chưa |
|---|---|---|
| Bé có tự muốn chơi phần toán không? | Tỉ lệ ván `tu_chon` và `choi_lai` theo thể loại; thể loại bé chọn ở việc 1.4 | Cần việc 0.3 |
| Bé có vui không? | Tỉ lệ "Vui" theo thể loại, mục tiêu từ 70% (M6) | Có (`cam_xuc`) |
| Bé có sợ sai không? | Tỉ lệ thoát ngay sau lần sai đầu tiên, mục tiêu dưới 10% (M5) | Có (`van_ket_thuc` có cờ bỏ dở) |
| Bé có quay lại không? | Số ngày chơi mỗi tuần (M4) | Có |
| Bé có học không? | % tự làm đúng không gợi ý trong 14 ngày; số kỹ năng chuyển từ Chưa thuộc sang Đã thuộc (M1) | Có |

### 6.2 Cách thử

Khớp với giai đoạn 6 trong `dao-khung-long/README.md`: 5 đến 10 bé, 4 tuần.

1. **Tuần 1:** chỉ bật Đợt 0 để lấy số nền.
2. **Tuần 2 đến 4:** bật Đợt 1.
3. **Mỗi tuần:** quan sát trực tiếp ít nhất 2 bé. Sau 15 phút, nói "Con chơi thêm 5 phút, con thích gì thì chơi", rồi ghi lại bé chọn gì. Đây là cách đo "thời gian tự chọn" của Habgood.
4. **Với thể loại mới của Đợt 3:** cùng một kỹ năng có hai cách chơi, ví dụ 2.21 bằng Truyện Tranh và bằng Tiệc Quả Mọng.
   - Nhờ việc 1.4, bé được chọn giữa hai cách, và game ghi lại lựa chọn.
   - Một tuần sau, so % tự làm đúng các câu chia trong Truyện Tranh (câu chuyển giao) giữa nhóm bé đã chơi Tiệc Quả Mọng và nhóm chưa chơi.

### 6.3 Luật giữ hay bỏ

- **Giữ** một thay đổi khi tỉ lệ ván tự chọn, chơi lại hoặc "Vui" tăng, mà % tự làm đúng không giảm.
- **Sửa hoặc bỏ** khi tỉ lệ thoát sau lần sai đầu tăng, hoặc % tự làm đúng giảm quá 5 điểm. Đó là dấu hiệu bé vui nhưng đang đoán.
- **Nếu tới mốc 6T mà M4 dưới 30%:** theo `01` mục 8 (b), dành 6 tuần sửa vòng chơi lõi. Tài liệu này là danh sách việc sẵn cho 6 tuần đó.

## 7. Bảng tổng

| Việc | Đợt | Công sức | Core Drive | Mục tiêu | Tệp chính |
|---|---|---|---|---|---|
| 0.1 Giữ màn ăn mừng khi bỏ dở; không lộ trứng nở | 0 | Nhỏ | CD2, CD7 | M4, M5 | `js/app.js` |
| 0.2 Bài đang học tự tăng | 0 | Nhỏ | CD7, CD2 | M3, M4, M1 | `js/ho-so.js`, `js/app.js`, `js/dao.js` |
| 0.3 Ghi đúng nguồn ván | 0 | Nhỏ | (đo) | M12, M6, M7 | `js/app.js`, `js/hoc-tap.js`, `js/bao-cao.js`, spec 06 |
| 1.1 Màn kết thúc ít số, cây kỹ năng | 1 | Nhỏ đến Vừa | CD2, CD3 | M5, M6 | `js/app.js`, `js/huong-dan.js` |
| 1.2 Rex, Mây biết nói, biết nhớ | 1 | Nhỏ đến Vừa | CD5, CD4 | M4, M5 | `js/app.js`, `js/am-thanh.js` |
| 1.3 Truyện Tranh về bé và bạn của bé | 1 | Nhỏ | CD4, CD5 | M1, M6 | `js/ngan-hang.js` |
| 1.4 Bé chọn cách chơi | 1 | Nhỏ đến Vừa | CD3 | M4, M6 | `js/dao.js`, `js/app.js` |
| 1.5 Lịch chăm khủng long | 1 | Nhỏ | CD2, CD4 | M4 | `js/app.js` |
| 1.6 Nhiệm vụ ngoài đời | 1 | Nhỏ | CD3, CD4 | M1, M7 | `js/bao-cao.js`, `js/app.js` |
| 1.7 Vào chơi nhanh ở lần đầu | 1 | Nhỏ | CD3 | M4 | `js/app.js`, `js/huong-dan.js` |
| 1.8 Bỏ cổng hỏi đáp; sửa mẫu thiết kế | 1 | Nhỏ đến Vừa | CD3 | M5, M6 | 4 game đồng hồ, `templates/mau-thiet-ke-game.md` |
| 2.1 Tổ khủng long | 2 | Vừa, rồi Lớn | CD4, CD3 | M4 | màn mới, `assets/art/` |
| 2.2 Thứ bé làm ra thì ở lại | 2 | Vừa | CD4 | M4 | `js/xep-hinh-so.js`, `js/cau-ca.js` |
| 2.3 Quà chọn được ở mốc quả mọng | 2 | Vừa | CD2, CD3, CD4 | M4 | `js/app.js`, `js/hoc-tap.js` |
| 2.4 Bất ngờ vui | 2 | Vừa | CD7 | M4, M2 | `js/dao.js`, `js/app.js` |
| 2.5 Đảo hồi sinh | 2 | Vừa | CD1, CD2 | M4 | `js/app.js`, `style.css` |
| 2.6 Vẽ đáp án của bé cạnh đáp án đúng | 2 | Vừa | CD3 | M1, M2, M5 | `js/phan-hoi.js`, `js/cau-*.js` |
| 2.7 Độ khó bậc thang | 2 | Vừa đến Lớn | CD3, CD2 | M6, M1 | `js/ngan-hang.js`, `js/van-choi.js` |
| 3.1 Tiệc Quả Mọng | 3 | Lớn | CD3, CD4, CD5 | M1, M3 | thể loại mới |
| 3.2 Xe 10 Chỗ | 3 | Vừa đến Lớn | CD3 | M1 | `js/dua-xe.js` hoặc thể loại mới |
| 3.3 Gộp khối, đổi khối | 3 | Vừa | CD3 | M1 | `js/xep-hinh-so.js` |
| 3.4 Đấu Trường chọn chiêu | 3 | Vừa | CD3, CD2 | M6, M2 | `js/dau-truong.js`, `js/dao.js` |
| 3.5 Con làm cô giáo | 3 | Vừa đến Lớn | CD3, CD4, CD5 | M4, M7 | thể loại mới, `js/truyen-tranh.js` |
| 3.6 Game cũ có hành động mang nghĩa toán | 3 | Vừa đến Lớn | CD3 | M6, M1 | `xe-tang-thoi-gian/` |

Nếu chỉ làm được 5 việc, nên chọn: 0.1, 0.2, 0.3 (vì rẻ, và sửa những chỗ đang hỏng), 1.1 (bỏ cảm giác bị chấm), 1.2 (có bạn đồng hành). Sau đó, việc có tác động lớn nhất tới việc học là 3.1 Tiệc Quả Mọng.

## Phụ lục A: phát hiện phụ khi khảo sát code

1. Bỏ dở ván làm mất màn ăn mừng và bước đặt tên bạn mới (`js/app.js:726, 754`); xem việc 0.1.
2. Màn kết thúc ván đầu lộ trước việc trứng nở (`js/app.js:729, 778, 873-879`); xem việc 0.1.
3. Bài đang học không tự tăng, nên vùng học kì 2 khóa suốt năm nếu bố mẹ không chỉnh (`js/ho-so.js:93`, `js/app.js:288`); xem việc 0.2.
4. `nguon: 'tu_chon'` gộp cả ván do game gợi ý và ván chơi lại, làm lệch "Con thích nhất" (`js/app.js:420, 1166, 1176`); xem việc 0.3.
5. Nút "Đưa về Vườn" dẫn tới một khu vườn không tồn tại (`js/app.js:955`); xem việc 2.1.
6. Trang chủ 3hoa.com chưa tính Đảo Khủng Long (đường dẫn ở gốc repo):
   - Nút "Chơi tiếp", nút "Chơi ngẫu nhiên" và phần thành tích chỉ chọn trong 6 game cũ (`/js/hub.js:22-40`).
   - Mô tả trang vẫn ghi "6 trò chơi" (`/index.html:9, 17, 25`).

## Phụ lục B: nguồn

- Post: <https://x.com/yukaichou/status/2104408042775138668> (28/09/2026).
- Bài xếp hạng: <https://yukaichou.com/gamification-examples/top-ten-learning-games-kids/> (cập nhật 12/08/2026).
- Octalysis:
  - mũ trắng, mũ đen: <https://yukaichou.com/gamification-study/white-hat-black-hat-gamification-octalysis-framework/>;
  - não trái, não phải: <https://yukaichou.com/gamification-video-course/beginners-guide-gamification-20-90-left-brain-brain-core-drives-intrinsic-extrinsic/>.
- Habgood, M. P. J. và Ainsworth, S. E. (2011). Motivating children to learn effectively: Exploring the value of intrinsic integration in educational games. *Journal of the Learning Sciences*, 20(2), 169 đến 206. <https://www.tandfonline.com/doi/abs/10.1080/10508406.2010.508029>
- Deci, E. L., Koestner, R. và Ryan, R. M. (1999). A meta-analytic review of experiments examining the effects of extrinsic rewards on intrinsic motivation. *Psychological Bulletin*, 125(6), 627 đến 668. <https://www.researchgate.net/publication/12712628_A_Meta-Analytic_Review_of_Experiments_Examining_the_Effects_of_Extrinsic_Rewards_on_Intrinsic_Motivation>
- Cordova, D. I. và Lepper, M. R. (1996). Intrinsic motivation and the process of learning: Beneficial effects of contextualization, personalization, and choice. *Journal of Educational Psychology*, 88(4), 715 đến 730. <https://eric.ed.gov/?id=EJ540338>
- Walkington, C. A. và Hayata, C. A. (2017). Designing learning personalized to students' interests: balancing rich experiences with mathematical goals. *ZDM*, 49, 519 đến 530. <https://link.springer.com/article/10.1007/s11858-017-0842-z>

## Lịch sử thay đổi

| Ngày | Thay đổi | Bởi |
|---|---|---|
| 2026-09-28 | Bản đầu: đọc post và bài xếp hạng, khảo sát code Đảo Khủng Long, 24 đề xuất | 3hoa |
