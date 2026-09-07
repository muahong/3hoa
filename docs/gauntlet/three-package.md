# Gói Ninja, Vệ Binh Cửu Chương và Tháp Đồng Hồ

## Kết quả thay đổi

- **Ninja:** một gesture pointer chỉ có một lần trừ tim, kể cả đường vuốt kéo dài qua nhiều quả sai. Cùng nhóm quả có bom vẫn ưu tiên bom; gesture đã bị trừ tim không trừ thêm vì bom sau đó. Sau lỗi, quả và timer dừng 3,5–9 giây theo độ dài lời giải, nhãn “⏸ Đọc cách làm” giải thích trạng thái. Hủy/nhấc ngoài canvas và mất pointer capture kết thúc gesture; pause/blur xóa gesture. Menu phone thu icon/khoảng trống để nút về trang chủ còn nằm trong bảng.
- **Cửu Chương:** đọc lời mách sau sai, hint, reveal và va khiên dừng mọi meteor và timer. Trẻ vẫn nhập/xóa/bắn để sửa; đúng thì tiếp tục ngay. Hint giữ target có chủ đích, không chuyển tự động trong khoảng đọc; có nhãn đọc trên HUD. Không sửa scoring, dữ liệu tiến trình hay nội dung toán.
- **Tháp:** first tap chỉ chọn, kể cả cột spawn. Ghost có viền sáng thể hiện nơi đáp; tap thứ hai xác nhận ở pointerup. Drag, pointercancel, mất capture và nhấc ngoài board không thả. Pause xóa lựa chọn đang giữ. Phím/nút THẢ giữ hành vi trực tiếp.

Giữ `js/profile.js`, shared navigation và generated `game-shell.css`. Cache game tăng Ninja v7→v8, Cửu Chương v5→v6, Tháp v7→v8; không có asset mới cần thêm CORE. Không commit/push.

### Đóng lỗi reviewer: thông báo xoay máy che câu hỏi (2026-09-07)

Reviewer tái hiện Ninja portrait→844×390 tự pause rồi bấm chơi tiếp ngay: toast xoay máy còn che phương trình trong khi ván chạy. `resumeGame()` nay hủy/ẩn toast tạm thời ngay lập tức; lần gọi toast mới tự hiện lại bình thường. Dải lời giải `hud-hint` riêng được giữ nguyên. Cache Ninja tăng tiếp v8→v9.

Targeted regression `gauntlet-ninja-rotation.e2e.js` đạt: lượt cuối resume sau43ms (toast cũ vẫn còn hạn), DOM xác nhận toast không visible ngay; ảnh chụp sau450ms để bảng pause hoàn tất fadeout, phương trình không bị toast che. Touch swipe đúng sau resume hoạt động. Xoay lại portrait trong khoảng đọc sau swipe sai, resume sau438ms vẫn giữ nguyên lời giải và timer đứng yên. Không set game state/score; xoay bằng viewport thật, click nút và touch input. Không chạy lại các game khác cho thay đổi này. Evidence: `ninja-rotation-closure.json`, `ninja-landscape-immediate-resume.png`, `ninja-reading-portrait-immediate-resume.png` trong thư mục three-package. Chờ reviewer xác nhận đóng lỗi độc lập.

## Nghiệm thu bằng input thật

Script `tests/e2e/gauntlet-three.e2e.js` chỉ đọc debug state để định vị vật thể đang vẽ và chọn đáp án. Input đi qua touch, mouse/key hoặc nút DOM. Không set điểm, state, thắng/thua, không gọi hàm game để trả lời. PRNG seed360906; viewport/DPR ghi trong từng JSON.

| Game | Vòng thật trên phone390×844 | Lưu/tiếp tục |
|---|---|---|
| Ninja | Ván60s thực: 33 đúng,1 sai,13350điểm,3sao | Lưu tênGauntlet, retry, reload còn stats1ván |
| Cửu Chương | Ván60s thực: 54 đúng,1 sai,22800điểm,3sao | Retry, reload còn stats1ván |
| Tháp | Màn1: 8đúng,1sai,2100điểm,2sao; quiz3/3 | Mở khóa màn2, replay, reload giữ unlocked2 |

Kết quả vòng thật nằm trong `tests/e2e/out/gauntlet/three-package/*-phone-full-round.json`. Có đọc answer từ debug object để chọn input; đây là kiểm thử máy, không phải quan sát trẻ tự giải.

Matrix 12/12 tổ hợp (3game × 390×844,1180×820,820×1180,844×390) qua input đúng/sai, pause/resume, geometry không tràn ngang và vùng chạm DOM tối thiểu44px. Kết quả: `matrix.log`. `blur` được dispatch như fixture lifecycle, không giả rằng đã thử tab thật trên iPad. Hai probe bổ sung `cc-hint-smoke.log`, `tower-outside-smoke.log` xác nhận hint freeze và ngoài-board release.

## Legacy và unit

- 82/82 unit tests ba game đạt, `unit-final.log`.
- Tháp: toàn bộ legacy E2E đạt, `legacy-tower.log`.
- Cửu Chương: 15/16 khối đạt lượt đầu; khối2 chờ2,5s cũ thay bằng chờ hết readLeft; khối2 chạy lại đạt (`legacy-cuu-chuong-rerun2.log`). Legacy dùng fixture/hook để set state trong nhiều case, không dùng làm bằng chứng chơi thắng thật.
- Ninja: toàn bộ legacy đã chạy. Các lỗi fixture/kiểm tra cũ được xử lý và rerun: khối5 chờ hết reading trước dựng bom, khối6 dùng seed và cửa sổ24câu cho review xác suất1/4; khối10 đo số dòng chữ thực thay vì giả định mọi font phải dưới32px; khối14 menu recordfixture có footer về trang chủ bị cắt nên thu bố cục phone. Khối5,6 và10,14 rerun đạt; mọi khối khác đạt ở fullrun. Logs giữ cả lần đầu và rerun, không xóa thất bại.

Chạy lại:

```powershell
$env:NODE_PATH='C:\Users\son.nguyen\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
node --test tests/math-ninja.test.js tests/cuu-chuong.test.js tests/thap-dong-ho.test.js
node tests/e2e/gauntlet-three.e2e.js
node tests/e2e/math-ninja.e2e.js
node tests/e2e/cuu-chuong.e2e.js
node tests/e2e/thap-dong-ho.e2e.js
```

## Ảnh và giới hạn

Thư mục AFTER: `tests/e2e/out/gauntlet/three-package/`. Mẫu tên `{game}-{phone|desktop|tablet|landscape}-{menu|gameplay|feedback|after-input}.png`; phone có thêm `results`, Tháp có `lesson`, `quiz-complete`. Ảnh cũ trong `baseline-three` được giữ nguyên. Baseline cũ không fixedseed, không gọi chúng là A/B matched; main phụ trách capture so sánh từ revision baseline riêng.

Chỉ kiểm Windows Chromium/emulation, không Safari/iPad thật. Chưa kết luận hiệu năng thiết bị thật hoặc trẻ thích mỹ thuật nào. Các thay đổi cần reviewer độc lập sau khi khóa source; báo cáo này không tự nhận reviewer đã chấp nhận.

## Hiệu năng

Baseline seed360906/390×844/DPR1 và119 khoảng RAF được ghi trong `input-probes.md`. AFTER dùng cùng `gauntlet-input-probes.js`. File `performance-after.log` lưu kết quả Navigation Timing và tổng hợp frame intervals. `performance-before.json` chép số đo baseline đã được ghi trong output probe đầu, có ghi provenance; `performance-after.json` trích nguyên kết quả từ log cuối. Không phải mọi frame raw đều được lưu.

| Game | BEFORE DCL/load ms | AFTER DCL/load ms | BEFORE median/P95 ms | AFTER median/P95 ms | >33,4ms trước→sau |
|---|---|---|---|---|---|
| Tháp |1382,1 /1806,3|527,6 /630,2|16,7 /16,7|16,7 /16,7|0→0 /119|
| Ninja |1753,7 /2376,3|441,7 /540,1|16,7 /33,3|16,7 /16,7|3→0 /119|
| Cửu Chương |1524,3 /2048,5|714,2 /802,4|16,7 /16,8|16,7 /16,8|0→0 /119|

Lượt AFTER có tải nền được main báo: Tiger legacy/motion trace và Tank legacy ở giai đoạn kết thúc; unit82case cũng chạy gần đầu lượt đo. Vì vậy không gọi đây là máy hoàn toàn rảnh hoặc kết luận tốc độ tăng. Không thấy hồi quy P95 trong mẫu; main có thể serialize lại sau khóa mọi source. Load gồm font/network và khác trạng thái cache mạng, không xem một mẫu load nhanh hơn là tối ưu đã chứng minh. Cùng input script nhưng trạng thái sau thao tác khác vì lỗi đã sửa (ví dụ Tháp sau cancel còn piece rơi), nên đây không phải benchmark cảnh vật thể tuyệt đối giống nhau.

Lệnh đo riêng (không cần chạy fullround):

```powershell
node tests/e2e/gauntlet-input-probes.js *> tests/e2e/out/gauntlet/three-package/performance-after.log
```
