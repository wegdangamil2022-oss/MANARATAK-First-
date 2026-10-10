import { describe, expect, it, vi } from 'vitest';
import { PrismaImportRepository } from '../../src/import-foundation/PrismaImportRepository';

describe('Phase 6 durable worker progress generation fencing', () => {
  it('rejects stale worker counters instead of overwriting resumed/cancelled job state', async () => {
    const importBatch = {
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      update: vi.fn().mockResolvedValue({ id: 'batch-1' }),
    };
    const repository = new PrismaImportRepository({ importBatch } as any);
    const lease = {
      batchId: 'batch-1', workerId: 'worker-shared', attempt: 7,
      claimUntil: new Date(Date.now() + 60_000),
    };
    await expect(repository.updateBatchStats('batch-1', {
      processedRecords: 25, failedRecords: 1,
    }, lease)).rejects.toThrow('IMPORT_WORKER_LEASE_LOST');
    expect(importBatch.update).not.toHaveBeenCalled();
    expect(importBatch.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: lease.batchId, batchStatus: 'RUNNING',
        claimedBy: lease.workerId, attemptCount: lease.attempt,
        claimUntil: expect.objectContaining({ equals: lease.claimUntil }),
      }),
      data: { processedRecords: 25, failedRecords: 1 },
    });
    importBatch.updateMany.mockResolvedValue({ count: 1 });
    await expect(repository.updateBatchStats('batch-1', {
      processedRecords: 25, failedRecords: 1,
    }, lease)).resolves.toEqual({ count: 1 });
    expect(importBatch.update).not.toHaveBeenCalled();
    await expect(repository.updateBatchStats('batch-2', { processedRecords: 3 }, lease))
      .rejects.toThrow('IMPORT_WORKER_LEASE_LOST');
    await expect(repository.updateBatchStats('batch-1', {
      processedRecords: 3, batchStatus: 'COMPLETED',
    }, lease)).rejects.toThrow('IMPORT_WORKER_LEASE_LOST');
    // The original non-worker staging lifecycle remains compatible.
    await repository.updateBatchStats('batch-1', { totalRecords: 1, batchStatus: 'CREATED' });
    expect(importBatch.update).toHaveBeenCalledOnce();
  });
});
