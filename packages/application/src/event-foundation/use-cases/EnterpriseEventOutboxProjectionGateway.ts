import { createHash } from 'node:crypto';
import {
  EnterpriseEvent,
  EventLifecycleState,
  IEnterpriseEventRepository,
  IOutboxDeliveryGateway,
  OutboxDeliveryContext,
  TransactionalOutboxEntry,
} from '@manaratak/domain';

/**
 * Durable anti-corruption projection from owner-domain outbox facts into the
 * canonical Enterprise Event ledger. The outbox id is the idempotency key;
 * replaying the same fact overwrites the same immutable event reference rather
 * than creating a second logical enterprise event.
 */
export class EnterpriseEventOutboxProjectionGateway implements IOutboxDeliveryGateway {
  public constructor(private readonly repository: IEnterpriseEventRepository) {}

  public async deliver(entry: TransactionalOutboxEntry, context: OutboxDeliveryContext): Promise<void> {
    if (context.idempotencyKey !== entry.id) throw new Error('ENTERPRISE_EVENT_OUTBOX_IDEMPOTENCY_KEY_MISMATCH');
    const eventVersion = String(entry.metadata.eventVersion ?? entry.metadata.schemaVersion ?? '1.0.0');
    const category = String(entry.metadata.category ?? `${entry.domain}_INTEGRATION`);
    const ownerReference = entry.aggregate
      ? `${entry.aggregate.domain}:${entry.aggregate.aggregateType}:${entry.aggregate.aggregateId}`
      : `${entry.domain}:UNSCOPED`;
    const deterministicId = `evt_${createHash('sha256').update(entry.id).digest('hex').slice(0, 32)}`;
    const event = EnterpriseEvent.rehydrate({
      id: deterministicId,
      reference: `outbox:${entry.id}`,
      ownerReference,
      type: entry.eventType,
      category,
      payloadMetadata: { ...entry.payload },
      version: eventVersion,
      metadata: {
        ...entry.metadata,
        sourceOutboxId: entry.id,
        sourceDomain: entry.domain,
        sourceCreatedAt: entry.createdAt.toISOString(),
      },
      ...(entry.correlationId ? { correlationReference: entry.correlationId } : {}),
      ...(entry.causationId ? { causationReference: entry.causationId } : {}),
      lifecycleState: EventLifecycleState.PUBLISHED,
    });
    await this.repository.save(event);
  }
}
