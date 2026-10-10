# MANARATAK Section 14 — Certificate remediation evidence (2026-10-11)

**Source plan:** `MANARATAK_ADMIN_REVIEW_CODEX(20261008-165132).md`, Section **14 / P14**, findings `CERT-ADM-001…033`.
**Branch:** `fix/plan-audit-ci-20261011` · [PR #15](https://github.com/wegdangamil2022-oss/MANARATAK-First-/pull/15).
**Assessment:** **SOURCE REMEDIATION IN PROGRESS — NOT CERTIFIED CLOSED**, no production mutations. A source guard in a file is not proof that the full acceptance criterion has passed. Code already in `main` from commits `1819c975`, `ba228426`, and `397753ad` is included when assessing source coverage; this working branch adds targeted safeguards and tests.

## Explicit task inventory

| Task | Concern | Located source evidence | Closure qualifier |
|---|---|---|---|
| CERT-ADM-001 | Private PDF/Preview EAP classification | `EapCertificateArtifactStore + grant owner guards` | SOURCE_GUARD_PRESENT |
| CERT-ADM-002 | External issuer approval and evidence | `CertificateUseCases.approveIssuer; PrismaCertificateRepository.updateIssuer` | SOURCE_GUARD_PRESENT |
| CERT-ADM-003 | Single successor invariant / contention | `PrismaCertificateRepository.reissue row lock; new one-to-one source migration` | MIGRATION_NOT_APPLIED |
| CERT-ADM-004 | Untrusted verification response redaction | `CertificateUseCases.verifyByCode; CertificateReadModelService.verifyPublic` | SOURCE_GUARD_PRESENT |
| CERT-ADM-005 | Verification abuse/rate/retention | `CertificatePublicRouter budgets; PrismaCertificateRepository.recordVerification sampling` | DISTRIBUTED_LOAD_NOT_PROVEN |
| CERT-ADM-006 | Historical key verification and KMS | `CertificateTrustPolicy opaque signer contract; DI signer currently null` | PRODUCTION_PROVIDER_NOT_CONFIGURED |
| CERT-ADM-007 | Immutable active issuer authority | `PrismaCertificateRepository.updateIssuer` | SOURCE_GUARD_PRESENT |
| CERT-ADM-008 | Recheck template asset/issuer on activation | `PrismaCertificateRepository.transitionTemplate` | SOURCE_GUARD_PRESENT |
| CERT-ADM-009 | Render from sealed envelope | `CertificateUseCases.assertRenderable + CertificateArtifactRenderUseCase` | SOURCE_GUARD_PRESENT |
| CERT-ADM-010 | EAP partial render retry and compensation | `checkpointRender renderJob and EapCertificateArtifactStore` | RECOVERY_AND_CLEANUP_RUNTIME_UNPROVEN |
| CERT-ADM-011 | Immutable artifact attachment checks | `PrismaCertificateRepository.attachArtifacts` | SOURCE_GUARD_PRESENT |
| CERT-ADM-012 | Admin signature integrity state | `CertificateDetailPage loads server verification` | SOURCE_GUARD_PRESENT |
| CERT-ADM-013 | Historical template version preview | `CertificateDetailPage historical version API` | SOURCE_GUARD_PRESENT |
| CERT-ADM-014 | Expiry lifecycle worker | `CertificateUseCases.expireDue + CertificateCompletionOutboxWorker` | RUNTIME_WORKER_PENDING |
| CERT-ADM-015 | Pinned completion source facts | `CertificateUseCases.issueCourseCompletion version resolver` | SOURCE_GUARD_PRESENT |
| CERT-ADM-016 | Arabic/English rendering | `ProviderNeutralCertificateRenderingService` | RUNTIME_VISUAL_PENDING |
| CERT-ADM-017 | Owned private grant revalidation | `CertificateUseCases.deliveryArtifact + StudentWorkspaceRouter` | RUNTIME_ACL_PENDING |
| CERT-ADM-018 | Governed recipient correction | `CertificateUseCases.reviewCertificate + PrismaCertificateRepository.recordReview` | SOURCE_GUARD_PRESENT |
| CERT-ADM-019 | Replay identity and payload collision | `CertificateUseCases consumeCompletionEvent / issueLearningPathCompletion + tests` | SOURCE_REGRESSION_ADDED |
| CERT-ADM-020 | Admin list page limits | `CertificateAdminPage pageSize 50` | SOURCE_GUARD_PRESENT |
| CERT-ADM-021 | Issuer approval workflow UI | `CertificateAdminPage issuer modal + approve API` | SOURCE_GUARD_PRESENT |
| CERT-ADM-022 | Admin PDF download action | `CertificateDetailPage delivery-grant button` | SOURCE_GUARD_PRESENT |
| CERT-ADM-023 | Bounded list query validation | `CertificateAdminRouter Zod + PrismaCertificateRepository.list` | SOURCE_GUARD_PRESENT |
| CERT-ADM-024 | Arabic/English text, dates and accessible labels | `CertificateAdminPage / CertificateDetailPage / public verify` | BROWSER_I18N_PENDING |
| CERT-ADM-025 | Runtime signing, DB and EAP integration evidence | `certificate-plan-source workflow has source-only Prisma/typecheck/vitest gates` | RUNTIME_TESTS_PENDING |
| CERT-ADM-026 | Revalidation required for validity | `CertificateUseCases.verifyByCode, assertRenderable` | SOURCE_GUARD_PRESENT |
| CERT-ADM-027 | Revoked/reissued expiry precedence | `CertificateUseCases.verifyByCode` | SOURCE_GUARD_PRESENT |
| CERT-ADM-028 | Deterministic official default template | `PrismaCertificateRepository.findActiveTemplateByName canonical code` | SOURCE_GUARD_PRESENT |
| CERT-ADM-029 | Readiness reflects actual signing/renderer | `CertificateUseCases.readiness + DI artifactReadinessProbe` | PRODUCTION_READINESS_PENDING |
| CERT-ADM-030 | Template maker-checker and If-Match | `CertificateAdminRouter and PrismaCertificateRepository transitionTemplate` | SOURCE_GUARD_PRESENT |
| CERT-ADM-031 | Timing-safe historical signature check | `CertificateTrustPolicy.verifyHash` | SOURCE_GUARD_PRESENT |
| CERT-ADM-032 | Bounded student/ledger/grant reads | `PrismaCertificateRepository.findForStudent/listByStudent/listLedger` | SOURCE_GUARD_PRESENT |
| CERT-ADM-033 | Version-pinned visual assets | `ProviderNeutralCertificateRenderingService materialize EAP bytes` | RUNTIME_VISUAL_PENDING |

## Repairs in this branch after focused Section 14 review

1. `CertificateUseCases`: fallback LearningPath/Course completion replay now checks the original source type/version, canonical achievement identity, recipient and immutable payload hash; negative/replay unit test added for altered student and learning path version (`CERT-ADM-019`).
2. `Prisma schema`: a replacement certificate's `replacesCertificateId` is now unique and the inverse relationship is one-to-one; migration `20261011010000_p14_certificate_replacement_one_to_one` rejects existing duplicates and never silently rewrites their records. **Migration is source-only and not applied**, so concurrency is **not runtime certified** (`CERT-ADM-003`).
3. `CertificateUseCases.readiness` does not declare trusted issuance ready when the signing provider is absent, including source preview; negative unit test included (`CERT-ADM-029`).
4. Reissue and renewal routes permit an already-`REISSUED` original **only if** a successor ID is recorded, delegating idempotent replay comparison under the Repository row lock; mismatch still returns conflict (`CERT-ADM-003`).

## Verification vs release gates

- GitHub **Certificate plan source verification** completed successfully at branch commit `83114e9a9` (Prisma generate/validate, API/Admin/Web `tsc -b`, dedicated certificate Vitest, source quality, admin audit coverage). This does **not** certify subsequent commits; consult the workflow on the current branch head.
- Source Architecture Guards passed on intermediate Section 14 commits.
- Mandatory before **runtime closure**: independent PostgreSQL race/unique-index application on a disposable target, KMS/HSM signing provider and K1→K2 historic verification, issuer authority document validation against P11, actual EAP ACL and historical document previews, worker/retry/compensation exercise, public rate-limit test across multiple API instances, AR/EN browser/PDF validation, retention and security sign-off.
- In the current DI source, `certificateSignatureService` is `asValue(null)`. This intentionally fails closed for production-like signing; do not claim signing infrastructure has been provisioned.
- Existing Red Enterprise CI checks outside P14 are not dismissed or reported as passing simply because the certificate-scoped job is green.

**Decision:** P14 source changes have been pushed; **do not claim the whole Section 14 finished** before its external runtime gates and latest SHA's test evidence are fulfilled. Section 15 must not be marked complete implicitly.
