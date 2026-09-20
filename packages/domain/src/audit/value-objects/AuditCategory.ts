export class AuditCategory {
  private constructor(private readonly value: string) {
    if (!value) throw new Error('AuditCategory is required');
  }

  public static create(value: string): AuditCategory {
    return new AuditCategory(value);
  }

  public getValue(): string {
    return this.value;
  }
}
