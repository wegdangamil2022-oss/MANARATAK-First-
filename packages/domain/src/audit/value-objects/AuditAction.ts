export class AuditAction {
  private constructor(private readonly value: string) {
    if (!value) throw new Error('AuditAction is required');
  }

  public static create(value: string): AuditAction {
    return new AuditAction(value);
  }

  public getValue(): string {
    return this.value;
  }
}
