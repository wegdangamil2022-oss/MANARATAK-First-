import {SecurityMiddlewareFactory} from '../../security/SecurityMiddlewareFactory';
import { requireAuthenticatedPrincipal } from '../../security/AuthenticatedPrincipal';
import { NextFunction, Request, Response, Router } from 'express';
import { z } from 'zod';
import {
  StudyDestinationCompletenessStatus,
  StudyDestinationLivingCostTier,
  StudyDestinationStatus,
} from '@manaratak/domain';
import { CrossDomainGraphReadService, StudyDestinationUseCases } from '@manaratak/application';

const stringList = z.array(z.string().trim().min(1)).max(100);
const costHighlights = z
  .array(
    z.object({
      label: z.string().trim().min(1).max(160),
      value: z.string().trim().min(1).max(240),
    }),
  )
  .max(50);
const officialLinks = z
  .array(
    z.object({
      labelAr: z.string().trim().min(1).max(160),
      labelEn: z.string().trim().max(160).optional(),
      url: z.string().url(),
      category: z.enum([
        'GOVERNMENT_STUDY',
        'IMMIGRATION_VISA',
        'EDUCATION_AUTHORITY',
        'SCHOLARSHIP_PORTAL',
        'COST_OF_LIVING',
        'STUDENT_SUPPORT',
        'OTHER',
      ]),
      noteAr: z.string().trim().max(500).optional(),
      noteEn: z.string().trim().max(500).optional(),
    }),
  )
  .max(50);
const evidenceSources = z
  .array(
    z.object({
      label: z.string().trim().min(1).max(200),
      url: z.string().url(),
      sourceType: z.enum([
        'GOVERNMENT',
        'OFFICIAL_EDUCATION_AUTHORITY',
        'OFFICIAL_IMMIGRATION',
        'OFFICIAL_STATISTICS',
        'OTHER_OFFICIAL',
      ]),
    }).strict(),
  )
  .max(50);

export class StudyDestinationAdminRouter {
  public static create(cradle: {
    studyDestinationUseCases: StudyDestinationUseCases;
    crossDomainGraphReadService: CrossDomainGraphReadService;
  }): Router {
    const router = Router();
    const { studyDestinationUseCases, crossDomainGraphReadService } = cradle;
    const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) =>
      Promise.resolve(fn(req, res, next)).catch(next);

    const mutation = (req: Request, action: string, operation: (owner: StudyDestinationUseCases) => Promise<unknown>) => {
      const context = {actorId: requireAuthenticatedPrincipal(req).principalId, actorType: 'IDENTITY', source: 'admin-study-destinations-api',
        reason: z.string().trim().min(3).max(2000).parse(req.get('X-Review-Reason')),
        expectedUpdatedAt: z.string().datetime().optional().parse(req.body?.expectedUpdatedAt), correlationId: req.get('X-Correlation-ID')};
      return studyDestinationUseCases.executeAdminMutation(req.params.iso2Code, action, context, operation as Parameters<StudyDestinationUseCases['executeAdminMutation']>[3]);
    };

    const listSchema = z.object({
      q: z.string().trim().optional(),
      region: z.string().trim().optional(),
      status: z.preprocess(
        (value) => (value === '' || value === 'ALL' || value === 'all' ? undefined : value),
        z.union([z.nativeEnum(StudyDestinationStatus), z.literal('NO_PROFILE')]).optional(),
      ),
      completenessStatus: z.nativeEnum(StudyDestinationCompletenessStatus).optional(),
      missingCheck: z.enum(['OVERVIEW','ACADEMICS','VISA','LIVING_COST','OFFICIAL_LINKS','EVIDENCE']).optional(),
      page: z.coerce.number().int().min(1).optional(),
      pageSize: z.coerce.number().int().min(1).max(100).optional(),
    });

    const profileSchema = z
      .object({
        expectedUpdatedAt: z.string().datetime().optional(),
        overviewAr: z.string().max(12000).nullable().optional(),
        overviewEn: z.string().max(12000).nullable().optional(),
        studySystemSummaryAr: z.string().max(12000).nullable().optional(),
        studySystemSummaryEn: z.string().max(12000).nullable().optional(),
        admissionHighlightsAr: stringList.optional(),
        admissionHighlightsEn: stringList.optional(),
        visaSummaryAr: z.string().max(12000).nullable().optional(),
        visaSummaryEn: z.string().max(12000).nullable().optional(),
        visaRequirementsAr: stringList.optional(),
        visaRequirementsEn: stringList.optional(),
        visaOfficialUrl: z.string().url().nullable().optional(),
        livingCostTier: z.nativeEnum(StudyDestinationLivingCostTier).nullable().optional(),
        averageMonthlyLivingCostMin: z.number().nonnegative().nullable().optional(),
        averageMonthlyLivingCostMax: z.number().nonnegative().nullable().optional(),
        livingCostCurrencyReferenceId: z.string().uuid().nullable().optional(),
        costHighlightsAr: costHighlights.optional(),
        costHighlightsEn: costHighlights.optional(),
        studentLifeHighlightsAr: stringList.optional(),
        studentLifeHighlightsEn: stringList.optional(),
        officialLinks: officialLinks.optional(),
        sourceAuditDate: z.string().datetime().nullable().optional(),
        evidenceSources: evidenceSources.optional(),
        imageAssetId: z.string().uuid().nullable().optional(),
        studyLanguageReferenceIds: z.array(z.string().uuid()).max(30).optional(),
        isFeatured: z.boolean().optional(),
      })
      .strict();

    router.get(
      '/',
      asyncHandler(async (req: Request, res: Response) => {
        res.json(await studyDestinationUseCases.listAdmin(listSchema.parse(req.query)));
      }),
    );

    router.get('/review-policy',asyncHandler(async(_req:Request,res:Response)=>{res.json(await studyDestinationUseCases.reviewPolicy());}));
    router.put('/review-policy',SecurityMiddlewareFactory.createAdminPermissionGuard('admin:study-destinations:publish'),asyncHandler(async(req:Request,res:Response)=>{
      const body=z.object({maxEvidenceAgeDays:z.number().int().min(1).max(36500).nullable(),expectedUpdatedAt:z.string().datetime().nullable()}).strict().parse(req.body);
      res.json(await studyDestinationUseCases.configureReviewPolicy(body.maxEvidenceAgeDays,body.expectedUpdatedAt,{actorId:requireAuthenticatedPrincipal(req).principalId,source:'admin-study-destinations-api',reason:z.string().trim().min(3).max(2000).parse(req.get('X-Review-Reason'))}));
    }));
    router.get('/:iso2Code/history',SecurityMiddlewareFactory.createAdminPermissionGuard('admin:study-destinations:review'),asyncHandler(async(req:Request,res:Response)=>{const page=z.coerce.number().int().min(1).max(10000).parse(req.query.page??1);res.set('Cache-Control','no-store');res.json(await studyDestinationUseCases.history(req.params.iso2Code,page));}));

    router.get(
      '/:iso2Code',
      asyncHandler(async (req: Request, res: Response) => {
        res.json(await studyDestinationUseCases.getAdminByCountryIso2(req.params.iso2Code));
      }),
    );

    router.get(
      '/:iso2Code/relationships',
      asyncHandler(async (req: Request, res: Response) => {
        const query = z
          .object({
            page: z.coerce.number().int().min(1).optional(),
            pageSize: z.coerce.number().int().min(1).max(50).optional(),
            locale: z.enum(['ar', 'en']).optional(),
          })
          .parse(req.query);
        res.json(
          await crossDomainGraphReadService.getCountryGraphByIso2Code(req.params.iso2Code, query),
        );
      }),
    );

    router.put(
      '/:iso2Code/profile',
      SecurityMiddlewareFactory.createAdminPermissionGuard('admin:study-destinations:edit'),
      asyncHandler(async (req: Request, res: Response) => {
        const { expectedUpdatedAt, ...input } = profileSchema.parse(req.body);
        res.json(
          await mutation(req, 'STUDY_DESTINATION_PROFILE_UPDATED', owner => owner.upsertProfile(req.params.iso2Code, input, expectedUpdatedAt, requireAuthenticatedPrincipal(req).principalId)),
        );
      }),
    );

    router.post(
      '/:iso2Code/submit-review',
      SecurityMiddlewareFactory.createAdminPermissionGuard('admin:study-destinations:edit'),
      asyncHandler(async (req: Request, res: Response) => {
        res.json(await mutation(req, 'STUDY_DESTINATION_SUBMITTED_FOR_REVIEW', owner => owner.submitForReview(req.params.iso2Code)));
      }),
    );

    router.post(
      '/:iso2Code/verify-source',
      SecurityMiddlewareFactory.createAdminPermissionGuard('admin:study-destinations:review'),
      asyncHandler(async (req: Request, res: Response) => {
        const review = z.object({expectedUpdatedAt: z.string().datetime().optional(), reason: z.string().trim().min(3).max(2000), approvedOrigins: z.array(z.string().url()).min(1).max(100)}).strict().parse(req.body);
        res.json(await mutation(req, 'STUDY_DESTINATION_SOURCES_VERIFIED', owner => owner.verifySources(req.params.iso2Code, {...review, actorId: requireAuthenticatedPrincipal(req).principalId})));
      }),
    );

    router.post(
      '/:iso2Code/publish',
      SecurityMiddlewareFactory.createAdminPermissionGuard('admin:study-destinations:publish'),
      asyncHandler(async (req: Request, res: Response) => {
        res.json(await mutation(req, 'STUDY_DESTINATION_PUBLISHED', owner => owner.publish(req.params.iso2Code)));
      }),
    );

    router.post(
      '/:iso2Code/archive',
      SecurityMiddlewareFactory.createAdminPermissionGuard('admin:study-destinations:publish'),
      asyncHandler(async (req: Request, res: Response) => {
        res.json(await mutation(req, 'STUDY_DESTINATION_ARCHIVED', owner => owner.archive(req.params.iso2Code)));
      }),
    );

    router.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
      if (err instanceof z.ZodError) {
        const validationError = err as z.ZodError;
        return res.status(400).json({ error: 'Validation Error', details: validationError.issues });
      }
      if (err instanceof Error) {
        if (err.message === 'STUDY_DESTINATION_ATOMIC_PERSISTENCE_REQUIRED') return res.status(503).json({error: err.message});
        if (err.message === 'STUDY_DESTINATION_EXPECTED_REVISION_REQUIRED') return res.status(428).json({error: err.message});
        if (err.message === 'STUDY_DESTINATION_VERSION_CONFLICT')
          return res.status(409).json({ error: err.message });
        const notFound = [
          'STUDY_DESTINATION_COUNTRY_NOT_FOUND',
          'STUDY_DESTINATION_PROFILE_NOT_FOUND',
          'STUDY_DESTINATION_NOT_FOUND',
        ];
        if (notFound.includes(err.message)) return res.status(404).json({ error: err.message });
        if (err.message.startsWith('STUDY_DESTINATION_') || err.message.startsWith('INVALID_'))
          return res.status(422).json({ error: err.message });
      }
      return next(err);
    });

    return router;
  }
}
