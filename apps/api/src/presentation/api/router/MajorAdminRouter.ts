import type {IAuditRecordRepository} from '@manaratak/domain';
import {SecurityMiddlewareFactory} from '../../security/SecurityMiddlewareFactory.js';
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { MajorImportCompletenessState, MajorStatus, UpdateMajorDto } from '@manaratak/domain';
import { AdminMajorUseCases } from '@manaratak/application';

export class MajorAdminRouter {
  public static create(cradle: { adminMajorUseCases: AdminMajorUseCases; auditRecordRepo?:IAuditRecordRepository }): Router {
    const router = Router();
    const { adminMajorUseCases } = cradle;

    type RouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;
    const asyncHandler =
      (fn: RouteHandler) => (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
      };
    const reasonSchema=z.string().trim().min(1).max(2000);
    const sourceUrlSchema=z.string().url().refine(value=>{try {const url=new URL(value);return url.protocol==='https:' && !url.username && !url.password;}catch{return false;}},'HTTPS source URL required');
    const mutationContext = (req: Request) => {
      if (!req.authUserId) throw new Error('AUTHENTICATED_ADMIN_ACTOR_REQUIRED');
      const rawRevision=req.get('If-Match');
      const expectedRevision=rawRevision && /^(?:"[0-9]+"|[0-9]+)$/.test(rawRevision) ? Number(rawRevision.replace(/"/g,'')) : undefined;
      if(req.params.id && !Number.isSafeInteger(expectedRevision)) throw new Error('MAJOR_EXPECTED_REVISION_REQUIRED');
      return {
        expectedRevision,reason:reasonSchema.parse(req.body?.reason ?? req.get('X-Review-Reason')),
        expectedSourceDigest: req.params.candidateKey ? z.string().regex(/^[a-f0-9]{64}$/).parse(req.body?.sourceDigest) : undefined,
        actorId: req.authUserId,
        actorType: 'IDENTITY',
        correlationId:
          (req.headers['x-correlation-id'] as string | undefined) ||
          (req.headers['x-request-id'] as string | undefined),
        source: 'admin-major-api',
      };
    };

    const allAsUndefined = (value: unknown) => typeof value === 'string' && ['', 'all', 'الكل'].includes(value.trim().toLowerCase()) ? undefined : value;
    const listQuerySchema = z.object({
      taxonomyNodeId: z.string().uuid().optional(),
      status: z.preprocess(allAsUndefined, z.nativeEnum(MajorStatus).optional()),
      completenessStatus: z.preprocess(allAsUndefined, z.nativeEnum(MajorImportCompletenessState).optional()),
      degreeLevel: z.preprocess(allAsUndefined, z.string().optional()),
      academicFieldOrDiscipline: z.string().optional(),
      collegeOrFaculty: z.string().optional(),
      academicFieldId: z.string().optional(),
      disciplineId: z.string().optional(),
      search: z.string().optional(),
      catalog: z.string().optional(),
      page: z.coerce.number().int().min(1).max(1000).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(50),
    });

    const newCandidateListQuerySchema = z.object({
      search: z.string().trim().min(1).max(200).optional(),
      sourceType: z.enum(['UNIVERSITY_PROGRAM', 'SCHOLARSHIP_MAJOR_TARGET', 'SCHOLARSHIP_ELIGIBILITY']).optional(),
      page: z.coerce.number().int().min(1).max(1000).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(25),
    }).strict();

    const approveNewCandidateBodySchema = z.object({
      canonicalMajorName: z.string().trim().min(1).max(300),
      reason:reasonSchema, sourceDigest:z.string().regex(/^[a-f0-9]{64}$/),
      degreeLevel: z.enum(['BACHELOR', 'MASTER', 'DOCTORATE']),
      degreeLevelId: z.string().uuid(),
      academicFieldId: z.string().min(1).nullable().optional(),
      disciplineId: z.string().min(1).nullable().optional(),
      academicFieldOrDiscipline: z.string().trim().min(1).max(300).nullable().optional(),
      officialSourceUrl: z.union([sourceUrlSchema, z.literal('')]).nullable().optional(),
      sourceUrl: z.union([sourceUrlSchema, z.literal('')]).nullable().optional(),
    }).strict();

    const linkNewCandidateBodySchema = z.object({
      majorId: z.string().uuid(),reason:reasonSchema,sourceDigest:z.string().regex(/^[a-f0-9]{64}$/),
    }).strict();

    const classificationMappingSchema = z.object({
      taxonomyNodeId: z.string().uuid(), profileId: z.string().uuid().optional(),
      relationshipType: z.enum(['PRIMARY', 'SECONDARY', 'RELATED', 'LEGACY']),
      reason: z.string().trim().min(1).max(2000), evidenceReference: z.string().trim().min(1).max(500),
    }).strict();

    router.post('/:id/classification-mappings',SecurityMiddlewareFactory.createAdminPermissionGuard('admin:majors:review'), asyncHandler(async (req, res) => {
      const id = z.string().uuid().parse(req.params.id);
      const input = classificationMappingSchema.parse(req.body);
      const result=await adminMajorUseCases.addClassificationMapping(id,input,mutationContext(req));
      res.setHeader('X-Entity-Revision',String((await adminMajorUseCases.getMajor(id)).revision));res.status(201).json(result);
    }));

    const updateBodySchema = z.object({
      displayName: z.string().optional(),
      reason:reasonSchema,
      degreeLevel: z.string().optional(),
      sourceClassificationSystem: z.string().optional(),
      academicFieldOrDiscipline: z.string().nullable().optional(),
      collegeOrFaculty: z.string().nullable().optional(),
      classificationCode: z.string().nullable().optional(),
      sourceUrl: z
        .union([sourceUrlSchema, z.literal('')])
        .nullable()
        .optional(),
      officialSourceUrl: z
        .union([sourceUrlSchema, z.literal('')])
        .nullable()
        .optional(),
      academicFieldId: z.string().nullable().optional(),
      disciplineId: z.string().nullable().optional(),
      description: z.string().optional(),
      studentFriendlySummary: z.string().optional(),
      acquiredSkills: z.array(z.string()).optional(),
      careerOutcomes: z.array(z.string()).optional(),
      typicalCourses: z.array(z.string()).optional(),

    }).strict();

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
      SecurityMiddlewareFactory.createAdminPermissionGuard('admin:majors:review'),
      SecurityMiddlewareFactory.createAdminPermissionGuard('admin:universities:manage'),
      SecurityMiddlewareFactory.createAdminPermissionGuard('admin:scholarships:manage'),
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
      SecurityMiddlewareFactory.createAdminPermissionGuard('admin:majors:review'),
      SecurityMiddlewareFactory.createAdminPermissionGuard('admin:universities:manage'),
      SecurityMiddlewareFactory.createAdminPermissionGuard('admin:scholarships:manage'),
      asyncHandler(async (req: Request, res: Response) => {
        const body = linkNewCandidateBodySchema.parse(req.body);
        const result = await adminMajorUseCases.linkNewMajorCandidate(req.params.candidateKey, body.majorId, mutationContext(req));
        res.status(200).json(result);
      }),
    );

    router.post('/new-candidates/:candidateKey/reject',SecurityMiddlewareFactory.createAdminPermissionGuard('admin:majors:review'),asyncHandler(async(req,res)=>{
      z.object({reason:reasonSchema,sourceDigest:z.string().regex(/^[a-f0-9]{64}$/)}).strict().parse(req.body);
      await adminMajorUseCases.rejectNewMajorCandidate(req.params.candidateKey,mutationContext(req));
      res.json({success:true});
    }));
    router.get('/:id/timeline',SecurityMiddlewareFactory.createAdminPermissionGuard('admin:audit:manage'),asyncHandler(async(req,res)=>{
      if(!cradle.auditRecordRepo) return res.status(503).json({error:'MAJOR_AUDIT_READ_UNAVAILABLE'});
      const major=await adminMajorUseCases.getMajor(req.params.id);
      const cursor=typeof req.query.cursor==='string'?req.query.cursor:undefined;
      if(cursor && cursor.length>2048) return res.status(400).json({error:'CURSOR_INVALID'});
      let raw:unknown;
      try {raw=cursor?JSON.parse(Buffer.from(cursor,'base64url').toString('utf8')):null;}catch{return res.status(400).json({error:'CURSOR_INVALID'});}
      const parsed=raw?z.object({timestamp:z.coerce.date(),id:z.string().min(1).max(200)}).strict().parse(raw):null;
      const result=await cradle.auditRecordRepo.queryPage({targetId:major.id,targetType:'MAJOR',limit:25,cursor:parsed});
      res.json({data:result.items.map(row=>({action:row.getAction().getValue(),actorId:row.getActor().getActorId(),timestamp:row.getTimestamp().getValue(),reason:row.getContextMetadata().getData().reason})),hasMore:result.hasMore,nextCursor:result.nextCursor?Buffer.from(JSON.stringify(result.nextCursor)).toString('base64url'):null});
    }));
    router.post('/:id/working-copy',SecurityMiddlewareFactory.createAdminPermissionGuard('admin:majors:review'),asyncHandler(async(req,res)=>{
      z.object({reason:reasonSchema}).strict().parse(req.body);
      await adminMajorUseCases.startWorkingCopy(req.params.id,mutationContext(req));
      res.setHeader('X-Entity-Revision',String((await adminMajorUseCases.getMajor(req.params.id)).revision));res.json({success:true});
    }));
    router.post('/:id/review-graph',SecurityMiddlewareFactory.createAdminPermissionGuard('admin:majors:review'),asyncHandler(async(req,res)=>{
      const input=z.discriminatedUnion('kind',[
        z.object({kind:z.literal('ALIAS'),alias:z.string().trim().min(1).max(300),aliasType:z.enum(['ALIAS','SYNONYM','HISTORICAL_NAME']),locale:z.enum(['ar','en']),evidenceReference:z.string().trim().min(1).max(500),reason:reasonSchema}).strict(),
        z.object({kind:z.literal('RELATIONSHIP'),targetMajorId:z.string().uuid(),relationshipType:z.enum(['SIMILAR','PARENT','CHILD','CROSS_LISTED']),evidenceReference:z.string().trim().min(1).max(500),reason:reasonSchema}).strict(),
      ]).parse(req.body);
      await adminMajorUseCases.reviewGraph(req.params.id,input.kind,input,mutationContext(req));
      res.setHeader('X-Entity-Revision',String((await adminMajorUseCases.getMajor(req.params.id)).revision));res.json({success:true});
    }));
    router.post('/:id/review-version',SecurityMiddlewareFactory.createAdminPermissionGuard('admin:majors:review'),asyncHandler(async(req,res)=>{
      const input=z.object({versionId:z.string().uuid(),reason:reasonSchema,coverage:z.record(z.string(),z.string().uuid())}).strict().parse(req.body);
      await adminMajorUseCases.reviewWorkingVersion(req.params.id,input.versionId,input.coverage,mutationContext(req));
      res.setHeader('X-Entity-Revision',String((await adminMajorUseCases.getMajor(req.params.id)).revision));
      res.json({success:true});
    }));

    router.get(
      '/:id',
      asyncHandler(async (req: Request, res: Response) => {
        const major = await adminMajorUseCases.getMajor(req.params.id);
        if(major.revision!==undefined) res.setHeader(req.method==='GET'?'ETag':'X-Entity-Revision',String(major.revision));
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
        const profileId = typeof req.query.profileId === 'string' ? req.query.profileId : undefined;
        const page=z.coerce.number().int().min(1).max(1000).default(1).parse(req.query.page);
        const versions=await adminMajorUseCases.listVersions(req.params.id,{profileId,page});
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

    const updateContentSectionsBodySchema = z.object({
      profileId: z.string().optional(),
      versionId: z.string().optional(),
      reason:reasonSchema,
      sections: z.array(
        z.object({
          id: z.string().optional(),
          sectionKey: z.string().trim().min(1).max(200),
          title: z.string().nullable().optional(),
          content: z.string().max(100000),
          reviewStatus: z.enum(['NEEDS_REVIEW','COMPLETE','INCOMPLETE']).optional(),
        }),
      ).max(100),
    }).strict();

    router.get(
      '/:id/content-sections',
      asyncHandler(async (req: Request, res: Response) => {
        const profileId = typeof req.query.profileId === 'string' ? req.query.profileId : undefined;
        const versionId = typeof req.query.versionId === 'string' ? req.query.versionId : undefined;
        const sections = profileId || versionId
          ? await adminMajorUseCases.listContentSections(req.params.id, { profileId, versionId })
          : await adminMajorUseCases.listContentSections(req.params.id);
        res.json({ data: sections });
      }),
    );

    router.put(
      '/:id/content-sections',
      asyncHandler(async (req: Request, res: Response) => {
        const body = updateContentSectionsBodySchema.parse(req.body);
        const result = await adminMajorUseCases.updateContentSections(
          req.params.id,
          {
            profileId: body.profileId,
            versionId: body.versionId,
            sections: body.sections.map(s => ({
              id: s.id,
              sectionKey: s.sectionKey,
              title: s.title ?? undefined,
              content: s.content,
              reviewStatus: s.reviewStatus,
            })),
          },
          mutationContext(req),
        );
        res.setHeader('X-Entity-Revision',String((await adminMajorUseCases.getMajor(req.params.id)).revision));
        res.status(200).json(result);
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
        if (updates.description !== undefined) optionalFields.description = updates.description;
        if (updates.studentFriendlySummary !== undefined)
          optionalFields.studentFriendlySummary = updates.studentFriendlySummary;
        if (updates.acquiredSkills !== undefined)
          optionalFields.acquiredSkills = updates.acquiredSkills;
        if (updates.careerOutcomes !== undefined)
          optionalFields.careerOutcomes = updates.careerOutcomes;
        if (updates.typicalCourses !== undefined)
          optionalFields.typicalCourses = updates.typicalCourses;

        const dataToUpdate: UpdateMajorDto = {
          displayName: updates.displayName,
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
        if(major.revision!==undefined) res.setHeader(req.method==='GET'?'ETag':'X-Entity-Revision',String(major.revision));
        res.json(major);
      }),
    );

    router.post(
      '/:id/mark-ready',
      asyncHandler(async (req: Request, res: Response) => {
        z.object({reason:reasonSchema}).strict().parse(req.body);
        await adminMajorUseCases.markReadyToReview(req.params.id, mutationContext(req));
        res.setHeader('X-Entity-Revision',String((await adminMajorUseCases.getMajor(req.params.id)).revision));
        res.status(200).json({ success: true });
      }),
    );

    router.post(
      '/:id/mark-publishable',
      SecurityMiddlewareFactory.createAdminPermissionGuard('admin:majors:review'),
      asyncHandler(async (req: Request, res: Response) => {
        z.object({reason:reasonSchema}).strict().parse(req.body);
        await adminMajorUseCases.markReadyToPublish(req.params.id, mutationContext(req));
        res.setHeader('X-Entity-Revision',String((await adminMajorUseCases.getMajor(req.params.id)).revision));
        res.status(200).json({ success: true });
      }),
    );

    router.post(
      '/:id/publish',
      SecurityMiddlewareFactory.createAdminPermissionGuard('admin:majors:publish'),
      asyncHandler(async (req: Request, res: Response) => {
        z.object({reason:reasonSchema}).strict().parse(req.body);
        await adminMajorUseCases.publish(req.params.id, mutationContext(req));
        res.setHeader('X-Entity-Revision',String((await adminMajorUseCases.getMajor(req.params.id)).revision));
        res.status(200).json({ success: true });
      }),
    );

    router.post(
      '/:id/unpublish',
      SecurityMiddlewareFactory.createAdminPermissionGuard('admin:majors:publish'),
      asyncHandler(async (req: Request, res: Response) => {
        z.object({reason:reasonSchema}).strict().parse(req.body);
        await adminMajorUseCases.unpublish(req.params.id, mutationContext(req));
        res.setHeader('X-Entity-Revision',String((await adminMajorUseCases.getMajor(req.params.id)).revision));
        res.status(200).json({ success: true });
      }),
    );

    router.post(
      '/:id/reject',
      asyncHandler(async (req: Request, res: Response) => {
        z.object({reason:reasonSchema}).strict().parse(req.body);
        await adminMajorUseCases.reject(req.params.id, mutationContext(req));
        res.setHeader('X-Entity-Revision',String((await adminMajorUseCases.getMajor(req.params.id)).revision));
        res.status(200).json({ success: true });
      }),
    );

    router.post(
      '/:id/archive',
      asyncHandler(async (req: Request, res: Response) => {
        z.object({reason:reasonSchema}).strict().parse(req.body);
        await adminMajorUseCases.archive(req.params.id, mutationContext(req));
        res.setHeader('X-Entity-Revision',String((await adminMajorUseCases.getMajor(req.params.id)).revision));
        res.status(200).json({ success: true });
      }),
    );

    router.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation Error', details: err.issues });
      }
      const persistenceCode=err && typeof err==='object' && 'code' in err ? String(err.code) : undefined;
      if(persistenceCode==='P2002') return res.status(409).json({error:'MAJOR_DUPLICATE_IDENTITY'});
      const code=err instanceof Error ? err.message : '';
      const known=/^(MAJOR_|NEW_MAJOR_|TARGET_MAJOR_|CONTENT_SECTION_|NO_WORKING_VERSION_)[A-Z0-9_]+$/.test(code);
      const status=code.includes('STALE')?409:code.includes('NOT_FOUND')?404:code.includes('ACTOR')?401:known?422:500;
      res.status(status).json({error:known?code:'INTERNAL_SERVER_ERROR'});
    });

    return router;
  }
}
