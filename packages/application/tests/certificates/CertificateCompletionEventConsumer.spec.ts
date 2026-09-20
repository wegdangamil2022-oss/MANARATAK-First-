import { describe, expect, it, vi } from 'vitest';
import { CertificateCompletionEventConsumer } from '../../src/certificates/use-cases/CertificateCompletionEventConsumer';

describe('P6 CertificateCompletionEventConsumer', () => {
  it('acknowledges an authoritative but ineligible completion as a no-op without retryable issuance failure', async () => {
    const certificates = { consumeCompletionEvent: vi.fn() } as any;
    const consumer = new CertificateCompletionEventConsumer(certificates);
    await expect(consumer.consume({
      id: 'evt-1', domain: 'COURSES', eventType: 'CourseCompleted',
      payload: { courseId: 'course-1', studentReferenceId: 'student-1', completionId: 'completion-1', eligibleForCertificate: false },
      metadata: { eventVersion: '1.0.0' }, createdAt: new Date(),
    })).resolves.toBeNull();
    expect(certificates.consumeCompletionEvent).not.toHaveBeenCalled();
  });

  it('forwards eligible completion using the persisted outbox record identity and version', async () => {
    const certificates = { consumeCompletionEvent: vi.fn().mockResolvedValue({ id: 'cert-1' }) } as any;
    const consumer = new CertificateCompletionEventConsumer(certificates);
    await consumer.consume({
      id: 'evt-2', domain: 'COURSES', eventType: 'LearningPathCompleted',
      payload: { learningPathId: 'path-1', studentReferenceId: 'student-1', completedAt: new Date().toISOString(), eligibleForCertificate: true, certificateOwnerPhase: 'Phase 14 - Enterprise Certificates Platform', sourcePhase: 'Phase 13 - Learning Platform' },
      metadata: { eventVersion: '1.0.0' }, createdAt: new Date(),
    });
    expect(certificates.consumeCompletionEvent).toHaveBeenCalledWith(expect.objectContaining({ eventId: 'evt-2', eventVersion: '1.0.0', sourceDomain: 'COURSES' }));
  });
});
