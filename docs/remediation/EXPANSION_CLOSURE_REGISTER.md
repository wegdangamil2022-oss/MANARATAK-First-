# Post-96 Expansion Closure Register

> **Operational supersession notice (2026-09-06):** Recovery-era database instructions in this historical artifact are superseded by [`docs/operations/GREENFIELD_DATABASE_PROVISIONING.md`](../operations/GREENFIELD_DATABASE_PROVISIONING.md). This file remains evidence/history and is not current database-operation authority.

Status date: 2026-08-13

This register is intentionally outside the historical 96 groups.

## University Stages

| Stage | Scope | Current status | Identity rule |
|---|---|---|---|
| Stage 1 | Name, continent/country, official website, source identity | `SOURCE_DRY_RUN_READY / NOT_IMPORTED` | Preserve `SourceReferenceId`; no name-only match |
| Stage 2 | Next supplied workbook fields | `AWAITING_SOURCE` | Update the Stage 1 identity; do not create duplicates |
| Stage 3+ | Campuses, programs, admissions, fees, accreditation, and later sections | `AWAITING_SOURCE_AND_CONTRACT_REVIEW` | Each child requires stable owner and canonical references |

Every stage follows: `Source -> Parse -> Normalize -> Validate -> Map -> Detect Duplicates -> Dry Run -> Commit -> Verify -> Rollback`.

## Scholarships

Current status: `SOURCE_NOT_SUPPLIED / COUNTRY_QUERY_WIRED / CANONICAL_RELATIONSHIPS_PENDING`.

Independent closure areas:

1. Stable scholarship identity and duplicate policy.
2. Canonical Country, University, Major, and DegreeLevel relationships.
3. Draft/Published lifecycle and Publication Readiness.
4. Staged import, dry run, commit, verification, and rollback.
5. API/Admin integration, RBAC, Audit, and runtime evidence.

Free-text `targetUniversities` or `targetAcademicPrograms` must not be reported as canonical relationships.

## Atomic Admin Mutation Status

- University update and lifecycle commands use one business/audit/Outbox transaction boundary.
- Scholarship create, update, and lifecycle commands use one business/audit/Outbox transaction boundary.
- Both Prisma adapters reject missing transaction context in active API composition.
- This closes source wiring only. University imports remain `0`, and Scholarship canonical Country/University/Major/DegreeLevel relationships remain pending their owning contracts and database gate.
- Runtime rollback evidence remains pending the approved Development database recovery gate.
