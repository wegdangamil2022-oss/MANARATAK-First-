import { describe, expect, it, vi } from 'vitest';
import { StudentSavedItemType, StudentWorkspaceStatus } from '@manaratak/domain';
import { PrismaStudentWorkspaceRepository } from '../../src/students/PrismaStudentWorkspaceRepository';

const workspace = {
  id: 'workspace-1',
  studentReferenceId: 'student-1',
  status: StudentWorkspaceStatus.ACTIVE,
  version: 1,
  layoutPreferences: {},
  notificationMatrix: {},
  privacyPreferences: {},
  accessibilityPreferences: {},
  metadata: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('PrismaStudentWorkspaceRepository', () => {
  it('composes learning and certificate projections without duplicating ownership', async () => {
    const db = {
      studentWorkspace: { findUnique: vi.fn().mockResolvedValue(workspace) },
      studentSavedItem: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
      studentSavedCollection: { findMany: vi.fn().mockResolvedValue([]) },
      studentTimelineEntry: { findMany: vi.fn().mockResolvedValue([]) },
      studentRecentActivity: { findMany: vi.fn().mockResolvedValue([]) },
      studentLearningProjection: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'enrollment-1',
            enrollmentId: 'enrollment-1',
            courseId: 'course-1',
            courseSlug: 'arabic-course',
            courseName: 'دورة عربية',
            status: 'ACTIVE',
            progressPercentage: 65,
            enrolledAt: new Date(),
            lastAccessedAt: new Date(),
            completedAt: null,
          },
        ]),
      },
      studentCertificateReadProjection: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'certificate-1',
            publicId: 'public-1',
            serialNumber: 'CERT-1',
            verificationCode: 'VERIFY-1',
            status: 'ACTIVE',
            courseDisplayName: 'دورة عربية',
            issuedAt: new Date(),
          },
        ]),
      },
      studentRecentlyViewed: { findMany: vi.fn().mockResolvedValue([]) },
      studentNotificationProjection: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
      studentPersonalStatistics: { findUnique: vi.fn().mockResolvedValue({ savedItems: 0, activeCourses: 1, completedCourses: 0, averageCourseProgress: 65, certificates: 1, unreadNotifications: 0 }) },
    };
    const repository = new PrismaStudentWorkspaceRepository(db as any);

    const result = await repository.getDashboardSummary('student-1');

    expect(result?.activeCourseEnrollmentCount).toBe(1);
    expect(result?.certificateCount).toBe(1);
    expect(result?.courseEnrollments[0].courseName).toBe('دورة عربية');
    expect(result?.partialFailures).toEqual([]);
  });

  it('does not allow generic upsert to provision a missing workspace', async () => {
    const tx = {
      $queryRaw:vi.fn().mockResolvedValue([]), studentWorkspace: { findUnique: vi.fn().mockResolvedValue(null) } };
    const repository = new PrismaStudentWorkspaceRepository({ $transaction: (callback: (client: typeof tx) => unknown) => callback(tx) } as any);
    await expect(repository.upsertWorkspace({ studentReferenceId: 'student-1' })).rejects.toThrow('STUDENT_WORKSPACE_PROVISIONING_PENDING');
  });

  it('blocks personal mutations while the workspace is suspended', async () => {
    const tx = {
      $queryRaw:vi.fn().mockResolvedValue([]),
      studentWorkspace: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ ...workspace, status: StudentWorkspaceStatus.SUSPENDED }),
      },
      studentSavedItem: { upsert: vi.fn() },
    };
    const repository = new PrismaStudentWorkspaceRepository({
      $transaction: (callback: (client: typeof tx) => unknown) => callback(tx),
    } as any);

    await expect(
      repository.saveItem({
        studentReferenceId: 'student-1',
        entityType: StudentSavedItemType.COURSE,
        entityId: 'course-1',
      }),
    ).rejects.toThrow('STUDENT_WORKSPACE_SUSPENDED');
    expect(tx.studentSavedItem.upsert).not.toHaveBeenCalled();
  });

  it('blocks personal mutations after workspace archival', async () => {
    const tx = {
      $queryRaw:vi.fn().mockResolvedValue([]),
      studentWorkspace: { findUnique: vi.fn().mockResolvedValue({ ...workspace, status: StudentWorkspaceStatus.ARCHIVED }) },
      studentSavedItem: { upsert: vi.fn() },
    };
    const repository = new PrismaStudentWorkspaceRepository({ $transaction: (callback: (client: typeof tx) => unknown) => callback(tx) } as any);
    await expect(repository.saveItem({ studentReferenceId: 'student-1', entityType: StudentSavedItemType.COURSE, entityId: 'course-1' })).rejects.toThrow('STUDENT_WORKSPACE_ARCHIVED');
    expect(tx.studentSavedItem.upsert).not.toHaveBeenCalled();
  });

  it('deduplicates upstream events before projecting timeline and notifications', async () => {
    const tx = {
      $queryRaw:vi.fn().mockResolvedValue([]),
      studentWorkspaceEventInbox: {
        findUnique: vi.fn().mockResolvedValue({ id: 'existing-inbox' }),
        create: vi.fn(),
        update: vi.fn(),
      },
      studentWorkspace: { findUnique: vi.fn() },
      studentTimelineEntry: { create: vi.fn() },
      studentNotificationProjection: { create: vi.fn() },
    };
    const repository = new PrismaStudentWorkspaceRepository({
      $transaction: (callback: (client: typeof tx) => unknown) => callback(tx),
    } as any);

    const processed = await repository.ingestIntegrationEvent({
      eventId: 'event-1',
      studentReferenceId: 'student-1',
      eventType: 'CourseCompleted',
      sourceDomain: 'LEARNING',
      title: 'أكملت دورة',
      occurredAt: new Date(),
    });

    expect(processed).toBe(false);
    expect(tx.studentTimelineEntry.create).not.toHaveBeenCalled();
    expect(tx.studentNotificationProjection.create).not.toHaveBeenCalled();
  });

  it('initializes a workspace from StudentIdentityCreated exactly once', async () => {
    const tx = {
      $queryRaw:vi.fn().mockResolvedValue([]),
      studentWorkspaceEventInbox: {
        findUnique: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'inbox-1' }),
        create: vi.fn().mockResolvedValue({}), update: vi.fn().mockResolvedValue({}),
      },
      studentWorkspace: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ ...workspace, status: StudentWorkspaceStatus.INITIALIZING }), update: vi.fn().mockResolvedValue({ ...workspace, status: StudentWorkspaceStatus.ACTIVE, version: 2 }) },
      studentSavedCollection: { create: vi.fn().mockResolvedValue({}) },
      studentPersonalStatistics: { create: vi.fn().mockResolvedValue({}) },
      studentTimelineEntry: { create: vi.fn().mockResolvedValue({}) },
      auditRecord: { create: vi.fn().mockResolvedValue({}) },
      transactionalOutboxRecord: { create: vi.fn().mockResolvedValue({}) },
    };
    const repository = new PrismaStudentWorkspaceRepository({ $transaction: (callback: (client: typeof tx) => unknown) => callback(tx) } as any);
    const event = { eventId: 'identity-event-1', studentReferenceId: 'student-1', eventType: 'StudentIdentityCreated', sourceDomain: 'IDENTITY', title: 'تم إنشاء هوية الطالب', occurredAt: new Date() };

    await expect(repository.ingestIntegrationEvent(event)).resolves.toBe(true);
    await expect(repository.ingestIntegrationEvent(event)).resolves.toBe(false);
    expect(tx.studentWorkspace.create).toHaveBeenCalledOnce();
    expect(tx.studentSavedCollection.create).toHaveBeenCalledOnce();
    expect(tx.studentSavedCollection.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ type: 'FAVORITES' }) }));
    expect(tx.transactionalOutboxRecord.create).toHaveBeenCalledTimes(2);
  });

  it('persists ordinary collections as PERSONAL independently of caller input ordering', async () => {
    const tx = {
      $queryRaw:vi.fn().mockResolvedValue([]),
      studentWorkspace: { findUnique: vi.fn().mockResolvedValue(workspace) },
      studentSavedCollection: { create: vi.fn().mockImplementation(({ data }) => ({ ...data, _count: { items: 0 }, createdAt: new Date(), updatedAt: new Date() })) },
      auditRecord: { create: vi.fn() }, transactionalOutboxRecord: { create: vi.fn() },
    };
    const repository = new PrismaStudentWorkspaceRepository({ $transaction: (callback: (client: typeof tx) => unknown) => callback(tx) } as any);
    await repository.createCollection({ studentReferenceId: 'student-1', name: 'قائمتي' });
    expect(tx.studentSavedCollection.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ type: 'PERSONAL' }) }));
  });

  it('persists every privacy toggle, advances version, and records the authoritative decision', async () => {
    const updated = { ...workspace, version: 2, privacyPreferences: { retainSearchHistory: false, allowPersonalization: true, allowProductAnalytics: true, publicProfileEnabled: false } };
    const tx = {
      $queryRaw:vi.fn().mockResolvedValue([]),
      studentWorkspace: { findUnique: vi.fn().mockResolvedValueOnce({ ...workspace, privacyPreferences: { retainSearchHistory: true, allowPersonalization: false, allowProductAnalytics: false, publicProfileEnabled: false } }).mockResolvedValueOnce(updated), updateMany: vi.fn().mockResolvedValue({count:1}) },
      studentPrivacyConsentDecision: { create: vi.fn() }, auditRecord: { create: vi.fn() }, transactionalOutboxRecord: { create: vi.fn() },
    };
    const repository = new PrismaStudentWorkspaceRepository({ $transaction: (callback: (client: typeof tx) => unknown) => callback(tx) } as any);
    const decision = await repository.updatePrivacyConsent({
      studentReferenceId: 'student-1', expectedVersion: 1, actorId: 'student-1', purpose: 'settings',
      privacyPreferences: updated.privacyPreferences,
    });
    expect(tx.studentWorkspace.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({version:1,status:'ACTIVE'}), data: expect.objectContaining({ privacyPreferences: updated.privacyPreferences, version: { increment: 1 } }) }));
    expect(tx.studentPrivacyConsentDecision.create).toHaveBeenCalledOnce();
    expect(decision).toMatchObject({ workspaceVersion: 2, afterPreferences: updated.privacyPreferences });
    expect(decision.changedFields).toEqual(expect.arrayContaining(['retainSearchHistory', 'allowPersonalization', 'allowProductAnalytics']));
  });

  it('does not duplicate privacy preferences into audit or outbox payloads', async () => {
    const preferences = { retainSearchHistory: true, allowPersonalization: false, allowProductAnalytics: false, publicProfileEnabled: false };
    const next = { ...workspace, version: 2, privacyPreferences: preferences };
    const tx = {
      $queryRaw:vi.fn().mockResolvedValue([]),
      studentWorkspace: {
        findUnique: vi.fn().mockResolvedValueOnce({ ...workspace, privacyPreferences: {} }).mockResolvedValueOnce(next),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      studentPrivacyConsentDecision: { create: vi.fn() },
      auditRecord: { create: vi.fn() },
      transactionalOutboxRecord: { create: vi.fn() },
    };
    const repo = new PrismaStudentWorkspaceRepository({ $transaction: (fn: (db: typeof tx) => unknown) => fn(tx) } as any);
    await repo.updatePrivacyConsent({ studentReferenceId: 'student-1', expectedVersion: 1, actorId: 'student-1', purpose: 'privacy-settings', privacyPreferences: preferences });
    const audit = JSON.stringify(vi.mocked(tx.auditRecord.create).mock.calls);
    const outbox = JSON.stringify(vi.mocked(tx.transactionalOutboxRecord.create).mock.calls);
    expect(audit).not.toContain('beforePreferences');
    expect(audit).not.toContain('afterPreferences');
    expect(outbox).not.toContain('beforePreferences');
    expect(outbox).not.toContain('afterPreferences');
    expect(tx.studentPrivacyConsentDecision.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ beforePreferences: expect.anything(), afterPreferences: preferences }),
    }));
  });

  it('denies stale consent updates before writing the decision or the outbox', async () => {
    const tx = {
      $queryRaw:vi.fn().mockResolvedValue([]),
      studentWorkspace: {
        findUnique: vi.fn().mockResolvedValue({ ...workspace, privacyPreferences: {} }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      studentPrivacyConsentDecision: { create: vi.fn() },
      auditRecord: { create: vi.fn() }, transactionalOutboxRecord: { create: vi.fn() },
    };
    const repo = new PrismaStudentWorkspaceRepository({ $transaction: (fn: (db: typeof tx) => unknown) => fn(tx) } as any);
    await expect(repo.updatePrivacyConsent({
      studentReferenceId: 'student-1', expectedVersion: 1, actorId: 'student-1',
      purpose: 'settings', privacyPreferences: { retainSearchHistory: true, allowPersonalization: false, allowProductAnalytics: false, publicProfileEnabled: false },
    })).rejects.toThrow('STUDENT_WORKSPACE_VERSION_CONFLICT');
    expect(tx.studentPrivacyConsentDecision.create).not.toHaveBeenCalled();
    expect(tx.auditRecord.create).not.toHaveBeenCalled();
    expect(tx.transactionalOutboxRecord.create).not.toHaveBeenCalled();
  });

  it('refuses orphan certificate artifact updates until the owner-issued projection exists', async () => {
    const tx = {
      $queryRaw:vi.fn().mockResolvedValue([]),
      studentCertificateReadProjection: {findUnique:vi.fn().mockResolvedValue(null),upsert:vi.fn(),updateMany:vi.fn()},
    };
    const repo = new PrismaStudentWorkspaceRepository(tx as any);
    await expect((repo as any).projectIntegrationEvent(tx,{
      eventId:'evt-artifacts', studentReferenceId:'student-1', sourceDomain:'CERTIFICATES',
      eventType:'CertificateArtifactsRendered', sourceReferenceId:'cert-1', title:'Rendered',
      occurredAt:new Date(), metadata:{certificateId:'cert-1',certificatePdfAssetId:'asset-1'},
    })).rejects.toThrow('STUDENT_CERTIFICATE_PROJECTION_PENDING');
    expect(tx.studentCertificateReadProjection.upsert).not.toHaveBeenCalled();
    expect(tx.studentCertificateReadProjection.updateMany).not.toHaveBeenCalled();
  });

  it('ignores a late certificate issue after a newer revoke was projected', async () => {
    const tx = {
      $queryRaw:vi.fn().mockResolvedValue([]),
      studentCertificateReadProjection: {
        findUnique: vi.fn().mockResolvedValue({sourceEventId:'evt-revoke',updatedAt:new Date('2026-01-06T00:00:00Z'),status:'REVOKED'}),
        upsert: vi.fn(),
      },
      studentWorkspaceEventInbox: {
        findUnique: vi.fn().mockResolvedValue({eventType:'CertificateRevoked',payload:{occurredAt:'2026-01-06T00:00:00Z'}}),
      },
    };
    const repo = new PrismaStudentWorkspaceRepository(tx as any);
    await (repo as any).projectIntegrationEvent(tx,{
      eventId:'evt-issued',studentReferenceId:'student-1',sourceDomain:'CERTIFICATES',eventType:'CertificateIssued',
      sourceReferenceId:'cert-1',title:'Issued',occurredAt:new Date('2026-01-05T00:00:00Z'),
      metadata:{certificateId:'cert-1',status:'ACTIVE'},
    });
    expect(tx.studentCertificateReadProjection.upsert).not.toHaveBeenCalled();
  });

  it('recovers only formerly suspended events for workspaces now ACTIVE, with a transaction-scoped claim', async () => {
    const event={eventId:'course-e-1',studentReferenceId:'student-1',sourceDomain:'COURSES',
      eventType:'CourseCompleted',title:'Completed',occurredAt:'2026-10-01T12:00:00Z',sourceReferenceId:'enroll-1',metadata:{courseId:'course-1',enrollmentId:'enroll-1'}};
    const row={id:'inbox-1',eventId:'course-e-1',studentReferenceId:'student-1',
      sourceDomain:'COURSES',eventType:'CourseCompleted',payload:event};
    const tx = {
      $queryRaw:vi.fn().mockResolvedValue([]),
      studentWorkspaceEventInbox:{updateMany:vi.fn().mockResolvedValue({count:1})},
      studentWorkspace:{findUnique:vi.fn().mockResolvedValue({status:'ACTIVE'})},
    };
    const db = {
      studentWorkspaceEventInbox:{findMany:vi.fn().mockResolvedValue([row]),updateMany:vi.fn()},
      $transaction:(callback:(client:typeof tx)=>unknown)=>callback(tx),
    };
    const repository=new PrismaStudentWorkspaceRepository(db as any);
    const project=vi.fn().mockResolvedValue(undefined);
    (repository as any).projectStudentEvent=project;
    const output=await repository.replayParkedEvents(10);
    expect(output).toEqual({processed:1,failed:0});
    expect(db.studentWorkspaceEventInbox.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where:expect.objectContaining({
        processedAt:null, failureCode:'WORKSPACE_SYNC_BLOCKED_SUSPENDED',workspace:{status:'ACTIVE'},
      }),
      take:10,
    }));
    expect(tx.studentWorkspaceEventInbox.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where:{id:'inbox-1',processedAt:null,failureCode:'WORKSPACE_SYNC_BLOCKED_SUSPENDED'},
      data:expect.objectContaining({failureCode:null}),
    }));
    expect(project).toHaveBeenCalledWith(tx,expect.objectContaining({
      eventId:'course-e-1',studentReferenceId:'student-1',occurredAt:new Date('2026-10-01T12:00:00Z'),
    }));
    expect(db.studentWorkspaceEventInbox.updateMany).not.toHaveBeenCalled();
  });

  it('does not replay a parked event when another worker already claimed it', async () => {
    const row={id:'inbox-1',eventId:'e-1',studentReferenceId:'student-1',sourceDomain:'COURSES',
      eventType:'CourseCompleted',payload:{eventId:'e-1'}};
    const tx={$queryRaw:vi.fn().mockResolvedValue([]),studentWorkspaceEventInbox:{updateMany:vi.fn().mockResolvedValue({count:0})},
      studentWorkspace:{findUnique:vi.fn()}};
    const db={studentWorkspaceEventInbox:{findMany:vi.fn().mockResolvedValue([row]),updateMany:vi.fn()},
      $transaction:(callback:(client:typeof tx)=>unknown)=>callback(tx)};
    const repo=new PrismaStudentWorkspaceRepository(db as any);
    const project=vi.fn();
    (repo as any).projectStudentEvent=project;
    expect(await repo.replayParkedEvents(2)).toEqual({processed:0,failed:0});
    expect(project).not.toHaveBeenCalled();
  });

  it('quarantines malformed parked event envelopes instead of writing a timeline', async () => {
    const row={id:'inbox-1',eventId:'e-1',studentReferenceId:'student-1',sourceDomain:'COURSES',
      eventType:'CourseCompleted',payload:{eventId:'other',studentReferenceId:'student-1',
        sourceDomain:'COURSES',eventType:'CourseCompleted',occurredAt:'2026-10-01'}};
    const tx={$queryRaw:vi.fn().mockResolvedValue([]),studentWorkspaceEventInbox:{updateMany:vi.fn().mockResolvedValue({count:1})},
      studentWorkspace:{findUnique:vi.fn().mockResolvedValue({status:'ACTIVE'})}};
    const db={studentWorkspaceEventInbox:{findMany:vi.fn().mockResolvedValue([row]),
      updateMany:vi.fn().mockResolvedValue({count:1})},
      $transaction:(callback:(client:typeof tx)=>unknown)=>callback(tx)};
    const repo=new PrismaStudentWorkspaceRepository(db as any);
    const project=vi.fn();
    (repo as any).projectStudentEvent=project;
    expect(await repo.replayParkedEvents()).toEqual({processed:0,failed:1});
    expect(project).not.toHaveBeenCalled();
    expect(db.studentWorkspaceEventInbox.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data:{failureCode:'WORKSPACE_REPLAY_FAILED'},
    }));
  });

  it('scopes triage to P15 failed sync inbox facts without reading owner tables',async()=>{
    const row={id:'workspace-1',studentReferenceId:'student-1',status:'ACTIVE',version:3,
      updatedAt:new Date('2026-10-11T01:00:00Z')};
    const client={studentWorkspace:{
      count:vi.fn().mockResolvedValue(1),
      findMany:vi.fn().mockResolvedValue([row]),
    }};
    const repo=new PrismaStudentWorkspaceRepository(client as any,'triage-testing-signing-secret-32-chars-minimum');
    const result=await repo.listSupportTriage({kind:'SYNC_FAILED',limit:10});
    expect(result).toMatchObject({
      total:1,hasMore:false,nextCursor:null,
      items:[{studentReferenceId:'student-1',triageKind:'SYNC_FAILED',version:3}],
    });
    expect(client.studentWorkspace.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where:expect.objectContaining({AND:expect.arrayContaining([
        {integrationInbox:{some:{processedAt:null,failureCode:{not:null}}}},
      ])}),
      select:{id:true,studentReferenceId:true,status:true,version:true,updatedAt:true},
      take:11,
    }));
  });

  it('binds triage pagination to the selected incident category',async()=>{
    const rows=[
      {id:'a',studentReferenceId:'s-1',status:'ACTIVE',version:1,updatedAt:new Date('2026-10-11T01:00:00Z')},
      {id:'b',studentReferenceId:'s-2',status:'ACTIVE',version:1,updatedAt:new Date('2026-10-10T01:00:00Z')},
    ];
    const client={studentWorkspace:{
      count:vi.fn().mockResolvedValue(2),
      findMany:vi.fn().mockResolvedValue(rows),
    }};
    const repo=new PrismaStudentWorkspaceRepository(client as any,'triage-testing-signing-secret-32-chars-minimum');
    const page=await repo.listSupportTriage({kind:'APPLICATION_OVERDUE',limit:1});
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toBeTruthy();
    await expect(repo.listSupportTriage({kind:'SYNC_FAILED',limit:1,cursor:page.nextCursor!}))
      .rejects.toThrow('STUDENT_SUPPORT_CURSOR_INVALID');
    expect(client.studentWorkspace.findMany).toHaveBeenCalledTimes(1);
  });

  it('rejects a stale support reset without an extra audit or outbox', async () => {
    const tx = {
      $queryRaw:vi.fn().mockResolvedValue([]),
      studentWorkspace: { findUnique: vi.fn().mockResolvedValue(workspace), updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      auditRecord: { create: vi.fn() }, transactionalOutboxRecord: { create: vi.fn() },
    };
    const repo = new PrismaStudentWorkspaceRepository({ $transaction: (fn: (db: typeof tx) => unknown) => fn(tx) } as any);
    await expect(repo.resetLayout('student-1', 1, { actorId: 'support-1', reason: 'Approved support request' }))
      .rejects.toThrow('STUDENT_WORKSPACE_VERSION_CONFLICT');
    expect(tx.auditRecord.create).not.toHaveBeenCalled();
    expect(tx.transactionalOutboxRecord.create).not.toHaveBeenCalled();
  });
});

describe('P15 projection ordering and lifecycle recovery',()=>{
  it.each(['ARCHIVED','REVOKED'])('cannot reactivate a terminal %s certificate with a delayed or tied issue',async status=>{
    const tx={studentCertificateReadProjection:{findUnique:vi.fn().mockResolvedValue({status,sourceEventId:'terminal'}),upsert:vi.fn()},
      studentWorkspaceEventInbox:{findUnique:vi.fn().mockResolvedValue({eventType:`Certificate${status==='ARCHIVED'?'Archived':'Revoked'}`,payload:{occurredAt:'2026-10-10'}})}};
    const repo=new PrismaStudentWorkspaceRepository(tx as any);
    await (repo as any).projectIntegrationEvent(tx,{eventId:'issue',studentReferenceId:'s-1',sourceDomain:'CERTIFICATES',
      eventType:'CertificateIssued',occurredAt:new Date('2026-10-10'),metadata:{certificateId:'c-1',status:'ACTIVE'}});
    expect(tx.studentCertificateReadProjection.upsert).not.toHaveBeenCalled();
  });
  it('does not regress a completed enrollment when an older progress event arrives',async()=>{
    const tx={studentLearningProjection:{findUnique:vi.fn().mockResolvedValue({status:'COMPLETED',sourceEventId:'completed'}),upsert:vi.fn()},
      studentWorkspaceEventInbox:{findUnique:vi.fn().mockResolvedValue({payload:{occurredAt:'2026-10-10'}})}};
    const repo=new PrismaStudentWorkspaceRepository(tx as any);
    await (repo as any).projectIntegrationEvent(tx,{eventId:'progress',studentReferenceId:'s-1',eventType:'CourseProgressUpdated',
      occurredAt:new Date('2026-10-09'),metadata:{enrollmentId:'e-1',courseId:'c-1',status:'ACTIVE',progressPercentage:20}});
    expect(tx.studentLearningProjection.upsert).not.toHaveBeenCalled();
  });
  it('leaves a temporarily re-suspended account parked instead of quarantining it',async()=>{
    const row={id:'row-1',eventId:'e-1',studentReferenceId:'s-1',sourceDomain:'COURSES',eventType:'CourseCompleted',payload:{}};
    const tx={$queryRaw:vi.fn().mockResolvedValue([]),studentWorkspaceEventInbox:{updateMany:vi.fn().mockResolvedValue({count:1})},
      studentWorkspace:{findUnique:vi.fn().mockResolvedValue({status:'SUSPENDED'})}};
    const db={studentWorkspaceEventInbox:{findMany:vi.fn().mockResolvedValue([row]),updateMany:vi.fn()},
      $transaction:(fn:any)=>fn(tx)};
    const result=await new PrismaStudentWorkspaceRepository(db as any).replayParkedEvents();
    expect(result).toEqual({processed:0,failed:0});
    expect(tx.$queryRaw).toHaveBeenCalledOnce();
    expect(db.studentWorkspaceEventInbox.updateMany).not.toHaveBeenCalled();
  });
});

describe('P15 active-only support mutation and certificate renewal',()=>{
  it('rejects reset during initialization before a write or audit',async()=>{
    const tx={$queryRaw:vi.fn().mockResolvedValue([]),studentWorkspace:{findUnique:vi.fn().mockResolvedValue({...workspace,status:'INITIALIZING'}),updateMany:vi.fn()},auditRecord:{create:vi.fn()}};
    const repo=new PrismaStudentWorkspaceRepository({$transaction:(fn:any)=>fn(tx)} as any);
    await expect(repo.resetLayout('student-1',1,{actorId:'support-1',reason:'Support case'})).rejects.toThrow('STUDENT_WORKSPACE_INITIALIZING');
    expect(tx.studentWorkspace.updateMany).not.toHaveBeenCalled();expect(tx.auditRecord.create).not.toHaveBeenCalled();
  });
  it('marks a renewed replacement predecessor as REISSUED without reviving terminal originals',async()=>{
    const tx={studentCertificateReadProjection:{findUnique:vi.fn().mockResolvedValue(null),upsert:vi.fn(),updateMany:vi.fn()}};
    await (new PrismaStudentWorkspaceRepository(tx as any) as any).projectIntegrationEvent(tx,{
      eventId:'renewal',studentReferenceId:'s-1',eventType:'CertificateRenewed',occurredAt:new Date('2026-10-10'),
      metadata:{certificateId:'replacement',replacesCertificateId:'original',issuedAt:'2026-10-10'},
    });
    expect(tx.studentCertificateReadProjection.updateMany).toHaveBeenCalledWith({
      where:{studentReferenceId:'s-1',certificateId:'original',status:{notIn:['ARCHIVED','REVOKED']}},
      data:{status:'REISSUED',sourceEventId:'renewal'},
    });
  });
});

it('retires parked owner payloads for an archived identity and stores no new personal snapshot',async()=>{
  const tx={$queryRaw:vi.fn().mockResolvedValue([]),studentWorkspace:{findUnique:vi.fn().mockResolvedValue({...workspace,status:'ARCHIVED'})},
    studentWorkspaceEventInbox:{findUnique:vi.fn().mockResolvedValue(null),updateMany:vi.fn(),create:vi.fn()},studentTimelineEntry:{create:vi.fn()}};
  const repo=new PrismaStudentWorkspaceRepository({$transaction:(fn:any)=>fn(tx)} as any);
  expect(await repo.ingestIntegrationEvent({eventId:'archived-owner-event',studentReferenceId:'student-1',eventType:'CourseCompleted',sourceDomain:'COURSES',
    sourceReferenceId:'enroll-1',title:'Completed',occurredAt:new Date(),metadata:{enrollmentId:'enroll-1',courseId:'course-1'}})).toBe(false);
  expect(tx.studentWorkspaceEventInbox.updateMany).toHaveBeenCalledWith({
    where:{studentReferenceId:'student-1',processedAt:null},
    data:{processedAt:expect.any(Date),failureCode:'WORKSPACE_SYNC_BLOCKED_ARCHIVED',payload:{retired:true}},
  });
  expect(tx.studentWorkspaceEventInbox.create).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({payload:{retired:true}})}));
  expect(tx.studentTimelineEntry.create).not.toHaveBeenCalled();
});
