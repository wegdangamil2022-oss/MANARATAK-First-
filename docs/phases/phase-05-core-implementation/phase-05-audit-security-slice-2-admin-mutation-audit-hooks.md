# Phase 05 Audit/Security Slice 2: Admin Mutation Audit Hooks

## Overview
Phase 05 Slice 2 integrates non-blocking, structured audit logging across administrative mutation endpoints in the core platform. All state-changing operations in `AuthorizationAdminRouter`, `SettingsAdminRouter`, `IdentityRouter`, and `AssetPlatformRouter` now construct and persist `AuditRecord` entries without exposing audit internals or disrupting primary business operations.

---

## Key Components Implemented

### 1. `AuditHelper` (`apps/api/src/presentation/audit/AuditHelper.ts`)
- Reusable static utility providing `recordMutation`.
- Safely extracts request contextual data (`x-actor-id`, `x-correlation-id`, `x-trace-id`, request IP, user-agent).
- Wraps persistence in an error-contained try-catch block to guarantee best-effort, non-blocking execution.
- Integrates directly with `IAuditRecordRepository` and enforces redaction via `AuditSecretSanitizer` in repository implementations.

### 2. Router Integration
- **`AuthorizationAdminRouter`**:
  - `POST /roles` -> Logs `CREATE_ROLE` (category: `AUTHORIZATION`, targetType: `ROLE`).
  - `POST /assignments` -> Logs `ASSIGN_ROLE` (category: `AUTHORIZATION`, targetType: `ROLE_ASSIGNMENT`).
  - `GET /roles/:id` -> Read-only endpoint; excluded from audit logging.
- **`SettingsAdminRouter`**:
  - `POST /definitions` -> Logs `CREATE_SETTING_DEFINITION` (category: `SETTINGS`, targetType: `SETTING_DEFINITION`).
  - `POST /assignments` -> Logs `ASSIGN_SETTING_VALUE` (category: `SETTINGS`, targetType: `SETTING_ASSIGNMENT`).
  - `POST /assignments/rollback` -> Logs `ROLLBACK_SETTING_VALUE` (category: `SETTINGS`, targetType: `SETTING_ASSIGNMENT`).
- **`IdentityRouter`**:
  - `POST /` -> Logs `PROVISION_IDENTITY` (category: `IDENTITY`, targetType: `IDENTITY`).
  - `POST /:id/activate` -> Logs `ACTIVATE_IDENTITY`.
  - `POST /:id/suspend` -> Logs `SUSPEND_IDENTITY`.
  - `POST /:id/archive` -> Logs `ARCHIVE_IDENTITY`.
  - `DELETE /:id` -> Logs `PURGE_IDENTITY`.
  - `PUT /:id/profile` -> Logs `UPDATE_IDENTITY_PROFILE`.
  - `PUT /:id/contact` -> Logs `UPDATE_IDENTITY_CONTACT`.
  - `GET /:id` and `GET /` -> Read-only endpoints; excluded from audit logging.
- **`AssetPlatformRouter`**:
  - `POST /upload-locator` -> Logs `REQUEST_ASSET_UPLOAD` (category: `ASSET_PLATFORM`, targetType: `ASSET`).
  - `POST /register-quarantined` -> Logs `REGISTER_QUARANTINED_ASSET`.
  - `POST /:assetId/validate` -> Logs `VALIDATE_ASSET`.
  - `POST /:assetId/malware-failed` -> Logs `MARK_ASSET_MALWARE_FAILED`.
  - `POST /:assetId/sanitize` -> Logs `SANITIZE_ASSET`.
  - `POST /:assetId/activate` -> Logs `ACTIVATE_ASSET`.
  - `POST /:assetId/archive` -> Logs `ARCHIVE_ASSET`.
  - `DELETE /:assetId` -> Logs `SOFT_DELETE_ASSET`.
  - `POST /:assetId/restore` -> Logs `RESTORE_ASSET`.
  - `DELETE /:assetId/purge` -> Logs `PURGE_ASSET`.

### 3. DI Container Configuration (`apps/api/src/infrastructure/di/container.ts`)
- Updated router registrations to inject `auditRecordRepo` into router constructors via Awilix cradle injection.

---

## Verification Strategy & Test Coverage
- Unit and integration tests added in `apps/api/tests/presentation/audit/AdminMutationAuditHooks.spec.ts`.
- Validates:
  1. Creation of audit records upon successful mutations with expected fields (`actorId`, `correlationId`, `action`, `resource`, `result`, metadata).
  2. Exclusion of read-only GET endpoints from generating audit logs.
  3. Non-blocking error containment when `auditRecordRepo.save()` fails.
  4. Automatic recursive sanitization of secret metadata.
