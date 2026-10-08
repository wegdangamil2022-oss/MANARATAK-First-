# Section 01 — local verification evidence

Date: 2026-10-08. Baseline: `bac768e7fcd76e5702697760669449b39b0e2cca`.
Branch: `codex/section-01-iam-rbac`. Node: `24.19.0` (CI configuration: `22.16.0`).
These are source/mock/in-memory checks, not remote CI, browser integration, or real database evidence.

| Check | Result | Log |
| --- | --- | --- |
| Section 01 source tests | PASS: 115 tests, 22 files | [tests](section01-final-tests.log) |
| Repository TypeScript build check | PASS, exit 0, empty output | [typecheck](section01-full-typecheck.log) |
| Source quality gate | PASS: no dependency cycles or accessibility findings | [quality](section01-quality.log) |
| Selected source lint | PASS, 0 errors, 2 Audit Center warnings | [source lint](section01-lint.log) |
| Final changed source/test lint | PASS, 0 errors, 20 test typing warnings | [final lint](section01-final-delta-lint.log) |
| Source contracts | FAIL: three unchanged name-based relation guards; later stages not run | [contracts](section01-contracts.log) |
| Supporting audit regression | 24 passed, 3 Settings failures, 5 files | [audit regression](section01-audit-regression.log) |
| Same Settings cases at original commit | All 3 fail, 8 unrelated cases skipped by name filter | [baseline comparison](section01-baseline-settings-audit.log) |
| Authorization audit hooks in isolation | PASS: 3 tests, 8 unrelated cases skipped by name filter | [IAM audit](section01-iam-audit-hooks.log) |

## Commands

Executed from repository root with existing dependencies. No migrations, seeds, resets, production writes, payments, or real notifications.

```bash
node_modules/.bin/vitest run packages/application/tests/authorization packages/infrastructure/tests/authorization packages/infrastructure/tests/identity packages/shared/tests/authorization apps/api/tests/presentation/api/router/AuthorizationControlPlane.spec.ts apps/api/tests/presentation/api/router/AuthorizationDelegation.spec.ts apps/api/tests/presentation/api/router/AuthorizationAdminRouter.spec.ts apps/api/tests/presentation/security/RuntimeRbacAuthority.spec.ts apps/api/tests/presentation/validation/IdentityListQuery.spec.ts apps/admin/src/pages/AuthorizationAdminPage.spec.tsx apps/admin/src/pages/IdentityAdminPage.spec.tsx
node_modules/.bin/tsc -b
npm run quality:source
npm run ci:source:contracts
node_modules/.bin/vitest run packages/infrastructure/tests/audit apps/api/tests/audit/MutationAuditPolicy.spec.ts apps/api/tests/presentation/audit/AdminMutationAuditHooks.spec.ts
node_modules/.bin/vitest run apps/api/tests/presentation/audit/AdminMutationAuditHooks.spec.ts -t 'AuthorizationAdminRouter Audit Hooks'
node_modules/.bin/eslint packages/application/src/authorization/use-cases/AssignRoleUseCase.ts apps/api/src/presentation/api/router/AuthorizationAdminRouter.ts apps/api/tests/presentation/api/router/AuthorizationDelegation.spec.ts apps/api/tests/presentation/audit/AdminMutationAuditHooks.spec.ts packages/application/tests/authorization/AssignRoleAudit.spec.ts
git diff --check
```

Baseline comparison ran in a separate detached worktree at the exact baseline commit, with the same installed dependency directory:

```bash
node_modules/.bin/vitest run apps/api/tests/presentation/audit/AdminMutationAuditHooks.spec.ts -t 'SettingsAdminRouter Audit Hooks|primary operation succeeds even if auditRepo.save fails'
```

The independent baseline run establishes that the three Settings audit failures predate this patch; it does not resolve their cause or acceptance criteria. The contract guard files are unchanged relative to the baseline. See [implementation register](../../SECTION_01_IAM_RBAC_IMPLEMENTATION.md) for original task IDs, deferred dependencies, and runtime closure criteria.
