# Ascension Awaits — Billy's First Chapter V1 execution plan

**Plan created:** November 14, 2026 (Pacific). **Owner/accountable:** AeroVista founder. **Status:** proposed work plan, **not a release approval**. Canon and implementation decisions require their named reviews. Source of truth for work: [delivery epic #62](https://github.com/aerovista-us/aa-cards/issues/62) and its linked issues.

## 1. Release definition and non-goals

**V1 release goal:** a complete, coherent first playable chapter for **Billy**, aiming at a roughly first-hour experience, from arrival through one of two meaningful destination quests to an explicit Chapter 1 checkpoint. Core gameplay must be genuinely saved per verified AeroVista Account subject, work on portrait phones and desktop, and fail closed on missing/revoked grants.

**Player path:** Arrival → **one free Stat Generator spin for a legitimate Office visit** (earned/banked spins supported) → Case Worker reviews the case and authorizes destination **options** → player selects from Rolodex → first Glitch (report/conceal) → Hallway (assistance/scrutiny) → Memory Annex/**Archive of Echoes** OR Present Hall/**Veilway** → persistent choice and visible chapter checkpoint. The Stat Generator changes stats, quirks and modifiers; **never** placement. The Mitch is head of the corrupted placement bureaucracy, not an omnipotent cosmological controller.

**Do not claim or require for V1:** recovered-v4 engine parity, playable Nettie, the Rift/First World campaign, Black Market, every legacy afterlife, free-form generative NPCs, commerce or advanced crafting. Preserve their canon and source for later chapters. Optional audio must never be necessary to complete gameplay.

**Current verified baseline:** combined draft [PR #55](https://github.com/aerovista-us/aa-cards/pull/55), SHA `75877e1`, synthetic private Tailnet preview at `https://nxcore.tail79107c.ts.net:9452/game/`; Node 177/177, disposable PostgreSQL 12/12 and exact-head GitHub Node/Redis/PG-Chromium CI green as of the November 14 audit. Production world/map/cloud-save routes remain disabled. Preview data is **one shared synthetic persona**, not real per-user save or live Account test. [ACOS #126](https://github.com/aerovista-us/ACOS/pull/126) is a separate OPEN/DRAFT dependency.

## 2. Workstreams and single accountable owner

Every work item is **founder-accountable**. This is an ownership policy, **not** a claim that staff or agents were assigned. Add a named implementer and *independent* reviewer to each work package before acceptance; independence matters especially for identity, storage and release.

| Priority | Track / accountable role | Work issue | Done condition |
| --- | --- | --- | --- |
| P0 | Platform/Identity | [#45](https://github.com/aerovista-us/aa-cards/issues/45), ACOS [#126](https://github.com/aerovista-us/ACOS/pull/126) / [#167](https://github.com/aerovista-us/ACOS/issues/167) | Real current Account A/B identity, distinct approved capabilities, origin/cookie/refusal contract, isolated authenticated staging |
| P0 | Security/independent QA | [#46](https://github.com/aerovista-us/aa-cards/issues/46) | A0–A9 and M1–M4 accepted against identical candidate/effective grants; two distinct accounts, sanitized artifacts |
| P0 | API security/Operations | [#56](https://github.com/aerovista-us/aa-cards/issues/56) | Limits, safe metrics, alerts and denial/abuse tests; no secret leakage |
| P0 | DBA/Recovery | [#57](https://github.com/aerovista-us/aa-cards/issues/57) | Approved schema-4 reader/rollback design, restricted staging role and fresh-volume recovery proof |
| P1 | Game design/Rules | [#47](https://github.com/aerovista-us/aa-cards/issues/47), [#58](https://github.com/aerovista-us/aa-cards/issues/58) | One free use per **genuine visit**, idempotent earned credits, real server-side trait modifiers; Case Worker controls placement |
| P1 | Gameplay/World | [#48](https://github.com/aerovista-us/aa-cards/issues/48), [#59](https://github.com/aerovista-us/aa-cards/issues/59) | Existing Archive + new playable Veilway; two saved route consequences and return/resume |
| P1 | Mobile/Character UX | [#60](https://github.com/aerovista-us/aa-cards/issues/60) | Portrait slide-over profile, stats/traits/inventory/backstory, keyboard and screen-reader acceptance |
| P1 | Narrative/Audio/Playtest | [#61](https://github.com/aerovista-us/aa-cards/issues/61) | Frozen first-chapter continuity, visible finish/checkpoint, opt-in audio, independent playtesting |
| P0 final | Release/Compliance | [#49](https://github.com/aerovista-us/aa-cards/issues/49) | Exact SHA/image/evidence, independent sign-off, explicit separately approved production cutover |

## 3. Gated execution sequence

### Gate G0 — freeze scope and nominate operators (first unblocked planning pass)

- [ ] Confirm V1 includes **Billy**, two destinations, both Glitch outcomes, banked spins, character overlay, meaningful ending/checkpoint. New protagonist and larger cosmos are later scope.
- [ ] Freeze canonical rules: what starts a new Office visit (no hallway-round-trip farming), where the first earned spin is awarded, whether later stat spins stack or replace active modifiers, and the *immutable* previous Glitch heat. Reconcile canonical **free spin before meeting Case Worker** versus current coded prerequisite requiring Case Worker introduction.
- [ ] Confirm Chapter 1 Veilway and Archive narrative choices, The Mitch/Overseer references, and what an unresolved choice does on subsequent visits.
- [ ] Nominate authorized Identity operator, DBA, independent QA/security reviewer, narrative reviewer and release approver; founder accountable on every item.
- [ ] Review integrated PR #55 with **source-only** merge independent of production activation. Do not merge overlapping #50–54 blindly; fix integration conflicts on an explicitly reviewed branch and rerun exact-head checks.

**Exit G0:** frozen `Canon Rules — Chapter 1` with precise spin-event and award IDs, scope acceptance, named reviewers, and reviewed source integration strategy. **No production privileges needed to start writing/test development.**

### Gate G1 — parallel engineering, each change separately verifiable

**Platform lane (can proceed without exposing public routes):**
- [ ] #56 design/implement per-owner abuse throttles for actions and run creation; 429/retry policy; privacy-safe denial/audit/health metrics; tests prove a throttled action makes no save write.
- [ ] #57 schema-2/3/4 compatibility and **schema-4 forward-rollback safety**; least-privilege PostgreSQL grants; production-equivalent isolated backup/restore with exact saved revision, Glitch state, Archive decision and RNG.
- [ ] #45 stage a real native Account resolver, registered capabilities `load/create/action/travel/map` and verified origin/cookie binding **only in an approved isolated environment**. The preview's `identity.can` fixture is not authority.
- [ ] Pin dependencies, exact OCI image and static asset provenance, disable-on-failure process, and health alert thresholds.

**Gameplay lane (no real Account access required for local tests):**
- [ ] #58 atomic free/earned/banked spin events and real deterministic stats/traits; consume only the current available allowance; preserve older saves and earlier Glitch/NPC consequences.
- [ ] #59 playable Veilway destination, with its own NPC, quest, meaningful persisted choice and branch effects, plus safe return and replay denial.
- [ ] #60 portrait-first, screen-reader-friendly character sheet that slides over the game board (not a duplicate map/HUD), displaying only allowed server-committed facts; graceful signed-out clearing.
- [ ] #61 complete first-hour story structure, end checkpoint, clarity/wayfinding, optional audio/narration with mute and no-audio support.

**Exit G1:** all new changes have reviewed source PRs, deterministic regression tests, PG tests, and Chromium desktop/390×844 mobile checks, with no unsupported `PASS` claims.

### Gate G2 — real Account lifecycle, then protected staging (strict order)

1. Account operator executes ACOS **A0–A9** using two separately approved real test accounts, with private canonical identity attribution. Include state/cookie/code one-time exchange, CSRF/Origin/CORS negatives, logout plus stale-binding refusal, external revocation, **natural expiry without altering TTL**, and cross-account isolation. Sanitize evidence to aliases/status/booleans. Tests for this gate cannot be replaced by synthetic preview results.
2. After identity review, Platform/DB operator provides actual registered capabilities (never guessed names), an explicitly enabled isolated staging handler, restricted application role and approved migration/rollback artifacts.
3. Run **M1–M4**: owner-only map/read; capability denial/revocation; hidden-state projection; restricted PostgreSQL backup/restore. Include an HTTP/browser-to-DB account A vs B proof, not merely a SQL fixture. If the real Account suite fails or is incomplete, leave protected staging and production promotion BLOCKED.

**Exit G2:** A0–A9 and M1–M4 *all* accepted with exact environment/image, test account aliases, independent reviewer and rollback proof; no missing/unsafe sensitive artifacts.

### Gate G3 — chapter-level integration and independent playtest

Required paths:
- Both Glitch choices (**report/assistance**, **conceal/scrutiny**) × both destinations (**Memory/Archive**, **Present/Veilway**) at a minimum.
- Archive **preserve/release** outcomes including choice lock, return/re-entry and future consequence at the Chapter 1 checkpoint.
- Free first spin, genuine new Office visit, earned/banked award, spend, duplicate/replay, and real stat modifier effect; every path retains Case Worker/Rolodex placement authority.
- Interrupted requests and same-account two-tab concurrency (409 expected), invalid CSRF/Origin, revoked grant, and separate owner B selecting A's run (must not succeed).
- Full account sign-out → re-login → identical saved revision, private/public projection, inventory, Glitch and stat state.
- Schema-2/3 legacy saved runs and new schema-4+ runs, including rollback/restore and same-run persistence.
- Mobile portrait (minimum 360, 390, 430 widths), desktop, touch/keyboard/screen-reader checks, reduced-motion and audio-off route. No hidden RNG, raw Account ID, NPC memory or unearned information in client response.

Use a **fresh player** to evaluate clarity, time-to-first-action, completion without operator intervention, confusing terminology, unfair choices, and softlocks. Fix all P0 and first-chapter P1 blockers. A successful scripted bot is not a blind player acceptance test.

**Exit G3:** independently reviewed Chapter 1 runbook with all branch scenarios PASS; a clean first-session checkpoint and explicit pending next chapter.

### Gate G4 — release approval and rollout

- [ ] Freeze final source SHA + image digest, registered grants, exact URLs/origins and DB schema state; rerun **exact-head** CI and staging browser acceptance.
- [ ] Sign independent Identity/security, DBA, gameplay/narrative, QA and founder release attestations. Missing signature = BLOCKED.
- [ ] Back up, rehearse restore, agree recovery/rollback triggers and an operations watch window. Define how to halt mutations immediately without losing accepted saves.
- [ ] Separately approve production activation via ACOS #126; keep routes disabled until the approval has been made.
- [ ] Activate limited rollout, observe errors/revisions/cross-owner denials, confirm save/resume and reversible deployment, then authorize public announcement.
- [ ] If any gate fails, preserve disabled production routes and record failure; never mark release complete based on a healthy preview or synthetic CI alone.

**Exit G4:** founder-approved, operator-observed first-chapter release certificate. Then close [epic #62](https://github.com/aerovista-us/aa-cards/issues/62).

## 4. Critical path and parallelization

```text
                  [Current PR #55 / Preview: PASS in synthetic environment]
                                            |
                         G0 canon + roles + source review
                                /                         \
                ACCOUNT / SECURITY                 GAMEPLAY / CONTENT
              #45, #46, #56, #57                 #47, #58, #59, #60, #61
                        |                                 |
              Real Account A0–A9                 Both branches + spin economy
                        |                                 |
            Registered grants + DB                      Full 1st chapter
                        |                                 |
             Protected stage M1–M4                      Blind playtest
                                \                        /
                                    G3 combined QA
                                           |
                                   #49 go/no-go
                                           |
                            SEPARATE production approval
```

Work on the game lane should proceed while live Account approval waits. The identity track is the **critical production dependency**; content is the **critical product-completeness dependency**.

## 5. Tracking contract and first work cycle

Each task/PR needs: accountable founder, named implementer/reviewer when known, issue link, start time and next check, immutable source SHA, design assumptions, tests and results, risks, evidence links, **PASS/FAIL/BLOCKED/NOT_RUN**, recovery/rollback notes and next bounded action.

**First work cycle in exact priority order:**
1. Request #55 independent review; disposition component PRs without duplicate merges.
2. Under #47/#58, freeze visit/award/spin-output semantics and Case Worker ordering; add denial/replay contract tests before connecting to saves.
3. Under #56, implement owner-aware rate limiting and privacy-safe telemetry against current handler; synthetic/PG denial invariants.
4. Under #57, create the explicit schema-4/older-reader rollback matrix and isolated recovery proof.
5. Under #59, start the Veilway NPC/quest/checkpoint vertical slice.
6. Under #60, build the portrait character sheet against current safe view; integrate spin modifiers when #58 provides server facts.
7. Coordinate authorized ACOS A0–A9 run with independently approved operator/test accounts. **Do not** request raw passwords, OTP, cookies or tokens in issues/chat.

### Risks to actively monitor

| Risk | Consequence | Control |
| --- | --- | --- |
| Live A/B Account acceptance missing | Cannot ship authenticated saves | Keep promotion blocked; schedule authorized private observer/reviewer |
| Schema-4 unreadable by older reader | Rollback could strand saves | Forward-compatible reader or proven safe roll-forward + backup/restore |
| Hallway round trips farm free spins | Broken economy/infinite rewards | Trusted visit IDs, anti-replay ledger and atomic CAS |
| New spin rewrites previous Glitch heat | Narrative/state corruption | Immutable initial-assessment consequences; separate later modifier ledger |
| Parallel PRs overlap | Lost security checks or game branches | Integration branch reviewed at exact head, full suite after conflicts |
| Shared synthetic preview mistaken for private account | Cross-player state confusion | Clear synthetic banner, isolated storage, never expose as public release |
| Feature creep into Nettie/full Rift | No coherent V1 finish | Billy-first chapter scope freeze; park later canon |
| UI hides controls on phones | Abandoned play sessions | 360–430 viewport + touch/focus/screen-reader sign-off |
