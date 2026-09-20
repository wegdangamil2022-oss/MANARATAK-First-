# Phase 1 Official Folder Structure

## Document Information

- **Title:** Phase 1 Official Folder Structure
- **Document ID:** PHASE-01-STRUCT-001
- **Status:** Baseline
- **Owner:** Architecture Review Board (ARB)

## Applies To

- Phase 1 — Foundation
- Foundation Blueprints
- Foundation Standards
- Foundation Reviews
- Foundation Reports
- Foundation Deliverables

---

## 1. Purpose

The purpose of the Phase 1 Official Folder Structure specification is to define and mandate a standardized repository hierarchy for all documentation produced during Phase 1 (Foundation) of the MANARATAK 2.0 project. This standard ensures long-term consistency, immediate discoverability, strict governance compliance, and enterprise-grade maintainability for all foundational artifacts.

## 2. Scope

This specification governs every document, artifact, diagram, report, and standard generated or utilized within Phase 1 of the MANARATAK 2.0 lifecycle. It strictly applies to the internal structure of the `/docs/phases/phase-01-foundation/` directory.

## 3. Objectives

- **Structural Standardization:** Impose a strict, immutable directory hierarchy for all Phase 1 documentation.
- **Traceability and Auditing:** Ensure every architectural decision, review, and deliverable is properly grouped to facilitate ARB audits.
- **Automated Validation:** Provide a predictable directory schema that CI/CD linters can validate against.
- **Lifecycle Management:** Clearly separate active working documents from immutable baselines and deprecated archives.

## 4. Design Principles

- **Single Source of Truth:** Documents must reside in one explicit location. Redundant or duplicated files are strictly prohibited.
- **Logical Grouping:** Documents are organized by their architectural intent and lifecycle phase (e.g., specifications vs. deliverables) rather than by author or chronological creation date.
- **Predictable Navigation:** The directory hierarchy must be completely intuitive, allowing any architect or engineer to instinctively locate foundational specifications or reviews.
- **Scalability:** The structure must seamlessly support a growing volume of artifacts without degrading into a flat, unmanageable directory.
- **Separation of Concerns:** Distinct categories of documentation (e.g., immutable baselines, active standards, and historical reviews) are isolated into dedicated subdirectories.
- **Enterprise Maintainability:** The structure includes built-in mechanisms for deprecation, archival, and asset management, ensuring the repository remains clean over time.

## 5. Official Folder Structure

All Phase 1 documentation must be organized exactly within the following hierarchical structure under `/docs/phases/phase-01-foundation/`:

```text
/docs/phases/phase-01-foundation/
├── archive/         # Superseded, retired, or obsolete Phase 1 documentation
├── assets/          # Shared diagrams, images, and embedded media specific to Phase 1
├── blueprints/      # High-level foundational architectural designs and models
├── deliverables/    # Finalized, approved outputs and milestone sign-offs
├── overview/        # Executive summaries, vision documents, and phase objectives
├── reports/         # Status updates, metric reports, and audit findings
├── reviews/         # ARB review notes, stakeholder feedback, and design evaluations
├── specifications/  # Technical, functional, and systemic requirement specifications
├── standards/       # Phase 1 specific coding, structural, and procedural guidelines
└── templates/       # Reusable markdown templates for Phase 1 artifacts
```

## 6. Document Placement Rules

- **Phase Overviews & Charters:** Must be placed in the `overview/` directory.
- **Architectural Blueprints:** Core foundational models (e.g., Domain Model, Bounded Contexts) belong in `blueprints/`.
- **Technical Standards:** Engineering guidelines and coding standards formed during this phase belong in `standards/`.
- **Requirement Definitions:** All systemic and functional specifications belong in `specifications/`.
- **Evaluations & Feedback:** Meeting minutes, ARB feedback, and peer reviews belong in `reviews/`.
- **Milestone Sign-Offs:** Approved final deliverables and baseline declarations belong in `deliverables/`.
- **Audits & Status:** Progress reports and compliance audits belong in `reports/`.
- **Images & Diagrams:** All non-markdown assets must reside in `assets/` and be referenced via relative paths.
- **Deprecated Artifacts:** Any document that is no longer valid must be moved to `archive/`.

## 7. Naming Rules

All Phase 1 documentation must strictly adhere to the Enterprise **Documentation Naming Standard (DOC-GOV-003)**:

- **File Names:** Must use lowercase `kebab-case` with a `.md` extension.
- **Document IDs:** Must be included as a prefix where applicable (e.g., `phase-01-struct-001-folder-structure.md`).
- **No Special Characters:** Spaces, underscores, and special symbols are strictly forbidden.
- **Directory Names:** Must exactly match the structure defined in Section 5, entirely in lowercase.

## 8. Cross-Reference Rules

- **Internal Phase Linking:** Documents within Phase 1 must use relative paths (e.g., `../standards/phase-01-std-001.md`) to reference other Phase 1 artifacts.
- **Global ADR Linking:** When referencing an enterprise Architecture Decision Record, link to the global `/docs/adr/` repository using relative paths.
- **Enterprise Standards Linking:** References to global policies (e.g., DOC-GOV-001) must point to the global `/docs/architecture/standards/` directory.
- **Asset Referencing:** Images must be referenced via relative paths pointing to the local `assets/` folder (e.g., `![Architecture Diagram](../assets/domain-model.png)`).
- **Absolute URLs:** Absolute links to the repository host are strictly prohibited to ensure local viewing compatibility.

## 9. Governance Rules

- **Ownership:** The Architecture Review Board (ARB) retains ultimate ownership of the Phase 1 folder structure.
- **Approval Workflow:** All new documents added to `blueprints/`, `specifications/`, or `standards/` require formal ARB approval via Pull Request.
- **Directory Modifications:** Creating new top-level subdirectories within `/docs/phases/phase-01-foundation/` is forbidden without an approved revision to this specification (PHASE-01-STRUCT-001).
- **Compliance:** Any Pull Request violating the folder structure or naming rules will be immediately rejected by automated governance linters.

## 10. Maintenance Process

- **Introduction:** New documents are drafted in feature branches and submitted via PR to the appropriate subdirectory.
- **Review:** The ARB and relevant stakeholders review the PR for content accuracy and structural compliance.
- **Archival:** When a Phase 1 document is superseded by a global standard or a later phase, it is moved to the `archive/` directory. A stub file containing a deprecation notice and a forwarding link MUST be left in the original location.
- **Retirement:** Documents in the archive are retained indefinitely for historical auditing purposes.

## 11. Compliance Checklist

Before merging any new document into Phase 1, ensure the following criteria are met:

- [ ] Document is placed in the correct logical subdirectory.
- [ ] File name strictly follows lowercase `kebab-case` per DOC-GOV-003.
- [ ] Document ID, Status, Version, and Owner metadata are present.
- [ ] All cross-references use valid relative paths.
- [ ] Any embedded images or media are stored in the local `assets/` directory.
- [ ] The document does not duplicate information found in global enterprise standards.

## 12. Example Directory Tree

```text
/docs/phases/phase-01-foundation/
├── overview/
│   └── phase-01-executive-summary.md
├── blueprints/
│   └── phase-01-domain-model-blueprint.md
├── standards/
│   └── phase-01-typescript-guidelines.md
├── specifications/
│   └── phase-01-struct-001-official-folder-structure.md
├── reviews/
│   └── rep-arch-01a-initial-design-review.md
├── deliverables/
│   └── baseline-v1.0.0-foundation.md
├── reports/
│   └── rep-stat-001-phase-completion-report.md
├── archive/
│   └── phase-01-draft-architecture.md
├── assets/
│   └── domain-model-diagram.png
└── templates/
    └── phase-01-standard-template.md
```

## 13. Glossary

- **ARB:** Architecture Review Board. The governing body responsible for enterprise architecture standards.
- **ADR:** Architecture Decision Record. A document capturing an important architectural decision made along with its context and consequences.
- **Baseline:** An immutable snapshot of project documentation or architecture for a specific release or phase completion.
- **Foundation:** The initial phase (Phase 1) establishing the core architectural blueprints, standards, and repositories for the project.

## 14. References

- [Documentation Lifecycle Policy (DOC-GOV-001)](../../architecture/standards/doc-gov-001-documentation-lifecycle-policy.md)
- [Enterprise Documentation Index (DOC-GOV-002)](../../architecture/standards/doc-gov-002-enterprise-documentation-index.md)
- [Documentation Naming Standard (DOC-GOV-003)](../../architecture/standards/doc-gov-003-documentation-naming-standard.md)
- [Documentation Folder Structure Standard (DOC-GOV-004)](../../architecture/standards/doc-gov-004-documentation-folder-structure-standard.md)
