import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { IPrincipalAccessValidator, ISessionManager, ITokenProvider } from '@manaratak/core';
import { CourseProgressUseCases, LearningPathUseCases } from '@manaratak/application';
import { CourseProgressStatus } from '@manaratak/domain';
import { AuthMiddleware } from '../../middleware/AuthMiddleware.js';
import { createCanonicalIdempotencyMiddleware } from '../../middleware/CanonicalIdempotencyMiddleware.js';
import type { PrismaApiIdempotencyStore } from '@manaratak/infrastructure';

export class CourseLearnerRouter {
  public static create(cradle: { courseProgressUseCases: CourseProgressUseCases; learningPathUseCases: LearningPathUseCases; tokenProvider: ITokenProvider; sessionManager: ISessionManager; principalAccessValidator: IPrincipalAccessValidator; apiIdempotencyStore: PrismaApiIdempotencyStore }): Router {
    const router = Router();
    const { courseProgressUseCases, learningPathUseCases, tokenProvider, sessionManager, principalAccessValidator, apiIdempotencyStore } = cradle;
    const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res, next)).catch(next);
    router.use(new AuthMiddleware(tokenProvider, sessionManager, principalAccessValidator).generate());
    router.use(createCanonicalIdempotencyMiddleware({ store: apiIdempotencyStore, requireKey: true }));
    const student = (req: Request) => { if (!req.authUserId) throw new Error('STUDENT_AUTHENTICATION_REQUIRED'); return req.authUserId; };
    const context = (req: Request) => ({ actorId: student(req), actorType: 'IDENTITY', correlationId: (req.headers['x-correlation-id'] as string | undefined) || (req.headers['x-request-id'] as string | undefined), source: 'student-course-api' });

    const lessonProgressSchema = z.object({ status: z.nativeEnum(CourseProgressStatus), progressPercentage: z.number().min(0).max(100), timeSpentSeconds: z.number().int().nonnegative().optional(), metadata: z.record(z.string(), z.unknown()).optional() });
    const submitSchema = z.object({ answers: z.record(z.string(), z.unknown()) });

    router.post('/learning-paths/:pathId/enroll', asyncHandler(async (req: Request, res: Response) => res.status(201).json(await learningPathUseCases.enroll(req.params.pathId, student(req)))));
    router.get('/learning-paths/:pathId/available-courses', asyncHandler(async (req: Request, res: Response) => res.json({ data: await learningPathUseCases.availableCourses(req.params.pathId, student(req)) })));
    router.post('/learning-paths/:pathId/progress/refresh', asyncHandler(async (req: Request, res: Response) => res.json(await learningPathUseCases.refreshProgress(req.params.pathId, student(req), context(req)))));

    router.post('/:courseId/enroll', asyncHandler(async (req: Request, res: Response) => res.status(201).json(await courseProgressUseCases.enroll(req.params.courseId, student(req)))));
    router.get('/:courseId/workspace', asyncHandler(async (req: Request, res: Response) => res.json(await courseProgressUseCases.getLearningWorkspace(req.params.courseId, student(req)))));
    router.get('/:courseId/progress', asyncHandler(async (req: Request, res: Response) => res.json(await courseProgressUseCases.getProgress(req.params.courseId, student(req)))));
    router.put('/:courseId/lessons/:lessonId/progress', asyncHandler(async (req: Request, res: Response) => {
      const body = lessonProgressSchema.parse(req.body);
      res.json(await courseProgressUseCases.markLessonProgress({ courseId: req.params.courseId, lessonId: req.params.lessonId, studentReferenceId: student(req), ...body }));
    }));
    router.post('/:courseId/quizzes/:quizId/attempts', asyncHandler(async (req: Request, res: Response) => {
      res.status(201).json(await courseProgressUseCases.startQuizAttempt({ courseId: req.params.courseId, quizId: req.params.quizId, studentReferenceId: student(req) }));
    }));
    router.post('/:courseId/quiz-attempts/:attemptId/submit', asyncHandler(async (req: Request, res: Response) => {
      const body = submitSchema.parse(req.body);
      res.json(await courseProgressUseCases.submitQuizAttempt({ attemptId: req.params.attemptId, courseId: req.params.courseId, studentReferenceId: student(req), answers: body.answers }));
    }));
    router.post('/:courseId/complete', asyncHandler(async (req: Request, res: Response) => res.json(await courseProgressUseCases.completeCourse(req.params.courseId, student(req), context(req)))));
    return router;
  }
}
