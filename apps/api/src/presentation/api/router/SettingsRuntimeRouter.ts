import { Router, Request, Response, NextFunction } from 'express';
import { ResolveConfigurationUseCase } from '@manaratak/application';
import { ResponseFormatter } from '../response/ResponseFormatter.js';
import { z } from 'zod';

export class SettingsRuntimeRouter {
  public static create({ resolveConfigurationUseCase }: { resolveConfigurationUseCase: ResolveConfigurationUseCase }): Router {
    const router = Router();
    const responseFormatter = new ResponseFormatter('v1');
    const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res, next)).catch(next);

    const resolveQuerySchema = z.object({
      identityId: z.string().min(1).optional(),
      tenantId: z.string().min(1).optional(),
      domainId: z.string().min(1).optional(),
    });

    router.get('/resolve/:key', asyncHandler(async (req: Request, res: Response) => {
      const context = resolveQuerySchema.parse(req.query);
      const value = await resolveConfigurationUseCase.resolveSetting(req.params.key, context);
      res.status(200).json(responseFormatter.success({ value }));
    }));

    router.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      if (err instanceof z.ZodError) {
        return res.status(400).json(responseFormatter.error({ code: 'VALIDATION_ERROR', message: 'Validation Error', details: { issues: err.issues } }));
      }
      res.status(400).json(responseFormatter.error({ code: 'RESOLUTION_ERROR', message: err.message || 'An error occurred' }));
    });

    return router;
  }
}
