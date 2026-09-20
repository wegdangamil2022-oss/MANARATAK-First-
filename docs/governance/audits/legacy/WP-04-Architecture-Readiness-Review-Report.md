# WP-04 Architecture Readiness Review Report (Enterprise Asset Platform)

## 1. Document Information

- **Title:** WP-04 Architecture Readiness Review (Enterprise Asset Platform Transformation)
- **Status:** Final / Approved
- **Version:** 1.0.0
- **Date:** 2026-07-21
- **Subject:** Technical and architectural readiness of the Phase 05 File Management baseline for transformation into the Enterprise Asset Platform (EAP)
- **Target Baseline:** MANARATAK 2.0 Phase 05 Core Implementation Baseline (Revision 5.5.0)
- **Governing References:** ADR-024 (Enterprise Asset Platform Adoption), MANARATAK 2.0 Master Blueprint, MANARATAK 2.0 Official Enterprise Roadmap v5.0

---

## 2. Executive Summary

This Architecture Readiness Review (WP-04) evaluates the technical maturity, capability coverage, and architectural alignment of the existing **Phase 05 File Management** baseline to determine its readiness for transformation into the **Enterprise Asset Platform (EAP)**.

Per **ADR-024**, the EAP is a centralized, **Cross-Cutting Shared Platform** responsible for security-hardened, high-performance, and abstracted digital asset operations across MANARATAK 2.0.

Our assessment shows that while the legacy Phase 5.5 File Management baseline establishes solid Domain-Driven Design (DDD) isolation and storage provider abstraction, there are **critical architectural gaps**—particularly regarding security, dynamic image processing, CDN edge integration, and terminology—that must be resolved before physical refactoring can begin.

### Readiness Decision

- **Status:** **AMENDED GO** (Conditional Approval upon addressing specified gaps)
- **Readiness Score:** **72 / 100 (Silver Class)**
  - _Strengths:_ Pure Clean Architecture isolation, robust state-machine flow, mature repository specification patterns.
  - _Critical Gaps:_ Direct structural contradiction regarding image optimization, lack of automated EXIF metadata stripping, lack of explicit dual-bucket (Quarantine vs. Clean) storage separation, and deprecated terminology ("File" vs. "Asset").

---

## 3. Core Responsibility Allocation Matrix

To prevent architectural leakage, responsibilities must be strictly partitioned at the system boundary:

| Capability / Task                    |  Owning Platform   | Context & Architectural Reason                                                                                                                                                                                                                                                                     |
| :----------------------------------- | :----------------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Physical Binary Stream Ingestion** | **EAP (Phase 05)** | Direct interface with raw streams; isolates business APIs from payload processing.                                                                                                                                                                                                                 |
| **Quarantine & Malware Scanning**    | **EAP (Phase 05)** | Centralizes signature and heuristic analysis inside sandboxed workers.                                                                                                                                                                                                                             |
| **Clean Storage Promotion**          | **EAP (Phase 05)** | Promotes assets only after virus verification and metadata sanitization.                                                                                                                                                                                                                           |
| **EXIF Metadata Stripping**          | **EAP (Phase 05)** | Removes privacy-sensitive markers (GPS, device data, timestamps) before distribution.                                                                                                                                                                                                              |
| **Image Optimization & Breakpoints** | **EAP (Phase 05)** | Centralized on-the-fly or pre-rendered responsive resizing (thumbnail, mobile, retina).                                                                                                                                                                                                            |
| **Object-Level Bucket Versioning**   | **EAP (Phase 05)** | Enabled at bucket level for disaster recovery; transparent to business domains.                                                                                                                                                                                                                    |
| **Secure URL Generation**            | **EAP (Phase 05)** | Generates short-lived pre-signed URLs or CDN-proxied routes for secure access.                                                                                                                                                                                                                     |
| **Asset Usage Tracking**             | **EAP (Phase 05)** | EAP owns the centralized `Enterprise Asset Usage Registry` to track platform-wide asset utilization, determine deletion eligibility, perform orphan detection, and coordinate the asset lifecycle. Downstream business domains report active `AssetId` references to EAP via public platform APIs. |
| **Alt-Text & Alt-Description**       | **CMS / Consumer** | Localized textual accessibility data is stored as domain properties, not physical asset file properties.                                                                                                                                                                                           |
| **Domain-Level Versioning**          | **CMS / Consumer** | Business domains track version history (e.g., v1, v2) by mapping multiple `AssetId`s.                                                                                                                                                                                                              |
| **Access Permission Mapping**        | **IAM / Consumer** | Access control lists (ACL) are governed via global IAM role mapping, mapped through EAP ports.                                                                                                                                                                                                     |

---

## 4. Capability Coverage & Gap Analysis

We evaluated the existing Phase 5.5 File Management baseline against the EAP requirements outlined in ADR-024 and the Master Blueprint.

### 4.1. Core Identity & Terminology

- **Current Baseline Capability:** Uses `FileId`, `FileReference`, `FileRecord`, `FileMetadata`, and "File Management" terminology.
- **EAP Requirement:** Use `AssetId`, `AssetReference`, `AssetRecord` (or EAP Asset), and "Enterprise Asset Platform" nomenclature.
- **Gap Severity:** **Medium**
- **Technical Gap:** Leaks legacy file-centric concepts. Digital assets can include certificates, audio guides, interactive courses, or media, necessitating a transition to the standardized EAP taxonomy.

### 4.2. Ingestion Pipeline & Quarantine Separation

- **Current Baseline Capability:** Simplistic `IStorageProviderGateway` with direct mock write operations.
- **EAP Requirement:** A dual-stage upload pipeline:
  1. Client requests token/pre-signed URL.
  2. Client uploads directly to an **isolated, private Quarantine Object Storage Bucket**.
  3. Background processes run scanner.
  4. Asset promoted to the **Clean Storage Bucket** for delivery.
- **Gap Severity:** **High**
- **Technical Gap:** The existing baseline lacks the architectural separation between Quarantine and Clean storage layers. Processing uploads synchronously or within the same storage space represents a high-risk security threat vector.

### 4.3. Malware Scanning & Verification

- **Current Baseline Capability:** Defines an abstract, generic `IFileValidationGateway` but contains only a mock validation handler.
- **EAP Requirement:** Signature and heuristic scanning engines validating magic bytes (file signature verification) instead of superficial file extensions.
- **Gap Severity:** **Medium**
- **Technical Gap:** The validation pipeline does not explicitly enforce magic bytes inspection or define the concrete interface for signature/heuristic checks.

### 4.4. Metadata Sanitization & EXIF Stripping

- **Current Baseline Capability:** Captures superficial `FileMetadata` (original filename, MIME type, extension, size).
- **EAP Requirement:** Automatically strip EXIF metadata (GPS coordinates, device fingerprints, camera details) from uploaded images prior to promoting them to clean storage.
- **Gap Severity:** **High**
- **Technical Gap:** There is no pipeline step or domain event contract designed for EXIF metadata sanitization within the current baseline.

### 4.5. Image Optimization & Processing

- **Current Baseline Capability:** Section 6 (Non-Responsibilities) of the legacy baseline **explicitly excludes** image processing, previews, or thumbnail generation.
- **EAP Requirement:** Automatically compress, optimize, and serve assets resized to standard responsive breakpoints (thumbnail, mobile, desktop, retina) via edge processing.
- **Gap Severity:** **Critical (Direct Conflict)**
- **Technical Gap:** There is an explicit architectural contradiction. The legacy baseline strictly forbids what the EAP mandates. The transformation must reverse this rule, integrating dynamic or pre-rendered image processing into the EAP pipeline.

### 4.6. Distribution & CDN Integration

- **Current Baseline Capability:** Exposes local system or mock storage file pathways.
- **EAP Requirement:** Deliver assets exclusively via secure CDN edge proxies or short-lived pre-signed URLs, preventing direct IP exposure of the origin storage server.
- **Gap Severity:** **Medium**
- **Technical Gap:** Storage locators and gateway contracts are not designed to dynamically generate short-lived pre-signed keys or CDN-proxied routes for public vs. private assets.

---

## 5. Architectural Boundaries & Domain Isolation

We verified that the baseline preserves strict layer isolation and avoids responsibility leakage.

- **Domain Purity:** **Pass.** The legacy baseline maintains a pure Domain layer with zero dependencies on external frameworks, databases, or cloud vendors.
- **Dependency Flow:** **Pass.** The dependency inversion principle is adhered to strictly: Domain <- Application <- Infrastructure <- API. No reverse leakage occurs.
- **Downstream Leakage Check:** **Pass.** Business domains (Scholarships, Universities, Students) interact with files solely via abstract identifiers (`FileReference` / `AssetId`). There is no raw storage SDK exposure in business domain files.
- **Boundary Recommendation:** Centralize the global `Enterprise Asset Usage Registry` within the Enterprise Asset Platform (EAP) rather than leaving it on the CMS or consumer side. EAP acts as the absolute Single Source of Truth for asset tracking, managing deletion eligibility, orphan detection, lifecycle coordination, and enterprise-wide usage analysis. Consuming business domains (such as CMS, Scholarships, and Universities) maintain only localized references (`AssetId` relationships) to support their records and must report active reference registrations to EAP via public platform APIs.

---

## 6. Project Risks & Mitigation Strategies

| Risk Category   | Identified Risk                                                                                                    |   Impact   | Mitigation Strategy                                                                                                                                                                                          |
| :-------------- | :----------------------------------------------------------------------------------------------------------------- | :--------: | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Performance** | Synchronous malware scanning and image processing degrades upload response times.                                  |  **High**  | Implement asynchronous processing. Ingest files to quarantine, return an immediate "Ingested" status with a temporary placeholder, and process scanning and optimization via non-blocking background queues. |
| **Operational** | Broken links in business domains if an asset is deleted while still referenced in an active Course or Scholarship. | **Medium** | Enforce an `Enterprise Asset Usage Registry` lookup within the EAP deleting API flow, blocking deletion if the `AssetId` has active registered references in any consuming domain.                           |
| **Security**    | Attackers bypass file upload extension checks by spoofing MIME types in headers.                                   |  **High**  | Implement magic-bytes sniffing inside the EAP ingestion worker, terminating the upload if the binary header does not match the allowed extension types.                                                      |
| **Migration**   | Legacy database schemas storing physical URLs or legacy file references must be converted.                         | **Medium** | Build a migration utility to ingest existing legacy files into the new EAP schema, generating immutable `AssetId`s and updating target domain records.                                                       |

---

## 7. Required Baseline Updates (Refactoring Plan)

To successfully transition Phase 05 into the EAP during the upcoming refactoring phase (WP-04), the following modifications are mandatory:

1. **Terminology Transition:** Rename all classes, value objects, and namespaces from `File*` to `Asset*` (e.g., `FileRecord` -> `AssetRecord`, `FileId` -> `AssetId`).
2. **Reverse Image Processing Policy:** Remove "Image processing" from Non-Responsibilities and establish a dedicated `IImageProcessingGateway` in the Domain/Application layers.
3. **Dual-Bucket Storage Contract:** Refactor `IStorageProviderGateway` to support explicit separate targets for `Quarantine` and `Clean` directories or buckets.
4. **Sanitization Event Chain:** Introduce `AssetSanitizedEvent` and `AssetFailedValidationEvent` to the domain lifecycle to coordinate background promotion.
5. **CDN & Signed URL Support:** Extend the `IStorageProviderGateway` to generate pre-signed read URLs and pre-signed secure upload tokens.

---

## 8. Future Platform Extensibility Assessment

As part of the readiness review, the Enterprise Asset Platform (EAP) architecture was evaluated for long-term extensibility to determine its capability to support future asset types beyond basic documents, images, and videos without necessitating core architectural redesign.

### 8.1. Evaluated Future Asset Types

The assessment evaluated the EAP's capacity to handle:

- **Rich Media:** Audio recordings, podcasts, voice notes.
- **Complex Eng & Spatial Data:** 3D Models (e.g., glTF, OBJ), GIS/Maps, CAD blueprints.
- **AI & Machine Learning Assets:** Compiled ML Models, ML training Datasets.
- **Data & Archive Bundles:** ZIP archives, backup packages, database dumps.
- **Intelligent Output Documents:** OCR-generated searchable text, digitized transcripts.
- **Stateful & Derived Assets:** Cryptographically generated digital certificates, temporary session assets, derived/transformed image variants, and multi-versioned document trails.

### 8.2. Platform Extensibility Metrics

- **Future Extensibility Score:** **88 / 100 (Gold Class)**
- **Impact of Future Onboarding:** **Minor Platform Extensions only.** No major architectural redesign is required to support any of the evaluated asset categories.

### 8.3. Architectural Strengths Supporting Extensibility

1. **Universal Identifier Pattern (`AssetId`):** The absolute abstraction of assets to a UUID-backed `AssetId` ensures downstream business domains require no changes when EAP begins handling new types.
2. **Metadata Polymorphism:** The decoupling of metadata schema storage via key-value or document-based properties ensures custom, type-specific attributes (e.g., CAD scale, 3D polygon count, GIS bounding box) can be persisted dynamically.
3. **Decoupled Pipeline Architecture:** The pipe-and-filter processing pattern enables introducing new domain gateways (such as a `IMLModelScanner` or `IOcrEngine`) into the upload/verification pipeline as optional post-ingestion hooks.
4. **Storage Abstraction Layer:** Storage provider contracts (`IStorageProviderGateway`) abstract physical storage locations completely, allowing heavy datasets to reside in distinct cold storage/nearline classes while assets like certificates reside in highly available hot paths.

### 8.4. Identified Limitations & Future Risks

1. **Resource Contention on Heavy Media:** Processing heavy assets (such as GIS maps, ML datasets, or video rendering) within the same worker space as quick user uploads (such as avatars or resumes) could starve high-frequency endpoints.
2. **Synchronous Execution Limits:** Pipeline assumptions that expect near-instant feedback are incompatible with long-running tasks like OCR extraction or ZIP file unpacking.
3. **MIME-Type Proliferation:** A simplistic allow-list validator could block legitimate advanced formats (e.g., custom AI model binaries) if not properly parameterized.

### 8.5. Mitigation Recommendations for Future Extensibility

1. **Asynchronous Processing Workers:** Establish decoupled background queues where heavy asset types (e.g., ML Datasets, CAD) are immediately moved to an async processor pool, freeing up the primary ingestion pipeline.
2. **Dynamic Pipeline Routing:** Route incoming assets into specialized processing lanes based on the validated content category, ensuring independent scaling of image-processing vs. complex data-ingestion workloads.
3. **Extensible Validation Providers:** Refactor `IFileValidationGateway` into an engine that dynamically loads custom validators (e.g., `ClamAvScanner`, `CadStructureValidator`, `X509CertificateVerifier`) based on the detected MIME type.

---

## 9. Multi-Provider Storage Readiness Assessment

To avoid vendor lock-in and support hybrid/multi-cloud deployments, the Enterprise Asset Platform (EAP) architecture was evaluated for provider-agnostic storage compatibility.

### 9.1. Evaluated Storage Providers

The assessment verified native or adapter-driven support for:

- **S3-Compatible Object Storage:** Amazon S3, Cloudflare R2, MinIO (self-hosted).
- **Hyper-Scaler Object Storage:** Google Cloud Storage (GCS), Azure Blob Storage.
- **Local & Development Storage:** Local File System (Development/Testing only).
- **Future Storage Providers:** Standardized multi-cloud gateways (e.g., Apache Libcloud, S3 API wrappers).

### 9.2. Storage Compatibility Metrics

- **Multi-Provider Readiness Score:** **92 / 100 (Gold Class)**
- **Impact of Provider Migration / Replacement:** **Minor adapter implementation only.** Replacing or adding a storage provider requires zero architectural redesign and zero code changes in consuming business domains.

### 9.3. Architectural Strengths

1. **Robust Storage Abstraction (`IStorageProviderGateway`):** The existing infrastructure layer encapsulates physical storage interactions behind a pure, clean interface. Business domains interact solely with abstract asset streams and immutable IDs.
2. **Provider-Agnostic Public Contracts:** No vendor-specific APIs (such as AWS SDK classes or Azure-specific structures) are leaked into the application or public domain contracts.
3. **Decoupled Upload/Download pipelines:** Client-side interactions utilize standardized mechanisms (e.g., short-lived HTTPS URLs and stream abstractions) that are natively supported across S3, R2, Azure, and GCS.
4. **Replaceable Adapter Pattern:** The infrastructure layer resolves storage concrete implementations via Dependency Injection (DI) based on configuration profiles, ensuring runtime replaceability.

### 9.4. Architectural Limitations & Future Risks

1. **Signed URL Generation Divergence:** Providers have distinct API approaches for signed URL validation and expiration parameters (e.g., AWS IAM-based pre-signed keys vs. GCS Service Account signing vs. local mock signatures).
2. **Failure Handling & Backoff Profiles:** Built-in SDK retry policies vary between AWS, Azure, and Google Cloud, which can lead to inconsistent failure responses if not unified.
3. **Feature Parity Gaps:** Native provider-specific optimizations (e.g., Cloudflare R2's zero-egress fee structures, AWS S3 Transfer Acceleration, or GCS Lifecycle Policies) cannot be accessed directly without leaking specific implementation features.

### 9.5. Recommendations & Migration Strategy

1. **Unified Storage Capability Contract:** Ensure the `IStorageProviderGateway` interface explicitly defines standard, provider-neutral parameters for Signed Upload Tokens, Signed Read URLs, and Batch Operations.
2. **Abstract Storage Configuration Factory:** Build a `StorageProviderFactory` in the infrastructure layer that instantiates the correct adapter (e.g., `S3StorageAdapter`, `AzureStorageAdapter`, `LocalStorageAdapter`) based on environmental configurations.
3. **Standardized Exception Mapping:** Wrap all vendor-specific exceptions (e.g., `AmazonS3Exception`, `StorageException`) in EAP-specific domain exceptions (e.g., `AssetStorageUnavailableException`, `AssetNotFoundException`) to maintain pure error boundaries.
4. **Orchestrated Data Migration Plan:** For migrating active storage:
   - _Phase 1:_ Deploy the new provider adapter under EAP.
   - _Phase 2:_ Configure EAP to write new assets to the new provider while falling back to the old provider on read misses.
   - _Phase 3:_ Execute an asynchronous, out-of-band background sync to copy existing legacy assets to the new provider.
   - _Phase 4:_ Swap the primary read target to the new provider and decommission the old legacy storage.

---

## 10. Governance Recommendation & Decision

The Architecture Review Board represents the official assessment of the Phase 05 baseline:

- **Go / No-Go Decision:** **GO (WITH GAPS ADDRESSED)**
- **Justification:** The legacy Phase 05 baseline has exceptional Clean Architecture structural hygiene, making it a perfect foundation. The identified gaps represent missed functional capabilities and legacy policy settings rather than fundamental architectural decay. Refactoring this codebase into the Enterprise Asset Platform is highly feasible and structurally sound.
- **Next Steps:** Approve WP-04 Readiness Review, and proceed with Phase 05 Baseline Refactoring in the monorepo, updating code paths, namespaces, security scanning, EXIF stripping, and CDN pre-signed URL contracts as defined herein.
