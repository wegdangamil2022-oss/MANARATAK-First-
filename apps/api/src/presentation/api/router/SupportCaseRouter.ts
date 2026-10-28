import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import {
  SUPPORT_STATUSES,
  SUPPORT_CATEGORIES,
  type AuthorizationEvaluatorService,
  type IAuditRecordRepository,
  type SupportCase,
} from '@manaratak/domain';
import type { SupportCaseUseCases } from '@manaratak/application';
import { SecurityMiddlewareFactory } from '../../security/SecurityMiddlewareFactory.js';
import { AuditHelper } from '../../audit/AuditHelper.js';

const id = z.string().trim().min(1).max(128);
const version = z.number().int().positive();
const page = {
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().max(2048).optional(),
};
const baseCase = {
  title: z.string().trim().min(3).max(160),
  body: z.string().trim().min(3).max(4000),
  category: z.enum(SUPPORT_CATEGORIES),
  followupTo: id.optional(),
};
type Dependencies = {
  supportCaseUseCases: SupportCaseUseCases;
  authEvaluatorService: AuthorizationEvaluatorService;
  auditRecordRepo: IAuditRecordRepository;
  supportAgentChoices: (query: string) => Promise<Array<{ id: string; label: string }>>;
};
export class SupportCaseRouter {
  static create(deps: Dependencies, student = false) {
    const router = Router(),
      uc = deps.supportCaseUseCases;
    const permission = (action: string) =>
      SecurityMiddlewareFactory.createAdminPermissionGuard(
        'admin:students:support:' + action,
        deps.authEvaluatorService,
      );
    const allowed = async (req: Request, action: string) =>
      !student &&
      (
        await deps.authEvaluatorService.evaluatePermission(
          req.authUserId!,
          'admin:students:support:' + action,
          { ip: req.ip, requestTime: new Date() },
        )
      ).isGranted;
    const access = async (req: Request) =>
      uc.access(
        req.authUserId!,
        student ? 'STUDENT' : 'AGENT',
        await allowed(req, 'cases:all'),
        await allowed(req, 'cases:notes'),
      );
    const visibleCase = (record: SupportCase) =>
      student
        ? {
            id: record.id,
            publicId: record.publicId,
            title: record.title,
            category: record.category,
            status: record.status,
            version: record.version,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
            resolvedAt: record.resolvedAt,
            closedAt: record.closedAt,
          }
        : record;
    const visibleCommand = (result: { record: SupportCase; replayed: boolean }) => ({
      ...result,
      record: visibleCase(result.record),
    });
    const context = (req: Request) => ({
      actorId: req.authUserId!,
      requestId: req.header('Idempotency-Key') ?? '',
      correlationId: req.header('x-correlation-id'),
      source: student ? 'student-support-portal' : 'admin-support',
    });
    const run =
      (fn: (req: Request, res: Response) => Promise<unknown>) =>
      (req: Request, res: Response, next: NextFunction) => {
        void fn(req, res).catch(next);
      };
    const auditRead = async (req: Request, target: string) => {
      if (student) return;
      await AuditHelper.recordMutation(
        deps.auditRecordRepo,
        req,
        {
          action: 'SUPPORT_CASE_ACCESS',
          category: 'STUDENT_SUPPORT',
          targetType: 'SUPPORT_CASE',
          targetId: target,
          result: 'SUCCESS',
          metadata: { operation: 'READ' },
        },
        { reliability: 'REQUIRED', principal: 'REQUIRED' },
      );
    };
    router.use((req, res, next) => {
      res.setHeader('Cache-Control', 'no-store');
      if (!req.authUserId)
        return void res.status(401).json({ error: { code: 'SUPPORT_AUTH_REQUIRED' } });
      next();
    });
    if (!student)
      router.use(
        SecurityMiddlewareFactory.createAdminPermissionGuard(
          [
            'admin:students:support:cases:view',
            'admin:students:support:settings',
            'admin:students:support:metrics',
          ],
          deps.authEvaluatorService,
        ),
      );
    router.use((req, res, next) => {
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const key = req.header('Idempotency-Key');
        if (!key || key.length < 8 || key.length > 200)
          return void res.status(400).json({ error: { code: 'SUPPORT_COMMAND_REQUIRED' } });
      }
      next();
    });
    router.get(
      '/readiness',
      run(async (_req, res) => {
        const r = await uc.readiness();
        res.json(
          student
            ? { ready: r.ready, attachments: false, notificationDelivery: r.notificationDelivery }
            : r,
        );
      }),
    );
    if (!student) {
      router.get(
        '/agents',
        permission('cases:assign'),
        run(async (req, res) => {
          await auditRead(req, 'agent-picker');
          res.json({
            items: await deps.supportAgentChoices(
              z
                .string()
                .trim()
                .max(100)
                .parse(req.query.q ?? ''),
            ),
          });
        }),
      );
      router.get(
        '/metrics',
        permission('metrics'),
        run(async (req, res) => {
          await auditRead(req, 'metrics');
          res.json(await uc.metrics(await access(req)));
        }),
      );
      router.get(
        '/configuration',
        permission('settings'),
        run(async (req, res) => {
          await auditRead(req, 'configuration');
          res.json(await uc.configuration());
        }),
      );
      router.get(
        '/choices',
        permission('cases:view'),
        run(async (req, res) => {
          const config = await uc.configuration(),
            a = await access(req);
          res.json({
            teams: config.teams.filter(
              (team) => team.active && (a.allTeams || a.teamIds.includes(team.id)),
            ),
            macros: config.macros.filter((macro) => macro.status === 'APPROVED'),
          });
        }),
      );
      const common = { id, version: z.number().int().min(0) };
      router.put(
        '/configuration/:kind',
        permission('settings'),
        run(async (req, res) => {
          const kind = z.enum(['team', 'policy', 'macro']).parse(req.params.kind);
          if (kind === 'team') {
            const { memberIds, ...input } = z
              .object({
                ...common,
                name: z.string().trim().min(2).max(100),
                active: z.boolean(),
                memberIds: z.array(id).max(100),
              })
              .strict()
              .parse(req.body);
            res.json(
              await uc.saveConfiguration(kind, input, [...new Set(memberIds)], context(req)),
            );
          } else if (kind === 'policy') {
            const input = z
              .object({
                ...common,
                name: z.string().trim().min(2).max(100),
                active: z.boolean(),
                data: z
                  .object({
                    firstReplyMinutes: version.max(525600),
                    resolutionMinutes: version.max(525600),
                    reopenDays: version.max(365),
                    pauseWaitingForStudent: z.boolean(),
                    calendar: z
                      .object({
                        timeZone: z.string().min(1).max(80),
                        weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
                        opensAtMinute: z.number().int().min(0).max(1439),
                        closesAtMinute: version.max(1440),
                        holidays: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(366),
                      })
                      .strict(),
                  })
                  .strict(),
              })
              .strict()
              .parse(req.body);
            res.json(await uc.saveConfiguration(kind, input, [], context(req)));
          } else {
            const input = z
              .object({
                ...common,
                title: z.string().trim().min(2).max(100),
                locale: z.enum(['ar', 'en']),
                body: z.string().trim().min(1).max(4000),
                status: z.enum(['DRAFT', 'APPROVED', 'RETIRED']),
              })
              .strict()
              .parse(req.body);
            res.json(await uc.saveConfiguration(kind, input, [], context(req)));
          }
        }),
      );
    }
    if (!student) router.use(permission('cases:view'));
    router.get(
      '/command-status',
      run(async (req, res) => {
        const key = z.string().min(8).max(200).parse(req.header('Idempotency-Key'));
        await auditRead(req, 'command-status');
        res.json(await uc.commandStatus(key, await access(req)));
      }),
    );
    router.get(
      '/cases/:id/messages/:messageId/status',
      run(async (req, res) => {
        const result = await uc.messageStatus(
          id.parse(req.params.id),
          id.parse(req.params.messageId),
          await access(req),
        );
        await auditRead(req, req.params.id);
        res.json(result);
      }),
    );
    router.get(
      '/cases',
      run(async (req, res) => {
        const schema = z
          .object({
            ...page,
            q: z.string().trim().max(120).optional(),
            status: z.enum(SUPPORT_STATUSES).optional(),
            priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
            category: z.enum(SUPPORT_CATEGORIES).optional(),
            studentId: id.optional(),
            teamId: id.optional(),
            view: z
              .enum([
                'ALL',
                'MINE',
                'UNASSIGNED',
                'NEEDS_REPLY',
                'WAITING',
                'OVERDUE',
                'RESOLVED',
                'REOPENED',
              ])
              .optional(),
          })
          .strict();
        if (student) schema.omit({ studentId: true, teamId: true, view: true }).parse(req.query);
        const query = schema.parse(req.query);
        await auditRead(req, 'inbox');
        const result = await uc.list(query, await access(req));
        res.json({ ...result, items: result.items.map(visibleCase) });
      }),
    );
    router.post(
      '/cases',
      ...(!student ? [permission('cases:create'), permission('cases:all')] : []),
      run(async (req, res) => {
        const input = student
          ? z.object(baseCase).strict().parse(req.body)
          : z
              .object({ ...baseCase, studentId: id, reason: z.string().trim().min(3).max(2000) })
              .strict()
              .parse(req.body);
        res
          .status(201)
          .json(visibleCommand(await uc.create(input, await access(req), context(req))));
      }),
    );
    router.get(
      '/cases/:id',
      run(async (req, res) => {
        const item = await uc.get(id.parse(req.params.id), await access(req));
        await auditRead(req, item.id);
        res.json(visibleCase(item));
      }),
    );
    router.get(
      '/cases/:id/messages',
      run(async (req, res) => {
        const q = z.object(page).strict().parse(req.query);
        const result = await uc.messages(
          id.parse(req.params.id),
          await access(req),
          q.limit,
          q.cursor,
        );
        await auditRead(req, req.params.id);
        res.json(result);
      }),
    );
    if (student)
      router.post(
        '/cases/:id/close',
        run(async (req, res) => {
          const input = z
            .object({ expectedVersion: version, confirm: z.literal(true) })
            .strict()
            .parse(req.body);
          res.json(
            visibleCommand(
              await uc.studentClose(
                id.parse(req.params.id),
                input.expectedVersion,
                await access(req),
                context(req),
              ),
            ),
          );
        }),
      );
    router.post(
      '/cases/:id/messages',
      run(async (req, res) => {
        const input = student
          ? z
              .object({ body: z.string().trim().min(1).max(4000) })
              .strict()
              .parse(req.body)
          : z
              .object({
                body: z.string().trim().min(1).max(4000),
                expectedVersion: version,
                internal: z.boolean().optional(),
                requestInformation: z.boolean().optional(),
              })
              .strict()
              .parse(req.body);
        const internal = 'internal' in input && input.internal;
        if (!student && !(await allowed(req, internal ? 'cases:notes' : 'cases:reply')))
          return void res.status(403).json({ error: { code: 'SUPPORT_ACCESS_DENIED' } });
        res
          .status(201)
          .json(
            visibleCommand(
              await uc.reply(id.parse(req.params.id), input, await access(req), context(req)),
            ),
          );
      }),
    );
    if (!student) {
      router.get(
        '/cases/:id/events',
        run(async (req, res) => {
          const q = z.object(page).strict().parse(req.query);
          const result = await uc.events(
            id.parse(req.params.id),
            await access(req),
            q.limit,
            q.cursor,
          );
          await auditRead(req, req.params.id);
          res.json(result);
        }),
      );
      router.patch(
        '/cases/:id',
        run(async (req, res) => {
          const input = z
            .object({
              expectedVersion: version,
              status: z.enum(SUPPORT_STATUSES).optional(),
              priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
              teamId: id.nullable().optional(),
              assigneeId: id.nullable().optional(),
              relatedCaseId: id.optional(),
              reason: z.string().trim().min(3).max(2000),
            })
            .strict()
            .parse(req.body);
          if (
            (input.status || input.priority || input.relatedCaseId) &&
            !(await allowed(req, 'cases:manage'))
          )
            return void res.status(403).json({ error: { code: 'SUPPORT_ACCESS_DENIED' } });
          if (
            (input.teamId !== undefined || input.assigneeId !== undefined) &&
            !(await allowed(req, 'cases:assign'))
          )
            return void res.status(403).json({ error: { code: 'SUPPORT_ACCESS_DENIED' } });
          if (
            ![
              input.status,
              input.priority,
              input.relatedCaseId,
              input.teamId,
              input.assigneeId,
            ].some((value) => value !== undefined)
          )
            throw Error('SUPPORT_INPUT_INVALID');
          res.json(
            await uc.change(id.parse(req.params.id), input, await access(req), context(req)),
          );
        }),
      );
    }
    router.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
      if (error instanceof z.ZodError)
        return void res.status(400).json({ error: { code: 'SUPPORT_INPUT_INVALID' } });
      const code = error instanceof Error ? error.message.split(':')[0] : '';
      if (!code.startsWith('SUPPORT_') && !code.startsWith('STUDENT_SUPPORT_CURSOR'))
        return next(error);
      const status = code.includes('NOT_FOUND')
        ? 404
        : code.includes('CONFLICT') ||
            code.includes('FOLLOWUP_REQUIRED') ||
            code.includes('REOPEN_REQUIRED')
          ? 409
          : code.includes('NOT_READY')
            ? 503
            : code.includes('DENIED') ||
                code.includes('INELIGIBLE') ||
                code.includes('MEMBERSHIP_REQUIRED')
              ? 403
              : 400;
      res.status(status).json({ error: { code } });
    });
    return router;
  }
}
