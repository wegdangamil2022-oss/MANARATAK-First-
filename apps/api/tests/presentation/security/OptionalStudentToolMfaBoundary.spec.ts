import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { OptionalAuthMiddleware } from '../../../src/presentation/middleware/OptionalAuthMiddleware';
import { StudentToolsPublicRouter } from '../../../src/presentation/api/router/StudentToolsPublicRouter';

describe('optional authentication for private student tool results', () => {
  function createApp(allowed: boolean | Error) {
    const sessionAuthenticated = allowed instanceof Error
      ? vi.fn().mockRejectedValue(allowed)
      : vi.fn().mockResolvedValue(allowed);
    const findExecutionForRequester = vi.fn().mockResolvedValue({ synthetic: 'private-result' });
    const auth = new OptionalAuthMiddleware(
      { verifyAccessToken: vi.fn().mockResolvedValue({ userId: 'student-1', sessionId: 'session-1' }) } as never,
      { isSessionActive: vi.fn().mockResolvedValue(true) } as never,
      { isAuthenticationAllowed: vi.fn().mockResolvedValue(true) } as never,
      { sessionAuthenticated },
    );
    const app = express();
    app.use(auth.generate());
    app.use(StudentToolsPublicRouter.create({
      studentToolExecutionUseCases: { findExecutionForRequester },
      studentToolAnonymousSessionService: {
        resolve: vi.fn().mockReturnValue({ sessionReference: 'anonymous-1', newlyIssued: false }),
      },
    } as never));
    return { app, sessionAuthenticated, findExecutionForRequester };
  }

  it('rejects an authenticated session whose required MFA proof is absent', async () => {
    const { app, sessionAuthenticated, findExecutionForRequester } = createApp(false);
    const response = await request(app).get('/executions/result-1').set('Authorization', 'Bearer synthetic-token');
    expect(response.status).toBe(401);
    expect(sessionAuthenticated).toHaveBeenCalledWith('student-1', 'session-1');
    expect(findExecutionForRequester).not.toHaveBeenCalled();
  });

  it('permits an authenticated session that satisfies MFA policy', async () => {
    const { app, sessionAuthenticated, findExecutionForRequester } = createApp(true);
    const response = await request(app).get('/executions/result-1').set('Authorization', 'Bearer synthetic-token');
    expect(response.status).toBe(200);
    expect(sessionAuthenticated).toHaveBeenCalledWith('student-1', 'session-1');
    expect(findExecutionForRequester).toHaveBeenCalledWith('result-1', expect.objectContaining({ authenticatedStudentReference: 'student-1' }));
  });

  it('fails closed when the MFA check is unavailable', async () => {
    const { app, findExecutionForRequester } = createApp(new Error('MFA_STORAGE_UNAVAILABLE'));
    const response = await request(app).get('/executions/result-1').set('Authorization', 'Bearer synthetic-token');
    expect(response.status).toBe(401);
    expect(findExecutionForRequester).not.toHaveBeenCalled();
  });

  it('preserves anonymous access without invoking MFA', async () => {
    const { app, sessionAuthenticated, findExecutionForRequester } = createApp(false);
    const response = await request(app).get('/executions/result-1');
    expect(response.status).toBe(200);
    expect(sessionAuthenticated).not.toHaveBeenCalled();
    expect(findExecutionForRequester).toHaveBeenCalledWith('result-1', expect.objectContaining({ anonymousSessionReference: 'anonymous-1' }));
  });
});
