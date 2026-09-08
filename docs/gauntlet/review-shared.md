# Shared navigation review: final verdict: PASS

Independent review, 2026-09-06, local http://127.0.0.1:8787. Product files read-only. Browser input and screenshots preceded reading the generator/test-helper diff; no builder self-assessment was supplied. Reference criteria: `docs/gauntlet/references.md` (reference products not installed or directly tested).

Initial verdict was REVISE for SH-01/SH-02 below. The main builder fixed the shared generator and regenerated the five-game package. Independent runtime closure passed both findings; no open blocker remains in this reviewed package. Maze and broader persistence/offline gates remain outside this verdict.

## Observable findings

### SH-01: P2: hidden pause panel intercepts immediate gameplay input

**Closed.** In all five games at 390×844, an immediate post-resume hit test now returns `CANVAS#game`, with no hidden ancestor. A subsequent real touchscreen tap dispatches `pointerdown` to that canvas in every case. Re-pause → `Menu trò chơi` → menu home also passed and stayed in the same tab. Evidence: `closure-final.log` (exit 0), `*-menu-closure.png`.

- Screen: Ninja, mobile portrait 390×844, first stage, pause/resume.
- Repro: enter from hub → Chơi ngay → Cộng trừ đến 10 → wait for countdown → pause → resume by a real touchscreen tap at button centre.
- Observed: immediately after resume, `document.elementFromPoint(195,483.7)` returns `#btn-resume` inside `.screen.dim.hidden`, rather than the underlying game canvas. Thus the first tap or start of a swipe at that point is delivered to the hidden pause UI during its fade.
- Impact: a child can resume and immediately attempt to play with an input swallowed by the closing overlay. This is interaction correctness, not a visual preference.
- Evidence: `tests/e2e/out/gauntlet/review-shared/ninja-resume-immediate.png`; browser probe output recorded in review conversation. Same structural CSS requires checking other games, but direct reproduction here is Ninja only.
- Closure: disable pointer events for hidden screen descendants; immediately after touchscreen resume assert hit testing reaches the game and an immediate gameplay gesture registers. Repeat representative touch game plus pause navigation.

### SH-02: P3: Cửu Chương back arrow is narrower than 44px

**Closed.** `#btn-levels-back` measured exactly 44×44 CSS px after the change, and touch back → Chơi ngay worked. Shared generator now declares `.screen-head .btn { min-width:44px; min-height:44px; }`. Evidence: `closure-final.log`, line 234.

- Screen: Cửu Chương stage selection, 390×844.
- Repro: hub → Vệ Binh Cửu Chương → Chơi ngay; inspect/tap top-left arrow.
- Observed: `#btn-levels-back` (`.btn.ghost.small`) is about 42.109×44 CSS px at rest. During entrance animation the measured box was 41.141×42.988. The visible text span is hidden at mobile width, leaving the arrow.
- Impact: misses the explicit ≥44×44 target requirement; small precision penalty for children. Existing same-style player/table/report back controls should also be checked.
- Evidence: `tests/e2e/out/gauntlet/review-shared/cuu-chuong-back-target.png` and `cuu-chuong-select-mobile.png`.
- Closure: min-width/min-height 44px for these back buttons; stable geometry ≥44×44 and touch back navigation works.

## Passed observations

- Actual touch enters all five reviewed games from the hub and returns from each game's menu to the hub in the same tab. No injected game-state hooks or saved profiles were used.
- Pause labels visibly distinguish `☰ Menu trò chơi` from `← Trang chủ 3hoa`; pause home navigation passed for Ninja, Cửu Chương, Tháp, Xe Tăng in portrait. The final matrix passed all five games at 844×390, 768×1024, and 1440×900, including same-tab menu-home and pause-home navigation. Tiger's multi-step lesson was completed through actual taps.
- All five profile pickers open via their player-name controls. Desktop Tab navigation reaches each menu home link with a visible 4px outline, and Enter returns to the hub. Profile creation/switching/persistence was not part of this reviewer’s isolated check.
- The shared home links have ≥44px CSS min-height and clear text. Landscape panels scroll; some menu/home and pause/home controls begin below the fold. This is an aesthetic/discoverability observation rather than a demonstrated unreachable-control defect.
- Homepage parent text is readable in the captured mobile layout and explains individual profiles, stars/results, and storage on this device without promising accounts or tracking.

## Source review

`scripts/refresh-games.py` generates one local stylesheet per game, converts menu home anchors to `../`, adds a separate pause-home anchor, and accurately renames the existing quit button. The generator checks existing markers and writes only changed content; a cache version increments when generated content/markup changes. It was inspected but not run by the reviewer because product files were read-only.

The five reviewed service workers list `./game-shell.css` in `CORE`. The home links remain relative and require no remote navigation or new tracking/accounts. Cross-game offline navigation and progress persistence are assigned to the main reviewer and not certified by this report.

`tests/e2e/lib/browser.js` narrows font-noise filtering to the actual Google Fonts domains and adds console message location when deciding the filter. This improves visibility of non-font network errors; no issue found in this diff.

## Evidence and limits

Runner: `tests/e2e/gauntlet-review-shared.js`; screenshots/logs under ignored `tests/e2e/out/gauntlet/review-shared/`. Isolated Chromium contexts, emulated touch; not real iPad/Safari. Viewports exercised: 390×844, 844×390, 768×1024, 1440×900. `matrix-final.log` completed all 15 landscape/tablet/desktop cases with exit code 0. Initial failed runs reflect readiness waits, ambiguous hidden Tiger text, and Tiger lesson-step selector adjustments; these are harness limitations, not automatically product failures.

No gameplay skill assessment, complete-round persistence, offline cold start, installed-PWA behavior, or live deployment is claimed here. Maze was excluded from this package. The targeted closure run used `REVIEW_CLOSURE=1 node tests/e2e/gauntlet-review-shared.js` and exited 0 after all five games; main owns the final integrated matrix/cache run.
