import {
  ImportJobStatus,
  SourceStatus,
  DriftSeverity
} from '@manaratak/domain';
import {
  ImportOperationsSummaryDto,
  ImportBatchOperationsDto,
  QueueJobOperationsDto,
  SourceOperationsDto,
  DriftAlertOperationsDto,
  MergeProposalOperationsDto
} from '../dtos/ImportOperationsDtos';

export interface IImportOperationsReadService {
  getSummary(): Promise<ImportOperationsSummaryDto>;
  listActiveBatches(): Promise<ImportBatchOperationsDto[]>;
  listQueueJobs(filters?: { status?: ImportJobStatus }): Promise<QueueJobOperationsDto[]>;
  listSources(filters?: { status?: SourceStatus }): Promise<SourceOperationsDto[]>;
  listDriftAlerts(filters?: { severity?: DriftSeverity }): Promise<DriftAlertOperationsDto[]>;
  listPendingMergeProposals(): Promise<MergeProposalOperationsDto[]>;
}
