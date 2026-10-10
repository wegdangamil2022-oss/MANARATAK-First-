import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AdminAcademicTaxonomyUseCases, AdminMajorUseCases, DegreeLevelUseCases, AcademicTaxonomyOwnerImportUseCases, TAXONOMY_DIAGNOSTIC_CODES } from '@manaratak/application';
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
    academicTaxonomyOwnerImportUseCases?: AcademicTaxonomyOwnerImportUseCases;
    degreeLevelUseCases: DegreeLevelUseCases;
    adminMajorUseCases: AdminMajorUseCases;
    auditRecordRepo?: IAuditRecordRepository;
  }): Router {
    const router = Router();
    const { academicTaxonomyOwnerImportUseCases, adminAcademicTaxonomyUseCases, adminMajorUseCases, degreeLevelUseCases, auditRecordRepo } = cradle;

    const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
    const actor = (req: Request): string => {
      if (!req.authUserId) throw new Error('AUTHENTICATED_ADMIN_ACTOR_REQUIRED');
      return req.authUserId;
    };
    const context = (req: Request) => ({ actorId: actor(req), source: 'admin-academic-taxonomy', correlationId: typeof req.headers['x-correlation-id'] === 'string' ? req.headers['x-correlation-id'].slice(0, 256) : undefined });
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

    const lifecycleSchema = z.object({ reason: z.string().trim().min(1).max(1000), acknowledgeHistoricalReferences: z.literal(true) }).strict();
    const upsertNodeSchema = z.object({
      lifecycle: lifecycleSchema.optional(),
      expectedUpdatedAt: z.string().datetime().optional(),
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
      rootOnly: z.enum(['true', 'false']).transform(value => value === 'true').optional(),
      orphan: z.enum(['true', 'false']).transform(value => value === 'true').optional(),
      unmapped: z.enum(['true', 'false']).transform(value => value === 'true').optional(),
      nodeType: nodeTypeSchema.optional(), standardType: standardTypeSchema.optional(), status: statusSchema.optional(), q: z.string().trim().max(200).optional(),
      parentNodeId: z.string().optional(), page: z.coerce.number().int().min(1).max(1000).optional(), pageSize: z.coerce.number().int().min(1).max(100).optional(),
    });

    const pageQuery = z.object({ page: z.coerce.number().int().min(1).max(1000).optional(), pageSize: z.coerce.number().int().min(1).max(100).optional() });
    router.get('/nodes/:nodeId/paths', asyncHandler(async (req: Request, res: Response) => res.json(await adminAcademicTaxonomyUseCases.primaryPath(req.params.nodeId))));
    router.get('/diagnostics', asyncHandler(async (req: Request, res: Response) => {
      const query = z.object({ standardType: standardTypeSchema.optional(), page: z.coerce.number().int().min(1).max(1000).optional(), code: z.enum(TAXONOMY_DIAGNOSTIC_CODES).optional() }).parse(req.query);
      res.json(await adminAcademicTaxonomyUseCases.diagnostics(query));
    }));
    router.get('/crosswalk', asyncHandler(async (req: Request, res: Response) => {
      const query = z.object({ sourceStandard: standardTypeSchema, targetStandard: standardTypeSchema, nodeType: nodeTypeSchema.optional(), status: statusSchema.optional(),
        minConfidence: z.coerce.number().min(0).max(1).optional(), mappingState: z.enum(['MAPPED','UNMAPPED','AMBIGUOUS','CONFLICTING','UNRESOLVED']).optional(), q: z.string().trim().max(200).optional(), page: z.coerce.number().int().min(1).max(1000).optional() }).parse(req.query);
      res.json(await adminAcademicTaxonomyUseCases.crosswalk(query));
    }));
    router.post('/mappings/preview', asyncHandler(async (req: Request, res: Response) => res.json(await adminAcademicTaxonomyUseCases.previewMapping(upsertMappingSchema.parse(req.body) as any))));
    router.post('/review/bulk', asyncHandler(async (req: Request, res: Response) => {
      const body = z.object({ nodes: z.array(z.object({ nodeId: z.string().min(1).max(128), expectedUpdatedAt: z.string().datetime() }).strict()).min(1).max(25),
        nextStatus: z.enum(['DRAFT', 'READY_TO_REVIEW']), reason: z.string().trim().min(1).max(1000), acknowledgeHistoricalReferences: z.literal(true), dryRun: z.boolean(), previewHash: z.string().regex(/^[a-f0-9]{64}$/).optional() }).strict().parse(req.body);
      res.json(await adminAcademicTaxonomyUseCases.bulkReview(body, context(req)));
    }));
    const ownerImports = () => { if (!academicTaxonomyOwnerImportUseCases) throw new Error('TAXONOMY_IMPORT_UNAVAILABLE'); return academicTaxonomyOwnerImportUseCases; };
    const importPage = z.object({ page: z.coerce.number().int().min(1).max(1000).default(1), status: z.enum(['PREVIEWED', 'APPROVED', 'REJECTED', 'APPLIED']).optional() });
    router.get('/imports/screenings', asyncHandler(async (req: Request, res: Response) => res.json(await ownerImports().screenings(importPage.parse(req.query).page))));
    router.get('/imports', asyncHandler(async (req: Request, res: Response) => { const query = importPage.parse(req.query); res.json(await ownerImports().list(query.page, query.status)); }));
    router.get('/imports/:id', asyncHandler(async (req: Request, res: Response) => { const plan = await ownerImports().get(req.params.id); if (!plan) return res.status(404).json({ error: 'TAXONOMY_IMPORT_NOT_FOUND' }); res.json(plan); }));
    router.post('/imports/preview', asyncHandler(async (req: Request, res: Response) => { const body = z.object({ receiptId: z.string().min(1).max(128) }).strict().parse(req.body); res.json(await ownerImports().preview(body.receiptId, context(req))); }));
    const importVersion = z.object({ expectedVersion: z.number().int().min(1), previewHash: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
    router.post('/imports/:id/refresh', asyncHandler(async (req: Request, res: Response) => { const body = z.object({ expectedVersion: z.number().int().min(1) }).strict().parse(req.body); res.json(await ownerImports().refresh(req.params.id, body.expectedVersion, context(req))); }));
    router.post('/imports/:id/review', asyncHandler(async (req: Request, res: Response) => { const body = importVersion.extend({ decision: z.enum(['APPROVE', 'REJECT']), reason: z.string().trim().min(1).max(1000) }).strict().parse(req.body); res.json(await ownerImports().review(req.params.id, body, context(req))); }));
    router.post('/imports/:id/apply', asyncHandler(async (req: Request, res: Response) => res.json(await ownerImports().apply(req.params.id, importVersion.parse(req.body), context(req)))));

    router.get('/nodes', asyncHandler(async (req: Request, res: Response) => {
      res.json(await adminAcademicTaxonomyUseCases.listNodesPage(listNodesQuerySchema.parse(req.query)));
    }));
    router.get('/nodes/:nodeId/usage', asyncHandler(async (req: Request, res: Response) => res.json(await adminAcademicTaxonomyUseCases.getUsage(req.params.nodeId))));
    router.get('/nodes/:nodeId', asyncHandler(async (req: Request, res: Response) => {
      const node = await adminAcademicTaxonomyUseCases.getNode(req.params.nodeId);
      if (!node) return res.status(404).json({ error: 'Academic taxonomy node not found' });
      res.json(node);
    }));
    router.get('/nodes/:nodeId/children', asyncHandler(async (req: Request, res: Response) => res.json(await adminAcademicTaxonomyUseCases.relatedNodesPage(req.params.nodeId, 'children', pageQuery.parse(req.query)))));
    router.get('/nodes/:nodeId/parents', asyncHandler(async (req: Request, res: Response) => res.json(await adminAcademicTaxonomyUseCases.relatedNodesPage(req.params.nodeId, 'parents', pageQuery.parse(req.query)))));
    router.get('/nodes/:nodeId/aliases', asyncHandler(async (req: Request, res: Response) => res.json({ data: await adminAcademicTaxonomyUseCases.listAliases(req.params.nodeId) })));
    router.get('/nodes/:nodeId/mappings', asyncHandler(async (req: Request, res: Response) => res.json({ data: await adminAcademicTaxonomyUseCases.listMappings(req.params.nodeId) })));
    router.get('/nodes/:nodeId/mapped-majors', asyncHandler(async (req: Request, res: Response) => res.json({ data: await adminMajorUseCases.listByTaxonomyNode(req.params.nodeId) })));

    router.post('/nodes/validate', asyncHandler(async (req: Request, res: Response) => {
      res.json(adminAcademicTaxonomyUseCases.validateNode(upsertNodeSchema.parse(req.body) as any));
    }));
    router.put('/nodes', asyncHandler(async (req: Request, res: Response) => {
      const data = upsertNodeSchema.parse(req.body);
      const result = await mutate(req, { action: 'UPSERT_ACADEMIC_TAXONOMY_NODE', targetType: 'ACADEMIC_TAXONOMY_NODE', targetId: data.canonicalCode, metadata: { nodeType: data.nodeType, status: data.status, standardType: data.standardType } }, () => adminAcademicTaxonomyUseCases.upsertNode(data as any, context(req)));
      res.json(result);
    }));
    router.put('/nodes/:nodeId', asyncHandler(async (req: Request, res: Response) => {
      const { expectedUpdatedAt, ...data } = upsertNodeSchema.extend({ expectedUpdatedAt: z.string().datetime() }).strict().parse(req.body);
      const result = await mutate(req, { action: 'UPDATE_ACADEMIC_TAXONOMY_NODE', targetType: 'ACADEMIC_TAXONOMY_NODE', targetId: req.params.nodeId },
        () => adminAcademicTaxonomyUseCases.editNode(req.params.nodeId, data as any, expectedUpdatedAt, context(req)));
      res.json(result);
    }));
    router.post('/edges', asyncHandler(async (req: Request, res: Response) => {
      const data = upsertEdgeSchema.parse(req.body);
      const edge = await mutate(req, { action: 'ADD_ACADEMIC_TAXONOMY_EDGE', targetType: 'ACADEMIC_TAXONOMY_EDGE', targetId: `${data.parentNodeId}:${data.childNodeId}` }, () => adminAcademicTaxonomyUseCases.addEdge(data, context(req)));
      res.json(edge);
    }));
    router.delete('/edges/by-nodes', asyncHandler(async (req: Request, res: Response) => {
      const data = edgeByNodesSchema.parse(req.query);
      const removed = await mutate(req, { action: 'REMOVE_ACADEMIC_TAXONOMY_EDGE', targetType: 'ACADEMIC_TAXONOMY_EDGE', targetId: `${data.parentNodeId}:${data.childNodeId}` }, () => adminAcademicTaxonomyUseCases.removeEdgeByNodes(data.parentNodeId, data.childNodeId, context(req)));
      if (!removed) return res.status(404).json({ error: 'Edge not found' });
      res.json({ ok: true });
    }));
    router.delete('/edges/:edgeId', asyncHandler(async (req: Request, res: Response) => {
      await mutate(req, { action: 'REMOVE_ACADEMIC_TAXONOMY_EDGE', targetType: 'ACADEMIC_TAXONOMY_EDGE', targetId: req.params.edgeId }, () => adminAcademicTaxonomyUseCases.removeEdge(req.params.edgeId, context(req)));
      res.json({ ok: true });
    }));
    router.post('/aliases', asyncHandler(async (req: Request, res: Response) => {
      const data = upsertAliasSchema.parse(req.body);
      const alias = await mutate(req, { action: 'ADD_ACADEMIC_TAXONOMY_ALIAS', targetType: 'ACADEMIC_TAXONOMY_ALIAS', targetId: data.nodeId, metadata: { locale: data.locale } }, () => adminAcademicTaxonomyUseCases.addAlias(data, context(req)));
      res.json(alias);
    }));
    router.delete('/aliases/:aliasId', asyncHandler(async (req: Request, res: Response) => {
      await mutate(req, { action: 'REMOVE_ACADEMIC_TAXONOMY_ALIAS', targetType: 'ACADEMIC_TAXONOMY_ALIAS', targetId: req.params.aliasId }, () => adminAcademicTaxonomyUseCases.removeAlias(req.params.aliasId, context(req)));
      res.json({ ok: true });
    }));
    router.post('/mappings', asyncHandler(async (req: Request, res: Response) => {
      const data = upsertMappingSchema.parse(req.body);
      const mapping = await mutate(req, { action: 'ADD_ACADEMIC_STANDARD_MAPPING', targetType: 'ACADEMIC_STANDARD_MAPPING', targetId: `${data.sourceNodeId}:${data.targetNodeId}`, metadata: { strength: data.strength, confidence: data.confidence } }, () => adminAcademicTaxonomyUseCases.addMapping(data, context(req)));
      res.json(mapping);
    }));
    router.delete('/mappings/:mappingId', asyncHandler(async (req: Request, res: Response) => {
      await mutate(req, { action: 'REMOVE_ACADEMIC_STANDARD_MAPPING', targetType: 'ACADEMIC_STANDARD_MAPPING', targetId: req.params.mappingId }, () => adminAcademicTaxonomyUseCases.removeMapping(req.params.mappingId, context(req)));
      res.json({ ok: true });
    }));
    router.post('/import-handoff', asyncHandler(async (req: Request, res: Response) => {
      actor(req);
      const data = importHandoffCommandSchema.parse(req.body);
      const batch = adminAcademicTaxonomyUseCases.prepareImportHandoff(data as any);
      res.json(batch);
    }));

    const updateDegreeLevelSchema = z.object({
      lifecycle: lifecycleSchema.optional(),
      expectedUpdatedAt: z.string().datetime(),
      nameEn: z.string().trim().min(1).max(250), nameAr: z.string().trim().min(1).max(250), displayRank: z.number().int().min(0).optional(), status: z.nativeEnum(DegreeLevelStatus).optional(),
    });
    router.get('/degree-levels', asyncHandler(async (_req: Request, res: Response) => res.json({ data: await degreeLevelUseCases.list() })));
    router.get('/degree-levels/:id/usage', asyncHandler(async (req: Request, res: Response) => res.json(await degreeLevelUseCases.getUsage(req.params.id))));
    router.get('/degree-levels/:id', asyncHandler(async (req: Request, res: Response) => {
      const item = await degreeLevelUseCases.getById(req.params.id);
      if (!item) return res.status(404).json({ error: 'Degree level not found' });
      res.json(item);
    }));
    router.put('/degree-levels/:id', asyncHandler(async (req: Request, res: Response) => {
      const body = updateDegreeLevelSchema.parse(req.body);
      const updated = await mutate(req, { action: 'UPDATE_DEGREE_LEVEL', targetType: 'DEGREE_LEVEL', targetId: req.params.id, metadata: { status: body.status, displayRank: body.displayRank } }, () => degreeLevelUseCases.update(req.params.id, body, context(req)));
      if (!updated) return res.status(404).json({ error: 'Degree level not found' });
      res.json(updated);
    }));

    router.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      if (err?.message === 'AUTHENTICATED_ADMIN_ACTOR_REQUIRED') return res.status(401).json({ error: err.message });
      if (err?.message?.startsWith('TAXONOMY_IMPORT_') && /CONFLICT|STALE|APPROVAL/.test(err.message) || err?.message === 'TAXONOMY_BULK_PREVIEW_CONFLICT') return res.status(409).json({ error: err.message, code: err.message });
      if (['TAXONOMY_GOVERNANCE_READ_UNAVAILABLE', 'TAXONOMY_IMPORT_UNAVAILABLE', 'TAXONOMY_DIAGNOSTICS_SCOPE_TOO_LARGE', 'TAXONOMY_ALIAS_RECONCILIATION_SCOPE_TOO_LARGE'].includes(err?.message)) return res.status(503).json({ error: err.message });
      if (err?.message === 'ACADEMIC_USAGE_UNAVAILABLE') return res.status(503).json({ error: err.message });
      if (err?.message === 'ACADEMIC_USAGE_REFERENCE_NOT_FOUND') return res.status(404).json({ error: err.message });
      if (err?.message === 'DEGREE_LEVEL_VERSION_CONFLICT') return res.status(409).json({ error: err.message, code: err.message });
      if (err instanceof Error && /^(TAXONOMY|DEGREE_LEVEL)_(ATOMIC_CONTEXT_REQUIRED|GOVERNED_EDIT_UNAVAILABLE)$/.test(err.message)) return res.status(503).json({ error: err.message });
      if (err?.message === 'TAXONOMY_NODE_VERSION_CONFLICT') return res.status(409).json({ error: err.message, code: err.message });
      if (err?.message === 'TAXONOMY_NODE_NOT_FOUND' || err?.message === 'DEGREE_LEVEL_NOT_FOUND') return res.status(404).json({ error: err.message });
      if (err?.message === 'TAXONOMY_GOVERNED_EDIT_UNAVAILABLE' || err?.message === 'TAXONOMY_PAGINATION_UNAVAILABLE') return res.status(503).json({ error: err.message });
      if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation Error', details: err.issues });
      res.status(400).json({ error: err.message || 'An error occurred' });
    });
    return router;
  }
}
