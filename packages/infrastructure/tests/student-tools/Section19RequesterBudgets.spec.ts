import { describe, expect, it, vi } from 'vitest';
import { PrismaAIPlatformRepository } from '../../src/ai-platform/PrismaAIPlatformRepository';
const reservation = {
  reservationKey: 'stx',
  requestsPerMinute: 100,
  dailyRequestLimit: 1000,
  requesterRequestsPerMinute: 10,
  requesterConcurrentLimit: 2,
  monthlyTokenLimit: 100000,
  monthlyCostLimit: 100,
  currency: 'USD',
  reservedTokens: 20,
  reservedCost: 1,
  requesterDailyCostLimit: 5,
  requesterMonthlyCostLimit: 10,
  requesterMonthlyTokenLimit: 100,
};
function harness(usage: unknown[] = [], pending: unknown[] = []) {
  const tx = {
    aIExecutionRecord: {
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve(data)),
    },
    aIUsageRecord: { findMany: vi.fn().mockResolvedValue(usage) },
    aIQuotaReservationRecord: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn() },
    $queryRawUnsafe: vi.fn().mockResolvedValue(pending),
  };
  const repo = new PrismaAIPlatformRepository({ $transaction: (fn: any) => fn(tx) });
  const execute = (budget = reservation) =>
    repo.createExecutionWithQuota(
      {
        publicId: 'ai_stx',
        consumerKey: 'phase18-student-tools',
        requesterReferenceId: 'student',
        idempotencyKeyHash: null,
      } as any,
      budget,
    );
  return { tx, execute };
}
describe('Section 19 P17-owned requester cost and token entitlement', () => {
  it('counts outstanding unknown charges against a new month before admission', async () => {
    const { execute, tx } = harness(
      [],
      [{ reservedTokens: 50, reservedCost: 10, currency: 'USD' }],
    );
    await expect(execute()).rejects.toThrow('AI_REQUESTER_MONTHLY_COST_EXCEEDED');
    expect(tx.aIExecutionRecord.create).not.toHaveBeenCalled();
    expect(tx.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.any(String),
      'RESERVED',
      'phase18-student-tools',
      'student',
    );
  });
  it('denies per-requester daily cost overflow before creating billable work', async () => {
    const { execute, tx } = harness([
      { inputTokens: 0, outputTokens: 0, cost: 5, currency: 'USD', createdAt: new Date() },
    ]);
    await expect(execute()).rejects.toThrow('AI_REQUESTER_DAILY_COST_EXCEEDED');
    expect(tx.aIExecutionRecord.create).not.toHaveBeenCalled();
  });
  it('denies requester monthly tokens including held reservations', async () => {
    const { execute } = harness([], [{ reservedTokens: 90, reservedCost: 0, currency: 'USD' }]);
    await expect(execute()).rejects.toThrow('AI_REQUESTER_MONTHLY_TOKEN_EXCEEDED');
  });
  it('never combines different currencies', async () => {
    const { execute } = harness([], [{ reservedTokens: 0, reservedCost: 1, currency: 'EUR' }]);
    await expect(execute()).rejects.toThrow('AI_COST_CURRENCY_MISMATCH');
  });
  it('fails closed on incomplete requester budget', async () => {
    const { execute } = harness();
    await expect(
      execute({ ...reservation, requesterDailyCostLimit: undefined } as any),
    ).rejects.toThrow('AI_REQUESTER_BUDGET_NOT_CONFIGURED');
  });
  it('retains aggregate consumer admission in addition to student entitlement', async () => {
    const { execute, tx } = harness();
    tx.aIExecutionRecord.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1000);
    await expect(execute()).rejects.toThrow('AI_DAILY_QUOTA_EXCEEDED');
  });
});
