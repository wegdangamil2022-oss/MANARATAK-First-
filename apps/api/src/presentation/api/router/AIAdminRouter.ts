import { NextFunction, Request, Response, Router } from 'express';
import { z } from 'zod';
import { AIExecutionOrchestrator, AIKnowledgeUseCases, AIPlatformAdminUseCases, AIEvaluationUseCases, AIWorkflowUseCases } from '@manaratak/application';

const resourceSchema = z.enum(['providers', 'models', 'modelPrices', 'capabilities', 'routingPolicies', 'prompts', 'guardrails', 'consumers', 'workflows', 'evaluations', 'knowledgeIndexes', 'knowledgeSources', 'incidents', 'platformSettings']);
const keySchema = z.string().trim().min(1).max(160).regex(/^[a-zA-Z0-9_.:-]+$/);
const safeRecord = z.record(z.string(), z.unknown()).superRefine((value, context) => {
  const visit = (candidate: unknown, path: Array<string | number>) => {
    if (!candidate || typeof candidate !== 'object') return;
    for (const [key, nested] of Object.entries(candidate)) {
      const next = [...path, key];
      if (/api.?key|secretValue|accessToken|authorization|password|credential/i.test(key))
        context.addIssue({ code: 'custom', path: next, message: 'Secret values are forbidden. Use secretReference.' });
      else visit(nested, next);
    }
  };
  visit(value, []);
});

export class AIAdminRouter {
  static create(cradle: { aiPlatformAdminUseCases: AIPlatformAdminUseCases; aiExecutionUseCases: AIExecutionOrchestrator; aiWorkflowUseCases: AIWorkflowUseCases; aiEvaluationUseCases: AIEvaluationUseCases; aiKnowledgeUseCases: AIKnowledgeUseCases }): Router {
    const router = Router();
    const asyncHandler = (fn: (req: Request, res: Response) => Promise<void>) => (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res)).catch(next);
    const actor = (req: Request) => { if (!req.authUserId) throw new Error('AI_AUTHENTICATED_ACTOR_REQUIRED'); return req.authUserId; };

    router.get('/overview', asyncHandler(async (_req, res) => { res.json(await cradle.aiPlatformAdminUseCases.overview()); }));
    router.get('/provider-statuses', asyncHandler(async (_req, res) => { res.json({ data: cradle.aiPlatformAdminUseCases.providerStatuses() }); }));
    router.get('/executions', asyncHandler(async (req, res) => { res.json(await cradle.aiPlatformAdminUseCases.executions(req.query as Record<string, unknown>)); }));
    router.get('/executions/:publicId', asyncHandler(async (req, res) => { const value = await cradle.aiPlatformAdminUseCases.execution(req.params.publicId); if (!value) { res.status(404).json({ error: 'AI_EXECUTION_NOT_FOUND' }); return; } res.json(value); }));
    router.get('/executions/:publicId/trace', asyncHandler(async (req, res) => { res.json({ data: await cradle.aiPlatformAdminUseCases.executionTrace(req.params.publicId) }); }));
    router.get('/async-queue/status', asyncHandler(async (_req, res) => { res.json(await cradle.aiExecutionUseCases.queueStatus()); }));
    router.get('/async-queue/jobs', asyncHandler(async (req, res) => { res.json(await cradle.aiExecutionUseCases.listAsyncJobs({ status: typeof req.query.status === 'string' ? req.query.status : undefined, page: z.coerce.number().int().positive().optional().parse(req.query.page), pageSize: z.coerce.number().int().positive().max(100).optional().parse(req.query.pageSize) })); }));
    router.post('/async-queue/jobs/:publicId/:action', asyncHandler(async (req, res) => { const body = z.object({ confirmed: z.literal(true) }).parse(req.body); void body; res.json(await cradle.aiExecutionUseCases.operateAsyncJob(req.params.publicId, z.enum(['RETRY', 'CANCEL']).parse(req.params.action), actor(req))); }));
    router.get('/:resource', asyncHandler(async (req, res) => { const resource = resourceSchema.parse(req.params.resource); res.json({ data: await cradle.aiPlatformAdminUseCases.list(resource, req.query as Record<string, unknown>) }); }));
    router.get('/:resource/:key', asyncHandler(async (req, res) => { const resource = resourceSchema.parse(req.params.resource); const value = await cradle.aiPlatformAdminUseCases.find(resource, keySchema.parse(req.params.key)); if (!value) { res.status(404).json({ error: 'AI_RESOURCE_NOT_FOUND' }); return; } res.json(value); }));
    router.put('/:resource/:key', asyncHandler(async (req, res) => { const resource = resourceSchema.parse(req.params.resource); const key = keySchema.parse(req.params.key); const body = safeRecord.parse(req.body); res.json(await cradle.aiPlatformAdminUseCases.save(resource, { ...body, key } as any, actor(req))); }));
    router.post('/prompts/:key/versions', asyncHandler(async (req, res) => { const body = z.object({ version: z.number().int().positive(), template: z.string().min(1).max(100000), inputSchema: safeRecord.optional().nullable(), outputSchema: safeRecord.optional().nullable(), status: z.enum(['DRAFT', 'REVIEW']).default('DRAFT') }).parse(req.body); res.status(201).json(await cradle.aiPlatformAdminUseCases.createPromptVersion({ ...body, promptKey: keySchema.parse(req.params.key), createdBy: actor(req), approvedBy: null })); }));
    router.post('/prompts/:key/versions/:version/approve', asyncHandler(async (req, res) => { res.json(await cradle.aiPlatformAdminUseCases.approvePromptVersion(keySchema.parse(req.params.key), z.coerce.number().int().positive().parse(req.params.version), actor(req))); }));
    router.post('/prompts/:key/deployments', asyncHandler(async (req, res) => { const body = z.object({ version: z.number().int().positive() }).parse(req.body); res.json(await cradle.aiPlatformAdminUseCases.deployPrompt(keySchema.parse(req.params.key), body.version, actor(req))); }));
    router.post('/prompts/:key/rollback', asyncHandler(async (req, res) => { const body = z.object({ version: z.number().int().positive() }).parse(req.body); res.json(await cradle.aiPlatformAdminUseCases.rollbackPrompt(keySchema.parse(req.params.key), body.version, actor(req))); }));
    router.post('/workflows/:key/runs', asyncHandler(async (req, res) => { res.status(202).json(await cradle.aiWorkflowUseCases.start(keySchema.parse(req.params.key), safeRecord.parse(req.body))); }));
    router.post('/workflow-runs/:publicId/execute', asyncHandler(async (req, res) => { res.json(await cradle.aiWorkflowUseCases.run(req.params.publicId, safeRecord.parse(req.body))); }));
    router.post('/evaluations/:key/runs', asyncHandler(async (req, res) => { res.status(202).json(await cradle.aiEvaluationUseCases.start(keySchema.parse(req.params.key), z.object({ promptVersion: z.number().int().positive().optional(), modelKey: keySchema.optional() }).parse(req.body))); }));
    router.post('/evaluation-runs/:publicId/execute', asyncHandler(async (req, res) => { actor(req); res.json(await cradle.aiEvaluationUseCases.run(req.params.publicId)); }));
    router.post('/evaluation-runs/:publicId/approve', asyncHandler(async (req, res) => { res.json(await cradle.aiEvaluationUseCases.approve(req.params.publicId, actor(req))); }));
    router.post('/knowledge-indexes/:key/index', asyncHandler(async (req, res) => { const body = z.object({ sourceType: keySchema, sourceReferenceId: z.string().min(1).max(500), sourceVersion: z.string().max(200).optional(), locale: z.string().max(20).optional(), content: z.string().min(1).max(2_000_000) }).parse(req.body); res.status(202).json(await cradle.aiKnowledgeUseCases.index({ indexKey: keySchema.parse(req.params.key), ...body, actorReferenceId: actor(req) })); }));
    router.post('/incidents/:publicId/events', asyncHandler(async (req, res) => { const body = z.object({ action: z.string().min(1), note: z.string().max(4000).optional() }).parse(req.body); res.json(await cradle.aiPlatformAdminUseCases.appendIncidentEvent(req.params.publicId, body.action, actor(req), body.note)); }));
    router.post('/playground/execute', asyncHandler(async (req, res) => { const body = z.object({ capabilityKey: keySchema, input: z.string().min(1).max(20000), locale: z.enum(['ar', 'en']).default('ar'), dataClassification: z.enum(['PUBLIC', 'INTERNAL', 'CONFIDENTIAL']).default('INTERNAL'), idempotencyKey: z.string().min(1).max(200).optional() }).parse(req.body); res.json(await cradle.aiExecutionUseCases.executeCapability({ ...body, consumerKey: 'admin-ai-playground', requesterReferenceId: actor(req), sourceDomain: 'AdminAIPlayground' })); }));
    return router;
  }
}
