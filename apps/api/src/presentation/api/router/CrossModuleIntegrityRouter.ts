import { Router } from 'express';
import { z } from 'zod';
import type { AuthorizationEvaluatorService } from '@absheer/domain';
import type { CrossModuleIntegrityUseCase, IntegrityOwner } from '@absheer/application';
export const INTEGRITY_OWNER_PERMISSIONS = {
  MAJORS: 'admin:majors:manage',
  UNIVERSITIES: 'admin:universities:manage',
  SCHOLARSHIPS: 'admin:scholarships:manage',
  TESTS: 'admin:international-tests:manage',
  CMS:'admin:cms:view',
  PROGRAMS:'admin:universities:manage',
  COURSES:'admin:courses:manage',
  COUNTRIES:'admin:reference-data:manage',
} as const;
export class CrossModuleIntegrityRouter {
  static create(cradle: {
    authEvaluatorService: AuthorizationEvaluatorService;
    crossModuleIntegrityUseCase: CrossModuleIntegrityUseCase;
  }) {
    const router = Router();
    router.get('/', async (req, res, next) => {
      res.setHeader('Cache-Control', 'no-store');
      if (!req.authUserId) return void res.status(401).json({ error: 'AUTHENTICATION_REQUIRED' });
      const parsed = z
        .object({
          owner: z.enum(['MAJORS', 'UNIVERSITIES', 'SCHOLARSHIPS', 'TESTS','CMS']),
          page: z.coerce.number().int().min(1).max(10000).default(1),
        })
        .strict()
        .safeParse(req.query);
      if (!parsed.success) return void res.status(400).json({ error: 'INTEGRITY_QUERY_INVALID' });
      try {
        const allowed = new Set<IntegrityOwner>();
        for (const [owner, permission] of Object.entries(INTEGRITY_OWNER_PERMISSIONS)) {
          const result = await cradle.authEvaluatorService.evaluatePermission(
            req.authUserId,
            permission,
            { ip: req.ip, requestTime: new Date() },
          );
          if (result.isGranted) allowed.add(owner as IntegrityOwner);
        }
        if (!allowed.has(parsed.data.owner))
          return void res.status(403).json({ error: 'INTEGRITY_OWNER_PERMISSION_DENIED' });
        res.json({
          data: await cradle.crossModuleIntegrityUseCase.execute(
            parsed.data.owner,
            allowed,
            parsed.data.page,
          ),
        });
      } catch (error) {
        next(error);
      }
    });
    return router;
  }
}
