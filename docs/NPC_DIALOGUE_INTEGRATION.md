# Dormant NPC presentation candidate

This replaces the older #3 proposal without mounting an endpoint or contacting live providers. The authored Office/Hallway continues to use server-scripted rules/dialogue. Generated text is optional presentation and never grants placement, stats, items, permissions or saved effects.

## Required composition

`createNpcHttpHandler` requires a current native-session resolver, guarded owner-run loader, CSRF verifier, current NPC context resolver and explicit `authorizeDialogue` decision. It checks exact HTTPS Host/Origin, credentialed CORS/preflight, POST JSON, one allowed body field (`utterance`), body size/deadline, native subject, run owner, NPC presence and action authorization. Dependency/parser failures return bounded errors. No production capability name or implicit role permission is invented.

Use `visibleWorldNpcContext` with the committed main-world run. It derives facts only from the public view and an actually offered nearby NPC interaction. It does not expose native IDs/tokens, RNG, raw NPC memory, private future Director state or an arbitrary full save. Request-supplied owner/NPC/fact/session/command fields are rejected. The helper currently supports the Case Worker and Hallway attendant in the authored game; it does not revive the legacy identity scaffold.

`createNpcDialogueService` requires shared quota/cache stores and a server output policy (`approveDialogue`). Provider keys and model identifiers must be supplied explicitly by reviewed deployment composition; there are no hardcoded default models or environment/secret loaders. A missing output policy or a configured key without an explicit model fails construction. Live provider availability is not claimed by synthetic tests.

The policy must approve generated **and cached** text before it can be returned. Production policy/moderation and player-data consent remain unapproved deployment gates; fixture policies returning true are not production approval. Render output as text, never HTML or executable commands.

## Provider and store behavior

- Groq precedes Gemini; scripted fallback handles failure. Fetch refuses redirects and shares a bounded provider deadline. Inputs, approved facts/memory and output lengths are capped.
- Every request, including cache hits, consumes the atomic shared per-player admission quota. A quota outage fails closed to scripted text without a provider request. Cache outage is a miss; a failed cache write does not discard an approved answer or trigger an unnecessary second provider call.
- Cache keys include player, NPC, scene, utterance, approved facts and visible memory. Shared stores validate tokens, TTLs and cached fields and omit unknown payload fields. They contain no login-challenge/authentication API.
- Redis's EVAL increment/expiry is atomic across instances. Production must additionally supply approved global budgets, current provider pricing/model availability, bounded policy evaluation and appropriate retention/consent controls before any provider is enabled.

## Evidence

Unit fixtures exercise exact-origin/CSRF/owner/action denial, authority-field rejection, stalled/oversized requests, bounded errors, provider order/failover, policy rejection, scoped caching and store failure. No provider credential or model is real in these tests.

`tests/npc-stores.redis-ci.mjs` requires a fresh loopback Redis service and fixed disposable DB configuration. It uses two real connections to prove one shared concurrent quota, cross-instance cache visibility, separate keys, TTL expiration and a shared service request budget. Provider calls remain synthetic. The official MIT node-redis client is pinned at 6.2.1 for CI (Node >=20), with Redis 7; neither is a new production deployment.

## Promotion boundary

The factory is unmounted and main game UI imports none of these modules. No provider credentials are opened/provisioned and no live provider requests, game commands, production Redis changes or save writes occur. Real Account lifecycle acceptance, registered dialogue capability, approved output/input policy, consent, global budgets, live provider smoke and reviewed runtime composition remain required before optional dialogue activation. Production gameplay/map/cloud saves remain disabled; ACOS #126 stays draft.
