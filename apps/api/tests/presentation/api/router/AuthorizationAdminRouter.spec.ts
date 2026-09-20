import { describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { AuthorizationAdminRouter } from '../../../../src/presentation/api/router/AuthorizationAdminRouter';
import { ManageEmergencyAccessUseCase } from '@manaratak/application';
import { InMemoryEmergencyAccessRepository } from '@manaratak/infrastructure';

describe('AuthorizationAdminRouter bootstrap verification', () => {
  const useCases = { createRole: vi.fn(), getRole: vi.fn() };
  const assignments = { execute: vi.fn() };
  const emergencyAccess = new ManageEmergencyAccessUseCase(new InMemoryEmergencyAccessRepository());

  it('returns a sanitized persisted RBAC readiness report', async () => {
    const verifier = {
      verify: vi
        .fn()
        .mockResolvedValue({
          status: 'READY',
          capability: 'PERSISTED_RBAC_ADMIN_BOOTSTRAP',
          counts: { activeAssignments: 1 },
          identityFingerprints: ['abc123'],
          databaseWrites: 0,
        }),
    };
    const app = express();
    app.use(
      '/admin/authorization',
      AuthorizationAdminRouter.create({
        manageRolesUseCase: useCases as any,
        assignRoleUseCase: assignments as any,
        manageEmergencyAccessUseCase: emergencyAccess,
        adminBootstrapVerifier: verifier as any,
      }),
    );

    const response = await request(app).get('/admin/authorization/bootstrap-verification');
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('READY');
    expect(response.body.data.databaseWrites).toBe(0);
  });

  it('returns 503 instead of success when persisted verification is unavailable', async () => {
    const app = express();
    app.use(
      '/admin/authorization',
      AuthorizationAdminRouter.create({
        manageRolesUseCase: useCases as any,
        assignRoleUseCase: assignments as any,
        manageEmergencyAccessUseCase: emergencyAccess,
      }),
    );

    const response = await request(app).get('/admin/authorization/bootstrap-verification');
    expect(response.status).toBe(503);
    expect(response.body.data.status).toBe('UNAVAILABLE');
  });
});
