import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  FinanceAdminUseCases,
  FinanceCommandIdentity,
  FinancePlatformUseCases,
} from '@manaratak/application';
import { AuthorizationEvaluatorService, InvoiceStatus, PaymentStatus, TransferStatus } from '@manaratak/domain';
import { ForbiddenException } from '@manaratak/core';

const moneySchema = z.object({
  amountMinorUnits: z.string().regex(/^-?\d+$/),
  currencyCode: z.string().regex(/^[A-Z]{3}$/),
  scale: z.number().int().min(0).max(6),
});

const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().int().positive(),
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
    const { financeAdminUseCases } = cradle;
    const { financePlatformUseCases, authEvaluatorService } = cradle;
    const identity = (req: Request, reason?: string): FinanceCommandIdentity => {
      if (!req.authUserId) throw new Error('Authenticated finance actor is required');
      const idempotencyKey = String(req.headers['idempotency-key'] || '').trim();
      if (!idempotencyKey) throw new Error('IDEMPOTENCY_KEY_REQUIRED');
      if (idempotencyKey.length > 200) throw new Error('IDEMPOTENCY_KEY_TOO_LONG');
      return {
        actorId: req.authUserId,
        correlationId: String(req.headers['x-correlation-id'] || '').trim() || undefined,
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

    const listQuerySchema = z.object({
      status: z.nativeEnum(InvoiceStatus).optional(),
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
        const body = z.object({ lineItems: z.array(lineItemSchema).min(1) }).parse(req.body);
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
        res.json(await financePlatformUseCases.issueInvoice(req.params.id, identity(req)));
      }),
    );

    router.post(
      '/invoices/:id/installment-plans',
      asyncHandler(async (req: Request, res: Response) => {
        await requireFinancePermission(req, 'admin:finance:invoice:manage');
        const body = z
          .object({
            installments: z
              .array(z.object({ amount: moneySchema, dueDate: z.coerce.date() }))
              .min(1),
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
        const body = z.object({ amount: moneySchema, reason: z.string().min(3) }).parse(req.body);
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
        res.json(await financePlatformUseCases.voidInvoice(req.params.id, identity(req)));
      }),
    );

    router.get(
      '/payments',
      asyncHandler(async (req: Request, res: Response) => {
        const filters = z.object({
          status: z.nativeEnum(PaymentStatus).optional(),
          invoiceId: z.string().trim().min(1).optional(),
          gatewayProvider: z.string().trim().min(1).optional(),
          search: z.string().trim().min(1).max(120).optional(),
          page: z.coerce.number().int().min(1).default(1),
          pageSize: z.coerce.number().int().min(1).max(50).default(20),
        }).parse(req.query);
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
    router.post(
      '/accounts',
      asyncHandler(async (req: Request, res: Response) => {
        await requireFinancePermission(req, 'admin:finance:account:manage');
        const body = z
          .object({
            ownerReferenceId: z.string().min(1),
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
      '/ledger/transactions',
      asyncHandler(async (req: Request, res: Response) => {
        await requireFinancePermission(req, 'admin:finance:ledger:post');
        const body = z
          .object({
            approvalId: z.string().min(1),
            businessReferenceType: z.string().min(1),
            businessReferenceId: z.string().min(1),
            postings: z
              .array(
                z.object({
                  accountId: z.string().min(1),
                  direction: z.enum(['DEBIT', 'CREDIT']),
                  amount: moneySchema,
                  memo: z.string().optional(),
                }),
              )
              .min(2),
          })
          .parse(req.body);
        res.status(201).json(await financePlatformUseCases.postLedger(body, identity(req)));
      }),
    );
    router.post(
      '/ledger/transactions/:id/reverse',
      asyncHandler(async (req: Request, res: Response) => {
        await requireFinancePermission(req, 'admin:finance:ledger:reverse');
        const body = z.object({ approvalId: z.string().min(1) }).parse(req.body);
        res.status(201).json(
          await financePlatformUseCases.reverseLedger(req.params.id, body.approvalId, identity(req)),
        );
      }),
    );
    router.post(
      '/wallets',
      asyncHandler(async (req: Request, res: Response) => {
        await requireFinancePermission(req, 'admin:finance:wallet:manage');
        const body = z
          .object({
            ownerReferenceId: z.string().min(1),
            accountId: z.string().min(1),
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
          .object({ amount: moneySchema, businessReferenceId: z.string().min(1) })
          .parse(req.body);
        res
          .status(201)
          .json(
            await financePlatformUseCases.createWalletHold(
              { walletId: req.params.id, ...body },
              identity(req),
            ),
          );
      }),
    );
    router.post(
      '/wallet-holds/:id/release',
      asyncHandler(async (req: Request, res: Response) => {
        await requireFinancePermission(req, 'admin:finance:wallet:manage');
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
      asyncHandler(async (_req: Request, res: Response) =>
        res.json(await financePlatformUseCases.listTransfers()),
      ),
    );
    router.post(
      '/transfers',
      asyncHandler(async (req: Request, res: Response) => {
        await requireFinancePermission(req, 'admin:finance:transfer:manage');
        const body = z
          .object({
            sourceWalletId: z.string().min(1),
            destinationReferenceId: z.string().min(1),
            destinationCurrencyCode: z.string().regex(/^[A-Z]{3}$/),
            bankProvider: z.string().min(1),
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
            approvalId: z.string().min(1).optional(),
          })
          .parse(req.body);
        const executionStatuses = new Set(['APPROVED', 'PROCESSING', 'SETTLED', 'COMPLETED', 'FAILED', 'REVERSED']);
        await requireFinancePermission(
          req,
          executionStatuses.has(body.status) ? 'admin:finance:transfer:execute' : 'admin:finance:transfer:manage',
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
      asyncHandler(async (_req: Request, res: Response) =>
        res.json(await financePlatformUseCases.listRates()),
      ),
    );
    router.post(
      '/exchange-rates/refresh',
      asyncHandler(async (req: Request, res: Response) => {
        await requireFinancePermission(req, 'admin:finance:fx:refresh');
        const body = z.object({
          sourceCurrencyCode: z.string().regex(/^[A-Z]{3}$/),
          targetCurrencyCode: z.string().regex(/^[A-Z]{3}$/),
        }).strict().parse(req.body);
        res.status(201).json(await financePlatformUseCases.refreshAutomaticExchangeRate(
          body.sourceCurrencyCode,
          body.targetCurrencyCode,
          identity(req),
        ));
      }),
    );
    router.post(
      '/exchange-rates',
      asyncHandler(async (req: Request, res: Response) => {
        const body = z
          .object({
            sourceCurrencyCode: z.string().regex(/^[A-Z]{3}$/),
            targetCurrencyCode: z.string().regex(/^[A-Z]{3}$/),
            rateNumerator: z.string().regex(/^\d+$/),
            rateDenominator: z.string().regex(/^[1-9]\d*$/),
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
        const body = z.object({ approvalId: z.string().min(1) }).parse(req.body);
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
          await financePlatformUseCases.listApprovals(
            typeof req.query.status === 'string' ? req.query.status : undefined,
          ),
        ),
      ),
    );
    router.post(
      '/approvals',
      asyncHandler(async (req: Request, res: Response) => {
        await requireFinancePermission(req, 'admin:finance:approval:create');
        const body = z
          .object({
            actionType: z.string().min(1),
            targetReferenceId: z.string().min(1),
            amount: moneySchema.optional(),
            requiredApprovals: z.number().int().min(1).max(5),
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
          .object({ decision: z.enum(['APPROVE', 'REJECT']), reason: z.string().optional() })
          .parse(req.body);
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
      asyncHandler(async (_req: Request, res: Response) =>
        res.json(await financePlatformUseCases.listRefunds()),
      ),
    );
    router.post(
      '/refunds',
      asyncHandler(async (req: Request, res: Response) => {
        await requireFinancePermission(req, 'admin:finance:refund:manage');
        const body = z
          .object({ paymentId: z.string().min(1), amount: moneySchema, reason: z.string().min(3) })
          .parse(req.body);
        res.status(201).json(await financePlatformUseCases.createRefund(body, identity(req, body.reason)));
      }),
    );
    router.post(
      '/refunds/:id/process',
      asyncHandler(async (req: Request, res: Response) => {
        await requireFinancePermission(req, 'admin:finance:refund:execute');
        const body = z.object({ approvalId: z.string().min(1) }).parse(req.body);
        res.json(await financePlatformUseCases.processRefund(req.params.id, body.approvalId, identity(req)));
      }),
    );
    router.get(
      '/commissions',
      asyncHandler(async (_req: Request, res: Response) =>
        res.json(await financePlatformUseCases.listCommissions()),
      ),
    );
    router.post(
      '/commissions',
      asyncHandler(async (req: Request, res: Response) => {
        await requireFinancePermission(req, 'admin:finance:commission:manage');
        const body = z
          .object({
            recipientReferenceId: z.string().min(1),
            sourcePaymentId: z.string().min(1),
            basisPoints: z.number().int().min(1).max(10000),
            policyReference: z.string().min(1),
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
                  category: z.string().min(1),
                  amount: moneySchema,
                  sourceReference: z.string().min(1),
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
        res.json({ issues: await financePlatformUseCases.reconcile() });
      }),
    );
    router.post(
      '/reconciliation/run',
      asyncHandler(async (req: Request, res: Response) => {
        await requireFinancePermission(req, 'admin:finance:reconciliation:run');
        res.json({ issues: await financePlatformUseCases.reconcile() });
      }),
    );
    router.get(
      '/reports',
      asyncHandler(async (_req: Request, res: Response) =>
        res.json(await financePlatformUseCases.report()),
      ),
    );

    router.use((err: any, req: Request, res: Response, next: NextFunction) => {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation Error', details: err.issues });
      }
      if (err instanceof ForbiddenException) return res.status(403).json({ error: err.message });
      const message = String(err?.message || 'An error occurred');
      if (/not found/i.test(message)) return res.status(404).json({ error: message });
      if (/NOT_CONFIGURED|RUNTIME_PENDING|runtime transport is pending/i.test(message))
        return res.status(503).json({ error: message });
      if (/idempotency|duplicate|concurrent|mismatch|already/i.test(message))
        return res.status(409).json({ error: message });
      res.status(400).json({ error: message });
    });

    return router;
  }
}
