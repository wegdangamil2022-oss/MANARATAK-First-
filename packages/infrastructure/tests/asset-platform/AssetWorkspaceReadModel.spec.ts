import { describe, expect, it, vi } from 'vitest';
import { AssetId } from '@manaratak/domain';
import { PrismaAssetRecordRepository } from '../../src/asset-platform/PrismaAssetRecordRepository';

const version = { versionNumber: 1, createdAt: '2026-10-01T00:00:00.000Z',
  storageLocator: { storageZone: 'CLEAN', bucketName: 'private-versions', pathKey: 'old.pdf' },
  checksum: { algorithm: 'sha256', hash: 'a'.repeat(64) } };
function row() {
  return { id: 'workspace-a', reference: 'workspace-ref', ownerId: 'owner-a', ownerType: 'COURSE',
    lifecycleState: 'QUARANTINED', securityClassification: 'INTERNAL', retentionCategory: 'PERMANENT',
    retentionExpiresAt: null, quarantineStorageLocator: 'quarantine://private/uploads/a.pdf', cleanStorageLocator: null,
    checksumAlgorithm: null, checksumHash: null,
    metadata: { originalFilename: 'a.pdf', mimeType: 'application/pdf', fileExtension: 'pdf', byteSize: 64,
      extraMetadata: { privatePath: 'secret-owner-data' } },
    versionChain: { versions: [version] }, sanitizationMetadata: null, malwareScanStatus: null,
    createdAt: new Date('2026-10-01T00:00:00.000Z'), updatedAt: new Date('2026-10-09T00:00:00.000Z'),
    archivedAt: null, deletedAt: null, purgedAt: null, legalHoldUntil: new Date('2027-01-01T00:00:00.000Z'),
  };
}

describe('EAP workspace read model and version preservation', () => {
  it('retains version history through JSON rehydration and a lifecycle save', async () => {
    let stored = row();
    const updateMany = vi.fn(async (args: any) => { stored = { ...stored, ...JSON.parse(JSON.stringify(args.data)) }; return { count: 1 }; });
    const repository = new PrismaAssetRecordRepository({ assetRecord: {
      findUnique: vi.fn(async () => stored), updateMany,
    } } as any);
    const asset = (await repository.findById(new AssetId('workspace-a')))!;
    expect(asset.versionChain?.allVersions[0].storageLocator.value).toBe('clean://private-versions/old.pdf');
    expect(asset.versionChain?.allVersions[0].createdAt).toEqual(new Date(version.createdAt));
    asset.softDelete();
    await repository.save(asset);
    expect(stored.versionChain).toEqual({ versions: [version] });
    expect(updateMany.mock.calls[0][0].data.deletedAt).toBeInstanceOf(Date);
    expect(updateMany.mock.calls[0][0].data).not.toHaveProperty('legalHoldUntil');
  });

  it.each([
    {}, { versions: [ { ...version, versionNumber: 0 } ] },
    { versions: [ { ...version, versionNumber: 1.5 } ] },
    { versions: [ { ...version, createdAt: 'bad-time' } ] },
    { versions: [ { ...version, storageLocator: { storageZone: 'PUBLIC', bucketName: 'b', pathKey: 'p' } } ] },
    { versions: [ version, version ] },
    { versions: [ { ...version, checksum: { algorithm: 'sha256', hash: '' } } ] },
  ])('fails closed for unsupported or invalid persisted version history', async versionChain => {
    const repository = new PrismaAssetRecordRepository({ assetRecord: {
      findUnique: vi.fn(async () => ({ ...row(), versionChain })),
    } } as any);
    await expect(repository.findById(new AssetId('workspace-a'))).rejects.toThrow('ASSET_VERSION_HISTORY_INVALID');
  });

  it('returns governance from the same DB snapshot as the aggregate', async () => {
    const findUnique = vi.fn(async () => row());
    const repository = new PrismaAssetRecordRepository({ assetRecord: { findUnique } } as any);
    const details = await repository.findAdminDetails(new AssetId('workspace-a'));
    expect(findUnique).toHaveBeenCalledTimes(1);
    expect(details?.governance.legalHoldUntil).toEqual(row().legalHoldUntil);
    expect(details?.asset.id.value).toBe('workspace-a');
  });

  it('projects list metadata without private owner envelopes', async () => {
    const repository = new PrismaAssetRecordRepository({ assetRecord: { findMany: vi.fn(async () => [row()]) } } as any);
    const page = await repository.queryAdmin({});
    expect(page.items[0].metadata).not.toHaveProperty('extraMetadata');
    expect(JSON.stringify(page)).not.toContain('secret-owner-data');
    expect(JSON.stringify(page)).not.toContain('private-versions');
  });

  it('intersects file family, scan status, lifecycle and pending activation filters', async () => {
    const findMany = vi.fn(async (_args?: unknown) => []);
    const repository = new PrismaAssetRecordRepository({ assetRecord: { findMany } } as any);
    await repository.queryAdmin({ q: 'a', lifecycleState: 'ACTIVE', fileFamily: 'PDF',
      malwareStatus: 'PASSED', processingQueue: 'ACTIVATION_RECOVERY' });
    const where = (findMany.mock.calls[0][0] as any).where;
    expect(where.lifecycleState).toBe('ACTIVE');
    expect(where.AND).toEqual(expect.arrayContaining([
      { metadata: { path: ['mimeType'], equals: 'application/pdf' } },
      { malwareScanStatus: { path: ['status'], equals: 'PASSED' } },
      { lifecycleState: { in: ['SANITIZING'] } },
      { malwareScanStatus: { path: ['activationOperation', 'phase'], equals: 'PREPARED' } },
    ])); // Conflicting filters return no matches; never override security/lifecycle predicates.
  });

  it.each(['IMAGE', 'VIDEO', 'AUDIO'] as const)('uses MIME families for %s', async fileFamily => {
    const findMany = vi.fn(async (_args?: unknown) => []);
    const repository = new PrismaAssetRecordRepository({ assetRecord: { findMany } } as any);
    await repository.queryAdmin({ fileFamily });
    expect((findMany.mock.calls[0][0] as any).where.AND[0].metadata.string_starts_with).toBe(fileFamily.toLowerCase() + '/');
  });
});
