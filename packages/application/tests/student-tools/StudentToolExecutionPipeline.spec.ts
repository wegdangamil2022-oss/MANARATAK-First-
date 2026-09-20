import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { StudentToolExecutionStatus } from '@manaratak/domain';
import { OFFICIAL_STUDENT_TOOLS } from '../../src/student-tools/OfficialStudentToolRegistry';
import { StudentToolExecutionUseCases } from '../../src/student-tools/use-cases/StudentToolExecutionUseCases';

const gpa = OFFICIAL_STUDENT_TOOLS.find((tool) => tool.toolKey === 'gpa-calculator')!;
const university = OFFICIAL_STUDENT_TOOLS.find((tool) => tool.toolKey === 'university-comparison')!;
const hash = (value: string) => createHash('sha256').update(`phase18:${value}`).digest('hex');
const protectedResult = { ciphertext: 'cipher', iv: 'iv', authTag: 'tag', keyVersion: 'key-v1' };
const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'undefined';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
};
const resultDigest = (value: unknown) => createHash('sha256').update(stableStringify(value)).digest('hex');

function harness(tool = gpa) {
  let storedResult: unknown = { semesterGpa: 4, totalSemesterCredits: 3, qualityPoints: 12, scale: 4, courses: [] };
  const repository = {
    findByKey: vi.fn().mockResolvedValue(tool),
    findExecutionByIdempotency: vi.fn().mockResolvedValue(null),
    pruneExpiredTransientResults: vi.fn().mockResolvedValue(0),
    recordExecutionOrReplay: vi.fn().mockImplementation((value) => Promise.resolve({ record: value, created: true })),
    completeExecution: vi.fn().mockImplementation((_id, value) => Promise.resolve(value)),
    findExecution: vi.fn(),
    loadTransientResult: vi.fn().mockImplementation(() => Promise.resolve({
      resultDigest: resultDigest(storedResult),
      resultExpiresAt: new Date(Date.now() + 60_000),
      protectedResult,
    })),
  };
  const handler = {
    validate: vi.fn().mockImplementation((value) => value),
    execute: vi.fn().mockImplementation(() => Promise.resolve(storedResult)),
    validateOutput: vi.fn().mockImplementation((value) => value),
  };
  const handlers = { has: vi.fn().mockReturnValue(true), get: vi.fn().mockReturnValue(handler) };
  const rateLimit = { consume: vi.fn().mockResolvedValue({ allowed: true, remaining: 1, resetAt: Date.now() }) };
  const dependencyHealth = { status: vi.fn().mockResolvedValue('READY') };
  const saveGateway = { savePrivateResult: vi.fn().mockResolvedValue({ savedReference: 'saved-1' }) };
  const resultProtector = {
    status: vi.fn().mockReturnValue('READY'),
    protect: vi.fn().mockReturnValue(protectedResult),
    unprotect: vi.fn().mockImplementation(() => storedResult),
  };
  const useCases = new StudentToolExecutionUseCases(
    repository as any,
    handlers as any,
    rateLimit,
    dependencyHealth as any,
    resultProtector,
    saveGateway,
  );
  return { repository, handler, dependencyHealth, saveGateway, resultProtector, useCases, setStoredResult(value: unknown) { storedResult = value; } };
}

const anonymous = { consumerType: 'ANONYMOUS' as const, anonymousSessionReference: 'signed-session-id', trustedNetworkReference: '203.0.113.10' };

describe('Phase 18 governed execution pipeline', () => {
  it('blocks a required unavailable dependency before executing the handler', async () => {
    const { useCases, dependencyHealth, handler, repository } = harness(university);
    dependencyHealth.status.mockResolvedValue('NOT_CONFIGURED');
    await expect(useCases.execute(university.toolKey, { input: { universityIds: ['u1', 'u2'] }, ...anonymous })).rejects.toThrow('TOOL_DEPENDENCY_UNAVAILABLE');
    expect(handler.execute).not.toHaveBeenCalled();
    expect(repository.recordExecutionOrReplay).not.toHaveBeenCalled();
  });

  it('validates handler output before recording success', async () => {
    const { useCases, handler, repository } = harness();
    handler.validateOutput.mockImplementation(() => { throw new Error('TOOL_OUTPUT_INVALID'); });
    await expect(useCases.execute(gpa.toolKey, { input: { scale: 4, courses: [] }, ...anonymous })).rejects.toThrow('TOOL_OUTPUT_INVALID');
    expect(repository.completeExecution).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ status: StudentToolExecutionStatus.FAILED, errorCode: 'TOOL_OUTPUT_INVALID' }));
  });

  it('returns a receipt only to the requester that created it', async () => {
    const { useCases, repository } = harness();
    repository.findExecution.mockResolvedValue({ executionId: 'stx_private', consumerType: 'AUTHENTICATED_STUDENT', studentReferenceHash: hash('student-owner'), anonymousSessionHash: null });
    await expect(useCases.findExecutionForRequester('stx_private', { consumerType: 'AUTHENTICATED_STUDENT', authenticatedStudentReference: 'student-attacker' })).resolves.toBeNull();
    await expect(useCases.findExecutionForRequester('stx_private', { consumerType: 'AUTHENTICATED_STUDENT', authenticatedStudentReference: 'student-owner' })).resolves.toEqual(expect.objectContaining({ executionId: 'stx_private' }));
  });

  it('saves only the server-recovered result for the authenticated owner', async () => {
    const { useCases, repository, saveGateway, setStoredResult } = harness();
    const result = { semesterGpa: 4, totalSemesterCredits: 3, qualityPoints: 12, scale: 4, courses: [] };
    setStoredResult(result);
    const digest = resultDigest(result);
    repository.findExecution.mockResolvedValue({ executionId: 'stx_private', toolKey: 'gpa-calculator', status: StudentToolExecutionStatus.COMPLETED, consumerType: 'AUTHENTICATED_STUDENT', studentReferenceHash: hash('student-owner'), resultDigest: digest });
    repository.loadTransientResult.mockResolvedValue({ resultDigest: digest, resultExpiresAt: new Date(Date.now() + 60_000), protectedResult });
    await expect(useCases.saveExecutionForStudent('stx_private', 'student-attacker')).rejects.toThrow('TOOL_EXECUTION_NOT_FOUND');
    await expect(useCases.saveExecutionForStudent('stx_private', 'student-owner')).resolves.toEqual({ savedReference: 'saved-1' });
    expect(saveGateway.savePrivateResult).toHaveBeenCalledWith(expect.objectContaining({ studentReference: 'student-owner', executionId: 'stx_private', result }));
  });

  it('replays a completed concurrent idempotent winner with its protected transient result', async () => {
    const { useCases, repository } = harness();
    repository.findExecutionByIdempotency.mockResolvedValue({
      executionId: 'stx_winner', toolKey: 'gpa-calculator', toolVersion: '1.0.0',
      status: StudentToolExecutionStatus.COMPLETED, consumerType: 'ANONYMOUS', anonymousSessionHash: hash('signed-session-id'),
      startedAt: new Date(), completedAt: new Date(), resultDigest: null,
      safeUsageMetadata: { requestFingerprint: resultDigest({ toolKey: 'gpa-calculator', toolVersion: '1.0.0', consumerType: 'ANONYMOUS', input: {}, locale: 'ar' }) },
    });
    await expect(useCases.execute('gpa-calculator', { input: {}, idempotencyKey: 'same', ...anonymous }))
      .resolves.toEqual(expect.objectContaining({ executionId: 'stx_winner', warnings: ['IDEMPOTENT_REPLAY'] }));
  });
});
