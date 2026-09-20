# MANARATAK 2.0: Phase 5.5 Enterprise Asset Platform (EAP) Implementation Baseline

## 1. Implementation Summary

The Phase 5.5 Enterprise Asset Platform (EAP) baseline represents the official transition from legacy File Management into a security-hardened, high-performance, and fully abstracted asset orchestration engine. This document establishes the concrete file layout and directory structure for the implementation of EAP according to the frozen EAP Architecture Baseline (Revision: 5.5.0). The codebase maintains absolute provider neutrality, implements the dual-bucket quarantine ingestion flow, exposes clear ports for magic-bytes verification, malware scanning, and EXIF sanitization, and maps asset relationships using the centralized `Enterprise Asset Usage Registry`.

---

## 2. Transitioned & Refactored Files Directory

### 2.1. Domain Layer Core (packages/domain/src/asset-platform/)

- **Enums & States:**
  - `packages/domain/src/asset-platform/enums/SecurityClassification.ts` (Public vs. Private categorization)
  - `packages/domain/src/asset-platform/enums/RetentionCategory.ts` (Temporary, Permanent, Archived, Soft Deleted)
  - `packages/domain/src/asset-platform/enums/AssetLifecycleState.ts` (Unidirectional state machine: Initiated, Uploaded, Validating, Sanitizing, Active, Archived, Soft Deleted, Purged)
- **Value Objects:**
  - `packages/domain/src/asset-platform/value-objects/AssetId.ts` (Immutable UUID tracker)
  - `packages/domain/src/asset-platform/value-objects/AssetReference.ts` (Cross-context reference wrapper)
  - `packages/domain/src/asset-platform/value-objects/StorageLocator.ts` (Provider-agnostic coordinates for Quarantine vs. Clean locations)
  - `packages/domain/src/asset-platform/value-objects/AssetMetadata.ts` (Extracted dimensions, size, mime-type)
  - `packages/domain/src/asset-platform/value-objects/Checksum.ts` (SHA-256 integrity verifier)
  - `packages/domain/src/asset-platform/value-objects/RetentionMetadata.ts` (Retention policies and deletion offsets)
  - `packages/domain/src/asset-platform/value-objects/OwnerReference.ts` (Abstacted uploader context tracker)
  - `packages/domain/src/asset-platform/value-objects/AssetVersion.ts` (Asset historical chain tracker)
- **Aggregate Root:**
  - `packages/domain/src/asset-platform/aggregates/AssetRecord.ts` (Aggregate Root managing asset registration, malware state, metadata sanitization, versions, and lifecycle status)
- **Domain Events:**
  - `packages/domain/src/asset-platform/events/AssetRegisteredEvent.ts`
  - `packages/domain/src/asset-platform/events/AssetUploadedEvent.ts`
  - `packages/domain/src/asset-platform/events/AssetMalwareScanSucceededEvent.ts`
  - `packages/domain/src/asset-platform/events/AssetMalwareScanFailedEvent.ts`
  - `packages/domain/src/asset-platform/events/AssetSanitizedEvent.ts`
  - `packages/domain/src/asset-platform/events/AssetActivatedEvent.ts`
  - `packages/domain/src/asset-platform/events/AssetArchivedEvent.ts`
  - `packages/domain/src/asset-platform/events/AssetRestoredEvent.ts`
  - `packages/domain/src/asset-platform/events/AssetDeletedEvent.ts`
- **Domain Service & Interfaces (Ports):**
  - `packages/domain/src/asset-platform/gateways/IStorageProviderGateway.ts` (Abstract storage facade for dual-bucket tracking and signed URLs)
  - `packages/domain/src/asset-platform/gateways/IAssetMalwareScannerGateway.ts` (Signature and heuristic check hooks, magic-bytes checks)
  - `packages/domain/src/asset-platform/gateways/IImageProcessingGateway.ts` (EXIF stripping, resizing, AVIF/WebP breakpoint generation)
  - `packages/domain/src/asset-platform/gateways/IAssetUsageRegistryGateway.ts` (Interface for querying active domain references before deleting assets)
  - `packages/domain/src/asset-platform/services/AssetIntegrityValidationService.ts` (Validates binary checksum matches and metadata consistency)
  - `packages/domain/src/asset-platform/repositories/IAssetRecordRepository.ts` (Specification-pattern-based persistence contract)

### 2.2. Application Layer Core (packages/application/src/asset-platform/)

- `packages/application/src/asset-platform/dtos/AssetPlatformDtos.ts` (Data contracts for ingestion commands and lookup requests)
- `packages/application/src/asset-platform/use-cases/IngestAssetUseCase.ts` (Orchestrates dual-bucket ingestion, validation trigger, and promotion)
- `packages/application/src/asset-platform/use-cases/ProcessAssetLifecycleUseCase.ts` (Handles archival, restoration, usage checks, and soft delete execution)

### 2.3. Infrastructure Layer Adapters (packages/infrastructure/src/asset-platform/)

- `packages/infrastructure/src/asset-platform/repositories/SqlAssetRecordRepository.ts` (Relational persistent storage adapter)
- `packages/infrastructure/src/asset-platform/gateways/MultiProviderStorageGateway.ts` (S3/R2/GCS adapter utilizing unified configuration settings)
- `packages/infrastructure/src/asset-platform/gateways/ClamAvMalwareScannerGateway.ts` (Malware engine adapter)
- `packages/infrastructure/src/asset-platform/gateways/SharpImageProcessingGateway.ts` (Sharp-based metadata stripping and dynamic image resize adapter)
- `packages/infrastructure/src/asset-platform/gateways/AssetUsageRegistryGateway.ts` (Downstream context checker)

### 2.4. Public Interface & Transport Routing (apps/api/src/)

- `apps/api/src/presentation/api/router/AssetPlatformRouter.ts` (Exposes secure RESTful endpoints for asset registration, upload coordination, usage checks, and state queries)

---

## 3. Section Migration Matrix

Below is the section-by-section migration analysis from legacy File Management to EAP Implementation:

| Original Implementation Section                           | New EAP Implementation Section                           | Migration Action | Architectural Reason & Justification                                                                                                          |
| :-------------------------------------------------------- | :------------------------------------------------------- | :--------------: | :-------------------------------------------------------------------------------------------------------------------------------------------- |
| **Section 2: Files Created (FileManagement)**             | **Section 2: Transitioned & Refactored Files Directory** |   **Replace**    | Reorganized and updated paths to follow `asset-platform` conventions and include new EAP modules (malware, Sharp processing, usage registry). |
| **Section 4: Architecture Validation & Refinement Audit** | **Section 4: EAP Validation & Refinement Audit**         |    **Modify**    | Augmented to verify magic-bytes verification, EXIF stripping, dual-bucket routing, and versioning pipelines.                                  |
| **Section 5: DDD Validation**                             | **Section 5: DDD Validation**                            |    **Modify**    | Validated that the state machine encompasses both quarantine and sanitization phases.                                                         |
| **Section 8: Production Readiness**                       | **Section 8: Production Readiness**                      |    **Modify**    | Status updated to capture the multi-provider abstraction and zero-trust ingestion model.                                                      |

---

## 4. EAP Validation & Refinement Audit

- **Asset Aggregate Purity:** Verified that `AssetRecord` purely manages the lifecycle, version chains, metadata, and security states of the digital asset. Physical binaries never touch Domain memory space; ingestion is managed via signed upload parameters pointing to Quarantine.
- **Malware Scanning Isolation:** Signature and heuristic scanning is executed entirely via background tasks or webhook callbacks mapped to `IAssetMalwareScannerGateway`, preventing resource exhaustion of core API threads.
- **Metadata Sanitization & OCR Isolation:** The processing adapters utilize high-performance image processing (e.g., `Sharp`) to strip GPS data and camera fingerprints directly during raw stream validation before files are promoted to the Clean bucket. The text extraction (OCR) pipeline handles processing infrastructure and outputs raw text; semantic parsing and domain mapping are strictly isolated inside downstream business handlers.
- **Pluggable Architecture Verification:** Verified that every processor adapter (Malware scanner, image processor, OCR processor, compression engine) is completely decoupled behind independent domain gateways, supporting hot-swappable implementations without touching domain core structures.
- **Edge Routing and CDN Cache Policies:** Verified that public assets are cached indefinitely at the edge with content-hash-based routing. Private assets generate short-lived signed keys, routing through a secure edge proxy that conceals the physical bucket's real URL.

---

## 5. DDD Validation

- **Aggregate Integrity:** State machine transitions strictly enforce that an asset cannot transition from `Uploaded` directly to `Active` without passing through `Validating` and `Sanitizing`.
- **Centralized Usage Validation:** The `IAssetUsageRegistryGateway` is queried inside the deletion workflow. If any active references reside within the CMS or scholarships context, the deletion is blocked, protecting reference integrity.
- **Specification Pattern Repository:** Queries on metadata are executed via standard specification interfaces, protecting EAP persistence boundaries from custom SQL bloat.

---

## 6. Dependency Validation

- **Pure Domain Core:** `packages/domain/src/asset-platform/` has zero external dependencies, zero ORM/database imports, and zero framework imports.
- **Strict Outer-to-Inner Dependencies:** Verified that all adapters in `packages/infrastructure/src/` implement ports declared in the Domain. No implementation leakage occurs.

---

## 7. Change Summary

- **Global Taxonomy Shift:** Migrated from "File" prefix to "Asset" prefix across all filenames, namespaces, configurations, and document sections.
- **Zero-Trust Upload Added:** Incorporated dual-bucket coordinates (Quarantine vs Clean) in `StorageLocator` value objects.
- **EXIF Stripping Mandated:** Added Sharp-based processing hooks directly into the upload promotion lifecycle.
- **Usage Check Centralized:** Established EAP-owned usage table validation prior to deletion commands.
- **Versioning Enabled with Boundaries:** Introduced the `VersionChain` attribute to track asset history natively. Defined explicit boundaries preventing any overlap with CMS, Translation, or Workflow content versions (EAP manages binary versioning only).
- **Pluggable Architecture Enforced:** Codified conceptual and physical boundaries treating all scanners, metadata extractors, and processors as modular, hot-swappable plugins rather than hardcoded core behaviors.
- **OCR Responsibility Confined:** Formally limited OCR processes to text-extraction infrastructure, isolating semantic interpretations to respective consuming business services.

---

## 8. Final Compliance Report

### 8.1. ADR-024 Alignment

- **Status:** **COMPLIANT**
- **Findings:** The layout matches the approved ADR-024 design, separating ingestion, malware security, metadata scrubbing, breakpoint extraction, and edge routing.

### 8.2. Master Blueprint Alignment

- **Status:** **COMPLIANT**
- **Findings:** Matches section 62 (Asset Usage Registry) and the decoupled CMS asset reference policies of the Master Blueprint.

### 8.3. Single Source of Truth Preservation

- **Status:** **PRESERVED**
- **Findings:** Decouples raw assets from business databases, ensuring EAP acts as the unified, highly secure custodian of all digital assets.

---

## 9. Official ARB Approval

- **Revision:** 5.5.0
- **Status:** **APPROVED & FROZEN**
- **Compliance Certification:** The Architecture Review Board certifies that the Phase 5.5 Enterprise Asset Platform (EAP) Implementation Baseline adheres strictly to clean architecture principles, avoids provider lock-in, and provides a unified, security-hardened asset lifecycle management suite for the MANARATAK 2.0 platform.

---

### Navigation

- **Previous**: [Phase 5.5 Enterprise Asset Platform (EAP) Architecture Baseline](phase-05-05-assetplatform-architecture-baseline.md)
- **Next**: [Phase 5.6 Notification Architecture Baseline](../Notification/phase-05-06-notification-architecture-baseline.md)
