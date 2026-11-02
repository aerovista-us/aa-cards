# Ascension V3 — Phaser read-only state-projection bridge
Date: 2026-11-02
Status: **implemented in source + synthetic browser acceptance only**. No live account or save integration.

## Basis / what's already true
- Recovered v4 state retains \`currentWorld\`, \`pos\`, \`worldMap\`, \`turn\` and persisted map tiles. \`gateway/recovered-map-builder.mjs\` builds worlds, but not authenticated gameplay.
- Owner-scoped PostgreSQL logic exists in \`gateway/owner-run-store.mjs\`, but cannot imply a deployed server. The existing public GitHub Pages site is static.
- \`gateway/game-authority.mjs\` is a reference integration seam. Source \`docs/LIVE_GAME_API_CONTRACT.md\` calls the live \`GET /v1/game/session\` contract **draft** and unavailable.
- \`phaser-lab/\` remains a movement/visual experiment, not a save/resume game.

## Implemented in V3
1. \`gateway/visible-map-projection.mjs\`: verify server-supplied \`identity.subject\` against the stored \`run.owner_subject\`, require valid revision/state/map and cap dimensions. Only emit \`ascension.map-view.v1\`.
2. Discoverability is **server-owned**: undiscovered tiles are represented solely by \`{ visible:false }\`. No hidden walkability, tag pools, loot/spawns, NPC memory, random seeds, premium gates, or unpublished narrative is emitted.
3. Only explicitly server-authorized visible marker labels can appear. Marker kinds are constrained and markers on undiscovered/blocked tiles are omitted.
4. \`phaser-lab/authority/view-contract.mjs\`: validate and whitelist the transport envelope; validate player/marker coordinates, reject malformed envelopes and stale/non-monotonic revisions.
5. \`phaser-lab/authority/\`: independent Phaser page that draws the recorded synthetic sequence. Controls **replay existing frames**, never send a game choice or movement request.
6. Unit/security tests and Chromium screenshot/smoke in the Phaser workflow; the original \`/demo/\` stays unchanged.

## Output schema (public-safe, not a full game session)
\`\`\`json
{
  "schema":"ascension.map-view.v1",
  "sessionId":"sample-id",
  "revision":0,
  "world":"AFTERLIFE",
  "turn":0,
  "map":{"width":9,"height":7,"cells":[{"visible":false},{"visible":true,"walkable":true}]},
  "player":{"x":4,"y":4},
  "markers":[{"id":"caseworker","kind":"npc","label":"Case Worker","x":4,"y":3}]
}
\`\`\`
The excerpt above is illustrative, not a complete 9×7 payload.

## Before wiring real gameplay
1. Confirm actual AVCC client registration and trusted same-origin authenticated gateway. Do not send tokens or tailnet IPs to GitHub Pages.
2. Confirm run-store query supplies **server-owned** \`owner_subject\` to the projector and cannot accept an identity from client claims. The current \`loadOwnedRun\` return shape omits the owner column; adapt it in the server branch only after isolated database tests.
3. Implement \`GET /v1/game/session\` with session validation, owner-scoped run loading, canonical current-map state and authorization-bound presentation. Response must be \`Cache-Control: no-store\`.
4. Add authorized \`POST /v1/game/move\` (or canonical choice equivalent) with revision comparison, re-validation of reachability/AP/turn cost inside the existing server transaction; never trust the UI pathfinder as authority.
5. Complete original choice lifecycle and full differential state tests (including NPC memory, map, RNG, queued cutscenes, and turn advancement).
6. Validate 401 / 403 / 409 / logout / revocation / cross-user run denial, simultaneous clicks, browser refresh and durable save/restart.
7. Publish gameplay buttons only after authenticated desktop/mobile browser acceptance.

## Prohibited shortcuts
- Do not turn the recorded demo into fake "saved" play.
- Do not persist sample local steps as real turns.
- Do not export whole \`worldMap.tiles\`, \`storyMemory\`, \`seedString\`, \`rngDraws\`, future story events or raw run DB rows in the static site.
- Do not describe this milestone as completed AVCC integration or source-faithful game parity.
