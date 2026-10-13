# Sections 10 and 11 — source changes and lightweight checks (2026-10-13)

Plan: `docs/reviews/MANARATAK_ADMIN_REVIEW_CODEX.md`, section 10 **Universities & Institutions / P11** and section 11 **Scholarships / P12**. Base fetched from `origin/main`: `fce81dbb`. Clean starting tree; independent branch `codex/complete-sections-10-11-source-20261013`. Existing other-chat fixes were retained; no main merge performed in this round.

Requirement mapping: [section 10](SECTION_10_SOURCE_COMPLETION_2026-10-13.md) (23 UNI + 3 FGA requirements); [section 11](SECTION_11_SOURCE_COMPLETION_2026-10-13.md) (30 SCH + 3 FGA requirements). These tables distinguish source implementation from operational proof and identify code gaps. Original October 10 implementation/check reports are preserved rather than overwritten.

## Source delivered

- Owner programme catalogue/API/UI with canonical search/filter, count, ID keyset pagination and published-only public programme dependencies. Study language IDs come from P7; mode/delivery/duration/eligibility have explicit unknown values and official evidence. Public programme detail/filter UI consumes owner DTOs.
- Programme application intakes with stable IDs, applicant segment, UTC instants and IANA timezone, verification/source, date ordering and window classification. Mutations use server actor, reason, root revision, existing atomic audit/outbox coordinator and identity-preserving owner persistence. Published root is immutable until controlled unpublish. No event delivery or notification was started.
- University root search no longer locally discards server matches; canonical geography/type and stable sorting; debounce/cancellation; public links only for published roots. Initial public catalogue is bounded to 25, with progressive cursor navigation/server search rather than automatic full-catalogue collection.
- Scholarship canonical selectors/dependent programme reset and URL state; owner-backed verification/source/sponsor/translation filters, actual locale-content semantics, stable deadline/update/completeness sort. Canonical country filtering cannot be bypassed by label fallback; university/program filters intersect on the same relationship. Year-round/undated results follow dated deadlines.
- Scholarship UI no longer substitutes zero summary for unavailable data or claims fixed 100% approval. Audit unavailable is shown explicitly. Public university nested optional fields and URLs use strict projection boundaries.
- Updated generated DI reachability, administrative mutation audit inventory and source-only migration recovery manifest for new owner handlers/schema.

Source commits: `174e44367c994ebc533c17414423def28a12e59d`, then `224a0e85` (late health/audit UI correction). Documentation commit follows these. No tests were represented as running against the final documentation commit.

## Commands actually run, once per test target

Evidence: `evidence/sections-10-11-completion-20261013/` contains original logs. Tests ran in this branch's uncommitted working tree based on `fce81dbb`; that tree was subsequently committed as `174e4436`, with later additions noted below. There was no failed test or repeated test target.

| Command | Result | Limit |
|---|---|---|
| `npx prisma generate --schema packages/infrastructure/prisma/schema.prisma` | PASS; generated client | Local generation only, no DB/migration |
| `npx tsc -b packages/infrastructure apps/api apps/admin apps/web --pretty false` | PASS, exit 0; empty output log | Executed before late search/geography/progressive-root/detail/SQL-field/DTO metadata refinements. Do not claim final-tree typecheck |
| `npx vitest run packages/domain/tests/universities/ProgramWorkspaceBoundary.spec.ts packages/infrastructure/tests/scholarships/ScholarshipListSourceBoundary.spec.ts packages/application/tests/universities/UniversityPublicationExtraBoundary.spec.ts apps/api/tests/presentation/api/router/ProgramWorkspaceSourceContract.spec.ts` | PASS: 4 files, 22 tests | Pure domain/mock repository/public projection/injected API; no native DB or browser |
| `npx vitest run packages/infrastructure/tests/universities/ProgramWorkspacePersistenceBoundary.spec.ts` | PASS: 1 file, 4 tests | Mock published-root/stale revision/P7 language/intake-owner persistence boundaries |
| `npx vitest run apps/web/src/features/public-template/UniversityProgressiveLoading.spec.ts` | PASS: 1 file, 1 test | Mock loader proves first-page bounded loading, not browser scale/paging E2E |
| `npx prettier --write` on eight newly added owner/UI files | PASS | Syntax/format only; not compilation or runtime |
| `node scripts/architecture/generate-di-reachability-manifest.mjs` | PASS: 402 registrations, 402 reachable | Source graph, not live DI resolution |
| `buildAuditInventory(...)` source extraction | Two new PUT handlers classified `CRITICAL_AUDIT_REQUIRED`, permission `admin:universities:manage` | Inventory retains `OWNER_VERIFICATION_REQUIRED`; no real DB audit/outbox proof |
| `git diff --check` | PASS on implementation changes | Whitespace only |

Total: **27 distinct lightweight tests in 6 files passed**. Existing earlier-round suites were not rerun. TypeScript passed for the intermediate source tree; late changes were inspected manually without rerunning it, respecting the user's no-repeat instruction. SQL column inspection caught and corrected `DegreeLevel.isActive` to the actual `status = 'ACTIVE'` contract; SQL was not executed, so native-query correctness remains unproved.

## Database boundary and deferred operational proof

New migration source: `packages/infrastructure/prisma/migrations/20261013020000_university_program_workspace/migration.sql`. Creates study/language/intake tables, restrictive FKs and date/duration constraints. No migration or DB command was applied. Recovery manifest marks `BACKUP_RESTORE_REQUIRED`; no destructive guessed down-script/backfill is supplied.

**MIGRATION_UNAPPLIED / NOT_RUNTIME_SAFE** for the new programme API against databases lacking these tables. This branch must not be deployed before isolated migration/runtime validation and a separately authorized deployment. No temporary database was created in this round, and no migrations were silently applied.

Deferred, not successful: isolated PostgreSQL migration/recovery, native filter/count/keyset queries and JSON translation predicates; publication interleaving/CAS/audit/outbox/idempotency rollback; DB EXPLAIN/load; browser AR/EN/forms/accessibility and permissions; Student programme-fact consumption/event delivery. None was run due the explicit current lightweight-only scope. Production data/providers were not used. No unrelated sections 24–28 tests were run.

## Remaining code/UX gaps (not merely proof)

- **UNI-ADM-014**, with history portions of 001/011: existing source/readiness facts do not provide the full unified field-source comparison and verification/history decision workspace.
- **SCH-ADM-025**: existing bounded audit/source evidence is not a redacted version/field/child-key diff timeline or rollback preview. Missing audit now displays an explicit notice.
- **UNI-ADM-021**: bounded server search/cursor UX added, but public geographic facets are explicitly limited to the loaded page, not a global owner facet query.
- **FGA-10-003 downstream Student matching**: owner/public programme facts added; no automatic Student matching consumer was introduced. Intake atomic event payload is present; downstream event delivery was not implemented/proved here.
- **UNI-ADM-018**: bulk operations remain deliberately deferred under the plan's explicit allowance when operational demand is absent.

These gaps mean sections 10 and 11 are **not claimed fully complete**. Shared 15 previously documented architectural violations remain outside these owner changes; this report does not close them. Main merge, deployment and database application were not performed.
