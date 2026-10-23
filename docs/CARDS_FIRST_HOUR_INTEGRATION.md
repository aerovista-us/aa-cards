# Ascension Awaits Cards — one-frontend implementation track

Status: staging contract only; no live gameplay wiring or production cutover.

## Authority rules
- Cards is the sole intended player-facing game presentation; the recovered Ascension v4 Director stays authoritative for state, turns, AP, choices, rolls, encounters and durable saves.
- A static Pages preview is not a secure game backend. Never present synthetic choices as genuine gameplay.
- The player must authenticate with the registered AeroVista client and an app-owned same-origin gateway. Server resolves ownership; browser never supplies trust.
- Apply capabilities and chapter entitlements inside the atomic game transaction, not merely during card rendering.
- Save each accepted turn with a monotonic revision. Concurrent duplicate submissions must commit at most once. Revocation and logout must deny new actions.

## First-hour canonical narrative
1. Arrival: narrative card establishes Billy and the Placement Office.
2. Stat Generator: grant exactly one free spin **per eligible Placement Office visit**; earned archived spins may be used optionally. Changes stats/modifiers, never destination.
3. Case Worker: identifies the available next-life/phase placements under the current system.
4. Rolodex: presents **only the placement options supplied by the Case Worker**; UI cannot generate placements.
5. First Glitch: observable consequence of Billy's soul-linked anomaly without inventing its unresolved origin.
6. Hallway: reveal and record first consequential choice; save and resume identically.

## Cards scene projection
`js/game-frame/scene-cards.js` defines display-only card types:
`narrative`, `dialogue`, `decision`, `encounter`, `stat-generator`, `case-worker`, `rolodex`, `consequence`, `glitch`.

The server must release only player-visible, already-authorized choices. A card's `enabled` presentation is not authorization. No hidden flags, RNG seeds, locked story text, payment grants or future outcomes in the response.

## Release order and acceptance
1. Finish existing draft PR #1 game-authority seam and verify identity bridge/account callback against active AVCC registration.
2. Restore recovered Director and content in an isolated backend; implement owner-scoped load, transactional execute and durable persist.
3. Add complete first-hour content + stat/placement invariants and schema contract tests.
4. Connect cards to the gateway, with loading, retry, 401/403/409 states, keyboard/mobile accessibility and nonblocking audio.
5. Browser proof: register/login -> Billy run -> stat spin -> Case Worker -> Rolodex -> Glitch -> Hallway -> save -> logout denial -> login -> resume same revision -> free/premium deny/allow after verified grant.
6. Only then publish the integrated app. Keep existing public Pages demo unchanged until promotion, and do not merge incomplete security work.

## Outstanding external dependencies
- Actual `aa_cards` client registration and exact redirect allowlist; accepted `ascension-auth.aerovista.us` bridge.
- Production contract for HMAC/signed App Adapter service calls and durable per-player run backend.
- AVCC chapter/entitlement mapping and payment verification.
- Restored game content/media and exact-run runtime smoke/browser evidence.
