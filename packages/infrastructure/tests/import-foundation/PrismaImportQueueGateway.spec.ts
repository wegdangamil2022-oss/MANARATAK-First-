import { describe, expect, it, vi } from 'vitest';
import { ImportCheckpoint, ImportJobStatus, ImportRetryPolicy } from '@manaratak/domain';
import { PrismaImportQueueGateway } from '../../src/import-foundation/PrismaImportQueueGateway';

describe('PrismaImportQueueGateway', () => {
  it('uses a conditional persisted transition and returns false on a stale state', async () => {
    const prisma = mockPrisma();
    prisma.importBatch.updateMany.mockResolvedValue({ count: 0 });
    const gateway = new PrismaImportQueueGateway(prisma as any);

    await expect(gateway.markJobRunning('batch-1')).resolves.toBe(false);
    expect(prisma.importBatch.updateMany).toHaveBeenCalledWith({
      where: { id: 'batch-1', batchStatus: { in: [ImportJobStatus.QUEUED, ImportJobStatus.RESUMING] } },
      data: { batchStatus: ImportJobStatus.RUNNING },
    });
  });

  it('persists legacy checkpoint only after an unclaimed batch CAS inside the same transaction', async () => {
    const prisma = mockPrisma();
    const tx = {
      importBatch: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      importRecord: { create: vi.fn().mockResolvedValue({}) },
    };
    prisma.$transaction.mockImplementation(async (callback: any) => callback(tx));
    const gateway = new PrismaImportQueueGateway(prisma as any);
    const checkpoint = ImportCheckpoint.create({ batchId: 'batch-1', stage: 'VALIDATE', chunkIndex: 2, recordOffset: 1000, processedRecords: 995, failedRecords: 5, acceptedRecordKeys: ['key-1'], updatedAt: new Date('2026-08-13T00:00:00Z') });

    await gateway.recordCheckpoint('batch-1', checkpoint);
    expect(tx.importBatch.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: 'batch-1', claimedBy: null, claimUntil: null,
        batchStatus: { in: expect.arrayContaining([ImportJobStatus.QUEUED, ImportJobStatus.RUNNING]) },
      }),
      data: { processedRecords: 995, failedRecords: 5 },
    });
    expect(tx.importRecord.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ batchId: 'batch-1', status: 'CHECKPOINT' }),
    });
    expect(prisma.$transaction).toHaveBeenCalledOnce();

    tx.importBatch.updateMany.mockResolvedValue({ count: 0 });
    tx.importRecord.create.mockClear();
    await expect(gateway.recordCheckpoint('batch-1', checkpoint))
      .rejects.toThrow('IMPORT_CHECKPOINT_LEGACY_STATE_CONFLICT');
    expect(tx.importRecord.create).not.toHaveBeenCalled();
  });

  it('atomically refuses a stale worker checkpoint without creating any checkpoint record', async () => {
    const prisma = mockPrisma();
    const tx = {
      importBatch: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      importRecord: { create: vi.fn().mockResolvedValue({}) },
    };
    prisma.$transaction.mockImplementation(async (callback: any) => callback(tx));
    const gateway = new PrismaImportQueueGateway(prisma as any);
    const now = new Date();
    const lease = { batchId: 'batch-1', workerId: 'worker-1',
      attempt: 3, claimUntil: new Date(now.getTime() + 60_000) };
    const checkpoint = ImportCheckpoint.create({ batchId: 'batch-1', stage: 'VALIDATE',
      chunkIndex: 0, recordOffset: 2, processedRecords: 2, failedRecords: 0,
      acceptedRecordKeys: [], updatedAt: now });
    await expect(gateway.recordCheckpoint('batch-1', checkpoint, lease))
      .rejects.toThrow('IMPORT_WORKER_LEASE_LOST');
    expect(tx.importRecord.create).not.toHaveBeenCalled();
    expect(tx.importBatch.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: lease.batchId, batchStatus: ImportJobStatus.RUNNING,
        claimedBy: lease.workerId, attemptCount: lease.attempt,
        claimUntil: expect.objectContaining({ equals: lease.claimUntil }),
      }),
      data: { processedRecords: 2, failedRecords: 0 },
    });
    tx.importBatch.updateMany.mockResolvedValue({ count: 1 });
    await expect(gateway.recordCheckpoint('batch-1', checkpoint, lease)).resolves.toBeUndefined();
    expect(tx.importRecord.create).toHaveBeenCalledOnce();
    await expect(gateway.recordCheckpoint('another-batch', checkpoint, lease))
      .rejects.toThrow('IMPORT_CHECKPOINT_BATCH_MISMATCH');
  });

  it('atomically denies legacy DLQ against claimed workers and retains redacted evidence for allowed batches', async () => {
    const prisma = mockPrisma();
    const tx = {
      importBatch: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      importRecord: { create: vi.fn().mockResolvedValue({}) },
    };
    prisma.$transaction.mockImplementation(async (callback: any) => callback(tx));
    const gateway = new PrismaImportQueueGateway(prisma as any);
    const failure = { batchId: 'batch-1', failedAt: new Date(), reason: 'token=secret-value failed' };
    await expect(gateway.moveToDeadLetter(failure))
      .rejects.toThrow('IMPORT_DLQ_LEGACY_STATE_CONFLICT');
    expect(tx.importRecord.create).not.toHaveBeenCalled();
    expect(tx.importBatch.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'batch-1',
        batchStatus: { in: [ImportJobStatus.QUEUED, ImportJobStatus.FAILED_PERMANENT] },
        claimedBy: null, claimUntil: null,
      },
      data: {
        batchStatus: ImportJobStatus.DLQ, failedRecords: { increment: 1 },
        lastError: 'token=[REDACTED] failed',
      },
    });
    tx.importBatch.updateMany.mockResolvedValue({ count: 1 });
    await gateway.moveToDeadLetter(failure);
    const record = tx.importRecord.create.mock.calls[0][0].data;
    expect(record.processingNotes).toContain('token=[REDACTED]');
    expect(record.processingNotes).not.toContain('secret-value');
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it('rolls back a claimed failure transition when evidence persistence fails, and denies stale evidence', async () => {
    const now = new Date('2026-10-09T16:00:00Z');
    const lease = { batchId: 'batch-failure', workerId: 'w1', attempt: 2,
      claimUntil: new Date(now.getTime() + 30000) };
    const retryPolicy = ImportRetryPolicy.create({ maxAttempts: 3, dlqAfterAttempts: 3,
      backoffStrategy: 'fixed', initialDelayMs: 100, maxDelayMs: 100, retryableErrorCodes: ['TRANSIENT'] });
    let status = 'RUNNING';
    let stale = false;
    const create = vi.fn().mockRejectedValueOnce(new Error('EVIDENCE_UNAVAILABLE')).mockResolvedValue({});
    const prisma = {
      $transaction: vi.fn(async (callback: any) => {
        const before = status;
        try {
          return await callback({
            importBatch: { updateMany: async ({ data }: any) => {
              if (stale) return { count: 0 };
              status = data.batchStatus; return { count: 1 };
            } }, importRecord: { create },
          });
        } catch (error) { status = before; throw error; }
      }),
    };
    const gateway = new PrismaImportQueueGateway(prisma as any);
    const command = { lease, now, reason: 'token=private-value upstream failure', errorCode: 'TRANSIENT', retryPolicy };
    await expect(gateway.failClaimedJob(command)).rejects.toThrow('EVIDENCE_UNAVAILABLE');
    expect(status).toBe('RUNNING');
    await expect(gateway.failClaimedJob(command)).resolves.toBe('RETRY_SCHEDULED');
    const evidence = create.mock.calls[1][0].data;
    expect(evidence).toMatchObject({ status: 'WORKER_FAILURE', rawPayload: {
      stage: 'BATCH_WORKER', errorCode: 'TRANSIENT', attempt: 2,
      retryable: true, failedAt: now.toISOString(), outcome: 'FAILED_RETRYABLE',
    } });
    expect(JSON.stringify(evidence)).not.toContain('private-value');
    stale = true; create.mockClear();
    await expect(gateway.failClaimedJob(command)).resolves.toBe('LEASE_LOST');
    expect(create).not.toHaveBeenCalled();
  });

  it('reports persisted job status with the latest durable checkpoint', async () => {
    const prisma = mockPrisma();
    prisma.importBatch.findUnique.mockResolvedValue({ id: 'batch-1', batchStatus: 'RUNNING', totalRecords: 100, processedRecords: 40, failedRecords: 10, createdAt: new Date(), updatedAt: new Date() });
    prisma.importRecord.findFirst.mockResolvedValueOnce({ rawPayload: { recordOffset: 50 } }).mockResolvedValueOnce(null);
    const report = await new PrismaImportQueueGateway(prisma as any).getJobStatus('batch-1');
    expect(report?.progress).toBe(50);
    expect(report?.checkpoint).toEqual({ recordOffset: 50 });
  });

  it('reclaims an expired RUNNING job using a race-safe conditional claim', async () => {
    const tx = {
      importBatch: {
        findFirst: vi.fn().mockResolvedValue({ id: 'batch-abandoned' }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({ attemptCount: 4 }),
      },
    };
    const prisma = {
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    };
    const gateway = new PrismaImportQueueGateway(prisma as any);
    const now = new Date('2026-08-25T10:00:00.000Z');

    const lease = await gateway.claimNextJob({ workerId: 'worker-new', leaseDurationMs: 30_000, now });
    expect(lease).toMatchObject({ batchId: 'batch-abandoned', workerId: 'worker-new', attempt: 4 });
    expect(tx.importBatch.findFirst.mock.calls[0][0].where.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          batchStatus: ImportJobStatus.RUNNING,
          claimUntil: { lt: now },
        }),
      ]),
    );
  });

  it('does not allow a stale worker to complete an expired lease', async () => {
    const prisma = mockPrisma();
    prisma.importBatch.updateMany.mockResolvedValue({ count: 0 });
    const now = new Date('2026-08-25T10:00:00.000Z');
    const gateway = new PrismaImportQueueGateway(prisma as any);
    const lease = {
      batchId: 'batch-1',
      workerId: 'worker-old',
      attempt: 2,
      claimUntil: new Date('2026-08-25T09:59:00.000Z'),
    };
    await expect(gateway.completeClaimedJob(lease, now)).resolves.toBe(false);
    expect(prisma.importBatch.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ attemptCount: lease.attempt, claimUntil: { equals: lease.claimUntil, gte: now } }),
      }),
    );
  });

  it('requires a claimed worker acknowledgement before a RUNNING cancellation reaches CANCELLED', async () => {
    const prisma = mockPrisma();
    const gateway = new PrismaImportQueueGateway(prisma as any);
    const lease = {
      batchId: 'batch-running', workerId: 'worker-in-flight', attempt: 4,
      claimUntil: new Date(Date.now() + 60_000),
    };
    // QUEUED/PAUSED cannot match an actively claimed RUNNING job.
    prisma.importBatch.updateMany.mockResolvedValueOnce({ count: 0 });
    expect(await gateway.cancelJob({ batchId: lease.batchId, reason: 'Operator request' })).toBe(true);
    expect(prisma.importBatch.updateMany).toHaveBeenCalledWith({
      where: { id: lease.batchId,
        batchStatus: { in: [ImportJobStatus.RUNNING, ImportJobStatus.PAUSING] } },
      data: { batchStatus: ImportJobStatus.CANCELLING,
        lastError: 'Operator request' },
    });
    // The immediate CANCELLED conditional write was attempted against QUEUED/
    // PAUSED only (count=0). Only the RUNNING -> CANCELLING write succeeded.
    expect(prisma.importBatch.updateMany).toHaveBeenCalledTimes(2);
    expect(prisma.importBatch.updateMany.mock.calls[0][0].where.batchStatus).toEqual({
      in: [ImportJobStatus.QUEUED, ImportJobStatus.PAUSED, ImportJobStatus.RESUMING],
    });
    // The exact CANCELLING claim matches; no PAUSING branch is reachable.
    prisma.importBatch.updateMany.mockResolvedValueOnce({ count: 1 });
    expect(await gateway.acknowledgeStoppedJob(lease)).toBe('CANCELLED');
    expect(prisma.importBatch.updateMany).toHaveBeenLastCalledWith({
      where: {
        id: lease.batchId, batchStatus: ImportJobStatus.CANCELLING,
        claimedBy: lease.workerId, attemptCount: lease.attempt,
        claimUntil: { equals: lease.claimUntil },
      },
      data: { batchStatus: ImportJobStatus.CANCELLED, claimedBy: null, claimUntil: null },
    });
  });

  it('uses worker-acknowledged PAUSING and allows escalation to pending CANCELLING', async () => {
    const prisma = mockPrisma();
    const gateway = new PrismaImportQueueGateway(prisma as any);
    const lease = { batchId: 'batch-running', workerId: 'worker-1',
      attempt: 2, claimUntil: new Date(Date.now() + 10_000) };
    prisma.importBatch.updateMany.mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });
    expect(await gateway.pauseJob({ batchId: lease.batchId })).toBe(true);
    expect(prisma.importBatch.updateMany).toHaveBeenLastCalledWith({
      where: { id: lease.batchId, batchStatus: { in: [ImportJobStatus.RUNNING] } },
      data: { batchStatus: ImportJobStatus.PAUSING },
    });
    prisma.importBatch.updateMany.mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });
    expect(await gateway.acknowledgeStoppedJob(lease)).toBe('PAUSED');
    expect(prisma.importBatch.updateMany).toHaveBeenLastCalledWith({
      where: { id: lease.batchId, batchStatus: ImportJobStatus.PAUSING,
        claimedBy: lease.workerId, attemptCount: lease.attempt,
        claimUntil: { equals: lease.claimUntil } },
      data: { batchStatus: ImportJobStatus.PAUSED, claimedBy: null, claimUntil: null },
    });
  });

  it('conditions every claimed-lease mutation on attempt number and the exact lease expiry generation', async () => {
    const prisma = mockPrisma();
    const gateway = new PrismaImportQueueGateway(prisma as any);
    const now = new Date('2026-09-01T10:00:00.000Z');
    const lease = {
      batchId: 'batch-1', workerId: 'worker-shared', attempt: 5,
      claimUntil: new Date(now.getTime() + 1000),
    };
    const predicate = {
      id: lease.batchId, batchStatus: ImportJobStatus.RUNNING,
      claimedBy: lease.workerId, attemptCount: lease.attempt,
      claimUntil: { equals: lease.claimUntil, gte: now },
    };
    expect(await gateway.heartbeat(lease, 1000, now)).toMatchObject({ attempt: 5 });
    expect(prisma.importBatch.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: predicate }));
    expect(await gateway.completeClaimedJob(lease, now)).toBe(true);
    expect(prisma.importBatch.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: predicate }));
    const policy = ImportRetryPolicy.create({
      maxAttempts: 3, dlqAfterAttempts: 3, backoffStrategy: 'fixed',
      initialDelayMs: 100, maxDelayMs: 100, retryableErrorCodes: [],
    });
    expect(await gateway.failClaimedJob({ lease, now, reason: 'Failed', retryPolicy: policy })).toBe('DLQ');
    expect(prisma.importBatch.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: predicate }));
    prisma.importBatch.updateMany.mockResolvedValue({ count: 0 });
    expect(await gateway.heartbeat(lease, 1000, now)).toBeNull();
    expect(await gateway.completeClaimedJob(lease, now)).toBe(false);
    expect(await gateway.failClaimedJob({ lease, now, reason: 'Stale', retryPolicy: policy })).toBe('LEASE_LOST');
  });


  it('atomically records PARTIALLY_COMPLETED when the claimed batch has failed rows', async () => {
    const prisma = mockPrisma();
    const now = new Date('2026-10-09T16:00:00.000Z');
    const lease = { batchId: 'partial-1', workerId: 'worker-1', attempt: 2,
      claimUntil: new Date(now.getTime() + 20_000) };
    prisma.importBatch.updateMany.mockImplementation(async ({ where }: any) => ({
      count: typeof where.failedRecords === 'object' && where.failedRecords.gt === 0 ? 1 : 0,
    }));
    const gateway = new PrismaImportQueueGateway(prisma as any);
    expect(await gateway.completeClaimedJob(lease, now)).toBe(true);
    expect(prisma.importBatch.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.importBatch.updateMany).toHaveBeenCalledWith({
      where: {
        id: lease.batchId, batchStatus: ImportJobStatus.RUNNING,
        claimedBy: lease.workerId, attemptCount: lease.attempt,
        claimUntil: { equals: lease.claimUntil, gte: now },
        failedRecords: { gt: 0 },
      },
      data: { batchStatus: ImportJobStatus.PARTIALLY_COMPLETED,
        claimedBy: null, claimUntil: null, lastError: null },
    });
  });

  it('only records COMPLETED for an active clean claimed batch; stale leases cannot finalize either status', async () => {
    const prisma = mockPrisma();
    const now = new Date('2026-10-09T16:00:00.000Z');
    const lease = { batchId: 'clean-1', workerId: 'worker-1', attempt: 3,
      claimUntil: new Date(now.getTime() + 20_000) };
    prisma.importBatch.updateMany.mockImplementation(async ({ where }: any) => ({
      count: where.failedRecords === 0 ? 1 : 0,
    }));
    const gateway = new PrismaImportQueueGateway(prisma as any);
    expect(await gateway.completeClaimedJob(lease, now)).toBe(true);
    expect(prisma.importBatch.updateMany).toHaveBeenCalledTimes(2);
    expect(prisma.importBatch.updateMany).toHaveBeenLastCalledWith({
      where: {
        id: lease.batchId, batchStatus: ImportJobStatus.RUNNING,
        claimedBy: lease.workerId, attemptCount: lease.attempt,
        claimUntil: { equals: lease.claimUntil, gte: now }, failedRecords: 0,
      },
      data: { batchStatus: ImportJobStatus.COMPLETED,
        claimedBy: null, claimUntil: null, lastError: null },
    });
    prisma.importBatch.updateMany.mockResolvedValue({ count: 0 });
    expect(await gateway.completeClaimedJob(lease, now)).toBe(false);
  });


  it('prevents legacy completion/failure from overriding a claimed worker lease', async () => {
    const prisma = mockPrisma();
    prisma.importBatch.updateMany.mockResolvedValue({ count: 0 });
    const gateway = new PrismaImportQueueGateway(prisma as any);
    expect(await gateway.markJobCompleted('claimed-job')).toBe(false);
    expect(await gateway.markJobFailed('claimed-job', 'token=private')).toBe(false);
    expect(prisma.importBatch.updateMany).toHaveBeenCalledTimes(3);
    for (const [call] of prisma.importBatch.updateMany.mock.calls) {
      expect(call.where).toMatchObject({
        id: 'claimed-job', claimedBy: null, claimUntil: null,
      });
    }
    expect(prisma.importBatch.updateMany).toHaveBeenLastCalledWith({
      where: {
        id: 'claimed-job',
        batchStatus: { in: [ImportJobStatus.RUNNING, ImportJobStatus.FAILED_RETRYABLE] },
        claimedBy: null, claimUntil: null,
      },
      data: { batchStatus: ImportJobStatus.FAILED_PERMANENT,
        lastError: 'token=[REDACTED]' },
    });
    prisma.importBatch.updateMany.mockImplementation(async ({ where }: any) => ({
      count: where.failedRecords === 0 ? 1 : 0,
    }));
    expect(await gateway.markJobCompleted('unclaimed-job')).toBe(true);
    expect(prisma.importBatch.updateMany).toHaveBeenLastCalledWith({
      where: {
        id: 'unclaimed-job', batchStatus: ImportJobStatus.RUNNING,
        claimedBy: null, claimUntil: null, failedRecords: 0,
      },
      data: { batchStatus: ImportJobStatus.COMPLETED, lastError: null },
    });
  });

  it('reports 100% only for completed batches with zero work items, not queued empty batches', async () => {
    const prisma = mockPrisma();
    prisma.importRecord.findFirst.mockResolvedValue(null);
    prisma.importBatch.findUnique.mockResolvedValue({
      id: 'all-duplicates', batchStatus: ImportJobStatus.COMPLETED,
      totalRecords: 0, processedRecords: 0, failedRecords: 0,
      createdAt: new Date(), updatedAt: new Date(),
    });
    const gateway = new PrismaImportQueueGateway(prisma as any);
    expect((await gateway.getJobStatus('all-duplicates'))?.progress).toBe(100);
    prisma.importBatch.findUnique.mockResolvedValue({
      id: 'not-run', batchStatus: ImportJobStatus.QUEUED,
      totalRecords: 0, processedRecords: 0, failedRecords: 0,
      createdAt: new Date(), updatedAt: new Date(),
    });
    expect((await gateway.getJobStatus('not-run'))?.progress).toBe(0);
  });

  it('fresh replay clears checkpoint and stale lease control state atomically', async () => {
    const tx = {
      importBatch: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      importRecord: { deleteMany: vi.fn().mockResolvedValue({ count: 2 }) },
    };
    const prisma = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const gateway = new PrismaImportQueueGateway(prisma as any);
    await expect(gateway.replayJob({ batchId: 'batch-1', fromCheckpoint: false })).resolves.toBe(true);
    expect(tx.importBatch.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          batchStatus: ImportJobStatus.QUEUED,
          processedRecords: 0,
          failedRecords: 0,
          attemptCount: 0,
          claimedBy: null,
          claimUntil: null,
          lastError: null,
        }),
      }),
    );
    expect(tx.importRecord.deleteMany).toHaveBeenCalledWith({
      where: { batchId: 'batch-1', status: 'CHECKPOINT' },
    });
  });

});

function mockPrisma() {
  const importBatch = { updateMany: vi.fn().mockResolvedValue({ count: 1 }), findUnique: vi.fn(), update: vi.fn().mockReturnValue(Promise.resolve({})) };
  const importRecord = { create: vi.fn().mockReturnValue(Promise.resolve({})), findFirst: vi.fn() };
  return { importBatch, importRecord, $transaction: vi.fn(async (callback: any) => callback({ importBatch, importRecord })) };
}
