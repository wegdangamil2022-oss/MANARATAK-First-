import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { STAFF_CHANGE_ACTIONS, type IAuditRecordRepository } from '@manaratak/domain';
import type { StaffLifecycleUseCases } from '@manaratak/application';
import { AuditHelper } from '../../audit/AuditHelper.js';

const id = z.string().uuid(),
  version = z.number().int().positive(),
  reason = z.string().trim().min(3).max(1000);
export class StaffLifecycleRouter {
  static create({
    staffLifecycleUseCases: owner,
    auditRecordRepo,
  }: {
    staffLifecycleUseCases: StaffLifecycleUseCases;
    auditRecordRepo: IAuditRecordRepository;
  }) {
    const router = Router();
    const context = (req: Request) => {
      if (!req.authUserId) throw Error('STAFF_AUTH_REQUIRED');
      return {
        actorId: req.authUserId,
        source: 'admin-staff-lifecycle',
        correlationId: req.header('x-correlation-id'),
      };
    };
    const run =
      (fn: (req: Request, res: Response) => Promise<unknown>) =>
      (req: Request, res: Response, next: NextFunction) => {
        void fn(req, res).catch(next);
      };
    router.use((_req, res, next) => {
      res.setHeader('Cache-Control', 'no-store');
      next();
    });
    const read = async (req: Request, targetId: string) =>
      AuditHelper.recordMutation(
        auditRecordRepo,
        req,
        {
          action: 'STAFF_LIFECYCLE_ACCESS',
          category: 'STAFF',
          targetType: 'STAFF_MEMBERSHIP',
          targetId,
          result: 'SUCCESS',
        },
        { reliability: 'REQUIRED', principal: 'REQUIRED' },
      );
    router.get(
      '/readiness',
      run(async (_req, res) => res.json({ data: await owner.readiness() })),
    );
    router.get(
      '/members/:id/readiness',
      run(async (req, res) => {
        await read(req, req.params.id);
        res.json({ data: await owner.snapshot(id.parse(req.params.id)) });
      }),
    );
    const paging = z
      .object({ limit: z.coerce.number().int().min(1).max(100).default(20), cursor: id.optional() })
      .strict();
    router.get(
      '/invitations',
      run(async (req, res) => {
        const q = paging.parse(req.query);
        await read(req, 'invitations');
        res.json({ data: await owner.invitations(q.limit, q.cursor) });
      }),
    );
    router.post(
      '/invitations',
      run(async (req, res) => {
        const input = z.object({ id, membershipId: id, version, reason }).strict().parse(req.body);
        res.status(201).json({ data: await owner.invite(input, context(req)) });
      }),
    );
    router.post(
      '/invitations/:id/revoke',
      run(async (req, res) => {
        const input = z.object({ version, reason }).strict().parse(req.body);
        await owner.revoke({ ...input, id: id.parse(req.params.id) }, context(req));
        res.json({ data: { revoked: true } });
      }),
    );
    router.get(
      '/changes',
      run(async (req, res) => {
        const q = paging.parse(req.query);
        await read(req, 'changes');
        res.json({
          data: {
            ...(await owner.changes(req.authUserId!, q.limit, q.cursor)),
            actorId: req.authUserId!,
          },
        });
      }),
    );
    router.post(
      '/changes',
      run(async (req, res) => {
        const input = z
          .object({
            id,
            membershipId: id,
            version,
            action: z.enum(STAFF_CHANGE_ACTIONS),
            reason,
            payload: z
              .object({
                departmentId: id.nullable().optional(),
                jobTitleId: id.nullable().optional(),
                managerId: id.nullable().optional(),
              })
              .strict(),
          })
          .strict()
          .parse(req.body);
        if (input.action !== 'TRANSFER' && Object.keys(input.payload).length)
          throw Error('STAFF_CHANGE_INVALID');
        res.status(201).json({ data: await owner.request(input, context(req)) });
      }),
    );
    router.post(
      '/changes/:id/approve',
      run(async (req, res) => {
        const input = z.object({ version }).strict().parse(req.body);
        await owner.approve(id.parse(req.params.id), input.version, context(req));
        res.json({ data: { approved: true } });
      }),
    );
    router.post(
      '/changes/:id/apply',
      run(async (req, res) => {
        const input = z.object({ version }).strict().parse(req.body);
        res.json({ data: await owner.apply(id.parse(req.params.id), input.version, context(req)) });
      }),
    );
    router.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
      if (error instanceof z.ZodError)
        return void res.status(400).json({ error: { code: 'STAFF_INPUT_INVALID' } });
      const code = error instanceof Error ? error.message : '';
      if (!code.startsWith('STAFF_')) return next(error);
      const status = code.includes('NOT_READY')
        ? 503
        : code.includes('NOT_FOUND')
          ? 404
          : code.includes('DENIED') || code.includes('LAST_RECOVERY')
            ? 403
            : code.includes('CONFLICT') ||
                code.includes('REQUIRED') ||
                code.includes('PREREQUISITES')
              ? 409
              : 400;
      res.status(status).json({ error: { code } });
    });
    return router;
  }
}
