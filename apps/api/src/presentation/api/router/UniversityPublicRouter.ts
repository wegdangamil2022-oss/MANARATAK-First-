import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { LocalizedPublicUniversityUseCases } from '@manaratak/application';
import { IReferenceDataRepository, IUniversityRepository, PublicUniversityFilters } from '@manaratak/domain';
import { localeQuerySchema, parseRequestLocale, toApiValidationErrorPayload } from '../locale/LocaleQueryContract.js';

export class UniversityPublicRouter {
  public static create(cradle: { universityRepository: IUniversityRepository; referenceDataRepository: IReferenceDataRepository }): Router {
    const router = Router();
    const localized = new LocalizedPublicUniversityUseCases(cradle.universityRepository);

    const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };

    const listQuerySchema = z.object({
      countryReferenceId: z.string().trim().min(1).optional(),
      countryIso2Code: z.string().trim().length(2).transform((value) => value.toUpperCase()).optional(),
      regionReferenceId: z.string().trim().min(1).optional(),
      cityReferenceId: z.string().trim().min(1).optional(),
      institutionType: z.string().optional(),
      majorId: z.string().trim().min(1).optional(),
      search: z.string().trim().min(1).max(200).optional(),
      cursor: z.string().trim().min(1).max(2048).optional(),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    }).merge(localeQuerySchema).strict();

    router.get('/', asyncHandler(async (req: Request, res: Response) => {
      const { locale, ...filters } = listQuerySchema.parse(req.query);
      let resolvedFilters: PublicUniversityFilters = filters;
      if (filters.countryIso2Code) {
        const country = await cradle.referenceDataRepository.getCountry(filters.countryIso2Code);
        if (!country) return res.status(400).json({ error: 'UNKNOWN_COUNTRY_FILTER' });
        if (filters.countryReferenceId && filters.countryReferenceId !== country.id) {
          return res.status(400).json({ error: 'COUNTRY_REFERENCE_CODE_MISMATCH' });
        }
        const { countryIso2Code: _countryIso2Code, ...rest } = filters;
        resolvedFilters = { ...rest, countryReferenceId: country.id };
      }
      res.json(await localized.listUniversities(resolvedFilters, locale));
    }));

    router.get('/:slug', asyncHandler(async (req: Request, res: Response) => {
      try {
        res.json(await localized.getUniversity(req.params.slug, parseRequestLocale(req.query)));
      } catch (err: any) {
        if (err.message === 'University not found') return res.status(404).json({ error: 'Not found' });
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
