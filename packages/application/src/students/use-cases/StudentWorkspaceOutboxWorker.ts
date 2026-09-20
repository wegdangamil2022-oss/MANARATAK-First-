import { ITransactionalOutboxDispatcher, OutboxDispatchResult } from '@manaratak/domain';

export interface StudentWorkspaceOutboxWorkerOptions {
  batchSize?: number;
  claimDurationMs?: number;
  maxAttempts?: number;
  baseBackoffMs?: number;
  maxBackoffMs?: number;
}

export class StudentWorkspaceOutboxWorker {
  public constructor(
    private readonly dispatcher: ITransactionalOutboxDispatcher,
    private readonly options: StudentWorkspaceOutboxWorkerOptions = {},
  ) {}

  public async runIdentityOnce(workerId: string): Promise<OutboxDispatchResult> {
    return this.run(workerId, 'IDENTITY', ['IdentityCreated.v1', 'IdentityStatusChanged.v1']);
  }

  public async runLearningOnce(workerId: string): Promise<OutboxDispatchResult> {
    return this.run(workerId, 'COURSES', ['CourseEnrolled', 'CourseProgressUpdated']);
  }

  private run(workerId: string, domain: string, eventTypes: readonly string[]): Promise<OutboxDispatchResult> {
    if (!workerId.trim()) throw new Error('STUDENT_WORKSPACE_OUTBOX_WORKER_ID_REQUIRED');
    return this.dispatcher.dispatchBatch({
      workerId: workerId.trim(), domain, eventTypes,
      batchSize: this.options.batchSize ?? 50,
      claimDurationMs: this.options.claimDurationMs ?? 60_000,
      maxAttempts: this.options.maxAttempts ?? 8,
      baseBackoffMs: this.options.baseBackoffMs ?? 1_000,
      maxBackoffMs: this.options.maxBackoffMs ?? 120_000,
    });
  }
}
