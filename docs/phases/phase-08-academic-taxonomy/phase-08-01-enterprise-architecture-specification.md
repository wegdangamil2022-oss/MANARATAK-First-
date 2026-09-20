> **Note:** This phase references the [Enterprise Shared Contracts Specification](../../architecture/shared-contracts/03-enterprise-shared-contracts-specification.md) as the canonical architectural source for shared foundation contracts.

# MANARATAK 2.0: Phase8 PartA Enterprise Architecture Specification

> **Note:** This phase references the [Enterprise Lifecycle Framework Specification](../../architecture/lifecycle-framework/03-enterprise-lifecycle-framework-specification.md) as the canonical architectural source for all state, status, and lifecycle governance.

### Executive Summary

A concise architectural overview explaining:

- **Why this phase exists:** Provides the foundational capabilities required for this domain within the MANARATAK ecosystem.
- **What enterprise capability it introduces:** Establishes the core enterprise contracts, services, and integration boundaries for this specific platform.
- **How it fits into the overall architecture:** Acts as a strictly decoupled domain platform that consumes upstream foundations and provides standardized contracts to downstream consumers without violating ownership boundaries.

## Part A — Enterprise Architecture Specification

### Final Baseline v1.1

## 8.0 Mission

Establish the definitive, enterprise-wide Single Source of Truth (SSoT) for all academic taxonomic data.
The Phase 8 (Academic Taxonomy) provides a unified, canonical, extensible, and highly available structure for representing academic fields, disciplines, programs, specializations, and educational classifications based strictly on internationally recognized academic standards.
The platform acts as the canonical academic classification layer consumed by all educational domains throughout the MANARATAK ecosystem.

## 8.1 Scope

The scope of Phase 8 includes:

- Modeling of academic fields, disciplines, programs, specializations, and academic categories.
- Hierarchical classification of academic taxonomy as a Polyhierarchy (DAG) based on internationally recognized academic standards.
- Resolution of synonymous, historical, localized, and external academic terms into canonical academic entities.
- Cross-standard mapping between international academic classification systems.
- Consumption of the Generic Hierarchy & DAG Foundation (Phase 7 §7.13).
- Management of Academic Taxonomy lifecycle events through the Lifecycle Foundation defined in Phase 7.

## 8.2 Out of Scope

The following are strictly outside the scope of Phase 8:

- Business Logic (Admissions, Enrollment, Academic Progression, Student Management, Academic Grading).
- Phase 12 (Scholarships).
- Phase 11 (Universities & Institutions).
- Learning Platform.
- Search Engine.
- Recommendation Engine.
- AI Components.
- Reference Data Foundation (Countries, Languages, Currencies, etc.).
- Generic Hierarchy Infrastructure.
- Occupation & Skills Taxonomy (out of scope for Phase 08 Academic Taxonomy).
- University Profiles and Campus Management.
- User Interface (UI).
- Frontend implementation.

## 8.3 Architectural Principles

Phase 8 follows the enterprise architectural principles:

- Single Source of Truth (SSoT).
- Foundation Reuse.
- Separation of Concerns.
- DRY (Don't Repeat Yourself).
- Zero Upward Dependency.
- Standards Before Entities.
- Architecture Before Implementation.

No foundational capability already implemented in previous phases may be reimplemented within Phase 8.

## 8.4 Governance Rules

- **Governance Model:** Centralized architectural oversight via the Architecture Review Board (ARB).
- **Architectural Policies:** Strict adherence to Domain-Driven Design (DDD), Clean Architecture, and Single Responsibility Principle (SRP).
- **Lifecycle Rules:** All state transitions must be governed by the Enterprise Lifecycle Framework.
- **Decision Authority:** The ARB holds final authority over all structural, integration, and contract modifications.
- **Change Management:** All modifications must follow the official RFC (Request for Comments) and pull request approval process.
- **ADR Governance:** Every significant architectural decision must be documented as an Architecture Decision Record (ADR) and linked to this specification.
- **Operational Constraints:** The platform must meet all enterprise SLAs for availability, performance, and security.

## 8.5 Dependency Rules

- **Zero Upward Dependency:** This phase SHALL NOT depend on any downstream platform or domain that relies upon it.
- **Enterprise Foundations:** May consume services from the Core Foundation (e.g., logging, caching, messaging).
- **Enterprise Shared Contracts:** MUST implement and consume contracts defined in the Enterprise Shared Contracts Specification.
- **Enterprise Platforms:** May consume specific upstream Enterprise Platforms only as explicitly approved by the ARB.
- **Enterprise Standards:** MUST comply with all internal enterprise coding, security, and data standards.
- **Approved External Standards:** MUST adhere to recognized international standards (e.g., ISO, UN) where applicable.

## 8.6 Academic Standards Platform

The Phase 8 (Academic Taxonomy) is standards-driven.
Initial supported standards include:

- UNESCO ISCED-F
- US CIP

The standards architecture shall remain extensible to support additional internationally recognized academic standards in future phases.
All academic taxonomy data shall originate from officially approved reference publications.
Custom academic classification systems are not permitted unless explicitly approved by the Architecture Review Board.

## 8.7 Academic Hierarchy Foundation

Phase 8 consumes the Generic Hierarchy & DAG Foundation defined in Phase 7 §7.13.
The Academic Taxonomy is represented as a Polyhierarchy (Directed Acyclic Graph).
Characteristics include:

- Multiple parent support.
- Primary Parent designation.
- Cycle prevention.
- Structural integrity validation.
- Hierarchical consistency verification.

Hierarchy depth SHALL be derived from the approved hierarchy foundation defined in Phase 7 and SHALL NOT be hardcoded within the Phase 8 (Academic Taxonomy).
Any orphaned academic node shall be detected by the enterprise integrity validation process and require administrative review before publication.

## 8.8 Academic Entities Platform

The Phase 8 (Academic Taxonomy) defines the canonical academic entities that represent internationally recognized educational classifications.
All academic taxonomy entities inherit the canonical reference capabilities provided by the Phase 7 Reference Foundation (§7.1).
Typical entities include:

- Academic Field
- Academic Discipline
- Academic Program
- Academic Specialization
- Academic Category

These entities collectively form the authoritative academic taxonomy consumed by all downstream educational platforms.

## 8.9 Academic Relationship Architecture

Phase 8 defines multiple categories of academic relationships, including:

- Hierarchical Relationships
- Semantic Relationships
- Equivalency Relationships
- Cross-Standard Mapping Relationships

Hierarchical relationships are modeled through the Generic Hierarchy Foundation.
Semantic and mapping relationships remain independent from the hierarchy.
Academic prerequisites are explicitly outside the scope of this phase.

## 8.10 Academic Resolution Foundation

Phase 8 extends the Reference Resolution Foundation defined in Phase 7 §7.3.
The platform resolves:

- Synonyms
- Historical terminology
- Legacy identifiers
- Localized names
- External academic references

into canonical Academic Taxonomy entities.
Resolution shall be deterministic, auditable, and fully traceable.

## 8.11 Cross Standard Mapping

Phase 8 provides the architectural capability for mapping academic entities across internationally recognized educational standards.
Initial mappings include:

- ISCED-F
- US CIP

The mapping architecture shall support future academic standards without requiring architectural redesign.

## 8.12 Academic Taxonomy Import Specification

**Goal:** Provide the authoritative domain specification for ingesting, mapping, validating, and seeding academic taxonomy datasets into the MANARATAK 2.0 platform.

### Architectural Boundary with Phase 06 & Phase 07

- **Phase 06 (Universal Import Platform):** Provides the generic execution framework (`Source`, `Provider`, `Configuration`, `Pipeline`, batching, worker queues, error tracking). Phase 06 possesses ZERO domain knowledge of academic taxonomy schemas.
- **Phase 07 (Enterprise Reference Data & Generic Hierarchy Foundation):** Owns shared reference data (countries, languages, currencies) and the `Generic Hierarchy & DAG Foundation` (§7.13). Phase 07 manages closure table graph mechanics, polyhierarchy path traversal, and cycle detection logic.
- **Phase 08 (Academic Taxonomy):** Owns all domain-specific academic taxonomy schemas, field definitions, transformation rules, academic validation rules (ISCED/CIP compliance, taxonomy cycle checks), and import acceptance criteria. Phase 08 consumes Phase 06 pipeline abstractions and Phase 07.13 DAG graph mechanisms to execute bulk taxonomy ingestion.

### Scope of Imported Academic Taxonomy Datasets

Phase 08 defines explicit import schemas and validation rules for the following 9 canonical academic taxonomy datasets:

1. **Academic Fields:**
   - _Fields & Standards:_ Canonical public ID, standard code identifier (e.g., ISCED Broad Field `06`), canonical English name, native name, localized names dictionary, lifecycle state.
   - _Validation Rules:_ Must comply with standard formatting rules of declared Academic Standard; unique code within standard authority.

2. **Academic Disciplines:**
   - _Fields & Standards:_ Parent Broad Field public ID, standard code identifier (e.g., ISCED Narrow Field `061`), canonical English name, localized names dictionary.
   - _Validation Rules:_ Parent Academic Field must exist in valid state; code format compliance.

3. **Academic Programs:**
   - _Fields & Standards:_ Parent Discipline public ID, standard code identifier (e.g., ISCED Detailed Field `0612`), canonical English name, localized names dictionary.
   - _Validation Rules:_ Parent Academic Discipline must exist in valid state.

4. **Academic Specializations:**
   - _Fields & Standards:_ Parent Program public ID, specialization code identifier, canonical English name, localized names dictionary.
   - _Validation Rules:_ Parent Academic Program must exist; deepest studied domain node.

5. **Academic Categories:**
   - _Fields & Standards:_ Standard authority name, category key, display name, description, localized names dictionary.
   - _Validation Rules:_ Generic bucket categorization validation.

6. **International Academic Standards:**
   - _Fields & Standards:_ Standard type (e.g., `ISCED-F`, `CIP`), issuing authority (e.g., UNESCO, NCES), version string, publication date, default locale.
   - _Validation Rules:_ Unique combination of Standard Type + Version.

7. **Cross-Standard Mappings:**
   - _Fields & Standards:_ Source standard public ID, source academic entity public ID, target standard public ID, target academic entity public ID, equivalency level (`ExactMatch` | `BroadMatch` | `NarrowMatch` | `RelatedMatch`), weight.
   - _Validation Rules:_ Source and target entities must resolve to valid active nodes; source standard and target standard must differ.

8. **Synonyms, Aliases & Localized Terms:**
   - _Fields & Standards:_ Target academic entity public ID, term string, locale string, term type (`Synonym` | `Historical` | `LegacyCode` | `LocalizedAlias`).
   - _Validation Rules:_ Valid target academic entity; non-empty term string and locale.

9. **Parent-Child Taxonomy Relationships (DAG Nodes):**
   - _Fields & Standards:_ Parent node public ID, child node public ID, `isPrimaryParent` flag, relationship weight.
   - _Validation Rules:_ Valid parent and child nodes; cycle validation via Phase 07.13 `ICycleDetectionValidator` prior to persistence.

### Ingestion Acceptance Criteria

- 100% of imported taxonomy records must pass Phase 08 schema and validation pipeline rules.
- Partial failures in bulk imports must isolate failed records into Phase 06 error tracking tables without corrupting clean taxonomy nodes.
- All hierarchical associations must maintain polyhierarchy graph integrity without introducing cycles.

## 8.13 Seed Strategy & Finalization

The Phase 8 (Academic Taxonomy) shall be hydrated through the Universal Import Platform (Phase 6).
Initial data shall originate exclusively from officially approved reference sources.
Seeding shall follow dependency-aware ordering to preserve hierarchy integrity.
Enterprise validation shall include:

- Structural validation.
- Canonical validation.
- Resolution validation.
- Hierarchy validation.
- Cycle validation.
- Audit record generation.

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

### Acceptance Criteria

Phase 8 Part A is considered complete when:

- All architectural sections have been approved by the Architecture Review Board.
- Zero architectural duplication exists.
- All dependencies are satisfied.
- Enterprise governance requirements are fulfilled.
- The document is accepted as the official Phase 8 Architecture Baseline.

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

- **Status:** Approved / Baselined
- **Date:** 2026-07-24
- **Approver:** ARB

### Status

- **Current Status:** Baselined Architecture Specification

---

### Navigation

- **Previous**: [Phase 07 — Enterprise Reference Data](../phase-07-enterprise-reference-data/)
- **Next**: [Phase 08 — Domain Contracts](phase-08-02-domain-contracts.md)

## 8.14 Cross-Phase Alignment & Ownership Boundary

**Phase 08 Explicit Ownership:**
Phase 08 strictly owns and manages the following domains. Downstream phases must NOT redefine these capabilities:
- Academic taxonomy nodes (Fields, Disciplines, Programs, Specializations, etc.)
- Polyhierarchy / DAG relationships and cycles
- ISCED and CIP standard definitions
- Academic aliases and synonyms
- Localized taxonomy labels
- Cross-standard mappings (e.g., ISCED to CIP)
- Taxonomy validation, completeness scoring, and graph integrity
- Import handoff acceptance rules for academic taxonomy

**Separation from Phase 10 (Academic Majors):**
- Phase 10 Academic Majors **must reference** Phase 08 taxonomy nodes.
- Phase 10 **must not** redefine ISCED/CIP taxonomy structures.
- Major records in Phase 10 may link to `AcademicTaxonomyNode` IDs.
- Rich content such as "Best majors," "high-demand majors," country recommendations, career outcomes, salaries, and student-facing major profile pages **belong exclusively to Phase 10**, not Phase 08.

**Phase 06 Import Boundary:**
- Phase 06 can stage taxonomy records, extraction proposals, and evidence.
- Phase 08 exclusively owns taxonomy validation, cycle checks, alias conflicts, mapping conflicts, and final acceptance.
- **Strict Prohibition:** There must be NO direct Phase 06 writes into Phase 08 taxonomy canonical tables.
