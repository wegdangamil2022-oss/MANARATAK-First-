import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { AssetId } from '@manaratak/domain';
import { PrismaAssetUsageRegistryGateway } from '../../packages/infrastructure/src/asset-platform/PrismaAssetUsageRegistryGateway';
import { PrismaStudentApplicationTrackerRepository } from '../../packages/infrastructure/src/students/PrismaStudentApplicationTrackerRepository';
import { ProcessAssetLifecycleUseCase } from '../../packages/application/src/asset-platform/use-cases/ProcessAssetLifecycleUseCase';

function harness() {
  let binding: { id: string; assetId: string; retentionUntil: Date } | null = {
    id: 'binding',
    assetId: 'asset',
    retentionUntil: new Date(Date.now() + 60000),
  };
  const table = {
    count: vi.fn(async ({ where }: { where: { assetId: string } }) =>
      binding?.assetId === where.assetId ? 1 : 0,
    ),
    findMany: vi.fn(async ({ where }: { where: { retentionUntil: { lte: Date } } }) =>
      binding && binding.retentionUntil <= where.retentionUntil.lte ? [{ id: binding.id }] : [],
    ),
    deleteMany: vi.fn(
      async (query: { where: { retentionUntil?: { lte: Date }; trackerId?: string } }) => {
        if (
          !binding ||
          (query.where.retentionUntil && binding.retentionUntil > query.where.retentionUntil.lte)
        )
          return { count: 0 };
        binding = null;
        return { count: 1 };
      },
    ),
  };
  const tracker = {
    id: 'tracker',
    studentReferenceId: 'student',
    version: 3,
    status: 'ACTIVE',
    checklist: [],
  };
  const tx = new Proxy(
    {
      studentApplicationDocumentBinding: table,
      studentApplicationTracker: {
        findFirst: vi.fn(async () => tracker),
        updateMany: vi.fn(async () => ({ count: 1 })),
        findUnique: vi.fn(async () => tracker),
      },
    },
    { get: (target, key) => Reflect.get(target, key) ?? { create: vi.fn(async () => ({})) } },
  );
  const prisma = new Proxy(
    {
      studentApplicationDocumentBinding: table,
      $transaction: async (fn: (value: typeof tx) => unknown) => fn(tx),
    },
    { get: (target, key) => Reflect.get(target, key) ?? { count: vi.fn(async () => 0) } },
  );
  const gateway = new PrismaAssetUsageRegistryGateway(prisma as unknown as PrismaClient);
  const repository = new PrismaStudentApplicationTrackerRepository(
    prisma as unknown as PrismaClient,
  );
  const record = { state: 'DELETED', locator: { value: 'private://asset' }, purge: vi.fn() };
  const assets = {
    findById: vi.fn(async () => record),
    save: vi.fn(),
    assertPurgeAllowed: vi.fn(),
  };
  const storage = { delete: vi.fn() };
  const lifecycle = new ProcessAssetLifecycleUseCase(assets as never, storage as never, gateway);
  return {
    gateway,
    repository,
    table,
    lifecycle,
    assets,
    storage,
    expire: () => {
      binding!.retentionUntil = new Date(0);
    },
  };
}

describe('B04 student document is the sole derived asset reference', () => {
  it('blocks purge before any retention/provider effect even when all other references are absent', async () => {
    const h = harness();
    expect(await h.gateway.findUsages(new AssetId('asset'))).toEqual([
      { consumer: 'STUDENT_APPLICATION_DOCUMENT', field: 'assetId' },
    ]);
    await expect(h.lifecycle.purgeAsset({ assetId: 'asset' })).rejects.toThrow('currently in use');
    expect(h.assets.assertPurgeAllowed).not.toHaveBeenCalled();
    expect(h.storage.delete).not.toHaveBeenCalled();
    expect(await h.gateway.findUsages(new AssetId('another-asset'))).toEqual([]);
  });
  it('counts an expired binding until its owner physically purges it; only then checks asset retention', async () => {
    const h = harness();
    expect(await h.repository.purgeExpiredDocumentBindings()).toBe(0);
    h.expire();
    await expect(h.lifecycle.purgeAsset({ assetId: 'asset' })).rejects.toThrow('currently in use');
    expect(await h.repository.purgeExpiredDocumentBindings()).toBe(1);
    h.assets.assertPurgeAllowed.mockRejectedValueOnce(new Error('ASSET_RETENTION_NOT_EXPIRED'));
    await expect(h.lifecycle.purgeAsset({ assetId: 'asset' })).rejects.toThrow(
      'ASSET_RETENTION_NOT_EXPIRED',
    );
    expect(h.storage.delete).not.toHaveBeenCalled();
    await h.lifecycle.purgeAsset({ assetId: 'asset' });
    expect(h.storage.delete).toHaveBeenCalledTimes(1);
    expect(h.table.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ retentionUntil: { lte: expect.any(Date) } }),
      }),
    );
  });
  it('releases only a successful owner unlink, without waiving the asset retention guard', async () => {
    const h = harness();
    await expect(
      h.repository.removeDocumentBinding('student', 'tracker', 'requirement', 2),
    ).rejects.toThrow('VERSION_CONFLICT');
    expect(await h.gateway.isAssetInUse(new AssetId('asset'))).toBe(true);
    await h.repository.removeDocumentBinding('student', 'tracker', 'requirement', 3);
    expect(await h.gateway.isAssetInUse(new AssetId('asset'))).toBe(false);
    h.assets.assertPurgeAllowed.mockRejectedValueOnce(new Error('RETENTION_REQUIRED'));
    await expect(h.lifecycle.purgeAsset({ assetId: 'asset' })).rejects.toThrow(
      'RETENTION_REQUIRED',
    );
    expect(h.storage.delete).not.toHaveBeenCalled();
  });
  it('fails closed when the document delegate is unavailable', async () => {
    const db = new Proxy(
      {},
      {
        get: (_target, key) =>
          key === 'studentApplicationDocumentBinding' ? undefined : { count: async () => 0 },
      },
    );
    await expect(
      new PrismaAssetUsageRegistryGateway(db as PrismaClient).findUsages(new AssetId('asset')),
    ).rejects.toThrow('DELEGATE_MISSING:studentApplicationDocumentBinding');
  });
});
