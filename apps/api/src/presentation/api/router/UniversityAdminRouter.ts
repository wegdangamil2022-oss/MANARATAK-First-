import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  UniversityImportCompletenessState,
  UniversityStatus,
  UpdateUniversityDto,
} from '@manaratak/domain';
import { AdminUniversityUseCases } from '@manaratak/application';

export class UniversityAdminRouter {
  public static create(cradle: { adminUniversityUseCases: AdminUniversityUseCases }): Router {
    const router = Router();
    const { adminUniversityUseCases } = cradle;

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
        source: 'admin-university-api',
      };
    };

    const listQuerySchema = z.object({
      status: z.nativeEnum(UniversityStatus).optional(),
      completenessStatus: z.nativeEnum(UniversityImportCompletenessState).optional(),
      countryReferenceId: z.string().min(1).optional(),
      regionReferenceId: z.string().min(1).optional(),
      cityReferenceId: z.string().min(1).optional(),
      search: z.string().trim().min(1).max(200).optional(),
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(50),
    }).strict();

    const organizationUnitListQuerySchema = z.object({
      universityId: z.string().min(1).optional(),
      unitType: z.enum(['FACULTY', 'SCHOOL', 'COLLEGE', 'DEPARTMENT']).optional(),
      status: z.string().trim().min(1).optional(),
      search: z.string().trim().min(1).max(200).optional(),
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(50),
    }).strict();

    const updateBodySchema = z.object({
      displayName: z.string().optional(),
      officialWebsite: z.string().url().optional(),
      country: z.string().optional(),
      institutionType: z.string().optional(),
      sourceUrl: z.union([z.string().url(), z.literal('')]).optional(),
      officialSourceUrl: z.union([z.string().url(), z.literal('')]).optional(),
      city: z.string().nullable().optional(),
      countryReferenceId: z.string().min(1).nullable().optional(),
      regionReferenceId: z.string().min(1).nullable().optional(),
      cityReferenceId: z.string().min(1).nullable().optional(),
      logoAssetId: z.string().optional(),
      foundedYear: z.number().int().min(1000).max(new Date().getFullYear()).nullable().optional(),
      localizedNames: z.record(z.string(), z.string()).optional(),
      accreditations: z.array(z.record(z.string(), z.unknown())).optional(),
      description: z.string().optional(),
      languagesOfInstruction: z.array(z.string()).optional(),
      contactEmail: z.string().email().optional(),
      contactPhone: z.string().optional(),
      socialLinks: z.record(z.string(), z.string().url()).optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    });

    const translationLocaleSchema = z.enum(['ar', 'en']);
    const translationBodySchema = z.object({
      displayName: z.string().trim().min(1).nullable().optional(),
      description: z.string().nullable().optional(),
      reviewStatus: z
        .enum(['NEEDS_REVIEW', 'APPROVED', 'PUBLISHED', 'REJECTED'])
        .default('NEEDS_REVIEW'),
      sourceRecordId: z.string().nullable().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    });

    const academicProgramStatusSchema = z.enum(['DRAFT', 'REVIEW_REQUIRED', 'ACTIVE', 'INACTIVE']);
    const admissionRequirementStatusSchema = z.enum(['DRAFT', 'REVIEW_REQUIRED', 'ACTIVE', 'INACTIVE']);

    const academicProgramAuthoringSchema = z.object({
      sourceReferenceId: z.string().min(1).nullable().optional(),
      organizationUnitId: z.string().min(1).nullable().optional(),
      sourceProgramName: z.string().trim().min(1),
      degreeLevelId: z.string().min(1),
      majorId: z.string().min(1).nullable().optional(),
      majorMappingState: z.string().min(1),
      status: academicProgramStatusSchema.optional(),
      campusIds: z.array(z.string().min(1)).optional(),
      metadata: z.record(z.string(), z.unknown()).nullable().optional(),
      admissionRequirements: z.array(z.object({
        internationalTestId: z.string().min(1),
        testVariantId: z.string().min(1).nullable().optional(),
        testVersionId: z.string().min(1).nullable().optional(),
        minimumScore: z.number().nullable().optional(),
        sectionScores: z.record(z.string(), z.unknown()).nullable().optional(),
        validityMetadata: z.record(z.string(), z.unknown()).nullable().optional(),
        restrictionMetadata: z.record(z.string(), z.unknown()).nullable().optional(),
        status: admissionRequirementStatusSchema.optional(),
      })).optional(),
    }).strict();

    const normalizedDetailsSchema = z
      .object({
        campuses: z
          .array(
            z.object({
              sourceReferenceId: z.string().optional(),
              name: z.string().trim().min(1),
              campusType: z.string().optional(),
              status: z.string().optional(),
              address: z.string().optional(),
              countryReferenceId: z.string().optional(),
              regionReferenceId: z.string().optional(),
              cityReferenceId: z.string().optional(),
              latitude: z.number().optional(),
              longitude: z.number().optional(),
              coordinateSource: z.string().optional(),
              metadata: z.record(z.string(), z.unknown()).optional(),
            }),
          )
          .optional(),
        organizationUnits: z
          .array(
            z.object({
              sourceReferenceId: z.string().optional(),
              campusSourceReferenceId: z.string().optional(),
              parentSourceReferenceId: z.string().optional(),
              unitType: z.enum(['FACULTY', 'SCHOOL', 'COLLEGE', 'DEPARTMENT']),
              name: z.string().trim().min(1),
              status: z.string().optional(),
              metadata: z.record(z.string(), z.unknown()).optional(),
            }),
          )
          .optional(),
        academicPrograms: z
          .array(
            z.object({
              sourceReferenceId: z.string().optional(),
              organizationUnitSourceReferenceId: z.string().optional(),
              sourceProgramName: z.string().trim().min(1),
              degreeLevelId: z.string().min(1),
              majorId: z.string().optional(),
              majorMappingState: z.string().min(1),
              status: academicProgramStatusSchema.optional(),
              campusSourceReferenceIds: z.array(z.string()).optional(),
              metadata: z.record(z.string(), z.unknown()).optional(),
              admissionRequirements: z
                .array(
                  z.object({
                    internationalTestId: z.string().min(1),
                    testVariantId: z.string().optional(),
                    testVersionId: z.string().optional(),
                    minimumScore: z.number().optional(),
                    sectionScores: z.record(z.string(), z.unknown()).optional(),
                    validityMetadata: z.record(z.string(), z.unknown()).optional(),
                    restrictionMetadata: z.record(z.string(), z.unknown()).optional(),
                    status: admissionRequirementStatusSchema.optional(),
                  }),
                )
                .optional(),
            }),
          )
          .optional(),
        tuitionProfiles: z
          .array(
            z.object({
              profileType: z.string().min(1),
              organizationUnitName: z.string().optional(),
              amount: z.number().nonnegative().optional(),
              currencyCode: z.string().optional(),
              officialSourceUrl: z.string().url().optional(),
              effectiveFrom: z.coerce.date().optional(),
              effectiveTo: z.coerce.date().optional(),
              metadata: z.record(z.string(), z.unknown()).optional(),
            }),
          )
          .optional(),
        accommodationProfiles: z
          .array(
            z.object({
              accommodationAvailable: z.boolean().optional(),
              internationalEligible: z.boolean().optional(),
              typicalCost: z.number().nonnegative().optional(),
              currencyCode: z.string().optional(),
              averageMonthlyLivingCost: z.number().nonnegative().optional(),
              livingCostCurrencyCode: z.string().optional(),
              costVariationNote: z.string().optional(),
              metadata: z.record(z.string(), z.unknown()).optional(),
            }),
          )
          .optional(),
        rankings: z
          .array(
            z.object({
              provider: z.enum(['QS', 'THE', 'ARWU']),
              rankingYear: z.number().int().min(2000).max(2100),
              rank: z.string().min(1),
              scope: z.string().min(1),
              scopeLabel: z.string().optional(),
              note: z.string().optional(),
              officialSourceUrl: z.string().url(),
              verifiedAt: z.coerce.date(),
            }),
          )
          .optional(),
      })
      .refine(
        (value) => Object.keys(value).length > 0,
        'At least one normalized detail section is required',
      );

    router.get(
      '/',
      asyncHandler(async (req: Request, res: Response) => {
        const filters = listQuerySchema.parse(req.query);
        const result = await adminUniversityUseCases.listUniversities(filters);
        res.json(result);
      }),
    );

    router.get(
      '/organization-units',
      asyncHandler(async (req: Request, res: Response) => {
        const filters = organizationUnitListQuerySchema.parse(req.query);
        const result = await adminUniversityUseCases.listOrganizationUnits(filters);
        res.json(result);
      }),
    );

    router.get(
      '/:id',
      asyncHandler(async (req: Request, res: Response) => {
        const university = await adminUniversityUseCases.getUniversity(req.params.id);
        res.json(university);
      }),
    );

    router.get(
      '/:id/translations',
      asyncHandler(async (req: Request, res: Response) => {
        const translations = await adminUniversityUseCases.listTranslations(req.params.id);
        res.json({ data: translations });
      }),
    );

    router.put(
      '/:id/translations/:locale',
      asyncHandler(async (req: Request, res: Response) => {
        const locale = translationLocaleSchema.parse(req.params.locale);
        const payload = translationBodySchema.parse(req.body);
        const translation = await adminUniversityUseCases.upsertTranslation(
          req.params.id,
          { locale, ...payload },
          mutationContext(req),
        );
        res.json(translation);
      }),
    );

    router.patch(
      '/:id',
      asyncHandler(async (req: Request, res: Response) => {
        const updates = updateBodySchema.parse(req.body);

        const optionalFields: Record<string, unknown> = {};
        if (updates.localizedNames !== undefined)
          optionalFields.localizedNames = updates.localizedNames;
        if (updates.accreditations !== undefined)
          optionalFields.accreditations = updates.accreditations;
        if (updates.description !== undefined) optionalFields.description = updates.description;
        if (updates.languagesOfInstruction !== undefined)
          optionalFields.languagesOfInstruction = updates.languagesOfInstruction;
        if (updates.contactEmail !== undefined) optionalFields.contactEmail = updates.contactEmail;
        if (updates.contactPhone !== undefined) optionalFields.contactPhone = updates.contactPhone;
        if (updates.socialLinks !== undefined) optionalFields.socialLinks = updates.socialLinks;
        if (updates.metadata !== undefined) optionalFields.metadata = updates.metadata;

        const dataToUpdate: UpdateUniversityDto = {
          displayName: updates.displayName,
          officialWebsite: updates.officialWebsite,
          country: updates.country,
          institutionType: updates.institutionType,
          sourceUrl: updates.sourceUrl === '' ? null : updates.sourceUrl,
          officialSourceUrl: updates.officialSourceUrl === '' ? null : updates.officialSourceUrl,
          city: updates.city,
          countryReferenceId: updates.countryReferenceId,
          regionReferenceId: updates.regionReferenceId,
          cityReferenceId: updates.cityReferenceId,
          logoAssetId: updates.logoAssetId,
          foundedYear: updates.foundedYear,
        };

        if (Object.keys(optionalFields).length > 0) {
          dataToUpdate.optionalFields = optionalFields;
        }

        const university = await adminUniversityUseCases.updateUniversity(
          req.params.id,
          dataToUpdate,
          mutationContext(req),
        );
        res.json(university);
      }),
    );

    router.put(
      '/:id/normalized-details',
      asyncHandler(async (req: Request, res: Response) => {
        const details = normalizedDetailsSchema.parse(req.body);
        const university = await adminUniversityUseCases.replaceNormalizedDetails(
          req.params.id,
          details,
          mutationContext(req),
        );
        res.json(university);
      }),
    );

    router.post(
      '/:id/academic-programs',
      asyncHandler(async (req: Request, res: Response) => {
        const input = academicProgramAuthoringSchema.parse(req.body);
        const university = await adminUniversityUseCases.upsertAcademicProgram(
          req.params.id,
          null,
          input,
          mutationContext(req),
        );
        res.status(201).json(university);
      }),
    );

    router.put(
      '/:id/academic-programs/:programId',
      asyncHandler(async (req: Request, res: Response) => {
        const input = academicProgramAuthoringSchema.parse(req.body);
        const university = await adminUniversityUseCases.upsertAcademicProgram(
          req.params.id,
          req.params.programId,
          input,
          mutationContext(req),
        );
        res.json(university);
      }),
    );

    router.delete(
      '/:id/academic-programs/:programId',
      asyncHandler(async (req: Request, res: Response) => {
        const university = await adminUniversityUseCases.archiveAcademicProgram(
          req.params.id,
          req.params.programId,
          mutationContext(req),
        );
        res.json(university);
      }),
    );

    router.post(
      '/:id/mark-ready',
      asyncHandler(async (req: Request, res: Response) => {
        await adminUniversityUseCases.markReadyToReview(req.params.id, mutationContext(req));
        res.status(200).json({ success: true });
      }),
    );

    router.post(
      '/:id/mark-publishable',
      asyncHandler(async (req: Request, res: Response) => {
        await adminUniversityUseCases.markReadyToPublish(req.params.id, mutationContext(req));
        res.status(200).json({ success: true });
      }),
    );

    router.get(
      '/:id/publication-readiness',
      asyncHandler(async (req: Request, res: Response) => {
        res.json(await adminUniversityUseCases.checkPublicationReadiness(req.params.id));
      }),
    );

    router.post(
      '/:id/publish',
      asyncHandler(async (req: Request, res: Response) => {
        await adminUniversityUseCases.publish(req.params.id, mutationContext(req));
        res.status(200).json({ success: true });
      }),
    );

    router.post(
      '/:id/unpublish',
      asyncHandler(async (req: Request, res: Response) => {
        await adminUniversityUseCases.unpublish(req.params.id, mutationContext(req));
        res.status(200).json({ success: true });
      }),
    );

    router.post(
      '/:id/reject',
      asyncHandler(async (req: Request, res: Response) => {
        await adminUniversityUseCases.reject(req.params.id, mutationContext(req));
        res.status(200).json({ success: true });
      }),
    );

    router.post(
      '/:id/archive',
      asyncHandler(async (req: Request, res: Response) => {
        await adminUniversityUseCases.archive(req.params.id, mutationContext(req));
        res.status(200).json({ success: true });
      }),
    );

    router.use((err: any, req: Request, res: Response, next: NextFunction) => {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation Error', details: err.issues });
      }
      res.status(400).json({ error: err.message || 'An error occurred' });
    });

    return router;
  }
}
