import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { StudentSupportAdminRouter } from '../../../../src/presentation/api/router/StudentSupportAdminRouter';
import { AuditHelper } from '../../../../src/presentation/audit/AuditHelper';

function fixture(granted: string[]) {
  const workspace = {
    listSupportWorkspaces: vi.fn().mockResolvedValue({ items: [], nextCursor: null, hasMore: false }),
    resetLayout: vi.fn().mockResolvedValue({studentReferenceId:'student-1',version:2}),
    getSupportWorkspaceDetail: vi.fn().mockResolvedValue({studentReferenceId:'student-1',status:'ACTIVE'}),
  };
  const hydration = { getSupportDetail: vi.fn().mockResolvedValue({
    studentReferenceId: 'student-1', linkedSummaries: {activeCourseCount:null,certificateCount:null,unreadNotificationCount:0},
  }) };
  const tracker = { listSupportPage: vi.fn().mockResolvedValue({items:[],total:0,hasMore:false,nextCursor:null}) };
  const evaluator = { evaluatePermission: vi.fn().mockImplementation(async (_id: string, permission: string) =>
    ({ isGranted: granted.includes(permission) })) };
  const app = express();
  app.use(express.json());
  app.use((req,_res,next) => { (req as any).authUserId = 'support-1'; next(); });
  app.use('/admin/students', StudentSupportAdminRouter.create({
    studentWorkspaceUseCases: workspace as any,
    studentDashboardHydrationService: hydration as any,
    studentApplicationTrackerUseCases: tracker as any,
    authEvaluatorService: evaluator as any,
    auditRecordRepo: {} as any,
  }));
  app.use((_err:any,_req:any,res:any,_next:any)=>res.status(500).json({error:'AUDIT_UNAVAILABLE'}));
  return { app, workspace, hydration, evaluator, tracker };
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

  it('requires support authorization and purpose for paged application-tracker review', async () => {
    const denied = fixture([]);
    expect((await request(denied.app).get('/admin/students/support/student-1/application-trackers?purpose=CASE_REVIEW')).status).toBe(403);
    expect(denied.tracker.listSupportPage).not.toHaveBeenCalled();
    const authorized = fixture(['admin:students:support']);
    expect((await request(authorized.app).get('/admin/students/support/student-1/application-trackers')).status).toBe(400);
    expect(authorized.tracker.listSupportPage).not.toHaveBeenCalled();
  });

  it('limits case review output to the scoped tracker page and audits purpose', async () => {
    const audit = vi.spyOn(AuditHelper, 'recordMutation').mockResolvedValue(undefined);
    try {
      const {app,tracker,workspace} = fixture(['admin:students:support']);
      tracker.listSupportPage.mockResolvedValue({items:[{id:'t-1',stage:'DOCUMENTS',status:'ACTIVE'}],total:1,hasMore:false,nextCursor:null});
      const response = await request(app).get('/admin/students/support/student-1/application-trackers?purpose=CASE_REVIEW&limit=20');
      expect(response.status).toBe(200);
      expect(tracker.listSupportPage).toHaveBeenCalledWith('student-1',{limit:20,cursor:undefined});
      expect(workspace.getSupportWorkspaceDetail).toHaveBeenCalledWith('student-1');
      expect(audit).toHaveBeenCalledWith(expect.anything(),expect.anything(),
        expect.objectContaining({action:'STUDENT_SUPPORT_APPLICATION_TRACKERS_VIEW',metadata:{purpose:'CASE_REVIEW',view:'application-tracker-page'}}),
        {reliability:'REQUIRED',principal:'REQUIRED'});
    } finally {audit.mockRestore();}
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
