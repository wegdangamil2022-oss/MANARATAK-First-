import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { SettingsAdminRouter } from '../../../../src/presentation/api/router/SettingsAdminRouter';
const id = 'b8ee4013-a83c-4b42-ad2f-61c5b589c312';
function harness(allowed: boolean, authenticated = true, available = true) {
  const governance = {
    approve: vi.fn(async () => ({})),
    commit: vi.fn(async () => ({})),
    get: vi.fn(async () => ({ approverId: 'reviewer' })),
    propose: vi.fn(async () => ({})),
  };
  const identity = {
    id: 'reviewer',
    account: { accessState: 'Active' },
    user: { contactRegistry: { isEmailVerified: true }, profile: { displayName: 'Reviewer' } },
  };
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).authUserId = 'actor';
    next();
  });
  app.use(
    '/settings',
    SettingsAdminRouter.create({
      manageSettingsUseCase: {} as any,
      settingsGovernanceUseCases: governance as any,
      getIdentityUseCase: { execute: async () => ({ isSuccess: true, getValue: () => identity }) },
      listIdentitiesUseCase: {
        execute: async () => ({
          isSuccess: true,
          getValue: () => ({ items: [identity], nextCursor: 'next-page' }),
        }),
      },
      authEvaluatorService: { evaluatePermission: async () => ({ isGranted: true }) },
      principalAccessValidator: { isAuthenticationAllowed: async () => authenticated },
      ...(available
        ? { staffLifecycleRepository: { adminAccessAllowed: async () => allowed } }
        : {}),
    }),
  );
  return { app, governance };
}
describe('Settings approver administrative access', () => {
  it('excludes suspended staff and fenced principals from approvers without losing pagination', async () => {
    for (const values of [
      [false, true],
      [true, false],
    ]) {
      const { app } = harness(...(values as [boolean, boolean]));
      const result = await request(app).get('/settings/governance/approvers');
      expect(result.status).toBe(200);
      expect(result.body.data).toEqual({ items: [], nextCursor: 'next-page' });
    }
    const allowed = await request(harness(true).app).get('/settings/governance/approvers');
    expect(allowed.body.data.items).toEqual([{ id: 'reviewer', name: 'Reviewer' }]);
  });
  it('rechecks staff access when approving and again before committing', async () => {
    const { app, governance } = harness(false);
    expect(
      (await request(app).post(`/settings/governance/change-sets/${id}/approve`).send({})).status,
    ).toBe(403);
    expect(
      (await request(app).post(`/settings/governance/change-sets/${id}/commit`).send({})).status,
    ).toBe(403);
    expect(governance.approve).not.toHaveBeenCalled();
    expect(governance.commit).not.toHaveBeenCalled();
  });
  it('fails closed when administrative access cannot be checked', async () => {
    const { app, governance } = harness(true, true, false);
    expect((await request(app).get('/settings/governance/approvers')).status).toBe(503);
    expect(
      (await request(app).post(`/settings/governance/change-sets/${id}/approve`).send({})).status,
    ).toBe(503);
    expect(governance.approve).not.toHaveBeenCalled();
  });
  it('allows a currently eligible approver through the same checks', async () => {
    const { app, governance } = harness(true);
    expect(
      (await request(app).post(`/settings/governance/change-sets/${id}/approve`).send({})).status,
    ).toBe(200);
    expect(governance.approve).toHaveBeenCalledWith(
      id,
      expect.objectContaining({ actorId: 'actor' }),
    );
  });
});
