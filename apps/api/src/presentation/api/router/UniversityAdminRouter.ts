import { SecurityMiddlewareFactory } from '../../security/SecurityMiddlewareFactory.js';
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  UniversityImportCompletenessState,
  UniversityStatus,
  UpdateUniversityDto,
} from '@manaratak/domain';
import { AdminUniversityUseCases } from '@manaratak/application';
import { readReviewReasonHeader } from '@manaratak/shared';

export class UniversityAdminRouter {
  public static create(cradle: { adminUniversityUseCases: AdminUniversityUseCases }): Router {
    const router = Router();
    const { adminUniversityUseCases } = cradle;

    const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
    const reasonSchema = z.string().trim().min(1).max(2000);
    const mutationContext = (req: Request) => {
      if (!req.authUserId) throw new Error('AUTHENTICATED_ADMIN_ACTOR_REQUIRED');
      const rawRevision = req.get('If-Match');
      const expectedRevision =
        rawRevision && /^(?:"[0-9]+"|[0-9]+)$/.test(rawRevision)
          ? Number(rawRevision.replace(/"/g, ''))
          : undefined;
      if (req.params.id && !Number.isSafeInteger(expectedRevision))
        throw new Error('UNIVERSITY_EXPECTED_REVISION_REQUIRED');
      return {
        expectedRevision,
        reason: reasonSchema.parse(
          readReviewReasonHeader(req.get('X-Review-Reason'), req.get('X-Review-Reason-Encoding')) ??
            z
              .object({ reason: z.string().optional() })
              .strip()
              .parse(req.body ?? {}).reason,
        ),
        actorId: req.authUserId,
        actorType: 'IDENTITY',
        correlationId:
          (req.headers['x-correlation-id'] as string | undefined) ||
          (req.headers['x-request-id'] as string | undefined),
        source: 'admin-university-api',
      };
    };

    const listQuerySchema = z
      .object({
        countOnly: z
          .enum(['true', 'false'])
          .transform((value) => value === 'true')
          .optional(),
        status: z.preprocess(
          (value) => (value === '' || value === 'all' || value === 'الكل' ? undefined : value),
          z.nativeEnum(UniversityStatus).optional(),
        ),
        completenessStatus: z.preprocess(
          (value) => (value === '' || value === 'all' || value === 'الكل' ? undefined : value),
          z.nativeEnum(UniversityImportCompletenessState).optional(),
        ),
        sort: z.enum(['CREATED_DESC', 'UPDATED_DESC', 'NAME_ASC']).optional(),
        institutionType: z
          .enum(['UNIVERSITY', 'COLLEGE', 'INSTITUTE', 'ACADEMY', 'OTHER'])
          .optional(),
        countryReferenceId: z.string().min(1).optional(),
        regionReferenceId: z.string().min(1).optional(),
        cityReferenceId: z.string().min(1).optional(),
        search: z.string().trim().min(1).max(200).optional(),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(50),
      })
      .strict();

    const organizationUnitListQuerySchema = z
      .object({
        universityId: z.string().min(1).optional(),
        unitType: z.enum(['FACULTY', 'SCHOOL', 'COLLEGE', 'DEPARTMENT']).optional(),
        status: z.string().trim().min(1).optional(),
        search: z.string().trim().min(1).max(200).optional(),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(50),
      })
      .strict();

    const webUrl = z
      .string()
      .url()
      .refine((value) => {
        const url = new URL(value);
        return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
      }, 'HTTP(S) URL required');
    router.get(
      '/:id/source-stages',
      asyncHandler(async (req: Request, res: Response) => {
        res.setHeader('Cache-Control', 'no-store');
        res.json(await adminUniversityUseCases.getSourceStages(req.params.id));
      }),
    );
    router.put(
      '/:id/stage-cards/:cardId',
      asyncHandler(async (req: Request, res: Response) => {
        const input = z
          .object({
            values: z.record(z.string(), z.unknown()),
            proof: z
              .object({ sourceUrl: z.string().url(), verifiedAt: z.string().datetime() })
              .strict(),
          })
          .strict()
          .parse(req.body);
        const saved = await adminUniversityUseCases.saveStageCard(
          req.params.id,
          req.params.cardId,
          input.values,
          input.proof,
          mutationContext(req),
        );
        res.setHeader('X-Entity-Revision', String(saved.revision));
        res.json(saved);
      }),
    );
    router.post(
      '/:id/restore',
      asyncHandler(async (req: Request, res: Response) => {
        await adminUniversityUseCases.restore(req.params.id, mutationContext(req));
        res.json({ success: true });
      }),
    );
    router.post(
      '/:id/academic-programs/:programId/restore',
      asyncHandler(async (req: Request, res: Response) => {
        res.json(
          await adminUniversityUseCases.restoreAcademicProgram(
            req.params.id,
            req.params.programId,
            mutationContext(req),
          ),
        );
      }),
    );
    const httpsSource = z
      .string()
      .url()
      .refine((value) => {
        const url = new URL(value);
        return url.protocol === 'https:' && !url.username && !url.password;
      }, 'HTTPS source required');
    router.post(
      '/',
      SecurityMiddlewareFactory.createAdminPermissionGuard('admin:universities:manage'),
      asyncHandler(async (req: Request, res: Response) => {
        const input = z
          .object({
            displayName: z.string().trim().min(1).max(300),
            officialWebsite: httpsSource,
            sourceUri: httpsSource,
            sourceHash: z.string().regex(/^[a-f0-9]{64}$/i),
            country: z.string().trim().max(200).optional(),
            countryReferenceId: z.string().uuid().optional(),
            reason: reasonSchema,
          })
          .strict()
          .parse(req.body);
        res
          .status(201)
          .json(await adminUniversityUseCases.createDraft(input, mutationContext(req)));
      }),
    );

    const updateBodySchema = z.object({
      displayName: z.string().optional(),
      officialWebsite: z.union([webUrl, z.literal('')]).optional(),
      country: z.string().optional(),
      institutionType: z.string().optional(),
      institutionalOwnership: z.string().nullable().optional(),
      sourceUrl: z.union([webUrl, z.literal('')]).optional(),
      officialSourceUrl: z.union([webUrl, z.literal('')]).optional(),
      city: z.string().nullable().optional(),
      countryReferenceId: z.string().min(1).nullable().optional(),
      regionReferenceId: z.string().min(1).nullable().optional(),
      cityReferenceId: z.string().min(1).nullable().optional(),
      logoAssetId: z.string().optional(),
      foundedYear: z.number().int().min(1000).max(new Date().getFullYear()).nullable().optional(),
      localizedNames: z.record(z.string(), z.string()).optional(),
      accreditations: z
        .array(
          z
            .object({
              name: z.string().trim().min(1),
              organization: z.string().trim().min(1),
              officialUrl: webUrl.refine(
                (value) => value.startsWith('https://'),
                'HTTPS accreditation evidence required',
              ),
              reviewStatus: z
                .enum(['NEEDS_REVIEW', 'APPROVED', 'REJECTED'])
                .default('NEEDS_REVIEW'),
              validFrom: z.string().optional(),
              validUntil: z.string().optional(),
              note: z.string().optional(),
            })
            .strict(),
        )
        .optional(),
      description: z.string().optional(),
      languagesOfInstruction: z.array(z.string()).optional(),
      contactEmail: z.union([z.string().email(), z.literal('')]).optional(),
      contactPhone: z.string().optional(),
      socialLinks: z.record(z.string(), webUrl).optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
      generalRequiredDocuments: z.array(z.string()).optional(),
      additionalGraduateRequirements: z.array(z.string()).optional(),
      officialRequiredDocumentsUrl: z.union([webUrl, z.literal('')]).optional(),
      internationalAdmissions: z.record(z.string(), z.unknown()).optional(),
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
    const admissionRequirementStatusSchema = z.enum([
      'DRAFT',
      'REVIEW_REQUIRED',
      'ACTIVE',
      'INACTIVE',
    ]);

    const academicProgramAuthoringSchema = z
      .object({
        sourceReferenceId: z.string().min(1).nullable().optional(),
        organizationUnitId: z.string().min(1).nullable().optional(),
        sourceProgramName: z.string().trim().min(1),
        degreeLevelId: z.string().min(1),
        majorId: z.string().min(1).nullable().optional(),
        majorMappingState: z.string().min(1),
        status: academicProgramStatusSchema.optional(),
        campusIds: z.array(z.string().min(1)).optional(),
        metadata: z.record(z.string(), z.unknown()).nullable().optional(),
        admissionRequirements: z
          .array(
            z.object({
              internationalTestId: z.string().min(1),
              testVariantId: z.string().min(1).nullable().optional(),
              testVersionId: z.string().min(1).nullable().optional(),
              minimumScore: z.number().nullable().optional(),
              sectionScores: z.record(z.string(), z.unknown()).nullable().optional(),
              validityMetadata: z.record(z.string(), z.unknown()).nullable().optional(),
              restrictionMetadata: z.record(z.string(), z.unknown()).nullable().optional(),
              status: admissionRequirementStatusSchema.optional(),
            }),
          )
          .optional(),
      })
      .strict();

    const normalizedDetailsSchema = z
      .object({
        campuses: z
          .array(
            z.object({
              id: z.string().min(1).optional(),
              sourceReferenceId: z.string().optional(),
              name: z.string().trim().min(1),
              campusType: z.string().nullable().optional(),
              status: z.string().optional(),
              address: z.string().nullable().optional(),
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
              id: z.string().min(1).optional(),
              sourceReferenceId: z.string().optional(),
              campusSourceReferenceId: z.string().min(1).nullable().optional(),
              parentSourceReferenceId: z.string().min(1).nullable().optional(),
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
              id: z.string().min(1).optional(),
              profileType: z.string().min(1),
              organizationUnitName: z.string().nullable().optional(),
              amount: z.number().nonnegative().nullable().optional(),
              currencyCode: z.string().nullable().optional(),
              currencyReferenceId: z.string().min(1).optional(),
              officialSourceUrl: webUrl.nullable().optional(),
              effectiveFrom: z.coerce.date().nullable().optional(),
              effectiveTo: z.coerce.date().nullable().optional(),
              metadata: z.record(z.string(), z.unknown()).optional(),
            }),
          )
          .optional(),
        accommodationProfiles: z
          .array(
            z.object({
              id: z.string().min(1).optional(),
              accommodationAvailable: z.boolean().nullable().optional(),
              internationalEligible: z.boolean().nullable().optional(),
              typicalCost: z.number().nonnegative().nullable().optional(),
              currencyCode: z.string().nullable().optional(),
              currencyReferenceId: z.string().min(1).optional(),
              averageMonthlyLivingCost: z.number().nonnegative().nullable().optional(),
              livingCostCurrencyCode: z.string().nullable().optional(),
              livingCostCurrencyReferenceId: z.string().min(1).optional(),
              costVariationNote: z.string().nullable().optional(),
              metadata: z.record(z.string(), z.unknown()).optional(),
            }),
          )
          .optional(),
        rankings: z
          .array(
            z.object({
              id: z.string().min(1).optional(),
              provider: z.enum(['QS', 'THE', 'ARWU']),
              rankingYear: z.number().int().min(2000).max(2100),
              rank: z.string().min(1),
              scope: z.string().min(1),
              scopeLabel: z.string().nullable().optional(),
              note: z.string().nullable().optional(),
              officialSourceUrl: webUrl,
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
        res.setHeader('ETag', `"${university.revision}"`);
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
        res.setHeader(
          'X-Entity-Revision',
          String((await adminUniversityUseCases.getUniversity(req.params.id)).revision),
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
        for (const key of [
          'generalRequiredDocuments',
          'additionalGraduateRequirements',
          'officialRequiredDocumentsUrl',
          'internationalAdmissions',
        ] as const) {
          if (updates[key] !== undefined) optionalFields[key] = updates[key];
        }

        const dataToUpdate: UpdateUniversityDto = {
          displayName: updates.displayName,
          officialWebsite: updates.officialWebsite,
          country: updates.country,
          institutionType: updates.institutionType,
          institutionalOwnership: updates.institutionalOwnership,
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
        res.setHeader('X-Entity-Revision', String(university.revision));
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
        res.setHeader('X-Entity-Revision', String(university.revision));
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
        res.setHeader(
          'X-Entity-Revision',
          String((await adminUniversityUseCases.getUniversity(req.params.id)).revision),
        );
        res.status(200).json({ success: true });
      }),
    );

    router.post(
      '/:id/mark-publishable',
      asyncHandler(async (req: Request, res: Response) => {
        await adminUniversityUseCases.markReadyToPublish(req.params.id, mutationContext(req));
        res.setHeader(
          'X-Entity-Revision',
          String((await adminUniversityUseCases.getUniversity(req.params.id)).revision),
        );
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
        res.setHeader(
          'X-Entity-Revision',
          String((await adminUniversityUseCases.getUniversity(req.params.id)).revision),
        );
        res.status(200).json({ success: true });
      }),
    );

    router.post(
      '/:id/unpublish',
      asyncHandler(async (req: Request, res: Response) => {
        await adminUniversityUseCases.unpublish(req.params.id, mutationContext(req));
        res.setHeader(
          'X-Entity-Revision',
          String((await adminUniversityUseCases.getUniversity(req.params.id)).revision),
        );
        res.status(200).json({ success: true });
      }),
    );

    router.post(
      '/:id/reject',
      asyncHandler(async (req: Request, res: Response) => {
        await adminUniversityUseCases.reject(req.params.id, mutationContext(req));
        res.setHeader(
          'X-Entity-Revision',
          String((await adminUniversityUseCases.getUniversity(req.params.id)).revision),
        );
        res.status(200).json({ success: true });
      }),
    );

    router.post(
      '/:id/archive',
      asyncHandler(async (req: Request, res: Response) => {
        await adminUniversityUseCases.archive(req.params.id, mutationContext(req));
        res.setHeader(
          'X-Entity-Revision',
          String((await adminUniversityUseCases.getUniversity(req.params.id)).revision),
        );
        res.status(200).json({ success: true });
      }),
    );

    router.use((err: any, req: Request, res: Response, next: NextFunction) => {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation Error', details: err.issues });
      }
      if (err?.code === 'P2002' || err?.message === 'UNIVERSITY_DUPLICATE_IDENTITY')
        return res.status(409).json({ error: 'UNIVERSITY_DUPLICATE_IDENTITY' });
      if (err?.message === 'UNIVERSITY_STALE_REVISION')
        return res.status(409).json({ error: err.message });
      if (err?.message === 'UNIVERSITY_EXPECTED_REVISION_REQUIRED')
        return res.status(428).json({ error: err.message });
      res.status(400).json({ error: err.message || 'An error occurred' });
    });

    return router;
  }
}
