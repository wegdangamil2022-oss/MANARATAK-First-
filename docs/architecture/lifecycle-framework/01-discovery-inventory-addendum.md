# MANARATAK 2.0

# P0-2 Enterprise Lifecycle Framework

# Phase 1 — Discovery Addendum (Transition & Ownership)

## 1. Executive Summary

This addendum completes the Discovery phase by analyzing state transitions, transition rules, lifecycle ownership, and runtime transition implementations across the repository. The audit revealed a mix of dynamic state engines, static domain service transition guards, and loosely enforced aggregate methods.

## 2. Transition Discovery & Rules

A review of the repository identified the following transition patterns:

### Infrastructure & System Process Lifecycles (e.g., Localization, Integration, Configuration)

**Pattern**: Managed via `*LifecycleService` (e.g., `LocalizationLifecycleService`).

- `CREATED` -> `ACTIVATED`, `ARCHIVED`
- `ACTIVATED` -> `DEPRECATED`, `ARCHIVED`
- `DEPRECATED` -> `ARCHIVED`
- **Terminal State**: `ARCHIVED` (no transitions out).
- **Enforcement**: Explicit domain service rules throwing exceptions for illegal transitions.

### Background Jobs & Imports (e.g., `ImportJob`)

- `Pending` -> `InProgress`, `Failed`, `Cancelled`
- `InProgress` -> `Completed`, `Failed`, `Cancelled`
- **Terminal States**: `Completed`, `Failed`, `Cancelled`
- **Enforcement**: Aggregates directly guard transitions (`importJob.complete()` checks if `InProgress`).

### Dynamic Workflows (`Workflow` Aggregate)

- **Pattern**: Transition paths are dynamically defined within `WorkflowDefinition`.
- **Enforcement**: Evaluated at runtime using `WorkflowTransitionValidator.isValidTransition(fromState, toState)`. Validates against explicitly defined allowed edges.

### Identity & Organization

- `PROVISIONED` / `CREATED` -> `ACTIVE`
- `ACTIVE` -> `SUSPENDED` / `ARCHIVED`
- **Enforcement**: Aggregates (e.g., `Identity`, `Organization`) provide methods (`activate()`, `suspend()`, `archive()`) but lack strict state-engine guards. They mostly verify if the state is already the target state or if prerequisites (e.g., verified contact info) are met.

## 3. Lifecycle Ownership Matrix

| Lifecycle                                    | Owning Domain / Package                 | Responsible Aggregate / Service                      |
| -------------------------------------------- | --------------------------------------- | ---------------------------------------------------- |
| `System Lifecycles` (Api, Config, Log, etc.) | Respective Infrastructure Domains       | `*LifecycleService` (e.g., `ApiLifecycleService`)    |
| `ImportStatus` / `ExecutionStatus`           | `packages/domain/src/import-foundation` | `ImportJob` / `ImportSession` Aggregates             |
| `WorkflowLifecycleState`                     | `packages/domain/src/workflow`          | `Workflow` Aggregate & `WorkflowTransitionValidator` |
| `OrganizationStatus` / `MembershipStatus`    | `packages/domain/src/organization`      | `Organization` / `Membership` Aggregates             |
| `LifeStatus`                                 | `packages/domain` (Global)              | `Identity` Aggregate (Implicit owner)                |

**Missing Ownership**:

- **`LifeStatus`**: Exists globally in `packages/domain/src/enums/LifeStatus.ts` without a clear bounding context, although currently utilized by `Identity`.
- **Reference Lifecycles**: Documented in Phase 07, but lack a canonical runtime transition engine or dedicated domain service to enforce rules.

## 4. Runtime Transition Map

The runtime environment exhibits three completely distinct implementation strategies for state transitions:

1.  **Aggregate Encapsulation (Loose)**: The aggregate exposes `archive()`, `suspend()`, or `activate()` and merely updates its internal property, emitting an event.
2.  **Domain Service State Machine (Static)**: A dedicated service like `IntegrationFoundationLifecycleService` maintains a static `allowedTransitions` dictionary and throws errors if an aggregate requests an illegal transition.
3.  **Dynamic Workflow Validator (Dynamic)**: `WorkflowTransitionValidator` evaluates arbitrary state graphs.

## 5. Transition Documentation Status

- **Explicitly Documented in Code**: Yes, for infrastructure and workflow domains.
- **Missing Transition Documentation**: `LifeStatus`, `OrganizationStatus`, and `FileLifecycleState` lack formal transition matrices or documented state graphs.
- **Dead-End States**: `ARCHIVED`, `PURGED`, `COMPLETED`, and `FAILED` are consistently treated as terminal across the repository.

## 6. Readiness Assessment

**Decision**: GO to Phase 2 (Blueprint)

The Enterprise Lifecycle Discovery phase is complete and Phase 2 (Blueprint) may begin. The transition behaviors, missing ownership boundaries, and scattered state implementations have been fully mapped, paving the way for the creation of a unified enterprise consolidation blueprint.
