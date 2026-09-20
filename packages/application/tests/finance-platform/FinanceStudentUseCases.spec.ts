import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FinanceInvoiceDto, IFinanceRepository, InvoiceStatus } from '@manaratak/domain';
import { FinanceStudentUseCases } from '../../src/finance-platform/use-cases/FinanceStudentUseCases';

describe('FinanceStudentUseCases', () => {
  let repository: IFinanceRepository;
  let useCases: FinanceStudentUseCases;

  const invoice: FinanceInvoiceDto = {
    id: 'inv-1',
    publicId: 'fin_inv_1',
    invoiceNumber: 'INV-1',
    originDomain: 'SERVICES',
    originReferenceId: 'service-order-1',
    studentReferenceId: 'student-1',
    status: InvoiceStatus.ISSUED,
    totalAmount: { amountMinorUnits: '5000', currencyCode: 'USD', scale: 2 },
    amountDue: { amountMinorUnits: '5000', currencyCode: 'USD', scale: 2 },
    lineItems: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    repository = {
      findInvoiceById: vi.fn().mockResolvedValue(invoice),
      findInvoiceByNumber: vi.fn(),
      listInvoices: vi
        .fn()
        .mockResolvedValue({ data: [invoice], total: 1, page: 1, pageSize: 50, totalPages: 1 }),
      listPaymentsForInvoice: vi.fn().mockResolvedValue([]),
      getStudentFinancialReadModel: vi.fn(),
    } as unknown as IFinanceRepository;
    useCases = new FinanceStudentUseCases(repository);
  });

  it('lists invoices scoped to the requested student reference', async () => {
    await useCases.listStudentInvoices('student-1');

    expect(repository.listInvoices).toHaveBeenCalledWith({
      studentReferenceId: 'student-1',
      page: 1,
      pageSize: 50,
    });
  });

  it('prevents reading another student invoice', async () => {
    vi.mocked(repository.findInvoiceById).mockResolvedValueOnce({
      ...invoice,
      studentReferenceId: 'student-2',
    });

    await expect(useCases.getStudentInvoice('student-1', 'inv-1')).rejects.toThrow(
      'Invoice not found',
    );
  });
});
