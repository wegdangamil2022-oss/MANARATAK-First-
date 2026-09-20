# MANARATAK 2.0
# P0-3 Prevent Reimplementation of Core Foundations
# Phase 3 — Enterprise Foundation Specification

## 1. Executive Summary
The Enterprise Foundation Specification serves as the definitive architectural reference for all shared technical capabilities within the MANARATAK 2.0 platform. Building upon the approved Phase 2 Blueprint, this specification rigorously untangles **Architectural Ownership** (the architectural area accountable for the capability's design and evolution) from **Canonical Location** (the physical package or module where the code resides). By establishing these strict definitions, the specification ensures that enterprise foundations are implemented exactly once, governed appropriately, and safely consumed by isolated Domain-Driven Design (DDD) bounded contexts without introducing lateral coupling.

## 2. Enterprise Foundation Specification
This specification dictates the canonical behavior and boundaries of the enterprise technical foundations. It enforces the principle that business logic remains exclusively within the domain, while infrastructural and cross-cutting concerns are elevated to universally accessible, strictly governed layers.

## 3. Capability Catalog

### 3.1 Data Access Abstractions
- **Purpose**: Provide a uniform API for data persistence and retrieval across all bounded contexts.
- **Responsibilities**: Define standard CRUD operations, hierarchical tree operations (closure tables), and transaction boundaries.
- **Public Contracts**: `IRepository<T>`, `IQueryRepository<T>`, `IClosureTableRepository<T>`.
- **Extension Points**: Domains may extend these interfaces (e.g., `IAcademicRepository<T> : IRepository<T>`) to add domain-specific query signatures.
- **Allowed Dependencies**: Domain primitives.
- **Forbidden Dependencies**: Infrastructure implementations (e.g., Entity Framework, SQL), or other specific domain entities.
- **Ownership**: Data Architecture
- **Canonical Location**: `Enterprise.Shared.Contracts`
- **Lifecycle**: Stable
- **Versioning Rules**: Semantic Versioning.
- **Compatibility Rules**: Backward compatible.

### 3.2 Domain Specification Pattern
- **Purpose**: Encapsulate business rules and query criteria in a reusable, chainable format.
- **Responsibilities**: Provide base abstractions for evaluating conditions (`IsSatisfiedBy`) and generating query expressions (`Criteria`).
- **Public Contracts**: `ISpecification<T>`.
- **Extension Points**: Domains inherit from this to create concrete rules (e.g., `CourseIsPublishedSpecification`).
- **Allowed Dependencies**: None.
- **Forbidden Dependencies**: Database contexts, ORM-specific expressions.
- **Ownership**: Architecture Review Board (ARB)
- **Canonical Location**: `Enterprise.Shared.Kernel`
- **Lifecycle**: Stable
- **Versioning Rules**: Semantic Versioning.
- **Compatibility Rules**: Backward compatible.

### 3.3 Event Envelopes
- **Purpose**: Standardize the shape of messages passing through the global Event Bus.
- **Responsibilities**: Ensure all events carry standard metadata (EventId, OccurredAt, CorrelationId) for audit, caching, and search indexing.
- **Public Contracts**: `IEnterpriseDomainEvent`, `IIntegrationEvent`.
- **Extension Points**: Domains implement these interfaces for their specific events.
- **Allowed Dependencies**: Base types.
- **Forbidden Dependencies**: Message broker specifics (e.g., Kafka, RabbitMQ dependencies).
- **Ownership**: Integration Architecture
- **Canonical Location**: `Enterprise.Shared.Contracts`
- **Lifecycle**: Stable
- **Versioning Rules**: Semantic Versioning.
- **Compatibility Rules**: Backward compatible JSON serialization.

### 3.4 CQRS & API Wrappers
- **Purpose**: Standardize application orchestration and HTTP response shapes.
- **Responsibilities**: Define the command/query handler shapes and the standard API envelope (`IApiResponse<T>`).
- **Public Contracts**: `IQueryService<T>`, `ICommandService<T>`, `IApiResponse<T>`.
- **Extension Points**: None. These are strict wrappers.
- **Allowed Dependencies**: Validation results, standard error types.
- **Forbidden Dependencies**: Domain logic.
- **Ownership**: Application Architecture
- **Canonical Location**: `Enterprise.Application.Contracts`
- **Lifecycle**: Stable
- **Versioning Rules**: Semantic Versioning.
- **Compatibility Rules**: Backward compatible API contracts.

### 3.5 Universal Identifier Generation
- **Purpose**: Provide deterministic, system-wide unique identifiers.
- **Responsibilities**: Generate prefix-based canonical IDs (e.g., `REF-CNT-US`) and distributed UUIDs.
- **Public Contracts**: `IIdentifierGenerator.GenerateCanonicalId(string prefix)`.
- **Extension Points**: Injectable strategies for ID generation formats.
- **Allowed Dependencies**: Cryptographic or UUID libraries.
- **Forbidden Dependencies**: Domain-specific terms (e.g., NO `GenerateMajorIdentifier()`).
- **Ownership**: Core Infrastructure
- **Canonical Location**: `Enterprise.Core.Infrastructure`
- **Lifecycle**: Stable
- **Versioning Rules**: Semantic Versioning.
- **Compatibility Rules**: Identifier format backwards compatibility.

### 3.6 Universal Algorithms & Utilities
- **Purpose**: Provide side-effect-free algorithms (like Cycle Detection) and data mapping.
- **Responsibilities**: Calculate graph cycles, map between DTOs and canonical identities.
- **Public Contracts**: `ICycleDetectionValidator`, `IDataMapper<TSource, TTarget>`.
- **Extension Points**: Custom mapping profiles.
- **Allowed Dependencies**: Generic collections.
- **Forbidden Dependencies**: Business domains.
- **Ownership**: Core Foundation
- **Canonical Location**: `Enterprise.Shared.Kernel`
- **Lifecycle**: Stable
- **Versioning Rules**: Semantic Versioning.
- **Compatibility Rules**: Backward compatible.

## 4. Ownership Matrix
*Note: Ownership refers to the architectural authority accountable for the design, not the publication location or specific implementation teams.*

| Capability | Architectural Owner | Accountability |
| --- | --- | --- |
| Data Access Abstractions | Data Architecture | Standardizing persistence patterns and ORM alignment. |
| Domain Specification Pattern | Architecture Review Board (ARB) | Ensuring DDD principles are uniformly applied. |
| Event Envelopes | Integration Architecture | Guaranteeing message routing and broker compatibility. |
| CQRS & API Wrappers | Application Architecture | Maintaining enterprise API schema consistency. |
| Universal Identifier Generation | Core Infrastructure | Ensuring collision-free, distributed ID generation. |
| Universal Algorithms & Utilities | Core Foundation | Maintaining highly optimized, generic computer science algorithms. |

## 5. Canonical Location Matrix
*Note: Location refers to the physical package or module where the code is compiled and stored.*

| Capability | Canonical Location | Justification |
| --- | --- | --- |
| Data Access Abstractions | `Enterprise.Shared.Contracts` | Must be referenced by all Domain and Infrastructure layers. |
| Domain Specification Pattern | `Enterprise.Shared.Kernel` | Pure DDD pattern containing logic but no infrastructure dependencies. |
| Event Envelopes | `Enterprise.Shared.Contracts` | Must be published globally for publisher/subscriber boundaries. |
| CQRS & API Wrappers | `Enterprise.Application.Contracts` | Sits at the application edge; prevents domain layers from depending on HTTP concerns. |
| Universal Identifier Generation | `Enterprise.Core.Infrastructure` | Concrete implementations require system/crypto dependencies; interfaces live in Shared Contracts. |
| Universal Algorithms & Utilities | `Enterprise.Shared.Kernel` | Mathematical and mapping operations safe to share across all contexts. |

## 6. Enterprise Foundation Registry

| Capability | Architectural Owner | Canonical Location | Current Version | Lifecycle | Status | Consumers | Compatibility | Replacement Policy | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Data Access Abstractions | Data Architecture | `Enterprise.Shared.Contracts` | 1.0.0 | Stable | Active | All Domains | Backward Compatible | Replace via deprecation cycle | Fundamental persistence contract |
| Domain Specification Pattern | Architecture Review Board (ARB) | `Enterprise.Shared.Kernel` | 1.0.0 | Stable | Active | All Domains | Backward Compatible | Replace via deprecation cycle | Enforces DDD querying |
| Event Envelopes | Integration Architecture | `Enterprise.Shared.Contracts` | 1.0.0 | Stable | Active | All Domains, Message Broker | Backward Compatible | Replace via deprecation cycle | Universal event messaging |
| CQRS & API Wrappers | Application Architecture | `Enterprise.Application.Contracts` | 1.0.0 | Stable | Active | Presentation Layer, App Services | Backward Compatible | Replace via deprecation cycle | HTTP orchestration |
| Universal Identifier Generation | Core Infrastructure | `Enterprise.Core.Infrastructure` | 1.0.0 | Stable | Active | Application Services, Domain Factories | Backward Compatible | Replace via deprecation cycle | Distributed ID generator |
| Universal Algorithms & Utilities | Core Foundation | `Enterprise.Shared.Kernel` | 1.0.0 | Stable | Active | Domains | Backward Compatible | Replace via deprecation cycle | Shared CS algorithms |

## 7. Dependency Rules
1. **The Inward Flow Rule**: `Application` depends on `Domain`. `Infrastructure` depends on `Application` and `Domain`. `Domain` depends ONLY on `Shared Kernel` and `Shared Contracts`.
2. **The Isolation Rule**: A bounded context (e.g., `Phase 13: Learning Platform`) MUST NEVER depend on another bounded context (e.g., `Phase 7: Reference Data`) for technical capabilities. Both must depend on `Enterprise.Shared.Contracts`.
3. **The Infrastructure Inversion Rule**: Infrastructure modules (like the Identifier Generator) must implement generic interfaces defined in Shared Contracts, unaware of the domains that invoke them.

## 8. Governance Rules
- **Ownership Transfer**: If a shared capability requires heavy modification for a specific domain, the ARB must evaluate if the capability should be branched or if the domain is violating standards.
- **Approval Process**: Any addition to the `Shared Kernel` or `Shared Contracts` requires a formal pull request review by the ARB.
- **Deprecation Strategy**: Deprecated shared contracts must be marked with `[Obsolete]` for a minimum of two major release cycles before removal.
- **Compatibility Guarantees**: Any contract listed in the Registry as Stable guarantees semantic versioning compatibility.
- **Extension Policy**: Interfaces in Shared Contracts are strictly open for extension but closed for modification (OCP).
- **Future Additions Policy**: If two or more domains implement the identical technical pattern independently, it automatically becomes a candidate for promotion to the Shared Kernel by the ARB.

## 9. Compatibility Strategy
- **Semantic Versioning**: All Shared Contracts and Shared Kernel packages will be strictly versioned (SemVer).
- **Alias Bridging**: During the migration, deprecated domain-specific interfaces (e.g., `IReferenceEvent`) will be temporarily maintained as type aliases mapping to the new canonical contract (e.g., `IEnterpriseDomainEvent`) to prevent instant compiler breakage.
- **Serialization Compatibility**: API Responses and Event Envelopes must maintain backward compatibility in JSON serialization, relying on optional fields during transition phases.

## 10. Risks
- **Over-Centralization Risk (The "God Foundation")**: Teams might attempt to push business logic into the `Shared Kernel` under the guise of "reuse." This must be strictly rejected during code review.
- **Coupling via Shared Utilities**: Over-reliance on generic Data Mappers can accidentally couple domain structures. Mappers must remain strictly confined to the application boundaries.
- **Version Hell**: If the `Shared Contracts` package updates too frequently with breaking changes, all domains will be forced into a perpetual state of refactoring. Strict API stability is mandated.

## 11. Recommendations
- Implement static analysis and architectural linting (e.g., using NetArchTest or equivalent) in the CI/CD pipeline to automatically reject illegal cross-domain dependencies.
- Establish an "Enterprise Sandbox" where proposed shared contracts can be modeled against at least two distinct domains before being officially adopted into the `Enterprise.Shared.Contracts` repository.

## 12. Consistency Report
- **Ownership**: Consistent across Capability Catalog, Ownership Matrix, and Enterprise Foundation Registry, using architectural scopes (e.g., Core Foundation) rather than implementation teams.
- **Canonical Locations**: Stable and unchanged.
- **Lifecycle**: Aligned with the Enterprise Lifecycle Framework (Experimental, Stable, Deprecated, Legacy, Internal).
- **Registry Alignment**: Registry fully matches the Capability Catalog.
- **Contradictions**: None detected.

GO to Phase 4 (Migration & Integration Plan)
