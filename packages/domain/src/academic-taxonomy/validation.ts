import {
  AcademicTaxonomyNodeDto,
  UpsertAcademicTaxonomyNodeDto,
  AcademicTaxonomyCompletenessReport,
  AcademicTaxonomyValidationIssue,
  AcademicTaxonomyAliasDto,
  UpsertAcademicTaxonomyAliasDto,
  UpsertAcademicTaxonomyEdgeDto,
  AcademicStandardMappingDto,
  UpsertAcademicStandardMappingDto,
} from './contracts';
import {
  AcademicTaxonomyNodeType,
  AcademicTaxonomyStatus,
  AcademicStandardType,
  AcademicTaxonomyValidationSeverity,
  AcademicMappingStrength,
} from './enums';
import { AcademicTaxonomyDeterministicKey } from './key';
import { HierarchyValidationService, ICycleDetectionValidator } from '../hierarchy';

export interface IAcademicTaxonomyValidationService {
  validateNode(
    input: AcademicTaxonomyNodeDto | UpsertAcademicTaxonomyNodeDto
  ): AcademicTaxonomyCompletenessReport;

  validateEdge(input: {
    edge: UpsertAcademicTaxonomyEdgeDto;
    existingNodes: AcademicTaxonomyNodeDto[];
    existingEdges: Array<{ parentNodeId: string; childNodeId: string; isPrimary?: boolean }>;
  }): AcademicTaxonomyValidationIssue[];

  validateAlias(input: {
    alias: UpsertAcademicTaxonomyAliasDto;
    existingAliases: AcademicTaxonomyAliasDto[];
  }): AcademicTaxonomyValidationIssue[];

  validateMapping(input: {
    mapping: UpsertAcademicStandardMappingDto;
    existingMappings: AcademicStandardMappingDto[];
    sourceNode?: AcademicTaxonomyNodeDto | null;
    targetNode?: AcademicTaxonomyNodeDto | null;
  }): AcademicTaxonomyValidationIssue[];
}

const REQUIRED_NODE_FIELDS = [
  'nodeType',
  'canonicalCode',
  'canonicalName',
  'status',
  'standardType',
];

const FORBIDDEN_PHASE_10_METADATA_KEYS = [
  'tuition',
  'salary',
  'careerOutcomes',
  'universityId',
  'countryRanking',
  'featuredMajor',
];

const FORBIDDEN_PHASE_06_METADATA_KEYS = [
  'evidenceSnippet',
  'confidenceScore',
  'validationResults',
  'sourceText',
  'rawPayload',
];

export class AcademicTaxonomyValidationService implements IAcademicTaxonomyValidationService {
  constructor(
    private readonly cycleDetectionValidator: ICycleDetectionValidator = new HierarchyValidationService(),
  ) {}

  validateNode(
    input: AcademicTaxonomyNodeDto | UpsertAcademicTaxonomyNodeDto
  ): AcademicTaxonomyCompletenessReport {
    const issues: AcademicTaxonomyValidationIssue[] = [];
    const presentFields: string[] = [];
    const missingFields: string[] = [];

    // Defaults for Upsert DTO
    const status = input.status ?? AcademicTaxonomyStatus.DRAFT;
    const standardType = input.standardType ?? AcademicStandardType.CUSTOM_NATIONAL;

    // 1. Validate nodeType
    if (
      input.nodeType &&
      Object.values(AcademicTaxonomyNodeType).includes(input.nodeType as AcademicTaxonomyNodeType)
    ) {
      presentFields.push('nodeType');
    } else {
      missingFields.push('nodeType');
      issues.push({
        fieldName: 'nodeType',
        code: 'INVALID_NODE_TYPE',
        message: 'nodeType is required and must be a valid AcademicTaxonomyNodeType',
        severity: AcademicTaxonomyValidationSeverity.ERROR,
      });
    }

    // 2. Validate canonicalCode
    if (input.canonicalCode && typeof input.canonicalCode === 'string' && input.canonicalCode.trim() !== '') {
      presentFields.push('canonicalCode');
    } else {
      missingFields.push('canonicalCode');
      issues.push({
        fieldName: 'canonicalCode',
        code: 'MISSING_CANONICAL_CODE',
        message: 'canonicalCode is required and cannot be empty',
        severity: AcademicTaxonomyValidationSeverity.ERROR,
      });
    }

    // 3. Validate canonicalName
    if (input.canonicalName && typeof input.canonicalName === 'string' && input.canonicalName.trim() !== '') {
      presentFields.push('canonicalName');
    } else {
      missingFields.push('canonicalName');
      issues.push({
        fieldName: 'canonicalName',
        code: 'MISSING_CANONICAL_NAME',
        message: 'canonicalName is required and cannot be empty',
        severity: AcademicTaxonomyValidationSeverity.ERROR,
      });
    }

    // 4. Validate status
    if (
      status &&
      Object.values(AcademicTaxonomyStatus).includes(status as AcademicTaxonomyStatus)
    ) {
      presentFields.push('status');
    } else {
      missingFields.push('status');
      issues.push({
        fieldName: 'status',
        code: 'INVALID_STATUS',
        message: 'status must be a valid AcademicTaxonomyStatus',
        severity: AcademicTaxonomyValidationSeverity.ERROR,
      });
    }

    // 5. Validate standardType
    if (
      standardType &&
      Object.values(AcademicStandardType).includes(standardType as AcademicStandardType)
    ) {
      presentFields.push('standardType');
    } else {
      missingFields.push('standardType');
      issues.push({
        fieldName: 'standardType',
        code: 'INVALID_STANDARD_TYPE',
        message: 'standardType must be a valid AcademicStandardType',
        severity: AcademicTaxonomyValidationSeverity.ERROR,
      });
    }

    // Compute deterministicKey
    let deterministicKey = 'UNKNOWN';
    try {
      if (
        input.nodeType &&
        input.canonicalCode &&
        typeof input.canonicalCode === 'string' &&
        input.canonicalCode.trim() !== ''
      ) {
        deterministicKey = AcademicTaxonomyDeterministicKey.create({
          nodeType: input.nodeType,
          canonicalCode: input.canonicalCode,
          standardType,
        });
      }
    } catch {
      deterministicKey = 'UNKNOWN';
    }

    // Standard code recommendation for ISCED or CIP
    if (
      (standardType === AcademicStandardType.ISCED || standardType === AcademicStandardType.CIP) &&
      (!input.standardCode || input.standardCode.trim() === '')
    ) {
      issues.push({
        fieldName: 'standardCode',
        code: 'MISSING_STANDARD_CODE',
        message: `standardCode is recommended when standardType is ${standardType}`,
        severity: AcademicTaxonomyValidationSeverity.WARNING,
      });
    }

    // Localized names check
    if (input.localizedNames !== undefined && input.localizedNames !== null) {
      if (typeof input.localizedNames !== 'object' || Array.isArray(input.localizedNames)) {
        issues.push({
          fieldName: 'localizedNames',
          code: 'INVALID_LOCALIZED_NAMES',
          message: 'localizedNames must be an object',
          severity: AcademicTaxonomyValidationSeverity.ERROR,
        });
      } else {
        const hasAr = 'ar' in input.localizedNames && Boolean(input.localizedNames['ar']);
        const hasEn = 'en' in input.localizedNames && Boolean(input.localizedNames['en']);
        if (!hasAr && !hasEn) {
          issues.push({
            fieldName: 'localizedNames',
            code: 'MISSING_AR_EN_LOCALIZED_NAMES',
            message: 'localizedNames does not contain "ar" or "en" translations',
            severity: AcademicTaxonomyValidationSeverity.INFO,
          });
        }
      }
    }

    // Metadata checks
    if (input.metadata !== undefined && input.metadata !== null) {
      if (typeof input.metadata !== 'object' || Array.isArray(input.metadata)) {
        issues.push({
          fieldName: 'metadata',
          code: 'INVALID_METADATA',
          message: 'metadata must be an object',
          severity: AcademicTaxonomyValidationSeverity.ERROR,
        });
      } else {
        for (const key of Object.keys(input.metadata)) {
          if (FORBIDDEN_PHASE_10_METADATA_KEYS.includes(key)) {
            issues.push({
              fieldName: 'metadata',
              code: 'FORBIDDEN_PHASE_10_METADATA',
              message: `metadata contains forbidden Phase 10 major key: "${key}"`,
              severity: AcademicTaxonomyValidationSeverity.ERROR,
            });
          }
          if (FORBIDDEN_PHASE_06_METADATA_KEYS.includes(key)) {
            issues.push({
              fieldName: 'metadata',
              code: 'FORBIDDEN_PHASE_06_METADATA',
              message: `metadata contains forbidden Phase 06 raw evidence key: "${key}"`,
              severity: AcademicTaxonomyValidationSeverity.ERROR,
            });
          }
        }
      }
    }

    const isComplete = missingFields.length === 0;
    const hasError = issues.some((i) => i.severity === AcademicTaxonomyValidationSeverity.ERROR);
    const canBeReviewed = isComplete && !hasError;

    return {
      deterministicKey,
      requiredFields: [...REQUIRED_NODE_FIELDS],
      presentFields,
      missingFields,
      issues,
      isComplete,
      canBeReviewed,
    };
  }

  validateEdge(input: {
    edge: UpsertAcademicTaxonomyEdgeDto;
    existingNodes: AcademicTaxonomyNodeDto[];
    existingEdges: Array<{ parentNodeId: string; childNodeId: string; isPrimary?: boolean }>;
  }): AcademicTaxonomyValidationIssue[] {
    const issues: AcademicTaxonomyValidationIssue[] = [];
    const { edge, existingNodes, existingEdges } = input;

    const parentId = edge.parentNodeId?.trim();
    const childId = edge.childNodeId?.trim();

    if (!parentId) {
      issues.push({
        fieldName: 'parentNodeId',
        code: 'MISSING_PARENT_NODE_ID',
        message: 'parentNodeId is required and cannot be empty',
        severity: AcademicTaxonomyValidationSeverity.ERROR,
      });
    }

    if (!childId) {
      issues.push({
        fieldName: 'childNodeId',
        code: 'MISSING_CHILD_NODE_ID',
        message: 'childNodeId is required and cannot be empty',
        severity: AcademicTaxonomyValidationSeverity.ERROR,
      });
    }

    if (parentId && childId && parentId === childId) {
      issues.push({
        fieldName: 'childNodeId',
        code: 'SELF_PARENTING_EDGE',
        message: 'parentNodeId and childNodeId cannot be the same node',
        severity: AcademicTaxonomyValidationSeverity.ERROR,
      });
    }

    const parentNodeExists = parentId ? existingNodes.some((n) => n.nodeId === parentId) : false;
    if (parentId && !parentNodeExists) {
      issues.push({
        fieldName: 'parentNodeId',
        code: 'PARENT_NODE_NOT_FOUND',
        message: `Parent node with id "${parentId}" does not exist`,
        severity: AcademicTaxonomyValidationSeverity.ERROR,
      });
    }

    const childNodeExists = childId ? existingNodes.some((n) => n.nodeId === childId) : false;
    if (childId && !childNodeExists) {
      issues.push({
        fieldName: 'childNodeId',
        code: 'CHILD_NODE_NOT_FOUND',
        message: `Child node with id "${childId}" does not exist`,
        severity: AcademicTaxonomyValidationSeverity.ERROR,
      });
    }

    if (parentId && childId) {
      const isDuplicate = existingEdges.some(
        (e) => e.parentNodeId === parentId && e.childNodeId === childId
      );
      if (isDuplicate) {
        issues.push({
          fieldName: 'edge',
          code: 'DUPLICATE_EDGE',
          message: `An edge between parent "${parentId}" and child "${childId}" already exists`,
          severity: AcademicTaxonomyValidationSeverity.ERROR,
        });
      }
    }

    if (parentId && childId && parentId !== childId && parentNodeExists && childNodeExists) {
      if (!this.cycleDetectionValidator.validateNoCycles(parentId, childId, existingEdges)) {
        issues.push({
          fieldName: 'edge',
          code: 'CYCLE_DETECTED',
          message: `Adding edge from "${parentId}" to "${childId}" would create a cycle`,
          severity: AcademicTaxonomyValidationSeverity.ERROR,
        });
      }
    }

    if (childId && edge.isPrimary === true) {
      const hasOtherPrimary = existingEdges.some(
        (e) => e.childNodeId === childId && e.isPrimary === true && e.parentNodeId !== parentId
      );
      if (hasOtherPrimary) {
        issues.push({
          fieldName: 'isPrimary',
          code: 'MULTIPLE_PRIMARY_PARENTS',
          message: `Child node "${childId}" already has another primary parent edge`,
          severity: AcademicTaxonomyValidationSeverity.WARNING,
        });
      }
    }

    return issues;
  }

  validateAlias(input: {
    alias: UpsertAcademicTaxonomyAliasDto;
    existingAliases: AcademicTaxonomyAliasDto[];
  }): AcademicTaxonomyValidationIssue[] {
    const issues: AcademicTaxonomyValidationIssue[] = [];
    const { alias, existingAliases } = input;

    const nodeId = alias.nodeId?.trim();
    const rawAlias = alias.alias;

    if (!nodeId) {
      issues.push({
        fieldName: 'nodeId',
        code: 'MISSING_NODE_ID',
        message: 'nodeId is required and cannot be empty',
        severity: AcademicTaxonomyValidationSeverity.ERROR,
      });
    }

    if (!rawAlias || typeof rawAlias !== 'string' || rawAlias.trim() === '') {
      issues.push({
        fieldName: 'alias',
        code: 'MISSING_ALIAS',
        message: 'alias is required and cannot be empty',
        severity: AcademicTaxonomyValidationSeverity.ERROR,
      });
      return issues;
    }

    const normalizedAlias = rawAlias.trim().toLowerCase().replace(/\s+/g, ' ');

    if (!alias.locale || alias.locale.trim() === '') {
      issues.push({
        fieldName: 'locale',
        code: 'GLOBAL_ALIAS_OMITTED_LOCALE',
        message: 'locale is omitted; alias will apply globally',
        severity: AcademicTaxonomyValidationSeverity.INFO,
      });
    }

    const localeNormalized = alias.locale ? alias.locale.trim() : null;

    for (const existing of existingAliases) {
      const existingLocale = existing.locale ? existing.locale.trim() : null;

      if (existing.normalizedAlias === normalizedAlias) {
        if (nodeId && existing.nodeId !== nodeId) {
          issues.push({
            fieldName: 'alias',
            code: 'ALIAS_CONFLICT_OTHER_NODE',
            message: `Normalized alias "${normalizedAlias}" is already used by another node "${existing.nodeId}"`,
            severity: AcademicTaxonomyValidationSeverity.ERROR,
          });
        } else if (nodeId && existing.nodeId === nodeId && existingLocale === localeNormalized) {
          issues.push({
            fieldName: 'alias',
            code: 'DUPLICATE_ALIAS',
            message: `Exact alias "${normalizedAlias}" already exists for node "${nodeId}" with locale "${localeNormalized ?? 'global'}"`,
            severity: AcademicTaxonomyValidationSeverity.ERROR,
          });
        }
      }
    }

    return issues;
  }

  validateMapping(input: {
    mapping: UpsertAcademicStandardMappingDto;
    existingMappings: AcademicStandardMappingDto[];
    sourceNode?: AcademicTaxonomyNodeDto | null;
    targetNode?: AcademicTaxonomyNodeDto | null;
  }): AcademicTaxonomyValidationIssue[] {
    const issues: AcademicTaxonomyValidationIssue[] = [];
    const { mapping, existingMappings, sourceNode, targetNode } = input;

    const sourceNodeId = mapping.sourceNodeId?.trim();
    const targetNodeId = mapping.targetNodeId?.trim();

    if (!sourceNodeId) {
      issues.push({
        fieldName: 'sourceNodeId',
        code: 'MISSING_SOURCE_NODE_ID',
        message: 'sourceNodeId is required and cannot be empty',
        severity: AcademicTaxonomyValidationSeverity.ERROR,
      });
    }

    if (!targetNodeId) {
      issues.push({
        fieldName: 'targetNodeId',
        code: 'MISSING_TARGET_NODE_ID',
        message: 'targetNodeId is required and cannot be empty',
        severity: AcademicTaxonomyValidationSeverity.ERROR,
      });
    }

    if (sourceNodeId && targetNodeId && sourceNodeId === targetNodeId) {
      issues.push({
        fieldName: 'targetNodeId',
        code: 'SELF_MAPPING',
        message: 'sourceNodeId and targetNodeId cannot be the same node',
        severity: AcademicTaxonomyValidationSeverity.ERROR,
      });
    }

    if (
      !mapping.sourceStandard ||
      !Object.values(AcademicStandardType).includes(mapping.sourceStandard as AcademicStandardType)
    ) {
      issues.push({
        fieldName: 'sourceStandard',
        code: 'INVALID_SOURCE_STANDARD',
        message: 'sourceStandard must be a valid AcademicStandardType',
        severity: AcademicTaxonomyValidationSeverity.ERROR,
      });
    }

    if (
      !mapping.targetStandard ||
      !Object.values(AcademicStandardType).includes(mapping.targetStandard as AcademicStandardType)
    ) {
      issues.push({
        fieldName: 'targetStandard',
        code: 'INVALID_TARGET_STANDARD',
        message: 'targetStandard must be a valid AcademicStandardType',
        severity: AcademicTaxonomyValidationSeverity.ERROR,
      });
    }

    if (
      mapping.sourceStandard &&
      mapping.targetStandard &&
      mapping.sourceStandard === mapping.targetStandard
    ) {
      issues.push({
        fieldName: 'targetStandard',
        code: 'SAME_STANDARD_MAPPING_FORBIDDEN',
        message: 'sourceStandard and targetStandard must be different standards',
        severity: AcademicTaxonomyValidationSeverity.ERROR,
      });
    }

    if (sourceNodeId) {
      if (!sourceNode) {
        issues.push({
          fieldName: 'sourceNodeId',
          code: 'SOURCE_NODE_NOT_FOUND',
          message: `Source node with id "${sourceNodeId}" does not exist`,
          severity: AcademicTaxonomyValidationSeverity.ERROR,
        });
      } else {
        if (sourceNode.status !== AcademicTaxonomyStatus.ACTIVE) {
          issues.push({
            fieldName: 'sourceNodeId',
            code: 'SOURCE_NODE_NOT_ACTIVE',
            message: `Source node "${sourceNodeId}" must be ACTIVE`,
            severity: AcademicTaxonomyValidationSeverity.ERROR,
          });
        }
        if (mapping.sourceStandard && sourceNode.standardType !== mapping.sourceStandard) {
          issues.push({
            fieldName: 'sourceStandard',
            code: 'SOURCE_STANDARD_MISMATCH',
            message: `Source node standard ${sourceNode.standardType} does not match ${mapping.sourceStandard}`,
            severity: AcademicTaxonomyValidationSeverity.ERROR,
          });
        }
      }
    }

    if (targetNodeId) {
      if (!targetNode) {
        issues.push({
          fieldName: 'targetNodeId',
          code: 'TARGET_NODE_NOT_FOUND',
          message: `Target node with id "${targetNodeId}" does not exist`,
          severity: AcademicTaxonomyValidationSeverity.ERROR,
        });
      } else {
        if (targetNode.status !== AcademicTaxonomyStatus.ACTIVE) {
          issues.push({
            fieldName: 'targetNodeId',
            code: 'TARGET_NODE_NOT_ACTIVE',
            message: `Target node "${targetNodeId}" must be ACTIVE`,
            severity: AcademicTaxonomyValidationSeverity.ERROR,
          });
        }
        if (mapping.targetStandard && targetNode.standardType !== mapping.targetStandard) {
          issues.push({
            fieldName: 'targetStandard',
            code: 'TARGET_STANDARD_MISMATCH',
            message: `Target node standard ${targetNode.standardType} does not match ${mapping.targetStandard}`,
            severity: AcademicTaxonomyValidationSeverity.ERROR,
          });
        }
      }
    }

    if (
      !mapping.strength ||
      !Object.values(AcademicMappingStrength).includes(mapping.strength as AcademicMappingStrength)
    ) {
      issues.push({
        fieldName: 'strength',
        code: 'INVALID_MAPPING_STRENGTH',
        message: 'strength must be a valid AcademicMappingStrength',
        severity: AcademicTaxonomyValidationSeverity.ERROR,
      });
    }

    if (mapping.strength === AcademicMappingStrength.UNKNOWN) {
      issues.push({
        fieldName: 'strength',
        code: 'UNKNOWN_MAPPING_STRENGTH',
        message: 'Mapping strength is UNKNOWN',
        severity: AcademicTaxonomyValidationSeverity.WARNING,
      });
    }

    if (mapping.confidence !== undefined && mapping.confidence !== null) {
      if (
        typeof mapping.confidence !== 'number' ||
        isNaN(mapping.confidence) ||
        mapping.confidence < 0 ||
        mapping.confidence > 1
      ) {
        issues.push({
          fieldName: 'confidence',
          code: 'INVALID_CONFIDENCE_RANGE',
          message: 'confidence must be a number between 0 and 1 inclusive',
          severity: AcademicTaxonomyValidationSeverity.ERROR,
        });
      }
    }

    if (
      mapping.strength === AcademicMappingStrength.EXACT &&
      (mapping.confidence === undefined || mapping.confidence === null)
    ) {
      issues.push({
        fieldName: 'confidence',
        code: 'MISSING_EXACT_MAPPING_CONFIDENCE',
        message: 'confidence score is recommended for EXACT mappings',
        severity: AcademicTaxonomyValidationSeverity.WARNING,
      });
    }

    if (sourceNodeId && targetNodeId && mapping.sourceStandard && mapping.targetStandard) {
      const isDuplicate = existingMappings.some(
        (m) =>
          m.sourceNodeId === sourceNodeId &&
          m.targetNodeId === targetNodeId &&
          m.sourceStandard === mapping.sourceStandard &&
          m.targetStandard === mapping.targetStandard
      );
      if (isDuplicate) {
        issues.push({
          fieldName: 'mapping',
          code: 'DUPLICATE_MAPPING',
          message: `Mapping between "${sourceNodeId}" (${mapping.sourceStandard}) and "${targetNodeId}" (${mapping.targetStandard}) already exists`,
          severity: AcademicTaxonomyValidationSeverity.ERROR,
        });
      }
    }

    return issues;
  }
}

