import { describe, expect, it, vi } from 'vitest';
import { AIExecutionOrchestrator } from '../../src/ai-platform/use-cases/AIPlatformUseCases';
import { AIExecutionStatus, AIRequestPurpose } from '@absheer/domain';

const request = {
  purpose: AIRequestPurpose.TOOL_ASSISTANCE,
  promptKey: 'student-letter',
  capabilityKey: 'student.letter',
  consumerKey: 'phase18-student-tools',
  requesterReferenceId: 'student-1',
  sourceDomain: 'Phase18',
  input: 'private input',
  idempotencyKey: 'request-intent-1',
};

function repository() {
  return {
    find: vi
      .fn()
      .mockImplementation((resource: string) =>
        Promise.resolve(
          resource === 'consumers'
            ? { status: 'ACTIVE', allowAsyncJobs: true, allowedCapabilities: ['student.letter'] }
            : { status: 'ACTIVE' },
        ),
      ),
    createAsyncJob: vi
      .fn()
      .mockImplementation((value) =>
        Promise.resolve({ id: '1', createdAt: new Date(), updatedAt: new Date(), ...value }),
      ),
    claimAsyncJob: vi.fn(),
    updateAsyncJob: vi.fn(),
    findAsyncJob: vi.fn(),
  };
}

describe('Phase 17 durable async execution', () => {
  it('fails truthfully when payload protection is not configured', async () => {
    const useCases = new AIExecutionOrchestrator(
      repository() as any,
      { get: vi.fn(), list: vi.fn() } as any,
      { status: () => 'NOT_CONFIGURED', protect: vi.fn(), unprotect: vi.fn() },
    );
    await expect(useCases.submitAsync(request)).rejects.toThrow('AI_ASYNC_QUEUE_NOT_CONFIGURED');
  });

  it('persists only the protected payload and governed job identity', async () => {
    const repo = repository();
    const protector = {
      status: () => 'READY' as const,
      protect: vi
        .fn()
        .mockReturnValue({ ciphertext: 'cipher', iv: 'iv', authTag: 'tag', keyVersion: 'v1' }),
      unprotect: vi.fn(),
    };
    const useCases = new AIExecutionOrchestrator(
      repo as any,
      { get: vi.fn(), list: vi.fn() } as any,
      protector,
    );
    vi.spyOn(useCases, 'execute').mockResolvedValue({
      executionPublicId: 'ai_reserved',
      traceId: 'trace',
      status: AIExecutionStatus.QUEUED,
      usage: { inputTokens: 0, outputTokens: 0 },
    });
    await useCases.submitAsync(request);
    expect(repo.createAsyncJob).toHaveBeenCalledWith(
      expect.objectContaining({
        payloadCiphertext: 'cipher',
        requesterReferenceId: 'student-1',
        status: 'QUEUED',
      }),
    );
    expect(JSON.stringify(repo.createAsyncJob.mock.calls[0][0])).not.toContain('private input');
  });

  it('moves exhausted work to dead letter without returning fake success', async () => {
    const repo = repository();
    repo.claimAsyncJob.mockResolvedValue({
      ...request,
      publicId: 'aij_1',
      requesterReferenceId: 'student-1',
      consumerKey: request.consumerKey,
      capabilityKey: request.capabilityKey,
      status: 'RUNNING',
      payloadCiphertext: 'cipher',
      payloadIv: 'iv',
      payloadAuthTag: 'tag',
      payloadKeyVersion: 'v1',
      attempts: 3,
      maxAttempts: 3,
    });
    repo.updateAsyncJob.mockImplementation((_id, value) => Promise.resolve(value));
    const protector = {
      status: () => 'READY' as const,
      protect: vi.fn(),
      unprotect: vi.fn().mockReturnValue(request),
    };
    const useCases = new AIExecutionOrchestrator(
      repo as any,
      { get: vi.fn(), list: vi.fn() } as any,
      protector,
    );
    vi.spyOn(useCases, 'execute').mockResolvedValue({
      executionPublicId: 'ai_failed',
      traceId: 't',
      status: AIExecutionStatus.FAILED,
      errorCode: 'AI_PROVIDER_UNAVAILABLE',
      usage: { inputTokens: 0, outputTokens: 0 },
    });
    await useCases.processAsync('aij_1', 'worker-1');
    expect(repo.updateAsyncJob).toHaveBeenCalledWith(
      'aij_1',
      expect.objectContaining({ status: 'DEAD_LETTER', errorCode: 'AI_PROVIDER_UNAVAILABLE' }),
      expect.objectContaining({ workerId: 'worker-1' }),
    );
  });

  it('keeps a stable execution idempotency identity when async leases are reclaimed', async () => {
    const repo = repository();
    repo.claimAsyncJob.mockResolvedValue({
      publicId: 'aij_1',
      requesterReferenceId: request.requesterReferenceId,
      consumerKey: request.consumerKey,
      capabilityKey: request.capabilityKey,
      status: 'RUNNING',
      lockedAt: new Date('2026-10-11T12:00:00Z'),
      payloadCiphertext: 'cipher',
      payloadIv: 'iv',
      payloadAuthTag: 'tag',
      payloadKeyVersion: 'v1',
      attempts: 1,
      maxAttempts: 3,
    });
    repo.updateAsyncJob.mockImplementation((_id, patch) => Promise.resolve(patch));
    const protector = {
      status: () => 'READY' as const,
      protect: vi.fn(),
      unprotect: vi.fn().mockReturnValue(request),
    };
    const useCases = new AIExecutionOrchestrator(
      repo as any,
      { get: vi.fn(), list: vi.fn() } as any,
      protector,
    );
    const execute = vi.spyOn(useCases, 'execute').mockResolvedValue({
      executionPublicId: 'ai_1',
      traceId: 'trace',
      status: AIExecutionStatus.COMPLETED,
      usage: { inputTokens: 10, outputTokens: 5 },
    });
    await useCases.processAsync('aij_1', 'worker-1');
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: 'async-job:aij_1' }),
      { asyncJobPublicId: 'aij_1' },
    );
    expect(repo.updateAsyncJob).toHaveBeenCalledWith(
      'aij_1',
      expect.objectContaining({ status: 'COMPLETED', executionPublicId: 'ai_1' }),
      expect.objectContaining({ workerId: 'worker-1' }),
    );
  });

  it('consumes the database-selected claimable queue instead of skipping due work', async () => {
    const repo = repository();
    (repo as any).listClaimableAsyncJobs = vi.fn().mockResolvedValue([{ publicId: 'older-due' }]);
    const useCases = new AIExecutionOrchestrator(
      repo as any,
      { get: vi.fn(), list: vi.fn() } as any,
    );
    const process = vi.spyOn(useCases, 'processAsync').mockResolvedValue({} as any);
    expect(await useCases.processDueAsyncJobs('worker-1', 4)).toEqual({ scanned: 1, processed: 1 });
    expect((repo as any).listClaimableAsyncJobs).toHaveBeenCalledWith(4);
    expect(process).toHaveBeenCalledWith('older-due', 'worker-1');
  });

  it('returns only a requester-owned, valid encrypted result artifact', async () => {
    const repo = repository();
    repo.findAsyncJob.mockResolvedValue({
      publicId: 'aij_private',
      status: 'COMPLETED',
      requesterReferenceId: 'student-1',
      executionPublicId: 'ai_done',
    });
    (repo as any).findExecution = vi.fn().mockResolvedValue({
      publicId: 'ai_done',
      status:AIExecutionStatus.COMPLETED,
      requesterReferenceId: 'student-1',
      metadata: {
        asyncResult: {
          ciphertext: 'encrypted',
          iv: 'iv',
          authTag: 'tag',
          keyVersion: 'v1',
          jobPublicId: 'aij_private',
          requesterReferenceId: 'student-1',
          expiresAt: '2099-12-31T23:59:59Z',
        },
      },
    });
    const protector = {
      status: () => 'READY' as const,
      protect: vi.fn(),
      unprotect: vi
        .fn()
        .mockReturnValue({
          result: 'Sensitive final answer',
          jobPublicId: 'aij_private',
          requesterReferenceId: 'student-1',
          expiresAt: '2099-12-31T23:59:59Z',
        }),
    };
    const useCases = new AIExecutionOrchestrator(
      repo as any,
      { get: vi.fn(), list: vi.fn() } as any,
      protector,
    );
    expect(await useCases.findAsyncResultForRequester('aij_private', 'student-2')).toBeNull();
    expect(protector.unprotect).not.toHaveBeenCalled();
    const owned = await useCases.findAsyncResultForRequester('aij_private', 'student-1');
    expect(owned).toEqual({
      publicId: 'aij_private',
      executionPublicId: 'ai_done',
      result: 'Sensitive final answer',
      expiresAt: '2099-12-31T23:59:59Z',
    });
    expect(protector.unprotect).toHaveBeenCalledWith(
      expect.objectContaining({ ciphertext: 'encrypted' }),
    );
  });

  it('denies expired encrypted results without attempting decryption', async () => {
    const repo = repository();
    repo.findAsyncJob.mockResolvedValue({
      publicId: 'aij_old',
      status: 'COMPLETED',
      requesterReferenceId: 'student-1',
      executionPublicId: 'ai_old',
    });
    (repo as any).findExecution = vi.fn().mockResolvedValue({
      publicId: 'ai_old',
      status:AIExecutionStatus.COMPLETED,
      requesterReferenceId: 'student-1',
      metadata: {
        asyncResult: {
          ciphertext: 'encrypted',
          iv: 'iv',
          authTag: 'tag',
          keyVersion: 'v1',
          jobPublicId: 'aij_old',
          requesterReferenceId: 'student-1',
          expiresAt: '2020-01-01T00:00:00Z',
        },
      },
    });
    const protector = { status: () => 'READY' as const, protect: vi.fn(), unprotect: vi.fn() };
    const useCases = new AIExecutionOrchestrator(
      repo as any,
      { get: vi.fn(), list: vi.fn() } as any,
      protector,
    );
    await expect(useCases.findAsyncResultForRequester('aij_old', 'student-1')).rejects.toThrow(
      'AI_ASYNC_RESULT_EXPIRED',
    );
    expect(protector.unprotect).not.toHaveBeenCalled();
  });

  it('requests in-flight abort without claiming billing stopped or marking completion', async () => {
    const repo = repository();
    (repo as any).findExecution = vi
      .fn()
      .mockResolvedValue({
        publicId: 'ai_running',
        requesterReferenceId: 'student-1',
        status: 'RUNNING',
      });
    (repo as any).requestExecutionCancellation = vi
      .fn()
      .mockResolvedValue({ status: 'RUNNING', metadata: { cancellationRequestedAt: 'now' } });
    const useCases = new AIExecutionOrchestrator(
      repo as any,
      { get: vi.fn(), list: vi.fn() } as any,
    );
    expect(await useCases.cancel('ai_running', 'student-1')).toEqual(
      expect.objectContaining({ status: 'RUNNING' }),
    );
    expect((repo as any).requestExecutionCancellation).toHaveBeenCalledWith(
      'ai_running',
      'student-1',
    );
    expect(repo.updateAsyncJob).not.toHaveBeenCalled();
  });

  it('replays an already queued request with the same requester-scoped idempotency key', async () => {
    const repo = repository();
    const stored = {
      publicId: 'initial-placeholder',
      requesterReferenceId: 'student-1',
      payloadCiphertext: 'cipher',
      payloadIv: 'iv',
      payloadAuthTag: 'tag',
      payloadKeyVersion: 'v1',
    };
    const protector = {
      status: () => 'READY' as const,
      protect: vi.fn().mockReturnValue({
        ciphertext: 'cipher',
        iv: 'iv',
        authTag: 'tag',
        keyVersion: 'v1',
      }),
      unprotect: vi.fn().mockReturnValue({ ...request, idempotencyKey: 'retry-1' }),
    };
    const first = { ...request, idempotencyKey: 'retry-1' };
    repo.findAsyncJob.mockResolvedValueOnce(null).mockResolvedValueOnce(stored);
    const useCases = new AIExecutionOrchestrator(
      repo as any,
      { get: vi.fn(), list: vi.fn() } as any,
      protector,
    );
    vi.spyOn(useCases, 'execute').mockResolvedValue({
      executionPublicId: 'ai_reserved',
      traceId: 'trace',
      status: AIExecutionStatus.QUEUED,
      usage: { inputTokens: 0, outputTokens: 0 },
    });
    const created = await useCases.submitAsync(first);
    expect(created.publicId).toMatch(/^aij_[a-f0-9]{64}$/);
    expect(repo.createAsyncJob).toHaveBeenCalledTimes(1);
    const repeated = await useCases.submitAsync(first);
    expect(repeated).toBe(stored);
    expect(repo.createAsyncJob).toHaveBeenCalledTimes(1);
  });

  it('rejects a changed request reusing an idempotency key before queue admission', async () => {
    const repo = repository();
    const protector = {
      status: () => 'READY' as const,
      protect: vi.fn(),
      unprotect: vi.fn().mockReturnValue({ ...request, idempotencyKey: 'retry-1' }),
    };
    repo.findAsyncJob.mockResolvedValue({
      publicId: 'aij_existing',
      payloadCiphertext: 'cipher',
      payloadIv: 'iv',
      payloadAuthTag: 'tag',
      payloadKeyVersion: 'v1',
    });
    const useCases = new AIExecutionOrchestrator(
      repo as any,
      { get: vi.fn(), list: vi.fn() } as any,
      protector,
    );
    await expect(
      useCases.submitAsync({
        ...request,
        idempotencyKey: 'retry-1',
        input: 'different private input',
      }),
    ).rejects.toThrow('AI_ASYNC_IDEMPOTENCY_KEY_REUSED');
    expect(repo.createAsyncJob).not.toHaveBeenCalled();
    expect(protector.protect).not.toHaveBeenCalled();
  });

  it('resolves concurrent duplicate insert conflicts to the original durable job', async () => {
    const repo = repository();
    const previous = {
      publicId: 'aij_existing',
      payloadCiphertext: 'cipher',
      payloadIv: 'iv',
      payloadAuthTag: 'tag',
      payloadKeyVersion: 'v1',
    };
    repo.findAsyncJob.mockResolvedValueOnce(null).mockResolvedValueOnce(previous);
    repo.createAsyncJob.mockRejectedValue({ code: 'P2002' });
    const input = { ...request, idempotencyKey: 'retry-race' };
    const protector = {
      status: () => 'READY' as const,
      protect: vi.fn().mockReturnValue({
        ciphertext: 'cipher',
        iv: 'iv',
        authTag: 'tag',
        keyVersion: 'v1',
      }),
      unprotect: vi.fn().mockReturnValue(input),
    };
    const useCases = new AIExecutionOrchestrator(
      repo as any,
      { get: vi.fn(), list: vi.fn() } as any,
      protector,
    );
    vi.spyOn(useCases, 'execute').mockResolvedValue({
      executionPublicId: 'ai_reserved',
      traceId: 'trace',
      status: AIExecutionStatus.QUEUED,
      usage: { inputTokens: 0, outputTokens: 0 },
    });
    expect(await useCases.submitAsync(input)).toBe(previous);
    expect(repo.createAsyncJob).toHaveBeenCalledOnce();
  });
});
