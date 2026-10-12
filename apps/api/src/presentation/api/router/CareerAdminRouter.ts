import { randomUUID } from 'node:crypto';
import { Router, Request } from 'express';
import { z } from 'zod';
import { CareerAdminUseCases, CareerEngagementUseCases, ProcessAssetLifecycleUseCase } from '@manaratak/application';
import { AuthorizationEvaluatorService, CareerApplicationStatus, CareerEmployerStatus, CareerJobStatus, CareerOpportunityType, EmploymentType, ICareerEngagementRepository } from '@manaratak/domain';
import { careerUrl, careerMetadata, careerPaging, careerExpected, careerReason, careerHandler, careerError } from './CareerHttp.js';
export class CareerAdminRouter {
  static create(cradle: { careerAdminUseCases: CareerAdminUseCases; careerEngagementUseCases: CareerEngagementUseCases;
    careerEngagementRepository: ICareerEngagementRepository; authEvaluatorService: AuthorizationEvaluatorService; processAssetLifecycleUseCase: ProcessAssetLifecycleUseCase }) {
    const router = Router(), read = cradle.careerAdminUseCases;
    const requirePermission = async (req: Request, permission: string, resourceId?: string, employerId?: string) => {
      if (!req.authUserId) throw new Error('CAREER_AUTHENTICATION_REQUIRED');
      const result = await cradle.authEvaluatorService.evaluatePermission(req.authUserId, permission, { resourceId: resourceId ?? req.params.id, employerId });
      if (!result.isGranted) throw new Error('CAREER_ACCESS_DENIED');
    };
    const context = (req: Request) => ({ actorId: req.authUserId!, reason: careerReason.parse(req.body.reason), correlationId: randomUUID() });
    const owner = (req: Request) => read.forActor(context(req));
    const employerSchema = z.object({ displayName: z.string().trim().min(1).max(240), employerType: z.string().trim().min(1).max(100), industry: z.string().max(120).nullable().optional(), countryReferenceId: z.string().nullable().optional(), cityReferenceId: z.string().nullable().optional(), websiteUrl: careerUrl.nullable().optional(), logoAssetId: z.string().max(160).nullable().optional(), description: z.string().max(10000).nullable().optional() }).strict();
    const salary = z.object({ minMinorUnits: z.string().regex(/^\d{1,20}$/), maxMinorUnits: z.string().regex(/^\d{1,20}$/), currencyCode: z.string().regex(/^[A-Z]{3}$/), scale: z.number().int().min(0).max(6), period: z.enum(['HOUR','MONTH','YEAR']), basis: z.enum(['GROSS','NET']) }).strict();
    const jobSchema = z.object({ title: z.string().trim().min(1).max(240), opportunityType: z.nativeEnum(CareerOpportunityType), employmentType: z.nativeEnum(EmploymentType), jobCategory: z.string().trim().min(1).max(120), description: z.string().trim().min(1).max(20000), countryReferenceId: z.string().min(1), cityReferenceId: z.string().nullable().optional(), employerId: z.string().min(1), recruiterContactId: z.string().max(160).nullable().optional(), applicationDeadline: z.string().datetime().nullable().optional(), externalPostingUrl: careerUrl.nullable().optional(), salaryRange: salary.nullable().optional(), requiredSkills: z.array(z.string().max(120)).max(40).nullable().optional(), educationRequirement: z.string().max(500).nullable().optional(), languageRequirements: z.array(z.string().max(120)).max(20).nullable().optional(), remoteOption: z.boolean().optional(), metadata: careerMetadata.optional() }).strict();
    router.get('/employers', careerHandler(async(req,res) => {
      res.json(await read.listEmployers(z.object({ ...careerPaging, search: z.string().trim().max(120).optional(), verificationStatus: z.nativeEnum(CareerEmployerStatus).optional(), countryReferenceId: z.string().optional() }).parse(req.query)));
    }));
    router.post('/employers', careerHandler(async(req,res) => {
      await requirePermission(req,'admin:careers:author'); const { reason, ...body } = employerSchema.extend({ reason: careerReason }).parse(req.body);
      res.status(201).json(await owner(req).createEmployer(body));
    }));
    router.patch('/employers/:id', careerHandler(async(req,res) => {
      await requirePermission(req,'admin:careers:author'); const { reason, expectedVersion, ...body } = employerSchema.partial().extend({ reason: careerReason, expectedVersion: careerExpected }).parse(req.body);
      res.json(await owner(req).updateEmployer(req.params.id, body, expectedVersion));
    }));
    router.post('/employers/:id/verify', careerHandler(async(req,res) => {
      await requirePermission(req,'admin:careers:employers:verify');
      const body = z.object({ reason: careerReason, expectedVersion: careerExpected, sourceUrl: careerUrl, expiresAt: z.string().datetime(), assetId: z.string().min(1).optional() }).strict().parse(req.body);
      res.json(await owner(req).setEmployerStatus(req.params.id, CareerEmployerStatus.VERIFIED, body.expectedVersion, body));
    }));
    router.post('/employers/:id/suspend', careerHandler(async(req,res) => {
      await requirePermission(req,'admin:careers:employers:verify'); const body = z.object({ reason: careerReason, expectedVersion: careerExpected }).strict().parse(req.body);
      res.json(await owner(req).setEmployerStatus(req.params.id, CareerEmployerStatus.SUSPENDED, body.expectedVersion));
    }));
    // Job review projection excludes recruiter/contact, salary, metadata and applications.
    router.get('/review-page', careerHandler(async(req,res) => {
      const query = z.object({
        page: z.coerce.number().int().min(1).max(10000).default(1),
        pageSize: z.coerce.number().int().min(1).max(50).default(50),
        status: z.nativeEnum(CareerJobStatus).refine(value => value === CareerJobStatus.READY_TO_REVIEW || value === CareerJobStatus.READY_TO_PUBLISH),
      }).strict().parse(req.query);
      const result = await read.listJobs(query);
      res.setHeader('Cache-Control', 'no-store');
      res.json({ ...result, data: result.data.map(row => ({
        id: row.id, title: row.title, status: row.status, updatedAt: row.updatedAt,
      })) });
    }));
    router.get('/jobs', careerHandler(async(req,res) => {
      res.json(await read.listJobs(z.object({ ...careerPaging, search: z.string().trim().max(120).optional(), status: z.nativeEnum(CareerJobStatus).optional(), opportunityType: z.nativeEnum(CareerOpportunityType).optional(), employmentType: z.nativeEnum(EmploymentType).optional(), countryReferenceId: z.string().optional(), cityReferenceId: z.string().optional(), employerId: z.string().optional() }).parse(req.query)));
    }));
    router.get('/jobs/:id', careerHandler(async(req,res) => { res.json(await read.getJob(req.params.id)); }));
    router.post('/jobs', careerHandler(async(req,res) => {
      await requirePermission(req,'admin:careers:author'); const { reason, ...body } = jobSchema.extend({ reason: careerReason }).parse(req.body);
      res.status(201).json(await owner(req).createJob(body));
    }));
    router.patch('/jobs/:id', careerHandler(async(req,res) => {
      await requirePermission(req,'admin:careers:author'); const { reason, expectedVersion, ...body } = jobSchema.omit({ employerId: true }).partial().extend({ reason: careerReason, expectedVersion: careerExpected }).parse(req.body);
      res.json(await owner(req).updateJob(req.params.id, body, expectedVersion));
    }));
    router.post('/jobs/:id/mark-publishable', careerHandler(async(req,res) => {
      await requirePermission(req,'admin:careers:review');
      const body = z.object({ reason: careerReason, expectedVersion: careerExpected, checklist: z.object({ source: z.literal(true), applicationLink: z.literal(true), privacy: z.literal(true), terms: z.literal(true) }).strict() }).strict().parse(req.body);
      res.json(await owner(req).markReadyToPublish(req.params.id, body.expectedVersion, body));
    }));
    for (const action of ['publish','archive','unpublish','reject'] as const) router.post(`/jobs/:id/${action}`, careerHandler(async(req,res) => {
      await requirePermission(req, action === 'reject' ? 'admin:careers:review' : 'admin:careers:publish');
      const body = z.object({ reason: careerReason, expectedVersion: careerExpected }).strict().parse(req.body);
      res.json(await owner(req)[action](req.params.id, body.expectedVersion));
    }));
    const applicationScope = async(req: Request) => {
      const row = await cradle.careerEngagementUseCases.applicationForReview(req.params.id);
      const job = await read.getJob(row.jobId);
      await requirePermission(req,'admin:careers:applications:review', row.jobId, job.employerId);
      return row;
    };
    router.get('/applications', careerHandler(async(req,res) => {
      const filters = z.object({ ...careerPaging, jobId: z.string().optional(), status: z.nativeEnum(CareerApplicationStatus).optional() }).parse(req.query);
      if (filters.jobId) { const job = await read.getJob(filters.jobId); await requirePermission(req,'admin:careers:applications:review', job.id, job.employerId); }
      else { await requirePermission(req,'admin:careers:applications:review'); await requirePermission(req,'admin:careers:applications:all'); }
      const result = await cradle.careerEngagementUseCases.listApplications(filters);
      res.json({ ...result, data: result.data.map(({ cvAssetId, coverLetter, decisionMetadata, studentReferenceId, ...row }) => row) });
    }));
    router.get('/applications/:id', careerHandler(async(req,res) => {
      const row = await applicationScope(req); await requirePermission(req,'admin:careers:applications:pii',row.jobId);
      const { cvAssetId, ...detail } = row; res.json(detail);
    }));
    router.post('/applications/:id/review', careerHandler(async(req,res) => {
      await applicationScope(req);
      const body = z.object({ expectedVersion: careerExpected, reason: careerReason, nextStatus: z.nativeEnum(CareerApplicationStatus), studentMessage: z.string().max(2000).optional(), interviewAt: z.string().datetime().optional() }).strict().parse(req.body);
      const row = await cradle.careerEngagementUseCases.forActor(context(req)).reviewApplication({ applicationId: req.params.id, nextStatus: body.nextStatus, expectedVersion: body.expectedVersion, actorId: req.authUserId!, decisionMetadata: { reason: body.reason, studentMessage: body.studentMessage ?? null, interviewAt: body.interviewAt ?? null } });
      const { cvAssetId, coverLetter, studentReferenceId, ...result } = row; res.json(result);
    }));
    router.post('/applications/:id/cv-grant', careerHandler(async(req,res) => {
      const row = await applicationScope(req); await requirePermission(req,'admin:careers:applications:pii',row.jobId);
      const assetId = await cradle.careerEngagementUseCases.assertCvForReview(row.id);
      res.json(await cradle.processAssetLifecycleUseCase.requestDeliveryGrant({ assetId, expiresInSeconds: 120 }));
    }));
    router.get('/alumni', careerHandler(async(req,res) => {
      await requirePermission(req,'admin:careers:alumni:view'); const { page, pageSize } = z.object(careerPaging).parse(req.query);
      res.json(await cradle.careerEngagementRepository.listAdminAlumni?.(page, pageSize));
    }));
    router.use(careerError); return router;
  }
}
