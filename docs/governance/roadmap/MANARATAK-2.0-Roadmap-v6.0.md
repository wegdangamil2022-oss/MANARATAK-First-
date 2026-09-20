# MANARATAK-2.0-Roadmap-v6.0

## 1. Document Information

- **Title:** MANARATAK 2.0 Official Enterprise Roadmap
- **Version:** 6.0
- **Status:** Approved & Finalized
- **Approval Status:** Formal Baseline
- **Authors:** Chief Enterprise Software Architect
- **Last Updated:** 2026-08-25
- **Baseline:** Enterprise Foundation Baseline, Enterprise Domain Architecture Baseline, ADR-024 (Enterprise Asset Platform Adoption)

## 2. Revision History

- **v6.0:** Supersedes Roadmap v5.0. Formally finalizes the 24-phase architecture, assigns Phase 18 to Enterprise Student Tools, and strictly aligns with ADR-027 to exclude the Organizations & Employers Platform. Enterprise Certificates Platform introduced. Learning / Certificates ownership separated. Phase numbering synchronized. Enterprise roadmap synchronized. Cross-phase conflicts resolved. Updated to integrate the Enterprise Asset Platform (EAP) per ADR-024 (Cross-Cutting Shared Platform) and synchronize all references, dependencies, and terminology across the baseline.
- **v5.0:** Foundation completion formally recognized; Academic Taxonomy Platform introduced; Phase renumbering updated; Dependency updates verified; Architecture governance updates (Phases 1.30, 1.31, 1.32) finalized and integrated.
- **v4.0:** Major modular monolith realignment; Domain-Driven Design boundaries codified.
- **v3.2:** Initial CI/CD pipeline integration and security baseline established.

## 3. Executive Summary

This document serves as the official Enterprise Roadmap for the MANARATAK 2.0 platform. The approved architecture remains a 24-phase Enterprise Modular Monolith roadmap. Source implementation is present through **Phase 19 — Enterprise Finance & Payments Platform**. A deep Phase 2–19 source audit completed on baseline `e57aad8c52a3ee6d686671870e0bf0392ba7417f`; dependency-aware source remediation is now in progress. Database migration execution, live provider verification, distributed-runtime evidence, and final operational closure remain runtime-pending; database mutations are governed by the Greenfield Database Provisioning and Mutation Safety runbook.

## 4. Current Project Status

This roadmap documents both the approved phase model and the current source-state checkpoint.

- **Architecture / Contract Status:**
  - Phase numbering and ownership remain frozen at **24 phases**.
  - Active architecture/contracts exist through the implemented Phase 19 boundary, subject to remediation findings where source and historical documentation drifted.
- **Source Implementation Status:**
  - Source implementation is present through **Phases 1–19**.
  - **Phase 2–19 deep source audit:** complete.
  - **Dependency-aware remediation:** in progress, beginning with W0 authority/quality-gate stabilization.
- **Runtime / Database Status:**
  - PostgreSQL-backed migration, backfill, recovery, provider, concurrency, and end-to-end runtime proofs are **not closed by source presence alone**.
  - These remain runtime-pending and must follow the Greenfield database mutation gate plus backup/rollback evidence appropriate to the operation before any data mutation.
- **Future Roadmap Status:**
  - **Phases 20–24:** not yet treated as completed implementation.

## 5. Complete Roadmap

- **Phase 1 – Phase 5:** Enterprise Foundation Architecture (Modular Monolith, Security, Integration, Data Governance, Observability, IAM, Workflow, Search, and Enterprise Asset Platform)
  - _Note on Phase 05:_ Establishes the centralized Enterprise Asset Platform (EAP), a Cross-Cutting Shared Platform handling secure file ingestion, quarantine scanning, metadata scrubbing (EXIF removal), optimized caching, and CDN routing.
- **Phase 6:** Universal Import Infrastructure
- **Phase 7:** Global Reference Data
- **Phase 8:** Academic Taxonomy
- **Phase 9:** International Tests Platform
- **Phase 10:** Majors & Disciplines Platform
- **Phase 11:** Universities & Institutions Platform
- **Phase 12:** Scholarships Platform
- **Phase 13:** Learning Platform
- **Phase 14:** Enterprise Certificates Platform
- **Phase 15:** Enterprise Student Platform (Student Workspace)
- **Phase 16:** Enterprise CMS Platform
- **Phase 17:** Enterprise AI Platform
- **Phase 18:** Enterprise Student Tools Platform
- **Phase 19:** Enterprise Finance & Payments Platform
- **Phase 20:** Enterprise Services Platform
- **Phase 21:** Enterprise Career & Alumni Platform
- **Phase 22:** Enterprise Product Experience
- **Phase 23:** Enterprise Administration Portal
- **Phase 24:** Enterprise Public Platform

## 6. Phase Dependencies

- **Enterprise Asset Platform (EAP) / Phase 05 Integration:** EAP is classified as a Cross-Cutting Shared Platform. Core business domains depend on Phase 05 for all file, media, and document persistence:
  - **Phase 11 (Universities & Institutions)** is dependent on Phase 05 for secure storage of university logos, campus media assets, and institutional brochures, using immutable `AssetId` references.
  - **Phase 12 (Scholarships)** is dependent on Phase 05 for student applicant document uploads (transcripts, certificates, and supporting financial files).
  - **Phase 15 (Enterprise Student Platform (Student Workspace))** is dependent on Phase 05 for student avatars, resume/CV documents, and portfolio assets.
  - **Phase 18 (Enterprise Student Tools Platform)** is dependent on Phase 05 for student tool assets and media delivery.
- **Phase 10-12 (Majors, Universities, Scholarships):** Dependent on Enterprise Foundation (Phases 1-5 including EAP), Universal Import (Phase 6), and Academic Taxonomy (Phase 8).
- **Phase 13 (Learning Platform):** Dependent on Phases 5-12 for catalog structure, institutional associations, and scholarships.
- **Phase 14 (Enterprise Certificates Platform):** Strictly dependent on Phase 13 (Learning Platform) for completion events (CourseCompleted, LearningPathCompleted) and Phase 5 for Identity, Caching, and EAP asset verification. Phase 14 publishes enterprise certificate events.
- **Phase 15 (Enterprise Student Platform (Student Workspace)):** Dependent on Phase 14 for certificate telemetry and certificate history, Phase 13 for learning progress read models, and Phase 05 for portfolio document storage.
- **Phases 16-24:** Sequentially dependent on the underlying Domain APIs and events established in Phases 10-15.

## 7. Milestone Status

This section tracks the progress of the enterprise across two distinct dimensions: architecture definition and software implementation.

### 7.1 Architecture Milestones

Architecture milestones represent the completion and formal approval of architecture specifications and domain contracts.

- **Phases 1–19:** Architecture/contracts are present in the repository and are the active implementation boundary under remediation.
- **Phase 1:** Constitution / governing architecture authority.
- **Phases 2–19:** Deep source audit complete; remediation findings take precedence over historical “fully certified” claims until closed.
- **Phases 20–24:** Future roadmap scope; implementation completion is not claimed here.

### 7.2 Implementation Milestones

Implementation milestones represent actual software development progress against the baselined architecture.

- **Phases 1–19:** Source implementation present.
- **Phases 2–19:** Source audit discovery complete; remediation is active and therefore these phases are **not yet globally closed for production/runtime**.
- **Database/runtime closure:** Deferred to Google Studio after source remediation and backup/recovery proof.
- **Phases 20–24:** Future implementation scope.

## 8. Architecture Freeze Status

- **Phase numbering / ownership (1–24):** Frozen by Roadmap v6.0.
- **Current physical topology:** Enterprise Modular Monolith; microservice extraction remains future/conditional.
- **Current API namespace:** `/api/v1` per `STD-API-001` and the live API registry.
- **Current canonical data posture:** relational canonical IDs/FKs inside the shared persistence boundary; compatibility strings may not replace canonical identity.
- **Phases 2–19 source behavior:** under dependency-aware remediation; no historical certification overrides a confirmed open finding.

## 9. Upcoming Work

The current work is **source remediation and verification**, not new phase implementation.

Execution follows the frozen dependency-aware remediation plan:

1. authority/quality gates;
2. cross-cutting security/composition;
3. durability/import foundations;
4. canonical reference/taxonomy foundations;
5. dependency-ordered domain remediation through Phase 19;
6. Google Studio runtime/database closure;
7. only then resume future roadmap implementation (Phases 20–24).

No later phase is considered production-closed merely because source files or historical completion reports exist.

## 10. Architecture Governance Rules

This section formally defines the governance rules for the enterprise roadmap:

- Roadmap v6.0 is the ONLY authoritative source for:
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

Roadmap v6.0 supersedes every previous roadmap. All architecture documents must follow it. Independent phase numbering is prohibited.

This document becomes the Single Source of Truth for:

- Phase numbering
- Phase naming
- Enterprise sequencing
- Dependency ordering
- Cross-phase references
