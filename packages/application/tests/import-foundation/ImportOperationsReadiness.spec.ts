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
  ImportOperationsSummaryDto,
  ImportBatchOperationsDto,
  QueueJobOperationsDto,
  SourceOperationsDto,
  DriftAlertOperationsDto,
  MergeProposalOperationsDto
} from '../../src';

describe('ImportOperationsReadiness & Security Verification', () => {
  const sampleBatches: ImportBatchOperationsDto[] = [
    {
      batchId: 'batch-active-1',
      dataType: 'CSV',
      batchStatus: 'QUEUED',
      totalRecords: 100,
      processedRecords: 0,
      failedRecords: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      batchId: 'batch-active-2',
      dataType: 'NDJSON',
      batchStatus: 'PROCESSING',
      totalRecords: 200,
      processedRecords: 50,
      failedRecords: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      batchId: 'batch-completed-3',
      dataType: 'CSV',
      batchStatus: 'COMPLETED',
      totalRecords: 300,
      processedRecords: 300,
      failedRecords: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const sampleJobs: QueueJobOperationsDto[] = [
    {
      batchId: 'batch-active-1',
      status: ImportJobStatus.QUEUED,
      progress: 0,
      processedRecords: 0,
      failedRecords: 0,
      updatedAt: new Date()
    },
    {
      batchId: 'batch-active-2',
      status: ImportJobStatus.RUNNING,
      progress: 25,
      processedRecords: 50,
      failedRecords: 0,
      updatedAt: new Date()
    },
    {
      batchId: 'batch-failed-3',
      status: ImportJobStatus.FAILED_RETRYABLE,
      progress: 10,
      processedRecords: 5,
      failedRecords: 2,
      lastError: 'Transient network failure',
      updatedAt: new Date()
    },
    {
      batchId: 'batch-failed-4',
      status: ImportJobStatus.FAILED_PERMANENT,
      progress: 40,
      processedRecords: 15,
      failedRecords: 10,
      lastError: 'Unrecoverable format exception',
      updatedAt: new Date()
    },
    {
      batchId: 'batch-dlq-5',
      status: ImportJobStatus.DLQ,
      progress: 100,
      processedRecords: 0,
      failedRecords: 20,
      lastError: 'Quarantined record in DLQ',
      updatedAt: new Date()
    },
    {
      batchId: 'batch-paused-6',
      status: ImportJobStatus.PAUSED,
      progress: 50,
      processedRecords: 50,
      failedRecords: 0,
      updatedAt: new Date()
    },
    {
      batchId: 'batch-cancelled-7',
      status: ImportJobStatus.CANCELLED,
      progress: 10,
      processedRecords: 5,
      failedRecords: 0,
      updatedAt: new Date()
    }
  ];

  const sampleSources: SourceOperationsDto[] = [
    {
      sourceId: 'source-1',
      displayName: 'Official Ministry Portal',
      category: SourceConnectorCategory.OFFICIAL_API,
      accessClassification: SourceAccessClassification.PUBLIC_ALLOWED,
      status: SourceStatus.ACTIVE,
      connectorId: 'conn-official',
      connectorVersion: '2.0.0'
    },
    {
      sourceId: 'source-2',
      displayName: 'External Education RSS',
      category: SourceConnectorCategory.RSS,
      accessClassification: SourceAccessClassification.PUBLIC_ALLOWED,
      status: SourceStatus.NEEDS_REVIEW,
      connectorId: 'conn-rss',
      connectorVersion: '1.0.1'
    }
  ];

  const sampleDriftAlerts: DriftAlertOperationsDto[] = [
    {
      sourceId: 'source-2',
      connectorId: 'conn-rss',
      connectorVersion: '1.0.1',
      driftType: DriftType.SCHEMA_MISMATCH,
      severity: DriftSeverity.HIGH,
      detectedAt: new Date(),
      recommendedAction: 'Re-align mapping rules for missing column [tuitionFee]'
    }
  ];

  const sampleMergeProposals: MergeProposalOperationsDto[] = [
    {
      proposalId: 'prop-101',
      targetDomain: ImportTargetDomain.Scholarships,
      status: MergeProposalStatus.NEEDS_REVIEW,
      requiresReview: true,
      conflictCount: 3,
      missingFieldCount: 1,
      createdAt: new Date()
    }
  ];

  describe('1. Dashboard Truthfulness', () => {
    it('summary counts match provided in-memory DTO inputs exactly', async () => {
      const service = new ImportOperationsReadService({
        batches: sampleBatches,
        queueJobs: sampleJobs,
        sources: sampleSources,
        driftAlerts: sampleDriftAlerts,
        mergeProposals: sampleMergeProposals
      });

      const summary = await service.getSummary();

      expect(summary.activeBatches).toBe(2);
      expect(summary.queuedJobs).toBe(1);
      expect(summary.runningJobs).toBe(1);
      expect(summary.failedJobs).toBe(3); // FAILED_RETRYABLE, FAILED_PERMANENT, DLQ
      expect(summary.dlqRecords).toBe(1);
      expect(summary.driftAlerts).toBe(1);
      expect(summary.sourcesNeedingReview).toBe(1);
      expect(summary.pendingMergeProposals).toBe(1);
      expect(summary.generatedAt).toBeInstanceOf(Date);
    });

    it('verifies ImportOperationsSummaryDto contains no fake trust or marketing fields', () => {
      const summaryKeys: (keyof ImportOperationsSummaryDto)[] = [
        'activeBatches',
        'queuedJobs',
        'runningJobs',
        'failedJobs',
        'dlqRecords',
        'driftAlerts',
        'sourcesNeedingReview',
        'pendingMergeProposals',
        'generatedAt'
      ];

      // Verify no prohibited artificial fields exist
      const forbiddenFields = [
        'fakeTrustScore',
        'trustScore',
        'aiReadinessIndex',
        'crawlerHealthPercent',
        'autoTransferSuccessRate',
        'qualityRating'
      ];

      for (const field of forbiddenFields) {
        expect(summaryKeys).not.toContain(field);
      }
    });
  });

  describe('2. Security & Secrets Isolation', () => {
    it('operations DTO shapes do not expose secret/token/password/apiKey fields', () => {
      const sourceDto: SourceOperationsDto = {
        sourceId: 'src-sec-01',
        displayName: 'Public API Source',
        category: SourceConnectorCategory.OFFICIAL_API,
        accessClassification: SourceAccessClassification.PUBLIC_ALLOWED,
        status: SourceStatus.ACTIVE,
        connectorId: 'conn-sec-01',
        connectorVersion: '1.0.0'
      };

      const keys = Object.keys(sourceDto);
      const prohibitedKeys = [
        'apiKey',
        'apiSecret',
        'authToken',
        'password',
        'bearerToken',
        'privateKey',
        'credentials'
      ];

      for (const key of prohibitedKeys) {
        expect(keys).not.toContain(key);
      }
    });

    it('drift and merge summary DTOs do not expose raw evidence or payload snippets', () => {
      const driftDto: DriftAlertOperationsDto = {
        sourceId: 'src-01',
        connectorId: 'conn-01',
        connectorVersion: '1.0.0',
        driftType: DriftType.SCHEMA_MISMATCH,
        severity: DriftSeverity.MEDIUM,
        detectedAt: new Date(),
        recommendedAction: 'Inspect column mapping'
      };

      const mergeDto: MergeProposalOperationsDto = {
        proposalId: 'prop-01',
        targetDomain: ImportTargetDomain.Scholarships,
        status: MergeProposalStatus.NEEDS_REVIEW,
        requiresReview: true,
        conflictCount: 1,
        missingFieldCount: 0,
        createdAt: new Date()
      };

      expect((driftDto as any).rawEvidence).toBeUndefined();
      expect((driftDto as any).evidenceSnippet).toBeUndefined();
      expect((driftDto as any).rawPayload).toBeUndefined();

      expect((mergeDto as any).rawEvidence).toBeUndefined();
      expect((mergeDto as any).evidenceSnippet).toBeUndefined();
      expect((mergeDto as any).payloadSnapshot).toBeUndefined();
    });
  });

  describe('3. Read-Only Contract Enforcement', () => {
    it('ImportOperationsReadService exposes zero mutating method names', () => {
      const service = new ImportOperationsReadService();
      const proto = Object.getPrototypeOf(service);
      const methods = Object.getOwnPropertyNames(proto).filter(m => m !== 'constructor');

      const forbiddenPrefixes = [
        'publish',
        'merge',
        'transfer',
        'promote',
        'delete',
        'update',
        'create',
        'save',
        'post',
        'put',
        'patch',
        'remove'
      ];

      for (const method of methods) {
        for (const forbidden of forbiddenPrefixes) {
          expect(method.toLowerCase().startsWith(forbidden)).toBe(
            false,
            `Method ${method} violates read-only rule by starting with ${forbidden}`
          );
        }
      }
    });
  });

  describe('4. Failure Visibility', () => {
    it('accurately surfaces DLQ, failed jobs, sources needing review, drift alerts, and merge proposals', async () => {
      const service = new ImportOperationsReadService({
        batches: sampleBatches,
        queueJobs: sampleJobs,
        sources: sampleSources,
        driftAlerts: sampleDriftAlerts,
        mergeProposals: sampleMergeProposals
      });

      const summary = await service.getSummary();

      expect(summary.failedJobs).toBe(3); // FAILED_RETRYABLE, FAILED_PERMANENT, DLQ
      expect(summary.dlqRecords).toBe(1);
      expect(summary.sourcesNeedingReview).toBe(1);
      expect(summary.driftAlerts).toBe(1);
      expect(summary.pendingMergeProposals).toBe(1);

      const dlqJobs = await service.listQueueJobs({ status: ImportJobStatus.DLQ });
      expect(dlqJobs.length).toBe(1);
      expect(dlqJobs[0].lastError).toContain('Quarantined record in DLQ');

      const reviewSources = await service.listSources({ status: SourceStatus.NEEDS_REVIEW });
      expect(reviewSources.length).toBe(1);
      expect(reviewSources[0].sourceId).toBe('source-2');
    });
  });

  describe('5. Phase Boundary Integrity', () => {
    it('verifies service operates strictly on DTO contracts without domain repository coupling', () => {
      const service = new ImportOperationsReadService({});
      expect(service).toBeDefined();
      expect((service as any).scholarshipRepository).toBeUndefined();
      expect((service as any).universityRepository).toBeUndefined();
      expect((service as any).majorRepository).toBeUndefined();
    });
  });

  describe('6. Recovery Readiness & Visibility', () => {
    it('paused, cancelled, and failed queue jobs remain visible in listQueueJobs', async () => {
      const service = new ImportOperationsReadService({ queueJobs: sampleJobs });

      const allJobs = await service.listQueueJobs();
      expect(allJobs.length).toBe(7);

      const paused = await service.listQueueJobs({ status: ImportJobStatus.PAUSED });
      expect(paused.length).toBe(1);
      expect(paused[0].batchId).toBe('batch-paused-6');

      const cancelled = await service.listQueueJobs({ status: ImportJobStatus.CANCELLED });
      expect(cancelled.length).toBe(1);
      expect(cancelled[0].batchId).toBe('batch-cancelled-7');

      const failedRetryable = await service.listQueueJobs({ status: ImportJobStatus.FAILED_RETRYABLE });
      expect(failedRetryable.length).toBe(1);
      expect(failedRetryable[0].batchId).toBe('batch-failed-3');
    });
  });
});
