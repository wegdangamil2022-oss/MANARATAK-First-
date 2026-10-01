import { describe, expect, it, vi } from 'vitest';
import { ExternalCourseProviderStatus, type AtomicPersistenceContext, type AuditRecord, type ExternalCourseProviderDto, type ICourseProviderRegistryRepository, type ITransactionalAuditRecordRepository, type ITransactionalOutboxStore, type TransactionalOutboxEntry, type UpdateCourseProviderMappings } from '@manaratak/domain';
import { CourseProviderRegistryUseCases, validateProviderMappings } from '../../src/courses/use-cases/CourseProviderRegistryUseCases';
import { AtomicAuditedOutboxMutationExecutor } from '../../src/event-foundation/use-cases/AtomicAuditedOutboxMutationExecutor';

const input: UpdateCourseProviderMappings = { expectedUpdatedAt: '2026-10-01T00:00:00.000Z', displayName: 'Provider', officialWebsite: 'https://example.com', aliases: [{ alias: 'Source label', locale: 'en' }], allowedDomains: ['example.com'], mappingsReviewed: true, reason: 'Official source reviewed', evidenceReference: 'review-001' };
const provider = { id: 'provider-id', publicId: 'PROVIDER-1', status: ExternalCourseProviderStatus.APPROVED, displayName: 'Original', aliases: [], allowedDomains: [] } as unknown as ExternalCourseProviderDto;
function fixture(fail?: 'audit' | 'outbox') {
  let state = { writes: 0, audit: [] as AuditRecord[], outbox: [] as TransactionalOutboxEntry[] };
  const context = { boundaryId: 'provider-memory-boundary' };
  const unit = { execute: async <T>(work: (context: AtomicPersistenceContext) => Promise<T>): Promise<T> => {
    const before = { writes: state.writes, audit: [...state.audit], outbox: [...state.outbox] };
    try { return await work(context); } catch (error) { state = before; throw error; }
  } };
  const audit = { saveInTransaction: vi.fn(async (record: AuditRecord, ctx: AtomicPersistenceContext) => { expect(ctx).toBe(context); if (fail === 'audit') throw new Error('audit unavailable'); state.audit.push(record); }) };
  const outbox = { appendInTransaction: vi.fn(async (entry: TransactionalOutboxEntry, ctx: AtomicPersistenceContext) => { expect(ctx).toBe(context); if (fail === 'outbox') throw new Error('outbox unavailable'); state.outbox.push(entry); }) };
  const repository = { findById: vi.fn().mockResolvedValue(provider), resolveByName: vi.fn(), listRegistry: vi.fn().mockResolvedValue({ data: [provider], total: 101 }), updateMappingsInTransaction: vi.fn(async (_id: string, _input: UpdateCourseProviderMappings, ctx: AtomicPersistenceContext) => { expect(ctx).toBe(context); state.writes++; return provider; }) };
  const executor = new AtomicAuditedOutboxMutationExecutor(unit, audit as unknown as ITransactionalAuditRecordRepository, outbox as unknown as ITransactionalOutboxStore);
  const cases = new CourseProviderRegistryUseCases(repository as unknown as ICourseProviderRegistryRepository, executor);
  return { cases, repository, state: () => state, executor };
}
describe('M10-09 provider registry source contracts', () => {
  it('commits mapping review, actor audit and outbox through one boundary without replacing provider identity', async () => {
    const f = fixture(); const saved = await f.cases.update(provider.id, input, 'verified-actor', 'trace-1');
    expect(saved.id).toBe(provider.id); expect(f.state().writes).toBe(1);
    expect(f.state().audit[0].getActor().getActorId()).toBe('verified-actor');
    expect(f.state().audit[0].getTarget().getTargetId()).toBe(provider.id);
    expect(f.state().outbox[0]).toMatchObject({ domain: 'COURSES', metadata: { actorId: 'verified-actor' }, payload: { reason: input.reason, evidenceReference: 'review-001' } });
  });
  it.each(['audit', 'outbox'] as const)('rolls back all memory writes on %s failure', async failure => {
    const f = fixture(failure); await expect(f.cases.update(provider.id, input, 'actor')).rejects.toThrow(failure + ' unavailable');
    expect(f.state()).toEqual({ writes: 0, audit: [], outbox: [] });
  });
  it('rejects missing actor/executor before a write', async () => {
    const f = fixture(); await expect(f.cases.update(provider.id, input, '')).rejects.toThrow('AUDITED_TRANSACTION_REQUIRED');
    const cases = new CourseProviderRegistryUseCases(f.repository as unknown as ICourseProviderRegistryRepository, undefined as unknown as AtomicAuditedOutboxMutationExecutor);
    await expect(cases.update(provider.id, input, 'actor')).rejects.toThrow('AUDITED_TRANSACTION_REQUIRED'); expect(f.repository.updateMappingsInTransaction).not.toHaveBeenCalled();
  });
  it.each([
    { ...input, reason: '' }, { ...input, evidenceReference: '' }, { ...input, mappingsReviewed: false },
    { ...input, allowedDomains: ['*.example.com'] }, { ...input, allowedDomains: ['127.0.0.1'] }, { ...input, allowedDomains: ['https://example.com'] },
    { ...input, allowedDomains: ['db.internal'] }, { ...input, allowedDomains: ['com'] }, { ...input, officialWebsite: 'https://evil.com' },
    { ...input, officialWebsite: 'https://user:password@example.com' }, { ...input, aliases: [{ alias: 'Foo' }, { alias: 'FOO' }] },
  ])('rejects invalid review/domain/duplicate alias before persistence %#', async bad => {
    const f = fixture(); await expect(f.cases.update(provider.id, bad as UpdateCourseProviderMappings, 'actor')).rejects.toThrow('MAPPING_INVALID'); expect(f.repository.updateMappingsInTransaction).not.toHaveBeenCalled();
  });
  it('validates a subdomain official site without making any request', () => { expect(() => validateProviderMappings({ ...input, officialWebsite: 'https://courses.example.com' })).not.toThrow(); });
  it('returns review for unknown/unapproved source labels and a stable ID only for approved exact mappings', async () => {
    const f = fixture(); f.repository.resolveByName.mockResolvedValue(null);
    expect(await f.cases.resolveLabel(' Unknown ')).toEqual({ state: 'REVIEW_REQUIRED', rawLabel: ' Unknown ', providerId: null });
    f.repository.resolveByName.mockResolvedValue({ ...provider, status: 'NEEDS_REVIEW' }); expect((await f.cases.resolveLabel('Source label')).state).toBe('REVIEW_REQUIRED');
    f.repository.resolveByName.mockResolvedValue(provider); expect(await f.cases.resolveLabel('Source label')).toMatchObject({ state: 'VERIFIED_MAPPING', providerId: provider.id, publicId: provider.publicId });
  });
  it('reports bounded pagination and refuses invalid page sizes', async () => {
    const f = fixture(); expect(await f.cases.list({ page: 2, pageSize: 50 })).toMatchObject({ totalPages: 3, page: 2, total: 101 });
    await expect(f.cases.list({ page: 1, pageSize: 101 })).rejects.toThrow('MAPPING_INVALID');
  });
});
