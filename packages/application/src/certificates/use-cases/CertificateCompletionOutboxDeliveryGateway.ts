import {
  IOutboxDeliveryGateway,
  OutboxDeliveryContext,
  TransactionalOutboxEntry,
} from '@manaratak/domain';
import { CertificateCompletionEventConsumer } from './CertificateCompletionEventConsumer';

/**
 * P13 → P14 asynchronous delivery adapter. Only authoritative persisted
 * completion events are accepted; all other outbox traffic fails closed.
 */
export class CertificateCompletionOutboxDeliveryGateway implements IOutboxDeliveryGateway {
  constructor(private readonly consumer: CertificateCompletionEventConsumer) {}

  public async deliver(entry: TransactionalOutboxEntry, context: OutboxDeliveryContext): Promise<void> {
    if (context.idempotencyKey !== entry.id) throw new Error('CERTIFICATE_COMPLETION_IDEMPOTENCY_KEY_MISMATCH');
    if (entry.domain !== 'COURSES') throw new Error('CERTIFICATE_COMPLETION_OUTBOX_DOMAIN_INVALID');
    if (entry.eventType !== 'CourseCompleted' && entry.eventType !== 'LearningPathCompleted') {
      throw new Error('CERTIFICATE_COMPLETION_OUTBOX_EVENT_TYPE_INVALID');
    }
    await this.consumer.consume({
      id: entry.id,
      eventType: entry.eventType,
      domain: entry.domain,
      payload: entry.payload,
      metadata: entry.metadata,
      createdAt: entry.createdAt,
    });
  }
}
