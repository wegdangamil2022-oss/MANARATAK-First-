import { NextFunction, Request, Response, Router } from 'express';
import { z } from 'zod';
import { CertificateUseCases } from '@manaratak/application';
import { AuthorizationEvaluatorService, CertificateStatus, CertificateTemplateStatus } from '@manaratak/domain';

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch(next);
const actor = (req: Request) => {
  if (!req.authUserId) throw new Error('AUTHENTICATED_CERTIFICATE_ACTOR_REQUIRED');
  return req.authUserId;
};
const mutationContext = (req: Request, reason?: string | null) => ({
  actorId: actor(req),
  correlationId: req.header('x-correlation-id') ?? req.header('x-request-id') ?? undefined,
  reason: reason ?? null,
});
const optionalAsset = z.string().max(160).nullable().optional();

const templateBody = z.object({
  code: z.string().min(3).max(50).regex(/^[A-Z0-9_-]+$/),
  name: z.string().min(3).max(120),
  nameAr: z.string().min(3).max(160),
  nameEn: z.string().min(3).max(160),
  templateVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  issuerId: z.string().min(1),
  language: z.enum(['ARABIC', 'ENGLISH', 'BILINGUAL']),
  layout: z.enum(['LANDSCAPE', 'PORTRAIT']),
  accentColor: z.string(),
  secondaryColor: z.string(),
  titleAr: z.string().min(3),
  titleEn: z.string().min(3),
  bodyAr: z.string().min(10),
  bodyEn: z.string().min(10),
  signatoryNameAr: z.string().nullable().optional(),
  signatoryNameEn: z.string().nullable().optional(),
  signatoryTitleAr: z.string().nullable().optional(),
  signatoryTitleEn: z.string().nullable().optional(),
  logoAssetId: optionalAsset,
  sealAssetId: optionalAsset,
  signatureAssetId: optionalAsset,
  designAssetId: optionalAsset,
  validityPolicy: z.enum(['PERMANENT', 'EXPIRING', 'RENEWABLE']),
  validityDurationDays: z.number().int().positive().nullable().optional(),
  renewalPeriodDays: z.number().int().positive().nullable().optional(),
  renewalPolicy: z.string().max(1000).nullable().optional(),
  requiresRevalidation: z.boolean().default(false),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

const issuerBody = z.object({
  code: z.string().min(2).max(32).regex(/^[A-Z0-9_-]+$/),
  name: z.string().min(2).max(160),
  issuerType: z.enum(['MANARATAK', 'UNIVERSITY', 'EDUCATIONAL_INSTITUTION', 'GOVERNMENT', 'TRAINING_CENTER', 'EXTERNAL_PARTNER']),
  organizationId: z.string().max(160).nullable().optional(),
  universityId: z.string().max(160).nullable().optional(),
  issuerLogoAssetId: z.string().min(1).max(160),
  signingKeyReference: z.string().min(1).max(512),
  accreditationAuthority: z.string().max(300).nullable().optional(),
  accreditationReference: z.string().max(300).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

const transitionSchema = z.object({ status: z.nativeEnum(CertificateTemplateStatus), reason: z.string().max(2000).optional() });
export class CertificateAdminRouter {
  public static create(cradle: { certificateUseCases: CertificateUseCases; authEvaluatorService: AuthorizationEvaluatorService }): Router {
    const router = Router();
    const useCases = cradle.certificateUseCases;
    const evaluator = cradle.authEvaluatorService;
    const permit = (requiredPermission: string) => async (req: Request, res: Response, next: NextFunction) => {
      const principalId = req.authUserId;
      if (!principalId) return res.status(401).json({ error: { code: 'ADMIN_AUTH_REQUIRED', message: 'Admin authentication is required.' } });
      try {
        const decision = await evaluator.evaluatePermission(principalId, requiredPermission, {
          ip: req.ip || req.socket?.remoteAddress || undefined, requestTime: new Date(),
          userAgent: req.headers['user-agent'], correlationId: req.headers['x-correlation-id'],
        });
        if (!decision.isGranted) return res.status(403).json({ error: { code: 'ADMIN_PERMISSION_DENIED', message: 'Admin permission is denied.' }, meta: { requiredPermission } });
        res.setHeader('X-Admin-Required-Permission', requiredPermission);
        return next();
      } catch {
        return res.status(403).json({ error: { code: 'ADMIN_PERMISSION_DENIED', message: 'Admin permission evaluation failed.' }, meta: { requiredPermission } });
      }
    };
    const transitionPermission = (req: Request, res: Response, next: NextFunction) => {
      const parsed = transitionSchema.safeParse(req.body);
      if (!parsed.success) return next(parsed.error);
      const checkerStates = new Set([CertificateTemplateStatus.APPROVED, CertificateTemplateStatus.ACTIVE, CertificateTemplateStatus.DEPRECATED, CertificateTemplateStatus.ARCHIVED]);
      const permission = checkerStates.has(parsed.data.status) ? 'admin:certificates:templates:approve' : 'admin:certificates:templates:author';
      return permit(permission)(req, res, next);
    };

    router.get('/', permit('admin:certificates:view'), asyncHandler(async (req: Request, res: Response) =>
      res.json(await useCases.list({
        search: String(req.query.search ?? '') || undefined,
        status: req.query.status ? z.nativeEnum(CertificateStatus).parse(req.query.status) : undefined,
        templateId: String(req.query.templateId ?? '') || undefined,
        page: Number(req.query.page ?? 1),
        pageSize: Number(req.query.pageSize ?? 25),
      })),
    ));
    router.get('/analytics', permit('admin:certificates:view'), asyncHandler(async (_req: Request, res: Response) => res.json(await useCases.analytics())));
    router.get('/readiness', permit('admin:certificates:view'), asyncHandler(async (_req: Request, res: Response) => res.json(await useCases.readiness())));

    router.get('/issuers', permit('admin:certificates:view'), asyncHandler(async (_req: Request, res: Response) => res.json({ data: await useCases.listIssuers() })));
    router.post('/issuers', permit('admin:certificates:issuers:manage'), asyncHandler(async (req: Request, res: Response) =>
      res.status(201).json(await useCases.createIssuer(issuerBody.parse(req.body), mutationContext(req))),
    ));
    router.patch('/issuers/:id', permit('admin:certificates:issuers:manage'), asyncHandler(async (req: Request, res: Response) =>
      res.json(await useCases.updateIssuer(req.params.id, issuerBody.omit({ code: true }).partial().parse(req.body), mutationContext(req))),
    ));

    router.get('/templates', permit('admin:certificates:view'), asyncHandler(async (_req: Request, res: Response) => res.json({ data: await useCases.listTemplates() })));
    router.post('/templates/bootstrap-default', permit('admin:certificates:templates:author'), asyncHandler(async (req: Request, res: Response) => {
      const body = z.object({ issuerId: z.string().min(1) }).parse(req.body);
      res.status(201).json(await useCases.bootstrapDefaultCourseTemplateDraft(body.issuerId, mutationContext(req)));
    }));
    router.post('/templates', permit('admin:certificates:templates:author'), asyncHandler(async (req: Request, res: Response) =>
      res.status(201).json(await useCases.createTemplate(templateBody.parse(req.body), mutationContext(req))),
    ));
    router.patch('/templates/:id', permit('admin:certificates:templates:author'), asyncHandler(async (req: Request, res: Response) =>
      res.json(await useCases.updateTemplate(req.params.id, templateBody.partial().parse(req.body), mutationContext(req))),
    ));
    router.post('/templates/:id/transition', transitionPermission, asyncHandler(async (req: Request, res: Response) => {
      const body = transitionSchema.parse(req.body);
      res.json(await useCases.transitionTemplate(req.params.id, body.status, mutationContext(req, body.reason)));
    }));

    // No HTTP route accepts CourseCompleted/LearningPathCompleted facts. Initial
    // issuance is reachable only through CertificateUseCases.consumeCompletionEvent
    // from the trusted Phase 13 event/inbox integration boundary.

    router.get('/students/:studentReferenceId', permit('admin:certificates:view'), asyncHandler(async (req: Request, res: Response) =>
      res.json({ data: await useCases.listStudentCertificates(req.params.studentReferenceId) }),
    ));
    router.get('/:id/ledger', permit('admin:certificates:view'), asyncHandler(async (req: Request, res: Response) =>
      res.json({ data: await useCases.listLedger(req.params.id) }),
    ));
    router.get('/:id', permit('admin:certificates:view'), asyncHandler(async (req: Request, res: Response) => {
      const item = await useCases.getCertificate(req.params.id);
      if (!item) return res.status(404).json({ error: 'Certificate not found' });
      res.json(item);
    }));
    router.post('/:id/revoke', permit('admin:certificates:lifecycle:manage'), asyncHandler(async (req: Request, res: Response) => {
      const body = z.object({ reason: z.string().min(8) }).parse(req.body);
      res.json(await useCases.revoke(req.params.id, body.reason, actor(req), mutationContext(req).correlationId ?? undefined));
    }));
    router.post('/:id/reissue', permit('admin:certificates:lifecycle:manage'), asyncHandler(async (req: Request, res: Response) => {
      const body = z.object({ reason: z.string().min(8), recipientDisplayName: z.string().optional(), templateId: z.string().optional() }).parse(req.body);
      res.status(201).json(await useCases.reissue(req.params.id, body.reason, actor(req), body.recipientDisplayName, body.templateId, mutationContext(req).correlationId ?? undefined));
    }));
    router.post('/:id/renew', permit('admin:certificates:lifecycle:manage'), asyncHandler(async (req: Request, res: Response) => {
      const body = z.object({ reason: z.string().min(8) }).parse(req.body);
      res.status(201).json(await useCases.renew(req.params.id, body.reason, actor(req), mutationContext(req).correlationId ?? undefined));
    }));
    router.post('/:id/archive', permit('admin:certificates:lifecycle:manage'), asyncHandler(async (req: Request, res: Response) => {
      const body = z.object({ reason: z.string().min(3) }).parse(req.body);
      res.json(await useCases.archive(req.params.id, body.reason, actor(req), mutationContext(req).correlationId ?? undefined));
    }));

    router.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation Error', details: err.issues });
      const message = err.message || 'Certificate operation failed';
      const status = /NOT_FOUND|not found/.test(message) ? 404 : /IMMUTABLE|ARCHIVED|TRANSITION|MUST_BE|MAKER_CHECKER|COLLISION/.test(message) ? 409 : /AUTHENTICATED|PERMISSION/.test(message) ? 403 : 400;
      return res.status(status).json({ error: message });
    });
    return router;
  }
}
