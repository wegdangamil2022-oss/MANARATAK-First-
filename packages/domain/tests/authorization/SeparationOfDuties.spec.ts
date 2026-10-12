import { describe, it, expect } from 'vitest';
import {
  validateDutyPolicy,
  dutyConflicts,
  assertDutyUnion,
  validateDutyException,
} from '../../src/authorization/services/SeparationOfDuties';
const policy = {
  pairs: [
    {
      id: 'invoice_approve',
      first: 'admin:finance:invoice:manage',
      second: 'admin:finance:approval:decide',
      description: 'Independent approval',
    },
  ],
};
describe('configured separation of duties', () => {
  it('does not invent forbidden pairs', () =>
    expect(validateDutyPolicy({ pairs: [] })).toEqual({ pairs: [] }));
  it('rejects duplicate reversed pairs', () =>
    expect(() =>
      validateDutyPolicy({
        pairs: [
          ...policy.pairs,
          {
            ...policy.pairs[0],
            id: 'other',
            first: policy.pairs[0].second,
            second: policy.pairs[0].first,
          },
        ],
      }),
    ).toThrow('DUTY_POLICY_INVALID'));
  it('detects a union across different permissions', () =>
    expect(() => assertDutyUnion([policy.pairs[0].first, policy.pairs[0].second], policy)).toThrow(
      'AUTHORIZATION_DUTY_CONFLICT',
    ));
  it.each(['*', 'admin:*', 'admin:finance:*'])('does not silently exempt wildcard %s', (wildcard) =>
    expect(dutyConflicts([wildcard], policy)).toHaveLength(1),
  );
  it('allows only a named approved pair', () => {
    expect(() =>
      assertDutyUnion([policy.pairs[0].first, policy.pairs[0].second], policy, ['another']),
    ).toThrow();
    expect(() => assertDutyUnion(['admin:*'], policy, ['invoice_approve'])).not.toThrow();
  });
  it.each(['same_actor', 'expired', 'too_long', 'duplicates'])(
    'rejects invalid exception %s',
    (caseName) => {
      const now = new Date('2026-10-12T10:00:00Z');
      const input = {
        id: 'x',
        principalId: 'p',
        pairIds: ['invoice_approve'],
        policyRevision: 'revision',
        startsAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 3600000).toISOString(),
        reason: 'Independent operational exception',
        changeTicket: 'CHG-123',
        requestedBy: 'a',
        approvedBy: 'b',
      };
      if (caseName === 'same_actor') input.approvedBy = 'a';
      if (caseName === 'expired') input.expiresAt = new Date(now.getTime() - 1).toISOString();
      if (caseName === 'too_long')
        input.expiresAt = new Date(now.getTime() + 25 * 3600000).toISOString();
      if (caseName === 'duplicates') input.pairIds.push('invoice_approve');
      expect(() => validateDutyException(input, now)).toThrow('DUTY_EXCEPTION_INVALID');
    },
  );
});
