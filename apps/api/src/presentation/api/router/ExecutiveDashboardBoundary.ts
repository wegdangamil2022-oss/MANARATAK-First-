import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import type { AuthorizationEvaluatorService } from '@manaratak/domain';
export type Evaluator = Pick<AuthorizationEvaluatorService, 'evaluatePermission'>;
export const run =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    void fn(req, res).catch(next);
  };
export const errors = (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
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
export async function permit(
  req: Request,
  evaluator: Evaluator,
  permission: string,
  resourceId?: string,
) {
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
