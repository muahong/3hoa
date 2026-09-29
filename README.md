# 3hoa.com

Trò chơi học Toán miễn phí cho bé lớp 1 đến lớp 3, chơi tốt trên iPad. Website tĩnh, phục vụ bằng GitHub Pages
(nhánh `main`, thư mục gốc; `CNAME` = `3hoa.com`; `.nojekyll` để Pages không chạy Jekyll). Không có bước build,
không phụ thuộc npm khi chạy, không CDN, không gọi dịch vụ bên ngoài (phông "Baloo 2" tự lưu trong `fonts/`).
Không tài khoản, không quảng cáo, không công cụ phân tích; dữ liệu của bé chỉ nằm trên máy (xem `/rieng-tu/`).

## Các trò chơi

- `/` – trang chủ (liên kết tới các game)
- `/math-ninja/` – **Ninja Toán Học**: game chém trái cây học cộng trừ cho bé lớp 1–3 (xem `math-ninja/README.md`)
- `/cuu-chuong/` – **Vệ Binh Cửu Chương**: game bắn thiên thạch học bảng nhân, bảng chia cho bé lớp 2–3 (xem `cuu-chuong/README.md`)
- `/me-cung-dong-ho/` – **Mê Cung Đồng Hồ**: game mê cung kiểu Pacman học xem đồng hồ cho bé lớp 2–3, có bài học và hỏi đáp sau mỗi màn (xem `me-cung-dong-ho/README.md`)
- `/thap-dong-ho/` – **Tháp Đồng Hồ**: game xếp đồng hồ kiểu Tetris học xem giờ cho bé lớp 2–3, có bài học và hỏi đáp sau mỗi màn (xem `thap-dong-ho/README.md`)
- `/xe-tang-thoi-gian/` – **Xe Tăng Thời Gian**: game xe tăng bắn robot học xem đồng hồ cho bé lớp 2–3, mỗi màn có bài học và phần hỏi đáp để mở khóa màn sau (xem `xe-tang-thoi-gian/README.md`)
- `/cuoi-ho/` – **Cưỡi Hổ Vượt Lửa**: game cưỡi hổ nhảy qua vòng lửa học xem đồng hồ, tính thời gian cho bé lớp 2–3; mỗi màn có bài học, vượt vòng lửa và hỏi đáp để mở khóa màn tiếp (xem `cuoi-ho/README.md`)
- `/dao-khung-long/` – **Đảo Khủng Long**: game Toán lớp 2 theo SGK Kết nối tri thức. Bé có hồ sơ riêng (tên, tuổi, lớp), nuôi khủng long bằng câu trả lời đúng, đi qua 10 vùng đất và 2 đấu trường với 12 kiểu chơi (có cả 6 game trên chạy trong đảo); ghi nhật ký từng thao tác, Góc phụ huynh xem tới từng câu sai và xuất dữ liệu cho trợ lý AI (xem `dao-khung-long/README.md`)

## Cấu trúc thư mục

- `index.html` – trang chủ: chip người chơi, lời chào theo tên, thẻ từng game với sao / màn đã qua / kỷ lục của bé đang chơi, nút "Chơi tiếp" và "Chơi ngẫu nhiên" (cả 7 trò, gồm Đảo Khủng Long). Có JSON-LD (`WebSite` + `ItemList` gồm 7 `LearningResource`) cho công cụ tìm kiếm: `<script type="application/ld+json">` là dữ liệu, không chạy, nên vẫn hợp với CSP `script-src 'self'`.
- `rieng-tu/index.html` – trang quyền riêng tư cho phụ huynh (không tài khoản, không máy chủ, dữ liệu nằm ở đâu, cách xóa, sao lưu), dùng chung `css/main.css`. Có liên kết ở chân trang chủ, mục phụ huynh và trang 404.
- `css/main.css` – giao diện trang chủ (cùng ngôn ngữ hình ảnh với các game: Baloo 2, bảng trắng bo góc, nút tròn có bóng 3D).
- `js/profile.js` – **bản gốc** của mô-đun hồ sơ người chơi dùng chung (`window.Players`), kèm cổng phụ huynh dùng chung (`Players.gateQuestion`, `gateCheck`, `gateLockedSeconds`: câu mới sau mỗi lần sai, khóa tạm sau 3 lần sai, mã bố mẹ đặt trong Góc phụ huynh của Đảo Khủng Long; khóa `3hoa-ma-bo-me-v1`, `3hoa-cong-khoa-v1`) và lớp phủ hết giờ chơi khi phụ huynh bật trong đảo (`Players.dailyLockActive`, khóa `3hoa-het-gio-v1`). Được **sao chép nguyên văn** vào `<game>/js/profile.js` của từng game (mỗi game phải tự chứa, không import chéo thư mục). Khi sửa tệp này, sao chép lại vào cả 6 game.
- `js/hub.js` – logic trang chủ: chip/hộp thoại người chơi, đọc tiến trình từ localStorage của các game (**chỉ đọc** khi vẽ), đọc bản tóm tắt `dkl-tom-tat-v1` của Đảo Khủng Long cho thẻ đảo, cổng phụ huynh khi xóa một bạn (ngoại lệ ghi duy nhất: xóa `players[<id>]` của bạn đó trong khóa của 6 game), đăng ký `sw-home.js`.
- `sw-home.js` – service worker của trang chủ (xem mục "Service worker" bên dưới).
- `images/` – `favicon.svg` (nguồn) và các PNG sinh từ nó (`favicon-32.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`), `og.jpg` (ảnh chia sẻ 1200×630 với biểu tượng của 7 trò, JPEG cho nhẹ), `the-<game>.webp` (hình thẻ trò chơi trên trang chủ, 240 đến 256 px, mỗi tệp dưới 15 KB; sinh bằng Pillow từ `icons/icon-512.png` của game, riêng xe tăng và cưỡi hổ từ hình nhân vật trong `assets/`). Trang chủ không dùng thẳng hình trong thư mục game.
- `fonts/` – phông Baloo 2 (SIL OFL) tự lưu: `baloo-2.css` và các tệp `.woff2`. Trang chủ, 404 và `rieng-tu/` nạp `fonts/baloo-2.css`; CSP không còn `fonts.googleapis.com` / `fonts.gstatic.com`.
- `manifest.json`, `404.html`, `robots.txt`, `sitemap.xml` – tệp PWA / SEO của trang chủ. `manifest.json` có lối tắt tới cả 7 trò; `robots.txt` chặn `/docs/`, `/tests/`, `/scripts/`, `/out/`; `sitemap.xml` có cả `/rieng-tu/` (nhớ sửa `lastmod` khi đổi trang).
- `.github/workflows/test.yml` – GitHub Actions chạy `node tests/run.js` (Node 22, không cần `npm install`) mỗi lần đẩy và mỗi pull request.
- `tests/` – kiểm thử (xem bên dưới).
- Mỗi game là một thư mục tự chứa: `index.html`, `style.css`, `js/*.js` (gồm bản sao `profile.js`), `sw.js`, `manifest.json`, `icons/`, `README.md`.

## Hồ sơ người chơi dùng chung

Nhiều bé dùng chung một máy: mỗi bé có tên, hình đại diện và tiến trình riêng, chọn tên một lần là dùng cho mọi game.

- Khóa localStorage `3hoa-players-v1` (chung cho mọi game trên cùng tên miền), dạng `{ v, active, players: [{ id, name, avatar, created, updated }] }`.
- Tối đa 8 bé, tên 1–16 ký tự (đã lọc ký tự điều khiển và `<>`), hình đại diện chọn trong danh sách `Players.AVATARS`.
- Tiến trình của mỗi game nằm dưới `players[<id>]` trong khóa riêng của game đó (xem bảng dưới).
- Trang chủ chỉ **đọc** các khóa của game để hiện sao / màn / kỷ lục; việc ghi tiến trình chỉ xảy ra trong từng game. Ngoại lệ: xóa một bạn trên trang chủ (sau cổng phụ huynh) bỏ tên khỏi danh sách **và** xóa `players[<id>]` của bạn đó trong khóa của 6 game (đọc, sửa, ghi lại từng khóa, giữ các bé khác và thiết lập thiết bị; khóa hỏng thì để nguyên). Hồ sơ trên Đảo Khủng Long là riêng, không bị xóa theo; xóa trong Góc phụ huynh của đảo.

## Lưu trữ (localStorage)

| Game | Khóa |
|---|---|
| `math-ninja` | `ninja-toan-v1` |
| `cuu-chuong` | `cuu-chuong-v1` |
| `me-cung-dong-ho` | `me-cung-dong-ho-v1` |
| `thap-dong-ho` | `thap-dong-ho-v1` |
| `xe-tang-thoi-gian` | `xe-tang-thoi-gian-v1` |
| `cuoi-ho` | `cuoi-ho-v1` |

`dao-khung-long` không dùng các khóa trên: hồ sơ bé và nhật ký nằm trong IndexedDB `dao-khung-long` (các kho `ho_so`, `su_kien`, `tom_tat_cau`, `tom_tat_van`, `ho_so_hoc_tap`), cộng vài khóa localStorage nhỏ `dkl-*` (xem `dao-khung-long/README.md`). Game chỉ đọc tên bé từ `3hoa-players-v1` để gợi ý khi tạo hồ sơ.
Đảo ghi thêm bản tóm tắt `dkl-tom-tat-v1` = `{ v: 1, luc: ISO, be: [{ ten, qua_mong, man_xong, sao }] }` để trang chủ đọc: thẻ đảo hiện sao, màn xong, quả mọng của bé trên đảo **trùng tên** với bé đang chơi ở trang chủ (so không phân biệt hoa thường, dấu, khoảng trắng thừa), nếu không có thì "N bé đang nuôi khủng long", nếu không có tóm tắt thì câu giới thiệu. "Chơi tiếp" so `luc` của đảo với `stats.last` của 6 game.

Trong mỗi khóa: thiết lập thiết bị (`sound`, `music`, `voice`, `fx`, …) ở gốc; tiến trình (màn, sao, kỷ lục, `missed`, `stats`) dưới `players[<id>]`.
Dữ liệu cũ (tiến trình ở gốc) được game tự di trú vào `players.p1` (bé mặc định) khi mở game lần đầu sau cập nhật – không mất tiến trình.
Mọi dữ liệu đọc từ localStorage đều được kiểm tra kiểu / khoảng và lọc khóa `__proto__`, `constructor`, `prototype` khi parse JSON.

## Kiểm thử

Kiểm thử logic chỉ cần **Node 22** (không cần `npm install`); GitHub Actions chạy đúng lệnh này ở mỗi lần đẩy và pull request (`.github/workflows/test.yml`).
Kiểm thử đầu-cuối cần thêm Playwright (Chromium): cài một lần ở đâu đó (ví dụ `npm i -g playwright && npx playwright install chromium`) rồi trỏ `NODE_PATH` tới thư mục `node_modules` chứa nó.

```bash
node tests/run.js                                              # mọi kiểm thử logic tests/*.test.js (node --test)
node --test tests/hub.test.js tests/hub-nhom-g.test.js         # riêng trang chủ: đọc tiến trình, thẻ đảo, xóa một bạn, dữ liệu hỏng/độc hại
node --test tests/hub-nhom-g-sw.test.js                        # sw-home.js: bỏ qua mọi đường dẫn của game, cache, ngoại tuyến
NODE_PATH="$(npm root -g)" node tests/e2e/hub.e2e.js           # đầu-cuối trang chủ (3 khổ màn hình, ảnh chụp ra tests/e2e/out/root/)
NODE_PATH="$(npm root -g)" node tests/e2e/<game>.e2e.js        # đầu-cuối từng game (ảnh chụp ra tests/e2e/out/<game>/)
```

- `tests/lib/load.js` nạp các mô-đun của game vào một `window` giả (không cần trình duyệt); `tests/e2e/lib/browser.js` phục vụ thư mục gốc và mở trang bằng Chromium (`withGame(dir, fn, { viewport, initScript, reducedMotion })`). `tests/e2e/lib/playwright.js` tìm Playwright qua `require('playwright')` hoặc biến môi trường `PLAYWRIGHT_MODULE` (đường dẫn tới gói Playwright, ví dụ gói đi kèm Playwright cho Python).
- Sandbox cũ của dự án có sẵn Node 22 và Playwright ở `/opt/node22`: dùng `NODE_PATH=/opt/node22/lib/node_modules` thay cho `$(npm root -g)`.

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

`game-shell.css` của từng game được sinh từ `scripts/refresh-games.py`. Sửa nguồn Python rồi chạy `python scripts/refresh-games.py`; script đồng bộ đường về trang chủ, thêm CSS vào CORE và tăng cache chỉ khi output thay đổi. Không sửa trực tiếp CSS được sinh. Các game vẫn tự chứa, mỗi game một service worker riêng.

Script cũng sinh phần chung của 7 `sw.js` (6 game và đảo, phần sau dòng đánh dấu: mạng trước có hạn 3 giây, `no-cache`, `ignoreSearch` cho trang, ảnh và phông lấy bộ nhớ đệm trước) và ghi dòng `// noi-dung: <hash>` của các tệp lưu sẵn, tự tăng `CACHE` khi nội dung đổi. **Trước khi deploy, sửa tệp nào của game (kể cả đảo) cũng chạy `python scripts/refresh-games.py`**; quên thì `node tests/run.js` báo lỗi. Tệp mới thì thêm vào `CORE` hoặc `OPTIONAL` của `sw.js` trước khi chạy. Mỗi game có `og.jpg` 1200x630 cho thẻ chia sẻ.

## Service worker

- Mỗi game đăng ký `sw.js` của mình, phạm vi là thư mục game (ví dụ `/math-ninja/`).
- Trang chủ đăng ký `/sw-home.js`, phạm vi `/`, để mở được trang chủ khi ngoại tuyến (iPad, đã thêm vào màn hình chính).
- **Quy tắc phạm vi dài nhất**: khi một trang có nhiều đăng ký khớp, trình duyệt chọn đăng ký có phạm vi khớp dài nhất. `/math-ninja/…` luôn thuộc service worker của Ninja (khi nó đã đăng ký), không thuộc `sw-home.js`. Lần đầu mở một game (game chưa kịp đăng ký), trang game thuộc phạm vi `/` của `sw-home.js`.
- **Đi thẳng qua**: `sw-home.js` chỉ gọi `respondWith` cho tệp của trang chủ trong danh sách `CORE` (trang chủ, `rieng-tu/`, `404.html`, `css/main.css`, `js/hub.js`, `js/profile.js`, `fonts/*`, `images/*` dùng trên trang chủ, `manifest.json`). Mọi đường dẫn dưới 7 thư mục game, `/docs/`, `/tests/`, `/scripts/`, `/out/` và mọi thứ khác đi thẳng ra mạng như khi không có service worker, nên trường hợp "lần đầu" ở trên vẫn chạy như cũ rồi game tự đăng ký.
- `activate` chỉ xóa cache có tiền tố `3hoa-home-` (CacheStorage dùng chung cả tên miền, không được đụng cache của game).
- Trang, CSS, JS, manifest: mạng trước (chờ tối đa 3 giây) rồi mới dùng bản đã lưu, nên sửa trang chủ và đẩy lên là bé thấy ngay khi có mạng. Phông và hình: dùng bản đã lưu, cập nhật lại ở nền.
- Tăng `CACHE` trong `sw-home.js` (ví dụ `3hoa-home-v1` → `3hoa-home-v2`) khi thêm / bớt tệp trong `CORE`, hoặc khi đổi một hình / phông mà muốn máy của bé nhận ngay.

## Triển khai

1. Sửa file rồi `git push` lên nhánh `main`; GitHub Pages tự triển khai sau khoảng 1 phút.
2. **Khi đổi bất kỳ file nào của một game, nhớ tăng `CACHE` trong `sw.js` của game đó** (ví dụ `cuoi-ho-v1` → `cuoi-ho-v2`) và thêm tệp mới vào danh sách `CORE`, nếu không máy của bé vẫn chạy bản cũ trong bộ nhớ đệm.
3. Trang chủ: HTML, CSS, JS cập nhật ngay khi có mạng (service worker `sw-home.js` lấy mạng trước); khi đổi danh sách tệp, hình hay phông của trang chủ thì tăng `CACHE` trong `sw-home.js`. Ảnh chia sẻ / icon nằm trong `images/` (sinh lại từ `favicon.svg` khi đổi logo).
4. Google Search Console: xác minh tên miền bằng bản ghi DNS TXT (ở GoDaddy), không cần sửa tệp nào trong repo. Trang không nhúng công cụ phân tích nào; muốn thêm thì cần tài khoản của chủ trang và phải sửa CSP, trang quyền riêng tư.
