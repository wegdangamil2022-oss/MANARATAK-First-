# MANARATAK 2.0: Phase 5.18 Configuration Architecture Baseline

## Architecture Design Document

**Status:** APPROVED  
**Revision:** 5.18.0  
**Phase:** 5.18  
**Date:** 2026-07-16  
**Architecture Baseline:** FROZEN

---

## 1. Vision

To establish a provider-neutral, logical Single Source of Truth (SSoT) for configuration governance across MANARATAK 2.0. The Configuration Foundation provides a unified framework for defining the "intent" and "structure" of configuration, separating the logical definition of settings from their physical resolution and runtime application.

## 2. Purpose

The Configuration Foundation governs the logical modeling of system settings. It provides a consistent referencing mechanism (`ConfigurationReference`) for all bounded contexts to declare their configuration needs without coupling to specific environment variables, configuration servers, or secret management infrastructure.

## 3. Scope

### 3.1 In-Scope

- **Logical Configuration Modeling:** Defining the abstract structure, keys, and schemas of configuration settings.
- **Configuration Identity & Referencing:** Global identification via immutable references (`ConfigurationReference`).
- **Configuration Value Definition:** Modeling abstract values or value placeholders associated with configurations.
- **Configuration Classification:** Modeling logical configuration categories (e.g., SYSTEM, APPLICATION, FEATURE, INFRASTRUCTURE).
- **Configuration Version Management:** Semantic versioning of configuration definitions.
- **Configuration Lifecycle Governance:** Managing the lifecycle states of the configuration aggregate (e.g., Created, Activated, Archived).
- **Configuration Intent:** Modeling the logical intent and justification for the configuration.
- **Configuration Ownership Assignment:** Neutral referencing of configuration owners via `ConfigurationOwnerReference`.
- **Configuration Metadata:** Abstract structural metadata for configuration intent.

### 3.2 Out-of-Scope (The Platform Must Never Know)

- **Configuration Loading:** No knowledge of how settings are fetched or loaded from disk or network.
- **Configuration Resolution:** No knowledge of environment variable resolution, environment lookup, secret unwrapping/resolution, or override logic.
- **Configuration Distribution:** No knowledge of how configuration is broadcasted or distributed to services.
- **Configuration Caching:** No knowledge of runtime caching strategies.
- **Configuration Injection:** No knowledge of how settings are injected into application components.
- **Runtime Application:** No knowledge of how configurations are applied or used at runtime.
- **Environment Access:** No knowledge of OS-level environment variables or local files (e.g., `.env`).
- **Infrastructure Services:** No knowledge of configuration providers (e.g., Consul, etcd, ZooKeeper, Spring Cloud Config [note: external comparative example only; ADR-025 governs the active Node.js/TypeScript stack], AWS Parameter Store, AWS AppConfig, Azure App Configuration, Google Secret Manager, HashiCorp Vault, Feature Flag Platforms, Cloud Providers, Infrastructure SDKs).

## 4. Bounded Context

The Configuration Foundation operates as a **Generic Subdomain**. It provides the governance framework used by all other Bounded Contexts to declare their configuration requirements. Business domains must reference Configurations exclusively through `ConfigurationReference`.

---

## 5. Domain Model

### 5.1 Aggregate Roots

#### 5.1.1 Configuration

The Aggregate Root representing a logical configuration entity.

- **ConfigurationId:** Strictly internal, immutable aggregate identifier.
- **ConfigurationReference:** Official, immutable cross-context reference Value Object.
- **ConfigurationOwnerReference:** Provider-neutral owner identifier Value Object.
- **ConfigurationDefinition:** Immutable blueprint of the configuration keys and structural requirements.
- **ConfigurationValueDefinition:** Immutable declaration of logical values or value types.
- **ConfigurationClassification:** Immutable declaration of logical categorization.
- **ConfigurationMetadata:** Immutable logical annotations for intent.
- **ConfigurationVersion:** Immutable semantic version of the configuration.
- **ConfigurationLifecycle:** The current governing state of the configuration definition.
- **ConfigurationIntent:** The logical purpose and justification for the configuration.

### 5.2 Value Objects

- **ConfigurationReference:** The exclusive cross-context identifier. Business domains must never expose `ConfigurationId`.
- **ConfigurationOwnerReference:** A generic abstraction for configuration ownership (opaque identifier). The foundation never owns business entities and never understands the business meaning of the owner.
- **ConfigurationDefinition:** Permanently immutable declaration of configuration purpose and structural schema.
- **ConfigurationValueDefinition:** Permanently immutable declaration of logical values (e.g., default values, type constraints).
- **ConfigurationClassification:** Permanently immutable declaration of logical sensitivity or scope (e.g., PUBLIC_SENSITIVE, INTERNAL_SYSTEM).
- **ConfigurationVersion:** Permanently immutable semantic version (Major, Minor, Patch).
- **ConfigurationMetadata:** Map-based logical annotations for enrichment.
- **ConfigurationIntent:** Immutable description of the logical goal of the configuration.

### 5.3 Enums

- **ConfigurationLifecycleState:**
  - `CREATED`: Configuration registered but not yet active.
  - `ACTIVATED`: Configuration is official and ready for infrastructure resolution.
  - `DEPRECATED`: Configuration is discouraged for new implementations.
  - `ARCHIVED`: Configuration is logically retired.

---

## 6. Domain Services

- **ConfigurationValidationService:** Ensures a configuration definition is logically sound and structurally complete.
- **ConfigurationLifecycleService:** Orchestrates logical transitions between lifecycle states.

## 7. Repository Contracts

Repositories follow the **Specification Pattern** exclusively.

- **IConfigurationRepository:**
  - `save(config: Configuration): Promise<void>`
  - `findBy(specification: ISpecification<Configuration>): Promise<Configuration[]>`

---

## 8. Business Rules

- **Identity Secrecy:** External contexts must reference configurations exclusively via `ConfigurationReference`.
- **Definition Immutability:** Once a `ConfigurationDefinition` or `ConfigurationValueDefinition` is associated with a `ConfigurationVersion`, it cannot be changed. Any modification requires the creation of a completely new `Configuration` aggregate instance.
- **Versioning Requirement:** Any structural or value-intent change requires a new `Configuration` aggregate instance with a new immutable version.
- **Owner Neutrality:** The foundation manages only the reference to the owner via `ConfigurationOwnerReference`. The platform never understands the business meaning of the owner and never owns business entities.
- **Lifecycle Integrity:** Transitions must follow authorized paths (e.g., `CREATED` -> `ACTIVATED`).
- **Intent Purity:** The Domain defines only logical configuration intent. Actual configuration resolution and application remain entirely outside the Domain boundary.

---

## 9. Domain Events

Restricted to business-significant lifecycle transitions only.

- **ConfigurationCreatedEvent:** Dispatched when a new configuration intent is registered.
- **ConfigurationActivatedEvent:** Dispatched when a configuration becomes official and ready for infrastructure resolution.
- **ConfigurationVersionPublishedEvent:** Dispatched when a new immutable version is published.
- **ConfigurationDeprecatedEvent:** Dispatched when a configuration is deprecated.
- **ConfigurationArchivedEvent:** Dispatched when a configuration is retired.

Operational events (loading, resolution, distribution, caching, injection, runtime application) are strictly forbidden.

---

## 10. Architecture Decision Records (ADR)

### ADR-1: Provider Neutrality

- **Decision:** The Domain and Application layers shall contain no references to environment variables, configuration servers, or secret managers.
- **Rationale:** To ensure absolute decoupling from infrastructure-specific configuration delivery mechanisms.

### ADR-2: Configuration Ownership

- **Decision:** Configurations reference their logical owners only through the generic `ConfigurationOwnerReference` Value Object.
- **Rationale:** The Configuration Foundation must never own business entities or understand their business meaning.

### ADR-3: Configuration Definition Immutability

- **Decision:** `ConfigurationDefinition`, `ConfigurationValueDefinition`, and `ConfigurationVersion` are permanently immutable.
- **Rationale:** To maintain absolute structural integrity; any modification requires the creation of a completely new `Configuration` aggregate.

### ADR-4: Configuration Lifecycle Ownership

- **Decision:** The Domain owns only the logical lifecycle of Configurations.
- **Rationale:** Physical configuration loading, resolution, distribution, caching, injection, and runtime application belong exclusively to Infrastructure.

### ADR-5: Configuration Boundary

- **Decision:** The Domain defines only logical configuration intent.
- **Rationale:** Actual configuration resolution (reading files, OS environment, remote APIs) and application remain entirely outside the Domain boundary.

### ADR-6: Classification Boundary

- **Decision:** The Domain defines only logical classifications.
- **Rationale:** Mapping to technical security levels or storage tiers happens in Infrastructure.

### ADR-7: Versioning Boundary

- **Decision:** Every change to configuration definition or value intent requires a new immutable version and a new aggregate instance.
- **Rationale:** Ensures deterministic configuration states for compliance and stability.

---

## 11. Architectural Constraints

- **Dependency Rule:** `Domain <- Application <- Infrastructure <- API`.
- **Zero Leakage:** `ConfigurationId` must never be exposed outside the foundation.
- **No Runtime Side-effects:** The foundation manages definitions; it never "applies" configuration.

## 12. Risks & Recommendations

- **Risk:** Developers might use this to store large datasets or business state.
- **Recommendation:** Enforce strict metadata limits and clear documentation that this is for _configuration_ intents only.
- **Risk:** Naming collisions in `ConfigurationReference`.
- **Recommendation:** Implement a hierarchical reference naming convention (e.g., `context.module.feature`).

---

## 13. Official ARB Approval

**Revision:** 5.18.0  
**Status:** APPROVED  
**Architecture Baseline:** FROZEN

====================================================
OFFICIAL ARB DECISION
====================================================

The Enterprise Configuration Foundation Architecture is hereby declared the permanent Architecture Baseline for Phase 5.18.

No further architectural modifications, redesigns, structural changes, feature additions, or scope expansions are permitted unless initiated through a formal Architecture Review Board (ARB) Change Request approved by the Project Owner.

---

### Navigation

- **Previous**: [Phase 5.17 Security Implementation Baseline](../Security/phase-05-17-security-implementation-baseline.md)
- **Next**: [Phase 5.18 Configuration Implementation Baseline](phase-05-18-configuration-implementation-baseline.md)
