# Enterprise Architecture Governance Index

## 1. Purpose

The purpose of this document is to serve as the official navigation and governance index for the MANARATAK Enterprise Architecture. It establishes a clear mapping of architectural concerns to their respective authoritative documents, ensuring that developers, architects, and stakeholders can easily locate and refer to the correct single source of truth.

This index exists solely to improve governance, discoverability, consistency, and maintainability across all phases of the project.

---

## 2. Governance Principles

The MANARATAK Enterprise Architecture governance is guided by the following core principles:

- **Single Source of Truth (SSOT):** Every architecture policy, rule, contract, or design pattern must reside in exactly one authoritative location.
- **Cognitive Manageability:** Technical and domain logic are organized cleanly to prevent mental translation overhead and ensure ease of comprehension.
- **Architectural Discretion:** Implementation details are strictly separated from domain contracts and architectural definitions.
- **Change Traceability:** All structural decisions and alterations are formally recorded, leaving an immutable audit trail of the system's design evolution.

---

## 3. Enterprise Source of Truth Policy

To maintain the integrity of the enterprise architecture and prevent divergence or drift:

- **Strict Non-Duplication:** No architectural document may redefine, rephrase, or duplicate rules owned by another governance document. Doing so creates unnecessary redundancy and compliance risks.
- **Active Cross-Referencing:** Instead of copying sections, documents must link directly or cross-reference the authoritative document.
- **Conflict Resolution:** In the event of a conflict or discrepancy between two or more documents, the designated authoritative document (as identified in this Index) always prevails.

---

## 4. Official Architecture Documents

The table below defines the authoritative document for each key enterprise architecture concern.

| Document                                | Authoritative Scope / Purpose                                                                                                                         |
| :-------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Architecture Constitution**           | Enterprise architecture principles, standards, conventions, and governance frameworks.                                                                |
| **Roadmap v6.0**                        | Official phase numbering, sequencing, dependencies, and implementation roadmap.                                                                       |
| **Architecture Decision Records (ADR)** | Official record of design decisions, alternatives considered, justifications, and consequences.                                                       |
| **Architecture Review Reports**         | Architecture compliance reviews, gap analyses, and formal recommendations.                                                                            |
| **Enterprise Diagrams**                 | Official architecture diagrams representing domain boundaries and system relationships.                                                               |
| **Event Catalog**                       | Immutable definitions of canonical Enterprise Domain Events, producers, and consumers.                                                                |
| **API Registry**                        | Official contracts, routing rules, and public interfaces for cross-domain communication.                                                              |
| **Domain Ownership Matrix**             | Bounded context allocations and official domain ownership definitions.                                                                                |
| **Enterprise Content Ownership Model**  | Official ownership boundaries between Editorial Content, Business Data, and Media Assets.                                                             |
| **Dependency Graph**                    | Direct and transitive relationships/dependencies between enterprise services and packages.                                                            |
| **Architecture Review Checklist**       | Mandatory validation requirements and criteria to be satisfied prior to any implementation.                                                           |
| **Phase 16 Part A**                     | Official Enterprise CMS Architecture Blueprint. Approved and Frozen.                                                                                  |
| **C4 System Context Model**             | Level 1 architecture context model. (docs/architecture/models/C4-System-Context-Model-v1.0.md)                                                        |
| **C4 Container Model**                  | Level 2 container architecture model. (docs/architecture/models/C4-Container-Model-v1.0.md)                                                           |
| **Sequence Models**                     | Complex event flows and orchestration models. (docs/architecture/models/Enterprise-Sequence-Models-v1.0.md)                                           |
| **Threat Models**                       | STRIDE threat models for API Gateways and public boundaries. (docs/architecture/models/Enterprise-Threat-Models-STRIDE-v1.0.md)                       |
| **Contract Catalog**                    | Centralized repository of all enterprise interfaces and API boundaries. (docs/architecture/models/Enterprise-Contract-Catalog-v1.0.md)                |
| **Shared Contract Registry**            | Schema registry for validating cross-domain event payloads. (docs/architecture/models/Shared-Contract-Registry-v1.0.md)                               |
| **Version Compatibility Matrix**        | Matrix tracking systems supporting which versions of enterprise contracts. (docs/architecture/models/Enterprise-Version-Compatibility-Matrix-v1.0.md) |
| **Consumer-Producer Matrix**            | Matrix tracking producers and consumers of enterprise contracts. (docs/architecture/models/Enterprise-Consumer-Producer-Matrix-v1.0.md)               |
| **API Interface Standards**             | Standards for API naming, versioning, pagination, idempotency, and error handling. (docs/architecture/standards/std-api-001-interface-standards.md)   |
| **Operational Playbooks**               | Baseline SRE runbooks for MANARATAK 2.0 deployment and operations. (docs/architecture/standards/std-ops-002-operational-playbooks.md)                 |

---

## 5. Governance Authority Hierarchy

Whenever multiple governance or design documents reference or overlap on the same architectural concern, the precedence is determined by the Governance Authority Hierarchy.

| Priority | Governance Document                      | Authority                                                                |
| :------: | :--------------------------------------- | :----------------------------------------------------------------------- |
|    1     | Architecture Constitution                | Enterprise principles, standards, governance, architectural conventions  |
|    2     | Roadmap v6.0                             | Official phase numbering, sequencing, dependencies, implementation order |
|    3     | Architecture Decision Records (ADR)      | Approved architectural decisions and accepted exceptions                 |
|    4     | Domain Architecture Specifications       | Domain-specific architecture baselines and contracts                     |
|    5     | Enterprise Architecture Governance Index | Navigation and governance reference only                                 |

### Hierarchy Precedence Rules

- **No Overriding Authority:** The Enterprise Architecture Governance Index is NOT an authoritative architecture source.
- **No Replacement:** It never overrides any governance document, nor does it replace the Architecture Constitution, Roadmap v6.0, ADRs, Domain Architecture Specifications, or any enterprise contract.
- **Precedence Resolution:** If multiple documents appear to overlap, the document with the highest priority in the governance authority hierarchy always prevails.

---

## 6. Governance Rules

- **No Replacement:** This document is a directory and index. It does **NOT** replace, override, or supplement:
  - Architecture Constitution
  - Roadmap v6.0
  - Architecture Decision Records (ADRs)
  - Event Catalog
  - API Registry
  - Or any other enterprise governance, contract, or policy document.
- **Navigation Purpose:** It functions solely as a navigation aid to direct architects, developers, and engineers to the correct authoritative files.
- **Process Compliance:** Developers and architects must verify that their implementation designs correspond strictly to the authoritative sources referenced in this index.

---

## 7. Scope

- This document is an enterprise navigation and governance index only.
- It introduces no new architecture, design patterns, or technical standards.
- It modifies no existing architecture or blueprints.
- It changes no existing domain, package, or service ownership boundaries.
- It creates no new compliance rules.
- It exists solely to improve governance, discoverability, consistency, and maintainability of the architectural landscape.

---

## P13 Final Source Closure Reference — 2026-09-03

For the post-remediation source state, use `docs/remediation/p13/P13_FINAL_SOURCE_CLOSURE_REPORT_2026-09-03.md` together with the active Cross-Phase Relationship Closure Matrix v2.0.0. This index remains navigational only; Roadmap v6.0 retains architecture authority. Runtime/DB/E2E evidence remains separately pending.
