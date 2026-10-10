import { describe, expect, it, vi } from 'vitest';
import { TaxonomyDiagnosticsService } from '../../src/academic-taxonomy/services/TaxonomyDiagnosticsService';
import { AdminAcademicTaxonomyUseCases } from '../../src/academic-taxonomy/use-cases/AdminAcademicTaxonomyUseCases';
import { classifyTaxonomyCrosswalk } from '@manaratak/domain';
const revision = '2026-10-10T01:00:00.000Z';
const node = (id: string, type = 'DISCIPLINE', extra: any = {}): any => ({ nodeId: id, nodeType: type, canonicalCode: id, canonicalName: id, standardType: 'ISCED', status: 'ACTIVE', createdAt: new Date(revision), updatedAt: new Date(revision), ...extra });
const edge = (from: string, to: string, primary = false): any => ({ edgeId: `${from}-${to}`, parentNodeId: from, childNodeId: to, isPrimary: primary, createdAt: new Date(revision) });
const snapshot = (extra: any = {}): any => ({ nodes: [], contextNodes: [], edges: [], mappings: [], aliases: [], asOf: revision, ...extra });
describe('structural diagnostics, crosswalk and review queue closure', () => {
  it('distinguishes approved roots from orphans and reports actual cycles and primary conflicts', () => {
    const input = snapshot({ nodes: [node('root', 'ACADEMIC_FIELD'), node('approved', 'DISCIPLINE', { metadata: { approvedRoot: true } }), node('child'), node('orphan'), node('cycle-a'), node('cycle-b')],
      edges: [edge('root','child',true), edge('approved','child',true), edge('cycle-a','cycle-b'), edge('cycle-b','cycle-a')] });
    const result = new TaxonomyDiagnosticsService().report(input);
    expect(result.data.filter(issue => issue.code === 'ORPHAN').map(issue => issue.nodeIds[0])).toEqual(['orphan']);
    expect(result.counts.MULTIPLE_PRIMARY_PARENTS).toBe(1); expect(result.counts.CYCLE).toBe(1);
    expect(result.data.find(issue => issue.code === 'CYCLE')?.nodeIds).toContain('cycle-b');
  });
  it('flags excessive depth and uses a version independent of the report timestamp', () => {
    const nodes = [node('root','ACADEMIC_FIELD'), ...Array.from({ length: 34 }, (_, index) => node(`n${index}`))];
    const edges = nodes.slice(1).map((item, index) => edge(nodes[index].nodeId, item.nodeId));
    const service = new TaxonomyDiagnosticsService(); const first = service.report(snapshot({ nodes, edges }));
    const second = service.report(snapshot({ nodes, edges, asOf: '2026-10-10T03:00:00.000Z' }));
    expect(first.counts.EXCESSIVE_DEPTH).toBe(2); expect(first.version).toBe(second.version);
  });
  it('detects historic multilingual alias collisions without rewriting data', () => {
    const aliases = [
      { aliasId: 'a', nodeId: 'one', locale: 'fr', alias: 'Cafe\u0301', normalizedAlias: 'cafe\u0301', createdAt: new Date(revision) },
      { aliasId: 'b', nodeId: 'two', locale: 'fr', alias: 'CAFÉ', normalizedAlias: 'café', createdAt: new Date(revision) },
      ...['علوم الحاسوب', '计算机科学', 'Компьютер'].map((alias, index) => ({ aliasId: `u${index}`, nodeId: 'one', alias, normalizedAlias: alias.toLowerCase(), createdAt: new Date(revision) })),
    ];
    const before = JSON.stringify(aliases); const result = new TaxonomyDiagnosticsService().report(snapshot({ nodes: [node('one'), node('two')], aliases }), { code: 'ALIAS_CONFLICT' });
    expect(result.total).toBe(1); expect(result.counts.ALIAS_NORMALIZATION_DRIFT).toBe(1); expect(JSON.stringify(aliases)).toBe(before);
  });
  it('keeps historic inactive mappings distinct from structurally invalid mappings', () => {
    const mapping = { mappingId: 'map', sourceNodeId: 'root', targetNodeId: 'archived', sourceStandard: 'ISCED', targetStandard: 'CIP', strength: 'EXACT', confidence: 1, createdAt: new Date(revision) };
    const result = new TaxonomyDiagnosticsService().report(snapshot({ nodes: [node('root','ACADEMIC_FIELD'), node('archived','ACADEMIC_FIELD',{ standardType: 'CIP', status: 'ARCHIVED' })], mappings: [mapping] }));
    expect(result.counts.HISTORICAL_MAPPING).toBe(1); expect(result.counts.INVALID_MAPPING).toBeUndefined();
  });
  it('bounds diagnostic pages and rejects unapproved rule names', () => {
    const service = new TaxonomyDiagnosticsService(); const input = snapshot({ nodes: Array.from({ length: 40 }, (_, index) => node(`orphan${index}`)) });
    const result = service.report(input, { code: 'ORPHAN', page: 2 }); expect(result.total).toBe(40); expect(result.data).toHaveLength(15);
    expect(() => service.report(input, { code: 'DELETE_ORPHANS' })).toThrow('TAXONOMY_DIAGNOSTICS_QUERY_INVALID');
  });
  it('classifies mapped, unmapped, ambiguous, unresolved and conflicting worklist states without publishing', () => {
    expect(classifyTaxonomyCrosswalk({ candidates: 1, qualifiedTargets: 1, exactTargets: 1 })).toBe('MAPPED');
    expect(classifyTaxonomyCrosswalk({ candidates: 0, qualifiedTargets: 0, exactTargets: 0 })).toBe('UNMAPPED');
    expect(classifyTaxonomyCrosswalk({ candidates: 2, qualifiedTargets: 2, exactTargets: 1 })).toBe('AMBIGUOUS');
    expect(classifyTaxonomyCrosswalk({ candidates: 2, qualifiedTargets: 2, exactTargets: 2 })).toBe('CONFLICTING');
    expect(classifyTaxonomyCrosswalk({ candidates: 1, qualifiedTargets: 0, exactTargets: 0 })).toBe('UNRESOLVED');
    expect(() => classifyTaxonomyCrosswalk({ candidates: 0, qualifiedTargets: 1, exactTargets: 0 })).toThrow('TAXONOMY_CROSSWALK_COUNTS_INVALID');
  });
  it('returns a real primary breadcrumb and alternative parent rather than inferring from array order', async () => {
    const nodes = new Map([['root',node('root','ACADEMIC_FIELD')], ['child',node('child')], ['alternative',node('alternative','ACADEMIC_FIELD')]]);
    const repo = { getNode: async (id: string) => nodes.get(id), relatedNodesPage: async (id: string) => id === 'child' ? { data: [nodes.get('root'), nodes.get('alternative')], total: 2, links: [{ nodeId: 'root', isPrimary: true }, { nodeId: 'alternative', isPrimary: false }] } : { data: [], total: 0, links: [] } };
    const result = await new AdminAcademicTaxonomyUseCases(repo as any).primaryPath('child');
    expect(result.path.map(item => item.nodeId)).toEqual(['root','child']); expect(result.alternativeParents[0].nodeId).toBe('alternative');
  });
  it('rejects multiple primary paths and cycles instead of presenting a guessed breadcrumb', async () => {
    const repo = { getNode: async (id: string) => node(id), relatedNodesPage: vi.fn(async () => ({ data: [node('a'),node('b')], total: 2, links: [{ nodeId: 'a', isPrimary: true }, { nodeId: 'b', isPrimary: true }] })) };
    await expect(new AdminAcademicTaxonomyUseCases(repo as any).primaryPath('child')).rejects.toThrow('TAXONOMY_MULTIPLE_PRIMARY_PARENTS');
    repo.relatedNodesPage.mockResolvedValue({ data: [node('child')], total: 1, links: [{ nodeId: 'child', isPrimary: true }] });
    await expect(new AdminAcademicTaxonomyUseCases(repo as any).primaryPath('child')).rejects.toThrow('TAXONOMY_PATH_CYCLE');
  });
  it('enforces preview, version and impact on bulk review and never permits publication', async () => {
    let current = node('draft','ACADEMIC_FIELD',{ status: 'DRAFT' });
    const repo = { getNode: async () => current, updateNode: vi.fn(async (_id, data) => ({ ...current, ...data })) };
    const usage = { summarize: vi.fn(async () => ({ counts: { tests: 2 }, totalReferences: 2, observedAt: new Date().toISOString() })) };
    const owner = new AdminAcademicTaxonomyUseCases(repo as any, undefined, undefined, undefined, usage as any);
    const input: any = { nodes: [{ nodeId: 'draft', expectedUpdatedAt: revision }], nextStatus: 'READY_TO_REVIEW', reason: 'Reviewed', acknowledgeHistoricalReferences: true, dryRun: true };
    const preview = await owner.bulkReview(input); expect(preview.data[0].impact.totalReferences).toBe(2); expect(repo.updateNode).not.toHaveBeenCalled();
    await owner.bulkReview({ ...input, dryRun: false, previewHash: preview.previewHash }); expect(repo.updateNode).toHaveBeenCalledOnce();
    current = { ...current, updatedAt: new Date('2026-10-10T02:00:00.000Z') };
    await expect(owner.bulkReview({ ...input, dryRun: false, previewHash: preview.previewHash })).rejects.toThrow('TAXONOMY_BULK_PREVIEW_CONFLICT');
    await expect(owner.bulkReview({ ...input, nextStatus: 'ACTIVE' })).rejects.toThrow('TAXONOMY_BULK_REVIEW_INVALID');
  });
  it('blocks bulk decisions when impact changes after preview or when the batch exceeds 25', async () => {
    const repo = { getNode: async () => node('draft','ACADEMIC_FIELD',{ status: 'DRAFT' }), updateNode: vi.fn() };
    const usage = { summarize: vi.fn(async () => ({ counts: { tests: 0 }, totalReferences: 0, observedAt: revision })) };
    const owner = new AdminAcademicTaxonomyUseCases(repo as any, undefined, undefined, undefined, usage as any);
    const input: any = { nodes: [{ nodeId: 'draft', expectedUpdatedAt: revision }], nextStatus: 'READY_TO_REVIEW', reason: 'Reviewed', acknowledgeHistoricalReferences: true, dryRun: true };
    const preview = await owner.bulkReview(input); usage.summarize.mockResolvedValue({ counts: { tests: 1 }, totalReferences: 1, observedAt: revision });
    await expect(owner.bulkReview({ ...input, dryRun: false, previewHash: preview.previewHash })).rejects.toThrow('TAXONOMY_BULK_PREVIEW_CONFLICT');
    await expect(owner.bulkReview({ ...input, nodes: Array.from({ length: 26 }, (_, index) => ({ nodeId: `n${index}`, expectedUpdatedAt: revision })) })).rejects.toThrow('TAXONOMY_BULK_REVIEW_INVALID');
    expect(repo.updateNode).not.toHaveBeenCalled();
  });
});
