import { describe, expect, it, vi } from 'vitest';
import { PrismaImportRepository } from '../../src/import-foundation/PrismaImportRepository';

describe('Phase 6 batch and record failure evidence', () => {
  it('reports a DLQ batch even when it never produced an individual failed record', async () => {
    const prisma = {
      importRecord: {
        count: vi.fn().mockResolvedValue(0),
        findMany: vi.fn().mockResolvedValue([]),
      },
      importBatch: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([{
          id: 'batch-failed', sourceSystem: 'PROVIDER', dataType: 'UNIVERSITIES',
          batchStatus: 'DLQ', lastError: 'authorization=supersecret upstream failure',
          attemptCount: 5, updatedAt: new Date('2026-10-09T17:00:00Z'),
        }]),
      },
    };
    const repository = new PrismaImportRepository(prisma as any);
    const result = await repository.getErrorReport({ dataType: 'UNIVERSITIES', limit: 20 });
    expect(result).toMatchObject({
      total: 0, failed: 0, dlq: 0, rows: [],
      batchFailureTotal: 1, truncatedBatchFailures: false,
      batchFailures: [expect.objectContaining({
        batchId: 'batch-failed', domain: 'UNIVERSITIES', status: 'DLQ',
        stage: 'BATCH_WORKER', retryable: false, attempt: 5,
        message: expect.stringContaining('authorization=[REDACTED]'),
      })],
    });
    expect(JSON.stringify(result)).not.toContain('supersecret');
    expect(prisma.importBatch.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ dataType: 'UNIVERSITIES',
        batchStatus: { in: ['DLQ', 'FAILED_PERMANENT', 'FAILED_RETRYABLE'] } }),
    });
  });

  it('returns bounded failure summaries for development-only staging too', async () => {
    const repo = new PrismaImportRepository(undefined, 'DEVELOPMENT_ONLY');
    const first = await repo.createBatch({ dataType: 'COURSES', sourceSystem: 'TEST' });
    await repo.updateBatchStats(first.id, { batchStatus: 'FAILED_RETRYABLE' });
    const second = await repo.createBatch({ dataType: 'UNIVERSITIES' });
    await repo.updateBatchStats(second.id, { batchStatus: 'DLQ' });
    const result = await repo.getErrorReport({ dataType: 'COURSES', limit: 1 });
    expect(result).toMatchObject({
      total: 0, batchFailureTotal: 1,
      batchFailures: [expect.objectContaining({
        batchId: first.id, retryable: true, status: 'FAILED_RETRYABLE',
      })],
    });
    expect(result.batchFailures[0].errorCode).toBeNull(); // Never invent an error code.
  });
  it('projects structured worker failure events independently from source-record counts', async () => {
    const now = new Date();
    const prisma = {
      importRecord: {
        count: vi.fn(async ({ where }: any) => where.status === 'WORKER_FAILURE' ? 1 : 0),
        findMany: vi.fn(async ({ where }: any) => where.status === 'WORKER_FAILURE' ? [{
          id: 'event-1', batchId: 'batch-1', createdAt: now,
          processingNotes: 'secret=private-value failed',
          rawPayload: { stage: 'BATCH_WORKER', errorCode: 'TRANSIENT', attempt: 2,
            retryable: true, outcome: 'FAILED_RETRYABLE', hiddenPayload: 'must-not-leak' },
          batch: { dataType: 'COURSES', sourceSystem: 'PROVIDER' },
        }] : []),
      }, importBatch: { count: vi.fn().mockResolvedValue(0), findMany: vi.fn().mockResolvedValue([]) },
    };
    const report = await new PrismaImportRepository(prisma as any).getErrorReport({ batchId: 'batch-1' });
    expect(report).toMatchObject({ total: 0, failed: 0, dlq: 0, rows: [], workerFailureTotal: 1,
      workerFailures: [expect.objectContaining({ eventId: 'event-1', errorCode: 'TRANSIENT', attempt: 2, retryable: true })] });
    expect(JSON.stringify(report)).not.toContain('private-value');
    expect(JSON.stringify(report)).not.toContain('must-not-leak');
  });

  it('excludes checkpoint and failure evidence in worker pagination at the database query', async () => {
    const prisma = { importRecord: { count: vi.fn().mockResolvedValue(205), findMany: vi.fn().mockResolvedValue([]) } };
    await new PrismaImportRepository(prisma as any).listRecords({ batchId: 'batch-1', page: 2, pageSize: 100, workItemsOnly: true });
    expect(prisma.importRecord.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { batchId: 'batch-1', AND: [{ status: { notIn: ['CHECKPOINT', 'DLQ', 'WORKER_FAILURE'] } }] },
      skip: 100, take: 100,
    }));
    expect(prisma.importRecord.count).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ AND: [{ status: { notIn: ['CHECKPOINT', 'DLQ', 'WORKER_FAILURE'] } }] }),
    }));
  });

});
