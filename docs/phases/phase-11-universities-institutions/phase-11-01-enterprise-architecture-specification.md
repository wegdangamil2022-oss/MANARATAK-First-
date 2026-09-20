> **Note:** This phase references the [Enterprise Shared Contracts Specification](../../architecture/shared-contracts/03-enterprise-shared-contracts-specification.md) as the canonical architectural source for shared foundation contracts.

# MANARATAK 2.0: Phase 11 (Universities & Institutions) Enterprise Domain

> **Note:** This phase references the [Enterprise Lifecycle Framework Specification](../../architecture/lifecycle-framework/03-enterprise-lifecycle-framework-specification.md) as the canonical architectural source for all state, status, and lifecycle governance.

### Executive Summary

A concise architectural overview explaining:

- **Why this phase exists:** Provides the foundational capabilities required for this domain within the MANARATAK ecosystem.
- **What enterprise capability it introduces:** Establishes the core enterprise contracts, services, and integration boundaries for this specific platform.
- **How it fits into the overall architecture:** Acts as a strictly decoupled domain platform that consumes upstream foundations and provides standardized contracts to downstream consumers without violating ownership boundaries.

## Part A — Enterprise Architecture Specification

### 11.1 Vision

**Vision**
To establish the MANARATAK Phase 11 (Universities & Institutions) as the premier, globally recognized, and architecturally definitive enterprise foundation for institutional higher education data, ensuring absolute structural consistency and interconnectivity across the global academic ecosystem.

### 11.2 Mission

**Mission**
To act as the Single Source of Truth (SSoT) for all university, campus, faculty, and academic program data. The platform provides a unified canonical model that governs institutional hierarchies, accreditations, rankings, and program offerings, enabling seamless integration with downstream enterprise services.

### 11.3 Scope

**Purpose**
To define the explicit boundaries and architectural capabilities of the Phase 11 (Universities & Institutions) Enterprise Domain.

**Enterprise Responsibilities**
The Phase 11 (Universities & Institutions) is architecturally responsible for:

- Canonical University Management
- Institutional Hierarchy (Campuses, Faculties, Departments)
- Academic Program Architecture (Operationalization of Phase 10 Majors)
- Institutional & Programmatic Accreditations
- University Rankings
- Admission Policies & Requirements (Metadata only)
- Tuition & Pricing Models
- Research Centers & Academic Partnerships

**Architectural Rules**

- **Canonical Major Consumption**: Academic Programs consume Canonical Majors from Phase 10 strictly by reference, without redefining, owning, or duplicating the canonical major data.

### 11.4 Out of Scope

**Purpose**
To protect the domain boundaries by explicitly identifying capabilities that belong to other enterprise domains.

**Excluded Responsibilities**
The Phase 11 (Universities & Institutions) DOES NOT manage:

- **Canonical Academic Majors**: Explicitly governed by Phase 10 (Major Platform).
- **Scholarships & Financial Aid Allocation**: Governed by Phase 12 (Scholarships).
- **Student Applications & Admissions Processing**: Governed by a later officially assigned Roadmap v6.0 downstream student/application workflow phase. Phase 11 only owns the admission requirements/policies as program metadata.
- **Student Profiles**: Governed by Phase 15.
- **Payments and Transactions**: Governed by Phase 19.
- **Public Page Composition**: Governed by Phase 24.
- **User Authentication & Identity**: Governed by Phase 5.
- **International Test Definitions (e.g., IELTS, SAT)**: Governed by Phase 9.

### 11.5 Dependencies

**Purpose**
To strictly control the relationship between the Phase 11 (Universities & Institutions) and other enterprise domains.

**Architectural Rules**
The Phase 11 (Universities & Institutions) enforces Zero Upward Dependency. It depends ONLY downward on:

- **Phase 7 (Enterprise Reference Data)**: For Countries, Cities, and Currencies.
- Organizations and Accrediting Bodies are managed natively within this bounded context.
- **Phase 8 (Academic Taxonomy)**: For generic academic degrees and taxonomy levels.
- **Phase 9 (International Tests)**: For linking test requirements to university admissions.
- **Phase 10 (Major Platform)**: For linking Academic Programs to Canonical Majors.

Dependency cycles are strictly prohibited.

### 11.6 Ownership Model

**Purpose**
To define the sovereign entities exclusively owned and governed by this enterprise domain.

**Architectural Rules**
The enterprise domain SHALL exclusively own:

- **Institution (University)**: The top-level canonical legal entity.
- **Campus**: The physical or virtual operational location.
- **Faculty/College/School**: The structural academic division, accommodating diverse global organizational models.
- **Department**: The specialized academic unit.
- **Academic Program**: The distinct, deliverable degree offering.

### 11.7 University Hierarchy

**Purpose**
To govern the structural and administrative breakdown of an educational institution.

**Architectural Rules**

- **Configurable Tree Structure**: The hierarchy MUST follow a strict downward parent-child relationship while remaining configurable to support universities with or without intervening tiers (e.g., campuses, faculties, colleges, schools, or departments).
- **Architectural Integrity**: The hierarchy MUST preserve valid parent-child relationships and SHALL NOT allow orphaned organizational entities.
- **Cross-Campus Programs**: An academic program MAY be offered across multiple campuses of the same university. The architecture MUST support many-to-many resolution at the delivery level without duplicating the canonical program definition.

### 11.8 Canonical Principles

**Purpose**
To define the non-negotiable architectural axioms governing the domain.

**Architectural Rules**

- **Single Source of Truth (SSoT)**: No other domain SHALL define a university or an academic program.
- **Domain Isolation**: The domain SHALL NOT execute student logic or transactional payments.
- **Mandatory Event-Driven Execution**: Any structural mutation (e.g., adding a new program, updating tuition) MUST persist an immutable enterprise event to the Enterprise Transactional Outbox. Direct IPublisher usage is prohibited.

### 11.9 Academic Program Architecture

**Purpose**
To define the critical junction between the institution and the academic discipline.

**Architectural Rules**

- **The Intersection Rule**: An Academic Program MUST be architecturally defined as the intersection of a University/Faculty (Phase 11) and a Canonical Major (Phase 10), combined with a Degree Level (Phase 8).
- **Program Identity**: The Academic Program is an Identity Entity governed locally. It represents the actual offering (e.g., "BSc in Computer Science at MIT").
- **Independence from Major**: If Phase 10 updates a Canonical Major, the Academic Program inherits the semantic update but maintains its own operational lifecycle.
- **Operational Variability**: A single Academic Program MAY support multiple delivery modes, durations, tuition plans, and admission cycles without altering its canonical identity.

### 11.10 Admission Architecture

**Purpose**
To govern the structural prerequisites and acceptance metrics for institutions and programs.

**Architectural Rules**

- **Versioned Policies & Requirements**: Admission requirements and policies MUST be explicitly versioned, enabling the platform to govern distinct admission criteria across different academic years.
- **Requirement Definitions**: The domain SHALL define required test thresholds (referencing Phase 9 identifiers), GPA prerequisites, and other admission policies.
- **Acceptance Rates**: Historical acceptance rates and admission statistics MUST be modeled as versioned metadata, remaining distinct from primary architectural responsibilities.

### 11.11 Accreditation Architecture

**Purpose**
To govern the official recognition of institutions and programs by external bodies.

**Architectural Rules**

- **Institutional vs. Programmatic**: Accreditations MUST be explicitly separated into Institutional (applying to the whole University) and Programmatic (applying to a specific Academic Program).
- **Accrediting Bodies**: The accrediting organization MUST be managed natively within this bounded context.

### 11.12 Ranking Architecture

**Purpose**
To model global and regional institutional standings.

**Architectural Rules**

- **Ranking Systems**: Rankings (e.g., QS, THE) MUST be defined as versioned entities.
- **Temporal Validity**: A ranking is ONLY valid for its defined temporal span (e.g., "2025 Global Ranking"). Overwriting historical rankings is strictly prohibited.

### 11.13 Tuition Architecture

**Purpose**
To model the financial pricing structures of academic programs.

**Architectural Rules**

- **Currency Resolution**: All financial figures MUST be strictly tied to a Canonical Currency defined in Phase 7.
- **Pricing Models**: Tuition MUST support complex structures (Per Credit, Per Semester, Per Year, Per Program, Custom Pricing Models) and residency-based tiers (Domestic, International).

### 11.14 Campus Architecture

**Purpose**
To model the physical and operational footprint of an institution.

**Architectural Rules**

- **Location Resolution**: Campuses MUST resolve their geographical placement (City, Country) exclusively through the Phase 7 Reference Foundation.
- **Facilities**: Campus facilities (Libraries, Labs, Housing) are modeled as owned value objects or child entities of the Campus.

### 11.15 Research Architecture

**Purpose**
To model the research capabilities and focus areas of the institution.

**Architectural Rules**

- Research Centers MUST be linked to either the University level or a specific Faculty.
- Research focus areas MUST resolve against the Phase 8 Academic Taxonomy.

### 11.16 Partnership Architecture

**Purpose**
To govern formal academic and structural relationships between a University and its partner entities.

**Architectural Rules**

- **Enterprise & Academic Relationships**: Partnerships (e.g., Dual Degrees, Exchange Programs, Research Alliances) MUST be explicitly modeled mapping a University to one or more partner entities.

### 11.18 Import Architecture

**Purpose**
To define the deterministic architectural methodology for ingesting global university data, mapping strictly against the enterprise architecture.

**Enterprise Responsibilities**
Phase 11 MUST definitively own and import all institutional and programmatic canonical data while strictly delegating shared foundational data and taxonomy structures to upstream platforms.

**Import Ownership Boundary**
Phase 11 exclusively owns and imports:

- Universities / institutions
- Campuses
- Faculties / colleges / schools
- Departments
- Academic programs
- Program delivery modes
- Tuition and fee structures
- Admission requirement metadata
- Accreditation records
- Ranking records
- Research centers
- Institutional partnerships
- University aliases / localized names
- University logos and media via AssetId / AssetReference only

**Import Delegation Boundary**

- Phase 06 owns the universal import mechanics and execution engine.
- Phase 07 owns the foundational entities: countries, cities, currencies, languages, locations, and reference data.
- Phase 08 owns academic taxonomy and degree levels.
- Phase 09 owns test definitions.
- Phase 10 owns canonical majors.

### 11.18.1 Phase 11 University Import Specification

**Purpose**
To strictly define what university data is imported, source policies, field requirements, deduplication rules, and how incomplete records are enriched without violating phase ownership boundaries.

**Architectural Rules & Source Policy**
- Imported university data MUST come from official or trusted sources, including:
  - Official university websites.
  - Official admissions, academic programs, tuition, and scholarship pages.
  - Official accreditation or government education authority pages.
  - Trusted verified datasets ONLY when official data is unavailable.
- Phase 06 — Import Foundation strictly owns the generic import mechanics (file parsing, batching, failed-row queues, retry execution).
- Phase 11 — Universities & Institutions strictly owns university-specific schemas, mapping rules, domain validation, canonical naming, deduplication rules, enrichment, and publish readiness.
- Phase 16 — Enterprise CMS owns long-form editorial copy and guides about universities.
- Phase 05 — Core Implementation (EAP) owns all university media (logos, photos, brochures) via `AssetId` / `AssetReference`.
- No Organizations & Employers Platform or centralized organization registry shall be used (per ADR-027).

**Mandatory Fields**
Every imported university record MUST include:
- `officialUniversityName`
- `country`
- `primaryCityOrLocation`
- `officialWebsiteUrl`
- `institutionType`
- `officialSourceUrl`

**Optional Enrichment Fields**
The system MUST support optional enrichment fields, including:
- `logoAssetReference`
- `galleryAssetReferences`
- `establishedYear`
- `shortOverview`
- `localizedNames`
- `accreditationStatus`
- `rankingData`
- `campuses`
- `facultiesOrColleges`
- `academicDepartments`
- `academicPrograms`
- `degreeLevelsOffered`
- `studyLanguages`
- `tuitionFees`
- `admissionRequirements`
- `requiredTests`
- `applicationDeadlines`
- `applicationUrls`
- `scholarshipLinks`
- `studentHousing`
- `studentServices`
- `contactInformation`
- `sourceTrustLevel`
- `lastVerifiedAt`

**Canonical Identity and Deduplication**
- The system MUST normalize university names by removing marketing noise, duplicate spacing, punctuation clutter, emojis, and source platform suffixes.
- The system MUST NOT remove meaningful official legal words from the university name.
- Deduplication MUST use a deterministic composite key: `canonicalUniversityName + country + officialWebsiteDomain`.
- If the same university is imported from another source, the system MUST NOT create a duplicate record. Instead, it MUST merge ONLY missing optional fields into the existing record.
- The system MUST prefer official source data over aggregator data.
- The system MUST NEVER silently overwrite admin-reviewed, manually corrected, `ReadyToPublish`, or `Published` fields.

**Admin Import Lifecycle States**
Imported records MUST flow through strict states:
- `Imported`
- `Incomplete`
- `Complete`
- `NeedsReview`
- `ReadyToPublish`
- `Published`
- `Rejected`
- `Archived`

**University Detail Page Relationship**
- Phase 11 supplies structured university read-models used by Phase 24 University Detail Pages.
- Full public page composition remains in `docs/phases/phase-24-enterprise-public-platform/phase-24-04-public-page-detail-requirements-backlog.md`.


### 11.19 Detail Page Data Architecture

**Purpose**
To clarify Phase 11's responsibility in providing structured data for university and program detail pages.

**Architectural Rules**

- Phase 11 owns and provides the structured domain data for university detail pages and academic program detail pages (e.g., campus locations, tuition costs, ranking data, admission requirements).
- Phase 11 DOES NOT own the final public page composition or visitor-facing page experience. This is strictly governed by Phase 24 (Public Platform).
- Any long-form editorial marketing content required for these pages MUST be governed by Phase 16 (CMS/Content Platform).

### 11.20 Search Architecture

**Purpose**
To ensure universities and programs are highly discoverable.

**Architectural Rules**

- Search indices MUST be hydrated asynchronously via Domain Events (IUniversityCreatedEvent, IProgramUpdatedEvent) ensuring Phase 11 persistence is decoupled from the Enterprise Search Platform.

### 11.21 Governance

**Purpose**
To define the rules for lifecycle management of universities and programs.

**Architectural Rules**

- **Lifecycle States**: Universities and Programs MUST adhere to strict states: Draft, Active, Suspended, Closed.
- **Immutability**: An Active program that ceases to exist MUST be transitioned to Closed. Hard deletion of any published university or program is strictly prohibited.
- **Immutable Primary Identities**: Published entities MUST preserve immutable primary identities. For example, a University's PublicId and an Academic Program's PublicId CANNOT change after publication.

### 11.22 Explicit A/B/C Traceability Check

**Purpose**
To ensure strict alignment across all three parts of the specification.

**Architectural Rules**

- **Part A to Part B:** Every architectural entity defined in Part A (University, Campus, Faculty, Department, Program, Tuition, Accreditation, Ranking, Research Center, Partnership) MUST be represented by a strict TypeScript interface in Part B.
- **Part B to Part C:** Every TypeScript interface in Part B MUST have a corresponding Prisma schema model and CQRS implementation in Part C.
- **Part C Boundary Validation:** Part C MUST NOT introduce any entities (e.g., student profiles, applications, scholarships) that are absent from Part A and Part B. Part C must not omit required Part B responsibilities.

### 11.23 Architecture Review

**Formal Approval**
The Enterprise Architecture Board validates that Phase 11 accurately isolates institutional management from academic major definitions (Phase 10) and admission processing, adhering perfectly to Clean Architecture and Zero Upward Dependency principles. Phase 11 formally establishes the canonical institutional model for all downstream enterprise domains while strictly preserving the fundamental Single Source of Truth (SSoT) principle.

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

- **Status:** Baselined Architecture Specification
- **Date:** 2026-07-24
- **Approver:** Enterprise ARB

### Status

- **Current Status:** Baselined Architecture Specification

---

### Navigation

- **Previous**: [Phase 10 — Major Platform](../phase-10-major-platform/phase-10-01-enterprise-architecture-specification.md)
- **Next**: [Phase 11 — Domain Contracts](phase-11-02-domain-contracts.md)

## 11.23 Cross-Phase Alignment: Academic Taxonomy (Phase 08) & Majors (Phase 10)

**Taxonomy and Classification Alignment:**
- **Taxonomy Dependency:** University programs should reference **Phase 08 taxonomy nodes** (e.g., Fields, Disciplines) and/or **Phase 10 Majors** where appropriate to classify academic offerings.
- **No Duplication:** Phase 11 **must not** duplicate or redefine academic taxonomy definitions or major catalogs.
- **Search & Filtering:** Program classification filters on university pages should utilize the canonical Phase 08 taxonomy to ensure consistent navigation across the platform.
> **Current remediation status (2026-08-12): `READINESS_PREPARED / NOT_IMPORTED / PENDING_GOOGLE_STUDIO`.**
> This historical architecture baseline does not authorize import or prove a finalized schema. Identity, deduplication, handoff, and safety rules are superseded by `docs/remediation/wp10/PHASE_11_UNIVERSITY_DOMAIN_CONTRACT_PROPOSAL.md` and its safety gate.
