#!/usr/bin/env bash
# Disposable PostgreSQL transaction acceptance. Never touches production DB.
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
TMP="$(mktemp -d /tmp/aa-m18-pg-js-XXXXXX)"
NAME="aa-m18-js-$$-$(date +%s)"
cleanup(){ docker rm -f "$NAME" >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
npm install --prefix "$TMP" --no-save --no-audit --no-fund --silent pg@8 >/dev/null
export PG_MODULE_PATH="$TMP/node_modules/pg"
docker run --pull never -d --rm -p 127.0.0.1::5432 --name "$NAME" -e POSTGRES_PASSWORD=disposable-only -e POSTGRES_DB=ascension_accept postgres:16-alpine >/dev/null
export TEST_PG_PORT="$(docker port "$NAME" 5432/tcp | head -1 | awk -F: '{print $NF}')"
ready=0
for _ in $(seq 1 30); do if docker exec "$NAME" pg_isready -U postgres -d ascension_accept >/dev/null 2>&1; then ready=1; break; fi; sleep 1; done
((ready)) || exit 1
docker exec -i "$NAME" psql -q -v ON_ERROR_STOP=1 -U postgres -d ascension_accept <"$ROOT/gateway/migrations/001_player_runs.sql"
node "$ROOT/scripts/pg-task-transaction-accept.mjs"
