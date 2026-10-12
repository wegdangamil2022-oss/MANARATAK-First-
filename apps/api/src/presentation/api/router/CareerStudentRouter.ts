import { randomUUID } from 'node:crypto';
import { Router, Request } from 'express';
import { z } from 'zod';
import { CareerEngagementUseCases } from '@manaratak/application';
import { AlumniProfileVisibility, CareerProfileVisibility } from '@manaratak/domain';
import { careerPaging, careerExpected, careerHandler, careerError } from './CareerHttp.js';
/** Mounted only inside the authenticated, student-role, idempotent workspace router. */
export function careerStudentRouter(useCases: CareerEngagementUseCases) {
  const router = Router();
  const own = (req: Request) => { if (!req.authUserId) throw new Error('CAREER_AUTHENTICATION_REQUIRED'); return req.authUserId; };
  const owner = (req: Request) => useCases.forActor({ actorId: own(req), reason: 'Student career command', correlationId: randomUUID() });
  const projection = (row: any) => { const { cvAssetId, coverLetter, decisionMetadata, ...safe } = row; return { ...safe, decisionMetadata: { studentMessage: decisionMetadata?.studentMessage ?? null } }; };
  router.get('/profile', careerHandler(async(req,res) => { res.json(await useCases.getMyProfile(own(req))); }));
  router.put('/profile', careerHandler(async(req,res) => {
    const body = z.object({ headline: z.string().max(240).nullable().optional(), summary: z.string().max(4000).nullable().optional(), skills: z.array(z.string().max(120)).max(40).optional(), resumeAssetId: z.string().min(1).max(160).nullable().optional(), visibility: z.literal(CareerProfileVisibility.PRIVATE).optional(), expectedVersion: careerExpected.optional() }).strict().parse(req.body);
    res.json(await owner(req).upsertCareerProfile({ ...body, studentReferenceId: own(req) }));
  }));
  router.get('/applications', careerHandler(async(req,res) => { const { page } = z.object(careerPaging).parse(req.query); res.json(await useCases.getMyApplications(own(req), page)); }));
  router.post('/applications', careerHandler(async(req,res) => {
    const body = z.object({ jobId: z.string().min(1), cvAssetId: z.string().min(1).max(160), coverLetter: z.string().max(4000).optional(), consent: z.literal(true) }).strict().parse(req.body);
    res.status(201).json(projection(await owner(req).submitApplication({ ...body, studentReferenceId: own(req) })));
  }));
  router.post('/applications/:id/withdraw', careerHandler(async(req,res) => {
    const body = z.object({ expectedVersion: careerExpected }).strict().parse(req.body);
    res.json(projection(await owner(req).withdrawApplication({ ...body, applicationId: req.params.id, studentReferenceId: own(req) })));
  }));
  router.get('/alumni-network', careerHandler(async(req,res) => { const { page } = z.object(careerPaging).parse(req.query); res.setHeader('Cache-Control','no-store'); res.json(await useCases.alumniNetwork(own(req),page)); }));
  router.get('/alumni', careerHandler(async(req,res) => { res.json(await useCases.getMyAlumni(own(req))); }));
  router.put('/alumni', careerHandler(async(req,res) => {
    const body = z.object({ displayName: z.string().trim().min(1).max(240), graduationYear: z.number().int().min(1900).max(new Date().getUTCFullYear()+1).nullable().optional(), employerName: z.string().max(240).nullable().optional(), visibility: z.nativeEnum(AlumniProfileVisibility).default(AlumniProfileVisibility.PRIVATE), consentGranted: z.boolean().optional(), expectedVersion: careerExpected.optional() }).strict().parse(req.body);
    res.json(await owner(req).upsertAlumniProfile({ ...body, studentReferenceId: own(req), consentActorStudentReferenceId: own(req), consentSource: 'STUDENT_CAREER_WORKSPACE_V1' }));
  }));
  router.use(careerError); return router;
}
