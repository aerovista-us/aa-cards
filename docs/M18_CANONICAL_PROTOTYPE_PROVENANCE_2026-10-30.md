# M18 canonical prototype provenance — 2026-10-30

## Decision
**Use the recovered BON Grid v4 application at `/srv/ACOS/workspaces/ascension/app` as the gameplay behavior reference.** The modernized `aa-cards` branch remains the implementation target for authoritative PostgreSQL and AVCC identity. This decision covers the inspected NXCore locations; it is not proof that an unindexed external archive has no newer prototype.

## Exact source fingerprints (SHA-256 prefixes)
- `app/js/app.js`: 312175 bytes, `ab2a37710f9cfd0a`
- `app/index.html`: 44867 bytes, `4da3b68ae9435705`
- `app/package.json`: 4198 bytes, `99f2e7e5a6ee339a`

All three fingerprints matched the recovered preview, EchoVerse and polish worktrees, recovery container extraction, recovered image and August 4 lean staging copy. Additional worktrees matched `app.js` and `index.html`. Copy timestamps alone are not version evidence.

## Additional prototype inventory
- `/srv/ACOS/Apps/Ascension Awaits - Downloads/Ascension-Awaits-BON-Grid-v4 (2)/...` contains Piper voice model assets in the currently extracted folder, not a separate executable source build.
- The examined roots `/srv/ACOS/workspaces`, `/srv/ACOS/Apps`, `/srv/ACOS/_agent_worktrees` and selected `/srv/ACOS/_recovery` yielded no distinct `app.js` version under Ascension-related paths.
- Uploaded older modular JS is not presumed newer or authoritative.

## M18 extraction targets
The canonical `app/js/app.js` contains `ensureWorldTaskBoard(`, `syncTaskMarkers(` and `endTurn(` references. Extract definitions **and transitive dependencies**, preserve operation order, required interactions, RNG and presentation/commit gates. Record exact source ranges and expanded test fixtures before porting.

## Remaining caveats
Git working history, archive formats not extracted and remote artifact stores were not exhaustively inspected. Do not label canonical choice as globally proven latest release or equate matching source hashes with full end-to-end behavior. Preserve M18 draft and no public promotion until full differential and authenticated acceptance.
