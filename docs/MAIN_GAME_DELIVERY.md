# Ascension Awaits — main-game delivery

November 10, 2026 (Pacific). Development candidate; no production gameplay promotion.

## Product direction

Build one persistent RPG around Billy's Afterlife Placement Office. The invisible World Director owns consequences; the player explores, handles meaningful objects, talks to people who remember, and progresses through ongoing missions. Cards/Phaser present the same server-owned game. Optional AI dialogue must never decide state, rewards or permission.

The first full scene remains the agreed **9×7 Afterlife Office**: Case Worker, Records Desk, Stat Generator, Rolodex, first Glitch consequence and the Hallway route. The Stat Generator handles traits/stats; the Case Worker and Rolodex handle placement. Keep these responsibilities distinct.

## This increment: one saved-world command path

Adopts the M19 deterministic engine and owner store from draft #27 at `c6a57083f68e1f713502e7a4296433fd99a74e5e`, without merging its old stack or shipping the localStorage board. The existing M19 **5×4 development world** is a bounded integration fixture, not the completed 9×7 first-hour content or recovered-v4 parity proof.

| Layer | Implemented behavior |
| --- | --- |
| Rules | Server-owned move, inspect, open and talk commands; persistent object changes and Case Worker topic memory. Saved event history is bounded. |
| Persistence | Current run selected by verified owner and supported state schema; owner-filtered row lock, expected revision and transactional commit. No browser-supplied owner, state, RNG or effects. |
| Player view | Whitelisted map/player/action projection; no native tokens, Account IDs, owner field, internal saved state or raw NPC memory. |
| Opening mission | “Open your case”: read intake notice, find Billy's case file, discuss placement. Progress derives from committed facts and survives resume. No invented reward/stat system. |
| Journal | Last eight player-visible actions and dialogue; persisted domain history retained up to 128 events. |
| Main client | Loads actual server state, begins only after explicit supported `run_not_found`, sends offered commands and expected revision, waits for confirmed commit. Session/permission/conflict failures clear the playable view. No simulation, browser save, background create or demo fallback. |
| API boundary | Native bridge session resolve + active matching canonical description; exact Host/Origin, credentialed CORS, CSRF on writes, strict body/command fields and size/deadline limits. |

`game/world-client.mjs` is the presentation controller for the main scene. This increment deliberately creates no replacement demo page. The main Phaser scene should consume this controller and animate committed positions, with input disabled while a command is pending.

## Candidate API — not deployed

- `GET /api/game/world`: authenticated owner's latest supported world run, or `404 run_not_found`.
- `POST /api/game/world/runs`: empty JSON object; run ID is generated server-side.
- `POST /api/game/world/actions`: `{runId, expectedRevision, command}` only.
- Every response is no-store. Unknown implementation/DB errors become bounded `503 world_unavailable`; no private exception text.

The factory `createWorldGameHandler` has no server, secret loader, default pool, default authorization or import side effects. A caller must explicitly provide an approved live adapter, owner store, exact origins and separately reviewed deployment composition. The store requires an explicit `authorizeWorld` callback for create/load/action; production must map it to **actual registered per-action capabilities**, never `()=>true`, a role shortcut or a guessed grant name. Test fixtures use synthetic identity/capability decisions only.

## Evidence and limits

Local Node tests cover mission persistence, public projection, client command submission, concurrent UI requests, stale commit responses, owner/session/permission denial, strict origins/CSRF, duplicate cookies, authority injection and bounded bodies. Existing native-cookie resolver regression tests still pass after extracting its reusable session resolver.

`Main game transaction checks` uses a fresh disposable PostgreSQL 16 service and pinned test-only `pg@8.16.3`. It exercises the actual main client → HTTP → owner transaction → reload, then a **new Node process** restores the same view. It tests concurrent submissions, cross-owner denial and rollback after an SQL UPDATE. It refuses missing/non-disposable database configuration. A successful run proves that isolated fixture, not production DB migration/backup safety, a live Account capability or complete gameplay parity.

The real Account positive login/reload/logout/re-login was observed separately in ACOS #167. Expected identity attribution, negative live CSRF/CORS, independent stale-binding replay, external revocation, natural expiry and second-account isolation remain open. Fixture denial tests here do not close those gates.

## Next main-game increments

1. Replace the bounded development world with the agreed 9×7 office content and wire the existing Phaser visual layer to `world-client`; no separate browser authority.
2. Add authoritative Records Desk/inventory, authored intake dialogue, Stat Generator assessment and Rolodex route selection through this same command transaction.
3. Add the first Glitch/consequence and Hallway transition with persisted RNG/Director state, supported-schema validation and deterministic replay evidence.
4. Prove the complete first-hour save/resume and concurrency journey with actual approved Account identities, grants and isolated storage before any production gameplay promotion.

## Boundary remains closed

No production handler composition, route mounting, map provider, capability registration, database migration or player-save writes are performed by this source change. Do not run the migration against production. ACOS #126 stays draft/unmerged; production map/gameplay/cloud saves remain disabled. Source or fixture CI passing is not an activation decision.
