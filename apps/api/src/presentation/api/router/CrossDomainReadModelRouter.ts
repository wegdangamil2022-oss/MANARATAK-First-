import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CrossDomainGraphReadService } from '@manaratak/application';

export class CrossDomainReadModelRouter {
  public static create(cradle: { crossDomainGraphReadService: CrossDomainGraphReadService }): Router {
    const router = Router();
    const { crossDomainGraphReadService } = cradle;
    const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) =>
      Promise.resolve(fn(req, res, next)).catch(next);

    const paginationSchema = z.object({
  locale: z.enum(['ar', 'en']).default('ar'),
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(50).default(12),
    }).strict();

    router.get('/majors/:slug', asyncHandler(async (req: Request, res: Response) => {
      res.json(await crossDomainGraphReadService.getMajorGraphBySlug(req.params.slug, paginationSchema.parse(req.query)));
    }));

    router.get('/universities/:slug', asyncHandler(async (req: Request, res: Response) => {
      res.json(await crossDomainGraphReadService.getUniversityGraphBySlug(req.params.slug, paginationSchema.parse(req.query)));
    }));

    router.get('/scholarships/:slug', asyncHandler(async (req: Request, res: Response) => {
      res.json(await crossDomainGraphReadService.getScholarshipGraphBySlug(req.params.slug, paginationSchema.parse(req.query)));
    }));

    router.get('/countries/:iso2Code', asyncHandler(async (req: Request, res: Response) => {
      res.json(await crossDomainGraphReadService.getCountryGraphByIso2Code(req.params.iso2Code, paginationSchema.parse(req.query)));
    }));

    router.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation Error', details: err.issues });
      }
      if (err instanceof Error && ['Major not found', 'University not found', 'Scholarship not found', 'Country not found'].includes(err.message)) {
        return res.status(404).json({ error: 'Not found' });
      }
      return next(err);
    });

    return router;
  }
}
