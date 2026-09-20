export class AuditSeverity {
  private constructor(private readonly value: string) {
    if (!value) throw new Error('AuditSeverity is required');
  }

  public static create(value: string): AuditSeverity {
    return new AuditSeverity(value);
  }

  public getValue(): string {
    return this.value;
  }
}
