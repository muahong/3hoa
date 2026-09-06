# Independent review — Mê cung đồng hồ

Date: 2026-09-06. First verdict: **REVISE**. Final maze gameplay/layout verdict after two closure rounds: **PASS** within the desktop Chromium emulation scope below.

Reviewer experienced the fresh menu, lesson 1, touch gameplay, a deliberate wrong answer, correct answers, pause/resume and four geometries before reading the product diff or builder test report. Two candidate edge cases were subsequently reported by main/builder and independently reproduced; they were not accepted from their report alone. Product was locked throughout this first review. No product edits, teleport, outcome mutation, direct answer callbacks or synthetic win were used.

## Required revisions

### P1 — A blocked first direction wakes ghosts without moving the child

- Game/screen: Mê cung đồng hồ, level 1, 390×844, new session.
- Repro: menu → play → Giờ đúng → Vào mê cung → wait for playing → press ArrowUp at spawn `(1,7)`, facing the boundary wall → wait 6.5 seconds.
- Observed: before input `reading=true`, player `(1,7)`, ghost `(10,1)`. Afterwards player remains `(1,7)`, `moving=false`, but `reading=false`; ghost is active at `(6,1)`. Hearts remained 3 during the observed 6.5 seconds; no claim of an observed death.
- Impact: the game promises “Ma chờ con di chuyển”, but a direction with no visible movement silently ends the reading protection. This disadvantages a child testing controls while still reading.
- Evidence: `tests/e2e/out/gauntlet/review-maze/blocked-direction.png` and `blocked-direction.json`. Source corroboration after play: `setWant` calls `leaveReading` before checking whether the direction can move.
- Closing condition: blocked keyboard, D-pad and swipe input leave reading protection active; a viable movement starts normal play and the grace period. Verify this with actual input and unchanged player/ghost positions while blocked.

### P2 — Level 7 target card overlaps the board after input on portrait tablet

- Game/screen: Mê cung đồng hồ, level 7, 820×1180.
- Repro: fresh menu → play → parent unlock through the visible multiplication gate → Đồng hồ điện tử → Vào mê cung → direction input → Space to stop.
- Observed: `.hud-top` bottom is `175.390625`; board top is `169`, an overlap of `6.390625px`. The white target card covers the top wall. The status changes from the reading message to the longer controls message after layout.
- Impact: board and lesson content lose their separation. This is a measured geometry failure, not a color preference.
- Evidence: `tests/e2e/out/gauntlet/review-maze/level7-after-input.png`, `results.json` entry `level7-geometry`.
- Closing condition: remeasure board allocation when target/status dimensions change; retain a positive gap at 390×844, 844×390, 820×1180 and 1180×820, including reading, route, stopped and rotated states.

## Independently observed passes

- Menu and lesson 1 have readable text and large primary touch controls on 390×844. Analog clocks are visually distinguishable; the initial countdown temporarily covers them, then clears before movement.
- Reading without input for eight seconds leaves the player, ghost and hearts unchanged.
- Tapping a clock draws a green route; tapping another clock changes the destination and route. Tapping the moving owl cancels travel. Pause keeps position stable; resume is available and usable.
- Deliberate wrong answer produces the explicit correction “Đồng hồ đó chỉ …”, removes exactly one heart, stops movement and permits retry.
- Real touchscreen inputs found four correct clocks following one deliberate wrong answer. Four quiz answers were clicked through the UI using read-only answer inspection. The result showed passed and unlocked level 2. Stored record was `{best:1755,stars:2,passed:true,plays:1}`. This is real-input completion, not evidence that a child can independently solve it.
- Separate contexts at 844×390, 820×1180 and 1180×820 used real mouse destination input, opposite keyboard direction to reverse/cancel the route, and Space to stop. Assertions passed. Rotation preserved playable state and readable level 1 geometry.
- Pure generation audit: 3,000 boards, comprising A/B/C × compact/full × both orientations × 250 seeds. 27,000 placements covered player and two interior starts with 4/5/6 clocks. An independently written BFS verified every answer reachable without crossing another answer; production routes were checked for walls/other answers. No placement failure occurred. Each variant produced 250 distinct seed structures before orientation; transpose preserved the same topology. Ghost spawn separation also passed.
- The finite seed sample does not prove all possible seeds; the source throws if all fair placement retries fail. No such failure was encountered.

## Aesthetic observations, not blockers

The owl, ghost and wall colors are easy to distinguish. On a phone, the maze is visually dense, but the large clock faces remain separable. The translucent owl under grace-period blinking is less prominent than the clocks; this is a preference observation, not an observed missed input.

The local A/B gallery was reviewed after gameplay, so this was **not a blind experiment**. At matching 844×390, DPR 1 and target 11 giờ, I prefer A (new): the board uses the available height, clocks and owl are substantially larger, and the goal lives in the left rail without consuming board height. B (baseline) leaves much of the width unused while shrinking the maze. At matching 390×844, I prefer B (new) more mildly: the simpler board and explicit reading message make the first action easier to understand; A (baseline) uses slightly more width but places two ghosts close to the central player. This is one adult reviewer's preference, not evidence from children or an A/B outcome study. Still images cannot establish input reliability.

## Reproducible evidence

`tests/e2e/gauntlet-review-maze.js` owns the independent UI route and `--seeds` audit. Screenshots, logs and JSON are under ignored `tests/e2e/out/gauntlet/review-maze/`. Run with the bundled Playwright module directory in `NODE_PATH`. Browser controls are isolated contexts. Debug reads are restricted to geometry, answer selection and state assertions; no debug mutator is used by the UI test.

Shared shell/navigation, installed-device behavior and service-worker update integration are not certified by this first maze verdict; main integration owns those checks. No user-facing or production deployment was performed by this reviewer.

## Closure round 1 — two fixes closed; one additional geometry failure

Verdict remains **REVISE**. Existing requirements were not weakened.

- Original P1 **closed**: separate fresh contexts used keyboard Up, touch D-pad Up and CDP touch swipe Up into the spawn wall. After 6.5 seconds, reading protection, player and ghost positions stayed unchanged. The corresponding viable Down movement through each input then moved the player, cleared reading and retained 3.83–3.88 seconds of invulnerability and ghost release grace in the observed sample.
- Original P2 **closed**: level 7 reading/route/stopped states now separate HUD from board at all four requested viewports. Portrait tablet gap was 10.86 px; tablet landscape gap was 8 px. Rotation preserved seed, transposed topology and board separation. Evidence: `first-closure.json` and `edge-*` screenshots.
- The first geometry assertion checked board separation. Visual inspection caught a missing dimension in that assertion: all target controls must also remain inside the viewport. The harness now asserts those bounds too; this intentionally exposes the issue below rather than accepting a false green check.

### P2 — Level 7 landscape phone clips target controls below the viewport

- Game/screen: level 7, 844×390; reading, route and stopped states.
- Repro: use the visible parent gate to unlock level 7 → Vào mê cung. The bottom of the left target card is already cut off; starting/stopping a route does not resolve it.
- Observed: target card extends from y=202 to y=411.25. Hint and speech buttons extend from y=364.25 to y=408.25, cutting off 18.25 of their 44 pixels below the 390px viewport. Both controls are partly hidden.
- Impact: children lose part of the touch targets for help and reading aloud. This is not an aesthetic preference.
- Evidence preserved before another revision: `landscape-clipped-before.png` and `landscape-clipped-before.json` under the review evidence directory. Focused `--edges --landscape` exits nonzero on the bounds checks.
- Closing condition: retain the entire target card, full hint/speech hit areas and readable clock within the landscape phone viewport; check both level 7 and level 8 long targets at 360px and 390px heights, including rotation. Do not hide controls to pass.

## Closure round 2 — PASS

The locked product was tested again before reading builder explanations. All three observed findings are now **closed**. No product source was edited by the reviewer and no assertion was lowered.

- `--edges --extended-layout`: **46/46 checks passed**. This repeats blocked/viable keyboard, touch D-pad and touch swipe protection, then tests levels 7 and 8 at 390×844, 844×390, 820×1180, 1180×820 and 780×360 in reading/route/stopped/rotated states. HUD-board separation, target/hint/speech viewport bounds, rotation seed and transposed topology all pass.
- Visual inspection of levels 7/8 at both landscape phone sizes confirms readable clocks and full controls. At 780×360 the level 7 target ends at y=309.875; level 8 ends at y=330.5625. Hint and speech buttons remain 44×44; their bottoms are inside the viewport. The shorter landscape instructions still identify the requested clock task.
- A second focused run, `--edges --extended-layout --power-only`, collected a star by actual touchscreen destination travel, with read-only path selection, at both landscape sizes for both levels. **20/20 checks passed**, including powered state and rotation. No power timer or player state was assigned. This confirms the extra power chip does not push the target offscreen.
- In powered level 8 at 780×360, the target card ends at y=351.75; both buttons end at y=348.75 and measure 44×44. The target clock measures 80×80. Powered level 7 retains the same clock and button sizes and ends at y=331.0625. Screenshots were inspected after measurements; no clipped controls were found.
- New evidence: `edge-audit.json`, `power-audit.json`, `extended-run.log`, `power-run.log`, `edge-l7-*` and `edge-l8-*` screenshots in the ignored reviewer evidence directory. Earlier failures remain preserved in `blocked-direction.*`, `level7-after-input.png`, `first-closure.json` and `landscape-clipped-before.*`.

This PASS covers maze gameplay and layout before main applies the separately reviewed shared shell. The earlier real-input completion and finite seed audit remain the supporting core-loop evidence. It is not a claim of a child study, physical iPad/Safari validation, installed-PWA validation or a deployed release.
