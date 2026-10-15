import { MoneyAmount, assertValidMoneyAmount } from './value-objects';
import type { FinancialAccountFilters } from './entities/FinancePlatform';

export function normalizeFinancialAccountFilters(filters: FinancialAccountFilters) {
  const page = filters.page ?? 1, pageSize = filters.pageSize ?? 20;
  if (!Number.isInteger(page) || page < 1 || page > 10000 ||
      !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50 ||
      (filters.ownerReferenceId !== undefined &&
        (!filters.ownerReferenceId.trim() || filters.ownerReferenceId.length > 160)) ||
      (filters.currencyCode !== undefined && !/^[A-Z]{3}$/.test(filters.currencyCode)) ||
      (filters.type !== undefined && !['ASSET', 'LIABILITY', 'REVENUE', 'EXPENSE', 'EQUITY'].includes(filters.type)) ||
      (filters.active !== undefined && typeof filters.active !== 'boolean'))
    throw new Error('FINANCE_ACCOUNT_QUERY_INVALID');
  return {page, pageSize, ownerReferenceId: filters.ownerReferenceId?.trim(),
    currencyCode: filters.currencyCode, type: filters.type, active: filters.active};
}

export function assertPositiveFinanceMoney(amount: MoneyAmount): void {
  if (!/^[1-9]\d{0,29}$/.test(amount.amountMinorUnits)) throw new Error('FINANCE_AMOUNT_INVALID');
  assertValidMoneyAmount(amount);
}
export const FINANCE_APPROVAL_ACTIONS = {
  TRANSFER_APPROVE: 'admin:finance:transfer:execute',
  REFUND_EXECUTE: 'admin:finance:refund:execute',
  MANUAL_FX_OVERRIDE: 'admin:finance:fx:approve',
  MANUAL_LEDGER_POST: 'admin:finance:ledger:post',
  MANUAL_LEDGER_REVERSE: 'admin:finance:ledger:reverse',
} as const;
export function financeApprovalPolicy(action: string) {
  if (!Object.hasOwn(FINANCE_APPROVAL_ACTIONS, action))
    throw new Error('FINANCE_APPROVAL_ACTION_UNSUPPORTED');
  // Conservative server-owned quorum: two distinct checkers for every consequential action.
  return {
    requiredApprovals: 2,
    maxAgeMs: 24 * 60 * 60 * 1000,
    reference: `FINANCE:${action}:TWO_CHECKERS_V2`,
    permission: FINANCE_APPROVAL_ACTIONS[action as keyof typeof FINANCE_APPROVAL_ACTIONS],
  };
}
export function assertFinanceAttestation(
  evidence: {
    amount?: MoneyAmount;
    merchantReference?: string;
    operationReference?: string;
    captureReference?: string;
    verified?: boolean;
  },
  amount: MoneyAmount,
  merchant: string | undefined,
  operationReference?: string,
): void {
  if (
    (operationReference !== undefined && evidence.operationReference !== operationReference) ||
    !evidence.verified ||
    !merchant ||
    evidence.merchantReference !== merchant ||
    !evidence.captureReference ||
    !evidence.amount ||
    evidence.amount.currencyCode !== amount.currencyCode ||
    evidence.amount.scale !== amount.scale ||
    evidence.amount.amountMinorUnits !== amount.amountMinorUnits
  )
    throw new Error('FINANCE_PROVIDER_EVIDENCE_MISMATCH');
}
export function assertFreshFxQuote(
  numerator: string,
  denominator: string,
  effectiveAt: Date,
  now = Date.now(),
): void {
  if (
    !/^[1-9]\d{0,29}$/.test(numerator) ||
    !/^[1-9]\d{0,29}$/.test(denominator) ||
    !Number.isFinite(effectiveAt.getTime()) ||
    now - effectiveAt.getTime() > 15 * 60 * 1000 ||
    effectiveAt.getTime() - now > 60 * 1000
  )
    throw new Error('FX_PROVIDER_RATE_INVALID');
}

export function assertBankTransferEvidence(
  evidence: {
    verified?: boolean;
    transferReference?: string;
    destinationReferenceId?: string;
    sourceAmount?: MoneyAmount;
    targetAmount?: MoneyAmount;
    feeAmount?: MoneyAmount;
  },
  transfer: {
    publicId: string;
    destinationReferenceId: string;
    sourceAmount: MoneyAmount;
    targetAmount?: MoneyAmount | null;
    feeAmount?: MoneyAmount | null;
  },
) {
  const same = (a: MoneyAmount | undefined, b: MoneyAmount | null | undefined) =>
    Boolean(
      a &&
      b &&
      a.amountMinorUnits === b.amountMinorUnits &&
      a.currencyCode === b.currencyCode &&
      a.scale === b.scale,
    );
  if (
    !evidence.verified ||
    evidence.transferReference !== transfer.publicId ||
    evidence.destinationReferenceId !== transfer.destinationReferenceId ||
    !same(evidence.sourceAmount, transfer.sourceAmount) ||
    !same(evidence.targetAmount, transfer.targetAmount) ||
    !same(evidence.feeAmount, transfer.feeAmount)
  )
    throw new Error('FINANCE_BANK_EVIDENCE_MISMATCH');
}
