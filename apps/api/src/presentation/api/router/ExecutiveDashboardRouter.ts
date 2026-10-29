import { Router } from 'express';
import { z } from 'zod';
import { run, errors, permit, type Evaluator } from './ExecutiveDashboardBoundary.js';
import type { ExecutiveDashboardUseCases } from '@manaratak/application';
export const catalogPermissions = {
  universities: 'admin:universities:manage', scholarships: 'admin:scholarships:manage',
  majors: 'admin:majors:manage', courses: 'admin:courses:manage',
  tests: 'admin:international-tests:manage', careers: 'admin:careers:manage', cms: 'admin:cms:view',
} as const;
type CatalogKey = keyof typeof catalogPermissions;
export type DashboardCatalogReaders = Record<CatalogKey, () => Promise<{ total: number }>>;
export function createExecutiveDashboardRouter(
  useCases: ExecutiveDashboardUseCases,
  evaluator: Evaluator & Partial<Pick<import('@manaratak/domain').AuthorizationEvaluatorService, 'evaluatePermissions'>>,
  catalogs?: DashboardCatalogReaders,
) {
  const router = Router();
  router.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  router.get('/catalogs', run(async (req, res) => {
    if (!req.authUserId) throw new Error('DASHBOARD_AUTH_REQUIRED');
    const { keys } = z.object({ keys: z.string().max(120).transform(value => [...new Set(value.split(','))])
      .pipe(z.array(z.enum(['universities','scholarships','majors','courses','tests','careers','cms'])).min(1).max(7)) }).strict().parse(req.query);
    const permissions = keys.map(key => catalogPermissions[key]);
    const context = { requestTime: new Date(), ip: req.ip || req.socket?.remoteAddress || undefined,
      userAgent: req.headers['user-agent'], correlationId: req.headers['x-correlation-id'] };
    const decisions = evaluator.evaluatePermissions
      ? await evaluator.evaluatePermissions(req.authUserId, permissions, context)
      : await Promise.all(permissions.map(permission => evaluator.evaluatePermission(req.authUserId!, permission, context)));
    const results = await Promise.all(keys.map(async (key, index) => {
      if (!decisions[index]?.isGranted) return [key, { state: 'forbidden' }];
      try {
        if (!catalogs) throw new Error('CATALOG_READER_UNAVAILABLE');
        // Reuse the owner use case and its exact denominator, rather than inventing a dashboard count.
        const { total } = await catalogs[key]();
        if (!Number.isSafeInteger(total) || total < 0) throw new Error('DASHBOARD_COUNT_INVALID');
        return [key, { state: 'available', total }];
      } catch { return [key, { state: 'unavailable' }]; }
    }));
    res.json({ sources: Object.fromEntries(results) });
  }));
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
export class ExecutiveDashboardRouter {
  static create = createExecutiveDashboardRouter;
}
