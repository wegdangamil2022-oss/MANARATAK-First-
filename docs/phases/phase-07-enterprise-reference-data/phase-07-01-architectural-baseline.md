> **Note:** This phase references the [Enterprise Shared Contracts Specification](../../architecture/shared-contracts/03-enterprise-shared-contracts-specification.md) as the canonical architectural source for shared foundation contracts.

# MANARATAK 2.0: Phase7 PartA Architectural Baseline

> **Note:** This phase references the [Enterprise Lifecycle Framework Specification](../../architecture/lifecycle-framework/03-enterprise-lifecycle-framework-specification.md) as the canonical architectural source for all state, status, and lifecycle governance.

### Executive Summary

A concise architectural overview explaining:

- **Why this phase exists:** Provides the foundational capabilities required for this domain within the MANARATAK ecosystem.
- **What enterprise capability it introduces:** Establishes the core enterprise contracts, services, and integration boundaries for this specific platform.
- **How it fits into the overall architecture:** Acts as a strictly decoupled domain platform that consumes upstream foundations and provides standardized contracts to downstream consumers without violating ownership boundaries.

## Part A — Enterprise Architecture Specification

### Phase 7 Baseline v1.1

---

## 7.0 Mission

### Vision

Create an Enterprise Reference Data Platform that serves as the foundation for all MANARATAK platforms, acting as the Single Source of Truth (SSoT) for all shared reference data, ensuring consistency, governance, reliance on international standards, and eliminating data duplication across all system components.

### Mission

Build a completely independent reference layer devoid of business logic, providing all reference entities, contracts, and core capabilities relied upon by downstream enterprise bounded contexts (e.g., Universities & Institutions, Scholarships, Academic Programs, Admissions & Visas, Search & AI Services) without containing any platform-specific Business Logic itself.

### Objectives

- Establish a unified reference source for all shared data.
- Eliminate data duplication between platforms.
- Adopt international standards as the core basis for every reference.
- Provide a stable identity for all reference entities.
- Provide a unified Name Resolution system.
- Provide unified contracts to access reference data.
- Build a resilient foundation that can be extended for decades without structural redesign.

### Scope

This phase includes building the following:

- Reference Foundation
- Reference Contracts
- Global Data Standards
- Global Geographic Platform
- Language & Localization Platform
- Currency Platform
- Nationality Platform
- Education Reference Platform
- Resolution Engine
- Cross Reference Mapping
- Integration Contracts

### Out of Scope

This phase does **NOT** include:

- Scholarship Business Logic
- University Business Logic
- Search Engine
- Recommendation Engine
- AI Logic
- Admission Logic
- Financial Logic
- Academic Taxonomy
- International Tests
- Import Providers
- Workflow Engines
  _(All these systems will be built in independent subsequent phases)._

### Architectural Principles

The Reference Platform strictly adheres to the following principles:

1. **Single Source of Truth (SSoT):** Only one official record exists for each reference concept. (e.g., `Country -> CN`. All platforms point to this reference and never create a duplicate).
2. **Zero Upward Dependency:** Phase 7 depends ONLY on the `Core Foundation`. It does NOT depend on Scholarships, Universities, AI, Search, or Courses. Conversely, all those platforms depend on it.
3. **International Standards First:** All reference data is built upon official international standards prior to any local naming conventions (e.g., ISO 3166, ISO 639, ISO 4217, UN M49, BCP47, Unicode CLDR, IANA Time Zone Database).
4. **Standards Before Entities:** No entity shall be instantiated before defining the standard it relies on. Sequence: `Standard -> Entity -> Relations`.
5. **Reference Resolution First:** Every reference entity must support Official Names, Native Names, Localized Names, Historic Names, Aliases, Misspellings, and External Provider Names to ensure resolution regardless of the input format.
6. **Canonical Identity:** Every reference has a stable, immutable identity comprising: UUID, Public ID, Standard Codes, and Internal Identifier.
7. **Reference Immutability:** Historical records are never modified directly. Any change requires creating a new `Version` while preserving the complete historical timeline (Append-only).
8. **No Hard Delete:** Hard deletion is strictly prohibited. State transitions are managed exclusively via `Lifecycle` (Active, Deprecated, Archived, Superseded, Merged).
9. **Domain Neutrality:** The Reference Platform contains NO Business Logic. It is completely agnostic to Scholarships, Universities, Admissions, Visa, or AI rules.
10. **Extensibility by Design:** Future scalability is achieved via Metadata, Extension Contracts, and the Catalog Framework—not by modifying the core schema.
11. **Cache Ready by Design:** All contracts are engineered to support caching natively without tight coupling to specific technologies (e.g., Redis).
12. **Architecture Before Implementation:** The Enterprise Architecture (Part A) and Domain Contracts (Part B) must be fully reviewed and approved before any implementation begins in Part C.
13. **Tenant-Agnostic (Global Scope):** Reference data is universally shared across the entire MANARATAK ecosystem. It is strictly Global and acts as the SSoT. It does NOT contain tenant-specific variations, and multi-tenant isolation (e.g., TenantId) must never be introduced into this layer.

### Governance Rules

- **Governance Model:** Centralized architectural oversight via the Architecture Review Board (ARB).
- **Architectural Policies:** Strict adherence to Domain-Driven Design (DDD), Clean Architecture, and Single Responsibility Principle (SRP).
- **Lifecycle Rules:** All state transitions must be governed by the Enterprise Lifecycle Framework.
- **Decision Authority:** The ARB holds final authority over all structural, integration, and contract modifications.
- **Change Management:** All modifications must follow the official RFC (Request for Comments) and pull request approval process.
- **ADR Governance:** Every significant architectural decision must be documented as an Architecture Decision Record (ADR) and linked to this specification.
- **Operational Constraints:** The platform must meet all enterprise SLAs for availability, performance, and security.

### Dependency Rules

- **Zero Upward Dependency:** This phase SHALL NOT depend on any downstream platform or domain that relies upon it.
- **Enterprise Foundations:** May consume services from the Core Foundation (e.g., logging, caching, messaging).
- **Enterprise Shared Contracts:** MUST implement and consume contracts defined in the Enterprise Shared Contracts Specification.
- **Enterprise Platforms:** May consume specific upstream Enterprise Platforms only as explicitly approved by the ARB.
- **Enterprise Standards:** MUST comply with all internal enterprise coding, security, and data standards.
- **Approved External Standards:** MUST adhere to recognized international standards (e.g., ISO, UN) where applicable.

## 7.1 Reference Foundation

**Goal:** Establish the common structural baseline from which all reference entities inherit. This section defines abstract contracts and overall structure only, with no actual implementation.

- **Identity Contracts:** Every reference must possess a UUID, Stable Public ID, Internal Identifier, Slug, and Standard Codes.
- **Lifecycle Contracts:** Every reference possesses a lifecycle state: Active, Deprecated, Archived, Superseded, Merged.
- **Versioning Contracts:** Every reference supports a Version Number, Effective From, Effective To, and an immutable Version History.
- **Metadata Contracts:** Includes Metadata Extension, Governance Metadata, and Validation Metadata.
- **Localization Value Objects:** Includes Official Name, Native Name, Display Name, Localized Name, and Short Name.
- **Reference Resolution Contracts (Definitions Only):** Alias Resolution, Historic Names, Misspellings, Provider Names, and External Identifier Mapping. _(Actual implementation resides in 7.3)._
- **Repository Contracts:** `IReferenceRepository`, `IReferenceQueryRepository`.
- **Query Contracts:** Lookup, Find By Code, Find By Alias, Find By Slug, Autocomplete (Restricted to basic reference search only).
- **Resolver Contracts:** Name Resolution, Alias Resolution, External ID Resolution.
- **Validation Contracts:** `IReferenceValidator`, `IStandardCodeValidator`, `IReferenceIntegrityValidator`.
- **Event Contracts:** ReferenceCreated, ReferenceUpdated, ReferenceDeprecated, ReferenceMerged. (This phase defines the payload contracts, not the event bus infrastructure).
- **Architectural Boundaries:** The Reference Foundation is responsible for Identity, Contracts, Resolution Contracts, Validation Contracts, and Event Contracts. It holds NO responsibility for Business Logic or cross-domain rules.

---

## 7.2 Global Standards Platform

**Goal:** Define all international standards utilized by reference entities. No actual data entities are instantiated in this phase.

- **Supported Standards:** ISO 3166 (Countries), ISO 639 (Languages), ISO 4217 (Currencies), UN M49 (Geographic Regions), BCP 47 (Locales), Unicode CLDR, IANA Time Zone Database. Additional standards require ARB approval.
- **Standard Contracts:** Every standard must define its Identifier, Official Code, Version, Source, Effective Date, and Metadata.
- **Official Sources Policy:** Reference data must only be imported from official, globally recognized bodies (ISO, UN, IANA, etc.). Unofficial sources are strictly prohibited as primary references.

---

## 7.3 Reference Resolution Foundation

**Goal:** Build the unified engine responsible for executing all Resolution contracts defined in 7.1, converting abstract interfaces into consumable enterprise services.

- **Resolution Engine Responsibilities:** Name Resolution, Alias Resolution, Historic Name Resolution, Native Name Resolution, Localized Name Resolution, External Identifier Resolution, Provider Name Resolution.
- **External Identifier Mapping:** The engine maps Provider IDs, Legacy IDs, and Third-party Codes to their internal `Canonical Identity`.
- **Resolution Strategy:** The engine natively resolves a reference entity regardless of the input vector (Official Name, Local Name, Native Name, Abbreviations, Historical Names, Common Misspellings, or External Provider Names), reliably pointing to a single, canonical reference entity.

---

## 7.4 Global Geographic Platform

**Goal:** Establish the unified geographic reference platform for MANARATAK, acting as the sole official source for all geographic data utilized by other platforms. (Contains no business logic or scholarship-specific data).

- **Responsibilities:** Continents, Geographic Regions, Countries, States / Provinces, Administrative Divisions, Cities, Timezones, Calling Codes, Postal Code Patterns.
- **Country as Canonical Anchor:** Country acts as the absolute canonical anchor for all country-related information across the ecosystem. Country MUST be referenced by all future bounded contexts including: Universities, Scholarships, Academic Programs, Visas, Content, Search, AI, Analytics, and Student Services. No downstream domain may create its own Country entity.
- **Country:** Possesses Canonical Identity, ISO Code, Official Name, Native Name, Localized Names, Capital, Region, Subregion, Timezones, Calling Codes, Nationalities, Administrative Divisions, and Metadata.
- **Administrative Divisions:** Supports States, Provinces, Governorates, Prefectures, Territories, and Municipalities, preserving varied global administrative models.
- **Cities:** Modeled as independent reference entities linked to a Country and an Administrative Division.
- **Timezones:** Entirely reliant on the IANA Time Zone Database (Timezone Identifier, UTC Offset, DST Support, Display Names). No temporal calculation logic is implemented here.
- **Calling Codes:** Country Calling Code, International Prefix, National Prefix. (Does not include phone number validation logic).
- **Postal Code Patterns:** Represents the official formatting pattern, description, and format. (Does not execute actual validation logic).
- **Geographic Relationships:** Region → Country, Country → Administrative Division, Administrative Division → City, Country → Timezone, Country → Calling Code, Country → Postal Pattern.

### Country Profile Foundation

`ReferenceCountry` exposes canonical identity and standard reference attributes only. A separate downstream `CountryStudyDestinationProfile` may reference the stable country ID to build complete Study Destination pages; Phase 07 does not own its editorial content, workflow, KPIs, rankings, or marketing attributes. Examples of downstream profile areas include:

- Country Overview
- Education Overview
- Study Destination Overview
- Government Resources
- Official Websites
- Student Information
- Cultural Information
- Geography
- Climate
- Economy Summary

### Country Extension Contracts

The Country Profile must support extension contracts for future platforms to contribute domain-specific information. These are references only; Phase 7 does NOT own these datasets. Examples include:

- **Phase 11 (Universities & Institutions):** Contributes university records
- **Phase 12 (Scholarships & Financial Aid):** Contributes scholarship offerings
- **Academic Programs Context:** Contributes course & program catalogs
- **Admissions & Visa Services:** Contributes visa & immigration information
- **Content & Knowledge Base:** Contributes country articles
- **Enterprise AI Services (Phase 17):** Contributes AI insights
- **Analytics & Reporting Platform:** Contributes country statistics
- **Enterprise Search Platform:** Contributes search index projections

### Architectural Rules

- Phase 7 owns Country identity only.
- Future platforms own their own business data.
- Country pages aggregate information from multiple platforms.
- Aggregation never duplicates data.
- Country remains the Single Source of Truth (SSoT).

---

## 7.5 Language & Localization Platform

**Goal:** Establish the reference platform for all language and localization data within the ecosystem.

- **Responsibilities:** Languages, Locales, Scripts, Writing Systems, Language Metadata.
- **Languages:** Contains ISO Code, Official Name, Native Name, English Name, RTL/LTR flag, Script, and Locale References.
- **Locales:** Language, Region, Locale Code, Formatting Rules (e.g., ar-YE, ar-SA, en-US, zh-CN).
- **Writing Systems:** Latin, Arabic, Han, Cyrillic, etc.
- **RTL / LTR:** Defines Text Direction and Display Direction for UI support.
- **Localization Metadata:** Display Names, Native Display, Translation Status, Locale Metadata.

---

## 7.6 Currency Platform

**Goal:** Provide centralized reference data for global currencies.

- **Responsibilities:** Currencies, Currency Standards, Currency Formatting.
- **Currency Entity:** ISO Code, Symbol, Official Name, Decimal Precision, Numeric Code, Country Relationships.
- **Currency Formatting:** Decimal Separator, Thousands Separator, Symbol Position.
- **Out of Scope:** Exchange Rates, Financial Calculations, Currency Conversion workflows.

---

## 7.7 Nationality Platform

**Goal:** Manage nationality references and citizenship relationships.

- **Responsibilities:** Nationalities, Citizenship References, Country Relationships.
- **Nationality Entity:** Canonical Identity, Country Reference, Masculine Form, Feminine Form, Localized Names, Metadata.
- **Citizenship:** Supports Primary Citizenship and Multiple Citizenship References. (Contains no visa or residency logic).

---

## 7.8 Education Reference Platform

**Goal:** Provide general education reference data devoid of specific university or scholarship logic.

- **Responsibilities:** Education Levels, Degree Types, Qualification Levels, Academic Systems, Credit Systems, Study Modes, Attendance Modes.
- **Education Levels:** Primary, Secondary, Diploma, Bachelor, Master, Doctorate, Postdoctoral.
- **Degree Types:** Academic Degree, Professional Degree, Diploma, Certificate.
- **Qualification Levels:** Official educational tiers decoupled from specific national systems.
- **Academic Systems:** Semester, Trimester, Quarter, Annual.
- **Credit Systems:** Credit Hours, ECTS, etc. (No credit conversion logic).
- **Study Modes:** Full Time, Part Time, Online, Hybrid, Distance Learning.
- **Attendance Modes:** On Campus, Remote, Mixed.
- **Out of Scope (Roadmap Dependencies):** `Academic Taxonomy` (Phase 8) and `International Tests` (Phase 9) are explicitly excluded and will be built in subsequent phases. No platform dependent on them may commence development prior to their completion.

---

### Non-Functional Requirements (Architectural)

All aforementioned reference platforms must guarantee:

- **High Availability:** Continuous uptime for all consuming platforms.
- **Read Optimized:** Architected primarily for heavy read-throughput over write-operations.
- **Low Latency:** Millisecond response times for reference data queries.
- **Horizontal Scalability:** Scalable without altering underlying contracts.
- **Cache Friendly:** Highly compatible with in-memory caching solutions.
- **Thread Safe:** Supports high concurrency without race conditions.
- **Deterministic Resolution:** Identical resolution inputs must consistently yield identical canonical outputs.

---

## 7.9 Catalog Framework

**Goal:** Establish a generic, extensible framework for managing Catalogs across the ecosystem, enabling future platforms to register their own specific catalogs without modifying the core Reference Data platform.

- **Principles:** Domain-agnostic framework, devoid of business logic, structurally extensible, multilingual, versioned, lifecycle-aware, metadata-driven.
- **Responsibilities:** Catalog Definitions, Registration, Versioning, Localization, Metadata, Extensions.
- **Catalog Definition:** Canonical Identity, Display Name, Internal Name, Version, Lifecycle, Localization, Metadata.
- **Registration Contracts:** Consumer platforms can register custom catalogs (e.g., Scholarships -> "Scholarship Status Catalog", Visa Services -> "Visa Type Catalog") without altering Phase 07 architecture.
- **Catalog Extension:** Supports injecting extra Metadata, Localization, and Additional Attributes dynamically.
- **Out of Scope:** Instantiating domain-specific catalogs (e.g., Scholarship Status, Application Status) is strictly prohibited in Phase 7; they belong to their respective domains.

---

## 7.10 Cross Reference Mapping

**Goal:** Establish internal structural relationships between disparate reference entities independently of consumer platform constraints.

- **Responsibilities:** Mapping entities such as Countries, Languages, Nationalities, Currencies, Regions, Timezones, Education References.
- **Examples:** Country ↔ Currency, Country ↔ Language, Country ↔ Nationality, Country ↔ Timezone, Country ↔ Postal Pattern, Country ↔ Administrative Division.
- **Mapping Rules:** Every mapping must possess an independent identity, support Versioning and Lifecycles, contain Metadata, and prohibit duplication.
- **Canonical Mapping:** Each reference relationship is defined once canonically within the system; duplicating relationships in downstream platforms is prohibited.

---

## 7.11 Reference Data Import Specification

**Goal:** Provide the authoritative domain specification for ingesting, mapping, validating, and seeding reference datasets into the MANARATAK 2.0 platform.

### Architectural Boundary with Phase 06 (Import Foundation)

- **Phase 06 (Import Foundation):** Provides the generic, universal import pipeline framework (`Source`, `Provider`, `Configuration`, `Pipeline`, batching, worker queues, error tracking). Phase 06 possesses ZERO domain knowledge of reference data entities.
- **Phase 07 (Enterprise Reference Data):** Owns all domain-specific reference data field definitions, entity schemas, transformation and mapping rules, validation rules (ISO compliance, referential integrity, DAG cycle checks), and import acceptance criteria. Phase 07 consumes Phase 06 pipeline abstractions to execute bulk reference data ingestion.

### Scope of Imported Reference Datasets

Phase 07 defines explicit import schemas and rules for the following 10 canonical reference datasets:

1. **Countries:**
   - _Fields & Standards:_ ISO 3166-1 alpha-2, alpha-3, numeric codes, canonical English name, native name, localized names dictionary, capital city, UN subregion, calling code, postal code format regex, flag asset key, lifecycle state.
   - _Validation Rules:_ Mandatory ISO 3166 compliance; unique alpha-2, alpha-3, and numeric codes across the ecosystem.

2. **Currencies:**
   - _Fields & Standards:_ ISO 4217 code, symbol, official English name, native name, decimal exponent (e.g., 2 for USD, 0 for JPY), numeric code.
   - _Validation Rules:_ Unique ISO 4217 code; exponent must be a non-negative integer.

3. **Languages:**
   - _Fields & Standards:_ ISO 639-1 (two-letter), ISO 639-2 (three-letter), ISO 639-3 codes, canonical English name, native name, text direction (`ltr` | `rtl`), script identifier.
   - _Validation Rules:_ Unique ISO codes; valid text direction indicator.

4. **Regions:**
   - _Fields & Standards:_ UN M49 region/subregion code, parent region code (for continental hierarchy), canonical name, localized names dictionary.
   - _Validation Rules:_ Polyhierarchical DAG validation with cycle detection; mandatory UN M49 parent reference for subregions.

5. **Administrative Divisions:**
   - _Fields & Standards:_ Country public ID, division code (ISO 3166-2), division type (State, Province, Governorate, Prefecture, Territory, Municipality), canonical name, native name, localized names dictionary.
   - _Validation Rules:_ Valid parent Country public ID; unique division code per country.

6. **Time Zones:**
   - _Fields & Standards:_ IANA Time Zone Database identifier (e.g., `Asia/Riyadh`), UTC standard offset, DST offset, abbreviation, canonical name.
   - _Validation Rules:_ Must exist in standard IANA tz database release; valid offset format.

7. **Standard Codes:**
   - _Fields & Standards:_ Authority name (ISO, UN, IANA, CLDR), standard code identifier, category, description, effective date, deprecation flag.
   - _Validation Rules:_ Unique combination of Authority + Standard Code Identifier.

8. **Country-Currency Mappings:**
   - _Fields & Standards:_ Country public ID, Currency ISO code, `isLegalTender` flag, `isPrimaryCurrency` flag, effective date range.
   - _Validation Rules:_ References must resolve to valid existing Country and Currency entities; exactly one primary currency per country per effective date range.

9. **Country-Language Mappings:**
   - _Fields & Standards:_ Country public ID, Language ISO code, `isOfficialLanguage` flag, `isSpokenLanguage` flag, `percentageOfPopulation` (optional).
   - _Validation Rules:_ References must resolve to valid existing Country and Language entities.

10. **Country-Timezone Mappings:**
    - _Fields & Standards:_ Country public ID, Timezone IANA ID, `isPrimaryTimezone` flag.
    - _Validation Rules:_ References must resolve to valid existing Country and Timezone entities.

### Ingestion Acceptance Criteria

- 100% of imported records must pass Phase 07 schema and validation pipeline rules.
- Partial failures in bulk imports must isolate failed records into Phase 06 error tracking tables without corrupting clean reference records.
- All relationships (country-currency, country-language, country-timezone) must strictly maintain referential integrity with canonical entities.

---

## 7.12 Seed Strategy & Finalization

**Goal:** Define the data ingestion strategy and establish the criteria for the Final Architecture Review prior to Phase 7 baseline approval.

### Seed Strategy

- **Official Sources:** Strictly limited to ISO, UN, IANA, Unicode CLDR, and globally recognized bodies. Unofficial sources are rejected.
- **Seed Contracts:** Seed Definitions, Seed Sources, Seed Metadata, Seed Validation Rules, Seed Versioning, Seed Update Strategy.
- **Import Integration:** Seed ingestion utilizes the `Universal Import Framework` (Phase 6) via generic contracts, avoiding tight coupling to import implementation details.

### Final Architecture Review

Prior to Phase 7 approval, the following must be validated:

- **Identity Validation:** All entities possess a stable Canonical Identity.
- **Standards Validation:** All references map to official standards.
- **Resolution Validation:** All resolution queries collapse into a single Canonical Identity.
- **Mapping Validation:** All relationships are accurate and deduplicated.
- **Integration Validation:** All platforms are forced through the Integration Layer.

## 7.13 Generic Hierarchy & DAG Foundation

**Goal:** Establish a purely infrastructural, domain-agnostic foundation for modeling, validating, and querying polyhierarchical and Directed Acyclic Graph (DAG) reference structures across the enterprise.

- **Purpose:** To provide reusable hierarchy contracts, cycle detection, and closure table persistence patterns so that future taxonomy and reference platforms (e.g., Academic Taxonomy, Skills Taxonomy) do not duplicate complex graph logic.
- **Architectural Position:** Sits within the Phase 7 Reference Foundation. It provides infrastructure to be consumed by downstream domain platforms.
- **Responsibilities:** Polyhierarchy modeling, Path resolution, Cycle detection, Closure table traversal.
- **Scope:** Strictly limited to infrastructure modeling. It MUST NOT contain any domain-specific business logic (e.g., no Academic or Skills logic).
- **Design Principles:** Single Source of Truth (SSoT), Foundation Reuse, Separation of Concerns, DRY (Don't Repeat Yourself), Zero Upward Dependency, and Architecture Before Implementation.
- **Relationships:**
  - Consumes: Phase 5.9 Cache Foundation, Phase 5.11 Event Foundation, Phase 7.1 Reference Foundation, Phase 7.3 Reference Resolution Foundation.
  - Provides to: Downstream consumers like Academic Taxonomy, Occupations Taxonomy, and Skills Taxonomy.

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

Phase 7 is deemed complete ONLY when:

1. All reference contracts are approved.
2. Reference Foundation is complete.
3. Global Standards Platform is complete.
4. Resolution Engine is complete.
5. All Core Reference Platforms are complete.
6. Catalog Framework is complete.
7. Cross Reference Mapping is complete.
8. Integration Contracts are complete.

### Deliverables

- Enterprise Reference Data Platform Architecture.
- Canonical Reference Foundation.
- Global Standards Platform.
- Reference Resolution Foundation.
- Global Geographic Platform.
- Language & Localization Platform.
- Currency Platform.
- Nationality Platform.
- Education Reference Platform.
- Catalog Framework.
- Cross Reference Mapping.
- Reference Integration Layer.

### Architecture Review Checklist

- **Architecture:** Are all entities utilizing Canonical Identity? Are all contracts documented? Is Business Logic completely absent? Are Circular Dependencies eliminated? Is Zero Upward Dependency strictly enforced?
- **Standards:** Are all codes mapped to international standards? Are sources exclusively official? Is Versioning defined per standard?
- **Resolution:** Do all aliases map to a single canonical reference? Does the system support Official, Native, and Historic names? Is External Identifier Mapping defined?
- **Mapping:** Are all relationships unique and deduplicated? Do relationships support Versioning and Lifecycles?
- **Integration:** Do all platforms traverse the Integration Layer? Is direct data access physically blocked? Are integration contracts agnostic of implementation?

### ARB Decision

Upon completion of all three parts, **Phase 7 — Enterprise Reference Data Platform** is designated as a finalized architectural specification and stands as the authoritative reference baseline for the MANARATAK 2.0 ecosystem.
This document may NOT be modified post-approval without explicit authorization from the ARB, documented via an Architecture Decision Record (ADR), to ensure unwavering architectural stability and absolute compatibility across all subsequent enterprise platforms.

**Note:** ADR-7.13 has been fully incorporated into the official baseline.

### Status

- **Current Status:** Baselined Architecture Specification

---

### Navigation

- **Previous**: [Phase 06 — Import Foundation](../../phase-06-import-foundation/)
- **Next**: [Phase 07 — Domain Contracts](phase-07-02-domain-contracts.md)
