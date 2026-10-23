import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import type { AuthorizationEvaluatorService, IServiceRequestRepository } from '@manaratak/domain';
import type {
  ExecutiveDashboardUseCases,
  PublicAnalyticsUseCases,
  ManagedApplicationEvidenceUseCases,
} from '@manaratak/application';
import { MANAGED_APPLICATION_EVENTS, PUBLIC_PAGE_KEYS } from '@manaratak/shared';

type Evaluator = Pick<AuthorizationEvaluatorService, 'evaluatePermission'>;
const run =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    void fn(req, res).catch(next);
  };
const errors = (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof z.ZodError)
    return res.status(400).json({ error: { code: 'DASHBOARD_INPUT_INVALID' } });
  const code = error instanceof Error ? error.message : '';
  if (code === 'DASHBOARD_AUTH_REQUIRED') return res.status(401).json({ error: { code } });
  if (code === 'DASHBOARD_FORBIDDEN') return res.status(403).json({ error: { code } });
  if (/^(ANALYTICS_|MANAGED_|APPLICATION_|SERVICE_)/.test(code) && /^[A-Z_]+$/.test(code)) {
    return res
      .status(
        code.includes('POLICY_NOT_APPROVED')
          ? 503
          : code.includes('CONFLICT') || code.includes('ALREADY')
            ? 409
            : code.includes('CONSENT_REQUIRED')
              ? 403
              : 422,
      )
      .json({ error: { code } });
  }
  return res.status(503).json({ error: { code: 'DASHBOARD_SOURCE_UNAVAILABLE' } });
};
async function permit(req: Request, evaluator: Evaluator, permission: string, resourceId?: string) {
  if (!req.authUserId) throw new Error('DASHBOARD_AUTH_REQUIRED');
  if (
    !(
      await evaluator.evaluatePermission(req.authUserId, permission, {
        requestTime: new Date(),
        resourceId,
        targetId: resourceId,
      })
    ).isGranted
  )
    throw new Error('DASHBOARD_FORBIDDEN');
}
export function createExecutiveDashboardRouter(
  useCases: ExecutiveDashboardUseCases,
  evaluator: Evaluator,
) {
  const router = Router();
  router.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  for (const [path, permission, read] of [
    ['users', 'admin:dashboard:users:view', (days: number) => useCases.users(days)],
    ['traffic', 'admin:dashboard:analytics:view', (days: number) => useCases.traffic(days)],
    [
      'applications',
      'admin:dashboard:applications:view',
      (days: number) => useCases.applications(days),
    ],
  ] as const)
    router.get(
      '/' + path,
      run(async (req, res) => {
        await permit(req, evaluator, permission);
        const { days } = z
          .object({
            days: z.coerce
              .number()
              .refine((value) => [7, 30, 90, 365].includes(value))
              .default(30),
          })
          .strict()
          .parse(req.query);
        res.json(await read(days));
      }),
    );
  router.use(errors);
  return router;
}
export function createPublicAnalyticsRouter(useCases: PublicAnalyticsUseCases) {
  const router = Router();
  router.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  router.get('/configuration', (_req, res) => {
    res.json(useCases.configuration());
  });
  router.post(
    '/consent',
    run(async (req, res) => {
      const input = z
        .object({ policyVersion: z.string().max(80), consent: z.literal(true) })
        .strict()
        .parse(req.body);
      res.status(201).json(await useCases.grant(input.policyVersion, input.consent));
    }),
  );
  router.post(
    '/events',
    run(async (req, res) => {
      const { token, ...event } = z
        .object({
          token: z.string().regex(/^[a-f0-9]{64}$/),
          eventId: z.string().uuid(),
          kind: z.enum(['page_view', 'application_outbound_click']),
          pageKey: z.enum(PUBLIC_PAGE_KEYS),
          opportunityId: z.string().trim().min(1).max(240).optional(),
        })
        .strict()
        .refine((value) =>
          value.kind === 'application_outbound_click'
            ? Boolean(value.opportunityId)
            : !value.opportunityId,
        )
        .parse(req.body);
      const bot =
        /bot|crawler|spider|headless|slurp|preview|lighthouse|selenium|playwright/i.test(
          req.get('user-agent') ?? '',
        ) ||
        req.get('dnt') === '1' ||
        req.get('sec-gpc') === '1';
      res.status(202).json(await useCases.record(token, event, bot));
    }),
  );
  router.post(
    '/withdraw',
    run(async (req, res) => {
      const { token } = z
        .object({ token: z.string().regex(/^[a-f0-9]{64}$/) })
        .strict()
        .parse(req.body);
      await useCases.withdraw(token);
      res.sendStatus(204);
    }),
  );
  router.use(errors);
  return router;
}
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
