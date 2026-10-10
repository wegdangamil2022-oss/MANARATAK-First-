import { createHash } from 'node:crypto';
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CertificateReadModelService } from '@manaratak/application';

export class CertificatePublicRouter {
  public static create(cradle: { certificateReadModelService: CertificateReadModelService }): Router {
    const router = Router();
    const { certificateReadModelService } = cradle;

    const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };

    const budget = new Map<string, { count: number; until: number }>();
    const take = (key: string, limit: number): boolean => {
      const now = Date.now();
      if (budget.size >= 5000) for (const [k, value] of budget) if (value.until <= now) budget.delete(k);
      const current = budget.get(key);
      if (!current || current.until <= now) {
        if (!current && budget.size >= 5000) return false;
        budget.set(key, {count:1,until:now+60000}); return true;
      }
      if (current.count >= limit) return false;
      current.count++; return true;
    };
    const codeSchema = z.string().min(4).max(80);

    router.get('/verify/:verificationCode', asyncHandler(async (req: Request, res: Response) => {
      const verificationCode = codeSchema.parse(req.params.verificationCode);
      const digest = (value: string) => createHash('sha256').update(value).digest('hex');
      if (!take(`ip:${digest(req.ip ?? req.socket.remoteAddress ?? 'unknown')}`, 60) || !take(`code:${digest(verificationCode)}`, 120)) {
        res.setHeader('Retry-After', '60'); return res.status(429).json({error:'CERTIFICATE_VERIFICATION_RATE_LIMITED'});
      }
      res.setHeader('Cache-Control', 'no-store');
      res.json(await certificateReadModelService.verifyPublic(verificationCode));
    }));

    router.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation Error', details: err.issues });
      }
      if (err instanceof Error && err.message === 'Certificate not found') {
        return res.status(404).json({ error: 'Not found' });
      }
      res.status(500).json({ error: 'CERTIFICATE_VERIFICATION_FAILED' });
    });

    return router;
  }
}
