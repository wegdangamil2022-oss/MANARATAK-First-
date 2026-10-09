import { IImportQueueGateway } from '../gateways/IImportQueueGateway';
import { ImportAdminUseCases } from './ImportAdminUseCases';

export interface ProcessImportJobCommand {
  batchId: string;
  dataText: string;
  sourceSystem?: string;
  dataType?: string;
}

export interface ProcessImportJobResult {
  success: boolean;
  batchId: string;
  importResult?: any;
  error?: string;
}

export class ProcessImportJobUseCase {
  constructor(
    private readonly importAdminUseCases: ImportAdminUseCases,
    private readonly importQueueGateway: IImportQueueGateway
  ) {}

  async execute(command: ProcessImportJobCommand): Promise<ProcessImportJobResult> {
    const { batchId, dataText, sourceSystem, dataType } = command;

    const jobStatus = await this.importQueueGateway.getJobStatus(batchId);
    if (!jobStatus) {
      throw new Error(`Job not found for batchId: ${batchId}`);
    }

    if (jobStatus.status === 'PAUSED' || jobStatus.status === 'CANCELLED') {
      throw new Error(`Job ${batchId} cannot be processed because its status is ${jobStatus.status}`);
    }

    if (jobStatus.status !== 'QUEUED' && jobStatus.status !== 'RESUMING') {
      throw new Error(`Job ${batchId} is not in QUEUED state (current status: ${jobStatus.status})`);
    }

    const markedRunning = await this.importQueueGateway.markJobRunning(batchId);
    if (!markedRunning) {
      throw new Error(`Failed to transition job ${batchId} to RUNNING state`);
    }

    try {
      const importResult = await this.importAdminUseCases.importData({
        dataText,
        sourceSystem,
        dataType
      });

      // The legacy queue may have been paused, cancelled or superseded while
      // importData was working. A rejected terminal CAS is never success.
      if (!(await this.importQueueGateway.markJobCompleted(batchId)))
        throw new Error('IMPORT_LEGACY_QUEUE_STATE_LOST');

      return {
        success: true,
        batchId,
        importResult
      };
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'IMPORT_LEGACY_QUEUE_STATE_LOST')
        throw err;
      const errorMessage = err instanceof Error ? err.message : String(err);

      // Never write DLQ evidence after a failed terminal transition. Another
      // worker (or a stop request) may now own this batch.
      if (!(await this.importQueueGateway.markJobFailed(batchId, errorMessage)))
        throw new Error('IMPORT_LEGACY_QUEUE_STATE_LOST');

      await this.importQueueGateway.moveToDeadLetter({
        batchId,
        failedAt: new Date(),
        reason: errorMessage
      });

      return {
        success: false,
        batchId,
        error: errorMessage
      };
    }
  }
}
