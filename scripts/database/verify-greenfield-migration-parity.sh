#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

SCHEMA="packages/infrastructure/prisma/schema.prisma"
MIGRATIONS="packages/infrastructure/prisma/migrations"
PRISMA_BIN="node_modules/.bin/prisma"
OUT_DIR="${GREENFIELD_VERIFY_OUTPUT_DIR:-}"
[[ -n "$OUT_DIR" ]] || { echo 'GREENFIELD_VERIFY_OUTPUT_DIR must be a fresh absolute path outside Git' >&2; exit 2; }
TARGET_URL="${GREENFIELD_DATABASE_URL:-}"
SHADOW_URL="${GREENFIELD_SHADOW_DATABASE_URL:-}"

[[ -n "$TARGET_URL" ]] || { echo 'GREENFIELD_DATABASE_URL is required' >&2; exit 2; }
[[ -n "$SHADOW_URL" ]] || { echo 'GREENFIELD_SHADOW_DATABASE_URL is required' >&2; exit 2; }
[[ "${GREENFIELD_DATABASE_IS_DISPOSABLE:-}" == "true" ]] || { echo 'GREENFIELD_DATABASE_IS_DISPOSABLE=true is required' >&2; exit 2; }
[[ "${GREENFIELD_SHADOW_DATABASE_IS_DISPOSABLE:-}" == "true" ]] || { echo 'GREENFIELD_SHADOW_DATABASE_IS_DISPOSABLE=true is required' >&2; exit 2; }
[[ -x "$PRISMA_BIN" ]] || { echo 'Prisma CLI is not installed locally. Run npm ci; this verifier never downloads tooling implicitly.' >&2; exit 2; }
command -v psql >/dev/null || { echo 'psql is required for catalog parity checks' >&2; exit 2; }

export DATABASE_URL="$TARGET_URL"
export DIRECT_URL="$TARGET_URL"
node --input-type=module - <<'NODE'
import fs from 'node:fs';
import { requireDatabaseMutationGate } from './scripts/lib/database-mutation-gate.mjs';
import { requirePost28LocalExecution } from './scripts/database/post28-neon-policy.mjs';
const contract=JSON.parse(fs.readFileSync(process.env.POST28_TARGET_CONTRACT_FILE,'utf8'));
requirePost28LocalExecution(contract);
requireDatabaseMutationGate('post28 greenfield replay', { allowedPurposes: ['migrate'] });
NODE

# Reject credential/loopback aliases with TARGET_AND_SHADOW_MUST_DIFFER and
# independently recheck server/database/role/bootstrap marker before any migration.
# Targets containing prod|production|live|restore are refused by the shared policy.
node scripts/database/post28-preflight.mjs --pair --require-empty

node --input-type=module - "$OUT_DIR" <<'NODE'
import fs from 'node:fs';
import path from 'node:path';
const output=process.argv[2];
const root=fs.realpathSync(process.cwd());
if(!path.isAbsolute(output))throw new Error('POST28_EVIDENCE_ABSOLUTE_PATH_REQUIRED');
const parent=fs.realpathSync(path.dirname(output));
if(parent===root || parent.startsWith(root+path.sep))throw new Error('POST28_EVIDENCE_OUTSIDE_CHECKOUT_REQUIRED');
fs.mkdirSync(path.join(parent,path.basename(output)),{mode:0o700});
NODE

"$PRISMA_BIN" validate --schema="$SCHEMA"
"$PRISMA_BIN" migrate deploy --schema="$SCHEMA"
"$PRISMA_BIN" migrate status --schema="$SCHEMA"

# The replayed database must be structurally identical to the canonical datamodel.
# Connection URLs stay in environment/private Node memory, never OS arguments.
# The wrapper uses --from-schema-datasource and --to-schema-datamodel for replay;
# A fresh DB-S deploy + exact ledger replaces automatic --from-migrations /
# --shadow-database-url reset, which requires prohibited database CREATE privileges.
node scripts/database/prisma-env-diff.mjs replayed > "$OUT_DIR/replayed-db-to-schema.diff.sql"
node scripts/database/prisma-env-diff.mjs migrations > "$OUT_DIR/migrations-to-schema.diff.sql"

EXPECTED_MIGRATIONS="$(find "$MIGRATIONS" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')"
APPLIED_MIGRATIONS="$(node scripts/database/post28-psql.mjs -Atqc 'SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL;')"
[[ "$APPLIED_MIGRATIONS" == "$EXPECTED_MIGRATIONS" ]] || {
  echo "Migration ledger mismatch: expected=$EXPECTED_MIGRATIONS applied=$APPLIED_MIGRATIONS" >&2
  exit 1
}

# Count equality cannot detect a substituted name/checksum or a partial attempt.
LEDGER_SQL='SELECT COALESCE(json_agg(row_to_json(ledger) ORDER BY started_at,id), json_build_array()) FROM (SELECT id,migration_name,checksum,started_at,finished_at,rolled_back_at,applied_steps_count FROM "_prisma_migrations") ledger;'
node scripts/database/post28-psql.mjs -Atqc "$LEDGER_SQL" > "$OUT_DIR/migration-ledger.json"
node scripts/database/verify-post28-migration-ledger.mjs "$OUT_DIR/migration-ledger.json" > "$OUT_DIR/migration-ledger-comparison.json"

# Re-deploy must not append/rewrite any migration record or reapply SQL effects.
node scripts/database/post28-preflight.mjs --pair
"$PRISMA_BIN" migrate deploy --schema="$SCHEMA"
node scripts/database/post28-psql.mjs -Atqc "$LEDGER_SQL" > "$OUT_DIR/migration-ledger-after-redeploy.json"
node scripts/database/verify-post28-migration-ledger.mjs "$OUT_DIR/migration-ledger-after-redeploy.json" > "$OUT_DIR/migration-ledger-after-redeploy-comparison.json"
cmp -s "$OUT_DIR/migration-ledger.json" "$OUT_DIR/migration-ledger-after-redeploy.json" || {
  echo 'Migration ledger changed after repeated deploy' >&2; exit 1;
}


INVALID_INDEXES="$(node scripts/database/post28-psql.mjs -Atqc "SELECT count(*) FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT i.indisvalid;")"
UNVALIDATED_CONSTRAINTS="$(node scripts/database/post28-psql.mjs -Atqc "SELECT count(*) FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public' AND NOT c.convalidated;")"
UNEXPECTED_USER_SCHEMAS="$(node scripts/database/post28-psql.mjs -Atqc "SELECT count(*) FROM pg_namespace WHERE nspname NOT IN ('public','information_schema') AND nspname NOT LIKE 'pg_%';")"
[[ "$INVALID_INDEXES" == "0" ]] || { echo "Invalid indexes detected: $INVALID_INDEXES" >&2; exit 1; }
[[ "$UNVALIDATED_CONSTRAINTS" == "0" ]] || { echo "Unvalidated constraints detected: $UNVALIDATED_CONSTRAINTS" >&2; exit 1; }
[[ "$UNEXPECTED_USER_SCHEMAS" == "0" ]] || { echo "Unexpected user schemas violate ADR-028: $UNEXPECTED_USER_SCHEMAS" >&2; exit 1; }

node scripts/database/post28-psql.mjs -Atqc "
SELECT json_build_object(
  'tables', (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'),
  'foreignKeys', (SELECT count(*) FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public' AND c.contype='f'),
  'uniqueConstraints', (SELECT count(*) FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public' AND c.contype='u'),
  'checkConstraints', (SELECT count(*) FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public' AND c.contype='c'),
  'indexes', (SELECT count(*) FROM pg_indexes WHERE schemaname='public')
);" > "$OUT_DIR/postgres-catalog-summary.json"

node --input-type=module - "$OUT_DIR" "$EXPECTED_MIGRATIONS" "$APPLIED_MIGRATIONS" "$INVALID_INDEXES" "$UNVALIDATED_CONSTRAINTS" "$UNEXPECTED_USER_SCHEMAS" <<'NODE'
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const [directory,expected,applied,indexes,constraints,schemas]=process.argv.slice(2);
const ledger=JSON.parse(fs.readFileSync(path.join(directory,'migration-ledger-comparison.json'),'utf8'));
const result={version:1,kind:'greenfield-migration-parity',pass:true,sourceSha:ledger.sourceSha,
  migrationChainSha256:ledger.chainSha256,
  ledgerSha256:createHash('sha256').update(fs.readFileSync(path.join(directory,'migration-ledger.json'))).digest('hex'),
  expectedMigrations:Number(expected),appliedMigrations:Number(applied),invalidIndexes:Number(indexes),
  unvalidatedConstraints:Number(constraints),unexpectedUserSchemas:Number(schemas),idempotentRedeployVerified:true,
  requiredSeedStatus:'NOT_EXECUTED_BY_THIS_VERIFIER',adr:'ADR-028'};
fs.writeFileSync(path.join(directory,'GREENFIELD_MIGRATION_PARITY.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
NODE

echo "GREENFIELD_MIGRATION_PARITY=PASS migrations=$APPLIED_MIGRATIONS"
