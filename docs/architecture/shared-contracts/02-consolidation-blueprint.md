---
Title: Enterprise Shared Contracts Consolidation Blueprint
Document Status: APPROVED
Architecture Program: Enterprise Shared Contracts Consolidation Program
Version: 1.0
Owner: Architecture Review Board (ARB)
Project: MANARATAK 2.0
Last Updated: 2026-07-21
---

# Enterprise Shared Contracts Consolidation Blueprint

## 1. Executive Summary
This blueprint leverages the findings of the Discovery Audit to propose the official architectural consolidation of the Enterprise Shared Contracts for MANARATAK 2.0.

## 2. Canonical Foundation Decision
- **Official Enterprise Foundation**: A unified approach using `packages/core` as the single source of truth for canonical TypeScript runtime contracts and architectural specifications.
- **Strengths**: Capitalizes on existing production code and establishes a single, TypeScript-first standard across the entire platform.
- **Weaknesses**: Requires keeping active documentation and runtime types fully in sync.

## 3. Shared Contracts Ownership Matrix
| Concern | Official Owner | Official Module | Layer |
| --- | --- | --- | --- |
| `Entity`, `AggregateRoot` | Core Domain | `packages/core/src/domain` | Domain |
| `IRepository`, `IUnitOfWork` | Core Application | `packages/core/src/application` | Application |
| `IReferenceEntity` | Reference Foundation | `docs/phases/phase-07` | Architecture |
| `DomainEvent` | Core Domain | `packages/core/src/domain/events` | Domain |

## 4. Consolidation Matrix
- **KEEP**: `packages/core` implementation classes.
- **KEEP WITH MODIFICATION**: Phase 7 Reference Contracts (must normalize cross-references).
- **MERGE**: `IReferenceRepository` concepts into `packages/core/src/application/IRepository.ts` documentation equivalents.
- **DEPRECATE**: `docs/legacy/reference-foundation`.

## 5. Fragmentation Resolution Plan
- Replace generic `IRepository` usage in Phases 9-13 documentation with the canonical `IReferenceRepository` or `IReferenceQueryRepository` from Phase 7.
- Establish a single source of truth for runtime base classes in `packages/core`.

## 6. Phantom References Resolution
- **`Enterprise.Architecture.Phase5.*`**: Deprecated legacy namespace references. These are redirected to actual existing domain abstractions or standardized to the canonical TypeScript package `@manaratak/core-contracts`.

## 7. Shared Package Decision
- **`packages/shared`**: Promoted to Enterprise Shared Kernel for cross-cutting utility functions.
- **`packages/types`**: Retained as global TypeScript type definitions repository.

## 8. Canonical TypeScript Interface Strategy
- **Documentation/Specification**: TypeScript Interfaces & Types
- **Runtime Implementation**: TypeScript Base Classes, Services, and Utilities
- **Consistency**: Architectural specifications guide the runtime interfaces; all domain packages must directly implement or extend the canonical TypeScript interfaces located in `packages/core`.

## 9. Required ADR List
1. **ADR-ESC-001**: Adoption of `packages/core` as canonical Runtime Shared Kernel.
2. **ADR-ESC-002**: Deprecation of Legacy Reference Foundation.
3. **ADR-ESC-003**: Remediation of Phantom Phase 5 Namespaces.

## 10. Priority Roadmap
1. Normalize existing Phase 8-13 documents to consume Phase 7 interfaces.
2. Formally deprecate `docs/legacy`.
3. Standardize `packages/core` exports.
