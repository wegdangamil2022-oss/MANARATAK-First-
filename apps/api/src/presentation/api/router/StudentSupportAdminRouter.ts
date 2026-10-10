import { Router, type Request } from 'express';
import { z } from 'zod';
import {
  StudentWorkspaceStatus,
  type IAuditRecordRepository,
  type AuthorizationEvaluatorService,
} from '@manaratak/domain';
import { StudentWorkspaceUseCases, StudentDashboardHydrationService, StudentApplicationTrackerUseCases } from '@manaratak/application';
import { AuditHelper } from '../../audit/AuditHelper.js';

export class StudentSupportAdminRouter {
  public static create({
    studentWorkspaceUseCases,
    studentDashboardHydrationService,
    studentApplicationTrackerUseCases,
    auditRecordRepo,
    authEvaluatorService,
  }: {
    studentWorkspaceUseCases: StudentWorkspaceUseCases;
    studentDashboardHydrationService: StudentDashboardHydrationService;
    studentApplicationTrackerUseCases: StudentApplicationTrackerUseCases;
    auditRecordRepo?: IAuditRecordRepository;
    authEvaluatorService: AuthorizationEvaluatorService;
  }): Router {
    const router = Router();
    const listSchema = z
      .object({
        query: z.string().trim().max(120).optional(),
        status: z.preprocess(
          (value) => (value === 'all' || value === '' ? undefined : value),
          z.nativeEnum(StudentWorkspaceStatus).optional(),
        ),
        limit: z.coerce.number().int().min(1).max(100).optional(),
        cursor: z.string().trim().max(2048).optional(),
      })
      .strict();
    const resetSchema = z
      .object({
        expectedVersion: z.number().int().positive(),
        reason: z.string().trim().min(6).max(1000),
      })
      .strict();
    const requireSupportRead = async (req: Request, res: any, next: any) => {
      try {
        if (!req.authUserId) return void res.status(401).json({ error: { code: 'ADMIN_AUTH_REQUIRED' } });
        const decision = await authEvaluatorService.evaluatePermission(req.authUserId, 'admin:students:support', { ip: req.ip, requestTime: new Date() });
        if (!decision.isGranted) return void res.status(403).json({ error: { code: 'ADMIN_PERMISSION_DENIED' } });
        next();
      } catch (error) { next(error); }
    };
    const requireSupportMutation = async (req: Request, res: any, next: any) => {
      const principalId = req.authUserId;
      if (!principalId)
        return void res.status(401).json({
          error: { code: 'ADMIN_AUTH_REQUIRED', message: 'Admin authentication is required.' },
        });
      const decision = await authEvaluatorService.evaluatePermission(
        principalId,
        'admin:students:support:mutate',
        { ip: req.ip, requestTime: new Date() },
      );
      if (!decision.isGranted)
        return void res.status(403).json({
          error: {
            code: 'ADMIN_PERMISSION_DENIED',
            message: 'Student support mutation permission is required.',
          },
        });
      next();
    };

    router.get('/support', requireSupportRead, async (req, res, next) => {
      try {
        res
          .status(200)
          .json(await studentWorkspaceUseCases.listSupportWorkspaces(listSchema.parse(req.query)));
      } catch (error) {
        next(error);
      }
    });

    router.get('/support/:studentReferenceId', requireSupportRead, async (req, res, next) => {
      try {
        const studentReferenceId = z.string().trim().min(1).max(128).parse(req.params.studentReferenceId);
        const permission = async (name: string) => (await authEvaluatorService.evaluatePermission(
          req.authUserId!, name, { ip: req.ip, requestTime: new Date() },
        )).isGranted;
        const [learning, certificates, services] = await Promise.all([
          permission('admin:courses:manage'),
          permission('admin:certificates:view'),
          permission('admin:services:manage'),
        ]);
        const result = await studentDashboardHydrationService.getSupportDetail(studentReferenceId, { learning, certificates, services });
        // Sensitive support reads have a mandatory, privacy-minimized audit record before disclosure.
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'STUDENT_SUPPORT_DETAIL_VIEW', category: 'STUDENT_SUPPORT', targetType: 'STUDENT_WORKSPACE',
          targetId: studentReferenceId, result: 'SUCCESS',
          metadata: { purpose: 'student-support-case-review', ownerScopes: { learning, certificates, services } },
        }, { reliability: 'REQUIRED', principal: 'REQUIRED' });
        res.status(200).json(result);
      } catch (error) { next(error); }
    });

    // FGA-15-001: read-only case review; bounded P15 tracker projection with explicit purpose.
    router.get('/support/:studentReferenceId/application-trackers', requireSupportRead, async (req, res, next) => {
      try {
        const studentReferenceId = z.string().trim().min(1).max(128).parse(req.params.studentReferenceId);
        const query = z.object({
          purpose: z.enum(['CASE_REVIEW', 'APPLICATION_STATUS_INQUIRY', 'SYNC_DIAGNOSTIC']),
          limit: z.coerce.number().int().min(1).max(50).optional(),
          cursor: z.string().trim().max(256).optional(),
        }).strict().parse(req.query);
        // Return 404 for an invalid student rather than showing a plausible empty list.
        await studentWorkspaceUseCases.getSupportWorkspaceDetail(studentReferenceId);
        const data = await studentApplicationTrackerUseCases.listSupportPage(studentReferenceId, {
          limit: query.limit, cursor: query.cursor,
        });
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'STUDENT_SUPPORT_APPLICATION_TRACKERS_VIEW',
          category: 'STUDENT_SUPPORT', targetType: 'STUDENT_WORKSPACE',
          targetId: studentReferenceId, result: 'SUCCESS',
          metadata: { purpose: query.purpose, view: 'application-tracker-page' },
        }, { reliability: 'REQUIRED', principal: 'REQUIRED' });
        res.status(200).json(data);
      } catch (error) { next(error); }
    });

    router.post(
      '/support/:studentReferenceId/reset-layout',
      requireSupportMutation,
      async (req: Request, res, next) => {
        const studentReferenceId = req.params.studentReferenceId;
        try {
          const body = resetSchema.parse(req.body);
          if (!req.authUserId) return void res.status(401).json({ error: { code: 'ADMIN_AUTH_REQUIRED' } });
          const result = await studentWorkspaceUseCases.resetLayout(
            studentReferenceId, body.expectedVersion,
            { actorId: req.authUserId, reason: body.reason, correlationId: String(req.headers['x-correlation-id'] ?? req.headers['x-request-id'] ?? '').slice(0, 128) },
          );
          res.status(200).json(result);
        } catch (error: any) {
          await AuditHelper.recordMutation(auditRecordRepo, req, {
            action: 'STUDENT_SUPPORT_RESET_LAYOUT',
            category: 'STUDENT_SUPPORT',
            targetType: 'STUDENT_WORKSPACE',
            targetId: studentReferenceId,
            result: 'FAILURE',
            error,
          });
          next(error);
        }
      },
    );

    router.use((error: any, _req: any, res: any, next: any) => {
      if (error instanceof z.ZodError)
        return void res.status(400).json({
          error: { code: 'STUDENT_SUPPORT_VALIDATION_ERROR', message: 'بيانات الطلب غير صالحة.' },
        });
      const code = error instanceof Error ? error.message : '';
      if (code === 'STUDENT_SUPPORT_CURSOR_INVALID')
        return void res
          .status(400)
          .json({ error: { code, message: 'تعذر قراءة الصفحة التالية. حدّث نتائج البحث.' } });
      if (code === 'STUDENT_WORKSPACE_NOT_FOUND')
        return void res.status(404).json({ error: { code, message: 'حساب الطالب غير موجود.' } });
      if (code === 'STUDENT_WORKSPACE_VERSION_CONFLICT')
        return void res.status(409).json({
          error: { code, message: 'تغيرت بيانات الطالب. حدّث التفاصيل قبل إعادة المحاولة.' },
        });
      if (
        [
          'STUDENT_WORKSPACE_SUSPENDED',
          'STUDENT_WORKSPACE_ARCHIVED',
          'STUDENT_WORKSPACE_INITIALIZING',
        ].includes(code)
      )
        return void res
          .status(423)
          .json({ error: { code, message: 'إعادة ترتيب الواجهة متاحة للحساب النشط فقط.' } });
      next(error);
    });
    return router;
  }
}
