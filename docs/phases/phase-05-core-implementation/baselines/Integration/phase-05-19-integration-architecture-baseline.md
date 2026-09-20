# MANARATAK 2.0: Phase 5.19 Integration Architecture Baseline

## Architecture Design Document

**Status:** APPROVED  
**Revision:** 5.19.0  
**Phase:** 5.19  
**Date:** 2026-07-16  
**Architecture Baseline:** FROZEN

---

## 1. Vision

To establish a provider-neutral, logical governance framework for external capability representations across MANARATAK 2.0. The Integration Foundation serves as the Single Source of Truth for defining "what" an integration is and "what" capabilities it provides, strictly decoupling logical intent from physical execution, protocols, and transport.

## 2. Purpose

The Integration Foundation governs the logical lifecycle and definition of external system interactions. It allows bounded contexts to reference external capabilities via a stable `IntegrationReference` without coupling to specific APIs, protocols, or infrastructure-level transport logic.

## 3. Scope

### 3.1 In-Scope

- **Logical Integration Modeling:** Defining the abstract structure, intent, and justification for an external integration.
- **Integration Identity & Referencing:** Global identification via immutable references (`IntegrationReference`).
- **Integration Capability Definition:** Modeling the abstract capabilities or functions provided by the integration.
- **Integration Classification:** Modeling logical categories of integration (e.g., ANALYTICS, STORAGE, AUTHENTICATION, COMMUNICATION).
- **Integration Version Management:** Semantic versioning of integration definitions and capabilities.
- **Integration Lifecycle Governance:** Managing the states of the integration aggregate (e.g., Created, Activated, Archived).
- **Integration Intent:** Modeling the logical goal and business justification for the integration.
- **Integration Ownership Assignment:** Neutral referencing of owners via `IntegrationOwnerReference`.
- **Integration Metadata:** Abstract structural metadata describing the integration intent.

### 3.2 Out-of-Scope (The Platform Must Never Know)

- **Protocol Handling:** No knowledge of specific protocols or communication standards.
- **Transport & Networking:** No knowledge of sockets, connections, transport implementations, or networking stacks.
- **Payload Transformation:** No knowledge of data mapping, serialization, or payload transformations.
- **Execution:** No knowledge of how integrations are physically executed or invoked.
- **Synchronization:** No knowledge of state synchronization, data consistency, or messaging systems.
- **Operational Concerns:** No knowledge of retries, timeouts, scheduling, or circuit breaking.
- **Authentication Execution:** No knowledge of credential exchange or token management.
- **Infrastructure Services:** No knowledge of specific Cloud Providers, external SDKs, or API Clients.

## 4. Bounded Context

The Integration Foundation operates as a **Generic Subdomain**. It provides the vocabulary for all other Bounded Contexts to declare their external dependency needs. Business domains must reference Integrations exclusively through `IntegrationReference`.

---

## 5. Domain Model

### 5.1 Aggregate Roots

#### 5.1.1 Integration

The Aggregate Root representing a logical integration definition. Integration represents ONLY logical identity, governance, and intent.

- **IntegrationId:** Strictly internal, immutable aggregate identifier.
- **IntegrationReference:** Official, immutable cross-context reference Value Object.
- **IntegrationOwnerReference:** Provider-neutral owner identifier Value Object.
- **IntegrationDefinition:** Immutable blueprint of the integration purpose and scope.
- **IntegrationCapabilityDefinition:** Immutable declaration of logical functions/capabilities provided.
- **IntegrationClassification:** Immutable declaration of logical categorization.
- **IntegrationMetadata:** Immutable logical annotations for intent.
- **IntegrationVersion:** Immutable semantic version of the integration.
- **IntegrationLifecycle:** The current governing state of the integration definition.
- **IntegrationIntent:** The logical purpose and justification for the integration.

**It must never contain:**

- Business entities
- Protocol definitions
- Network endpoints
- Transport metadata
- Payload schemas
- Runtime synchronization state
- Infrastructure execution details

### 5.2 Value Objects

- **IntegrationReference:** The official cross-context reference Value Object. Business domains must never expose `IntegrationId`.
- **IntegrationOwnerReference:** A generic abstraction for integration ownership (opaque identifier). The foundation never owns business entities or understands their meaning.
- **IntegrationDefinition:** Permanently immutable declaration of integration purpose and intent.
- **IntegrationCapabilityDefinition:** Permanently immutable declaration of logical capabilities (e.g., READ_DATA, WRITE_DATA, NOTIFY).
- **IntegrationClassification:** Permanently immutable declaration of logical scope (e.g., THIRD_PARTY, INTERNAL_CORE, LEGACY).
- **IntegrationVersion:** Permanently immutable semantic version (Major, Minor, Patch).
- **IntegrationMetadata:** Map-based logical annotations for enrichment.
- **IntegrationIntent:** Immutable description of the logical goal of the integration.

### 5.3 Enums

- **IntegrationLifecycleState:**
  - `CREATED`: Integration intent registered but not yet operational.
  - `ACTIVATED`: Integration is official and ready for infrastructure implementation.
  - `DEPRECATED`: Integration usage is discouraged.
  - `ARCHIVED`: Integration is logically retired.

---

## 6. Domain Services

- **IntegrationValidationService:** Ensures an integration definition is logically consistent and meets governance standards.
- **IntegrationLifecycleService:** Orchestrates logical transitions between lifecycle states.

## 7. Repository Contracts

All repository contracts are standardized using the **Specification Pattern** exclusively. Repository-specific lookup methods are strictly forbidden.

- **IIntegrationRepository:**
  - `save(integration: Integration): Promise<void>`
  - `findBy(specification: ISpecification<Integration>): Promise<Integration[]>`

---

## 8. Business Rules

- **Identity Secrecy:** External contexts must reference integrations exclusively via `IntegrationReference`. `IntegrationId` remains strictly internal.
- **Definition Immutability:** `IntegrationDefinition`, `IntegrationCapabilityDefinition`, and `IntegrationVersion` are permanently immutable. Any modification requires the creation of a completely new `Integration`.
- **Versioning Requirement:** Any structural or capability-intent change requires a new `Integration` aggregate instance with a new immutable version.
- **Owner Neutrality:** The foundation manages only the reference to the owner via `IntegrationOwnerReference`, never the business meaning of the owner.
- **Lifecycle Integrity:** Transitions must follow authorized paths (e.g., `CREATED` -> `ACTIVATED`).
- **Boundary Purity:** The Domain defines ONLY logical integration intent. Actual integration execution remains entirely outside the Domain boundary.

---

## 9. Domain Events

Restricted to business-significant lifecycle transitions only.

- **IntegrationCreatedEvent:** Dispatched when a new integration intent is registered.
- **IntegrationActivatedEvent:** Dispatched when an integration becomes official and ready for infrastructure implementation.
- **IntegrationVersionPublishedEvent:** Dispatched when a new immutable version is published.
- **IntegrationDeprecatedEvent:** Dispatched when an integration is deprecated.
- **IntegrationArchivedEvent:** Dispatched when an integration is retired.

Operational events related to API Calls, Protocol Communication, Synchronization, Retries, Scheduling, Payload Transformation, and Infrastructure execution are strictly forbidden.

---

## 10. Architecture Decision Records (ADR)

### ADR-1: Provider Neutrality

- **Decision:** The Domain and Application layers shall contain no references to protocols, SDKs, or cloud providers.
- **Rationale:** To ensure absolute decoupling from infrastructure-specific transport and implementation details.

### ADR-2: Integration Ownership

- **Decision:** Integrations reference their logical owners only through the generic `IntegrationOwnerReference` Value Object.
- **Rationale:** The Integration Foundation must never own business entities or understand their business meaning.

### ADR-3: Integration Definition Immutability

- **Decision:** `IntegrationDefinition`, `IntegrationCapabilityDefinition`, and `IntegrationVersion` are permanently immutable.
- **Rationale:** Any modification requires the creation of a completely new `Integration` aggregate instance to ensure structural integrity.

### ADR-4: Integration Lifecycle Ownership

- **Decision:** The Domain owns only the logical lifecycle of Integrations.
- **Rationale:** Physical execution, protocol handling, transport, networking, synchronization, retries, scheduling, payload transformation, and external communication belong exclusively to Infrastructure.

### ADR-5: Integration Boundary

- **Decision:** The Domain defines ONLY logical integration intent and capability.
- **Rationale:** Actual execution (API calls, networking, payload transformation, transport) remains entirely outside the Domain boundary.

### ADR-6: Classification Boundary

- **Decision:** The Domain defines only logical classifications.
- **Rationale:** Mapping to specific technical protocols or security tiers happens in Infrastructure.

### ADR-7: Versioning Boundary

- **Decision:** Every change to integration definition or capability intent requires a new immutable version and aggregate instance.
- **Rationale:** Ensures deterministic integration states and prevents breaking changes in physical implementations.

---

## 11. Architectural Constraints

- **Dependency Rule:** `Domain <- Application <- Infrastructure <- API`.
- **Zero Leakage:** `IntegrationId` must never be exposed outside the foundation.
- **No Runtime Side-effects:** The foundation manages definitions; it never performs network operations.

## 12. Risks & Recommendations

- **Risk:** Over-complication of `IntegrationCapabilityDefinition`.
- **Recommendation:** Keep capability definitions at a high logical level (e.g., "Data Ingestion") rather than technical endpoint levels.
- **Risk:** Naming collisions in `IntegrationReference`.
- **Recommendation:** Use a scoped naming convention (e.g., `provider.service.capability`).

---

## 13. Official ARB Decision

**Status:** APPROVED  
**Revision:** 5.19.0  
**Architecture Baseline:** FROZEN

The Enterprise Integration Foundation Architecture is hereby declared the permanent Architecture Baseline for Phase 5.19.

No further architectural modifications, redesigns, structural changes, feature additions, or scope expansions are permitted unless initiated through a formal Architecture Review Board (ARB) Change Request approved by the Project Owner.

---

### Navigation

- **Previous**: [Phase 5.18 Configuration Implementation Baseline](../Configuration/phase-05-18-configuration-implementation-baseline.md)
- **Next**: [Phase 5.19 Integration Implementation Baseline](phase-05-19-integration-implementation-baseline.md)
