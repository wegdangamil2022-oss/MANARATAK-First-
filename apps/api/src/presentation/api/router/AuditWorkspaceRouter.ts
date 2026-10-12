import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import type { AuthorizationEvaluatorService } from '@manaratak/domain';
import type { AuditWorkspaceUseCases } from '@manaratak/application';
import { requireAuthenticatedPrincipal } from '../../security/AuthenticatedPrincipal.js';
import { SecurityMiddlewareFactory } from '../../security/SecurityMiddlewareFactory.js';

const id = z.string().trim().min(1).max(240);
const version = z.number().int().min(0);
const page = z
  .object({ limit: z.coerce.number().int().min(1).max(100).default(25), cursor: id.optional() })
  .strict();
export class AuditWorkspaceRouter {
  static create({
    auditWorkspaceUseCases,
    authEvaluatorService,
  }: {
    auditWorkspaceUseCases: AuditWorkspaceUseCases;
    authEvaluatorService?: AuthorizationEvaluatorService;
  }): Router {
    const router = Router();
    const requireAdminPermission = (permission: string) =>
      SecurityMiddlewareFactory.createAdminPermissionGuard(permission, authEvaluatorService);
    router.use((_req, res, next) => {
      res.setHeader('Cache-Control', 'no-store');
      next();
    });
    const context = (req: Request) => ({
      actorId: requireAuthenticatedPrincipal(req).principalId,
      source: 'admin-audit-workspace',
      correlationId: req.header('x-correlation-id'),
    });
    router.get(
      '/cases',
      requireAdminPermission('admin:audit:cases:view'),
      async (req, res, next) => {
        try {
          const query = page.parse(req.query);
          res.json({ data: await auditWorkspaceUseCases.list('CASE', query.limit, query.cursor) });
        } catch (error) {
          next(error);
        }
      },
    );
    router.get(
      '/cases/:id',
      requireAdminPermission('admin:audit:cases:view'),
      async (req, res, next) => {
        try {
          const row = await auditWorkspaceUseCases.get(id.parse(req.params.id), 'CASE');
          res.status(row ? 200 : 404).json({ data: row });
        } catch (error) {
          next(error);
        }
      },
    );
    router.post(
      '/cases',
      requireAdminPermission('admin:audit:cases:manage'),
      requireAdminPermission('admin:audit:cases:view'),
      async (req, res, next) => {
        try {
          const body = z
            .object({
              id,
              title: z.string().trim().min(1).max(200),
              assigneeId: id.optional(),
              references: z.array(id).max(100),
            })
            .strict()
            .parse(req.body);
          res
            .status(201)
            .json({ data: await auditWorkspaceUseCases.createCase(body, context(req)) });
        } catch (error) {
          next(error);
        }
      },
    );
    router.patch(
      '/cases/:id',
      requireAdminPermission('admin:audit:cases:manage'),
      requireAdminPermission('admin:audit:cases:view'),
      async (req, res, next) => {
        try {
          const body = z
            .object({
              expectedVersion: version.min(1),
              assigneeId: id.nullable().optional(),
              status: z.enum(['OPEN', 'INVESTIGATING', 'CLOSED']).optional(),
              references: z.array(id).max(100).optional(),
              legalHoldUntil: z.string().datetime().nullable().optional(),
              note: z
                .object({ id, text: z.string().trim().min(1).max(4000) })
                .strict()
                .optional(),
            })
            .strict()
            .parse(req.body);
          res.json({
            data: await auditWorkspaceUseCases.updateCase(
              id.parse(req.params.id),
              body,
              context(req),
            ),
          });
        } catch (error) {
          next(error);
        }
      },
    );
    router.get(
      '/alerts',
      requireAdminPermission('admin:audit:alerts:manage'),
      async (req, res, next) => {
        try {
          const query = page.parse(req.query);
          res.json({
            data: await auditWorkspaceUseCases.list('ALERT_RULE', query.limit, query.cursor),
          });
        } catch (error) {
          next(error);
        }
      },
    );
    router.get(
      '/alerts/:id/occurrences',
      requireAdminPermission('admin:audit:alerts:manage'),
      async (req, res, next) => {
        try {
          const query = page.parse(req.query);
          res.json({
            data: await auditWorkspaceUseCases.occurrences(
              id.parse(req.params.id),
              query.limit,
              query.cursor,
            ),
          });
        } catch (error) {
          next(error);
        }
      },
    );
    router.put(
      '/alerts/:id',
      requireAdminPermission('admin:audit:alerts:manage'),
      requireAdminPermission('admin:notifications:intents:create'),
      async (req, res, next) => {
        try {
          const body = z
            .object({
              expectedVersion: version,
              name: z.string().trim().min(1).max(160),
              enabled: z.boolean(),
              action: id.optional(),
              category: id.optional(),
              severity: z.enum(['INFO', 'WARNING', 'ERROR', 'CRITICAL']).optional(),
              outcome: z.enum(['SUCCESS', 'FAILURE', 'INTENT', 'UNKNOWN']).optional(),
              threshold: z.number().int().min(1).max(100),
              windowMinutes: z.number().int().min(1).max(1440),
              cooldownMinutes: z.number().int().min(1).max(10080),
              recipientId: id,
              templateId: id,
            })
            .strict()
            .parse(req.body);
          const { expectedVersion, ...rule } = body;
          res.json({
            data: await auditWorkspaceUseCases.saveRule(
              id.parse(req.params.id),
              rule,
              expectedVersion,
              context(req),
            ),
          });
        } catch (error) {
          next(error);
        }
      },
    );
    router.get(
      '/retention-policy',
      requireAdminPermission('admin:audit:retention:manage'),
      async (_req, res, next) => {
        try {
          res.json({
            data: await auditWorkspaceUseCases.get('audit-retention-policy', 'RETENTION_POLICY'),
          });
        } catch (error) {
          next(error);
        }
      },
    );
    router.put(
      '/retention-policy',
      requireAdminPermission('admin:audit:retention:manage'),
      async (req, res, next) => {
        try {
          const days = z.number().int().min(1).max(365000);
          const body = z
            .object({
              expectedVersion: version,
              durations: z
                .object({
                  SECURITY_CRITICAL: days.optional(),
                  FINANCIAL: days.optional(),
                  IDENTITY_ACCESS: days.optional(),
                  AUTHENTICATION: days.optional(),
                  STANDARD_ADMIN: days.optional(),
                })
                .strict(),
            })
            .strict()
            .parse(req.body);
          res.json({
            data: await auditWorkspaceUseCases.retention(
              body.durations,
              body.expectedVersion,
              context(req),
            ),
          });
        } catch (error) {
          next(error);
        }
      },
    );
    router.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
      const message = error instanceof Error ? error.message : '';
      const status =
        error instanceof z.ZodError
          ? 400
          : message === 'AUDIT_WORKSPACE_NOT_FOUND'
            ? 404
            : message === 'AUDIT_WORKSPACE_VERSION_CONFLICT'
              ? 409
              : /^(AUDIT_[A-Z_]+_INVALID|AUDIT_CASE_NOTE_DUPLICATE|AUDIT_CASE_REFERENCE_NOT_FOUND|NOTIFICATION_RECIPIENT_NOT_ELIGIBLE)$/.test(
                    message,
                  )
                ? 422
                : /NOT_CONFIGURED|NOT_INSTALLED|UNAVAILABLE|TRANSACTION_REQUIRED/.test(message)
                  ? 503
                  : 500;
      res
        .status(status)
        .type('application/problem+json')
        .json({
          type: 'about:blank',
          status,
          code:
            error instanceof z.ZodError
              ? 'AUDIT_WORKSPACE_REQUEST_INVALID'
              : status === 500
                ? 'AUDIT_WORKSPACE_FAILED'
                : message,
          instance: req.path,
        });
    });
    return router;
  }
}
