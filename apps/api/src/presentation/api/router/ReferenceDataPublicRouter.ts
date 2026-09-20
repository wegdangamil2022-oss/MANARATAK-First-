import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { LocalizedPublicUniversityUseCases, LocalizedReferenceDataQueries, ReferenceDataNotFoundError } from '@manaratak/application';
import { IReferenceDataRepository, IUniversityRepository } from '@manaratak/domain';
import { localeQuerySchema, parseRequestLocale, toApiValidationErrorPayload } from '../locale/LocaleQueryContract.js';

export class ReferenceDataPublicRouter {
  public static create(cradle: { referenceDataRepository: IReferenceDataRepository; universityRepository: IUniversityRepository }): Router {
    const router = Router();
    const localized = new LocalizedReferenceDataQueries(cradle.referenceDataRepository);
    const universities = new LocalizedPublicUniversityUseCases(cradle.universityRepository);
    const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res, next)).catch(next);

    const querySchema = z.object({
      region: z.string().optional(),
      countryIso2Code: z.string().optional(),
      q: z.string().optional(),
      page: z.coerce.number().int().min(1).optional(),
      pageSize: z.coerce.number().int().min(1).max(100).optional(),
    }).merge(localeQuerySchema);

    router.get('/countries', asyncHandler(async (req: Request, res: Response) => {
      const { locale, ...filters } = querySchema.parse(req.query);
      res.json({ data: await localized.listCountries(filters, locale) });
    }));
    router.get('/countries/:iso2Code', asyncHandler(async (req: Request, res: Response) => {
      res.json(await localized.getCountry(req.params.iso2Code, parseRequestLocale(req.query)));
    }));
    router.get('/countries/:iso2Code/universities', asyncHandler(async (req: Request, res: Response) => {
      const country = await cradle.referenceDataRepository.getCountry(req.params.iso2Code.toUpperCase());
      if (!country) return res.status(404).json({ error: 'Country not found' });
      res.json(await universities.listUniversities({ countryReferenceId: country.id }, parseRequestLocale(req.query)));
    }));
    router.get('/currencies', asyncHandler(async (req: Request, res: Response) => {
      const { locale, ...filters } = querySchema.parse(req.query);
      res.json({ data: await localized.listCurrencies(filters, locale) });
    }));
    router.get('/languages', asyncHandler(async (req: Request, res: Response) => {
      const { locale, ...filters } = querySchema.parse(req.query);
      res.json({ data: await localized.listLanguages(filters, locale) });
    }));
    router.get('/regions', asyncHandler(async (req: Request, res: Response) => {
      const { locale, ...filters } = querySchema.parse(req.query);
      res.json({ data: await localized.listRegions(filters, locale) });
    }));
    router.get('/cities', asyncHandler(async (req: Request, res: Response) => {
      const { locale, ...filters } = querySchema.parse(req.query);
      res.json({ data: await localized.listCities(filters, locale) });
    }));

    router.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
      if (err instanceof z.ZodError) return res.status(400).json(toApiValidationErrorPayload(err));
      if (err instanceof ReferenceDataNotFoundError) {
        return res.status(404).json({ error: err.code, entityType: err.entityType, reference: err.reference });
      }
      return next(err);
    });
    return router;
  }
}
