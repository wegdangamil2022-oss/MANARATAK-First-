import { createHash, randomUUID } from 'node:crypto';
import {
  assertCheckerEligible,
  assertPositiveFinanceMoney,
  assertBankTransferEvidence,
  BankTransferEvidence,
  convertMoneyExact,
  financeApprovalPolicy,
  FinanceListFilters,
  assertTransferTransition,
  CreateFinanceInvoiceDto,
  CreateFinancePaymentDto,
  ExchangeRateDto,
  FinanceInvoiceDto,
  FinanceInvoiceFilters,
  FinanceApprovalBinding,
  FinanceMutationContext,
  FinancePaymentDto,
  FinancePaymentFilters,
  IFinanceRepository,
  InvoiceStatus,
  MoneyAmount,
  PaginatedFinanceResult,
  PaymentStatus,
  PostLedgerTransactionInput,
  TransferStatus,
  validateBalancedPostings,
} from '@manaratak/domain';

type Db = any;
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const stable = (value: any): string =>
  value == null || typeof value !== 'object'
    ? JSON.stringify(value ?? null)
    : Array.isArray(value)
      ? `[${value.map(stable).join(',')}]`
      : `{${Object.keys(value)
          .filter((k) => value[k] !== undefined)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${stable(value[k])}`)
          .join(',')}}`;
const fingerprint = (value: unknown) => hash(stable(value));
const money = (units: string, currencyCode: string, scale: number): MoneyAmount => ({
  amountMinorUnits: units,
  currencyCode,
  scale,
});

export class PrismaFinanceRepository implements IFinanceRepository {
  constructor(private readonly db: Db) {}

  async createAdjustmentCase(input: any, ctx: FinanceMutationContext) {
    return this.tx(async (tx) => {
      const replay = await this.commandReplay(tx, ctx, 'ADJUSTMENT_CASE', 'new', {
        reasonCode: input.reasonCode,
        supportingDocumentId: input.supportingDocumentId,
      });
      if (replay) return replay;
      const row = await tx.financeAdjustmentCaseRecord.create({ data: input });
      await this.govern(tx, ctx, 'FINANCE_ADJUSTMENT_CASE_CREATED', row.publicId, {
        reasonCode: row.reasonCode,
        supportingDocumentId: row.supportingDocumentId,
      });
      await this.storeCommand(
        tx,
        ctx,
        'ADJUSTMENT_CASE',
        'new',
        { reasonCode: input.reasonCode, supportingDocumentId: input.supportingDocumentId },
        row,
      );
      return row;
    });
  }
  async getAdjustmentCase(reference: string) {
    return this.db.financeAdjustmentCaseRecord.findFirst({
      where: { OR: [{ id: reference }, { publicId: reference }] },
    });
  }
  async findInvoiceById(id: string): Promise<FinanceInvoiceDto | null> {
    const row = await this.db.financeInvoiceRecord.findFirst({
      where: { OR: [{ id }, { publicId: id }] },
    });
    return row ? this.invoice(row) : null;
  }
  async findInvoiceByNumber(invoiceNumber: string): Promise<FinanceInvoiceDto | null> {
    const row = await this.db.financeInvoiceRecord.findUnique({ where: { invoiceNumber } });
    return row ? this.invoice(row) : null;
  }
  async findPaymentById(id: string): Promise<FinancePaymentDto | null> {
    const row = await this.db.financePaymentRecord.findFirst({
      where: { OR: [{ id }, { publicId: id }] },
    });
    return row ? this.payment(row) : null;
  }
  async listInvoices(
    filters: FinanceInvoiceFilters,
  ): Promise<PaginatedFinanceResult<FinanceInvoiceDto>> {
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize || 20));
    const search = filters.search?.trim();
    const where = {
      ...(filters.status && { status: filters.status }),
      ...(filters.originDomain && { originDomain: filters.originDomain }),
      ...(filters.originReferenceId && { originReferenceId: filters.originReferenceId }),
      ...(filters.studentReferenceId && { studentReferenceId: filters.studentReferenceId }),
      ...(filters.payerReferenceId && { payerReferenceId: filters.payerReferenceId }),
      ...(search && {
        OR: [
          { invoiceNumber: { contains: search, mode: 'insensitive' } },
          { publicId: { contains: search, mode: 'insensitive' } },
          { originReferenceId: { contains: search, mode: 'insensitive' } },
          { studentReferenceId: { contains: search, mode: 'insensitive' } },
          { payerReferenceId: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };
    const [rows, total] = await Promise.all([
      this.db.financeInvoiceRecord.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.db.financeInvoiceRecord.count({ where }),
    ]);
    return {
      data: rows.map((row: any) => this.invoice(row)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
  async listPaymentsForInvoice(invoiceId: string): Promise<FinancePaymentDto[]> {
    const rows = await this.db.financePaymentRecord.findMany({
      where: { invoiceId },
      take: 100,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return rows.map((row: any) => this.payment(row));
  }
  async listPayments(
    filters: FinancePaymentFilters,
  ): Promise<PaginatedFinanceResult<FinancePaymentDto>> {
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize || 20));
    const search = filters.search?.trim();
    const where = {
      ...(filters.status && { status: filters.status }),
      ...(filters.invoiceId && { invoiceId: filters.invoiceId }),
      ...(filters.gatewayProvider && { gatewayProvider: filters.gatewayProvider }),
      ...(search && {
        OR: [
          { publicId: { contains: search, mode: 'insensitive' } },
          { gatewayReference: { contains: search, mode: 'insensitive' } },
          { gatewayProvider: { contains: search, mode: 'insensitive' } },
          { invoiceId: { contains: search, mode: 'insensitive' } },
          { failureReason: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };
    const [rows, total] = await Promise.all([
      this.db.financePaymentRecord.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.db.financePaymentRecord.count({ where }),
    ]);
    return {
      data: rows.map((row: any) => this.payment(row)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
  async createDraftInvoice(
    data: Omit<CreateFinanceInvoiceDto, 'status' | 'issuedAt'>,
    ctx: FinanceMutationContext,
  ): Promise<FinanceInvoiceDto> {
    return this.tx(async (tx) => {
      const idempotencyKeyHash = hash(ctx.idempotencyKey);
      const requestFingerprint = hash(
        JSON.stringify({
          originDomain: data.originDomain,
          originReferenceId: data.originReferenceId,
          studentReferenceId: data.studentReferenceId ?? null,
          payerReferenceId: data.payerReferenceId ?? null,
          totalAmount: data.totalAmount,
          lineItems: data.lineItems,
          dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
        }),
      );
      const existing = await tx.financeInvoiceRecord.findUnique({ where: { idempotencyKeyHash } });
      if (existing) {
        if (existing.requestFingerprint !== requestFingerprint)
          throw new Error('Invoice idempotency key was reused with a different request');
        return this.invoice(existing);
      }
      const row = await tx.financeInvoiceRecord.create({
        data: {
          publicId: data.publicId,
          invoiceNumber: data.invoiceNumber,
          correlationId: ctx.correlationId,
          idempotencyKeyHash,
          requestFingerprint,
          originDomain: data.originDomain,
          originReferenceId: data.originReferenceId,
          studentReferenceId: data.studentReferenceId,
          payerReferenceId: data.payerReferenceId,
          status: InvoiceStatus.DRAFT,
          currencyCode: data.totalAmount.currencyCode,
          scale: data.totalAmount.scale,
          totalMinorUnits: data.totalAmount.amountMinorUnits,
          dueMinorUnits: data.totalAmount.amountMinorUnits,
          lineItems: data.lineItems as any,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          metadata: data.metadata as any,
        },
      });
      await this.govern(tx, ctx, 'FINANCE_INVOICE_DRAFT_CREATED', row.id, {
        invoiceNumber: row.invoiceNumber,
      });
      return this.invoice(row);
    });
  }
  async updateDraftInvoice(
    id: string,
    lineItems: CreateFinanceInvoiceDto['lineItems'],
    total: MoneyAmount,
    ctx: FinanceMutationContext,
  ): Promise<FinanceInvoiceDto> {
    return this.tx(async (tx) => {
      const replay = await this.commandReplay(tx, ctx, 'ITEMS', id, {
        lineItems,
        total,
        expectedVersion: ctx.expectedVersion,
      });
      if (replay) return replay;
      const current = await tx.financeInvoiceRecord.findUnique({ where: { id } });
      if (!current || current.status !== InvoiceStatus.DRAFT)
        throw new Error('Only DRAFT invoices can be edited');
      this.checkVersion(current.version, ctx);
      await this.assertNoPendingPayments(tx, id);
      const row = await tx.financeInvoiceRecord.update({
        where: { id, version: current.version },
        data: {
          lineItems: lineItems as any,
          currencyCode: total.currencyCode,
          scale: total.scale,
          totalMinorUnits: total.amountMinorUnits,
          dueMinorUnits: total.amountMinorUnits,
          version: { increment: 1 },
        },
      });
      await this.govern(tx, ctx, 'FINANCE_INVOICE_DRAFT_UPDATED', id, {});
      const response = this.invoice(row);
      await this.storeCommand(
        tx,
        ctx,
        'ITEMS',
        id,
        { lineItems, total, expectedVersion: ctx.expectedVersion },
        response,
      );
      return response;
    });
  }
  async issueDraftInvoice(id: string, ctx: FinanceMutationContext): Promise<FinanceInvoiceDto> {
    return this.tx(async (tx) => {
      const replay = await this.commandReplay(tx, ctx, 'ISSUE', id, {
        expectedVersion: ctx.expectedVersion,
      });
      if (replay) return replay;
      const current = await tx.financeInvoiceRecord.findUnique({ where: { id } });
      if (!current || current.status !== InvoiceStatus.DRAFT)
        throw new Error('Only DRAFT invoices can be issued');
      this.checkVersion(current.version, ctx);
      await this.assertNoPendingPayments(tx, id);
      const row = await tx.financeInvoiceRecord.update({
        where: { id, version: current.version },
        data: {
          status: InvoiceStatus.ISSUED,
          invoiceNumber: `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${current.publicId.slice(-8).toUpperCase()}`,
          issuedAt: new Date(),
          version: { increment: 1 },
        },
      });
      const receivable = await this.systemAccount(
        tx,
        'ACCOUNTS_RECEIVABLE',
        'ASSET',
        current.currencyCode,
        current.scale,
      );
      const revenue = await this.systemAccount(
        tx,
        `REVENUE:${current.originDomain}`,
        'REVENUE',
        current.currencyCode,
        current.scale,
      );
      await this.postWithinTx(tx, {
        ...ctx,
        businessReferenceType: 'INVOICE',
        businessReferenceId: current.id,
        postings: [
          {
            accountId: receivable.id,
            direction: 'DEBIT',
            amount: money(current.totalMinorUnits, current.currencyCode, current.scale),
          },
          {
            accountId: revenue.id,
            direction: 'CREDIT',
            amount: money(current.totalMinorUnits, current.currencyCode, current.scale),
          },
        ],
      });
      await this.govern(tx, ctx, 'FINANCE_INVOICE_ISSUED', id, {});
      const response = this.invoice(row);
      await this.storeCommand(
        tx,
        ctx,
        'ISSUE',
        id,
        { expectedVersion: ctx.expectedVersion },
        response,
      );
      return response;
    });
  }

  async voidInvoiceAtomic(id: string, ctx: FinanceMutationContext): Promise<FinanceInvoiceDto> {
    return this.tx(async (tx) => {
      const replay = await this.commandReplay(tx, ctx, 'VOID', id, {
        expectedVersion: ctx.expectedVersion,
      });
      if (replay) return replay;
      const current = await tx.financeInvoiceRecord.findUnique({ where: { id } });
      if (
        !current ||
        ![InvoiceStatus.DRAFT, InvoiceStatus.ISSUED, InvoiceStatus.OVERDUE].includes(current.status)
      )
        throw new Error('Invoice cannot be voided');
      this.checkVersion(current.version, ctx);
      await this.assertNoPendingPayments(tx, id);
      const row = await tx.financeInvoiceRecord.update({
        where: { id, version: current.version },
        data: { status: InvoiceStatus.VOIDED, voidedAt: new Date(), version: { increment: 1 } },
      });
      if (current.status !== InvoiceStatus.DRAFT) {
        const receivable = await this.systemAccount(
          tx,
          'ACCOUNTS_RECEIVABLE',
          'ASSET',
          current.currencyCode,
          current.scale,
        );
        const revenue = await this.systemAccount(
          tx,
          `REVENUE:${current.originDomain}`,
          'REVENUE',
          current.currencyCode,
          current.scale,
        );
        const amount = money(current.dueMinorUnits, current.currencyCode, current.scale);
        await this.postWithinTx(tx, {
          ...ctx,
          idempotencyKey: `${ctx.idempotencyKey}:ledger`,
          businessReferenceType: 'INVOICE_VOID',
          businessReferenceId: current.id,
          postings: [
            { accountId: revenue.id, direction: 'DEBIT', amount },
            { accountId: receivable.id, direction: 'CREDIT', amount },
          ],
        });
      }
      await this.govern(tx, ctx, 'FINANCE_INVOICE_VOIDED', id, {});
      const response = this.invoice(row);
      await this.storeCommand(
        tx,
        ctx,
        'VOID',
        id,
        { expectedVersion: ctx.expectedVersion },
        response,
      );
      return response;
    });
  }
  async preparePaymentAttempt(
    data: CreateFinancePaymentDto,
    ctx: FinanceMutationContext,
  ): Promise<FinancePaymentDto> {
    assertPositiveFinanceMoney(data.amount);
    return this.tx(async (tx) => {
      const keyHash = hash(ctx.idempotencyKey);
      const existing = await tx.financePaymentRecord.findUnique({
        where: { idempotencyKeyHash: keyHash },
      });
      if (existing) {
        if (existing.commandActorId !== ctx.actorId)
          throw new Error('FINANCE_IDEMPOTENCY_CONFLICT');
        const sameRequest =
          existing.invoiceId === data.invoiceId &&
          existing.amountMinorUnits === data.amount.amountMinorUnits &&
          existing.currencyCode === data.amount.currencyCode &&
          existing.scale === data.amount.scale &&
          existing.gatewayProvider === data.gatewayProvider &&
          existing.paymentMethod === data.paymentMethod;
        if (!sameRequest)
          throw new Error('Payment idempotency key was reused with a different request');
        return this.payment(existing);
      }
      const invoice = await tx.financeInvoiceRecord.findUnique({ where: { id: data.invoiceId } });
      if (
        !invoice ||
        ![InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE].includes(
          invoice.status,
        )
      )
        throw new Error('Invoice is not payable');
      if (
        data.amount.currencyCode !== invoice.currencyCode ||
        data.amount.scale !== invoice.scale ||
        BigInt(data.amount.amountMinorUnits) <= 0n ||
        BigInt(data.amount.amountMinorUnits) > BigInt(invoice.dueMinorUnits)
      )
        throw new Error('Invalid payment attempt amount');
      if (
        await tx.financeWalletHoldRecord.count({
          where: { businessReferenceId: { in: [invoice.id, invoice.publicId] }, status: 'ACTIVE' },
        })
      )
        throw new Error('FINANCE_PAYMENT_BALANCE_RESERVED');
      const unresolved = await tx.financePaymentRecord.findMany({
        where: { invoiceId: invoice.id, status: { in: ['PENDING', 'AUTHORIZED'] } },
        select: { amountMinorUnits: true },
      });
      const reserved = unresolved.reduce(
        (sum: bigint, item: any) => sum + BigInt(item.amountMinorUnits),
        0n,
      );
      if (reserved + BigInt(data.amount.amountMinorUnits) > BigInt(invoice.dueMinorUnits))
        throw new Error('FINANCE_PAYMENT_BALANCE_RESERVED');
      await tx.financeInvoiceRecord.update({
        where: { id: invoice.id, version: invoice.version },
        data: { version: { increment: 1 } },
      });
      const row = await tx.financePaymentRecord.create({
        data: {
          ...this.paymentCreate({
            ...data,
            status: PaymentStatus.PENDING,
            gatewayReference: null,
            capturedAt: null,
          }),
          idempotencyKeyHash: keyHash,
          commandActorId: ctx.actorId,
          attempts: { create: [{ sequence: 1, status: PaymentStatus.PENDING }] },
        },
      });
      await this.govern(tx, ctx, 'FINANCE_PAYMENT_ATTEMPT_STARTED', row.id, {
        invoiceId: invoice.id,
        gatewayProvider: data.gatewayProvider,
      });
      return this.payment(row);
    });
  }

  async recordPaymentAuthorization(
    paymentId: string,
    evidence: {
      gatewayReference: string;
      safeMaskedMetadata?: Record<string, string>;
      providerEvidence?: Record<string, unknown>;
    },
    ctx: FinanceMutationContext,
  ): Promise<FinancePaymentDto> {
    return this.tx(async (tx) => {
      const current = await tx.financePaymentRecord.findUnique({ where: { id: paymentId } });
      if (!current) throw new Error('Payment attempt not found');
      if ([PaymentStatus.AUTHORIZED, PaymentStatus.CAPTURED].includes(current.status)) {
        if (current.gatewayReference && current.gatewayReference !== evidence.gatewayReference)
          throw new Error('Authorization replay reference mismatch');
        return this.payment(current);
      }
      if (current.status !== PaymentStatus.PENDING)
        throw new Error(`Payment cannot authorize from ${current.status}`);
      if (!evidence.gatewayReference.trim())
        throw new Error('Gateway authorization reference is required');
      const externalDuplicate = await tx.financePaymentRecord.findFirst({
        where: {
          gatewayProvider: current.gatewayProvider,
          gatewayReference: evidence.gatewayReference,
          NOT: { id: current.id },
        },
      });
      if (externalDuplicate) throw new Error('Duplicate external payment authorization rejected');
      const row = await tx.financePaymentRecord.update({
        where: { id: current.id },
        data: {
          status: PaymentStatus.AUTHORIZED,
          gatewayReference: evidence.gatewayReference,
          safeMaskedMetadata: evidence.safeMaskedMetadata as any,
          attempts: {
            create: {
              sequence: 2,
              status: PaymentStatus.AUTHORIZED,
              gatewayReference: evidence.gatewayReference,
            },
          },
        },
      });
      await this.govern(tx, ctx, 'FINANCE_PAYMENT_AUTHORIZED', row.id, {
        gatewayProvider: row.gatewayProvider,
        gatewayReference: evidence.gatewayReference,
      });
      return this.payment(row);
    });
  }

  async recordPaymentFailure(
    paymentId: string,
    failureCode: string,
    ctx: FinanceMutationContext,
  ): Promise<FinancePaymentDto> {
    return this.tx(async (tx) => {
      const current = await tx.financePaymentRecord.findUnique({ where: { id: paymentId } });
      if (!current) throw new Error('Payment attempt not found');
      if (current.status === PaymentStatus.FAILED) return this.payment(current);
      if (![PaymentStatus.PENDING, PaymentStatus.AUTHORIZED].includes(current.status))
        throw new Error(`Payment cannot fail from ${current.status}`);
      const attemptCount = await tx.financePaymentAttemptRecord.count({
        where: { paymentId: current.id },
      });
      const safeFailureCode = failureCode.trim().slice(0, 120) || 'UNKNOWN';
      const row = await tx.financePaymentRecord.update({
        where: { id: current.id },
        data: {
          status: PaymentStatus.FAILED,
          failureReason: safeFailureCode,
          attempts: {
            create: {
              sequence: attemptCount + 1,
              status: PaymentStatus.FAILED,
              gatewayReference: current.gatewayReference,
              safeFailureCode,
            },
          },
        },
      });
      await this.govern(tx, ctx, 'FINANCE_PAYMENT_FAILED', row.id, {
        failureCode: safeFailureCode,
      });
      return this.payment(row);
    });
  }

  async recordReconciledCapturedPaymentAtomic(
    paymentId: string,
    evidence: {
      gatewayReference: string;
      safeMaskedMetadata?: Record<string, string>;
      providerEvidence?: Record<string, unknown>;
    },
    ctx: FinanceMutationContext,
  ): Promise<FinancePaymentDto> {
    return this.tx(async (tx) => {
      const current = await tx.financePaymentRecord.findUnique({ where: { id: paymentId } });
      if (!current) throw new Error('Payment attempt not found');
      if (current.status === PaymentStatus.CAPTURED) return this.payment(current);
      this.checkAttestedAmount(
        evidence.providerEvidence,
        money(current.amountMinorUnits, current.currencyCode, current.scale),
      );
      if (![PaymentStatus.PENDING, PaymentStatus.AUTHORIZED].includes(current.status))
        throw new Error(`Payment cannot reconcile capture from ${current.status}`);
      if (!current.gatewayProvider || !evidence.gatewayReference?.trim())
        throw new Error('Reconciled payment requires authenticated provider evidence');
      if (current.gatewayReference && current.gatewayReference !== evidence.gatewayReference)
        throw new Error('Reconciled gateway reference mismatch');
      const gatewayDuplicate = await tx.financePaymentRecord.findFirst({
        where: {
          gatewayProvider: current.gatewayProvider,
          gatewayReference: evidence.gatewayReference,
          NOT: { id: current.id },
        },
      });
      if (gatewayDuplicate) throw new Error('Duplicate external payment capture rejected');
      const invoice = await tx.financeInvoiceRecord.findUnique({
        where: { id: current.invoiceId },
      });
      if (!invoice) throw new Error('Payment invoice not found');
      const amount = money(current.amountMinorUnits, current.currencyCode, current.scale);
      if (
        BigInt(amount.amountMinorUnits) <= 0n ||
        BigInt(amount.amountMinorUnits) > BigInt(invoice.dueMinorUnits)
      )
        throw new Error('Reconciled payment amount exceeds outstanding invoice balance');
      const attemptCount = await tx.financePaymentAttemptRecord.count({
        where: { paymentId: current.id },
      });
      const row = await tx.financePaymentRecord.update({
        where: { id: current.id },
        data: {
          status: PaymentStatus.CAPTURED,
          gatewayReference: evidence.gatewayReference,
          providerEvidence: evidence.providerEvidence,
          capturedAt: new Date(),
          safeMaskedMetadata: evidence.safeMaskedMetadata as any,
          failureReason: null,
          attempts: {
            create: {
              sequence: attemptCount + 1,
              status: PaymentStatus.CAPTURED,
              gatewayReference: evidence.gatewayReference,
            },
          },
        },
      });
      const cash = await this.systemAccount(
        tx,
        'PAYMENT_CLEARING',
        'ASSET',
        amount.currencyCode,
        amount.scale,
      );
      const receivable = await this.systemAccount(
        tx,
        'ACCOUNTS_RECEIVABLE',
        'ASSET',
        amount.currencyCode,
        amount.scale,
      );
      await this.postWithinTx(tx, {
        ...ctx,
        idempotencyKey: `payment:${row.id}:ledger`,
        businessReferenceType: 'PAYMENT',
        businessReferenceId: row.id,
        postings: [
          { accountId: cash.id, direction: 'DEBIT', amount },
          { accountId: receivable.id, direction: 'CREDIT', amount },
        ],
      });
      const due = BigInt(invoice.dueMinorUnits) - BigInt(amount.amountMinorUnits);
      await tx.financeInvoiceRecord.update({
        where: { id: invoice.id, version: invoice.version },
        data: {
          dueMinorUnits: due.toString(),
          status: due === 0n ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID,
          paidAt: due === 0n ? new Date() : null,
          version: { increment: 1 },
        },
      });
      await tx.financeDocumentRecord.create({
        data: {
          publicId: `fin_receipt_${randomUUID()}`,
          type: 'RECEIPT',
          invoiceId: invoice.id,
          paymentId: row.id,
          amountMinorUnits: amount.amountMinorUnits,
          currencyCode: amount.currencyCode,
          scale: amount.scale,
          issuedBy: ctx.actorId,
        },
      });
      await this.govern(tx, ctx, 'FINANCE_PAYMENT_RECONCILED_CAPTURED', row.id, {
        invoiceId: invoice.id,
        gatewayProvider: row.gatewayProvider,
        gatewayReference: evidence.gatewayReference,
      });
      return this.payment(row);
    });
  }

  async recordCapturedPaymentAtomic(
    data: CreateFinancePaymentDto,
    ctx: FinanceMutationContext,
  ): Promise<FinancePaymentDto> {
    assertPositiveFinanceMoney(data.amount);
    return this.tx(async (tx) => {
      const keyHash = hash(ctx.idempotencyKey);
      const current = await tx.financePaymentRecord.findUnique({
        where: { idempotencyKeyHash: keyHash },
      });
      if (!current) throw new Error('Payment attempt must be prepared before capture');
      if (current.status === PaymentStatus.CAPTURED) return this.payment(current);
      this.checkAttestedAmount(data.providerEvidence, data.amount, current.publicId);
      if (current.status !== PaymentStatus.AUTHORIZED)
        throw new Error(`Payment cannot capture from ${current.status}`);
      if (!data.gatewayProvider || !data.gatewayReference)
        throw new Error('Captured payment requires authenticated gateway evidence');
      if (
        current.invoiceId !== data.invoiceId ||
        current.amountMinorUnits !== data.amount.amountMinorUnits ||
        current.currencyCode !== data.amount.currencyCode ||
        current.scale !== data.amount.scale ||
        current.gatewayProvider !== data.gatewayProvider
      )
        throw new Error('Captured payment evidence does not match the prepared payment attempt');
      if (current.gatewayReference && current.gatewayReference !== data.gatewayReference)
        throw new Error('Captured gateway reference does not match the authorization reference');
      const gatewayDuplicate = await tx.financePaymentRecord.findFirst({
        where: {
          gatewayProvider: data.gatewayProvider,
          gatewayReference: data.gatewayReference,
          NOT: { id: current.id },
        },
      });
      if (gatewayDuplicate) throw new Error('Duplicate external payment capture rejected');
      const invoice = await tx.financeInvoiceRecord.findUnique({ where: { id: data.invoiceId } });
      if (
        !invoice ||
        ![InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE].includes(
          invoice.status,
        )
      )
        throw new Error('Invoice is not payable');
      const amount = data.amount;
      if (
        amount.currencyCode !== invoice.currencyCode ||
        amount.scale !== invoice.scale ||
        BigInt(amount.amountMinorUnits) <= 0n ||
        BigInt(amount.amountMinorUnits) > BigInt(invoice.dueMinorUnits)
      )
        throw new Error('Invalid captured amount');
      const attemptCount = await tx.financePaymentAttemptRecord.count({
        where: { paymentId: current.id },
      });
      const row = await tx.financePaymentRecord.update({
        where: { id: current.id },
        data: {
          status: PaymentStatus.CAPTURED,
          gatewayReference: data.gatewayReference,
          providerEvidence: data.providerEvidence,
          capturedAt: data.capturedAt ? new Date(data.capturedAt) : new Date(),
          safeMaskedMetadata: data.metadata as any,
          failureReason: null,
          attempts: {
            create: {
              sequence: attemptCount + 1,
              status: PaymentStatus.CAPTURED,
              gatewayReference: data.gatewayReference,
            },
          },
        },
      });
      const cash = await this.systemAccount(
        tx,
        'PAYMENT_CLEARING',
        'ASSET',
        amount.currencyCode,
        amount.scale,
      );
      const receivable = await this.systemAccount(
        tx,
        'ACCOUNTS_RECEIVABLE',
        'ASSET',
        amount.currencyCode,
        amount.scale,
      );
      await this.postWithinTx(tx, {
        ...ctx,
        idempotencyKey: `payment:${row.id}:ledger`,
        businessReferenceType: 'PAYMENT',
        businessReferenceId: row.id,
        postings: [
          { accountId: cash.id, direction: 'DEBIT', amount },
          { accountId: receivable.id, direction: 'CREDIT', amount },
        ],
      });
      const due = BigInt(invoice.dueMinorUnits) - BigInt(amount.amountMinorUnits);
      await tx.financeInvoiceRecord.update({
        where: { id: invoice.id, version: invoice.version },
        data: {
          dueMinorUnits: due.toString(),
          status: due === 0n ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID,
          paidAt: due === 0n ? new Date() : null,
          version: { increment: 1 },
        },
      });
      await tx.financeDocumentRecord.create({
        data: {
          publicId: `fin_receipt_${randomUUID()}`,
          type: 'RECEIPT',
          invoiceId: invoice.id,
          paymentId: row.id,
          amountMinorUnits: amount.amountMinorUnits,
          currencyCode: amount.currencyCode,
          scale: amount.scale,
          issuedBy: ctx.actorId,
        },
      });
      await this.govern(tx, ctx, 'FINANCE_PAYMENT_CAPTURED', row.id, {
        invoiceId: invoice.id,
        gatewayProvider: data.gatewayProvider,
        gatewayReference: data.gatewayReference,
      });
      return this.payment(row);
    });
  }

  async createCreditNote(
    invoiceId: string,
    amount: MoneyAmount,
    reason: string,
    ctx: FinanceMutationContext,
  ) {
    return this.tx(async (tx) => {
      const invoice = await tx.financeInvoiceRecord.findUnique({ where: { id: invoiceId } });
      if (
        !invoice ||
        ![InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE].includes(
          invoice.status,
        )
      )
        throw new Error('Credit note requires an issued invoice with outstanding value');
      this.checkVersion(invoice.version, ctx);
      await this.assertNoPendingPayments(tx, invoiceId);
      const existingCredits = await tx.financeDocumentRecord.findMany({
        where: { invoiceId, type: 'CREDIT_NOTE' },
      });
      const credited = existingCredits.reduce(
        (sum: bigint, row: any) => sum + BigInt(row.amountMinorUnits),
        0n,
      );
      const units = BigInt(amount.amountMinorUnits);
      if (
        amount.currencyCode !== invoice.currencyCode ||
        amount.scale !== invoice.scale ||
        units <= 0n ||
        units > BigInt(invoice.dueMinorUnits) ||
        credited + units > BigInt(invoice.totalMinorUnits)
      )
        throw new Error('Credit note exceeds the remaining eligible invoice balance');
      const row = await tx.financeDocumentRecord.create({
        data: {
          publicId: `fin_credit_${randomUUID()}`,
          type: 'CREDIT_NOTE',
          invoiceId,
          amountMinorUnits: amount.amountMinorUnits,
          currencyCode: amount.currencyCode,
          scale: amount.scale,
          reason,
          issuedBy: ctx.actorId,
        },
      });
      const revenue = await this.systemAccount(
        tx,
        `REVENUE:${invoice.originDomain}`,
        'REVENUE',
        amount.currencyCode,
        amount.scale,
      );
      const receivable = await this.systemAccount(
        tx,
        'ACCOUNTS_RECEIVABLE',
        'ASSET',
        amount.currencyCode,
        amount.scale,
      );
      await this.postWithinTx(tx, {
        ...ctx,
        idempotencyKey: `${ctx.idempotencyKey}:ledger`,
        businessReferenceType: 'CREDIT_NOTE',
        businessReferenceId: row.id,
        postings: [
          { accountId: revenue.id, direction: 'DEBIT', amount },
          { accountId: receivable.id, direction: 'CREDIT', amount },
        ],
      });
      const remaining = BigInt(invoice.dueMinorUnits) - units;
      await tx.financeInvoiceRecord.update({
        where: { id: invoice.id, version: invoice.version },
        data: {
          dueMinorUnits: remaining.toString(),
          status: remaining === 0n ? InvoiceStatus.CREDITED : invoice.status,
          version: { increment: 1 },
        },
      });
      await this.govern(tx, ctx, 'FINANCE_CREDIT_NOTE_CREATED', row.id, {
        invoiceId,
        remainingDueMinorUnits: remaining.toString(),
      });
      return {
        id: row.id,
        publicId: row.publicId,
        invoiceId,
        amount,
        reason,
        issuedBy: row.issuedBy,
        issuedAt: row.issuedAt,
      };
    });
  }
  async createReceipt(
    invoiceId: string,
    paymentId: string,
    amount: MoneyAmount,
    ctx: FinanceMutationContext,
  ) {
    return this.tx(async (tx) => {
      const existing = await tx.financeDocumentRecord.findFirst({
        where: { type: 'RECEIPT', paymentId },
      });
      const row =
        existing ||
        (await tx.financeDocumentRecord.create({
          data: {
            publicId: `fin_receipt_${randomUUID()}`,
            type: 'RECEIPT',
            invoiceId,
            paymentId,
            amountMinorUnits: amount.amountMinorUnits,
            currencyCode: amount.currencyCode,
            scale: amount.scale,
            issuedBy: ctx.actorId,
          },
        }));
      return {
        id: row.id,
        publicId: row.publicId,
        invoiceId,
        paymentId,
        amount,
        issuedAt: row.issuedAt,
      };
    });
  }
  async createInstallmentPlan(invoiceId: string, plan: any, ctx: FinanceMutationContext) {
    return this.tx(async (tx) => {
      const row = await tx.financeInstallmentPlanRecord.create({
        data: {
          publicId: `fin_plan_${randomUUID()}`,
          invoiceId,
          totalMinorUnits: plan.totalAmount.amountMinorUnits,
          currencyCode: plan.totalAmount.currencyCode,
          scale: plan.totalAmount.scale,
          status: plan.status,
          schedule: plan.installments,
        },
      });
      await this.govern(tx, ctx, 'FINANCE_INSTALLMENT_PLAN_CREATED', row.id, {});
      return {
        id: row.id,
        publicId: row.publicId,
        invoiceId,
        totalAmount: money(row.totalMinorUnits, row.currencyCode, row.scale),
        status: row.status,
        installments: row.schedule,
        createdAt: row.createdAt,
      };
    });
  }

  async createFinancialAccount(data: any, ctx: FinanceMutationContext) {
    const reserved = [
      'ACCOUNTS_RECEIVABLE',
      'PAYMENT_CLEARING',
      'TRANSFER_SETTLEMENT_CLEARING',
      'WALLET_SETTLEMENT_CLEARING',
    ];
    if (
      reserved.includes(data.ownerReferenceId) ||
      data.ownerReferenceId.startsWith('REVENUE:') ||
      data.ownerReferenceId === 'COMMISSION_EXPENSE' ||
      data.ownerReferenceId.startsWith('COMMISSION_PAYABLE:') ||
      data.ownerReferenceId.startsWith('SYSTEM:')
    )
      throw new Error(
        'Reserved finance system-account identity cannot be created through generic account creation',
      );
    if (data.systemManaged)
      throw new Error('Generic account creation cannot create system-managed accounts');
    return this.tx(async (tx) => {
      const row = await tx.financialAccountRecord.create({
        data: { ...data, systemManaged: false },
      });
      await this.govern(tx, ctx, 'FINANCIAL_ACCOUNT_CREATED', row.id, {});
      return row;
    });
  }
  async postLedgerTransaction(data: PostLedgerTransactionInput) {
    validateBalancedPostings(data.postings);
    return this.tx(async (tx) => {
      if (!data.approval)
        throw new Error('Manual ledger mutation requires bound maker-checker approval');
      const prior = await tx.financialTransactionRecord.findUnique({
        where: { idempotencyKeyHash: hash(data.idempotencyKey) },
        include: { entries: true },
      });
      if (prior) return this.transaction(await this.postWithinTx(tx, data));
      const adjustment = await tx.financeAdjustmentCaseRecord.findUnique({
        where: { publicId: data.businessReferenceId },
      });
      if (
        !adjustment ||
        adjustment.makerId !== data.actorId ||
        adjustment.status !== 'OPEN' ||
        data.businessReferenceType !== 'MANUAL_ADJUSTMENT' ||
        data.postings.some((p) => p.memo !== `DOCUMENT:${adjustment.supportingDocumentId}`)
      )
        throw new Error('FINANCE_ADJUSTMENT_EVIDENCE_REQUIRED');
      await tx.financeAdjustmentCaseRecord.update({
        where: { id: adjustment.id, version: adjustment.version },
        data: { status: 'POSTED', version: { increment: 1 } },
      });
      await this.consumeApproval(tx, data.approval);
      const row = await this.postWithinTx(tx, data);
      await this.govern(tx, data, 'FINANCIAL_LEDGER_POSTED', row.id, {
        businessReferenceType: data.businessReferenceType,
        businessReferenceId: data.businessReferenceId,
        approvalId: data.approval.approvalId,
      });
      return this.transaction(row);
    });
  }
  async reverseLedgerTransaction(
    transactionId: string,
    ctx: FinanceMutationContext,
    approval: FinanceApprovalBinding,
  ) {
    return this.tx(async (tx) => {
      const original = await tx.financialTransactionRecord.findFirst({
        where: { OR: [{ id: transactionId }, { publicId: transactionId }] },
        include: { entries: true, reversal: true },
      });
      if (!original) throw new Error('Financial transaction not found');
      if (original.businessReferenceType !== 'MANUAL_ADJUSTMENT')
        throw new Error('FINANCE_OWNER_MANAGED_REVERSAL_FORBIDDEN');
      const replay = await tx.financialTransactionRecord.findUnique({
        where: { idempotencyKeyHash: hash(ctx.idempotencyKey) },
        include: { entries: true },
      });
      if (replay) {
        if (replay.reversalOfId !== original.id || replay.createdBy !== ctx.actorId)
          throw new Error('FINANCE_IDEMPOTENCY_CONFLICT');
        return this.transaction(replay);
      }
      if (original.reversalOfId)
        throw new Error('A reversal transaction cannot itself be manually reversed');
      if (original.reversal) throw new Error('Financial transaction has already been reversed');
      await this.consumeApproval(tx, approval);
      const row = await this.postWithinTx(tx, {
        ...ctx,
        businessReferenceType: 'REVERSAL',
        businessReferenceId: original.publicId,
        reversalOfId: original.id,
        postings: original.entries.map((entry: any) => ({
          accountId: entry.accountId,
          direction: entry.direction === 'DEBIT' ? 'CREDIT' : 'DEBIT',
          amount: money(entry.amountMinorUnits, entry.currencyCode, entry.scale),
          memo: `Reversal of ${original.publicId}`,
        })),
      });
      await this.govern(tx, ctx, 'FINANCIAL_LEDGER_REVERSED', row.id, {
        originalTransactionId: original.id,
        approvalId: approval.approvalId,
      });
      return this.transaction(row);
    });
  }

  async createWallet(data: any, ctx: FinanceMutationContext) {
    return this.tx(async (tx) => {
      const account = await tx.financialAccountRecord.findUnique({ where: { id: data.accountId } });
      if (!account || !account.active) throw new Error('Wallet ledger account missing or inactive');
      if (account.systemManaged)
        throw new Error('System-managed account cannot back a customer wallet');
      if (account.type !== 'LIABILITY')
        throw new Error('Wallet must be backed by a LIABILITY ledger account');
      if (
        account.ownerReferenceId !== data.ownerReferenceId ||
        account.currencyCode !== data.currencyCode ||
        account.scale !== data.scale
      )
        throw new Error('Wallet owner or denomination does not match ledger account');
      const row = await tx.financeWalletRecord.create({ data });
      await this.govern(tx, ctx, 'FINANCE_WALLET_CREATED', row.id, { accountId: row.accountId });
      return row;
    });
  }
  async getWallet(id: string) {
    return this.db.financeWalletRecord.findFirst({ where: { OR: [{ id }, { publicId: id }] } });
  }
  async getWalletBalance(walletId: string) {
    const wallet = await this.db.financeWalletRecord.findFirst({
      where: { OR: [{ id: walletId }, { publicId: walletId }] },
      include: { account: true },
    });
    if (!wallet || !wallet.account || !wallet.account.active)
      throw new Error('Wallet or backing account not found/active');
    if (
      wallet.currencyCode !== wallet.account.currencyCode ||
      wallet.scale !== wallet.account.scale
    )
      throw new Error('Wallet denomination does not match backing ledger account');
    return this.walletBalanceWithinTx(this.db, wallet);
  }
  async createWalletHold(
    walletId: string,
    amount: MoneyAmount,
    businessReferenceId: string,
    ctx: FinanceMutationContext,
  ) {
    assertPositiveFinanceMoney(amount);
    return this.tx(async (tx) => {
      const wallet = await tx.financeWalletRecord.findUnique({
        where: { id: walletId },
        include: { account: true },
      });
      if (!wallet || wallet.status !== 'ACTIVE' || !wallet.account?.active)
        throw new Error('Wallet is not active');
      if (
        wallet.currencyCode !== amount.currencyCode ||
        wallet.scale !== amount.scale ||
        wallet.account.currencyCode !== amount.currencyCode ||
        wallet.account.scale !== amount.scale
      )
        throw new Error('Wallet hold denomination mismatch');
      const duplicate = await tx.financeWalletHoldRecord.findUnique({
        where: { idempotencyKeyHash: hash(ctx.idempotencyKey) },
      });
      if (duplicate) {
        if (
          duplicate.walletId !== walletId ||
          duplicate.businessReferenceId !== businessReferenceId ||
          duplicate.amountMinorUnits !== amount.amountMinorUnits ||
          duplicate.currencyCode !== amount.currencyCode ||
          duplicate.scale !== amount.scale
        )
          throw new Error('FINANCE_IDEMPOTENCY_CONFLICT');
        return this.hold(duplicate);
      }
      if (ctx.actorId !== wallet.ownerReferenceId)
        throw new Error('FINANCE_PAYER_CONSENT_REQUIRED');
      const obligation = await this.assertWalletObligation(tx, wallet, amount, businessReferenceId);
      this.checkVersion(obligation.version, ctx);
      if (
        await tx.financeWalletHoldRecord.count({
          where: {
            status: 'ACTIVE',
            businessReferenceId: { in: [obligation.id, obligation.publicId] },
          },
        })
      )
        throw new Error('FINANCE_OBLIGATION_ALREADY_RESERVED');
      await tx.financeInvoiceRecord.update({
        where: { id: obligation.id, version: obligation.version },
        data: { version: { increment: 1 } },
      });
      const balance = await this.walletBalanceWithinTx(tx, wallet);
      if (BigInt(balance.availableBalance.amountMinorUnits) < BigInt(amount.amountMinorUnits))
        throw new Error('Insufficient available balance');
      await tx.financeWalletRecord.update({
        where: { id: walletId, version: wallet.version },
        data: { version: { increment: 1 } },
      });
      const row = await tx.financeWalletHoldRecord.create({
        data: {
          publicId: `fin_hold_${randomUUID()}`,
          walletId,
          amountMinorUnits: amount.amountMinorUnits,
          currencyCode: amount.currencyCode,
          scale: amount.scale,
          status: 'ACTIVE',
          businessReferenceId,
          idempotencyKeyHash: hash(ctx.idempotencyKey),
        },
      });
      await this.govern(tx, ctx, 'FINANCE_WALLET_HOLD_CREATED', row.id, {});
      return this.hold(row);
    });
  }
  async resolveWalletHold(
    holdId: string,
    action: 'RELEASE' | 'CAPTURE',
    ctx: FinanceMutationContext,
  ) {
    return this.tx(async (tx) => {
      const current = await tx.financeWalletHoldRecord.findUnique({ where: { id: holdId } });
      if (!current || current.status !== 'ACTIVE') throw new Error('Wallet hold is not active');
      this.checkVersion(current.version, ctx);
      if (
        await tx.financeTransferRecord.findFirst({
          where: {
            OR: [{ publicId: current.businessReferenceId }, { id: current.businessReferenceId }],
          },
        })
      )
        throw new Error('FINANCE_OWNER_MANAGED_HOLD_FORBIDDEN');
      const wallet = await tx.financeWalletRecord.findUnique({
        where: { id: current.walletId },
        include: { account: true },
      });
      if (!wallet || !wallet.account?.active) throw new Error('Wallet not found');
      if (
        wallet.currencyCode !== current.currencyCode ||
        wallet.scale !== current.scale ||
        wallet.account.currencyCode !== current.currencyCode ||
        wallet.account.scale !== current.scale
      )
        throw new Error('Wallet hold denomination does not match backing account');
      await tx.financeWalletRecord.update({
        where: { id: wallet.id, version: wallet.version },
        data: { version: { increment: 1 } },
      });
      const row = await tx.financeWalletHoldRecord.update({
        where: { id: holdId },
        data: {
          status: action === 'RELEASE' ? 'RELEASED' : 'CAPTURED',
          resolvedAt: new Date(),
          version: { increment: 1 },
        },
      });
      if (action === 'CAPTURE') {
        await this.assertWalletObligation(
          tx,
          wallet,
          money(current.amountMinorUnits, current.currencyCode, current.scale),
          current.businessReferenceId,
          current.id,
        );
        const settlement = await this.systemAccount(
          tx,
          'ACCOUNTS_RECEIVABLE',
          'ASSET',
          current.currencyCode,
          current.scale,
        );
        const amount = money(current.amountMinorUnits, current.currencyCode, current.scale);
        await this.postWithinTx(tx, {
          ...ctx,
          idempotencyKey: `${ctx.idempotencyKey}:ledger`,
          businessReferenceType: 'WALLET_HOLD_CAPTURE',
          businessReferenceId: row.id,
          postings: [
            { accountId: wallet.accountId, direction: 'DEBIT', amount },
            { accountId: settlement.id, direction: 'CREDIT', amount },
          ],
        });
      }
      if (action === 'CAPTURE') {
        const invoice = await tx.financeInvoiceRecord.findFirst({
          where: {
            OR: [{ id: current.businessReferenceId }, { publicId: current.businessReferenceId }],
          },
        });
        const due = BigInt(invoice.dueMinorUnits) - BigInt(current.amountMinorUnits);
        await tx.financeInvoiceRecord.update({
          where: { id: invoice.id, version: invoice.version },
          data: {
            dueMinorUnits: due.toString(),
            status: due === 0n ? 'PAID' : 'PARTIALLY_PAID',
            paidAt: due === 0n ? new Date() : null,
            version: { increment: 1 },
          },
        });
      }
      await this.govern(tx, ctx, `FINANCE_WALLET_HOLD_${action}D`, row.id, {});
      return this.hold(row);
    });
  }

  async saveExchangeRate(data: any, ctx: FinanceMutationContext) {
    return this.tx(async (tx) => {
      if (
        !/^\d+$/.test(data.rateNumerator) ||
        !/^\d+$/.test(data.rateDenominator) ||
        BigInt(data.rateNumerator) <= 0n ||
        BigInt(data.rateDenominator) <= 0n
      )
        throw new Error('Invalid exact exchange rate');
      if (
        data.effectiveTo &&
        new Date(data.effectiveTo).getTime() <= new Date(data.effectiveFrom).getTime()
      )
        throw new Error('Invalid exchange-rate effective window');
      if (data.source === 'MANUAL_OVERRIDE' && data.approved)
        throw new Error('Manual FX override cannot be approved at creation time');
      const row = await tx.financeExchangeRateRecord.create({ data });
      await this.govern(tx, ctx, 'FINANCE_EXCHANGE_RATE_SAVED', row.id, {
        approved: row.approved,
        source: row.source,
      });
      return row;
    });
  }
  async findEffectiveExchangeRate(
    sourceCurrencyCode: string,
    targetCurrencyCode: string,
    at: Date,
  ): Promise<ExchangeRateDto | null> {
    const where = {
      sourceCurrencyCode,
      targetCurrencyCode,
      approved: true,
      effectiveFrom: { lte: at },
      OR: [{ effectiveTo: null }, { effectiveTo: { gt: at } }],
    };
    const manual = await this.db.financeExchangeRateRecord.findFirst({
      where: { ...where, source: 'MANUAL_OVERRIDE' },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (manual) return manual;
    return this.db.financeExchangeRateRecord.findFirst({
      where: { ...where, source: 'AUTOMATIC_PROVIDER' },
      orderBy: { effectiveFrom: 'desc' },
    });
  }
  async listExchangeRates() {
    return this.db.financeExchangeRateRecord.findMany({
      orderBy: [{ effectiveFrom: 'desc' }, { id: 'desc' }],
      take: 100,
    });
  }
  async activateExchangeRate(
    id: string,
    approval: FinanceApprovalBinding,
    ctx: FinanceMutationContext,
  ) {
    return this.tx(async (tx) => {
      const current = await tx.financeExchangeRateRecord.findFirst({
        where: { OR: [{ id }, { publicId: id }] },
      });
      if (!current || current.source !== 'MANUAL_OVERRIDE' || current.approved)
        throw new Error('Manual FX override is not activatable');
      this.checkVersion(current.version, ctx);
      if (current.makerId !== approval.makerId)
        throw new Error('FX approval maker binding mismatch');
      const overlap = await tx.financeExchangeRateRecord.findFirst({
        where: {
          source: 'MANUAL_OVERRIDE',
          approved: true,
          sourceCurrencyCode: current.sourceCurrencyCode,
          targetCurrencyCode: current.targetCurrencyCode,
          NOT: { id: current.id },
          ...(current.effectiveTo ? { effectiveFrom: { lt: current.effectiveTo } } : {}),
          OR: [{ effectiveTo: null }, { effectiveTo: { gt: current.effectiveFrom } }],
        },
      });
      if (overlap) throw new Error('FINANCE_FX_WINDOW_CONFLICT');
      await this.consumeApproval(tx, approval);
      const row = await tx.financeExchangeRateRecord.update({
        where: { id: current.id },
        data: { approved: true, approvalId: approval.approvalId, version: { increment: 1 } },
      });
      await this.govern(tx, ctx, 'FINANCE_EXCHANGE_RATE_APPROVED', row.id, {
        approvalId: approval.approvalId,
      });
      return row;
    });
  }
  async createTransfer(data: any, ctx: FinanceMutationContext) {
    return this.tx(async (tx) => {
      const existing = await tx.financeTransferRecord.findUnique({
        where: { idempotencyKeyHash: hash(ctx.idempotencyKey) },
      });
      if (existing) {
        if (
          existing.sourceWalletId !== data.sourceWalletId ||
          existing.destinationReferenceId !== data.destinationReferenceId ||
          existing.destinationCurrencyCode !== data.destinationCurrencyCode ||
          existing.sourceAmountMinorUnits !== data.sourceAmount.amountMinorUnits ||
          existing.sourceCurrencyCode !== data.sourceAmount.currencyCode ||
          existing.sourceScale !== data.sourceAmount.scale ||
          existing.bankProvider !== data.bankProvider ||
          existing.makerId !== ctx.actorId
        )
          throw new Error('FINANCE_IDEMPOTENCY_CONFLICT');
        return this.transfer(existing);
      }
      assertPositiveFinanceMoney(data.sourceAmount);
      const wallet = await tx.financeWalletRecord.findUnique({
        where: { id: data.sourceWalletId },
        include: { account: true },
      });
      if (!wallet || wallet.status !== 'ACTIVE' || !wallet.account?.active)
        throw new Error('Source wallet is not active');
      if (
        wallet.currencyCode !== data.sourceAmount.currencyCode ||
        wallet.scale !== data.sourceAmount.scale ||
        wallet.account.currencyCode !== data.sourceAmount.currencyCode ||
        wallet.account.scale !== data.sourceAmount.scale
      )
        throw new Error('Transfer source denomination does not match wallet/account');
      const row = await tx.financeTransferRecord.create({
        data: {
          publicId: data.publicId,
          sourceWalletId: data.sourceWalletId,
          destinationReferenceId: data.destinationReferenceId,
          destinationCurrencyCode: data.destinationCurrencyCode,
          sourceCurrencyCode: data.sourceAmount.currencyCode,
          sourceScale: data.sourceAmount.scale,
          sourceAmountMinorUnits: data.sourceAmount.amountMinorUnits,
          targetCurrencyCode: data.targetAmount?.currencyCode,
          targetScale: data.targetAmount?.scale,
          targetAmountMinorUnits: data.targetAmount?.amountMinorUnits,
          rateId: data.rateId,
          feeAmountMinorUnits: data.feeAmount?.amountMinorUnits,
          feePolicyReference: data.feePolicyReference,
          bankProvider: data.bankProvider,
          status: data.status,
          makerId: data.makerId,
          correlationId: data.correlationId,
          idempotencyKeyHash: hash(ctx.idempotencyKey),
        },
      });
      await this.govern(tx, ctx, 'FINANCE_TRANSFER_REQUESTED', row.id, {});
      return this.transfer(row);
    });
  }
  async getTransfer(id: string) {
    const row = await this.db.financeTransferRecord.findFirst({
      where: { OR: [{ id }, { publicId: id }] },
    });
    return row ? this.transfer(row) : null;
  }
  async lockTransferRate(
    id: string,
    rate: ExchangeRateDto,
    targetAmount: MoneyAmount,
    ctx: FinanceMutationContext,
  ) {
    assertPositiveFinanceMoney(targetAmount);
    return this.tx(async (tx) => {
      const current = await tx.financeTransferRecord.findUnique({ where: { id } });
      if (!current || current.status !== 'VALIDATED')
        throw new Error('Transfer must be VALIDATED before rate lock');
      this.checkVersion(current.version, ctx);
      if (
        !rate.approved ||
        rate.sourceCurrencyCode !== current.sourceCurrencyCode ||
        rate.targetCurrencyCode !== current.destinationCurrencyCode
      )
        throw new Error('FX rate does not match transfer corridor');
      const row = await tx.financeTransferRecord.update({
        where: { id, version: current.version },
        data: {
          targetCurrencyCode: targetAmount.currencyCode,
          targetScale: targetAmount.scale,
          targetAmountMinorUnits: targetAmount.amountMinorUnits,
          rateId: rate.id,
          rateNumeratorSnapshot: rate.rateNumerator,
          rateDenominatorSnapshot: rate.rateDenominator,
          marginBasisPointsSnapshot: rate.marginBasisPoints,
          status: 'RATE_LOCKED',
          version: { increment: 1 },
        },
      });
      await this.govern(tx, ctx, 'FINANCE_TRANSFER_RATE_LOCKED', id, { rateId: rate.id });
      return this.transfer(row);
    });
  }
  async calculateTransferFee(
    id: string,
    feeAmount: MoneyAmount,
    policyReference: string,
    ctx: FinanceMutationContext,
  ) {
    return this.tx(async (tx) => {
      const current = await tx.financeTransferRecord.findUnique({ where: { id } });
      if (
        !current ||
        current.status !== 'RATE_LOCKED' ||
        !current.rateId ||
        !current.targetAmountMinorUnits
      )
        throw new Error('Transfer must have a locked rate before fee calculation');
      this.checkVersion(current.version, ctx);
      if (
        feeAmount.currencyCode !== current.sourceCurrencyCode ||
        feeAmount.scale !== current.sourceScale ||
        BigInt(feeAmount.amountMinorUnits) < 0n
      )
        throw new Error('Invalid transfer fee denomination');
      if (!policyReference.trim()) throw new Error('Transfer fee policy reference is required');
      const row = await tx.financeTransferRecord.update({
        where: { id, version: current.version },
        data: {
          feeAmountMinorUnits: feeAmount.amountMinorUnits,
          feePolicyReference: policyReference,
          status: 'FEES_CALCULATED',
          version: { increment: 1 },
        },
      });
      await this.govern(tx, ctx, 'FINANCE_TRANSFER_FEES_CALCULATED', id, {
        policyReference,
        feeAmountMinorUnits: feeAmount.amountMinorUnits,
      });
      return this.transfer(row);
    });
  }
  async transitionTransfer(
    id: string,
    status: TransferStatus,
    ctx: FinanceMutationContext,
    evidence: any = {},
  ) {
    return this.tx(async (tx) => {
      const current = await tx.financeTransferRecord.findUnique({ where: { id } });
      if (!current) throw new Error('Transfer not found');
      this.checkVersion(current.version, ctx);
      assertTransferTransition(current.status, status);
      if (['SETTLED', 'FAILED', 'REVERSED'].includes(status))
        assertBankTransferEvidence(evidence.providerEvidence || {}, this.transfer(current));
      const wallet = await tx.financeWalletRecord.findUnique({
        where: { id: current.sourceWalletId },
        include: { account: true },
      });
      if (
        !wallet ||
        !wallet.account ||
        wallet.currencyCode !== current.sourceCurrencyCode ||
        wallet.scale !== current.sourceScale ||
        wallet.account.currencyCode !== current.sourceCurrencyCode ||
        wallet.account.scale !== current.sourceScale
      )
        throw new Error('Transfer wallet/account denomination invariant failed');
      if (status === 'PENDING_APPROVAL') {
        if (
          !current.rateId ||
          !current.targetAmountMinorUnits ||
          current.feeAmountMinorUnits == null ||
          !current.feePolicyReference
        )
          throw new Error('Transfer financial snapshot must be complete before approval');
        const amountUnits =
          BigInt(current.sourceAmountMinorUnits) + BigInt(current.feeAmountMinorUnits);
        const balance = await this.walletBalanceWithinTx(tx, wallet);
        if (BigInt(balance.availableBalance.amountMinorUnits) < amountUnits)
          throw new Error('Insufficient available wallet balance');
        const holdKey = hash(`${ctx.idempotencyKey}:hold`);
        const existingHold = await tx.financeWalletHoldRecord.findUnique({
          where: { idempotencyKeyHash: holdKey },
        });
        if (!existingHold) {
          await tx.financeWalletRecord.update({
            where: { id: wallet.id, version: wallet.version },
            data: { version: { increment: 1 } },
          });
          await tx.financeWalletHoldRecord.create({
            data: {
              publicId: `fin_hold_${randomUUID()}`,
              walletId: wallet.id,
              amountMinorUnits: amountUnits.toString(),
              currencyCode: current.sourceCurrencyCode,
              scale: current.sourceScale,
              status: 'ACTIVE',
              businessReferenceId: current.publicId,
              idempotencyKeyHash: holdKey,
            },
          });
        }
      }
      if (status === 'APPROVED') {
        if (!evidence.approval)
          throw new Error('Transfer approval requires bound approval evidence');
        await this.consumeApproval(tx, evidence.approval);
      }
      if (status === 'PROCESSING') {
        if (
          !evidence.bankProvider ||
          !evidence.bankProviderReference ||
          evidence.providerStatus !== 'PROCESSING'
        )
          throw new Error('Transfer PROCESSING requires bank submission evidence');
      }
      let settlementTransactionId = current.settlementTransactionId;
      let reversalTransactionId = current.reversalTransactionId;
      if (status === 'SETTLED') {
        if (
          !evidence.bankProviderReference ||
          evidence.providerStatus !== 'SETTLED' ||
          evidence.bankProviderReference !== current.bankProviderReference
        )
          throw new Error('Transfer SETTLED requires matching provider settlement evidence');
        if (current.settlementTransactionId)
          throw new Error('Transfer settlement ledger already exists');
        const hold = await tx.financeWalletHoldRecord.findFirst({
          where: {
            walletId: current.sourceWalletId,
            businessReferenceId: current.publicId,
            status: 'ACTIVE',
          },
        });
        if (!hold) throw new Error('Transfer settlement requires an active funds hold');
        const settlement = await this.systemAccount(
          tx,
          'TRANSFER_SETTLEMENT_CLEARING',
          'ASSET',
          current.sourceCurrencyCode,
          current.sourceScale,
        );
        const amount = money(
          hold.amountMinorUnits,
          current.sourceCurrencyCode,
          current.sourceScale,
        );
        const ledger = await this.postWithinTx(tx, {
          ...ctx,
          idempotencyKey: `${ctx.idempotencyKey}:ledger`,
          businessReferenceType: 'TRANSFER',
          businessReferenceId: current.id,
          postings: [
            { accountId: wallet.accountId, direction: 'DEBIT', amount },
            { accountId: settlement.id, direction: 'CREDIT', amount },
          ],
        });
        settlementTransactionId = ledger.id;
        await tx.financeWalletHoldRecord.update({
          where: { id: hold.id },
          data: { status: 'CAPTURED', resolvedAt: new Date() },
        });
      }
      if (status === 'FAILED' || status === 'CANCELLED' || status === 'REJECTED') {
        if (status === 'FAILED' && evidence.providerStatus !== 'FAILED')
          throw new Error('Transfer failure requires provider failure evidence');
        await tx.financeWalletHoldRecord.updateMany({
          where: {
            walletId: current.sourceWalletId,
            businessReferenceId: current.publicId,
            status: 'ACTIVE',
          },
          data: { status: 'RELEASED', resolvedAt: new Date() },
        });
      }
      if (status === 'COMPLETED' && current.providerStatus !== 'SETTLED')
        throw new Error('Transfer cannot complete without settled provider evidence');
      if (status === 'REVERSED') {
        if (
          !current.bankProvider ||
          !current.bankProviderReference ||
          evidence.bankProvider !== current.bankProvider ||
          evidence.bankProviderReference !== current.bankProviderReference ||
          evidence.providerStatus !== 'REVERSED'
        )
          throw new Error('Transfer REVERSED requires matching provider reversal evidence');
        if (!current.settlementTransactionId)
          throw new Error('Transfer has no settlement ledger to reverse');
        if (current.reversalTransactionId)
          throw new Error('Transfer settlement has already been reversed');
        const original = await tx.financialTransactionRecord.findUnique({
          where: { id: current.settlementTransactionId },
          include: { entries: true, reversal: true },
        });
        if (!original || original.reversal)
          throw new Error('Transfer settlement reversal is unavailable');
        const reversal = await this.postWithinTx(tx, {
          ...ctx,
          idempotencyKey: `${ctx.idempotencyKey}:reversal-ledger`,
          businessReferenceType: 'TRANSFER_REVERSAL',
          businessReferenceId: current.id,
          reversalOfId: original.id,
          postings: original.entries.map((entry: any) => ({
            accountId: entry.accountId,
            direction: entry.direction === 'DEBIT' ? 'CREDIT' : 'DEBIT',
            amount: money(entry.amountMinorUnits, entry.currencyCode, entry.scale),
            memo: `Transfer reversal ${current.publicId}`,
          })),
        });
        reversalTransactionId = reversal.id;
      }
      const row = await tx.financeTransferRecord.update({
        where: { id, version: current.version },
        data: {
          status,
          version: { increment: 1 },
          ...(evidence.bankProvider && { bankProvider: evidence.bankProvider }),
          ...(evidence.bankProviderReference && {
            bankProviderReference: evidence.bankProviderReference,
          }),
          ...(evidence.providerStatus && { providerStatus: evidence.providerStatus }),
          ...(evidence.providerEvidence && { providerEvidence: evidence.providerEvidence }),
          ...(evidence.providerFailureCode && {
            providerFailureCode: evidence.providerFailureCode,
          }),
          ...(settlementTransactionId && { settlementTransactionId }),
          ...(reversalTransactionId && { reversalTransactionId }),
        },
      });
      await this.govern(tx, ctx, `FINANCE_TRANSFER_${status}`, id, {
        providerStatus: evidence.providerStatus,
        settlementTransactionId,
        reversalTransactionId,
      });
      return this.transfer(row);
    });
  }
  async listTransfers() {
    const rows = await this.db.financeTransferRecord.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
    });
    return rows.map((row: any) => this.transfer(row));
  }
  async createApproval(data: any, ctx: FinanceMutationContext) {
    return this.tx(async (tx) => {
      if (!data.payloadHash || !data.policyReference)
        throw new Error('Approval payload and policy binding are required');
      const row = await tx.financeApprovalRecord.create({
        data: {
          publicId: data.publicId,
          actionType: data.actionType,
          targetReferenceId: data.targetReferenceId,
          amountMinorUnits: data.amount?.amountMinorUnits,
          currencyCode: data.amount?.currencyCode,
          scale: data.amount?.scale,
          makerId: data.makerId,
          requiredApprovals: data.requiredApprovals,
          payloadHash: data.payloadHash,
          policyReference: data.policyReference,
          consumedAt: null,
          status: data.status,
          expiresAt: data.expiresAt,
        },
        include: { decisions: true },
      });
      await this.govern(tx, ctx, 'FINANCE_APPROVAL_CREATED', row.id, {
        actionType: row.actionType,
        policyReference: row.policyReference,
        payloadHash: row.payloadHash,
      });
      return this.approval(row);
    });
  }
  async getApproval(id: string) {
    const row = await this.db.financeApprovalRecord.findFirst({
      where: { OR: [{ id }, { publicId: id }] },
      include: { decisions: true },
    });
    return row ? this.approval(row) : null;
  }
  async decideApproval(
    id: string,
    decision: 'APPROVE' | 'REJECT',
    checkerId: string,
    reason: string | undefined,
    ctx: FinanceMutationContext,
  ) {
    return this.tx(async (tx) => {
      const current = await tx.financeApprovalRecord.findFirst({
        where: { OR: [{ id }, { publicId: id }] },
        include: { decisions: true },
      });
      if (!current || current.status !== 'PENDING') throw new Error('Approval is not pending');
      this.checkVersion(current.version, ctx);
      assertCheckerEligible(current.makerId, checkerId, current.decisions);
      if (current.expiresAt && current.expiresAt <= new Date()) throw new Error('Approval expired');
      await tx.financeApprovalDecisionRecord.create({
        data: { approvalId: current.id, approverId: checkerId, decision, reason },
      });
      const decisions = await tx.financeApprovalDecisionRecord.findMany({
        where: { approvalId: current.id },
      });
      const approvalCount = decisions.filter((item: any) => item.decision === 'APPROVE').length;
      const hasRejection = decisions.some((item: any) => item.decision === 'REJECT');
      const status = hasRejection
        ? 'REJECTED'
        : approvalCount >= current.requiredApprovals
          ? 'APPROVED'
          : 'PENDING';
      const updated = await tx.financeApprovalRecord.updateMany({
        where: { id: current.id, status: 'PENDING' },
        data: { status, version: { increment: 1 } },
      });
      if (updated.count !== 1) throw new Error('Approval decision lost a concurrent state race');
      const row = await tx.financeApprovalRecord.findUnique({
        where: { id: current.id },
        include: { decisions: true },
      });
      if (!row) throw new Error('Approval disappeared during decision');
      await this.govern(tx, ctx, `FINANCE_APPROVAL_${decision}D`, current.id, { checkerId });
      return this.approval(row);
    });
  }
  async listApprovals(status?: string) {
    const rows = await this.db.financeApprovalRecord.findMany({
      where: status ? { status } : {},
      include: { decisions: true },
      take: 100,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return rows.map((row: any) => this.approval(row));
  }
  async createRefund(data: any, ctx: FinanceMutationContext) {
    return this.tx(async (tx) => {
      const replay = await this.commandReplay(tx, ctx, 'REFUND_CREATE', 'new', {
        paymentId: data.paymentId,
        amount: data.amount,
        reason: data.reason,
      });
      if (replay) return replay;
      const payment = await tx.financePaymentRecord.findUnique({ where: { id: data.paymentId } });
      if (
        !payment ||
        ![PaymentStatus.CAPTURED, PaymentStatus.PARTIALLY_REFUNDED].includes(payment.status)
      )
        throw new Error('Payment is not refundable');
      const refunds = await tx.financeRefundRecord.findMany({
        where: {
          paymentId: data.paymentId,
          status: {
            in: ['PENDING_APPROVAL', 'APPROVED', 'PROCESSING', 'UNKNOWN_OUTCOME', 'COMPLETED'],
          },
        },
      });
      const reserved = refunds.reduce(
        (sum: bigint, row: any) => sum + BigInt(row.amountMinorUnits),
        0n,
      );
      if (
        data.amount.currencyCode !== payment.currencyCode ||
        data.amount.scale !== payment.scale ||
        BigInt(data.amount.amountMinorUnits) <= 0n ||
        reserved + BigInt(data.amount.amountMinorUnits) > BigInt(payment.amountMinorUnits)
      )
        throw new Error('Refund exceeds remaining refundable amount');
      const row = await tx.financeRefundRecord.create({
        data: {
          publicId: data.publicId,
          paymentId: data.paymentId,
          amountMinorUnits: data.amount.amountMinorUnits,
          currencyCode: data.amount.currencyCode,
          scale: data.amount.scale,
          reason: data.reason,
          status: 'PENDING_APPROVAL',
          makerId: data.makerId,
        },
      });
      await this.govern(tx, ctx, 'FINANCE_REFUND_REQUESTED', row.id, {});
      const result = this.refund(row);
      await this.storeCommand(
        tx,
        ctx,
        'REFUND_CREATE',
        'new',
        { paymentId: data.paymentId, amount: data.amount, reason: data.reason },
        result,
      );
      return result;
    });
  }
  async getRefund(id: string) {
    const row = await this.db.financeRefundRecord.findFirst({
      where: { OR: [{ id }, { publicId: id }] },
    });
    return row ? this.refund(row) : null;
  }
  async beginRefundProcessing(
    id: string,
    approval: FinanceApprovalBinding,
    ctx: FinanceMutationContext,
  ) {
    return this.tx(async (tx) => {
      const refund = await tx.financeRefundRecord.findUnique({ where: { id } });
      if (!refund || refund.status !== 'PENDING_APPROVAL')
        throw new Error('Refund is not pending approval');
      this.checkVersion(refund.version, ctx);
      const payment = await tx.financePaymentRecord.findUnique({ where: { id: refund.paymentId } });
      if (!payment || !payment.gatewayProvider || !payment.gatewayReference)
        throw new Error('Original payment gateway evidence missing');
      await this.consumeApproval(tx, approval);
      const reserved = await tx.financeRefundRecord.updateMany({
        where: { id: refund.id, status: 'PENDING_APPROVAL', approvalId: null },
        data: { status: 'PROCESSING', approvalId: approval.approvalId, version: { increment: 1 } },
      });
      if (reserved.count !== 1) throw new Error('Refund execution was reserved concurrently');
      const row = await tx.financeRefundRecord.findUnique({ where: { id: refund.id } });
      if (!row) throw new Error('Refund disappeared during execution reservation');
      await this.govern(tx, ctx, 'FINANCE_REFUND_PROCESSING', row.id, {
        approvalId: approval.approvalId,
      });
      return this.refund(row);
    });
  }
  async completeRefundAtomic(
    id: string,
    providerEvidence: {
      gatewayProvider: string;
      gatewayReference: string;
      attestation?: Record<string, unknown>;
    },
    ctx: FinanceMutationContext,
  ) {
    return this.tx(async (tx) => {
      const refund = await tx.financeRefundRecord.findUnique({ where: { id } });
      if (refund?.status === 'COMPLETED') {
        if (
          refund.gatewayProvider !== providerEvidence.gatewayProvider ||
          refund.gatewayReference !== providerEvidence.gatewayReference
        )
          throw new Error('FINANCE_IDEMPOTENCY_CONFLICT');
        return this.refund(refund);
      }
      if (
        !refund ||
        !['PROCESSING', 'UNKNOWN_OUTCOME'].includes(refund.status) ||
        !refund.approvalId
      )
        throw new Error('Refund is not reserved for processing');
      this.checkAttestedAmount(
        providerEvidence.attestation,
        money(refund.amountMinorUnits, refund.currencyCode, refund.scale),
        refund.publicId,
      );
      const payment = await tx.financePaymentRecord.findUnique({ where: { id: refund.paymentId } });
      if (!payment || !payment.gatewayProvider || !payment.gatewayReference)
        throw new Error('Original payment gateway evidence missing');
      if (
        providerEvidence.gatewayProvider !== payment.gatewayProvider ||
        !providerEvidence.gatewayReference.trim()
      )
        throw new Error('Refund provider evidence does not match original payment provider');
      const duplicateEvidence = await tx.financeRefundRecord.findFirst({
        where: {
          gatewayProvider: providerEvidence.gatewayProvider,
          gatewayReference: providerEvidence.gatewayReference,
          status: 'COMPLETED',
          NOT: { id: refund.id },
        },
      });
      if (duplicateEvidence) throw new Error('Duplicate external refund completion rejected');
      const amount = money(refund.amountMinorUnits, refund.currencyCode, refund.scale);
      const cash = await this.systemAccount(
        tx,
        'PAYMENT_CLEARING',
        'ASSET',
        refund.currencyCode,
        refund.scale,
      );
      const receivable = await this.systemAccount(
        tx,
        'ACCOUNTS_RECEIVABLE',
        'ASSET',
        refund.currencyCode,
        refund.scale,
      );
      await this.postWithinTx(tx, {
        ...ctx,
        idempotencyKey: `refund:${refund.id}:ledger`,
        businessReferenceType: 'REFUND',
        businessReferenceId: refund.id,
        postings: [
          { accountId: receivable.id, direction: 'DEBIT', amount },
          { accountId: cash.id, direction: 'CREDIT', amount },
        ],
      });
      const completed = await tx.financeRefundRecord.findMany({
        where: { paymentId: payment.id, status: 'COMPLETED' },
      });
      const previouslyRefunded = completed.reduce(
        (sum: bigint, row: any) => sum + BigInt(row.amountMinorUnits),
        0n,
      );
      const totalRefunded = previouslyRefunded + BigInt(refund.amountMinorUnits);
      const paymentStatus =
        totalRefunded === BigInt(payment.amountMinorUnits)
          ? PaymentStatus.REFUNDED
          : PaymentStatus.PARTIALLY_REFUNDED;
      await tx.financePaymentRecord.update({
        where: { id: payment.id },
        data: { status: paymentStatus },
      });
      const invoice = await tx.financeInvoiceRecord.findUnique({
        where: { id: payment.invoiceId },
      });
      if (invoice) {
        const newDue = BigInt(invoice.dueMinorUnits) + BigInt(refund.amountMinorUnits);
        const reopenedStatus =
          newDue === BigInt(invoice.totalMinorUnits)
            ? InvoiceStatus.ISSUED
            : InvoiceStatus.PARTIALLY_PAID;
        await tx.financeInvoiceRecord.update({
          where: { id: invoice.id, version: invoice.version },
          data: {
            dueMinorUnits: newDue.toString(),
            status: reopenedStatus,
            paidAt: null,
            version: { increment: 1 },
          },
        });
      }
      const row = await tx.financeRefundRecord.update({
        where: { id: refund.id },
        data: {
          status: 'COMPLETED',
          gatewayProvider: providerEvidence.gatewayProvider,
          gatewayReference: providerEvidence.gatewayReference,
          completedAt: new Date(),
          providerEvidence: providerEvidence.attestation,
        },
      });
      const commissions = await tx.financeCommissionRecord.findMany({
        where: { sourcePaymentId: payment.id },
      });
      for (const commission of commissions) {
        const net = BigInt(payment.amountMinorUnits) - totalRefunded;
        const newUnits = (net * BigInt(commission.calculationBasisPoints || 0)) / 10000n;
        const automatic =
          commission.policyReference === 'NET_CAPTURE_CLAWBACK_V1' &&
          ['ACCRUED', 'APPROVED', 'PAYABLE'].includes(commission.status);
        await tx.financeCommissionRecord.update({
          where: { id: commission.id },
          data: automatic
            ? {
                amountMinorUnits: newUnits.toString(),
                status: newUnits === 0n ? 'REVERSED' : commission.status,
              }
            : { status: 'DISPUTED' },
        });
        if (automatic && BigInt(commission.amountMinorUnits) > newUnits) {
          const expense = await this.systemAccount(
            tx,
            'COMMISSION_EXPENSE',
            'EXPENSE',
            commission.currencyCode,
            commission.scale,
          );
          const payable = await this.systemAccount(
            tx,
            `COMMISSION_PAYABLE:${commission.recipientReferenceId}`,
            'LIABILITY',
            commission.currencyCode,
            commission.scale,
          );
          const amount = money(
            (BigInt(commission.amountMinorUnits) - newUnits).toString(),
            commission.currencyCode,
            commission.scale,
          );
          await this.postWithinTx(tx, {
            ...ctx,
            idempotencyKey: `commission:${commission.id}:refund:${refund.id}`,
            businessReferenceType: 'COMMISSION_REFUND_ADJUSTMENT',
            businessReferenceId: `${commission.id}:${refund.id}`,
            postings: [
              { accountId: payable.id, direction: 'DEBIT', amount },
              { accountId: expense.id, direction: 'CREDIT', amount },
            ],
          });
        }
        await this.govern(tx, ctx, 'FINANCE_COMMISSION_REFUND_ADJUSTED', commission.id, {
          refundId: refund.id,
          previousMinorUnits: commission.amountMinorUnits,
          netMinorUnits: automatic ? newUnits.toString() : null,
          policyReference: commission.policyReference,
        });
      }
      await this.govern(tx, ctx, 'FINANCE_REFUND_COMPLETED', row.id, {
        approvalId: refund.approvalId,
        gatewayProvider: providerEvidence.gatewayProvider,
      });
      return this.refund(row);
    });
  }
  async failRefund(id: string, failureCode: string, ctx: FinanceMutationContext) {
    return this.tx(async (tx) => {
      const current = await tx.financeRefundRecord.findUnique({ where: { id } });
      if (!current || !['PROCESSING', 'UNKNOWN_OUTCOME'].includes(current.status))
        throw new Error('Refund cannot fail from current state');
      const row = await tx.financeRefundRecord.update({
        where: { id },
        data: { status: 'FAILED', failureCode },
      });
      await this.govern(tx, ctx, 'FINANCE_REFUND_FAILED', row.id, { failureCode });
      return this.refund(row);
    });
  }
  async listRefunds() {
    const rows = await this.db.financeRefundRecord.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
    });
    return rows.map((row: any) => this.refund(row));
  }
  async createCommission(data: any, ctx: FinanceMutationContext) {
    return this.tx(async (tx) => {
      const replay = await this.commandReplay(tx, ctx, 'COMMISSION_CREATE', 'new', {
        sourcePaymentId: data.sourcePaymentId,
        recipientReferenceId: data.recipientReferenceId,
        basisPoints: data.calculationBasisPoints,
        policyReference: data.policyReference,
      });
      if (replay) return replay;
      const payment = await tx.financePaymentRecord.findUnique({
        where: { id: data.sourcePaymentId },
      });
      if (
        !payment ||
        ![PaymentStatus.CAPTURED, PaymentStatus.PARTIALLY_REFUNDED].includes(payment.status)
      )
        throw new Error('Commission requires a captured payment');
      const refunds = await tx.financeRefundRecord.findMany({
        where: { paymentId: payment.id, status: 'COMPLETED' },
        select: { amountMinorUnits: true },
      });
      const net =
        BigInt(payment.amountMinorUnits) -
        refunds.reduce((sum: bigint, v: any) => sum + BigInt(v.amountMinorUnits), 0n);
      const expected = (net * BigInt(data.calculationBasisPoints)) / 10_000n;
      const units = expected;
      if (
        data.policyReference !== 'NET_CAPTURE_CLAWBACK_V1' ||
        data.amount.currencyCode !== payment.currencyCode ||
        data.amount.scale !== payment.scale ||
        units <= 0n
      )
        throw new Error('Commission amount violates payment denomination or policy calculation');
      const row = await tx.financeCommissionRecord.create({
        data: {
          publicId: data.publicId,
          recipientReferenceId: data.recipientReferenceId,
          sourcePaymentId: data.sourcePaymentId,
          amountMinorUnits: units.toString(),
          currencyCode: data.amount.currencyCode,
          scale: data.amount.scale,
          status: data.status,
          policyReference: data.policyReference,
          calculationBasisPoints: data.calculationBasisPoints,
        },
      });
      const expense = await this.systemAccount(
        tx,
        'COMMISSION_EXPENSE',
        'EXPENSE',
        row.currencyCode,
        row.scale,
      );
      const payable = await this.systemAccount(
        tx,
        `COMMISSION_PAYABLE:${row.recipientReferenceId}`,
        'LIABILITY',
        row.currencyCode,
        row.scale,
      );
      const amount = money(row.amountMinorUnits, row.currencyCode, row.scale);
      await this.postWithinTx(tx, {
        ...ctx,
        idempotencyKey: `commission:${row.id}:ledger`,
        businessReferenceType: 'COMMISSION',
        businessReferenceId: row.id,
        postings: [
          { accountId: expense.id, direction: 'DEBIT', amount },
          { accountId: payable.id, direction: 'CREDIT', amount },
        ],
      });
      await this.govern(tx, ctx, 'FINANCE_COMMISSION_ACCRUED', row.id, {
        policyReference: data.policyReference,
        calculationBasisPoints: data.calculationBasisPoints,
      });
      const result = this.commission(row);
      await this.storeCommand(
        tx,
        ctx,
        'COMMISSION_CREATE',
        'new',
        {
          sourcePaymentId: data.sourcePaymentId,
          recipientReferenceId: data.recipientReferenceId,
          basisPoints: data.calculationBasisPoints,
          policyReference: data.policyReference,
        },
        result,
      );
      return result;
    });
  }
  async listCommissions() {
    const rows = await this.db.financeCommissionRecord.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
    });
    return rows.map((row: any) => this.commission(row));
  }
  async saveEstimate(data: any, ctx: FinanceMutationContext) {
    return this.tx(async (tx) => {
      const row = await tx.financeEstimateRecord.create({
        data: {
          publicId: data.publicId,
          subjectReferenceId: data.subjectReferenceId,
          displayCurrencyCode: data.displayCurrencyCode,
          scale: data.total.scale,
          totalMinorUnits: data.total.amountMinorUnits,
          lines: data.lines,
        },
      });
      await this.govern(tx, ctx, 'FINANCE_ESTIMATE_PERSISTED', row.id, {
        displayCurrencyCode: row.displayCurrencyCode,
        totalMinorUnits: row.totalMinorUnits,
      });
      return {
        id: row.id,
        publicId: row.publicId,
        subjectReferenceId: row.subjectReferenceId,
        displayCurrencyCode: row.displayCurrencyCode,
        lines: row.lines,
        total: money(row.totalMinorUnits, row.displayCurrencyCode, row.scale),
        generatedAt: row.generatedAt,
      };
    });
  }
  async runReconciliation(ctx?: FinanceMutationContext) {
    // Bounded, persisted scan; each invocation advances one owner checkpoint.
    return this.tx(async (tx) => {
      const kinds = [
        'ledger',
        'invoices',
        'payments',
        'transfers',
        'wallets',
        'refunds',
        'credits',
        'approvals',
      ] as const;
      const models = {
        ledger: 'financialTransactionRecord',
        invoices: 'financeInvoiceRecord',
        payments: 'financePaymentRecord',
        transfers: 'financeTransferRecord',
        wallets: 'financeWalletRecord',
        refunds: 'financeRefundRecord',
        credits: 'financeDocumentRecord',
        approvals: 'financeApprovalRecord',
      };
      const prior = await tx.financeReconciliationSnapshot.findUnique({ where: { id: 'latest' } });
      const checkpoint = (prior?.cursor || { kind: 0, after: null }) as {
        kind: number;
        after: string | null;
      };
      const kind = kinds[checkpoint.kind] || kinds[0];
      const rows = await tx[models[kind]].findMany({
        where: {
          ...(checkpoint.after && { id: { gt: checkpoint.after } }),
          ...(kind === 'credits' && { type: 'CREDIT_NOTE' }),
        },
        orderBy: { id: 'asc' },
        take: 100,
        ...(kind === 'ledger' && { include: { entries: true } }),
        ...(kind === 'wallets' && { include: { account: true } }),
        ...(kind === 'approvals' && { include: { decisions: true } }),
      });
      for (const row of rows) {
        const issues: any[] = [];
        const issue = (code: string, details: string, severity = 'CRITICAL') =>
          issues.push({ code, details, severity, referenceId: row.publicId });
        if (kind === 'ledger') {
          const net = row.entries.reduce(
            (sum: bigint, e: any) =>
              sum +
              (e.direction === 'DEBIT' ? BigInt(e.amountMinorUnits) : -BigInt(e.amountMinorUnits)),
            0n,
          );
          if (net !== 0n) issue('LEDGER_IMBALANCE', 'Ledger debits and credits do not balance');
        } else if (kind === 'invoices') {
          if (row.status === 'PAID' && row.dueMinorUnits !== '0')
            issue('PAID_INVOICE_DUE', 'Paid invoice has remaining due');
          if (
            BigInt(row.dueMinorUnits) < 0n ||
            BigInt(row.dueMinorUnits) > BigInt(row.totalMinorUnits)
          )
            issue('CREDIT_BALANCE_MISMATCH', 'Invoice due is outside total bounds');
          if (!['DRAFT', 'VOIDED'].includes(row.status)) {
            const totals = await tx.$queryRaw`SELECT
              COALESCE((SELECT SUM("amountMinorUnits"::numeric) FROM "FinancePaymentRecord" WHERE "invoiceId"=${row.id} AND status IN ('CAPTURED','PARTIALLY_REFUNDED','REFUNDED')),0)::text AS paid,
              COALESCE((SELECT SUM(r."amountMinorUnits"::numeric) FROM "FinanceRefundRecord" r JOIN "FinancePaymentRecord" p ON p.id=r."paymentId" WHERE p."invoiceId"=${row.id} AND r.status='COMPLETED'),0)::text AS refunded,
              COALESCE((SELECT SUM("amountMinorUnits"::numeric) FROM "FinanceDocumentRecord" WHERE "invoiceId"=${row.id} AND type='CREDIT_NOTE'),0)::text AS credited,
              COALESCE((SELECT SUM("amountMinorUnits"::numeric) FROM "FinanceWalletHoldRecord" WHERE "businessReferenceId" IN (${row.id},${row.publicId}) AND status='CAPTURED'),0)::text AS walletPaid`;
            const totalsRow = totals[0];
            if (
              BigInt(row.totalMinorUnits) -
                BigInt(totalsRow.paid) -
                BigInt(totalsRow.credited) -
                BigInt(totalsRow.walletPaid) +
                BigInt(totalsRow.refunded) !==
              BigInt(row.dueMinorUnits)
            )
              issue(
                'CREDIT_BALANCE_MISMATCH',
                'Invoice due differs from captured funds, credits and refunds',
              );
          }
        } else if (kind === 'payments') {
          if (
            ['CAPTURED', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(row.status) &&
            !(await tx.financialTransactionRecord.findFirst({
              where: { businessReferenceType: 'PAYMENT', businessReferenceId: row.id },
            }))
          )
            issue('CAPTURE_WITHOUT_POSTING', 'Captured payment has no ledger posting');
          if (
            ['PENDING', 'AUTHORIZED'].includes(row.status) &&
            Date.now() - new Date(row.createdAt).getTime() > 3600000
          )
            issue(
              'PROVIDER_OUTCOME_AGED',
              'Provider outcome requires independent reconciliation',
              'HIGH',
            );
        } else if (kind === 'transfers') {
          if (['SETTLED', 'COMPLETED'].includes(row.status) && !row.settlementTransactionId)
            issue('ORPHAN_SETTLEMENT', 'Transfer settlement ledger missing');
          if (
            row.rateId &&
            !(await tx.financeExchangeRateRecord.findUnique({ where: { id: row.rateId } }))
          )
            issue('FX_MISMATCH', 'Pinned exchange-rate snapshot missing');
          if (
            row.status === 'PROCESSING' &&
            Date.now() - new Date(row.updatedAt).getTime() > 3600000
          )
            issue('PROVIDER_OUTCOME_AGED', 'Transfer provider outcome requires review', 'HIGH');
          if (row.rateId) {
            try {
              if (
                !row.rateNumeratorSnapshot ||
                !row.rateDenominatorSnapshot ||
                row.marginBasisPointsSnapshot == null
              )
                throw new Error('MISSING_SNAPSHOT');
              const target = convertMoneyExact(
                money(row.sourceAmountMinorUnits, row.sourceCurrencyCode, row.sourceScale),
                row.targetCurrencyCode,
                row.targetScale,
                row.rateNumeratorSnapshot,
                row.rateDenominatorSnapshot,
                row.marginBasisPointsSnapshot,
              );
              if (target.amountMinorUnits !== row.targetAmountMinorUnits)
                issue('FX_MISMATCH', 'Transfer target differs from immutable FX snapshot');
            } catch {
              issue('FX_MISMATCH', 'Immutable FX snapshot is missing or invalid');
            }
          }
        } else if (kind === 'wallets') {
          try {
            const balance = await this.walletBalanceWithinTx(tx, row);
            if (BigInt(balance.availableBalance.amountMinorUnits) < 0n)
              issue('WALLET_BALANCE_MISMATCH', 'Wallet available balance is negative');
          } catch {
            issue('WALLET_BALANCE_MISMATCH', 'Wallet denomination or hold invariant failed');
          }
        } else if (kind === 'refunds') {
          if (
            row.status === 'COMPLETED' &&
            !(await tx.financialTransactionRecord.findFirst({
              where: { businessReferenceType: 'REFUND', businessReferenceId: row.id },
            }))
          )
            issue('REFUND_LEDGER_MISMATCH', 'Completed refund ledger missing');
          if (
            ['PROCESSING', 'UNKNOWN_OUTCOME'].includes(row.status) &&
            Date.now() - new Date(row.createdAt).getTime() > 3600000
          )
            issue(
              'PROVIDER_OUTCOME_AGED',
              'Refund outcome requires review; do not redispatch',
              'HIGH',
            );
          if (row.status === 'COMPLETED') {
            const ledger = await tx.financialTransactionRecord.findFirst({
              where: { businessReferenceType: 'REFUND', businessReferenceId: row.id },
              include: { entries: true },
            });
            if (
              !row.providerEvidence?.verified ||
              !ledger ||
              ledger.entries.some(
                (e: any) => e.currencyCode !== row.currencyCode || e.scale !== row.scale,
              ) ||
              ledger.entries
                .filter((e: any) => e.direction === 'DEBIT')
                .reduce((sum: bigint, e: any) => sum + BigInt(e.amountMinorUnits), 0n) !==
                BigInt(row.amountMinorUnits)
            )
              issue('REFUND_LEDGER_MISMATCH', 'Refund amount, evidence and ledger do not agree');
          }
        } else if (kind === 'credits') {
          if (
            !(await tx.financialTransactionRecord.findFirst({
              where: { businessReferenceType: 'CREDIT_NOTE', businessReferenceId: row.id },
            }))
          )
            issue('CREDIT_BALANCE_MISMATCH', 'Credit note ledger missing');
        } else if (kind === 'approvals') {
          try {
            const policy = financeApprovalPolicy(row.actionType);
            if (
              row.requiredApprovals !== policy.requiredApprovals ||
              row.policyReference !== policy.reference
            )
              issue(
                'APPROVAL_POLICY_MISMATCH',
                'Approval does not match current governed policy',
                'HIGH',
              );
          } catch {
            issue('APPROVAL_POLICY_MISMATCH', 'Approval action is unsupported', 'HIGH');
          }
        }
        await tx.financeReconciliationIssueRecord.deleteMany({
          where: { scope: kind, referenceId: row.publicId },
        });
        for (const item of issues)
          await tx.financeReconciliationIssueRecord.create({
            data: { id: hash(`${kind}:${row.id}:${item.code}`), scope: kind, ...item },
          });
      }
      const end = rows.length < 100;
      const completed = end && checkpoint.kind === kinds.length - 1;
      const cursor = end
        ? { kind: completed ? 0 : checkpoint.kind + 1, after: null }
        : { kind: checkpoint.kind, after: rows.at(-1).id };
      const issueRows = await tx.financeReconciliationIssueRecord.findMany({
        orderBy: [{ severity: 'asc' }, { id: 'asc' }],
        take: 100,
      });
      const issues = issueRows.map(({ code, severity, referenceId, details }: any) => ({
        code,
        severity,
        referenceId,
        details,
      }));
      const critical = await tx.financeReconciliationIssueRecord.count({
        where: { severity: 'CRITICAL' },
      });
      const high = await tx.financeReconciliationIssueRecord.count({ where: { severity: 'HIGH' } });
      const status = critical ? 'CRITICAL' : high ? 'DEGRADED' : 'UNKNOWN';
      await tx.financeReconciliationSnapshot.upsert({
        where: { id: 'latest' },
        create: {
          id: 'latest',
          status,
          coverage: completed
            ? 'LOCAL_ONLY_PROVIDER_NOT_EVALUATED'
            : 'PARTIAL_PROVIDER_NOT_EVALUATED',
          issues,
          cursor,
        },
        update: {
          status,
          coverage: completed
            ? 'LOCAL_ONLY_PROVIDER_NOT_EVALUATED'
            : 'PARTIAL_PROVIDER_NOT_EVALUATED',
          issues,
          cursor,
          asOf: new Date(),
        },
      });
      await this.govern(
        tx,
        ctx || {
          actorId: 'system:finance-reconciliation',
          correlationId: randomUUID(),
          idempotencyKey: randomUUID(),
        },
        'FINANCE_LOCAL_RECONCILIATION_BATCH',
        'latest',
        { kind, scanned: rows.length, status },
      );
      return issues;
    });
  }
  async getFinanceOverview(): Promise<import('@manaratak/domain').FinanceOverviewDto> {
    const [pendingPayments, pendingTransfers, pendingApprovals, snapshot] = await Promise.all([
      this.db.financePaymentRecord.count({ where: { status: { in: ['PENDING', 'AUTHORIZED'] } } }),
      this.db.financeTransferRecord.count({
        where: {
          status: {
            in: [
              'REQUESTED',
              'VALIDATED',
              'RATE_LOCKED',
              'FEES_CALCULATED',
              'PENDING_APPROVAL',
              'APPROVED',
              'PROCESSING',
              'SETTLED',
            ],
          },
        },
      }),
      this.db.financeApprovalRecord.count({ where: { status: 'PENDING' } }),
      this.getReconciliationSnapshot(),
    ]);
    return {
      pendingPayments,
      pendingTransfers,
      pendingApprovals,
      reconciliationHealth: snapshot.status as any,
      attention: snapshot.issues,
    };
  }
  async getFinancialReport(): Promise<import('@manaratak/domain').FinancialReportDto> {
    return this.tx(async (tx) => {
      const aggregate = async (sql: string): Promise<Record<string, string>> =>
        Object.fromEntries(
          (await tx.$queryRawUnsafe(sql)).map((v: any) => [v.currency, String(v.units)]),
        );
      const grossCollectionsByCurrency = await aggregate(
        `SELECT "currencyCode" AS currency, SUM("amountMinorUnits"::numeric)::text AS units FROM "FinancePaymentRecord" WHERE status IN ('CAPTURED','PARTIALLY_REFUNDED','REFUNDED') GROUP BY "currencyCode"`,
      );
      const refundsByCurrency = await aggregate(
        `SELECT "currencyCode" AS currency, SUM("amountMinorUnits"::numeric)::text AS units FROM "FinanceRefundRecord" WHERE status = 'COMPLETED' GROUP BY "currencyCode"`,
      );
      const revenueByCurrency = await aggregate(
        `SELECT e."currencyCode" AS currency, SUM(CASE WHEN e.direction = 'CREDIT' THEN e."amountMinorUnits"::numeric ELSE -e."amountMinorUnits"::numeric END)::text AS units FROM "FinancialLedgerEntryRecord" e JOIN "FinancialAccountRecord" a ON a.id=e."accountId" WHERE a.type='REVENUE' GROUP BY e."currencyCode"`,
      );
      const outstandingByCurrency = await aggregate(
        `SELECT "currencyCode" AS currency, SUM("dueMinorUnits"::numeric)::text AS units FROM "FinanceInvoiceRecord" WHERE status IN ('ISSUED','PARTIALLY_PAID','OVERDUE') GROUP BY "currencyCode"`,
      );
      const transferVolumeByCurrency = await aggregate(
        `SELECT "sourceCurrencyCode" AS currency, SUM("sourceAmountMinorUnits"::numeric)::text AS units FROM "FinanceTransferRecord" WHERE status IN ('SETTLED','COMPLETED') GROUP BY "sourceCurrencyCode"`,
      );
      const commissionsByCurrency = await aggregate(
        `SELECT "currencyCode" AS currency, SUM("amountMinorUnits"::numeric)::text AS units FROM "FinanceCommissionRecord" WHERE status IN ('ACCRUED','APPROVED','PAYABLE') GROUP BY "currencyCode"`,
      );
      const walletLiabilityByCurrency = await aggregate(
        `SELECT e."currencyCode" AS currency, SUM(CASE WHEN e.direction='CREDIT' THEN e."amountMinorUnits"::numeric ELSE -e."amountMinorUnits"::numeric END)::text AS units FROM "FinancialLedgerEntryRecord" e JOIN "FinanceWalletRecord" w ON w."accountId"=e."accountId" GROUP BY e."currencyCode"`,
      );
      const netCollectionsByCurrency = Object.fromEntries(
        [
          ...new Set([
            ...Object.keys(grossCollectionsByCurrency),
            ...Object.keys(refundsByCurrency),
          ]),
        ].map((code) => [
          code,
          (
            BigInt(grossCollectionsByCurrency[code] || '0') - BigInt(refundsByCurrency[code] || '0')
          ).toString(),
        ]),
      );
      const snapshot = await this.getReconciliationSnapshot();
      return {
        generatedAt: new Date(),
        revenueByCurrency,
        grossCollectionsByCurrency,
        netCollectionsByCurrency,
        outstandingByCurrency,
        refundsByCurrency,
        transferVolumeByCurrency,
        walletLiabilityByCurrency,
        commissionsByCurrency,
        reconciliationStatus: snapshot.status as any,
      };
    });
  }

  async getStudentFinancialReadModel(
    studentReferenceId: string,
  ): Promise<import('@manaratak/domain').StudentFinancialReadModelDto> {
    const summaryRows = await this.db
      .$queryRaw`SELECT COUNT(*)::int AS count, "currencyCode", SUM("dueMinorUnits"::numeric)::text AS units FROM "FinanceInvoiceRecord" WHERE "studentReferenceId"=${studentReferenceId} AND status NOT IN ('DRAFT','VOIDED') GROUP BY "currencyCode"`;
    const [invoiceRows, walletRows] = await Promise.all([
      this.db.financeInvoiceRecord.findMany({
        where: { studentReferenceId },
        take: 20,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      this.db.financeWalletRecord.findMany({
        where: { ownerReferenceId: studentReferenceId },
        take: 20,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    ]);
    const wallets = await Promise.all(
      walletRows.map(async (wallet: any) => ({
        wallet: { ...wallet, accountId: undefined },
        balance: await this.getWalletBalance(wallet.id),
      })),
    );
    const transfers = await this.db.financeTransferRecord.findMany({
      where: { sourceWalletId: { in: walletRows.map((wallet: any) => wallet.id) } },
      take: 20,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return {
      studentReferenceId,
      summary: {
        invoiceCount: summaryRows.reduce((sum: number, row: any) => sum + row.count, 0),
        outstandingByCurrency: Object.fromEntries(
          summaryRows.map((row: any) => [row.currencyCode, String(row.units)]),
        ),
      },
      historyPageSize: 20,
      invoices: invoiceRows.map((row: any) => this.invoice(row)),
      wallets,
      transfers: transfers.map((row: any) => ({
        ...this.transfer(row),
        bankProviderReference: null,
        idempotencyKeyHash: '',
        correlationId: '',
      })),
      generatedAt: new Date(),
    };
  }

  async serviceInvoiceClearance(input: { invoiceId: string; originReferenceId: string; studentReferenceId: string }) {
    // Finance owns this single snapshot, including sibling invoices, refunds and wallet holds.
    const rows = await this.prisma.$queryRaw<Array<{ financiallyCleared: boolean; cancellationCleared: boolean }>>`
      WITH origin_invoices AS (
        SELECT * FROM "FinanceInvoiceRecord"
        WHERE "originDomain"='PHASE_20_SERVICE_REQUEST'
          AND "originReferenceId"=${input.originReferenceId}
      )
      SELECT
        (i.status='PAID' AND i."dueMinorUnits"='0'
          AND NOT EXISTS(SELECT 1 FROM origin_invoices s WHERE s.id<>i.id AND s.status<>'VOIDED')
          AND NOT EXISTS(SELECT 1 FROM "FinancePaymentRecord" p JOIN origin_invoices s ON s.id=p."invoiceId" WHERE s.id<>i.id AND p.status NOT IN ('FAILED','CANCELLED'))
          AND NOT EXISTS(SELECT 1 FROM "FinanceWalletHoldRecord" h JOIN origin_invoices s ON h."businessReferenceId" IN (s.id,s."publicId") WHERE h.status='ACTIVE' OR (s.id<>i.id AND h.status='CAPTURED'))
          AND NOT EXISTS(SELECT 1 FROM "FinancePaymentRecord" p WHERE p."invoiceId"=i.id AND p.status IN ('REFUNDED','PARTIALLY_REFUNDED','PENDING','AUTHORIZED'))
          AND NOT EXISTS(SELECT 1 FROM "FinanceRefundRecord" r JOIN "FinancePaymentRecord" p ON p.id=r."paymentId" WHERE p."invoiceId"=i.id AND r.status IN ('REQUESTED','PENDING_APPROVAL','APPROVED','PROCESSING','UNKNOWN_OUTCOME','COMPLETED'))
        ) AS "financiallyCleared",
        (NOT EXISTS(SELECT 1 FROM origin_invoices s WHERE
            s."studentReferenceId" IS DISTINCT FROM ${input.studentReferenceId}
            OR s.status NOT IN ('VOIDED','PAID','CREDITED')
            OR (s.status<>'VOIDED' AND s."dueMinorUnits"<>'0')
            OR (s.status<>'VOIDED' AND NOT EXISTS(SELECT 1 FROM "FinancePaymentRecord" p WHERE p."invoiceId"=s.id AND p.status='REFUNDED')))
          AND NOT EXISTS(SELECT 1 FROM "FinancePaymentRecord" p JOIN origin_invoices s ON s.id=p."invoiceId" WHERE p.status NOT IN ('FAILED','CANCELLED','REFUNDED'))
          AND NOT EXISTS(SELECT 1 FROM "FinancePaymentRecord" p JOIN origin_invoices s ON s.id=p."invoiceId"
            WHERE p.status='REFUNDED' AND
              COALESCE((SELECT SUM(r."amountMinorUnits"::numeric) FROM "FinanceRefundRecord" r
                WHERE r."paymentId"=p.id AND r.status='COMPLETED'
                  AND r."currencyCode"=p."currencyCode" AND r.scale=p.scale),0) <> p."amountMinorUnits"::numeric)
          AND NOT EXISTS(SELECT 1 FROM "FinanceRefundRecord" r JOIN "FinancePaymentRecord" p ON p.id=r."paymentId" JOIN origin_invoices s ON s.id=p."invoiceId"
            WHERE r.status IN ('REQUESTED','PENDING_APPROVAL','APPROVED','PROCESSING','UNKNOWN_OUTCOME'))
          AND NOT EXISTS(SELECT 1 FROM "FinanceWalletHoldRecord" h JOIN origin_invoices s ON h."businessReferenceId" IN (s.id,s."publicId") WHERE h.status IN ('ACTIVE','CAPTURED'))
        ) AS "cancellationCleared"
      FROM origin_invoices i WHERE i.id=${input.invoiceId} AND i."studentReferenceId"=${input.studentReferenceId}
    `;
    return rows[0] ?? { financiallyCleared: false, cancellationCleared: false };
  }
  async hasFinancialClearanceForOrigin(input: {
    originDomain: string;
    originReferenceId: string;
    studentReferenceId?: string;
  }): Promise<boolean> {
    return this.tx(async (tx) => {
      const where = { ...input, status: { notIn: ['DRAFT', 'VOIDED'] } };
      const total = await tx.financeInvoiceRecord.count({ where });
      const blocked = await tx.financeInvoiceRecord.count({
        where: {
          ...where,
          OR: [{ dueMinorUnits: { not: '0' } }, { status: { notIn: ['PAID', 'CREDITED'] } }],
        },
      });
      return total > 0 && blocked === 0;
    });
  }
  async claimPaymentCapture(id: string, ctx: FinanceMutationContext): Promise<boolean> {
    return this.tx(async (tx) => {
      const claim = await tx.financePaymentRecord.updateMany({
        where: { id, status: 'AUTHORIZED', captureStartedAt: null },
        data: { captureStartedAt: new Date(), nextCheckAt: new Date(Date.now() + 120000) },
      });
      if (claim.count) await this.govern(tx, ctx, 'FINANCE_PAYMENT_CAPTURE_RESERVED', id, {});
      return claim.count === 1;
    });
  }
  async recordReconciliationRun(ctx: FinanceMutationContext, summary: Record<string, number>) {
    await this.tx((tx) =>
      this.govern(tx, ctx, 'FINANCE_PROVIDER_RECONCILIATION_RUN', ctx.correlationId, summary),
    );
  }
  async listStudentFinancialHistory(
    studentReferenceId: string,
    kind: 'wallets' | 'transfers',
    pagination: { page?: number; pageSize?: number },
  ) {
    const page = Math.max(1, pagination.page || 1),
      pageSize = Math.min(50, Math.max(1, pagination.pageSize || 20));
    return this.tx(async (tx) => {
      if (kind === 'transfers') {
        const rows =
          await tx.$queryRaw`SELECT t.* FROM "FinanceTransferRecord" t JOIN "FinanceWalletRecord" w ON w.id=t."sourceWalletId" WHERE w."ownerReferenceId"=${studentReferenceId} ORDER BY t."createdAt" DESC,t.id DESC OFFSET ${(page - 1) * pageSize} LIMIT ${pageSize}`;
        const counts =
          await tx.$queryRaw`SELECT COUNT(*)::int AS count FROM "FinanceTransferRecord" t JOIN "FinanceWalletRecord" w ON w.id=t."sourceWalletId" WHERE w."ownerReferenceId"=${studentReferenceId}`;
        return {
          data: rows.map((row: any) => ({
            ...this.transfer(row),
            bankProviderReference: null,
            idempotencyKeyHash: '',
            correlationId: '',
          })),
          total: counts[0].count,
          page,
          pageSize,
          totalPages: Math.ceil(counts[0].count / pageSize),
        };
      }
      const where = { ownerReferenceId: studentReferenceId };
      const model = kind === 'wallets' ? tx.financeWalletRecord : tx.financeTransferRecord;
      const rows = await model.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      });
      const total = await model.count({ where });
      const data =
        kind === 'wallets'
          ? await Promise.all(
              rows.map(async (row: any) => ({
                wallet: { ...row, accountId: undefined },
                balance: await this.walletBalanceWithinTx(tx, row),
              })),
            )
          : rows.map((row: any) => ({
              ...this.transfer(row),
              bankProviderReference: null,
              idempotencyKeyHash: '',
              correlationId: '',
            }));
      return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    });
  }
  async claimPaymentDispatch(id: string, ctx: FinanceMutationContext): Promise<boolean> {
    return this.tx(async (tx) => {
      const claimed = await tx.financePaymentRecord.updateMany({
        where: { id, status: 'PENDING', dispatchStartedAt: null },
        data: { dispatchStartedAt: new Date(), nextCheckAt: new Date(Date.now() + 120000) },
      });
      if (claimed.count === 1)
        await this.govern(tx, ctx, 'FINANCE_PAYMENT_DISPATCH_RESERVED', id, {});
      return claimed.count === 1;
    });
  }
  async claimTransferSubmission(id: string, ctx: FinanceMutationContext) {
    return this.tx(async (tx) => {
      const current = await tx.financeTransferRecord.findUnique({ where: { id } });
      if (!current || current.status !== 'APPROVED')
        throw new Error('FINANCE_TRANSFER_ALREADY_RESERVED');
      this.checkVersion(current.version, ctx);
      const changed = await tx.financeTransferRecord.updateMany({
        where: { id, status: 'APPROVED', version: current.version },
        data: {
          status: 'PROCESSING',
          providerStatus: 'UNKNOWN_OUTCOME',
          version: { increment: 1 },
          nextCheckAt: new Date(Date.now() + 120000),
        },
      });
      if (changed.count !== 1) throw new Error('FINANCE_TRANSFER_ALREADY_RESERVED');
      await this.govern(tx, ctx, 'FINANCE_TRANSFER_SUBMISSION_RESERVED', id, {
        providerIdempotencyReference: `transfer:${current.publicId}:bank-submit`,
      });
      return this.transfer(await tx.financeTransferRecord.findUnique({ where: { id } }));
    });
  }
  async recordTransferSubmission(
    id: string,
    evidence: BankTransferEvidence,
    ctx: FinanceMutationContext,
  ) {
    return this.tx(async (tx) => {
      const current = await tx.financeTransferRecord.findUnique({ where: { id } });
      if (
        !current ||
        current.status !== 'PROCESSING' ||
        !evidence.providerReference ||
        !['PROCESSING', 'SETTLED', 'FAILED'].includes(evidence.status)
      )
        throw new Error('FINANCE_TRANSFER_EVIDENCE_INVALID');
      if (
        current.bankProviderReference &&
        current.bankProviderReference !== evidence.providerReference
      )
        throw new Error('FINANCE_PROVIDER_EVIDENCE_MISMATCH');
      assertBankTransferEvidence(evidence, this.transfer(current));
      const row = await tx.financeTransferRecord.update({
        where: { id, version: current.version },
        data: {
          bankProviderReference: evidence.providerReference,
          providerEvidence: { ...evidence },
          providerStatus: evidence.status,
          version: { increment: 1 },
        },
      });
      await this.govern(tx, ctx, 'FINANCE_TRANSFER_SUBMISSION_EVIDENCE', id, {
        providerStatus: evidence.status,
      });
      return this.transfer(row);
    });
  }
  async markRefundUnknown(id: string, ctx: FinanceMutationContext) {
    await this.tx(async (tx) => {
      const result = await tx.financeRefundRecord.updateMany({
        where: { id, status: 'PROCESSING' },
        data: {
          status: 'UNKNOWN_OUTCOME',
          failureCode: 'PROVIDER_OUTCOME_UNKNOWN',
          nextCheckAt: new Date(Date.now() + 60000),
        },
      });
      if (result.count) await this.govern(tx, ctx, 'FINANCE_REFUND_OUTCOME_UNKNOWN', id, {});
    });
  }
  async claimReconciliationCandidates(
    kind: 'payment' | 'refund' | 'transfer',
    limit: number,
  ): Promise<any[]> {
    const take = Math.min(200, Math.max(1, Math.trunc(limit)));
    const models = {
      payment: 'financePaymentRecord',
      refund: 'financeRefundRecord',
      transfer: 'financeTransferRecord',
    };
    const statuses = {
      payment: ['PENDING', 'AUTHORIZED'],
      refund: ['PROCESSING', 'UNKNOWN_OUTCOME'],
      transfer: ['PROCESSING', 'SETTLED', 'COMPLETED'],
    };
    return this.tx(async (tx) => {
      const model = tx[models[kind]],
        now = new Date();
      const where = {
        status: { in: statuses[kind] },
        nextCheckAt: { lte: now },
        OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }],
      };
      const rows = await model.findMany({
        where,
        orderBy: [{ nextCheckAt: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
        take,
      });
      const claimed = [];
      for (const row of rows) {
        const delay = Math.min(3600000, 60000 * 2 ** Math.min(row.checkAttempts || 0, 6));
        const claim = await model.updateMany({
          where: { ...where, id: row.id },
          data: {
            leaseUntil: new Date(Date.now() + 120000),
            nextCheckAt: new Date(Date.now() + delay),
            checkAttempts: { increment: 1 },
          },
        });
        if (claim.count)
          claimed.push(
            kind === 'payment'
              ? this.payment(row)
              : kind === 'refund'
                ? this.refund(row)
                : this.transfer(row),
          );
      }
      return claimed;
    });
  }
  async listFinanceRecords(
    kind: 'refunds' | 'transfers' | 'rates' | 'approvals' | 'commissions',
    filters: FinanceListFilters,
  ) {
    const models = {
      refunds: 'financeRefundRecord',
      transfers: 'financeTransferRecord',
      rates: 'financeExchangeRateRecord',
      approvals: 'financeApprovalRecord',
      commissions: 'financeCommissionRecord',
    };
    const page = Math.max(1, filters.page || 1),
      pageSize = Math.min(50, Math.max(1, filters.pageSize || 20));
    const where: any = {};
    if (filters.status) {
      if (kind === 'rates') where.approved = filters.status === 'APPROVED';
      else where.status = filters.status;
    }
    if (filters.search) where.publicId = { contains: filters.search, mode: 'insensitive' };
    if (filters.from || filters.to)
      where.createdAt = {
        ...(filters.from && { gte: filters.from }),
        ...(filters.to && { lte: filters.to }),
      };
    if (filters.provider) {
      if (kind === 'transfers') where.bankProvider = filters.provider;
      else if (kind === 'refunds') where.gatewayProvider = filters.provider;
      else throw new Error('FINANCE_FILTER_UNSUPPORTED');
    }
    if (filters.ownerReferenceId) {
      if (kind === 'commissions') where.recipientReferenceId = filters.ownerReferenceId;
      else if (kind === 'approvals' || kind === 'refunds' || kind === 'transfers')
        where.makerId = filters.ownerReferenceId;
      else throw new Error('FINANCE_FILTER_UNSUPPORTED');
    }
    return this.tx(async (tx) => {
      const model = tx[models[kind]];
      if (filters.currencyCode || filters.minAmountMinorUnits || filters.maxAmountMinorUnits) {
        if (
          kind === 'rates' ||
          !filters.currencyCode ||
          !/^[A-Z]{3}$/.test(filters.currencyCode) ||
          [filters.minAmountMinorUnits, filters.maxAmountMinorUnits].some(
            (v) => v !== undefined && !/^(?:0|[1-9]\d{0,29})$/.test(v),
          ) ||
          (filters.minAmountMinorUnits &&
            filters.maxAmountMinorUnits &&
            BigInt(filters.minAmountMinorUnits) > BigInt(filters.maxAmountMinorUnits))
        )
          throw new Error('FINANCE_FILTER_INVALID');
        const tables = {
          refunds: 'FinanceRefundRecord',
          transfers: 'FinanceTransferRecord',
          rates: 'FinanceExchangeRateRecord',
          approvals: 'FinanceApprovalRecord',
          commissions: 'FinanceCommissionRecord',
        };
        const values: any[] = [];
        const bind = (value: unknown) => {
          values.push(value);
          return `$${values.length}`;
        };
        const clauses = [
          `"${kind === 'transfers' ? 'sourceCurrencyCode' : 'currencyCode'}"=${bind(filters.currencyCode)}`,
        ];
        const amount = kind === 'transfers' ? 'sourceAmountMinorUnits' : 'amountMinorUnits';
        if (filters.minAmountMinorUnits)
          clauses.push(`"${amount}"::numeric>=${bind(filters.minAmountMinorUnits)}::numeric`);
        if (filters.maxAmountMinorUnits)
          clauses.push(`"${amount}"::numeric<=${bind(filters.maxAmountMinorUnits)}::numeric`);
        if (filters.status) clauses.push(`status=${bind(filters.status)}`);
        if (filters.search)
          clauses.push(`POSITION(LOWER(${bind(filters.search)}) IN LOWER("publicId"))>0`);
        if (filters.from) clauses.push(`"createdAt">=${bind(filters.from)}`);
        if (filters.to) clauses.push(`"createdAt"<=${bind(filters.to)}`);
        if (filters.provider)
          clauses.push(
            `"${kind === 'transfers' ? 'bankProvider' : 'gatewayProvider'}"=${bind(filters.provider)}`,
          );
        if (filters.ownerReferenceId)
          clauses.push(
            `"${kind === 'commissions' ? 'recipientReferenceId' : 'makerId'}"=${bind(filters.ownerReferenceId)}`,
          );
        const predicate = clauses.join(' AND ');
        // Identifiers come exclusively from the finite owner maps above; all filter values are bound parameters.
        const count = await tx.$queryRawUnsafe(
          `SELECT COUNT(*)::int AS total FROM "${tables[kind]}" WHERE ${predicate}`,
          ...values,
        );
        const ids = await tx.$queryRawUnsafe(
          `SELECT id FROM "${tables[kind]}" WHERE ${predicate} ORDER BY "createdAt" DESC,id DESC OFFSET ${bind((page - 1) * pageSize)} LIMIT ${bind(pageSize)}`,
          ...values,
        );
        const rows = await model.findMany({
          where: { id: { in: ids.map((row: any) => row.id) } },
          ...(kind === 'approvals' && { include: { decisions: true } }),
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: pageSize,
        });
        return {
          data: rows.map((row: any) =>
            kind === 'refunds'
              ? this.refund(row)
              : kind === 'transfers'
                ? this.transfer(row)
                : kind === 'approvals'
                  ? this.approval(row)
                  : this.commission(row),
          ),
          total: count[0].total,
          page,
          pageSize,
          totalPages: Math.ceil(count[0].total / pageSize),
        };
      }

      const rows = await model.findMany({
        where,
        ...(kind === 'approvals' && { include: { decisions: true } }),
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      });
      const total = await model.count({ where });
      return {
        data: rows.map((row: any) =>
          kind === 'refunds'
            ? this.refund(row)
            : kind === 'transfers'
              ? this.transfer(row)
              : kind === 'approvals'
                ? this.approval(row)
                : kind === 'commissions'
                  ? this.commission(row)
                  : row,
        ),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    });
  }
  async getFinanceRecord(
    kind: 'refunds' | 'transfers' | 'approvals' | 'commissions' | 'payments',
    id: string,
  ) {
    const models = {
      refunds: 'financeRefundRecord',
      transfers: 'financeTransferRecord',
      approvals: 'financeApprovalRecord',
      commissions: 'financeCommissionRecord',
      payments: 'financePaymentRecord',
    };
    const row = await this.db[models[kind]].findFirst({
      where: { OR: [{ id }, { publicId: id }] },
      ...(kind === 'approvals' && { include: { decisions: true } }),
    });
    if (!row) return null;
    const data =
      kind === 'payments'
        ? this.payment(row)
        : kind === 'refunds'
          ? this.refund(row)
          : kind === 'transfers'
            ? this.transfer(row)
            : kind === 'approvals'
              ? this.approval(row)
              : this.commission(row);
    return data;
  }
  async getReconciliationSnapshot() {
    const row = await this.db.financeReconciliationSnapshot.findUnique({ where: { id: 'latest' } });
    const fresh = row && Date.now() - new Date(row.asOf).getTime() < 3600000;
    return {
      issues: row?.issues || [],
      status: fresh ? row.status : 'UNKNOWN',
      asOf: row?.asOf || null,
      coverage: row?.coverage || 'NOT_EVALUATED',
    };
  }
  private checkAttestedAmount(evidence: any, amount: MoneyAmount, operationReference?: string) {
    if (
      (operationReference !== undefined && evidence?.operationReference !== operationReference) ||
      !evidence?.verified ||
      !evidence.merchantReference ||
      !evidence.captureReference ||
      evidence.amount?.amountMinorUnits !== amount.amountMinorUnits ||
      evidence.amount?.currencyCode !== amount.currencyCode ||
      evidence.amount?.scale !== amount.scale
    )
      throw new Error('FINANCE_PROVIDER_EVIDENCE_MISMATCH');
  }
  private checkVersion(actual: number, ctx: FinanceMutationContext) {
    if (ctx.expectedVersion !== undefined && ctx.expectedVersion !== actual)
      throw new Error('FINANCE_VERSION_CONFLICT');
  }
  private async assertNoPendingPayments(tx: Db, invoiceId: string, ignoredHoldId?: string) {
    if (
      await tx.financePaymentRecord.count({
        where: { invoiceId, status: { in: ['PENDING', 'AUTHORIZED'] } },
      })
    )
      throw new Error('FINANCE_PAYMENT_BALANCE_RESERVED');
    const invoice = await tx.financeInvoiceRecord.findUnique({ where: { id: invoiceId } });
    if (
      await tx.financeWalletHoldRecord.count({
        where: {
          status: 'ACTIVE',
          businessReferenceId: { in: [invoiceId, invoice?.publicId || invoiceId] },
          ...(ignoredHoldId && { NOT: { id: ignoredHoldId } }),
        },
      })
    )
      throw new Error('FINANCE_OBLIGATION_ALREADY_RESERVED');
  }
  private async assertWalletObligation(
    tx: Db,
    wallet: any,
    amount: MoneyAmount,
    reference: string,
    ignoredHoldId?: string,
  ) {
    assertPositiveFinanceMoney(amount);
    const invoice = await tx.financeInvoiceRecord.findFirst({
      where: { OR: [{ id: reference }, { publicId: reference }] },
    });
    if (
      !invoice ||
      invoice.payerReferenceId !== wallet.ownerReferenceId ||
      !['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status) ||
      invoice.currencyCode !== amount.currencyCode ||
      invoice.scale !== amount.scale ||
      invoice.dueMinorUnits !== amount.amountMinorUnits
    )
      throw new Error('FINANCE_OBLIGATION_INVALID');
    await this.assertNoPendingPayments(tx, invoice.id, ignoredHoldId);
    return invoice;
  }
  private async commandReplay(
    tx: Db,
    ctx: FinanceMutationContext,
    operation: string,
    targetId: string,
    payload: unknown,
  ) {
    const id = hash(`${ctx.actorId}:${ctx.idempotencyKey}`);
    const prior = await tx.financeCommandRecord.findUnique({ where: { id } });
    if (!prior) return null;
    if (
      prior.operation !== operation ||
      prior.targetId !== targetId ||
      prior.fingerprint !== fingerprint(payload)
    )
      throw new Error('FINANCE_IDEMPOTENCY_CONFLICT');
    return prior.response;
  }
  private async storeCommand(
    tx: Db,
    ctx: FinanceMutationContext,
    operation: string,
    targetId: string,
    payload: unknown,
    response: unknown,
  ) {
    await tx.financeCommandRecord.create({
      data: {
        id: hash(`${ctx.actorId}:${ctx.idempotencyKey}`),
        actorId: ctx.actorId,
        operation,
        targetId,
        fingerprint: fingerprint(payload),
        response: JSON.parse(JSON.stringify(response)),
      },
    });
  }

  private async tx<T>(work: (tx: Db) => Promise<T>): Promise<T> {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await this.db.$transaction(work, { isolationLevel: 'Serializable' });
      } catch (error: any) {
        const serializationConflict = error?.code === 'P2034';
        if (!serializationConflict || attempt === maxAttempts) throw error;
      }
    }
    throw new Error('Unreachable finance transaction retry state');
  }
  private async systemAccount(
    tx: Db,
    ownerReferenceId: string,
    type: string,
    currencyCode: string,
    scale: number,
  ) {
    const existing = await tx.financialAccountRecord.findFirst({
      where: { ownerReferenceId, type, currencyCode },
    });
    if (existing) {
      if (
        !existing.systemManaged ||
        !existing.active ||
        existing.scale !== scale ||
        existing.type !== type ||
        existing.currencyCode !== currencyCode
      )
        throw new Error(`Reserved system account invariant violation: ${ownerReferenceId}`);
      return existing;
    }
    return tx.financialAccountRecord.create({
      data: {
        publicId: `fin_account_${randomUUID()}`,
        ownerReferenceId,
        type,
        currencyCode,
        scale,
        active: true,
        systemManaged: true,
      },
    });
  }
  private async postWithinTx(tx: Db, data: PostLedgerTransactionInput) {
    validateBalancedPostings(data.postings);
    const idempotencyKeyHash = hash(data.idempotencyKey);
    const duplicate = await tx.financialTransactionRecord.findUnique({
      where: { idempotencyKeyHash },
      include: { entries: true },
    });
    if (duplicate) {
      const prior = {
        businessReferenceType: duplicate.businessReferenceType,
        businessReferenceId: duplicate.businessReferenceId,
        reversalOfId: duplicate.reversalOfId ?? null,
        postings: [...duplicate.entries]
          .sort((a: any, b: any) => a.sequence - b.sequence)
          .map((e: any) => ({
            accountId: e.accountId,
            direction: e.direction,
            amount: money(e.amountMinorUnits, e.currencyCode, e.scale),
            memo: e.memo ?? null,
          })),
      };
      const incoming = {
        businessReferenceType: data.businessReferenceType,
        businessReferenceId: data.businessReferenceId,
        reversalOfId: data.reversalOfId ?? null,
        postings: data.postings.map((e) => ({ ...e, memo: e.memo ?? null })),
      };
      if (fingerprint(prior) !== fingerprint(incoming))
        throw new Error('FINANCE_IDEMPOTENCY_CONFLICT');
      return duplicate;
    }
    if (data.reversalOfId) {
      const prior = await tx.financialTransactionRecord.findFirst({
        where: { reversalOfId: data.reversalOfId },
      });
      if (prior) throw new Error('Financial transaction has already been reversed');
    }
    const ids = [...new Set(data.postings.map((item) => item.accountId))];
    const accounts = await tx.financialAccountRecord.findMany({
      where: { id: { in: ids }, active: true },
    });
    if (accounts.length !== ids.length) throw new Error('Financial account missing or inactive');
    if (
      data.approval &&
      data.businessReferenceType === 'MANUAL_ADJUSTMENT' &&
      accounts.some((a: any) => a.systemManaged || a.ownerReferenceId !== data.businessReferenceId)
    )
      throw new Error('FINANCE_ADJUSTMENT_ACCOUNT_FORBIDDEN');
    const first = data.postings[0].amount;
    if (
      accounts.some(
        (account: any) =>
          account.currencyCode !== first.currencyCode || account.scale !== first.scale,
      )
    )
      throw new Error('Ledger account currency mismatch');
    return tx.financialTransactionRecord.create({
      data: {
        publicId: `fin_tx_${randomUUID()}`,
        correlationId: data.correlationId,
        businessReferenceType: data.businessReferenceType,
        businessReferenceId: data.businessReferenceId,
        idempotencyKeyHash,
        currencyCode: first.currencyCode,
        scale: first.scale,
        reversalOfId: data.reversalOfId,
        createdBy: data.actorId,
        entries: {
          create: data.postings.map((entry, sequence) => ({
            accountId: entry.accountId,
            direction: entry.direction,
            amountMinorUnits: entry.amount.amountMinorUnits,
            currencyCode: entry.amount.currencyCode,
            scale: entry.amount.scale,
            sequence,
            memo: entry.memo,
          })),
        },
      },
      include: { entries: true },
    });
  }
  private async consumeApproval(tx: Db, binding: FinanceApprovalBinding) {
    const approval = await tx.financeApprovalRecord.findUnique({
      where: { id: binding.approvalId },
      include: { decisions: true },
    });
    if (approval) {
      const policy = financeApprovalPolicy(approval.actionType);
      if (
        approval.requiredApprovals !== policy.requiredApprovals ||
        approval.policyReference !== policy.reference ||
        approval.decisions.filter(
          (d: any) => d.decision === 'APPROVE' && d.approverId !== approval.makerId,
        ).length < policy.requiredApprovals
      )
        throw new Error('FINANCE_APPROVAL_POLICY_MISMATCH');
    }
    if (!approval || approval.status !== 'APPROVED' || approval.consumedAt)
      throw new Error('Financial approval is not approved/unconsumed');
    if (
      approval.actionType !== binding.actionType ||
      approval.targetReferenceId !== binding.targetReferenceId ||
      approval.makerId !== binding.makerId ||
      approval.payloadHash !== binding.payloadHash ||
      approval.policyReference !== binding.policyReference
    )
      throw new Error('Financial approval binding mismatch');
    if (approval.expiresAt && approval.expiresAt <= new Date())
      throw new Error('Financial approval expired');
    if (binding.amount) {
      if (
        approval.amountMinorUnits !== binding.amount.amountMinorUnits ||
        approval.currencyCode !== binding.amount.currencyCode ||
        approval.scale !== binding.amount.scale
      )
        throw new Error('Financial approval amount binding mismatch');
    }
    const consumed = await tx.financeApprovalRecord.updateMany({
      where: { id: approval.id, status: 'APPROVED', consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (consumed.count !== 1)
      throw new Error('Financial approval was already consumed concurrently');
  }
  private async walletBalanceWithinTx(tx: Db, wallet: any) {
    const [entryRows, holdRows] = await Promise.all([
      tx.$queryRaw`SELECT "currencyCode", scale, SUM(CASE WHEN direction='CREDIT' THEN "amountMinorUnits"::numeric ELSE -"amountMinorUnits"::numeric END)::text AS units FROM "FinancialLedgerEntryRecord" WHERE "accountId"=${wallet.accountId} GROUP BY "currencyCode", scale`,
      tx.$queryRaw`SELECT "currencyCode", scale, SUM("amountMinorUnits"::numeric)::text AS units, BOOL_OR("amountMinorUnits" !~ '^[1-9][0-9]{0,29}$') AS invalid FROM "FinanceWalletHoldRecord" WHERE "walletId"=${wallet.id} AND status='ACTIVE' GROUP BY "currencyCode", scale`,
    ]);
    if (
      [...entryRows, ...holdRows].some(
        (e: any) => e.currencyCode !== wallet.currencyCode || e.scale !== wallet.scale || e.invalid,
      )
    )
      throw new Error('FINANCE_INVALID_PERSISTED_HOLD');
    const current = entryRows.reduce((sum: bigint, e: any) => sum + BigInt(e.units), 0n),
      locked = holdRows.reduce((sum: bigint, e: any) => sum + BigInt(e.units), 0n);
    return {
      walletId: wallet.id,
      currentBalance: money(current.toString(), wallet.currencyCode, wallet.scale),
      availableBalance: money((current - locked).toString(), wallet.currencyCode, wallet.scale),
      lockedBalance: money(locked.toString(), wallet.currencyCode, wallet.scale),
      asOf: new Date(),
    };
  }

  private async govern(
    tx: Db,
    ctx: FinanceMutationContext,
    action: string,
    targetId: string,
    payload: Record<string, unknown>,
  ) {
    const now = new Date();
    const auditId = randomUUID();
    await tx.auditRecord.create({
      data: {
        id: auditId,
        reference: `finance-audit-${auditId}`,
        action,
        category: 'FINANCE',
        severity: action.includes('IMBALANCE') ? 'CRITICAL' : 'INFO',
        actorId: ctx.actorId,
        actorType: 'IDENTITY',
        targetId,
        targetType: 'FINANCE',
        source: 'PHASE19',
        timestamp: now,
        contextMetadata: { ...payload, reason: ctx.reason },
        correlationReference: ctx.correlationId,
      },
    });
    await tx.transactionalOutboxRecord.create({
      data: {
        id: randomUUID(),
        eventType: action,
        domain: 'FINANCE',
        aggregateType: 'FINANCE',
        aggregateId: targetId,
        payload: { targetId, ...payload },
        metadata: { idempotencyKeyHash: hash(`${action}:${ctx.idempotencyKey}`) },
        state: 'PENDING',
        attempts: 0,
        availableAt: now,
        correlationId: ctx.correlationId,
      },
    });
  }
  private invoice(row: any): FinanceInvoiceDto {
    return {
      id: row.id,
      publicId: row.publicId,
      invoiceNumber: row.invoiceNumber,
      version: row.version,
      correlationId: row.correlationId,
      originDomain: row.originDomain,
      originReferenceId: row.originReferenceId,
      studentReferenceId: row.studentReferenceId,
      payerReferenceId: row.payerReferenceId,
      status: row.status,
      totalAmount: money(row.totalMinorUnits, row.currencyCode, row.scale),
      amountDue: money(row.dueMinorUnits, row.currencyCode, row.scale),
      lineItems: row.lineItems,
      dueDate: row.dueDate,
      issuedAt: row.issuedAt,
      paidAt: row.paidAt,
      voidedAt: row.voidedAt,
      metadata: row.metadata,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
  private paymentCreate(data: CreateFinancePaymentDto) {
    return {
      publicId: data.publicId,
      invoiceId: data.invoiceId,
      idempotencyKeyHash: hash(data.idempotencyKey || data.publicId),
      amountMinorUnits: data.amount.amountMinorUnits,
      currencyCode: data.amount.currencyCode,
      scale: data.amount.scale,
      status: data.status,
      paymentMethod: data.paymentMethod,
      gatewayProvider: data.gatewayProvider,
      gatewayReference: data.gatewayReference,
      failureReason: data.failureReason,
      capturedAt: data.capturedAt,
      safeMaskedMetadata: data.metadata as any,
    };
  }
  private payment(row: any): FinancePaymentDto {
    return {
      id: row.id,
      publicId: row.publicId,
      invoiceId: row.invoiceId,
      idempotencyKey: null,
      amount: money(row.amountMinorUnits, row.currencyCode, row.scale),
      status: row.status,
      paymentMethod: row.paymentMethod,
      gatewayProvider: row.gatewayProvider,
      gatewayReference: row.gatewayReference,
      failureReason: row.failureReason,
      capturedAt: row.capturedAt,
      metadata: row.safeMaskedMetadata,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
  private transaction(row: any) {
    return {
      id: row.id,
      publicId: row.publicId,
      correlationId: row.correlationId,
      businessReferenceType: row.businessReferenceType,
      businessReferenceId: row.businessReferenceId,
      idempotencyKeyHash: row.idempotencyKeyHash,
      currencyCode: row.currencyCode,
      scale: row.scale,
      reversalOfId: row.reversalOfId,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      entries: row.entries.map((entry: any) => ({
        id: entry.id,
        transactionId: entry.transactionId,
        accountId: entry.accountId,
        direction: entry.direction,
        amount: money(entry.amountMinorUnits, entry.currencyCode, entry.scale),
        sequence: entry.sequence,
        memo: entry.memo,
        createdAt: entry.createdAt,
      })),
    };
  }
  private hold(row: any) {
    return {
      id: row.id,
      version: row.version,
      publicId: row.publicId,
      walletId: row.walletId,
      amount: money(row.amountMinorUnits, row.currencyCode, row.scale),
      status: row.status,
      businessReferenceId: row.businessReferenceId,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
      resolvedAt: row.resolvedAt,
    };
  }
  private transfer(row: any) {
    return {
      id: row.id,
      publicId: row.publicId,
      sourceWalletId: row.sourceWalletId,
      destinationReferenceId: row.destinationReferenceId,
      destinationCurrencyCode: row.destinationCurrencyCode,
      sourceAmount: money(row.sourceAmountMinorUnits, row.sourceCurrencyCode, row.sourceScale),
      targetAmount: row.targetAmountMinorUnits
        ? money(row.targetAmountMinorUnits, row.targetCurrencyCode, row.targetScale)
        : null,
      rateId: row.rateId,
      rateNumeratorSnapshot: row.rateNumeratorSnapshot,
      rateDenominatorSnapshot: row.rateDenominatorSnapshot,
      marginBasisPointsSnapshot: row.marginBasisPointsSnapshot,
      feeAmount:
        row.feeAmountMinorUnits != null
          ? money(row.feeAmountMinorUnits, row.sourceCurrencyCode, row.sourceScale)
          : null,
      feePolicyReference: row.feePolicyReference,
      bankProvider: row.bankProvider,
      bankProviderReference: row.bankProviderReference,
      providerStatus: row.providerStatus,
      settlementTransactionId: row.settlementTransactionId,
      reversalTransactionId: row.reversalTransactionId,
      status: row.status,
      makerId: row.makerId,
      correlationId: row.correlationId,
      idempotencyKeyHash: row.idempotencyKeyHash,
      version: row.version,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
  private approval(row: any) {
    return {
      id: row.id,
      version: row.version,
      publicId: row.publicId,
      actionType: row.actionType,
      targetReferenceId: row.targetReferenceId,
      amount: row.amountMinorUnits
        ? money(row.amountMinorUnits, row.currencyCode, row.scale)
        : null,
      makerId: row.makerId,
      requiredApprovals: row.requiredApprovals,
      payloadHash: row.payloadHash,
      policyReference: row.policyReference,
      consumedAt: row.consumedAt,
      status: row.status,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
      decisions: row.decisions,
    };
  }
  private refund(row: any) {
    return {
      id: row.id,
      version: row.version,
      publicId: row.publicId,
      paymentId: row.paymentId,
      amount: money(row.amountMinorUnits, row.currencyCode, row.scale),
      reason: row.reason,
      status: row.status,
      makerId: row.makerId,
      approvalId: row.approvalId,
      gatewayProvider: row.gatewayProvider,
      gatewayReference: row.gatewayReference,
      failureCode: row.failureCode,
      completedAt: row.completedAt,
      createdAt: row.createdAt,
    };
  }
  private commission(row: any) {
    return {
      id: row.id,
      publicId: row.publicId,
      recipientReferenceId: row.recipientReferenceId,
      sourcePaymentId: row.sourcePaymentId,
      amount: money(row.amountMinorUnits, row.currencyCode, row.scale),
      status: row.status,
      policyReference: row.policyReference,
      calculationBasisPoints: row.calculationBasisPoints,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
