import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { adminReferenceDataQuerySchema, adminCityReferenceDataQuerySchema } from './ReferenceDataQueryContract.js';
import {
  ReferenceDataInvariantError,
  ReferenceDataNotFoundError,
  ReferenceDataUseCases,
  ReferenceOwnerReviewUseCases,
  ReferenceDataValidationError,
} from '@manaratak/application';
import { ReferenceLifecycleState, ReferenceRegionCommandError, type GovernedReferenceEntityType } from '@manaratak/domain';

export class ReferenceDataAdminRouter {
  public static create(cradle: { referenceDataUseCases: ReferenceDataUseCases; referenceOwnerReviewUseCases?: ReferenceOwnerReviewUseCases }): Router {
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
      id: z.string().uuid().optional(),
      expectedVersion: z.number().int().positive().optional(),
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
      id: z.string().uuid().optional(),
      expectedVersion: z.number().int().positive().optional(),
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
      id: z.string().uuid().optional(),
      expectedVersion: z.number().int().positive().optional(),
      isoCode: z.string().regex(/^[a-z]{2,3}$/),
      name: z.string().min(1),
      nameAr: z.string().min(1).nullable().optional(),
      nativeName: z.string().nullable().optional(),
      direction: z.enum(['LTR', 'RTL']),
      ...governanceFields,
      metadata: z.record(z.string(), z.unknown()).optional(),
    }).strict();

    const citySchema = z.object({
      // Legacy city primary keys may predate UUID defaults; a row-locked ID lookup is authoritative.
      id: z.string().min(1).max(191).optional(),
      expectedVersion: z.number().int().positive().optional(),
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
      entityType: z.enum(['COUNTRY', 'CURRENCY', 'LANGUAGE', 'CITY', 'REGION']),
      referenceId: z.string().min(1).max(191),
    }).strict();
    const mappingReconciliationSchema = z.object({
      entityType: z.enum(['COUNTRY', 'CURRENCY', 'LANGUAGE', 'CITY']),
      fromReferenceId: z.string().min(1).max(191),
      toReferenceId: z.string().min(1).max(191),
      fromExpectedVersion: z.number().int().positive(),
      toExpectedVersion: z.number().int().positive(),
      providerSystem: z.string().trim().min(1).max(100),
      providerId: z.string().trim().min(1).max(200),
      reason: z.string().trim().min(3).max(1000),
      reconciliationId: z.string().uuid(),
    }).strict();
    const lifecycleTransitionSchema = z.object({
      acknowledgeHistoricalReferences: z.boolean().optional(),
      toState: z.nativeEnum(ReferenceLifecycleState).refine((state) => state !== ReferenceLifecycleState.ACTIVE),
      targetReferenceId: z.string().uuid().optional(),
      reason: z.string().min(3).max(1000),
      expectedVersion: z.number().int().positive(),
    }).strict();

    const regionSchema = z.object({
      countryIso2Code: z.string().regex(/^[A-Z]{2}$/),
      regionCode: z.string().regex(/^[A-Z0-9][A-Z0-9-]{0,31}$/),
      name: z.string().trim().min(1).max(300),
      nameAr: z.string().trim().min(1).max(300).nullable().optional(),
      localName: z.string().trim().min(1).max(300).nullable().optional(),
      regionType: z.string().trim().min(1).max(100).nullable().optional(),
      aliases: z.array(aliasSchema.extend({ alias: z.string().trim().min(1).max(300).regex(/[\p{L}\p{N}]/u) })).max(100).optional(),
    }).strict();
    const regionIdSchema = z.object({ id: z.string().uuid() }).strict();
    router.get('/regions/:id', asyncHandler(async (req: Request, res: Response) => {
      const { id } = regionIdSchema.parse(req.params);
      res.json(await referenceDataUseCases.getRegion(id));
    }));
    router.post('/regions', asyncHandler(async (req: Request, res: Response) => {
      const body = regionSchema.parse(req.body);
      res.status(201).json(await referenceDataUseCases.upsertRegion(body, mutationContext(req)));
    }));
    router.put('/regions/:id', asyncHandler(async (req: Request, res: Response) => {
      const { id } = regionIdSchema.parse(req.params);
      const body = regionSchema.extend({ expectedVersion: z.number().int().positive() }).strict().parse(req.body);
      res.json(await referenceDataUseCases.upsertRegion({ ...body, id }, mutationContext(req)));
    }));

    router.get('/import-review', asyncHandler(async (req: Request, res: Response) => {
      const params = z.object({
        page: z.coerce.number().int().min(1).max(100000).optional(),
        pageSize: z.coerce.number().int().min(1).max(50).optional(),
      }).strict().parse(req.query);
      res.json(await referenceDataUseCases.listImportScreeningReviews(
        params.page ?? 1, params.pageSize ?? 25));
    }));

    const owner = () => { if (!cradle.referenceOwnerReviewUseCases) throw new Error('REFERENCE_OWNER_UNAVAILABLE'); return cradle.referenceOwnerReviewUseCases; };
    const pageQuery = z.object({ page: z.coerce.number().int().min(1).max(1000).default(1), status: z.enum(['PREVIEWED','APPROVED','REJECTED','APPLIED']).optional() }).strict();
    const revisionBody = z.object({ expectedVersion: z.number().int().positive(), previewHash: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
    router.get('/owner-imports', asyncHandler(async (req: Request, res: Response) => { const q = pageQuery.parse(req.query); res.json(await owner().list(q.page, q.status)); }));
    router.post('/owner-imports/preview', asyncHandler(async (req: Request, res: Response) => { const body = z.object({ receiptId: z.string().min(1).max(128) }).strict().parse(req.body); res.json(await owner().preview(body.receiptId,mutationContext(req))); }));
    router.post('/owner-imports/:id/refresh', asyncHandler(async (req: Request, res: Response) => { const body = z.object({ expectedVersion: z.number().int().positive() }).strict().parse(req.body); res.json(await owner().refresh(String(req.params.id),body.expectedVersion,mutationContext(req))); }));
    router.post('/owner-imports/:id/review', asyncHandler(async (req: Request, res: Response) => { const body = revisionBody.extend({ decision: z.enum(['APPROVE','REJECT']), reason: z.string().trim().min(3).max(1000) }).strict().parse(req.body); res.json(await owner().review(String(req.params.id),body,mutationContext(req))); }));
    router.post('/owner-imports/:id/apply', asyncHandler(async (req: Request, res: Response) => { res.json(await owner().apply(String(req.params.id),revisionBody.parse(req.body),mutationContext(req))); }));
    router.get('/standards/snapshots', asyncHandler(async (req: Request, res: Response) => { const { page } = pageQuery.omit({ status: true }).parse(req.query); res.json(await owner().snapshots(page)); }));
    router.post('/standards/snapshots', asyncHandler(async (req: Request, res: Response) => {
      const body = z.object({ standardFamily: z.enum(['ISO_3166','ISO_4217','ISO_639','UN_M49','IANA_TZ','CLDR']), sourceAuthority: z.string().trim().min(1).max(300), sourceVersion: z.string().trim().min(1).max(128), sourceArtifactHash: z.string().regex(/^[a-fA-F0-9]{64}$/), sourceArtifactId: z.string().min(1).max(128), sourceUrl: z.string().url().max(2000).refine(value => value.startsWith('https://')), retrievedAt: z.string().datetime({ offset: true }), supersedesSnapshotId: z.string().uuid().nullable().optional(), notes: z.string().max(1000).nullable().optional() }).strict().parse(req.body);
      res.status(201).json(await owner().createSnapshot(body,mutationContext(req)));
    }));
    router.post('/standards/snapshots/:id/review', asyncHandler(async (req: Request, res: Response) => { const body = z.object({ expectedVersion: z.number().int().positive(), decision: z.enum(['APPROVE','REJECT']), reason: z.string().trim().min(3).max(1000) }).strict().parse(req.body); res.json(await owner().reviewSnapshot(String(req.params.id),body.expectedVersion,body.decision,body.reason,mutationContext(req))); }));
    router.get('/standards/readiness', asyncHandler(async (_req: Request, res: Response) => {
      const data = await owner().readiness(); res.json({ data, source: 'P7_REVIEWED_SNAPSHOT_REGISTRY', evidenceState: data.some(item => item.readiness === 'EVIDENCE_RECORDED') ? 'REVIEWED_EVIDENCE_RECORDED' : 'NO_APPROVED_STANDARD_SNAPSHOTS', asOf: new Date().toISOString() });
    }));

    router.get('/quality/cities/:countryIso2Code', asyncHandler(async (req: Request, res: Response) => {
      const { iso2Code } = countryCodeParamSchema.parse({ iso2Code: req.params.countryIso2Code });
      res.json({ data: await referenceDataUseCases.getCityQualityCounters(iso2Code), source: 'P7_OWNER_COUNTS', asOf: new Date().toISOString() });
    }));
    router.get('/quality', asyncHandler(async (_req: Request, res: Response) => {
      res.json({ data: await referenceDataUseCases.getQualitySnapshot(), source: 'P7_OWNER_COUNTS',
        asOf: new Date().toISOString(), coverageEvidence: 'unknown' });
    }));

    router.get(
      '/countries',
      asyncHandler(async (req: Request, res: Response) => {
        const filters = adminReferenceDataQuerySchema.parse(req.query);
        res.json(await referenceDataUseCases.listPage('countries', filters));
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
        const filters = adminReferenceDataQuerySchema.parse(req.query);
        res.json(await referenceDataUseCases.listPage('regions', filters));
      }),
    );

    router.get(
      '/cities',
      asyncHandler(async (req: Request, res: Response) => {
        const filters = adminCityReferenceDataQuerySchema.parse(req.query);
        res.json(await referenceDataUseCases.listPage('cities', filters));
      }),
    );

    // P9/P23 canonical picker reads stay on the P7 owner API.
    router.get(
      '/languages',
      asyncHandler(async (req: Request, res: Response) => {
        const filters = adminReferenceDataQuerySchema.parse(req.query);
        res.json(await referenceDataUseCases.listPage('languages', filters));
      }),
    );

    router.get(
      '/currencies',
      asyncHandler(async (req: Request, res: Response) => {
        const filters = adminReferenceDataQuerySchema.parse(req.query);
        res.json(await referenceDataUseCases.listPage('currencies', filters));
      }),
    );

    router.post('/cities/:id/reconcile-country', asyncHandler(async (req: Request, res: Response) => {
      const params = z.object({ id: z.string().min(1).max(191) }).strict().parse(req.params);
      const body = z.object({
        countryReferenceId: z.string().uuid(), expectedVersion: z.number().int().positive(),
        reason: z.string().trim().min(3).max(1000),
      }).strict().parse(req.body);
      await referenceDataUseCases.repairCityCountryLink({
        cityId: params.id, ...body,
      }, mutationContext(req));
      res.status(204).send();
    }));

    router.post('/governance/provider-mappings/reassign', asyncHandler(async (req: Request, res: Response) => {
      const body = mappingReconciliationSchema.parse(req.body);
      const outcome = await referenceDataUseCases.reassignProviderMapping(body, mutationContext(req));
      res.json({ outcome, reconciliationId: body.reconciliationId });
    }));

    router.get(
      '/governance/:entityType/:referenceId/impact',
      asyncHandler(async (req: Request, res: Response) => {
        const { entityType, referenceId } = governanceParamSchema.parse(req.params);
        res.json({ data: await referenceDataUseCases.getReferenceDependencyImpact(entityType, referenceId) });
      }),
    );

    router.get(
      '/governance/:entityType/:referenceId/details',
      asyncHandler(async (req: Request, res: Response) => {
        const { entityType, referenceId } = governanceParamSchema.parse(req.params);
        res.json({ data: await referenceDataUseCases.getReferenceGovernanceDetails(entityType, referenceId) });
      }),
    );

    router.get(
      '/governance/:entityType/:referenceId/history-page',
      asyncHandler(async (req: Request, res: Response) => {
        const { entityType, referenceId } = governanceParamSchema.parse(req.params);
        const { page, pageSize } = z.object({
          page: z.coerce.number().int().min(1).max(100000).optional(),
          pageSize: z.coerce.number().int().min(1).max(100).optional(),
        }).strict().parse(req.query);
        res.json(await referenceDataUseCases.getReferenceHistoryPage(
          entityType, referenceId, page ?? 1, pageSize ?? 30));
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
      if (err instanceof ReferenceRegionCommandError) {
        return res.status(err.code === 'REGION_NOT_FOUND' ? 404 : 409).json({ error: err.code });
      }
      if (err instanceof Error && err.message === 'AUTHENTICATED_ADMIN_ACTOR_REQUIRED') return res.status(401).json({ error: err.message });
      if (err instanceof Error && /^(REFERENCE_OWNER_|REFERENCE_STANDARD_)/.test(err.message)) return res.status(err.message.includes('UNAVAILABLE') || err.message.includes('TOO_LARGE') ? 503 : err.message.includes('CONFLICT') || err.message.includes('STALE') || err.message.includes('APPROVAL') ? 409 : 422).json({ error: err.message });
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
      // Fail closed but keep optimistic conflicts actionable in admin UI.
      const governedConflicts = new Set([
        'REFERENCE_ARCHIVE_HAS_DEPENDENCIES',
        'REFERENCE_HISTORICAL_ACKNOWLEDGEMENT_REQUIRED',
        'REFERENCE_LIFECYCLE_TARGET_REGION_MISMATCH',
        'REFERENCE_VERSION_CONFLICT',
        'REFERENCE_EDIT_TARGET_NOT_FOUND',
        'REFERENCE_EDIT_IDENTITY_MISMATCH',
        'REFERENCE_EDIT_TRANSACTION_AND_EXPECTED_VERSION_REQUIRED',
        'REFERENCE_CITY_EDIT_ID_REQUIRED',
        'REFERENCE_CITY_EDIT_COUNTRY_IMMUTABLE',
        'REFERENCE_CITY_EDIT_REGION_IMMUTABLE',
        'REFERENCE_CITY_IDENTITY_COLLISION_REVIEW_REQUIRED',
        'REFERENCE_CITY_EXISTING_EDIT_ID_AND_VERSION_REQUIRED',
        'REFERENCE_CITY_IDENTITY_RECONCILIATION_REQUIRED',
        'REFERENCE_CITY_LEGACY_IDENTITY_REVIEW_REQUIRED',
        'REFERENCE_CITY_LEGACY_IDENTITY_AMBIGUOUS',
        'REFERENCE_PROVIDER_MAPPING_REASSIGNMENT_REQUIRES_RECONCILIATION',
        'REFERENCE_MAPPING_RECONCILIATION_ID_CONFLICT',
        'REFERENCE_MAPPING_REPLAY_TARGET_CHANGED',
        'REFERENCE_MAPPING_SOURCE_OWNERSHIP_CHANGED',
        'REFERENCE_MAPPING_SOURCE_NOT_FOUND',
        'REFERENCE_MAPPING_ACTIVE_OWNERS_REQUIRED',
        'REFERENCE_MAPPING_CITY_COUNTRY_SCOPE_MISMATCH',
        'REFERENCE_CITY_REPAIR_TARGET_NOT_FOUND',
        'REFERENCE_CITY_REPAIR_ACTIVE_ONLY',
        'REFERENCE_CITY_REPAIR_NOT_LEGACY_UNLINKED',
        'REFERENCE_CITY_REPAIR_COUNTRY_MISMATCH',
        'REFERENCE_CITY_REPAIR_REGION_MISMATCH',
        'REFERENCE_GOVERNANCE_DETAILS_LIMIT_EXCEEDED',
        'REFERENCE_ALIAS_AMBIGUITY_SCAN_LIMIT',
        'REFERENCE_GOVERNANCE_HISTORY_USE_PAGINATED_ENDPOINT',
        'REFERENCE_REPLACEMENT_RELATIONSHIP_CYCLE',
        'REFERENCE_LIFECYCLE_TARGET_NOT_ACTIVE',
        'REFERENCE_LIFECYCLE_TARGET_COUNTRY_MISMATCH',
        'REFERENCE_LIFECYCLE_REPLACEMENT_CYCLE',
        'REFERENCE_LIFECYCLE_TARGET_NOT_ALLOWED',
        'REFERENCE_TERMINAL_IMPACT_CERTIFICATION_REQUIRED',
        'REFERENCE_LIFECYCLE_TRANSACTION_AND_EXPECTED_VERSION_REQUIRED',
      ]);
      if (err instanceof Error && governedConflicts.has(err.message)) {
        return res.status(409).json({ error: err.message, refreshRequired: true });
      }
      if (err instanceof Error && err.message === 'REFERENCE_DATA_TRANSACTIONAL_PERSISTENCE_REQUIRED') {
        return res.status(503).json({ error: 'REFERENCE_DATA_TRANSACTIONAL_PERSISTENCE_REQUIRED' });
      }
      return next(err);
    });

    return router;
  }
}
