import { describe, expect, it, vi } from 'vitest';
import {
  AssetId, AssetRecord, AssetReference, AssetOwnerReference, AssetStorageLocator,
  AssetMetadata, AssetRetentionMetadata, AssetRetentionCategory,
  AssetSecurityClassification, AssetLifecycleState, AssetStorageZone,
} from '@manaratak/domain';
import { PrismaAssetRecordRepository } from '../../src/asset-platform/PrismaAssetRecordRepository';

const revision = new Date('2026-10-09T00:00:00.000Z');

const row = () => ({
  id: 'asset-cas', reference: 'ref-cas', ownerId: 'owner', ownerType: 'STUDENT',
  lifecycleState: AssetLifecycleState.QUARANTINED,
  securityClassification: AssetSecurityClassification.INTERNAL,
  retentionCategory: AssetRetentionCategory.PERMANENT,
  retentionExpiresAt: null,
  quarantineStorageLocator: 'quarantine://bucket/uploads/cas.pdf',
  cleanStorageLocator: null,
  checksumAlgorithm: null, checksumHash: null,
  metadata: { originalFilename: 'cas.pdf', mimeType: 'application/pdf', fileExtension: 'pdf', byteSize: 50 },
  versionChain: null, sanitizationMetadata: null, malwareScanStatus: null,
  updatedAt: revision,
});

describe('EAP optimistic lifecycle update contract', () => {
  it('updates a hydrated aggregate only when DB state and revision still match', async () => {
    const updateMany = vi.fn(async (_args: unknown) => ({ count: 1 }));
    const create = vi.fn();
    const repo = new PrismaAssetRecordRepository({
      assetRecord: { findUnique: vi.fn(async () => row()), updateMany, create },
    } as any);
    const loaded = await repo.findById(new AssetId('asset-cas'));
    expect(loaded).not.toBeNull();
    loaded!.softDelete();
    await repo.save(loaded!);
    const args = updateMany.mock.calls[0][0] as any;
    expect(args.where).toEqual({
      id: 'asset-cas', updatedAt: revision, lifecycleState: 'QUARANTINED',
    });
    expect(args.data.lifecycleState).toBe('DELETED');
    expect(args.data.id).toBeUndefined();
    expect(args.data.reference).toBeUndefined();
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects a stale loaded aggregate rather than overwriting a concurrent change', async () => {
    const updateMany = vi.fn(async (_args: unknown) => ({ count: 0 }));
    const repo = new PrismaAssetRecordRepository({
      assetRecord: { findUnique: vi.fn(async () => row()), updateMany },
    } as any);
    const loaded = (await repo.findById(new AssetId('asset-cas')))!;
    loaded.softDelete();
    await expect(repo.save(loaded)).rejects.toThrow('ASSET_RECORD_CONCURRENT_MODIFICATION');
  });

  it('creates a new asset without falling back to destructive upsert', async () => {
    const create = vi.fn(async (_args: unknown) => ({ updatedAt: revision }));
    const upsert = vi.fn();
    const repo = new PrismaAssetRecordRepository({ assetRecord: { create, upsert } } as any);
    const created = new AssetRecord({
      id: new AssetId('asset-new'),
      reference: new AssetReference('ref-new'),
      locator: new AssetStorageLocator(AssetStorageZone.QUARANTINE, 'bucket', 'uploads/new.pdf'),
      metadata: new AssetMetadata('new.pdf', 'application/pdf', 'pdf', 50),
      retention: new AssetRetentionMetadata(AssetRetentionCategory.PERMANENT),
      owner: new AssetOwnerReference('owner', 'STUDENT'),
      classification: AssetSecurityClassification.INTERNAL,
      state: AssetLifecycleState.QUARANTINED,
    });
    await repo.save(created);
    expect(create).toHaveBeenCalledTimes(1);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('rejects existing rows without revision metadata rather than silently unguarded updates', async () => {
    const withoutRevision = { ...row(), updatedAt: undefined };
    const repo = new PrismaAssetRecordRepository({
      assetRecord: { findUnique: vi.fn(async () => withoutRevision) },
    } as any);
    await expect(repo.findById(new AssetId('asset-cas')))
      .rejects.toThrow('ASSET_RECORD_REVISION_MISSING');
  });
});
