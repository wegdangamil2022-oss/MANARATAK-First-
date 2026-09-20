import { describe, it, expect } from 'vitest';
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
import {
  ImportOperationsSummaryDto,
  ImportBatchOperationsDto,
  QueueJobOperationsDto,
  SourceOperationsDto,
  DriftAlertOperationsDto,
  MergeProposalOperationsDto,
  IImportOperationsReadService
} from '../../src';

describe('ImportOperationsContracts and DTOs', () => {
  it('validates ImportOperationsSummaryDto shape', () => {
    const summary: ImportOperationsSummaryDto = {
      activeBatches: 2,
      queuedJobs: 5,
      runningJobs: 1,
      failedJobs: 0,
      dlqRecords: 3,
      driftAlerts: 1,
      sourcesNeedingReview: 1,
      pendingMergeProposals: 4,
      generatedAt: new Date()
    };

    expect(summary.activeBatches).toBe(2);
    expect(summary.queuedJobs).toBe(5);
    expect(summary.dlqRecords).toBe(3);
  });

  it('validates ImportBatchOperationsDto shape', () => {
    const batch: ImportBatchOperationsDto = {
      batchId: 'batch-101',
      dataType: 'CSV',
      batchStatus: 'STAGED',
      totalRecords: 500,
      processedRecords: 500,
      failedRecords: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    expect(batch.batchId).toBe('batch-101');
    expect(batch.processedRecords).toBe(500);
  });

  it('validates QueueJobOperationsDto shape', () => {
    const job: QueueJobOperationsDto = {
      batchId: 'batch-101',
      status: ImportJobStatus.RUNNING,
      progress: 75,
      processedRecords: 375,
      failedRecords: 2,
      updatedAt: new Date()
    };

    expect(job.status).toBe(ImportJobStatus.RUNNING);
    expect(job.progress).toBe(75);
  });

  it('validates SourceOperationsDto shape without secret fields', () => {
    const source: SourceOperationsDto = {
      sourceId: 'src-univ-01',
      displayName: 'Ministry of Education University Directory',
      category: SourceConnectorCategory.OFFICIAL_API,
      accessClassification: SourceAccessClassification.PUBLIC_ALLOWED,
      status: SourceStatus.ACTIVE,
      connectorId: 'conn-edu-gov',
      connectorVersion: '1.2.0'
    };

    expect(source.sourceId).toBe('src-univ-01');
    expect((source as any).apiKey).toBeUndefined();
    expect((source as any).apiSecret).toBeUndefined();
  });

  it('validates DriftAlertOperationsDto shape', () => {
    const alert: DriftAlertOperationsDto = {
      sourceId: 'src-univ-01',
      connectorId: 'conn-edu-gov',
      connectorVersion: '1.2.0',
      driftType: DriftType.SCHEMA_MISMATCH,
      severity: DriftSeverity.MEDIUM,
      detectedAt: new Date(),
      recommendedAction: 'Inspect missing column [accreditationStatus]'
    };

    expect(alert.driftType).toBe(DriftType.SCHEMA_MISMATCH);
    expect(alert.severity).toBe(DriftSeverity.MEDIUM);
  });

  it('validates MergeProposalOperationsDto shape', () => {
    const proposal: MergeProposalOperationsDto = {
      proposalId: 'prop-901',
      targetDomain: ImportTargetDomain.Scholarships,
      status: MergeProposalStatus.NEEDS_REVIEW,
      requiresReview: true,
      conflictCount: 1,
      missingFieldCount: 0,
      createdAt: new Date()
    };

    expect(proposal.proposalId).toBe('prop-901');
    expect(proposal.requiresReview).toBe(true);
    expect(proposal.conflictCount).toBe(1);
  });

  it('verifies IImportOperationsReadService interface has no mutating method names', () => {
    const mockReadService: IImportOperationsReadService = {
      getSummary: async () => ({
        activeBatches: 0,
        queuedJobs: 0,
        runningJobs: 0,
        failedJobs: 0,
        dlqRecords: 0,
        driftAlerts: 0,
        sourcesNeedingReview: 0,
        pendingMergeProposals: 0,
        generatedAt: new Date()
      }),
      listActiveBatches: async () => [],
      listQueueJobs: async () => [],
      listSources: async () => [],
      listDriftAlerts: async () => [],
      listPendingMergeProposals: async () => []
    };

    const methodNames = Object.keys(mockReadService);
    const forbiddenMutatingPrefixes = ['publish', 'merge', 'transfer', 'promote', 'delete', 'update', 'create', 'save'];

    for (const methodName of methodNames) {
      for (const forbidden of forbiddenMutatingPrefixes) {
        expect(methodName.toLowerCase().startsWith(forbidden)).toBe(false);
      }
    }
  });
});
