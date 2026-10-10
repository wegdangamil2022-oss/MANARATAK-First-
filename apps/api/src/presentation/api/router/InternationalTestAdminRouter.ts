import { SecurityMiddlewareFactory } from '../../security/SecurityMiddlewareFactory.js';
import type { IAuditRecordRepository } from '@manaratak/domain';
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
  public static create(cradle: { internationalTestAdminUseCases: InternationalTestAdminUseCases; crossDomainGraphReadService: CrossDomainGraphReadService; internationalTestConsumerReadGateway?: {usage(id:string,page:number,publishedOnly?:boolean):Promise<unknown>}; auditRecordRepo?: IAuditRecordRepository }): Router {
    const router = Router();
    const { internationalTestAdminUseCases, crossDomainGraphReadService } = cradle;
    type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown;
    const asyncHandler = (fn: AsyncRouteHandler) => (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res, next)).catch(next);
    const resRevision = (req:Request,value:number) => req.res?.setHeader('X-Entity-Revision',String(value));
    const mutationContext = (req: Request) => {
      if (!req.authUserId) throw new Error('AUTHENTICATED_ADMIN_ACTOR_REQUIRED');
      const value = req.get('If-Match');
      const expectedRevision = value && /^\"?\d+\"?$/.test(value) ? Number(value.replace(/\"/g,'')) : undefined;
      if (req.params.id && expectedRevision === undefined) throw new Error('INTERNATIONAL_TEST_EXPECTED_REVISION_REQUIRED');
      if (expectedRevision !== undefined) resRevision(req,expectedRevision+1);
      return {
      expectedRevision, reason: typeof req.body?.reason === 'string' ? req.body.reason : req.get('X-Review-Reason'),
      actorId: req.authUserId,
      actorType: 'IDENTITY',
      correlationId: (req.headers['x-correlation-id'] as string | undefined) || (req.headers['x-request-id'] as string | undefined),
      source: 'admin-international-tests-api',
      };
    };

    const cleanOptionalEnum = <T extends Record<string, string>>(enumObj: T) =>
      z.preprocess((val) => {
        if (Array.isArray(val)) {
          const cleaned = val
            .map((v) => (typeof v === 'string' ? v.trim() : ''))
            .filter((v) => v && v.toLowerCase() !== 'all');
          return cleaned.length > 0 ? (cleaned.length === 1 ? cleaned[0] : cleaned) : undefined;
        }
        if (typeof val === 'string') {
          const trimmed = val.trim();
          if (!trimmed || trimmed.toLowerCase() === 'all') return undefined;
          return trimmed;
        }
        return val;
      }, z.union([z.nativeEnum(enumObj), z.array(z.nativeEnum(enumObj))]).optional());

    const cleanOptionalString = () =>
      z.preprocess((val) => {
        if (typeof val === 'string') {
          const trimmed = val.trim();
          if (!trimmed || trimmed.toLowerCase() === 'all') return undefined;
          return trimmed;
        }
        return val;
      }, z.string().optional());

    const querySchema = z.object({
      status: cleanOptionalEnum(InternationalTestStatus),
      completenessStatus: cleanOptionalEnum(InternationalTestCompletenessStatus),
      testCategory: cleanOptionalEnum(InternationalTestCategory),
      staleOnly:z.enum(['true','false']).transform(value=>value==='true').optional(),
      sortBy:z.enum(['createdAt','updatedAt','canonicalName']).optional(),
      sortDirection:z.enum(['asc','desc']).optional(),
      providerName: cleanOptionalString(),
      countryIso2Code: z.preprocess((val) => {
        if (typeof val === 'string') {
          const trimmed = val.trim();
          if (!trimmed || trimmed.toLowerCase() === 'all') return undefined;
          return trimmed.toUpperCase();
        }
        return val;
      }, z.string().length(2).optional()),
      searchQuery: cleanOptionalString(),
      q: cleanOptionalString(),
      search: cleanOptionalString(),
      page: z.preprocess((val) => {
        if (typeof val === 'string' && val.trim() !== '') return parseInt(val, 10);
        if (typeof val === 'number') return val;
        return 1;
      }, z.number().int().min(1).default(1)),
      pageSize: z.preprocess((val) => {
        if (typeof val === 'string' && val.trim() !== '') return Math.min(Math.max(parseInt(val, 10), 1), 100);
        if (typeof val === 'number') return Math.min(Math.max(val, 1), 100);
        return 20;
      }, z.number().int().min(1).max(100).default(20)),
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
      abbreviation: z.string().optional(),
      familyId: z.string().optional(),
      providerId: z.string().optional(),
      status: z.enum(['IMPORTED','READY_TO_REVIEW','NEEDS_REVIEW']).optional(),
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
      contentHash: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
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
    const emptyMutationBody = z.object({reason:z.string().trim().min(3).max(2000).optional()}).strict();

    const reviewSourceNamesSchema = z.object({
      versionId: z.string().uuid(),
      sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
      localizedNameAr: z.string().trim().min(1).max(300),
      localizedNameEn: z.string().trim().min(1).max(300),
      reviewReason: z.string().trim().min(1).max(2000),
      evidenceReference: z.string().trim().min(1).max(500),
      expectedCurrentLocalizedNameAr: z.string().trim().min(1).max(300).nullable().optional(),
      expectedCurrentLocalizedNameEn: z.string().trim().min(1).max(300).nullable().optional(),
    }).strict();

    const correctDraftCanonicalIdentitySchema = z.object({
      versionId: z.string().uuid(),
      sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
      expectedCurrentCanonicalName: z.string().trim().min(1).max(300).nullable().optional(),
      newCanonicalName: z.string().trim().min(1).max(300),
      newDisplayName: z.string().trim().min(1).max(300).nullable().optional(),
      correctionReason: z.string().trim().min(1).max(2000),
      evidenceReference: z.string().trim().min(1).max(500),
    }).strict();

    const canonicalRelationshipSchema = z.object({
      kind: z.enum(['COUNTRY', 'LANGUAGE', 'TAXONOMY', 'DEGREE']), referenceId: z.string().uuid(),
      relationshipType: z.string().trim().min(1).max(120), reason: z.string().trim().min(1).max(2000),
      evidenceReference: z.string().trim().min(1).max(500),
    }).strict();
    router.post('/:id/canonical-relationships', asyncHandler(async (req, res) => {
      const id = z.string().uuid().parse(req.params.id);
      await internationalTestAdminUseCases.addCanonicalRelationship(id, canonicalRelationshipSchema.parse(req.body), mutationContext(req));
      res.status(201).json({ success: true });
    }));

    router.get('/', asyncHandler(async (req: Request, res: Response) => {
      const parsed = querySchema.parse(req.query);
      const { testCategory, completenessStatus, searchQuery, q, search, ...filters } = parsed;
      const combinedSearch = searchQuery || q || search;
      res.json(await internationalTestAdminUseCases.list({
        ...filters,
        ...(combinedSearch ? { searchQuery: combinedSearch } : {}),
        ...(completenessStatus ? { completenessStatus } : {}),
        ...(testCategory ? { category: testCategory } : {}),
      }));
    }));

    router.get('/providers', asyncHandler(async (req: Request, res: Response) => {
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      res.json(await internationalTestAdminUseCases.listProviders(search,z.coerce.number().int().min(1).max(1000).parse(req.query.page??1)));
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
      res.json(await internationalTestAdminUseCases.listImportVersions(req.params.id,z.coerce.number().int().min(1).max(1000).parse(req.query.page??1)));
    }));

    router.get('/:id/relationships', asyncHandler(async (req: Request, res: Response) => {
      const locale = req.query.locale === 'en' ? 'en' : 'ar';
      res.json(await crossDomainGraphReadService.getInternationalTestGraphById(req.params.id, { locale, page: 1, pageSize: 50 }));
    }));

    router.get('/:id/readiness', asyncHandler(async (req: Request, res: Response) => {
      res.json(await internationalTestAdminUseCases.checkPublicationReadiness(req.params.id));
    }));

    router.post('/:id/verify-source', SecurityMiddlewareFactory.createAdminPermissionGuard('admin:international-tests:verify'), asyncHandler(async (req: Request, res: Response) => {
      emptyMutationBody.parse(req.body ?? {});
      await internationalTestAdminUseCases.verifySource(req.params.id, mutationContext(req));
      res.json({ success: true });
    }));

    router.post('/:id/review-source-names', SecurityMiddlewareFactory.createAdminPermissionGuard('admin:international-tests:review'), asyncHandler(async (req: Request, res: Response) => {
      const parsed = reviewSourceNamesSchema.parse(req.body);
      const updated = await internationalTestAdminUseCases.reviewSourceNames(req.params.id, parsed, mutationContext(req));
      res.json(updated);
    }));

    router.post('/:id/correct-draft-canonical-identity', asyncHandler(async (req: Request, res: Response) => {
      const parsed = correctDraftCanonicalIdentitySchema.parse(req.body);
      const updated = await internationalTestAdminUseCases.correctDraftCanonicalIdentity(req.params.id, parsed, mutationContext(req));
      res.json(updated);
    }));

    const reason = z.string().trim().min(3).max(2000);
    const pageQuery = z.object({page:z.coerce.number().int().min(1).max(1000).default(1)}).strict();
    router.get('/:id/usage', SecurityMiddlewareFactory.createAdminPermissionGuard('admin:universities:manage'), asyncHandler(async(req,res)=>{
      if (!cradle.internationalTestConsumerReadGateway) throw new Error('INTERNATIONAL_TEST_CONSUMER_GATEWAY_UNAVAILABLE');
      res.json(await cradle.internationalTestConsumerReadGateway.usage(req.params.id,pageQuery.parse(req.query).page));
    }));
    router.get('/:id/governance-history',asyncHandler(async(req,res)=>res.json(await internationalTestAdminUseCases.govern(req.params.id,'HISTORY',pageQuery.parse(req.query)))));
    router.get('/:id/timeline', SecurityMiddlewareFactory.createAdminPermissionGuard('admin:audit:manage'), asyncHandler(async(req,res)=>{
      if (!cradle.auditRecordRepo) throw new Error('AUDIT_REPOSITORY_UNAVAILABLE');
      const query=z.object({cursor:z.string().optional()}).strict().parse(req.query);
      let raw:unknown=null;if(query.cursor){try{raw=JSON.parse(query.cursor);}catch{throw new Error('INTERNATIONAL_TEST_CURSOR_INVALID');}}
      const parsed=raw?z.object({timestamp:z.coerce.date(),id:z.string().min(1)}).strict().parse(raw):null;
      const page=await cradle.auditRecordRepo.queryPage({targetId:req.params.id,targetType:'INTERNATIONAL_TEST',limit:25,cursor:parsed});
      res.json({data:page.items.map(row=>({action:row.getAction().getValue(),actorId:row.getActor().getActorId(),timestamp:row.getTimestamp().getValue(),correlationId:row.getCorrelationReference()?.getValue(),reason:row.getContextMetadata().getData().reason})),nextCursor:page.nextCursor,hasMore:page.hasMore});
    }));
    router.post('/:id/remove-relationship',asyncHandler(async(req,res)=>{
      const input=z.object({kind:z.enum(['COUNTRY','LANGUAGE','TAXONOMY','DEGREE']),referenceId:z.string().min(1),relationshipType:z.string().min(1),reason}).strict().parse(req.body);
      res.json(await internationalTestAdminUseCases.govern(req.params.id,'REMOVE_RELATIONSHIP',input,mutationContext(req)));
    }));
    router.post('/:id/profile',asyncHandler(async(req,res)=>{
      const input=z.object({kind:z.enum(['SESSION','CENTER','REQUIREMENT','POLICY','EQUIVALENCY']),payload:z.record(z.string(),z.unknown()),reason,evidenceReference:z.string().trim().min(1).max(1000)}).strict().parse(req.body);
      res.json(await internationalTestAdminUseCases.govern(req.params.id,'PROFILE',input,mutationContext(req)));
    }));
    router.post('/:id/review-block', SecurityMiddlewareFactory.createAdminPermissionGuard('admin:international-tests:review'),asyncHandler(async(req,res)=>{
      const input=z.object({versionId:z.string().min(1),sourceHash:z.string().regex(/^[a-f0-9]{64}$/i),blockId:z.string().min(1),decision:z.enum(['APPROVED','IGNORED','MAPPED']),mappingReference:z.string().max(500).optional(),reason}).strict().parse(req.body);
      res.json(await internationalTestAdminUseCases.govern(req.params.id,'BLOCK',input,mutationContext(req)));
    }));
    router.post('/:id/revoke-source', SecurityMiddlewareFactory.createAdminPermissionGuard('admin:international-tests:verify'),asyncHandler(async(req,res)=>res.json(await internationalTestAdminUseCases.govern(req.params.id,'REVOKE',z.object({reason}).strict().parse(req.body),mutationContext(req)))));
    router.post('/:id/manual-names', SecurityMiddlewareFactory.createAdminPermissionGuard('admin:international-tests:review'),asyncHandler(async(req,res)=>res.json(await internationalTestAdminUseCases.manualNames(req.params.id,z.object({localizedNameAr:z.string().trim().min(1),localizedNameEn:z.string().trim().min(1),reason}).strict().parse(req.body),mutationContext(req)))));
    router.post('/:id/review-transition', SecurityMiddlewareFactory.createAdminPermissionGuard('admin:international-tests:review'),asyncHandler(async(req,res)=>{
      const input=z.object({status:z.enum(['READY_TO_REVIEW','NEEDS_REVIEW','REJECTED']),reason}).strict().parse(req.body);
      await internationalTestAdminUseCases.transition(req.params.id,input.status as InternationalTestStatus,mutationContext(req)); res.json({success:true});
    }));
    router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
      const test=await internationalTestAdminUseCases.get(req.params.id); res.setHeader('ETag',`"${test.revision??0}"`); res.json(test);
    }));

    router.patch('/:id', asyncHandler(async (req: Request, res: Response) => {
      const parsed = rootUpdateSchema.parse(req.body);
      res.json(await internationalTestAdminUseCases.updateTest(req.params.id, parsed as unknown as Partial<UpsertInternationalTestDto>, mutationContext(req)));
    }));

    router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
      const parsed = rootUpdateSchema.parse(req.body);
      res.json(await internationalTestAdminUseCases.updateTest(req.params.id, parsed as unknown as Partial<UpsertInternationalTestDto>, mutationContext(req)));
    }));

    router.post('/:id/mark-publishable', SecurityMiddlewareFactory.createAdminPermissionGuard('admin:international-tests:review'), asyncHandler(async (req: Request, res: Response) => {
      emptyMutationBody.parse(req.body ?? {});
      await internationalTestAdminUseCases.markReadyToPublish(req.params.id, mutationContext(req));
      res.json({ success: true });
    }));

    router.post('/:id/publish', SecurityMiddlewareFactory.createAdminPermissionGuard('admin:international-tests:publish'), asyncHandler(async (req: Request, res: Response) => {
      emptyMutationBody.parse(req.body ?? {});
      await internationalTestAdminUseCases.publish(req.params.id, mutationContext(req));
      res.json({ success: true });
    }));

    router.post('/:id/unpublish', SecurityMiddlewareFactory.createAdminPermissionGuard('admin:international-tests:publish'), asyncHandler(async (req: Request, res: Response) => {
      emptyMutationBody.parse(req.body ?? {});
      await internationalTestAdminUseCases.unpublish(req.params.id, mutationContext(req));
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
      const persistenceCode=err&&typeof err==='object'&&'code' in err?String(err.code):'';
      let message = persistenceCode==='P2025'?'INTERNATIONAL_TEST_CHILD_OWNER_NOT_FOUND':persistenceCode==='P2002'?'INTERNATIONAL_TEST_IDENTITY_CONFLICT':err instanceof Error ? err.message : '';
      if(message.startsWith('Invalid score scale:'))message='INTERNATIONAL_TEST_SCORE_POLICY_INVALID';
      else if(message.startsWith('Invalid section scores:'))message='INTERNATIONAL_TEST_SECTION_SCORE_POLICY_INVALID';
      else if(message.startsWith('Validation failed'))message='INTERNATIONAL_TEST_VALIDATION_FAILED';
      else if(message.includes('not found'))message='INTERNATIONAL_TEST_NOT_FOUND';
      const known=/^[A-Z][A-Z0-9_]+$/.test(message); const code=known?message:'INTERNATIONAL_TEST_COMMAND_FAILED';
      const status=message.includes('CONFLICT')||message.includes('STALE')?409:message.includes('not found')||message.includes('NOT_FOUND')?404:message.includes('ACTOR')?401:message.includes('UNTRUSTED')||message.includes('POLICY_INVALID')||message.includes('VALIDATION_FAILED')||message.includes('NOT_READY')?422:known?400:500;
      res.status(status).json({type:'about:blank',status,code,detail:known?code:'Unable to complete this operation',traceId:_req.get('X-Request-Id')});
    });

    return router;
  }
}
