# Documentation Folder Structure Standard

## Document Information
- **Title:** Documentation Folder Structure Standard
- **Document ID:** DOC-GOV-004
- **Status:** Baseline
- **Owner:** Architecture Review Board (ARB)

## Applies To
- All Project Phases
- All Official Documentation
- Architecture Blueprints & Contexts
- Architecture Decision Records (ADRs)
- Standards and Guidelines
- Policies
- Specifications
- Baselines
- Reports and Audits
- Operational Documents

---

## 1. Purpose
The purpose of the Documentation Folder Structure Standard is to design and mandate a uniform, logical, and scalable directory hierarchy for all documentation within the MANARATAK 2.0 repository. This standard ensures that every document has a single authoritative location, facilitating predictable navigation, effective governance, and automated discovery.

## 2. Scope
This standard governs the organization of all markdown documents, diagrams, assets, and templates housed within the central `/docs` directory of the project repository. It applies to all engineering, architectural, operational, and project-management documentation maintained by the enterprise.

## 3. Objectives
- **Centralization:** Consolidate all critical project knowledge into a unified, predictable structure.
- **Discoverability:** Enable stakeholders to locate specific documents instantly based on logical categorization.
- **Traceability:** Maintain clear separation between active working documents, locked baselines, and historical archives.
- **Governance:** Support automated CI/CD checks for broken links, naming convention compliance, and orphan document detection.

## 4. Design Principles
- **Single Source of Truth:** A concept or policy must be documented in exactly one place. Duplication is strictly forbidden; cross-linking must be used instead.
- **Logical Grouping:** Folders are organized by domain and purpose (e.g., security, architecture, operations) rather than by author or temporal events (unless specifically in phase/baseline folders).
- **Predictable Navigation:** The structure must be intuitive. If a developer needs an API standard, they should instinctively look in `/docs/standards/api`.
- **Scalability:** The hierarchy must accommodate thousands of documents without becoming a flat, unmanageable list. Nested categorization is required as folders grow.
- **Separation of Concerns:** Distinct types of documents (e.g., immutable baselines vs. active drafts) must reside in distinct directory trees.
- **Long-Term Maintainability:** The structure must gracefully handle the retirement of documents via a dedicated archiving strategy.

## 5. Official Documentation Root Structure
The root of all project documentation resides in the `/docs` directory. The following top-level directory structure is mandatory:

```text
/docs/
├── adr/             # Architecture Decision Records
├── api/             # API contracts, OpenAPI specs, and integration guides
├── legacy/          # Global historical artifacts and superseded documents
├── architecture/    # High-level architecture, domain designs, master blueprints
├── assets/          # Shared images, diagrams (e.g., draw.io, plantuml), and media
├── baselines/       # Locked documentation configurations for specific releases
├── devops/          # CI/CD pipeline designs, infrastructure-as-code docs
├── operations/      # Runbooks, incident response plans, system monitoring guides
├── phases/          # Time-bound project phase documentation and deliverables
├── policies/        # Governance, compliance, and enterprise policies
├── reports/         # Audits, performance reports, and architectural reviews
├── security/        # Threat models, security protocols, and compliance matrices
├── standards/       # Technical standards, coding guidelines, naming conventions
├── templates/       # Boilerplate markdown templates for new documents
└── testing/         # Test strategies, coverage reports, QA guidelines
```

## 6. Phase Documentation Structure
Project phases represent time-bound milestones. Documentation specific to a phase must be organized within `/docs/phases/Phase-[Number]-[Name]/` according to the following internal structure:

```text
/docs/phases/Phase-01-Foundation/
├── deliverables/    # Final outputs, milestone sign-offs
├── overview.md      # Executive summary and objectives of the phase
├── reviews/         # ARB review notes, stakeholder feedback
├── specifications/  # Technical and functional requirements specific to this phase
└── supporting/      # Meeting minutes, research notes, and transient context
```
*Note: Once a phase concludes, its final architectural decisions and standards must be abstracted and moved to the permanent `/docs/architecture/` or `/docs/standards/` folders, leaving only phase-specific historical execution data in the `phases/` directory.*

## 7. Naming and Placement Rules
- **ADRs:** All new Architecture Decision Records must be placed in `/docs/adr/`.
- **Standards & Policies:** Technical rules go to `/docs/standards/` (e.g., coding styles). Organizational or governance rules go to `/docs/policies/` (e.g., access control).
- **Audits & Reports:** Point-in-time assessments go to `/docs/reports/`.
- **Assets:** No document shall store images in the same folder as the markdown file. All images must be stored in `/docs/assets/` to ensure they are reusable.
- **Lowercase Kebab-Case:** All folder names must strictly use lowercase `kebab-case` without exception.

## 8. Cross-Linking Rules
- **Relative Paths:** Documents must link to one another using relative file paths (e.g., `../standards/DOC-GOV-003.md`). Absolute URLs to the repository host are prohibited to ensure local viewing compatibility.
- **Asset Referencing:** Images must be referenced via relative paths pointing to the centralized assets folder (e.g., `![Architecture Diagram](../../assets/architecture/sys-diagram.png)`).
- **Broken Link Prevention:** Moving a file requires updating all inbound references. CI/CD markdown link checkers will enforce this.

## 9. Legacy Archiving Strategy
To prevent repository clutter, documents that are no longer active must be transitioned to legacy directories:
- **Trigger:** When a document is marked as `Superseded` or `Archived` according to the Documentation Lifecycle Policy (DOC-GOV-001).
- **Action:** The file is moved to the appropriate legacy folder:
  - Global historical documents: `docs/legacy/`
  - Historical reports: `docs/reports/legacy/`
  - Historical governance audits: `docs/governance/audits/legacy/`
  - Localized context-specific directories: a local `legacy/` subfolder.
- **Physical Folder Convention:** Standardizing physically on `legacy/` rather than `/docs/archive/` ensures clean repository management while keeping archived structures isolated.
- **Structure Maintenance:** The internal structure of the `legacy/` folders mirrors or maps the active structure to preserve context.
- **Redirection Stub:** When a document is moved, a stub file with the original name MUST be left in the original location containing only a deprecation notice and a link to the new authoritative document or the legacy archive.

## 10. Governance Rules
- The Architecture Review Board (ARB) owns the top-level `/docs` directory structure.
- No new top-level directories may be created in `/docs` without formal ARB approval and a corresponding update to this standard.
- Sub-directories within established folders (e.g., inside `/docs/architecture/domains/`) may be created by domain leads provided they follow the naming standards.

## 11. Maintenance Process
- The Documentation Governance Lead will run automated structural audits weekly using repository linters.
- Any orphaned files (files not placed in an appropriate sub-directory) in the root of `/docs/` will trigger a pipeline warning and require categorization.
- Archiving sweeps will be conducted at the end of every major project phase.

## 12. Compliance Checklist
Before merging documentation structure changes, ensure:
- [ ] No new top-level folders have been created without ARB approval.
- [ ] All folder names use lowercase `kebab-case`.
- [ ] Document placement matches its category (e.g., policies in `/docs/policies`).
- [ ] Images and media are placed in `/docs/assets/`.
- [ ] Cross-links use valid relative paths.
- [ ] Superseded documents have been moved to the appropriate `legacy/` folder with appropriate stubs left behind.

## 13. Folder Examples

### Compliant Directory Tree
```text
/docs/
├── adr/
│   ├── ADR-001-Architecture-Version.md
│   └── ADR-015-Message-Broker.md
├── architecture/
├── MANARATAK-2.0-Master-Blueprint.md

│   └── standards/
│       ├── DOC-GOV-001-Documentation-Lifecycle.md
│       └── DOC-GOV-004-Folder-Structure.md
├── assets/
│   └── diagrams/
│       └── auth-flow.png
└── legacy/
    └── adr/
        └── ADR-000-Legacy-Decision.md
```

### Non-Compliant Directory Tree
```text
/docs/
├── Architecture/           # Violation: Uppercase folder name
├── ADRs/                   # Violation: Uppercase and plural (should be `adr`)
├── meeting-notes/          # Violation: Unauthorized top-level folder
└── MANARATAK-Design.md     # Violation: Orphan file in the root of /docs/
```

## 14. Glossary
- **ARB:** Architecture Review Board.
- **ADR:** Architecture Decision Record.
- **Baseline:** An immutable snapshot of project documentation for a specific release.
- **Kebab-Case:** Words separated by hyphens, all in lowercase (e.g., `folder-name`).

## 15. References
- [Documentation Lifecycle Policy (DOC-GOV-001)](./doc-gov-001-documentation-lifecycle-policy.md)
- [Enterprise Documentation Index (DOC-GOV-002)](./doc-gov-002-enterprise-documentation-index.md)
- [Documentation Naming Standard (DOC-GOV-003)](./doc-gov-003-documentation-naming-standard.md)
- Architecture Portal
- Baseline Management Policy
