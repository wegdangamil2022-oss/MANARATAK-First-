# Section 12 — Learning — check log

Date: 2026-10-10. Branch: `codex/section-12-learning`. Base: `889761b`.

## Executed lightweight checks

1. Bounded Vitest run once: `timeout 45s node node_modules/vitest/vitest.mjs run --config .section12-vitest.config.ts`.
   Selected seven files: CourseCurriculumUseCases, CourseProgressUseCases, NativeCourseUseCases, PublicCourseUseCases, CourseSourcePublicationGate, application Section12Governance and API Section12Governance.
   **37/37 tests PASS, 7/7 files PASS, 3.56 seconds.** Includes stale-editor blocking, business/version/audit/outbox commit and rollback, committed-response buffering, real reviewer identity, learning-path cycles and enrollment-version pinning. No earlier section tests were repeated.
2. Syntax-only transpile check once: **23 selected TS/TSX source files, zero syntax errors**, under one second. This was before imported follow-up additions and is not a final semantic type result.
3. Follow-up Vitest run once, only two newly added files: `.section12-followup-vitest.config.ts`.
   **6/6 tests PASS, 2/2 files PASS, 1.96 seconds.** Covers bound curriculum without nested transaction, duplicate reorders, forged progress labels, actual creation identity in event/audit metadata, imported owner CAS and committed version headers.
   Combined distinct light test cases: **43 PASS / 0 FAIL**. No unchanged test suite rerun.
4. Selected changed-file semantic check once, bounded to 45 seconds: `/tmp/manaratak-section12-typecheck.cjs` builds an in-memory noEmit TS program with source aliases, reports diagnostics only for selected changed files, and excludes dependency diagnostics.
   **8 diagnostics observed:** undefined University client `method`; two unused baseline DI imports; two CourseAdminScope cradle type mismatches; response-discriminator closure narrowing; two unused error-handler parameters. All corrected by source inspection, **no rerun**. No claim of final type-check PASS or whole-project type correctness.

Raw logs are preserved under `evidence/section-12/` (quick-tests, followup-tests, selected-types). Temporary test configs and dependency symlink were removed after execution.

## Deferred

No database calls or applied schema changes; no Prisma generation, full build, heavy suite, browser/E2E, external provider execution, load testing, deployment or main merge. Runtime role/CSRF verification, real transactions/concurrency, adapter activation, full semantic typing and actual UI checks remain deferred. Manual grading/assignment workflow source implementation is recorded in the continuation below; runtime acceptance remains deferred.

Final whitespace check: `git diff --check` PASS once after source corrections, before commit. This check does not establish runtime or semantic type correctness.


## Assignment/manual-review continuation after 681bac4

- One bounded Vitest invocation, only new `Section12Assessments.spec.ts` and `Section12AssessmentReview.spec.ts`: **23/23 PASS, 2/2 files, 4.38 seconds**. Submission ownership, written answers, rubric bounds, pending completion gate, resumable attempts, server reviewer identity, immutable rubric scoring, stale/duplicate grading, bound row-lock rejection, business/audit/outbox rollback, response buffering and private metadata projection are covered with source doubles. No database/provider/browser was accessed.
- No previous test file was repeated. Recorded distinct passing cases across rounds: **66**, not certification of a combined final-tree run.
- One selected-file noEmit semantic check: **13 diagnostics**. Six unused CourseAdminRouter imports, two unused legacy service-query parameters and one unused React import were corrected. Four missing Express `authUserId` augmentation diagnostics came from the isolated program omitting AuthMiddleware; router now explicitly imports its declaration with an empty type-only import. These corrections were inspected, **not rechecked**, respecting the user's rule. Dependency diagnostics and whole-project correctness remain outside this check.
- Raw logs: `evidence/section-12/assessment-tests.log`, `assessment-types.log`; logs retain the observations before the source corrections.
- Added Prisma schema/migration source only for assessment type and queue index. **No migration application, Prisma generate, database call, full build, E2E, deployment or main merge.** Activation must apply migration and regenerate the client in an authorized later runtime session.
- React checklist: stable hook order, labeled/bounded inputs, disabled concurrent submissions, cleanup/generation checks for course changes, manual review refresh and pagination, and no automatic grading retry.


## Enrollment-version continuation after 1690e2a

- Only new `Section12LearningVersions.spec.ts` ran once, bounded to 45 seconds: **16 PASS / 1 FAIL, 3.98 seconds**. The failure was `this.progressRepository.findQuizAttempt is not a function` in the new harness, before answer-key grading assertions ran. Added the missing repository double; **no rerun**. The corrected case is unverified, not reported PASS.
- Passing cases cover original workspace/asset/progress, missing/invalid snapshots, original completion criteria/version, duplicate completion events, registration version changes, exact/history resolution, archival and original attempt caps. All persistence uses doubles; no database calls occurred.
- One selected changed-file semantic noEmit check: **0 diagnostics**. Dependency diagnostics excluded. Final missing-double correction and module archival relation refinement occurred afterward, without another check.
- Adapted prior CourseProgressUseCases, Section12Followup and Section12Assessments test doubles to the immutable-version port; those files were not rerun.
- Logs: `evidence/section-12/version-tests.log`, `version-types.log`.
- No new schema change in this continuation. Existing assessment migration remains unapplied; no Prisma generation, DB backfill, provider execution, build/E2E, deployment or main merge.
