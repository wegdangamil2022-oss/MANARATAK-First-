# MANARATAK 2.0

# P0-2 Enterprise Lifecycle Framework

# Phase 1 — Discovery & Inventory Report

## 1. Executive Summary

This report presents the findings of the Enterprise Lifecycle Framework Discovery audit. The audit evaluated the MANARATAK 2.0 repository to identify every lifecycle, status model, workflow state, and state transition. The discovery revealed massive duplication of lifecycle states across domain packages, conflicting naming conventions (PascalCase vs. UPPERCASE), and a lack of a unified enterprise state machine.

## 2. Lifecycle Inventory

### Infrastructure & System Process Lifecycles

| Lifecycle Name                | Location                                       | States                                                               |
| ----------------------------- | ---------------------------------------------- | -------------------------------------------------------------------- |
| `MonitorLifecycleState`       | `packages/domain/src/monitoring/enums/`        | CREATED, ACTIVATED, DEPRECATED, ARCHIVED                             |
| `LogLifecycleState`           | `packages/domain/src/logging/enums/`           | CREATED, ACTIVATED, DEPRECATED, ARCHIVED                             |
| `ComponentLifecycleState`     | `packages/domain/src/shared-components/enums/` | CREATED, ACTIVATED, DEPRECATED, ARCHIVED                             |
| `ApiLifecycleState`           | `packages/domain/src/api-foundation/enums/`    | CREATED, ACTIVATED, DEPRECATED, ARCHIVED                             |
| `SecurityLifecycleState`      | `packages/domain/src/security/enums/`          | CREATED, ACTIVATED, DEPRECATED, ARCHIVED                             |
| `LocalizationLifecycleState`  | `packages/domain/src/localization/enums/`      | CREATED, ACTIVATED, DEPRECATED, ARCHIVED                             |
| `IntegrationLifecycleState`   | `packages/domain/src/integration/enums/`       | CREATED, ACTIVATED, DEPRECATED, ARCHIVED                             |
| `ConfigurationLifecycleState` | `packages/domain/src/configuration/enums/`     | CREATED, ACTIVATED, DEPRECATED, ARCHIVED                             |
| `FileLifecycleState`          | `packages/domain/src/file-management/enums/`   | Initiated, Registered, Validating, Active, Archived, Deleted, Purged |
| `EventLifecycleState`         | `packages/domain/src/event-foundation/enums/`  | CREATED, REGISTERED, PUBLISHED, ARCHIVED                             |
| `AuditLifecycleState`         | `packages/domain/src/audit/enums/`             | RECORDED, ARCHIVED                                                   |
| `CacheEntryStatus`            | `packages/domain/src/cache/enums/`             | CREATED, EXPIRED, INVALIDATED, REMOVED                               |
| `HealthStatus`                | `packages/core/src/monitoring/`                | UP, DOWN, DEGRADED, UNKNOWN                                          |
| `LifeStatus`                  | `packages/domain/src/enums/`                   | PROVISIONED, ACTIVE, SUSPENDED, ARCHIVED, PURGED                     |

### Background Jobs & Import Pipelines

| Lifecycle Name        | Location                                       | States                                                    |
| --------------------- | ---------------------------------------------- | --------------------------------------------------------- |
| `ExecutionStatus`     | `packages/domain/src/import-foundation/enums/` | Pending, Running, Paused, Completed, Failed, Cancelled    |
| `ImportStatus`        | `packages/domain/src/import-foundation/enums/` | Pending, InProgress, Completed, Failed, Cancelled         |
| `BackgroundJobStatus` | `packages/domain/src/background-jobs/enums/`   | CREATED, SCHEDULED, STARTED, COMPLETED, FAILED, CANCELLED |

### Business & Reference Workflows

| Lifecycle Name            | Location                                       | States                                           |
| ------------------------- | ---------------------------------------------- | ------------------------------------------------ |
| `WorkflowLifecycleState`  | `packages/domain/src/workflow/enums/`          | CREATED, ACTIVATED, COMPLETED, ARCHIVED          |
| `OrganizationStatus`      | `packages/domain/src/organization/aggregates/` | Active, Archived                                 |
| `MembershipStatus`        | `packages/domain/src/organization/aggregates/` | Active, Suspended, Terminated                    |
| `ReferenceLifecycleState` | `docs/phases/phase-07-enterprise-reference-data/`                        | Active, Deprecated, Archived, Superseded, Merged |
| `MappingStatus`           | `docs/phases/phase-08-academic-taxonomy/`, `09`, `10`            | Verified, Deprecated, Pending                    |

### Notifications

| Lifecycle Name            | Location                                  | States                                           |
| ------------------------- | ----------------------------------------- | ------------------------------------------------ |
| `NotificationIntentState` | `packages/domain/src/notification/enums/` | CREATED, SCHEDULED, CANCELLED, EXPIRED, ARCHIVED |
| `DeliveryStatus`          | `packages/domain/src/notification/enums/` | QUEUED, SENT, FAILED                             |

## 3. Classification Matrix

- **Reference Lifecycle**: `ReferenceLifecycleState`, `OrganizationStatus`, `MembershipStatus`, `MappingStatus`
- **Business Workflow**: `WorkflowLifecycleState`
- **System Process**: `FileLifecycleState`, `EventLifecycleState`, `AuditLifecycleState`, `NotificationIntentState`, `DeliveryStatus`, `CacheEntryStatus`
- **Import Pipeline**: `ExecutionStatus`, `ImportStatus`
- **Background Job**: `BackgroundJobStatus`
- **Infrastructure**: `MonitorLifecycleState`, `LogLifecycleState`, `ComponentLifecycleState`, `ApiLifecycleState`, `SecurityLifecycleState`, `LocalizationLifecycleState`, `IntegrationLifecycleState`, `ConfigurationLifecycleState`, `HealthStatus`
- **Unknown**: `LifeStatus`

## 4. Duplicate Analysis

- **Massive State Duplication**: There are 8 different `*LifecycleState` enums (`Monitor`, `Log`, `Component`, `Api`, `Security`, `Localization`, `Integration`, `Configuration`) that all define the exact same four states: `CREATED`, `ACTIVATED`, `DEPRECATED`, `ARCHIVED`.
- **Job Status Overlap**: `ExecutionStatus` and `BackgroundJobStatus` share near-identical concepts (Pending/SCHEDULED, Running/STARTED, Completed/COMPLETED, Failed/FAILED, Cancelled/CANCELLED).

## 5. Conflict Analysis

- **Naming Convention Conflicts**:
  - Several enums use `UPPERCASE` for members (e.g., `CREATED`, `ACTIVATED`), which violates the Master Blueprint Section 51 rule: "Enums must utilize PascalCase for both the Enum name and its members".
  - Other enums correctly use `PascalCase` (e.g., `Pending`, `Running`, `Active`).
- **Terminology Conflicts**:
  - `Pending` vs `CREATED` vs `Initiated` vs `QUEUED` vs `SCHEDULED` for "not started yet".
  - `Active` vs `ACTIVATED` vs `Running` vs `STARTED` vs `InProgress` for "currently active".

## 6. Missing Documentation

- `LifeStatus` in `packages/domain/src/enums/LifeStatus.ts` is an orphan global enum with no clear ownership or documented workflow.
- Many lifecycle enums are defined purely in TypeScript code with no formal state transition documentation (no allowed transitions defined).

## 7. Risks

- Hardcoded status logic in business domains relying on duplicated enums instead of a unified enterprise state engine.
- Difficulty in building cross-domain status reporting because "Active" means something different in 15 different domains.
- Violation of Master Blueprint PascalCase rules introduces data serialization inconsistency.

## 8. Architecture Observations

- The repository favors duplicating a generic lifecycle concept into domain-specific named enums (e.g., `LogLifecycleState` instead of a generic `SystemLifecycle`).
- Reference data lifecycles defined in the architectural baselines (`Active`, `Deprecated`, `Archived`, `Superseded`, `Merged`) do not perfectly align with the runtime implementations.
- There is no central "State Machine" or unified Lifecycle capability, leading each bounded context to invent its own variation.

## 9. Readiness Assessment

**Decision**: GO to Phase 2 (Blueprint)

The discovery has successfully identified the fragmentation and duplication across the repository. The project is ready for the Consolidation Blueprint phase to determine the canonical lifecycle architecture.
