import {
  FinanceInvoiceDto,
  FinanceInvoiceFilters,
  FinancePaymentDto,
  FinancePaymentFilters,
  IFinanceRepository,
  PaginatedFinanceResult,
} from '@manaratak/domain';

/** Read-only compatibility facade. All financial commands use FinancePlatformUseCases. */
export class FinanceAdminUseCases {
  constructor(private readonly repository: IFinanceRepository) {}
  listInvoices(filters: FinanceInvoiceFilters): Promise<PaginatedFinanceResult<FinanceInvoiceDto>> {
    return this.repository.listInvoices(filters);
  }
  async getInvoice(id: string): Promise<FinanceInvoiceDto> {
    const invoice = await this.repository.findInvoiceById(id);
    if (!invoice) throw new Error(`Invoice with id ${id} not found`);
    return invoice;
  }
  async listPaymentsForInvoice(invoiceId: string): Promise<FinancePaymentDto[]> {
    await this.getInvoice(invoiceId);
    return this.repository.listPaymentsForInvoice(invoiceId);
  }
  listPayments(filters: FinancePaymentFilters): Promise<PaginatedFinanceResult<FinancePaymentDto>> {
    return this.repository.listPayments(filters);
  }
}
