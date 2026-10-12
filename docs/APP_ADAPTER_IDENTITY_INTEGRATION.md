# Identity integration: Ascension Cards / App Adapter

**Status: staged/fail-closed, not yet an authenticated app.**

Source inspected on NXCore: `/srv/ACOS/_worktrees/identity-grant-scope-v1/packages/aerocore-app-adapter`, baseline 0.4.x, and `docs/AEROCORE_APP_ADAPTER_V0.md`. The supported integration uses `@aerovista-us/app-adapter/browser` to start Account login and registration, and **requires a same-origin app backend** to perform `/api/auth/handoff-exchange`, `/api/auth/session`, `/api/auth/me`, `/api/auth/capability-check`, and `/api/auth/logout`. The backend uses `@aerovista-us/app-adapter/server` for live identity.can checks with HMAC service identity. Never put HMAC credentials in Pages.

## What was actually found
- Account login origin `https://account.aerocoreos.com/login` responded HTTP 200.
- GitHub Pages origin: `https://aerovista-us.github.io/aa-cards/`.
- No verified `aa-cards` client registration or same-origin exchange handler was found during this pass. Do **not** claim users can log in yet.
- `js/game-frame/account-adapter.js` records the proposed App Adapter handoff shape but explicitly disables login and registration until those prerequisites exist.

## Proposed application registration
- App ID / `client_id`: `aa-cards` (register this with Account first; do not presume it exists).
- Redirect: `https://aerovista-us.github.io/aa-cards/auth/callback/` (must be explicitly allowlisted).
- A production app-owned hostname is preferable to GitHub Pages for same-origin session cookies, handoff exchange, and protected game operations. Until configured, keep Pages as the public design/demo experience only.
- Grant only least-privilege capabilities such as `ascension.game.play` and `ascension.save.manage`, subject to actual AVCC capability namespace/registration review. These are proposed labels, not existing verified grants.
- Guest: preview access, no authenticated save mutation. Authenticated eligible player: game and personal saved runs. Staff/admin/founder: no implicit access to another player's runs; all elevated operations require explicit additional live authorization.

## Acceptance sequence
1. Register `aa-cards` application and approved redirect URLs in the Account/Identity Gateway registry.
2. Create same-origin app backend gateway with `@aerovista-us/app-adapter/server`, approved environment secrets and protected endpoints.
3. Connect browser adapter `beginLogin`, `completeLogin`, `session` and `identity.can` to the backend; validate state, replay, logout and stale-session handling.
4. Implement server-authoritative game operations and per-owner run access; require live capability on every choice/save action.
5. Test browser login/register/callback on published domain, denied capability, account mismatch, logout and stale/replaced session, alongside gameplay/save-resume.
6. Enable account controls only after all tests pass. Maintain public Pages demo throughout.

## Policy
No secret-bearing identity calls in frontend, no cross-origin direct AVCC internal endpoint calls, no wildcard credentialed CORS, no UI-based role authorization. The App Adapter remains the integration seam; Identity Gateway is authoritative for identities/grants, and Ascension v4 remains authoritative for game decisions.
