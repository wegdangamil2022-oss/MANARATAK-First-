import express from 'express';
import request from 'supertest';
import {describe, expect, it, vi} from 'vitest';
import {FinanceAdminRouter} from '../../../../src/presentation/api/router/FinanceAdminRouter';

const amount = {amountMinorUnits: '1000', currencyCode: 'USD', scale: 2};
const commands = [
  ['/invoices/invoice/installment-plans', 'createInstallments', {expectedVersion: 1, installments: [{amount, dueDate: '2090-01-01T00:00:00Z'}]}],
  ['/invoices/invoice/credit-notes', 'createCreditNote', {expectedVersion: 1, amount, reason: 'Correction'}],
  ['/wallets/wallet/holds', 'createWalletHold', {expectedVersion: 1, amount, businessReferenceId: 'invoice'}],
  ['/wallet-holds/hold/release', 'resolveWalletHold', {expectedVersion: 1}],
  ['/wallet-holds/hold/capture', 'resolveWalletHold', {expectedVersion: 1}],
  ['/ledger/transactions/transaction/reverse', 'reverseLedger', {approvalId: 'approval', reason: 'Correction'}],
  ['/approvals/approval/decisions', 'decideApproval', {expectedVersion: 1, decision: 'APPROVE'}],
] as const;
function fixture(granted = true) {
  const useCases: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of new Set(commands.map(row => row[1]))) useCases[method] = vi.fn().mockResolvedValue({id: 'result'});
  useCases.getRecord = vi.fn().mockResolvedValue({actionType: 'MANUAL_LEDGER_REVERSE'});
  const app = express(); app.use(express.json());
  app.use((req: any, _res, next) => {req.authUserId = 'operator'; next();});
  app.use('/finance', FinanceAdminRouter.create({financeAdminUseCases: {} as never,
    financePlatformUseCases: useCases as never,
    authEvaluatorService: {evaluatePermission: vi.fn(async () => ({isGranted: granted}))} as never}));
  return {app, useCases};
}
describe('B13 command HTTP boundaries', () => {
  it.each(commands)('dispatches %s with the authenticated actor and stable request key', async (path, method, body) => {
    const f = fixture();
    const response = await request(f.app).post(`/finance${path}`).set('Idempotency-Key', 'synthetic-intent').send(body);
    expect(response.status).toBeGreaterThanOrEqual(200); expect(response.status).toBeLessThan(300);
    expect(f.useCases[method]).toHaveBeenCalledOnce();
    const identity = f.useCases[method].mock.calls[0].at(-1);
    expect(identity).toMatchObject({actorId: 'operator', idempotencyKey: 'synthetic-intent'});
    if ('expectedVersion' in body) expect(identity.expectedVersion).toBe(1);
    if (method === 'reverseLedger') expect(identity.reason).toBe('Correction');
  });
  it.each(commands)('denies %s without operation permission', async (path, method, body) => {
    const f = fixture(false);
    expect((await request(f.app).post(`/finance${path}`).set('Idempotency-Key', 'synthetic-intent').send(body)).status).toBe(403);
    expect(f.useCases[method]).not.toHaveBeenCalled();
  });
  it.each(commands.filter(([, , body]) => 'expectedVersion' in body))('requires a version for %s', async (path, method, body) => {
    const f = fixture(), {expectedVersion: _version, ...input} = body as Record<string, unknown>;
    expect((await request(f.app).post(`/finance${path}`).set('Idempotency-Key', 'synthetic-intent').send(input)).status).toBe(400);
    expect(f.useCases[method]).not.toHaveBeenCalled();
  });
  it.each([undefined, 'x'.repeat(201)])('rejects a missing or oversized request key (%s)', async key => {
    const f = fixture();
    const pending = request(f.app).post('/finance/wallet-holds/hold/release');
    if (key !== undefined) pending.set('Idempotency-Key', key);
    const response = await pending.send({expectedVersion: 1});
    expect(response.status).toBe(400); expect(f.useCases.resolveWalletHold).not.toHaveBeenCalled();
  });
});
