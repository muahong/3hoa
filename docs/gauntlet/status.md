# Gauntlet 3hoa — trạng thái hiện tại

Cập nhật: 2026-09-06. Chưa nghiệm thu toàn bộ, chưa phát hành. Shared commit 008c677; maze đã PASS độc lập và tích hợp; năm game còn lại đang build.

## Baseline đã xác minh
- Workspace D:\Projects\3hoa; bắt đầu main @ a1f0458, hiện codex/gauntlet-2026-09-06.
- Giữ nguyên docs/prompts/3hoa-gauntlet-astra-high.md (untracked có sẵn). Không add cả docs/ một lượt.
- Không thấy AGENTS.md áp dụng. Đã đọc README gốc + sáu game. docs/game-refresh-2026-09-06.md và scripts/refresh-games.py không tồn tại lúc đầu. Không coi các ghi chú refresh cũ là kết quả hiện tại.
- Đủ baseline sáu game với ảnh menu/gameplay desktop/mobile. Details baseline-three.md, baseline-action.md, maze-package.md; probes cụ thể trong input-probes.md. Ảnh/log nặng ở tests/e2e/out/gauntlet/ (gitignored).
- Node22.23.2; Playwright bundled qua NODE_PATH bên dưới, Chromium1234. Python C:\Python312\python.exe.
- Baseline tests/run.js 217/218: fail duy nhất do CSS slice CRLF ở test cuoi-ho; main sửa normalize newline, không đổi assertion. Runtime 844x390 mẹo vẫn hiện.

## Chủ sở hữu / vòng đang chạy
| Phạm vi | Người sửa | Trạng thái |
|---|---|---|
| Shared/hub, generator, main matrix/cache tests, README/status/preview | main | Gói shared đã REVISE, sửa SH-01/SH-02 xong; reviewer đang đóng lỗi |
| me-cung-dong-ho/** trừ profile.js; maze unit/E2E | maze_builder | PRODUCT ĐANG KHÓA cho reviewer; builder chỉ tests/docs. Vòng1 |
| Review shared 5game ngoài maze | review_shared | Read-only product; closure sau fix hidden overlay + min44 |
| Review maze | review_maze | Fresh context, actual input first. Review đang chạy |
| Ninja/CC/Tower baseline+probes | baseline_other_games | Xong, idle; CHƯA giao product builder, chờ maze pass |
| Tank/Tiger baseline | baseline_action_games | Xong, idle; CHƯA giao product builder, chờ maze pass |

## Gói đã sửa (chưa tự coi PASS)
- Shared: scripts/refresh-games.py là nguồn sinh game-shell.css, nav menu/pause same-tab, phân biệt Menu trò chơi và Trang chủ. Đã áp 5game ngoài maze, bump cache và CORE.
- SH-01: hidden pause children chặn cú chạm sau resume. Reviewer tái hiện Ninja. Đã sửa generator `.screen.hidden * {pointer-events:none !important}`.
- SH-02: nút back CC42.1x44. Đã sửa generator `.screen-head .btn` min44x44.
- Homepage mô tả đúng vòng học: Ninja/CC luyện từng ván, bốn game clock có lesson/quiz.
- tests/e2e/lib/browser.js không bỏ qua mọi lỗi resource/network như font noise nữa.
- Maze: seed generator có vòng, safe placement, BFS tap route tránh các clock khác, retarget/stop/cancel, đọc an toàn trước input, ghost grace, mobile landscape HUD. Main chưa tích hợp shell vào maze vì reviewer khóa.

## Lỗi còn mở / việc ưu tiên kế tiếp
1. Maze lvl7 820x1180: status wrap làm HUD bottom175 > board top169 (~6px). Builder phát hiện legacy8, reviewer đang kiểm chứng. Không sửa product trước verdict/nhả khóa. Fix dự kiến reserve status height nhưng cần verifier.
2. Ninja P1 đã tái hiện: 1 touch gesture chưa nhấc mất2tim. Builder cần khóa lỗi theo gesture + thời gian đọc, check pointer outside/cancel.
3. Tower P1 đã tái hiện: touchStart trên col spawn→hard drop, drag/cancel vẫn sai. Builder cần tách chọn/confirm ở up, giữ drag/cancel.
4. CC: hold chỉ chặn spawn, meteor vẫn rơi khi feedback/hint đang đọc. Target ổn định ở probe. Cần bảo vệ nhịp đọc + nhập/sửa, feedback phép tính.
5. Tiger: sau sai tự bỏ lời giải sau2.8s dù ghi Chạm để tiếp. Cần chủ động tiếp, animation chân/nhảy/tiếp đất và dung sai input, giữ sai/correction data.
6. Tank: đồng hồ HUD80px mobile, cần đọc rõ khi chơi; cải thiện turret/tracks/robot/aim/shot feedback nhất quán.

## Kiểm tra đã có bằng chứng
- Root hub.e2e.js PASS 1180x820,820x1180,390x844 (hub-e2e.txt).
- Main matrix Ninja4view PASS trước sửa shared fade; CC matrix hiện chạy sau shared closure fixes (session50819; output matrix-cc.txt).
- Cache smoke Ninja actual a1f0458 SW→working-tree SW, offline menu, storage/cross-cache scope PASS. Test mới đã mở rộng check EVERY CORE, cần final run đủ6 sau final files.
- Maze builder:21/21 logic incl600seed x2sizes x6placements; seed69 failure retained. New input E2E desktop/390 wrong1→correct4→quiz by input→result→retry→reload record PASS. Cancel/rotate844 + extras retarget/reverse/stop pass. Legacy1–7 incloffline PASS;8 lỗi HUD nêu trên.
- Baseline perf3games seed360906 viewport390x844 DPR1 retained. Maze before/after4views plus active route samples; không tuyên bố speedup từ khác workload.
- In-app preview mở và ảnh A/B hiển thị đúng: http://127.0.0.1:8787/docs/gauntlet/preview.html. Server python session37010 vẫn phục vụ8787.

## Lệnh Windows
```powershell
$env:NODE_PATH='C:\Users\son.nguyen\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
node tests/run.js
node tests/e2e/gauntlet-matrix.e2e.js
node tests/e2e/gauntlet-cache.e2e.js
node tests/e2e/maze-refresh.e2e.js
python scripts/refresh-games.py
```

## Bước tiếp theo chính xác
- Lấy review_maze verdict; main kiểm chứng critic, nhả builder sửa, re-review closure. Legacy8 còn mở.
- Khi maze pass: áp generator CHỈ maze sau bàn giao file; regression shared. Commit verified shared/maze riêng theo scope, không include prompt có sẵn.
- Giao baseline_other_games builder3games và baseline_action_games builder2games, độc quyền game directory/test tương ứng; không đụng shared/profile/generated CSS. Sau builder, fresh independent reviewers, fix→closure.
- Final full unit suite + existing E2E phù hợp + actual full input loops eachgame + matrix4view + cache6games. Hoàn chỉnh acceptance/evidence/perf/preview docs.
- Commit riêng verified changes, không push (chưa có quyền deploy hiện hành). Không tuyên bố đủ6 khi còn gói chưa làm.

## Giới hạn cố định
Chỉ Windows Chromium/emulated touch. Chưa Safari, iPad vật lý, giọng Việt thật. Existing E2E dùng state hooks/teleport chỉ chứng minh integration; thắng thực tế phải qua input harness riêng. Không có user/child playtest hoặc khảo sát sở thích A/B với trẻ.

## Checkpoint mới nhất (ưu tiên hơn trạng thái bảng trên)
- Shared reviewer final PASS; SH-01+02 closed all5. Commit008c677 gồm shared source+5game+review; chưa push.
- Main shared unit75/75PASS; generator rerun5game reports unchanged (idempotent).
- Main matrix CC4viewPASS sau sửa harness: game chủ động pause khi rotate, script nay resume trước tiếp. Không phải product failure.
- Maze reviewer REVISE vòng1: blocked-input awakening + tablet HUD overlap. Builder fixed; reviewer closure1 đóng cả2.
- NEW P2: lvl7 844x390 target bottom411.25, hint/speak408.25 bị cắt. Main xem screenshot verified. Builder đang sửa layout bounded lượt2 theo review (không hide controls), check cảlvl8+780x360. Reviewer harness --edges --extended-layout đã sẵn.
- Maze builder actual full4viewport+quiz/result/retry/reload pass sau fix2; source đang nhận layout3rd package version nên finalcaptures cần refresh.
- Tank/Tiger BEFORE performance xong, acceptance action-refresh-acceptance.md, script gauntlet-action-refresh.e2e.js before|after. Vẫn chưa sửa5games gameplay vì chờ maze accepted.
- Maze layout lần2: builder50/50 HUD cases gồm power qua touch thật; main xem ảnh l8 780x360 power và rerun21/21logic PASS. Reviewer46/46 extended closure PASS, đang power check trước final verdict.
- Main matrix thêm profile create/switch/reload qua DOM trong context riêng; Ninja4view PASS (matrix-profile-smoke.txt). Final matrix6game vẫn cần chạy sau khi source chốt.
- Maze independent final PASS: 3 findings closed, extended46/46 +power20/20. Main áp shared generator riêng maze, cachev6; matrix4views và actualcacheupgrade/EVERYCORE/offline/storage/scope PASS; legacy4+8PASS. Product ownership về main, không còn lỗi maze mở đã biết.
- BẮT ĐẦU BUILD5game: baseline_other_games owns math-ninja/**,cuu-chuong/**,thap-dong-ho/** (trừ profile.js/game-shell.css), respective tests và three-package.md. baseline_action_games owns xe-tang-thoi-gian/**,cuoi-ho/** cùng exceptions, respective tests/action-package.md. Không sửa shared/helper/matrix/cache; giữ nav008c677; bumpCACHE. Main sở hữu tích hợp. Không giao reviewer trước khi product khóa.
