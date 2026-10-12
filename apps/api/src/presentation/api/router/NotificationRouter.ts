import { Router, Request, Response, NextFunction } from 'express';
import type {
  AuthorizationEvaluatorService,
  INotificationRecipientGateway,
  IStudentWorkspaceRepository,
} from '@manaratak/domain';
import { z } from 'zod';
import {
  ManageNotificationTemplatesUseCase,
  ManageNotificationIntentsUseCase,
} from '@manaratak/application';
import {
  notificationIntentSchema,
  notificationTemplateSchema,
  parseStrict,
} from '../../validation/StrictControlPlaneSchemas.js';

export class NotificationRouter {
  public static create({
    templatesUseCase,
    intentsUseCase,
    authEvaluatorService,
    notificationRecipientGateway,
    studentWorkspaceRepository,
  }: {
    templatesUseCase: ManageNotificationTemplatesUseCase;
    intentsUseCase: ManageNotificationIntentsUseCase;
    authEvaluatorService: AuthorizationEvaluatorService;
    notificationRecipientGateway: INotificationRecipientGateway;
    studentWorkspaceRepository: IStudentWorkspaceRepository;
  }): Router {
    const router = Router();
    const requirePermission = async (req: Request, action: string) => {
      if (!req.authUserId) throw new Error('NOTIFICATION_AUTHENTICATION_REQUIRED');
      const decision = await authEvaluatorService.evaluatePermission(
        req.authUserId,
        `admin:notifications:${action}`,
        { resourceId: req.params.id },
      );
      if (!decision.isGranted) throw new Error('NOTIFICATION_ACCESS_DENIED');
    };
    router.use(async (req, _res, next) => {
      try {
        await requirePermission(req, 'view');
        next();
      } catch (error) {
        next(error);
      }
    });
    router.get('/recipients', async (req, res, next) => {
      try {
        await requirePermission(req, 'intents:create');
        await requirePermission(req, 'recipients:pii');
        const { query, cursor } = z
          .object({
            query: z.string().trim().max(120).optional(),
            cursor: z.string().max(2048).optional(),
          })
          .strict()
          .parse(req.query);
        const page = await studentWorkspaceRepository.listSupportWorkspaces({
          query,
          cursor,
          status: 'ACTIVE' as any,
          limit: 25,
        });
        const items = [];
        for (const row of page.items) {
          try {
            await notificationRecipientGateway.assertEligible(row.studentReferenceId);
          } catch (error) {
            if (error instanceof Error && error.message === 'NOTIFICATION_RECIPIENT_NOT_ELIGIBLE')
              continue;
            throw error;
          }
          items.push({ studentReferenceId: row.studentReferenceId, displayName: row.displayName });
        }
        res.json({ items, nextCursor: page.nextCursor });
      } catch (error) {
        next(error);
      }
    });
    router.get('/summary', async (req, res, next) => {
      try {
        const parsed = z
          .object({ from: z.string().datetime(), to: z.string().datetime() })
          .strict()
          .parse(req.query);
        const from = new Date(parsed.from),
          to = new Date(parsed.to);
        if (from >= to || to.getTime() - from.getTime() > 31 * 86400000)
          throw new Error('NOTIFICATION_TIME_WINDOW_INVALID');
        res.json(await intentsUseCase.summary(from, to));
      } catch (error) {
        next(error);
      }
    });
    router.get('/intents/:id/receipts', async (req, res, next) => {
      try {
        res.json({ items: await intentsUseCase.receipts(req.params.id) });
      } catch (error) {
        next(error);
      }
    });

    router.post('/templates/:id/clone', async (req, res, next) => {
      try {
        await requirePermission(req, 'templates:author');
        const body = z
          .object({ id: z.string().trim().min(1).max(160) })
          .strict()
          .parse(req.body);
        await templatesUseCase.cloneTemplate(req.params.id, body.id);
        res.status(201).json({ message: 'Template revision created' });
      } catch (error) {
        next(error);
      }
    });
    router.post('/templates/:id/deactivate', async (req, res, next) => {
      try {
        await requirePermission(req, 'templates:author');
        const body = z
          .object({ expectedVersion: z.number().int().positive() })
          .strict()
          .parse(req.body);
        await templatesUseCase.deactivateTemplate(req.params.id, body.expectedVersion);
        res.json({ message: 'Template deactivated' });
      } catch (error) {
        next(error);
      }
    });
    router.post('/templates/:id/preview', async (req, res, next) => {
      try {
        await requirePermission(req, 'templates:author');
        const input = z
          .object({
            locale: z.enum(['ar', 'en']),
            variables: z.record(z.string().max(120), z.string().max(10000)),
          })
          .strict()
          .parse(req.body);
        res.json(await templatesUseCase.preview(req.params.id, input.variables, input.locale));
      } catch (error) {
        next(error);
      }
    });
    router.get('/templates', async (req, res, next) => {
      try {
        const rawLimit = Number(req.query.limit ?? 100);
        const limit = Number.isInteger(rawLimit) ? rawLimit : 100;
        res.json({ items: await templatesUseCase.listTemplates(limit) });
      } catch (error: any) {
        next(error);
      }
    });

    router.post('/templates', async (req, res, next) => {
      try {
        await requirePermission(req, 'templates:author');
        const template = parseStrict(notificationTemplateSchema, req.body);
        if (template.id.startsWith('system.') || template.id.startsWith('student-application-'))
          throw new Error('NOTIFICATION_OWNER_TEMPLATE_RESERVED');
        if (!template.contents) throw new Error('NOTIFICATION_TEMPLATE_CONTENT_REQUIRED');
        await templatesUseCase.createTemplate(template, {
          createOnly: true,
        });
        res.status(201).json({ message: 'Template created successfully' });
      } catch (error: any) {
        next(error);
      }
    });

    router.get('/intents', async (req, res, next) => {
      try {
        const query = z
          .object({
            limit: z.coerce.number().int().min(1).max(100).default(25),
            search: z.string().trim().max(120).optional(),
            recipientReference: z.string().trim().min(1).max(160).optional(),
            from: z.string().datetime().optional(),
            to: z.string().datetime().optional(),
            deliveryState: z
              .enum([
                'PENDING',
                'PROCESSING',
                'FAILED',
                'DEAD_LETTER',
                'DELIVERED',
                'ACCEPTED',
                'SUPPRESSED',
                'CANCELLED',
                'EXPIRED',
              ])
              .optional(),
            templateId: z.string().max(160).optional(),
            cursor: z.string().max(1024).optional(),
          })
          .strict()
          .parse(req.query);
        let after: { id: string; createdAt: Date } | undefined;
        if (query.cursor) {
          let decoded: unknown;
          try {
            decoded = JSON.parse(Buffer.from(query.cursor, 'base64url').toString());
          } catch {
            throw new Error('NOTIFICATION_CURSOR_INVALID');
          }
          const parsed = z
            .object({ id: z.string().min(1).max(160), createdAt: z.string().datetime() })
            .strict()
            .parse(decoded);
          after = { id: parsed.id, createdAt: new Date(parsed.createdAt) };
        }
        if (query.recipientReference) await requirePermission(req, 'recipients:pii');
        const from = query.from ? new Date(query.from) : undefined,
          to = query.to ? new Date(query.to) : undefined;
        if (from && to && from >= to) throw new Error('NOTIFICATION_TIME_WINDOW_INVALID');
        const page = await intentsUseCase.listIntents(query.limit + 1, {
          ...query,
          from,
          to,
          after,
        });
        const hasMore = page.length > query.limit,
          items = page.slice(0, query.limit),
          last = items.at(-1);
        const nextCursor =
          hasMore && last
            ? Buffer.from(JSON.stringify({ id: last.id, createdAt: last.createdAt })).toString(
                'base64url',
              )
            : null;
        const canReadRecipient =
          !!req.authUserId &&
          (
            await authEvaluatorService.evaluatePermission(
              req.authUserId,
              'admin:notifications:recipients:pii',
            )
          ).isGranted;
        res.json({
          items: items.map((item) =>
            canReadRecipient
              ? item
              : { ...item, recipientReference: '[REDACTED]', reference: '[REDACTED]' },
          ),
          nextCursor,
          hasMore,
        });
      } catch (error) {
        next(error);
      }
    });

    router.post('/intents/:id/retry', async (req, res, next) => {
      try {
        await requirePermission(req, 'delivery:retry');
        z.object({})
          .strict()
          .parse(req.body ?? {});
        await intentsUseCase.retryIntent(req.params.id);
        res.status(202).json({ message: 'Notification retry accepted' });
      } catch (error: any) {
        next(error);
      }
    });

    router.post('/intents/:id/cancel', async (req, res, next) => {
      try {
        await requirePermission(req, 'intents:cancel');
        z.object({})
          .strict()
          .parse(req.body ?? {});
        await intentsUseCase.cancelIntent(req.params.id);
        res.json({ message: 'Notification cancelled' });
      } catch (error) {
        next(error);
      }
    });

    router.post('/intents', async (req, res, next) => {
      try {
        await requirePermission(req, 'intents:create');
        const parsed = parseStrict(notificationIntentSchema, req.body);
        if (
          parsed.reference.startsWith('event:') ||
          parsed.id.startsWith('notification:') ||
          parsed.templateId.startsWith('system.') ||
          parsed.templateId.startsWith('student-application-')
        )
          throw new Error('NOTIFICATION_OWNER_REFERENCE_RESERVED');
        await intentsUseCase.createIntent({
          ...parsed,
          scheduledAt: parsed.scheduledAt ? new Date(parsed.scheduledAt) : undefined,
          expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : undefined,
        });
        res.status(201).json({ message: 'Intent created successfully' });
      } catch (error: any) {
        next(error);
      }
    });

    router.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
      if (error instanceof z.ZodError) {
        res.status(400).json({ code: 'NOTIFICATION_INPUT_INVALID' });
        return;
      }
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        res.status(409).json({ code: 'NOTIFICATION_ID_CONFLICT' });
        return;
      }
      if (!(error instanceof Error) || !error.message.startsWith('NOTIFICATION_')) {
        next(error);
        return;
      }
      const code = error.message.split(':')[0];
      const status =
        code === 'NOTIFICATION_ACCESS_DENIED'
          ? 403
          : code === 'NOTIFICATION_AUTHENTICATION_REQUIRED'
            ? 401
            : /NOT_RETRYABLE|NOT_CANCELLABLE|CONFLICT/.test(code)
              ? 409
              : 422;
      res.status(status).json({ code });
    });
    return router;
  }
}
