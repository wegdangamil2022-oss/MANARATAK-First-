# P4 Reverse Read Model & Cross-Domain Aggregation Closure

Date: 2026-09-03  
Authority: `MANARATAK_Source_Closure_Repair_Plan_v1.0_2026-09-03` + Roadmap v6.0  
Scope: P4 only — source-level reverse read models and cross-domain aggregations.
Baseline: P3-closed full-project package `dca26ee8f0a294a59a39e8d5939c9239493d19776ba1ab98a432c1562f8be790`.

## Closure result

P4 closes R-014 through R-019 in `docs/remediation/CROSS_PHASE_RELATIONSHIP_CLOSURE_MATRIX.md` at source level. Live database/E2E proof remains `Runtime Pending` by design.

### Major → Universities (P11 owner)

- Canonical input: `majorId`.
- P11 remains the owner through `UniversityAcademicProgram.majorId`.
- Public University reads filter `academicPrograms.some` with `majorMappingState = CANONICALLY_MAPPED`, a resolved DegreeLevel, and a published linked Major.
- No Major-owned university collection was introduced.

### Major → Scholarships (P12 owner)

- Canonical input: `majorId`.
- Public reverse reads include both canonical `ScholarshipMajorTarget.majorId` and `ScholarshipEligibilityItem.majorId`.
- No source-label/name fallback is used by the P4 graph service.

### Major → Courses (P13 owner)

- Existing P13 `CourseMajorProjection` is retained.
- Public relationship reads require `projectionState = APPROVED` and `Course.status = PUBLISHED`.
- Course relationship DTOs expose `ownerId + publicId + slug` for stable graph joins.

### Country detail aggregation

- Country ISO2 resolves through P7 to the canonical country owner ID.
- Universities are read from P11 by `countryReferenceId`.
- Scholarships are read from P12 by `countryReferenceId`.
- Courses are explicitly labelled `providerHeadquartersCourses` and use P13 provider-headquarters semantics; P4 does not invent course study-country relations.
- No aggregate collection is stored in P7.

### University → Scholarships

- University identity is resolved by P11 slug to canonical University owner ID.
- University graph preserves its canonical P7 `countryReferenceId` as `countryOwnerId`.
- AcademicProgram links are emitted only when DegreeLevel is resolved and the linked Major is published.
- Scholarships are read from P12 using canonical `universityId`.

### Scholarship linked-identity graph

- Explicit University targets hydrate through P11 batch owner reads.
- AcademicProgram targets hydrate through P11 read models and preserve program owner ID, owning University identity, DegreeLevel ID, and Major owner ID.
- Major targets/eligibility hydrate through P10 batch owner reads.

## Public surfaces

- `GET /public/universities?majorId=<canonical-major-id>`
- `GET /public/scholarships?majorId=<canonical-major-id>`
- `GET /public/scholarships?universityId=<canonical-university-id>`
- `GET /public/courses?majorId=<canonical-major-id>`
- `GET /public/graph/majors/:slug`
- `GET /public/graph/universities/:slug`
- `GET /public/graph/scholarships/:slug`
- `GET /public/graph/countries/:iso2Code`

The graph route is composition-only. It owns no domain truth and performs no persistence.

## Safety constraints retained

- No Prisma schema change.
- No migration change.
- No new P10-owned University/Scholarship/Course collection.
- No Country aggregate persistence inside P7.
- No name/source-label relationship resolution in cross-domain graph reads.
- Application composition ports require the P10/P11 published batch-read capabilities; they are not treated as optional at the graph boundary.
- P4 graph/public reverse-read routes are bounded to 50 items per page; invalid public page/pageSize values are rejected before repository execution.
- Public-domain lifecycle filters remain enforced by owner repositories.

## Regression guards

- `packages/application/tests/read-models/CrossDomainGraphReadService.spec.ts`
- `packages/application/tests/read-models/P4CrossDomainSourceInvariants.spec.ts`
- `apps/api/tests/presentation/api/router/CrossDomainReadModelRouter.spec.ts`
- Existing University/Course/Major public router tests extended for canonical reverse reads.

## Runtime pending

The following are intentionally not claimed as executed in P4 without a live database/runtime environment:

- PostgreSQL execution of the new reverse query shapes.
- Real-data cardinality/performance measurements.
- Public E2E navigation through P24 UI.
- DB query-plan/index tuning based on production-scale data.

These do not require redesign of the P4 source relationships.

## Source verification evidence

- P4 cross-domain source verifier: **64/64 PASS**.
- P3 canonical backbone regression verifier: **57/57 PASS**.
- W7 University source verifier: **4/4 PASS**.
- W8 Scholarship source verifier: **12/12 PASS**.
- Source Quality gate: **PASS** with 0 package cycles, 0 file cycles, and 0 accessibility findings.
- Changed TypeScript/TSX syntax transpile: **22/22 PASS**.
- `schema.prisma`, root `package.json`, `package-lock.json`, and all 43 files under `packages/infrastructure/prisma/migrations/` remain byte-identical to the P3 baseline.
- P4 vs P3 source diff: **8 new files, 17 modified files, 0 deleted files, 2,679 unchanged files**.

A bounded local `npm ci` attempt did not complete in this execution environment, so P4 does **not** claim a fresh full-repository typecheck/build result. No dependency or generated-install artifacts were retained. Full repository CI remains the explicit P12 closure gate; this does not convert the P4 relationship source paths back to `Partial`.
