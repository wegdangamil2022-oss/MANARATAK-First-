> [!CAUTION]
> **SUPERSEDED**
> This document (Roadmap v5.0) is no longer the active Single Source of Truth.
> It has been superseded by Roadmap v6.0, which formally defines the finalized 24-phase architecture, including the reassignment of Phase 18 and the exclusion of the Organizations & Employers Platform per ADR-027.

# MANARATAK-2.0-Roadmap-v5.0

## 1. Document Information

- **Title:** MANARATAK 2.0 Official Enterprise Roadmap
- **Version:** 5.0
- **Status:** Approved & Finalized
- **Approval Status:** Formal Baseline
- **Authors:** Chief Enterprise Software Architect
- **Last Updated:** 2026-07-21
- **Baseline:** Enterprise Foundation Baseline, Enterprise Domain Architecture Baseline, ADR-024 (Enterprise Asset Platform Adoption)

## 2. Revision History

- **v5.0:** Supersedes Roadmap v4.1. Enterprise Certificates Platform introduced. Learning / Certificates ownership separated. Phase numbering synchronized. Enterprise roadmap synchronized. Cross-phase conflicts resolved. Updated to integrate the Enterprise Asset Platform (EAP) per ADR-024 (Cross-Cutting Shared Platform) and synchronize all references, dependencies, and terminology across the baseline.
- **v4.1:** Foundation completion formally recognized; Academic Taxonomy Platform introduced; Phase renumbering updated; Dependency updates verified; Architecture governance updates (Phases 1.30, 1.31, 1.32) finalized and integrated.
- **v4.0:** Major modular monolith realignment; Domain-Driven Design boundaries codified.
- **v3.2:** Initial CI/CD pipeline integration and security baseline established.

## 3. Executive Summary

This document serves as the official Enterprise Roadmap for the MANARATAK 2.0 platform. The Enterprise Foundation has been completed and fully incorporates the Enterprise Asset Platform (EAP) as a centralized, cross-cutting shared platform, replacing legacy file management baselines. Core enterprise domains have been architecturally defined. A critical architectural extraction has been performed where the Certificates Platform has been separated from the Learning Platform. The enterprise is now entering the domain implementation stage.

## 4. Current Project Status

This roadmap documents the approved enterprise architecture baseline. Note that some domain architecture specifications have already been completed before their corresponding implementation phases have started.

- **Architecture Baseline Status:**
  - Baselined: Phases 1-9 (Enterprise Foundation featuring the Enterprise Asset Platform), Phase 13 (Learning Platform), Phase 14 (Enterprise Certificates Platform).
- **Implementation Status:**
  - Completed: Phases 1-9 (with EAP formally established).
  - Next Implementation Wave: Phase 10 (Majors & Disciplines), Phase 11 (Universities & Institutions), Phase 12 (Scholarships).

## 5. Complete Roadmap

- **Phase 1 – Phase 5:** Enterprise Foundation Architecture (Modular Monolith, Security, Integration, Data Governance, Observability, IAM, Workflow, Search, and Enterprise Asset Platform)
  - _Note on Phase 05:_ Establishes the centralized Enterprise Asset Platform (EAP), a Cross-Cutting Shared Platform handling secure file ingestion, quarantine scanning, metadata scrubbing (EXIF removal), optimized caching, and CDN routing.
- **Phase 6:** Universal Import Infrastructure
- **Phase 7:** Global Reference Data
- **Phase 8:** Academic Taxonomy
- **Phase 9:** International Tests
- **Phase 10:** Majors & Disciplines
- **Phase 11:** Universities & Institutions
- **Phase 12:** Scholarships
- **Phase 13:** Learning Platform
- **Phase 14:** Enterprise Certificates Platform
- **Phase 15:** Enterprise Student Platform (Student Workspace)
- **Phase 16:** Enterprise CMS Platform
- **Phase 17:** Enterprise AI Platform
- **Phase 18:** Organizations & Employers Platform
- **Phase 19:** Global Alumni Network
- **Phase 20:** Partner & University API Integrations
- **Phase 21:** Platform Scale-Out & Optimization

## 6. Phase Dependencies

- **Enterprise Asset Platform (EAP) / Phase 05 Integration:** EAP is classified as a Cross-Cutting Shared Platform. Core business domains depend on Phase 05 for all file, media, and document persistence:
  - **Phase 11 (Universities & Institutions)** is dependent on Phase 05 for secure storage of university logos, campus media assets, and institutional brochures, using immutable `AssetId` references.
  - **Phase 12 (Scholarships)** is dependent on Phase 05 for student applicant document uploads (transcripts, certificates, and supporting financial files).
  - **Phase 15 (Enterprise Student Platform (Student Workspace))** is dependent on Phase 05 for student avatars, resume/CV documents, and portfolio assets.
  - **Phase 18 (Organizations & Employers Platform)** is dependent on Phase 05 for high-performance CDN delivery and edge-processed responsive media routing.
- **Phase 10-12 (Majors, Universities, Scholarships):** Dependent on Enterprise Foundation (Phases 1-5 including EAP), Universal Import (Phase 6), and Academic Taxonomy (Phase 8).
- **Phase 13 (Learning Platform):** Dependent on Phases 5-12 for catalog structure, institutional associations, and scholarships.
- **Phase 14 (Enterprise Certificates Platform):** Strictly dependent on Phase 13 (Learning Platform) for completion events (CourseCompleted, LearningPathCompleted) and Phase 5 for Identity, Caching, and EAP asset verification. Phase 14 publishes enterprise certificate events.
- **Phase 15 (Enterprise Student Platform (Student Workspace)):** Dependent on Phase 14 for certificate telemetry and certificate history, Phase 13 for learning progress read models, and Phase 05 for portfolio document storage.
- **Phases 16-21:** Sequentially dependent on the underlying Domain APIs and events established in Phases 10-15.

## 7. Milestone Status

This section tracks the progress of the enterprise across two distinct dimensions: architecture definition and software implementation.

### 7.1 Architecture Milestones

Architecture milestones represent the completion and formal approval of architecture specifications and domain contracts.

- **Enterprise Foundation (Phases 1-9):** Completed & Baselined (Refined to incorporate the Enterprise Asset Platform per ADR-024)
- **Learning Platform (Phase 13):** Completed & Baselined
- **Enterprise Certificates Platform (Phase 14):** Extraction Completed & Baselined
- **Majors & Disciplines (Phase 10):** In Progress
- **Universities & Institutions (Phase 11):** Planned
- **Scholarships (Phase 12):** Planned
- **Phases 15-21:** Future

### 7.2 Implementation Milestones

Implementation milestones represent actual software development progress against the baselined architecture.

- **Enterprise Foundation (Phases 1-9):** Completed (EAP transition scheduled for verification in Phase 05 baseline refactoring)
- **Next Implementation Wave (Phases 10-12):** Planned
- **Learning Platform (Phase 13):** Future
- **Enterprise Certificates Platform (Phase 14):** Future
- **Phases 15-21:** Future

## 8. Architecture Freeze Status

- **Enterprise Foundation (Phases 1-9):** Frozen (EAP specifications frozen per ADR-024)
- **Learning Platform (Phase 13):** Frozen
- **Enterprise Certificates Platform (Phase 14):** Frozen
- **Majors & Disciplines (Phase 10):** Draft
- **Universities & Institutions (Phase 11):** Draft
- **Scholarships (Phase 12):** Draft

## 9. Upcoming Work

The enterprise is now embarking on the next integrated implementation wave, which includes:

- **Phase 10:** Majors & Disciplines
- **Phase 11:** Universities & Institutions
- **Phase 12:** Scholarships

These phases belong to the same implementation wave because they collectively form the foundational institutional and financial aid structures required before the Learning Platform (Phase 13) can associate its catalog with external universities and funding opportunities.

## 10. Architecture Governance Rules

This section formally defines the governance rules for the enterprise roadmap:

- Roadmap v5.0 is the ONLY authoritative source for:
  - Phase numbering
  - Phase names
  - Project sequencing
  - Cross-phase dependencies
  - Cross-phase references
- The roadmap incorporates and is fully aligned with the following governing documents:
  - **ADR-024:** Enterprise Asset Platform Adoption (establishing EAP as a Cross-Cutting Shared Platform)
  - **Updated Master Blueprint:** Centralized domain mapping and EAP integration standards
  - **WP-03 Roadmap Consistency Audit Report:** Formal assessment verifying dependency integrity
- No architecture document may redefine phase numbers independently.
- Every architecture document must reference this roadmap.
- Future renumbering requires a new Roadmap version.
- Cross-phase references must always follow this roadmap.

Additionally, the following mandatory enterprise rules apply:

- Every cross-phase dependency must reference the official roadmap.
- Every integration matrix must use the official phase numbering.
- Every dependency graph must use the official phase numbering.
- Every event catalog must use the official phase numbering.
- Every API registry must use the official phase numbering.
- Every architecture diagram must use the official phase numbering.
- Every ADR referencing another phase must reference this roadmap.
- Every architecture document must synchronize its cross-phase references with this roadmap.
- Any change affecting phase numbering, phase ownership, roadmap sequencing, or dependency ordering requires publishing a NEW Roadmap version before updating enterprise documentation.

Roadmap governance explicitly prevents future numbering collisions by requiring centralized coordination through this official roadmap document.
This section becomes mandatory governance.

## 11. Final Baseline Approval

Roadmap v5.0 supersedes every previous roadmap. All architecture documents must follow it. Independent phase numbering is prohibited.

This document becomes the Single Source of Truth for:

- Phase numbering
- Phase naming
- Enterprise sequencing
- Dependency ordering
- Cross-phase references
