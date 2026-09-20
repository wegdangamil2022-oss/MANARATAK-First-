# MANARATAK 2.0

# P0-2 Enterprise Lifecycle Framework

# Phase 4 — Migration & Integration Plan

## 1. Executive Summary

This document outlines the official architectural migration strategy to transition the current MANARATAK 2.0 repository to the newly approved Enterprise Lifecycle Framework. This plan is designed to be executed incrementally, ensuring zero unnecessary breaking changes, maintaining backward compatibility, and preserving domain autonomy. The migration ensures safe integration with the enterprise shared contracts and the global workflow engine.

## 2. Migration Strategy

- **Zero Unnecessary Breaking Changes**: The migration will use an alias-first approach to avoid immediate compilation or database errors.
- **Backward Compatibility First**: Existing UPPERCASE database states will be handled gracefully via dual-read serialization layers.
- **Incremental Migration**: Migration will occur layer-by-layer (Infrastructure -> Reference -> Business Workflows).
- **Domain Autonomy Preservation**: Business domains will migrate at their own pace, following the enterprise governance wrapper without losing internal workflow control.
- **Architecture-First Deployment**: Code changes will closely follow this approved blueprint.

## 3. Migration Phases

### Phase 1: Foundation Setup (Non-Breaking)

- Implement `SystemLifecycleState` in `packages/core/src/domain`.
- Implement `ILifecycle` base interfaces in the Shared Contracts.
- Update global TypeScript configurations if necessary.

### Phase 2: System Process Consolidation

- Alias the 8 duplicate infrastructure lifecycle enums (`MonitorLifecycleState`, `LogLifecycleState`, etc.) to point to `SystemLifecycleState`.
- Update infrastructure domain services (e.g., `ApiLifecycleService`) to use the unified state.
- Implement API payload mappers to handle legacy UPPERCASE strings and convert them to PascalCase internally.

### Phase 3: Reference & Background Jobs Alignment

- Align `ImportStatus`, `ExecutionStatus`, and `BackgroundJobStatus` to the newly defined `ProcessingStatus` where applicable, or standardize their PascalCase enum members.
- Map `ReferenceLifecycleState` to the ARB-approved states.

### Phase 4: Business Workflow Integration

- Implement the `WorkflowTransitionValidator` fully across all domain-specific workflows.
- Map existing `OrganizationStatus` and `MembershipStatus` to adhere to transition governance rules.
- Resolve the orphan `LifeStatus` enum and transition its ownership explicitly to the Identity domain.

## 4. Integration Plan

- **Shared Contracts**: Lifecycles will inherit from `ILifecycle` contracts defined in `packages/core`.
- **Workflow Engine**: Business domain state graphs will be registered and validated by the central Workflow Engine.
- **Domain Aggregates**: Aggregates will stop directly mutating state properties and will route transitions through specific guard methods.
- **Events & Audit**: Every aggregate transition method must publish an `EntityStateChangedEvent` to the Event Bus, consumed by the Audit domain.
- **Authorization**: Policy Guards will intercept transition requests to verify RBAC permissions.
- **Scheduler**: The Background Job Lifecycle will integrate directly with the central Scheduler for time-based transitions.
- **Import/CMS/Search/AI/Translation**: These domains will adopt their respective pipeline lifecycles without altering their core business logic.

## 5. Compatibility Plan

- **Legacy Lifecycle Coexistence**: During migration, existing generic enums will coexist alongside the new unified definitions via TypeScript `type` aliasing.
- **Alias Strategy**: `export type ComponentLifecycleState = SystemLifecycleState;`
- **Uppercase → PascalCase Migration**: The serialization layer (DTO mapping) will accept UPPERCASE from legacy APIs but normalize it to PascalCase in the Domain layer.
- **Database Compatibility**: ORMs will be configured to read both UPPERCASE and PascalCase, but write only PascalCase. A background migration script will eventually normalize existing records.
- **API & Event Compatibility**: Legacy API consumers will continue to receive legacy formats if a specific API version is requested, otherwise, the v2 API will enforce PascalCase.

## 6. Deployment Strategy

- **Deployment Sequence**: Deploy Foundation -> Deploy System Processes -> Deploy Pipelines -> Deploy Business Workflows.
- **Zero-Downtime Considerations**: Database columns will not be locked or dropped. Normalization happens via asynchronous background workers.
- **Feature Flag Strategy**: The new transition validators can be toggled via configuration flags (`ENABLE_STRICT_LIFECYCLE_GUARDS=true`).
- **Monitoring Requirements**: Monitor for validation rejections or serialization failures during the rollout window.
- **Post-Deployment Validation**: Automated E2E tests will verify that state transitions function across all updated domains.

## 7. Risk Register

| Risk                            | Likelihood | Impact | Mitigation                                                                                  |
| ------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------- |
| Database Serialization Errors   | Medium     | High   | Dual-read ORM configuration; thorough integration testing.                                  |
| Unintended Terminal State Locks | Low        | High   | Ensure rollback transition flags are enabled for administrators during the first 30 days.   |
| Domain Team Friction            | High       | Low    | Clear documentation and alias strategies to minimize refactoring overhead for domain teams. |

## 8. Rollback Strategy

- **Trigger**: An excessive spike in state transition validation failures or API 500 errors related to enum serialization.
- **Action**: Disable the `ENABLE_STRICT_LIFECYCLE_GUARDS` feature flag. Revert the alias definitions to standard enums.
- **Data Safety**: Since the database writes remain largely compatible (or handled via DB-level enum extensions), data loss is avoided.

## 9. Validation Checklist

- [ ] Shared Contracts updated with base `ILifecycle` interfaces.
- [ ] Aliases created for duplicated system lifecycles.
- [ ] Serialization mappers implemented for PascalCase conversion.
- [ ] Domain aggregates updated to emit `EntityStateChangedEvent`.
- [ ] Transition validators deployed behind feature flags.

## 10. Readiness Assessment

**Decision**: APPROVED.

The migration strategy ensures absolute safety through aliasing, zero-downtime database strategies, and feature-flagged validation enforcement.

GO to Final ARB Review
