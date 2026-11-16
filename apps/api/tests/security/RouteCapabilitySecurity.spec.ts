import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { StudentToolsAdminRouter } from '../../src/presentation/api/router/StudentToolsAdminRouter';
import { StudentToolsPublicRouter } from '../../src/presentation/api/router/StudentToolsPublicRouter';
import { CmsAdminRouter } from '../../src/presentation/api/router/CmsAdminRouter';
import { AIAdminRouter } from '../../src/presentation/api/router/AIAdminRouter';
import { createCourseAccessGuard } from '../../src/presentation/security/CourseAccessGuard';
import { FinanceAdminRouter } from '../../src/presentation/api/router/FinanceAdminRouter';
import { testDiscoveryOwnerRouter } from '../../src/presentation/api/router/TestDiscoveryOwnerRouter';
import { ServiceAdminRouter } from '../../src/presentation/api/router/ServiceAdminRouter';

function appWith(router: express.Router, actor = true) {
  const app = express();
  app.use(express.json());
  if (actor)
    app.use((req, _res, next) => {
      req.authUserId = 'synthetic-admin';
      next();
    });
  app.use('/admin', router);
  return app;
}
const evaluator = (grants: string[]) => ({
  evaluatePermission: vi.fn(async (_actor: string, permission: string) => ({
    isGranted: grants.includes(permission),
  })),
});
const variants = (path: string) => [path, path + '/', path.toUpperCase(), path.toUpperCase() + '/'];

describe('Matched route capabilities cannot be downgraded by URL spelling', () => {
  it.each([
    ['get', '/gpa/executions/run', 'view', 'view-executions'],
    ['head', '/gpa/executions/run', 'view', 'view-executions'],
    ['get', '/workspace/usage', 'view', 'view-executions'],
    ['get', '/workspace/executions', 'view', 'view-executions'],
    ['patch', '/gpa/metadata', 'manage-availability', 'edit-metadata'],
    ['post', '/gpa/release/APPROVE', 'manage-availability', 'approve-release'],
    ['post', '/gpa/release/ACTIVATE', 'manage-availability', 'approve-release'],
    ['post', '/gpa/test', 'manage-availability', 'run-test'],
  ])('%s %s never accepts only %s', async (method, path, weaker, required) => {
    const auth = evaluator([`admin:student-tools:${weaker}`]);
    const useCases = {
      executionDetail: vi.fn(),
      update: vi.fn(),
      release: vi.fn(),
      telemetry: vi.fn(),
      workspaceExecutions: vi.fn(),
    };
    const execution = { execute: vi.fn() };
    const app = appWith(
      StudentToolsAdminRouter.create({
        authEvaluatorService: auth as never,
        studentToolRegistryUseCases: useCases as never,
        studentToolExecutionUseCases: execution as never,
      }),
    );
    for (const variant of variants(path)) {
      const pending = (request(app) as any)[method]('/admin' + variant);
      const res = await (method === 'head' ? pending : pending.send({}));
      // A case-sensitive dynamic section is invalid rather than another route.
      if (path.startsWith('/workspace/') && variant.includes('/WORKSPACE/'))
        expect(res.status).toBe(400);
      else {
        expect(res.status).toBe(403);
        expect(res.headers['x-admin-required-permission']).toBeUndefined();
      }
    }
    expect(
      auth.evaluatePermission.mock.calls.some(
        (call) => call[1] === `admin:student-tools:${required}`,
      ),
    ).toBe(true);
    for (const fn of Object.values(useCases)) expect(fn).not.toHaveBeenCalled();
    expect(execution.execute).not.toHaveBeenCalled();
  });

  it('protects URL-decoded release action parameters', async () => {
    const auth = evaluator(['admin:student-tools:manage-availability']);
    const release = vi.fn();
    const app = appWith(
      StudentToolsAdminRouter.create({
        authEvaluatorService: auth as never,
        studentToolRegistryUseCases: { release } as never,
        studentToolExecutionUseCases: {} as never,
      }),
    );
    await request(app).post('/admin/gpa/release/%41PPROVE').send({}).expect(403);
    expect(release).not.toHaveBeenCalled();
  });

  it.each(['get', 'head'])(
    'CMS operations require their own permission for %s including mixed case',
    async (method) => {
      const listFailedSchedules = vi.fn().mockResolvedValue([]);
      const auth = evaluator(['admin:cms:view']);
      const app = appWith(
        CmsAdminRouter.create({
          adminCmsUseCases: { listFailedSchedules } as never,
          authEvaluatorService: auth as never,
        }),
      );
      for (const path of variants('/operations/failed-schedules'))
        await (request(app) as any)[method]('/admin' + path).expect(403);
      expect(listFailedSchedules).not.toHaveBeenCalled();
      const permitted = appWith(
        CmsAdminRouter.create({
          adminCmsUseCases: { listFailedSchedules } as never,
          authEvaluatorService: evaluator(['admin:cms:operations:run']) as never,
        }),
      );
      await request(permitted).get('/admin/OPERATIONS/FAILED-SCHEDULES/').expect(200);
    },
  );

  it.each(['get', 'head'])(
    'AI reconciliation requires cost permission for %s including mixed case',
    async (method) => {
      const auth = evaluator(['admin:ai:view']);
      const app = appWith(
        AIAdminRouter.create({
          authEvaluatorService: auth as never,
          aiPlatformAdminUseCases: {} as never,
          aiExecutionUseCases: {} as never,
          aiWorkflowUseCases: {} as never,
          aiEvaluationUseCases: {} as never,
          aiKnowledgeUseCases: {} as never,
        }),
      );
      for (const path of variants('/executions/run/reconciliation'))
        await (request(app) as any)[method]('/admin' + path).expect(403);
      expect(
        auth.evaluatePermission.mock.calls.every((call) => call[1] === 'admin:ai:cost:manage'),
      ).toBe(true);
    },
  );

  it('course learner data cannot fall back to ordinary read permission with mixed case or HEAD', async () => {
    const assert = vi.fn(async (_actor: string, _id: string, capability: string) => {
      if (capability !== 'read') throw Error('DENIED');
    });
    const app = appWith(
      express
        .Router()
        .use(createCourseAccessGuard({ globalManager: async () => false, assert } as never))
        .get('/:id/learners', (_req, res) => res.json({ private: 'synthetic' })),
    );
    for (const path of variants('/10000000-0000-4000-8000-000000000001/learners')) {
      await request(app)
        .get('/admin' + path)
        .expect(403);
      await request(app)
        .head('/admin' + path)
        .expect(403);
    }
    expect(assert.mock.calls.every((call) => call[2] === 'learners')).toBe(true);
  });
});

describe('Private student output never enters the transport response store', () => {
  it.each(variants('/gpa/execute'))(
    'keeps %s private and never persists a raw session bearer',
    async (path) => {
      const store = { begin: vi.fn(), complete: vi.fn() };
      const execute = vi
        .fn()
        .mockResolvedValue({ output: { private: 'synthetic-output' }, status: 'COMPLETED' });
      const app = appWith(
        StudentToolsPublicRouter.create({
          apiIdempotencyStore: store as never,
          studentToolRegistryUseCases: {} as never,
          studentToolExecutionUseCases: { execute } as never,
          studentToolAnonymousSessionService: {
            resolve: () => ({ sessionReference: 'opaque-reference', newlyIssued: false }),
          } as never,
        }),
        false,
      );
      const res = await request(app)
        .post('/admin' + path)
        .set('Idempotency-Key', 'private-execute-1')
        .set('x-student-tools-session', 'synthetic-bearer')
        .send({ input: {}, privacyConsent: true });
      expect(res.status).toBe(200);
      expect(execute).toHaveBeenCalledWith(
        path.includes('GPA') ? 'GPA' : 'gpa',
        expect.objectContaining({ anonymousSessionReference: 'opaque-reference' }),
      );
      expect(store.begin).not.toHaveBeenCalled();
      expect(store.complete).not.toHaveBeenCalled();
    },
  );
});

describe('Additional owner boundaries', () => {
  it('applies the same service request privacy permission to GET and HEAD', async () => {
    const getRequest = vi.fn();
    const auth = evaluator(['admin:services:requests:view', 'admin:services:requests:fulfill']);
    const router = ServiceAdminRouter.create({
      serviceOperationsUseCases: {} as never,
      authEvaluatorService: auth as never,
      adminServiceCatalogUseCases: {} as never,
      adminServiceFulfillmentUseCases: { getRequest } as never,
    });
    const app = appWith(router);
    app.use(
      (error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        res
          .status(error.message === 'SERVICE_ACCESS_DENIED' ? 403 : 500)
          .json({ error: error.message });
      },
    );
    for (const path of variants('/requests/request-1')) {
      await request(app)
        .get('/admin' + path)
        .expect(403);
      await request(app)
        .head('/admin' + path)
        .expect(403);
    }
    expect(
      auth.evaluatePermission.mock.calls.some((call) => call[1] === 'admin:services:requests:pii'),
    ).toBe(true);
    expect(getRequest).not.toHaveBeenCalled();
  });
  it('requires reviewer permission to revoke discovery links, including case variants', async () => {
    const review = vi.fn().mockResolvedValue({ status: 'REVOKED' });
    const router = express.Router().use(
      '/:ownerKey/test-discovery',
      testDiscoveryOwnerRouter({ review } as never, evaluator(['propose']) as never, {
        view: 'view',
        propose: 'propose',
        review: 'review',
      }),
    );
    for (const path of variants('/owner/test-discovery/test/revoke'))
      await request(appWith(router))
        .post('/admin' + path)
        .send({ expectedVersion: 1, reason: 'synthetic review' })
        .expect(403);
    expect(review).not.toHaveBeenCalled();
    const allowed = express.Router().use(
      '/:ownerKey/test-discovery',
      testDiscoveryOwnerRouter({ review } as never, evaluator(['review']) as never, {
        view: 'view',
        propose: 'propose',
        review: 'review',
      }),
    );
    await request(appWith(allowed))
      .post('/admin/owner/test-discovery/test/REVOKE/')
      .send({ expectedVersion: 1, reason: 'synthetic review' })
      .expect(200);
  });
  it('requires the finance version precondition for every accepted FX activation spelling', async () => {
    const activateManualExchangeRate = vi.fn().mockResolvedValue({ status: 'ACTIVE' });
    const app = appWith(
      FinanceAdminRouter.create({
        financeAdminUseCases: {} as never,
        financePlatformUseCases: { activateManualExchangeRate } as never,
        authEvaluatorService: { evaluatePermission: async () => ({ isGranted: true }) } as never,
      }),
    );
    for (const path of variants('/exchange-rates/rate-1/activate')) {
      await request(app)
        .post('/admin' + path)
        .set('Idempotency-Key', 'synthetic-fx-key')
        .send({ approvalId: 'approval-1' })
        .expect(409);
    }
    expect(activateManualExchangeRate).not.toHaveBeenCalled();
    await request(app)
      .post('/admin/EXCHANGE-RATES/rate-1/ACTIVATE/')
      .set('Idempotency-Key', 'synthetic-fx-key')
      .send({ approvalId: 'approval-1', expectedVersion: 1 })
      .expect(200);
    expect(activateManualExchangeRate).toHaveBeenCalledWith(
      'rate-1',
      'approval-1',
      expect.objectContaining({ expectedVersion: 1 }),
    );
  });
});
