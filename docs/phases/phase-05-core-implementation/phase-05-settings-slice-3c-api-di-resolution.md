# Phase 05 Settings / Configuration Foundation — Slice 3C: API & DI Resolution

## Overview
Slice 3C wires the Settings domain into the application's runtime API and Dependency Injection container, enforcing robust validation and honoring proper configuration scopes.

## Deliverables

### 1. Dependency Injection (`apps/api/src/infrastructure/di/container.ts`)
- Replaced `InMemorySettingDefinitionRepository` and `InMemorySettingAssignmentRepository` with their `Prisma` counterparts (`PrismaSettingDefinitionRepository`, `PrismaSettingAssignmentRepository`) when running in Prisma mode (i.e. `isPrisma` flag).
- In-memory equivalents are kept available for testing or when `DATABASE_URL` is omitted.

### 2. Admin Router Validation (`apps/api/src/presentation/api/router/SettingsAdminRouter.ts`)
- Implemented `zod` schema validation for all incoming administrative payloads:
  - `createDefinition`
  - `assignValue`
  - `rollbackValue`
- Ensured strong typing, including checking against `ValueType` enums and requiring specific properties before handing off to the application use cases.
- Protected endpoints implicitly remain covered by `requireAdminPermission('admin:settings:manage')` in `app.ts`.

### 3. Runtime Resolution & Scope Alignment (`apps/api/src/presentation/api/router/SettingsRuntimeRouter.ts`)
- Updated the resolution API endpoint (`GET /resolve/:key`) to accept `identityId`, `tenantId`, and `scopeId`.
- Maintained a deprecated `organizationId` parameter purely for backwards compatibility, immediately mapping it to `tenantId`/`scopeId` without exposing any internal "Organization" scope concepts.
- The `ConfigurationResolutionService` successfully falls back across `IDENTITY > TENANT > DOMAIN > GLOBAL` natively through the mapped scope IDs.

### 4. Tests Added
- `SettingsAdminRouter.spec.ts`: Asserts successful validations and rejection of malformed requests.
- `SettingsRuntimeRouter.spec.ts`: Validates proper delegation, error handling, and backwards-compatible handling of `organizationId` as a `tenantId`.

## Boundaries Respected
- No UI changes or standalone platform creations occurred.
- Unrelated endpoints, configurations, and API structures were preserved.
- No `prisma` commands (`generate`, `push`, `migrate`) were executed.
