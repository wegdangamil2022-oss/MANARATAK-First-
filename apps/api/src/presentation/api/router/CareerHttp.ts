import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { safeCareerUrl } from '@manaratak/application';
export const careerUrl = z.string().trim().max(2048).refine(value => { try { safeCareerUrl(value); return true; } catch { return false; } }, 'A public HTTPS destination is required');
export const careerPaging = { page: z.coerce.number().int().min(1).max(10000).default(1), pageSize: z.coerce.number().int().min(1).max(50).default(20) };
export const careerMetadata = z.object({
  applicationChannel: z.enum(['INTERNAL','EXTERNAL']).default('EXTERNAL'), sourceUrl: careerUrl.optional(),
  recruitmentCycle: z.string().trim().max(80).optional(),
  localizedContent: z.object({ ar: z.object({ title: z.string().trim().min(1).max(240), description: z.string().trim().min(1).max(20000) }).strict().optional(), en: z.object({ title: z.string().trim().min(1).max(240), description: z.string().trim().min(1).max(20000) }).strict().optional() }).strict().optional(),
  experienceLevel: z.string().trim().max(100).optional(), summary: z.string().trim().max(1000).optional(),
  responsibilities: z.array(z.string().max(1000)).max(30).optional(), benefits: z.array(z.string().max(1000)).max(30).optional(),
  applicationSteps: z.array(z.string().max(1000)).max(20).optional(), durationLabel: z.string().max(100).optional(),
}).strict();
export const careerExpected = z.number().int().positive();
export const careerReason = z.string().trim().min(3).max(1000);
export const careerHandler = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => { Promise.resolve(fn(req,res)).catch(next); };
const codes = new Set([
  'CAREER_QUERY_INVALID','CAREER_URL_INVALID','CAREER_READINESS_BLOCKED','CAREER_EMPLOYER_NOT_VERIFIED','CAREER_DEADLINE_INVALID','CAREER_SOURCE_REQUIRED','CAREER_APPLICATION_CHANNEL_REQUIRED',
  'CAREER_AUDIT_REQUIRED','CAREER_EMPLOYER_NAME_REQUIRED','CAREER_CITY_REQUIRES_COUNTRY','CAREER_EMPLOYER_DUPLICATE','CAREER_EMPLOYER_NOT_FOUND','CAREER_PROTECTED_FIELD','CAREER_TRANSITION_INVALID',
  'CAREER_VERIFICATION_EVIDENCE_REQUIRED','CAREER_SOURCE_DOMAIN_MISMATCH','CAREER_JOB_DUPLICATE','CAREER_JOB_NOT_FOUND','CAREER_REVIEW_REQUIRED','CAREER_INDEPENDENT_REVIEW_REQUIRED',
  'CAREER_SALARY_INVALID','CAREER_CURRENCY_NOT_CONFIGURED','CAREER_CURRENCY_NOT_ACTIVE','CAREER_EXPECTED_VERSION_REQUIRED','CAREER_JOB_VERSION_CONFLICT','CAREER_EMPLOYER_VERSION_CONFLICT',
  'CAREER_PROFILE_PRIVATE_ONLY','CAREER_PROFILE_VERSION_CONFLICT','CAREER_APPLICATION_JOB_NOT_OPEN','CAREER_APPLICATION_EXTERNAL_ONLY','CAREER_APPLICATION_PAYLOAD_CONFLICT','CAREER_APPLICATION_CV_REQUIRED',
  'CAREER_APPLICATION_OWNER_MISMATCH','CAREER_APPLICATION_TRANSITION_NOT_ALLOWED','CAREER_APPLICATION_NOT_FOUND','CAREER_APPLICATION_REVIEW_ACTOR_REQUIRED','CAREER_APPLICATION_ADMIN_TRANSITION_INVALID','CAREER_APPLICATION_VERSION_CONFLICT',
  'CAREER_ALUMNI_VERSION_CONFLICT','CAREER_ALUMNI_DISPLAY_NAME_REQUIRED','CAREER_ALUMNI_GRADUATION_YEAR_INVALID','CAREER_ALUMNI_CONSENT_ACTOR_MISMATCH','CAREER_ALUMNI_CONSENT_SOURCE_REQUIRED','CAREER_ALUMNI_PUBLIC_VISIBILITY_REQUIRES_CONSENT',
  'CAREER_ACCESS_DENIED','CAREER_AUTHENTICATION_REQUIRED','CAREER_STUDENT_NOT_FOUND',
]);
export function careerError(err: any, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof z.ZodError) return res.status(400).json({ error: 'CAREER_VALIDATION_ERROR' });
  const message = String(err?.message ?? ''), correlationId = randomUUID();
  const code = codes.has(message) ? message : /_ASSET_|_RAW_ASSET_REFERENCE/.test(message) && message.startsWith('CAREER_') ? 'CAREER_ASSET_UNUSABLE' :
    /^(CAREER_(COUNTRY|CITY|GEOGRAPHY)_|CAREER_STUDENT_NOT_ACTIVE)/.test(message) ? 'CAREER_REFERENCE_UNAVAILABLE' :
    ['P2002','P2025','P2034'].includes(err?.code) ? 'CAREER_VERSION_CONFLICT' : 'CAREER_REQUEST_FAILED';
  const status = code === 'CAREER_REQUEST_FAILED' ? 500 : code.includes('AUTHENTICATION') ? 401 : code.includes('ACCESS_DENIED') ? 403 : code.includes('NOT_FOUND') || code.includes('OWNER_MISMATCH') ? 404 : /CONFLICT|DUPLICATE/.test(code) ? 409 : 422;
  if (status === 500) console.error('Career request failed', { correlationId });
  return res.status(status).json({ error: code, correlationId });
}
