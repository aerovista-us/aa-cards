# PR #24 disposition — November 11, 2026

**Decision: archive the superseded M18 draft without merging its 110-file stack.** Continue the authored Office/Hallway pipeline. Production gameplay, protected maps, cloud saves and live NPC providers remain disabled; ACOS #126 stays draft/unmerged.

Reference: [#24](https://github.com/aerovista-us/aa-cards/pull/24), branch `feat/canonical-taskboard-turn-m18`, immutable head `a17a93e3b7353af8dbcacd8758cb4a532e2927c2`. The branch is retained. Every changed file is accounted for in [the file disposition manifest](PR24_FILE_DISPOSITION.json), comparing the PR tree with main `4bba545b4cc6f9c6bffbc5c705fc0af48f8c3e49`. Blob identity records source presence, not acceptance.

| Disposition | Files | Treatment |
| --- | ---: | --- |
| Already on main, identical blob | 26 | Includes the bounded recovered ports/vendor source and their tests. The historical transaction-proof document remains historical evidence. |
| Superseded by hardened main | 2 | Keep main's owner-cutscene transaction and tests: owner-filtered SQL, pending/malformed/unknown setup refusal, rollback-failure connection disposal. |
| Superseded by guarded PostgreSQL proof | 1 | `tests/real-pg-choice-proof.mjs` is replaced by `tests/recovered-transactions.pg-ci.mjs`, including wrong-owner denial for the actual created run. |
| Archived reference | 81 | Preserve unique helpers, scripts, fixtures and historical reports at the reference SHA. They are not silently adopted, deleted or certified. |

## Review findings

- The three unique owner transaction wrappers select by run ID before comparing ownership in JavaScript and can lose the original error or reuse a bad connection when rollback fails. Opening-board and task-completion wrappers also accept extra command fields. They must not replace the hardened owner stores.
- The provisional end-turn pipeline explicitly omits full recap, continuation, dynamic cutscene and ending evaluation. Its injected UI/context callbacks do not establish a complete server-owned command executor.
- Cell requirements/reconciliation, task completion, candidate selection, placement, roaming, marker sync and opening-board helpers describe a different recovered state model. The current authored Office/Hallway already implements its approved prerequisites and consequences. Importing this alternate stack would require an explicit mechanic, authoritative command composition and new acceptance evidence.
- The strict-diff utility and provenance labels do not themselves prove independent execution. One journey fixture compares a serialized object with its own copy, while fabricated matching capture metadata can satisfy the parity verifier. Such tests are useful utility checks, not independent recovered-browser acceptance. The capture script observes the initial menu only.
- The save-map bridge intentionally projects the original saved-map fields and excludes presentation overlays. That projection does not prove equality of the complete modern state, which also stores a nested world map. Full-state/RNG parity remains unproven.
- Historical scripts and test totals stay attached to their source revision. Do not rerun their database workflows against production or convert old reports into current release evidence.

## Useful recovery gap carried forward

The old draft attempted a disposable PostgreSQL restart. Current main's existing tests prove a new Node process resumes committed state, but that alone does not restart the database. `tests/world-restart.pg-ci.mjs` carries forward this test objective against the current, guarded candidate, without importing the old executor or scripts.

CI records SHA-256 checkpoints of **all persisted row fields**, the complete private owned run and its public view after the authored and bounded recovered transaction suites. It restarts only its disposable PostgreSQL service and requires a newer `pg_postmaster_start_time()`. A fresh Node process then checks the complete checkpoints, same-run cross-owner denial, duplicate-create refusal, unchanged rows after denials, a successful resumed action, stale retry denial and preserved assessment RNG. Missing fixtures, no actual restart or any mismatch fails the job.

The uploaded `database-restart.json` contains candidate revision, booleans, synthetic row count and a checkpoint digest. It contains no row contents, owner IDs, seed, cookies, tokens, credentials or callback values. A PASS file is written only after every check succeeds; a missing PASS artifact cannot establish acceptance. Raw baseline state is never written to disk. The temporary baseline contains only digests, count and the disposable server-start timestamp and is not uploaded.

This is a disposable-fixture persistence proof, **not** production backup/restore, crash-consistency, full recovered gameplay or live Account certification.

## Work that remains open after archiving

| Gate | Concrete next evidence | Promotion effect |
| --- | --- | --- |
| Live Account lifecycle | Authorized independent Account A/B browser sessions: attribution, callback/state/single-use handling, cookie properties, CSRF/origin denials, logout/stale binding, external revocation, natural expiry and cross-account denial; sanitized statuses/booleans only. | Blocks runtime game/map/save activation. |
| Production storage and composition | Reviewed registered per-action capabilities; isolated authenticated handler/store/browser journey; migration, backup/restore and rollback rehearsal against approved non-production storage. | Blocks mounting handlers, granting access or enabling production writes. |
| Next authored realm | Consume the committed Hallway route in a designed quest, with the same owner/revision/transaction boundary and isolated browser/save-resume proof. | Source development may proceed; it grants no production access. |
| Optional recovered compatibility | If explicitly selected: independently execute original and gateway commands from the same seed/checkpoints, compare every saved state/map/RNG field, then prove full command sequencing and database/browser recovery. | Required only for a recovered-parity claim; no such claim is made here. |

Closing an obsolete draft resolves the PR queue, not these acceptance gates. See [release acceptance](RELEASE_ACCEPTANCE.md).
