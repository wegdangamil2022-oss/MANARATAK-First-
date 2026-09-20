# Phase 05 Enterprise Asset Platform (EAP) - Slice 2B: Application Layer

## Overview
Slice 2B implements the application layer use cases, DTOs, and mapping logic for the Phase 05 Enterprise Asset Platform (EAP), consuming the domain core defined in Slice 2A.

## Implemented Artifacts

### 1. DTO Contracts (`packages/application/src/asset-platform/dtos/AssetDtos.ts`)
- `RequestAssetUploadLocatorDto`: Request payload for acquiring an upload storage locator.
- `AssetUploadLocatorDto`: Response payload returning the quarantine locator and initial state.
- `RegisterQuarantinedAssetDto`: Payload for registering an asset directly into quarantine.
- `ValidateAssetDto`: Input for triggering asset validation and malware scanning.
- `MarkAssetMalwareScanFailedDto`: Input for recording malware scan failures.
- `SanitizeAssetDto`: Input for sanitization and EXIF metadata stripping.
- `ActivateAssetDto`: Input for activating a validated/sanitized asset into the clean storage zone.
- `ArchiveAssetDto`: Input for archiving an active asset.
- `SoftDeleteAssetDto`: Input for soft deleting an asset.
- `RestoreAssetDto`: Input for restoring a soft-deleted asset.
- `PurgeAssetDto`: Input for permanently purging an asset.
- `AssetRecordDto`: Read model representation of an asset.

### 2. Domain-to-DTO Mapper (`packages/application/src/asset-platform/mappers/AssetRecordMapper.ts`)
- `AssetRecordMapper.toDto()`: Maps domain `AssetRecord` instances to `AssetRecordDto` without exposing domain internals or event history.

### 3. Use Cases (`packages/application/src/asset-platform/use-cases/`)
- `IngestAssetUseCase`:
  - `requestUploadLocator()`: Requests a quarantine upload locator from `IAssetStorageGateway`, creates an `AssetRecord` in `INITIATED` state, assigns quarantine locator, persists via `IAssetRecordRepository`, and returns locator details.
  - `registerQuarantinedAsset()`: Registers an asset record in quarantine state.
- `ProcessAssetLifecycleUseCase`:
  - `validateAsset()`: Triggers validation & optional malware scan via `IAssetMalwareScannerGateway`.
  - `markMalwareScanFailed()`: Transitions state to `MALWARE_SCAN_FAILED` and records threat reasons.
  - `sanitizeAsset()`: Strips EXIF/metadata via `IAssetSanitizationGateway` or provided parameters and transitions to `SANITIZING`.
  - `activateAsset()`: Relocates asset to `CLEAN` storage zone via `IAssetStorageGateway` and transitions state to `ACTIVE`.
  - `archiveAsset()`: Archives asset in storage and updates retention category.
  - `softDeleteAsset()`: Soft deletes asset and updates retention category.
  - `restoreAsset()`: Restores soft-deleted asset back to active state.
  - `purgeAsset()`: Verifies asset is not in use via `IAssetUsageRegistryGateway`, deletes physical storage file, and transitions state to `PURGED`.

### 4. Unit Tests (`packages/application/tests/asset-platform/AssetPlatformUseCases.spec.ts`)
- Verified upload locator request creates quarantined asset record.
- Verified malware scan failure prevents activation.
- Verified activation progression through validation and sanitization.
- Verified purge is blocked when `IAssetUsageRegistryGateway` reports active usage.

## Scope Safeguards
- No API routes created or modified.
- No Express or HTTP dependencies introduced.
- No Prisma schema, migration, or database adapters touched.
- No DI container bindings created or modified (`apps/api/src/infrastructure/di/container.ts` untouched).
- Legacy `file-management` module preserved without modification.
- Consuming domain models untouched.
