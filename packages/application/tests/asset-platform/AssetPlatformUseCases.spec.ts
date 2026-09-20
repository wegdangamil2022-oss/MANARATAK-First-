import { describe, it, expect, beforeEach } from 'vitest';
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
    return this.store.get(id.value) || null;
  }

  async findByReference(reference: AssetReference): Promise<AssetRecord | null> {
    for (const asset of this.store.values()) {
      if (asset.reference.value === reference.value) return asset;
    }
    return null;
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

  it('upload locator request creates quarantined asset record', async () => {
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
    expect(result.lifecycleState).toBe(AssetLifecycleState.QUARANTINED);

    const saved = await repo.findById(new AssetId('asset-001'));
    expect(saved).not.toBeNull();
    expect(saved?.state).toBe(AssetLifecycleState.QUARANTINED);
  });

  it('malware failure prevents activation', async () => {
    await ingestUseCase.requestUploadLocator({
      assetId: 'asset-infected',
      assetReference: 'ref-infected',
      ownerId: 'user-77',
      ownerType: 'STUDENT',
      originalFilename: 'virus.exe',
      mimeType: 'application/x-msdownload',
      fileExtension: 'exe',
      byteSize: 10000,
      classification: AssetSecurityClassification.RESTRICTED
    });

    malwareScanner.shouldFail = true;
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
      ownerId: 'user-77',
      ownerType: 'STUDENT',
      originalFilename: 'transcript.pdf',
      mimeType: 'application/pdf',
      fileExtension: 'pdf',
      byteSize: 4000,
      classification: AssetSecurityClassification.CONFIDENTIAL
    });

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

    // Now purge succeeds
    await expect(
      lifecycleUseCase.purgeAsset({ assetId: 'asset-in-use' })
    ).resolves.toBeUndefined();

    const purged = await repo.findById(new AssetId('asset-in-use'));
    expect(purged?.state).toBe(AssetLifecycleState.PURGED);
  });
});
