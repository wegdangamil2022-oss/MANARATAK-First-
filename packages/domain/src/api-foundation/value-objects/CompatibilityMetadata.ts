export class CompatibilityMetadata {
  constructor(
    private readonly backwardCompatible: boolean,
    private readonly forwardCompatible: boolean,
    private readonly supportStatus: string
  ) {}

  public getBackwardCompatible(): boolean {
    return this.backwardCompatible;
  }

  public getForwardCompatible(): boolean {
    return this.forwardCompatible;
  }

  public getSupportStatus(): string {
    return this.supportStatus;
  }

  public equals(other: CompatibilityMetadata): boolean {
    return (
      this.backwardCompatible === other.getBackwardCompatible() &&
      this.forwardCompatible === other.getForwardCompatible() &&
      this.supportStatus === other.getSupportStatus()
    );
  }
}
