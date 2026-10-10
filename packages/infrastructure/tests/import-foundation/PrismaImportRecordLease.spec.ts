import { describe, expect, it, vi } from 'vitest';
import { PrismaImportRepository } from '../../src/import-foundation/PrismaImportRepository';

function fixture() {
  const tx = {
    importBatch: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    importRecord: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
  };
  const prisma = {
    $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    importRecord: { update: vi.fn().mockResolvedValue({ id: 'record-A' }) },
  };
  const repo = new PrismaImportRepository(prisma as any);
  const lease = {
    batchId: 'batch-A',
    workerId: 'worker-reused',
    attempt: 7,
    claimUntil: new Date(Date.now() + 60_000),
  };
  return { repo, tx, prisma, lease };
}

describe('Phase 06 atomic import-record worker fencing', () => {
  it('checks worker attempt, exact lease generation and active batch before touching any record', async () => {
    const { repo, tx, prisma, lease } = fixture();
    tx.importBatch.updateMany.mockResolvedValue({ count: 0 });
    await expect(repo.updateRecord('record-A', {
      rawPayload: { _phase6HandoffState: 'DISPATCH_IN_FLIGHT' },
    }, lease)).rejects.toThrow('IMPORT_WORKER_LEASE_LOST');
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(tx.importBatch.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: lease.batchId,
        batchStatus: 'RUNNING',
        claimedBy: lease.workerId,
        attemptCount: lease.attempt,
        claimUntil: { equals: lease.claimUntil, gte: expect.any(Date) },
      }),
      data: { claimedBy: lease.workerId },
    });
    expect(tx.importRecord.updateMany).not.toHaveBeenCalled();
    expect(prisma.importRecord.update).not.toHaveBeenCalled();
  });

  it('does not mutate a record from another batch under an otherwise valid lease', async () => {
    const { repo, tx, lease } = fixture();
    tx.importRecord.updateMany.mockResolvedValue({ count: 0 });
    await expect(repo.updateRecord('record-foreign', {
      status: 'NEEDS_REVIEW',
      processingNotes: 'Reconciliation needed',
    }, lease)).rejects.toThrow('IMPORT_RECORD_BATCH_MISMATCH');
    expect(tx.importRecord.updateMany).toHaveBeenCalledWith({
      where: { id: 'record-foreign', batchId: 'batch-A' },
      data: expect.objectContaining({
        status: 'NEEDS_REVIEW',
        processingNotes: 'Reconciliation needed',
      }),
    });
  });

  it('updates dispatch marker and owner acknowledgement only through the same claimed transaction', async () => {
    const { repo, tx, prisma, lease } = fixture();
    for (const value of ['DISPATCH_IN_FLIGHT', 'DISPATCHED']) {
      await expect(repo.updateRecord('record-A', {
        rawPayload: { _phase6HandoffState: value },
      }, lease)).resolves.toEqual({ count: 1 });
    }
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(tx.importBatch.updateMany).toHaveBeenCalledTimes(2);
    expect(tx.importRecord.updateMany).toHaveBeenCalledTimes(2);
    expect(prisma.importRecord.update).not.toHaveBeenCalled();
    await expect(repo.updateRecord('record-A', { status: 'NEEDS_REVIEW' }))
      .resolves.toMatchObject({ id: 'record-A' });
    expect(prisma.importRecord.update).toHaveBeenCalledOnce();
  });

  it('fail-closes a development-only update for a record outside the lease batch', async () => {
    const repo = new PrismaImportRepository(undefined, 'DEVELOPMENT_ONLY');
    const batch = await repo.createBatch({ dataType: 'GENERIC' });
    const record = await repo.createRecord({
      batchId: batch.id, status: 'COMPLETE', rawPayload: { data: true },
    });
    await expect(repo.updateRecord(record.id, { status: 'NEEDS_REVIEW' }, {
      batchId: 'different-batch', workerId: 'worker', attempt: 1,
      claimUntil: new Date(Date.now() + 30_000),
    })).rejects.toThrow('IMPORT_RECORD_BATCH_MISMATCH');
    expect((await repo.listRecords({ batchId: batch.id })).data[0].status).toBe('COMPLETE');
  });
});
