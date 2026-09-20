# MANARATAK 2.0: Phase 2 ARB Compliance Report

## Comprehensive ARB Architecture & Compliance Review Report (Phase 1 & Phase 2)

### 1. Document Information

| Attribute        | Value                                                                            |
| :--------------- | :------------------------------------------------------------------------------- |
| Document Title   | Comprehensive ARB Architecture & Compliance Review Report — Phase 1 & 2 Baseline |
| Document Version | v1.0.0                                                                           |
| Document Status  | Baselined & Sealed                                                               |
| Review Body      | Architecture Review Board (ARB)                                                  |
| ARB Chair        | Chief Enterprise Architect / ARB Chairperson                                     |
| Date of Review   | July 16, 2026                                                                    |

---

### 2. Executive Summary

This report presents the official **Comprehensive Architecture and Compliance Review** executed by the Architecture Review Board (ARB) for the MANARATAK 2.0 platform. The audit covers all governing principles, domain structures, logical and physical database schemas, API contracts, and supporting systems established across **Phase 1 (System Vision & Requirements Alignment)** and **Phase 2 (Detailed Enterprise Solution Design)**.

The primary objective is to verify that the system design exhibits absolute consistency, enforces complete domain sovereignty, mitigates over-engineering risks, and guarantees relational and operational integrity before physical development commences in Phase 3.

---

### 3. Comprehensive Compliance Review & Audit

#### 3.1 Architectural Consistency Analysis (تحليل الاتساق المعماري)

The ARB conducted a rigorous multi-directional audit to detect discrepancies between the High-Level Governing Principles (Phase 1) and the Concrete Technical Deliverables (Phase 2):

- **The Vision vs. Payload Symmetry**: Phase 1 demands strict bilingual compliance. The review confirms that every JSON schema in the _REST API Contracts (v2.13)_ and _Canonical Data Model (v2.7)_ strictly embeds symmetrical parallel structures (e.g., `text_ar` and `text_en`). No single-language properties exist in the public-facing endpoints.
> **W15 source-truth reconciliation — 2026-08-26:** The July 16, 2026 ARB sign-off is retained as a historical architecture milestone. Its pre-implementation Transactional Outbox status is superseded by current repository evidence. Source implementation is now present; live database application, transaction/atomicity behavior, dispatcher recovery, and operational correctness remain `PENDING_GOOGLE_STUDIO`.

- **Transactional Outbox Consistency**: Phase 1 mandates decoupled service interactions and Phase 2 defines the required Transactional Outbox design. The current source baseline now contains `TransactionalOutboxRecord`, migration `20260813000000_add_transactional_outbox`, `PrismaTransactionalOutboxStore`, `PrismaAtomicPersistenceUnitOfWork`, `AtomicAuditedOutboxMutationExecutor`, `TransactionalOutboxDispatcher`, and active API DI wiring. Current classification is `SOURCE_IMPLEMENTED / LIVE_DB_TRANSACTION_AND_RECOVERY_PROOF_PENDING_GOOGLE_STUDIO`; repository source alone does not prove live migration/application, same-transaction behavior against the real database, dispatcher recovery, or production readiness.
- **Identity and Role Alignment**: The RBAC scopes specified in _Identity Security (v2.15)_ map 1:1 to the security filters and gateway routing layers defined in _API Architecture Design (v2.12)_.

##### Analysis & Recommendations Matrix:

| Checked Aspect            | Current State (الوضع الحالي)                                                        | Compliance Level (مدى الامتثال) | Final ARB Recommendation (التوصية المعمارية النهائية)                        |
| :------------------------ | :---------------------------------------------------------------------------------- | :-----------------------------: | :--------------------------------------------------------------------------- |
| **Bilingual Symmetries**  | Symmetrical English/Arabic data properties present on all core models.              |       **100% compliant**        | Approved. Block deployment of any model schema missing bilingual structures. |
| **Domain Communication**  | Transactional outbox persistence/migration, store/dispatcher, atomic integration paths, and API wiring exist in source; live DB/runtime proof remains pending. | **SOURCE_IMPLEMENTED / RUNTIME_PROOF_REQUIRED** | Preserve the source implementation and close live DB/atomicity/recovery only after Google Studio evidence. |
| **Access Control Claims** | RBAC claims (`ROLE_STUDENT`, `ROLE_COORDINATOR`, etc.) verified at the API Gateway. |       **100% compliant**        | Approved. Gateway must validate token signatures before routing traffic.     |

---

#### 3.2 Canonical Reference Ownership & Relational Integrity (W0 supersession)

> **Supersession notice — 2026-08-25:** The historical “Phase 4 Lookups / no physical FK / string-only reference” doctrine in the original sealed report is **superseded**. Roadmap v6.0 assigns the capability to **Phase 7 — Global Reference Data**, and the current approved persistence model is a canonical relational model inside the Modular Monolith.

The active rule is:

- **Reference ownership remains centralized in Phase 7**. Business domains must not fork or redefine canonical countries, currencies, languages, academic taxonomy keys, or equivalent reference identities.
- **Canonical relational foreign keys are allowed and preferred** when two records are persisted in the same relational persistence boundary and the relationship is part of the canonical model.
- **String/code snapshots may exist only as compatibility, import lineage, denormalized read data, or external-provider identifiers**. They must not outrank canonical IDs or become a second source of truth.
- **Cross-database isolation is not a current deployment requirement.** If a bounded context is physically extracted in the future, cross-service references must be re-evaluated through an ADR/migration plan rather than pre-emptively weakening today’s relational integrity.
- **No polymorphic loose joins** remains an active rule; explicit indexed relations are preferred where the target type is known.

##### Current ARB Decision Matrix

| Checked Aspect | Current Active Rule | Compliance Intent | ARB Decision |
| :-- | :-- | :--: | :-- |
| **Reference ownership** | Phase 7 owns canonical reference identities. | **Required** | No domain-local competing SSoT. |
| **Relational integrity** | Use explicit canonical FKs inside the current shared relational persistence boundary. | **Required** | Preserve database-enforced integrity where applicable. |
| **Compatibility strings** | External/provider codes may be stored only as secondary metadata/lineage. | **Conditional** | Never replace canonical IDs. |
| **Future service extraction** | Revisit relation transport only when a bounded context is physically extracted. | **Future ADR** | Do not design today as if separate databases already exist. |


#### 3.3 Over-Engineering Detection (كشف فخاخ التضخم المعماري)

Early architectural planning is prone to over-engineering, which introduces code rot and increases maintenance overhead. The ARB reviewed CMS Articles, Student Portfolios, and Application states to purge complex subsystems:

- **Elimination of Advanced Document Versioning**: Initial drafts of the CMS architecture proposed Git-like incremental text versioning engines. The ARB rejected this as an over-engineered pattern. The CMS structure now uses a simple, lean `RevisionHistory` log storing atomic snapshots, maintaining a minimal storage footprint.
- **Simplification of the Workflow Engine**: The _Workflow Foundation (v2.16)_ was audited to ensure it does not include heavy distributed BPEL/BPMN engines. Instead, the platform implements a lightweight, deterministic **State Machine Pattern** executed in-memory at the domain level.
- **Prevention of Code Duplication (Post-Roadmap cleanup activity)**: The ARB has verified that data processing, validation, and de-duplication rules are centralized within the _Import Pipeline Context_ Anti-Corruption Layer, ensuring zero duplicate parser code exists across core repositories.

##### Analysis & Recommendations Matrix:

| Checked Aspect          | Current State (الوضع الحالي)                                      | Compliance Level (مدى الامتثال) | Final ARB Recommendation (التوصية المعمارية النهائية)                                |
| :---------------------- | :---------------------------------------------------------------- | :-----------------------------: | :----------------------------------------------------------------------------------- |
| **CMS Versioning**      | Simple linear revision log replacing multi-branch diff engines.   |       **100% compliant**        | Approved. Keep CMS history linear; reject branching models.                          |
| **Workflow Complexity** | In-memory State Machine replacing heavyweight BPMN middleware.    |       **100% compliant**        | Approved. Limit state transitions to deterministic domain-level rules.               |
| **Parser Logic**        | Normalized validation logic centralized in the ACL Import engine. |       **100% compliant**        | Approved. Prevent developers from implementing custom parser logic in core contexts. |

---

#### 3.4 Explicit Integrity Check (فحص تكامل العلاقات الصريحة)

In the _Scholarship Application Bounded Context_, representing applications dynamically across different pathways can lead to polymorphic relational tables, which are fragile and difficult to index or audit:

- **Prohibition of Polymorphic Joins**: The ARB has strictly banned loose, polymorphic schema designs (e.g., tables using arbitrary `target_type` and `target_id` strings to resolve associations).
- **Mandatory Nullable Explicit Foreign Keys**: In Prisma and physical database models, relations must be expressed as **Explicit, Symmetrical, Nullable Foreign Keys**.
- **Prisma Schema Representation**: For instance, an `Application` entity maps connections to specific potential targets through clear, independent relational fields (e.g., `scholarship_id` referencing `Scholarship` and `pathway_id` referencing `Pathway`). These keys are explicitly indexed, nullable, and fully auditable by relational planners.

##### Analysis & Recommendations Matrix:

| Checked Aspect           | Current State (الوضع الحالي)                                      | Compliance Level (مدى الامتثال) | Final ARB Recommendation (التوصية المعمارية النهائية)                            |
| :----------------------- | :---------------------------------------------------------------- | :-----------------------------: | :------------------------------------------------------------------------------- |
| **Relational Integrity** | Explicit, nullable FK fields replacing loose polymorphic strings. |       **100% compliant**        | Approved. Enforce strict database indexes on all nullable explicit foreign keys. |
| **Auditability**         | Direct relational joins easily mapped by SQL optimizer planners.  |       **100% compliant**        | Approved. Relational queries must remain direct and index-compliant.             |

---

### 4. Official ARB Decision

The Architecture Review Board, having thoroughly verified and audited all Phase 1 and Phase 2 specifications against strict structural, operational, and architectural standards:

- Declares the **MANARATAK 2.0 Architectural Baseline complete, consistent, and secure**.
- Approves the immediate transition to **Phase 03 — Enterprise Design** (located at `docs/phases/phase-03-enterprise-design/`).
- Declares Phase 2 officially closed and sealed.

---

---

## ARB Solution Sign-off Matrix

| ARB Reviewer                    | Official Department               | Approval Action       | Date          |
| :------------------------------ | :-------------------------------- | :-------------------- | :------------ |
| **Chief Enterprise Architect**  | Architecture Review Board (ARB)   | **APPROVED & SEALED** | July 16, 2026 |
| **Lead Security Architect**     | Information Security & Compliance | **APPROVED & SEALED** | July 16, 2026 |
| **Director of Data Governance** | Ministry Integration Office       | **APPROVED & SEALED** | July 16, 2026 |
