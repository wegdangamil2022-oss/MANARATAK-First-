import {describe,expect,it,vi} from 'vitest';
import {
  CourseStudentDashboardReadGateway,CertificateStudentDashboardReadGateway,
} from '../../src/students/StudentDashboardOwnerReadGateways';

describe('P15 owner paged read gateways',()=>{
  it('uses P13 student-scoped keyset and includes only authorized course metadata',async()=>{
    const enrollment={id:'enroll-1',studentReferenceId:'student-1',courseId:'course-1',
      status:'COMPLETED',progressPercentage:100,
      enrolledAt:new Date('2026-06-01T00:00:00Z'),completedAt:new Date('2026-06-15T00:00:00Z')};
    const progress={listEnrollmentsPageByStudent:vi.fn().mockResolvedValue({
      items:[enrollment],nextCursor:'enroll-1',
    }),listEnrollmentsByStudent:vi.fn()};
    const courses={findById:vi.fn().mockResolvedValue({
      id:'course-1',slug:'test-course',displayName:'Test Course',
      metadata:{private:'do not copy'},
    })};
    const owner=new CourseStudentDashboardReadGateway(progress as any,courses as any);
    const result=await owner.listPageForStudent('student-1',10,'previous');
    expect(progress.listEnrollmentsPageByStudent).toHaveBeenCalledWith('student-1',10,'previous');
    expect(progress.listEnrollmentsByStudent).not.toHaveBeenCalled();
    expect(result.nextCursor).toBe('enroll-1');
    expect(result.items[0]).toMatchObject({
      enrollmentId:'enroll-1',courseId:'course-1',courseSlug:'test-course',
      status:'COMPLETED',progressPercentage:100,
    });
    expect(JSON.stringify(result.items)).not.toContain('private');
  });

  it('preserves certificate owner keyset, lifecycle status and strips internal P14 fields',async()=>{
    const certificates={listForStudent:vi.fn().mockResolvedValue([
      {certificateId:'cert-1',publicId:'pub-1',serialNumber:'ser-1',verificationCode:'verify-1',
        status:'ARCHIVED',achievementDisplayName:'Biology',issuedAt:new Date(),digitalSignature:'secret'},
      {certificateId:'cert-2',publicId:'pub-2',serialNumber:'ser-2',verificationCode:'verify-2',
        status:'ACTIVE',achievementDisplayName:'Math',issuedAt:new Date(),digitalSignature:'secret'},
      {certificateId:'cert-3',publicId:'pub-3',serialNumber:'ser-3',verificationCode:'verify-3',
        status:'ACTIVE',achievementDisplayName:'Physics',issuedAt:new Date(),digitalSignature:'secret'},
    ])};
    const owner=new CertificateStudentDashboardReadGateway(certificates as any);
    const result=await owner.listPageForStudent('student-1',2,'previous-cert-id');
    expect(certificates.listForStudent).toHaveBeenCalledWith('student-1','previous-cert-id',3);
    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBe('cert-2');
    expect(result.items[0].status).toBe('ARCHIVED');
    expect(JSON.stringify(result.items)).not.toContain('digitalSignature');
    await expect(owner.listPageForStudent('student-1',51)).rejects.toThrow('STUDENT_OWNER_READ_PAGE_INVALID');
  });

  it('refuses a non-paginated P13 implementation rather than silently dropping the remaining records',async()=>{
    const progress={listEnrollmentsByStudent:vi.fn()};
    const owner=new CourseStudentDashboardReadGateway(progress as any,{findById:vi.fn()} as any);
    await expect(owner.listPageForStudent('student-1',50)).rejects.toThrow(
      'STUDENT_LEARNING_OWNER_PAGINATION_NOT_SUPPORTED',
    );
    expect(progress.listEnrollmentsByStudent).not.toHaveBeenCalled();
  });
});
