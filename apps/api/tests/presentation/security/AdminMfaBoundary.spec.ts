import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { SecurityMiddlewareFactory } from '../../../src/presentation/security/SecurityMiddlewareFactory';
function setup(errorCode?: string, adminAccessAllowed?: (id: string) => Promise<boolean>) {
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
      adminAccessAllowed,
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
  app.post('/api/v1/admin/review-workspace/query', (_req, res) => res.status(200).end());
  app.post('/api/v1/admin/review-workspace/query/commands', (_req, res) => res.status(204).end());
  app.post('/api/v1/admin/review-workspace/commands', (_req, res) => res.status(204).end());
  return { app, mfa };
}
describe('administrative MFA policy boundary (fake signed-token verifier, no live auth)', () => {
  it('allows only the exact review read-only POST without a fresh mutation step-up', async () => {
    const s = setup('MFA_STEP_UP_REQUIRED');
    expect(
      (
        await request(s.app)
          .post('/api/v1/admin/review-workspace/query')
          .set('Authorization', 'Bearer test')
      ).status,
    ).toBe(200);
    expect(s.mfa.sessionAuthenticated).toHaveBeenCalledWith('actor', 'session');
    expect(s.mfa.assertFresh).not.toHaveBeenCalled();
    for (const path of [
      '/api/v1/admin/review-workspace/commands',
      '/api/v1/admin/review-workspace/query/commands',
    ]) {
      const result = await request(s.app).post(path).set('Authorization', 'Bearer test');
      expect(result.status).toBe(403);
      expect(result.body.error.code).toBe('MFA_STEP_UP_REQUIRED');
    }
  });
  it('retains MFA-authenticated session proof for the review read-only POST', async () => {
    const s = setup();
    s.mfa.sessionAuthenticated.mockResolvedValue(false);
    const result = await request(s.app)
      .post('/api/v1/admin/review-workspace/query')
      .set('Authorization', 'Bearer test');
    expect(result.status).toBe(401);
    expect(result.body.error.code).toBe('MFA_SESSION_REQUIRED');
    expect(s.mfa.assertFresh).not.toHaveBeenCalled();
  });
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

describe('staff admin fence independent of authentication', () => {
  it.each([false, true])(
    'enforces current staff access %s without changing the identity or session',
    async (allowed) => {
      const fence = vi.fn(async () => allowed),
        s = setup(undefined, fence);
      const result = await request(s.app).get('/admin/read').set('Authorization', 'Bearer test');
      expect(result.status).toBe(allowed ? 200 : 403);
      if (!allowed) expect(result.body.error.code).toBe('STAFF_ADMIN_ACCESS_DENIED');
      expect(fence).toHaveBeenCalledWith('actor');
    },
  );
  it('denies admin access when fence storage is unavailable', async () => {
    const s = setup(undefined, async () => {
      throw Error('unavailable');
    });
    const result = await request(s.app).get('/admin/read').set('Authorization', 'Bearer test');
    expect(result.status).toBe(503);
    expect(result.body.error.code).toBe('STAFF_ADMIN_ACCESS_UNAVAILABLE');
  });
});
