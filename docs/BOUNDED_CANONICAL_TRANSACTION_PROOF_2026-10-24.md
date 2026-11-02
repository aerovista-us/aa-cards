# Ascension M12 — source-derived, bounded transactional choice proof

This work integrates recovered `State` and `Director` with weighted outcome selection, original state effects, NPC/decision memory, the exact recovered specialized echo function, world unlock updates, action points, aftershock, map snapshot, persistent RNG and the owner-locked PostgreSQL repository.

**Scope: bounded subset, not completed full-game executor.** Source-derived operations are stitched together but cinematic/prologue/onboarding/progressor/turn-exhaustion paths are denied until the recovered turn, required-cell, first-hour and narrative lifecycle is completely ported. Unsupported state/action combinations throw and the transaction rolls back. Do not enable this as the public authority or assert full state parity from these tests.

## Reproducible checks

- `node --test tests/*.test.mjs` (62 passing as of branch creation).
- Disposable PostgreSQL only: apply `gateway/migrations/001_player_runs.sql` to an isolated database; export `ISOLATED_PG_URL` and optionally `PG_REQUIRE_FROM` pointing at a package directory with `pg`; run `node tests/real-pg-choice-proof.mjs`. Creates a uniquely named test run. Never connect this test to production.
- Observed NXCore disposable PostgreSQL 16: first concurrent `observe.afterlife.overhead_announcements` action committed, second denied `409 stale_revision`; owner-only exact reload at revision 1; queue length 1; persistent RNG draw cursor 3. No production data modified.

## Still required for real release

1. Differential tests against recovered application **entire** state including specialized opening, Case Worker dialogues, map changes, delayed events, RNG, cinematic callbacks and turn advances.
2. Full storylet/choice coverage without bypassing source handlers, exact save/restart parity and rollback/replay tests.
3. Actual SSO, session ownership, revocation, real account browser path through login → choose → logout → login → resume.
