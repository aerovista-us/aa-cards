# Ascension Awaits — Phaser 4 Visual Lab

Independent **visual-only experiment**, not an authenticated or save-capable game.

## Purpose
Render the source-derived AFTERLIFE office (9×7) using Phaser 4.2.1, with animated Billy, keyboard and pointer/touch movement, interactions, accessible story-card overlays, and a mobile D-pad. The map is derived from the recovered v4 office world profile and is **not** the canonical runtime state. Local interactions are scripted samples; no player runs, choices, stats or account data are read or written.

## Visual presentation pass (V2)
- Draws service cabinets, queue rails, brass counters, file piles, and animated overhead queue display with original in-engine shapes; no externally licensed artwork.
- Adds **ambient** moving clerk (not a canonical NPC), small directional walk animation and feet motion for Billy, and a reduced-motion preference control.
- Adds an explicit first-scene objective list tracking **local-only** story sample progress.
- The office geometry and five sample stations are unchanged. No saved progression, NPC memory, RNG, or server authority is changed.
- Real-browser smoke checks interaction, scene boot, motion control, and objectives.

## Files
- index.html — responsive playground UI and CDN loader.
- office-model.mjs — source-geometry projection + bounded BFS movement, no game authority.
- game.mjs — Phaser rendering, input, animation and independent sample interaction UI.
- visuals.mjs — ambient scenery and decorative clerk with no collision/state authority.
- office-model.test.mjs — topology/path assertions.

## Local preview
Run a static server from the repository root, e.g. python3 -m http.server 8000, then open /phaser-lab/. Requires network access to Phaser 4.2.1 CDN; no local build step. Tests: node --test phaser-lab/office-model.test.mjs.

## Safe limits
Do not interpret the free sample stat spin, encounter text, or path choices as recovered canonical outcomes. This folder is unlinked from the public playable concept and remains sandboxed until explicit promotion.

## Read-only authoritative projection proof (V3)
- `/phaser-lab/authority/` is a separate Phaser replay page that renders **recorded, synthetic** map frames. It never contacts the live API, authenticates a user, or writes turns/saves.
- `gateway/visible-map-projection.mjs` is a **server-only** source-shape adapter that requires verified identity and matching run owner. It emits only discovered / walkable booleans, player position, revision, turn, and explicitly authorized visible markers. Never ship saved-state fields (NPC memory, seeds, RNG, spawns, hidden gates).
- `authority/view-contract.mjs` validates the public-safe envelope, strips unknown fields, and rejects stale/out-of-order replay frames. The only user controls are advancing an already-recorded frame and replaying it from the start.
- The synthetic sequence in `authority/sample-snapshots.mjs` intentionally demonstrates motion and fog-of-war without claiming actual gameplay.
- The actual live `/v1/game/session` must be implemented by the authenticated gateway with owner-scoped loading, same-origin authorization, revocation, and read-only projection. The existing `/api/runs` endpoint is not this gateway.

## Next integration (not in scope)
Server-owned sanitized map projection; game gateway authorizes every turn-relevant step/interaction; revision+idempotency semantics; durable save/resume; authenticated browser acceptance. No direct client access to saved-state internals, RNG seeds, unpublished content, or tailnet URLs.

Phaser: https://phaser.io / MIT. This lab loads the pinned 4.2.1 release from the official published CDN distribution.


## Owner-scoped map read preparation (V4)

A **server-only** PostgreSQL + AVCC identity + projection + HTTP route was staged.
It proposes `GET /api/game/map` under the existing `Path=/api` session cookie,
not a new anonymous gameplay endpoint. `authority/live-map-client.mjs`
validates that response and uses same-origin credentials and no-store, but it
is **not activated** by the public Phaser lab or its recorded replay page.
No production identity session, player save, or action capability is yet connected.
See `docs/ASCENSION_OWNER_MAP_GATEWAY_2026-11-02.md`.
