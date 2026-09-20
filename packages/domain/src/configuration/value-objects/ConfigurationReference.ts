export class ConfigurationReference {
  constructor(private readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('Configuration reference cannot be empty');
    }
  }
  public getValue(): string { return this.value; }
  public equals(other: ConfigurationReference): boolean { return this.value === other.getValue(); }
}
