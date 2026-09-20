import type { PrismaClient } from '@prisma/client';
import type { ISpecification } from '@manaratak/core';
import {
  EnterpriseEvent,
  EnterpriseEventSpecification,
  EventLifecycleState,
  IEnterpriseEventRepository,
} from '@manaratak/domain';

type EnterpriseEventDelegate = {
  upsert(args: Record<string, unknown>): Promise<unknown>;
  findMany(args: Record<string, unknown>): Promise<any[]>;
};

export class PrismaEnterpriseEventRepository implements IEnterpriseEventRepository {
  public readonly persistenceClassification = 'DURABLE' as const;

  constructor(private readonly prisma: PrismaClient) {
    if (!prisma) throw new Error('ENTERPRISE_EVENT_DURABLE_PERSISTENCE_REQUIRED');
  }

  async save(event: EnterpriseEvent): Promise<void> {
    const data = this.toPersistence(event);
    await this.delegate().upsert({
      where: { reference: event.getReference().getValue() },
      create: data,
      update: {
        ownerReference: data.ownerReference,
        eventType: data.eventType,
        category: data.category,
        payloadMetadata: data.payloadMetadata,
        version: data.version,
        metadata: data.metadata,
        correlationReference: data.correlationReference,
        causationReference: data.causationReference,
        lifecycleState: data.lifecycleState,
      },
    });
  }

  async findBy(specification: ISpecification<EnterpriseEvent>): Promise<EnterpriseEvent[]> {
    const where = this.toWhere(specification);
    const records = await this.delegate().findMany({
      where,
      orderBy: { createdAt: 'asc' },
      ...(Object.keys(where).length === 0 ? { take: 5_000 } : {}),
    });
    return records.map((record) => this.toDomain(record)).filter((event) => specification.isSatisfiedBy(event));
  }

  private delegate(): EnterpriseEventDelegate {
    const delegate = (this.prisma as unknown as { enterpriseEventRecord?: EnterpriseEventDelegate })
      .enterpriseEventRecord;
    if (!delegate) throw new Error('ENTERPRISE_EVENT_PERSISTENCE_NOT_MIGRATED');
    return delegate;
  }

  private toWhere(specification: ISpecification<EnterpriseEvent>): Record<string, unknown> {
    if (!(specification instanceof EnterpriseEventSpecification)) return {};
    const criteria = specification.getCriteria();
    return {
      ...(criteria.reference ? { reference: criteria.reference } : {}),
      ...(criteria.ownerReference ? { ownerReference: criteria.ownerReference } : {}),
      ...(criteria.type ? { eventType: criteria.type } : {}),
      ...(criteria.lifecycleState ? { lifecycleState: criteria.lifecycleState } : {}),
    };
  }

  private toPersistence(event: EnterpriseEvent): Record<string, unknown> {
    return {
      id: event.getId().getValue(),
      reference: event.getReference().getValue(),
      ownerReference: event.getOwnerReference().getValue(),
      eventType: event.getDefinition().getType(),
      category: event.getDefinition().getCategory(),
      payloadMetadata: event.getPayloadMetadata().getMetadata(),
      version: event.getVersion().getVersion(),
      metadata: event.getMetadata().getMetadata(),
      correlationReference: event.getCorrelationReference()?.getValue() ?? null,
      causationReference: event.getCausationReference()?.getValue() ?? null,
      lifecycleState: event.getLifecycleState(),
    };
  }

  private toDomain(record: any): EnterpriseEvent {
    const lifecycleState = Object.values(EventLifecycleState).includes(record.lifecycleState)
      ? (record.lifecycleState as EventLifecycleState)
      : EventLifecycleState.CREATED;
    return EnterpriseEvent.rehydrate({
      id: record.id,
      reference: record.reference,
      ownerReference: record.ownerReference,
      type: record.eventType,
      category: record.category,
      payloadMetadata: this.recordValue(record.payloadMetadata),
      version: record.version,
      metadata: this.recordValue(record.metadata),
      correlationReference: record.correlationReference ?? undefined,
      causationReference: record.causationReference ?? undefined,
      lifecycleState,
    });
  }

  private recordValue(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }
}
