# Isolated database recovery acceptance

`tests/world-recovery.pg-ci.mjs` closes the gap between restarting one database and restoring a backup into a fresh database volume. It runs only with explicit GitHub Actions/disposable-loopback configuration and the known CI service container ID. It has no production connection string, credential loader or NXCore path.

The proof uses PostgreSQL's actual custom-format dump/restore tools and the existing CI service's exact image. It creates an independent cluster with a fresh anonymous volume and a loopback-only random port, requires a different system identifier and an initially absent game table, then restores all committed authored and bounded recovered fixtures. Every persisted row field, the private owned run/RNG and public projection must match their pre-backup digests. Reapplying the idempotent candidate migration may not change the restored rows.

The restored application role receives CONNECT, schema USAGE and table SELECT/INSERT/UPDATE only. It must be denied DELETE, TRUNCATE, ALTER/CREATE TABLE, temporary tables and role creation. Actual owner-store calls must deny the wrong owner using the real restored run ID, duplicate creation and a denied capability fixture while preserving all rows. An accepted command must commit once, preserve assessment RNG and restore identically in a new Node process. A corrupt archive must fail without creating an accepted run table. The source fixture database must remain unchanged.

The uniquely named restore container, its anonymous data volume and temporary dump files are removed before `database-recovery.json` can report PASS. Only the sanitized report is uploaded; it contains source revision, booleans, synthetic row count and a checkpoint digest. Dumps and raw player state are never uploaded. All identities/data/passwords in this proof are disposable fixtures.

## Limits that remain gates

- This proves isolated candidate backup/restore and a restricted-role proposal. It does not approve a production database, role, migration, encryption, retention, recovery-point/recovery-time objective or operator rollback procedure.
- The application enforces ownership in bound SQL and its current authorization callback. Table privileges are not PostgreSQL row-level security; a compromised application role is not covered by this owner-denial proof.
- Authorization is synthetic and no real Account/grant/browser journey runs here. It does not prove live cross-account denial or natural session expiry.
- Full recovered-browser compatibility remains unclaimed. The recovered fixture slice is bounded; the authored Office/Hallway is the current candidate.
- ACOS #126 remains draft/unmerged. Production gameplay, maps and cloud saves remain disabled until their independent acceptance and promotion decision.
