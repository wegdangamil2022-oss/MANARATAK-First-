import { describe, it, expect, vi } from 'vitest';
import { PublicAcademicTaxonomyUseCases } from '../../src/academic-taxonomy';
import {
  IAcademicTaxonomyRepository,
  AcademicTaxonomyNodeDto,
  AcademicTaxonomyNodeType,
  AcademicTaxonomyStatus,
  AcademicStandardType,
} from '@manaratak/domain';

describe('PublicAcademicTaxonomyUseCases', () => {
  const mockNode: AcademicTaxonomyNodeDto = {
    nodeId: 'node_001',
    nodeType: AcademicTaxonomyNodeType.DISCIPLINE,
    canonicalCode: '0611',
    canonicalName: 'Computer Science',
    status: AcademicTaxonomyStatus.ACTIVE,
    standardType: AcademicStandardType.CUSTOM_NATIONAL,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createMockRepository = (): IAcademicTaxonomyRepository => ({
    listNodes: vi.fn().mockResolvedValue([mockNode]),
    getNode: vi.fn().mockResolvedValue(mockNode),
    getNodeByCanonicalKey: vi.fn().mockResolvedValue(mockNode),
    upsertNode: vi.fn(),
    listChildren: vi.fn().mockResolvedValue([mockNode]),
    listParents: vi.fn().mockResolvedValue([mockNode]),
    listEdges: vi.fn().mockResolvedValue([]),
    findEdgeByNodes: vi.fn().mockResolvedValue(null),
    addEdge: vi.fn(),
    removeEdge: vi.fn(),
    listAliases: vi.fn().mockResolvedValue([]),
    listAliasesByNormalizedAlias: vi.fn().mockResolvedValue([]),
    addAlias: vi.fn(),
    removeAlias: vi.fn(),
    listMappings: vi.fn().mockResolvedValue([]),
    addMapping: vi.fn(),
    removeMapping: vi.fn(),
  });

  it('listNodes delegates to repository.listNodes with filters', async () => {
    const repository = createMockRepository();
    const useCases = new PublicAcademicTaxonomyUseCases(repository);

    const filters = { nodeType: AcademicTaxonomyNodeType.DISCIPLINE };
    const result = await useCases.listNodes(filters);

    expect(repository.listNodes).toHaveBeenCalledWith({ ...filters, status: AcademicTaxonomyStatus.ACTIVE });
    expect(result).toEqual([mockNode]);
  });

  it('getNode delegates to repository.getNode', async () => {
    const repository = createMockRepository();
    const useCases = new PublicAcademicTaxonomyUseCases(repository);

    const result = await useCases.getNode('node_001');

    expect(repository.getNode).toHaveBeenCalledWith('node_001');
    expect(result).toEqual(mockNode);
  });

  it('getNodeByCanonicalKey delegates to repository.getNodeByCanonicalKey', async () => {
    const repository = createMockRepository();
    const useCases = new PublicAcademicTaxonomyUseCases(repository);

    const input = {
      nodeType: AcademicTaxonomyNodeType.DISCIPLINE,
      canonicalCode: '0611',
      standardType: AcademicStandardType.CUSTOM_NATIONAL,
    };
    const result = await useCases.getNodeByCanonicalKey(input);

    expect(repository.getNodeByCanonicalKey).toHaveBeenCalledWith(input);
    expect(result).toEqual(mockNode);
  });

  it('searchNodes delegates to repository.listNodes with q merged into filters and trimmed', async () => {
    const repository = createMockRepository();
    const useCases = new PublicAcademicTaxonomyUseCases(repository);

    const filters = { status: AcademicTaxonomyStatus.ACTIVE };
    const result = await useCases.searchNodes('  computer science  ', filters);

    expect(repository.listNodes).toHaveBeenCalledWith({
      status: AcademicTaxonomyStatus.ACTIVE,
      q: 'computer science',
    });
    expect(result).toEqual([mockNode]);
  });

  it('searchNodes handles empty or whitespace query safely', async () => {
    const repository = createMockRepository();
    const useCases = new PublicAcademicTaxonomyUseCases(repository);

    await useCases.searchNodes('   ', { status: AcademicTaxonomyStatus.ACTIVE });

    expect(repository.listNodes).toHaveBeenCalledWith({
      status: AcademicTaxonomyStatus.ACTIVE,
    });
  });

  it('listChildren delegates to repository.listChildren', async () => {
    const repository = createMockRepository();
    const useCases = new PublicAcademicTaxonomyUseCases(repository);

    const result = await useCases.listChildren('parent_123');

    expect(repository.getNode).toHaveBeenCalledWith('parent_123');
    expect(repository.listChildren).toHaveBeenCalledWith('parent_123');
    expect(result).toEqual([mockNode]);
  });

  it('listParents delegates to repository.listParents', async () => {
    const repository = createMockRepository();
    const useCases = new PublicAcademicTaxonomyUseCases(repository);

    const result = await useCases.listParents('child_123');

    expect(repository.getNode).toHaveBeenCalledWith('child_123');
    expect(repository.listParents).toHaveBeenCalledWith('child_123');
    expect(result).toEqual([mockNode]);
  });

  it('never exposes non-active nodes through public reads', async () => {
    const repository = createMockRepository();
    (repository.getNode as any).mockResolvedValue({ ...mockNode, status: AcademicTaxonomyStatus.DRAFT });
    (repository.getNodeByCanonicalKey as any).mockResolvedValue({ ...mockNode, status: AcademicTaxonomyStatus.ARCHIVED });
    const useCases = new PublicAcademicTaxonomyUseCases(repository);
    expect(await useCases.getNode('node_001')).toBeNull();
    expect(await useCases.getNodeByCanonicalKey({ nodeType: AcademicTaxonomyNodeType.DISCIPLINE, canonicalCode: '0611' })).toBeNull();
  });

  it('read-only use case does not call any repository mutation methods', async () => {
    const repository = createMockRepository();
    const useCases = new PublicAcademicTaxonomyUseCases(repository);

    await useCases.listNodes();
    await useCases.getNode('node_001');
    await useCases.getNodeByCanonicalKey({
      nodeType: AcademicTaxonomyNodeType.DISCIPLINE,
      canonicalCode: '0611',
    });
    await useCases.searchNodes('computer');
    await useCases.listChildren('parent_1');
    await useCases.listParents('child_1');

    expect(repository.upsertNode).not.toHaveBeenCalled();
    expect(repository.addEdge).not.toHaveBeenCalled();
    expect(repository.removeEdge).not.toHaveBeenCalled();
    expect(repository.addAlias).not.toHaveBeenCalled();
    expect(repository.addMapping).not.toHaveBeenCalled();
  });
});
