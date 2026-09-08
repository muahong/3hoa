# Chẩn đoán cache final: 2026-09-07

## Kết quả có thể xác nhận

Không sửa product. Lượt cuối chạy cùng một process cho **Tháp → Xe Tăng → Cưỡi Hổ** đã PASS cả ba, exit0, Chromium151.0.7922.34. Giữ nguyên mọi assertion: cache thực đổi từ baselinea1f0458, đủ toàn bộCORE (gồm game-shell.css), offline reload/menu, hai hồ sơ lịch sử chọn được và giữ nguyên record/stat, sentinel localStorage/cache khác, scope đúng game.

**Có cảnh báo cleanup:** cuối `final-three-diagnostic.log` ghi `Error: browser.close exceeded Node deadline 5000ms`. Cảnh báo xảy ra sau khi cả ba game đã qua tất cả assertions; việc đóng browser vượt5s, sau đó process vẫn exit0. Do đó kết quả xác minh cache/profile là PASS, nhưng không gọi toàn bộ harness execution là hoàn toàn sạch. Không retry chỉ để xóa cảnh báo này.

| Game | Cache cũ → final | Kết quả |
|---|---|---|
| Tháp | thap-dong-ho-v5 → v8 | PASS |
| Xe Tăng | xe-tang-thoi-gian-v5 → v9 | PASS |
| Cưỡi Hổ | cuoi-ho-v6 → v9 | PASS |

Command:

```powershell
$env:NODE_PATH='C:\Users\son.nguyen\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
node tests/e2e/gauntlet-cache.e2e.js thap-dong-ho xe-tang-thoi-gian cuoi-ho
```

Evidence trong `tests/e2e/out/gauntlet/cache/`: `final-three-diagnostic.log`, `results.json`, `{game}-result.json`, `{game}-watchdog.json`, `{game}-offline.png`. Tháp còn có lượt isolated PASS trước đó trong `tower-diagnostic-run.log`.

Ba game đầu đã PASS trong invocation trước, log `docs/gauntlet/final-cache-closure.txt`. Invocation đó dừng ở Tháp offline. Do đó đây là **kết quả ghép các lượt**, không phải một lượt all6 hoàn tất. File results.json hiện có ba kết quả final của lượt này; ba kết quả đầu không được bịa dựng JSON từ log thiếu version/metadata.

## Lỗi cũ và giới hạn chẩn đoán

PID16352 và các node command gauntlet-cache đã không còn tồn tại khi bắt đầu điều tra, nên không có process đó để stop. Diagnostic cũ `thap-dong-ho-offline-timeout.json` cho biết navigation chính còn pending và cả DOM evaluate cũng không trả trong2s. Chừng đó **không đủ xác định nguyên nhân là serviceworker/product, offline emulation, browser protocol hay tải máy**.

Sau khi thêm diagnostics, Tháp isolated PASS; tiếp theo chuỗi cả ba PASS mà không sửa source/cache policy hoặc đổi điều kiện offline. Lượt chuỗi ghi rõ offline navigation Tháp hoàn tất385ms, Xe Tăng367ms; response từ serviceworker được lưu trong event log. Không tái hiện được hang cũ, không tuyên bố một rootcause hoặc productfix chưa được chứng minh. Browser/version và điều kiện tải có thể ảnh hưởng; không suy ra iPad/Safari thật.

## Harness được gia cố

- Node-side deadline15s riêng offline reload,35s cho online reload; không phụ thuộc timeout trong renderer. Deadline offline nghiêm hơn timeout30s cũ.
- Watchdog100s cho mỗi game ghi JSON đồng bộ trước fail exit2, tránh chờ vô hạn khi protocol/renderer không đáp ứng.
- Ghi stage, request/response/fromServiceWorker, failed request, pageerror/crash, request tới server và pending URL. Diagnostic DOM vẫn bị giới hạn2s.
- Browser close bị giới hạn5s, đóng server connections trong finally.
- Kết quả mỗi game PASS được ghi ngay và giữ kết quả các game khác từ các invocation trước cùng baseline. Metadata `combinedInvocations`, `latestInvocationGames`, timestamp/invocationId khiến việc ghép lượt được minh bạch. Thay đổi persistence cuối được syntax-check; không mở thêm browser để chạy lại các lượt đã PASS.
- Không hạ assertion offline/fullCORE/profile; không chặn external font để ép pass; không chỉnh SW fetch policy.

Hết lượt cuối, node40764 exit0; kiểm tra PID và direct child không còn. Đã báo main browser work kết thúc để main chạy quiet performance; không thêm retry sau verified passes.
