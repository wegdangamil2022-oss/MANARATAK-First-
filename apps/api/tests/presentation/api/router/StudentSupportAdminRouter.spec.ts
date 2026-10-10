import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { StudentSupportAdminRouter } from '../../../../src/presentation/api/router/StudentSupportAdminRouter';
import { AuditHelper } from '../../../../src/presentation/audit/AuditHelper';

function fixture(granted: string[]) {
  const workspace = {
    listSupportWorkspaces: vi.fn().mockResolvedValue({ items: [], nextCursor: null, hasMore: false }),
    resetLayout: vi.fn().mockResolvedValue({studentReferenceId:'student-1',version:2}),
  };
  const hydration = { getSupportDetail: vi.fn().mockResolvedValue({
    studentReferenceId: 'student-1', linkedSummaries: {activeCourseCount:null,certificateCount:null,unreadNotificationCount:0},
  }) };
  const evaluator = { evaluatePermission: vi.fn().mockImplementation(async (_id: string, permission: string) =>
    ({ isGranted: granted.includes(permission) })) };
  const app = express();
  app.use(express.json());
  app.use((req,_res,next) => { (req as any).authUserId = 'support-1'; next(); });
  app.use('/admin/students', StudentSupportAdminRouter.create({
    studentWorkspaceUseCases: workspace as any,
    studentDashboardHydrationService: hydration as any,
    authEvaluatorService: evaluator as any,
    auditRecordRepo: {} as any,
  }));
  app.use((_err:any,_req:any,res:any,_next:any)=>res.status(500).json({error:'AUDIT_UNAVAILABLE'}));
  return { app, workspace, hydration, evaluator };
}

describe('StudentSupportAdminRouter authorization boundary', () => {
  it('rejects support list and direct detail requests without support authorization', async () => {
    const {app,hydration,workspace} = fixture([]);
    expect((await request(app).get('/admin/students/support')).status).toBe(403);
    expect((await request(app).get('/admin/students/support/student-1')).status).toBe(403);
    expect(hydration.getSupportDetail).not.toHaveBeenCalled();
    expect(workspace.listSupportWorkspaces).not.toHaveBeenCalled();
  });

  it('denies mutation unless elevated support-mutate permission is present', async () => {
    const {app,workspace} = fixture(['admin:students:support']);
    expect((await request(app).post('/admin/students/support/student-1/reset-layout')
      .send({expectedVersion:1,reason:'Approved by student'})).status).toBe(403);
    expect(workspace.resetLayout).not.toHaveBeenCalled();
  });

  it('never grants owner detail access merely because support access is present', async () => {
    const audit = vi.spyOn(AuditHelper,'recordMutation').mockResolvedValue(undefined);
    try {
      const {app,hydration} = fixture(['admin:students:support']);
      expect((await request(app).get('/admin/students/support/student-1')).status).toBe(200);
      expect(hydration.getSupportDetail).toHaveBeenCalledWith('student-1', {
        learning:false, certificates:false, services:false,
      });
      expect(audit).toHaveBeenCalledWith(expect.anything(),expect.anything(),
        expect.objectContaining({action:'STUDENT_SUPPORT_DETAIL_VIEW'}), {reliability:'REQUIRED',principal:'REQUIRED'});
    } finally { audit.mockRestore(); }
  });

  it('captures the real support actor in the atomic reset command', async () => {
    const {app,workspace} = fixture(['admin:students:support','admin:students:support:mutate']);
    expect((await request(app).post('/admin/students/support/student-1/reset-layout')
      .send({expectedVersion:1,reason:'Approved by student'})).status).toBe(200);
    expect(workspace.resetLayout).toHaveBeenCalledWith('student-1',1,expect.objectContaining({
      actorId:'support-1',reason:'Approved by student',
    }));
  });
});
