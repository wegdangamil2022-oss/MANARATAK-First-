import { describe, expect, it, vi } from 'vitest';
import { FinanceAdminUseCases } from '../../src/finance-platform/use-cases/FinanceAdminUseCases';

describe('FinanceAdminUseCases read facade', () => {
  it('contains no financial mutation path', async () => {
    const repository = {
      listInvoices: vi
        .fn()
        .mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 }),
    } as any;
    const useCases = new FinanceAdminUseCases(repository);
    expect(await useCases.listInvoices({})).toEqual(expect.objectContaining({ total: 0 }));
    expect('issueInvoice' in useCases).toBe(false);
    expect('recordCapturedPayment' in useCases).toBe(false);
  });
});
