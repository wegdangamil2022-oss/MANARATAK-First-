import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import type { AuthorizationEvaluatorService } from '@manaratak/domain';
import type { AcademicProgramExplorerUseCases } from '@manaratak/application';
const id = z.string().trim().min(1).max(160);
export class AcademicProgramExplorerRouter {
  static create(
    cradle: {
      academicProgramExplorerUseCases: AcademicProgramExplorerUseCases;
      authEvaluatorService: AuthorizationEvaluatorService;
    },
    admin = false,
  ) {
    const router = Router();
    router.use(async (req, res, next) => {
      res.setHeader('Cache-Control', 'no-store');
      if (!admin) return next();
      if (!req.authUserId) return void res.status(401).json({ error: 'EXPLORER_AUTH_REQUIRED' });
      try {
        for (const permission of [
          'admin:universities:manage',
          'admin:majors:manage',
          'admin:international-tests:manage',
        ]) {
          const result = await cradle.authEvaluatorService.evaluatePermission(
            req.authUserId,
            permission,
            { ip: req.ip, requestTime: new Date() },
          );
          if (!result.isGranted)
            return void res.status(403).json({ error: 'EXPLORER_OWNER_PERMISSION_DENIED' });
        }
        next();
      } catch {
        res.status(403).json({ error: 'EXPLORER_OWNER_PERMISSION_DENIED' });
      }
    });
    const query = z
      .object({
        countryReferenceId: id.optional(),
        universityId: id.optional(),
        search: z.string().trim().max(200).optional(),
        degreeLevelId: id.optional(),
        majorId: id.optional(),
        internationalTestId: id.optional(),
        languageReferenceId: id.optional(),
        academicProgramId: id.optional(),
        locale: z.enum(['ar', 'en']).default('ar'),
        visibility: admin
          ? z.enum(['PUBLIC', 'ADMIN_ALL']).default('PUBLIC')
          : z.literal('PUBLIC').default('PUBLIC'),
        cursor: id.optional(),
        limit: z.coerce.number().int().min(1).max(50).default(25),
        facet: z.enum(['DEGREE', 'MAJOR', 'TEST', 'LANGUAGE']).optional(),
        facetCursor: id.optional(),
        facetSearch: z.string().trim().max(200).optional(),
        scholarshipProgramId: id.optional(),
        scholarshipCursor: id.optional(),
      })
      .strict();
    router.get('/', (req: Request, res: Response, next: NextFunction) => {
      void (async () => {
        const {
            visibility,
            facet,
            facetCursor,
            facetSearch,
            scholarshipProgramId,
            scholarshipCursor,
            ...input
          } = query.parse(req.query),
          publicOnly = visibility === 'PUBLIC';
        if (facet && scholarshipProgramId)
          return void res.status(400).json({ error: 'EXPLORER_QUERY_INVALID' });
        const result = facet
          ? await cradle.academicProgramExplorerUseCases.facet(
              input,
              facet,
              facetCursor,
              facetSearch,
              publicOnly,
            )
          : scholarshipProgramId
            ? await cradle.academicProgramExplorerUseCases.scholarshipPage(
                input,
                scholarshipProgramId,
                scholarshipCursor,
                publicOnly,
              )
            : await cradle.academicProgramExplorerUseCases.query(input, publicOnly);
        res.json({ data: result });
      })().catch(next);
    });
    router.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (error instanceof z.ZodError)
        return void res.status(400).json({ error: 'EXPLORER_QUERY_INVALID' });
      if (error instanceof Error && error.message === 'EXPLORER_PROGRAM_NOT_IN_SCOPE')
        return void res.status(404).json({ error: error.message });
      res.status(503).json({ error: 'EXPLORER_OWNER_UNAVAILABLE' });
    });
    return router;
  }
}
