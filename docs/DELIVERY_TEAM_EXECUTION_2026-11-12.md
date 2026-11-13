# Ascension Awaits — delivery team, work queue, and operating contract

Established November 12, 2026. Source baseline: `aa-cards/main` at `1b94dcf7ee7e66fb4067bbfb1f0c5ce2abc0548f`.
This document creates **functional engineering lanes**, not staff assignments. The founder or authorized project lead selects actual reviewers/operators. No one is automatically given access to secrets, identity records or production deployment.

## Current decision
**HOLD production gameplay, maps, saves and optional NPC providers.**
ACOS [#126](https://github.com/aerovista-us/ACOS/pull/126) remains draft; [#167](https://github.com/aerovista-us/ACOS/issues/167) tracks Account acceptance. Current game is the authored Office/Hallway candidate, not certified recovered-v4 parity.

## Workstreams and explicit contracts

| Lane | Work item | Executable without live identities? | Completion owner |
| --- | --- | --- | --- |
| Platform / Identity | [#45](https://github.com/aerovista-us/aa-cards/issues/45) | Staging scaffolding: yes; real grants and authenticated acceptance: no | Authorized platform/identity operator |
| Independent Security / QA | [#46](https://github.com/aerovista-us/aa-cards/issues/46) | CI and test-matrix prep: yes; A/B live run: no | Separate tester/reviewer |
| Narrative / Systems | [#47](https://github.com/aerovista-us/aa-cards/issues/47) | Yes | Game designer + engineering reviewer |
| Gameplay / UX | [#48](https://github.com/aerovista-us/aa-cards/issues/48) | Yes, isolated source/staging | Game engineer + gameplay QA |
| Release / Compliance | [#49](https://github.com/aerovista-us/aa-cards/issues/49) | Evidence prep: yes; production promotion: no | Founder/authorized release authority |

## Parallel delivery order

### Track A — release blocker chain
1. Obtain two approved **disposable** Account test identities and the private expected canonical identities. Do not share credentials or raw identifiers in issues, PRs or chat.
2. Run the [private observer](https://github.com/aerovista-us/ACOS/blob/62193925699f656495cc50ead0b6ab02bd0a8dfb/services/ascension-auth/LIVE_ACCOUNT_OBSERVER.md) and [A0–A9/M1–M4 matrix](https://github.com/aerovista-us/ACOS/blob/62193925699f656495cc50ead0b6ab02bd0a8dfb/services/ascension-auth/LIVE_ACCOUNT_ACCEPTANCE.md). Any unobserved negative test remains NOT_RUN.
3. Approve live per-action capability names/authorities, isolated staging PostgreSQL role/schema and reviewed rollback.
4. Compose `createWorldGameHandler` + native-session resolver + owner store in isolated staging only. Preserve no-client-authority and revision CAS.
5. Execute authorized A/B create → Office/Glitch → Hallway → save → logout → login → resume, with concurrent requests and separate account denial.
6. Pin exact source, image, storage, capabilities and sanitized results; independent review; explicit later promotion decision. Source CI alone never clears the gate.

### Track B — game systems, no live credentials
1. Preserve current Case Worker → Rolodex destination authority; Stat Generator cannot select placement. Tests: `tests/placement-authority-contract.test.mjs`.
2. Resolve the mechanic discrepancy: historical approved design describes a free Stat Generator spin **per office visit** plus earned/banked spins, while current schema-3 Office uses one persisted d20 assessment total. Specify reset, banking, anti-repeat, RNG and save compatibility before coding a new economy.
3. Select one approved next realm via the persisted Hallway route; implement command, NPC, first quest, saved consequence, return and tests as a self-contained vertical slice.
4. Design phone-first character overlay and scope its projection to approved visible state. No duplicated HUD/map or browser-owned gameplay effects.
5. Decide separately whether complete recovered-v4 first-hour parity is a deliverable. Archived #24 cannot certify it.

## Evidence policy
- Each issue stays **OPEN** until its specific acceptance evidence passes. A passing fixture does not close a real Account case.
- Use `PASS`, `FAIL`, `BLOCKED`, `NOT_RUN`; never label synthetic tests as production evidence.
- Never export browser profiles, raw cookies/CSRF/state/code/tokens, full callback URLs, expected identity IDs, or unrestricted saves.
- Every code PR states linked issue, scope, test command/results, compatibility impact, disabled-by-default behavior and rollback.
- At least one independent review is needed for security, identity grants, database rights and release promotion.

## Initial execution evidence
- Baseline source tests: 156/156 passed locally on NXCore (November 12).
- Anonymous read-only public preflight: all six checks passed; tool intentionally exited 3 because live acceptance remains unproven.
- Added `tests/placement-authority-contract.test.mjs` to guard destination authority and assessment replay; two focused tests passed. These do **not** claim banked-spin support.
- GitHub issues #45–#49 created. No team member has been assigned or notified by their creation; no production endpoints, grants, migrations or saves were changed.

## Next independent operator handoff
Start with [ACOS #126](https://github.com/aerovista-us/ACOS/pull/126) A/B private observer, while game engineering resolves [#47](https://github.com/aerovista-us/aa-cards/issues/47) and implements [#48](https://github.com/aerovista-us/aa-cards/issues/48). The staging integrator must not activate routes or inject map service until A/B authorization and storage requirements are reviewed.
