import { describe, expect, it, vi } from 'vitest';
import {
  type AtomicPersistenceContext, type ITransactionalAuditRecordRepository,
  type ITransactionalOutboxStore, type ITransactionalUniversityRepository,
  type UniversityAcademicProgramAuthoringInput, UniversityStatus,
} from '@manaratak/domain';
import { AdminUniversityUseCases } from '../../src/universities/use-cases/AdminUniversityUseCases';
import { AtomicDomainMutationCoordinator } from '../../src/event-foundation/use-cases/AtomicDomainMutationCoordinator';
import { AtomicAuditedOutboxMutationExecutor } from '../../src/event-foundation/use-cases/AtomicAuditedOutboxMutationExecutor';
import type { IAtomicPersistenceUnitOfWork } from '../../src/event-foundation/gateways/IAtomicPersistenceUnitOfWork';

// Transaction simulation verifies composition and failure propagation, not Prisma rollback.
function fixture(failure?: 'business' | 'audit' | 'outbox') {
  const context = { boundaryId: 'university-pilot-transaction' };
  let state = { programId: 'existing-program', campusIds: ['old-campus'], requirements: ['old-test'], audits: 0, outbox: 0 };
  const initial = structuredClone(state);
  const unitOfWork: IAtomicPersistenceUnitOfWork = {
    async execute<T>(work: (transaction: AtomicPersistenceContext) => Promise<T>) {
      const before = structuredClone(state);
      try { return await work(context); } catch (error) { state = before; throw error; }
    },
  };
  const transactionRepository = {
    upsertAcademicProgram: vi.fn(async (_owner: string, programId: string | null, data: UniversityAcademicProgramAuthoringInput) => {
      state.programId = programId!; state.campusIds = [...data.campusIds!];
      if (failure === 'business') throw new Error('INJECTED_BUSINESS_FAILURE');
      state.requirements = data.admissionRequirements!.map(item => item.internationalTestId);
      return { id: 'university', publicId: 'INS-PILOT-1' };
    }),
  };
  const repository = {
    findById: vi.fn().mockResolvedValue({ id: 'university', status: UniversityStatus.READY_TO_REVIEW }),
    withTransaction: vi.fn((transaction: AtomicPersistenceContext) => { expect(transaction).toBe(context); return transactionRepository; }),
    upsertAcademicProgram: vi.fn(),
  };
  const audit = { saveInTransaction: vi.fn(async (_record: unknown, transaction: AtomicPersistenceContext) => {
    expect(transaction).toBe(context); state.audits++;
    if (failure === 'audit') throw new Error('INJECTED_AUDIT_FAILURE');
  }) };
  const outbox = { appendInTransaction: vi.fn(async (_entry: unknown, transaction: AtomicPersistenceContext) => {
    expect(transaction).toBe(context); state.outbox++;
    if (failure === 'outbox') throw new Error('INJECTED_OUTBOX_FAILURE');
  }) };
  const executor = new AtomicAuditedOutboxMutationExecutor(unitOfWork, audit as unknown as ITransactionalAuditRecordRepository, outbox as unknown as ITransactionalOutboxStore);
  const useCases = new AdminUniversityUseCases(repository as unknown as ITransactionalUniversityRepository, new AtomicDomainMutationCoordinator(executor));
  const write = () => useCases.upsertAcademicProgram('university', 'existing-program', {
    sourceProgramName: 'CS', degreeLevelId: 'degree', majorMappingState: 'UNMAPPED',
    campusIds: ['new-campus'], admissionRequirements: [{ internationalTestId: 'new-test' }],
  }, { actorId: 'verified-actor', correlationId: 'pilot-correlation' });
  return { write, read: () => state, initial, repository, audit, outbox };
}
describe('M10-16 source University mutation transaction composition', () => {
  it.each(['business', 'audit', 'outbox'] as const)('propagates %s failure and restores simulated business/audit/outbox state', async failure => {
    const f = fixture(failure);
    await expect(f.write()).rejects.toThrow(`INJECTED_${failure.toUpperCase()}_FAILURE`);
    expect(f.read()).toEqual(f.initial);
    expect(f.repository.upsertAcademicProgram).not.toHaveBeenCalled();
  });
  it('commits the existing program identity and owner audit/event through one transaction', async () => {
    const f = fixture(); await expect(f.write()).resolves.toMatchObject({ id: 'university', publicId: 'INS-PILOT-1' });
    expect(f.read()).toEqual({ programId: 'existing-program', campusIds: ['new-campus'], requirements: ['new-test'], audits: 1, outbox: 1 });
    expect(f.audit.saveInTransaction).toHaveBeenCalledOnce();
    expect(f.outbox.appendInTransaction).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'UNIVERSITY_ACADEMIC_PROGRAM_UPDATED', correlationId: 'pilot-correlation',
      aggregate: expect.objectContaining({ aggregateId: 'university' }),
      metadata: expect.objectContaining({ actorId: 'verified-actor' }),
    }), expect.anything());
  });
});
