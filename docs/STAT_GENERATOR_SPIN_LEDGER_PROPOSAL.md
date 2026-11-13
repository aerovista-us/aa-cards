# Stat Generator spin ledger — dormant design implementation proposal

Status: **UNMOUNTED / UNACCEPTED GAME DESIGN**. Related: [aa-cards issue #47](https://github.com/aerovista-us/aa-cards/issues/47), [PR #50](https://github.com/aerovista-us/aa-cards/pull/50).

## Established game canon (design requirement)
- The Case Worker authorizes placements, presented by the Afterlife Rolodex.
- The Stat Generator may change statistics, traits, quirks, buffs/debuffs and gameplay modifiers, **never** next-life placement.
- One free spin is granted per genuine Placement Office visit. Earned spins can be archived and spent later.

## Existing implementation vs proposal
The current authored Office run persists **one d20 intake assessment for the entire run** under `stat.assessment`; `rng.rngDraws` is restricted to 0 or 1, and assessment `glitchInsight` affects saved Glitch heat. Office return from Hallway does not reset assessment. That implementation cannot be rerolled naively without breaking schema-3 save invariants or rewriting Glitch consequences.

`gateway/stat-spin-ledger.mjs` proposes a **separate validated spin-credit accounting state** with no RNG/outcome or placement mutation. It is intentionally not imported by the Office engine, client, HTTP handler, schema-3 persistence or deployed server.

## Proposed event model (requires design approval)
- A trusted, server-generated **visit event ID** begins an Office visit, granting one free spin. Replaying the same ID grants no additional free spin; replaying an earlier visit ID is rejected. An approved new visit event ID resets only the unused/spent **free** allowance, not any existing assessment or past consequence.
- A unique committed **award event ID** grants one banked spin. Replaying the same award ID is idempotent and cannot mint additional credits. The **source** of an award is deliberately undefined until narrative/game-design acceptance.
- Consuming a spin requires a unique authoritative **spin-use event ID** supplied by the eventual owner-locked transaction. The ledger records each event with its visit and `free`/`banked` source; replaying the same event returns `consumed:false` and never debits another credit. Consuming a new event spends the current visit's free allowance before touching the bank; after the free use, a banked credit is consumed. The ledger rejects duplicate, out-of-order, same-visit double-free, forged balances, cross-type visit/award/use event collisions, or banked-before-free history on restore. **This is structural consistency only, not cryptographic protection against a maliciously rewritten JSON ledger.** The consuming game transaction must also atomically produce and validate its stat/trait outcome using server-owned RNG; the ledger does **not** do that.
- The ledger's event history is independently bounded at 256 visits, 256 awards, and 256 recorded spin uses; it fails closed on limit rather than dropping old IDs and allowing repeated grant IDs. Production retention/compaction is an unresolved design/operations decision.

## Acceptance before gameplay integration
1. Define what objectively starts a new Placement Office visit. Returning Office → Hallway → Office merely to collect another spin may be farming; do not silently choose an interpretation.
2. Approve the exact events that earn spin credits, eligibility, caps, and whether older credits expire or carry across lives.
3. Specify whether later spins replace the initial assessment, accumulate traits, or affect other stats. **Existing Glitch heat and earlier saved decisions must not be recomputed**.
4. Choose new save schema version and additive compatibility strategy. Legacy schema-2 and schema-3 runs must resume without resetting rewards or RNG. No bulk migration or production write is included here.
5. Bind the new server-side command to owner-scoped authorization, expected revision CAS, atomic RNG/ledger update, concurrent/duplicate rejection, private-state projection and mobile character view.
6. Run both Office/Hallway paths, repeated visits, banked spins and replay attempts through real disposable PostgreSQL and synthetic Chromium; then independently test with authorized live Account A/B before promotion.

## Executed evidence
- `tests/stat-spin-ledger.test.mjs`: six focused cases cover free visits, idempotent spend and award events, credit banking, restored per-visit use history, rejection of forged debit/credit totals, impossible orderings, duplicate free use, banked-before-free attempts, shared event-ID collisions, unexpected placement/trait/RNG data, and bounded event exhaustion.
- NXCore: `node --test tests/stat-spin-ledger.test.mjs` **6/6 passed**; `node --test tests/*.test.mjs` **162/162 passed**, no production-facing changes.

**Decision boundary:** Passing pure state tests is not approval to change Stat Generator gameplay. No earning rules were invented, and this module cannot choose placements or alter the active player save.
