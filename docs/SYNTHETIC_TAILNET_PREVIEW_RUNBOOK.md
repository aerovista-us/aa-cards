# Ascension Awaits — NXCore synthetic Tailnet preview (not staging acceptance)

This runbook documents a **deliberately separate preview** of the combined candidate. A preview is not the production-authenticated Account A/B staging acceptance required by [ACOS #126](https://github.com/aerovista-us/ACOS/pull/126).

## Boundary

- Dedicated Compose project: `/srv/ACOS/_acceptance/ascension-synthetic-preview`. No production `ascension-web` / `ascension-auth` changes.
- UI: `https://nxcore.tail79107c.ts.net:9452/game/` (Tailnet-only, not Funnel). API: same host on port 9453.
- Tailscale Serve routes both HTTPS listeners to a **single Docker port bound at 127.0.0.1:17888**, not a public host port. Both URLs must stay Tailnet-only.
- Dedicated PostgreSQL 16, Compose-internal network, synthetic database `ascension_preview_synthetic_20261112`, synthetic subject `synthetic-preview-billy`. No network path, credentials, volumes or App Adapter access to live Account/AVCC.
- Strict-preview startup guards require the exact private Tailnet hostname/ports, DB host/name/user, strong random preview cookie/CSRF, and explicit `ASCENSION_SYNTHETIC_PREVIEW=1`.
- Client serves an explicitly labeled preview-only rewrite of the API origin and origin allowlist; production source has unchanged policy. Local Phaser is served from the preview container; no live service dependency.
- This **single shared demo persona** is for interactive evaluation only. Progress may be reset. Tailnet membership is the access boundary, not individual Account authorization.
- Draft work contains a schema-4 Archive reader. Rolling back a real database with schema-4 saves to a schema-3 reader is NOT certified; never point this Compose project at production storage.

## Verification and evidence

1. Confirm `docker compose ps` reports both containers healthy and `docker inspect` shows only `127.0.0.1:17888` published.
2. Confirm `tailscale serve status` lists both new ports and retains the existing 9443/9445/9447/9450/9451 services.
3. `GET /health` reports `synthetic-tailnet-preview` and exact candidate SHA.
4. The UI loads as synthetic and starts a new run, then records Notice / Records / Case Worker / Stat Generator / Rolodex / Glitch → Hallway → Archive; cookie, CSRF, owner lock and revision CAS remain enforced by the actual composed game handler.
5. Browser smoke checks include basic scene loading, save reload, absent hidden data, and a blocked unsafe/missing-origin API call.
6. Exact integrated code tests should pass before and after deploy. CI remains a separate gate from live Account A/B.

## Monitoring and rollback

`cd /srv/ACOS/_acceptance/ascension-synthetic-preview && docker compose ps && docker compose logs --tail=60 preview`

To **disable Tailnet preview only** without affecting other Tailscale Serve services, remove **just** the two port listeners using the supported `tailscale serve clear` per-port command for this installed version. To stop containers: `docker compose down`. Do not use `tailscale serve reset` or `docker compose down -v` unless an explicit full preview wipe has been approved.

Production `https://ascension.aerovista.us` and `https://ascension-auth.aerovista.us` must retain their intended disabled gameplay/world/map boundary until native Account A/B, grants, migrations, recovery, private reviewer and founder release sign-off are real PASS, not fixture PASS.

## Explicit limitations

This is **not** authenticated real user gameplay, not a certified Cloudflare Access environment, not canonical native capability grants, not production recovery evidence, and not a deploy/merge authorization for ACOS #126. No hidden fixtures should be presented as human Account acceptance. All earned spins remain the separate dormant game-design proposal.
