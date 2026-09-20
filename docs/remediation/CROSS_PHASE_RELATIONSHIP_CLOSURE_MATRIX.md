# Cross-Phase Relationship Closure Matrix

**Status:** ACTIVE — SOURCE_REBASELINED / RUNTIME_EVIDENCE_PENDING  
**Version:** 3.0.0-source-rebaselined  
**Status date:** 2026-09-07  
**Architecture authority:** Roadmap v6.0 + P1-closed Enterprise architecture models  
**Source baseline:** W0–W6 source closure evidence plus W7 documentation/source rebaseline. The distributed ZIP contains no trustworthy upstream `.git` metadata; commit/PR attestation remains an external governance evidence item and is not fabricated.
**Scope:** enterprise material relationships P05–P24 plus relevant P01–P04 governance/foundation dependencies; no live DB mutation or runtime certification.

## 1. Authority and use

This is the **single active Cross-Phase Relationship Source-Rebaseline Register**. W0–W6 source closure evidence and W7 verification establish the current source boundary. `Runtime Pending` is intentionally retained wherever the remaining proof requires DB/provider/deployment/browser execution. Historical closure-step labels remain provenance only and never override the current `Status` column.

Rules applied while building this matrix:

1. Roadmap v6.0 and the P1-closed architecture ownership artifacts control ownership.
2. A relationship is not `Source Closed` merely because a Prisma field/table exists. Domain contract → application/query → repository → API/read model → relevant consumer surface must be traceable.
3. Canonical ID is the final relationship identity whenever one exists. Text/source labels may remain provenance or review input, not final production identity.
4. `Runtime Pending` is used only where the source path is closed enough that the remaining proof requires the real DB/environment.
5. `Partial` means at least one required source edge is missing, legacy/text/synthetic behavior remains, or a consumer/delivery adapter is not wired.
6. `Missing` means an important required cross-phase relation has no usable source contract/path yet.
7. P23 is a control-plane consumer and P24 is a public-composition consumer; neither becomes owner of domain truth.
8. P22 owns product-experience principles only; no business-data repository is invented for it.

## 2. Status vocabulary

| Status | Meaning |
| --- | --- |
| **Missing** | Required relationship/source edge is absent. |
| **Partial** | Some source layers exist, but at least one contract/wiring/identity/consumer edge is incomplete or unsafe. |
| **Source Closed** | All source obligations for this relationship are closed and source-proven; no DB/runtime proof is required for the stated relation. |
| **Runtime Pending** | Source relationship is closed; remaining verification requires the real DB/environment/E2E runtime. |
| **Source Rebaselined** | Source relationship has been reconciled to current code/tests; remaining external proof, if any, is stated separately. |

### Explicit non-ownership boundaries

- **P6 is not a canonical business-data owner:** its generic import mechanics are outside this P7–P24 relationship matrix; canonicalization/publish relationships are recorded under the owning domain.
- **Broad university/scholarship application processing remains unassigned:** Roadmap v6.0/P1 authority does not assign that broad workflow to P12 or P15, so this matrix does not invent an owner or API/event edge for it.
- **P23/P24 are consumers/composers:** Admin and Public appear as consumers of owner contracts; they are not used as business-truth owners.

## 3. Source evidence index

The table uses these compact evidence keys. Each key points to current repository source, not a historical report.

- `REF-D`: `packages/domain/src/reference-data/`; `REF-A`: `packages/application/src/reference-data/`; `REF-R`: `packages/infrastructure/src/reference-data/PrismaReferenceDataRepository.ts`; `REF-T`: reference-data domain/application/infrastructure tests.
- `TAX-D`: `packages/domain/src/academic-taxonomy/`; `TAX-R`: `packages/infrastructure/src/academic-taxonomy/PrismaAcademicTaxonomyRepository.ts`; `TAX-T`: academic-taxonomy tests.
- `DEG-D`: `packages/domain/src/degree-level/`; `DEG-R`: `packages/infrastructure/src/degree-level/DegreeLevelRepository.ts`; `DEG-T`: DegreeLevel tests including `packages/domain/tests/degree-level/CrossPhaseDegreeLevelContract.spec.ts`.
- `TEST-D`: `packages/domain/src/tests-platform/`; `TEST-A`: `packages/application/src/tests-platform/`; `TEST-R`: `packages/infrastructure/src/international-tests/PrismaInternationalTestRepository.ts`; `TEST-T`: International Test tests.
- `MAJ-D`: `packages/domain/src/majors/`; `MAJ-A`: `packages/application/src/majors/`; `MAJ-R`: `packages/infrastructure/src/majors/PrismaMajorRepository.ts`; `MAJ-T`: Major tests.
- `UNI-D`: `packages/domain/src/universities/`; `UNI-A`: `packages/application/src/universities/`; `UNI-R`: `packages/infrastructure/src/universities/PrismaUniversityRepository.ts` + `UniversityCanonicalRelationshipValidator.ts`; `UNI-T`: University tests.
- `SCH-D`: `packages/domain/src/scholarships/`; `SCH-A`: `packages/application/src/scholarships/`; `SCH-R`: `packages/infrastructure/src/scholarships/PrismaScholarshipRepository.ts`; `SCH-T`: Scholarship tests including `NormalizedScholarshipSchema.spec.ts`.
- `COURSE-D`: `packages/domain/src/courses/`; `COURSE-A`: `packages/application/src/courses/`; `COURSE-R`: `packages/infrastructure/src/courses/`; `COURSE-T`: Course/import/relationship tests.
- `CERT-D`: `packages/domain/src/certificates/`; `CERT-A`: `packages/application/src/certificates/`; `CERT-R`: `packages/infrastructure/src/certificates/PrismaCertificateRepository.ts`.
- `STU-D`: `packages/domain/src/students/`; `STU-R`: `packages/infrastructure/src/students/PrismaStudentWorkspaceRepository.ts`.
- `CMS-D`: `packages/domain/src/cms/`; `CMS-A`: `packages/application/src/cms/`; `CMS-R`: `packages/infrastructure/src/cms/PrismaCmsRepository.ts`.
- `AI-D`: `packages/domain/src/ai-platform/`; `AI-A`: `packages/application/src/ai-platform/`; `AI-R`: `packages/infrastructure/src/ai-platform/`.
- `TOOLS-D`: `packages/domain/src/student-tools/`; `TOOLS-A`: `packages/application/src/student-tools/`; gateways/repository: `packages/infrastructure/src/student-tools/`.
- `FIN-D`: `packages/domain/src/finance-platform/`; `FIN-A`: `packages/application/src/finance-platform/`; `FIN-R`: `packages/infrastructure/src/finance-platform/`.
- `SVC-D`: `packages/domain/src/services-platform/`; `SVC-A`: `packages/application/src/services-platform/`; `SVC-R`: `packages/infrastructure/src/services-platform/PrismaServicePlatformRepository.ts`; canonical-reference and finance adapters: `packages/infrastructure/src/services-platform/ServicePlatformGateways.ts`.
- `CAREER-D`: `packages/domain/src/career-alumni/`; `CAREER-A`: `packages/application/src/career-alumni/`; `CAREER-R`: `packages/infrastructure/src/career-alumni/PrismaCareerRepository.ts`; canonical geography adapter: `packages/infrastructure/src/career-alumni/CareerReferenceGateway.ts`.


## W7 rebaseline decision

- W0–W6 source gates are inherited as previously closed evidence; W7 does not reimplement those waves.
- No material cross-phase row remains `Rebaseline Open` after W7.
- Source-complete relationships that still require an external database, provider, deployment control plane, browser, telemetry collector or recovery environment are `Runtime Pending`.
- This matrix does not declare whole-platform `PRODUCTION_READY`.
- P23/P24 authority is synchronized in `P23_P24_REBASELINE_TRACEABILITY.md`.

## 4. Enterprise rebaseline extension register

The following material edges were absent from the former P7–P24-only “final” scope or were reopened by the v0.68 remediation audit. These rows take precedence over any historical closure wording below.

| ID | Owner | Consumer | Material relationship | Finding roots | Current status | Required proof before closure |
| --- | --- | --- | --- | --- | --- | --- |
| X-001 | P05 Identity | P15 Student | Identity creation/activation → Student Workspace auto-provisioning | `MNT-AUD-0016`, `0076` | Runtime Pending | Versioned Identity transactional-outbox producer, durable lease-fenced delivery and idempotent P15 projection are source-wired; disposable DB/crash-window E2E remains pending. |
| X-002 | P05 EAP | P11/P12/P14/P15/P16/P21/P23 | Asset reference validity, security/lifecycle checks, Admin Asset Center/picker, purge safety | `MNT-AUD-0011`, `0026`, `0030`, `0050` | Runtime Pending | Source adapters/policy/Admin controls are closed; provider sandbox, real storage/security pipeline and DB/browser purge/reference E2E remain pending. |
| X-003 | P06 Import | Owner domains | Durable raw snapshots, retry/reclaim worker, semantic handoff into owning domains | `MNT-AUD-0012`, `0086` | Runtime Pending | Durable raw provider plus recurring import retry/reclaim handler are source-wired; provider/DB crash-restart and owner-handoff E2E remain pending. |
| X-004 | P05 Identity/Auth | P17/P18/P19/P20/P21/P23 | Authenticated principal, active identity/session revocation, control-plane guards | `MNT-AUD-0062`, `0065`, `0071`, `0076`, `0105` | Runtime Pending | Source auth/session/active-identity guards are closed; deployed multi-session revocation/concurrency and browser/runtime proof remain pending. |
| X-005 | Event/Worker foundation | P13/P14/P15/P16/P17/P19/P20/P21 | Transactional outbox → dispatcher/worker → consumer/inbox with retry/fencing | `MNT-AUD-0007`, `0068`, `0080`, `0093`, `0016`, `0017`, `0054`, `0060`, `0077`, `0089` | Runtime Pending | PostgreSQL worker/outbox fencing, owner producers, handlers, idempotent projections, retry/DLQ source and worker health are wired; disposable DB/provider multi-instance/crash evidence remains pending. |
| X-006 | P23 Admin | All owner domains | Permission-aware owner actions, immutable audit, validation, exhaustive queues and result states | `MNT-AUD-0020`, `0021`, `0033`, `0036`, `0044`, `0064`, `0084`, `0110`, `0111`, `0112` | Runtime Pending | Source action parity, permissions, audit, validation and queue behavior are closed; deployed Admin/browser/DB evidence remains pending. |
| X-007 | P24 Public | Owner read APIs | Complete pagination/search, truthful relationships/facts, locale, SEO and course identity composition | `MNT-AUD-0022`, `0024`, `0025`, `0028`, `0029`, `0037`, `0069`, `0100` | Runtime Pending | Source pagination/search/fact/locale/SEO/identity composition is closed; deployed crawl, owner-runtime and browser evidence remain pending. |
| X-008 | P18 Student Tools | P15 Student/Public handoff | Optional authenticated ownership, distributed quotas, public→student save handoff | `MNT-AUD-0107`, `0113` | Runtime Pending | Optional-auth/ownership/save source flow is closed; distributed quota/provider and deployed unauth→auth/browser evidence remain pending. |

## 5. Source-rebaselined relationship rows

> **W7 authority:** the `Status` column below is current source truth. `Closure step` is historical provenance only. Rows marked `Runtime Pending` are source-closed for the stated relationship but still require external DB/provider/browser evidence.


| ID | Owner | Consumer | Relationship / owner truth | Canonical identity | Domain contract | Application / query contract | Repository mapping | API / read-model DTO | Admin editor | Public navigation | Student hydration | Event / projection | Source tests | Status | Closure step |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-001 | P7 | P9 | International Test geography/language references | Reference IDs/codes; persisted IDs are authoritative | `REF-D`; `TEST-D` | `REF-A`; `TEST-A` canonical resolver | `REF-R`; `TEST-R` | `ReferenceDataPublicRouter`; `InternationalTest*Router` | See R-042/R-044 | See R-056/R-058 | N/A | N/A | `REF-T`; `TEST-T` | Runtime Pending | P3 CLOSED |
| R-002 | P8 | P9 | International Test taxonomy + DegreeLevel references | `taxonomyNodeId`; `degreeLevelId` | `TAX-D`; `DEG-D`; `TEST-D` | `InternationalTestCanonicalRelationshipService` | `TAX-R`; `DEG-R`; `TEST-R` | `AcademicTaxonomy*Router`; `InternationalTest*Router` | See R-043/R-044 | See R-057/R-058 | N/A | N/A | `TAX-T`; `DEG-T`; `TEST-T` | Runtime Pending | P3 CLOSED |
| R-003 | P8 | P10 | Major taxonomy + DegreeLevel mapping | Canonical taxonomy node IDs; `degreeLevelId` | `TAX-D`; `DEG-D`; `MAJ-D` | `CanonicalMajorReferenceService` | `TAX-R`; `DEG-R`; `MAJ-R` | `AcademicTaxonomy*Router`; `Major*Router` | See R-043/R-045 | See R-057/R-059 | See R-024 | N/A | `MAJ-T`; `DEG-T` | Runtime Pending | P3 CLOSED |
| R-004 | P7 | P11 | University geography + currency references | `countryReferenceId`; `regionReferenceId`; `cityReferenceId`; currency reference IDs | `REF-D`; `UNI-D` | University use cases + `UniversityCanonicalRelationshipValidator` | `REF-R`; `UNI-R` | `ReferenceData*Router`; `University*Router` | See R-042/R-046 | See R-056/R-060 | See R-025 | N/A | `UNI-T`; `REF-T` | Runtime Pending | P3 CLOSED |
| R-005 | P8 | P11 | AcademicProgram DegreeLevel | `degreeLevelId` | `DEG-D`; `UNI-D` | University import/change-plan validation | `DEG-R`; `UNI-R` | `University*Router` | See R-046 | See R-060 | See R-025 | N/A | `UNI-T`; `DEG-T` | Runtime Pending | P3 CLOSED |
| R-006 | P10 | P11 | AcademicProgram Major mapping | `majorId`; `majorMappingState` | `MAJ-D`; `UNI-D` | University import/change-plan validation | `MAJ-R`; `UNI-R` | `Major*Router`; `University*Router` | See R-045/R-046 | See R-059/R-060 | See R-024/R-025 | N/A | `UNI-T`; `MAJ-T` | Runtime Pending | P3 CLOSED |
| R-007 | P9 | P11 | Program admission test requirements | `internationalTestId`; `academicProgramId` | `TEST-D`; `UNI-D` | University requirement validation | `TEST-R`; `UNI-R` | `InternationalTest*Router`; `University*Router` | See R-044/R-046 | See R-058/R-060 | See R-025 | N/A | `UNI-T`; `TEST-T` | Runtime Pending | P3 CLOSED |
| R-008 | P7 | P12 | Scholarship country/language/currency references | Canonical reference IDs; source labels provenance-only | `REF-D`; `SCH-D` | Scholarship canonical resolution/import transfer | `REF-R`; `SCH-R` | `Scholarship*Router` filters by canonical country/language/currency IDs; legacy text remains provenance/draft compatibility only | See R-042/R-047 | See R-056/R-061 | See R-026 | N/A | `SCH-T`; `REF-T`; P3 verifier | Runtime Pending | P3 CLOSED |
| R-009 | P8 | P12 | Scholarship DegreeLevel targets/eligibility | `degreeLevelId` | `DEG-D`; `SCH-D` | Scholarship canonical resolution/import transfer | `DEG-R`; `SCH-R` final relation filtering uses `degreeLevelId` | `Scholarship*Router` accepts canonical `degreeLevelId`; text degree input is not a final relation filter | See R-047 | See R-061 | See R-026 | N/A | `SCH-T`; `DEG-T`; P3 verifier | Runtime Pending | P3 CLOSED |
| R-010 | P10 | P12 | Scholarship Major targets/eligibility | `majorId` | `MAJ-D`; `SCH-D` | Scholarship canonical resolution/import transfer | `MAJ-R`; `SCH-R` filters canonical major targets | Public owner API exposes canonical `majorId` filter | See R-045/R-047 | See R-061 | See R-024/R-026 | N/A | `SCH-T`; `MAJ-T`; P3 verifier | Runtime Pending | P3 CLOSED |
| R-011 | P9 | P12 | Scholarship InternationalTest requirements | `internationalTestId` | `TEST-D`; `SCH-D` | Scholarship canonical resolution/import transfer | `TEST-R`; `SCH-R` filters eligibility/doc requirements by canonical Test ID | Public owner API exposes canonical `internationalTestId` filter and DTO retains the canonical requirement ID | See R-044/R-047 | See R-061 | See R-026 | N/A | `SCH-T`; `TEST-T`; P3 verifier | Runtime Pending | P3 CLOSED |
| R-012 | P11 | P12 | Scholarship target University links | `universityId` | `UNI-D`; `SCH-D` | Scholarship canonical resolver + transfer | `UNI-R`; `SCH-R` persists/filters canonical University links | Scholarship DTO/read model retains `universityId`; public owner API exposes canonical `universityId` filter | See R-046/R-047 | See R-060/R-061 | See R-025/R-026 | N/A | `SCH-T`; `UNI-T`; P3 verifier | Runtime Pending | P3 CLOSED |
| R-013 | P11 | P12 | Scholarship target AcademicProgram links | `academicProgramId` | `UNI-D`; `SCH-D` | Resolver requires explicit canonical AcademicProgram ID; atomic transfer persists the resolved ID | `UNI-R`; `SCH-R` persists/filters `academicProgramId` | Public owner API exposes `academicProgramId`; Admin Import Center exposes AcademicProgram resolution decisions | See R-046/R-047 | See R-060/R-061 | See R-025/R-026 | N/A | `SCH-T`; `UNI-T`; P3 verifier | Runtime Pending | P3 CLOSED |
| R-014 | P11 | P10 | Major → Universities reverse read model | Canonical `majorId`; University `ownerId/publicId/slug` | `UNI-D` owns AcademicProgram relation | `IUniversityRepository.listPublished({ majorId })`; `CrossDomainGraphReadService` | `UNI-R` filters `academicPrograms.some.majorId` with `CANONICALLY_MAPPED` | `GET /public/universities?majorId=...`; `GET /public/graph/majors/:slug` | N/A | P24-ready graph projection; no P10-owned collection | N/A | Query projection only; no duplicate persistence | P4 graph/unit/source tests + `UNI-T` | Runtime Pending | P4 CLOSED |
| R-015 | P12 | P10 | Major → Scholarships reverse read model | Canonical `majorId`; Scholarship `ownerId/publicId/slug` | `SCH-D` owns major targets + eligibility | `IScholarshipRepository.listPublished({ majorId })`; `CrossDomainGraphReadService` | `SCH-R` filters both `majorTargets` and canonical `eligibilityItems` | `GET /public/scholarships?majorId=...`; `GET /public/graph/majors/:slug` | N/A | P24-ready graph projection | N/A | Query projection only | P4 graph/unit/source tests + `SCH-T` | Runtime Pending | P4 CLOSED |
| R-016 | P13 | P10 | Major → Courses reverse read model | Canonical `majorId`; Course `ownerId/publicId/slug` | `COURSE-D` `CourseMajorProjection` | `CourseRelationshipQueryService.listPublishedCoursesForMajor`; `CrossDomainGraphReadService` | `COURSE-R` requires `projectionState=APPROVED` and `Course.status=PUBLISHED` | `GET /public/courses?majorId=...`; `GET /public/graph/majors/:slug` | N/A | P24-ready graph projection | N/A | Existing P13 projection; no P10 copy | P4 graph/source tests + `COURSE-T` | Runtime Pending | P4 CLOSED |
| R-017 | P11 | P7 | Country → Universities reverse read model | Canonical country ID resolved from ISO2; University `ownerId/publicId/slug` | `REF-D`; `UNI-D` | `CrossDomainGraphReadService` composes owner query | `REF-R` resolves ISO2→ID; `UNI-R` filters `countryReferenceId` | Existing country-university endpoint + `GET /public/graph/countries/:iso2Code` | N/A | P24-ready country graph; not stored in P7 | N/A | Query aggregation only | P4 graph/source tests + `ReferenceDataPublicRouter.spec.ts` | Runtime Pending | P4 CLOSED |
| R-018 | P12 | P7 | Country → Scholarships reverse read model | Canonical `countryReferenceId`; Scholarship `ownerId/publicId/slug` | `REF-D`; `SCH-D` | `CrossDomainGraphReadService` + P12 owner query | `SCH-R` public path filters canonical `countryReferenceId` | `GET /public/scholarships?countryReferenceId=...`; `GET /public/graph/countries/:iso2Code` | N/A | P24-ready country graph; not stored in P7 | N/A | Query aggregation only | P4 graph/source tests + `SCH-T` | Runtime Pending | P4 CLOSED |
| R-019 | P12 | P11 | University → Scholarships reverse read model | Canonical `universityId`; Scholarship `ownerId/publicId/slug` | `SCH-D` owns university links | `IScholarshipRepository.listPublished({ universityId })`; `CrossDomainGraphReadService` | `SCH-R` filters canonical `universityLinks.some.universityId` | `GET /public/scholarships?universityId=...`; `GET /public/graph/universities/:slug` | N/A | P24-ready connected graph | N/A | Query projection only | P4 graph/unit/source tests + `SCH-T` | Runtime Pending | P4 CLOSED |
| R-020 | P7 | P13 | Course language/provider geography references | Canonical `learningLanguageReferenceId`; provider HQ `countryReferenceId`; provider HQ is not study-country | `REF-D`; `COURSE-D` relationships | `CourseRelationshipResolutionService` + owner review model | `REF-R`; `COURSE-R` validates active ReferenceLanguage and approved provider HQ references | Course public filters use canonical language/provider-HQ IDs; Course admin owner API exposes analyze/review/read-model endpoints | See R-048 | See R-062 | See R-027 | Relationship review projection only | P5 verifier + Course relationship tests | Runtime Pending | P5 CLOSED |
| R-021 | P8 | P13 | Course taxonomy links | Canonical `taxonomyNodeId`; raw topics remain provenance/input only | `TAX-D`; `COURSE-D` relationships | `CourseRelationshipResolutionService` exact-candidate proposal + explicit review | `TAX-R`; `COURSE-R` persists review state and invalidates stale source-term links | Course public filter reads APPROVED taxonomy links only; Course admin owner API exposes scoped approve/reject | See R-048 | See R-062 | See R-027 | P13-owned relationship projection | P5 verifier + relationship tests | Runtime Pending | P5 CLOSED |
| R-022 | P10 | P13 | Course Major projection | Canonical P10 `majorId`; projection lineage retains taxonomy/mapping IDs | `MAJ-D`; `COURSE-D` | `CourseRelationshipResolutionService.projectMajors` + scoped review | `MAJ-R`; `COURSE-R` persists `CourseMajorProjection` and public reads require `APPROVED` | Course public `majorId` filter + Course admin owner projection/review API | See R-045/R-048 | See R-059/R-062 | See R-024/R-027 | P13-owned `CourseMajorProjection`; no P10 reverse collection | P5 verifier + relationship tests | Runtime Pending | P5 CLOSED |
| R-023 | P13 | P14 | Learning completion → certificate issuance | Durable outbox `eventId`; canonical Course/LearningPath ID; `studentReferenceId` | `CourseCompletedEvent`; `LearningPathCompletedEvent`; P14 trust/lifecycle contracts | P13 transactional completion emission → filtered `CertificateCompletionOutboxWorker` → `CertificateCompletionOutboxDeliveryGateway` → `CertificateCompletionEventConsumer` → `CertificateUseCases` | Filtered transactional outbox + P14 `CertificateIssuanceInbox` idempotency receipt + `PrismaCertificateRepository` | Explicit opt-in worker bootstrap exists; no synchronous issue HTTP route | See R-049 | P14 `CertificateReadModelService.verifyPublic` | See R-028 | Stable outbox ID is the delivery idempotency key; P14 emits its own certificate lifecycle events | P13 atomic-outbox tests + P14 delivery/idempotency/verification/revocation/read-model tests + P6 verifier | Runtime Pending | P6 CLOSED |
| R-024 | P10 | P15 | Saved Major reference + hydration | `StudentSavedItem.entityId` is canonical Major ID; slug/display are owner-read output | `MAJ-D`; `STU-D` saved-item + hydration contracts | `StudentWorkspaceUseCases.saveItem` stores reference only; `StudentSavedItemHydrationService` hydrates owner truth | `STU-R` + `MajorStudentSavedItemHydrationGateway` using `IMajorRepository` | `/student/saved-items/hydrated` returns owner read model and lifecycle availability | N/A | N/A | Live Student Vault consumes hydrated owner display/slug; unavailable owner fails closed | Reference-only P15 state; no reverse ownership | P13 source verifier + Student workspace/Major contracts | Runtime Pending | P13 FINAL |
| R-025 | P11 | P15 | Saved University reference + hydration | Canonical University ID; slug/display hydrated from owner | `UNI-D`; `STU-D` | Reference-only save + `StudentSavedItemHydrationService` | `STU-R` + `UniversityStudentSavedItemHydrationGateway` using `IUniversityRepository` | `/student/saved-items/hydrated` | N/A | N/A | Live Student Vault consumes University owner read model and publication availability | Reference-only P15 state | P13 source verifier + Student workspace/University contracts | Runtime Pending | P13 FINAL |
| R-026 | P12 | P15 | Saved Scholarship reference + hydration | Canonical Scholarship ID; slug/display hydrated from owner | `SCH-D`; `STU-D` | Reference-only save + `StudentSavedItemHydrationService` | `STU-R` + `ScholarshipStudentSavedItemHydrationGateway` using `IScholarshipRepository` | `/student/saved-items/hydrated` | N/A | N/A | Live Student Vault consumes Scholarship owner read model and publication availability | Reference-only P15 state | P13 source verifier + Student workspace/Scholarship contracts | Runtime Pending | P13 FINAL |
| R-027 | P13 | P15 | Learning progress/completion owner read | Canonical Course ID + `studentReferenceId`; enrollment ID remains P13-owned | `COURSE-D`; `STU-D` read DTO | `StudentDashboardHydrationService` calls `IStudentLearningReadGateway`; no P15 learning truth ownership | P13 `ICourseProgressRepository.listEnrollmentsByStudent` + `CourseStudentDashboardReadGateway` + Course owner repository | `/student/dashboard` and `/:studentReferenceId/dashboard` use hydrated service | N/A | N/A | Live P15 dashboard reads P13 course progress and degrades explicitly on owner-read failure | Completion events remain P13-owned; P15 event projection is compatibility evidence, not required fan-out | P13 source verifier + Course/Student contracts | Runtime Pending | P13 FINAL |
| R-028 | P14 | P15 | Certificate owner read | Certificate/public/verification IDs + `studentReferenceId` | P14 `StudentCertificateReadModelDto`; `STU-D` projection DTO | `StudentDashboardHydrationService` calls `IStudentCertificateReadGateway` | P14 `CertificateReadModelService.listForStudent` through `CertificateStudentDashboardReadGateway` | `/student/dashboard` and `/:studentReferenceId/dashboard` expose hydrated certificate rows | N/A | N/A | Live P15 dashboard reads P14 lifecycle/verification truth; no certificate issuance logic in P15 | P14 lifecycle events remain P14-owned | P13 source verifier + P14/P15 read-model tests | Runtime Pending | P13 FINAL |
| R-029 | P16 | P15 | Saved CMS content reference + hydration | Canonical CMS content ID/slug | `CMS-D`; `STU-D` includes `CMS_CONTENT` saved-item type | `StudentSavedItemHydrationService` + CMS owner hydration contract | `STU-R`; `CmsStudentSavedItemHydrationGateway` reads P16 owner truth | `StudentWorkspaceRouter /saved-items/hydrated` | N/A | N/A | P15 stores reference only; P16 adapter hydrates current published owner read model | Workspace remains reference owner only | CMS + StudentWorkspace + P8 source verifier | Runtime Pending | P8 CLOSED |
| R-030 | P18 | P15 | Save Student Tool execution result privately | Execution ID; `studentReferenceId`; Student Tool identity | `TOOLS-D`; `STU-D` | `Phase15StudentToolSaveGateway` + Student Tool execution use cases | `STU-R`; tool registry repo | StudentTools public execution/save API path is source-wired | N/A | Tool live page calls explicit save | Private workspace result save gateway implemented | Explicit save action, no ownership transfer | Student Tool pipeline + StudentWorkspace + P8 source verifier | Runtime Pending | P8 CLOSED |
| R-031 | P20 | P15 | Services private view/request/fulfillment state | Service public ID + service-request public ID; studentReferenceId scoped privately | `SVC-D`; `STU-D` has `SERVICE` saved type | `StudentServiceRequestUseCases`; `StudentSavedItemHydrationService` | `SVC-R`; `ServiceStudentSavedItemHydrationGateway`; `STU-R` keeps references only | Student workspace service request/read routes are source-wired | N/A | N/A | P15 composes P20 owner read state without copying service truth | P20 request status remains owner truth | Service + StudentWorkspace + P8 source verifier | Runtime Pending | P8 CLOSED |
| R-032 | P19 | P15 | Student finance invoices/payments read model | `studentReferenceId`; invoice/payment public IDs | `FIN-D`; `STU-D` consumer surface | `FinanceStudentUseCases` | `FIN-R` | Authenticated `StudentWorkspaceRouter` finance routes | N/A | N/A | Finance owner read model returned through student API | Read-only composition; finance remains owner | FinanceStudentUseCases + StudentWorkspaceRouter + P8 source verifier | Runtime Pending | P8 CLOSED |
| R-033 | P15 | P24 | Authenticated Student Workspace surface | Server session identity + canonical saved entity references | `STU-D`; Auth session contract | `StudentWorkspaceUseCases` + `StudentDashboardHydrationService` | `STU-R` plus owner-read gateways; personal state remains API-backed | Auth `/login` `/me` `/logout`; protected Student Workspace APIs including hydrated saved items | N/A | P24 live mode mounts `LiveStudentAuthPage` / `LiveStudentWorkspacePage`; prototype auth/workspace only in explicit prototype mode | Live account/favorites/journey consume P15 APIs; local preview state is not live source of truth | Workspace/domain owner reads; no localStorage authority | P13 source verifier + Student API/UI contract checks | Runtime Pending | P13 FINAL |
| R-034 | P7 | P19 | Canonical finance currency projection | ISO 4217 code resolved to canonical active P7 currency | `REF-D`; `FIN-D` `IFinanceCurrencyReferenceGateway` | Finance requires canonical currency before operations | `PrismaFinanceCurrencyReferenceGateway` + `FIN-R` | Finance Admin/API uses application contract | See R-053 | No public finance surface | See R-032 | N/A | Finance core/provider + reference + P8 source verifier | Runtime Pending | P8 CLOSED |
| R-035 | P7 | P20 | Service supported countries/languages | Canonical P7 country/language IDs are relationship truth; labels compatibility-only | `REF-D`; `SVC-D` typed contracts | `AdminServiceCatalogUseCases` resolves canonical refs through `IServiceReferenceGateway` | `SVC-R` join tables FK to P7; `CanonicalServiceReferenceGateway` | Service admin/public DTOs carry canonical reference IDs | See R-054 | See R-066 | See R-031 | N/A | Service + ReferenceData + P8 source verifier | Runtime Pending | P8 CLOSED |
| R-036 | P7 | P21 | Career geography | Canonical Country/City IDs are final geography identity; text retained as source/display compatibility only | `REF-D`; `CAREER-D` | Career admin/public use cases resolve geography through `ICareerReferenceGateway` | `CAREER-R` FK to P7 + `CanonicalCareerReferenceGateway` | Career admin/public routers accept/filter canonical geography IDs | See R-055 | See R-067 | N/A | N/A | Career + ReferenceData + P8 source verifier | Runtime Pending | P8 CLOSED |
| R-037 | P11 | P18 | University comparison tool | University `publicId` inputs | `UNI-D`; `TOOLS-D` gateway contract | `CanonicalUniversityComparisonGateway` | `UNI-R`; tool registry repo | Student Tools API executes tool handler | N/A | Live `/tools` feature exists | Optional private save via R-030 | Synchronous owner read gateway | Phase18 StudentTools + University + P8 source verifier | Runtime Pending | P8 CLOSED |
| R-038 | P12 | P18 | Scholarship recommendation tool | Canonical country/degree/language refs drive candidate query; P12 remains scholarship truth | `SCH-D`; `TOOLS-D` gateway contract | `CanonicalScholarshipRecommendationGateway` resolves P7/P8 refs then queries P12 | `SCH-R` published query receives canonical filters; labels are display-only | Student Tools API executes handler | N/A | Live `/tools` feature exists | Optional private save via R-030 | P17 may rank/enrich but cannot invent scholarship truth | Phase18 + Scholarship + P8 source verifier | Runtime Pending | P8 CLOSED |
| R-039 | P15 | P18 | Student context for tools | `studentReferenceId` + minimal private workspace context; no domain truth copied | `TOOLS-D` `IStudentContextGateway`; `STU-D` owns workspace context | Scholarship recommendation handler consumes context only when authenticated | `Phase15StudentContextGateway` reads P15 workspace repository | DI wires context gateway into Student Tool handler | N/A | Tools can enrich missing preferences from authenticated P15 context | Minimal projection only; P18 does not own workspace state | N/A | Phase18 + StudentWorkspace + P8 source verifier | Runtime Pending | P8 CLOSED |
| R-040 | P17 | P18 | AI execution for Student Tools | Tool execution ID/correlation + P17 model/provider identity | `AI-D`; `TOOLS-D` `IEnterpriseAIConsumerGateway` | `Phase17StudentToolsAIConsumerGateway` | `AI-R`; tool registry repo | AIGateway + StudentTools routers | See R-051/R-052 | Tool execution surface | Optional private save via R-030 | P17 is sole AI execution gateway; no provider SDK in P18 | AI + Phase18 + P8 source verifier | Runtime Pending | P8 CLOSED |
| R-041 | P20 | P19 | Service request/fulfillment → payment/invoice handoff | Service request public ID becomes P19 `originReferenceId`; P19 owns money/invoice truth | `SVC-D`; `FIN-D` | `AdminServiceFulfillmentUseCases` delegates invoice creation through `IServiceFinanceGateway` | `SVC-R`; `Phase19ServiceFinanceGateway` calls P19 application authority; `FIN-R` remains finance persistence | Service admin fulfillment endpoint can request P19 draft invoice and link returned finance identity | See R-054 | See R-066 | See R-031/R-032 | Explicit service-finance handoff; no P20 ledger/payment logic | Finance + Service + P8 source verifier | Runtime Pending | P8 CLOSED |
| R-042 | P7 | P23 | Admin reference-data management/selectors | Canonical reference IDs/codes | `REF-D` | `REF-A` | `REF-R` | `ReferenceDataAdminRouter` | Unified canonical picker consumes owner API and writes canonical IDs; blocked lifecycle/not-found states are explicit | N/A | N/A | N/A | ReferenceData admin/API + P9 verifier | Runtime Pending | P9 CLOSED |
| R-043 | P8 | P23 | Admin taxonomy/DegreeLevel management/selectors | Taxonomy node ID; DegreeLevel ID/code | `TAX-D`; `DEG-D` | Taxonomy/Degree application services | `TAX-R`; `DEG-R` | `AcademicTaxonomyAdminRouter` | Existing taxonomy/DegreeLevel owner surfaces are reused by canonical picker flows; no Admin-side business ownership | N/A | N/A | N/A | AcademicTaxonomy admin tests + P9 verifier | Runtime Pending | P9 CLOSED |
| R-044 | P9 | P23 | Admin International Test management/selectors | Stable Test ID/slug + canonical refs | `TEST-D` | `TEST-A` | `TEST-R` | `InternationalTestAdminRouter` | Existing International Test owner surfaces are consumed by canonical selectors/editors | N/A | N/A | N/A | InternationalTest admin/API tests + P9 verifier | Runtime Pending | P9 CLOSED |
| R-045 | P10 | P23 | Admin Major management/selectors | Canonical Major ID/public identity + taxonomy refs | `MAJ-D` | `MAJ-A` | `MAJ-R` | `MajorAdminRouter` | Existing Major owner surfaces are reused by canonical selectors; Admin stores IDs, not labels as relationship truth | N/A | N/A | N/A | Major admin/API tests + P9 verifier | Runtime Pending | P9 CLOSED |
| R-046 | P11 | P23 | Admin University + AcademicProgram relationship authoring | Canonical country/region/city/degree/major/test IDs; stable AcademicProgram ID | `UNI-D` | `UNI-A` stable AcademicProgram create/update/archive use cases | `UNI-R` preserves Program ID on update and archives instead of hard-delete | `UniversityAdminRouter` canonical geography + `/academic-programs` owner endpoints | `UniversityRelationshipEditorPage` authors geography and per-program Degree/Major/Test relationships through owner APIs only | N/A | N/A | N/A | University admin/API + validator tests + P9 verifier | Runtime Pending | P9 CLOSED |
| R-047 | P12 | P23 | Admin Scholarship relational authoring | Canonical country/university/program/major/degree/language/test/currency IDs | `SCH-D` | `AdminScholarshipUseCases.replaceCanonicalRelationships` + canonical lookup gateway | `SCH-R` + canonical lookup adapter | `ScholarshipAdminRouter /:id/canonical-relationships` | `ScholarshipRelationshipEditorPage` performs canonical relational authoring and rejects inactive/not-found refs through owner application authority | N/A | N/A | N/A | Scholarship admin/API + canonical authoring source test + P9 verifier | Runtime Pending | P9 CLOSED |
| R-048 | P13 | P23 | Admin Course relationships/publishing | Course ID + canonical taxonomy/major/reference IDs | `COURSE-D` | Existing P13 relationship resolution/review services | `COURSE-R` | `CourseAdminRouter` relationship endpoints | Course detail control plane exposes analyze/approve/reject taxonomy, Language canonical selection, and Major projections through owner APIs | N/A | N/A | N/A | Course relationship tests + P9 verifier | Runtime Pending | P9 CLOSED |
| R-049 | P14 | P23 | Admin certificate lifecycle | Certificate ID/public ID/verification code | `CERT-D` | `CERT-A` | `CERT-R` | `CertificateAdminRouter` | Existing Certificate owner lifecycle UI/API remains the authoring authority path; no direct Admin persistence | N/A | See R-028 | Certificate ledger/lifecycle is P14-owned | Certificate admin/use-case/repository tests + P9 verifier | Runtime Pending | P9 CLOSED |
| R-050 | P16 | P23 | CMS authoring/publishing | CMS content/category IDs and slug/version | `CMS-D` | `CMS-A` | `CMS-R` | `CmsAdminRouter` | Existing CMS authoring/publish/review control plane remains owner-API driven | See R-064 | See R-029 | CMS publication lifecycle owned by P16 | CMS use-case/API tests + P9 verifier | Runtime Pending | P9 CLOSED |
| R-051 | P17 | P23 | AI governance/admin control | P17 provider/model/prompt/execution IDs | `AI-D` | `AI-A` | `AI-R` | `AIAdminRouter`/AIGateway | Existing AI governance control plane uses P17 owner APIs and retains P17 execution/audit ownership | No direct public business truth | N/A | P17 execution/audit records | AI governance/repository/API tests + P9 verifier | Runtime Pending | P9 CLOSED |
| R-052 | P18 | P23 | Student Tool registry/admin | Tool key/registry version | `TOOLS-D` | `TOOLS-A` | Tool registry repo | `StudentToolsAdminRouter` | Existing Student Tools registry/admin surface uses P18 owner API; no tool business truth moved into Admin | See R-065 | See R-030 | Registry/health contracts | Phase18 admin/public tests + P9 verifier | Runtime Pending | P9 CLOSED |
| R-053 | P19 | P23 | Finance admin control | Finance public IDs; canonical currency code; immutable ledger references | `FIN-D` | `FIN-A` | `FIN-R` | `FinanceAdminRouter` | Existing Finance control plane remains P19 owner-API driven; Admin does not own ledger/payment logic | N/A | See R-032 | Finance events/audit remain P19 | Finance admin/core/router tests + P9 verifier | Runtime Pending | P9 CLOSED |
| R-054 | P20 | P23 | Services admin catalog/relationship authoring | Service public ID/slug + canonical P7 country/language refs | `SVC-D` | `SVC-A` | `SVC-R` | `ServiceAdminRouter` | Services Admin uses canonical multi-pickers and writes `supportedCountryReferenceIds`/`supportedLanguageReferenceIds` through P20 owner API; text hacks removed from relationship authoring | See R-066 | See R-031 | P20 request/fulfillment source contracts exist | Service use-case/router + P8/P9 verifiers | Runtime Pending | P9 CLOSED |
| R-055 | P21 | P23 | Career/Alumni admin | Career employer/job IDs/public IDs/slugs + canonical P7 geography | `CAREER-D` | `CAREER-A` | `CAREER-R` | Career admin router | Career Admin authors `countryReferenceId`/`cityReferenceId` through P21 owner APIs with P7 City→Country validation; text geography is display/provenance only | See R-067 | N/A | Career persistence remains P21-owned | Career admin/application + P8/P9 verifiers | Runtime Pending | P9 CLOSED |
| R-056 | P7 | P24 | Public countries/reference composition | Canonical ref ID/code + stable ISO slug/code | `REF-D` | Localized reference queries | `REF-R` | Reference public API | N/A | `publicLiveDataSource.loadPublishedCountries` consumes active P7 records; navigation/filter state uses canonical reference ID or stable ISO code; no live `MOCK_COUNTRIES` import or display-name identity | N/A | N/A | Reference public tests + P10 verifier | Runtime Pending | P10 CLOSED |
| R-057 | P8 | P24 | Public taxonomy/DegreeLevel composition | Canonical taxonomy node/DegreeLevel identity | `TAX-D`; `DEG-D` | Localized/public taxonomy queries + downstream published read models carrying canonical DegreeLevel/taxonomy references | `TAX-R`; `DEG-R` | `AcademicTaxonomyPublicRouter`; DegreeLevel identity remains P8-owned and is consumed through Major/Program/Scholarship contracts | N/A | P24 does not duplicate taxonomy/DegreeLevel truth: live Major/University/Scholarship composition consumes owner-published identities/labels and graph DTOs; prototype taxonomy is not a live authority | N/A | N/A | AcademicTaxonomy public tests + P10 verifier | Runtime Pending | P10 CLOSED |
| R-058 | P9 | P24 | Public International Tests | Test public ID/slug + canonical refs | `TEST-D` | Localized International Test queries | `TEST-R` | `InternationalTestPublicRouter` | N/A | `publicLiveDataSource.loadPublishedExams` uses the P9 published API with stable slug/public ID; live fixture import removed | N/A | N/A | InternationalTest public tests + P10 verifier | Runtime Pending | P10 CLOSED |
| R-059 | P10 | P24 | Public Majors | Major public ID/slug + canonical owner identity through graph | `MAJ-D` | Localized/public Major queries + cross-domain graph read service | `MAJ-R` | `MajorPublicRouter`; `/public/graph/majors/:slug` | N/A | `loadPublishedMajors` + `usePublicRelationshipGraph`; Major detail uses real published Universities/Scholarships/Courses graph and has explicit unavailable state; hardcoded relationship demos removed | See R-024 | N/A | Major public/read-model tests + P10 verifier | Runtime Pending | P10 CLOSED |
| R-060 | P11 | P24 | Public Universities/AcademicPrograms | University/program public identity + canonical linked IDs | `UNI-D` | Localized/public University queries + cross-domain graph read service | `UNI-R` | `UniversityPublicRouter`; `/public/graph/universities/:slug` | N/A | `loadPublishedUniversities` preserves canonical P7 refs and mapped Program→Major/Degree IDs; navigation uses slug/publicId/ownerId graph identity; no live university fixture | See R-025 | N/A | University public/read-model tests + P10 verifier | Runtime Pending | P10 CLOSED |
| R-061 | P12 | P24 | Public Scholarships and connected identities | Scholarship `publicId/slug`; canonical University/Program/Major/Country/Test IDs | `SCH-D` | `PublicScholarshipUseCases` + cross-domain graph read service | `SCH-R` | `ScholarshipPublicRouter`; `/public/graph/scholarships/:slug` | N/A | `publicScholarshipDataSource` retains canonical country/university/major/test IDs; synthetic participating-university IDs removed; graph navigation resolves owner identities without name matching; API failure never falls back to mock | See R-026 | N/A | Scholarship public/data-source tests + P10 verifier | Runtime Pending | P10 CLOSED |
| R-062 | P13 | P24 | Public Courses / Imported Courses | Course public ID/slug/ownerId + canonical relationships | `COURSE-D` | Public Course use cases + relationship query service + graph projection | `COURSE-R` | `CoursePublicRouter`; Major graph course projection | N/A | `loadPublishedCourses` feeds both course surfaces from P13 published API; `MOCK_COURSES`/`GOLDEN_IMPORTED_COURSES` removed from live path; Major→Courses comes from owner graph | See R-027 | N/A | Course public/imported closure tests + P10 verifier | Runtime Pending | P10 CLOSED |
| R-063 | P14 | P24 | Public certificate verification | Verification code/public credential identity | `CERT-D` + P14 verification read contract | `CertificateReadModelService.verifyPublic` → `CertificateUseCases.verifyByCode` | `CERT-R` | `CertificatePublicRouter` delegates to P14 read model | N/A | `CertificateVerificationPage` calls live `ApiClient.verifyCertificate`; no P24 credential truth | See R-028 | Verification truth/integrity remains P14-owned; P24 only composes the result | Certificate public/read-model/use-case/repository tests + P10 verifier | Runtime Pending | P10 CLOSED |
| R-064 | P16 | P24 | Public CMS content | CMS content slug/public identity + locale/version | `CMS-D` | CMS public use cases | `CMS-R` | `CmsPublicRouter` | N/A | `loadPublishedArticles(locale)` consumes published P16 CMS projection; live `GOLDEN_ARTICLES` import removed; locale changes labels/content while slug/public identity remains stable | See R-029 | CMS publication state | CMS public/use-case tests + P10 verifier | Runtime Pending | P10 CLOSED |
| R-065 | P18 | P24 | Public Student Tools catalog/execution | Tool key/public registry identity | `TOOLS-D` | Student Tool registry/execution use cases | Tool registry repo + gateways | `StudentToolsPublicRouter` | N/A | `loadPublishedTools(locale)` consumes only public-enabled P18 registry entries; static tool catalog removed from live composition; tool key remains identity across locales | See R-030 | Execution IDs/events internal | StudentTools public/pipeline tests + P10 verifier | Runtime Pending | P10 CLOSED |
| R-066 | P20 | P24 | Public Services | Service `publicId/slug` + canonical linked P7 refs | `SVC-D` | `PublicServiceCatalogUseCases` | `SVC-R` | `ServicePublicRouter` | N/A | `loadPublishedServices` consumes P20 catalog and preserves canonical country/language IDs; `PUBLIC_SERVICES` removed from live composition; no invented Course→Service relation without owner read-model evidence | See R-031 | P20 catalog/request owner truth | Service public/use-case tests + P8/P10 verifiers | Runtime Pending | P10 CLOSED |
| R-067 | P21 | P24 | Public Career opportunities | Job/employer public IDs/slugs + canonical country/city refs | `CAREER-D` | `CareerPublicUseCases` | `CAREER-R` | `CareerPublicRouter` | N/A | `loadPublishedCareers` consumes P21 published jobs and preserves canonical P7 geography; static career catalog removed from live composition; no display-name identity | N/A | P21 remains opportunity/employer truth | Career public/application tests + P8/P10 verifiers | Runtime Pending | P10 CLOSED |
| R-068 | P22 | P24 | Product-experience navigation/UX contract; no business-data ownership | N/A by design; P22 owns experience principles, not domain identity | No P22 business domain package by design | Presentation-level navigation contract | N/A | N/A | N/A | `usePublicNavigation`; `PublicTemplateApp` live composition exposes loading/empty/unavailable/retry states and never silently substitutes prototype data | N/A | N/A | `publicUx.spec.ts` + P10 verifier | Source Closed | P10 CLOSED |
| R-069 | P7-P21 + P16 CMS | P23/P24 | Public visibility/composition governance | Owner public IDs/slugs + owner publication/availability lifecycle; CMS navigation/block IDs for editorial ordering | Owner domain contracts + `CMS-D` | Phase 23 calls owner/CMS commands; Phase 24 consumes owner public queries + CMS published composition | Owner repositories + `CMS-R`; no P23 visibility table | Existing owner public/admin routers + `CmsAdminRouter`/`CmsPublicRouter` | P23 is command UI only; no duplicate visibility persistence | P24 renders only owner-published records and published CMS navigation/blocks | N/A | Owner lifecycle/CMS publication events remain authoritative | W4 composition-governance source test | Source Closed | W4 MNT-AUD-0033 |


## 5. Historical measurement snapshots (progress evidence only)

### P2 creation snapshot (historical)

- Total tracked important cross-phase relationships: **68**.
- `Source Closed`: **1**.
- `Runtime Pending`: **23**.
- `Partial`: **39**.
- `Missing`: **5**.

### Current snapshot after P3 source closure

- Total tracked important cross-phase relationships: **68**.
- `Source Closed`: **1**.
- `Runtime Pending`: **29**.
- `Partial`: **33**.
- `Missing`: **5**.
- P3 rows R-001→R-013: **13/13 source-closed; runtime DB proof remains pending where applicable**.
- Phase coverage P7–P24: **COMPLETE**.

### Current snapshot after P4 source closure

- Total tracked important cross-phase relationships: **68**.
- `Source Closed`: **1**.
- `Runtime Pending`: **34**.
- `Partial`: **31**.
- `Missing`: **2**.
- P3 rows R-001→R-013: **13/13 source-closed**.
- P4 rows R-014→R-019: **6/6 source-closed; runtime DB/E2E proof remains pending**.
- Phase coverage P7–P24: **COMPLETE**.

### Current snapshot after P5 source closure

- Total tracked important cross-phase relationships: **68**.
- `Source Closed`: **1**.
- `Runtime Pending`: **37**.
- `Partial`: **28**.
- `Missing`: **2**.
- P5 rows R-020→R-022: **3/3 source-closed; runtime DB/E2E proof remains pending**.

### Current snapshot after P6 source closure

- Total tracked important cross-phase relationships: **68**.
- `Source Closed`: **1**.
- `Runtime Pending`: **38**.
- `Partial`: **27**.
- `Missing`: **2**.
- R-023 P13→P14 completion/certificate authority edge: **source-closed; runtime worker/DB/KMS proof remains pending**.
- R-028 remains `Partial | P7`; P6 does not start Student Workspace delivery wiring.

### Current snapshot after P9 source closure

- Total tracked important cross-phase relationships: **68**.
- `Source Closed`: **1**.
- `Runtime Pending`: **50**.
- `Partial`: **17**.
- `Missing`: **0**.
- P9 rows R-042→R-055: **14/14 source-closed as `Runtime Pending`; remaining proof is live DB/environment/E2E only**.
- The five P9 rows that entered this step as `Partial` (R-046, R-047, R-048, R-054, R-055) now have canonical owner-API authoring paths.
- Remaining `Partial` rows belong to later closure steps, primarily P10 public composition; P9 does not relabel them.

The status count remains deliberately conservative. A row stays `Partial` when a later consumer/API/read-model edge outside the active closure step is incomplete; `Runtime Pending` means the source relationship is closed and only live DB/environment proof remains.

### Current snapshot after P10 source closure

- Total tracked important cross-phase relationships: **68**.
- P24 rows R-056→R-067: **12/12 source-closed as `Runtime Pending`**.
- P24 row R-068: **Source Closed**.
- Live Public prototype fixtures and silent fallback are not production relationship truth.

### P11 guard closure

- All R-001→R-068 rows are asserted present by an executable source guard and may not regress to `Missing`.
- Canonical-identity, Prisma-boundary, P15-localStorage, P23-control-plane, P17-vendor, P13/P14-certificate, Public-live-fixture, and authority-document rules are executable.
- Negative fixtures prove the guard fails when representative violations are introduced.
- Circular package/file dependency regressions are covered by the existing source-quality SCC gate and are executed in the P11 CI workflow.

### P12 full source CI closure

- P12 does not reclassify relationship ownership; it makes the already-closed source contracts mandatory in the general CI path.
- P11 guards, W0–W16 remediation verifiers, P7–P11 plan verifiers, Prisma source validate/generate, typecheck, lint, build and source-unit tests are chained as required source gates.
- DB-backed Vitest specs are explicitly separated from the source-unit suite and recorded as `Runtime Pending`; they no longer appear as source-suite skips/fallbacks caused by a missing database.
- The only remaining P12 execution dependency is running the locked dependency-backed toolchain in CI after `npm ci`; no DB is required for those source gates.

### P13 final source closure snapshot

- Total tracked important cross-phase relationships: **68**.
- `Source Closed`: **1**.
- `Runtime Pending`: **67**.
- `Partial`: **0**.
- `Missing`: **0**.
- R-024→R-028 and R-033 were re-audited and closed at source through owner-read hydration and live session/API composition; only deployed DB/runtime/E2E proof remains.
- No relationship is considered runtime-certified by this source closure.

## 6. Execution checklist mapping

- **P3:** close R-001→R-013 canonical backbone gaps without rebuilding the normalized University/Scholarship schemas.
- **P4:** close R-014→R-019 reverse read models/aggregations.
- **P5:** **CLOSED** — R-020→R-022 are source-closed as `Runtime Pending`; imported-course provider/source-identity/direct-URL security gates retained.
- **P6:** **CLOSED** — R-023 completion-event delivery into P14 and the certificate authority edge are source-closed as `Runtime Pending`; P7 has not started.
- **P7:** **CLOSED (source, P13 final repair verified)** — R-024→R-029 and R-033 have owner-read/session/API source paths; deployed session/DB/E2E proof remains Runtime Pending.
- **P8:** late-domain source integrations R-029→R-041 are source-closed where marked `P8 CLOSED`; remaining proof is Runtime/DB only. P9/P10 consumer UX rows remain intentionally Partial.
- **P9:** **CLOSED (source)** — P23 owner-API relational authoring R-042→R-055 is source-closed as `Runtime Pending`; canonical pickers write owner IDs and Admin contains no direct business persistence. Runtime DB/E2E proof remains pending.
- **P10:** **CLOSED (source)** — P24 live composition R-056→R-068 uses owner read models/canonical identity and live mocks/silent fallback are removed.
- **P11:** **CLOSED (source)** — executable architecture/static-security guards and negative contract tests protect the relationship/ownership rules closed through P10; CI also executes the zero-new-cycle source-quality gate.
- **P12:** **CLOSED (source CI contract)** — full source CI is fail-closed and DB/E2E-only checks are explicitly classified as Runtime Pending; dependency-backed remote execution remains required before final P13 certification.
- **P13:** **CLOSED (final source audit)** — every R-001→R-068 row is `Source Closed` or `Runtime Pending`; final documentation and runtime-pending register are authoritative for source closure.

## 7. P2 closure gate

P2 is closed only when all of the following remain true:

- this file is the only active Cross-Phase Relationship Closure Matrix;
- every important P7–P24 cross-phase relation above has one owner and one consumer direction;
- every row records canonical identity, contract, repository, API/read-model, Admin/Public/Student/Event applicability, source tests, status and closure step;
- no row is marked closed solely because a Prisma relation exists;
- known source gaps (unwired P13→P14 consumer, incomplete P15 hydration, P20/P21 unavailable persistence, public mocks/synthetic identity, incomplete Admin relational editors) remain visible as `Partial`/`Missing` rather than being hidden;
- no DB migration is applied and no runtime evidence is fabricated during P2.

**P2 result at creation:** relationship inventory/checklist is source-traceable and ready to drive P3→P13. No P3 relationship implementation is performed in this stage.
