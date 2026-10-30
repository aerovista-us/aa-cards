# M18 task-board assembly bounded verification — October 30, 2026

Original source: NXCore `/srv/ACOS/workspaces/ascension/app/js/app.js`; SHA-256 prefix `ab2a37710f9cfd0a`, especially lines 5685–5771.

Added:
- `gateway/recovered-task-board-assemble.mjs`
- `tests/recovered-task-board-assemble.test.mjs`

Behavior ported: existing same-key board reuse without new RNG, empty map board, first-time source-shaped task records via recovered placement helper, completed-state carry-forward, station/character metadata. Unsupported same-key incremental append refuses with `unported_task_board_append` rather than silently diverging from source.

NXCore test proof: six M18 helper/test pairs copied directly from feature branch into an isolated `/tmp/aa-m18-bounded-XXXXXX` directory; ran `node --test tests/*.test.mjs`; **31 passed, zero failed, zero skipped** (336.047689 ms). This is **bounded unit verification**, not recovered-browser differential proof.

Still required: exact `appendTasksToBoard`, canonical `taskBoardCandidates` with source director scoring and conditions, complete turn orchestration, PostgreSQL atomic transaction and restart, authenticated AVCC save/resume, full-state differential. No production promotion or merge.
