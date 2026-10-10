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

## Limits and activation handoff

- No database query, migration, seed, import, Prisma generation, build, browser/E2E, provider execution or deployment was performed. These repairs use existing version/learning tables; no new schema migration was introduced.
- Selected lightweight tests passed; PostgreSQL row-lock behavior, real Audit/Outbox rollback, Prisma bound-client behavior, endpoint RBAC/session/CSRF and actual UI workflows still require operational verification.
- Manual essay/short-answer grading and assignment submission/review are not implemented by this repair round; the existing fail-closed publication/grading gates are retained. They remain functional follow-up, not PASSED or CLOSED.
- Provider-specific enrichment adapters remain explicitly unavailable where no registered adapter exists; no fallback crawling was introduced.
- Enrollment-version pinning here covers learning paths. Course curriculum/progress version migration semantics for existing learners remain a separate runtime/product validation item.
- The selected-file semantic type check reported eight diagnostics which were corrected without rerun. Whole-project type correctness is not certified; see check log.
- Branch is pushed only. No Section 11/12 main merge, production publication, certificate issuance or runtime activation is part of this task.
