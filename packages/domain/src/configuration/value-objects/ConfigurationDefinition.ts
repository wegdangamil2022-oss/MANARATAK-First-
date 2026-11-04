export class ConfigurationDefinition {
  constructor(
    private readonly purpose: string,
    private readonly structuralSchema: Record<string, unknown>
  ) {
    if (!purpose) throw new Error('Configuration purpose is required');
  }

  public getPurpose(): string { return this.purpose; }
  public getStructuralSchema(): Record<string, unknown> { return { ...this.structuralSchema }; }
}
