export class ConfigurationOwnerReference {
  constructor(private readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('Configuration owner reference cannot be empty');
    }
  }
  public getValue(): string { return this.value; }
  public equals(other: ConfigurationOwnerReference): boolean { return this.value === other.getValue(); }
}
