import { describe, expect, it } from 'vitest';
import { EnterpriseCourseCompletionEventPublisher } from '../../src/courses/gateways/EnterpriseCourseCompletionEventPublisher';

describe('EnterpriseCourseCompletionEventPublisher', () => {
  it('fails closed because CourseProgressUseCases owns the transactional outbox mutation', async () => {
    const publisher = new EnterpriseCourseCompletionEventPublisher();

    await expect(publisher.publishCourseCompleted({
      courseId: 'course-1',
      studentReferenceId: 'student-1',
      completionId: 'completion-1',
      completedAt: new Date('2026-01-01T00:00:00.000Z'),
      eligibleForCertificate: true,
      certificateOwnerPhase: 'Phase 14 - Enterprise Certificates Platform',
      sourcePhase: 'Phase 13 - Learning Platform'
    })).rejects.toThrow('COURSE_COMPLETION_DIRECT_PUBLISH_FORBIDDEN_USE_ATOMIC_OUTBOX');
  });
});
