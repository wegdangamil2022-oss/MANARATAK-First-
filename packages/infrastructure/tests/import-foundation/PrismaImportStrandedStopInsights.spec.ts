import { describe, expect, it, vi } from 'vitest';
import { PrismaImportRepository } from '../../src/import-foundation/PrismaImportRepository';

describe('Import operations: stranded cooperative stops', () => {
  it('queries pending and stranded stop states without changing any persisted job', async () => {
    const old = new Date(Date.now() - 35 * 60_000);
    const expired = new Date(Date.now() - 16 * 60_000);
    const pending = {
      id: 'batch-stranded', batchStatus: 'CANCELLING',
      dataType: 'UNIVERSITIES', sourceSystem: 'TEST',
      createdAt: old, updatedAt: old, claimUntil: expired,
      totalRecords: 10, processedRecords: 4, failedRecords: 0,
    };
    const prisma = {
      importBatch: {
        count: vi.fn().mockImplementation(async ({ where }: any) => {
          if (where.batchStatus?.in?.includes('PAUSING')) {
            return where.updatedAt ? 1 : 2;
          }
          return 0;
        }),
        findFirst: vi.fn().mockResolvedValue(pending),
        findMany: vi.fn().mockImplementation(async ({ where }: any) =>
          where.OR ? [pending] : []),
        updateMany: vi.fn(), update: vi.fn(),
      },
    };
    const result = await new PrismaImportRepository(prisma as any)
      .getOperationalInsights({ dataType: 'UNIVERSITIES' });
    expect(result).toMatchObject({
      pendingStopBatches: 2,
      strandedStopBatches: 1,
      stuckBatches: 1,
      recentProblemBatches: [{
        id: 'batch-stranded',
        stuck: true,
        pendingStop: true,
        requiresOwnerVerification: true,
      }],
    });
    expect(prisma.importBatch.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        dataType: 'UNIVERSITIES',
        batchStatus: { in: ['PAUSING', 'CANCELLING'] },
        updatedAt: { lt: expect.any(Date) },
        OR: expect.arrayContaining([
          { claimUntil: { lt: expect.any(Date) } }, { claimUntil: null },
        ]),
      }),
    });
    expect(prisma.importBatch.update).not.toHaveBeenCalled();
    expect(prisma.importBatch.updateMany).not.toHaveBeenCalled();
  });

  it('excludes young stop requests and keeps running-but-unconfirmed work pending', async () => {
    const repo = new PrismaImportRepository(undefined, 'DEVELOPMENT_ONLY');
    const old = new Date(Date.now() - 45 * 60_000);
    const expired = new Date(Date.now() - 20 * 60_000);
    const future = new Date(Date.now() + 45 * 60_000);
    const stranded = await repo.createBatch({
      dataType: 'SCHOLARSHIPS', batchStatus: 'PAUSING',
    });
    stranded.updatedAt = old;
    stranded.claimUntil = expired;
    const stillActive = await repo.createBatch({
      dataType: 'SCHOLARSHIPS', batchStatus: 'CANCELLING',
    });
    stillActive.updatedAt = old;
    stillActive.claimUntil = future;
    const recentlyPending = await repo.createBatch({
      dataType: 'SCHOLARSHIPS', batchStatus: 'PAUSING',
    });
    recentlyPending.updatedAt = new Date();
    recentlyPending.claimUntil = expired;
    const result = await repo.getOperationalInsights({ dataType: 'SCHOLARSHIPS' });
    expect(result.pendingStopBatches).toBe(3);
    expect(result.strandedStopBatches).toBe(1);
    expect(result.stuckBatches).toBe(1);
    expect(result.recentProblemBatches).toEqual([
      expect.objectContaining({
        id: stranded.id, batchStatus: 'PAUSING',
        stuck: true, pendingStop: true,
        requiresOwnerVerification: true,
      }),
    ]);
    expect(stranded.batchStatus).toBe('PAUSING');
    expect(stillActive.batchStatus).toBe('CANCELLING');
  });
});
