import { describe, it, expect, vi } from 'vitest';
import { PrismaFinanceRepository } from '../../src/finance-platform/PrismaFinanceRepository';

function fixture() {
  const units = '900719925474099312345';
  const row = {
    id: 'tx',
    publicId: 'TX-1',
    businessReferenceType: 'PAYMENT',
    businessReferenceId: 'pay-1',
    createdAt: new Date('2026-10-28T00:00:00Z'),
    currencyCode: 'USD',
    scale: 2,
    reversalOfId: null,
    reversal: null,
    createdBy: 'private-actor',
    idempotencyKeyHash: 'private-hash',
    entries: [
      { direction: 'DEBIT', amountMinorUnits: units, currencyCode: 'USD', scale: 2 },
      { direction: 'CREDIT', amountMinorUnits: units, currencyCode: 'USD', scale: 2 },
    ],
  };
  const tx = {
    financialTransactionRecord: {
      findMany: vi.fn().mockResolvedValue([row]),
      count: vi.fn().mockResolvedValue(41),
    },
  };
  const db = { $transaction: vi.fn(async (work: any) => work(tx)) };
  return { repository: new PrismaFinanceRepository(db), db, tx, row, units };
}
describe('Finance transaction register', () => {
  it('reads exact balanced totals with paging and does not expose command hashes', async () => {
    const f = fixture();
    const result = await f.repository.listLedgerTransactions({
      page: 2,
      pageSize: 20,
      currencyCode: 'USD',
      accountType: 'EXPENSE',
      search: 'TX',
    });
    expect(result).toMatchObject({ page: 2, pageSize: 20, total: 41, totalPages: 3 });
    expect(result.data[0].debit.amountMinorUnits).toBe(f.units);
    expect(result.data[0].credit.amountMinorUnits).toBe(f.units);
    expect(result.data[0]).not.toHaveProperty('idempotencyKeyHash');
    expect(result.data[0]).not.toHaveProperty('createdBy');
    const query = f.tx.financialTransactionRecord.findMany.mock.calls[0][0];
    expect(query).toMatchObject({
      skip: 20,
      take: 20,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      where: { currencyCode: 'USD', entries: { some: { account: { type: 'EXPENSE' } } } },
    });
    expect(f.tx.financialTransactionRecord.count).toHaveBeenCalledWith({ where: query.where });
    expect(f.db.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'RepeatableRead',
    });
    expect(query.select).not.toHaveProperty('idempotencyKeyHash');
  });
  it.each(['unbalanced', 'mixedCurrency', 'mixedScale', 'unknownDirection', 'malformedUnits'])(
    'rejects ledger corruption rather than rendering trusted totals: %s',
    async (kind) => {
      const f = fixture();
      if (kind === 'unbalanced') f.row.entries[1].amountMinorUnits = '1';
      if (kind === 'mixedCurrency') f.row.entries[1].currencyCode = 'YER';
      if (kind === 'mixedScale') f.row.entries[1].scale = 0;
      if (kind === 'unknownDirection') f.row.entries[1].direction = 'OTHER';
      if (kind === 'malformedUnits') f.row.entries[1].amountMinorUnits = '1.5';
      await expect(f.repository.listLedgerTransactions({})).rejects.toThrow(
        'FINANCE_LEDGER_INTEGRITY_ERROR',
      );
    },
  );
  it('retains reversal links, account scope and date bounds without creating a new ledger', async () => {
    const f = fixture();
    f.row.reversalOfId = 'prior' as any;
    const from = new Date('2026-10-01T00:00:00Z'),
      to = new Date('2026-10-31T23:59:59Z');
    const result = await f.repository.listLedgerTransactions({
      accountId: 'account',
      from,
      to,
      businessReferenceType: 'PAYMENT',
    });
    expect(result.data[0].reversalOfId).toBe('prior');
    expect(f.tx.financialTransactionRecord.findMany.mock.calls[0][0].where).toMatchObject({
      entries: { some: { accountId: 'account' } },
      createdAt: { gte: from, lte: to },
      businessReferenceType: 'PAYMENT',
    });
  });
});
