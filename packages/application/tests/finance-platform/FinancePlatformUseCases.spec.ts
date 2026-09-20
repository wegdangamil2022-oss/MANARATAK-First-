import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { FinancePlatformUseCases } from '../../src/finance-platform/use-cases/FinancePlatformUseCases';

const usd = (amountMinorUnits: string) => ({ amountMinorUnits, currencyCode: 'USD', scale: 2 });
const identity = { actorId: 'finance-admin', correlationId: 'corr-1', idempotencyKey: 'idem-1' };

const stable = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stable(record[key])}`).join(',')}}`;
};
const payloadHash = (value: unknown) => createHash('sha256').update(stable(value)).digest('hex');
const dependencies = {
  currencyReference: {
    resolveCurrency: vi.fn(async (code: string) =>
      ['USD', 'SAR'].includes(code) ? { referenceId: `currency-${code}`, currencyCode: code, scale: 2, active: true } : null,
    ),
  },
  paymentGateways: { get: vi.fn(() => null), list: vi.fn(() => []) },
  bankTransferGateways: { get: vi.fn(() => null), list: vi.fn(() => []) },
  fxRateProvider: {
    providerKey: 'test-fx',
    isConfigured: () => false,
    fetchRate: vi.fn(),
  },
  transferFeePolicy: { policyReference: 'NO_TRANSFER_FEE_V1', basisPoints: 0 },
} as any;
const useCases = (repository: any) => new FinancePlatformUseCases(repository, dependencies);

describe('FinancePlatformUseCases', () => {
  it('creates a server-calculated DRAFT invoice and never auto-issues', async () => {
    const repository = {
      createDraftInvoice: vi.fn(async (data) => ({ id: 'inv-1', status: 'DRAFT', ...data })),
    } as any;
    const result = await useCases(repository).createDraftInvoice(
      {
        originDomain: 'LEARNING',
        originReferenceId: 'course-1',
        lineItems: [{ description: 'Course', quantity: 3, unitPrice: usd('1250') }],
      },
      identity,
    );
    expect(result.status).toBe('DRAFT');
    expect(result.totalAmount.amountMinorUnits).toBe('3750');
  });

  it('blocks edits after issuance and raw card numbers', async () => {
    const repository = {
      findInvoiceById: vi.fn().mockResolvedValue({ id: 'inv-1', status: 'ISSUED', amountDue: usd('1000') }),
    } as any;
    await expect(
      useCases(repository).updateDraftInvoice('inv-1', [{ description: 'X', quantity: 1, unitPrice: usd('1') }], identity),
    ).rejects.toThrow('DRAFT');
    await expect(
      useCases(repository).capturePayment(
        { invoiceId: 'inv-1', amount: usd('100'), paymentMethodToken: '4242 4242 4242 4242', gatewayProvider: 'provider' },
        identity,
      ),
    ).rejects.toThrow('Raw card PAN');
  });

  it('rejects overpayment before provider mutation', async () => {
    const repository = {
      findInvoiceById: vi.fn().mockResolvedValue({ id: 'inv-1', status: 'ISSUED', amountDue: usd('1000') }),
    } as any;
    await expect(
      useCases(repository).capturePayment(
        { invoiceId: 'inv-1', amount: usd('1001'), paymentMethodToken: 'tok_safe', gatewayProvider: 'provider' },
        identity,
      ),
    ).rejects.toThrow('cannot exceed');
  });

  it('fails currency conversion closed without an approved historical rate', async () => {
    const repository = { findEffectiveExchangeRate: vi.fn().mockResolvedValue(null) } as any;
    await expect(
      useCases(repository).convert({ amount: usd('100'), targetCurrencyCode: 'SAR', targetScale: 2 }),
    ).rejects.toThrow('failed closed');
  });

  it('rejects non-canonical finance currency/scale before persistence', async () => {
    const repository = { createFinancialAccount: vi.fn() } as any;
    await expect(
      useCases(repository).createFinancialAccount(
        { ownerReferenceId: 'owner-1', type: 'LIABILITY', currencyCode: 'USD', scale: 3 },
        identity,
      ),
    ).rejects.toThrow('scale mismatch');
    expect(repository.createFinancialAccount).not.toHaveBeenCalled();
  });

  it('prevents maker self approval', async () => {
    const repository = {
      getApproval: vi.fn().mockResolvedValue({ id: 'approval-1', makerId: 'finance-admin', decisions: [] }),
    } as any;
    await expect(
      useCases(repository).decideApproval('approval-1', 'APPROVE', 'finance-admin', undefined, identity),
    ).rejects.toThrow('Maker');
  });

  it('fails payment capture closed when the requested gateway is not configured', async () => {
    const repository = {
      findInvoiceById: vi.fn().mockResolvedValue({ id: 'inv-1', status: 'ISSUED', amountDue: usd('1000') }),
      recordCapturedPaymentAtomic: vi.fn(),
    } as any;
    await expect(
      useCases(repository).capturePayment(
        { invoiceId: 'inv-1', amount: usd('100'), paymentMethodToken: 'tok_safe', gatewayProvider: 'missing' },
        identity,
      ),
    ).rejects.toThrow('PAYMENT_PROVIDER_NOT_CONFIGURED');
    expect(repository.recordCapturedPaymentAtomic).not.toHaveBeenCalled();
  });

  it('requires provider reversal evidence before reversing a settled transfer', async () => {
    const transitionTransfer = vi.fn(async (_id, status, _ctx, evidence) => ({ status, ...evidence }));
    const repository = {
      getTransfer: vi.fn().mockResolvedValue({
        id: 'transfer-db',
        publicId: 'transfer-1',
        sourceWalletId: 'wallet-1',
        destinationReferenceId: 'beneficiary-1',
        destinationCurrencyCode: 'SAR',
        sourceAmount: usd('1000'),
        targetAmount: { amountMinorUnits: '3750', currencyCode: 'SAR', scale: 2 },
        rateId: 'rate-1',
        feeAmount: usd('10'),
        feePolicyReference: 'fee-v1',
        bankProvider: 'bank-a',
        bankProviderReference: 'bank-ref-1',
        providerStatus: 'SETTLED',
        settlementTransactionId: 'ledger-settlement-1',
        reversalTransactionId: null,
        status: 'SETTLED',
        makerId: 'maker-1',
        correlationId: 'corr-transfer',
        idempotencyKeyHash: 'hash',
        version: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      getWallet: vi.fn().mockResolvedValue({ id: 'wallet-1', status: 'ACTIVE', currencyCode: 'USD', scale: 2 }),
      transitionTransfer,
    } as any;
    const reverse = vi.fn().mockResolvedValue({ providerReference: 'bank-ref-1', status: 'REVERSED' });
    const sut = new FinancePlatformUseCases(repository, {
      ...dependencies,
      bankTransferGateways: {
        get: vi.fn(() => ({ providerKey: 'bank-a', isConfigured: () => true, runtimeStatus: () => 'READY', submit: vi.fn(), getStatus: vi.fn(), reverse })),
      },
    } as any);

    await sut.transitionTransfer('transfer-db', 'REVERSED', identity);

    expect(reverse).toHaveBeenCalledWith('bank-ref-1', 'idem-1:bank-reverse');
    expect(transitionTransfer).toHaveBeenCalledWith(
      'transfer-db',
      'REVERSED',
      expect.any(Object),
      expect.objectContaining({ providerStatus: 'REVERSED', bankProviderReference: 'bank-ref-1' }),
    );
  });

  it('atomically reserves and consumes refund approval before invoking the payment provider', async () => {
    const order: string[] = [];
    const refund = {
      id: 'refund-db',
      publicId: 'refund-1',
      paymentId: 'payment-1',
      amount: usd('250'),
      reason: 'duplicate charge',
      status: 'PENDING_APPROVAL',
      makerId: 'maker-1',
      approvalId: null,
      createdAt: new Date(),
    };
    const approvalPayload = {
      refundId: refund.publicId,
      paymentId: refund.paymentId,
      amount: refund.amount,
      reason: refund.reason,
    };
    const repository = {
      getRefund: vi.fn().mockResolvedValue(refund),
      findPaymentById: vi.fn().mockResolvedValue({
        id: 'payment-1',
        status: 'CAPTURED',
        amount: usd('250'),
        gatewayProvider: 'pay-a',
        gatewayReference: 'pay-ref-1',
      }),
      getApproval: vi.fn().mockResolvedValue({
        id: 'approval-db',
        publicId: 'approval-1',
        actionType: 'REFUND_EXECUTE',
        targetReferenceId: 'refund-1',
        amount: usd('250'),
        makerId: 'maker-1',
        requiredApprovals: 1,
        payloadHash: payloadHash(approvalPayload),
        policyReference: 'FINANCE:REFUND_EXECUTE:FOUR_EYES_V1',
        consumedAt: null,
        status: 'APPROVED',
        decisions: [],
        createdAt: new Date(),
      }),
      beginRefundProcessing: vi.fn(async () => {
        order.push('reserve');
        return { ...refund, status: 'PROCESSING', approvalId: 'approval-db' };
      }),
      completeRefundAtomic: vi.fn(async () => {
        order.push('complete');
        return { ...refund, status: 'COMPLETED', approvalId: 'approval-db' };
      }),
      failRefund: vi.fn(),
    } as any;
    const refundProvider = vi.fn(async () => {
      order.push('provider');
      return { status: 'COMPLETED', gatewayReference: 'refund-provider-ref-1' };
    });
    const sut = new FinancePlatformUseCases(repository, {
      ...dependencies,
      paymentGateways: {
        get: vi.fn(() => ({
          providerKey: 'pay-a',
          isConfigured: () => true,
          runtimeStatus: () => 'READY',
          authorize: vi.fn(),
          capture: vi.fn(),
          refund: refundProvider,
        })),
      },
    } as any);

    await sut.processRefund('refund-db', 'approval-db', { ...identity, actorId: 'checker-executor' });

    expect(order).toEqual(['reserve', 'provider', 'complete']);
  });

  it('persists a failed provider attempt instead of losing payment history', async () => {
    const repository = {
      findInvoiceById: vi.fn().mockResolvedValue({ id: 'inv-1', status: 'ISSUED', amountDue: usd('1000') }),
      preparePaymentAttempt: vi.fn().mockResolvedValue({
        id: 'pay-db', publicId: 'fin_pay_1', invoiceId: 'inv-1', amount: usd('500'), status: 'PENDING',
        paymentMethod: 'PROVIDER_TOKEN', gatewayProvider: 'pay-a', createdAt: new Date(), updatedAt: new Date(),
      }),
      recordPaymentFailure: vi.fn().mockResolvedValue({ id: 'pay-db', status: 'FAILED' }),
      recordPaymentAuthorization: vi.fn(),
      recordCapturedPaymentAtomic: vi.fn(),
    } as any;
    const sut = new FinancePlatformUseCases(repository, {
      ...dependencies,
      paymentGateways: {
        get: vi.fn(() => ({
          providerKey: 'pay-a', isConfigured: () => true, runtimeStatus: () => 'READY',
          authorize: vi.fn().mockResolvedValue({ status: 'FAILED', gatewayReference: 'auth-failed', failureCode: 'DECLINED' }),
          capture: vi.fn(), refund: vi.fn(),
        })),
        list: vi.fn(() => []),
      },
    } as any);

    await expect(sut.capturePayment(
      { invoiceId: 'inv-1', amount: usd('500'), paymentMethodToken: 'tok_safe', gatewayProvider: 'pay-a' },
      identity,
    )).rejects.toThrow('PAYMENT_AUTHORIZATION_FAILED:DECLINED');

    expect(repository.preparePaymentAttempt).toHaveBeenCalled();
    expect(repository.recordPaymentFailure).toHaveBeenCalledWith('pay-db', 'DECLINED', expect.any(Object));
    expect(repository.recordCapturedPaymentAtomic).not.toHaveBeenCalled();
  });

});
