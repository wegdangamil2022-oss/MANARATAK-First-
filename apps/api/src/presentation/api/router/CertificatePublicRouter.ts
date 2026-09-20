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

    const codeSchema = z.string().min(4).max(80);

    router.get('/verify/:verificationCode', asyncHandler(async (req: Request, res: Response) => {
      const verificationCode = codeSchema.parse(req.params.verificationCode);
      res.json(await certificateReadModelService.verifyPublic(verificationCode));
    }));

    router.use((err: any, req: Request, res: Response, next: NextFunction) => {
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
