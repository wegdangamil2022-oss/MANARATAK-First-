export class ConfigurationValueDefinition {
  constructor(
    private readonly defaultValue: any,
    private readonly typeConstraints: Record<string, any>
  ) {}

  public getDefaultValue(): any { return this.defaultValue; }
  public getTypeConstraints(): Record<string, any> { return { ...this.typeConstraints }; }
}
