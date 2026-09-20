import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { LocalizedInternationalTestPublicUseCases } from '@manaratak/application';
import { IInternationalTestRepository, InternationalTestCategory, InternationalTestCompletenessStatus } from '@manaratak/domain';
import { localeQuerySchema, parseRequestLocale, toApiValidationErrorPayload } from '../locale/LocaleQueryContract.js';

export class InternationalTestPublicRouter {
  public static create(cradle: { internationalTestRepository: IInternationalTestRepository }): Router {
    const router = Router();
    const localized = new LocalizedInternationalTestPublicUseCases(cradle.internationalTestRepository);
    const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res, next)).catch(next);

    const querySchema = z.object({
      completenessStatus: z.nativeEnum(InternationalTestCompletenessStatus).optional(),
      testCategory: z.nativeEnum(InternationalTestCategory).optional(),
      providerName: z.string().optional(),
      page: z.coerce.number().int().min(1).max(1000000).default(1),
      pageSize: z.coerce.number().int().min(1).max(50).default(20),
    }).merge(localeQuerySchema);

    router.get('/', asyncHandler(async (req: Request, res: Response) => {
      const { locale, ...filters } = querySchema.parse(req.query);
      res.json(await localized.listPublished(filters, locale));
    }));

    router.get('/:slug', asyncHandler(async (req: Request, res: Response) => {
      res.json(await localized.getPublishedBySlug(req.params.slug, parseRequestLocale(req.query)));
    }));

    router.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
      if (err instanceof z.ZodError) return res.status(400).json(toApiValidationErrorPayload(err));
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('not found')) return res.status(404).json({ error: 'Not found' });
      next(err);
    });
    return router;
  }
}
