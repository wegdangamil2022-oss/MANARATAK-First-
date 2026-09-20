#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

SCHEMA="packages/infrastructure/prisma/schema.prisma"
MIGRATIONS="packages/infrastructure/prisma/migrations"
PRISMA_BIN="node_modules/.bin/prisma"
OUT_DIR="${GREENFIELD_VERIFY_OUTPUT_DIR:-greenfield-db-verification}"
TARGET_URL="${GREENFIELD_DATABASE_URL:-}"
SHADOW_URL="${GREENFIELD_SHADOW_DATABASE_URL:-}"

[[ -n "$TARGET_URL" ]] || { echo 'GREENFIELD_DATABASE_URL is required' >&2; exit 2; }
[[ -n "$SHADOW_URL" ]] || { echo 'GREENFIELD_SHADOW_DATABASE_URL is required' >&2; exit 2; }
[[ "${GREENFIELD_DATABASE_IS_DISPOSABLE:-}" == "true" ]] || { echo 'GREENFIELD_DATABASE_IS_DISPOSABLE=true is required' >&2; exit 2; }
[[ "${GREENFIELD_SHADOW_DATABASE_IS_DISPOSABLE:-}" == "true" ]] || { echo 'GREENFIELD_SHADOW_DATABASE_IS_DISPOSABLE=true is required' >&2; exit 2; }
[[ -x "$PRISMA_BIN" ]] || { echo 'Prisma CLI is not installed locally. Run npm ci; this verifier never downloads tooling implicitly.' >&2; exit 2; }
command -v psql >/dev/null || { echo 'psql is required for catalog parity checks' >&2; exit 2; }

node - "$TARGET_URL" "$SHADOW_URL" "${GREENFIELD_ALLOW_NONLOCAL_DISPOSABLE:-false}" <<'NODE'
const [targetRaw, shadowRaw, allowNonlocal] = process.argv.slice(2);
const disposableName = /(test|ci|disposable|greenfield|verify|rehearsal)/i;
const forbiddenName = /(prod|production|live)/i;
const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
function check(raw, label) {
  const url = new URL(raw);
  if (!/^postgres(?:ql)?:$/.test(url.protocol)) throw new Error(`${label}_NOT_POSTGRESQL`);
  const db = url.pathname.replace(/^\//, '');
  if (!db || !disposableName.test(db) || forbiddenName.test(db)) throw new Error(`${label}_DATABASE_NAME_NOT_DISPOSABLE:${db}`);
  if (!localHosts.has(url.hostname) && allowNonlocal !== 'true') throw new Error(`${label}_NONLOCAL_REQUIRES_GREENFIELD_ALLOW_NONLOCAL_DISPOSABLE=true`);
  return `${url.hostname}/${db}`;
}
const target = check(targetRaw, 'TARGET');
const shadow = check(shadowRaw, 'SHADOW');
if (targetRaw === shadowRaw) throw new Error('TARGET_AND_SHADOW_MUST_DIFFER');
console.log(`GREENFIELD_TARGET=${target}`);
console.log(`GREENFIELD_SHADOW=${shadow}`);
NODE

mkdir -p "$OUT_DIR"
export DATABASE_URL="$TARGET_URL"

"$PRISMA_BIN" validate --schema="$SCHEMA"
"$PRISMA_BIN" migrate deploy --schema="$SCHEMA"
"$PRISMA_BIN" migrate status --schema="$SCHEMA"

# The replayed database must be structurally identical to the canonical datamodel.
"$PRISMA_BIN" migrate diff \
  --from-url "$TARGET_URL" \
  --to-schema-datamodel "$SCHEMA" \
  --exit-code > "$OUT_DIR/replayed-db-to-schema.diff.sql"

# Independently evaluate the checked-in migration chain using a disposable shadow database.
"$PRISMA_BIN" migrate diff \
  --from-migrations "$MIGRATIONS" \
  --to-schema-datamodel "$SCHEMA" \
  --shadow-database-url "$SHADOW_URL" \
  --exit-code > "$OUT_DIR/migrations-to-schema.diff.sql"

EXPECTED_MIGRATIONS="$(find "$MIGRATIONS" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')"
APPLIED_MIGRATIONS="$(psql "$TARGET_URL" -Atqc 'SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL;')"
[[ "$APPLIED_MIGRATIONS" == "$EXPECTED_MIGRATIONS" ]] || {
  echo "Migration ledger mismatch: expected=$EXPECTED_MIGRATIONS applied=$APPLIED_MIGRATIONS" >&2
  exit 1
}

INVALID_INDEXES="$(psql "$TARGET_URL" -Atqc "SELECT count(*) FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT i.indisvalid;")"
UNVALIDATED_CONSTRAINTS="$(psql "$TARGET_URL" -Atqc "SELECT count(*) FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public' AND NOT c.convalidated;")"
UNEXPECTED_USER_SCHEMAS="$(psql "$TARGET_URL" -Atqc "SELECT count(*) FROM pg_namespace WHERE nspname NOT IN ('public','information_schema') AND nspname NOT LIKE 'pg_%';")"
[[ "$INVALID_INDEXES" == "0" ]] || { echo "Invalid indexes detected: $INVALID_INDEXES" >&2; exit 1; }
[[ "$UNVALIDATED_CONSTRAINTS" == "0" ]] || { echo "Unvalidated constraints detected: $UNVALIDATED_CONSTRAINTS" >&2; exit 1; }
[[ "$UNEXPECTED_USER_SCHEMAS" == "0" ]] || { echo "Unexpected user schemas violate ADR-028: $UNEXPECTED_USER_SCHEMAS" >&2; exit 1; }

psql "$TARGET_URL" -Atqc "
SELECT json_build_object(
  'tables', (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'),
  'foreignKeys', (SELECT count(*) FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public' AND c.contype='f'),
  'uniqueConstraints', (SELECT count(*) FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public' AND c.contype='u'),
  'checkConstraints', (SELECT count(*) FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public' AND c.contype='c'),
  'indexes', (SELECT count(*) FROM pg_indexes WHERE schemaname='public')
);" > "$OUT_DIR/postgres-catalog-summary.json"

cat > "$OUT_DIR/GREENFIELD_MIGRATION_PARITY.json" <<JSON
{
  "version": 1,
  "kind": "greenfield-migration-parity",
  "pass": true,
  "expectedMigrations": $EXPECTED_MIGRATIONS,
  "appliedMigrations": $APPLIED_MIGRATIONS,
  "invalidIndexes": $INVALID_INDEXES,
  "unvalidatedConstraints": $UNVALIDATED_CONSTRAINTS,
  "unexpectedUserSchemas": $UNEXPECTED_USER_SCHEMAS,
  "adr": "ADR-028"
}
JSON

echo "GREENFIELD_MIGRATION_PARITY=PASS migrations=$APPLIED_MIGRATIONS"
