# M18 opening-board real PostgreSQL acceptance — 2026-11-01

**Staging only. Production untouched.** Exact tested branch head: `687d5940984a89b6633477d8f7c3307d8d84fb35`.

## Execution environment
- Host: authorized NXCore, isolated checkout `/tmp/aa-m18-repo-rMw9w7`.
- Command: `node --test tests/*.test.mjs` -> **182/182 pass, zero failures**.
- Command: `bash scripts/pg-task-transaction-accept.sh` -> **exit code 0**.
- Harness: disposable Docker `postgres:16-alpine`, localhost ephemeral port, disposable database and credentials. Container removed by shell cleanup.

## Passed real-DB observations
1. Existing bounded task-completion transaction: concurrent expected-revision submissions, one winner, wrong-owner refusal, rollback, persisted task/marker/AP/RNG.
2. Existing bounded cutscene sequence: three owner-scoped PostgreSQL acknowledgments, wrong scene and wrong owner rollback, persisted ordering, unchanged RNG.
3. **New** bounded owner-locked opening board: competing same-revision initialization yields exactly one success and one HTTP-equivalent 409; incorrect owner 404; duplicate setup refusal; committed task-board markers, pending cutscene gate and RNG checkpoint.
4. Restarted disposable PostgreSQL and connected with a new Node process; checked saved opening-board markers and RNG draw count, as well as existing task/cutscene fixtures.

## Evidence caveats
The opening-board context passed to this test is a **fixture callback**, not source-extracted live story candidates and reachable-cell authority. The integration test does **not** demonstrate independent recovered-browser equality, authentic first-hour choices/turn end, full journey PostgreSQL persistence, or AVCC login/revoke/resume. Current release gate remains **HOLD**. No production deployment or merge performed.
