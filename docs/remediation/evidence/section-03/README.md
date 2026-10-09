# Section 03 continuation evidence — 2026-10-09

Work resumed from `148255694ab115383736ff2d97397719f8f9f3a1` on `codex/section-01-iam-rbac`. The original remediation attachment remains unchanged (SHA256 `9de7c781eb82cd490fc85386267d7e9e3fe2b2028803f9ecd0351531e2cd11fc`).

- `tests-final.log`: 220 passed, 23 files; 10 disposable database tests intentionally skipped locally. Includes EAP, API lifecycle/reuse/finalization, Admin command, IAM catalog/control-plane and Audit query regressions. The last upload-confirmation UI guard is covered again in `final-delta-tests.log`; do not add overlapping counts.
- `typecheck.log`: TypeScript project graph, exit 0, empty output.
- `quality.log`: zero cycles/a11y findings, PASS.
- `lint.log`: selected modified UI/router/inventory files, zero errors, 18 warnings (existing router `any`/hook conventions).
- `source-guards.log`: 13 passing Node tests (audit inventory + existing audit/security + W3 signed-provider transport).
- `contracts.log`: coverage guard PASS, 319 handlers/318 endpoints. Global source contract gate still fails on the same three pre-existing name-based relations in Scholarship detail/list and public CoursesSearchPage; subsequent stages not run.
- `browser.log`: real Chromium exercises the real Admin UI with HTTP intercepted, test-only fixtures. No database or provider is connected. Confirms gated actions, validate/sanitize/activate requests, in-use archive prevention, explicit impact confirmation, pending filters, applied query+cursor and deduplication.
- Browser was run against Vite development with `DISABLE_HMR=true` and a test context `bypassCSP:true`: the development React refresh preamble otherwise fails under the existing CSP. This is UI behavior evidence, **not deployed CSP or provider end-to-end acceptance**. The failed initial checks are described in the register; no production security header was weakened.
- `previous-ci.json`: GitHub Actions run 37869788764, commit `8eb794b67d3c7efe90206ee6f6059fb72d4b1cee`, completed successfully before this continuation. Retrieved logs confirmed 120 source tests and 10 disposable PostgreSQL tests. This result does not validate subsequent commits. Source CI for the pushed continuation must be checked separately.

Commands from repository root (TypeScript before package-importing tests):

```bash
node_modules/.bin/tsc -b
node_modules/.bin/vitest run packages/domain/tests/asset-platform packages/application/tests/asset-platform packages/infrastructure/tests/asset-platform apps/api/tests/presentation/api/router/AssetReuseRouter.spec.ts apps/api/tests/presentation/api/router/AssetUsageImpact.spec.ts apps/api/tests/presentation/api/router/AssetPlatformErrorContract.spec.ts apps/api/tests/presentation/api/router/AssetFinalizationContract.spec.ts apps/api/tests/presentation/api/router/AssetPlatformRouter.spec.ts apps/admin/src/components/AssetLifecycleActions.spec.tsx packages/shared/tests/authorization/adminPermissionCatalog.spec.ts apps/api/tests/presentation/api/router/AuthorizationControlPlane.spec.ts apps/api/tests/audit/AuditSearchAndExport.spec.ts
node --test tests/security/admin-audit-coverage.test.mjs tests/security/audit-integrity-remediation-source.test.mjs tests/remediation/w3-asset-provider.test.mjs
npm run quality:source
npm run ci:source:contracts
DISABLE_HMR=true node_modules/.bin/vite --config apps/admin/vite.config.ts --host 127.0.0.1 --port 3013
node tests/e2e/section03-admin-isolated.mjs
git diff --check
```

No local DB migration/reset/seed/sweep or external object-store operation was executed. The existing branch CI uses its disposable PostgreSQL service; it is not a production connection. Provider/browser/operational gates and unresolved source durability contracts still block CLOSED/GO.
