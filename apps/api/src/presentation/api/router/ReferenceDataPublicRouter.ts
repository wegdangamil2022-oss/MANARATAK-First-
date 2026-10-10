import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { referenceDataQueryShape, cityReferenceDataQueryShape } from './ReferenceDataQueryContract.js';
import { LocalizedPublicUniversityUseCases, LocalizedReferenceDataQueries, ReferenceDataNotFoundError } from '@manaratak/application';
import { IReferenceDataRepository, IUniversityRepository } from '@manaratak/domain';
import { localeQuerySchema, parseRequestLocale, toApiValidationErrorPayload } from '../locale/LocaleQueryContract.js';

export class ReferenceDataPublicRouter {
  public static create(cradle: { referenceDataRepository: IReferenceDataRepository; universityRepository: IUniversityRepository }): Router {
    const router = Router();
    const localized = new LocalizedReferenceDataQueries(cradle.referenceDataRepository);
    const universities = new LocalizedPublicUniversityUseCases(cradle.universityRepository);
    const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res, next)).catch(next);

    const querySchema = z.object(referenceDataQueryShape).merge(localeQuerySchema).strict();
    const cityQuerySchema = z.object(cityReferenceDataQueryShape).merge(localeQuerySchema).strict();

    router.get('/countries', asyncHandler(async (req: Request, res: Response) => {
      const { locale, ...filters } = querySchema.parse(req.query);
      res.json({ data: await localized.listCountries(filters, locale) });
    }));
    router.get('/countries/:iso2Code', asyncHandler(async (req: Request, res: Response) => {
      res.json(await localized.getCountry(req.params.iso2Code, parseRequestLocale(req.query)));
    }));
    router.get('/countries/:iso2Code/universities', asyncHandler(async (req: Request, res: Response) => {
      const country = await cradle.referenceDataRepository.getCountry(req.params.iso2Code.toUpperCase());
      if (!country || country.lifecycleState !== 'ACTIVE') return res.status(404).json({ error: 'Country not found' });
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
      const { locale, ...filters } = cityQuerySchema.parse(req.query);
      const page = filters.page ?? 1;
      const pageSize = filters.pageSize ?? 50;
      const bounded = { ...filters, page, pageSize };
      const [data, total] = await Promise.all([
        localized.listCities(bounded, locale),
        cradle.referenceDataRepository.countRecords('cities', { ...bounded, activeOnly: true }),
      ]);
      res.json({ data, page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
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
