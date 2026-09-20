---
Title: Enterprise Shared Contracts Specification
Document Status: APPROVED
Architecture Program: Enterprise Shared Contracts Consolidation Program
Version: 1.0
Owner: Architecture Review Board (ARB)
Project: MANARATAK 2.0
Last Updated: 2026-07-21
---

# Enterprise Shared Contracts Specification

## 1. Purpose
This specification establishes the permanent architectural source of truth for all enterprise shared contracts across MANARATAK 2.0.

## 2. Scope
This specification governs cross-cutting abstractions, base classes, marker interfaces, and shared enterprise logic utilized by all business domains.

## 3. Shared Kernel Boundary
- **Purpose**: Provide reusable, domain-agnostic base types.
- **Responsibilities**: Base entity modeling, persistence contracts, event definitions, identity generation, error handling.
- **Ownership**: ARB / Platform Engineering Team.
- **Consumers**: All bounded contexts, domain packages, and implementation apps.
- **Dependency Rules**: The Shared Kernel may not depend on any specific business domain.

## 4. Enterprise Shared Contracts Catalog
- **Entity**: Base class for mutable domain objects with identity (`packages/core/src/domain/Entity.ts`).
- **AggregateRoot**: Marker interface and base class for aggregate cluster roots.
- **ValueObject**: Immutable representation of domain concepts.
- **Identity**: Universal ID wrapper (`Identifier<T>`).
- **IRepository<T>**: Canonical application persistence abstraction.
- **IUnitOfWork**: Transactional boundary abstraction.
- **DomainEvent / IntegrationEvent**: Contracts for inter-domain messaging.
- **Result / Error Models**: Standardized error handling and API response mapping.
- **ILifecycle<TState>**: Canonical base interface for all lifecycles (`packages/core/src/domain/ILifecycle.ts` and C# `Enterprise.Architecture.Shared.Contracts.ILifecycle<TState>`).
- **MappingStatus**: Canonical enum governing cross-standard / cross-test mapping validation states (`Pending`, `Verified`, `Deprecated`).

## 5. Dependency Rules
- **Allowed**: Domain layers depend on `packages/core/src/domain`. Application layers depend on `packages/core/src/application`.
- **Forbidden**: `packages/core` depending on `packages/domain` or `apps`.
- **Circular Prevention**: Imposed through strict layer linting.

## 6. Ownership Rules
- **Canonical Namespace (Docs)**: `MANARATAK.ReferenceData.Domain.Foundation.Contracts`
- **Canonical Module (Runtime)**: `packages/core`
- **Versioning Policy**: Semantic Versioning. Breaking changes require ARB approval.

## 7. Extension Rules
- Domain modules may extend `Entity` and `ValueObject` via class inheritance.
- Applications must implement `IRepository` interfaces within infrastructure layers without altering the domain contract.
- Plugin models must depend exclusively on generic interfaces.

## 8. Governance Rules
- Modifications require an ARB Change Request.
- ADRs must be published for significant base class structural alterations.

## 9. Compatibility Matrix
- **Phases 7**: Fully compatible (Provider of reference contracts).
- **Phases 8-13**: Compatible but requires documentation alignment for phantom namespace removal.

## 10. Future Evolution Guidelines
Future iterations will introduce strict integration event schemas and potentially migrate generic TypeScript shared logic to an independently versioned internal NPM package registry.
