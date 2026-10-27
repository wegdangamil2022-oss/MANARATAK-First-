import express from 'express';
import request from 'supertest';
import { describe, it, expect, vi } from 'vitest';
import { ServiceAdminRouter } from '../../../../src/presentation/api/router/ServiceAdminRouter';
import { createManagedApplicationEvidenceRouter } from '../../../../src/presentation/api/router/ManagedApplicationEvidenceRouter';

const privateRow = {
  id: 'request',
  publicId: 'SVC-101',
  serviceId: 'service',
  status: 'REQUESTED',
  version: 3,
  studentReferenceId: 'private-student',
  providerReferenceId: 'private-provider',
  assignedStaffId: 'actor',
  requestParameters: { passport: 'private-passport' },
  fulfillmentMetadata: { note: 'private-note' },
  dueAt: '2026-10-30T00:00:00Z',
  createdAt: '2026-10-28T00:00:00Z',
  updatedAt: '2026-10-28T00:00:00Z',
};
function fixture(permissions: string[]) {
  const fulfillment = {
    listRequests: vi
      .fn()
      .mockResolvedValue({ data: [privateRow], total: 1, page: 1, totalPages: 1 }),
    getRequest: vi.fn().mockResolvedValue(privateRow),
  };
  const operations = { listOperations: vi.fn().mockResolvedValue({ data: [], total: 0 }) };
  const evaluator = {
    evaluatePermission: vi.fn(async (_id: string, permission: string) => ({
      isGranted: permissions.includes(permission),
    })),
  };
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.authUserId = 'actor';
    next();
  });
  app.use(
    '/services',
    ServiceAdminRouter.create({
      adminServiceCatalogUseCases: {} as any,
      adminServiceFulfillmentUseCases: fulfillment as any,
      serviceOperationsUseCases: operations as any,
      authEvaluatorService: evaluator as any,
    }),
  );
  return { app, fulfillment, operations };
}
describe('Services workspace role and data boundaries', () => {
  it.each([
    {method:'get',path:'/REQUESTS/00000000-0000-4000-8000-000000000001/APPLICATION-EVIDENCE/ASSETS/'},
    {method:'post',path:'/requests/00000000-0000-4000-8000-000000000001/application-evidence'},
  ])('retains the management gate on matched evidence routes: $method', async ({method,path}) => {
    const findRequestById = vi.fn();
    const app = express();
    app.use((req:any,_res,next)=>{req.authUserId='actor';next();});
    app.use(createManagedApplicationEvidenceRouter({} as any, {
      evaluatePermission: vi.fn(async (_actor,permission)=>({isGranted:permission!=='admin:services:manage'})) as any,
    }, {findRequestById} as any));
    const response = method==='get' ? await request(app).get(path) : await request(app).post(path);
    expect(response.status).toBe(403);
    expect(findRequestById).not.toHaveBeenCalled();
  });
  it('returns an allowlisted, scoped summary to request viewers without PII access', async () => {
    const f = fixture(['admin:services:requests:view']);
    const response = await request(f.app).get('/services/requests');
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body.data[0]).toEqual({
      id: 'request',
      publicId: 'SVC-101',
      serviceId: 'service',
      status: 'REQUESTED',
      version: 3,
      dueAt: privateRow.dueAt,
      createdAt: privateRow.createdAt,
      updatedAt: privateRow.updatedAt,
    });
    expect(JSON.stringify(response.body)).not.toContain('private-');
    expect(f.fulfillment.listRequests).toHaveBeenCalledWith(
      expect.objectContaining({ assignedStaffId: 'actor' }),
    );
  });
  it.each([
    'search=private-student',
    'studentReferenceId=private-student',
    'providerReferenceId=private-provider',
  ])('denies identity-derived filter oracles: %s', async (query) => {
    const f = fixture(['admin:services:requests:view']);
    expect((await request(f.app).get('/services/requests?' + query)).status).toBe(403);
    expect(f.fulfillment.listRequests).not.toHaveBeenCalled();
  });
  it('keeps full request detail protected by case-data permission', async () => {
    const f = fixture(['admin:services:requests:view']);
    expect((await request(f.app).get('/services/requests/SVC-101')).status).toBe(403);
    expect(f.fulfillment.getRequest).not.toHaveBeenCalled();
  });
  it('preserves the PII reader contract and actor scope', async () => {
    const f = fixture(['admin:services:requests:view', 'admin:services:requests:pii']);
    const response = await request(f.app).get('/services/requests');
    expect(response.status).toBe(200);
    expect(response.body.data[0].studentReferenceId).toBe('private-student');
    expect(f.fulfillment.listRequests).toHaveBeenCalledWith(
      expect.objectContaining({ assignedStaffId: 'actor' }),
    );
  });
  it.each(['/services/REQUESTS/SVC-101', '/services/requests/SVC-101/'])('keeps PII checks on Express route aliases: %s', async (path) => {
    const f = fixture(['admin:services:manage', 'admin:services:requests:view']);
    expect((await request(f.app).get(path)).status).toBe(403);
    expect(f.fulfillment.getRequest).not.toHaveBeenCalled();
  });
  it('forces mine to the authenticated actor even for all-cases staff', async () => {
    const f = fixture(['admin:services:requests:view', 'admin:services:requests:all']);
    expect((await request(f.app).get('/services/requests?mine=true')).status).toBe(200);
    expect(f.fulfillment.listRequests.mock.calls[0][0]).toMatchObject({ assignedStaffId: 'actor' });
    expect(f.fulfillment.listRequests.mock.calls[0][0]).not.toHaveProperty('mine');
  });
  it('allows an operations-only reader without granting catalog access', async () => {
    const f = fixture(['admin:services:operations:manage']);
    expect((await request(f.app).get('/services/operations/providers')).status).toBe(200);
    expect((await request(f.app).get('/services')).status).toBe(403);
    expect(f.operations.listOperations).toHaveBeenCalledWith('providers', 1, 'actor');
  });
  it('keeps sensitive operation registers behind case-data permission', async () => {
    const f = fixture(['admin:services:operations:manage']);
    expect((await request(f.app).get('/services/operations/bookings')).status).toBe(403);
    expect(f.operations.listOperations).not.toHaveBeenCalled();
  });
  it('passes a bounded search to the scoped operations owner', async () => {
    const f = fixture(['admin:services:operations:manage']);
    const response = await request(f.app).get('/services/operations/providers?search=Consultation&page=2');
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(f.operations.listOperations).toHaveBeenCalledWith('providers',2,'actor','Consultation');
  });
  it('does not allow a search to bypass the PII gate for bookings', async () => {
    const f = fixture(['admin:services:operations:manage']);
    expect((await request(f.app).get('/services/operations/bookings?search=private')).status).toBe(403);
    expect(f.operations.listOperations).not.toHaveBeenCalled();
  });
});
