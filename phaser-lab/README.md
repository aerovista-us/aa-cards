# Ascension Awaits — Phaser 4 Visual Lab

Independent **visual-only experiment**, not an authenticated or save-capable game.

## Purpose
Render the source-derived AFTERLIFE office (9×7) using Phaser 4.2.1, with animated Billy, keyboard and pointer/touch movement, interactions, accessible story-card overlays, and a mobile D-pad. The map is derived from the recovered v4 office world profile and is **not** the canonical runtime state. Local interactions are scripted samples; no player runs, choices, stats or account data are read or written.

## Files
- index.html — responsive playground UI and CDN loader.
- office-model.mjs — source-geometry projection + bounded BFS movement, no game authority.
- game.mjs — Phaser rendering, input, animation and independent sample interaction UI.
- office-model.test.mjs — topology/path assertions.

## Local preview
Run a static server from the repository root, e.g. python3 -m http.server 8000, then open /phaser-lab/. Requires network access to Phaser 4.2.1 CDN; no local build step. Tests: node --test phaser-lab/office-model.test.mjs.

## Safe limits
Do not interpret the free sample stat spin, encounter text, or path choices as recovered canonical outcomes. This folder is unlinked from the public playable concept and remains sandboxed until explicit promotion.

## Next integration (not in scope)
Server-owned sanitized map projection; game gateway authorizes every turn-relevant step/interaction; revision+idempotency semantics; durable save/resume; authenticated browser acceptance. No direct client access to saved-state internals, RNG seeds, unpublished content, or tailnet URLs.

Phaser: https://phaser.io / MIT. This lab loads the pinned 4.2.1 release from the official published CDN distribution.
