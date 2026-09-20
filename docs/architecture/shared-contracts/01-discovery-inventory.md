---
Title: Enterprise Shared Contracts Discovery & Inventory
Document Status: APPROVED
Architecture Program: Enterprise Shared Contracts Consolidation Program
Version: 1.0
Owner: Architecture Review Board (ARB)
Project: MANARATAK 2.0
Last Updated: 2026-07-21
---

# Enterprise Shared Contracts Discovery & Inventory

> ⚠️ **HISTORICAL AUDIT NOTICE**: All references to C# (`.cs`) interfaces, C# namespaces (e.g., `MANARATAK.ReferenceData.*`), and .NET structures in this and related phase documents are **superseded historical artifacts**. The canonical technology stack is 100% TypeScript/Node.js, and all active production architecture strictly standardizes on TypeScript interfaces defined in `/packages/core/`.

## 1. Executive Summary
This document provides a comprehensive, read-only audit of the existing MANARATAK 2.0 architecture to identify cross-cutting contracts, shared foundations, reusable abstractions, and enterprise base components.

## 2. Foundation Inventory
- **packages/core**: Contains application interfaces (`IUnitOfWork`, `IRepository`), domain base classes (`Entity`, `ValueObject`, `Identifier`), and monitoring/security contracts. **[CANONICAL SYSTEM OF RECORD]**
- **docs/legacy/reference-foundation**: Contains legacy C# interfaces (`IReferenceEntity`, `IReferenceRepository`). **[SUPERSEDED HISTORICAL ARTIFACT]**
- **docs/phases/phase-07**: Contains the official `MANARATAK.ReferenceData.Domain.Foundation.Contracts` with C# interfaces. **[SUPERSEDED HISTORICAL ARTIFACT - TypeScript is canonical]**
- **packages/shared**: Empty module designated for shared logic.
- **packages/types**: Designated for shared types.

## 3. Shared Contracts Inventory
| Contract Name | File/Location | Layer | Production Code? | Referenced? |
| --- | --- | --- | --- | --- |
| `IRepository<T>` | `packages/core/src/application/IRepository.ts` | Application | YES | YES |
| `IUnitOfWork` | `packages/core/src/application/IUnitOfWork.ts` | Application | YES | YES |
| `Entity<T>` | `packages/core/src/domain/Entity.ts` | Domain | YES | YES |
| `IAggregateRoot` | `packages/core/src/domain/events/IAggregateRoot.ts` | Domain | YES | YES |
| `IReferenceEntity` (C#) | `docs/phases/phase-07-enterprise-reference-data/phase-07-02-domain-contracts.md` | Legacy Docs | NO | YES (Historical) |
| `IReferenceRepository` (C#) | `docs/phases/phase-07-enterprise-reference-data/phase-07-02-domain-contracts.md` | Legacy Docs | NO | YES (Historical) |

## 4. Duplicate Contracts Report
- **`IRepository`**: Duplicated concept between TypeScript runtime (`packages/core`) and Phase documentation (`IReferenceRepository`, generic `IRepository` references in Phases 9-13).
- **`IReferenceEntity`**: Duplicated across Phase 7 docs and legacy `docs/legacy/reference-foundation`.

## 5. Phantom References Report
- `Enterprise.Architecture.Phase5.Persistence.Contracts`: Referenced by Phases 9-12, but missing from repository namespace (does not physically exist).
- `Enterprise.Architecture.Phase5.Messaging.Contracts`: Referenced by Phases 9-11, missing.
- `Enterprise.Architecture.Phase5.Events.Contracts`: Referenced by Phase 12, missing.

## 6. Canonical Source Report
- **Implementation Source**: `packages/core`
- **Documentation Source**: `docs/phases/phase-07` for Reference Data.
- **Experimental/Legacy**: `docs/legacy/reference-foundation`

## 7. Foundation Dependency Map
- Phase 7 -> Consumes foundation concepts, specifies reference architecture.
- Phases 8-13 -> Rely on Phase 7 base models, but introduce ghost namespaces.
- Runtime Apps -> Consume `packages/core` and `packages/domain`.

## 8. Architectural Risks
- Historical fragmentation between TypeScript implementation and legacy C# architecture documentation (now fully resolved in favor of TypeScript as canonical).
- Phantom namespaces create documentation rot.
- Duplicate and overlapping repository base interfaces.

## 9. Technical Debt Summary
- Missing alignment between phase architectural guidelines and runtime implementation.
- `packages/shared` and `packages/types` remain largely underutilized.

## 10. Findings Only
No modifications or solutions are proposed in this document. This represents purely factual discovery findings.
