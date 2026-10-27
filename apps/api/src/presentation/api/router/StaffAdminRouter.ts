import { Router, type Request } from 'express';
import { z } from 'zod';
import type { StaffWorkspaceUseCases } from '@manaratak/application';
import { ResponseFormatter } from '../response/ResponseFormatter.js';

const id = z.string().uuid();
const text = z.string().trim().min(1).max(240);
const reason = z.string().trim().min(3).max(1000);
const paging = {
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: id.optional(),
};
export class StaffAdminRouter {
  static create({
    staffWorkspaceUseCases: owner,
  }: {
    staffWorkspaceUseCases: StaffWorkspaceUseCases;
  }): Router {
    const router = Router(),
      formatter = new ResponseFormatter('v1');
    const context = (req: Request) => {
      if (!req.authUserId) throw Error('AUTHENTICATED_ADMIN_ACTOR_REQUIRED');
      return {
        actorId: req.authUserId,
        source: 'admin-staff-api',
        correlationId: req.header('x-correlation-id'),
      };
    };
    router.get('/readiness', async (_req, res, next) => {
      try {
        res.setHeader('Cache-Control', 'no-store');
        res.json(formatter.success(await owner.readiness()));
      } catch (error) {
        next(error);
      }
    });
    router.get('/organization', async (_req, res, next) => {
      try {
        res.json(formatter.success(await owner.organization()));
      } catch (error) {
        next(error);
      }
    });
    router.get('/events', async (req, res, next) => {
      try {
        res.json(
          formatter.success(
            await owner.events(
              z
                .object({ ...paging, membershipId: id.optional() })
                .strict()
                .parse(req.query),
            ),
          ),
        );
      } catch (error) {
        next(error);
      }
    });
    router.get('/members', async (req, res, next) => {
      try {
        res.json(
          formatter.success(
            await owner.list(
              z
                .object({
                  ...paging,
                  search: z.string().trim().max(240).optional(),
                  status: z.enum(['DRAFT', 'CANCELLED', 'ACTIVE', 'SUSPENDED', 'ENDED']).optional(),
                  departmentId: id.optional(),
                })
                .strict()
                .parse(req.query),
            ),
          ),
        );
      } catch (error) {
        next(error);
      }
    });
    router.get('/members/:id', async (req, res, next) => {
      try {
        res.json(formatter.success(await owner.get(id.parse(req.params.id))));
      } catch (error) {
        next(error);
      }
    });
    router.post('/members', async (req, res, next) => {
      try {
        const input = z
          .object({
            id,
            identityId: z.string().min(1).max(240).optional(),
            displayName: text.optional(),
            email: z.string().trim().email().max(320).optional(),
            kind: z.enum(['EMPLOYEE', 'CONTRACTOR', 'VOLUNTEER', 'SERVICE']),
            departmentId: id.optional(),
            jobTitleId: id.optional(),
            managerId: id.optional(),
            startsAt: z.string().datetime().optional(),
            endsAt: z.string().datetime().optional(),
            reason,
          })
          .strict()
          .parse(req.body);
        res.status(201).json(formatter.success(await owner.createDraft(input, context(req))));
      } catch (error) {
        next(error);
      }
    });
    router.post('/members/:id/cancel', async (req, res, next) => {
      try {
        const body = z
          .object({ version: z.number().int().positive(), reason })
          .strict()
          .parse(req.body);
        res.json(
          formatter.success(
            await owner.cancelDraft(
              id.parse(req.params.id),
              body.version,
              body.reason,
              context(req),
            ),
          ),
        );
      } catch (error) {
        next(error);
      }
    });
    router.post('/departments', async (req, res, next) => {
      try {
        const { reason: why, ...body } = z
          .object({
            id,
            name: text,
            parentId: id.optional(),
            version: z.number().int().positive().optional(),
            reason,
          })
          .strict()
          .parse(req.body);
        res.json(formatter.success(await owner.department(body, why, context(req))));
      } catch (error) {
        next(error);
      }
    });
    router.post('/titles', async (req, res, next) => {
      try {
        const { reason: why, ...body } = z
          .object({
            id,
            name: text,
            description: z.string().trim().min(3).max(1000),
            departmentId: id.optional(),
            version: z.number().int().positive().optional(),
            reason,
          })
          .strict()
          .parse(req.body);
        res.json(formatter.success(await owner.title(body, why, context(req))));
      } catch (error) {
        next(error);
      }
    });
    router.use(
      (
        error: unknown,
        _req: Request,
        res: import('express').Response,
        _next: import('express').NextFunction,
      ) => {
        const failure = error as { message?: string; name?: string; code?: string };
        const code = failure.message ?? '';
        const conflict =
          code === 'STAFF_SCHEMA_NOT_READY' ||
          code === 'STAFF_STALE_OR_NOT_DRAFT' ||
          ['P2002', 'P2003', 'P2034'].includes(failure.code ?? '');
        const status = conflict
          ? 409
          : code === 'STAFF_NOT_FOUND'
            ? 404
            : failure.name === 'ZodError' ||
                /^STAFF_(?:.*INVALID|.*MISMATCH|.*CYCLE|.*REQUIRED|.*NOT_ELIGIBLE)$/.test(code)
              ? 400
              : 503;
        res.status(status).json(
          formatter.error({
            code:
              failure.name === 'ZodError'
                ? 'VALIDATION_ERROR'
                : code.startsWith('STAFF_')
                  ? code
                  : conflict
                    ? 'STAFF_WRITE_CONFLICT'
                    : 'STAFF_UNAVAILABLE',
            message: status === 503 ? 'Staff workspace is unavailable' : code,
          }),
        );
      },
    );
    router.use((_req, res) =>
      res.status(404).json(
        formatter.error({
          code: 'STAFF_OPERATION_NOT_AVAILABLE',
          message:
            'Only draft and organization operations are available; invitations, activation and offboarding require approved owner contracts.',
        }),
      ),
    );
    return router;
  }
}
