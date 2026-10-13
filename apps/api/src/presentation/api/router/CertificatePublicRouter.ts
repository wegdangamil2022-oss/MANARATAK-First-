import { createHash } from 'node:crypto';
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CertificateReadModelService } from '@manaratak/application';

export class CertificatePublicRouter {
  public static create(cradle: { certificateReadModelService: CertificateReadModelService;
    certificateVerificationPolicy?:{read():Promise<{ipPerMinute:number;codePerMinute:number}>};
    certificateVerificationRateLimiter?:{consume(key:string,limit:number,windowMs:number):Promise<{allowed:boolean}>}|null;
    certificateVerificationDistributedRequired?:boolean;
  }): Router {
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
      res.setHeader('Cache-Control','no-store');
      const verificationCode = codeSchema.parse(req.params.verificationCode);
      const digest = (value: string) => createHash('sha256').update(value).digest('hex');
      const policy=await cradle.certificateVerificationPolicy?.read() ?? {ipPerMinute:60,codePerMinute:120};
      const ip=`ip:${digest(req.ip ?? req.socket.remoteAddress ?? 'unknown')}`,code=`code:${digest(verificationCode)}`;
      if(cradle.certificateVerificationDistributedRequired && !cradle.certificateVerificationRateLimiter)return res.status(503).json({error:'CERTIFICATE_VERIFICATION_BUDGET_UNAVAILABLE'});
      let allowed:boolean;
      if(cradle.certificateVerificationRateLimiter) {
        try {const first=await cradle.certificateVerificationRateLimiter.consume(ip,policy.ipPerMinute,60000);
          allowed=first.allowed && (await cradle.certificateVerificationRateLimiter.consume(code,policy.codePerMinute,60000)).allowed;
        }catch{return res.status(503).json({error:'CERTIFICATE_VERIFICATION_BUDGET_UNAVAILABLE'});}
      }else allowed=take(ip,policy.ipPerMinute) && take(code,policy.codePerMinute);
      if (!allowed) {
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
