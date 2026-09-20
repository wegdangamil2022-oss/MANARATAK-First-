import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  ScholarshipStatus,
  ScholarshipCompletenessState,
  ScholarshipVerificationStatus,
  UpdateScholarshipDto,
  type IScholarshipRepository,
} from '@manaratak/domain';
import {
  AdminScholarshipUseCases,
  ManageAuditRecordsUseCase,
  AtomicDomainMutationCoordinator,
  ImportAdminUseCases,
  ScholarshipImportAtomicTransferUseCase,
  ScholarshipImportCenterUseCases,
  ScholarshipImportNewUseCase,
  ScholarshipSourceRegistryService,
  ScholarshipImportDecisionUseCases,
  type IScholarshipImportVerificationDecisionPort,
  type IScholarshipImportCanonicalResolutionDecisionPort,
  type IScholarshipImportAtomicGateway,
  type IScholarshipImportCenterGateway,
  type ScholarshipImportOperationalClass,
} from '@manaratak/application';

export class ScholarshipAdminRouter {
  public static create(cradle: {
    adminScholarshipUseCases: AdminScholarshipUseCases;
    manageAuditRecordsUseCase?: ManageAuditRecordsUseCase;
    atomicDomainMutationCoordinator?: AtomicDomainMutationCoordinator;
    importAdminUseCases?: ImportAdminUseCases;
    importRepository?: IScholarshipImportCenterGateway;
    scholarshipRepository?: IScholarshipRepository;
    scholarshipSourceRegistryService?: ScholarshipSourceRegistryService;
    scholarshipImportNewUseCase?: ScholarshipImportNewUseCase;
    scholarshipImportVerificationDecisionPort?: IScholarshipImportVerificationDecisionPort;
    scholarshipImportCanonicalResolutionDecisionPort?: IScholarshipImportCanonicalResolutionDecisionPort;
    scholarshipImportDecisionUseCases?: ScholarshipImportDecisionUseCases;
  }): Router {
    const router = Router();
    const {
      adminScholarshipUseCases,
      manageAuditRecordsUseCase,
      atomicDomainMutationCoordinator,
      importAdminUseCases,
      importRepository,
      scholarshipRepository,
      scholarshipSourceRegistryService,
      scholarshipImportNewUseCase,
      scholarshipImportVerificationDecisionPort,
      scholarshipImportCanonicalResolutionDecisionPort,
      scholarshipImportDecisionUseCases,
    } = cradle;
    const atomicImportGateway = importRepository as
      (IScholarshipImportCenterGateway & Partial<IScholarshipImportAtomicGateway>) | undefined;
    const atomicTransfer =
      atomicImportGateway &&
      scholarshipRepository &&
      atomicDomainMutationCoordinator &&
      typeof atomicImportGateway.withTransaction === 'function'
        ? new ScholarshipImportAtomicTransferUseCase(
            atomicImportGateway as IScholarshipImportAtomicGateway,
            scholarshipRepository,
            atomicDomainMutationCoordinator,
            scholarshipImportVerificationDecisionPort,
            scholarshipImportCanonicalResolutionDecisionPort,
          )
        : undefined;
    const scholarshipImportCenterUseCases =
      importRepository && scholarshipRepository
        ? new ScholarshipImportCenterUseCases(
            importRepository,
            scholarshipRepository,
            atomicTransfer,
            atomicTransfer,
            scholarshipSourceRegistryService,
            scholarshipImportVerificationDecisionPort,
            scholarshipImportCanonicalResolutionDecisionPort,
          )
        : undefined;

    // Middleware to catch async errors
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
        source: 'admin-scholarship-api',
      };
    };

    const listQuerySchema = z.object({
      status: z.nativeEnum(ScholarshipStatus).optional(),
      completenessStatus: z.nativeEnum(ScholarshipCompletenessState).optional(),
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
      verificationStatus: z.nativeEnum(ScholarshipVerificationStatus).optional(),
      translationState: z.enum(['NEEDS_TRANSLATION', 'TRANSLATED']).optional(),
      deadlineFrom: z.string().datetime().transform((value) => new Date(value)).optional(),
      deadlineTo: z.string().datetime().transform((value) => new Date(value)).optional(),
      sourceType: z.string().min(1).optional(),
      query: z.string().trim().min(1).max(200).optional(),
      page: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 1)),
      pageSize: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 20)),
    }).strict();

    const legacyScholarshipImportSchema = z.object({
      dataText: z.string().min(1).max(90 * 1024),
      sourceSystem: z.string().trim().min(1).max(120).optional(),
    }).strict();

    const operationalClassSchema = z.enum(['REAL', 'TEST', 'DEMO', 'ARCHIVED', 'UNCLASSIFIED']);
    const importCenterQuerySchema = z.object({
      batchId: z.string().min(1).optional(),
      status: z.string().min(1).optional(),
      operationalClass: operationalClassSchema.optional(),
      page: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 1)),
      pageSize: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 50)),
    });
    const importCenterDecisionSchema = z.object({
      action: z.enum(['MERGE', 'KEEP_CURRENT', 'SPLIT']),
      reason: z.string().max(2000).optional(),
    });
    const sourceConfigSchema = z.object({
      sourceId: z.string().min(1),
      sourceName: z.string().min(1),
      baseUrl: z.string().url().optional(),
      sourceType: z.enum([
        'SCHOLARSHIP_WEBSITE',
        'GOVERNMENT_SCHOLARSHIP_PORTAL',
        'FOUNDATION_DONOR_PORTAL',
        'AGGREGATOR',
        'MANUAL_FILE',
      ]),
      status: z.enum(['ACTIVE', 'DISABLED', 'NOT_CONFIGURED']),
      acquisitionMode: z.enum(['WEBSITE', 'SITEMAP', 'FEED', 'API', 'MANUAL_FILE']),
      allowedUrlScope: z
        .object({
          allowedOrigins: z.array(z.string().url()).min(1),
          allowedPathPrefixes: z.array(z.string()).optional(),
          allowSubdomains: z.boolean().optional(),
        })
        .optional(),
      rateLimitPolicy: z
        .object({
          requestsPerMinute: z.number().int().positive(),
          burstLimit: z.number().int().positive().optional(),
          minimumDelayMs: z.number().int().nonnegative().optional(),
        })
        .optional(),
      lastExecution: z.object({
        state: z.enum(['NEVER_RUN', 'SUCCEEDED', 'FAILED', 'PARTIAL']),
        executionId: z.string().optional(),
        startedAt: z.string().optional(),
        finishedAt: z.string().optional(),
        recordsObserved: z.number().int().nonnegative().optional(),
        errorsObserved: z.number().int().nonnegative().optional(),
        durationMs: z.number().nonnegative().optional(),
      }),
    });
    const importNewSchema = z.object({
      sourceId: z.string().min(1),
      targetUrl: z.string().url().optional(),
      parserHint: z.enum(['json', 'ndjson', 'csv']).optional(),
      structuredContent: z.unknown().optional(),
      fileName: z.string().max(512).optional(),
      contentType: z.string().max(256).optional(),
      approvedAssetReference: z.string().max(1024).optional(),
    });
    const verificationSchema = z.object({
      state: z.enum(['VERIFIED', 'FAILED']),
      reason: z.string().min(1).max(2000),
      evidence: z.record(z.string(), z.unknown()).optional(),
    });
    const canonicalResolutionSchema = z.object({
      fieldOrRequirementKey: z.string().min(1),
      canonicalEntityType: z.enum([
        'PROVIDER_UNIVERSITY',
        'UNIVERSITY',
        'COUNTRY',
        'LANGUAGE',
        'CURRENCY',
        'DEGREE_LEVEL',
        'MAJOR',
        'INTERNATIONAL_TEST',
        'ACADEMIC_PROGRAM',
      ]),
      canonicalId: z.string().min(1).optional(),
      rawValue: z.string().min(1),
      resolutionType: z.enum(['RESOLVED', 'NOT_APPLICABLE', 'REJECTED']),
      reason: z.string().max(2000).optional(),
    });
    const requireImportCenter = () => {
      if (!scholarshipImportCenterUseCases) {
        throw new Error('SCHOLARSHIP_IMPORT_CENTER_NOT_CONFIGURED');
      }
      return scholarshipImportCenterUseCases;
    };

    const nullableText = z.string().max(10000).nullable().optional();
    const benefitSchema = z.object({
      benefitKey: z.string().min(1),
      benefitTypeCode: z.string().min(1),
      coverageTypeCode: nullableText,
      amount: z.union([z.string(), z.number()]).nullable().optional(),
      valueText: nullableText,
      durationText: nullableText,
      frequencyCode: nullableText,
      isCovered: z.boolean().optional(),
      isOptional: z.boolean().optional(),
      displayOrder: z.number().int().optional(),
      notes: nullableText,
    });
    const degreeTargetSchema = z.object({
      targetKey: z.string().min(1),
      sourceLabel: nullableText,
    });
    const majorTargetSchema = z.object({
      targetKey: z.string().min(1),
      sourceLabel: nullableText,
    });
    const eligibilityItemSchema = z.object({
      itemKey: z.string().min(1),
      itemTypeCode: z.string().min(1),
      operatorCode: nullableText,
      valueText: nullableText,
      minimumValue: z.union([z.string(), z.number()]).nullable().optional(),
      maximumValue: z.union([z.string(), z.number()]).nullable().optional(),
      isRequired: z.boolean().optional(),
      priorityOrder: z.number().int().optional(),
    });
    const requiredDocumentSchema = z.object({
      documentKey: z.string().min(1),
      documentTypeCode: nullableText,
      displayName: z.string().min(1),
      description: nullableText,
      sourceLabel: nullableText,
      isRequired: z.boolean().optional(),
      displayOrder: z.number().int().optional(),
    });

    const canonicalRelationshipsSchema = z.object({
      countryReferenceId: z.string().min(1).nullable().optional(),
      studyLanguageReferenceId: z.string().min(1).nullable().optional(),
      benefits: z.array(benefitSchema.extend({
        currencyReferenceId: z.string().min(1).nullable().optional(),
        metadata: z.record(z.string(), z.unknown()).nullable().optional(),
      })).optional(),
      degreeTargets: z.array(degreeTargetSchema.extend({
        degreeLevelId: z.string().min(1).nullable().optional(),
        metadata: z.record(z.string(), z.unknown()).nullable().optional(),
      })).optional(),
      majorTargets: z.array(majorTargetSchema.extend({
        majorId: z.string().min(1).nullable().optional(),
        metadata: z.record(z.string(), z.unknown()).nullable().optional(),
      })).optional(),
      eligibilityItems: z.array(eligibilityItemSchema.extend({
        countryReferenceId: z.string().min(1).nullable().optional(),
        degreeLevelId: z.string().min(1).nullable().optional(),
        majorId: z.string().min(1).nullable().optional(),
        internationalTestId: z.string().min(1).nullable().optional(),
        metadata: z.record(z.string(), z.unknown()).nullable().optional(),
      })).optional(),
      requiredDocumentItems: z.array(requiredDocumentSchema.extend({
        internationalTestId: z.string().min(1).nullable().optional(),
        metadata: z.record(z.string(), z.unknown()).nullable().optional(),
      })).optional(),
      universityLinks: z.array(z.object({
        linkKey: z.string().min(1),
        universityId: z.string().min(1).nullable().optional(),
        academicProgramId: z.string().min(1).nullable().optional(),
        sourceLabel: nullableText,
        relationshipTypeCode: z.string().min(1).optional(),
        metadata: z.record(z.string(), z.unknown()).nullable().optional(),
      })).optional(),
    }).strict();

    const updateBodySchema = z.object({
      displayName: z.string().min(1).optional(),
      providerName: nullableText,
      amountMinorUnits: nullableText,
      amountCurrencyCode: nullableText,
      isFullyFunded: z.boolean().optional(),
      applicationDeadline: z
        .union([z.string(), z.date(), z.null()])
        .optional()
        .transform((value) => (value ? new Date(value) : value === null ? null : undefined)),
      officialWebsite: nullableText,
      sourceUrl: nullableText,
      academicYear: nullableText,
      cycleName: nullableText,
      countrySourceLabel: nullableText,
      countryScope: nullableText,
      fundingTypeCode: nullableText,
      deadlineType: nullableText,
      applicationMethod: nullableText,
      applicationUrl: nullableText,
      officialSourceUrl: nullableText,
      sourceLocale: nullableText,
      studyLanguageSourceLabel: nullableText,
      benefits: z.array(benefitSchema).optional(),
      degreeTargets: z.array(degreeTargetSchema).optional(),
      majorTargets: z.array(majorTargetSchema).optional(),
      eligibilityItems: z.array(eligibilityItemSchema).optional(),
      requiredDocumentItems: z.array(requiredDocumentSchema).optional(),

      fundingCoverage: z.string().optional(),
      coverageDetails: z.string().optional(),
      eligibleMajorsOrFields: z.union([z.string(), z.array(z.string())]).optional(),
      degreeLevel: z.string().optional(),
      requiredDocuments: z.union([z.string(), z.array(z.string())]).optional(),
      eligibilityCriteria: z.string().optional(),
      studyLanguage: z.string().optional(),
      studyCountry: z.string().optional(),
      applicationLink: z.string().optional(),
      sponsorName: z.string().optional(),
      targetUniversities: z.array(z.string()).optional(),
      targetAcademicPrograms: z.array(z.string()).optional(),
      fundingAmount: z.union([z.string(), z.number()]).optional(),
      currency: z.string().optional(),
      duration: z.string().optional(),
      localizedNames: z.record(z.string(), z.string()).optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    });

    // GET /admin/scholarships
    router.get(
      '/',
      asyncHandler(async (req: Request, res: Response) => {
        const filters = listQuerySchema.parse(req.query);
        const result = await adminScholarshipUseCases.listScholarships(filters);
        res.json(result);
      }),
    );
    router.get(
      '/summary',
      asyncHandler(async (_req: Request, res: Response) => {
        res.json(await adminScholarshipUseCases.getScholarshipSummary());
      }),
    );

    const createBodySchema = z
      .object({
        displayName: z.string().optional(),
        scholarshipName: z.string().optional(),
        fundingCoverage: z.string().min(1, 'Funding coverage is required'),
        coverageDetails: z.string().optional(),
        eligibleMajorsOrFields: z.union([z.string(), z.array(z.string())]).optional(),
        degreeLevel: z.string().min(1, 'Degree level is required'),
        requiredDocuments: z.union([z.string(), z.array(z.string())]).optional(),
        eligibilityCriteria: z.string().optional(),
        studyLanguage: z.string().optional(),
        applicationDeadline: z
          .union([z.string(), z.date()])
          .optional()
          .transform((val) => (val ? new Date(val) : null)),
        studyCountry: z.string().optional(),
        applicationLink: z.string().optional(),
        officialSourceUrl: z.string().optional(),
        sponsorName: z.string().optional(),
        fundingAmount: z
          .union([z.string(), z.number()])
          .optional()
          .transform((val) => (val ? String(val) : undefined)),
        currency: z.string().optional(),
        duration: z.string().optional(),
      })
      .refine((data) => !!(data.displayName || data.scholarshipName), {
        message: 'Scholarship name is required',
        path: ['displayName'],
      })
      .refine((data) => !!(data.applicationLink?.trim() || data.officialSourceUrl?.trim()), {
        message: 'Either application link or official source URL is required',
        path: ['applicationLink'],
      });

    // POST /admin/scholarships
    router.post(
      '/',
      asyncHandler(async (req: Request, res: Response) => {
        const payload = createBodySchema.parse(req.body);
        const scholarshipName = payload.displayName || payload.scholarshipName || '';

        const scholarship = await adminScholarshipUseCases.createScholarship(
          {
            displayName: scholarshipName,
            fundingCoverage: payload.fundingCoverage,
            coverageDetails: payload.coverageDetails,
            eligibleMajorsOrFields: payload.eligibleMajorsOrFields,
            degreeLevel: payload.degreeLevel,
            studyCountry: payload.studyCountry,
            applicationDeadline: payload.applicationDeadline,
            sponsorName: payload.sponsorName,
            applicationLink: payload.applicationLink,
            officialSourceUrl: payload.officialSourceUrl,
            eligibilityCriteria: payload.eligibilityCriteria,
            requiredDocuments: payload.requiredDocuments,
            studyLanguage: payload.studyLanguage,
            fundingAmount: payload.fundingAmount,
            currency: payload.currency,
            duration: payload.duration,
          },
          mutationContext(req),
        );

        res.status(201).json(scholarship);
      }),
    );

    // Import Endpoints
    router.post(
      '/import',
      asyncHandler(async (req: Request, res: Response) => {
        if (!importAdminUseCases) throw new Error('Import use cases not configured');
        const { dataText, sourceSystem } = legacyScholarshipImportSchema.parse(req.body);
        const result = await importAdminUseCases.importData({
          dataText,
          sourceSystem,
          dataType: 'SCHOLARSHIPS',
        });
        res.status(201).json(result);
      }),
    );

    // WP12-7 Scholarship Import Center Backend (API -> Application -> existing Phase 6 store)
    router.get(
      '/import-center/overview',
      asyncHandler(async (req: Request, res: Response) => {
        const operationalClass = operationalClassSchema
          .optional()
          .parse(req.query.operationalClass) as ScholarshipImportOperationalClass | undefined;
        res.json(await requireImportCenter().getOverview(operationalClass ?? 'REAL'));
      }),
    );

    router.get(
      '/import-center/sources',
      asyncHandler(async (_req: Request, res: Response) => {
        res.json(await requireImportCenter().listSources());
      }),
    );

    router.post(
      '/import-center/sources',
      asyncHandler(async (req: Request, res: Response) => {
        if (!scholarshipSourceRegistryService)
          throw new Error('SCHOLARSHIP_SOURCE_REGISTRY_NOT_CONFIGURED');
        const source = sourceConfigSchema.parse(req.body);
        const result = await scholarshipSourceRegistryService.register(source);
        res.status(201).json(result);
      }),
    );

    router.patch(
      '/import-center/sources/:sourceId/status',
      asyncHandler(async (req: Request, res: Response) => {
        if (!scholarshipSourceRegistryService)
          throw new Error('SCHOLARSHIP_SOURCE_REGISTRY_NOT_CONFIGURED');
        const status = z.object({ status: z.enum(['ACTIVE', 'DISABLED']) }).parse(req.body).status;
        const updated = await scholarshipSourceRegistryService.updateStatus(
          req.params.sourceId,
          status,
        );
        if (!updated) throw new Error('SCHOLARSHIP_SOURCE_NOT_FOUND');
        res.json({ sourceId: req.params.sourceId, status });
      }),
    );

    router.post(
      '/import-center/import-new',
      asyncHandler(async (req: Request, res: Response) => {
        if (!scholarshipImportNewUseCase) throw new Error('SCHOLARSHIP_IMPORT_NEW_NOT_CONFIGURED');
        const payload = importNewSchema.parse(req.body);
        const context = mutationContext(req);
        const result = await scholarshipImportNewUseCase.execute({
          sourceId: payload.sourceId,
          targetUrl: payload.targetUrl,
          parserHint: payload.parserHint,
          manualInput:
            payload.structuredContent !== undefined
              ? {
                  structuredContent: payload.structuredContent,
                  fileName: payload.fileName,
                  contentType: payload.contentType,
                  approvedAssetReference: payload.approvedAssetReference,
                }
              : undefined,
          correlationId: context.correlationId,
        });
        res.status(result.state === 'REJECTED_SOURCE' ? 400 : 201).json(result);
      }),
    );

    router.get(
      '/import-center/records',
      asyncHandler(async (req: Request, res: Response) => {
        const query = importCenterQuerySchema.parse(req.query);
        res.json(await requireImportCenter().listRecords(query));
      }),
    );

    router.get(
      '/import-center/records/:id/diff',
      asyncHandler(async (req: Request, res: Response) => {
        res.json(await requireImportCenter().getDiff(req.params.id));
      }),
    );

    router.get(
      '/import-center/records/:id/merge-proposal',
      asyncHandler(async (req: Request, res: Response) => {
        res.json(await requireImportCenter().getMergeProposal(req.params.id));
      }),
    );

    router.get(
      '/import-center/records/:id',
      asyncHandler(async (req: Request, res: Response) => {
        res.json(await requireImportCenter().getRecord(req.params.id));
      }),
    );

    router.get(
      '/import-center/screening',
      asyncHandler(async (req: Request, res: Response) => {
        const query = importCenterQuerySchema.parse(req.query);
        res.json(await requireImportCenter().listScreening(query));
      }),
    );

    router.get(
      '/import-center/duplicates',
      asyncHandler(async (req: Request, res: Response) => {
        const query = importCenterQuerySchema.parse(req.query);
        res.json(await requireImportCenter().listDuplicatesAndUpdates(query));
      }),
    );

    router.get(
      '/import-center/missing-data',
      asyncHandler(async (req: Request, res: Response) => {
        const query = importCenterQuerySchema.parse(req.query);
        res.json(await requireImportCenter().listMissingData(query));
      }),
    );

    router.get(
      '/import-center/verification',
      asyncHandler(async (req: Request, res: Response) => {
        const query = importCenterQuerySchema.parse(req.query);
        res.json(await requireImportCenter().listVerification(query));
      }),
    );

    router.post(
      '/import-center/records/:id/verification',
      asyncHandler(async (req: Request, res: Response) => {
        if (!scholarshipImportDecisionUseCases)
          throw new Error('SCHOLARSHIP_IMPORT_VERIFICATION_NOT_CONFIGURED');
        const payload = verificationSchema.parse(req.body);
        const context = mutationContext(req);
        res
          .status(201)
          .json(
            await scholarshipImportDecisionUseCases.recordVerification({
              recordId: req.params.id,
              state: payload.state,
              actorId: context.actorId,
              reason: payload.reason,
              evidence: payload.evidence,
              correlationId: context.correlationId,
            }),
          );
      }),
    );

    router.post(
      '/import-center/records/:id/canonical-resolution',
      asyncHandler(async (req: Request, res: Response) => {
        if (!scholarshipImportDecisionUseCases)
          throw new Error('SCHOLARSHIP_IMPORT_CANONICAL_RESOLUTION_NOT_CONFIGURED');
        const payload = canonicalResolutionSchema.parse(req.body);
        const context = mutationContext(req);
        res
          .status(201)
          .json(
            await scholarshipImportDecisionUseCases.recordCanonical({
              recordId: req.params.id,
              ...payload,
              actorId: context.actorId,
              correlationId: context.correlationId,
            }),
          );
      }),
    );

    router.get(
      '/import-center/review-queue',
      asyncHandler(async (req: Request, res: Response) => {
        const query = importCenterQuerySchema.parse(req.query);
        res.json(await requireImportCenter().listReviewQueue(query));
      }),
    );

    router.get(
      '/import-center/ready-to-transfer',
      asyncHandler(async (req: Request, res: Response) => {
        const query = importCenterQuerySchema.parse(req.query);
        res.json(await requireImportCenter().listReadyToTransfer(query));
      }),
    );

    router.get(
      '/import-center/history',
      asyncHandler(async (req: Request, res: Response) => {
        const query = importCenterQuerySchema.parse(req.query);
        res.json(await requireImportCenter().listHistory(query));
      }),
    );

    router.post(
      '/import-center/records/:id/decision',
      asyncHandler(async (req: Request, res: Response) => {
        const payload = importCenterDecisionSchema.parse(req.body);
        const context = mutationContext(req);
        try {
          const result = await requireImportCenter().recordDecision({
            recordId: req.params.id,
            action: payload.action,
            actorId: context.actorId,
            reason: payload.reason,
            correlationId: context.correlationId,
          });
          res.status(201).json(result);
        } catch (error) {
          if (
            error instanceof Error &&
            error.message === 'SCHOLARSHIP_IMPORT_REVIEW_DECISION_PORT_NOT_CONFIGURED'
          ) {
            res.status(501).json({ error: error.message });
            return;
          }
          throw error;
        }
      }),
    );

    router.post(
      '/import-center/records/:id/transfer',
      asyncHandler(async (req: Request, res: Response) => {
        const context = mutationContext(req);
        const result = await requireImportCenter().transfer({
          recordId: req.params.id,
          actorId: context.actorId,
          correlationId: context.correlationId,
        });
        res.status(201).json(result);
      }),
    );

    router.get(
      '/imported-records',
      asyncHandler(async (req: Request, res: Response) => {
        if (!importAdminUseCases) throw new Error('Import use cases not configured');
        const batchId = req.query.batchId as string;
        const status = req.query.status as string;
        const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
        const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 50;

        const records = await importAdminUseCases.listRecords({ batchId, status, page, pageSize });
        res.json(records);
      }),
    );

    router.post(
      '/imported-records/:id/promote',
      asyncHandler(async (req: Request, res: Response) => {
        const context = mutationContext(req);
        const result = await requireImportCenter().transfer({
          recordId: req.params.id,
          actorId: context.actorId,
          correlationId: context.correlationId,
        });
        res.status(201).json(result);
      }),
    );

    // WP12-9 canonical catalog detail. Audit records come from the same
    // business-audit store written by AtomicDomainMutationCoordinator.
    router.get(
      '/:id/catalog-detail',
      asyncHandler(async (req: Request, res: Response) => {
        const detail = await adminScholarshipUseCases.getScholarshipCatalogDetail(req.params.id);
        const historyRecords = manageAuditRecordsUseCase
          ? await manageAuditRecordsUseCase.queryAuditRecords({
              targetId: req.params.id,
              category: 'SCHOLARSHIPS_MUTATION',
            })
          : [];
        const history = historyRecords
          .map((record) => ({
            id: record.getId().getValue(),
            action: record.getAction().getValue(),
            actorId: record.getActor().getActorId(),
            actorType: record.getActor().getActorType(),
            source: record.getSource().getValue(),
            timestamp: record.getTimestamp().getValue().toISOString(),
            correlationReference: record.getCorrelationReference()?.getValue(),
          }))
          .sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp));
        res.json({ ...detail, history, historyAvailable: Boolean(manageAuditRecordsUseCase) });
      }),
    );

    // GET /admin/scholarships/:id
    router.get(
      '/:id',
      asyncHandler(async (req: Request, res: Response) => {
        const scholarship = await adminScholarshipUseCases.getScholarship(req.params.id);
        res.json(scholarship);
      }),
    );

    // PATCH /admin/scholarships/:id
    // WP12-9 writes the normalized Scholarship contract directly. Zod strips
    // immutable/lifecycle fields that are not part of this authoring schema.
    router.patch(
      '/:id',
      asyncHandler(async (req: Request, res: Response) => {
        const updates = updateBodySchema.parse(req.body);
        const scholarship = await adminScholarshipUseCases.updateScholarship(
          req.params.id,
          updates as UpdateScholarshipDto,
          mutationContext(req),
        );
        res.json(scholarship);
      }),
    );


    // PUT /admin/scholarships/:id/canonical-relationships
    // P9/P23 authoring writes canonical IDs through the Scholarship owner Application API.
    router.put(
      '/:id/canonical-relationships',
      asyncHandler(async (req: Request, res: Response) => {
        const input = canonicalRelationshipsSchema.parse(req.body);
        const scholarship = await adminScholarshipUseCases.replaceCanonicalRelationships(
          req.params.id,
          input,
          mutationContext(req),
        );
        res.json(scholarship);
      }),
    );

    // Commands
    router.post(
      '/:id/mark-ready',
      asyncHandler(async (req: Request, res: Response) => {
        await adminScholarshipUseCases.markReadyToReview(req.params.id, mutationContext(req));
        res.status(200).json({ success: true });
      }),
    );

    router.post(
      '/:id/mark-publishable',
      asyncHandler(async (req: Request, res: Response) => {
        await adminScholarshipUseCases.markReadyToPublish(req.params.id, mutationContext(req));
        res.status(200).json({ success: true });
      }),
    );

    router.post(
      '/:id/publish',
      asyncHandler(async (req: Request, res: Response) => {
        await adminScholarshipUseCases.publish(req.params.id, mutationContext(req));
        res.status(200).json({ success: true });
      }),
    );

    router.post(
      '/:id/unpublish',
      asyncHandler(async (req: Request, res: Response) => {
        await adminScholarshipUseCases.unpublish(req.params.id, mutationContext(req));
        res.status(200).json({ success: true });
      }),
    );

    router.post(
      '/:id/reject',
      asyncHandler(async (req: Request, res: Response) => {
        await adminScholarshipUseCases.reject(req.params.id, mutationContext(req));
        res.status(200).json({ success: true });
      }),
    );

    router.post(
      '/:id/archive',
      asyncHandler(async (req: Request, res: Response) => {
        await adminScholarshipUseCases.archive(req.params.id, mutationContext(req));
        res.status(200).json({ success: true });
      }),
    );

    // Simple error handler for Zod errors and Use Case errors
    router.use((err: any, req: Request, res: Response, next: NextFunction) => {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation Error', details: err.issues });
      }
      res.status(400).json({ error: err.message || 'An error occurred' });
    });

    return router;
  }
}
