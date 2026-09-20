import {
  CreateFinanceInvoiceDto,
  CreateFinancePaymentDto,
  FinanceInvoiceDto,
  FinanceInvoiceFilters,
  FinancePaymentDto,
  FinancePaymentFilters,
  PaginatedFinanceResult,
} from '../entities';
import { MoneyAmount } from '../value-objects';
import {
  CommissionDto,
  CreditNoteDto,
  ExchangeRateDto,
  FinanceOverviewDto,
  FinancialAccountDto,
  FinancialApprovalDto,
  FinancialEstimateDto,
  FinancialTransactionDto,
  InstallmentPlanDto,
  LedgerPostingInput,
  MoneyTransferDto,
  ReceiptDto,
  RefundDto,
  ReconciliationIssueDto,
  TransferStatus,
  WalletBalanceDto,
  WalletDto,
  WalletHoldDto,
} from '../entities/FinancePlatform';


export interface FinanceMutationContext {
  actorId: string;
  correlationId: string;
  idempotencyKey: string;
  reason?: string;
  expectedVersion?: number;
}
export interface FinanceApprovalBinding {
  approvalId: string;
  actionType: string;
  targetReferenceId: string;
  payloadHash: string;
  policyReference: string;
  makerId: string;
  amount?: MoneyAmount | null;
}
export interface PostLedgerTransactionInput extends FinanceMutationContext {
  businessReferenceType: string;
  businessReferenceId: string;
  postings: LedgerPostingInput[];
  reversalOfId?: string | null;
  approval?: FinanceApprovalBinding;
}

export interface IFinanceRepository {
  findInvoiceById(id: string): Promise<FinanceInvoiceDto | null>;
  findInvoiceByNumber(invoiceNumber: string): Promise<FinanceInvoiceDto | null>;
  findPaymentById(id: string): Promise<FinancePaymentDto | null>;
  listInvoices(filters: FinanceInvoiceFilters): Promise<PaginatedFinanceResult<FinanceInvoiceDto>>;
  listPayments(filters: FinancePaymentFilters): Promise<PaginatedFinanceResult<FinancePaymentDto>>;
  listPaymentsForInvoice(invoiceId: string): Promise<FinancePaymentDto[]>;

  createDraftInvoice(
    data: Omit<CreateFinanceInvoiceDto, 'status' | 'issuedAt'>,
    context: FinanceMutationContext,
  ): Promise<FinanceInvoiceDto>;
  updateDraftInvoice(
    id: string,
    lineItems: CreateFinanceInvoiceDto['lineItems'],
    total: MoneyAmount,
    context: FinanceMutationContext,
  ): Promise<FinanceInvoiceDto>;
  issueDraftInvoice(id: string, context: FinanceMutationContext): Promise<FinanceInvoiceDto>;
  voidInvoiceAtomic(id: string, context: FinanceMutationContext): Promise<FinanceInvoiceDto>;
  preparePaymentAttempt(
    data: CreateFinancePaymentDto,
    context: FinanceMutationContext,
  ): Promise<FinancePaymentDto>;
  recordPaymentAuthorization(
    paymentId: string,
    evidence: { gatewayReference: string; safeMaskedMetadata?: Record<string, string> },
    context: FinanceMutationContext,
  ): Promise<FinancePaymentDto>;
  recordPaymentFailure(
    paymentId: string,
    failureCode: string,
    context: FinanceMutationContext,
  ): Promise<FinancePaymentDto>;
  recordReconciledCapturedPaymentAtomic(
    paymentId: string,
    evidence: { gatewayReference: string; safeMaskedMetadata?: Record<string, string> },
    context: FinanceMutationContext,
  ): Promise<FinancePaymentDto>;
  recordCapturedPaymentAtomic(
    data: CreateFinancePaymentDto,
    context: FinanceMutationContext,
  ): Promise<FinancePaymentDto>;
  createCreditNote(
    invoiceId: string,
    amount: MoneyAmount,
    reason: string,
    context: FinanceMutationContext,
  ): Promise<CreditNoteDto>;
  createReceipt(
    invoiceId: string,
    paymentId: string,
    amount: MoneyAmount,
    context: FinanceMutationContext,
  ): Promise<ReceiptDto>;
  createInstallmentPlan(
    invoiceId: string,
    plan: Omit<InstallmentPlanDto, 'id' | 'publicId' | 'createdAt'>,
    context: FinanceMutationContext,
  ): Promise<InstallmentPlanDto>;

  createFinancialAccount(
    data: Omit<FinancialAccountDto, 'id' | 'createdAt' | 'version'>,
    context: FinanceMutationContext,
  ): Promise<FinancialAccountDto>;
  postLedgerTransaction(data: PostLedgerTransactionInput): Promise<FinancialTransactionDto>;
  reverseLedgerTransaction(
    transactionId: string,
    context: FinanceMutationContext,
    approval: FinanceApprovalBinding,
  ): Promise<FinancialTransactionDto>;

  createWallet(
    data: Omit<WalletDto, 'id' | 'createdAt' | 'updatedAt' | 'version'>,
    context: FinanceMutationContext,
  ): Promise<WalletDto>;
  getWallet(walletId: string): Promise<WalletDto | null>;
  getWalletBalance(walletId: string): Promise<WalletBalanceDto>;
  createWalletHold(
    walletId: string,
    amount: MoneyAmount,
    businessReferenceId: string,
    context: FinanceMutationContext,
  ): Promise<WalletHoldDto>;
  resolveWalletHold(
    holdId: string,
    action: 'RELEASE' | 'CAPTURE',
    context: FinanceMutationContext,
  ): Promise<WalletHoldDto>;

  saveExchangeRate(
    data: Omit<ExchangeRateDto, 'id' | 'createdAt'>,
    context: FinanceMutationContext,
  ): Promise<ExchangeRateDto>;
  findEffectiveExchangeRate(
    sourceCurrency: string,
    targetCurrency: string,
    at: Date,
  ): Promise<ExchangeRateDto | null>;
  listExchangeRates(): Promise<ExchangeRateDto[]>;
  activateExchangeRate(
    id: string,
    approval: FinanceApprovalBinding,
    context: FinanceMutationContext,
  ): Promise<ExchangeRateDto>;

  createTransfer(
    data: Omit<MoneyTransferDto, 'id' | 'createdAt' | 'updatedAt' | 'version'>,
    context: FinanceMutationContext,
  ): Promise<MoneyTransferDto>;
  getTransfer(id: string): Promise<MoneyTransferDto | null>;
  lockTransferRate(
    id: string,
    rate: ExchangeRateDto,
    targetAmount: MoneyAmount,
    context: FinanceMutationContext,
  ): Promise<MoneyTransferDto>;
  calculateTransferFee(
    id: string,
    feeAmount: MoneyAmount,
    policyReference: string,
    context: FinanceMutationContext,
  ): Promise<MoneyTransferDto>;
  transitionTransfer(
    id: string,
    status: TransferStatus,
    context: FinanceMutationContext,
    evidence?: {
      approval?: FinanceApprovalBinding;
      bankProvider?: string;
      bankProviderReference?: string;
      providerStatus?: 'PROCESSING' | 'SETTLED' | 'FAILED' | 'REVERSED';
      providerFailureCode?: string;
    },
  ): Promise<MoneyTransferDto>;
  listTransfers(): Promise<MoneyTransferDto[]>;

  createApproval(
    data: Omit<FinancialApprovalDto, 'id' | 'createdAt' | 'decisions'>,
    context: FinanceMutationContext,
  ): Promise<FinancialApprovalDto>;
  getApproval(id: string): Promise<FinancialApprovalDto | null>;
  decideApproval(
    id: string,
    decision: 'APPROVE' | 'REJECT',
    checkerId: string,
    reason: string | undefined,
    context: FinanceMutationContext,
  ): Promise<FinancialApprovalDto>;
  listApprovals(status?: string): Promise<FinancialApprovalDto[]>;

  createRefund(
    data: Omit<RefundDto, 'id' | 'createdAt'>,
    context: FinanceMutationContext,
  ): Promise<RefundDto>;
  getRefund(id: string): Promise<RefundDto | null>;
  beginRefundProcessing(
    id: string,
    approval: FinanceApprovalBinding,
    context: FinanceMutationContext,
  ): Promise<RefundDto>;
  completeRefundAtomic(
    id: string,
    providerEvidence: { gatewayProvider: string; gatewayReference: string },
    context: FinanceMutationContext,
  ): Promise<RefundDto>;
  failRefund(
    id: string,
    failureCode: string,
    context: FinanceMutationContext,
  ): Promise<RefundDto>;
  listRefunds(): Promise<RefundDto[]>;
  createCommission(
    data: Omit<CommissionDto, 'id' | 'createdAt' | 'updatedAt'>,
    context: FinanceMutationContext,
  ): Promise<CommissionDto>;
  listCommissions(): Promise<CommissionDto[]>;
  saveEstimate(
    data: Omit<FinancialEstimateDto, 'id' | 'generatedAt'>,
    context: FinanceMutationContext,
  ): Promise<FinancialEstimateDto>;
  runReconciliation(): Promise<ReconciliationIssueDto[]>;
  getFinanceOverview(): Promise<FinanceOverviewDto>;
  getFinancialReport(): Promise<import('../entities/FinancePlatform').FinancialReportDto>;
  getStudentFinancialReadModel(
    studentReferenceId: string,
  ): Promise<import('../entities/FinancePlatform').StudentFinancialReadModelDto>;
}
