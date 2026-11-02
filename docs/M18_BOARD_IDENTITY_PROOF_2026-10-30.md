# M18 planned-task and board-key proof — 2026-10-30

Canonical source: NXCore `/srv/ACOS/workspaces/ascension/app/js/app.js`; SHA-256 prefix `ab2a37710f9cfd0a`.

Source-derived helper `gateway/recovered-task-board-identity.mjs` captures `worldTaskBoardKey` (lines 5442-5449) and the AFTERLIFE branch of planned task IDs (lines 5460-5476). Source-specific target conditions remain external; this helper does NOT replace `taskBoardCandidates`, board placement, original director evaluation, Earth progression, transactional end-turn or full parity.

NXCore isolated verification: `node --test tests/*.test.mjs` on the copied pair `gateway/recovered-task-board-identity.mjs` and `tests/recovered-task-board-identity.test.mjs`: **4 passed, 0 failed** (86.228109 ms TAP). Previously independently verified bounded suite: 16/16. Total 20 tests passing across separate runs, **not** verified together or against original browser runtime.

At inspection, GitHub Actions Cards integration checks workflow run #53 (ID 41141690728) for commit 85d053a was in progress; there is no green exact-head conclusion yet. PR #24 remains draft. No merge/publish.
