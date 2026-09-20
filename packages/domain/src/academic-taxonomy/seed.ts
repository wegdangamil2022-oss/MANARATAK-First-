import {
  AcademicTaxonomyNodeDto,
  UpsertAcademicTaxonomyNodeDto,
  AcademicTaxonomyEdgeDto,
  UpsertAcademicTaxonomyEdgeDto,
  AcademicTaxonomyAliasDto,
  UpsertAcademicTaxonomyAliasDto,
  AcademicStandardMappingDto,
  UpsertAcademicStandardMappingDto,
  AcademicTaxonomyValidationIssue,
} from './contracts';

export enum AcademicTaxonomySeedStatus {
  DRAFT = 'DRAFT',
  VALIDATED = 'VALIDATED',
  READY_TO_APPLY = 'READY_TO_APPLY',
  APPLIED = 'APPLIED',
  REJECTED = 'REJECTED',
}

export type AcademicTaxonomySeedRecordType = 'NODE' | 'EDGE' | 'ALIAS' | 'MAPPING';

export interface AcademicTaxonomySeedRecord {
  recordId: string;
  recordType: AcademicTaxonomySeedRecordType;
  deterministicKey?: string;
  payload:
    | AcademicTaxonomyNodeDto
    | UpsertAcademicTaxonomyNodeDto
    | AcademicTaxonomyEdgeDto
    | UpsertAcademicTaxonomyEdgeDto
    | AcademicTaxonomyAliasDto
    | UpsertAcademicTaxonomyAliasDto
    | AcademicStandardMappingDto
    | UpsertAcademicStandardMappingDto;
  validationIssues?: AcademicTaxonomyValidationIssue[];
  canBeApplied?: boolean;
}

export interface AcademicTaxonomySeedBatch {
  seedBatchId: string;
  sourceName: string;
  sourceVersion: string;
  sourceUrl?: string;
  status: AcademicTaxonomySeedStatus;
  records: AcademicTaxonomySeedRecord[];
  createdAt: Date;
  validatedAt?: Date;
  appliedAt?: Date;
  appliedBy?: string;
  validationSummary?: {
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
    nodeRecords: number;
    edgeRecords: number;
    aliasRecords: number;
    mappingRecords: number;
  };
}

export interface IAcademicTaxonomySeedPlanner {
  createBatch(input: {
    seedBatchId: string;
    sourceName: string;
    sourceVersion: string;
    sourceUrl?: string;
    records: AcademicTaxonomySeedRecord[];
  }): AcademicTaxonomySeedBatch;

  validateBatch(input: {
    batch: AcademicTaxonomySeedBatch;
    existingNodes: AcademicTaxonomyNodeDto[];
    existingEdges: Array<{ parentNodeId: string; childNodeId: string; isPrimary?: boolean }>;
    existingAliases: AcademicTaxonomyAliasDto[];
    existingMappings: AcademicStandardMappingDto[];
  }): AcademicTaxonomySeedBatch;

  markReadyToApply(batch: AcademicTaxonomySeedBatch): AcademicTaxonomySeedBatch;
}
