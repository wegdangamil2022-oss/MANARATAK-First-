import { ImportRetryPolicy } from '@manaratak/domain';
import { IImportQueueGateway } from '../gateways/IImportQueueGateway';
import { ImportJobLease } from '../dtos/ImportQueueDtos';

export interface ImportWorkerFailure {
  reason: string;
  errorCode?: string;
}

export type ImportWorkerProcessor = (
  lease: ImportJobLease,
  heartbeat: () => Promise<void>,
  getActiveLease: () => ImportJobLease,
) => Promise<void>;

export class ImportWorkerProtocol {
  constructor(
    private readonly queue: IImportQueueGateway,
    private readonly retryPolicy: ImportRetryPolicy,
    private readonly leaseDurationMs = 30_000,
  ) {}

  async runOne(
    workerId: string,
    process: ImportWorkerProcessor,
    batchId?: string,
  ): Promise<'IDLE' | 'COMPLETED' | 'RETRY_SCHEDULED' | 'DLQ'> {
    const lease = await this.queue.claimNextJob({
      workerId,
      leaseDurationMs: this.leaseDurationMs,
      batchId,
    });
    if (!lease) return 'IDLE';

    let activeLease = lease;
    const heartbeat = async () => {
      const renewed = await this.queue.heartbeat(activeLease, this.leaseDurationMs);
      if (!renewed) throw new Error('IMPORT_WORKER_LEASE_LOST');
      activeLease = renewed;
    };

    try {
      await process(activeLease, heartbeat, () => activeLease);
      if (!(await this.queue.completeClaimedJob(activeLease)))
        throw new Error('IMPORT_WORKER_LEASE_LOST');
      return 'COMPLETED';
    } catch (error: unknown) {
      // A pause/cancel is only final once the in-flight owner call has returned.
      // Never acknowledge while process() can still make side effects.
      const acknowledged = await this.queue.acknowledgeStoppedJob(activeLease);
      if (acknowledged) throw new Error('IMPORT_WORKER_LEASE_LOST');
      const failure = this.failureFrom(error);
      const result = await this.queue.failClaimedJob({
        lease: activeLease,
        reason: failure.reason,
        errorCode: failure.errorCode,
        retryPolicy: this.retryPolicy,
      });
      if (result === 'LEASE_LOST') throw new Error('IMPORT_WORKER_LEASE_LOST');
      return result;
    }
  }

  private failureFrom(error: unknown): ImportWorkerFailure {
    if (error && typeof error === 'object') {
      const value = error as { message?: unknown; code?: unknown };
      return {
        reason: typeof value.message === 'string' ? value.message : 'Import worker failed',
        errorCode: typeof value.code === 'string' ? value.code
          : typeof value.message === 'string' && /^IMPORT_[A-Z0-9_]+$/.test(value.message)
            ? value.message : undefined,
      };
    }
    return { reason: typeof error === 'string' ? error : 'Import worker failed' };
  }
}
