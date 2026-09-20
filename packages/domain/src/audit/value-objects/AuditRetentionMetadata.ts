export class AuditRetentionMetadata {
  private constructor(
    private readonly retentionPeriodInDays: number,
    private readonly expiresAt: Date
  ) {
    if (retentionPeriodInDays < 0) {
      throw new Error('Retention period must be a non-negative number of days');
    }
    if (!expiresAt || isNaN(expiresAt.getTime())) {
      throw new Error('Valid expiresAt date is required for AuditRetentionMetadata');
    }
  }

  public static create(retentionPeriodInDays: number, baseDate: Date = new Date()): AuditRetentionMetadata {
    const expiresAt = new Date(baseDate.getTime() + retentionPeriodInDays * 24 * 60 * 60 * 1000);
    return new AuditRetentionMetadata(retentionPeriodInDays, expiresAt);
  }

  public getRetentionPeriodInDays(): number {
    return this.retentionPeriodInDays;
  }

  public getExpiresAt(): Date {
    return this.expiresAt;
  }

  public isExpired(atDate: Date = new Date()): boolean {
    return atDate.getTime() >= this.expiresAt.getTime();
  }
}
