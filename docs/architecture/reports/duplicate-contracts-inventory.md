# Duplicate Contracts Inventory & Canonical Mapping

## 1. Executive Summary
This document provides the official migration plan for eliminating duplicate contracts, interfaces, types, enums, and shared models across `packages/core`, `packages/shared`, and `packages/domain`. The plan is governed strictly by the **Core vs. Shared Architecture Boundaries Specification (STD-ARC-002)** and the updated rule that an artifact must be used by at least **two independent bounded contexts** to be promoted to `packages/shared`.

## 2. Duplicate Contracts Inventory

### 2.1 `FileMetadata`
*   **Current Locations:**
    *   `packages/core/src/application/storage/FileMetadata.ts` (Interface)
    *   `packages/domain/src/file-management/value-objects/FileMetadata.ts` (Class)
*   **Package Ownership:** `core` and `domain/file-management`
*   **Current Consumers:** `core` (IStorageProvider, IStorageService), `domain/file-management` (FileRecord), `infrastructure/storage` (LocalStorageProvider). (Used by 1 bounded context outside of infrastructure).
*   **Recommended Canonical Location:** `packages/core/src/application/storage/FileMetadata.ts` (and renaming the domain entity if they diverge, but as a shared contract, `core` holds the abstraction).
*   **Justification:** `FileMetadata` in `core` acts as an infrastructural abstraction payload for `IStorageProvider`. The domain context `file-management` has its own Value Object. Because `file-management` is the only domain using it, it should not be moved to `shared`. The `core` interface must remain in `core` as part of the system-level storage abstractions. The domain class remains in `file-management`.
*   **Status:** `core` = Canonical, `domain` = Needs Review (Potential rename to `StorageFileMetadata`).

### 2.2 `ApiMetadata` (and `ApiResponse`)
*   **Current Locations:**
    *   `packages/core/src/presentation/api/ApiResponse.ts` (Interface)
    *   `packages/domain/src/api-foundation/value-objects/ApiMetadata.ts` (Class)
*   **Package Ownership:** `core` and `domain/api-foundation`
*   **Current Consumers:** `domain/api-foundation` (ApiService).
*   **Recommended Canonical Location:** `packages/shared/src/api/ApiResponse.ts` and `packages/shared/src/api/ApiMetadata.ts`
*   **Justification:** `ApiResponse` and `ApiMetadata` are standard API envelopes and cross-domain DTOs. According to STD-ARC-002, API Envelopes are explicitly forbidden in `core` and belong in `shared`. While currently heavily used by `api-foundation`, an API envelope is intrinsically a cross-cutting platform concern used by delivery mechanisms across all contexts.
*   **Status:** `shared` = Canonical (to be moved), `core` = Duplicate/Deprecated, `domain` = Duplicate/Deprecated.

### 2.3 `CompatibilityMetadata`
*   **Current Locations:**
    *   `packages/domain/src/api-foundation/value-objects/CompatibilityMetadata.ts` (Class)
    *   `packages/domain/src/shared-components/value-objects/CompatibilityMetadata.ts` (Class)
*   **Package Ownership:** `domain/api-foundation` and `domain/shared-components`
*   **Current Consumers:** `api-foundation` (ApiService), `shared-components` (SharedComponent). (Used by 2 bounded contexts).
*   **Recommended Canonical Location:** `packages/shared/src/value-objects/CompatibilityMetadata.ts`
*   **Justification:** This identical Value Object is utilized by two independent bounded contexts (`api-foundation` and `shared-components`). By the updated promotion rules, it qualifies as a true cross-domain contract.
*   **Status:** `shared` = Canonical, `domain/api-foundation` = Duplicate, `domain/shared-components` = Duplicate.

### 2.4 `IValidationContext`
*   **Current Locations:**
    *   `packages/core/src/application/validation/IValidationContext.ts` (Interface)
    *   `packages/domain/src/import-foundation/contracts/validation/IValidationContext.ts` (Interface)
*   **Package Ownership:** `core` and `domain/import-foundation`
*   **Current Consumers:** `core` (IValidationPipeline), `domain/import-foundation` (IValidationResolutionBoundary, ValidationContracts.spec.ts). (Used by 1 bounded context).
*   **Recommended Canonical Location:** `packages/core/src/application/validation/IValidationContext.ts`
*   **Justification:** Validation context is a system-level infrastructural abstraction that defines how the application pipeline executes. It fits perfectly in `core`. The `import-foundation` domain should consume the `core` contract rather than redefining it locally. It does not go to `shared` because it is an architectural contract.
*   **Status:** `core` = Canonical, `domain` = Duplicate/Deprecated.

### 2.5 `LogEntry`
*   **Current Locations:**
    *   `packages/core/src/application/logging/ILogger.ts` (Interface)
    *   `packages/domain/src/logging/aggregates/LogEntry.ts` (Class)
*   **Package Ownership:** `core` and `domain/logging`
*   **Current Consumers:** `application/logging`, `domain/logging`, `infrastructure/logging`. (Used by 1 bounded context).
*   **Recommended Canonical Location:** N/A (Separation of Concerns). `ILogger.LogEntry` stays in `core`, Aggregate stays in `domain/logging`.
*   **Justification:** These are not strict duplicates but a naming collision. `ILogger` in `core` uses `LogEntry` as a generic payload interface for infrastructure loggers. `domain/logging` uses `LogEntry` as a rich Aggregate Root. Since `logging` is the only domain context, we do not move it to `shared`.
*   **Status:** Needs Review (Rename `core` interface to `LogPayload` to avoid collision).

### 2.6 `Role`
*   **Current Locations:**
    *   `packages/core/src/application/authorization/Types.ts` (Type alias: `type Role = string`)
    *   `packages/domain/src/authorization/aggregates/Role.ts` (Class / Aggregate)
*   **Package Ownership:** `core` and `domain/authorization`
*   **Current Consumers:** `core` (IAuthorizationService, IPermissionEvaluator), `domain/authorization`, `infrastructure/authorization`. (Used by 1 bounded context).
*   **Recommended Canonical Location:** N/A (Separation of Concerns).
*   **Justification:** Another naming collision. `core` defines a simple type alias for passing role identifiers to the infrastructure authorization provider. `domain/authorization` contains the actual business Aggregate Root. This does not belong in `shared`.
*   **Status:** Needs Review (Rename `core` type to `RoleIdentifier` or `RoleId`).

### 2.7 `SecurityClassification`
*   **Current Locations:**
    *   `packages/domain/src/file-management/enums/SecurityClassification.ts` (Enum)
    *   `packages/domain/src/security/value-objects/SecurityClassification.ts` (Contains `SecuritySensitivity` Enum & `SecurityPolicyClassification` Class)
*   **Package Ownership:** `domain/file-management` and `domain/security`
*   **Current Consumers:** `application/file-management`, `domain/file-management`, `domain/security`. (Used by 2 bounded contexts).
*   **Recommended Canonical Location:** `packages/shared/src/enums/SecurityClassification.ts`
*   **Justification:** This classification concept represents a global enterprise taxonomy (Public, Internal, Confidential, Restricted) used by both file storage policies and overarching security policies. Since it is shared across two bounded contexts, it must be promoted to `shared`.
*   **Status:** `shared` = Canonical, `domain/file-management` = Duplicate, `domain/security` = Duplicate.


## 3. Canonical Mapping Table

| Contract Name | Current Locations | Canonical Location | Status |
| :--- | :--- | :--- | :--- |
| `ApiResponse` & `ApiMetadata` | `core/src/presentation/api/ApiResponse.ts`<br>`domain/src/api-foundation/value-objects/ApiMetadata.ts` | `shared/src/api/ApiResponse.ts`<br>`shared/src/api/ApiMetadata.ts` | Promote to `shared` |
| `CompatibilityMetadata` | `domain/src/api-foundation/value-objects/CompatibilityMetadata.ts`<br>`domain/src/shared-components/value-objects/CompatibilityMetadata.ts` | `shared/src/value-objects/CompatibilityMetadata.ts` | Promote to `shared` |
| `SecurityClassification` | `domain/src/file-management/enums/SecurityClassification.ts`<br>`domain/src/security/value-objects/SecurityClassification.ts` | `shared/src/enums/SecurityClassification.ts` | Promote to `shared` |
| `IValidationContext` | `core/src/application/validation/IValidationContext.ts`<br>`domain/src/import-foundation/contracts/validation/IValidationContext.ts` | `core/src/application/validation/IValidationContext.ts` | Consolidate in `core` |
| `FileMetadata` | `core/src/application/storage/FileMetadata.ts`<br>`domain/src/file-management/value-objects/FileMetadata.ts` | Keep separate, rename `domain` to avoid collision. | Needs Review |
| `LogEntry` | `core/src/application/logging/ILogger.ts`<br>`domain/src/logging/aggregates/LogEntry.ts` | Keep separate, rename `core` to `LogPayload`. | Needs Review |
| `Role` | `core/src/application/authorization/Types.ts`<br>`domain/src/authorization/aggregates/Role.ts` | Keep separate, rename `core` type to `RoleIdentifier`. | Needs Review |


## 4. Migration Impact Analysis

Executing this architectural migration will affect the following packages and imports:

1. **`@manaratak/core`**:
   - Removes `ApiResponse` and `ApiMetadata` (Moves to shared).
   - Needs internal renames for `Role` type -> `RoleIdentifier` and `LogEntry` -> `LogPayload`.
2. **`@manaratak/shared`**:
   - Gains new global artifacts: `ApiResponse`, `ApiMetadata`, `CompatibilityMetadata`, `SecurityClassification`.
3. **`@manaratak/domain`**:
   - `api-foundation`: Needs to update imports to use `@manaratak/shared` for `ApiMetadata` and `CompatibilityMetadata`.
   - `shared-components`: Needs to update imports to use `@manaratak/shared` for `CompatibilityMetadata`.
   - `file-management`: Needs to update imports for `SecurityClassification` to `@manaratak/shared`. Rename internal `FileMetadata` if required.
   - `security`: Needs to update imports for `SecurityClassification` to `@manaratak/shared`.
   - `import-foundation`: Must drop local `IValidationContext` and import from `@manaratak/core`.
4. **`@manaratak/application`**:
   - Will need to update imports reflecting the changes in `core` (like `Role` -> `RoleIdentifier`) and new shared DTOs.
5. **`@manaratak/infrastructure`**:
   - Will be impacted by interface renaming in `core` (`LogEntry` -> `LogPayload`) and `Role` -> `RoleIdentifier`.

## 5. Execution Mandates
- **Do not** promote any artifact to `shared` if it has only one bounded context consumer.
- **Do not** leave duplicated contracts in `domain` if a canonical core/shared implementation is assigned.
- **Do not** leak domain-specific logic into `shared` during this migration.
