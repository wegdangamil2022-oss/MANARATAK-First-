import { randomUUID } from 'node:crypto';
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  FinanceAdminUseCases,
  FinanceCommandIdentity,
  FinancePlatformUseCases,
} from '@manaratak/application';
import {
  AuthorizationEvaluatorService,
  InvoiceStatus,
  PaymentStatus,
  TransferStatus,
  financeApprovalPolicy,
} from '@manaratak/domain';
import { ForbiddenException } from '@manaratak/core';

const allAsUndefined = (value: unknown) =>
  typeof value === 'string' && ['', 'all', 'الكل'].includes(value.trim().toLowerCase())
    ? undefined
    : value;

const moneySchema = z.object({
  amountMinorUnits: z
    .string()
    .max(30)
    .regex(/^[1-9]\d{0,29}$/),
  currencyCode: z.string().regex(/^[A-Z]{3}$/),
  scale: z.number().int().min(0).max(6),
});

const lineItemSchema = z.object({
  description: z.string().trim().min(1).max(160),
  quantity: z.number().int().positive().max(1000000),
  unitPrice: moneySchema,
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export class FinanceAdminRouter {
  public static create(cradle: {
    financeAdminUseCases: FinanceAdminUseCases;
    financePlatformUseCases: FinancePlatformUseCases;
    authEvaluatorService: AuthorizationEvaluatorService;
  }): Router {
    const router = Router();
    router.use((req: Request, _res: Response, next: NextFunction) => {
      const supplied = req.headers['x-correlation-id'];
      req.headers['x-correlation-id'] =
        typeof supplied === 'string' && /^[A-Za-z0-9._:-]{1,100}$/.test(supplied)
          ? supplied
          : randomUUID();
      next();
    });
    const { financeAdminUseCases } = cradle;
    const { financePlatformUseCases, authEvaluatorService } = cradle;
    const identity = (req: Request, reason?: string): FinanceCommandIdentity => {
      if (!req.authUserId) throw new Error('Authenticated finance actor is required');
      const idempotencyKey = String(req.headers['idempotency-key'] || '').trim();
      if (!idempotencyKey) throw new Error('IDEMPOTENCY_KEY_REQUIRED');
      if (idempotencyKey.length > 200) throw new Error('IDEMPOTENCY_KEY_TOO_LONG');
      const stateful =
        /\/(?:invoices\/[^/]+\/(?:items|issue|void|credit-notes|installment-plans)|transfers\/[^/]+\/transitions|approvals\/[^/]+\/decisions|refunds\/[^/]+\/process|exchange-rates\/[^/]+\/activate|wallet-holds\/[^/]+\/(?:release|capture))$/.test(
          req.path,
        );
      const expectedVersion =
        z.number().int().positive().optional().parse(req.body?.expectedVersion) ??
        (req.headers['if-match']
          ? Number(String(req.headers['if-match']).replaceAll('"', ''))
          : undefined);
      if (stateful && (typeof expectedVersion !== 'number' || !Number.isSafeInteger(expectedVersion) || expectedVersion < 1))
        throw new Error('FINANCE_EXPECTED_VERSION_REQUIRED');
      return {
        expectedVersion,
        actorId: req.authUserId,
        correlationId:
          String(req.headers['x-correlation-id'] || '')
            .trim()
            .slice(0, 100) || randomUUID(),
        idempotencyKey,
        reason,
      };
    };

    const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
    const requireFinancePermission = async (req: Request, permission: string) => {
      if (!req.authUserId) throw new ForbiddenException('Authenticated finance actor is required');
      const decision = await authEvaluatorService.evaluatePermission(req.authUserId, permission, {
        ip: req.ip || req.socket?.remoteAddress || undefined,
        requestTime: new Date(),
        userAgent: req.headers['user-agent'],
        correlationId: req.headers['x-correlation-id'],
      });
      if (!decision.isGranted)
        throw new ForbiddenException(`User lacks required finance permission: ${permission}`);
    };

    const recordQuery = z.object({
      currencyCode: z
        .string()
        .regex(/^[A-Z]{3}$/)
        .optional(),
      minAmountMinorUnits: z
        .string()
        .regex(/^(?:0|[1-9]\d{0,29})$/)
        .optional(),
      maxAmountMinorUnits: z
        .string()
        .regex(/^(?:0|[1-9]\d{0,29})$/)
        .optional(),
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(50).default(20),
      status: z.string().trim().max(40).optional(),
      search: z.string().trim().max(120).optional(),
      provider: z.string().trim().max(128).optional(),
      ownerReferenceId: z.string().trim().max(160).optional(),
      from: z.coerce.date().optional(),
      to: z.coerce.date().optional(),
    });
    for (const kind of ['refunds', 'transfers', 'approvals', 'commissions', 'payments'] as const) {
      router.get(
        `/${kind}/:id`,
        asyncHandler(async (req: Request, res: Response) => {
          await requireFinancePermission(req, 'admin:finance:manage');
          const data = await financePlatformUseCases.getRecord(kind, req.params.id);
          if (!data) throw new Error('FINANCE_RECORD_NOT_FOUND');
          res.json(data);
        }),
      );
    }

    const listQuerySchema = z.object({
      status: z.preprocess(allAsUndefined, z.nativeEnum(InvoiceStatus).optional()),
      originDomain: z.string().optional(),
      originReferenceId: z.string().optional(),
      studentReferenceId: z.string().optional(),
      payerReferenceId: z.string().optional(),
      search: z.string().trim().min(1).max(120).optional(),
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(50).default(20),
    });

    router.get(
      '/invoices',
      asyncHandler(async (req: Request, res: Response) => {
        const filters = listQuerySchema.parse(req.query);
        res.json(await financeAdminUseCases.listInvoices(filters));
      }),
    );

    router.put(
      '/invoices/:id/items',
      asyncHandler(async (req: Request, res: Response) => {
        await requireFinancePermission(req, 'admin:finance:invoice:manage');
        const body = z
          .object({
            expectedVersion: z.number().int().positive(),
            lineItems: z.array(lineItemSchema).min(1).max(100),
          })
          .parse(req.body);
        res.json(
          await financePlatformUseCases.updateDraftInvoice(
            req.params.id,
            body.lineItems,
            identity(req),
          ),
        );
      }),
    );

    router.post(
      '/invoices/:id/issue',
      asyncHandler(async (req: Request, res: Response) => {
        await requireFinancePermission(req, 'admin:finance:invoice:manage');
        z.object({ expectedVersion: z.number().int().positive() })
          .strict()
          .parse(req.body ?? {});
        res.json(await financePlatformUseCases.issueInvoice(req.params.id, identity(req)));
      }),
    );

    router.post(
      '/invoices/:id/installment-plans',
      asyncHandler(async (req: Request, res: Response) => {
        await requireFinancePermission(req, 'admin:finance:invoice:manage');
        const body = z
          .object({
            expectedVersion: z.number().int().positive(),
            installments: z
              .array(z.object({ amount: moneySchema, dueDate: z.coerce.date() }).strict())
              .min(1).max(100),
          })
          .parse(req.body);
        res
          .status(201)
          .json(
            await financePlatformUseCases.createInstallments(
              req.params.id,
              body.installments,
              identity(req),
            ),
          );
      }),
    );
    router.post(
      '/invoices/:id/credit-notes',
      asyncHandler(async (req: Request, res: Response) => {
        await requireFinancePermission(req, 'admin:finance:invoice:manage');
        const body = z
          .object({ expectedVersion: z.number().int().positive(), amount: moneySchema, reason: z.string().trim().min(3).max(500) }).strict()
          .parse(req.body);
        res
          .status(201)
          .json(
            await financePlatformUseCases.createCreditNote(
              req.params.id,
              body.amount,
              body.reason,
              identity(req, body.reason),
            ),
          );
      }),
    );

    router.get(
      '/invoices/:id',
      asyncHandler(async (req: Request, res: Response) => {
        res.json(await financeAdminUseCases.getInvoice(req.params.id));
      }),
    );

    router.post(
      '/invoices/:id/void',
      asyncHandler(async (req: Request, res: Response) => {
        await requireFinancePermission(req, 'admin:finance:invoice:manage');
        z.object({ expectedVersion: z.number().int().positive() })
          .strict()
          .parse(req.body ?? {});
        res.json(await financePlatformUseCases.voidInvoice(req.params.id, identity(req)));
      }),
    );

    router.get(
      '/payments',
      asyncHandler(async (req: Request, res: Response) => {
        const filters = z
          .object({
            status: z.preprocess(allAsUndefined, z.nativeEnum(PaymentStatus).optional()),
            invoiceId: z.string().trim().min(1).optional(),
            gatewayProvider: z.string().trim().min(1).optional(),
            search: z.string().trim().min(1).max(120).optional(),
            page: z.coerce.number().int().min(1).default(1),
            pageSize: z.coerce.number().int().min(1).max(50).default(20),
          })
          .parse(req.query);
        res.json(await financeAdminUseCases.listPayments(filters));
      }),
    );

    router.get(
      '/invoices/:id/payments',
      asyncHandler(async (req: Request, res: Response) => {
        res.json(await financeAdminUseCases.listPaymentsForInvoice(req.params.id));
      }),
    );

    router.get(
      '/overview',
      asyncHandler(async (_req: Request, res: Response) =>
        res.json(await financePlatformUseCases.overview()),
      ),
    );
    router.get(
      '/runtime-readiness',
      asyncHandler(async (_req: Request, res: Response) =>
        res.json(financePlatformUseCases.runtimeReadiness()),
      ),
    );
    router.get(
      '/accounts',
      asyncHandler(async (req: Request, res: Response) => {
        res.setHeader('Cache-Control', 'no-store');
        await requireFinancePermission(req, 'admin:finance:manage');
        const filters = z.object({
          page: z.coerce.number().int().min(1).max(10000).default(1),
          pageSize: z.coerce.number().int().min(1).max(50).default(20),
          ownerReferenceId: z.string().trim().min(1).max(160).optional(),
          currencyCode: z.string().regex(/^[A-Z]{3}$/).optional(),
          type: z.enum(['ASSET', 'LIABILITY', 'REVENUE', 'EXPENSE', 'EQUITY']).optional(),
          active: z.enum(['true', 'false']).transform(value => value === 'true').optional(),
        }).strict().parse(req.query);
        res.json(await financeAdminUseCases.listFinancialAccounts(filters));
      }),
    );
    router.post(
      '/accounts',
      asyncHandler(async (req: Request, res: Response) => {
        await requireFinancePermission(req, 'admin:finance:account:manage');
        const body = z
          .object({
            ownerReferenceId: z.string().trim().min(1).max(160),
            type: z.enum(['ASSET', 'LIABILITY', 'REVENUE', 'EXPENSE', 'EQUITY']),
            currencyCode: z.string().regex(/^[A-Z]{3}$/),
            scale: z.number().int().min(0).max(6),
          })
          .parse(req.body);
        res
          .status(201)
          .json(await financePlatformUseCases.createFinancialAccount(body, identity(req)));
      }),
    );
    router.post(
      '/adjustment-cases',
      asyncHandler(async (req: Request, res: Response) => {
        await requireFinancePermission(req, 'admin:finance:ledger:post');
        const body = z
          .object({
            reasonCode: z.enum([
              'RECONCILIATION_CORRECTION',
              'ROUNDING_CORRECTION',
              'EMERGENCY_CORRECTION',
            ]),
            supportingDocumentId: z.string().uuid(),
          })
          .strict()
          .parse(req.body);
        res
          .status(201)
          .json(await financePlatformUseCases.createAdjustmentCase(body, identity(req)));
      }),
    );
    router.get(
      '/ledger/transactions/:id',
      asyncHandler(async (req: Request, res: Response) => {
        res.setHeader('Cache-Control', 'no-store');
        await requireFinancePermission(req, 'admin:finance:manage');
        res.json(await financeAdminUseCases.getLedgerTransaction(req.params.id));
      }),
    );
    router.post(
      '/ledger/transactions',
      asyncHandler(async (req: Request, res: Response) => {
        await requireFinancePermission(req, 'admin:finance:ledger:post');
        const body = z
          .object({
            approvalId: z.string().trim().min(1).max(160),
            reason: z.string().trim().min(3).max(500),
            businessReferenceType: z.literal('MANUAL_ADJUSTMENT'),
            businessReferenceId: z.string().trim().min(1).max(160),
            postings: z
              .array(
                z.object({
                  accountId: z.string().trim().min(1).max(160),
                  direction: z.enum(['DEBIT', 'CREDIT']),
                  amount: moneySchema,
                  memo: z.string().optional(),
                }),
              )
              .min(2),
          })
          .parse(req.body);
        res
          .status(201)
          .json(await financePlatformUseCases.postLedger(body, identity(req, body.reason)));
      }),
    );
    router.post(
      '/ledger/transactions/:id/reverse',
      asyncHandler(async (req: Request, res: Response) => {
        await requireFinancePermission(req, 'admin:finance:ledger:reverse');
        const body = z.object({
          approvalId: z.string().trim().min(1).max(160),
          reason: z.string().trim().min(3).max(500),
        }).strict().parse(req.body);
        res
          .status(201)
          .json(
            await financePlatformUseCases.reverseLedger(
              req.params.id,
              body.approvalId,
              identity(req, body.reason),
            ),
          );
      }),
    );
    router.get(
      '/wallets/:id',
      asyncHandler(async (req: Request, res: Response) => {
        res.setHeader('Cache-Control', 'no-store');
        await requireFinancePermission(req, 'admin:finance:manage');
        const query = z.object({
          page: z.coerce.number().int().min(1).max(10000).default(1),
          pageSize: z.coerce.number().int().min(1).max(50).default(20),
        }).strict().parse(req.query);
        res.json(await financeAdminUseCases.getWalletOperations(req.params.id, query.page, query.pageSize));
      }),
    );
    router.post(
      '/wallets',
      asyncHandler(async (req: Request, res: Response) => {
        await requireFinancePermission(req, 'admin:finance:wallet:manage');
        const body = z
          .object({
            ownerReferenceId: z.string().trim().min(1).max(160),
            accountId: z.string().trim().min(1).max(160),
            currencyCode: z.string().regex(/^[A-Z]{3}$/),
            scale: z.number().int().min(0).max(6),
          })
          .parse(req.body);
        res.status(201).json(await financePlatformUseCases.createWallet(body, identity(req)));
      }),
    );
    router.post(
      '/wallets/:id/holds',
      asyncHandler(async (req: Request, res: Response) => {
        await requireFinancePermission(req, 'admin:finance:wallet:manage');
        const body = z
          .object({ expectedVersion: z.number().int().positive(), amount: moneySchema, businessReferenceId: z.string().trim().min(1).max(160) }).strict()
          .parse(req.body);
        res
          .status(201)
          .json(
            await financePlatformUseCases.createWalletHold(
              { walletId: req.params.id, amount: body.amount, businessReferenceId: body.businessReferenceId },
              identity(req),
            ),
          );
      }),
    );
    router.post(
      '/wallet-holds/:id/release',
      asyncHandler(async (req: Request, res: Response) => {
        await requireFinancePermission(req, 'admin:finance:wallet:manage');
        z.object({expectedVersion: z.number().int().positive()}).strict().parse(req.body);
        return res.json(
          await financePlatformUseCases.resolveWalletHold(req.params.id, 'RELEASE', identity(req)),
        );
      }),
    );
    router.post(
      '/wallet-holds/:id/capture',
      asyncHandler(async (req: Request, res: Response) => {
        await requireFinancePermission(req, 'admin:finance:wallet:manage');
        return res.json(
          await financePlatformUseCases.resolveWalletHold(req.params.id, 'CAPTURE', identity(req)),
        );
      }),
    );
    router.get(
      '/transfers',
      asyncHandler(async (req: Request, res: Response) =>
        res.json(
          await financePlatformUseCases.listRecords('transfers', recordQuery.parse(req.query)),
        ),
      ),
    );
    router.post(
      '/transfers',
      asyncHandler(async (req: Request, res: Response) => {
        await requireFinancePermission(req, 'admin:finance:transfer:manage');
        const body = z
          .object({
            sourceWalletId: z.string().trim().min(1).max(160),
            destinationReferenceId: z.string().trim().min(1).max(160),
            destinationCurrencyCode: z.string().regex(/^[A-Z]{3}$/),
            bankProvider: z.string().trim().min(1).max(160),
            sourceAmount: moneySchema,
          })
          .parse(req.body);
        res.status(201).json(await financePlatformUseCases.requestTransfer(body, identity(req)));
      }),
    );
    router.post(
      '/transfers/:id/transitions',
      asyncHandler(async (req: Request, res: Response) => {
        const body = z
          .object({
            status: z.enum([
              'REQUESTED',
              'VALIDATED',
              'RATE_LOCKED',
              'FEES_CALCULATED',
              'PENDING_APPROVAL',
              'APPROVED',
              'PROCESSING',
              'SETTLED',
              'COMPLETED',
              'REJECTED',
              'FAILED',
              'CANCELLED',
              'REVERSED',
            ]),
            approvalId: z.string().trim().min(1).max(160).optional(),
          })
          .parse(req.body);
        const executionStatuses = new Set([
          'APPROVED',
          'PROCESSING',
          'SETTLED',
          'COMPLETED',
          'FAILED',
          'REVERSED',
        ]);
        await requireFinancePermission(
          req,
          executionStatuses.has(body.status)
            ? 'admin:finance:transfer:execute'
            : 'admin:finance:transfer:manage',
        );
        res.json(
          await financePlatformUseCases.transitionTransfer(
            req.params.id,
            body.status as TransferStatus,
            identity(req),
            { approvalId: body.approvalId },
          ),
        );
      }),
    );
    router.get(
      '/exchange-rates',
      asyncHandler(async (req: Request, res: Response) =>
        res.json(await financePlatformUseCases.listRecords('rates', recordQuery.parse(req.query))),
      ),
    );
    router.post(
      '/exchange-rates/refresh',
      asyncHandler(async (req: Request, res: Response) => {
        await requireFinancePermission(req, 'admin:finance:fx:refresh');
        const body = z
          .object({
            sourceCurrencyCode: z.string().regex(/^[A-Z]{3}$/),
            targetCurrencyCode: z.string().regex(/^[A-Z]{3}$/),
          })
          .strict()
          .parse(req.body);
        res
          .status(201)
          .json(
            await financePlatformUseCases.refreshAutomaticExchangeRate(
              body.sourceCurrencyCode,
              body.targetCurrencyCode,
              identity(req),
            ),
          );
      }),
    );
    router.post(
      '/exchange-rates',
      asyncHandler(async (req: Request, res: Response) => {
        const body = z
          .object({
            sourceCurrencyCode: z.string().regex(/^[A-Z]{3}$/),
            targetCurrencyCode: z.string().regex(/^[A-Z]{3}$/),
            rateNumerator: z.string().max(30).regex(/^[1-9]\d{0,29}$/),
            rateDenominator: z.string().max(30).regex(/^[1-9]\d{0,29}$/),
            source: z.literal('MANUAL_OVERRIDE'),
            providerReference: z.never().optional(),
            effectiveFrom: z.coerce.date(),
            effectiveTo: z.coerce.date().optional(),
            marginBasisPoints: z.number().int().min(0).max(10000).optional(),
            reason: z.string().optional(),
          })
          .parse(req.body);
        await requireFinancePermission(req, 'admin:finance:fx:create');
        res.status(201).json(
          await financePlatformUseCases.saveExchangeRate(body, {
            ...identity(req),
            reason: body.reason,
          }),
        );
      }),
    );
    router.post(
      '/exchange-rates/:id/activate',
      asyncHandler(async (req: Request, res: Response) => {
        await requireFinancePermission(req, 'admin:finance:fx:approve');
        const body = z.object({ approvalId: z.string().trim().min(1).max(160) }).parse(req.body);
        res.json(
          await financePlatformUseCases.activateManualExchangeRate(
            req.params.id,
            body.approvalId,
            identity(req),
          ),
        );
      }),
    );
    router.get(
      '/approvals',
      asyncHandler(async (req: Request, res: Response) =>
        res.json(
          await financePlatformUseCases.listRecords('approvals', recordQuery.parse(req.query)),
        ),
      ),
    );
    router.post(
      '/approvals',
      asyncHandler(async (req: Request, res: Response) => {
        await requireFinancePermission(req, 'admin:finance:approval:create');
        const body = z
          .object({
            actionType: z.string().trim().min(1).max(160),
            targetReferenceId: z.string().trim().min(1).max(160),
            amount: moneySchema.optional(),
            requiredApprovals: z.number().int().min(2).max(5).default(2),
            expiresAt: z.coerce.date().optional(),
            commandPayload: z.unknown().optional(),
          })
          .parse(req.body);
        res.status(201).json(await financePlatformUseCases.createApproval(body, identity(req)));
      }),
    );
    router.post(
      '/approvals/:id/decisions',
      asyncHandler(async (req: Request, res: Response) => {
        await requireFinancePermission(req, 'admin:finance:approval:decide');
        const body = z
          .object({ expectedVersion: z.number().int().positive(), decision: z.enum(['APPROVE', 'REJECT']), reason: z.string().trim().max(500).optional() }).strict()
          .parse(req.body);
        const approval = await financePlatformUseCases.getRecord('approvals', req.params.id);
        if (!approval) throw new Error('FINANCE_RECORD_NOT_FOUND');
        await requireFinancePermission(req, financeApprovalPolicy(approval.actionType).permission);
        const commandIdentity = identity(req, body.reason);
        res.json(
          await financePlatformUseCases.decideApproval(
            req.params.id,
            body.decision,
            commandIdentity.actorId,
            body.reason,
            commandIdentity,
          ),
        );
      }),
    );
    router.get(
      '/refunds',
      asyncHandler(async (req: Request, res: Response) =>
        res.json(
          await financePlatformUseCases.listRecords('refunds', recordQuery.parse(req.query)),
        ),
      ),
    );
    router.post(
      '/refunds',
      asyncHandler(async (req: Request, res: Response) => {
        await requireFinancePermission(req, 'admin:finance:refund:manage');
        const body = z
          .object({
            paymentId: z.string().trim().min(1).max(160),
            amount: moneySchema,
            reason: z.string().trim().min(3).max(500),
          })
          .parse(req.body);
        res
          .status(201)
          .json(await financePlatformUseCases.createRefund(body, identity(req, body.reason)));
      }),
    );
    router.post(
      '/refunds/:id/process',
      asyncHandler(async (req: Request, res: Response) => {
        await requireFinancePermission(req, 'admin:finance:refund:execute');
        const body = z.object({ approvalId: z.string().trim().min(1).max(160) }).parse(req.body);
        res.json(
          await financePlatformUseCases.processRefund(
            req.params.id,
            body.approvalId,
            identity(req),
          ),
        );
      }),
    );
    router.get(
      '/commissions',
      asyncHandler(async (req: Request, res: Response) =>
        res.json(
          await financePlatformUseCases.listRecords('commissions', recordQuery.parse(req.query)),
        ),
      ),
    );
    router.post(
      '/commissions',
      asyncHandler(async (req: Request, res: Response) => {
        await requireFinancePermission(req, 'admin:finance:commission:manage');
        const body = z
          .object({
            recipientReferenceId: z.string().trim().min(1).max(160),
            sourcePaymentId: z.string().trim().min(1).max(160),
            basisPoints: z.number().int().min(1).max(10000),
            policyReference: z.string().trim().min(1).max(160),
          })
          .parse(req.body);
        res.status(201).json(await financePlatformUseCases.accrueCommission(body, identity(req)));
      }),
    );
    router.post(
      '/estimates',
      asyncHandler(async (req: Request, res: Response) => {
        await requireFinancePermission(req, 'admin:finance:estimate:create');
        const body = z
          .object({
            subjectReferenceId: z.string().optional(),
            displayCurrencyCode: z.string().regex(/^[A-Z]{3}$/),
            displayScale: z.number().int().min(0).max(6),
            lines: z
              .array(
                z.object({
                  category: z.string().trim().min(1).max(160),
                  amount: moneySchema,
                  sourceReference: z.string().trim().min(1).max(160),
                  certainty: z.enum(['EXACT', 'ESTIMATED']),
                }),
              )
              .min(1),
          })
          .parse(req.body);
        res.status(201).json(await financePlatformUseCases.generateEstimate(body, identity(req)));
      }),
    );
    router.get(
      '/reconciliation',
      asyncHandler(async (req: Request, res: Response) => {
        await requireFinancePermission(req, 'admin:finance:reconciliation:run');
        res.json(await financePlatformUseCases.reconciliationSnapshot());
      }),
    );
    router.post(
      '/reconciliation/run',
      asyncHandler(async (req: Request, res: Response) => {
        await requireFinancePermission(req, 'admin:finance:reconciliation:run');
        const ctx = identity(req);
        res.json({
          operation: 'LOCAL_CONSISTENCY_SCAN',
          correlationId: ctx.correlationId,
          issues: await financePlatformUseCases.reconcile(ctx),
        });
      }),
    );
    router.post(
      '/reconciliation/providers/run',
      asyncHandler(async (req: Request, res: Response) => {
        await requireFinancePermission(req, 'admin:finance:reconciliation:run');
        await requireFinancePermission(req, 'admin:finance:reconciliation:providers');
        const ctx = identity(req);
        const body = z
          .object({ limit: z.number().int().min(1).max(50).default(20) })
          .parse(req.body ?? {});
        res.json({
          operation: 'PROVIDER_STATUS_RECONCILIATION',
          correlationId: ctx.correlationId,
          ...(await financePlatformUseCases.reconcileProviderStates({ ...ctx, limit: body.limit })),
        });
      }),
    );
    router.get(
      '/reports',
      asyncHandler(async (_req: Request, res: Response) =>
        res.json(await financePlatformUseCases.report()),
      ),
    );

    router.use((err: any, req: Request, res: Response, _next: NextFunction) => {
      const correlationId =
        typeof req.headers['x-correlation-id'] === 'string' &&
        /^[A-Za-z0-9._:-]{1,100}$/.test(req.headers['x-correlation-id'])
          ? req.headers['x-correlation-id']
          : 'finance-request';
      const message = String(err?.message || '');
      let code = 'FINANCE_INTERNAL_ERROR',
        status = 500;
      if (err instanceof z.ZodError) {
        code = 'FINANCE_VALIDATION_ERROR';
        status = 400;
      } else if (err instanceof ForbiddenException) {
        code = 'FINANCE_FORBIDDEN';
        status = 403;
      } else if (/not found|NOT_FOUND/i.test(message)) {
        code = 'FINANCE_RECORD_NOT_FOUND';
        status = 404;
      } else if (/NOT_CONFIGURED|RUNTIME_PENDING/i.test(message)) {
        code = 'FINANCE_CAPABILITY_UNAVAILABLE';
        status = 503;
      } else if (/TIMEOUT|UNAVAILABLE|PROTOCOL_ERROR|EVIDENCE_MISMATCH/.test(message)) {
        code = 'FINANCE_PROVIDER_OUTCOME_UNCONFIRMED';
        status = 503;
      } else if (/VERSION|EXPECTED_VERSION/.test(message)) {
        code = 'FINANCE_VERSION_CONFLICT';
        status = 409;
      } else if (
        /idempotency|duplicate|concurrent|mismatch|already|RESERVED|OUTCOME_PENDING|CONFLICT/i.test(
          message,
        )
      ) {
        code = 'FINANCE_COMMAND_CONFLICT';
        status = 409;
      }
      if (
        status === 500 &&
        /required|invalid|cannot|must|Only |FINANCE_.*(?:INVALID|REQUIRED|FORBIDDEN)|quorum|approval|not pending/i.test(
          message,
        )
      ) {
        code = 'FINANCE_OPERATION_REJECTED';
        status = 400;
      }
      if (err?.code === 'P2034' || err?.code === 'P2025') {
        code = 'FINANCE_COMMAND_CONFLICT';
        status = 409;
      }
      return res.status(status).json({ error: code, code, correlationId });
    });

    return router;
  }
}
