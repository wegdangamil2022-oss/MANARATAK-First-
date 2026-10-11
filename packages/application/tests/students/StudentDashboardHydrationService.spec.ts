import { describe, expect, it, vi } from 'vitest';
import type { StudentDashboardSummaryDto } from '@manaratak/domain';
import { StudentDashboardHydrationService } from '../../src/students/use-cases/StudentDashboardHydrationService';
import type { StudentWorkspaceUseCases } from '../../src/students/use-cases/StudentWorkspaceUseCases';

function fixture() {
  const base = {
    courseEnrollments: [{ courseId: 'stale' }],
    certificates: [{ id: 'stale' }],
    statistics: { savedItems: 2, unreadNotifications: 3 },
    capabilityStatus: { workspace: 'AVAILABLE' },
    partialFailures: [],
  } as unknown as StudentDashboardSummaryDto;
  const workspace = { getDashboard: vi.fn().mockResolvedValue(base) };
  const learning = { listForStudent: vi.fn().mockResolvedValue([]) };
  const certificates = { listForStudent: vi.fn().mockResolvedValue([]) };
  const service = new StudentDashboardHydrationService(
    workspace as unknown as StudentWorkspaceUseCases, learning, certificates,
  );
  return { base, workspace, learning, certificates, service };
}

describe('StudentDashboardHydrationService', () => {
  it('hydrates owner truth and recomputes statistics for the requested student', async () => {
    const { base, workspace, learning, certificates, service } = fixture();
    const courses = [
      { courseId: 'course-1', status: 'ACTIVE', progressPercentage: 25 },
      { courseId: 'course-2', status: 'COMPLETED', progressPercentage: 100 },
    ];
    learning.listForStudent.mockResolvedValue(courses);
    certificates.listForStudent.mockResolvedValue([{ id: 'certificate-1' }]);
    const result = await service.getDashboard('student-1');
    expect(workspace.getDashboard).toHaveBeenCalledWith('student-1');
    expect(learning.listForStudent).toHaveBeenCalledWith('student-1',51);
    expect(certificates.listForStudent).toHaveBeenCalledWith('student-1',51);
    expect(result.courseEnrollments).toEqual(courses);
    expect(result.statistics).toEqual({ savedItems: 2, unreadNotifications: 3, activeCourses: 1,
      completedCourses: 1, averageCourseProgress: 63, certificates: 1 });
    expect(result.capabilityStatus).toEqual({ workspace: 'AVAILABLE', learning: 'AVAILABLE', certificates: 'AVAILABLE' });
    expect(base.courseEnrollments).toEqual([{ courseId: 'stale' }]);
  });

  it('marks failed owners degraded without presenting stale projections as current', async () => {
    const { base, learning, certificates, service } = fixture();
    base.partialFailures = ['learning-owner-read'];
    learning.listForStudent.mockRejectedValue(new Error('owner unavailable'));
    certificates.listForStudent.mockRejectedValue(new Error('owner unavailable'));
    const result = await service.getDashboard('student-1');
    expect(result.courseEnrollments).toEqual([]);
    expect(result.certificates).toEqual([]);
    expect(result.certificateCount).toBe(0);
    expect(result.capabilityStatus.learning).toBe('DEGRADED');
    expect(result.capabilityStatus.certificates).toBe('DEGRADED');
    expect(result.partialFailures).toEqual(['learning-owner-read', 'certificate-owner-read']);
    expect(base.partialFailures).toEqual(['learning-owner-read']);
  });

  it('does not read owners when the workspace request fails', async () => {
    const { workspace, learning, certificates, service } = fixture();
    workspace.getDashboard.mockRejectedValue(new Error('workspace denied'));
    await expect(service.getDashboard('student-1')).rejects.toThrow('workspace denied');
    expect(learning.listForStudent).not.toHaveBeenCalled();
    expect(certificates.listForStudent).not.toHaveBeenCalled();
  });

  it('does not call any owner or disclose cross-domain data without domain grants', async () => {
    const workspace = { getSupportWorkspaceDetail: vi.fn().mockResolvedValue({
      studentReferenceId: 'student-1', status: 'ACTIVE', version: 1,
      provisioningHealth: {state:'HEALTHY',pendingEventCount:0,failedEventCount:0},
      consentAudit: {hasDecision:false},
      linkedSummaries: {activeCourseCount:5,certificateCount:2,unreadNotificationCount:0},
    }) };
    const learning = { listForStudent: vi.fn() };
    const certificates = { listForStudent: vi.fn() };
    const requests = { listMyRequests: vi.fn() };
    const service = new StudentDashboardHydrationService(workspace as any, learning, certificates, requests as any);
    const detail = await service.getSupportDetail('student-1');
    expect(learning.listForStudent).not.toHaveBeenCalled();
    expect(certificates.listForStudent).not.toHaveBeenCalled();
    expect(requests.listMyRequests).not.toHaveBeenCalled();
    expect(detail.learning).toBeUndefined();
    expect(detail.certificates).toBeUndefined();
    expect(detail.linkedSummaries.activeCourseCount).toBeNull();
    expect(detail.linkedSummaries.certificateCount).toBeNull();
    expect(detail.ownerReadStatus).toEqual({learning:'RESTRICTED',certificates:'RESTRICTED',services:'RESTRICTED'});
  });

  it('returns bounded support owner slices without claiming partial counts are complete', async () => {
    const workspace={getSupportWorkspaceDetail:vi.fn().mockResolvedValue({
      studentReferenceId:'student-1',linkedSummaries:{activeCourseCount:99,certificateCount:99,unreadNotificationCount:0},
    })};
    const learning={listForStudent:vi.fn().mockResolvedValue(Array.from({length:13},(_,i)=>({courseId:`c-${i}`,status:'ACTIVE'})))};
    const certificates={listForStudent:vi.fn().mockResolvedValue(Array.from({length:13},(_,i)=>({id:`cert-${i}`,status:'ACTIVE'})))};
    const service=new StudentDashboardHydrationService(workspace as any,learning as any,certificates as any);
    const detail=await service.getSupportDetail('student-1',{learning:true,certificates:true,services:false});
    expect(learning.listForStudent).toHaveBeenCalledWith('student-1',13);
    expect(certificates.listForStudent).toHaveBeenCalledWith('student-1',13);
    expect(detail.learning).toHaveLength(12);
    expect(detail.certificates).toHaveLength(12);
    expect(detail.linkedSummaries.activeCourseCount).toBeNull();
    expect(detail.linkedSummaries.certificateCount).toBeNull();
    expect(detail.ownerReadStatus).toEqual({learning:'TRUNCATED',certificates:'TRUNCATED',services:'RESTRICTED'});
  });

  it('reads only explicitly granted owner domains', async () => {
    const workspace = { getSupportWorkspaceDetail: vi.fn().mockResolvedValue({
      studentReferenceId: 'student-1', linkedSummaries: {activeCourseCount:1,certificateCount:3,unreadNotificationCount:0},
    }) };
    const learning = { listForStudent: vi.fn().mockResolvedValue([{courseId:'a',status:'ACTIVE'}]) };
    const certificates = { listForStudent: vi.fn() };
    const service = new StudentDashboardHydrationService(workspace as any, learning as any, certificates as any);
    const detail = await service.getSupportDetail('student-1',{learning:true,certificates:false,services:false});
    expect(learning.listForStudent).toHaveBeenCalledWith('student-1',13);
    expect(certificates.listForStudent).not.toHaveBeenCalled();
    expect(detail.learning).toHaveLength(1);
    expect(detail.certificates).toBeUndefined();
  });
});
