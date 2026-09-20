import { createHash, randomUUID } from 'node:crypto';
import {
  assertCheckerEligible,
  assertSameCurrency,
  assertTransferTransition,
  assertValidMoneyAmount,
  calculateInvoiceLines,
  compareMoneyAmounts,
  convertMoneyExact,
  FinanceApprovalBinding,
  FinanceMutationContext,
  FinancePaymentDto,
  FinancialEstimateDto,
  IBankTransferGatewayRegistry,
  IFinanceCurrencyReferenceGateway,
  IFinanceRepository,
  IFxRateProvider,
  InvoiceStatus,
  IPaymentGatewayRegistry,
  MoneyAmount,
  MoneyTransferDto,
  RefundDto,
  ExchangeRateDto,
  PaymentStatus,
  TransferStatus,
  validateBalancedPostings,
  validateInstallmentPlan,
} from '@manaratak/domain';

export interface FinanceCommandIdentity {
  actorId: string;
  correlationId?: string;
  idempotencyKey: string;
  reason?: string;
}
export interface FinanceTransferFeePolicy {
  policyReference: string;
  basisPoints: number;
}
export interface FinancePlatformDependencies {
  currencyReference: IFinanceCurrencyReferenceGateway;
  paymentGateways: IPaymentGatewayRegistry;
  bankTransferGateways: IBankTransferGatewayRegistry;
  fxRateProvider: IFxRateProvider;
  transferFeePolicy: FinanceTransferFeePolicy;
}

const context = (identity: FinanceCommandIdentity): FinanceMutationContext => {
  if (!identity.actorId.trim()) throw new Error('Authenticated actor is required');
  if (!identity.idempotencyKey.trim()) throw new Error('Idempotency key is required');
  return { ...identity, correlationId: identity.correlationId?.trim() || randomUUID() };
};
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const stable = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stable(record[key])}`)
    .join(',')}}`;
};
const payloadHash = (value: unknown) => hash(stable(value));
const RESERVED_SYSTEM_ACCOUNT_IDENTITIES = [
  'ACCOUNTS_RECEIVABLE',
  'PAYMENT_CLEARING',
  'TRANSFER_SETTLEMENT_CLEARING',
  'WALLET_SETTLEMENT_CLEARING',
];
const isReservedAccountIdentity = (ownerReferenceId: string) =>
  RESERVED_SYSTEM_ACCOUNT_IDENTITIES.includes(ownerReferenceId) ||
  ownerReferenceId.startsWith('REVENUE:') ||
  ownerReferenceId.startsWith('SYSTEM:');

const approvalPolicy = (actionType: string) => `FINANCE:${actionType}:FOUR_EYES_V1`;

export class FinancePlatformUseCases {
  constructor(
    private readonly repository: IFinanceRepository,
    private readonly dependencies: FinancePlatformDependencies,
  ) {
    if (!dependencies?.currencyReference) throw new Error('Finance canonical currency gateway is required');
    if (!dependencies?.paymentGateways) throw new Error('Finance payment gateway registry is required');
    if (!dependencies?.bankTransferGateways)
      throw new Error('Finance bank transfer gateway registry is required');
    if (!dependencies?.fxRateProvider) throw new Error('Finance FX rate provider is required');
    if (
      !dependencies.transferFeePolicy ||
      !Number.isInteger(dependencies.transferFeePolicy.basisPoints) ||
      dependencies.transferFeePolicy.basisPoints < 0 ||
      dependencies.transferFeePolicy.basisPoints > 10_000
    )
      throw new Error('Valid transfer fee policy is required');
  }

  async postLedger(
    input: {
      businessReferenceType: string;
      businessReferenceId: string;
      postings: Parameters<typeof validateBalancedPostings>[0];
      approvalId: string;
    },
    identity: FinanceCommandIdentity,
  ) {
    validateBalancedPostings(input.postings);
    await Promise.all(input.postings.map((item) => this.assertCanonicalMoney(item.amount)));
    const commandPayload = {
      businessReferenceType: input.businessReferenceType,
      businessReferenceId: input.businessReferenceId,
      postings: input.postings,
    };
    const approval = await this.requireBoundApproval(
      input.approvalId,
      'MANUAL_LEDGER_POST',
      input.businessReferenceId,
      identity.actorId,
      payloadHash(commandPayload),
    );
    return this.repository.postLedgerTransaction({
      ...context(identity),
      businessReferenceType: input.businessReferenceType,
      businessReferenceId: input.businessReferenceId,
      postings: [...input.postings],
      approval,
    });
  }

  async createFinancialAccount(
    input: {
      publicId?: string;
      ownerReferenceId: string;
      type: 'ASSET' | 'LIABILITY' | 'REVENUE' | 'EXPENSE' | 'EQUITY';
      currencyCode: string;
      scale: number;
    },
    identity: FinanceCommandIdentity,
  ) {
    if (isReservedAccountIdentity(input.ownerReferenceId))
      throw new Error('Reserved finance system-account identity cannot be created through Admin API');
    await this.assertCanonicalCurrency(input.currencyCode, input.scale);
    return this.repository.createFinancialAccount(
      {
        publicId: input.publicId || `fin_account_${randomUUID()}`,
        ownerReferenceId: input.ownerReferenceId,
        type: input.type,
        currencyCode: input.currencyCode,
        scale: input.scale,
        active: true,
        systemManaged: false,
      },
      context(identity),
    );
  }

  async createWallet(
    input: { ownerReferenceId: string; accountId: string; currencyCode: string; scale: number },
    identity: FinanceCommandIdentity,
  ) {
    await this.assertCanonicalCurrency(input.currencyCode, input.scale);
    return this.repository.createWallet(
      { publicId: `fin_wallet_${randomUUID()}`, ...input, status: 'ACTIVE' },
      context(identity),
    );
  }

  async reverseLedger(
    transactionId: string,
    approvalId: string,
    identity: FinanceCommandIdentity,
  ) {
    const approval = await this.requireBoundApproval(
      approvalId,
      'MANUAL_LEDGER_REVERSE',
      transactionId,
      identity.actorId,
      payloadHash({ transactionId }),
    );
    return this.repository.reverseLedgerTransaction(transactionId, context(identity), approval);
  }

  async createDraftInvoice(
    input: {
      originDomain: string;
      originReferenceId: string;
      studentReferenceId?: string | null;
      payerReferenceId?: string | null;
      lineItems: Array<{
        description: string;
        quantity: number;
        unitPrice: MoneyAmount;
        metadata?: Record<string, unknown> | null;
      }>;
      dueDate?: Date | string | null;
    },
    identity: FinanceCommandIdentity,
  ) {
    if (!input.originDomain.trim() || !input.originReferenceId.trim())
      throw new Error('Origin reference is required');
    await Promise.all(input.lineItems.map((line) => this.assertCanonicalMoney(line.unitPrice)));
    const calculated = calculateInvoiceLines(input.lineItems);
    return this.repository.createDraftInvoice(
      {
        publicId: `fin_inv_${randomUUID()}`,
        invoiceNumber: `DRAFT-${randomUUID()}`,
        originDomain: input.originDomain,
        originReferenceId: input.originReferenceId,
        studentReferenceId: input.studentReferenceId,
        payerReferenceId: input.payerReferenceId,
        totalAmount: calculated.total,
        amountDue: calculated.total,
        lineItems: calculated.lines,
        dueDate: input.dueDate,
      },
      context(identity),
    );
  }

  async updateDraftInvoice(
    invoiceId: string,
    lineItems: Array<{
      description: string;
      quantity: number;
      unitPrice: MoneyAmount;
      metadata?: Record<string, unknown> | null;
    }>,
    identity: FinanceCommandIdentity,
  ) {
    const invoice = await this.requireInvoice(invoiceId);
    if (invoice.status !== InvoiceStatus.DRAFT) throw new Error('Only DRAFT invoices can be edited');
    await Promise.all(lineItems.map((line) => this.assertCanonicalMoney(line.unitPrice)));
    const calculated = calculateInvoiceLines(lineItems);
    return this.repository.updateDraftInvoice(invoiceId, calculated.lines, calculated.total, context(identity));
  }

  async issueInvoice(invoiceId: string, identity: FinanceCommandIdentity) {
    const invoice = await this.requireInvoice(invoiceId);
    if (invoice.status !== InvoiceStatus.DRAFT) throw new Error('Only DRAFT invoices can be issued');
    if (invoice.dueDate && new Date(invoice.dueDate).getTime() <= Date.now())
      throw new Error('Invoice due date must be in the future');
    await this.assertCanonicalMoney(invoice.totalAmount);
    return this.repository.issueDraftInvoice(invoiceId, context(identity));
  }

  async voidInvoice(invoiceId: string, identity: FinanceCommandIdentity) {
    const invoice = await this.requireInvoice(invoiceId);
    if (![InvoiceStatus.DRAFT, InvoiceStatus.ISSUED, InvoiceStatus.OVERDUE].includes(invoice.status))
      throw new Error('Invoice cannot be voided after payment or credit settlement');
    return this.repository.voidInvoiceAtomic(invoiceId, context(identity));
  }

  async getInvoiceClearance(invoiceId: string) {
    const invoice = await this.requireInvoice(invoiceId);
    const financiallyCleared =
      BigInt(invoice.amountDue.amountMinorUnits) === 0n &&
      [InvoiceStatus.PAID, InvoiceStatus.CREDITED].includes(invoice.status);
    return {
      invoiceId: invoice.id,
      invoiceStatus: invoice.status,
      amountDueMinorUnits: invoice.amountDue.amountMinorUnits,
      financiallyCleared,
    };
  }

  async hasFinancialClearanceForOrigin(input: {
    originDomain: string;
    originReferenceId: string;
    studentReferenceId?: string;
  }): Promise<boolean> {
    if (!input.originDomain.trim() || !input.originReferenceId.trim()) return false;
    let page = 1;
    let hasEffectiveInvoice = false;
    do {
      const invoices = await this.repository.listInvoices({
        originDomain: input.originDomain,
        originReferenceId: input.originReferenceId,
        studentReferenceId: input.studentReferenceId,
        page,
        pageSize: 100,
      });
      for (const invoice of invoices.data) {
        // Drafts are not obligations and voided invoices are intentionally neutral. Every other
        // invoice for the same origin/student must be settled so an older PAID invoice cannot
        // accidentally mask a newer outstanding charge.
        if ([InvoiceStatus.DRAFT, InvoiceStatus.VOIDED].includes(invoice.status)) continue;
        hasEffectiveInvoice = true;
        const cleared =
          BigInt(invoice.amountDue.amountMinorUnits) === 0n &&
          [InvoiceStatus.PAID, InvoiceStatus.CREDITED].includes(invoice.status);
        if (!cleared) return false;
      }
      if (page >= invoices.totalPages) return hasEffectiveInvoice;
      page += 1;
    } while (true);
  }

  runtimeReadiness() {
    const paymentProviders = this.dependencies.paymentGateways.list().map((provider) => ({
      providerKey: provider.providerKey,
      status: provider.runtimeStatus(),
    }));
    const bankProviders = this.dependencies.bankTransferGateways.list().map((provider) => ({
      providerKey: provider.providerKey,
      status: provider.runtimeStatus(),
    }));
    const fxProvider = {
      providerKey: this.dependencies.fxRateProvider.providerKey,
      status: this.dependencies.fxRateProvider.isConfigured() ? 'READY' as const : 'NOT_CONFIGURED' as const,
    };
    const states = [...paymentProviders, ...bankProviders, fxProvider].map((provider) => provider.status);
    const overall = states.every((state) => state === 'READY')
      ? 'READY' as const
      : states.some((state) => state === 'READY')
        ? 'PARTIAL' as const
        : 'NOT_CONFIGURED' as const;
    return {
      overall,
      paymentProviders,
      bankProviders,
      inboundWebhookVerification: 'SOURCE_AVAILABLE' as const,
      manualOfflinePaymentReview: 'NOT_ENABLED' as const,
      automaticFxProvider: fxProvider,
      note: 'Signed provider transports are source-complete; deployed provider/webhook runtime evidence is required separately.',
    };
  }

  async capturePayment(
    input: {
      invoiceId: string;
      amount: MoneyAmount;
      paymentMethodToken: string;
      gatewayProvider: string;
    },
    identity: FinanceCommandIdentity,
  ) {
    const invoice = await this.requireInvoice(input.invoiceId);
    if (![InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE].includes(invoice.status))
      throw new Error('Invoice is not payable');
    await this.assertCanonicalMoney(input.amount);
    assertSameCurrency(invoice.amountDue, input.amount);
    if (BigInt(input.amount.amountMinorUnits) <= BigInt(0) || compareMoneyAmounts(input.amount, invoice.amountDue) === 1)
      throw new Error('Payment amount must be positive and cannot exceed amountDue');
    if (/\b(?:\d[ -]*?){13,19}\b/.test(input.paymentMethodToken))
      throw new Error('Raw card PAN is forbidden; provide a provider token');

    const gateway = this.requirePaymentGateway(input.gatewayProvider);
    const paymentReference = `fin_pay_${hash(identity.idempotencyKey).slice(0, 32)}`;
    const pending = await this.repository.preparePaymentAttempt(
      {
        publicId: paymentReference,
        invoiceId: input.invoiceId,
        idempotencyKey: hash(identity.idempotencyKey),
        amount: input.amount,
        status: PaymentStatus.PENDING,
        paymentMethod: 'PROVIDER_TOKEN',
        gatewayProvider: gateway.providerKey,
      },
      context(identity),
    );
    if (pending.status === PaymentStatus.CAPTURED) return pending;
    if (pending.status === PaymentStatus.FAILED)
      throw new Error(`PAYMENT_ATTEMPT_ALREADY_FAILED_USE_NEW_IDEMPOTENCY_KEY:${pending.failureReason || 'UNKNOWN'}`);

    let authorized: {
      status: 'AUTHORIZED' | 'CAPTURED' | 'COMPLETED' | 'FAILED';
      gatewayReference: string;
      safeMaskedMetadata?: Record<string, string>;
      failureCode?: string;
    };
    if (pending.status === PaymentStatus.AUTHORIZED) {
      if (!pending.gatewayReference) throw new Error('AUTHORIZED_PAYMENT_MISSING_PROVIDER_REFERENCE');
      authorized = {
        status: 'AUTHORIZED',
        gatewayReference: pending.gatewayReference,
        safeMaskedMetadata: pending.metadata as Record<string, string> | undefined,
      };
    } else {
      // Transport exceptions are ambiguous. Keep PENDING so a retry with the same idempotency key
      // can ask the provider for the same authorization instead of creating a second charge.
      authorized = await gateway.authorize({
        paymentReference: pending.publicId,
        amount: input.amount,
        paymentMethodToken: input.paymentMethodToken,
        idempotencyKey: `${identity.idempotencyKey}:authorize`,
      });
      if (authorized.status === 'FAILED') {
        await this.repository.recordPaymentFailure(
          pending.id,
          authorized.failureCode || 'AUTHORIZATION_FAILED',
          context(identity),
        );
        throw new Error(`PAYMENT_AUTHORIZATION_FAILED:${authorized.failureCode || 'UNKNOWN'}`);
      }
      await this.repository.recordPaymentAuthorization(
        pending.id,
        { gatewayReference: authorized.gatewayReference, safeMaskedMetadata: authorized.safeMaskedMetadata },
        context(identity),
      );
    }

    // A transport exception after authorization is also ambiguous. Leave AUTHORIZED and retry
    // capture with the same provider idempotency key; never fabricate a failed or captured state.
    const captured = authorized.status === 'CAPTURED'
      ? authorized
      : await gateway.capture(authorized.gatewayReference, input.amount, `${identity.idempotencyKey}:capture`);
    if (captured.status === 'FAILED') {
      await this.repository.recordPaymentFailure(
        pending.id,
        captured.failureCode || 'CAPTURE_FAILED',
        context(identity),
      );
      throw new Error(`PAYMENT_CAPTURE_FAILED:${captured.failureCode || 'UNKNOWN'}`);
    }
    if (captured.status !== 'CAPTURED')
      throw new Error(`PAYMENT_CAPTURE_NOT_PROVEN:${captured.status}`);

    return this.repository.recordCapturedPaymentAtomic(
      {
        publicId: pending.publicId,
        invoiceId: input.invoiceId,
        idempotencyKey: hash(identity.idempotencyKey),
        amount: input.amount,
        status: PaymentStatus.CAPTURED,
        paymentMethod: 'PROVIDER_TOKEN',
        gatewayProvider: gateway.providerKey,
        gatewayReference: captured.gatewayReference,
        capturedAt: new Date(),
        metadata: captured.safeMaskedMetadata || authorized.safeMaskedMetadata,
      },
      context(identity),
    );
  }

  async createWalletHold(
    input: { walletId: string; amount: MoneyAmount; businessReferenceId: string },
    identity: FinanceCommandIdentity,
  ) {
    await this.assertCanonicalMoney(input.amount);
    if (BigInt(input.amount.amountMinorUnits) <= BigInt(0)) throw new Error('Hold must be positive');
    return this.repository.createWalletHold(input.walletId, input.amount, input.businessReferenceId, context(identity));
  }
  async resolveWalletHold(holdId: string, action: 'RELEASE' | 'CAPTURE', identity: FinanceCommandIdentity) {
    return this.repository.resolveWalletHold(holdId, action, context(identity));
  }

  async convert(input: { amount: MoneyAmount; targetCurrencyCode: string; targetScale: number; at?: Date }) {
    await this.assertCanonicalMoney(input.amount);
    await this.assertCanonicalCurrency(input.targetCurrencyCode, input.targetScale);
    const rate = await this.repository.findEffectiveExchangeRate(input.amount.currencyCode, input.targetCurrencyCode, input.at ?? new Date());
    if (!rate) throw new Error('No approved effective exchange rate; conversion failed closed');
    return {
      amount: convertMoneyExact(input.amount, input.targetCurrencyCode, input.targetScale, rate.rateNumerator, rate.rateDenominator, rate.marginBasisPoints),
      rate,
    };
  }

  async transitionTransfer(
    id: string,
    to: TransferStatus,
    identity: FinanceCommandIdentity,
    options: { approvalId?: string } = {},
  ) {
    const transfer = await this.requireTransfer(id);
    assertTransferTransition(transfer.status, to);
    await this.assertCanonicalMoney(transfer.sourceAmount);
    const wallet = await this.repository.getWallet(transfer.sourceWalletId);
    if (!wallet || wallet.status !== 'ACTIVE') throw new Error('Source wallet is not active');
    if (wallet.currencyCode !== transfer.sourceAmount.currencyCode || wallet.scale !== transfer.sourceAmount.scale)
      throw new Error('Transfer source denomination does not match wallet denomination');

    if (to === 'RATE_LOCKED') {
      const target = await this.requireCanonicalCurrency(transfer.destinationCurrencyCode);
      const rate = await this.repository.findEffectiveExchangeRate(transfer.sourceAmount.currencyCode, target.currencyCode, new Date());
      if (!rate) throw new Error('Transfer cannot lock rate without an approved effective FX rate');
      const targetAmount = convertMoneyExact(transfer.sourceAmount, target.currencyCode, target.scale, rate.rateNumerator, rate.rateDenominator, rate.marginBasisPoints);
      return this.repository.lockTransferRate(transfer.id, rate, targetAmount, context(identity));
    }
    if (to === 'FEES_CALCULATED') {
      if (!transfer.targetAmount || !transfer.rateId) throw new Error('Transfer rate must be locked before fee calculation');
      const units = BigInt(transfer.sourceAmount.amountMinorUnits);
      const feeUnits = (units * BigInt(this.dependencies.transferFeePolicy.basisPoints)) / BigInt(10_000);
      const fee = { ...transfer.sourceAmount, amountMinorUnits: feeUnits.toString() };
      return this.repository.calculateTransferFee(transfer.id, fee, this.dependencies.transferFeePolicy.policyReference, context(identity));
    }
    if (to === 'APPROVED') {
      if (!options.approvalId) throw new Error('Bound transfer approvalId is required');
      const approval = await this.requireBoundApproval(
        options.approvalId,
        'TRANSFER_APPROVE',
        transfer.publicId,
        transfer.makerId,
        payloadHash(this.transferApprovalPayload(transfer)),
        transfer.sourceAmount,
      );
      return this.repository.transitionTransfer(transfer.id, to, context(identity), { approval });
    }
    if (to === 'PROCESSING') {
      if (!transfer.targetAmount || !transfer.feeAmount || !transfer.rateId || !transfer.feePolicyReference)
        throw new Error('Transfer financial snapshot is incomplete');
      if (!transfer.bankProvider) throw new Error('Transfer bank provider is required');
      const gateway = this.requireBankGateway(transfer.bankProvider);
      const evidence = await gateway.submit({
        transferReference: transfer.publicId,
        destinationReferenceId: transfer.destinationReferenceId,
        sourceAmount: transfer.sourceAmount,
        targetAmount: transfer.targetAmount,
        feeAmount: transfer.feeAmount,
        idempotencyKey: `${identity.idempotencyKey}:bank-submit`,
      });
      if (evidence.status !== 'PROCESSING') throw new Error(`BANK_SUBMISSION_NOT_ACCEPTED:${evidence.failureCode || evidence.status}`);
      return this.repository.transitionTransfer(transfer.id, to, context(identity), {
        bankProvider: gateway.providerKey,
        bankProviderReference: evidence.providerReference,
        providerStatus: evidence.status,
      });
    }
    if (to === 'SETTLED' || to === 'FAILED') {
      if (!transfer.bankProvider || !transfer.bankProviderReference)
        throw new Error('Bank provider evidence is missing');
      const gateway = this.requireBankGateway(transfer.bankProvider);
      const evidence = await gateway.getStatus(transfer.bankProviderReference, `${identity.idempotencyKey}:bank-status`);
      if (to === 'SETTLED' && evidence.status !== 'SETTLED')
        throw new Error(`BANK_SETTLEMENT_NOT_PROVEN:${evidence.status}`);
      if (to === 'FAILED' && evidence.status !== 'FAILED')
        throw new Error(`BANK_FAILURE_NOT_PROVEN:${evidence.status}`);
      return this.repository.transitionTransfer(transfer.id, to, context(identity), {
        bankProvider: gateway.providerKey,
        bankProviderReference: evidence.providerReference,
        providerStatus: evidence.status,
        providerFailureCode: evidence.failureCode,
      });
    }
    if (to === 'REVERSED') {
      if (!transfer.bankProvider || !transfer.bankProviderReference)
        throw new Error('Transfer reversal requires original bank provider evidence');
      const gateway = this.requireBankGateway(transfer.bankProvider);
      const evidence = await gateway.reverse(
        transfer.bankProviderReference,
        `${identity.idempotencyKey}:bank-reverse`,
      );
      if (evidence.status !== 'REVERSED' || evidence.providerReference !== transfer.bankProviderReference)
        throw new Error(`BANK_REVERSAL_NOT_PROVEN:${evidence.status}`);
      return this.repository.transitionTransfer(transfer.id, to, context(identity), {
        bankProvider: gateway.providerKey,
        bankProviderReference: evidence.providerReference,
        providerStatus: evidence.status,
        providerFailureCode: evidence.failureCode,
      });
    }
    return this.repository.transitionTransfer(transfer.id, to, context(identity));
  }

  async requestTransfer(
    input: {
      sourceWalletId: string;
      destinationReferenceId: string;
      destinationCurrencyCode: string;
      bankProvider: string;
      sourceAmount: MoneyAmount;
    },
    identity: FinanceCommandIdentity,
  ) {
    await this.assertCanonicalMoney(input.sourceAmount);
    await this.requireCanonicalCurrency(input.destinationCurrencyCode);
    if (BigInt(input.sourceAmount.amountMinorUnits) <= BigInt(0)) throw new Error('Transfer amount must be positive');
    const wallet = await this.repository.getWallet(input.sourceWalletId);
    if (!wallet || wallet.status !== 'ACTIVE') throw new Error('Source wallet is not active');
    if (wallet.currencyCode !== input.sourceAmount.currencyCode || wallet.scale !== input.sourceAmount.scale)
      throw new Error('Transfer source denomination does not match wallet denomination');
    this.requireBankGateway(input.bankProvider);
    const ctx = context(identity);
    return this.repository.createTransfer(
      {
        publicId: `fin_transfer_${randomUUID()}`,
        sourceWalletId: input.sourceWalletId,
        destinationReferenceId: input.destinationReferenceId,
        destinationCurrencyCode: input.destinationCurrencyCode,
        sourceAmount: input.sourceAmount,
        bankProvider: input.bankProvider,
        status: 'REQUESTED',
        makerId: identity.actorId,
        correlationId: ctx.correlationId,
        idempotencyKeyHash: hash(identity.idempotencyKey),
      },
      ctx,
    );
  }

  async createApproval(
    input: {
      actionType: string;
      targetReferenceId: string;
      amount?: MoneyAmount;
      requiredApprovals: number;
      expiresAt?: Date;
      commandPayload?: unknown;
    },
    identity: FinanceCommandIdentity,
  ) {
    if (!Number.isInteger(input.requiredApprovals) || input.requiredApprovals < 1)
      throw new Error('At least one checker is required');
    if (input.expiresAt && input.expiresAt.getTime() <= Date.now()) throw new Error('Approval expiry must be in the future');
    let effectivePayload: unknown = input.commandPayload;
    let effectiveAmount = input.amount;
    if (input.actionType === 'TRANSFER_APPROVE') {
      const transfer = await this.requireTransfer(input.targetReferenceId);
      effectivePayload = this.transferApprovalPayload(transfer);
      effectiveAmount = transfer.sourceAmount;
      input.targetReferenceId = transfer.publicId;
    } else if (input.actionType === 'REFUND_EXECUTE') {
      const refund = await this.repository.getRefund(input.targetReferenceId);
      if (!refund) throw new Error('Refund not found');
      effectivePayload = this.refundApprovalPayload(refund);
      effectiveAmount = refund.amount;
      input.targetReferenceId = refund.publicId;
    } else if (input.actionType === 'MANUAL_FX_OVERRIDE') {
      const rate = (await this.repository.listExchangeRates()).find((item) => item.id === input.targetReferenceId || item.publicId === input.targetReferenceId);
      if (!rate) throw new Error('Exchange rate not found');
      effectivePayload = this.rateApprovalPayload(rate);
      input.targetReferenceId = rate.publicId;
    } else if (input.actionType === 'MANUAL_LEDGER_REVERSE') {
      effectivePayload = { transactionId: input.targetReferenceId };
    }
    if (effectivePayload === undefined) throw new Error('Approval command payload is required');
    if (effectiveAmount) await this.assertCanonicalMoney(effectiveAmount);
    return this.repository.createApproval(
      {
        publicId: `fin_approval_${randomUUID()}`,
        actionType: input.actionType,
        targetReferenceId: input.targetReferenceId,
        amount: effectiveAmount,
        makerId: identity.actorId,
        requiredApprovals: input.requiredApprovals,
        payloadHash: payloadHash(effectivePayload),
        policyReference: approvalPolicy(input.actionType),
        consumedAt: null,
        status: 'PENDING',
        expiresAt: input.expiresAt,
      },
      context(identity),
    );
  }

  async saveExchangeRate(
    input: {
      sourceCurrencyCode: string;
      targetCurrencyCode: string;
      rateNumerator: string;
      rateDenominator: string;
      source: 'MANUAL_OVERRIDE' | 'AUTOMATIC_PROVIDER';
      providerReference?: string;
      effectiveFrom: Date;
      effectiveTo?: Date;
      marginBasisPoints?: number;
    },
    identity: FinanceCommandIdentity,
  ) {
    await this.requireCanonicalCurrency(input.sourceCurrencyCode);
    await this.requireCanonicalCurrency(input.targetCurrencyCode);
    if (input.sourceCurrencyCode === input.targetCurrencyCode) throw new Error('FX corridor must use different currencies');
    if (!/^\d+$/.test(input.rateNumerator) || !/^\d+$/.test(input.rateDenominator) || BigInt(input.rateNumerator) <= 0n || BigInt(input.rateDenominator) <= 0n)
      throw new Error('Exchange rate numerator and denominator must be positive');
    if (input.effectiveTo && input.effectiveTo.getTime() <= input.effectiveFrom.getTime())
      throw new Error('Exchange-rate effectiveTo must be later than effectiveFrom');
    if (input.source === 'MANUAL_OVERRIDE' && !identity.reason?.trim())
      throw new Error('Manual exchange override reason is required');
    if (input.source === 'AUTOMATIC_PROVIDER')
      throw new Error('FX_AUTOMATIC_PROVIDER_RUNTIME_PENDING');
    return this.repository.saveExchangeRate(
      {
        publicId: `fin_rate_${randomUUID()}`,
        ...input,
        approved: false,
        makerId: identity.actorId,
        approvalId: null,
        marginBasisPoints: input.marginBasisPoints ?? 0,
      },
      context(identity),
    );
  }

  async refreshAutomaticExchangeRate(
    sourceCurrencyCode: string,
    targetCurrencyCode: string,
    identity: FinanceCommandIdentity,
  ) {
    await this.requireCanonicalCurrency(sourceCurrencyCode);
    await this.requireCanonicalCurrency(targetCurrencyCode);
    if (sourceCurrencyCode === targetCurrencyCode) throw new Error('FX corridor must use different currencies');
    if (!this.dependencies.fxRateProvider.isConfigured()) throw new Error(`FX_PROVIDER_NOT_CONFIGURED:${this.dependencies.fxRateProvider.providerKey}`);
    const evidence = await this.dependencies.fxRateProvider.fetchRate(sourceCurrencyCode, targetCurrencyCode);
    if (!/^\d+$/.test(evidence.numerator) || !/^\d+$/.test(evidence.denominator) || BigInt(evidence.numerator) <= 0n || BigInt(evidence.denominator) <= 0n) {
      throw new Error('FX_PROVIDER_RATE_INVALID');
    }
    return this.repository.saveExchangeRate(
      {
        publicId: `fin_rate_${randomUUID()}`,
        sourceCurrencyCode,
        targetCurrencyCode,
        rateNumerator: evidence.numerator,
        rateDenominator: evidence.denominator,
        source: 'AUTOMATIC_PROVIDER',
        providerReference: `${this.dependencies.fxRateProvider.providerKey}:${evidence.providerReference}`,
        approved: true,
        makerId: null,
        approvalId: null,
        effectiveFrom: evidence.effectiveAt,
        effectiveTo: null,
        marginBasisPoints: 0,
      },
      context(identity),
    );
  }

  async activateManualExchangeRate(rateId: string, approvalId: string, identity: FinanceCommandIdentity) {
    const rate = (await this.repository.listExchangeRates()).find((item) => item.id === rateId || item.publicId === rateId);
    if (!rate) throw new Error('Exchange rate not found');
    if (rate.source !== 'MANUAL_OVERRIDE') throw new Error('Only manual FX overrides require four-eyes activation');
    const approval = await this.requireBoundApproval(
      approvalId,
      'MANUAL_FX_OVERRIDE',
      rate.publicId,
      rate.makerId || identity.actorId,
      payloadHash(this.rateApprovalPayload(rate)),
    );
    return this.repository.activateExchangeRate(rate.id, approval, context(identity));
  }

  async accrueCommission(
    input: { recipientReferenceId: string; sourcePaymentId: string; basisPoints: number; policyReference: string },
    identity: FinanceCommandIdentity,
  ) {
    if (!Number.isInteger(input.basisPoints) || input.basisPoints <= 0 || input.basisPoints > 10_000)
      throw new Error('Commission basis points must be between 1 and 10000');
    if (!input.policyReference.trim()) throw new Error('Commission policy reference is required');
    const payment = await this.repository.findPaymentById(input.sourcePaymentId);
    if (!payment || payment.status !== PaymentStatus.CAPTURED) throw new Error('Commission requires a captured payment');
    await this.assertCanonicalMoney(payment.amount);
    const amount = {
      ...payment.amount,
      amountMinorUnits: ((BigInt(payment.amount.amountMinorUnits) * BigInt(input.basisPoints)) / 10_000n).toString(),
    };
    if (BigInt(amount.amountMinorUnits) <= 0n) throw new Error('Commission policy calculated zero amount');
    return this.repository.createCommission(
      {
        publicId: `fin_commission_${randomUUID()}`,
        recipientReferenceId: input.recipientReferenceId,
        sourcePaymentId: input.sourcePaymentId,
        amount,
        status: 'ACCRUED',
        policyReference: input.policyReference,
        calculationBasisPoints: input.basisPoints,
      },
      context(identity),
    );
  }

  async decideApproval(id: string, decision: 'APPROVE' | 'REJECT', checkerId: string, reason: string | undefined, identity: FinanceCommandIdentity) {
    const approval = await this.repository.getApproval(id);
    if (!approval) throw new Error('Approval not found');
    assertCheckerEligible(approval.makerId, checkerId, approval.decisions);
    if (decision === 'REJECT' && !reason?.trim()) throw new Error('Reject reason is required');
    return this.repository.decideApproval(id, decision, checkerId, reason, context(identity));
  }

  async createRefund(input: { paymentId: string; amount: MoneyAmount; reason: string }, identity: FinanceCommandIdentity) {
    await this.assertCanonicalMoney(input.amount);
    if (!input.reason.trim()) throw new Error('Refund reason is required');
    if (BigInt(input.amount.amountMinorUnits) <= 0n) throw new Error('Refund amount must be positive');
    return this.repository.createRefund(
      {
        publicId: `fin_ref_${randomUUID()}`,
        paymentId: input.paymentId,
        amount: input.amount,
        reason: input.reason,
        status: 'PENDING_APPROVAL',
        makerId: identity.actorId,
      },
      context(identity),
    );
  }

  async processRefund(refundId: string, approvalId: string, identity: FinanceCommandIdentity) {
    const refund = await this.repository.getRefund(refundId);
    if (!refund || refund.status !== 'PENDING_APPROVAL') throw new Error('Refund is not pending approval');
    const payment = await this.repository.findPaymentById(refund.paymentId);
    if (!payment || !payment.gatewayProvider || !payment.gatewayReference) throw new Error('Refund requires original payment gateway evidence');
    const approval = await this.requireBoundApproval(
      approvalId,
      'REFUND_EXECUTE',
      refund.publicId,
      refund.makerId,
      payloadHash(this.refundApprovalPayload(refund)),
      refund.amount,
    );
    const processing = await this.repository.beginRefundProcessing(refund.id, approval, context(identity));
    const gateway = this.requirePaymentGateway(payment.gatewayProvider);
    // The approval is already atomically consumed and the refund reserved as PROCESSING.
    // Ambiguous provider/network outcomes therefore fail closed for reconciliation instead of re-opening execution.
    const evidence = await gateway.refund(
      payment.gatewayReference,
      processing.amount,
      processing.publicId,
      `refund:${processing.publicId}`,
    );
    if (evidence.status === 'FAILED') {
      await this.repository.failRefund(processing.id, evidence.failureCode || 'PROVIDER_REFUND_FAILED', context(identity));
      throw new Error(`REFUND_PROVIDER_FAILED:${evidence.failureCode || 'UNKNOWN'}`);
    }
    if (!['COMPLETED', 'CAPTURED'].includes(evidence.status)) throw new Error(`REFUND_COMPLETION_NOT_PROVEN:${evidence.status}`);
    return this.repository.completeRefundAtomic(
      processing.id,
      { gatewayProvider: gateway.providerKey, gatewayReference: evidence.gatewayReference },
      context(identity),
    );
  }

  async createInstallments(invoiceId: string, installments: Array<{ amount: MoneyAmount; dueDate: Date | string }>, identity: FinanceCommandIdentity) {
    const invoice = await this.requireInvoice(invoiceId);
    if (![InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE].includes(invoice.status))
      throw new Error('Installment plan requires an issued invoice with outstanding value');
    if (BigInt(invoice.amountDue.amountMinorUnits) <= 0n) throw new Error('Invoice has no outstanding amount');
    await Promise.all(installments.map((item) => this.assertCanonicalMoney(item.amount)));
    validateInstallmentPlan(invoice.amountDue, installments);
    if (new Date(installments[0].dueDate).getTime() <= Date.now()) throw new Error('First installment due date must be in the future');
    return this.repository.createInstallmentPlan(
      invoiceId,
      {
        invoiceId,
        totalAmount: invoice.amountDue,
        status: 'ACTIVE',
        installments: installments.map((item) => ({ id: randomUUID(), ...item, status: 'PENDING' })),
      },
      context(identity),
    );
  }

  async createCreditNote(invoiceId: string, amount: MoneyAmount, reason: string, identity: FinanceCommandIdentity) {
    if (!reason.trim()) throw new Error('Credit note reason is required');
    await this.assertCanonicalMoney(amount);
    const invoice = await this.requireInvoice(invoiceId);
    if (![InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE].includes(invoice.status))
      throw new Error('Credit note requires an issued invoice with outstanding value');
    assertSameCurrency(invoice.amountDue, amount);
    if (BigInt(amount.amountMinorUnits) <= 0n || compareMoneyAmounts(amount, invoice.amountDue) === 1)
      throw new Error('Credit note cannot exceed current invoice amountDue');
    return this.repository.createCreditNote(invoiceId, amount, reason, context(identity));
  }

  async generateEstimate(
    input: {
      subjectReferenceId?: string;
      displayCurrencyCode: string;
      displayScale: number;
      lines: Array<{ category: string; amount: MoneyAmount; sourceReference: string; certainty: 'EXACT' | 'ESTIMATED' }>;
    },
    identity: FinanceCommandIdentity,
  ): Promise<FinancialEstimateDto> {
    if (!input.lines.length) throw new Error('Estimate requires canonical source lines');
    await this.assertCanonicalCurrency(input.displayCurrencyCode, input.displayScale);
    await Promise.all(input.lines.map((line) => this.assertCanonicalMoney(line.amount)));
    const converted = await Promise.all(
      input.lines.map(async (line) =>
        line.amount.currencyCode === input.displayCurrencyCode
          ? { ...line, convertedAmount: line.amount }
          : this.convert({ amount: line.amount, targetCurrencyCode: input.displayCurrencyCode, targetScale: input.displayScale }).then(({ amount, rate }) => ({ ...line, convertedAmount: amount, rateId: rate.id })),
      ),
    );
    const total = converted.reduce((sum, line) => sum + BigInt(line.convertedAmount.amountMinorUnits), 0n);
    return this.repository.saveEstimate(
      {
        publicId: `fin_est_${randomUUID()}`,
        subjectReferenceId: input.subjectReferenceId,
        displayCurrencyCode: input.displayCurrencyCode,
        lines: converted,
        total: { amountMinorUnits: total.toString(), currencyCode: input.displayCurrencyCode, scale: input.displayScale },
      },
      context(identity),
    );
  }

  listTransfers() { return this.repository.listTransfers(); }
  listRates() { return this.repository.listExchangeRates(); }
  listApprovals(status?: string) { return this.repository.listApprovals(status); }
  listRefunds() { return this.repository.listRefunds(); }
  listCommissions() { return this.repository.listCommissions(); }
  overview() { return this.repository.getFinanceOverview(); }
  report() { return this.repository.getFinancialReport(); }
  async reconcileProviderStates(input: { limit?: number; actorId: string; correlationId?: string; idempotencyKey: string }) {
    const limit = Math.min(200, Math.max(1, Math.trunc(input.limit ?? 50)));
    const summary = { scannedPayments: 0, updatedPayments: 0, scannedTransfers: 0, updatedTransfers: 0, scannedRefunds: 0, updatedRefunds: 0, providerFailures: 0 };
    const paymentCandidates: FinancePaymentDto[] = [];
    for (const status of [PaymentStatus.PENDING, PaymentStatus.AUTHORIZED]) {
      if (paymentCandidates.length >= limit) break;
      const page = await this.repository.listPayments({ status, page: 1, pageSize: limit - paymentCandidates.length });
      paymentCandidates.push(...page.data);
    }
    for (const payment of paymentCandidates.slice(0, limit)) {
      summary.scannedPayments += 1;
      if (!payment.gatewayProvider) continue;
      const gateway = this.dependencies.paymentGateways.get(payment.gatewayProvider);
      if (!gateway?.isConfigured()) continue;
      try {
        const evidence = await gateway.getStatus(payment.publicId, payment.gatewayReference || undefined, `reconcile:${payment.publicId}`);
        const identity = { actorId: input.actorId, correlationId: input.correlationId, idempotencyKey: `${input.idempotencyKey}:payment:${payment.publicId}:${evidence.status}` };
        if (evidence.status === 'FAILED') {
          await this.repository.recordPaymentFailure(payment.id, evidence.failureCode || 'PROVIDER_RECONCILIATION_FAILED', context(identity));
          summary.updatedPayments += 1;
        } else if (evidence.status === 'AUTHORIZED' && payment.status === PaymentStatus.PENDING) {
          await this.repository.recordPaymentAuthorization(payment.id, { gatewayReference: evidence.gatewayReference, safeMaskedMetadata: evidence.safeMaskedMetadata }, context(identity));
          summary.updatedPayments += 1;
        } else if (evidence.status === 'CAPTURED' || evidence.status === 'COMPLETED') {
          await this.repository.recordReconciledCapturedPaymentAtomic(payment.id, { gatewayReference: evidence.gatewayReference, safeMaskedMetadata: evidence.safeMaskedMetadata }, context(identity));
          summary.updatedPayments += 1;
        }
      } catch {
        summary.providerFailures += 1;
      }
    }

    const refunds = (await this.repository.listRefunds()).filter((refund) => refund.status === 'PROCESSING').slice(0, limit);
    for (const refund of refunds) {
      summary.scannedRefunds += 1;
      const payment = await this.repository.findPaymentById(refund.paymentId);
      if (!payment?.gatewayProvider) continue;
      const gateway = this.dependencies.paymentGateways.get(payment.gatewayProvider);
      if (!gateway?.isConfigured()) continue;
      try {
        const evidence = await gateway.getRefundStatus(refund.publicId, refund.gatewayReference || undefined, `reconcile:refund:${refund.publicId}`);
        const identity = { actorId: input.actorId, correlationId: input.correlationId, idempotencyKey: `${input.idempotencyKey}:refund:${refund.publicId}:${evidence.status}` };
        if (evidence.status === 'FAILED') {
          await this.repository.failRefund(refund.id, evidence.failureCode || 'PROVIDER_REFUND_RECONCILIATION_FAILED', context(identity));
          summary.updatedRefunds += 1;
        } else if (evidence.status === 'CAPTURED' || evidence.status === 'COMPLETED') {
          await this.repository.completeRefundAtomic(refund.id, { gatewayProvider: gateway.providerKey, gatewayReference: evidence.gatewayReference }, context(identity));
          summary.updatedRefunds += 1;
        }
      } catch {
        summary.providerFailures += 1;
      }
    }

    const transfers = (await this.repository.listTransfers()).filter((transfer) =>
      (['PROCESSING', 'SETTLED', 'COMPLETED'] as TransferStatus[]).includes(transfer.status) && transfer.bankProvider && transfer.bankProviderReference,
    ).slice(0, limit);
    for (const transfer of transfers) {
      summary.scannedTransfers += 1;
      const gateway = this.dependencies.bankTransferGateways.get(transfer.bankProvider!);
      if (!gateway?.isConfigured()) continue;
      try {
        const evidence = await gateway.getStatus(transfer.bankProviderReference!, `reconcile:${transfer.publicId}`);
        const identity = { actorId: input.actorId, correlationId: input.correlationId, idempotencyKey: `${input.idempotencyKey}:transfer:${transfer.publicId}:${evidence.status}` };
        if (transfer.status === 'PROCESSING' && evidence.status === 'SETTLED') {
          await this.repository.transitionTransfer(transfer.id, 'SETTLED', context(identity), { bankProvider: gateway.providerKey, bankProviderReference: evidence.providerReference, providerStatus: evidence.status });
          summary.updatedTransfers += 1;
        } else if (transfer.status === 'PROCESSING' && evidence.status === 'FAILED') {
          await this.repository.transitionTransfer(transfer.id, 'FAILED', context(identity), { bankProvider: gateway.providerKey, bankProviderReference: evidence.providerReference, providerStatus: evidence.status, providerFailureCode: evidence.failureCode });
          summary.updatedTransfers += 1;
        } else if ((['SETTLED', 'COMPLETED'] as TransferStatus[]).includes(transfer.status) && evidence.status === 'REVERSED') {
          await this.repository.transitionTransfer(transfer.id, 'REVERSED', context(identity), { bankProvider: gateway.providerKey, bankProviderReference: evidence.providerReference, providerStatus: evidence.status });
          summary.updatedTransfers += 1;
        }
      } catch {
        summary.providerFailures += 1;
      }
    }
    return summary;
  }

  reconcile() { return this.repository.runReconciliation(); }

  private async requireInvoice(id: string) {
    const invoice = await this.repository.findInvoiceById(id);
    if (!invoice) throw new Error('Invoice not found');
    return invoice;
  }
  private async requireTransfer(id: string) {
    const transfer = await this.repository.getTransfer(id);
    if (!transfer) throw new Error('Transfer not found');
    return transfer;
  }
  private async requireCanonicalCurrency(currencyCode: string) {
    const currency = await this.dependencies.currencyReference.resolveCurrency(currencyCode);
    if (!currency || !currency.active) throw new Error(`Non-canonical or inactive finance currency: ${currencyCode}`);
    return currency;
  }
  private async assertCanonicalCurrency(currencyCode: string, scale: number) {
    const currency = await this.requireCanonicalCurrency(currencyCode);
    if (currency.scale !== scale) throw new Error(`Finance currency scale mismatch for ${currencyCode}: expected ${currency.scale}`);
  }
  private async assertCanonicalMoney(amount: MoneyAmount) {
    assertValidMoneyAmount(amount);
    await this.assertCanonicalCurrency(amount.currencyCode, amount.scale);
  }
  private requirePaymentGateway(providerKey: string) {
    if (!providerKey?.trim()) throw new Error('Payment gateway provider is required');
    const gateway = this.dependencies.paymentGateways.get(providerKey);
    if (!gateway) throw new Error(`PAYMENT_PROVIDER_NOT_CONFIGURED:${providerKey}`);
    const status = gateway.runtimeStatus();
    if (status === 'NOT_CONFIGURED') throw new Error(`PAYMENT_PROVIDER_NOT_CONFIGURED:${providerKey}`);
    if (status !== 'READY') throw new Error(`PAYMENT_PROVIDER_RUNTIME_PENDING:${providerKey}`);
    return gateway;
  }
  private requireBankGateway(providerKey: string) {
    if (!providerKey?.trim()) throw new Error('Bank transfer provider is required');
    const gateway = this.dependencies.bankTransferGateways.get(providerKey);
    if (!gateway) throw new Error(`BANK_PROVIDER_NOT_CONFIGURED:${providerKey}`);
    const status = gateway.runtimeStatus();
    if (status === 'NOT_CONFIGURED') throw new Error(`BANK_PROVIDER_NOT_CONFIGURED:${providerKey}`);
    if (status !== 'READY') throw new Error(`BANK_PROVIDER_RUNTIME_PENDING:${providerKey}`);
    return gateway;
  }
  private async requireBoundApproval(
    approvalId: string,
    actionType: string,
    targetReferenceId: string,
    makerId: string,
    expectedPayloadHash: string,
    expectedAmount?: MoneyAmount,
  ): Promise<FinanceApprovalBinding> {
    const approval = await this.repository.getApproval(approvalId);
    if (!approval || approval.status !== 'APPROVED' || approval.consumedAt)
      throw new Error('Approved, unconsumed financial approval is required');
    if (approval.actionType !== actionType || approval.targetReferenceId !== targetReferenceId)
      throw new Error('Financial approval action/target binding mismatch');
    if (approval.makerId !== makerId) throw new Error('Financial approval maker binding mismatch');
    if (approval.payloadHash !== expectedPayloadHash || approval.policyReference !== approvalPolicy(actionType))
      throw new Error('Financial approval payload/policy binding mismatch');
    if (expectedAmount) {
      if (!approval.amount) throw new Error('Financial approval amount binding is missing');
      assertSameCurrency(expectedAmount, approval.amount);
      if (expectedAmount.amountMinorUnits !== approval.amount.amountMinorUnits)
        throw new Error('Financial approval amount binding mismatch');
    }
    return {
      approvalId: approval.id,
      actionType,
      targetReferenceId,
      payloadHash: expectedPayloadHash,
      policyReference: approval.policyReference,
      makerId,
      amount: expectedAmount,
    };
  }
  private transferApprovalPayload(transfer: MoneyTransferDto) {
    return {
      transferId: transfer.publicId,
      sourceWalletId: transfer.sourceWalletId,
      destinationReferenceId: transfer.destinationReferenceId,
      destinationCurrencyCode: transfer.destinationCurrencyCode,
      sourceAmount: transfer.sourceAmount,
      targetAmount: transfer.targetAmount,
      rateId: transfer.rateId,
      feeAmount: transfer.feeAmount,
      feePolicyReference: transfer.feePolicyReference,
      bankProvider: transfer.bankProvider,
    };
  }
  private refundApprovalPayload(refund: RefundDto) {
    return { refundId: refund.publicId, paymentId: refund.paymentId, amount: refund.amount, reason: refund.reason };
  }
  private rateApprovalPayload(rate: ExchangeRateDto) {
    return {
      rateId: rate.publicId,
      sourceCurrencyCode: rate.sourceCurrencyCode,
      targetCurrencyCode: rate.targetCurrencyCode,
      rateNumerator: rate.rateNumerator,
      rateDenominator: rate.rateDenominator,
      effectiveFrom: new Date(rate.effectiveFrom).toISOString(),
      effectiveTo: rate.effectiveTo ? new Date(rate.effectiveTo).toISOString() : null,
      marginBasisPoints: rate.marginBasisPoints,
    };
  }
}
