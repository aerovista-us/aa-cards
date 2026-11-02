# M18 exact-head verification — November 1, 2026 (America/Los_Angeles)

Branch: `feat/canonical-taskboard-turn-m18`. Verified commit: `0efcdc514e87556e3bb05bf9b304986e9fc422b5`.

## Executed on NXCore
- `node --test tests/*.test.mjs` — **185/185 pass**, no failures, including three capture/parity provenance regressions.
- `bash scripts/pg-task-transaction-accept.sh` — exit 0, disposable PostgreSQL 16. Bounded task-completion CAS, opening-board CAS, owner isolation, cutscene acknowledgements, rollback and new-process reload after container restart all passed.
- Isolated original recovered browser: localhost static server on port 18764, Playwright Chromium, mobile viewport 390x844, actual original app source SHA-256 `ab2a37710f9cfd0a20ae830867adf6133f1126593d54c56c78a79cd5f2d66a02`.
- `scripts/capture-recovered-browser.mjs` executed successfully; captured original `EARTH_PROLOGUE` turn 0, 35 map cells, 0 page errors and independent verifier-compatible provenance.
- Evidence file: NXCore `/tmp/aa-m18-current-baseline-20261101.json`. Capture payload SHA-256 `14b9356593d7d8b292fa8d1b62482bcc8df3aee4e33a870576696e3467f9b053`. Scenario `earth-to-office-first-hour`, checkpoint `initial-main-menu`, seed `1793595624760`. No client identifiers or production saves.

## Not established by these checks
The original browser uses a runtime seed; a matching independently executed modern gateway capture at that seed and checkpoint **does not exist yet**. Neither complete first-hour parity, canonical end-turn orchestration, nor real AVCC authenticated browser save/reload/revoke/resume is proven. This is an **original-side baseline**, not two-sided equivalence.

Release gate: **HOLD**. No merge or production promotion should be inferred from this report.
