import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CrossDomainGraphReadService, InternationalTestAdminUseCases } from '@manaratak/application';
import {
  InternationalTestCategory,
  InternationalTestCompletenessStatus,
  InternationalTestDeliveryMode,
  InternationalTestStatus,
  InternationalTestSourceTrustLevel,
  UpsertInternationalTestDto,
} from '@manaratak/domain';

export class InternationalTestAdminRouter {
  public static create(cradle: { internationalTestAdminUseCases: InternationalTestAdminUseCases; crossDomainGraphReadService: CrossDomainGraphReadService }): Router {
    const router = Router();
    const { internationalTestAdminUseCases, crossDomainGraphReadService } = cradle;
    type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown;
    const asyncHandler = (fn: AsyncRouteHandler) => (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res, next)).catch(next);
    const mutationContext = (req: Request) => {
      if (!req.authUserId) throw new Error('AUTHENTICATED_ADMIN_ACTOR_REQUIRED');
      return {
      actorId: req.authUserId,
      actorType: 'IDENTITY',
      correlationId: (req.headers['x-correlation-id'] as string | undefined) || (req.headers['x-request-id'] as string | undefined),
      source: 'admin-international-tests-api',
      };
    };

    const querySchema = z.object({
      status: z.nativeEnum(InternationalTestStatus).optional(),
      completenessStatus: z.nativeEnum(InternationalTestCompletenessStatus).optional(),
      testCategory: z.nativeEnum(InternationalTestCategory).optional(),
      providerName: z.string().optional(),
      countryIso2Code: z.string().length(2).transform(value => value.toUpperCase()).optional(),
      page: z.string().optional().transform((value) => value ? parseInt(value, 10) : 1),
      pageSize: z.string().optional().transform((value) => value ? Math.min(Math.max(parseInt(value, 10), 1), 100) : 20)
    }).strict();

    const referenceRelationshipSchema = z.object({
      canonicalReferenceId: z.string().min(1),
      referenceCode: z.string().min(1).optional(),
      relationshipType: z.string().min(1),
      notes: z.string().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }).strict();
    const academicTaxonomyRelationshipSchema = z.object({
      taxonomyNodeId: z.string().min(1),
      relationshipType: z.string().min(1),
      confidence: z.number().min(0).max(1).optional(),
      notes: z.string().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }).strict();
    const degreeRelationshipSchema = z.object({
      degreeLevelId: z.string().min(1),
      canonicalCode: z.string().min(1).optional(),
      relationshipType: z.string().min(1),
      notes: z.string().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }).strict();
    const scoreScaleSchema = z.object({
      overallMinimum: z.number(),
      overallMaximum: z.number(),
      scoreIncrement: z.number().optional(),
      bandsOrLevels: z.array(z.string()).optional(),
      passFailRules: z.string().optional(),
      cefrEquivalency: z.string().optional(),
      crossTestEquivalency: z.string().optional(),
      resultValidityDurationMonths: z.number().int().nonnegative().optional(),
      resultDeliveryTimeDays: z.number().int().nonnegative().optional(),
      scoreReportingUrl: z.string().url().optional(),
    }).strict();
    const officialLinkSchema = z.object({
      linkType: z.enum(['REGISTRATION', 'INFORMATION', 'PREPARATION', 'SCORE_REPORTING', 'OTHER']),
      url: z.string().url(),
      description: z.string().optional(),
    }).strict();
    const rootCreateSchema = z.object({
      canonicalName: z.string().min(1),
      testCategory: z.nativeEnum(InternationalTestCategory),
      providerName: z.string().min(1),
      localizedNameAr: z.string().optional(),
      localizedNameEn: z.string().optional(),
      abbreviation: z.string().optional(),
      familyId: z.string().optional(),
      providerId: z.string().optional(),
      status: z.nativeEnum(InternationalTestStatus).optional(),
      countryRelationships: z.array(referenceRelationshipSchema).optional(),
      languageRelationships: z.array(referenceRelationshipSchema).optional(),
      academicTaxonomyRelationships: z.array(academicTaxonomyRelationshipSchema).optional(),
      degreeRelationships: z.array(degreeRelationshipSchema).optional(),
      scoreScale: scoreScaleSchema.optional(),
      officialLinks: z.array(officialLinkSchema).optional(),
      optionalFields: z.record(z.string(), z.unknown()).optional(),
    }).strict();
    const rootUpdateSchema = z.object({
      testCategory: z.nativeEnum(InternationalTestCategory).optional(),
      providerName: z.string().min(1).optional(),
      abbreviation: z.string().optional(),
      familyId: z.string().optional(),
      providerId: z.string().optional(),
      registrationRequirements: z.string().optional(),
      identificationRequirements: z.string().optional(),
      retakePolicy: z.string().optional(),
      cancellationReschedulingNotes: z.string().optional(),
      accessibilityNotes: z.string().optional(),
      countryRelationships: z.array(referenceRelationshipSchema).optional(),
      languageRelationships: z.array(referenceRelationshipSchema).optional(),
      academicTaxonomyRelationships: z.array(academicTaxonomyRelationshipSchema).optional(),
      degreeRelationships: z.array(degreeRelationshipSchema).optional(),
      scoreScale: scoreScaleSchema.optional(),
      officialLinks: z.array(officialLinkSchema).optional(),
      optionalFields: z.record(z.string(), z.unknown()).optional(),
    }).strict();
    const providerSchema = z.object({
      id: z.string().optional(),
      key: z.string().min(1),
      displayName: z.string().min(1),
      providerType: z.string().optional(),
      officialWebsite: z.string().url().optional(),
      countryIso2Code: z.string().length(2).transform(value => value.toUpperCase()).optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }).strict();
    const evidenceSchema = z.object({
      originalImportedName: z.string().optional(),
      normalizedCanonicalName: z.string().optional(),
      deterministicKey: z.string().optional(),
      sourceId: z.string().optional(),
      sourceUrl: z.string().url().optional(),
      contentHash: z.string().optional(),
      retrievedAt: z.coerce.date().optional(),
      evidenceSnippet: z.string().optional(),
      duplicateStatus: z.enum(['NEW', 'DUPLICATE_SKIPPED', 'EXISTING_ENRICHED']).optional(),
      conflictingFields: z.array(z.string()).optional(),
      mergeSuggestions: z.record(z.string(), z.unknown()).nullable().optional(),
      sourceTrustLevel: z.nativeEnum(InternationalTestSourceTrustLevel).optional(),
    }).strict();

    const importDraftSchema = z.object({
      sourceImportRecordId: z.string().optional(),
      sourceFileName: z.string().min(1),
      sourceUri: z.string().optional(),
      sourceHash: z.string().optional(),
      rawContent: z.string().optional(),
      importedBy: z.string().optional(),
      detectedFields: z.record(z.string(), z.unknown()).optional(),
      detectedSections: z.array(z.string()).optional(),
      unmappedSections: z.array(z.object({
        sectionKey: z.string().min(1),
        title: z.string().optional(),
        sourceSectionPath: z.string().optional(),
        content: z.string(),
        locale: z.string().optional(),
        detectedFieldKeys: z.array(z.string()).optional(),
        metadata: z.record(z.string(), z.unknown()).optional()
      }).strict()).optional(),
      metadata: z.record(z.string(), z.unknown()).optional()
    }).strict();

    const childVariantSchema = z.object({
      id: z.string().min(1).max(200).optional(),
      variantName: z.string().trim().min(1).max(240),
      deliveryMode: z.nativeEnum(InternationalTestDeliveryMode),
      isActive: z.boolean(),
      specificOfficialUrl: z.string().url().max(2048).optional(),
      administrativeNotes: z.string().max(5000).optional(),
    }).strict();
    const childSectionSchema = z.object({
      id: z.string().min(1).max(200).optional(),
      sectionName: z.string().trim().min(1).max(240),
      sectionType: z.string().trim().min(1).max(120),
      durationMinutes: z.number().int().nonnegative().max(1440).optional(),
      order: z.number().int().nonnegative().max(1000),
      questionTypes: z.array(z.string().max(240)).max(100).optional(),
      scoreMinimum: z.number().optional(),
      scoreMaximum: z.number().optional(),
    }).strict();
    const childScoreScaleSchema = scoreScaleSchema.strict();
    const childFeeSchema = z.object({
      id: z.string().min(1).max(200).optional(),
      feeType: z.enum(['REGISTRATION', 'LATE_REGISTRATION', 'RESCHEDULING', 'CANCELLATION', 'OTHER']),
      amount: z.number().nonnegative().max(1_000_000_000),
      currencyCode: z.string().trim().length(3).transform(value => value.toUpperCase()),
      currencyReferenceId: z.string().min(1).max(200).optional(),
      hasRegionalVariation: z.boolean(),
      validityWindowNotes: z.string().max(5000).optional(),
    }).strict();
    const childOfficialLinkSchema = officialLinkSchema.extend({ id: z.string().min(1).max(200).optional() }).strict();
    const childAvailabilitySchema = z.object({
      availableCountryIds: z.array(z.string().min(1).max(200)).max(500),
      availableCityIds: z.array(z.string().min(1).max(200)).max(2000).optional(),
      onlineAvailabilityRegions: z.array(z.string().max(240)).max(500).optional(),
      testingWindowsNotes: z.string().max(5000).optional(),
    }).strict();
    const childPreparationMaterialSchema = z.object({
      id: z.string().min(1).max(200).optional(),
      materialType: z.enum(['SAMPLE_QUESTIONS', 'PRACTICE_TEST', 'BROCHURE', 'AUDIO_SAMPLE', 'GUIDE']),
      url: z.string().url().max(2048).optional(),
      assetId: z.string().min(1).max(200).optional(),
      title: z.string().trim().min(1).max(500),
      description: z.string().max(5000).optional(),
    }).strict();
    const emptyMutationBody = z.object({}).strict();

    router.get('/', asyncHandler(async (req: Request, res: Response) => {
      const parsed = querySchema.parse(req.query);
      const { testCategory, completenessStatus, ...filters } = parsed;
      res.json(await internationalTestAdminUseCases.list({
        ...filters,
        ...(completenessStatus ? { completenessStatus } : {}),
        ...(testCategory ? { category: testCategory } : {}),
      }));
    }));

    router.get('/providers', asyncHandler(async (req: Request, res: Response) => {
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      res.json(await internationalTestAdminUseCases.listProviders(search));
    }));

    router.post('/providers', asyncHandler(async (req: Request, res: Response) => {
      const parsed = providerSchema.parse(req.body);
      res.status(201).json(await internationalTestAdminUseCases.upsertProvider(parsed, mutationContext(req)));
    }));

    router.post('/', asyncHandler(async (req: Request, res: Response) => {
      const parsed = rootCreateSchema.parse(req.body);
      res.status(201).json(await internationalTestAdminUseCases.createTest(parsed as unknown as UpsertInternationalTestDto, mutationContext(req)));
    }));

    router.post('/upsert', asyncHandler(async (req: Request, res: Response) => {
      const parsed = rootCreateSchema.parse(req.body);
      res.json(await internationalTestAdminUseCases.upsertTest(parsed as unknown as UpsertInternationalTestDto, mutationContext(req)));
    }));

    router.post('/:id/import-draft', asyncHandler(async (req: Request, res: Response) => {
      const parsed = importDraftSchema.parse(req.body);
      res.status(201).json(await internationalTestAdminUseCases.createImportDraftVersion(req.params.id, parsed, mutationContext(req)));
    }));

    router.get('/:id/import-versions', asyncHandler(async (req: Request, res: Response) => {
      res.json(await internationalTestAdminUseCases.listImportVersions(req.params.id));
    }));

    router.get('/:id/relationships', asyncHandler(async (req: Request, res: Response) => {
      const locale = req.query.locale === 'en' ? 'en' : 'ar';
      res.json(await crossDomainGraphReadService.getInternationalTestGraphById(req.params.id, { locale, page: 1, pageSize: 50 }));
    }));

    router.get('/:id/readiness', asyncHandler(async (req: Request, res: Response) => {
      res.json(await internationalTestAdminUseCases.checkPublicationReadiness(req.params.id));
    }));

    router.post('/:id/verify-source', asyncHandler(async (req: Request, res: Response) => {
      emptyMutationBody.parse(req.body ?? {});
      await internationalTestAdminUseCases.verifySource(req.params.id, mutationContext(req));
      res.json({ success: true });
    }));

    router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
      res.json(await internationalTestAdminUseCases.get(req.params.id));
    }));

    router.patch('/:id', asyncHandler(async (req: Request, res: Response) => {
      const parsed = rootUpdateSchema.parse(req.body);
      res.json(await internationalTestAdminUseCases.updateTest(req.params.id, parsed as unknown as Partial<UpsertInternationalTestDto>, mutationContext(req)));
    }));

    router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
      const parsed = rootUpdateSchema.parse(req.body);
      res.json(await internationalTestAdminUseCases.updateTest(req.params.id, parsed as unknown as Partial<UpsertInternationalTestDto>, mutationContext(req)));
    }));

    router.post('/:id/mark-publishable', asyncHandler(async (req: Request, res: Response) => {
      emptyMutationBody.parse(req.body ?? {});
      await internationalTestAdminUseCases.markReadyToPublish(req.params.id, mutationContext(req));
      res.json({ success: true });
    }));

    router.post('/:id/publish', asyncHandler(async (req: Request, res: Response) => {
      emptyMutationBody.parse(req.body ?? {});
      await internationalTestAdminUseCases.publish(req.params.id, mutationContext(req));
      res.json({ success: true });
    }));

    router.post('/:id/archive', asyncHandler(async (req: Request, res: Response) => {
      emptyMutationBody.parse(req.body ?? {});
      await internationalTestAdminUseCases.archive(req.params.id, mutationContext(req));
      res.json({ success: true });
    }));

    // Child profile delegates
    router.get('/:id/variants', asyncHandler(async (req: Request, res: Response) => {
      res.json(await internationalTestAdminUseCases.listVariants(req.params.id));
    }));

    router.post('/:id/variants', asyncHandler(async (req: Request, res: Response) => {
      res.json(await internationalTestAdminUseCases.upsertVariant(req.params.id, childVariantSchema.parse(req.body), mutationContext(req)));
    }));

    router.put('/:id/variants', asyncHandler(async (req: Request, res: Response) => {
      res.json(await internationalTestAdminUseCases.upsertVariant(req.params.id, childVariantSchema.parse(req.body), mutationContext(req)));
    }));

    router.get('/:id/sections', asyncHandler(async (req: Request, res: Response) => {
      res.json(await internationalTestAdminUseCases.listSections(req.params.id));
    }));

    router.post('/:id/sections', asyncHandler(async (req: Request, res: Response) => {
      res.json(await internationalTestAdminUseCases.upsertSection(req.params.id, childSectionSchema.parse(req.body), mutationContext(req)));
    }));

    router.put('/:id/sections', asyncHandler(async (req: Request, res: Response) => {
      res.json(await internationalTestAdminUseCases.upsertSection(req.params.id, childSectionSchema.parse(req.body), mutationContext(req)));
    }));

    router.post('/:id/score-scale', asyncHandler(async (req: Request, res: Response) => {
      res.json(await internationalTestAdminUseCases.upsertScoreScale(req.params.id, childScoreScaleSchema.parse(req.body), mutationContext(req)));
    }));

    router.put('/:id/score-scale', asyncHandler(async (req: Request, res: Response) => {
      res.json(await internationalTestAdminUseCases.upsertScoreScale(req.params.id, childScoreScaleSchema.parse(req.body), mutationContext(req)));
    }));

    router.post('/:id/fees', asyncHandler(async (req: Request, res: Response) => {
      res.json(await internationalTestAdminUseCases.upsertFeeMetadata(req.params.id, childFeeSchema.parse(req.body), mutationContext(req)));
    }));

    router.put('/:id/fees', asyncHandler(async (req: Request, res: Response) => {
      res.json(await internationalTestAdminUseCases.upsertFeeMetadata(req.params.id, childFeeSchema.parse(req.body), mutationContext(req)));
    }));

    router.post('/:id/official-links', asyncHandler(async (req: Request, res: Response) => {
      res.json(await internationalTestAdminUseCases.upsertOfficialLink(req.params.id, childOfficialLinkSchema.parse(req.body), mutationContext(req)));
    }));

    router.put('/:id/official-links', asyncHandler(async (req: Request, res: Response) => {
      res.json(await internationalTestAdminUseCases.upsertOfficialLink(req.params.id, childOfficialLinkSchema.parse(req.body), mutationContext(req)));
    }));

    router.get('/:id/availability', asyncHandler(async (req: Request, res: Response) => {
      res.json(await internationalTestAdminUseCases.listAvailability(req.params.id));
    }));

    router.post('/:id/availability', asyncHandler(async (req: Request, res: Response) => {
      res.json(await internationalTestAdminUseCases.upsertAvailability(req.params.id, childAvailabilitySchema.parse(req.body), mutationContext(req)));
    }));

    router.put('/:id/availability', asyncHandler(async (req: Request, res: Response) => {
      res.json(await internationalTestAdminUseCases.upsertAvailability(req.params.id, childAvailabilitySchema.parse(req.body), mutationContext(req)));
    }));

    router.get('/:id/preparation-materials', asyncHandler(async (req: Request, res: Response) => {
      res.json(await internationalTestAdminUseCases.listPreparationMaterials(req.params.id));
    }));

    router.post('/:id/preparation-materials', asyncHandler(async (req: Request, res: Response) => {
      res.json(await internationalTestAdminUseCases.upsertPreparationMaterial(req.params.id, childPreparationMaterialSchema.parse(req.body), mutationContext(req)));
    }));

    router.put('/:id/preparation-materials', asyncHandler(async (req: Request, res: Response) => {
      res.json(await internationalTestAdminUseCases.upsertPreparationMaterial(req.params.id, childPreparationMaterialSchema.parse(req.body), mutationContext(req)));
    }));

    router.get('/:id/evidence', asyncHandler(async (req: Request, res: Response) => {
      res.json(await internationalTestAdminUseCases.listEvidence(req.params.id));
    }));

    router.post('/:id/evidence', asyncHandler(async (req: Request, res: Response) => {
      const parsed = evidenceSchema.parse(req.body);
      res.json(await internationalTestAdminUseCases.addEvidence(req.params.id, parsed, mutationContext(req)));
    }));

    router.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation Error', details: err.issues });
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('not found')) return res.status(404).json({ error: message });
      res.status(400).json({ error: message || 'An error occurred' });
    });

    return router;
  }
}
