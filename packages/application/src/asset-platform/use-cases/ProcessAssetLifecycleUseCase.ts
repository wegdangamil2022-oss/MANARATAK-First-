import {
  IAssetRecordRepository,
  IAssetStorageGateway,
  IAssetUsageRegistryGateway,
  IAssetMalwareScannerGateway,
  IAssetSanitizationGateway,
  AssetId,
  AssetLifecycleState,
} from '@manaratak/domain';

import {
  ValidateAssetDto,
  FinalizeAssetUploadDto,
  MarkAssetMalwareScanFailedDto,
  SanitizeAssetDto,
  ActivateAssetDto,
  ArchiveAssetDto,
  SoftDeleteAssetDto,
  RestoreAssetDto,
  PurgeAssetDto,
  AssetRecordDto,
  RequestAssetDeliveryGrantDto,
  AssetDeliveryGrantDto
} from '../dtos/AssetDtos';
import { AssetRecordMapper } from '../mappers/AssetRecordMapper';

export class ProcessAssetLifecycleUseCase {
  constructor(
    private readonly assetRepository: IAssetRecordRepository,
    private readonly storageGateway: IAssetStorageGateway,
    private readonly usageRegistry: IAssetUsageRegistryGateway,
    private readonly malwareScannerGateway?: IAssetMalwareScannerGateway,
    private readonly sanitizationGateway?: IAssetSanitizationGateway
  ) {}

  /**
   * Marks a direct-to-quarantine upload as complete only after provider-owned verification.
   * Recording the verification precedes malware scanning and is revision-gated by the repository.
   */
  public async finalizeUploadedAsset(dto: FinalizeAssetUploadDto): Promise<AssetRecordDto> {
    const id = new AssetId(dto.assetId);
    const record = await this.assetRepository.findById(id);
    if (!record) throw new Error(`Asset not found: ${dto.assetId}`);
    if (!this.storageGateway.verifyUploadedObject) {
      throw new Error('ASSET_UPLOAD_VERIFICATION_NOT_CONFIGURED');
    }
    // Domain accepts INITIATED (and legacy unverified QUARANTINED) only after provider proof.
    const verified = await this.storageGateway.verifyUploadedObject(record.locator, {
      expectedByteSize: record.metadata.byteSize,
      declaredMimeType: record.metadata.mimeType,
    });
    record.confirmUploadedObject({ ...verified, locator: record.locator.value });
    await this.assetRepository.save(record);
    return AssetRecordMapper.toDto(record);
  }

  public async validateAsset(dto: ValidateAssetDto): Promise<AssetRecordDto> {
    const id = new AssetId(dto.assetId);
    const record = await this.assetRepository.findById(id);
    if (!record) {
      throw new Error(`Asset not found: ${dto.assetId}`);
    }

    if (!record.uploadVerification ||
      record.uploadVerification.locator !== record.locator.value ||
      record.uploadVerification.signatureVerified !== true ||
      record.checksum?.hash !== record.uploadVerification.checksumSha256.toLowerCase()) {
      throw new Error('ASSET_UPLOAD_FINALIZATION_REQUIRED');
    }
    if (!this.storageGateway.verifyUploadedObject) {
      throw new Error('ASSET_UPLOAD_VERIFICATION_NOT_CONFIGURED');
    }
    // A completed upload is not immutable merely because it has finalization evidence.
    // Reobserve the bytes immediately before scanning and reject overwrite attempts.
    const verified = await this.storageGateway.verifyUploadedObject(record.locator, {
      expectedByteSize: record.uploadVerification.byteSize,
      declaredMimeType: record.uploadVerification.verifiedMimeType,
    });
    if (verified.signatureVerified !== true ||
        verified.byteSize !== record.uploadVerification.byteSize ||
        verified.verifiedMimeType !== record.uploadVerification.verifiedMimeType ||
        !Number.isFinite(Date.parse(verified.verifiedAt)) ||
        verified.checksumSha256.toLowerCase() !== record.uploadVerification.checksumSha256.toLowerCase()) {
      throw new Error('ASSET_UPLOAD_CHANGED_AFTER_FINALIZATION');
    }
    record.startValidation();

    if (!this.malwareScannerGateway) {
      throw new Error('ASSET_MALWARE_SCANNING_NOT_CONFIGURED');
    }
    const scanResult = await this.malwareScannerGateway.scan(record.locator);
    if (!scanResult.clean) {
      const reason = scanResult.threatsFound?.join(', ') || 'Malware detected during scan';
      record.failMalwareScan(reason);
      await this.assetRepository.save(record);
      return AssetRecordMapper.toDto(record);
    }
    record.passMalwareScan();

    await this.assetRepository.save(record);
    return AssetRecordMapper.toDto(record);
  }

  public async markMalwareScanFailed(dto: MarkAssetMalwareScanFailedDto): Promise<AssetRecordDto> {
    const id = new AssetId(dto.assetId);
    const record = await this.assetRepository.findById(id);
    if (!record) {
      throw new Error(`Asset not found: ${dto.assetId}`);
    }

    record.failMalwareScan(dto.reason);
    await this.assetRepository.save(record);
    return AssetRecordMapper.toDto(record);
  }

  public async sanitizeAsset(dto: SanitizeAssetDto): Promise<AssetRecordDto> {
    const id = new AssetId(dto.assetId);
    const record = await this.assetRepository.findById(id);
    if (!record) {
      throw new Error(`Asset not found: ${dto.assetId}`);
    }

    if (!this.sanitizationGateway) {
      throw new Error('ASSET_SANITIZATION_NOT_CONFIGURED');
    }
    if (!this.storageGateway.verifyUploadedObject) {
      throw new Error('ASSET_UPLOAD_VERIFICATION_NOT_CONFIGURED');
    }
    if (!this.malwareScannerGateway) {
      throw new Error('ASSET_MALWARE_SCANNING_NOT_CONFIGURED');
    }
    record.startSanitizing();
    const result = await this.sanitizationGateway.sanitize(record.locator);
    record.completeSanitization(result.metadata, result.sanitizedLocator);
    const verified = await this.storageGateway.verifyUploadedObject(record.locator, {
      declaredMimeType: record.metadata.mimeType,
    });
    record.confirmSanitizedObject({ ...verified, locator: record.locator.value });
    const rescanned = await this.malwareScannerGateway.scan(record.locator);
    if (!rescanned.clean) {
      record.failMalwareScan(rescanned.threatsFound?.join(', ') || 'Threat in sanitized output');
      await this.assetRepository.save(record);
      return AssetRecordMapper.toDto(record);
    }
    // A sanitizer or scanner must not silently change bytes during post-scan verification.
    const observed = await this.storageGateway.verifyUploadedObject(record.locator, {
      declaredMimeType: record.metadata.mimeType, expectedByteSize: verified.byteSize,
    });
    if (observed.signatureVerified !== true ||
        observed.byteSize !== verified.byteSize ||
        observed.verifiedMimeType !== verified.verifiedMimeType ||
        !Number.isFinite(Date.parse(observed.verifiedAt)) ||
        observed.checksumSha256.toLowerCase() !== verified.checksumSha256.toLowerCase()) {
      throw new Error('ASSET_SANITIZED_CONTENT_CHANGED_DURING_SCAN');
    }
    record.passSanitizedMalwareScan();
    await this.assetRepository.save(record);
    return AssetRecordMapper.toDto(record);
  }

  public async activateAsset(dto: ActivateAssetDto): Promise<AssetRecordDto> {
    const id = new AssetId(dto.assetId);
    let record = await this.assetRepository.findById(id);
    if (!record) throw new Error(`Asset not found: ${dto.assetId}`);
    // A lost HTTP response after a committed activation is safe to retry.
    if (record.state === AssetLifecycleState.ACTIVE && record.activationOperation?.phase === 'COMPLETED') {
      record.assertCanDeliver();
      return AssetRecordMapper.toDto(record);
    }
    record.assertCanActivate();
    if (!record.activationOperation) {
      if (!this.storageGateway.verifyUploadedObject) throw new Error('ASSET_UPLOAD_VERIFICATION_NOT_CONFIGURED');
      const verified = await this.storageGateway.verifyUploadedObject(record.locator, {
        declaredMimeType: record.metadata.mimeType, expectedByteSize: record.uploadVerification?.byteSize,
      });
      if (verified.signatureVerified !== true || verified.byteSize !== record.uploadVerification?.byteSize ||
          verified.verifiedMimeType !== record.metadata.mimeType || !Number.isFinite(Date.parse(verified.verifiedAt)) ||
          verified.checksumSha256.toLowerCase() !== record.checksum?.hash) {
        throw new Error('ASSET_QUARANTINE_CONTENT_CHANGED_BEFORE_ACTIVATION');
      }
      record.prepareActivation(globalThis.crypto.randomUUID());
      // Commit the intent before provider movement. A rejected CAS never moves bytes.
      await this.assetRepository.save(record);
      const operationId = record.activationOperation!.operationId;
      record = await this.assetRepository.findById(id);
      if (!record || record.activationOperation?.operationId !== operationId) {
        throw new Error('ASSET_ACTIVATION_OPERATION_INVALID');
      }
      if (record.state === AssetLifecycleState.ACTIVE && record.activationOperation.phase === 'COMPLETED') {
        record.assertCanDeliver();
        return AssetRecordMapper.toDto(record);
      }
    }
    record.assertActivationOperation();
    const operationId = record.activationOperation!.operationId;
    // Retry the same source+digest key even if source bytes already moved. The provider
    // must durably replay its original digest-bound result; it must never publish twice.
    const cleanLocator = await this.storageGateway.moveToCleanZone(record.locator, record.checksum!.hash);
    record.activate(cleanLocator);
    try {
      await this.assetRepository.save(record);
    } catch (error) {
      // A competing retry may have committed the same promotion. Never compensate by
      // deleting/archiving a CLEAN object another successful command is already using.
      const committed = await this.assetRepository.findById(id);
      if (committed?.state === AssetLifecycleState.ACTIVE &&
          committed.activationOperation?.operationId === operationId &&
          committed.activationOperation.phase === 'COMPLETED' &&
          committed.checksum?.hash === record.checksum?.hash && committed.locator.value === cleanLocator.value) {
        committed.assertCanDeliver();
        return AssetRecordMapper.toDto(committed);
      }
      throw error;
    }
    return AssetRecordMapper.toDto(record);
  }

  public async requestDeliveryGrant(dto: RequestAssetDeliveryGrantDto): Promise<AssetDeliveryGrantDto> {
    const id = new AssetId(dto.assetId);
    const record = await this.assetRepository.findById(id);
    if (!record) throw new Error(`Asset not found: ${dto.assetId}`);
    record.assertCanDeliver();
    if (!this.storageGateway.generateDeliveryGrant) {
      throw new Error('ASSET_SECURE_DELIVERY_NOT_CONFIGURED');
    }
    const grant = await this.storageGateway.generateDeliveryGrant(record.locator, dto.expiresInSeconds ?? 300);
    return {
      assetId: dto.assetId,
      url: grant.url,
      headers: grant.headers,
      expiresAt: grant.expiresAt.toISOString(),
    };
  }

  private async assertNotInUse(id: AssetId, operation: 'archive' | 'soft delete' | 'purge'): Promise<void> {
    // Errors from the registry propagate: an unavailable usage check must not authorize destruction.
    const usages = this.usageRegistry.findUsages ? await this.usageRegistry.findUsages(id) : null;
    const inUse = usages ? usages.length > 0 : await this.usageRegistry.isAssetInUse(id);
    if (inUse) {
      const detail = usages?.length ? ` (${usages.map((usage) => `${usage.consumer}.${usage.field}`).join(', ')})` : '';
      throw new Error(`Cannot ${operation} asset ${id.value} because it is currently in use${detail}`);
    }
  }

  public async archiveAsset(dto: ArchiveAssetDto): Promise<AssetRecordDto> {
    const id = new AssetId(dto.assetId);
    const record = await this.assetRepository.findById(id);
    if (!record) {
      throw new Error(`Asset not found: ${dto.assetId}`);
    }

    await this.assertNotInUse(id, 'archive');
    if (record.state !== AssetLifecycleState.ARCHIVED) {
      record.archive();
      // Persist the access-denying ARCHIVED state before requesting an external move.
      // A failed CAS cannot leave storage archived while the DB still reports ACTIVE.
      await this.assetRepository.save(record);
    }
    // If provider archive fails, the stored ARCHIVED record remains inaccessible.
    // A repeated archive request will retry this idempotent provider operation.
    await this.storageGateway.archive(record.locator);
    return AssetRecordMapper.toDto(record);
  }

  public async softDeleteAsset(dto: SoftDeleteAssetDto): Promise<AssetRecordDto> {
    const id = new AssetId(dto.assetId);
    const record = await this.assetRepository.findById(id);
    if (!record) {
      throw new Error(`Asset not found: ${dto.assetId}`);
    }

    await this.assertNotInUse(id, 'soft delete');
    record.softDelete();
    await this.assetRepository.save(record);
    return AssetRecordMapper.toDto(record);
  }

  public async restoreAsset(dto: RestoreAssetDto): Promise<AssetRecordDto> {
    const id = new AssetId(dto.assetId);
    const record = await this.assetRepository.findById(id);
    if (!record) {
      throw new Error(`Asset not found: ${dto.assetId}`);
    }

    record.restore();
    if (!this.storageGateway.verifyRestoredObject ||
        !record.checksum || !record.metadata.byteSize) {
      throw new Error('ASSET_RESTORE_VERIFICATION_NOT_CONFIGURED');
    }
    if (!this.assetRepository.acquireRestoreLease ||
        !this.assetRepository.releaseRestoreLease || !this.assetRepository.assertRestoreLeaseOwned) {
      throw new Error('ASSET_RESTORE_LEASE_NOT_CONFIGURED');
    }
    // Serialize restore with retention/purge before any provider side effect.
    await this.assetRepository.acquireRestoreLease(record);
    let providerRestoreAttempted = false;
    try {
      await this.assetRepository.assertRestoreLeaseOwned(record);
      providerRestoreAttempted = true;
      await this.storageGateway.restore(record.locator);
      await this.storageGateway.verifyRestoredObject(record.locator, {
        expectedSha256: record.checksum.hash,
        expectedByteSize: record.metadata.byteSize,
        declaredMimeType: record.metadata.mimeType,
      });
      // Repository commits ACTIVE and removes the exact owned lease atomically.
      // Expired or replaced leases make the state CAS fail.
      await this.assetRepository.save(record);
    } catch (error) {
      let compensationError: unknown;
      if (providerRestoreAttempted) {
        // A slow restore may lose its lease to a successful retry/purge. Never
        // archive a competitor's object on the basis of our stale snapshot.
        try {
          await this.assetRepository.assertRestoreLeaseOwned(record);
        } catch (leaseError) {
          throw new Error('ASSET_RESTORE_RECOVERY_REQUIRED', {
            cause: { restoreFailure: error, leaseFailure: leaseError },
          });
        }
        try {
          await this.storageGateway.archive(record.locator);
        } catch (failure) {
          compensationError = failure;
        }
      }
      let releaseError: unknown;
      try {
        await this.assetRepository.releaseRestoreLease(record);
      } catch (failure) {
        releaseError = failure;
      }
      if (compensationError) {
        throw new Error('ASSET_RESTORE_COMPENSATION_FAILED', {
          cause: { restoreFailure: error, compensationFailure: compensationError, leaseReleaseFailure: releaseError },
        });
      }
      if (releaseError) {
        throw new Error('ASSET_RESTORE_LEASE_RELEASE_FAILED', {
          cause: { restoreFailure: error, leaseReleaseFailure: releaseError },
        });
      }
      throw error;
    }
    return AssetRecordMapper.toDto(record);
  }

  public async purgeAsset(dto: PurgeAssetDto): Promise<void> {
    const id = new AssetId(dto.assetId);
    const record = await this.assetRepository.findById(id);
    if (!record) {
      throw new Error(`Asset not found: ${dto.assetId}`);
    }

    await this.assertNotInUse(id, 'purge');

    // Deletion is irreversible: never interpret an absent repository guard as permission.
    if (!this.assetRepository.assertPurgeAllowed) {
      throw new Error('ASSET_PURGE_RETENTION_GUARD_NOT_CONFIGURED');
    }
    const retryingStoredPurge = record.state === 'PURGED';
    if (retryingStoredPurge && !dto.retentionClaimToken) {
      throw new Error('ASSET_PURGE_CLEANUP_LEASE_REQUIRED');
    }
    await this.assetRepository.assertPurgeAllowed(id, new Date(), dto.retentionClaimToken, retryingStoredPurge);

    if (!retryingStoredPurge) {
      record.purge();
      // Durable record state MUST be committed before irreversible provider deletion.
      // If this CAS fails, the external object remains untouched.
      await this.assetRepository.save(record);
    }
    // If provider deletion fails, persisted PURGED + retentionProcessedAt=NULL
    // is a retryable tombstone for the retention worker. Repeated delete must be idempotent.
    await this.storageGateway.delete(record.locator);
  }
}
