import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PublicScholarshipUseCases } from '@manaratak/application';
import { parseRequestLocale, toApiValidationErrorPayload } from '../locale/LocaleQueryContract.js';

export class ScholarshipPublicRouter {
  public static create(cradle: { publicScholarshipUseCases: PublicScholarshipUseCases }): Router {
    const router = Router();
    const { publicScholarshipUseCases } = cradle;
    const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };

    const date = z.string().datetime({ offset: true }).transform((value) => new Date(value));
    const listQuerySchema = z.object({
      countryReferenceId: z.string().min(1).optional(),
      studyLanguageReferenceId: z.string().min(1).optional(),
      currencyReferenceId: z.string().min(1).optional(),
      degreeLevelId: z.string().min(1).optional(),
      majorId: z.string().min(1).optional(),
      internationalTestId: z.string().min(1).optional(),
      universityId: z.string().min(1).optional(),
      academicProgramId: z.string().min(1).optional(),
      fundingCoverage: z.string().min(1).optional(),
      sponsorName: z.string().min(1).optional(),
      applicationDeadlineFrom: date.optional(),
      applicationDeadlineTo: date.optional(),
      cursor: z.string().trim().min(1).max(2048).optional(),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    }).strict().refine((value) => !value.applicationDeadlineFrom || !value.applicationDeadlineTo || value.applicationDeadlineFrom <= value.applicationDeadlineTo, {
      message: 'applicationDeadlineFrom must be <= applicationDeadlineTo',
    });

    router.get('/', asyncHandler(async (req: Request, res: Response) => {
      const locale = parseRequestLocale(req.query);
      const { locale: _locale, ...query } = req.query;
      const filters = listQuerySchema.parse(query);
      res.json(await publicScholarshipUseCases.listScholarships(filters, locale));
    }));

    router.get('/:slug', asyncHandler(async (req: Request, res: Response) => {
      try {
        const locale = parseRequestLocale(req.query);
        res.json(await publicScholarshipUseCases.getScholarship(req.params.slug, locale));
      } catch (err: any) {
        if (err.message === 'Scholarship not found') return res.status(404).json({ error: 'Not found' });
        throw err;
      }
    }));

    router.use((err: any, req: Request, res: Response, next: NextFunction) => {
      if (err instanceof z.ZodError) return res.status(400).json(toApiValidationErrorPayload(err));
      res.status(500).json({ error: 'Internal Server Error' });
    });
    return router;
  }
}
