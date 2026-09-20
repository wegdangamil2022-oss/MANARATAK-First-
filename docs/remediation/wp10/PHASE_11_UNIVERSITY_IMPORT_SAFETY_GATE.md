# Phase 11 University Import Safety Gate

> **Operational supersession notice (2026-09-06):** Any instruction in this historical remediation artifact that requires an “Original Development Database”, a Google Studio recovery gate, or `WP1_RECOVERY_GATE` is superseded by [`docs/operations/GREENFIELD_DATABASE_PROVISIONING.md`](../../operations/GREENFIELD_DATABASE_PROVISIONING.md). This file remains historical/evidence context and is not current database-operation authority.

Status: `UNIVERSITY BULK IMPORT = BLOCKED`

Relationship closure audit: [PHASE_11_UNIVERSITY_RELATIONSHIP_CLOSURE_AUDIT_2026-08-14.md](./PHASE_11_UNIVERSITY_RELATIONSHIP_CLOSURE_AUDIT_2026-08-14.md). Source publication safety is closed, but canonical relationship persistence remains blocked by the Database Recovery Gate.

No University import, promotion, schema mutation, or record creation is authorized until every gate is evidenced.

| Gate | Current status | Required evidence |
|---|---|---|
| University identity contract approved | `READINESS_PREPARED` | ARB approval of immutable `INS-*` association |
| Phase 7 references ready | `SOURCE_IMPLEMENTED_RUNTIME_PENDING` | Country/Region/City resolver integration tests |
| Major/Degree contracts ready | `SOURCE FREEZE PREPARED` | WP9 final freeze and DB linkage evidence |
| Test requirement contract ready | `READINESS_PREPARED` | Phase 9 canonical Test integration tests |
| Import handoff ready | `SOURCE_IMPLEMENTED_RUNTIME_PENDING` | Phase 6 durable runtime evidence |
| Duplicate strategy ready | `READINESS_PREPARED` | Sample ambiguity and reviewed-match evidence |
| Dry Run available | `SOURCE_EXECUTABLE / DB_IDENTITY_CHECK_PENDING` | Stage 1 executable processed 10,723 rows with `databaseWrites = 0`; 10,715 country references resolved from the validated source and 8 `XKX` rows remain governed review items |
| Rollback strategy defined | `PENDING_GOOGLE_STUDIO` | Approved rollback procedure and successful sample rollback |
| Original Development DB backup | `PENDING_GOOGLE_STUDIO` | WP-1 backup/checksum/restore evidence |
| DB recovery gate closed | `PENDING_GOOGLE_STUDIO` | WP-1 database recovery closure |
| Schema/migrations approved | `PENDING_GOOGLE_STUDIO` | Reviewed additive migration and dry-run output |
| Sample import validated | `PENDING_GOOGLE_STUDIO` | Representative sample counters and reviewed results |
| Phase 1 source files compatible | `SOURCE_VALIDATED` | 10,723 rows, zero duplicate/invalid IDs, source fingerprints recorded |
| Before/after counters defined | `DESIGNED` | Universities, aliases, references, hierarchy, programs, requirements, unresolved and duplicate counters |
| Admin authorization and Audit | `PENDING_GOOGLE_STUDIO` | Backend denial and critical mutation audit evidence |
| Final bulk import approval | `BLOCKED` | All gates closed and explicit authorized approval |

## Operational Rules

- A root file is inert until explicitly selected with filename, import type, and target domain.
- There is no folder watcher or automatic import.
- Every source flows through Phase 6 and the University domain Dry Run before any approval.
- Direct Prisma, SQL, spreadsheet-to-record, and ad-hoc database import are prohibited.
- Missing canonical references remain unresolved; fake entities are prohibited.

## 2026-08-13 Stage 1 Local Dry Run Evidence

The executable `scripts/dry-run-university-stage1.ts` reads only the explicitly selected Stage 1 directory and passes each normalized row to `UniversityStage1DryRunUseCase` through a `UniversalImportHandoff` owned by `PHASE_11_UNIVERSITY`.

| Evidence | Result |
|---|---:|
| Source artifacts | 6 |
| Rows evaluated | 10,723 |
| Rejected source rows | 0 |
| Duplicate source-reference conflicts | 0 |
| Database writes | 0 |
| Canonical country resolution | `10,715 RESOLVED / 8 XKX REVIEW_REQUIRED` |
| Existing University identity lookup | `PENDING DEVELOPMENT DB` |

The validated six-continent Country source resolves 10,715 rows by ISO3 to supplied `ctry-<ISO2>` identities. Eight rows use `XKX` (Kosovo), which is not an ISO 3166-1 alpha-3 identity in the approved source, so they remain `REVIEW_REQUIRED`. The use case does not invent an ID or use name-only matching. Existing University identity matching still requires the approved Development DB.

## Country Page and Major Relationship Wiring

- The Country detail page queries the owning University API with the Country English name and displays runtime Universities without copying them into Reference Data.
- The view shows at most the first 100 Universities and preserves the API total for pagination disclosure.
- University cards expose identity, city, institution type, lifecycle, completeness, and official website when present.
- The Country Major tab consumes only `academicPrograms` owned by University records.
- A program is counted as canonically linked only when `status = MATCHED` and `majorId` is present. Unmapped or ambiguous programs remain review items and do not create a Major.
- University Stage 1 contains zero academic-program rows, so it creates zero Country-to-Major relationships by design.
- University persistence and bulk promotion remain blocked pending Google Studio and the database recovery gate.

## Admin Mutation Integrity

University Admin update and lifecycle operations now require transaction-bound persistence and atomically append required Audit and Outbox records. This does not authorize Stage 1 promotion or any database mutation; imported Universities remain `0`.
