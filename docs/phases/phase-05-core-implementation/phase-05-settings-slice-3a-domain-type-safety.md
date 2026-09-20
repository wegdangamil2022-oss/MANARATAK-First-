# Phase 05 Settings / Configuration Foundation — Slice 3A: Domain Core & Application Type Safety

## Overview

Slice 3A establishes the real Settings / Configuration domain core and removes legacy type suppressions (`@ts-nocheck`) in the application layer.

## Deliverables

### 1. Real Domain Bounded Context (`packages/domain/src/settings/`)
- **`NamespacedKey`**: Value object validating namespaced setting key formatting.
- **`ScopeLevel`**: Enum defining valid scope levels (`GLOBAL`, `TENANT`, `DOMAIN`, `IDENTITY`).
- **`ScopeIdentifier`**: Value object managing scope assignments; rejects `ORGANIZATION` scope per ADR-027.
- **`ValueType`**: Enum defining supported value data types (`String`, `Number`, `Boolean`, `Json`).
- **`SettingValueData`**: Abstract base class and strongly typed subclasses (`StringValue`, `NumberValue`, `BooleanValue`, `JsonValue`).
- **`SettingVersion`**: Immutable record representing a versioned value change with metadata.
- **`SettingDefinition`**: Aggregate root for setting definitions and default values.
- **`SettingAssignment`**: Aggregate root managing version history and rollbacks for scope setting assignments.
- **`ConfigurationValidationService`**: Domain service validating setting values against definition types.
- **`ConfigurationResolutionService`**: Domain service handling hierarchical precedence resolution.
- **`ISettingDefinitionRepository` & `ISettingAssignmentRepository`**: Domain repository interfaces.

### 2. Application Layer Type Safety (`packages/application/src/settings/`)
- Removed `// @ts-nocheck` from `ManageSettingsUseCase.ts`.
- Updated DTOs in `SettingsDtos.ts` with strict type definitions and neutral scope level comments.
- Updated `ResolveConfigurationUseCase.ts` to accept neutral scope identifier parameters (`scopeIdOrTenantId`).

### 3. Verification & Tests
- Added unit tests in `packages/domain/tests/settings/` for key validation, scope rejection/acceptance, value type checks, and assignment rollback.
- Added application use-case unit tests in `packages/application/tests/settings/` using in-memory repositories.
