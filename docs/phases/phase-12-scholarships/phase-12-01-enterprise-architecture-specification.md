> **Note:** This phase references the [Enterprise Shared Contracts Specification](../../architecture/shared-contracts/03-enterprise-shared-contracts-specification.md) as the canonical architectural source for shared foundation contracts.

# MANARATAK 2.0: Phase 12 (Scholarships) Enterprise Domain

> **Note:** This phase references the [Enterprise Lifecycle Framework Specification](../../architecture/lifecycle-framework/03-enterprise-lifecycle-framework-specification.md) as the canonical architectural source for all state, status, and lifecycle governance.

### Executive Summary

A concise architectural overview explaining:

- **Why this phase exists:** Provides the foundational capabilities required for this domain within the MANARATAK ecosystem.
- **What enterprise capability it introduces:** Establishes the core enterprise contracts, services, and integration boundaries for this specific platform.
- **How it fits into the overall architecture:** Acts as a strictly decoupled domain platform that consumes upstream foundations and provides standardized contracts to downstream consumers without violating ownership boundaries.

## Part A — Enterprise Architecture Specification

### 12.1 Mission

**Vision**
To establish the MANARATAK Phase 12 (Scholarships) as the definitive, globally recognized enterprise foundation for all scholarship and funding opportunities, ensuring absolute structural consistency, discoverability, and accessibility across the educational ecosystem.

**Mission**
To act as the Single Source of Truth (SSoT) for scholarship definitions, sponsors, eligibility criteria, funding packages, and application cycles. The platform provides a unified canonical model seamlessly integrating with foundational reference data, academic majors, and universities without replicating external domains.

### 12.2 Scope

**Purpose**
To define the explicit boundaries and architectural capabilities of the Phase 12 (Scholarships) Enterprise Domain.

**Enterprise Responsibilities**
The platform is architecturally responsible for:

- Canonical Scholarship Management & Versioning
- Scholarship Taxonomy & Categorization
- Scholarship Metadata & Configuration
- Sponsor Management (within the scholarship context)
- Eligibility Rule Architecture
- Award & Funding Allocation Architecture
- Application Cycle & Window Management
- Cross-Domain Mapping (Countries, Universities, Majors, Tests)

### 12.3 Out of Scope

**Purpose**
To protect the domain boundaries by explicitly identifying capabilities that belong to other enterprise domains.

**Excluded Responsibilities**
The Phase 12 (Scholarships) DOES NOT manage:

- **Canonical Identities**: It does not own the definitions of Universities, Majors, Countries, or Tests.
- **Student Profiles**: It does not own the student's personal data or identity records.
- **Visa & Immigration Logic**: Processing governmental immigration rules is excluded.
- **Learning Management**: Course content and academic grading.
- **Authentication/IAM**: User access management remains in Phase 5.

### 12.4 Dependencies

**Purpose**
To strictly control the relationship between the Phase 12 (Scholarships) and other enterprise domains.

**Architectural Rules**
The Phase 12 (Scholarships) enforces Zero Upward Dependency. It depends ONLY downward on:

- **Phase 7 (Enterprise Reference Data)**: For Countries, Cities, Languages, Currencies, and Other Shared Reference Data.
- **Phase 8 (Academic Taxonomy)**: For Degree Levels and academic classifications.
- **Phase 9 (International Tests)**: For linking test requirements (e.g., IELTS, SAT) to eligibility rules.
- **Phase 10 (Major Platform)**: For linking eligibility to Canonical Majors.
- **Phase 11 (Universities & Institutions)**: For linking scholarships to specific Universities or Academic Programs.

### 12.5 Ownership Model

**Purpose**
To define the sovereign entities exclusively owned and governed by this enterprise domain.

**Architectural Rules**
The enterprise domain SHALL exclusively own:

- **Scholarship Core**: The canonical entity representing the funding opportunity.
- **Scholarship Version**: The versioned structural iteration.
- **Sponsor**: The funding entity defined contextually.
- **Eligibility Rule**: The logic gate determining applicant qualification.
- **Award Package**: The financial or non-financial benefits.
- **Application Cycle**: The temporal window for submission and review.
- **Scholarship Metadata**: The structural metadata component defining searchable attributes.

### 12.6 Scholarship Hierarchy

**Purpose**
To govern the structural breakdown of a scholarship offering.

**Architectural Rules**

- The hierarchy MUST follow a strict downward path: Scholarship (Canonical) → Scholarship Version → Eligibility Rule → Application Cycle → Award Decision.
- The architecture MUST support multiple concurrent application cycles under a single scholarship version.

### 12.7 Scholarship Taxonomy

**Purpose**
To categorize and classify scholarships within global hierarchical structures.

**Architectural Rules**
Scholarships MUST be classified orthogonally across multiple dimensions:

- **By Source**: Government, University, Embassy, Foundation, NGO, Corporate.
- **By Merit**: Merit-based, Need-based, Research, Exchange, Sports/Arts.
- **By Funding Level**: Fully Funded, Partially Funded, Tuition-only, Stipend-only.

### 12.8 Scholarship Metadata Architecture

**Purpose**
To define the essential, searchable metadata attributes of a scholarship.

**Architectural Rules**
The domain SHALL govern standardized metadata tags mapped to reference data, including:

- **Degree Level**: Inherited from Phase 8.
- **Study Mode**: Online, On-Campus, Hybrid.
- **Language of Instruction**: Inherited from Phase 7.
- **Duration**: Measured strictly in standardized temporal units (Months/Years).
- **Intake**: Academic seasons (e.g., Fall, Spring).
- **Deadline Type**: Rolling, Fixed, Phased.
- **Featured/Priority**: Platform promotion weightings.
- **Tags**: Independent contextual keywords for enhanced discoverability.
- **Academic Year**: The academic year the scholarship targets.
- **Application URL Type**: The type of application URL (e.g., internal, external, specific portal).
- **Scholarship Status Visibility**: Controls visibility independent of lifecycle state.

### 12.9 Sponsor Architecture

**Purpose**
To govern the entities providing the scholarship funding.

**Architectural Rules**

- **Contextual Local Ownership**: The Sponsor is managed natively within Phase 12 to encapsulate funding logic and profiles.
- **Reference Linking**: If a sponsor is a recognized University, it MUST link its identity to the Phase 11 University without duplicating their canonical profiles. Governmental, private, or foundation sponsors are modeled natively as Phase 12 sponsor metadata without depending on a centralized organization platform.

### 12.10 Eligibility Architecture

**Purpose**
To govern the prerequisite conditions an applicant must meet.

**Architectural Rules**

- Eligibility rules MUST be modular and composite, allowing complex AND/OR matching logic.
- Phase 12 owns eligibility rules and criteria. Phase 12 MUST NOT own student profile data such as GPA, age, nationality, documents, or application history (which belong to Phase 15). Phase 12 may consume student attributes later through approved contracts to evaluate eligibility but MUST NOT define or store them.
- Rules MUST reference external canonical entities exclusively: Target Countries (Phase 7), Target Universities (Phase 11), Allowed Majors (Phase 10), Minimum GPA, Minimum Test Scores (Phase 9), Age limits, and Gender/Nationality constraints.
- **Eligibility Rules MUST be independently versioned**: This allows scholarship eligibility to evolve without affecting historical scholarship versions.

### 12.11 Application Architecture

**Purpose**
To govern the temporal windows and procedural stages of the application for scholarships.

**Architectural Rules**

- Phase 12 owns scholarship definitions, application cycles/windows, application method metadata, eligibility criteria, funding packages, and award structure.
- Phase 12 MUST NOT own broad student application workflows, student portal workflows, admin review operations, document review workflow, or student decision processing. Workflow execution is deferred to a downstream student/application workflow owner (e.g., Phase 15 or a later officially assigned Roadmap v6.0 phase).
- **Application Method**: Every Scholarship MUST support exactly one Application Method metadata flag: `INTERNAL` or `EXTERNAL`.
  - **EXTERNAL**: The scholarship page displays "Apply on Official Website". The user is redirected to the official application URL.
  - **INTERNAL**: The scholarship page displays "Apply Now". Clicking it transitions the user to the downstream application workflow phase.
- **Application Cycle**: Phase 12 defines opening dates, closing dates, and grace periods for the scholarship.

### 12.12 Award & Funding Architecture

**Purpose**
To model the financial and operational benefits of the scholarship.

**Architectural Rules**

- **Funding Packages**: MUST explicitly define components (Tuition coverage, Monthly Stipend, Travel Allowance, Accommodation, Insurance) inside Phase 12.
- **Payment Execution**: Phase 12 DOES NOT own payments, disbursements, transactions, or financial execution workflows. These belong strictly to Phase 19 (Enterprise Finance & Payments Platform). Phase 12 only models the award package rules.
- **Funding Duration**: Explicit tracking of how long the funding applies.
- **Renewable Funding**: Support for renewable grants (e.g., Renewable every Academic Year, Renewable based on GPA, Renewable until Graduation).
- **Currency Compliance**: All financial values MUST resolve to a Canonical Currency defined in Phase 7.

### 12.13 Scholarship Lifecycle

**Purpose**
To define the rules for state transitions of a scholarship.

**Architectural Rules**

- **State Machine**: The lifecycle MUST adhere strictly to the following states: Draft → Proposed → Active → Expired → Closed → Suspended → Deprecated → Archived.
- **State Semantics**: "Expired" represents automatic deadline expiration, while "Closed" represents an administrative closure.
- **Immutability**: An Active scholarship CANNOT be hard-deleted. It must transition to Closed, Expired, or Deprecated.

### 12.14 Import Architecture

**Purpose**
To ingest global scholarship data reliably while strictly adhering to enterprise boundaries.

**Enterprise Responsibilities**
Phase 12 MUST definitively own and import all scholarship-specific canonical data while strictly delegating shared foundational data and taxonomy structures to upstream platforms.

**Import Ownership Boundary**
Phase 12 exclusively owns and imports:

- Scholarships
- Scholarship versions
- Sponsors
- Funding packages
- Eligibility criteria
- Application cycles/windows
- Application method metadata
- Target countries
- Target universities
- Target academic programs
- Target majors
- Target degree levels
- Test requirement mappings
- Language requirements
- Deadline schedules
- Scholarship aliases / localized names
- Official URLs
- Scholarship logos/media via AssetId / AssetReference only

**Import Delegation Boundary**

- Phase 06 owns the universal import mechanics and execution engine.
- Phase 07 owns the foundational entities: countries, currencies, languages, locations, and reference data.
- Phase 08 owns academic taxonomy and degree levels.
- Phase 09 owns test definitions.
- Phase 10 owns majors.
- Phase 11 owns universities and academic programs.

### 12.15 Scholarship Import Governance

**Purpose**
To define the governance rules, completeness constraints, and deduplication logic for scholarships imported from third-party platforms and aggregators.

**Architectural Rules**

- **Import Sources:** Scholarship data may be imported from multiple scholarship platforms, aggregator platforms, trusted listing platforms, official APIs, and later from official scholarship/provider pages when enrichment is needed.
- **Mandatory Minimum Fields:** A scholarship record MUST NOT be accepted as a valid imported scholarship unless it contains all mandatory fields: `scholarshipName`, `fundingCoverage`, `coverageDetails`, `eligibleMajorsOrFields`, and `degreeLevel`. If any mandatory field is missing, the imported item MUST be marked as rejected or invalid for scholarship creation (unless held as a raw incomplete candidate outside the canonical catalog).
- **Optional Enrichment Fields:** Fields not mandatory at initial import but should be captured or enriched later: `requiredDocuments`, `eligibilityCriteria`, `studyLanguage`, `applicationDeadline`, `studyCountry`, `applicationLink`, `officialSourceUrl`, `sponsorName`, `targetUniversities`, `targetAcademicPrograms`, `fundingAmount`, `currency`, `duration`, and `localizedNames`.
- **English Data Requirement:** Imported scholarship canonical data MUST be stored in English as the primary normalized language. Additional localized names/descriptions may be attached later.
- **Canonical Scholarship Name Normalization:** Imported scholarship names MUST be cleaned into a simple canonical name composed only of: scholarship type/name, sponsor/provider name, and year or intake cycle when available. The normalization MUST remove marketing words, extra descriptions, platform-added titles, emojis, SEO text, and irrelevant suffixes.
- **Deduplication and Merge Behavior:** When the same scholarship is imported from another platform, Phase 12 MUST NOT create a duplicate canonical scholarship. It MUST match using canonical scholarship name, sponsor/provider, year/intake cycle, country, and official URL if available. Missing fields from the new source MUST be merged into the existing scholarship draft. Source traceability MUST be preserved. Official-source data is preferred over aggregator data when conflicts occur. Conflicting values MUST be marked for admin review, not silently overwritten.
- **Admin Review States:** Imported scholarships MUST support clear states: `Imported`, `Incomplete`, `Complete`, `NeedsReview`, `ReadyToPublish`, `Published`, `Rejected`, `Archived`.
  - `Incomplete`: Accepted import exists but optional or enrichment fields are missing.
  - `Complete`: Required and recommended fields are present.
  - `ReadyToPublish`: Complete and reviewed.
  - `Published`: Visible through the public platform later.
- **Fetch Missing Data:** The system MUST support a `Fetch Missing Data` action to attempt enriching missing fields from official pages or trusted sources. It MUST NOT overwrite existing reviewed fields unless the new source is official or explicitly approved. Every enrichment MUST preserve source URL, timestamp, and trust level.
- **Publication Rule:** Imported scholarships MUST NOT be published automatically. Admin review is required before public publication. Phase 12 owns publication readiness status. (Phase 24 owns final visitor-facing public page composition).

### 12.16 Scholarship Detail Page Data Specification

**Purpose**
To clarify Phase 12's responsibility in providing structured data for scholarship detail pages and defining the exact fields exposed to downstream composition layers.

**Architectural Rules**

- **Structured Data Ownership:** Phase 12 strictly owns and provides the structured domain data for scholarship detail pages (e.g., funding packages, eligibility criteria, application windows, application methods).
- **Public Composition Boundary:** Phase 12 DOES NOT own the final public page composition, rendering, or visitor-facing page experience. This is strictly governed by Phase 24 (Enterprise Public Platform).
- **Content Boundary:** Any long-form editorial marketing copy, study guides, or guidance content required for these pages MUST be governed by Phase 16 (Enterprise CMS).
- **Student Data Boundary:** Phase 12 MUST NOT store student-specific application documents or student-owned profile data. Student profiles are owned by Phase 15.
- **Payment Execution Boundary:** Phase 12 DOES NOT own payment or disbursement execution. That is owned by Phase 19.
- **Required Detail Data Categories:** The structured read model provided by Phase 12 MUST include the following categorical data:
  - **Header / Hero Data:** Canonical names, sponsor, status, and deadlines.
  - **Funding Summary:** Specific coverage limits (tuition, stipend, travel, insurance) mapped to Phase 07 Currencies.
  - **Eligibility Summary:** Academic, geographic, and age constraints.
  - **Targeting Metadata:** Links to Phase 11 Universities/Programs, Phase 10 Majors, Phase 08 Degree Levels, and Phase 09 Required Tests.
  - **Application Information:** Timeline dates, external official links, and application methods.
  - **Required Documents:** Generic document requirements (NOT student-uploaded files).
  - **Selection Criteria:** Merit/need-based evaluation logic.
  - **Trust and Freshness:** Source provenance, completeness, and verification timestamps.
  - **Related Discovery Hints:** Structured hints for similar scholarships (by country, major, degree, funding). Phase 24 is responsible for rendering this discovery section.

### 12.17 Search Architecture

**Purpose**
To ensure scholarships are highly discoverable across complex criteria.

**Architectural Rules**

- The platform MUST push flattened, optimized read models to the Phase 5 Enterprise Search Index asynchronously upon any ScholarshipPublished or ScholarshipUpdated event.
- Search queries MUST NOT hit the Phase 12 transactional database directly.

### 12.18 AI Architecture

**Purpose**
To integrate intelligent matching and recommendation capabilities while respecting enterprise ownership boundaries.

**Architectural Rules**

- In compliance with the MANARATAK Enterprise Architecture, the Enterprise AI Platform is the sole owner of all AI capabilities.
- The Scholarships Platform (Phase 12) is strictly an AI Consumer and does not implement AI infrastructure, orchestrate models, or own AI business services.
- The Enterprise AI Platform consumes the Scholarship flattened read models and eligibility criteria to execute likelihood ranking, profile matching, and personalized deadline warnings. The Scholarships Platform simply provides the necessary data via approved public contracts and receives advisory recommendations in return.

### 12.19 Analytics Architecture

**Purpose**
To provide business intelligence regarding scholarship trends.

**Architectural Rules**

- The architecture MUST emit analytical events to track scholarship counts, sponsor trends, application funnel conversion rates, success rates, and funding distributions by country and major.
- Emitted analytical events MUST also track:
  - Search Trends
  - Application Deadline Trends
  - Country Demand Analysis
  - Major Demand Analysis
  - Scholarship Popularity Metrics

### 12.20 Governance

**Purpose**
To protect the integrity of scholarship data.

**Architectural Rules**

- **Architecture Review Board (ARB)**: Owns the architecture and schema constraints.
- **Sponsor Compliance**: Sponsors CANNOT bypass governance workflows when publishing scholarships.
- **Version Control**: Structural modifications to eligibility or funding MUST generate a new version. Historical records MUST NEVER be overwritten.
- **Backward Compatibility**: Public contracts SHALL preserve backward compatibility unless an approved major architectural version is introduced through the Enterprise Architecture Review Board.

### 12.21 Explicit A/B/C Traceability Check

**Purpose**
To ensure strict alignment across all three parts of the specification.

**Architectural Rules**

- **Part A to Part B:** Every architectural entity defined in Part A (Scholarship, Sponsor, Eligibility Rule, Funding Package, Application Cycle) MUST be represented by a strict TypeScript interface in Part B.
- **Part B to Part C:** Every TypeScript interface in Part B MUST have a corresponding Prisma schema model and CQRS implementation in Part C.
- **Part C Boundary Validation:** Part C MUST NOT introduce any application workflow engines, student-owned data, payment execution workflows, or responsibilities that are absent from Part A and Part B. Part C must not omit required Part B responsibilities such as sponsors, funding packages, eligibility criteria, cycles, and scholarship mappings.

### 12.22 Architecture Review

**Formal Approval**
The Enterprise Architecture Board validates that Phase 12 successfully isolates Scholarship management, correctly consumes Reference Data (Phases 7-11) without duplication, and establishes a robust, highly extensible Eligibility and Funding architecture.

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

- **Previous**: [Phase 11 — Universities & Institutions](../phase-11-universities-institutions/phase-11-01-enterprise-architecture-specification.md)
- **Next**: [Phase 12 — Domain Contracts](phase-12-02-domain-contracts.md)

## 12.14 Cross-Phase Alignment: Academic Taxonomy (Phase 08) & Majors (Phase 10)

**Taxonomy and Classification Alignment:**
- **Taxonomy Dependency:** Scholarships may target broader academic fields or disciplines by using **Phase 08 taxonomy references**.
- **Major Specificity:** Scholarships may also link directly to **Phase 10 majors** when the scholarship is specific to particular degree programs or majors.
- **No Duplication:** Phase 12 **must not** create its own academic taxonomy or major definitions; it must solely rely on associations with Phase 08 and Phase 10.
