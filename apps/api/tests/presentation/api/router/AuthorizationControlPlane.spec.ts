import { describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { Role, PermissionReference, LifeStatus } from '@manaratak/domain';
import { AuthorizationAdminRouter } from '../../../../src/presentation/api/router/AuthorizationAdminRouter';
const revision = '2026-01-01T00:00:00.000Z';
const role = new Role({
  id: 'custom',
  name: 'Academic reviewer',
  description: 'Academic permissions',
  permissions: [new PermissionReference('admin:universities:manage')],
  policyIds: [],
  revision,
});
function fixture({
  verified = true,
  granted = true,
  writeError,
}: { verified?: boolean; granted?: boolean; writeError?: Error } = {}) {
  const manageRoles = {
    getRole: vi.fn(async () => role),
    getMemberCount: vi.fn(async () => 3),
    page: vi.fn(async () => ({ items: [role], nextCursor: 'custom' })),
    updateRole: vi.fn(async () => {
      if (writeError) throw writeError;
    }),
    retireRole: vi.fn(async () => {}),
    createRole: vi.fn(async () => {}),
  };
  const policies = {
    get: vi.fn(async () => null),
    page: vi.fn(async () => ({ items: [], nextCursor: null })),
    create: vi.fn(async () => {}),
    update: vi.fn(async () => {}),
    retire: vi.fn(async () => {}),
  };
  const evaluator = {
    evaluatePermission: vi.fn(async () => ({
      isGranted: granted,
      reasons: ['Granted by role: Academic reviewer'],
    })),
    describeIdentityAccess: vi.fn(async () => [
      {
        id: 'custom',
        sources: ['ASSIGNMENT'],
        permissions: ['admin:universities:manage'],
        policies: [],
      },
    ]),
  };
  const audit = {
    queryPage: vi.fn(async () => ({ items: [], hasMore: false, nextCursor: null })),
    save: vi.fn(async () => {}),
  };
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.authUserId = 'actor';
    next();
  });
  app.use(
    '/authorization',
    AuthorizationAdminRouter.create({
      principalAccessValidator: { isAuthenticationAllowed: vi.fn(async () => verified) },
      manageRolesUseCase: manageRoles as any,
      managePoliciesUseCase: policies as any,
      assignRoleUseCase: {} as any,
      manageEmergencyAccessUseCase: {} as any,
      getIdentityUseCase: {
        execute: vi.fn(async (id) => ({
          isSuccess: true,
          getValue: () => ({
            id,
            status: LifeStatus.ACTIVE,
            account: { accessState: 'Active' },
            user: { contactRegistry: { isEmailVerified: verified } },
          }),
        })),
      } as any,
      authEvaluatorService: evaluator as any,
      auditRecordRepo: audit as any,
    }),
  );
  return { app, manageRoles, policies, evaluator, audit };
}
const update = {
  name: 'Academic reviewer',
  description: 'Reviewed',
  permissions: ['admin:universities:manage'],
  policyIds: [],
  expectedRevision: revision,
  reason: 'Reviewed safely',
};

describe('authorization control plane contracts', () => {
  it('passes the cursor and search to the owning repository instead of loading every role', async () => {
    const f = fixture();
    const response = await request(f.app).get(
      '/authorization/roles?limit=2&cursor=abc&search=reviewer',
    );
    expect(response.status).toBe(200);
    expect(f.manageRoles.page).toHaveBeenCalledWith({
      limit: 2,
      cursor: 'abc',
      search: 'reviewer',
    });
    expect(response.body.data.nextCursor).toBe('custom');
  });
  it('rejects unbounded pagination and unknown query parameters', async () => {
    const f = fixture();
    expect((await request(f.app).get('/authorization/roles?limit=1000')).status).toBe(400);
    expect((await request(f.app).get('/authorization/roles?includeSecrets=true')).status).toBe(400);
    expect(f.manageRoles.page).not.toHaveBeenCalled();
  });
  it('updates standard custom roles without demanding high-risk approval', async () => {
    const f = fixture();
    const response = await request(f.app).patch('/authorization/roles/custom').send(update);
    expect(response.status).toBe(200);
    expect(f.manageRoles.updateRole).toHaveBeenCalledWith(
      { ...update, id: 'custom' },
      expect.objectContaining({ actorId: 'actor', metadata: { reason: 'Reviewed safely' } }),
    );
  });
  it('does not allow a role update to exceed the actor permissions', async () => {
    const f = fixture({ granted: false });
    const response = await request(f.app).patch('/authorization/roles/custom').send(update);
    expect(response.status).toBe(403);
    expect(f.manageRoles.updateRole).not.toHaveBeenCalled();
  });
  it('requires independent approval when a role is escalated to high risk', async () => {
    const f = fixture();
    const response = await request(f.app)
      .patch('/authorization/roles/custom')
      .send({ ...update, permissions: ['admin:finance:manage'] });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('SECOND_APPROVER_REQUIRED_FOR_HIGH_RISK_AUTHORIZATION_CHANGE');
    expect(f.manageRoles.updateRole).not.toHaveBeenCalled();
  });
  it.each([
    ['ROLE_REVISION_CONFLICT', 409],
    ['SYSTEM_ROLE_PROTECTED', 403],
  ])('maps %s to a canonical failure', async (message, status) => {
    const f = fixture({ writeError: new Error(message) });
    const response = await request(f.app).patch('/authorization/roles/custom').send(update);
    expect(response.status).toBe(status);
    expect(response.body.code).toBe(message);
    expect(response.body.status).toBe(status);
  });
  it('does not expose database details in a server failure', async () => {
    const f = fixture({ writeError: new Error('SQL password=secret connection refused') });
    const response = await request(f.app).patch('/authorization/roles/custom').send(update);
    expect(response.status).toBe(500);
    expect(JSON.stringify(response.body)).not.toContain('password');
  });
  it('evaluates actual access in the request context and explains its role source', async () => {
    const f = fixture();
    const response = await request(f.app).get(
      '/authorization/effective-access/staff?permission=admin%3Auniversities%3Amanage',
    );
    expect(response.status).toBe(200);
    expect(response.body.data.decisions[0].granted).toBe(true);
    expect(response.body.data.roles[0].sources).toEqual(['ASSIGNMENT']);
    expect(f.evaluator.evaluatePermission).toHaveBeenCalledWith(
      'staff',
      'admin:universities:manage',
      expect.objectContaining({ requestTime: expect.any(Date) }),
    );
  });
  it('denies unverified identity access despite a role grant', async () => {
    const f = fixture({ verified: false });
    const response = await request(f.app).get('/authorization/effective-access/staff');
    expect(response.status).toBe(200);
    expect(response.body.data.decisions.every((d: any) => !d.granted)).toBe(true);
    expect(f.evaluator.evaluatePermission).not.toHaveBeenCalled();
  });
  it('rejects spoofed context in effective access queries', async () => {
    const f = fixture();
    const response = await request(f.app).get('/authorization/effective-access/staff?ip=127.0.0.1');
    expect(response.status).toBe(400);
  });
  it('reads the existing audit owner category with its stable cursor', async () => {
    const f = fixture();
    const response = await request(f.app).get(
      `/authorization/assignment-audit?limit=3&cursorId=event-1&cursorTime=${encodeURIComponent(revision)}`,
    );
    expect(response.status).toBe(200);
    expect(f.audit.queryPage).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'AUTHORIZATION_MUTATION',
        limit: 3,
        cursor: { id: 'event-1', timestamp: new Date(revision) },
      }),
    );
  });
  it('rejects missing or self approval before creating a policy', async () => {
    const f = fixture();
    const body = {
      id: 'office',
      name: 'Office',
      description: 'Office policy',
      ruleType: 'TIME',
      configuration: { start: '09:00', end: '17:00' },
      reason: 'Reviewed policy',
    };
    const response = await request(f.app)
      .post('/authorization/policies')
      .set('x-second-approver-id', 'actor')
      .set('x-change-ticket', 'CHANGE-123')
      .send(body);
    expect(response.status).toBe(400);
    expect(f.policies.create).not.toHaveBeenCalled();
    expect(f.audit.save).toHaveBeenCalled();
  });
  it('keeps hard policy deletion unavailable rather than allowing reference loss', async () => {
    const f = fixture();
    expect((await request(f.app).delete('/authorization/policies/office')).status).toBe(404);
  });
});
