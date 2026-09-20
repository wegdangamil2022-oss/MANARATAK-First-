export class AuditReference {
  private constructor(private readonly value: string) {
    if (!value) throw new Error('AuditReference is required');
  }

  public static create(value: string): AuditReference {
    return new AuditReference(value);
  }

  public getValue(): string {
    return this.value;
  }
}
