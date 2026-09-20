import {
  MoneyAmount,
  addMoneyAmounts,
  assertSameCurrency,
  assertValidMoneyAmount,
  multiplyMoneyAmount,
} from '../value-objects';

export type LedgerDirection = 'DEBIT' | 'CREDIT';
export type FinancialAccountType = 'ASSET' | 'LIABILITY' | 'REVENUE' | 'EXPENSE' | 'EQUITY';
export type WalletStatus = 'ACTIVE' | 'FROZEN' | 'CLOSED';
export type TransferStatus =
  | 'REQUESTED'
  | 'VALIDATED'
  | 'RATE_LOCKED'
  | 'FEES_CALCULATED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'PROCESSING'
  | 'SETTLED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REVERSED';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
export type RefundStatus =
  | 'REQUESTED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';
export type CommissionStatus =
  'ACCRUED' | 'APPROVED' | 'PAYABLE' | 'SETTLED' | 'REVERSED' | 'DISPUTED';
export type InstallmentStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
const paymentTransitions: Record<string, readonly string[]> = {
  PENDING: ['AUTHORIZED', 'FAILED', 'CANCELLED'],
  AUTHORIZED: ['CAPTURED', 'FAILED', 'CANCELLED'],
  CAPTURED: ['PARTIALLY_REFUNDED', 'REFUNDED'],
  PARTIALLY_REFUNDED: ['PARTIALLY_REFUNDED', 'REFUNDED'],
  FAILED: [],
  CANCELLED: [],
  REFUNDED: [],
};
export function assertPaymentTransition(from: string, to: string): void {
  if (!paymentTransitions[from]?.includes(to))
    throw new Error(`Invalid payment transition: ${from} -> ${to}`);
}
const invoiceTransitions: Record<string, readonly string[]> = {
  DRAFT: ['ISSUED', 'VOIDED'],
  ISSUED: ['PARTIALLY_PAID', 'PAID', 'CREDITED', 'OVERDUE', 'VOIDED'],
  PARTIALLY_PAID: ['ISSUED', 'PAID', 'CREDITED', 'OVERDUE', 'VOIDED'],
  OVERDUE: ['PARTIALLY_PAID', 'PAID', 'CREDITED', 'VOIDED'],
  PAID: ['ISSUED', 'PARTIALLY_PAID'],
  CREDITED: [],
  VOIDED: [],
};
export function assertInvoiceTransition(from: string, to: string): void {
  if (!invoiceTransitions[from]?.includes(to))
    throw new Error(`Invalid invoice transition: ${from} -> ${to}`);
}

export interface FinancialAccountDto {
  id: string;
  publicId: string;
  ownerReferenceId: string;
  type: FinancialAccountType;
  currencyCode: string;
  scale: number;
  version: number;
  active: boolean;
  systemManaged: boolean;
  createdAt: Date | string;
}
export interface LedgerPostingInput {
  accountId: string;
  direction: LedgerDirection;
  amount: MoneyAmount;
  memo?: string | null;
}
export interface LedgerEntryDto extends LedgerPostingInput {
  id: string;
  transactionId: string;
  sequence: number;
  createdAt: Date | string;
}
export interface FinancialTransactionDto {
  id: string;
  publicId: string;
  correlationId: string;
  businessReferenceType: string;
  businessReferenceId: string;
  idempotencyKeyHash: string;
  currencyCode: string;
  scale: number;
  reversalOfId?: string | null;
  createdBy: string;
  createdAt: Date | string;
  entries: LedgerEntryDto[];
}

export function validateBalancedPostings(postings: readonly LedgerPostingInput[]): void {
  if (postings.length < 2)
    throw new Error('A financial transaction requires at least two postings');
  const first = postings[0].amount;
  let debits = BigInt(0);
  let credits = BigInt(0);
  for (const posting of postings) {
    assertValidMoneyAmount(posting.amount);
    assertSameCurrency(first, posting.amount);
    const units = BigInt(posting.amount.amountMinorUnits);
    if (units <= BigInt(0)) throw new Error('Ledger posting amount must be positive');
    if (posting.direction === 'DEBIT') debits += units;
    else credits += units;
  }
  if (debits !== credits) throw new Error('Unbalanced ledger transaction rejected');
}

export interface WalletDto {
  id: string;
  publicId: string;
  ownerReferenceId: string;
  accountId: string;
  currencyCode: string;
  scale: number;
  status: WalletStatus;
  version: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}
export interface WalletBalanceDto {
  walletId: string;
  currentBalance: MoneyAmount;
  availableBalance: MoneyAmount;
  lockedBalance: MoneyAmount;
  asOf: Date | string;
}
export interface WalletHoldDto {
  id: string;
  publicId: string;
  walletId: string;
  amount: MoneyAmount;
  status: 'ACTIVE' | 'RELEASED' | 'CAPTURED';
  businessReferenceId: string;
  expiresAt?: Date | string | null;
  createdAt: Date | string;
  resolvedAt?: Date | string | null;
}

export interface ExchangeRateDto {
  id: string;
  publicId: string;
  sourceCurrencyCode: string;
  targetCurrencyCode: string;
  rateNumerator: string;
  rateDenominator: string;
  source: 'MANUAL_OVERRIDE' | 'AUTOMATIC_PROVIDER';
  providerReference?: string | null;
  approved: boolean;
  makerId?: string | null;
  approvalId?: string | null;
  effectiveFrom: Date | string;
  effectiveTo?: Date | string | null;
  marginBasisPoints: number;
  createdAt: Date | string;
}
export interface CurrencyConversionDto {
  id: string;
  publicId: string;
  sourceAmount: MoneyAmount;
  targetAmount: MoneyAmount;
  rateId: string;
  rateNumerator: string;
  rateDenominator: string;
  marginBasisPoints: number;
  convertedAt: Date | string;
}

export function convertMoneyExact(
  source: MoneyAmount,
  targetCurrencyCode: string,
  targetScale: number,
  numerator: string,
  denominator: string,
  marginBasisPoints = 0,
): MoneyAmount {
  assertValidMoneyAmount(source);
  if (
    !/^\d+$/.test(numerator) ||
    !/^\d+$/.test(denominator) ||
    BigInt(numerator) <= BigInt(0) ||
    BigInt(denominator) <= BigInt(0)
  )
    throw new Error('Invalid exact exchange rate');
  if (!Number.isInteger(marginBasisPoints) || marginBasisPoints < 0 || marginBasisPoints > 10_000)
    throw new Error('Invalid exchange margin');
  const scaleFactor = BigInt(10) ** BigInt(targetScale) * BigInt(10_000 - marginBasisPoints);
  const sourceScale = BigInt(10) ** BigInt(source.scale);
  const converted =
    (BigInt(source.amountMinorUnits) * BigInt(numerator) * scaleFactor) /
    (BigInt(denominator) * sourceScale * BigInt(10_000));
  return {
    amountMinorUnits: converted.toString(),
    currencyCode: targetCurrencyCode,
    scale: targetScale,
  };
}

export interface MoneyTransferDto {
  id: string;
  publicId: string;
  sourceWalletId: string;
  destinationReferenceId: string;
  destinationCurrencyCode: string;
  sourceAmount: MoneyAmount;
  targetAmount?: MoneyAmount | null;
  rateId?: string | null;
  feeAmount?: MoneyAmount | null;
  feePolicyReference?: string | null;
  bankProvider?: string | null;
  bankProviderReference?: string | null;
  providerStatus?: string | null;
  settlementTransactionId?: string | null;
  reversalTransactionId?: string | null;
  status: TransferStatus;
  makerId: string;
  correlationId: string;
  idempotencyKeyHash: string;
  version: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}
const transferTransitions: Record<TransferStatus, readonly TransferStatus[]> = {
  REQUESTED: ['VALIDATED', 'REJECTED', 'CANCELLED'],
  VALIDATED: ['RATE_LOCKED', 'REJECTED', 'CANCELLED'],
  RATE_LOCKED: ['FEES_CALCULATED', 'CANCELLED'],
  FEES_CALCULATED: ['PENDING_APPROVAL', 'CANCELLED'],
  PENDING_APPROVAL: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SETTLED', 'FAILED'],
  SETTLED: ['COMPLETED', 'REVERSED'],
  COMPLETED: ['REVERSED'],
  REJECTED: [],
  FAILED: [],
  CANCELLED: [],
  REVERSED: [],
};
export function assertTransferTransition(from: TransferStatus, to: TransferStatus): void {
  if (!transferTransitions[from].includes(to))
    throw new Error(`Invalid transfer transition: ${from} -> ${to}`);
}

export interface FinancialApprovalDto {
  id: string;
  publicId: string;
  actionType: string;
  targetReferenceId: string;
  amount?: MoneyAmount | null;
  makerId: string;
  requiredApprovals: number;
  payloadHash: string;
  policyReference: string;
  consumedAt?: Date | string | null;
  status: ApprovalStatus;
  expiresAt?: Date | string | null;
  createdAt: Date | string;
  decisions: ApprovalDecisionDto[];
}
export interface ApprovalDecisionDto {
  id: string;
  approverId: string;
  decision: 'APPROVE' | 'REJECT';
  reason?: string | null;
  decidedAt: Date | string;
}
export function assertCheckerEligible(
  makerId: string,
  checkerId: string,
  previous: readonly ApprovalDecisionDto[],
): void {
  if (makerId === checkerId) throw new Error('Maker cannot approve their own financial action');
  if (previous.some((item) => item.approverId === checkerId))
    throw new Error('Checker already decided this approval');
}

export interface RefundDto {
  id: string;
  publicId: string;
  paymentId: string;
  amount: MoneyAmount;
  reason: string;
  status: RefundStatus;
  makerId: string;
  approvalId?: string | null;
  gatewayProvider?: string | null;
  gatewayReference?: string | null;
  failureCode?: string | null;
  completedAt?: Date | string | null;
  createdAt: Date | string;
}
export interface CreditNoteDto {
  id: string;
  publicId: string;
  invoiceId: string;
  amount: MoneyAmount;
  reason: string;
  issuedBy: string;
  issuedAt: Date | string;
}
export interface ReceiptDto {
  id: string;
  publicId: string;
  invoiceId: string;
  paymentId: string;
  amount: MoneyAmount;
  issuedAt: Date | string;
}
export interface InstallmentDto {
  id: string;
  amount: MoneyAmount;
  dueDate: Date | string;
  status: InstallmentStatus;
  paidPaymentId?: string | null;
}
export interface InstallmentPlanDto {
  id: string;
  publicId: string;
  invoiceId: string;
  totalAmount: MoneyAmount;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  installments: InstallmentDto[];
  createdAt: Date | string;
}
export function validateInstallmentPlan(
  total: MoneyAmount,
  installments: readonly Pick<InstallmentDto, 'amount' | 'dueDate'>[],
): void {
  if (!installments.length) throw new Error('Installment plan requires installments');
  const sum = addMoneyAmounts(installments.map((item) => item.amount));
  assertSameCurrency(total, sum);
  if (sum.amountMinorUnits !== total.amountMinorUnits)
    throw new Error('Installment totals must equal invoice total');
  for (let index = 1; index < installments.length; index += 1)
    if (
      new Date(installments[index].dueDate).getTime() <=
      new Date(installments[index - 1].dueDate).getTime()
    )
      throw new Error('Installment due dates must be strictly increasing');
}

export interface CommissionDto {
  id: string;
  publicId: string;
  recipientReferenceId: string;
  sourcePaymentId: string;
  amount: MoneyAmount;
  status: CommissionStatus;
  policyReference: string;
  calculationBasisPoints?: number | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}
export interface FinancialEstimateLineDto {
  category: string;
  amount: MoneyAmount;
  sourceReference: string;
  certainty: 'EXACT' | 'ESTIMATED';
  convertedAmount?: MoneyAmount;
  rateId?: string;
}
export interface FinancialEstimateDto {
  id: string;
  publicId: string;
  subjectReferenceId?: string | null;
  displayCurrencyCode: string;
  lines: FinancialEstimateLineDto[];
  total: MoneyAmount;
  generatedAt: Date | string;
}
export function calculateInvoiceLines(
  lines: readonly {
    description: string;
    quantity: number;
    unitPrice: MoneyAmount;
    metadata?: Record<string, unknown> | null;
  }[],
) {
  const calculated = lines.map((line) => ({
    ...line,
    totalPrice: multiplyMoneyAmount(line.unitPrice, line.quantity),
  }));
  return { lines: calculated, total: addMoneyAmounts(calculated.map((line) => line.totalPrice)) };
}

export interface ReconciliationIssueDto {
  code:
    | 'LEDGER_IMBALANCE'
    | 'CAPTURE_WITHOUT_POSTING'
    | 'PAID_INVOICE_DUE'
    | 'WALLET_BALANCE_MISMATCH'
    | 'ORPHAN_SETTLEMENT'
    | 'DUPLICATE_GATEWAY_CALLBACK'
    | 'FX_MISMATCH';
  severity: 'CRITICAL' | 'HIGH';
  referenceId: string;
  details: string;
}
export interface FinanceOverviewDto {
  collectedToday?: MoneyAmount;
  outstanding?: MoneyAmount;
  pendingPayments: number | null;
  pendingTransfers: number | null;
  walletLiability?: MoneyAmount;
  refunds?: MoneyAmount;
  pendingApprovals: number | null;
  reconciliationHealth: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' | 'UNKNOWN';
  attention: ReconciliationIssueDto[];
}
export interface FinancialReportDto {
  generatedAt: Date | string;
  revenueByCurrency: Record<string, string>;
  outstandingByCurrency: Record<string, string>;
  refundsByCurrency: Record<string, string>;
  transferVolumeByCurrency: Record<string, string>;
  walletLiabilityByCurrency: Record<string, string>;
  commissionsByCurrency: Record<string, string>;
  reconciliationStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
}
export interface StudentFinancialReadModelDto {
  studentReferenceId: string;
  invoices: import('./FinanceInvoice').FinanceInvoiceDto[];
  wallets: Array<{ wallet: WalletDto; balance: WalletBalanceDto }>;
  transfers: MoneyTransferDto[];
  generatedAt: Date | string;
}
