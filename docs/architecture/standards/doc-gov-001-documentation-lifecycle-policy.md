# Documentation Lifecycle Policy

## Document Information
- **Title:** Documentation Lifecycle Policy
- **Document ID:** DOC-GOV-001
- **Status:** Baseline
- **Owner:** Architecture Review Board (ARB)

## 1. Purpose
The purpose of this Documentation Lifecycle Policy is to establish a rigorous, standardized, and enforceable enterprise-wide framework governing the lifecycle of every official project document within the MANARATAK 2.0 ecosystem. It ensures that all documentation remains accurate, traceable, and aligned with architectural goals from creation through retirement.

## 2. Scope
This policy applies to:
- All Phases of the MANARATAK 2.0 project
- All Architecture Documents (Blueprints, Master Plans)
- All Architecture Decision Records (ADRs)
- All Standards and Guidelines
- All Policies
- All Specifications
- All Baselines
- All Reports and Audits
- All Technical Documents

## 3. Objectives
- Establish absolute consistency across all project documentation.
- Define a clear, state-based lifecycle for all documents.
- Ensure strict traceability mapping documents to architecture versions and ADRs.
- Eliminate unauthorized modifications by mandating a formal approval workflow.
- Prevent the accumulation of stale, obsolete, or undocumented artifacts.

## 4. Document Classification
Documents must hold one of the following classification states at any given time:
- **Draft:** Initial creation phase. Incomplete or undergoing active writing.
- **Work In Progress:** Active collaboration and refinement.
- **Review:** Ready for formal peer or ARB review.
- **Approved:** Passed review; authorized for inclusion in the project.
- **Baseline:** Locked, official version serving as the source of truth for the current phase.
- **Deprecated:** Identified for future removal, but still active.
- **Superseded:** Replaced by a newer version or another document.
- **Archived:** Preserved for historical record but no longer actively referenced or updated.
- **Retired:** Permanently removed from active systems; retained only for compliance.

## 5. Complete Document Lifecycle
The following states define the lifecycle for all documentation:

### Draft
- **Purpose:** Initial ideation and content generation.
- **Owner:** Primary Author.
- **Allowed Actions:** Open editing, restructuring, peer feedback.
- **Entry Criteria:** Intent to create a new formal document.
- **Exit Criteria:** Content is logically complete and ready for broader input.

### Work In Progress
- **Purpose:** Active structural and content refinement with stakeholders.
- **Owner:** Primary Author / Co-Authors.
- **Allowed Actions:** Edits, additions, comments.
- **Entry Criteria:** Draft exited.
- **Exit Criteria:** All sections populated; author deems it ready for formal review.

### Review
- **Purpose:** Formal evaluation against architectural standards.
- **Owner:** Reviewer / ARB.
- **Allowed Actions:** Read-only for authors; comments and change requests from reviewers.
- **Entry Criteria:** Document submitted to ARB or designated reviewers.
- **Exit Criteria:** All feedback addressed; ARB or Reviewer formally signs off.

### Approved
- **Purpose:** Acknowledges the document meets all standards and is accepted.
- **Owner:** ARB / Approver.
- **Allowed Actions:** Staging for baseline integration; no content changes allowed without new review.
- **Entry Criteria:** Formal sign-off obtained.
- **Exit Criteria:** Document is integrated into a formal project phase baseline.

### Baseline
- **Purpose:** Serves as the immutable source of truth for the current architecture phase.
- **Owner:** ARB.
- **Allowed Actions:** Read-only reference. Any changes require a new document version starting at Draft.
- **Entry Criteria:** Integrated into an active phase release.
- **Exit Criteria:** Replaced by a new baseline version, deprecated, or superseded.

### Deprecated
- **Purpose:** Warns users that the document will be phased out.
- **Owner:** ARB.
- **Allowed Actions:** Read-only; appending deprecation notices.
- **Entry Criteria:** ARB decision to phase out the document.
- **Exit Criteria:** Document is formally superseded or archived.

### Superseded
- **Purpose:** Indicates the document has been fully replaced by a newer version.
- **Owner:** ARB / Documentation Governance Lead.
- **Allowed Actions:** Read-only with mandatory linking to the new version.
- **Entry Criteria:** A new baseline version is approved that replaces this document.
- **Exit Criteria:** Document is moved to historical archives.

### Archived
- **Purpose:** Historical preservation for audit or reference.
- **Physical Path:** Documents marked with the `Archived` lifecycle status physically reside in the appropriate `legacy/` directory (such as `docs/legacy/`, `docs/reports/legacy/`, `docs/governance/audits/legacy/`, or context-specific localized `legacy/` folders). There is a clean distinction: `Archived` is the logical lifecycle status, while `legacy/` is the physical directory path.
- **Owner:** Documentation Governance Lead.
- **Allowed Actions:** Cold storage access; read-only.
- **Entry Criteria:** Document is superseded or no longer relevant.
- **Exit Criteria:** Document reaches end of mandatory retention period.

### Retired
- **Purpose:** Final state; document is permanently removed from active discovery.
- **Owner:** Documentation Governance Lead.
- **Allowed Actions:** Deletion or permanent cold vaulting.
- **Entry Criteria:** Retention period expires.
- **Exit Criteria:** None (Terminal state).

## 6. State Transition Rules
### Valid Transitions
- **Draft → Work In Progress:** Author initiates collaboration.
- **Work In Progress → Review:** Author submits for formal evaluation.
- **Review → Work In Progress:** Reviewer requests substantial changes.
- **Review → Approved:** Reviewer/ARB formally signs off.
- **Approved → Baseline:** ARB integrates into official phase release.
- **Baseline → Deprecated:** ARB flags for future removal.
- **Baseline → Superseded:** ARB approves a new version replacing the current.
- **Deprecated → Superseded:** New version officially takes over.
- **Superseded → Archived:** Document moved to a physical `legacy/` folder.
- **Archived → Retired:** Retention period expires.

### Forbidden Transitions
- **Draft → Approved/Baseline:** Bypassing the Review state is strictly prohibited.
- **Approved/Baseline → Draft/Work In Progress:** A baselined document cannot be reverted; a new version must be created.
- **Archived/Retired → Baseline:** Historical documents cannot be directly resurrected without a new review cycle.

## 7. Approval Workflow
- **Author:** Creates content, addresses review feedback, requests transition to Review.
- **Reviewer:** Evaluates content for technical accuracy, clarity, and alignment with standards.
- **Architecture Review Board (ARB):** Final authority on architectural documents, ADRs, and baselines. Approves transition to Approved/Baseline.
- **Approver:** Designated lead (if not ARB) who provides formal sign-off.
- **Publisher:** Responsible for publishing the Approved document into the Baseline repository.

## 8. Versioning Rules
All formal documents must follow Semantic Versioning (SemVer) principles:
- **Major (X.0.0):** Significant structural changes, full rewrites, or new architecture phases. Always requires ARB approval.
- **Minor (0.X.0):** Additions of new sections or substantial clarifications that do not alter the core architecture. Requires Reviewer approval.
- **Patch (0.0.X):** Typo corrections, formatting fixes, or minor clarifications. Does not require full ARB review.
- **Baseline Versions:** All baselined documents must be locked to a specific Major/Minor version.
- **Relationship with ADRs:** Documents modified due to an ADR must bump their Minor or Major version and explicitly reference the ADR ID.
- **Relationship with Architecture Version:** Document versions must be explicitly mapped to the overarching MANARATAK 2.0 Architecture Version they support.

## 9. Document Traceability
Every document must maintain strict traceability through its metadata header:
- **Phase:** The specific project phase (e.g., Phase 2, Phase 3) the document belongs to.
- **Baseline:** The overarching architecture baseline version.
- **ADR:** Links to any Architecture Decision Records that influenced or mandated the document.
- **Architecture Version:** The global system architecture version.
- **Related Documents:** Links to parent, child, or sibling documents.
- **Dependencies:** Any external systems, standards, or documents this artifact relies upon.

## 10. Change Management
- **Revision Requests:** Any stakeholder may submit a revision request. It must include justification and reference relevant ADRs if applicable.
- **Review Cycle:** Revision requests enter the Work In Progress state (as a new version draft) and must pass the Review state.
- **Approval Cycle:** ARB or designated Approvers must formally sign off before the new version becomes Approved.
- **Emergency Changes:** Critical security or compliance updates may be fast-tracked by the ARB but must still be formally baselined post-incident.
- **Deprecation Process:** Requires formal ARB notification to all stakeholders 30 days prior to marking a baseline document as Superseded.

## 11. Responsibilities
- **Architect:** Authors architectural documents, ensures alignment with master blueprints, and drives the review process.
- **Developer:** Authors technical specifications and implementation guides; reviews architecture documents for feasibility.
- **Reviewer:** Conducts thorough evaluations against standards and policies.
- **Project Manager:** Tracks document states, ensures timely reviews, and manages the publication schedule.
- **ARB:** Ultimate governing body; approves baselines, ADRs, and major version transitions.

## 12. Compliance Requirements
- **Mandatory Metadata:** All documents MUST contain the standard metadata header (Title, ID, Status, Owner, Traceability Links).
- **No Unauthorized Baselines:** No document may be marked as Baseline without documented ARB approval.
- **Immutable Baselines:** Once baselined, a document's content is immutable. Changes require a new version.
- **Format:** All documents must be authored in standard Markdown.

## 13. Exceptions Policy
Exceptions to this policy are strictly limited. Any deviation (e.g., bypassing a review stage for an emergency patch) requires a formal written waiver signed by the ARB Lead, explicitly detailing the justification and the remediation plan to achieve compliance post-event.

## 14. Document Retirement
Documents are moved to Retired status only after they have been in the Archived state for the mandatory retention period (as defined by enterprise compliance). Retired documents are permanently removed from active indexing and retained only in deep cold storage if legally required.

## 15. Governance Checklist
Before any document is transitioned to Baseline, the following MUST be verified:
- [ ] Document contains complete and accurate metadata header.
- [ ] Version number is updated according to rules.
- [ ] Traceability links (Phase, ADRs, Dependencies) are present and valid.
- [ ] Document has passed formal Review state.
- [ ] ARB or designated Approver has provided written/digital sign-off.
- [ ] Document formatting complies with enterprise Markdown standards.
- [ ] No placeholder or "TBD" sections remain.

## 16. Compliance Matrix

| Lifecycle State | Owner | Approval Required | Version Required | Traceability Required |
| :--- | :--- | :--- | :--- | :--- |
| Draft | Author | No | Draft (e.g., 0.1) | Recommended |
| Work In Progress | Author | No | Draft (e.g., 0.x) | Recommended |
| Review | Reviewer/ARB | Yes (to exit) | Draft (e.g., 0.9) | Yes |
| Approved | ARB/Approver | Yes (completed) | Formal (e.g., 1.0) | Yes |
| Baseline | ARB | Yes (completed) | Formal (e.g., 1.0) | Yes |
| Deprecated | ARB | Yes (to enter) | Formal | Yes |
| Superseded | Documentation Lead | Yes (to enter) | Formal | Yes |
| Archived | Documentation Lead | No | Formal | Yes |
| Retired | Documentation Lead | No | Formal | Yes |

## 17. Glossary
- **ADR:** Architecture Decision Record. A document capturing an important architectural decision made along with its context and consequences.
- **ARB:** Architecture Review Board. The governing body responsible for architectural standards and approvals.
- **Baseline:** A locked, official configuration of documents representing a specific point in time or release.
- **SemVer:** Semantic Versioning. A versioning scheme conveying meaning about the underlying changes.

## 18. References
- Enterprise Architecture Governance Policy
- ADR Management Policy
- Architecture Versioning Standard
- Baseline Management Policy
- Enterprise Documentation Markdown Standards
