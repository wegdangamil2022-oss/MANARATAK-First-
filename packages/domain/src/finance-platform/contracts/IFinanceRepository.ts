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
  FinancialAccountFilters,
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
  WalletOperationsDto,
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

export interface FinanceListFilters {
  currencyCode?: string;
  minAmountMinorUnits?: string;
  maxAmountMinorUnits?: string;
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  provider?: string;
  ownerReferenceId?: string;
  from?: Date;
  to?: Date;
}
export interface IFinanceRepository {
  listFinancialAccounts(filters: FinancialAccountFilters): Promise<PaginatedFinanceResult<FinancialAccountDto>>;
  createAdjustmentCase(
    input: { publicId: string; reasonCode: string; supportingDocumentId: string; makerId: string },
    context: FinanceMutationContext,
  ): Promise<any>;
  getAdjustmentCase(reference: string): Promise<any | null>;

  serviceInvoiceClearance?(input:{invoiceId:string;originReferenceId:string;studentReferenceId:string}):Promise<{financiallyCleared:boolean;cancellationCleared:boolean}>;
  hasFinancialClearanceForOrigin(input: {
    originDomain: string;
    originReferenceId: string;
    studentReferenceId?: string;
  }): Promise<boolean>;
  claimPaymentCapture(id: string, context: FinanceMutationContext): Promise<boolean>;
  recordReconciliationRun(
    context: FinanceMutationContext,
    summary: Record<string, number>,
  ): Promise<void>;
  listStudentFinancialHistory(
    studentReferenceId: string,
    kind: 'wallets' | 'transfers',
    pagination: { page?: number; pageSize?: number },
  ): Promise<PaginatedFinanceResult<any>>;
  claimPaymentDispatch(id: string, context: FinanceMutationContext): Promise<boolean>;
  claimTransferSubmission(id: string, context: FinanceMutationContext): Promise<MoneyTransferDto>;
  recordTransferSubmission(
    id: string,
    evidence: import('./FinanceGateways').BankTransferEvidence,
    context: FinanceMutationContext,
  ): Promise<MoneyTransferDto>;
  markRefundUnknown(id: string, context: FinanceMutationContext): Promise<void>;
  claimReconciliationCandidates(
    kind: 'payment' | 'refund' | 'transfer',
    limit: number,
  ): Promise<any[]>;
  listFinanceRecords(
    kind: 'refunds' | 'transfers' | 'rates' | 'approvals' | 'commissions',
    filters: FinanceListFilters,
  ): Promise<PaginatedFinanceResult<any>>;
  getFinanceRecord(
    kind: 'refunds' | 'transfers' | 'approvals' | 'commissions' | 'payments',
    id: string,
  ): Promise<any | null>;
  getReconciliationSnapshot(): Promise<{
    issues: ReconciliationIssueDto[];
    status: string;
    asOf: Date | string | null;
    coverage: string;
  }>;

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
    evidence: {
      gatewayReference: string;
      safeMaskedMetadata?: Record<string, string>;
      providerEvidence?: Record<string, unknown>;
    },
    context: FinanceMutationContext,
  ): Promise<FinancePaymentDto>;
  recordPaymentFailure(
    paymentId: string,
    failureCode: string,
    context: FinanceMutationContext,
  ): Promise<FinancePaymentDto>;
  recordReconciledCapturedPaymentAtomic(
    paymentId: string,
    evidence: {
      gatewayReference: string;
      safeMaskedMetadata?: Record<string, string>;
      providerEvidence?: Record<string, unknown>;
    },
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
  getLedgerTransaction(id: string): Promise<FinancialTransactionDto | null>;
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
  getWalletOperations(walletId: string, page: number, pageSize: number): Promise<WalletOperationsDto>;
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
      providerEvidence?: import('./FinanceGateways').BankTransferEvidence;
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
    providerEvidence: {
      gatewayProvider: string;
      gatewayReference: string;
      attestation?: Record<string, unknown>;
    },
    context: FinanceMutationContext,
  ): Promise<RefundDto>;
  failRefund(id: string, failureCode: string, context: FinanceMutationContext): Promise<RefundDto>;
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
  runReconciliation(context?: FinanceMutationContext): Promise<ReconciliationIssueDto[]>;
  getFinanceOverview(): Promise<FinanceOverviewDto>;
  getFinancialReport(): Promise<import('../entities/FinancePlatform').FinancialReportDto>;
  getStudentFinancialReadModel(
    studentReferenceId: string,
  ): Promise<import('../entities/FinancePlatform').StudentFinancialReadModelDto>;
}
