import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CourseAccessType, CourseOriginType } from '@manaratak/domain';
import { CourseRelationshipQueryService, PublicCourseUseCases } from '@manaratak/application';
import { parseRequestLocale, toApiValidationErrorPayload } from '../locale/LocaleQueryContract.js';

export class CoursePublicRouter {
  public static create(cradle: { publicCourseUseCases: PublicCourseUseCases; courseRelationshipQueryService: CourseRelationshipQueryService }): Router {
    const router = Router();
    router.use((_req,res,next)=>{res.set('Cache-Control','no-store');next();});
    const { publicCourseUseCases, courseRelationshipQueryService } = cradle;

    const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };

    const listQuerySchema = z.object({
      search: z.string().trim().max(200).optional(),
      accessType: z.nativeEnum(CourseAccessType).optional(),
      originType: z.nativeEnum(CourseOriginType).optional(),
      platformName: z.string().optional(),
      category: z.string().optional(),
      learningLanguage: z.string().optional(),
      majorId: z.string().trim().min(1).optional(),
      taxonomyNodeId: z.string().trim().min(1).optional(),
      learningLanguageReferenceId: z.string().trim().min(1).optional(),
      providerHeadquartersCountryReferenceId: z.string().trim().min(1).optional(),
      internationalTestId: z.string().trim().min(1).optional(),
      cursor: z.string().trim().min(1).max(2048).optional(),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    });

    router.get('/', asyncHandler(async (req: Request, res: Response) => {
      const locale = parseRequestLocale(req.query);
      const { locale: _locale, ...query } = req.query;
      const filters = listQuerySchema.parse(query);
      const { majorId, taxonomyNodeId, learningLanguageReferenceId, providerHeadquartersCountryReferenceId, internationalTestId, ...baseFilters } = filters;
      const hasRelationshipFilter = Boolean(majorId || taxonomyNodeId || learningLanguageReferenceId || providerHeadquartersCountryReferenceId || internationalTestId);
      const result = hasRelationshipFilter
        ? await courseRelationshipQueryService.listPublishedRelatedCourses({
            ...baseFilters,
            majorId,
            taxonomyNodeId,
            learningLanguageReferenceId,
            providerHeadquartersCountryReferenceId,
            internationalTestId,
          })
        : await publicCourseUseCases.listCourses(baseFilters, locale);
      res.json(hasRelationshipFilter ? publicCourseUseCases.localizeRelationshipPage(result, locale) : result);
    }));

    router.get('/:slug', asyncHandler(async (req: Request, res: Response) => {
      try {
        const locale = parseRequestLocale(req.query);
        const course = await publicCourseUseCases.getCourse(req.params.slug, locale);
        res.json(course);
      } catch (err: any) {
        if (err.message === 'Course not found') {
          return res.status(404).json({ error: 'Not found' });
        }
        throw err;
      }
    }));

    router.get('/:slug/launch',asyncHandler(async(req:Request,res:Response)=>{
      try{const course=await publicCourseUseCases.getCourse(req.params.slug,parseRequestLocale(req.query));if(course.originType!=='EXTERNAL_LINKED_COURSE')return res.status(404).json({error:'Not found'});const url=new URL(course.directCourseUrl);if(url.protocol!=='https:'||url.username||url.password)return res.status(404).json({error:'Not found'});res.set('Cache-Control','no-store');return res.redirect(303,url.toString());}catch(error){if(error instanceof Error&&error.message==='Course not found')return res.status(404).json({error:'Not found'});throw error;}
    }));

    router.use((err: any, req: Request, res: Response, next: NextFunction) => {
      if (err instanceof z.ZodError) {
        return res.status(400).json(toApiValidationErrorPayload(err));
      }
      res.status(500).json({ error: 'Internal Server Error' });
    });

    return router;
  }
}
