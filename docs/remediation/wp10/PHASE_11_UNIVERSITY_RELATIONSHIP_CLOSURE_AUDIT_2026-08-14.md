> **HISTORICAL / SUPERSEDED — 2026-09-03:** This audit predates the normalized P11/P12 closure and is retained as historical evidence only. Current authority is the Cross-Phase Relationship Closure Matrix v2.0.0 and P13 Final Source Closure Report.

# Phase 11 University Relationship Closure Audit

Status: `SOURCE SAFETY IMPROVED / CANONICAL PERSISTENCE BLOCKED`

## Relationship Matrix

| Relationship | Contract | Runtime/API | Durable Prisma relation | Verdict |
|---|---|---|---|---|
| University -> Country | `countryReferenceId` and ISO3 resolver exist | Stage 1/2 dry runs resolve canonical Country; Country Admin currently filters Universities by country name | No FK; `University.country` is text | `PARTIAL / MIGRATION REQUIRED` |
| University -> Region/City | canonical reference fields exist | Stage 2 carries region/city and Country detail displays city text | No FK; `University.city` is text | `PARTIAL / MIGRATION REQUIRED` |
| University -> Campus | `CampusContract` exists | Admin accepts generic JSON | No Campus model/relation | `CONTRACT_ONLY / MIGRATION REQUIRED` |
| University -> Faculty/College | organization-unit contract correctly treats faculty as institutional context, not taxonomy | Stage 3 parses faculty names | No organization-unit model/relation | `CONTRACT_ONLY / MIGRATION REQUIRED` |
| University -> Academic Program -> Major | program contract requires `majorId` for `MATCHED` | Country detail counts only MATCHED + majorId; publication now blocks false MATCHED records | Programs are optional JSON, no Major FK | `PARTIAL / MIGRATION REQUIRED` |
| Academic Program -> DegreeLevel | canonical code/reference contract exists | publication now blocks MATCHED program without canonical degree reference | No DegreeLevel FK from University program | `PARTIAL / MIGRATION REQUIRED` |
| University -> International Test | requirement contract requires `internationalTestId` | publication now blocks accepted-test claims without canonical requirement | No University/Test requirement relation | `PARTIAL / MIGRATION REQUIRED` |
| University -> Scholarship | Stage 3 preserves official scholarship references | No canonical University/Scholarship relation; Scholarship work is next domain | No relation | `DEFERRED TO SCHOLARSHIPS` |
| University -> Rankings | QS/THE/ARWU typed source contract with global/regional scope | external sample dry-run passes | Stored only in optional JSON | `SOURCE_READY / DURABILITY MIGRATION REQUIRED` |

## Source Corrections Completed

- Added central `UniversityPublicationReadinessPolicy`.
- Mark-ready and publish both invoke the central readiness engine.
- Publication requires permanent `INS-*` identity and canonical Country reference.
- A program claiming `MATCHED` requires canonical Major and DegreeLevel references.
- Named accepted tests require canonical International Test requirements.
- Added `GET /admin/universities/:id/publication-readiness`.
- Stage 3, Stage 4, and Rankings source contracts and explicit-file dry-run tooling are available.
- Later stages update existing `INS-*` identities only and never create replacement Universities.

## Database-Dependent Closure

The current Prisma `University` model remains flat and contains text `country`, text `city`, and generic `optionalFields`. It has no durable relations for Country, Region, City, Campus, Organization Unit, Academic Program, Major, DegreeLevel, International Test requirement, Scholarship, or Ranking snapshot.

Closing these items requires an additive schema design and migration after:

1. Original Development DB recovery evidence.
2. Backup and restore verification.
3. Existing-row identity and relationship baseline.
4. Migration review and dry run.
5. Representative sample import and rollback evidence.

No schema or database mutation was performed by this audit.

## Verification

- University application/API tests: `29 passed`.
- Domain, Application, and API TypeScript checks: passed.
- Prisma schema changed: `NO`.
- Database changes: `NONE`.
- University imports: `0`.

## Verdict

`PHASE 11 SOURCE SAFETY CLOSED — CANONICAL RELATIONSHIP PERSISTENCE BLOCKED BY DATABASE RECOVERY GATE`

Phase 11 must not be declared fully closed and Scholarships must not be treated as canonically integrated until the additive University relationship migration and runtime evidence are complete.
