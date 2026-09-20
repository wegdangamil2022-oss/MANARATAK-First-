import { describe, expect, it, vi } from 'vitest';
import { OutboxProcessingState } from '@manaratak/domain';
import { AtomicAuditedOutboxMutationExecutor } from '../../src/event-foundation/use-cases/AtomicAuditedOutboxMutationExecutor';

const audit = {
  id: 'audit-1', reference: 'AUD-1', action: 'REFERENCE_COUNTRY_UPSERTED', category: 'REFERENCE_DATA_MUTATION',
  severity: 'INFO', actorId: 'admin-1', actorType: 'IDENTITY', targetId: 'EG', targetType: 'REFERENCE_COUNTRY',
  source: 'admin-api', timestamp: new Date('2026-08-13T00:00:00Z'), contextMetadata: { result: 'SUCCESS' },
};
const outbox = {
  id: 'outbox-1', eventType: 'REFERENCE_COUNTRY_UPSERTED', domain: 'REFERENCE_DATA', payload: {}, metadata: {},
  createdAt: new Date('2026-08-13T00:00:00Z'), availableAt: new Date('2026-08-13T00:00:00Z'),
  state: OutboxProcessingState.PENDING, attempts: 0,
};

describe('AtomicAuditedOutboxMutationExecutor', () => {
  it('writes business data, audit, and outbox through one context', async () => {
    const context = { boundaryId: 'boundary-1' };
    const unitOfWork = { execute: vi.fn(async (work: any) => work(context)) };
    const auditRepository = { saveInTransaction: vi.fn() };
    const outboxStore = { appendInTransaction: vi.fn() };
    const mutation = vi.fn().mockResolvedValue({ iso2Code: 'EG' });
    const executor = new AtomicAuditedOutboxMutationExecutor(unitOfWork as any, auditRepository as any, outboxStore as any);

    await expect(executor.execute(audit, outbox, mutation)).resolves.toEqual({ iso2Code: 'EG' });
    expect(mutation).toHaveBeenCalledWith(context);
    expect(auditRepository.saveInTransaction).toHaveBeenCalledWith(expect.anything(), context);
    expect(outboxStore.appendInTransaction).toHaveBeenCalledWith(outbox, context);
  });

  it('does not claim success when audit persistence fails', async () => {
    const unitOfWork = { execute: vi.fn(async (work: any) => work({ boundaryId: 'boundary-1' })) };
    const executor = new AtomicAuditedOutboxMutationExecutor(unitOfWork as any, {
      saveInTransaction: vi.fn().mockRejectedValue(new Error('audit failed')),
    } as any, { appendInTransaction: vi.fn() } as any);

    await expect(executor.execute(audit, outbox, async () => 'written')).rejects.toThrow('audit failed');
  });

  it('propagates outbox failure so the unit of work can roll back all writes', async () => {
    const unitOfWork = { execute: vi.fn(async (work: any) => work({ boundaryId: 'boundary-1' })) };
    const executor = new AtomicAuditedOutboxMutationExecutor(unitOfWork as any, {
      saveInTransaction: vi.fn(),
    } as any, { appendInTransaction: vi.fn().mockRejectedValue(new Error('outbox failed')) } as any);

    await expect(executor.execute(audit, outbox, async () => 'written')).rejects.toThrow('outbox failed');
  });
});
