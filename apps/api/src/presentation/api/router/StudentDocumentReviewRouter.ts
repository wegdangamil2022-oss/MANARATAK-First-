import { Router } from 'express';
import { z } from 'zod';
import type { AuthorizationEvaluatorService } from '@absheer/domain';
import type { StudentDocumentReviewUseCases } from '@absheer/application';
export class StudentDocumentReviewRouter {
  static create(cradle: {
    studentDocumentReviewUseCases: StudentDocumentReviewUseCases;
    authEvaluatorService: AuthorizationEvaluatorService;
  }) {
    const router = Router(),
      useCases = cradle.studentDocumentReviewUseCases;
    router.use(async (req, res, next) => {
      res.setHeader('Cache-Control', 'no-store');
      if (!req.authUserId) return void res.status(401).json({ error: 'AUTHENTICATION_REQUIRED' });
      try {
        const result = await cradle.authEvaluatorService.evaluatePermission(
          req.authUserId,
          'admin:students:documents:review',
          { ip: req.ip, requestTime: new Date() },
        );
        if (!result.isGranted)
          return void res.status(403).json({ error: 'DOCUMENT_REVIEW_PERMISSION_DENIED' });
        next();
      } catch {
        res.status(403).json({ error: 'DOCUMENT_REVIEW_PERMISSION_DENIED' });
      }
    });
    router.get('/', (req, res, next) => {
      void (async () => {
        const { after } = z
          .object({ after: z.string().uuid().optional() })
          .strict()
          .parse(req.query);
        res.json({ data: await useCases.list(after) });
      })().catch(next);
    });
    router.post('/:id/open', (req, res, next) => {
      void (async () => {
        z.object({})
          .strict()
          .parse(req.body ?? {});
        res.json({
          data: await useCases.open(z.string().uuid().parse(req.params.id), req.authUserId!),
        });
      })().catch(next);
    });
    router.post('/:id/attest', (req, res, next) => {
      void (async () => {
        const body = z
          .object({
            expectedVersion: z.number().int().positive(),
            verdict: z.enum(['VERIFIED', 'REJECTED']),
            evidenceReference: z.string().trim().min(3).max(240),
            reason: z.string().trim().min(6).max(1000),
            validUntil: z.string().datetime(),
          })
          .strict()
          .parse(req.body);
        res.json({
          data: await useCases.attest(
            z.string().uuid().parse(req.params.id),
            req.authUserId!,
            body,
          ),
        });
      })().catch(next);
    });
    router.use((error: unknown, _req: any, res: any, _next: any) => {
      const code = error instanceof Error ? error.message : '';
      res
        .status(
          error instanceof z.ZodError
            ? 400
            : code.includes('VERSION_CONFLICT') || code.includes('STALE')
              ? 409
              : code.includes('INVALID')
                ? 400
                : 404,
        )
        .json({ error: 'STUDENT_DOCUMENT_REVIEW_UNAVAILABLE' });
    });
    return router;
  }
}
