import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CrossDomainGraphReadService } from '@manaratak/application';

export class CrossDomainReadModelRouter {
  public static create(cradle: { crossDomainGraphReadService: CrossDomainGraphReadService }): Router {
    const router = Router();
    const { crossDomainGraphReadService } = cradle;
    const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) =>
      Promise.resolve(fn(req, res, next)).catch(next);

    const paginationSchema = z.object({
  locale: z.enum(['ar', 'en']).default('ar'),
      page: z.coerce.number().int().min(1).max(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(50).default(12),
      universityCursor:z.string().min(1).max(2048).optional(),
      scholarshipCursor:z.string().min(1).max(2048).optional(),
      serviceCursor:z.string().min(1).max(2048).optional(),
      courseCursor:z.string().min(1).max(2048).optional(),
      majorCursor:z.string().min(1).max(2048).optional(),
      editorialCursor:z.string().min(1).max(2048).optional(),
      testCursor:z.string().min(1).max(2048).optional(),
      careerCursor:z.string().min(1).max(2048).optional(),
      toolCursor:z.string().min(1).max(2048).optional(),
        programCursor: z.string().min(1).max(2048).optional(),
    }).strict();

    const parse=(req:Request,kind:'majors'|'universities'|'scholarships'|'countries'|'tests')=>{
      const supported:Record<string,string[]>={majors:['universityCursor','scholarshipCursor','courseCursor','editorialCursor'],universities:['majorCursor','programCursor','scholarshipCursor','editorialCursor'],scholarships:['universityCursor','programCursor','majorCursor','editorialCursor'],countries:['universityCursor','programCursor','majorCursor','scholarshipCursor','testCursor','serviceCursor','careerCursor','courseCursor','editorialCursor'],tests:['universityCursor','scholarshipCursor','courseCursor','toolCursor','serviceCursor','editorialCursor']};
      const value=paginationSchema.parse(req.query);
      if(Object.keys(value).some(key=>key.endsWith('Cursor')&&!supported[kind].includes(key)))throw new Error('GRAPH_CURSOR_INVALID');
      return value;
    };
    router.use((_req,res,next)=>{res.setHeader('Cache-Control','no-store');next();});
    router.get('/tests/:id',asyncHandler(async(req:Request,res:Response)=>{res.json(await crossDomainGraphReadService.getInternationalTestGraphById(req.params.id,parse(req,'tests')));}));
    router.get('/majors/:slug', asyncHandler(async (req: Request, res: Response) => {
      res.json(await crossDomainGraphReadService.getMajorGraphBySlug(req.params.slug, parse(req,'majors')));
    }));

    router.get('/universities/:slug', asyncHandler(async (req: Request, res: Response) => {
      res.json(await crossDomainGraphReadService.getUniversityGraphBySlug(req.params.slug, parse(req,'universities')));
    }));

    router.get('/scholarships/:slug', asyncHandler(async (req: Request, res: Response) => {
      res.json(await crossDomainGraphReadService.getScholarshipGraphBySlug(req.params.slug, parse(req,'scholarships')));
    }));

    router.get('/countries/:iso2Code', asyncHandler(async (req: Request, res: Response) => {
      res.json(await crossDomainGraphReadService.getCountryGraphByIso2Code(req.params.iso2Code, parse(req,'countries')));
    }));

    router.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
      if(err instanceof Error&&['GRAPH_CURSOR_INVALID','CURSOR_INVALID'].includes(err.message))return res.status(400).json({error:'GRAPH_CURSOR_INVALID'});
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation Error', details: err.issues });
      }
      if (err instanceof Error && ['Major not found', 'University not found', 'Scholarship not found', 'Country not found','International test not found'].includes(err.message)) {
        return res.status(404).json({ error: 'Not found' });
      }
      return next(err);
    });

    return router;
  }
}
