#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export XDG_DATA_HOME="${XDG_DATA_HOME:-/workspace/.local/share}"
pnpm install --frozen-lockfile --store-dir /workspace/.pnpm-store
if [ ! -f .env ]; then cp .env.example .env; fi
if [ ! -e apps/web/.env.local ]; then ln -s ../../.env apps/web/.env.local; fi
docker compose -p buildspace up -d --wait
# Cloud snapshots may retain this private backup while Docker volumes are rebuilt.
if [ -s /workspace/.buildspace/onboarding-db.sql ]; then
  buildspace_missing=$(docker compose -p buildspace exec -T postgres psql -U buildspace -d buildspace -tAc "SELECT to_regclass('public.\"Project\"') IS NULL")
  if [ "$buildspace_missing" = "t" ]; then
    docker compose -p buildspace exec -T postgres psql -v ON_ERROR_STOP=1 -U buildspace -d buildspace < /workspace/.buildspace/onboarding-db.sql > /workspace/.buildspace/restore.log
  fi
fi
pnpm db:generate
pnpm db:migrate
pnpm typecheck
pnpm test
