# Ascension access model — approved product direction, staged engineering

## Player experience
Every player must sign in with an existing AeroVista account or create a free AeroVista account before accessing gameplay. There is **no anonymous guest gameplay**. The free experience is a persistent opening adventure: character progress and story state should carry forward after purchase. All gameplay, including free, requires an authorized account session.

An unauthenticated visitor may see a landing page, character/game artwork, and marketing copy, but must not receive playable story choices, save mutations, protected story assets or hidden outcomes. **The current publicly hosted synthetic Cards preview is not compliant gameplay** and must remain clearly identified as a design preview until replaced by a real login gate.

## Two initial entitlements
- Free opening chapter: authenticated, verified current player session; no purchase required.
- Premium expansion content: authenticated current player session **plus** server-verified resource-scoped access grant, with actual grant identifiers finalized by Identity Gateway/AVCC and the payment system.

No mandatory subscription, microtransaction or pricing decision is implied. Do not sell character XP or bypass canonical progression with purchases. Existing progress stays with the same player when upgrading.

## Authoritative enforcement
App Adapter's Identity Gateway authenticates and resolves a player; Ascension's game service owns the character/run, storylet locks, and chapter classification. Auth bridge offers an informational `GET /api/access?chapter=` endpoint for planned UI display, but that endpoint **cannot authorize a game move**.

Every mutating game request must check: (1) live identity session, (2) owner of run, (3) permitted storylet and choice, (4) current chapter access, and (5) revision/one-action-per-turn. A live role or frontend flag is never sufficient. Premium checks must come from an approved grant/entitlement authority; purchase initiation alone does not grant access.

## Rollout gates
1. Deploy and accept the dedicated `ascension-auth.aerovista.us` identity bridge (ACOS draft PR #126).
2. Register real Ascension capabilities and product entitlement mapping in AVCC, not just the proposed labels in code.
3. Wire signed-in game state with immutable server-side run ownership and canonical v4 choice execution.
4. Replace public playable demo cards with an account-required gateway; preserve a clearly labeled *non-playable design preview* as needed.
5. Prove free account creation/login, continued SSO, free opening play/save/reload, denied unauthenticated access, denied unowned run access, paid boundary denial, paid grant access after actual verified purchase, account logout and entitlement revocation.

## Current status
The new access policy is staged only in ACOS PR #126. No active login service, grant authority, real gameplay save integration or paid checkout is enabled. The independent GitHub Pages preview still exists and is not the production player experience.
