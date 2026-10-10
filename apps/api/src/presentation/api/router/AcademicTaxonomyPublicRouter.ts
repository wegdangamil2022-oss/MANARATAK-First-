import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { LocalizedPublicAcademicTaxonomyUseCases } from '@manaratak/application';
import {
  AcademicTaxonomyNodeType,
  AcademicStandardType,
  IAcademicTaxonomyRepository,
} from '@manaratak/domain';
import { localeQuerySchema, parseRequestLocale, toApiValidationErrorPayload } from '../locale/LocaleQueryContract.js';

export class AcademicTaxonomyPublicRouter {
  public static create(cradle: { academicTaxonomyRepository: IAcademicTaxonomyRepository }): Router {
    const router = Router();
    // No public catalog cache: activation/archive is visible on the next owner read.
    router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store, max-age=0'); next(); });
    const localized = new LocalizedPublicAcademicTaxonomyUseCases(cradle.academicTaxonomyRepository);
    const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res, next)).catch(next);
    const nodeTypeSchema = z.nativeEnum(AcademicTaxonomyNodeType);
    const standardTypeSchema = z.nativeEnum(AcademicStandardType);
    const listNodesQuerySchema = z.object({
      nodeType: nodeTypeSchema.optional(), standardType: standardTypeSchema.optional(), q: z.string().trim().max(200).optional(),
      page: z.coerce.number().int().min(1).max(1000).optional(), pageSize: z.coerce.number().int().min(1).max(100).optional(),
    }).merge(localeQuerySchema);
    const getByKeyQuerySchema = z.object({
      nodeType: nodeTypeSchema, canonicalCode: z.string().min(1), standardType: standardTypeSchema.optional(),
    }).merge(localeQuerySchema);
    const searchQuerySchema = z.object({
      page: z.coerce.number().int().min(1).max(1000).optional(), pageSize: z.coerce.number().int().min(1).max(100).optional(),
      q: z.string().trim().min(1).max(200), nodeType: nodeTypeSchema.optional(), standardType: standardTypeSchema.optional(),
    }).merge(localeQuerySchema);

    const relatedQuery = z.object({ page: z.coerce.number().int().min(1).max(1000).optional(), pageSize: z.coerce.number().int().min(1).max(100).optional() }).merge(localeQuerySchema);
    router.get('/nodes', asyncHandler(async (req: Request, res: Response) => {
      const { locale, ...filters } = listNodesQuerySchema.parse(req.query);
      res.json({ data: await localized.listNodes(filters, locale) });
    }));
    router.get('/nodes/by-key', asyncHandler(async (req: Request, res: Response) => {
      const { locale, ...input } = getByKeyQuerySchema.parse(req.query);
      const node = await localized.getNodeByCanonicalKey(input, locale);
      if (!node) return res.status(404).json({ error: 'Academic taxonomy node not found' });
      res.json(node);
    }));
    router.get('/nodes/:nodeId', asyncHandler(async (req: Request, res: Response) => {
      const node = await localized.getNode(req.params.nodeId, parseRequestLocale(req.query));
      if (!node) return res.status(404).json({ error: 'Academic taxonomy node not found' });
      res.json(node);
    }));
    router.get('/nodes/:nodeId/children', asyncHandler(async (req: Request, res: Response) => {
      const { locale, ...filters } = relatedQuery.parse(req.query);
      res.json({ data: await localized.listChildren(req.params.nodeId, locale, filters) });
    }));
    router.get('/nodes/:nodeId/parents', asyncHandler(async (req: Request, res: Response) => {
      const { locale, ...filters } = relatedQuery.parse(req.query);
      res.json({ data: await localized.listParents(req.params.nodeId, locale, filters) });
    }));
    router.get('/search', asyncHandler(async (req: Request, res: Response) => {
      const { q, locale, ...filters } = searchQuerySchema.parse(req.query);
      res.json({ data: await localized.searchNodes(q, filters, locale) });
    }));

    router.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      if (err instanceof z.ZodError) return res.status(400).json(toApiValidationErrorPayload(err));
      res.status(500).json({ error: 'ACADEMIC_TAXONOMY_REQUEST_FAILED' });
    });
    return router;
  }
}
