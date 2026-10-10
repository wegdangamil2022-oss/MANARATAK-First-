import { describe, expect, it, vi } from 'vitest';
import { PrismaAcademicTaxonomyRepository } from '../../src/academic-taxonomy/PrismaAcademicTaxonomyRepository';
const revision = new Date('2026-10-10T01:00:00.000Z');
const row = (id: string): any => ({ id, nodeType: 'ACADEMIC_FIELD', canonicalCode: id, canonicalName: id, status: 'ACTIVE', standardType: 'ISCED', createdAt: revision, updatedAt: revision });
describe('bounded read persistence and historical Unicode closure', () => {
  it('pages active relationships in SQL with primary flags and a matching total predicate', async () => {
    const table = { findMany: vi.fn(async () => [{ id: 'edge', parentNodeId: 'parent', childNodeId: 'child', isPrimary: true, parentNode: row('parent') }]), count: vi.fn(async () => 101) };
    const result = await new PrismaAcademicTaxonomyRepository({ academicTaxonomyEdge: table } as any).relatedNodesPage('child','parents',{ page: 2, pageSize: 25, activeOnly: true });
    expect(result.links?.[0]).toEqual({ edgeId: 'edge', nodeId: 'parent', isPrimary: true }); expect(result.hasNextPage).toBe(true);
    const read = table.findMany.mock.calls[0][0]; expect(read).toMatchObject({ skip: 25, take: 25, where: { childNodeId: 'child', parentNode: { status: 'ACTIVE' } } });
    expect(table.count.mock.calls[0][0].where).toEqual(read.where);
  });
  it('compares legacy aliases with the same JS NFC policy before allowing a new alias', async () => {
    const aliases = [{ id: 'legacy', nodeId: 'other', alias: 'Cafe\u0301', normalizedAlias: 'cafe\u0301', createdAt: revision }];
    const table = { findMany: vi.fn(async () => aliases), create: vi.fn() };
    const result = await new PrismaAcademicTaxonomyRepository({ academicTaxonomyAlias: table } as any).listAliasesByNormalizedAlias('CAFÉ');
    expect(result[0].aliasId).toBe('legacy'); expect(table.create).not.toHaveBeenCalled();
    expect(table.findMany).toHaveBeenCalledWith({ orderBy: { id: 'asc' }, take: 20001 });
  });
  it('does not silently omit legacy alias conflicts above the reconciliation bound', async () => {
    const table = { findMany: vi.fn(async () => Array(20001).fill({})) };
    await expect(new PrismaAcademicTaxonomyRepository({ academicTaxonomyAlias: table } as any).listAliasesByNormalizedAlias('alias')).rejects.toThrow('TAXONOMY_ALIAS_RECONCILIATION_SCOPE_TOO_LARGE');
  });
  it('refuses oversized diagnostic snapshots before loading the entire graph', async () => {
    const tx = { academicTaxonomyNode: { findMany: vi.fn(async () => Array.from({ length: 5001 }, (_, index) => row(`n${index}`))) }, academicTaxonomyEdge: { findMany: vi.fn() } };
    const db = { $transaction: async (read: any) => read(tx) };
    await expect(new PrismaAcademicTaxonomyRepository(db as any).getGovernanceSnapshot()).rejects.toThrow('TAXONOMY_DIAGNOSTICS_SCOPE_TOO_LARGE');
    expect(tx.academicTaxonomyEdge.findMany).not.toHaveBeenCalled();
  });
  it('preserves root and orphan predicates when combined with search and exact counts', async () => {
    const table = { findMany: vi.fn(async () => []), count: vi.fn(async () => 0) };
    const repo = new PrismaAcademicTaxonomyRepository({ academicTaxonomyNode: table } as any);
    await repo.listNodes({ rootOnly: true, q: 'ICT', pageSize: 25 });
    const root = table.findMany.mock.calls[0][0].where; expect(root.childEdges).toEqual({ none: {} }); expect(root.OR).toHaveLength(2); expect(root.AND).toHaveLength(1);
    await repo.countNodes({ orphan: true, unmapped: true });
    expect(table.count).toHaveBeenCalledWith({ where: expect.objectContaining({ childEdges: { none: {} }, sourceMappings: { none: {} }, targetMappings: { none: {} }, NOT: expect.any(Object) }) });
  });
  it('serves SQL-filtered mapped/unmapped/ambiguous fixtures and parameterizes source search', async () => {
    const data = [
      { nodeId: 'mapped', canonicalCode: '1', canonicalName: 'Mapped', nodeType: 'DISCIPLINE', candidates: 1, qualifiedTargets: 1, exactTargets: 1, mappingState: 'MAPPED' },
      { nodeId: 'unmapped', canonicalCode: '2', canonicalName: 'Unmapped', nodeType: 'DISCIPLINE', candidates: 0, qualifiedTargets: 0, exactTargets: 0, mappingState: 'UNMAPPED' },
      { nodeId: 'ambiguous', canonicalCode: '3', canonicalName: 'Ambiguous', nodeType: 'DISCIPLINE', candidates: 2, qualifiedTargets: 2, exactTargets: 1, mappingState: 'AMBIGUOUS' },
    ];
    const db = { $queryRaw: vi.fn(async () => [{ report: { data, total: 3, counts: { MAPPED: 1, UNMAPPED: 1, AMBIGUOUS: 1 }, page: 1, pageSize: 25, asOf: revision.toISOString() } }]), academicTaxonomyNode: { update: vi.fn() } };
    const result = await new PrismaAcademicTaxonomyRepository(db as any).crosswalkReport({ sourceStandard: 'CUSTOM_NATIONAL' as any, targetStandard: 'ISCED' as any, q: "x' OR 1=1 --" });
    expect(result.counts).toEqual({ MAPPED: 1, UNMAPPED: 1, AMBIGUOUS: 1, CONFLICTING: 0, UNRESOLVED: 0 });
    const sql = db.$queryRaw.mock.calls[0][0]; expect(sql.text).not.toContain("x' OR 1=1"); expect(sql.values).toContain("%x' OR 1=1 --%"); expect(sql.text).toContain('LIMIT 25');
    expect(db.academicTaxonomyNode.update).not.toHaveBeenCalled();
  });
  it('fails closed if a read adapter supplies contradictory crosswalk counts', async () => {
    const db = { $queryRaw: async () => [{ report: { data: [{ candidates: 2, qualifiedTargets: 2, exactTargets: 2, mappingState: 'MAPPED' }], counts: {} } }] };
    await expect(new PrismaAcademicTaxonomyRepository(db as any).crosswalkReport({ sourceStandard: 'CIP' as any, targetStandard: 'ISCED' as any })).rejects.toThrow('TAXONOMY_CROSSWALK_STATE_INCONSISTENT');
  });
});
