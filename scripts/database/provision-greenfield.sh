#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

: "${GREENFIELD_DATABASE_URL:?GREENFIELD_DATABASE_URL is required}"
export DATABASE_URL="$GREENFIELD_DATABASE_URL"

npm run db:greenfield:verify
npm run db:seed
npm run db:provision:verify

echo "GREENFIELD_PROVISIONING=PASS"
