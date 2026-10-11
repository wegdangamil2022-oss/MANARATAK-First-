import { describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { StudentToolsAdminRouter } from '../../../../src/presentation/api/router/StudentToolsAdminRouter.js';
function appFor(grants: string[]) {
  const evaluator = {
    evaluatePermission: vi
      .fn()
      .mockImplementation((_actor, permission) =>
        Promise.resolve({ isGranted: grants.includes(permission) }),
      ),
  };
  const useCases = {
    listAdminPage: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 25 }),
    findTool: vi.fn().mockResolvedValue(null),
    update: vi.fn(),
    updateVersionedConfiguration: vi.fn(),
    release: vi.fn(),
    transition: vi.fn(),
    eligibility: vi.fn().mockResolvedValue({ status: 'WOULD_ALLOW' }),
    executions: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    auditPage: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  };
  const execution = { execute: vi.fn().mockResolvedValue({ status: 'COMPLETED' }) };
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.authUserId = 'actor';
    next();
  });
  app.use(
    '/tools',
    StudentToolsAdminRouter.create({
      authEvaluatorService: evaluator as any,
      studentToolRegistryUseCases: useCases as any,
      studentToolExecutionUseCases: execution as any,
    }),
  );
  return { app, evaluator, useCases, execution };
}
describe('Section 19 route permission matrix', () => {
  const routes = [
    ['get', '/', 'view', undefined],
    ['get', '/gpa/executions', 'view-executions', undefined],
    ['get', '/gpa/audit', 'view-executions', undefined],
    [
      'patch',
      '/gpa/metadata',
      'edit-metadata',
      { nameEn: 'GPA', expectedRevision: 1, reason: 'review metadata' },
    ],
    [
      'patch',
      '/gpa/flags',
      'manage-availability',
      {
        globallyEnabled: true,
        anonymousEnabled: true,
        authenticatedEnabled: true,
        maintenanceMode: false,
        semanticVersion: '1.0.1',
        changeNote: 'review',
        expectedRevision: 1,
      },
    ],
    ['post', '/gpa/release/APPROVE', 'approve-release', { expectedRevision: 1, reason: 'approve' }],
    ['post', '/gpa/test', 'run-test', { input: {}, locale: 'en' }],
  ] as const;
  for (const [method, path, suffix, body] of routes) {
    it(`requires ${suffix} for ${method} ${path}`, async () => {
      const { app, evaluator } = appFor([`admin:student-tools:${suffix}`]);
      const call = request(app)[method](`/tools${path}`).set('Idempotency-Key', 'test-key-123');
      if (body) call.send(body);
      const result = await call;
      expect(result.status).toBe(200);
      expect(evaluator.evaluatePermission).toHaveBeenCalledWith(
        'actor',
        `admin:student-tools:${suffix}`,
        expect.any(Object),
      );
    });
    it(`denies retired coarse permission for ${method} ${path}`, async () => {
      const { app } = appFor(['admin:student-tools:manage']);
      const call = request(app)[method](`/tools${path}`);
      if (body) call.send(body);
      expect((await call).status).toBe(403);
    });
  }
  it('rejects visibility and implementation status via generic metadata', async () => {
    const { app, useCases } = appFor(['admin:student-tools:edit-metadata']);
    for (const field of ['visibility', 'implementationStatus'])
      expect(
        (
          await request(app)
            .patch('/tools/gpa/metadata')
            .send({ expectedRevision: 1, [field]: 'ACTIVE' })
        ).status,
      ).toBe(400);
    expect(useCases.update).not.toHaveBeenCalled();
  });
  it('rejects forged student identifiers in no-side-effect eligibility simulation', async () => {
    const { app, execution } = appFor(['admin:student-tools:manage-availability']);
    const response = await request(app)
      .post('/tools/gpa/eligibility')
      .send({ consumerType: 'AUTHENTICATED_STUDENT', locale: 'en', studentReference: 'victim' });
    expect(response.status).toBe(400);
    expect(execution.execute).not.toHaveBeenCalled();
  });
  it('paginates owner executions beyond the first fixed page', async () => {
    const { app, useCases } = appFor(['admin:student-tools:view-executions']);
    expect((await request(app).get('/tools/gpa/executions?page=5&pageSize=25')).status).toBe(200);
    expect(useCases.executions).toHaveBeenCalledWith('gpa', 5, 25, {});
  });
  it('filters execution traces and rejects unbounded or unknown operator queries', async () => {
    const { app, useCases } = appFor(['admin:student-tools:view-executions']);
    expect(
      (
        await request(app).get(
          '/tools/gpa/executions?status=BLOCKED&isTest=false&correlationId=trace',
        )
      ).status,
    ).toBe(200);
    expect(useCases.executions).toHaveBeenCalledWith('gpa', 1, 25, {
      status: 'BLOCKED',
      isTest: false,
      correlationId: 'trace',
    });
    for (const query of [
      'pageSize=101',
      'isTest=anything',
      'studentReference=victim',
      'status=anything',
    ])
      expect((await request(app).get(`/tools/gpa/executions?${query}`)).status).toBe(400);
  });
  it('requires an explicit audit reason for metadata edits', async () => {
    const { app, useCases } = appFor(['admin:student-tools:edit-metadata']);
    expect(
      (
        await request(app)
          .patch('/tools/gpa/metadata')
          .send({ nameEn: 'new name', expectedRevision: 1 })
      ).status,
    ).toBe(400);
    expect(useCases.update).not.toHaveBeenCalled();
  });
});
