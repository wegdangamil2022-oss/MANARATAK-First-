import { ITransactionalOutboxDispatcher, OutboxDispatchResult } from '@manaratak/domain';

export interface CertificateCompletionOutboxWorkerOptions {
  batchSize?: number;
  claimDurationMs?: number;
  maxAttempts?: number;
  baseBackoffMs?: number;
  maxBackoffMs?: number;
}

/**
 * Source-wired worker protocol for P13 completion delivery into P14. Runtime
 * scheduling is opt-in at the API bootstrap boundary; DB proof remains pending.
 */
export class CertificateCompletionOutboxWorker {
  constructor(
    private readonly dispatcher: ITransactionalOutboxDispatcher,
    private readonly options: CertificateCompletionOutboxWorkerOptions = {},
  ) {}

  public runOnce(workerId: string): Promise<OutboxDispatchResult> {
    if (!workerId.trim()) throw new Error('CERTIFICATE_COMPLETION_WORKER_ID_REQUIRED');
    return this.dispatcher.dispatchBatch({
      workerId: workerId.trim(),
      batchSize: this.options.batchSize ?? 25,
      claimDurationMs: this.options.claimDurationMs ?? 30_000,
      maxAttempts: this.options.maxAttempts ?? 8,
      baseBackoffMs: this.options.baseBackoffMs ?? 1_000,
      maxBackoffMs: this.options.maxBackoffMs ?? 60_000,
      domain: 'COURSES',
      eventTypes: ['CourseCompleted', 'LearningPathCompleted'],
    });
  }
}
