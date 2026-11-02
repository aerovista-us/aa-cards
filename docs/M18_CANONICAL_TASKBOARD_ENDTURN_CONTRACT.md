# M18 — Canonical task-board and complete end-turn lifecycle

Status: **STAGING / NOT RELEASE-READY**  
Parent: M17 commit `33bd8ca75a806c59d77f31108c5f530ad4f64203`  
Production changes: **none**

## Authority and scope
The recovered v4 game is the only authority for task creation, task-marker placement, cell requirements, movement, story choice processing, end-turn and cutscene presentation. Do not infer gameplay rules from older UI-only systems or design docs. Current M17 cutscene continuation commits a single owner-locked revision but does not execute the complete turn.

## M18 implementation contract
1. Extract recovered `ensureWorldTaskBoard`, `syncTaskMarkers`, required-cell/interaction enforcement, and original end-turn code from the NXCore recovered app, with exact source path and hash documented.
2. Port the original routines with minimal input/output adaptation only. Preserve task identifiers, deterministic ordering, map mutations, RNG draw count, action-point transitions, queued cutscenes, story/quest flags, delayed echoes, NPC state and world state.
3. Add a single owner-scoped transaction orchestrator atop M17: authenticate subject -> lock run -> verify ownership/revision/chapter -> hydrate state and RNG -> validate active cutscene/required interaction -> apply player action -> synchronize task-board/markers -> run original end-turn sequence where due -> persist **all** state in one CAS update -> commit -> return committed view.
4. Prohibit turn advancement while cutscene acknowledgment or mandatory task action is incomplete, except where recovered source expressly allows it. Reject unsupported pathways before any state mutation; rollback on failure.
5. Never use the LLM to decide authoritative effects, legal move destinations, task completion, turn increment, RNG or persistence. AI may only decorate presentation from committed state.
6. Keep old `createBoundedRecoveredChoiceExecutor` explicitly bounded until a full parity gate passes; do not broaden the advertised supported stages based only on passing unit tests.

## Acceptance matrix
- Earth-death -> Afterlife map initialization -> task board -> required office cells -> cutscene sequence -> first turn -> second turn.
- Exact full snapshot parity against recovered browser source: flags, storyMemory, worldMap tiles/spawns/markers, position, actionPoints/maxActionPoints, turn, quest/task state, inventory, NPC/decision memory, echo queue and specialized effects, RNG seed/cursor, cutscene queue/active key, heat, XP and unlocked worlds.
- Required cell refused, inactive task refused, duplicate action refused, stale revision 409, wrong owner 404, denied chapter 403, replayed cutscene 409, duplicate end-turn refused; no revision increment or mutation on every refusal.
- Real disposable PostgreSQL integration under concurrent requests and service restart: Save -> Reload -> Resume with exact JSON parity and atomic rollback checks.
- Actual AVCC browser identity journey: login, new run, required interactions, choice, end turn, save, reload, logout, revoke, login, resume. Confirm cross-account isolation.

## Release rule
M18 must remain a draft, not merged/published as playable, until original-source attribution and full-state differential parity are documented. M17's mocked DB success is not proof of complete game behavior or PostgreSQL integration.
