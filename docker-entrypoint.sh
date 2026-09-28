#!/bin/sh
set -e

# Container entrypoint.
#
# Two things this has to get right:
#
#  1. The database is not necessarily up when we are. Compose waits for its health
#     check, but a plain `docker run` or an orchestrator that only waits for TCP will
#     not, and `set -e` would then kill the container before it ever started.
#  2. The schema has to exist before the app connects, because the app no longer
#     creates it: `dropSchema`/`synchronize` are off unless DB_RESET is set (see
#     src/config/database.config.ts). Migrations are the only supported way to build
#     a schema, and this is the only place in the container that runs them.

log() { echo "[entrypoint] $*"; }

wait_for_database() {
  attempts="${DB_WAIT_ATTEMPTS:-30}"
  i=0
  while [ "$i" -lt "$attempts" ]; do
    if node -e "
      const { Client } = require('pg');
      const c = new Client({
        host: process.env.DATABASE_HOST || 'localhost',
        port: +(process.env.DATABASE_PORT || 5432),
        user: process.env.DATABASE_USERNAME || 'postgres',
        password: process.env.DATABASE_PASSWORD || 'postgres',
        database: process.env.DATABASE_NAME || 'postgres',
        connectionTimeoutMillis: 2000,
      });
      c.connect().then(() => c.end()).then(() => process.exit(0)).catch(() => process.exit(1));
    " 2>/dev/null; then
      log "database is accepting connections"
      return 0
    fi
    i=$((i + 1))
    log "database not ready ($i/$attempts), retrying"
    sleep 2
  done
  log "ERROR: gave up waiting for the database after $attempts attempts"
  return 1
}

# ./logs and ./uploads are host bind mounts, so Docker creates them owned by root
# while this process runs as uid 1001 (nestjs). The image gets their ownership
# right, but a bind mount replaces that with the host directory's. Losing file
# logging is survivable, so warn with the fix instead of refusing to boot.
check_writable_dir() {
  dir="$1"
  fix="$2"
  if [ ! -d "$dir" ]; then
    mkdir -p "$dir" 2>/dev/null || true
  fi
  if [ -w "$dir" ]; then
    return 0
  fi
  log "WARNING: $dir is not writable by uid $(id -u); file output will be skipped."
  log "         Fix on the host with:  $fix"
}

wait_for_database

check_writable_dir /app/logs "mkdir -p logs && sudo chown 1001:1001 logs"
check_writable_dir /app/uploads "mkdir -p uploads && sudo chown 1001:1001 uploads"

if [ "${SKIP_MIGRATIONS:-}" = "true" ]; then
  log "SKIP_MIGRATIONS=true, not running migrations"
else
  log "running database migrations..."
  node_modules/.bin/typeorm migration:run -d dist/data-source.js
fi

log "starting application..."
exec node dist/main
