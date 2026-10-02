import { describe, expect, it, vi } from 'vitest';
import type { AuditRecord, AtomicPersistenceContext, ITransactionalAuditRecordRepository, ITransactionalOutboxStore, TransactionalOutboxEntry, IMajorRepository, IInternationalTestRepository, IAcademicTaxonomyRepository, IDegreeLevelRepository, IReferenceResolver } from '@manaratak/domain';
import { AdminMajorUseCases } from '../../src/majors/use-cases/AdminMajorUseCases';
import { AdminAcademicTaxonomyUseCases } from '../../src/academic-taxonomy/use-cases/AdminAcademicTaxonomyUseCases';
import { InternationalTestAdminUseCases } from '../../src/tests-platform/use-cases/InternationalTestUseCases';
import { AtomicDomainMutationCoordinator } from '../../src/event-foundation/use-cases/AtomicDomainMutationCoordinator';
import { AtomicAuditedOutboxMutationExecutor } from '../../src/event-foundation/use-cases/AtomicAuditedOutboxMutationExecutor';

const review = { relationshipType: 'PRIMARY' as const, reason: 'Official source checked', evidenceReference: 'review-1' };
const actor = { actorId: 'verified-identity' };
function fixture(failure?: 'audit' | 'outbox') {
  let state = { writes: 0, audits: [] as AuditRecord[], outbox: [] as TransactionalOutboxEntry[] };
  const tx = { boundaryId: 'graph-memory' };
  const unit = { execute: async <T>(operation: (ctx: AtomicPersistenceContext) => Promise<T>) => {
    const before = { writes: state.writes, audits: [...state.audits], outbox: [...state.outbox] };
    try { return await operation(tx); } catch (error) { state = before; throw error; }
  } };
  const audits = { saveInTransaction: async (record: AuditRecord, context: AtomicPersistenceContext) => { expect(context).toBe(tx); if (failure === 'audit') throw new Error('audit failure'); state.audits.push(record); } };
  const outbox = { appendInTransaction: async (record: TransactionalOutboxEntry, context: AtomicPersistenceContext) => { expect(context).toBe(tx); if (failure === 'outbox') throw new Error('outbox failure'); state.outbox.push(record); } };
  const coordinator = new AtomicDomainMutationCoordinator(new AtomicAuditedOutboxMutationExecutor(unit, audits as unknown as ITransactionalAuditRecordRepository, outbox as unknown as ITransactionalOutboxStore));
  const write = vi.fn(async () => { state.writes++; });
  const majorRepo = { withTransaction: vi.fn(() => majorRepo), addReviewedClassificationMapping: vi.fn(async () => { state.writes++; return { id: 'mapping', taxonomyNodeId: 'node', ...review }; }), list: vi.fn().mockResolvedValue({ data: [] }) };
  const testRepo = { withTransaction: vi.fn(() => testRepo), acquireGraphMutationLock: vi.fn(), findById: vi.fn().mockResolvedValue({ id: 'test', status: 'DRAFT', countryRelationships: [] }), upsertCountryRelationship: write, upsertLanguageRelationship: write, upsertAcademicTaxonomyRelationship: write, upsertDegreeRelationship: write };
  const references = { resolveCountry: vi.fn().mockResolvedValue({ id: 'reference', active: true, standardCode: 'YE' }), resolveLanguage: vi.fn().mockResolvedValue({ id: 'reference', active: true, standardCode: 'ara' }) };
  const degrees = { getDegreeLevelById: vi.fn().mockResolvedValue({ id: 'reference', status: 'ACTIVE', canonicalCode: 'BACHELOR' }) };
  const taxonomy = { getNode: vi.fn().mockResolvedValue({ nodeId: 'reference', status: 'ACTIVE' }) };
  const catalog = { listCatalog: vi.fn() };
  const majors = new AdminMajorUseCases(majorRepo as unknown as IMajorRepository, catalog, undefined, undefined, coordinator);
  const tests = new InternationalTestAdminUseCases(testRepo as unknown as IInternationalTestRepository, undefined, undefined, undefined, references as unknown as IReferenceResolver, degrees as unknown as IDegreeLevelRepository, coordinator, taxonomy as unknown as IAcademicTaxonomyRepository);
  return { majors, tests, majorRepo, testRepo, references, degrees, taxonomy, write, catalog, state: () => state };
}
describe('M10-10 canonical graph source mutations', () => {
  it('records verified Major actor, review evidence and outbox atomically', async () => {
    const f = fixture(); await f.majors.addClassificationMapping('major', { taxonomyNodeId: 'node', ...review }, actor);
    expect(f.state().writes).toBe(1); expect(f.state().audits[0].getActor().getActorId()).toBe(actor.actorId);
    expect(f.state().audits[0].getContextMetadata().getData()).toMatchObject({ taxonomyNodeId: 'node', reason: review.reason, evidenceReference: 'review-1', atomicity: 'BUSINESS_AUDIT_OUTBOX' });
    expect(f.state().outbox[0]).toMatchObject({ domain: 'MAJORS', eventType: 'MAJOR_CLASSIFICATION_MAPPING_ADDED' });
    expect(f.majorRepo.withTransaction).toHaveBeenCalledWith({ boundaryId: 'graph-memory' });
  });
  it.each(['COUNTRY', 'LANGUAGE', 'TAXONOMY', 'DEGREE'] as const)('adds one %s link without replacing other relationships, publication state or identity', async kind => {
    const f = fixture(); await f.tests.addCanonicalRelationship('test', { kind, referenceId: 'reference', ...review }, actor);
    expect(f.testRepo.acquireGraphMutationLock).toHaveBeenCalledWith('test', kind, 'reference');
    expect(f.write).toHaveBeenCalledWith('test', expect.objectContaining({ relationshipType: 'PRIMARY', notes: review.reason, metadata: { source: 'ADMIN_REVIEW', evidenceReference: 'review-1' } }));
    expect(f.state().audits[0].getActor().getActorId()).toBe(actor.actorId);
    expect(f.state().audits[0].getContextMetadata().getData()).toMatchObject({ kind, referenceId: 'reference', reason: review.reason, evidenceReference: 'review-1' });
    expect(f.state().outbox[0]).toMatchObject({ domain: 'INTERNATIONAL_TESTS', aggregate: { aggregateId: 'test' } });
  });
  it.each(['audit', 'outbox'] as const)('rolls back both domains when %s fails', async failure => {
    for (const domain of ['major', 'test']) {
      const f = fixture(failure);
      await expect(domain === 'major' ? f.majors.addClassificationMapping('major', { taxonomyNodeId: 'node', ...review }, actor) : f.tests.addCanonicalRelationship('test', { kind: 'COUNTRY', referenceId: 'reference', ...review }, actor)).rejects.toThrow(failure + ' failure');
      expect(f.state()).toEqual({ writes: 0, audits: [], outbox: [] });
    }
  });
  it('rejects source catalog identity, missing actor and missing evidence before writing', async () => {
    const f = fixture();
    await expect(f.majors.addClassificationMapping('cat-1', { taxonomyNodeId: 'node', ...review }, actor)).rejects.toThrow('CANONICAL_PROMOTION');
    await expect(f.majors.addClassificationMapping('major', { taxonomyNodeId: 'node', ...review })).rejects.toThrow('ACTOR_REQUIRED');
    await expect(f.tests.addCanonicalRelationship('test', { kind: 'COUNTRY', referenceId: 'reference', ...review })).rejects.toThrow('ACTOR_REQUIRED');
    await expect(f.tests.addCanonicalRelationship('test', { kind: 'COUNTRY', referenceId: 'reference', ...review, reason: ' ' }, actor)).rejects.toThrow('REVIEW_REQUIRED');
    expect(f.state().writes).toBe(0);
  });
  it.each(['COUNTRY', 'LANGUAGE', 'TAXONOMY', 'DEGREE'] as const)('rejects duplicate %s relationships', async kind => {
    const f = fixture();
    const key = { COUNTRY: 'countryRelationships', LANGUAGE: 'languageRelationships', TAXONOMY: 'academicTaxonomyRelationships', DEGREE: 'degreeRelationships' }[kind];
    f.testRepo.findById.mockResolvedValue({ id: 'test', status: 'DRAFT', [key]: [{ canonicalReferenceId: 'reference', taxonomyNodeId: 'reference', degreeLevelId: 'reference', relationshipType: 'PRIMARY' }] } as never);
    await expect(f.tests.addCanonicalRelationship('test', { kind, referenceId: 'reference', ...review }, actor)).rejects.toThrow('DUPLICATE_RELATIONSHIP');
    expect(f.state().writes).toBe(0);
  });
  it.each(['PUBLISHED', 'ARCHIVED'])('rejects immutable test owner %s', async status => {
    const f = fixture(); f.testRepo.findById.mockResolvedValue({ id: 'test', status } as never);
    await expect(f.tests.addCanonicalRelationship('test', { kind: 'COUNTRY', referenceId: 'reference', ...review }, actor)).rejects.toThrow('OWNER_IMMUTABLE'); expect(f.write).not.toHaveBeenCalled();
  });
  it('rejects inactive canonical target and nonexistent test', async () => {
    const f = fixture(); f.references.resolveCountry.mockResolvedValue({ id: 'reference', active: false, standardCode: 'YE' });
    await expect(f.tests.addCanonicalRelationship('test', { kind: 'COUNTRY', referenceId: 'reference', ...review }, actor)).rejects.toThrow('Active canonical COUNTRY not found');
    f.testRepo.findById.mockResolvedValue(null as never);
    await expect(f.tests.addCanonicalRelationship('test', { kind: 'DEGREE', referenceId: 'reference', ...review }, actor)).rejects.toThrow('OWNER_NOT_FOUND'); expect(f.write).not.toHaveBeenCalled();
  });
  it('canonical filter bypasses the source catalog without losing bounded pagination', async () => {
    const f = fixture(); const filters = { taxonomyNodeId: 'node', page: 2, pageSize: 50 };
    await f.majors.listMajors(filters); expect(f.majorRepo.list).toHaveBeenCalledWith(filters); expect(f.catalog.listCatalog).not.toHaveBeenCalled();
  });
  it('existing taxonomy action rejects a cycle through the real validator inside the transaction', async () => {
    const nodes = ['a', 'b', 'c'].map(nodeId => ({ nodeId, nodeType: 'DISCIPLINE', canonicalCode: nodeId, canonicalName: nodeId, status: 'ACTIVE' }));
    const repo = { listNodes: vi.fn().mockResolvedValue(nodes), listEdges: vi.fn().mockResolvedValue([{ parentNodeId: 'a', childNodeId: 'b' }, { parentNodeId: 'b', childNodeId: 'c' }]), addEdge: vi.fn(), executeSerializable: vi.fn(async (operation: (repository: IAcademicTaxonomyRepository) => Promise<unknown>) => operation(repo as unknown as IAcademicTaxonomyRepository)) };
    const cases = new AdminAcademicTaxonomyUseCases(repo as unknown as IAcademicTaxonomyRepository);
    await expect(cases.addEdge({ parentNodeId: 'c', childNodeId: 'a' })).rejects.toThrow('CYCLE_DETECTED');
    expect(repo.executeSerializable).toHaveBeenCalledOnce(); expect(repo.addEdge).not.toHaveBeenCalled();
  });
});
