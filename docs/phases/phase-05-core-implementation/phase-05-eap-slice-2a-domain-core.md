# Phase 05 Enterprise Asset Platform (EAP) - Slice 2A: Domain Core

## Overview
Slice 2A implements the pure domain core contracts, value objects, aggregate root, lifecycle state machine, domain events, repository contract, and gateway contracts for the Phase 05 Enterprise Asset Platform (EAP).

## Implemented Artifacts

### 1. Value Objects
- `AssetId`: Validates EAP handle format; rejects empty strings and raw HTTP/HTTPS URLs.
- `AssetReference`: Validates EAP handle format; rejects empty strings and raw HTTP/HTTPS URLs.
- `AssetOwnerReference`: Identifies owning entity (`ownerId`, `ownerType`).
- `AssetStorageLocator`: Encapsulates `storageZone` (`QUARANTINE` / `CLEAN`), `bucketName`, and `pathKey`.
- `AssetChecksum`: Encapsulates integrity checksum (`algorithm`, `hash`).
- `AssetMetadata`: File metadata (`originalFilename`, `mimeType`, `fileExtension`, `byteSize`, optional dimensions, duration, and extra metadata).
- `AssetVersion`: Single asset version descriptor.
- `AssetVersionChain`: Ordered version sequence manager.
- `AssetRetentionMetadata`: Retention policy descriptor (`category`, `expiresAt`).
- `AssetSanitizationMetadata`: Metadata regarding EXIF stripping and sanitization notes.

### 2. Enums
- `AssetLifecycleState`: `INITIATED`, `QUARANTINED`, `VALIDATING`, `MALWARE_SCAN_FAILED`, `SANITIZING`, `ACTIVE`, `ARCHIVED`, `DELETED`, `PURGED`.
- `AssetSecurityClassification`: `PUBLIC`, `INTERNAL`, `RESTRICTED`, `CONFIDENTIAL`.
- `AssetRetentionCategory`: `TEMPORARY`, `PERMANENT`, `ARCHIVED`, `SOFT_DELETED`.
- `AssetStorageZone`: `QUARANTINE`, `CLEAN`.

### 3. Aggregate Root
- `AssetRecord`: Core aggregate enforcing domain invariants:
  - Valid lifecycle transitions (`INITIATED` -> `QUARANTINED` -> `VALIDATING` -> `SANITIZING` -> `ACTIVE`).
  - Quarantine assignment enforcement.
  - Strict prevention of activating malware-infected assets.
  - Retention category updates on archive and soft delete.
  - Restoration rules (only from `DELETED` state).
  - Domain event publication for all state transitions.

### 4. Repository & Gateway Contracts
- `IAssetRecordRepository`: Primary persistence contract for `AssetRecord`.
- `IAssetStorageGateway`: Physical storage operations (quarantine upload, clean move, archive, restore, delete).
- `IAssetMalwareScannerGateway`: Malware scanning interface.
- `IAssetSanitizationGateway`: File sanitization and metadata stripping interface.
- `IAssetUsageRegistryGateway`: Usage tracking contract to prevent deleting in-use assets.

### 5. Domain Events
- `AssetQuarantinedEvent`
- `AssetMalwareScanSucceededEvent`
- `AssetMalwareScanFailedEvent`
- `AssetSanitizedEvent`
- `AssetActivatedEvent`
- `AssetArchivedEvent`
- `AssetDeletedEvent`
- `AssetRestoredEvent`

## Scope Safeguards
- No API routes created or modified.
- No application use cases or DI container definitions modified.
- No Prisma schema modifications.
- Existing legacy `file-management` module preserved without modification.
- Consuming domain models untouched.
