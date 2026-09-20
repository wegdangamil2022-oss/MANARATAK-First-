import { describe, expect, it, vi } from 'vitest';
import { ImportRetryPolicy } from '@manaratak/domain';
import { InMemoryImportQueueGateway } from '@manaratak/infrastructure';
import { ImportAdminUseCases, ImportWorkerProtocol, ImportHandoffDispatcher } from '@manaratak/application';

function statefulImportRepository() {
  const batches = new Map<string, any>();
  const records = new Map<string, any>();
  return {
    batches,
    records,
    createBatch: vi.fn(async (data: any) => {
      const batch = { id: 'batch-durable-1', ...data, createdAt: new Date(), updatedAt: new Date() };
      batches.set(batch.id, batch);
      return batch;
    }),
    bulkCreateRecords: vi.fn(async (items: any[]) => {
      for (const item of items) records.set(item.id, { ...item, createdAt: new Date(), updatedAt: new Date() });
      return { count: items.length };
    }),
    createRecord: vi.fn(async (item: any) => {
      records.set(item.id, item);
      return item;
    }),
    updateRecord: vi.fn(async (id: string, updates: any) => {
      const next = { ...records.get(id), ...updates, updatedAt: new Date() };
      records.set(id, next);
      return next;
    }),
    updateBatchStats: vi.fn(async (id: string, updates: any) => {
      const next = { ...batches.get(id), ...updates, updatedAt: new Date() };
      batches.set(id, next);
      return next;
    }),
    getBatchById: vi.fn(async (id: string) => batches.get(id) ?? null),
    listBatches: vi.fn(async () => [...batches.values()]),
    listRecords: vi.fn(async ({ batchId, page = 1, pageSize = 100 }: any) => {
      const data = [...records.values()].filter((r) => r.batchId === batchId);
      return {
        data: data.slice((page - 1) * pageSize, page * pageSize),
        total: data.length,
        page,
        pageSize,
      };
    }),
    findBySourceDedupKey: vi.fn(async (key: string) =>
      [...records.values()].find((record) => record.sourceDedupKey === key) ?? null,
    ),
  };
}

describe('W2 Phase 6 durable worker integration', () => {
  it('persists the handoff envelope, enqueues, claims, dispatches and checkpoints before completion', async () => {
    const repo = statefulImportRepository();
    const queue = new InMemoryImportQueueGateway();
    const accept = vi.fn(async (handoff: any) => ({ accepted: true, handoffId: handoff.handoffId }));
    const dispatcher = new ImportHandoffDispatcher({ GENERIC: { accept } as any });
    const retryPolicy = ImportRetryPolicy.create({
      maxAttempts: 3,
      dlqAfterAttempts: 3,
      backoffStrategy: 'exponential',
      initialDelayMs: 10,
      maxDelayMs: 100,
      retryableErrorCodes: ['TRANSIENT'],
    });
    const worker = new ImportWorkerProtocol(queue, retryPolicy, 30_000);
    const useCase = new ImportAdminUseCases(repo as any, queue, dispatcher, worker);

    const result = await useCase.stageNormalizedRows({
      ownerDomain: 'GENERIC',
      sourceSystem: 'TEST_SOURCE',
      rows: [{ id: 'row-1', title: 'Row One' }],
    });

    expect(accept).toHaveBeenCalledTimes(1);
    expect(result.summary).toMatchObject({ totalRecords: 1, processedRecords: 1, failedRecords: 0 });
    const stored = [...repo.records.values()][0];
    expect(stored.rawPayload._phase6HandoffEnvelope).toBeUndefined();
    expect(stored.rawPayload._phase6HandoffState).toBe('DISPATCHED');
    expect(stored.rawPayload._domainHandoff).toEqual(expect.objectContaining({ accepted: true }));
    const queueStatus = await queue.getJobStatus('batch-durable-1');
    expect(queueStatus?.status).toBe('COMPLETED');
    expect(queueStatus?.checkpoint).toEqual(expect.objectContaining({ stage: 'DOMAIN_HANDOFF_DISPATCHED' }));
  });

  it('can recover an already-enqueued batch through processNextQueuedBatch without re-dispatching completed rows', async () => {
    const repo = statefulImportRepository();
    await repo.createBatch({
      sourceSystem: 'TEST_SOURCE',
      dataType: 'GENERIC',
      batchStatus: 'CREATED',
      totalRecords: 1,
      processedRecords: 0,
      failedRecords: 0,
    });
    await repo.bulkCreateRecords([
      {
        id: 'rec-recovery-1',
        batchId: 'batch-durable-1',
        status: 'COMPLETE',
        sourceDedupKey: 'dedup-1',
        rawPayload: {
          _phase6HandoffEnvelope: {
            handoffId: 'handoff:dedup-1',
            ownerDomain: 'GENERIC',
            artifact: { sourceId: 'TEST_SOURCE' },
            normalizedPayload: { id: 'row-1' },
            provenance: { sourceSystem: 'TEST_SOURCE', sourceRowNumber: 1, contentHash: 'hash' },
            validation: { state: 'VALID', issues: [] },
            execution: { executionId: 'batch-durable-1', dryRun: false, attempt: 1, idempotencyKey: 'dedup-1' },
          },
        },
      },
    ]);

    const queue = new InMemoryImportQueueGateway();
    await queue.enqueueImportJob({ batchId: 'batch-durable-1', targetDomain: 'GENERIC' as any, sourceSystem: 'TEST_SOURCE' });
    const accept = vi.fn(async () => ({ accepted: true }));
    const dispatcher = new ImportHandoffDispatcher({ GENERIC: { accept } as any });
    const worker = new ImportWorkerProtocol(
      queue,
      ImportRetryPolicy.create({
        maxAttempts: 3,
        dlqAfterAttempts: 3,
        backoffStrategy: 'fixed',
        initialDelayMs: 10,
        maxDelayMs: 10,
        retryableErrorCodes: [],
      }),
    );
    const useCase = new ImportAdminUseCases(repo as any, queue, dispatcher, worker);

    await expect(useCase.processNextQueuedBatch('recovery-worker')).resolves.toBe('COMPLETED');
    expect(accept).toHaveBeenCalledTimes(1);

    // Replaying the same durable record after its envelope was removed does not duplicate handoff.
    queue.setStatusForTesting('batch-durable-1', 'COMPLETED' as any);
    await queue.replayJob({ batchId: 'batch-durable-1', fromCheckpoint: false });
    const replayResult = await useCase.processNextQueuedBatch('recovery-worker-2');
    expect(replayResult, JSON.stringify(await queue.getJobStatus('batch-durable-1'))).toBe('COMPLETED');
    expect(accept).toHaveBeenCalledTimes(1);
  });
  it('keeps the handoff envelope and marks the record awaiting integration when no owning-domain consumer is registered', async () => {
    const repo = statefulImportRepository();
    const queue = new InMemoryImportQueueGateway();
    const dispatcher = new ImportHandoffDispatcher({});
    const worker = new ImportWorkerProtocol(
      queue,
      ImportRetryPolicy.create({
        maxAttempts: 3,
        dlqAfterAttempts: 3,
        backoffStrategy: 'fixed',
        initialDelayMs: 10,
        maxDelayMs: 10,
        retryableErrorCodes: [],
      }),
      30_000,
    );
    const useCase = new ImportAdminUseCases(repo as any, queue, dispatcher, worker);

    await useCase.stageNormalizedRows({
      ownerDomain: 'UNIVERSITIES',
      sourceSystem: 'TEST_SOURCE',
      rows: [{ id: 'university-1', name: 'Example University' }],
    });

    const stored = [...repo.records.values()][0];
    expect(stored.status).toBe('NEEDS_REVIEW');
    expect(stored.rawPayload._phase6HandoffEnvelope).toBeTruthy();
    expect(stored.rawPayload._phase6HandoffState).toBe('AWAITING_DOMAIN_INTEGRATION');
    expect(stored.rawPayload._domainHandoff).toBeUndefined();
  });

});
