import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import {
  PrismaAcademicTaxonomyRepository,
} from '../../src/academic-taxonomy/PrismaAcademicTaxonomyRepository';
import {
  AcademicTaxonomyNodeType,
  AcademicTaxonomyStatus,
  AcademicStandardType,
  AcademicTaxonomyDeterministicKey,
} from '@manaratak/domain';

describe('PrismaAcademicTaxonomyRepository - Node Operations', () => {
  let mockPrisma: any;
  let repository: PrismaAcademicTaxonomyRepository;

  beforeEach(() => {
    mockPrisma = {
      academicTaxonomyNode: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
      academicTaxonomyAlias: {
        findMany: vi.fn(),
      },
    };
    repository = new PrismaAcademicTaxonomyRepository(mockPrisma as unknown as PrismaClient);
  });

  describe('listNodes', () => {
    it('should build filter criteria for nodeType, status, standardType, and q search', async () => {
      const mockRecord = {
        id: 'node_1',
        deterministicKey: 'ISCED:ACADEMIC_FIELD:01',
        nodeType: 'ACADEMIC_FIELD',
        canonicalCode: '01',
        canonicalName: 'Education',
        description: 'Field of Education',
        status: 'ACTIVE',
        standardType: 'ISCED',
        standardCode: '01',
        localizedNames: { ar: 'التربية' },
        metadata: { info: 'test' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.academicTaxonomyNode.findMany.mockResolvedValue([mockRecord]);

      const filters = {
        nodeType: AcademicTaxonomyNodeType.ACADEMIC_FIELD,
        status: AcademicTaxonomyStatus.ACTIVE,
        standardType: AcademicStandardType.ISCED,
        q: 'Edu',
      };

      const results = await repository.listNodes(filters);

      expect(mockPrisma.academicTaxonomyNode.findMany).toHaveBeenCalledWith({
        where: {
          nodeType: 'ACADEMIC_FIELD',
          status: 'ACTIVE',
          standardType: 'ISCED',
          OR: [
            { canonicalName: { contains: 'Edu', mode: 'insensitive' } },
            { canonicalCode: { contains: 'Edu', mode: 'insensitive' } },
            { standardCode: { contains: 'Edu', mode: 'insensitive' } },
            { aliases: { some: { normalizedAlias: 'edu' } } },
            { sourceMappings: { some: { targetStandard: 'EDU' } } },
            { targetMappings: { some: { sourceStandard: 'EDU' } } },
          ],
        },
        orderBy: { canonicalCode: 'asc' },
      });

      expect(results).toHaveLength(1);
      expect(results[0].nodeId).toBe('node_1');
      expect(results[0].nodeType).toBe(AcademicTaxonomyNodeType.ACADEMIC_FIELD);
      expect(results[0].status).toBe(AcademicTaxonomyStatus.ACTIVE);
      expect(results[0].standardType).toBe(AcademicStandardType.ISCED);
      expect(results[0].localizedNames).toEqual({ ar: 'التربية' });
    });
  });

  describe('getNode', () => {
    it('should fetch node by id using findUnique and map id -> nodeId', async () => {
      const mockRecord = {
        id: 'node_abc',
        nodeType: 'DISCIPLINE',
        canonicalCode: '011',
        canonicalName: 'Education Science',
        status: 'DRAFT',
        standardType: 'CUSTOM_NATIONAL',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.academicTaxonomyNode.findUnique.mockResolvedValue(mockRecord);

      const node = await repository.getNode('node_abc');

      expect(mockPrisma.academicTaxonomyNode.findUnique).toHaveBeenCalledWith({
        where: { id: 'node_abc' },
      });

      expect(node).not.toBeNull();
      expect(node?.nodeId).toBe('node_abc');
      expect((node as any).id).toBeUndefined(); // Relation array or raw 'id' not exposed in DTO
    });

    it('should return null when node is not found', async () => {
      mockPrisma.academicTaxonomyNode.findUnique.mockResolvedValue(null);

      const node = await repository.getNode('non_existent');
      expect(node).toBeNull();
    });
  });

  describe('getNodeByCanonicalKey', () => {
    it('should compute deterministicKey and findUnique', async () => {
      const mockRecord = {
        id: 'node_key_1',
        nodeType: 'DISCIPLINE',
        canonicalCode: '0611',
        canonicalName: 'Computer Science',
        status: 'ACTIVE',
        standardType: 'ISCED',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.academicTaxonomyNode.findUnique.mockResolvedValue(mockRecord);

      const expectedKey = AcademicTaxonomyDeterministicKey.create({
        nodeType: AcademicTaxonomyNodeType.DISCIPLINE,
        canonicalCode: '0611',
        standardType: AcademicStandardType.ISCED,
      });

      const node = await repository.getNodeByCanonicalKey({
        nodeType: AcademicTaxonomyNodeType.DISCIPLINE,
        canonicalCode: '0611',
        standardType: AcademicStandardType.ISCED,
      });

      expect(mockPrisma.academicTaxonomyNode.findUnique).toHaveBeenCalledWith({
        where: { deterministicKey: expectedKey },
      });

      expect(node?.nodeId).toBe('node_key_1');
    });

    it('should default standardType to CUSTOM_NATIONAL if missing in getNodeByCanonicalKey', async () => {
      mockPrisma.academicTaxonomyNode.findUnique.mockResolvedValue(null);

      const expectedKey = AcademicTaxonomyDeterministicKey.create({
        nodeType: AcademicTaxonomyNodeType.PROGRAM_AREA,
        canonicalCode: 'PA100',
        standardType: AcademicStandardType.CUSTOM_NATIONAL,
      });

      await repository.getNodeByCanonicalKey({
        nodeType: AcademicTaxonomyNodeType.PROGRAM_AREA,
        canonicalCode: 'PA100',
      });

      expect(mockPrisma.academicTaxonomyNode.findUnique).toHaveBeenCalledWith({
        where: { deterministicKey: expectedKey },
      });
    });
  });

  describe('upsertNode', () => {
    it('should compute deterministicKey, default status and standardType, and call Prisma upsert', async () => {
      const upsertInput = {
        nodeType: AcademicTaxonomyNodeType.PROGRAM_AREA,
        canonicalCode: 'pa-101',
        canonicalName: 'Software Development',
      };

      const expectedKey = AcademicTaxonomyDeterministicKey.create({
        nodeType: AcademicTaxonomyNodeType.PROGRAM_AREA,
        canonicalCode: 'pa-101',
        standardType: AcademicStandardType.CUSTOM_NATIONAL,
      });

      const mockReturnedRecord = {
        id: 'node_upserted_1',
        deterministicKey: expectedKey,
        nodeType: 'PROGRAM_AREA',
        canonicalCode: 'pa-101',
        canonicalName: 'Software Development',
        status: 'DRAFT',
        standardType: 'CUSTOM_NATIONAL',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.academicTaxonomyNode.upsert.mockResolvedValue(mockReturnedRecord);

      const result = await repository.upsertNode(upsertInput);

      expect(mockPrisma.academicTaxonomyNode.upsert).toHaveBeenCalledWith({
        where: { deterministicKey: expectedKey },
        update: {
          canonicalName: 'Software Development',
          description: null,
          status: 'DRAFT',
          standardType: 'CUSTOM_NATIONAL',
          standardCode: null,
          localizedNames: undefined,
          metadata: undefined,
        },
        create: {
          deterministicKey: expectedKey,
          nodeType: 'PROGRAM_AREA',
          canonicalCode: 'pa-101',
          canonicalName: 'Software Development',
          description: null,
          status: 'DRAFT',
          standardType: 'CUSTOM_NATIONAL',
          standardCode: null,
          localizedNames: undefined,
          metadata: undefined,
        },
      });

      expect(result.nodeId).toBe('node_upserted_1');
      expect(result.status).toBe(AcademicTaxonomyStatus.DRAFT);
      expect(result.standardType).toBe(AcademicStandardType.CUSTOM_NATIONAL);
    });
  });


});
