import { createHash, createHmac } from 'node:crypto';
import { describe, it, expect, vi } from 'vitest';
import {financeCommandFixture} from './FinanceCommandFixture';
import { PrismaFinanceRepository } from '../../src/finance-platform/PrismaFinanceRepository';
import {
  EnvironmentPaymentGatewayAdapter,
  EnvironmentBankTransferGatewayAdapter,
} from '../../src/finance-platform/ProviderNeutralFinanceGateways';
import { FinancePlatformUseCases } from '../../../application/src/finance-platform/use-cases/FinancePlatformUseCases';
import {
  assertPositiveFinanceMoney,
  assertFreshFxQuote,
  financeApprovalPolicy,
} from '../../../domain/src/finance-platform/FinanceSafety';
const usd = (amountMinorUnits: string) => ({ amountMinorUnits, currencyCode: 'USD', scale: 2 });
const ctx = { actorId: 'actor', correlationId: 'trace', idempotencyKey: 'key' };
const digest = (v: string) => createHash('sha256').update(v).digest('hex');
function transactional(models: any) {
  let tail = Promise.resolve();
  const db: any = {
    financeCommandRecord: financeCommandFixture(),
    ...models,
    auditRecord: { create: vi.fn() },
    transactionalOutboxRecord: { create: vi.fn() },
  };
  db.$transaction = (fn: any) => {
    const run = tail.then(() => fn(db));
    tail = run.catch(() => {});
    return run;
  };
  return db;
}
const invoice = {
  id: 'invoice',
  publicId: 'invoice-public',
  version: 1,
  status: 'ISSUED',
  currencyCode: 'USD',
  scale: 2,
  dueMinorUnits: '1000',
};
const dependencies: any = {
  currencyReference: {
    resolveCurrency: async () => ({
      referenceId: 'usd',
      currencyCode: 'USD',
      scale: 2,
      active: true,
    }),
  },
  paymentGateways: { get: () => null, list: () => [] },
  bankTransferGateways: { get: () => null, list: () => [] },
  fxRateProvider: { providerKey: 'fx', isConfigured: () => false },
  transferFeePolicy: { policyReference: 'NO_FEE', basisPoints: 0 },
};

describe('section 20 financial safety', () => {
  it.each(['-1', '0', '01', '1'.repeat(31), '1.5', 'NaN'])(
    'rejects invalid wallet hold %s before touching persistence',
    async (units) => {
      const db = transactional({});
      await expect(
        new PrismaFinanceRepository(db).createWalletHold('wallet', usd(units), 'invoice', ctx),
      ).rejects.toThrow('FINANCE_AMOUNT_INVALID');
      expect(db.auditRecord.create).not.toHaveBeenCalled();
    },
  );
  it('keeps exact positive units beyond Number precision', () => {
    expect(() => assertPositiveFinanceMoney(usd('999999999999999999999999999999'))).not.toThrow();
  });
  it.each([new Date(Date.now() - 86400000), new Date(Date.now() + 120000), new Date('invalid')])(
    'rejects stale/future/invalid FX timestamps',
    (date) => expect(() => assertFreshFxQuote('1', '1', date)).toThrow(),
  );
  it('uses the server approval quorum and rejects unknown actions', () => {
    expect(financeApprovalPolicy('REFUND_EXECUTE').requiredApprovals).toBe(2);
    expect(() => financeApprovalPolicy('PAYMENT_MARK_PAID')).toThrow();
  });
  it('serializes separate payment reservations against one invoice balance', async () => {
    const payments: any[] = [];
    const model = {
      findUnique: vi.fn(async ({ where }: any) =>
        payments.find((p) => p.idempotencyKeyHash === where.idempotencyKeyHash),
      ),
      findMany: vi.fn(async () =>
        payments.filter((p) => ['PENDING', 'AUTHORIZED'].includes(p.status)),
      ),
      create: vi.fn(async ({ data }: any) => {
        const row = {
          ...data,
          id: `payment-${payments.length}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        payments.push(row);
        return row;
      }),
    };
    const db = transactional({
      financePaymentRecord: model,
      financeInvoiceRecord: { findUnique: async () => ({ ...invoice }), update: vi.fn() },
      financeWalletHoldRecord: { count: async () => 0 },
    });
    const repo = new PrismaFinanceRepository(db),
      input: any = {
        publicId: 'payment',
        invoiceId: 'invoice',
        amount: usd('1000'),
        status: 'PENDING',
        paymentMethod: 'PROVIDER_TOKEN',
        gatewayProvider: 'bank',
      };
    const results = await Promise.allSettled([
      repo.preparePaymentAttempt(input, ctx),
      repo.preparePaymentAttempt(
        { ...input, publicId: 'other' },
        { ...ctx, idempotencyKey: 'other-key' },
      ),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(payments).toHaveLength(1);
    const retry = await repo.preparePaymentAttempt(input, ctx);
    expect(retry.id).toBe(payments[0].id);
    await expect(repo.preparePaymentAttempt({ ...input, amount: usd('999') }, ctx)).rejects.toThrow(
      'idempotency',
    );
    await expect(
      repo.preparePaymentAttempt(input, { ...ctx, actorId: 'other-actor' }),
    ).rejects.toThrow('FINANCE_IDEMPOTENCY_CONFLICT');
  });
  it('allows only one payment dispatch and one capture claim', async () => {
    const row: any = {
      id: 'payment',
      status: 'PENDING',
      dispatchStartedAt: null,
      captureStartedAt: null,
    };
    const db = transactional({
      financePaymentRecord: {
        updateMany: vi.fn(async ({ where, data }: any) => {
          if (
            where.status !== row.status ||
            ('dispatchStartedAt' in where && row.dispatchStartedAt !== null) ||
            ('captureStartedAt' in where && row.captureStartedAt !== null)
          )
            return { count: 0 };
          Object.assign(row, data);
          return { count: 1 };
        }),
      },
    });
    const repo = new PrismaFinanceRepository(db);
    expect(
      await Promise.all([
        repo.claimPaymentDispatch('payment', ctx),
        repo.claimPaymentDispatch('payment', ctx),
      ]),
    ).toEqual([true, false]);
    row.status = 'AUTHORIZED';
    expect(
      await Promise.all([
        repo.claimPaymentCapture('payment', ctx),
        repo.claimPaymentCapture('payment', ctx),
      ]),
    ).toEqual([true, false]);
  });
  it('claims a bank submission before the provider and never redispatches after timeout', async () => {
    const transfer: any = {
      id: 'transfer',
      publicId: 'transfer-public',
      sourceWalletId: 'wallet',
      sourceCurrencyCode: 'USD',
      sourceScale: 2,
      sourceAmountMinorUnits: '1000',
      targetCurrencyCode: 'USD',
      targetScale: 2,
      targetAmountMinorUnits: '1000',
      feeAmountMinorUnits: '0',
      rateId: 'rate',
      feePolicyReference: 'fee',
      bankProvider: 'bank',
      status: 'APPROVED',
      version: 7,
    };
    const db = transactional({
      financeTransferRecord: {
        findUnique: async () => ({ ...transfer }),
        findFirst: async () => ({ ...transfer }),
        updateMany: async ({ where, data }: any) => {
          if (transfer.status !== where.status) return { count: 0 };
          Object.assign(transfer, data, { version: transfer.version + 1 });
          return { count: 1 };
        },
      },
      financeWalletRecord: {
        findFirst: async () => ({ status: 'ACTIVE', currencyCode: 'USD', scale: 2 }),
      },
    });
    const repo = new PrismaFinanceRepository(db),
      submit = vi.fn(async () => {
        expect(transfer.status).toBe('PROCESSING');
        throw new Error('TIMEOUT');
      });
    const sut = new FinancePlatformUseCases(repo, {
      ...dependencies,
      bankTransferGateways: {
        get: () => ({
          providerKey: 'bank',
          isConfigured: () => true,
          runtimeStatus: () => 'READY',
          submit,
        }),
      },
    });
    const results = await Promise.allSettled([
      sut.transitionTransfer('transfer', 'PROCESSING', { ...ctx, expectedVersion: 7 }),
      sut.transitionTransfer('transfer', 'PROCESSING', {
        ...ctx,
        expectedVersion: 7,
        idempotencyKey: 'other',
      }),
    ]);
    expect(results.every((r) => r.status === 'rejected')).toBe(true);
    expect(submit).toHaveBeenCalledTimes(1);
    expect(transfer.providerStatus).toBe('UNKNOWN_OUTCOME');
    expect(submit.mock.calls[0]).toEqual([
      {
        transferReference: 'transfer-public',
        destinationReferenceId: undefined,
        sourceAmount: usd('1000'),
        targetAmount: usd('1000'),
        feeAmount: usd('0'),
        idempotencyKey: 'transfer:transfer-public:bank-submit',
      },
    ]);
  });
  it('rejects stale transfer commands before any bank call', async () => {
    const submit = vi.fn();
    const sut = new FinancePlatformUseCases({ getTransfer: async () => ({ version: 8 }) } as any, {
      ...dependencies,
      bankTransferGateways: { get: () => ({ submit }) },
    });
    await expect(
      sut.transitionTransfer('transfer', 'PROCESSING', { ...ctx, expectedVersion: 7 }),
    ).rejects.toThrow('FINANCE_VERSION_CONFLICT');
    expect(submit).not.toHaveBeenCalled();
  });
  it('requires authoritative provider attestation and quarantines wrong amount without local settlement', async () => {
    const payment: any = {
      id: 'payment',
      publicId: 'payment-public',
      status: 'PENDING',
      amount: usd('1000'),
      invoiceId: 'invoice',
      gatewayProvider: 'provider',
    };
    const recordCapturedPaymentAtomic = vi.fn();
    const repo: any = {
      findInvoiceById: async () => ({ ...invoice, amountDue: usd('1000') }),
      findPaymentById: async () => null,
      preparePaymentAttempt: async () => payment,
      claimPaymentDispatch: async () => true,
      claimPaymentCapture: async () => true,
      recordPaymentAuthorization: vi.fn(),
      recordCapturedPaymentAtomic,
    };
    const gateway = {
      providerKey: 'provider',
      merchantReference: 'merchant',
      isConfigured: () => true,
      runtimeStatus: () => 'READY',
      authorize: async () => ({ status: 'AUTHORIZED', gatewayReference: 'reference' }),
      capture: async () => ({
        status: 'CAPTURED',
        gatewayReference: 'reference',
        verified: true,
        merchantReference: 'merchant',
        captureReference: 'capture',
        operationReference: 'payment-public',
        amount: usd('999'),
      }),
    };
    const sut = new FinancePlatformUseCases(repo, {
      ...dependencies,
      paymentGateways: { get: () => gateway },
    });
    await expect(
      sut.capturePayment(
        {
          invoiceId: 'invoice',
          amount: usd('1000'),
          gatewayProvider: 'provider',
          paymentMethodToken: 'tok_safe',
        },
        ctx,
      ),
    ).rejects.toThrow('FINANCE_PROVIDER_EVIDENCE_MISMATCH');
    expect(recordCapturedPaymentAtomic).not.toHaveBeenCalled();
  });
  it('selects bounded due candidates and writes backoff before provider polling', async () => {
    const row: any = {
      id: 'payment',
      publicId: 'pub',
      status: 'PENDING',
      amountMinorUnits: '10',
      currencyCode: 'USD',
      scale: 2,
      createdAt: new Date(),
      nextCheckAt: new Date(),
      checkAttempts: 0,
    };
    const findMany = vi.fn(async () => [row]),
      updateMany = vi.fn(async () => ({ count: 1 }));
    const repo = new PrismaFinanceRepository(
      transactional({ financePaymentRecord: { findMany, updateMany } }),
    );
    await repo.claimReconciliationCandidates('payment', 500);
    expect(findMany.mock.calls[0][0]).toMatchObject({
      take: 200,
      orderBy: [{ nextCheckAt: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });
    expect(updateMany.mock.calls[0][0].data.nextCheckAt.getTime()).toBeGreaterThan(Date.now());
  });
  it('returns unknown health for absent/stale scans without running a global scan', async () => {
    const db = transactional({
      financeReconciliationSnapshot: { findUnique: async () => null },
      financePaymentRecord: { count: async () => 2 },
      financeTransferRecord: { count: async () => 1 },
      financeApprovalRecord: { count: async () => 1 },
    });
    expect(await new PrismaFinanceRepository(db).getFinanceOverview()).toMatchObject({
      reconciliationHealth: 'UNKNOWN',
      attention: [],
      pendingPayments: 2,
    });
  });
  it('checks financial clearance at one transaction snapshot, not by walking pages', async () => {
    const counts = vi.fn().mockResolvedValueOnce(3).mockResolvedValueOnce(1);
    const db = transactional({ financeInvoiceRecord: { count: counts } });
    expect(
      await new PrismaFinanceRepository(db).hasFinancialClearanceForOrigin({
        originDomain: 'SERVICES',
        originReferenceId: 'request',
        studentReferenceId: 'student',
      }),
    ).toBe(false);
    expect(counts.mock.calls[1][0].where).toMatchObject({
      originDomain: 'SERVICES',
      originReferenceId: 'request',
      studentReferenceId: 'student',
    });
  });
  it('rejects ledger replay payload changes before consuming an approval', async () => {
    const original: any = {
      id: 'ledger',
      idempotencyKeyHash: digest('key'),
      businessReferenceType: 'MANUAL_ADJUSTMENT',
      businessReferenceId: 'CASE:1',
      createdBy: 'actor',
      reversalOfId: null,
      entries: [
        {
          sequence: 0,
          accountId: 'a',
          direction: 'DEBIT',
          amountMinorUnits: '10',
          currencyCode: 'USD',
          scale: 2,
          memo: null,
        },
        {
          sequence: 1,
          accountId: 'b',
          direction: 'CREDIT',
          amountMinorUnits: '10',
          currencyCode: 'USD',
          scale: 2,
          memo: null,
        },
      ],
    };
    const consume = vi.fn();
    const db = transactional({
      financialTransactionRecord: { findUnique: async () => original },
      financeApprovalRecord: { updateMany: consume },
    });
    const repo = new PrismaFinanceRepository(db),
      input: any = {
        ...ctx,
        businessReferenceType: 'MANUAL_ADJUSTMENT',
        businessReferenceId: 'CASE:2',
        approval: { approvalId: 'approval' },
        postings: [
          { accountId: 'a', direction: 'DEBIT', amount: usd('10') },
          { accountId: 'b', direction: 'CREDIT', amount: usd('10') },
        ],
      };
    await expect(repo.postLedgerTransaction(input)).rejects.toThrow('FINANCE_IDEMPOTENCY_CONFLICT');
    expect(consume).not.toHaveBeenCalled();
  });
  it('stores and replays one invoice edit without overwriting newer drafts', async () => {
    let row: any = {
        ...invoice,
        status: 'DRAFT',
        lineItems: [],
        totalMinorUnits: '1000',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      command: any = null;
    const db = transactional({
      financeInvoiceRecord: {
        findUnique: async () => row,
        update: vi.fn(
          async ({ data }: any) => (row = { ...row, ...data, version: row.version + 1 }),
        ),
      },
      financePaymentRecord: { count: async () => 0 },
      financeWalletHoldRecord: { count: async () => 0 },
      financeCommandRecord: {
        findUnique: async () => command,
        create: async ({ data }: any) => (command = data),
      },
    });
    const repo = new PrismaFinanceRepository(db),
      lines: any = [
        { description: 'service', quantity: 1, unitPrice: usd('900'), totalPrice: usd('900') },
      ];
    const first = await repo.updateDraftInvoice('invoice', lines, usd('900'), {
      ...ctx,
      expectedVersion: 1,
    });
    const retry = await repo.updateDraftInvoice('invoice', lines, usd('900'), {
      ...ctx,
      expectedVersion: 1,
    });
    expect(first).toMatchObject({ version: 2 });
    expect(retry).toMatchObject({ version: 2 });
    expect(db.financeInvoiceRecord.update).toHaveBeenCalledTimes(1);
    command = null;
    await expect(
      repo.updateDraftInvoice('invoice', lines, usd('900'), {
        ...ctx,
        expectedVersion: 1,
        idempotencyKey: 'new',
      }),
    ).rejects.toThrow('FINANCE_VERSION_CONFLICT');
  });
  it('verifies signed money evidence from a deterministic fake transport', async () => {
    const now = new Date(),
      secret = 's'.repeat(32),
      proof = {
        amount: usd('1000'),
        merchantReference: 'merchant',
        captureReference: 'capture',
        operationReference: 'payment-public',
        timestamp: now.toISOString(),
      };
    const signature = createHmac('sha256', secret)
      .update(
        [
          'reference',
          'CAPTURED',
          'payment-public',
          'merchant',
          'capture',
          'USD',
          '2',
          '1000',
          proof.timestamp,
        ].join('\n'),
      )
      .digest('hex');
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            status: 'CAPTURED',
            gatewayReference: 'reference',
            attestation: { ...proof, signature },
          }),
          { status: 200 },
        ),
    );
    const gateway = new EnvironmentPaymentGatewayAdapter('provider', {
      baseUrl: 'https://fake.example',
      apiKey: 'fake-key',
      signingSecret: secret,
      merchantReference: 'merchant',
      runtimeApproved: true,
      fetchImpl: fetchImpl as any,
      now: () => now,
    });
    expect(await gateway.capture('reference', usd('1000'), 'key', 'payment-public')).toMatchObject({
      verified: true,
      amount: usd('1000'),
    });
    fetchImpl.mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            status: 'CAPTURED',
            gatewayReference: 'reference',
            attestation: { ...proof, amount: usd('999'), signature },
          }),
          { status: 200 },
        ),
    );
    await expect(
      gateway.capture('reference', usd('1000'), 'key', 'payment-public'),
    ).rejects.toThrow('FINANCE_PROVIDER_PROTOCOL_ERROR');
  });
});

describe('P19 replay and recovery regressions', () => {
  it('does not capture again when authorization already completed the charge', async () => {
    const payment: any = {
      id: 'payment',
      publicId: 'payment-public',
      status: 'PENDING',
      amount: usd('1000'),
      invoiceId: 'invoice',
      gatewayProvider: 'provider',
    };
    const capture = vi.fn(),
      recordCapturedPaymentAtomic = vi.fn(async () => ({ ...payment, status: 'CAPTURED' }));
    const evidence = {
      status: 'COMPLETED',
      gatewayReference: 'reference',
      verified: true,
      merchantReference: 'merchant',
      captureReference: 'capture',
      operationReference: 'payment-public',
      amount: usd('1000'),
    };
    const repo: any = {
      findInvoiceById: async () => ({ ...invoice, amountDue: usd('1000') }),
      findPaymentById: async () => null,
      preparePaymentAttempt: async () => payment,
      claimPaymentDispatch: async () => true,
      recordPaymentAuthorization: vi.fn(),
      recordCapturedPaymentAtomic,
    };
    const sut = new FinancePlatformUseCases(repo, {
      ...dependencies,
      paymentGateways: {
        get: () => ({
          providerKey: 'provider',
          merchantReference: 'merchant',
          isConfigured: () => true,
          runtimeStatus: () => 'READY',
          authorize: async () => evidence,
          capture,
        }),
      },
    });
    expect(
      await sut.capturePayment(
        {
          invoiceId: 'invoice',
          amount: usd('1000'),
          gatewayProvider: 'provider',
          paymentMethodToken: 'token_safe',
        },
        ctx,
      ),
    ).toMatchObject({ status: 'CAPTURED' });
    expect(capture).not.toHaveBeenCalled();
  });
  it('rejects changed wallet hold replay before balance projection or audit', async () => {
    const db = transactional({
      financeWalletRecord: {
        findUnique: async () => ({
          id: 'wallet',
          ownerReferenceId: ctx.actorId,
          status: 'ACTIVE',
          currencyCode: 'USD',
          scale: 2,
          account: { active: true, currencyCode: 'USD', scale: 2 },
        }),
      },
      financeWalletHoldRecord: {
        findUnique: async () => ({
          walletId: 'wallet',
          amountMinorUnits: '10',
          currencyCode: 'USD',
          scale: 2,
          businessReferenceId: 'original',
        }),
      },
    });
    await expect(
      new PrismaFinanceRepository(db).createWalletHold('wallet', usd('10'), 'changed', ctx),
    ).rejects.toThrow('FINANCE_IDEMPOTENCY_CONFLICT');
    expect(db.auditRecord.create).not.toHaveBeenCalled();
    expect(db.transactionalOutboxRecord.create).not.toHaveBeenCalled();
    expect(db.financeCommandRecord.create).not.toHaveBeenCalled();
  });
  it('rejects destination changes under a transfer creation key', async () => {
    const db = transactional({
      financeTransferRecord: {
        findUnique: async () => ({ sourceWalletId: 'wallet', destinationReferenceId: 'original' }),
      },
    });
    await expect(
      new PrismaFinanceRepository(db).createTransfer(
        { sourceWalletId: 'wallet', destinationReferenceId: 'changed' },
        ctx,
      ),
    ).rejects.toThrow('FINANCE_IDEMPOTENCY_CONFLICT');
    expect(db.auditRecord.create).not.toHaveBeenCalled();
  });
  it('rejects overlapping approved FX windows before consuming approval', async () => {
    const findFirst = vi
      .fn()
      .mockResolvedValueOnce({
        id: 'rate',
        makerId: 'actor',
        source: 'MANUAL_OVERRIDE',
        approved: false,
        sourceCurrencyCode: 'USD',
        targetCurrencyCode: 'SAR',
        effectiveFrom: new Date(),
        effectiveTo: null,
        version: 1,
      })
      .mockResolvedValueOnce({ id: 'overlap' });
    const consume = vi.fn(),
      repo = new PrismaFinanceRepository(
        transactional({
          financeExchangeRateRecord: { findFirst },
          financeApprovalRecord: { updateMany: consume },
        }),
      );
    await expect(
      repo.activateExchangeRate('rate', { makerId: 'actor' } as any, {
        ...ctx,
        expectedVersion: 1,
      }),
    ).rejects.toThrow('FINANCE_FX_WINDOW_CONFLICT');
    expect(consume).not.toHaveBeenCalled();
  });
  it('marks a timed-out refund unknown without releasing approval or redispatching', async () => {
    const refund = {
      id: 'refund',
      publicId: 'refund-public',
      paymentId: 'payment',
      amount: usd('10'),
      reason: 'duplicate',
      status: 'PENDING_APPROVAL',
      makerId: 'maker',
    };
    const stable = (v: any): string =>
      v === null || typeof v !== 'object'
        ? JSON.stringify(v)
        : Array.isArray(v)
          ? `[${v.map(stable).join(',')}]`
          : `{${Object.keys(v)
              .sort()
              .map((k) => `${JSON.stringify(k)}:${stable(v[k])}`)
              .join(',')}}`;
    const markRefundUnknown = vi.fn(),
      completeRefundAtomic = vi.fn(),
      beginRefundProcessing = vi.fn(async () => ({
        ...refund,
        status: 'PROCESSING',
        approvalId: 'approval',
      }));
    const repo: any = {
      getRefund: async () => refund,
      findPaymentById: async () => ({ gatewayProvider: 'provider', gatewayReference: 'reference' }),
      getApproval: async () => ({
        id: 'approval',
        actionType: 'REFUND_EXECUTE',
        targetReferenceId: 'refund-public',
        makerId: 'maker',
        status: 'APPROVED',
        policyReference: 'FINANCE:REFUND_EXECUTE:TWO_CHECKERS_V2',
        amount: usd('10'),
        payloadHash: digest(
          stable({
            refundId: 'refund-public',
            paymentId: 'payment',
            amount: usd('10'),
            reason: 'duplicate',
          }),
        ),
      }),
      beginRefundProcessing,
      markRefundUnknown,
      completeRefundAtomic,
    };
    const sut = new FinancePlatformUseCases(repo, {
      ...dependencies,
      paymentGateways: {
        get: () => ({
          providerKey: 'provider',
          runtimeStatus: () => 'READY',
          refund: async () => {
            throw new Error('TIMEOUT');
          },
        }),
      },
    });
    await expect(sut.processRefund('refund', 'approval', ctx)).rejects.toThrow('TIMEOUT');
    expect(beginRefundProcessing).toHaveBeenCalledOnce();
    expect(markRefundUnknown).toHaveBeenCalledWith(
      'refund',
      expect.objectContaining({ actorId: 'actor' }),
    );
    expect(completeRefundAtomic).not.toHaveBeenCalled();
  });
  it('does not claim provider readiness from transport configuration alone', () => {
    const gateway = new EnvironmentPaymentGatewayAdapter('provider', {
      baseUrl: 'https://fake.example',
      apiKey: 'fake-key',
      signingSecret: 's'.repeat(32),
      merchantReference: 'merchant',
    });
    expect(gateway.isConfigured()).toBe(true);
    expect(gateway.runtimeStatus()).toBe('RUNTIME_PENDING');
  });
});

describe('finance wallet consent and custody', () => {
  it('refuses another payer before creating a wallet obligation', async () => {
    const createWalletHold = vi.fn(),
      sut = new FinancePlatformUseCases(
        {
          findInvoiceById: async () => ({
            id: 'invoice',
            studentReferenceId: 'other',
            payerReferenceId: 'other',
          }),
          createWalletHold,
        } as any,
        dependencies,
      );
    await expect(
      sut.payInvoiceFromWallet(
        { invoiceId: 'invoice', walletId: 'wallet', amount: usd('10') },
        ctx,
      ),
    ).rejects.toThrow('FINANCE_PAYER_CONSENT_REQUIRED');
    expect(createWalletHold).not.toHaveBeenCalled();
  });
  it('does not permit the generic wallet route to release a transfer-owned hold', async () => {
    const db = transactional({
      financeWalletHoldRecord: {
        findUnique: async () => ({
          id: 'hold',
          status: 'ACTIVE',
          version: 1,
          businessReferenceId: 'transfer',
        }),
      },
      financeTransferRecord: { findFirst: async () => ({ id: 'transfer', status: 'PROCESSING' }) },
    });
    await expect(
      new PrismaFinanceRepository(db).resolveWalletHold('hold', 'RELEASE', {
        ...ctx,
        expectedVersion: 1,
      }),
    ).rejects.toThrow('FINANCE_OWNER_MANAGED_HOLD_FORBIDDEN');
    expect(db.auditRecord.create).not.toHaveBeenCalled();
  });
});

describe('bank receipt attestation', () => {
  it('verifies immutable bank snapshot evidence from a signed fake transport', async () => {
    const secret = 's'.repeat(32),
      now = new Date(),
      proof = {
        transferReference: 'transfer',
        destinationReferenceId: 'destination',
        sourceAmount: usd('1000'),
        targetAmount: usd('1000'),
        feeAmount: usd('0'),
        timestamp: now.toISOString(),
      };
    const signature = createHmac('sha256', secret)
      .update(
        [
          'bank-reference',
          'PROCESSING',
          'transfer',
          'destination',
          'USD:2:1000',
          'USD:2:1000',
          'USD:2:0',
          proof.timestamp,
        ].join('\n'),
      )
      .digest('hex');
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            providerReference: 'bank-reference',
            status: 'PROCESSING',
            attestation: { ...proof, signature },
          }),
          { status: 200 },
        ),
    );
    const bank = new EnvironmentBankTransferGatewayAdapter('bank', {
      baseUrl: 'https://fake.example',
      apiKey: 'fake',
      signingSecret: secret,
      runtimeApproved: true,
      fetchImpl: fetchImpl as any,
      now: () => now,
    });
    expect(await bank.submit({ ...proof, idempotencyKey: 'key' })).toMatchObject({
      verified: true,
      transferReference: 'transfer',
      sourceAmount: usd('1000'),
    });
    fetchImpl.mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            providerReference: 'bank-reference',
            status: 'PROCESSING',
            attestation: { ...proof, destinationReferenceId: 'other', signature },
          }),
          { status: 200 },
        ),
    );
    await expect(bank.submit({ ...proof, idempotencyKey: 'key' })).rejects.toThrow(
      'FINANCE_PROVIDER_PROTOCOL_ERROR',
    );
  });
});
