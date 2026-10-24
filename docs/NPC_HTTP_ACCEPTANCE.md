# NPC HTTP integration acceptance

This branch adds a staging-only `POST /api/npc/dialogue` handler; it does **not** mount a live route or activate account login.

Mount only on an app-owned HTTPS server after all required collaborators exist:
- `resolveSession(req)`: resolve live AVCC session from a secure server-managed cookie; never from request JSON.
- `verifyCsrf(req)`: validate a session-bound, expiring CSRF token and trusted request origin. It must return exactly `true`.
- `loadOwnedRun(identity)`: retrieve only the active player's run.
- `visibleNpcContext(identity,run)`: verify current NPC is actually present/available and return only already-player-visible `npcId`, `sceneId`, `facts`, and `memory`, taken from authoritative Ascension v4 state.
- `dialogue.talk`: Groq primary, Gemini secondary, scripted fallback. Returns display-only dialogue.
- `quota.take` and `cache.get/put`: shared persistent Redis stores; add global/provider quotas and concurrency budgets at deployment.

## Required live acceptance
1. Authorized login -> NPC dialogue success; ensure no browser-supplied identity, NPC or game facts can override server context.
2. Logout or revoked session -> 401; expired CSRF -> 403.
3. Cross-account run access -> 404; absent NPC -> 403.
4. Quota/caching verified using separate server instances against actual Redis; no excessive provider spending.
5. Provider key handling (secrets only); Groq error -> Gemini; both unavailable -> scripted response.
6. Red-team prompt injection and hallucinations; ensure model text is never treated as a game action, placement or grant.
7. No user-facing raw model prompts, hidden scenes, extra run metadata or credentials.
8. Preserve published Pages static preview until secure auth and game acceptance.

## Cautions
No live provider API calls or production authentication tests have been run. The Redis adapter requires an instance supporting Redis `EVAL` and `SET EX`. The code handles request body limits and basic sanitization but needs deployed network rate limits and moderation before activation.
