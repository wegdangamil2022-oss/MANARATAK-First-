import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProcessImportJobUseCase, ImportAdminUseCases } from '@manaratak/application';
import { InMemoryImportQueueGateway } from '@manaratak/infrastructure';
import { ImportTargetDomain } from '@manaratak/domain';

describe('ProcessImportJobUseCase', () => {
  let mockImportRepo: any;
  let queueGateway: InMemoryImportQueueGateway;
  let importAdminUseCases: ImportAdminUseCases;
  let processUseCase: ProcessImportJobUseCase;

  beforeEach(() => {
    mockImportRepo = {
      createBatch: vi.fn().mockImplementation(async (data: any) => ({ id: 'batch-123', ...data })),
      createRecord: vi.fn().mockImplementation(async (data: any) => ({ id: 'rec-1', ...data })),
      updateBatchStats: vi.fn().mockImplementation(async (id: string, stats: any) => ({ id, ...stats })),
      listBatches: vi.fn().mockResolvedValue([]),
      listRecords: vi.fn().mockResolvedValue([]),
    };

    queueGateway = new InMemoryImportQueueGateway();
    importAdminUseCases = new ImportAdminUseCases(mockImportRepo, queueGateway);
    processUseCase = new ProcessImportJobUseCase(importAdminUseCases, queueGateway);
  });

  it('throws an error if the job does not exist in the queue', async () => {
    await expect(
      processUseCase.execute({
        batchId: 'non-existent-batch',
        dataText: 'title,code\nUni 1,U1',
      })
    ).rejects.toThrow('Job not found for batchId: non-existent-batch');
  });

  it('refuses to process a PAUSED job', async () => {
    const batchId = 'batch-paused-1';
    await queueGateway.enqueueImportJob({
      batchId,
      targetDomain: ImportTargetDomain.UNIVERSITIES,
      sourceSystem: 'ADMIN_CONSOLE',
    });
    await queueGateway.pauseJob({ batchId, reason: 'Maintenance' });

    await expect(
      processUseCase.execute({
        batchId,
        dataText: 'title,code\nUni 1,U1',
      })
    ).rejects.toThrow('cannot be processed because its status is PAUSED');
  });

  it('refuses to process a CANCELLED job', async () => {
    const batchId = 'batch-cancelled-1';
    await queueGateway.enqueueImportJob({
      batchId,
      targetDomain: ImportTargetDomain.UNIVERSITIES,
      sourceSystem: 'ADMIN_CONSOLE',
    });
    await queueGateway.cancelJob({ batchId, reason: 'User cancelled' });

    await expect(
      processUseCase.execute({
        batchId,
        dataText: 'title,code\nUni 1,U1',
      })
    ).rejects.toThrow('cannot be processed because its status is CANCELLED');
  });

  it('successfully processes a QUEUED job by calling importAdminUseCases.importData and transitioning QUEUED -> RUNNING -> COMPLETED', async () => {
    const batchId = 'batch-queued-1';
    await queueGateway.enqueueImportJob({
      batchId,
      targetDomain: ImportTargetDomain.UNIVERSITIES,
      sourceSystem: 'ADMIN_CONSOLE',
    });

    const markRunningSpy = vi.spyOn(queueGateway, 'markJobRunning');
    const markCompletedSpy = vi.spyOn(queueGateway, 'markJobCompleted');

    const csvData = 'title,code\nTest Uni,TU1';
    const result = await processUseCase.execute({
      batchId,
      dataText: csvData,
      sourceSystem: 'ADMIN_CONSOLE',
      dataType: 'UNIVERSITIES',
    });

    expect(result.success).toBe(true);
    expect(result.batchId).toBe(batchId);
    expect(result.importResult).toBeDefined();
    expect(mockImportRepo.createBatch).toHaveBeenCalled();

    expect(markRunningSpy).toHaveBeenCalledWith(batchId);
    expect(markCompletedSpy).toHaveBeenCalledWith(batchId);

    const finalStatus = await queueGateway.getJobStatus(batchId);
    expect(finalStatus?.status).toBe('COMPLETED');
    expect(finalStatus?.progress).toBe(100);
  });

  it('sends failure to DLQ using moveToDeadLetter and marks job FAILED_PERMANENT when importData fails', async () => {
    const batchId = 'batch-failed-1';
    await queueGateway.enqueueImportJob({
      batchId,
      targetDomain: ImportTargetDomain.UNIVERSITIES,
      sourceSystem: 'ADMIN_CONSOLE',
    });

    vi.spyOn(importAdminUseCases, 'importData').mockRejectedValueOnce(
      new Error('Failed to parse CSV records')
    );

    const markFailedSpy = vi.spyOn(queueGateway, 'markJobFailed');
    const deadLetterSpy = vi.spyOn(queueGateway, 'moveToDeadLetter');

    const result = await processUseCase.execute({
      batchId,
      dataText: 'invalid csv',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to parse CSV records');
    expect(markFailedSpy).toHaveBeenCalledWith(batchId, 'Failed to parse CSV records');
    expect(deadLetterSpy).toHaveBeenCalledWith({
      batchId,
      failedAt: expect.any(Date),
      reason: 'Failed to parse CSV records',
    });

    const finalStatus = await queueGateway.getJobStatus(batchId);
    expect(finalStatus?.status).toBe('DLQ');
    expect(finalStatus?.lastError).toBe('Failed to parse CSV records');
  });

  it('does not alter synchronous importData execution', async () => {
    const directResult = await importAdminUseCases.importData({
      dataText: 'title,code\nDirect Uni,DU1',
      sourceSystem: 'ADMIN_CONSOLE',
      dataType: 'UNIVERSITIES',
    });

    expect(directResult).toBeDefined();
    expect(mockImportRepo.createBatch).toHaveBeenCalled();
  });
});
