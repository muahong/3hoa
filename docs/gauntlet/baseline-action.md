# Baseline: Xe Tăng Thời Gian / Cưỡi Hổ Vượt Lửa

Ngày: 2026-09-06 (Asia/Bangkok). Checkout lúc bắt đầu: `a1f0458`. Chỉ khảo sát, không sửa product. Đã đọc README gốc và README hai game. Ghi chú về đợt refresh do người dùng cung cấp chưa có trong checkout lúc bắt đầu.

## Phương pháp và phạm vi

- Node 22.23.2 trên Windows, Playwright từ runtime Codex bundled (`C:\Users\son.nguyen\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules`), Chromium local qua `withGame`.
- Hồ sơ mới mỗi run. Viewport 1180×820, 390×844; bổ sung Cưỡi Hổ 844×390 để kiểm tra mẹo ngang.
- Đọc menu/bài học, nhấn nút vào màn 1, chụp gameplay; dùng phím `1` desktop và `touchscreen.tap` trên tọa độ hình đã quan sát ở mobile. Các lựa chọn có cả sai và đúng qua các run độc lập. Không thay state, không gieo điểm, không gọi hàm trả lời. Không tuyên bố thắng cả màn hoặc mở khóa.
- Quan sát hình trước; đọc source sau để chẩn đoán. Ảnh và log ở `tests/e2e/out/gauntlet/baseline-action/`; script `tests/e2e/gauntlet-baseline-action.js`. Nội dung câu hỏi ngẫu nhiên, ảnh baseline cuối ghi đè các lần thăm dò trước.
- Bốn run desktop/mobile không có pageerror, console error hoặc failed request trong log của helper. Chưa kiểm tra Safari/iPad vật lý, giọng đọc Việt không có trong Chromium máy này, chưa kiểm chứng cuối màn/quiz/profile.

## Phát hiện ưu tiên

### A1: Cưỡi Hổ tự bỏ qua lời giải sau khi sai dù giao diện ghi “Chạm để chạy tiếp”

**Đã tái hiện, mức cao cho vòng học.** Vào màn 1, chọn vòng sai, để tay khỏi màn hình. UI hiện lời giải và “Chạm để chạy tiếp”; sau 4 giây không input đã chuyển từ Vòng 1/8 sang Vòng 2/8 và mất lời giải. Cặp chứng cứ `cuoi-ho-390-after-choice.{png,txt}` / `cuoi-ho-390-no-input-4sec-later.{png,txt}` (desktop có cùng hành vi).

`cuoi-ho/js/game.js:905` tự tăng `gateIdx` sau `LEARN_T = 2.8` giây nếu không có speech. Bé đọc chậm hoặc máy không có giọng Việt không được tự quyết thời gian học. Đây là suy luận thiết kế từ hành vi, chưa phải dữ liệu người học thực.

**Tiêu chí sửa:** sai/hết giờ giữ câu hỏi, đáp án đúng, giải thích và tiến độ hiện tại ít nhất 10 giây nếu chưa có thao tác; chỉ nút Tiếp tục / Enter / Space chủ động mới chuyển. Tap đáp án phải không vô tình bỏ qua ngay. Lời giải và nút tiếp tục vẫn vừa màn hình ngang thấp.

### A2: Cưỡi Hổ: sai chỉ được xem đáp án rồi đi tiếp, chưa có lượt tự sửa

**Quan sát + source.** Sau chọn sai, vòng đúng xanh có ✓, vòng sai đỏ có ✕ (đây là điểm tốt), nhưng tap tiếp hoặc tự tiếp đều tăng `gateIdx`, không yêu cầu bé chọn lại câu vừa sai. Tiến trình vì thế chưa chứng minh bé đã sửa được lỗi đó.

**Tiêu chí cải tiến:** có nhịp “Thử lại” trên cùng câu đã giải thích hoặc câu tương đương; không trừ tim lặp cho lỗi đó, không tính lượt sửa thành đúng ngay từ đầu; giữ bằng chứng sai ban đầu. Thực hiện sau A1 nếu đủ phạm vi.

### A3: Xe Tăng: đồng hồ câu hỏi ở mobile nhỏ, chưa có cách phóng to

**Quan sát.** `xe-tang-thoi-gian-390-gameplay.png`: đồng hồ trong HUD khoảng 80 px; robot đáp án chữ đủ lớn và vùng chạm tốt. Câu cần phân biệt vạch phút ở màn sau có nguy cơ khó đọc; chưa trực tiếp chơi màn sau, nên đây là rủi ro cần xác minh, không kết luận lỗi mọi câu. Cưỡi Hổ đã có zoom thẻ câu hỏi làm mẫu trong cùng sản phẩm.

**Tiêu chí:** cho phóng to đồng hồ câu hỏi bằng nút/tap và bàn phím, dừng robot/thời gian khi đang đọc; đóng quay lại cùng câu, không tạo điểm/mất tim. Đồng hồ lớn ≥160 px ở 390 px ngang và không che nút đóng.

## Hình ảnh, chuyển động và cảm ứng

- Xe Tăng: nền, robot và xe có style đồng nhất; robot chia 2×2 ở 390 px, đủ phân biệt, thao tác touch vào robot thực sự tạo phản hồi sai. Ưu tiên đường đạn/recoil và phản hồi mục tiêu rõ nhưng ngắn, giữ đen/hồng của hai kim. Không thêm hạt dày che mặt đồng hồ.
- Cưỡi Hổ: vòng lửa/rạp xiếc có cá tính, nhịp nhảy và chuyển cảnh rõ; trên 390 px ba đồng hồ nằm cột phải, còn khoảng trống lớn phía trên. Có thể tăng mặt đồng hồ vòng và giảm trang trí gần con số; ưu tiên chữ và kim trong chế độ ít hiệu ứng.
- Sau sai, dòng “Ái! Nóng quá!” lớn đỏ có tương phản thấp với nền tím và cạnh tranh lời giải; đề xuất thay bằng phản hồi khích lệ ngắn, tập trung vào kim giờ/kim phút, giữ ✓/✕.
- Menu Xe Tăng ở 390×844 cắt chân dòng giải thích tại mép dưới panel nhưng panel cho cuộn (`overflow-y:auto`); không phải nút Chơi bị mất. Ưu tiên thu gọn khoảng cách/nhóm setting, không cần đổi bố cục toàn bộ vì core CTA vẫn rõ.

## Kiểm tra nghi vấn test ngang của Cưỡi Hổ

Test `tests/cuoi-ho.test.js:578` quét chuỗi CSS đến `}\n`; file CRLF có thể làm lát cắt tràn qua media block kế tiếp. Source hiện có `.tap-tip` thu gọn trong `max-height:480px`, chỉ `max-height:360px` mới `display:none`. **Runtime 844×390 thật sự hiển thị mẹo** (ảnh `cuoi-ho-844-gameplay.png`); vì vậy không nên sửa product để giải quyết báo lỗi 480 px của test chuỗi. Ở chiều cao ≤360 px mẹo vẫn bị ẩn theo source, chưa chụp runtime kích cỡ đó; khi làm A1 nên bảo đảm nút tiếp tục luôn có mặt.

## Chạy lại

```powershell
$env:NODE_PATH='C:\Users\son.nguyen\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
node tests/e2e/gauntlet-baseline-action.js
# Chỉ probe landscape:
$env:GAUNTLET_GAME='cuoi-ho'; $env:GAUNTLET_LANDSCAPE='1'
node tests/e2e/gauntlet-baseline-action.js
```

Script là harness quan sát, không phải assertion hồi quy đầy đủ. Mỗi lần chạy có câu ngẫu nhiên nên không bảo đảm lựa chọn đầu tiên sai; dùng cặp ảnh/text đã lưu làm bằng chứng baseline, sau sửa cần E2E có bước xác định đáp án từ nội dung hiển thị và input thật.
