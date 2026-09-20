# MANARATAK 2.0

# P0-2 Enterprise Lifecycle Framework

# Phase 2 — Enterprise Lifecycle Blueprint

## 1. Executive Summary

This blueprint defines the canonical Enterprise Lifecycle Framework for MANARATAK 2.0. Based on the findings from the Discovery phase, this document establishes a unified, domain-driven governance model that standardizes system-level lifecycles while empowering individual bounded contexts to own their specific business workflows. The blueprint resolves state fragmentation, standardizes transitions, and enforces a cohesive ownership model without artificially compressing all enterprise states into a single enum.

## 2. Enterprise Lifecycle Principles

1. **Separation of Concerns**: System, reference, and business lifecycles are architecturally distinct and must not be conflated.
2. **Domain Ownership**: Each bounded context owns and defines its own business workflows, adhering only to the enterprise governance wrapper.
3. **Single Source of Truth**: Duplicate definitions of identical system lifecycles across different packages are strictly prohibited.
4. **Enterprise Consistency**: All lifecycles must adhere to standardized naming conventions, transition patterns, and audit structures.
5. **Extensibility**: The framework must allow future domains to introduce new workflows dynamically.
6. **Backward Compatibility**: Existing domain state implementations will coexist during a transition window to prevent runtime disruptions.
7. **No Duplicate Lifecycle Definitions**: Cross-cutting system states (e.g., Created, Activated, Archived) must be consolidated into a single shared abstraction.

## 3. Lifecycle Architecture

The architecture is structured in a tiered manner:

- **Tier 1: Global/System Framework**: Provided by the `Shared Kernel` and `Enterprise Shared Contracts`, establishing the base types and unified infrastructure lifecycle states.
- **Tier 2: Reference Data Framework**: Managed by the Reference Data Domain, governing all master data records across the enterprise.
- **Tier 3: Domain-Specific Workflows**: Owned entirely by individual bounded contexts, leveraging the global workflow engine but defining local states.

## 4. Lifecycle Categories

### 4.1 Reference Lifecycle

- **Purpose**: Governs the state of reference/master data entities (e.g., Universities, Countries).
- **States**: `Active`, `Deprecated`, `Archived`, `Superseded`, `Merged`.
- **Ownership**: Reference Data Domain / `Phase 07` Architecture.
- **Transition Rules**: Strictly linear or explicitly mapped. Master data can only be deprecated or superseded, never hard-deleted.
- **Responsibilities**: Provide a unified mechanism for resolving active mapping and preventing reference data rot.

### 4.2 Business Workflow

- **Purpose**: Provides a dynamic framework for domain-owned processes (e.g., Scholarship Application, Course Approval).
- **States**: Domain-specific (e.g., `Draft`, `Submitted`, `UnderReview`, `Approved`).
- **Ownership**: The specific Bounded Context (Domain).
- **Transition Rules**: Managed via the central Workflow Engine, which evaluates runtime configurations (JSON/DB-driven state graphs).
- **Responsibilities**: Allowing businesses to model complex, multi-actor state machines without changing core infrastructure logic.

### 4.3 System Process Lifecycle

- **Purpose**: A canonical lifecycle for all technical/infrastructure components (e.g., Logs, Monitors, Components, Integrations).
- **States**: `Created`, `Activated`, `Deprecated`, `Archived`.
- **Ownership**: Enterprise Platform / Architecture Review Board (ARB).
- **Transition Rules**: Strictly enforced by a shared `SystemLifecycleService`.
- **Responsibilities**: Replacing the massive duplication of `*LifecycleState` enums discovered in Phase 1 with a single `SystemLifecycleState` model.

### 4.4 Import & Processing Lifecycles

- **Purpose**: Standardize background tasks, data ingestion, and scheduler jobs.
- **States**: `Pending`, `Running`, `Paused`, `Completed`, `Failed`, `Cancelled`.
- **Ownership**: Import Foundation & Background Jobs Domains.
- **Transition Rules**: Guarded by aggregate methods ensuring logical progression (e.g., cannot cancel a completed job).
- **Responsibilities**: Unifying `ExecutionStatus`, `ImportStatus`, and `BackgroundJobStatus` into a cohesive `ProcessingStatus` model.

## 5. Ownership Model

- **Lifecycle Owner**: The domain containing the entity being tracked.
- **Domain Owner**: The Bounded Context Lead.
- **Runtime Owner**: The Aggregate Root containing the state property.
- **Transition Owner**: The aggregate method or dedicated Domain Service responsible for guarding state changes.
- **Documentation Owner**: The ARB (for system/reference lifecycles) and Domain Leads (for business workflows).

## 6. Transition Governance

- **Allowed Transitions**: Must be explicitly defined via static maps (for system states) or dynamic validators (for business workflows).
- **Terminal States**: States like `Archived`, `Completed`, `Failed`, and `Purged` are terminal. No transitions out of these states are permitted.
- **Reversible States**: `Suspended` or `Paused` states must explicitly define resumption paths back to `Active` or `Running`.
- **Transition Validation**: Required before any state change. Implicit state assignment (e.g., `entity.status = newStatus`) is strictly forbidden.
- **Transition Authorization**: Workflow transitions must enforce role-based access control (RBAC) via policy guards.
- **Transition Auditing**: All lifecycle transitions must emit an `EntityStateChangedEvent` to be captured by the Audit domain.

## 7. Naming Standards

- **Enum Naming**: Must utilize PascalCase (e.g., `ProcessingStatus`).
- **State Naming**: Enum members must utilize PascalCase (e.g., `Active`, `InProgress`, `Archived`), strictly adhering to Master Blueprint Section 51. UPPERCASE members (e.g., `CREATED`) are forbidden and must be normalized.
- **Consistency Requirements**: Verbs (e.g., `Running`) vs Adjectives (e.g., `Active`) must be standardized per lifecycle category.

## 8. Integration Blueprint

- **Shared Contracts**: The `Enterprise Shared Contracts` will provide the base `ILifecycle` interfaces and shared `SystemLifecycleState` enums.
- **Workflow Engine**: Integrates with business domains to process dynamic state definitions.
- **Domain Aggregates**: Will implement base interfaces and encapsulate transition logic.
- **Events**: Transition events will inherit from `DomainEvent` or `IntegrationEvent`.
- **Audit**: Subscribes to transition events to maintain an immutable history log.
- **Notifications**: Triggered selectively by transition events (e.g., notifying a user when an application transitions to `Approved`).

## 9. Compatibility Strategy

- **Coexistence**: Existing duplicated enums (e.g., `MonitorLifecycleState`, `LogLifecycleState`) will remain active during the transition.
- **Phased Normalization**: Bounded contexts will incrementally map their existing fields to the unified shared contracts.
- **Alias Enums**: Where necessary, temporary TypeScript alias exports will be used to prevent immediate compiler breakage.
- **No Immediate Refactoring**: This blueprint dictates the target state; migration occurs only after the formal specification is approved.

## 10. Risks

- **Data Migration**: Existing database records utilizing UPPERCASE string values will require data migrations to align with PascalCase rules.
- **Siloed Domain Logic**: Resistance from domain teams accustomed to defining custom infrastructure states.

## 11. Architecture Decisions

1. **ADR-LF-001**: Consolidation of System Process Lifecycles into a single shared abstraction.
2. **ADR-LF-002**: Enforcement of PascalCase for all state enumerations.
3. **ADR-LF-003**: Mandating event-driven audit logging for all lifecycle transitions.

## 12. Readiness Assessment

**Decision**: APPROVED.

The blueprint effectively establishes the canonical patterns, ownership rules, and transition governance needed for MANARATAK 2.0 without introducing immediate breaking changes.

GO to Phase 3 (Enterprise Lifecycle Framework Specification)
