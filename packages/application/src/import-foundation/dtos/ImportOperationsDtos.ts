import {
  ImportJobStatus,
  SourceConnectorCategory,
  SourceAccessClassification,
  SourceStatus,
  DriftType,
  DriftSeverity,
  ImportTargetDomain,
  MergeProposalStatus
} from '@manaratak/domain';

export interface ImportOperationsSummaryDto {
  activeBatches: number;
  queuedJobs: number;
  runningJobs: number;
  failedJobs: number;
  dlqRecords: number;
  driftAlerts: number;
  sourcesNeedingReview: number;
  pendingMergeProposals: number;
  generatedAt: Date;
}

export interface ImportBatchOperationsDto {
  batchId: string;
  dataType: string;
  batchStatus: string;
  totalRecords: number;
  processedRecords: number;
  failedRecords: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface QueueJobOperationsDto {
  batchId: string;
  status: ImportJobStatus;
  progress: number;
  processedRecords: number;
  failedRecords: number;
  lastError?: string;
  updatedAt: Date;
}

export interface SourceOperationsDto {
  sourceId: string;
  displayName: string;
  category: SourceConnectorCategory;
  accessClassification: SourceAccessClassification;
  status: SourceStatus;
  connectorId: string;
  connectorVersion: string;
}

export interface DriftAlertOperationsDto {
  sourceId: string;
  connectorId: string;
  connectorVersion: string;
  driftType: DriftType;
  severity: DriftSeverity;
  detectedAt: Date;
  recommendedAction: string;
}

export interface MergeProposalOperationsDto {
  proposalId: string;
  targetDomain: ImportTargetDomain;
  status: MergeProposalStatus;
  requiresReview: boolean;
  conflictCount: number;
  missingFieldCount: number;
  createdAt: Date;
}
