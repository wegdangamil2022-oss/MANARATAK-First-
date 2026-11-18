import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { StudentWorkspaceRouter } from '../../../src/presentation/api/router/StudentWorkspaceRouter';
import { CourseLearnerRouter } from '../../../src/presentation/api/router/CourseLearnerRouter';

describe.each(['workspace', 'learning'] as const)('%s student MFA boundary', (area) => {
  it('fails to initialize without an MFA policy', () => {
    const create = area === 'workspace' ? StudentWorkspaceRouter.create : CourseLearnerRouter.create;
    expect(() => create({} as never)).toThrow('STUDENT_MFA_POLICY_REQUIRED');
  });

  function createApp(allowed: boolean | Error) {
    const sessionAuthenticated = allowed instanceof Error
      ? vi.fn().mockRejectedValue(allowed)
      : vi.fn().mockResolvedValue(allowed);
    const readPrivateData = vi.fn().mockResolvedValue([]);
    const cradle = {
      tokenProvider: { verifyAccessToken: vi.fn().mockResolvedValue({ userId: 'student-1', sessionId: 'session-1' }) },
      sessionManager: { isSessionActive: vi.fn().mockResolvedValue(true) },
      principalAccessValidator: { isAuthenticationAllowed: vi.fn().mockResolvedValue(true) },
      roleAssignmentRepository: { findByIdentityId: vi.fn().mockResolvedValue([{ roleId: 'student' }]) },
      mfaUseCases: { sessionAuthenticated },
      apiIdempotencyStore: {},
      certificateReadModelService: { listForStudent: readPrivateData },
      learningPathUseCases: { availableCourses: readPrivateData },
      careerEngagementUseCases: {},
    };
    const app = express();
    app.use(area === 'workspace'
      ? StudentWorkspaceRouter.create(cradle as never)
      : CourseLearnerRouter.create(cradle as never));
    const path = area === 'workspace' ? '/certificates' : '/learning-paths/path-1/available-courses';
    return { app, path, sessionAuthenticated, readPrivateData };
  }

  it('denies an active session without the required MFA proof', async () => {
    const { app, path, sessionAuthenticated, readPrivateData } = createApp(false);
    const response = await request(app).get(path).set('Authorization', 'Bearer synthetic-token');
    expect(response.status).toBe(401);
    expect(sessionAuthenticated).toHaveBeenCalledWith('student-1', 'session-1');
    expect(readPrivateData).not.toHaveBeenCalled();
  });

  it('permits a session that satisfies the current MFA policy', async () => {
    const { app, path, sessionAuthenticated, readPrivateData } = createApp(true);
    const response = await request(app).get(path).set('Authorization', 'Bearer synthetic-token');
    expect(response.status).toBe(200);
    expect(sessionAuthenticated).toHaveBeenCalledWith('student-1', 'session-1');
    expect(readPrivateData).toHaveBeenCalled();
  });

  it('fails closed if checking MFA is unavailable', async () => {
    const { app, path, readPrivateData } = createApp(new Error('MFA_STORAGE_UNAVAILABLE'));
    const response = await request(app).get(path).set('Authorization', 'Bearer synthetic-token');
    expect(response.status).toBe(401);
    expect(readPrivateData).not.toHaveBeenCalled();
  });
});
