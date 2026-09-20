import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CareerPublicUseCases } from '@manaratak/application';
import { CareerOpportunityType, EmploymentType } from '@manaratak/domain';

export class CareerPublicRouter {
  public static create(cradle: { careerPublicUseCases: CareerPublicUseCases }): Router {
    const router = Router();
    const { careerPublicUseCases } = cradle;

    const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };

    const querySchema = z.object({
      opportunityType: z.nativeEnum(CareerOpportunityType).optional(),
      employmentType: z.nativeEnum(EmploymentType).optional(),
      jobCategory: z.string().optional(),
      countryReferenceId: z.string().optional(),
      cityReferenceId: z.string().optional(),
      country: z.string().optional(),
      city: z.string().optional(),
      employerId: z.string().optional(),
      cursor: z.string().trim().min(1).max(2048).optional(),
      limit: z.coerce.number().int().min(1).max(100).default(20)
    });

    router.get('/jobs', asyncHandler(async (req: Request, res: Response) => {
      const filters = querySchema.parse(req.query);
      res.json(await careerPublicUseCases.listPublishedJobs(filters));
    }));

    router.get('/jobs/:slug', asyncHandler(async (req: Request, res: Response) => {
      res.json(await careerPublicUseCases.getPublishedJobBySlug(req.params.slug));
    }));

    router.use((err: any, req: Request, res: Response, next: NextFunction) => {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation Error', details: err.issues });
      }
      if (err instanceof Error && err.message.includes('not found')) {
        return res.status(404).json({ error: 'Not found' });
      }
      res.status(500).json({ error: 'CAREER_REQUEST_FAILED' });
    });

    return router;
  }
}
