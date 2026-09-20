#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="${WPIC10_OUTPUT_DIR:-wp-ic-10-results}"
mkdir -p "$OUT_DIR"
: "${DATABASE_URL:?DATABASE_URL is required}"
if [[ "${WPIC10_ALLOW_DISPOSABLE_DB:-}" != "1" ]]; then
  echo "WPIC10_ALLOW_DISPOSABLE_DB=1 is required for database rehearsal." >&2
  exit 2
fi

node - "$DATABASE_URL" <<'NODE'
const url = new URL(process.argv[2]);
const db = url.pathname.replace(/^\//, '').toLowerCase();
const local = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
const disposable = /(test|ci|disposable|wpic10|wp_ic_10|wp-ic-10)/.test(db);
if (!local || !disposable) {
  console.error(`Refusing database rehearsal against non-disposable target: ${url.hostname}/${db}`);
  process.exit(2);
}
NODE

command -v psql >/dev/null || { echo "psql is required" >&2; exit 2; }
PG_URL="$(node - "$DATABASE_URL" <<'NODE'
const url = new URL(process.argv[2]);
url.searchParams.delete('schema');
console.log(url.toString());
NODE
)"

npx prisma validate --schema=packages/infrastructure/prisma/schema.prisma
npm run db:generate
export RUN_DATABASE_TESTS=true
export RUN_DATABASE_INTEGRATION_TESTS=true
export COURSE_PERSISTENCE_TEST_DATABASE_URL="$DATABASE_URL"
export COURSE_PERSISTENCE_TEST_DATABASE_IS_DISPOSABLE=true
export COURSE_PROVIDER_TEST_DATABASE_URL="$DATABASE_URL"
export COURSE_PROVIDER_TEST_DATABASE_IS_DISPOSABLE=true
npx prisma migrate deploy --schema=packages/infrastructure/prisma/schema.prisma
npx prisma migrate status --schema=packages/infrastructure/prisma/schema.prisma
npm run test:database
npx vitest run --config vitest.config.ts packages/application/tests/courses
node --test tests/imported-courses/*.test.mjs

MIGRATIONS="$(psql "$PG_URL" -Atqc 'SELECT count(*) FROM "_prisma_migrations";')"
COURSES="$(psql "$PG_URL" -Atqc 'SELECT count(*) FROM "Course";')"
PROVIDERS="$(psql "$PG_URL" -Atqc 'SELECT count(*) FROM "ExternalCourseProvider";')"

cat > "$OUT_DIR/DATABASE_REHEARSAL.json" <<JSON
{
  "version": 1,
  "kind": "database-rehearsal",
  "gitSha": "$(git rev-parse HEAD)",
  "generatedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "pass": true,
  "detail": "reviewed migrations, database integration, and imported-course integration passed on disposable PostgreSQL",
  "migrations": $MIGRATIONS,
  "coursesAfterTests": $COURSES,
  "providersAfterTests": $PROVIDERS
}
JSON

echo "WP-IC-10 database rehearsal PASS"
