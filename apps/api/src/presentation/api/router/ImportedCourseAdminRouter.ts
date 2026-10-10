import type {CourseAdminCommandUseCases,CourseAdminContext,AdminCourseUseCases} from '@manaratak/application';
import { NextFunction, Request, Response, Router } from 'express';
import { z } from 'zod';
import {
  CourseAccessType,
  CourseImportCompletenessState,
  CourseOriginType,
} from '@manaratak/domain';
import { ImportedCourseAdminUseCases } from '@manaratak/application';

export class ImportedCourseAdminRouter {
  public static create(cradle: { courseAdminCommandUseCases:CourseAdminCommandUseCases; adminCourseUseCases:AdminCourseUseCases; importedCourseAdminUseCases: ImportedCourseAdminUseCases }): Router {
    const router = Router();
    const useCases = cradle.importedCourseAdminUseCases;

    const mutationContext=(req:Request):CourseAdminContext=>{
      if(!req.authUserId) throw new Error('AUTHENTICATED_ADMIN_ACTOR_REQUIRED');
      const reason=z.string().trim().min(3).max(2000).parse(req.get('X-Review-Reason')??z.object({ reason: z.string().optional() }).strip().parse(req.body ?? {}).reason);
      const match=/^(?:"(\d+)"|(\d+))$/.exec(req.get('If-Match')??'');
      const expectedVersion=match?Number(match[1]??match[2]):undefined;
      if(!Number.isSafeInteger(expectedVersion)||expectedVersion!<1) throw new Error('COURSE_VERSION_PRECONDITION_REQUIRED');
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
            const action=req.route.path==='/:id/unpublish'?'COURSE_UNPUBLISH':req.route.path==='/:id/archive'?'COURSE_ARCHIVE':'IMPORTED_COURSE_ADMIN_COMMAND';
            const result=await cradle.courseAdminCommandUseCases.execute('COURSE',req.params.id,action,context,
              scope=>fn(req,buffered,scope.importedCourseAdminUseCases));
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
    }).strict();

    router.get('/', asyncHandler(async (req, res, useCases) => {
      const filters = listSchema.parse(req.query);
      res.json(await useCases.list(filters));
    }));

    router.get('/:id', asyncHandler(async (req, res, useCases) => {
      res.json(await useCases.get(req.params.id));
    }));

    router.patch('/:id', asyncHandler(async (req, res, useCases) => {
      const update = updateSchema.parse(req.body);
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
      return res.status(400).json({ error: message });
    });

    return router;
  }
}
