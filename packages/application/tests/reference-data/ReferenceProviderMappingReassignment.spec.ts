import { describe, it, expect, vi } from 'vitest';
import type { IReferenceDataRepository } from '@manaratak/domain';
import { ReferenceDataUseCases } from '../../src';
import type { AtomicAuditedOutboxMutationExecutor } from '../../src/event-foundation/use-cases/AtomicAuditedOutboxMutationExecutor';

describe('P7 provider mapping reconciliation command', () => {
  const base = {
    entityType: 'CITY' as const,
    fromReferenceId: 'source-city-id',
    toReferenceId: 'target-city-id',
    fromExpectedVersion: 3,
    toExpectedVersion: 8,
    providerSystem: 'geonames',
    providerId: '4567',
    reason: 'Original provider ID was assigned to the wrong duplicate',
    reconciliationId: '48ff9182-6ac0-4ae2-975f-c52ff19e8c8d',
  };
  const context = { actorId: 'operator-1', correlationId: 'request-1' };

  it('uses the same atomic business+audit+outbox transaction for an owner transfer', async () => {
    const issued: Array<{ audit: any; outbox: any }> = [];
    const inTx = vi.fn(async () => undefined);
    const executor = {
      execute: vi.fn(async (audit: any, outbox: any, mutation: (ctx: any) => Promise<void>) => {
        await mutation({ boundaryId: 'transaction-1' });
        issued.push({ audit, outbox });
      }),
    } as unknown as AtomicAuditedOutboxMutationExecutor;
    const repo = { reassignProviderMappingInTransaction: inTx } as unknown as IReferenceDataRepository;
    const useCases = new ReferenceDataUseCases(repo, undefined, undefined, executor);

    await expect(useCases.reassignProviderMapping(base, context)).resolves.toBe('APPLIED');
    expect(inTx).toHaveBeenCalledTimes(1);
    expect(inTx.mock.calls[0][0]).toMatchObject({ ...base, actorId: context.actorId });
    expect(issued).toHaveLength(1);
    expect(issued[0].audit.actorId).toBe(context.actorId);
    expect(issued[0].outbox.metadata.atomicity).toBe('BUSINESS_AUDIT_OUTBOX');
  });

  it('does not append a second audit/outbox on a replayed reconciliation ID', async () => {
    const issued: string[] = [];
    let calls = 0;
    const inTx = vi.fn(async () => {
      if (++calls === 2) throw new Error('REFERENCE_MAPPING_RECONCILIATION_ALREADY_APPLIED');
    });
    const executor = {
      execute: vi.fn(async (audit: any, _outbox: any, mutation: (ctx: any) => Promise<void>) => {
        await mutation({ boundaryId: 'transaction-1' });
        issued.push(audit.id);
      }),
    } as unknown as AtomicAuditedOutboxMutationExecutor;
    const repo = { reassignProviderMappingInTransaction: inTx } as unknown as IReferenceDataRepository;
    const useCases = new ReferenceDataUseCases(repo, undefined, undefined, executor);
    expect(await useCases.reassignProviderMapping(base, context)).toBe('APPLIED');
    expect(await useCases.reassignProviderMapping(base, context)).toBe('ALREADY_APPLIED');
    expect(inTx).toHaveBeenCalledTimes(2);
    expect(issued).toHaveLength(1);
  });

  it('fails closed on a self-transfer before reaching the transactional executor', async () => {
    const executor = { execute: vi.fn() } as unknown as AtomicAuditedOutboxMutationExecutor;
    const repo = {} as IReferenceDataRepository;
    const useCases = new ReferenceDataUseCases(repo, undefined, undefined, executor);
    await expect(useCases.reassignProviderMapping({
      ...base, toReferenceId: base.fromReferenceId,
    }, context)).rejects.toThrow('Invalid explicit provider mapping transfer request');
    expect(executor.execute).not.toHaveBeenCalled();
  });
});
