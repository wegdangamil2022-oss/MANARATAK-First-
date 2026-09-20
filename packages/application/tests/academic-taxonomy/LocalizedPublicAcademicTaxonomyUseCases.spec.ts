import { describe, expect, it, vi } from 'vitest';
import { LocalizedPublicAcademicTaxonomyUseCases } from '../../src/academic-taxonomy/use-cases/LocalizedPublicAcademicTaxonomyUseCases';

describe('LocalizedPublicAcademicTaxonomyUseCases', () => {
  it('projects display labels while preserving canonical identity fields', async () => {
    const repository = {
      listNodes: vi.fn().mockResolvedValue([{
        nodeId: 'node-1', nodeType: 'DISCIPLINE', canonicalCode: '0611', canonicalName: 'Computer Science',
        localizedNames: { ar: 'علوم الحاسوب' }, status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date(),
      }]),
    } as any;
    const useCases = new LocalizedPublicAcademicTaxonomyUseCases(repository);
    const [node] = await useCases.listNodes({}, 'ar');
    expect(node.displayName).toBe('علوم الحاسوب');
    expect(node.canonicalName).toBe('Computer Science');
    expect(node.canonicalCode).toBe('0611');
    expect(node.localizedNames).toBeUndefined();
    expect(repository.listNodes).toHaveBeenCalledWith({ status: 'ACTIVE' });
  });

  it('hides draft nodes from direct public reads', async () => {
    const repository = { getNode: vi.fn().mockResolvedValue({ nodeId: 'draft-1', nodeType: 'DISCIPLINE', canonicalCode: 'x', canonicalName: 'Draft', status: 'DRAFT', createdAt: new Date(), updatedAt: new Date() }) } as any;
    const useCases = new LocalizedPublicAcademicTaxonomyUseCases(repository);
    expect(await useCases.getNode('draft-1', 'en')).toBeNull();
  });
});
