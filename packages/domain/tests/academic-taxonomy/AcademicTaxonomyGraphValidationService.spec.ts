import { describe, it, expect } from 'vitest';
import { AcademicTaxonomyValidationService } from '../../src/academic-taxonomy/validation';
import {
  AcademicTaxonomyNodeType,
  AcademicTaxonomyStatus,
  AcademicStandardType,
  AcademicTaxonomyValidationSeverity,
  AcademicMappingStrength,
} from '../../src/academic-taxonomy/enums';
import {
  AcademicTaxonomyNodeDto,
  AcademicTaxonomyAliasDto,
  AcademicStandardMappingDto,
} from '../../src/academic-taxonomy/contracts';

describe('AcademicTaxonomyValidationService - Graph & Relations Validation', () => {
  const service = new AcademicTaxonomyValidationService();

  const nodeA: AcademicTaxonomyNodeDto = {
    nodeId: 'node_A',
    nodeType: AcademicTaxonomyNodeType.DISCIPLINE,
    canonicalCode: 'A01',
    canonicalName: 'Node A',
    status: AcademicTaxonomyStatus.ACTIVE,
    standardType: AcademicStandardType.CUSTOM_NATIONAL,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const nodeB: AcademicTaxonomyNodeDto = {
    nodeId: 'node_B',
    nodeType: AcademicTaxonomyNodeType.PROGRAM_AREA,
    canonicalCode: 'B01',
    canonicalName: 'Node B',
    status: AcademicTaxonomyStatus.ACTIVE,
    standardType: AcademicStandardType.CUSTOM_NATIONAL,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const nodeC: AcademicTaxonomyNodeDto = {
    nodeId: 'node_C',
    nodeType: AcademicTaxonomyNodeType.SPECIALIZATION_CATEGORY,
    canonicalCode: 'C01',
    canonicalName: 'Node C',
    status: AcademicTaxonomyStatus.ACTIVE,
    standardType: AcademicStandardType.CUSTOM_NATIONAL,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const existingNodes = [nodeA, nodeB, nodeC];

  describe('validateEdge', () => {
    it('returns no ERROR for a valid edge', () => {
      const issues = service.validateEdge({
        edge: { parentNodeId: 'node_A', childNodeId: 'node_B' },
        existingNodes,
        existingEdges: [],
      });

      const errors = issues.filter((i) => i.severity === AcademicTaxonomyValidationSeverity.ERROR);
      expect(errors).toHaveLength(0);
    });

    it('produces ERROR when parentNodeId or childNodeId is missing', () => {
      const issues1 = service.validateEdge({
        edge: { parentNodeId: '', childNodeId: 'node_B' },
        existingNodes,
        existingEdges: [],
      });

      expect(issues1).toContainEqual(
        expect.objectContaining({
          fieldName: 'parentNodeId',
          code: 'MISSING_PARENT_NODE_ID',
          severity: AcademicTaxonomyValidationSeverity.ERROR,
        })
      );

      const issues2 = service.validateEdge({
        edge: { parentNodeId: 'node_A', childNodeId: '   ' },
        existingNodes,
        existingEdges: [],
      });

      expect(issues2).toContainEqual(
        expect.objectContaining({
          fieldName: 'childNodeId',
          code: 'MISSING_CHILD_NODE_ID',
          severity: AcademicTaxonomyValidationSeverity.ERROR,
        })
      );
    });

    it('produces ERROR for self-parenting edge', () => {
      const issues = service.validateEdge({
        edge: { parentNodeId: 'node_A', childNodeId: 'node_A' },
        existingNodes,
        existingEdges: [],
      });

      expect(issues).toContainEqual(
        expect.objectContaining({
          fieldName: 'childNodeId',
          code: 'SELF_PARENTING_EDGE',
          severity: AcademicTaxonomyValidationSeverity.ERROR,
        })
      );
    });

    it('produces ERROR when parent node is missing from existingNodes', () => {
      const issues = service.validateEdge({
        edge: { parentNodeId: 'node_NONEXISTENT', childNodeId: 'node_B' },
        existingNodes,
        existingEdges: [],
      });

      expect(issues).toContainEqual(
        expect.objectContaining({
          fieldName: 'parentNodeId',
          code: 'PARENT_NODE_NOT_FOUND',
          severity: AcademicTaxonomyValidationSeverity.ERROR,
        })
      );
    });

    it('produces ERROR when child node is missing from existingNodes', () => {
      const issues = service.validateEdge({
        edge: { parentNodeId: 'node_A', childNodeId: 'node_NONEXISTENT' },
        existingNodes,
        existingEdges: [],
      });

      expect(issues).toContainEqual(
        expect.objectContaining({
          fieldName: 'childNodeId',
          code: 'CHILD_NODE_NOT_FOUND',
          severity: AcademicTaxonomyValidationSeverity.ERROR,
        })
      );
    });

    it('produces ERROR when duplicate edge already exists', () => {
      const existingEdges = [{ parentNodeId: 'node_A', childNodeId: 'node_B' }];

      const issues = service.validateEdge({
        edge: { parentNodeId: 'node_A', childNodeId: 'node_B' },
        existingNodes,
        existingEdges,
      });

      expect(issues).toContainEqual(
        expect.objectContaining({
          fieldName: 'edge',
          code: 'DUPLICATE_EDGE',
          severity: AcademicTaxonomyValidationSeverity.ERROR,
        })
      );
    });

    it('catches cycle A -> B -> C and rejects C -> A', () => {
      const existingEdges = [
        { parentNodeId: 'node_A', childNodeId: 'node_B' },
        { parentNodeId: 'node_B', childNodeId: 'node_C' },
      ];

      const issues = service.validateEdge({
        edge: { parentNodeId: 'node_C', childNodeId: 'node_A' },
        existingNodes,
        existingEdges,
      });

      expect(issues).toContainEqual(
        expect.objectContaining({
          fieldName: 'edge',
          code: 'CYCLE_DETECTED',
          severity: AcademicTaxonomyValidationSeverity.ERROR,
        })
      );
    });

    it('emits WARNING only when child already has another primary parent and new edge isPrimary is true', () => {
      const existingEdges = [{ parentNodeId: 'node_A', childNodeId: 'node_C', isPrimary: true }];

      const issues = service.validateEdge({
        edge: { parentNodeId: 'node_B', childNodeId: 'node_C', isPrimary: true },
        existingNodes,
        existingEdges,
      });

      const errors = issues.filter((i) => i.severity === AcademicTaxonomyValidationSeverity.ERROR);
      expect(errors).toHaveLength(0);

      expect(issues).toContainEqual(
        expect.objectContaining({
          fieldName: 'isPrimary',
          code: 'MULTIPLE_PRIMARY_PARENTS',
          severity: AcademicTaxonomyValidationSeverity.WARNING,
        })
      );
    });
  });

  describe('validateAlias', () => {
    it('returns no ERROR for a valid alias', () => {
      const issues = service.validateAlias({
        alias: { nodeId: 'node_A', alias: 'CompSci', locale: 'en' },
        existingAliases: [],
      });

      const errors = issues.filter((i) => i.severity === AcademicTaxonomyValidationSeverity.ERROR);
      expect(errors).toHaveLength(0);
    });

    it('produces ERROR when alias string is empty', () => {
      const issues = service.validateAlias({
        alias: { nodeId: 'node_A', alias: '   ', locale: 'en' },
        existingAliases: [],
      });

      expect(issues).toContainEqual(
        expect.objectContaining({
          fieldName: 'alias',
          code: 'MISSING_ALIAS',
          severity: AcademicTaxonomyValidationSeverity.ERROR,
        })
      );
    });

    it('produces ERROR for duplicate alias on same node and same locale', () => {
      const existingAlias: AcademicTaxonomyAliasDto = {
        aliasId: 'alias_1',
        nodeId: 'node_A',
        alias: 'CompSci',
        normalizedAlias: 'compsci',
        locale: 'en',
        createdAt: new Date(),
      };

      const issues = service.validateAlias({
        alias: { nodeId: 'node_A', alias: '  COMPsci  ', locale: 'en' },
        existingAliases: [existingAlias],
      });

      expect(issues).toContainEqual(
        expect.objectContaining({
          fieldName: 'alias',
          code: 'DUPLICATE_ALIAS',
          severity: AcademicTaxonomyValidationSeverity.ERROR,
        })
      );
    });

    it('produces ERROR when same normalized alias is used on another node', () => {
      const existingAlias: AcademicTaxonomyAliasDto = {
        aliasId: 'alias_1',
        nodeId: 'node_A',
        alias: 'CompSci',
        normalizedAlias: 'compsci',
        locale: 'en',
        createdAt: new Date(),
      };

      const issues = service.validateAlias({
        alias: { nodeId: 'node_B', alias: 'compsci', locale: 'en' },
        existingAliases: [existingAlias],
      });

      expect(issues).toContainEqual(
        expect.objectContaining({
          fieldName: 'alias',
          code: 'ALIAS_CONFLICT_OTHER_NODE',
          severity: AcademicTaxonomyValidationSeverity.ERROR,
        })
      );
    });

    it('emits INFO only when locale is omitted', () => {
      const issues = service.validateAlias({
        alias: { nodeId: 'node_A', alias: 'GlobalAlias' },
        existingAliases: [],
      });

      const errors = issues.filter((i) => i.severity === AcademicTaxonomyValidationSeverity.ERROR);
      expect(errors).toHaveLength(0);

      expect(issues).toContainEqual(
        expect.objectContaining({
          fieldName: 'locale',
          code: 'GLOBAL_ALIAS_OMITTED_LOCALE',
          severity: AcademicTaxonomyValidationSeverity.INFO,
        })
      );
    });
  });

  const mappingSourceNode: AcademicTaxonomyNodeDto = {
    ...nodeA,
    standardType: AcademicStandardType.ISCED,
  };
  const mappingTargetNode: AcademicTaxonomyNodeDto = {
    ...nodeB,
    standardType: AcademicStandardType.CIP,
  };
  const validateMapping = (
    input: Parameters<AcademicTaxonomyValidationService['validateMapping']>[0]
  ) => service.validateMapping({
    ...input,
    sourceNode: input.sourceNode ?? (
      input.mapping.sourceNodeId === 'node_A' ? mappingSourceNode : undefined
    ),
    targetNode: input.targetNode ?? (
      input.mapping.targetNodeId === 'node_B'
        ? mappingTargetNode
        : input.mapping.targetNodeId === 'node_A'
          ? mappingSourceNode
          : undefined
    ),
  });

  describe('validateMapping', () => {
    it('returns no ERROR for a valid mapping', () => {
      const issues = validateMapping({
        mapping: {
          sourceNodeId: 'node_A',
          targetNodeId: 'node_B',
          sourceStandard: AcademicStandardType.ISCED,
          targetStandard: AcademicStandardType.CIP,
          strength: AcademicMappingStrength.EXACT,
          confidence: 0.95,
        },
        existingMappings: [],
      });

      const errors = issues.filter((i) => i.severity === AcademicTaxonomyValidationSeverity.ERROR);
      expect(errors).toHaveLength(0);
    });

    it('produces ERROR when sourceNodeId or targetNodeId is missing', () => {
      const issues1 = validateMapping({
        mapping: {
          sourceNodeId: '',
          targetNodeId: 'node_B',
          sourceStandard: AcademicStandardType.ISCED,
          targetStandard: AcademicStandardType.CIP,
          strength: AcademicMappingStrength.EXACT,
        },
        existingMappings: [],
      });

      expect(issues1).toContainEqual(
        expect.objectContaining({
          fieldName: 'sourceNodeId',
          code: 'MISSING_SOURCE_NODE_ID',
          severity: AcademicTaxonomyValidationSeverity.ERROR,
        })
      );

      const issues2 = validateMapping({
        mapping: {
          sourceNodeId: 'node_A',
          targetNodeId: '',
          sourceStandard: AcademicStandardType.ISCED,
          targetStandard: AcademicStandardType.CIP,
          strength: AcademicMappingStrength.EXACT,
        },
        existingMappings: [],
      });

      expect(issues2).toContainEqual(
        expect.objectContaining({
          fieldName: 'targetNodeId',
          code: 'MISSING_TARGET_NODE_ID',
          severity: AcademicTaxonomyValidationSeverity.ERROR,
        })
      );
    });

    it('produces ERROR when sourceNodeId equals targetNodeId', () => {
      const issues = validateMapping({
        mapping: {
          sourceNodeId: 'node_A',
          targetNodeId: 'node_A',
          sourceStandard: AcademicStandardType.ISCED,
          targetStandard: AcademicStandardType.CIP,
          strength: AcademicMappingStrength.EXACT,
        },
        existingMappings: [],
      });

      expect(issues).toContainEqual(
        expect.objectContaining({
          fieldName: 'targetNodeId',
          code: 'SELF_MAPPING',
          severity: AcademicTaxonomyValidationSeverity.ERROR,
        })
      );
    });

    it('produces ERROR for invalid standards or strength', () => {
      const issues = validateMapping({
        mapping: {
          sourceNodeId: 'node_A',
          targetNodeId: 'node_B',
          sourceStandard: 'INVALID' as any,
          targetStandard: 'INVALID' as any,
          strength: 'INVALID' as any,
        },
        existingMappings: [],
      });

      expect(issues).toContainEqual(
        expect.objectContaining({
          fieldName: 'sourceStandard',
          code: 'INVALID_SOURCE_STANDARD',
          severity: AcademicTaxonomyValidationSeverity.ERROR,
        })
      );
      expect(issues).toContainEqual(
        expect.objectContaining({
          fieldName: 'targetStandard',
          code: 'INVALID_TARGET_STANDARD',
          severity: AcademicTaxonomyValidationSeverity.ERROR,
        })
      );
      expect(issues).toContainEqual(
        expect.objectContaining({
          fieldName: 'strength',
          code: 'INVALID_MAPPING_STRENGTH',
          severity: AcademicTaxonomyValidationSeverity.ERROR,
        })
      );
    });

    it('produces ERROR for duplicate mapping', () => {
      const existingMapping: AcademicStandardMappingDto = {
        mappingId: 'map_1',
        sourceNodeId: 'node_A',
        targetNodeId: 'node_B',
        sourceStandard: AcademicStandardType.ISCED,
        targetStandard: AcademicStandardType.CIP,
        strength: AcademicMappingStrength.EXACT,
        createdAt: new Date(),
      };

      const issues = validateMapping({
        mapping: {
          sourceNodeId: 'node_A',
          targetNodeId: 'node_B',
          sourceStandard: AcademicStandardType.ISCED,
          targetStandard: AcademicStandardType.CIP,
          strength: AcademicMappingStrength.EXACT,
        },
        existingMappings: [existingMapping],
      });

      expect(issues).toContainEqual(
        expect.objectContaining({
          fieldName: 'mapping',
          code: 'DUPLICATE_MAPPING',
          severity: AcademicTaxonomyValidationSeverity.ERROR,
        })
      );
    });

    it('emits WARNING when strength is UNKNOWN', () => {
      const issues = validateMapping({
        mapping: {
          sourceNodeId: 'node_A',
          targetNodeId: 'node_B',
          sourceStandard: AcademicStandardType.ISCED,
          targetStandard: AcademicStandardType.CIP,
          strength: AcademicMappingStrength.UNKNOWN,
        },
        existingMappings: [],
      });

      const errors = issues.filter((i) => i.severity === AcademicTaxonomyValidationSeverity.ERROR);
      expect(errors).toHaveLength(0);

      expect(issues).toContainEqual(
        expect.objectContaining({
          fieldName: 'strength',
          code: 'UNKNOWN_MAPPING_STRENGTH',
          severity: AcademicTaxonomyValidationSeverity.WARNING,
        })
      );
    });

    it('rejects same-standard crosswalks even when endpoint nodes are active', () => {
      const issues = validateMapping({
        mapping: {
          sourceNodeId: 'node_A',
          targetNodeId: 'node_B',
          sourceStandard: AcademicStandardType.ISCED,
          targetStandard: AcademicStandardType.ISCED,
          strength: AcademicMappingStrength.RELATED,
        },
        existingMappings: [],
        sourceNode: mappingSourceNode,
        targetNode: { ...mappingTargetNode, standardType: AcademicStandardType.ISCED },
      });

      expect(issues).toContainEqual(expect.objectContaining({
        code: 'SAME_STANDARD_MAPPING_FORBIDDEN',
        severity: AcademicTaxonomyValidationSeverity.ERROR,
      }));
    });

    it('rejects inactive endpoints and declared standards that disagree with canonical nodes', () => {
      const issues = validateMapping({
        mapping: {
          sourceNodeId: 'node_A',
          targetNodeId: 'node_B',
          sourceStandard: AcademicStandardType.CIP,
          targetStandard: AcademicStandardType.ISCED,
          strength: AcademicMappingStrength.RELATED,
        },
        existingMappings: [],
        sourceNode: { ...mappingSourceNode, status: AcademicTaxonomyStatus.ARCHIVED },
        targetNode: mappingTargetNode,
      });

      expect(issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
        'SOURCE_NODE_NOT_ACTIVE',
        'SOURCE_STANDARD_MISMATCH',
        'TARGET_STANDARD_MISMATCH',
      ]));
    });

    it('produces ERROR when confidence is outside 0..1 range', () => {
      const issues = validateMapping({
        mapping: {
          sourceNodeId: 'node_A',
          targetNodeId: 'node_B',
          sourceStandard: AcademicStandardType.ISCED,
          targetStandard: AcademicStandardType.CIP,
          strength: AcademicMappingStrength.EXACT,
          confidence: 1.5,
        },
        existingMappings: [],
      });

      expect(issues).toContainEqual(
        expect.objectContaining({
          fieldName: 'confidence',
          code: 'INVALID_CONFIDENCE_RANGE',
          severity: AcademicTaxonomyValidationSeverity.ERROR,
        })
      );
    });

    it('emits WARNING when EXACT mapping lacks confidence score', () => {
      const issues = validateMapping({
        mapping: {
          sourceNodeId: 'node_A',
          targetNodeId: 'node_B',
          sourceStandard: AcademicStandardType.ISCED,
          targetStandard: AcademicStandardType.CIP,
          strength: AcademicMappingStrength.EXACT,
        },
        existingMappings: [],
      });

      const errors = issues.filter((i) => i.severity === AcademicTaxonomyValidationSeverity.ERROR);
      expect(errors).toHaveLength(0);

      expect(issues).toContainEqual(
        expect.objectContaining({
          fieldName: 'confidence',
          code: 'MISSING_EXACT_MAPPING_CONFIDENCE',
          severity: AcademicTaxonomyValidationSeverity.WARNING,
        })
      );
    });
  });
});
