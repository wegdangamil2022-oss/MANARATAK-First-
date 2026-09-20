import { MoneyAmount } from '../value-objects';

/** Canonical Phase 7 currency projection consumed by Finance. */
export interface CanonicalFinanceCurrency {
  referenceId: string;
  currencyCode: string;
  scale: number;
  active: boolean;
}
export interface IFinanceCurrencyReferenceGateway {
  resolveCurrency(currencyCode: string): Promise<CanonicalFinanceCurrency | null>;
}

export interface PaymentGatewayRequest {
  paymentReference: string;
  amount: MoneyAmount;
  paymentMethodToken: string;
  idempotencyKey: string;
}
export interface PaymentGatewayResult {
  status: 'AUTHORIZED' | 'CAPTURED' | 'COMPLETED' | 'FAILED';
  gatewayReference: string;
  safeMaskedMetadata?: Record<string, string>;
  failureCode?: string;
}
export type FinanceRuntimeCapabilityStatus = 'READY' | 'RUNTIME_PENDING' | 'NOT_CONFIGURED';

export interface IPaymentGateway {
  readonly providerKey: string;
  isConfigured(): boolean;
  runtimeStatus(): FinanceRuntimeCapabilityStatus;
  authorize(request: PaymentGatewayRequest): Promise<PaymentGatewayResult>;
  capture(
    gatewayReference: string,
    amount: MoneyAmount,
    idempotencyKey: string,
  ): Promise<PaymentGatewayResult>;
  refund(
    gatewayReference: string,
    amount: MoneyAmount,
    refundReference: string,
    idempotencyKey: string,
  ): Promise<PaymentGatewayResult>;
  getRefundStatus(
    refundReference: string,
    gatewayReference: string | undefined,
    idempotencyKey: string,
  ): Promise<PaymentGatewayResult>;
  getStatus(
    paymentReference: string,
    gatewayReference: string | undefined,
    idempotencyKey: string,
  ): Promise<PaymentGatewayResult>;
}
export interface IPaymentGatewayRegistry {
  get(providerKey: string): IPaymentGateway | null;
  list(): readonly IPaymentGateway[];
}

export interface IFxRateProvider {
  readonly providerKey: string;
  isConfigured(): boolean;
  fetchRate(
    sourceCurrency: string,
    targetCurrency: string,
  ): Promise<{
    numerator: string;
    denominator: string;
    providerReference: string;
    effectiveAt: Date;
  }>;
}

export interface BankTransferSubmission {
  transferReference: string;
  destinationReferenceId: string;
  sourceAmount: MoneyAmount;
  targetAmount: MoneyAmount;
  feeAmount: MoneyAmount;
  idempotencyKey: string;
}
export interface BankTransferEvidence {
  providerReference: string;
  status: 'PROCESSING' | 'SETTLED' | 'FAILED' | 'REVERSED';
  failureCode?: string;
}
export interface IBankTransferGateway {
  readonly providerKey: string;
  isConfigured(): boolean;
  runtimeStatus(): FinanceRuntimeCapabilityStatus;
  submit(request: BankTransferSubmission): Promise<BankTransferEvidence>;
  getStatus(providerReference: string, idempotencyKey: string): Promise<BankTransferEvidence>;
  reverse(providerReference: string, idempotencyKey: string): Promise<BankTransferEvidence>;
}
export interface IBankTransferGatewayRegistry {
  get(providerKey: string): IBankTransferGateway | null;
  list(): readonly IBankTransferGateway[];
}
