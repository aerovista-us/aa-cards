# Ascension release acceptance — November 11, 2026

**Decision: production gameplay, protected maps and cloud saves remain disabled. ACOS #126 stays draft/unmerged.** This is an evidence ledger, not a release certificate.

## Current evidence

| Area | Evidence | Remaining limit |
| --- | --- | --- |
| Registration/auth wiring | ACOS [#167](https://github.com/aerovista-us/ACOS/issues/167) records Gateway admission 5/5 and anonymous public checks 6/6 after the protected repair. | Recorded operational evidence; this document does not rerun protected checks or inspect configuration/credentials. |
| Real Account browser | #167 records fresh callback, signed-in UI, reload continuity, normal logout and re-login. | PARTIAL: private expected-identity attribution, full state/single-use/cookie observations, negative CSRF/origin, external revocation, natural expiry and independent second-account denial remain open. |
| Main authored game | [#39](https://github.com/aerovista-us/aa-cards/pull/39) and [#40](https://github.com/aerovista-us/aa-cards/pull/40) merged the Office/Hallway source and guarded owner save creation, with disposable PostgreSQL and synthetic Chromium journeys. | The handlers remain unmounted in production. Fixtures do not certify real Account grants or production storage. |
| Recovered reference modules | Bounded choice, map, memory and cutscene ports already exist on main. The consolidated disposable proof covers the exact created run for owner denial, revision concurrency, rollback and process resume. A separate CI service-restart proof checks complete persisted-row/private-run/public-view digests and resumed authored actions after disposable PostgreSQL restarts. | A one-tile observation and an explicitly prepared cutscene queue are not the recovered first-hour executor. Disposable fixture recovery is not production backup/restore or independent recovered-browser parity. |
| Production composition | No game handler, map-service injection, capability grant, production migration or save writer is enabled by this source cleanup. | Requires separate review, registered per-action capabilities and operator-approved storage/migration/backup/rollback evidence. |
| Isolated data recovery | The [fresh-volume recovery proof](DATABASE_RECOVERY_ACCEPTANCE.md) restores actual dump bytes, compares every persisted field, resumes through a restricted application role and new process, and rejects corrupt archives. | Synthetic fixtures only. Production storage/roles, migration/encryption/retention and operator backup/rollback acceptance remain open; no real Account acceptance is implied. |

The October 24 claim that the auth hostname did not resolve is historical and superseded by #167. The legacy unauthenticated `/api/runs` prototype must not become the public game API.

## Promotion evidence still required

1. Real authorized Account A/B acceptance: exact identity/session attribution, callback state and single-use behavior, supported cookie attributes, CSRF and origin denials, logout followed by stale-binding denial, external revocation, and natural expiration with server refusal. Capture only sanitized booleans/statuses and synthetic account labels; exclude credentials, codes, states, cookie/token values and personal IDs.
2. Exact live capabilities for create/load/action/travel and map access, checked server-side from the current native session. A test callback returning true is not a deployed grant.
3. Isolated authenticated browser → handler → owner transaction → save → logout → login → resume evidence for the approved candidate, including concurrent creation/actions, independent accounts, denial preservation and migration/recovery rehearsal.
4. Accepted content scope: authored game acceptance follows the approved design and current Office/Hallway contract. Recovered source remains a reference; any future claim of recovered parity needs independent complete-state/map/RNG differential evidence. No such claim is made by these merges.
5. Separate production promotion decision tied to source revision, image, reviewed composition, storage permissions, rollback artifact and sanitized acceptance ledger. Passing source CI never mounts a route or clears this gate.

## Anonymous preflight

`node scripts/verify-live-game-readonly.mjs` sends fixed-origin GET requests without credentials and without following redirects. It probes the public UI, auth health, anonymous session/access, and disabled map/world routes. It never redeems callbacks, initiates sign-in, supplies cookies, runs game commands or prints response bodies.

Exit 2 means a probe failed. Exit 3 means anonymous preflight passed but full acceptance remains unestablished. It deliberately never exits 0 to certify a release. HTTP 404 for a disabled map is not owner-isolation proof.

## Older PR disposition

- #16–18 and #21–23: runtime/module changes already match main. Their remaining environment-specific PostgreSQL script is replaced by `tests/recovered-transactions.pg-ci.mjs`; several older copies queried the wrong run ID for owner denial.
- #19/#20: alternate prologue implementations use divergent queue/claim behavior and omit the current pending-setup boundary. Retain their branches as references; use main's `transitionRecoveredEarthToAfterlife`, `pendingCutsceneQueue` and owner cutscene transaction rather than merging a parallel state model.
- #1: the early session-handle integration proposal is superseded by the deployed native Ascension bridge and main's session resolver/world handler. It is not a reason to revive the unmounted `/api/auth` scaffold or guess exchange field mappings.
- #24: superseded draft retained at its immutable reference SHA. All 110 files are classified in [the disposition manifest](PR24_FILE_DISPOSITION.json); 26 are already identical on main, two are superseded by hardened main, one by the guarded PostgreSQL proof, and 81 remain reference-only. [Review findings and remaining work](PR24_DISPOSITION.md) explain the archive decision. The useful database-service-restart test objective is carried forward against the current candidate. No bulk merge, recovered-parity claim or full-game certification is implied.
