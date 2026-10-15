import express from 'express';
import request from 'supertest';
import {describe, expect, it, vi} from 'vitest';
import {FinanceAdminRouter} from '../../../../src/presentation/api/router/FinanceAdminRouter';

function fixture(granted = true, actor: string | undefined = 'operator') {
  const listFinancialAccounts = vi.fn().mockResolvedValue({data: [], total: 0, page: 1, pageSize: 20, totalPages: 0});
  const evaluatePermission = vi.fn().mockResolvedValue({isGranted: granted});
  const app = express();
  app.use((req: any, _res, next) => {req.authUserId = actor; next();});
  app.use('/finance', FinanceAdminRouter.create({
    financeAdminUseCases: {listFinancialAccounts} as never,
    financePlatformUseCases: {} as never,
    authEvaluatorService: {evaluatePermission} as never,
  }));
  return {app, listFinancialAccounts, evaluatePermission};
}
describe('B13 account catalog permission and query contract', () => {
  it('reads with the existing finance permission and preserves inactive filtering', async () => {
    const f = fixture();
    const response = await request(f.app).get('/finance/accounts?active=false&type=ASSET&currencyCode=USD&page=2');
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(f.evaluatePermission).toHaveBeenCalledWith('operator', 'admin:finance:manage', expect.any(Object));
    expect(f.listFinancialAccounts).toHaveBeenCalledWith({active: false, type: 'ASSET', currencyCode: 'USD', page: 2, pageSize: 20});
  });
  it('denies permission before reading', async () => {
    const f = fixture(false);
    expect((await request(f.app).get('/finance/accounts')).status).toBe(403);
    expect(f.listFinancialAccounts).not.toHaveBeenCalled();
  });
  it.each(['pageSize=51', 'page=10001', 'active=0', 'currencyCode=usd', 'type=UNKNOWN', 'unexpected=value'])(
    'rejects invalid queries %s before reading', async query => {
      const f = fixture();
      expect((await request(f.app).get(`/finance/accounts?${query}`)).status).toBe(400);
      expect(f.listFinancialAccounts).not.toHaveBeenCalled();
    });
});
