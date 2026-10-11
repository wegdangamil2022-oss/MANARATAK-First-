import { describe, expect, it, vi } from 'vitest';
import { StudentWorkspaceOutboxDeliveryGateway } from '../../src/students/use-cases/StudentWorkspaceOutboxDeliveryGateway';
import { StudentWorkspaceOutboxWorker } from '../../src/students/use-cases/StudentWorkspaceOutboxWorker';

function fixture() {
  const students = {consumeIntegrationEvent:vi.fn().mockResolvedValue(true)};
  const assignments = {findByIdentityId:vi.fn().mockResolvedValue([{roleId:'student'}])};
  const identities = {findById:vi.fn().mockResolvedValue({type:'Human',status:'ACTIVE'})};
  const gateway = new StudentWorkspaceOutboxDeliveryGateway(students as any, assignments as any, identities as any);
  const entry = {
    id:'evt-1',domain:'CERTIFICATES',eventType:'CertificateRevoked',createdAt:new Date('2026-01-06T00:00:00Z'),
    aggregate:{aggregateId:'cert-1',aggregateType:'Certificate'},metadata:{schemaVersion:'1.0',sourcePhase:'Phase14'},
    payload:{studentReferenceId:'student-1',certificateId:'cert-1',status:'REVOKED',publicId:'public-1',
      reason:'private revocation reason',recipientDisplayName:'Private Student Name'},
  };
  return {students,assignments,identities,gateway,entry};
}

describe('Student certificate owner-outbox bridge', () => {
  it('projects only public-scoped certificate fields and never private owner payload', async () => {
    const {students,gateway,entry}=fixture();
    await gateway.deliver(entry as any,{idempotencyKey:'evt-1'} as any);
    expect(students.consumeIntegrationEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventId:'evt-1',sourceDomain:'CERTIFICATES',studentReferenceId:'student-1',
      sourceReferenceId:'cert-1',eventType:'CertificateRevoked',
      metadata:expect.objectContaining({certificateId:'cert-1',status:'REVOKED'}),
    }));
    const sent=JSON.stringify(vi.mocked(students.consumeIntegrationEvent).mock.calls);
    expect(sent).not.toContain('recipientDisplayName');
    expect(sent).not.toContain('private revocation reason');
  });

  it('does not accept certificate outbox payloads without P14 source attestation', async () => {
    const {students,gateway,entry}=fixture();
    await expect(gateway.deliver({...entry,metadata:{schemaVersion:'1.0'}} as any,{idempotencyKey:'evt-1'} as any))
      .rejects.toThrow('STUDENT_CERTIFICATE_EVENT_OWNER_SOURCE_REQUIRED');
    expect(students.consumeIntegrationEvent).not.toHaveBeenCalled();
  });

  it('refuses mismatched certificate aggregate or missing student references', async () => {
    const {students,gateway,entry}=fixture();
    await expect(gateway.deliver({...entry,aggregate:{aggregateId:'foreign-cert'}} as any,{idempotencyKey:'evt-1'} as any))
      .rejects.toThrow('STUDENT_WORKSPACE_CERTIFICATE_EVENT_AGGREGATE_MISMATCH');
    await expect(gateway.deliver({...entry,payload:{certificateId:'cert-1'}} as any,{idempotencyKey:'evt-1'} as any))
      .rejects.toThrow('STUDENT_WORKSPACE_CERTIFICATE_EVENT_REFERENCE_REQUIRED');
    expect(students.consumeIntegrationEvent).not.toHaveBeenCalled();
  });

  it('cannot project certificate data for a principal without a student role', async () => {
    const {students,gateway,entry,assignments}=fixture();
    assignments.findByIdentityId.mockResolvedValue([]);
    await gateway.deliver(entry as any,{idempotencyKey:'evt-1'} as any);
    expect(students.consumeIntegrationEvent).not.toHaveBeenCalled();
  });

  it('maps expiry and artifact owner events without internal render payloads', async () => {
    const {gateway,students,entry}=fixture();
    await gateway.deliver({
      ...entry,id:'evt-expire',eventType:'CertificateExpired',
      payload:{studentReferenceId:'student-1',certificateId:'cert-1',expiredAt:'2026-01-06T00:00:00Z'},
    } as any,{idempotencyKey:'evt-expire'} as any);
    expect(students.consumeIntegrationEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventType:'CertificateExpired',metadata:expect.objectContaining({status:'EXPIRED'}),
    }));
    students.consumeIntegrationEvent.mockClear();
    await gateway.deliver({
      ...entry,id:'evt-artifact',eventType:'CertificateArtifactsRendered',
      payload:{studentReferenceId:'student-1',certificateId:'cert-1',certificatePdfAssetId:'asset-1',renderMetadata:{secret:'never-forward'}},
    } as any,{idempotencyKey:'evt-artifact'} as any);
    const mapped=vi.mocked(students.consumeIntegrationEvent).mock.calls[0][0];
    expect(mapped.metadata).toHaveProperty('certificatePdfAssetId','asset-1');
    expect(JSON.stringify(mapped)).not.toContain('never-forward');
  });

  it('projects a trusted certificate archival status without forwarding private reasons',async()=>{
    const {students,gateway,entry}=fixture();
    await gateway.deliver({...entry,eventType:'CertificateArchived',payload:{
      studentReferenceId:'student-1',certificateId:'cert-1',status:'ARCHIVED',
      serialNumber:'number-1',reason:'private reason',recipientDisplayName:'private name',
    }} as any,{idempotencyKey:'evt-1'});
    expect(students.consumeIntegrationEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventType:'CertificateArchived',metadata:expect.objectContaining({status:'ARCHIVED'}),
    }));
    const forwarded=JSON.stringify(students.consumeIntegrationEvent.mock.calls);
    expect(forwarded).not.toContain('private reason');
    expect(forwarded).not.toContain('private name');
  });

  it('projects owner snapshots after a late student-role assignment using stable event ids', async () => {
    const {students,assignments,identities}=fixture();
    const learning={listForStudent:vi.fn().mockResolvedValue([{
      enrollmentId:'enroll-1',courseId:'course-1',courseSlug:'course',
      courseName:'Study',status:'COMPLETED',progressPercentage:100,
      enrolledAt:new Date('2026-01-01T00:00:00Z'),completedAt:new Date('2026-01-05T00:00:00Z'),
    }])};
    const certificates={listForStudent:vi.fn().mockResolvedValue([{
      id:'cert-1',status:'REVOKED',issuedAt:new Date('2026-01-03T00:00:00Z'),
      publicId:'pub-1',serialNumber:'serial',verificationCode:'code',
      courseDisplayName:'Study',
    }])};
    const gateway=new StudentWorkspaceOutboxDeliveryGateway(students as any, assignments as any,
      identities as any, learning as any, certificates as any);
    const entry={id:'role-event-1',domain:'AUTHORIZATION',eventType:'RoleAssignmentCreated',
      createdAt:new Date('2026-01-10T00:00:00Z'),metadata:{},payload:{roleId:'student',identityId:'student-1'}};
    await gateway.deliver(entry as any,{idempotencyKey:'role-event-1'} as any);
    expect(learning.listForStudent).toHaveBeenCalledWith('student-1',51);
    expect(certificates.listForStudent).toHaveBeenCalledWith('student-1',51);
    expect(students.consumeIntegrationEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventId:'role-event-1:learning:enroll-1',eventType:'CourseCompleted',
      sourceDomain:'COURSES',studentReferenceId:'student-1',
    }));
    expect(students.consumeIntegrationEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventId:'role-event-1:certificate:cert-1',eventType:'CertificateRevoked',
      sourceDomain:'CERTIFICATES',studentReferenceId:'student-1',
    }));
  });

  it('does not claim full catch-up when a source has more records than the bounded page', async () => {
    const {students,assignments,identities}=fixture();
    const learning={listForStudent:vi.fn().mockResolvedValue(
      Array.from({length:51},(_,i)=>({enrollmentId:`e-${i}`,courseId:`c-${i}`})),
    )};
    const gateway=new StudentWorkspaceOutboxDeliveryGateway(students as any,assignments as any,
      identities as any,learning as any);
    const entry={id:'role-2',domain:'AUTHORIZATION',eventType:'RoleAssignmentCreated',
      createdAt:new Date(),metadata:{},payload:{roleId:'student',identityId:'student-1'}};
    await expect(gateway.deliver(entry as any,{idempotencyKey:'role-2'} as any))
      .rejects.toThrow('STUDENT_LEARNING_CATCHUP_PAGINATION_REQUIRED');
    expect(students.consumeIntegrationEvent).toHaveBeenCalledTimes(1);
  });

  it('reconciles more than 50 owner enrollments through bounded pages without dropping a tail',async()=>{
    const {students,assignments,identities}=fixture();
    const enrollments=Array.from({length:62},(_,i)=>({
      enrollmentId:`e-${i}`,courseId:`c-${i}`,courseName:`Course ${i}`,
      courseSlug:`slug-${i}`,status:'ACTIVE',progressPercentage:35,
      enrolledAt:new Date('2026-01-01T00:00:00Z'),
    }));
    const learning={listPageForStudent:vi.fn().mockImplementation(async(
      studentReferenceId:string,limit:number,cursor?:string,
    )=>{
      expect(studentReferenceId).toBe('student-1');
      expect(limit).toBe(50);
      const offset=cursor?Number(cursor):0;
      const items=enrollments.slice(offset,offset+limit);
      return {items,nextCursor:offset+items.length<enrollments.length?String(offset+items.length):null};
    }),listForStudent:vi.fn()};
    const gateway=new StudentWorkspaceOutboxDeliveryGateway(students as any,
      assignments as any,identities as any,learning as any);
    const role={
      id:'role-many',domain:'AUTHORIZATION',eventType:'RoleAssignmentCreated',
      createdAt:new Date('2026-01-03T00:00:00Z'),
      payload:{roleId:'student',identityId:'student-1'},metadata:{},
    };
    await gateway.deliver(role as any,{idempotencyKey:role.id});
    expect(learning.listPageForStudent).toHaveBeenCalledTimes(2);
    expect(learning.listForStudent).not.toHaveBeenCalled();
    expect(students.consumeIntegrationEvent).toHaveBeenCalledTimes(63);
    expect(students.consumeIntegrationEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventId:'role-many:learning:e-61',sourceDomain:'COURSES',
      metadata:expect.objectContaining({courseName:'Course 61',progressPercentage:35}),
    }));
  });

  it('rejects non-advancing cursors before repeatedly projecting the same owner page',async()=>{
    const {students,assignments,identities}=fixture();
    const learning={listPageForStudent:vi.fn().mockResolvedValue({
      items:[{enrollmentId:'enroll-1',courseId:'c1',enrolledAt:new Date()}],nextCursor:'same',
    })};
    const gateway=new StudentWorkspaceOutboxDeliveryGateway(students as any,
      assignments as any,identities as any,learning as any);
    const role={id:'role-cycle',domain:'AUTHORIZATION',eventType:'RoleAssignmentCreated',
      createdAt:new Date(),metadata:{},payload:{roleId:'student',identityId:'student-1'}};
    await expect(gateway.deliver(role as any,{idempotencyKey:'role-cycle'}))
      .rejects.toThrow('STUDENT_OWNER_CATCHUP_CURSOR_INVALID');
    expect(learning.listPageForStudent).toHaveBeenCalledTimes(2);
  });

  it('preserves certificate lifecycle status during paged backfill',async()=>{
    const {students,assignments,identities}=fixture();
    const certificates={listPageForStudent:vi.fn()
      .mockResolvedValueOnce({items:[{id:'cert-a',publicId:'p-a',status:'ACTIVE',issuedAt:new Date('2026-01-01')}],nextCursor:'cert-a'})
      .mockResolvedValueOnce({items:[{id:'cert-b',publicId:'p-b',status:'REVOKED',issuedAt:new Date('2026-02-01')}],nextCursor:null})};
    const gateway=new StudentWorkspaceOutboxDeliveryGateway(students as any,
      assignments as any,identities as any,undefined,certificates as any);
    const role={id:'role-cert',domain:'AUTHORIZATION',eventType:'RoleAssignmentCreated',
      createdAt:new Date(),metadata:{},payload:{roleId:'student',identityId:'student-1'}};
    await gateway.deliver(role as any,{idempotencyKey:role.id});
    expect(certificates.listPageForStudent).toHaveBeenCalledTimes(2);
    expect(students.consumeIntegrationEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventId:'role-cert:certificate:cert-b',eventType:'CertificateRevoked',
    }));
  });

  it('does not run source catch-up for suspended identities', async () => {
    const {students,assignments,identities}=fixture();
    identities.findById.mockResolvedValue({type:'Human',status:'SUSPENDED'});
    const learning={listForStudent:vi.fn()};
    const gateway=new StudentWorkspaceOutboxDeliveryGateway(students as any,assignments as any,
      identities as any,learning as any);
    await gateway.deliver({id:'role-3',domain:'AUTHORIZATION',eventType:'RoleAssignmentCreated',
      createdAt:new Date(),metadata:{},payload:{roleId:'student',identityId:'student-1'}} as any,
      {idempotencyKey:'role-3'} as any);
    expect(learning.listForStudent).not.toHaveBeenCalled();
    expect(students.consumeIntegrationEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventType:'StudentIdentitySuspended',eventId:'role-3:lifecycle',
    }));
  });

  it('claims certificate lifecycle events but leaves rendering to P14', async () => {
    const dispatcher={dispatchBatch:vi.fn().mockResolvedValue({claimed:0,processed:0,failed:0,exhausted:0})};
    const worker=new StudentWorkspaceOutboxWorker(dispatcher as any);
    await worker.runCertificatesOnce('worker-test');
    expect(dispatcher.dispatchBatch).toHaveBeenCalledWith(expect.objectContaining({
      workerId:'worker-test',domain:'CERTIFICATES',
      eventTypes:['CertificateIssued','CertificateRevoked','CertificateReissued','CertificateRenewed','CertificateExpired','CertificateArtifactsRendered','CertificateArchived'],
    }));
  });
});
