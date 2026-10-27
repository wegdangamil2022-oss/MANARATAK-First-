import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { StudentToolsAdminRouter } from '../../../../src/presentation/api/router/StudentToolsAdminRouter';

function fixture(grants = ['admin:student-tools:view']) {
  const queries = {
    workspace: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 25 }),
    workspaceExecutions: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    telemetry: vi.fn().mockResolvedValue({}),
    versions: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    executionDetail: vi.fn().mockResolvedValue(null),
    updateVersionedConfiguration: vi.fn().mockResolvedValue({ toolKey: 'gpa-calculator' }),
  };
  const app = express(); app.use(express.json());
  app.use((req, _res, next) => { req.authUserId = 'operator'; next(); });
  app.use('/tools', StudentToolsAdminRouter.create({
    authEvaluatorService: { evaluatePermission: vi.fn(async (_actor, permission) => ({ isGranted: grants.includes(permission) })) } as never,
    studentToolRegistryUseCases: queries as never, studentToolExecutionUseCases: {} as never,
  }));
  return { app, queries };
}
describe('student tools workspace contracts', () => {
  it.each(['releases', 'quality'])('serves the %s read model before tool-key routes', async section => {
    const { app, queries } = fixture();
    expect((await request(app).get(`/tools/workspace/${section}?page=2`)).status).toBe(200);
    expect(queries.workspace).toHaveBeenCalledWith(section, { page: 2, pageSize: 25 });
  });
  it.each(['usage', 'executions'])('protects global %s with execution permission', async section => {
    const { app, queries } = fixture();
    expect((await request(app).get(`/tools/workspace/${section}`)).status).toBe(403);
    expect(queries.telemetry).not.toHaveBeenCalled();
    expect(queries.workspaceExecutions).not.toHaveBeenCalled();
  });
  it('validates global execution filters and pages', async () => {
    const { app, queries } = fixture(['admin:student-tools:view-executions']);
    expect((await request(app).get('/tools/workspace/executions?isTest=false&status=FAILED&page=3')).status).toBe(200);
    expect(queries.workspaceExecutions).toHaveBeenCalledWith({ page: 3, pageSize: 25, isTest: false, status: 'FAILED' });
    expect((await request(app).get('/tools/workspace/executions?studentReference=private')).status).toBe(400);
  });
  it('uses one versioned transaction for availability, flags and limits', async () => {
    const { app, queries } = fixture(['admin:student-tools:manage-availability']);
    const availability = { publicEnabled: true, anonymousEnabled: false, authenticatedEnabled: true, adminOnly: false, allowedLocales: ['ar'], allowedRegions: [], maintenanceMode: false };
    const featureFlags = { globallyEnabled: true, anonymousEnabled: false, authenticatedEnabled: true, maintenanceMode: false };
    const version = { expectedRevision: 4, semanticVersion: '1.2.0', changeNote: 'Restrict to authenticated students' };
    expect((await request(app).patch('/tools/gpa-calculator/access-policy').send({ availability, featureFlags, ...version })).status).toBe(200);
    expect(queries.updateVersionedConfiguration).toHaveBeenCalledWith('gpa-calculator', { availability, featureFlags }, version, 'operator');
    expect((await request(app).patch('/tools/gpa-calculator/access-policy').send({ availability: { ...availability, allowedRegions: ['YE'] }, featureFlags, ...version })).status).toBe(400);
  });
});
