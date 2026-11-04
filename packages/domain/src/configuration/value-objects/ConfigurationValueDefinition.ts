export class ConfigurationValueDefinition {
  constructor(
    private readonly defaultValue: unknown,
    private readonly typeConstraints: Record<string, unknown>
  ) {}

  public getDefaultValue(): unknown { return this.defaultValue; }
  public getTypeConstraints(): Record<string, unknown> { return { ...this.typeConstraints }; }
}
