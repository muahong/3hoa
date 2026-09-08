# Tiger: bounded performance investigation, 2026-09-07

The correction screen wrote `button.disabled` every RAF. The fix writes it only when the 0.9-second input guard expires. The measured correction workload now produces **2 attribute writes instead of 54**. A fast first run improved frame cadence, but later baseline and fixed runs both slowed substantially; stable 60 fps is **not established**. Independent review remains required.

## Product scope

Only `cuoi-ho/js/game.js:912` changes behavior in this closure: `if (ui.learnContinue.disabled && G.learnT >= 0.9) ui.learnContinue.disabled = false;`. The initial disabled state, 0.9-second guard, explicit continue, repeat rejection, scoring, motion and layout are unchanged. `cuoi-ho/sw.js` advances v9 to **v10**; no new assets or CORE changes.

SHA256 of locked files (bytes, before any Git line-ending conversion):

- game.js: `F859DBC7E2CD7D213E2BBD5C45C9FD6EAF545D0DAD0C7D999CE431413EFB6335`
- sw.js: `071BD24C5F2BF008B5034184008B77F59A6F220AB31C226092807F697C4B2D63`

## Measurement and limits

Windows 10.0.26200, Intel i7-1370P (20 logical CPUs), 32 GB RAM, Node 22.23.2, Chromium headless 151.0.7922.34, DPR 1, no throttling. Seed 3060906, question `Đồng hồ chỉ mấy giờ?|t:11 giờ`, real key 2 selects the wrong ring. Workload spans jump and correction, 120 RAF intervals. No game-state mutation. Baseline `a1f0458` is served from Git via request routing; current version uses working-tree files. Both block service workers in the performance harness. The baseline's automatic correction transition differs from the new deliberate hold after its timeout, so this workload is not an isolated rendering benchmark.

Desktop 1180×820, in execution order; all timing units ms. Reports are under `tests/e2e/out/gauntlet/action-refresh/` in the named directory.

| Report | Mean RAF | p95 RAF | CPU Task | Disabled writes |
|---|---:|---:|---:|---:|
| before-tiger-check (parent, historical) | 16.67 | 16.8 | 1465.56 | not instrumented |
| after-tiger-check (parent, pre-fix) | 18.61 | 33.4 | 2151.62 | not instrumented |
| tiger-perf-current-instrumented | 17.64 | 33.3 | 1633.61 | 54 |
| tiger-perf-ablate-disabled (route-only single-line ablation) | 16.81 | 16.8 | 1371.86 | 2 |
| tiger-perf-fixed (actual product) | 16.67 | 16.7 | 1282.74 | 2 |
| tiger-perf-fixed-repeat | 26.80 | 33.4 | 3287.92 | 2 |
| tiger-perf-baseline-pair | 25.42 | 33.4 | 3124.95 | 0 |
| tiger-perf-fixed-pair | 26.67 | 33.4 | 3234.24 | 2 |

The final pair ran baseline first (16:01:52 UTC), fixed next (16:02:52 UTC). No other team browser or test workload was reported; host/user/OS load was not controlled. The late baseline also slowed to p95 33.4, so attribution of that cadence to this game change would be unsupported. The ablation supports eliminating redundant DOM writes; it does not establish an unconditional CPU or FPS improvement. Phone 390×844 actual fixed run: mean 16.67, p95 16.8, CPU Task 639.58, 2 writes. All measured runs had no page/console/request errors; the two warnings concern intentionally blocked service workers.

Harness additions are diagnostic only: optional `PERF_TAG`, `PERF_WIDTH`, `--ablate-tiger-dom` and MutationObserver counts. Original reports were preserved. `--ablate-tiger-dom` is now a no-op on fixed source because the old assignment no longer exists; the historical ablation report records the earlier route-only experiment.

## Targeted validation

- `node --test --test-reporter=dot tests/cuoi-ho.test.js`: 34 tests passed, exit 0.
- `node tests/e2e/tiger-perf-guard.e2e.js`: exit 0, clean browser log. Real wrong answer, early Enter held across the guard, repeated keydown, 11 seconds without acknowledgement all retain gate/question/score/hearts and correction. Exactly 2 disabled writes. After rotation to 780×360 the explicit continue button is 190.8×44 at y=313..357 and visible; one real touch tap advances exactly one gate. Debug hooks only read state. Evidence: `action-refresh/tiger-perf-guard/result.json` and `held-short-landscape.png`.
- `node tests/e2e/gauntlet-cache.e2e.js cuoi-ho`: actual baseline **v6 → v10**, offline menu, scope and historical child selection/storage all passed, Chromium 151.0.7922.34, verified 16:04:16 UTC. Old reports copied to `action-refresh/tiger-cache-pre-v10/`; new v10 result and image copied to `action-refresh/tiger-cache-v10/`. No shared harness edits.
- Scoped `git diff --check`: exit 0 (Git emits informational LF→CRLF warnings).

No broad suite rerun and no claims of new full-game completion in this closure. Prior independent gameplay acceptance remains historical evidence; this one-line change is handed back for fresh focused review of performance scope and deliberate-continue behavior.
