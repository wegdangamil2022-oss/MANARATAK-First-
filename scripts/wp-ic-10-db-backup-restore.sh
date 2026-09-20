#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="${WPIC10_OUTPUT_DIR:-wp-ic-10-results}"
mkdir -p "$OUT_DIR"
: "${DATABASE_URL:?DATABASE_URL is required}"
if [[ "${WPIC10_ALLOW_DISPOSABLE_DB:-}" != "1" ]]; then
  echo "WPIC10_ALLOW_DISPOSABLE_DB=1 is required for backup/restore rehearsal." >&2
  exit 2
fi
for bin in psql pg_dump pg_restore; do command -v "$bin" >/dev/null || { echo "$bin is required" >&2; exit 2; }; done

URL_OUTPUT="$(node - "$DATABASE_URL" <<'NODE'
const input = new URL(process.argv[2]);
const db = input.pathname.replace(/^\//, '');
const local = ['localhost', '127.0.0.1', '::1'].includes(input.hostname);
const disposable = /(test|ci|disposable|wpic10|wp_ic_10|wp-ic-10)/i.test(db);
if (!local || !disposable) {
  console.error(`Refusing backup/restore rehearsal against non-disposable target: ${input.hostname}/${db}`);
  process.exit(2);
}
const suffix = `wpic10_restore_${process.pid}`;
const restoreDb = `${db}_${suffix}`.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 60);
const admin = new URL(input); admin.pathname = '/postgres';
const restore = new URL(input); restore.pathname = `/${restoreDb}`;
const source = new URL(input); source.searchParams.delete('schema');
admin.searchParams.delete('schema');
restore.searchParams.delete('schema');
console.log(source.toString());
console.log(admin.toString());
console.log(restore.toString());
console.log(restoreDb);
NODE
)"
mapfile -t URLS <<< "$URL_OUTPUT"
SOURCE_URL="${URLS[0]}"
ADMIN_URL="${URLS[1]}"
RESTORE_URL="${URLS[2]}"
RESTORE_DB="${URLS[3]}"
DUMP_FILE="$(mktemp -t wpic10-XXXXXX.dump)"

cleanup() {
  psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${RESTORE_DB}' AND pid <> pg_backend_pid();" >/dev/null 2>&1 || true
  psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"${RESTORE_DB}\";" >/dev/null 2>&1 || true
  rm -f "$DUMP_FILE"
}
trap cleanup EXIT

pg_dump "$SOURCE_URL" --format=custom --no-owner --no-privileges --file="$DUMP_FILE"
psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"${RESTORE_DB}\";" >/dev/null
pg_restore --no-owner --no-privileges --exit-on-error --dbname="$RESTORE_URL" "$DUMP_FILE"

TABLES=("_prisma_migrations" "ExternalCourseProvider" "Course" "ImportBatch" "ImportRecord" "CourseSourceIdentity")
for table in "${TABLES[@]}"; do
  original="$(psql "$SOURCE_URL" -Atqc "SELECT count(*) FROM \"$table\";")"
  restored="$(psql "$RESTORE_URL" -Atqc "SELECT count(*) FROM \"$table\";")"
  if [[ "$original" != "$restored" ]]; then
    echo "Backup/restore count mismatch for $table: original=$original restored=$restored" >&2
    exit 3
  fi
done

BYTES="$(wc -c < "$DUMP_FILE" | tr -d ' ')"
cat > "$OUT_DIR/BACKUP_RESTORE_REHEARSAL.json" <<JSON
{
  "version": 1,
  "kind": "backup-restore-rehearsal",
  "gitSha": "$(git rev-parse HEAD)",
  "generatedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "pass": true,
  "detail": "pg_dump/pg_restore round-trip preserved required imported-course tables",
  "dumpBytes": $BYTES,
  "tablesCompared": ["_prisma_migrations", "ExternalCourseProvider", "Course", "ImportBatch", "ImportRecord", "CourseSourceIdentity"]
}
JSON

echo "WP-IC-10 backup/restore rehearsal PASS"
