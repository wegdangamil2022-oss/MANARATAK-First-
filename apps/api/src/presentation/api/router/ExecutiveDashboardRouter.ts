import { Router } from 'express';
import { z } from 'zod';
import { run, errors, permit, type Evaluator } from './ExecutiveDashboardBoundary.js';
import type { ExecutiveDashboardUseCases } from '@manaratak/application';
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
export class ExecutiveDashboardRouter {
  static create = createExecutiveDashboardRouter;
}
