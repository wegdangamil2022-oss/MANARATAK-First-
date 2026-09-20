# MANARATAK 2.0: Phase 5.13 ApiFoundation Architecture Baseline

## Architecture Baseline

**Revision:** 5.13.0  
**Status:** APPROVED  
**Architecture Baseline:** FROZEN  
**Phase:** 5.13  
**Layer:** Domain / Enterprise Architecture

---

## 1. Vision

The Enterprise API Foundation Services platform provides the definitive, provider-neutral representation of all logical API definitions across the MANARATAK 2.0 ecosystem. It serves as the single source of truth for the structure, versioning, and lifecycle of API services, abstracting the "intent" of an interface from its physical transport mechanism.

## 2. Purpose

The platform establishes a standardized language for defining how services communicate, ensuring that API contracts are treated as first-class domain citizens. It enables the enterprise to manage its service surface area without dependency on specific physical protocols or remote call mechanisms.

## 3. Scope

The platform models the logical existence and structural metadata of API services.

- **In-Scope:** API identity (internal), official cross-context references, logical contracts, endpoint metadata, operation signatures, versioning, lifecycle states, and exposure intent.
- **Out-of-Scope:** Physical protocol implementations, transport layers, routing, serialization, endpoint hosting, request processing, authentication, authorization, rate limiting, and API Gateway orchestration.

## 4. Responsibilities

- **API Service Identity:** Strictly internal, immutable identification of an API service.
- **API Service Reference:** The official, immutable cross-context Value Object for referencing API services.
- **API Contract Modeling:** Defining the logical structure of inputs and outputs (intent-only).
- **Endpoint Representation:** Abstract definition of where operations are logically grouped.
- **Operation Metadata:** Modeling the behavior and requirements of service calls (logical signatures).
- **Versioning Management:** Tracking the evolution of API definitions through immutable versions.
- **Lifecycle Management:** Governing the transition from creation to archiving (logical intent).
- **Owner Abstraction:** Maintaining a generic, provider-neutral reference to service ownership without understanding business meaning.
- **Exposure Intent:** Modeling the logical intent to expose an API without specifying the physical protocol.

## 5. Non-Responsibilities

- **Transport Execution:** Handling physical requests, streams, or queries.
- **Routing & Hosting:** Physical endpoint hosting, routing, and traffic management.
- **Serialization:** Converting domain models to physical wire formats.
- **Security Enforcement:** Implementing physical credential validation or identity checks.
- **Operational Concerns:** Load balancing, caching, or traffic routing.
- **Documentation Generation:** Producing protocol-specific documentation files.

## 6. Bounded Context

The API Foundation Context is a supporting subdomain that provides the infrastructure for interface governance. It is consumed by business domains to register their external-facing capabilities.

## 7. Core Concepts

### 7.1. ApiService (Aggregate Root)

The primary entity representing a logical API surface. It encapsulates the internal identity, official reference, owner reference, current definition, lifecycle status, and exposure intent.

### 7.2. ApiServiceDefinition (Value Object)

A permanently immutable blueprint containing the collection of endpoints and operations that constitute a specific version of the API.

### 7.3. EndpointDefinition (Value Object)

A permanently immutable logical identifier for a specific access point within a service, describing "what" can be accessed.

### 7.4. OperationDefinition (Value Object)

A permanently immutable abstract representation of a single action available on an endpoint.

### 7.5. ApiVersion (Value Object)

A structural marker that distinguishes one immutable state of an API definition from another.

## 8. Bounded Context Model

### 8.1. Aggregates

- **ApiService:**
  - `ApiServiceId` (Strictly Internal Identity)
  - `ApiServiceReference` (Official Cross-Context Identifier)
  - `ApiOwnerReference` (Logical Owner Reference - Generic)
  - `ApiServiceDefinition` (Immutable Structural Blueprint)
  - `ApiVersion` (Immutable Versioning Marker)
  - `ApiLifecycleState` (Logical Lifecycle Enum)
  - `ApiContractMetadata` (Logical contract properties)
  - `CompatibilityMetadata` (Versioning compatibility markers)
  - `ExposureIntent` (Marker for logical exposure status)
  - `ApiMetadata` (Extended logical context)

**Purity Rule:** `ApiService` must never contain business entities, transport-specific implementations, protocol-specific metadata, serialization rules, runtime hosting state, or infrastructure execution details.

### 8.2. Value Objects

- **ApiServiceReference:** The official, immutable cross-context reference for an API Service. Business domains must use this exclusively.
- **ApiOwnerReference:** A generic, provider-neutral reference to the service owner. The platform does not understand the business meaning of the owner.
- **ApiServiceDefinition:** Permanently immutable set of endpoints and operations.
- **EndpointDefinition:** Permanently immutable logical name and purpose.
- **OperationDefinition:** Permanently immutable metadata regarding logical inputs and outputs.
- **ApiVersion:** Permanently immutable structural versioning.

## 9. Domain Services

### 9.1. ApiCompatibilityService

Validates whether a new `ApiServiceDefinition` is logically compatible with existing versions based on defined enterprise rules.

### 9.2. ApiLifecycleService

Orchestrates the logical transitions of an API service (e.g., preventing the archiving of an "Activated" service without prior "Deprecation").

## 10. Repository Contracts

All repository interactions must follow the **Specification Pattern**.

- **IApiServiceRepository:**
  - `save(apiService: ApiService): Promise<void>`
  - `findBy(specification: ISpecification<ApiService>): Promise<ApiService[]>`

## 11. Business Rules

- **Reference Uniqueness:** `ApiServiceReference` must be unique enterprise-wide and is the only reference exposed to other domains.
- **Definition Immutability:** `ApiServiceDefinition`, `EndpointDefinition`, `OperationDefinition`, and `ApiVersion` are permanently immutable. Any modification requires the creation of a completely new `ApiService`.
- **Contract Boundary:** The Domain defines only logical contracts. Protocol mapping and transport implementation are entirely outside the Domain boundary.

## 12. Lifecycle States

- **CREATED:** The API is defined but not yet ready for consumption.
- **ACTIVATED:** The API is officially published and available for logical binding.
- **DEPRECATED:** The API is still active but marked for future removal.
- **ARCHIVED:** The API is no longer active and is logically removed.

## 13. Domain Events

- **ApiServiceCreatedEvent:** Emitted when a new API service is registered.
- **ApiServiceActivatedEvent:** Emitted when an API service becomes available.
- **ApiVersionPublishedEvent:** Emitted when a new immutable definition version is released.
- **ApiServiceDeprecatedEvent:** Emitted when a service is marked as nearing end-of-life.
- **ApiServiceArchivedEvent:** Emitted when a service is logically decommissioned.

## 14. Cross-Context Relationships

- **Business Domains:** Consume `ApiServiceReference` to associate their logic with an enterprise API contract.
- **Infrastructure:** Listens for `ApiVersionPublishedEvent` to configure physical transport listeners (routers, gateways) based on the logical metadata.

## 15. Architectural Constraints

- **Provider Neutrality:** The domain must never contain references to transport protocols or data formats.
- **Clean Architecture:** Strict separation between the logical "Intent" and the physical "Implementation."
- **Immutability:** Structural definitions are frozen once associated with a version.

## 16. Risks and Recommendations

- **Risk:** Developers may attempt to leak protocol-specific terminology into the `EndpointDefinition`.
- **Recommendation:** Strict PR reviews and automated linting to ensure "Endpoint" names remain logical (e.g., "StudentProfileAccess" vs. "PhysicalAccessPath").

## 17. Architecture Decision Records (ADR)

### ADR-1: Provider Neutrality

- **Context:** MANARATAK 2.0 must be capable of running on various infrastructure stacks.
- **Decision:** The API Foundation Platform will use abstract terms for all concepts.
- **Consequences:** The system is immune to shifts in physical transport and communication technologies.

### ADR-2: API Ownership

- **Context:** Accountability for service maintenance.
- **Decision:** Every `ApiService` must have an `ApiOwnerReference`.
- **Consequences:** Clear governance and contact points for service changes.

### ADR-3: API Definition Immutability

- **Context:** Ensuring absolute stability of service contracts.
- **Decision:** `ApiServiceDefinition`, `EndpointDefinition`, `OperationDefinition`, and `ApiVersion` are permanently immutable. Any modification to a service's structure requires the creation of a completely new `ApiService` with a new `ApiServiceReference`.
- **Consequences:** Eliminates the risk of implicit breaking changes and simplifies discovery.

### ADR-4: API Lifecycle Ownership

- **Context:** Managing the transition of services between logical states.
- **Decision:** The Domain owns ONLY the logical lifecycle transitions. Physical exposure, routing, protocol handling, serialization, hosting, version publishing, and runtime execution belong exclusively to Infrastructure.
- **Consequences:** Centralized governance independent of specific deployment technologies.

### ADR-5: Transport Boundary

- **Context:** Decoupling intent from implementation.
- **Decision:** The Domain defines the logical "Intent" (Exposure Intent and Contract); Infrastructure performs the physical "Transport" (Hosting and Protocol).
- **Consequences:** The core remains clean and protocol-agnostic.

### ADR-6: Contract Boundary

- **Context:** Defining service interfaces.
- **Decision:** The Domain defines logical contracts (Inputs/Outputs intent); Infrastructure handles physical mapping (Serialization/Format).
- **Consequences:** Protection of the domain from shifts in serialization standards.

### ADR-7: Versioning Boundary

- **Context:** Evolution of service structure.
- **Decision:** Any change to the logical structure requires a new `ApiVersion` and a new immutable `ApiServiceDefinition`, resulting in a new `ApiService` instance.

---

## 18. FINAL ARCHITECTURE CERTIFICATION

The ARB certifies that:

- **ApiServiceReference** is the official cross-context API Service reference.
- **ApiServiceId** remains strictly internal to the API Foundation Platform.
- **ApiOwnerReference** is the exclusive abstraction for referencing external ownership.
- **ApiService** contains only provider-neutral metadata, immutable API service definitions, immutable endpoint definitions, immutable operation definitions, immutable API version information, compatibility metadata, lifecycle metadata, logical API contract metadata, and logical exposure intent.
- **ApiServiceDefinition** is permanently immutable.
- **EndpointDefinition** is permanently immutable.
- **OperationDefinition** is permanently immutable.
- **ApiVersion** is permanently immutable.
- Any modification to an API definition, endpoint definition, operation definition, or API version requires creation of a completely new ApiService.
- **API Definition** is completely separated from API Exposure.
- The **Domain** owns only the logical lifecycle of API Services.
- The **Domain** defines only logical API contracts and logical exposure intent.
- **Physical protocol mapping, routing, transport, serialization, hosting, version publication, endpoint exposure and runtime execution** remain exclusively Infrastructure responsibilities.
- **Repository contracts** follow the Specification Pattern.
- **Domain Events** are restricted to business-significant lifecycle transitions only.
- The platform contains no infrastructure assumptions.
- The platform contains no vendor-specific terminology.

---

## 19. OFFICIAL ARB DECISION

**Status:** APPROVED  
**Decision:** The Enterprise API Foundation Services Architecture is hereby declared the permanent Architecture Baseline for Phase 5.13.

No further architectural modifications, redesigns, structural changes, feature additions, or scope expansions are permitted unless initiated through a formal Architecture Review Board (ARB) Change Request approved by the Project Owner.

---

### Navigation

- **Previous**: [Phase 5.12 Workflow Implementation Baseline](../Workflow/phase-05-12-workflow-implementation-baseline.md)
- **Next**: [Phase 5.13 API Foundation Implementation Baseline](phase-05-13-apifoundation-implementation-baseline.md)
