import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import type { AuthorizationEvaluatorService } from '@absheer/domain';
import type { TestDiscoveryOwnerUseCases } from '@absheer/application';
/** Mounted by the producing owner, never by Tests as a mutation authority. */
export function testDiscoveryOwnerRouter(
  useCases: TestDiscoveryOwnerUseCases,
  auth: AuthorizationEvaluatorService,
  permissions: { view: string; propose: string; review: string },
) {
  const router = Router({ mergeParams: true });
  router.use(async (req, res, next) => {
    if (!req.authUserId)
      return void res.status(401).json({ error: 'TEST_DISCOVERY_AUTH_REQUIRED' });
    const permission =
      req.method === 'GET'
        ? permissions.view
        : /\/approve\/?$/i.test(req.path)
          ? permissions.review
          : permissions.propose;
    try {
      const decision = await auth.evaluatePermission(req.authUserId, permission, {
        ip: req.ip,
        requestTime: new Date(),
      });
      if (!decision.isGranted)
        return void res.status(403).json({ error: 'TEST_DISCOVERY_PERMISSION_DENIED' });
      res.setHeader('Cache-Control', 'no-store');
      next();
    } catch {
      res.status(403).json({ error: 'TEST_DISCOVERY_PERMISSION_DENIED' });
    }
  });
  const safe =
    (fn: (req: Request, res: Response) => Promise<unknown>) =>
    (req: Request, res: Response, next: NextFunction) =>
      Promise.resolve(fn(req, res)).catch(next);
  const key = (req: Request) => z.string().trim().min(1).max(160).parse(req.params.ownerKey);
  const command = z
    .object({
      expectedVersion: z.number().int().min(1),
      reason: z.string().trim().min(3).max(2000),
    })
    .strict();
  router.get(
    '/',
    safe(async (req, res) => {
      const query = z
        .object({ after: z.string().trim().min(1).max(160).optional() })
        .strict()
        .parse(req.query);
      res.json({ data: await useCases.list(key(req), query.after) });
    }),
  );
  router.post(
    '/',
    safe(async (req, res) => {
      const body = command
        .extend({
          expectedVersion: z.number().int().min(0),
          testId: z.string().trim().min(1).max(160),
        })
        .parse(req.body);
      res.status(201).json({ data: await useCases.propose(key(req), body, req.authUserId!) });
    }),
  );
  for (const [action, status] of [
    ['approve', 'APPROVED'],
    ['revoke', 'REVOKED'],
  ] as const)
    router.post(
      `/:testId/${action}`,
      safe(async (req, res) => {
        const body = command.parse(req.body);
        res.json({
          data: await useCases.review(
            key(req),
            z.string().trim().min(1).max(160).parse(req.params.testId),
            { ...body, status },
            req.authUserId!,
          ),
        });
      }),
    );
  router.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof z.ZodError)
      return void res.status(400).json({ error: 'TEST_DISCOVERY_INVALID_INPUT' });
    const code = error instanceof Error ? error.message : 'TEST_DISCOVERY_UNAVAILABLE';
    if (code.includes('INDEPENDENT_REVIEW')) return void res.status(403).json({ error: code });
    if (
      code.includes('VERSION_CONFLICT') ||
      code.includes('REVIEW_STALE') ||
      (error as { code?: string })?.code === 'P2002'
    )
      return void res.status(409).json({ error: 'TEST_DISCOVERY_VERSION_CONFLICT' });
    if (code.startsWith('TEST_DISCOVERY_')) return void res.status(400).json({ error: code });
    res.status(503).json({ error: 'TEST_DISCOVERY_UNAVAILABLE' });
  });
  return router;
}
