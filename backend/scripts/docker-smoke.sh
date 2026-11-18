#!/usr/bin/env bash
# Disposable end-to-end check of the API images (runtime + migrate) in production mode.
#
#   backend/scripts/docker-smoke.sh [api-image] [migrate-image]
#
# Starts a throwaway PostgreSQL 17 with TLS (certificates from a throwaway CA), then checks migrations, the
# staff bootstrap, startup refusals, health, CORS, a database outage and SIGTERM. Creates and removes only
# Docker resources named homecare-smoke-* and uses host port 4599. Never point it at a real database.
# shellcheck disable=SC2034  # `out` is read inside the eval in check(); loop counters are unused by design
set -u
API_IMAGE="${1:-homecare-api:local}"
MIGRATE_IMAGE="${2:-homecare-api-migrate:local}"
PORT=4599
S=$(mktemp -d); NET=homecare-smoke-net; PG=homecare-smoke-pg; API=homecare-smoke-api; VOL=homecare-smoke-ca
cleanup() { docker rm -f $PG $API homecare-smoke-loader >/dev/null 2>&1; docker network rm $NET >/dev/null 2>&1; docker volume rm $VOL >/dev/null 2>&1; rm -rf "$S"; }
trap cleanup EXIT
pass=0; fail=0; ok() { echo "PASS  $1"; pass=$((pass+1)); }; bad() { echo "FAIL  $1"; fail=$((fail+1)); }
check() { if eval "$2"; then ok "$1"; else bad "$1"; fi; }

cd "$S" || exit 1
openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj "/CN=homecare-smoke-ca" -keyout ca.key -out ca.crt 2>/dev/null
openssl req -newkey rsa:2048 -nodes -subj "/CN=$PG" -keyout server.key -out server.csr 2>/dev/null
printf "subjectAltName=DNS:%s\n" $PG > san.ext
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -days 1 -extfile san.ext -out server.crt 2>/dev/null

docker network create $NET >/dev/null; docker volume create $VOL >/dev/null
docker create --name homecare-smoke-loader -v $VOL:/certs alpine:3 true >/dev/null && docker cp ca.crt homecare-smoke-loader:/certs/ca.crt >/dev/null && docker rm homecare-smoke-loader >/dev/null
docker create --name $PG --network $NET -e POSTGRES_USER=smoke -e POSTGRES_PASSWORD=smoke-disposable -e POSTGRES_DB=homecare_smoke --tmpfs /var/lib/postgresql/data \
  --entrypoint sh postgres:17 -c 'mkdir -p /srv/tls && cp /tls/server.crt /tls/server.key /srv/tls/ && chown -R postgres /srv/tls && chmod 600 /srv/tls/server.key && exec docker-entrypoint.sh postgres -c ssl=on -c ssl_cert_file=/srv/tls/server.crt -c ssl_key_file=/srv/tls/server.key' >/dev/null
docker cp "$S/." $PG:/tls >/dev/null; docker start $PG >/dev/null
for i in $(seq 1 40); do docker exec $PG pg_isready -U smoke -d homecare_smoke -h 127.0.0.1 >/dev/null 2>&1 && break; sleep 1; done
check "disposable PostgreSQL has TLS on" '[ "$(docker exec $PG psql -U smoke -d homecare_smoke -h 127.0.0.1 -tAc "show ssl")" = on ]'

B="postgresql://smoke:smoke-disposable@$PG:5432/homecare_smoke"
MIG="$B?sslmode=require&sslaccept=strict&sslcert=/certs/ca.crt"
RUN="$B?sslmode=verify-full&sslrootcert=/certs/ca.crt"
M() { docker run --rm --network $NET -v $VOL:/certs:ro "$@"; }

out=$(M -e MIGRATION_DATABASE_URL="$B?sslmode=require" "$MIGRATE_IMAGE" 2>&1); check "migrate refuses a URL without strict certificate checks" 'echo "$out" | grep -q "Refusing to migrate"'
out=$(M -e MIGRATION_DATABASE_URL="$B?sslmode=require&sslaccept=strict" "$MIGRATE_IMAGE" 2>&1); check "migrate fails on an untrusted server certificate" 'echo "$out" | grep -q "certificate verify failed"'
out=$(M -e MIGRATION_DATABASE_URL="$MIG" "$MIGRATE_IMAGE" 2>&1); check "migrate deploy applies all migrations" 'echo "$out" | grep -q "All migrations have been successfully applied"'
check "4 migrations recorded" '[ "$(docker exec $PG psql -U smoke -d homecare_smoke -h 127.0.0.1 -tAc "select count(*) from _prisma_migrations where finished_at is not null")" = 4 ]'
check "append-only triggers present" '[ "$(docker exec $PG psql -U smoke -d homecare_smoke -h 127.0.0.1 -tAc "select count(*) from pg_trigger where not tgisinternal and tgfoid = '"'"'forbid_mutation'"'"'::regproc")" -ge 2 ]'
out=$(M -e MIGRATION_DATABASE_URL="$MIG" "$MIGRATE_IMAGE" 2>&1); check "second migrate run is a no-op" 'echo "$out" | grep -q "No pending migrations"'
out=$(M -e DATABASE_URL="$RUN" "$MIGRATE_IMAGE" npm run -s staff:create -- --phone "90000 00009" --name "Smoke Test Admin" --role super_admin 2>&1); check "staff:create works from the migrate image" '[ "$(docker exec $PG psql -U smoke -d homecare_smoke -h 127.0.0.1 -tAc "select count(*) from staff_members where role = '"'"'super_admin'"'"'")" = 1 ]'

J=$(openssl rand -base64 48); P=$(openssl rand -base64 48)
A() { docker run --rm --network $NET -v $VOL:/certs:ro -e JWT_ACCESS_SECRET="$J" -e OTP_PEPPER="$P" "$@" "$API_IMAGE" 2>&1; }
out=$(A -e DATABASE_URL="$B"); check "API refuses a database URL without TLS" 'echo "$out" | grep -q "DATABASE_URL must use TLS"'
out=$(A -e DATABASE_URL="$RUN" -e OTP_PROVIDER=console); check "API refuses the console OTP provider" 'echo "$out" | grep -q "console OTP provider"'
out=$(A -e DATABASE_URL="$RUN" -e CORS_ORIGINS=http://ops.example.test); check "API refuses a non-https CORS origin" 'echo "$out" | grep -q "exact https:// origin"'
out=$(docker run --rm --network $NET -e DATABASE_URL="$RUN" -e OTP_PEPPER="$P" "$API_IMAGE" 2>&1); check "API refuses a missing JWT secret" 'echo "$out" | grep -q "JWT_ACCESS_SECRET"'
out=$(A -e DATABASE_URL="$RUN" -e OTP_PEPPER="$J"); check "API refuses identical secrets" 'echo "$out" | grep -q "must be different"'

docker run -d --name $API --network $NET -p 127.0.0.1:$PORT:4000 -v $VOL:/certs:ro -e JWT_ACCESS_SECRET="$J" -e OTP_PEPPER="$P" \
  -e DATABASE_URL="$RUN" -e CORS_ORIGINS=https://ops.example.test -e TRUST_PROXY=1 "$API_IMAGE" >/dev/null
for i in $(seq 1 60); do [ "$(docker inspect -f '{{.State.Health.Status}}' $API)" = healthy ] && break; sleep 1; done
check "container reports healthy" '[ "$(docker inspect -f "{{.State.Health.Status}}" $API)" = healthy ]'
check "runs as non-root user node" '[ "$(docker exec $API id -un)" = node ]'
check "readiness /health = 200 with database ok" 'curl -sf localhost:$PORT/health | grep -q "\"database\":\"ok\""'
check "Swagger off by default in production" '[ "$(curl -s -o /dev/null -w "%{http_code}" localhost:$PORT/docs)" = 404 ]'
check "send-otp returns 503 with no SMS provider" '[ "$(curl -s -o /dev/null -w "%{http_code}" -XPOST localhost:$PORT/auth/send-otp -H "content-type: application/json" -d "{\"phone\":\"9840012345\"}")" = 503 ]'
check "CORS allows the configured origin" 'curl -s -D - -o /dev/null -X OPTIONS localhost:$PORT/admin/auth/refresh -H "Origin: https://ops.example.test" -H "Access-Control-Request-Method: POST" | grep -qi "access-control-allow-origin: https://ops.example.test"'
check "CORS ignores other origins" '! curl -s -D - -o /dev/null -X OPTIONS localhost:$PORT/admin/auth/refresh -H "Origin: https://evil.example" -H "Access-Control-Request-Method: POST" | grep -qi "access-control-allow-origin"'
check "no-store and nosniff headers" 'curl -sI localhost:$PORT/health/live | grep -qi "cache-control: no-store" && curl -sI localhost:$PORT/health/live | grep -qi "nosniff"'
check "scheduler started (job queue polled without errors)" '! docker logs $API 2>&1 | grep -qi "scheduler.*error"'
check "no secrets in logs" '! docker logs $API 2>&1 | grep -qF "$J" && ! docker logs $API 2>&1 | grep -qF "smoke-disposable"'

docker pause $PG >/dev/null
check "database outage: readiness 503" '[ "$(curl -s -m 15 -o /dev/null -w "%{http_code}" localhost:$PORT/health)" = 503 ]'
check "database outage: liveness still 200" '[ "$(curl -s -m 5 -o /dev/null -w "%{http_code}" localhost:$PORT/health/live)" = 200 ]'
docker unpause $PG >/dev/null; sleep 2
check "database back: readiness 200" '[ "$(curl -s -m 15 -o /dev/null -w "%{http_code}" localhost:$PORT/health)" = 200 ]'

t0=$(date +%s); docker stop -t 25 $API >/dev/null; t1=$(date +%s)
check "SIGTERM: clean exit code 0 in $((t1-t0))s (well under the 25 s kill timeout)" '[ "$(docker inspect -f "{{.State.ExitCode}}" $API)" = 0 ] && [ $((t1-t0)) -lt 20 ]'
echo "---"; echo "$pass passed, $fail failed"; [ $fail = 0 ]
