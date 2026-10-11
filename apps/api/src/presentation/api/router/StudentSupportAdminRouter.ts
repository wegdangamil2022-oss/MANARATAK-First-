import { Router, type Request } from 'express';
import { z } from 'zod';
import {
  StudentWorkspaceStatus,
  type IAuditRecordRepository,
  type AuthorizationEvaluatorService,
  type IIdentityRepository,
  type IRoleAssignmentRepository,
} from '@manaratak/domain';
import { StudentWorkspaceUseCases, StudentDashboardHydrationService, StudentApplicationTrackerUseCases } from '@manaratak/application';
import { AuditHelper } from '../../audit/AuditHelper.js';

export class StudentSupportAdminRouter {
  public static create({
    studentWorkspaceUseCases,
    studentDashboardHydrationService,
    studentApplicationTrackerUseCases,
    identityRepository,
    roleAssignmentRepository,
    auditRecordRepo,
    authEvaluatorService,
  }: {
    studentWorkspaceUseCases: StudentWorkspaceUseCases;
    studentDashboardHydrationService: StudentDashboardHydrationService;
    studentApplicationTrackerUseCases: StudentApplicationTrackerUseCases;
    identityRepository?: IIdentityRepository;
    roleAssignmentRepository?: IRoleAssignmentRepository;
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
        const filters = listSchema.parse(req.query);
        const result = await studentWorkspaceUseCases.listSupportWorkspaces(filters);
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'STUDENT_SUPPORT_LIST_VIEW', category: 'STUDENT_SUPPORT',
          targetType: 'STUDENT_WORKSPACE_COLLECTION', targetId: 'student-support-list',
          result: 'SUCCESS', metadata: {
            purpose: 'student-support-search', filtered: Boolean(filters.query || filters.status),
            count: result.items.length,
          },
        }, { reliability: 'REQUIRED', principal: 'REQUIRED' });
        res.status(200).json(result);
      } catch (error) { next(error); }
    });

    // FGA-15-002: server-side triage from P15-owned state only, with its own signed cursor.
    router.get('/support/triage', requireSupportRead, async (req,res,next)=>{
      try{
        const input=z.object({
          kind:z.enum(['SYNC_FAILED','SYNC_PENDING','APPLICATION_OVERDUE']),
          limit:z.coerce.number().int().min(1).max(50).optional(),
          cursor:z.string().trim().max(2048).optional(),
        }).strict().parse(req.query);
        const result=await studentWorkspaceUseCases.listSupportTriage(input);
        await AuditHelper.recordMutation(auditRecordRepo,req,{
          action:'STUDENT_SUPPORT_TRIAGE_LIST_VIEW',category:'STUDENT_SUPPORT',
          targetType:'STUDENT_WORKSPACE_COLLECTION',targetId:'student-support-triage',
          result:'SUCCESS',metadata:{purpose:'student-support-triage',kind:input.kind,
            returned:result.items.length},
        },{reliability:'REQUIRED',principal:'REQUIRED'});
        res.status(200).json(result);
      }catch(error){next(error);}
    });

    router.get('/support/:studentReferenceId', requireSupportRead, async (req, res, next) => {
      try {
        const studentReferenceId = z.string().trim().min(1).max(128).parse(req.params.studentReferenceId);
        // Base support details are P15-only; opening a profile cannot hydrate P13/P14/P20 data.
        const result = await studentDashboardHydrationService.getSupportDetail(studentReferenceId);
        // Sensitive support reads have a mandatory, privacy-minimized audit record before disclosure.
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'STUDENT_SUPPORT_DETAIL_VIEW', category: 'STUDENT_SUPPORT', targetType: 'STUDENT_WORKSPACE',
          targetId: studentReferenceId, result: 'SUCCESS',
          metadata: { purpose: 'student-support-case-review', ownerScopes: { learning: false, certificates: false, services: false } },
        }, { reliability: 'REQUIRED', principal: 'REQUIRED' });
        res.status(200).json(result);
      } catch (error) { next(error); }
    });

    // STU-ADM-025: independent, on-demand owner reads. No implicit cross-domain grant.
    router.get('/support/:studentReferenceId/owner/:ownerDomain', requireSupportRead, async (req, res, next) => {
      try {
        const studentReferenceId = z.string().trim().min(1).max(128).parse(req.params.studentReferenceId);
        const domain = z.enum(['learning','certificates','services']).parse(req.params.ownerDomain);
        const requiredPermission = {
          learning: 'admin:courses:manage',
          certificates: 'admin:certificates:view',
          services: 'admin:services:manage',
        }[domain];
        const permitted = await authEvaluatorService.evaluatePermission(
          req.authUserId!, requiredPermission, {ip: req.ip, requestTime: new Date()},
        );
        if (!permitted.isGranted)
          return void res.status(403).json({error:{code:'STUDENT_SUPPORT_OWNER_READ_DENIED'}});
        const grants = {
          learning: domain === 'learning', certificates: domain === 'certificates',
          services: domain === 'services',
        };
        const detail = await studentDashboardHydrationService.getSupportDetail(studentReferenceId, grants);
        const payload = {
          domain,
          status: detail.ownerReadStatus?.[domain] ?? 'DEGRADED',
          provenance: detail.ownerReadProvenance?.[domain] ?? null,
          ...(domain === 'learning'
            ? { learning: detail.learning ?? null, activeCourseCount: detail.linkedSummaries.activeCourseCount }
            : domain === 'certificates'
              ? { certificates: detail.certificates ?? null, certificateCount: detail.linkedSummaries.certificateCount }
              : { serviceRequestCount: detail.serviceRequestCount ?? null,
                  recentServiceRequests: detail.recentServiceRequests ?? null }),
        };
        await AuditHelper.recordMutation(auditRecordRepo, req, {
          action: 'STUDENT_SUPPORT_OWNER_TAB_VIEW', category: 'STUDENT_SUPPORT',
          targetType: 'STUDENT_WORKSPACE', targetId: studentReferenceId,
          result: 'SUCCESS', metadata: {purpose:'student-support-owner-tab', domain},
        }, {reliability:'REQUIRED',principal:'REQUIRED'});
        res.status(200).json(payload);
      } catch (error) {next(error);}
    });

    // P15 provisioning diagnostic is a read-only owner comparison; it never creates
    // a workspace, assigns a role, retries source events or reveals identity PII.
    router.get('/support/:studentReferenceId/provisioning-diagnostic', requireSupportRead, async (req,res,next)=>{
      try {
        if (!identityRepository || !roleAssignmentRepository)
          throw new Error('STUDENT_PROVISIONING_DIAGNOSTIC_NOT_CONFIGURED');
        const studentReferenceId=z.string().trim().min(1).max(128).parse(req.params.studentReferenceId);
        const [identity, assignments, workspace]=await Promise.all([
          identityRepository.findById(studentReferenceId),
          roleAssignmentRepository.findByIdentityId(studentReferenceId),
          studentWorkspaceUseCases.getSupportWorkspaceDetail(studentReferenceId)
            .catch((error:unknown)=>{
              if (error instanceof Error && error.message==='STUDENT_WORKSPACE_NOT_FOUND') return null;
              throw error;
            }),
        ]);
        const studentRolePresent=assignments.some(role=>role.roleId==='student');
        const code=!identity?'IDENTITY_NOT_FOUND':
          identity.type!=='Human'?'NON_HUMAN_IDENTITY':
          !studentRolePresent?'STUDENT_ROLE_MISSING':
          !workspace?'ROLE_EVENT_PENDING':
          workspace.status==='SUSPENDED'?'WORKSPACE_SUSPENDED':
          workspace.status==='ARCHIVED'?'WORKSPACE_ARCHIVED':
          workspace.status==='INITIALIZING'?'WORKSPACE_INITIALIZING':'HEALTHY';
        const result={
          code,workspaceStatus:workspace?.status??null,
          studentRolePresent,
          // Source-reported status and event counts are not a permission to mutate.
          provisioningHealth:workspace?.provisioningHealth??null,
          checkedAt:new Date().toISOString(),
        };
        await AuditHelper.recordMutation(auditRecordRepo,req,{
          action:'STUDENT_SUPPORT_PROVISIONING_DIAGNOSTIC_VIEW',category:'STUDENT_SUPPORT',
          targetType:'STUDENT_WORKSPACE',targetId:studentReferenceId,result:'SUCCESS',
          metadata:{purpose:'provisioning-triage',resultCode:code},
        },{reliability:'REQUIRED',principal:'REQUIRED'});
        res.status(200).json(result);
      } catch(error){next(error);}
    });

    // FGA-15-001: read-only case review; bounded P15 tracker projection with explicit purpose.
    router.get('/support/:studentReferenceId/application-trackers', requireSupportRead, async (req, res, next) => {
      try {
        const studentReferenceId = z.string().trim().min(1).max(128).parse(req.params.studentReferenceId);
        const query = z.object({
          purpose: z.enum(['CASE_REVIEW', 'APPLICATION_STATUS_INQUIRY', 'SYNC_DIAGNOSTIC']),
          limit: z.coerce.number().int().min(1).max(50).optional(),
          cursor: z.string().trim().max(2048).optional(),
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

    router.get('/support/:studentReferenceId/application-trackers/:trackerId/history',requireSupportRead,
      async(req,res,next)=>{
        try{
          const studentReferenceId=z.string().trim().min(1).max(128).parse(req.params.studentReferenceId);
          const trackerId=z.string().trim().min(1).max(128).parse(req.params.trackerId);
          const query=z.object({
            purpose:z.enum(['CASE_REVIEW','APPLICATION_STATUS_INQUIRY','SYNC_DIAGNOSTIC']),
            limit:z.coerce.number().int().min(1).max(30).optional(),
            cursor:z.string().trim().max(2048).optional(),
          }).strict().parse(req.query);
          await studentWorkspaceUseCases.getSupportWorkspaceDetail(studentReferenceId);
          const result=await studentApplicationTrackerUseCases.listSupportHistory(
            studentReferenceId,trackerId,query.limit??20,query.cursor,
          );
          await AuditHelper.recordMutation(auditRecordRepo,req,{
            action:'STUDENT_SUPPORT_APPLICATION_TRACKER_HISTORY_VIEW',
            category:'STUDENT_SUPPORT',targetType:'STUDENT_APPLICATION_TRACKER',
            targetId:trackerId,result:'SUCCESS',
            metadata:{purpose:query.purpose,view:'tracker-event-history'},
          },{reliability:'REQUIRED',principal:'REQUIRED'});
          res.status(200).json(result);
        }catch(error){next(error);}
      },
    );

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
      if (code === 'STUDENT_WORKSPACE_NOT_FOUND' || code === 'STUDENT_APPLICATION_TRACKER_NOT_FOUND')
        return void res.status(404).json({ error: { code, message: 'السجل المطلوب غير موجود.' } });
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
