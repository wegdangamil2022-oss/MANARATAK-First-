export class ExposureIntent {
  constructor(
    private readonly exposePublicly: boolean,
    private readonly environmentTarget: string,
    private readonly networkCategory: string
  ) {}

  public getExposePublicly(): boolean {
    return this.exposePublicly;
  }

  public getEnvironmentTarget(): string {
    return this.environmentTarget;
  }

  public getNetworkCategory(): string {
    return this.networkCategory;
  }

  public equals(other: ExposureIntent): boolean {
    return (
      this.exposePublicly === other.getExposePublicly() &&
      this.environmentTarget === other.getEnvironmentTarget() &&
      this.networkCategory === other.getNetworkCategory()
    );
  }
}
