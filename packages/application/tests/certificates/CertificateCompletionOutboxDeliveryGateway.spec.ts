import { describe, expect, it, vi } from 'vitest';
import { OutboxProcessingState } from '@manaratak/domain';
import { CertificateCompletionOutboxDeliveryGateway } from '../../src/certificates/use-cases/CertificateCompletionOutboxDeliveryGateway';
import { CertificateCompletionOutboxWorker } from '../../src/certificates/use-cases/CertificateCompletionOutboxWorker';

const entry = {
  id: 'evt-course-completed-1',
  eventType: 'CourseCompleted',
  domain: 'COURSES',
  payload: { courseId: 'course-1', studentReferenceId: 'student-1' },
  metadata: { eventVersion: '1.0.0' },
  createdAt: new Date('2026-09-03T00:00:00Z'),
  availableAt: new Date('2026-09-03T00:00:00Z'),
  state: OutboxProcessingState.PENDING,
  attempts: 0,
} as any;

describe('P6 certificate completion outbox delivery', () => {
  it('forwards only persisted P13 completion events with the outbox id as the idempotency key', async () => {
    const consumer = { consume: vi.fn().mockResolvedValue({ id: 'cert-1' }) } as any;
    const gateway = new CertificateCompletionOutboxDeliveryGateway(consumer);
    await gateway.deliver(entry, { idempotencyKey: entry.id });
    expect(consumer.consume).toHaveBeenCalledWith(expect.objectContaining({
      id: entry.id,
      domain: 'COURSES',
      eventType: 'CourseCompleted',
      metadata: { eventVersion: '1.0.0' },
    }));
  });

  it('fails closed for mismatched idempotency keys and unrelated outbox traffic', async () => {
    const consumer = { consume: vi.fn() } as any;
    const gateway = new CertificateCompletionOutboxDeliveryGateway(consumer);
    await expect(gateway.deliver(entry, { idempotencyKey: 'different' })).rejects.toThrow('IDEMPOTENCY_KEY_MISMATCH');
    await expect(gateway.deliver({ ...entry, domain: 'SCHOLARSHIPS' }, { idempotencyKey: entry.id })).rejects.toThrow('OUTBOX_DOMAIN_INVALID');
    await expect(gateway.deliver({ ...entry, eventType: 'CoursePublished' }, { idempotencyKey: entry.id })).rejects.toThrow('OUTBOX_EVENT_TYPE_INVALID');
    expect(consumer.consume).not.toHaveBeenCalled();
  });

  it('subscribes the worker only to CourseCompleted and LearningPathCompleted from P13', async () => {
    const dispatcher = { dispatchBatch: vi.fn().mockResolvedValue({ claimed: 0, processed: 0, failed: 0, exhausted: 0 }) } as any;
    const worker = new CertificateCompletionOutboxWorker(dispatcher);
    await worker.runOnce('certificate-worker-1');
    expect(dispatcher.dispatchBatch).toHaveBeenCalledWith(expect.objectContaining({
      workerId: 'certificate-worker-1',
      domain: 'COURSES',
      eventTypes: ['CourseCompleted', 'LearningPathCompleted'],
    }));
  });
});
