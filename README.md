# Ascension Awaits — Cards Frame

Isolated, mobile-first visual preview for Ascension Awaits cards and Soul Case File.

## Account connection

The home page offers Sign in / Create account through the deployed `https://ascension-auth.aerovista.us` bridge and a fixed root return. The account panel checks `/api/session` using credentialed CORS, holds the separate CSRF value in memory, and signs out through `/api/logout`. It confirms the signed-out session before displaying success. Errors are generic; identity IDs, native tokens, CSRF values and raw backend errors never enter public status or browser storage.

Account controls exist so authorized users can exercise the real browser acceptance flow. Their presence and the fixture tests do not establish real Account callback/attribution, revocation, expiry or cross-account acceptance. Full acceptance remains tracked in [ACOS issue #167](https://github.com/aerovista-us/ACOS/issues/167); ACOS #126 stays draft.

**Account-backed gameplay, map and cloud saves remain disabled.** The new account panel calls only session/logout endpoints and never fetches maps, submits turns, checks grants or writes saves. Synthetic character data and isolated visual/story prototypes remain separate.

## GitHub Pages

The root `index.html` and local ES modules are static and work directly from Pages. No runtime service secret belongs in this repository. Configure Pages from `main` at `/ (root)`.

## Checks

Run `node --test tests/*.test.mjs`. Account UI fixtures cover signed-out/active/malformed/unavailable sessions, callback markers without a session, credentialed requests, CSRF logout, unconfirmed/logout failures, stale responses and keeping preview choices disabled. Fixture checks are not live human account acceptance.

## Integration path

Retain the canonical Ascension state/Director/save authority when integrating gameplay. Do not expose private saves or protected API credentials via static hosting.
