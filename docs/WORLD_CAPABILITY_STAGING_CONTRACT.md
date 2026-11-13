# Ascension — staged world capability adapter contract

**Status:** Staging-only source candidate; **not registered, mounted, approved, or deployed**. Related: [aa-cards #45](https://github.com/aerovista-us/aa-cards/issues/45), [ACOS #126](https://github.com/aerovista-us/ACOS/pull/126), [ACOS #167](https://github.com/aerovista-us/ACOS/issues/167).

## What this change proves

`createWorldCapabilityAuthorizer({adapter,capabilityNames})` in `gateway/world-capability-policy.mjs` supplies the existing `createOwnerWorldInteractionStore({pool,authorizeWorld})` authorization callback. It uses **only the already-supported App Adapter `identity.can({identityId,capability})` contract**. The native-session identity must already have been resolved by the current bridge; the policy does not authenticate tokens, accept client owner IDs, mint capabilities, or grant permissions.

The exact capability names are **required configuration**, not defaults. Each configured name must be distinct, syntactically valid and mapped to an actually registered and approved capability by the Identity operator. No names from tests are registered or appropriate for production. A missing App Adapter or missing capability configuration makes construction fail.

| Operation | Required current grant(s) |
| --- | --- |
| Read current or owned run (`load`) | configured `load` |
| Create run (`create`) | configured `create` |
| Any non-travel world command (`action`) | configured `action` |
| Travel command (`action` / `travel`) | **both** configured `action` and `travel` |
| Protected map read (`map`, latest owner run selected by server) | configured `map` (separate API still unmounted) |

Only the exact, strict `{ok:true,allowed:true}` response permits progress. A grant is checked anew for each operation, including subsequent calls after revocation. An unregistered, revoked, malformed, absent, or denied grant never authorizes an action. Adapter failures throw, leaving owner-store transactions to roll back; the current HTTP handler returns a bounded 503. Malformed or authority-injected operation descriptions are denied without contacting the Adapter.

## Integration boundary and acceptance still missing

1. Approved **registered capability identifiers**, App Adapter version, real Identity Gateway authorization and revocation behavior. The adapter's `identity.can` fixture is not proof a capability exists in the live registry.
2. Identity A/B callback/session/CSRF/Origin/logout/expiry and cross-owner evidence for [ACOS #126](https://github.com/aerovista-us/ACOS/pull/126). The resolver must source `identity.subject` only from a current native session.
3. Reviewed production-equivalent staging composition of the native bridge, handler, owner store and restricted PostgreSQL role; no default `()=>true` authorization or browser-supplied identifiers.
4. Exact-head browser→API→transaction→save/re-login/resume and negative grant/travel/revocation tests; migration, backup/restore, rollback and independent approval.
5. Separate authorized deployment/promotion decision. **Do not mount routes, inject protected map service, or change production storage** to run these source tests.

## Evidence

- `tests/world-capability-policy.test.mjs`: constructor denial, operation mapping, strict grant response, action+travel double grant, revoked permissions, malformed request refusal and gateway failure.
- `tests/owner-world-interaction-store.test.mjs`: validates policy supplied directly to owner store; denied travel/action grants preserve the existing revision and state.
- Synthetic unit tests only. This change does not run a real Account browser, write to production PostgreSQL, register capabilities, or prove protected map acceptance.
