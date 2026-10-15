import {describe, expect, it, vi} from 'vitest';
import {PrismaFinanceRepository} from '../../src/finance-platform/PrismaFinanceRepository';
import {FinanceAdminUseCases} from '../../../application/src/finance-platform/use-cases/FinanceAdminUseCases';

describe('B13 financial account owner read', () => {
  it('uses the same filtered snapshot for the page and count, without ledger data', async () => {
    const model = {findMany: vi.fn().mockResolvedValue([{id: 'account'}]), count: vi.fn().mockResolvedValue(21)};
    const db = {$transaction: vi.fn(async run => run({financialAccountRecord: model}))};
    const repository = new PrismaFinanceRepository(db);
    const result = await new FinanceAdminUseCases(repository).listFinancialAccounts({
      ownerReferenceId: ' owner ', currencyCode: 'USD', active: false, page: 2, pageSize: 20, type: 'LIABILITY',
    });
    expect(result).toMatchObject({total: 21, page: 2, pageSize: 20, totalPages: 2});
    const query = model.findMany.mock.calls[0][0];
    expect(query.where).toEqual({ownerReferenceId: 'owner', currencyCode: 'USD', active: false, type: 'LIABILITY'});
    expect(model.count).toHaveBeenCalledWith({where: query.where});
    expect(query).toMatchObject({skip: 20, take: 20, orderBy: [{createdAt: 'desc'}, {id: 'desc'}]});
    expect(Object.keys(query.select)).not.toContain('entries');
    expect(Object.keys(query.select)).not.toContain('wallet');
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), {isolationLevel: 'RepeatableRead'});
  });
  it.each([{page: 10001}, {pageSize: 51}, {page: 1.5}, {ownerReferenceId: ' '},
    {currencyCode: 'usd'}, {active: 'false'}, {type: 'UNKNOWN'}])('rejects unbounded or invalid direct reads %j', async filters => {
    const db = {$transaction: vi.fn()};
    const repository = new PrismaFinanceRepository(db);
    await expect(repository.listFinancialAccounts(filters as never)).rejects.toThrow('FINANCE_ACCOUNT_QUERY_INVALID');
    expect(db.$transaction).not.toHaveBeenCalled();
    const facade = new FinanceAdminUseCases(repository);
    expect(() => facade.listFinancialAccounts(filters as never)).toThrow('FINANCE_ACCOUNT_QUERY_INVALID');
  });
});
