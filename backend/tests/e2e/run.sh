#!/usr/bin/env bash
# E2E del flujo cotización → venta.
# Levanta un Postgres EFÍMERO en Docker, aplica el schema, seedea, arranca el
# backend en :3999 y corre el flujo. NUNCA toca la BD de producción.
#
#   ./tests/e2e/run.sh
set -euo pipefail
cd "$(dirname "$0")/../.."

DB_CONTAINER=bp-test-db
DB_PORT=55432
export DATABASE_URL="postgresql://test:test@localhost:${DB_PORT}/bptest"
export JWT_SECRET="e2e-test-secret"
export PORT=3999
export NODE_ENV=test

limpiar() {
  [ -n "${SERVER_PID:-}" ] && kill "$SERVER_PID" 2>/dev/null || true
  docker rm -f "$DB_CONTAINER" >/dev/null 2>&1 || true
}
trap limpiar EXIT

echo "▸ Levantando Postgres efímero…"
docker rm -f "$DB_CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$DB_CONTAINER" \
  -e POSTGRES_PASSWORD=test -e POSTGRES_USER=test -e POSTGRES_DB=bptest \
  -p ${DB_PORT}:5432 postgres:16-alpine >/dev/null
for _ in $(seq 1 30); do
  docker exec "$DB_CONTAINER" pg_isready -U test >/dev/null 2>&1 && break
  sleep 1
done

echo "▸ Aplicando schema (db push — el repo usa db push, no migrate)…"
npx prisma db push --accept-data-loss --skip-generate >/dev/null

echo "▸ Seed…"
node tests/e2e/seed.js >/dev/null

echo "▸ Arrancando backend en :$PORT…"
node src/index.js > /tmp/e2e-server.log 2>&1 &
SERVER_PID=$!
for _ in $(seq 1 30); do
  curl -sf "http://localhost:$PORT/api/health" >/dev/null 2>&1 && break
  sleep 1
done

echo "▸ Flujo cotización → venta:"
node tests/e2e/flujo-venta.e2e.js
