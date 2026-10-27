import express from 'express';
import request from 'supertest';
import { describe, it, expect, vi } from 'vitest';
import { FinanceAdminRouter } from '../../../../src/presentation/api/router/FinanceAdminRouter';
function fixture(granted = true) {
  const list = vi
    .fn()
    .mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 });
  const app = express();
  app.use((req: any, _res, next) => {
    req.authUserId = 'actor';
    next();
  });
  app.use(
    '/finance',
    FinanceAdminRouter.create({
      financeAdminUseCases: { listLedgerTransactions: list } as any,
      financePlatformUseCases: {} as any,
      authEvaluatorService: {
        evaluatePermission: vi.fn().mockResolvedValue({ isGranted: granted }),
      } as any,
    }),
  );
  app.use((error: any, _req: any, res: any, _next: any) =>
    res.status(error.name === 'ZodError' ? 400 : 403).json({ error: 'denied' }),
  );
  return { app, list };
}
describe('Finance posted transactions API', () => {
  it('passes validated filters and marks sensitive reads non-cacheable', async () => {
    const f = fixture();
    const response = await request(f.app).get(
      '/finance/ledger/transactions?currencyCode=USD&page=2&accountType=EXPENSE&from=2026-10-01',
    );
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(f.list).toHaveBeenCalledWith(
      expect.objectContaining({
        currencyCode: 'USD',
        page: 2,
        pageSize: 20,
        accountType: 'EXPENSE',
        from: expect.any(Date),
      }),
    );
  });
  it('does not query financial records after a denied permission', async () => {
    const f = fixture(false);
    expect((await request(f.app).get('/finance/ledger/transactions')).status).toBe(403);
    expect(f.list).not.toHaveBeenCalled();
  });
  it.each([
    'page=0',
    'pageSize=10000',
    'currencyCode=usd',
    'accountType=BANK',
    'unexpected=true',
    'from=invalid',
    'from=2026-10-28&to=2026-10-01',
  ])('rejects malformed filters: %s', async (query) => {
    const f = fixture();
    expect((await request(f.app).get('/finance/ledger/transactions?' + query)).status).toBe(400);
    expect(f.list).not.toHaveBeenCalled();
  });
});
