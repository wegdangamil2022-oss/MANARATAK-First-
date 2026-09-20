export interface IBackgroundJobExecutionGateway {
  schedule(jobReference: string, runAt: Date): Promise<void>;
  scheduleRecurring(jobReference: string, cronExpression: string, firstRunAt: Date): Promise<void>;
  enqueue(jobReference: string, payload: unknown, priority: number): Promise<void>;
  cancel(jobReference: string): Promise<void>;
}
