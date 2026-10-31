# M18 candidate selection test proof — 2026-10-30

Original source: NXCore `/srv/ACOS/workspaces/ascension/app/js/app.js` SHA-256 prefix `ab2a37710f9cfd0a`; `taskBoardCandidates` lines 5389–5440.

Changes:
- `gateway/recovered-task-candidates.mjs`: source-derived planned, ambient, ready echo, location priority and scored candidate ordering, eligibility filters, cooldown, spawn guard, storylet ranking and templating via authoritative callbacks.
- `tests/recovered-task-candidates.test.mjs`: five new candidate ordering and fail-closed coverage cases.

Combined execution on NXCore of eight bounded M18 helper/test pairs fetched from feature branch, in disposable `/tmp/aa-m18-candidates-XXXXXX`:
`node --test tests/*.test.mjs`
Result **40 passed, zero failed, zero skipped** (460.782105 ms).

**Limitations:** callbacks have not been wired into the authoritative Director/state transaction. This is not a recovered-browser-vs-M18 differential or complete end-turn proof. Live PostgreSQL and AVCC authenticated save/resume not demonstrated. Release remains HOLD.
