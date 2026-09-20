> **Note:** This phase references the [Enterprise Shared Contracts Specification](../../architecture/shared-contracts/03-enterprise-shared-contracts-specification.md) as the canonical architectural source for shared foundation contracts.

# MANARATAK Enterprise Phase 14 Enterprise Certificates Platform

## Part C – Implementation Guide

### 14.C.1 Error Handling Rules

**Architectural Commentary**

- **Retry Policy**: Transient failures (such as temporary KMS timeouts, Phase 05 EAP connection drops, or database connection pool depletion) are handled using an exponential backoff policy (e.g., standard async retry loop with jitter: 3 retries, scaling as 2^n seconds).
- **Dead Letter Queue (DLQ)**: If a message fails after maximum retries or encounters a non-transient error (e.g., template placeholder mismatch, invalid digital signatures key configuration), it is moved to `phase14-certificates-dlq` (BullMQ/Redis queue).
- **Poison Message Handling**: Invalid event payloads that fail basic schema validation are immediately dead-lettered to prevent blocking the main consumer queues.
- **Step-Specific Failure Handlers**:
  - _Cryptographic Signing Timeout_: Retry signature request using secondary KMS endpoint.
  - _PDF Rendering Crash_: Gracefully restart local Puppeteer container process or fall back to a secondary instance.
  - _Object Storage Upload Failure_: Cache the physical PDF in local ephemeral storage and queue a background synchronization task.
- **Manual Recovery Procedures**: An administrative portal exposes DLQ inspector APIs, allowing authorized operators to review error stacks, fix template assets, and trigger manual event reprocessing.

### 14.C.2 Template & Rendering Versioning

**Architectural Commentary**
To protect against future CSS updates, engine changes, or template redesigns breaking the layout of historically issued certificates:

- **Template Version Locking**: The certificate record captures and permanently stores the `TemplateVersionId`. Future visual edits to that template will only apply to new certificates.
- **Rendering Engine Version**: The artifact record tracks the exact rendering container tag (e.g., `RenderingEngine: "puppeteer-v22.1.0"`, `PdfFormat: "PDF/A-3b"`).
- **Asset Pinning**: All referenced logos, signatures, and backgrounds used in a template version are compiled into base64 or stored as immutable assets registered via Phase 05 Enterprise Asset Platform (EAP), preventing accidental overrides from breaking historical layouts.

### 14.C.3 Background Processing Architecture

**Architectural Commentary**

- **Background Workers**: Dedicated Node.js background workers running within isolated, scale-to-zero container nodes.
- **Queue Partitioning**: Separate BullMQ / Redis queues for Course Certificates, Program Certificates, and DLQ reprocessing to avoid light-weight completions getting blocked behind large batch degree issuances.
- **Parallel Processing**: Workers leverage concurrent BullMQ job execution to stream and process multiple incoming events simultaneously in a non-blocking asynchronous event loop.
- **Worker Scaling**: Container orchestration rules scale worker pods up or down dynamically based on Redis/BullMQ queue depth.
- **Graceful Shutdown**: Upon receiving SIGTERM, workers stop polling new events, complete active generation pipelines (with a 30-second timeout), flush remaining outbound events, and exit cleanly.

### 14.C.4 Security Hardening

**Architectural Commentary**

- **Secret Management**: All database passwords, API credentials, and SMTP configurations are stored securely in Google Cloud Secret Manager or HashiCorp Vault.
- **Key Rotation**: The KMS service manages private keys with automatic annual rotation policies. Signed certificates contain the specific key version identifier used during execution.
- **Input Validation**: Strict schema checks on all incoming event payloads and public verification hashes using Zod to eliminate injection vulnerabilities.
- **Rate Limiting**: Public verification APIs implement IP-based and token-bucket rate limiting (e.g., maximum 10 requests per minute per IP) to prevent malicious actors from harvesting certificates or performing brute-force enumeration attacks.

### 14.C.5 Deployment Architecture

**Architectural Commentary**

- **Worker Services**: Background processors subscribing to the Enterprise Event Bus to generate PDFs and hashes asynchronously without blocking the upstream UI.
- **Verification API**: Deployed to high-availability ingress nodes, potentially cached heavily at the edge/CDN level, separated from the generation worker pool.

```
[Upstream Completion Event]
            │
            ▼
┌───────────────────────┐
│  Validation & Check   │ ── Verify student completion and idempotency keys.
└───────────────────────┘
            │
            ▼
┌───────────────────────┐
│   Metadata Assembly   │ ── Aggregate learning metrics, GPA, and hours.
└───────────────────────┘
            │
            ▼
┌───────────────────────┐
│  Template Resolution  │ ── Retrieve approved template HTML/CSS assets.
└───────────────────────┘
            │
            ▼
┌───────────────────────┐
│    HTML Compilation   │ ── Bind metadata placeholders into static DOM.
└───────────────────────┘
            │
            ▼
┌───────────────────────┐
│    PDF Generation     │ ── Compile to PDF using a headless rendering engine.
└───────────────────────┘
            │
            ▼
┌───────────────────────┐
│     QR Generation     │ ── Encode the unique verification URL into a PNG graphic.
└───────────────────────┘
            │
            ▼
┌───────────────────────┐
│   Digital Signature   │ ── Sign the PDF hash using the Issuer's private key.
└───────────────────────┘
            │
            ▼
┌───────────────────────┐
│ Object Storage Upload │ ── Persist assets to Cloud Storage under strict paths.
└───────────────────────┘
            │
            ▼
┌───────────────────────┐
│  Ledger Persistence   │ ── Write record to database, publishing Outbox event.
└───────────────────────┘
```

### 14.C.6 Performance & Scalability

**Architectural Commentary**

- **Read Caching**: Public verification requests are cached heavily using a layered strategy (Fast local memory cache on the API nodes + Redis cache cluster). Successful lookups are cached for 24 hours, while negative hits (NotFound) are cached for 5 minutes to prevent DDoS on verification APIs.
- **Database Indexing**: Optimized composite indexes on the certificate ledger:
  - `IX_Certificates_VerificationHash` (Hash lookup)
  - `IX_Certificates_StudentId_CourseId_CertificateTypeId` (Idempotency and duplicate check)
- **Batch Processing**: Support batch certificate issuance during graduation cycles by consolidating database writes and processing rendering tasks in parallel worker chunks.
- **CDN Optimization**: Generated PDF and preview image URLs are served through Cloud CDN, ensuring ultra-low latency downloads globally.

### 14.C.7 Enterprise Observability

**Architectural Commentary**

- **Structured Logging**: All logs are emitted as structured JSON (using standard Node.js Pino or Winston loggers) targeting standard output. Every log entry includes the standard metadata context.
- **Correlation ID Logging**: The `CorrelationId` is automatically injected into the logging context, allowing operators to trace a workflow from Phase 13 event dispatch, through background worker rendering, down to database persistence.
- **Distributed Tracing**: Fully instrumented using `OpenTelemetry` with custom traces. Traces track execution duration across database, KMS, and document rendering layers.
- **Metrics Collection**: Exposes Prometheus metrics covering:
  - `certificates_issued_total`
  - `certificate_rendering_duration_seconds` (bucketed by certificate type)
  - `failed_issuances_total`
  - `public_verification_requests_total`
- **Audit Logging**: Every administrative action (such as template modifications, revocations, and manual revalidation) is logged directly into an audit ledger with actor identity, timestamp, and IP coordinates.

### 14.C.Final Implementation Review Checklist

**Architectural Commentary**
This serves as the official Tollgate for architecture validation before code is authorized for production deployment.

- [x] Alignment with Phase 14 Part A — All layers and components match the architectural specification.
- [x] Alignment with Phase 14 Part B — Implementation strictly uses the defined Contracts without modification.
- [x] No Ownership Violations — Does not attempt to model business entities outside of its bounds.
- [x] No Duplicated Functionality — Does not rebuild existing infrastructures.
- [x] Zero Upward Dependency — Domain models possess absolute ignorance of upstream consumers.
- [x] Foundation Reuse Verification — Every consumed phase is verified as a loose integration.
- [x] Dependency Inversion — Infrastructure and Delivery depend on Application and Domain, never the reverse.
- [x] Complete Implementation Readiness — The blueprint is actionable, unambiguous, and ready for engineering.

**Status:** Baselined Architecture Specification
