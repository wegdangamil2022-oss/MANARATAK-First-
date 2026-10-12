import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { SecurityMiddlewareFactory } from '../../../src/presentation/security/SecurityMiddlewareFactory';
function setup(errorCode?: string) {
  const mfa = {
      sessionAuthenticated: vi.fn(async () => true),
      assertFresh: vi.fn(async () => {
        if (errorCode) throw new Error(errorCode);
      }),
    },
    app = express();
  app.use(
    SecurityMiddlewareFactory.createAdminGuard({
      mode: 'strict',
      tokenProvider: {
        verifyAccessToken: vi.fn(async () => ({ userId: 'actor', sessionId: 'session' })),
      } as any,
      sessionManager: { isSessionActive: vi.fn(async () => true) } as any,
      principalAccessValidator: { isAuthenticationAllowed: vi.fn(async () => true) },
      mfaUseCases: mfa as any,
    }),
  );
  app.get('/admin/read', (_req, res) => res.status(200).end());
  app.post('/admin/edit', (_req, res) => res.status(204).end());
  return { app, mfa };
}
describe('administrative MFA policy boundary (fake signed-token verifier, no live auth)', () => {
  it.each(['MFA_ENROLLMENT_REQUIRED', 'MFA_STEP_UP_REQUIRED'])(
    'denies a write for %s',
    async (code) => {
      const s = setup(code);
      const response = await request(s.app).post('/admin/edit').set('Authorization', 'Bearer test');
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe(code);
    },
  );
  it('permits reads so an authenticated administrator can reach enrollment', async () => {
    const s = setup('MFA_ENROLLMENT_REQUIRED');
    expect(
      (await request(s.app).get('/admin/read').set('Authorization', 'Bearer test')).status,
    ).toBe(200);
    expect(s.mfa.assertFresh).not.toHaveBeenCalled();
  });
  it('permits writes only after a fresh confirmation', async () => {
    const s = setup();
    expect(
      (await request(s.app).post('/admin/edit').set('Authorization', 'Bearer test')).status,
    ).toBe(204);
    expect(s.mfa.assertFresh).toHaveBeenCalledWith('actor', 'session');
  });
  it('does not treat unavailable MFA proof storage as success', async () => {
    const s = setup('DATABASE_UNAVAILABLE');
    expect(
      (await request(s.app).post('/admin/edit').set('Authorization', 'Bearer test')).status,
    ).toBe(503);
  });
});
