import { describe, expect, it, vi } from 'vitest';
import { AdminAcademicTaxonomyUseCases } from '../../src/academic-taxonomy/use-cases/AdminAcademicTaxonomyUseCases';
import { AcademicStandardType, AcademicTaxonomyNodeType, AcademicTaxonomyStatus } from '@manaratak/domain';
const revision = '2026-10-09T00:00:00.000Z';
const node = { nodeId: 'stable', canonicalCode: '06', nodeType: AcademicTaxonomyNodeType.ACADEMIC_FIELD,
  standardType: AcademicStandardType.ISCED, standardCode: '06', canonicalName: 'ICT', status: AcademicTaxonomyStatus.ACTIVE,
  createdAt: new Date(revision), updatedAt: new Date(revision) };
function fixture() {
  const repository = { getNode: vi.fn(async () => node), upsertNode: vi.fn(),
    updateNode: vi.fn(async () => ({ ...node, canonicalName: 'Information technology' })) };
  const cases = new AdminAcademicTaxonomyUseCases(repository as any);
  return { repository, cases };
}
describe('governed stable taxonomy identity edit', () => {
  it('updates the explicit identity and never invokes creation/upsert', async () => {
    const { cases, repository } = fixture();
    const result = await cases.editNode('stable', { ...node, canonicalName: 'Information technology' }, revision);
    expect(result.node.nodeId).toBe('stable');
    expect(repository.updateNode).toHaveBeenCalledWith('stable', expect.objectContaining({ canonicalCode: '06' }), revision);
    expect(repository.upsertNode).not.toHaveBeenCalled();
  });
  it.each([{ standardType: AcademicStandardType.CIP }, { canonicalCode: '07' }, { nodeType: AcademicTaxonomyNodeType.DISCIPLINE }])('refuses identity replacement %j', async patch => {
    const { cases, repository } = fixture();
    await expect(cases.editNode('stable', { ...node, ...patch }, revision)).rejects.toThrow('TAXONOMY_IDENTITY_IMMUTABLE');
    expect(repository.updateNode).not.toHaveBeenCalled();
  });
  it('rejects a stale editor before writing', async () => {
    const { cases, repository } = fixture();
    await expect(cases.editNode('stable', node, '2026-10-08T00:00:00.000Z')).rejects.toThrow('VERSION_CONFLICT');
    expect(repository.updateNode).not.toHaveBeenCalled();
  });
});
