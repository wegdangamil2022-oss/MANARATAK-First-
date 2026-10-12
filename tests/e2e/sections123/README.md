# Sections 01–03 isolated acceptance

Scope: IAM/RBAC, Audit, EAP only. Browser scripts run the actual Admin UI with intercepted HTTP, not real authentication/API/DB/provider E2E. PostgreSQL suites use real transactions, synthetic records, and injected provider failures; no messages, payments, target databases, or real storage providers.

Use Node 22.16.0 (the project engine). `npm ci` generates Prisma without changing a database. Build project references before tests: `npm run typecheck`. The additional tests are separately typechecked with `npx tsc -p tests/e2e/sections123/tsconfig.json`.

## Disposable database preparation

**Before executing these commands, show them to the operator and explain that schema and three existing EAP guard migrations will be installed ONLY on a newly created disposable container. Do not use an existing database/container or substitute a remote URL.** Never automate this preparation inside a unit/browser test. The 2026-10-12 review showed the commands before applying them.

```bash
docker --host=unix:///var/run/docker.sock run -d --name manaratak-review-123-db \
  -p 127.0.0.1:55432:5432 \
  -e POSTGRES_USER=eap_ci -e POSTGRES_PASSWORD=eap_ci_disposable_only \
  -e POSTGRES_DB=manaratak_eap_ci_test postgres:16
export DATABASE_URL='postgresql://eap_ci:eap_ci_disposable_only@127.0.0.1:55432/manaratak_eap_ci_test?schema=public'
export DIRECT_URL="$DATABASE_URL"
export DATABASE_MUTATIONS_ALLOWED=true RUN_DATABASE_INTEGRATION_TESTS=true
export EAP_EPHEMERAL_DB_TESTS=true EAP_LOCAL_DISPOSABLE_DB_TESTS=true
npx --no-install prisma db push --schema=packages/infrastructure/prisma/schema.prisma --skip-generate
node tests/e2e/sections123/install-guards.mjs
```

These credentials are synthetic and intentionally fixed. New suites and installer reject any other URL before constructing Prisma. The legacy EAP serialization suite additionally accepts this exact URL only with the explicit local rehearsal flag; its existing CI URL remains supported. The GitHub-only installer remains unchanged.

## Database acceptance and volume

```bash
# Optional synthetic timings and EXPLAIN artifacts, not production SLA evidence.
export SECTION123_EVIDENCE_DIR="$PWD/docs/reviews/evidence/sections-01-03-20261012"
npx --no-install vitest run --config tests/e2e/sections123/vitest.config.mts
npx --no-install vitest run --config vitest.config.ts \
  packages/infrastructure/tests/asset-platform/PrismaAssetPostgres.database.spec.ts \
  packages/infrastructure/tests/asset-platform/PrismaAssetReferenceSerialization.database.spec.ts
```

The new suite throws if its environment is unsafe/missing; it does not silently skip. Volume fixtures: 100,000 audit rows with a 2,000-row filtered cursor export; 10,000 assets with 5,000 matching rows. Disposable fixtures are removed after tests. Existing EAP recovery tests intentionally retain unresolved synthetic operation holds; delete the entire disposable container after the review, not protected rows in a target database.

## Browser acceptance

Start Vite on loopback without HMR (avoids an unrelated dev WebSocket on port 443):

```bash
DISABLE_HMR=true npx --no-install vite --config apps/admin/vite.config.ts --host 127.0.0.1 --port 3013 --strictPort
# In another shell:
node tests/e2e/sections123/section01.browser.mjs
node --import tsx tests/e2e/sections123/section02.browser.mjs
node tests/e2e/section03-admin-isolated.mjs
node tests/e2e/sections123/section03.browser.mjs
```

`/usr/bin/chromium` is required (the existing Arabic EAP script also supports `EAP_CHROMIUM_PATH`). All HTTP to hosts other than 127.0.0.1 is aborted, every `/api` request is intercepted, and unexpected API paths fail. Dev CSP bypass is explicit in browser contexts; no deployed CSP/security acceptance is claimed.

Real scanner/sanitizer/object-store/CDN semantics, complete browser → authenticated API → DB → provider workflows, migration-chain rehearsal/backfill, production-like owner cardinalities/soak and approved governance remain separate gates. See the three dated requirement reports and command/result register under `docs/reviews`.
