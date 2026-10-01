import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { CourseProviderRegistryError, ExternalCourseProviderStatus } from '@manaratak/domain';
import { CourseProviderRegistryUseCases } from '@manaratak/application';

export class CourseProviderRegistryRouter {
  static create({ courseProviderRegistryUseCases: useCases }: { courseProviderRegistryUseCases: CourseProviderRegistryUseCases }): Router {
    const router = Router();
    const asyncHandler = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => { Promise.resolve(fn(req, res)).catch(next); };
    const querySchema = z.object({ page: z.coerce.number().int().min(1).max(1_000_000).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(50), q: z.string().trim().max(300).optional(), status: z.nativeEnum(ExternalCourseProviderStatus).optional() }).strict();
    const bodySchema = z.object({ expectedUpdatedAt: z.string().datetime(), displayName: z.string().trim().min(1).max(300), officialWebsite: z.string().url().max(2000).nullable(), aliases: z.array(z.object({ alias: z.string().trim().min(1).max(300), locale: z.string().trim().min(2).max(35).optional() }).strict()).max(100), allowedDomains: z.array(z.string().trim().min(1).max(253)).max(50), mappingsReviewed: z.literal(true), reason: z.string().trim().min(1).max(1000), evidenceReference: z.string().trim().min(1).max(300) }).strict();
    router.get('/', asyncHandler(async (req, res) => res.json(await useCases.list(querySchema.parse(req.query)))));
    router.post('/resolve-label', asyncHandler(async (req, res) => { const { label } = z.object({ label: z.string().min(1).max(300) }).strict().parse(req.body); res.json(await useCases.resolveLabel(label)); }));
    router.get('/:id', asyncHandler(async (req, res) => res.json(await useCases.get(z.string().uuid().parse(req.params.id)))));
    router.put('/:id', asyncHandler(async (req, res) => {
      if (!req.authUserId) return res.status(401).json({ error: 'AUTH_REQUIRED' });
      const id = z.string().uuid().parse(req.params.id); const body = bodySchema.parse(req.body);
      return res.json(await useCases.update(id, body, req.authUserId, req.header('X-Correlation-ID')));
    }));
    router.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
      if (err instanceof z.ZodError) return res.status(400).json({ error: 'VALIDATION_ERROR', details: err.issues });
      if (err instanceof CourseProviderRegistryError) return res.status(err.code === 'PROVIDER_NOT_FOUND' ? 404 : err.code === 'PROVIDER_MAPPING_INVALID' ? 422 : 409).json({ error: err.code });
      return next(err);
    });
    return router;
  }
}
