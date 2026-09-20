import { describe, expect, it, vi } from 'vitest';
import { OutboxProcessingState, TransactionalOutboxEntry } from '@manaratak/domain';
import { PrismaTransactionalOutboxStore } from '../../src/event-foundation/PrismaTransactionalOutboxStore';

const entry: TransactionalOutboxEntry = {
  id: 'outbox-1', eventType: 'ReferenceCountryUpdated', domain: 'REFERENCE_DATA', payload: { countryId: 'ctry-SA' }, metadata: {},
  createdAt: new Date('2026-08-13T00:00:00Z'), availableAt: new Date('2026-08-13T00:00:00Z'), state: OutboxProcessingState.PENDING, attempts: 0,
};

describe('PrismaTransactionalOutboxStore', () => {
  it('rejects append without an explicit Prisma transaction context', async () => {
    const store = new PrismaTransactionalOutboxStore({} as any);
    await expect(store.appendInTransaction(entry, { boundaryId: 'boundary-1' })).rejects.toThrow('OUTBOX_ATOMIC_TRANSACTION_CONTEXT_REQUIRED');
  });

  it('appends through the supplied transaction client only', async () => {
    const create = vi.fn().mockResolvedValue({});
    const transactionClient = { transactionalOutboxRecord: { create, findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn() } };
    const store = new PrismaTransactionalOutboxStore({} as any);
    await store.appendInTransaction(entry, { boundaryId: 'boundary-1', transactionClient } as any);
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ id: 'outbox-1', state: 'PENDING' }) });
  });

  it('fails closed when the migration delegate is unavailable', async () => {
    const store = new PrismaTransactionalOutboxStore({ transactionalOutboxRecord: undefined } as any);
    await expect(store.markProcessed('outbox-1', { workerId:'w', leaseToken:'t', claimUntil:new Date() }, new Date())).rejects.toThrow('OUTBOX_PERSISTENCE_NOT_MIGRATED');
  });
});
