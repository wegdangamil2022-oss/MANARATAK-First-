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
  ): Promise<PaginatedFinanceResult<FinanceInvoiceDto>> {
    this.ensureStudentReference(studentReferenceId);
    return this.repository.listInvoices({
      studentReferenceId,
      page: 1,
      pageSize: 50,
    });
  }

  public async getStudentFinancialOverview(studentReferenceId: string) {
    this.ensureStudentReference(studentReferenceId);
    return this.repository.getStudentFinancialReadModel(studentReferenceId);
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
    return this.repository.listPaymentsForInvoice(invoice.id);
  }

  private ensureStudentReference(studentReferenceId: string): void {
    if (!studentReferenceId.trim()) {
      throw new Error('studentReferenceId is required');
    }
  }
}
