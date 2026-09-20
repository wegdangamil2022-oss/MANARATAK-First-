# MANARATAK 2.0

# P0-2 Enterprise Lifecycle Framework

# Phase 3 — Enterprise Lifecycle Framework Specification

## 1. Executive Summary

This document serves as the definitive Enterprise Lifecycle Framework Specification for MANARATAK 2.0. It defines the canonical architectural framework, governance, contracts, and rules governing all lifecycles. It establishes a tiered architecture that centralizes infrastructure and reference lifecycles while empowering individual bounded contexts to own and manage their distinct business workflows.

## 2. Enterprise Lifecycle Principles

1. **Separation of Concerns**: System, reference, and business lifecycles are distinct architectural concepts.
2. **Domain Ownership**: Bounded contexts retain complete autonomy over their domain-specific business workflows.
3. **Single Source of Truth**: Duplication of identical system lifecycles across domains is strictly prohibited.
4. **Enterprise Consistency**: All lifecycles conform to unified naming conventions, transition patterns, and audit structures.
5. **Extensibility**: The framework accommodates the dynamic introduction of new workflows by future domains.
6. **Backward Compatibility**: Seamless coexistence of legacy lifecycle implementations during the transition period.
7. **No Universal Enum**: The architecture explicitly rejects compressing all enterprise states into a single, bloated enumeration.

## 3. Complete Lifecycle Specifications

### 3.1 Reference Lifecycle

- **Purpose**: Governs the state of reference and master data entities.
- **Scope**: All entities classified as Reference Data (e.g., Universities, Countries).
- **Ownership**: Reference Data Domain / Phase 07 Architecture.
- **Responsibilities**: Providing a unified mechanism for resolving active mappings and preventing data rot.
- **Allowed Transition Model**: Linear progression (`Active` -> `Deprecated` -> `Archived` / `Superseded`).
- **Terminal States**: `Archived`, `Superseded`, `Merged`.
- **Reversible States**: None (deprecation is typically one-way for master data).
- **Validation Rules**: Must verify no active foreign key constraints depend on data before archiving.
- **Authorization Rules**: Restricted to Reference Data Administrators.
- **Audit Requirements**: All transitions log an `EntityStateChangedEvent`.
- **Integration Points**: Consumed universally by all bounded contexts via Reference Contracts.

### 3.2 Business Workflow

- **Purpose**: Dynamic framework for domain-owned processes.
- **Scope**: Domain-specific aggregates (e.g., Scholarship Application, Course Approval).
- **Ownership**: The specific Bounded Context (Domain).
- **Responsibilities**: Modeling complex, multi-actor state machines.
- **Allowed Transition Model**: Defined dynamically via the central Workflow Engine (State Graph).
- **Terminal States**: Domain-defined (e.g., `Approved`, `Rejected`).
- **Reversible States**: Domain-defined (e.g., `Draft`, `UnderReview`).
- **Validation Rules**: Defined by `WorkflowTransitionValidator` against the domain's state graph.
- **Authorization Rules**: Enforced via Policy Guards based on RBAC.
- **Audit Requirements**: Detailed workflow history tracking and state transition events.
- **Integration Points**: Workflow Engine, Domain Aggregates, Notifications.

### 3.3 Infrastructure Lifecycle

- **Purpose**: Canonical lifecycle for technical infrastructure components.
- **Scope**: Monitors, Caches, Integrations, Configurations, Security Policies.
- **Ownership**: Enterprise Platform / ARB.
- **Responsibilities**: Standardizing technical states across the platform.
- **Allowed Transition Model**: `Created` -> `Activated` -> `Deprecated` -> `Archived`.
- **Terminal States**: `Archived`.
- **Reversible States**: `Deprecated` (can return to `Activated` in rare rollback scenarios).
- **Validation Rules**: `SystemLifecycleService` guards transitions.
- **Authorization Rules**: Infrastructure Administrators.
- **Audit Requirements**: Standard `SystemStateChangedEvent`.
- **Integration Points**: Enterprise Shared Contracts.

### 3.4 Import Pipeline Lifecycle

- **Purpose**: Governs bulk data ingestion and processing.
- **Scope**: Import Jobs, Import Sessions.
- **Ownership**: Import Foundation Domain.
- **Responsibilities**: Managing asynchronous data loads safely.
- **Allowed Transition Model**: `Pending` -> `InProgress` -> `Completed` / `Failed` / `Cancelled`.
- **Terminal States**: `Completed`, `Failed`, `Cancelled`.
- **Reversible States**: `Paused` (can return to `InProgress`).
- **Validation Rules**: Cannot cancel a completed/failed job.
- **Authorization Rules**: Import/System Administrators.
- **Audit Requirements**: Execution metrics and failure logs.
- **Integration Points**: Import Framework, Background Jobs.

### 3.5 Publishing Pipeline Lifecycle

- **Purpose**: Manages content publication flows.
- **Scope**: CMS Content, Articles, Announcements.
- **Ownership**: CMS Domain.
- **Responsibilities**: Content staging, review, and publication.
- **Allowed Transition Model**: `Draft` -> `InReview` -> `Published` -> `Archived`.
- **Terminal States**: `Archived`.
- **Reversible States**: `Published` (can be unpublished back to `Draft`).
- **Validation Rules**: Content must pass validation before publication.
- **Authorization Rules**: Content Editors/Publishers.
- **Audit Requirements**: Content versioning and publication logs.
- **Integration Points**: CMS, Notifications, Search (for indexing).

### 3.6 Translation Pipeline Lifecycle

- **Purpose**: Governs the localization and translation of content.
- **Scope**: Translation Requests, Localization Entries.
- **Ownership**: Translation Framework Domain.
- **Responsibilities**: Managing human and AI-assisted translation flows.
- **Allowed Transition Model**: `Pending` -> `Translating` -> `Reviewing` -> `Completed`.
- **Terminal States**: `Completed`.
- **Reversible States**: `Reviewing` (can return to `Translating`).
- **Validation Rules**: Translation must pass quality checks.
- **Authorization Rules**: Translators/Reviewers.
- **Audit Requirements**: Translation activity logs.
- **Integration Points**: Translation Framework, CMS, AI (for auto-translation).

### 3.7 Notification Lifecycle

- **Purpose**: Manages the dispatch and delivery of notifications.
- **Scope**: Notification Intents, Delivery Statuses.
- **Ownership**: Notification Domain.
- **Responsibilities**: Ensuring reliable message delivery across channels.
- **Allowed Transition Model**: `Created` -> `Scheduled` / `Queued` -> `Sent` / `Failed`.
- **Terminal States**: `Sent`, `Failed`, `Cancelled`, `Expired`.
- **Reversible States**: `Failed` (can be retried to `Queued`).
- **Validation Rules**: Cannot send a cancelled or expired intent.
- **Authorization Rules**: System internal.
- **Audit Requirements**: Delivery receipts and failure reasons.
- **Integration Points**: Notification Gateway, Background Jobs.

### 3.8 Background Job Lifecycle

- **Purpose**: Standardizes asynchronous task execution.
- **Scope**: Schedulers, Background Tasks.
- **Ownership**: Background Jobs Domain.
- **Responsibilities**: Executing delayed or recurring logic.
- **Allowed Transition Model**: `Created` -> `Scheduled` -> `Started` -> `Completed` / `Failed`.
- **Terminal States**: `Completed`, `Failed`, `Cancelled`.
- **Reversible States**: `Failed` (can be retried if policy allows).
- **Validation Rules**: Enforced by `BackgroundJob` aggregate logic.
- **Authorization Rules**: System internal.
- **Audit Requirements**: Execution duration and failure traces.
- **Integration Points**: Scheduler, Import Framework.

### 3.9 Event Processing Lifecycle

- **Purpose**: Governs the lifecycle of asynchronous domain/integration events.
- **Scope**: Outbox Patterns, Event Relays.
- **Ownership**: Event Foundation Domain.
- **Responsibilities**: Ensuring guaranteed at-least-once delivery.
- **Allowed Transition Model**: `Created` -> `Registered` -> `Published` -> `Archived`.
- **Terminal States**: `Published`, `Archived`.
- **Reversible States**: None.
- **Validation Rules**: Must be structurally valid before publishing.
- **Authorization Rules**: System internal.
- **Audit Requirements**: Event dispatch logs.
- **Integration Points**: Message Broker, Shared Contracts.

### 3.10 System Process Lifecycle

- **Purpose**: Governs internal system execution states (health, components).
- **Scope**: Component States, Health Status.
- **Ownership**: Core / Shared Contracts.
- **Responsibilities**: Monitoring system stability.
- **Allowed Transition Model**: `Up` <-> `Degraded` <-> `Down`.
- **Terminal States**: None (system states continuously fluctuate).
- **Reversible States**: All.
- **Validation Rules**: Based on telemetry thresholds.
- **Authorization Rules**: Automated Health Checks.
- **Audit Requirements**: Health degradation alerts.
- **Integration Points**: Monitoring, Infrastructure.

## 4. Ownership Specification

- **Lifecycle Owner**: The specific bounded context that contains the entity or process being tracked.
- **Domain Owner**: The Bounded Context Lead Architect.
- **Runtime Owner**: The Aggregate Root holding the state property.
- **Transition Owner**: The Aggregate method (for simple transitions) or dedicated Domain Service (e.g., `*LifecycleService`) or `WorkflowTransitionValidator` for complex graphs.
- **Documentation Owner**: Domain Leads for business workflows; ARB for global/shared lifecycles.
- **Governance Owner**: Architecture Review Board (ARB).

## 5. Transition Specification

- **Allowed transitions**: Must be explicitly mapped in code (static dictionary or dynamic state graph).
- **Forbidden transitions**: Any state change bypassing the transition owner (e.g., direct property mutation) is forbidden.
- **Terminal states**: Once reached, entities cannot be mutated further. `Archived`, `Purged`, `Completed`, `Failed` (unless retryable).
- **Rollback policy**: Reversible states must explicitly define compensation logic if side effects occurred.
- **Reactivation policy**: Reactivating a `Suspended` or `Paused` entity requires re-validating all prerequisites.
- **Validation rules**: Transition guards must verify business rules before updating state.
- **Authorization rules**: Domain policies must verify the acting user's permissions for the specific transition.
- **Audit logging**: All successful transitions MUST dispatch a domain event containing the `fromState`, `toState`, `entityId`, and `actorId`.

## 6. Integration Specification

- **Shared Contracts**: Provides the generic `ILifecycle` interface and base classes.
- **Workflow Engine**: Consumes dynamic transition definitions for Business Workflows.
- **Domain Aggregates**: Implements lifecycle interfaces and encapsulates state.
- **Events**: Transition events bridge lifecycles across domains.
- **Audit**: Stores immutable records of every lifecycle transition.
- **Notifications**: Subscribes to transition events to alert users (e.g., "Application Approved").
- **Authorization**: Evaluates policies during transition attempts.
- **Scheduler**: Triggers time-based transitions (e.g., `Expired`).
- **Import/CMS/Search/AI/Translation**: Implement their respective pipeline lifecycles while integrating with the core infrastructure.

## 7. Naming Standards

- **PascalCase compliance**: Mandatory. All enum types and members MUST be PascalCase (e.g., `ApplicationStatus.UnderReview`). UPPERCASE is explicitly forbidden.
- **Enum naming**: Must reflect the category (e.g., `ImportStatus`, `PublishingStatus`).
- **State naming**: Must be clear, descriptive adjectives or verbs indicating the current reality (e.g., `Running`, not `Run`).
- **Versioning rules**: Adding states is a minor version bump; removing or renaming states is a major breaking change.
- **Deprecation policy**: States slated for removal must be marked `@deprecated` and mapped to a fallback state during the deprecation window.

## 8. Compatibility Specification

- **Backward compatibility**: Existing upper-case enums (e.g., `CREATED`) will be aliased to the new PascalCase standard (e.g., `Created = 'CREATED'`) to avoid immediate database/API breakage.
- **Legacy lifecycle mapping**: Duplicated infrastructure lifecycles (e.g., `LogLifecycleState`) will act as type aliases to the canonical `SystemLifecycleState` during the transition.
- **Alias strategy**: TypeScript `export type LogLifecycleState = SystemLifecycleState` will be utilized.
- **Uppercase → PascalCase mapping**: Managed at the application serialization layer until data migration is feasible.
- **Compatibility duration**: Supported until the completion of Phase 4 Migration.
- **Migration assumptions**: No destructive database updates occur in this phase.

## 9. Governance Rules

- **Architecture governance**: The ARB controls Tier 1 and Tier 2 lifecycles. Domains control Tier 3.
- **ARB approval requirements**: Required for creating or altering any Tier 1 (System) or Tier 2 (Reference) lifecycle.
- **Extension rules**: Domains may extend base contracts but cannot override terminal state behaviors.
- **New lifecycle creation policy**: Permitted for new bounded contexts, provided they do not duplicate existing system lifecycles.
- **Modification policy**: Modifying transition graphs requires unit tests covering all new edges.
- **Documentation policy**: All lifecycles must be documented in the domain's architecture baseline.

## 10. Risks

- Data migration complexity when shifting legacy UPPERCASE database records to PascalCase.
- Potential runtime errors if alias types are incorrectly configured during the compatibility window.
- Friction from domain teams adapting to the centralized Tier 1/2 governance model.

## 11. Architecture Decisions

- **ADR-LF-004**: Adoption of a 3-Tier Lifecycle Architecture (System, Reference, Domain).
- **ADR-LF-005**: Mandate of Explicit Transition Owners (Services/Validators) over implicit aggregate mutations.
- **ADR-LF-006**: Adoption of Alias Strategy for Non-Destructive PascalCase Migration.

## 12. Compliance Checklist

- [ ] No universal enum exists.
- [ ] 10 distinct lifecycle categories defined.
- [ ] Domain autonomy preserved for business workflows.
- [ ] PascalCase naming enforced.
- [ ] Terminal and reversible states explicitly documented.
- [ ] Cross-domain integrations mapped.

## 13. Readiness Assessment

**Decision**: APPROVED.

The Enterprise Lifecycle Framework Specification is complete and provides the necessary architectural controls to govern states across MANARATAK 2.0 safely and consistently.

GO to Phase 4 (Migration & Integration Plan)
