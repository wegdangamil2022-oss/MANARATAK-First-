# Official local runtime repair — 2026-11-19

The redesigned public/student interface exposed a mismatch between the checked-in schema and the existing official Neon database. Five pending migrations caused missing profile columns and missing review/provider tables. Parallel catalog requests also intermittently exhausted Prisma's two-second transaction acquisition wait. The administration login emitted a blocked Zod evaluation probe under the strict browser content security policy.

## Source changes

- Configure Zod's interpreted validation mode before either browser application initializes. The existing content security policy remains strict.
- Set the canonical API client's transaction acquisition `maxWait` to 10 seconds. Keep the transaction execution timeout and bounded connection pool unchanged.
- Explicitly specify `onUpdate: NoAction` for the course source approval and study destination revision relations. This matches their immutable migration SQL and prevents schema drift without rewriting historical migrations or changing existing relationships.

## Existing database reconciliation

Applied through the governed migration deployment path:

- `20261117000100_certificate_replacement_one_to_one`
- `20261117000200_study_destination_review_proof`
- `20261117000300_course_source_approvals`
- `20261117000400_study_destination_history_policy`
- `20261117000500_course_provider_backlog`

The database now has 122 applied migrations. Migration checksums match source, no migration remains pending or failed, and Prisma's database-to-schema diff reports no difference. Canonical application grants were finalized; the application role still cannot access the migration ledger.

All 309 pre-existing public table counts matched the pre-change baseline, with the expected addition of five migration-ledger rows. The five new tables are empty. All 10,723 university records remain present. No invalid index or unvalidated constraint was found. No replacement database, seed, publication, or fabricated review history was created.

## Recovery evidence

Before mutation, PostgreSQL 16 `pg_dump` captured the schema and the data of the affected existing tables: `Certificate`, `StudyDestinationProfile`, and `_prisma_migrations`. The reviewed migrations add nullable columns, an index, and empty tables; they do not modify other existing table data. The archive inventory, complete archive decoding, target identity, SHA-256, and pre-change counts were verified and recorded privately outside Git.

This is an affected-object recovery archive, not a whole-database data backup. It must never be used for whole-database restoration. Recovery requires reviewing the failure and selecting the affected objects/data, or applying a reviewed forward repair. No restoration rehearsal or automatic rollback was performed. Interrupted full-database dump attempts are incomplete and are not recovery evidence.

Local disk exhaustion interrupted the initial broad verification and backup attempts. Cleaning the regenerable npm package cache freed approximately 1.3 GB. The affected verification was rerun after space became available.

## Verification

- Root TypeScript check, public web build, and administration build passed.
- Prisma source validation and client generation passed.
- Source architecture, authorization/audit contracts, remediation gates, and secret scan passed.
- All 1,163 Node tests passed, including relation parity and runtime resource lifecycle coverage.
- All 223 public web tests across 50 files passed. A full-repository Vitest pass is not claimed; the unrestricted attempt was replaced with the focused web suite after local resource pressure.
- Two rounds of five concurrent official API reads returned HTTP 200 for universities, majors, scholarships, study destinations, and courses.
- Mobile Chrome checks passed for `/ar/student`, `/ar`, `/ar/courses`, `/ar/articles`, and `/admin/login`: no uncaught page errors, no CSP violations, and no student-page horizontal overflow. API liveness returned HTTP 200.

The local platform was restarted at `http://localhost:3000/` using the existing official database and restricted application role. The browser checks cover guest access; they do not certify every authenticated student workflow or replace the remaining integration work described in the interface replacement report.
