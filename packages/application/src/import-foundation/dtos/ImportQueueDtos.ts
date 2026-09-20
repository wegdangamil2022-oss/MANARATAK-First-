import { ImportJobStatus, ImportTargetDomain } from '@manaratak/domain';

export interface EnqueueImportJobCommand {
  batchId: string;
  targetDomain: ImportTargetDomain;
  sourceSystem: string;
  priority?: number;
  metadata?: Record<string, unknown>;
}

export interface ImportJobStatusDto {
  batchId: string;
  status: ImportJobStatus;
  progress: number;
  processedRecords: number;
  failedRecords: number;
  totalRecords?: number;
  createdAt: Date;
  updatedAt: Date;
  lastError?: string;
  checkpoint?: Record<string, unknown>;
  attemptCount?: number;
  availableAt?: Date;
  claimedBy?: string;
  claimUntil?: Date;
}

export interface ClaimImportJobCommand {
  workerId: string;
  leaseDurationMs: number;
  /** Optional targeted claim used by the synchronous compatibility bridge. */
  batchId?: string;
  now?: Date;
}

export interface ImportJobLease {
  batchId: string;
  workerId: string;
  attempt: number;
  claimUntil: Date;
}

export interface FailImportJobCommand {
  lease: ImportJobLease;
  reason: string;
  errorCode?: string;
  retryPolicy: import('@manaratak/domain').ImportRetryPolicy;
  now?: Date;
}

export interface PauseImportJobCommand {
  batchId: string;
  reason?: string;
}

export interface ResumeImportJobCommand {
  batchId: string;
}

export interface CancelImportJobCommand {
  batchId: string;
  reason?: string;
}

export interface ReplayImportJobCommand {
  batchId: string;
  fromCheckpoint?: boolean;
}

export interface DeadLetterImportRecordDto {
  recordId?: string;
  batchId: string;
  failedAt: Date;
  reason: string;
  errorCode?: string;
  payload?: unknown;
}
