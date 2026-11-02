# M18 bounded rules — NXCore Node test evidence (2026-10-30)

Source authority: recovered `/srv/ACOS/workspaces/ascension/app/js/app.js`, SHA-256 prefix `ab2a37710f9cfd0a`.

M18 source-derived modules:
- `gateway/recovered-turn-gates.mjs`: original action/end-turn presentation and AP gates; corresponding test module.
- `gateway/recovered-task-rules.mjs`: marker tone/kind, task mobility, and planned-desk readiness with canonical storylet resolver and caller-owned canonical condition evaluator; corresponding test module.

Executed on connected NXCore in a disposable `/tmp/ascension-m18-XXXXXX` directory, populated from the M18 GitHub branch, without production deployment:
`node --test tests/*.test.mjs`

Result: **11 tests; 11 passed; 0 failed; 0 skipped; Node TAP duration 121.405466 ms**.

Limitations: isolated pure-helper unit tests, not original-browser differential verification; not the complete original `ensureWorldTaskBoard`, actor roaming or end-turn port; no PostgreSQL integration, authenticated sessions, save/resume, production change or branch merge. Further ports must preserve transitive source dependencies and exact RNG draw ordering. Maintain release HOLD.
