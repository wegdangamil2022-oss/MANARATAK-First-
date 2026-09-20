# MNT-AUD-0035 — Greenfield Seed/Bootstrap Orchestration

**Source state:** SOURCE_IMPLEMENTED / REFERENCE_DATA_APPROVAL_BLOCKED  
**Runtime state:** DB_RUNTIME_PENDING  
**Production state:** NOT VERIFIED

## Implemented

- Versioned ordered seed manifest: `scripts/database/greenfield-seed.manifest.json`.
- Canonical `db:seed` orchestrator with preflight-before-mutation behavior.
- Hash/version/provenance contracts for available seed sources.
- Deterministic steps for Degree Levels, ISCED-F taxonomy, external course providers and Phase 18 Student Tools.
- Hash/review-controlled country seed implementation for the governed 194-row workbook.
- Post-seed count reconciliation with exact/minimum rules.
- Root commands: `db:migrate:deploy`, `db:seed`, `db:provision`, `db:provision:verify`, plus explicit `db:dev:*` commands.
- Initial Admin bootstrap remains a separate credentialed operator action and is not hidden inside deterministic seeding.
- Large catalogs/imports remain separate controlled import workflows.

## Blocking evidence

The current country workbook hash is pinned, but all 194 rows are `UNREVIEWED`. Canonical source datasets for ISO-4217 currencies and ISO-639/BCP47/CLDR languages are absent. The orchestrator therefore exits `SEED_PRECONDITION_BLOCKED` before any database mutation.

Do not change these blockers to READY without reviewed source artifacts and updated hashes/version evidence.
