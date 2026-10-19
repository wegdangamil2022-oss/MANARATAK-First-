import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import {
  IBankTransferGateway,
  IFxRateProvider,
  IPaymentGateway,
  MoneyAmount,
  PaymentGatewayRequest,
  PaymentGatewayResult,
  BankTransferSubmission,
  BankTransferEvidence,
} from '@absheer/domain';
import {
  SignedProviderHttpClient,
  type SignedProviderHttpClientOptions,
} from '../provider-http/SignedProviderHttpClient';

export interface FinanceProviderTelemetryEvent {
  providerKey: string;
  operation: string;
  attempt: number;
  outcome: 'SUCCESS' | 'RETRY' | 'FAILURE';
  durationMs: number;
  failureCategory?: string;
}

export interface FinanceProviderHttpOptions extends SignedProviderHttpClientOptions {
  maxAttempts?: number;
  merchantReference?: string;
  runtimeApproved?: boolean;
  observe?: (event: FinanceProviderTelemetryEvent) => void;
}

type LegacySecretReader = (reference: string) => string | undefined;

const RETRYABLE_PROVIDER_ERROR =
  /^PROVIDER_(?:REQUEST_TIMEOUT|REQUEST_FAILED|HTTP_ERROR:(?:408|429|500|502|503|504))$/;
const SAFE_REFERENCE = /^[A-Za-z0-9._:\/-]{1,256}$/;
const SAFE_FAILURE = /^[A-Z0-9._:-]{1,128}$/;
const SENSITIVE_METADATA_KEY = /(?:pan|card|token|secret|password|authorization|cookie|cvv|cvc)/i;

function normalizeOptions(
  configOrSecretReference?: FinanceProviderHttpOptions | string | null,
  legacyReadSecret: LegacySecretReader = () => undefined,
): FinanceProviderHttpOptions | null {
  if (!configOrSecretReference) return null;
  if (typeof configOrSecretReference === 'string') {
    // Historical constructor compatibility: a secret alone is intentionally insufficient.
    // Runtime configuration must now provide endpoint, API key and signing secret together.
    legacyReadSecret(configOrSecretReference);
    return null;
  }
  return configOrSecretReference;
}

abstract class SignedFinanceProviderBase {
  public readonly capabilityStatus: 'PRODUCTION_CAPABLE' | 'NOT_CONFIGURED';
  public readonly isProductionReady: boolean;
  protected readonly client: SignedProviderHttpClient | null;
  private readonly maxAttempts: number;
  private readonly observe?: (event: FinanceProviderTelemetryEvent) => void;

  protected constructor(
    public readonly providerKey: string,
    configOrSecretReference?: FinanceProviderHttpOptions | string | null,
    legacyReadSecret?: LegacySecretReader,
  ) {
    if (!providerKey?.trim() || !/^[A-Za-z0-9._-]{1,128}$/.test(providerKey.trim()))
      throw new Error('FINANCE_PROVIDER_KEY_INVALID');
    const options = normalizeOptions(configOrSecretReference, legacyReadSecret);
    this.client = options ? new SignedProviderHttpClient(options) : null;
    this.maxAttempts = options?.maxAttempts ?? 3;
    if (!Number.isSafeInteger(this.maxAttempts) || this.maxAttempts < 1 || this.maxAttempts > 5)
      throw new Error('FINANCE_PROVIDER_MAX_ATTEMPTS_INVALID');
    this.observe = options?.observe;
    this.capabilityStatus = this.client ? 'PRODUCTION_CAPABLE' : 'NOT_CONFIGURED';
    this.isProductionReady = Boolean(
      this.client && options?.runtimeApproved && options.merchantReference,
    );
  }

  async checkReadiness(signal?: AbortSignal) {
    if (!this.client || !this.isProductionReady)
      return {
        status: 'DOWN',
        timestamp: new Date().toISOString(),
        error: 'PAYMENT_RUNTIME_NOT_APPROVED',
        details: { capabilityStatus: 'RUNTIME_PENDING' },
      };
    return this.client.checkReadiness('finance-payment', signal);
  }

  isConfigured(): boolean {
    return Boolean(this.client);
  }
  runtimeStatus(): 'READY' | 'NOT_CONFIGURED' | 'RUNTIME_PENDING' {
    return this.client ? 'READY' : 'NOT_CONFIGURED';
  }

  protected async call<T>(
    operation: string,
    idempotencyKey: string | undefined,
    invoke: (client: SignedProviderHttpClient) => Promise<T>,
  ): Promise<T> {
    if (!this.client) throw new Error(`FINANCE_PROVIDER_NOT_CONFIGURED:${this.providerKey}`);
    if (idempotencyKey !== undefined && (!idempotencyKey.trim() || idempotencyKey.length > 200))
      throw new Error('FINANCE_PROVIDER_IDEMPOTENCY_KEY_INVALID');
    let attempt = 0;
    while (attempt < this.maxAttempts) {
      attempt += 1;
      const startedAt = Date.now();
      try {
        const value = await invoke(this.client);
        this.safeObserve({
          providerKey: this.providerKey,
          operation,
          attempt,
          outcome: 'SUCCESS',
          durationMs: Date.now() - startedAt,
        });
        return value;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'PROVIDER_REQUEST_FAILED';
        const retryable = RETRYABLE_PROVIDER_ERROR.test(message) && attempt < this.maxAttempts;
        this.safeObserve({
          providerKey: this.providerKey,
          operation,
          attempt,
          outcome: retryable ? 'RETRY' : 'FAILURE',
          durationMs: Date.now() - startedAt,
          failureCategory: this.failureCategory(message),
        });
        if (!retryable) throw this.mapProviderError(operation, message);
      }
    }
    throw new Error(`FINANCE_PROVIDER_RETRY_EXHAUSTED:${operation}`);
  }

  protected requestKey(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private mapProviderError(operation: string, message: string): Error {
    if (message === 'PROVIDER_REQUEST_TIMEOUT')
      return new Error(`FINANCE_PROVIDER_TIMEOUT:${operation}`);
    if (/^PROVIDER_HTTP_ERROR:4\d\d$/.test(message))
      return new Error(`FINANCE_PROVIDER_REQUEST_REJECTED:${operation}`);
    if (/^PROVIDER_HTTP_ERROR:5\d\d$/.test(message) || message === 'PROVIDER_REQUEST_FAILED')
      return new Error(`FINANCE_PROVIDER_UNAVAILABLE:${operation}`);
    return new Error(`FINANCE_PROVIDER_PROTOCOL_ERROR:${operation}`);
  }

  private failureCategory(message: string): string {
    if (message === 'PROVIDER_REQUEST_TIMEOUT') return 'TIMEOUT';
    const match = /^PROVIDER_HTTP_ERROR:(\d{3})$/.exec(message);
    if (match) return `HTTP_${match[1]}`;
    return message.startsWith('PROVIDER_') ? message.slice(0, 80) : 'PROVIDER_FAILURE';
  }

  private safeObserve(event: FinanceProviderTelemetryEvent): void {
    try {
      this.observe?.(Object.freeze({ ...event }));
    } catch {
      /* telemetry must not change financial outcome */
    }
  }
}

function parseMaskedMetadata(value: unknown): Record<string, string> | undefined {
  if (value === undefined || value === null) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('FINANCE_PROVIDER_MASKED_METADATA_INVALID');
  const result: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (
      !/^[A-Za-z0-9._-]{1,64}$/.test(key) ||
      SENSITIVE_METADATA_KEY.test(key) ||
      typeof raw !== 'string' ||
      raw.length > 256
    ) {
      throw new Error('FINANCE_PROVIDER_MASKED_METADATA_INVALID');
    }
    result[key] = raw;
  }
  return result;
}

function parsePaymentResult(
  value: unknown,
  options?: FinanceProviderHttpOptions | null,
  operationReference?: string,
): PaymentGatewayResult {
  if (!value || typeof value !== 'object')
    throw new Error('FINANCE_PROVIDER_PAYMENT_RESPONSE_INVALID');
  const input = value as Record<string, unknown>;
  const statuses = new Set(['AUTHORIZED', 'CAPTURED', 'COMPLETED', 'FAILED']);
  if (typeof input.status !== 'string' || !statuses.has(input.status))
    throw new Error('FINANCE_PROVIDER_PAYMENT_RESPONSE_INVALID');
  if (typeof input.gatewayReference !== 'string' || !SAFE_REFERENCE.test(input.gatewayReference))
    throw new Error('FINANCE_PROVIDER_PAYMENT_REFERENCE_INVALID');
  if (
    input.failureCode !== undefined &&
    (typeof input.failureCode !== 'string' || !SAFE_FAILURE.test(input.failureCode))
  )
    throw new Error('FINANCE_PROVIDER_FAILURE_CODE_INVALID');
  if (input.status === 'FAILED' && !input.failureCode)
    throw new Error('FINANCE_PROVIDER_FAILURE_CODE_REQUIRED');
  let attested: Partial<PaymentGatewayResult> = {};
  if (input.status === 'CAPTURED' || input.status === 'COMPLETED') {
    const proof = input.attestation as any;
    if (
      !proof ||
      !operationReference ||
      proof.operationReference !== operationReference ||
      !options?.merchantReference ||
      !proof.amount ||
      proof.merchantReference !== options.merchantReference ||
      !SAFE_REFERENCE.test(proof.captureReference || '') ||
      !/^[1-9]\d{0,29}$/.test(proof.amount.amountMinorUnits || '') ||
      !/^[A-Z]{3}$/.test(proof.amount.currencyCode || '') ||
      !Number.isInteger(proof.amount.scale) ||
      proof.amount.scale < 0 ||
      proof.amount.scale > 6 ||
      !/^[a-f0-9]{64}$/i.test(proof.signature || '') ||
      !Number.isFinite(Date.parse(proof.timestamp)) ||
      Math.abs((options.now?.() || new Date()).getTime() - Date.parse(proof.timestamp)) > 300000
    )
      throw new Error('FINANCE_PROVIDER_ATTESTATION_INVALID');
    const canonical = [
      input.gatewayReference,
      input.status,
      proof.operationReference,
      proof.merchantReference,
      proof.captureReference,
      proof.amount.currencyCode,
      String(proof.amount.scale),
      proof.amount.amountMinorUnits,
      proof.timestamp,
    ].join('\n');
    const expected = createHmac('sha256', options.signingSecret).update(canonical).digest();
    if (!timingSafeEqual(expected, Buffer.from(proof.signature, 'hex')))
      throw new Error('FINANCE_PROVIDER_ATTESTATION_INVALID');
    attested = {
      amount: proof.amount,
      merchantReference: proof.merchantReference,
      operationReference: proof.operationReference,
      captureReference: proof.captureReference,
      verified: true,
      signedEvidence: { signature: proof.signature, timestamp: proof.timestamp },
    };
  }
  return {
    ...attested,
    status: input.status as PaymentGatewayResult['status'],
    gatewayReference: input.gatewayReference,
    ...(input.safeMaskedMetadata !== undefined
      ? { safeMaskedMetadata: parseMaskedMetadata(input.safeMaskedMetadata) }
      : {}),
    ...(typeof input.failureCode === 'string' ? { failureCode: input.failureCode } : {}),
  };
}

function parseBankEvidence(
  value: unknown,
  options?: FinanceProviderHttpOptions | null,
): BankTransferEvidence {
  if (!value || typeof value !== 'object')
    throw new Error('FINANCE_PROVIDER_BANK_RESPONSE_INVALID');
  const input = value as Record<string, unknown>;
  const statuses = new Set(['PROCESSING', 'SETTLED', 'FAILED', 'REVERSED']);
  if (typeof input.status !== 'string' || !statuses.has(input.status))
    throw new Error('FINANCE_PROVIDER_BANK_RESPONSE_INVALID');
  if (typeof input.providerReference !== 'string' || !SAFE_REFERENCE.test(input.providerReference))
    throw new Error('FINANCE_PROVIDER_BANK_REFERENCE_INVALID');
  if (
    input.failureCode !== undefined &&
    (typeof input.failureCode !== 'string' || !SAFE_FAILURE.test(input.failureCode))
  )
    throw new Error('FINANCE_PROVIDER_FAILURE_CODE_INVALID');
  if (input.status === 'FAILED' && !input.failureCode)
    throw new Error('FINANCE_PROVIDER_FAILURE_CODE_REQUIRED');
  const proof = input.attestation as any;
  const canonicalMoney = (money: any) => {
    if (
      !money ||
      !/^(?:0|[1-9]\d{0,29})$/.test(money.amountMinorUnits || '') ||
      !/^[A-Z]{3}$/.test(money.currencyCode || '') ||
      !Number.isInteger(money.scale) ||
      money.scale < 0 ||
      money.scale > 6
    )
      throw new Error('FINANCE_BANK_ATTESTATION_INVALID');
    return [money.currencyCode, money.scale, money.amountMinorUnits].join(':');
  };
  if (
    !proof ||
    !options ||
    !SAFE_REFERENCE.test(proof.transferReference || '') ||
    !SAFE_REFERENCE.test(proof.destinationReferenceId || '') ||
    !/^[a-f0-9]{64}$/i.test(proof.signature || '') ||
    !Number.isFinite(Date.parse(proof.timestamp)) ||
    Math.abs((options.now?.() || new Date()).getTime() - Date.parse(proof.timestamp)) > 300000
  )
    throw new Error('FINANCE_BANK_ATTESTATION_INVALID');
  const canonical = [
    input.providerReference,
    input.status,
    proof.transferReference,
    proof.destinationReferenceId,
    canonicalMoney(proof.sourceAmount),
    canonicalMoney(proof.targetAmount),
    canonicalMoney(proof.feeAmount),
    proof.timestamp,
  ].join('\n');
  const expected = createHmac('sha256', options.signingSecret).update(canonical).digest();
  if (!timingSafeEqual(expected, Buffer.from(proof.signature, 'hex')))
    throw new Error('FINANCE_BANK_ATTESTATION_INVALID');
  return {
    verified: true,
    transferReference: proof.transferReference,
    destinationReferenceId: proof.destinationReferenceId,
    sourceAmount: proof.sourceAmount,
    targetAmount: proof.targetAmount,
    feeAmount: proof.feeAmount,
    signedEvidence: { signature: proof.signature, timestamp: proof.timestamp },
    providerReference: input.providerReference,
    status: input.status as BankTransferEvidence['status'],
    ...(typeof input.failureCode === 'string' ? { failureCode: input.failureCode } : {}),
  };
}

export class EnvironmentPaymentGatewayAdapter
  extends SignedFinanceProviderBase
  implements IPaymentGateway
{
  private readonly proofOptions: FinanceProviderHttpOptions | null;
  readonly merchantReference?: string;
  constructor(
    providerKey: string,
    configOrSecretReference?: FinanceProviderHttpOptions | string | null,
    legacyReadSecret?: LegacySecretReader,
  ) {
    super(providerKey, configOrSecretReference, legacyReadSecret);
    this.proofOptions = normalizeOptions(configOrSecretReference, legacyReadSecret);
    this.merchantReference = this.proofOptions?.merchantReference;
  }

  override runtimeStatus(): 'READY' | 'NOT_CONFIGURED' | 'RUNTIME_PENDING' {
    return !this.isConfigured()
      ? 'NOT_CONFIGURED'
      : this.proofOptions?.runtimeApproved && this.merchantReference
        ? 'READY'
        : 'RUNTIME_PENDING';
  }

  async authorize(request: PaymentGatewayRequest): Promise<PaymentGatewayResult> {
    return this.call('payment.authorize', request.idempotencyKey, async (client) =>
      parsePaymentResult(
        await client.json('POST', '/v1/finance/payments/authorize', request, {
          idempotencyKey: request.idempotencyKey,
        }),
        this.proofOptions,
        request.paymentReference,
      ),
    );
  }

  async capture(
    gatewayReference: string,
    amount: MoneyAmount,
    idempotencyKey: string,
    paymentReference?: string,
  ): Promise<PaymentGatewayResult> {
    if (!SAFE_REFERENCE.test(gatewayReference))
      throw new Error('FINANCE_PROVIDER_PAYMENT_REFERENCE_INVALID');
    return this.call('payment.capture', idempotencyKey, async (client) =>
      parsePaymentResult(
        await client.json(
          'POST',
          '/v1/finance/payments/capture',
          { gatewayReference, amount, paymentReference },
          { idempotencyKey },
        ),
        this.proofOptions,
        paymentReference,
      ),
    );
  }

  async refund(
    gatewayReference: string,
    amount: MoneyAmount,
    refundReference: string,
    idempotencyKey: string,
  ): Promise<PaymentGatewayResult> {
    if (!SAFE_REFERENCE.test(gatewayReference) || !SAFE_REFERENCE.test(refundReference))
      throw new Error('FINANCE_PROVIDER_PAYMENT_REFERENCE_INVALID');
    return this.call('payment.refund', idempotencyKey, async (client) =>
      parsePaymentResult(
        await client.json(
          'POST',
          '/v1/finance/payments/refund',
          { gatewayReference, amount, refundReference },
          { idempotencyKey },
        ),
        this.proofOptions,
        refundReference,
      ),
    );
  }

  async getRefundStatus(
    refundReference: string,
    gatewayReference: string | undefined,
    idempotencyKey: string,
  ): Promise<PaymentGatewayResult> {
    if (!SAFE_REFERENCE.test(refundReference))
      throw new Error('FINANCE_PROVIDER_PAYMENT_REFERENCE_INVALID');
    if (gatewayReference !== undefined && !SAFE_REFERENCE.test(gatewayReference))
      throw new Error('FINANCE_PROVIDER_PAYMENT_REFERENCE_INVALID');
    return this.call('payment.refund-status', idempotencyKey, async (client) =>
      parsePaymentResult(
        await client.json(
          'POST',
          '/v1/finance/payments/refund-status',
          { refundReference, gatewayReference },
          { idempotencyKey },
        ),
        this.proofOptions,
        refundReference,
      ),
    );
  }

  async getStatus(
    paymentReference: string,
    gatewayReference: string | undefined,
    idempotencyKey: string,
  ): Promise<PaymentGatewayResult> {
    if (!SAFE_REFERENCE.test(paymentReference))
      throw new Error('FINANCE_PROVIDER_PAYMENT_REFERENCE_INVALID');
    if (gatewayReference !== undefined && !SAFE_REFERENCE.test(gatewayReference))
      throw new Error('FINANCE_PROVIDER_PAYMENT_REFERENCE_INVALID');
    return this.call('payment.status', idempotencyKey, async (client) =>
      parsePaymentResult(
        await client.json(
          'POST',
          '/v1/finance/payments/status',
          { paymentReference, gatewayReference },
          { idempotencyKey },
        ),
        this.proofOptions,
        paymentReference,
      ),
    );
  }
}

export class EnvironmentFxRateProviderAdapter
  extends SignedFinanceProviderBase
  implements IFxRateProvider
{
  constructor(
    providerKey: string,
    configOrSecretReference?: FinanceProviderHttpOptions | string | null,
    legacyReadSecret?: LegacySecretReader,
  ) {
    super(providerKey, configOrSecretReference, legacyReadSecret);
  }

  async fetchRate(sourceCurrency: string, targetCurrency: string) {
    if (
      !/^[A-Z]{3}$/.test(sourceCurrency) ||
      !/^[A-Z]{3}$/.test(targetCurrency) ||
      sourceCurrency === targetCurrency
    )
      throw new Error('FX_PROVIDER_CORRIDOR_INVALID');
    const idempotencyKey = `fx:${this.requestKey(`${sourceCurrency}:${targetCurrency}`)}`;
    const value = await this.call('fx.fetch-rate', idempotencyKey, (client) =>
      client.json<Record<string, unknown>>(
        'POST',
        '/v1/finance/fx/rate',
        { sourceCurrency, targetCurrency },
        { idempotencyKey },
      ),
    );
    if (
      !/^\d+$/.test(String(value.numerator ?? '')) ||
      !/^\d+$/.test(String(value.denominator ?? '')) ||
      BigInt(String(value.numerator)) <= 0n ||
      BigInt(String(value.denominator)) <= 0n
    )
      throw new Error('FX_PROVIDER_RATE_INVALID');
    if (value.sourceCurrency !== sourceCurrency || value.targetCurrency !== targetCurrency)
      throw new Error('FX_PROVIDER_CORRIDOR_MISMATCH');
    if (
      typeof value.providerReference !== 'string' ||
      !SAFE_REFERENCE.test(value.providerReference)
    )
      throw new Error('FX_PROVIDER_REFERENCE_INVALID');
    const effectiveAt = new Date(String(value.effectiveAt ?? ''));
    if (Number.isNaN(effectiveAt.getTime())) throw new Error('FX_PROVIDER_EFFECTIVE_AT_INVALID');
    return {
      numerator: String(value.numerator),
      denominator: String(value.denominator),
      providerReference: value.providerReference,
      effectiveAt,
    };
  }
}

export class EnvironmentBankTransferGatewayAdapter
  extends SignedFinanceProviderBase
  implements IBankTransferGateway
{
  private readonly runtimeApproved: boolean;
  private readonly bankOptions: FinanceProviderHttpOptions | null;
  constructor(
    providerKey: string,
    configOrSecretReference?: FinanceProviderHttpOptions | string | null,
    legacyReadSecret?: LegacySecretReader,
  ) {
    super(providerKey, configOrSecretReference, legacyReadSecret);
    this.bankOptions = normalizeOptions(configOrSecretReference, legacyReadSecret);
    this.runtimeApproved =
      normalizeOptions(configOrSecretReference, legacyReadSecret)?.runtimeApproved === true;
  }

  override runtimeStatus(): 'READY' | 'NOT_CONFIGURED' | 'RUNTIME_PENDING' {
    return !this.isConfigured()
      ? 'NOT_CONFIGURED'
      : this.runtimeApproved
        ? 'READY'
        : 'RUNTIME_PENDING';
  }
  async submit(request: BankTransferSubmission): Promise<BankTransferEvidence> {
    return this.call('bank.submit', request.idempotencyKey, async (client) =>
      parseBankEvidence(
        await client.json('POST', '/v1/finance/bank-transfers/submit', request, {
          idempotencyKey: request.idempotencyKey,
        }),
        this.bankOptions,
      ),
    );
  }

  async getStatus(
    providerReference: string,
    idempotencyKey: string,
  ): Promise<BankTransferEvidence> {
    if (!SAFE_REFERENCE.test(providerReference))
      throw new Error('FINANCE_PROVIDER_BANK_REFERENCE_INVALID');
    return this.call('bank.status', idempotencyKey, async (client) =>
      parseBankEvidence(
        await client.json(
          'POST',
          '/v1/finance/bank-transfers/status',
          { providerReference },
          { idempotencyKey },
        ),
        this.bankOptions,
      ),
    );
  }

  async reverse(providerReference: string, idempotencyKey: string): Promise<BankTransferEvidence> {
    if (!SAFE_REFERENCE.test(providerReference))
      throw new Error('FINANCE_PROVIDER_BANK_REFERENCE_INVALID');
    return this.call('bank.reverse', idempotencyKey, async (client) =>
      parseBankEvidence(
        await client.json(
          'POST',
          '/v1/finance/bank-transfers/reverse',
          { providerReference },
          { idempotencyKey },
        ),
        this.bankOptions,
      ),
    );
  }
}

export interface FinanceWebhookReplayStore {
  claim(providerKey: string, nonceHash: string, ttlMs: number): Promise<boolean>;
}

export interface FinanceWebhookVerificationInput {
  providerKey: string;
  rawBody: Uint8Array;
  timestamp: string;
  nonce: string;
  signature: string;
}

export class FinanceProviderWebhookVerifier {
  constructor(
    private readonly signingSecret: string,
    private readonly replayStore: FinanceWebhookReplayStore,
    private readonly maxClockSkewMs = 300_000,
    private readonly now: () => number = Date.now,
  ) {
    if (!signingSecret || signingSecret.length < 32)
      throw new Error('FINANCE_WEBHOOK_SIGNING_SECRET_TOO_SHORT');
    if (!replayStore) throw new Error('FINANCE_WEBHOOK_REPLAY_STORE_REQUIRED');
    if (
      !Number.isSafeInteger(maxClockSkewMs) ||
      maxClockSkewMs < 30_000 ||
      maxClockSkewMs > 900_000
    )
      throw new Error('FINANCE_WEBHOOK_CLOCK_SKEW_INVALID');
  }

  async verify(input: FinanceWebhookVerificationInput): Promise<void> {
    if (!/^[A-Za-z0-9._-]{1,128}$/.test(input.providerKey))
      throw new Error('FINANCE_WEBHOOK_PROVIDER_INVALID');
    if (!/^[A-Za-z0-9._:-]{16,200}$/.test(input.nonce))
      throw new Error('FINANCE_WEBHOOK_NONCE_INVALID');
    if (!/^[a-f0-9]{64}$/i.test(input.signature))
      throw new Error('FINANCE_WEBHOOK_SIGNATURE_INVALID');
    const timestampMs = Date.parse(input.timestamp);
    if (!Number.isFinite(timestampMs) || Math.abs(this.now() - timestampMs) > this.maxClockSkewMs)
      throw new Error('FINANCE_WEBHOOK_TIMESTAMP_INVALID');
    const bodyHash = createHash('sha256').update(input.rawBody).digest('hex');
    const canonical = `${input.timestamp}\n${input.nonce}\n${bodyHash}`;
    const expected = createHmac('sha256', this.signingSecret).update(canonical).digest();
    const supplied = Buffer.from(input.signature, 'hex');
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected))
      throw new Error('FINANCE_WEBHOOK_SIGNATURE_INVALID');
    const nonceHash = createHash('sha256')
      .update(`${input.providerKey}:${input.nonce}`)
      .digest('hex');
    const claimed = await this.replayStore.claim(
      input.providerKey,
      nonceHash,
      this.maxClockSkewMs * 2,
    );
    if (!claimed) throw new Error('FINANCE_WEBHOOK_REPLAY_DETECTED');
  }
}

export class RedisFinanceWebhookReplayStore implements FinanceWebhookReplayStore {
  constructor(
    private readonly redis: {
      set(key: string, value: string, options: { NX: true; PX: number }): Promise<string | null>;
      buildKey?: (feature: string, key: string) => string;
    },
  ) {}
  async claim(providerKey: string, nonceHash: string, ttlMs: number): Promise<boolean> {
    if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0)
      throw new Error('FINANCE_WEBHOOK_REPLAY_TTL_INVALID');
    const key = this.redis.buildKey
      ? this.redis.buildKey('finance-webhook-replay', `${providerKey}:${nonceHash}`)
      : `absheer:finance-webhook-replay:${providerKey}:${nonceHash}`;
    return (await this.redis.set(key, '1', { NX: true, PX: ttlMs })) === 'OK';
  }
}
