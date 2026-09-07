# Input probes — trước sửa

Ngày 2026-09-06, Windows Chromium headless 145.0.7632.6. Chạy `node tests/e2e/gauntlet-input-probes.js`; thêm slug game làm đối số để chạy một game. Script chỉ đọc state và dùng touch thật, không gọi hàm game để ghi điểm/thắng/thua. Lượt performance cố định PRNG seed 360906, viewport 390×844, DPR 1, context mới.

## Lỗi đã tái hiện

### Tháp Đồng Hồ — P1: kéo/hủy đã làm thả sai

1. Chơi màn Giờ đúng bằng UI.
2. `touchStart` trên cột đồng hồ hiện tại; chưa `touchEnd`.
3. Kéo sang cột kế, sau đó `touchCancel`.

Lượt không seed: trước input `id1 col0 target2 mode=fall`; sau down `mode=hard`; sau move vẫn `col0 mode=hard`; sau cancel 600ms `piece=null, wrong=1`. Lượt seed 360906 lặp lại: `col3 target0` và cùng kết quả sai 1.

Tác động: trẻ bắt đầu kéo từ đồng hồ rồi hủy vẫn bị ghi sai, dù chưa xác nhận thả. Gốc mã: `onCanvasDown` gọi `hardDrop()` nếu `col === p.col`. Đóng lỗi khi touch down không commit, drag từ cột hiện tại đi được, cancel không thả/ghi sai, tap xác nhận có chủ đích vẫn thả đúng.

### Ninja Toán Học — P1: một gesture lấy hai tim

1. Vào Cộng trừ đến 10.
2. Một `touchStart`, giữ ngón; tiếp tục `touchMove` qua hai quả sai nhìn thấy, cách nhau hơn 150ms.
3. Chỉ `touchEnd` sau khi đã ghi nhận.

Lượt đầu cùng câu `7 + 0 = 7`: 328ms `wrong1 hearts2`, 658ms `wrong2 hearts1`, chưa nhấc ngón. Lượt seed cùng câu `7 + 1 = 8`: 372ms `wrong1 hearts2`, 1157ms `wrong2 hearts1`. Gốc mã: `wrongOk` chặn chỉ 150ms qua `blade.lastWrongAt`, không chặn hết vòng đời pointer.

Tác động: một động tác chậm của trẻ có thể lấy 2/3 mạng. Đóng lỗi khi một pointer gesture chỉ ghi tối đa một lỗi trừ tim, vẫn cho phép gesture mới ghi lỗi, không làm sai các quy tắc bom/đáp án đúng/cặp số. Cần test touch cancel và đa chạm riêng.

Phản hồi sai có tồn tại đủ vài giây: lượt đầu còn hiện 3743ms và ẩn 4006ms (tính từ lúc bắt đầu theo dõi, lỗi thứ hai tại 658ms). Không xác nhận lỗi “thẻ biến mất quá nhanh”; vấn đề là game vẫn chạy và nhận thêm lỗi trong khoảng đọc.

## Cửu Chương — quan sát có giới hạn

Gõ `1` → BẮN sai → gõ lại `1` → đợi 1,3s → xóa → gợi ý. Target id2 và câu `16 : 2` giữ nguyên; input và xóa hoạt động, không thấy lỗi đổi target trong mẫu.

Sau sai: `y302.37`, `time1.2166`, `holdUntil1.95`; đang sửa: `y329.95`, `time2.95`, lời mách vẫn hiện. Sau hint: `y337.37`, `time3.4166`, `holdUntil4.50`; 1,65s sau `y363.62`, lời mách vẫn hiện, khiên vẫn 3. Mã gọi `updateMeteors(dt)` trước khi xét `holdUntil`; khoảng hold chỉ hạn chế spawn, không bảo vệ vật thể hiện có khỏi rơi. Không tuyên bố đã tái hiện mất khiên sát đáy.

Điều kiện cho gói cải thiện đọc: đủ thời gian đọc mà không rơi/mất khiên, target/input ổn định; trả lời xong trả nhịp rơi bình thường, không treo game.

Một lần `locator.tap` timeout vì nút BẮN có animation liên tục (Playwright chờ “stable”). Đây là giới hạn harness, không kết luận nút người dùng không bấm được. Đã chuyển sang touchscreen tap tại tâm DOM bounding box; lượt sau hoạt động.

## Snapshot hiệu năng trước sửa

Đo 119 khoảng requestAnimationFrame sau thao tác thật; game vẫn chạy/phản hồi đang tồn tại. Load đo từ Navigation Timing, gồm tải tài nguyên ngoài. Đây là một mẫu trên cùng Windows, có thể nhiễu do tải máy/mạng; không suy hiệu năng iPad thật. PRNG giữ luồng random giống nhau nhưng vật thể có thể khác vị trí do thời điểm frame/input.

| Game | DCL ms | Load ms | Median frame ms | P95 frame ms | Frame >33,4ms |
|---|---:|---:|---:|---:|---:|
| Tháp | 1382.1 | 1806.3 | 16.7 | 16.7 | 0/119 |
| Ninja | 1753.7 | 2376.3 | 16.7 | 33.3 | 3/119 |
| Cửu Chương | 1524.3 | 2048.5 | 16.7 | 16.8 | 0/119 |

Chạy lại cùng script/seed/viewport/DPR sau sửa và ghi kết quả cạnh bảng này. Không lấy thay đổi load một mẫu làm bằng chứng tối ưu.
