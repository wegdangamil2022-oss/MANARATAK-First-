# Imported Courses Runtime Runbook — WP-IC-10R1

## Pre-Google-Studio boundary

There is no PostgreSQL requirement during code preparation. Pre-handoff closure means source, schema validation/client generation, build, unit, security, and parser-memory gates pass. Database integration, backup/restore, browser E2E, and runtime smoke are prepared in the repository but are executed only after Google Studio provides PostgreSQL and starts the runtime.


## Purpose
This runbook closes the imported-course runtime after WP-IC-09. It does not introduce a second import architecture or bypass Phase 06 staging / WP-IC-05 controlled transfer.

## Pre-deployment gates
1. Clean checkout at the accepted WP-IC-10 baseline or later reviewed commit.
2. `npm ci`.
3. `npx prisma validate --schema=packages/infrastructure/prisma/schema.prisma`.
4. `npm run db:generate`.
5. `npm run typecheck`.
6. `npm run lint`.
7. `npm run build`.
8. `npm run test:unit`.
9. `node --test tests/imported-courses/*.test.mjs`.
10. `node scripts/wp-ic-10-runtime-closure.mjs security --repo-root .`.
11. `node scripts/wp-ic-10-runtime-closure.mjs memory --rows 3663`.
12. Do **not** require PostgreSQL, backup/restore, or browser E2E for pre-handoff acceptance. Those gates are deferred to Google Studio.
13. Handoff after all source/code gates pass. Google Studio then connects PostgreSQL, executes DB integration and backup/restore rehearsal, starts the services, runs browser E2E, and finally runs runtime smoke.

Run the imported-course browser evidence producer only after the runtime is available:

`node scripts/wp-ic-10-browser-e2e.mjs wp-ic-10-results`

## Runtime invariants
- Imported-course admin APIs remain authenticated and permission-gated.
- Course transfer never auto-publishes.
- URL changes update the same stable Course identity after review; they do not create a new Course merely because a URL changed.
- Provider/domain mismatch and source drift halt staging.
- Automated acquisition uses only registered connectors.
- Link-health jobs remain bounded and rate-safe.
- Provider headquarters country is never inferred as a course study country.

## Staging smoke
```bash
node scripts/wp-ic-10-runtime-closure.mjs smoke \
  --base-url https://staging.example.org \
  --output-dir wp-ic-10-results
```
Provide `WPIC10_AUTHORIZATION` only when an approved admin credential is available; authenticated checks are additive.

## Closure
Before handoff, collect only `CI_CLOSURE.json`, `SECURITY_AUDIT.json`, and `LARGE_FILE_MEMORY.json`, then run:
```bash
node scripts/wp-ic-10-runtime-closure.mjs finalize --phase source --results-dir wp-ic-10-results
```
A `CODE_COMPLETE_READY_FOR_GOOGLE_STUDIO_INTEGRATION` result authorizes Google Studio to connect PostgreSQL and execute the deferred runtime gates. After DB integration, backup/restore, browser E2E, and `RUNTIME_SMOKE.json` all pass, run:
```bash
node scripts/wp-ic-10-runtime-closure.mjs finalize --phase runtime --results-dir wp-ic-10-results
```
The runtime state must then become `GOOGLE_STUDIO_RUNTIME_VERIFIED`.
