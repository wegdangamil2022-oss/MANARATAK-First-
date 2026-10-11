import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { StudentSupportAdminRouter } from '../../../../src/presentation/api/router/StudentSupportAdminRouter';
import { AuditHelper } from '../../../../src/presentation/audit/AuditHelper';

function fixture(granted: string[]) {
  const workspace = {
    listSupportWorkspaces: vi.fn().mockResolvedValue({ items: [], nextCursor: null, hasMore: false }),
    listSupportTriage: vi.fn().mockResolvedValue({items:[],total:0,hasMore:false,nextCursor:null}),
    resetLayout: vi.fn().mockResolvedValue({studentReferenceId:'student-1',version:2}),
    getSupportWorkspaceDetail: vi.fn().mockResolvedValue({studentReferenceId:'student-1',status:'ACTIVE'}),
  };
  const hydration = { getSupportDetail: vi.fn().mockResolvedValue({
    studentReferenceId: 'student-1', linkedSummaries: {activeCourseCount:null,certificateCount:null,unreadNotificationCount:0},
  }) };
  const tracker = {
    listSupportPage:vi.fn().mockResolvedValue({items:[],total:0,hasMore:false,nextCursor:null}),
    listSupportHistory:vi.fn().mockResolvedValue({items:[],hasMore:false,nextCursor:null}),
  };
  const services={listSupportAwaitingPaymentStudents:vi.fn().mockResolvedValue({
    items:[{studentReferenceId:'student-1'}],total:1,hasMore:false,nextPage:null,
  })};
  const identities={findById:vi.fn().mockResolvedValue({id:'student-1',type:'Human',status:'ACTIVE'})};
  const roleAssignments={findByIdentityId:vi.fn().mockResolvedValue([{roleId:'student'}])};
  const evaluator = { evaluatePermission: vi.fn().mockImplementation(async (_id: string, permission: string) =>
    ({ isGranted: granted.includes(permission) })) };
  const app = express();
  app.use(express.json());
  app.use((req,_res,next) => { (req as any).authUserId = 'support-1'; next(); });
  app.use('/admin/students', StudentSupportAdminRouter.create({
    studentWorkspaceUseCases: workspace as any,
    studentDashboardHydrationService: hydration as any,
    studentApplicationTrackerUseCases: tracker as any,
    studentServiceRequestUseCases: services as any,
    identityRepository: identities as any,
    roleAssignmentRepository: roleAssignments as any,
    authEvaluatorService: evaluator as any,
    auditRecordRepo: {} as any,
  }));
  app.use((_err:any,_req:any,res:any,_next:any)=>res.status(500).json({error:'AUDIT_UNAVAILABLE'}));
  return { app, workspace, hydration, evaluator, tracker, identities, roleAssignments, services };
}

describe('StudentSupportAdminRouter authorization boundary', () => {
  it('rejects support list and direct detail requests without support authorization', async () => {
    const {app,hydration,workspace} = fixture([]);
    expect((await request(app).get('/admin/students/support')).status).toBe(403);
    expect((await request(app).get('/admin/students/support/student-1')).status).toBe(403);
    expect(hydration.getSupportDetail).not.toHaveBeenCalled();
    expect(workspace.listSupportWorkspaces).not.toHaveBeenCalled();
  });

  it('audits list reads without storing the search text or student PII', async () => {
    const audit=vi.spyOn(AuditHelper,'recordMutation').mockResolvedValue(undefined);
    try {
      const {app}=fixture(['admin:students:support']);
      const result=await request(app).get('/admin/students/support?query=privateStudentName');
      expect(result.status).toBe(200);
      expect(audit).toHaveBeenCalledWith(expect.anything(),expect.anything(),
        expect.objectContaining({
          action:'STUDENT_SUPPORT_LIST_VIEW',
          metadata:{purpose:'student-support-search',filtered:true,count:0},
        }),{reliability:'REQUIRED',principal:'REQUIRED'});
      expect(JSON.stringify(audit.mock.calls)).not.toContain('privateStudentName');
    } finally {audit.mockRestore();}
  });

  it('restricts provisioning diagnosis and returns only minimal reconciliation state',async()=>{
    const denied=fixture([]);
    expect((await request(denied.app).get('/admin/students/support/student-1/provisioning-diagnostic')).status).toBe(403);
    expect(denied.identities.findById).not.toHaveBeenCalled();
    const audit=vi.spyOn(AuditHelper,'recordMutation').mockResolvedValue(undefined);
    try{
      const {app,workspace,identities,roleAssignments}=fixture(['admin:students:support']);
      workspace.getSupportWorkspaceDetail.mockRejectedValue(new Error('STUDENT_WORKSPACE_NOT_FOUND'));
      const response=await request(app).get('/admin/students/support/student-1/provisioning-diagnostic');
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({code:'ROLE_EVENT_PENDING',studentRolePresent:true,workspaceStatus:null});
      expect(response.body).not.toHaveProperty('identity');
      expect(audit).toHaveBeenCalledWith(expect.anything(),expect.anything(),
        expect.objectContaining({action:'STUDENT_SUPPORT_PROVISIONING_DIAGNOSTIC_VIEW',
          metadata:{purpose:'provisioning-triage',resultCode:'ROLE_EVENT_PENDING'}}),
        {reliability:'REQUIRED',principal:'REQUIRED'});
      expect(identities.findById).toHaveBeenCalledWith('student-1');
      expect(roleAssignments.findByIdentityId).toHaveBeenCalledWith('student-1');
    }finally{audit.mockRestore();}
  });

  it('denies all support triage reads without the support permission',async()=>{
    const {app,workspace}=fixture([]);
    expect((await request(app).get('/admin/students/support/triage?kind=SYNC_FAILED')).status).toBe(403);
    expect(workspace.listSupportTriage).not.toHaveBeenCalled();
  });
  it('requires an explicit supported P15 triage kind and mandatory audit',async()=>{
    const audit=vi.spyOn(AuditHelper,'recordMutation').mockResolvedValue(undefined);
    try {
      const {app,workspace}=fixture(['admin:students:support']);
      expect((await request(app).get('/admin/students/support/triage?kind=FOREIGN_SERVICES')).status).toBe(400);
      const res=await request(app).get('/admin/students/support/triage?kind=SYNC_FAILED&limit=12');
      expect(res.status).toBe(200);
      expect(workspace.listSupportTriage).toHaveBeenCalledWith({kind:'SYNC_FAILED',limit:12});
      expect(audit).toHaveBeenCalledWith(expect.anything(),expect.anything(),
        expect.objectContaining({action:'STUDENT_SUPPORT_TRIAGE_LIST_VIEW',
          metadata:{purpose:'student-support-triage',kind:'SYNC_FAILED',returned:0}}),
        {reliability:'REQUIRED',principal:'REQUIRED'});
    }finally{audit.mockRestore();}
  });

  it('forbids P20 payment triage for support users lacking the service owner grant',async()=>{
    const {app,services}=fixture(['admin:students:support']);
    const result=await request(app).get('/admin/students/support/triage/service-awaiting-payment');
    expect(result.status).toBe(403);
    expect(services.listSupportAwaitingPaymentStudents).not.toHaveBeenCalled();
  });

  it('returns minimal P20 service triage rows only after required audit',async()=>{
    const audit=vi.spyOn(AuditHelper,'recordMutation').mockResolvedValue(undefined);
    try{
      const {app,services}=fixture(['admin:students:support','admin:services:manage']);
      const response=await request(app).get('/admin/students/support/triage/service-awaiting-payment?page=2&limit=12');
      expect(response.status).toBe(200);
      expect(services.listSupportAwaitingPaymentStudents).toHaveBeenCalledWith(2,12);
      expect(response.body).toMatchObject({
        items:[{studentReferenceId:'student-1',triageKind:'SERVICE_AWAITING_PAYMENT',status:'AWAITING_PAYMENT'}],
        total:1,hasMore:false,nextPage:null,
      });
      expect(response.body.items[0]).not.toHaveProperty('requestParameters');
      expect(audit).toHaveBeenCalledWith(expect.anything(),expect.anything(),
        expect.objectContaining({action:'STUDENT_SUPPORT_SERVICE_TRIAGE_VIEW',
          metadata:{purpose:'service-payment-triage',ownerDomain:'P20',returned:1}}),
        {reliability:'REQUIRED',principal:'REQUIRED'});
    }finally{audit.mockRestore();}
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
      expect(hydration.getSupportDetail).toHaveBeenCalledWith('student-1');
      expect(audit).toHaveBeenCalledWith(expect.anything(),expect.anything(),
        expect.objectContaining({action:'STUDENT_SUPPORT_DETAIL_VIEW'}), {reliability:'REQUIRED',principal:'REQUIRED'});
    } finally { audit.mockRestore(); }
  });

  it('never loads owner data on base profile read, even for an elevated support user', async () => {
    const audit=vi.spyOn(AuditHelper,'recordMutation').mockResolvedValue(undefined);
    try{
      const {app,hydration,evaluator}=fixture([
        'admin:students:support','admin:courses:manage','admin:certificates:view','admin:services:manage',
      ]);
      expect((await request(app).get('/admin/students/support/student-1')).status).toBe(200);
      expect(hydration.getSupportDetail).toHaveBeenCalledWith('student-1');
      expect(evaluator.evaluatePermission).not.toHaveBeenCalledWith(
        'support-1','admin:courses:manage',expect.anything(),
      );
    }finally{audit.mockRestore();}
  });

  it('enforces domain-specific RBAC before any lazy owner read', async () => {
    const {app,hydration}=fixture(['admin:students:support']);
    expect((await request(app).get('/admin/students/support/student-1/owner/learning')).status).toBe(403);
    expect((await request(app).get('/admin/students/support/student-1/owner/certificates')).status).toBe(403);
    expect((await request(app).get('/admin/students/support/student-1/owner/services')).status).toBe(403);
    expect(hydration.getSupportDetail).not.toHaveBeenCalled();
  });

  it('reads only the explicitly authorized owner and audits before disclosing it', async () => {
    const audit=vi.spyOn(AuditHelper,'recordMutation').mockResolvedValue(undefined);
    try {
      const {app,hydration}=fixture(['admin:students:support','admin:courses:manage']);
      hydration.getSupportDetail.mockResolvedValue({
        ownerReadStatus:{learning:'AVAILABLE',certificates:'RESTRICTED',services:'RESTRICTED'},
        ownerReadProvenance:{learning:{source:'P13',queriedAt:'2026-10-11T00:00:00Z',returned:1,limit:12,complete:true}},
        learning:[{courseId:'c1',status:'ACTIVE'}],
        linkedSummaries:{activeCourseCount:1,certificateCount:null,unreadNotificationCount:0},
      });
      const result=await request(app).get('/admin/students/support/student-1/owner/learning');
      expect(result.status).toBe(200);
      expect(result.body.learning).toHaveLength(1);
      expect(result.body).not.toHaveProperty('certificates');
      expect(hydration.getSupportDetail).toHaveBeenCalledWith('student-1',{
        learning:true,certificates:false,services:false,
      });
      expect(audit).toHaveBeenCalledWith(expect.anything(),expect.anything(),
        expect.objectContaining({action:'STUDENT_SUPPORT_OWNER_TAB_VIEW',
          metadata:{purpose:'student-support-owner-tab',domain:'learning'}}),
        {reliability:'REQUIRED',principal:'REQUIRED'});
    }finally{audit.mockRestore();}
  });

  it('does not disclose lazy owner data when mandatory audit fails', async () => {
    const audit=vi.spyOn(AuditHelper,'recordMutation').mockRejectedValue(new Error('AUDIT_OFFLINE'));
    try {
      const {app}=fixture(['admin:students:support','admin:certificates:view']);
      expect((await request(app).get('/admin/students/support/student-1/owner/certificates')).status).toBe(500);
    }finally{audit.mockRestore();}
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

  it('checks student scope and purpose before disclosing tracker history',async()=>{
    const denied=fixture([]);
    expect((await request(denied.app).get('/admin/students/support/student-1/application-trackers/t-1/history?purpose=CASE_REVIEW')).status).toBe(403);
    expect(denied.tracker.listSupportHistory).not.toHaveBeenCalled();
    const audit=vi.spyOn(AuditHelper,'recordMutation').mockResolvedValue(undefined);
    try{
      const {app,tracker}=fixture(['admin:students:support']);
      expect((await request(app).get('/admin/students/support/student-1/application-trackers/t-1/history')).status).toBe(400);
      const result=await request(app).get('/admin/students/support/student-1/application-trackers/t-1/history?purpose=CASE_REVIEW&limit=10');
      expect(result.status).toBe(200);
      expect(tracker.listSupportHistory).toHaveBeenCalledWith('student-1','t-1',10,undefined);
      expect(audit).toHaveBeenCalledWith(expect.anything(),expect.anything(),
        expect.objectContaining({action:'STUDENT_SUPPORT_APPLICATION_TRACKER_HISTORY_VIEW',
          metadata:{purpose:'CASE_REVIEW',view:'tracker-event-history'}}),
        {reliability:'REQUIRED',principal:'REQUIRED'});
    }finally{audit.mockRestore();}
  });

  it('passes the opaque owner history cursor without logging it',async()=>{
    const audit=vi.spyOn(AuditHelper,'recordMutation').mockResolvedValue(undefined);
    try {
      const {app,tracker}=fixture(['admin:students:support']);
      const response=await request(app).get(
        '/admin/students/support/student-1/application-trackers/t-1/history?purpose=CASE_REVIEW&limit=3&cursor=opaque-test',
      );
      expect(response.status).toBe(200);
      expect(tracker.listSupportHistory).toHaveBeenCalledWith('student-1','t-1',3,'opaque-test');
      expect(JSON.stringify(audit.mock.calls)).not.toContain('opaque-test');
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
