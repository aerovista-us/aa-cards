# Verified cross-repository blocker audit — 2026-10-23

## Inspected code (not merely old handoff claims)
- [Recovered Ascension Director](https://github.com/aerovista-us/aerovista-ascension-skyforge-restored-2026-08/blob/main/js/systems/director.js) exports browser ESM class `Director(state,map,spawn)`, with `load(url)`, `eligible()`, `pick(k)`, score functions. It DOES NOT expose `executeChoice` or `allowedChoices`.
- [Recovered State](https://github.com/aerovista-us/aerovista-ascension-skyforge-restored-2026-08/blob/main/js/systems/state.js) has `makeBaseState`, `applyEffects`, `advanceTurn`, `snapshot`, `hydrate`. Snapshot defaults to `EARTH_PROLOGUE`; contains `turn`, `actionPoints`, `glitchLevel`, `flags`, `npcs`, `inventory`, `storyMemory`, `run`.
- [Recovered browser app](https://github.com/aerovista-us/aerovista-ascension-skyforge-restored-2026-08/blob/main/js/app.js) owns the orchestration of player interactions. To move gameplay server-side, extract/test that behavior; do not invent a second outcome engine.
- [Recovered local DB](https://github.com/aerovista-us/aerovista-ascension-skyforge-restored-2026-08/blob/main/db/localDb.js) stores runs in `data/runs.json`, with migration/snapshot conversions. This is not a secure owner-scoped transactional multi-player store.
- [Recovered server](https://github.com/aerovista-us/aerovista-ascension-skyforge-restored-2026-08/blob/main/server.js) exposes open `/api/runs` CRUD with no player-ownership session layer. Never connect Cards public clients to these routes.
- [ACOS App Adapter v0.4](https://github.com/aerovista-us/ACOS/blob/main/packages/aerocore-app-adapter/README.md) confirms `exchangeHandoff(code)` returns `sessionToken`, and the server resolves session, calls `identity.describe` and `identity.can`.
- [Cards gateway](https://github.com/aerovista-us/aa-cards/blob/main/gateway/identity-handlers.mjs) remains a fail-closed reference, not a deployed login.

## Immediate blocking sequence
1. **Login first**: verify approved `aa_cards` app registration and `ascension-auth.aerovista.us` callback, deploy a same-origin auth backend with trusted session and CSRF/state/replay controls, prove login/register/logout/revocation in browsers. Public Cards must not enable playable choices before that.
2. **Real engine extraction**: move canonical browser-app decision orchestration to a tested server-side v4 executor while reusing State/Director. Use the existing recovered archive to obtain excluded `content/` and `data/`; do not assume Git history includes them.
3. **Schema adapter**: bridge v4 snapshots to `ascension_runs` records with owner, active storylet, chapter classification and revision. Those last three fields are new server metadata and must not be fabricated from `State` defaults.
4. **Durability**: run PostgreSQL migration on disposable restored data, prove transaction atomicity, retention after restart, exact owner isolation, and destination-chapter gating.
5. **Presentation**: wire Cards UI to only sanitized visible scenes and choices, followed by Billy first-hour tests and premium/free boundary proof.

## Required corrections to PR #1 assumptions
- `createDirectorTransaction` is a **future execution adapter**, not verified wiring to v4. Its `director.allowedChoices` and `director.executeChoice` collaborators must be implemented by an adapter extracted from the original app.
- The PostgreSQL store schema is a proposed server record, **not the recovered run schema**.
- The recovered Director's `pick` uses runtime RNG and eligibility; execute it server-side transactionally to preserve deterministic outcomes and avoid client-side race/seed leaks.
- Current public app should remain a clearly non-playable preview, with sign-in links only when the real gateway is proven.
