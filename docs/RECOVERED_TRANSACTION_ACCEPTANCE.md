# Bounded recovered transactions — source only

`tests/recovered-transactions.pg-ci.mjs` replaces the duplicated `real-pg-choice-proof.mjs` from older milestone branches. It requires explicit disposable loopback PostgreSQL configuration and the isolated pg module installed by CI; it has no NXCore package path, arbitrary database URL or production credential loader.

The proof executes the existing bounded recovered observation through the actual owner transaction. It verifies one winner/one 409 under contention, denial for a different owner using the **same created run ID**, chapter denial, rollback after SQL UPDATE and exact restoration by a new Node process. Separate prepared queue fixtures exercise all three cutscene acknowledgments, wrong key/owner/revision denial, unchanged RNG, and refusal while canonical opening setup is pending. They intentionally begin after assumed board setup; they do not prove that setup.

The extracted cutscene guard blocks pending/malformed/unknown setup work. Owner row filters are applied in SQL, and failed rollbacks discard the pooled connection while preserving the original failure. These changes do not mount recovered gameplay or alter the authored Office/Hallway save schema.

The CI-only `tests/world-restart.pg-ci.mjs` records complete persisted-row, owned-run and public-view digests after both transaction suites, then verifies them in a new process after the disposable PostgreSQL service actually restarts. It also checks same-run owner denial, duplicate-create refusal, denial preservation, a resumed authored action, stale retry refusal and preserved assessment RNG. The sanitized `database-restart.json` is a fixture-only proof; it does not execute the missing full recovered opening/turn pipeline.

Full recovered-browser parity, live Account acceptance, production backup/restore, production capability mapping and runtime composition remain separate gates. The old M18 stack is retained as an archived reference; see [its complete disposition](PR24_DISPOSITION.md) and [release acceptance](RELEASE_ACCEPTANCE.md).
