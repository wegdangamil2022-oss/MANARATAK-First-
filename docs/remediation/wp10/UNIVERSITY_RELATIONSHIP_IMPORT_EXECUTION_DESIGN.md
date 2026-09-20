# University Relationship Import Execution Design

> **Operational supersession notice (2026-09-06):** Any instruction in this historical remediation artifact that requires an “Original Development Database”, a Google Studio recovery gate, or `WP1_RECOVERY_GATE` is superseded by [`docs/operations/GREENFIELD_DATABASE_PROVISIONING.md`](../../operations/GREENFIELD_DATABASE_PROVISIONING.md). This file remains historical/evidence context and is not current database-operation authority.

Status: SOURCE PREPARED / DATABASE EXECUTION BLOCKED

## Canonical ownership

- `University` preserves the permanent `INS-*` public identity.
- Country, region, and city resolve to Reference Data records.
- Faculties, schools, colleges, and departments are university organization units. They never create Academic Taxonomy identities.
- Academic programs resolve to one Degree Level and optionally one canonical Major. Unresolved names remain review items and never create fake Majors.
- Admission requirements resolve to International Test, Variant, and Version records.
- QS, THE, and ARWU snapshots are children of University and preserve year, scope, official source, and verification date.

## Import stages

1. Stage 1 creates the university identity only after duplicate and reference checks.
2. Stage 2 updates verified institutional and location metadata by `INS-*`.
3. Stage 3 adds organization units, programs, degree/major mappings, admissions, language-test references, and source links.
4. Stage 4 adds tuition, accommodation, living costs, and document requirements.
5. Global Rankings adds independently versioned ranking snapshots.

## Safety sequence

`parse -> normalize -> validate -> resolve references -> dry-run -> change plan -> approval -> atomic commit -> verify`

Dry-run always reports `databaseWrites: 0`. Later stages cannot create a missing university. Commit and rollback require explicit approval plus a Recovery Gate token. The runtime database adapter remains deliberately unconfigured until Google Studio closes database recovery evidence.

## Rollback

Every approved import owns one `UniversityImportChangeSet`. Each ordered change stores before/after state. Rollback executes changes in reverse sequence inside one transaction and marks the set `ROLLED_BACK`; it must not regenerate IDs or delete unrelated records.

## Database status

- Prisma schema: proposed and locally validated.
- Migration application: blocked.
- Database writes: none.
- IDs changed: 0.
- Relations lost: 0.
