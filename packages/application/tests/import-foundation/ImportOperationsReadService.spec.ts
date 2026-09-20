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
  ImportOperationsReadService,
  ImportBatchOperationsDto,
  QueueJobOperationsDto,
  SourceOperationsDto,
  DriftAlertOperationsDto,
  MergeProposalOperationsDto
} from '../../src';

describe('ImportOperationsReadService', () => {
  const sampleBatches: ImportBatchOperationsDto[] = [
    {
      batchId: 'batch-1',
      dataType: 'CSV',
      batchStatus: 'QUEUED',
      totalRecords: 100,
      processedRecords: 0,
      failedRecords: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      batchId: 'batch-2',
      dataType: 'NDJSON',
      batchStatus: 'PROCESSING',
      totalRecords: 200,
      processedRecords: 100,
      failedRecords: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      batchId: 'batch-3',
      dataType: 'CSV',
      batchStatus: 'COMPLETED',
      totalRecords: 50,
      processedRecords: 50,
      failedRecords: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const sampleJobs: QueueJobOperationsDto[] = [
    {
      batchId: 'batch-1',
      status: ImportJobStatus.QUEUED,
      progress: 0,
      processedRecords: 0,
      failedRecords: 0,
      updatedAt: new Date()
    },
    {
      batchId: 'batch-2',
      status: ImportJobStatus.RUNNING,
      progress: 50,
      processedRecords: 100,
      failedRecords: 0,
      updatedAt: new Date()
    },
    {
      batchId: 'batch-4',
      status: ImportJobStatus.FAILED_RETRYABLE,
      progress: 10,
      processedRecords: 5,
      failedRecords: 2,
      lastError: 'Network timeout',
      updatedAt: new Date()
    },
    {
      batchId: 'batch-5',
      status: ImportJobStatus.DLQ,
      progress: 100,
      processedRecords: 0,
      failedRecords: 10,
      lastError: 'Schema violation',
      updatedAt: new Date()
    }
  ];

  const sampleSources: SourceOperationsDto[] = [
    {
      sourceId: 'src-1',
      displayName: 'University Directory API',
      category: SourceConnectorCategory.OFFICIAL_API,
      accessClassification: SourceAccessClassification.PUBLIC_ALLOWED,
      status: SourceStatus.ACTIVE,
      connectorId: 'conn-1',
      connectorVersion: '1.0.0'
    },
    {
      sourceId: 'src-2',
      displayName: 'Scholarship Feed',
      category: SourceConnectorCategory.RSS,
      accessClassification: SourceAccessClassification.PUBLIC_ALLOWED,
      status: SourceStatus.NEEDS_REVIEW,
      connectorId: 'conn-2',
      connectorVersion: '1.1.0'
    }
  ];

  const sampleAlerts: DriftAlertOperationsDto[] = [
    {
      sourceId: 'src-2',
      connectorId: 'conn-2',
      connectorVersion: '1.1.0',
      driftType: DriftType.SCHEMA_MISMATCH,
      severity: DriftSeverity.MEDIUM,
      detectedAt: new Date(),
      recommendedAction: 'Inspect missing column [deadline]'
    },
    {
      sourceId: 'src-1',
      connectorId: 'conn-1',
      connectorVersion: '1.0.0',
      driftType: DriftType.CONTENT_DRIFT,
      severity: DriftSeverity.LOW,
      detectedAt: new Date(),
      recommendedAction: 'Verify updated date format'
    }
  ];

  const sampleProposals: MergeProposalOperationsDto[] = [
    {
      proposalId: 'prop-1',
      targetDomain: ImportTargetDomain.Scholarships,
      status: MergeProposalStatus.NEEDS_REVIEW,
      requiresReview: true,
      conflictCount: 2,
      missingFieldCount: 1,
      createdAt: new Date()
    },
    {
      proposalId: 'prop-2',
      targetDomain: ImportTargetDomain.Universities,
      status: MergeProposalStatus.READY_FOR_DOMAIN_REVIEW,
      requiresReview: false,
      conflictCount: 0,
      missingFieldCount: 0,
      createdAt: new Date()
    }
  ];

  it('getSummary accurately calculates metrics', async () => {
    const service = new ImportOperationsReadService({
      batches: sampleBatches,
      queueJobs: sampleJobs,
      sources: sampleSources,
      driftAlerts: sampleAlerts,
      mergeProposals: sampleProposals
    });

    const summary = await service.getSummary();

    expect(summary.activeBatches).toBe(2); // batch-1 (QUEUED), batch-2 (PROCESSING)
    expect(summary.queuedJobs).toBe(1); // batch-1
    expect(summary.runningJobs).toBe(1); // batch-2
    expect(summary.failedJobs).toBe(2); // batch-4 (FAILED_RETRYABLE), batch-5 (DLQ)
    expect(summary.dlqRecords).toBe(1); // batch-5 (DLQ)
    expect(summary.driftAlerts).toBe(2);
    expect(summary.sourcesNeedingReview).toBe(1); // src-2
    expect(summary.pendingMergeProposals).toBe(1); // prop-1
    expect(summary.generatedAt).toBeInstanceOf(Date);
  });

  it('listActiveBatches filters active batches only', async () => {
    const service = new ImportOperationsReadService({ batches: sampleBatches });
    const active = await service.listActiveBatches();

    expect(active.length).toBe(2);
    expect(active.map(b => b.batchId)).toEqual(['batch-1', 'batch-2']);
  });

  it('listQueueJobs supports status filtering', async () => {
    const service = new ImportOperationsReadService({ queueJobs: sampleJobs });

    const all = await service.listQueueJobs();
    expect(all.length).toBe(4);

    const queued = await service.listQueueJobs({ status: ImportJobStatus.QUEUED });
    expect(queued.length).toBe(1);
    expect(queued[0].batchId).toBe('batch-1');

    const dlq = await service.listQueueJobs({ status: ImportJobStatus.DLQ });
    expect(dlq.length).toBe(1);
    expect(dlq[0].batchId).toBe('batch-5');
  });

  it('listSources supports status filtering', async () => {
    const service = new ImportOperationsReadService({ sources: sampleSources });

    const needsReview = await service.listSources({ status: SourceStatus.NEEDS_REVIEW });
    expect(needsReview.length).toBe(1);
    expect(needsReview[0].sourceId).toBe('src-2');
  });

  it('listDriftAlerts supports severity filtering', async () => {
    const service = new ImportOperationsReadService({ driftAlerts: sampleAlerts });

    const medium = await service.listDriftAlerts({ severity: DriftSeverity.MEDIUM });
    expect(medium.length).toBe(1);
    expect(medium[0].sourceId).toBe('src-2');
  });

  it('listPendingMergeProposals filters pending/review proposals', async () => {
    const service = new ImportOperationsReadService({ mergeProposals: sampleProposals });

    const pending = await service.listPendingMergeProposals();
    expect(pending.length).toBe(1);
    expect(pending[0].proposalId).toBe('prop-1');
  });

  it('returns defensive copies preventing internal mutation', async () => {
    const service = new ImportOperationsReadService({ batches: sampleBatches });

    const list1 = await service.listActiveBatches();
    list1.push({
      batchId: 'malicious-batch',
      dataType: 'CSV',
      batchStatus: 'QUEUED',
      totalRecords: 1,
      processedRecords: 0,
      failedRecords: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const list2 = await service.listActiveBatches();
    expect(list2.length).toBe(2);
    expect(list2.find(b => b.batchId === 'malicious-batch')).toBeUndefined();
  });

  it('verifies service exposes no mutation methods', () => {
    const service = new ImportOperationsReadService();
    const methodNames = Object.getOwnPropertyNames(Object.getPrototypeOf(service));
    const forbiddenPrefixes = ['publish', 'merge', 'transfer', 'promote', 'delete', 'update', 'create', 'save'];

    for (const methodName of methodNames) {
      if (methodName === 'constructor') continue;
      for (const forbidden of forbiddenPrefixes) {
        expect(methodName.toLowerCase().startsWith(forbidden)).toBe(false);
      }
    }
  });
});
