import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  Role,
  Policy,
  PermissionReference,
  RoleAssignment,
  AuthorizationEvaluatorService,
  AccessDecision,
} from '@manaratak/domain';
import {
  InMemoryRoleRepository,
  InMemoryPolicyRepository,
  InMemoryRoleAssignmentRepository,
  DefaultPolicyEvaluator,
} from '@manaratak/infrastructure';
import { SecurityMiddlewareFactory } from '../../../src/presentation/security/SecurityMiddlewareFactory';
import { getResponseErrorCode } from '../../support/responsePayload';

function createResponse() {
  return {
    statusCode: 200,
    headers: {} as Record<string, string>,
    locals: {} as Record<string, unknown>,
    payload: undefined as unknown,
    setHeader: vi.fn(function (this: any, key: string, value: string) {
      this.headers[key] = value;
    }),
    status: vi.fn(function (this: any, code: number) {
      this.statusCode = code;
      return this;
    }),
    json: vi.fn(function (this: any, payload: unknown) {
      this.payload = payload;
      return this;
    }),
  };
}

describe('Runtime RBAC Authority & Permission Evaluation', () => {
  let roleRepo: InMemoryRoleRepository;
  let policyRepo: InMemoryPolicyRepository;
  let assignmentRepo: InMemoryRoleAssignmentRepository;
  let policyEvaluator: DefaultPolicyEvaluator;
  let evaluatorService: AuthorizationEvaluatorService;

  beforeEach(() => {
    roleRepo = new InMemoryRoleRepository();
    policyRepo = new InMemoryPolicyRepository();
    assignmentRepo = new InMemoryRoleAssignmentRepository();
    policyEvaluator = new DefaultPolicyEvaluator();

    evaluatorService = new AuthorizationEvaluatorService(
      roleRepo,
      policyRepo,
      assignmentRepo,
      policyEvaluator,
    );
  });

  it('ALLOWS admin when principal has persisted administrator role with wildcard permission', async () => {
    // 1. Seed database with role and assignment
    const adminRole = new Role({
      id: 'administrator',
      name: 'Administrator',
      description: 'Full admin access',
      permissions: [new PermissionReference('admin:*')],
      policyIds: [],
    });
    await roleRepo.save(adminRole);

    const assignment = new RoleAssignment({
      id: 'assign-admin-1',
      identityId: 'admin-root-id',
      roleId: 'administrator',
      assignedAt: new Date(),
    });
    await assignmentRepo.save(assignment);

    // 2. Guard evaluation for admin:assets:manage
    const guard = SecurityMiddlewareFactory.createAdminPermissionGuard(
      'admin:assets:manage',
      evaluatorService,
    );
    const req = { authUserId: 'admin-root-id', headers: {} } as any;
    const res = createResponse();
    const next = vi.fn();

    await guard(req, res as any, next);

    expect(next).toHaveBeenCalled();
    expect(res.headers['X-Admin-Required-Permission']).toBe('admin:assets:manage');
  });

  it('DENIES access when user has a different role without required permission', async () => {
    // Seed student role and assignment
    const studentRole = new Role({
      id: 'student',
      name: 'Student',
      description: 'Student access',
      permissions: [new PermissionReference('student:workspace:read')],
      policyIds: [],
    });
    await roleRepo.save(studentRole);

    const assignment = new RoleAssignment({
      id: 'assign-student-1',
      identityId: 'student-id-100',
      roleId: 'student',
      assignedAt: new Date(),
    });
    await assignmentRepo.save(assignment);

    const guard = SecurityMiddlewareFactory.createAdminPermissionGuard(
      'admin:assets:manage',
      evaluatorService,
    );
    const req = { authUserId: 'student-id-100', headers: {} } as any;
    const res = createResponse();
    const next = vi.fn();

    await guard(req, res as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.payload).toEqual({
      error: {
        code: 'ADMIN_PERMISSION_DENIED',
        message: 'Admin permission is denied.',
      },
      meta: {
        timestamp: expect.any(String),
        requiredPermission: 'admin:assets:manage',
      },
    });
  });

  it('DENIES access when user has NO role assignment in database', async () => {
    const guard = SecurityMiddlewareFactory.createAdminPermissionGuard(
      'admin:imports:manage',
      evaluatorService,
    );
    const req = { authUserId: 'unassigned-user-id', headers: {} } as any;
    const res = createResponse();
    const next = vi.fn();

    await guard(req, res as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(getResponseErrorCode(res.payload)).toBe('ADMIN_PERMISSION_DENIED');
  });

  it('DENIES access immediately when role assignment is revoked (deleted)', async () => {
    // 1. Grant role
    const role = new Role({
      id: 'custom-admin',
      name: 'Custom Admin',
      description: 'Temp admin',
      permissions: [new PermissionReference('admin:imports:manage')],
      policyIds: [],
    });
    await roleRepo.save(role);

    const assignment = new RoleAssignment({
      id: 'assign-temp',
      identityId: 'temp-user-id',
      roleId: 'custom-admin',
      assignedAt: new Date(),
    });
    await assignmentRepo.save(assignment);

    const guard = SecurityMiddlewareFactory.createAdminPermissionGuard(
      'admin:imports:manage',
      evaluatorService,
    );

    // Initial check: ALLOW
    const req1 = { authUserId: 'temp-user-id', headers: {} } as any;
    const res1 = createResponse();
    const next1 = vi.fn();
    await guard(req1, res1 as any, next1);
    expect(next1).toHaveBeenCalled();

    // Revoke assignment
    await assignmentRepo.delete('assign-temp');

    // Subsequent check: DENIED
    const req2 = { authUserId: 'temp-user-id', headers: {} } as any;
    const res2 = createResponse();
    const next2 = vi.fn();
    await guard(req2, res2 as any, next2);

    expect(next2).not.toHaveBeenCalled();
    expect(res2.statusCode).toBe(403);
    expect(getResponseErrorCode(res2.payload)).toBe('ADMIN_PERMISSION_DENIED');
  });

  it('IGNORES fake client headers trying to claim admin permissions', async () => {
    const guard = SecurityMiddlewareFactory.createAdminPermissionGuard(
      'admin:universities:manage',
      evaluatorService,
    );

    // Client passes spoofed headers
    const req = {
      authUserId: 'ordinary-user-id',
      headers: {
        'x-admin-role': 'DEMO_SUPER_ADMIN',
        'x-admin-permissions': 'admin:*',
        manaratak_demo_role: 'administrator',
      },
    } as any;
    const res = createResponse();
    const next = vi.fn();

    await guard(req, res as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(getResponseErrorCode(res.payload)).toBe('ADMIN_PERMISSION_DENIED');
  });

  it('REJECTS unauthenticated requests with HTTP 401', async () => {
    const guard = SecurityMiddlewareFactory.createAdminPermissionGuard(
      'admin:majors:manage',
      evaluatorService,
    );

    const req = { headers: {} } as any; // No authUserId
    const res = createResponse();
    const next = vi.fn();

    await guard(req, res as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(getResponseErrorCode(res.payload)).toBe('ADMIN_AUTH_REQUIRED');
  });

  it('ENFORCES permission evaluation across all 11 active Phase 2-10 admin domains', async () => {
    const domains = [
      'admin:identities:manage',
      'admin:authorization:manage',
      'admin:settings:manage',
      'admin:imports:manage',
      'admin:reference-data:manage',
      'admin:academic-taxonomy:manage',
      'admin:international-tests:manage',
      'admin:universities:manage',
      'admin:majors:manage',
      'admin:assets:manage',
      'admin:audit:manage',
    ];

    for (const permission of domains) {
      const guard = SecurityMiddlewareFactory.createAdminPermissionGuard(
        permission,
        evaluatorService,
      );
      const req = { authUserId: 'unauthorized-user', headers: {} } as any;
      const res = createResponse();
      const next = vi.fn();

      await guard(req, res as any, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);
      expect(getResponseErrorCode(res.payload)).toBe('ADMIN_PERMISSION_DENIED');
    }
  });

  it('BEARER SAFETY: Static bearer token identifies principal but DOES NOT bypass persisted RBAC evaluation', async () => {
    // Principal identified via bearer, but has no DB role assignments
    const guard = SecurityMiddlewareFactory.createAdminPermissionGuard(
      'admin:settings:manage',
      evaluatorService,
    );
    const req = {
      authUserId: 'admin-root',
      headers: {
        authorization: 'Bearer static-valid-admin-token',
      },
    } as any;
    const res = createResponse();
    const next = vi.fn();

    await guard(req, res as any, next);

    // DENIED because no persisted role assignment exists in DB for 'admin-root'
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(getResponseErrorCode(res.payload)).toBe('ADMIN_PERMISSION_DENIED');
  });
  it('fails closed when a role references a policy that no longer exists', async () => {
    await roleRepo.save(
      new Role({
        id: 'dangling-policy-admin',
        name: 'Dangling Policy Admin',
        description: 'Must not receive access when the referenced policy cannot be loaded',
        permissions: [new PermissionReference('admin:settings:manage')],
        policyIds: ['missing-policy'],
      }),
    );
    await assignmentRepo.save(
      new RoleAssignment({
        id: 'assign-dangling-policy-admin',
        identityId: 'dangling-policy-user',
        roleId: 'dangling-policy-admin',
        assignedAt: new Date(),
      }),
    );

    const guard = SecurityMiddlewareFactory.createAdminPermissionGuard(
      'admin:settings:manage',
      evaluatorService,
    );
    const req = {
      authUserId: 'dangling-policy-user',
      headers: {},
      ip: '203.0.113.10',
      socket: {},
    } as any;
    const res = createResponse();
    const next = vi.fn();

    await guard(req, res as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });

  it('enforces attached IP policy through the real permission middleware context', async () => {
    await policyRepo.save(
      new Policy({
        id: 'policy-office-ip',
        name: 'Office IP',
        description: 'Restrict admin access to a trusted address',
        ruleType: 'IP',
        ruleConfiguration: '203.0.113.10',
      }),
    );
    await roleRepo.save(
      new Role({
        id: 'conditional-admin',
        name: 'Conditional Admin',
        description: 'Admin access restricted by policy',
        permissions: [new PermissionReference('admin:settings:manage')],
        policyIds: ['policy-office-ip'],
      }),
    );
    await assignmentRepo.save(
      new RoleAssignment({
        id: 'assign-conditional-admin',
        identityId: 'conditional-user',
        roleId: 'conditional-admin',
        assignedAt: new Date(),
      }),
    );

    const guard = SecurityMiddlewareFactory.createAdminPermissionGuard(
      'admin:settings:manage',
      evaluatorService,
    );

    const allowedReq = {
      authUserId: 'conditional-user',
      headers: {},
      ip: '203.0.113.10',
      socket: {},
    } as any;
    const allowedRes = createResponse();
    const allowedNext = vi.fn();
    await guard(allowedReq, allowedRes as any, allowedNext);
    expect(allowedNext).toHaveBeenCalledOnce();

    const deniedReq = {
      authUserId: 'conditional-user',
      headers: {},
      ip: '203.0.113.99',
      socket: {},
    } as any;
    const deniedRes = createResponse();
    const deniedNext = vi.fn();
    await guard(deniedReq, deniedRes as any, deniedNext);
    expect(deniedNext).not.toHaveBeenCalled();
    expect(deniedRes.statusCode).toBe(403);
  });
});
