#!/usr/bin/env bash
# Isolated schema/CAS smoke test only. Does NOT satisfy full M18 PostgreSQL gate.
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
command -v docker >/dev/null || { echo 'Docker required' >&2; exit 2; }
NAME="aa-m18-smoke-$$-$(date +%s)"
cleanup(){ docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT
# Uses image already cached on NXCore; no production database or named volume.
docker run --pull never -d --rm --name "$NAME" -e POSTGRES_PASSWORD=disposable-only -e POSTGRES_DB=ascension_smoke postgres:16-alpine >/dev/null
ready=0
for _ in $(seq 1 30); do if docker exec "$NAME" pg_isready -U postgres -d ascension_smoke >/dev/null 2>&1; then ready=1; break; fi; sleep 1; done
((ready)) || { echo 'Disposable PostgreSQL failed readiness' >&2; exit 1; }
docker exec -i "$NAME" psql -q -v ON_ERROR_STOP=1 -U postgres -d ascension_smoke <"$ROOT/gateway/migrations/001_player_runs.sql"
result="$(docker exec -i "$NAME" psql -At -v ON_ERROR_STOP=1 -U postgres -d ascension_smoke <<'SQL'
INSERT INTO ascension_player_runs(id,owner_subject,state) VALUES('smoke','alice','{"turn":2,"rngDraws":8}'::jsonb);
UPDATE ascension_player_runs SET state=jsonb_set(state,'{turn}','3'::jsonb),revision=revision+1 WHERE id='smoke' AND owner_subject='alice' AND revision=0;
DO $$ BEGIN
 IF (SELECT revision FROM ascension_player_runs WHERE id='smoke')<>1 THEN RAISE EXCEPTION 'CAS write failed'; END IF;
 IF (SELECT state->>'turn' FROM ascension_player_runs WHERE id='smoke')<>'3' THEN RAISE EXCEPTION 'JSON persistence failed'; END IF;
 IF (SELECT state->>'rngDraws' FROM ascension_player_runs WHERE id='smoke')<>'8' THEN RAISE EXCEPTION 'RNG cursor changed'; END IF;
END $$;
UPDATE ascension_player_runs SET revision=revision+1 WHERE id='smoke' AND owner_subject='bob' AND revision=1;
DO $$ BEGIN IF (SELECT revision FROM ascension_player_runs WHERE id='smoke')<>1 THEN RAISE EXCEPTION 'wrong owner wrote'; END IF; END $$;
UPDATE ascension_player_runs SET revision=revision+1 WHERE id='smoke' AND owner_subject='alice' AND revision=0;
DO $$ BEGIN IF (SELECT revision FROM ascension_player_runs WHERE id='smoke')<>1 THEN RAISE EXCEPTION 'stale revision wrote'; END IF; END $$;
SELECT 'SCHEMA_CAS_SMOKE_PASS';
SQL
)"
grep -q 'SCHEMA_CAS_SMOKE_PASS' <<<"$result"
echo 'PASS: isolated schema, JSON state, RNG checkpoint, wrong-owner and stale-revision SQL checks'
echo 'LIMIT: does not exercise JS gateway, concurrency, restart, or AVCC; release gate remains HOLD'
