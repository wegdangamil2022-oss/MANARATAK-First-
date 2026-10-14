import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StudentToolExecutionUseCases } from '../../src/student-tools/use-cases/StudentToolExecutionUseCases';

const hash = (value: string) => createHash('sha256').update(`phase18:${value}`).digest('hex');
const digest = createHash('sha256').update('{"answer":"private"}').digest('hex');
function harness(anonymous = false) {
  const expiry = new Date(Date.now() + 1000);
  const record = {
    executionId: 'stx_result',
    toolKey: 'gpa-calculator',
    toolVersion: '1.1.0',
    status: 'COMPLETED',
    consumerType: anonymous ? 'ANONYMOUS' : 'AUTHENTICATED_STUDENT',
    studentReferenceHash: anonymous ? null : hash('owner'),
    anonymousSessionHash: anonymous ? hash('session') : null,
    resultDigest: digest,
    resultExpiresAt: expiry,
    safeUsageMetadata: { handlerContractVersion: '2:2' },
  };
  const stored = { resultDigest: digest, resultExpiresAt: expiry, protectedResult: {} };
  const repository = {
    findExecution: vi.fn().mockResolvedValue(record),
    loadTransientResult: vi.fn().mockResolvedValue(stored),
  };
  const protector = {
    unprotect: vi.fn(() => ({
      executionId: record.executionId,
      toolVersion: record.toolVersion,
      ownerHash: hash(anonymous ? 'session' : 'owner'),
      expiresAt: expiry.toISOString(),
      result: { answer: 'private' },
    })),
  };
  const handler = { validateOutput: vi.fn((value: unknown) => value) };
  const save = { savePrivateResult: vi.fn().mockResolvedValue({ savedReference: 'saved' }) };
  const useCases = new StudentToolExecutionUseCases(
    repository as never,
    { getVersion: () => handler } as never,
    {} as never,
    {} as never,
    protector as never,
    save,
  );
  const adopt = () =>
    anonymous
      ? useCases.claimAnonymousExecutionForStudent(record.executionId, 'session', 'owner')
      : useCases.saveExecutionForStudent(record.executionId, 'owner');
  return { record, stored, repository, protector, handler, save, adopt };
}
afterEach(() => vi.useRealTimers());
describe('Section 19 transient result custody', () => {
  for (const anonymous of [false, true]) {
    it(`accepts a live bound ${anonymous ? 'anonymous claim' : 'student save'}`, async () => {
      const h = harness(anonymous);
      await expect(h.adopt()).resolves.toMatchObject({ savedReference: 'saved' });
      expect(h.save.savePrivateResult).toHaveBeenCalledOnce();
    });
    for (const expiry of [new Date(0), new Date(NaN)]) {
      it(`denies expired/invalid custody before decrypting (anonymous=${anonymous}, expiry=${String(expiry)})`, async () => {
        const h = harness(anonymous);
        h.stored.resultExpiresAt = expiry;
        await expect(h.adopt()).rejects.toThrow('TOOL_IDEMPOTENT_RESULT_EXPIRED');
        expect(h.protector.unprotect).not.toHaveBeenCalled();
        expect(h.save.savePrivateResult).not.toHaveBeenCalled();
      });
    }
    it(`denies TTL elapsed during validation (anonymous=${anonymous})`, async () => {
      vi.useFakeTimers();
      const h = harness(anonymous);
      h.handler.validateOutput.mockImplementation((value) => {
        vi.setSystemTime(h.stored.resultExpiresAt);
        return value;
      });
      await expect(h.adopt()).rejects.toThrow('TOOL_IDEMPOTENT_RESULT_EXPIRED');
      expect(h.save.savePrivateResult).not.toHaveBeenCalled();
    });
  }
  it('denies changed receipt expiry before decryption', async () => {
    const h = harness();
    h.record.resultExpiresAt = new Date(Date.now() + 5000);
    await expect(h.adopt()).rejects.toThrow('TOOL_RESULT_BINDING_INVALID');
    expect(h.protector.unprotect).not.toHaveBeenCalled();
  });
  it('denies a changed result digest without saving', async () => {
    const h = harness();
    h.record.resultDigest = 'different';
    await expect(h.adopt()).rejects.toThrow('TOOL_RESULT_PROVENANCE_MISMATCH');
    expect(h.save.savePrivateResult).not.toHaveBeenCalled();
  });
  it('does not fetch private result custody for a foreign owner', async () => {
    const h = harness();
    h.record.studentReferenceHash = hash('another-owner');
    await expect(h.adopt()).rejects.toThrow('TOOL_EXECUTION_NOT_FOUND');
    expect(h.repository.loadTransientResult).not.toHaveBeenCalled();
  });
});
