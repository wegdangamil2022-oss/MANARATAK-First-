> **Historical / superseded runtime note (MNT-AUD-0109, W2):** `createInMemoryPrismaClient()` was removed from the canonical production composition on 2026-09-06. This document is retained only as historical evidence and must not be used as current runtime authority.

# Phase 05 Enterprise Asset Platform (EAP) - Slice 2D: API Routes & DI Container Wiring

## Overview
Slice 2D completes the exposure of Phase 05 Enterprise Asset Platform (EAP) capabilities via API routes and Dependency Injection (DI) wiring in the API application layer without modifying UI or consuming domains.

## Allowed Scope & Modifed Files
1. `apps/api/src/presentation/api/router/AssetPlatformRouter.ts` (NEW)
   - Created `AssetPlatformRouter` using Express and Zod validation.
   - Exposed administrative & system-safe asset lifecycle endpoints under `/api/v1/admin/assets` protected by admin guard and `admin:assets:manage` permission guard.
   - Rejects raw `http://` or `https://` URLs as `assetId` or `assetReference` with 400 Bad Request.

2. `apps/api/src/infrastructure/di/container.ts` (MODIFIED)
   - Registered EAP repositories (`assetRecordRepository` -> `PrismaAssetRecordRepository`).
   - Registered EAP gateways (`assetStorageGateway`, `assetMalwareScannerGateway`, `assetSanitizationGateway`, `assetUsageRegistryGateway`).
   - Registered EAP use cases (`ingestAssetUseCase`, `processAssetLifecycleUseCase`).
   - Registered `assetPlatformRouter` with explicit typed destructuring without `any` cast.
   - Updated `createInMemoryPrismaClient()` handler to support `assetRecord` and `upsert` queries.

3. `apps/api/src/app.ts` (MODIFIED)
   - Mounted `assetPlatformRouter` under `/admin/assets` on `v1Router` (resolving to `/api/v1/admin/assets`) protected with `requireAdminPermission('admin:assets:manage')`.
   - Removed unprotected `/assets` mount point.
   - Preserved legacy `/files` route and `FileManagementRouter` untouched.

4. `apps/api/tests/presentation/api/router/AssetPlatformRouter.spec.ts` (NEW)
   - Comprehensive test suite for all EAP API endpoints, validation errors, lifecycle state transition handling, and security guards (401/403).

5. `docs/phases/phase-05-core-implementation/phase-05-eap-slice-2d-api-di.md` (NEW)
   - Documentation of Slice 2D API routes, DI setup, security guard protection, and safety boundaries.

## Exposed Endpoints (`/api/v1/admin/assets` - Requires `admin:assets:manage` permission)
- `POST /upload-locator`: Request upload locator for asset quarantine zone.
- `POST /register-quarantined`: Register quarantined asset metadata.
- `POST /:assetId/validate`: Validate asset (run malware scanning if configured).
- `POST /:assetId/malware-failed`: Mark malware scan failure.
- `POST /:assetId/sanitize`: Sanitize asset EXIF metadata and assign sanitization metadata.
- `POST /:assetId/activate`: Activate asset and move to clean storage zone.
- `POST /:assetId/archive`: Archive asset and move locator to archive zone.
- `DELETE /:assetId`: Soft delete asset.
- `POST /:assetId/restore`: Restore soft-deleted asset.
- `DELETE /:assetId/purge`: Hard purge asset if not registered as in use in usage registry.

## Security & Constraints Adherence
- **Route Security**: EAP routes are mounted under `/api/v1/admin/assets` and protected by `SecurityMiddlewareFactory.createAdminGuard` and `requireAdminPermission('admin:assets:manage')`. Unprotected `/api/v1/assets` route mount is removed.
- **No UI Modifications**: Neither `apps/admin` nor `apps/public` UI was modified.
- **No Consuming Domain Touch**: No scholarship, course, university, certificate, CMS, or student workspace files were changed.
- **No Legacy File Management Deprecation**: Legacy `/v1/files` routes remain active and unchanged.
- **No Physical Path Exposure**: Physical storage paths are not returned as public web URLs. Handles must be referenced via asset IDs and storage locators.
- **No Raw URL References**: Raw URLs are rejected by `AssetId` and `AssetReference` validation.

