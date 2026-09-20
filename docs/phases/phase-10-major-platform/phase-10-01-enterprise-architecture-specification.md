> **Note:** This phase references the [Enterprise Shared Contracts Specification](../../architecture/shared-contracts/03-enterprise-shared-contracts-specification.md) as the canonical architectural source for shared foundation contracts.

# MANARATAK 2.0: Phase 10 Major Platform Enterprise Domain

> **Note:** This phase references the [Enterprise Lifecycle Framework Specification](../../architecture/lifecycle-framework/03-enterprise-lifecycle-framework-specification.md) as the canonical architectural source for all state, status, and lifecycle governance.

### Executive Summary

A concise architectural overview explaining:

- **Why this phase exists:** Provides the foundational capabilities required for this domain within the MANARATAK ecosystem.
- **What enterprise capability it introduces:** Establishes the core enterprise contracts, services, and integration boundaries for this specific platform.
- **How it fits into the overall architecture:** Acts as a strictly decoupled domain platform that consumes upstream foundations and provides standardized contracts to downstream consumers without violating ownership boundaries.

## Part A — Enterprise Architecture Specification

### 10.0 Mission

**Vision**
Establish the Major Platform as the official enterprise-wide academic reference responsible for governing, standardizing, classifying, and maintaining all academic majors across the MANARATAK ecosystem.

**Mission**
The platform serves as the Single Source of Truth (SSoT) for academic majors and provides a unified canonical model consumed through approved contracts by downstream domains such as Universities & Institutions (Phase 11), Scholarships (Phase 12), Learning (Phase 13), Student Workspace read models (Phase 15), Enterprise AI/Student Tools (Phases 17–18), and Public composition (Phase 24). Consumer relationships do not transfer Major ownership away from Phase 10.

**Enterprise Responsibilities**
The Major Platform Enterprise Domain SHALL govern the definitive single source of truth for all major definitions and hierarchical structures. It SHALL own a unified domain model to align consistent representation and enterprise-wide structural integrity without leaking implementation or operational logic.

### 10.1 Scope

**Purpose**
To define the explicit boundaries and architectural capabilities of the Major Platform.

**Enterprise Responsibilities**
The Major Platform is architecturally responsible for:

- Canonical Academic Major Management
- Academic Major Taxonomy
- Academic Classification Standards
- Major Hierarchy Management
- Major Relationship Management
- Major Resolution & Canonicalization
- Cross-Standard Mapping
- Academic Reference Integration

### 10.2 Out of Scope

**Purpose**
To protect the domain boundaries by explicitly identifying capabilities that belong to other enterprise domains.

**Excluded Responsibilities**
The Major Platform DOES NOT manage:

- Universities (Phase 11) and natively managed Organization entities
- Scholarships and Student Profiles
- Course Content and Learning Management
- Admission Decisions and Academic Applications
- Employment Services

**Major vs. Academic Program Boundary (Strict Architectural Constraint)**
The architecture enforces a strict boundary between an Academic Major and an Academic Program. The Major Platform manages pure academic disciplines (e.g., "Computer Science", "Electrical Engineering"). Specific degree offerings provided by institutions (e.g., "Bachelor of Computer Science at University X") are Academic Programs. Academic Programs are explicitly OUT OF SCOPE for this platform and remain under the exclusive ownership of the Phase 11 (Universities & Institutions).

### 10.3 Architectural Principles

**Purpose**
To define the non-negotiable architectural axioms governing the design of the enterprise domain.

**Architectural Rules**

- **Single Source of Truth (SSoT)**: The platform must remain independent from implementation technologies while providing a stable academic reference model.
- **Domain-Driven Design & Clean Architecture**: Strict separation of concerns and canonical data modeling.
- **Zero Upward Dependency**: The enterprise domain SHALL NOT own knowledge of future downstream domains.
- **Mandatory Event-Driven Execution**: Domain state changes MUST explicitly persist enterprise events to the Enterprise Transactional Outbox. Application layer publishing (IPublisher) is strictly prohibited. Silent architectural mutations are strictly prohibited to ensure Search and Cache consistency.
- **Version-First Evolution**: All structural changes must preserve backward compatibility.

### 10.4 Governance Rules

- **Governance Model:** Centralized architectural oversight via the Architecture Review Board (ARB).
- **Architectural Policies:** Strict adherence to Domain-Driven Design (DDD), Clean Architecture, and Single Responsibility Principle (SRP).
- **Lifecycle Rules:** All state transitions must be governed by the Enterprise Lifecycle Framework.
- **Decision Authority:** The ARB holds final authority over all structural, integration, and contract modifications.
- **Change Management:** All modifications must follow the official RFC (Request for Comments) and pull request approval process.
- **ADR Governance:** Every significant architectural decision must be documented as an Architecture Decision Record (ADR) and linked to this specification.
- **Operational Constraints:** The platform must meet all enterprise SLAs for availability, performance, and security.

### 10.5 Dependency Rules

- **Zero Upward Dependency:** This phase SHALL NOT depend on any downstream platform or domain that relies upon it.
- **Enterprise Foundations:** May consume services from the Core Foundation (e.g., logging, caching, messaging).
- **Enterprise Shared Contracts:** MUST implement and consume contracts defined in the Enterprise Shared Contracts Specification.
- **Enterprise Platforms:** May consume specific upstream Enterprise Platforms only as explicitly approved by the ARB.
- **Enterprise Standards:** MUST comply with all internal enterprise coding, security, and data standards.
- **Approved External Standards:** MUST adhere to recognized international standards (e.g., ISO, UN) where applicable.

### 10.6 Major Standards Management

**Purpose**
To govern the standards associated with academic majors.

**Architectural Rules**

- The platform shall support multiple academic standards simultaneously (e.g., ISCED, CIP, National/Regional Academic Standards).
- **Standard vs. Provider Clarity Rule**: The architecture MUST explicitly separate the Major Standard (the intellectual owner/creator of the curriculum criteria) from the Major Provider (the specific institution executing the program).
- Standards shall coexist through versioned mappings rather than replacement.

### 10.7 Major Taxonomy Foundation

**Purpose**
To govern the relationship between canonical majors and the enterprise academic taxonomy.

**Architectural Rules**

- **Taxonomy Delegation Rule**: The Phase 10 enterprise domain SHALL NOT own or define academic fields, disciplines, sub-disciplines, or specializations. It MUST reference these structures exclusively from the Phase 08 Academic Taxonomy enterprise domain.
- **Hierarchy Adherence Rule**: Phase 10 SHALL NOT create redundant hierarchy engines or closure-table logic. Where major-specific groupings are required, it MUST consume capabilities from the Phase 07.13 Generic Hierarchy & DAG Foundation.

### 10.8 Major Classification & Degree Level

**Purpose**
To classify majors using standardized academic rules and align them with degree levels.

**Architectural Rules**

- **Degree Level Consumption Rule**: Degree levels (e.g., Bachelor, Master, PhD) are fundamental academic classifications and MUST be consumed directly from the Phase 08 Academic Taxonomy enterprise domain. Phase 10 SHALL NOT natively own or define degree levels.
- **Major-Specific Classification**: Phase 10 shall classify majors with orthogonal tags (e.g., STEM, Humanities) as independent metadata mapped to canonical majors, without enforcing strict parent-child constraints.

### 10.9 Major Entities Management

**Purpose**
To define the core domain entities and their architectural purpose, strictly enforcing the separation between Identity Entities and Value Objects.

**Architectural Rules**

**Canonical Naming Policy**: To ensure semantic clarity, the platform enforces a strict naming policy:

- **Canonical Name**: The immutable, enterprise-approved global standard name.
- **Preferred Display Name**: The contextual, UI-friendly representation.
- **Localized Names**: Translations linked to the canonical identity via Phase 5.
- **Aliases**: Approved alternative institutional nomenclatures.
- **Synonyms**: Search-friendly semantic equivalents for resolution engines.

**Entity vs. VO Strictness**:

- Major Entity and Major Version Entity are Canonical Identity Entities.
- Study Duration MUST be implemented purely as a Value Object without an independent reference identity.
- Delivery Format is a local canonical entity owned exclusively by Phase 10.

### 10.10 Major Relationship Architecture

**Purpose**
To govern the associations between different major entities.

**Architectural Rules**

- The platform shall model internal relationships (Parent Of, Child Of, Specialization Of, Equivalent To, Prerequisite For).
- **Downward-Only Ownership Rule**: External domains linking to Majors (e.g., Universities offering a Major) MUST own that relationship in their respective domains. Phase 10 does not govern upward links.

### 10.11 Major Resolution Foundation

**Purpose**
To govern robust canonical identification for major entities across the enterprise.

**Architectural Rules**

- The platform shall provide enterprise-level Alias and Synonym Resolution. Every external representation, duplicate detection, or cross-language semantic match MUST resolve to a single canonical academic major.

### 10.12 Cross-Major Mapping

**Purpose**
To govern equivalencies and mapping across disparate standards (Standards, Educational Systems, Countries).

**Architectural Rules**

- All cross-major equivalencies MUST be explicitly versioned and preserve traceability.
- **Status Consistency Rule**: Mapping governance MUST strictly use the standardized enterprise states: Pending, Verified, and Deprecated.

### 10.13 Phase 10 Major Import Specification

**Purpose**
To define the explicit import and ownership boundary for the Major Platform, mapping strictly against the enterprise architecture.

**Enterprise Responsibilities**
Phase 10 MUST definitively own and import all canonical major-related data while strictly delegating shared foundational data and taxonomy structures to upstream platforms.

**Import Ownership Boundary**
- **Phase 06 — Import Foundation** owns only generic import mechanics: source ingestion, file parsing, connectors, batching, row-level error handling, failed-row queues, audit logs, retry execution, and import history.
- **Phase 10 — Major Platform** owns canonical major identity, major names, aliases, synonyms, equivalency mappings, major-specific metadata, deduplication, enrichment, completeness rules, and publish readiness.
- **Phase 08 — Academic Taxonomy** owns academic fields, disciplines, taxonomy classifications, degree levels, and academic hierarchy.
- **Phase 11 — Universities & Institutions** owns university programs and program availability. Phase 10 may link to program read-models, but must not own university program records.
- **Phase 12 — Scholarships** owns scholarship-major relationships, eligibility, deadlines, and funding rules.
- **Phase 13 — Learning Platform** owns courses and learning paths connected to majors.
- **Phase 21 — Enterprise Career & Alumni Platform** owns career paths, job roles, skill demand, alumni outcomes, internships, and recruitment data.

**Trusted Source Policy**
Imported major data should come from official or trusted academic sources, including:
- ISCED / UNESCO classifications,
- CIP or comparable official classification datasets when used,
- official university academic program pages,
- official faculty/college pages,
- official department pages,
- verified education authority datasets,
- trusted academic catalog datasets only when official data is unavailable.

**Mandatory Fields**
Every imported major record must include:
- `canonicalMajorName`
- `academicFieldOrDiscipline`
- `degreeLevel`
- `sourceClassificationSystem`
- `officialSourceUrl`

**Optional Fields**
Support optional enrichment fields including:
- `localizedNames`
- `aliases`
- `synonyms`
- `relatedSpecializations`
- `equivalentMajorCodes`
- `facultyOrCollege`
- `department`
- `typicalStudyDuration`
- `studyLanguage`
- `coreSubjects`
- `skillsGained`
- `commonAdmissionRequirements`
- `relatedMajors`
- `sourceTrustLevel`
- `lastVerifiedAt`

**Canonical Identity and Deduplication**
- Normalize major names by removing marketing noise, duplicate spacing, punctuation clutter, emojis, source platform suffixes, and non-academic decorations.
- Do not remove meaningful academic words from the major name.
- Detect root-Major duplicates using the stable concept key: normalized `canonicalMajorName + academicFieldOrDiscipline + cross-listing context`. Degree level and source classification system belong to `MajorLevelProfile`/source provenance and must not split the canonical root identity. Existing keys require read-only collision analysis before any identity migration.
- If the same major is imported from another source, do not create a duplicate record.
- Merge only missing optional fields into the existing record.
- Prefer official classification and university source data over aggregator data.
- Never silently overwrite admin-reviewed, manually corrected, `ReadyToPublish`, or `Published` fields.

**Editorial / AI Content Policy**
- Explanatory content such as "major overview", "who this major suits", "what the student will study", "skills gained", and "career guidance narrative" must not be blindly imported from random websites.
- **Phase 17 — Enterprise AI Platform** may generate draft descriptions or summaries from trusted structured inputs (advisory drafts only, never direct published content).
- **Phase 16 — Enterprise CMS** must own review, editing, approval, and publication of long-form explanatory content.
- Phase 10 may store structured metadata needed for major identity and classification, but not final editorial articles.
- **Phase 24 — Enterprise Public Platform** may display approved content only.

**Admin Import Lifecycle States**
The major import lifecycle must support the following states:
- `Imported`
- `Incomplete`
- `Complete`
- `NeedsReview`
- `ReadyToPublish`
- `Published`
- `Rejected`
- `Archived`

**Major Detail Page Relationship**
- Phase 10 supplies structured major read-models used by Phase 24 Major Detail Pages.
- Full public page composition remains in: `docs/phases/phase-24-enterprise-public-platform/phase-24-04-public-page-detail-requirements-backlog.md`.

## Enterprise Integration

This section shall describe how this platform exposes its capabilities and interacts with the broader enterprise.

- **Integration Model:** Defines the communication paradigms (e.g., synchronous APIs, asynchronous messaging).
- **Published Contracts:** The official interfaces, DTOs, and APIs exposed to consumers.
- **Consumed Contracts:** The official interfaces and APIs this phase consumes from upstream platforms.
- **Events:** The domain and integration events published to the Enterprise Event Bus.
- **Read Models:** The optimized data structures provided for high-performance querying (CQRS).
- **Enterprise Communication Rules:** Guidelines for reliable, resilient, and secure communication.

### Architecture Constraints

- **No Business Logic (if applicable):** Must not contain tenant-specific business rules unless explicitly defined as a business domain.
- **No Ownership Violations:** Strict adherence to aggregate roots; entities must not bypass defined boundaries.
- **No Circular Dependencies:** Circular references between modules or phases are strictly prohibited.
- **No Direct Database Access:** All data access must occur through defined domain repositories.
- **No Upward Dependencies:** The platform must remain ignorant of downstream consumers.
- **Technology Neutrality:** Domain contracts must remain agnostic to underlying physical technologies.
- **ADR Compliance:** All deviations must be documented and approved via Architecture Decision Records.

### Explicit A/B/C Traceability Check

- **Part A to Part B:** Every architectural entity defined in Part A MUST be represented by a strict TypeScript interface in Part B.
- **Part B to Part C:** Every TypeScript interface in Part B MUST have a corresponding Prisma schema model and CQRS implementation in Part C.
- **Part C Boundary Validation:** Part C MUST NOT introduce any entities (e.g., university programs, admissions, student profiles) that are absent from Part A and Part B. All implementations in Part C MUST strictly map to Part B contracts.

### Acceptance Criteria

- All architecture constraints are met.
- Domain boundaries are strictly enforced.

### Deliverables

- Architecture Specification (Part A)
- Domain Contracts (Part B)
- Implementation Guide (Part C)

### Architecture Review Checklist

- [x] Requirements met?
- [x] Dependencies validated?
- [x] Security reviewed?
- [x] Performance criteria defined?

### ARB Decision

- **Status:** BASELINED / SOURCE_COMPLETE — RUNTIME_EVIDENCE_PENDING
- **Date:** 2026-07-24
- **Approver:** Enterprise ARB

### Status

- **Current Status:** BASELINED / SOURCE_COMPLETE — RUNTIME_EVIDENCE_PENDING

---

### Navigation

- **Previous**: [Phase 09 — Tests Platform](../phase-09-tests-platform/phase-09-01-enterprise-architecture-specification.md)
- **Next**: [Phase 10 — Domain Contracts](phase-10-02-domain-contracts.md)

## 10.14 Cross-Phase Alignment: Phase 08 Academic Taxonomy

**Separation and Dependency:**
- **Dependency:** Phase 10 Academic Majors **must reference** Phase 08 taxonomy nodes. Major records may link directly to `AcademicTaxonomyNode` IDs to classify the major within a structured discipline or field.
- **No Redefinition:** Phase 10 **must not** redefine ISCED, CIP, or general academic taxonomy structures.
- **Phase 10 Exclusives:** The Major Platform exclusively owns canonical major identity plus structured major-specific enrichments/read models. Phase 08 owns taxonomy and DegreeLevel. Phase 24 owns full public page composition/rendering; it consumes approved Phase 10 read models and does not re-own Major truth.
> **Current remediation status (2026-08-12): `SOURCE_IMPLEMENTED_RUNTIME_PENDING`.**
> This document records a historical architecture baseline. Operational, database, migration, build, and runtime claims are superseded by `docs/remediation/wp8/WP8_GOOGLE_STUDIO_CLOSURE_MASTER_REGISTER.md`; they are not evidence of Production readiness.
