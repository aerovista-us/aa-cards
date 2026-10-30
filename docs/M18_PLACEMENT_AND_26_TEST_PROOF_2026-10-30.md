# M18 deterministic placement and combined bounded test proof — 2026-10-30

Recovered behavior reference: NXCore `/srv/ACOS/workspaces/ascension/app/js/app.js`, SHA-256 prefix `ab2a37710f9cfd0a`, lines 5706–5740.

Added:
- `gateway/recovered-task-placement.mjs`: canonical shuffled-cell placement with original Fisher–Yates RNG calls; fixed station, desk fixture, tag and fallback preference ordering; candidate cap.
- `tests/recovered-task-placement.test.mjs`: six focused cases.

Test execution on NXCore: exact contents of five M18 helper/test pairs copied from the feature branch into a disposable `/tmp/aa-m18-fullbounded-XXXXXX` directory; `node --test tests/*.test.mjs`. TAP result: **26 tests passed, 0 failed, 0 skipped (256.318824 ms)**.

Constraints: isolated placement helper does not create full canonical task objects or invoke source `taskBoardCandidates`; integration with owner-locked state, task completion, required movement, PostgreSQL and end-turn remains incomplete. No original browser differential has been run. M18 draft must remain HOLD; no merge or publish.
