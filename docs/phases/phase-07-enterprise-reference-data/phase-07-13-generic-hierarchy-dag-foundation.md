> **Note:** This phase references the [Enterprise Shared Contracts Specification](../../architecture/shared-contracts/03-enterprise-shared-contracts-specification.md) as the canonical architectural source for shared foundation contracts.

# MANARATAK 2.0: ADR 7.13 Generic Hierarchy DAG Foundation

**Document ID:** ADR-7.13  
**Title:** Generic Hierarchy & DAG Foundation  
**Project:** MANARATAK 2.0  
**Related Phase:** Phase 7 — Enterprise Reference Data Platform  
**Baseline:** Phase 7 Baseline v1.0  
**Target Baseline After Approval:** Phase 7 Baseline v1.1  
**Status:** APPROVED / BASELINED

---

## 1. Objective

This Architecture Decision Record proposes the addition of a new generic infrastructure component to the Phase 7 Enterprise Reference Data Platform.

The purpose of this ADR is to introduce a reusable Generic Hierarchy & Directed Acyclic Graph (DAG) Foundation that can be consumed by any future platform requiring hierarchical graph structures. This component MUST NOT contain any domain-specific logic and will serve strictly as foundational infrastructure.

---

## 2. Background

During the architecture design phase of Phase 8 (Phase 8 (Academic Taxonomy)), it became clear that implementing polyhierarchy (Directed Acyclic Graph - DAG) structures inside the Academic Taxonomy domain would violate the project's core architectural principles (specifically Domain Separation, DRY, and Zero Upward Dependency).

The hierarchy infrastructure is a highly reusable architectural pattern and will be required by multiple future platforms, including but not limited to:

- Academic Taxonomy
- Occupations Taxonomy
- Skills Taxonomy
- Knowledge Taxonomy
- Any future reference hierarchy

Therefore, the hierarchy infrastructure belongs inside the Phase 7 Foundation rather than isolated within Phase 8.

---

## 3. Architectural Decision

**Decision:** Add a new official section **7.13 Generic Hierarchy & DAG Foundation** to Phase 7.

This new foundation shall provide generic, highly reusable contracts for modeling, validating, and querying hierarchical reference entities across the enterprise.

### 3.1 The Foundation Contracts

The foundation shall include the following generic contracts to enforce consistency and reusability:

#### `IHierarchyNode<TNode>`

**Responsibilities:**

- Manage hierarchical relationships including Parent(s) and Children.
- Maintain the Path for materialized path queries.
- Track the depth/level of the node within the hierarchy (Level, Depth).
- Support polyhierarchy by designating an `IsPrimaryParent` flag for preferred visual traversal or standard reporting.

#### `IClosureTableRepository<TNode>`

**Responsibilities:**

- Facilitate efficient querying of deep polyhierarchical structures using the closure table pattern.
- Retrieve full ancestry (`GetAncestors`).
- Retrieve full sub-trees (`GetDescendants`).
- Retrieve direct lineage (`GetPath`).
- Identify top-level structures (`GetRootNodes`) and terminal elements (`GetLeafNodes`).

#### `ICycleDetectionValidator`

**Responsibilities:**

- Act as a mandatory Quality Gate during state mutation.
- Detect graph cycles (circular references) within the DAG.
- Prevent invalid hierarchy updates before they are committed to the persistence store.

#### `IHierarchyPathResolver`

**Responsibilities:**

- Calculate the shortest or optimal hierarchy path between nodes.
- Resolve the preferred display path using primary parent weighting.
- Support logic for fallback path selection when navigating polyhierarchies.

---

## 4. Non-Goals

To preserve strict domain separation and maintain infrastructural purity, this foundation **SHALL NOT** contain:

- Academic logic
- Occupation logic
- Skill logic
- Business rules
- Search logic
- Recommendation logic
- Import logic
- AI logic
- UI logic

It is exclusively an infrastructure and data-structure modeling foundation.

---

## 5. Dependencies

### Upstream Dependencies (Consumes)

- **Phase 5 Core Platform:** Consumes core foundational identity, CQRS, and persistence patterns.
- **Phase 7 Reference Foundation:** Builds upon existing Reference Data Entity and Metadata contracts.

### Downstream Consumers (Provides to)

- Phase 8 (Academic Taxonomy)
- Occupations Taxonomy
- Skills Taxonomy
- Any future platform requiring standardized hierarchical reference data modeling.

---

## 6. Alternatives Considered

### Alternative A: Implement DAG independently inside every platform

_Description:_ Allow each domain platform (Academic Taxonomy, Skills Taxonomy, etc.) to design and maintain its own hierarchy database structures and traversal logic.
_Conclusion:_ **Rejected.** This approach violates the DRY (Don't Repeat Yourself) principle, leads to fragmented data access patterns, increases maintenance overhead, and introduces a high risk of localized cycle-detection bugs.

### Alternative B: Move DAG into Phase 7 Foundation

_Description:_ Abstract the polyhierarchy and DAG logic into a unified, domain-agnostic foundation layer within Phase 7 that all subsequent taxonomies must consume.
_Conclusion:_ **Accepted.** This enforces architectural consistency, centralizes complex graph-traversal logic, guarantees standard cycle-prevention across the enterprise, and adheres strictly to the Single Source of Truth (SSoT) and Architecture Before Implementation principles.

---

## 7. Consequences

### Positive Consequences

- **Reusability:** A single, battle-tested hierarchy implementation for the entire enterprise.
- **Consistency:** Uniform querying (via Closure Tables) and predictable hierarchy resolution regardless of the domain.
- **Safety:** Centralized cycle detection prevents infinite loops and corrupted graph data enterprise-wide.

### Negative Consequences

- **Initial Complexity:** Introduces advanced data modeling patterns (Closure Tables, DAGs) into the Phase 7 foundation, requiring careful initial implementation and testing.
- **Learning Curve:** Domain developers must learn to consume the `IHierarchyNode` and `IClosureTableRepository` abstractions rather than writing simple foreign keys.

### Migration Impact & Compatibility

- **Backward Compatibility:** 100% compatible with the existing Phase 7 architecture. The new generic foundation acts as an additive extension. Existing linear or flat reference entities are unaffected.

---

## 8. Implementation Impact

Upon approval by the Architecture Review Board (ARB):

1. The Phase 7 Baseline will be incremented to **Version 1.1**.
2. A new section **7.13 Generic Hierarchy & DAG Foundation** will be explicitly added to:
   - Part A (Architectural Baseline)
   - Part B (Domain Contracts)
   - Part C (Implementation Guide)
3. **Strict Constraint:** No existing section (7.1–7.12) shall be modified. Existing reference implementations will not be refactored to use this new foundation unless explicitly authorized in future ADRs.

---

### Navigation

- **Previous**: [Phase 07 — Implementation Guide](phase-07-03-implementation-guide.md)
- **Next**: [Phase 08 — Academic Taxonomy](../../phase-08-academic-taxonomy/)
