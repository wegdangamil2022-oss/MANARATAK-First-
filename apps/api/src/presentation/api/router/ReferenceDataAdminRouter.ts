import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  ReferenceDataInvariantError,
  ReferenceDataNotFoundError,
  ReferenceDataUseCases,
  ReferenceDataValidationError,
} from '@manaratak/application';
import { ReferenceLifecycleState, type GovernedReferenceEntityType } from '@manaratak/domain';

export class ReferenceDataAdminRouter {
  public static create(cradle: { referenceDataUseCases: ReferenceDataUseCases }): Router {
    const router = Router();
    const { referenceDataUseCases } = cradle;

    const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };

    const mutationContext = (req: Request) => {
      if (!req.authUserId) throw new Error('AUTHENTICATED_ADMIN_ACTOR_REQUIRED');
      return {
        actorId: req.authUserId,
        actorType: 'IDENTITY',
        correlationId:
          (req.headers['x-correlation-id'] as string | undefined) ||
          (req.headers['x-request-id'] as string | undefined),
        source: 'admin-reference-data-api',
      };
    };

    const aliasSchema = z.object({
      alias: z.string().min(1).max(300),
      locale: z.string().min(2).max(35).nullable().optional(),
      aliasType: z.enum(['COMMON', 'HISTORIC', 'PROVIDER', 'TRANSLITERATION', 'OTHER']).optional(),
    }).strict();
    const providerMappingSchema = z.object({
      providerSystem: z.string().min(1).max(100),
      providerId: z.string().min(1).max(200),
    }).strict();
    const governanceFields = {
      aliases: z.array(aliasSchema).max(100).optional(),
      providerMappings: z.array(providerMappingSchema).max(100).optional(),
    };

    const countrySchema = z.object({
      iso2Code: z.string().regex(/^[A-Z]{2}$/),
      iso3Code: z.string().regex(/^[A-Z]{3}$/),
      name: z.string().min(1),
      nameAr: z.string().min(1).nullable().optional(),
      officialName: z.string().nullable().optional(),
      region: z.string().nullable().optional(),
      subregion: z.string().nullable().optional(),
      defaultCurrencyCode: z.string().nullable().optional(),
      defaultLanguageCode: z.string().nullable().optional(),
      callingCode: z.string().nullable().optional(),
      flagAssetId: z.string().nullable().optional(),
      ...governanceFields,
      metadata: z.record(z.string(), z.unknown()).optional(),
    }).strict();

    const currencySchema = z.object({
      isoCode: z.string().regex(/^[A-Z]{3}$/),
      numericCode: z.string().regex(/^\d{3}$/).nullable().optional(),
      name: z.string().min(1),
      nameAr: z.string().min(1).nullable().optional(),
      symbol: z.string().nullable().optional(),
      minorUnit: z.number().int().min(0).max(4).nullable().optional(),
      ...governanceFields,
      metadata: z.record(z.string(), z.unknown()).optional(),
    }).strict();

    const languageSchema = z.object({
      isoCode: z.string().regex(/^[a-z]{2,8}(-[a-z0-9]+)*$/),
      name: z.string().min(1),
      nameAr: z.string().min(1).nullable().optional(),
      nativeName: z.string().nullable().optional(),
      direction: z.enum(['LTR', 'RTL']),
      ...governanceFields,
      metadata: z.record(z.string(), z.unknown()).optional(),
    }).strict();

    const citySchema = z.object({
      countryIso2Code: z.string().regex(/^[A-Z]{2}$/),
      name: z.string().min(1),
      nameAr: z.string().min(1).nullable().optional(),
      region: z.string().nullable().optional(),
      timezone: z.string().nullable().optional(),
      latitude: z.number().min(-90).max(90).nullable().optional(),
      longitude: z.number().min(-180).max(180).nullable().optional(),
      administrativeRegionId: z.string().uuid().nullable().optional(),
      ...governanceFields,
      metadata: z.record(z.string(), z.unknown()).optional(),
    }).strict();

    const explicitBooleanQuery = z.preprocess((value) => {
      if (value === undefined) return undefined;
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true' || normalized === '1') return true;
        if (normalized === 'false' || normalized === '0') return false;
      }
      return value;
    }, z.boolean().optional());

    const querySchema = z.object({
      region: z.string().optional(),
      countryIso2Code: z.string().optional(),
      q: z.string().optional(),
      activeOnly: explicitBooleanQuery,
    }).strict();

    const countryImportPreviewSchema = z.object({
      sourceName: z.string().min(1).max(200),
      sourceVersion: z.string().min(1).max(100),
      sha256: z
        .string()
        .regex(/^[a-fA-F0-9]{64}$/)
        .optional(),
      records: z.array(z.record(z.string(), z.unknown())).min(1).max(500),
    }).strict();

    const countryUpdateBodySchema = countrySchema.omit({ iso2Code: true }).strict();
    const currencyUpdateBodySchema = currencySchema.omit({ isoCode: true }).strict();
    const languageUpdateBodySchema = languageSchema.omit({ isoCode: true }).strict();
    const countryCodeParamSchema = z.object({ iso2Code: z.string().regex(/^[A-Z]{2}$/) }).strict();
    const isoCodeParamSchema = z.object({ isoCode: z.string().min(2).max(8) }).strict();
    const governanceParamSchema = z.object({
      entityType: z.enum(['COUNTRY', 'CURRENCY', 'LANGUAGE', 'CITY']),
      referenceId: z.string().uuid(),
    }).strict();
    const lifecycleTransitionSchema = z.object({
      toState: z.nativeEnum(ReferenceLifecycleState).refine((state) => state !== ReferenceLifecycleState.ACTIVE),
      targetReferenceId: z.string().uuid().optional(),
      reason: z.string().min(3).max(1000),
    }).strict();

    router.get(
      '/countries',
      asyncHandler(async (req: Request, res: Response) => {
        const filters = querySchema.parse(req.query);
        res.json({ data: await referenceDataUseCases.listCountries(filters) });
      }),
    );

    router.post(
      '/countries/import-preview',
      asyncHandler(async (req: Request, res: Response) => {
        const input = countryImportPreviewSchema.parse(req.body);
        res.json(referenceDataUseCases.previewCountryImport(input));
      }),
    );

    router.post(
      '/countries/derived-reference-preview',
      asyncHandler(async (req: Request, res: Response) => {
        const input = z
          .object({ records: z.array(z.record(z.string(), z.unknown())).min(1).max(500) })
          .parse(req.body);
        res.json(referenceDataUseCases.previewCountryDerivedReferences(input.records));
      }),
    );

    router.get(
      '/countries/:iso2Code',
      asyncHandler(async (req: Request, res: Response) => {
        const country = await referenceDataUseCases.getCountry(req.params.iso2Code);
        if (!country) return res.status(404).json({ error: 'Country not found' });
        res.json(country);
      }),
    );

    router.get(
      '/regions',
      asyncHandler(async (req: Request, res: Response) => {
        const filters = querySchema.parse(req.query);
        res.json({ data: await referenceDataUseCases.listRegions(filters) });
      }),
    );

    router.get(
      '/cities',
      asyncHandler(async (req: Request, res: Response) => {
        const filters = querySchema.parse(req.query);
        res.json({ data: await referenceDataUseCases.listCities(filters) });
      }),
    );

    // P9/P23 canonical picker reads stay on the P7 owner API.
    router.get(
      '/languages',
      asyncHandler(async (req: Request, res: Response) => {
        const filters = querySchema.parse(req.query);
        res.json({ data: await referenceDataUseCases.listLanguages(filters) });
      }),
    );

    router.get(
      '/currencies',
      asyncHandler(async (req: Request, res: Response) => {
        const filters = querySchema.parse(req.query);
        res.json({ data: await referenceDataUseCases.listCurrencies(filters) });
      }),
    );

    router.get(
      '/governance/:entityType/:referenceId/history',
      asyncHandler(async (req: Request, res: Response) => {
        const { entityType, referenceId } = governanceParamSchema.parse(req.params);
        res.json({ data: await referenceDataUseCases.getReferenceHistory(entityType as GovernedReferenceEntityType, referenceId) });
      }),
    );

    router.get(
      '/governance/:entityType/:referenceId/relationships',
      asyncHandler(async (req: Request, res: Response) => {
        const { entityType, referenceId } = governanceParamSchema.parse(req.params);
        res.json({ data: await referenceDataUseCases.getReferenceRelationships(entityType as GovernedReferenceEntityType, referenceId) });
      }),
    );

    router.post(
      '/governance/:entityType/:referenceId/lifecycle',
      asyncHandler(async (req: Request, res: Response) => {
        const { entityType, referenceId } = governanceParamSchema.parse(req.params);
        const body = lifecycleTransitionSchema.parse(req.body);
        await referenceDataUseCases.transitionReferenceLifecycle(
          { entityType: entityType as GovernedReferenceEntityType, referenceId, ...body },
          mutationContext(req),
        );
        res.status(204).send();
      }),
    );

    router.put(
      '/countries/:iso2Code',
      asyncHandler(async (req: Request, res: Response) => {
        const payload = countryUpdateBodySchema.parse(req.body);
        const { iso2Code } = countryCodeParamSchema.parse(req.params);
        const body = countrySchema.parse({ ...payload, iso2Code });
        res.json(await referenceDataUseCases.upsertCountry(body, mutationContext(req)));
      }),
    );

    router.put(
      '/currencies/:isoCode',
      asyncHandler(async (req: Request, res: Response) => {
        const payload = currencyUpdateBodySchema.parse(req.body);
        const { isoCode } = isoCodeParamSchema.parse(req.params);
        const body = currencySchema.parse({ ...payload, isoCode });
        res.json(await referenceDataUseCases.upsertCurrency(body, mutationContext(req)));
      }),
    );

    router.put(
      '/languages/:isoCode',
      asyncHandler(async (req: Request, res: Response) => {
        const payload = languageUpdateBodySchema.parse(req.body);
        const { isoCode } = isoCodeParamSchema.parse(req.params);
        const body = languageSchema.parse({ ...payload, isoCode });
        res.json(await referenceDataUseCases.upsertLanguage(body, mutationContext(req)));
      }),
    );

    router.put(
      '/cities',
      asyncHandler(async (req: Request, res: Response) => {
        const body = citySchema.parse(req.body);
        res.json(await referenceDataUseCases.upsertCity(body, mutationContext(req)));
      }),
    );

    router.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation Error', details: err.issues });
      }
      if (err instanceof ReferenceDataValidationError) {
        return res.status(422).json({ error: err.code, entityType: err.entityType, details: err.issues });
      }
      if (err instanceof ReferenceDataNotFoundError) {
        return res.status(404).json({ error: err.code, entityType: err.entityType, reference: err.reference });
      }
      if (err instanceof ReferenceDataInvariantError) {
        return res.status(422).json({ error: err.code, message: err.message });
      }
      return next(err);
    });

    return router;
  }
}
