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
    // Both the write-ahead intent and the ack are protected by the active lease.
    expect(repo.updateRecord).toHaveBeenCalledTimes(2);
    const workerWrites = repo.updateRecord.mock.calls as unknown as
      Array<[string, Record<string, unknown>, { batchId: string; attempt: number; workerId: string }]>;
    expect(workerWrites.every(([, , lease]) =>
      lease?.batchId === 'batch-durable-1' &&
      lease?.attempt === 1 &&
      Boolean(lease?.workerId),
    )).toBe(true);
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

  it('refuses subsequent handoffs and record acknowledgement after cancellation during an owner call', async () => {
    const repo = statefulImportRepository();
    await repo.createBatch({ sourceSystem: 'TEST_SOURCE', dataType: 'GENERIC',
      batchStatus: 'CREATED', totalRecords: 2, processedRecords: 0, failedRecords: 0 });
    const rawEnvelope = (id: string) => ({
      handoffId: `handoff:${id}`, ownerDomain: 'GENERIC',
      artifact: { sourceId: 'TEST_SOURCE' },
      normalizedPayload: { id },
      provenance: { sourceSystem: 'TEST_SOURCE', sourceRowNumber: 1, contentHash: id },
      validation: { state: 'VALID', issues: [] },
      execution: { executionId: 'batch-durable-1', dryRun: false, attempt: 1, idempotencyKey: id },
    });
    await repo.bulkCreateRecords(['a', 'b'].map(id => ({
      id: `rec-${id}`, batchId: 'batch-durable-1', status: 'COMPLETE',
      sourceDedupKey: id, rawPayload: { _phase6HandoffEnvelope: rawEnvelope(id) },
    })));
    const queue = new InMemoryImportQueueGateway();
    await queue.enqueueImportJob({ batchId: 'batch-durable-1', targetDomain: 'GENERIC' as any, sourceSystem: 'TEST_SOURCE' });
    const accept = vi.fn(async () => {
      await queue.cancelJob({ batchId: 'batch-durable-1', reason: 'Admin cancelled processing' });
      return { accepted: true };
    });
    const dispatcher = new ImportHandoffDispatcher({ GENERIC: { accept } as any });
    const worker = new ImportWorkerProtocol(queue, ImportRetryPolicy.create({
      maxAttempts: 3, dlqAfterAttempts: 3, backoffStrategy: 'fixed', initialDelayMs: 10,
      maxDelayMs: 10, retryableErrorCodes: [],
    }));
    const useCase = new ImportAdminUseCases(repo as any, queue, dispatcher, worker);
    await expect(useCase.processNextQueuedBatch('cancelled-worker')).rejects.toThrow('IMPORT_WORKER_LEASE_LOST');
    expect(accept).toHaveBeenCalledTimes(1);
    expect(repo.updateRecord).toHaveBeenCalledTimes(1);
    expect(repo.records.get('rec-a')?.rawPayload._phase6HandoffState).toBe('DISPATCH_IN_FLIGHT');
    expect(repo.updateBatchStats).not.toHaveBeenCalled();
    expect((await queue.getJobStatus('batch-durable-1'))?.status).toBe('CANCELLED');
  });

  it('refuses the first owner side effect when a PAUSE revokes its claimed lease', async () => {
    const repo = statefulImportRepository();
    await repo.createBatch({ sourceSystem: 'TEST_SOURCE', dataType: 'GENERIC',
      batchStatus: 'CREATED', totalRecords: 1, processedRecords: 0, failedRecords: 0 });
    await repo.bulkCreateRecords([{
      id: 'rec-a', batchId: 'batch-durable-1', status: 'COMPLETE', sourceDedupKey: 'a',
      rawPayload: { _phase6HandoffEnvelope: {
        handoffId: 'handoff:a', ownerDomain: 'GENERIC', artifact: { sourceId: 'TEST_SOURCE' },
        normalizedPayload: { id: 'a' },
        provenance: { sourceSystem: 'TEST_SOURCE', sourceRowNumber: 1, contentHash: 'sha256:a' },
        validation: { state: 'VALID', issues: [] },
        execution: { executionId: 'batch-durable-1', dryRun: false, attempt: 1, idempotencyKey: 'a' },
      } },
    }]);
    const queue = new InMemoryImportQueueGateway();
    await queue.enqueueImportJob({ batchId: 'batch-durable-1', targetDomain: 'GENERIC' as any, sourceSystem: 'TEST_SOURCE' });
    vi.spyOn(queue, 'heartbeat').mockImplementationOnce(async () => {
      await queue.pauseJob({ batchId: 'batch-durable-1', reason: 'Paused by admin' });
      return null;
    });
    const accept = vi.fn(async () => ({ accepted: true }));
    const worker = new ImportWorkerProtocol(queue, ImportRetryPolicy.create({
      maxAttempts: 3, dlqAfterAttempts: 3, backoffStrategy: 'fixed', initialDelayMs: 10,
      maxDelayMs: 10, retryableErrorCodes: [],
    }));
    const useCase = new ImportAdminUseCases(repo as any, queue,
      new ImportHandoffDispatcher({ GENERIC: { accept } as any }), worker);
    await expect(useCase.processNextQueuedBatch('paused-worker')).rejects.toThrow('IMPORT_WORKER_LEASE_LOST');
    expect(accept).not.toHaveBeenCalled();
    expect(repo.updateRecord).not.toHaveBeenCalled();
    expect((await queue.getJobStatus('batch-durable-1'))?.status).toBe('PAUSED');
  });

  it('refuses duplicate owner dispatch after ack failure and persists manual reconciliation on replay', async () => {
    const repo = statefulImportRepository();
    await repo.createBatch({ sourceSystem: 'TEST_SOURCE', dataType: 'GENERIC',
      batchStatus: 'CREATED', totalRecords: 1, processedRecords: 0, failedRecords: 0 });
    await repo.bulkCreateRecords([{ id: 'rec-crash', batchId: 'batch-durable-1',
      status: 'COMPLETE', sourceDedupKey: 'key-crash', rawPayload: {
        _phase6HandoffState: 'PENDING_HANDOFF',
        _phase6HandoffEnvelope: {
          handoffId: 'handoff:key-crash', ownerDomain: 'GENERIC',
          artifact: { sourceId: 'TEST_SOURCE' }, normalizedPayload: { id: 'row' },
          provenance: { sourceSystem: 'TEST_SOURCE', sourceRowNumber: 1, contentHash: 'hash' },
          validation: { state: 'VALID', issues: [] },
          execution: { executionId: 'batch-durable-1', dryRun: false, attempt: 1, idempotencyKey: 'key-crash' },
        },
      },
    }]);
    const originalUpdate = repo.updateRecord.getMockImplementation()!;
    repo.updateRecord.mockImplementationOnce(originalUpdate)
      .mockImplementationOnce(async () => { throw Object.assign(new Error('IMPORT_ACK_FAILED'), { code: 'PERMANENT' }); });
    const queue = new InMemoryImportQueueGateway();
    await queue.enqueueImportJob({ batchId: 'batch-durable-1', targetDomain: 'GENERIC' as any, sourceSystem: 'TEST_SOURCE' });
    const accept = vi.fn(async () => ({ accepted: true }));
    const useCase = new ImportAdminUseCases(repo as any, queue,
      new ImportHandoffDispatcher({ GENERIC: { accept } as any }),
      new ImportWorkerProtocol(queue, ImportRetryPolicy.create({
        maxAttempts: 2, dlqAfterAttempts: 2, backoffStrategy: 'fixed',
        initialDelayMs: 10, maxDelayMs: 10, retryableErrorCodes: [],
      })));
    expect(await useCase.processNextQueuedBatch('first-worker')).toBe('DLQ');
    expect(accept).toHaveBeenCalledTimes(1);
    expect(repo.records.get('rec-crash')?.rawPayload._phase6HandoffState).toBe('DISPATCH_IN_FLIGHT');
    await queue.replayJob({ batchId: 'batch-durable-1', fromCheckpoint: false });
    expect(await useCase.processNextQueuedBatch('replay-worker')).toBe('COMPLETED');
    expect(accept).toHaveBeenCalledTimes(1);
    const stored = repo.records.get('rec-crash');
    expect(stored.status).toBe('NEEDS_REVIEW');
    expect(stored.rawPayload._phase6HandoffState).toBe('MANUAL_RECONCILIATION_REQUIRED');
    expect(stored.rawPayload._phase6HandoffEnvelope).toBeTruthy();
  });

  it('rejects client-forged private handoff markers before creating an import batch', async () => {
    const repo = statefulImportRepository();
    const useCase = new ImportAdminUseCases(repo as any);
    for (const reserved of ['_phase6HandoffEnvelope', '_phase6HandoffState',
      '_sourceRowNumber', '_domainHandoff', '_payloadFingerprint']) {
      await expect(useCase.stageNormalizedRows({
        ownerDomain: 'GENERIC', sourceSystem: 'SOURCE',
        rows: [{ title: 'University', [reserved]: { forged: true } }],
      })).rejects.toThrow('IMPORT_RESERVED_HANDOFF_METADATA_FORBIDDEN');
    }
    expect(repo.createBatch).not.toHaveBeenCalled();
  });

  it('never rewrites uncertain owner receipts as safe-to-dispatch when a consumer is offline', async () => {
    const repo = statefulImportRepository();
    await repo.createBatch({ sourceSystem: 'TEST_SOURCE', dataType: 'GENERIC',
      batchStatus: 'CREATED', totalRecords: 1, processedRecords: 0, failedRecords: 0 });
    await repo.bulkCreateRecords([{
      id: 'rec-uncertain', batchId: 'batch-durable-1', status: 'COMPLETE',
      sourceDedupKey: 'receipt-key',
      rawPayload: {
        _phase6HandoffState: 'DISPATCH_IN_FLIGHT',
        _phase6HandoffEnvelope: {
          handoffId: 'handoff:receipt-key', ownerDomain: 'GENERIC',
          artifact: { sourceId: 'TEST_SOURCE' }, normalizedPayload: { id: 'record' },
          provenance: { sourceSystem: 'TEST_SOURCE', sourceRowNumber: 1, contentHash: 'hash' },
          validation: { state: 'VALID', issues: [] },
          execution: { executionId: 'batch-durable-1', dryRun: false, attempt: 1, idempotencyKey: 'receipt-key' },
        },
      },
    }]);
    const queue = new InMemoryImportQueueGateway();
    await queue.enqueueImportJob({ batchId: 'batch-durable-1',
      targetDomain: 'GENERIC' as any, sourceSystem: 'TEST_SOURCE' });
    const empty = new ImportHandoffDispatcher({});
    const worker = new ImportWorkerProtocol(queue, ImportRetryPolicy.create({
      maxAttempts: 3, dlqAfterAttempts: 3, backoffStrategy: 'fixed',
      initialDelayMs: 10, maxDelayMs: 10, retryableErrorCodes: [],
    }));
    const useCase = new ImportAdminUseCases(repo as any, queue, empty, worker);
    expect(await useCase.processNextQueuedBatch('offline-consumer-worker')).toBe('COMPLETED');
    const record = repo.records.get('rec-uncertain');
    expect(record.status).toBe('NEEDS_REVIEW');
    expect(record.rawPayload._phase6HandoffState).toBe('MANUAL_RECONCILIATION_REQUIRED');
    expect(record.rawPayload._phase6HandoffEnvelope).toBeTruthy();
  });

  it('prefetches existing source identities once per chunk and avoids per-row repository probes', async () => {
    const repo = statefulImportRepository();
    const batchLookup = vi.fn(async (keys: string[]) => [keys[0]]);
    const singleLookup = vi.fn(async () => { throw new Error('Unexpected per-row source lookup'); });
    const accelerated = { ...repo, findExistingSourceDedupKeys: batchLookup,
      findBySourceDedupKey: singleLookup };
    const useCase = new ImportAdminUseCases(accelerated as any);
    const result = await useCase.stageNormalizedRows({
      ownerDomain: 'GENERIC', sourceSystem: 'TEST_SOURCE',
      rows: [{ title: 'Old' }, { title: 'New' }],
    });
    expect(batchLookup).toHaveBeenCalledTimes(1);
    expect(batchLookup.mock.calls[0][0]).toHaveLength(2);
    expect(singleLookup).not.toHaveBeenCalled();
    expect(result.summary.skippedDuplicates).toBe(1);
    expect(result.summary.stagedRecords).toBe(1);
    expect(repo.records.size).toBe(1);
  });

  it('writes bounded recent accepted source keys rather than an unbounded checkpoint payload', async () => {
    const repo = statefulImportRepository();
    const queue = new InMemoryImportQueueGateway();
    const accept = vi.fn(async () => ({ staged: true }));
    const worker = new ImportWorkerProtocol(queue, ImportRetryPolicy.create({
      maxAttempts: 3, dlqAfterAttempts: 3, backoffStrategy: 'fixed',
      initialDelayMs: 10, maxDelayMs: 10, retryableErrorCodes: [],
    }));
    const useCase = new ImportAdminUseCases(repo as any, queue,
      new ImportHandoffDispatcher({ GENERIC: { accept } as any }), worker);
    const result = await useCase.stageNormalizedRows({
      ownerDomain: 'GENERIC', sourceSystem: 'TEST_SOURCE',
      rows: Array.from({ length: 75 }, (_, index) => ({
        sourceId: `row-${index}`, content: `Unique row ${index}`,
      })),
    });
    expect(result.summary.stagedRecords).toBe(75);
    expect(accept).toHaveBeenCalledTimes(75);
    const status = await queue.getJobStatus('batch-durable-1');
    expect(status?.status).toBe('COMPLETED');
    expect(status?.checkpoint).toEqual(expect.objectContaining({
      recordOffset: 75, processedRecords: 75,
      metadata: expect.objectContaining({
        acceptedRecordKeyCount: 75, retainedAcceptedKeyLimit: 32,
        cursorMode: 'RECENT_KEYS',
      }),
    }));
    const recent = (status?.checkpoint as { acceptedRecordKeys?: string[] }).acceptedRecordKeys;
    expect(recent).toHaveLength(32);
    expect(recent).toEqual([...repo.records.values()].slice(-32).map(record => record.sourceDedupKey));
  });

  it.each([
    ['cancel', 'CANCELLING', 'CANCELLED'],
    ['pause', 'PAUSING', 'PAUSED'],
  ] as const)('does not report a running %s as final while the worker is still inside owner code', async (action, pending, final) => {
    const queue = new InMemoryImportQueueGateway();
    await queue.enqueueImportJob({ batchId: 'batch-stop-wait',
      sourceSystem: 'TEST_SOURCE', targetDomain: 'GENERIC' as any });
    const worker = new ImportWorkerProtocol(queue, ImportRetryPolicy.create({
      maxAttempts: 3, dlqAfterAttempts: 3, backoffStrategy: 'fixed',
      initialDelayMs: 10, maxDelayMs: 10, retryableErrorCodes: [],
    }));
    let announce!: () => void;
    let release!: () => void;
    const started = new Promise<void>(resolve => { announce = resolve; });
    const ownerFinishes = new Promise<void>(resolve => { release = resolve; });
    const processing = worker.runOne('worker-stop-confirm', async (_lease, heartbeat) => {
      announce();
      await ownerFinishes;
      await heartbeat();
    });
    await started;
    if (action === 'cancel')
      expect(await queue.cancelJob({ batchId: 'batch-stop-wait' })).toBe(true);
    else expect(await queue.pauseJob({ batchId: 'batch-stop-wait' })).toBe(true);
    expect((await queue.getJobStatus('batch-stop-wait'))?.status).toBe(pending);
    expect(await queue.claimNextJob({
      workerId: 'worker-replacement', leaseDurationMs: 30_000,
    })).toBeNull();
    // The callback is still running. Neither stop state may become final yet.
    expect((await queue.getJobStatus('batch-stop-wait'))?.status).toBe(pending);
    release();
    await expect(processing).rejects.toThrow('IMPORT_WORKER_LEASE_LOST');
    expect((await queue.getJobStatus('batch-stop-wait'))?.status).toBe(final);
  });

});
