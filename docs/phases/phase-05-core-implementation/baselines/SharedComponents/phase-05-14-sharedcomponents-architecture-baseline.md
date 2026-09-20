# MANARATAK 2.0: Phase 5.14 SharedComponents Architecture Baseline

## Architecture Baseline Document

**Status:** APPROVED  
**Revision:** 5.14.0  
**Phase:** 5.14  
**Architecture Baseline:** FROZEN  
**Date:** 2026-07-16

---

## 1. Vision

To establish a provider-neutral, logical Single Source of Truth (SSoT) for the definition, versioning, and lifecycle management of reusable enterprise building blocks across the MANARATAK 2.0 ecosystem. The Shared Components Foundation provides the semantic blueprint for component intent without concerning itself with physical rendering or technical implementation details.

## 2. Purpose

The Shared Components Foundation governs the structural metadata and logical validity of reusable components. It enables consistent component references across different bounded contexts via the `SharedComponentReference`. The platform manages the logical intent (Rendering Intent) while deferring physical presentation to the infrastructure and presentation layers.

## 3. Scope

### 3.1 In-Scope

- **Logical Component Modeling:** Defining the abstract structure and metadata of shared components.
- **Identity & Referencing:** Global identification of components via the `SharedComponentReference` Value Object.
- **Version Management:** Semantic versioning of component definitions.
- **Lifecycle Governance:** Managing states from creation through archiving.
- **Compatibility Tracking:** Defining logical backward/forward compatibility markers.
- **Ownership Assignment:** Neutral referencing of component owners via `SharedComponentOwnerReference`.

### 3.2 Out-of-Scope (The Platform Must Never Know)

- **Physical Presentation:** No knowledge of rendering, styling, or UI frameworks.
- **Visual Composition:** No knowledge of themes, design system tokens, or layout engines.
- **Implementation Technologies:** No knowledge of specific frontend or backend frameworks, markup languages, or styling processors.
- **Business Logic:** No knowledge of domain-specific business entities or rules.
- **Infrastructure:** No knowledge of cloud providers, deployment targets, or storage engines.

## 4. Bounded Context

The Shared Components Foundation operates as a **Generic Subdomain**. It provides supporting capabilities to other Bounded Contexts by offering a registry of logical building blocks. Business domains must reference Shared Components exclusively through the `SharedComponentReference` Value Object.

---

## 5. Domain Model

### 5.1 Aggregate Roots

#### 5.1.1 SharedComponent

The Aggregate Root representing a logical enterprise building block. It owns only the logical metadata and definition of the component.

- **SharedComponentId:** Strictly internal, immutable aggregate identifier.
- **SharedComponentReference:** Official, immutable cross-context reference Value Object.
- **SharedComponentOwnerReference:** Generic, provider-neutral owner reference Value Object.
- **SharedComponentDefinition:** Immutable logical blueprint of the component.
- **ComponentMetadata:** Immutable logical annotations.
- **CompatibilityMetadata:** Immutable compatibility markers.
- **ComponentVersion:** Immutable semantic version marker.
- **LifecycleMetadata:** Logical lifecycle state and history.
- **RenderingIntent:** Logical declaration of how the component is intended to be used (not how it is rendered).

### 5.2 Value Objects

- **SharedComponentReference:** The exclusive cross-context identifier. All business domains and external layers must use this reference.
- **SharedComponentOwnerReference:** A generic abstraction for component ownership. The foundation does not understand the business meaning of the owner.
- **SharedComponentDefinition:** Permanently immutable collection of logical properties and slot definitions.
- **ComponentVersion:** Permanently immutable semantic structural version (Major, Minor, Patch).
- **CompatibilityMetadata:** Permanently immutable markers indicating backward and forward compatibility.
- **RenderingIntent:** Immutable logical intent for visual category and interaction model (e.g., "Primary Action", "Data View") without technical details.
- **ComponentMetadata:** Map-based logical annotations for classification.

### 5.3 Enums

- **ComponentLifecycleState:**
  - `CREATED`
  - `ACTIVATED`
  - `DEPRECATED`
  - `ARCHIVED`

---

## 6. Domain Services

- **ComponentCompatibilityService:** Evaluates structural backward compatibility between two `SharedComponentDefinition` versions.
- **ComponentLifecycleService:** Orchestrates logical transitions between lifecycle states based on core domain rules.

## 7. Repository Contracts

Repositories must follow the **Specification Pattern** exclusively. No repository-specific lookup methods are permitted.

- **ISharedComponentRepository:**
  - `save(component: SharedComponent): Promise<void>`
  - `findBy(specification: ISpecification<SharedComponent>): Promise<SharedComponent[]>`

---

## 8. Business Rules

- **Reference Exclusivity:** External contexts must never expose or utilize the internal `SharedComponentId`.
- **Immutability:** Any modification to `SharedComponentDefinition`, `ComponentVersion`, or `CompatibilityMetadata` requires the creation of a completely new `SharedComponent`.
- **Ownership Neutrality:** Owner references are treated as opaque identifiers; the foundation carries no business logic regarding owner types.
- **Lifecycle Integrity:** Transitions must follow authorized paths managed by the `ComponentLifecycleService`.

---

## 9. Domain Events

Events are restricted to business-significant lifecycle transitions only.

- **SharedComponentCreatedEvent**
- **SharedComponentActivatedEvent**
- **ComponentVersionPublishedEvent**
- **SharedComponentDeprecatedEvent**
- **SharedComponentArchivedEvent**

Operational events related to rendering, styling, or infrastructure are strictly forbidden.

---

## 10. Architectural Decision Records (ADR)

### ADR-1: Provider Neutrality

- **Decision:** The Domain and Application layers shall contain no references to specific rendering engines, frontend frameworks, or styling technologies.
- **Rationale:** To maintain absolute decoupling from presentation details.

### ADR-2: Shared Component Ownership

- **Decision:** All components must reference a logical owner via `SharedComponentOwnerReference`.
- **Rationale:** Decouples component governance from business entity ownership logic.

### ADR-3: Component Definition Immutability

- **Decision:** `SharedComponentDefinition`, `ComponentVersion`, and `CompatibilityMetadata` are permanently immutable.
- **Rationale:** Any change to the structure of a component constitutes a new logical entity in the registry, ensuring reference stability.

### ADR-4: Lifecycle Ownership

- **Decision:** The Domain owns only the logical lifecycle of Shared Components.
- **Rationale:** Physical rendering, styling adaptation, and runtime composition belong exclusively to the Infrastructure layer.

### ADR-5: Rendering Boundary

- **Decision:** The Domain defines only the **logical rendering intent**. Actual rendering and visual composition remain entirely outside the Domain boundary.
- **Rationale:** Upholds Clean Architecture by preventing UI concerns from leaking into the core logic.

### ADR-6: Compatibility Boundary

- **Decision:** The Domain defines logical compatibility metadata based on definition comparison.
- **Rationale:** Physical verification is deferred to infrastructure-level testing suites.

### ADR-7: Versioning Boundary

- **Decision:** Every new component definition version must be treated as a unique structural marker.
- **Rationale:** Supports enterprise-scale dependency management without side effects.

---

## 11. Architectural Constraints

- **Dependency Rule:** `Domain <- Application <- Infrastructure <- API`.
- **Identifier Secrecy:** The `SharedComponentId` must never leak across context boundaries.
- **Zero Framework Dependency:** No third-party UI or framework types are permitted in the Domain.

## 12. Risks & Recommendations

- **Risk:** Attempting to model visual properties in metadata.
- **Recommendation:** Strictly restrict metadata to logical classification.
- **Risk:** Fragmentation of owner identifiers.
- **Recommendation:** Ensure `SharedComponentOwnerReference` values are governed by a central enterprise registry.

---

## 13. Official ARB Approval & Certification

### Final Architecture Review & Certification

The Architecture Review Board (ARB) has completed the final review of the **Phase 5.14 — Enterprise Shared Components Foundation** architecture and certifies that:

- **Identity & Referencing:** `SharedComponentReference` is the official cross-context Shared Component reference. `SharedComponentId` remains strictly internal.
- **Ownership Abstraction:** `SharedComponentOwnerReference` is the exclusive abstraction for referencing external ownership, ensuring the foundation remains business-agnostic.
- **Aggregate Purity:** The `SharedComponent` aggregate owns only provider-neutral metadata, immutable definitions, version information, compatibility metadata, lifecycle metadata, and logical rendering intent.
- **Permanent Immutability:** `SharedComponentDefinition`, `ComponentVersion`, and `CompatibilityMetadata` are permanently immutable. Any modification requires the creation of a completely new `SharedComponent`.
- **Rendering Boundary:** Component Definition is completely separated from Component Rendering. The Domain owns only logical intent; physical rendering, styling, and framework adaptation are exclusively Infrastructure responsibilities.
- **Architectural Compliance:** The design fully complies with Clean Architecture, DDD, SOLID, and the Dependency Rule.

---

## 14. Official ARB Decision

```
================================================================================
                       OFFICIAL ARB DECISION: APPROVED
================================================================================
Phase:                  5.14 — Shared Components Foundation
Revision:               5.14.0
Status:                 APPROVED
Architecture Baseline:  FROZEN
================================================================================
```

The Enterprise Shared Components Foundation Architecture is hereby declared the permanent **Architecture Baseline** for Phase 5.14.

No further architectural modifications, redesigns, structural changes, feature additions, or scope expansions are permitted unless initiated through a formal Architecture Review Board (ARB) Change Request approved by the Project Owner.

---

### Navigation

- **Previous**: [Phase 5.13 API Foundation Implementation Baseline](../ApiFoundation/phase-05-13-apifoundation-implementation-baseline.md)
- **Next**: [Phase 5.14 Shared Components Implementation Baseline](phase-05-14-sharedcomponents-implementation-baseline.md)
