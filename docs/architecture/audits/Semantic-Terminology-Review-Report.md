# Semantic Terminology Review Report

## Executive Summary

This report provides a rigorous semantic review of non-compliant terminology identified across the MANARATAK 2.0 documentation. The objective is to determine the true architectural meaning of each term before any documentation updates are applied, ensuring absolute alignment with the newly adopted Enterprise Content Ownership Model.

---

## Terminology Semantic Analysis

### 1. Course CMS

| Attribute                        | Evaluation                                                                                                                                                                |
| :------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Document**                     | `docs/phases/phase-13-learning-platform/phase-13-01-architecture-specification.md`                                                                                                          |
| **Section**                      | Enterprise Course Management / Content Workflows                                                                                                                          |
| **Current Term**                 | Course CMS                                                                                                                                                                |
| **Architectural Classification** | Enterprise Platform / Business Domain                                                                                                                                     |
| **Meaning**                      | The bounded context responsible for managing educational assets, course metadata, and the learning content lifecycle.                                                     |
| **Compliant (YES/NO)**           | NO                                                                                                                                                                        |
| **Reason**                       | Architecturally Incorrect. The term "CMS" is strictly reserved for Editorial Content via the Enterprise CMS. The domain managing educational assets is a Business Domain. |
| **Recommended Action**           | Replace with official platform name.                                                                                                                                      |
| **Replacement**                  | Learning Platform                                                                                                                                                         |

### 2. Scholarship CMS

| Attribute                        | Evaluation                                                                                           |
| :------------------------------- | :--------------------------------------------------------------------------------------------------- |
| **Document**                     | `docs/phases/phase-12-scholarships/phase-12-01-enterprise-architecture-specification.md`                          |
| **Section**                      | Future Extraction                                                                                    |
| **Current Term**                 | Scholarship CMS                                                                                      |
| **Architectural Classification** | Enterprise Platform / Business Domain                                                                |
| **Meaning**                      | The bounded context responsible for managing scholarships, funding tiers, and application workflows. |
| **Compliant (YES/NO)**           | NO                                                                                                   |
| **Reason**                       | Architecturally Incorrect. Applies the restricted term "CMS" to a Business Domain.                   |
| **Recommended Action**           | Replace with official platform name.                                                                 |
| **Replacement**                  | Scholarships Platform                                                                                |

### 3. Headless CMS / Core CMS / Universal CMS

| Attribute                        | Evaluation                                                                                                                                |
| :------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------- |
| **Document**                     | Various (Phase 02 Specifications, ADR-001, Architecture Reviews)                                                                          |
| **Section**                      | Multiple                                                                                                                                  |
| **Current Term**                 | Headless CMS, Core CMS, Universal CMS                                                                                                     |
| **Architectural Classification** | Enterprise Platform / Bounded Context                                                                                                     |
| **Meaning**                      | The centralized platform responsible for editorial content governance, static pages, and site navigation.                                 |
| **Compliant (YES/NO)**           | NO                                                                                                                                        |
| **Reason**                       | Architecturally Ambiguous/Incorrect. The Enterprise Glossary mandates exactly one ubiquitous term for this platform to prevent confusion. |
| **Recommended Action**           | Consolidate under the official ubiquitous term.                                                                                           |
| **Replacement**                  | Enterprise CMS                                                                                                                            |

### 4. Learning Content Management

| Attribute                        | Evaluation                                                                                                                                                               |
| :------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Document**                     | `docs/phases/phase-13-learning-platform/phase-13-01-architecture-specification.md`                                                                                                         |
| **Section**                      | Learning Content Management                                                                                                                                              |
| **Current Term**                 | Learning Content Management                                                                                                                                              |
| **Architectural Classification** | Capability / Subsystem                                                                                                                                                   |
| **Meaning**                      | The internal capability within the Learning Platform responsible for orchestrating educational materials, SCORM packages, and curricula.                                 |
| **Compliant (YES/NO)**           | NO                                                                                                                                                                       |
| **Reason**                       | Architecturally Ambiguous. Using "Content Management" inside a business domain creates semantic overlap with the Enterprise CMS's responsibility over Editorial Content. |
| **Recommended Action**           | Rename internal capability to avoid the word "Content".                                                                                                                  |
| **Replacement**                  | Learning Asset Management                                                                                                                                                |

### 5. Content Engine

| Attribute                        | Evaluation                                                                                                             |
| :------------------------------- | :--------------------------------------------------------------------------------------------------------------------- |
| **Document**                     | `docs/governance/blueprint/MANARATAK-2.0-Master-Blueprint.md`                                                          |
| **Section**                      | Architecture Components                                                                                                |
| **Current Term**                 | Content Engine                                                                                                         |
| **Architectural Classification** | Generic Description                                                                                                    |
| **Meaning**                      | A descriptive phrase used colloquially to describe the dynamic schema and delivery capabilities of the Enterprise CMS. |
| **Compliant (YES/NO)**           | NO                                                                                                                     |
| **Reason**                       | Architecturally Ambiguous. Undermines the strict Ubiquitous Language defined in the Enterprise Glossary.               |
| **Recommended Action**           | Replace generic description with the official bounded context name.                                                    |
| **Replacement**                  | Enterprise CMS                                                                                                         |

### 6. Course Management

| Attribute                        | Evaluation                                                                                                                                                                 |
| :------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Document**                     | `docs/phases/phase-13-learning-platform/phase-13-01-architecture-specification.md`                                                                                                           |
| **Section**                      | Enterprise Course Management / Imported Course Management                                                                                                                  |
| **Current Term**                 | Course Management                                                                                                                                                          |
| **Architectural Classification** | Capability / Subsystem                                                                                                                                                     |
| **Meaning**                      | The specific capability of managing course structures, dependencies, and metadata lifecycles within the Learning Platform.                                                 |
| **Compliant (YES/NO)**           | YES                                                                                                                                                                        |
| **Reason**                       | Architecturally Correct. It accurately describes an internal business capability of the Learning Platform without violating domain ownership or ubiquitous language rules. |
| **Recommended Action**           | Leave unchanged.                                                                                                                                                           |
| **Replacement**                  | N/A                                                                                                                                                                        |

---

## Final Recommendations

### A. Safe Automatic Documentation Updates

_(Changes that can be safely applied without architectural review as they map 1:1 to official Enterprise Terminology.)_

- **Course CMS** → `Learning Platform`
- **Scholarship CMS** → `Scholarships Platform`
- **Headless CMS** → `Enterprise CMS`
- **Core CMS** → `Enterprise CMS`
- **Universal CMS** → `Enterprise CMS`

### B. Architecture Review Required

_(Terminology whose meaning depends on context and must be carefully reviewed during replacement to ensure sentences remain grammatically and architecturally sound.)_

- **Learning Content Management** → Manually update to `Learning Asset Management` or simply refer to the `Learning Platform` depending on sentence structure.
- **Content Engine** → Manually update to `Enterprise CMS` to ensure the surrounding description of the headless capabilities remains accurate.

### C. Leave Unchanged

_(Terminology that is already correct and should remain exactly as it is.)_

- **Course Management** (When referring to the capability of managing courses).
- **Administration** (When referring to business processes like test administration or financial aid administration).

---

## Architectural Impact Estimation

**No architectural impact.**

All proposed terminology changes are purely semantic and documentation-based. They align historical documents with the current, approved Enterprise Content Ownership Model.

- **Domain Boundaries:** Remain unchanged.
- **Bounded Contexts:** Remain unchanged.
- **Contracts & APIs:** Remain unchanged.
- **Repositories & Schemas:** Remain unchanged.
- **Events:** Remain unchanged.

---

## FINAL VERDICT

**READY FOR DOCUMENTATION ALIGNMENT**

**Reasoning:**
The semantic review confirms that all non-compliant terms identified in the previous audit are historical artifacts of evolving ubiquitous language, rather than fundamental architectural flaws. The replacement mappings strictly enforce the Enterprise Content Ownership Model without altering any underlying business logic, boundaries, or implementation details. The documentation is now ready for a controlled alignment pass before officially kicking off Phase 16.
