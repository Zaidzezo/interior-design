#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p /workspace/.buildspace
chmod 700 /workspace/.buildspace
umask 077
docker compose -p buildspace exec -T postgres pg_dump -U buildspace -d buildspace --clean --if-exists > /workspace/.buildspace/onboarding-db.sql.tmp
test -s /workspace/.buildspace/onboarding-db.sql.tmp
mv /workspace/.buildspace/onboarding-db.sql.tmp /workspace/.buildspace/onboarding-db.sql
