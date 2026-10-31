# Ascension Awaits M18 — Release Evidence Ledger (2026-10-31)

Scope: exact checked-out M18 staging branch `feat/canonical-taskboard-turn-m18`, source review and isolated tests. This ledger accounts for all observed checks and outstanding release gates; it is not authorization to publish.

## Verified on NXCore
- Base verified commit before this report: `51fa8abb789ccac298b7afea93093822633cfd56`; GitHub Actions outcome: **success**.
- `bash ascension-build.sh --repo .`: repository test check **PASS** (167 tests as last full test run); release decision **HOLD** because no independent parity, full PostgreSQL acceptance command, or AVCC authenticated browser acceptance command supplied.
- `bash scripts/pg-task-transaction-accept.sh`: **PASS** real bounded JS gateway transaction on disposable PostgreSQL, concurrent revision CAS, wrong-owner block, rollback, saved task/marker/AP/RNG, fresh Node read after database restart. This is bounded task persistence only; not full playable journey persistence.
- `gh pr view 24`: OPEN, DRAFT, GitHub reports MERGEABLE. Git-level mergeability is not release approval.
- Local staging checkout clean before report, no production services or databases modified.

## Report reconciliation
- `docs/PROJECT_ARCHITECTURE_REVIEW_AND_RELEASE_PATH_2026-10-30.md` — architecture and gate sequencing.
- `docs/M18_COMPATIBILITY_AUDIT_2026-10-31.md` — matching mechanics, source-vs-modern differences, risks R1–R6.
- `docs/RECOVERED_BROWSER_CAPTURE_M18.md` — manual original-game capture method; NOT evidence of executed capture.
- `docs/M18_CANONICAL_TASKBOARD_ENDTURN_CONTRACT.md` — required original lifecycle / incomplete modern composition.
- All other M18 proof documents are bounded module fixtures, not an independently executed full recovered-browser differential.

## Outstanding release gates — explicit NOT PROVEN
1. Recovered browser opening through required tasks, decisions, cutscenes, end-turn: complete independently captured snapshots with state and map, plus source-backed lossless comparison to modern implementation.
2. Complete journey transaction, PostgreSQL save/reload and restart (beyond bounded task completion).
3. AVCC authenticated browser customer identity, owner-only save/reload, denial, session expiry/revocation.
4. Exact-head CI must be green after any further changes; confirm deploy adapter and same-origin access in staging before production.

## Decision
**HOLD**. No merge, Pages playable promotion, production application deployment, or changes to live accounts/DB. Continue staging-only integration against recovered source, preserve owner scope. Any later report claiming release readiness must link direct execution evidence for each item above.

## Continuation — canonical marker authority guard
- M18 task-runtime composition no longer permits an injected `syncTaskMarkers` function to replace source-derived task-marker projection. The interface uses `syncRecoveredTaskMarkers` directly with required storylet, character and prerequisite resolvers.
- A regression test supplies a malicious/incorrect marker override and verifies it is never executed; marker completion still comes from the source-derived projection. This prevents the previously observed test-only tile-marker mutation from masquerading as original behavior.
- This is a bounded integration safety improvement, **not** independent gameplay parity or an authenticated browser acceptance result.

## Continuation — bounded Earth-to-Afterlife cutscenes on real PostgreSQL
- `scripts/pg-cutscene-journey-accept.mjs` runs the source-derived Earth→Afterlife transition, drains the first opening scene, then persists all three actual `owner-cutscene-transaction.mjs` continuations through the disposable PG pool.
- Verifies wrong-owner 404 and wrong-scene 409 rollback on every scene, three ordered revision increments, no additional RNG draws during cutscene acknowledgments, completion flags, and empty final queue.
- `scripts/pg-task-restart-verify.mjs` now checks those cutscene results from a new Node process after PostgreSQL container restart, in addition to the earlier task-completion checks.
- Limits: does not prove canonical board setup, choices, end-turn, independent original-browser parity, or AVCC account browser acceptance. Full release gate remains HOLD.
