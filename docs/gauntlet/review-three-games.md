# Independent runtime review: Tháp Đồng Hồ, Cửu Chương, Math Ninja

Review dates: 2026-09-06 to 2026-09-07, Asia/Bangkok. Scope is these three games only. This report does not certify the other three games or a production release.

The reviewer opened each locked product and used its normal menu/game UI before reading its implementation. Builder rationale, builder test reports and diffs were not used to establish the first-play findings. Reference criteria came from [references.md](references.md): a clear task, legible learning content, understandable touch actions and informative feedback. This is an adult technical review; no claims about child learning outcomes or preference.

## Verdict

| Game | Decision | Basis |
|---|---|---|
| Tháp Đồng Hồ | PASS | Four independent real level/quiz/replay/persistence cycles; touch and keyboard checks passed. |
| Cửu Chương | PASS | Real timed round, correction, retargeting, four viewport layouts, replay and persisted report passed. |
| Math Ninja | PASS after N1 closure | Real answer and pair rounds passed; the reported rotation obstruction was fixed and independently rechecked. |

## Method and limits

- Chromium headless, Playwright, Node; 390×844 portrait, 844×390 landscape, 820×1180 tablet and 1180×820 desktop. Tower uses a separate round at each size. CC/Ninja rotate a live round through the four sizes.
- Inputs are actual touch events (Playwright touchscreen/CDP), mouse and keyboard. Debug objects are read only to identify geometry, current questions and results. No score, time, hearts, level state or completion handler was altered.
- Tower's synthetic `blur` event checks its handler only. Actual background-tab visibility, Safari, a physical iPad, physical multitouch and Vietnamese speech synthesis were not validated. The menu explicitly says a Vietnamese voice is unavailable here.
- Full higher-level curriculum coverage, rare bomb collisions and physical stylus input are outside this bounded review. These are behavior/visual checks, not frame-rate benchmarks. Runtime console assertions exclude unavailable Google Fonts as documented by the repository helper. CC emitted four warnings whose messages the first final run did not retain; no claim of zero warnings is made.
- Screenshots and JSON are local, ignored evidence under `out/gauntlet/review-three-games/`. Some early Tower modal screenshots contain their entrance animation; use gameplay, selected, quiz and JSON evidence for claims. `cc-timed-result.png` records the end-of-time banner, with the result itself confirmed through replay and the persisted report.

## Tháp Đồng Hồ: PASS

Each size completed eight actual correct drops and one intentional wrong drop, scored 2,100, and saved two stars. The quiz had one wrong answer, explicit retry and three actual UI answers; it accurately reported 2/3 first-try and unlocked level 2. Replay started at zero; Home/reload retained score/stars/unlock, and the newly unlocked lesson was actually selectable.

The first tap on the current column selects without dropping. Drag changes column and previews the landing; release outside the board or CDP touchcancel does not drop. A second tap confirms. Arrow keys plus Space/number-column controls work. Pause freezes piece/time, clears a held soft-drop key and selection, and resumes correctly. A portrait-to-landscape resize during an active touch did not drop.

The large clock has distinguishable hands and readable hour numbers; the small moving clock is supported by this large reading reference. A wrong answer shows the actual time and why the minute hand indicates a whole hour, points at the correct column, and creates rubble. Tower uses rubble/stack failure rather than hearts. Corrected clocks score and the quiz gives explanation plus retry.

Evidence: `results.json`, `run.log`, `portrait-selected.png`, `landscape-selected.png`, `tablet-gameplay.png`, `portrait-wrong-feedback.png`, `portrait-quiz-wrong.png`, `portrait-quiz-result.png`, and the four `*-persisted-levels.png` files. No open blocking reproduction found in this scope.

Source confirmation after play: `thap-dong-ho/js/game.js` lines 1593–1606 (ghost/selected preview), 2351–2397 (pointer down/move/up/cancel), 1920–1941 (pause/resume).

## Cửu Chương: PASS

Real one-minute Bảng 2 mixed multiplication/division round: **38 correct, 1 wrong input, 15,600 points, 3 shields at timeout**. Replay starts with zero score. Home/reload report records one minute, 39 attempts, 97% and the same best score. A separate unsolved normal round legitimately lost all three shields and displayed the loss/review screen.

Touch digits and delete, keyboard digits/backspace/Enter, and an empty fire were exercised. Empty fire asks for an answer without adding a wrong attempt. A deliberately wrong 99 resets input and gives reasoning while preserving shields for correction; the corrected answer destroys the meteor and scores. Tapping another visible meteor changes the target and clears the old input. Each resized viewport then accepted a real correct answer. Rotation intentionally pauses; the visible Resume button continues the round. Ordinary pause freezes the timer.

Evidence: `cc-results.json`, `cc-run.log`, `cc-deliberate-wrong-feedback.png`, `cc-correct-feedback.png`, `cc-tap-retarget.png`, `cc-landscape-typed.png`, `cc-tablet-typed.png`, `cc-desktop-typed.png`, `cc-natural-loss.png`, `cc-persisted-report.png`.

Two initial harness failures were not product failures: Playwright's locator tap waited for the pulsing Fire button to become geometrically stable, and a resize test initially omitted the expected Resume action. The final run taps the observed Fire coordinates directly and resumes via UI. It passed without page/console errors or failed non-font requests.

Source confirmation after play: `cuu-chuong/js/game.js` lines 815–869 (entry/delete/fire), 1024–1056 (wrong explanation), 2347–2373 (target selection and stale-input reset).

## Math Ninja: runtime findings and closure

Answer mode completed a real minute with **26 correct, 1 wrong, 10,200 points**; the persisted report shows 27 attempts, 96%, three stars and one minute. Replay was playable at zero, and Home/reload retained the report. The script reached these assertions before a pair-entry selector failed because the mode control has role `tab`, not `button`; pair mode is tested separately without repeating the completed answer round.

Touchcancel leaves no active blade. Pause during a held touch clears it and freezes the clock. An intentional wrong fruit costs exactly one heart, scores zero and displays the correct equation; its reading interval freezes time and blocks further penalties. A correct touch scores. Touch across portrait/landscape/tablet and desktop mouse slices work after normal resize/pause/resume.

**N1, P2, equation obscured after rotation (CLOSED).** Start answer mode at 390×844, rotate to 844×390, then immediately press Resume. The rotation toast remains across the question card while the timer and fruit motion resume. The equation is partially hidden for roughly two seconds. Evidence: `ninja-landscape-live.png`; source trigger `math-ninja/js/game.js:334`. This is a functional reading obstruction, not a style preference. Main independently confirmed it and assigned a narrow fix. Closure requires clearing the rotation toast on Resume or placing it away from learning content, followed by the same immediate-resume reproduction and a readable in-progress equation.

Pair-mode focused run PASS: 23 correct pairs, zero wrong, 8,825 points and three hearts at the real 60-second timeout. The first fruit is visibly retained (`3 + ? = 10`, “Tìm số 7!”), then the complementary fruit is selected by a second real touch. Evidence: `ninja-results.json`, `ninja-pair-run.log`, `ninja-pair-held.png`, `ninja-pair-result.png`. N1 focused closure PASS on the final locked product: the toast is already hidden immediately after Resume and remains hidden at +250 ms in both landscape and portrait. A real correct touch and then a real wrong touch were accepted; reverse rotation during the wrong-answer reading interval preserves the same visible equation/explanation (`9 + 1 = 10`) and active reading time. Evidence: `ninja-rotation-closure.json`, `ninja-rotation-console.json` (empty error/warning arrays), `ninja-rotation-run.log`, `ninja-rotation-closed-landscape.png`, `ninja-reading-preserved-on-rotate.png`. Source confirmation: `resumeGame()` clears the transient toast while leaving the learning hint alone. No full-round replay was needed after this narrow change.

## Visual judgment, separate from defects

The games have distinct, coherent identities: dark space with a clear meteor ring in CC, large colorful fruit and a quiet equation card in Ninja, and a tall clock board with an owl in Tower. Large numerals, separate answer cards and visible feedback support the task. The Tower landscape board labels are smaller, but the enlarged clock and separate directional/drop controls preserve the usable interaction. Sky rays, scenery and celebration confetti are a matter of visual emphasis here; this review does not equate stylistic preference with a blocking defect. N1 above is different because a specific UI message covers the active equation.

## Re-run commands

Use the installed Playwright dependency path in `NODE_PATH`, then:

```powershell
node tests/e2e/gauntlet-review-three-games.js               # Tower, four complete runs
node tests/e2e/gauntlet-review-three-games.js --cc          # CC, bounded real timed round
node tests/e2e/gauntlet-review-three-games.js --ninja       # Answer + pair modes
node tests/e2e/gauntlet-review-three-games.js --ninja --pair-only
node tests/e2e/gauntlet-review-three-games.js --rotation    # N1 focused closure
```

The reviewer edited only this report, `tests/e2e/gauntlet-review-three-games.js` and its evidence directory. No product fixes, commits, pushes or additional agents were made by this reviewer.


## Final locked product fingerprints

Full SHA-256 file inventory: `out/gauntlet/review-three-games/final-product-hashes.json`. `js/game.js` fingerprints at final review:

| Game | SHA-256 |
|---|---|
| Tháp Đồng Hồ | `b91d86415e1944be04aa0cf71d5d46364e3ba8288568b5a6175f653ab013c772` |
| Cửu Chương | `be927e1772e35d3b6918ce6b9751046388a90e27bdbc7f158efc5c744908dc8a` |
| Math Ninja | `5eac4a14ca1b95077deeffcf95dfaa9f9345e226cc76bfdceeee3bec2b21283b` |
