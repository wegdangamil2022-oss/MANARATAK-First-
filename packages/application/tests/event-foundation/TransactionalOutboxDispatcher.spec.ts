import { describe, expect, it, vi } from 'vitest';
import { IOutboxDeliveryGateway, ITransactionalOutboxStore, OutboxProcessingState, TransactionalOutboxEntry } from '@manaratak/domain';
import { TransactionalOutboxDispatcher } from '../../src/event-foundation/use-cases/TransactionalOutboxDispatcher';

const lease = { workerId: 'worker-1', leaseToken: 'lease-1', claimUntil: new Date('2026-08-13T01:05:00Z') };
const entry = (attempts = 0): TransactionalOutboxEntry => ({
  id: 'outbox-1', eventType: 'MajorPublished', domain: 'MAJORS',
  aggregate: { domain: 'MAJORS', aggregateType: 'Major', aggregateId: 'major-1' },
  payload: { majorId: 'major-1' }, metadata: {}, createdAt: new Date('2026-08-13T00:00:00Z'),
  availableAt: new Date('2026-08-13T00:00:00Z'), state: OutboxProcessingState.PROCESSING, attempts, lease,
});
const request = { workerId: 'worker-1', batchSize: 10, claimDurationMs: 30_000, maxAttempts: 3, baseBackoffMs: 1_000, maxBackoffMs: 10_000 };

describe('TransactionalOutboxDispatcher', () => {
  it('delivers with stable idempotency and lease-fenced completion', async () => {
    const store = fakeStore([entry()]);
    const delivery: IOutboxDeliveryGateway = { deliver: vi.fn().mockResolvedValue(undefined) };
    const dispatcher = new TransactionalOutboxDispatcher(store, delivery, () => new Date('2026-08-13T01:00:00Z'));
    await expect(dispatcher.dispatchBatch(request)).resolves.toEqual({ claimed: 1, processed: 1, failed: 0, exhausted: 0, leaseLost: 0 });
    expect(delivery.deliver).toHaveBeenCalledWith(expect.objectContaining({ id: 'outbox-1' }), { idempotencyKey: 'outbox-1' });
    expect(store.markProcessed).toHaveBeenCalledWith('outbox-1', lease, new Date('2026-08-13T01:00:00Z'));
  });

  it('sanitizes delivery errors and applies exponential retry backoff behind the current lease', async () => {
    const store = fakeStore([entry(1)]);
    const delivery: IOutboxDeliveryGateway = { deliver: vi.fn().mockRejectedValue(new Error('token=top-secret service unavailable')) };
    const now = new Date('2026-08-13T01:00:00Z');
    const dispatcher = new TransactionalOutboxDispatcher(store, delivery, () => now);
    await expect(dispatcher.dispatchBatch(request)).resolves.toEqual({ claimed: 1, processed: 0, failed: 1, exhausted: 0, leaseLost: 0 });
    expect(store.markFailed).toHaveBeenCalledWith('outbox-1', lease, expect.objectContaining({ message: 'token=[REDACTED] service unavailable' }), new Date(now.getTime() + 2_000));
  });

  it('does not mutate durable state after lease ownership is lost', async () => {
    const store = fakeStore([entry()]);
    (store.markProcessed as any).mockResolvedValue(false);
    const delivery: IOutboxDeliveryGateway = { deliver: vi.fn().mockResolvedValue(undefined) };
    const dispatcher = new TransactionalOutboxDispatcher(store, delivery, () => new Date('2026-08-13T01:00:00Z'));
    await expect(dispatcher.dispatchBatch(request)).resolves.toEqual({ claimed: 1, processed: 0, failed: 0, exhausted: 0, leaseLost: 1 });
  });
});

function fakeStore(entries: TransactionalOutboxEntry[]): ITransactionalOutboxStore {
  return {
    appendInTransaction: vi.fn(), claimPendingBatch: vi.fn().mockResolvedValue(entries),
    renewLease: vi.fn().mockResolvedValue(true), markProcessed: vi.fn().mockResolvedValue(true), markFailed: vi.fn().mockResolvedValue(true),
  };
}
