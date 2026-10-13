import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import type { UniversityProgramWorkspaceUseCases } from '@manaratak/application';
import { requireAuthenticatedPrincipal } from '../../security/AuthenticatedPrincipal';
const id = z.string().trim().min(1).max(240);
const query = z
  .object({
    universityId: id.optional(),
    universityPublicId: id.optional(),
    majorId: id.optional(),
    degreeLevelId: id.optional(),
    countryReferenceId: id.optional(),
    regionReferenceId: id.optional(),
    cityReferenceId: id.optional(),
    internationalTestId: id.optional(),
    languageReferenceId: id.optional(),
    programStatus: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
    parentStatus: z
      .enum([
        'IMPORTED',
        'NEEDS_MAPPING',
        'NEEDS_VERIFICATION',
        'NEEDS_REVIEW',
        'READY_TO_REVIEW',
        'READY_TO_PUBLISH',
        'PUBLISHED',
        'ARCHIVED',
        'REJECTED',
      ])
      .optional(),
    studyMode: z.enum(['UNKNOWN', 'FULL_TIME', 'PART_TIME']).optional(),
    teachingDelivery: z.enum(['UNKNOWN', 'ON_CAMPUS', 'ONLINE', 'HYBRID']).optional(),
    hasScholarships: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
    search: z.string().trim().max(200).optional(),
    cursor: id.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
  })
  .strict();
const study = z
  .object({
    languageReferenceIds: z.array(id).max(20),
    studyMode: z.enum(['UNKNOWN', 'FULL_TIME', 'PART_TIME']),
    teachingDelivery: z.enum(['UNKNOWN', 'ON_CAMPUS', 'ONLINE', 'HYBRID']),
    durationValue: z.number().positive().max(1000).optional(),
    durationUnit: z.enum(['MONTHS', 'YEARS']).optional(),
    entryEligibility: z.string().max(4000).optional(),
    verificationStatus: z.enum(['UNKNOWN', 'VERIFIED']),
    officialSourceUrl: z.string().url().max(2048).optional(),
  })
  .strict();
const intake = z
  .object({
    id: z.string().uuid(),
    intakeStart: z.string().datetime({ offset: true }),
    applicationOpen: z.string().datetime({ offset: true }),
    applicationClose: z.string().datetime({ offset: true }),
    applicantSegment: z.string().trim().min(1).max(100),
    timezone: z.string().min(1).max(100),
    officialSourceUrl: z.string().url().max(2048),
    verificationStatus: z.enum(['UNKNOWN', 'VERIFIED']),
    status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']),
  })
  .strict();
export class UniversityProgramWorkspaceRouter {
  static create(
    {
      universityProgramWorkspaceUseCases,
    }: { universityProgramWorkspaceUseCases: UniversityProgramWorkspaceUseCases },
    publicOnly = false,
  ) {
    const router = Router();
    const wrap =
      (fn: (req: Request, res: Response) => Promise<unknown>) =>
      (req: Request, res: Response, next: NextFunction) => {
        void Promise.resolve(fn(req, res)).catch(next);
      };
    router.use((_req, res, next) => {
      res.setHeader('Cache-Control', 'no-store');
      next();
    });
    router.get(
      '/',
      wrap(async (req, res) =>
        res.json(
          await universityProgramWorkspaceUseCases.query(query.parse(req.query), publicOnly),
        ),
      ),
    );
    if (!publicOnly) {
      const write = (kind: 'study' | 'intake') =>
        wrap(async (req, res) => {
          const raw = req.get('If-Match');
          if (!raw || !/^(?:"\d+"|\d+)$/.test(raw))
            throw new Error('UNIVERSITY_EXPECTED_REVISION_REQUIRED');
          const expectedRevision = Number(raw.replace(/"/g, ''));
          if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1)
            throw new Error('UNIVERSITY_EXPECTED_REVISION_REQUIRED');
          const principal = requireAuthenticatedPrincipal(req);
          const reason = z.string().trim().min(3).max(2000).parse(req.get('X-Review-Reason'));
          const input =
            kind === 'study'
              ? { study: study.parse(req.body) }
              : { intake: intake.parse(req.body) };
          return res.json(
            await universityProgramWorkspaceUseCases.save(id.parse(req.params.programId), input, {
              actorId: principal.principalId,
              actorType: principal.actorType,
              expectedRevision,
              reason,
              source: 'admin-university-programs',
              correlationId: req.get('X-Correlation-Id'),
            }),
          );
        });
      router.put('/:programId/study', write('study'));
      router.put('/:programId/intake', write('intake'));
    }
    router.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
      const message = error instanceof Error ? error.message : '';
      const conflict = /STALE_REVISION|CONFLICT|IMMUTABLE/.test(message);
      const missing = /_NOT_FOUND$/.test(message);
      const invalid =
        error instanceof z.ZodError ||
        /INVALID|EVIDENCE_REQUIRED|EVIDENCE_URL|TIMEZONE|LANGUAGE_INVALID/.test(message);
      res
        .status(
          conflict
            ? 409
            : missing
              ? 404
              : /EXPECTED_REVISION/.test(message)
                ? 428
                : invalid
                  ? 400
                  : 503,
        )
        .json({
          error: {
            code: message.startsWith('UNIVERSITY_')
              ? message.split(':')[0]
              : 'UNIVERSITY_PROGRAM_UNAVAILABLE',
            message: 'University program request could not be completed.',
          },
        });
    });
    return router;
  }
}
