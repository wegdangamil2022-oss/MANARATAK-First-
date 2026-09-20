# MANARATAK 2.0: Enterprise Architecture Glossary

## 1. Purpose

The Enterprise Architecture Glossary establishes the official, unified vocabulary for the MANARATAK 2.0 platform. Its purpose is to ensure that all stakeholders—architects, developers, product owners, and governance bodies—use the exact same terminology when discussing, designing, and documenting the system. This eliminates ambiguity, accelerates onboarding, ensures documentation quality, and provides a strict semantic foundation for the enterprise architecture.

## 2. Scope

This glossary covers the mandatory terminology for the approved MANARATAK 2.0 architecture, including at minimum:

*   **Enterprise Architecture Terms:** Global concepts, layers, and structural definitions.
*   **Domain-Driven Design (DDD) Terms:** Bounded contexts, aggregates, entities, and events.
*   **Platform Terms:** Shared enterprise capabilities and foundation components.
*   **Import Platform Terms:** Terminology specific to data ingestion and transformation.
*   **CMS Terms:** Terminology specific to content management and localization.
*   **Search Terms:** Terminology for enterprise search, indexing, and querying.
*   **AI Terms:** Terminology for artificial intelligence, models, and embeddings.
*   **Workflow Terms:** Terminology for orchestration and state machines.
*   **Notification Terms:** Terminology for enterprise messaging and alerts.
*   **Security Terms:** Terminology for identity, authorization, and audit.
*   **DevOps Terms:** Terminology for deployment, CI/CD, and environments.
*   **Documentation & Governance Terms:** Terminology for ADRs, ARB, and baselines.

**Excluded Terminology:**
*   Language-specific syntax (e.g., standard programming keywords).
*   Transient project codenames.
*   Unapproved experimental concepts not yet adopted into the architecture.

## 3. Glossary Principles

1.  **Single Source of Truth:** This document is the definitive source for all architectural terms.
2.  **One Term = One Meaning:** A term cannot have multiple overlapping definitions across different domains.
3.  **No Synonyms for Official Terms:** If a concept has an official term, synonyms are strictly forbidden in official documentation and code.
4.  **Consistency Across Documents:** All ADRs, architectural baselines, and code must use these exact terms.
5.  **Business and Technical Alignment:** Terms must bridge the gap between business capabilities and technical implementations (Ubiquitous Language).
6.  **Versioned Terminology:** Changes to definitions require versioned updates and formal governance approval.
7.  **Traceable Terminology:** Every term must trace back to an approved architectural domain, ADR, or baseline.

## 4. Official Glossary

| Term | Definition | Context | Related Domain | Related ADR / Baseline | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Phase 8 (Academic Taxonomy)** | The enterprise domain managing hierarchical educational classifications and metadata. | Domain | Academic Taxonomy | Phase 8 Baseline | Governs all educational taxonomy structures. |
| **Aggregate Root** | The entry point entity for a cluster of associated objects treated as a unit for data changes. | DDD | All Domains | Unified Project Baseline | Must enforce domain invariants. |
| **Architecture Decision Record (ADR)** | A formalized document that captures a single, significant architectural decision and its context. | Governance | Enterprise | Phase 3 Baseline | Immutable once approved. |
| **Architecture Review Board (ARB)** | The governing body responsible for reviewing, approving, and enforcing architectural standards. | Governance | Enterprise | Enterprise Baseline | Final authority on architecture. |
| **Bounded Context** | A semantic contextual boundary within which a specific domain model is defined and applicable. | DDD | Enterprise | Phase 2 Baseline | Enforces strict boundaries. |
| **Clean Architecture** | The architectural pattern separating enterprise logic from infrastructure, ensuring zero upward dependency. | Architecture | Enterprise | Phase 3 Baseline | Core architectural style for MANARATAK 2.0. |
| **Domain Event** | An asynchronous message capturing a business-relevant occurrence that happened within a domain. | DDD / Platform | Event Foundation | Phase 5.11 Baseline | Used for eventual consistency. |
| **Enterprise CMS** | The autonomous Bounded Context dedicated exclusively to Editorial Content Governance. It strictly owns editorial content (Articles, Pages, Navigation) and never owns Business Entities. | Domain | Enterprise CMS | Enterprise Content Ownership Model | Must not be confused with Business Domains. |
| **International Tests Domain** | The enterprise domain responsible for the lifecycle and processing of international test structures. | Domain | International Tests | Phase 9 Baseline | Adheres to strict compliance requirements. |
| **Media Platform** | The centralized authority for all binary assets and their derivatives across the enterprise. Owns images, videos, optimization, and media delivery. | Domain | Media Platform | Enterprise Content Ownership Model | Independent of the Enterprise CMS. |
| **Reference Data Platform** | The enterprise domain responsible for managing centralized, immutable lookup data and system enumerations. | Domain | Reference Data | Phase 7 Baseline | Single source of truth for reference data. |
| **Unified Project Baseline** | The single authoritative reference point containing all active and approved architecture documents. | Governance | Enterprise | Enterprise Baseline | Combines all Phase reports. |

## 5. Naming & Terminology Rules

*   **Preferred Terms:** Always use the exact term as defined in the Official Glossary.
*   **Deprecated Terms:** Terms marked as deprecated must be actively removed from active documentation and replaced with the Preferred Term.
*   **Forbidden Ambiguous Terms:** Terms such as *Manager*, *Helper*, *Processor*, or *Handler* are forbidden in architectural definitions unless strictly qualified with a specific domain boundary and design pattern (e.g., `ImportBatchProcessor`).
*   **Domain Naming Restrictions:** Business Domains are Enterprise Platforms (e.g., Learning Platform). They must never be named or referred to as a "CMS" (e.g., "Course CMS" is forbidden).
*   **Backoffice Usage:** The term "Backoffice" must only be used to describe an administrative user interface (the Presentation Layer). It must never be used as a synonym for a Business Domain, Enterprise Platform, or Bounded Context.
*   **Acronym Rules:** Acronyms must be fully expanded upon their first use in any document, followed by the acronym in parentheses. Example: *Architecture Review Board (ARB)*.
*   **Capitalization Rules:** Official Glossary terms must be capitalized when used in a formal architectural context (e.g., "The *Bounded Context* defines...").

## 6. Governance

*   **Ownership:** The Architecture Review Board (ARB) owns the Enterprise Architecture Glossary.
*   **Review Process:** New terms or modifications to existing terms must be submitted via a terminology proposal during standard ARB reviews.
*   **Approval Authority:** Only the ARB can approve additions, modifications, or deprecations to the glossary.
*   **Change Management:** Modifying a core architectural definition is considered a major change and requires a corresponding ADR to explain the shift in conceptual modeling.
*   **Exception Process:** Short-term use of experimental terms must be explicitly marked as `[DRAFT]` and cannot enter official baselines until formalized.

## 7. Traceability

Every term in the glossary must maintain strict traceability:

*   **Domains:** Domain-specific terms must link directly to their owning Bounded Context documentation.
*   **ADRs:** Terms originating from a specific architectural decision must cite the authorizing ADR.
*   **Architecture Baselines:** The introduction or deprecation of a term must be tracked in the release notes of the corresponding Architecture Baseline.
*   **Enterprise Baseline:** The glossary itself is a core component of the Unified Project Baseline.
*   **Architecture Portal:** The glossary must be published, versioned, and easily searchable within the enterprise Architecture Portal.

## 8. Official Glossary Template

All new terms must be submitted using the following standard template:

```yaml
Glossary_Term:
  Term: "String (The exact term)"
  Definition: "String (Clear, unambiguous definition)"
  Context: "String (e.g., DDD, Security, Governance)"
  Related_Domain: "String (Owning domain or 'Enterprise')"
  Related_ADR: "String (ADR ID, if applicable)"
  Related_Baseline: "String (Baseline where term was introduced)"
  Notes: "String (Additional usage constraints or historical context)"
  Status: "Active | Deprecated | Retired"
```

## 9. Compliance Checklist

Before an architectural document or domain design is approved by the ARB, it must pass the following terminology compliance checks:

- [ ] Every official term used in the document has exactly one definition matching the glossary.
- [ ] No conflicting definitions or overlapping synonyms exist in the document.
- [ ] Deprecated terms have been completely removed and replaced.
- [ ] Ambiguous terms (e.g., "Manager", "Helper") have been avoided or strictly qualified.
- [ ] Traceability to domains, ADRs, and baselines exists for newly introduced terms.
- [ ] Governance approval (ARB) has been secured for any additions to the glossary.
- [ ] Terminology is completely consistent with the Ubiquitous Language of the approved architecture.
