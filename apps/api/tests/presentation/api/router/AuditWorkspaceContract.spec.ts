import express from 'express';
import request from 'supertest';
import { describe, it, expect, vi } from 'vitest';
import { AuditWorkspaceRouter } from '../../../../src/presentation/api/router/AuditWorkspaceRouter';
function setup(allowed = true) {
  const operations = {
      list: vi.fn(async () => ({ items: [], nextCursor: null })),
      get: vi.fn(),
      createCase: vi.fn(),
      updateCase: vi.fn(),
      saveRule: vi.fn(),
      retention: vi.fn(),
    },
    evaluator = {
      evaluatePermission: vi.fn(async (_actor: string, permission: string) => ({
        isGranted: allowed && permission === 'admin:audit:cases:view',
      })),
    },
    app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.authUserId = 'viewer';
    next();
  });
  app.use(
    '/admin/audit/workspace',
    AuditWorkspaceRouter.create({
      auditWorkspaceUseCases: operations as any,
      authEvaluatorService: evaluator as any,
    }),
  );
  return { app, operations, evaluator };
}
describe('audit workspace independent HTTP permissions and strict commands (injected principal)', () => {
  it('denies case data without the independent view permission', async () => {
    const s = setup(false);
    const res = await request(s.app).get('/admin/audit/workspace/cases');
    expect(res.status).toBe(403);
    expect(s.operations.list).not.toHaveBeenCalled();
  });
  it('permits bounded reads while prohibiting a viewer from creating cases', async () => {
    const s = setup();
    expect((await request(s.app).get('/admin/audit/workspace/cases?limit=25')).status).toBe(200);
    expect(s.operations.list).toHaveBeenCalledWith('CASE', 25, undefined);
    expect(
      (
        await request(s.app)
          .post('/admin/audit/workspace/cases')
          .send({ id: 'case', title: 'Review', references: [] })
      ).status,
    ).toBe(403);
    expect(s.operations.createCase).not.toHaveBeenCalled();
  });
  it('cannot bypass case management by writing a note through the detail URL', async () => {
    const s = setup();
    const res = await request(s.app)
      .patch('/admin/audit/workspace/cases/case1')
      .send({ expectedVersion: 1, note: { id: 'n1', text: 'Unauthorized' } });
    expect(res.status).toBe(403);
    expect(s.operations.updateCase).not.toHaveBeenCalled();
  });
  it('rejects overlarge pagination before owner reads', async () => {
    const s = setup();
    expect((await request(s.app).get('/admin/audit/workspace/cases?limit=101')).status).toBe(400);
    expect(s.operations.list).not.toHaveBeenCalled();
  });
  it('does not accept metadata/author spoofing through the case command', async () => {
    const s = setup();
    s.evaluator.evaluatePermission.mockResolvedValue({ isGranted: true });
    const res = await request(s.app)
      .post('/admin/audit/workspace/cases')
      .send({ id: 'case', title: 'Review', references: [], ownerId: 'spoofed' });
    expect(res.status).toBe(400);
    expect(s.operations.createCase).not.toHaveBeenCalled();
  });
  it('binds the case creator to the authenticated principal', async () => {
    const s = setup();
    s.evaluator.evaluatePermission.mockResolvedValue({ isGranted: true });
    s.operations.createCase.mockResolvedValue({ id: 'case' } as any);
    const res = await request(s.app)
      .post('/admin/audit/workspace/cases')
      .send({ id: 'case', title: 'Review', references: ['AUD-1'] });
    expect(res.status).toBe(201);
    expect(s.operations.createCase.mock.calls[0][1]).toMatchObject({
      actorId: 'viewer',
      source: 'admin-audit-workspace',
    });
  });
  it('checks both alert and notification creation permission', async () => {
    const s = setup();
    s.evaluator.evaluatePermission.mockImplementation(async (_actor, permission) => ({
      isGranted: permission === 'admin:audit:alerts:manage',
    }));
    const res = await request(s.app).put('/admin/audit/workspace/alerts/rule1').send({});
    expect(res.status).toBe(403);
    expect(s.operations.saveRule).not.toHaveBeenCalled();
    expect(s.evaluator.evaluatePermission.mock.calls.map((call) => call[1])).toContain(
      'admin:notifications:intents:create',
    );
  });
  it('maps version conflict to a sanitized 409 without raw note payload', async () => {
    const s = setup();
    s.evaluator.evaluatePermission.mockResolvedValue({ isGranted: true });
    s.operations.updateCase.mockRejectedValue(new Error('AUDIT_WORKSPACE_VERSION_CONFLICT'));
    const res = await request(s.app)
      .patch('/admin/audit/workspace/cases/case1')
      .send({ expectedVersion: 1, status: 'CLOSED' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('AUDIT_WORKSPACE_VERSION_CONFLICT');
  });
});
