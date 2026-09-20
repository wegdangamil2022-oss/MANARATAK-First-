import { describe, expect, it, vi } from 'vitest';
import {
  EnterpriseEvent,
  EnterpriseEventSpecification,
  EventDefinition,
  EventLifecycleState,
  EventMetadata,
  EventOwnerReference,
  EventPayloadMetadata,
  EventReference,
  EventVersion,
} from '@manaratak/domain';
import { PrismaEnterpriseEventRepository } from '../../src/event-foundation/PrismaEnterpriseEventRepository';
import { PrismaEventPublishingGateway } from '../../src/event-foundation/PrismaEventPublishingGateway';

function registeredEvent() {
  const event = EnterpriseEvent.create(
    EventReference.from('evt:test:1'),
    EventOwnerReference.from('owner:test:1'),
    EventDefinition.create('TestOccurred', 'TEST'),
    EventPayloadMetadata.create({ schema: 'test-v1' }),
    EventVersion.create('1.0.0'),
    EventMetadata.create({ source: 'spec' }),
  );
  event.register();
  return event;
}

describe('W2 durable Enterprise Event Foundation', () => {
  it('persists registered events through a durable Prisma repository and rehydrates them', async () => {
    const upsert = vi.fn().mockResolvedValue({});
    const record = {
      id: 'evt-id-1',
      reference: 'evt:test:1',
      ownerReference: 'owner:test:1',
      eventType: 'TestOccurred',
      category: 'TEST',
      payloadMetadata: { schema: 'test-v1' },
      version: '1.0.0',
      metadata: { source: 'spec' },
      correlationReference: null,
      causationReference: null,
      lifecycleState: EventLifecycleState.REGISTERED,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const findMany = vi.fn().mockResolvedValue([record]);
    const prisma = { enterpriseEventRecord: { upsert, findMany } };
    const repository = new PrismaEnterpriseEventRepository(prisma as any);

    await repository.save(registeredEvent());
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { reference: 'evt:test:1' },
        create: expect.objectContaining({ lifecycleState: EventLifecycleState.REGISTERED }),
      }),
    );

    const found = await repository.findBy(
      new EnterpriseEventSpecification({ reference: 'evt:test:1' }),
    );
    expect(found).toHaveLength(1);
    expect(found[0].getLifecycleState()).toBe(EventLifecycleState.REGISTERED);
    expect(found[0].getDomainEvents()).toHaveLength(0);
  });

  it('atomically persists PUBLISHED and appends the same event to the transactional outbox', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const create = vi.fn().mockResolvedValue({});
    const tx = {
      enterpriseEventRecord: { updateMany },
      transactionalOutboxRecord: { create },
    };
    const prisma = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const publisher = new PrismaEventPublishingGateway(prisma as any);
    const event = registeredEvent();
    event.markAsPublished();

    await publisher.publish(event);

    expect(updateMany).toHaveBeenCalledWith({
      where: { reference: 'evt:test:1', lifecycleState: EventLifecycleState.REGISTERED },
      data: { lifecycleState: EventLifecycleState.PUBLISHED },
    });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: 'TestOccurred',
        domain: 'ENTERPRISE_EVENT_FOUNDATION',
        aggregateType: 'EnterpriseEvent',
        state: 'PENDING',
        payload: expect.objectContaining({ reference: 'evt:test:1' }),
      }),
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('fails closed when the persisted lifecycle was not REGISTERED', async () => {
    const tx = {
      enterpriseEventRecord: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      transactionalOutboxRecord: { create: vi.fn() },
    };
    const prisma = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const publisher = new PrismaEventPublishingGateway(prisma as any);
    const event = registeredEvent();
    event.markAsPublished();

    await expect(publisher.publish(event)).rejects.toThrow('ENTERPRISE_EVENT_PUBLISH_STATE_CONFLICT');
    expect(tx.transactionalOutboxRecord.create).not.toHaveBeenCalled();
  });
});
