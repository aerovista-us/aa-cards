# Cards / Ascension v4 persistence gate — draft implementation

Do not deploy this adapter solely because contract tests pass.

## Newly staged
- `gateway/postgres-run-store.mjs`: server-only PostgreSQL run repository with exact subject ownership, row locking, revision compare-and-swap and transaction rollback.
- `gateway/director-transaction.mjs`: choice transaction seam requiring a canonical v4 Director and entitlements, now checking access to both source and destination chapters.

## Pre-deployment proof
1. Review migration on a disposable restored database. Make a backup and record exact schema version.
2. Integrate actual v4 run schema and Director methods; the adapter assumes run ID, current storylet, chapter, JSON state, active status, and revision. These names are **not yet verified** against restored Ascension data.
3. Map real identity subject from AVCC server session, not request body.
4. Run parallel choice submissions on PostgreSQL: one commit, duplicate rejected (409), zero extra AP/stat mutations.
5. Prove rejected premium *destination* cannot commit new state, even when initial choice is free.
6. Prove transaction rollback on Director/save failure, access revocation, stolen run IDs, session expiry and logout.
7. Prove saved game survives server restart, logout/login and at least two sessions for the same account.
8. Run exact-head unit/integration tests and real desktop/mobile browser checks before enabling any live buttons.

## Boundaries
- This is not yet a running game server.
- A prior in-memory test fixture is not durable-storage evidence.
- Entitlement grants require live approved authority, never client flags.
- GitHub Pages preview stays non-playable until authenticated endpoint acceptance.
