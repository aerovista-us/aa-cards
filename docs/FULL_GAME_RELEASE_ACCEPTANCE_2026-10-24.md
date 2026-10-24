# Full-game release acceptance — live verification 2026-10-24

**Decision: BLOCKED.** This document distinguishes tested backend components from the as-yet unimplemented production journey.

## Checked on NXCore
- `https://ascension.aerovista.us/` serves GitHub Pages design preview; Cards are not wired to a live game API.
- `https://identity-api.aerovista.us/v1/me` without a session returns **401** (expected).
- `ascension-auth.aerovista.us` does **not resolve** from NXCore. No app-owned Ascension callback was demonstrated.
- Legacy `http://100.115.9.61:8084/api/runs` returns **200** without authentication. Do not use it as public API and do not expose it through new routing.
- `gateway/transactional-game-runtime.mjs` requires a canonical executor object, but no complete deployed server executor or source-parity proof exists.

## Acceptance — every item required
1. Recover and server-port **the complete** choice lifecycle: storylet eligibility, spawn consumption/rewards, original weighted outcome selection, State effects, delayed echo creation/closure, NPC relationships, decision history, XP/leveling, unlocking, cell requirements, AP, turn transitions/aftershocks, canonical map and RNG checkpoint.
2. Run state-by-state differential tests with matching initial saves and RNG rolls against the recovered browser implementation. Verify full JSON snapshots, map, RNG draw cursor, visible response and denial cases across first-hour branches, not just flags.
3. In disposable PostgreSQL, use the **same** server executor for concurrent actions, 409 replay denial, chapter authorization, 401/403 ownership denial, rollback on injected errors, and exact reload after process and DB restart.
4. Verify actual `aa_cards` identity registration and allowed callback. Deploy app-owned HTTPS exchange; test session cookie, expiry, CSRF/state/replay, logout and revocation. Do not trust browser `owner_subject` or session tokens.
5. Browser QA: register/login -> Billy -> opening stat generator -> Case Worker -> Rolodex -> choice -> save -> logout (deny action) -> login -> resume same run/revision, including mobile, keyboard and free/premium denial and approved grants.
6. Only after evidence for all five gates: promote integrated app to `ascension.aerovista.us`, retain independent preview, and verify production route / release commit / rollback.

`scripts/verify-live-game-readonly.mjs` is *preflight only*: it deliberately never returns a success code for full release without external acceptance evidence.
