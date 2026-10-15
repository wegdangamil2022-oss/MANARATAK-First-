# MANARATAK-2.0-Roadmap-v6.0

## 1. Document Information

- **Title:** MANARATAK 2.0 Official Enterprise Roadmap
- **Version:** 6.0
- **Status:** Approved & Finalized architecture; implementation evidence is scoped separately
- **Approval Status:** Formal Baseline
- **Authors:** Chief Enterprise Software Architect
- **Last Updated:** 2026-10-15
- **Baseline:** Enterprise Foundation Baseline, Enterprise Domain Architecture Baseline, ADR-024 (Enterprise Asset Platform Adoption)

## 2. Revision History

- **2026-10-15 / B14:** Reconcile phase source checkpoints with current owner/API/Admin/Public implementations and their scoped review reports. Preserve the 24-phase authority, historical findings and unexecuted runtime/production gates. [Current P01–P24 status](../../remediation/ARCHITECTURAL_SECURITY_PHASE_STATUS_2026-10-15.md); [finding disposition register](../../remediation/ARCHITECTURAL_SECURITY_CLOSURE_REGISTER_2026-10-15.json). B13 includes two status corrections not rerun at the user’s request; no all-green CI claim.

- **v6.0:** Supersedes Roadmap v5.0. Formally finalizes the 24-phase architecture, assigns Phase 18 to Enterprise Student Tools, and strictly aligns with ADR-027 to exclude the Organizations & Employers Platform. Enterprise Certificates Platform introduced. Learning / Certificates ownership separated. Phase numbering synchronized. Enterprise roadmap synchronized. Cross-phase conflicts resolved. Updated to integrate the Enterprise Asset Platform (EAP) per ADR-024 (Cross-Cutting Shared Platform) and synchronize all references, dependencies, and terminology across the baseline.
- **v5.0:** Foundation completion formally recognized; Academic Taxonomy Platform introduced; Phase renumbering updated; Dependency updates verified; Architecture governance updates (Phases 1.30, 1.31, 1.32) finalized and integrated.
- **v4.0:** Major modular monolith realignment; Domain-Driven Design boundaries codified.
- **v3.2:** Initial CI/CD pipeline integration and security baseline established.

## 3. Executive Summary

This document serves as the official Enterprise Roadmap for the MANARATAK 2.0 platform. The frozen architecture has **24 phases**. Current source evidence covers the foundation, domain implementations through P21, P22 experience contracts, and P23/P24 Admin/Public consumer surfaces. Each claim is limited by its owner contracts and linked reports; this does not certify all historical feature requirements. Source presence, isolated checks, database/runtime proof and production acceptance are tracked separately in the [P01–P24 checkpoint](../../remediation/ARCHITECTURAL_SECURITY_PHASE_STATUS_2026-10-15.md).

B01–B13 remediation is implemented within the approved scope. B13 retains two corrected-but-unrechecked native test outcomes and a documented V8 fixture limitation. Session booking is explicitly outside the current release; existing mentorship opportunities and alumni consent remain. Translation content authoring stays `INFRASTRUCTURE_ONLY`. Migration execution, browser/provider/distributed-runtime proof and operational approval remain pending under the Greenfield Database Provisioning and Mutation Safety runbook. Section 27 and section 28 retain their open operational/source-verification gates.

## 4. Current Project Status

This roadmap documents both the approved phase model and the current source-state checkpoint.

- **Architecture / Contract Status:**
  - Phase numbering and ownership remain frozen at **24 phases**.
  - Architecture numbering and ownership remain controlled by P01–P24; source checkpoints and contract documents are reconciled individually without inventing business-data owners for P22/P23/P24.
- **Source Implementation Status:**
  - Source evidence is recorded for **P01–P24**, with scoped implementation, verification and deferral status per phase; this does not mean all phase requirements are globally complete.
  - **Phase 2–19 deep source audit:** complete.
  - **Dependency-aware remediation:** the current B01–B14 execution register supersedes old progress summaries for these findings; historical W0–W16 and section reviews remain provenance, with their explicit limits.
- **Runtime / Database Status:**
  - PostgreSQL-backed migration, backfill, recovery, provider, concurrency, and end-to-end runtime proofs are **not closed by source presence alone**.
  - These remain runtime-pending and must follow the Greenfield database mutation gate plus backup/rollback evidence appropriate to the operation before any data mutation.
- **Future Roadmap Status:**
  - **Phases 20–24:** Services/Careers owner code and Admin/Public consumers now have linked source evidence. Full product, runtime and production completion is not inferred.

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

- **P01–P24:** Architecture/owner contracts and consumer experience specifications are present; the per-phase checkpoint controls current source claims.
- **Phase 1:** Constitution / governing architecture authority.
- **Phases 2–19:** Deep source audit complete; remediation findings take precedence over historical “fully certified” claims until closed.
- **Phases 20–24:** Existing source/specification evidence is reconciled with explicit limits; these phases are not globally certified merely because files exist.

### 7.2 Implementation Milestones

Implementation milestones represent actual software development progress against the baselined architecture.

- **P01–P24:** Scoped source evidence is indexed in the current phase register; implementation and isolated proof vary by phase.
- **Phases 2–19:** Source audit discovery complete; remediation is active and therefore these phases are **not yet globally closed for production/runtime**.
- **Database/runtime closure:** Deferred to Google Studio after source remediation and backup/recovery proof.
- **Phases 20–24:** Source/contracts and consumer surfaces are present within reported scope; runtime/production and deferred product decisions remain open.

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

## 12. Current evidence and retained limits — 2026-10-15

The [phase register](../../remediation/ARCHITECTURAL_SECURITY_PHASE_STATUS_2026-10-15.json) records source, isolated verification, runtime and production separately for every P01–P24 entry. [The current remediation status](../../remediation/ARCHITECTURAL_SECURITY_EXECUTION_STATUS_2026-10-15.json) records B package execution, including corrected-but-unrechecked outcomes. B packages, review sections and P phases use different numbering. The approved B plan ends at **B14**; no B15 package is defined. This does not remove or renumber the existing **P15 Student Workspace**.

This checkpoint certifies no deployment, provider, database migration, live browser chain or production environment. Current section27/section28 statuses remain authoritative for their open integration/release gates. No older “fully closed” heading overrides them.
