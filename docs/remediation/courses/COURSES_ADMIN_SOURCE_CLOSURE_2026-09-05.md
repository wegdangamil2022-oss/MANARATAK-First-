# MANARATAK Courses — Admin Source Closure

Date: 2026-09-05
Scope: Phase 13 / Courses administration, imported courses, MANARATAK-native courses, learner flow, academic relationships, learning paths, and owner-domain boundaries.

## Closure decision

The Courses admin surface is intentionally organized around two operational course origins only:

1. MANARATAK-native courses.
2. Imported external courses.

"Paid courses" is not a third course origin. Paid is an access mode of a MANARATAK-native course. Finance remains the owner of price, collection, settlement, and financial clearance.

Learning Paths are an organizational layer over MANARATAK-native courses, not a third course type.

## Admin information architecture

Native course editor order:

1. Basics
2. Curriculum and lessons
3. Assessments
4. Academic relationships
5. Enrollment and access
6. Completion and certificate eligibility
7. Settings and publication

The active course-admin visual system uses the MANARATAK dark green (`#044A37`), gold (`#E3B04B`), white/light neutral surfaces, Cairo-compatible typography inherited from the application shell, and semantic colors only for state/warning/error meaning.

## Academic relationship ownership

Courses own reviewed course-side discovery relationships. Public discovery never relies on unreviewed free-text fields.

### Course-owned canonical relationships

- Reference Language: canonical ReferenceLanguage relationship.
- Academic Taxonomy: automatic resolution plus explicit admin-reviewed canonical link.
- Majors: taxonomy-derived projection plus explicit admin-reviewed direct projection.
- International Tests: reviewed canonical Course ↔ InternationalTest relationship for preparation/relevance.

Only approved relationships are public/discovery eligible.

### Owner-domain boundaries retained

- Universities own programs, admissions, and accepted-test requirements. Courses do not store invented University foreign keys. Course relevance to universities is resolved through canonical majors/taxonomy/tests and owner-domain read models.
- Scholarships own eligibility, university links, and test requirements. Courses do not duplicate Scholarship-owned truth.
- Certificates/P14 owns credential issuance and verification. Courses emit completion/certificate-eligibility signals only.
- Imported-provider geography means provider headquarters only; it is not presented as a study-country relationship.

## Imported courses

Public imported-course eligibility is fail-closed and requires both:

- Study Free = Yes
- Free Certificate/Credential = Yes

The canonical direct source URL and provider provenance are source-owned and cannot be silently overwritten from Admin. Publication additionally requires source/link verification and reviewed canonical discovery relationships where applicable.

## MANARATAK-native learner path

A published native course now has a real internal learner flow:

Enrollment → Learning Workspace → Lesson Progress → Server-side Assessment Grading → Course Completion → Certificate Eligibility event.

Learner assessment payloads never expose correct answers, answer explanations, internal asset handles, or private asset metadata before submission.

Manual-grading assessment types are not publishable until a real grading workflow exists. The active editor limits creation to auto-gradable assessment types.

Completion remains server-authoritative. Trackable lessons require complete progress; assessment passing is enforced when the configured completion policy requires it.

## Learning Paths

Learning Paths have an Admin management surface and are restricted to MANARATAK-native published courses because imported external courses do not have authoritative internal lesson/completion state.

Path lifecycle supports creation, readiness, publication, archive, and server-side completion evaluation.

## Import Foundation boundary

Import Foundation remains generic:

Source → Parse → Normalize → Validate → Deduplicate → Staging → Queue/Retry/DLQ → Handoff.

Course semantic parsing/promotion decisions stay inside Course Domain. Import Foundation does not own course publication or academic relationship decisions.

## Prisma / database safety

A source-only Prisma relationship was added for Course ↔ InternationalTest:

- `CourseInternationalTestRelationship`
- migration source: `20260905033000_course_international_test_relationship/migration.sql`

The migration is included for source completeness only and was NOT executed.

Existing migration files were compared byte-for-byte with the incoming baseline and are unchanged. No database, migration, seed, or backfill command was run during this closure.

## Verification

- COURSES_ADMIN_SOURCE_CLOSURE: 88/88 PASS
- Imported Courses P5 verifier: 90/90 PASS
- P13 final source verifier: 98/98 PASS
- Import Foundation source closure: PASS
- International Tests regression closure: 37/37 PASS
- W2 source verifier: 23/23 PASS
- Source Quality: PASS
- Package dependency cycles: 0
- File dependency cycles: 0
- Accessibility findings: 0
- Modified TS/TSX syntax: 41/41 PASS
- Existing migrations changed: 0
- Existing migrations missing: 0
- New migration source files: 1 (Course ↔ InternationalTest)

## Runtime status

Prisma CLI is not installed in the supplied archive, so `prisma-source-gate` cannot execute and reports `prisma-cli-not-installed`. No implicit dependency download was permitted.

Database migration rehearsal, authenticated browser E2E, production asset-storage verification, and full runtime certification remain runtime/deployment activities. Their absence does not authorize claiming runtime certification.

## Final source status

COURSES ADMIN / DOMAIN / API / PUBLIC SOURCE CLOSURE = PASS

RUNTIME CERTIFICATION = PENDING

DATABASE MUTATIONS = 0
MIGRATION EXECUTIONS = 0
BACKFILL EXECUTIONS = 0
