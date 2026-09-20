export class TargetReference {
  private constructor(
    private readonly targetId: string,
    private readonly targetType: string
  ) {
    if (!targetId) throw new Error('Target ID is required for TargetReference');
    if (!targetType) throw new Error('Target type is required for TargetReference');
  }

  public static create(targetId: string, targetType: string): TargetReference {
    return new TargetReference(targetId, targetType);
  }

  public getTargetId(): string {
    return this.targetId;
  }

  public getTargetType(): string {
    return this.targetType;
  }
}
