export class AuditId {
  private constructor(private readonly id: string) {
    if (!id) throw new Error('AuditId is required');
  }

  public static create(id: string): AuditId {
    return new AuditId(id);
  }

  public getValue(): string {
    return this.id;
  }
}
