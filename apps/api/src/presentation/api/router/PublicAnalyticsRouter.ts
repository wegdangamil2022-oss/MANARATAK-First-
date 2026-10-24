import { Router } from 'express';
import { z } from 'zod';
import { run, errors } from './ExecutiveDashboardBoundary.js';
import type { PublicAnalyticsUseCases } from '@manaratak/application';
import { PUBLIC_PAGE_KEYS } from '@manaratak/shared';
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
