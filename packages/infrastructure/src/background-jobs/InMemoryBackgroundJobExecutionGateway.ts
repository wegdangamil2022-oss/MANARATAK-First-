import { IBackgroundJobExecutionGateway } from '@manaratak/application';

/** Development/test adapter only. Production composition must use PrismaBackgroundJobExecutionGateway. */
export class InMemoryBackgroundJobExecutionGateway implements IBackgroundJobExecutionGateway {
  public readonly capabilityStatus = 'DEVELOPMENT_ONLY';
  public readonly persistenceClassification = 'EPHEMERAL';
  private readonly enqueued: { jobReference: string; payload: unknown; priority: number }[] = [];
  private readonly scheduledJobs = new Map<string, Date>();
  private readonly recurringJobs = new Map<string, { cronExpression: string; firstRunAt: Date }>();

  public async schedule(jobReference: string, runAt: Date): Promise<void> { this.scheduledJobs.set(jobReference, runAt); }
  public async scheduleRecurring(jobReference: string, cronExpression: string, firstRunAt: Date): Promise<void> {
    this.recurringJobs.set(jobReference, { cronExpression, firstRunAt });
  }
  public async enqueue(jobReference: string, payload: unknown, priority: number): Promise<void> { this.enqueued.push({ jobReference, payload, priority }); }
  public async cancel(jobReference: string): Promise<void> {
    this.scheduledJobs.delete(jobReference);
    this.recurringJobs.delete(jobReference);
    const index = this.enqueued.findIndex(j => j.jobReference === jobReference);
    if (index !== -1) this.enqueued.splice(index, 1);
  }
  public getEnqueued() { return [...this.enqueued]; }
  public getScheduled() { return new Map(this.scheduledJobs); }
  public getRecurring() { return new Map(this.recurringJobs); }
  public clear(): void { this.enqueued.length = 0; this.scheduledJobs.clear(); this.recurringJobs.clear(); }
}
