# Phase 06: Service Level Objectives (SLOs), Capacity Limits, and Load Testing Specification

## 1. Governance & Overview
- **Document Title:** Phase 06 Import Foundation SLOs, Capacity Limits, and Load Testing Specification
- **Target File Path:** `docs/phases/phase-06-import-foundation/phase-06-slo-capacity-and-load-testing.md`
- **Scope:** Defines production readiness metrics, capacity guardrails, performance performance objectives, chaos/recovery plans, security test specifications, and exit criteria for Phase 06 Import Foundation.

---

## 2. Production Readiness Scope for Phase 06
Phase 06 provides generic import staging, stream parsing (CSV, NDJSON), rule-based field extraction, connector version tracking, drift detection, background job management (in-memory & queued), and match/merge proposal generation.

It explicitly **excludes**:
- Direct domain repository/table writes.
- Auto-merge or auto-publishing into production domain tables.
- Live web crawling or CAPTCHA/paywall bypass.
- Direct AI model generation without field evidence.

---

## 3. Service Level Objectives (SLOs) Targets

| Category | Target Metric / SLO | Threshold / Objective |
| :--- | :--- | :--- |
| **Inline Data Imports** | Max Payload Size & Latency | Payload size ≤ 90 KB; API response latency (p95) < 250ms for synchronous ingestion. |
| **Queued Imports** | Processing Ingestion Latency | Enqueue latency < 100ms; background processing start < 5s under normal queue loads. |
| **Parser Throughput** | Stream Parser Performance | Memory-bounded parser processing ≥ 5,000 records/sec for CSV and NDJSON. |
| **Bulk Staging Latency** | Database Staging Write Latency | Batch chunk size = 500 rows; batch insertion latency < 500ms per 500-row chunk. |
| **Drift Detection Response**| Schema / Payload Drift Analysis | Execution time < 50ms per batch drift comparison report. |
| **Admin Status Freshness** | Operations Dashboard Status | Queue status and job progress state metrics fresh within < 1.0s. |

---

## 4. Capacity Limits & Guardrails

1. **Inline Payload Limit:**
   - Synchronous `dataText` ingestion payload size is capped strictly at **90 KB**.
   - Payloads exceeding 90 KB must be routed via staged chunking or artifact upload.

2. **Parser Performance Benchmarks:**
   - 10,000 (10K) and 100,000 (100K) row streaming parser executions are supported with low memory footprint (`highWaterMark` chunking).
   - Datasets above 1,000,000 (1M) rows are deferred until artifact streaming/Enterprise Admin Portal (EAP) streaming infrastructure is provisioned.

3. **Staging Batch Chunking:**
   - Database operations for staged records must execute in chunks of **500 records** per transaction to prevent memory spikes and lock contention.

---

## 5. Load & Stress Test Plan

1. **NDJSON Stream Parser Load Test:**
   - **Scenario:** 10K and 100K NDJSON records streamed through `NdjsonImportStreamParser`.
   - **Verification:** Ensure memory usage remains bounded and constant without Heap Out-Of-Memory (OOM) errors.

2. **CSV Stream Parser Load Test:**
   - **Scenario:** 10K and 100K CSV rows processed via `CsvImportStreamParser`.
   - **Verification:** Verify delimiter handling, header mapping, and chunked throughput under high velocity.

3. **Bulk Staging Chunking Test:**
   - **Scenario:** Import job with 10K records executing `bulkCreateRecords` with chunk size of 500.
   - **Verification:** Confirm all 10K records reach `STAGED` status in exactly 20 chunked transactions.

4. **Queue Status & Administrative Operations:**
   - **Scenario:** Concurrent status queries, job pause/resume/cancel triggers under 1,000 active background jobs.
   - **Verification:** Confirm non-blocking status response and deterministic state transitions.

---

## 6. Chaos, Failure, and Recovery Test Plan

1. **Worker Process Crash:**
   - **Scenario:** Force crash of background job process while processing job in `PROCESSING` state.
   - **Recovery:** On worker boot, identify orphaned jobs in `PROCESSING` state exceeding heartbeat timeout; mark as `FAILED` or re-queue.

2. **Stuck `PROCESSING` Batch Handling:**
   - **Scenario:** Worker hangs during parsing due to uncaught stream error.
   - **Recovery:** Automatic timeout flags job after threshold; operator can trigger manual `replay` or `cancel`.

3. **Retry Idempotency & Duplicate Prevention:**
   - **Scenario:** Job fails midway through batch insertion and is retried.
   - **Recovery:** Idempotency checks on `importRecordId` and row index prevent duplicate record creation.

4. **Dead Letter Queue (DLQ) Visibility:**
   - **Scenario:** Records failing validation or extraction after max retries are moved to DLQ status (`PERMANENTLY_FAILED`).
   - **Recovery:** Rows are surfaced with explicit error reasons in DLQ administrative inspection views.

---

## 7. Security Test Plan

1. **No Secret Exposure in Evidence:**
   - Verify `FieldEvidence` and `evidenceSnippet` filter out authorization headers, passwords, API tokens, or PII keys.

2. **No Unsanctioned Acquisition / Bypass:**
   - Confirm source connectors strictly reject CAPTCHA, paywall, or `robots.txt` bypass attempts.

3. **No Direct Domain Writes or Auto-Publishing:**
   - Verify `canAutoMerge()`, `canAutoPublish()`, and `canWriteToDomain()` systematically evaluate to `false` in Phase 06.

4. **No Direct Domain Repository Access:**
   - Confirm Phase 06 import components consume snapshots and value objects, with zero access to domain entity repositories.

5. **No Synthetic AI Value Generation:**
   - Ensure every `ExtractionCandidate` generated includes verifiable `FieldEvidence` and `ConfidenceScore`.

---

## 8. Exit Criteria
- All SLO target metrics verified via automated unit and performance benchmarks.
- Streaming parser load tests pass at 100K record volumes with zero memory leaks.
- Chaos recovery scenarios demonstrate clean idempotency and DLQ tracking.
- Security tests confirm zero direct domain writes, zero auto-publishing, and strict evidence verification.
