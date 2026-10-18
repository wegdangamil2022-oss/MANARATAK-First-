# R06: Learning-path certificate eligibility decision

Actual isolated source: `51b0e139c0356c318121a25b72232c7663cfce59`. Lab `native-pg16-pYq1Pk`, run `29d5ed39-41c3-42f5-99c9-b534588ab72f`: three actual PostgreSQL cases pass without mocks.

## Current executable contract

- `packages/application/src/courses/use-cases/LearningPathUseCases.ts:123`: every completed path emits `eligibleForCertificate:false`.
- `packages/application/src/certificates/use-cases/CertificateCompletionEventConsumer.ts:40`: non-eligible completion is a deliberate acknowledged no-op.
- `packages/application/src/certificates/use-cases/CertificateUseCases.ts` supports eligible LearningPathCompleted and requires the pinned version, governed issuer/template and signing runtime.
- Prisma `LearningPath` and `LearningPathVersion`, and the author DTO, have no governed certificate-eligibility field. Course completion instead derives eligibility from the Course's explicit `certificateAvailable`.
- Actual create → review → publish → enroll → authoritative native Course completion → refresh writes one completed path enrollment, one audit and durable LearningPathCompleted. The event is non-eligible; two deliveries return null and create no certificate or inbox. Another case proves incomplete required Course creates no completion event. A third proves the enrolled version remains authoritative after the current path points to a later draft.

## Decision required from project owner

Choose whether learning paths remain non-credential-bearing, or gain an explicit, versioned opt-in eligibility policy. Recommendation: explicit opt-in for future reviewed versions, default false; never infer path eligibility merely because constituent Courses offer certificates. Preserve historical enrollments/events; no retroactive event rewriting or silent credential issuance.

If opt-in is approved, implementation still needs a precise owner/source/API contract and reviewed append-only schema change under the existing R04/R05 gates. Owner product-policy approval does not bypass those gates, approve an issuer/template, or configure a production signer/renderer. A blanket true change would silently expand issuance authority and is not recommended.

This decision blocks only the successful credential-bearing learning-path branch. It does not block Course certificate evidence, other R06 fixes, or independent local tests. No production eligibility change has been made.
