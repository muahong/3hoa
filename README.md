# 3hoa.com

Trò chơi học Toán miễn phí cho bé lớp 1 đến lớp 3, chơi tốt trên iPad. Website tĩnh, phục vụ bằng GitHub Pages
(nhánh `main`, thư mục gốc; `CNAME` = `3hoa.com`; `.nojekyll` để Pages không chạy Jekyll). Không có bước build,
không phụ thuộc npm khi chạy, không CDN (chỉ tải font "Baloo 2" từ Google Fonts, có font dự phòng cục bộ).

## Các trò chơi

- `/` – trang chủ (liên kết tới các game)
- `/math-ninja/` – **Ninja Toán Học**: game chém trái cây học cộng trừ cho bé lớp 1–3 (xem `math-ninja/README.md`)
- `/cuu-chuong/` – **Vệ Binh Cửu Chương**: game bắn thiên thạch học bảng nhân, bảng chia cho bé lớp 2–3 (xem `cuu-chuong/README.md`)
- `/me-cung-dong-ho/` – **Mê Cung Đồng Hồ**: game mê cung kiểu Pacman học xem đồng hồ cho bé lớp 2–3, có bài học và hỏi đáp sau mỗi màn (xem `me-cung-dong-ho/README.md`)
- `/thap-dong-ho/` – **Tháp Đồng Hồ**: game xếp đồng hồ kiểu Tetris học xem giờ cho bé lớp 2–3, có bài học và hỏi đáp sau mỗi màn (xem `thap-dong-ho/README.md`)
- `/xe-tang-thoi-gian/` – **Xe Tăng Thời Gian**: game xe tăng bắn robot học xem đồng hồ cho bé lớp 2–3, mỗi màn có bài học và phần hỏi đáp để mở khóa màn sau (xem `xe-tang-thoi-gian/README.md`)
- `/cuoi-ho/` – **Cưỡi Hổ Vượt Lửa**: game cưỡi hổ nhảy qua vòng lửa học xem đồng hồ, tính thời gian cho bé lớp 2–3; mỗi màn có bài học, vượt vòng lửa và hỏi đáp để mở khóa màn tiếp (xem `cuoi-ho/README.md`)

## Cấu trúc thư mục

- `index.html` – trang chủ: chip người chơi, lời chào theo tên, thẻ từng game với sao / màn đã qua / kỷ lục của bé đang chơi, nút "Chơi tiếp".
- `css/main.css` – giao diện trang chủ (cùng ngôn ngữ hình ảnh với các game: Baloo 2, bảng trắng bo góc, nút tròn có bóng 3D).
- `js/profile.js` – **bản gốc** của mô-đun hồ sơ người chơi dùng chung (`window.Players`). Được **sao chép nguyên văn** vào `<game>/js/profile.js` của từng game (mỗi game phải tự chứa, không import chéo thư mục). Khi sửa tệp này, sao chép lại vào cả 6 game.
- `js/hub.js` – logic trang chủ: chip/hộp thoại người chơi, đọc tiến trình từ localStorage của các game (**chỉ đọc**, không bao giờ ghi vào khóa của game), cổng phụ huynh khi xóa một bạn.
- `images/` – `favicon.svg` (nguồn) và các PNG sinh từ nó (`favicon-32.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`), `og.jpg` (ảnh chia sẻ 1200×630, JPEG cho nhẹ).
- `manifest.json`, `404.html`, `robots.txt`, `sitemap.xml` – tệp PWA / SEO của trang chủ. Trang chủ **không** có service worker (mỗi game tự đăng ký service worker trong thư mục của mình; một service worker ở gốc sẽ che mất chúng).
- `tests/` – kiểm thử (xem bên dưới).
- Mỗi game là một thư mục tự chứa: `index.html`, `style.css`, `js/*.js` (gồm bản sao `profile.js`), `sw.js`, `manifest.json`, `icons/`, `README.md`.

## Hồ sơ người chơi dùng chung

Nhiều bé dùng chung một máy: mỗi bé có tên, hình đại diện và tiến trình riêng, chọn tên một lần là dùng cho mọi game.

- Khóa localStorage `3hoa-players-v1` (chung cho mọi game trên cùng tên miền), dạng `{ v, active, players: [{ id, name, avatar, created, updated }] }`.
- Tối đa 8 bé, tên 1–16 ký tự (đã lọc ký tự điều khiển và `<>`), hình đại diện chọn trong danh sách `Players.AVATARS`.
- Tiến trình của mỗi game nằm dưới `players[<id>]` trong khóa riêng của game đó (xem bảng dưới).
- Trang chủ chỉ **đọc** các khóa của game để hiện sao / màn / kỷ lục; việc ghi tiến trình chỉ xảy ra trong từng game. Xóa một bạn trên trang chủ chỉ bỏ tên khỏi danh sách (sau cổng phụ huynh); tiến trình trong game vẫn còn cho tới khi phụ huynh xóa trong game.

## Lưu trữ (localStorage)

| Game | Khóa |
|---|---|
| `math-ninja` | `ninja-toan-v1` |
| `cuu-chuong` | `cuu-chuong-v1` |
| `me-cung-dong-ho` | `me-cung-dong-ho-v1` |
| `thap-dong-ho` | `thap-dong-ho-v1` |
| `xe-tang-thoi-gian` | `xe-tang-thoi-gian-v1` |
| `cuoi-ho` | `cuoi-ho-v1` |

Trong mỗi khóa: thiết lập thiết bị (`sound`, `music`, `voice`, `fx`, …) ở gốc; tiến trình (màn, sao, kỷ lục, `missed`, `stats`) dưới `players[<id>]`.
Dữ liệu cũ (tiến trình ở gốc) được game tự di trú vào `players.p1` (bé mặc định) khi mở game lần đầu sau cập nhật – không mất tiến trình.
Mọi dữ liệu đọc từ localStorage đều được kiểm tra kiểu / khoảng và lọc khóa `__proto__`, `constructor`, `prototype` khi parse JSON.

## Kiểm thử

Cần Node 22 và Playwright (Chromium). Không cần cài thêm gì trong sandbox chuẩn (`NODE_PATH=/opt/node22/lib/node_modules`).

```bash
node tests/run.js                                              # mọi kiểm thử logic tests/*.test.js (node --test)
node --test tests/hub.test.js                                  # riêng trang chủ: đọc tiến trình, dữ liệu hỏng/độc hại, không ghi
NODE_PATH=/opt/node22/lib/node_modules node tests/e2e/hub.e2e.js        # đầu-cuối trang chủ (3 khổ màn hình, ảnh chụp ra tests/e2e/out/root/)
NODE_PATH=/opt/node22/lib/node_modules node tests/e2e/<game>.e2e.js     # đầu-cuối từng game (ảnh chụp ra tests/e2e/out/<game>/)
```

- `tests/lib/load.js` nạp các mô-đun của game vào một `window` giả (không cần trình duyệt); `tests/e2e/lib/browser.js` phục vụ thư mục gốc và mở trang bằng Chromium (`withGame(dir, fn, { viewport, initScript, reducedMotion })`).
- Trong sandbox không có mạng nên yêu cầu tới Google Fonts thất bại – đó là bình thường, bộ kiểm thử đã bỏ qua lỗi này; giao diện dùng font dự phòng.

### Windows / Codex desktop

Đợt kiểm tra 2026-09-06 dùng Node 22.23.2 và Chromium có sẵn trong runtime Codex. Đường dẫn có thể thay đổi giữa các máy; kiểm tra trước khi chạy:

```powershell
$env:NODE_PATH = 'C:\Users\son.nguyen\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
node -e "console.log(require('playwright').chromium.executablePath())"
node tests/run.js
node tests/e2e/hub.e2e.js
node tests/e2e/gauntlet-matrix.e2e.js
node tests/e2e/gauntlet-cache.e2e.js
python -m http.server 8787 --bind 127.0.0.1
```

Mở `http://127.0.0.1:8787/docs/gauntlet/preview.html` để xem bản review local. `docs/gauntlet/status.md` ghi phạm vi thực sự đạt, phần còn mở và các lệnh kiểm tra. `gauntlet-cache.e2e.js` phục vụ bản baseline từ Git rồi cập nhật sang working tree trong context riêng, không dùng hồ sơ browser của người dùng.

`game-shell.css` của từng game được sinh từ `scripts/refresh-games.py`. Sửa nguồn Python rồi chạy `python scripts/refresh-games.py`; script đồng bộ đường về trang chủ, thêm CSS vào CORE và tăng cache chỉ khi output thay đổi. Không sửa trực tiếp CSS được sinh. Các game vẫn tự chứa và trang chủ vẫn không có service worker.

## Triển khai

1. Sửa file rồi `git push` lên nhánh `main`; GitHub Pages tự triển khai sau khoảng 1 phút.
2. **Khi đổi bất kỳ file nào của một game, nhớ tăng `CACHE` trong `sw.js` của game đó** (ví dụ `cuoi-ho-v1` → `cuoi-ho-v2`) và thêm tệp mới vào danh sách `CORE`, nếu không máy của bé vẫn chạy bản cũ trong bộ nhớ đệm.
3. Trang chủ không có service worker nên cập nhật ngay; ảnh chia sẻ / icon nằm trong `images/` (sinh lại từ `favicon.svg` khi đổi logo).
