import express from 'express';
import request from 'supertest';
import { describe, it, expect, vi } from 'vitest';
import { FinanceAdminRouter } from '../../../../src/presentation/api/router/FinanceAdminRouter';
const money = { amountMinorUnits: '10', currencyCode: 'USD', scale: 2 };
function setup(sut: any, permission = (key: string) => true) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).authUserId = 'actor';
    next();
  });
  app.use(
    '/finance',
    FinanceAdminRouter.create({
      financeAdminUseCases: {} as any,
      financePlatformUseCases: sut,
      authEvaluatorService: {
        evaluatePermission: async (_id: string, key: string) => ({ isGranted: permission(key) }),
      } as any,
    }),
  );
  return app;
}
describe('P19 API safety', () => {
  it('requires caller-read version before issuing', async () => {
    const issueInvoice = vi.fn();
    const response = await request(setup({ issueInvoice }))
      .post('/finance/invoices/id/issue')
      .set('Idempotency-Key', 'key')
      .send({});
    expect(response.status).toBe(400);
    expect(issueInvoice).not.toHaveBeenCalled();
  });
  it('passes caller version and operation key', async () => {
    const issueInvoice = vi.fn(async () => ({ version: 2 }));
    expect(
      (
        await request(setup({ issueInvoice }))
          .post('/finance/invoices/id/issue')
          .set('Idempotency-Key', 'key')
          .send({ expectedVersion: 1 })
      ).status,
    ).toBe(200);
    expect(issueInvoice.mock.calls[0]).toMatchObject([
      'id',
      { actorId: 'actor', expectedVersion: 1, idempotencyKey: 'key' },
    ]);
  });
  it.each(['-1', '0', '1'.repeat(31)])(
    'rejects malformed hold %s before owner command',
    async (amountMinorUnits) => {
      const createWalletHold = vi.fn();
      const response = await request(setup({ createWalletHold }))
        .post('/finance/wallets/id/holds')
        .set('Idempotency-Key', 'key')
        .send({ expectedVersion: 1, amount: { ...money, amountMinorUnits }, businessReferenceId: 'invoice' });
      expect(response.status).toBe(400);
      expect(createWalletHold).not.toHaveBeenCalled();
    },
  );
  it('rejects read-only actors from finance mutations', async () => {
    const issueInvoice = vi.fn();
    const response = await request(setup({ issueInvoice }, () => false))
      .post('/finance/invoices/id/issue')
      .set('Idempotency-Key', 'key')
      .send({ expectedVersion: 1 });
    expect(response.status).toBe(403);
    expect(issueInvoice).not.toHaveBeenCalled();
  });
  it('keeps provider and local operations separate and does not poll a provider on GET', async () => {
    const reconciliationSnapshot = vi.fn(async () => ({
        status: 'UNKNOWN',
        coverage: 'NOT_EVALUATED',
        issues: [],
      })),
      reconcile = vi.fn(),
      reconcileProviderStates = vi.fn();
    const response = await request(
      setup({ reconciliationSnapshot, reconcile, reconcileProviderStates }),
    ).get('/finance/reconciliation');
    expect(response.status).toBe(200);
    expect(reconciliationSnapshot).toHaveBeenCalledOnce();
    expect(reconcile).not.toHaveBeenCalled();
    expect(reconcileProviderStates).not.toHaveBeenCalled();
  });
  it('requires a distinct provider reconciliation capability', async () => {
    const reconcileProviderStates = vi.fn();
    const response = await request(
      setup({ reconcileProviderStates }, (key) => key !== 'admin:finance:reconciliation:providers'),
    )
      .post('/finance/reconciliation/providers/run')
      .set('Idempotency-Key', 'key')
      .send({ limit: 5 });
    expect(response.status).toBe(403);
    expect(reconcileProviderStates).not.toHaveBeenCalled();
  });
  it('never reflects provider or database secrets in errors', async () => {
    const issueInvoice = vi.fn(async () => {
      throw new Error('Database token secret-value failed');
    });
    const response = await request(setup({ issueInvoice }))
      .post('/finance/invoices/id/issue')
      .set('Idempotency-Key', 'key')
      .send({ expectedVersion: 1 });
    expect(JSON.stringify(response.body)).not.toContain('secret-value');
    expect(response.body.code).toMatch(/^FINANCE_/);
  });
  it('server-pages secondary lists and bounds page size', async () => {
    const listRecords = vi.fn(async () => ({ data: [], total: 0, page: 2, totalPages: 0 }));
    const response = await request(setup({ listRecords })).get(
      '/finance/refunds?page=2&pageSize=20&status=UNKNOWN_OUTCOME',
    );
    expect(response.status).toBe(200);
    expect(listRecords).toHaveBeenCalledWith(
      'refunds',
      expect.objectContaining({ page: 2, pageSize: 20, status: 'UNKNOWN_OUTCOME' }),
    );
    expect(
      (await request(setup({ listRecords })).get('/finance/refunds?pageSize=1000')).status,
    ).toBe(400);
  });
  it.each(['0', '01', '1'.repeat(31)])('rejects noncanonical FX ratio %s at the HTTP boundary', async rateNumerator => {
    const saveExchangeRate = vi.fn();
    const response = await request(setup({ saveExchangeRate }))
      .post('/finance/exchange-rates')
      .set('Idempotency-Key', 'rate-intent')
      .send({ sourceCurrencyCode: 'USD', targetCurrencyCode: 'SAR', rateNumerator, rateDenominator: '100', source: 'MANUAL_OVERRIDE', effectiveFrom: '2026-10-14T00:00:00Z', reason: 'Reviewed corridor' });
    expect(response.status).toBe(400);
    expect(saveExchangeRate).not.toHaveBeenCalled();
  });

});
