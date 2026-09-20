import {
  ImportJobStatus,
  SourceStatus,
  DriftSeverity,
  MergeProposalStatus
} from '@manaratak/domain';
import { IImportOperationsReadService } from '../contracts/IImportOperationsReadService';
import {
  ImportOperationsSummaryDto,
  ImportBatchOperationsDto,
  QueueJobOperationsDto,
  SourceOperationsDto,
  DriftAlertOperationsDto,
  MergeProposalOperationsDto
} from '../dtos/ImportOperationsDtos';

export class ImportOperationsReadService implements IImportOperationsReadService {
  private readonly batches: ImportBatchOperationsDto[];
  private readonly queueJobs: QueueJobOperationsDto[];
  private readonly sources: SourceOperationsDto[];
  private readonly driftAlerts: DriftAlertOperationsDto[];
  private readonly mergeProposals: MergeProposalOperationsDto[];

  constructor(options: {
    batches?: ImportBatchOperationsDto[];
    queueJobs?: QueueJobOperationsDto[];
    sources?: SourceOperationsDto[];
    driftAlerts?: DriftAlertOperationsDto[];
    mergeProposals?: MergeProposalOperationsDto[];
  } = {}) {
    this.batches = options.batches ? options.batches.map(b => ({ ...b })) : [];
    this.queueJobs = options.queueJobs ? options.queueJobs.map(q => ({ ...q })) : [];
    this.sources = options.sources ? options.sources.map(s => ({ ...s })) : [];
    this.driftAlerts = options.driftAlerts ? options.driftAlerts.map(d => ({ ...d })) : [];
    this.mergeProposals = options.mergeProposals ? options.mergeProposals.map(m => ({ ...m })) : [];
  }

  async getSummary(): Promise<ImportOperationsSummaryDto> {
    const activeBatches = this.batches.filter(
      b => b.batchStatus === 'PROCESSING' || b.batchStatus === 'QUEUED'
    ).length;

    const queuedJobs = this.queueJobs.filter(
      q => q.status === ImportJobStatus.QUEUED
    ).length;

    const runningJobs = this.queueJobs.filter(
      q => q.status === ImportJobStatus.RUNNING
    ).length;

    const failedJobs = this.queueJobs.filter(
      q =>
        q.status === ImportJobStatus.FAILED_RETRYABLE ||
        q.status === ImportJobStatus.FAILED_PERMANENT ||
        q.status === ImportJobStatus.DLQ
    ).length;

    const dlqRecords = this.queueJobs.filter(
      q => q.status === ImportJobStatus.DLQ
    ).length;

    const driftAlerts = this.driftAlerts.length;

    const sourcesNeedingReview = this.sources.filter(
      s => s.status === SourceStatus.NEEDS_REVIEW
    ).length;

    const pendingMergeProposals = this.mergeProposals.filter(
      m => m.requiresReview === true || m.status === MergeProposalStatus.NEEDS_REVIEW
    ).length;

    return {
      activeBatches,
      queuedJobs,
      runningJobs,
      failedJobs,
      dlqRecords,
      driftAlerts,
      sourcesNeedingReview,
      pendingMergeProposals,
      generatedAt: new Date()
    };
  }

  async listActiveBatches(): Promise<ImportBatchOperationsDto[]> {
    return this.batches
      .filter(b => b.batchStatus === 'PROCESSING' || b.batchStatus === 'QUEUED')
      .map(b => ({ ...b }));
  }

  async listQueueJobs(filters?: { status?: ImportJobStatus }): Promise<QueueJobOperationsDto[]> {
    let result = this.queueJobs;
    if (filters?.status) {
      result = result.filter(q => q.status === filters.status);
    }
    return result.map(q => ({ ...q }));
  }

  async listSources(filters?: { status?: SourceStatus }): Promise<SourceOperationsDto[]> {
    let result = this.sources;
    if (filters?.status) {
      result = result.filter(s => s.status === filters.status);
    }
    return result.map(s => ({ ...s }));
  }

  async listDriftAlerts(filters?: { severity?: DriftSeverity }): Promise<DriftAlertOperationsDto[]> {
    let result = this.driftAlerts;
    if (filters?.severity) {
      result = result.filter(d => d.severity === filters.severity);
    }
    return result.map(d => ({ ...d }));
  }

  async listPendingMergeProposals(): Promise<MergeProposalOperationsDto[]> {
    return this.mergeProposals
      .filter(m => m.requiresReview === true || m.status === MergeProposalStatus.NEEDS_REVIEW)
      .map(m => ({ ...m }));
  }
}
