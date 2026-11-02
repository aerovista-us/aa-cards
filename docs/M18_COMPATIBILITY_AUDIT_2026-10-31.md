# M18 compatibility audit — 2026-10-31

Authority: recovered `/srv/ACOS/workspaces/ascension/app/js/app.js` and `js/systems/{map,state}.js` (NXCore source), versus modern `gateway/` and current tests. M18 remains a staging-only, incomplete game. The matrix separates exact source behavior, compatible infrastructure and unverified choreography.

| Mechanic | Recovered behavior | M18 behavior | Treatment | Complication / next evidence |
|---|---|---|---|---|
| Saved map | `captureMapSnapshot()` writes `{w,h,grid,worldProfile}` separately from `state.snapshot()` | `worldMap` uses `{width,height,tiles,worldProfile,tagPool}` | **BRIDGED**, source-backed `recovered-save-map-bridge.mjs`; no derived tile data | `tagPool` is not in original saved map, and modern `worldMap` is nested in state; independent end-to-end capture still required |
| Task marker overlay | `MapSystem.setTaskMarkers()` stores max 24 markers and `setPrerequisiteTarget()` view target | `syncRecoveredTaskMarkers` derives equivalent properties but stores them in `worldMap` | **PARTIAL** marker rendering fields match; do not write overlay fields into recovered save-map projection | Persisting overlay properties inside modern worldMap may add fields absent from recovered snapshot; reconcile save vs render authority |
| Map generator | Recovered MapSystem/SpawnSystem | Reused recovered MapSystem/SpawnSystem in `recovered-map-builder.mjs` | **MATCHING bounded fixture** | Differential requires actual original browser capture, same seed, RNG cursor, world and context |
| Task completion | Required board/cell locks/reward in app.js | Bounded owner task transaction + source-derived helpers | **PARTIAL** | Only bounded local + DB tests, not complete original interaction lifecycle |
| Database write safety | Original local run API uses `upsertRun`, no visible request identity gate in server.js | Owner lock, CAS revision, PG rollback, restart tested | **KEEP M18 HARDENING** | Never replace account checks with original local database API |
| Earth death and cutscenes | Complete original client choreography | Transition + cutscene queue slice | **PARTIAL** | Not a full independently executed Earth→Afterlife interaction |
| Choices and end-turn | Original handles required interactions, story/cutscene sequencing and transition lifecycle | Bounded choice executor explicitly rejects unported transitions | **DO NOT ENABLE** | Copying individual effects without full ordering changes outcome/RNG/turn state |
| NPC memory, echoes, spawn, effects | Original authoritative state changes and ordering | Individual source-ported helpers/test fixtures | **PARTIAL** | Need strict original-vs-modern complete-state comparison at each checkpoint |
| Authenticated customer browser | Recovered server's local runs API | Planned AVCC identity + PostgreSQL owner scope | **NOT PROVEN** | Authenticated login, denial, revocation and save/resume browser acceptance missing |
| UI | Original playable UI | Pages demo with synthetic choices | **DO NOT PROMOTE AS GAME** | Real browser gameplay is not yet connected |

## Next implementation sequence

1. Obtain actual recovered-browser snapshot and separate map snapshot at deterministic checkpoints. The original workspace currently lacks `scripts/first-hour-smoke.mjs` despite its package.json reference; don't invent it.
2. Create modern independently executed snapshots with the same seed, actions, and checkpoints; map bridge allows comparing like-for-like *map fields* but is not evidence of matching complete state.
3. Fix each observed mismatch against recovered executable behavior; preserve M18 PostgreSQL owner/CSRF/authorization boundaries, fail closed for unported story choreography.
4. Prove full journey transaction and durable restart/save/resume, then AVCC authenticated browser acceptance. Only then consider PR merge and publication.

## Known release blockers

- **R1 critical**: source state layout mismatch (`state.worldMap` vs separately stored map); strict parity must not falsely pass by dropping modern `worldMap` or original saved `map`.
- **R2 critical**: task markers are presentation-only on recovered MapSystem but embedded inside `worldMap` in modern test path. Until mapped correctly, avoid promising saved-state equality.
- **R3 critical**: no independently observed first-hour browser state and modern full journey output.
- **R4 critical**: incomplete choice/end-turn/required interaction orchestration.
- **R5 critical**: AVCC account-based browser acceptance not executed.
- **R6 operational**: recovered `package.json` advertises `scripts/first-hour-smoke.mjs`, but recovered source snapshot lacks the scripts directory.

No production database, deployment or game service should be modified in this reconciliation phase.
