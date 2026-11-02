# M18 source append and combined test proof — October 30, 2026

Original source: NXCore `/srv/ACOS/workspaces/ascension/app/js/app.js` SHA-256 prefix `ab2a37710f9cfd0a`; `appendTasksToBoard` lines 5773–5833.

Changes: `gateway/recovered-task-board-append.mjs` implements source-derived incremental placement, order assignment, occupied cell behavior, fixed station overrides, metadata and skip-when-full. `gateway/recovered-task-board-assemble.mjs` invokes the new helper when same-key existing board lacks candidates. Unit coverage added in `tests/recovered-task-board-append.test.mjs` and updated assembly tests.

NXCore verification: fetched exact feature branch contents of seven helper/test pairs into isolated `/tmp/aa-m18-append-XXXXXX` and executed `node --test tests/*.test.mjs`. Result **35 passed, 0 failed, 0 skipped** (310.884855 ms).

Limitations: canonical `taskBoardCandidates` full selection/score/condition integration and complete end-turn PostgreSQL transaction not done. No full original-runtime differential or AVCC browser proof. No merge/deploy.
