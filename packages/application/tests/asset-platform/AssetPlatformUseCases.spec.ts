import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  IAssetRecordRepository,
  IAssetStorageGateway,
  IAssetUsageRegistryGateway,
  IAssetMalwareScannerGateway,
  IAssetSanitizationGateway,
  AssetRecord,
  AssetId,
  AssetReference,
  AssetOwnerReference,
  AssetStorageLocator,
  AssetStorageZone,
  AssetSecurityClassification,
  AssetLifecycleState,
  AssetSanitizationMetadata,
  AssetMetadata,
  AssetRetentionMetadata,
  AssetRetentionCategory,
  MalwareScanResult,
  SanitizationResult
} from '@manaratak/domain';

import {
  IngestAssetUseCase,
  ProcessAssetLifecycleUseCase,
  RequestAssetUploadLocatorDto
} from '../../src';

class InMemoryAssetRecordRepository implements IAssetRecordRepository {
  private store = new Map<string, AssetRecord>();

  async save(asset: AssetRecord): Promise<void> {
    this.store.set(asset.id.value, asset);
  }

  async findById(id: AssetId): Promise<AssetRecord | null> {
    const stored = this.store.get(id.value);
    if (!stored) return null;
    // Emulate Prisma rehydration: mutating an aggregate cannot alter a persisted
    // record until save() commits it. Returning the same object masks failed CAS.
    return new AssetRecord({
      id: stored.id,
      reference: stored.reference,
      locator: stored.locator,
      metadata: stored.metadata,
      retention: stored.retention,
      owner: stored.owner,
      classification: stored.classification,
      state: stored.state,
      checksum: stored.checksum,
      sanitization: stored.sanitization,
      malwareScan: stored.malwareScan ? { ...stored.malwareScan } : undefined,
      uploadVerification: stored.uploadVerification ? { ...stored.uploadVerification } : undefined,
      versionChain: stored.versionChain,
    });
  }

  async findByReference(reference: AssetReference): Promise<AssetRecord | null> {
    for (const asset of this.store.values()) {
      if (asset.reference.value === reference.value) return asset;
    }
    return null;
  }

  async assertPurgeAllowed(id: AssetId, at: Date, token?: string, retryPurgedCleanup = false): Promise<void> {
    const record = this.store.get(id.value);
    if (!record || (record.state !== AssetLifecycleState.DELETED &&
        !(record.state === AssetLifecycleState.PURGED && retryPurgedCleanup && !!token))) {
      throw new Error('ASSET_PURGE_SOFT_DELETE_REQUIRED');
    }
    if (!record.retention.expiresAt || record.retention.expiresAt.getTime() > at.getTime()) {
      throw new Error('ASSET_PURGE_RETENTION_NOT_EXPIRED');
    }
  }

  async findByOwner(owner: AssetOwnerReference): Promise<AssetRecord[]> {
    const result: AssetRecord[] = [];
    for (const asset of this.store.values()) {
      if (asset.owner.ownerId === owner.ownerId && asset.owner.ownerType === owner.ownerType) {
        result.push(asset);
      }
    }
    return result;
  }
}

class FakeAssetStorageGateway implements IAssetStorageGateway {
  async generateUploadLocator(zone?: AssetStorageZone): Promise<AssetStorageLocator> {
    const targetZone = zone || AssetStorageZone.QUARANTINE;
    return new AssetStorageLocator(targetZone, 'test-bucket', `uploads/${Date.now()}-file.tmp`);
  }

  public verifyFails = false;
  public verificationHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  public sanitizedByteSize?: number;
  async verifyUploadedObject(locator: AssetStorageLocator, request: { expectedByteSize?: number; declaredMimeType: string }) {
    if (this.verifyFails) throw new Error('ASSET_PROVIDER_UPLOAD_VERIFICATION_FAILED');
    const byteSize = locator.pathKey.includes('sanitized/') && this.sanitizedByteSize
      ? this.sanitizedByteSize : request.expectedByteSize ?? 50;
    return {
      byteSize,
      verifiedMimeType: request.declaredMimeType,
      checksumSha256: this.verificationHash,
      verifiedAt: new Date().toISOString(),
      signatureVerified: true,
    };
  }

  async moveToCleanZone(quarantineLocator: AssetStorageLocator): Promise<AssetStorageLocator> {
    return new AssetStorageLocator(AssetStorageZone.CLEAN, 'clean-bucket', `clean/${quarantineLocator.pathKey}`);
  }

  async generateDeliveryGrant(locator: AssetStorageLocator, expiresInSeconds: number) {
    return {
      url: `https://cdn.example.test/${locator.pathKey}`,
      headers: {},
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
    };
  }

  async archive(locator: AssetStorageLocator): Promise<void> {}
  async restore(locator: AssetStorageLocator): Promise<void> {}
  async verifyRestoredObject(locator: AssetStorageLocator, request: {
    expectedSha256: string; expectedByteSize: number; declaredMimeType: string;
  }): Promise<void> {
    if (this.verificationHash !== request.expectedSha256 || !request.declaredMimeType) {
      throw new Error('ASSET_RESTORE_CONTENT_VERIFICATION_FAILED');
    }
  }
  async delete(locator: AssetStorageLocator): Promise<void> {}
}

class FakeAssetUsageRegistryGateway implements IAssetUsageRegistryGateway {
  public inUseAssets = new Set<string>();

  async isAssetInUse(id: AssetId): Promise<boolean> {
    return this.inUseAssets.has(id.value);
  }

  async registerUsage(id: AssetId, consumerUrn: string): Promise<void> {
    this.inUseAssets.add(id.value);
  }

  async unregisterUsage(id: AssetId, consumerUrn: string): Promise<void> {
    this.inUseAssets.delete(id.value);
  }
}

class FakeMalwareScannerGateway implements IAssetMalwareScannerGateway {
  public shouldFail = false;

  async scan(locator: AssetStorageLocator): Promise<MalwareScanResult> {
    if (this.shouldFail) {
      return { clean: false, threatsFound: ['EICAR Test Virus'] };
    }
    return { clean: true };
  }
}

class FakeSanitizationGateway implements IAssetSanitizationGateway {
  async sanitize(locator: AssetStorageLocator): Promise<SanitizationResult> {
    return {
      sanitizedLocator: new AssetStorageLocator(AssetStorageZone.QUARANTINE, locator.bucketName, `sanitized/${locator.pathKey}`),
      metadata: new AssetSanitizationMetadata(true, new Date(), 'Sanitized via Fake Gateway')
    };
  }
}

describe('Phase 05 EAP Application Layer - Slice 2B', () => {
  let repo: InMemoryAssetRecordRepository;
  let storageGateway: FakeAssetStorageGateway;
  let usageRegistry: FakeAssetUsageRegistryGateway;
  let malwareScanner: FakeMalwareScannerGateway;
  let sanitizationGateway: FakeSanitizationGateway;

  let ingestUseCase: IngestAssetUseCase;
  let lifecycleUseCase: ProcessAssetLifecycleUseCase;

  beforeEach(() => {
    repo = new InMemoryAssetRecordRepository();
    storageGateway = new FakeAssetStorageGateway();
    usageRegistry = new FakeAssetUsageRegistryGateway();
    malwareScanner = new FakeMalwareScannerGateway();
    sanitizationGateway = new FakeSanitizationGateway();

    ingestUseCase = new IngestAssetUseCase(repo, storageGateway);
    lifecycleUseCase = new ProcessAssetLifecycleUseCase(
      repo,
      storageGateway,
      usageRegistry,
      malwareScanner,
      sanitizationGateway
    );
  });

  it('upload locator request stays INITIATED until authoritative finalization', async () => {
    const input: RequestAssetUploadLocatorDto = {
      assetId: 'asset-001',
      assetReference: 'ref-001',
      ownerId: 'user-77',
      ownerType: 'STUDENT',
      originalFilename: 'assignment.pdf',
      mimeType: 'application/pdf',
      fileExtension: 'pdf',
      byteSize: 2048,
      classification: AssetSecurityClassification.INTERNAL
    };

    const result = await ingestUseCase.requestUploadLocator(input);

    expect(result.assetId).toBe('asset-001');
    expect(result.storageZone).toBe(AssetStorageZone.QUARANTINE);
    expect(result.lifecycleState).toBe(AssetLifecycleState.INITIATED);

    const saved = await repo.findById(new AssetId('asset-001'));
    expect(saved).not.toBeNull();
    expect(saved?.state).toBe(AssetLifecycleState.INITIATED);
  });

  it('malware failure prevents activation', async () => {
    await ingestUseCase.requestUploadLocator({
      assetId: 'asset-infected',
      assetReference: 'ref-infected',
      ownerId: 'user-77',
      ownerType: 'STUDENT',
      originalFilename: 'virus.pdf',
      mimeType: 'application/pdf',
      fileExtension: 'pdf',
      byteSize: 10000,
      classification: AssetSecurityClassification.RESTRICTED
    });

    malwareScanner.shouldFail = true;
    await lifecycleUseCase.finalizeUploadedAsset({ assetId: 'asset-infected' });
    const validated = await lifecycleUseCase.validateAsset({ assetId: 'asset-infected' });

    expect(validated.state).toBe(AssetLifecycleState.MALWARE_SCAN_FAILED);

    await expect(
      lifecycleUseCase.activateAsset({
        assetId: 'asset-infected'
      })
    ).rejects.toThrow('Cannot activate asset that failed malware scanning');
  });

  it('activation requires sanitized/validated state according to domain rules', async () => {
    await ingestUseCase.requestUploadLocator({
      assetId: 'asset-clean',
      assetReference: 'ref-clean',
      ownerId: 'user-77',
      ownerType: 'STUDENT',
      originalFilename: 'photo.png',
      mimeType: 'image/png',
      fileExtension: 'png',
      byteSize: 50000,
      classification: AssetSecurityClassification.PUBLIC
    });

    // Validate
    await lifecycleUseCase.finalizeUploadedAsset({ assetId: 'asset-clean' });
    await lifecycleUseCase.validateAsset({ assetId: 'asset-clean' });

    // Sanitize
    await lifecycleUseCase.sanitizeAsset({ assetId: 'asset-clean' });

    // Activate
    const activated = await lifecycleUseCase.activateAsset({ assetId: 'asset-clean' });

    expect(activated.state).toBe(AssetLifecycleState.ACTIVE);
    expect(activated.storageZone).toBe(AssetStorageZone.CLEAN);
  });

  it('activates the sanitized quarantine object and exposes only temporary delivery grants after activation', async () => {
    await ingestUseCase.requestUploadLocator({
      assetId: 'asset-delivery',
      assetReference: 'ref-delivery',
      ownerId: 'user-77',
      ownerType: 'STUDENT',
      originalFilename: 'photo.png',
      mimeType: 'image/png',
      fileExtension: 'png',
      byteSize: 500,
      classification: AssetSecurityClassification.PUBLIC,
    });
    await expect(lifecycleUseCase.requestDeliveryGrant({ assetId: 'asset-delivery' }))
      .rejects.toThrow('ASSET_DELIVERY_REQUIRES_ACTIVE_CLEAN_ASSET');
    await lifecycleUseCase.finalizeUploadedAsset({ assetId: 'asset-delivery' });
    await lifecycleUseCase.validateAsset({ assetId: 'asset-delivery' });
    const sanitized = await lifecycleUseCase.sanitizeAsset({ assetId: 'asset-delivery' });
    expect(sanitized.storageLocator).toContain('sanitized/');
    const activated = await lifecycleUseCase.activateAsset({ assetId: 'asset-delivery' });
    expect(activated.storageLocator).toContain('clean/sanitized/');
    const grant = await lifecycleUseCase.requestDeliveryGrant({ assetId: 'asset-delivery', expiresInSeconds: 60 });
    expect(grant.url).toContain('https://cdn.example.test/');
  });

  it('purge is blocked when IAssetUsageRegistryGateway reports usage', async () => {
    await ingestUseCase.requestUploadLocator({
      assetId: 'asset-in-use',
      assetReference: 'ref-in-use',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      retentionCategory: AssetRetentionCategory.TEMPORARY,
      ownerId: 'user-77',
      ownerType: 'STUDENT',
      originalFilename: 'transcript.pdf',
      mimeType: 'application/pdf',
      fileExtension: 'pdf',
      byteSize: 4000,
      classification: AssetSecurityClassification.CONFIDENTIAL
    });

    await lifecycleUseCase.finalizeUploadedAsset({ assetId: 'asset-in-use' });

    await lifecycleUseCase.validateAsset({ assetId: 'asset-in-use' });
    await lifecycleUseCase.sanitizeAsset({ assetId: 'asset-in-use' });
    await lifecycleUseCase.activateAsset({ assetId: 'asset-in-use' });
    await lifecycleUseCase.softDeleteAsset({ assetId: 'asset-in-use' });

    // Mark as in use in usage registry
    await usageRegistry.registerUsage(new AssetId('asset-in-use'), 'urn:student:123');

    // Attempt purge
    await expect(
      lifecycleUseCase.purgeAsset({ assetId: 'asset-in-use' })
    ).rejects.toThrow('Cannot purge asset asset-in-use because it is currently in use');

    // Unregister usage
    await usageRegistry.unregisterUsage(new AssetId('asset-in-use'), 'urn:student:123');

    // Once the time-limited retention window has actually elapsed, purge is allowed.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(Date.now() + 120_000));
    try {
      await expect(lifecycleUseCase.purgeAsset({ assetId: 'asset-in-use' }))
        .resolves.toBeUndefined();
    } finally {
      vi.useRealTimers();
    }

    const purged = await repo.findById(new AssetId('asset-in-use'));
    expect(purged?.state).toBe(AssetLifecycleState.PURGED);
  });
  it('does not call moveToCleanZone for quarantined or malware-failed assets', async () => {
    await ingestUseCase.requestUploadLocator({
      assetId: 'asset-preflight', assetReference: 'ref-preflight', ownerId: 'owner',
      ownerType: 'STUDENT', originalFilename: 'a.pdf', mimeType: 'application/pdf',
      fileExtension: 'pdf', byteSize: 10, classification: AssetSecurityClassification.INTERNAL,
    });
    const move = vi.spyOn(storageGateway, 'moveToCleanZone');
    await expect(lifecycleUseCase.activateAsset({ assetId: 'asset-preflight' })).rejects.toThrow();
    expect(move).not.toHaveBeenCalled();
    malwareScanner.shouldFail = true;
    await lifecycleUseCase.finalizeUploadedAsset({ assetId: 'asset-preflight' });
    await lifecycleUseCase.validateAsset({ assetId: 'asset-preflight' });
    await expect(lifecycleUseCase.activateAsset({ assetId: 'asset-preflight' }))
      .rejects.toThrow('Cannot activate asset that failed malware scanning');
    expect(move).not.toHaveBeenCalled();
  });

  it('does not archive or soft-delete active assets referenced by another owner', async () => {
    await ingestUseCase.requestUploadLocator({
      assetId: 'asset-referenced', assetReference: 'ref-referenced', ownerId: 'owner',
      ownerType: 'STUDENT', originalFilename: 'a.pdf', mimeType: 'application/pdf',
      fileExtension: 'pdf', byteSize: 10, classification: AssetSecurityClassification.INTERNAL,
    });
    await lifecycleUseCase.finalizeUploadedAsset({ assetId: 'asset-referenced' });
    await lifecycleUseCase.validateAsset({ assetId: 'asset-referenced' });
    await lifecycleUseCase.sanitizeAsset({ assetId: 'asset-referenced' });
    await lifecycleUseCase.activateAsset({ assetId: 'asset-referenced' });
    await usageRegistry.registerUsage(new AssetId('asset-referenced'), 'urn:course:lesson');
    await expect(lifecycleUseCase.archiveAsset({ assetId: 'asset-referenced' }))
      .rejects.toThrow('Cannot archive asset');
    await expect(lifecycleUseCase.softDeleteAsset({ assetId: 'asset-referenced' }))
      .rejects.toThrow('Cannot soft delete asset');
    expect((await repo.findById(new AssetId('asset-referenced')))?.state).toBe(AssetLifecycleState.ACTIVE);
  });

  it('fails closed when uploaded binary verification rejects the content, before scanner runs', async () => {
    await ingestUseCase.requestUploadLocator({
      assetId: 'asset-unverified', assetReference: 'ref-unverified',
      ownerId: 'owner', ownerType: 'STUDENT', originalFilename: 'file.pdf',
      mimeType: 'application/pdf', fileExtension: 'pdf', byteSize: 100,
      classification: AssetSecurityClassification.INTERNAL,
    });
    storageGateway.verifyFails = true;
    const scan = vi.spyOn(malwareScanner, 'scan');
    await expect(lifecycleUseCase.finalizeUploadedAsset({ assetId: 'asset-unverified' }))
      .rejects.toThrow('ASSET_PROVIDER_UPLOAD_VERIFICATION_FAILED');
    await expect(lifecycleUseCase.validateAsset({ assetId: 'asset-unverified' }))
      .rejects.toThrow('ASSET_UPLOAD_FINALIZATION_REQUIRED');
    expect(scan).not.toHaveBeenCalled();
    expect((await repo.findById(new AssetId('asset-unverified')))?.state)
      .toBe(AssetLifecycleState.INITIATED);
  });

  it('re-verifies and rescans sanitized output, using its updated locator and actual byte size', async () => {
    await ingestUseCase.requestUploadLocator({
      assetId: 'asset-sanitized-evidence', assetReference: 'ref-sanitized-evidence', ownerId: 'owner',
      ownerType: 'STUDENT', originalFilename: 'picture.png', mimeType: 'image/png',
      fileExtension: 'png', byteSize: 1000, classification: AssetSecurityClassification.PUBLIC,
    });
    storageGateway.sanitizedByteSize = 800;
    const scan = vi.spyOn(malwareScanner, 'scan');
    await lifecycleUseCase.finalizeUploadedAsset({ assetId: 'asset-sanitized-evidence' });
    await lifecycleUseCase.validateAsset({ assetId: 'asset-sanitized-evidence' });
    await lifecycleUseCase.sanitizeAsset({ assetId: 'asset-sanitized-evidence' });
    const record = await repo.findById(new AssetId('asset-sanitized-evidence'));
    expect(record?.metadata.byteSize).toBe(800);
    expect(record?.uploadVerification?.locator).toBe(record?.locator.value);
    expect(record?.malwareScan?.locator).toBe(record?.locator.value);
    expect(scan).toHaveBeenCalledTimes(2);
    expect(scan.mock.calls[1]?.[0].pathKey).toContain('sanitized/');
    await expect(lifecycleUseCase.activateAsset({ assetId: 'asset-sanitized-evidence' })).resolves.toMatchObject({
      state: AssetLifecycleState.ACTIVE,
    });
  });

  it('rejects a sanitized object that becomes infected, without promoting it', async () => {
    await ingestUseCase.requestUploadLocator({
      assetId: 'asset-infected-post-san', assetReference: 'ref-infected-post-san', ownerId: 'owner',
      ownerType: 'STUDENT', originalFilename: 'document.pdf', mimeType: 'application/pdf',
      fileExtension: 'pdf', byteSize: 1000, classification: AssetSecurityClassification.INTERNAL,
    });
    await lifecycleUseCase.finalizeUploadedAsset({ assetId: 'asset-infected-post-san' });
    await lifecycleUseCase.validateAsset({ assetId: 'asset-infected-post-san' });
    malwareScanner.shouldFail = true;
    const result = await lifecycleUseCase.sanitizeAsset({ assetId: 'asset-infected-post-san' });
    expect(result.state).toBe(AssetLifecycleState.MALWARE_SCAN_FAILED);
    const move = vi.spyOn(storageGateway, 'moveToCleanZone');
    await expect(lifecycleUseCase.activateAsset({ assetId: 'asset-infected-post-san' }))
      .rejects.toThrow('Cannot activate asset that failed malware scanning');
    expect(move).not.toHaveBeenCalled();
  });

  it('rejects content rewritten after post-sanitization scan, before CLEAN move', async () => {
    await ingestUseCase.requestUploadLocator({
      assetId: 'asset-late-rewrite', assetReference: 'ref-late-rewrite', ownerId: 'owner',
      ownerType: 'STUDENT', originalFilename: 'document.pdf', mimeType: 'application/pdf',
      fileExtension: 'pdf', byteSize: 600, classification: AssetSecurityClassification.INTERNAL,
    });
    await lifecycleUseCase.finalizeUploadedAsset({ assetId: 'asset-late-rewrite' });
    await lifecycleUseCase.validateAsset({ assetId: 'asset-late-rewrite' });
    await lifecycleUseCase.sanitizeAsset({ assetId: 'asset-late-rewrite' });
    storageGateway.verificationHash = 'f'.repeat(64);
    const move = vi.spyOn(storageGateway, 'moveToCleanZone');
    await expect(lifecycleUseCase.activateAsset({ assetId: 'asset-late-rewrite' }))
      .rejects.toThrow('ASSET_QUARANTINE_CONTENT_CHANGED_BEFORE_ACTIVATION');
    expect(move).not.toHaveBeenCalled();
  });

  it('does not call the storage provider for an ACTIVE/CLEAN record missing trust evidence', async () => {
    const unverified = new AssetRecord({
      id: new AssetId('asset-forged-clean'),
      reference: new AssetReference('ref-forged-clean'),
      locator: new AssetStorageLocator(AssetStorageZone.CLEAN, 'clean', 'image.png'),
      metadata: new AssetMetadata('image.png', 'image/png', 'png', 42),
      retention: new AssetRetentionMetadata(AssetRetentionCategory.PERMANENT),
      owner: new AssetOwnerReference('owner', 'STUDENT'),
      classification: AssetSecurityClassification.PUBLIC,
      state: AssetLifecycleState.ACTIVE,
    });
    await repo.save(unverified);
    const grant = vi.spyOn(storageGateway, 'generateDeliveryGrant');
    await expect(lifecycleUseCase.requestDeliveryGrant({ assetId: 'asset-forged-clean' }))
      .rejects.toThrow('ASSET_DELIVERY_TRUST_EVIDENCE_REQUIRED');
    expect(grant).not.toHaveBeenCalled();
  });

  it('refuses irreversible purge with indefinite retention before contacting the storage provider', async () => {
    await ingestUseCase.requestUploadLocator({
      assetId: 'asset-permanent',
      assetReference: 'ref-permanent', ownerId: 'owner', ownerType: 'STUDENT',
      originalFilename: 'legal.pdf', mimeType: 'application/pdf', fileExtension: 'pdf',
      byteSize: 20, classification: AssetSecurityClassification.INTERNAL,
    });
    await lifecycleUseCase.softDeleteAsset({ assetId: 'asset-permanent' });
    const remove = vi.spyOn(storageGateway, 'delete');
    await expect(lifecycleUseCase.purgeAsset({ assetId: 'asset-permanent' }))
      .rejects.toThrow('ASSET_PURGE_RETENTION_NOT_EXPIRED');
    expect(remove).not.toHaveBeenCalled();
    expect((await repo.findById(new AssetId('asset-permanent')))?.state).toBe(AssetLifecycleState.DELETED);
  });

  it('fails closed when repository purge retention guard is unavailable', async () => {
    await ingestUseCase.requestUploadLocator({
      assetId: 'asset-missing-guard', assetReference: 'ref-missing-guard',
      ownerId: 'owner', ownerType: 'STUDENT', originalFilename: 'draft.pdf',
      mimeType: 'application/pdf', fileExtension: 'pdf', byteSize: 20,
      classification: AssetSecurityClassification.INTERNAL,
    });
    await lifecycleUseCase.softDeleteAsset({ assetId: 'asset-missing-guard' });
    (repo as any).assertPurgeAllowed = undefined;
    const remove = vi.spyOn(storageGateway, 'delete');
    await expect(lifecycleUseCase.purgeAsset({ assetId: 'asset-missing-guard' }))
      .rejects.toThrow('ASSET_PURGE_RETENTION_GUARD_NOT_CONFIGURED');
    expect(remove).not.toHaveBeenCalled();
  });

  it('does not scan a file until upload finalization evidence has been persisted', async () => {
    await ingestUseCase.requestUploadLocator({
      assetId: 'asset-not-finalized', assetReference: 'ref-not-finalized',
      ownerId: 'owner', ownerType: 'STUDENT', originalFilename: 'pending.pdf',
      mimeType: 'application/pdf', fileExtension: 'pdf', byteSize: 100,
      classification: AssetSecurityClassification.INTERNAL,
    });
    const scanner = vi.spyOn(malwareScanner, 'scan');
    await expect(lifecycleUseCase.validateAsset({ assetId: 'asset-not-finalized' }))
      .rejects.toThrow('ASSET_UPLOAD_FINALIZATION_REQUIRED');
    expect(scanner).not.toHaveBeenCalled();

    await lifecycleUseCase.finalizeUploadedAsset({ assetId: 'asset-not-finalized' });
    const record = await repo.findById(new AssetId('asset-not-finalized'));
    expect(record?.state).toBe(AssetLifecycleState.QUARANTINED);
    expect(record?.uploadVerification?.signatureVerified).toBe(true);
    expect(record?.checksum?.hash).toBe(record?.uploadVerification?.checksumSha256);
    await lifecycleUseCase.validateAsset({ assetId: 'asset-not-finalized' });
    expect(scanner).toHaveBeenCalledTimes(1);
  });

  it('detects an overwritten object after finalization without calling the malware scanner', async () => {
    await ingestUseCase.requestUploadLocator({
      assetId: 'asset-changed-before-scan', assetReference: 'ref-changed-before-scan',
      ownerId: 'owner', ownerType: 'STUDENT', originalFilename: 'pending.pdf',
      mimeType: 'application/pdf', fileExtension: 'pdf', byteSize: 100,
      classification: AssetSecurityClassification.INTERNAL,
    });
    await lifecycleUseCase.finalizeUploadedAsset({ assetId: 'asset-changed-before-scan' });
    storageGateway.verificationHash = 'f'.repeat(64);
    const scan = vi.spyOn(malwareScanner, 'scan');
    await expect(lifecycleUseCase.validateAsset({ assetId: 'asset-changed-before-scan' }))
      .rejects.toThrow('ASSET_UPLOAD_CHANGED_AFTER_FINALIZATION');
    expect(scan).not.toHaveBeenCalled();
    expect((await repo.findById(new AssetId('asset-changed-before-scan')))?.state)
      .toBe(AssetLifecycleState.QUARANTINED);
  });

  it('does not erase bytes if persisting PURGED fails its optimistic save', async () => {
    await ingestUseCase.requestUploadLocator({
      assetId: 'asset-cas-protection', assetReference: 'ref-cas-protection',
      ownerId: 'owner', ownerType: 'STUDENT', originalFilename: 'draft.pdf',
      mimeType: 'application/pdf', fileExtension: 'pdf', byteSize: 55,
      classification: AssetSecurityClassification.INTERNAL,
      retentionCategory: AssetRetentionCategory.TEMPORARY,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    await lifecycleUseCase.softDeleteAsset({ assetId: 'asset-cas-protection' });
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(Date.now() + 120_000));
    try {
      const deleteBlob = vi.spyOn(storageGateway, 'delete');
      const save = vi.spyOn(repo, 'save').mockRejectedValueOnce(
        new Error('ASSET_RECORD_CONCURRENT_MODIFICATION'),
      );
      await expect(lifecycleUseCase.purgeAsset({ assetId: 'asset-cas-protection' }))
        .rejects.toThrow('ASSET_RECORD_CONCURRENT_MODIFICATION');
      expect(deleteBlob).not.toHaveBeenCalled();
      save.mockRestore();
    } finally {
      vi.useRealTimers();
    }
  });

  it('retains a durable PURGED tombstone and permits worker-leased cleanup retry', async () => {
    await ingestUseCase.requestUploadLocator({
      assetId: 'asset-reconcile-purge', assetReference: 'ref-reconcile-purge',
      ownerId: 'owner', ownerType: 'STUDENT', originalFilename: 'draft.pdf',
      mimeType: 'application/pdf', fileExtension: 'pdf', byteSize: 55,
      classification: AssetSecurityClassification.INTERNAL,
      retentionCategory: AssetRetentionCategory.TEMPORARY,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    await lifecycleUseCase.softDeleteAsset({ assetId: 'asset-reconcile-purge' });
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(Date.now() + 120_000));
    try {
      const deleteBlob = vi.spyOn(storageGateway, 'delete')
        .mockRejectedValueOnce(new Error('ASSET_PROVIDER_TEMPORARY_UNAVAILABLE'));
      await expect(lifecycleUseCase.purgeAsset({ assetId: 'asset-reconcile-purge' }))
        .rejects.toThrow('ASSET_PROVIDER_TEMPORARY_UNAVAILABLE');
      expect((await repo.findById(new AssetId('asset-reconcile-purge')))?.state)
        .toBe(AssetLifecycleState.PURGED);
      await expect(lifecycleUseCase.purgeAsset({ assetId: 'asset-reconcile-purge' }))
        .rejects.toThrow('ASSET_PURGE_CLEANUP_LEASE_REQUIRED');
      expect(deleteBlob).toHaveBeenCalledTimes(1);
      await lifecycleUseCase.purgeAsset({
        assetId: 'asset-reconcile-purge',
        retentionClaimToken: '11111111-1111-4111-8111-111111111111',
      });
      expect(deleteBlob).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('persists ARCHIVED before provider archive and retries storage failure without re-saving', async () => {
    await ingestUseCase.requestUploadLocator({
      assetId: 'asset-archive-retry', assetReference: 'ref-archive-retry',
      ownerId: 'owner', ownerType: 'STUDENT', originalFilename: 'memo.pdf',
      mimeType: 'application/pdf', fileExtension: 'pdf', byteSize: 150,
      classification: AssetSecurityClassification.INTERNAL,
    });
    await lifecycleUseCase.finalizeUploadedAsset({ assetId: 'asset-archive-retry' });
    await lifecycleUseCase.validateAsset({ assetId: 'asset-archive-retry' });
    await lifecycleUseCase.sanitizeAsset({ assetId: 'asset-archive-retry' });
    await lifecycleUseCase.activateAsset({ assetId: 'asset-archive-retry' });
    const provider = vi.spyOn(storageGateway, 'archive')
      .mockRejectedValueOnce(new Error('ASSET_PROVIDER_ARCHIVE_UNAVAILABLE'));
    await expect(lifecycleUseCase.archiveAsset({ assetId: 'asset-archive-retry' }))
      .rejects.toThrow('ASSET_PROVIDER_ARCHIVE_UNAVAILABLE');
    const persisted = await repo.findById(new AssetId('asset-archive-retry'));
    expect(persisted?.state).toBe(AssetLifecycleState.ARCHIVED);
    await expect(lifecycleUseCase.requestDeliveryGrant({ assetId: 'asset-archive-retry' }))
      .rejects.toThrow('ASSET_DELIVERY_REQUIRES_ACTIVE_CLEAN_ASSET');
    const save = vi.spyOn(repo, 'save');
    await lifecycleUseCase.archiveAsset({ assetId: 'asset-archive-retry' });
    expect(provider).toHaveBeenCalledTimes(2);
    expect(save).not.toHaveBeenCalled();
  });

  it('does not call the archive provider when persisting ARCHIVED is rejected', async () => {
    await ingestUseCase.requestUploadLocator({
      assetId: 'asset-archive-cas', assetReference: 'ref-archive-cas',
      ownerId: 'owner', ownerType: 'STUDENT', originalFilename: 'memo.pdf',
      mimeType: 'application/pdf', fileExtension: 'pdf', byteSize: 150,
      classification: AssetSecurityClassification.INTERNAL,
    });
    await lifecycleUseCase.finalizeUploadedAsset({ assetId: 'asset-archive-cas' });
    await lifecycleUseCase.validateAsset({ assetId: 'asset-archive-cas' });
    await lifecycleUseCase.sanitizeAsset({ assetId: 'asset-archive-cas' });
    await lifecycleUseCase.activateAsset({ assetId: 'asset-archive-cas' });
    const archive = vi.spyOn(storageGateway, 'archive');
    vi.spyOn(repo, 'save').mockRejectedValueOnce(new Error('ASSET_RECORD_CONCURRENT_MODIFICATION'));
    await expect(lifecycleUseCase.archiveAsset({ assetId: 'asset-archive-cas' }))
      .rejects.toThrow('ASSET_RECORD_CONCURRENT_MODIFICATION');
    expect(archive).not.toHaveBeenCalled();
  });

  it('restores verified CLEAN bytes before changing DELETED to ACTIVE', async () => {
    await ingestUseCase.requestUploadLocator({
      assetId: 'asset-restore-verify', assetReference: 'ref-restore-verify',
      ownerId: 'owner', ownerType: 'STUDENT', originalFilename: 'file.pdf',
      mimeType: 'application/pdf', fileExtension: 'pdf', byteSize: 125,
      classification: AssetSecurityClassification.INTERNAL,
    });
    await lifecycleUseCase.finalizeUploadedAsset({ assetId: 'asset-restore-verify' });
    await lifecycleUseCase.validateAsset({ assetId: 'asset-restore-verify' });
    await lifecycleUseCase.sanitizeAsset({ assetId: 'asset-restore-verify' });
    await lifecycleUseCase.activateAsset({ assetId: 'asset-restore-verify' });
    await lifecycleUseCase.softDeleteAsset({ assetId: 'asset-restore-verify' });
    const verified = vi.spyOn(storageGateway, 'verifyRestoredObject');
    const returned = await lifecycleUseCase.restoreAsset({ assetId: 'asset-restore-verify' });
    expect(returned.state).toBe(AssetLifecycleState.ACTIVE);
    expect(verified).toHaveBeenCalledWith(expect.objectContaining({
      storageZone: AssetStorageZone.CLEAN,
    }), expect.objectContaining({
      expectedSha256: storageGateway.verificationHash,
    }));
  });

  it('re-archives on invalid restored digest and leaves DB DELETED', async () => {
    await ingestUseCase.requestUploadLocator({
      assetId: 'asset-restore-tamper', assetReference: 'ref-restore-tamper',
      ownerId: 'owner', ownerType: 'STUDENT', originalFilename: 'file.pdf',
      mimeType: 'application/pdf', fileExtension: 'pdf', byteSize: 125,
      classification: AssetSecurityClassification.INTERNAL,
    });
    await lifecycleUseCase.finalizeUploadedAsset({ assetId: 'asset-restore-tamper' });
    await lifecycleUseCase.validateAsset({ assetId: 'asset-restore-tamper' });
    await lifecycleUseCase.sanitizeAsset({ assetId: 'asset-restore-tamper' });
    await lifecycleUseCase.activateAsset({ assetId: 'asset-restore-tamper' });
    await lifecycleUseCase.softDeleteAsset({ assetId: 'asset-restore-tamper' });
    vi.spyOn(storageGateway, 'verifyRestoredObject')
      .mockRejectedValueOnce(new Error('ASSET_RESTORE_CONTENT_VERIFICATION_FAILED'));
    const archive = vi.spyOn(storageGateway, 'archive');
    await expect(lifecycleUseCase.restoreAsset({ assetId: 'asset-restore-tamper' }))
      .rejects.toThrow('ASSET_RESTORE_CONTENT_VERIFICATION_FAILED');
    expect(archive).toHaveBeenCalledTimes(1);
    expect((await repo.findById(new AssetId('asset-restore-tamper')))?.state)
      .toBe(AssetLifecycleState.DELETED);
  });

  it('compensates a failed restore database save and explicitly reports compensation failure', async () => {
    await ingestUseCase.requestUploadLocator({
      assetId: 'asset-restore-cas', assetReference: 'ref-restore-cas',
      ownerId: 'owner', ownerType: 'STUDENT', originalFilename: 'file.pdf',
      mimeType: 'application/pdf', fileExtension: 'pdf', byteSize: 125,
      classification: AssetSecurityClassification.INTERNAL,
    });
    await lifecycleUseCase.finalizeUploadedAsset({ assetId: 'asset-restore-cas' });
    await lifecycleUseCase.validateAsset({ assetId: 'asset-restore-cas' });
    await lifecycleUseCase.sanitizeAsset({ assetId: 'asset-restore-cas' });
    await lifecycleUseCase.activateAsset({ assetId: 'asset-restore-cas' });
    await lifecycleUseCase.softDeleteAsset({ assetId: 'asset-restore-cas' });
    const save = vi.spyOn(repo, 'save').mockRejectedValueOnce(
      new Error('ASSET_RECORD_CONCURRENT_MODIFICATION'));
    const archive = vi.spyOn(storageGateway, 'archive');
    await expect(lifecycleUseCase.restoreAsset({ assetId: 'asset-restore-cas' }))
      .rejects.toThrow('ASSET_RECORD_CONCURRENT_MODIFICATION');
    expect(archive).toHaveBeenCalledTimes(1);
    expect((await repo.findById(new AssetId('asset-restore-cas')))?.state)
      .toBe(AssetLifecycleState.DELETED);
    save.mockRestore();
    archive.mockRejectedValueOnce(new Error('ASSET_PROVIDER_ARCHIVE_UNAVAILABLE'));
    vi.spyOn(storageGateway, 'verifyRestoredObject')
      .mockRejectedValueOnce(new Error('ASSET_RESTORE_CONTENT_VERIFICATION_FAILED'));
    await expect(lifecycleUseCase.restoreAsset({ assetId: 'asset-restore-cas' }))
      .rejects.toThrow('ASSET_RESTORE_COMPENSATION_FAILED');
  });

  it('refuses to start restore if clean-byte verification capability is unavailable', async () => {
    await ingestUseCase.requestUploadLocator({
      assetId: 'asset-restore-missing-gateway', assetReference: 'ref-restore-missing-gateway',
      ownerId: 'owner', ownerType: 'STUDENT', originalFilename: 'file.pdf',
      mimeType: 'application/pdf', fileExtension: 'pdf', byteSize: 125,
      classification: AssetSecurityClassification.INTERNAL,
    });
    await lifecycleUseCase.finalizeUploadedAsset({ assetId: 'asset-restore-missing-gateway' });
    await lifecycleUseCase.validateAsset({ assetId: 'asset-restore-missing-gateway' });
    await lifecycleUseCase.sanitizeAsset({ assetId: 'asset-restore-missing-gateway' });
    await lifecycleUseCase.activateAsset({ assetId: 'asset-restore-missing-gateway' });
    await lifecycleUseCase.softDeleteAsset({ assetId: 'asset-restore-missing-gateway' });
    (storageGateway as any).verifyRestoredObject = undefined;
    const restore = vi.spyOn(storageGateway, 'restore');
    await expect(lifecycleUseCase.restoreAsset({ assetId: 'asset-restore-missing-gateway' }))
      .rejects.toThrow('ASSET_RESTORE_VERIFICATION_NOT_CONFIGURED');
    expect(restore).not.toHaveBeenCalled();
  });

});
