#!/bin/sh
set -eu

cd /app

echo "[entrypoint] Running pending migrations…"
node scripts/typeorm-migration-dist.cjs run

echo "[entrypoint] Starting API…"
exec node dist/src/main.js
