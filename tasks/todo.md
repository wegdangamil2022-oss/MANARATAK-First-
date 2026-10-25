# Courses implementation checkpoints

## 1. Common catalog / 07.C
- [x] Read contracts: stable ordering, correct AND filters, study/certificate null semantics, bounded pages and trustworthy filtered statistics.
- [x] UI foundation: three real entries, one filter region, conditional fields, cards/table, URL restoration, safe role-gated actions and paid preparation only. All-results bulk selection/publication remain in phase 2.
- [x] Preserve source-specific details, native create/editor and learning-path/provider/import tools.
- [x] Verify 370 unit/contract tests (5 gated skips), 7 isolated PostgreSQL checks, actual MFA API/browser authorization, TypeScript/build/lint, desktop/phone RTL/LTR and error states. Evidence: docs/ui/COURSES_CATALOG_EXECUTION_2026-10-25.md.

## 2. External / 07.A
- [x] Single five-section read/create/section-edit drawer with immutable source provenance, original imported values, draft protection, canonical relationships and paged history.
- [x] Audited manual external draft creation, canonical provider, dedup, source evidence and mandatory review on first matching later import.
- [x] Stable all-filter/ID bulk snapshots, readiness preview, bounded idempotent execution, receipt recovery and paged partial-results report/CSV; retry failed only.
- [x] Verify roles/source/versions/large data/runtime: 389 unit/contract tests, 20 isolated PostgreSQL tests, actual MFA/CSRF browser create/edit/conflict/individual and bulk publication, RTL/LTR/phone and audit/outbox evidence. See docs/ui/COURSES_EXTERNAL_EXECUTION_2026-10-25.md.

## 3. Native / 07.B
- [x] Native catalog and cohort counts from original enrollment/progress/completion tables; 393 unit/contract tests, 26 isolated PostgreSQL tests, 12 actual browser checks and desktop/mobile RTL/LTR evidence. See docs/ui/COURSES_NATIVE_LEARNING_EXECUTION_2026-10-25.md.
- [x] Eight-tab native editor, curriculum metadata, structured blocks with live preview, actual assessment creation, bounded private learners and course cohort report. Existing advanced tools retained.
- [x] Persisted/ordered/versioned content blocks, protected EAP references, immutable enrollment content and actual learner progress/completion. Original media processing service was not exercised live.
- [x] Verify 411 unit/contract tests (5 gated skips), 32 isolated PostgreSQL tests, 16 admin browser checks and complete student enrollment/progress/history browser flow; TypeScript/build/lint and actual desktop/mobile evidence. See docs/ui/COURSES_NATIVE_AUTHORING_EXECUTION_2026-10-26.md.
- [ ] Close remaining 07.B acceptance: draft duplication, unified advanced assessment authoring, public previews/resume/scheduling, scoped instructor roles, live asset pipeline/certificate binding and issuance proof. Financial operations remain deferred by 07.C.07; existing financial guards retained.

## Release
- [x] Phase 1 foundation committed and pushed on feat/courses-admin-workspaces-20261025; no main merge.
- [x] External implementation and evidence committed at 3d0257be and remote head independently verified.
- [x] Draft PR #45 created and attached: https://github.com/wegdangamil2022-oss/MANARATAK-First-/pull/45. Targets feat/international-tests-admin-20261025; no main merge.
- [x] Report evidence and genuine remaining work, distinguish isolated fixtures from original data.
