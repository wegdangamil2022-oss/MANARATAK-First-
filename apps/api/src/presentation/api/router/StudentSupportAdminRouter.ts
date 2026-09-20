import { Router, type Request } from 'express';
import { z } from 'zod';
import { StudentWorkspaceStatus, type IAuditRecordRepository, type AuthorizationEvaluatorService } from '@manaratak/domain';
import { StudentWorkspaceUseCases } from '@manaratak/application';
import { AuditHelper } from '../../audit/AuditHelper.js';

export class StudentSupportAdminRouter {
  public static create({ studentWorkspaceUseCases, auditRecordRepo, authEvaluatorService }: { studentWorkspaceUseCases: StudentWorkspaceUseCases; auditRecordRepo?: IAuditRecordRepository; authEvaluatorService: AuthorizationEvaluatorService }): Router {
    const router = Router();
    const listSchema = z.object({ query: z.string().trim().max(120).optional(), status: z.nativeEnum(StudentWorkspaceStatus).optional(), limit: z.coerce.number().int().min(1).max(100).optional(), cursor: z.string().trim().max(2048).optional() }).strict();
    const resetSchema = z.object({ expectedVersion: z.number().int().positive(), reason: z.string().trim().min(6).max(1000) }).strict();
    const requireSupportMutation = async (req: Request, res: any, next: any) => {
      const principalId = req.authUserId;
      if (!principalId) return void res.status(401).json({ error: { code: 'ADMIN_AUTH_REQUIRED', message: 'Admin authentication is required.' } });
      const decision = await authEvaluatorService.evaluatePermission(principalId, 'admin:students:support:mutate', { ip: req.ip, requestTime: new Date() });
      if (!decision.isGranted) return void res.status(403).json({ error: { code: 'ADMIN_PERMISSION_DENIED', message: 'Student support mutation permission is required.' } });
      next();
    };

    router.get('/support', async (req, res, next) => {
      try { res.status(200).json(await studentWorkspaceUseCases.listSupportWorkspaces(listSchema.parse(req.query))); } catch (error) { next(error); }
    });

    router.get('/support/:studentReferenceId', async (req, res, next) => {
      try { res.status(200).json(await studentWorkspaceUseCases.getSupportWorkspaceDetail(req.params.studentReferenceId)); } catch (error) { next(error); }
    });

    router.post('/support/:studentReferenceId/reset-layout', requireSupportMutation, async (req: Request, res, next) => {
      const studentReferenceId = req.params.studentReferenceId;
      try {
        const body = resetSchema.parse(req.body);
        const result = await studentWorkspaceUseCases.resetLayout(studentReferenceId, body.expectedVersion);
        await AuditHelper.recordMutation(auditRecordRepo, req, { action: 'STUDENT_SUPPORT_RESET_LAYOUT', category: 'STUDENT_SUPPORT', targetType: 'STUDENT_WORKSPACE', targetId: studentReferenceId, result: 'SUCCESS', metadata: { reason: body.reason } });
        res.status(200).json(result);
      } catch (error: any) {
        await AuditHelper.recordMutation(auditRecordRepo, req, { action: 'STUDENT_SUPPORT_RESET_LAYOUT', category: 'STUDENT_SUPPORT', targetType: 'STUDENT_WORKSPACE', targetId: studentReferenceId, result: 'FAILURE', error });
        next(error);
      }
    });

    return router;
  }
}
