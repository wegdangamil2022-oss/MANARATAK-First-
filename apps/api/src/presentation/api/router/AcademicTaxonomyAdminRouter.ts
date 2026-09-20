import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AdminAcademicTaxonomyUseCases, AdminMajorUseCases, DegreeLevelUseCases } from '@manaratak/application';
import {
  AcademicTaxonomyNodeType,
  AcademicTaxonomyStatus,
  AcademicStandardType,
  AcademicMappingStrength,
  DegreeLevelStatus,
  IAuditRecordRepository,
} from '@manaratak/domain';
import { AuditHelper } from '../../audit/AuditHelper.js';

export class AcademicTaxonomyAdminRouter {
  public static create(cradle: {
    adminAcademicTaxonomyUseCases: AdminAcademicTaxonomyUseCases;
    degreeLevelUseCases: DegreeLevelUseCases;
    adminMajorUseCases: AdminMajorUseCases;
    auditRecordRepo?: IAuditRecordRepository;
  }): Router {
    const router = Router();
    const { adminAcademicTaxonomyUseCases, adminMajorUseCases, degreeLevelUseCases, auditRecordRepo } = cradle;

    const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
    const actor = (req: Request): string => {
      if (!req.authUserId) throw new Error('AUTHENTICATED_ADMIN_ACTOR_REQUIRED');
      return req.authUserId;
    };
    const mutate = async <T>(
      req: Request,
      input: { action: string; targetType: string; targetId?: string; metadata?: Record<string, unknown> },
      operation: () => Promise<T>,
    ): Promise<T> => {
      actor(req);
      try {
        const result = await operation();
        await AuditHelper.recordMutation(auditRecordRepo, req, { ...input, category: 'ACADEMIC_TAXONOMY', result: 'SUCCESS' });
        return result;
      } catch (error) {
        await AuditHelper.recordMutation(auditRecordRepo, req, { ...input, category: 'ACADEMIC_TAXONOMY', result: 'FAILURE', error });
        throw error;
      }
    };

    const nodeTypeSchema = z.nativeEnum(AcademicTaxonomyNodeType);
    const statusSchema = z.nativeEnum(AcademicTaxonomyStatus);
    const standardTypeSchema = z.nativeEnum(AcademicStandardType);
    const strengthSchema = z.nativeEnum(AcademicMappingStrength);

    const upsertNodeSchema = z.object({
      nodeType: nodeTypeSchema,
      status: statusSchema.optional(),
      standardType: standardTypeSchema.optional(),
      canonicalCode: z.string().trim().min(1).max(128),
      canonicalName: z.string().trim().min(1).max(500),
      description: z.string().max(4000).optional(),
      standardCode: z.string().trim().max(128).optional(),
      localizedNames: z.record(z.string(), z.string().max(500)).optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    });

    const upsertEdgeSchema = z.object({
      parentNodeId: z.string().min(1), childNodeId: z.string().min(1), isPrimary: z.boolean().optional(),
    });
    const edgeByNodesSchema = z.object({ parentNodeId: z.string().min(1), childNodeId: z.string().min(1) });
    const upsertAliasSchema = z.object({ nodeId: z.string().min(1), alias: z.string().trim().min(1).max(500), locale: z.string().trim().max(35).optional() });
    const upsertMappingSchema = z.object({
      sourceNodeId: z.string().min(1), targetNodeId: z.string().min(1), sourceStandard: standardTypeSchema,
      targetStandard: standardTypeSchema, strength: strengthSchema, confidence: z.number().min(0).max(1).optional(), notes: z.string().max(2000).optional(),
    });
    const importHandoffCommandSchema = z.object({
      seedBatchId: z.string().min(1), sourceName: z.string().min(1), sourceVersion: z.string().min(1), sourceUrl: z.string().url().optional(),
      records: z.array(z.any()), autoMarkReadyIfValid: z.boolean().optional(), existingNodes: z.array(z.any()).optional(),
      existingEdges: z.array(z.any()).optional(), existingAliases: z.array(z.any()).optional(), existingMappings: z.array(z.any()).optional(),
    });
    const listNodesQuerySchema = z.object({
      nodeType: nodeTypeSchema.optional(), standardType: standardTypeSchema.optional(), status: statusSchema.optional(), q: z.string().optional(),
      parentNodeId: z.string().optional(), page: z.coerce.number().int().min(1).optional(), pageSize: z.coerce.number().int().min(1).max(100).optional(),
    });

    router.get('/nodes', asyncHandler(async (req: Request, res: Response) => {
      res.json({ data: await adminAcademicTaxonomyUseCases.listNodes(listNodesQuerySchema.parse(req.query)) });
    }));
    router.get('/nodes/:nodeId', asyncHandler(async (req: Request, res: Response) => {
      const node = await adminAcademicTaxonomyUseCases.getNode(req.params.nodeId);
      if (!node) return res.status(404).json({ error: 'Academic taxonomy node not found' });
      res.json(node);
    }));
    router.get('/nodes/:nodeId/children', asyncHandler(async (req: Request, res: Response) => res.json({ data: await adminAcademicTaxonomyUseCases.listChildren(req.params.nodeId) })));
    router.get('/nodes/:nodeId/parents', asyncHandler(async (req: Request, res: Response) => res.json({ data: await adminAcademicTaxonomyUseCases.listParents(req.params.nodeId) })));
    router.get('/nodes/:nodeId/aliases', asyncHandler(async (req: Request, res: Response) => res.json({ data: await adminAcademicTaxonomyUseCases.listAliases(req.params.nodeId) })));
    router.get('/nodes/:nodeId/mappings', asyncHandler(async (req: Request, res: Response) => res.json({ data: await adminAcademicTaxonomyUseCases.listMappings(req.params.nodeId) })));
    router.get('/nodes/:nodeId/mapped-majors', asyncHandler(async (req: Request, res: Response) => res.json({ data: await adminMajorUseCases.listByTaxonomyNode(req.params.nodeId) })));

    router.post('/nodes/validate', asyncHandler(async (req: Request, res: Response) => {
      res.json(adminAcademicTaxonomyUseCases.validateNode(upsertNodeSchema.parse(req.body) as any));
    }));
    router.put('/nodes', asyncHandler(async (req: Request, res: Response) => {
      const data = upsertNodeSchema.parse(req.body);
      const result = await mutate(req, { action: 'UPSERT_ACADEMIC_TAXONOMY_NODE', targetType: 'ACADEMIC_TAXONOMY_NODE', targetId: data.canonicalCode, metadata: { nodeType: data.nodeType, status: data.status, standardType: data.standardType } }, () => adminAcademicTaxonomyUseCases.upsertNode(data as any));
      res.json(result);
    }));
    router.post('/edges', asyncHandler(async (req: Request, res: Response) => {
      const data = upsertEdgeSchema.parse(req.body);
      const edge = await mutate(req, { action: 'ADD_ACADEMIC_TAXONOMY_EDGE', targetType: 'ACADEMIC_TAXONOMY_EDGE', targetId: `${data.parentNodeId}:${data.childNodeId}` }, () => adminAcademicTaxonomyUseCases.addEdge(data));
      res.json(edge);
    }));
    router.delete('/edges/by-nodes', asyncHandler(async (req: Request, res: Response) => {
      const data = edgeByNodesSchema.parse(req.query);
      const removed = await mutate(req, { action: 'REMOVE_ACADEMIC_TAXONOMY_EDGE', targetType: 'ACADEMIC_TAXONOMY_EDGE', targetId: `${data.parentNodeId}:${data.childNodeId}` }, () => adminAcademicTaxonomyUseCases.removeEdgeByNodes(data.parentNodeId, data.childNodeId));
      if (!removed) return res.status(404).json({ error: 'Edge not found' });
      res.json({ ok: true });
    }));
    router.delete('/edges/:edgeId', asyncHandler(async (req: Request, res: Response) => {
      await mutate(req, { action: 'REMOVE_ACADEMIC_TAXONOMY_EDGE', targetType: 'ACADEMIC_TAXONOMY_EDGE', targetId: req.params.edgeId }, () => adminAcademicTaxonomyUseCases.removeEdge(req.params.edgeId));
      res.json({ ok: true });
    }));
    router.post('/aliases', asyncHandler(async (req: Request, res: Response) => {
      const data = upsertAliasSchema.parse(req.body);
      const alias = await mutate(req, { action: 'ADD_ACADEMIC_TAXONOMY_ALIAS', targetType: 'ACADEMIC_TAXONOMY_ALIAS', targetId: data.nodeId, metadata: { locale: data.locale } }, () => adminAcademicTaxonomyUseCases.addAlias(data));
      res.json(alias);
    }));
    router.delete('/aliases/:aliasId', asyncHandler(async (req: Request, res: Response) => {
      await mutate(req, { action: 'REMOVE_ACADEMIC_TAXONOMY_ALIAS', targetType: 'ACADEMIC_TAXONOMY_ALIAS', targetId: req.params.aliasId }, () => adminAcademicTaxonomyUseCases.removeAlias(req.params.aliasId));
      res.json({ ok: true });
    }));
    router.post('/mappings', asyncHandler(async (req: Request, res: Response) => {
      const data = upsertMappingSchema.parse(req.body);
      const mapping = await mutate(req, { action: 'ADD_ACADEMIC_STANDARD_MAPPING', targetType: 'ACADEMIC_STANDARD_MAPPING', targetId: `${data.sourceNodeId}:${data.targetNodeId}`, metadata: { strength: data.strength, confidence: data.confidence } }, () => adminAcademicTaxonomyUseCases.addMapping(data));
      res.json(mapping);
    }));
    router.delete('/mappings/:mappingId', asyncHandler(async (req: Request, res: Response) => {
      await mutate(req, { action: 'REMOVE_ACADEMIC_STANDARD_MAPPING', targetType: 'ACADEMIC_STANDARD_MAPPING', targetId: req.params.mappingId }, () => adminAcademicTaxonomyUseCases.removeMapping(req.params.mappingId));
      res.json({ ok: true });
    }));
    router.post('/import-handoff', asyncHandler(async (req: Request, res: Response) => {
      actor(req);
      const data = importHandoffCommandSchema.parse(req.body);
      const batch = adminAcademicTaxonomyUseCases.prepareImportHandoff(data as any);
      res.json(batch);
    }));

    const updateDegreeLevelSchema = z.object({
      nameEn: z.string().trim().min(1).max(250), nameAr: z.string().trim().min(1).max(250), displayRank: z.number().int().min(0).optional(), status: z.nativeEnum(DegreeLevelStatus).optional(),
    });
    router.get('/degree-levels', asyncHandler(async (_req: Request, res: Response) => res.json({ data: await degreeLevelUseCases.list() })));
    router.get('/degree-levels/:id', asyncHandler(async (req: Request, res: Response) => {
      const item = await degreeLevelUseCases.getById(req.params.id);
      if (!item) return res.status(404).json({ error: 'Degree level not found' });
      res.json(item);
    }));
    router.put('/degree-levels/:id', asyncHandler(async (req: Request, res: Response) => {
      const body = updateDegreeLevelSchema.parse(req.body);
      const updated = await mutate(req, { action: 'UPDATE_DEGREE_LEVEL', targetType: 'DEGREE_LEVEL', targetId: req.params.id, metadata: { status: body.status, displayRank: body.displayRank } }, () => degreeLevelUseCases.update(req.params.id, body));
      if (!updated) return res.status(404).json({ error: 'Degree level not found' });
      res.json(updated);
    }));

    router.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation Error', details: err.issues });
      res.status(400).json({ error: err.message || 'An error occurred' });
    });
    return router;
  }
}
