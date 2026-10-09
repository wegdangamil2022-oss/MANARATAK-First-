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
- `previous-ci.json`: GitHub Actions run 37869788764, commit `8eb794b67d3c7efe90206ee6f6059fb72d4b1cee`, completed successfully before this continuation. Retrieved logs confirmed 120 source tests and 10 disposable PostgreSQL tests. This result does not validate subsequent commits. The pushed continuation is independently verified below.

**Current CI:** run [37872775726](https://github.com/wegdangamil2022-oss/MANARATAK-First-/actions/runs/37872775726) completed SUCCESS at source commit `6e60a15702ae3e0eec7246ed6d6f32a3f6ad7c53`: 184 source tests + 10 disposable PostgreSQL tests, TypeScript/quality/audit guard PASS. See `current-ci.json` and `current-ci-summary.txt`. This scoped workflow does not run or clear the three global source contract violations. The subsequent evidence-only commit changes no tested source.

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

## Activation recovery and retention continuation (based on 12f05da)

- `recovery-tests.log`: **187 passed /19 files**, 11 disposable DB tests intentionally skipped locally. Scope is EAP domain/application/infrastructure, lifecycle/error/finalization/reuse API contracts and Admin action contract; it differs from the earlier 220-test selection and overlaps it.
- `recovery-typecheck.log`: project graph PASS, exit 0; compilation completed before the final test run.
- `recovery-quality.log`: zero cycles/a11y findings, PASS.
- `recovery-lint.log`: selected six source files, 0 errors/48 warnings (existing repository/router typing). No whole-repository lint claim.
- `recovery-guards.log`: 13 Node source/transport/audit guards PASS. `recovery-coverage.log`: PASS, 319 handlers/318 endpoints.
- `recovery-contracts.log`: same three global name-based relationship violations; coverage guard passes, later pipeline stages did not run.
- A new disposable PostgreSQL test checks persisted PREPARED intent, failed post-move save, rehydration and completion under the same operation ID. It must pass on the pushed commit's CI before any real-DB claim for this continuation.
- Existing historical source/CI/browser evidence is preserved; no browser/provider runtime test was run for this recovery continuation. No migration/schema change/backfill, external provider write, retention sweep or production DB mutation was executed locally.
- See [current contract](../../../operations/ASSET_LIFECYCLE_RECOVERY.md). Events are local non-dispatched artifacts; no production outbox/notification functionality is claimed.

Final test command (after `tsc -b`):

```bash
node_modules/.bin/vitest run packages/domain/tests/asset-platform packages/application/tests/asset-platform packages/infrastructure/tests/asset-platform apps/api/tests/presentation/api/router/AssetPlatformRouter.spec.ts apps/api/tests/presentation/api/router/AssetPlatformErrorContract.spec.ts apps/api/tests/presentation/api/router/AssetFinalizationContract.spec.ts apps/api/tests/presentation/api/router/AssetReuseRouter.spec.ts apps/admin/src/components/AssetLifecycleActions.spec.tsx
```

**Recovery CI verified:** [run 37875453856](https://github.com/wegdangamil2022-oss/MANARATAK-First-/actions/runs/37875453856), source commit `3be1ab760bb346d6d1cf8c19b32f81c5c3572761`, completed SUCCESS: **190 source tests + 11 disposable PostgreSQL tests**. The source job includes three usage API tests in addition to the local selection. TypeScript, source quality and audit inventory/security guards passed. See `recovery-ci.json` and `recovery-ci-summary.txt`. Provider operations remain mocked in the PostgreSQL tests; these prove DB persistence/recovery semantics, not real object-store atomicity. The evidence-only follow-up changes no tested code.

## Broad workspace + restore-ownership operation, final proof

Matching source `1c4b92c`, [CI 37924185138](https://github.com/wegdangamil2022-oss/MANARATAK-First-/actions/runs/37924185138) SUCCESS: **211 source +14 disposable PostgreSQL tests**. See `workspace-final-ci.json` and `workspace-final-ci-summary.txt`.

`workspace-tests.log`: earlier workspace slice, 209 PASS /13 DB skipped, 32.35s. `restore-delta-tests.log`: later overlapping 49 focused application/error tests PASS, 8.28s. Do not add these counts together. `workspace-types.log`: incremental Admin/API/infrastructure PASS. `workspace-lint.log`: final six-source-file selection 0 errors/53 warnings; previous implementation narrative retains earlier four-file 51-warning scope. `workspace-quality.log`: 0 cycles/a11y PASS; `workspace-guards.log`: 13 source/transport guards PASS; `workspace-coverage.log`: 319 handlers/318 endpoints PASS. `workspace-browser.log`: real Chromium/Admin with intercepted HTTP only; governance/history, workspace facets/cursor/reset, failed reset and retry PASS. No real API/DB/provider browser E2E; dev HMR disabled/test-only CSP bypass, server stopped afterward.

The two version/facet PostgreSQL cases passed at workspace `2632dde` (209+13); the final restore-ownership DB regression passed on `1c4b92c` (211+14). Provider operations are mocked. Section remains NOT CLOSED for the explicit source/runtime gates in the closure register. Evidence-only final update changes no tested source.

## Opt-in activation recovery worker

Source `333ef99`, [CI 37930553854](https://github.com/wegdangamil2022-oss/MANARATAK-First-/actions/runs/37930553854) SUCCESS: **240 source/config tests +15 disposable PostgreSQL tests**. Counts include newly selected AppConfig tests; do not add overlapping prior totals. New DB case verifies only old SANITIZING/PREPARED candidates are discovered and ACTIVE is excluded. Providers remain mocked. See `worker-ci.json`/`worker-ci-summary.txt`.

Local `worker-tests.log`: 43 focused tests /3 files PASS in 3.04s; real worker-registry dispatch with mocked durable queue and owner provider, audit fail-before-effects/outcome-failure, disabled old jobs, strict payload/limits, stale intent, cancellation and safe diagnostics. `worker-types.log`: TypeScript API/infrastructure graph with dependencies PASS. `worker-lint.log`: selected six source files 0 errors/38 warnings. `worker-quality.log`: 0 cycles/a11y PASS. `worker-guards.log`: five existing durable worker/lease source guards PASS. No real job/cron/bootstrap, DB seed/migration, external provider mutation or runtime flag change executed locally. Default disabled configuration is source behavior, not a claim that any production instance was changed.

Section remains NOT CLOSED / NO-GO. Operational limitations and how opt-in scheduling works are documented in ASSET_LIFECYCLE_RECOVERY.md; this is not an atomic provider/DB/audit or complete fleet reconciliation guarantee.


Owner-reference trust continuation: `owner-trust-types.log` (empty success), `owner-trust-tests.log` (60 focused PASS), `owner-trust-guards.log` (15 Node PASS), `owner-trust-lint.log` (empty success), `owner-trust-quality.log` (PASS). Focused counts overlap later source CI and must not be added. No runtime provider or cross-owner serialization evidence is inferred.

`owner-trust-all.log`: complete scoped source suite 252 PASS /15 disposable DB cases intentionally skipped locally in 48.33s; matching pushed CI pending.

Matching owner-reference trust CI [37933260168](https://github.com/wegdangamil2022-oss/MANARATAK-First-/actions/runs/37933260168) SUCCESS at `c6fecfe`: 252 source +15 disposable PostgreSQL PASS; owner guards, TypeScript, quality, audit/provider checks PASS. See `owner-trust-ci.json` and `owner-trust-ci-summary.txt`. No real provider acceptance or whole-section CLOSED claim.
