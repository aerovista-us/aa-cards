# M18 independent recovered-browser baseline — 2026-11-01

## Executed evidence
- NXCore source: `/srv/ACOS/workspaces/ascension/app/js/app.js`, SHA-256 `ab2a37710f9cfd0a20ae830867adf6133f1126593d54c56c78a79cd5f2d66a02`.
- Read-only isolated `python3 -m http.server` on 127.0.0.1:18763; Playwright Chromium at **390 × 844**.
- Script: `scripts/capture-recovered-browser.mjs` (no player save, no production service/database).
- Captured **actual original browser** state + separate map at `initial-main-menu`, before any gameplay commands.
- Output on NXCore: `/tmp/aa-m18-recovered-baseline-20261101.json` (local evidence, not committed).
- Capture payload SHA-256 from script: `805b9be3552c961b877ecc0c495246957e6d8aae30eb382790811f00731ef658`; 0 page errors.
- Actual original world `EARTH_PROLOGUE`, turn `0`, map w=7/h=5 with 35 cells.
- Actual original save snapshot has **no `rngDraws` field**. Save map is independent `{w,h,grid,worldProfile}`; initial modern gateway model uses its own RNG cursor and `state.worldMap`. These are representation differences, not yet an equality finding.

## Guardrails and next checkpoint
This proves only source-browser startup and a first independently captured baseline. The source chooses a runtime seed in this initial smoke and it must be pinned/injected consistently before comparing with modern. The original's rng cursor is not serialized in `state.snapshot()`, so equivalence requires an independently justified RNG replay/cursor reconstruction; do not simply drop the modern rngDraws field. The initial main-menu checkpoint is **not** an actual first-hour sequence. Next: capture deterministic Earth death → Afterlife placement office board and required interactions from the original browser, then independently execute exact actions on M18 and compare full state plus separate map at each checkpoint.

Verification after adding capture script: `node --test tests/*.test.mjs` = **182 pass / 0 fail**. **Release HOLD**, no full parity or AVCC authentication acceptance claimed.
