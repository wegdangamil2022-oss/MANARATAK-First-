import { describe, expect, it, vi } from 'vitest';
import { CourseCompletionStatus, CourseEnrollmentStatus } from '@manaratak/domain';
import { PrismaCourseProgressRepository } from '../../src/courses/PrismaCourseProgressRepository';

describe('PrismaCourseProgressRepository', () => {
  it('enumerates enrollment catchup in stable student-scoped keyset pages', async()=>{
    const now=new Date('2026-10-11T10:00:00Z');
    const mock=(id:string)=>({id,courseId:`course-${id}`,studentReferenceId:'student-1',
      status:'ACTIVE',enrolledAt:now,progressPercentage:10,metadata:null});
    const prisma={courseEnrollment:{findMany:vi.fn().mockResolvedValueOnce([mock('a'),mock('b'),mock('c')])
      .mockResolvedValueOnce([mock('d')])}};
    const repo=new PrismaCourseProgressRepository(prisma as any);
    const first=await repo.listEnrollmentsPageByStudent('student-1',2);
    expect(first.items.map(i=>i.id)).toEqual(['a','b']);
    expect(first.nextCursor).toBe('b');
    expect(prisma.courseEnrollment.findMany).toHaveBeenNthCalledWith(1,{
      where:{studentReferenceId:'student-1'},orderBy:{id:'asc'},take:3,
    });
    const second=await repo.listEnrollmentsPageByStudent('student-1',2,first.nextCursor!);
    expect(second.items.map(i=>i.id)).toEqual(['d']);
    expect(second.nextCursor).toBeNull();
    expect(prisma.courseEnrollment.findMany).toHaveBeenNthCalledWith(2,{
      where:{studentReferenceId:'student-1',id:{gt:'b'}},orderBy:{id:'asc'},take:3,
    });
    await expect(repo.listEnrollmentsPageByStudent('student-1',51)).rejects.toThrow('STUDENT_OWNER_READ_PAGE_INVALID');
  });

  it('persists enrollment using the canonical course/student identity', async () => {
    const now = new Date();
    const prisma = {
      courseEnrollment: {
        upsert: vi
          .fn()
          .mockResolvedValue({
            id: 'enrollment-1',
            courseId: 'course-1',
            studentReferenceId: 'student-1',
            status: 'ACTIVE',
            enrolledAt: now,
            completedAt: null,
            progressPercentage: 0,
            lastAccessedAt: null,
            metadata: null,
            createdAt: now,
            updatedAt: now,
          }),
      },
    };
    const repository = new PrismaCourseProgressRepository(prisma as any);

    const result = await repository.enroll({
      courseId: 'course-1',
      studentReferenceId: 'student-1',
    });

    expect(result.status).toBe(CourseEnrollmentStatus.ACTIVE);
    expect(prisma.courseEnrollment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          courseId_studentReferenceId: { courseId: 'course-1', studentReferenceId: 'student-1' },
        },
      }),
    );
  });

  it('persists completion eligibility without issuing a Phase 14 certificate', async () => {
    const now = new Date();
    const prisma = {
      courseCompletion: {
        upsert: vi
          .fn()
          .mockResolvedValue({
            id: 'completion-1',
            courseId: 'course-1',
            studentReferenceId: 'student-1',
            status: 'CERTIFICATE_SIGNAL_READY',
            completionSource: 'PHASE_13_LEARNING_PROGRESS',
            eligibleForCertificate: true,
            courseVersion: 2,
            completedAt: now,
            metadata: { phase14OwnsCertificateIssuance: true },
            createdAt: now,
            updatedAt: now,
          }),
      },
    };
    const repository = new PrismaCourseProgressRepository(prisma as any);

    const result = await repository.completeCourse({
      courseId: 'course-1',
      studentReferenceId: 'student-1',
      status: CourseCompletionStatus.CERTIFICATE_SIGNAL_READY,
      completionSource: 'PHASE_13_LEARNING_PROGRESS',
      eligibleForCertificate: true,
      courseVersion: 2,
    });

    expect(result.eligibleForCertificate).toBe(true);
    expect(prisma.courseCompletion.upsert).toHaveBeenCalledWith(
      expect.not.objectContaining({ certificateId: expect.anything() }),
    );
  });
});
