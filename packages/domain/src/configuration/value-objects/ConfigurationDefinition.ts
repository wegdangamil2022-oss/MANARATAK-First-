export class ConfigurationDefinition {
  constructor(
    private readonly purpose: string,
    private readonly structuralSchema: Record<string, any>
  ) {
    if (!purpose) throw new Error('Configuration purpose is required');
  }

  public getPurpose(): string { return this.purpose; }
  public getStructuralSchema(): Record<string, any> { return { ...this.structuralSchema }; }
}
