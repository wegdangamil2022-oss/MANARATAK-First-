# Documentation Governance Standard & Cleanup Audit

## 1. Executive Summary
This document establishes the official Documentation Governance Standard for the MANARATAK monorepo. Documentation is a critical architectural asset that requires strict lifecycle management, ownership, structuring, and traceability. This standard defines documentation categories, mandatory metadata, lifecycle statuses, and cross-reference validation policies to transform documentation into a traceable architectural knowledge graph. An automated audit of the repository’s documentation was conducted to identify fragmentation, conflicts, and orphans, followed by a consolidation and archive strategy.

## 2. Documentation Governance Standard

All documentation within the MANARATAK repository must adhere to strict categorization, metadata requirements, traceability, and lifecycle management.

### 2.1 Documentation Categories
Every document must be explicitly classified into one of the following official categories:

*   **Architecture:** High-level system design, domain models, and structural reports (e.g., Architecture Baselines).
*   **ADR (Architecture Decision Record):** Immutable records of significant architectural decisions.
*   **Standards:** Official governance policies, coding guidelines, and type-safety rules.
*   **API:** API specifications, OpenAPI definitions, and integration contracts.
*   **Development Guide:** Onboarding tutorials, local setup instructions, and developer workflows.
*   **Operations:** Runbooks, incident response guides, and infrastructure management.
*   **Deployment:** CI/CD pipeline documentation, release processes, and environment configs.
*   **Security:** Threat models, security policies, and compliance reports.
*   **Testing:** QA strategies, test plans, and automation frameworks.
*   **User Documentation:** End-user manuals and feature usage guides.
*   **Historical / Archive:** Deprecated or superseded documents retained purely for historical reference.

### 2.2 Mandatory Document Metadata (Frontmatter)
Every documentation file must include standardized frontmatter or a metadata header defining the following properties:

*   **Owner:** The specific team, domain, or Architectural Owner responsible for the document.
*   **Purpose:** A concise summary of why the document exists and what it governs.
*   **Status:** Current lifecycle state (Draft, Review, Approved, Deprecated, Archived).
*   **Version:** Semantic version or revision number of the document.
*   **Source of Truth:** Defines if this document is the definitive source or if it aggregates from elsewhere.
*   **Related Documents:** Links to parent, child, or sibling documentation.
*   **Last Review:** Date of the last formal review by the Owner.
*   **Dependencies:** Other documents, repositories, or services this document relies upon for accuracy.

### 2.3 Documentation Traceability

To treat documentation as a knowledge graph rather than isolated files, explicit traceability is enforced. 

#### 2.3.1 Mandatory Traceability Metadata
For every Architecture Standard, ADR, Policy, and Architecture Report, the frontmatter **MUST** contain the following traceability metadata:

*   **Depends On:** Upstream documents or ADRs that necessitate this document.
*   **Referenced By:** Downstream documents that rely on this standard or decision.
*   **Supersedes:** Any older documents or versions that this document replaces.
*   **Related ADRs:** Associated Architecture Decision Records.
*   **Related Standards:** Associated governance standards or policies.
*   **Covered Packages:** Monorepo packages (e.g., `@manaratak/domain`) governed by this document.
*   **Covered Applications:** Specific apps (e.g., `api`, `web`) affected by this document.
*   **Covered Project Phases:** Specific rollout phases (e.g., Phase 1, Phase 5) relevant to this document.

#### 2.3.2 Documentation Traceability Matrix
A centralized Documentation Traceability Matrix is maintained to map the relationships between all major architectural artifacts, ensuring visibility into the impact of any changes to standards or policies. The matrix connects Business Requirements to Architecture Reports, ADRs, Standards, and corresponding Implementation Guides.

#### 2.3.3 Orphan Document Prevention
*   **Rule:** Orphan architectural documents are strictly prohibited. 
*   Every active document (Architecture, ADR, Standard) must either be explicitly referenced by a parent index/registry (e.g., an Architecture Index or Standard Registry) or explicitly reference a broader Domain Architecture. Documents without incoming or outgoing traceable relationships will be flagged for review and archiving.

#### 2.3.4 Cross-Reference Validation Policy
*   All document cross-references (links in `Depends On`, `Referenced By`, `Related ADRs`, etc.) must be strictly validated.
*   A CI/CD markdown linter or validation tool must execute on every pull request to ensure that no broken internal links exist and that bidirectional references between documents are accurate. 

### 2.4 Documentation Lifecycle
A document transitions through the following governed lifecycle states:

1.  **Draft:** Initial creation or major revision in progress. Not binding.
2.  **Review:** Under formal review by the Architecture Review Board (ARB) or Domain Owner.
3.  **Approved:** Official, active documentation. Binding and enforced.
4.  **Deprecated:** Nearing the end of its lifecycle, superseded by newer documentation, but still present for transitional reference.
5.  **Archived:** Officially retired. Must be moved to a physical `legacy/` directory or tagged as Historical.

## 3. Documentation Inventory & Audit Report

An automated audit of the repository discovered **269** documentation files (`.md`, `.txt`).

### 3.1 Documentation Inventory (By Category)
*   **Architecture:** 160 files
*   **Historical / Archive:** 21 files
*   **Standards:** 17 files
*   **Development Guide:** 11 files
*   **API:** 2 files
*   **Security:** 2 files
*   **Testing:** 1 file
*   **Other / Unclassified:** 55 files
*   **ADR / Operations / Deployment / User Documentation:** 0 files explicitly identified.

### 3.2 Conflict & Orphan Report
The audit identified several areas of fragmentation and conflict:

*   **Duplicate Documents:** Found significant overlaps between package-level `README.md` files and root-level architecture reports covering the same domains.
*   **Conflicting Documents:** Baseline reports from early project phases (e.g., `phase-05-14-sharedcomponents-architecture-baseline.md`) often conflict with recently established enterprise standards, creating ambiguity in the Source of Truth.
*   **Orphan Documents:** Temporary text files (e.g., `tmp_14.txt`, `13A5.txt`, `tmp_5_6.txt`) exist in the repository root without ownership, links, or clear purpose.
*   **Outdated Documents:** Many early Phase 5 architecture baselines have been superseded by centralized reports but were never formally deprecated or archived.

## 4. Consolidation & Archive Strategy

To restore documentation hygiene, the following plan will be executed. **No documents are modified or deleted in this phase.**

### 4.1 Consolidation Plan (Merge Candidates)
*   **Package vs. Global Architecture:** The 160 Architecture files are heavily fragmented. Package-specific internal architecture must be consolidated into their respective package `README.md` files. Global cross-cutting architecture must be consolidated into the `docs/architecture/` namespace.
*   **Baseline Reports:** Merge the heavily partitioned Phase 5 implementation and architecture baselines (e.g., `phase-05-15-monitoring-architecture-baseline.md` and `phase-05-15-monitoring-implementation-baseline.md`) into unified Domain Architecture documents (e.g., `monitoring-architecture.md`).
*   **Standardization:** Merge scattered policy files into the central `docs/architecture/reports/` registry alongside the Governance Standards.

### 4.2 Archive Plan (Archive & Removal Candidates)
*   **Temporary Orphans:** Move root-level `.txt` files (e.g., `tmp_*.txt`, `dummy.txt`) to the `Candidate for Removal` lifecycle state, pending deletion.
*   **Historical Baselines:** Move outdated phase-specific planning documents (e.g., Phase 1-4 summaries) into a structured `docs/legacy/` directory (or context-specific `legacy/` subfolders). They must be tagged with the **Historical / Archive** category and the **Archived** lifecycle status to prevent them from surfacing in active developer searches.
*   **Root Clutter:** Relocate unstructured notes (e.g., `core_types.txt`, `domain_types.txt`) into either formal development guides or archive them if they are stale drafts.

### 4.3 Next Steps for Enforcement
1.  Establish a documentation linter to enforce the Mandatory Document Metadata and Traceability Metadata on all active Markdown files.
2.  Begin executing the Consolidation and Archive plans in isolated PRs requiring ARB approval.
3.  Implement Cross-Reference Validation Policy in CI pipelines.
