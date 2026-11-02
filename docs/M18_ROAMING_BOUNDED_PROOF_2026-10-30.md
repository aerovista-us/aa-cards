# M18 bounded roaming proof — 2026-10-30

Parent game reference: `/srv/ACOS/workspaces/ascension/app/js/app.js`, SHA-256 prefix `ab2a37710f9cfd0a`; source lines 5890–5939.

Added `gateway/recovered-task-roaming.mjs` and `tests/recovered-task-roaming.test.mjs`. Port preserves task iteration order, completed/static skips, RNG threshold, directional Fisher–Yates shuffle, one/two-step moves, occupancy checks, board lastRoamTurn, marker synchronization and NPC turn notes. Caller injects authoritative RNG and map bounds; state updates must be committed atomically.

Verification on NXCore: copied exact M18 GitHub branch contents of all three bounded source/test pairs into isolated `/tmp/aa-m18-bounded-XXXXXX`, ran `node --test tests/*.test.mjs` on 2026-10-30. Result: **16 tests / 16 passed / 0 failed**. Earlier roaming test expected leftward movement under zero RNG and failed; expected fixture corrected to rightward movement as dictated by source shuffle, then all five roaming tests passed and the full 16-case bounded suite passed.

**Not proven:** original-browser-versus-port differential RNG/state parity, task-board candidate selection and placement, integration into owner-locked PostgreSQL transaction, entire end-turn environment/NPC/spawn/echo lifecycle, service restart, real AVCC authenticated browser journey. No public rollout; release HOLD.
