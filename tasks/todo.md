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
- [ ] Unified authoring and source-backed native list/student aggregation.
- [ ] Ordered safe content blocks, media, historical versions and learner access/progress.
- [ ] Assessments, reports, completion/certificate boundaries; preserve existing financial gates.
- [ ] Verify learner/admin roles, concurrency/history, real browser flows and accurate completion report.

## Release
- [x] Phase 1 foundation committed and pushed on feat/courses-admin-workspaces-20261025; no main merge.
- [ ] Commit and push verified external-course implementation and evidence on the same independent branch.
- [ ] Open draft PR when GitHub API connectivity recovers. Connector transport failed; direct API attempts failed during TLS. Branch push and remote head were independently verified.
- [x] Report evidence and genuine remaining work, distinguish isolated fixtures from original data.
