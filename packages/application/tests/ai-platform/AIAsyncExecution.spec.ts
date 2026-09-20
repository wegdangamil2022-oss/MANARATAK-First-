import { describe, expect, it, vi } from 'vitest';
import { AIExecutionOrchestrator } from '../../src/ai-platform/use-cases/AIPlatformUseCases';
import { AIExecutionStatus, AIRequestPurpose } from '@manaratak/domain';

const request = {
  purpose: AIRequestPurpose.TOOL_ASSISTANCE,
  promptKey: 'student-letter',
  capabilityKey: 'student.letter',
  consumerKey: 'phase18-student-tools',
  requesterReferenceId: 'student-1',
  sourceDomain: 'Phase18',
  input: 'private input',
};

function repository() {
  return {
    find: vi.fn().mockImplementation((resource: string) => Promise.resolve(resource === 'consumers'
      ? { status: 'ACTIVE', allowAsyncJobs: true, allowedCapabilities: ['student.letter'] }
      : { status: 'ACTIVE' })),
    createAsyncJob: vi.fn().mockImplementation((value) => Promise.resolve({ id: '1', createdAt: new Date(), updatedAt: new Date(), ...value })),
    claimAsyncJob: vi.fn(), updateAsyncJob: vi.fn(), findAsyncJob: vi.fn(),
  };
}

describe('Phase 17 durable async execution', () => {
  it('fails truthfully when payload protection is not configured', async () => {
    const useCases = new AIExecutionOrchestrator(repository() as any, { get: vi.fn(), list: vi.fn() } as any, { status: () => 'NOT_CONFIGURED', protect: vi.fn(), unprotect: vi.fn() });
    await expect(useCases.submitAsync(request)).rejects.toThrow('AI_ASYNC_QUEUE_NOT_CONFIGURED');
  });

  it('persists only the protected payload and governed job identity', async () => {
    const repo = repository();
    const protector = { status: () => 'READY' as const, protect: vi.fn().mockReturnValue({ ciphertext: 'cipher', iv: 'iv', authTag: 'tag', keyVersion: 'v1' }), unprotect: vi.fn() };
    const useCases = new AIExecutionOrchestrator(repo as any, { get: vi.fn(), list: vi.fn() } as any, protector);
    await useCases.submitAsync(request);
    expect(repo.createAsyncJob).toHaveBeenCalledWith(expect.objectContaining({ payloadCiphertext: 'cipher', requesterReferenceId: 'student-1', status: 'QUEUED' }));
    expect(JSON.stringify(repo.createAsyncJob.mock.calls[0][0])).not.toContain('private input');
  });

  it('moves exhausted work to dead letter without returning fake success', async () => {
    const repo = repository();
    repo.claimAsyncJob.mockResolvedValue({ ...request, publicId: 'aij_1', requesterReferenceId: 'student-1', consumerKey: request.consumerKey, capabilityKey: request.capabilityKey, status: 'RUNNING', payloadCiphertext: 'cipher', payloadIv: 'iv', payloadAuthTag: 'tag', payloadKeyVersion: 'v1', attempts: 3, maxAttempts: 3 });
    repo.updateAsyncJob.mockImplementation((_id, value) => Promise.resolve(value));
    const protector = { status: () => 'READY' as const, protect: vi.fn(), unprotect: vi.fn().mockReturnValue(request) };
    const useCases = new AIExecutionOrchestrator(repo as any, { get: vi.fn(), list: vi.fn() } as any, protector);
    vi.spyOn(useCases, 'execute').mockResolvedValue({ executionPublicId: 'ai_failed', traceId: 't', status: AIExecutionStatus.FAILED, errorCode: 'AI_PROVIDER_UNAVAILABLE', usage: { inputTokens: 0, outputTokens: 0 } });
    await useCases.processAsync('aij_1', 'worker-1');
    expect(repo.updateAsyncJob).toHaveBeenCalledWith('aij_1', expect.objectContaining({ status: 'DEAD_LETTER', errorCode: 'AI_PROVIDER_UNAVAILABLE' }));
  });
});
