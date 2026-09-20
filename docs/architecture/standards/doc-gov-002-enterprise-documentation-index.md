# Enterprise Documentation Index

## Document Information
- **Title:** Enterprise Documentation Index
- **Document ID:** DOC-GOV-002
- **Status:** Baseline
- **Owner:** Architecture Review Board (ARB)

## Applies To
- All Project Phases
- All Official Documentation
- Architecture Blueprints & Master Plans
- Architecture Decision Records (ADRs)
- Standards and Guidelines
- Policies
- Baselines
- Reports and Audits
- Technical Specifications
- Operational Documents

---

## 1. Purpose
The Enterprise Documentation Index serves as the single authoritative entry point and central navigation hub for the MANARATAK 2.0 project. It catalogs every official project document, ensuring that all architecture, governance, technical, operational, and project documentation is easily discoverable, strictly governed, and tightly aligned with the overall enterprise architecture.

## 2. Scope
This index covers all official documentation assets produced, maintained, and retired throughout the entire lifecycle of the MANARATAK 2.0 project, regardless of the target audience (executives, architects, developers, or operators). It applies to all current, historical, and planned documents.

## 3. Objectives
- **Centralized Navigation:** Provide a single, reliable point of entry for discovering project knowledge.
- **Authoritative Tracking:** Act as the master ledger for all baselined and approved project documents.
- **Traceability:** Ensure every document maps correctly to its relevant architecture phase, baseline, and governing ADRs.
- **Standardization:** Enforce structural consistency across the documentation repository.
- **Lifecycle Alignment:** Support the Documentation Lifecycle Policy (DOC-GOV-001) by providing real-time visibility into document statuses.

## 4. Documentation Categories
To ensure logical grouping, all official documentation must be assigned to one of the following primary categories:
- **Foundation:** Core definitions, glossaries, and overarching principles.
- **Enterprise Architecture:** High-level blueprints, master plans, and enterprise capability models.
- **Domain Architecture:** Specific bounded context designs (e.g., Identity, Workflow, File Management).
- **Technical Standards:** Coding, API, data, and infrastructure guidelines.
- **Security:** Security policies, threat models, and compliance requirements.
- **Performance:** SLAs, load testing strategies, and optimization guidelines.
- **CMS:** Content Management System architecture and design.
- **Import Framework:** Data import, transformation, and validation framework documentation.
- **Translation Framework:** Localization, internationalization, and translation services.
- **Search:** Search engine architecture, indexing, and query patterns.
- **AI:** Artificial Intelligence integration, model governance, and usage patterns.
- **Notifications:** Notification gateways, templates, and delivery systems.
- **Analytics:** Data analytics, reporting, and telemetry architectures.
- **DevOps:** CI/CD pipelines, platform engineering, and infrastructure-as-code documentation.
- **Testing:** Enterprise testing architectures, quality gates, and coverage reports.
- **Governance:** Project governance policies, review processes, and ARB charters.
- **ADRs:** Architecture Decision Records logging significant technical choices.
- **Baselines:** Locked documentation sets defining specific project releases or phases.
- **Reports:** Phase reports, audit findings, and architectural assessments.
- **Operations:** Runbooks, incident response plans, and system monitoring guides.
- **Deployment:** Deployment topologies, release strategies, and environment configurations.

## 5. Documentation Hierarchy
Documentation is organized hierarchically to support top-down discovery:
- **Level 0 (L0) - Master & Governance:** Enterprise Documentation Index, Master Blueprint, Core Policies (ARB).
- **Level 1 (L1) - Phase & Baseline Definitions:** Phase entry/exit criteria, Baseline definitions, overarching System Architecture.
- **Level 2 (L2) - Domain & Capability Architectures:** Domain-specific designs, capability models, and integration patterns.
- **Level 3 (L3) - Technical Specifications:** Detailed technical designs, API contracts, data models, and component specifications.
- **Level 4 (L4) - Operational & Implementation:** Runbooks, developer guides, test reports, and deployment instructions.

## 6. Official Directory Structure
The documentation repository must adhere strictly to the following directory structure:
```text
/docs/
├── architecture/
│   ├── blueprints/           # L0/L1 Enterprise and System Blueprints
│   ├── domains/              # L2 Domain Architectures
│   ├── phase-reports/        # Phase reports and transition documentation
│   ├── reports/              # Architectural audits and specific assessments
│   └── standards/            # Policies (DOC-GOV), Technical Standards
├── adrs/                     # Architecture Decision Records
├── baselines/                # Locked baseline definitions and manifests
├── security/                 # Threat models, compliance matrices
├── technical/                # L3 Technical Specifications and API Contracts
├── operations/               # L4 Runbooks, incident management
└── testing/                  # Test strategies, coverage reports
```

## 7. Master Documentation Catalog
The Master Catalog tracks all active, baselined, and superseded documents. 

### Catalog Entry Template
Every document registered in the index must supply the following metadata template:

| Field | Description |
| :--- | :--- |
| **Document Name** | Full, official title of the document. |
| **Document ID** | Unique enterprise identifier (e.g., DOC-GOV-001, ADR-042). |
| **Category** | Primary category from Section 4. |
| **Owner** | The individual or body (e.g., ARB) responsible for the document. |
| **Phase** | Project phase where the document originated or is most relevant. |
| **Current Status** | Status per DOC-GOV-001 (e.g., Baseline, Approved, Deprecated). |
| **Current Version** | Semantic version (e.g., 1.2.0). |
| **Baseline Reference** | Link to the official architecture baseline version this belongs to. |
| **Related ADRs** | Comma-separated list of governing ADR IDs. |
| **Dependencies** | Links to other required documents or external standards. |
| **Last Review** | Date of the most recent ARB or Owner review. |

## 8. Cross Reference Rules
To maintain traceability, documents must adhere to these referencing standards:
- **ADRs:** Must be referenced by their official ID (e.g., `[ADR-015](../adrs/ADR-015-Database-Selection.md)`).
- **Phases:** Must link to the official Phase definition document when referring to project milestones.
- **Baselines:** References to specific architecture states must link to the locked Baseline manifest.
- **Standards & Policies:** Any compliance requirement must link directly to the enforcing standard or policy ID (e.g., `DOC-GOV-001`).
- **Related Documents:** Use relative Markdown links pointing to the official repository paths defined in Section 6.

## 9. Navigation Rules
- **Source of Truth:** The `main` branch of the designated documentation repository is the immutable source of truth.
- **Discoverability:** Users must navigate top-down starting from this Enterprise Documentation Index.
- **Searchability:** All documents must use clear, standardized metadata headers to support automated indexing and search tools.
- **Dead Links:** Documents containing broken cross-references will fail the Baseline review process.

## 10. Version Synchronization Rules
- **Cascading Updates:** If an L1 or L2 document undergoes a Major version change, all dependent L3 and L4 documents must be reviewed and synchronized within the same project phase.
- **ADR Impacts:** When a new ADR is approved, all directly conflicting documentation must transition to `Work In Progress` for update, or `Deprecated` if no longer applicable.
- **Baseline Alignment:** Documents cannot claim alignment with a Baseline Version if their own Current Version post-dates the Baseline lock date.

## 11. Governance Rules
- No document shall be considered official or binding unless it is registered in the Master Documentation Catalog.
- All documents must comply strictly with the state transitions and approval workflows defined in the Documentation Lifecycle Policy (DOC-GOV-001).
- The Architecture Review Board (ARB) holds the final authority over catalog structure, document IDs, and categorization.

## 12. Maintenance Process
- **Automated Verification:** CI/CD pipelines shall run markdown link checkers and schema validators against the documentation repository on every pull request.
- **Periodic Review:** The Documentation Governance Lead will conduct a quarterly audit of the Master Catalog to identify stale, orphaned, or undocumented artifacts.
- **Orphan Management:** Uncategorized or unreferenced documents will be flagged for deprecation within 30 days if an owner is not identified.

## 13. Compliance Checklist
Before registering a new document in the Enterprise Documentation Index, ensure:
- [ ] Document adheres to the Documentation Lifecycle Policy (DOC-GOV-001).
- [ ] Unique Document ID is assigned and follows enterprise naming conventions.
- [ ] Document is placed in the correct Official Directory Structure.
- [ ] All mandatory metadata fields (Status, Owner, Version, Traceability) are present.
- [ ] Cross-references to ADRs, Baselines, and Policies use valid relative links.
- [ ] The document has passed the requisite ARB or Owner approval gate.

## 14. Glossary
- **ADR:** Architecture Decision Record.
- **ARB:** Architecture Review Board.
- **Baseline:** A locked, immutable snapshot of the project architecture and its supporting documentation.
- **Index:** This document; the master ledger and navigation portal for all project knowledge.
- **Owner:** The entity ultimately responsible for maintaining the accuracy and status of a document.

## 15. References
- [Documentation Lifecycle Policy (DOC-GOV-001)](./doc-gov-001-documentation-lifecycle-policy.md)
- Architecture Portal
- ADR Management Policy
- Architecture Versioning Standard
- Baseline Management Policy

## 16. Master Documentation Catalog Registry (Active)
| Document Name | Document ID | Category | Owner | Phase | Current Status | Current Version | Baseline Reference | Related ADRs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Enterprise Shared Contracts Discovery & Inventory | DOC-ESC-001 | Enterprise Architecture | ARB | Phase 1-13 | APPROVED | 1.0 | N/A | ADR-ESC-001 |
| Enterprise Shared Contracts Consolidation Blueprint | DOC-ESC-002 | Enterprise Architecture | ARB | Phase 1-13 | APPROVED | 1.0 | N/A | ADR-ESC-001 |
| Enterprise Shared Contracts Specification | DOC-ESC-003 | Enterprise Architecture | ARB | Phase 1-13 | APPROVED | 1.0 | N/A | ADR-ESC-001 |
| Enterprise Shared Contracts Migration & Integration Plan | DOC-ESC-004 | Enterprise Architecture | ARB | Phase 1-13 | APPROVED | 1.0 | N/A | ADR-ESC-001 |

| Enterprise Lifecycle Discovery & Inventory | DOC-ELF-001 | Enterprise Architecture | ARB | Phase 1-13 | APPROVED | 1.0 | Phase 4.21 Baseline | N/A |
| Enterprise Lifecycle Blueprint | DOC-ELF-002 | Enterprise Architecture | ARB | Phase 1-13 | APPROVED | 1.0 | Phase 4.21 Baseline | N/A |
| Enterprise Lifecycle Framework Specification | DOC-ELF-003 | Enterprise Architecture | ARB | Phase 1-13 | APPROVED | 1.0 | Phase 4.21 Baseline | N/A |
| Enterprise Lifecycle Migration & Integration Plan | DOC-ELF-004 | Enterprise Architecture | ARB | Phase 1-13 | APPROVED | 1.0 | Phase 4.21 Baseline | N/A |
| Enterprise Foundation Discovery & Inventory | DOC-EF-001 | Enterprise Architecture | ARB | Phase 1-13 | APPROVED | 1.0 | Phase 4.21 Baseline | N/A |
| Enterprise Foundation Consolidation Blueprint | DOC-EF-002 | Enterprise Architecture | ARB | Phase 1-13 | APPROVED | 1.0 | Phase 4.21 Baseline | N/A |
| Enterprise Foundation Specification | DOC-EF-003 | Enterprise Architecture | ARB | Phase 1-13 | APPROVED | 1.0 | Phase 4.21 Baseline | N/A |
| Enterprise Foundation Migration & Integration Plan | DOC-EF-004 | Enterprise Architecture | ARB | Phase 1-13 | APPROVED | 1.0 | Phase 4.21 Baseline | N/A |
| Transactional Outbox Discovery & Assessment | DOC-TXO-001 | Enterprise Architecture | ARB | Phase 1-13 | APPROVED | 1.0 | Phase 4.21 Baseline | N/A |
| Enterprise Transactional Outbox Blueprint | DOC-TXO-002 | Enterprise Architecture | ARB | Phase 1-13 | APPROVED | 1.0 | Phase 4.21 Baseline | N/A |
| Enterprise Transactional Outbox Specification | DOC-TXO-003 | Enterprise Architecture | Int. Arch. | Phase 1-13 | APPROVED | 1.0 | Phase 4.21 Baseline | N/A |
| Enterprise Transactional Outbox Migration Plan | DOC-TXO-004 | Enterprise Architecture | ARB | Phase 1-13 | APPROVED | 1.0 | Phase 4.21 Baseline | N/A |
