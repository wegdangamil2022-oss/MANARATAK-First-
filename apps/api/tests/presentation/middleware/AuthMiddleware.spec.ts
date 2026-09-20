import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { AuthMiddleware } from '../../../src/presentation/middleware/AuthMiddleware';

describe('AuthMiddleware cookie sessions', () => {
  function createApp(active: boolean) {
    const tokenProvider = {
      verifyAccessToken: vi.fn().mockResolvedValue({ userId: 'student-1', sessionId: 'session-1' }),
    };
    const sessionManager = {
      isSessionActive: vi.fn().mockResolvedValue(active),
      revokeAllSessions: vi.fn().mockResolvedValue(undefined),
    };
    const principalAccessValidator = {
      isAuthenticationAllowed: vi.fn().mockResolvedValue(true),
    };
    const app = express();
    app.use(new AuthMiddleware(tokenProvider as any, sessionManager as any, principalAccessValidator as any).generate());
    app.get('/student', (req, res) => res.json({ userId: req.authUserId }));
    return { app, sessionManager, principalAccessValidator };
  }

  it('accepts an HttpOnly access-cookie value only while its server session is active', async () => {
    const { app, sessionManager } = createApp(true);
    const response = await request(app).get('/student').set('Cookie', 'manaratak_access=access-token');
    expect(response.status).toBe(200);
    expect(response.body.userId).toBe('student-1');
    expect(sessionManager.isSessionActive).toHaveBeenCalledWith('student-1', 'session-1');
  });

  it('rejects a revoked cookie session with a generic response', async () => {
    const { app } = createApp(false);
    const response = await request(app).get('/student').set('Cookie', 'manaratak_access=access-token');
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'Unauthorized' });
  });
  it('rejects a previously valid session when the canonical identity becomes inactive', async () => {
    const { app, principalAccessValidator, sessionManager } = createApp(true);
    principalAccessValidator.isAuthenticationAllowed.mockResolvedValue(false);
    const response = await request(app).get('/student').set('Cookie', 'manaratak_access=access-token');
    expect(response.status).toBe(401);
    expect(sessionManager.revokeAllSessions).toHaveBeenCalledWith('student-1');
  });

});
