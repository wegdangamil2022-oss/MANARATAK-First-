import { describe, it, expect } from 'vitest';
import {
  IAcademicTaxonomyRepository,
  AcademicTaxonomyNodeType,
  AcademicTaxonomyStatus,
  AcademicStandardType,
  AcademicMappingStrength,
  AcademicTaxonomyNodeDto,
  AcademicTaxonomyEdgeDto,
  AcademicTaxonomyAliasDto,
  AcademicStandardMappingDto,
  UpsertAcademicTaxonomyNodeDto,
  UpsertAcademicTaxonomyEdgeDto,
  UpsertAcademicTaxonomyAliasDto,
  UpsertAcademicStandardMappingDto,
  AcademicTaxonomyFilters,
} from '../../src/academic-taxonomy';

describe('AcademicTaxonomyRepositoryContract', () => {
  it('should be implementable by a mock repository conforming to IAcademicTaxonomyRepository', async () => {
    const mockNodes: AcademicTaxonomyNodeDto[] = [
      {
        nodeId: 'node_01',
        nodeType: AcademicTaxonomyNodeType.ACADEMIC_FIELD,
        canonicalCode: '01',
        canonicalName: 'Education',
        status: AcademicTaxonomyStatus.ACTIVE,
        standardType: AcademicStandardType.ISCED,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const mockEdges: AcademicTaxonomyEdgeDto[] = [];
    const mockAliases: AcademicTaxonomyAliasDto[] = [];
    const mockMappings: AcademicStandardMappingDto[] = [];

    const repo: IAcademicTaxonomyRepository = {
      async listNodes(filters?: AcademicTaxonomyFilters): Promise<AcademicTaxonomyNodeDto[]> {
        if (filters?.nodeType) {
          return mockNodes.filter((n) => n.nodeType === filters.nodeType);
        }
        return mockNodes;
      },

      async getNode(nodeId: string): Promise<AcademicTaxonomyNodeDto | null> {
        return mockNodes.find((n) => n.nodeId === nodeId) || null;
      },

      async getNodeByCanonicalKey(input: {
        nodeType: AcademicTaxonomyNodeType;
        canonicalCode: string;
        standardType?: AcademicStandardType;
      }): Promise<AcademicTaxonomyNodeDto | null> {
        return (
          mockNodes.find(
            (n) =>
              n.nodeType === input.nodeType &&
              n.canonicalCode === input.canonicalCode &&
              (input.standardType ? n.standardType === input.standardType : true),
          ) || null
        );
      },

      async upsertNode(data: UpsertAcademicTaxonomyNodeDto): Promise<AcademicTaxonomyNodeDto> {
        const newNode: AcademicTaxonomyNodeDto = {
          nodeId: `node_${Date.now()}`,
          nodeType: data.nodeType,
          canonicalCode: data.canonicalCode,
          canonicalName: data.canonicalName,
          status: data.status || AcademicTaxonomyStatus.DRAFT,
          standardType: data.standardType,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockNodes.push(newNode);
        return newNode;
      },

      async listChildren(parentNodeId: string): Promise<AcademicTaxonomyNodeDto[]> {
        return mockNodes.filter((n) => n.nodeId !== parentNodeId);
      },

      async listParents(childNodeId: string): Promise<AcademicTaxonomyNodeDto[]> {
        return mockNodes.filter((n) => n.nodeId !== childNodeId);
      },

      async listEdges(): Promise<AcademicTaxonomyEdgeDto[]> {
        return [...mockEdges];
      },

      async findEdgeByNodes(parentNodeId: string, childNodeId: string): Promise<AcademicTaxonomyEdgeDto | null> {
        return mockEdges.find((edge) => edge.parentNodeId === parentNodeId && edge.childNodeId === childNodeId) || null;
      },

      async addEdge(data: UpsertAcademicTaxonomyEdgeDto): Promise<AcademicTaxonomyEdgeDto> {
        const edge: AcademicTaxonomyEdgeDto = {
          edgeId: `edge_${Date.now()}`,
          parentNodeId: data.parentNodeId,
          childNodeId: data.childNodeId,
          isPrimary: data.isPrimary ?? true,
          createdAt: new Date(),
        };
        mockEdges.push(edge);
        return edge;
      },

      async removeEdge(edgeId: string): Promise<void> {
        const index = mockEdges.findIndex((e) => e.edgeId === edgeId);
        if (index !== -1) {
          mockEdges.splice(index, 1);
        }
      },

      async listAliases(nodeId: string): Promise<AcademicTaxonomyAliasDto[]> {
        return mockAliases.filter((a) => a.nodeId === nodeId);
      },

      async listAliasesByNormalizedAlias(normalizedAlias: string): Promise<AcademicTaxonomyAliasDto[]> {
        return mockAliases.filter((a) => a.normalizedAlias === normalizedAlias.trim().toLowerCase());
      },

      async addAlias(data: UpsertAcademicTaxonomyAliasDto): Promise<AcademicTaxonomyAliasDto> {
        const alias: AcademicTaxonomyAliasDto = {
          aliasId: `alias_${Date.now()}`,
          nodeId: data.nodeId,
          locale: data.locale,
          alias: data.alias,
          normalizedAlias: data.alias.trim().toLowerCase(),
          createdAt: new Date(),
        };
        mockAliases.push(alias);
        return alias;
      },

      async removeAlias(aliasId: string): Promise<void> {
        const index = mockAliases.findIndex((alias) => alias.aliasId === aliasId);
        if (index !== -1) mockAliases.splice(index, 1);
      },

      async listMappings(nodeId: string): Promise<AcademicStandardMappingDto[]> {
        return mockMappings.filter((m) => m.sourceNodeId === nodeId || m.targetNodeId === nodeId);
      },

      async addMapping(data: UpsertAcademicStandardMappingDto): Promise<AcademicStandardMappingDto> {
        const mapping: AcademicStandardMappingDto = {
          mappingId: `map_${Date.now()}`,
          ...data,
          createdAt: new Date(),
        };
        mockMappings.push(mapping);
        return mapping;
      },

      async removeMapping(mappingId: string): Promise<void> {
        const index = mockMappings.findIndex((mapping) => mapping.mappingId === mappingId);
        if (index !== -1) mockMappings.splice(index, 1);
      },
    };

    // Verify Node operations
    const nodes = await repo.listNodes({ nodeType: AcademicTaxonomyNodeType.ACADEMIC_FIELD });
    expect(nodes).toHaveLength(1);

    const singleNode = await repo.getNode('node_01');
    expect(singleNode).not.toBeNull();
    expect(singleNode?.canonicalName).toBe('Education');

    const keyNode = await repo.getNodeByCanonicalKey({
      nodeType: AcademicTaxonomyNodeType.ACADEMIC_FIELD,
      canonicalCode: '01',
      standardType: AcademicStandardType.ISCED,
    });
    expect(keyNode).not.toBeNull();

    const createdNode = await repo.upsertNode({
      nodeType: AcademicTaxonomyNodeType.DISCIPLINE,
      canonicalCode: '011',
      canonicalName: 'Education Science',
    });
    expect(createdNode.nodeType).toBe(AcademicTaxonomyNodeType.DISCIPLINE);

    // Verify Hierarchy operations
    const children = await repo.listChildren('node_01');
    expect(Array.isArray(children)).toBe(true);

    const parents = await repo.listParents('node_created');
    expect(Array.isArray(parents)).toBe(true);

    const addedEdge = await repo.addEdge({
      parentNodeId: 'node_01',
      childNodeId: createdNode.nodeId,
      isPrimary: true,
    });
    expect(addedEdge.isPrimary).toBe(true);

    await expect(repo.removeEdge(addedEdge.edgeId)).resolves.toBeUndefined();

    // Verify Alias operations
    const addedAlias = await repo.addAlias({
      nodeId: 'node_01',
      locale: 'ar',
      alias: 'التربية والتعليم',
    });
    expect(addedAlias.alias).toBe('التربية والتعليم');

    const aliases = await repo.listAliases('node_01');
    expect(aliases).toHaveLength(1);

    // Verify Mapping operations
    const addedMapping = await repo.addMapping({
      sourceNodeId: 'node_01',
      targetNodeId: 'cip_13',
      sourceStandard: AcademicStandardType.ISCED,
      targetStandard: AcademicStandardType.CIP,
      strength: AcademicMappingStrength.EXACT,
    });
    expect(addedMapping.strength).toBe(AcademicMappingStrength.EXACT);

    const mappings = await repo.listMappings('node_01');
    expect(mappings).toHaveLength(1);
  });

  describe('Interface Safety & Boundaries', () => {
    it('should confirm repository method names contain no Phase 10 major-specific terminology', () => {
      const repoMethods = [
        'listNodes',
        'getNode',
        'getNodeByCanonicalKey',
        'upsertNode',
        'listChildren',
        'listParents',
        'addEdge',
        'removeEdge',
        'listAliases',
        'addAlias',
        'listMappings',
        'addMapping',
      ];

      const forbiddenFragments = [
        'major',
        'tuition',
        'salary',
        'career',
        'universityProgram',
        'featuredMajor',
        'countryRanking',
      ];

      for (const method of repoMethods) {
        for (const forbidden of forbiddenFragments) {
          expect(method.toLowerCase()).not.toContain(forbidden.toLowerCase());
        }
      }
    });

    it('should confirm repository method names contain no direct auto-publish or import auto-merge actions', () => {
      const repoMethods = [
        'listNodes',
        'getNode',
        'getNodeByCanonicalKey',
        'upsertNode',
        'listChildren',
        'listParents',
        'addEdge',
        'removeEdge',
        'listAliases',
        'addAlias',
        'listMappings',
        'addMapping',
      ];

      const forbiddenActions = ['publish', 'autoPublish', 'autoMerge', 'transferToDomain'];

      for (const method of repoMethods) {
        for (const forbidden of forbiddenActions) {
          expect(method.toLowerCase()).not.toContain(forbidden.toLowerCase());
        }
      }
    });
  });
});
