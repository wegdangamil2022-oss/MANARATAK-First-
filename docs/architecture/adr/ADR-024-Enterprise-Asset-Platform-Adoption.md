# ADR-024: Enterprise Asset Platform Adoption

## 1. ADR Metadata

- **ADR ID:** ADR-024
- **Title:** Enterprise Asset Platform Adoption
- **Status:** Accepted
- **Version:** 1.0.0
- **Date:** 2026-07-21
- **Decision Owner:** Chief Enterprise Software Architect
- **Reviewers:** Principal Domain Architects, Data Architect, Security Architect
- **Approval Authority (ARB):** Architecture Review Board

## 2. Decision Status

**Accepted**

---

## 3. Context

Under the current MANARATAK 2.0 system architecture, file management capabilities were initially conceived as a basic core platform component ("Phase 05 File Management"). While this baseline successfully established standard localized read/write operations, it has several critical limitations and presents architectural challenges as the enterprise scales:

- **Fragmented Storage Logic:** Multiple business domains (such as Universities, Scholarships, Courses, and Articles) are individually responsible for managing media files, uploading content, and handling raw disk/blob storage logic. This duplication leads to divergent implementations, complex code patterns, and an increased maintenance footprint.
- **Security & Vulnerabilities:** Distributing upload handlers directly across business domains increases the attack surface. It leaves the system vulnerable to unvetted file types, arbitrary script execution, and missed security checkpoints like automated virus scanning or centralized access control list (ACL) enforcement.
- **Lack of Performance & CDN Strategy:** High-bandwidth operations like automatic image processing, web-optimization, compression, and Content Delivery Network (CDN) caching are difficult to coordinate on a per-domain basis.
- **Metadata Inconsistency:** File metadata (creation dates, ownership, MIME types, versions, alt text) is either not captured or stored using conflicting domain-specific schemas, making global auditability and enterprise search impossible.
- **Storage Cost Escalation:** Without global deduplication, compression, or unified lifecycle policies (e.g., auto-archiving inactive uploads), storage costs scale linearly and inefficiently with user activity.

To address these concerns and support long-term scalability across all core business modules, the enterprise requires a dedicated, centralized asset management infrastructure.

---

## 4. Decision

The MANARATAK Architecture Review Board (ARB) has decided to adopt the **Enterprise Asset Platform (EAP)**.

- **Architectural Classification:** The EAP is officially classified as a **Cross-Cutting Shared Platform**. It will reside in the foundational infrastructure and shared platform layer of the enterprise.
- **Evolution of Phase 05:** The existing "Phase 05 File Management" baseline is officially evolved and restructured into the **Enterprise Asset Platform (EAP)**.
- **Strict Storage Isolation:** Business domains (e.g., Scholarships, Universities, Organizations, Courses, Articles, AI, CMS) are strictly prohibited from managing raw file uploads, communicating directly with underlying object storage (e.g., AWS S3, Google Cloud Storage, local disks), or handling media processing pipelines.
- **Reference by Identifier Only:** Business domain databases and entities must refer to digital assets exclusively via a immutable global identifier (`AssetId`). The physical file pathways, metadata structures, and CDN routing details are abstractly encapsulated within the EAP.
- **Unified API Interactions:** Consuming domains will interact with assets purely through a standard set of public contracts, service APIs, and unified upload widgets exposed by the EAP.

---

## 5. Alternatives Considered

### Alternative A: Retain the Existing Phase 05 File Management Baseline

- **Description:** Maintain the existing implementation where each business domain handles its own file system interactions and metadata.
- **Rationale for Rejection:** Rejected. This approach does not scale. It continues to allow code duplication across domains, complicates security audits, fails to solve centralized media optimization, and compromises enterprise-wide consistency.

### Alternative B: Independent Standalone Asset System (External SaaS / Isolated Microservice)

- **Description:** Integrate a third-party asset management system or deploy a completely separate external service outside of the MANARATAK framework.
- **Rationale for Rejection:** Rejected. An external third-party service introduces licensing overhead, potential vendor lock-in, and integration latency. It also operates outside of the shared enterprise database constraints, complicating transaction boundaries, identity propagation, and local development baselines.

### Alternative C: Adopt the Enterprise Asset Platform (EAP) as a Cross-Cutting Shared Platform

- **Description:** Centralize all file ingestion, validation, processing, distribution, and metadata management within a unified, framework-integrated platform layer, consumed via abstract `AssetId` references.
- **Rationale for Selection:** Accepted. This approach maximizes clean separation of concerns, enforces a strict Single Source of Truth, reduces domain-level development complexity, centralizes security scanning, and makes optimization/CDN integration transparent to consuming modules.

---

## 6. Architecture Constraints

To preserve the integrity of the MANARATAK 2.0 system architecture, the adoption of the Enterprise Asset Platform enforces the following mandatory rules:

1. **Single Source of Truth:** The EAP is the sole owner and authorizer of physical assets, storage structures, and media metadata. No other system component may query the storage layer directly.
2. **Abstract References (`AssetId`):** Domain databases are only allowed to store the `AssetId` string/GUID. They must never store raw S3 keys, public paths, or physical URLs.
3. **No Direct Storage Access:** Business domain code must never import raw object storage SDKs (e.g., S3 client, Cloud Storage client).
4. **Public Contracts Only:** Consuming domains must retrieve file details or generate upload tokens through the EAP's public API endpoints or event hooks.
5. **Decoupled Life Cycle:** The lifecycle of an asset (creation, archiving, soft-deletion, physical deletion) is governed entirely by the EAP's policies, independent of individual business domain transactions.

---

## 7. Consequences

### Positive Consequences (Benefits)

- **Zero Duplication:** Developers no longer write file-handling code in domain microservices or controller packages.
- **Centralized Security:** Built-in malware scanning, MIME-type white-listing, and access control checks occur automatically at the ingest boundary.
- **Optimized Performance:** Assets are automatically compressed, optimized for mobile/web, and cached via CDN with no additional domain-level configuration.
- **Consistent Metadata:** Standardized audit trails, copyright details, and descriptive tags are enforced globally.
- **Easier Infrastructure Migration:** The underlying storage provider (e.g., local storage to cloud bucket) can be changed without modifying any of the consuming business domains.

### Negative Consequences

- **Integration Dependency:** All media-reliant domains must integrate with the EAP APIs, introducing a runtime dependency on the shared platform layer.
- **Initial Migration Overhead:** Existing database schemas and file paths must be mapped and migrated into EAP assets.

### Migration Impact

- Pre-existing file references in older phases (such as profile images or university brochures) must be refactored into `AssetId` structures.
- Migration scripts must be written to ingest legacy files into the new EAP database schema.

### Governance Impact

- EAP becomes the sole authority for security auditing of media, bandwidth consumption tracking, and global storage quotas.

### Documentation Impact

- The **Master Blueprint**, **Enterprise Roadmap**, **Dependency Graph**, **Ownership Matrix**, and **API Registry** must be updated to replace "File Management" with the "Enterprise Asset Platform".

---

## 8. Risks & Mitigations

| Risk                                                                                                                                      | Impact | Mitigation Strategy                                                                                                                                                     |
| :---------------------------------------------------------------------------------------------------------------------------------------- | :----- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Single Point of Failure (SPOF):** EAP downtime blocks media serving and uploads across the entire application.                          | High   | Deploy the EAP with regional redundancy, high-availability multi-zone containers, and fallback static assets.                                                           |
| **Performance Latency:** Real-time processing or remote virus scanning might slow down file upload response times.                        | Medium | Offload virus scanning and image optimization to non-blocking background workers, returning an immediate "ingested" state with a placeholder while processing finishes. |
| **Security/Unauthorized Uploads:** Malicious users could try to flood the EAP with executable scripts or massive payloads.                | High   | Enforce strict size limits, utilize signed upload tokens generated via authenticated backend sessions, and run file-integrity checks inside sandbox containers.         |
| **Database Synchronization:** An asset could be uploaded, but the consuming domain's record might fail to save, creating orphaned assets. | Low    | Configure a nightly automated sweeper within the EAP to find and soft-delete assets that have remained unassociated with any domain entity for more than 24 hours.      |

---

## 9. References

- **MANARATAK 2.0 Master Blueprint:** Sections detailing platform foundations and core shared capabilities.
- **Enterprise Roadmap v5.0:** Milestone mapping and sequence rules.
- **Phase 05 File Management Architecture Baseline:** The original baseline specification.
- **Enterprise Architecture Governance Index:** Precedence and document authority tables.
