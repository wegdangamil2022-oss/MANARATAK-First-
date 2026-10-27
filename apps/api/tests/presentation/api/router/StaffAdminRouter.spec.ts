import express from 'express';
import request from 'supertest';
import { describe, it, expect, vi } from 'vitest';
import { StaffAdminRouter } from '../../../../src/presentation/api/router/StaffAdminRouter';
function setup() {
  const owner = {
    readiness: vi.fn(async () => ({
      ready: false,
      missingTables: ['StaffMembershipRecord'],
      capabilities: {
        drafts: false,
        organization: false,
        invitations: false,
        activation: false,
        offboarding: false,
      },
    })),
    list: vi.fn(async () => {
      throw Error('STAFF_SCHEMA_NOT_READY');
    }),
    createDraft: vi.fn(),
    organization: vi.fn(),
    events: vi.fn(),
    cancelDraft: vi.fn(),
  };
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.authUserId = 'manager';
    next();
  });
  app.use('/staff', StaffAdminRouter.create({ staffWorkspaceUseCases: owner as any }));
  return { app, owner };
}
describe('Staff administrative owner contract', () => {
  it('distinguishes missing schema from a valid empty staff directory', async () => {
    const s = setup();
    expect((await request(s.app).get('/staff/readiness')).body.data.ready).toBe(false);
    expect((await request(s.app).get('/staff/members')).status).toBe(409);
  });
  it('never accepts role grants or activation fields in a draft command', async () => {
    const s = setup();
    for (const extra of [{ status: 'ACTIVE' }, { roleId: 'owner' }, { verifyEmail: true }])
      expect(
        (
          await request(s.app)
            .post('/staff/members')
            .send({
              id: 'b0bc335e-1a64-4a53-b9b2-eaaf0f6a1b8a',
              kind: 'EMPLOYEE',
              displayName: 'Example',
              email: 'x@invalid.test',
              reason: 'Reviewed',
              ...extra,
            })
        ).status,
      ).toBe(400);
    expect(s.owner.createDraft).not.toHaveBeenCalled();
  });
  it('leaves invitations and offboarding unavailable without affecting identity lifecycle', async () => {
    const s = setup();
    for (const path of ['/invitations', '/members/id/activate', '/members/id/offboard'])
      expect(
        (
          await request(s.app)
            .post('/staff' + path)
            .send({})
        ).status,
      ).toBe(404);
    expect(s.owner.createDraft).not.toHaveBeenCalled();
  });
  it('rejects spoofed search context and bounds pagination', async () => {
    const s = setup();
    for (const query of ['limit=500', 'identityId=someone', 'status=UNKNOWN'])
      expect((await request(s.app).get('/staff/members?' + query)).status).toBe(400);
    expect(s.owner.list).not.toHaveBeenCalled();
  });
});
