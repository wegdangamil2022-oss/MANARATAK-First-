# MANARATAK 2.0: Phase 5.5 Enterprise Asset Platform (EAP) Architecture Baseline

## 1. Document Information

- **Document Type:** Architecture Design Document (Refactored Baseline)
- **Phase:** 5.5 (Transition to Enterprise Asset Platform)
- **Platform:** Enterprise Asset Platform (EAP)
- **Status:** APPROVED BASELINE (Revision: 5.5.0)
- **Date:** 2026-07-21
- **Governing Authority:** Architecture Review Board (ARB)
- **Traceability:** ADR-024 (Enterprise Asset Platform Adoption), MANARATAK 2.0 Master Blueprint

---

## 2. Vision

To provide a highly secure, completely abstracted, robust, and universally accessible Enterprise Asset Platform (EAP) that serves as the single source of truth for all digital assets across the entire MANARATAK 2.0 ecosystem. EAP acts as the cross-cutting engine for ingestion, malware scanning, sanitization, optimization, versioning, tracking, and edge distribution of assets, establishing rigorous boundaries between raw binary streams and downstream business workflows.

---

## 3. Purpose

The Enterprise Asset Platform replaces the legacy File Management platform, consolidating all asset lifecycle operations into a unified cross-cutting infrastructure. It guarantees that downstream business domains (such as CMS, Scholarships, Universities, and Students) are completely decoupled from raw filesystem operations, vendor SDKs, and network transport concerns. Downstream domains interact solely with immutable logical asset identities (`AssetId` / `AssetReference`) via EAP public interfaces, while EAP transparently manages secure storage, malware verification, EXIF sanitization, breakpoint processing, and CDN proxying.

---

## 4. Scope

The scope of this baseline covers:

1. **Security-Hardened Ingestion:** Implementation of a dual-bucket quarantine ingestion flow (Quarantine vs. Clean Object Storage separation).
2. **Malware Defense:** Multi-stage signature and heuristic malware scanning using magic bytes analysis rather than superficial file extensions.
3. **EXIF Metadata Sanitization:** Automated stripping of privacy-sensitive markers (e.g., GPS coordinates, device fingerprints, timestamps) from image media before promotion.
4. **On-the-Fly & Pre-Rendered Processing:** Optimized image compression, WebP/AVIF conversion, responsive breakpoint generation, video transcoding, OCR document parsing, and preview extraction.
5. **Asset Versioning:** Native tracking of logical asset version chains directly within the EAP domain.
6. **Centralized Asset Tracking:** Ownership and execution of the `Enterprise Asset Usage Registry` to prevent orphan records or accidental deletion of assets embedded in active downstream articles or records.
7. **Storage Provider Abstraction:** A provider-agnostic facade supporting Amazon S3, Cloudflare R2, GCS, Azure Blob, and MinIO.
8. **Edge Distribution:** Direct integration with an Enterprise CDN using pre-signed, short-lived URLs and secure edge proxies to prevent origin IP exposure.

---

## 5. Responsibilities

The Enterprise Asset Platform owns the following responsibilities:

- **Asset Identity & Reference Management:** Generating and maintaining immutable `AssetId`s and cross-context `AssetReference` value objects.
- **Dual-Bucket Storage Isolation:** Directing raw uploads to an isolated "Quarantine Object Storage Bucket" before promoting sanitized streams to the "Clean Storage Bucket."
- **Signature & Heuristic Malware Scanning:** Intercepting all raw incoming binaries, verifying magic bytes signatures, and running scanning engines.
- **EXIF Metadata Sanitization:** Automatically stripping camera profiles, geolocational coordinates, and system-level metadata from files prior to distribution.
- **Multi-Format Processing & Breakpoints:** Processing uploaded assets into web-optimized responsive breakpoints (thumbnail, mobile, tablet, desktop, retina).
- **Video & Document Processing Infrastructure:** Managing heavy media conversions, preview extractions, and running the document text-extraction (OCR) pipeline. _Boundary constraint:_ EAP is responsible ONLY for the secure ingestion, the OCR extraction pipeline execution, and the raw text processing infrastructure.
- **Centralized Asset Versioning:** Maintaining version histories of binary assets natively inside the EAP boundary. _Boundary constraint:_ EAP versions binary assets only. It does not manage business content versions.
- **Centralized Enterprise Asset Usage Registry:** Managing a global system of record of active `AssetId` associations across all consuming domains (e.g., CMS, Scholarships, Universities) to coordinate safe deletion.
- **Multi-Provider Abstraction:** Managing data movement across multiple object storage providers through provider-agnostic ports.
- **CDN & Edge Cache Coordination:** Interfacing with CDN layers to generate secure, signed edge links and enforce strict caching/eviction policies.
- **Comprehensive Lifecycle Coordination:** Driving the state transitions of assets from initial pre-registration to final physical erasure.

---

## 6. Non-Responsibilities

The EAP strictly excludes:

- **Business-Domain Relationships:** Storing rich domain properties (such as Student bios, University descriptions, or Scholarship guidelines) which are owned by consuming subdomains.
- **Business Authorizations:** Hardcoding specific user access control lists; EAP delegates authorization to global IAM and consumes queries via ports.
- **Media UI Components:** Providing specific CMS media library frontend layouts, browsing galleries, or collection builders (which are owned by the CMS and client applications).
- **Semantic OCR Interpretation:** Interpreting, evaluating, or applying business intelligence to raw OCR outputs. The semantic parsing, data binding, extraction of domain entities, and business validation of OCR text belong entirely to consuming business services (e.g., Admissions, CRM).
- **Business Content Versioning:** Managing higher-level business versions (such as CMS Article revisions, Translation version chains, Content draft histories, or Workflow states). Consuming business systems continue to own their business, translation, and content versions, mapping them internally to immutable EAP `AssetId`s as required.

---

## 7. Bounded Context

- **Context Name:** Enterprise Asset Platform Context
- **Domain:** Enterprise Infrastructure Subdomain
- **Classification:** Core / Generic Cross-Cutting Platform
- **Ubiquitous Language:**
  - **AssetRecord:** The central aggregate representing the logical asset, decoupled from the physical binary.
  - **AssetId / AssetReference:** Standardized immutable identifier and its cross-context wrapper.
  - **Quarantine Object Storage Bucket:** Isolated private space where raw uploads undergo scanning.
  - **Clean Storage Bucket:** Promoted storage space for sanitized, safe assets.
  - **StorageLocator:** Provider-neutral coordinates pointing to physical storage keys.
  - **Enterprise Asset Usage Registry:** Central database tracking which business domains reference a specific `AssetId`.
  - **EXIF Stripping:** The process of scrubbing sensitive privacy metadata.
  - **Magic Bytes:** The starting bytes of a file used for mathematical file-type verification.

---

## 8. Core Concepts

### 8.1. Logical Asset vs. Physical Binary Stream

To prevent memory leaks and event-loop blocking, the EAP Domain never handles raw binary streams or byte arrays directly. The logical `AssetRecord` owns metadata, verification states, versioning chains, and lifecycle states, while physical streams are routed directly to Quarantine or Clean storage backends by infrastructure adapters guided by the application.

### 8.2. Dual-Bucket Quarantine Pipeline

EAP implements a zero-trust upload pattern:

1. Downstream client requests an ingestion token.
2. Client streams binary content directly to the **Quarantine Object Storage Bucket**.
3. EAP triggers a malware check and checks magic bytes signatures.
4. EAP strips EXIF metadata and generates responsive breakpoints.
5. Thoroughly verified binaries are promoted to the **Clean Storage Bucket**.

```
[Client] ---> Ingestion Token ---> [EAP API]
   |
   +--------> Stream Binary -------> [Quarantine Storage Bucket]
                                              |
                                     [Malware & Magic Bytes Verification]
                                              |
                                     [EXIF Stripping & Processing]
                                              |
                                              v
[Consumer] <-- CDN Proxied Link <-- [Clean Storage Bucket]
```

### 8.3. Centralized Enterprise Asset Usage Registry

Consuming business domains (such as CMS, Scholarships, and Universities) must register their active references to an `AssetId` with EAP. Before any deletion command is executed, EAP consults the `Enterprise Asset Usage Registry` to ensure the asset is not referenced. If active references are found, the deletion is blocked, ensuring absolute system integrity.

### 8.4. Storage Provider Agnosticism

The platform remains entirely unaware of cloud-vendor-specific details. All storage logic is handled via the abstract `IStorageProviderGateway` port, mapping inputs to S3, Cloudflare R2, Azure Blob, GCS, or MinIO adapters purely through dependency injection.

### 8.5. Pluggable Asset Processing Architecture

To maintain the platform's long-term extensibility and adhere to the Single Responsibility Principle, EAP implements a pluggable, modular processor architecture.
Processors—including the **Image Processor**, **Video Processor**, **OCR Processor**, **Malware Scanner**, **Metadata Extractor**, and **Compression Engine**—are conceptually and physically implemented as decoupled plug-in modules rather than fixed, monolithic platform components.

Each processing capability is bounded by an abstract Domain Port (e.g., `IImageProcessingGateway`, `IAssetMalwareScannerGateway`). The infrastructure layer exposes pluggable adapters implementing these interfaces, allowing any module to be replaced or upgraded dynamically (e.g., swapping a CPU-based Image Processor adapter for a GPU-accelerated cloud function) without affecting the core EAP domain or consuming applications.

---

## 9. Domain Model (Clean Architecture Representation)

### 9.1. Aggregates & Entities

#### AssetRecord (Aggregate Root)

Represents the unified logical identity, metadata, processing history, versioning chain, and lifecycle of an asset.

- **Properties:**
  - `AssetId` (Immutable)
  - `StorageLocator` (Abstract, tracking both Quarantine and Clean coordinates)
  - `Checksum` (Mathematical hash of validated binary)
  - `AssetMetadata` (Dimensions, size, magic-bytes verified MIME type)
  - `RetentionMetadata` (Temporary vs Permanent, soft delete flags)
  - `SecurityClassification` (Public vs Private)
  - `OwnerReference` (The uploading system/user identifier)
  - `VersionChain` (Ordered list of versions)
  - `LifecycleState` (Current state of the asset)
- **Invariants:**
  - An asset can only be marked `Active` if its malware scan has successfully passed.
  - Deletion is rejected if there are active registered consumers in the `Enterprise Asset Usage Registry`.
  - Physical promotion is blocked if the calculated upload checksum fails to match.

### 9.2. Value Objects

- **AssetId:** Globally unique immutable identifier.
- **AssetReference:** Standardized cross-context reference object used by all downstream systems.
- **StorageLocator:** Fully abstract representation of storage keys and regions (devoid of "s3://", bucket names, or cloud vendor terminology).
- **AssetMetadata:** Byte size, verified MIME-type, height/width dimensions, and extracted non-sensitive attributes.
- **Checksum:** Crypto hash value (SHA-256) and algorithm.
- **RetentionMetadata:** Categorization (Temporary, Permanent, Archived, Soft Deleted) and deletion/archive timestamps.
- **SecurityClassification:** Public (Edge cached) vs Private (Pre-signed URL required).
- **OwnerReference:** Generic identifier tracing the uploading system context.
- **AssetVersion:** Represents a single logical revision containing a specific `AssetId`, date, and author.

---

## 10. Domain Ports & Gateways

The outer boundaries of the Domain are defined by interfaces (ports) that infrastructure adapters must implement:

1. **IStorageProviderGateway:**
   - `generateUploadToken(target: "Quarantine" | "Clean", context: AssetRecord): Promise<string>`
   - `promoteFromQuarantine(record: AssetRecord): Promise<StorageLocator>`
   - `generateSignedReadUrl(locator: StorageLocator, ttlSeconds: number): Promise<string>`
   - `deletePhysical(locator: StorageLocator): Promise<void>`
2. **IAssetMalwareScannerGateway:**
   - `scanBinary(locator: StorageLocator): Promise<{ clean: boolean, signature: string }>`
   - `verifyMagicBytes(locator: StorageLocator): Promise<string>` (Returns verified MIME type based on binary signature)
3. **IImageProcessingGateway:**
   - `stripExifMetadata(locator: StorageLocator): Promise<void>`
   - `generateBreakpoints(locator: StorageLocator): Promise<StorageLocator[]>`
4. **IAssetUsageRegistryGateway:**
   - `getUsageCount(assetId: AssetId): Promise<number>`
   - `registerUsage(assetId: AssetId, consumerContext: string): Promise<void>`
   - `unregisterUsage(assetId: AssetId, consumerContext: string): Promise<void>`

---

## 11. Asset Lifecycle State Machine

An asset moves through a strict, unidirectional state machine:

1. **Initiated:** The asset metadata has been registered and ingestion credentials issued.
2. **Uploaded:** Binary has been streamed into the Quarantine Storage Bucket.
3. **Validating:** Malware scanner is actively validating the signature/heuristics and verifying magic bytes.
4. **Sanitizing:** Image processor is stripping EXIF data and creating optimized image versions.
5. **Active:** Fully validated, promoted to the Clean Storage Bucket, and ready for CDN delivery.
6. **Archived:** Logical status changed to archived; physical binary is transitioned to nearline/cold storage.
7. **Soft-Deleted:** Logically flagged as deleted, awaiting expiration or recovery.
8. **Purged:** Logical database records deleted; physical binary permanently destroyed.

---

## 12. Domain Events

- `AssetRegisteredEvent`
- `AssetUploadedEvent`
- `AssetMalwareScanSucceededEvent`
- `AssetMalwareScanFailedEvent`
- `AssetSanitizedEvent`
- `AssetActivatedEvent`
- `AssetArchivedEvent`
- `AssetRestoredEvent`
- `AssetDeletedEvent`

---

## 13. Domain Decisions (ADR): Asset Versioning

- **Title:** EAP Native Asset Versioning Ownership
- **Decision:** The Enterprise Asset Platform natively supports asset version chains. Each logical asset can map to a historical chain of immutable physical binary revisions. Business domains interact with the logical asset and can request specific version offsets, preserving a unified versioning pipeline across all enterprise business units.
- **Versioning Boundary Validation:**
  To prevent responsibility overlap and maintain structural separation of concerns, EAP strictly defines the boundaries of its native versioning system:
  1. **Binary-Only Versioning:** EAP is responsible _only_ for tracking physical binary file changes (e.g., replacing an image asset with a high-resolution version or updating a PDF document binary).
  2. **No CMS / Content Overlap:** EAP does not manage editorial content states, publish schedules, drafts, or metadata histories. CMS and other consuming systems retain full ownership of their Content Versioning.
  3. **No Translation Overlap:** Multi-language localized content structures and regional variants of text remain inside the CMS and Translation services; EAP simply maps distinct `AssetId`s to individual language records if distinct binary files are required.
  4. **No Workflow Overlap:** Document review cycles, approval status paths, and transition logs are owned entirely by the Workflow engine. EAP tracks only the physical state of the underlying binary.
     This strict boundary ensures EAP remains a stateless asset repository, while higher-level business platforms orchestrate their own complex metadata, translation, and workflow histories.

---

## 14. Section Migration Matrix

The following matrix documents the complete transition from the Phase 5.5 File Management Baseline to the Enterprise Asset Platform (EAP) Baseline:

| Original Section (File Management)     | New Section (EAP)                       |  Migration Action   | Architectural Reason & Justification                                                                                                                     |
| :------------------------------------- | :-------------------------------------- | :-----------------: | :------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Platform: File Management Platform** | **Platform: Enterprise Asset Platform** |     **Replace**     | Standardizes the platform name to match ADR-024 and Master Blueprint.                                                                                    |
| **Section 2: Vision**                  | **Section 2: Vision**                   | **Modify & Merge**  | Updated to capture security, malware scanning, EXIF stripping, and CDN-enabled edge delivery as primary objectives.                                      |
| **Section 3: Purpose**                 | **Section 3: Purpose**                  |     **Replace**     | Transitioned purpose from simple file storage to a cross-cutting digital asset management backbone.                                                      |
| **Section 4: Scope**                   | **Section 4: Scope**                    |     **Replace**     | Added dual-bucket quarantine, EXIF stripping, multi-format transcoding, and versioning to the system boundary.                                           |
| **Section 5: Responsibilities**        | **Section 5: Responsibilities**         |     **Replace**     | Rewritten to include malware verification, image processing, centralized usage tracking, and CDN orchestration.                                          |
| **Section 6: Non-Responsibilities**    | **Section 6: Non-Responsibilities**     |     **Modify**      | Removed "image processing pipelines, previews, video transcoding, and asset versioning" from Non-Responsibilities as they are now core EAP capabilities. |
| **Section 7: Bounded Context**         | **Section 7: Bounded Context**          |     **Replace**     | Re-aligned ubiquitous language with EAP terms, including quarantine/clean storage and usage registration.                                                |
| **Section 8: Core Concepts**           | **Section 8: Core Concepts**            |  **Merge & Split**  | Split into logical assets vs physical binary, and added Quarantine Ingestion Pipeline, EXIF stripping, and Centralized Usage tracking concepts.          |
| **Section 9: FileRecord (Aggregate)**  | **Section 9: AssetRecord (Aggregate)**  |     **Replace**     | Converted `FileRecord` to `AssetRecord`. Expanded parameters to support processing states, version chains, and dual-bucket location tracking.            |
| **Section 11: Value Objects**          | **Section 9.2: Value Objects**          |     **Replace**     | Renamed file-specific value objects to assets, introduced `AssetVersion` and dual-stage locator references.                                              |
| **Section 12: Domain Services**        | **Section 10: Domain Ports**            | **Replace & Split** | Refactored gateways to explicitly support dual-bucket, malware scanning, EXIF metadata scrubbing, and usage registry access.                             |
| **Section 15: Lifecycle**              | **Section 11: Lifecycle**               |     **Modify**      | Extended state machine with `Validating` and `Sanitizing` stages to handle virus scanning and EXIF stripping.                                            |
| **Section 16: Domain Events**          | **Section 12: Domain Events**           |     **Modify**      | Introduced `AssetUploadedEvent`, `AssetMalwareScanSucceededEvent`, and `AssetSanitizedEvent` to match the security pipeline.                             |
| **Section 21: ADR: File Versioning**   | **Section 13: ADR: Asset Versioning**   |     **Replace**     | Reversed the legacy exclusion. EAP now natively manages and tracks asset version chains to prevent downstream duplication.                               |

---

## 15. Change Summary

- **Legacy Terminology Extirpated:** Eliminated all file-centric names (`FileRecord`, `FileId`, `FileReference`, `IFileValidationGateway`) and replaced them with EAP terms (`AssetRecord`, `AssetId`, `AssetReference`, `IAssetMalwareScannerGateway`).
- **Direct Conflict Resolved:** Modified the non-responsibilities list to enable core image processing, video transcoding, document OCR, and responsive breakpoint generation.
- **Quarantine Pipeline Enshrined:** Added explicit specifications for the dual-bucket security model, signature and heuristic checks, and magic bytes verification.
- **EXIF Stripping Formalized:** Established automated metadata stripping as a core, non-negotiable step in the asset ingestion chain.
- **Usage Registry Centralized:** Moved the `Enterprise Asset Usage Registry` from business domains to the EAP, creating an authoritative lookup table before any deletion operates.
- **Versioning Mandated:** Overturned the previous anti-versioning ADR, establishing native versioning chains directly within the EAP domain.

---

## 16. Architecture Validation Report

### 16.1. Layer Isolation Check

- **Status:** **PASS**
- **Findings:** The EAP Domain layer remains completely pure. It contains zero references to infrastructure libraries, Node.js filesystem modules, ORM models, or web framework router dependencies. All database models, object storage SDKs, and virus scanners are represented solely as clean interfaces (Ports).

### 16.2. Dependency Inversion Verification

- **Status:** **PASS**
- **Findings:** The direction of dependencies flows strictly inward: `API -> Infrastructure -> Application -> Domain`. The domain layer is completely decoupled. Adapters (e.g., S3 adapter, image sanitization adapter, PostgreSQL usage registry adapter) implement EAP domain ports without leaking implementation details.

### 16.3. Downstream Responsibility Leakage Prevention

- **Status:** **PASS**
- **Findings:** Downstream business domains (e.g., Scholarships, CMS, Universities) hold only an immutable `AssetReference` (`AssetId`) in their tables. They remain completely unaware of physical object pathways, storage classes, processing pipelines, or backend cloud providers, protecting them from infrastructure leakage.

---

## 17. Final Compliance Report

### 17.1. ADR-024 Compliance

- **Status:** **100% COMPLIANT**
- **Justification:** Every mandate of ADR-024—including the centralization of files under EAP, the dual-bucket quarantine pipeline, automated magic bytes checking, dynamic image optimization, and pre-signed URL security—is natively integrated as core platform behaviors.

### 17.2. Master Blueprint Alignment

- **Status:** **100% ALIGNED**
- **Justification:** This baseline aligns with sections 62 (Asset Usage Registry) and 13 (EAP context) of the Master Blueprint. Centralizing the usage registry ensures absolute data integrity across all business boundaries.

### 17.3. Official Roadmap Adherence

- **Status:** **100% ADHERED**
- **Justification:** Transitioning from file management to an enterprise asset backbone fulfills Phase 05 requirements, enabling seamless CMS integration during later roadmap stages.

### 17.4. Single Source of Truth (SSOT) Preservation

- **Status:** **100% PRESERVED**
- **Justification:** EAP serves as the absolute SSOT for all digital asset records. All media lifecycle states, processing breakpoint mappings, and cross-context registry tracking reside strictly within EAP.

---

## 18. Phase 06 Import Foundation Integration Note

- **Artifact Handling & Quarantine:** EAP provides `ImportArtifact` storage handles, quarantine bucket isolation, malware scanning, and retention lifecycle management for raw files ingested during import operations.
- **Ownership Boundary:** EAP handles raw asset storage and quarantine only. EAP does NOT own file parsing, streaming chunking, staging schema, or import orchestration, which are strictly owned by Phase 06 Import Foundation.

---

### Navigation

- **Previous**: [Phase 5.4 Settings Implementation Baseline](../Settings/phase-05-04-settings-implementation-baseline.md)
- **Next**: [Phase 5.5 Enterprise Asset Platform (EAP) Implementation Baseline](phase-05-05-assetplatform-implementation-baseline.md)
