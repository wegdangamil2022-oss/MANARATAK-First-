import { describe, expect, it, vi } from 'vitest';
import { FinancePlatformUseCases } from '../../../application/src/finance-platform/use-cases/FinancePlatformUseCases';
import { PrismaFinanceRepository } from '../../src/finance-platform/PrismaFinanceRepository';
const identity = {
  actorId: 'maker',
  correlationId: 'corr',
  idempotencyKey: 'intent',
  reason: 'Reviewed correction',
  expectedVersion: 1,
};
const deps = {
  paymentGateways: { get: () => null, list: () => [] },
  bankTransferGateways: { get: () => null, list: () => [] },
  fxRateProvider: { providerKey: 'mock', isConfigured: () => false },
  transferFeePolicy: { policyReference: 'NO_FEE', basisPoints: 0 },
  currencyReference: {
    resolveCurrency: async (code: string) => ({
      referenceId: code,
      currencyCode: code,
      scale: 2,
      active: true,
    }),
  },
};
const rate = {
  sourceCurrencyCode: 'USD',
  targetCurrencyCode: 'SAR',
  rateNumerator: '375',
  rateDenominator: '100',
  source: 'MANUAL_OVERRIDE' as const,
  effectiveFrom: new Date(),
  marginBasisPoints: 0,
};
function database(models: Record<string, unknown>) {
  const db: any = {
    ...models,
    auditRecord: { create: vi.fn() },
    transactionalOutboxRecord: { create: vi.fn() },
  };
  db.$transaction = async (fn: any) => fn(db);
  return db;
}
describe('Section 20 financial approval and rate boundaries', () => {
  it.each([new Date(NaN), new Date(0)])(
    'rejects invalid/expired requested approval expiry before persistence',
    async (expiry) => {
      const repository = { createApproval: vi.fn() };
      await expect(
        new FinancePlatformUseCases(repository as never, deps as never).createApproval(
          {
            actionType: 'MANUAL_LEDGER_REVERSE',
            targetReferenceId: 'journal',
            requiredApprovals: 2,
            expiresAt: expiry,
          },
          identity,
        ),
      ).rejects.toThrow('FINANCE_APPROVAL_EXPIRY_INVALID');
      expect(repository.createApproval).not.toHaveBeenCalled();
    },
  );
  it.each([
    { effectiveFrom: new Date(NaN) },
    { effectiveTo: new Date(NaN) },
    { marginBasisPoints: -1 },
    { marginBasisPoints: 10001 },
    { marginBasisPoints: 0.5 },
    { rateNumerator: '1'.repeat(31) },
    { rateDenominator: '01' },
  ])('denies invalid exact rate at both application and persistence (%j)', async (patch) => {
    const repository = { saveExchangeRate: vi.fn() };
    await expect(
      new FinancePlatformUseCases(repository as never, deps as never).saveExchangeRate(
        { ...rate, ...patch },
        identity,
      ),
    ).rejects.toThrow();
    expect(repository.saveExchangeRate).not.toHaveBeenCalled();
    const db = database({ financeExchangeRateRecord: { create: vi.fn() } });
    await expect(
      new PrismaFinanceRepository(db).saveExchangeRate({ ...rate, ...patch }, identity),
    ).rejects.toThrow();
    expect(db.financeExchangeRateRecord.create).not.toHaveBeenCalled();
    expect(db.auditRecord.create).not.toHaveBeenCalled();
  });
  it.each([null, new Date(NaN), new Date(0), new Date(Date.now() + 48 * 3600000)])(
    'denies unbounded or invalid approval creation (%s)',
    async (expiresAt) => {
      const db = database({ financeApprovalRecord: { create: vi.fn() } });
      await expect(
        new PrismaFinanceRepository(db).createApproval(
          {
            actionType: 'MANUAL_FX_OVERRIDE',
            payloadHash: 'digest',
            policyReference: 'FINANCE:MANUAL_FX_OVERRIDE:TWO_CHECKERS_V2',
            requiredApprovals: 2,
            status: 'PENDING',
            expiresAt,
          },
          identity,
        ),
      ).rejects.toThrow('FINANCE_APPROVAL_EXPIRY_INVALID');
      expect(db.financeApprovalRecord.create).not.toHaveBeenCalled();
    },
  );
  function activation() {
    const approval: any = {
      id: 'approval',
      actionType: 'MANUAL_FX_OVERRIDE',
      targetReferenceId: 'rate-public',
      makerId: 'maker',
      payloadHash: 'digest',
      policyReference: 'FINANCE:MANUAL_FX_OVERRIDE:TWO_CHECKERS_V2',
      requiredApprovals: 2,
      status: 'APPROVED',
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60000),
      decisions: [
        { decision: 'APPROVE', approverId: 'checker1' },
        { decision: 'APPROVE', approverId: 'checker2' },
      ],
    };
    const model = {
      findFirst: vi
        .fn()
        .mockResolvedValueOnce({
          ...rate,
          id: 'rate',
          makerId: 'maker',
          approved: false,
          version: 1,
        })
        .mockResolvedValueOnce(null),
      update: vi.fn().mockResolvedValue({ ...rate, id: 'rate', approved: true }),
    };
    const db = database({
      financeExchangeRateRecord: model,
      financeApprovalRecord: {
        findUnique: vi.fn().mockResolvedValue(approval),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    });
    const binding = {
      approvalId: approval.id,
      actionType: approval.actionType,
      targetReferenceId: approval.targetReferenceId,
      makerId: approval.makerId,
      payloadHash: approval.payloadHash,
      policyReference: approval.policyReference,
    };
    return {
      approval,
      db,
      run: () => new PrismaFinanceRepository(db).activateExchangeRate('rate', binding, identity),
    };
  }
  it.each([null, new Date(NaN), new Date(0)])(
    'does not consume an approval with invalid persisted expiry (%s)',
    async (expiry) => {
      const h = activation();
      h.approval.expiresAt = expiry;
      await expect(h.run()).rejects.toThrow('FINANCE_APPROVAL_EXPIRY_INVALID');
      expect(h.db.financeApprovalRecord.updateMany).not.toHaveBeenCalled();
      expect(h.db.financeExchangeRateRecord.update).not.toHaveBeenCalled();
    },
  );
  it.each(['duplicate', 'rejected', 'maker'])(
    'denies an invalid checker quorum: %s',
    async (mode) => {
      const h = activation();
      if (mode === 'duplicate') h.approval.decisions[1].approverId = 'checker1';
      if (mode === 'rejected')
        h.approval.decisions.push({ decision: 'REJECT', approverId: 'checker3' });
      if (mode === 'maker') h.approval.decisions[1].approverId = 'maker';
      await expect(h.run()).rejects.toThrow('FINANCE_APPROVAL_POLICY_MISMATCH');
      expect(h.db.financeApprovalRecord.updateMany).not.toHaveBeenCalled();
      expect(h.db.financeExchangeRateRecord.update).not.toHaveBeenCalled();
    },
  );
  it('accepts the exact live approval with two independent checkers', async () => {
    const h = activation();
    await expect(h.run()).resolves.toMatchObject({ approved: true });
    expect(h.db.financeApprovalRecord.updateMany).toHaveBeenCalledOnce();
    expect(h.db.financeExchangeRateRecord.update).toHaveBeenCalledOnce();
  });
});
