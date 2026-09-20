> **Note:** This phase references the [Enterprise Shared Contracts Specification](../../architecture/shared-contracts/03-enterprise-shared-contracts-specification.md) as the canonical architectural source for shared foundation contracts.

# MANARATAK 2.0: Phase9 PartA Enterprise Architecture Specification

> **Note:** This phase references the [Enterprise Lifecycle Framework Specification](../../architecture/lifecycle-framework/03-enterprise-lifecycle-framework-specification.md) as the canonical architectural source for all state, status, and lifecycle governance.

### Executive Summary

A concise architectural overview explaining:

- **Why this phase exists:** Provides the foundational capabilities required for this domain within the MANARATAK ecosystem.
- **What enterprise capability it introduces:** Establishes the core enterprise contracts, services, and integration boundaries for this specific platform.
- **How it fits into the overall architecture:** Acts as a strictly decoupled domain platform that consumes upstream foundations and provides standardized contracts to downstream consumers without violating ownership boundaries.

## Part A — Enterprise Architecture Specification

### 9.0 Mission

**Vision**
To define a globally recognized, authoritative foundation for all international academic and professional test structures, governing absolute consistency across the enterprise ecosystem.

**Mission**
To define the authoritative enterprise domain for modeling and governing international academic and professional tests, acting as the singular source of truth for test definitions and taxonomies.

**Objectives**

- Unify the definition and governance of all international tests.
- Govern canonical grading scales, versions, and test structures.
- Eliminate duplicated test definitions across disparate enterprise domains.

**Enterprise Responsibilities**
The International Tests Enterprise Domain SHALL govern the definitive single source of truth for all test definitions, grading scales, and hierarchical test structures across the enterprise. It SHALL own a unified domain model to align consistent test representation and enterprise-wide structural integrity.

**Architectural Rules**
The enterprise domain SHALL adhere strictly to Zero Upward Dependency and Domain Isolation. It MUST NOT contain business rules pertaining to test applications, student scores, or university admissions.

**Governance Constraints**
All test entities MUST be governed by central enterprise reference policies. Modifications to foundational test definitions SHALL require explicit architectural governance.

**Boundary Definitions**
The domain boundary is strictly limited to the intrinsic architectural properties of tests, their structural taxonomies, and their standard grading rubrics.

**Integration Expectations**

### 9.1 Scope

**Purpose**
To define the explicit boundaries and architectural capabilities of the International Tests Enterprise Domain.

**Enterprise Responsibilities**
The enterprise domain SHALL govern the architectural boundaries of test entity definitions, including test versions, sections, scoring bounds, and classification taxonomies.

**Included Responsibilities**
The scope encompasses Test Standards, Test Categories, Test Entities, and Test Relationships.

**Excluded Responsibilities**
The scope explicitly excludes transactional state, application state, and usage records.

**Architectural Rules**
The enterprise domain SHALL reuse all existing enterprise foundations. It MUST define an architectural dependency exclusively on Phase 5, Phase 6, Phase 7, and Phase 8 for shared architectural capabilities.

**Governance Constraints**
Scope expansions MUST undergo formal architectural review to ensure they do not violate domain isolation or replicate existing enterprise capabilities.

**Boundary Definitions**
The scope is constrained strictly to the canonical reference definition of tests and their associated structural rules.

**Integration Expectations**

### 9.2 Out of Scope

**Purpose**
To protect the domain boundaries by explicitly identifying capabilities that belong to other enterprise domains.

**Enterprise Responsibilities**
The enterprise domain SHALL govern its domain boundaries to exclude the governance of external enterprise entities.

**Architectural Rules**
The enterprise domain SHALL NOT model or govern:

- Universities
- Scholarships
- Admissions
- Applications
- Student Records
- Transactions
- Individual test scores or transcripts
- Financial or test evaluation logic

**Governance Constraints**
Any attempt to introduce out-of-scope entities MUST be rejected by the architecture review board.

**Boundary Definitions**
The domain boundary is strictly limited to the canonical definition of the test. Application or evaluation of the test is explicitly out of scope.

**Integration Expectations**

### 9.3 Architectural Principles

**Purpose**
To define the non-negotiable architectural axioms governing the design of the enterprise domain.

**Enterprise Responsibilities**
All architectural components within the enterprise domain MUST demonstrably conform to these principles.

**Architectural Rules**

- **Single Source of Truth (SSoT):** The enterprise domain SHALL be the sole system of record for test definitions. Domain entities SHALL NEVER be duplicated.
- **Foundation Reuse:** The enterprise domain SHALL reuse existing enterprise capabilities and SHALL NOT recreate architectural functionality governed by prior phases.
- **Architectural Decoupling:** High-level domains SHALL NOT own architectural dependencies on low-level domains. Both MUST depend on architectural abstractions.
- **Zero Upward Dependency:** The enterprise domain SHALL NOT own knowledge of or architectural dependency upon future downstream domains.
- **Domain Isolation:** The enterprise domain SHALL govern only Test-related concepts.
- **Technology Agnostic Design:** The architecture SHALL remain completely independent of specific technological implementations.
- **Architectural Sustainability:** The architecture MUST isolate domain complexity from structural volatility.
- **Enterprise Scalability:** The architecture MUST align with enterprise-scale architectural demands without structural compromise.

**Governance Constraints**
Violations of these principles SHALL block progression to the domain contracts phase.

**Boundary Definitions**
These principles apply uniformly across the entire International Tests Enterprise Domain architectural boundary.

**Integration Expectations**

### 9.4 Governance Rules

- **Governance Model:** Centralized architectural oversight via the Architecture Review Board (ARB).
- **Architectural Policies:** Strict adherence to Domain-Driven Design (DDD), Clean Architecture, and Single Responsibility Principle (SRP).
- **Lifecycle Rules:** All state transitions must be governed by the Enterprise Lifecycle Framework.
- **Decision Authority:** The ARB holds final authority over all structural, integration, and contract modifications.
- **Change Management:** All modifications must follow the official RFC (Request for Comments) and pull request approval process.
- **ADR Governance:** Every significant architectural decision must be documented as an Architecture Decision Record (ADR) and linked to this specification.
- **Operational Constraints:** The platform must meet all enterprise SLAs for availability, performance, and security.

### 9.5 Dependency Rules

- **Zero Upward Dependency:** This phase SHALL NOT depend on any downstream platform or domain that relies upon it.
- **Enterprise Foundations:** May consume services from the Core Foundation (e.g., logging, caching, messaging).
- **Enterprise Shared Contracts:** MUST implement and consume contracts defined in the Enterprise Shared Contracts Specification.
- **Enterprise Platforms:** May consume specific upstream Enterprise Platforms only as explicitly approved by the ARB.
- **Enterprise Standards:** MUST comply with all internal enterprise coding, security, and data standards.
- **Approved External Standards:** MUST adhere to recognized international standards (e.g., ISO, UN) where applicable.

### 9.6 Test Standards & Providers Management

**Purpose**
To govern the standards, issuing bodies, and providers associated with international tests natively within the Tests domain.

**Enterprise Responsibilities**
The enterprise domain MUST govern the architectural association between tests and their originating authorities or test providers.

**Architectural Rules**

- **Test Provider Ownership Rule:** The Phase 09 enterprise domain SHALL natively own test-provider and governing body references within the Tests bounded context. It MUST NOT depend on a centralized Organizations platform.
- **Location Resolution Rule:** Test center locations and geographical data MUST be referenced against the Phase 7 Enterprise Reference Foundation. Phase 7 provides countries, languages, locations, standard codes, and reference identities, but not a centralized organization model.

**Governance Constraints**
Modifications to test standards and providers MUST remain fully traceable and auditable.

**Boundary Definitions**
The enterprise domain governs the architectural association to the standard and provider, explicitly excluding any generic organizational hierarchy.

**Integration Expectations**

### 9.7 Test Taxonomy Foundation

**Purpose**
To categorize and classify tests within global hierarchical structures.

**Enterprise Responsibilities**
The enterprise domain MUST govern the classification of tests within the established academic and professional enterprise taxonomies.

**Architectural Rules**

- **Academic Taxonomy Resolution Rule:** The enterprise domain SHALL NOT define academic subjects or disciplines. It MUST reference them exclusively through the Phase 8 Academic Taxonomy Enterprise Domain.
- The enterprise domain SHALL conform to the Phase 7 Generic Hierarchy Foundation for all internal taxonomy structures.

**Governance Constraints**
Taxonomy assignments MUST NOT create circular architectural dependencies.

**Boundary Definitions**
The taxonomy boundary is constrained to the associative linking of test entities to academic structures without altering the academic structures.

**Integration Expectations**

### 9.8 Test Entities Management

**Purpose**
To define the core domain entities and their architectural purpose.

**Enterprise Responsibilities**
The enterprise domain MUST govern the structural architecture and canonical definition rules for all tests.

**Architectural Rules**

- **Location Resolution Rule:** The enterprise domain SHALL NOT define duplicate locations. All locations MUST be governed via canonical dependencies on the Phase 7 Enterprise Reference Foundation.
- **Delivery Mode Definition Rule:** Delivery modes are local canonical entities owned and governed strictly by the Phase 9 enterprise domain. The enterprise domain SHALL define its own delivery methodologies.
- The entities MUST be defined architecturally as follows:
  - **Test:** The canonical definition of an international examination.
  - **Test Version:** The specific iteration of a Test that governs temporal validity.
  - **Test Provider:** The authoritative body or vendor administering the Test, natively owned as a reference within Phase 09.
  - **Delivery Mode:** The methodology of administration, governed locally as a Phase 9 canonical entity.
  - **Test Section:** The structural breakdown of a Test Version for granular grading.
  - **Test Requirement:** The mandatory preconditions associated with a Test Version (governing test-taking preconditions e.g., age limits, ID rules). It is STRICTLY ISOLATED from University Admissions requirements.
  - **Test Session:** The structural period in which a Test Version is administered.
  - **Test Center:** The physical or virtual location of administration, referenced externally against Phase 07.
  - **Score Scale:** The absolute bounds and numerical increments of grading.
  - **Score Band:** The categorical classification representing a specific score range.
  - **Validity Period:** The temporal span during which a Test result remains officially recognized.
  - **Test Policy:** The governing architectural rules appended to a Test Version.

**Governance Constraints**
Test entities MUST adhere to strict enterprise policy before becoming architecturally approved.

**Boundary Definitions**
The test entities boundary encompasses the architectural definition of the test structure, scoring scale, and requirement linkages.

**Integration Expectations**

### 9.9 Test Relationship Management

**Purpose**
To govern the associations between different test entities and versions.

**Enterprise Responsibilities**
The enterprise domain MUST govern the architectural relationships between internal test entities.

**Architectural Rules**

- **Downward-Only Ownership Rule:** The enterprise domain SHALL only own relationships where both the source and target entities reside within its domain, or where the target is a foundational domain. It SHALL NOT own relationships pointing to higher-level domains.
- **Architectural Dependency Rule:** Relationships originating from external domains (e.g., Universities linking to Tests) SHALL be defined by those domains in their own architectural domains.

**Governance Constraints**
Relationships MUST NOT violate acyclic graph constraints where hierarchical linking is applied.

**Boundary Definitions**
The relationship boundary is constrained to internal domain linkages, explicitly excluding external domain associations.

**Integration Expectations**

### 9.10 Test Resolution Foundation

**Purpose**
To govern robust canonical identification for test entities across the enterprise.

**Enterprise Responsibilities**
The enterprise domain MUST govern the canonical identity rules for all test entities across the enterprise.

**Architectural Rules**

- **Alias Resolution Rule:** The enterprise domain SHALL govern multiple aliases and historical names for tests, and MUST map them to a single canonical entity. It SHALL reuse the Enterprise Alias Resolution Capability for this architectural alignment.

**Governance Constraints**
Aliases MUST NOT conflict with canonical names of distinct approved tests.

**Boundary Definitions**
The identity boundary is constrained strictly to canonical entity identification.

**Integration Expectations**

### 9.11 Cross-Test Mapping

**Purpose**
To govern equivalencies and score translations between disparate testing standards.

**Enterprise Responsibilities**
The enterprise domain MUST govern the canonical rules for cross-test equivalency mapping.

**Architectural Rules**

- **Cross-Mapping Governance Rule:** All score equivalencies and cross-test mappings MUST be explicitly versioned and subjected to formal governance approval. The enterprise domain SHALL NOT automatically infer mappings.
- The enterprise domain MUST define:
  - **Mapping Identity:** The canonical reference linking two disparate test standards.
  - **Mapping Version:** The temporal iteration of the mapping rules.
  - **Mapping Governance:** The governance state of the mapping relationship.
  - **Mapping Lifecycle:** The architectural timeline of the mapping.

**Governance Constraints**
Mappings MUST include governed lifecycle constraints and architectural baselines.

**Boundary Definitions**
The cross-mapping boundary is strictly limited to the architectural alignment of internal test scoring scales.

**Integration Expectations**

### 9.12 Phase 09 Import Specification

**Purpose**
To define the explicit import and ownership boundary for the International Tests Platform, mapping strictly against the enterprise architecture.

**Enterprise Responsibilities**
Phase 09 MUST definitively own and import all test-related canonical data while strictly delegating shared foundational data to upstream platforms.

**Import Ownership Boundary**
Phase 09 exclusively owns and imports:

- Test standards
- Test providers / issuing bodies (as native test-provider references)
- Test entities and taxonomies
- Test versions
- Test sections
- Score scales and score bands
- Validity periods
- Registration fees, public price ranges, currency references, and fee validity windows as test metadata only
- Test delivery modes
- Test center/location references
- Test-country relationships
- Test-language relationships
- Test-academic-taxonomy relationships
- Cross-test equivalency mappings
- Synonyms / aliases / localized test names
- Official registration links and official preparation/sample-material links
- Practice sample metadata and downloadable preparation assets, referenced only through Phase 05 EAP `AssetId` / `AssetReference`
- Test preparation resource references, including sample questions, brochures, preparation PDFs, listening/audio sample handles, and official practice test URLs

**Mandatory Import Fields**
Every imported international test record MUST include:

- `testName`: Canonical public test name, such as IELTS Academic, TOEFL iBT, SAT, GRE, GMAT, Duolingo English Test, HSK, TestDaF, or PTE Academic.
- `testCategory`: Language proficiency, undergraduate admission, graduate admission, professional licensing, academic placement, or other approved test category.
- `providerName`: Official issuing body or test provider, modeled natively inside Phase 09 without creating an Organizations Platform.
- `officialRegistrationUrl`: Direct official registration or official test information URL.
- `scoreScaleDefinition`: Core scoring scale, band range, section score range, or pass/fail structure.

**Optional Import and Enrichment Fields**
Phase 09 MAY import and govern the following test metadata when available from official or trusted sources:

- `localizedNames`, aliases, abbreviations, and legacy names.
- `testPurpose`, `acceptedUseCases`, and academic/professional applicability.
- `testFormat`, delivery mode, online/in-person availability, section structure, and duration.
- `testSections`, scoring bands, equivalency mappings, CEFR alignment, and score validity period.
- `registrationFee`, `currencyCode`, `priceRange`, `lateFee`, `reschedulingFee`, `cancellationFee`, and `feeValidityWindow`.
- `availableCountries`, `testCenterReferences`, city/location references, and online availability regions.
- `availableLanguages`, interface languages, and supported accommodations metadata.
- `requiredIdentificationDocuments`, age rules, retake policy, ID policy, and provider policies.
- `officialPreparationUrls`, `sampleMaterialUrls`, official guides, practice test references, and asset handles for files hosted through Phase 05 EAP.
- `resultDeliveryTime`, result reporting method, official score report URL, and institutional score-sending metadata.
- `relatedCourses`, `preparationCourseReferences`, and related Phase 13 learning offerings as references only.
- `relatedServices`, such as test preparation services or document support services, as Phase 20 service references only.

**Trusted Source Policy**
Phase 09 import sources SHOULD prioritize official test-provider pages, official exam board documents, government-recognized testing authorities, and trusted partner data feeds. Aggregator or third-party sources MAY be staged only as low-trust enrichment inputs and MUST NOT silently overwrite official or admin-reviewed records.

**Canonical Identity and Deduplication**
Imported test records MUST be normalized by removing marketing text, emojis, year-only decorations, source-platform clutter, duplicated words, and non-canonical suffixes. Deduplication MUST use a deterministic key such as:

`canonicalTestName + providerName + testCategory + deliveryMode + scoreScaleDefinition`

If a duplicate is detected, Phase 09 MUST merge missing optional metadata only. Published or admin-reviewed fields MUST NOT be silently overwritten by later imports.

**Administrative Import Lifecycle**
Imported test records MUST progress through a governed lifecycle:

- `Imported`: Staged raw record received from Phase 06.
- `Incomplete`: Missing mandatory fields or invalid score/fee structures.
- `Complete`: Mandatory fields are valid and sufficient for review.
- `NeedsReview`: Requires human review due to fee conflicts, unofficial sources, outdated policy dates, or score mapping ambiguity.
- `ReadyToPublish`: Approved for public catalog publication.
- `Published`: Visible through approved public read models.
- `Rejected`: Invalid, fraudulent, duplicate, or unsupported record.
- `Archived`: Retired, superseded, or no longer applicable test/version.

**Asset and Sample-Material Governance**
Official PDFs, preparation brochures, sample papers, listening/audio samples, images, and downloadable test guides MUST NOT be stored as raw file paths or unmanaged URLs in Phase 09 domain records. Persisted files MUST be registered through Phase 05 EAP and referenced by immutable `AssetId` / `AssetReference` handles. External official URLs MAY be preserved as source references.

**Cross-Phase Boundaries and Delegation**
Strict ownership and isolation boundaries are maintained:
- **Phase 06 (Import)**: Owns universal import mechanics and staging. Imports go to `/admin/imports/international-tests`. Phase 06 performs handoffs, but NO automatic publishing occurs based on import confidence or source trust.
- **Phase 07 (References)**: Owns countries, cities, locations, currencies, and languages. Phase 09 references these but does not duplicate them.
- **Phase 05 (Assets)**: Owns physical files and resources. Phase 09 uses `AssetId` references for preparation materials.
- **Phase 11 (Universities)**: Owns which universities accept the test. Phase 09 stores references only.
- **Phase 12 (Scholarships)**: Owns which scholarships require the test. Phase 09 stores references only.
- **Phase 13 (Courses)**: Owns test preparation courses. Phase 09 stores references only.
- **Phase 16 (CMS)**: Owns editorial content, blogs, and test guides. Phase 09 stores references only.
- **Phase 18 (Student Tools)**: Owns calculators, mock exam interfaces, and interactive tools.
- **Phase 19 (Finance/Payments)**: Owns actual payment execution, invoicing, and carts. Phase 09 stores **DESCRIPTIVE FEES ONLY** and never executes payments.
- **Phase 20 (Services)**: Owns registration assistance and consulting services.
- **Phase 23 (Admin)**: Owns the back-office unified management UI.
- **Phase 24 (Public Web)**: Owns the public rendering and student-facing UI.

**No Fake Data Rule**
- The system MUST NOT render fake metrics or hardcoded counts (e.g., "Universities: 180", "Scholarships: 42", "Centers: 1400").
- Cross-phase relations MUST be read dynamically via API from the owning phase or explicitly marked as "Pending Phase X" if the feature is unavailable. 

**Public Rendering Rule**
- The public student portal (Phase 24) MUST ONLY render tests with `status === 'PUBLISHED'`.
- Imported, staged, incomplete, drafted, or unreviewed tests MUST remain hidden from public access.
- Links to the public portal for a test are only visible/valid once the test is published.

**Fee Rule**
- Phase 09 strictly stores descriptive fee metadata (amounts, currencies, fee types).
- No actual payment processing or checkout flow exists within Phase 09. Actual payments are delegated to Phase 19.

**Cross-Phase Boundaries and Delegation**
Strict ownership and isolation boundaries are maintained:
- **Phase 06 (Import)**: Owns universal import mechanics and staging. Imports go to `/admin/imports/international-tests`. Phase 06 performs handoffs, but NO automatic publishing occurs based on import confidence or source trust.
- **Phase 07 (References)**: Owns countries, cities, locations, currencies, and languages. Phase 09 references these but does not duplicate them.
- **Phase 05 (Assets)**: Owns physical files and resources. Phase 09 uses `AssetId` references for preparation materials.
- **Phase 11 (Universities)**: Owns which universities accept the test. Phase 09 stores references only.
- **Phase 12 (Scholarships)**: Owns which scholarships require the test. Phase 09 stores references only.
- **Phase 13 (Courses)**: Owns test preparation courses. Phase 09 stores references only.
- **Phase 16 (CMS)**: Owns editorial content, blogs, and test guides. Phase 09 stores references only.
- **Phase 18 (Student Tools)**: Owns calculators, mock exam interfaces, and interactive tools.
- **Phase 19 (Finance/Payments)**: Owns actual payment execution, invoicing, and carts. Phase 09 stores **DESCRIPTIVE FEES ONLY** and never executes payments.
- **Phase 20 (Services)**: Owns registration assistance and consulting services.
- **Phase 23 (Admin)**: Owns the back-office unified management UI.
- **Phase 24 (Public Web)**: Owns the public rendering and student-facing UI.

**No Fake Data Rule**
- The system MUST NOT render fake metrics or hardcoded counts (e.g., "Universities: 180", "Scholarships: 42", "Centers: 1400").
- Cross-phase relations MUST be read dynamically via API from the owning phase or explicitly marked as "Pending Phase X" if the feature is unavailable. 

**Public Rendering Rule**
- The public student portal (Phase 24) MUST ONLY render tests with `status === 'PUBLISHED'`.
- Imported, staged, incomplete, drafted, or unreviewed tests MUST remain hidden from public access.
- Links to the public portal for a test are only visible/valid once the test is published.

**Fee Rule**
- Phase 09 strictly stores descriptive fee metadata (amounts, currencies, fee types).
- No actual payment processing or checkout flow exists within Phase 09. Actual payments are delegated to Phase 19.

**Import Delegation Boundary**

- Phase 06 owns the universal import mechanics and execution engine.
- Phase 07 owns the foundational entities: countries, languages, locations, standard codes, and generic reference data.
- Phase 08 owns the academic taxonomy reference structures.
- Phase 13 owns test preparation courses and learning delivery.
- Phase 20 owns non-course paid services such as test registration support, preparation consultations, document support, and appointment support.
- Phase 19 owns all payment execution, invoices, refunds, and financial ledgers. Phase 09 stores fee metadata only and MUST NOT execute payments.
- Phase 24 owns public page composition for test detail pages.

## Enterprise Integration

This section shall describe how this platform exposes its capabilities and interacts with the broader enterprise.

- **Integration Model:** Defines the communication paradigms (e.g., synchronous APIs, asynchronous messaging).
- **Published Contracts:** The official interfaces, DTOs, and APIs exposed to consumers.
- **Consumed Contracts:** The official interfaces and APIs this phase consumes from upstream platforms.
- **Events:** The domain and integration events published to the Enterprise Event Bus.
- **Read Models:** The optimized data structures provided for high-performance querying (CQRS).
- **Enterprise Communication Rules:** Guidelines for reliable, resilient, and secure communication.

### 9.13 Unified International Test Profile
**Purpose**
To consolidate all test data into a unified, rich profile that serves as the single source of truth for the public student portal (Phase 24) and the admin UI (Phase 23). Phase 09 does not just store basic test data; it governs a comprehensive unified profile.

**Profile Structure**
Every international test maintains a unified profile comprising:
- **Header & Identity**: Canonical name, abbreviation, official provider, test category, delivery mode, score range, availability status, and source trust level.
- **Description & Use Cases**: Introductory brief, purpose, target audience, associated languages, and commonly used countries.
- **Versions & Delivery**: Registered test variants, modes (Online, In-Person), and delivery specifics.
- **Test Sections**: Detailed breakdown of sections, types, durations, and question types.
- **Score Scale & Equivalencies**: Minimum/maximum scores, increments, bands, CEFR alignment, and cross-test mappings.
- **Fees & Financial Policies**: Descriptive registration fees, late fees, cancellation rules, and regional variations.
- **Requirements & Policies**: Registration requirements, ID requirements, age rules, retake policies, and accessibility notes.
- **Availability & Centers**: Available countries, cities, and regions (referencing Phase 07).
- **Official Links & Verification**: Primary registration links and official sources.
- **Preparation Materials & Assets**: References to downloadable materials and assets (via Phase 05).
- **Cross-Phase References (Read-only)**: Links to accepting Universities (Phase 11), Scholarships (Phase 12), Preparation Courses (Phase 13), CMS Guides (Phase 16), Student Tools (Phase 18), and Support Services (Phase 20).
- **Import, Evidence & Review**: Internal log of imported evidence, sources, and trust level.
- **Missing Data & Readiness**: Internal readiness indicators and missing fields for administrative completeness.
- **Preview & Publishing**: Strict publishing rules ensuring only verified data reaches the public platform.

**Phase 09 Ownership**
Phase 09 exclusively owns and manages:
- Identity and Taxonomy of the Test.
- Official Provider and Classification.
- Test Variants, Sections, and Score Scales.
- Descriptive Fees (NOT actual payments).
- Registration requirements and provider policies.
- Availability and centers (referencing Phase 07).
- Official links.
- Preparation materials (referencing Phase 05 AssetId).
- Internal imported evidence, completeness, and publish status.

**Cross-Phase Boundaries and Delegation**
Strict ownership and isolation boundaries are maintained:
- **Phase 06 (Import)**: Owns universal import mechanics and staging. Imports are routed to `/admin/imports/international-tests`. The test detail page does not perform direct imports. Import confidence and source trust NEVER trigger automatic publishing.
- **Phase 07 (References)**: Owns countries, cities, locations, currencies, and languages. Phase 09 references these but does not duplicate them.
- **Phase 05 (Assets)**: Owns physical files and resources. Phase 09 uses `AssetId` references for preparation materials.
- **Phase 11 (Universities)**: Owns which universities accept the test. Phase 09 stores references only.
- **Phase 12 (Scholarships)**: Owns which scholarships require the test. Phase 09 stores references only.
- **Phase 13 (Courses)**: Owns test preparation courses. Phase 09 stores references only.
- **Phase 16 (CMS)**: Owns editorial content, blogs, and test guides. Phase 09 stores references only.
- **Phase 18 (Student Tools)**: Owns calculators, mock exam interfaces, and interactive tools.
- **Phase 19 (Finance/Payments)**: Owns actual payment execution, invoicing, and carts. Phase 09 stores **DESCRIPTIVE FEES ONLY** and never executes payments.
- **Phase 20 (Services)**: Owns registration assistance and consulting services.
- **Phase 23 (Admin UI)**: Owns the back-office unified management UI (`AdminInternationalTestDetailPage`).
- **Phase 24 (Public Web)**: Owns the public rendering and student-facing UI.

**No Fake Data Rule**
- The system MUST NOT render fake metrics or hardcoded counts (e.g., "Universities: 180", "Scholarships: 42", "Centers: 1400").
- Cross-phase relations MUST be read dynamically via API from the owning phase or explicitly marked as "Pending Phase X" if the feature is unavailable. 

**Public Rendering Rule**
- The public student portal (Phase 24) MUST ONLY render tests with `status === 'PUBLISHED'`.
- Imported, staged, incomplete, drafted, or unreviewed tests MUST remain hidden from public access.
- Links to the public portal for a test are only visible and valid once the test is published.

**Fee Rule**
- Phase 09 strictly stores descriptive fee metadata (amounts, currencies, fee types).
- No actual payment processing or checkout flow exists within Phase 09. Actual payments are strictly delegated to Phase 19.

### Architecture Constraints

- **No Business Logic (if applicable):** Must not contain tenant-specific business rules unless explicitly defined as a business domain.
- **No Ownership Violations:** Strict adherence to aggregate roots; entities must not bypass defined boundaries.
- **No Circular Dependencies:** Circular references between modules or phases are strictly prohibited.
- **No Direct Database Access:** All data access must occur through defined domain repositories.
- **No Upward Dependencies:** The platform must remain ignorant of downstream consumers.
- **Technology Neutrality:** Domain contracts must remain agnostic to underlying physical technologies.
- **ADR Compliance:** All deviations must be documented and approved via Architecture Decision Records.

### Explicit A/B/C Traceability Check

- **Part A to Part B:** Every architectural entity defined in Part A (Test, Version, Provider, Mode, Section, Requirement, Session, Center, Score Scale, Score Band, Validity Period, Policy, Cross-mapping) MUST be represented by a strict TypeScript interface in Part B.
- **Part B to Part C:** Every TypeScript interface in Part B MUST have a corresponding Prisma schema model and CQRS implementation in Part C.
- **Part C Boundary Validation:** Part C MUST NOT introduce any entities (e.g., student results, organization hierarchies) that are absent from Part A and Part B. All implementations in Part C MUST strictly map to Part B contracts.

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

- **Status:** Approved / Baselined
- **Date:** 2026-07-24
- **Approver:** ARB

### Status

- **Current Status:** Baselined Architecture Specification

---

### Navigation

- **Previous**: [Phase 08 — Academic Taxonomy](../phase-08-academic-taxonomy/)
- **Next**: [Phase 09 — Domain Contracts](phase-09-02-domain-contracts.md)
