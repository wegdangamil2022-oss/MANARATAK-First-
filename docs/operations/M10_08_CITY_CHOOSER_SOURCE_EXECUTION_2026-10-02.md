# M10-08 — City chooser and main handoff

## Scope

Authority: revised plan v2 sections 21/28/30, M10-08, following M10-07. M0–M9 are accepted for planning. On 2026-10-02 the user authorized merging both source tasks into main for Google AI Studio's main-only pull. No database connection, migration execution, seed, import or deployment was performed. M10 as a whole remains open; runtime acceptance is RUNTIME_UNTESTED.

## Changes

| Owner / files | Implemented behavior |
|---|---|
| Domain `ReferenceDataContracts.ts`; API `ReferenceDataQueryContract.ts`, admin/public routers | Explicit optional administrativeRegionId UUID filter for city collections only. Other collections continue rejecting this key. Existing bounded pagination and strict query validation remain. Public queries continue forcing activeOnly=true. |
| Infrastructure `PrismaReferenceDataRepository.ts` | Typed Prisma city filters apply the same canonical country/region predicates to list and count, with name/ID ordering. Existing city writer and University validator reject foreign/inactive relationships. No new schema or migration was added for M10-08. |
| Admin `referenceData.ts`, `canonicalPickers.ts` | City chooser loads every bounded page with unchanged country/region scope and stable owner IDs. Empty country scope makes no city/region request. Options retain canonical region ID and original region label as separate metadata. |
| Admin `citySelection.ts`, `CanonicalCityPicker.tsx` | Original city label remains unchanged. Exact normalized name hints produce explicit selection/review; multiple candidates are REVIEW_REQUIRED. No fuzzy selection and no label-to-FK assignment. Choices show the region and full ID to distinguish identical names. Late results from a previous scope cannot replace current review state. |
| Admin `UniversityRelationshipEditorPage.tsx` | City chooser depends on country and optional region. Country change clears region/city; region change clears city. Saving sends only canonical FK fields through the University owner API, preserving raw country/city source fields. Published/saving forms disable relationship choices. Country ISO scope is reset on detail reload. |
| Admin `ReferenceDataAdminPage.tsx` | City form selects an ACTIVE canonical country and optional canonical region. Original region label is a separate text field. Save uses the administration client and sends region UUID separately. City table keys use stable city IDs. |
| `scripts/db-remediation-gate.ts`; recovery regression tests; CI workflow | Follow-up source defect: native Windows separators falsely failed rollback artifact comparison, while process.exit(0) masked rejected recovery plans. Inventory paths now use portable separators; invalid plans return exit 1. Black-box disposable filesystem fixtures prove valid/rejected plans with no DB connection. Historical SQL/checksums were not modified. CI runs these regression contracts. |

## Source verification

- Initial focused transport/query/persistence set: 5 files, 44 tests PASS.
- Broader ReferenceData/application/Prisma/API/admin set: 18 files, 171 tests PASS. This invocation did not include live DB or browser tests.
- Final public/admin query additions: 2 files, 34 tests PASS, including malformed FK labels, city region UUID queries, public active-only enforcement and unsupported filters on other collections.
- Final combined ReferenceData, University validator/repository/import gateway, API and admin suite: 22 files, 219 tests PASS. CI/recovery node contract set: 12 tests PASS.
- Recovery contracts: 4 node tests PASS. Initial new test runner failed because a Windows import path was not a file URL; the runner was corrected and rerun without changing the behavioral assertions.
- Actual repository rollback-plan: RECOVERY_PLAN_SOURCE_VALIDATED; recoveryPlanIssues=[]; databaseConnectionAttempted=false; databaseWrites=0. Its initial Windows failure exposed and led to the source fix above.
- TypeScript build and Vercel TypeScript context checker PASS (zero diagnostics). Admin/API/Web production builds PASS; existing bundle size warnings remain.
- Source quality PASS (zero cycles/accessibility findings); persistence ownership PASS (246 models, zero direct cross-context mutations); scoped ESLint zero errors, 14 existing warnings; secret scan and diff whitespace check PASS.
- Local mocks prove transport/IDs/strict validation, not a live session refresh, PostgreSQL constraints or persisted audit rows. Exact-head GitHub CI is required before merge; retain PR #7's checks as the external evidence.

## Google AI Studio activation order

1. Pull main in the connected environment and record the exact commit. Keep the API stopped during schema activation: M10-07 selects columns absent from the old schema.
2. With existing connection secrets kept in that environment, run `npm run db:remediation:rollback-plan` (source only). Run `npm run db:remediation:status` there (read only). A nonzero status for a pending migration must be inspected; failed/divergent historical migrations are a stop condition. Do not mark the new migration applied without executing it.
3. Review `20261001010000_m10_region_governance/migration.sql` and the recovery policy. It is BACKUP_RESTORE_REQUIRED. Capture a real pre-change backup and restore evidence for the approved target; do not fabricate evidence or edit historical SQL/checksums.
4. Only the authorized connected operator applies migrations. The existing deploy gate requires DATABASE_PROVISIONING_GATE=APPROVED, ALLOW_DATABASE_MUTATIONS=YES, DATABASE_MUTATION_PURPOSE=migrate, matching NODE_ENV/DATABASE_MUTATION_ENVIRONMENT, and a confirmed DATABASE_MUTATION_TARGET (host:port/database). Staging/production additionally requires DATABASE_RECOVERY_EVIDENCE_FILE; production also requires ALLOW_PRODUCTION_DATABASE_MUTATIONS=YES and DATABASE_PRODUCTION_CHANGE_ID. Verify these locally without posting credentials/connection URLs in chat. `npm run db:remediation:deploy` applies **all pending migrations**, then runs status and schema parity; inspect the pending list before approving it. This source task did not execute that command.
5. Start the API/UI only after migration status and schema parity pass. Run the M10-07 REG-RT cases and the city cases below. Do not start seeds, pilots or bulk imports as part of this handoff.

## Connected city cases — RUNTIME_UNTESTED

| Case | Action / expected result |
|---|---|
| CITY-RT-01 | Choose country then region; only cities in that scope appear, including a later page. Change region/country: dependent selection clears. No global query while country identity is unresolved. |
| CITY-RT-02 | Review two cities sharing a source name. Distinct region/UUID choices; ambiguous raw label remains REVIEW_REQUIRED until explicit selection; no automatic FK write. |
| CITY-RT-03 | Save a University city FK and reload/browser refresh/session refresh. Same persisted UUID; original country/city text unchanged. Published structure remains immutable. |
| CITY-RT-04 | Create/upsert a city under an ACTIVE region with a different original region label. UUID relation and raw text remain separate after reload. Verify version/audit/outbox records in the real transaction. |
| CITY-RT-05 | Request a write using a foreign-country city/region, a city in another chosen region, a deprecated region, or a raw label in an FK. Reject with zero mutation. Student/unauthorized staff and invalid CSRF/idempotency cases remain denied. |
| CITY-RT-06 | Race region lifecycle with a city assignment in real PostgreSQL; verify the M10-07 locks/triggers and rollback atomicity, preserved IDs and no orphan. |

Next source task in the plan is M10-09 (provider registry). Runtime evidence is still needed to close M10-07/M10-08 acceptance; the broader pilots and M10 closure remain later work.
