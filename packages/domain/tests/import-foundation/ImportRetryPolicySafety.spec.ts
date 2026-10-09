import { describe, expect, it } from 'vitest';
import { ImportRetryPolicy } from '../../src/import-foundation/value-objects/ImportRetryPolicy';

const valid = { maxAttempts: 3, dlqAfterAttempts: 3, backoffStrategy: 'exponential' as const,
  initialDelayMs: 100, maxDelayMs: 1000, retryableErrorCodes: ['TRANSIENT'] };
describe('Import retry policy safety', () => {
  it.each([
    { maxAttempts: NaN }, { maxAttempts: Infinity }, { maxAttempts: 1.5 },
    { dlqAfterAttempts: 0 }, { maxDelayMs: Infinity }, { initialDelayMs: NaN },
    { retryableErrorCodes: ['secret=value'] }, { backoffStrategy: 'unknown' },
  ])('rejects malformed retry policy %j', overrides => {
    expect(() => ImportRetryPolicy.create({ ...valid, ...overrides } as any)).toThrow();
  });
  it('does not let mutable input or serialization alter the retry classification', () => {
    const codes = ['TRANSIENT'];
    const policy = ImportRetryPolicy.create({ ...valid, retryableErrorCodes: codes });
    codes.push('PERMANENT'); policy.toJSON().retryableErrorCodes.push('OTHER');
    expect(policy.retryableErrorCodes).toEqual(['TRANSIENT']);
  });
});
