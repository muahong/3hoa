# Gói Xe Tăng Thời Gian / Cưỡi Hổ Vượt Lửa

## Phạm vi và trạng thái bàn giao

Hai game tĩnh giữ nguyên chương trình câu hỏi, khóa localStorage, profile chung và shared navigation `008c677`. Không thêm nút nhảy timing: Cưỡi Hổ vẫn chọn vòng đáp án rồi tự nhảy. Không thêm dependency/asset/network request. Chưa commit hoặc publish từ builder này. Source product đã khóa để reviewer độc lập kiểm tra; kết quả dưới đây là kiểm thử builder, không thay thế acceptance độc lập.

## Thay đổi

- **Xe Tăng:** nút ⤢ / phím Z mở đồng hồ 200 px (160 px khi màn thấp). Dialog tạm ngưng toàn bộ world, giữ câu hỏi/tim/điểm/vị trí robot; native modal + Tab trap; Đóng, Escape, Z hoặc click backdrop đều đóng. Focus về nút mở. Mở zoom/tạm dừng xóa input lái đang giữ. Canvas được vẽ lại thật từ prompt, không clone canvas trắng.
- Nòng quay có giới hạn góc trước khi phóng đạn; target đang chờ và đạn đang bay chặn input trùng. Projectile xuất phát ở đầu nòng (1.07 × size), đi tới đúng robot và chỉ resolve một lần. Giữ chuyển động bánh/xích theo vận tốc, recoil, phản hồi robot và chấm điểm sẵn có.
- HUD ngang thấp ≥700 px chuyển về một hàng, dành đủ chiều dọc cho robot; không thu nhỏ board đáp án hoặc tăng tốc game. Button tối thiểu 44 px, đồng hồ HUD 64 px vẫn có zoom 160 px.
- **Cưỡi Hổ:** sau sai/hết giờ, lời giải và dấu ✓/✕ ở lại đến khi bé chọn “Đã hiểu · Chạy tiếp” hoặc Enter/Space. Nút khóa 0.9 giây sau tiếp đất; key-repeat và tap bên ngoài không bỏ qua; không tự coi chờ lâu là đã hiểu. Chiều cao 360 px vẫn thấy control 44 px. Màn ngang thấp đưa lời giải sang phần trống bên phải để không che cột vòng đúng/sai bên trái.
- Bốn chân dùng khớp gối, thu chân theo pha bay, duỗi trước tiếp đất; body nén nhẹ khi chạm đất, bé cưỡi nghiêng bù theo thân. Chế độ ít hiệu ứng bỏ rung thân lúc bị thương và nén trang trí khi tiếp đất. Phản hồi sai đổi sang “Cùng xem lại nhé!”. Không thay luật tim/điểm/sao hoặc ghi đè đáp án sai ban đầu.
- Cache sau P2: Tank `xe-tang-thoi-gian-v9`, Tiger `cuoi-ho-v9`; không có asset mới cần thêm CORE. Không đụng `profile.js`, generated `game-shell.css`, source generator hay helper dùng chung.

## Bằng chứng gameplay và kiểm thử

`tests/e2e/gauntlet-action-play.e2e.js` chơi bằng nút/touch/keyboard thật. Debug hook chỉ đọc câu hỏi, target, state và storage, không gọi win/start/answer mutator. Bốn khổ **390×844, 1180×820, 820×1180 (reduced motion), 844×390** đã hoàn thành cho cả hai game:

1. Menu → màn 1 → bài học → chơi, pause/resume bằng UI.
2. Cố tình chọn sai một câu rồi hoàn thành màn hợp lệ. Tank tự sửa cùng câu qua input đúng; Tiger đọc lời giải, giữ ≥10 giây không input, tap ngoài không tiếp, đổi sang 640×360 kiểm nút tiếp, rồi tiếp chủ động.
3. Tank: kiểm robot/time/hearts/score không đổi trong zoom; 200 px, Tab, Escape, Z, đóng button/backdrop và rotate modal.
4. Kết quả → hỏi đáp; cố tình sai một câu. Tiger bấm Thử lại và đọc lại đáp án đã xáo trộn trước khi trả lời; Tank đạt 3/4.
5. Lưu rồi reload: toàn bộ `players` khớp; quay lại chơi màn 1 qua UI và pause. Storage mẫu Tank có l1 `passed:true`, `quizBest:3`, 2 sao; Tiger `unlocked:2`, l1 quiz/done true, 2 sao, stats 7 đúng/1 sai. Sai ban đầu còn trong kho ôn với số lần và số lần sửa đúng.

Ảnh và JSON nằm ở `tests/e2e/out/gauntlet/action-refresh/play/`. File theo mẫu `<game>-<width>-gameplay.png`, `-result.png`, `-quiz-wrong.png`, `-quiz-done.png`, `-retry-paused.png`, `-saved.json`, `-evidence.json`; thêm Tank `-zoom.png` / `-zoom-landscape.png`, Tiger `-learn.png` / `-learn-360.png`.

`gauntlet-action-motion.e2e.js` chụp takeoff/aim, air/projectile, landing/hit ở 390/1180; đọc 121 frame liên tiếp kèm input thật để phân biệt chuyển động vẽ với thay đổi state. Trace/ảnh tại `out/gauntlet/action-refresh/motion/`. Screenshot có độ trễ capture; JSON ghi phase/tọa độ/recoil/land theo RAF là bằng chứng nhịp chuyển động.

Hai suite unit hiện **71/71 đạt**, gồm bất biến mới: Tiger giữ học qua 11 giây không thêm lỗi/điểm, tiếp hai lần chỉ tăng một vòng; Tank không snap input, ngắm trước launch, không đạn trùng và đúng đầu nòng. Unit là mô phỏng logic, không gọi đó là chơi thật. Main CRLF normalization trong `tests/cuoi-ho.test.js` được giữ.

Existing E2E được giữ các assertion scoring/storage/content, chỉ đổi setup của Tiger từ giả định auto-continue sang nút DOM explicit. Những test cũ có debug mutator được xem là hồi quy kỹ thuật riêng; chúng không phải bằng chứng full legitimate play nêu trên.

## Performance và giới hạn

BEFORE gốc của workload ở `action-refresh-acceptance.md` và `out/gauntlet/action-refresh/before/` được giữ nguyên. AFTER sẽ dùng đúng harness `gauntlet-action-refresh.e2e.js after`: seed 3060906, DPR 1, 390×844 và 1180×820, 120 RAF intervals, input lái/bắn hoặc chọn sai/nhảy. Không đo chung lúc các suite browser đang chạy để giảm nhiễu.

Chromium headless trên Windows đã kiểm; chưa kiểm iPad/Safari vật lý. Existing visibility test dùng giả lập `document.hidden`/event; không tuyên bố đã chứng minh native tab-background của máy này. Timer ở Tiger vẫn tính thời gian đọc lời giải vào thời gian luyện tập; không có dữ liệu trẻ thật để kết luận hiệu quả học.

Trong probe đầu của Tank 844×390, assertion hoàn thành đủ câu thất bại khi HUD chiếm hai hàng. Ảnh/log intermediate bị harness ghi đè trong vòng sửa, không còn file before riêng để đối chiếu trực tiếp; không dùng baseline gốc a1f0458 làm bằng chứng tái hiện chính xác intermediate. Bản cuối đã hoàn thành đủ màn ở kích thước này và giữ hình/các kiểm tra cuối; paired capture gốc do main làm riêng.

## Sửa P2 sau review độc lập — 2026-09-07

Review chỉ ra phản hồi chọn robot sai tự mất sau 1.8 giây trong lúc robot/thời gian vẫn chạy. Tank đã tái sử dụng dialog đồng hồ làm nhịp đọc cho **onWrong** và **💡 gợi ý**: world/time/robot đứng yên, chữ giữ nguyên đến “Đã đọc · Thử lại” hoặc Enter/Space chủ động. Lần sai đầu vẫn chưa đánh dấu đáp án; lần sai thứ hai và manual hint vẫn chỉ thưởng **20 điểm**, đúng hằng số trước sửa. Không thay luật vỡ tuyến hay dữ liệu chương trình.

Guard 700 ms chống input rơi từ lượt chọn trước; key repeat, Z và backdrop không xác nhận phản hồi học. Escape/P hoặc blur ghi yêu cầu tạm dừng nhưng giữ nguyên dialog; bé xác nhận xong mới sang bảng pause. Zoom thủ công vẫn đóng ngay bằng button/Escape/Z/backdrop như trước. Đổi hướng màn hình không trôi thời gian đọc. Chiều ngang thấp dùng hai cột, hai đồng hồ 160 px và lời giải dài không che nút xác nhận.

Kiểm tra sau P2 (không chạy lại toàn bộ 6 game):

- `tests/xe-tang-thoi-gian.test.js`: **37/37**; thêm assertion hint mở reading hold và `update(12)` không tăng game time.
- `tank-reading.e2e.js`: **4 viewport sạch**; giữ 11 giây, robot tọa độ/thời gian/tim/điểm/message không đổi; first/second wrong; manual hint; reward 20; repeat/backdrop; Escape→ack→pause; rotate 640×360. Màn 390 hoàn thành một ván bằng touch/keyboard thật, hỏi đáp 4/4 và reload progress. Hook chỉ đọc.
- `tank-reading-layout.e2e.js`: **4 case sạch** (844×390, 780×360 × elapsed variants 0/2). Fixture chỉ thay generator bài để luôn gặp câu dài/hai đồng hồ, không gieo điểm/thời gian/win; các bước menu/lesson/hint/ack đều input thật. Cả hai đồng hồ ≥160 px, nút ≥44 px nằm trong viewport, lời giải không chồng nút. Ở 780×360 variant 0: dialog y=26..334, button y=264..324, explanation bottom=243.2.
- Existing Tank E2E **các phiên 1, 8, 9** sạch sau thêm bước DOM acknowledge trước hành động tiếp; giữ nguyên assertion score/hearts/quiz/content/voice. Các phiên khác không chạy lại trong P2. Log cũ in footer “11 phiên” dù ONLY có skip; mã footer đã sửa để ghi chính xác selector.

Ảnh/JSON mới: `tests/e2e/out/gauntlet/tank-reading/` (`<width>-wrong-held.png`, `-second-wrong-hint.png`, `-manual-hint-held.png`, `-reading-360.png`, `780x360-elapsed-0.png`, `780x360-elapsed-2.png`, các JSON cùng tên). Log: `tank-reading-run.log`, `tank-reading-layout.log`, `tank-reading-existing.log` trong `out/gauntlet/`.

Blur trong test layout là **event tổng hợp**, chỉ chứng minh handler; không phải OS tab-background. Tiger giữ nguyên bản đã được review PASS. Builder bàn giao lại Tank để review closure độc lập, không tự kết luận acceptance PASS. Performance AFTER thuộc main: workload key 1 có thể chọn sai rồi vào reading pause, nên phải gắn cờ `clockZoom` và đo thêm correct-shot active workload; không được gọi đoạn world đứng yên là active performance.
