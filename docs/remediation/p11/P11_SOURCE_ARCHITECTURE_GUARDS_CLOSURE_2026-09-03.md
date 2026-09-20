# P11 — Source & Architecture Guards Closure

**Date:** 2026-09-03  
**Status:** **SOURCE CLOSED / RUNTIME PENDING**  
**Scope:** Repair-plan P11 only — automated regression guards for the source relationships and authority boundaries closed through P10.  
**Authority:** Roadmap v6.0, active Cross-Phase Relationship Closure Matrix, and P1 authority-aligned architecture models.

## Closure principle

P11 does not move ownership or create a new domain. It converts the architectural rules already closed in P0–P10 into executable source gates. A future change that violates a protected boundary must fail before merge instead of relying on a reviewer to remember the rule.

## Automated guards added

- **Prisma boundary:** production Prisma access is rejected outside `packages/infrastructure/src/**`, except the API composition root that constructs the shared client.
- **Canonical identity:** relationship lookup by display `name` / `label` / `title` equality is rejected in relationship-sensitive Admin/Public/Application paths; Scholarship live composition is also protected from synthetic cross-domain IDs.
- **P24 live data:** `MOCK_*`, `GOLDEN_IMPORTED_COURSES`, mock imports and prototype-adapter leaks are rejected from the live public composition path. Prototype data remains available only through the explicit dynamic prototype-mode switch.
- **P15 live state:** `localStorage` is rejected from Student Workspace / Student Tools live source paths.
- **P23 control plane:** Admin cannot import Prisma/Infrastructure/Application persistence paths or instantiate repositories/direct SQL.
- **P17 AI authority:** AI vendor SDK imports, vendor endpoints and provider-secret markers are rejected outside the P17 `ai-platform` source boundary.
- **P13/P14 certificate authority:** certificate generation/issuance calls are rejected from P13 Learning; P13 completion-event authority markers and the P14 completion consumer are asserted.
- **Roadmap/registry ownership:** authoritative Roadmap v6.0 / Ownership Matrix / API Registry / Event Catalog / Bounded Context authority markers are asserted so key ownership drift fails the source gate.
- **Cross-phase matrix contract:** R-001→R-068 must remain present and cannot regress to `Missing`.
- **Circular dependencies:** the existing source-quality SCC gate is executed alongside P11 and currently reports zero package cycles and zero file cycles.

## Real violation repaired while adding the guard

The Public University detail view previously recovered canonical Major/Test navigation by finding a link whose display `label` matched a rendered source string. P11 repaired this before closing the gate:

- University Major navigation now iterates canonical `majorLinks` directly when they exist and calls `onOpenMajor(majorId)`.
- University accepted-test navigation now iterates canonical `acceptedTestLinks` directly when they exist and calls `onOpenExam(examId)`.
- Source labels remain display/provenance text only; they are no longer used to resolve the relationship identity.

## Guard contract tests

`tests/architecture/source-architecture-guard-contracts.test.mjs` contains negative fixtures proving that the guard rejects:

1. Prisma outside Infrastructure.
2. display-label relationship equality.
3. live Public mock data.
4. P15 `localStorage` state.
5. P23 persistence/Application bypass imports.
6. AI vendor access outside P17.
7. certificate generation inside P13.

These tests use Node's built-in test runner and need no database or installed workspace dependencies.

## CI integration

`.github/workflows/source-architecture-guards.yml` runs on `main`, pull requests, and manual dispatch when protected source/authority files change. The job runs:

1. source architecture/static-security guard,
2. negative guard contract tests,
3. circular dependency/source-quality gate.

No database connection is required for this workflow.

## Runtime boundary

P11 is a source/CI guard stage. It does not apply migrations, seed a database, call AI providers, or prove deployed runtime behavior. Database-backed integration/E2E/runtime checks remain **Runtime Pending** for P12/runtime handoff.

## Closure decision

P11 is **SOURCE CLOSED / RUNTIME PENDING** when the dedicated architecture guard, negative guard tests, source-quality/cycle gate, P7–P10 plan verifiers, and affected source regressions are all green. No live migration is required and none is executed.

## Final source verification — 2026-09-03

Final source-only verification after the guard implementation and the University label-lookup repair produced:

- `P11_PLAN_CLOSURE=119/119` and `P11_SOURCE_CLOSED=YES`.
- `SOURCE_ARCHITECTURE_GUARD=PASS`.
- Negative architecture guard contracts: **7/7 pass, 0 fail**.
- Source quality / circular dependency gate: **0 package cycles, 0 file cycles, 0 covered accessibility findings**.
- P7 = **16/16 PASS**.
- P8 = **54/54 PASS**.
- P9 = **97/97 PASS**.
- P10 = **96/96 PASS** after making its active-matrix assertion forward-compatible with P11 v1.6.0.
- P4 cross-domain read models = **64/64 PASS**.
- W1 = **30/30 PASS**, W2 = **23/23 PASS**, W3 = **31/31 PASS**.
- W12 = **14/14 PASS**, W13 = **13/13 PASS**, W14 = **14/14 PASS**.
- Phase 15 = **14/14 PASS**, Phase 15/16 closure = **13/13 PASS**, Phase 16 = **22/22 PASS**.
- Phase 17 = `PHASE17_SOURCE_READY=YES` in a temporary local Git metadata directory; the verifier was tightened to scan production `apps/*/src` and `packages/*/src` for direct provider imports so P11's intentional negative fixture is not misclassified as production code. The temporary `.git` directory was removed immediately after verification.
- Phase 18 and Phase 19 source verifiers = **PASS**.
- WP7 Admin control-plane verifier = **PASS**.
- Modified Public University TSX syntax/transpile check = **1/1 PASS**.

P11 intentionally does not claim a full workspace typecheck/build because that belongs to P12 and requires the complete installed workspace dependency/type environment. Existing compiled `dist` artifacts are not treated as P11 runtime proof and were not regenerated. No database migration, seed, or live database mutation was executed.
