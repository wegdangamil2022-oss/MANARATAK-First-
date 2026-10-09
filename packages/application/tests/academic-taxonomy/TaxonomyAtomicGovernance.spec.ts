import { describe, expect, it, vi } from 'vitest';
import { AdminAcademicTaxonomyUseCases } from '../../src/academic-taxonomy/use-cases/AdminAcademicTaxonomyUseCases';
import { LocalizedPublicAcademicTaxonomyUseCases } from '../../src/academic-taxonomy/use-cases/LocalizedPublicAcademicTaxonomyUseCases';
import { DegreeLevelUseCases } from '../../src/degree-level/DegreeLevelUseCases';
import { AtomicDomainMutationCoordinator } from '../../src/event-foundation/use-cases/AtomicDomainMutationCoordinator';
import { AtomicAuditedOutboxMutationExecutor } from '../../src/event-foundation/use-cases/AtomicAuditedOutboxMutationExecutor';

const revision = '2026-10-09T00:00:00.000Z';
const data = { nodeType: 'ACADEMIC_FIELD', canonicalCode: '06', canonicalName: 'ICT', standardType: 'ISCED', status: 'ACTIVE' } as any;
const node = { ...data, nodeId: 'node', createdAt: new Date(revision), updatedAt: new Date(revision) };
function harness(failOutbox = false) {
  const committed: string[] = [];
  const staged: string[] = [];
  const tx = { boundaryId: 'same-boundary' };
  const audit = { saveInTransaction: vi.fn(async (_record, context) => { expect(context).toBe(tx); staged.push('audit'); }) };
  const outbox = { appendInTransaction: vi.fn(async (_entry, context) => { expect(context).toBe(tx); if (failOutbox) throw new Error('OUTBOX_FAILED'); staged.push('outbox'); }) };
  const unit = { execute: async (work: any) => { try { const result = await work(tx); committed.push(...staged); return result; } finally { staged.length = 0; } } };
  const bound = { getNodeByCanonicalKey: vi.fn(async () => null), createNode: vi.fn(async () => { staged.push('business'); return node; }),
    executeSerializable: vi.fn(async (work: any) => work(bound)) };
  const repo = { withTransaction: vi.fn(() => bound), upsertNode: vi.fn() };
  const coordinator = new AtomicDomainMutationCoordinator(new AtomicAuditedOutboxMutationExecutor(unit as any, audit as any, outbox as any));
  return { committed, tx, bound, repo, audit, outbox, coordinator, cases: new AdminAcademicTaxonomyUseCases(repo as any, undefined, undefined, coordinator) };
}
describe('owner atomic governance and bounded reads', () => {
  it('commits business, audit and event in one bound owner transaction', async () => {
    const h = harness();
    await h.cases.upsertNode(data, { actorId: 'admin', correlationId: 'request' });
    expect(h.committed).toEqual(['business', 'audit', 'outbox']);
    expect(h.repo.withTransaction).toHaveBeenCalledWith(h.tx);
    expect(h.outbox.appendInTransaction).toHaveBeenCalledWith(expect.objectContaining({ domain: 'ACADEMIC_TAXONOMY', correlationId: 'request', metadata: expect.objectContaining({ actorId: 'admin' }) }), h.tx);
    expect(h.repo.upsertNode).not.toHaveBeenCalled();
  });
  it('rolls back staged business and audit when event append fails', async () => {
    const h = harness(true);
    await expect(h.cases.upsertNode(data, { actorId: 'admin' })).rejects.toThrow('OUTBOX_FAILED');
    expect(h.committed).toEqual([]);
  });
  it('fails closed before entering persistence when actor context is missing', async () => {
    const h = harness();
    await expect(h.cases.upsertNode(data)).rejects.toThrow('TAXONOMY_ATOMIC_CONTEXT_REQUIRED');
    expect(h.repo.withTransaction).not.toHaveBeenCalled();
  });
  it('refuses versionless overwrites through the old create route', async () => {
    const repo = { getNodeByCanonicalKey: vi.fn(async () => node), upsertNode: vi.fn(), createNode: vi.fn() };
    await expect(new AdminAcademicTaxonomyUseCases(repo as any).upsertNode(data)).rejects.toThrow('TAXONOMY_NODE_VERSION_CONFLICT');
    expect(repo.upsertNode).not.toHaveBeenCalled(); expect(repo.createNode).not.toHaveBeenCalled();
  });
  it('returns exact totals and no phantom next page on a full final page', async () => {
    const repo = { listNodes: vi.fn(async () => [node]), countNodes: vi.fn(async () => 50) };
    const filters = { q: 'ICT', page: 2, pageSize: 25 };
    const page = await new AdminAcademicTaxonomyUseCases(repo as any).listNodesPage(filters);
    expect(page).toMatchObject({ total: 50, totalPages: 2, hasNextPage: false });
    expect(repo.listNodes).toHaveBeenCalledWith(filters); expect(repo.countNodes).toHaveBeenCalledWith(filters);
  });
  it('bounds the localized public path and forces ACTIVE even if caller asks for drafts', async () => {
    const repo = { listNodes: vi.fn(async () => []) };
    const cases = new LocalizedPublicAcademicTaxonomyUseCases(repo as any);
    await cases.searchNodes(' ICT ', { status: 'DRAFT' as any }, 'ar');
    expect(repo.listNodes).toHaveBeenCalledWith({ status: 'ACTIVE', q: 'ICT', page: 1, pageSize: 50 });
    await expect(cases.listNodes({ pageSize: 101 })).rejects.toThrow('TAXONOMY_PAGINATION_INVALID');
    expect(repo.listNodes).toHaveBeenCalledTimes(1);
  });
  it('rejects stale degree commands before the write port', async () => {
    const repo = { getDegreeLevelById: vi.fn(async () => ({ updatedAt: new Date(revision) })), updateDegreeLevel: vi.fn() };
    await expect(new DegreeLevelUseCases(repo as any).update('id', { expectedUpdatedAt: '2026-10-08T00:00:00.000Z', nameEn: 'Master', nameAr: 'ماجستير' })).rejects.toThrow('DEGREE_LEVEL_VERSION_CONFLICT');
    expect(repo.updateDegreeLevel).not.toHaveBeenCalled();
  });
  it('does not emit a success event for a missing degree', async () => {
    const h = harness();
    const repo = { withTransaction: () => ({ getDegreeLevelById: async () => null }) };
    await expect(new DegreeLevelUseCases(repo as any, h.coordinator).update('missing', { expectedUpdatedAt: revision, nameEn: 'Master', nameAr: 'ماجستير' }, { actorId: 'admin' })).rejects.toThrow('DEGREE_LEVEL_NOT_FOUND');
    expect(h.audit.saveInTransaction).not.toHaveBeenCalled(); expect(h.committed).toEqual([]);
  });
});
