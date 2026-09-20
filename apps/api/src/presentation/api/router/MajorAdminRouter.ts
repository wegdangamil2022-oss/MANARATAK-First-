import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { MajorImportCompletenessState, MajorStatus, UpdateMajorDto } from '@manaratak/domain';
import { AdminMajorUseCases } from '@manaratak/application';

export class MajorAdminRouter {
  public static create(cradle: { adminMajorUseCases: AdminMajorUseCases }): Router {
    const router = Router();
    const { adminMajorUseCases } = cradle;

    type RouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;
    const asyncHandler =
      (fn: RouteHandler) => (req: Request, res: Response, next: NextFunction) => {
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
        source: 'admin-major-api',
      };
    };

    const listQuerySchema = z.object({
      status: z.nativeEnum(MajorStatus).optional(),
      completenessStatus: z.nativeEnum(MajorImportCompletenessState).optional(),
      degreeLevel: z.string().optional(),
      academicFieldOrDiscipline: z.string().optional(),
      collegeOrFaculty: z.string().optional(),
      academicFieldId: z.string().optional(),
      disciplineId: z.string().optional(),
      search: z.string().optional(),
      catalog: z.string().optional(),
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(50),
    });

    const newCandidateListQuerySchema = z.object({
      search: z.string().trim().min(1).max(200).optional(),
      sourceType: z.enum(['UNIVERSITY_PROGRAM', 'SCHOLARSHIP_MAJOR_TARGET', 'SCHOLARSHIP_ELIGIBILITY']).optional(),
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(25),
    }).strict();

    const approveNewCandidateBodySchema = z.object({
      canonicalMajorName: z.string().trim().min(1).max(300),
      localizedNameAr: z.string().trim().min(1).max(300).nullable().optional(),
      localizedNameEn: z.string().trim().min(1).max(300).nullable().optional(),
      degreeLevel: z.enum(['BACHELOR', 'MASTER', 'DOCTORATE', 'FELLOWSHIP']),
      degreeLevelId: z.string().min(1),
      academicFieldId: z.string().min(1).nullable().optional(),
      disciplineId: z.string().min(1).nullable().optional(),
      academicFieldOrDiscipline: z.string().trim().min(1).max(300).nullable().optional(),
      officialSourceUrl: z.union([z.string().url(), z.literal('')]).nullable().optional(),
      sourceUrl: z.union([z.string().url(), z.literal('')]).nullable().optional(),
    }).strict();

    const linkNewCandidateBodySchema = z.object({
      majorId: z.string().min(1),
    }).strict();

    const updateBodySchema = z.object({
      displayName: z.string().optional(),
      localizedNameAr: z.string().trim().min(1).nullable().optional(),
      localizedNameEn: z.string().trim().min(1).nullable().optional(),
      degreeLevel: z.string().optional(),
      sourceClassificationSystem: z.string().optional(),
      academicFieldOrDiscipline: z.string().nullable().optional(),
      collegeOrFaculty: z.string().nullable().optional(),
      classificationCode: z.string().nullable().optional(),
      sourceUrl: z
        .union([z.string().url(), z.literal('')])
        .nullable()
        .optional(),
      officialSourceUrl: z
        .union([z.string().url(), z.literal('')])
        .nullable()
        .optional(),
      academicFieldId: z.string().nullable().optional(),
      disciplineId: z.string().nullable().optional(),
      localizedNames: z.record(z.string(), z.string()).optional(),
      aliases: z.union([z.string(), z.array(z.string())]).optional(),
      synonyms: z.union([z.string(), z.array(z.string())]).optional(),
      equivalencyMappings: z.array(z.record(z.string(), z.unknown())).optional(),
      degreeLevelMappings: z.array(z.record(z.string(), z.unknown())).optional(),
      relatedMajors: z.union([z.string(), z.array(z.string())]).optional(),
      description: z.string().optional(),
      studentFriendlySummary: z.string().optional(),
      acquiredSkills: z.array(z.string()).optional(),
      careerOutcomes: z.array(z.string()).optional(),
      typicalCourses: z.array(z.string()).optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    });

    router.get(
      '/',
      asyncHandler(async (req: Request, res: Response) => {
        const filters = listQuerySchema.parse(req.query);
        const result = await adminMajorUseCases.listMajors(filters);
        res.json(result);
      }),
    );

    router.get(
      '/facets/colleges',
      asyncHandler(async (req: Request, res: Response) => {
        const degreeLevel =
          typeof req.query.degreeLevel === 'string' ? req.query.degreeLevel : undefined;
        res.json({ data: adminMajorUseCases.listCollegeFacets(degreeLevel) });
      }),
    );

    router.get(
      '/new-candidates',
      asyncHandler(async (req: Request, res: Response) => {
        const filters = newCandidateListQuerySchema.parse(req.query);
        res.json(await adminMajorUseCases.listNewMajorCandidates(filters));
      }),
    );

    router.post(
      '/new-candidates/:candidateKey/approve',
      asyncHandler(async (req: Request, res: Response) => {
        const body = approveNewCandidateBodySchema.parse(req.body);
        const result = await adminMajorUseCases.approveNewMajorCandidate({
          candidateKey: req.params.candidateKey,
          ...body,
          officialSourceUrl: body.officialSourceUrl === '' ? null : body.officialSourceUrl,
          sourceUrl: body.sourceUrl === '' ? null : body.sourceUrl,
        }, mutationContext(req));
        res.status(200).json(result);
      }),
    );

    router.post(
      '/new-candidates/:candidateKey/link',
      asyncHandler(async (req: Request, res: Response) => {
        const body = linkNewCandidateBodySchema.parse(req.body);
        const result = await adminMajorUseCases.linkNewMajorCandidate(req.params.candidateKey, body.majorId, mutationContext(req));
        res.status(200).json(result);
      }),
    );

    router.get(
      '/:id',
      asyncHandler(async (req: Request, res: Response) => {
        const major = await adminMajorUseCases.getMajor(req.params.id);
        res.json(major);
      }),
    );

    router.get(
      '/:id/publication-readiness',
      asyncHandler(async (req: Request, res: Response) => {
        res.json(await adminMajorUseCases.checkPublicationReadiness(req.params.id));
      }),
    );

    router.get(
      '/:id/versions',
      asyncHandler(async (req: Request, res: Response) => {
        const versions = await adminMajorUseCases.listVersions(req.params.id);
        res.json({ data: versions });
      }),
    );

    router.get(
      '/:id/profiles',
      asyncHandler(async (req: Request, res: Response) => {
        const profiles = await adminMajorUseCases.listLevelProfiles(req.params.id);
        res.json({ data: profiles });
      }),
    );

    router.get(
      '/:id/content-sections',
      asyncHandler(async (req: Request, res: Response) => {
        const sections = await adminMajorUseCases.listContentSections(req.params.id);
        res.json({ data: sections });
      }),
    );

    router.get(
      '/:id/aliases',
      asyncHandler(async (req: Request, res: Response) => {
        const aliases = await adminMajorUseCases.listAliases(req.params.id);
        res.json({ data: aliases });
      }),
    );

    router.get(
      '/:id/relationships',
      asyncHandler(async (req: Request, res: Response) => {
        const relationships = await adminMajorUseCases.listRelationships(req.params.id);
        res.json({ data: relationships });
      }),
    );

    router.get(
      '/:id/classification-mappings',
      asyncHandler(async (req: Request, res: Response) => {
        const mappings = await adminMajorUseCases.listClassificationMappings(req.params.id);
        res.json({ data: mappings });
      }),
    );

    router.get(
      '/:id/sources',
      asyncHandler(async (req: Request, res: Response) => {
        const sources = await adminMajorUseCases.listSources(req.params.id);
        res.json({ data: sources });
      }),
    );

    router.patch(
      '/:id',
      asyncHandler(async (req: Request, res: Response) => {
        const updates = updateBodySchema.parse(req.body);

        const optionalFields: Record<string, unknown> = {};
        if (updates.localizedNames !== undefined)
          optionalFields.localizedNames = updates.localizedNames;
        if (updates.aliases !== undefined) optionalFields.aliases = updates.aliases;
        if (updates.synonyms !== undefined) optionalFields.synonyms = updates.synonyms;
        if (updates.equivalencyMappings !== undefined)
          optionalFields.equivalencyMappings = updates.equivalencyMappings;
        if (updates.degreeLevelMappings !== undefined)
          optionalFields.degreeLevelMappings = updates.degreeLevelMappings;
        if (updates.relatedMajors !== undefined)
          optionalFields.relatedMajors = updates.relatedMajors;
        if (updates.description !== undefined) optionalFields.description = updates.description;
        if (updates.studentFriendlySummary !== undefined)
          optionalFields.studentFriendlySummary = updates.studentFriendlySummary;
        if (updates.acquiredSkills !== undefined)
          optionalFields.acquiredSkills = updates.acquiredSkills;
        if (updates.careerOutcomes !== undefined)
          optionalFields.careerOutcomes = updates.careerOutcomes;
        if (updates.typicalCourses !== undefined)
          optionalFields.typicalCourses = updates.typicalCourses;
        if (updates.metadata !== undefined) optionalFields.metadata = updates.metadata;

        const dataToUpdate: UpdateMajorDto = {
          displayName: updates.displayName,
          localizedNameAr: updates.localizedNameAr,
          localizedNameEn: updates.localizedNameEn,
          degreeLevel: updates.degreeLevel,
          sourceClassificationSystem: updates.sourceClassificationSystem,
          academicFieldOrDiscipline: updates.academicFieldOrDiscipline,
          collegeOrFaculty: updates.collegeOrFaculty,
          classificationCode: updates.classificationCode,
          sourceUrl: updates.sourceUrl === '' ? null : updates.sourceUrl,
          officialSourceUrl: updates.officialSourceUrl === '' ? null : updates.officialSourceUrl,
          academicFieldId: updates.academicFieldId,
          disciplineId: updates.disciplineId,
        };

        if (Object.keys(optionalFields).length > 0) {
          dataToUpdate.optionalFields = optionalFields;
        }

        const major = await adminMajorUseCases.updateMajor(
          req.params.id,
          dataToUpdate,
          mutationContext(req),
        );
        res.json(major);
      }),
    );

    router.post(
      '/:id/mark-ready',
      asyncHandler(async (req: Request, res: Response) => {
        await adminMajorUseCases.markReadyToReview(req.params.id, mutationContext(req));
        res.status(200).json({ success: true });
      }),
    );

    router.post(
      '/:id/mark-publishable',
      asyncHandler(async (req: Request, res: Response) => {
        await adminMajorUseCases.markReadyToPublish(req.params.id, mutationContext(req));
        res.status(200).json({ success: true });
      }),
    );

    router.post(
      '/:id/publish',
      asyncHandler(async (req: Request, res: Response) => {
        await adminMajorUseCases.publish(req.params.id, mutationContext(req));
        res.status(200).json({ success: true });
      }),
    );

    router.post(
      '/:id/unpublish',
      asyncHandler(async (req: Request, res: Response) => {
        await adminMajorUseCases.unpublish(req.params.id, mutationContext(req));
        res.status(200).json({ success: true });
      }),
    );

    router.post(
      '/:id/reject',
      asyncHandler(async (req: Request, res: Response) => {
        await adminMajorUseCases.reject(req.params.id, mutationContext(req));
        res.status(200).json({ success: true });
      }),
    );

    router.post(
      '/:id/archive',
      asyncHandler(async (req: Request, res: Response) => {
        await adminMajorUseCases.archive(req.params.id, mutationContext(req));
        res.status(200).json({ success: true });
      }),
    );

    router.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation Error', details: err.issues });
      }
      res.status(400).json({ error: err instanceof Error ? err.message : 'An error occurred' });
    });

    return router;
  }
}
