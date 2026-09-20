import { describe, expect, it, vi } from 'vitest';
import { ImportCheckpoint, ImportJobStatus } from '@manaratak/domain';
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

  it('persists checkpoint and counters in one Prisma transaction', async () => {
    const prisma = mockPrisma();
    const gateway = new PrismaImportQueueGateway(prisma as any);
    const checkpoint = ImportCheckpoint.create({ batchId: 'batch-1', stage: 'VALIDATE', chunkIndex: 2, recordOffset: 1000, processedRecords: 995, failedRecords: 5, acceptedRecordKeys: ['key-1'], updatedAt: new Date('2026-08-13T00:00:00Z') });

    await gateway.recordCheckpoint('batch-1', checkpoint);
    expect(prisma.importRecord.create).toHaveBeenCalledWith({ data: expect.objectContaining({ batchId: 'batch-1', status: 'CHECKPOINT' }) });
    expect(prisma.importBatch.update).toHaveBeenCalledWith({ where: { id: 'batch-1' }, data: { processedRecords: 995, failedRecords: 5 } });
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });

  it('persists sanitized dead-letter evidence and DLQ state atomically', async () => {
    const prisma = mockPrisma();
    const gateway = new PrismaImportQueueGateway(prisma as any);

    await gateway.moveToDeadLetter({ batchId: 'batch-1', failedAt: new Date(), reason: 'token=secret-value failed' });
    const record = prisma.importRecord.create.mock.calls[0][0].data;
    expect(record.processingNotes).toContain('token=[REDACTED]');
    expect(record.processingNotes).not.toContain('secret-value');
    expect(prisma.importBatch.update).toHaveBeenCalledWith({ where: { id: 'batch-1' }, data: expect.objectContaining({ batchStatus: ImportJobStatus.DLQ, failedRecords: { increment: 1 }, claimedBy: null, claimUntil: null }) });
    expect(prisma.$transaction).toHaveBeenCalledOnce();
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
        where: expect.objectContaining({ claimUntil: { gte: now } }),
      }),
    );
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
  return { importBatch, importRecord, $transaction: vi.fn().mockResolvedValue([]) };
}
