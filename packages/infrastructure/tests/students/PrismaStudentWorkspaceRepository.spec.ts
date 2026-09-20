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
    const tx = { studentWorkspace: { findUnique: vi.fn().mockResolvedValue(null) } };
    const repository = new PrismaStudentWorkspaceRepository({ $transaction: (callback: (client: typeof tx) => unknown) => callback(tx) } as any);
    await expect(repository.upsertWorkspace({ studentReferenceId: 'student-1' })).rejects.toThrow('STUDENT_WORKSPACE_PROVISIONING_PENDING');
  });

  it('blocks personal mutations while the workspace is suspended', async () => {
    const tx = {
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
      studentWorkspace: { findUnique: vi.fn().mockResolvedValue({ ...workspace, status: StudentWorkspaceStatus.ARCHIVED }) },
      studentSavedItem: { upsert: vi.fn() },
    };
    const repository = new PrismaStudentWorkspaceRepository({ $transaction: (callback: (client: typeof tx) => unknown) => callback(tx) } as any);
    await expect(repository.saveItem({ studentReferenceId: 'student-1', entityType: StudentSavedItemType.COURSE, entityId: 'course-1' })).rejects.toThrow('STUDENT_WORKSPACE_ARCHIVED');
    expect(tx.studentSavedItem.upsert).not.toHaveBeenCalled();
  });

  it('deduplicates upstream events before projecting timeline and notifications', async () => {
    const tx = {
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
      studentWorkspace: { findUnique: vi.fn().mockResolvedValue({ ...workspace, privacyPreferences: { retainSearchHistory: true, allowPersonalization: false, allowProductAnalytics: false, publicProfileEnabled: false } }), update: vi.fn().mockResolvedValue(updated) },
      studentPrivacyConsentDecision: { create: vi.fn() }, auditRecord: { create: vi.fn() }, transactionalOutboxRecord: { create: vi.fn() },
    };
    const repository = new PrismaStudentWorkspaceRepository({ $transaction: (callback: (client: typeof tx) => unknown) => callback(tx) } as any);
    const decision = await repository.updatePrivacyConsent({
      studentReferenceId: 'student-1', expectedVersion: 1, actorId: 'student-1', purpose: 'settings',
      privacyPreferences: updated.privacyPreferences,
    });
    expect(tx.studentWorkspace.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ privacyPreferences: updated.privacyPreferences, version: { increment: 1 } }) }));
    expect(tx.studentPrivacyConsentDecision.create).toHaveBeenCalledOnce();
    expect(decision).toMatchObject({ workspaceVersion: 2, afterPreferences: updated.privacyPreferences });
    expect(decision.changedFields).toEqual(expect.arrayContaining(['retainSearchHistory', 'allowPersonalization', 'allowProductAnalytics']));
  });
});
