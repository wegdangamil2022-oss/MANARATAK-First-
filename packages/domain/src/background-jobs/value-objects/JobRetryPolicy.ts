export class JobRetryPolicy {
  private constructor(
    private readonly maxAttempts: number,
    private readonly backoffType: string
  ) {}

  public static create(maxAttempts: number = 0, backoffType: string = 'none'): JobRetryPolicy {
    if (maxAttempts < 0) {
      throw new Error('Max attempts cannot be negative');
    }
    return new JobRetryPolicy(maxAttempts, backoffType);
  }

  public getMaxAttempts(): number {
    return this.maxAttempts;
  }

  public getBackoffType(): string {
    return this.backoffType;
  }
}
