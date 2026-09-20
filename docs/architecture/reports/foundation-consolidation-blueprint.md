# MANARATAK 2.0
# P0-3 Prevent Reimplementation of Core Foundations
# Phase 2 — Enterprise Foundation Consolidation Blueprint

## 1. Executive Summary
This document serves as the official Enterprise Foundation Consolidation Blueprint. Its purpose is to define the architectural strategy to prevent the reimplementation of enterprise technical foundations across MANARATAK 2.0, while strictly preserving the autonomy of Domain-Driven Design (DDD) boundaries. By resolving the root causes identified in Phase 1—such as the Quasi-Shared Kernel Syndrome and misinterpretations of DDD decoupling—this blueprint establishes a centralized, well-governed catalog of Enterprise Foundations. It ensures that technical capabilities are implemented exactly once, without forcing domains to become unofficial frameworks or dependency hubs.

## 2. Root Cause Resolution
- **Missing Centralized Enterprise Shared Foundations**: Addressed by establishing a formal `Enterprise Shared Contracts` layer that sits below all bounded contexts, providing universal abstractions (like `IEnterpriseDomainEvent` and `IRepository<T>`).
- **Quasi-Shared Kernel Syndrome**: Solved by explicitly extracting generic interfaces and algorithms (e.g., from Phase 7 Reference Data) into the Shared Kernel or Foundation layers, ensuring no single business domain acts as an infrastructure dependency hub.
- **Incorrect Ownership & Misinterpretation of DDD**: Clarified by distinguishing between "Domain Business Logic" (which must not be shared) and "Enterprise Technical Capabilities" (which must be shared). Cross-cutting concerns like CQRS orchestration and API responses will now be owned by the Application Layer and Shared Contracts, not by individual domains.

## 3. Enterprise Foundation Blueprint
The blueprint reorganizes shared capabilities into a tiered architecture:
- **Enterprise Shared Contracts**: The lowest level of dependencies. Contains interfaces and standard envelopes (Events, API Responses) required for inter-domain and infrastructure communication.
- **Shared Kernel**: Contains universally applicable, side-effect-free utilities and algorithms (e.g., `ICycleDetectionValidator`, Data Mappers) that do not contain business rules.
- **Core Infrastructure**: Contains the concrete implementation of generic technical capabilities (e.g., the centralized `IIdentifierGenerator`).
- **Application Layer (Shared Orchestration)**: Contains orchestration patterns like generic CQRS command/query dispatchers.
- **Domain Layer**: Retains absolute ownership of business rules, domain-specific specifications, and state machines.

## 4. Capability Ownership Matrix

| Capability | Current Location | Target Owner | Target Classification | Justification |
| --- | --- | --- | --- | --- |
| `IReferenceRepository<T>`, `IClosureTableRepository<T>` | Phase 7 | Core Foundation | Shared Contracts | Universal structural data access patterns that all domains require. |
| `ISpecification<T>` | Phase 8 | Core Domain | Shared Kernel | The specification pattern is a standard DDD concept, not specific to Academic Taxonomy. |
| `IEnterpriseDomainEvent` | Phase 13 / Phase 7 | Event Foundation | Shared Contracts | Events must be universally shaped for a central Event Bus to route them effectively. |
| `IApiResponse<T>` | Phase 7 | API Foundation | Shared Contracts | API response envelopes must be uniform across the entire enterprise gateway. |
| CQRS Interfaces (`IQueryService<T>`) | Phase 7 | Core Application | Application Contract | CQRS orchestration is an application-level concern, not a domain data concern. |
| `GenerateMajorIdentifier()` | Phase 10 | Core Infrastructure | Enterprise Infrastructure | Infrastructure must provide a generic `GenerateCanonicalId(prefix)` to prevent domain leakage. |
| `ICycleDetectionValidator` | Phase 7 | Validation Foundation | Shared Kernel | Graph cycle detection is a generic computer science algorithm, not business logic. |

## 5. Dependency Matrix
**Dependency Rules:**
- **Allowed**: Domains may depend on Enterprise Shared Contracts and the Shared Kernel.
- **Forbidden**: A Domain MUST NOT depend on another Domain's technical abstractions. Infrastructure MUST NOT depend on Domain-specific terminology (e.g., "Major").
- **Direction**: Dependencies must flow strictly inward: Presentation -> Infrastructure/Application -> Domain -> Shared Kernel -> Shared Contracts.

## 6. Enterprise Foundation Catalog

### 6.1 Data Access Foundation
- **Category**: Shared Contracts / Infrastructure
- **Responsibility**: Provides `IRepository<T>`, `IQueryRepository<T>`, and `IClosureTableRepository<T>`.
- **Owner**: Core Foundation
- **Consumers**: All Domains

### 6.2 Event & Integration Foundation
- **Category**: Shared Contracts
- **Responsibility**: Provides `IEnterpriseDomainEvent` and `IIntegrationEvent` envelopes.
- **Owner**: Event Foundation
- **Consumers**: All Domains, Message Broker

### 6.3 CQRS & API Orchestration
- **Category**: Application Contract
- **Responsibility**: Provides `IApiResponse<T>`, `IQueryService<T>`, `ICommandService<T>`.
- **Owner**: Core Application
- **Consumers**: Presentation Layer, Application Services

### 6.4 Identity Generation Foundation
- **Category**: Enterprise Infrastructure
- **Responsibility**: Provides a generic `IIdentifierGenerator.GenerateCanonicalId(string prefix)`.
- **Owner**: Core Infrastructure
- **Consumers**: Application Services, Domain Factories

### 6.5 Generic Algorithm Kernel
- **Category**: Shared Kernel
- **Responsibility**: Provides `ICycleDetectionValidator` and mapping utilities.
- **Owner**: Core Foundation
- **Consumers**: Domains requiring tree/graph validation or universal DTO mapping.

## 7. Migration Strategy
- **Priority**: High. Fragmented contracts block the successful integration of the Event Bus and central API Gateway.
- **Order**: 
  1. Extract and publish `Enterprise Shared Contracts`.
  2. Refactor Phase 7 (Reference Data) to depend on the new shared contracts, stripping it of its "Quasi-Shared Kernel" status.
  3. Migrate downstream domains (Phase 8, 10, 13) to use the centralized contracts instead of redefining them.
- **Compatibility**: Create temporary type aliases (e.g., `export type IReferenceEvent = IEnterpriseDomainEvent`) to prevent immediate compiler breakage during the transition.
- **Verification**: Ensure that unit tests for cycle detection, CQRS, and events pass across all domains after realignment.

## 8. Governance Rules
- **Ownership**: The Architecture Review Board (ARB) exclusively owns the Enterprise Shared Contracts and Shared Kernel.
- **ARB Approval**: No new cross-cutting technical interface (e.g., a new Base Repository or Event Envelope) may be introduced within a Bounded Context without ARB approval.
- **Extension Policy**: Domains may extend the Shared Contracts (e.g., `interface ICourseCreated : IEnterpriseDomainEvent`), but must never redefine the base contract itself.

## 9. Risks
- **Refactoring Friction**: Domains that have tightly coupled their business logic to localized infrastructure interfaces may require significant refactoring.
- **Over-Centralization Risk**: Developers might mistakenly push domain-specific validation logic into the Shared Kernel to "reuse" it, recreating a God Module. This must be strictly policed by the ARB.

## 10. Recommendations
- Implement a rigid linting rule that prevents one domain folder (e.g., `packages/domain/src/learning-platform`) from importing from another domain folder (e.g., `packages/domain/src/reference-data`).
- Treat `Enterprise Shared Contracts` as an immutable versioned API package to force careful consideration before modifying enterprise abstractions.

GO to Architecture Review Board Validation
