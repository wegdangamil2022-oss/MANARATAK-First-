# MANARATAK 2.0
# P0-3 Prevent Reimplementation of Core Foundations
# Phase 1 — Discovery & Inventory

## 1. Executive Summary
The Enterprise Architecture Review Board (ARB) has conducted an architectural discovery across Phases 07–13 to identify instances where enterprise technical foundations are being reimplemented or inappropriately defined within specific business domains. The review successfully identified multiple foundational patterns (CQRS, Events, Repositories, Pagination, Validation, API Responses) leaking into domain-specific contracts. This inventory provides the necessary visibility to extract these capabilities into universal Shared Contracts, preserving the purity and autonomy of individual bounded contexts.

## 2. Duplicate Foundation Inventory

| Component | Location | Duplicated Implementation | Existing Enterprise Equivalent | Reason Duplication Exists | Risk | Recommended Owner | Suggested Shared Location |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Base Repository Interfaces** | Phase 7 (`phase-07-02-domain-contracts.md`) | `IReferenceQueryRepository<T>`, `IReferenceRepository<T>`, `IClosureTableRepository<TNode>` | Core `IRepository<T>` | Defined to support Reference Data but represents universal structural patterns. | High. Leads to fragmented data access patterns across domains. | Architecture (ARB) | Shared Kernel / Foundation |
| **Specification Pattern** | Phase 8 (`phase-08-02-domain-contracts.md`) | `ISpecification<T>` | Core Domain `ISpecification` | Defined to filter Academic Taxonomy but is a universal DDD pattern. | High. Causes incompatible query logic and fragmented rule evaluations. | Architecture (ARB) | Shared Kernel / Foundation |
| **Domain Event Interfaces** | Phase 13 (`phase-13-02-domain-contracts.md`), Phase 7 | `IEnterpriseDomainEvent`, `IReferenceEvent` | Event Foundation | Declared inside the Learning Platform / Reference Data to support their own events. | High. Prevents a unified Enterprise Event Bus from consuming standardized envelopes. | Event Foundation | Shared Kernel / Foundation |
| **CQRS Base Services** | Phase 7 (`phase-07-02-domain-contracts.md`) | `IQueryService<T>`, `ICommandService<T>` | None | Defined to enforce CQRS in Reference Data. | Medium. Leads to varying orchestration patterns if each domain defines its own. | Architecture (ARB) | Core Application |
| **API Wrapper** | Phase 7 (`phase-07-02-domain-contracts.md`) | `IApiResponse<T>` | None | Defined to standardize Reference API outputs. | Medium. API consistency breaks if every domain defines its own envelope. | API Foundation | Infrastructure / Core |
| **Identifier Generation** | Phase 10 (`phase-10-03-implementation-guide.md`) | `IEnterpriseIdentifierGenerator.GenerateMajorIdentifier()` | None | Hardcoded specifically for `Major` generation. | Medium. Forces shared foundation to be polluted with domain-specific logic. | Foundation | Core Infrastructure |
| **Graph Validation** | Phase 7 (`phase-07-02-domain-contracts.md`) | `ICycleDetectionValidator`, `IHierarchyPathResolver` | None | Created to prevent circular references in Reference Trees. | Low. Cycle detection is a generic algorithm applicable to any tree structure. | Validation Foundation | Shared Kernel / Foundation |
| **Data Mapping** | Phase 7 (`phase-07-02-domain-contracts.md`) | `IDataMapper<TSource, TTarget>` | Mapping Helpers | Created for Universal Importer payloads. | Low. Duplicate mappers will proliferate across every integration point. | Foundation | Shared Kernel / Foundation |

## 3. Components that should become Enterprise Foundations
The following capabilities must be extracted from their respective domains and promoted to the Enterprise Shared Contracts or Core Foundations:
- **Repository Abstractions**: `IRepository<T>`, `IQueryRepository<T>`, `IClosureTableRepository<T>`
- **CQRS & API Wrappers**: `IQueryService<T>`, `ICommandService<T>`, `IApiResponse<T>`
- **Event Envelopes**: `IEnterpriseDomainEvent`, `IIntegrationEvent`
- **Specification Pattern**: `ISpecification<T>`
- **Generic Utilities**: `IEnterpriseIdentifierGenerator` (must be generic, e.g., `GenerateCanonicalId(prefix)`), `IDataMapper<T, U>`, `ICycleDetectionValidator`

## 4. Components that must remain Domain-owned
The ARB explicitly protects the following business logic components from being extracted into shared infrastructure:
- **Domain Repositories**: `IAcademicRepository`, `ITestRepository`, `IMajorRepository` must remain domain-owned, but they should inherit from the unified Enterprise `IRepository<T>`.
- **Domain Events**: `ICourseCreated`, `IMajorUpdatedEvent` must remain domain-owned, but they should implement the unified `IEnterpriseDomainEvent`.
- **Domain Specifications**: `IAcademicSpecification<T>`, `ITestSpecification<T>` must remain domain-owned, utilizing the shared `ISpecification<T>`.
- **Domain Identifiers**: The logic specifying *when* and *how* a Major ID is generated remains in the Phase 10 Command Handler. Only the generation mechanism is shared.

## 5. Risk Assessment
- **Missing Centralization**: By allowing domains (especially foundational ones like Phase 7 and Phase 13) to dictate enterprise-wide technical contracts (like CQRS, Events, and Specifications), MANARATAK 2.0 risks severe architectural divergence. Downstream domains will either tightly couple themselves to Phase 7/13 or reimplement these contracts entirely, resulting in integration failures across the Event Bus and Data Layers. 
- **Identifier Pollution**: Tying enterprise identifier generators to specific domains (`GenerateMajorIdentifier`) violates the Open/Closed Principle and creates an unsustainable bottleneck for the infrastructure teams whenever a new domain is introduced.

## 6. Initial Recommendations
1. **Consolidate Interfaces**: Extract `ISpecification<T>`, `IEnterpriseDomainEvent`, `IApiResponse<T>`, `IQueryService<T>`, and `ICommandService<T>` into a centralized Enterprise Shared Contracts baseline.
2. **Refactor Identifiers**: Replace domain-specific identifier generator methods with a generic `IIdentifierGenerator.GenerateCanonicalId(string domainPrefix)`.
3. **Standardize Base Repositories**: Promote `IClosureTableRepository<T>` and generic `IRepository<T>` abstractions to the data foundation, ensuring all domains inherit from a single source of truth without redefining them.

GO to Phase 2 (Enterprise Foundation Consolidation Blueprint)
