# P5 — Learning / Imported Courses Source Closure

Date: 2026-09-03  
Baseline: `MANARATAK_FINAL_P4_CLOSED_2026-09-03.zip`  
Scope: P5 only. P6 was not started.

## Closure result

P5 source closure is complete. The P13 Learning/Imported Courses boundary now has one authoritative canonical transfer path, course-owner-scoped relationship review, bounded canonical public reads, and transactional completion events that delegate credential authority to P14.

## Implemented closure

- Disabled the legacy pre-provider-registry `CourseImportPromotionUseCase`; canonical import transfer is owned by `CourseImportCoordinator`.
- Retained approved-provider, approved-domain, HTTPS/direct-page, DNS/private-address, redirect, source-identity, provenance, dedup and reviewed URL-change gates.
- Wired `CourseRelationshipResolutionService` in API DI and exposed the P13 owner review model/actions.
- Scoped taxonomy-link and Course→Major projection approval/rejection by both `courseId` and relationship ID.
- Kept `CourseMajorProjection` reviewable and public only after `APPROVED` state.
- Preserved provider headquarters as provider geography only; no invented Course study-country relation.
- Added canonical `learningLanguageReferenceId` to generic Course/public reads as a read-only relationship field.
- Replaced broad optional-field spreading in public Course DTO mapping with an explicit public allow-list.
- Bounded P13 relationship public reads to 50 records.
- Preserved server-side assessment grading: learner submissions contain answers, not score authority.
- Kept `CourseCompleted` and `LearningPathCompleted` on transactional outbox paths.
- Disabled the legacy/non-atomic direct completion publisher and removed its barrel/DI exposure.
- P13 does not generate or issue certificates; completion payloads retain P14 as certificate authority.
- Added P5 static source verifier and focused source/owner-scoping regression tests.

## Relationship matrix

- R-020: `Runtime Pending | P5 CLOSED`
- R-021: `Runtime Pending | P5 CLOSED`
- R-022: `Runtime Pending | P5 CLOSED`
- R-023 remains `Partial | P6`; delivery from durable P13 completion events into the P14 consumer is intentionally not implemented in P5.

## Non-changes

P5 does not require a Prisma schema, migration, package manifest, or dependency change. Those files must remain byte-identical to the P4 baseline.

## Validation contract

Source closure requires the P5 verifier plus prior P3/P4/W7/W8/W9/source-quality regression gates. Full dependency-backed build/typecheck remains a later full-CI gate; no such result may be claimed unless dependencies are installed and the command actually completes.

## Executed verification

- P5 verifier: **90/90 PASS**.
- P4 regression: **64/64 PASS**.
- P3 regression: **57/57 PASS**.
- W7 Universities: **4/4 PASS**.
- W8 Scholarships: **12/12 PASS**.
- W9 Learning source verifier: **13/13 PASS** plus its source-only migration gate.
- Imported-course independent Node regressions: **17/17 PASS**.
- Source Quality: **PASS**; package cycles 0, file cycles 0, accessibility findings 0.
- Modified/new TypeScript syntax: **19/19 PASS** using TypeScript transpilation diagnostics.
- Relationship matrix after P5: 37 Runtime Pending, 28 Partial, 2 Missing, 1 Source Closed (68 rows total).
- Against the P4 baseline: 3 new files, 19 modified, 0 deleted, 2,685 unchanged; total project files 2,707.
- `schema.prisma`, `package.json`, `package-lock.json`, and all 43 migration files are byte-identical to P4.
- No `node_modules` and no `.tsbuildinfo` are included.

No fresh full dependency-backed build/typecheck is claimed in this P5 package because the inherited source package contains no installed `node_modules`. The plan retains full source CI as a later formal gate.
