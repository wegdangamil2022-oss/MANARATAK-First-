import {
  FinanceInvoiceDto,
  FinancePaymentDto,
  IFinanceRepository,
  InvoiceStatus,
  PaginatedFinanceResult,
} from '@manaratak/domain';

export class FinanceStudentUseCases {
  constructor(private readonly repository: IFinanceRepository) {}

  public async listStudentInvoices(
    studentReferenceId: string,
    pagination: { page?: number; pageSize?: number } = {},
  ): Promise<PaginatedFinanceResult<FinanceInvoiceDto>> {
    this.ensureStudentReference(studentReferenceId);
    return this.repository.listInvoices({
      studentReferenceId,
      page: Math.max(1, Math.trunc(pagination.page ?? 1)),
      pageSize: Math.min(100, Math.max(1, Math.trunc(pagination.pageSize ?? 50))),
    });
  }

  public async getStudentFinancialOverview(studentReferenceId: string) {
    this.ensureStudentReference(studentReferenceId);
    return this.repository.getStudentFinancialReadModel(studentReferenceId);
  }

  public async listHistory(
    studentReferenceId: string,
    kind: 'wallets' | 'transfers',
    pagination: { page?: number; pageSize?: number },
  ) {
    this.ensureStudentReference(studentReferenceId);
    return this.repository.listStudentFinancialHistory(studentReferenceId, kind, pagination);
  }

  public async getStudentInvoice(
    studentReferenceId: string,
    invoiceId: string,
  ): Promise<FinanceInvoiceDto> {
    this.ensureStudentReference(studentReferenceId);
    const invoice = await this.repository.findInvoiceById(invoiceId);
    if (!invoice || invoice.studentReferenceId !== studentReferenceId) {
      throw new Error('Invoice not found for student');
    }
    return invoice;
  }

  public async listStudentInvoicePayments(
    studentReferenceId: string,
    invoiceId: string,
  ): Promise<FinancePaymentDto[]> {
    const invoice = await this.getStudentInvoice(studentReferenceId, invoiceId);
    if (invoice.status === InvoiceStatus.DRAFT) {
      return [];
    }
    return (await this.repository.listPaymentsForInvoice(invoice.id)).map((payment) => ({
      ...payment,
      gatewayReference: null,
      metadata: null,
      failureReason: null,
    }));
  }

  private ensureStudentReference(studentReferenceId: string): void {
    if (!studentReferenceId.trim()) {
      throw new Error('studentReferenceId is required');
    }
  }
}
