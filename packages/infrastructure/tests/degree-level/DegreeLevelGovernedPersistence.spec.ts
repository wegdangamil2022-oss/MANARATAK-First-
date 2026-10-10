import { describe, expect, it, vi } from 'vitest';
import { DegreeLevelRepository } from '../../src/degree-level/DegreeLevelRepository';
import { PrismaAcademicTaxonomyRepository } from '../../src/academic-taxonomy/PrismaAcademicTaxonomyRepository';
const revision = '2026-10-09T00:00:00.000Z';
const data = { canonicalCode: 'MASTER', nameEn: 'Master', nameAr: 'ماجستير', displayRank: 40, status: 'ACTIVE', aliases: { en: ['old'] }, metadata: { source: 'seed' } } as any;
describe('CAS and bound owner persistence', () => {
  it('includes canonical identity and revision in CAS without rewriting provenance', async () => {
    const db = { degreeLevel: { updateMany: vi.fn(async () => ({ count: 1 })), findUnique: vi.fn(async () => ({ ...data, id: 'degree', createdAt: new Date(revision), updatedAt: new Date() })) } };
    await new DegreeLevelRepository(db as any).updateDegreeLevel('degree', data, revision);
    const query = db.degreeLevel.updateMany.mock.calls[0][0];
    expect(query.where).toEqual({ id: 'degree', canonicalCode: 'MASTER', updatedAt: new Date(revision) });
    expect(query.data).not.toHaveProperty('canonicalCode'); expect(query.data).not.toHaveProperty('aliases'); expect(query.data).not.toHaveProperty('metadata');
    expect(query.data.updatedAt.getTime()).toBeGreaterThan(new Date(revision).getTime());
  });
  it('reports a concurrent loser instead of overwriting or upserting', async () => {
    const db = { degreeLevel: { updateMany: vi.fn(async () => ({ count: 0 })), findUnique: vi.fn() } };
    await expect(new DegreeLevelRepository(db as any).updateDegreeLevel('degree', data, revision)).rejects.toThrow('DEGREE_LEVEL_VERSION_CONFLICT');
    expect(db.degreeLevel.findUnique).not.toHaveBeenCalled();
  });
  it('locks the bound transaction without opening a separate transaction', async () => {
    const root = { $transaction: vi.fn() };
    const tx = { $queryRaw: vi.fn(async () => []), academicTaxonomyNode: { count: vi.fn(async () => 0) } };
    const repo = new PrismaAcademicTaxonomyRepository(root as any).withTransaction({ boundaryId: 'tx', transactionClient: tx } as any);
    await repo.executeSerializable(async bound => bound.countNodes!({ status: 'ACTIVE' as any }));
    expect(tx.$queryRaw).toHaveBeenCalledOnce(); expect(root.$transaction).not.toHaveBeenCalled();
    expect(tx.academicTaxonomyNode.count).toHaveBeenCalledWith({ where: { status: 'ACTIVE' } });
  });
  it('uses identical filtered predicates for bounded rows and totals', async () => {
    const table = { findMany: vi.fn(async () => []), count: vi.fn(async () => 7) };
    const repo = new PrismaAcademicTaxonomyRepository({ academicTaxonomyNode: table } as any);
    const filters = { parentNodeId: 'parent', q: 'ICT', page: 2, pageSize: 25 };
    await repo.listNodes(filters); await repo.countNodes(filters);
    expect(table.findMany.mock.calls[0][0].where).toEqual(table.count.mock.calls[0][0].where);
    expect(table.findMany.mock.calls[0][0]).toMatchObject({ skip: 25, take: 25, where: { childEdges: { some: { parentNodeId: 'parent' } } } });
  });
});
