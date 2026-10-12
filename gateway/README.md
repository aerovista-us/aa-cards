# Ascension Identity Gateway deployment checklist

This reference server handler is **not deployed or authenticated**. Static GitHub Pages is a UI host, not the required same-origin authenticated backend.

## Verified baseline
The currently available `@aerovista-us/app-adapter/server` v0.4 source exposes `auth.exchangeHandoff(code)`, `auth.resolveSession(token)`, `auth.revokeSession(token)`, `identity.describe(token)`, and `identity.can(token, request)`. Browser integration starts Account login with `client_id`, `return_to`, and random `state`, then exchanges the one-time code at same-origin `/api/auth/handoff-exchange`.

## Implementation staging
- `gateway/identity-handlers.mjs` is an initial **server-only reference**, not production-ready. It returns 503 rather than minting a session without a verified server handoff-token resolver.
- It must be built into the approved authenticated app server with the exact published Adapter dependency and secret-management process; not deployed as a Pages static artifact.
- Add identity description/capability endpoints using the real Adapter, plus session binding, CSRF token checks, trusted reverse proxy host enforcement, expiry/revocation tests and cookie scope appropriate to the selected app-owned origin.
- Register `aa-cards` in Account with exact return-to origin. A dedicated AeroVista app hostname is preferable because GitHub Pages cannot serve the same-origin backend at `aerovista-us.github.io`.
- Make Account login controls active only after a complete browser handoff, legitimate session, invalid token, logout, substituted session, unauthorized game action and per-user save tests pass.

## Blocking unknowns
- The app registration and redirect allowlist have not been proven.
- The deployed handoff exchange response token field and session descriptor must be read from current authoritative Identity Gateway code or observed using controlled test fixtures before setting `resolveHandoffToken`.
- A publicly accessible identity-aware gateway app hostname and release lane must be selected/approved.
- Game capabilities/entitlements for players must be registered in AVCC rather than invented by Cards.

## Preview remains independent
The current GitHub Pages Cards demo and local import flow remain available without login. No private AVCC token or per-user run data belongs in this public repository.
