# Ascension V5 — Deployed authentication bridge reconciliation
Date: 2026-11-02
Status: **source verified; public bridge health/session behavior verified without login; gameplay remains disabled**.

## Actual deployed origin and observed requests
- Service: https://ascension-auth.aerovista.us (public HTTPS).
- \`GET /health\` returned HTTP 200 and \`{"ok":true,"service":"ascension-auth"}\`.
- \`GET /api/session\` with no session returned \`{"authenticated":false,"identity":null,"csrf":null}\`.
- \`GET /api/access\` without a session returned HTTP 401.
- \`GET /api/game/map\` returned HTTP 404: the map route is not mounted.
- \`GET /api/session\` with the exact \`Origin: https://ascension.aerovista.us\` was observed to include credentialed CORS headers. This does **not** establish a successful login.
- Running Docker container \`ascension-auth\` uses image \`aerovista-ascension-auth:0.1.0\`. Its inspected source contained the same basic login/callback/session/logout route contract as the ACOS staged branch below.

## Canonical source / branch discrepancy
- GitHub \`aerovista-us/ACOS\` PR #126, **Stage Ascension Cards Account handoff registration**, remains **OPEN and unmerged**. Its branch \`feature/ascension-cards-handoff-registration\` includes \`services/ascension-auth/src/index.js\`, \`policy.js\`, and registered \`aa_cards\` handoff source.
- \`ACOS/main\` does not contain \`services/ascension-auth\` in the inspected repository tree. A running container therefore **does not prove the source is merged or under an accepted deployment lane**.
- Existing production deployment/upgrade must reconcile running image provenance and the source branch, not blindly rebuild from \`main\` or deploy a duplicate auth service.

## Critical V4 correction
The V4 staged reader in \`gateway/avcc-map-identity.mjs\` modeled an **alternative** app-owned cookie \`aa_cards_session\` (opaque 43-character session handle stored server-side, \`Path=/api\`). It is **not the deployed Ascension bridge contract**.

Actual running bridge:
- Browser API: \`https://ascension-auth.aerovista.us/api/session\`.
- Cookie: \`ascension_avcc_session\`, \`HttpOnly; Secure; SameSite=Lax; Path=/\`. This is a native AVCC session token stored as a cookie on the auth-bridge origin.
- \`/login\`, \`/register\`, \`/auth/callback\` and \`/api/logout\` are live bridge routes.
- Actual session auth resolves a native token and describes identity server-side. Never send the token or service secret to GitHub Pages, logs or a response.
- \`ascension.aerovista.us\` is a separate browser origin. Credentialed \`fetch\` must use \`credentials:'include'\`, \`mode:'cors'\` and an exact CORS allowlist. The V4 \`credentials:'same-origin'\` client would **not send the bridge cookie from the public website**.

## Implemented in V5, but not mounted on the live bridge
1. \`phaser-lab/authority/bridge-status.mjs\`: explicit, user-initiated, GET-only diagnostic against the **real** auth origin. Signed-out users only query \`/api/session\`. Signed-in users can check the read-only map route. Nothing is submitted or saved.
2. \`phaser-lab/authority/\` now displays a small live-bridge readiness panel but the Phaser map replay is **still synthetic**.
3. \`gateway/ascension-bridge-identity.mjs\`: server-only native-token cookie parser, live \`auth.resolveSession\` and \`identity.describe\` consistency/active-state checks, mandatory live \`identity.can\` for an explicitly configured, **registered** capability.
4. \`gateway/map-session-http.mjs\`: supports exact, approved UI-origin credentialed CORS on the bridge host, validates Host/Origin, GET method, no query-run selection, and no-store response.
5. \`gateway/ascension-bridge-map-handler.mjs\`: unmounted composition of native AVCC identity → PostgreSQL owner-bound run → sanitized map projection → HTTP response. No secrets, server or DB connections created by module import.
6. Unit, HTTP and Chromium checks for origin denial, cookies, capability requirements, owner isolation, field redaction and opt-in-only browser diagnostics.

## Blockers before production map or game
1. Merge/approve and reconcile ACOS PR #126 with the running auth image and broker handoff registration; prove that a real \`aa_cards\` Account login completes through callback and logout invalidates it.
2. Verify which AVCC capability controls view of game state. No **invented** capability strings can count as release evidence. Register and enforce approved capability on the real broker.
3. Introduce \`/api/game/map\` in the **actual** managed bridge source with the reviewed owner-scoped map adapter; configure a least-privilege PostgreSQL connection. Current route is 404.
4. Prove isolated DB schema and canonical map tiles using restored state, not only synthetic fixtures. Verify discovered semantics and mapping of persisted tags to walkability against the recovered map engine.
5. Confirm cross-user denial, revocation, disabled capabilities, expired cookies, no-store/redaction, CORS and real browser acceptance for an approved test player.
6. Complete recovered movement/turn/cutscene parity and atomic save/resume before exposing live Play Game controls.

## Prohibitions
- Do not set new \`aa_cards_session\` cookies alongside native bridge cookies as a shortcut.
- Do not copy native tokens into browser JS, localStorage, query strings or public static JSON.
- Do not imply \`/api/game/map\` is live, or label the synthetic replay a saved game.
- Do not overwrite the running auth container from unmerged/unknown source or make blind infrastructure edits.

**Next integration target:** reconcile ACOS PR #126, then mount the map-read handler against a disposable owner-scoped PostgreSQL run with verified, account-bound identity. The public visual scenes remain independent.
