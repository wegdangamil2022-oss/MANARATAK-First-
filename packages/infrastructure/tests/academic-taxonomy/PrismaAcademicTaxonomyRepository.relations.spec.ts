import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaAcademicTaxonomyRepository } from '../../src/academic-taxonomy/PrismaAcademicTaxonomyRepository';
import {
  AcademicTaxonomyNodeType,
  AcademicTaxonomyStatus,
  AcademicStandardType,
  AcademicMappingStrength,
} from '@manaratak/domain';

describe('PrismaAcademicTaxonomyRepository - Relations Operations (P8E-2)', () => {
  let mockPrisma: any;
  let repository: PrismaAcademicTaxonomyRepository;

  beforeEach(() => {
    mockPrisma = {
      academicTaxonomyEdge: {
        findMany: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
      academicTaxonomyAlias: {
        findMany: vi.fn(),
        create: vi.fn(),
      },
      academicStandardMapping: {
        findMany: vi.fn(),
        create: vi.fn(),
      },
    };
    repository = new PrismaAcademicTaxonomyRepository(mockPrisma as unknown as PrismaClient);
  });

  describe('Hierarchy Edge Operations', () => {
    const mockChildNodeRecord = {
      id: 'child_1',
      nodeType: 'DISCIPLINE',
      canonicalCode: '011',
      canonicalName: 'Education Science',
      status: 'ACTIVE',
      standardType: 'ISCED',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockParentNodeRecord = {
      id: 'parent_1',
      nodeType: 'ACADEMIC_FIELD',
      canonicalCode: '01',
      canonicalName: 'Education',
      status: 'ACTIVE',
      standardType: 'ISCED',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('listChildren queries academicTaxonomyEdge.findMany with parentNodeId and includes childNode', async () => {
      mockPrisma.academicTaxonomyEdge.findMany.mockResolvedValue([
        {
          id: 'edge_1',
          parentNodeId: 'parent_1',
          childNodeId: 'child_1',
          isPrimary: true,
          createdAt: new Date(),
          childNode: mockChildNodeRecord,
        },
      ]);

      const children = await repository.listChildren('parent_1');

      expect(mockPrisma.academicTaxonomyEdge.findMany).toHaveBeenCalledWith({
        where: { parentNodeId: 'parent_1' },
        include: { childNode: true },
      });

      expect(children).toHaveLength(1);
      expect(children[0].nodeId).toBe('child_1');
      expect(children[0].canonicalName).toBe('Education Science');
      expect(children[0].nodeType).toBe(AcademicTaxonomyNodeType.DISCIPLINE);
    });

    it('listParents queries academicTaxonomyEdge.findMany with childNodeId and includes parentNode', async () => {
      mockPrisma.academicTaxonomyEdge.findMany.mockResolvedValue([
        {
          id: 'edge_1',
          parentNodeId: 'parent_1',
          childNodeId: 'child_1',
          isPrimary: true,
          createdAt: new Date(),
          parentNode: mockParentNodeRecord,
        },
      ]);

      const parents = await repository.listParents('child_1');

      expect(mockPrisma.academicTaxonomyEdge.findMany).toHaveBeenCalledWith({
        where: { childNodeId: 'child_1' },
        include: { parentNode: true },
      });

      expect(parents).toHaveLength(1);
      expect(parents[0].nodeId).toBe('parent_1');
      expect(parents[0].canonicalName).toBe('Education');
      expect(parents[0].nodeType).toBe(AcademicTaxonomyNodeType.ACADEMIC_FIELD);
    });

    it('addEdge creates edge and defaults isPrimary to false', async () => {
      const mockEdgeRecord = {
        id: 'edge_new_1',
        parentNodeId: 'parent_1',
        childNodeId: 'child_1',
        isPrimary: false,
        createdAt: new Date(),
      };

      mockPrisma.academicTaxonomyEdge.create.mockResolvedValue(mockEdgeRecord);

      const result = await repository.addEdge({
        parentNodeId: 'parent_1',
        childNodeId: 'child_1',
      });

      expect(mockPrisma.academicTaxonomyEdge.create).toHaveBeenCalledWith({
        data: {
          parentNodeId: 'parent_1',
          childNodeId: 'child_1',
          isPrimary: false,
        },
      });

      expect(result).toEqual({
        edgeId: 'edge_new_1',
        parentNodeId: 'parent_1',
        childNodeId: 'child_1',
        isPrimary: false,
        createdAt: mockEdgeRecord.createdAt,
      });
    });

    it('addEdge respects isPrimary true when provided', async () => {
      const mockEdgeRecord = {
        id: 'edge_new_2',
        parentNodeId: 'parent_1',
        childNodeId: 'child_1',
        isPrimary: true,
        createdAt: new Date(),
      };

      mockPrisma.academicTaxonomyEdge.create.mockResolvedValue(mockEdgeRecord);

      const result = await repository.addEdge({
        parentNodeId: 'parent_1',
        childNodeId: 'child_1',
        isPrimary: true,
      });

      expect(mockPrisma.academicTaxonomyEdge.create).toHaveBeenCalledWith({
        data: {
          parentNodeId: 'parent_1',
          childNodeId: 'child_1',
          isPrimary: true,
        },
      });

      expect(result.isPrimary).toBe(true);
    });

    it('removeEdge deletes by edge id and returns void', async () => {
      mockPrisma.academicTaxonomyEdge.delete.mockResolvedValue({});

      await repository.removeEdge('edge_to_delete');

      expect(mockPrisma.academicTaxonomyEdge.delete).toHaveBeenCalledWith({
        where: { id: 'edge_to_delete' },
      });
    });
  });

  describe('Alias Operations', () => {
    it('listAliases queries academicTaxonomyAlias.findMany by nodeId', async () => {
      const mockAliasRecord = {
        id: 'alias_1',
        nodeId: 'node_1',
        locale: 'ar',
        alias: 'علوم الحاسوب',
        normalizedAlias: 'علوم الحاسوب',
        createdAt: new Date(),
      };

      mockPrisma.academicTaxonomyAlias.findMany.mockResolvedValue([mockAliasRecord]);

      const aliases = await repository.listAliases('node_1');

      expect(mockPrisma.academicTaxonomyAlias.findMany).toHaveBeenCalledWith({
        where: { nodeId: 'node_1' },
        orderBy: { createdAt: 'asc' },
      });

      expect(aliases).toHaveLength(1);
      expect(aliases[0]).toEqual({
        aliasId: 'alias_1',
        nodeId: 'node_1',
        locale: 'ar',
        alias: 'علوم الحاسوب',
        normalizedAlias: 'علوم الحاسوب',
        createdAt: mockAliasRecord.createdAt,
      });
    });

    it('addAlias trims/lowercases/collapses whitespace into normalizedAlias and preserves locale', async () => {
      const mockCreatedAlias = {
        id: 'alias_2',
        nodeId: 'node_1',
        locale: 'en',
        alias: '  Computer   SCIENCE  ',
        normalizedAlias: 'computer science',
        createdAt: new Date(),
      };

      mockPrisma.academicTaxonomyAlias.create.mockResolvedValue(mockCreatedAlias);

      const result = await repository.addAlias({
        nodeId: 'node_1',
        locale: 'en',
        alias: '  Computer   SCIENCE  ',
      });

      expect(mockPrisma.academicTaxonomyAlias.create).toHaveBeenCalledWith({
        data: {
          nodeId: 'node_1',
          locale: 'en',
          alias: '  Computer   SCIENCE  ',
          normalizedAlias: 'computer science',
        },
      });

      expect(result.aliasId).toBe('alias_2');
      expect(result.normalizedAlias).toBe('computer science');
      expect(result.locale).toBe('en');
    });

    it('listAliasesByNormalizedAlias queries aliases globally instead of only the current node', async () => {
      const mockAliasRecord = {
        id: 'alias_global_1',
        nodeId: 'other_node',
        locale: 'en',
        alias: 'Computer Science',
        normalizedAlias: 'computer science',
        createdAt: new Date(),
      };
      mockPrisma.academicTaxonomyAlias.findMany.mockResolvedValue([mockAliasRecord]);

      const aliases = await repository.listAliasesByNormalizedAlias(' Computer   Science ');

      expect(mockPrisma.academicTaxonomyAlias.findMany).toHaveBeenCalledWith({
        where: { normalizedAlias: 'computer science' },
        orderBy: { createdAt: 'asc' },
      });
      expect(aliases).toEqual([
        expect.objectContaining({
          aliasId: 'alias_global_1',
          nodeId: 'other_node',
          normalizedAlias: 'computer science',
        }),
      ]);
    });

    it('addAlias works when locale is omitted', async () => {
      const mockCreatedAlias = {
        id: 'alias_3',
        nodeId: 'node_1',
        locale: null,
        alias: 'CompSci',
        normalizedAlias: 'compsci',
        createdAt: new Date(),
      };

      mockPrisma.academicTaxonomyAlias.create.mockResolvedValue(mockCreatedAlias);

      const result = await repository.addAlias({
        nodeId: 'node_1',
        alias: 'CompSci',
      });

      expect(mockPrisma.academicTaxonomyAlias.create).toHaveBeenCalledWith({
        data: {
          nodeId: 'node_1',
          locale: null,
          alias: 'CompSci',
          normalizedAlias: 'compsci',
        },
      });

      expect(result.locale).toBeUndefined();
    });
  });

  describe('Mapping Operations', () => {
    it('listMappings queries academicStandardMapping.findMany using OR sourceNodeId/targetNodeId', async () => {
      const mockMappingRecord = {
        id: 'map_1',
        sourceNodeId: 'node_src',
        targetNodeId: 'node_tgt',
        sourceStandard: 'ISCED',
        targetStandard: 'CIP',
        strength: 'EXACT',
        confidence: 0.95,
        notes: 'Direct equivalence',
        createdAt: new Date(),
      };

      mockPrisma.academicStandardMapping.findMany.mockResolvedValue([mockMappingRecord]);

      const mappings = await repository.listMappings('node_src');

      expect(mockPrisma.academicStandardMapping.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ sourceNodeId: 'node_src' }, { targetNodeId: 'node_src' }],
        },
        orderBy: { createdAt: 'asc' },
      });

      expect(mappings).toHaveLength(1);
      expect(mappings[0]).toEqual({
        mappingId: 'map_1',
        sourceNodeId: 'node_src',
        targetNodeId: 'node_tgt',
        sourceStandard: 'ISCED',
        targetStandard: 'CIP',
        strength: 'EXACT',
        confidence: 0.95,
        notes: 'Direct equivalence',
        createdAt: mockMappingRecord.createdAt,
      });
    });

    it('addMapping creates mapping with source/target standards, strength, confidence, and notes', async () => {
      const mockCreatedMapping = {
        id: 'map_2',
        sourceNodeId: 'n1',
        targetNodeId: 'n2',
        sourceStandard: 'ISCED',
        targetStandard: 'CIP',
        strength: 'BROAD',
        confidence: 0.8,
        notes: 'Partial overlap',
        createdAt: new Date(),
      };

      mockPrisma.academicStandardMapping.create.mockResolvedValue(mockCreatedMapping);

      const result = await repository.addMapping({
        sourceNodeId: 'n1',
        targetNodeId: 'n2',
        sourceStandard: AcademicStandardType.ISCED,
        targetStandard: AcademicStandardType.CIP,
        strength: AcademicMappingStrength.BROAD,
        confidence: 0.8,
        notes: 'Partial overlap',
      });

      expect(mockPrisma.academicStandardMapping.create).toHaveBeenCalledWith({
        data: {
          sourceNodeId: 'n1',
          targetNodeId: 'n2',
          sourceStandard: AcademicStandardType.ISCED,
          targetStandard: AcademicStandardType.CIP,
          strength: AcademicMappingStrength.BROAD,
          confidence: 0.8,
          notes: 'Partial overlap',
        },
      });

      expect(result.mappingId).toBe('map_2');
      expect(result.confidence).toBe(0.8);
      expect(result.notes).toBe('Partial overlap');
    });
  });
});
