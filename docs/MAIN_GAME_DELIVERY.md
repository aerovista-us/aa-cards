# Ascension Awaits — main-game delivery

November 10, 2026 (Pacific). Development candidate; production gameplay remains disabled.

## Connected Afterlife Office

The main candidate at `game/index.html` connects the approved **9×7 Afterlife Office** to the server-owned command/save pipeline. Billy starts at (4,4); the Case Worker is at (4,2), Records at (4,5), Stat Generator at (1,3), Rolodex at (6,3), and Placement Door at (4,1). Phaser renders committed public facts. Keyboard, touch controls, canvas navigation and the accessible map submit offered server actions; they never simulate outcomes or save progress in the browser.

| Station | Saved behavior |
| --- | --- |
| Intake notice | Records the opening mission step. |
| Records Desk | Supplies Billy's case file and queue ticket once; collection requires proximity. |
| Case Worker | Remembers introductions and topics. Authorizes placement only after Records and assessment; reacts to the Glitch decision. |
| Stat Generator | One persisted private d20 draw after Records/introduction: 1–7 Grounded, 8–14 Pattern Seeker, 15–20 Echo Attuned. This authored assessment never selects a destination. Echo Attuned reduces concealment heat by one. |
| Rolodex | After approval, records Memory Annex or Present Hall and reveals THE MITCH anomaly. The player must inspect it before deciding. |
| First Glitch | Report: heat 0, recorded Case Worker support and future Hallway assistance. Conceal: heat 2 (1 if Echo Attuned), suspicion 1 and future Hallway scrutiny. Both grant a placement pass once and complete intake. |
| Placement Door | Recognizes completed intake; the Hallway attendant has not called the next group. **Hallway traversal is not implemented.** |

This is an authored first intake, not a claim of complete recovered-v4 or first-hour parity. The saved Hallway consequence is a future hook; current observable consequences are heat, pass, journal and Case Worker dialogue.

## Authority and persistence

Rules live in `gateway/office-intake.mjs`; `world-interaction-engine.mjs` preserves the engine import boundary. Schema **2** validates saved intake facts and RNG checkpoint. Unsupported schema-1 Office saves fail closed with `unsupported_save_version`; the current-run query does not hide them as a missing run. There is no automatic reset or migration. Any earlier fixture-save migration requires separate review.

The owner store filters by verified subject, locks the row, checks expected revision and commits atomically. No client-supplied owner, state, RNG, inventory or effects are accepted. The public **`ascension.world-view.v2`** projection supplies geometry, available commands, six mission steps, last eight journal entries and a sanitized case file. It omits native tokens, Account IDs, private RNG seed/checkpoint, raw NPC memory and future Director consequences. Domain history is bounded at 128 events while durable quest facts remain saved.

The client loads actual server state, begins only on explicit input after confirmed `run_not_found`, and animates only committed coordinates. Input locks during saving/animation. Conflicts and inactive/failed sessions clear the canvas and playable view. Reload restores the server revision; there is no localStorage gameplay fallback. Reduced motion and an accessible button map remain available alongside Phaser.

## Candidate API — not deployed

- `GET /api/game/world`: authenticated owner's latest Office run, or `404 run_not_found`.
- `POST /api/game/world/runs`: empty JSON object; server generates the run ID.
- `POST /api/game/world/actions`: `{runId, expectedRevision, command}` only.

The factory `createWorldGameHandler` has no server, secret loader, default pool, default authorization or import side effects. It requires an approved native-session adapter, owner store, exact origins and separately reviewed deployment composition. Native session resolution must match an active canonical identity. Host/Origin, credentialed CORS, write CSRF, duplicate-cookie, strict-body and request-size/deadline checks remain enforced. All responses are no-store; unknown errors become bounded `503 world_unavailable`.

The store requires explicit `authorizeWorld` decisions for create/load/action. Production must use **actual registered per-action capabilities**, never `()=>true`, a role shortcut or guessed grant. Synthetic fixture decisions are not live grants.

## Evidence and limits

Node tests cover geometry, movement, prerequisite/range/one-time rules, deterministic assessment and replay, both Glitch choices, save restoration, public-field stripping, HTTP/client flow, stale/concurrent requests, cross-owner/session/permission denial, CSRF/origins/cookies and bounded parser failures.

`Main game transaction checks` provisions disposable PostgreSQL 16 and pinned test-only pg 8.16.3, Playwright 1.58.2 and Phaser 4.2.1. It proves the client → HTTP → transaction → reload path and restoration in a **new Node process**, concurrent submissions and SQL rollback. A separate real Chromium journey plays the connected Office, captures desktop/mobile screenshots, checks persisted assessment/intake, duplicate-use denial, stale revision clearing and inactive-session clearing. Both runners refuse non-disposable configuration. Browser cookies and identities are synthetic loopback fixtures; these are not live Account security acceptance or production backup/migration evidence.

Positive live Account login/reload/logout/re-login evidence belongs to ACOS #167. Live identity attribution, negative CSRF/CORS, stale binding, external revocation, natural expiration and second-account isolation remain open. These fixtures do not close them.

## Next gates

1. Author the Hallway scene and consume the persisted assistance/scrutiny consequence through the same transaction boundary.
2. Expand assessment balance, dialogue, NPC memory and first-hour content against reviewed recovered design requirements.
3. Review supported-save migration, production DB rehearsal/rollback, registered capabilities and handler composition.
4. Complete isolated authenticated Account acceptance and first-hour save/resume/concurrency before any gameplay promotion.

## Production boundary

This source change mounts no production handler, registers no capability, runs no production migration and writes no production player save. ACOS #126 stays draft/unmerged. **Production gameplay, map and cloud saves remain disabled.** Source and isolated CI acceptance do not authorize activation.
