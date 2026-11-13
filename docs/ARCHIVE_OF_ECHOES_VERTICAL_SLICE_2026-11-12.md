# Archive of Echoes — first destination vertical slice

**Date:** November 12, 2026 (Pacific). **Status:** isolated source candidate, release **HOLD**.
Tracked by [aa-cards #48](https://github.com/aerovista-us/aa-cards/issues/48). This authored first destination is deliberately not a claim of recovered-v4 parity.

## Canonical scope and player experience

After the Case Worker approves Billy's **Memory Annex** placement through the Rolodex and the first Hallway route is confirmed, the assigned door now offers entry to the **Archive of Echoes**. The Present Hall → Veilway destination remains closed. The Stat Generator still supplies one intake assessment only and cannot select the destination.

The Archive is a 7×7 server-owned walkable room with an Archivist NPC, an Echo Ledger, an unfiled memory and an Archive Seal. The first quest:
1. Speak with the Archivist, whose words acknowledge the previously saved **Assistance** or **Scrutiny** consequence.
2. Inspect the Echo Ledger and witness the unfiled echo.
3. Choose **Preserve** or **Release** that echo. The choice is permanently committed for this first record, cannot be repeated or replaced, and does not grant an item, reroll or placement.
4. File the Archive Seal to finish the quest. Billy may return to the Hallway before or after completing the record. Returning to the Archive does not reset the NPC, decision or mission flags.

The public scene uses an Archive-specific palette and marker art, supports the existing accessible tile map and responsive Phaser presentation, and projects only committed quest state. No browser has authority over rewards, RNG, placement or inventory.

## Persistence and compatibility contract

- Existing schema-2 Office saves still upgrade to schema-3 on read; existing schema-3 Office/Hallway saves remain schema-3 on load.
- The **first authorized Hallway → Archive travel action** upgrades just that committed run to schema-4, adds `archive:{mode,archivistMet,ledgerRead,echoWitnessed,resolution,sealIssued}`, and increments revision by the normal owner-locked PostgreSQL transaction.
- Schema-4 restores continue to accept Office/Hallway locations after returning; the Archive state stays in the saved run.
- Restoration rejects malformed Archive flags, a forged early resolution or seal, placement mismatches, unconfirmed Hallway routes, invalid tiles, cross-owner access and incompatible save versions.
- PostgreSQL's `loadCurrentRun` owner selector now includes `archive-of-echoes`, preventing a false new-run/fork after destination entry. `loadRun` and actions retain owner binding, revision compare-and-swap and rollback on denied operations.
- Existing first assessment, RNG checkpoint, heat, Glitch resolution, case file, inventory and previous NPC memory survive Archive progress unchanged.
- The public `ascension.world-view.v3` envelope stays backward compatible for Office/Hallway; only Archive views contain the additional validated `archive` object. A later public view schema negotiation may be needed before any production rollout.

**Rollback warning:** A pre-Archive codebase does not understand schema-4 Archive saves. Production promotion must include additive-reader support or a rehearsed rollback strategy; the current draft is not permission to deploy or migrate real saves.

## Verification

- `tests/world-archive.test.mjs`: five focused engine/save/view cases for entry gating, both Glitch paths and memory choices, narrative quest, repeat refusal, return/re-entry and forged save rejection.
- Existing `node --test tests/*.test.mjs` remains the full regression.
- `tests/world-game.pg-ci.mjs`: actual disposable PostgreSQL owner-transaction proof for both choices and consequences, stale revision denial, cross-owner refusal, no mutation after rejected repeat, saved-state reread and return/re-entry.
- `scripts/office-browser-accept.mjs`: the accepted **Report/Memory** browser path exercises Archive entry, Archivist, Ledger, Echo, Preserve and Seal; reload and full-state equality, mobile no-horizontal-overflow and return to Hallway. Existing **Conceal/Present** browser path must remain unchanged. Complementary **Conceal/Memory** path is tested by the PostgreSQL suite.
- **Executed on NXCore:** `node --test tests/*.test.mjs` **161/161 passed**; fresh disposable PostgreSQL 16 HTTP/transaction suite **10/10 passed** (both Archive choice paths); local Playwright/Phaser Chromium run **PASS for Report/Memory and Conceal/Present**, zero page errors, no horizontal overflow at 390×844, and Archive desktop/mobile screenshots produced as temporary QA artifacts. Production remained untouched.
- All browser/DB fixture identities and data are synthetic, isolated, and disposable. No live Account A/B proof is claimed.

## Explicit open gates

The first destination text and memory choice consequences need narrative acceptance before production. Further Archive chapters and the Veilway remain unimplemented. The free-per-Office-visit / earned-banked Stat Generator economy is separate [#47](https://github.com/aerovista-us/aa-cards/issues/47) and intentionally untouched. The real native Account authorization matrix, approved capabilities and staging storage are still blocked by [ACOS #126](https://github.com/aerovista-us/ACOS/pull/126). No world/game/cloud-save production routes are enabled here.
