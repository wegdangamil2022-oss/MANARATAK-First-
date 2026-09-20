import { describe, expect, it, vi } from 'vitest';
import { CourseCompletionStatus, CourseEnrollmentStatus } from '@manaratak/domain';
import { PrismaCourseProgressRepository } from '../../src/courses/PrismaCourseProgressRepository';

describe('PrismaCourseProgressRepository', () => {
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
