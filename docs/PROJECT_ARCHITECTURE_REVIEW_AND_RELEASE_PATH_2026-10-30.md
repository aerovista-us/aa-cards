# Ascension Awaits — Whole-Project Architecture Review and Delivery Path
Date: 2026-10-30
Status: Review of inspected sources; no release authorization

## Scope and evidence
Reviewed the recovered NXCore game `/srv/ACOS/workspaces/ascension/app/js/app.js` (previously hashed SHA-256 prefix `ab2a37710f9cfd0a`), the M18 `aerovista-us/aa-cards` branch at `f7b12cb`, the repository's root README, preview notice, gateway docs and existing M18 contract, and the supplied module family (BON narrative, glitch, story, visual storytelling, AI, quests, maps, audio and manager files). These materials are from *different iterations*. Shared themes do not establish identical gameplay implementation or deployment authority.

## Product concept — preserve
Ascension Awaits is a satirical narrative RPG with an afterlife administration setting, player agency, consequences and an intentionally bureaucratic power structure. Billy's Earth-to-Afterlife transition, Case Worker placement options via the Afterlife Rolodex, the Stat Generator as a separate stat/trait/modifier system, Mitch's corrupted placement hierarchy, and the BON/glitch narrative idiom are distinct design concerns. A game turn should cause deterministic world changes; generative dialogue and audiovisual presentation can enrich committed facts but must not adjudicate them.

The older uploaded JavaScript modules show the breadth of intended experiences: BON emergent story and story beats, reality glitch mechanics, quests/minigames, character/dialogue, game maps, UI boards, audio and AI storytelling. They are product/design references, not demonstrated parity authorities over the later recovered executable.

## Actual architecture — four lanes, different responsibilities
1. **Recovered v4 browser game on NXCore** — behavior reference for task board, turn ordering, flags, world generation, quests, cutscenes and RNG; not automatically production-safe.
2. **Modernizing game gateway in aa-cards** — PostgreSQL owner-bound run store, reference identity handlers, limited choice/cutscene transactions, recovered source-derived modules. Several major paths deliberately fail closed because the complete transaction is not implemented.
3. **Static aa-cards GitHub Pages preview** — mobile-first character/card UI using synthetic choices. Repo README and PREVIEW_NOTICE explicitly say it is *not* a playable game or save authority; passing static Pages checks cannot authorize gameplay.
4. **AeroVista Account / AVCC identity and NXCore runtime** — planned authorization/session, entitlements and private persistence. Gateway README identifies registration, redirect, session handoff, CSRF and browser proofs as open.

## Core efficiency finding
M18 amassed separately tested source-derived helpers, but there is no proved vertical gameplay slice from real authenticated action to atomic persisted state to reload. Continuing to add helpers as if that were delivery creates diminishing returns and increases integration surface. GitHub Actions passing for the static/cards branch and Node unit green do not establish game parity. The PR body previously said 'documentation only', though M18 now contains code; update its description.

## Recommended architecture boundaries
- **Deterministic domain core**: typed commands + canonical state in/out + seed/cursor. All movement, tasks, AP, cutscenes, world events and outcome effects here. One transaction per gameplay command, including turn boundary.
- **Gateway/identity**: same-origin session, account/chapter permission, CSRF, owner + revision lock and CAS, serialization, no client-owned RNG and no AI-sourced authoritative effects.
- **Presentation**: responsive phone-first board, overlays/character Soul Case File, map, diary, turn recap and accessibility. The static preview should remain visibly preview-only until it calls an authenticated endpoint.
- **AI and content**: optional post-commit narration, NPC prose and audiovisual delivery with graceful offline/failure fallback; authored game events and choices always win.
- **Observability and shipping**: migrations and reproducible seed fixtures, differential traces, rollback and release flags; no secrets or player saves on GitHub Pages.

## Critical path — switch to vertical slices
**P0 — executable parity harness.** Capture at least one recovered-browser fixture for Earth death -> intake -> first mandatory desk -> choice -> turn. Compare *every* saved-state field and RNG cursor, excluding only documented nonstate UI/transient fields. Store fixtures in tests with provenance.

**P1 — single canonical command executor.** Replace the fragmented 'supported in helpers only' path with an adapter that calls original Director, app conditions, task-board candidate/update/marker handlers, required-cell locks and full cutscene/end-turn transitions. Fail closed on paths lacking canonical behavior. Work on M18 branch, not production.

**P2 — real disposable PostgreSQL.** Execute authenticated/unauthorized/wrong-owner/stale-revision tests, concurrency, rollback and service restart through the actual single transaction. A mocked database is insufficient.

**P3 — app-owned browser acceptance.** Wire AVCC identity, session/capability/CSRF, login/logout/revoke, chapter permission, create, action, save, reload and resume. Test phone-first UI against real state. Keep preview host and private API separately secured.

**P4 — release.** Require exact-head CI + parity + PostgreSQL + browser evidence, security review, deployment target and rollback. Only then merge PR #24 and publish playable app. Static preview can continue to exist independently but must never advertise M18 as live gameplay.

## Stop/start decisions
- Stop expanding unrelated feature systems or AI interactions until the canonical first-hour vertical slice works.
- Stop treating each new bounded unit test total as a shipment gate.
- Start tracing every missing recovered function dependency through a single command with persisted state and deterministic replay.
- Start attaching parity evidence and real service tests to PR #24 rather than producing more standalone status-only documents.
- Defer broad content migrations, optional minigames, sound polish and generative features until gameplay persistence is trustworthy.

## Release finding
The M18 bounded pipeline still does not reproduce complete source end-turn UI continuation, cutscene scheduling, required desk locks or exact saved-state comparison. No real AVCC-authenticated browser journey or complete PostgreSQL restart/concurrency test is presented. **HOLD: do not merge or publish playable gameplay.**
