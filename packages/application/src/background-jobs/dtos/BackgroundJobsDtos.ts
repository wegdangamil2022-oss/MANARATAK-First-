export interface EnqueueJobDto {
  jobType: string;
  parameters: Record<string, any>;
  priority?: number;
  runAt?: string;
  cronExpression?: string;
  timeoutSeconds?: number;
  concurrentLimits?: number;
  maxAttempts?: number;
  backoffType?: string;
  ownerReference?: string;
}

export interface EnsureRecurringJobDto extends Omit<EnqueueJobDto, 'runAt'> {
  stableReference: string;
  cronExpression: string;
}

export interface CancelJobDto { jobReference: string; }
export interface GetJobStatusDto { jobReference: string; }
