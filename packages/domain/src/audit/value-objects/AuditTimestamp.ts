export class AuditTimestamp {
  private constructor(private readonly value: Date) {
    if (!value || isNaN(value.getTime())) {
      throw new Error('Valid date is required for AuditTimestamp');
    }
  }

  public static create(value: Date = new Date()): AuditTimestamp {
    return new AuditTimestamp(value);
  }

  public getValue(): Date {
    return this.value;
  }
}
