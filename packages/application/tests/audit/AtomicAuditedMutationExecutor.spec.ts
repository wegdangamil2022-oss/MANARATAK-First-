import { describe, expect, it, vi } from 'vitest';
import { AtomicAuditedMutationExecutor } from '../../src/audit/use-cases/AtomicAuditedMutationExecutor';

const audit = {
  id: 'audit-1', reference: 'AUD-ATOMIC-1', action: 'MAJOR_PUBLISHED', category: 'CRITICAL_MUTATION', severity: 'INFO',
  actorId: 'owner-1', actorType: 'IDENTITY', targetId: 'major-1', targetType: 'MAJOR', source: 'admin-api',
  timestamp: new Date('2026-08-13T00:00:00Z'), contextMetadata: { result: 'SUCCESS' }, correlationReference: 'corr-1',
};

describe('AtomicAuditedMutationExecutor', () => {
  it('runs the business mutation and audit write in one supplied context', async () => {
    const context = { boundaryId: 'boundary-1' };
    const unitOfWork = { execute: vi.fn(async (work: any) => work(context)) };
    const auditRepository = { save: vi.fn(), findBy: vi.fn(), saveInTransaction: vi.fn() };
    const mutation = vi.fn().mockResolvedValue({ id: 'major-1' });
    const executor = new AtomicAuditedMutationExecutor(unitOfWork, auditRepository as any);

    await expect(executor.execute(audit, mutation)).resolves.toEqual({ id: 'major-1' });
    expect(mutation).toHaveBeenCalledWith(context);
    expect(auditRepository.saveInTransaction).toHaveBeenCalledWith(expect.objectContaining({}), context);
  });

  it('does not write a success audit record when the business mutation fails', async () => {
    const unitOfWork = { execute: vi.fn(async (work: any) => work({ boundaryId: 'boundary-1' })) };
    const auditRepository = { save: vi.fn(), findBy: vi.fn(), saveInTransaction: vi.fn() };
    const executor = new AtomicAuditedMutationExecutor(unitOfWork, auditRepository as any);

    await expect(executor.execute(audit, async () => { throw new Error('mutation failed'); })).rejects.toThrow('mutation failed');
    expect(auditRepository.saveInTransaction).not.toHaveBeenCalled();
  });

  it('propagates audit persistence failure so the unit of work rolls back business data', async () => {
    const unitOfWork = { execute: vi.fn(async (work: any) => work({ boundaryId: 'boundary-1' })) };
    const auditRepository = { save: vi.fn(), findBy: vi.fn(), saveInTransaction: vi.fn().mockRejectedValue(new Error('audit failed')) };
    const executor = new AtomicAuditedMutationExecutor(unitOfWork, auditRepository as any);

    await expect(executor.execute(audit, async () => 'business-result')).rejects.toThrow('audit failed');
  });
});
