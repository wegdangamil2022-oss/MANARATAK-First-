import { describe, expect, it, vi } from 'vitest';
import { ImportRetryPolicy } from '@manaratak/domain';
import { IImportQueueGateway, ImportWorkerProtocol } from '../../src';

const policy = ImportRetryPolicy.create({
  maxAttempts: 3,
  dlqAfterAttempts: 3,
  backoffStrategy: 'exponential',
  initialDelayMs: 100,
  maxDelayMs: 1_000,
  retryableErrorCodes: ['TRANSIENT'],
});

function queue(overrides: Partial<IImportQueueGateway> = {}): IImportQueueGateway {
  return {
    enqueueImportJob: vi.fn(),
    getJobStatus: vi.fn(),
    pauseJob: vi.fn(),
    resumeJob: vi.fn(),
    cancelJob: vi.fn(),
    replayJob: vi.fn(),
    recordCheckpoint: vi.fn(),
    moveToDeadLetter: vi.fn(),
    markJobRunning: vi.fn(),
    markJobCompleted: vi.fn(),
    markJobFailed: vi.fn(),
    claimNextJob: vi.fn().mockResolvedValue(null),
    heartbeat: vi.fn(),
    completeClaimedJob: vi.fn(),
    failClaimedJob: vi.fn(),
    ...overrides,
  } as IImportQueueGateway;
}

describe('ImportWorkerProtocol', () => {
  it('returns IDLE without invoking a processor when no durable claim is available', async () => {
    const processor = vi.fn();
    await expect(
      new ImportWorkerProtocol(queue(), policy).runOne('worker-1', processor),
    ).resolves.toBe('IDLE');
    expect(processor).not.toHaveBeenCalled();
  });

  it('heartbeats and completes only the claimed lease', async () => {
    const lease = {
      batchId: 'batch-1',
      workerId: 'worker-1',
      attempt: 1,
      claimUntil: new Date(Date.now() + 30_000),
    };
    const renewed = { ...lease, claimUntil: new Date(Date.now() + 60_000) };
    const gateway = queue({
      claimNextJob: vi.fn().mockResolvedValue(lease),
      heartbeat: vi.fn().mockResolvedValue(renewed),
      completeClaimedJob: vi.fn().mockResolvedValue(true),
    });
    const result = await new ImportWorkerProtocol(gateway, policy).runOne(
      'worker-1',
      async (_lease, heartbeat) => heartbeat(),
    );
    expect(result).toBe('COMPLETED');
    expect(gateway.completeClaimedJob).toHaveBeenCalledWith(renewed);
  });

  it('delegates retry versus DLQ decisions to the durable gateway', async () => {
    const lease = {
      batchId: 'batch-1',
      workerId: 'worker-1',
      attempt: 1,
      claimUntil: new Date(Date.now() + 30_000),
    };
    const gateway = queue({
      claimNextJob: vi.fn().mockResolvedValue(lease),
      failClaimedJob: vi.fn().mockResolvedValue('RETRY_SCHEDULED'),
    });
    const error = Object.assign(new Error('temporary failure'), { code: 'TRANSIENT' });
    await expect(
      new ImportWorkerProtocol(gateway, policy).runOne('worker-1', async () => {
        throw error;
      }),
    ).resolves.toBe('RETRY_SCHEDULED');
    expect(gateway.failClaimedJob).toHaveBeenCalledWith(
      expect.objectContaining({ lease, errorCode: 'TRANSIENT', retryPolicy: policy }),
    );
  });
});
