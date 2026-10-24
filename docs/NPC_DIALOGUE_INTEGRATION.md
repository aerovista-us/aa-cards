# Ascension NPC Dialogue Router — staging only

Server-only `gateway/npc-dialogue.mjs` implements Groq first and Gemini secondary via their documented HTTPS REST APIs. It is NOT connected to public Pages, AVCC sessions, or the live game. A running production identity gateway and real canonical state are prerequisites.

## Trust boundaries
- Call `talk` only after resolving a current AVCC session and run ownership on the server. The adapter's `sessionAuthorized` boolean is an internal assertion, **not authentication**. Never pass that field through a browser payload or trust a browser-provided player ID.
- Construct NPC identity, scene ID, facts, and permitted memory on the server from a known character registry and a sanitized projection of Ascension v4 state.
- AI returns short display dialogue only. No changes to storylet eligibility, rolls, resources, placements, purchase grants, save records, or player stats.
- Never send server secrets or hidden canon, private future outcomes, third-party data, arbitrary full saves, or provider keys to models.
- Provider answers can hallucinate. For high-impact factual claims, apply server-side policy checks or prefer scripted lines.

## Provider setup
Configure `GROQ_API_KEY`, `GEMINI_API_KEY`, `GROQ_MODEL` and `GEMINI_MODEL` in the server's secret configuration, not in GitHub Pages. Default model identifiers are initial candidates only; verify account eligibility and model availability before deployment. Providers:
- Groq `POST https://api.groq.com/openai/v1/chat/completions`.
- Gemini `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`.

## Stores required
Pass `quota.take(key,{limit,windowSeconds})` backed by an atomic, shared rate-limiter (Redis/DB; no per-process counter). Return true on acquired quota, false if exhausted. Apply independent IP/global budgets at HTTP middleware and provider account caps too.
Pass `cache.get(key)` and `cache.put(key,value,{ttlSeconds})` backed by a shared TTL store. Keys hash player ID, NPC, scene, utterance, approved facts, and memory to avoid cross-player reuse. Enforce max storage and account data retention limits. Clear player caches when saves, consent, or entitlements change; avoid caching sensitive dialogues if policy requires. Cache is only an optimization, not a memory source of truth.

## Safety and reliability
- Separate model-provider quotas from player quotas and protect against large inputs / high concurrency.
- Budget estimated tokens, validate model outputs beyond length before public release, and configure provider abuse/moderation policy.
- Time out provider requests, try Gemini second, then return scripted fallback, never a fatal game-state error.
- No automatic purchase or permission grants; conversation text is not executable game input.
- Verify rate limit and cache isolation across *multiple* app instances, timeout handling, malformed outputs, and player logout/revocation.
- Log provider, latency and outcomes only; do not log raw private dialogue or credentials.

## Release gate
Exact-head CI, secrets provisioned, multi-instance quota test, real authenticated requests, owner isolation, live provider smoke, no gameplay mutations, mobile UI, and fallback test. Keep draft until these pass.
