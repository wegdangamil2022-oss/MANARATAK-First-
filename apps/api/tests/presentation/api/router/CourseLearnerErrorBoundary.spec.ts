import { describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { CourseLearnerRouter } from '../../../../src/presentation/api/router/CourseLearnerRouter';

// Only isolate this presentation error contract; the built-browser lab uses
// the actual authentication, persisted roles and canonical middleware.
vi.mock('../../../../src/presentation/middleware/AuthMiddleware.js', () => ({ AuthMiddleware: class {
  generate() { return (req: express.Request, _res: express.Response, next: express.NextFunction) => { req.authUserId = 'synthetic-student'; next(); }; }
} }));
vi.mock('../../../../src/presentation/security/StudentRoleGuard.js', () => ({ createStudentRoleGuard: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next() }));
vi.mock('../../../../src/presentation/middleware/CanonicalIdempotencyMiddleware.js', () => ({ createCanonicalIdempotencyMiddleware: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next() }));

describe('course learner presentation errors', () => {
  it('leaves unknown failures to the global error handler', async () => {
    const app = express();
    const error = new Error('synthetic private database failure');
    app.use(CourseLearnerRouter.create({ courseProgressUseCases: { getLearningWorkspace: vi.fn().mockRejectedValue(error) } } as never));
    const observer = vi.fn();
    app.use((received: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => { observer(received); res.status(500).json({ code: 'UNEXPECTED_ERROR' }); });
    const response = await request(app).get('/synthetic-course/workspace');
    expect(response.status).toBe(500);
    expect(observer).toHaveBeenCalledExactlyOnceWith(error);
    expect(response.text).not.toContain(error.message);
  });

  it('returns the safe enrollment-required contract instead of an unexpected server error', async () => {
    const app = express();
    const getLearningWorkspace = vi.fn().mockRejectedValue(new Error('COURSE_ENROLLMENT_REQUIRED'));
    app.use(CourseLearnerRouter.create({ courseProgressUseCases: { getLearningWorkspace } } as never));
    app.use((_error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => { res.status(500).json({ code: 'UNEXPECTED_ERROR' }); });
    const response = await request(app).get('/synthetic-course/workspace');
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('COURSE_ENROLLMENT_REQUIRED');
    expect(response.body.detail).toBe('COURSE_ENROLLMENT_REQUIRED');
    expect(getLearningWorkspace).toHaveBeenCalledWith('synthetic-course', 'synthetic-student');
  });
});
