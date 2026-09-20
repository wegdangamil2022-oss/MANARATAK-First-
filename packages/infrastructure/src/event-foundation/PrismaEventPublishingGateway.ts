import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { IEventPublishingGateway } from '@manaratak/application';
import { EnterpriseEvent, EventLifecycleState, OutboxProcessingState } from '@manaratak/domain';

type EnterpriseEventDelegate = {
  updateMany(args: Record<string, unknown>): Promise<{ count: number }>;
};

type OutboxDelegate = {
  create(args: Record<string, unknown>): Promise<unknown>;
};

export class PrismaEventPublishingGateway implements IEventPublishingGateway {
  public readonly persistenceClassification = 'DURABLE_OUTBOX' as const;

  constructor(private readonly prisma: PrismaClient) {
    if (!prisma) throw new Error('ENTERPRISE_EVENT_PUBLISHING_DURABILITY_REQUIRED');
  }

  async publish(event: EnterpriseEvent): Promise<void> {
    if (event.getLifecycleState() !== EventLifecycleState.PUBLISHED) {
      throw new Error('ENTERPRISE_EVENT_MUST_BE_PUBLISHED_BEFORE_OUTBOX_APPEND');
    }

    const reference = event.getReference().getValue();
    const now = new Date();
    await this.prisma.$transaction(async (transaction) => {
      const eventDelegate = this.eventDelegate(transaction);
      const outboxDelegate = this.outboxDelegate(transaction);

      // Guard the lifecycle transition in the same DB transaction as the durable outbox append.
      const persisted = await eventDelegate.updateMany({
        where: { reference, lifecycleState: EventLifecycleState.REGISTERED },
        data: { lifecycleState: EventLifecycleState.PUBLISHED },
      });
      if (persisted.count !== 1) {
        throw new Error(`ENTERPRISE_EVENT_PUBLISH_STATE_CONFLICT:${reference}`);
      }

      await outboxDelegate.create({
        data: {
          id: randomUUID(),
          eventType: event.getDefinition().getType(),
          domain: 'ENTERPRISE_EVENT_FOUNDATION',
          aggregateType: 'EnterpriseEvent',
          aggregateId: event.getId().getValue(),
          payload: {
            reference,
            ownerReference: event.getOwnerReference().getValue(),
            type: event.getDefinition().getType(),
            category: event.getDefinition().getCategory(),
            version: event.getVersion().getVersion(),
            payloadMetadata: event.getPayloadMetadata().getMetadata(),
          },
          metadata: event.getMetadata().getMetadata(),
          correlationId: event.getCorrelationReference()?.getValue() ?? null,
          causationId: event.getCausationReference()?.getValue() ?? null,
          state: OutboxProcessingState.PENDING,
          attempts: 0,
          availableAt: now,
          createdAt: now,
        },
      });
    });
  }

  private eventDelegate(client: unknown): EnterpriseEventDelegate {
    const delegate = (client as { enterpriseEventRecord?: EnterpriseEventDelegate }).enterpriseEventRecord;
    if (!delegate) throw new Error('ENTERPRISE_EVENT_PERSISTENCE_NOT_MIGRATED');
    return delegate;
  }

  private outboxDelegate(client: unknown): OutboxDelegate {
    const delegate = (client as { transactionalOutboxRecord?: OutboxDelegate })
      .transactionalOutboxRecord;
    if (!delegate) throw new Error('OUTBOX_PERSISTENCE_NOT_MIGRATED');
    return delegate;
  }
}
