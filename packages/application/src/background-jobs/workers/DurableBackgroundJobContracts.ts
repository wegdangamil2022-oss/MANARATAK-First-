export interface DurableBackgroundJobClaim {
  jobReference: string;
  jobType: string;
  payload: Readonly<Record<string, unknown>>;
  priority: number;
  attempt: number;
  maxAttempts: number;
  backoffType: string;
  timeoutMs: number;
  cronExpression?: string;
  workerId: string;
  leaseToken: string;
  leaseUntil: Date;
}

export interface ClaimBackgroundJobsRequest {
  workerId: string;
  batchSize: number;
  leaseDurationMs: number;
  now: Date;
}

export interface BackgroundJobLeaseMutation {
  jobReference: string;
  workerId: string;
  leaseToken: string;
  now: Date;
}

export interface BackgroundJobFailureMutation extends BackgroundJobLeaseMutation {
  errorCode: string;
  errorMessage: string;
  nextAvailableAt: Date;
}

export interface BackgroundJobCompletionMutation extends BackgroundJobLeaseMutation {
  nextRecurringRunAt?: Date;
}

export interface BackgroundJobQueueSnapshot {
  capabilityStatus: 'PRODUCTION_CAPABLE' | 'NOT_CONFIGURED';
  queued: number;
  running: number;
  failed: number;
  dlq: number;
  oldestDueAt?: string;
}

export interface IDurableBackgroundJobQueue {
  readonly capabilityStatus: 'PRODUCTION_CAPABLE';
  readonly persistenceClassification: 'DURABLE';
  claimDue(request: ClaimBackgroundJobsRequest): Promise<DurableBackgroundJobClaim[]>;
  heartbeat(mutation: BackgroundJobLeaseMutation & { leaseDurationMs: number }): Promise<boolean>;
  complete(mutation: BackgroundJobCompletionMutation): Promise<boolean>;
  fail(mutation: BackgroundJobFailureMutation): Promise<{ applied: boolean; exhausted: boolean }>;
  getOperationalSnapshot(now?: Date): Promise<BackgroundJobQueueSnapshot>;
}

export interface BackgroundJobHandlerContext {
  jobReference: string;
  attempt: number;
  idempotencyKey: string;
  signal: AbortSignal;
}

export interface IBackgroundJobHandler {
  readonly jobType: string;
  handle(payload: Readonly<Record<string, unknown>>, context: BackgroundJobHandlerContext): Promise<void>;
}
