import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { CourseLearnerRouter } from '../../../src/presentation/api/router/CourseLearnerRouter';

function fixture() {
  const resolveLearningAsset = vi.fn().mockResolvedValue('synthetic-asset');
  const requestDeliveryGrant = vi.fn().mockResolvedValue({ url: 'https://media.example.invalid/synthetic', expiresAt: '2030-01-01T00:00:00Z', headers: {} });
  const begin = vi.fn().mockResolvedValue({ kind: 'REPLAY', statusCode: 200, responseBody: { url: 'https://media.example.invalid/old' } });
  const app = express();
  app.use(express.json());
  app.use(CourseLearnerRouter.create({
    tokenProvider: { verifyAccessToken: vi.fn().mockResolvedValue({ userId: 'student-1', sessionId: 'session-1' }) },
    sessionManager: { isSessionActive: vi.fn().mockResolvedValue(true) },
    principalAccessValidator: { isAuthenticationAllowed: vi.fn().mockResolvedValue(true) },
    mfaUseCases: { sessionAuthenticated: vi.fn().mockResolvedValue(true) },
    roleAssignmentRepository: { findByIdentityId: vi.fn().mockResolvedValue([{ roleId: 'student' }]) },
    courseProgressUseCases: { resolveLearningAsset, getLearningWorkspace: vi.fn().mockResolvedValue({ lessons: [] }), getProgress: vi.fn().mockResolvedValue({ progress: 30 }) },
    learningPathUseCases: { availableCourses: vi.fn().mockResolvedValue([]) },
    processAssetLifecycleUseCase: { requestDeliveryGrant },
    apiIdempotencyStore: { begin },
  } as never));
  return { app, resolveLearningAsset, requestDeliveryGrant, begin };
}

describe('course learner delivery and response privacy', () => {
  it.each([
    '/course-1/lessons/lesson-1/assets/asset-1/delivery-grant',
    '/COURSE-1/LESSONS/LESSON-1/ASSETS/ASSET-1/DELIVERY-GRANT/',
  ])('rechecks current access instead of replaying a delivery capability on %s', async (path) => {
    const { app, resolveLearningAsset, requestDeliveryGrant, begin } = fixture();
    const first = await request(app).post(path).set('Authorization', 'Bearer synthetic-token').set('Idempotency-Key', 'synthetic-retry-key');
    expect(first.status).toBe(200);
    expect(first.headers['cache-control']).toContain('no-store');
    resolveLearningAsset.mockRejectedValueOnce(new Error('COURSE_ENROLLMENT_REQUIRED'));
    const second = await request(app).post(path).set('Authorization', 'Bearer synthetic-token').set('Idempotency-Key', 'synthetic-retry-key');
    expect(second.status).toBe(403);
    expect(second.text).not.toContain('https://media.');
    expect(second.headers['cache-control']).toContain('no-store');
    expect(resolveLearningAsset).toHaveBeenCalledTimes(2);
    expect(requestDeliveryGrant).toHaveBeenCalledOnce();
    expect(begin).not.toHaveBeenCalled();
  });

  it.each(['/course-1/workspace', '/course-1/progress', '/learning-paths/path-1/available-courses'])('prevents HTTP caching of private learner data on %s', async (path) => {
    const { app } = fixture();
    const response = await request(app).get(path).set('Authorization', 'Bearer synthetic-token');
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
  });

  it('keeps command idempotency enabled for enrollment', async () => {
    const { app, begin } = fixture();
    const response = await request(app).post('/course-1/enroll').set('Authorization', 'Bearer synthetic-token');
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
    expect(begin).not.toHaveBeenCalled();
  });
});
