import { describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { Role, PermissionReference, LifeStatus } from '@manaratak/domain';
import { AuthorizationAdminRouter } from '../../../../src/presentation/api/router/AuthorizationAdminRouter';

function appFor({ verified = true, actorPermission = true, grantedPermission = 'admin:universities:manage' } = {}) {
  const role = new Role({ id: 'section-editor', name: 'Section editor', description: 'Limited role',
    permissions: [new PermissionReference(grantedPermission)], policyIds: [] });
  const assignments = { execute: vi.fn(async () => {}), listAssignments: vi.fn(async () => []), getAssignment: vi.fn(async () => null) };
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.authUserId = 'manager-1'; next(); });
  app.use('/admin/authorization', AuthorizationAdminRouter.create({
    manageRolesUseCase: { getRole: vi.fn(async () => role), listRoles: vi.fn(async () => [role]) } as any,
    assignRoleUseCase: assignments as any,
    manageEmergencyAccessUseCase: {} as any,
    getIdentityUseCase: { execute: vi.fn(async () => ({ isSuccess: true, getValue: () => ({ status: LifeStatus.ACTIVE,
      account: { accessState: 'Active' }, user: { contactRegistry: { isEmailVerified: verified } } }) })) } as any,
    authEvaluatorService: { evaluatePermission: vi.fn(async () => ({ isGranted: actorPermission })) } as any,
  }));
  return { app, assignments };
}

describe('delegated staff role assignment', () => {
  const body = { id: 'assignment-1', identityId: 'verified-account-1', roleId: 'section-editor' };

  it('requires an active account with verified email', async () => {
    const { app, assignments } = appFor({ verified: false });
    const response = await request(app).post('/admin/authorization/assignments').send(body);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VERIFIED_ACTIVE_IDENTITY_REQUIRED');
    expect(assignments.execute).not.toHaveBeenCalled();
  });

  it('refuses permissions the actor does not have', async () => {
    const { app, assignments } = appFor({ actorPermission: false });
    const response = await request(app).post('/admin/authorization/assignments').send(body);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('ROLE_PERMISSION_EXCEEDS_ACTOR');
    expect(assignments.execute).not.toHaveBeenCalled();
  });

  it('never delegates the owner wildcard through staff management', async () => {
    const { app, assignments } = appFor({ grantedPermission: 'admin:*' });
    const response = await request(app).post('/admin/authorization/assignments').send(body);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('NON_DELEGABLE_PERMISSION');
    expect(assignments.execute).not.toHaveBeenCalled();
  });

  it('allows a verified account to receive a section role within the actor permission', async () => {
    const { app, assignments } = appFor();
    const response = await request(app).post('/admin/authorization/assignments').send(body);
    expect(response.status).toBe(201);
    expect(assignments.execute).toHaveBeenCalledOnce();
  });
});
