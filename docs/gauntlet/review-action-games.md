# Independent actual-play review — action games

Date: 2026-09-07, Asia/Bangkok. Locked-source review; no product edits, commits, or builder report used before first experience. Initial Tank finding and evidence are preserved below; focused closure independently verified the subsequent locked fix.

| Game | Verdict | Blocking finding |
|---|---|---|
| Xe tăng thời gian | **PASS, bounded scope; P2 closed** | New deliberate reading hold independently verified; see closure below. |
| Cưỡi hổ | **PASS, bounded scope** | No reproducible blocker in the exercised level-one critical path. |

## Method and evidence

First read `docs/gauntlet/references.md`, then explored menus, lessons, and active play through rendered UI before opening either game's source/diff. Reference principles used: readable primary task, recognizable character/action, large targets, positive feedback, and room to correct a mistake. Khan Kids/Sago apps were not installed or tested; no assets copied.

Playwright Chromium headless, real touch/keyboard/UI buttons, isolated HTTP server, Node 22.23.2. The automation only reads debug geometry/current answer/state to choose real inputs. It does not call answer handlers, update loops, win mutators, teleport, seed completion, or change progress directly. Default new player state. Automation: `tests/e2e/gauntlet-review-action-games.js`; run default for full path and `--controls` for focused controls. Output: `out/gauntlet/review-action-games/results.json` and screenshots in the same folder.

Initial runtime commands passed for both games, including `--controls`. The original Tank design verdict was REVISE despite these mechanical passes. A later `--closure` run passed the explicit reading-hold acceptance checks and changed the final verdict to PASS within the exercised scope.

Captured active gameplay at 390×844, 844×390, 820×1180 with reduced motion, and 1180×820. Resized during a real session, pausing between captures to avoid consuming answer time. These are viewport emulations, not physical iPad/Safari or latency benchmarks. Vietnamese voice was reported unavailable by the UI; no speech quality claim. Blur is explicitly a synthetic event; no claim of real hidden-tab lifecycle. Offline/cache/profile matrix belongs to the main reviewer and was not duplicated.

The first Tank automation attempt assumed the prompt-zoom button existed on every random question. A target-clock question correctly has no prompt zoom, so that assertion was invalid. The review script now tests native focus/Enter/Escape only when the button is visible. A subsequent actual-clock prompt passed. This was a test correction, not a product defect.

## Xe tăng thời gian — original P2 reading hold (now closed)

**Reproduce:** start level 1 through lesson; shoot one incorrect robot; leave the screen untouched for 2.5 seconds. The wrong choice is crossed out, but the text inviting correction disappears and robots keep falling while the child reads.

**Evidence:** `tank-wrong-repro-before.png` and `tank-wrong-repro-after.png`; JSON `xe-tang-thoi-gian.controls.wrongEvidence`. Simulation time advances 0.4833 → 3.2499; robot 0 center Y advances 316.6763 → 345.1029 pixels, a 28.43-pixel descent. Phase remains `ask`, question index remains 0, and `#hud-hint` becomes hidden without acknowledgment. Earlier independent full play reproduced the same issue: time 3.7332 → 6.2664, hint hidden after the wait (`xe-tang-thoi-gian-wrong*.png`).

**Impact:** a grade 1–3 reader must read and compare under continuing motion/time pressure. A 1.8-second first-error message gives no reliable reading opportunity, especially with no Vietnamese voice available. The wrong label stays crossed out, so the issue is loss of explanatory feedback and continued pressure, not loss of the selected answer entirely.

**Root cause after runtime review:** `xe-tang-thoi-gian/js/game.js`, `onWrong`, approximately lines 949–967. First error calls `showHint(..., 1800)` and leaves phase `ask`. The second-error explanation uses 4500 ms with only a 2.5-second slowdown. Prompt zoom can freeze gameplay when available, but is optional and does not make the wrong-answer reading step deliberate.

**Closure criterion:** retain wrong-answer guidance and suspend target descent/answer timeout during a visible reading state until an explicit child action resumes. Accidental extra tap, held key/repeat, rotation, pause/resume, and zoom must not dismiss or consume the reading opportunity. Re-run the focused reproduction with stable robot Y and visible message after a long wait, then finish a legitimate level and quiz. No product fix was made by this reviewer.

**Independent closure, 2026-09-07:** first experienced the fixed runtime before reading its implementation. New reading modal appeared immediately after a real wrong shot, initially disabled acknowledgment, and retained the message after waiting. Then `node tests/e2e/gauntlet-review-action-games.js --closure` passed with actual inputs. During the measured 3-second hold, game time stayed exactly `0.46660000000000046` and robot 0 Y stayed exactly `316.5046850083337`; every robot position and the teaching message were unchanged. Early Enter and actual repeated held Enter could not close it. Outside touch, `z`, `p`, and rotation retained the reading state; post-resize positions stayed fixed after layout settled. Touch acknowledgment entered the requested pending pause; resume worked. A second wrong answer also held: Escape could not bypass, intentional Enter acknowledged, and an actual correct shot advanced the question. No game mutators or completion fixtures were used.

For short landscape, reached level 8 through its real parent multiplication gate and unlock UI, then made two wrong shots at 780×360. The screenshot `tank-closure-elapsed-780x360.png` visibly contains both clocks, “Từ 6 giờ 45 phút đến 7 giờ 30 phút là bao lâu?”, explanation “45 phút · Kim dài đi từ số 9 đến số 6 là 45 phút.”, and the acknowledgment. Button bounds: x257.61, y264, width264.77, height60 — fully inside the viewport. Acknowledgment and a subsequent correct shot advanced normally. This verifies that sampled elapsed question, not every possible later wording. Evidence is in JSON `xe-tang-thoi-gian.closure`; page/console/request logs were empty.

The first closure attempt sampled geometry before the deferred resize completed; that comparison correctly differed because layout changed. The harness now waits 300 ms for relayout before checking held positions. This was a test timing correction, not a product defect. The prior legitimate level/quiz/persistence passes remain recorded; this narrow closure did not repeat their full suite. Reviewer browsers were closed before handing the environment back for quiet performance measurement.

**Other exercised behavior passes:** touch/number-key answers; keyboard tank movement with track phase change; synthetic pointercancel clears drag; outside tap does not answer; focused native clock dialog opens with Enter/closes with Escape; pause freezes game time and button resumes; synthetic blur pauses; `p` pauses; real restart returns question one/score zero; menu button returns home screen. Legitimate result: 8 correct, 1 wrong, 2075 points; quiz completed with one wrong, saved passage, and exact Store equality after reload. `*-result.png`, `*-quiz-wrong.png`, `*-quiz-done.png`, `*-saved-levels.png` preserve the path.

**Visual/motion judgment, separate from defect:** tank body/tracks remain together while moving; aim selection leads to visible barrel turn and a shell traveling toward the selected target, with recoil/impact rather than an unexplained score change (`*-motion-mid.png`). Clock hands and target labels remained distinguishable in the four captures; native enlargement is useful at small size. Decorative flowers and background are stylistic preference, not a blocker. This is a bounded adult reviewer judgment, not a child usability study or frame-rate claim.

## Cưỡi hổ — PASS within exercised scope

Legitimate level-one result: 7 correct, 1 wrong, 1750 points, two stars. After the wrong jump, the explanation remains visible in `learn` through the deliberate 2.5-second wait with question index unchanged; the explicit “Đã hiểu · Chạy tiếp” button controls continuation. Quiz wrong answer → retry → correct completion unlocks level 2. Saved Store is exactly equal after reload. Evidence: `cuoi-ho-wrong.png`, `cuoi-ho-wrong-after-2500ms.png`, `cuoi-ho-result.png`, `cuoi-ho-quiz-wrong.png`, `cuoi-ho-quiz-done.png`, `cuoi-ho-saved-levels.png` and JSON.

Touch and number keys selected real rings; native question focus/Enter toggled enlargement open/closed. Outside tap did not answer; pause freezes game time, button resume works, synthetic blur pauses, `p` pauses, real restart resets first question/score, menu button returns home. No runtime page/console/request errors were recorded in either completed full path.

Visual/motion judgment: the rider remains visibly attached through ascent, bent-leg flight, and return to ground. Run/jump/result motion was experienced in play, not inferred from menu art; `cuoi-ho-motion-mid.png` shows the actual selected-ring flight. The post-runtime diff supports the observed tuck/landing/rider counter-rotation behavior. Answer text remains high contrast against ring centers; the question card stays clear of the wrong-answer explanation on the small portrait capture. Landscape rings/clock are smaller but readable in this adult review; zoom remains available. Remaining limits: level 1 only for legitimate completion; no claim that every later word problem fits, no physical touch/audio/accessibility-device test, and no exact foot-contact or performance measurement.

### Final Tiger optimization closure

The final locked change enables the learning acknowledgment only when it is still disabled and `learnT >= 0.9`, rather than writing `disabled` every animation frame; service-worker cache changes from v9 to v10. Runtime was experienced before reading that diff. No geometry or answer logic changed in this final diff.

`node tests/e2e/gauntlet-review-action-games.js --tiger-closure` passed with actual wrong-answer input, with no game mutators. Initial `learnT < 0.9` had a disabled button: native touch and early Enter did not continue. Actual held-key Enter repeat after 1.05 seconds also did not acknowledge. During a further 3-second wait, phase stayed `learn`, question index, gate timer, and explanation text remained unchanged, and the button was enabled. Fresh Enter advanced. A second real wrong answer reset the disabled guard; deliberate button acknowledgment after the guard advanced again. Screenshot: `tiger-final-reading-hold.png`; JSON: `cuoi-ho.performanceClosure`. Page, console, and request logs were empty. All reviewer browsers were stopped after this focused run.

Final Tiger verdict remains **PASS within the previously stated scope**. The earlier full legitimate completion, four-view captures, and save/reload evidence are preserved rather than repeated for this one-line change. This is a behavior closure, not independent performance proof; no stable 60 fps claim is made. Main-owned timing evidence and its variance remain separate.

## Snapshot identity

- Tank original review `js/game.js` SHA-256: `537EE3501D2D358EB5CA0D28E0F5329BEF1018D088CDE1825A938DB2B9ECF070`.
- Tank independently closed fix `js/game.js` SHA-256: `F7BC414CB32CE54ED19B22BC889483E63F33E827D962F134D00BFBC045877692`.
- Tiger original review `js/game.js` SHA-256: `3109B1462BC0C5030AC13EEDCD99A1E40B9105C53367BDCCB7EF5BCF0D6C9677`.
- Tiger final optimization closure `js/game.js` SHA-256: `F859DBC7E2CD7D213E2BBD5C45C9FD6EAF545D0DAD0C7D999CE431413EFB6335`.

Post-experience diff inspection confirmed coordinated aiming/native zoom changes in Tank and deliberate learning/leg/landing/rider changes in Tiger. No builder rationale or prior PASS report was used to choose these verdicts.
