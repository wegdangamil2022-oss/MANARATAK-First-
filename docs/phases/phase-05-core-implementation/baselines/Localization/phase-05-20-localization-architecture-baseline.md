# MANARATAK 2.0: Phase 5.20 Localization Architecture Baseline

## Architecture Baseline

**Status:** APPROVED
**Revision:** 5.20.0
**Phase:** 5.20
**Date:** 2026-07-16
**Architecture Baseline:** FROZEN

---

## 1. Vision

To establish a provider-neutral, logical governance framework for localization definitions across MANARATAK 2.0. The Localization Foundation serves as the Single Source of Truth for defining "what" content requires localization and the logical structure of translations, strictly decoupling intent from translation engines, formatting libraries, and runtime rendering.

## 2. Purpose

The Localization Foundation governs the logical lifecycle and definition of localized content. It allows bounded contexts to reference localization resources via a stable `LocalizationReference` without coupling to specific translation services, language detection logic, or infrastructure-level formatting providers.

## 3. Scope

### 3.1 In-Scope

- **Logical Localization Modeling:** Defining the abstract structure and intent of localized resources.
- **Localization Identity & Referencing:** Global identification via immutable references (`LocalizationReference`).
- **Localization Definition:** Modeling the abstract blueprint of what needs to be translated.
- **Translation Definition:** Modeling the logical intent and key-value structure of translations.
- **Locale Definition:** Modeling the abstract representation of a locale (e.g., language/region codes).
- **Localization Classification:** Modeling logical categories (e.g., UI, SYSTEM, NOTIFICATION, LEGAL).
- **Localization Version Management:** Semantic versioning of localization resources.
- **Localization Lifecycle Governance:** Managing aggregate states (e.g., Created, Activated, Archived).
- **Localization Intent:** Modeling the logical purpose and business justification.
- **Localization Ownership Assignment:** Neutral referencing of owners via `LocalizationOwnerReference`.
- **Localization Metadata:** Abstract logical annotations.

### 3.2 Out-of-Scope (The Platform Must Never Know)

- **Translation Engines:** No knowledge of external translation services or automated engines.
- **Language Detection:** No knowledge of how languages are detected or negotiated.
- **Formatting:** No knowledge of specific number, date, or currency formatting logic.
- **Rendering:** No knowledge of how strings are rendered in the UI or distributed to clients.
- **Synchronization:** No knowledge of how translation resources are synchronized.
- **Infrastructure Implementations:** No knowledge of specific localization libraries or standard APIs.
- **Authentication:** No knowledge of access control for translation management systems.

## 4. Bounded Context

The Localization Foundation operates as a **Generic Subdomain**. It provides the vocabulary for all other Bounded Contexts to declare their localization needs. Business domains must reference Localizations exclusively through `LocalizationReference`.

---

## 5. Domain Model

### 5.1 Aggregate Roots

#### 5.1.1 Localization

The Aggregate Root representing a logical localization definition. Localization represents ONLY logical identity, governance, and intent.

- **LocalizationId:** Strictly internal, immutable aggregate identifier.
- **LocalizationReference:** Official, immutable cross-context reference Value Object. Business domains must reference Localizations exclusively through this reference.
- **LocalizationOwnerReference:** Provider-neutral owner identifier Value Object. The foundation never owns business entities or understands their meaning.
- **LocalizationDefinition:** Immutable blueprint of the localization resource.
- **TranslationDefinition:** Immutable declaration of logical translation keys and intended values.
- **LocaleDefinition:** Immutable logical identifier for the target locale.
- **LocalizationClassification:** Immutable declaration of logical categorization.
- **LocalizationMetadata:** Immutable logical annotations.
- **LocalizationVersion:** Immutable semantic version of the localization aggregate.
- **LocalizationLifecycle:** The current governing state of the localization resource.
- **LocalizationIntent:** The logical purpose and justification.

**It must never contain:**

- Business entities
- Runtime translated content
- Rendering metadata
- Formatting rules
- Translation engine metadata
- Runtime localization state
- Infrastructure execution details

### 5.2 Value Objects

- **LocalizationReference:** The official cross-context reference identifier.
- **LocalizationOwnerReference:** A generic abstraction for localization ownership.
- **LocalizationDefinition:** Permanently immutable blueprint of the localized resource.
- **TranslationDefinition:** Permanently immutable declaration of translation intents (keys/values).
- **LocaleDefinition:** Permanently immutable logical locale identifier (e.g., "en-US", "ar-SA").
- **LocalizationClassification:** Permanently immutable declaration of logical scope.
- **LocalizationVersion:** Permanently immutable semantic version (Major, Minor, Patch).
- **LocalizationMetadata:** Map-based logical annotations.
- **LocalizationIntent:** Immutable description of the logical goal.

### 5.3 Enums

- **LocalizationLifecycleState:**
  - `CREATED`: Localization intent registered.
  - `ACTIVATED`: Localization is official and ready for translation/consumption.
  - `DEPRECATED`: Localization usage discouraged.
  - `ARCHIVED`: Localization retired.

---

## 6. Domain Services

- **LocalizationValidationService:** Ensures localization definitions and translation structures meet governance standards.
- **LocalizationLifecycleService:** Orchestrates logical transitions between lifecycle states.

## 7. Repository Contracts

All repository contracts follow the **Specification Pattern** exclusively. Repository-specific lookup methods are strictly forbidden.

- **ILocalizationRepository:**
  - `save(localization: Localization): Promise<void>`
  - `findBy(specification: ISpecification<Localization>): Promise<Localization[]>`

---

## 8. Business Rules

- **Identity Secrecy:** External contexts must reference localizations exclusively via `LocalizationReference`. `LocalizationId` remains strictly internal.
- **Definition Immutability:** `LocalizationDefinition`, `TranslationDefinition`, `LocaleDefinition`, and `LocalizationVersion` are permanently immutable.
- **Versioning Requirement:** Any modification to content intent or structure requires a new `Localization` aggregate instance with a new version and reference.
- **Owner Neutrality:** The foundation manages only the reference to the owner via `LocalizationOwnerReference`.
- **Boundary Purity:** The Domain defines ONLY logical localization intent. Actual translation, rendering, and formatting remain entirely outside the Domain boundary.

---

## 9. Domain Events

Restricted to business-significant lifecycle transitions only.

- **LocalizationCreatedEvent:** Dispatched when a new localization intent is registered.
- **LocalizationActivatedEvent:** Dispatched when a localization becomes official and ready for infrastructure implementation.
- **LocalizationVersionPublishedEvent:** Dispatched when a new immutable version is published.
- **LocalizationDeprecatedEvent:** Dispatched when a localization is deprecated.
- **LocalizationArchivedEvent:** Dispatched when a localization is retired.

Operational events related to Machine Translation, Language Detection, Formatting, Localization Rendering, Synchronization, Runtime Localization, Content Distribution, and Infrastructure execution are strictly forbidden.

---

## 10. Architecture Decision Records (ADR)

### ADR-1: Provider Neutrality

- **Decision:** The Domain and Application layers shall contain no references to translation engines, formatting libraries, or infrastructure SDKs.
- **Rationale:** To ensure absolute decoupling from infrastructure-specific localization tools and communication standards.

### ADR-2: Localization Ownership

- **Decision:** Localizations reference their logical owners through the generic `LocalizationOwnerReference`.
- **Rationale:** The Localization Foundation must never own business entities or understand their business meaning.

### ADR-3: Localization Definition Immutability

- **Decision:** `LocalizationDefinition`, `TranslationDefinition`, `LocaleDefinition`, and `LocalizationVersion` are permanently immutable.
- **Rationale:** Any modification requires the creation of a completely new `Localization` instance to ensure data integrity and stability across references.

### ADR-4: Localization Lifecycle Ownership

- **Decision:** The Domain owns only the logical lifecycle of localizations.
- **Rationale:** Physical translation, language detection, formatting, localization rendering, synchronization, runtime localization and distribution belong exclusively to Infrastructure.

### ADR-5: Localization Boundary

- **Decision:** The Domain defines ONLY logical localization intent and translation structure.
- **Rationale:** Physical translation execution and formatting remains entirely outside the Domain boundary.

### ADR-6: Locale Boundary

- **Decision:** The Domain defines ONLY logical locale representations.
- **Rationale:** Parsing complex locale tags or managing locale hierarchies belongs to Infrastructure.

### ADR-7: Versioning Boundary

- **Decision:** Every change to a localization definition or translation intent requires a new immutable version and aggregate instance.
- **Rationale:** Prevents breaking changes in client applications consuming localized resources.

---

## 11. Architectural Constraints

- **Dependency Rule:** `Domain <- Application <- Infrastructure <- API`.
- **Zero Leakage:** `LocalizationId` must never be exposed outside the foundation.
- **No Runtime Side-effects:** The foundation manages definitions; it never performs translations or string formatting.

## 12. Risks & Recommendations

- **Risk:** Over-complication of `TranslationDefinition` with technical formatting placeholders.
- **Recommendation:** Use logical keys and abstract intent descriptions rather than raw ICU message patterns in the Domain.
- **Risk:** Naming collisions in `LocalizationReference`.
- **Recommendation:** Enforce a scoped naming convention (e.g., `app.view.component.key`).

---

## 13. Official ARB Decision

**Status:** APPROVED
**Revision:** 5.20.0
**Architecture Baseline:** FROZEN

The Enterprise Localization Foundation Architecture is hereby declared the permanent Architecture Baseline for Phase 5.20.

No further architectural modifications, redesigns, structural changes, feature additions, or scope expansions are permitted unless initiated through a formal Architecture Review Board (ARB) Change Request approved by the Project Owner.

---

### Navigation

- **Previous**: [Phase 5.19 Integration Implementation Baseline](../Integration/phase-05-19-integration-implementation-baseline.md)
- **Next**: [Phase 5.20 Localization Implementation Baseline](phase-05-20-localization-implementation-baseline.md)
