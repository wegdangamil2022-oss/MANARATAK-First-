import { describe, it, expect, vi } from 'vitest';
import {
  EnterpriseEvent,
  EventReference,
  EventOwnerReference,
  EventDefinition,
  EventPayloadMetadata,
  EventVersion,
  EventMetadata,
  EnterpriseEventSpecification,
  EventLifecycleState
} from '@manaratak/domain';
import {
  InMemoryEnterpriseEventRepository,
  InMemoryEventPublishingGateway
} from '../../src';

describe('EnterpriseEvents Fallback', () => {
  const createTestEvent = (refVal: string) => {
    return EnterpriseEvent.create(
      EventReference.from(refVal),
      EventOwnerReference.from('urn:owner:123'),
      EventDefinition.create('test-event', 'test-category'),
      EventPayloadMetadata.create({ key: 'val' }),
      EventVersion.create('1.0'),
      EventMetadata.create({ ip: '127.0.0.1' })
    );
  };

  describe('InMemoryEnterpriseEventRepository', () => {
    it('saves and finds events using specification criteria', async () => {
      const repository = new InMemoryEnterpriseEventRepository();
      const event = createTestEvent('evt-1');

      await repository.save(event);

      const spec = new EnterpriseEventSpecification({ reference: 'evt-1' });
      const foundEvents = await repository.findBy(spec);

      expect(foundEvents).toHaveLength(1);
      expect(foundEvents[0].getReference().getValue()).toBe('evt-1');
      expect(foundEvents[0].getLifecycleState()).toBe(EventLifecycleState.CREATED);
    });

    it('returns empty array when specification criteria is not met', async () => {
      const repository = new InMemoryEnterpriseEventRepository();
      const event = createTestEvent('evt-2');
      await repository.save(event);

      const spec = new EnterpriseEventSpecification({ reference: 'non-existent' });
      const foundEvents = await repository.findBy(spec);

      expect(foundEvents).toHaveLength(0);
    });
  });

  describe('InMemoryEventPublishingGateway', () => {
    it('notifies registered listeners synchronously', async () => {
      const gateway = new InMemoryEventPublishingGateway();
      const listenerMock = vi.fn().mockImplementation(async (event: EnterpriseEvent) => {
        expect(event.getReference().getValue()).toBe('evt-publish-1');
      });

      gateway.registerListener(listenerMock);

      const event = createTestEvent('evt-publish-1');
      await gateway.publish(event);

      expect(listenerMock).toHaveBeenCalledTimes(1);
      expect(gateway.getPublishedEvents()).toHaveLength(1);
      expect(gateway.getPublishedEvents()[0].getReference().getValue()).toBe('evt-publish-1');
    });

    it('propagates listener failures synchronously to caller (supporting transactional rollback)', async () => {
      const gateway = new InMemoryEventPublishingGateway();
      const failingListener = vi.fn().mockImplementation(async () => {
        throw new Error('Listener processing failed!');
      });

      gateway.registerListener(failingListener);

      const event = createTestEvent('evt-publish-fail');

      // Publishing should throw synchronously, propagating the error upward
      await expect(gateway.publish(event)).rejects.toThrow('Listener processing failed!');
      expect(failingListener).toHaveBeenCalledTimes(1);
    });
  });
});
