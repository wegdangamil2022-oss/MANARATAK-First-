import { Router } from 'express';
import { z } from 'zod';
import { CareerPublicUseCases } from '@absheer/application';
import { CareerOpportunityType, EmploymentType, ICareerEngagementRepository } from '@absheer/domain';
import { careerPaging, careerHandler, careerError } from './CareerHttp.js';
export class CareerPublicRouter {
  static create(cradle: { careerPublicUseCases: CareerPublicUseCases; careerEngagementRepository: ICareerEngagementRepository }) {
    const router = Router();
    const query = z.object({ opportunityType: z.nativeEnum(CareerOpportunityType).optional(), employmentType: z.nativeEnum(EmploymentType).optional(), jobCategory: z.string().max(120).optional(), countryReferenceId: z.string().optional(), cityReferenceId: z.string().optional(), country: z.string().max(120).optional(), city: z.string().max(120).optional(), employerId: z.string().optional(), search: z.string().trim().max(120).optional(), remoteOption: z.enum(['true','false']).transform(value => value === 'true').optional(), locale: z.enum(['ar','en']).default('ar'), cursor: z.string().min(1).max(2048).optional(), limit: z.coerce.number().int().min(1).max(50).default(20) });
    router.get('/jobs', careerHandler(async(req,res) => { res.json(await cradle.careerPublicUseCases.listPublishedJobs(query.parse(req.query))); }));
    router.get('/jobs/:slug', careerHandler(async(req,res) => { res.json(await cradle.careerPublicUseCases.getPublishedJobBySlug(req.params.slug, z.enum(['ar','en']).default('ar').parse(req.query.locale))); }));
    router.get('/alumni', careerHandler(async(req,res) => {
      const { page, pageSize } = z.object(careerPaging).parse(req.query);
      res.setHeader('Cache-Control','no-store'); res.json(await cradle.careerEngagementRepository.listPublicAlumni?.(page,pageSize));
    }));
    router.use(careerError); return router;
  }
}
