import { describe, it, expect, beforeEach } from 'vitest';
import { ImportCheckpoint, ImportJobStatus, ImportTargetDomain } from '@manaratak/domain';
import { InMemoryImportQueueGateway } from '../../src/import-foundation/InMemoryImportQueueGateway';

describe('InMemoryImportQueueGateway', () => {
  let gateway: InMemoryImportQueueGateway;

  beforeEach(() => {
    gateway = new InMemoryImportQueueGateway();
  });

  it('enqueues an import job and retrieves its initial status', async () => {
    const batchId = 'batch-test-101';
    const returnedId = await gateway.enqueueImportJob({
      batchId,
      targetDomain: ImportTargetDomain.UNIVERSITIES,
      sourceSystem: 'ADMIN_PORTAL',
    });

    expect(returnedId).toBe(batchId);

    const status = await gateway.getJobStatus(batchId);
    expect(status).not.toBeNull();
    expect(status?.batchId).toBe(batchId);
    expect(status?.status).toBe(ImportJobStatus.QUEUED);
    expect(status?.progress).toBe(0);
    expect(status?.processedRecords).toBe(0);
    expect(status?.failedRecords).toBe(0);
    expect(status?.checkpoint).toBeUndefined();
  });

  it('returns null for non-existent job status', async () => {
    const status = await gateway.getJobStatus('batch-non-existent');
    expect(status).toBeNull();
  });

  it('handles pause and resume valid and invalid transitions', async () => {
    const batchId = 'batch-pause-resume';
    await gateway.enqueueImportJob({
      batchId,
      targetDomain: ImportTargetDomain.MAJORS,
      sourceSystem: 'ADMIN_PORTAL',
    });

    // Valid: QUEUED -> PAUSED
    const pausedOk = await gateway.pauseJob({ batchId, reason: 'Maintenance' });
    expect(pausedOk).toBe(true);

    let status = await gateway.getJobStatus(batchId);
    expect(status?.status).toBe(ImportJobStatus.PAUSED);
    expect(status?.lastError).toBe('Maintenance');

    // Invalid: PAUSED -> PAUSED
    const pauseAgain = await gateway.pauseJob({ batchId });
    expect(pauseAgain).toBe(false);

    // Valid: PAUSED -> QUEUED
    const resumedOk = await gateway.resumeJob({ batchId });
    expect(resumedOk).toBe(true);

    status = await gateway.getJobStatus(batchId);
    expect(status?.status).toBe(ImportJobStatus.QUEUED);

    // Invalid: QUEUED -> QUEUED resume attempt
    const resumeAgain = await gateway.resumeJob({ batchId });
    expect(resumeAgain).toBe(false);

    // Invalid job ID
    expect(await gateway.pauseJob({ batchId: 'unknown' })).toBe(false);
    expect(await gateway.resumeJob({ batchId: 'unknown' })).toBe(false);
  });

  it('handles cancel valid and invalid transitions', async () => {
    const batchId = 'batch-cancel';
    await gateway.enqueueImportJob({
      batchId,
      targetDomain: ImportTargetDomain.COURSES,
      sourceSystem: 'CSV_UPLOAD',
    });

    // Valid: QUEUED -> CANCELLED
    const cancelledOk = await gateway.cancelJob({ batchId, reason: 'User requested cancellation' });
    expect(cancelledOk).toBe(true);

    const status = await gateway.getJobStatus(batchId);
    expect(status?.status).toBe(ImportJobStatus.CANCELLED);
    expect(status?.lastError).toBe('User requested cancellation');

    // Invalid: CANCELLED -> CANCELLED
    const cancelAgain = await gateway.cancelJob({ batchId });
    expect(cancelAgain).toBe(false);

    // Invalid job ID
    expect(await gateway.cancelJob({ batchId: 'unknown' })).toBe(false);
  });

  it('records checkpoint and updates progress defensively', async () => {
    const batchId = 'batch-checkpoint';
    await gateway.enqueueImportJob({
      batchId,
      targetDomain: ImportTargetDomain.SCHOLARSHIPS,
      sourceSystem: 'BULK_API',
    });

    gateway.setTotalRecords(batchId, 100);

    const checkpoint = ImportCheckpoint.create({
      batchId,
      stage: 'INGESTION',
      chunkIndex: 2,
      recordOffset: 50,
      processedRecords: 45,
      failedRecords: 5,
      acceptedRecordKeys: ['schol-1', 'schol-2'],
      updatedAt: new Date(),
    });

    await gateway.recordCheckpoint(batchId, checkpoint);

    const status = await gateway.getJobStatus(batchId);
    expect(status?.processedRecords).toBe(45);
    expect(status?.failedRecords).toBe(5);
    expect(status?.progress).toBe(50); // (45 + 5) / 100 * 100 = 50%
    expect(status?.checkpoint).toBeDefined();
    expect((status?.checkpoint as any).chunkIndex).toBe(2);
  });

  it('throws when recording checkpoint for non-existent job', async () => {
    const checkpoint = ImportCheckpoint.create({
      batchId: 'unknown-batch',
      stage: 'INGESTION',
      chunkIndex: 0,
      recordOffset: 0,
      processedRecords: 0,
      failedRecords: 0,
      acceptedRecordKeys: [],
      updatedAt: new Date(),
    });

    await expect(gateway.recordCheckpoint('unknown-batch', checkpoint)).rejects.toThrow(
      "Import job with batchId 'unknown-batch' not found"
    );
  });

  it('moves items to dead letter queue and sets DLQ status', async () => {
    const batchId = 'batch-dlq';
    await gateway.enqueueImportJob({
      batchId,
      targetDomain: ImportTargetDomain.INTERNATIONAL_TESTS,
      sourceSystem: 'EXTERNAL_FEED',
    });

    await gateway.moveToDeadLetter({
      batchId,
      recordId: 'rec-99',
      failedAt: new Date(),
      reason: 'Validation schema mismatch',
      errorCode: 'INVALID_FORMAT',
      payload: { raw: 'invalid-data' },
    });

    const status = await gateway.getJobStatus(batchId);
    expect(status?.status).toBe(ImportJobStatus.DLQ);
    expect(status?.lastError).toBe('Validation schema mismatch');

    const dlqRecords = gateway.getDeadLetters(batchId);
    expect(dlqRecords).toHaveLength(1);
    expect(dlqRecords[0].recordId).toBe('rec-99');
    expect(dlqRecords[0].errorCode).toBe('INVALID_FORMAT');
  });

  it('creates minimal job snapshot when moving non-existent batch item to DLQ', async () => {
    const batchId = 'unregistered-batch-dlq';

    await gateway.moveToDeadLetter({
      batchId,
      failedAt: new Date(),
      reason: 'Fatal parsing failure',
    });

    const status = await gateway.getJobStatus(batchId);
    expect(status?.status).toBe(ImportJobStatus.DLQ);
    expect(status?.failedRecords).toBe(1);
    expect(status?.lastError).toBe('Fatal parsing failure');
  });

  it('replays job from terminal status, respecting fromCheckpoint option', async () => {
    const batchId = 'batch-replay';
    await gateway.enqueueImportJob({
      batchId,
      targetDomain: ImportTargetDomain.UNIVERSITIES,
      sourceSystem: 'ADMIN_CONSOLE',
    });

    gateway.setTotalRecords(batchId, 100);

    const checkpoint = ImportCheckpoint.create({
      batchId,
      stage: 'INGESTION',
      chunkIndex: 1,
      recordOffset: 25,
      processedRecords: 20,
      failedRecords: 5,
      acceptedRecordKeys: ['uni-1'],
      updatedAt: new Date(),
    });

    await gateway.recordCheckpoint(batchId, checkpoint);
    gateway.setStatusForTesting(batchId, ImportJobStatus.FAILED_PERMANENT);

    // Replay with fromCheckpoint = true (preserve checkpoint and counters)
    const replayCheckpointOk = await gateway.replayJob({ batchId, fromCheckpoint: true });
    expect(replayCheckpointOk).toBe(true);

    let status = await gateway.getJobStatus(batchId);
    expect(status?.status).toBe(ImportJobStatus.QUEUED);
    expect(status?.checkpoint).toBeDefined();
    expect(status?.processedRecords).toBe(20);

    // Set to COMPLETED then replay with fromCheckpoint = false (clears checkpoint and counters)
    gateway.setStatusForTesting(batchId, ImportJobStatus.COMPLETED);
    const replayFreshOk = await gateway.replayJob({ batchId, fromCheckpoint: false });
    expect(replayFreshOk).toBe(true);

    status = await gateway.getJobStatus(batchId);
    expect(status?.status).toBe(ImportJobStatus.QUEUED);
    expect(status?.checkpoint).toBeUndefined();
    expect(status?.processedRecords).toBe(0);
    expect(status?.failedRecords).toBe(0);
    expect(status?.progress).toBe(0);
  });

  describe('Lifecycle mutation methods (markJobRunning, markJobCompleted, markJobFailed)', () => {
    it('handles markJobRunning valid (QUEUED, RESUMING) and invalid transitions', async () => {
      const batchId = 'batch-running-test';
      await gateway.enqueueImportJob({
        batchId,
        targetDomain: ImportTargetDomain.UNIVERSITIES,
        sourceSystem: 'ADMIN_CONSOLE',
      });

      // QUEUED -> RUNNING
      const markQueuedToRunning = await gateway.markJobRunning(batchId);
      expect(markQueuedToRunning).toBe(true);

      let status = await gateway.getJobStatus(batchId);
      expect(status?.status).toBe(ImportJobStatus.RUNNING);

      // RUNNING -> RUNNING (invalid)
      const markRunningAgain = await gateway.markJobRunning(batchId);
      expect(markRunningAgain).toBe(false);

      // RESUMING -> RUNNING
      gateway.setStatusForTesting(batchId, ImportJobStatus.RESUMING);
      const markResumingToRunning = await gateway.markJobRunning(batchId);
      expect(markResumingToRunning).toBe(true);

      status = await gateway.getJobStatus(batchId);
      expect(status?.status).toBe(ImportJobStatus.RUNNING);

      // Non-existent batch
      expect(await gateway.markJobRunning('non-existent')).toBe(false);
    });

    it('handles markJobCompleted valid (RUNNING) and invalid transitions', async () => {
      const batchId = 'batch-completed-test';
      await gateway.enqueueImportJob({
        batchId,
        targetDomain: ImportTargetDomain.COURSES,
        sourceSystem: 'ADMIN_CONSOLE',
      });

      // QUEUED -> COMPLETED (invalid before RUNNING)
      expect(await gateway.markJobCompleted(batchId)).toBe(false);

      // Move to RUNNING then COMPLETED
      await gateway.markJobRunning(batchId);
      const markCompleted = await gateway.markJobCompleted(batchId);
      expect(markCompleted).toBe(true);

      const status = await gateway.getJobStatus(batchId);
      expect(status?.status).toBe(ImportJobStatus.COMPLETED);
      expect(status?.progress).toBe(100);

      // COMPLETED -> COMPLETED again (invalid)
      expect(await gateway.markJobCompleted(batchId)).toBe(false);

      // Non-existent batch
      expect(await gateway.markJobCompleted('non-existent')).toBe(false);
    });

    it('handles markJobFailed valid (RUNNING, FAILED_RETRYABLE) and invalid transitions', async () => {
      const batchId = 'batch-failed-test';
      await gateway.enqueueImportJob({
        batchId,
        targetDomain: ImportTargetDomain.MAJORS,
        sourceSystem: 'ADMIN_CONSOLE',
      });

      // QUEUED -> FAILED_PERMANENT (invalid directly via markJobFailed)
      expect(await gateway.markJobFailed(batchId, 'Direct error')).toBe(false);

      // RUNNING -> FAILED_PERMANENT
      await gateway.markJobRunning(batchId);
      const markFailed = await gateway.markJobFailed(batchId, 'Runtime explosion');
      expect(markFailed).toBe(true);

      let status = await gateway.getJobStatus(batchId);
      expect(status?.status).toBe(ImportJobStatus.FAILED_PERMANENT);
      expect(status?.lastError).toBe('Runtime explosion');

      // FAILED_RETRYABLE -> FAILED_PERMANENT
      gateway.setStatusForTesting(batchId, ImportJobStatus.FAILED_RETRYABLE);
      const markFailedRetryable = await gateway.markJobFailed(batchId, 'Retry exhausted');
      expect(markFailedRetryable).toBe(true);

      status = await gateway.getJobStatus(batchId);
      expect(status?.status).toBe(ImportJobStatus.FAILED_PERMANENT);
      expect(status?.lastError).toBe('Retry exhausted');

      // Non-existent batch
      expect(await gateway.markJobFailed('non-existent', 'Error')).toBe(false);
    });
  });
});

describe('InMemoryImportQueueGateway lease recovery hardening', () => {
  it('reclaims an expired RUNNING lease and rejects completion by the stale worker', async () => {
    const gateway = new InMemoryImportQueueGateway();
    const batchId = 'batch-expired-running';
    await gateway.enqueueImportJob({
      batchId,
      targetDomain: ImportTargetDomain.Generic,
      sourceSystem: 'TEST',
    });
    const expiredLease = {
      batchId,
      workerId: 'worker-old',
      attempt: 1,
      claimUntil: new Date('2026-08-25T10:00:00.000Z'),
    };
    gateway.setLeaseForTesting(batchId, expiredLease);

    const replacement = await gateway.claimNextJob({
      workerId: 'worker-new',
      leaseDurationMs: 30_000,
      now: new Date('2026-08-25T10:01:00.000Z'),
    });
    expect(replacement?.workerId).toBe('worker-new');
    expect(replacement?.attempt).toBe(1); // persisted job snapshot had not counted the synthetic test lease
    await expect(
      gateway.completeClaimedJob(expiredLease, new Date('2026-08-25T10:01:00.000Z')),
    ).resolves.toBe(false);
  });
});
