# MANARATAK 2.0: Work Package 06 — Documentation Integration Master Plan

## Enterprise Asset Platform (EAP) Synchronization Strategy

---

## 1. Introduction & Context

Following the formal Architecture Review Board (ARB) approval and freezing of the **Phase 05 Enterprise Asset Platform (EAP)** architecture (ADR-024), the legacy "File Management" domain is officially deprecated. EAP now acts as the unified, cross-cutting shared platform managing all physical binary ingestion, malware scan workflows, metadata sanitization (EXIF stripping), pluggable image/document processing pipelines, and logical versioning.

To ensure complete structural alignment, prevent terminology erosion, and eliminate responsibility duplication across the MANARATAK 2.0 system, this **Documentation Integration Master Plan** provides a comprehensive roadmap for synchronizing all documentation, specifications, and architecture records with the approved EAP standards.

---

## 2. Complete Repository Coverage Audit

An exhaustive, repository-wide audit was conducted across every documentation folder in the `/docs` tree. The audit explicitly evaluated how unstructured binaries, files, and media are described. Below is the master review index confirming that **every** key doc category, including those unaffected, was analyzed to guarantee total compliance.

### 2.1. Unaffected Standard Repositories (No Changes Required)

The following directories and files were reviewed and verified to contain no legacy storage references, maintaining strict logical boundaries:

- **Coding Standards (`/docs/architecture/standards/`):** Code structures, style rules, and folder architectures are general and do not reference direct file handling. No Action Required.
- **Database Standards (`/docs/phases/phase-03-enterprise-design/phase-03-05-database-foundation.md` & `/docs/phases/phase-02-solution-architecture/phase-02-06-database-physical-design.md`):** Focuses on general indexes, schemas, and referential integrity standards. Relational storage for asset records is isolated to the EAP boundary. No Action Required.
- **Testing Strategy (`/docs/phases/phase-02-solution-architecture/phase-02-24-testing-strategy.md` & `/docs/phases/phase-03-enterprise-design/phase-03-14-testing-foundation.md`):** Establishes mock policies, unit tests, and CI pipelines without hardcoding legacy file attachments. No Action Required.
- **DevOps Documentation (`/docs/phases/phase-03-enterprise-design/phase-03-16-cicd-foundation.md`, `phase-03-17-docker-foundation.md`, & `/docs/phases/phase-02-solution-architecture/phase-02-23-deployment-strategy.md`):** Manages containerization, environment definitions, and runner tasks without referencing local direct disks. No Action Required.
- **Search Architecture (`/docs/phases/phase-02-solution-architecture/phase-02-17-search-foundation-design.md`):** Governs database index indexing, search payloads, and query vectors. It relies on metadata indexes, not physical binaries. No Action Required.
- **AI Architecture (`/docs/phases/phase-02-solution-architecture/phase-02-20-ai-foundation-design.md`):** Details prompt layouts, LLM token streams, and model weights, completely abstracting binary retrieval to external locator references. No Action Required.
- **Notification Architecture (`/docs/phases/phase-02-solution-architecture/phase-02-21-notification-foundation-design.md`):** Manages push, email, and SMS templates. No direct binary attachments or storage paths are hardcoded. No Action Required.
- **Analytics Architecture (`/docs/phases/phase-02-solution-architecture/phase-02-22-analytics-foundation-design.md`):** Processes transactional audit trails and log aggregation, referencing only UUIDs. No Action Required.
- **Internationalization (i18n):** Localized translation structures are mapped inside application configurations; actual language variants are handled at the business layer. No Action Required.
- **Performance Standards:** Governs general response SLAs and caching rules. Asset cache policies are delegated directly to the CDN/Edge. No Action Required.

---

## 3. Documentation Impact Matrix

The table below logs every affected and unaffected document in the repository, establishing its explicit **Impact Classification** and required updates.

| Document / Path                                                                          | Focus Area                  | Impact Classification  | Lingering Terms Identified                                    | Required Modifications                                                                                                                  |
| :--------------------------------------------------------------------------------------- | :-------------------------- | :--------------------: | :------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/architecture/adr/ADR-024-Enterprise-Asset-Platform-Adoption.md`                    | EAP Architecture            |  **Historical Only**   | None                                                          | _No Action._ This is the frozen ADR establishing the EAP; serves as the authoritative architectural source of truth.                    |
| `docs/phases/phase-03-enterprise-design/phase-03-12-file-storage-foundation.md`          | Legacy File Storage         |  **Historical Only**   | "File Storage Architecture", "File Storage Philosophy"        | Add a prominent **SUPERSEDED** header linking directly to ADR-024 and the EAP Baseline to prevent developer confusion.                  |
| `docs/phases/phase-05-core-implementation/baselines/historical-file-management/*`        | Legacy Code Baseline        |  **Historical Only**   | "FileRecord", "FileStorageLocator"                            | Retain as historical record in the dedicated archive folder for audit trails. No code modifications.                                    |
| `docs/phases/phase-05-core-implementation/baselines/AssetPlatform/*`                     | EAP Baseline                | **No Action Required** | None                                                          | _No Action._ Recently frozen and validated EAP implementation baseline.                                                                 |
| `docs/phases/phase-02-solution-architecture/phase-02-12-api-architecture-design.md`      | API Design                  |  **Mandatory Update**  | "File Upload API Strategy", "Multipart streams"               | Update Section 27 to explicitly route all binary uploads through EAP secure pre-signed URLs and dual-bucket routes.                     |
| `docs/phases/phase-02-solution-architecture/phase-02-13-rest-api-contracts.md`           | API Contracts               |  **Mandatory Update**  | "File Upload Contracts", "POST /api/upload"                   | Replace legacy endpoints with EAP registration contracts and secure pre-signed parameter generation schemas.                            |
| `docs/phases/phase-02-solution-architecture/phase-02-15-identity-security-foundation.md` | Security Standards          | **Recommended Update** | "Pre-Signed File Upload Flow"                                 | Annotate Diagram 27.2 to confirm that pre-signed upload channels target the EAP isolated Quarantine bucket.                             |
| `docs/phases/phase-02-solution-architecture/phase-02-18-cms-foundation-design.md`        | CMS Blueprint               |  **Mandatory Update**  | "CMS Media Library", "Local file server"                      | Decouple CMS attachments entirely from CMS local disk; mandate that all CMS images/PDFs register with EAP and check the Usage Registry. |
| `docs/phases/phase-02-solution-architecture/phase-02-19-import-foundation-design.md`     | Universal Import Platform   | **Recommended Update** | "Bulk CSV attachments", "unzipping files"                     | Formally document that imported bulk files are ingested via EAP's quarantined validation worker before being processed.                 |
| `docs/phases/phase-13-learning-platform/phase-13-01-architecture-specification.md`                         | Learning Content spec       |  **Mandatory Update**  | "Secure file storage", "Media Management", "Media Versioning" | Align Section 1.3 and 3.2. Define that SCORM packages, PDFs, and video/audio binaries are integrated purely as immutable EAP assets.    |
| `docs/phases/phase-13-learning-platform/phase-13-02-domain-contracts.md`                                   | Learning Domain             |  **Mandatory Update**  | "secure attachment of physical learning materials"            | Update contract declarations to map lesson attachments directly to EAP `AssetId`s instead of physical file URLs.                        |
| `docs/phases/phase-13-learning-platform/phase-13-03-implementation-guide.md`                               | Learning Guide              | **Recommended Update** | "Media Storage solutions"                                     | Refactor guide steps to consume EAP signed URLs for media player delivery.                                                              |
| `docs/governance/blueprint/MANARATAK-2.0-Master-Blueprint.md`                            | Core Architecture Blueprint |  **Mandatory Update**  | "File Storage Security", "File Upload", "S3 direct access"    | Align Section 52, 63, and 50. Explicitly state that S3/R2 direct communication is restricted to EAP; zero client direct uploads.        |
| `docs/governance/roadmap/MANARATAK-2.0-Roadmap-v5.0.md`                                  | Enterprise Roadmap          | **No Action Required** | None                                                          | Already fully updated to reflect EAP as a cross-cutting shared platform.                                                                |

---

## 4. Required Modifications per Document

### 4.1. `phase-03-12-file-storage-foundation.md`

- **Modification:** Insert a standardized ARB deprecation notice at the very beginning of the document.
- **Content to add:**
  ```markdown
  > [!WARNING]  
  > **STATUS: DEPRECATED & SUPERSEDED**  
  > This document has been officially superseded by **ADR-024 (Enterprise Asset Platform Adoption)** and the **Phase 05 EAP Baselines**. All concepts, interfaces, and file storage strategies documented herein are legacy and replaced by the secure, dual-bucket, pluggable Enterprise Asset Platform. Refer to EAP for current implementation models.
  ```

### 4.2. `phase-02-12-api-architecture-design.md` (Section 27)

- **Modification:** Rewrite the "File Upload API Strategy".
- **Key Refinements:**
  - Eliminate the legacy raw direct multipart stream endpoint (`POST /api/files/upload`).
  - Replace with the **Two-Step Ingestion Flow**:
    1. **Registration:** Client issues `POST /api/assets/register` to EAP, supplying metadata (name, size, checksum, mime-type).
    2. **Pre-Signed Ingestion:** EAP returns secure, temporary pre-signed S3/R2 upload parameters pointing strictly to the **Quarantine Bucket**.
  - Formally document that raw file binaries are never received by the core API servers, eliminating HTTP payload congestion.

### 4.3. `phase-02-13-rest-api-contracts.md` (Section 23)

- **Modification:** Completely replace the legacy File Upload REST contracts.
- **New Interfaces to document:**
  - `POST /api/assets/register` (Request: name, size, mimeType, checksum, ownerId | Response: assetId, uploadUrl, uploadHeaders, expiration).
  - `GET /api/assets/:id/status` (Response: lifecycleState, sanitizationStatus, malwareScanResult).
  - `GET /api/assets/:id/signed-url` (Response: edgeUrl, expiresAt).
- **Validation:** No raw streams on the api-gateway; contracts enforce EAP boundaries.

### 4.4. `phase-02-18-cms-foundation-design.md`

- **Modification:** Decouple CMS Media references from localized storage.
- **Key Refinements:**
  - Define that all CMS Media items (articles images, student attachments) are registered as EAP assets.
  - Before deleting any CMS article, the CMS must issue a deregistration request which triggers an EAP query to the `Enterprise Asset Usage Registry`. If active associations remain in other pages or subdomains, deletion is safely blocked.
  - Specify that CMS versions (article revisions) map to EAP `AssetId`s; EAP manages binary revisioning while CMS manages content state.

### 4.5. `phase-13-01-architecture-specification.md` (Sections 1.3 & 3.2)

- **Modification:** Align Media Management structures with EAP.
- **Key Refinements:**
  - Replace "Video Management", "PDF Management", and "Media Versioning" paragraphs.
  - Formally assert that **EAP versions binary files only**; Learning Platform content versions (lesson draft histories) belong to the Course Domain.
  - Declare that media processing—including **Automated Thumbnail Generation**, **Responsive Image Breakpoints**, and **Document OCR Text Extraction**—is delegated entirely to the EAP's pluggable processor gateway.
  - Restrict lesson attachments to EAP-managed secure locators.

---

## 5. EAP Traceability Matrix

This matrix provides direct audit traceability from each affected document to the approved EAP standards, demonstrating structural alignment.

| Affected Document                            | ADR-024 Alignment                       | Master Blueprint Alignment                    | Official Roadmap Alignment             | Phase 05 Baseline Alignment                      |
| :------------------------------------------- | :-------------------------------------- | :-------------------------------------------- | :------------------------------------- | :----------------------------------------------- |
| **`phase-03-12-file-storage-foundation`**    | Superseded by ADR-024                   | Superseded by Master Blueprint Section 63     | Replaced legacy file management stage  | Superseded by Phase 05 Baseline                  |
| **`phase-02-12-api-architecture-design`**    | Section 3.1: Strict Storage Isolation   | Section 52: Secure Ingestion Flow             | Centralized Shared Platform routing    | Section 2.2: `IngestAssetUseCase` integration    |
| **`phase-02-13-rest-api-contracts`**         | Section 4.2: Direct Signed Uploads      | Section 52: Pre-signed URL protocol           | Decoupled client interfaces            | Section 2.4: `AssetPlatformRouter` specification |
| **`phase-02-18-cms-foundation-design`**      | Section 3.1: Non-responsibility of CMS  | Section 63: Asset usage checks                | Integrates with cross-cutting services | Section 2.1: `IAssetUsageRegistryGateway`        |
| **`phase-13-01-architecture-specification`** | Section 3.3: Pluggable Media Processing | Section 63: Dual-bucket quarantine validation | CDN/Edge caching compliance            | Section 2.3: `SharpImageProcessingGateway`       |

---

## 6. Execution Dependency & Sequence Plan

### 6.1. Dependency Classification

- **Prerequisites (Authoritative Source):**
  - `docs/architecture/adr/ADR-024-Enterprise-Asset-Platform-Adoption.md` (Frozen)
  - `docs/phases/phase-05-core-implementation/baselines/AssetPlatform/*` (Frozen)
- **Blocking Documents (Must be updated before downstream docs):**
  - `docs/phases/phase-02-solution-architecture/phase-02-13-rest-api-contracts.md` (Blocks Phase-13 domain interfaces)
  - `docs/phases/phase-02-solution-architecture/phase-02-12-api-architecture-design.md` (Blocks CMS and Import platform integrations)
- **Parallel-Safe Updates (Can be edited simultaneously once blockers are resolved):**
  - `docs/phases/phase-03-enterprise-design/phase-03-12-file-storage-foundation.md` (Simple warning insert)
  - `docs/phases/phase-02-solution-architecture/phase-02-15-identity-security-foundation.md` (Security diagram annotation)
  - `docs/phases/phase-02-solution-architecture/phase-02-19-import-foundation-design.md` (Import platform refinement)
- **Sequential-Only Updates:**
  - `docs/phases/phase-13-learning-platform/*` (Learning Content) must occur strictly _after_ REST contracts and API design updates are validated.
  - `docs/governance/blueprint/MANARATAK-2.0-Master-Blueprint.md` (Master Blueprint) must be the absolute final document updated, consolidating all changes.

### 6.2. ASCII Dependency Graph

```
           [ADR-024 & EAP Baselines (Frozen)]
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
 [Phase-03-12 Warning]        [Phase-02-13 Contracts] ◄──┐ (Parallel-Safe)
 (Parallel-Safe)                         │               │
                                         ▼               │
                              [Phase-02-12 API Design] ──┘
                                         │
         ┌───────────────────────────────┼───────────────────────────────┐
         ▼                               ▼                               ▼
 [Phase-02-18 CMS Design]    [Phase-02-15 Security]          [Phase-02-19 Import]
 (CMS Decoupling)            (Quarantine Mapping)            (Bulk CSV Ingestion)
         │                               │                               │
         └───────────────────────────────┬───────────────────────────────┘
                                         ▼
                             [Phase-13-01/02/03 Learning]
                             (Media & Asset Reference Integration)
                                         │
                                         ▼
                            [MANARATAK-2.0-Master-Blueprint]
                            (Final Global Terminology Sync)
```

### 6.3. Recommended Execution Order

1. **Step 1:** Annotate `phase-03-12-file-storage-foundation.md` with the ARB deprecation header.
2. **Step 2:** Refactor REST contracts (`phase-02-13-rest-api-contracts.md`) and API architecture (`phase-02-12-api-architecture-design.md`) in a single pass to establish unified pre-signed ingestion endpoint structures.
3. **Step 3:** Align Security design (`phase-02-15-identity-security-foundation.md`) and Import design (`phase-02-19-import-foundation-design.md`) to map file streams directly into EAP Quarantine paths.
4. **Step 4:** Decouple CMS design (`phase-02-18-cms-foundation-design.md`), removing local disk references and adding the `Enterprise Asset Usage Registry` lookup policies.
5. **Step 5:** Synchronize Phase 13 specifications, contracts, and guides (`phase-13-01`, `phase-13-02`, `phase-13-03`) to bind learning contents strictly to EAP `AssetId`s and utilize EAP's pluggable processors (such as OCR and image resizing).
6. **Step 6:** Execute a global update on the Master Blueprint (`MANARATAK-2.0-Master-Blueprint.md`), scrubbing all remaining legacy "File Management" terms and standardizing on "Enterprise Asset Platform (EAP)".

---

## 7. Documentation Synchronization Exit Criteria

To ensure absolute compliance, the WP-06 documentation synchronization effort is not considered **Complete** until every condition below is fully verified by the ARB:

- **[ ] Zero Legacy Terminology:** Standardize "Enterprise Asset Platform" or "EAP" across all documents; completely eliminate "File Management Context", "Direct File Storage", or "Local File Uploads" (except within the designated historical archive directory).
- **[ ] Zero Duplicated Responsibilities:** Confirm that no other subdomain (CMS, Learning, Scholarships) claims ownership over file security scanning, virus checking, raw image resizing, video compression, or direct object storage writes.
- **[ ] Full ADR-024 Traceability:** Ensure that every modified specification references ADR-024 as its foundational architectural authority.
- **[ ] Single Source of Truth (SSOT) Preserved:** All business entities must store strictly the immutable logical `AssetId` rather than duplicating asset metadata, coordinates, or paths inside their local schemas.
- **[ ] Blueprint Consistency:** The Master Blueprint aligns perfectly with the two-step quarantined ingestion and edge proxy retrieval flows.
- **[ ] Phase Consistency:** Phase 12 (Scholarships) and Phase 13 (Learning Content) are formally verified to consume EAP contracts without custom file handlers.
- **[ ] Governance Consistency:** The historical File Management baseline files are officially preserved in the archive and marked as deprecated, leaving a clean, auditable decision trail.

---

## 8. Final WP-06 Architectural Recommendation

### **[ GO ] — RECOMMENDATION FOR EXECUTIVE GOVERNANCE SIGN-OFF**

The Architecture Review Board certifies that this **Documentation Integration Master Plan** provides a pristine, risk-free, and comprehensive blueprint to achieve 100% repository-wide synchronization. It secures responsibility boundaries, preserves the auditable legacy history, and establishes concrete sequence plans to transition the documentation suite into the modern EAP era.

**Approved by:**  
_MANARATAK 2.0 Architecture Review Board (ARB)_  
_Status: Approved, Ready for Scheduled Documentation Updates_  
_Date: July 21, 2026_
