import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CareerAdminUseCases } from '@manaratak/application';
import { CareerEmployerStatus, CareerJobStatus, CareerOpportunityType, EmploymentType } from '@manaratak/domain';

export class CareerAdminRouter {
  public static create(cradle: { careerAdminUseCases: CareerAdminUseCases }): Router {
    const router = Router();
    const { careerAdminUseCases } = cradle;

    const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };

    const httpUrl = z.string().url().refine((value) => /^https?:\/\//i.test(value), {
      message: 'Only http/https URLs are allowed',
    });

    const employerSchema = z.object({
      displayName: z.string().min(1),
      employerType: z.string().min(1),
      industry: z.string().nullable().optional(),
      countryReferenceId: z.string().nullable().optional(),
      cityReferenceId: z.string().nullable().optional(),
      country: z.string().nullable().optional(),
      city: z.string().nullable().optional(),
      websiteUrl: httpUrl.nullable().optional(),
      logoAssetId: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      metadata: z.record(z.string(), z.unknown()).nullable().optional()
    });

    const jobSchema = z.object({
      title: z.string().min(1),
      opportunityType: z.nativeEnum(CareerOpportunityType),
      employmentType: z.nativeEnum(EmploymentType),
      jobCategory: z.string().min(1),
      description: z.string().min(1),
      countryReferenceId: z.string().optional(),
      cityReferenceId: z.string().nullable().optional(),
      country: z.string().min(1).optional(),
      city: z.string().nullable().optional(),
      employerId: z.string().min(1),
      recruiterContactId: z.string().nullable().optional(),
      applicationDeadline: z.string().datetime().nullable().optional(),
      externalPostingUrl: httpUrl.nullable().optional(),
      salaryRange: z.record(z.string(), z.unknown()).nullable().optional(),
      requiredSkills: z.array(z.string()).nullable().optional(),
      educationRequirement: z.string().nullable().optional(),
      languageRequirements: z.array(z.string()).nullable().optional(),
      remoteOption: z.boolean().optional(),
      metadata: z.record(z.string(), z.unknown()).nullable().optional()
    });

    const listQuerySchema = z.object({
      status: z.nativeEnum(CareerJobStatus).optional(),
      opportunityType: z.nativeEnum(CareerOpportunityType).optional(),
      employmentType: z.nativeEnum(EmploymentType).optional(),
      jobCategory: z.string().optional(),
      countryReferenceId: z.string().optional(),
      cityReferenceId: z.string().optional(),
      employerId: z.string().optional(),
      page: z.string().optional().transform((value) => value ? parseInt(value, 10) : 1),
      pageSize: z.string().optional().transform((value) => value ? Math.min(parseInt(value, 10), 50) : 20)
    });

    const expectedVersionSchema = z.object({ expectedVersion: z.number().int().positive() }).strict();

    const employerListQuerySchema = z.object({
      verificationStatus: z.nativeEnum(CareerEmployerStatus).optional(),
      employerType: z.string().optional(),
      countryReferenceId: z.string().optional(),
      page: z.string().optional().transform((value) => value ? parseInt(value, 10) : 1),
      pageSize: z.string().optional().transform((value) => value ? Math.min(parseInt(value, 10), 50) : 50)
    });

    router.get('/employers', asyncHandler(async (req: Request, res: Response) => {
      const filters = employerListQuerySchema.parse(req.query);
      res.json(await careerAdminUseCases.listEmployers(filters));
    }));

    router.post('/employers', asyncHandler(async (req: Request, res: Response) => {
      const body = employerSchema.parse(req.body);
      res.status(201).json(await careerAdminUseCases.createEmployer(body));
    }));

    router.post('/employers/:id/verify', asyncHandler(async (req: Request, res: Response) => {
      const { expectedVersion } = expectedVersionSchema.parse(req.body);
      res.json(await careerAdminUseCases.setEmployerStatus(req.params.id, CareerEmployerStatus.VERIFIED, expectedVersion));
    }));

    router.post('/employers/:id/suspend', asyncHandler(async (req: Request, res: Response) => {
      const { expectedVersion } = expectedVersionSchema.parse(req.body);
      res.json(await careerAdminUseCases.setEmployerStatus(req.params.id, CareerEmployerStatus.SUSPENDED, expectedVersion));
    }));

    router.get('/jobs', asyncHandler(async (req: Request, res: Response) => {
      const filters = listQuerySchema.parse(req.query);
      res.json(await careerAdminUseCases.listJobs(filters));
    }));

    router.post('/jobs', asyncHandler(async (req: Request, res: Response) => {
      const body = jobSchema.parse(req.body);
      res.status(201).json(await careerAdminUseCases.createJob(body));
    }));

    router.get('/jobs/:id', asyncHandler(async (req: Request, res: Response) => {
      res.json(await careerAdminUseCases.getJob(req.params.id));
    }));

    router.patch('/jobs/:id', asyncHandler(async (req: Request, res: Response) => {
      const { expectedVersion, ...body } = jobSchema.partial().extend({ expectedVersion: z.number().int().positive() }).strict().parse(req.body);
      res.json(await careerAdminUseCases.updateJob(req.params.id, body, expectedVersion));
    }));

    router.post('/jobs/:id/mark-publishable', asyncHandler(async (req: Request, res: Response) => {
      const { expectedVersion } = expectedVersionSchema.parse(req.body);
      res.json(await careerAdminUseCases.markReadyToPublish(req.params.id, expectedVersion));
    }));

    router.post('/jobs/:id/publish', asyncHandler(async (req: Request, res: Response) => {
      const { expectedVersion } = expectedVersionSchema.parse(req.body);
      res.json(await careerAdminUseCases.publish(req.params.id, expectedVersion));
    }));

    router.post('/jobs/:id/archive', asyncHandler(async (req: Request, res: Response) => {
      const { expectedVersion } = expectedVersionSchema.parse(req.body);
      res.json(await careerAdminUseCases.archive(req.params.id, expectedVersion));
    }));

    router.use((err: any, req: Request, res: Response, next: NextFunction) => {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation Error', details: err.issues });
      }
      res.status(400).json({ error: err.message || 'An error occurred' });
    });

    return router;
  }
}
