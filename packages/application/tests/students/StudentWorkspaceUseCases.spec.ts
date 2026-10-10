import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  IStudentWorkspaceRepository,
  StudentSavedItemType,
  StudentWorkspaceStatus,
} from '@manaratak/domain';
import { StudentWorkspaceUseCases } from '../../src/students/use-cases/StudentWorkspaceUseCases';

describe('StudentWorkspaceUseCases', () => {
  let repository: IStudentWorkspaceRepository;
  let useCases: StudentWorkspaceUseCases;

  beforeEach(() => {
    repository = {
      upsertWorkspace: vi.fn().mockResolvedValue({
        id: 'workspace-1',
        studentReferenceId: 'student-1',
        status: StudentWorkspaceStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      findWorkspace: vi.fn().mockResolvedValue({ id: 'workspace-1', studentReferenceId: 'student-1', status: StudentWorkspaceStatus.ACTIVE, version: 1, createdAt: new Date(), updatedAt: new Date() }),
      updatePrivacyConsent: vi.fn(),
      saveItem: vi.fn().mockImplementation((data) =>
        Promise.resolve({
          id: 'saved-1',
          ...data,
          savedAt: new Date(),
          updatedAt: new Date(),
        }),
      ),
      removeSavedItem: vi.fn(),
      listSavedItems: vi.fn().mockResolvedValue([]),
      getDashboardSummary: vi.fn().mockResolvedValue({
        workspace: {
          id: 'workspace-1',
          studentReferenceId: 'student-1',
          status: StudentWorkspaceStatus.ACTIVE,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        savedItems: [],
        certificateCount: 1,
        activeCourseEnrollmentCount: 2,
        completedCourseEnrollmentCount: 1,
      }),
    };
    useCases = new StudentWorkspaceUseCases(repository);
  });

  it('rejects a profile update without an expected version', async () => {
    await expect(useCases.upsertWorkspace({ studentReferenceId: 'student-1', displayName: 'Student' }))
      .rejects.toThrow('STUDENT_WORKSPACE_VERSION_REQUIRED');
    expect(repository.upsertWorkspace).not.toHaveBeenCalled();
  });

  it('rejects spoofed integration event domains and malformed dates', async () => {
    repository.ingestIntegrationEvent = vi.fn();
    const common = {eventId:'event-1', studentReferenceId:'student-1', eventType:'CourseCompleted',
      title:'Completed', occurredAt:new Date()};
    await expect(useCases.consumeIntegrationEvent({...common, sourceDomain:'PUBLIC'})).rejects.toThrow('STUDENT_EVENT_TYPE_NOT_ALLOWED');
    await expect(useCases.consumeIntegrationEvent({...common, sourceDomain:'COURSES', occurredAt:new Date('invalid')}))
      .rejects.toThrow('STUDENT_EVENT_PAYLOAD_INVALID');
    expect(repository.ingestIntegrationEvent).not.toHaveBeenCalled();
  });

  it('never serves a stale Redis dashboard after invalidation failure', async () => {
    const cache = {
      getDashboard: vi.fn().mockResolvedValue({workspace:{studentReferenceId:'student-1'},certificateCount:999}),
      setDashboard: vi.fn().mockRejectedValue(new Error('Redis outage')),
      invalidate: vi.fn(),
    };
    const fresh = new StudentWorkspaceUseCases(repository, cache);
    const result = await fresh.getDashboard('student-1');
    expect(result.certificateCount).toBe(1);
    expect(cache.getDashboard).not.toHaveBeenCalled();
    expect(repository.getDashboardSummary).toHaveBeenCalledWith('student-1');
  });

  it('never provisions a workspace from a normal read', async () => {
    vi.mocked(repository.findWorkspace).mockResolvedValueOnce(null);
    await expect(useCases.getWorkspace('student-1')).rejects.toThrow('STUDENT_WORKSPACE_PROVISIONING_PENDING');
    expect(repository.upsertWorkspace).not.toHaveBeenCalled();
  });

  it('rejects raw avatar URLs to preserve EAP boundary', async () => {
    await expect(
      useCases.upsertWorkspace({
        studentReferenceId: 'student-1',
        avatarAssetId: 'https://example.com/avatar.png',
      }),
    ).rejects.toThrow('STUDENT_AVATAR_ASSET_REFERENCE_POLICY_REQUIRED');
  });

  it('saves personal workspace references only', async () => {
    const saved = await useCases.saveItem({
      studentReferenceId: 'student-1',
      entityType: StudentSavedItemType.COURSE,
      entityId: 'course-1',
      displayName: 'Native Course',
    });

    expect(saved.entityType).toBe(StudentSavedItemType.COURSE);
    expect(repository.saveItem).toHaveBeenCalled();
  });

  it('does not reactivate an archived workspace', async () => {
    vi.mocked(repository.findWorkspace).mockResolvedValue({
      id: 'workspace-1',
      studentReferenceId: 'student-1',
      status: StudentWorkspaceStatus.ARCHIVED,
      version: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      useCases.upsertWorkspace({
        studentReferenceId: 'student-1',
        status: StudentWorkspaceStatus.ACTIVE,
        expectedVersion: 3,
      }),
    ).rejects.toThrow('STUDENT_WORKSPACE_ARCHIVED');
  });

  it('forces student-created collections through the PERSONAL-only repository contract', async () => {
    repository.createCollection = vi.fn().mockResolvedValue({ id: 'collection-1', studentReferenceId: 'student-1', name: 'قائمتي', type: 'PERSONAL', itemCount: 0, createdAt: new Date(), updatedAt: new Date() });
    await expect(useCases.createCollection({ studentReferenceId: 'student-1', name: '  قائمتي  ' })).resolves.toMatchObject({ type: 'PERSONAL' });
    expect(repository.createCollection).toHaveBeenCalledWith(expect.objectContaining({ name: 'قائمتي' }));
    expect(repository.createCollection).toHaveBeenCalledWith(expect.not.objectContaining({ type: expect.anything() }));
  });
});
