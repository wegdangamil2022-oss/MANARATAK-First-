import { describe, it, expect } from 'vitest';
import {
  AcademicTaxonomyNodeType,
  AcademicTaxonomyStatus,
  AcademicStandardType,
  AcademicMappingStrength,
  AcademicTaxonomyValidationSeverity,
  AcademicTaxonomyNodeDto,
  UpsertAcademicTaxonomyNodeDto,
  AcademicTaxonomyEdgeDto,
  UpsertAcademicTaxonomyEdgeDto,
  AcademicTaxonomyAliasDto,
  UpsertAcademicTaxonomyAliasDto,
  AcademicStandardMappingDto,
  UpsertAcademicStandardMappingDto,
  AcademicTaxonomyFilters,
  AcademicTaxonomyCompletenessReport,
  AcademicTaxonomyDeterministicKey,
} from '../../src/academic-taxonomy';

describe('AcademicTaxonomyCoreContracts', () => {
  describe('Enums Stability', () => {
    it('should have stable AcademicTaxonomyNodeType enum values', () => {
      expect(AcademicTaxonomyNodeType.ACADEMIC_FIELD).toBe('ACADEMIC_FIELD');
      expect(AcademicTaxonomyNodeType.DISCIPLINE).toBe('DISCIPLINE');
      expect(AcademicTaxonomyNodeType.PROGRAM_AREA).toBe('PROGRAM_AREA');
      expect(AcademicTaxonomyNodeType.SPECIALIZATION_CATEGORY).toBe('SPECIALIZATION_CATEGORY');
      expect(AcademicTaxonomyNodeType.STANDARD_CLASSIFICATION).toBe('STANDARD_CLASSIFICATION');
    });

    it('should have stable AcademicTaxonomyStatus enum values', () => {
      expect(AcademicTaxonomyStatus.DRAFT).toBe('DRAFT');
      expect(AcademicTaxonomyStatus.READY_TO_REVIEW).toBe('READY_TO_REVIEW');
      expect(AcademicTaxonomyStatus.ACTIVE).toBe('ACTIVE');
      expect(AcademicTaxonomyStatus.ARCHIVED).toBe('ARCHIVED');
    });

    it('should have stable AcademicStandardType enum values', () => {
      expect(AcademicStandardType.ISCED).toBe('ISCED');
      expect(AcademicStandardType.CIP).toBe('CIP');
      expect(AcademicStandardType.CUSTOM_NATIONAL).toBe('CUSTOM_NATIONAL');
    });

    it('should have stable AcademicMappingStrength enum values', () => {
      expect(AcademicMappingStrength.EXACT).toBe('EXACT');
      expect(AcademicMappingStrength.BROAD).toBe('BROAD');
      expect(AcademicMappingStrength.NARROW).toBe('NARROW');
      expect(AcademicMappingStrength.RELATED).toBe('RELATED');
      expect(AcademicMappingStrength.UNKNOWN).toBe('UNKNOWN');
    });

    it('should have stable AcademicTaxonomyValidationSeverity enum values', () => {
      expect(AcademicTaxonomyValidationSeverity.INFO).toBe('INFO');
      expect(AcademicTaxonomyValidationSeverity.WARNING).toBe('WARNING');
      expect(AcademicTaxonomyValidationSeverity.ERROR).toBe('ERROR');
    });
  });

  describe('DTO Shape Assignments', () => {
    it('should allow valid AcademicTaxonomyNodeDto and UpsertAcademicTaxonomyNodeDto assignments', () => {
      const upsertDto: UpsertAcademicTaxonomyNodeDto = {
        nodeType: AcademicTaxonomyNodeType.ACADEMIC_FIELD,
        canonicalCode: '01',
        canonicalName: 'Education',
        description: 'Teacher training and education science',
        status: AcademicTaxonomyStatus.DRAFT,
        standardType: AcademicStandardType.ISCED,
        standardCode: '01',
        localizedNames: { ar: 'التربية', en: 'Education' },
        metadata: { source: 'ISCED-F 2013' },
      };

      const nodeDto: AcademicTaxonomyNodeDto = {
        nodeId: 'tax_node_01',
        ...upsertDto,
        status: upsertDto.status || AcademicTaxonomyStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(nodeDto.nodeId).toBe('tax_node_01');
      expect(nodeDto.nodeType).toBe(AcademicTaxonomyNodeType.ACADEMIC_FIELD);
      expect(nodeDto.canonicalCode).toBe('01');
    });

    it('should allow valid edge DTO assignments', () => {
      const upsertEdge: UpsertAcademicTaxonomyEdgeDto = {
        parentNodeId: 'node_broad_01',
        childNodeId: 'node_narrow_011',
        isPrimary: true,
      };

      const edgeDto: AcademicTaxonomyEdgeDto = {
        edgeId: 'edge_123',
        parentNodeId: upsertEdge.parentNodeId,
        childNodeId: upsertEdge.childNodeId,
        isPrimary: upsertEdge.isPrimary ?? true,
        createdAt: new Date(),
      };

      expect(edgeDto.edgeId).toBe('edge_123');
      expect(edgeDto.isPrimary).toBe(true);
    });

    it('should allow valid alias DTO assignments', () => {
      const upsertAlias: UpsertAcademicTaxonomyAliasDto = {
        nodeId: 'tax_node_01',
        locale: 'en',
        alias: 'Teacher Training',
      };

      const aliasDto: AcademicTaxonomyAliasDto = {
        aliasId: 'alias_456',
        nodeId: upsertAlias.nodeId,
        locale: upsertAlias.locale,
        alias: upsertAlias.alias,
        normalizedAlias: 'teacher training',
        createdAt: new Date(),
      };

      expect(aliasDto.aliasId).toBe('alias_456');
      expect(aliasDto.normalizedAlias).toBe('teacher training');
    });

    it('should allow valid mapping DTO assignments', () => {
      const upsertMapping: UpsertAcademicStandardMappingDto = {
        sourceNodeId: 'isced_01',
        targetNodeId: 'cip_13',
        sourceStandard: AcademicStandardType.ISCED,
        targetStandard: AcademicStandardType.CIP,
        strength: AcademicMappingStrength.EXACT,
        confidence: 0.95,
        notes: 'Verified cross-walk',
      };

      const mappingDto: AcademicStandardMappingDto = {
        mappingId: 'map_789',
        ...upsertMapping,
        createdAt: new Date(),
      };

      expect(mappingDto.mappingId).toBe('map_789');
      expect(mappingDto.strength).toBe(AcademicMappingStrength.EXACT);
    });

    it('should support AcademicTaxonomyFilters query parameter shapes', () => {
      const filters: AcademicTaxonomyFilters = {
        q: 'Computer Science',
        nodeType: AcademicTaxonomyNodeType.DISCIPLINE,
        status: AcademicTaxonomyStatus.ACTIVE,
        standardType: AcademicStandardType.CIP,
        parentNodeId: 'node_broad_06',
      };
      expect(filters.nodeType).toBe(AcademicTaxonomyNodeType.DISCIPLINE);
    });

    it('should support AcademicTaxonomyCompletenessReport missingFields and canBeReviewed', () => {
      const report: AcademicTaxonomyCompletenessReport = {
        deterministicKey: 'ISCED:DISCIPLINE:0611',
        requiredFields: ['canonicalCode', 'canonicalName', 'nodeType', 'standardType'],
        presentFields: ['canonicalCode', 'canonicalName', 'nodeType'],
        missingFields: ['standardType'],
        issues: [
          {
            fieldName: 'standardType',
            code: 'MISSING_STANDARD_TYPE',
            message: 'Standard classification type is required for review',
            severity: AcademicTaxonomyValidationSeverity.WARNING,
          },
        ],
        isComplete: false,
        canBeReviewed: true,
      };

      expect(report.missingFields).toContain('standardType');
      expect(report.canBeReviewed).toBe(true);
      expect(report.isComplete).toBe(false);
    });
  });

  describe('AcademicTaxonomyDeterministicKey', () => {
    it('should create a stable key with standardType', () => {
      const key = AcademicTaxonomyDeterministicKey.create({
        nodeType: AcademicTaxonomyNodeType.ACADEMIC_FIELD,
        canonicalCode: '01',
        standardType: AcademicStandardType.ISCED,
      });

      expect(key).toBe('ISCED:ACADEMIC_FIELD:01');
    });

    it('should create a stable key without standardType', () => {
      const key = AcademicTaxonomyDeterministicKey.create({
        nodeType: AcademicTaxonomyNodeType.DISCIPLINE,
        canonicalCode: 'CS101',
      });

      expect(key).toBe('DISCIPLINE:CS101');
    });

    it('should trim and uppercase canonicalCode', () => {
      const key = AcademicTaxonomyDeterministicKey.create({
        nodeType: AcademicTaxonomyNodeType.PROGRAM_AREA,
        canonicalCode: '  cs-202a  ',
        standardType: AcademicStandardType.CIP,
      });

      expect(key).toBe('CIP:PROGRAM_AREA:CS-202A');
    });

    it('should reject empty canonicalCode by throwing an Error', () => {
      expect(() => {
        AcademicTaxonomyDeterministicKey.create({
          nodeType: AcademicTaxonomyNodeType.SPECIALIZATION_CATEGORY,
          canonicalCode: '   ',
        });
      }).toThrow('canonicalCode cannot be empty');
    });

    it('should reject missing nodeType by throwing an Error', () => {
      expect(() => {
        AcademicTaxonomyDeterministicKey.create({
          nodeType: undefined as unknown as AcademicTaxonomyNodeType,
          canonicalCode: '123',
        });
      }).toThrow('nodeType is required');
    });
  });

  describe('Domain Isolation (No Phase 10 Major-specific fields)', () => {
    it('should confirm AcademicTaxonomyNodeDto does not contain Phase 10 major fields', () => {
      const node: Record<string, unknown> = {
        nodeId: 'node_01',
        nodeType: AcademicTaxonomyNodeType.DISCIPLINE,
        canonicalCode: '061',
        canonicalName: 'ICTs',
        status: AcademicTaxonomyStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(node.tuition).toBeUndefined();
      expect(node.careerOutcomes).toBeUndefined();
      expect(node.salary).toBeUndefined();
      expect(node.universityId).toBeUndefined();
      expect(node.countryRanking).toBeUndefined();
      expect(node.featuredMajor).toBeUndefined();
    });
  });
});
