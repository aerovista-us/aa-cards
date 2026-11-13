# Ascension — isolated authenticated-world composition candidate

Status: **staging source only / NO PUBLIC ROUTE**, built on [PR #51](https://github.com/aerovista-us/aa-cards/pull/51). Related workstream: [#45](https://github.com/aerovista-us/aa-cards/issues/45), [#46](https://github.com/aerovista-us/aa-cards/issues/46), and ACOS [#126](https://github.com/aerovista-us/ACOS/pull/126).

## Function and trust boundary

`gateway/world-staging-composition.mjs` exports `createPreparedWorldGameHandler({adapter,pool,capabilityNames,appOrigin,uiOrigin})`. It composes the existing trusted pieces without changing their public interfaces:

1. `createWorldCapabilityAuthorizer`: requires five distinct operator-supplied capability names and uses existing App Adapter `identity.can({identityId,capability})`. Travel requires **action plus travel**. Grants are verified on every request; unsupported requests never authorize.
2. `createOwnerWorldInteractionStore`: uses verified native subject, owner-bound SQL, explicit revision CAS, transaction rollback, and a server-generated run ID. No client-provided owner, RNG, inventory or save state is accepted.
3. `createWorldGameHandler`: uses `createAscensionBridgeSessionResolver` to reconcile the native Account session with active identity before requests reach authorization. Strict Host/Origin, CSRF, duplicate-cookie, request-shape, no-store and sanitized error boundaries remain active.

Calling this factory creates only an inert handler function. No server is started, map service injected, grant minted, migration run, external request sent or production save written. The containing application must explicitly mount it **after** all approvals and independent acceptance.

## Test evidence, synthetic only

- `tests/world-staging-composition.test.mjs`: two tests verify an inert factory and construction failures when live authorities, capability names, pool or exact origins are absent.
- `tests/world-game.pg-ci.mjs`: additional subtest passes two synthetic native-session identities through real loopback HTTP → resolver → current per-action grant policy → owner-locked PostgreSQL 16. Checks denied create, accepted create/load/inspect, stale revision (409), missing travel/action grant (403) before mutation, stolen run (404), separate second account, revoked session (401), re-login/resume at the same revision, and revoked load (403). Complete persisted row equality is asserted after denials.
- NXCore: `node --test tests/*.test.mjs` **164/164 pass**. Fresh disposable PostgreSQL `node --test tests/world-game.pg-ci.mjs` **11/11 pass**; script cleans up its temporary Docker instance and database.
- The GitHub `world-postgres` workflow runs the full game fixture, restart/recovery, and both Chromium Glitch paths on the exact branch head; confirm its result before merging.

## Remaining gates: NOT_RUN / BLOCKED

- Actual registered identity capabilities and current App Adapter/AVCC grants, not fixture strings or automatic role elevation.
- Authorized fresh Account A/B browsers, private expected canonical subject checks, callback single-use/expiry, CSRF/Origin/CORS denials, UI logout and native stale-binding refusal, external revocation and **natural** expiry.
- Production-equivalent staging HTTPS routing, approved least-privilege application role, schema compatibility, independently rehearsed backup/migration/rollback, realistic storage and recovery objectives.
- Real Account first-hour browser journey, both Glitch outcomes, user-specific save/load/resume and concurrent action/refusal under current live grants.
- Exact source SHA/image/recovery evidence, independent security review, explicit later promotion approval.

**No production change is authorized by passing synthetic tests.** ACOS #126 remains draft and map/game/cloud-save routes remain disabled. No native secrets, identity values, cookies, full callback URLs or player saves belong in shared test evidence.

## Follow-up for assigned operator

Once approved Account identities, registered capabilities and reviewed storage exist, instantiate this factory in a genuinely isolated staging server; do not initially mount it in production. Collect sanitized A0–A9/M1–M4 evidence using the existing private Account observer. Review any failure before attempting promotion. Leave NOT_RUN as NOT_RUN.
