import { describe, it, expect, vi } from 'vitest';
import { AtomicDomainMutationCoordinator } from '../../src/event-foundation/use-cases/AtomicDomainMutationCoordinator';
import { AtomicAuditedOutboxMutationExecutor } from '../../src/event-foundation/use-cases/AtomicAuditedOutboxMutationExecutor';
describe('authorization approval transaction preconditions', () => {
  it('uses the business transaction and rolls approval consumption back if the business or audit fails', async () => {
    let durable = { approvalUsed: false, business: false, audit: false };
    for (const failure of ['business', 'audit']) {
      durable = { approvalUsed: false, business: false, audit: false };
      const unit = {
        execute: async (work: any) => {
          const pending = { ...durable };
          const value = await work({ boundaryId: 'same', pending });
          durable = pending;
          return value;
        },
      };
      const executor = new AtomicAuditedOutboxMutationExecutor(
        unit as any,
        {
          saveInTransaction: async (_audit: any, tx: any) => {
            if (failure === 'audit') throw Error('audit failed');
            tx.pending.audit = true;
          },
        } as any,
        { appendInTransaction: vi.fn() } as any,
      );
      const coordinator = new AtomicDomainMutationCoordinator(executor);
      const check = vi.fn(async (tx: any) => {
        expect(tx.boundaryId).toBe('same');
        tx.pending.approvalUsed = true;
      });
      await expect(
        coordinator.execute(
          {
            domain: 'AUTHORIZATION',
            aggregateType: 'ROLE_ASSIGNMENT',
            aggregateId: 'grant',
            action: 'ROLE_ASSIGNED',
            context: { actorId: 'maker', assertInTransaction: check },
          },
          async (tx: any) => {
            expect(tx.pending.approvalUsed).toBe(true);
            tx.pending.business = true;
            if (failure === 'business') throw Error('business failed');
          },
        ),
      ).rejects.toThrow(failure + ' failed');
      expect(check).toHaveBeenCalledOnce();
      expect(durable).toEqual({ approvalUsed: false, business: false, audit: false });
    }
  });
  it('never executes a business write if persisted approval validation fails', async () => {
    const tx = { boundaryId: 'same' },
      write = vi.fn();
    const executor = { execute: async (_audit: any, _outbox: any, work: any) => work(tx) },
      coordinator = new AtomicDomainMutationCoordinator(executor as any);
    await expect(
      coordinator.execute(
        {
          domain: 'AUTHORIZATION',
          aggregateType: 'ROLE',
          aggregateId: 'role',
          action: 'ROLE_UPDATED',
          context: {
            actorId: 'maker',
            assertInTransaction: async () => {
              throw Error('GOVERNANCE_APPROVAL_REQUIRED');
            },
          },
        },
        write,
      ),
    ).rejects.toThrow('GOVERNANCE_APPROVAL_REQUIRED');
    expect(write).not.toHaveBeenCalled();
  });
});
