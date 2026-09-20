# P9 — Admin Relationship Authoring Source Closure

**Date:** 2026-09-03  
**Status:** **SOURCE CLOSED / RUNTIME PENDING**  
**Scope:** Repair-plan P9 only — P23 Admin relationship authoring for R-042→R-055.  
**Authority:** `docs/remediation/CROSS_PHASE_RELATIONSHIP_CLOSURE_MATRIX.md` v1.4.0 and the P1 architecture ownership boundaries.

## Closure principle

P23 Admin is a control plane, not a business-data owner. This closure therefore does not introduce Admin repositories, direct Prisma access, duplicate domain validation, or new canonical truth. Admin selectors/editors write canonical owner IDs and call the owning phase Application/API contracts. Source labels remain display/provenance inputs only where the owner domain already supports them.

A unified canonical picker contract carries `id`, `label`, lifecycle/status and optional public/code/owner metadata. `DEPRECATED`, `ARCHIVED`, `SUPERSEDED`, `MERGED`, `REJECTED`, and `INACTIVE` options are non-selectable, and an existing canonical ID that disappears from the owner API is rendered as an explicit not-found state rather than silently converted to text.

## R-042→R-055 closure

| ID | Owner | P23 authoring path | Source result |
| --- | --- | --- | --- |
| R-042 | P7 Reference Data | `CanonicalPicker` → `ReferenceDataAdminRouter` countries/regions/cities/languages/currencies | Runtime Pending |
| R-043 | P8 Taxonomy / DegreeLevel | existing owner Admin APIs reused by canonical picker loaders | Runtime Pending |
| R-044 | P9 International Tests | existing `InternationalTestAdminRouter` owner lifecycle/selectors | Runtime Pending |
| R-045 | P10 Majors | existing `MajorAdminRouter` owner API/selectors | Runtime Pending |
| R-046 | P11 University | `UniversityRelationshipEditorPage` → owner PATCH geography + stable AcademicProgram create/update/archive APIs | Runtime Pending |
| R-047 | P12 Scholarship | `ScholarshipRelationshipEditorPage` → `AdminScholarshipUseCases.replaceCanonicalRelationships` via `ScholarshipAdminRouter` | Runtime Pending |
| R-048 | P13 Courses | Course detail relationship review → existing P13 analyze/approve/reject/language/major owner endpoints | Runtime Pending |
| R-049 | P14 Certificates | existing certificate lifecycle Admin owner API | Runtime Pending |
| R-050 | P16 CMS | existing CMS author/review/publish Admin owner API | Runtime Pending |
| R-051 | P17 AI | existing P17 governance Admin owner API; P17 remains sole AI execution authority | Runtime Pending |
| R-052 | P18 Student Tools | existing P18 registry/Admin owner API | Runtime Pending |
| R-053 | P19 Finance | existing P19 Admin owner API; no ledger/payment logic moved to Admin | Runtime Pending |
| R-054 | P20 Services | Services Admin canonical country/language multi-pickers → P20 owner API | Runtime Pending |
| R-055 | P21 Career | Career Admin canonical country/city pickers → P21 owner API and P7 City→Country validation | Runtime Pending |

## Material source changes

### Shared picker contract

- Added/reused a single `CanonicalPickerOption` shape containing canonical ID, label and lifecycle.
- Added canonical loaders for P7 countries/regions/cities/languages/currencies plus DegreeLevel, Major, International Test, University and University AcademicProgram owner reads.
- Added explicit inactive/not-found handling and blocked lifecycle states.
- Added P7 Admin reads for Languages and Currencies through `ReferenceDataAdminRouter`.

### University / AcademicProgram authoring

- Added a dedicated relationship editor over the P11 owner API.
- Geography is saved as `countryReferenceId`, `regionReferenceId`, `cityReferenceId`.
- AcademicProgram rows author canonical DegreeLevel, Major and admission-test IDs.
- Existing AcademicProgram IDs are preserved on edit; the owner repository updates the row in place.
- Removing a program from Admin archives it instead of hard-deleting the canonical Program identity, so existing Scholarship references are not silently nulled.
- Campus and organization-unit IDs are checked against the same University by owner-side validation before program persistence.

### Scholarship relationship authoring

- Added a canonical relationship replacement use case inside P12 Application authority.
- Country, Language, Currency, DegreeLevel, Major, InternationalTest, University and AcademicProgram references are validated through the canonical lookup gateway before persistence.
- Inactive/not-found canonical references fail closed.
- AcademicProgram→University ownership mismatch fails closed.
- Published scholarship structure remains immutable through the owner use case.
- Admin UI sends canonical IDs only to the new owner API route.

### Course relationship review

- Exposed the already-existing P13 owner relationship resolution workflow in the Admin course detail surface.
- Taxonomy proposals and Major projections are approved/rejected through owner endpoints.
- Language selection writes a canonical language reference.
- No taxonomy/major inference rules were copied into React.

### Services and Career

- Services country/language relationship authoring no longer uses comma-separated text. It writes canonical P7 ID arrays through P20 owner contracts.
- Career employer/job geography authoring writes canonical Country/City IDs through P21 owner contracts. City→Country consistency remains an owner-side P21/P7 validation.

## Non-ownership / safety checks

- No direct `@prisma/client`, Prisma repository, or database write path is introduced under `apps/admin/src`.
- Admin mutations route through owner API/Application layers.
- No live database migration is required by P9 and none was executed.
- P8 late-domain migrations remain source-only behind their existing Runtime/DB gate.
- The checked-in `dist` tree is a **pre-P9 compiled artifact** because this package does not contain installed workspace dependencies. Source is the authority for this P9 closure until a dependency-backed rebuild is run.

## Verification boundary

Source verification includes the dedicated `scripts/verify-p9-plan-closure.mjs`, TypeScript syntax/transpile checks for the modified P9 source set, the focused Scholarship canonical-authoring specification, and regression execution of the existing P7/P8 and affected phase/source verifiers available without a live database.

A dependency-backed monorepo typecheck/build/Vitest/Prisma validation is **not claimed** in this package because `node_modules` is absent. Live DB, migration application, browser E2E and rebuilt `dist` proof therefore remain **Runtime Pending** rather than being fabricated as passed.

## Final closure evidence

The final source-close pass after the stable AcademicProgram identity repair and canonical lookup fail-closed guard produced:

- `P9_PLAN_CLOSURE_VERIFIER = PASS 97/97`.
- Changed P9 TypeScript/TSX syntax/transpile verification = `23/23 PASS`.
- `P8_PLAN_CLOSURE_VERIFIER = PASS 54/54`.
- `P7_PLAN_CLOSURE_VERIFIER = PASS 16/16`.
- Phase 15 = `14/14 PASS`; Phase 15/16 closure = `13/13 PASS`; Phase 16 = `22/22 PASS`.
- Phase 17 source verifier = `PHASE17_SOURCE_READY=YES` when executed inside a temporary local Git snapshot; that temporary `.git` directory was removed before packaging.
- Phase 18 and Phase 19 source verifiers = `PASS`.
- W1 = `30/30 PASS`, W2 = `23/23 PASS`, W3 = `31/31 PASS`, W12 = `14/14`, W13 = `13/13 PASS`, W14 = `14/14 PASS`.
- WP7 Admin control-plane verifier = `PASS`; International Test source baseline = `59` identities (`56 ACTIVE`, `3 ARCHIVED`) with no duplicate IDs/slugs; Degree/Taxonomy baseline = `PASS`; Major source identity baseline = `3,402` identities with no duplicate or missing source IDs.
- Scholarship canonical lookup now fails closed for an unsupported lookup target instead of permitting an implicit no-return path.

A root `tsc -b` was also attempted as an additional diagnostic. It is not accepted as runtime/typecheck proof because this source package does not contain the required installed workspace dependencies/types (`react`, `zod`, Prisma client/types, Node types and workspace package resolution among others). The authoritative source-level check for the changed P9 TypeScript set is therefore the 23/23 transpile/syntax pass plus the structural/regression verifiers above.

No live database mutation or migration execution was performed during this closure.

## Closure decision

R-042→R-055 are **14/14 source-closed** for the P9 repair-plan scope. Their matrix status is `Runtime Pending` because remaining proof requires the real dependency/database/runtime environment. P9 does not relabel unrelated later-step `Partial` rows.
