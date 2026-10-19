import { NextFunction, Request, Response, Router } from 'express';
import { z } from 'zod';
import { AIExecutionStatus, AuthorizationEvaluatorService } from '@absheer/domain';
import {
  AIExecutionOrchestrator,
  AIKnowledgeUseCases,
  AIPlatformAdminUseCases,
  AIEvaluationUseCases,
  AIWorkflowUseCases,
} from '@absheer/application';

const resourceSchema = z.enum([
  'providers',
  'models',
  'modelPrices',
  'capabilities',
  'routingPolicies',
  'prompts',
  'guardrails',
  'consumers',
  'workflows',
  'evaluations',
  'knowledgeIndexes',
  'knowledgeSources',
  'incidents',
  'platformSettings',
]);
const keySchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[a-zA-Z0-9_.:-]+$/);
const safeRecord = z.record(z.string(), z.unknown()).superRefine((value, context) => {
  const visit = (candidate: unknown, path: Array<string | number>) => {
    if (!candidate || typeof candidate !== 'object') return;
    for (const [key, nested] of Object.entries(candidate)) {
      const next = [...path, key];
      if (
        /api.?key|^secret$|secretValue|privateKey|accessToken|refreshToken|authorization|password|credential/i.test(
          key,
        )
      )
        context.addIssue({
          code: 'custom',
          path: next,
          message: 'Secret values are forbidden. Use secretReference.',
        });
      else visit(nested, next);
    }
  };
  visit(value, []);
});

const optionalStatus = (values: readonly [string, ...string[]]) =>
  z.preprocess(
    (value) => (value === 'ALL' || value === '' ? undefined : value),
    z.enum(values).optional(),
  );
const paging = {
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
};
const executionFilters = z
  .object({
    ...paging,
    status: optionalStatus(Object.values(AIExecutionStatus) as [string, ...string[]]),
    search: z.string().trim().max(200).optional(),
    consumerKey: keySchema.optional(),
    providerKey: keySchema.optional(),
    purpose: z.string().trim().max(160).optional(),
  })
  .strict();
const jobFilters = z
  .object({
    ...paging,
    status: optionalStatus([
      'QUEUED',
      'RUNNING',
      'RETRYING',
      'COMPLETED',
      'FAILED',
      'DEAD_LETTER',
      'CANCELLED',
    ]),
  })
  .strict();
const registryFilters = z
  .object({
    status: optionalStatus([
      'DRAFT',
      'REVIEW',
      'ACTIVE',
      'INACTIVE',
      'ARCHIVED',
      'OPEN',
      'INVESTIGATING',
      'MITIGATED',
      'RESOLVED',
      'PENDING',
      'INDEXED',
      'FAILED',
      'REMOVED',
    ]),
  })
  .strict();

export class AIAdminRouter {
  static create(cradle: {
    aiPlatformAdminUseCases: AIPlatformAdminUseCases;
    aiExecutionUseCases: AIExecutionOrchestrator;
    aiWorkflowUseCases: AIWorkflowUseCases;
    aiEvaluationUseCases: AIEvaluationUseCases;
    aiKnowledgeUseCases: AIKnowledgeUseCases;
    authEvaluatorService: AuthorizationEvaluatorService;
  }): Router {
    const router = Router();
    const permissionFor = (method: string, path: string): string | null => {
      if (method === 'GET')
        return /^\/executions\/[^/]+\/reconciliation$/.test(path)
          ? 'admin:ai:cost:manage'
          : 'admin:ai:view';
      if (method === 'PUT' && /^\/[^/]+\/[^/]+$/.test(path)) {
        const resource = path.split('/')[1];
        if (['guardrails', 'platformSettings', 'incidents'].includes(resource))
          return 'admin:ai:safety:manage';
        if (['consumers', 'modelPrices'].includes(resource)) return 'admin:ai:cost:manage';
        if (resource === 'prompts') return 'admin:ai:prompt:author';
        if (['knowledgeIndexes', 'knowledgeSources'].includes(resource))
          return 'admin:ai:index:approve';
        return 'admin:ai:configure';
      }
      if (method !== 'POST') return null;
      if (/^\/configuration\/[^/]+\/[^/]+\/(STAGE|ROLLBACK)$/.test(path)) {
        const resource = path.split('/')[2];
        return ['guardrails', 'platformSettings'].includes(resource)
          ? 'admin:ai:safety:manage'
          : resource === 'consumers'
            ? 'admin:ai:cost:manage'
            : 'admin:ai:configure';
      }
      if (/^\/configuration\/[^/]+\/[^/]+\/APPROVE$/.test(path)) return 'admin:ai:prompt:review';
      if (/^\/configuration\/[^/]+\/[^/]+\/ACTIVATE$/.test(path)) return 'admin:ai:deploy';
      if (/^\/executions\/[^/]+\/reconciliation\/(PROPOSE|APPROVE)$/.test(path))
        return 'admin:ai:cost:manage';
      if (/^\/knowledge-indexes\/[^/]+\/remove$/.test(path)) return 'admin:ai:index:approve';
      if (/^\/async-queue\/jobs\/[^/]+\/(RETRY|CANCEL)$/.test(path))
        return 'admin:ai:queue:operate';
      if (/^\/prompts\/[^/]+\/versions$/.test(path)) return 'admin:ai:prompt:author';
      if (/^\/prompts\/[^/]+\/versions\/[^/]+\/approve$/.test(path))
        return 'admin:ai:prompt:review';
      if (/^\/prompts\/[^/]+\/(deployments|rollback)$/.test(path)) return 'admin:ai:deploy';
      if (/^\/evaluation-runs\/[^/]+\/approve$/.test(path)) return 'admin:ai:prompt:review';
      if (/^\/knowledge-indexes\/[^/]+\/index$/.test(path)) return 'admin:ai:index:approve';
      if (/^\/incidents\/[^/]+\/events$/.test(path)) return 'admin:ai:safety:manage';
      if (
        path === '/playground/execute' ||
        /^\/workflows\/[^/]+\/runs$/.test(path) ||
        /^\/workflow-runs\/[^/]+\/execute$/.test(path) ||
        /^\/evaluations\/[^/]+\/runs$/.test(path) ||
        /^\/evaluation-runs\/[^/]+\/execute$/.test(path)
      )
        return 'admin:ai:execute';
      return null;
    };
    router.use(async (req, res, next) => {
      if (!req.authUserId) {
        res.status(401).json({ error: 'AI_AUTHENTICATED_ACTOR_REQUIRED' });
        return;
      }
      const permission = permissionFor(req.method, req.path);
      if (!permission) {
        res.status(403).json({ error: 'AI_CAPABILITY_UNRECOGNIZED' });
        return;
      }
      try {
        const result = await cradle.authEvaluatorService.evaluatePermission(
          req.authUserId,
          permission,
          {
            ip: req.ip || req.socket?.remoteAddress || undefined,
            requestTime: new Date(),
            userAgent: req.headers['user-agent'],
            correlationId: req.headers['x-correlation-id'],
          },
        );
        if (!result.isGranted) {
          res.status(403).json({ error: 'AI_PERMISSION_DENIED', requiredPermission: permission });
          return;
        }
        res.setHeader('X-Admin-Required-Permission', permission);
        next();
      } catch {
        res.status(403).json({ error: 'AI_PERMISSION_DENIED', requiredPermission: permission });
      }
    });
    const asyncHandler =
      (fn: (req: Request, res: Response) => Promise<void>) =>
      (req: Request, res: Response, next: NextFunction) =>
        Promise.resolve(fn(req, res)).catch(next);
    const actor = (req: Request) => {
      if (!req.authUserId) throw new Error('AI_AUTHENTICATED_ACTOR_REQUIRED');
      return req.authUserId;
    };

    router.get(
      '/overview',
      asyncHandler(async (_req, res) => {
        res.json(await cradle.aiPlatformAdminUseCases.overview());
      }),
    );
    router.get(
      '/provider-statuses',
      asyncHandler(async (_req, res) => {
        res.json({ data: cradle.aiPlatformAdminUseCases.providerStatuses() });
      }),
    );
    router.get(
      '/executions',
      asyncHandler(async (req, res) => {
        res.json(
          await cradle.aiPlatformAdminUseCases.executions(executionFilters.parse(req.query)),
        );
      }),
    );
    router.get(
      '/executions/:publicId',
      asyncHandler(async (req, res) => {
        const value = await cradle.aiPlatformAdminUseCases.execution(req.params.publicId);
        if (!value) {
          res.status(404).json({ error: 'AI_EXECUTION_NOT_FOUND' });
          return;
        }
        res.json(value);
      }),
    );
    router.get(
      '/executions/:publicId/trace',
      asyncHandler(async (req, res) => {
        res.json({
          data: await cradle.aiPlatformAdminUseCases.executionTrace(req.params.publicId),
        });
      }),
    );
    router.get(
      '/async-queue/status',
      asyncHandler(async (_req, res) => {
        res.json(await cradle.aiExecutionUseCases.queueStatus());
      }),
    );
    router.get(
      '/async-queue/jobs',
      asyncHandler(async (req, res) => {
        res.json(await cradle.aiExecutionUseCases.listAsyncJobs(jobFilters.parse(req.query)));
      }),
    );
    router.post(
      '/async-queue/jobs/:publicId/:action',
      asyncHandler(async (req, res) => {
        const body = z
          .object({ confirmed: z.literal(true) })
          .strict()
          .parse(req.body);
        void body;
        res.json(
          await cradle.aiExecutionUseCases.operateAsyncJob(
            req.params.publicId,
            z.enum(['RETRY', 'CANCEL']).parse(req.params.action),
            actor(req),
          ),
        );
      }),
    );
    router.get(
      '/prompts/:key/versions/:version',
      asyncHandler(async (req, res) => {
        const value = await cradle.aiPlatformAdminUseCases.promptVersion(
          keySchema.parse(req.params.key),
          z.coerce.number().int().positive().parse(req.params.version),
        );
        if (!value) {
          res.status(404).json({ error: 'AI_PROMPT_VERSION_NOT_FOUND' });
          return;
        }
        res.json(value);
      }),
    );
    router.get(
      '/capabilities/:key/readiness',
      asyncHandler(async (req, res) => {
        const query = z
          .object({
            dataClassification: z.enum(['PUBLIC', 'INTERNAL', 'CONFIDENTIAL']).default('INTERNAL'),
          })
          .strict()
          .parse(req.query);
        res.json(
          await cradle.aiExecutionUseCases.capabilityReadiness({
            consumerKey: 'admin-ai-playground',
            capabilityKey: keySchema.parse(req.params.key),
            dataClassification: query.dataClassification,
          }),
        );
      }),
    );
    router.get(
      '/workflow-runs/:publicId',
      asyncHandler(async (req, res) => {
        const value = await cradle.aiWorkflowUseCases.find(keySchema.parse(req.params.publicId));
        if (!value) {
          res.status(404).json({ error: 'AI_WORKFLOW_RUN_NOT_FOUND' });
          return;
        }
        res.json(value);
      }),
    );
    router.get(
      '/evaluation-runs/:publicId',
      asyncHandler(async (req, res) => {
        const value = await cradle.aiEvaluationUseCases.find(keySchema.parse(req.params.publicId));
        if (!value) {
          res.status(404).json({ error: 'AI_EVALUATION_RUN_NOT_FOUND' });
          return;
        }
        res.json(value);
      }),
    );
    router.get(
      '/:resource',
      asyncHandler(async (req, res) => {
        const resource = resourceSchema.parse(req.params.resource);
        res.json({
          data: await cradle.aiPlatformAdminUseCases.list(
            resource,
            registryFilters.parse(req.query),
          ),
        });
      }),
    );
    router.get(
      '/:resource/:key',
      asyncHandler(async (req, res) => {
        const resource = resourceSchema.parse(req.params.resource);
        const value = await cradle.aiPlatformAdminUseCases.find(
          resource,
          keySchema.parse(req.params.key),
        );
        if (!value) {
          res.status(404).json({ error: 'AI_RESOURCE_NOT_FOUND' });
          return;
        }
        res.json(value);
      }),
    );
    router.put(
      '/:resource/:key',
      asyncHandler(async (req, res) => {
        const resource = resourceSchema.parse(req.params.resource);
        const key = keySchema.parse(req.params.key);
        const body = safeRecord.parse(req.body);
        res.json(
          await cradle.aiPlatformAdminUseCases.save(resource, { ...body, key } as any, actor(req)),
        );
      }),
    );
    router.post(
      '/prompts/:key/versions',
      asyncHandler(async (req, res) => {
        const body = z
          .object({
            version: z.number().int().positive(),
            template: z.string().min(1).max(100000),
            inputSchema: safeRecord.optional().nullable(),
            outputSchema: safeRecord.optional().nullable(),
            status: z.enum(['DRAFT', 'REVIEW']).default('DRAFT'),
          })
          .parse(req.body);
        res.status(201).json(
          await cradle.aiPlatformAdminUseCases.createPromptVersion({
            ...body,
            promptKey: keySchema.parse(req.params.key),
            createdBy: actor(req),
            approvedBy: null,
          }),
        );
      }),
    );
    router.post(
      '/prompts/:key/versions/:version/approve',
      asyncHandler(async (req, res) => {
        res.json(
          await cradle.aiPlatformAdminUseCases.approvePromptVersion(
            keySchema.parse(req.params.key),
            z.coerce.number().int().positive().parse(req.params.version),
            actor(req),
          ),
        );
      }),
    );
    router.post(
      '/prompts/:key/deployments',
      asyncHandler(async (req, res) => {
        const body = z.object({ version: z.number().int().positive() }).strict().parse(req.body);
        res.json(
          await cradle.aiPlatformAdminUseCases.deployPrompt(
            keySchema.parse(req.params.key),
            body.version,
            actor(req),
          ),
        );
      }),
    );
    router.post(
      '/prompts/:key/rollback',
      asyncHandler(async (req, res) => {
        const body = z.object({ version: z.number().int().positive() }).strict().parse(req.body);
        res.json(
          await cradle.aiPlatformAdminUseCases.rollbackPrompt(
            keySchema.parse(req.params.key),
            body.version,
            actor(req),
          ),
        );
      }),
    );
    router.post(
      '/workflows/:key/runs',
      asyncHandler(async (req, res) => {
        res
          .status(202)
          .json(
            await cradle.aiWorkflowUseCases.start(
              keySchema.parse(req.params.key),
              safeRecord.parse(req.body),
              actor(req),
            ),
          );
      }),
    );
    router.post(
      '/workflow-runs/:publicId/execute',
      asyncHandler(async (req, res) => {
        res.json(
          await cradle.aiWorkflowUseCases.run(
            req.params.publicId,
            safeRecord.parse(req.body),
            actor(req),
          ),
        );
      }),
    );
    router.post(
      '/evaluations/:key/runs',
      asyncHandler(async (req, res) => {
        res.status(202).json(
          await cradle.aiEvaluationUseCases.start(keySchema.parse(req.params.key), {
            ...z
              .object({
                promptVersion: z.number().int().positive().optional(),
                modelKey: keySchema.optional(),
              })
              .parse(req.body),
            requestedBy: actor(req),
          }),
        );
      }),
    );
    router.post(
      '/evaluation-runs/:publicId/execute',
      asyncHandler(async (req, res) => {
        actor(req);
        res.json(await cradle.aiEvaluationUseCases.run(req.params.publicId, actor(req)));
      }),
    );
    router.post(
      '/evaluation-runs/:publicId/approve',
      asyncHandler(async (req, res) => {
        res.json(await cradle.aiEvaluationUseCases.approve(req.params.publicId, actor(req)));
      }),
    );
    router.get(
      '/configuration/:resource/:key/revisions',
      asyncHandler(async (req, res) => {
        const resource = z
          .enum(['guardrails', 'routingPolicies', 'consumers', 'evaluations', 'platformSettings'])
          .parse(req.params.resource);
        res.json(
          await cradle.aiPlatformAdminUseCases.listConfigurationRevisions(resource, req.params.key),
        );
      }),
    );
    router.get(
      '/executions/:publicId/reconciliation',
      asyncHandler(async (req, res) => {
        res.setHeader('Cache-Control', 'no-store');
        res.json(await cradle.aiPlatformAdminUseCases.reconciliationEvidence(req.params.publicId));
      }),
    );
    router.post(
      '/configuration/:resource/:key/:action',
      asyncHandler(async (req, res) => {
        const resource = z
          .enum(['guardrails', 'routingPolicies', 'consumers', 'evaluations', 'platformSettings'])
          .parse(req.params.resource);
        const action = z
          .enum(['STAGE', 'APPROVE', 'ACTIVATE', 'ROLLBACK'])
          .parse(req.params.action);
        const body = z
          .object({
            configuration: z.record(z.string(), z.unknown()).optional(),
            revisionKey: z.string().max(200).optional(),
            expectedUpdatedAt: z.string().datetime().optional(),
            reason: z.string().min(3).max(1000),
            incidentReference: z.string().max(200).optional(),
          })
          .strict()
          .parse(req.body);
        if (body.incidentReference) {
          const approved = await cradle.authEvaluatorService.evaluatePermission(
            actor(req),
            'admin:ai:break-glass',
          );
          if (!approved.isGranted) {
            res.status(403).json({ error: 'AI_BREAK_GLASS_PERMISSION_REQUIRED' });
            return;
          }
        }
        res.json(
          await cradle.aiPlatformAdminUseCases.governConfiguration(
            resource,
            keySchema.parse(req.params.key),
            action,
            body,
            actor(req),
          ),
        );
      }),
    );
    router.post(
      '/executions/:publicId/reconciliation/:action',
      asyncHandler(async (req, res) => {
        const action = z.enum(['PROPOSE', 'APPROVE']).parse(req.params.action);
        const body = z
          .object({
            tokens: z.number().int().nonnegative(),
            cost: z.number().finite().nonnegative(),
            currency: z.string().regex(/^[A-Z]{3}$/),
            reference: z.string().min(1).max(500),
            reason: z.string().min(3).max(1000),
            expectedUpdatedAt: z.string().datetime(),
          })
          .strict()
          .parse(req.body);
        const { expectedUpdatedAt, ...evidence } = body;
        res.json(
          await cradle.aiPlatformAdminUseCases.reconcileReservation(
            req.params.publicId,
            action,
            evidence,
            actor(req),
            expectedUpdatedAt,
          ),
        );
      }),
    );
    router.get(
      '/knowledge-indexes/:key/source',
      asyncHandler(async (req, res) => {
        const query = z
          .object({
            sourceType: keySchema,
            sourceReferenceId: z.string().min(1).max(500),
            locale: z.enum(['ar', 'en']).optional(),
          })
          .parse(req.query);
        res.setHeader('Cache-Control', 'no-store');
        res.json(
          await cradle.aiKnowledgeUseCases.readSource(
            req.params.key,
            query.sourceType,
            query.sourceReferenceId,
            actor(req),
            query.locale,
          ),
        );
      }),
    );
    router.post(
      '/knowledge-indexes/:key/remove',
      asyncHandler(async (req, res) => {
        const body = z
          .object({ sourceType: keySchema, sourceReferenceId: z.string().min(1).max(500) })
          .strict()
          .parse(req.body);
        await cradle.aiKnowledgeUseCases.removeSource(
          req.params.key,
          body.sourceType,
          body.sourceReferenceId,
          actor(req),
        );
        res.status(204).end();
      }),
    );
    router.post(
      '/knowledge-indexes/:key/index',
      asyncHandler(async (req, res) => {
        const body = z
          .object({
            sourceType: keySchema,
            sourceReferenceId: z.string().min(1).max(500),
            sourceVersion: z.string().max(200).optional(),
            locale: z.string().max(20).optional(),
          })
          .parse(req.body);
        res.status(202).json(
          await cradle.aiKnowledgeUseCases.index({
            indexKey: keySchema.parse(req.params.key),
            ...body,
            actorReferenceId: actor(req),
          }),
        );
      }),
    );
    router.post(
      '/incidents/:publicId/events',
      asyncHandler(async (req, res) => {
        const body = z
          .object({ action: z.string().min(1), note: z.string().max(4000).optional() })
          .parse(req.body);
        res.json(
          await cradle.aiPlatformAdminUseCases.appendIncidentEvent(
            req.params.publicId,
            body.action,
            actor(req),
            body.note,
            z.string().min(1).max(200).parse(req.get('Idempotency-Key')),
          ),
        );
      }),
    );
    router.post(
      '/playground/execute',
      asyncHandler(async (req, res) => {
        const body = z
          .object({
            capabilityKey: keySchema,
            input: z.string().min(1).max(20000),
            locale: z.enum(['ar', 'en']).default('ar'),
            dataClassification: z.enum(['PUBLIC', 'INTERNAL', 'CONFIDENTIAL']).default('INTERNAL'),
            idempotencyKey: z.string().min(1).max(200).optional(),
          })
          .parse(req.body);
        res.json(
          await cradle.aiExecutionUseCases.executeCapability({
            ...body,
            idempotencyKey: req.header('Idempotency-Key') ?? body.idempotencyKey,
            consumerKey: 'admin-ai-playground',
            requesterReferenceId: actor(req),
            sourceDomain: 'AdminAIPlayground',
          }),
        );
      }),
    );
    return router;
  }
}
