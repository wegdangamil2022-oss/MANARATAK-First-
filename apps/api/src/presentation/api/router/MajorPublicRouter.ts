import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { LocalizedPublicMajorUseCases } from '@manaratak/application';
import { IMajorRepository } from '@manaratak/domain';
import { localeQuerySchema, parseRequestLocale, toApiValidationErrorPayload } from '../locale/LocaleQueryContract.js';

export class MajorPublicRouter {
  public static create(cradle: { majorRepository: IMajorRepository }): Router {
    const router = Router();
    const localized = new LocalizedPublicMajorUseCases(cradle.majorRepository);
    const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res, next)).catch(next);

    const listQuerySchema = z.object({
      degreeLevel: z.string().optional(),
      academicFieldOrDiscipline: z.string().optional(),
      collegeOrFaculty: z.string().optional(),
      cursor: z.string().trim().min(1).max(2048).optional(),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    }).merge(localeQuerySchema);

    router.get('/', asyncHandler(async (req: Request, res: Response) => {
      const { locale, ...filters } = listQuerySchema.parse(req.query);
      res.json(await localized.listMajors(filters, locale));
    }));

    router.get('/:slug', asyncHandler(async (req: Request, res: Response) => {
      try {
        res.json(await localized.getMajor(req.params.slug, parseRequestLocale(req.query)));
      } catch (err: any) {
        if (err.message === 'Major not found') return res.status(404).json({ error: 'Not found' });
        throw err;
      }
    }));

    router.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      if (err instanceof z.ZodError) return res.status(400).json(toApiValidationErrorPayload(err));
      res.status(500).json({ error: 'Internal Server Error' });
    });
    return router;
  }
}
