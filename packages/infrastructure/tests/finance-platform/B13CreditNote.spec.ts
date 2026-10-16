import express from 'express';
import request from 'supertest';
import {describe, expect, it, vi} from 'vitest';
import {PrismaFinanceRepository} from '../../src/finance-platform/PrismaFinanceRepository';
import {FinancePlatformUseCases} from '../../../application/src/finance-platform/use-cases/FinancePlatformUseCases';
import {FinanceAdminRouter} from '../../../../apps/api/src/presentation/api/router/FinanceAdminRouter';
import {financeCommandFixture} from './FinanceCommandFixture';

const amount = {amountMinorUnits: '1000', currencyCode: 'USD', scale: 2};
const identity = {actorId: 'operator', idempotencyKey: 'credit-intent', expectedVersion: 1};

// Runs original owner/use case/router code. Delegate doubles do not prove SQL isolation or rollback.
function fixture() {
  const invoice = {id: 'invoice', publicId: 'invoice-public', status: 'ISSUED', version: 1,
    currencyCode: 'USD', scale: 2, totalMinorUnits: '1000', dueMinorUnits: '1000', originDomain: 'LEARNING'};
  const documents: any[] = [], accounts: any[] = [];
  const db: any = {
    financeCommandRecord: financeCommandFixture(),
    financeInvoiceRecord: {
      findUnique: vi.fn(async () => invoice),
      update: vi.fn(async ({where, data}) => {
        if (where.id !== invoice.id || where.version !== invoice.version) throw new Error('Fixture version mismatch');
        Object.assign(invoice, {...data, version: invoice.version + data.version.increment});
        return invoice;
      }),
    },
    financePaymentRecord: {count: vi.fn(async () => 0)},
    financeWalletHoldRecord: {count: vi.fn(async () => 0)},
    financeDocumentRecord: {
      findMany: vi.fn(async () => documents),
      create: vi.fn(async ({data}) => {
        const row = {id: 'credit', issuedAt: new Date('2026-10-16T00:00:00Z'), ...data};
        documents.push(row); return row;
      }),
    },
    financialAccountRecord: {
      findFirst: vi.fn(async ({where}) => accounts.find(row => Object.entries(where).every(([key, value]) => row[key] === value)) ?? null),
      create: vi.fn(async ({data}) => {const row = {id: `account-${accounts.length}`, ...data}; accounts.push(row); return row;}),
      findMany: vi.fn(async ({where}) => accounts.filter(row => where.id.in.includes(row.id) && row.active)),
    },
    financialTransactionRecord: {
      findUnique: vi.fn(async () => null),
      create: vi.fn(async ({data}) => ({id: 'ledger', ...data, entries: data.entries.create})),
    },
    auditRecord: {create: vi.fn()}, transactionalOutboxRecord: {create: vi.fn()},
  };
  db.$transaction = vi.fn(async (work: (tx: unknown) => unknown) => work(db));
  const repository = new PrismaFinanceRepository(db);
  const unusedProvider = vi.fn(() => {throw new Error('Unexpected external provider call');});
  const useCases = new FinancePlatformUseCases(repository, {
    paymentGateways: {get: unusedProvider, list: unusedProvider},
    bankTransferGateways: {get: unusedProvider, list: unusedProvider},
    fxRateProvider: {fetchRate: unusedProvider},
    transferFeePolicy: {policyReference: 'TEST_ONLY', basisPoints: 0},
    currencyReference: {resolveCurrency: vi.fn(async (code: string) =>
      ['USD', 'SAR'].includes(code) ? {referenceId: code, currencyCode: code, scale: 2, active: true} : null)},
  } as never);
  const app = express(); app.use(express.json());
  app.use((req: any, _res, next) => {req.authUserId = identity.actorId; next();});
  app.use('/finance', FinanceAdminRouter.create({financeAdminUseCases: {} as never,
    financePlatformUseCases: useCases,
    authEvaluatorService: {evaluatePermission: vi.fn(async () => ({isGranted: true}))} as never}));
  return {invoice, documents, db, repository, useCases, app};
}
function expectWrites(f: ReturnType<typeof fixture>, count: number) {
  for (const delegate of [f.db.financeDocumentRecord, f.db.financialTransactionRecord,
    f.db.financeCommandRecord, f.db.auditRecord, f.db.transactionalOutboxRecord]) {
    expect(delegate.create).toHaveBeenCalledTimes(count);
  }
  expect(f.db.financeInvoiceRecord.update).toHaveBeenCalledTimes(count);
}

describe('B13 native credit note acceptance', () => {
  it('replays the full HTTP command after CREDITED without another document, ledger, receipt, audit or outbox', async () => {
    const f = fixture();
    const send = () => request(f.app).post('/finance/invoices/invoice/credit-notes')
      .set('Idempotency-Key', identity.idempotencyKey).send({expectedVersion: 1, amount, reason: 'Correction'});
    const first = await send();
    expect(first.status).toBe(201);
    expect(f.invoice).toMatchObject({status: 'CREDITED', version: 2, dueMinorUnits: '0'});
    const retry = await send();
    expect(retry.status).toBe(201); expect(retry.body).toEqual(first.body);
    expectWrites(f, 1);
    const ledger = f.db.financialTransactionRecord.create.mock.calls[0][0].data;
    expect(ledger.entries.create).toEqual([
      expect.objectContaining({direction: 'DEBIT', amountMinorUnits: '1000', currencyCode: 'USD', scale: 2}),
      expect.objectContaining({direction: 'CREDIT', amountMinorUnits: '1000', currencyCode: 'USD', scale: 2}),
    ]);
    expect(ledger.createdBy).toBe('operator');
    expect(f.db.auditRecord.create.mock.calls[0][0].data.action).toBe('FINANCE_CREDIT_NOTE_CREATED');
    expect(f.db.transactionalOutboxRecord.create.mock.calls[0][0].data.eventType).toBe('FINANCE_CREDIT_NOTE_CREATED');
  });
  it.each([
    {reason: 'Different reason'}, {amount: {...amount, amountMinorUnits: '500'}}, {expectedVersion: 2},
  ])('rejects changed intent under the same HTTP key: %j', async change => {
    const f = fixture(), body = {expectedVersion: 1, amount, reason: 'Correction'};
    const send = (input: unknown) => request(f.app).post('/finance/invoices/invoice/credit-notes')
      .set('Idempotency-Key', identity.idempotencyKey).send(input);
    expect((await send(body)).status).toBe(201);
    expect((await send({...body, ...change})).status).toBe(409);
    expectWrites(f, 1);
  });
  it.each([
    ['over balance', {...amount, amountMinorUnits: '1001'}],
    ['currency mismatch', {...amount, currencyCode: 'SAR'}],
    ['scale mismatch', {...amount, scale: 3}],
    ['zero amount', {...amount, amountMinorUnits: '0'}],
    ['negative amount', {...amount, amountMinorUnits: '-1'}],
  ])('rejects %s through the actual use case before any write', async (_label, input) => {
    const f = fixture();
    await expect(f.useCases.createCreditNote('invoice', input, 'Correction', identity)).rejects.toThrow();
    expectWrites(f, 0);
  });
  it.each([{...amount, currencyCode: 'SAR'}, {...amount, scale: 3}])('owner rejects incompatible invoice money %j', async input => {
    const f = fixture();
    await expect(f.repository.createCreditNote('invoice', input, 'Correction', identity))
      .rejects.toThrow('Credit note exceeds the remaining eligible invoice balance');
    expectWrites(f, 0);
  });
  it.each([undefined, 0, 2])('rejects missing/zero/stale owner version %s', async expectedVersion => {
    const f = fixture();
    await expect(f.repository.createCreditNote('invoice', amount, 'Correction', {...identity, expectedVersion}))
      .rejects.toThrow(expectedVersion === 2 ? 'FINANCE_VERSION_CONFLICT' : 'FINANCE_EXPECTED_VERSION_REQUIRED');
    expectWrites(f, 0);
  });
  it.each([0, 2, 501])('rejects invalid reason through use case and owner (length %i)', async length => {
    const f = fixture(), reason = 'x'.repeat(length);
    await expect(f.useCases.createCreditNote('invoice', amount, reason, identity)).rejects.toThrow('reason');
    await expect(f.repository.createCreditNote('invoice', amount, reason, identity)).rejects.toThrow('FINANCE_CREDIT_REASON_INVALID');
    expectWrites(f, 0);
  });
  it.each(['payment', 'hold'])('rejects outstanding %s reservations before posting', async reservation => {
    const f = fixture();
    const delegate = reservation === 'payment' ? f.db.financePaymentRecord : f.db.financeWalletHoldRecord;
    delegate.count.mockResolvedValue(1);
    await expect(f.useCases.createCreditNote('invoice', amount, 'Correction', identity)).rejects.toThrow('RESERVED');
    expectWrites(f, 0);
  });
});
