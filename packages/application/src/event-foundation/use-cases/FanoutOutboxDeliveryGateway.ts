import { IOutboxDeliveryGateway, OutboxDeliveryContext, TransactionalOutboxEntry } from '@manaratak/domain';

/**
 * Delivers one claimed outbox fact to every required idempotent consumer before
 * the dispatcher may mark the authoritative outbox row processed. This avoids
 * competing consumers racing on the single outbox processing state.
 */
export class FanoutOutboxDeliveryGateway implements IOutboxDeliveryGateway {
  public constructor(private readonly consumers: readonly IOutboxDeliveryGateway[]) {
    if (consumers.length === 0) throw new Error('OUTBOX_FANOUT_CONSUMER_REQUIRED');
  }

  public async deliver(entry: TransactionalOutboxEntry, context: OutboxDeliveryContext): Promise<void> {
    for (const consumer of this.consumers) await consumer.deliver(entry, context);
  }
}
