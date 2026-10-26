import type {CourseAdminCommandUseCases,CourseAdminContext,AdminCourseUseCases,CourseBulkPublicationUseCases} from '@manaratak/application';
import { readReviewReasonHeader } from '@manaratak/shared';
import { NextFunction, Request, Response, Router } from 'express';
import { z } from 'zod';
import {
  CourseAccessType,
  CourseImportCompletenessState,
  CourseOriginType,
  CourseStatus,
} from '@manaratak/domain';
import { ImportedCourseAdminUseCases } from '@manaratak/application';

export class ImportedCourseAdminRouter {
  public static create(cradle: { courseAdminCommandUseCases:CourseAdminCommandUseCases; adminCourseUseCases:AdminCourseUseCases; importedCourseAdminUseCases: ImportedCourseAdminUseCases; courseBulkPublicationUseCases?: CourseBulkPublicationUseCases }): Router {
    const router = Router();
    const useCases = cradle.importedCourseAdminUseCases;

    const mutationContext=(req:Request):CourseAdminContext=>{
      if(!req.authUserId) throw new Error('AUTHENTICATED_ADMIN_ACTOR_REQUIRED');
      const reason=z.string().trim().min(3).max(2000).parse(readReviewReasonHeader(req.get('X-Review-Reason'),req.get('X-Review-Reason-Encoding'))??z.object({ reason: z.string().optional() }).strip().parse(req.body ?? {}).reason);
      const match=/^(?:"(\d+)"|(\d+))$/.exec(req.get('If-Match')??'');
      const expectedVersion=match?Number(match[1]??match[2]):undefined;
      if(req.params.id && (!Number.isSafeInteger(expectedVersion)||expectedVersion!<1)) throw new Error('COURSE_VERSION_PRECONDITION_REQUIRED');
      return {actorId:req.authUserId,actorType:'IDENTITY',source:'admin-imported-course-api',reason,expectedVersion};
    };
    const asyncHandler=(fn:(req:Request,res:Response,useCases:ImportedCourseAdminUseCases)=>Promise<unknown>)=>
      (req:Request,res:Response,next:NextFunction)=>{
        const run=async()=>{
          if(req.method==='GET') return fn(req,res,useCases);
          const context=mutationContext(req);
          let body:unknown;let send=false;
          const buffered:Response=new Proxy(res,{get(target,key){
            if(key==='json')return(value:unknown)=>{body=value;return buffered;};
            if(key==='end'||key==='send')return(value:unknown)=>{body=value;send=true;return buffered;};
            if(key==='status')return(code:number)=>{target.statusCode=code;return buffered;};
            const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;
          }});
          let version:number|undefined;
          if(req.route.path==='/:id/publish'){
            await fn(req,buffered,useCases);
            version=(await cradle.adminCourseUseCases.getCourse(req.params.id)).version;
          }else{
            const action=req.route.path==='/' && req.method==='POST'?'MANUAL_EXTERNAL_COURSE_CREATED':req.method==='PATCH'?'EXTERNAL_COURSE_SECTION_UPDATED':req.route.path==='/:id/unpublish'?'COURSE_UNPUBLISH':req.route.path==='/:id/archive'?'COURSE_ARCHIVE':'IMPORTED_COURSE_ADMIN_COMMAND';
            const result=await cradle.courseAdminCommandUseCases.execute('COURSE',req.params.id,action,context,
              async scope=>{ await fn(req,buffered,scope.importedCourseAdminUseCases); return body; });
            version=result.version;
          }
          if(version!==undefined)res.setHeader('X-Entity-Version',String(version));
          if(send)res.send(body);else res.json(body);
        };run().catch(next);
      };

    const optionalPositiveInt = z.string().optional().transform((value) => {
      if (!value) return undefined;
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
    });

    const listSchema = z.object({
      q: z.string().trim().max(200).optional(),
      providerId: z.string().trim().max(200).optional(),
      status: z.string().trim().max(64).optional(),
      completenessStatus: z.string().trim().max(64).optional(),
      language: z.string().trim().max(128).optional(),
      freeMode: z.enum(['FREE_STUDY', 'FREE_CERTIFICATE']).optional(),
      linkHealth: z.enum([
        'VERIFIED_DIRECT',
        'REDIRECTED_VALID',
        'NEEDS_REVIEW',
        'BROKEN',
        'BLOCKED_DOMAIN',
        'NOT_DIRECT_COURSE_PAGE',
        'UNKNOWN',
      ]).optional(),
      page: optionalPositiveInt,
      pageSize: optionalPositiveInt,
    });

    const updateSchema = z.object({
      displayName: z.string().trim().min(1).max(500).optional(),
      accessType: z.nativeEnum(CourseAccessType).optional(),
      originType: z.literal(CourseOriginType.EXTERNAL_LINKED_COURSE).optional(),
      directCourseUrl: z.string().url().refine((value) => value.startsWith('https://'), 'HTTPS required').optional(),
      originalSourceTitle: z.string().nullable().optional(),
      isStudyFree: z.boolean().nullable().optional(),
      isFreeCertificate: z.boolean().nullable().optional(),
      certificateType: z.string().nullable().optional(),
      learningLanguageRaw: z.string().nullable().optional(),
      studyLevelRaw: z.string().nullable().optional(),
      studyDurationRaw: z.string().nullable().optional(),
      shortCourseTopicsRaw: z.string().nullable().optional(),
      platformName: z.string().nullable().optional(),
      providerName: z.string().nullable().optional(),
      learningLanguage: z.string().nullable().optional(),
      studyDuration: z.string().nullable().optional(),
      certificateAvailable: z.boolean().nullable().optional(),
      category: z.string().nullable().optional(),
      difficultyLevel: z.string().nullable().optional(),
      sourceUrl: z.string().url().nullable().optional(),
      officialSourceUrl: z.string().url().nullable().optional(),
      thumbnailAssetId: z.string().nullable().optional(),
      completenessStatus: z.nativeEnum(CourseImportCompletenessState).optional(),
      description: z.string().max(100000).optional(),
      learningOutcomes: z.array(z.string().max(2000)).max(100).optional(),
      prerequisites: z.array(z.string().max(2000)).max(100).optional(),
      acquiredSkills: z.array(z.string().max(2000)).max(100).optional(),
      certificateConditions: z.string().max(10000).optional(),
    }).strict();

    const https = z.string().trim().max(4000).url().refine(value => { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; }, 'HTTPS URL without credentials required');
    const text = z.string().trim().max(2000).optional();
    const createSchema = z.object({
      originalSourceTitle: z.string().trim().min(2).max(500), displayName: z.string().trim().min(2).max(500).optional(),
      externalProviderId: z.string().min(1).max(200), directCourseUrl: https, evidenceUrl: https,
      evidenceObservedAt: z.string().datetime(), evidenceNote: text, platformName: text, learningLanguageRaw: text,
      studyLevelRaw: text, studyDurationRaw: text, shortCourseTopicsRaw: z.string().max(20000).optional(), certificateType: text,
      certificateConditions: z.string().max(10000).optional(), isStudyFree: z.boolean().nullable().optional(),
      isFreeCertificate: z.boolean().nullable().optional(), certificateAvailable: z.boolean().nullable().optional(),
      description: z.string().max(100000).optional(), learningOutcomes: z.array(z.string().max(2000)).max(100).optional(),
      prerequisites: z.array(z.string().max(2000)).max(100).optional(), acquiredSkills: z.array(z.string().max(2000)).max(100).optional(),
    }).strict();

    router.post('/', asyncHandler(async (req, res, useCases) => {
      const input = createSchema.parse(req.body);
      const course = await useCases.createManual(input, req.authUserId!);
      res.status(201).json(course);
    }));

    const bulk = () => { if (!cradle.courseBulkPublicationUseCases) throw new Error('COURSE_BULK_NOT_CONFIGURED'); return cradle.courseBulkPublicationUseCases; };
    const bulkHandler = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => {
      if (!req.authUserId) { res.status(401).json({ error: 'AUTHENTICATED_ADMIN_ACTOR_REQUIRED' }); return; }
      Promise.resolve().then(() => fn(req, res)).catch(next);
    };
    const bulkReason = (req: Request) => z.string().trim().min(3).max(2000).parse(readReviewReasonHeader(req.get('X-Review-Reason'), req.get('X-Review-Reason-Encoding')));
    const filterText = z.string().trim().max(200).optional();
    const bulkFilters = z.object({ search: filterText, externalProviderId: filterText, majorId: filterText, category: filterText,
      learningLanguage: filterText, difficultyLevel: filterText, platformName: filterText, status: z.nativeEnum(CourseStatus).optional(),
      completenessStatus: z.nativeEnum(CourseImportCompletenessState).optional(), studyAccess: z.enum(['FREE', 'PAID', 'UNKNOWN']).optional(),
      certificateState: z.enum(['FREE', 'NON_FREE', 'UNAVAILABLE', 'UNKNOWN']).optional(), linkHealth: z.enum(['VERIFIED', 'BROKEN', 'NEEDS_REVIEW', 'UNKNOWN']).optional() }).strict();
    const selectionSchema = z.discriminatedUnion('mode', [
      z.object({ mode: z.literal('IDS'), ids: z.array(z.string().uuid()).min(1).max(20000) }).strict(),
      z.object({ mode: z.literal('FILTER'), filters: bulkFilters }).strict(),
    ]);
    const batchId = (req: Request) => z.string().uuid().parse(req.params.batchId);
    router.get('/bulk', bulkHandler(async (req, res) => {
      const { page } = z.object({ page: z.coerce.number().int().min(1).max(1000).default(1) }).strict().parse(req.query);
      res.json(await bulk().list(req.authUserId!, page));
    }));
    router.post('/bulk/preview', bulkHandler(async (req, res) => {
      const input = selectionSchema.parse(req.body), selection = input.mode === 'IDS' ? { ids: input.ids } : { filters: input.filters };
      res.status(201).json(await bulk().preview(selection, req.authUserId!, bulkReason(req), z.string().parse(req.get('Idempotency-Key'))));
    }));
    router.get('/bulk/:batchId', bulkHandler(async (req, res) => {
      const query = z.object({ page: z.coerce.number().int().min(1).max(1000).default(1), state: z.enum(['PENDING', 'ELIGIBLE', 'BLOCKED', 'SUCCESS', 'FAILED', 'NOT_EXECUTED']).optional() }).strict().parse(req.query);
      res.json(await bulk().read(batchId(req), req.authUserId!, query.page, query.state));
    }));
    router.post('/bulk/:batchId/step', bulkHandler(async (req, res) => {
      z.object({}).strict().parse(req.body ?? {});
      res.json(await bulk().step(batchId(req), req.authUserId!));
    }));
    router.post('/bulk/:batchId/confirm', bulkHandler(async (req, res) => {
      const input = z.object({ digest: z.string().regex(/^[a-f0-9]{64}$/), eligibleOnly: z.boolean() }).strict().parse(req.body);
      res.json(await bulk().confirm(batchId(req), req.authUserId!, input.digest, input.eligibleOnly, bulkReason(req)));
    }));
    router.post('/bulk/:batchId/cancel', bulkHandler(async (req, res) => {
      z.object({}).strict().parse(req.body ?? {});
      res.json(await bulk().cancel(batchId(req), req.authUserId!, bulkReason(req)));
    }));
    router.post('/bulk/:batchId/retry', bulkHandler(async (req, res) => {
      z.object({}).strict().parse(req.body ?? {});
      res.status(201).json(await bulk().retry(batchId(req), req.authUserId!, bulkReason(req), z.string().parse(req.get('Idempotency-Key'))));
    }));

    router.get('/', asyncHandler(async (req, res, useCases) => {
      const filters = listSchema.parse(req.query);
      res.json(await useCases.list(filters));
    }));

    router.get('/:id', asyncHandler(async (req, res, useCases) => {
      res.json(await useCases.get(req.params.id));
    }));

    router.get('/:id/readiness', asyncHandler(async (req, res) => {
      res.json(await cradle.adminCourseUseCases.getExternalReadiness(req.params.id));
    }));
    router.get('/:id/history', asyncHandler(async (req, res, useCases) => {
      const { page } = z.object({ page: z.coerce.number().int().min(1).max(100000).default(1) }).strict().parse(req.query);
      res.json(await useCases.history(req.params.id, page));
    }));

    router.patch('/:id', asyncHandler(async (req, res, useCases) => {
      const { description, learningOutcomes, prerequisites, acquiredSkills, certificateConditions, ...fields } = updateSchema.parse(req.body);
      const optional = Object.fromEntries(Object.entries({ description, learningOutcomes, prerequisites, acquiredSkills, certificateConditions }).filter(([, value]) => value !== undefined));
      const update = { ...fields, ...(Object.keys(optional).length ? { optionalFields: optional } : {}) };
      res.json(await useCases.update(req.params.id, update));
    }));

    router.post('/:id/verify-source', asyncHandler(async (req, res, useCases) => {
      res.json(await useCases.verifySource(req.params.id));
    }));

    router.post('/:id/check-link', asyncHandler(async (req, res, useCases) => {
      res.json(await useCases.checkLink(req.params.id));
    }));

    router.post('/:id/fetch-missing', asyncHandler(async (req, res, useCases) => {
      await useCases.fetchMissing(req.params.id);
      res.status(204).end();
    }));

    router.post('/:id/mark-ready', asyncHandler(async (req, res, useCases) => {
      res.json(await useCases.markReady(req.params.id));
    }));

    router.post('/:id/publish', asyncHandler(async (req, res, useCases) => {
      res.json(await useCases.publish(req.params.id,mutationContext(req)));
    }));

    router.post('/:id/unpublish', asyncHandler(async (req, res, useCases) => {
      res.json(await useCases.unpublish(req.params.id));
    }));

    router.post('/:id/reject', asyncHandler(async (req, res, useCases) => {
      res.json(await useCases.reject(req.params.id));
    }));

    router.post('/:id/archive', asyncHandler(async (req, res, useCases) => {
      res.json(await useCases.archive(req.params.id));
    }));

    router.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      if(err.message==='COURSE_VERSION_PRECONDITION_REQUIRED')return res.status(428).json({error:err.message});
      if(['COURSE_STALE_VERSION','COURSE_PUBLICATION_STATE_CHANGED'].includes(err.message))return res.status(409).json({error:err.message});
      if(err.code === 'P2002' || err.message === 'MANUAL_COURSE_DUPLICATE_REQUIRES_REVIEW')return res.status(409).json({error:'MANUAL_COURSE_DUPLICATE_REQUIRES_REVIEW'});
      if (err.message?.startsWith('COURSE_BULK_')) return res.status(err.message === 'COURSE_BULK_NOT_FOUND' ? 404 : err.message === 'COURSE_BULK_NOT_CONFIGURED' ? 503 : 409).json({error:err.message});
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation Error', details: err.issues });
      }

      const message = err instanceof Error ? err.message : 'IMPORTED_COURSE_OPERATION_FAILED';
      if (message.includes('NOT_FOUND')) return res.status(404).json({ error: message });
      if (message.startsWith('COURSE_FETCH_MISSING_')) return res.status(409).json({ error: message });
      if (
        message.includes('REQUIRED') ||
        message.includes('FORBIDDEN') ||
        message.includes('NOT_APPROVED') ||
        message.includes('BLOCKED') ||
        message.includes('Cannot ') ||
        message.includes('Only ')
      ) {
        return res.status(409).json({ error: message });
      }
      if (/^(COURSE_|IMPORTED_COURSE_|MANUAL_COURSE_)[A-Z0-9_]+$/.test(message)) return res.status(400).json({ error: message });
      return res.status(503).json({ error: 'IMPORTED_COURSE_SERVICE_UNAVAILABLE' });
    });

    return router;
  }
}
