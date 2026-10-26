import { Router, Request, Response, NextFunction } from 'express';
import type {CertificateReadModelService} from '@manaratak/application';
import { z } from 'zod';
import { IPrincipalAccessValidator, ISessionManager, ITokenProvider } from '@manaratak/core';
import { CourseProgressUseCases, LearningPathUseCases, ProcessAssetLifecycleUseCase } from '@manaratak/application';
import { CourseProgressStatus } from '@manaratak/domain';
import { AuthMiddleware } from '../../middleware/AuthMiddleware.js';
import { createStudentRoleGuard } from '../../security/StudentRoleGuard.js';
import type { IRoleAssignmentRepository } from '@manaratak/domain';
import { createCanonicalIdempotencyMiddleware } from '../../middleware/CanonicalIdempotencyMiddleware.js';
import type { PrismaApiIdempotencyStore } from '@manaratak/infrastructure';
import { problemDetails } from '../../http/ProblemDetails.js';

export class CourseLearnerRouter {
  public static create(cradle: {
    certificateReadModelService?:CertificateReadModelService;
    processAssetLifecycleUseCase: ProcessAssetLifecycleUseCase;
    roleAssignmentRepository: IRoleAssignmentRepository;
    courseProgressUseCases: CourseProgressUseCases;
    learningPathUseCases: LearningPathUseCases;
    tokenProvider: ITokenProvider;
    sessionManager: ISessionManager;
    principalAccessValidator: IPrincipalAccessValidator;
    apiIdempotencyStore: PrismaApiIdempotencyStore;
  }): Router {
    const router = Router();
    const { courseProgressUseCases, learningPathUseCases, tokenProvider, sessionManager, principalAccessValidator, apiIdempotencyStore } = cradle;
    const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) =>
      Promise.resolve(fn(req, res, next)).catch((error) => {
        if (error instanceof Error && error.message === 'COURSE_RESUME_ENROLLMENT_CONFLICT') {
          res.status(409).json({ error: error.message });
          return;
        }
        if (
          error instanceof Error &&
          (error.message === 'COURSE_LESSON_LOCKED' ||
            error.message === 'COURSE_ENROLLMENT_REQUIRED' ||
            error.message === 'COURSE_FINANCIAL_CLEARANCE_REQUIRED' ||
            error.message.startsWith('COURSE_ENROLLMENT_NOT_ACCESSIBLE:') ||
            error.message.startsWith('COURSE_ENROLLMENT_NOT_ACTIVE:'))
        ) {
        res.status(403).type('application/problem+json').json(problemDetails({
          status: 403, code: error.message, detail: error.message,
          instance: req.originalUrl, traceId: String(req.headers['x-request-id'] || 'unknown'),
        }));
        return;
      }
        next(error);
      });
    router.use(new AuthMiddleware(tokenProvider, sessionManager, principalAccessValidator).generate());
    router.use(createStudentRoleGuard(cradle.roleAssignmentRepository));
    router.use(createCanonicalIdempotencyMiddleware({ store: apiIdempotencyStore, requireKey: true }));
    const student = (req: Request) => { if (!req.authUserId) throw new Error('STUDENT_AUTHENTICATION_REQUIRED'); return req.authUserId; };
    const context = (req: Request) => ({ actorId: student(req), actorType: 'IDENTITY', correlationId: (req.headers['x-correlation-id'] as string | undefined) || (req.headers['x-request-id'] as string | undefined), source: 'student-course-api' });

    const lessonProgressSchema = z.object({ status: z.nativeEnum(CourseProgressStatus), progressPercentage: z.number().min(0).max(100), timeSpentSeconds: z.number().int().nonnegative().optional(), metadata: z.record(z.string(), z.unknown()).optional() });
    const submitSchema = z.object({ answers: z.record(z.string(), z.unknown()) });

    router.post('/learning-paths/:pathId/enroll', asyncHandler(async (req: Request, res: Response) => res.status(201).json(await learningPathUseCases.enroll(req.params.pathId, student(req)))));
    router.get('/learning-paths/:pathId/available-courses', asyncHandler(async (req: Request, res: Response) => res.json({ data: await learningPathUseCases.availableCourses(req.params.pathId, student(req)) })));
    router.post('/learning-paths/:pathId/progress/refresh', asyncHandler(async (req: Request, res: Response) => res.json(await learningPathUseCases.refreshProgress(req.params.pathId, student(req), context(req)))));

    router.post('/:courseId/lessons/:lessonId/assets/:assetReferenceId/delivery-grant', asyncHandler(async (req: Request, res: Response) => {
      const assetId = await courseProgressUseCases.resolveLearningAsset(req.params.courseId, req.params.lessonId, req.params.assetReferenceId, student(req));
      res.json(await cradle.processAssetLifecycleUseCase.requestDeliveryGrant({assetId, expiresInSeconds:300}));
    }));
    router.post('/:courseId/enroll', asyncHandler(async (req: Request, res: Response) => res.status(201).json(await courseProgressUseCases.enroll(req.params.courseId, student(req)))));
    router.post(
      '/:courseId/resume',
      asyncHandler(async (req: Request, res: Response) => {
        const body = z.object({ lessonId: z.string().uuid() }).strict().parse(req.body);
        res.json(
          await courseProgressUseCases.saveResumeLesson(
            req.params.courseId,
            student(req),
            body.lessonId,
          ),
        );
      }),
    );
    router.get(
      '/:courseId/certificate-status',asyncHandler(async(req:Request,res:Response)=>{
        const owner=student(req),snapshot=await courseProgressUseCases.getProgress(req.params.courseId,owner);
        res.setHeader('Cache-Control','no-store');
        if(!snapshot?.completion)return res.json({status:'NOT_COMPLETED',certificateId:null,pdfAvailable:false});
        if(!snapshot.completion.eligibleForCertificate)return res.json({status:'NOT_ELIGIBLE',certificateId:null,pdfAvailable:false});
        if(!cradle.certificateReadModelService)return res.status(503).json({error:'CERTIFICATE_STATUS_UNAVAILABLE'});
        res.json(await cradle.certificateReadModelService.courseCompletionStatus(owner,req.params.courseId,snapshot.completion.id));
      }));
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
