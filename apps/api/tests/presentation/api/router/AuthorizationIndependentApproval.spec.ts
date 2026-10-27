import express from 'express';
import request from 'supertest';
import { describe, it, expect, vi } from 'vitest';
import { Role, PermissionReference } from '@manaratak/domain';
import { GovernanceApprovalUseCases, governanceApprovalDigest } from '@manaratak/application';
import { AuthorizationAdminRouter } from '../../../../src/presentation/api/router/AuthorizationAdminRouter';
const revision = '2026-10-28T00:00:00.000Z';
const body = { id: 'assignment', identityId: 'employee', roleId: 'finance-role' };
function setup({
  approved = true,
  used = false,
  source = 'ASSIGNMENT',
  sourcePolicies = [] as Array<{ id: string; missing: boolean }>,
  targetPolicies = [] as string[],
} = {}) {
  let currentRole = new Role({
    id: 'finance-role',
    name: 'Finance',
    description: 'Finance access',
    revision,
    permissions: [new PermissionReference('admin:finance:manage')],
    policyIds: targetPolicies,
  });
  let envelope: any = null;
  const tx = { boundaryId: 'same-mutation' };
  const consume = vi.fn(async () => {}),
    requestApproval = vi.fn();
  const gateway = {
    get: vi.fn(async () => envelope),
    consume,
    create: requestApproval,
    list: vi.fn(),
    approve: vi.fn(),
  };
  const approvals = new GovernanceApprovalUseCases(
    gateway as any,
    { execute: async (_definition: any, work: any) => work(tx) } as any,
  );
  const assignments = {
    getAssignment: vi.fn(),
    execute: vi.fn(async (input: any, context: any) => {
      await context.assertInTransaction(tx);
      return { assignmentId: input.id, replayed: false };
    }),
  };
  const evaluator = {
    evaluatePermission: vi.fn(async () => ({ isGranted: true })),
    describeIdentityAccess: vi.fn(async () => [
      {
        id: 'source',
        missing: false,
        sources: [source],
        permissions: ['admin:*'],
        policies: sourcePolicies,
      },
    ]),
  };
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.authUserId = 'maker';
    next();
  });
  app.use(
    '/admin/authorization',
    AuthorizationAdminRouter.create({
      manageRolesUseCase: { getRole: async () => currentRole } as any,
      assignRoleUseCase: assignments as any,
      manageEmergencyAccessUseCase: {} as any,
      managePoliciesUseCase: {
        get: async (id: string) => ({ id, revision, ruleType: 'TIME', ruleConfiguration: '{}' }),
      } as any,
      getIdentityUseCase: {
        execute: async () => ({
          isSuccess: true,
          getValue: () => ({
            status: 'ACTIVE',
            technicalMetadata: { version: 1 },
            account: { accessState: 'Active' },
            user: { contactRegistry: { isEmailVerified: true } },
          }),
        }),
      } as any,
      authEvaluatorService: evaluator as any,
      governanceApprovalUseCases: approvals,
    }),
  );
  app.use((error: any, _req: any, res: any, _next: any) =>
    res.status(error.name === 'ZodError' ? 400 : 500).json({ error: error.message }),
  );
  return {
    app,
    assignments,
    gateway,
    tx,
    consume,
    setRoleRevision: (next: string) => {
      currentRole = new Role({
        id: currentRole.id,
        name: currentRole.name,
        description: currentRole.description,
        policyIds: currentRole.policyIds,
        revision: next,
        permissions: currentRole.permissions,
      });
    },
    async bind() {
      const response = await request(app)
        .post('/admin/authorization/change-requests')
        .send({
          id: 'approval',
          approverId: 'checker',
          target: { method: 'POST', path: '/assignments', body, changeTicket: 'CHANGE-123' },
        });
      expect(response.status).toBe(201);
      envelope = {
        ...response.body.data,
        approvedAt: approved ? new Date().toISOString() : null,
        usedAt: used ? new Date().toISOString() : null,
      };
      expect(envelope.digest).toBe(
        governanceApprovalDigest('AUTHORIZATION_CHANGE', envelope.payload),
      );
    },
  };
}
const submit = (app: express.Express, id = 'approval') =>
  request(app)
    .post('/admin/authorization/assignments')
    .set('x-second-approver-id', 'checker')
    .set('x-change-ticket', 'CHANGE-123')
    .set('x-governance-approval-id', id)
    .send(body);
describe('independent access change approval', () => {
  it('rejects a reviewer name without a stored approval', async () => {
    const s = setup();
    const r = await submit(s.app, 'invented');
    expect(r.status).toBe(409);
    expect(s.assignments.execute).not.toHaveBeenCalled();
  });
  it.each([{ approved: false }, { used: true }])(
    'does not accept pending or consumed approvals %j',
    async (options) => {
      const s = setup(options);
      await s.bind();
      expect((await submit(s.app)).status).toBe(409);
      expect(s.assignments.execute).not.toHaveBeenCalled();
    },
  );
  it('passes a transaction precondition for the exact approved version', async () => {
    const s = setup();
    await s.bind();
    expect((await submit(s.app)).status).toBe(201);
    expect(s.consume).toHaveBeenCalledWith(
      'approval',
      'AUTHORIZATION_CHANGE',
      expect.objectContaining({ body }),
      'maker',
      'checker',
      s.tx,
    );
  });
  it('invalidates approval when the role changes before execution', async () => {
    const s = setup();
    await s.bind();
    s.setRoleRevision('2026-10-28T01:00:00.000Z');
    expect((await submit(s.app)).status).toBe(409);
    expect(s.assignments.execute).not.toHaveBeenCalled();
  });
  it.each([{ source: 'EMERGENCY' }, { sourcePolicies: [{ id: 'office-hours', missing: false }] }])(
    'cannot delegate from temporary access or drop source policy restrictions %j',
    async (options) => {
      const s = setup(options);
      expect((await submit(s.app)).status).toBe(403);
      expect(s.assignments.execute).not.toHaveBeenCalled();
    },
  );
  it('requires target policies to retain the source restrictions', async () => {
    const s = setup({
      sourcePolicies: [{ id: 'office-hours', missing: false }],
      targetPolicies: ['office-hours'],
    });
    await s.bind();
    expect((await submit(s.app)).status).toBe(201);
  });
  it('limits approval requests to exact supported owner operations', async () => {
    const s = setup();
    for (const path of [
      '/roles/../assignments',
      '/roles/r/retire/else',
      '/policies/test',
      '/emergency-access/grant/revoke',
    ])
      expect(
        (
          await request(s.app)
            .post('/admin/authorization/change-preview')
            .send({ method: 'POST', path, body: {}, changeTicket: '' })
        ).status,
      ).toBe(400);
    expect(s.gateway.create).not.toHaveBeenCalled();
  });
});
