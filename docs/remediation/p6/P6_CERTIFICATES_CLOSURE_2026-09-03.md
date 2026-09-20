# P6 — Phase 14 Certificates Source Closure

Date: 2026-09-03  
Baseline: `MANARATAK_FINAL_P5_CLOSED_2026-09-03.zip`  
Baseline SHA-256: `c80aec7f022284c2cbc9bd21d34d2cd999fff6d891f55d3ba244f6fc07dc7076`  
Scope authority: `MANARATAK_Source_Closure_Repair_Plan_v1.0_2026-09-03.docx`

## Closure decision

P6 closes the P13 → P14 certificate authority edge at source level. P14 is the only credential authority. P13 emits durable completion facts; it does not generate certificates. P14 consumes only authoritative persisted completion outbox records and performs idempotent issuance through its own inbox, repository, ledger, audit and outbox boundaries.

Status: **P6 SOURCE CLOSED / RUNTIME PENDING**. P7 has not started.

## Source changes

- Added a bounded P13 completion subscription to the transactional outbox (`domain=COURSES`, event types `CourseCompleted` / `LearningPathCompleted`).
- Added `CertificateCompletionOutboxDeliveryGateway` and `CertificateCompletionOutboxWorker` and registered the full delivery chain in DI.
- Added an explicit opt-in API bootstrap scheduler so the consumer now has a real source caller. It is disabled unless `CERTIFICATE_COMPLETION_WORKER_ENABLED=true`.
- Preserved stable outbox record ID as the delivery idempotency key; P14 also persists `CertificateIssuanceInbox` receipts and rejects event-ID/payload collisions.
- Trusted completions with `eligibleForCertificate=false` are acknowledged as no-op events, preventing retry storms while preserving P14 as the only issuance authority.
- Added explicit P14 numbering, signature and verification-QR contracts plus the source-level trust policy. Production KMS/HSM custody remains a runtime dependency and fails closed in production-like mode when unavailable.
- Added typed certificate lifecycle event contracts for issue, revoke, reissue, renew, expire and verify.
- Tightened revoke/reissue event payload lineage (reason/timestamp/replacement/expiry and learning-path display context).
- Added `StudentCertificateReadModelDto` and `CertificateReadModelService`; student reads are sanitized and public verification delegates to P14 truth rather than reimplementing it.
- `CertificatePublicRouter` now consumes the P14 verification read model service.
- Added source tests for duplicate/idempotency, bounded outbox delivery, revocation, verification integrity and read-model sanitization.

## Ownership boundaries retained

- P13 owns learning completion facts and durable completion events only.
- P14 alone issues, revokes, reissues, renews, expires and verifies credentials.
- P15 may consume a sanitized P14 certificate projection but does not own certificate truth.
- P24 may expose verification but does not reimplement certificate validation.
- No synchronous P13 → P14 issuance endpoint was introduced.
- No Prisma cross-domain read/write was introduced.

## Relationship matrix

- `R-023 P13 → P14`: `Runtime Pending | P6 CLOSED`.
- `R-028 P14 → P15`: remains `Partial | P7`; P14 read DTO exists but certificate-event delivery into Student Workspace is intentionally not wired in P6.
- `R-063 P14 → P24`: remains `Runtime Pending | P10`; the P14 verification adapter is source-ready, while final public-composition closure belongs to P10.

## Runtime evidence intentionally pending

The Source Closure plan explicitly allows source closure without a live database. The following require the later runtime/CI environment and are not falsely claimed here:

- PostgreSQL outbox claim/retry/recovery execution against the real schema.
- duplicate replay under concurrent workers and live transaction isolation.
- KMS/HSM-backed production signing provider and key rotation/custody evidence.
- QR/PDF binary rendering/storage through the approved asset/runtime boundary.
- full DB-backed certificate issuance/revoke/reissue/verification E2E.
- P14 certificate lifecycle delivery into P15 (P7 scope).
- final P24 public composition verification E2E (P10 scope).

## Source immutability expectations

P6 must not require a new Prisma schema, migration, package dependency, or lockfile change. Those files are compared byte-for-byte against the P5 baseline during packaging.
