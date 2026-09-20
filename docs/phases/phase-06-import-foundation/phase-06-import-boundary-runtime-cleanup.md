# Phase 06 Import Boundary Runtime Cleanup

## Audit Summary
An architectural audit of the Phase 06 enterprise import foundation revealed boundary violations where Phase 06 directly imported, coupled to, and orchestrated downstream domain promotion logic. This resulted in Phase 06 owning scholarship, university, major, course, and international test data promotion logic directly. It also featured an `autoTransfer` capability that actively bypassed the core staging and review mechanisms expected in Phase 06.

## Runtime Risks Fixed
- Removed `autoTransfer` bypass which circumvented the generic import review queues.
- Removed tight coupling of `ImportAdminUseCases` to all domain database repositories (Scholarships, Universities, Majors, Courses, International Tests).
- Removed hardcoded switch/if branching within Phase 06 targeting specific downstream domains.
- Disconnected domain promotion logic from generic Phase 06 ingestion routes.

## Disabled Routes
The following endpoints were disabled/refactored to return a `422 Unprocessable Entity` response explicitly stating that domain promotion is disabled in Phase 06:
- `POST /admin/imports/records/:id/promote`
- `POST /admin/imports/records/:id/transfer`
- `POST /admin/imports/batches/:id/transfer`

The domain-specific scholarship reference in the batch transfer route has been completely eliminated from the Phase 06 API layer.

## Removed Domain Couplings
The following domain couplings were explicitly stripped from Phase 06 DI and application logic:
- `IScholarshipRepository`
- `IUniversityRepository`
- `ICourseRepository`
- `IMajorRepository`
- `IInternationalTestRepository`
- Domain specific logic involving `ScholarshipCompletenessClassifier` and other domain rules.

## What Remains Generic and Allowed in Phase 06
- CSV/JSON document parsing.
- Batch generation and processing states.
- Normalization into a generic payload format.
- Tracking of processed, failed, and incomplete rows.
- Basic deduplication key construction using a generic domain `dataType`.
- Generic staging tables and import history tracking.

## Deferred Domain Adapters
The following promotion use cases are maintained but entirely deferred to their owning phases. They are **NO LONGER** consumed by Phase 06:
- **Phase 09**: `InternationalTestImportPromotionUseCase`
- **Phase 10**: `MajorImportPromotionUseCase`
- **Phase 11**: `UniversityImportPromotionUseCase`
- **Phase 12**: `ScholarshipImportPromotionUseCase`
- **Phase 13**: `CourseImportPromotionUseCase`

## Core Directives Enforced
- **NO AUTO-PUBLISH**: Imported rows must remain in generic staging/review states.
- **NO REVIEW-QUEUE BYPASS**: The generic boundary cannot immediately promote data skipping human/system review stages.
- **NO SILENT OVERWRITE**: Generic import logic does not overwrite published domain records automatically. Domain promotion (when performed by the owning phase) handles deduplication.

## Final Status
CLOSED - All runtime risks identified in the boundary pollution audit have been neutralized, securing Phase 06 as purely generic import infrastructure.
