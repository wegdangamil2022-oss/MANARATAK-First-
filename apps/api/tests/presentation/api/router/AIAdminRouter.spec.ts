import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { AIAdminRouter } from '../../../../src/presentation/api/router/AIAdminRouter';

const createUseCases = () => ({
  aiPlatformAdminUseCases: {
    overview: vi.fn().mockResolvedValue({ enabled: true }),
    approvePromptVersion: vi.fn().mockResolvedValue({ status: 'APPROVED' }),
    save: vi.fn(),
  },
  aiExecutionUseCases: { operateAsyncJob: vi.fn() },
  aiWorkflowUseCases: {},
  aiEvaluationUseCases: {},
  aiKnowledgeUseCases: {},
});

function appFor(permissions: string[], authenticated = true) {
  const deps = createUseCases();
  const evaluatePermission = vi.fn().mockImplementation(async (_actor, permission) => ({
    isGranted: permissions.includes(permission),
  }));
  const app = express();
  app.use(express.json());
  if (authenticated)
    app.use((req, _res, next) => {
      req.authUserId = 'ai-editor';
      next();
    });
  app.use(
    '/admin/ai',
    AIAdminRouter.create({
      ...deps,
      authEvaluatorService: { evaluatePermission },
    } as any),
  );
  return { app, deps, evaluatePermission };
}

describe('P17 AI Admin per-operation authorization', () => {
  it('permits view-only dashboards but not guardrail or monetary mutations', async () => {
    const { app, deps } = appFor(['admin:ai:view']);
    const overview = await request(app).get('/admin/ai/overview');
    expect(overview.status).toBe(200);
    expect(overview.header['x-admin-required-permission']).toBe('admin:ai:view');
    expect(
      (await request(app).put('/admin/ai/guardrails/rule-1').send({ key: 'rule-1' })).status,
    ).toBe(403);
    expect(
      (await request(app).put('/admin/ai/consumers/consumer-1').send({ key: 'consumer-1' })).status,
    ).toBe(403);
    expect(deps.aiPlatformAdminUseCases.save).not.toHaveBeenCalled();
  });

  it('denies prompt self-escalation at the route permission boundary', async () => {
    const { app, deps } = appFor(['admin:ai:prompt:author']);
    const result = await request(app)
      .post('/admin/ai/prompts/prompt-1/versions/3/approve')
      .send({});
    expect(result.status).toBe(403);
    expect(result.body.requiredPermission).toBe('admin:ai:prompt:review');
    expect(deps.aiPlatformAdminUseCases.approvePromptVersion).not.toHaveBeenCalled();
  });

  it('requires an independently granted reviewer permission', async () => {
    const { app, deps } = appFor(['admin:ai:prompt:review']);
    const response = await request(app)
      .post('/admin/ai/prompts/prompt-1/versions/3/approve')
      .send({});
    expect(response.status).toBe(200);
    expect(deps.aiPlatformAdminUseCases.approvePromptVersion).toHaveBeenCalledWith(
      'prompt-1',
      3,
      'ai-editor',
    );
  });

  it('rejects absent auth and unknown mutations before reaching use cases', async () => {
    const { app } = appFor(['admin:ai:configure'], false);
    expect((await request(app).get('/admin/ai/overview')).status).toBe(401);
    const auth = appFor(['admin:ai:configure']);
    expect((await request(auth.app).delete('/admin/ai/models/some-model')).status).toBe(403);
  });
});

describe('P17 privileged operations reject legacy blanket permission', () => {
  it.each([
    ['/configuration/guardrails/rule/STAGE', 'admin:ai:safety:manage'],
    ['/configuration/routingPolicies/route/STAGE', 'admin:ai:configure'],
    ['/configuration/consumers/consumer/STAGE', 'admin:ai:cost:manage'],
    ['/configuration/evaluations/evaluation/ROLLBACK', 'admin:ai:configure'],
    ['/configuration/guardrails/rule/APPROVE', 'admin:ai:prompt:review'],
    ['/configuration/guardrails/rule/ACTIVATE', 'admin:ai:deploy'],
    ['/executions/run/reconciliation/PROPOSE', 'admin:ai:cost:manage'],
    ['/executions/run/reconciliation/APPROVE', 'admin:ai:cost:manage'],
    ['/knowledge-indexes/index/remove', 'admin:ai:index:approve'],
    ['/knowledge-indexes/index/index', 'admin:ai:index:approve'],
    ['/async-queue/jobs/job/RETRY', 'admin:ai:queue:operate'],
    ['/async-queue/jobs/job/CANCEL', 'admin:ai:queue:operate'],
    ['/incidents/incident/events', 'admin:ai:safety:manage'],
    ['/prompts/prompt/deployments', 'admin:ai:deploy'],
    ['/prompts/prompt/rollback', 'admin:ai:deploy'],
    ['/workflows/workflow/runs', 'admin:ai:execute'],
    ['/workflow-runs/run/execute', 'admin:ai:execute'],
    ['/evaluations/evaluation/runs', 'admin:ai:execute'],
    ['/evaluation-runs/run/execute', 'admin:ai:execute'],
    ['/playground/execute', 'admin:ai:execute'],
  ])('denies %s without explicit %s', async (path, permission) => {
    const { app } = appFor(['admin:ai:view', 'admin:ai:manage']);
    const response = await request(app)
      .post('/admin/ai' + path)
      .send({});
    expect(response.status).toBe(403);
    expect(response.body.requiredPermission).toBe(permission);
  });
  it('withholds reconciliation evidence from readers', async () => {
    const { app } = appFor(['admin:ai:view']);
    expect((await request(app).get('/admin/ai/executions/run/reconciliation')).status).toBe(403);
  });
});
