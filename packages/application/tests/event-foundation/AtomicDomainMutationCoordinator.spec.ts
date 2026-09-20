import { describe, expect, it, vi } from 'vitest';
import { AtomicDomainMutationCoordinator } from '../../src/event-foundation/use-cases/AtomicDomainMutationCoordinator';

describe('AtomicDomainMutationCoordinator', () => {
  it('builds correlated audit and outbox records around the supplied mutation', async () => {
    const transaction = { boundaryId: 'boundary-1' };
    const executor = { execute: vi.fn(async (_audit: unknown, _outbox: unknown, mutation: any) => mutation(transaction)) };
    const mutation = vi.fn().mockResolvedValue({ id: 'test-1' });
    const coordinator = new AtomicDomainMutationCoordinator(executor as any);

    await coordinator.execute({
      domain: 'INTERNATIONAL_TESTS',
      aggregateType: 'INTERNATIONAL_TEST',
      aggregateId: 'test-1',
      action: 'INTERNATIONAL_TEST_PUBLISHED',
      context: { actorId: 'admin-1', correlationId: 'corr-1', source: 'admin-international-tests-api' },
    }, mutation);

    expect(mutation).toHaveBeenCalledWith(transaction);
    expect(executor.execute).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: 'admin-1', targetId: 'test-1', correlationReference: 'corr-1' }),
      expect.objectContaining({
        eventType: 'INTERNATIONAL_TEST_PUBLISHED',
        correlationId: 'corr-1',
        aggregate: expect.objectContaining({ aggregateId: 'test-1' }),
      }),
      mutation,
    );
  });
});
