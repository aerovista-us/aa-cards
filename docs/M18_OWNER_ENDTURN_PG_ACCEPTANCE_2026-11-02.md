# M18 bounded end-turn transaction evidence — 2026-11-02

Scope: `feat/canonical-taskboard-turn-m18`, staging only. No public route, production database change or merge.

## Implemented
- `gateway/owner-end-turn-transaction.mjs`: owner subject and run ID validation, row-locking `SELECT ... FOR UPDATE`, exact revision CAS, chapter authorization, verified persisted map, server-owned context, cloned deterministic `simulateRecoveredEndTurn`, JSONB full-state update, rollback and committed result.
- Client input limited to `expectedRevision`. No client state, RNG seed/draws, UI, or callbacks are accepted.
- Pending canonical setup, queued cutscenes, and active cutscenes fail closed.
- `tests/owner-end-turn-transaction.test.mjs`: bounded mocked transaction success, owner isolation, stale revision, chapter denial, untrusted client override, missing authority, pending setup/cutscene rejection.
- `scripts/pg-end-turn-accept.mjs`: disposable PostgreSQL concurrency (exactly one CAS winner), owner denial, untrusted-input denial, committed state/RNG equality.
- Integrated into `scripts/pg-task-transaction-accept.sh` and verified across PostgreSQL restart using fresh Node connection in `scripts/pg-task-restart-verify.mjs`.

## Executed evidence
- `node --test tests/*.test.mjs` — **191 passed, 0 failed**.
- `bash scripts/pg-task-transaction-accept.sh` — **exit 0**, disposable PostgreSQL 16, existing bounded task/cutscene/opening-board scenarios plus new end-turn checks and restart verification.

## Limitations — HOLD
- `simulateRecoveredEndTurn` is provisional, not an independent full recovered-browser equivalence proof.
- Current server-side callback context is a fixture in acceptance; canonical source-derived roaming bounds, turn notes, map marker updates, first-hour task-board and player choice integration must be wired and independently compared.
- One bounded end-turn commit does not prove full source sequencing for recap, cutscene continuations, dynamic events, `startTurn`, or endings.
- No real AVCC browser sign-in/new run/save/resume/revocation acceptance; no production promotion or M18 merge.
