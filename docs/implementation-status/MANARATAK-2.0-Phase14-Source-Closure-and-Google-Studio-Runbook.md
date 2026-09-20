# MANARATAK 2.0 — Phase 14 Source Closure and Google Studio Runbook

**Date:** 2026-08-24

**Scope:** Enterprise Certificates Platform
**Database operations performed during development:** None

## Source implementation delivered

- Persistent Prisma models for certificate templates, immutable certificate records, append-only ledger entries, and verification logs.
- Source-only migration `20260824200000_phase14_enterprise_certificates`; it has not been applied.
- Real Prisma repository wired into the API instead of the former unavailable capability.
- Idempotent issuance from Phase 13 completion receipts.
- Deterministic certificate numbers, non-enumerable verification codes, sealed SHA-256 metadata, and a signing-provider boundary.
- Atomic certificate mutation, audit record, and transactional outbox entry for issuance, revocation, reissuance, and archive actions.
- Public verification with integrity, expiry, and revocation checks and privacy-safe output.
- Governed template lifecycle: Draft → Pending Approval → Approved → Active → Deprecated → Archived.
- EAP-only asset references for logo, seal, signature, background, PDF, preview, and QR artifacts. Raw URLs are rejected.
- Arabic-first green administration center with registry search/filter, metrics, template studio, professional bilingual preview, detail page, lifecycle actions, and ledger history.
- No permanent delete endpoint exists for issued certificates.

## Google Studio / runtime activation plan

The following steps are intentionally deferred until the real environment is started.

1. **PostgreSQL**
   - Create or select the production/staging database.
   - Set `DATABASE_URL` through Secret Manager.
   - Review and apply the Phase 13 migration first, then `20260824200000_phase14_enterprise_certificates`.
   - Run Prisma migration status and verify the new certificate tables and indexes.

2. **Bootstrap the first template**
   - Start API and Web.
   - Open `/admin/certificates`, then create the first template as Draft.
   - Upload the official logo, seal, signature image, and optional background through Phase 05 EAP.
   - Paste only the resulting EAP Asset IDs into the template fields.
   - Move the template through Pending Approval, Approved, then Active.

3. **Signing and KMS**
   - Create an asymmetric signing key in Google Cloud KMS.
   - Store the key resource/version as `CERTIFICATE_SIGNING_KEY_REFERENCE`.
   - Replace the source-only HMAC development signer with the runtime KMS adapter before production traffic.
   - Configure rotation and retain old public key versions permanently so historical certificates remain verifiable.

4. **PDF and QR artifact worker**
   - Provision a container worker with Chromium/Puppeteer and the approved fonts.
   - Render the locked template version into PDF/A plus preview and thumbnail images.
   - Generate a scannable QR encoding the public verification URL.
   - Upload every artifact through EAP and write only returned Asset IDs to the certificate record.
   - Keep issuance in `AWAITING_EAP_RENDER` when the provider is unavailable; never fabricate successful asset handles.

5. **Redis and durable processing**
   - Provision Redis and the course/path certificate queues plus the Phase 14 DLQ.
   - Configure retry with jitter and idempotency using the Phase 13 completion ID.
   - Configure worker concurrency, graceful shutdown, and manual DLQ replay permissions.

6. **Phase 13 event connection**
   - Subscribe the Phase 14 worker to `CourseCompleted` and `LearningPathCompleted`.
   - Verify that ineligible events are rejected and duplicate events return the existing certificate receipt.
   - Verify `CertificateIssued`, `CertificateRevoked`, `CertificateReissued`, and `CertificateVerified` leave through the transactional outbox.

7. **Public verification and security**
   - Configure the canonical public base URL used by QR codes.
   - Use a production-ready distributed rate limiter; process-local rate limiting is development-only.
   - Configure CDN caching for valid responses and short negative caching without exposing private student fields.
   - Add WAF rules, monitoring alerts, and verification-abuse dashboards.

8. **End-to-end acceptance pilot**
   - Complete one test course with a test learner.
   - Confirm one certificate is issued, rendered, signed, stored in EAP, and visible in the admin registry.
   - Scan QR from a second device and confirm the hash, status, issuer, course, and public-safe learner display.
   - Revoke it with a reason, verify the public status changes, then reissue and confirm both ledger records remain present.

## Required runtime secrets and configuration

- `DATABASE_URL`
- `CERTIFICATE_SIGNING_KEY_REFERENCE`
- Runtime KMS credentials through workload identity (preferred; no key file in the repository)
- Redis connection configuration
- EAP storage/provider configuration
- Canonical public verification origin
- Production distributed rate-limit configuration

## Explicitly not performed during source development

- No PostgreSQL connection.
- No migration application or `db push`.
- No seed.
- No Google Studio runtime pilot.
- No real KMS, Redis, EAP, CDN, or public-domain connection.

## W3 certificate completion worker reconciliation — 2026-09-07

The former Redis/BullMQ-specific handoff above is superseded for certificate-completion delivery by ADR-029's PostgreSQL durable/outbox worker authority. The source-wired P13→P14 completion consumer is controlled by canonical configuration rather than hidden server-only variables:

- `CERTIFICATE_COMPLETION_WORKER_ENABLED=true` is mandatory in production/staging.
- `CERTIFICATE_COMPLETION_WORKER_INTERVAL_MS` is explicitly bounded and mandatory in production/staging.
- `.env.example` carries both variables.
- Health/Readiness `polling-workers` reports certificate worker state, last start, last success, last failure and computed success lag.
- graceful shutdown stops polling and drains in-flight completion delivery before resource teardown.

A real PostgreSQL event-delivery run, certificate issuance, provider rendering/signing and Google Studio pilot remain runtime evidence and are intentionally `PENDING`; they are not prerequisites for source completion.
