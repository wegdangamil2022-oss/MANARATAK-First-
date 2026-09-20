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
