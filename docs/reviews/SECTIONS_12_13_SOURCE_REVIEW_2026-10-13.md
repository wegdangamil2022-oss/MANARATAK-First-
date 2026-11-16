# Plan sections 12–13 — source review, repairs and lightweight evidence

Date: 2026-10-13. Repository `wegdangamil2022-oss/MANARATAK-First-`. Clean starting tree; fetched main `fce81dbb`; isolated branch `codex/review-sections-12-13-20261013`. Earlier sections 10–11 were already pushed to `codex/complete-sections-10-11-source-20261013` at `0e226a16`; verified remote reference. No main merge or deployment in this round.

**Numbering correction:** plan section 12 is Study Destinations; section 13 is Learning & Courses. Historical `SECTION_12_LEARNING_*` and `SECTION_13_CERTIFICATES_*` reports refer to different numbering. They were read as historical context, not proof that these current plan sections are complete. Existing source was inspected rather than relying on prior success claims.

Requirements: [section 12 — 26 STD + 2 FGA](SECTION_12_SOURCE_REVIEW_2026-10-13.md); [section 13 — 28 CRS + 2 FGA](SECTION_13_SOURCE_REVIEW_2026-10-13.md). All **58 IDs** have code links, classification and remaining boundary. Neither section is claimed fully complete.

## Delivered source

- Strict evidence authoring rejects caller verification timestamps/identity. Server verification records actual independent reviewer, time, reason, reviewed origins and SHA256 facts fingerprint; last editor cannot self-approve. Current matching proof is mandatory for publication/public delivery. Evidence/image/featured changes clear proof and demote published content; unchanged approved evidence retains its server stamp, not a forged caller stamp.
- StudyDestination mutations bind to existing atomic business/audit/outbox executor, country owner lock, expected revision and review reason; no nested transaction when bound. UI supplies reason/version and displays source reviewer proof. Public DTO now explicitly excludes administrative proof/evidence/audit/internal profile ID and reference metadata; active canonical references are required. Publication rechecks image trust/public rights/classification/MIME through P3.
- Featured countries use actual live featured profiles and canonical IDs; static countries/counts/stock thumbnails removed. Bilingual admission/visa list readiness, corrected official-link category serialization, typed monthly local-currency range, page-scoped admin metric labels and readiness missing-section queue added. Native batch lookup removes per-country profile N+1. Country graph advances real University/Scholarship cursors with an explicit 25-page budget; cross-owner canonical links preserve Scholarship country URL selection.
- Added Learning Path admin list/editor before `/courses/:id`; native canonical picker, prerequisites/required flags, stable sequence, review/reason/version and read-only published state. Missing draft PATCH owner contract writes a new immutable path version through the existing atomic command. Module/lesson edit/archive/up/down controls call existing ID-preserving versioned owner routes and refuse outstanding drafts/published structure edits.
- Imported course free-study/certificate/access/provider/raw study facts now require controlled import instead of generic editor writes. Provider/domain preflight explicitly says `verified:false`, `preflightPassed:true`, `NOT_RECORDED`; it cannot masquerade as a persisted human approval. Stable admin offset sort adds unique ID tie-breaker. New course API policy separates missing/conflict/precondition/infra/validation/auth and hides raw internal failures.
- Historical learning paths now read title/description/order/completion logic from the enrollment's ORIGINAL version snapshot. New create/draft/status snapshots carry these facts. Legacy snapshots missing original facts fail closed, requiring separately governed reconciliation; no guessed historical policy/backfill was written.

Source commits: `11d67a85` (owner/UI repairs), `5923e1ca392ff054f0a26465173979e67ad5b721` (historical path facts), `76b2a6aa` (course error policy). Report/evidence commit follows these.

## Commands and actual results

Original logs: `evidence/sections-12-13-review-20261013/`. Every target below ran **once**. No test failed; no existing earlier-round file was rerun. Tests use local synthetic records, repository/executor doubles and in-memory Express; no DB/browser/provider/payment/notification activity.

| Command / scope | Observed result | Evidence / tested tree |
|---|---|---|
| `npx prisma generate --schema packages/infrastructure/prisma/schema.prisma` | PASS, generated Prisma 5.22.0 client | `sections12-13-generate-once.log`; local generation only, no migration/connection |
| `npx tsc -b packages/infrastructure apps/api apps/admin apps/web --pretty false` | **FAIL: 2 application diagnostics** | `sections12-13-types-once.log`: impossible IN_REVIEW/PUBLISHED comparison and public country type requiring internal lifecycle fields. Corrected source, **not rerun**. This preceded subsequent atomic/UI/history/error changes; no final semantic or whole-project PASS claimed |
| `npx vitest run packages/application/tests/study-destinations/StudyDestinationReviewBoundary.spec.ts packages/application/tests/read-models/BudgetedOwnerCursorPage.spec.ts packages/application/tests/courses/LearningPathDraftAuthoring.spec.ts` | PASS: **18 tests / 3 files**, 1.88s | `sections12-13-light-once.log`; uncommitted tree based on fce81dbb, later committed in 11d67a85. Later proof preservation/atomic additions have their own targeted evidence, not a rerun of this batch |
| `npx vitest run apps/api/tests/presentation/api/router/StudyDestinationAdminProofContract.spec.ts packages/application/tests/study-destinations/StudyDestinationAtomicBoundary.spec.ts` | PASS: **8 tests / 2 files**, 1.90s | `sections12-13-api-atomic-once.log`; uncommitted base fce81dbb → 11d67a85 |
| `npx vitest run packages/application/tests/courses/ImportedCourseSourceAuthoringBoundary.spec.ts` | PASS: **15 tests / 1 file**, 1.21s | `sections12-13-imported-once.log`; uncommitted base fce81dbb → 11d67a85 |
| `npx vitest run packages/application/tests/study-destinations/StudyDestinationEvidenceRetention.spec.ts` | PASS: **2 tests / 1 file**, 1.23s | `sections12-13-evidence-retention-once.log`; preservation/caller timestamp correction before 11d67a85 |
| `npx vitest run packages/infrastructure/tests/courses/LearningPathHistoricalFactsBoundary.spec.ts` | PASS: **2 tests / 1 file**, 1.25s | `sections12-13-history-once.log`; base 11d67a85 plus uncommitted history fix → 5923e1ca |
| `npx vitest run apps/api/tests/presentation/api/router/CourseAdminErrorPolicyBoundary.spec.ts` | PASS: **6 tests / 1 file**, 0.161s | `sections12-13-course-errors-once.log`; base 5923e1ca plus uncommitted policy → 76b2a6aa |
| Changed-file `typescript.transpileModule` syntax-only script | PASS: **34 files, 0 syntax errors** | `sections12-13-syntax-once.log`; before late proof display/preservation, historical reader and error policy. Not semantic type correctness or final-tree check |
| `npx prettier --write apps/admin/src/pages/LearningPathsAdminPage.tsx packages/application/src/read-models/BudgetedOwnerCursorPage.ts` | PASS | `sections12-13-format-once.log`; only these new files |
| `node scripts/architecture/generate-di-reachability-manifest.mjs` | PASS: **399 registrations/reachable** | `sections12-13-di-once.log`; source graph only |
| Targeted `buildAuditInventory(...)` extraction/update | New path PATCH and 5 StudyDestination mutations classified **CRITICAL_AUDIT_REQUIRED** | `sections12-13-audit-source.log`; keeps separate owner-runtime evidence requirement; no global audit suite run |
| `git diff --check` | PASS for source fixes | Whitespace check, not test/runtime evidence |

Total: **51 distinct lightweight tests passed in 9 files**. They certify only their described mock/source contracts. There was no single combined final-tree rerun. The final public-image classification option and other tiny later UI changes were source-inspected; no repeated TypeScript/test run was used to claim blanket coverage. No unrelated sections 24–28 checks ran.

## Historical remaining source work before continuation — superseded below

The matrices list every gap. Particularly:

- Study Destinations: P3 approved image delivery/display, P7 cities, complete locale/static suitability copy, progressive public country discovery, batch public reference reads/fully scalable readiness queue, full append-only proof/version history, configurable freshness policy and finer editorial/reviewer/publication permissions. Legacy USD-named prototype contract remains while live detail prefers explicit currency.
- Learning/Courses: **CRS-ADM-003 live provider/domain/link public eligibility is still a critical code gap**. Full durable imported source approval/invalidation, immutable owner assessment-required policy (CRS-ADM-011), archive/unpublish entitlement contract, admission/waitlist control plane, protected media streaming, progressive public course discovery, permission separation, complete translation/dirty/conflict/backlog reconciliation remain. UI existence is not closure of these owner policies.
- Shared historical 15 architecture findings remain recorded; this round does not claim to close them.

## Source-only migration and activation limits

Migration source: `packages/infrastructure/prisma/migrations/20261013030000_study_destination_review_proof/migration.sql` adds `lastEditedBy` and `sourceReviewProof`. **UNAPPLIED / NOT_RUNTIME_SAFE against databases lacking these columns**. No existing database was altered, no temporary database created, no legacy approval or historical facts backfilled. Recovery manifest uses `BACKUP_RESTORE_REQUIRED`; preserve real review evidence during recovery, not guessed down-SQL.

Later isolated preparation would require a disposable empty PostgreSQL database and test-only credentials, with no production/provider access. Proposed command, **not executed**:

```sh
DATABASE_URL='<isolated-disposable-postgresql-url>' npx prisma migrate deploy --schema packages/infrastructure/prisma/schema.prisma
```

It must be shown/authorized as a separate database test setup before execution; this round made no such request because all executed checks are independent of a database. Actual transactions/rollback/concurrency, migration/recovery, native query totals and public graph cursors, permissions/sessions, assets, providers, AR/EN/browser/E2E/load and Student/P14 consumers remain deferred, not successful. Legacy published destinations without independent current proof and historical paths without original snapshot facts require genuine review/reconciliation after authorized isolated activation. No production readiness, deployment or main merge is asserted.


## Continuation delivered at source commit `1cc3b204`

Branch remains `codex/review-sections-12-13-20261013`; base was `ae857a30`. No main merge. This continuation implements the source/UI changes recorded in the current per-section requirement tables; the earlier 51-test/399-registration observations above are historical, not results rerun on this source commit.

Section 12 now has bounded live country search/pages, canonical active-city pages/UI, P3-approved signed image delivery/cards/detail, bulk canonical reference resolution, immutable same-transaction revision/proof/diff history, an administrative nullable evidence freshness policy, and distinct edit/review/publication route permissions. Actual original actor/time is stored; no legacy approval/history or policy duration was invented.

Section 13 now has immutable independent source approvals with version/author/fact/provider/current-link checks and optional explicit expiry. Shared native catalogue/related-owner trust predicates cover rows/count and original version changes; detail and external launch recheck current eligibility. Manual pending/waitlist admission has owner API/UI, optimistic guards, independent actor/reason and actual finance/prerequisite/capacity checks. Withdrawal uses explicit original enrollment entitlement; current root publication check no longer silently defeats honor-after-withdrawal. Active quizzes cannot be skipped by an editorial false flag. Public search reads a bounded first page and cursor navigation; learner media uses browser-compatible signed delivery/MIME without full blob preloading. Course form preserves optional policy facts, signals dirty state and avoids false success after failed post-action reload. Review/publish/unpublish/archive/admission permissions are separate server guards, not UI hiding alone.

### One-time checks, exact scope and failures

Evidence: [`evidence/sections12-13-continuation-2026-10-13/`](evidence/sections12-13-continuation-2026-10-13/). All commands ran on the continuation worktree based on `ae857a30`, subsequently committed as `1cc3b204`; they were not run again against the final commit. Late detail freshness/search-anchor, dirty/readiness/form-preservation and additional withdrawal/review route guards were source-inspected, not certified by a repeated broad check.

| Command / check | Actual result | Evidence / limits |
|---|---|---|
| `npx prisma generate --schema packages/infrastructure/prisma/schema.prisma` | PASS, client 5.22.0, 1.81s | `sections12-13-continuation-generate.log`; generates client only, no database or migration applied |
| Single TypeScript `createSourceFile` syntax-diagnostic script over continuation files | PASS, 58 TS/TSX files | `sections12-13-continuation-syntax.log`; syntax only at that worktree stage, before later fixes |
| `timeout 45s node /workspace/scratch/sections12-13-continuation-types.cjs` | PASS, 15 new source files, 0 reported diagnostics | `sections12-13-continuation-types.log` and copied `new-files-types-check.cjs`; excludes dependency and modified-file diagnostics; **not full-project TypeScript PASS** |
| `npx vitest run packages/domain/tests/courses/ContinuationCompletionAndEvidencePolicy.spec.ts packages/application/tests/courses/ContinuationSourceReviewCommand.spec.ts packages/infrastructure/tests/courses/ContinuationTrustedCatalogBoundary.spec.ts packages/application/tests/study-destinations/ContinuationPublicDestinationEnrichment.spec.ts` | **16 PASS, 4 FAIL**, 4 files, 3.81s | `sections12-13-continuation-light.log`. All four native catalogue contract cases stopped before useful assertions: runtime `COURSE_SOURCE_FACT_KEYS` was undefined because `@manaratak/domain` resolved old `dist/index.js`. Root Vitest alias now points to current domain `src/index.ts`; **fixed but not rerun**, four cases remain unverified |
| `npx vitest run packages/infrastructure/tests/courses/ContinuationSourceApprovalPersistence.spec.ts packages/infrastructure/tests/courses/ContinuationAdmissionDecisions.spec.ts packages/application/tests/courses/ContinuationWithdrawnEnrollmentAccess.spec.ts` | **16 PASS**, 3 files, 2.50s | `sections12-13-continuation-owner-tests.log`; actual new gateway/access functions exercised with isolated in-memory doubles. No SQL/database/finance provider called |
| `node scripts/architecture/generate-di-reachability-manifest.mjs` | PASS, 406 registered and reachable | `sections12-13-continuation-di.log`; source graph generation, no runtime DI integration |
| Targeted `buildAuditInventory(...)` extraction | 430 mounted mutation handlers recorded | `sections12-13-continuation-audit.log`; source artifact update, not a repeated global audit test. Added final withdrawal/reject route permission evidence reconciled directly |
| `git diff --check` | PASS at source stage | Whitespace only, no behavioral verification |

Continuation total: **32 passed / 4 failed** across **36 distinct lightweight cases / 7 files**, each run once. The failure cause was corrected without rerunning failed cases. Existing 51 tests, full TypeScript, integration, heavy and browser/E2E suites were not repeated. No production database, real provider, notification, payment or sections 24–28 test suite used.

### Remaining source work — explicit and not disguised as runtime proof

The current requirement tables retain partial states. This is substantial source completion, **not complete closure of either section**:

- Section 12: STD-ADM-010 reusable country/official-authority approved-origin/exception governance; STD-ADM-017 fully database-native bounded administrative readiness/NO_PROFILE query; STD-ADM-014 remaining canonical locale keys/shared controls; STD-ADM-022 remaining generic suitability/opportunity presentation must be replaced by actual owner facts or explicit unavailability. Freshness configuration does not create a retention/destructive cleanup policy.
- Section 13: CRS-ADM-025 complete per-field conflict/rebase and browser-history navigation/small-screen editor loading; CRS-ADM-026 stable provider changed-link/backlog checkpoint/retry/dead-letter reconciliation beyond bounded scans; CRS-ADM-016/027 complete canonical Arabic/English keys/editor contract/source-language disclosure. Existing configured custom eligibility rules still require an actual evaluation gateway and fail closed; no rules/evaluator was invented.
- Native SQL, locking/rollback/concurrency, actual RBAC/roles, storage browser-compatible bridge, HTTP/browser/locale and large dataset behavior remain operationally unproved. Four corrected catalogue cases are separately unverified. Shared historical 15 architecture findings remain unchanged.

### Source-only migration delta / activation limits

New unapplied sources:

- `20261013040000_course_source_approvals`: actual immutable independent source approvals, indexed course/version/review history; no fake approval/author backfill.
- `20261013050000_study_destination_history_policy`: destination append-only revision/proof timeline and singleton nullable freshness policy; no invented historical events/durations.

Together with earlier unapplied `20261013030000_study_destination_review_proof`, these make source **NOT_RUNTIME_SAFE on a database lacking the new structures**. Migration recovery metadata records backup/forward-fix recovery, no destructive down SQL. No migration applied, existing database altered, or temporary DB created. The isolated setup command shown above remains **not executed** and must be presented before any later authorized disposable database setup.

Legacy course versions lacking the true original actor and original enrollment withdrawal policy, learning paths lacking original historical facts, and destinations lacking real independent proof require governed genuine reconciliation. Role grants and browser-compatible storage bridge must be deliberately configured later; source changes do not certify production readiness.
