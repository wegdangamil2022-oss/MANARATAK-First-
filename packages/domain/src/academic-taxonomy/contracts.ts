import {
  AcademicTaxonomyNodeType,
  AcademicTaxonomyStatus,
  AcademicStandardType,
  AcademicMappingStrength,
  AcademicTaxonomyValidationSeverity,
} from './enums';

export interface AcademicTaxonomyNodeDto {
  nodeId: string;
  nodeType: AcademicTaxonomyNodeType;
  canonicalCode: string;
  canonicalName: string;
  description?: string;
  status: AcademicTaxonomyStatus;
  standardType?: AcademicStandardType;
  standardCode?: string;
  localizedNames?: Record<string, string>;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertAcademicTaxonomyNodeDto {
  nodeType: AcademicTaxonomyNodeType;
  canonicalCode: string;
  canonicalName: string;
  description?: string;
  status?: AcademicTaxonomyStatus;
  standardType?: AcademicStandardType;
  standardCode?: string;
  localizedNames?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface AcademicTaxonomyEdgeDto {
  edgeId: string;
  parentNodeId: string;
  childNodeId: string;
  isPrimary: boolean;
  createdAt: Date;
}

export interface UpsertAcademicTaxonomyEdgeDto {
  parentNodeId: string;
  childNodeId: string;
  isPrimary?: boolean;
}

export interface AcademicTaxonomyAliasDto {
  aliasId: string;
  nodeId: string;
  locale?: string;
  alias: string;
  normalizedAlias: string;
  createdAt: Date;
}

export interface UpsertAcademicTaxonomyAliasDto {
  nodeId: string;
  locale?: string;
  alias: string;
}

export interface AcademicStandardMappingDto {
  mappingId: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceStandard: AcademicStandardType;
  targetStandard: AcademicStandardType;
  strength: AcademicMappingStrength;
  confidence?: number;
  notes?: string;
  createdAt: Date;
}

export interface UpsertAcademicStandardMappingDto {
  sourceNodeId: string;
  targetNodeId: string;
  sourceStandard: AcademicStandardType;
  targetStandard: AcademicStandardType;
  strength: AcademicMappingStrength;
  confidence?: number;
  notes?: string;
}

export interface AcademicTaxonomyFilters {
  q?: string;
  nodeType?: AcademicTaxonomyNodeType;
  status?: AcademicTaxonomyStatus;
  standardType?: AcademicStandardType;
  parentNodeId?: string;
  page?: number;
  pageSize?: number;
}

export interface AcademicTaxonomyValidationIssue {
  fieldName?: string;
  code: string;
  message: string;
  severity: AcademicTaxonomyValidationSeverity;
}

export interface AcademicTaxonomyCompletenessReport {
  deterministicKey: string;
  requiredFields: string[];
  presentFields: string[];
  missingFields: string[];
  issues: AcademicTaxonomyValidationIssue[];
  isComplete: boolean;
  canBeReviewed: boolean;
}
