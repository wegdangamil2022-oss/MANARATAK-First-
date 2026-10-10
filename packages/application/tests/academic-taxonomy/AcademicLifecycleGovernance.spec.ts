import { describe, expect, it, vi } from 'vitest';
import { AdminAcademicTaxonomyUseCases } from '../../src/academic-taxonomy/use-cases/AdminAcademicTaxonomyUseCases';
import { DegreeLevelUseCases } from '../../src/degree-level/DegreeLevelUseCases';
import { AtomicDomainMutationCoordinator } from '../../src/event-foundation/use-cases/AtomicDomainMutationCoordinator';
import { AtomicAuditedOutboxMutationExecutor } from '../../src/event-foundation/use-cases/AtomicAuditedOutboxMutationExecutor';
const revision = '2026-10-09T00:00:00.000Z';
const node = { nodeId: 'node', nodeType: 'ACADEMIC_FIELD', canonicalCode: '06', canonicalName: 'ICT', standardType: 'ISCED', status: 'ACTIVE', updatedAt: new Date(revision) } as any;
const decision = { reason: 'Retired after review', acknowledgeHistoricalReferences: true };
function setup() {
  const repo = { getNode: vi.fn(async () => node), updateNode: vi.fn(async (_id, data) => ({ ...node, ...data })), removeEdge: vi.fn(), removeAlias: vi.fn(), removeMapping: vi.fn() };
  const usage = { summarize: vi.fn(async () => ({ totalReferences: 5 })), withTransaction: vi.fn() };
  return { repo, usage, cases: new AdminAcademicTaxonomyUseCases(repo as any, undefined, undefined, undefined, usage as any) };
}
describe('academic lifecycle governance', () => {
  it('blocks status mutation without a reason and acknowledgement', async () => {
    const h = setup();
    await expect(h.cases.editNode('node', { ...node, status: 'ARCHIVED' }, revision)).rejects.toThrow('ACADEMIC_LIFECYCLE_DECISION_REQUIRED');
    expect(h.repo.updateNode).not.toHaveBeenCalled();
  });
  it('does not treat an unchecked impact acknowledgement as approval', async () => {
    const h = setup();
    await expect(h.cases.editNode('node', { ...node, status: 'ARCHIVED', lifecycle: { ...decision, acknowledgeHistoricalReferences: false } }, revision)).rejects.toThrow('ACADEMIC_LIFECYCLE_DECISION_REQUIRED');
    expect(h.usage.summarize).not.toHaveBeenCalled();
  });
  it('archives a used identity without deleting or remapping historical relationships', async () => {
    const h = setup();
    const result = await h.cases.editNode('node', { ...node, status: 'ARCHIVED', lifecycle: decision }, revision);
    expect(result.node.nodeId).toBe('node'); expect(result.node.status).toBe('ARCHIVED');
    expect(h.usage.summarize).toHaveBeenCalledWith('TAXONOMY_NODE', 'node');
    expect(h.repo.removeEdge).not.toHaveBeenCalled(); expect(h.repo.removeAlias).not.toHaveBeenCalled(); expect(h.repo.removeMapping).not.toHaveBeenCalled();
  });
  it('fails closed when impact queries fail', async () => {
    const h = setup(); h.usage.summarize.mockRejectedValueOnce(new Error('IMPACT_OFFLINE'));
    await expect(h.cases.editNode('node', { ...node, status: 'ARCHIVED', lifecycle: decision }, revision)).rejects.toThrow('IMPACT_OFFLINE');
    expect(h.repo.updateNode).not.toHaveBeenCalled();
  });
  it('allows name edits without turning them into retirement commands', async () => {
    const h = setup();
    await h.cases.editNode('node', { ...node, canonicalName: 'Information Technology' }, revision);
    expect(h.usage.summarize).not.toHaveBeenCalled(); expect(h.repo.updateNode).toHaveBeenCalledOnce();
  });
  it('does not create an already archived canonical identity', async () => {
    const repo = { getNodeByCanonicalKey: async () => null, createNode: vi.fn() };
    await expect(new AdminAcademicTaxonomyUseCases(repo as any).upsertNode({ ...node, status: 'ARCHIVED' })).rejects.toThrow('ACADEMIC_CREATE_ARCHIVED_FORBIDDEN');
    expect(repo.createNode).not.toHaveBeenCalled();
  });
  it('requires impact governance for degree deprecation', async () => {
    const repo = { getDegreeLevelById: async () => ({ ...node, id: 'degree', canonicalCode: 'MASTER' }), updateDegreeLevel: vi.fn(async () => ({})) };
    const usage = { summarize: vi.fn(async () => ({ totalReferences: 7 })) };
    const cases = new DegreeLevelUseCases(repo as any, undefined, usage as any);
    const command = { expectedUpdatedAt: revision, nameEn: 'Master', nameAr: 'ماجستير', status: 'DEPRECATED' as any };
    await expect(cases.update('degree', command)).rejects.toThrow('ACADEMIC_LIFECYCLE_DECISION_REQUIRED');
    await cases.update('degree', { ...command, lifecycle: decision });
    expect(usage.summarize).toHaveBeenCalledWith('DEGREE_LEVEL', 'degree');
  });
  it('refuses unsupported merge or supersession semantics rather than assigning a status without a replacement', async () => {
    const repo = { getDegreeLevelById: async () => ({ ...node, canonicalCode: 'MASTER' }), updateDegreeLevel: vi.fn() };
    const cases = new DegreeLevelUseCases(repo as any);
    await expect(cases.update('degree', { expectedUpdatedAt: revision, nameEn: 'Master', nameAr: 'ماجستير', status: 'SUPERSEDED' as any, lifecycle: decision })).rejects.toThrow('DEGREE_LEVEL_REPLACEMENT_UNSUPPORTED');
    expect(repo.updateDegreeLevel).not.toHaveBeenCalled();
  });
  it('binds impact to the same transaction and records the retirement reason in the owner audit', async () => {
    const tx = { boundaryId: 'atomic' };
    const h = setup();
    const bound = { ...h.repo, executeSerializable: async (work: any) => work(bound) };
    const repo = { withTransaction: () => bound };
    h.usage.withTransaction.mockReturnValue(h.usage);
    const audit = { saveInTransaction: vi.fn(async () => {}) };
    const outbox = { appendInTransaction: vi.fn(async () => {}) };
    const executor = new AtomicAuditedOutboxMutationExecutor({ execute: async (work: any) => work(tx) } as any, audit as any, outbox as any);
    const cases = new AdminAcademicTaxonomyUseCases(repo as any, undefined, undefined, new AtomicDomainMutationCoordinator(executor), h.usage as any);
    await cases.editNode('node', { ...node, status: 'ARCHIVED', lifecycle: decision }, revision, { actorId: 'admin' });
    expect(h.usage.withTransaction).toHaveBeenCalledWith(tx);
    expect(audit.saveInTransaction.mock.calls[0][0].getContextMetadata().getData()).toMatchObject({ lifecycleReason: decision.reason, historicalReferencesPreserved: true, requestedStatus: 'ARCHIVED' });
    expect(outbox.appendInTransaction).toHaveBeenCalledOnce();
  });
});
