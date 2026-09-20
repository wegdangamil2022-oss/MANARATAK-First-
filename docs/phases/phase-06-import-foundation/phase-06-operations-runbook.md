# Phase 06: Operations Runbook & Incident Management Guide

## 1. Overview & Governance
- **Document Title:** Phase 06 Import Foundation Operations Runbook
- **Target File Path:** `docs/phases/phase-06-import-foundation/phase-06-operations-runbook.md`
- **Purpose:** Standard operating procedures, triage workflows, operator permissions/prohibitions, audit requirements, and escalation paths for administrative operations on Phase 06 Import Foundation.

---

## 2. Operational Incident Playbooks

### Incident 1: Stuck Import Batch (`PROCESSING` State Timeout)
- **Symptom:** Import job remains in `PROCESSING` status for over 15 minutes with no record progress updates.
- **Triage Steps:**
  1. Inspect job log details for worker heartbeat or unhandled stream parsing exceptions.
  2. Verify queue worker health and database connectivity.
- **Resolution:**
  - Execute `pause` followed by `cancel` on the stuck job.
  - Operator may trigger `replay` to re-enqueue the import job from staging.

### Incident 2: Failed Queue Job
- **Symptom:** Import job transitioned to `FAILED` with an associated `errorMessage`.
- **Triage Steps:**
  1. Review error message (e.g., malformed header, corrupt byte stream, disk/memory limit).
  2. Determine if error is transient (network/timeout) or structural (invalid payload).
- **Resolution:**
  - For transient issues: Trigger `replay` operation via admin operations interface.
  - For structural issues: Mark batch as `NEEDS_REVISION` and request corrected source file.

### Incident 3: Dead Letter Queue (DLQ) Records
- **Symptom:** Specific import rows flagged as `PERMANENTLY_FAILED` in the job staging report.
- **Triage Steps:**
  1. Query DLQ record list for error codes (e.g., failed validation, type mismatch).
  2. Verify if failure stems from source drift or bad input formatting.
- **Resolution:**
  - Export DLQ error summary for data supplier review.
  - Valid rows in the same job remain staged; invalid rows are quarantined.

### Incident 4: Schema or Content Drift Detected
- **Symptom:** Source connector or job triggers `SCHEMA_DRIFT` or `CONTENT_DRIFT` alert.
- **Triage Steps:**
  1. Inspect `DriftDetectionService` comparison report between source version and expected schema.
  2. Identify newly added, modified, or missing target fields.
- **Resolution:**
  - If drift is legitimate source evolution: Update `RuleBasedFieldExtractionGateway` configuration and re-run extraction.
  - If drift indicates broken source format: Update connector status to `NEEDS_REVIEW` or `BLOCKED`.

### Incident 5: Source Connector Disabled or Blocked
- **Symptom:** Scheduled connector import job fails immediately with `CONNECTOR_BLOCKED`.
- **Triage Steps:**
  1. Check source registry gateway status for authentication/rate-limiting block flags.
  2. Verify source availability and compliance headers.
- **Resolution:**
  - Operator updates source status to `NEEDS_REVIEW` or re-enables source after verifying source access.

### Incident 6: High Failed-Row Rate (> 10%)
- **Symptom:** Batch error percentage exceeds 10% threshold during ingestion.
- **Triage Steps:**
  1. Check if column headers shifted or delimiter settings were incorrect.
  2. Inspect first 5 failed row samples.
- **Resolution:**
  - Pause active parsing; cancel processing if error rate continues rising.
  - Re-configure import mapping schema before re-attempting import.

### Incident 7: Duplicate Import Attempts
- **Symptom:** Multiple import jobs submitted for identical source file or payload hash.
- **Triage Steps:**
  1. Compare `contentHash` and `sourceId` across active/recent jobs.
- **Resolution:**
  - Cancel duplicate job; retain primary processing job.

### Incident 8: Build or Typecheck Blocked by Unrelated Pre-existing Errors
- **Symptom:** System typecheck (`npm run typecheck`) reports pre-existing TS errors in unrelated packages/use-cases during pipeline execution.
- **Triage Steps:**
  1. Classify typecheck output to isolate import-foundation files from pre-existing errors in other domains (e.g., workflow, security, file-management).
  2. Verify that import-foundation tests and modules compile cleanly without adding new errors.
- **Resolution:**
  - Document pre-existing error baseline; proceed with import verification while flagging unrelated errors for respective domain owners.

---

## 3. Operator Actions Matrix

### Allowed Operator Actions
1. **Queue Management:** `pause`, `resume`, `cancel`, `replay` queued import jobs.
2. **Inspection:** View batch summaries, row-level staging records, field extraction candidates, drift reports, and DLQ errors.
3. **Source Governance:** Update source connector state to `ACTIVE`, `NEEDS_REVIEW`, or `BLOCKED`.
4. **Merge Proposal Handoff:** Submit prepared `MergeProposal` objects to downstream domain review queues (e.g., Scholarships, Universities, Majors).

### Forbidden Operator Actions
1. **NO Direct Database Edits:** Modifying staging or production database tables directly via SQL or raw queries is strictly prohibited.
2. **NO Manual Publishing from Phase 06:** Phase 06 operators cannot force-publish staging data into production domain tables.
3. **NO Anti-Scraping / CAPTCHA Bypass:** Bypassing paywalls, CAPTCHA challenges, or `robots.txt` rules is forbidden.
4. **NO Secret Exposure:** Revealing API credentials, internal connection strings, or private auth keys in import logs or evidence snippets is prohibited.
5. **NO Unsolicited Deletions:** Deleting existing published domain record fields because an incoming import omitted those fields is strictly forbidden (`canDeleteExistingValue()` evaluates to `false`).

---

## 4. Audit & Logging Expectations
- Every administrative action (`pause`, `resume`, `cancel`, `replay`, status change) must generate an immutable audit log entry containing:
  - `operatorId`
  - `actionType`
  - `targetJobId` / `targetSourceId`
  - `timestamp`
  - `previousStatus` & `newStatus`
- Evidence snippets must log content hashes and connector version metadata without exposing sensitive header values.

---

## 5. Escalation Matrix

| Issue Category | Primary Contact | Secondary Escalation |
| :--- | :--- | :--- |
| **Domain-Specific Merge Rules & Approvals** | Owning Domain Team (Scholarships, Universities, etc.) | Data Governance Lead |
| **Admin Portal UI & Review Queues** | Phase 23 Enterprise Admin Portal Owner | Frontend Platform Lead |
| **Queue Performance & Worker Outages** | Infrastructure / DevOps Owner | Site Reliability Engineering (SRE) |
| **Security, Secrets & Data Compliance** | Security & Compliance Lead | System Architect |
