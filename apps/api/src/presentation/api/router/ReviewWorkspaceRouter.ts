import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { reviewDomains, reviewReasons } from '@manaratak/shared';
import type { ReviewWorkspaceUseCases } from '@manaratak/application';

const choice = <const T extends [string, ...string[]]>(values: T) => z.enum(values).optional();
export const reviewWorkspaceQuery = z
  .object({
    search: z.string().trim().max(200).optional(),
    domain: z.enum(reviewDomains).optional(),
    reason: z.enum(reviewReasons).optional(),
    priority: choice(['critical', 'high', 'medium', 'low']),
    assignee: z.string().max(160).optional(),
    state: choice(['OPEN', 'WAITING_INFORMATION', 'REFERRED']),
    source: choice(['imported', 'manual', 'cms', 'unknown']),
    age: choice(['today', 'week', 'older', 'unknown']),
    locale: z.enum(['ar', 'en']).optional(),
    sort: choice(['priority', 'deadline', 'oldest', 'newest', 'domain', 'assignee']),
    view: choice([
      'all',
      'mine',
      'unassigned',
      'urgent',
      'overdue',
      'near_due',
      'ready',
      'translation',
      'source',
    ]),
    pageSize: z.coerce
      .number()
      .refine((value) => [10, 25, 50].includes(value))
      .optional(),
    cursor: z.string().max(2000).optional(),
    snapshot: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
  })
  .strict();
const commandSchema = z
  .object({
    key: z.string().min(3).max(500),
    version: z.number().int().min(1),
    ownerRevision: z.string().regex(/^[a-f0-9]{32}$/),
    idempotencyKey: z.string().min(16).max(120),
    action: z.enum(['claim', 'assign', 'priority', 'note', 'state']),
    assigneeId: z.string().min(1).max(100).nullable().optional(),
    teamId: z.string().min(1).max(100).nullable().optional(),
    priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
    note: z.string().trim().min(1).max(2000).optional(),
    state: z.enum(['OPEN', 'WAITING_INFORMATION', 'REFERRED']).optional(),
    reason: z.string().trim().min(5).max(500),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      (value.assigneeId && value.teamId) ||
      (value.action === 'priority' && !value.priority) ||
      (value.action === 'note' && !value.note) ||
      (value.action === 'state' && !value.state)
    )
      ctx.addIssue({ code: 'custom', message: 'Invalid command' });
  });
const run =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    void fn(req, res).catch(next);
  };
export function createReviewWorkspaceRouter(useCases: ReviewWorkspaceUseCases) {
  const router = Router();
  router.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  // Free text is POSTed to avoid retaining it in URLs and access logs. It is not
  // a content mutation, but it retains the admin session/CSRF boundary.
  router.post(
    '/query',
    run(async (req, res) =>
      res.json(await useCases.list(req.authUserId ?? '', reviewWorkspaceQuery.parse(req.body))),
    ),
  );
  router.get(
    '/cases',
    run(async (req, res) =>
      res.json(await useCases.list(req.authUserId ?? '', reviewWorkspaceQuery.parse(req.query))),
    ),
  );
  router.post(
    '/synchronize',
    run(async (req, res) => {
      const input = z
        .object({ domain: z.enum(reviewDomains).optional() })
        .strict()
        .parse(req.body);
      res.json(await useCases.synchronize(req.authUserId ?? '', input.domain));
    }),
  );
  router.post(
    '/commands',
    run(async (req, res) =>
      res.json(await useCases.command(req.authUserId ?? '', commandSchema.parse(req.body))),
    ),
  );
  router.post(
    '/bulk',
    run(async (req, res) => {
      const { commands } = z
        .object({ commands: z.array(commandSchema).min(1).max(25) })
        .strict()
        .parse(req.body);
      res.json(await useCases.bulk(req.authUserId ?? '', commands));
    }),
  );
  router.get(
    '/history',
    run(async (req, res) => {
      const { key } = z
        .object({ key: z.string().min(3).max(500) })
        .strict()
        .parse(req.query);
      res.json(await useCases.history(req.authUserId ?? '', key));
    }),
  );
  router.get(
    '/analytics',
    run(async (req, res) => {
      const { days } = z
        .object({
          days: z.coerce
            .number()
            .refine((v) => [7, 30, 90, 365].includes(v))
            .default(30),
        })
        .strict()
        .parse(req.query);
      res.json(await useCases.analytics(req.authUserId ?? '', days));
    }),
  );
  router.get(
    '/reviewers',
    run(async (req, res) => {
      const { domain } = z
        .object({ domain: z.enum(reviewDomains).optional() })
        .strict()
        .parse(req.query);
      res.json(await useCases.reviewers(req.authUserId ?? '', domain));
    }),
  );
  router.get(
    '/views',
    run(async (req, res) => res.json(await useCases.views(req.authUserId ?? ''))),
  );
  router.post(
    '/views',
    run(async (req, res) => {
      const input = z
        .object({
          name: z.string().trim().min(1).max(80),
          shared: z.boolean(),
          filters: reviewWorkspaceQuery.omit({ search: true, cursor: true, snapshot: true }),
        })
        .strict()
        .parse(req.body);
      res.json(await useCases.saveView(req.authUserId ?? '', input));
    }),
  );
  router.get(
    '/policies',
    run(async (req, res) => res.json(await useCases.policies(req.authUserId ?? ''))),
  );
  router.post(
    '/policies',
    run(async (req, res) => {
      const input = z
        .object({
          domain: z.enum(reviewDomains),
          version: z.number().int().min(0),
          hours: z.number().int().min(1).max(8760),
          warningHours: z.number().int().min(0),
          reason: z.string().trim().min(10).max(500),
        })
        .strict()
        .refine((v) => v.warningHours < v.hours)
        .parse(req.body);
      res.json(await useCases.approvePolicy(req.authUserId ?? '', input));
    }),
  );
  router.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof z.ZodError)
      return res.status(400).json({ error: { code: 'REVIEW_INPUT_INVALID' } });
    const code =
      error instanceof Error && /^REVIEW_[A-Z_]+$/.test(error.message)
        ? error.message
        : 'REVIEW_UNAVAILABLE';
    return res
      .status(
        code === 'REVIEW_AUTH_REQUIRED'
          ? 401
          : code.includes('FORBIDDEN')
            ? 403
            : code.includes('CONFLICT') || code.includes('CHANGED') || code.includes('ALREADY')
              ? 409
              : code.includes('INVALID')
                ? 400
                : 503,
      )
      .json({ error: { code } });
  });
  return router;
}
