import { Router } from 'express';
import { z } from 'zod';
import { run, errors, permit, type Evaluator } from './ExecutiveDashboardBoundary.js';
import type { IServiceRequestRepository } from '@manaratak/domain';
import type { ManagedApplicationEvidenceUseCases } from '@manaratak/application';
import { MANAGED_APPLICATION_EVENTS } from '@manaratak/shared';
export function createManagedApplicationEvidenceRouter(
  useCases: ManagedApplicationEvidenceUseCases,
  evaluator: Evaluator,
  requests: IServiceRequestRepository,
) {
  const router = Router();
  router.get(
    '/requests/:requestId/application-evidence/assets',
    run(async (req, res) => {
      const requestId = z.string().uuid().parse(req.params.requestId);
      await permit(req, evaluator, 'admin:services:manage', requestId);
      await permit(req, evaluator, 'admin:services:applications:verify', requestId);
      const request = await requests.findRequestById(requestId);
      const all = (
        await evaluator.evaluatePermission(req.authUserId!, 'admin:services:requests:all', {
          requestTime: new Date(),
          resourceId: requestId,
        })
      ).isGranted;
      if (!request || (!all && request.assignedStaffId !== req.authUserId))
        throw new Error('DASHBOARD_FORBIDDEN');
      const { after } = z.object({ after: z.string().uuid().optional() }).strict().parse(req.query);
      res.setHeader('Cache-Control', 'no-store');
      res.json(await useCases.evidenceAssets(req.authUserId!, after));
    }),
  );
  router.post(
    '/requests/:requestId/application-evidence',
    run(async (req, res) => {
      const requestId = z.string().uuid().parse(req.params.requestId);
      await permit(req, evaluator, 'admin:services:manage', requestId);
      await permit(req, evaluator, 'admin:services:requests:fulfill', requestId);
      const request = await requests.findRequestById(requestId);
      const all = (
        await evaluator.evaluatePermission(req.authUserId!, 'admin:services:requests:all', {
          requestTime: new Date(),
          resourceId: requestId,
        })
      ).isGranted;
      if (!request || (!all && request.assignedStaffId !== req.authUserId))
        throw new Error('DASHBOARD_FORBIDDEN');
      const body = z
        .object({
          kind: z.enum(MANAGED_APPLICATION_EVENTS),
          evidenceAssetId: z.string().uuid().nullable().default(null),
          expectedVersion: z.number().int().positive(),
        })
        .strict()
        .parse(req.body);
      if (['UNIVERSITY_SUBMITTED', 'ADMISSION_ACCEPTED', 'ADMISSION_REJECTED'].includes(body.kind))
        await permit(req, evaluator, 'admin:services:applications:verify', requestId);
      const key = z
        .string()
        .min(8)
        .max(160)
        .regex(/^[A-Za-z0-9._:-]+$/)
        .parse(req.get('idempotency-key'));
      res
        .status(201)
        .json(await useCases.append({ ...body, requestId, actorId: req.authUserId!, key }));
    }),
  );
  router.use(errors);
  return router;
}

export class ManagedApplicationEvidenceRouter {
  static create = createManagedApplicationEvidenceRouter;
}
