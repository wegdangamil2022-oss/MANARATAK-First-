# P12 — Full Source CI Closure

**Date:** 2026-09-03  
**Status:** **SOURCE CI CONTRACT CLOSED / REMOTE EXECUTION PENDING**  
**Scope:** Repair-plan P12 only — consolidate all source-level gates before any live DB/runtime proof.

## What P12 closes

P12 makes the general CI path fail closed on the same source rules that were previously split across several workflows. The `source-quality` job in `.github/workflows/ci.yml` now requires, after `npm ci`:

1. source quality/cycle/accessibility gate,
2. P11 architecture/static-security guards,
3. W0–W16 remediation source contracts,
4. P7–P11 plan-closure verifiers,
5. Prisma schema `validate` + client `generate` through a no-connection source gate,
6. root TypeScript project-reference typecheck,
7. repository lint,
8. workspace build,
9. unit/source integration tests only,
10. the P12 CI-contract verifier itself.

There is no `if` condition that skips a source gate when the database is absent.

## Real CI-classification repair

Before P12, several database-specific Vitest specs were still discoverable by the normal unit configuration and relied on `describe.skip`, connection timeout/fallback behavior, or missing environment variables. P12 classifies those specs explicitly:

- DB-backed specs are excluded from `vitest.config.ts`.
- The same runtime DB specs are included by `vitest.database.config.ts`.
- `PrismaCredentialIntegration.spec.ts` and `CheckDbE2E.spec.ts` are now explicitly classified with the database suite.

The source unit gate therefore does not “pass because PostgreSQL was missing”; DB proof is listed separately as Runtime Pending.

## Prisma source gate

`scripts/ci/prisma-source-gate.mjs` invokes only Prisma `validate` and `generate`. It sets a syntactically valid CI-only `DATABASE_URL`, disables mutation/runtime-test flags, and never connects to PostgreSQL or runs a migration/push command. Missing installed Prisma dependencies fail the gate instead of downloading tools implicitly.

## Local execution evidence

The supplied source package does not contain a complete root `node_modules`. A deterministic offline `npm ci --ignore-scripts` cannot complete because required locked tarballs such as `superagent-9.0.2` are not available in the sandbox cache. Therefore this package does **not fabricate** local success for `tsc`, ESLint, Vite/esbuild, Vitest or Prisma CLI execution. Those commands are mandatory in GitHub CI after `npm ci`; their remote execution remains pending until this source is pushed/run in an environment with dependency access.

## Runtime boundary

The only deliberately deferred checks are listed in `P12_RUNTIME_PENDING_CHECKS.md` and require a real database/runtime/browser environment. No migration, seed, DB mutation, E2E run, or external-provider call is performed during P12 source closure.

## Final packaging verification

- P12 plan/CI contract verifier: **188/188 PASS**.
- P11: **119/119 PASS**; P10: **96/96 PASS**; P9: **97/97 PASS**; P8: **54/54 PASS**; P7: **16/16 PASS**.
- Cross-domain read models: **64/64 PASS**.
- W0–W16 remediation runner: **17/17 verifiers PASS**; W0: **34/34 PASS** after making its historical Phase 4.17 line-ending check platform-safe and retaining the explicit `quality:source` CI gate.
- P15, P15/16, P16, P18 and P19 source verifiers: **PASS**.
- P17: `PHASE17_SOURCE_READY=YES` using temporary local Git metadata; the temporary `.git` directory is removed before packaging.
- Source architecture guard: **PASS**; source quality: **0 package cycles / 0 file cycles**.
- GitHub workflow YAML parses successfully; P12 JavaScript gate/verifier scripts pass Node syntax checks.

### Dependency-backed gate status

A complete local dependency tree is unavailable in the packaging sandbox. `typecheck`, ESLint, workspace build, Vitest unit execution and Prisma CLI validate/generate are therefore **mandatory remote source-CI executions**, not locally asserted successes. The locked CI path runs them after `npm ci`, without a database service and without DB/E2E skips.

This is why P12 is **SOURCE CI CONTRACT CLOSED / REMOTE EXECUTION PENDING**, not a fabricated claim that GitHub `main` has already produced a green run from an unpushed ZIP. Final P13 certification must consume the actual remote CI result.
