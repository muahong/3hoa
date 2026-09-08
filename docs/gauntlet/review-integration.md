# Independent shared integration review

Reviewed 2026-09-06 against maze commit `229f24d` and the working-tree cache test. Scope: shared home navigation, input release, hub profiles, cache upgrade, and the integration harness. The five games under active builder ownership were neither played nor inspected. No product files were changed.

**Final verdict: PASS within the bounded maze/shared integration scope.** The historical two-child fixture finding was revised and independently closed below.

## Runtime observations

Fresh disposable Chromium contexts served from `http://127.0.0.1:8787/`:

| Check | Result | Evidence |
|---|---|---|
| Maze menu home, touch and keyboard Enter | PASS | Reached hub URL with one tab remaining. |
| Maze pause home, touch and keyboard Enter | PASS | Reached hub URL with one tab remaining. |
| First input immediately after resume | PASS | A touch directional tap or keyboard arrow moved the player; no delay inserted between resume and the input. Game state was read only to observe position. |
| Hub profile create, switch, reload | PASS | Created QA Linh through UI, reloaded, opened maze with that child selected; switched to original Bé through hub UI and reloaded/opened maze again. |
| Short landscape, 667 × 375 | PASS | All four movement controls and pause were 46 × 46 px; hint/speak buttons were 44 × 44 px. All stayed inside viewport. Actual directional tap moved player. Pause home remained reachable by scrolling. |
| Shared matrix, maze only | PASS | 390 × 844, 844 × 390, 820 × 1180 (reduced motion), 1180 × 820: same-tab home, pause/resume, restart, rotation, profile and mute persistence. No page, console, or non-font request errors. |
| Real worker upgrade, maze only | PASS | Baseline `a1f0458` worker cache `me-cung-dong-ho-v4` upgraded to `me-cung-dong-ho-v6`; old cache removed; every declared CORE file including shared CSS present; unrelated cache key survived; scope remained `/me-cung-dong-ho/`; offline menu reload succeeded. |

Reproducer: `tests/e2e/gauntlet-review-integration.js`. Raw independent observations and screenshots: `tests/e2e/out/gauntlet/review-integration/`. Matrix and cache outputs are under the respective `tests/e2e/out/gauntlet/` directories and are generated artifacts.

## Harness review

- `gauntlet-cache.e2e.js`: actual old commit serving, controlled version flip, worker update, full CORE checks, cache scope, raw localStorage preservation, and offline reload are valid upgrade checks. The injected progress is explicitly a storage fixture, never evidence of a played win. **Initial REVISE, now closed:** `qa_second` was initially added only to the game's player-progress map, without creating a shared selectable child profile. Main corrected this by creating a second child through old-version UI, seeding that real ID, and checking both selectable profiles after upgrade while offline.
- `gauntlet-matrix.e2e.js`: valid shared smoke coverage. Its center-point hit test after resume is narrower than proving movement; the independent test above adds real immediate movement for maze. Its desktop row uses mouse clicks for navigation, so the independent Enter checks supply keyboard evidence. Rotation did not automatically pause maze in the observed matrix; this is recorded rather than asserted as an auto-pause success.
- `tests/e2e/lib/browser.js`: error filtering is correctly narrowed to Google Fonts URLs. Generic `net::ERR_`, connection-reset, and failed-resource errors are no longer globally suppressed; console locations are checked to associate font failures with their source.
- `scripts/refresh-games.py`: reviewed generation and ran it twice against a temporary copy of baseline maze HTML/SW. First run inserted shared CSS and home links and bumped v4 to v5 exactly once. Second run was byte-for-byte identical. No live product files were used as mutation targets. This verifies current maze markup compatibility and idempotence, not arbitrary future HTML formats or the other five products.

## Limits

Chromium `151.0.7922.34`, synthetic touch/keyboard and viewports, local HTTP only. No physical iPad, Safari, voice quality, true document-visibility change, production deployment, game completion, or maze path-algorithm claims. The unrelated-cache fixture initially proves cache-key preservation, not another game's offline journey. Screenshots are captured after settling visual transitions. All UI profiles and historical-progress fixtures were in disposable browser contexts.

## Fixture closure

Independently inspected the corrected diff and reran `node tests/e2e/gauntlet-cache.e2e.js me-cung-dong-ho`. Exit 0, Chromium `151.0.7922.34`, actual `a1f0458` v4 → working-tree v6 upgrade. Output reports `selectableHistoricalChildren: 2`; preserved storage keys include the shared profile registry, `me-cung-dong-ho-v1`, and the sentinel. Both child IDs were selected through UI after offline reload, and each active game's loaded progress deep-equaled its old-version sanitized fixture. Every CORE item, unrelated cache key, raw pre-upgrade localStorage value, cache scope and offline menu assertions also passed. No outstanding product integration bug or harness revision remains in this bounded review.
