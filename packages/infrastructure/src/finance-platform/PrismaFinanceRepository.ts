import { createHash, randomUUID } from 'node:crypto';
import {
  assertCheckerEligible,
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
const money = (units: string, currencyCode: string, scale: number): MoneyAmount => ({
  amountMinorUnits: units,
  currencyCode,
  scale,
});

export class PrismaFinanceRepository implements IFinanceRepository {
  constructor(private readonly db: Db) {}

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
    const row = await this.db.financePaymentRecord.findFirst({ where: { OR: [{ id }, { publicId: id }] } });
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
        orderBy: { createdAt: 'desc' },
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
      orderBy: { createdAt: 'desc' },
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
          { failureReason: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };
    const [rows, total] = await Promise.all([
      this.db.financePaymentRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
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
      const requestFingerprint = hash(JSON.stringify({
        originDomain: data.originDomain,
        originReferenceId: data.originReferenceId,
        studentReferenceId: data.studentReferenceId ?? null,
        payerReferenceId: data.payerReferenceId ?? null,
        totalAmount: data.totalAmount,
        lineItems: data.lineItems,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
      }));
      const existing = await tx.financeInvoiceRecord.findUnique({ where: { idempotencyKeyHash } });
      if (existing) {
        if (existing.requestFingerprint !== requestFingerprint)
          throw new Error('Invoice idempotency key was reused with a different request');
        return this.invoice(existing);
      }
      const row = await tx.financeInvoiceRecord.create({
        data: {
          publicId: data.publicId, invoiceNumber: data.invoiceNumber, correlationId: ctx.correlationId,
          idempotencyKeyHash, requestFingerprint, originDomain: data.originDomain,
          originReferenceId: data.originReferenceId, studentReferenceId: data.studentReferenceId,
          payerReferenceId: data.payerReferenceId, status: InvoiceStatus.DRAFT,
          currencyCode: data.totalAmount.currencyCode, scale: data.totalAmount.scale,
          totalMinorUnits: data.totalAmount.amountMinorUnits, dueMinorUnits: data.totalAmount.amountMinorUnits,
          lineItems: data.lineItems as any, dueDate: data.dueDate ? new Date(data.dueDate) : null,
          metadata: data.metadata as any,
        },
      });
      await this.govern(tx, ctx, 'FINANCE_INVOICE_DRAFT_CREATED', row.id, { invoiceNumber: row.invoiceNumber });
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
      const current = await tx.financeInvoiceRecord.findUnique({ where: { id } });
      if (!current || current.status !== InvoiceStatus.DRAFT)
        throw new Error('Only DRAFT invoices can be edited');
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
      return this.invoice(row);
    });
  }
  async issueDraftInvoice(id: string, ctx: FinanceMutationContext): Promise<FinanceInvoiceDto> {
    return this.tx(async (tx) => {
      const current = await tx.financeInvoiceRecord.findUnique({ where: { id } });
      if (!current || current.status !== InvoiceStatus.DRAFT)
        throw new Error('Only DRAFT invoices can be issued');
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
      return this.invoice(row);
    });
  }

  async voidInvoiceAtomic(id: string, ctx: FinanceMutationContext): Promise<FinanceInvoiceDto> {
    return this.tx(async (tx) => {
      const current = await tx.financeInvoiceRecord.findUnique({ where: { id } });
      if (
        !current ||
        ![InvoiceStatus.DRAFT, InvoiceStatus.ISSUED, InvoiceStatus.OVERDUE].includes(current.status)
      )
        throw new Error('Invoice cannot be voided');
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
      return this.invoice(row);
    });
  }
  async preparePaymentAttempt(
    data: CreateFinancePaymentDto,
    ctx: FinanceMutationContext,
  ): Promise<FinancePaymentDto> {
    return this.tx(async (tx) => {
      const keyHash = hash(ctx.idempotencyKey);
      const existing = await tx.financePaymentRecord.findUnique({ where: { idempotencyKeyHash: keyHash } });
      if (existing) {
        const sameRequest =
          existing.invoiceId === data.invoiceId &&
          existing.amountMinorUnits === data.amount.amountMinorUnits &&
          existing.currencyCode === data.amount.currencyCode &&
          existing.scale === data.amount.scale &&
          existing.gatewayProvider === data.gatewayProvider &&
          existing.paymentMethod === data.paymentMethod;
        if (!sameRequest) throw new Error('Payment idempotency key was reused with a different request');
        return this.payment(existing);
      }
      const invoice = await tx.financeInvoiceRecord.findUnique({ where: { id: data.invoiceId } });
      if (!invoice || ![InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE].includes(invoice.status))
        throw new Error('Invoice is not payable');
      if (
        data.amount.currencyCode !== invoice.currencyCode ||
        data.amount.scale !== invoice.scale ||
        BigInt(data.amount.amountMinorUnits) <= 0n ||
        BigInt(data.amount.amountMinorUnits) > BigInt(invoice.dueMinorUnits)
      ) throw new Error('Invalid payment attempt amount');
      const row = await tx.financePaymentRecord.create({
        data: {
          ...this.paymentCreate({ ...data, status: PaymentStatus.PENDING, gatewayReference: null, capturedAt: null }),
          idempotencyKeyHash: keyHash,
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
    evidence: { gatewayReference: string; safeMaskedMetadata?: Record<string, string> },
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
      if (current.status !== PaymentStatus.PENDING) throw new Error(`Payment cannot authorize from ${current.status}`);
      if (!evidence.gatewayReference.trim()) throw new Error('Gateway authorization reference is required');
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
      const attemptCount = await tx.financePaymentAttemptRecord.count({ where: { paymentId: current.id } });
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
      await this.govern(tx, ctx, 'FINANCE_PAYMENT_FAILED', row.id, { failureCode: safeFailureCode });
      return this.payment(row);
    });
  }

  async recordReconciledCapturedPaymentAtomic(
    paymentId: string,
    evidence: { gatewayReference: string; safeMaskedMetadata?: Record<string, string> },
    ctx: FinanceMutationContext,
  ): Promise<FinancePaymentDto> {
    return this.tx(async (tx) => {
      const current = await tx.financePaymentRecord.findUnique({ where: { id: paymentId } });
      if (!current) throw new Error('Payment attempt not found');
      if (current.status === PaymentStatus.CAPTURED) return this.payment(current);
      if (![PaymentStatus.PENDING, PaymentStatus.AUTHORIZED].includes(current.status))
        throw new Error(`Payment cannot reconcile capture from ${current.status}`);
      if (!current.gatewayProvider || !evidence.gatewayReference?.trim())
        throw new Error('Reconciled payment requires authenticated provider evidence');
      if (current.gatewayReference && current.gatewayReference !== evidence.gatewayReference)
        throw new Error('Reconciled gateway reference mismatch');
      const gatewayDuplicate = await tx.financePaymentRecord.findFirst({
        where: { gatewayProvider: current.gatewayProvider, gatewayReference: evidence.gatewayReference, NOT: { id: current.id } },
      });
      if (gatewayDuplicate) throw new Error('Duplicate external payment capture rejected');
      const invoice = await tx.financeInvoiceRecord.findUnique({ where: { id: current.invoiceId } });
      if (!invoice) throw new Error('Payment invoice not found');
      const amount = money(current.amountMinorUnits, current.currencyCode, current.scale);
      if (BigInt(amount.amountMinorUnits) <= 0n || BigInt(amount.amountMinorUnits) > BigInt(invoice.dueMinorUnits))
        throw new Error('Reconciled payment amount exceeds outstanding invoice balance');
      const attemptCount = await tx.financePaymentAttemptRecord.count({ where: { paymentId: current.id } });
      const row = await tx.financePaymentRecord.update({
        where: { id: current.id },
        data: {
          status: PaymentStatus.CAPTURED,
          gatewayReference: evidence.gatewayReference,
          capturedAt: new Date(),
          safeMaskedMetadata: evidence.safeMaskedMetadata as any,
          failureReason: null,
          attempts: { create: { sequence: attemptCount + 1, status: PaymentStatus.CAPTURED, gatewayReference: evidence.gatewayReference } },
        },
      });
      const cash = await this.systemAccount(tx, 'PAYMENT_CLEARING', 'ASSET', amount.currencyCode, amount.scale);
      const receivable = await this.systemAccount(tx, 'ACCOUNTS_RECEIVABLE', 'ASSET', amount.currencyCode, amount.scale);
      await this.postWithinTx(tx, {
        ...ctx,
        idempotencyKey: `${ctx.idempotencyKey}:ledger`,
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
        data: { dueMinorUnits: due.toString(), status: due === 0n ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID, paidAt: due === 0n ? new Date() : null, version: { increment: 1 } },
      });
      await tx.financeDocumentRecord.create({
        data: { publicId: `fin_receipt_${randomUUID()}`, type: 'RECEIPT', invoiceId: invoice.id, paymentId: row.id, amountMinorUnits: amount.amountMinorUnits, currencyCode: amount.currencyCode, scale: amount.scale, issuedBy: ctx.actorId },
      });
      await this.govern(tx, ctx, 'FINANCE_PAYMENT_RECONCILED_CAPTURED', row.id, { invoiceId: invoice.id, gatewayProvider: row.gatewayProvider, gatewayReference: evidence.gatewayReference });
      return this.payment(row);
    });
  }

  async recordCapturedPaymentAtomic(
    data: CreateFinancePaymentDto,
    ctx: FinanceMutationContext,
  ): Promise<FinancePaymentDto> {
    return this.tx(async (tx) => {
      const keyHash = hash(ctx.idempotencyKey);
      const current = await tx.financePaymentRecord.findUnique({ where: { idempotencyKeyHash: keyHash } });
      if (!current) throw new Error('Payment attempt must be prepared before capture');
      if (current.status === PaymentStatus.CAPTURED) return this.payment(current);
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
      ) throw new Error('Captured payment evidence does not match the prepared payment attempt');
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
      if (!invoice || ![InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE].includes(invoice.status))
        throw new Error('Invoice is not payable');
      const amount = data.amount;
      if (
        amount.currencyCode !== invoice.currencyCode ||
        amount.scale !== invoice.scale ||
        BigInt(amount.amountMinorUnits) <= 0n ||
        BigInt(amount.amountMinorUnits) > BigInt(invoice.dueMinorUnits)
      ) throw new Error('Invalid captured amount');
      const attemptCount = await tx.financePaymentAttemptRecord.count({ where: { paymentId: current.id } });
      const row = await tx.financePaymentRecord.update({
        where: { id: current.id },
        data: {
          status: PaymentStatus.CAPTURED,
          gatewayReference: data.gatewayReference,
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
      const cash = await this.systemAccount(tx, 'PAYMENT_CLEARING', 'ASSET', amount.currencyCode, amount.scale);
      const receivable = await this.systemAccount(tx, 'ACCOUNTS_RECEIVABLE', 'ASSET', amount.currencyCode, amount.scale);
      await this.postWithinTx(tx, {
        ...ctx,
        idempotencyKey: `${ctx.idempotencyKey}:ledger`,
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
    invoiceId: string, amount: MoneyAmount, reason: string, ctx: FinanceMutationContext,
  ) {
    return this.tx(async (tx) => {
      const invoice = await tx.financeInvoiceRecord.findUnique({ where: { id: invoiceId } });
      if (!invoice || ![InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE].includes(invoice.status))
        throw new Error('Credit note requires an issued invoice with outstanding value');
      const existingCredits = await tx.financeDocumentRecord.findMany({ where: { invoiceId, type: 'CREDIT_NOTE' } });
      const credited = existingCredits.reduce((sum: bigint, row: any) => sum + BigInt(row.amountMinorUnits), 0n);
      const units = BigInt(amount.amountMinorUnits);
      if (amount.currencyCode !== invoice.currencyCode || amount.scale !== invoice.scale || units <= 0n ||
          units > BigInt(invoice.dueMinorUnits) || credited + units > BigInt(invoice.totalMinorUnits))
        throw new Error('Credit note exceeds the remaining eligible invoice balance');
      const row = await tx.financeDocumentRecord.create({
        data: { publicId: `fin_credit_${randomUUID()}`, type: 'CREDIT_NOTE', invoiceId, amountMinorUnits: amount.amountMinorUnits,
                currencyCode: amount.currencyCode, scale: amount.scale, reason, issuedBy: ctx.actorId },
      });
      const revenue = await this.systemAccount(tx, `REVENUE:${invoice.originDomain}`, 'REVENUE', amount.currencyCode, amount.scale);
      const receivable = await this.systemAccount(tx, 'ACCOUNTS_RECEIVABLE', 'ASSET', amount.currencyCode, amount.scale);
      await this.postWithinTx(tx, {
        ...ctx, idempotencyKey: `${ctx.idempotencyKey}:ledger`, businessReferenceType: 'CREDIT_NOTE', businessReferenceId: row.id,
        postings: [{ accountId: revenue.id, direction: 'DEBIT', amount }, { accountId: receivable.id, direction: 'CREDIT', amount }],
      });
      const remaining = BigInt(invoice.dueMinorUnits) - units;
      await tx.financeInvoiceRecord.update({
        where: { id: invoice.id, version: invoice.version },
        data: { dueMinorUnits: remaining.toString(), status: remaining === 0n ? InvoiceStatus.CREDITED : invoice.status, version: { increment: 1 } },
      });
      await this.govern(tx, ctx, 'FINANCE_CREDIT_NOTE_CREATED', row.id, { invoiceId, remainingDueMinorUnits: remaining.toString() });
      return { id: row.id, publicId: row.publicId, invoiceId, amount, reason, issuedBy: row.issuedBy, issuedAt: row.issuedAt };
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
    const reserved = ['ACCOUNTS_RECEIVABLE', 'PAYMENT_CLEARING', 'TRANSFER_SETTLEMENT_CLEARING', 'WALLET_SETTLEMENT_CLEARING'];
    if (reserved.includes(data.ownerReferenceId) || data.ownerReferenceId.startsWith('REVENUE:') || data.ownerReferenceId.startsWith('SYSTEM:'))
      throw new Error('Reserved finance system-account identity cannot be created through generic account creation');
    if (data.systemManaged) throw new Error('Generic account creation cannot create system-managed accounts');
    return this.tx(async (tx) => {
      const row = await tx.financialAccountRecord.create({ data: { ...data, systemManaged: false } });
      await this.govern(tx, ctx, 'FINANCIAL_ACCOUNT_CREATED', row.id, {});
      return row;
    });
  }
  async postLedgerTransaction(data: PostLedgerTransactionInput) {
    validateBalancedPostings(data.postings);
    return this.tx(async (tx) => {
      if (!data.approval) throw new Error('Manual ledger mutation requires bound maker-checker approval');
      await this.consumeApproval(tx, data.approval);
      const row = await this.postWithinTx(tx, data);
      await this.govern(tx, data, 'FINANCIAL_LEDGER_POSTED', row.id, {
        businessReferenceType: data.businessReferenceType, businessReferenceId: data.businessReferenceId, approvalId: data.approval.approvalId,
      });
      return this.transaction(row);
    });
  }
  async reverseLedgerTransaction(transactionId: string, ctx: FinanceMutationContext, approval: FinanceApprovalBinding) {
    return this.tx(async (tx) => {
      const original = await tx.financialTransactionRecord.findFirst({
        where: { OR: [{ id: transactionId }, { publicId: transactionId }] }, include: { entries: true, reversal: true },
      });
      if (!original) throw new Error('Financial transaction not found');
      if (original.reversalOfId) throw new Error('A reversal transaction cannot itself be manually reversed');
      if (original.reversal) throw new Error('Financial transaction has already been reversed');
      await this.consumeApproval(tx, approval);
      const row = await this.postWithinTx(tx, {
        ...ctx, businessReferenceType: 'REVERSAL', businessReferenceId: original.publicId, reversalOfId: original.id,
        postings: original.entries.map((entry: any) => ({
          accountId: entry.accountId, direction: entry.direction === 'DEBIT' ? 'CREDIT' : 'DEBIT',
          amount: money(entry.amountMinorUnits, entry.currencyCode, entry.scale), memo: `Reversal of ${original.publicId}`,
        })),
      });
      await this.govern(tx, ctx, 'FINANCIAL_LEDGER_REVERSED', row.id, { originalTransactionId: original.id, approvalId: approval.approvalId });
      return this.transaction(row);
    });
  }

  async createWallet(data: any, ctx: FinanceMutationContext) {
    return this.tx(async (tx) => {
      const account = await tx.financialAccountRecord.findUnique({ where: { id: data.accountId } });
      if (!account || !account.active) throw new Error('Wallet ledger account missing or inactive');
      if (account.systemManaged) throw new Error('System-managed account cannot back a customer wallet');
      if (account.type !== 'LIABILITY') throw new Error('Wallet must be backed by a LIABILITY ledger account');
      if (account.ownerReferenceId !== data.ownerReferenceId || account.currencyCode !== data.currencyCode || account.scale !== data.scale)
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
      where: { OR: [{ id: walletId }, { publicId: walletId }] }, include: { account: true },
    });
    if (!wallet || !wallet.account || !wallet.account.active) throw new Error('Wallet or backing account not found/active');
    if (wallet.currencyCode !== wallet.account.currencyCode || wallet.scale !== wallet.account.scale)
      throw new Error('Wallet denomination does not match backing ledger account');
    return this.walletBalanceWithinTx(this.db, wallet);
  }
  async createWalletHold(
    walletId: string, amount: MoneyAmount, businessReferenceId: string, ctx: FinanceMutationContext,
  ) {
    return this.tx(async (tx) => {
      const wallet = await tx.financeWalletRecord.findUnique({ where: { id: walletId }, include: { account: true } });
      if (!wallet || wallet.status !== 'ACTIVE' || !wallet.account?.active) throw new Error('Wallet is not active');
      if (wallet.currencyCode !== amount.currencyCode || wallet.scale !== amount.scale ||
          wallet.account.currencyCode !== amount.currencyCode || wallet.account.scale !== amount.scale)
        throw new Error('Wallet hold denomination mismatch');
      const duplicate = await tx.financeWalletHoldRecord.findUnique({ where: { idempotencyKeyHash: hash(ctx.idempotencyKey) } });
      if (duplicate) return this.hold(duplicate);
      const balance = await this.walletBalanceWithinTx(tx, wallet);
      if (BigInt(balance.availableBalance.amountMinorUnits) < BigInt(amount.amountMinorUnits)) throw new Error('Insufficient available balance');
      await tx.financeWalletRecord.update({ where: { id: walletId, version: wallet.version }, data: { version: { increment: 1 } } });
      const row = await tx.financeWalletHoldRecord.create({
        data: { publicId: `fin_hold_${randomUUID()}`, walletId, amountMinorUnits: amount.amountMinorUnits, currencyCode: amount.currencyCode, scale: amount.scale,
                status: 'ACTIVE', businessReferenceId, idempotencyKeyHash: hash(ctx.idempotencyKey) },
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
      const wallet = await tx.financeWalletRecord.findUnique({ where: { id: current.walletId }, include: { account: true } });
      if (!wallet || !wallet.account?.active) throw new Error('Wallet not found');
      if (wallet.currencyCode !== current.currencyCode || wallet.scale !== current.scale || wallet.account.currencyCode !== current.currencyCode || wallet.account.scale !== current.scale)
        throw new Error('Wallet hold denomination does not match backing account');
      await tx.financeWalletRecord.update({
        where: { id: wallet.id, version: wallet.version },
        data: { version: { increment: 1 } },
      });
      const row = await tx.financeWalletHoldRecord.update({
        where: { id: holdId },
        data: { status: action === 'RELEASE' ? 'RELEASED' : 'CAPTURED', resolvedAt: new Date() },
      });
      if (action === 'CAPTURE') {
        const settlement = await this.systemAccount(
          tx,
          'WALLET_SETTLEMENT_CLEARING',
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
      await this.govern(tx, ctx, `FINANCE_WALLET_HOLD_${action}D`, row.id, {});
      return this.hold(row);
    });
  }

  async saveExchangeRate(data: any, ctx: FinanceMutationContext) {
    return this.tx(async (tx) => {
      if (!/^\d+$/.test(data.rateNumerator) || !/^\d+$/.test(data.rateDenominator) ||
          BigInt(data.rateNumerator) <= 0n || BigInt(data.rateDenominator) <= 0n)
        throw new Error('Invalid exact exchange rate');
      if (data.effectiveTo && new Date(data.effectiveTo).getTime() <= new Date(data.effectiveFrom).getTime())
        throw new Error('Invalid exchange-rate effective window');
      if (data.source === 'MANUAL_OVERRIDE' && data.approved)
        throw new Error('Manual FX override cannot be approved at creation time');
      const row = await tx.financeExchangeRateRecord.create({ data });
      await this.govern(tx, ctx, 'FINANCE_EXCHANGE_RATE_SAVED', row.id, { approved: row.approved, source: row.source });
      return row;
    });
  }
  async findEffectiveExchangeRate(
    sourceCurrencyCode: string, targetCurrencyCode: string, at: Date,
  ): Promise<ExchangeRateDto | null> {
    const where = { sourceCurrencyCode, targetCurrencyCode, approved: true, effectiveFrom: { lte: at }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: at } }] };
    const manual = await this.db.financeExchangeRateRecord.findFirst({ where: { ...where, source: 'MANUAL_OVERRIDE' }, orderBy: { effectiveFrom: 'desc' } });
    if (manual) return manual;
    return this.db.financeExchangeRateRecord.findFirst({ where: { ...where, source: 'AUTOMATIC_PROVIDER' }, orderBy: { effectiveFrom: 'desc' } });
  }
  async listExchangeRates() {
    return this.db.financeExchangeRateRecord.findMany({ orderBy: { effectiveFrom: 'desc' } });
  }
  async activateExchangeRate(id: string, approval: FinanceApprovalBinding, ctx: FinanceMutationContext) {
    return this.tx(async (tx) => {
      const current = await tx.financeExchangeRateRecord.findFirst({ where: { OR: [{ id }, { publicId: id }] } });
      if (!current || current.source !== 'MANUAL_OVERRIDE' || current.approved) throw new Error('Manual FX override is not activatable');
      if (current.makerId !== approval.makerId) throw new Error('FX approval maker binding mismatch');
      await this.consumeApproval(tx, approval);
      const row = await tx.financeExchangeRateRecord.update({ where: { id: current.id }, data: { approved: true, approvalId: approval.approvalId } });
      await this.govern(tx, ctx, 'FINANCE_EXCHANGE_RATE_APPROVED', row.id, { approvalId: approval.approvalId });
      return row;
    });
  }
  async createTransfer(data: any, ctx: FinanceMutationContext) {
    return this.tx(async (tx) => {
      const existing = await tx.financeTransferRecord.findUnique({ where: { idempotencyKeyHash: hash(ctx.idempotencyKey) } });
      if (existing) return this.transfer(existing);
      const wallet = await tx.financeWalletRecord.findUnique({ where: { id: data.sourceWalletId }, include: { account: true } });
      if (!wallet || wallet.status !== 'ACTIVE' || !wallet.account?.active) throw new Error('Source wallet is not active');
      if (wallet.currencyCode !== data.sourceAmount.currencyCode || wallet.scale !== data.sourceAmount.scale ||
          wallet.account.currencyCode !== data.sourceAmount.currencyCode || wallet.account.scale !== data.sourceAmount.scale)
        throw new Error('Transfer source denomination does not match wallet/account');
      const row = await tx.financeTransferRecord.create({
        data: {
          publicId: data.publicId, sourceWalletId: data.sourceWalletId, destinationReferenceId: data.destinationReferenceId,
          destinationCurrencyCode: data.destinationCurrencyCode, sourceCurrencyCode: data.sourceAmount.currencyCode, sourceScale: data.sourceAmount.scale,
          sourceAmountMinorUnits: data.sourceAmount.amountMinorUnits, targetCurrencyCode: data.targetAmount?.currencyCode, targetScale: data.targetAmount?.scale,
          targetAmountMinorUnits: data.targetAmount?.amountMinorUnits, rateId: data.rateId, feeAmountMinorUnits: data.feeAmount?.amountMinorUnits,
          feePolicyReference: data.feePolicyReference, bankProvider: data.bankProvider, status: data.status, makerId: data.makerId,
          correlationId: data.correlationId, idempotencyKeyHash: hash(ctx.idempotencyKey),
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
  async lockTransferRate(id: string, rate: ExchangeRateDto, targetAmount: MoneyAmount, ctx: FinanceMutationContext) {
    return this.tx(async (tx) => {
      const current = await tx.financeTransferRecord.findUnique({ where: { id } });
      if (!current || current.status !== 'VALIDATED') throw new Error('Transfer must be VALIDATED before rate lock');
      if (!rate.approved || rate.sourceCurrencyCode !== current.sourceCurrencyCode || rate.targetCurrencyCode !== current.destinationCurrencyCode)
        throw new Error('FX rate does not match transfer corridor');
      const row = await tx.financeTransferRecord.update({
        where: { id, version: current.version },
        data: { targetCurrencyCode: targetAmount.currencyCode, targetScale: targetAmount.scale, targetAmountMinorUnits: targetAmount.amountMinorUnits,
                rateId: rate.id, status: 'RATE_LOCKED', version: { increment: 1 } },
      });
      await this.govern(tx, ctx, 'FINANCE_TRANSFER_RATE_LOCKED', id, { rateId: rate.id });
      return this.transfer(row);
    });
  }
  async calculateTransferFee(id: string, feeAmount: MoneyAmount, policyReference: string, ctx: FinanceMutationContext) {
    return this.tx(async (tx) => {
      const current = await tx.financeTransferRecord.findUnique({ where: { id } });
      if (!current || current.status !== 'RATE_LOCKED' || !current.rateId || !current.targetAmountMinorUnits)
        throw new Error('Transfer must have a locked rate before fee calculation');
      if (feeAmount.currencyCode !== current.sourceCurrencyCode || feeAmount.scale !== current.sourceScale || BigInt(feeAmount.amountMinorUnits) < 0n)
        throw new Error('Invalid transfer fee denomination');
      if (!policyReference.trim()) throw new Error('Transfer fee policy reference is required');
      const row = await tx.financeTransferRecord.update({
        where: { id, version: current.version },
        data: { feeAmountMinorUnits: feeAmount.amountMinorUnits, feePolicyReference: policyReference, status: 'FEES_CALCULATED', version: { increment: 1 } },
      });
      await this.govern(tx, ctx, 'FINANCE_TRANSFER_FEES_CALCULATED', id, { policyReference, feeAmountMinorUnits: feeAmount.amountMinorUnits });
      return this.transfer(row);
    });
  }
  async transitionTransfer(
    id: string, status: TransferStatus, ctx: FinanceMutationContext, evidence: any = {},
  ) {
    return this.tx(async (tx) => {
      const current = await tx.financeTransferRecord.findUnique({ where: { id } });
      if (!current) throw new Error('Transfer not found');
      assertTransferTransition(current.status, status);
      const wallet = await tx.financeWalletRecord.findUnique({ where: { id: current.sourceWalletId }, include: { account: true } });
      if (!wallet || !wallet.account || wallet.currencyCode !== current.sourceCurrencyCode || wallet.scale !== current.sourceScale ||
          wallet.account.currencyCode !== current.sourceCurrencyCode || wallet.account.scale !== current.sourceScale)
        throw new Error('Transfer wallet/account denomination invariant failed');
      if (status === 'PENDING_APPROVAL') {
        if (!current.rateId || !current.targetAmountMinorUnits || current.feeAmountMinorUnits == null || !current.feePolicyReference)
          throw new Error('Transfer financial snapshot must be complete before approval');
        const amountUnits = BigInt(current.sourceAmountMinorUnits) + BigInt(current.feeAmountMinorUnits);
        const balance = await this.walletBalanceWithinTx(tx, wallet);
        if (BigInt(balance.availableBalance.amountMinorUnits) < amountUnits) throw new Error('Insufficient available wallet balance');
        const holdKey = hash(`${ctx.idempotencyKey}:hold`);
        const existingHold = await tx.financeWalletHoldRecord.findUnique({ where: { idempotencyKeyHash: holdKey } });
        if (!existingHold) {
          await tx.financeWalletRecord.update({ where: { id: wallet.id, version: wallet.version }, data: { version: { increment: 1 } } });
          await tx.financeWalletHoldRecord.create({ data: { publicId: `fin_hold_${randomUUID()}`, walletId: wallet.id, amountMinorUnits: amountUnits.toString(),
            currencyCode: current.sourceCurrencyCode, scale: current.sourceScale, status: 'ACTIVE', businessReferenceId: current.publicId, idempotencyKeyHash: holdKey } });
        }
      }
      if (status === 'APPROVED') {
        if (!evidence.approval) throw new Error('Transfer approval requires bound approval evidence');
        await this.consumeApproval(tx, evidence.approval);
      }
      if (status === 'PROCESSING') {
        if (!evidence.bankProvider || !evidence.bankProviderReference || evidence.providerStatus !== 'PROCESSING')
          throw new Error('Transfer PROCESSING requires bank submission evidence');
      }
      let settlementTransactionId = current.settlementTransactionId;
      let reversalTransactionId = current.reversalTransactionId;
      if (status === 'SETTLED') {
        if (!evidence.bankProviderReference || evidence.providerStatus !== 'SETTLED' || evidence.bankProviderReference !== current.bankProviderReference)
          throw new Error('Transfer SETTLED requires matching provider settlement evidence');
        if (current.settlementTransactionId) throw new Error('Transfer settlement ledger already exists');
        const hold = await tx.financeWalletHoldRecord.findFirst({ where: { walletId: current.sourceWalletId, businessReferenceId: current.publicId, status: 'ACTIVE' } });
        if (!hold) throw new Error('Transfer settlement requires an active funds hold');
        const settlement = await this.systemAccount(tx, 'TRANSFER_SETTLEMENT_CLEARING', 'ASSET', current.sourceCurrencyCode, current.sourceScale);
        const amount = money(hold.amountMinorUnits, current.sourceCurrencyCode, current.sourceScale);
        const ledger = await this.postWithinTx(tx, { ...ctx, idempotencyKey: `${ctx.idempotencyKey}:ledger`, businessReferenceType: 'TRANSFER', businessReferenceId: current.id,
          postings: [{ accountId: wallet.accountId, direction: 'DEBIT', amount }, { accountId: settlement.id, direction: 'CREDIT', amount }] });
        settlementTransactionId = ledger.id;
        await tx.financeWalletHoldRecord.update({ where: { id: hold.id }, data: { status: 'CAPTURED', resolvedAt: new Date() } });
      }
      if (status === 'FAILED' || status === 'CANCELLED' || status === 'REJECTED') {
        if (status === 'FAILED' && evidence.providerStatus !== 'FAILED') throw new Error('Transfer failure requires provider failure evidence');
        await tx.financeWalletHoldRecord.updateMany({ where: { walletId: current.sourceWalletId, businessReferenceId: current.publicId, status: 'ACTIVE' },
          data: { status: 'RELEASED', resolvedAt: new Date() } });
      }
      if (status === 'COMPLETED' && current.providerStatus !== 'SETTLED') throw new Error('Transfer cannot complete without settled provider evidence');
      if (status === 'REVERSED') {
        if (!current.bankProvider || !current.bankProviderReference || evidence.bankProvider !== current.bankProvider ||
            evidence.bankProviderReference !== current.bankProviderReference || evidence.providerStatus !== 'REVERSED')
          throw new Error('Transfer REVERSED requires matching provider reversal evidence');
        if (!current.settlementTransactionId) throw new Error('Transfer has no settlement ledger to reverse');
        if (current.reversalTransactionId) throw new Error('Transfer settlement has already been reversed');
        const original = await tx.financialTransactionRecord.findUnique({ where: { id: current.settlementTransactionId }, include: { entries: true, reversal: true } });
        if (!original || original.reversal) throw new Error('Transfer settlement reversal is unavailable');
        const reversal = await this.postWithinTx(tx, { ...ctx, idempotencyKey: `${ctx.idempotencyKey}:reversal-ledger`, businessReferenceType: 'TRANSFER_REVERSAL',
          businessReferenceId: current.id, reversalOfId: original.id, postings: original.entries.map((entry: any) => ({
            accountId: entry.accountId, direction: entry.direction === 'DEBIT' ? 'CREDIT' : 'DEBIT',
            amount: money(entry.amountMinorUnits, entry.currencyCode, entry.scale), memo: `Transfer reversal ${current.publicId}`,
          })) });
        reversalTransactionId = reversal.id;
      }
      const row = await tx.financeTransferRecord.update({
        where: { id, version: current.version },
        data: { status, version: { increment: 1 },
          ...(evidence.bankProvider && { bankProvider: evidence.bankProvider }),
          ...(evidence.bankProviderReference && { bankProviderReference: evidence.bankProviderReference }),
          ...(evidence.providerStatus && { providerStatus: evidence.providerStatus }),
          ...(evidence.providerFailureCode && { providerFailureCode: evidence.providerFailureCode }),
          ...(settlementTransactionId && { settlementTransactionId }), ...(reversalTransactionId && { reversalTransactionId }) },
      });
      await this.govern(tx, ctx, `FINANCE_TRANSFER_${status}`, id, { providerStatus: evidence.providerStatus, settlementTransactionId, reversalTransactionId });
      return this.transfer(row);
    });
  }
  async listTransfers() {
    const rows = await this.db.financeTransferRecord.findMany({ orderBy: { createdAt: 'desc' } });
    return rows.map((row: any) => this.transfer(row));
  }
  async createApproval(data: any, ctx: FinanceMutationContext) {
    return this.tx(async (tx) => {
      if (!data.payloadHash || !data.policyReference) throw new Error('Approval payload and policy binding are required');
      const row = await tx.financeApprovalRecord.create({
        data: { publicId: data.publicId, actionType: data.actionType, targetReferenceId: data.targetReferenceId, amountMinorUnits: data.amount?.amountMinorUnits,
          currencyCode: data.amount?.currencyCode, scale: data.amount?.scale, makerId: data.makerId, requiredApprovals: data.requiredApprovals,
          payloadHash: data.payloadHash, policyReference: data.policyReference, consumedAt: null, status: data.status, expiresAt: data.expiresAt },
        include: { decisions: true },
      });
      await this.govern(tx, ctx, 'FINANCE_APPROVAL_CREATED', row.id, { actionType: row.actionType, policyReference: row.policyReference, payloadHash: row.payloadHash });
      return this.approval(row);
    });
  }
  async getApproval(id: string) {
    const row = await this.db.financeApprovalRecord.findFirst({ where: { OR: [{ id }, { publicId: id }] }, include: { decisions: true } });
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
        data: { status },
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
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row: any) => this.approval(row));
  }
  async createRefund(data: any, ctx: FinanceMutationContext) {
    return this.tx(async (tx) => {
      const payment = await tx.financePaymentRecord.findUnique({ where: { id: data.paymentId } });
      if (!payment || ![PaymentStatus.CAPTURED, PaymentStatus.PARTIALLY_REFUNDED].includes(payment.status)) throw new Error('Payment is not refundable');
      const refunds = await tx.financeRefundRecord.findMany({ where: { paymentId: data.paymentId, status: { in: ['PENDING_APPROVAL', 'APPROVED', 'PROCESSING', 'COMPLETED'] } } });
      const reserved = refunds.reduce((sum: bigint, row: any) => sum + BigInt(row.amountMinorUnits), 0n);
      if (data.amount.currencyCode !== payment.currencyCode || data.amount.scale !== payment.scale || BigInt(data.amount.amountMinorUnits) <= 0n ||
          reserved + BigInt(data.amount.amountMinorUnits) > BigInt(payment.amountMinorUnits)) throw new Error('Refund exceeds remaining refundable amount');
      const row = await tx.financeRefundRecord.create({ data: { publicId: data.publicId, paymentId: data.paymentId, amountMinorUnits: data.amount.amountMinorUnits,
        currencyCode: data.amount.currencyCode, scale: data.amount.scale, reason: data.reason, status: 'PENDING_APPROVAL', makerId: data.makerId } });
      await this.govern(tx, ctx, 'FINANCE_REFUND_REQUESTED', row.id, {});
      return this.refund(row);
    });
  }
  async getRefund(id: string) {
    const row = await this.db.financeRefundRecord.findFirst({ where: { OR: [{ id }, { publicId: id }] } });
    return row ? this.refund(row) : null;
  }
  async beginRefundProcessing(id: string, approval: FinanceApprovalBinding, ctx: FinanceMutationContext) {
    return this.tx(async (tx) => {
      const refund = await tx.financeRefundRecord.findUnique({ where: { id } });
      if (!refund || refund.status !== 'PENDING_APPROVAL') throw new Error('Refund is not pending approval');
      const payment = await tx.financePaymentRecord.findUnique({ where: { id: refund.paymentId } });
      if (!payment || !payment.gatewayProvider || !payment.gatewayReference) throw new Error('Original payment gateway evidence missing');
      await this.consumeApproval(tx, approval);
      const reserved = await tx.financeRefundRecord.updateMany({
        where: { id: refund.id, status: 'PENDING_APPROVAL', approvalId: null },
        data: { status: 'PROCESSING', approvalId: approval.approvalId },
      });
      if (reserved.count !== 1) throw new Error('Refund execution was reserved concurrently');
      const row = await tx.financeRefundRecord.findUnique({ where: { id: refund.id } });
      if (!row) throw new Error('Refund disappeared during execution reservation');
      await this.govern(tx, ctx, 'FINANCE_REFUND_PROCESSING', row.id, { approvalId: approval.approvalId });
      return this.refund(row);
    });
  }
  async completeRefundAtomic(id: string, providerEvidence: { gatewayProvider: string; gatewayReference: string }, ctx: FinanceMutationContext) {
    return this.tx(async (tx) => {
      const refund = await tx.financeRefundRecord.findUnique({ where: { id } });
      if (!refund || refund.status !== 'PROCESSING' || !refund.approvalId) throw new Error('Refund is not reserved for processing');
      const payment = await tx.financePaymentRecord.findUnique({ where: { id: refund.paymentId } });
      if (!payment || !payment.gatewayProvider || !payment.gatewayReference) throw new Error('Original payment gateway evidence missing');
      if (providerEvidence.gatewayProvider !== payment.gatewayProvider || !providerEvidence.gatewayReference.trim())
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
      const cash = await this.systemAccount(tx, 'PAYMENT_CLEARING', 'ASSET', refund.currencyCode, refund.scale);
      const receivable = await this.systemAccount(tx, 'ACCOUNTS_RECEIVABLE', 'ASSET', refund.currencyCode, refund.scale);
      await this.postWithinTx(tx, { ...ctx, idempotencyKey: `${ctx.idempotencyKey}:refund-ledger`, businessReferenceType: 'REFUND', businessReferenceId: refund.id,
        postings: [{ accountId: receivable.id, direction: 'DEBIT', amount }, { accountId: cash.id, direction: 'CREDIT', amount }] });
      const completed = await tx.financeRefundRecord.findMany({ where: { paymentId: payment.id, status: 'COMPLETED' } });
      const previouslyRefunded = completed.reduce((sum: bigint, row: any) => sum + BigInt(row.amountMinorUnits), 0n);
      const totalRefunded = previouslyRefunded + BigInt(refund.amountMinorUnits);
      const paymentStatus = totalRefunded === BigInt(payment.amountMinorUnits) ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED;
      await tx.financePaymentRecord.update({ where: { id: payment.id }, data: { status: paymentStatus } });
      const invoice = await tx.financeInvoiceRecord.findUnique({ where: { id: payment.invoiceId } });
      if (invoice) {
        const newDue = BigInt(invoice.dueMinorUnits) + BigInt(refund.amountMinorUnits);
        const reopenedStatus = newDue === BigInt(invoice.totalMinorUnits)
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
      const row = await tx.financeRefundRecord.update({ where: { id: refund.id }, data: { status: 'COMPLETED',
        gatewayProvider: providerEvidence.gatewayProvider, gatewayReference: providerEvidence.gatewayReference, completedAt: new Date() } });
      await this.govern(tx, ctx, 'FINANCE_REFUND_COMPLETED', row.id, { approvalId: refund.approvalId, gatewayProvider: providerEvidence.gatewayProvider });
      return this.refund(row);
    });
  }
  async failRefund(id: string, failureCode: string, ctx: FinanceMutationContext) {
    return this.tx(async (tx) => {
      const current = await tx.financeRefundRecord.findUnique({ where: { id } });
      if (!current || current.status !== 'PROCESSING') throw new Error('Refund cannot fail from current state');
      const row = await tx.financeRefundRecord.update({ where: { id }, data: { status: 'FAILED', failureCode } });
      await this.govern(tx, ctx, 'FINANCE_REFUND_FAILED', row.id, { failureCode });
      return this.refund(row);
    });
  }
  async listRefunds() {
    const rows = await this.db.financeRefundRecord.findMany({ orderBy: { createdAt: 'desc' } });
    return rows.map((row: any) => this.refund(row));
  }
  async createCommission(data: any, ctx: FinanceMutationContext) {
    return this.tx(async (tx) => {
      const payment = await tx.financePaymentRecord.findUnique({ where: { id: data.sourcePaymentId } });
      if (!payment || payment.status !== PaymentStatus.CAPTURED) throw new Error('Commission requires a captured payment');
      const units = BigInt(data.amount.amountMinorUnits);
      const expected = (BigInt(payment.amountMinorUnits) * BigInt(data.calculationBasisPoints)) / 10_000n;
      if (data.amount.currencyCode !== payment.currencyCode || data.amount.scale !== payment.scale || units <= 0n || units > BigInt(payment.amountMinorUnits) || units !== expected)
        throw new Error('Commission amount violates payment denomination or policy calculation');
      const row = await tx.financeCommissionRecord.create({ data: { publicId: data.publicId, recipientReferenceId: data.recipientReferenceId, sourcePaymentId: data.sourcePaymentId,
        amountMinorUnits: data.amount.amountMinorUnits, currencyCode: data.amount.currencyCode, scale: data.amount.scale, status: data.status,
        policyReference: data.policyReference, calculationBasisPoints: data.calculationBasisPoints } });
      await this.govern(tx, ctx, 'FINANCE_COMMISSION_ACCRUED', row.id, { policyReference: data.policyReference, calculationBasisPoints: data.calculationBasisPoints });
      return this.commission(row);
    });
  }
  async listCommissions() {
    const rows = await this.db.financeCommissionRecord.findMany({ orderBy: { createdAt: 'desc' } });
    return rows.map((row: any) => this.commission(row));
  }
  async saveEstimate(data: any, ctx: FinanceMutationContext) {
    return this.tx(async (tx) => {
      const row = await tx.financeEstimateRecord.create({ data: { publicId: data.publicId, subjectReferenceId: data.subjectReferenceId,
        displayCurrencyCode: data.displayCurrencyCode, scale: data.total.scale, totalMinorUnits: data.total.amountMinorUnits, lines: data.lines } });
      await this.govern(tx, ctx, 'FINANCE_ESTIMATE_PERSISTED', row.id, { displayCurrencyCode: row.displayCurrencyCode, totalMinorUnits: row.totalMinorUnits });
      return { id: row.id, publicId: row.publicId, subjectReferenceId: row.subjectReferenceId, displayCurrencyCode: row.displayCurrencyCode,
        lines: row.lines, total: money(row.totalMinorUnits, row.displayCurrencyCode, row.scale), generatedAt: row.generatedAt };
    });
  }
  async runReconciliation() {
    const issues: any[] = [];
    const [transactions, badInvoices, captured, settled, callbacks, transfers, wallets] =
      await Promise.all([
        this.db.financialTransactionRecord.findMany({ include: { entries: true } }),
        this.db.financeInvoiceRecord.findMany({
          where: { status: InvoiceStatus.PAID, NOT: { dueMinorUnits: '0' } },
        }),
        this.db.financePaymentRecord.findMany({ where: { status: PaymentStatus.CAPTURED } }),
        this.db.financeTransferRecord.findMany({
          where: { status: { in: ['SETTLED', 'COMPLETED'] } },
        }),
        this.db.financePaymentRecord.findMany({ where: { gatewayReference: { not: null } } }),
        this.db.financeTransferRecord.findMany({ where: { rateId: { not: null } } }),
        this.db.financeWalletRecord.findMany(),
      ]);
    for (const tx of transactions) {
      const debit = tx.entries
        .filter((item: any) => item.direction === 'DEBIT')
        .reduce((sum: bigint, item: any) => sum + BigInt(item.amountMinorUnits), BigInt(0));
      const credit = tx.entries
        .filter((item: any) => item.direction === 'CREDIT')
        .reduce((sum: bigint, item: any) => sum + BigInt(item.amountMinorUnits), BigInt(0));
      if (debit !== credit)
        issues.push({
          code: 'LEDGER_IMBALANCE',
          severity: 'CRITICAL',
          referenceId: tx.publicId,
          details: 'Debit and credit totals differ',
        });
    }
    issues.push(
      ...badInvoices.map((row: any) => ({
        code: 'PAID_INVOICE_DUE',
        severity: 'CRITICAL',
        referenceId: row.publicId,
        details: 'Paid invoice has amount due',
      })),
    );
    for (const payment of captured)
      if (
        !transactions.some(
          (tx: any) =>
            tx.businessReferenceType === 'PAYMENT' && tx.businessReferenceId === payment.id,
        )
      )
        issues.push({
          code: 'CAPTURE_WITHOUT_POSTING',
          severity: 'HIGH',
          referenceId: payment.publicId,
          details: 'Captured payment has no ledger posting',
        });
    for (const transfer of settled)
      if (
        !transactions.some(
          (tx: any) =>
            tx.businessReferenceType === 'TRANSFER' && tx.businessReferenceId === transfer.id,
        )
      )
        issues.push({
          code: 'ORPHAN_SETTLEMENT',
          severity: 'CRITICAL',
          referenceId: transfer.publicId,
          details: 'Settled transfer has no ledger settlement',
        });
    const callbackKeys = new Set<string>();
    for (const payment of callbacks) {
      const key = `${payment.gatewayProvider}:${payment.gatewayReference}`;
      if (callbackKeys.has(key))
        issues.push({
          code: 'DUPLICATE_GATEWAY_CALLBACK',
          severity: 'HIGH',
          referenceId: payment.publicId,
          details: 'Duplicate gateway reference',
        });
      callbackKeys.add(key);
    }
    for (const transfer of transfers) {
      const rate = await this.db.financeExchangeRateRecord.findUnique({
        where: { id: transfer.rateId },
      });
      if (!rate)
        issues.push({
          code: 'FX_MISMATCH',
          severity: 'CRITICAL',
          referenceId: transfer.publicId,
          details: 'Transfer rate snapshot is missing',
        });
    }
    for (const wallet of wallets) {
      const balance = await this.getWalletBalance(wallet.id);
      if (BigInt(balance.availableBalance.amountMinorUnits) < BigInt(0))
        issues.push({
          code: 'WALLET_BALANCE_MISMATCH',
          severity: 'CRITICAL',
          referenceId: wallet.publicId,
          details: 'Available wallet balance is negative',
        });
    }
    return issues;
  }
  async getFinanceOverview(): Promise<import('@manaratak/domain').FinanceOverviewDto> {
    const [pendingPayments, pendingTransfers, pendingApprovals, issues] = await Promise.all([
      this.db.financePaymentRecord.count({
        where: { status: { in: [PaymentStatus.PENDING, PaymentStatus.AUTHORIZED] } },
      }),
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
      this.runReconciliation(),
    ]);
    return {
      pendingPayments,
      pendingTransfers,
      pendingApprovals,
      reconciliationHealth: issues.some((item) => item.severity === 'CRITICAL')
        ? 'CRITICAL'
        : issues.some((item) => item.severity === 'HIGH')
          ? 'DEGRADED'
          : 'HEALTHY',
      attention: issues,
    };
  }
  async getFinancialReport(): Promise<import('@manaratak/domain').FinancialReportDto> {
    const [payments, invoices, refunds, transfers, commissions, wallets, issues] =
      await Promise.all([
        this.db.financePaymentRecord.findMany({ where: { status: PaymentStatus.CAPTURED } }),
        this.db.financeInvoiceRecord.findMany({
          where: {
            status: {
              in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE],
            },
          },
        }),
        this.db.financeRefundRecord.findMany({ where: { status: 'COMPLETED' } }),
        this.db.financeTransferRecord.findMany({
          where: { status: { in: ['SETTLED', 'COMPLETED'] } },
        }),
        this.db.financeCommissionRecord.findMany({
          where: { status: { in: ['ACCRUED', 'APPROVED', 'PAYABLE'] } },
        }),
        this.db.financeWalletRecord.findMany(),
        this.runReconciliation(),
      ]);
    const sum = (rows: any[], units: (row: any) => string, currency: (row: any) => string) =>
      rows.reduce((totals: Record<string, string>, row) => {
        const code = currency(row);
        totals[code] = (BigInt(totals[code] || '0') + BigInt(units(row))).toString();
        return totals;
      }, {});
    const walletBalances = await Promise.all(
      wallets.map((row: any) => this.getWalletBalance(row.id)),
    );
    return {
      generatedAt: new Date(),
      revenueByCurrency: sum(
        payments,
        (row) => row.amountMinorUnits,
        (row) => row.currencyCode,
      ),
      outstandingByCurrency: sum(
        invoices,
        (row) => row.dueMinorUnits,
        (row) => row.currencyCode,
      ),
      refundsByCurrency: sum(
        refunds,
        (row) => row.amountMinorUnits,
        (row) => row.currencyCode,
      ),
      transferVolumeByCurrency: sum(
        transfers,
        (row) => row.sourceAmountMinorUnits,
        (row) => row.sourceCurrencyCode,
      ),
      walletLiabilityByCurrency: sum(
        walletBalances,
        (row) => row.currentBalance.amountMinorUnits,
        (row) => row.currentBalance.currencyCode,
      ),
      commissionsByCurrency: sum(
        commissions,
        (row) => row.amountMinorUnits,
        (row) => row.currencyCode,
      ),
      reconciliationStatus: issues.some((item) => item.severity === 'CRITICAL')
        ? 'CRITICAL'
        : issues.some((item) => item.severity === 'HIGH')
          ? 'DEGRADED'
          : 'HEALTHY',
    };
  }

  async getStudentFinancialReadModel(
    studentReferenceId: string,
  ): Promise<import('@manaratak/domain').StudentFinancialReadModelDto> {
    const [invoiceRows, walletRows] = await Promise.all([
      this.db.financeInvoiceRecord.findMany({
        where: { studentReferenceId },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.financeWalletRecord.findMany({
        where: { ownerReferenceId: studentReferenceId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    const wallets = await Promise.all(
      walletRows.map(async (wallet: any) => ({
        wallet,
        balance: await this.getWalletBalance(wallet.id),
      })),
    );
    const transfers = await this.db.financeTransferRecord.findMany({
      where: { sourceWalletId: { in: walletRows.map((wallet: any) => wallet.id) } },
      orderBy: { createdAt: 'desc' },
    });
    return {
      studentReferenceId,
      invoices: invoiceRows.map((row: any) => this.invoice(row)),
      wallets,
      transfers: transfers.map((row: any) => this.transfer(row)),
      generatedAt: new Date(),
    };
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
    tx: Db, ownerReferenceId: string, type: string, currencyCode: string, scale: number,
  ) {
    const existing = await tx.financialAccountRecord.findFirst({ where: { ownerReferenceId, type, currencyCode } });
    if (existing) {
      if (!existing.systemManaged || !existing.active || existing.scale !== scale || existing.type !== type || existing.currencyCode !== currencyCode)
        throw new Error(`Reserved system account invariant violation: ${ownerReferenceId}`);
      return existing;
    }
    return tx.financialAccountRecord.create({ data: { publicId: `fin_account_${randomUUID()}`, ownerReferenceId, type, currencyCode, scale, active: true, systemManaged: true } });
  }
  private async postWithinTx(tx: Db, data: PostLedgerTransactionInput) {
    validateBalancedPostings(data.postings);
    const idempotencyKeyHash = hash(data.idempotencyKey);
    const duplicate = await tx.financialTransactionRecord.findUnique({ where: { idempotencyKeyHash }, include: { entries: true } });
    if (duplicate) return duplicate;
    if (data.reversalOfId) {
      const prior = await tx.financialTransactionRecord.findFirst({ where: { reversalOfId: data.reversalOfId } });
      if (prior) throw new Error('Financial transaction has already been reversed');
    }
    const ids = [...new Set(data.postings.map((item) => item.accountId))];
    const accounts = await tx.financialAccountRecord.findMany({ where: { id: { in: ids }, active: true } });
    if (accounts.length !== ids.length) throw new Error('Financial account missing or inactive');
    const first = data.postings[0].amount;
    if (accounts.some((account: any) => account.currencyCode !== first.currencyCode || account.scale !== first.scale))
      throw new Error('Ledger account currency mismatch');
    return tx.financialTransactionRecord.create({
      data: { publicId: `fin_tx_${randomUUID()}`, correlationId: data.correlationId, businessReferenceType: data.businessReferenceType,
        businessReferenceId: data.businessReferenceId, idempotencyKeyHash, currencyCode: first.currencyCode, scale: first.scale, reversalOfId: data.reversalOfId,
        createdBy: data.actorId, entries: { create: data.postings.map((entry, sequence) => ({ accountId: entry.accountId, direction: entry.direction,
          amountMinorUnits: entry.amount.amountMinorUnits, currencyCode: entry.amount.currencyCode, scale: entry.amount.scale, sequence, memo: entry.memo })) } },
      include: { entries: true },
    });
  }
  private async consumeApproval(tx: Db, binding: FinanceApprovalBinding) {
    const approval = await tx.financeApprovalRecord.findUnique({ where: { id: binding.approvalId }, include: { decisions: true } });
    if (!approval || approval.status !== 'APPROVED' || approval.consumedAt) throw new Error('Financial approval is not approved/unconsumed');
    if (approval.actionType !== binding.actionType || approval.targetReferenceId !== binding.targetReferenceId || approval.makerId !== binding.makerId ||
        approval.payloadHash !== binding.payloadHash || approval.policyReference !== binding.policyReference)
      throw new Error('Financial approval binding mismatch');
    if (approval.expiresAt && approval.expiresAt <= new Date()) throw new Error('Financial approval expired');
    if (binding.amount) {
      if (approval.amountMinorUnits !== binding.amount.amountMinorUnits || approval.currencyCode !== binding.amount.currencyCode || approval.scale !== binding.amount.scale)
        throw new Error('Financial approval amount binding mismatch');
    }
    const consumed = await tx.financeApprovalRecord.updateMany({ where: { id: approval.id, status: 'APPROVED', consumedAt: null }, data: { consumedAt: new Date() } });
    if (consumed.count !== 1) throw new Error('Financial approval was already consumed concurrently');
  }
  private async walletBalanceWithinTx(tx: Db, wallet: any) {
    const [entries, holds] = await Promise.all([
      tx.financialLedgerEntryRecord.findMany({ where: { accountId: wallet.accountId } }),
      tx.financeWalletHoldRecord.findMany({ where: { walletId: wallet.id, status: 'ACTIVE' } }),
    ]);
    if (entries.some((item: any) => item.currencyCode !== wallet.currencyCode || item.scale !== wallet.scale) ||
        holds.some((item: any) => item.currencyCode !== wallet.currencyCode || item.scale !== wallet.scale))
      throw new Error('Wallet projection contains mixed-currency financial records');
    const current = entries.reduce((sum: bigint, item: any) => sum + (item.direction === 'CREDIT' ? BigInt(item.amountMinorUnits) : -BigInt(item.amountMinorUnits)), 0n);
    const locked = holds.reduce((sum: bigint, item: any) => sum + BigInt(item.amountMinorUnits), 0n);
    return { walletId: wallet.id, currentBalance: money(current.toString(), wallet.currencyCode, wallet.scale),
      availableBalance: money((current - locked).toString(), wallet.currencyCode, wallet.scale), lockedBalance: money(locked.toString(), wallet.currencyCode, wallet.scale), asOf: new Date() };
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
      feeAmount: row.feeAmountMinorUnits != null
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
