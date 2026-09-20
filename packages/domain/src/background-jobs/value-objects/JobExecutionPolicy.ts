export class JobExecutionPolicy {
  private constructor(
    private readonly timeoutSeconds?: number,
    private readonly concurrentLimits?: number
  ) {}

  public static create(timeoutSeconds?: number, concurrentLimits?: number): JobExecutionPolicy {
    if (timeoutSeconds !== undefined && timeoutSeconds <= 0) {
      throw new Error('Timeout must be positive');
    }
    if (concurrentLimits !== undefined && concurrentLimits <= 0) {
      throw new Error('Concurrent limits must be positive');
    }
    return new JobExecutionPolicy(timeoutSeconds, concurrentLimits);
  }

  public getTimeoutSeconds(): number | undefined {
    return this.timeoutSeconds;
  }

  public getConcurrentLimits(): number | undefined {
    return this.concurrentLimits;
  }
}
