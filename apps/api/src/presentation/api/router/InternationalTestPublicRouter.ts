import type {TestDiscoveryOwnerUseCases} from '@manaratak/application';
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { LocalizedInternationalTestPublicUseCases } from '@manaratak/application';
import { IInternationalTestRepository, InternationalTestCategory, InternationalTestCompletenessStatus } from '@manaratak/domain';
import { localeQuerySchema, parseRequestLocale, toApiValidationErrorPayload } from '../locale/LocaleQueryContract.js';

export class InternationalTestPublicRouter {
  public static create(cradle: { studentToolTestDiscovery?:TestDiscoveryOwnerUseCases;serviceTestDiscovery?:TestDiscoveryOwnerUseCases;internationalTestRepository: IInternationalTestRepository; internationalTestConsumerReadGateway?: {usage(id:string,page:number,publishedOnly:boolean):Promise<{data:Array<{slug:string;name:string;universityId:string;programName:string}>}>} }): Router {
    const router = Router();
    const localized = new LocalizedInternationalTestPublicUseCases(cradle.internationalTestRepository);
    const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res, next)).catch(next);

    const querySchema = z.object({
      completenessStatus: z.nativeEnum(InternationalTestCompletenessStatus).optional(),
      testCategory: z.nativeEnum(InternationalTestCategory).optional(),
      searchQuery:z.string().trim().max(200).optional(),
      countryIso2Code:z.string().regex(/^[A-Z]{2}$/).optional(),
      providerName: z.string().optional(),
      page: z.coerce.number().int().min(1).max(1000000).default(1),
      pageSize: z.coerce.number().int().min(1).max(50).default(20),
    }).merge(localeQuerySchema);

    router.get('/', asyncHandler(async (req: Request, res: Response) => {
      const { locale, ...filters } = querySchema.parse(req.query);
      res.json(await localized.listPublished(filters, locale));
    }));

    router.get('/:slug/discovery',asyncHandler(async(req:Request,res:Response)=>{
      const query=z.object({locale:z.enum(['ar','en']).default('ar'),owner:z.enum(['STUDENT_TOOLS','SERVICES']),after:z.string().trim().min(1).max(160).optional(),limit:z.coerce.number().int().min(1).max(50).default(12)}).strict().parse(req.query);
      const test=await cradle.internationalTestRepository.findPublishedBySlug(req.params.slug);
      if(!test)return void res.status(404).json({error:'Not found'});
      res.setHeader('Cache-Control','no-store');
      const owner=query.owner==='STUDENT_TOOLS'?cradle.studentToolTestDiscovery:cradle.serviceTestDiscovery;
      if(!owner)return void res.status(503).json({error:'TEST_DISCOVERY_UNAVAILABLE'});
      try{res.json({data:await owner.publicPage(test.id,query.locale,query.after,query.limit)});}catch(error){if(error instanceof Error&&error.message==='TEST_DISCOVERY_CURSOR_INVALID')return void res.status(400).json({error:error.message});res.status(503).json({error:'TEST_DISCOVERY_UNAVAILABLE'});}
    }));
    router.get('/:slug', asyncHandler(async (req: Request, res: Response) => {
      const test=await localized.getPublishedBySlug(req.params.slug,parseRequestLocale(req.query));
      const links=await cradle.internationalTestConsumerReadGateway?.usage(test.id,1,true);
      res.json({...test,relatedUniversities:links?.data.map(row=>({id:row.slug,name:row.name,meta:row.programName}))??[]});
    }));

    router.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
      if (err instanceof z.ZodError) return res.status(400).json(toApiValidationErrorPayload(err));
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('not found')) return res.status(404).json({ error: 'Not found' });
      next(err);
    });
    return router;
  }
}
