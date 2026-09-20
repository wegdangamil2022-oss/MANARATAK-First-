export class JobScheduleMetadata {
  private constructor(
    private readonly runAt?: Date,
    private readonly cronExpression?: string
  ) {}

  public static immediate(): JobScheduleMetadata {
    return new JobScheduleMetadata(new Date());
  }

  public static scheduled(runAt: Date): JobScheduleMetadata {
    return new JobScheduleMetadata(runAt);
  }

  public static recurring(cronExpression: string): JobScheduleMetadata {
    if (!cronExpression || cronExpression.trim().length === 0) {
      throw new Error('Cron expression cannot be empty for recurring jobs');
    }
    return new JobScheduleMetadata(undefined, cronExpression.trim());
  }

  public getRunAt(): Date | undefined {
    return this.runAt;
  }

  public getCronExpression(): string | undefined {
    return this.cronExpression;
  }
}
