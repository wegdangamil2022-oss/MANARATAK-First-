# Section 12 — Learning Platform (P13)

Date: 2026-10-10. Branch: `codex/section-12-learning`.
Base: Section 11 `889761b`, preserving its pushed fixes; main remains `91b7d97` and Section 11 is not yet merged.
Status: **SOURCE REPAIRS IMPLEMENTED / SELECTED LIGHT TESTS PASSED / OPERATIONAL VERIFICATION DEFERRED**.

## Grounding

Reviewed the available Phase 13 architecture, existing learning domain contracts, native/imported course authoring, curriculum/version repositories, course publication, enrollment/progress, assessments, learning paths, API composition and admin screens. No AGENTS.md or original consolidated MANARATAK_ADMIN_REVIEW_CODEX.md is present in the inspected repository. This document does not certify every item in that unavailable checklist or claim every aspirational Phase 13 capability has been delivered.

## Implemented source repairs

1. **Audited owner commands.** Course and learning-path administrative commands now run through `CourseAdminCommandUseCases`: authenticated reviewer, explicit reason, caller If-Match version, same-owner row lock/version comparison, bound repositories, and atomic Audit/Outbox. Native course creation preserves the actual created owner identity in audit metadata and event payload. Child/policy/relationship changes that did not advance the owner version acquire a version checkpoint in the same transaction. API response bodies are buffered until commit. Published/inactive owner editing is blocked. Missing/stale conditions return 428/409.
2. **Curriculum persistence.** Curriculum, policy, relationships and imported operations repositories bind to the existing transaction. Curriculum's inner multi-write operations reuse the bound client instead of invoking unsupported nested Prisma transactions. Course updates lock the owner, checkpoint curriculum and demote a publish-ready record to review. Duplicate reorder IDs and partial quiz module/lesson ownership mismatches are rejected. Rejected course curricula are immutable.
3. **Publication and imported courses.** Publication retains its specific CoursePublished event and now locks/compares the owner version inside its atomic boundary. Imported admin update/review/reject/unpublish/archive/link verification use the governed command scope, with conditional versions and reviewer reasons. Provider link checking remains governed by its existing safe domain checker; no provider/network operation was executed in this session. Official-source/provider evidence and reviewed import identity rules remain unchanged. No auto-publication was added.
4. **Enrollment and access policy.** Published-only learner access; policy edits blocked for published/inactive owners; prerequisite owners validated; integer capacity enforced. Paid-course clearance, external-course separation and safe EAP asset references remain existing boundaries. No financial execution or certificate issuance was added.
5. **Learning progress and assessments.** Archived module lessons and QUIZ lessons cannot forge trackable progress. A student-supplied COMPLETED label below 100 percent is normalized to IN_PROGRESS. Non-finite progress and missing answer keys fail closed. Learner module/lesson/quiz DTOs now omit raw owner metadata. Quiz-attempt allocation serializes on enrollment and enforces the current attempt cap; submission locks the attempt to prevent duplicate grading.
6. **Learning paths.** Multi-node prerequisite cycles, invalid positions and empty required-course policies are rejected. Archived/published paths cannot reenter draft review. Enrollment checks constituent course publication; course availability requires an existing enrollment. Availability/completion read the immutable path version recorded on the enrollment, rather than the latest edited path.
7. **Admin UI.** Native course creation and course editing expose reviewer reason fields. Client propagates If-Match and committed version headers, bypasses stale course GET caches, and clears version/reason state on auth changes. React skill checklist applied: stable hook order, labeled controls, bounded input, cleanup of per-owner reason state and no automatic stale-write retries. Also fixed the existing undefined `method` reference in University client mutation preconditions.

## Assignment and manual-review continuation

Completed source implementation after `681bac4`:

- Unified assessments distinguish `QUIZ` and `ASSIGNMENT`, preserving existing quizzes by default. Admin can create a written assignment through the same curriculum/question workflow. Learner renders both module assessments and course-level assessments, uses a bounded written-answer area, and can resume an unfinished attempt without allocating another attempt.
- Written/mixed submissions persist answers and a server-built immutable review snapshot in existing attempt JSON: passing threshold, total/automatic points, manual question prompts and maximum points. No answer key is copied into this snapshot. `SUBMITTED` has null score/pass and cannot satisfy required-assessment completion.
- Paginated admin review queue and grading endpoint live under the existing authenticated `admin:courses:manage` mount. The server derives reviewer identity and final score; requires reason, exact rubric question IDs, bounded scores, and a submission timestamp precondition. Published-course grading does not edit/version the curriculum.
- Attempt row locks, pending-state checks and transaction-bound repositories prevent duplicate grading. Final score/pass, reviewer/feedback, Audit and Outbox commit together. Failure is not returned as successful grading. Grades are final through this endpoint; no result-edit path was introduced.
- Learner progress exposes only grading feedback/time from assessment metadata; reviewer identity/reason and internal rubric remain administrative. Publication now accepts manual questions with valid weights; objective questions require answer keys.
- Source migration `20261010000000_course_assessment_type` adds the assessment discriminator/check and review-queue index. **It was not applied.** Deployment must apply it and regenerate the Prisma client before this branch is activated.
- New light checks: **23/23 tests passed in 4.38 seconds**, only the two new assessment test files, once. This is 66 distinct passing cases across recorded rounds, not a rerun of all 66 on the final tree. Single selected-file semantic check recorded 13 diagnostics; unused imports/parameters and isolated Express augmentation inclusion were corrected without rerunning. No final semantic PASS is claimed.

## Enrollment version continuation after 1690e2a

- New registration stores the published `courseVersion` in enrollment metadata. Capacity persistence locks the course and rejects publication/version changes before creating the enrollment; it also verifies the immutable published snapshot exists. Generic enrollment upserts preserve existing metadata.
- Workspace, lesson progress totals, asset resolution, quiz attempts/submission and completion use the registered course snapshot. Completion criteria, result version and certificate eligibility come from that snapshot, preserving the P13/P14 boundary. The current course must still be published for learner access.
- Legacy enrollments without a pin resolve only published history at or before their enrollment timestamp. Missing/corrupt history fails closed; there is no fallback to latest curriculum. Existing recorded enrollment timestamps/history must be verified during activation; no database backfill was run.
- Curriculum deletion now archives module/lesson/quiz/question/bank identities. Module/lesson retirement also retires associated assessments, keeping historical foreign-key targets alive for pinned learners. Snapshot reads hydrate JSON dates and default older quiz assessment types to `QUIZ`.
- Attempt limits use the enrolled quiz definition inside the enrollment lock. Completion locks enrollment, skips duplicate business/audit/outbox writes when another request already completed, and records the student context by default.
- New version suite ran once: **16/17 passed in 3.98 seconds**. One case stopped because its test double omitted `findQuizAttempt`; that double was corrected without rerun. No claim of 17/17 PASS. Selected changed-file noEmit semantic check: **zero diagnostics**, before the final fixture correction and module-to-lesson assessment retirement refinement; dependency diagnostics excluded. Previously executed suites were not repeated; their doubles were adapted to the new version port.

## Limits and activation handoff

- No database query, migration, seed, import, Prisma generation, build, browser/E2E, provider execution or deployment was performed. The initial round used existing tables; the continuation adds the unapplied assessment-type/index migration described above.
- Selected lightweight tests passed; PostgreSQL row-lock behavior, real Audit/Outbox rollback, Prisma bound-client behavior, endpoint RBAC/session/CSRF and actual UI workflows still require operational verification.
- Assignment submission/review and manual grading are now implemented in source and covered by selected light tests. Activation and end-to-end operational acceptance remain deferred, so this document does not certify full runtime closure of Phase 13.
- Provider-specific enrichment adapters remain explicitly unavailable where no registered adapter exists; no fallback crawling was introduced.
- Version pinning now covers both learning paths and course learning definitions. Legacy historical resolution and real PostgreSQL version/concurrency behavior remain operational acceptance items.
- The selected-file semantic type check reported eight diagnostics which were corrected without rerun. Whole-project type correctness is not certified; see check log.
- Branch is pushed only. No Section 11/12 main merge, production publication, certificate issuance or runtime activation is part of this task.
