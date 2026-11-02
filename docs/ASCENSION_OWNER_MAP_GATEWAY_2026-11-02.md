# Ascension V4 — Owner-scoped map session gateway (staging)
Date: 2026-11-02
Status: **source and fixture verification only; NOT DEPLOYED**. Do not enable real player controls.

## Why this exists
The Phaser V3 viewer already accepts \`ascension.map-view.v1\` but only replays synthetic frames. The existing PostgreSQL read in \`owner-run-store.mjs\` returns \`id,revision,state\` without \`owner_subject\`, while the defensive \`projectOwnedVisibleMap\` requires a verified owner field. Returning that raw player run in the public response would leak hidden game state.

This phase introduces a **separate, read-only** SQL → ownership → projection → HTTP → browser contract without modifying the canonical choice and cutscene transactions.

## Implemented in source
- \`gateway/avcc-map-identity.mjs\`: server-side resolver reads the opaque HttpOnly \`aa_cards_session\` handle from a **durable server-side session store**, then verifies \`adapter.auth.resolveSession(token)\`, checks \`adapter.identity.describe(token)\` for the **same identityId** and active identity, and requires \`adapter.identity.can({ identityId, capability })\` to allow access. Rejects duplicate/invalid cookies, inactive or revoked accounts, and missing capability configuration.
- \`gateway/owned-map-session.mjs\`: DB read uses bound owner subject only:
  \`SELECT id, owner_subject, revision, state FROM ascension_player_runs WHERE owner_subject=$1 ORDER BY updated_at DESC, id DESC LIMIT 1\`.
  It handles PostgreSQL bigint revisions safely. \`projectOwnedVisibleMap\` checks owner again, filters undiscovered map tiles and only includes trusted visible markers. The client cannot select another owner's run.
- \`gateway/map-session-http.mjs\`: mountable **GET /v1/game/map** handler requires an exact HTTPS appOrigin, matching Host and optional Origin, no query-string or other HTTP methods, no CORS headers, no-store/private response headers, and generic errors without SQL or token details.
- \`phaser-lab/authority/live-map-client.mjs\`: dormant **same-origin only** GET client that validates \`ascension.map-view.v1\`. It is **not imported by GitHub Pages** and cannot auto-connect to NXCore or expose credentials.
- Tests: AVCC-shaped session/capability fixtures; owner query binding; redaction; revocation; invalid headers, cookies and host; HTTP no-store; no game writes; full composed request with disposable fixture store and PostgreSQL mock; previous Chromium viewer tests unchanged.

## Source verification versus live verification
On NXCore's local App Adapter source tree \`/srv/ACOS/_worktrees/identity-grant-scope-v1/packages/aerocore-app-adapter\`:
- \`SessionResolveResponse\`: \`{ ok, authenticated, identityId }\`.
- \`IdentityDescribeResponse\`: \`{ ok, authenticated, identity:{ identityId, status, ... } }\`.
- \`CapabilityResponse\`: \`{ ok, allowed }\`.
- An App Adapter handoff response **type** includes \`sessionToken\`. This does **not** prove the deployed exchange service has the same schema, the app is registered or the token exchange succeeds. The existing identity handler remains gated.

## Exact composition required on approved production backend
The future app-owned **TLS-terminated, exact-host** server should:
1. Verify actual \`aa-cards\` client registration, app origin, redirect allowlist and real handoff shape against active AVCC Gateway. Confirm issuer, session revocation, TTL and cookie semantics.
2. Construct the **server** App Adapter with protected service credentials (never GitHub Pages/browser assets), and a durable handle→token session store.
3. **Explicitly configure a real registered capability** (do not simply invent \`ascension.game.play\`); use \`createAvccMapIdentity({adapter,sessions,capability})\`.
4. Use \`createOwnedMapSession({pool, ...identityResolvers, listVisibleMarkers})\`. Marker provider MUST be server-approved and already filtered for visibility. Pass \`async()=>[]\` until source-derived visible markers are verified.
5. Mount \`createMapSessionHttpHandler({service,appOrigin})\` on \`GET /v1/game/map\` only, with TLS, exact hostname preservation, durable sessions, per-account rate limits and audit logging at the trusted server boundary. There must be **no public tailnet or database endpoint**.
6. Confirm a restored production-equivalent PostgreSQL schema and run format with an **isolated disposable database** before connecting any real data.
7. Test login→map read→logout→401, capability deny→403, cross-user run→404, absent run→404, revoked/expired session→401, invalid/hidden marker redaction, malformed state→503, rate limiting and no private fields in HTTP body. Retain a deterministic revision across reload.
8. Only after real browser acceptance, update the Phaser viewer to use \`fetchOwnedMap\` in an **authenticated app-owned origin** and keep current Pages demos separate.
9. Do **not** enable POST movement or choices until full recovered turn parity, atomic revision writes, entitlements, save/restart and browser recovery pass.

## Explicit blockers
- No verified **live** \`aa-cards\` app registration + exact callback/origin/identity grants.
- No verified live session-cookie/handoff exchange against the deployed Identity Gateway; local App Adapter source types alone do not prove service behavior.
- No approved public application gateway mounting the route, or signed-off host/proxy controls.
- No verified production-equivalent restored run schema and database acceptance in this phase.
- No canonical movement/turn state parity; tests here validate the **read-only** contract.

## Important release distinction
Passing unit, HTTP fixture and Chromium replay tests means the *staged implementation is internally consistent*. It does not mean the user can log in, that the full recovered game is ready, or that saves can be created or resumed. Production gameplay remains disabled.
