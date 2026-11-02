# Ascension Cards ↔ Ascension game API contract (draft v1)

The canonical Ascension v4 Director/State server remains authoritative. The existing NXCore `/api/runs` endpoints do **not** implement this contract, so the publicly hosted UI must not present interactive live-play controls as functional yet.

## Trust boundary
- Cards frontend: untrusted, read-only projection of server state. It may request a choice but must not apply its own roll, AP cost, outcome or save.
- Game gateway: authenticate a legitimate AVCC/ACOS identity session; derive the user and authorized run on the server. No browser-supplied ownership claims.
- Authoritative game service: validate world/storylet eligibility and revision; atomically execute original choice logic and persist. Avoid relying on a DOM click in the production API.
- Response: release only sanitized, player-visible story state and allowed actions. Keep hidden story gates, server seeds, future outcomes and private metadata out of public responses.

## Proposed endpoints (not yet implemented)
`GET /v1/game/session`: authenticated, no-store; yields `{ sessionId, revision, state: { character, storylet, inventory, flags, companions, turn } }`. No active encounter is valid. Include only visible information.

`POST /v1/game/choices`: authenticated, JSON `{ sessionId, storyletId, choiceId, expectedRevision }`; enforce same-site/session protection and origin policy; server checks current session, storylet, choice, eligibility, AP and revision. Return updated sanitized `{ revision, state, outcome }`. Return 409 if stale, 401 for unauthenticated, 403 for unauthorized, 422 for invalid choice. Enforce idempotency (one committed action per revision).

## Deployment gates
1. Integrate an authorized publicly reachable HTTPS gateway, without direct access to tailnet IPs in the client bundle.
2. Reject wildcard credentialed CORS. Allowlist the exact `https://aerovista-us.github.io` origin and configured production domains; verify allowed methods, headers, and credentials.
3. Add CSRF controls, rate limits, audit trail, session expiration, idempotent commit, transaction handling, and a user-specific save authorization policy.
4. Test with disposable authorized runs: accepted choice, stale revision, double-submit, cross-user run access, logout, save/resume, mobile and failure recovery.
5. Only after real endpoint and tests exist should the cards UI expose enabled online-play buttons.

## Current frontend implementation
`js/game-frame/remote-api.js` implements an **unwired client for the proposed contract**, using HTTPS origin validation, credentialed calls, schema checks and revision preconditions. No public endpoint is configured, and the existing visual demo plus local-only save importer continue to work. This client is not an authentication solution.

## Deploy
This repository's `main` is GitHub Pages source. The static demo/importer should remain unchanged until authenticated runtime acceptance is completed.


## Staged read-only Phaser map contract (2026-11-02; not deployed)

\`GET /api/game/map\` is a **separate, proposed, read-only endpoint**, not a
replacement for the full \`GET /v1/game/session\` and \`POST /v1/game/choices\`
draft contracts above. Its \`ascension.map-view.v1\` shape contains only
authorized discovered tiles, walkable flags, current position, revision, turn,
world ID, and approved visible markers. No private saved-state fields are sent.

The existing identity cookie has \`Path=/api\`, so this proposed route deliberately
remains within \`/api\`. The implementation is staged in \`gateway/\` and uses a
server-only AVCC session/grant resolver and owner-bound database query. It remains
unmounted until actual App Adapter registration, session, grants, database,
origin/TLS and real browser acceptance are proven.

\`phaser-lab/authority/live-map-client.mjs\` is a **dormant** same-origin client.
The publicly accessible Phaser laboratory still uses synthetic recorded frames.
