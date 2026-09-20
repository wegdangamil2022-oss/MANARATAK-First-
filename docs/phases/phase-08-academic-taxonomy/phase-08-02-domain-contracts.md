> **Note:** This phase references the [Enterprise Shared Contracts Specification](../../architecture/shared-contracts/03-enterprise-shared-contracts-specification.md) as the canonical architectural source for shared foundation contracts.

# MANARATAK 2.0: Phase8 PartB Domain Contracts

> **Note:** This phase references the [Enterprise Lifecycle Framework Specification](../../architecture/lifecycle-framework/03-enterprise-lifecycle-framework-specification.md) as the canonical architectural source for all state, status, and lifecycle governance.

## Part B — Domain Contracts

### Final Baseline v1.1

## 8.0 Introduction

This document defines the official Domain Contracts for Phase 8 (Academic Taxonomy). It translates the approved enterprise architecture (Part A) into strongly-typed TypeScript enterprise domain contracts.

---

## 8.6.B Academic Standards Contracts

_(Architectural Commentary: Defines contracts for academic standards, such as ISCED-F or CIP, extending `IReferenceEntity` from Phase 07.2.B to ensure shared canonical identity, localization, and lifecycle governance.)_

```typescript
import {
  IReferenceEntity,
  ReferenceLifecycleState,
} from '../phase-07-enterprise-reference-data/phase-07-02-domain-contracts';

export interface IAcademicStandardEntity extends IReferenceEntity {
  readonly standardType: string; // e.g., "ISCED-F", "CIP"
  readonly issuingAuthority: string; // e.g., "UNESCO", "NCES"
  readonly version: string;
  readonly effectiveDate: Date;
}
```

---

## 8.7.B Academic Hierarchy Contracts

_(Architectural Commentary: Defines the taxonomy polyhierarchy structure. By building upon the Generic Hierarchy & DAG Foundation from Phase 7 §7.13 / §7.9.B, Phase 08 inherits path resolution, ancestor/descendant tracking, and cycle detection.)_

```typescript
import {
  IHierarchyNode,
  IClosureTableRepository,
} from '../phase-07-enterprise-reference-data/phase-07-02-domain-contracts';

export interface IAcademicHierarchyNode extends IHierarchyNode {
  readonly academicStandardId: string;
  readonly standardCode: string;
  readonly isPrimaryParent: boolean;
}

export interface IAcademicClosureTableRepository extends IClosureTableRepository {
  // Inherits maintainClosureAsync, getAncestorsAsync, getDescendantsAsync, detectCycleAsync
  getAcademicPathAsync(nodeId: string, locale?: string): Promise<readonly string[]>;
}

export interface ICycleDetectionValidator {
  validateNoCyclesAsync(ancestorId: string, descendantId: string): Promise<boolean>;
}
```

---

## 8.8.B Academic Entity Contracts

_(Architectural Commentary: Defines canonical academic taxonomy entities and their persistence contracts. All academic entities implement `IReferenceEntity` from Phase 07 to guarantee identity, lifecycle state, versioning, and extensibility.)_

### 8.8.B.1 Entity Contracts

```typescript
export interface IAcademicTaxonomyEntity extends IReferenceEntity {
  readonly academicStandardId: string;
  readonly standardCode: string;
  readonly isLeaf: boolean;
}

export interface IAcademicFieldEntity extends IAcademicTaxonomyEntity {
  // Broadest classification (e.g., Broad Field in ISCED)
}

export interface IAcademicDisciplineEntity extends IAcademicTaxonomyEntity {
  // Narrower classification (e.g., Narrow Field)
}

export interface IAcademicProgramEntity extends IAcademicTaxonomyEntity {
  // Detailed program classification
}

export interface IAcademicSpecializationEntity extends IAcademicTaxonomyEntity {
  // Deepest level of study
}

export interface IAcademicCategoryEntity extends IAcademicTaxonomyEntity {
  // Generic categorization bucket used by standards
}
```

### 8.8.B.2 Repository Contracts

```typescript
import {
  IReferenceQueryRepository,
  IReferenceCommandRepository,
} from '../phase-07-enterprise-reference-data/phase-07-02-domain-contracts';

export interface IAcademicQueryRepository<
  T extends IAcademicTaxonomyEntity,
> extends IReferenceQueryRepository<T> {
  existsAsync(id: string): Promise<boolean>;
  getAllAsync(): Promise<readonly T[]>;
  getByStandardCodeAsync(standardCode: string): Promise<readonly T[]>;
}

export interface IAcademicCommandRepository<
  T extends IAcademicTaxonomyEntity,
> extends IReferenceCommandRepository<T> {
  // Inherits createAsync, updateAsync, supersedeAsync, deprecateAsync
}
```

---

## 8.9.B Academic Relationship Contracts

_(Architectural Commentary: Structurally separates lateral semantic relationships (e.g., equivalents, related fields) from the strict Parent/Child polyhierarchy. This keeps the DAG closure table free from non-hierarchical lateral associations.)_

```typescript
export type AcademicRelationshipType = 'Related' | 'Equivalent' | 'ReplacedBy';

export interface IAcademicSemanticRelationshipEntity extends IReferenceEntity {
  readonly sourceAcademicEntityId: string;
  readonly targetAcademicEntityId: string;
  readonly relationshipType: AcademicRelationshipType;
  readonly semanticWeight: number;
}
```

---

## 8.10.B Academic Resolution Contracts

_(Architectural Commentary: Consumes the Reference Resolution Foundation to resolve external, historic, or legacy terms into canonical `IAcademicTaxonomyEntity` nodes.)_

### 8.10.B.1 Resolution Contracts

```typescript
export interface IAcademicResolutionContext {
  readonly term: string;
  readonly locale?: string;
  readonly expectedStandardHint?: string;
}

export interface IAcademicResolutionOutcome {
  readonly isResolved: boolean;
  readonly resolvedEntityId?: string;
  readonly resolvedStandardCode?: string;
  readonly confidenceScore: number;
}

export interface IAcademicReferenceResolver {
  resolveAcademicTermAsync(
    context: IAcademicResolutionContext,
  ): Promise<IAcademicResolutionOutcome>;
}
```

### 8.10.B.2 Specification Contracts

```typescript
export interface IAcademicSpecification<T extends IAcademicTaxonomyEntity> {
  isSatisfiedBy(entity: T): boolean;
}
```

---

## 8.11.B Cross Standard Mapping Contracts

_(Architectural Commentary: Provides the capability to map entities between distinct standards (e.g., ISCED-F to CIP) securely.)_

```typescript
export type MappingEquivalencyLevel = 'ExactMatch' | 'BroadMatch' | 'NarrowMatch' | 'RelatedMatch';
export type MappingStatus = 'Pending' | 'Verified' | 'Deprecated';

export interface ICrossStandardMappingEntity extends IReferenceEntity {
  readonly sourceStandardId: string;
  readonly sourceAcademicEntityId: string;
  readonly targetStandardId: string;
  readonly targetAcademicEntityId: string;
  readonly equivalencyLevel: MappingEquivalencyLevel;
  readonly status: MappingStatus;
}
```

---

## 8.12.B Integration Contracts

_(Architectural Commentary: Defines integration boundaries, read-models/projections, and domain events for downstream consumers.)_

### 8.12.B.1 Projections

```typescript
export interface IAcademicNodeProjection {
  readonly id: string;
  readonly publicId: string;
  readonly standardCode: string;
  readonly name: string;
  readonly level: number;
  readonly isLeaf: boolean;
}
```

### 8.12.B.2 Domain Events

```typescript
import { IReferenceEvent } from '../phase-07-enterprise-reference-data/phase-07-02-domain-contracts';

export interface IAcademicEntityCreatedEvent extends IReferenceEvent {
  readonly standardCode: string;
}

export interface IAcademicHierarchyChangedEvent extends IReferenceEvent {
  readonly nodeId: string;
  readonly newParentId: string;
}
```

---

## 8.12.B.3 Import Match/Merge Ownership Contracts

To support incoming data from the Phase 06 Import Foundation without violating domain boundaries, this domain explicitly defines and owns the following lifecycle integration responsibilities:

- **Deterministic Match Key**: This domain defines and owns the academic taxonomy deterministic match keys (such as standard taxonomy codes and hierarchical path hashes) used to identify academic subject overlaps.
- **Completeness Policy**: This domain defines and owns all validation rules and structural criteria determining when academic taxonomy records are considered complete and eligible for operational activation.
- **Merge/Overwrite Policy**: This domain defines and owns the merge policies (such as source-authority hierarchies and structural mapping lockouts) that govern how incoming taxonomy updates merge with existing standards.
- **Final Approval/Publish**: This domain owns final approval, manual taxonomic mapping review, and active publication lifecycle state transitions.
- **Phase 06 Role**: The Phase 06 Import Foundation is restricted to delivering raw extraction proposals, taxonomy field diffs, and associated evidence and confidence metrics. It is strictly prohibited from writing directly to academic taxonomy tables.

---

## 8.13.B Contracts Review

_(Architectural Commentary: Final summary confirming adherence to Phase 8 architectural constraints.)_

- **Phase 7.1 (Reference Foundation):** Fully consumed via `IReferenceEntity` across all taxonomy entities, inheriting identity, metadata, and lifecycles. Zero duplication.
- **Phase 7.2 (Global Standards):** Fully aligned with Phase 07 standards tracking.
- **Phase 7.13 (Hierarchy & DAG):** Fully consumed via `IHierarchyNode` and `IClosureTableRepository`.
- **Phase 5 & 6 (Cache, IAM, Events, Import):** Integration points defined cleanly without redeclaring universal frameworks.
- **Implementation Strictness:** Zero concrete execution logic exists in Part B. All implementations are strictly deferred to Part C (Implementation Guide).

---

### Status

- **Current Status:** BASELINED / SOURCE_COMPLETE — RUNTIME_EVIDENCE_PENDING

---

### Navigation

- **Previous**: [Phase 08 — Enterprise Architecture Specification](phase-08-01-enterprise-architecture-specification.md)
- **Next**: [Phase 08 — Implementation Guide](phase-08-03-implementation-guide.md)
